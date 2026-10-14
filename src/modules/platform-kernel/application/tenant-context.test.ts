// The tenant-context resolver (manifest acceptance criterion 3), through the fakes.
import { describe, expect, it } from 'vitest';

import { checkTenantContext } from '../domain/tenant-context';
import {
  failingPrincipal,
  failingTenantAccessDirectory,
  fixedPrincipal,
  sequentialRequestIdSource,
  tableTenantAccessDirectory,
  type DirectoryTable,
} from './fakes';
import type { AuthenticatedPrincipalPort, TenantAccessDirectory } from './ports';
import { isMintedTenantContext, resolveTenantContext } from './tenant-context';

const TABLE: DirectoryTable = {
  workspaces: ['ws_synthetic_0001', 'ws_synthetic_0002'],
  members: [
    { actor_id: 'usr_synthetic_0001', workspace_id: 'ws_synthetic_0001' },
    { actor_id: 'usr_synthetic_0002', workspace_id: 'ws_synthetic_0002' },
    { actor_id: 'usr_synthetic_0003', workspace_id: 'ws_synthetic_0001', businesses: ['biz_synthetic_0001'] },
  ],
  businesses: [
    { business_profile_id: 'biz_synthetic_0001', workspace_id: 'ws_synthetic_0001' },
    { business_profile_id: 'biz_synthetic_0002', workspace_id: 'ws_synthetic_0001' },
    { business_profile_id: 'biz_synthetic_0009', workspace_id: 'ws_synthetic_0002' },
  ],
  pages: [
    { page_context_profile_id: 'page_synthetic_0001', business_profile_id: 'biz_synthetic_0001' },
    { page_context_profile_id: 'page_synthetic_0002', business_profile_id: 'biz_synthetic_0002' },
  ],
};

const user = (id: string) => fixedPrincipal({ kind: 'user', id });

// A fresh id source per call, so two resolutions mint the same ids and can be compared byte for byte.
const resolve = (selection: unknown, principal: AuthenticatedPrincipalPort = user('usr_synthetic_0001'), directory: TenantAccessDirectory = tableTenantAccessDirectory(TABLE)) =>
  resolveTenantContext({ principal, directory, ids: sequentialRequestIdSource() }, selection);

const errorOf = async (selection: unknown, principal?: AuthenticatedPrincipalPort, directory?: TenantAccessDirectory) => {
  const resolution = await resolve(selection, principal, directory);
  if (resolution.ok) throw new Error('expected a refusal');
  return resolution.error;
};

describe('resolveTenantContext', () => {
  it('resolves a member to a CTR-TEN-001 context with server-minted ids, frozen and minted', async () => {
    const resolution = await resolve({ workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0001', page_context_profile_id: 'page_synthetic_0001' });
    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    const { context } = resolution;
    expect(JSON.parse(JSON.stringify(context))).toEqual({
      workspace_id: 'ws_synthetic_0001',
      business_profile_id: 'biz_synthetic_0001',
      page_context_profile_id: 'page_synthetic_0001',
      actor: { kind: 'user', id: 'usr_synthetic_0001' },
      request_id: 'id_synthetic_000001',
      correlation_id: 'id_synthetic_000002',
      locale: 'th-TH',
      timezone: 'Asia/Bangkok',
    });
    expect(checkTenantContext(context)).toBe(true);
    expect(isMintedTenantContext(context)).toBe(true);
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.actor)).toBe(true);
  });

  it('refuses a missing principal with an auth error', async () => {
    const error = await errorOf({ workspace_id: 'ws_synthetic_0001' }, fixedPrincipal(null));
    expect(error.category).toBe('auth');
    expect(error.code).toBe('tenant.unauthenticated');
  });

  it.each([
    ['actor', { kind: 'user', id: 'usr_synthetic_0002' }],
    ['actor_id', 'usr_synthetic_0002'],
    ['locale', 'th-TH'],
    ['timezone', 'Asia/Bangkok'],
    ['request_id', 'req_client'],
    ['correlation_id', 'cor_client'],
    ['causation_id', 'cau_client'],
  ])('refuses a client-supplied %s', async (key, value) => {
    const error = await errorOf({ workspace_id: 'ws_synthetic_0001', [key]: value });
    expect(error.category).toBe('validation');
    expect(error.code).toBe('tenant.selection.invalid');
  });

  it.each([
    ['no selection', undefined],
    ['a list', ['ws_synthetic_0001']],
    ['no workspace', { business_profile_id: 'biz_synthetic_0001' }],
    ['a non-string id', { workspace_id: 1 }],
    ['a page without a business', { workspace_id: 'ws_synthetic_0001', page_context_profile_id: 'page_synthetic_0001' }],
  ])('refuses %s as an invalid selection', async (_label, selection) => {
    expect((await errorOf(selection)).code).toBe('tenant.selection.invalid');
  });

  it('gives a member of one workspace selecting another the same bytes as a nonexistent workspace', async () => {
    const crossTenant = await errorOf({ workspace_id: 'ws_synthetic_0002' });
    const nonexistent = await errorOf({ workspace_id: 'ws_synthetic_9999' });
    const malformed = await errorOf({ workspace_id: 'ws synthetic; drop' });
    expect(JSON.stringify(crossTenant)).toBe(JSON.stringify(nonexistent));
    expect(JSON.stringify(malformed)).toBe(JSON.stringify(nonexistent));
    expect(crossTenant.category).toBe('permission');
  });

  it.each([
    ['a business of another workspace', { workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0009' }],
    ['a nonexistent business', { workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_9999' }],
    ['a page of another business', { workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0001', page_context_profile_id: 'page_synthetic_0002' }],
    ['a nonexistent page', { workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0001', page_context_profile_id: 'page_synthetic_9999' }],
  ])('refuses %s with the same uniform denial', async (_label, selection) => {
    const denied = await errorOf(selection);
    const nonexistent = await errorOf({ workspace_id: 'ws_synthetic_9999' });
    expect(JSON.stringify(denied)).toBe(JSON.stringify(nonexistent));
  });

  it('refuses a business outside a limited member\'s businesses with the uniform denial', async () => {
    const limited = user('usr_synthetic_0003');
    expect((await resolve({ workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0001' }, limited)).ok).toBe(true);
    const denied = await errorOf({ workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0002' }, limited);
    expect(JSON.stringify(denied)).toBe(JSON.stringify(await errorOf({ workspace_id: 'ws_synthetic_9999' })));
  });

  it('gives a temporary error for a failing directory, copying nothing from the failure', async () => {
    const LEAK_MARKER = 'zz-directory-failure-detail';
    for (const failure of [new Error(LEAK_MARKER), LEAK_MARKER, { message: LEAK_MARKER, stack: LEAK_MARKER }]) {
      const error = await errorOf({ workspace_id: 'ws_synthetic_0001' }, undefined, failingTenantAccessDirectory(failure));
      expect(error.category).toBe('temporary');
      expect(error.retryable).toBe(true);
      expect(error.details).toEqual({});
      expect(JSON.stringify(error)).not.toContain(LEAK_MARKER);
    }
  });

  it('gives a temporary error for a failing principal port, copying nothing', async () => {
    const error = await errorOf({ workspace_id: 'ws_synthetic_0001' }, failingPrincipal(new Error('zz-session-detail')));
    expect(error.code).toBe('platform.temporary');
    expect(JSON.stringify(error)).not.toContain('zz-session-detail');
  });

  it('admits only `true` from the directory', async () => {
    const truthy: TenantAccessDirectory = { admits: () => Promise.resolve('yes' as unknown as boolean) };
    expect((await errorOf({ workspace_id: 'ws_synthetic_0001' }, undefined, truthy)).code).toBe('tenant.scope.denied');
  });

  it('does not consult the directory for an invalid selection or a missing principal', async () => {
    const directory = tableTenantAccessDirectory(TABLE);
    await resolve({ workspace_id: 'ws_synthetic_0001', actor: 'x' }, undefined, directory);
    await resolve({ workspace_id: 'ws_synthetic_0001' }, fixedPrincipal(null), directory);
    expect(directory.calls).toEqual([]);
  });

  it('carries the minted correlation id on every refusal', async () => {
    expect((await errorOf({ workspace_id: 'ws_synthetic_9999' })).correlation_id).toBe('id_synthetic_000002');
  });

  it('refuses an id source that mints outside the minted shape', async () => {
    const ids = { mint: () => 'not a minted id' };
    await expect(resolveTenantContext({ principal: user('usr_synthetic_0001'), directory: tableTenantAccessDirectory(TABLE), ids }, { workspace_id: 'ws_synthetic_0001' })).rejects.toThrow(TypeError);
  });
});
