// The worker step on the fakes (manifest acceptance criteria 4 and 6): a crash mid-run is reclaimed
// after the lease expires and an idempotent handler's effect is not duplicated; a restarted worker
// picks the job up again; a handler that exceeds its timeout is retried after the back-off and
// dead-lettered at max_attempts; the handler sees its own job's tenant context only; and nothing a
// handler throws or returns reaches a record or a report.
import { describe, expect, it } from 'vitest';

import { addSeconds, instantOf, isDeadLettered } from '../../domain/jobs/job-decisions';
import { JOB_HANDLER_FAILED, JOB_TIMEOUT, JOB_TYPE_UNKNOWN } from '../../domain/jobs/job-errors';
import { PLATFORM_TEMPORARY } from '../../domain/platform-errors';
import { stableError } from '../../domain/stable-error';
import { tenantContextRecordOf } from '../tenant-context';
import { T0, WORKSPACE_A, WORKSPACE_B, harness, request } from './test-support';
import { workOnce, type JobHandler, type JobRunInput } from './worker';

const LEAK_MARKER = 'zz-text-from-a-thrown-value';
const never = (): Promise<never> => new Promise(() => undefined);

describe('workOnce', () => {
  it('is idle when nothing is claimable', async () => {
    const { store, clock } = await harness();
    expect(await workOnce({ store, clock, handlers: {}, leaseOwner: 'worker-1' })).toEqual({ kind: 'idle' });
  });

  it('runs the handler and records its result_ref', async () => {
    const { store, clock, contextA } = await harness();
    const { job } = await store.enqueue(request(contextA));
    const report = await workOnce({ store, clock, leaseOwner: 'worker-1', handlers: { 'research.run': () => Promise.resolve({ ok: true, result_ref: 'result:research/1' }) } });
    expect(report).toEqual({ kind: 'completed', job_id: job.job_id, attempt: 1 });
    const stored = await store.get(contextA, job.job_id);
    expect(stored?.result_ref).toBe('result:research/1');
    expect(stored?.lease_owner).toBeUndefined();
  });

  it('crash mid-run: lease expiry lets another worker reclaim, and an idempotent effect is not duplicated', async () => {
    const { store, clock, limits, contextA } = await harness();
    await store.enqueue(request(contextA));
    // The handler's effect is keyed by the job's dedupe_key, so applying it twice changes nothing.
    const effects = new Set<string>();
    const runs: string[] = [];
    const effect = (owner: string, job: JobRunInput): void => { effects.add(job.dedupe_key); runs.push(`${owner}:${job.attempt}`); };

    // worker-1 claims, applies the effect, and its process dies before it records anything.
    const crashed = await store.claim('worker-1');
    if (crashed === null) throw new Error('expected a claim');
    effect('worker-1', crashed.record);

    const finishing: JobHandler = (job) => { effect('worker-2', job); return Promise.resolve({ ok: true, result_ref: 'result:research/1' }); };
    const handlers = { 'research.run': finishing };
    // Before the lease expires nobody else gets it.
    clock.set(addSeconds(T0, 300 + limits.leaseGraceSeconds - 1));
    expect(await workOnce({ store, clock, leaseOwner: 'worker-2', handlers })).toEqual({ kind: 'idle' });

    clock.set(addSeconds(T0, 300 + limits.leaseGraceSeconds));
    const report = await workOnce({ store, clock, leaseOwner: 'worker-2', handlers });
    expect(report).toMatchObject({ kind: 'completed', attempt: 2 });
    expect(runs).toEqual(['worker-1:1', 'worker-2:2']);
    expect([...effects]).toEqual(['research:synthetic-0001']);
    // worker-1's old lease cannot overwrite the outcome.
    expect(await store.complete(crashed.lease, 'result:stale/1')).toEqual({ ok: false, reason: 'lease_lost' });
    expect(store.records()[0]?.result_ref).toBe('result:research/1');
  });

  it('restart: the same worker name, restarted, picks the job up after its old lease expires', async () => {
    const { store, clock, limits, contextA } = await harness();
    const { job } = await store.enqueue(request(contextA));
    const first = await store.claim('worker-1');
    if (first === null) throw new Error('expected a claim');
    // The process restarts here; its in-memory lease is gone.
    expect(await workOnce({ store, clock, leaseOwner: 'worker-1', handlers: {} })).toEqual({ kind: 'idle' });
    clock.set(instantOf(first.record.lease_expires_at ?? ''));
    const report = await workOnce({ store, clock, leaseOwner: 'worker-1', handlers: { 'research.run': () => Promise.resolve({ ok: true, result_ref: 'result:research/1' }) } });
    expect(report).toEqual({ kind: 'completed', job_id: job.job_id, attempt: 2 });
    expect(limits.leaseGraceSeconds).toBeGreaterThan(0);
  });

  it('duplicate delivery: a job enqueued twice is run once', async () => {
    const { store, clock, contextA } = await harness();
    await store.enqueue(request(contextA));
    await store.enqueue(request(contextA));
    let runs = 0;
    const handlers = { 'research.run': () => { runs += 1; return Promise.resolve({ ok: true as const, result_ref: 'result:research/1' }); } };
    await workOnce({ store, clock, leaseOwner: 'worker-1', handlers });
    expect(await workOnce({ store, clock, leaseOwner: 'worker-2', handlers })).toEqual({ kind: 'idle' });
    expect(runs).toBe(1);
  });

  it('timeout -> retry after the back-off -> dead-letter at max_attempts', async () => {
    const { store, clock, limits, contextA } = await harness();
    const { job } = await store.enqueue(request(contextA, { max_attempts: 2, timeout_seconds: 60 }));
    // The handler runs past its timeout and never settles.
    const slow: JobHandler = () => { clock.advance(61_000); return never(); };
    const handlers = { 'research.run': slow };

    const first = await workOnce({ store, clock, leaseOwner: 'worker-1', handlers });
    expect(first).toEqual({ kind: 'retry', job_id: job.job_id, attempt: 1, code: JOB_TIMEOUT.code });
    const retrying = await store.get(contextA, job.job_id);
    expect(retrying?.last_error_code).toBe('job.timeout');
    expect(retrying?.available_at).toBe(new Date(addSeconds(T0, 61 + limits.retryBaseDelaySeconds)).toISOString());

    expect(await workOnce({ store, clock, leaseOwner: 'worker-1', handlers })).toEqual({ kind: 'idle' });
    clock.advance(limits.retryBaseDelaySeconds * 1000);
    const second = await workOnce({ store, clock, leaseOwner: 'worker-1', handlers });
    expect(second).toEqual({ kind: 'dead_letter', job_id: job.job_id, attempt: 2, code: JOB_TIMEOUT.code });

    const dead = await store.get(contextA, job.job_id);
    if (dead === null) throw new Error('expected the job');
    expect(isDeadLettered(dead, clock.now())).toBe(true);
    clock.advance(86_400_000);
    expect(await workOnce({ store, clock, leaseOwner: 'worker-2', handlers })).toEqual({ kind: 'idle' });
  });

  it('a result returned after the deadline is discarded as a timeout', async () => {
    const { store, clock, contextA } = await harness();
    const { job } = await store.enqueue(request(contextA, { timeout_seconds: 60 }));
    const late: JobHandler = () => { clock.advance(60_000); return Promise.resolve({ ok: true, result_ref: 'result:late/1' }); };
    expect(await workOnce({ store, clock, leaseOwner: 'worker-1', handlers: { 'research.run': late } })).toMatchObject({ kind: 'retry', code: JOB_TIMEOUT.code });
    expect((await store.get(contextA, job.job_id))?.result_ref).toBeUndefined();
  });

  it('a handler past timeout + grace has lost its lease; nothing is recorded and the job is reclaimable', async () => {
    const { store, clock, limits, contextA } = await harness();
    const { job } = await store.enqueue(request(contextA, { timeout_seconds: 60 }));
    const overrun: JobHandler = () => { clock.advance((60 + limits.leaseGraceSeconds) * 1000); return Promise.resolve({ ok: true, result_ref: 'result:late/1' }); };
    expect(await workOnce({ store, clock, leaseOwner: 'worker-1', handlers: { 'research.run': overrun } })).toEqual({ kind: 'lease_lost', job_id: job.job_id, attempt: 1 });
    const stored = await store.get(contextA, job.job_id);
    expect(stored?.last_error_code).toBeUndefined();
    expect((await store.claim('worker-2'))?.record.attempt).toBe(2);
  });

  it('the handler sees its own job tenant context, and each workspace job is run under its own', async () => {
    const { store, clock, contextA, contextB } = await harness();
    await store.enqueue(request(contextA));
    await store.enqueue(request(contextB));
    const seen: JobRunInput[] = [];
    const handlers = { 'research.run': (job: JobRunInput) => { seen.push(job); return Promise.resolve({ ok: true as const, result_ref: 'result:research/1' }); } };
    await workOnce({ store, clock, leaseOwner: 'worker-1', handlers });
    await workOnce({ store, clock, leaseOwner: 'worker-1', handlers });
    const contexts = new Map(seen.map((job) => [job.tenant_context.workspace_id, job.tenant_context]));
    expect(contexts.get(WORKSPACE_A)).toEqual(tenantContextRecordOf(contextA));
    expect(contexts.get(WORKSPACE_B)).toEqual(tenantContextRecordOf(contextB));
    expect(Object.isFrozen(seen[0])).toBe(true);
  });
});

describe('failures carry only a stable error code', () => {
  const run = async (handler: JobHandler | undefined, jobType = 'research.run') => {
    const { store, clock, contextA } = await harness();
    const { job } = await store.enqueue(request(contextA, { job_type: jobType }));
    const handlers = handler === undefined ? {} : { [jobType]: handler };
    const report = await workOnce({ store, clock, leaseOwner: 'worker-1', handlers });
    const stored = await store.get(contextA, job.job_id);
    return { report, stored };
  };

  it.each([
    ['throws', () => { throw new Error(LEAK_MARKER); }],
    ['rejects', () => Promise.reject(new Error(LEAK_MARKER))],
    ['returns a non-outcome', () => Promise.resolve(LEAK_MARKER as unknown as { ok: true; result_ref: string })],
    ['returns a result_ref outside the private-reference rule', () => Promise.resolve({ ok: true as const, result_ref: `https://example.invalid/${LEAK_MARKER}` })],
    ['returns an error it did not mint', () => Promise.resolve({ ok: false as const, error: { ...stableError(PLATFORM_TEMPORARY, 'c'), code: LEAK_MARKER } })],
    ['returns an outcome whose getter throws', () => Promise.resolve(Object.defineProperty({}, 'ok', { enumerable: true, get() { throw new Error(LEAK_MARKER); } }) as { ok: true; result_ref: string })],
  ] as const)('a handler that %s is JOB_HANDLER_FAILED, with none of its text kept', async (_label, handler) => {
    const { report, stored } = await run(handler as JobHandler);
    expect(report).toMatchObject({ kind: 'retry', code: JOB_HANDLER_FAILED.code });
    expect(stored?.last_error_code).toBe(JOB_HANDLER_FAILED.code);
    expect(JSON.stringify([report, stored])).not.toContain(LEAK_MARKER);
  });

  it('a minted error the handler returns is recorded by its code', async () => {
    const { report, stored } = await run(() => Promise.resolve({ ok: false, error: stableError(PLATFORM_TEMPORARY, 'c') }));
    expect(report).toMatchObject({ kind: 'retry', code: PLATFORM_TEMPORARY.code });
    expect(stored?.last_error_code).toBe(PLATFORM_TEMPORARY.code);
  });

  it('a job type with no own handler is JOB_TYPE_UNKNOWN, including an inherited name', async () => {
    expect((await run(undefined)).report).toMatchObject({ code: JOB_TYPE_UNKNOWN.code });
    expect((await run(undefined, 'toString')).report).toMatchObject({ code: JOB_TYPE_UNKNOWN.code });
  });
});

describe('the abort signal (A1-301-I2)', () => {
  it('is aborted when the worker gives up at the job timeout, and not before', async () => {
    const { store, clock, contextA } = await harness();
    await store.enqueue(request(contextA, { timeout_seconds: 60 }));
    let signal: AbortSignal | undefined;
    let abortedWhileRunning: boolean | undefined;
    const slow: JobHandler = (_job, received) => {
      signal = received;
      abortedWhileRunning = received.aborted;
      clock.advance(60_000);
      return never();
    };
    expect(await workOnce({ store, clock, leaseOwner: 'worker-1', handlers: { 'research.run': slow } })).toMatchObject({ kind: 'retry', code: JOB_TIMEOUT.code });
    expect(abortedWhileRunning).toBe(false);
    expect(signal?.aborted).toBe(true);
    // The reason is the platform's own AbortError; nothing of the job rides on it.
    expect(JSON.stringify(String(signal?.reason))).not.toContain('research');
  });

  it('is not aborted when the handler finishes in time', async () => {
    const { store, clock, contextA } = await harness();
    await store.enqueue(request(contextA));
    let signal: AbortSignal | undefined;
    const quick: JobHandler = (_job, received) => { signal = received; return Promise.resolve({ ok: true, result_ref: 'result:research/1' }); };
    expect(await workOnce({ store, clock, leaseOwner: 'worker-1', handlers: { 'research.run': quick } })).toMatchObject({ kind: 'completed' });
    expect(signal?.aborted).toBe(false);
  });
});
