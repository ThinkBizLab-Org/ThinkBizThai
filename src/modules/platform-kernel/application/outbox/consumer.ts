import { checkEventEnvelope, freezeEnvelope, type EventEnvelope } from '../../domain/outbox/event-envelope';
import { isConsumerName, ledgerKeyOf } from '../../domain/outbox/outbox-entry';
import { EVENT_CONSUMER_FAILED, EVENT_ENVELOPE_INVALID, EVENT_LEDGER_UNAVAILABLE } from '../../domain/outbox/outbox-errors';
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

function envelopeOf(delivered: unknown): EventEnvelope | null {
  try {
    return checkEventEnvelope(delivered) ? freezeEnvelope(delivered) : null;
  } catch {
    // A value that changes between reads (a proxy) fails freezeEnvelope's own check.
    return null;
  }
}

export async function consumeEvent<Tx extends ConsumerTransaction>(dependencies: ConsumerDependencies<Tx>, delivered: unknown): Promise<ConsumeReport> {
  const { consumer } = dependencies;
  if (!isConsumerName(consumer)) throw new TypeError('consumer: a consumer name is 1 to 64 characters');
  const event = envelopeOf(delivered);
  if (event === null) return { kind: 'rejected', consumer, code: EVENT_ENVELOPE_INVALID.code };
  const key = ledgerKeyOf(consumer, event);
  try {
    const result = await dependencies.ledger.recordOnce(key, async (tx) => {
      let settled: unknown;
      try {
        settled = await dependencies.handler(event, tx);
      } catch {
        throw rollback(EVENT_CONSUMER_FAILED);
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
