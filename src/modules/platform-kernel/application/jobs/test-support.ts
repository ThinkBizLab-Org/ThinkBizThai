// Shared set-up for the job tests: minted tenant contexts for two workspaces, a manual clock, the
// in-memory store and an enqueue request. Synthetic ids only.
import { instantOf } from '../../domain/jobs/job-decisions';
import { D6_PROVISIONAL_JOB_LIMITS, type JobLimits } from '../../domain/jobs/job-limits';
import { fixedPrincipal, sequentialRequestIdSource, tableTenantAccessDirectory } from '../fakes';
import { resolveTenantContext, type TenantContext } from '../tenant-context';
import { inMemoryJobStore, manualJobClock, type InMemoryJobStore, type ManualJobClock } from './fakes';
import type { EnqueueRequest } from './job-store-port';

export const WORKSPACE_A = 'ws_synthetic_000A';
export const WORKSPACE_B = 'ws_synthetic_000B';
export const START = '2026-10-19T00:00:00.000Z';
export const T0 = instantOf(START);

const directory = tableTenantAccessDirectory({
  workspaces: [WORKSPACE_A, WORKSPACE_B],
  members: [
    { actor_kind: 'system_actor', actor_id: 'research-worker', workspace_id: WORKSPACE_A },
    { actor_kind: 'system_actor', actor_id: 'research-worker', workspace_id: WORKSPACE_B },
  ],
  businesses: [],
  pages: [],
});

let idPrefix = 0;

export async function mintContext(workspaceId: string): Promise<TenantContext> {
  idPrefix += 1;
  const resolution = await resolveTenantContext({
    principal: fixedPrincipal({ kind: 'system_actor', id: 'research-worker' }),
    directory,
    ids: sequentialRequestIdSource(`id_synthetic_${String(idPrefix).padStart(3, '0')}`),
  }, { workspace_id: workspaceId });
  if (!resolution.ok) throw new Error('test set-up: the context was not resolved');
  return resolution.context;
}

export interface Harness {
  readonly clock: ManualJobClock;
  readonly store: InMemoryJobStore;
  readonly limits: JobLimits;
  readonly contextA: TenantContext;
  readonly contextB: TenantContext;
}

export async function harness(limits: JobLimits = D6_PROVISIONAL_JOB_LIMITS): Promise<Harness> {
  const clock = manualJobClock(START);
  return {
    clock,
    limits,
    store: inMemoryJobStore({ clock, limits }),
    contextA: await mintContext(WORKSPACE_A),
    contextB: await mintContext(WORKSPACE_B),
  };
}

export const request = (context: TenantContext, overrides: Partial<EnqueueRequest> = {}): EnqueueRequest => ({
  context,
  job_type: 'research.run',
  job_version: 1,
  priority: 0,
  max_attempts: 3,
  timeout_seconds: 300,
  dedupe_key: 'research:synthetic-0001',
  input_ref: 'asset:input/synthetic-0001',
  progress_stage: 'jobs.research.queued',
  ...overrides,
});
