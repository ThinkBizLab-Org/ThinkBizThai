#!/usr/bin/env node
// The adapter behind `make db-rls-smoke`, and the only thing standing between A1's isolation cases
// and a database.
//
// A1 wrote runCases against a driver interface — { begin, rollback, exec } — and deliberately did
// not choose a client, because RFC-2026-001 forbids a dependency and DATA-DEC-02 leaves the tool to
// A0. This is that choice, made in a file a reviewer can read.
//
// One detail decides whether any of it means anything: **every case runs in its own transaction and
// is rolled back.** A write case that committed would leave the fixture altered, and every case
// after it would assert against a state nobody described. psql exits between commands, so a
// transaction cannot span invocations — the whole case is therefore assembled into ONE psql call,
// with the identity, the statement and the rollback in a single script.
import { readFile } from 'node:fs/promises';
import { argv, env, exit, stdout, stderr } from 'node:process';

import { query, connectionString } from './psql-driver.mjs';
import { buildCases, SMOKE_COVERAGE } from '../../tests/db/identity/isolation-cases.mjs';
import { fixtureResolver, runCases, formatReport, FIXTURE_SQL } from '../../tests/db/identity/run-isolation.mjs';

// Statements are accumulated and flushed as one psql invocation per case, because a transaction
// cannot survive psql exiting. `begin` opens a buffer; `exec` appends and, for the statement whose
// result is needed, runs the buffer so far and returns that result; `rollback` discards.
function bufferedDriver() {
  let buffer = [];
  const run = async (statement, params) => {
    // psql has no bind parameters through --command, so values are inlined as SQL literals.
    //
    // The first version permitted only fixture UUIDs, on the theory that restricting the SHAPE
    // prevented SQL being assembled from arbitrary text. It refused legitimate values instead —
    // the cases pass token seeds and ordinary strings like 'renamed by the service' — so the rule
    // blocked the suite rather than an attacker, and CI said so on seven cases.
    //
    // Escaping is the right control; shape is not. A single quote is doubled, which is the whole of
    // SQL string-literal escaping under standard_conforming_strings — on by default since 9.1, and
    // a backslash is therefore an ordinary character. A NUL byte cannot appear in a Postgres text
    // value at all, so it is refused rather than truncated silently somewhere downstream.
    let sql = statement;
    (params ?? []).forEach((value, index) => {
      const text = String(value);
      if (text.includes('\u0000')) {
        throw new Error('refusing to inline a parameter containing a NUL byte: Postgres text cannot hold one');
      }
      sql = sql.split(`$${index + 1}`).join(`'${text.split("'").join("''")}'`);
    });
    return sql;
  };
  return {
    async begin() { buffer = ['begin;']; },
    async rollback() { buffer = []; },
    async exec(statement, params) {
      const sql = await run(statement, params);
      buffer.push(sql.trim().endsWith(';') ? sql : `${sql};`);
      // Run everything so far, then roll back, so the result reflects the case's state without
      // leaving any of it behind.
      const outcome = await query([...buffer, 'rollback;'].join('\n'));
      return outcome;
    },
  };
}

async function main() {
  try { connectionString(); } catch (failure) {
    stderr.write(`db-rls-smoke: ${failure.message}\n`);
    return 1;
  }

  // The auth-context helpers are TEST scaffolding, not a migration: they exist so a test can assume
  // an identity, and shipping them in db/foundation/migrations would put test-only functions in
  // every deployed database. So the smoke target applies them, and db-migrate-clean does not.
  //
  // Leaving this out is what the first CI run found: all 28 cases failed with
  // `42883: function private.assert_in_transaction does not exist`, reported at the
  // ASSUME-IDENTITY phase. That phase separation is A1's, and it earned itself here — the same
  // failure folded into the assertion phase would have read as "the identity was denied", which is
  // what a passing isolation suite looks like from the outside.
  const helpers = await readFile('db/foundation/test-helpers/auth-context.sql', 'utf8');
  const installed = await query(helpers);
  if (installed.error) {
    stderr.write(`db-rls-smoke: the auth-context helpers did not install: ${installed.error.message}\n`
      + '  Without them every case fails at assume-identity, which is not the same as being denied.\n');
    return 1;
  }

  const fixture = await readFile(FIXTURE_SQL, 'utf8');
  const loaded = await query(fixture);
  if (loaded.error) {
    stderr.write(`db-rls-smoke: the fixture did not load: ${loaded.error.message}\n`
      + '  Every negative assertion below would be vacuous against an empty database, so this is a\n'
      + '  failure rather than a suite with nothing to find.\n');
    return 1;
  }

  const resolve = await fixtureResolver();
  const cases = buildCases(resolve);
  const result = await runCases(cases, bufferedDriver());
  stdout.write(formatReport(result));

  // The coverage claim is printed with the result, so nobody reads "N cases passed" as "§12.6 is
  // covered". A1 recorded which assertions this batch's tables can carry and which they cannot.
  const uncovered = Object.entries(SMOKE_COVERAGE ?? {}).filter(([, v]) => !v.covered);
  if (uncovered.length > 0) {
    stdout.write(`  §12.6 assertions this batch cannot carry: ${uncovered.map(([k]) => k).join(', ')}\n`);
    for (const [k, v] of uncovered) stdout.write(`    ${k}: ${v.note}\n`);
  }
  return result.failed.length === 0 ? 0 : 1;
}

if (import.meta.url === `file://${argv[1]}`) exit(await main());
