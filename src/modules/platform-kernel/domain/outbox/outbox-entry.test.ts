// The outbox entry and ledger-key decisions as pure functions (manifest acceptance criterion 5): an
// entry is marked published once and keeps its first instant; a reference must name the entry's
// position, event AND workspace; the ledger key is the event's own workspace, the consumer and the
// event id; the relay's batch size is a D6 provisional limit in one place. No status value is written.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { addSeconds, instantOf } from '../jobs/job-decisions';
import type { EventEnvelope } from './event-envelope';
import {
  CONSUMER_NAME_MAX_LENGTH,
  checkLedgerKey,
  checkOutboxEntry,
  isConsumerName,
  isUnpublished,
  ledgerKeyOf,
  markDispatched,
  newOutboxEntry,
  refOf,
  refersTo,
} from './outbox-entry';
import { D6_PROVISIONAL_OUTBOX_LIMITS, checkOutboxLimits } from './outbox-limits';

const valid = JSON.parse(readFileSync(new URL('../../../../../contract-catalog/shared-kernel/ctr-evt-001/examples/valid.json', import.meta.url), 'utf8')) as EventEnvelope;
const T0 = instantOf('2026-10-19T00:00:00.000Z');

describe('outbox entries', () => {
  it('a new entry is unpublished, frozen and holds a copy of the envelope', () => {
    const entry = newOutboxEntry(1, valid);
    expect(isUnpublished(entry)).toBe(true);
    expect(checkOutboxEntry(entry)).toBe(true);
    expect(Object.isFrozen(entry) && Object.isFrozen(entry.envelope)).toBe(true);
    expect(entry.envelope).toEqual(valid);
    expect(entry.envelope).not.toBe(valid);
    expect(Object.keys(entry).sort()).toEqual(['envelope', 'position']);
  });

  it('refuses a position that is not a positive whole number and an envelope outside CTR-EVT-001', () => {
    for (const position of [0, -1, 1.5, Number.NaN]) expect(() => newOutboxEntry(position, valid)).toThrow('outbox: a position is a positive whole number');
    expect(() => newOutboxEntry(1, { ...valid, payload: { raw: 'x' } } as unknown as EventEnvelope)).toThrow('outbox: the event does not satisfy CTR-EVT-001');
  });

  it('is marked published once: a second mark keeps the first instant', () => {
    const entry = newOutboxEntry(7, valid);
    const marked = markDispatched(entry, T0);
    expect(marked.dispatched_at).toBe('2026-10-19T00:00:00.000Z');
    expect(isUnpublished(marked)).toBe(false);
    const again = markDispatched(marked, addSeconds(T0, 60));
    expect(again).toBe(marked);
    expect(entry.dispatched_at).toBeUndefined();
    expect(() => markDispatched(entry, 1.5 as typeof T0)).toThrow(TypeError);
  });

  it('a reference names the position, the event and the workspace; any one differing is another entry', () => {
    const entry = newOutboxEntry(3, valid);
    const ref = refOf(entry);
    expect(ref).toEqual({ position: 3, event_id: valid.event_id, workspace_id: valid.tenant_context.workspace_id });
    expect(refersTo(entry, ref)).toBe(true);
    expect(refersTo(entry, { ...ref, position: 4 })).toBe(false);
    expect(refersTo(entry, { ...ref, event_id: 'evt_other' })).toBe(false);
    expect(refersTo(entry, { ...ref, workspace_id: 'ws_synthetic_other' })).toBe(false);
  });
});

describe('the consumer ledger key', () => {
  it('is the event\'s own workspace, the consumer and the event id', () => {
    const key = ledgerKeyOf('search-index', valid);
    expect(key).toEqual({ workspace_id: valid.tenant_context.workspace_id, consumer: 'search-index', event_id: valid.event_id });
    expect(Object.isFrozen(key)).toBe(true);
    expect(checkLedgerKey(key)).toBe(true);
  });

  it('bounds the consumer name at 64 characters (050 consumer_ledger_consumer_bounded)', () => {
    expect(CONSUMER_NAME_MAX_LENGTH).toBe(64);
    expect(isConsumerName('c'.repeat(64))).toBe(true);
    expect(isConsumerName('c'.repeat(65))).toBe(false);
    expect(isConsumerName('')).toBe(false);
    expect(() => ledgerKeyOf('', valid)).toThrow('consumer ledger: a consumer name is 1 to 64 characters');
    expect(() => ledgerKeyOf('search-index', { ...valid, tenant_context: { ...valid.tenant_context, locale: 'en-US' } } as unknown as EventEnvelope)).toThrow(TypeError);
  });

  it('refuses a key without a workspace or an event id', () => {
    expect(checkLedgerKey({ workspace_id: '', consumer: 'c', event_id: 'e' })).toBe(false);
    expect(checkLedgerKey({ workspace_id: 'w', consumer: 'c', event_id: '' })).toBe(false);
  });
});

describe('the D6 provisional outbox limits', () => {
  it('are in one place, frozen and valid', () => {
    expect(Object.isFrozen(D6_PROVISIONAL_OUTBOX_LIMITS)).toBe(true);
    expect(checkOutboxLimits(D6_PROVISIONAL_OUTBOX_LIMITS)).toBe(true);
  });

  it('refuse a batch size that is not a positive whole number', () => {
    for (const relayBatchSize of [0, -1, 1.5, Number.POSITIVE_INFINITY]) expect(checkOutboxLimits({ relayBatchSize })).toBe(false);
  });
});
