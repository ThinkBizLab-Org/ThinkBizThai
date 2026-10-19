import type { FailureDecision, Instant, JobLease, JobProgress, LeasedDecision } from '../../domain/jobs/job-decisions';
import type { JobRecord } from '../../domain/jobs/job-record';
import type { StableError } from '../../domain/stable-error';
import type { TenantScope } from '../../domain/tenant-context';
import type { TenantContext } from '../tenant-context';

// The ports the job worker depends on. Their adapters (a JobStore over app.jobs, the dispatcher's
// clock) are the provider/database increment (manifest scope.exclude); until then
// application/jobs/fakes.ts implements them in memory with synthetic data.

// The worker's clock. `now` is the instant every decision is taken at; `waitUntil` resolves once
// the clock has reached the instant (at once when it already has), which is how the worker bounds a
// handler by its timeout without reading a real timer here.
export interface JobClock {
  now(): Instant;
  waitUntil(instant: Instant): Promise<void>;
}

// What a producer asks for. The tenant context is one the resolver minted (isMintedTenantContext):
// a job carries the context of the request that enqueued it, never one built by hand, so its scope
// is the scope the directory admitted.
export interface EnqueueRequest {
  readonly context: TenantContext;
  readonly job_type: string;
  readonly job_version: number;
  readonly priority: number;
  readonly available_at?: Instant;
  readonly max_attempts: number;
  readonly timeout_seconds: number;
  readonly dedupe_key: string;
  readonly input_ref: string;
  readonly progress_stage: string;
}

// `created: false` when a job with the same dedupe_key already exists in the same workspace: that
// job is returned and none is created (050's jobs_dedupe_key_unique, (workspace_id, dedupe_key)).
export interface EnqueueResult {
  readonly created: boolean;
  readonly job: JobRecord;
}

export interface ClaimedJob {
  readonly record: JobRecord;
  readonly lease: JobLease;
  // The instant the claim was granted at; the handler's time budget runs from it.
  readonly claimed_at: Instant;
}

// The job store. Every method is atomic with respect to every other: two claims racing for one job
// grant at most one lease. A lease (job id, workspace id, owner, attempt) is the fence for
// heartbeat, complete and fail, so a worker whose job was reclaimed is refused (`lease_lost`).
// Lookups are by workspace AND job id: a job is never found, changed or cancelled from another
// workspace's scope.
export interface JobStorePort {
  enqueue(request: EnqueueRequest): Promise<EnqueueResult>;
  // The next claimable job, leased to `leaseOwner`, or null when none is claimable now.
  claim(leaseOwner: string): Promise<ClaimedJob | null>;
  heartbeat(lease: JobLease, progress?: JobProgress): Promise<LeasedDecision>;
  complete(lease: JobLease, resultRef: string): Promise<LeasedDecision>;
  fail(lease: JobLease, error: StableError): Promise<FailureDecision>;
  // The job after the request, or null when the scope's workspace holds no such job.
  requestCancel(scope: TenantScope, jobId: string): Promise<JobRecord | null>;
  get(scope: TenantScope, jobId: string): Promise<JobRecord | null>;
}
