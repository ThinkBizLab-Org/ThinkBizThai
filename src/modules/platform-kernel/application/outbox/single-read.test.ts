// A1-302-1 (stop-the-line) and A1-302-I3: a caller-supplied object is read ONCE, into a frozen copy,
// before any decision, and every decision (the CTR-EVT-001 check, the workspace comparison, event-id
// uniqueness, the ledger key, the mark) reads that copy only. Each path is pinned with a getter, and
// with a proxy, that answers the first read one way and every later read another.
import { describe, expect, it } from 'vitest';

import { newEvent, readEnvelope, type EventEnvelope } from '../../domain/outbox/event-envelope';
import { OUTBOX_UNAVAILABLE } from '../../domain/outbox/outbox-errors';
import { tenantContextRecordOf } from '../tenant-context';
import { consumeEvent, type EventHandler } from './consumer';
import type { InMemoryConsumerTransaction } from './fakes';
import type { OutboxPort } from './outbox-port';
import { relayOnce } from './relay';
import { LEAK_MARKER, LeakingError, WORKSPACE_A, WORKSPACE_B, outboxHarness } from './test-support';

// A copy of `event` whose `key` is a getter answering `first` on the first read and `later` after.
function withFlippingGetter(event: EventEnvelope, key: keyof EventEnvelope, first: unknown, later: unknown): { value: EventEnvelope; reads: () => number } {
  let reads = 0;
  const value = { ...event };
  Object.defineProperty(value, key, {
    enumerable: true,
    configurable: true,
    get() { reads += 1; return reads === 1 ? first : later; },
  });
  return { value, reads: () => reads };
}

// A proxy over a copy of `event` whose descriptor and get traps answer `first` for `key` on the first
// trap call and `later` after (the target stays configurable, so the traps may differ).
function withFlippingProxy(event: EventEnvelope, key: keyof EventEnvelope, first: unknown, later: unknown): { value: EventEnvelope; reads: () => number } {
  let reads = 0;
  const answer = (): unknown => { reads += 1; return reads === 1 ? first : later; };
  const value = new Proxy({ ...event } as Record<string, unknown>, {
    get: (target, property, receiver) => (property === key ? answer() : Reflect.get(target, property, receiver)),
    getOwnPropertyDescriptor: (target, property) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
      return property === key && descriptor !== undefined ? { ...descriptor, value: answer() } : descriptor;
    },
  }) as unknown as EventEnvelope;
  return { value, reads: () => reads };
}

const SHAPES = [['a getter', withFlippingGetter], ['a proxy', withFlippingProxy]] as const;

describe('readEnvelope', () => {
  it('reads each property once and returns the deep-frozen copy it checked', () => {
    return outboxHarness().then((h) => {
      const event = h.event(h.contextA);
      const flip = withFlippingGetter(event, 'event_id', event.event_id, 'evt synthetic, not an id');
      const copy = readEnvelope(flip.value);
      expect(copy).toEqual(event);
      expect(Object.isFrozen(copy) && Object.isFrozen(copy?.tenant_context)).toBe(true);
      expect(flip.reads()).toBe(1);
    });
  });

  it('is null for a value whose getter or proxy trap throws, keeping nothing of it', async () => {
    const h = await outboxHarness();
    const event = h.event(h.contextA);
    const getter = { ...event };
    Object.defineProperty(getter, 'tenant_context', { enumerable: true, get() { throw new LeakingError(); } });
    const trap = new Proxy({ ...event }, { ownKeys() { throw new LeakingError(); } });
    expect(readEnvelope(getter)).toBeNull();
    expect(readEnvelope(trap)).toBeNull();
    const cyclic: Record<string, unknown> = { ...event };
    cyclic.payload = cyclic;
    expect(readEnvelope(cyclic)).toBeNull();
  });

  it('newEvent reads the caller\'s producer once, so the stored producer is the one checked', async () => {
    const h = await outboxHarness();
    let reads = 0;
    const producer = {
      get module_key(): string { reads += 1; return reads === 1 ? 'research-suggestion' : 'x'.repeat(65); },
      implementation_version: '1.0.0',
    };
    const event = newEvent({
      event_id: 'evt_synthetic_once',
      event_type: 'research.run.completed',
      event_version: 1,
      producer,
      tenant_context: tenantContextRecordOf(h.contextA),
      subject: { type: 'research_run', id: 'run_synthetic_0001', version: 1 },
      schema_ref: 'CTR-EVT-001@1.0.0',
    }, h.clock.now());
    expect(event.producer.module_key).toBe('research-suggestion');
    expect(reads).toBe(1);
  });
});

describe.each(SHAPES)('append reads the event once (%s)', (_label, flipping) => {
  it('a tenant_context answering A and then B commits in A only, never in B', async () => {
    const h = await outboxHarness();
    const a = h.event(h.contextA);
    const b = h.event(h.contextB);
    const flip = flipping(a, 'tenant_context', a.tenant_context, b.tenant_context);
    await h.outbox.transaction(h.contextA, (tx) => { tx.append(flip.value); return Promise.resolve(); });
    expect(h.outbox.entries().map((entry) => entry.envelope.tenant_context.workspace_id)).toEqual([WORKSPACE_A]);
    expect(h.outbox.entries()[0]?.envelope).toEqual(a);
    expect(flip.reads()).toBe(1);

    // Relayed and consumed: the effect lands in A, nothing in B.
    expect(await relayOnce(h)).toEqual({ kind: 'relayed', published: [a.event_id] });
    const handler: EventHandler<InMemoryConsumerTransaction> = (event, tx) => { tx.put('seen', event.event_id); return Promise.resolve({ ok: true }); };
    const [delivered] = h.publisher.deliveries();
    expect(await consumeEvent({ ledger: h.ledger, consumer: 'search-index', handler }, delivered)).toMatchObject({ kind: 'applied' });
    expect(h.ledger.effects(WORKSPACE_A).get('seen')).toBe(a.event_id);
    expect(h.ledger.effects(WORKSPACE_B).size).toBe(0);
  });

  it('a tenant_context answering B and then A is refused, and the unit commits nothing', async () => {
    const h = await outboxHarness();
    const a = h.event(h.contextA);
    const b = h.event(h.contextB);
    const flip = flipping(a, 'tenant_context', b.tenant_context, a.tenant_context);
    await expect(h.outbox.transaction(h.contextA, (tx) => { tx.put('k', 'v'); tx.append(flip.value); return Promise.resolve(); }))
      .rejects.toThrow("outbox: an event is appended only in its own workspace's unit of work");
    expect(h.outbox.entries()).toEqual([]);
    expect(h.outbox.state(WORKSPACE_A).size).toBe(0);
  });

  it('an event_id answering a fresh id and then a staged one never commits two entries with one id', async () => {
    const h = await outboxHarness();
    const first = h.event(h.contextA);
    const second = h.event(h.contextA);
    const flip = flipping(second, 'event_id', second.event_id, first.event_id);
    await h.outbox.transaction(h.contextA, (tx) => { tx.append(first); tx.append(flip.value); return Promise.resolve(); });
    const ids = h.outbox.entries().map((entry) => entry.envelope.event_id);
    expect(ids).toEqual([first.event_id, second.event_id]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(flip.reads()).toBe(1);
  });

  it('an event_id answering a staged id first is refused, and the unit commits nothing', async () => {
    const h = await outboxHarness();
    const first = h.event(h.contextA);
    const second = h.event(h.contextA);
    const flip = flipping(second, 'event_id', first.event_id, second.event_id);
    await expect(h.outbox.transaction(h.contextA, (tx) => { tx.append(first); tx.append(flip.value); return Promise.resolve(); }))
      .rejects.toThrow('outbox: an event with this event_id already exists');
    expect(h.outbox.entries()).toEqual([]);
  });

  it('an event_id answering a committed id first is refused; answering it later cannot reach the table', async () => {
    const h = await outboxHarness();
    const committed = h.event(h.contextB);
    await h.outbox.transaction(h.contextB, (tx) => { tx.append(committed); return Promise.resolve(); });
    const fresh = h.event(h.contextA);
    const late = flipping(fresh, 'event_id', fresh.event_id, committed.event_id);
    await h.outbox.transaction(h.contextA, (tx) => { tx.append(late.value); return Promise.resolve(); });
    const early = flipping(h.event(h.contextA), 'event_id', committed.event_id, 'evt_synthetic_other');
    await expect(h.outbox.transaction(h.contextA, (tx) => { tx.append(early.value); return Promise.resolve(); }))
      .rejects.toThrow('outbox: an event with this event_id already exists');
    const ids = h.outbox.entries().map((entry) => entry.envelope.event_id);
    expect(ids).toEqual([committed.event_id, fresh.event_id]);
  });
});

describe('append refuses an event whose read throws', () => {
  it('with the constant CTR-EVT-001 error, keeping nothing of what was thrown', async () => {
    const h = await outboxHarness();
    const event = { ...h.event(h.contextA) };
    Object.defineProperty(event, 'tenant_context', { enumerable: true, get() { throw new LeakingError(); } });
    let thrown: unknown;
    await h.outbox.transaction(h.contextA, (tx) => {
      try { tx.append(event); } catch (error) { thrown = error; }
      return Promise.resolve();
    });
    expect(thrown).toBeInstanceOf(TypeError);
    expect(String((thrown as Error).message)).toBe('outbox: the event does not satisfy CTR-EVT-001');
    expect(JSON.stringify([String(thrown), (thrown as Error).stack])).not.toContain(LEAK_MARKER);
    expect(h.outbox.entries()).toEqual([]);
  });
});

describe('markPublished reads the reference once', () => {
  it('a reference whose position answers the entry and then another marks by the first read only', async () => {
    const h = await outboxHarness();
    const a = h.event(h.contextA);
    await h.outbox.transaction(h.contextA, (tx) => { tx.append(a); return Promise.resolve(); });
    let reads = 0;
    const ref = {
      get position(): number { reads += 1; return reads === 1 ? 1 : 2; },
      event_id: a.event_id,
      workspace_id: WORKSPACE_A,
    };
    expect(await h.outbox.markPublished(ref)).toBe(true);
    expect(reads).toBe(1);
    expect(h.outbox.entries()[0]?.dispatched_at).toBeDefined();
  });

  it('a reference whose read throws marks nothing', async () => {
    const h = await outboxHarness();
    const a = h.event(h.contextA);
    await h.outbox.transaction(h.contextA, (tx) => { tx.append(a); return Promise.resolve(); });
    const ref = { position: 1, event_id: a.event_id, get workspace_id(): string { throw new LeakingError(); } };
    expect(await h.outbox.markPublished(ref)).toBe(false);
    expect(h.outbox.entries()[0]?.dispatched_at).toBeUndefined();
  });
});

describe('the consumer ledger reads its key once', () => {
  it('a key whose workspace answers A and then B records and applies in A only', async () => {
    const h = await outboxHarness();
    let reads = 0;
    const key = {
      get workspace_id(): string { reads += 1; return reads === 1 ? WORKSPACE_A : WORKSPACE_B; },
      consumer: 'search-index',
      event_id: 'evt_synthetic_000001',
    };
    const result = await h.ledger.recordOnce(key, (tx) => { tx.put('seen', 'yes'); return Promise.resolve('done'); });
    expect(result).toEqual({ recorded: true, value: 'done' });
    expect(h.ledger.rows().map((row) => row.workspace_id)).toEqual([WORKSPACE_A]);
    expect(h.ledger.effects(WORKSPACE_A).get('seen')).toBe('yes');
    expect(h.ledger.effects(WORKSPACE_B).size).toBe(0);
    expect(reads).toBe(1);
  });

  it('a key whose read throws is refused with the constant error', async () => {
    const h = await outboxHarness();
    const key = { workspace_id: WORKSPACE_A, consumer: 'search-index', get event_id(): string { throw new LeakingError(); } };
    await expect(h.ledger.recordOnce(key, () => Promise.resolve())).rejects.toThrow('consumer ledger: the key is not a workspace, a consumer and an event id');
    expect(h.ledger.rows()).toEqual([]);
  });
});

describe.each(SHAPES)('consumeEvent reads the delivered event once (%s)', (_label, flipping) => {
  it('a tenant_context answering A and then B keys the ledger and the effect in A only', async () => {
    const h = await outboxHarness();
    const a = h.event(h.contextA);
    const b = h.event(h.contextB);
    const flip = flipping(a, 'tenant_context', a.tenant_context, b.tenant_context);
    const seen: EventEnvelope[] = [];
    const handler: EventHandler<InMemoryConsumerTransaction> = (event, tx) => { seen.push(event); tx.put('seen', event.event_id); return Promise.resolve({ ok: true }); };
    expect(await consumeEvent({ ledger: h.ledger, consumer: 'search-index', handler }, flip.value)).toEqual({ kind: 'applied', consumer: 'search-index', event_id: a.event_id });
    expect(seen).toEqual([a]);
    expect(h.ledger.rows().map((row) => row.workspace_id)).toEqual([WORKSPACE_A]);
    expect(h.ledger.effects(WORKSPACE_B).size).toBe(0);
    expect(flip.reads()).toBe(1);
  });

  it('an event_id answering one id and then another records the id the handler saw', async () => {
    const h = await outboxHarness();
    const a = h.event(h.contextA);
    const flip = flipping(a, 'event_id', a.event_id, 'evt_synthetic_other');
    const handler: EventHandler<InMemoryConsumerTransaction> = (event, tx) => { tx.put('seen', event.event_id); return Promise.resolve({ ok: true }); };
    expect(await consumeEvent({ ledger: h.ledger, consumer: 'search-index', handler }, flip.value)).toMatchObject({ kind: 'applied', event_id: a.event_id });
    expect(h.ledger.rows().map((row) => row.event_id)).toEqual([a.event_id]);
    expect(h.ledger.effects(WORKSPACE_A).get('seen')).toBe(a.event_id);
  });
});

// A1-302-I3: an adapter entry the relay cannot read stops the step; it never rejects with what it threw.
describe('relayOnce reads each adapter entry once, inside its guard', () => {
  const relayWith = async (batch: unknown): Promise<{ report: unknown; published: number }> => {
    const h = await outboxHarness();
    const outbox: Pick<OutboxPort, 'fetchUnpublished' | 'markPublished'> = {
      fetchUnpublished: () => Promise.resolve(batch as never),
      markPublished: () => Promise.resolve(true),
    };
    const report = await relayOnce({ outbox, publisher: h.publisher, limits: h.limits });
    return { report, published: h.publisher.deliveries().length };
  };

  it.each([
    ['an entry whose envelope getter throws', () => [{ position: 1, get envelope(): unknown { throw new LeakingError(); } }]],
    ['an entry that is a throwing proxy', () => [new Proxy({}, { get() { throw new LeakingError(); }, getOwnPropertyDescriptor() { throw new LeakingError(); } })]],
    ['a null entry', () => [null]],
    ['an entry with no envelope', () => [{ position: 1 }]],
    ['an entry with a bad position', async () => {
      const h = await outboxHarness();
      return [{ position: 0, envelope: h.event(h.contextA) }];
    }],
    ['a batch that is not a list', () => ({ length: 1 })],
  ])('%s stops the step (OUTBOX_UNAVAILABLE), publishing nothing', async (_label, make) => {
    const { report, published } = await relayWith(await make());
    expect(report).toEqual({ kind: 'stopped', published: [], code: OUTBOX_UNAVAILABLE.code });
    expect(published).toBe(0);
    expect(JSON.stringify(report)).not.toContain(LEAK_MARKER);
  });

  it('an entry whose envelope answers one event and then another publishes and marks the same one', async () => {
    const h = await outboxHarness();
    const a = h.event(h.contextA);
    const b = h.event(h.contextB);
    let reads = 0;
    const entry = { position: 1, get envelope(): EventEnvelope { reads += 1; return reads === 1 ? a : b; } };
    const marked: unknown[] = [];
    const outbox: Pick<OutboxPort, 'fetchUnpublished' | 'markPublished'> = {
      fetchUnpublished: () => Promise.resolve([entry] as never),
      markPublished: (ref) => { marked.push(ref); return Promise.resolve(true); },
    };
    expect(await relayOnce({ outbox, publisher: h.publisher, limits: h.limits })).toEqual({ kind: 'relayed', published: [a.event_id] });
    expect(h.publisher.deliveries()).toEqual([a]);
    expect(marked).toEqual([{ position: 1, event_id: a.event_id, workspace_id: WORKSPACE_A }]);
    expect(reads).toBe(1);
  });
});
