// The replay-safe consumer on the fakes (manifest acceptance criteria 5 and 6): a consumer records
// (consumer, event_id) in the unit of work that makes its effect visible, so a replayed or duplicated
// event has no second effect; a relay crash between publish and mark leads to a redelivery the
// consumer absorbs; a failed handler is rolled back and a redelivery runs it again; the ledger key is
// the event's own workspace; and nothing thrown or returned reaches a record, an error or a report.
import { describe, expect, it } from 'vitest';

import { EVENT_CONSUMER_FAILED, EVENT_ENVELOPE_INVALID, EVENT_LEDGER_UNAVAILABLE, OUTBOX_UNAVAILABLE } from '../../domain/outbox/outbox-errors';
import type { EventEnvelope } from '../../domain/outbox/event-envelope';
import { PLATFORM_TEMPORARY } from '../../domain/platform-errors';
import { stableError } from '../../domain/stable-error';
import { consumeEvent, type ConsumerOutcome, type EventHandler } from './consumer';
import type { InMemoryConsumerTransaction } from './fakes';
import type { OutboxPort, PublisherPort } from './outbox-port';
import { relayOnce } from './relay';
import { LEAK_MARKER, LeakingError, WORKSPACE_A, WORKSPACE_B, outboxHarness, type OutboxHarness } from './test-support';

const CONSUMER = 'search-index';
const OK: ConsumerOutcome = { ok: true };

// A handler whose effect counts how many times it ran per event, written in the consuming unit.
function countingHandler(): { handler: EventHandler<InMemoryConsumerTransaction>; runs: string[] } {
  const runs: string[] = [];
  const handler: EventHandler<InMemoryConsumerTransaction> = (event, tx) => {
    runs.push(event.event_id);
    tx.put(`indexed:${event.subject.id}`, event.event_id);
    return Promise.resolve(OK);
  };
  return { handler, runs };
}

async function produced(h: OutboxHarness, context = h.contextA): Promise<EventEnvelope> {
  const event = h.event(context);
  await h.outbox.transaction(context, (tx) => { tx.put(`run:${event.event_id}`, 'completed'); tx.append(event); return Promise.resolve(); });
  return event;
}

describe('consumeEvent', () => {
  it('applies an event once, recording (workspace, consumer, event_id) with the effect', async () => {
    const h = await outboxHarness();
    const event = await produced(h);
    const { handler, runs } = countingHandler();
    expect(await consumeEvent({ ledger: h.ledger, consumer: CONSUMER, handler }, event)).toEqual({ kind: 'applied', consumer: CONSUMER, event_id: event.event_id });
    expect(runs).toEqual([event.event_id]);
    expect(h.ledger.rows()).toEqual([{ workspace_id: WORKSPACE_A, consumer: CONSUMER, event_id: event.event_id, consumed_at: '2026-10-19T00:00:00.000Z' }]);
    expect(h.ledger.effects(WORKSPACE_A).get('indexed:run_synthetic_0001')).toBe(event.event_id);
  });

  it('a replayed event has no second effect', async () => {
    const h = await outboxHarness();
    const event = await produced(h);
    const { handler, runs } = countingHandler();
    const deps = { ledger: h.ledger, consumer: CONSUMER, handler };
    await consumeEvent(deps, event);
    h.clock.advance(60_000);
    expect(await consumeEvent(deps, event)).toEqual({ kind: 'duplicate', consumer: CONSUMER, event_id: event.event_id });
    // A JSON copy of the same event, as a transport would redeliver it, is the same event.
    expect(await consumeEvent(deps, JSON.parse(JSON.stringify(event)))).toMatchObject({ kind: 'duplicate' });
    expect(runs).toHaveLength(1);
    expect(h.ledger.rows()).toHaveLength(1);
    expect(h.ledger.rows()[0]?.consumed_at).toBe('2026-10-19T00:00:00.000Z');
  });

  it('duplicate delivery at once: two concurrent deliveries apply the effect once', async () => {
    const h = await outboxHarness();
    const event = await produced(h);
    const runs: string[] = [];
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const handler: EventHandler<InMemoryConsumerTransaction> = async (delivered, tx) => {
      runs.push(delivered.event_id);
      await gate;
      tx.put('indexed', delivered.event_id);
      return OK;
    };
    const deps = { ledger: h.ledger, consumer: CONSUMER, handler };
    const first = consumeEvent(deps, event);
    const second = consumeEvent(deps, event);
    // The first holds the key; the second waits on it and is not visible as recorded yet.
    expect(await h.ledger.isRecorded({ workspace_id: WORKSPACE_A, consumer: CONSUMER, event_id: event.event_id })).toBe(false);
    release();
    const reports = await Promise.all([first, second]);
    expect(reports.map((report) => report.kind).sort()).toEqual(['applied', 'duplicate']);
    expect(runs).toHaveLength(1);
    expect(h.ledger.rows()).toHaveLength(1);
  });

  it('two consumers each process the event once', async () => {
    const h = await outboxHarness();
    const event = await produced(h);
    const search = countingHandler();
    const audit = countingHandler();
    await consumeEvent({ ledger: h.ledger, consumer: 'search-index', handler: search.handler }, event);
    await consumeEvent({ ledger: h.ledger, consumer: 'audit-trail', handler: audit.handler }, event);
    await consumeEvent({ ledger: h.ledger, consumer: 'search-index', handler: search.handler }, event);
    expect(search.runs).toHaveLength(1);
    expect(audit.runs).toHaveLength(1);
    expect(h.ledger.rows().map((row) => row.consumer)).toEqual(['search-index', 'audit-trail']);
  });

  it('a failed handler is rolled back (no row, no effect), and a redelivery runs it again', async () => {
    const h = await outboxHarness();
    const event = await produced(h);
    let attempt = 0;
    const handler: EventHandler<InMemoryConsumerTransaction> = (delivered, tx) => {
      attempt += 1;
      tx.put('indexed', delivered.event_id);
      if (attempt === 1) return Promise.resolve({ ok: false, error: stableError(PLATFORM_TEMPORARY, delivered.correlation_id) });
      return Promise.resolve(OK);
    };
    const deps = { ledger: h.ledger, consumer: CONSUMER, handler };
    expect(await consumeEvent(deps, event)).toEqual({ kind: 'failed', consumer: CONSUMER, event_id: event.event_id, code: PLATFORM_TEMPORARY.code });
    expect(h.ledger.rows()).toHaveLength(0);
    expect(h.ledger.effects(WORKSPACE_A).size).toBe(0);
    expect(await consumeEvent(deps, event)).toMatchObject({ kind: 'applied' });
    expect(attempt).toBe(2);
    expect(h.ledger.effects(WORKSPACE_A).get('indexed')).toBe(event.event_id);
  });

  it('a value that is not a CTR-EVT-001 envelope is rejected; nothing is recorded and no handler runs', async () => {
    const h = await outboxHarness();
    const event = await produced(h);
    const { handler, runs } = countingHandler();
    const deps = { ledger: h.ledger, consumer: CONSUMER, handler };
    for (const value of [null, 'event', { ...event, payload: { raw_provider_response: 'x' } }, { ...event, extra: 1 }]) {
      expect(await consumeEvent(deps, value)).toEqual({ kind: 'rejected', consumer: CONSUMER, code: EVENT_ENVELOPE_INVALID.code });
    }
    expect(runs).toHaveLength(0);
    expect(h.ledger.rows()).toHaveLength(0);
    await expect(consumeEvent({ ...deps, consumer: 'c'.repeat(65) }, event)).rejects.toThrow('consumer: a consumer name is 1 to 64 characters');
  });

  it('the handler sees a frozen copy carrying the contract fields only', async () => {
    const h = await outboxHarness();
    const event = await produced(h);
    let seen: EventEnvelope | undefined;
    await consumeEvent({ ledger: h.ledger, consumer: CONSUMER, handler: (delivered) => { seen = delivered; return Promise.resolve(OK); } }, { ...event });
    expect(seen).toEqual(event);
    expect(Object.isFrozen(seen)).toBe(true);
  });
});

describe('relay crash between publish and mark', () => {
  it('the entry is published again and the consumer absorbs the redelivery', async () => {
    const h = await outboxHarness();
    const event = await produced(h);
    const { handler, runs } = countingHandler();
    // The transport hands every accepted envelope to the consumer.
    const reports: unknown[] = [];
    const publisher: PublisherPort = {
      async publish(delivered) {
        await h.publisher.publish(delivered);
        reports.push(await consumeEvent({ ledger: h.ledger, consumer: CONSUMER, handler }, delivered));
      },
    };
    // The relay's process dies after the publish and before the mark is recorded.
    let crash = true;
    const outbox: OutboxPort = {
      ...h.outbox,
      markPublished(ref) {
        if (crash) { crash = false; return Promise.reject(new Error('process died')); }
        return h.outbox.markPublished(ref);
      },
    };
    expect(await relayOnce({ outbox, publisher, limits: h.limits })).toEqual({ kind: 'stopped', published: [], event_id: event.event_id, code: OUTBOX_UNAVAILABLE.code });
    expect(h.outbox.entries()[0]?.dispatched_at).toBeUndefined();

    expect(await relayOnce({ outbox, publisher, limits: h.limits })).toEqual({ kind: 'relayed', published: [event.event_id] });
    expect(h.publisher.deliveries()).toHaveLength(2);
    expect(reports.map((report) => (report as { kind: string }).kind)).toEqual(['applied', 'duplicate']);
    expect(runs).toHaveLength(1);
    expect(h.ledger.rows()).toHaveLength(1);
    expect(await relayOnce({ outbox, publisher, limits: h.limits })).toEqual({ kind: 'idle' });
  });

  it('a mark that is refused (false) is treated the same way: unpublished, published again', async () => {
    const h = await outboxHarness();
    await produced(h);
    let refuse = true;
    const outbox: OutboxPort = { ...h.outbox, markPublished: (ref) => (refuse ? (refuse = false, Promise.resolve(false)) : h.outbox.markPublished(ref)) };
    expect(await relayOnce({ ...h, outbox })).toMatchObject({ kind: 'stopped', code: OUTBOX_UNAVAILABLE.code });
    expect(await relayOnce({ ...h, outbox })).toMatchObject({ kind: 'relayed' });
    expect(h.publisher.deliveries()).toHaveLength(2);
  });
});

describe('tenant scope is carried and never crossed', () => {
  it('the same event id and consumer in another workspace is another key: neither suppresses the other', async () => {
    const h = await outboxHarness();
    const a = await produced(h, h.contextA);
    // An event of workspace B carrying the same event id (a generator collision the outbox itself
    // refuses; a consumer must still keep the workspaces apart).
    const b: EventEnvelope = { ...h.event(h.contextB), event_id: a.event_id };
    const { handler, runs } = countingHandler();
    const deps = { ledger: h.ledger, consumer: CONSUMER, handler };
    expect(await consumeEvent(deps, a)).toMatchObject({ kind: 'applied' });
    expect(await consumeEvent(deps, b)).toMatchObject({ kind: 'applied' });
    expect(runs).toEqual([a.event_id, a.event_id]);
    expect(h.ledger.rows().map((row) => row.workspace_id)).toEqual([WORKSPACE_A, WORKSPACE_B]);
    expect(h.ledger.effects(WORKSPACE_A).size).toBe(1);
    expect(h.ledger.effects(WORKSPACE_B).size).toBe(1);
  });

  it('the ledger key is the event\'s own workspace, and the unit of work writes only there', async () => {
    const h = await outboxHarness();
    const event = await produced(h, h.contextB);
    let key: unknown;
    await consumeEvent({
      ledger: h.ledger,
      consumer: CONSUMER,
      handler: (delivered, tx) => { key = tx.key; tx.put('k', delivered.tenant_context.workspace_id); return Promise.resolve(OK); },
    }, event);
    expect(key).toEqual({ workspace_id: WORKSPACE_B, consumer: CONSUMER, event_id: event.event_id });
    expect(h.ledger.effects(WORKSPACE_B).get('k')).toBe(WORKSPACE_B);
    expect(h.ledger.effects(WORKSPACE_A).size).toBe(0);
    expect(await h.ledger.isRecorded({ workspace_id: WORKSPACE_A, consumer: CONSUMER, event_id: event.event_id })).toBe(false);
    expect(await h.ledger.isRecorded({ workspace_id: WORKSPACE_B, consumer: CONSUMER, event_id: event.event_id })).toBe(true);
  });

  it('a unit of work\'s writes are refused once it has settled', async () => {
    const h = await outboxHarness();
    const event = await produced(h);
    let kept: InMemoryConsumerTransaction | undefined;
    await consumeEvent({ ledger: h.ledger, consumer: CONSUMER, handler: (_event, tx) => { kept = tx; return Promise.resolve(OK); } }, event);
    expect(() => kept?.put('late', 'x')).toThrow('outbox: the unit of work has settled');
    expect(h.ledger.effects(WORKSPACE_A).has('late')).toBe(false);
  });
});

// Criterion 6: no record, error or report carries a thrown value's message, name or stack.
describe('nothing thrown or returned is kept', () => {
  const leaks = (value: unknown): boolean => JSON.stringify(value).includes(LEAK_MARKER);

  it.each([
    ['throws', (): Promise<ConsumerOutcome> => { throw new LeakingError(); }, EVENT_CONSUMER_FAILED.code],
    ['rejects', (): Promise<ConsumerOutcome> => Promise.reject(new LeakingError()), EVENT_CONSUMER_FAILED.code],
    ['rejects with a string', (): Promise<ConsumerOutcome> => Promise.reject(LEAK_MARKER), EVENT_CONSUMER_FAILED.code],
    ['returns a failure it built itself', (): Promise<ConsumerOutcome> => Promise.resolve({ ok: false, error: { code: LEAK_MARKER } } as unknown as ConsumerOutcome), EVENT_CONSUMER_FAILED.code],
    ['returns a non-outcome', (): Promise<ConsumerOutcome> => Promise.resolve({ message: LEAK_MARKER } as unknown as ConsumerOutcome), EVENT_CONSUMER_FAILED.code],
    ['returns an outcome whose getter throws', (): Promise<ConsumerOutcome> => Promise.resolve(Object.defineProperty({}, 'ok', { enumerable: true, get() { throw new LeakingError(); } }) as ConsumerOutcome), EVENT_CONSUMER_FAILED.code],
  ])('a handler that %s', async (_label, handler, code) => {
    const h = await outboxHarness();
    const event = await produced(h);
    const report = await consumeEvent({ ledger: h.ledger, consumer: CONSUMER, handler }, event);
    expect(report).toEqual({ kind: 'failed', consumer: CONSUMER, event_id: event.event_id, code });
    expect(leaks(report) || leaks(h.ledger.rows()) || leaks([...h.ledger.effects(WORKSPACE_A)])).toBe(false);
  });

  it('a ledger that throws', async () => {
    const h = await outboxHarness();
    const event = await produced(h);
    const ledger = { ...h.ledger, recordOnce: () => Promise.reject(new LeakingError()) };
    const report = await consumeEvent({ ledger, consumer: CONSUMER, handler: () => Promise.resolve(OK) }, event);
    expect(report).toEqual({ kind: 'failed', consumer: CONSUMER, event_id: event.event_id, code: EVENT_LEDGER_UNAVAILABLE.code });
    expect(leaks(report)).toBe(false);
  });

  it('a publisher, a mark and a fetch that throw', async () => {
    const h = await outboxHarness();
    await produced(h);
    const publisher: PublisherPort = { publish: () => Promise.reject(new LeakingError()) };
    const reports = [
      await relayOnce({ ...h, publisher }),
      await relayOnce({ ...h, outbox: { ...h.outbox, markPublished: () => Promise.reject(new LeakingError()) } }),
      await relayOnce({ ...h, outbox: { ...h.outbox, fetchUnpublished: () => Promise.reject(new LeakingError()) } }),
    ];
    expect(reports.map((report) => report.kind)).toEqual(['stopped', 'stopped', 'stopped']);
    expect(leaks(reports) || leaks(h.outbox.entries())).toBe(false);
  });

  it('an envelope whose property getter throws is rejected, not thrown', async () => {
    const h = await outboxHarness();
    const event = await produced(h);
    const hostile = Object.defineProperty({ ...event }, 'event_type', { enumerable: true, get() { throw new LeakingError(); } });
    let report: unknown;
    try {
      report = await consumeEvent({ ledger: h.ledger, consumer: CONSUMER, handler: () => Promise.resolve(OK) }, hostile);
    } catch (error) {
      report = error;
    }
    expect(report).toEqual({ kind: 'rejected', consumer: CONSUMER, code: EVENT_ENVELOPE_INVALID.code });
  });
});
