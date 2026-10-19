import { AsyncLocalStorage } from 'node:async_hooks';

import { readEnvelope, type EventEnvelope } from '../../domain/outbox/event-envelope';
import { isConsumerName, ledgerKeyOf, type LedgerKey } from '../../domain/outbox/outbox-entry';
import { EVENT_CONSUMER_FAILED, EVENT_CONSUMER_REENTRANT, EVENT_ENVELOPE_INVALID, EVENT_LEDGER_UNAVAILABLE } from '../../domain/outbox/outbox-errors';
import { isObject } from '../../domain/json-shape';
import { mintedDefinitionOf, type StableError, type StableErrorDefinition } from '../../domain/stable-error';
import type { ConsumerLedgerPort, ConsumerTransaction } from './outbox-port';

// The replay-safe consumer helper. For one delivered value and one named consumer:
//
// - A value that is not a CTR-EVT-001 envelope is `rejected` (EVENT_ENVELOPE_INVALID): nothing is
//   recorded and the handler never runs.
// - Otherwise the ledger key is (the event's OWN workspace, the consumer, the event id), and the
//   ledger's recordOnce runs the handler in the unit of work that records that key first, so the row
//   and the handler's effect become visible together. A key already recorded is a `duplicate`: the
//   handler does not run again, so a replayed or redelivered event has no second effect.
// - The handler sees a frozen copy of the envelope (the contract's fields only) and the unit of work,
//   whose writes are scoped to the event's workspace. It cannot choose another workspace's key.
// - A handler that throws or rejects, or returns anything but an outcome (a failure whose error
//   platform-kernel did not mint among them), is EVENT_CONSUMER_FAILED; a minted failure keeps its
//   own code. Either way the unit of work is rolled back (no row, no effect) and a redelivery may run
//   the handler again. A ledger that fails is EVENT_LEDGER_UNAVAILABLE. Nothing of what was thrown or
//   returned is kept: the report carries the consumer, the event id and a code.

export type ConsumerOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: StableError };

export type EventHandler<Tx extends ConsumerTransaction> = (event: EventEnvelope, tx: Tx) => Promise<ConsumerOutcome>;

export interface ConsumerDependencies<Tx extends ConsumerTransaction> {
  readonly ledger: ConsumerLedgerPort<Tx>;
  readonly consumer: string;
  readonly handler: EventHandler<Tx>;
}

export type ConsumeReport =
  | { readonly kind: 'applied' | 'duplicate'; readonly consumer: string; readonly event_id: string }
  | { readonly kind: 'failed'; readonly consumer: string; readonly event_id: string; readonly code: string }
  | { readonly kind: 'rejected'; readonly consumer: string; readonly code: string };

// The handler's own rollback, told apart from a ledger failure by identity (a WeakMap lookup runs no
// trap of a proxy the ledger might throw).
const ROLLBACKS = new WeakMap<object, StableErrorDefinition>();

function rollback(definition: StableErrorDefinition): object {
  const token = Object.freeze({});
  ROLLBACKS.set(token, definition);
  return token;
}

const rollbackOf = (value: unknown): StableErrorDefinition | undefined =>
  typeof value === 'object' && value !== null ? ROLLBACKS.get(value) : undefined;

// The handler's settled value, read once per property: null for success, else the failure's
// definition.
function failureOf(value: unknown): StableErrorDefinition | null {
  try {
    if (!isObject(value) || !Object.hasOwn(value, 'ok')) return EVENT_CONSUMER_FAILED;
    const ok = value.ok;
    if (ok === true) return null;
    if (ok === false) {
      const error = Object.hasOwn(value, 'error') ? value.error : undefined;
      return mintedDefinitionOf(error) ?? EVENT_CONSUMER_FAILED;
    }
    return EVENT_CONSUMER_FAILED;
  } catch {
    // A getter that throws, a revoked proxy: nothing of it is kept.
    return EVENT_CONSUMER_FAILED;
  }
}

// A1-302-I6: the units of work this async call chain is inside, by (ledger, key). A handler that
// calls consumeEvent for the same ledger and key from inside its own unit would wait on itself
// forever (the key is held until that very unit settles), so the inner call is refused at once with
// EVENT_CONSUMER_REENTRANT. A concurrent delivery from another call chain is not inside the unit and
// still waits, as before. A frame is open only while its unit runs: a continuation the handler left
// behind that calls after the unit settled is an ordinary later delivery.
interface OpenUnit {
  readonly ledger: object;
  readonly key: string;
  open: boolean;
}

const UNITS = new AsyncLocalStorage<readonly OpenUnit[]>();

const unitKey = (key: LedgerKey): string => JSON.stringify([key.workspace_id, key.consumer, key.event_id]);

const insideOwnUnit = (ledger: object, key: string): boolean =>
  (UNITS.getStore() ?? []).some((unit) => unit.open && unit.ledger === ledger && unit.key === key);

export async function consumeEvent<Tx extends ConsumerTransaction>(dependencies: ConsumerDependencies<Tx>, delivered: unknown): Promise<ConsumeReport> {
  const { consumer } = dependencies;
  if (!isConsumerName(consumer)) throw new TypeError('consumer: a consumer name is 1 to 64 characters');
  // A1-302-1: the delivered value is read once, checked on that copy, and only the copy is used.
  const event = readEnvelope(delivered);
  if (event === null) return { kind: 'rejected', consumer, code: EVENT_ENVELOPE_INVALID.code };
  const key = ledgerKeyOf(consumer, event);
  const { ledger } = dependencies;
  const id = unitKey(key);
  if (insideOwnUnit(ledger, id)) return { kind: 'failed', consumer, event_id: key.event_id, code: EVENT_CONSUMER_REENTRANT.code };
  try {
    const result = await ledger.recordOnce(key, async (tx) => {
      const unit: OpenUnit = { ledger, key: id, open: true };
      let settled: unknown;
      try {
        settled = await UNITS.run([...(UNITS.getStore() ?? []), unit], () => dependencies.handler(event, tx));
      } catch {
        throw rollback(EVENT_CONSUMER_FAILED);
      } finally {
        unit.open = false;
      }
      const failure = failureOf(settled);
      if (failure !== null) throw rollback(failure);
    });
    return { kind: result.recorded ? 'applied' : 'duplicate', consumer, event_id: key.event_id };
  } catch (error) {
    const definition = rollbackOf(error) ?? EVENT_LEDGER_UNAVAILABLE;
    return { kind: 'failed', consumer, event_id: key.event_id, code: definition.code };
  }
}
