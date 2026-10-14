import { hasOnlyKeys, hasOwn, hasRequired, isInteger, isObject, isStringWithin, optional, type JsonObject } from './json-shape';
import { isPrivateReference } from './private-reference';
import { checkStableError, type StableError } from './stable-error';
import { checkTenantContext, type TenantContextRecord } from './tenant-context';

// CTR-API-001 (API command/query envelope), contract-catalog/shared-kernel/ctr-api-001/schema.json:
// the three envelope kinds and a checker that accepts exactly what the shipped schema accepts,
// composing CTR-TEN-001 and CTR-ERR-001 as the schema's $refs do. The builders that make envelopes
// from a resolved context are in application/envelope.ts.

// The version the builders write. The schema pins only `minimum: 1`, so the checker accepts any
// integer from 1; writing 1 is the builders' choice.
export const API_VERSION = 1;
export const ENVELOPE_ID_MAX_LENGTH = 128;
export const ENVELOPE_KINDS = ['success', 'error', 'accepted'] as const;

export type EnvelopeKind = (typeof ENVELOPE_KINDS)[number];

export interface AcceptedReceipt {
  readonly job_id: string;
  readonly status_ref: string;
  readonly deep_link_ref?: string;
}

interface EnvelopeHeader {
  readonly api_version: number;
  readonly request_id: string;
  readonly correlation_id: string;
  readonly causation_id?: string;
  readonly tenant_context: TenantContextRecord;
}

// `data` is not constrained by CTR-API-001 (its x-leakage-boundary): per-command response schemas
// must constrain it; this envelope cannot.
export interface SuccessEnvelope extends EnvelopeHeader {
  readonly kind: 'success';
  readonly data: JsonObject;
}

export interface ErrorEnvelope extends EnvelopeHeader {
  readonly kind: 'error';
  readonly error: StableError;
}

export interface AcceptedEnvelope extends EnvelopeHeader {
  readonly kind: 'accepted';
  readonly accepted: AcceptedReceipt;
}

export type Envelope = SuccessEnvelope | ErrorEnvelope | AcceptedEnvelope;

// The key lists below are pinned to the schema's properties and required by
// contract-fixtures.test.ts.
export const ENVELOPE_KEYS = ['api_version', 'kind', 'request_id', 'correlation_id', 'causation_id', 'tenant_context', 'data', 'error', 'accepted'] as const;
export const ENVELOPE_REQUIRED = ['api_version', 'kind', 'request_id', 'correlation_id', 'tenant_context'] as const;
export const ACCEPTED_KEYS = ['job_id', 'status_ref', 'deep_link_ref'] as const;
export const ACCEPTED_REQUIRED = ['job_id', 'status_ref'] as const;
const boundedId = (value: unknown): boolean => isStringWithin(value, 1, ENVELOPE_ID_MAX_LENGTH);

export const isEnvelopeKind = (value: unknown): value is EnvelopeKind =>
  ENVELOPE_KINDS.some((kind) => kind === value);

export const checkAcceptedReceipt = (value: unknown): value is AcceptedReceipt =>
  isObject(value)
  && hasRequired(value, ACCEPTED_REQUIRED)
  && hasOnlyKeys(value, ACCEPTED_KEYS)
  && boundedId(value.job_id)
  && isPrivateReference(value.status_ref)
  && optional(value, 'deep_link_ref', isPrivateReference);

// The schema's allOf: each kind requires its own branch and forbids the other two.
const BRANCH: Readonly<Record<EnvelopeKind, 'data' | 'error' | 'accepted'>> = {
  success: 'data',
  error: 'error',
  accepted: 'accepted',
};

export function checkEnvelope(value: unknown): value is Envelope {
  if (!isObject(value)) return false;
  const record: JsonObject = value;
  if (!(hasRequired(record, ENVELOPE_REQUIRED)
    && hasOnlyKeys(record, ENVELOPE_KEYS)
    && isInteger(record.api_version) && record.api_version >= 1
    && isEnvelopeKind(record.kind)
    && boundedId(record.request_id)
    && boundedId(record.correlation_id)
    && optional(record, 'causation_id', boundedId)
    && checkTenantContext(record.tenant_context)
    && optional(record, 'data', isObject)
    && optional(record, 'error', checkStableError)
    && optional(record, 'accepted', checkAcceptedReceipt))) return false;
  const own = BRANCH[record.kind];
  return Object.values(BRANCH).every((branch) => hasOwn(record, branch) === (branch === own));
}
