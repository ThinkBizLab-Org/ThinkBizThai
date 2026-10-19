import { instantFromMilliseconds, timestampOf, type Instant } from '../jobs/job-decisions';
import { isDateTime, isInteger, isStringWithin } from '../json-shape';
import { checkEventEnvelope, freezeEnvelope, type EventEnvelope } from './event-envelope';

// The outbox row and the consumer-ledger key, as pure values and decisions over them. Both follow
// db/foundation/migrations/050_async_kernel.sql, which the adapter (scope.exclude) will read and
// write:
//
//   app.outbox_events   an append-only CTR-EVT-001 envelope, ordered by `id` (the relay's cursor),
//                       whose ONE mutable column is dispatched_at. Having been published is that
//                       column's nullability, not a state name: nothing here writes a status value.
//   app.consumer_ledger one row per (workspace_id, consumer, event_id), the natural key 050 makes a
//                       unique constraint, so a redelivery finds the row and has no second effect.
//
// A value outside these shapes is a programming fault: a TypeError with a constant message, carrying
// nothing from the input.

// 050's consumer_ledger_consumer_bounded: a consumer is named the way a producer is, and CTR-EVT-001
// bounds producer.module_key at 64.
export const CONSUMER_NAME_MAX_LENGTH = 64;

export interface OutboxEntry {
  // The relay's cursor (app.outbox_events.id, generated always as identity): a positive integer the
  // store assigns at commit, never the producer.
  readonly position: number;
  readonly envelope: EventEnvelope;
  // Set once, by the relay, after the publisher accepted the envelope.
  readonly dispatched_at?: string;
}

// What the relay presents to mark an entry published: the entry's position, its event and its
// workspace. A reference that does not name all three of one stored entry is refused, so an entry is
// never marked from another workspace's scope.
export interface OutboxEntryRef {
  readonly position: number;
  readonly event_id: string;
  readonly workspace_id: string;
}

const isPosition = (value: unknown): value is number => isInteger(value) && Number.isSafeInteger(value) && value >= 1;

export function checkOutboxEntry(value: OutboxEntry): boolean {
  return isPosition(value.position)
    && checkEventEnvelope(value.envelope)
    && (!Object.hasOwn(value, 'dispatched_at') || isDateTime(value.dispatched_at));
}

function requireEntry(entry: OutboxEntry): void {
  if (!checkOutboxEntry(entry)) throw new TypeError('outbox: the entry is not a positioned CTR-EVT-001 envelope');
}

// A new, unpublished entry at `position`, holding a frozen copy of the envelope.
export function newOutboxEntry(position: number, envelope: EventEnvelope): OutboxEntry {
  if (!isPosition(position)) throw new TypeError('outbox: a position is a positive whole number');
  if (!checkEventEnvelope(envelope)) throw new TypeError('outbox: the event does not satisfy CTR-EVT-001');
  return Object.freeze({ position, envelope: freezeEnvelope(envelope) });
}

export function isUnpublished(entry: OutboxEntry): boolean {
  requireEntry(entry);
  return entry.dispatched_at === undefined;
}

export function refOf(entry: OutboxEntry): OutboxEntryRef {
  requireEntry(entry);
  return Object.freeze({ position: entry.position, event_id: entry.envelope.event_id, workspace_id: entry.envelope.tenant_context.workspace_id });
}

// The reference names this entry: same position, same event, same workspace.
export function refersTo(entry: OutboxEntry, ref: OutboxEntryRef): boolean {
  requireEntry(entry);
  return entry.position === ref.position
    && entry.envelope.event_id === ref.event_id
    && entry.envelope.tenant_context.workspace_id === ref.workspace_id;
}

// Marked published at `now`. Marked once: a second mark (a relay that published the entry again
// after a crash) keeps the first instant.
export function markDispatched(entry: OutboxEntry, now: Instant): OutboxEntry {
  requireEntry(entry);
  const at = timestampOf(instantFromMilliseconds(now));
  if (entry.dispatched_at !== undefined) return entry;
  return Object.freeze({ position: entry.position, envelope: entry.envelope, dispatched_at: at });
}

// The ledger's natural key (050's consumer_ledger_one_per_consumer_per_event).
export interface LedgerKey {
  readonly workspace_id: string;
  readonly consumer: string;
  readonly event_id: string;
}

export const isConsumerName = (value: unknown): value is string => isStringWithin(value, 1, CONSUMER_NAME_MAX_LENGTH);

export function checkLedgerKey(key: LedgerKey): boolean {
  return isStringWithin(key.workspace_id, 1)
    && isConsumerName(key.consumer)
    && isStringWithin(key.event_id, 1);
}

// The key a consumer records for an event: the event's OWN workspace, never one the consumer names.
export function ledgerKeyOf(consumer: string, envelope: EventEnvelope): LedgerKey {
  if (!isConsumerName(consumer)) throw new TypeError('consumer ledger: a consumer name is 1 to 64 characters');
  if (!checkEventEnvelope(envelope)) throw new TypeError('consumer ledger: the event does not satisfy CTR-EVT-001');
  return Object.freeze({ workspace_id: envelope.tenant_context.workspace_id, consumer, event_id: envelope.event_id });
}
