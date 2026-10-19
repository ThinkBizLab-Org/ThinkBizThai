// CTR-EVT-001 consumer tests driven by the catalog's own fixtures (manifest acceptance criterion 2,
// event half): the checker accepts every valid fixture and rejects every invalid one the contract's
// manifest lists, the listed fixtures equal the files in examples/, and the bounds, patterns and key
// lists the code pins equal the schema's at every level. Like domain/jobs/job-record.test.ts, this
// test file reads the catalog through node:fs; the code under test never does.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { instantOf } from '../jobs/job-decisions';
import type { TenantContextRecord } from '../tenant-context';
import {
  EVENT_CORRELATION_ID_MAX_LENGTH,
  EVENT_ID_MAX_LENGTH,
  EVENT_IDEMPOTENCY_KEY_MAX_LENGTH,
  EVENT_KEYS,
  EVENT_METADATA_KEYS,
  EVENT_PRODUCER_FIELD_MAX_LENGTH,
  EVENT_PRODUCER_KEYS,
  EVENT_REQUIRED,
  EVENT_SCHEMA_REF_MAX_LENGTH,
  EVENT_SCHEMA_REF_PATTERN_SOURCE,
  EVENT_SUBJECT_ID_MAX_LENGTH,
  EVENT_SUBJECT_KEYS,
  EVENT_SUBJECT_TYPE_MAX_LENGTH,
  EVENT_TYPE_MAX_LENGTH,
  EVENT_TYPE_PATTERN_SOURCE,
  checkEventEnvelope,
  freezeEnvelope,
  newEvent,
  type EventEnvelope,
} from './event-envelope';

const contract = new URL('../../../../../contract-catalog/shared-kernel/ctr-evt-001/', import.meta.url);
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
if (!Array.isArray(listed)) throw new Error('ctr-evt-001: fixtures is not a list');
const fixtures = listed.map(String);
const schema = readJson('schema.json');
const valid = readJson('examples/valid.json') as EventEnvelope;

describe('CTR-EVT-001 fixtures', () => {
  it('lists exactly the files in examples/', () => {
    const files = readdirSync(new URL('examples/', contract)).map((name) => `examples/${name}`).sort();
    expect([...fixtures].sort()).toEqual(files);
    expect(fixtures.filter((name) => name.startsWith('examples/valid')).length).toBeGreaterThan(0);
    expect(fixtures.filter((name) => name.startsWith('examples/invalid')).length).toBeGreaterThan(0);
    expect(fixtures.every((name) => /^examples\/(valid|invalid)(-[a-z0-9-]+)?\.json$/.test(name))).toBe(true);
  });

  it.each(fixtures.filter((name) => name.startsWith('examples/valid')))('accepts %s', (name) => {
    expect(checkEventEnvelope(readJson(name))).toBe(true);
  });

  it.each(fixtures.filter((name) => name.startsWith('examples/invalid')))('rejects %s', (name) => {
    expect(checkEventEnvelope(readJson(name))).toBe(false);
  });
});

describe('CTR-EVT-001 pinned constants and key lists equal the schema', () => {
  const keysAt = (...path: string[]): string[] => Object.keys(at(schema, ...path, 'properties') as object).sort();
  const requiredAt = (...path: string[]): string[] => [...(at(schema, ...path, 'required') as string[])].sort();
  const sorted = (list: readonly string[]): string[] => [...list].sort();

  it.each([
    ['envelope', [], EVENT_KEYS, EVENT_REQUIRED],
    ['producer', ['properties', 'producer'], EVENT_PRODUCER_KEYS, EVENT_PRODUCER_KEYS],
    ['subject', ['properties', 'subject'], EVENT_SUBJECT_KEYS, EVENT_SUBJECT_KEYS],
    ['metadata', ['properties', 'metadata'], EVENT_METADATA_KEYS, EVENT_METADATA_KEYS],
  ] as const)('%s: the keys, the required keys and the closed object', (_label, path, keys, required) => {
    expect(sorted(keys)).toEqual(keysAt(...path));
    expect(sorted(required)).toEqual(requiredAt(...path));
    expect(at(schema, ...path, 'additionalProperties')).toBe(false);
  });

  it('the bounds', () => {
    expect(at(schema, 'properties', 'event_id', 'maxLength')).toBe(EVENT_ID_MAX_LENGTH);
    expect(at(schema, 'properties', 'event_type', 'maxLength')).toBe(EVENT_TYPE_MAX_LENGTH);
    for (const key of ['module_key', 'implementation_version']) {
      expect(at(schema, 'properties', 'producer', 'properties', key, 'maxLength')).toBe(EVENT_PRODUCER_FIELD_MAX_LENGTH);
    }
    expect(at(schema, 'properties', 'subject', 'properties', 'type', 'maxLength')).toBe(EVENT_SUBJECT_TYPE_MAX_LENGTH);
    expect(at(schema, 'properties', 'subject', 'properties', 'id', 'maxLength')).toBe(EVENT_SUBJECT_ID_MAX_LENGTH);
    for (const key of ['correlation_id', 'causation_id']) expect(at(schema, 'properties', key, 'maxLength')).toBe(EVENT_CORRELATION_ID_MAX_LENGTH);
    expect(at(schema, 'properties', 'idempotency_key', 'maxLength')).toBe(EVENT_IDEMPOTENCY_KEY_MAX_LENGTH);
    expect(at(schema, 'properties', 'metadata', 'properties', 'schema_ref', 'maxLength')).toBe(EVENT_SCHEMA_REF_MAX_LENGTH);
    for (const key of ['event_id', 'correlation_id', 'causation_id', 'idempotency_key']) expect(at(schema, 'properties', key, 'minLength')).toBe(1);
    expect(at(schema, 'properties', 'event_version', 'minimum')).toBe(1);
    expect(at(schema, 'properties', 'subject', 'properties', 'version', 'minimum')).toBe(1);
  });

  it('the patterns, and schema_ref has no minLength', () => {
    expect(at(schema, 'properties', 'event_type', 'pattern')).toBe(EVENT_TYPE_PATTERN_SOURCE);
    expect(at(schema, 'properties', 'metadata', 'properties', 'schema_ref', 'pattern')).toBe(EVENT_SCHEMA_REF_PATTERN_SOURCE);
    expect(Object.hasOwn(at(schema, 'properties', 'metadata', 'properties', 'schema_ref') as object, 'minLength')).toBe(false);
  });

  it('payload is an object with no properties, and tenant_context is CTR-TEN-001 by reference', () => {
    expect(at(schema, 'properties', 'payload', 'maxProperties')).toBe(0);
    expect(at(schema, 'properties', 'payload', 'type')).toBe('object');
    expect(at(schema, 'properties', 'tenant_context', '$ref')).toBe('../ctr-ten-001/schema.json');
    expect(at(schema, 'properties', 'occurred_at', 'format')).toBe('date-time');
  });
});

// Boundaries the fixtures do not reach, each read the way the schema validator reads it.
describe('CTR-EVT-001 checker edges', () => {
  it('counts lengths in code points: 128 astral characters are an event id, 129 are not', () => {
    expect(checkEventEnvelope({ ...valid, event_id: '\u{1F600}'.repeat(EVENT_ID_MAX_LENGTH) })).toBe(true);
    expect(checkEventEnvelope({ ...valid, event_id: '\u{1F600}'.repeat(EVENT_ID_MAX_LENGTH + 1) })).toBe(false);
    expect(checkEventEnvelope({ ...valid, idempotency_key: 'k'.repeat(EVENT_IDEMPOTENCY_KEY_MAX_LENGTH) })).toBe(true);
    expect(checkEventEnvelope({ ...valid, idempotency_key: 'k'.repeat(EVENT_IDEMPOTENCY_KEY_MAX_LENGTH + 1) })).toBe(false);
  });

  it('accepts each optional field present and absent', () => {
    expect(checkEventEnvelope(valid)).toBe(true);
    expect(checkEventEnvelope({ ...valid, causation_id: 'cau_synthetic_0001', idempotency_key: 'idem_synthetic_0001' })).toBe(true);
  });

  it('refuses an envelope whose required keys are only inherited', () => {
    expect(checkEventEnvelope(Object.create(valid))).toBe(false);
  });

  it('refuses a date-time that is not a real instant, and accepts an offset', () => {
    expect(checkEventEnvelope({ ...valid, occurred_at: '2026-13-45T10:00:00Z' })).toBe(false);
    expect(checkEventEnvelope({ ...valid, occurred_at: '2026-08-31T17:00:00.250+07:00' })).toBe(true);
  });

  it('refuses an event type over 128 characters even when it matches the pattern', () => {
    const long = `${'a'.repeat(60)}.${'b'.repeat(60)}.${'c'.repeat(6)}`;
    expect(long.length).toBe(EVENT_TYPE_MAX_LENGTH);
    expect(checkEventEnvelope({ ...valid, event_type: long })).toBe(true);
    expect(checkEventEnvelope({ ...valid, event_type: `${long}c` })).toBe(false);
  });

  it('refuses a schema_ref that is a URL, and one over 32 characters', () => {
    for (const ref of ['file:///etc/passwd', 'https://example.invalid/x', 'CTR-EVT-001@01.0.0', 'CTR-EVT-001@1.0']) {
      expect(checkEventEnvelope({ ...valid, metadata: { schema_ref: ref } })).toBe(false);
    }
    expect(checkEventEnvelope({ ...valid, metadata: { schema_ref: 'CTR-EVT-001@1.0.1234567890123456' } })).toBe(true);
    expect(checkEventEnvelope({ ...valid, metadata: { schema_ref: 'CTR-EVT-001@1.0.12345678901234567' } })).toBe(false);
  });

  it('refuses a non-integer version and a payload with any key', () => {
    expect(checkEventEnvelope({ ...valid, event_version: 1.5 })).toBe(false);
    expect(checkEventEnvelope({ ...valid, subject: { ...valid.subject, version: 0 } })).toBe(false);
    expect(checkEventEnvelope({ ...valid, payload: [] })).toBe(false);
    expect(checkEventEnvelope({ ...valid, payload: { note: undefined } })).toBe(false);
  });

  it('does not require the top-level correlation_id to equal the context one (the schema does not)', () => {
    expect(checkEventEnvelope({ ...valid, correlation_id: 'cor_synthetic_other' })).toBe(true);
  });
});

describe('newEvent and freezeEnvelope', () => {
  const context: TenantContextRecord = valid.tenant_context;
  const spec = {
    event_id: 'evt_synthetic_000001',
    event_type: 'research.run.completed',
    event_version: 1,
    producer: { module_key: 'research-suggestion', implementation_version: '1.0.0' },
    tenant_context: context,
    subject: { type: 'research_run', id: 'run_synthetic_0001', version: 1 },
    schema_ref: 'CTR-EVT-001@1.0.0',
  };
  const now = instantOf('2026-10-19T00:00:00.000Z');

  it('builds a frozen CTR-EVT-001 envelope with an empty payload and the context correlation id', () => {
    const event = newEvent(spec, now);
    expect(checkEventEnvelope(event)).toBe(true);
    expect(event.occurred_at).toBe('2026-10-19T00:00:00.000Z');
    expect(event.correlation_id).toBe(context.correlation_id);
    expect(event.payload).toEqual({});
    expect(Object.isFrozen(event) && Object.isFrozen(event.tenant_context) && Object.isFrozen(event.tenant_context.actor)).toBe(true);
    expect(Object.hasOwn(event, 'causation_id')).toBe(false);
    expect(newEvent({ ...spec, causation_id: 'cau_1', idempotency_key: 'idem_1' }, now)).toMatchObject({ causation_id: 'cau_1', idempotency_key: 'idem_1' });
  });

  it('refuses a field outside the contract with a constant message', () => {
    expect(() => newEvent({ ...spec, event_type: 'ContentGenerationCompleted' }, now)).toThrow('event envelope: the new event does not satisfy CTR-EVT-001');
    expect(() => newEvent({ ...spec, schema_ref: 'javascript:alert(1)' }, now)).toThrow(TypeError);
    expect(() => newEvent(spec, 1.5 as typeof now)).toThrow(TypeError);
  });

  it('copies only the contract fields, so nothing rides along on a stored envelope', () => {
    const smuggled = { ...valid, tenant_context: { ...context }, producer: { ...valid.producer } };
    const copy = freezeEnvelope(smuggled);
    expect(copy).toEqual(valid);
    expect(copy).not.toBe(smuggled);
    expect(freezeEnvelope({ ...valid, extra: 'x' } as EventEnvelope)).toEqual(valid);
    expect(() => freezeEnvelope({ ...valid, event_id: '' })).toThrow('event envelope: the envelope does not satisfy CTR-EVT-001');
  });
});
