import { hasOnlyKeys, hasOwn, hasRequired, isDateTime, isObject, isStringWithin, matches, optional, type JsonObject } from './json-shape';
import { IDEMPOTENCY_CONFLICT } from './platform-errors';
import { isPrivateReference } from './private-reference';
import { checkStableError, stableError, type StableError } from './stable-error';

// CTR-IDM-001 (Command idempotency record), contract-catalog/shared-kernel/ctr-idm-001/schema.json:
// the record, a checker that accepts exactly what the shipped schema accepts, and the outcome of
// meeting a stored record again (replay, conflict, independent). No hash algorithm is pinned: the
// payload hash is `<algorithm>:<hex>` for any algorithm name the schema admits (blake3 included,
// the contract's agreement witness). The store, its lock strategy and its retention are not
// inferred here (the contract's freeze_boundary).

export const IDEMPOTENCY_ID_MAX_LENGTH = 128;
export const IDEMPOTENCY_STATES = ['in_progress', 'completed', 'failed'] as const;
export const PAYLOAD_HASH_PATTERN_SOURCE = '^[a-z0-9-]+:[0-9a-f]{32,128}$';
export const OPERATION_PATTERN_SOURCE = '^[a-z0-9]+(\\.[a-z0-9]+)+$';

const PAYLOAD_HASH = new RegExp(PAYLOAD_HASH_PATTERN_SOURCE, 'u');
const OPERATION = new RegExp(OPERATION_PATTERN_SOURCE, 'u');

export type IdempotencyState = (typeof IDEMPOTENCY_STATES)[number];

export interface IdempotencyScope {
  readonly workspace_id: string;
  readonly operation: string;
}

export interface IdempotencyRecord {
  readonly idempotency_key: string;
  readonly scope: IdempotencyScope;
  readonly payload_hash: string;
  readonly state: IdempotencyState;
  readonly created_at: string;
  readonly completed_at?: string;
  readonly result_ref?: string;
  readonly error?: StableError;
  readonly correlation_id?: string;
}

// The key lists below are pinned to the schema's properties and required by
// contract-fixtures.test.ts.
export const IDEMPOTENCY_KEYS = ['idempotency_key', 'scope', 'payload_hash', 'state', 'created_at', 'completed_at', 'result_ref', 'error', 'correlation_id'] as const;
export const IDEMPOTENCY_REQUIRED = ['idempotency_key', 'scope', 'payload_hash', 'state', 'created_at'] as const;
// scope: both keys allowed, both required.
export const IDEMPOTENCY_SCOPE_KEYS = ['workspace_id', 'operation'] as const;
const boundedId = (value: unknown): boolean => isStringWithin(value, 1, IDEMPOTENCY_ID_MAX_LENGTH);
const isPayloadHash = (value: unknown): boolean => matches(value, PAYLOAD_HASH);

export const isIdempotencyState = (value: unknown): value is IdempotencyState =>
  IDEMPOTENCY_STATES.some((state) => state === value);

const checkScope = (value: unknown): value is IdempotencyScope =>
  isObject(value)
  && hasRequired(value, IDEMPOTENCY_SCOPE_KEYS)
  && hasOnlyKeys(value, IDEMPOTENCY_SCOPE_KEYS)
  && boundedId(value.workspace_id)
  && matches(value.operation, OPERATION);

// The schema's allOf, per state: which of completed_at, result_ref and error must be present (true)
// and which must be absent (false).
const PRESENCE: Readonly<Record<IdempotencyState, Readonly<Record<'completed_at' | 'result_ref' | 'error', boolean>>>> = {
  completed: { completed_at: true, result_ref: true, error: false },
  failed: { completed_at: true, result_ref: false, error: true },
  in_progress: { completed_at: false, result_ref: false, error: false },
};

export function checkIdempotencyRecord(value: unknown): value is IdempotencyRecord {
  if (!isObject(value)) return false;
  const record: JsonObject = value;
  if (!(hasRequired(record, IDEMPOTENCY_REQUIRED)
    && hasOnlyKeys(record, IDEMPOTENCY_KEYS)
    && boundedId(record.idempotency_key)
    && checkScope(record.scope)
    && isPayloadHash(record.payload_hash)
    && isIdempotencyState(record.state)
    && isDateTime(record.created_at)
    && optional(record, 'completed_at', isDateTime)
    && optional(record, 'result_ref', isPrivateReference)
    && optional(record, 'error', checkStableError)
    && optional(record, 'correlation_id', boundedId))) return false;
  const rule = PRESENCE[record.state];
  return Object.entries(rule).every(([key, present]) => hasOwn(record, key) === present);
}

// What a new command presents: its key, its scope and the hash of its payload.
export interface IdempotencyRequest {
  readonly idempotency_key: string;
  readonly scope: IdempotencyScope;
  readonly payload_hash: string;
}

export type IdempotencyOutcome =
  | { readonly kind: 'independent' }
  | { readonly kind: 'replay'; readonly record: IdempotencyRecord }
  | { readonly kind: 'conflict'; readonly error: StableError };

const sameScope = (a: IdempotencyScope, b: IdempotencyScope): boolean =>
  a.workspace_id === b.workspace_id && a.operation === b.operation;

// `stored` is the record the store found for the request's key, if any.
// - No record, another key, or another scope (workspace or operation): independent. The key's
//   scope includes the workspace and the operation (ID-001), so the same key elsewhere is unrelated.
// - Same key and scope, same payload hash: replay (API-002: the same result is returned).
// - Same key and scope, different payload hash: conflict, an ERR `conflict`.
// A0's inference: hashes are compared as whole strings, so the same key presented with another
// algorithm's hash is a conflict, not a replay; equality across algorithms cannot be shown.
// A0's inference against CTR-IDM-001 (A1-AUD1015-4): replay is matched on the key, the workspace and
// the operation, not the actor, because the contract's record is closed and names no actor, so
// neither this outcome nor a store holding conformant records can match on one; adding it is a
// Candidate change for the contract's owner (manifest open_blockers, Q9). Until then the caller that
// computes `payload_hash` binds the actor (kind and id) into the hashed input, so another member of
// the workspace presenting the same key and payload gets a conflict, not the first member's
// result_ref.
export function idempotencyOutcome(
  stored: IdempotencyRecord | undefined,
  request: IdempotencyRequest,
  correlationId: string,
): IdempotencyOutcome {
  if (!(boundedId(request.idempotency_key) && checkScope(request.scope) && isPayloadHash(request.payload_hash))) {
    throw new TypeError('idempotency: the request does not satisfy CTR-IDM-001');
  }
  if (stored === undefined) return { kind: 'independent' };
  if (!checkIdempotencyRecord(stored)) throw new TypeError('idempotency: the stored record does not satisfy CTR-IDM-001');
  if (stored.idempotency_key !== request.idempotency_key || !sameScope(stored.scope, request.scope)) {
    return { kind: 'independent' };
  }
  if (stored.payload_hash === request.payload_hash) return { kind: 'replay', record: stored };
  return { kind: 'conflict', error: stableError(IDEMPOTENCY_CONFLICT, correlationId) };
}
