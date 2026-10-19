// The outbox and the relay on the fakes (manifest acceptance criterion 5): an event written in the
// producing unit of work is relayed at least once; an event in a unit that rolled back is never
// relayed; the relay marks an entry only after its publish resolved, in position order; and the
// tenant scope an event is produced under is the one it carries, never crossed.
import { describe, expect, it } from 'vitest';

import { checkEventEnvelope } from '../../domain/outbox/event-envelope';
import { OUTBOX_PUBLISH_FAILED, OUTBOX_UNAVAILABLE } from '../../domain/outbox/outbox-errors';
import { tenantContextRecordOf } from '../tenant-context';
import { buildEvent } from './events';
import { sequentialEventIdSource } from './fakes';
import type { PublisherPort } from './outbox-port';
import { relayOnce } from './relay';
import { WORKSPACE_A, WORKSPACE_B, outboxHarness } from './test-support';

describe('the producing unit of work', () => {
  it('an event written with its domain state commits with it, and is relayed at least once', async () => {
    const h = await outboxHarness();
    const event = h.event(h.contextA);
    const value = await h.outbox.transaction(h.contextA, async (tx) => {
      tx.put('research_run:run_synthetic_0001', 'completed');
      tx.append(event);
      return 'done';
    });
    expect(value).toBe('done');
    expect(h.outbox.state(WORKSPACE_A).get('research_run:run_synthetic_0001')).toBe('completed');
    expect(h.outbox.entries().map((entry) => entry.envelope.event_id)).toEqual([event.event_id]);

    expect(await relayOnce(h)).toEqual({ kind: 'relayed', published: [event.event_id] });
    expect(h.publisher.deliveries()).toEqual([event]);
    expect(h.outbox.entries()[0]?.dispatched_at).toBe('2026-10-19T00:00:00.000Z');
    // Marked: the next step has nothing to publish.
    expect(await relayOnce(h)).toEqual({ kind: 'idle' });
    expect(h.publisher.deliveries()).toHaveLength(1);
  });

  it('a unit of work that rolls back leaves neither its state nor its event, and nothing is relayed', async () => {
    const h = await outboxHarness();
    const failure = new Error('producer failed');
    await expect(h.outbox.transaction(h.contextA, (tx) => {
      tx.put('research_run:run_synthetic_0001', 'completed');
      tx.append(h.event(h.contextA));
      return Promise.reject(failure);
    })).rejects.toBe(failure);
    expect(h.outbox.state(WORKSPACE_A).size).toBe(0);
    expect(h.outbox.entries()).toHaveLength(0);
    expect(await relayOnce(h)).toEqual({ kind: 'idle' });
    expect(h.publisher.deliveries()).toHaveLength(0);
  });

  it('an append that fails (a duplicate event_id) rolls back the whole unit, earlier appends included', async () => {
    const h = await outboxHarness();
    const first = h.event(h.contextA);
    await h.outbox.transaction(h.contextA, (tx) => { tx.append(first); return Promise.resolve(); });
    const fresh = h.event(h.contextA);
    await expect(h.outbox.transaction(h.contextA, (tx) => {
      tx.put('k', 'v');
      tx.append(fresh);
      tx.append(first);
      return Promise.resolve();
    })).rejects.toThrow('outbox: an event with this event_id already exists');
    expect(h.outbox.entries().map((entry) => entry.envelope.event_id)).toEqual([first.event_id]);
    expect(h.outbox.state(WORKSPACE_A).size).toBe(0);
  });

  it('two units committing the same event id: the second commits nothing', async () => {
    const h = await outboxHarness();
    const event = h.event(h.contextA);
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const slow = h.outbox.transaction(h.contextA, async (tx) => { tx.append(event); tx.put('slow', '1'); await gate; });
    await h.outbox.transaction(h.contextA, (tx) => { tx.append(event); return Promise.resolve(); });
    release();
    await expect(slow).rejects.toThrow('outbox: an event with this event_id already exists');
    expect(h.outbox.entries()).toHaveLength(1);
    expect(h.outbox.state(WORKSPACE_A).has('slow')).toBe(false);
  });

  it('an append after the unit has settled is refused', async () => {
    const h = await outboxHarness();
    let kept: { append(event: ReturnType<typeof h.event>): void } | undefined;
    await h.outbox.transaction(h.contextA, (tx) => { kept = tx; return Promise.resolve(); });
    expect(() => kept?.append(h.event(h.contextA))).toThrow('outbox: the unit of work has settled');
    expect(h.outbox.entries()).toHaveLength(0);
  });

  it('positions follow commit order, and the relay publishes oldest first within its batch size', async () => {
    const h = await outboxHarness({ relayBatchSize: 2 });
    const events = [h.event(h.contextA), h.event(h.contextB), h.event(h.contextA)];
    for (const event of events) {
      const context = event.tenant_context.workspace_id === WORKSPACE_A ? h.contextA : h.contextB;
      await h.outbox.transaction(context, (tx) => { tx.append(event); return Promise.resolve(); });
    }
    expect(h.outbox.entries().map((entry) => entry.position)).toEqual([1, 2, 3]);
    expect(await relayOnce(h)).toEqual({ kind: 'relayed', published: [events[0]?.event_id, events[1]?.event_id] });
    expect(await relayOnce(h)).toEqual({ kind: 'relayed', published: [events[2]?.event_id] });
    expect(h.publisher.deliveries().map((event) => event.event_id)).toEqual(events.map((event) => event.event_id));
  });
});

describe('the relay', () => {
  it('a publish that fails leaves the entry unpublished and stops the step, so a later entry is not published first', async () => {
    const h = await outboxHarness();
    const [one, two] = [h.event(h.contextA), h.event(h.contextA)];
    await h.outbox.transaction(h.contextA, (tx) => { tx.append(one); tx.append(two); return Promise.resolve(); });
    let failing = true;
    const delivered: string[] = [];
    const publisher: PublisherPort = {
      publish(event) {
        if (failing) return Promise.reject(new Error('transport down'));
        delivered.push(event.event_id);
        return Promise.resolve();
      },
    };
    expect(await relayOnce({ ...h, publisher })).toEqual({ kind: 'stopped', published: [], event_id: one.event_id, code: OUTBOX_PUBLISH_FAILED.code });
    expect(h.outbox.entries().every((entry) => entry.dispatched_at === undefined)).toBe(true);
    failing = false;
    expect(await relayOnce({ ...h, publisher })).toEqual({ kind: 'relayed', published: [one.event_id, two.event_id] });
    expect(delivered).toEqual([one.event_id, two.event_id]);
  });

  it('a publisher that throws synchronously is a failed publish too', async () => {
    const h = await outboxHarness();
    const event = h.event(h.contextA);
    await h.outbox.transaction(h.contextA, (tx) => { tx.append(event); return Promise.resolve(); });
    const publisher: PublisherPort = { publish() { throw new Error('sync'); } };
    expect(await relayOnce({ ...h, publisher })).toMatchObject({ kind: 'stopped', code: OUTBOX_PUBLISH_FAILED.code });
  });

  it('an outbox that cannot be read stops the step with no event named', async () => {
    const h = await outboxHarness();
    const outbox = { ...h.outbox, fetchUnpublished: () => Promise.reject(new Error('db down')) };
    expect(await relayOnce({ ...h, outbox })).toEqual({ kind: 'stopped', published: [], code: OUTBOX_UNAVAILABLE.code });
  });

  it('refuses limits outside the D6 shape', async () => {
    const h = await outboxHarness();
    await expect(relayOnce({ ...h, limits: { relayBatchSize: 0 } })).rejects.toThrow('outbox relay: the batch size is a positive whole number');
    await expect(h.outbox.fetchUnpublished(0)).rejects.toThrow(TypeError);
  });
});

describe('tenant scope is carried and never crossed', () => {
  it('an event carries the minted context of the unit that produced it, through the relay', async () => {
    const h = await outboxHarness();
    const a = h.event(h.contextA);
    const b = h.event(h.contextB);
    expect(a.tenant_context).toEqual(tenantContextRecordOf(h.contextA));
    expect(a.correlation_id).toBe(h.contextA.correlation_id);
    await h.outbox.transaction(h.contextA, (tx) => { tx.append(a); return Promise.resolve(); });
    await h.outbox.transaction(h.contextB, (tx) => { tx.append(b); return Promise.resolve(); });
    await relayOnce(h);
    const byId = new Map(h.publisher.deliveries().map((event) => [event.event_id, event]));
    expect(byId.get(a.event_id)?.tenant_context).toEqual(tenantContextRecordOf(h.contextA));
    expect(byId.get(b.event_id)?.tenant_context).toEqual(tenantContextRecordOf(h.contextB));
    expect(h.publisher.deliveries().every(checkEventEnvelope)).toBe(true);
  });

  it('an event of workspace B appended in workspace A\'s unit is refused, and the unit commits nothing', async () => {
    const h = await outboxHarness();
    await expect(h.outbox.transaction(h.contextA, (tx) => {
      tx.put('k', 'v');
      tx.append(h.event(h.contextB));
      return Promise.resolve();
    })).rejects.toThrow("outbox: an event is appended only in its own workspace's unit of work");
    expect(h.outbox.entries()).toHaveLength(0);
    expect(h.outbox.state(WORKSPACE_A).size).toBe(0);
    expect(h.outbox.state(WORKSPACE_B).size).toBe(0);
  });

  it('a unit of work, or an event, for a context the resolver did not mint is refused', async () => {
    const h = await outboxHarness();
    const copy = { ...h.contextA };
    const json = JSON.parse(JSON.stringify(h.contextA)) as typeof h.contextA;
    await expect(h.outbox.transaction(copy, () => Promise.resolve())).rejects.toThrow('outbox: the tenant context was not minted by the resolver');
    await expect(h.outbox.transaction(json, () => Promise.resolve())).rejects.toThrow(TypeError);
    expect(() => buildEvent({ clock: h.clock, ids: sequentialEventIdSource() }, copy, {
      event_type: 'research.run.completed',
      event_version: 1,
      producer: { module_key: 'research-suggestion', implementation_version: '1.0.0' },
      subject: { type: 'research_run', id: 'r', version: 1 },
      schema_ref: 'CTR-EVT-001@1.0.0',
    })).toThrow('outbox: the tenant context was not minted by the resolver');
  });

  it('an entry is never marked from another workspace\'s reference', async () => {
    const h = await outboxHarness();
    const event = h.event(h.contextA);
    await h.outbox.transaction(h.contextA, (tx) => { tx.append(event); return Promise.resolve(); });
    const ref = { position: 1, event_id: event.event_id, workspace_id: WORKSPACE_B };
    expect(await h.outbox.markPublished(ref)).toBe(false);
    expect(await h.outbox.markPublished({ ...ref, workspace_id: WORKSPACE_A, event_id: 'evt_other' })).toBe(false);
    expect(await h.outbox.markPublished({ ...ref, workspace_id: WORKSPACE_A, position: 2 })).toBe(false);
    expect(h.outbox.entries()[0]?.dispatched_at).toBeUndefined();
    expect(await h.outbox.markPublished({ ...ref, workspace_id: WORKSPACE_A })).toBe(true);
  });

  it('domain state is kept per workspace', async () => {
    const h = await outboxHarness();
    await h.outbox.transaction(h.contextA, (tx) => { tx.put('k', 'a'); return Promise.resolve(); });
    await h.outbox.transaction(h.contextB, (tx) => { tx.put('k', 'b'); return Promise.resolve(); });
    expect(h.outbox.state(WORKSPACE_A).get('k')).toBe('a');
    expect(h.outbox.state(WORKSPACE_B).get('k')).toBe('b');
  });
});
