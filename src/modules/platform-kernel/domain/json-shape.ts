// Shape predicates the four checkers share. Each one reads a JSON value the way the repository's
// schema validator (test-kits/contracts/json-schema-subset.mjs) reads it, so a checker built from
// them accepts exactly what the shipped schema accepts: an object is a non-null, non-array object;
// a required key is an OWN key; a string's length is counted in Unicode code points; a pattern is
// compiled with the `u` flag.

export type JsonObject = { readonly [key: string]: unknown };

export const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const hasOwn = (value: JsonObject, key: string): boolean => Object.hasOwn(value, key);

export const hasRequired = (value: JsonObject, keys: readonly string[]): boolean =>
  keys.every((key) => hasOwn(value, key));

export const hasOnlyKeys = (value: JsonObject, allowed: readonly string[]): boolean =>
  Object.keys(value).every((key) => allowed.includes(key));

export const codePointLength = (value: string): number => [...value].length;

export const isStringWithin = (value: unknown, minLength: number, maxLength = Number.POSITIVE_INFINITY): value is string =>
  typeof value === 'string' && codePointLength(value) >= minLength && codePointLength(value) <= maxLength;

export const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);

export const matches = (value: unknown, pattern: RegExp): value is string => typeof value === 'string' && pattern.test(value);

// An absent optional property passes; a present one must satisfy the rule.
export const optional = (value: JsonObject, key: string, rule: (property: unknown) => boolean): boolean =>
  !hasOwn(value, key) || rule(value[key]);

// The validator's `format: "date-time"`: an RFC 3339 timestamp that is also a real instant
// (`Date.parse` is a pure parse here; it reads no clock).
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
export const isDateTime = (value: unknown): value is string =>
  typeof value === 'string' && RFC3339.test(value) && !Number.isNaN(Date.parse(value));
