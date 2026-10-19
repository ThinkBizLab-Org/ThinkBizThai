import {
  claim,
  complete,
  fail,
  heartbeat,
  instantFromMilliseconds,
  instantOf,
  isClaimable,
  newJob,
  requestCancel,
  type FailureDecision,
  type Instant,
  type JobLease,
  type JobProgress,
  type LeasedDecision,
} from '../../domain/jobs/job-decisions';
import { JOB_ENQUEUE_OVER_CAP } from '../../domain/jobs/job-errors';
import { withinEnqueueCaps, type JobLimits } from '../../domain/jobs/job-limits';
import { stableError } from '../../domain/stable-error';
import type { JobRecord } from '../../domain/jobs/job-record';
import type { TenantScope } from '../../domain/tenant-context';
import { isMintedTenantContext, tenantContextRecordOf } from '../tenant-context';
import type { ClaimedJob, EnqueueRequest, EnqueueResult, JobClock, JobStorePort } from './job-store-port';

// In-memory fakes of the job ports, for consumer tests. Synthetic ids only; no provider, no I/O, no
// real clock, no randomness. The fake store takes every decision through domain/jobs/job-decisions.ts,
// so what it stores is what the decisions produce.

// A clock that moves only when a test moves it. `waitUntil` resolves once `advance` or `set` reaches
// the instant, and at once when the clock is already there.
export interface ManualJobClock extends JobClock {
  advance(milliseconds: number): void;
  set(instant: Instant): void;
}

export function manualJobClock(start: string): ManualJobClock {
  let current = instantOf(start);
  const waiters: { readonly until: Instant; readonly resolve: () => void }[] = [];
  const release = (): void => {
    for (let index = waiters.length - 1; index >= 0; index -= 1) {
      const waiter = waiters[index];
      if (waiter !== undefined && waiter.until <= current) {
        waiters.splice(index, 1);
        waiter.resolve();
      }
    }
  };
  return {
    now: () => current,
    waitUntil(instant) {
      if (instant <= current) return Promise.resolve();
      return new Promise((resolve) => { waiters.push({ until: instant, resolve }); });
    },
    advance(milliseconds) {
      current = instantFromMilliseconds(current + milliseconds);
      release();
    },
    set(instant) {
      current = instantFromMilliseconds(instant);
      release();
    },
  };
}

// A deterministic job id source: `<prefix>_000001`, `<prefix>_000002`, ...
export interface JobIdSource {
  mint(): string;
}

export function sequentialJobIdSource(prefix = 'job_synthetic'): JobIdSource {
  let next = 0;
  return {
    mint() {
      next += 1;
      return `${prefix}_${String(next).padStart(6, '0')}`;
    },
  };
}

export interface InMemoryJobStore extends JobStorePort {
  // Every stored record, in enqueue order, for tests to read.
  records(): readonly JobRecord[];
}

const LEASE_LOST = Object.freeze({ ok: false, reason: 'lease_lost' } as const);

// A1-302-1: a caller's object is read once, each named property into a frozen copy, before any
// decision reads it. A request that is not an object, or whose read throws, is a programming fault
// (TypeError, constant message, nothing of what was thrown kept).
const ENQUEUE_KEYS = ['context', 'job_type', 'job_version', 'priority', 'available_at', 'max_attempts', 'timeout_seconds', 'dedupe_key', 'input_ref', 'progress_stage'] as const;

function requestOnce(request: EnqueueRequest): EnqueueRequest {
  let copy: Record<string, unknown>;
  try {
    if (typeof request !== 'object' || request === null) throw new TypeError();
    const source: Readonly<Record<string, unknown>> = request as never;
    copy = {};
    for (const key of ENQUEUE_KEYS) copy[key] = source[key];
  } catch {
    throw new TypeError('job store: the enqueue request is not a readable object');
  }
  return Object.freeze(copy) as unknown as EnqueueRequest;
}

// A lease that is not an object, or whose read throws, holds no job (lease_lost).
function leaseOnce(lease: JobLease): JobLease | null {
  try {
    if (typeof lease !== 'object' || lease === null) return null;
    return Object.freeze({ job_id: lease.job_id, workspace_id: lease.workspace_id, lease_owner: lease.lease_owner, attempt: lease.attempt });
  } catch {
    return null;
  }
}

// Progress is read once; the decision checks the copy and records the copy.
function progressOnce(progress: JobProgress | undefined): JobProgress | undefined {
  if (progress === undefined) return undefined;
  try {
    return Object.freeze({ percent: progress.percent, stage: progress.stage });
  } catch {
    throw new TypeError('job decisions: progress is a percent from 0 to 100 and a non-empty stage');
  }
}

// A0's inference, D6: the claim order. CTR-JOB-001 names `priority` as an integer and says nothing
// of its direction or of ties, so the fake takes the higher priority first, then the earlier
// available_at, then the earlier enqueue. Nothing in the tests depends on more than "one claim, one
// job"; the adapter's ORDER BY is set with the other D6 limits.
const claimOrder = (a: JobRecord, b: JobRecord): number =>
  b.priority - a.priority || instantOf(a.available_at) - instantOf(b.available_at);

export function inMemoryJobStore(dependencies: { readonly clock: JobClock; readonly limits: JobLimits; readonly ids?: JobIdSource }): InMemoryJobStore {
  const { clock, limits } = dependencies;
  const ids = dependencies.ids ?? sequentialJobIdSource();
  // Keyed by job id (app.jobs.id is a uuid primary key, unique across workspaces); every lookup
  // also checks the workspace.
  const jobs = new Map<string, JobRecord>();

  const inScope = (record: JobRecord | undefined, workspaceId: string): record is JobRecord =>
    record !== undefined && record.tenant_context.workspace_id === workspaceId;

  const leased = (lease: JobLease): JobRecord | undefined => {
    const record = jobs.get(lease.job_id);
    return inScope(record, lease.workspace_id) ? record : undefined;
  };

  const enqueueNow = (received: EnqueueRequest): EnqueueResult => {
    // A1-302-1 (applied here too): the request is read once, into a frozen copy, and every decision
    // (the minted context, the dedupe lookup, the new record) reads that copy only, so a getter
    // cannot pass the dedupe lookup with one key and store another.
    const request = requestOnce(received);
    // Only a context the resolver minted: a copy, a JSON round trip or a hand-built record is refused.
    if (!isMintedTenantContext(request.context)) throw new TypeError('job store: the tenant context was not minted by the resolver');
    const context = tenantContextRecordOf(request.context);
    // A1-301-I3: above the kernel's D6-provisional caps (kernel policy; CTR-JOB-001 states no
    // maximum) nothing is created and enqueue rejects with a minted stable error. Values that are not
    // whole numbers fall through to newJob's contract check, as before.
    if (typeof request.max_attempts === 'number' && typeof request.timeout_seconds === 'number'
      && !withinEnqueueCaps(request.max_attempts, request.timeout_seconds)) {
      throw stableError(JOB_ENQUEUE_OVER_CAP, context.correlation_id);
    }
    // A1-301-I5: dedupe is per (workspace, dedupe_key), whatever the job_type or the enqueuing actor
    // (050's jobs_dedupe_key_unique; CTR-JOB-001 states no uniqueness). A hit returns the existing
    // job; producers namespace their keys by job type (`<job_type>:<id>`).
    for (const existing of jobs.values()) {
      if (existing.tenant_context.workspace_id === context.workspace_id && existing.dedupe_key === request.dedupe_key) {
        return { created: false, job: existing };
      }
    }
    const jobId = ids.mint();
    // A1-301-I1: app.jobs.id is the primary key, so an id already stored (from any workspace) is
    // refused, as the adapter's insert would be, and the stored job is left as it was.
    if (jobs.has(jobId)) throw new TypeError('job store: a job with this job_id already exists');
    const record = newJob({
      job_id: jobId,
      job_type: request.job_type,
      job_version: request.job_version,
      tenant_context: context,
      priority: request.priority,
      ...(request.available_at === undefined ? {} : { available_at: request.available_at }),
      max_attempts: request.max_attempts,
      timeout_seconds: request.timeout_seconds,
      dedupe_key: request.dedupe_key,
      input_ref: request.input_ref,
      progress_stage: request.progress_stage,
    }, clock.now());
    jobs.set(record.job_id, record);
    return { created: true, job: record };
  };

  const claimNow = (leaseOwner: string): ClaimedJob | null => {
    const now = clock.now();
    const next = [...jobs.values()].filter((record) => isClaimable(record, now)).sort(claimOrder)[0];
    if (next === undefined) return null;
    const decision = claim(next, leaseOwner, now, limits);
    if (!decision.ok) return null;
    jobs.set(decision.record.job_id, decision.record);
    return { record: decision.record, lease: decision.lease, claimed_at: now };
  };

  const leasedAct = <D extends LeasedDecision | FailureDecision>(received: JobLease, act: (lease: JobLease, record: JobRecord) => D): D | typeof LEASE_LOST => {
    // The lease is read once (A1-302-1); the lookup and the decision's fence read that copy only.
    const lease = leaseOnce(received);
    if (lease === null) return LEASE_LOST;
    const record = leased(lease);
    if (record === undefined) return LEASE_LOST;
    const decision = act(lease, record);
    if (decision.ok) jobs.set(decision.record.job_id, decision.record);
    return decision;
  };

  // Each method does its whole read-decide-write before it returns, so no other call interleaves:
  // the in-memory equivalent of the adapter's single-statement claim (FOR UPDATE SKIP LOCKED).
  const settle = <T>(work: () => T): Promise<T> => {
    try {
      return Promise.resolve(work());
    } catch (error) {
      return Promise.reject(error);
    }
  };

  return {
    records: () => [...jobs.values()],
    enqueue: (request) => settle(() => enqueueNow(request)),
    claim: (leaseOwner) => settle(() => claimNow(leaseOwner)),
    heartbeat: (received, progress) => settle(() => leasedAct(received, (lease, record) => heartbeat(record, lease, clock.now(), limits, progressOnce(progress)))),
    complete: (received, resultRef) => settle(() => leasedAct(received, (lease, record) => complete(record, lease, clock.now(), resultRef))),
    fail: (received, error) => settle(() => leasedAct(received, (lease, record) => fail(record, lease, clock.now(), error, limits))),
    requestCancel: (scope: TenantScope, jobId: string) => settle(() => {
      const record = jobs.get(jobId);
      if (!inScope(record, scope.workspace_id)) return null;
      const cancelled = requestCancel(record, clock.now());
      jobs.set(jobId, cancelled);
      return cancelled;
    }),
    get: (scope: TenantScope, jobId: string) => settle(() => {
      const record = jobs.get(jobId);
      return inScope(record, scope.workspace_id) ? record : null;
    }),
  };
}
