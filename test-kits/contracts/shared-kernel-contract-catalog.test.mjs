import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const root = new URL('../..', import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const candidateIds = ['CTR-TEN-001', 'CTR-ERR-001', 'CTR-EVT-001', 'CTR-JOB-001'];

const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const isDateTime = (value) => isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
// WP-0A-CON-005 / RFC-2026-006. This predicate previously read `!/^https?:\/\//`, the same
// deny-list the CTR-JOB-001 schema shipped, and it accepted every bypass that schema did:
// HTTPS://, //host, ftp:, data:, file:, javascript: and ../../../etc/passwd. Keeping it that
// way would have made a fixture named `invalid-` pass this hand-written predicate while the
// shipped schema rejected it -- the predicate/schema divergence the conformance suite exists
// to close. It now mirrors the shipped constraint exactly.
const REFERENCE_PATTERN = /^(job|status|result|app|asset|content):(?!\/)(?!.*\.\.)[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*(?:\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$/u;
const isPrivateReference = (value) => isNonEmptyString(value) && REFERENCE_PATTERN.test(value);
const hasTenantContext = (value) => value && isNonEmptyString(value.workspace_id)
  && value.actor && ['user', 'system_actor'].includes(value.actor.kind) && isNonEmptyString(value.actor.id)
  && isNonEmptyString(value.request_id) && isNonEmptyString(value.correlation_id)
  && value.locale === 'th-TH' && value.timezone === 'Asia/Bangkok';

function validatesCandidateFixture(contractId, fixture) {
  if (contractId === 'CTR-TEN-001') return hasTenantContext(fixture);
  if (contractId === 'CTR-ERR-001') {
    return isNonEmptyString(fixture.code) && isNonEmptyString(fixture.message_key)
      && ['validation', 'auth', 'permission', 'conflict', 'rate_limit', 'provider', 'temporary', 'internal'].includes(fixture.category)
      && typeof fixture.retryable === 'boolean' && isNonEmptyString(fixture.correlation_id)
      && fixture.details && Object.keys(fixture.details).length === 0;
  }
  if (contractId === 'CTR-EVT-001') {
    return Boolean(isNonEmptyString(fixture.event_id) && /^[a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+$/.test(fixture.event_type)
      && Number.isInteger(fixture.event_version) && fixture.event_version >= 1 && isDateTime(fixture.occurred_at)
      && fixture.producer && isNonEmptyString(fixture.producer.module_key) && isNonEmptyString(fixture.producer.implementation_version)
      && hasTenantContext(fixture.tenant_context)
      && fixture.subject && isNonEmptyString(fixture.subject.type) && isNonEmptyString(fixture.subject.id)
      && Number.isInteger(fixture.subject.version) && fixture.subject.version >= 1
      && isNonEmptyString(fixture.correlation_id) && fixture.payload && Object.keys(fixture.payload).length === 0
      && fixture.metadata && Object.keys(fixture.metadata).length === 1 && isNonEmptyString(fixture.metadata.schema_ref));
  }
  if (contractId === 'CTR-JOB-001') {
    return Boolean(isNonEmptyString(fixture.job_id) && isNonEmptyString(fixture.job_type)
      && Number.isInteger(fixture.job_version) && fixture.job_version >= 1 && hasTenantContext(fixture.tenant_context)
      && Number.isInteger(fixture.priority) && isDateTime(fixture.available_at)
      && Number.isInteger(fixture.attempt) && fixture.attempt >= 0
      && Number.isInteger(fixture.max_attempts) && fixture.max_attempts >= 1
      && Number.isInteger(fixture.timeout_seconds) && fixture.timeout_seconds >= 1
      && isNonEmptyString(fixture.dedupe_key) && isPrivateReference(fixture.input_ref)
      && (!('result_ref' in fixture) || isPrivateReference(fixture.result_ref))
      && Number.isInteger(fixture.progress_percent)
      && fixture.progress_percent >= 0 && fixture.progress_percent <= 100 && isNonEmptyString(fixture.progress_stage));
  }
  throw new Error(`Unsupported Candidate contract: ${contractId}`);
}

test('shared-kernel catalog preserves baseline IDs, versions, and freeze levels', async () => {
  const catalog = await readJson('contract-catalog/shared-kernel/index.json');
  assert.equal(catalog.contracts.length, 14);
  assert.equal(new Set(catalog.contracts.map(({ id }) => id)).size, 14);
  for (const id of candidateIds) {
    const contract = catalog.contracts.find((entry) => entry.id === id);
    assert.deepEqual({ version: contract.version, status: contract.status }, { version: '1.0.0', status: 'Candidate' });
  }
  assert.equal(catalog.contracts.filter((entry) => entry.status === 'Draft').length, 10);
});

test('Candidate schemas and synthetic valid/invalid fixtures remain present and traceable', async () => {
  for (const id of candidateIds) {
    const directory = id.toLowerCase();
    const manifest = await readJson(`contract-catalog/shared-kernel/${directory}/manifest.json`);
    const schema = await readJson(`contract-catalog/shared-kernel/${directory}/schema.json`);
    assert.equal(manifest.contract_id, id);
    assert.equal(manifest.status, 'Candidate');
    assert.equal(schema.$id, id);
    assert.ok(manifest.fixtures.some((fixture) => fixture.includes('valid')));
    assert.ok(manifest.fixtures.some((fixture) => fixture.includes('invalid')));
    await Promise.all(manifest.fixtures.map((fixture) => readJson(`contract-catalog/shared-kernel/${directory}/${fixture}`)));
  }
});

test('Candidate fixture validator accepts valid fixtures and rejects every declared negative fixture', async () => {
  for (const id of candidateIds) {
    const directory = id.toLowerCase();
    const manifest = await readJson(`contract-catalog/shared-kernel/${directory}/manifest.json`);
    for (const fixturePath of manifest.fixtures) {
      const fixture = await readJson(`contract-catalog/shared-kernel/${directory}/${fixturePath}`);
      assert.equal(validatesCandidateFixture(id, fixture), !fixturePath.includes('/invalid-'), `${id} ${fixturePath}`);
    }
  }
});

test('negative fixtures demonstrate required tenant and job isolation metadata', async () => {
  const tenantInvalid = await readJson('contract-catalog/shared-kernel/ctr-ten-001/examples/invalid-missing-workspace.json');
  const eventInvalid = await readJson('contract-catalog/shared-kernel/ctr-evt-001/examples/invalid-missing-tenant.json');
  const errorInvalid = await readJson('contract-catalog/shared-kernel/ctr-err-001/examples/invalid-unsafe-detail.json');
  const jobInvalid = await readJson('contract-catalog/shared-kernel/ctr-job-001/examples/invalid-max-attempts.json');
  assert.equal('workspace_id' in tenantInvalid, false);
  assert.equal('tenant_context' in eventInvalid, false);
  assert.ok('raw_provider_response' in errorInvalid.details);
  assert.equal(jobInvalid.max_attempts, 0);
});

test('Candidate safety constraints reject unsafe detail, payload, and public job references', async () => {
  const tenantManifest = await readJson('contract-catalog/shared-kernel/ctr-ten-001/manifest.json');
  const errorSchema = await readJson('contract-catalog/shared-kernel/ctr-err-001/schema.json');
  const eventSchema = await readJson('contract-catalog/shared-kernel/ctr-evt-001/schema.json');
  const eventUnsafe = await readJson('contract-catalog/shared-kernel/ctr-evt-001/examples/invalid-unsafe-payload.json');
  const jobSchema = await readJson('contract-catalog/shared-kernel/ctr-job-001/schema.json');
  assert.match(tenantManifest.trust_boundary, /Server-resolved only/);
  assert.equal(errorSchema.properties.details.maxProperties, 0);
  assert.equal(eventSchema.properties.payload.maxProperties, 0);
  assert.equal(eventSchema.properties.metadata.additionalProperties, false);
  assert.ok(Object.keys(eventUnsafe.payload).length > 0);
  // WP-0A-CON-005 / RFC-2026-006. These two assertions previously pinned
  // `.not.pattern === '^https?://'`, so the contract was REQUIRED BY TEST to keep the
  // deny-list independent security review proved bypassable. They now pin the allow-listed
  // scheme with a constrained body, and assert the deny-list is gone rather than present.
  for (const field of ['input_ref', 'result_ref']) {
    assert.equal(jobSchema.properties[field].not, undefined, `${field} must not carry a deny-list`);
    assert.equal(jobSchema.properties[field].pattern,
      '^(job|status|result|app|asset|content):(?!/)(?!.*\\.\\.)[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*)*$');
    assert.match(jobSchema.properties[field]['x-reference-rule'], /Allow-listed scheme AND constrained body/);
  }
});

test('Candidate fixture validator rejects missing Event and Job required fields', async () => {
  const event = await readJson('contract-catalog/shared-kernel/ctr-evt-001/examples/valid.json');
  const job = await readJson('contract-catalog/shared-kernel/ctr-job-001/examples/valid.json');
  for (const key of ['occurred_at', 'producer']) {
    const mutated = structuredClone(event);
    delete mutated[key];
    assert.equal(validatesCandidateFixture('CTR-EVT-001', mutated), false, `missing Event ${key}`);
  }
  for (const key of ['priority', 'available_at']) {
    const mutated = structuredClone(job);
    delete mutated[key];
    assert.equal(validatesCandidateFixture('CTR-JOB-001', mutated), false, `missing Job ${key}`);
  }
});
