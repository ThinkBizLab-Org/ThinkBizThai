// The job decisions as pure functions of a record, a supplied instant and the limits (manifest
// acceptance criterion 3): claimable only when available_at has passed, not cancelled and no
// unexpired lease; a claim sets the lease and counts the attempt; a failure before max_attempts
// retries after a bounded back-off and at max_attempts dead-letters; an expired lease is
// reclaimable; no decision writes a status value.
import { describe, expect, it } from 'vitest';

import { PLATFORM_INTERNAL } from '../platform-errors';
import { stableError, type StableError } from '../stable-error';
import type { TenantContextRecord } from '../tenant-context';
import {
  addSeconds,
  claim,
  claimRefusal,
  complete,
  fail,
  heartbeat,
  holdsLease,
  instantOf,
  isClaimable,
  isDeadLettered,
  isLeaseExpired,
  isLeaseHeld,
  newJob,
  nextRetryAt,
  requestCancel,
  retryDelaySeconds,
  timestampOf,
  type Instant,
  type JobLease,
} from './job-decisions';
import { JOB_TIMEOUT } from './job-errors';
import { D6_PROVISIONAL_JOB_LIMITS, checkJobLimits, type JobLimits } from './job-limits';
import { JOB_KEYS, checkJobRecord, type JobRecord } from './job-record';

const LIMITS = D6_PROVISIONAL_JOB_LIMITS;
const T0 = instantOf('2026-10-19T00:00:00.000Z');
const at = (seconds: number): Instant => addSeconds(T0, seconds);

const CONTEXT: TenantContextRecord = {
  workspace_id: 'ws_synthetic_0001',
  actor: { kind: 'system_actor', id: 'research-worker' },
  request_id: 'id_synthetic_000001',
  correlation_id: 'id_synthetic_000002',
  locale: 'th-TH',
  timezone: 'Asia/Bangkok',
};

const job = (overrides: Partial<Parameters<typeof newJob>[0]> = {}): JobRecord => newJob({
  job_id: 'job_synthetic_000001',
  job_type: 'research.run',
  job_version: 1,
  tenant_context: CONTEXT,
  priority: 0,
  max_attempts: 3,
  timeout_seconds: 300,
  dedupe_key: 'research:synthetic-0001',
  input_ref: 'asset:input/synthetic-0001',
  progress_stage: 'jobs.research.queued',
  ...overrides,
}, T0);

const timeout = (): StableError => stableError(JOB_TIMEOUT, CONTEXT.correlation_id);

function claimed(record: JobRecord, owner: string, now: Instant): { record: JobRecord; lease: JobLease } {
  const decision = claim(record, owner, now, LIMITS);
  if (!decision.ok) throw new Error(`expected a claim, got ${decision.reason}`);
  return decision;
}

describe('the D6 provisional limits', () => {
  it('are in one place, frozen and valid', () => {
    expect(Object.isFrozen(LIMITS)).toBe(true);
    expect(checkJobLimits(LIMITS)).toBe(true);
  });

  it('refuse limits that are not whole positive seconds', () => {
    expect(checkJobLimits({ ...LIMITS, leaseGraceSeconds: 0 })).toBe(false);
    expect(checkJobLimits({ ...LIMITS, retryBaseDelaySeconds: 1.5 })).toBe(false);
    expect(checkJobLimits({ ...LIMITS, retryMaxDelaySeconds: LIMITS.retryBaseDelaySeconds - 1 })).toBe(false);
    expect(() => retryDelaySeconds(1, { ...LIMITS, retryBackoffFactor: 0 })).toThrow(TypeError);
  });
});

describe('a new job', () => {
  it('starts at attempt 0 with no lease, available now, and satisfies CTR-JOB-001', () => {
    const record = job();
    expect(checkJobRecord(record)).toBe(true);
    expect(record.attempt).toBe(0);
    expect(record.progress_percent).toBe(0);
    expect(record.available_at).toBe(timestampOf(T0));
    expect(record.lease_owner).toBeUndefined();
    expect(Object.isFrozen(record) && Object.isFrozen(record.tenant_context) && Object.isFrozen(record.tenant_context.actor)).toBe(true);
  });

  it('keeps a later available_at and raises an earlier one to now', () => {
    expect(job({ available_at: at(60) }).available_at).toBe(timestampOf(at(60)));
    expect(job({ available_at: at(-60) }).available_at).toBe(timestampOf(T0));
  });

  it('refuses a field outside the contract with a constant message', () => {
    expect(() => job({ input_ref: 'https://example.invalid/x' })).toThrow('job decisions: the new job does not satisfy CTR-JOB-001');
    expect(() => job({ max_attempts: 0 })).toThrow(TypeError);
  });
});

describe('claimable', () => {
  it('only once available_at has passed', () => {
    const later = job({ available_at: at(60) });
    expect(claimRefusal(later, at(59))).toBe('not_due');
    expect(isClaimable(later, at(60))).toBe(true);
  });

  it('not while another lease is unexpired, and again once it has expired', () => {
    const { record } = claimed(job(), 'worker-1', T0);
    const expiry = instantOf(record.lease_expires_at ?? '');
    expect(expiry).toBe(at(300 + LIMITS.leaseGraceSeconds));
    expect(claimRefusal(record, addSeconds(expiry, -1))).toBe('leased');
    expect(isLeaseHeld(record, addSeconds(expiry, -1))).toBe(true);
    expect(isLeaseExpired(record, expiry)).toBe(true);
    expect(isClaimable(record, expiry)).toBe(true);
  });

  it('not after a cancellation request, even with budget left and no lease', () => {
    const cancelled = requestCancel(job(), T0);
    expect(cancelled.cancel_requested_at).toBe(timestampOf(T0));
    expect(claimRefusal(cancelled, at(1000))).toBe('cancelled');
    expect(requestCancel(cancelled, at(5)).cancel_requested_at).toBe(timestampOf(T0));
  });

  it('not once a result exists', () => {
    const { record, lease } = claimed(job(), 'worker-1', T0);
    const done = complete(record, lease, at(10), 'result:research/synthetic-0001');
    if (!done.ok) throw new Error('expected completion');
    expect(done.record.result_ref).toBe('result:research/synthetic-0001');
    expect(done.record.lease_owner).toBeUndefined();
    expect(claimRefusal(done.record, at(1000))).toBe('completed');
  });
});

describe('a claim', () => {
  it('sets the lease owner and expiry and increments attempt', () => {
    const { record, lease } = claimed(job(), 'worker-1', T0);
    expect(record.attempt).toBe(1);
    expect(record.lease_owner).toBe('worker-1');
    expect(lease).toEqual({ job_id: record.job_id, workspace_id: CONTEXT.workspace_id, lease_owner: 'worker-1', attempt: 1 });
  });

  it('a second claim of the same record is refused (duplicate claim)', () => {
    const { record } = claimed(job(), 'worker-1', T0);
    expect(claim(record, 'worker-2', at(1), LIMITS)).toEqual({ ok: false, reason: 'leased' });
    expect(claim(record, 'worker-1', at(1), LIMITS)).toEqual({ ok: false, reason: 'leased' });
  });

  it('after expiry, the reclaim fences the first lease out even under the same owner (restart)', () => {
    const first = claimed(job(), 'worker-1', T0);
    const reclaimAt = instantOf(first.record.lease_expires_at ?? '');
    const second = claimed(first.record, 'worker-1', reclaimAt);
    expect(second.record.attempt).toBe(2);
    expect(complete(second.record, first.lease, addSeconds(reclaimAt, 1), 'result:x')).toEqual({ ok: false, reason: 'lease_lost' });
    expect(complete(second.record, second.lease, addSeconds(reclaimAt, 1), 'result:x').ok).toBe(true);
  });

  // Q0-301-1: holdsLease's workspace comparison, decided here and not only through the fake's lookup
  // (the adapter may look a job up by id alone).
  it('a lease naming another workspace is lost for heartbeat, complete and fail, and the true one holds', () => {
    const { record, lease } = claimed(job(), 'worker-1', T0);
    const crossed: JobLease = { ...lease, workspace_id: 'ws_synthetic_0002' };
    expect(holdsLease(record, crossed, at(1))).toBe(false);
    expect(heartbeat(record, crossed, at(1), LIMITS)).toEqual({ ok: false, reason: 'lease_lost' });
    expect(complete(record, crossed, at(1), 'result:x')).toEqual({ ok: false, reason: 'lease_lost' });
    expect(fail(record, crossed, at(1), timeout(), LIMITS)).toEqual({ ok: false, reason: 'lease_lost' });
    expect(holdsLease(record, lease, at(1))).toBe(true);
    expect(complete(record, lease, at(1), 'result:x').ok).toBe(true);
  });
});

describe('heartbeat', () => {
  it('extends the lease, never shortens it, and records progress', () => {
    const { record, lease } = claimed(job(), 'worker-1', T0);
    const early = heartbeat(record, lease, at(1), LIMITS, { percent: 40, stage: 'jobs.research.reading' });
    if (!early.ok) throw new Error('expected a heartbeat');
    expect(early.record.lease_expires_at).toBe(record.lease_expires_at);
    expect(early.record.progress_percent).toBe(40);
    const late = heartbeat(early.record, lease, at(320), LIMITS);
    if (!late.ok) throw new Error('expected a heartbeat');
    expect(late.record.lease_expires_at).toBe(timestampOf(at(320 + LIMITS.heartbeatLeaseSeconds)));
  });

  it('is refused once the lease has expired', () => {
    const { record, lease } = claimed(job(), 'worker-1', T0);
    expect(heartbeat(record, lease, at(300 + LIMITS.leaseGraceSeconds), LIMITS)).toEqual({ ok: false, reason: 'lease_lost' });
  });
});

describe('failure, retry and dead-letter', () => {
  it('the back-off is exponential and bounded', () => {
    const limits: JobLimits = { ...LIMITS, retryBaseDelaySeconds: 30, retryBackoffFactor: 2, retryMaxDelaySeconds: 100 };
    expect([1, 2, 3, 4, 50].map((n) => retryDelaySeconds(n, limits))).toEqual([30, 60, 100, 100, 100]);
    expect(retryDelaySeconds(Number.MAX_SAFE_INTEGER, LIMITS)).toBe(LIMITS.retryMaxDelaySeconds);
    expect(nextRetryAt(T0, 1, limits)).toBe(at(30));
    expect(() => retryDelaySeconds(0, limits)).toThrow(TypeError);
  });

  it('before max_attempts schedules a retry; at max_attempts dead-letters', () => {
    let record = job({ max_attempts: 2 });
    const first = claimed(record, 'worker-1', T0);
    const retry = fail(first.record, first.lease, at(10), timeout(), LIMITS);
    if (!retry.ok) throw new Error('expected a decision');
    expect(retry.outcome).toBe('retry');
    expect(retry.record.last_error_code).toBe('job.timeout');
    expect(retry.record.lease_owner).toBeUndefined();
    expect(retry.record.available_at).toBe(timestampOf(at(10 + LIMITS.retryBaseDelaySeconds)));
    expect(claimRefusal(retry.record, at(10))).toBe('not_due');
    record = retry.record;

    const second = claimed(record, 'worker-1', at(10 + LIMITS.retryBaseDelaySeconds));
    const dead = fail(second.record, second.lease, at(100), timeout(), LIMITS);
    if (!dead.ok) throw new Error('expected a decision');
    expect(dead.outcome).toBe('dead_letter');
    expect(dead.record.attempt).toBe(2);
    expect(isDeadLettered(dead.record, at(100))).toBe(true);
    expect(claimRefusal(dead.record, at(100_000))).toBe('exhausted');
  });

  it('a lease that expires on the last attempt dead-letters with no fail call (crash)', () => {
    const only = claimed(job({ max_attempts: 1 }), 'worker-1', T0);
    const expiry = instantOf(only.record.lease_expires_at ?? '');
    expect(isDeadLettered(only.record, addSeconds(expiry, -1))).toBe(false);
    expect(isDeadLettered(only.record, expiry)).toBe(true);
  });

  it('records only a minted error code; an error built elsewhere is a programming fault', () => {
    const { record, lease } = claimed(job(), 'worker-1', T0);
    const forged = { ...stableError(PLATFORM_INTERNAL, 'c'), code: 'zz-text-from-a-thrown-value' };
    expect(() => fail(record, lease, at(1), forged, LIMITS)).toThrow('job decisions: a failure is a stable error platform-kernel minted');
  });

  it('a failure after the lease was lost is refused and changes nothing', () => {
    const { record, lease } = claimed(job(), 'worker-1', T0);
    expect(fail(record, lease, at(300 + LIMITS.leaseGraceSeconds), timeout(), LIMITS)).toEqual({ ok: false, reason: 'lease_lost' });
  });
});

describe('no decision writes a status value', () => {
  it('every record a decision returns has only CTR-JOB-001 keys', () => {
    const first = claimed(job(), 'worker-1', T0);
    const beat = heartbeat(first.record, first.lease, at(1), LIMITS);
    const failed = fail(first.record, first.lease, at(2), timeout(), LIMITS);
    const done = complete(first.record, first.lease, at(2), 'result:x');
    const records = [job(), first.record, requestCancel(job(), T0)];
    for (const decision of [beat, failed, done]) if (decision.ok) records.push(decision.record);
    expect(records.length).toBe(6);
    for (const record of records) {
      expect(checkJobRecord(record)).toBe(true);
      expect(Object.keys(record).every((key) => (JOB_KEYS as readonly string[]).includes(key))).toBe(true);
    }
  });

  it('refuses a record outside CTR-JOB-001 and an instant that is not whole milliseconds', () => {
    expect(() => isClaimable({ ...job(), status: 'queued' } as unknown as JobRecord, T0)).toThrow('job decisions: the record does not satisfy CTR-JOB-001');
    expect(() => isClaimable(job(), 0.5 as Instant)).toThrow(TypeError);
  });
});
