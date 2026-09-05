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

export const FIXTURE_CATALOG = 'db/foundation/seeds/fixture-catalog.json';
export const FIXTURE_SQL = 'tests/db/identity/fixtures/010-identity-fixture.sql';

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

// The outcome kind → assertion mapping, as data. `no-effect` is handled by the runner because it
// is two assertions rather than one; the others are exactly the helper module's functions, with
// nothing wrapped and nothing softened.
export const ASSERTION_FOR = {
  rows: expectRows,
  'no-rows': expectNoRows,
  denied: expectDenied,
};

// Assuming an identity is the part a test gets wrong invisibly. `SET LOCAL` is scoped to the
// transaction and cannot leak onto the next request that lands on a pooled connection; the
// foundation's auth-context helpers are all written that way, and this runner never sets a role
// itself, so it cannot introduce a session-level SET behind their backs.
//
// private.in_test_txn is set because private.assert_in_transaction() is otherwise unsatisfiable
// on a read-only transaction: it looks for an assigned xid, which a transaction that has not
// written does not have. Recorded in the handoff as a foundation observation, not patched here —
// the helper belongs to DB-00.
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

      const assertion = ASSERTION_FOR[testCase.expect];
      if (!assertion) throw new Error(`${testCase.id}: unknown outcome kind '${testCase.expect}'`);
      assertion(outcome, testCase.id);
      // A case that names the layer that must refuse it is held to it. Four cases declare
      // `deniedBy: 'grant'` and, until A1's countersignature §5.6 said so, nothing checked them --
      // and a missing grant and a missing policy raise the same 42501, so a case that cannot tell
      // them apart passes just as happily when the policy it exists to prove was never written.
      //
      // Silence is not a claim: a case declaring no layer is not checked here.
      if (testCase.expect === 'denied' && testCase.deniedBy) {
        expectDeniedBy(outcome, testCase.deniedBy, testCase.id);
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
    + '  choice to A0. Wire it behind `make db-rls-smoke`, after applying 000, 001, 010 and\n'
    + `  ${FIXTURE_SQL}.\n`
    + '  Until that happens, tenant isolation for batch 010 is UNPROVEN. Nothing here says otherwise.\n');
  process.exit(1);
}
