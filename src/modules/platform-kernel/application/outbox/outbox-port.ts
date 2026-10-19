import type { Instant } from '../../domain/jobs/job-decisions';
import type { EventEnvelope } from '../../domain/outbox/event-envelope';
import type { LedgerKey, OutboxEntry, OutboxEntryRef } from '../../domain/outbox/outbox-entry';
import type { TenantContext } from '../tenant-context';

// The ports the outbox relay and the event consumer depend on. Their adapters (app.outbox_events and
// app.consumer_ledger in the producing and consuming database transactions, a real transport) are the
// provider/database increment (manifest scope.exclude); until then application/outbox/fakes.ts
// implements them in memory with synthetic data.

export interface OutboxClock {
  now(): Instant;
}

// A deterministic source of event ids (app.outbox_events.event_id is a uuid in the adapter).
export interface EventIdSource {
  mint(): string;
}

// The producing unit of work, as the outbox sees it. `append` stages an envelope in the SAME unit as
// the domain state it announces: it becomes visible to the relay when the unit commits, and never if
// the unit rolls back. An envelope whose tenant context names another workspace than the unit's is
// refused, and so is any append after the unit has settled.
export interface OutboxTransaction {
  append(event: EventEnvelope): void;
}

// The outbox. `transaction` opens a unit of work for a context the resolver minted
// (isMintedTenantContext), runs `work` in it, and commits everything `work` staged when it resolves,
// or nothing when it rejects (the rejection is passed on to the producer unchanged; it is the
// producer's own value and reaches no record). Positions are assigned at commit, in commit order.
//
// `fetchUnpublished` reads up to `limit` entries not yet marked, oldest position first.
// `markPublished` records that the publisher took the entry; it is refused (false) for a reference
// that does not name a stored entry's position, event AND workspace, and a second mark keeps the
// first instant. Several relays may read the same entry before one marks it: delivery is
// at-least-once, and the consumer ledger absorbs the duplicate.
export interface OutboxPort<Tx extends OutboxTransaction = OutboxTransaction> {
  transaction<T>(context: TenantContext, work: (tx: Tx) => Promise<T>): Promise<T>;
  fetchUnpublished(limit: number): Promise<readonly OutboxEntry[]>;
  markPublished(ref: OutboxEntryRef): Promise<boolean>;
}

// The transport. `publish` resolves once the transport has accepted the envelope and rejects when it
// has not; the relay treats anything but resolution as not published.
export interface PublisherPort {
  publish(event: EventEnvelope): Promise<void>;
}

// The consuming unit of work, as the ledger sees it: the key it records. A consumer's own effects
// are written in the same unit (the fake's `put`; the adapter's own statements in the same database
// transaction), so the ledger row and the effect are visible together or not at all.
export interface ConsumerTransaction {
  readonly key: LedgerKey;
}

export type LedgerResult<T> =
  | { readonly recorded: true; readonly value: T }
  | { readonly recorded: false };

// The consumer ledger. `recordOnce` opens a unit of work that records `key` FIRST and then runs
// `work`; on resolution the row and every effect `work` staged commit together. When the key is
// already recorded it returns `recorded: false` and `work` never runs. A concurrent `recordOnce` of
// the same key waits for the first to settle (the unique constraint's behaviour): if the first
// committed, the second finds the row; if it rolled back, the second runs. When `work` rejects,
// nothing is recorded and the rejection is passed on.
export interface ConsumerLedgerPort<Tx extends ConsumerTransaction = ConsumerTransaction> {
  recordOnce<T>(key: LedgerKey, work: (tx: Tx) => Promise<T>): Promise<LedgerResult<T>>;
  isRecorded(key: LedgerKey): Promise<boolean>;
}
