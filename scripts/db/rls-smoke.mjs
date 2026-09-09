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

import { query, queryFinal, connectionString, openSession } from './psql-driver.mjs';
import { buildCases, SMOKE_COVERAGE } from '../../tests/db/identity/isolation-cases.mjs';
import { fixtureResolver, runCases, formatReport, FIXTURE_SQL_FILES } from '../../tests/db/identity/run-isolation.mjs';

// Statements are accumulated and flushed as one psql invocation per case, because a transaction
// cannot survive psql exiting. `begin` opens a buffer; `exec` appends and, for the statement whose
// result is needed, runs the buffer so far and returns that result; `rollback` discards.
// `runQuery` is a seam, not a convenience: the `reset role;` decision below is a privilege
// decision, and a test that cannot see the SQL this driver actually assembles cannot check one.
// THE TWO DECISIONS BOTH DRIVERS MAKE, LIFTED SO THERE IS ONE COPY OF EACH.
//
// §6.3 of evidence/WP-0A-DB-00/parallel-integration-2026-09-07.md as a rule: batch 110 found seven
// hand-built copies of one set, six of which failed loudly at a rebase and the seventh of which
// passed by asking about a table that never existed. A privilege decision with two copies is that
// defect where it costs the most, so `sessionDriver` below calls these rather than restating them.

// psql has no bind parameters through --command and none through stdin either, so values are
// inlined as SQL literals. A single quote is doubled, which is the whole of SQL string-literal
// escaping under standard_conforming_strings -- on by default since 9.1, so a backslash is an
// ordinary character. A NUL byte cannot appear in a Postgres text value at all, so it is refused
// rather than truncated silently somewhere downstream.
export function inlineParams(statement, params) {
  let sql = statement;
  (params ?? []).forEach((value, index) => {
    const text = String(value);
    if (text.includes('\u0000')) {
      throw new Error('refusing to inline a parameter containing a NUL byte: Postgres text cannot hold one');
    }
    sql = sql.split(`$${index + 1}`).join(`'${text.split("'").join("''")}'`);
  });
  return sql;
}

// DECIDED FROM THE STATEMENT, NEVER FROM THE STATEMENT WITH VALUES IN IT (C0's review D7): a case
// passing the literal text `private.as_` as a VALUE -- and the cases do pass free text like
// 'renamed by the service' -- would otherwise make its own statement run as the connection role
// instead of the identity under test.
//
// ANCHORED ON THE SHAPE OF A CALL rather than on a substring (A3's correction, batch 060). The
// pattern was `/\bprivate\.as_/`, and batch 060 put a real subject in `private`, so a substring
// test was ONE TABLE NAME away -- `private.as_of_date`, say -- from turning every case that reads
// it into a connection-role statement that passes while asserting nothing.
export function assumesIdentityCall(statement) {
  return /^\s*select\s+private\.as_\w+\s*\(/i.test(statement);
}

export function bufferedDriver(runQuery = queryFinal) {
  let buffer = [];
  const run = async (statement, params) => {
    return inlineParams(statement, params);
  };
  return {
    async begin() { buffer = ['begin;']; },
    async rollback() { buffer = []; },
    async exec(statement, params) {
      // Assuming an identity means calling into `private`, and only the connection role can reach
      // it — `authenticated` cannot, exactly as batch 000 intends. A case that has already switched
      // role therefore cannot switch again, and the witness read (which runs as a DIFFERENT
      // identity, on purpose) failed with `permission denied for schema private` on all seven
      // no-effect cases.
      //
      // The reset has to happen OUTSIDE the helper: reaching the function at all requires the
      // privilege the helper would restore. So it is emitted here, in the adapter, immediately
      // before any identity call. It is scoped by the surrounding transaction like everything else,
      // and it is not a loosening — the privilege boundary is untouched; the caller simply steps
      // back to its own role before asking to become someone else.
      //
      // IT IS DECIDED FROM THE STATEMENT, NEVER FROM THE STATEMENT WITH VALUES IN IT. The first
      // version tested this pattern after parameters had been inlined, so a case passing the literal
      // text `private.as_` as a VALUE — and the cases do pass free-text names like 'renamed by the
      // service' — would have made its own statement run as the connection role instead of the
      // identity under test (C0's review D7). No fixture value triggered it and the escalation was
      // confined to a rolled-back transaction, but a control over a privilege decision must not be
      // reachable from data at all. The statement is the code; the parameters are not.
      //
      // A3 AI GATEWAY CORRECTION, batch 060, and it is an adjacency this batch CREATED rather than
      // a defect it found. The pattern was `/\bprivate\.as_/` — a substring test — and until now no
      // isolation case named `private.` at all, so the only statements it could match were the four
      // identity helpers. Batch 060 puts a real subject in `private`
      // (private.ai_credential_references, where §3.1 says secret references live) and eight cases
      // name it in their own SQL. A substring test is then ONE TABLE NAME away from turning a case's
      // own statement into a connection-role statement: a table called `private.as_of_date`, say,
      // would make every case reading it run as the role that BYPASSES row level security, and the
      // case would pass while asserting nothing. So the test is anchored on the SHAPE of an identity
      // call — a `select` of a `private.as_*` FUNCTION — which the four helpers have and no `select
      // ... from private.<table>` can acquire.
      const assumesIdentity = assumesIdentityCall(statement);
      const sql = await run(statement, params);
      if (assumesIdentity) buffer.push('reset role;');
      const final = sql.trim().endsWith(';') ? sql : `${sql};`;
      // Everything so far is replayed as the prelude, and only THIS statement's result is read
      // back. Running the buffer as one script and parsing all of its output is what made a
      // `set_config` row and a header line indistinguishable from a visible tenant row; the driver
      // marks the boundary because only the driver knows what psql prints.
      const outcome = await runQuery({ prelude: [...buffer], statement: final, epilogue: ['rollback;'] });
      buffer.push(final);
      return outcome;
    },
  };
}

// The same driver interface over ONE session, and it is SHORTER than the buffered one because the
// buffer was never the point: it existed only because psql exited between commands, so a case had
// to be replayed from its first statement to get a transaction back. With a session, `begin`
// begins, `exec` executes, `rollback` rolls back, and the replay is gone -- 1,797 psql invocations
// for 554 cases becomes one process for the whole run.
//
// WHAT IS DELIBERATELY IDENTICAL: the two decisions above are called, not restated. The `reset
// role;` emission is still made from the STATEMENT rather than from the statement with values in
// it, and it is still emitted immediately before an identity call and inside the surrounding
// transaction, so the privilege boundary this harness rests on is the same one -- the only change
// is what carries the statement to the server.
//
// WHAT IS NOT: this driver reads one statement's result at a time from a stream, so the fencing
// and the refusal to guess a boundary live in openSession rather than in queryFinal. `runQuery` is
// kept as a seam here for the same reason it is a seam above: a test that cannot see what the
// driver assembles cannot check a privilege decision.
export function sessionDriver(session) {
  return {
    async begin() { return session.exec('begin;'); },
    // Always issued, from runOne's `finally`, and the session DEPENDS on it: an error leaves the
    // transaction aborted, and this is what clears it before the next case.
    async rollback() { return session.exec('rollback;'); },
    async exec(statement, params) {
      const assumesIdentity = assumesIdentityCall(statement);
      const sql = inlineParams(statement, params);
      if (assumesIdentity) {
        const reset = await session.exec('reset role;');
        if (reset?.error) return reset;
      }
      const final = sql.trim().endsWith(';') ? sql : `${sql};`;
      return session.exec(final);
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

  // The fixtures, IN ORDER, and one psql invocation each. Batch 020's businesses carry foreign
  // keys to batch 010's workspaces, so the sequence is a dependency and not a preference — and a
  // failure names WHICH file failed, because "the fixture did not load" over a concatenation of
  // two is a message that sends the reader to the wrong file half the time.
  for (const path of FIXTURE_SQL_FILES) {
    const loaded = await query(await readFile(path, 'utf8'));
    if (loaded.error) {
      stderr.write(`db-rls-smoke: ${path} did not load: ${loaded.error.message}\n`
        + '  Every negative assertion below would be vacuous against an empty database, so this is a\n'
        + '  failure rather than a suite with nothing to find.\n');
      return 1;
    }
  }

  const resolve = await fixtureResolver();
  const cases = buildCases(resolve);
  // One session for every case, closed in a `finally` so a throw does not leave psql running.
  const session = openSession();
  let result;
  try {
    result = await runCases(cases, sessionDriver(session));
  } finally {
    await session.close();
  }
  stdout.write(formatReport(result));

  // RFC-2026-020 §6.2, executed here rather than cited anywhere.
  //
  // The decision batch 011 implements is NOT IN EFFECT until two claims are discharged BY
  // EXECUTION, and they need a real Postgres to discharge. This is the target that has one: the
  // same service container `make db-rls-smoke` already uses, on every pull request. Wiring them
  // here rather than adding a workflow step is deliberate — .github/workflows/ci.yml belongs to
  // another package, and a proof that only runs when someone remembers to add a step is a proof
  // with a step between it and the build.
  //
  // The proofs run AFTER the isolation cases, and both exit codes are combined. Order matters for
  // one specific reason: CI's negative control disables row level security on app.workspaces and
  // requires this target to fail while REPORTING a failed case. Running the cases first means that
  // report is always printed, so the control still fails for the reason it exists to detect rather
  // than being satisfied by a proof erroring first.
  reportCoverage();
  const proofs = await runAuthzProofs();
  return result.failed.length === 0 && proofs === 0 ? 0 : 1;
}

async function runAuthzProofs() {
  const { main: proveAuthz } = await import('./authz-proofs.mjs');
  try {
    return await proveAuthz();
  } catch (failure) {
    stderr.write(`db-authz-proofs: FAILED — the proofs did not run: ${failure.message}\n`
      + '  RFC-2026-020 is not in effect until §6.2 is discharged by execution, and a run that could not\n'
      + '  execute them has not discharged them. This is a failure, not a skip.\n');
    return 1;
  }
}

// The coverage claim is printed with the result, so nobody reads "N cases passed" as "§12.6 is
// covered". A1 recorded which assertions this batch's tables can carry and which they cannot.
//
// A2 KNOWLEDGE CORRECTION, batch 040. The filter was `!v.covered`, which printed only the rows
// claiming NOTHING and silently dropped every PARTIAL one — `covered: 'negative-half'` is a
// truthy string, so §12.6/8 had never once appeared in this report despite the map saying in terms
// that half of it is not asserted. Batch 040 makes §12.6/3 partial too (`knowledge-half`: the
// knowledge tables exist and the approver is refused them; content is batch 080), and a run that
// printed neither would be reporting six of eight assertions as an unqualified pass.
//
// So the filter is `covered !== true` and the LABEL is printed beside the key. A partial claim that
// looks identical to a full one in the output is how "N cases passed" starts being read as "§12.6
// is covered", which is the exact misreading this function was written to prevent.
function reportCoverage() {
  const owed = Object.entries(SMOKE_COVERAGE ?? {}).filter(([, v]) => v.covered !== true);
  if (owed.length === 0) return;
  const label = ([k, v]) => (v.covered ? `${k} (${v.covered})` : k);
  stdout.write(`  §12.6 assertions this batch does not fully carry: ${owed.map(label).join(', ')}\n`);
  for (const [k, v] of owed) stdout.write(`    ${k}: ${v.note}\n`);
}

if (import.meta.url === `file://${argv[1]}`) exit(await main());
