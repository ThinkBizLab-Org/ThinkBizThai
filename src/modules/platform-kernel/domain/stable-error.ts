import { hasOnlyKeys, hasRequired, isInteger, isObject, isStringWithin, optional, type JsonObject } from './json-shape';

// CTR-ERR-001 (Stable Error), contract-catalog/shared-kernel/ctr-err-001/schema.json: the record, a
// checker that accepts exactly what the shipped schema accepts, and the only factory platform-kernel
// uses to make one. The factory takes a definition and a correlation id and nothing else: it has no
// parameter for a cause, so no thrown value's message, name or stack can reach an error, and it
// always writes `details: {}` (the schema's maxProperties 0).

export const ERROR_CATEGORIES = [
  'validation',
  'auth',
  'permission',
  'conflict',
  'rate_limit',
  'provider',
  'temporary',
  'internal',
] as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

export interface FieldError {
  readonly field: string;
  readonly code: string;
}

export type EmptyDetails = { readonly [key: string]: never };

export interface StableError {
  readonly code: string;
  readonly message_key: string;
  readonly category: ErrorCategory;
  readonly retryable: boolean;
  readonly retry_after_seconds?: number;
  readonly field_errors?: readonly FieldError[];
  readonly correlation_id: string;
  readonly details: EmptyDetails;
}

// The key lists below are pinned to the schema's properties and required by
// contract-fixtures.test.ts.
export const STABLE_ERROR_KEYS = ['code', 'message_key', 'category', 'retryable', 'retry_after_seconds', 'field_errors', 'correlation_id', 'details'] as const;
export const STABLE_ERROR_REQUIRED = ['code', 'message_key', 'category', 'retryable', 'correlation_id', 'details'] as const;
// field_errors items: both keys allowed, both required.
export const FIELD_ERROR_KEYS = ['field', 'code'] as const;
const nonEmpty = (value: unknown): boolean => isStringWithin(value, 1);

export const isErrorCategory = (value: unknown): value is ErrorCategory =>
  ERROR_CATEGORIES.some((category) => category === value);

const checkFieldError = (value: unknown): value is FieldError =>
  isObject(value)
  && hasRequired(value, FIELD_ERROR_KEYS)
  && hasOnlyKeys(value, FIELD_ERROR_KEYS)
  && nonEmpty(value.field)
  && nonEmpty(value.code);

export function checkStableError(value: unknown): value is StableError {
  if (!isObject(value)) return false;
  const record: JsonObject = value;
  return hasRequired(record, STABLE_ERROR_REQUIRED)
    && hasOnlyKeys(record, STABLE_ERROR_KEYS)
    && nonEmpty(record.code)
    && nonEmpty(record.message_key)
    && isErrorCategory(record.category)
    && typeof record.retryable === 'boolean'
    && optional(record, 'retry_after_seconds', (seconds) => isInteger(seconds) && seconds >= 1)
    && optional(record, 'field_errors', (list) => Array.isArray(list) && list.every(checkFieldError))
    && nonEmpty(record.correlation_id)
    && isObject(record.details)
    && Object.keys(record.details).length === 0;
}

// What a stable error is, apart from the request it belongs to. Definitions are constants written
// in code (domain/platform-errors.ts), never built from a caught value.
export interface StableErrorDefinition {
  readonly code: string;
  readonly messageKey: string;
  readonly category: ErrorCategory;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;
}

export function defineStableError(definition: StableErrorDefinition): StableErrorDefinition {
  // Probe the definition with a placeholder id; a definition the schema would refuse fails here,
  // where it is written, not on the request that first uses it.
  return Object.freeze(definitionOf(stableError(definition, 'definition-check')));
}

// Builds a new error from the definition's named fields only. Field errors are copied field by
// field, so nothing but `field` and `code` strings can ride along.
export function stableError(
  definition: StableErrorDefinition,
  correlationId: string,
  fieldErrors?: readonly FieldError[],
): StableError {
  const error: StableError = {
    code: definition.code,
    message_key: definition.messageKey,
    category: definition.category,
    retryable: definition.retryable,
    ...(definition.retryAfterSeconds === undefined ? {} : { retry_after_seconds: definition.retryAfterSeconds }),
    ...(fieldErrors === undefined
      ? {}
      : { field_errors: Object.freeze(fieldErrors.map((entry) => Object.freeze({ field: entry.field, code: entry.code }))) }),
    correlation_id: correlationId,
    details: Object.freeze({}),
  };
  if (!checkStableError(error)) throw new TypeError('stable error: the definition or correlation id does not satisfy CTR-ERR-001');
  return Object.freeze(error);
}

// The definition an existing error was built from, so an error can be re-issued under another
// correlation id (application/envelope.ts) without copying anything the definition does not name.
export function definitionOf(error: StableError): StableErrorDefinition {
  return {
    code: error.code,
    messageKey: error.message_key,
    category: error.category,
    retryable: error.retryable,
    ...(error.retry_after_seconds === undefined ? {} : { retryAfterSeconds: error.retry_after_seconds }),
  };
}
