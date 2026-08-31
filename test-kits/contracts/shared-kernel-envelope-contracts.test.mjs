import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// CTR-API-001, CTR-PAG-001, CTR-IDM-001 materialized from the Sprint 0A baseline.
// Semantics come only from Decision Register 5.2 and Contracts/Events/Jobs Workstream
// sections D and G; nothing here invents contract meaning, and all three stay Draft.
const CATALOG = 'contract-catalog/shared-kernel';
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const isText = (value) => typeof value === 'string' && value.length > 0;
const isPrivateRef = (value) => isText(value) && !/^https?:\/\//.test(value);
const hasTenantContext = (value) => Boolean(value && isText(value.workspace_id)
  && value.actor && ['user', 'system_actor'].includes(value.actor.kind) && isText(value.actor.id)
  && isText(value.request_id) && isText(value.correlation_id)
  && value.locale === 'th-TH' && value.timezone === 'Asia/Bangkok');

// API-001: success/error/correlation serialize without leaking internal detail.
// API-005: an accepted receipt carries job/status/deep-link references.
function validApiEnvelope(f) {
  if (!(Number.isInteger(f.api_version) && f.api_version >= 1 && isText(f.request_id)
    && isText(f.correlation_id) && hasTenantContext(f.tenant_context))) return false;
  const present = ['data', 'error', 'accepted'].filter((key) => key in f);
  if (present.length !== 1) return false;
  if (f.kind === 'success') return present[0] === 'data' && typeof f.data === 'object';
  if (f.kind === 'error') {
    return present[0] === 'error' && isText(f.error?.code) && isText(f.error?.message_key)
      && typeof f.error?.retryable === 'boolean' && isText(f.error?.correlation_id)
      && f.error?.details && Object.keys(f.error.details).length === 0;
  }
  if (f.kind === 'accepted') {
    return present[0] === 'accepted' && isText(f.accepted?.job_id)
      && isPrivateRef(f.accepted?.status_ref)
      && (f.accepted.deep_link_ref === undefined || isPrivateRef(f.accepted.deep_link_ref));
  }
  return false;
}

// API-003: stable ordering, no duplicate or missing item between pages, opaque tamper-safe cursor.
const OPAQUE = /^[A-Za-z0-9_-]+$/;
function validPage(f) {
  const sortStable = Array.isArray(f.sort) && f.sort.length >= 2
    && f.sort.every((s) => isText(s.field) && ['asc', 'desc'].includes(s.direction));
  if (!sortStable) return false;
  if (f.kind === 'request') {
    if (!(Number.isInteger(f.page_size) && f.page_size >= 1 && f.page_size <= 100)) return false;
    return f.cursor === undefined || OPAQUE.test(f.cursor);
  }
  if (f.kind === 'page') {
    if (!(Array.isArray(f.items) && typeof f.has_more === 'boolean')) return false;
    if (f.next_cursor === null) return f.has_more === false;
    return OPAQUE.test(f.next_cursor) && f.has_more === true;
  }
  return false;
}

// ID-001: key scope includes workspace and operation; payload-hash mismatch conflicts.
// API-002: same key with the same payload returns the same result.
function validIdempotency(f) {
  if (!(isText(f.idempotency_key) && isText(f.scope?.workspace_id) && isText(f.scope?.operation)
    && /^sha256:[0-9a-f]{64}$/.test(f.payload_hash ?? '') && isText(f.created_at))) return false;
  if (f.state === 'in_progress') return !('result_ref' in f) && !('error' in f) && !('completed_at' in f);
  if (f.state === 'completed') return isText(f.completed_at) && isPrivateRef(f.result_ref) && !('error' in f);
  if (f.state === 'failed') return isText(f.completed_at) && isText(f.error?.code) && !('result_ref' in f);
  return false;
}

const CONTRACTS = [
  { id: 'CTR-API-001', dir: 'ctr-api-001', validate: validApiEnvelope },
  { id: 'CTR-PAG-001', dir: 'ctr-pag-001', validate: validPage },
  { id: 'CTR-IDM-001', dir: 'ctr-idm-001', validate: validIdempotency },
];

test('each new contract stays Draft and cites its baseline source', async () => {
  for (const { id, dir } of CONTRACTS) {
    const manifest = await readJson(`${CATALOG}/${dir}/manifest.json`);
    assert.deepEqual(
      { contract_id: manifest.contract_id, version: manifest.version, status: manifest.status, owner: manifest.owner },
      { contract_id: id, version: '1.0.0', status: 'Draft', owner: 'A0' },
    );
    assert.ok(manifest.source_references.some((r) => r.includes('Decision Register')), `${id} must cite the Decision Register`);
    assert.ok(manifest.source_references.some((r) => r.includes('Workstream')), `${id} must cite its workstream task`);
    assert.ok(isText(manifest.freeze_boundary), `${id} must state its freeze boundary`);
  }
});

test('the index still reports 4 Candidate and 10 Draft: materializing a Draft does not promote it', async () => {
  const index = await readJson(`${CATALOG}/index.json`);
  assert.equal(index.contracts.length, 14);
  assert.equal(index.contracts.filter((c) => c.status === 'Draft').length, 10);
  for (const { id } of CONTRACTS) {
    assert.equal(index.contracts.find((c) => c.id === id).status, 'Draft');
  }
});

test('every valid fixture is accepted and every invalid fixture is rejected', async () => {
  for (const { id, dir, validate } of CONTRACTS) {
    const manifest = await readJson(`${CATALOG}/${dir}/manifest.json`);
    let valid = 0;
    let invalid = 0;
    for (const fixture of manifest.fixtures) {
      const body = await readJson(`${CATALOG}/${dir}/${fixture}`);
      if (fixture.includes('/valid-')) {
        assert.equal(validate(body), true, `${id} ${fixture} must be accepted`);
        valid += 1;
      } else {
        assert.equal(validate(body), false, `${id} ${fixture} must be rejected`);
        invalid += 1;
      }
    }
    assert.ok(valid >= 2, `${id} needs at least two valid fixtures, has ${valid}`);
    assert.ok(invalid >= 2, `${id} needs at least two negative fixtures, has ${invalid}`);
  }
});

test('no fixture leaks a public URL where the baseline requires a private reference', async () => {
  for (const { dir } of CONTRACTS) {
    const manifest = await readJson(`${CATALOG}/${dir}/manifest.json`);
    for (const fixture of manifest.fixtures.filter((f) => f.includes('/valid-'))) {
      const body = JSON.stringify(await readJson(`${CATALOG}/${dir}/${fixture}`));
      assert.equal(/"(status_ref|deep_link_ref|result_ref|input_ref)":"https?:\/\//.test(body), false, `${dir}/${fixture} leaks a public URL`);
    }
  }
});

test('the API envelope never carries a success payload and an error together', async () => {
  const both = await readJson(`${CATALOG}/ctr-api-001/examples/invalid-success-with-error.json`);
  assert.ok('data' in both && 'error' in both);
  assert.equal(validApiEnvelope(both), false);
});

test('a cursor that reveals a decodable offset is rejected as not opaque', async () => {
  const offset = await readJson(`${CATALOG}/ctr-pag-001/examples/invalid-decodable-offset-cursor.json`);
  assert.match(offset.cursor, /offset=/);
  assert.equal(validPage(offset), false);
});

test('a sort without a tiebreaker is rejected because page boundaries would not be stable', async () => {
  const unstable = await readJson(`${CATALOG}/ctr-pag-001/examples/invalid-unstable-sort-without-tiebreaker.json`);
  assert.equal(unstable.sort.length, 1);
  assert.equal(validPage(unstable), false);
});

test('idempotency scope must carry both workspace and operation', async () => {
  const missing = await readJson(`${CATALOG}/ctr-idm-001/examples/invalid-scope-missing-workspace.json`);
  assert.equal('workspace_id' in missing.scope, false);
  assert.equal(validIdempotency(missing), false);
});

test('a replayed key with the same payload hash returns the stored result', async () => {
  const started = await readJson(`${CATALOG}/ctr-idm-001/examples/valid-in-progress.json`);
  const replay = await readJson(`${CATALOG}/ctr-idm-001/examples/valid-completed-replay.json`);
  assert.equal(started.idempotency_key, replay.idempotency_key);
  assert.equal(started.payload_hash, replay.payload_hash);
  assert.deepEqual(started.scope, replay.scope);
  assert.equal(validIdempotency(replay), true);
  assert.ok(isPrivateRef(replay.result_ref));
});
