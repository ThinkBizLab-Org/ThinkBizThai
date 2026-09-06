// The batch 010 isolation runner.
//
// Owner: A1 Identity.
//
// It takes an `exec` and nothing else. `exec(sql, params)` returns `{ rows }` or
// `{ error: { code, message } }` — the shape db/foundation/test-helpers/rls-assertions.mjs already
// classifies, and the shape every Postgres driver can be adapted to in about ten lines.
//
// WHY IT IS WRITTEN AS AN INJECTION RATHER THAN AS A DRIVER
//
// The repository declares no dependency and a test forbids adding one (RFC-2026-001), so there is
// no Postgres client here to import. DATA-DEC-02 fixes the command contract and deliberately
// names no tool, and choosing one is A0's, not A1's. So this file contains the ASSERTIONS, which
// are A1's to write, and none of the connecting, which is not.
//
// The consequence is stated rather than hidden: **running this against a real database is A0
// wiring `make db-rls-smoke` to it.** Until then the suite is executable specification plus the
// static checks in identity-isolation.test.mjs, and nothing anywhere reports that tenant
// isolation has been proven. It has not been. RFC-2026-017 §7 says so, and this file does not
// change that — it makes the proof possible, which is a different claim.

import { readFile } from 'node:fs/promises';

import {
  expectDenied, expectDeniedBy, expectNoRows, expectRows,
} from '../../../db/foundation/test-helpers/rls-assertions.mjs';
import { NOT_A_CONSTRAINT_CODE } from './isolation-cases.mjs';

export const FIXTURE_CATALOG = 'db/foundation/seeds/fixture-catalog.json';

// The tenant fixtures, IN APPLICATION ORDER, which is the order the migrations that need them
// land in. Batch 020's businesses reference batch 010's workspaces by foreign key, so a loader
// that applied these as a set rather than as a sequence would fail on the first row.
//
// A list rather than a constant because batch 020 is the first batch to add one, and the shape a
// second entry forces is the shape every later batch needs. `FIXTURE_SQL` used to be a single
// path; nothing outside this file and scripts/db/rls-smoke.mjs read it, and both now read the
// list, so there is no stale singular left behind to be loaded by mistake.
export const FIXTURE_SQL_FILES = [
  'tests/db/identity/fixtures/010-identity-fixture.sql',
  'tests/db/identity/fixtures/020-business-fixture.sql',
];

// §12.6 and db/foundation/README: ids are READ, never generated. An unknown symbol is a hard
// failure and not a generated uuid, because a test that invents its own id has failures nobody
// can reproduce and a cross-tenant assertion nobody can trust.
export async function fixtureResolver(catalogPath = FIXTURE_CATALOG) {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  return (symbol) => {
    const entry = catalog.identities?.[symbol];
    if (!entry?.uuid) {
      throw new Error(`fixture symbol '${symbol}' is not in ${catalogPath}. Ids are read from the `
        + 'catalog, never generated: a generated id makes a failure unreproducible, and it makes '
        + 'the cross-tenant assertion worthless, because the whole control is that tenant A holds '
        + "tenant B's EXACT id and still cannot reach it.");
    }
    return entry.uuid;
  };
}

// The outcome kind → assertion mapping, as data. `no-effect` and `rejected` are handled by the
// runner because neither is one of the helper module's assertions; the others are exactly those
// functions, with nothing wrapped and nothing softened.
export const ASSERTION_FOR = {
  rows: expectRows,
  'no-rows': expectNoRows,
  denied: expectDenied,
};

// `rejected`, which batch 020 needed and the helper module deliberately does not provide.
//
// rls-assertions.mjs is about ROW LEVEL SECURITY, and its whole design turns on refusing to call
// anything other than 42501 a denial: "a constraint violation or a malformed fixture is a different
// bug and must not be read as a working policy". This is the other side of that sentence. §4
// invariant 10 requires an unrelated Workspace/Business/Page triple to fail AT THE DATABASE, and
// the thing that fails it is a composite FOREIGN KEY — 23503, not 42501. A case asserting that
// invariant must therefore demand the constraint's own code, or it would pass on a database where
// the constraint had been dropped and a policy refused first.
//
// It lives here rather than in rls-assertions.mjs on purpose: adding a non-RLS assertion to the RLS
// helper module is how "any error counts" gets back in through the module that exists to keep it
// out.
export function assertRejectedWith(result, sqlstate, what) {
  const code = result?.error?.code ?? null;
  if (code === sqlstate) return { kind: 'rejected', code };
  if (!result?.error) {
    const rows = result?.rows?.length ?? 0;
    throw new Error(`${what}: the database accepted the row (${rows} returned) and had to refuse it with `
      + `${sqlstate}. A relation invariant enforced by nothing is a relation invariant that is not enforced.`);
  }
  throw new Error(`${what}: the database refused with ${code ?? 'an error carrying no SQLSTATE'} and the case `
    + `demands ${sqlstate}. These are not interchangeable: ${NOT_A_CONSTRAINT_CODE} means a POLICY stopped the `
    + 'row, and a case that accepted it would pass unchanged on a database whose constraint had been dropped — '
    + `which is the constraint this case exists to prove. Message: ${result.error.message ?? ''}`);
}

// Assuming an identity is the part a test gets wrong invisibly. `SET LOCAL` is scoped to the
// transaction and cannot leak onto the next request that lands on a pooled connection; the
// foundation's auth-context helpers are all written that way, and this runner never sets a role
// itself, so it cannot introduce a session-level SET behind their backs.
//
// private.in_test_txn is set because private.assert_in_transaction() is otherwise unsatisfiable
// on a read-only transaction: it looks for an assigned xid, which a transaction that has not
// written does not have. Recorded in the handoff as a foundation observation, not patched here —
// the helper belongs to DB-00.
// The role each helper must leave behind, so the caller can CHECK rather than trust. These are the
// values db/foundation/test-helpers/auth-context.sql sets, and the check below reads them back in a
// SEPARATE statement, which is the whole point.
export const ROLE_FOR_HELPER = {
  as_anonymous: 'anon',
  as_user: 'authenticated',
  as_suspended_user: 'authenticated',
  as_service: 'app_worker',
};

// The statement that verifies it, kept beside the map so the two cannot drift apart.
export const VERIFY_IDENTITY_SQL = "select current_setting('role', true) as role";

export function assumeIdentity(identity) {
  // A0 CORRECTION during integration, not by A1.
  //
  // These two statements were here because the auth-context guard demanded them: a GUC to work
  // around a check that refused read-only transactions, and an explicit call to the guard itself.
  // Both were rituals a proxy imposed on its callers, and A1 named that problem while writing them.
  //
  // The guard is no longer a proxy. Each helper now reads its own setting back and raises if
  // SET LOCAL did not take, which is the property anyone actually cares about, so the caller has
  // nothing left to perform. Removing them is not loosening the check; it is deleting the
  // workaround the check used to require.
  const statements = [];
  if (identity.helper === 'as_anonymous') statements.push('select private.as_anonymous()');
  else if (identity.helper === 'as_service') statements.push('select private.as_service()');
  else statements.push(`select private.${identity.helper}($1::uuid)`);
  return statements;
}

/**
 * Run every case. Returns a report; throws nothing, so a caller sees ALL failures rather than the
 * first one — an isolation suite that stops at the first failure hides how many policies are
 * wrong.
 *
 * @param {object[]} cases     from buildCases()
 * @param {object}   driver    { begin, rollback, exec } — each returns a promise. Every case runs
 *                             in its own transaction and every transaction is rolled back, so a
 *                             permitted write (there are two) cannot make a later case pass.
 */
// Did the identity actually take, in a statement AFTER the one that assumed it?
//
// The helpers each read their own setting back and raise if it did not take. That check cannot fail:
// a helper call is ONE statement, so it is its own implicit transaction when there is no explicit
// one, and `set_config(..., true)` applies for exactly that statement -- measured on the provisioned
// instance 2026-09-06:
//
//   select set_config('probe.a','applied',true), current_setting('probe.a', true);
//   -> set_config: applied | read_back_in_same_statement: applied
//
// and then, in a LATER statement of a later transaction, `current_setting('probe.a', true)` is null.
// So the read-back inside the helper always sees the value, including in the case the helper's own
// error message describes, and the guard is inert exactly where it claims to protect. C0's review
// D4 called it a third proxy protected by a grep; it is worse than that -- it cannot fire.
//
// What the caller CAN check is what it actually depends on: the role is still held one statement
// later. That is true only inside a transaction block, which is what the whole design turns on, and
// it fails loudly when a driver forgets to open one.
export async function verifyIdentity(driver, identity) {
  const expected = ROLE_FOR_HELPER[identity.helper];
  if (expected === undefined) return `unknown identity helper '${identity.helper}'`;
  const seen = await driver.exec(VERIFY_IDENTITY_SQL, []);
  if (seen?.error) return `could not read the role back after assuming it: ${seen.error.message}`;
  const role = seen?.rows?.[0]?.role ?? null;
  if (role === expected) return null;
  return `the identity did not survive the statement that set it: role is ${JSON.stringify(role)} `
    + `and ${identity.helper} sets ${JSON.stringify(expected)}. SET LOCAL is scoped to a transaction, `
    + 'so this is what a driver that did not open one looks like — and every assertion after it would '
    + 'have run as the connection role rather than as the identity under test.';
}

export async function runCases(cases, driver) {
  const results = [];
  for (const testCase of cases) {
    results.push(await runOne(testCase, driver));
  }
  return {
    total: results.length,
    failed: results.filter((r) => !r.ok),
    results,
  };
}

async function runOne(testCase, driver) {
  const base = { id: testCase.id, covers: testCase.covers, expect: testCase.expect };
  try {
    await driver.begin();
    try {
      for (const statement of assumeIdentity(testCase.as)) {
        const setup = await driver.exec(statement, testCase.as.subject ? [testCase.as.subject] : []);
        if (setup?.error) {
          // A failure to ASSUME the identity must never read as the identity being denied. This is
          // the difference between "app_worker cannot do it" and "we never became app_worker".
          return { ...base, ok: false, phase: 'assume-identity', detail: setup.error.message };
        }
      }
      const held = await verifyIdentity(driver, testCase.as);
      if (held !== null) return { ...base, ok: false, phase: 'assume-identity', detail: held };

      const outcome = await driver.exec(testCase.sql, testCase.params);

      if (testCase.expect === 'no-effect') {
        // Two assertions. Half one: the write returned nothing.
        expectNoRows(outcome, `${testCase.id}: the write must affect no row`);
        // Half two, the one an empty result cannot give: the target row is still there, and still
        // says what it said. This is what fails when RLS is off — the write succeeds, the witness
        // sees the new value — and what fails when the fixture never loaded.
        const witness = testCase.witness;
        for (const statement of assumeIdentity(witness.as)) {
          const setup = await driver.exec(statement, witness.as.subject ? [witness.as.subject] : []);
          if (setup?.error) return { ...base, ok: false, phase: 'assume-witness', detail: setup.error.message };
        }
        const witnessHeld = await verifyIdentity(driver, witness.as);
        if (witnessHeld !== null) return { ...base, ok: false, phase: 'assume-witness', detail: witnessHeld };
        const seen = await driver.exec(witness.sql, witness.params);
        expectRows(seen, `${testCase.id}: the witness must still see the target row`);
        const actual = seen.rows[0][witness.column];
        if (actual !== witness.equals) {
          throw new Error(`${testCase.id}: the write was NOT stopped. ${witness.column} is `
            + `${JSON.stringify(actual)} and should still be ${JSON.stringify(witness.equals)}. `
            + 'The statement returned no rows, which on its own is also what an update returns when '
            + 'the row is absent — that is why this half exists.');
        }
        return { ...base, ok: true };
      }

      if (testCase.expect === 'rejected') {
        // The SQLSTATE is the assertion, so a case that forgot to declare one must fail rather
        // than fall through to "any error will do" — which is the exact shape this kind exists to
        // refuse. identity-isolation.test.mjs pins the same rule statically; this is the half that
        // holds when a case is added without running that suite.
        if (!testCase.sqlstate) {
          throw new Error(`${testCase.id}: a 'rejected' case must declare the SQLSTATE it expects. `
            + 'Without one it asserts only that something went wrong, which a broken fixture also '
            + 'satisfies.');
        }
        assertRejectedWith(outcome, testCase.sqlstate, testCase.id);
        return { ...base, ok: true };
      }

      const assertion = ASSERTION_FOR[testCase.expect];
      if (!assertion) throw new Error(`${testCase.id}: unknown outcome kind '${testCase.expect}'`);
      assertion(outcome, testCase.id);
      // A case that names the layer that must refuse it is held to it. Four cases declare
      // `deniedBy: 'grant'` and, until A1's countersignature §5.6 said so, nothing checked them --
      // and a missing grant and a missing policy raise the same 42501, so a case that cannot tell
      // them apart passes just as happily when the policy it exists to prove was never written.
      //
      // A0 CORRECTION, on C0's review D6: the layer alone was not an attribution. `permission
      // denied for schema private` -- the failure this harness produced on all seven no-effect
      // cases -- is 42501 and classifies as the same 'grant' layer as a refusal on the table under
      // test, so `deniedOn` is passed too and the refusal must name that relation.
      //
      // Silence is not a claim: a case declaring no layer is not checked here.
      if (testCase.expect === 'denied' && testCase.deniedBy) {
        expectDeniedBy(outcome, testCase.deniedBy, testCase.id, testCase.deniedOn);
      }
      return { ...base, ok: true };
    } finally {
      // Always. Two cases are permitted writes and both must vanish.
      await driver.rollback();
    }
  } catch (error) {
    return { ...base, ok: false, phase: 'assert', detail: error.message };
  }
}

export function formatReport(report) {
  if (report.failed.length === 0) {
    return `db-rls-smoke: ${report.total} isolation case(s) passed.\n`;
  }
  const lines = report.failed.map((f) => `  ${f.id} [${(f.covers ?? []).join(', ')}] (${f.phase}): ${f.detail}`);
  return `db-rls-smoke: FAILED — ${report.failed.length} of ${report.total} case(s)\n${lines.join('\n')}\n`;
}

// Executed directly, this refuses, in the shape scripts/db/run.mjs established: a target that
// cannot do its job exits non-zero and names what is missing, rather than reporting a pass it did
// not earn. There is no no-database mode.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.stderr.write(
    'tests/db/identity/run-isolation.mjs is a library, not a command.\n'
    + '  It needs a driver — { begin, rollback, exec } — and the repository declares no Postgres\n'
    + '  client, because RFC-2026-001 forbids adding a dependency and DATA-DEC-02 leaves the tool\n'
    + '  choice to A0. Wire it behind `make db-rls-smoke`, after applying 000, 001, 010, 011, 020\n'
    + `  and, in order, ${FIXTURE_SQL_FILES.join(' then ')}.\n`
    + '  Until that happens, tenant isolation for batches 010-020 is UNPROVEN. Nothing here says\n'
    + '  otherwise.\n');
  process.exit(1);
}
