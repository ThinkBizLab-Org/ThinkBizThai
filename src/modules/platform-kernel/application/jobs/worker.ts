import { addSeconds } from '../../domain/jobs/job-decisions';
import { JOB_HANDLER_FAILED, JOB_TIMEOUT, JOB_TYPE_UNKNOWN } from '../../domain/jobs/job-errors';
import { isObject } from '../../domain/json-shape';
import { isPrivateReference } from '../../domain/private-reference';
import { mintedDefinitionOf, stableError, type StableError, type StableErrorDefinition } from '../../domain/stable-error';
import type { TenantContextRecord } from '../../domain/tenant-context';
import type { ClaimedJob, JobClock, JobStorePort } from './job-store-port';

// One worker step: claim the next job, run its handler within the job's timeout_seconds, and record
// the outcome through the store. The dispatcher that calls it in rounds, under a per-round budget,
// is the provider increment (manifest scope.exclude; D6).
//
// - A handler is looked up as an OWN property of the table by job_type; none is JOB_TYPE_UNKNOWN.
// - A handler sees the job's own tenant context, input_ref, attempt and dedupe_key, and nothing of
//   any other job. It should be idempotent by its dedupe_key: a crash after its effect and before
//   `complete` leads to a reclaim and a second run (at-least-once).
// - The time budget runs from the claim: once the clock reaches claimed_at + timeout_seconds the
//   attempt is JOB_TIMEOUT, and a result the handler returns later is discarded.
// - A handler that throws or rejects, or returns anything but an outcome (a failure whose error
//   platform-kernel did not mint, a result_ref outside the private-reference rule), is
//   JOB_HANDLER_FAILED. Nothing of what it threw or returned is kept: the store records the code of a
//   definition written in code, and the report carries ids and codes only.

export interface JobRunInput {
  readonly job_id: string;
  readonly job_type: string;
  readonly job_version: number;
  readonly tenant_context: TenantContextRecord;
  readonly input_ref: string;
  readonly attempt: number;
  readonly dedupe_key: string;
}

export type JobHandlerOutcome =
  | { readonly ok: true; readonly result_ref: string }
  | { readonly ok: false; readonly error: StableError };

// A1-301-I2: `signal` is aborted when the worker gives up on the attempt at the job's timeout (the
// moment it records JOB_TIMEOUT and releases the lease), so a handler that listens can stop work a
// reclaiming worker may repeat. It is advice, not a fence: delivery stays AT LEAST ONCE, a handler
// that ignores it may still overlap a later attempt, and it must stay idempotent by its dedupe_key.
// The abort's reason is the platform's own AbortError, carrying nothing from the job; a listener
// must not throw.
export type JobHandler = (job: JobRunInput, signal: AbortSignal) => Promise<JobHandlerOutcome>;

export type JobHandlers = { readonly [jobType: string]: JobHandler };

export interface WorkerDependencies {
  readonly store: JobStorePort;
  readonly clock: JobClock;
  readonly handlers: JobHandlers;
  readonly leaseOwner: string;
}

// What one step did, by ids and codes only. `lease_lost`: the lease expired or the job was claimed
// again before the outcome could be recorded, so nothing was recorded by this worker.
export type WorkReport =
  | { readonly kind: 'idle' }
  | { readonly kind: 'completed'; readonly job_id: string; readonly attempt: number }
  | { readonly kind: 'retry' | 'dead_letter'; readonly job_id: string; readonly attempt: number; readonly code: string }
  | { readonly kind: 'lease_lost'; readonly job_id: string; readonly attempt: number };

type Attempt =
  | { readonly kind: 'result'; readonly result_ref: string }
  | { readonly kind: 'failure'; readonly definition: StableErrorDefinition };

const failure = (definition: StableErrorDefinition): Attempt => ({ kind: 'failure', definition });

// The handler's settled value, read once per property, as an outcome or a failure.
function readOutcome(value: unknown): Attempt {
  try {
    if (!isObject(value) || !Object.hasOwn(value, 'ok')) return failure(JOB_HANDLER_FAILED);
    const ok = value.ok;
    if (ok === true) {
      const resultRef = Object.hasOwn(value, 'result_ref') ? value.result_ref : undefined;
      return isPrivateReference(resultRef) ? { kind: 'result', result_ref: resultRef } : failure(JOB_HANDLER_FAILED);
    }
    if (ok === false) {
      const error = Object.hasOwn(value, 'error') ? value.error : undefined;
      const definition = mintedDefinitionOf(error);
      return definition === undefined ? failure(JOB_HANDLER_FAILED) : failure(definition);
    }
    return failure(JOB_HANDLER_FAILED);
  } catch {
    // A getter that throws, a revoked proxy: nothing of it is kept.
    return failure(JOB_HANDLER_FAILED);
  }
}

const TIMED_OUT = Symbol('timed out');

async function attempt(dependencies: WorkerDependencies, claimed: ClaimedJob): Promise<Attempt> {
  const { record } = claimed;
  if (!Object.hasOwn(dependencies.handlers, record.job_type)) return failure(JOB_TYPE_UNKNOWN);
  const handler = dependencies.handlers[record.job_type];
  if (typeof handler !== 'function') return failure(JOB_TYPE_UNKNOWN);
  const deadline = addSeconds(claimed.claimed_at, record.timeout_seconds);
  const input: JobRunInput = Object.freeze({
    job_id: record.job_id,
    job_type: record.job_type,
    job_version: record.job_version,
    tenant_context: record.tenant_context,
    input_ref: record.input_ref,
    attempt: record.attempt,
    dedupe_key: record.dedupe_key,
  });
  const abort = new AbortController();
  let running: Promise<unknown>;
  try {
    running = Promise.resolve(handler(input, abort.signal));
  } catch {
    return failure(JOB_HANDLER_FAILED);
  }
  // A late rejection is observed here, so it is never an unhandled rejection, and dropped.
  running.catch(() => undefined);
  let settled: unknown;
  try {
    settled = await Promise.race([running, dependencies.clock.waitUntil(deadline).then(() => TIMED_OUT)]);
  } catch {
    return failure(JOB_HANDLER_FAILED);
  }
  // A result that arrives at or after the deadline is a timeout too: the budget is the clock's, not
  // the order the two promises happened to settle in.
  if (settled === TIMED_OUT || dependencies.clock.now() >= deadline) {
    abort.abort();
    return failure(JOB_TIMEOUT);
  }
  return readOutcome(settled);
}

export async function workOnce(dependencies: WorkerDependencies): Promise<WorkReport> {
  const claimed = await dependencies.store.claim(dependencies.leaseOwner);
  if (claimed === null) return { kind: 'idle' };
  const { job_id: jobId, attempt: attemptNumber } = claimed.lease;
  const outcome = await attempt(dependencies, claimed);
  if (outcome.kind === 'result') {
    const done = await dependencies.store.complete(claimed.lease, outcome.result_ref);
    return done.ok ? { kind: 'completed', job_id: jobId, attempt: attemptNumber } : { kind: 'lease_lost', job_id: jobId, attempt: attemptNumber };
  }
  const error = stableError(outcome.definition, claimed.record.tenant_context.correlation_id);
  const failed = await dependencies.store.fail(claimed.lease, error);
  if (!failed.ok) return { kind: 'lease_lost', job_id: jobId, attempt: attemptNumber };
  return { kind: failed.outcome, job_id: jobId, attempt: attemptNumber, code: error.code };
}
