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
import { isMintedTenantContext, resolveTenantContext, tenantContextRecordOf } from './tenant-context';

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

// A directory that admits every scope and records what it was asked, so a refusal can only come
// from the resolver's own rules.
const admitAll = () => {
  const calls: unknown[] = [];
  const directory: TenantAccessDirectory = { admits: (_principal, scope) => { calls.push(scope); return Promise.resolve(true); } };
  return { directory, calls };
};

const LEAK_MARKER = 'zz-text-from-a-thrown-value';

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
  // A1-261-1: only the selection's own keys are read.
  it('refuses a selection whose ids are only inherited', async () => {
    const inherited: unknown = Object.create({ workspace_id: 'ws_synthetic_0001' });
    expect((await errorOf(inherited)).code).toBe('tenant.selection.invalid');
  });

  it('does not narrow a JSON-parsed selection by a polluted Object.prototype', async () => {
    const prototype = Object.prototype as Record<string, unknown>;
    const directory = tableTenantAccessDirectory(TABLE);
    try {
      prototype.business_profile_id = 'biz_synthetic_0001';
      prototype.page_context_profile_id = 'page_synthetic_0001';
      const resolution = await resolve(JSON.parse('{"workspace_id":"ws_synthetic_0001"}'), undefined, directory);
      expect(resolution.ok).toBe(true);
      if (!resolution.ok) return;
      expect(Object.hasOwn(resolution.context, 'business_profile_id')).toBe(false);
      expect(Object.hasOwn(resolution.context, 'page_context_profile_id')).toBe(false);
      const record = tenantContextRecordOf(resolution.context);
      expect(Object.hasOwn(record, 'business_profile_id')).toBe(false);
      expect(Object.hasOwn(record, 'page_context_profile_id')).toBe(false);
      expect(directory.calls).toHaveLength(1);
      expect(Object.keys(directory.calls[0] ?? {})).toEqual(['workspace_id']);
    } finally {
      delete prototype.business_profile_id;
      delete prototype.page_context_profile_id;
    }
    expect(Object.hasOwn(Object.prototype, 'business_profile_id')).toBe(false);
  });

  it('refuses a selection whose read throws as invalid, copying nothing', async () => {
    const throwing = { get workspace_id(): string { throw new Error(LEAK_MARKER); } };
    const error = await errorOf(throwing);
    expect(error.code).toBe('tenant.selection.invalid');
    expect(JSON.stringify(error)).not.toContain(LEAK_MARKER);
  });

  // A1-261-2: a dependency's thrown value does not leave the resolver.
  it('gives a temporary error for a principal whose getters throw, copying nothing', async () => {
    for (const property of ['kind', 'id']) {
      const principal = { kind: 'user', id: 'usr_synthetic_0001' };
      Object.defineProperty(principal, property, { get: () => { throw new Error(LEAK_MARKER); } });
      const port: AuthenticatedPrincipalPort = { current: () => Promise.resolve(principal as never) };
      const error = await errorOf({ workspace_id: 'ws_synthetic_0001' }, port);
      expect(error.code).toBe('platform.temporary');
      expect(error.details).toEqual({});
      expect(JSON.stringify(error)).not.toContain(LEAK_MARKER);
    }
  });

  it('drops the thrown value of a failing id source: a constant TypeError, no cause', async () => {
    for (const failure of [new Error(LEAK_MARKER), LEAK_MARKER, { message: LEAK_MARKER, stack: LEAK_MARKER }]) {
      const ids = { mint: (): string => { throw failure; } };
      const rejection: unknown = await resolveTenantContext({ principal: user('usr_synthetic_0001'), directory: tableTenantAccessDirectory(TABLE), ids }, { workspace_id: 'ws_synthetic_0001' })
        .then(() => undefined, (thrown: unknown) => thrown);
      expect(rejection).toBeInstanceOf(TypeError);
      expect(rejection).not.toBe(failure);
      if (!(rejection instanceof TypeError)) return;
      expect(rejection.message).toBe('tenant context: the id source failed');
      expect(Object.hasOwn(rejection, 'cause')).toBe(false);
      expect(String(rejection.stack)).not.toContain(LEAK_MARKER);
    }
  });

  // Q0-261-1 (a): the id pattern (Q2) refuses on its own, whatever the directory would say.
  it.each([
    ['a 129-character workspace id', { workspace_id: 'w'.repeat(129) }],
    ['a workspace id with a space', { workspace_id: 'ws synthetic' }],
    ['a business id with a newline', { workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0001\n' }],
    ['a full-width page id', { workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0001', page_context_profile_id: 'page_\uff41' }],
  ])('denies %s before the directory is asked', async (_label, selection) => {
    const { directory, calls } = admitAll();
    const error = await errorOf(selection, undefined, directory);
    expect(error.code).toBe('tenant.scope.denied');
    expect(calls).toEqual([]);
    expect((await resolve({ workspace_id: 'w'.repeat(128) }, undefined, admitAll().directory)).ok).toBe(true);
  });

  // Q0-261-1 (b): a principal outside the minted shape is unauthenticated.
  it.each([
    ['an id with a space', { kind: 'user', id: 'usr synthetic' }],
    ['a 129-character id', { kind: 'user', id: 'u'.repeat(129) }],
    ['an empty id', { kind: 'user', id: '' }],
    ['a kind outside the enum', { kind: 'admin', id: 'usr_synthetic_0001' }],
    ['a non-object', 'usr_synthetic_0001'],
  ])('refuses a principal with %s as unauthenticated', async (_label, principal) => {
    const port: AuthenticatedPrincipalPort = { current: () => Promise.resolve(principal as never) };
    const { directory, calls } = admitAll();
    const error = await errorOf({ workspace_id: 'ws_synthetic_0001' }, port, directory);
    expect(error.code).toBe('tenant.unauthenticated');
    expect(calls).toEqual([]);
  });

  // A1-261-N4: the principal's kind and id are read as own properties only.
  it('refuses a principal whose kind and id are only inherited, a polluted Object.prototype among them', async () => {
    const inherited = Object.create({ kind: 'user', id: 'usr_synthetic_0001' }) as object;
    const port: AuthenticatedPrincipalPort = { current: () => Promise.resolve(inherited as never) };
    expect((await errorOf({ workspace_id: 'ws_synthetic_0001' }, port, admitAll().directory)).code).toBe('tenant.unauthenticated');

    const prototype = Object.prototype as Record<string, unknown>;
    prototype.kind = 'user';
    prototype.id = 'usr_synthetic_0001';
    try {
      const { directory, calls } = admitAll();
      const empty: AuthenticatedPrincipalPort = { current: () => Promise.resolve({} as never) };
      const error = await errorOf({ workspace_id: 'ws_synthetic_0001' }, empty, directory);
      expect(error.code).toBe('tenant.unauthenticated');
      expect(calls).toEqual([]);
    } finally {
      delete prototype.kind;
      delete prototype.id;
    }
  });

  // Q0-261-5: the principal is read once, so the id that met the pattern is the id the context carries.
  it('reads the principal\'s kind and id once each', async () => {
    const reads = { kind: 0, id: 0 };
    const principal = {
      get kind(): string { reads.kind += 1; return 'user'; },
      get id(): string { reads.id += 1; return reads.id === 1 ? 'usr_synthetic_0001' : 'usr synthetic, not in the minted shape'; },
    };
    const port: AuthenticatedPrincipalPort = { current: () => Promise.resolve(principal as never) };
    const resolution = await resolve({ workspace_id: 'ws_synthetic_0001' }, port, admitAll().directory);
    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    expect(resolution.context.actor).toEqual({ kind: 'user', id: 'usr_synthetic_0001' });
    expect(reads).toEqual({ kind: 1, id: 1 });
  });

  // Q0-AUD1015-1: a present but non-string business or page id is refused, never dropped to a wider scope.
  it.each([
    ['a numeric business id', { workspace_id: 'ws_synthetic_0001', business_profile_id: 1 }],
    ['a null business id', { workspace_id: 'ws_synthetic_0001', business_profile_id: null }],
    ['a numeric page id', { workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0001', page_context_profile_id: 1 }],
    ['an undefined page id', { workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0001', page_context_profile_id: undefined }],
  ])('refuses %s as an invalid selection, before the directory is asked', async (_label, selection) => {
    const { directory, calls } = admitAll();
    expect((await errorOf(selection, undefined, directory)).code).toBe('tenant.selection.invalid');
    expect(calls).toEqual([]);
  });

  // A1-AUD1015-2: membership is keyed on the principal's kind and id.
  it('does not admit a system_actor that shares a member user\'s id', async () => {
    const error = await errorOf({ workspace_id: 'ws_synthetic_0001' }, fixedPrincipal({ kind: 'system_actor', id: 'usr_synthetic_0001' }));
    expect(error.code).toBe('tenant.scope.denied');
    const system: DirectoryTable = { ...TABLE, members: [{ actor_kind: 'system_actor', actor_id: 'sys_synthetic_0001', workspace_id: 'ws_synthetic_0001' }] };
    expect((await resolve({ workspace_id: 'ws_synthetic_0001' }, fixedPrincipal({ kind: 'system_actor', id: 'sys_synthetic_0001' }), tableTenantAccessDirectory(system))).ok).toBe(true);
    expect((await errorOf({ workspace_id: 'ws_synthetic_0001' }, user('sys_synthetic_0001'), tableTenantAccessDirectory(system))).code).toBe('tenant.scope.denied');
  });

  // A1-AUD1015-3: the scope handed to the directory is frozen, so the admitted scope is the context's.
  it('hands the directory a frozen scope, so an adapter cannot change what the context carries', async () => {
    let frozen = false;
    const directory: TenantAccessDirectory = {
      admits: (_principal, scope) => {
        frozen = Object.isFrozen(scope);
        Reflect.set(scope, 'workspace_id', 'ws_synthetic_0002');
        return Promise.resolve(true);
      },
    };
    const resolution = await resolve({ workspace_id: 'ws_synthetic_0001' }, undefined, directory);
    expect(frozen).toBe(true);
    expect(resolution.ok && resolution.context.workspace_id).toBe('ws_synthetic_0001');
  });
});
