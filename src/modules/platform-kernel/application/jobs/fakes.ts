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
  type LeasedDecision,
} from '../../domain/jobs/job-decisions';
import type { JobLimits } from '../../domain/jobs/job-limits';
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

  const enqueueNow = (request: EnqueueRequest): EnqueueResult => {
    // Only a context the resolver minted: a copy, a JSON round trip or a hand-built record is refused.
    if (!isMintedTenantContext(request.context)) throw new TypeError('job store: the tenant context was not minted by the resolver');
    const context = tenantContextRecordOf(request.context);
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

  const leasedAct = <D extends LeasedDecision | FailureDecision>(lease: JobLease, act: (record: JobRecord) => D): D | typeof LEASE_LOST => {
    const record = leased(lease);
    if (record === undefined) return LEASE_LOST;
    const decision = act(record);
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
    heartbeat: (lease, progress) => settle(() => leasedAct(lease, (record) => heartbeat(record, lease, clock.now(), limits, progress))),
    complete: (lease, resultRef) => settle(() => leasedAct(lease, (record) => complete(record, lease, clock.now(), resultRef))),
    fail: (lease, error) => settle(() => leasedAct(lease, (record) => fail(record, lease, clock.now(), error, limits))),
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
