// Shared set-up for the outbox tests: minted tenant contexts for two workspaces (from the job tests'
// directory), a manual clock, the in-memory outbox, publisher and consumer ledger, and an event
// builder. Synthetic ids only.
import { D6_PROVISIONAL_OUTBOX_LIMITS, type OutboxLimits } from '../../domain/outbox/outbox-limits';
import type { EventEnvelope } from '../../domain/outbox/event-envelope';
import { manualJobClock, type ManualJobClock } from '../jobs/fakes';
import { START, mintContext, WORKSPACE_A, WORKSPACE_B } from '../jobs/test-support';
import type { TenantContext } from '../tenant-context';
import { buildEvent, type EventSpec } from './events';
import {
  inMemoryConsumerLedger,
  inMemoryOutbox,
  recordingPublisher,
  sequentialEventIdSource,
  type InMemoryConsumerLedger,
  type InMemoryOutbox,
  type RecordingPublisher,
} from './fakes';
import type { EventIdSource } from './outbox-port';

export { START, WORKSPACE_A, WORKSPACE_B };

export interface OutboxHarness {
  readonly clock: ManualJobClock;
  readonly ids: EventIdSource;
  readonly outbox: InMemoryOutbox;
  readonly publisher: RecordingPublisher;
  readonly ledger: InMemoryConsumerLedger;
  readonly limits: OutboxLimits;
  readonly contextA: TenantContext;
  readonly contextB: TenantContext;
  // A new event in the context's workspace.
  event(context: TenantContext, overrides?: Partial<EventSpec>): EventEnvelope;
}

export const SPEC: EventSpec = {
  event_type: 'research.run.completed',
  event_version: 1,
  producer: { module_key: 'research-suggestion', implementation_version: '1.0.0' },
  subject: { type: 'research_run', id: 'run_synthetic_0001', version: 1 },
  schema_ref: 'CTR-EVT-001@1.0.0',
};

export async function outboxHarness(limits: OutboxLimits = D6_PROVISIONAL_OUTBOX_LIMITS): Promise<OutboxHarness> {
  const clock = manualJobClock(START);
  const ids = sequentialEventIdSource();
  return {
    clock,
    ids,
    limits,
    outbox: inMemoryOutbox({ clock }),
    publisher: recordingPublisher(),
    ledger: inMemoryConsumerLedger({ clock }),
    contextA: await mintContext(WORKSPACE_A),
    contextB: await mintContext(WORKSPACE_B),
    event: (context, overrides = {}) => buildEvent({ clock, ids }, context, { ...SPEC, ...overrides }),
  };
}

export const LEAK_MARKER = 'zz-text-from-a-thrown-value';

// A thrown value whose message, name and stack all carry the marker.
export class LeakingError extends Error {
  constructor() {
    super(LEAK_MARKER);
    this.name = `${LEAK_MARKER}-name`;
    this.stack = `${LEAK_MARKER}-stack`;
  }
}
