// Consumer tests driven by the catalog's own fixtures (manifest acceptance criterion 2): each
// checker accepts every valid fixture and rejects every invalid one its contract manifest lists,
// the listed fixtures equal the files in examples/, and the constants the code pins equal the
// schemas' values. This test file is the only place under domain/ that reads a file: it reads the
// catalog through node:fs to load fixtures, which the code under test never does.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ACCEPTED_KEYS, ACCEPTED_REQUIRED, API_VERSION, ENVELOPE_ID_MAX_LENGTH, ENVELOPE_KEYS, ENVELOPE_KINDS, ENVELOPE_REQUIRED, checkEnvelope } from './envelope';
import {
  IDEMPOTENCY_ID_MAX_LENGTH,
  IDEMPOTENCY_KEYS,
  IDEMPOTENCY_REQUIRED,
  IDEMPOTENCY_SCOPE_KEYS,
  IDEMPOTENCY_STATES,
  OPERATION_PATTERN_SOURCE,
  PAYLOAD_HASH_PATTERN_SOURCE,
  checkIdempotencyRecord,
} from './idempotency';
import { PRIVATE_REFERENCE_MAX_LENGTH, PRIVATE_REFERENCE_PATTERN_SOURCE } from './private-reference';
import { ERROR_CATEGORIES, FIELD_ERROR_KEYS, STABLE_ERROR_KEYS, STABLE_ERROR_REQUIRED, checkStableError } from './stable-error';
import { ACTOR_KEYS, ACTOR_KINDS, TENANT_CONTEXT_KEYS, TENANT_CONTEXT_REQUIRED, TENANT_LOCALE, TENANT_TIMEZONE, checkTenantContext } from './tenant-context';

const catalog = new URL('../../../../contract-catalog/shared-kernel/', import.meta.url);
const readJson = (relative: string): unknown => {
  const parsed: unknown = JSON.parse(readFileSync(new URL(relative, catalog), 'utf8'));
  return parsed;
};

// Walks a parsed JSON value by keys and indexes; fails the test if a step is missing.
function at(value: unknown, ...path: (string | number)[]): unknown {
  let current = value;
  for (const step of path) {
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, step)) {
      throw new Error(`missing ${path.join('.')}`);
    }
    current = (current as Record<string | number, unknown>)[step];
  }
  return current;
}

const CONTRACTS = [
  { id: 'ctr-ten-001', check: checkTenantContext },
  { id: 'ctr-api-001', check: checkEnvelope },
  { id: 'ctr-err-001', check: checkStableError },
  { id: 'ctr-idm-001', check: checkIdempotencyRecord },
] as const;

describe.each(CONTRACTS)('$id fixtures', ({ id, check }) => {
  const listed = at(readJson(`${id}/manifest.json`), 'fixtures');
  if (!Array.isArray(listed)) throw new Error(`${id}: fixtures is not a list`);
  const fixtures = listed.map(String);

  it('lists exactly the files in examples/', () => {
    const files = readdirSync(new URL(`${id}/examples/`, catalog)).map((name) => `examples/${name}`).sort();
    expect([...fixtures].sort()).toEqual(files);
    expect(fixtures.length).toBeGreaterThan(0);
    expect(fixtures.every((name) => /^examples\/(valid|invalid)(-[a-z0-9-]+)?\.json$/.test(name))).toBe(true);
  });

  it.each(fixtures.filter((name) => name.startsWith('examples/valid')))('accepts %s', (name) => {
    expect(check(readJson(`${id}/${name}`))).toBe(true);
  });

  it.each(fixtures.filter((name) => name.startsWith('examples/invalid')))('rejects %s', (name) => {
    expect(check(readJson(`${id}/${name}`))).toBe(false);
  });
});

describe('pinned constants equal the schemas', () => {
  const ten = readJson('ctr-ten-001/schema.json');
  const api = readJson('ctr-api-001/schema.json');
  const err = readJson('ctr-err-001/schema.json');
  const idm = readJson('ctr-idm-001/schema.json');

  it('CTR-TEN-001: locale, timezone, actor kinds and keys', () => {
    expect(at(ten, 'properties', 'locale', 'const')).toBe(TENANT_LOCALE);
    expect(at(ten, 'properties', 'timezone', 'const')).toBe(TENANT_TIMEZONE);
    expect(at(ten, 'properties', 'actor', 'properties', 'kind', 'enum')).toEqual([...ACTOR_KINDS]);
    expect(Object.keys(at(ten, 'properties') as object).sort()).toEqual([...TENANT_CONTEXT_KEYS].sort());
  });

  it('CTR-API-001: the API version, the id bounds, the kinds and the private-reference rule', () => {
    expect(at(api, 'properties', 'api_version', 'minimum')).toBe(API_VERSION);
    for (const key of ['request_id', 'correlation_id', 'causation_id']) {
      expect(at(api, 'properties', key, 'maxLength')).toBe(ENVELOPE_ID_MAX_LENGTH);
    }
    expect(at(api, 'properties', 'accepted', 'properties', 'job_id', 'maxLength')).toBe(ENVELOPE_ID_MAX_LENGTH);
    expect(at(api, 'properties', 'kind', 'enum')).toEqual([...ENVELOPE_KINDS]);
    for (const key of ['status_ref', 'deep_link_ref']) {
      expect(at(api, 'properties', 'accepted', 'properties', key, 'pattern')).toBe(PRIVATE_REFERENCE_PATTERN_SOURCE);
      expect(at(api, 'properties', 'accepted', 'properties', key, 'maxLength')).toBe(PRIVATE_REFERENCE_MAX_LENGTH);
    }
  });

  it('CTR-ERR-001: the categories and the empty details', () => {
    expect(at(err, 'properties', 'category', 'enum')).toEqual([...ERROR_CATEGORIES]);
    expect(at(err, 'properties', 'details', 'maxProperties')).toBe(0);
  });

  it('CTR-IDM-001: the bounds, the patterns, the states and the shared private-reference rule', () => {
    expect(at(idm, 'properties', 'idempotency_key', 'maxLength')).toBe(IDEMPOTENCY_ID_MAX_LENGTH);
    expect(at(idm, 'properties', 'scope', 'properties', 'workspace_id', 'maxLength')).toBe(IDEMPOTENCY_ID_MAX_LENGTH);
    expect(at(idm, 'properties', 'correlation_id', 'maxLength')).toBe(IDEMPOTENCY_ID_MAX_LENGTH);
    expect(at(idm, 'properties', 'scope', 'properties', 'operation', 'pattern')).toBe(OPERATION_PATTERN_SOURCE);
    expect(at(idm, 'properties', 'payload_hash', 'pattern')).toBe(PAYLOAD_HASH_PATTERN_SOURCE);
    expect(at(idm, 'properties', 'state', 'enum')).toEqual([...IDEMPOTENCY_STATES]);
    expect(at(idm, 'properties', 'result_ref', 'pattern')).toBe(PRIVATE_REFERENCE_PATTERN_SOURCE);
    expect(at(idm, 'properties', 'result_ref', 'maxLength')).toBe(PRIVATE_REFERENCE_MAX_LENGTH);
  });
});

describe('checkers count lengths in code points, as the schemas do', () => {
  const valid = readJson('ctr-api-001/examples/valid-success.json');
  const withRequestId = (requestId: string): unknown => ({ ...(valid as object), request_id: requestId });

  it('accepts 128 astral characters as an envelope id and refuses 129', () => {
    expect(checkEnvelope(withRequestId('\u{1F600}'.repeat(128)))).toBe(true);
    expect(checkEnvelope(withRequestId('\u{1F600}'.repeat(129)))).toBe(false);
  });
});

// Each checker's allowed and required keys, at every object level the schema closes, equal the
// schema's `properties` and `required` (Q0-261-3, C0-261-3): a key dropped from or added to a list
// fails here, not only when a fixture happens to carry it.
describe('checker key lists equal the schemas', () => {
  const keysAt = (schema: unknown, ...path: string[]): string[] => Object.keys(at(schema, ...path, 'properties') as object).sort();
  const requiredAt = (schema: unknown, ...path: string[]): string[] => [...(at(schema, ...path, 'required') as string[])].sort();
  const sorted = (list: readonly string[]): string[] => [...list].sort();
  const ten = readJson('ctr-ten-001/schema.json');
  const api = readJson('ctr-api-001/schema.json');
  const err = readJson('ctr-err-001/schema.json');
  const idm = readJson('ctr-idm-001/schema.json');

  it.each([
    ['CTR-TEN-001', ten, [], TENANT_CONTEXT_KEYS, TENANT_CONTEXT_REQUIRED],
    ['CTR-TEN-001 actor', ten, ['properties', 'actor'], ACTOR_KEYS, ACTOR_KEYS],
    ['CTR-API-001', api, [], ENVELOPE_KEYS, ENVELOPE_REQUIRED],
    ['CTR-API-001 accepted', api, ['properties', 'accepted'], ACCEPTED_KEYS, ACCEPTED_REQUIRED],
    ['CTR-ERR-001', err, [], STABLE_ERROR_KEYS, STABLE_ERROR_REQUIRED],
    ['CTR-ERR-001 field_errors item', err, ['properties', 'field_errors', 'items'], FIELD_ERROR_KEYS, FIELD_ERROR_KEYS],
    ['CTR-IDM-001', idm, [], IDEMPOTENCY_KEYS, IDEMPOTENCY_REQUIRED],
    ['CTR-IDM-001 scope', idm, ['properties', 'scope'], IDEMPOTENCY_SCOPE_KEYS, IDEMPOTENCY_SCOPE_KEYS],
  ] as const)('%s', (_label, schema, path, keys, required) => {
    expect(sorted(keys)).toEqual(keysAt(schema, ...path));
    expect(sorted(required)).toEqual(requiredAt(schema, ...path));
    expect(at(schema, ...path, 'additionalProperties')).toBe(false);
  });

  it('CTR-API-001: an envelope carrying causation_id is accepted, and one over the bound refused', () => {
    const valid = readJson('ctr-api-001/examples/valid-success.json') as object;
    expect(checkEnvelope({ ...valid, causation_id: 'cau_synthetic_0001' })).toBe(true);
    expect(checkEnvelope({ ...valid, causation_id: 'c'.repeat(ENVELOPE_ID_MAX_LENGTH + 1) })).toBe(false);
  });
});

// Required keys are OWN keys, as the validator reads them (Q0-261-3): a record whose keys are all
// inherited from a valid fixture is refused by every checker. JSON input cannot carry inherited
// keys, so neither the fixtures nor a JSON fuzz reach this.
describe.each(CONTRACTS)('$id refuses a record whose required keys are only inherited', ({ id, check }) => {
  const listed = at(readJson(`${id}/manifest.json`), 'fixtures');
  const valid = (Array.isArray(listed) ? listed.map(String) : []).filter((name) => name.startsWith('examples/valid'));

  it.each(valid)('%s as a prototype', (name) => {
    const fixture = readJson(`${id}/${name}`);
    expect(check(fixture)).toBe(true);
    expect(check(Object.create(fixture as object))).toBe(false);
  });
});

// The `date-time` format is a real instant, not only the RFC 3339 shape (Q0-261-3, C0-261-3).
describe('CTR-IDM-001 date-time is a real instant', () => {
  const valid = readJson('ctr-idm-001/examples/valid-completed-replay.json') as object;

  it.each(['2026-13-45T10:00:00Z', '2026-00-10T10:00:00Z', '2026-08-31T25:00:00Z', '2026-08-31T10:61:00Z'])('refuses created_at %s', (instant) => {
    expect(checkIdempotencyRecord({ ...valid, created_at: instant })).toBe(false);
    expect(checkIdempotencyRecord({ ...valid, completed_at: instant })).toBe(false);
  });

  it('accepts a real instant with an offset and fractional seconds', () => {
    expect(checkIdempotencyRecord({ ...valid, created_at: '2026-08-31T17:00:00.250+07:00' })).toBe(true);
  });
});
