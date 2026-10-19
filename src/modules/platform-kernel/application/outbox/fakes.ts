import { timestampOf } from '../../domain/jobs/job-decisions';
import { readEnvelope, type EventEnvelope } from '../../domain/outbox/event-envelope';
import { isObject } from '../../domain/json-shape';
import {
  checkLedgerKey,
  isUnpublished,
  markDispatched,
  newOutboxEntry,
  refersTo,
  type LedgerKey,
  type OutboxEntry,
  type OutboxEntryRef,
} from '../../domain/outbox/outbox-entry';
import { TENANT_CONTEXT_KEYS, type TenantContextRecord } from '../../domain/tenant-context';
import { isMintedTenantContext, tenantContextRecordOf } from '../tenant-context';
import type {
  ConsumerLedgerPort,
  ConsumerTransaction,
  EventIdSource,
  OutboxClock,
  OutboxPort,
  OutboxTransaction,
  PublisherPort,
} from './outbox-port';

// In-memory fakes of the outbox ports, for consumer tests. Synthetic ids only; no provider, no I/O,
// no real clock, no randomness. Each fake models the database transaction its adapter will run in:
// what a unit of work stages becomes visible when it commits and never when it rolls back, and each
// unit's own writes (`put`) are scoped to its workspace, so a test can read domain state and events
// (or a ledger row and a consumer's effect) side by side and see that they commit together.

// A deterministic event id source: `<prefix>_000001`, `<prefix>_000002`, ...
export function sequentialEventIdSource(prefix = 'evt_synthetic'): EventIdSource {
  let next = 0;
  return {
    mint() {
      next += 1;
      return `${prefix}_${String(next).padStart(6, '0')}`;
    },
  };
}

type Writes = Map<string, Map<string, string>>;

const writesOf = (writes: Writes, workspaceId: string): ReadonlyMap<string, string> => new Map(writes.get(workspaceId) ?? []);

function commitWrites(writes: Writes, workspaceId: string, staged: ReadonlyMap<string, string>): void {
  const target = writes.get(workspaceId) ?? new Map<string, string>();
  for (const [key, value] of staged) target.set(key, value);
  writes.set(workspaceId, target);
}

const SETTLED = 'outbox: the unit of work has settled';

// Two CTR-TEN-001 records name the same context: every key of the contract, the optional ones
// present in both or in neither, and the actor's kind and id.
function sameTenantContext(a: TenantContextRecord, b: TenantContextRecord): boolean {
  return TENANT_CONTEXT_KEYS.every((key) => {
    if (Object.hasOwn(a, key) !== Object.hasOwn(b, key)) return false;
    if (key === 'actor') return a.actor.kind === b.actor.kind && a.actor.id === b.actor.id;
    return a[key] === b[key];
  });
}

// A caller's reference or key, each named property read once into a frozen copy (A1-302-1); null
// when it is not an object or a read throws (nothing of what was thrown is kept).
function readOnce<K extends string>(value: unknown, keys: readonly K[]): Readonly<Record<K, unknown>> | null {
  try {
    if (!isObject(value)) return null;
    const copy = {} as Record<K, unknown>;
    for (const key of keys) copy[key] = value[key];
    return Object.freeze(copy);
  } catch {
    return null;
  }
}

const refOnce = (value: unknown): OutboxEntryRef | null =>
  readOnce(value, ['position', 'event_id', 'workspace_id'] as const) as OutboxEntryRef | null;

// Each method does its whole read-decide-write before it returns, so no other call interleaves
// inside it (as in application/jobs/fakes.ts).
const settle = <T>(work: () => T): Promise<T> => {
  try {
    return Promise.resolve(work());
  } catch (error) {
    return Promise.reject(error);
  }
};

// ----- the outbox ----------------------------------------------------------------------------

// The producing unit of work: an outbox append and the domain state it announces, side by side.
export interface InMemoryOutboxTransaction extends OutboxTransaction {
  // Stages a domain write (key, value) under the unit's own workspace.
  put(key: string, value: string): void;
}

export interface InMemoryOutbox extends OutboxPort<InMemoryOutboxTransaction> {
  // Every committed entry, in position order, for tests to read.
  entries(): readonly OutboxEntry[];
  // The committed domain state of one workspace.
  state(workspaceId: string): ReadonlyMap<string, string>;
}

export function inMemoryOutbox(dependencies: { readonly clock: OutboxClock }): InMemoryOutbox {
  const { clock } = dependencies;
  // Keyed by position (app.outbox_events.id); the event id is unique across the table (050's
  // outbox_events_event_id_unique), so it is checked across every workspace.
  const entries = new Map<number, OutboxEntry>();
  const writes: Writes = new Map();
  let lastPosition = 0;

  const eventIdTaken = (eventId: string): boolean => [...entries.values()].some((entry) => entry.envelope.event_id === eventId);

  return {
    entries: () => [...entries.values()],
    state: (workspaceId) => writesOf(writes, workspaceId),

    async transaction(context, work) {
      // Only a context the resolver minted: a copy, a JSON round trip or a hand-built record is refused.
      if (!isMintedTenantContext(context)) throw new TypeError('outbox: the tenant context was not minted by the resolver');
      const unitContext = tenantContextRecordOf(context);
      const workspaceId = unitContext.workspace_id;
      const staged: EventEnvelope[] = [];
      const stagedWrites = new Map<string, string>();
      let open = true;
      const tx: InMemoryOutboxTransaction = Object.freeze({
        append(received: EventEnvelope) {
          if (!open) throw new TypeError(SETTLED);
          // A1-302-1: the caller's value is read once, into a deep-frozen copy, FIRST; the check, the
          // workspace comparison and the event-id uniqueness are decided on that copy, and that copy
          // is what is staged. A getter or proxy cannot answer the checks and the stored row
          // differently.
          const event = readEnvelope(received);
          if (event === null) throw new TypeError('outbox: the event does not satisfy CTR-EVT-001');
          if (event.tenant_context.workspace_id !== workspaceId) throw new TypeError("outbox: an event is appended only in its own workspace's unit of work");
          // A1-302-I1: the event carries the unit's own minted context, every field of it (actor,
          // request, profiles, correlation, locale), never one built by hand in the right workspace.
          if (!sameTenantContext(event.tenant_context, unitContext)) throw new TypeError("outbox: an event carries its unit of work's own tenant context");
          if (eventIdTaken(event.event_id) || staged.some((other) => other.event_id === event.event_id)) {
            throw new TypeError('outbox: an event with this event_id already exists');
          }
          staged.push(event);
        },
        put(key: string, value: string) {
          if (!open) throw new TypeError(SETTLED);
          stagedWrites.set(key, value);
        },
      });
      try {
        const value = await work(tx);
        open = false;
        // Commit, all or nothing: another unit may have committed the same event id meanwhile.
        if (staged.some((event) => eventIdTaken(event.event_id))) throw new TypeError('outbox: an event with this event_id already exists');
        for (const event of staged) {
          lastPosition += 1;
          entries.set(lastPosition, newOutboxEntry(lastPosition, event));
        }
        commitWrites(writes, workspaceId, stagedWrites);
        return value;
      } finally {
        open = false;
      }
    },

    fetchUnpublished: (limit) => settle(() => {
      if (!Number.isSafeInteger(limit) || limit < 1) throw new TypeError('outbox: a batch size is a positive whole number');
      return Object.freeze([...entries.values()].filter(isUnpublished).slice(0, limit));
    }),

    markPublished: (received) => settle(() => {
      // Read once (A1-302-1), then decided on the copy only.
      const ref = refOnce(received);
      if (ref === null) return false;
      const entry = entries.get(ref.position);
      if (entry === undefined || !refersTo(entry, ref)) return false;
      entries.set(entry.position, markDispatched(entry, clock.now()));
      return true;
    }),
  };
}

// ----- the publisher -------------------------------------------------------------------------

export interface RecordingPublisher extends PublisherPort {
  // Every envelope the publisher accepted, in order, repeats included.
  deliveries(): readonly EventEnvelope[];
}

// A transport that accepts every envelope and records it.
export function recordingPublisher(): RecordingPublisher {
  const delivered: EventEnvelope[] = [];
  return {
    deliveries: () => [...delivered],
    publish: (event) => settle(() => { delivered.push(event); }),
  };
}

// ----- the consumer ledger -------------------------------------------------------------------

// The consuming unit of work: the ledger row and the consumer's effect, side by side.
export interface InMemoryConsumerTransaction extends ConsumerTransaction {
  // Stages an effect (key, value) under the event's own workspace (the key's workspace_id).
  put(key: string, value: string): void;
}

export interface LedgerRow {
  readonly workspace_id: string;
  readonly consumer: string;
  readonly event_id: string;
  readonly consumed_at: string;
}

export interface InMemoryConsumerLedger extends ConsumerLedgerPort<InMemoryConsumerTransaction> {
  // Every committed row, in commit order, for tests to read.
  rows(): readonly LedgerRow[];
  // The committed effects in one workspace.
  effects(workspaceId: string): ReadonlyMap<string, string>;
}

const keyString = (key: LedgerKey): string => JSON.stringify([key.workspace_id, key.consumer, key.event_id]);

export function inMemoryConsumerLedger(dependencies: { readonly clock: OutboxClock }): InMemoryConsumerLedger {
  const { clock } = dependencies;
  const rows = new Map<string, LedgerRow>();
  const effects: Writes = new Map();
  // A unit of work holding a key it has not committed: a second recordOnce of that key waits for it,
  // as an insert waits on the unique constraint (050's consumer_ledger_one_per_consumer_per_event).
  const inFlight = new Map<string, Promise<void>>();

  // A1-302-1: the caller's key is read once, into a frozen copy, and checked on that copy only.
  const requireKey = (requested: LedgerKey): LedgerKey => {
    const key = readOnce(requested, ['workspace_id', 'consumer', 'event_id'] as const) as LedgerKey | null;
    if (key === null || !checkLedgerKey(key)) throw new TypeError('consumer ledger: the key is not a workspace, a consumer and an event id');
    return key;
  };

  return {
    rows: () => [...rows.values()],
    effects: (workspaceId) => writesOf(effects, workspaceId),

    async recordOnce(requested, work) {
      const key = requireKey(requested);
      const id = keyString(key);
      for (let holder = inFlight.get(id); holder !== undefined; holder = inFlight.get(id)) await holder;
      if (rows.has(id)) return { recorded: false };
      let release = (): void => undefined;
      inFlight.set(id, new Promise<void>((resolve) => { release = resolve; }));
      const staged = new Map<string, string>();
      let open = true;
      const tx: InMemoryConsumerTransaction = Object.freeze({
        key,
        put(name: string, value: string) {
          if (!open) throw new TypeError(SETTLED);
          staged.set(name, value);
        },
      });
      try {
        const value = await work(tx);
        open = false;
        // The row is the unit's first write; it and every effect commit together.
        rows.set(id, Object.freeze({ ...key, consumed_at: timestampOf(clock.now()) }));
        commitWrites(effects, key.workspace_id, staged);
        return { recorded: true, value };
      } finally {
        open = false;
        inFlight.delete(id);
        release();
      }
    },

    isRecorded: (key) => settle(() => rows.has(keyString(requireKey(key)))),
  };
}
