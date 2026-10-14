import { hasOnlyKeys, hasRequired, isObject, isStringWithin, optional, type JsonObject } from './json-shape';

// CTR-TEN-001 (Trusted Tenant Context), contract-catalog/shared-kernel/ctr-ten-001/schema.json.
// The record and a checker that accepts exactly what the shipped schema accepts. The schema itself
// accepts a page without a business and ids of any length; the resolver's stricter rules
// (application/tenant-context.ts) are A0's inference and are not applied here.

export const TENANT_LOCALE = 'th-TH';
export const TENANT_TIMEZONE = 'Asia/Bangkok';
export const ACTOR_KINDS = ['user', 'system_actor'] as const;

export type ActorKind = (typeof ACTOR_KINDS)[number];

export interface Actor {
  readonly kind: ActorKind;
  readonly id: string;
}

// The tenant scope: a workspace, optionally narrowed to a business, optionally narrowed to a page.
export interface TenantScope {
  readonly workspace_id: string;
  readonly business_profile_id?: string;
  readonly page_context_profile_id?: string;
}

export interface TenantContextRecord extends TenantScope {
  readonly actor: Actor;
  readonly request_id: string;
  readonly correlation_id: string;
  readonly causation_id?: string;
  readonly locale: typeof TENANT_LOCALE;
  readonly timezone: typeof TENANT_TIMEZONE;
}

export const TENANT_CONTEXT_KEYS = [
  'workspace_id',
  'business_profile_id',
  'page_context_profile_id',
  'actor',
  'request_id',
  'correlation_id',
  'causation_id',
  'locale',
  'timezone',
] as const;

const REQUIRED = ['workspace_id', 'actor', 'request_id', 'correlation_id', 'locale', 'timezone'];
const nonEmpty = (value: unknown): boolean => isStringWithin(value, 1);

export const isActorKind = (value: unknown): value is ActorKind =>
  ACTOR_KINDS.some((kind) => kind === value);

const checkActor = (value: unknown): value is Actor =>
  isObject(value)
  && hasRequired(value, ['kind', 'id'])
  && hasOnlyKeys(value, ['kind', 'id'])
  && isActorKind(value.kind)
  && nonEmpty(value.id);

export function checkTenantContext(value: unknown): value is TenantContextRecord {
  if (!isObject(value)) return false;
  const record: JsonObject = value;
  return hasRequired(record, REQUIRED)
    && hasOnlyKeys(record, TENANT_CONTEXT_KEYS)
    && nonEmpty(record.workspace_id)
    && optional(record, 'business_profile_id', nonEmpty)
    && optional(record, 'page_context_profile_id', nonEmpty)
    && checkActor(record.actor)
    && nonEmpty(record.request_id)
    && nonEmpty(record.correlation_id)
    && optional(record, 'causation_id', nonEmpty)
    && record.locale === TENANT_LOCALE
    && record.timezone === TENANT_TIMEZONE;
}

// The scope a context names, as a fresh object with only the scope's own keys.
export function scopeOf(context: TenantScope): TenantScope {
  return {
    workspace_id: context.workspace_id,
    ...(context.business_profile_id === undefined ? {} : { business_profile_id: context.business_profile_id }),
    ...(context.page_context_profile_id === undefined ? {} : { page_context_profile_id: context.page_context_profile_id }),
  };
}
