import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  AssertionOutcome, INSUFFICIENT_PRIVILEGE, classify,
  expectDenied, expectNoRows, expectRows, expectVisibleOnly,
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
