import { isInteger, isStringWithin } from '../json-shape';
import { isPrivateReference } from '../private-reference';
import { mintedDefinitionOf, type StableError } from '../stable-error';
import type { TenantContextRecord } from '../tenant-context';
import { checkJobLimits, type JobLimits } from './job-limits';
import { checkJobRecord, isProgressPercent, type JobRecord } from './job-record';

// The job decisions: pure functions of a CTR-JOB-001 record, a supplied instant and the limits. No
// clock, no randomness, no I/O. Each reads ONLY the record's timestamps and counters, because
// app.jobs has no status column and CTR-JOB-001's freeze_boundary reserves "lifecycle state names
// and transition policy" to owner review (050_async_kernel.sql's header):
//
//   available_at          when it may next run
//   lease_owner /
//   lease_expires_at      who holds it, and until when
//   attempt / max_attempts the retry budget (attempt counts claims granted)
//   cancel_requested_at   a cancellation was asked for
//   result_ref            it produced a result
//   last_error_code       the last attempt failed, and how
//
// A0'S INFERENCE, NEVER PERSISTED: the refusal reasons below ('completed', 'cancelled', 'leased',
// 'exhausted', 'not_due', 'lease_lost') and the outcomes ('retry', 'dead_letter') are internal names
// for a reader of this code. None is written to a record; no function here writes a status value.
// "Dead-lettered" is a predicate over the counters (isDeadLettered), not a field.
//
// A record that does not satisfy CTR-JOB-001, an instant that is not a whole number of
// milliseconds, or limits outside checkJobLimits is a programming fault: a TypeError with a constant
// message, carrying nothing from the input.

declare const INSTANT_BRAND: unique symbol;

// Milliseconds since the epoch, as a supplied clock reads them. Branded so a count of seconds, or a
// raw Date.now(), is not passed where an instant is meant.
export type Instant = number & { readonly [INSTANT_BRAND]: true };

export function instantFromMilliseconds(milliseconds: number): Instant {
  if (!Number.isSafeInteger(milliseconds)) throw new TypeError('job decisions: an instant is a whole number of milliseconds');
  return milliseconds as Instant;
}

// A CTR-JOB-001 date-time as an instant (Date.parse is a pure parse; it reads no clock).
export const instantOf = (timestamp: string): Instant => instantFromMilliseconds(Date.parse(timestamp));

// An instant as the RFC 3339 UTC timestamp a record stores.
export const timestampOf = (instant: Instant): string => new Date(instant).toISOString();

export const addSeconds = (instant: Instant, seconds: number): Instant => instantFromMilliseconds(instant + seconds * 1000);

// The fence a claim hands its worker. Every later act on the job (heartbeat, complete, fail) must
// present it, and is refused once the job has been claimed again: attempt increases with every
// claim, so a worker restarted under the same lease_owner still holds a different lease.
export interface JobLease {
  readonly job_id: string;
  readonly workspace_id: string;
  readonly lease_owner: string;
  readonly attempt: number;
}

export type ClaimRefusal = 'completed' | 'cancelled' | 'leased' | 'exhausted' | 'not_due';

function requireRecord(record: unknown): asserts record is JobRecord {
  if (!checkJobRecord(record)) throw new TypeError('job decisions: the record does not satisfy CTR-JOB-001');
}

function requireInstant(now: number): void {
  if (!Number.isSafeInteger(now)) throw new TypeError('job decisions: an instant is a whole number of milliseconds');
}

function requireLimits(limits: JobLimits): void {
  if (!checkJobLimits(limits)) throw new TypeError('job decisions: the limits are not whole positive seconds');
}

// A lease is a pair or nothing (050's jobs_lease_is_a_pair). Held: present and not yet expired.
export function isLeaseHeld(record: JobRecord, now: Instant): boolean {
  requireRecord(record);
  requireInstant(now);
  return record.lease_owner !== undefined && record.lease_expires_at !== undefined && instantOf(record.lease_expires_at) > now;
}

// Expired: present, and its expiry has been reached. An expired lease no longer protects the job.
export function isLeaseExpired(record: JobRecord, now: Instant): boolean {
  requireRecord(record);
  requireInstant(now);
  return record.lease_expires_at !== undefined && instantOf(record.lease_expires_at) <= now;
}

// Why a claim at `now` is refused, or null when the job is claimable. In this order: a result was
// produced; a cancellation was asked for; another worker holds an unexpired lease; the attempt
// budget is spent; available_at has not been reached.
export function claimRefusal(record: JobRecord, now: Instant): ClaimRefusal | null {
  requireRecord(record);
  requireInstant(now);
  if (record.result_ref !== undefined) return 'completed';
  if (record.cancel_requested_at !== undefined) return 'cancelled';
  if (isLeaseHeld(record, now)) return 'leased';
  if (record.attempt >= record.max_attempts) return 'exhausted';
  if (instantOf(record.available_at) > now) return 'not_due';
  return null;
}

export const isClaimable = (record: JobRecord, now: Instant): boolean => claimRefusal(record, now) === null;

// Dead-lettered, as a query over the counters: no result, no cancellation, the attempt budget spent
// and no live lease (the last attempt failed, timed out or its worker never came back).
export function isDeadLettered(record: JobRecord, now: Instant): boolean {
  requireRecord(record);
  return record.result_ref === undefined
    && record.cancel_requested_at === undefined
    && record.attempt >= record.max_attempts
    && !isLeaseHeld(record, now);
}

// The bounded back-off after the `failedAttempt`-th attempt failed:
// min(max, base * factor^(failedAttempt - 1)), computed without overflow.
export function retryDelaySeconds(failedAttempt: number, limits: JobLimits): number {
  requireLimits(limits);
  if (!Number.isSafeInteger(failedAttempt) || failedAttempt < 1) throw new TypeError('job decisions: a failed attempt is counted from 1');
  let delay = limits.retryBaseDelaySeconds;
  for (let step = 1; step < failedAttempt; step += 1) {
    if (delay >= limits.retryMaxDelaySeconds) break;
    delay *= limits.retryBackoffFactor;
  }
  return Math.min(delay, limits.retryMaxDelaySeconds);
}

// When the next attempt may run after the `failedAttempt`-th failed at `now`.
export const nextRetryAt = (now: Instant, failedAttempt: number, limits: JobLimits): Instant =>
  addSeconds(now, retryDelaySeconds(failedAttempt, limits));

// The lease's expiry for a claim at `now`: the job's own timeout plus the grace.
export const leaseExpiryFor = (record: JobRecord, now: Instant, limits: JobLimits): Instant => {
  requireLimits(limits);
  return addSeconds(now, record.timeout_seconds + limits.leaseGraceSeconds);
};

function withoutLease(record: JobRecord): JobRecord {
  const { lease_owner: _owner, lease_expires_at: _expiry, ...rest } = record;
  return rest;
}

const freezeRecord = (record: JobRecord): JobRecord => {
  if (!checkJobRecord(record)) throw new TypeError('job decisions: a decision produced a record outside CTR-JOB-001');
  const context = record.tenant_context;
  return Object.freeze({ ...record, tenant_context: Object.freeze({ ...context, actor: Object.freeze({ kind: context.actor.kind, id: context.actor.id }) }) });
};

// What a new job is given by whoever enqueues it. The rest of the record is fixed by the decision:
// attempt 0, progress 0, no lease, no cancellation, no result, no error.
export interface NewJob {
  readonly job_id: string;
  readonly job_type: string;
  readonly job_version: number;
  readonly tenant_context: TenantContextRecord;
  readonly priority: number;
  // When it may first run; absent or earlier than `now` means now.
  readonly available_at?: Instant;
  readonly max_attempts: number;
  readonly timeout_seconds: number;
  readonly dedupe_key: string;
  readonly input_ref: string;
  readonly progress_stage: string;
}

// The record a new job starts as, checked against CTR-JOB-001. A field outside the contract is a
// programming fault (TypeError, constant message).
export function newJob(job: NewJob, now: Instant): JobRecord {
  requireInstant(now);
  if (job.available_at !== undefined && !isInteger(job.available_at)) throw new TypeError('job decisions: an instant is a whole number of milliseconds');
  const availableAt = job.available_at !== undefined && job.available_at > now ? job.available_at : now;
  const record: JobRecord = {
    job_id: job.job_id,
    job_type: job.job_type,
    job_version: job.job_version,
    tenant_context: job.tenant_context,
    priority: job.priority,
    available_at: timestampOf(availableAt),
    attempt: 0,
    max_attempts: job.max_attempts,
    timeout_seconds: job.timeout_seconds,
    dedupe_key: job.dedupe_key,
    input_ref: job.input_ref,
    progress_percent: 0,
    progress_stage: job.progress_stage,
  };
  if (!checkJobRecord(record)) throw new TypeError('job decisions: the new job does not satisfy CTR-JOB-001');
  return freezeRecord(record);
}

export type ClaimDecision =
  | { readonly ok: true; readonly record: JobRecord; readonly lease: JobLease }
  | { readonly ok: false; readonly reason: ClaimRefusal };

// A claim at `now` by `leaseOwner`: grants a lease (owner and expiry) and counts the attempt.
export function claim(record: JobRecord, leaseOwner: string, now: Instant, limits: JobLimits): ClaimDecision {
  if (!isStringWithin(leaseOwner, 1)) throw new TypeError('job decisions: a lease owner is a non-empty string');
  const refusal = claimRefusal(record, now);
  if (refusal !== null) return { ok: false, reason: refusal };
  const claimed = freezeRecord({
    ...withoutLease(record),
    attempt: record.attempt + 1,
    lease_owner: leaseOwner,
    lease_expires_at: timestampOf(leaseExpiryFor(record, now, limits)),
  });
  const lease: JobLease = Object.freeze({
    job_id: claimed.job_id,
    workspace_id: claimed.tenant_context.workspace_id,
    lease_owner: leaseOwner,
    attempt: claimed.attempt,
  });
  return { ok: true, record: claimed, lease };
}

// The lease is this record's current, unexpired lease, in the record's own workspace.
export function holdsLease(record: JobRecord, lease: JobLease, now: Instant): boolean {
  return isLeaseHeld(record, now)
    && record.job_id === lease.job_id
    && record.tenant_context.workspace_id === lease.workspace_id
    && record.lease_owner === lease.lease_owner
    && record.attempt === lease.attempt;
}

export type LeasedDecision =
  | { readonly ok: true; readonly record: JobRecord }
  | { readonly ok: false; readonly reason: 'lease_lost' };

export interface JobProgress {
  readonly percent: number;
  readonly stage: string;
}

const LEASE_LOST = Object.freeze({ ok: false, reason: 'lease_lost' } as const);

// A heartbeat moves the lease's expiry to now + heartbeatLeaseSeconds (never earlier than it was)
// and may record progress. Refused once the lease is lost (expired, or the job claimed again).
export function heartbeat(record: JobRecord, lease: JobLease, now: Instant, limits: JobLimits, progress?: JobProgress): LeasedDecision {
  requireLimits(limits);
  if (progress !== undefined && !(isProgressPercent(progress.percent) && isStringWithin(progress.stage, 1))) {
    throw new TypeError('job decisions: progress is a percent from 0 to 100 and a non-empty stage');
  }
  if (!holdsLease(record, lease, now)) return LEASE_LOST;
  const extended = addSeconds(now, limits.heartbeatLeaseSeconds);
  const current = instantOf(record.lease_expires_at ?? timestampOf(now));
  return {
    ok: true,
    record: freezeRecord({
      ...record,
      lease_expires_at: timestampOf(extended > current ? extended : current),
      ...(progress === undefined ? {} : { progress_percent: progress.percent, progress_stage: progress.stage }),
    }),
  };
}

// Completion: the result reference is recorded and the lease released. Refused once the lease is
// lost, so a worker whose job was reclaimed cannot overwrite the reclaiming worker's outcome.
export function complete(record: JobRecord, lease: JobLease, now: Instant, resultRef: string): LeasedDecision {
  if (!isPrivateReference(resultRef)) throw new TypeError('job decisions: a result reference follows the private-reference rule');
  if (!holdsLease(record, lease, now)) return LEASE_LOST;
  return { ok: true, record: freezeRecord({ ...withoutLease(record), result_ref: resultRef }) };
}

export type FailureDecision =
  | { readonly ok: true; readonly record: JobRecord; readonly outcome: 'retry' | 'dead_letter' }
  | { readonly ok: false; readonly reason: 'lease_lost' };

// A failed attempt: the error's code is recorded (last_error_code ONLY; CTR-JOB-001 stores nothing
// else of an error) and the lease released. Before max_attempts the job becomes available again
// after the bounded back-off; at max_attempts it is dead-lettered (isDeadLettered holds) and
// available_at is left as it was. The error must be one platform-kernel minted from a definition
// (mintedDefinitionOf), so the code is a constant written in code, never text from a thrown value.
// A0's inference: every failure retries while budget remains, whatever the error's `retryable`;
// spending the budget early for a non-retryable error would mean writing an attempt the job never
// made. Whether a non-retryable error should dead-letter at once is the contract owner's
// transition policy (CTR-JOB-001 freeze_boundary).
export function fail(record: JobRecord, lease: JobLease, now: Instant, error: StableError, limits: JobLimits): FailureDecision {
  requireLimits(limits);
  if (mintedDefinitionOf(error) === undefined) throw new TypeError('job decisions: a failure is a stable error platform-kernel minted');
  if (!holdsLease(record, lease, now)) return LEASE_LOST;
  const released = { ...withoutLease(record), last_error_code: error.code };
  if (record.attempt < record.max_attempts) {
    return { ok: true, outcome: 'retry', record: freezeRecord({ ...released, available_at: timestampOf(nextRetryAt(now, record.attempt, limits)) }) };
  }
  return { ok: true, outcome: 'dead_letter', record: freezeRecord(released) };
}

// A cancellation request: recorded once (a second request keeps the first instant). It stops every
// further claim; a lease already held runs to its own end.
export function requestCancel(record: JobRecord, now: Instant): JobRecord {
  requireRecord(record);
  requireInstant(now);
  if (record.cancel_requested_at !== undefined) return record;
  return freezeRecord({ ...record, cancel_requested_at: timestampOf(now) });
}
