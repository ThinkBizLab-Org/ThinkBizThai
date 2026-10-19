// JobStorePort and its in-memory fake (manifest acceptance criterion 4): an enqueue with an existing
// dedupe_key in the same tenant returns the existing job and creates none; two workers claiming at
// once get at most one lease; an expired lease is reclaimed and the first lease fenced out; the tenant
// scope a job is enqueued under is the one it carries, and no call crosses into another workspace.
import { describe, expect, it } from 'vitest';

import { addSeconds, instantOf } from '../../domain/jobs/job-decisions';
import { JOB_TIMEOUT } from '../../domain/jobs/job-errors';
import { checkJobRecord } from '../../domain/jobs/job-record';
import { stableError } from '../../domain/stable-error';
import { tenantContextRecordOf } from '../tenant-context';
import { T0, WORKSPACE_A, WORKSPACE_B, harness, request } from './test-support';

describe('enqueue', () => {
  it('creates a CTR-JOB-001 record carrying the enqueuing context', async () => {
    const { store, contextA } = await harness();
    const { created, job } = await store.enqueue(request(contextA));
    expect(created).toBe(true);
    expect(checkJobRecord(job)).toBe(true);
    expect(job.tenant_context).toEqual(tenantContextRecordOf(contextA));
    expect(job.attempt).toBe(0);
  });

  it('a duplicate dedupe_key in the same workspace returns the existing job and creates none', async () => {
    const { store, contextA } = await harness();
    const first = await store.enqueue(request(contextA));
    const again = await store.enqueue(request(contextA, { input_ref: 'asset:input/other', job_type: 'research.other' }));
    expect(again.created).toBe(false);
    expect(again.job).toBe(first.job);
    expect(store.records()).toHaveLength(1);
  });

  it('the same dedupe_key in another workspace is another job', async () => {
    const { store, contextA, contextB } = await harness();
    const a = await store.enqueue(request(contextA));
    const b = await store.enqueue(request(contextB));
    expect(b.created).toBe(true);
    expect(b.job.job_id).not.toBe(a.job.job_id);
    expect(b.job.tenant_context.workspace_id).toBe(WORKSPACE_B);
  });

  it('refuses a context the resolver did not mint (a copy or a JSON round trip)', async () => {
    const { store, contextA } = await harness();
    const copy = { ...contextA };
    const json = JSON.parse(JSON.stringify(contextA)) as typeof contextA;
    await expect(store.enqueue(request(copy))).rejects.toThrow('job store: the tenant context was not minted by the resolver');
    await expect(store.enqueue(request(json))).rejects.toThrow(TypeError);
    expect(store.records()).toHaveLength(0);
  });
});

describe('claim', () => {
  it('two workers claiming at once get at most one lease (duplicate claim prevented)', async () => {
    const { store, contextA } = await harness();
    await store.enqueue(request(contextA));
    const [one, two] = await Promise.all([store.claim('worker-1'), store.claim('worker-2')]);
    const granted = [one, two].filter((claimed) => claimed !== null);
    expect(granted).toHaveLength(1);
    expect(granted[0]?.record.attempt).toBe(1);
  });

  it('returns null while nothing is due, then the job once available_at passes', async () => {
    const { store, clock, contextA } = await harness();
    await store.enqueue(request(contextA, { available_at: addSeconds(T0, 60) }));
    expect(await store.claim('worker-1')).toBeNull();
    clock.advance(60_000);
    expect((await store.claim('worker-1'))?.claimed_at).toBe(addSeconds(T0, 60));
  });

  it('crash mid-lease: no reclaim before expiry, reclaim by another worker after it, first lease fenced', async () => {
    const { store, clock, limits, contextA } = await harness();
    await store.enqueue(request(contextA));
    const crashed = await store.claim('worker-1');
    if (crashed === null) throw new Error('expected a claim');
    const expiry = instantOf(crashed.record.lease_expires_at ?? '');
    expect(expiry).toBe(addSeconds(T0, 300 + limits.leaseGraceSeconds));

    clock.set(addSeconds(expiry, -1));
    expect(await store.claim('worker-2')).toBeNull();
    clock.set(expiry);
    const reclaimed = await store.claim('worker-2');
    expect(reclaimed?.record.attempt).toBe(2);
    expect(reclaimed?.lease.lease_owner).toBe('worker-2');

    // worker-1 comes back: every act on its old lease is refused and changes nothing.
    expect(await store.heartbeat(crashed.lease)).toEqual({ ok: false, reason: 'lease_lost' });
    expect(await store.complete(crashed.lease, 'result:late/1')).toEqual({ ok: false, reason: 'lease_lost' });
    expect(await store.fail(crashed.lease, stableError(JOB_TIMEOUT, 'c'))).toEqual({ ok: false, reason: 'lease_lost' });
    expect(store.records()[0]?.lease_owner).toBe('worker-2');
  });

  it('a cancellation request stops a further claim', async () => {
    const { store, contextA } = await harness();
    const { job } = await store.enqueue(request(contextA));
    const cancelled = await store.requestCancel(contextA, job.job_id);
    expect(cancelled?.cancel_requested_at).toBe('2026-10-19T00:00:00.000Z');
    expect(await store.claim('worker-1')).toBeNull();
  });
});

describe('tenant scope is carried and never crossed', () => {
  it('a job is found and cancelled only from its own workspace', async () => {
    const { store, contextA, contextB } = await harness();
    const { job } = await store.enqueue(request(contextA));
    expect(await store.get(contextB, job.job_id)).toBeNull();
    expect(await store.requestCancel(contextB, job.job_id)).toBeNull();
    expect((await store.get(contextA, job.job_id))?.cancel_requested_at).toBeUndefined();
    expect((await store.get({ workspace_id: WORKSPACE_A }, job.job_id))?.job_id).toBe(job.job_id);
  });

  it('a lease naming another workspace is refused for heartbeat, complete and fail', async () => {
    const { store, contextA } = await harness();
    await store.enqueue(request(contextA));
    const claimed = await store.claim('worker-1');
    if (claimed === null) throw new Error('expected a claim');
    const crossed = { ...claimed.lease, workspace_id: WORKSPACE_B };
    expect(await store.heartbeat(crossed)).toEqual({ ok: false, reason: 'lease_lost' });
    expect(await store.complete(crossed, 'result:x')).toEqual({ ok: false, reason: 'lease_lost' });
    expect(await store.fail(crossed, stableError(JOB_TIMEOUT, 'c'))).toEqual({ ok: false, reason: 'lease_lost' });
    expect(store.records()[0]?.result_ref).toBeUndefined();
    expect((await store.complete(claimed.lease, 'result:x')).ok).toBe(true);
  });

  it('jobs of two workspaces keep their own contexts through claim, retry and completion', async () => {
    const { store, clock, limits, contextA, contextB } = await harness();
    await store.enqueue(request(contextA));
    await store.enqueue(request(contextB));
    const first = await store.claim('worker-1');
    const second = await store.claim('worker-1');
    if (first === null || second === null) throw new Error('expected two claims');
    const byWorkspace = new Map([first, second].map((claimed) => [claimed.record.tenant_context.workspace_id, claimed]));
    expect(byWorkspace.get(WORKSPACE_A)?.record.tenant_context).toEqual(tenantContextRecordOf(contextA));
    expect(byWorkspace.get(WORKSPACE_B)?.record.tenant_context).toEqual(tenantContextRecordOf(contextB));
    await store.fail(first.lease, stableError(JOB_TIMEOUT, first.record.tenant_context.correlation_id));
    clock.advance(limits.retryBaseDelaySeconds * 1000);
    const retried = await store.claim('worker-2');
    expect(retried?.record.tenant_context).toEqual(first.record.tenant_context);
  });
});
