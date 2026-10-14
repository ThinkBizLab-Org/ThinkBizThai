// Consumer tests driven by the catalog's own fixtures (manifest acceptance criterion 2): each
// checker accepts every valid fixture and rejects every invalid one its contract manifest lists,
// the listed fixtures equal the files in examples/, and the constants the code pins equal the
// schemas' values. This test file is the only place under domain/ that reads a file: it reads the
// catalog through node:fs to load fixtures, which the code under test never does.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { API_VERSION, ENVELOPE_ID_MAX_LENGTH, ENVELOPE_KINDS, checkEnvelope } from './envelope';
import {
  IDEMPOTENCY_ID_MAX_LENGTH,
  IDEMPOTENCY_STATES,
  OPERATION_PATTERN_SOURCE,
  PAYLOAD_HASH_PATTERN_SOURCE,
  checkIdempotencyRecord,
} from './idempotency';
import { PRIVATE_REFERENCE_MAX_LENGTH, PRIVATE_REFERENCE_PATTERN_SOURCE } from './private-reference';
import { ERROR_CATEGORIES, checkStableError } from './stable-error';
import { ACTOR_KINDS, TENANT_CONTEXT_KEYS, TENANT_LOCALE, TENANT_TIMEZONE, checkTenantContext } from './tenant-context';

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
