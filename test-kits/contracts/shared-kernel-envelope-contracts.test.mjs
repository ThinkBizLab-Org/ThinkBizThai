import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validate as schemaValidate } from './json-schema-subset.mjs';

// CTR-API-001, CTR-PAG-001, CTR-IDM-001 materialized from the Sprint 0A baseline.
// Semantics come only from Decision Register 5.2 and Contracts/Events/Jobs Workstream
// sections D and G; nothing here invents contract meaning, and all three stay Draft.
const CATALOG = 'contract-catalog/shared-kernel';
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const isText = (value) => typeof value === 'string' && value.length > 0;
// A deny-list on a lowercase http(s) prefix only -- the exact form independent security
// review bypassed with HTTPS://, //host, ftp:, data:, file:, javascript: and traversal.
// The Author claimed to have closed this class and closed it in one of two files;
// independent testing of WP-0A-CON-005 found this survivor. Defer to the contract.
const isPrivateRef = (value) => isText(value) && /^(job|status|result|app|asset|content):(?!\/)(?!.*\.\.)[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*(?:\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$/.test(value);
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
  if (f.kind === 'success') return present[0] === 'data' && f.data !== null && typeof f.data === 'object' && !Array.isArray(f.data);
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

// API-003: stable ordering, no duplicate or missing item between pages, opaque cursor.
// This predicate previously carried its own charset and hash-format rules, which had been
// REMOVED from the schemas as unsourced. The two then disagreed in silence -- schema accepted
// blake3: and a dot-separated token, predicate rejected them -- which is the defect class this
// package was rejected for, reproduced inside the fix for it. The predicate now checks only
// the relational rules a JSON Schema cannot express; every shape rule lives in the schema and
// is enforced by the conformance suite.
const isCursor = (value) => isText(value);
function validPage(f) {
  if (f.kind === 'page' && !('next_cursor' in f)) return false;
  const fields = Array.isArray(f.sort) ? f.sort.map((s) => s.field) : [];
  const sortStable = Array.isArray(f.sort) && f.sort.length >= 2
    && new Set(fields).size === fields.length
    && f.sort.every((s) => isText(s.field) && ['asc', 'desc'].includes(s.direction));
  if (!sortStable) return false;
  if (f.kind === 'request') {
    // No maximum page size exists in the baseline; an earlier draft invented 100. The
    // predicate must not enforce what the shipped schema does not.
    if (!(Number.isInteger(f.page_size) && f.page_size >= 1)) return false;
    return f.cursor === undefined || isCursor(f.cursor);
  }
  if (f.kind === 'page') {
    if (!(Array.isArray(f.items) && typeof f.has_more === 'boolean')) return false;
    if (f.next_cursor === null) return f.has_more === false;
    return isCursor(f.next_cursor) && f.has_more === true;
  }
  return false;
}

// ID-001: key scope includes workspace and operation; payload-hash mismatch conflicts.
// API-002: same key with the same payload returns the same result.
function validIdempotency(f) {
  if (!(isText(f.idempotency_key) && isText(f.scope?.workspace_id) && isText(f.scope?.operation)
    && isText(f.payload_hash) && isText(f.created_at))) return false;
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

// One contract, one description. The predicate below covers only what a JSON Schema cannot
// express -- relational rules across fields -- and defers every shape rule to the schema.
// Keeping a second copy of a shape rule here is what let the schema and the predicate
// disagree in silence, and it is what this package was rejected for.
async function schemaFor(dir) {
  const schema = await readJson(`${CATALOG}/${dir}/schema.json`);
  const refs = {};
  for (const value of Object.values(schema.properties ?? {})) {
    if (value.$ref) refs[value.$ref] = await readJson(`${CATALOG}/${dir}/${value.$ref}`.replace(/[^/]+\/\.\.\//g, ''));
  }
  return { schema, resolve: (ref) => refs[ref] ?? null };
}

async function conforms(dir, body) {
  const { schema, resolve } = await schemaFor(dir);
  return schemaValidate(schema, body, { resolve }).length === 0;
}

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
      const accepted = (await conforms(dir, body)) && validate(body);
      if (/\/(valid[-.]|accepted-gap-)/.test(fixture)) {
        assert.equal(accepted, true, `${id} ${fixture} must be accepted`);
        valid += 1;
      } else {
        assert.equal(accepted, false, `${id} ${fixture} must be rejected`);
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

// This test used to assert that a decodable offset cursor was REJECTED. It passed only
// because the shipped fixture contained '=' and '&', which an invented charset rule
// happened to exclude -- not because the offset was detected. The charset had no baseline
// source and was removed. The honest assertion is the opposite one: the contract ACCEPTS a
// forgeable cursor, and that gap is declared rather than hidden behind a passing test.
test('a decodable offset cursor is accepted, and the gap is declared not hidden', async () => {
  const gap = await readJson(`${CATALOG}/ctr-pag-001/examples/accepted-gap-decodable-offset-cursor.json`);
  const decoded = Buffer.from(gap.cursor, 'base64url').toString('utf8');
  assert.match(decoded, /offset=/, 'the fixture must actually decode to an offset');
  assert.equal(validPage(gap), true, 'the contract as written accepts it — that is the point of the fixture');
  const manifest = await readJson(`${CATALOG}/ctr-pag-001/manifest.json`);
  assert.match(manifest.accepted_gaps['examples/accepted-gap-decodable-offset-cursor.json'], /tamper|integrity|MAC|signature/i);
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

// E1-E4: rules these manifests state as materialized, which no test exercised.
// Independent testing found each of them stated and unenforced.

// E1: "payload hash mismatch is a conflict" (ID-001) had NO test at all. Two records with
// the same key and scope but different payload_hash were each accepted, and nothing compared
// them. The rule is relational, so it needs a relational check.
export function idempotencyOutcome(stored, incoming) {
  if (stored.idempotency_key !== incoming.idempotency_key) return 'independent';
  if (stored.scope.workspace_id !== incoming.scope.workspace_id || stored.scope.operation !== incoming.scope.operation) return 'independent';
  return stored.payload_hash === incoming.payload_hash ? 'replay' : 'conflict';
}

test('the same key with a different payload is a conflict, not a second command', async () => {
  const stored = await readJson(`${CATALOG}/ctr-idm-001/examples/valid-completed-replay.json`);
  const replay = await readJson(`${CATALOG}/ctr-idm-001/examples/valid-in-progress.json`);
  assert.equal(idempotencyOutcome(stored, replay), 'replay');

  const conflicting = { ...replay, payload_hash: `sha256:${'b'.repeat(64)}` };
  assert.equal(idempotencyOutcome(stored, conflicting), 'conflict');

  const otherWorkspace = { ...replay, scope: { ...replay.scope, workspace_id: 'ws_synthetic_0002' } };
  assert.equal(idempotencyOutcome(stored, otherWorkspace), 'independent');
  const otherOperation = { ...replay, scope: { ...replay.scope, operation: 'content.generation.delete' } };
  assert.equal(idempotencyOutcome(stored, otherOperation), 'independent');
});

// E2: `created_at` twice satisfies ">= 2 sort keys" without being a tiebreaker.
// The previous version of this test built a duplicated sort array and then asserted
// `new Set(fields).size < fields.length` — it never called the validator or the schema, so it
// could not fail for ANY change to the contract. Independent testing found it and showed a
// fixture with created_at twice passing green. It now exercises the contract.
test('duplicate sort fields do not count as a tiebreaker', async () => {
  const page = await readJson(`${CATALOG}/ctr-pag-001/examples/valid-first-page-request.json`);
  assert.equal(validPage(page), true);
  const duplicated = { ...page, sort: [{ field: 'created_at', direction: 'desc' }, { field: 'created_at', direction: 'asc' }] };
  assert.equal(validPage(duplicated), false, 'repeating one field must be rejected by the predicate');
  // JSON Schema cannot express distinct-by-property, so the schema must SAY it cannot,
  // rather than appearing to enforce it. That declaration is itself asserted here.
  const schema = await readJson(`${CATALOG}/ctr-pag-001/schema.json`);
  assert.match(schema.properties.sort['x-distinct-fields-rule'], /CANNOT express/);
  const manifest = await readJson(`${CATALOG}/ctr-pag-001/manifest.json`);
  assert.match(manifest.untestable_by_schema, /distinct sort/i);
  assert.equal(schemaValidate(schema, page).length, 0, 'the shipped fixture must still satisfy the schema');
});

// E3: a page with has_more true and next_cursor ABSENT was accepted, because
// OPAQUE.test(undefined) coerces to the string "undefined" and matched.
test('a page claiming more results must carry the cursor that reaches them', async () => {
  const page = await readJson(`${CATALOG}/ctr-pag-001/examples/valid-page-result.json`);
  assert.equal(page.has_more, true);
  assert.equal(typeof page.next_cursor, 'string');
  const { next_cursor: _omitted, ...withoutCursor } = page;
  assert.equal('next_cursor' in withoutCursor, false);
  assert.equal(validPage(withoutCursor), false, 'has_more true with next_cursor absent must be rejected');
  assert.equal(validPage({ ...page, next_cursor: null }), false, 'has_more true with a null cursor must be rejected');
});

// E4: `data: null` and `data: []` passed, because typeof null === 'object'.
test('a success envelope requires an object payload, not null or an array', async () => {
  const envelope = await readJson(`${CATALOG}/ctr-api-001/examples/valid-success.json`);
  assert.equal(validApiEnvelope(envelope), true);
  assert.equal(validApiEnvelope({ ...envelope, data: null }), false);
  assert.equal(validApiEnvelope({ ...envelope, data: [] }), false);
  assert.equal(validApiEnvelope({ ...envelope, data: 'text' }), false);
});

// E5: "no duplicate or missing item between pages" is stated in the manifest but every
// items array is empty, so fixture inspection cannot test it. Say so rather than implying
// it is covered.
test('the manifest declares which of its claims fixtures cannot demonstrate', async () => {
  const manifest = await readJson(`${CATALOG}/ctr-pag-001/manifest.json`);
  assert.match(manifest.freeze_boundary, /TAMPER-SAFETY IS NOT ENFORCED/);
  assert.ok(manifest.untestable_by_fixture, 'the manifest must declare claims its fixtures cannot demonstrate');
  assert.match(manifest.untestable_by_fixture, /duplicate|missing/i);
});

// The predicate and the schema are two descriptions of one contract, and this package was
// rejected because they silently disagreed. Prove agreement on every shipped fixture instead
// of trusting it.
test('the predicate and the shipped schema agree on every fixture', async () => {
  for (const { id, dir, validate: predicate } of CONTRACTS) {
    const manifest = await readJson(`${CATALOG}/${dir}/manifest.json`);
    for (const fixture of manifest.fixtures) {
      const body = await readJson(`${CATALOG}/${dir}/${fixture}`);
      const bySchema = await conforms(dir, body);
      const byPredicate = predicate(body);
      // The dangerous direction is the predicate REJECTING what the schema accepts: that is
      // a rule enforced in a test which the contract does not state, and it is exactly how
      // the removed sha256 pin and cursor charset kept gating CI after being deleted from
      // the schemas. The reverse is harmless -- the combined gate still rejects.
      if (!byPredicate && bySchema) {
        assert.fail(`${id} ${fixture}: the predicate rejects what the shipped schema accepts — a rule is being enforced in a test that the contract does not state`);
      }
    }
  }
});
