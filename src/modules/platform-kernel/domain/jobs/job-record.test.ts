// CTR-JOB-001 consumer tests driven by the catalog's own fixtures (manifest acceptance criterion 2):
// the checker accepts every valid fixture and rejects every invalid one the contract's manifest
// lists, the listed fixtures equal the files in examples/, and the bounds and key lists the code pins
// equal the schema's. Like domain/contract-fixtures.test.ts, this test file reads the catalog through
// node:fs; the code under test never does.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PRIVATE_REFERENCE_MAX_LENGTH, PRIVATE_REFERENCE_PATTERN_SOURCE } from '../private-reference';
import { JOB_DEDUPE_KEY_MAX_LENGTH, JOB_ID_MAX_LENGTH, JOB_KEYS, JOB_PROGRESS_PERCENT_MAX, JOB_REQUIRED, checkJobRecord } from './job-record';

const contract = new URL('../../../../../contract-catalog/shared-kernel/ctr-job-001/', import.meta.url);
const readJson = (relative: string): unknown => {
  const parsed: unknown = JSON.parse(readFileSync(new URL(relative, contract), 'utf8'));
  return parsed;
};

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

const listed = at(readJson('manifest.json'), 'fixtures');
if (!Array.isArray(listed)) throw new Error('ctr-job-001: fixtures is not a list');
const fixtures = listed.map(String);
const schema = readJson('schema.json');
const valid = readJson('examples/valid.json') as Record<string, unknown>;

describe('CTR-JOB-001 fixtures', () => {
  it('lists exactly the files in examples/', () => {
    const files = readdirSync(new URL('examples/', contract)).map((name) => `examples/${name}`).sort();
    expect([...fixtures].sort()).toEqual(files);
    expect(fixtures.filter((name) => name.startsWith('examples/valid')).length).toBeGreaterThan(0);
    expect(fixtures.filter((name) => name.startsWith('examples/invalid')).length).toBeGreaterThan(0);
    expect(fixtures.every((name) => /^examples\/(valid|invalid)(-[a-z0-9-]+)?\.json$/.test(name))).toBe(true);
  });

  it.each(fixtures.filter((name) => name.startsWith('examples/valid')))('accepts %s', (name) => {
    expect(checkJobRecord(readJson(name))).toBe(true);
  });

  it.each(fixtures.filter((name) => name.startsWith('examples/invalid')))('rejects %s', (name) => {
    expect(checkJobRecord(readJson(name))).toBe(false);
  });
});

describe('CTR-JOB-001 pinned constants and key lists equal the schema', () => {
  it('the keys, the required keys and the closed object', () => {
    expect([...JOB_KEYS].sort()).toEqual(Object.keys(at(schema, 'properties') as object).sort());
    expect([...JOB_REQUIRED].sort()).toEqual([...(at(schema, 'required') as string[])].sort());
    expect(at(schema, 'additionalProperties')).toBe(false);
  });

  it('the bounds', () => {
    expect(at(schema, 'properties', 'job_id', 'maxLength')).toBe(JOB_ID_MAX_LENGTH);
    expect(at(schema, 'properties', 'dedupe_key', 'maxLength')).toBe(JOB_DEDUPE_KEY_MAX_LENGTH);
    expect(at(schema, 'properties', 'progress_percent', 'maximum')).toBe(JOB_PROGRESS_PERCENT_MAX);
    expect(at(schema, 'properties', 'progress_percent', 'minimum')).toBe(0);
    expect(at(schema, 'properties', 'attempt', 'minimum')).toBe(0);
    for (const key of ['job_version', 'max_attempts', 'timeout_seconds']) expect(at(schema, 'properties', key, 'minimum')).toBe(1);
  });

  it('input_ref and result_ref follow the shared private-reference rule', () => {
    for (const key of ['input_ref', 'result_ref']) {
      expect(at(schema, 'properties', key, 'pattern')).toBe(PRIVATE_REFERENCE_PATTERN_SOURCE);
      expect(at(schema, 'properties', key, 'maxLength')).toBe(PRIVATE_REFERENCE_MAX_LENGTH);
    }
  });

  it('tenant_context is CTR-TEN-001 by reference', () => {
    expect(at(schema, 'properties', 'tenant_context', '$ref')).toBe('../ctr-ten-001/schema.json');
  });

  it('the record has no status field (the freeze boundary reserves lifecycle state names)', () => {
    expect(JOB_KEYS.some((key) => /status|state/.test(key))).toBe(false);
    expect(checkJobRecord({ ...valid, status: 'queued' })).toBe(false);
  });
});

// Boundaries the fixtures do not reach, each read the way the schema validator reads it.
describe('CTR-JOB-001 checker edges', () => {
  it('counts lengths in code points: 128 astral characters are a job id, 129 are not', () => {
    expect(checkJobRecord({ ...valid, job_id: '\u{1F600}'.repeat(JOB_ID_MAX_LENGTH) })).toBe(true);
    expect(checkJobRecord({ ...valid, job_id: '\u{1F600}'.repeat(JOB_ID_MAX_LENGTH + 1) })).toBe(false);
    expect(checkJobRecord({ ...valid, dedupe_key: 'd'.repeat(JOB_DEDUPE_KEY_MAX_LENGTH) })).toBe(true);
    expect(checkJobRecord({ ...valid, dedupe_key: 'd'.repeat(JOB_DEDUPE_KEY_MAX_LENGTH + 1) })).toBe(false);
  });

  it('accepts each optional field present and absent', () => {
    const { lease_owner: _owner, lease_expires_at: _expiry, ...withoutLease } = valid;
    expect(checkJobRecord(withoutLease)).toBe(true);
    expect(checkJobRecord({ ...valid, cancel_requested_at: '2026-08-31T00:01:00Z', result_ref: 'result:job/1', last_error_code: 'job.timeout' })).toBe(true);
  });

  it('refuses a record whose required keys are only inherited', () => {
    expect(checkJobRecord(valid)).toBe(true);
    expect(checkJobRecord(Object.create(valid))).toBe(false);
  });

  it('refuses a date-time that is not a real instant', () => {
    expect(checkJobRecord({ ...valid, available_at: '2026-13-45T10:00:00Z' })).toBe(false);
    expect(checkJobRecord({ ...valid, available_at: '2026-08-31T17:00:00.250+07:00' })).toBe(true);
  });

  it('refuses a non-integer counter and a progress over 100', () => {
    expect(checkJobRecord({ ...valid, attempt: 1.5 })).toBe(false);
    expect(checkJobRecord({ ...valid, priority: 0.5 })).toBe(false);
    expect(checkJobRecord({ ...valid, progress_percent: 100 })).toBe(true);
    expect(checkJobRecord({ ...valid, progress_percent: 101 })).toBe(false);
  });

  it('refuses a tenant context outside CTR-TEN-001', () => {
    expect(checkJobRecord({ ...valid, tenant_context: { ...(valid.tenant_context as object), locale: 'en-US' } })).toBe(false);
  });
});
