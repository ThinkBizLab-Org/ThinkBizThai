import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  AssertionOutcome, INSUFFICIENT_PRIVILEGE, classify,
  expectDenied, expectNoEffect, expectNoRows, expectRows, expectVisibleOnly,
} from '../../db/foundation/test-helpers/rls-assertions.mjs';

// These helpers are the instrument the cross-tenant assertions will be written with, and an
// instrument that cannot tell "refused" from "returned nothing" makes every assertion built on it
// worthless. That confusion is not hypothetical: the data package's own smoke set asserts only
// that the server helper SUCCEEDS, which is indistinguishable from succeeding via BYPASSRLS.
//
// No database is needed to prove the instrument is honest. Its whole job is deciding what an
// outcome MEANS, and that is decided from the outcome.


// assert.throws returns undefined, so the thrown value is captured deliberately. The message is
// part of what these helpers deliver — a failing isolation test has to tell its reader that the
// fix is a policy, not a different fixture — so the messages are asserted, not just the throw.
function caught(fn) {
  try { fn(); } catch (error) { return error; }
  throw new Error('expected the assertion to throw, and it did not');
}

const denied = { error: { code: INSUFFICIENT_PRIVILEGE, message: 'new row violates row-level security policy' } };
const empty = { rows: [] };
const oneRow = { rows: [{ id: 1 }] };
const constraintError = { error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
const codelessError = { error: { message: 'connection terminated' } };

test('classify separates a refusal from an empty read, and from every other error', () => {
  assert.deepEqual(classify(denied), { kind: 'denied', code: INSUFFICIENT_PRIVILEGE });
  assert.deepEqual(classify(empty), { kind: 'empty', rows: 0 });
  assert.deepEqual(classify(oneRow), { kind: 'rows', rows: 1 });
  assert.equal(classify(constraintError).kind, 'errored');
  assert.equal(classify(codelessError).kind, 'errored');
});

// The assertion this module exists for.
test('expectDenied refuses to accept an empty result as a denial', () => {
  assert.deepEqual(expectDenied(denied, 'viewer insert'), { kind: 'denied', code: INSUFFICIENT_PRIVILEGE });

  const thrown = caught(() => expectDenied(empty, 'viewer insert'));
  assert.ok(thrown instanceof AssertionOutcome);
  assert.match(thrown.message, /An empty result is NOT a denial/);
  // And the message says WHY, because the reader of a failing test has to know that the fix is a
  // policy and not a different fixture.
  assert.match(thrown.message, /would pass with RLS entirely off/);
});

test('expectDenied does not accept an unrelated error as a working policy', () => {
  const thrown = caught(() => expectDenied(constraintError, 'viewer insert'));
  assert.ok(thrown instanceof AssertionOutcome);
  assert.match(thrown.message, /not an RLS refusal/);
  assert.match(thrown.message, /different bug/);
  // A driver failure with no code must not be read as a refusal either.
  assert.throws(() => expectDenied(codelessError, 'viewer insert'), /not an RLS refusal/);
});

test('expectDenied fails loudly when the operation was simply permitted', () => {
  const thrown = caught(() => expectDenied(oneRow, 'suspended user update'));
  assert.ok(thrown instanceof AssertionOutcome);
  assert.match(thrown.message, /The operation was permitted/);
});

test('expectNoRows is a read assertion and will not stand in for a denial', () => {
  assert.deepEqual(expectNoRows(empty, 'anonymous read'), { kind: 'empty', rows: 0 });
  assert.throws(() => expectNoRows(oneRow, 'anonymous read'), /1 row\(s\) were visible/);
  // A read that errors was not filtered — it failed, which is a different fact.
  assert.throws(() => expectNoRows(denied, 'anonymous read'), /not a read that was filtered/);
});

test('expectRows exists so a negative assertion is never vacuous', () => {
  assert.deepEqual(expectRows(oneRow, 'owner sees workspace A'), { kind: 'rows', rows: 1 });
  const thrown = caught(() => expectRows(empty, 'owner sees workspace A'));
  assert.ok(thrown instanceof AssertionOutcome);
  assert.match(thrown.message, /every negative assertion beside it is vacuous/);
});

// The composed rule. Either half alone passes on a database where RLS does nothing at all.
test('a visibility rule needs both halves, and fails when either is missing', () => {
  assert.deepEqual(expectVisibleOnly(oneRow, empty, 'workspace A vs B'), { kind: 'isolated' });

  // RLS off and the table empty: the "hidden" half passes, the "seen" half does not.
  assert.throws(() => expectVisibleOnly(empty, empty, 'workspace A vs B'), /own rows visible/);

  // RLS off and the table populated: the "seen" half passes, the "hidden" half catches it.
  assert.throws(() => expectVisibleOnly(oneRow, oneRow, 'workspace A vs B'), /other tenant's rows hidden/);
});

// The auth-context helpers are SQL, so what is checkable here is the property that makes them safe.
test('every auth context helper scopes its setting to the transaction', async () => {
  const sql = await readFile('db/foundation/test-helpers/auth-context.sql', 'utf8');
  const setConfigCalls = [...sql.matchAll(/set_config\(\s*'[^']+'\s*,[\s\S]*?,\s*(true|false)\s*\)/g)];
  assert.ok(setConfigCalls.length >= 6, 'the helpers set both the role and the JWT claims for each identity');
  for (const call of setConfigCalls) {
    assert.equal(call[1], 'true',
      'set_config must be transaction-local. A session-level setting survives the transaction, and under a '
      + "transaction-mode pooler the next request on that connection inherits it — deny-by-default RLS then "
      + 'evaluates a wrong but valid identity and returns another tenant\'s rows with no error anywhere.');
  }
  // as_user must refuse a null subject, or the anonymous case passes wearing a user's name.
  assert.match(sql, /as_user\(null\)[\s\S]{0,200}anonymous case/);
  // The service helper must never reach for a role that bypasses RLS.
  assert.match(sql, /app_worker/);
  assert.doesNotMatch(sql, /set_config\(\s*'role'\s*,\s*'service_role'/);
  assert.doesNotMatch(sql, /set_config\(\s*'role'\s*,\s*'postgres'/);
});

// A write filtered by a USING clause raises nothing and changes nothing. The module's opening
// comment originally claimed every refused write raises 42501 — true only of WITH CHECK — and A1
// found it while writing the first real isolation suite. The correction needed a third assertion,
// because neither of the existing two is right for that outcome: expectDenied fails against a
// correct database, and expectNoRows cannot tell a filtered write from a row that was never there.
const witnessed = { rows: [{ id: 'w-1', name: 'original' }] };

test('expectNoEffect requires the empty write AND a witness that the row is unchanged', () => {
  assert.deepEqual(
    expectNoEffect(empty, witnessed, { name: 'original' }, 'viewer update'),
    { kind: 'no-effect', witnessed: 1 });

  // RLS off: the write landed, so the witness sees the new value. This is the case expectNoRows
  // would have passed.
  const changed = { rows: [{ id: 'w-1', name: 'edited' }] };
  const rewritten = caught(() => expectNoEffect(empty, changed, { name: 'original' }, 'viewer update'));
  assert.match(rewritten.message, /The row changed, so the write was not filtered/);
  assert.match(rewritten.message, /what an assertion sees when RLS is off/);

  // The fixture never loaded: an empty write against a row that does not exist proves nothing,
  // and every assertion in the suite beside it is vacuous.
  const missing = caught(() => expectNoEffect(empty, empty, { name: 'original' }, 'viewer update'));
  assert.match(missing.message, /the fixture did not load/i);

  // A write that was actually permitted.
  assert.throws(() => expectNoEffect(oneRow, witnessed, { name: 'original' }, 'viewer update'),
    /It was not filtered/);
});

test('expectNoEffect refuses to absorb a WITH CHECK refusal, which is a stronger outcome', () => {
  const thrown = caught(() => expectNoEffect(denied, witnessed, { name: 'original' }, 'viewer insert'));
  assert.match(thrown.message, /refused with 42501 rather than filtered/);
  assert.match(thrown.message, /would hide which clause is doing the work/);
});

// The guard the auth helpers depend on, and the helpers' use of it.
test('the transaction guard is called by every identity helper and explains itself', async () => {
  const sql = await readFile('db/foundation/test-helpers/auth-context.sql', 'utf8');

  // Its first version required a transaction id, which a read-only transaction never has — so it
  // raised inside a legitimate read block and had to be worked around with a GUC. A guard that has
  // to be worked around is a guard on its way to being deleted.
  assert.doesNotMatch(sql, /txid_current_if_assigned\(\)\s*is not null/,
    'the transaction-id check was the hole; it must not still be doing the work');
  assert.match(sql, /transaction_timestamp\(\) = statement_timestamp\(\)/);

  // Every identity helper must call it. A guard nothing invokes protects nothing.
  const callers = [...sql.matchAll(/create or replace function private\.(as_\w+)\(/g)].map((m) => m[1]);
  assert.ok(callers.length >= 3, 'the identity helpers are present');
  for (const fn of ['as_anonymous', 'as_user', 'as_service']) {
    const body = sql.slice(sql.indexOf(`function private.${fn}(`));
    const end = body.indexOf('$$;');
    assert.match(body.slice(0, end), /perform private\.assert_in_transaction\(\)/,
      `${fn} must assert it is in a transaction — SET LOCAL outside one silently assumes nothing, and the test then exercises whatever identity the connection already had`);
  }
});

// Redaction, proven on the function rather than through psql — this host has no psql, so a test
// that drove the driver end to end would pass without ever reaching the code it claims to check.
//
// The defect this closes was invisible until the live targets were actually wired: psql prints the
// HOST in its own error text ("could not translate host name ..."), and the driver passed stderr
// through untouched. The test asserting a connection string never reaches the output caught it on
// the first CI run that had a database to fail against.
test('the driver strips every part of the connection string, not a format it recognises', async () => {
  const { redactConnection } = await import('../../scripts/db/psql-driver.mjs');
  const url = 'postgresql://appuser:hunter2@db.example.invalid:5432/prodstore';

  // psql's actual phrasing, and two others it has never printed — the point is that the redaction
  // does not depend on knowing any of them.
  const messages = [
    'psql: error: could not translate host name "db.example.invalid" to address',
    'connection to server at "db.example.invalid" (10.0.0.1), port 5432 failed',
    'FATAL: password authentication failed for user "appuser" on database "prodstore"',
    'retrying postgresql://appuser:hunter2@db.example.invalid:5432/prodstore',
  ];
  for (const message of messages) {
    const out = redactConnection(message, url);
    for (const secret of ['hunter2', 'db.example.invalid', 'appuser', 'prodstore']) {
      assert.ok(!out.includes(secret),
        `${JSON.stringify(secret)} survived redaction in ${JSON.stringify(out)} — redaction must work from the URL we hold, not from psql's phrasing`);
    }
  }

  // It must not blank out ordinary text: a message with nothing sensitive in it stays readable,
  // or the operator loses the diagnosis along with the secret.
  assert.equal(redactConnection('relation "app.workspaces" does not exist', url),
    'relation "app.workspaces" does not exist');

  // And an unparseable URL still gets the scheme rule rather than silently redacting nothing.
  assert.match(redactConnection('see postgresql://whatever/here', 'not-a-url'), /\[redacted\]/);
});
