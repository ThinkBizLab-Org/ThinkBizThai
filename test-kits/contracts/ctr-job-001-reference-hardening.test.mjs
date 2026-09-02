import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import test from 'node:test';

import { validate } from './json-schema-subset.mjs';

// WP-0A-CON-005 / RFC-2026-006.
//
// CTR-JOB-001 shipped input_ref and result_ref constrained by a DENY-LIST --
// not: { pattern: "^https?://" } -- which matches only a literal lowercase http(s) prefix.
// Independent security review proved it bypassable and WP-0A-CON-002 escalated it as an
// open blocker rather than changing a Candidate contract outside its writable paths. This
// suite reproduced the bypass against the shipped schema BEFORE the fix (every hostile form
// below was ACCEPTED on both fields) and is the standing guard afterwards.
//
// The guard is deliberately NOT written against the pattern string. Asserting the literal
// would only prove the schema still says what it says; these cases prove what it DOES.
const BASE = 'contract-catalog/shared-kernel/ctr-job-001';
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

// Every form independent security review demonstrated, plus the four the CTR-IDM-001
// x-reference-rule records as defeating a scheme allow-list that leaves the body free.
const HOSTILE = [
  'https://public.example.invalid/x',
  'HTTPS://public.example.invalid/x',
  'HtTpS://public.example.invalid/x',
  '//public.example.invalid/x',
  'ftp://public.example.invalid/x',
  'data:text/plain;base64,AA==',
  'file:///etc/passwd',
  'javascript:alert(1)',
  '../../../etc/passwd',
  'result:../../../etc/passwd',
  'status:/proc/self/environ',
  'content:/.env',
  'content://attacker.example.invalid/exfil',
  'job:',
  'job:a//b',
  'synthetic://input/00000000-0000-4000-8000-000000000202',
];

async function loadContract() {
  const schema = await readJson(join(BASE, 'schema.json'));
  const manifest = await readJson(join(BASE, 'manifest.json'));
  // Resolve the one external reference the envelope declares, the same way the conformance
  // suite does, so tenant_context is really validated rather than skipped.
  const resolved = new Map();
  const walk = async (node) => {
    if (Array.isArray(node)) { for (const item of node) await walk(item); return; }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string' && !value.startsWith('#')) {
        resolved.set(value, await readJson(normalize(join(BASE, value))));
      } else await walk(value);
    }
  };
  await walk(schema);
  return { schema, manifest, resolve: (ref) => resolved.get(ref) ?? null };
}

test('CTR-JOB-001 rejects every demonstrated hostile reference on both reference fields', async () => {
  const { schema, resolve } = await loadContract();
  const valid = await readJson(join(BASE, 'examples/valid.json'));
  const accepted = [];
  for (const field of ['input_ref', 'result_ref']) {
    for (const value of HOSTILE) {
      const body = structuredClone(valid);
      body[field] = value;
      const errors = validate(schema, body, { resolve });
      if (errors.length === 0) accepted.push(`${field}=${value}`);
      else assert.ok(errors.some((message) => message.includes(field)),
        `${field}=${value} was rejected, but not because of ${field}: ${errors.join('; ')}`);
    }
  }
  assert.deepEqual(accepted, [], `CTR-JOB-001 accepts hostile reference(s): ${accepted.join(', ')}`);
});

// A guard that only ever rejects is indistinguishable from one that rejects everything.
test('CTR-JOB-001 still accepts a well-formed private reference on both fields', async () => {
  const { schema, resolve } = await loadContract();
  const valid = await readJson(join(BASE, 'examples/valid.json'));
  for (const value of ['asset:input/00000000-0000-4000-8000-000000000202', 'job:input.payload', 'result:a/b/c-d_e.f']) {
    for (const field of ['input_ref', 'result_ref']) {
      const body = structuredClone(valid);
      body[field] = value;
      assert.deepEqual(validate(schema, body, { resolve }), [], `${field}=${value} must be accepted`);
    }
  }
});

test('neither reference field carries a deny-list, and both carry the recorded rule', async () => {
  const { schema } = await loadContract();
  for (const field of ['input_ref', 'result_ref']) {
    const property = schema.properties[field];
    assert.equal(property.not, undefined,
      `${field} must not reintroduce a deny-list; "^https?://" matched only a literal lowercase prefix`);
    assert.equal(typeof property.pattern, 'string', `${field} must constrain its value with an allow-list pattern`);
    assert.match(property['x-reference-rule'], /demonstrated|bypass|Allow-listed scheme AND constrained body/,
      `${field} must record why a deny-list, and a bare scheme allow-list, are both insufficient`);
  }
  // The two fields must not drift apart: result_ref carries the same exposure as input_ref.
  assert.equal(schema.properties.input_ref.pattern, schema.properties.result_ref.pattern);
});

// The amendment is authorized only as content-neutral. These are the invariants that claim
// rests on, asserted so a later edit cannot quietly widen it.
test('the amendment changed no field, no version, and no freeze level', async () => {
  const { schema, manifest } = await loadContract();
  assert.deepEqual(Object.keys(schema.properties).sort(), [
    'attempt', 'available_at', 'cancel_requested_at', 'dedupe_key', 'input_ref', 'job_id',
    'job_type', 'job_version', 'last_error_code', 'lease_expires_at', 'lease_owner',
    'max_attempts', 'priority', 'progress_percent', 'progress_stage', 'result_ref',
    'tenant_context', 'timeout_seconds',
  ]);
  assert.deepEqual(schema.required, [
    'job_id', 'job_type', 'job_version', 'tenant_context', 'priority', 'available_at',
    'attempt', 'max_attempts', 'timeout_seconds', 'dedupe_key', 'input_ref',
    'progress_percent', 'progress_stage',
  ]);
  assert.equal(schema.properties.tenant_context.$ref, '../ctr-ten-001/schema.json');
  assert.equal(schema.additionalProperties, false);
  assert.equal(manifest.version, '1.0.0');
  assert.equal(manifest.status, 'Candidate');
  const index = await readJson('contract-catalog/shared-kernel/index.json');
  const entry = index.contracts.find((contract) => contract.id === 'CTR-JOB-001');
  assert.deepEqual({ version: entry.version, status: entry.status }, { version: '1.0.0', status: 'Candidate' });
});

// The amendment is only authorized while it is recorded and its acknowledgement is tracked.
test('the amendment is recorded and its Integration Owner acknowledgement is tracked', async () => {
  const { schema } = await loadContract();
  const records = schema['x-amended-by'];
  assert.ok(Array.isArray(records), 'x-amended-by must list every amendment, not only the latest');
  // The WP-0A-CON-002 record must survive: an amendment must never erase an earlier one.
  const previous = records.find((record) => record.work_package_id === 'WP-0A-CON-002');
  assert.ok(previous, 'the WP-0A-CON-002 record must be carried forward, not overwritten');
  assert.equal(previous.decision_record, 'architecture/decisions/RFC-2026-004-catalog-reference-integrity.md');
  const current = records.find((record) => record.work_package_id === 'WP-0A-CON-005');
  assert.ok(current, 'this amendment must record itself');
  assert.equal(current.decision_record, 'architecture/decisions/RFC-2026-006-job-reference-hardening.md');
  assert.equal(current.acknowledgement_required_from, '/root/r0_steward');
  // NOT asserted as approved. `pending` is the honest state; no script in this repository
  // can clear it, and nothing here countersigns on the Integration Owner's behalf.
  assert.ok(['pending', 'acknowledged'].includes(current.acknowledgement_status));
});

test('the hostile-reference fixture is declared, and is rejected for its reference field', async () => {
  const { schema, manifest, resolve } = await loadContract();
  const fixture = 'examples/invalid-public-input-ref.json';
  assert.ok(manifest.fixtures.includes(fixture), `${fixture} must be declared by the manifest`);
  const body = await readJson(join(BASE, fixture));
  const errors = validate(schema, body, { resolve });
  assert.ok(errors.length > 0, `${fixture} must be rejected by the shipped schema`);
  assert.ok(errors.every((message) => message.includes('input_ref')),
    `${fixture} must fail ONLY on its reference field, or it does not demonstrate the rule it is named for: ${errors.join('; ')}`);
  // It must be a form the OLD deny-list accepted, or the fixture demonstrates nothing new.
  assert.equal(/^https?:\/\//.test(body.input_ref), false,
    'the fixture must use a form the previous "^https?://" deny-list ACCEPTED, not one it already caught');
});
