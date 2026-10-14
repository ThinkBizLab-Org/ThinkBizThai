import { hasOnlyKeys, hasOwn, isObject } from '../domain/json-shape';
import {
  PLATFORM_TEMPORARY,
  TENANT_SCOPE_DENIED,
  TENANT_SELECTION_INVALID,
  TENANT_UNAUTHENTICATED,
} from '../domain/platform-errors';
import { stableError, type StableError, type StableErrorDefinition } from '../domain/stable-error';
import {
  TENANT_LOCALE,
  TENANT_TIMEZONE,
  checkTenantContext,
  isActorKind,
  scopeOf,
  type TenantContextRecord,
  type TenantScope,
} from '../domain/tenant-context';
import type { AuthenticatedPrincipal, AuthenticatedPrincipalPort, RequestIdSource, TenantAccessDirectory } from './ports';

// The tenant-context resolver: derives a trusted CTR-TEN-001 context from the authenticated
// principal and an UNTRUSTED scope selection from the client, through the directory port.
//
// - The selection may name a workspace, a business and a page, and nothing else. A client-supplied
//   actor, locale, timezone, request, correlation or causation id is refused, not ignored: the
//   actor comes from the principal port, the ids from the id source, locale and timezone are
//   CTR-TEN-001's constants. (Q5: an inbound correlation id is never honoured; always minting is
//   the safer reading until CTR-OBS-001's propagation rules exist.)
// - A scope the directory does not admit, for whatever reason, gets TENANT_SCOPE_DENIED: a member
//   of one workspace naming another and anyone naming a workspace that does not exist receive the
//   same bytes, given the same minted correlation id.
// - A failing directory or principal port gives PLATFORM_TEMPORARY; nothing from the failure is
//   read, let alone copied.
// - A context it returns is frozen and recorded as minted. The envelope builders refuse any other
//   object, so an `as` cast or a JSON round trip does not make a context.

// A0's inference (manifest open_blockers, Q2): ids are held to ^[A-Za-z0-9._:-]{1,128}$, the
// database's narrowing of CTR-TEN-001's ids (db/foundation/migrations/174_job_tenant_context.sql)
// and within CTR-API-001's 128 bound. CTR-TEN-001 itself is unbounded, and its checker stays so.
export const TENANT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

const SELECTION_KEYS = ['workspace_id', 'business_profile_id', 'page_context_profile_id'];

const MINTED = new WeakSet<object>();
const TENANT_CONTEXT_BRAND: unique symbol = Symbol('platform-kernel.tenant-context');

export type TenantContext = TenantContextRecord & { readonly [TENANT_CONTEXT_BRAND]: true };

export type TenantContextResolution =
  | { readonly ok: true; readonly context: TenantContext }
  | { readonly ok: false; readonly error: StableError };

export interface TenantContextDependencies {
  readonly principal: AuthenticatedPrincipalPort;
  readonly directory: TenantAccessDirectory;
  readonly ids: RequestIdSource;
}

// True only for an object this module's resolver returned. Not a shape check.
export const isMintedTenantContext = (value: unknown): value is TenantContext =>
  typeof value === 'object' && value !== null && MINTED.has(value);

type Selection = { readonly ok: true; readonly scope: TenantScope } | { readonly ok: false; readonly error: StableErrorDefinition };

// A0's inference (manifest open_blockers, Q3): a page without a business is refused, mirroring
// app.member_scope_admits_page; CTR-TEN-001's schema accepts it.
function readSelection(selection: unknown): Selection {
  const invalid = { ok: false, error: TENANT_SELECTION_INVALID } as const;
  if (!isObject(selection) || !hasOnlyKeys(selection, SELECTION_KEYS)) return invalid;
  // Each property is read once, so a getter cannot answer the checks and the copy differently.
  const { workspace_id: workspace, business_profile_id: business, page_context_profile_id: page } = selection;
  const hasBusiness = hasOwn(selection, 'business_profile_id');
  const hasPage = hasOwn(selection, 'page_context_profile_id');
  if (typeof workspace !== 'string') return invalid;
  if (hasBusiness && typeof business !== 'string') return invalid;
  if (hasPage && typeof page !== 'string') return invalid;
  if (hasPage && !hasBusiness) return invalid;
  const scope: TenantScope = {
    workspace_id: workspace,
    ...(typeof business === 'string' ? { business_profile_id: business } : {}),
    ...(typeof page === 'string' ? { page_context_profile_id: page } : {}),
  };
  // An id outside the minted shape names nothing that can exist: the same answer as any other
  // scope that is not admitted.
  const ids = [scope.workspace_id, scope.business_profile_id, scope.page_context_profile_id];
  if (!ids.every((id) => id === undefined || TENANT_ID_PATTERN.test(id))) return { ok: false, error: TENANT_SCOPE_DENIED };
  return { ok: true, scope };
}

const isPrincipal = (value: unknown): value is AuthenticatedPrincipal =>
  isObject(value) && isActorKind(value.kind) && typeof value.id === 'string' && TENANT_ID_PATTERN.test(value.id);

function mintId(ids: RequestIdSource): string {
  const id = ids.mint();
  if (typeof id !== 'string' || !TENANT_ID_PATTERN.test(id)) throw new TypeError('tenant context: the id source minted an id outside the minted shape');
  return id;
}

export async function resolveTenantContext(
  dependencies: TenantContextDependencies,
  selection: unknown,
): Promise<TenantContextResolution> {
  const requestId = mintId(dependencies.ids);
  const correlationId = mintId(dependencies.ids);
  const refuse = (definition: StableErrorDefinition): TenantContextResolution =>
    ({ ok: false, error: stableError(definition, correlationId) });

  let principal: AuthenticatedPrincipal | null;
  try {
    principal = await dependencies.principal.current();
  } catch {
    return refuse(PLATFORM_TEMPORARY);
  }
  if (principal === null || !isPrincipal(principal)) return refuse(TENANT_UNAUTHENTICATED);

  const read = readSelection(selection);
  if (!read.ok) return refuse(read.error);

  const actor = Object.freeze({ kind: principal.kind, id: principal.id });
  let admitted: boolean;
  try {
    admitted = (await dependencies.directory.admits(actor, read.scope)) === true;
  } catch {
    return refuse(PLATFORM_TEMPORARY);
  }
  if (!admitted) return refuse(TENANT_SCOPE_DENIED);

  const record: TenantContextRecord = {
    ...read.scope,
    actor,
    request_id: requestId,
    correlation_id: correlationId,
    locale: TENANT_LOCALE,
    timezone: TENANT_TIMEZONE,
  };
  if (!checkTenantContext(record)) throw new TypeError('tenant context: the resolved record does not satisfy CTR-TEN-001');
  // The symbol brand is for the type checker; JSON drops it, and a spread copies it onto an object
  // that MINTED does not hold, so only MINTED decides.
  const context: TenantContext = Object.freeze({ ...record, [TENANT_CONTEXT_BRAND]: true as const });
  MINTED.add(context);
  return { ok: true, context };
}

// The plain CTR-TEN-001 record of a minted context, as an envelope carries it.
export function tenantContextRecordOf(context: TenantContext): TenantContextRecord {
  return Object.freeze({ ...scopeOf(context), actor: context.actor, request_id: context.request_id, correlation_id: context.correlation_id, locale: context.locale, timezone: context.timezone });
}
