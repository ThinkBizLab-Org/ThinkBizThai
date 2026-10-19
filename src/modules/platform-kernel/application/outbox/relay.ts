import { refOf } from '../../domain/outbox/outbox-entry';
import { OUTBOX_PUBLISH_FAILED, OUTBOX_UNAVAILABLE } from '../../domain/outbox/outbox-errors';
import { checkOutboxLimits, type OutboxLimits } from '../../domain/outbox/outbox-limits';
import type { StableErrorDefinition } from '../../domain/stable-error';
import type { OutboxPort, PublisherPort } from './outbox-port';

// One relay step: read the oldest unpublished entries (at most the batch size), publish each, and
// mark each published once the publisher has taken it. Delivery is AT LEAST ONCE: an entry is marked
// only after its publish resolved, so a crash, a rejected mark or a failed publish leaves it
// unpublished and a later step publishes it again; a consumer absorbs the repeat through its ledger
// (application/outbox/consumer.ts). The dispatcher that calls it in rounds is the provider increment
// (manifest scope.exclude; D6).
//
// A0's inference: the step stops at the first entry it cannot publish or mark, so a later entry is
// never published before an earlier one within a step. A permanently unpublishable entry therefore
// holds the queue until it is resolved; CTR-EVT-001 names no dead-letter for events, and whether the
// relay should skip one is the D6 question recorded in the manifest.
//
// Nothing the outbox or the publisher throws is kept: the report carries event ids and the code of a
// definition written in code.

export type OutboxRelayPort = Pick<OutboxPort, 'fetchUnpublished' | 'markPublished'>;

export interface RelayDependencies {
  readonly outbox: OutboxRelayPort;
  readonly publisher: PublisherPort;
  readonly limits: OutboxLimits;
}

// `published`: the event ids this step published AND marked, in position order. `stopped`: the step
// ended early; `event_id` is the entry it stopped at (absent when the batch could not be read).
export type RelayReport =
  | { readonly kind: 'idle' }
  | { readonly kind: 'relayed'; readonly published: readonly string[] }
  | { readonly kind: 'stopped'; readonly published: readonly string[]; readonly event_id?: string; readonly code: string };

const stopped = (published: readonly string[], definition: StableErrorDefinition, eventId?: string): RelayReport => ({
  kind: 'stopped',
  published: Object.freeze([...published]),
  ...(eventId === undefined ? {} : { event_id: eventId }),
  code: definition.code,
});

export async function relayOnce(dependencies: RelayDependencies): Promise<RelayReport> {
  if (!checkOutboxLimits(dependencies.limits)) throw new TypeError('outbox relay: the batch size is a positive whole number');
  let entries;
  try {
    entries = await dependencies.outbox.fetchUnpublished(dependencies.limits.relayBatchSize);
  } catch {
    return stopped([], OUTBOX_UNAVAILABLE);
  }
  if (entries.length === 0) return { kind: 'idle' };
  const published: string[] = [];
  for (const entry of entries) {
    const ref = refOf(entry);
    try {
      await dependencies.publisher.publish(entry.envelope);
    } catch {
      return stopped(published, OUTBOX_PUBLISH_FAILED, ref.event_id);
    }
    // Published but not yet marked: a crash here is the redelivery the consumer ledger absorbs.
    let marked: boolean;
    try {
      marked = await dependencies.outbox.markPublished(ref);
    } catch {
      marked = false;
    }
    if (marked !== true) return stopped(published, OUTBOX_UNAVAILABLE, ref.event_id);
    published.push(ref.event_id);
  }
  return { kind: 'relayed', published: Object.freeze(published) };
}
