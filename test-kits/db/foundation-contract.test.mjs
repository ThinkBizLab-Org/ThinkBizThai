import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { promisify } from 'node:util';
import test from 'node:test';
import { SQL_LINE_COMMENTS, SQL_LITERALS, canonicalStatements, lexSql, stripComments, walkLevels } from '../../scripts/db/sql-lexer.mjs';

import { LIVE, ORDER, contractCheck, schemaLint } from '../../scripts/db/run.mjs';

const run = promisify(execFile);

// DB-00 is the first package in this repository with no way to prove itself here: the RLS
// assertions the data package asks for need a live Postgres, this host has none, and the
// repository forbids adding a dependency. The failure mode that invites is obvious — a harness
// that prints `ok` because it found nothing to check.
//
// So what IS provable without a database is pinned properly, and the rest is pinned to REFUSE.
// A live target that exits 0 with no database would be the largest false clean-run this repository
// has produced, on the one surface where a false pass means tenant data.

const MIGRATION = 'db/foundation/migrations/000_foundation.sql';
const lintOf = (sql, name = '000_test.sql') => schemaLint([{ name, sql }]);

test('batch 000 passes its own lint, so the lint is not green by having nothing to read', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  assert.ok(sql.length > 500, 'batch 000 is present and not a stub');
  assert.deepEqual(await lintOf(sql, '000_foundation.sql'), []);
});

// The rule that exists because the data package's own lint spec misses it. `relrowsecurity` and
// `relforcerowsecurity` are two different catalog columns; a table with ENABLE and no FORCE passes
// the specified rule cleanly while its owner stays exempt from every policy. RFC-2026-016 records
// the gap. Batch 000 creates no table yet, so this is pinned against a synthetic one — which is
// the point: the rule has to bite before the first tenant table is written, not after.
test('the lint rejects ENABLE without FORCE, which the specified rule would pass', async () => {
  const enableOnly = `
    create table app.workspace (id uuid primary key);
    comment on table app.workspace is 'owner: A0';
    alter table app.workspace enable row level security;
  `;
  const problems = await lintOf(enableOnly);
  assert.ok(problems.some((p) => /does not FORCE ROW LEVEL SECURITY/.test(p)),
    `ENABLE without FORCE must be rejected, got ${JSON.stringify(problems)}`);

  const forced = `${enableOnly}\n alter table app.workspace force row level security;`;
  assert.deepEqual(await lintOf(forced), [], 'and the same table with FORCE must pass');
});

test('the lint rejects a tenant table with no owner comment and no primary key', async () => {
  const problems = await lintOf(`
    create table app.page (title text);
    alter table app.page enable row level security;
    alter table app.page force row level security;
  `);
  assert.ok(problems.some((p) => /has no owner comment/.test(p)), 'owner comment');
  assert.ok(problems.some((p) => /declares no primary key/.test(p)), 'primary key');
});

test('the lint rejects a SECURITY DEFINER function that does not pin an empty search_path', async () => {
  const unpinned = `
    create function private.whoami() returns text language sql security definer as $$
      select current_user;
    $$;
  `;
  assert.ok((await lintOf(unpinned)).some((p) => /empty search_path/.test(p)));

  const pinned = unpinned.replace('security definer', "security definer set search_path = ''");
  assert.deepEqual(await lintOf(pinned), []);
});

test('the lint rejects a view that is not security invoker, and any write to a managed schema', async () => {
  assert.ok((await lintOf('create view app.page_v as select 1;')).some((p) => /not security_invoker/.test(p)));
  assert.deepEqual(await lintOf('create view app.page_v with (security_invoker = true) as select 1;'), []);

  for (const schema of ['auth', 'storage', 'realtime']) {
    const problems = await lintOf(`create table ${schema}.shadow (id uuid primary key);`);
    assert.ok(problems.some((p) => p.includes(`'${schema}'`)),
      `writing to the Supabase-managed schema ${schema} must be rejected — §3.1`);
  }
});

test('the command contract exposes every target the data package names', async () => {
  assert.deepEqual(await contractCheck(await readFile('Makefile', 'utf8')), []);
  // And the check is not vacuous: a Makefile missing one target must be caught.
  const stripped = (await readFile('Makefile', 'utf8')).replace(/^db-rls-smoke:.*$/m, '');
  assert.ok((await contractCheck(stripped)).some((p) => p.includes('db-rls-smoke')));
});

// The heart of it. Every target that needs a database must FAIL without one, and say so.
test('a target needing a database refuses without one, rather than reporting a pass', async () => {
  const live = ['reset-test', 'migrate-clean', 'migrate-upgrade', 'seed-replay', 'rls-smoke', 'test-foundation'];
  const env = { ...process.env, DB_TEST_URL: '', LC_ALL: 'C', TZ: 'UTC' };
  delete env.DB_TEST_URL;

  for (const target of live) {
    const result = await run('node', ['scripts/db/run.mjs', target], { env }).then(
      (ok) => ({ code: 0, ...ok }),
      (err) => ({ code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }));
    assert.notEqual(result.code, 0, `db-${target} exited 0 with no database — it must never report a pass it cannot earn`);
    assert.match(result.stderr, /DB_TEST_URL/, `db-${target} must name the variable that would let it run`);
    assert.match(result.stdout, new RegExp(`db-${target}: FAILED`), `db-${target} must print a failing summary line`);
  }
  // The batch 150 prerequisite draft: the EXPLAIN harness is not a make target, and it refuses the same way --
  // with no database, and with a host off the db-reset-test allowlist -- before it writes anything.
  for (const [url, why] of [[undefined, /DB_TEST_URL/], ['postgresql://u@db.example.com:5432/x', /refuses this host/]]) {
    const henv = { ...env };
    if (url) henv.DB_TEST_URL = url;
    const result = await run('node', ['scripts/db/explain-harness.mjs'], { env: henv }).then(
      (ok) => ({ code: 0, ...ok }),
      (err) => ({ code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }));
    assert.equal(result.code, 2, `explain-harness with ${url ?? 'no database'} refuses with exit 2`);
    assert.match(result.stderr, why, 'and says why');
    assert.equal(result.stdout, '', 'and reports nothing it did not measure');
  }
  // Batch 150-prereq's review round (A1 S1, Q0 Q-4, C0-9): the host guard was a text match, and each URL below
  // passed it while libpq would connect somewhere else (measured: `?host=` wins over the authority; a host list
  // is tried in order). Both tools now share testHostRefusal, and each refuses every one before connecting. No
  // host here resolves or listens: .invalid names, a missing socket directory, TEST-NET-1.
  const { testHostRefusal, scrubbedEnv, redactConnection } = await import('../../scripts/db/psql-driver.mjs');
  const crafted = [
    'postgresql://postgres@127.0.0.1:5507/postgres?host=db.example.invalid',
    'postgresql://postgres@127.0.0.1:5507/postgres?host=/nonexistent-dir',
    'postgresql://postgres@localhost:5432,db.example.invalid:5432/app',
    'postgresql://postgres@127.0.0.1:5507/postgres?service=prod',
    'postgresql://postgres@127.0.0.1:5507/postgres?servicefile=/nonexistent-dir/pg_service.conf',
    'postgresql://postgres@127.0.0.1:5507/postgres?hostaddr=192.0.2.1',
    'postgresql://postgres@127.0.0.1:5507/postgres?HOST=db.example.invalid',
    'postgresql://app:secret@db.example.invalid:5432/app?options=@localhost/',
    'postgresql://postgres@q0-probe.invalid:5503/postgres?application_name=@localhost/',
    'postgresql://postgres@db.example.invalid/x?u=@localhost/',
    'postgresql://a@b@localhost:5432/x',
    'postgresql://localhost:5432/x',
    'postgresql://postgres@localhost.example.invalid:5432/x',
    'postgresql://postgres@127.0.0.1%2Cdb.example.invalid:5432/x',
    'mysql://postgres@localhost:5432/x',
    'postgresql://postgres@127.0.0.1:5507/postgres#?host=db.example.invalid',
    'postgresql://postgres@127.0.0.1:5507/postgres#x?hostaddr=192.0.2.1',
    'postgresql://postgres@127.0.0.1:5507/postgres?%68ost=db.example.invalid',
  ];
  for (const url of crafted) assert.ok(testHostRefusal(url), `${url}: refused by the shared guard`);
  for (const url of ['postgresql://postgres@localhost:5432/thinkbizthai_test', 'postgresql://postgres@127.0.0.1:5507/postgres',
    'postgres://postgres@[::1]:5432/x', 'postgresql://postgres@postgres:5432/x?sslmode=disable', 'postgresql://u:p%40ss@LOCALHOST/x']) {
    assert.equal(testHostRefusal(url), null, `${url}: a test instance, admitted (CI's URL among them)`);
  }
  assert.deepEqual(Object.keys(scrubbedEnv({ PGHOST: 'a', PGHOSTADDR: 'b', PGSERVICE: 'c', PGSERVICEFILE: 'd', PGPORT: '5', LC_ALL: 'C' })).sort(), ['LC_ALL', 'PGPORT'],
    'psql never inherits a host, address or service the URL left out');
  assert.equal(redactConnection('could not connect to db.internal.invalid', 'postgresql://postgres@127.0.0.1:5507/postgres?host=db.internal.invalid'), 'could not connect to [redacted]',
    'a query parameter\'s value is redacted too (A1 S6)');
  // EACH HALF OF THE FRAGMENT FIX HOLDS ON ITS OWN (the owed-tooling batch; Q0 G-1 on the guard fix: M1, the `#`
  // refusal removed, and M2, the raw-text query loop removed, each passed this test, because every crafted URL
  // was refused by both). `#frag` with no query is refused only by the `#` rule; ` host` (a percent-encoded
  // space before the key, which the WHATWG parser keeps and libpq trims) only by the raw loop's trim.
  assert.match(testHostRefusal('postgresql://postgres@127.0.0.1:5507/postgres#frag') ?? '', /contains a #/, 'the # rule alone refuses a bare fragment');
  assert.match(testHostRefusal('postgresql://postgres@127.0.0.1:5507/postgres?%20host=db.example.invalid') ?? '', /carries a host parameter/, 'the raw-text loop alone refuses a key the parser reads as " host"');
  assert.equal(new URL('postgresql://postgres@127.0.0.1:5507/postgres?%20host=x').searchParams.has('host'), false, 'measured: the parser does not read that key as host');
  // REDACTION READS THE RAW QUERY TOO (Q0 G-2 on the guard fix: db-migrate-clean, which the guard does not
  // cover, printed a fragment-carried host unredacted), and the bracket-less form of an IPv6 host.
  assert.equal(redactConnection('could not translate host name "q0-probe.invalid" to address', 'postgresql://postgres@127.0.0.1:5507/postgres#?host=q0-probe.invalid'),
    'could not translate host name "[redacted]" to address', 'a host carried past a # is redacted (G-2)');
  assert.equal(redactConnection('could not connect to db.example.invalid', 'postgresql://postgres@127.0.0.1:5507/postgres?%20host=db.example.invalid'),
    'could not connect to [redacted]', 'and a value under a key the parser misreads');
  assert.equal(redactConnection('connection to server at "::1", port 5507 failed', 'postgres://postgres@[::1]:5507/x'), 'connection to server at "[redacted]", port [redacted] failed',
    'an IPv6 host as psql prints it, without brackets');
  // AND THE AUTHORITY AND PATH FROM THE RAW TEXT, AS WRITTEN AND DECODED (the owed-tooling batch's review round;
  // A1-OT-4: each of the first five printed through db-migrate-clean and db-rls-smoke; Q0-OT-7: the raw query's
  // `&`-only split and its decoding were each removable with every test green). What psql printed, measured.
  for (const [message, url, secret] of [
    ['role "a1secretuser" does not exist', 'postgresql://a1sec%72etuser@127.0.0.1:5501/postgres', 'a1secretuser'],
    ['database "a1secretdb" does not exist', 'postgresql://postgres@127.0.0.1:5501/a1sec%72etdb', 'a1secretdb'],
    ['could not translate host name "a1-encoded.invalid" to address', 'postgresql://postgres@%61%31-encoded.invalid:5501/postgres', 'a1-encoded'],
    ['could not translate host name "a1-hostone.invalid"; could not translate host name "a1-hosttwo.invalid"', 'postgresql://postgres@a1-hostone.invalid:5501,a1-hosttwo.invalid:5502/postgres', 'a1-host'],
    ['could not translate host name "a1-tail#x.invalid" to address', 'postgresql://postgres@127.0.0.1:5501/postgres?host=a1-tail#x.invalid', 'x.invalid'],
    ['connection to server at "fe80::1%lo0", port 5501 failed', 'postgresql://postgres@[fe80::1%25lo0]:5501/postgres', 'fe80'],
    ['could not translate host name "q0-probe.invalid" to address', 'postgresql://postgres@127.0.0.1:5501/postgres?host=%71%30-probe.invalid', 'q0-probe'],
  ]) {
    const out = redactConnection(message, url);
    assert.ok(!out.includes(secret) && out.includes('[redacted]'), `${url}: "${secret}" survives redaction in ${JSON.stringify(out)}`);
  }
  // EVERY crafted URL through both real tools (Q0 G-1: the loop ran the first ten only, so the three the fix
  // added were asserted at the function alone), and the two half-pins with them.
  for (const url of [...crafted, 'postgresql://postgres@127.0.0.1:5507/postgres#frag', 'postgresql://postgres@127.0.0.1:5507/postgres?%20host=db.example.invalid']) {
    for (const [file, args, code] of [['explain-harness', ['scripts/db/explain-harness.mjs'], 2], ['db-reset-test', ['scripts/db/run.mjs', 'reset-test'], 1]]) {
      const result = await run('node', args, { env: { ...env, DB_TEST_URL: url } }).then(
        (ok) => ({ code: 0, ...ok }),
        (err) => ({ code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }));
      assert.equal(result.code, code, `${file} with ${url} refuses (exit ${code})`);
      assert.match(result.stderr, new RegExp(`${file} refuses this host: `), `${file}: and says so before connecting`);
    }
  }
});

test('db-verify fails as a whole, and its summary names what is missing', async () => {
  const env = { ...process.env, LC_ALL: 'C', TZ: 'UTC' };
  delete env.DB_TEST_URL;
  const result = await run('node', ['scripts/db/run.mjs', 'verify'], { env })
    .then((ok) => ({ code: 0, ...ok }), (err) => ({ code: err.code ?? 1, stdout: err.stdout ?? '' }));
  assert.notEqual(result.code, 0, 'db-verify must not report clean while six of its targets cannot run');
  // The counts are DERIVED, not remembered. The first version of this test hard-coded
  // "6 of 9", so it broke the moment A1 added the first real migration — a test asserting a
  // number that legitimately changes, which fails for the wrong reason and teaches its reader
  // to edit the number rather than read the failure.
  // What must be true is that EVERY live target is among the failures and the summary names the
  // variable. The exact total is not the assertion: a static target can also fail for its own
  // reason — a stale snapshot, a lint violation — and that is a different fact, not this one.
  //
  // The first version hard-coded "6 of 9". It broke the moment a real migration was added, which
  // is a test failing for the wrong reason and teaching its reader to edit the number instead of
  // reading the failure.
  assert.match(result.stdout, /db-verify: FAILED — \d+ of \d+ target\(s\)/);
  for (const target of LIVE) {
    assert.match(result.stdout, new RegExp(`db-${target}: FAILED`),
      `db-${target} needs a database and none is configured, so it must be reported as failing`);
  }
  assert.equal(ORDER.length >= LIVE.size, true, 'every live target is part of the verify order');
  assert.match(result.stdout, /need DB_TEST_URL, which is unset/);
  // The three that CAN run must actually have run and passed, or the failure is uninformative.
  for (const target of ['schema-lint', 'contract-check', 'generated-drift-check']) {
    assert.match(result.stdout, new RegExp(`db-${target}: ok`), `db-${target} is answerable without a database and must run`);
  }
});

test('a connection string never reaches the output', async () => {
  const env = { ...process.env, DB_TEST_URL: 'postgresql://user:hunter2@db.example.invalid:5432/prod', LC_ALL: 'C', TZ: 'UTC' };
  const result = await run('node', ['scripts/db/run.mjs', 'migrate-clean'], { env })
    .then((ok) => ({ code: 0, ...ok }), (err) => ({ code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }));
  const output = `${result.stdout}${result.stderr}`;
  assert.doesNotMatch(output, /hunter2/, '§12.5 requires the connection URL to be redacted');
  assert.doesNotMatch(output, /db\.example\.invalid/, 'the host is part of the URL and must not leak either');
});

// ---------------------------------------------------------------------------
// The catalog half. Batch 000 is applied to a real Postgres now, so the lint can
// assert what the database BECAME rather than what a migration file says.
//
// The snapshot is committed evidence, and committed evidence is exactly what this
// repository keeps catching itself trusting after it went stale. So the snapshot
// names the migration set it was taken against, and drifting from it fails.

import {
  AUTHZ_MIGRATION, PREREQUISITE, appliedMigrationDigest, catalogLint, migrateCleanSteps,
  migrationSetDigest, pendingMigrations,
} from '../../scripts/db/run.mjs';

const SNAPSHOT = 'db/foundation/lint/catalog-snapshot.json';
const snapshot = async () => JSON.parse(await readFile(SNAPSHOT, 'utf8'));

test('the committed catalog snapshot matches the migrations it claims to describe', async () => {
  const snap = await snapshot();
  assert.equal(snap.taken_against_migrations, await appliedMigrationDigest(snap),
    'the snapshot describes a different migration set than the one in the tree — retake it');
  assert.deepEqual(await catalogLint(snap), [], 'the live catalog satisfies every rule asserted against it');
});

// Batch 011 is the first migration this repository has written that is NOT applied to the
// provisioned instance, so the snapshot's digest is taken over the APPLIED set rather than the
// whole of db/foundation/migrations. That gap is the thing to keep honest: it must exist for the
// declared reason, and it must be the only difference.
//
// Batch 020 joined the list rather than making an exception to it, and the reason is a property of
// the list's own shape: every one of 020's policies calls a helper owned by `app_authz`, which is
// created by 011, which this instance does not have. A batch cannot be applied to a database that
// is missing the batch it is built on — so the declaration extends to the TAIL, which is exactly
// what `pendingDeclarationLint` requires of it and what makes "behind" distinguishable from
// "divergent". This list is pinned WHOLE, so a third batch joining it is a deliberate edit here.
//
// Batch 021 joins for the same structural reason one step further along: its four narrowing
// policies and its two scope-table policies call helpers created by 011 and narrow tables created
// by 020, neither of which this instance has. `pendingDeclarationLint` requires the declaration to
// name a TAIL of the ordered set, so a third entry here is not a widening — it is the only shape
// that keeps "behind" distinguishable from "divergent".
//
// WHAT THAT COSTS FOR 021 AND WHY `tenant_tables` DOES NOT GROW. app.workspace_member_scopes is not
// in that list below, and adding a row for it would be recording a measurement of a table that does
// not exist on the instance the snapshot describes — which `tenantTableLint`'s own completeness
// rule would then refuse in the other direction, as "a row for a table no applied migration
// creates". The rules that row would carry are asked where they can be: `schemaLint` holds the
// owner comment, ENABLE, FORCE and the primary key from the migration TEXT on every `npm run
// check`, and 021's own apply-time block asserts ENABLE, FORCE, the absent UPDATE and DELETE
// grants, the RESTRICTIVE narrowings and RFC-2026-020 §5/3 against the LIVE catalog of whatever
// database receives it. The list grows the day the instance receives the batch and the snapshot is
// retaken, and the completeness rule REQUIRES it then.
//
// Batch 030 joins for the same structural reason again: its policies call helpers created by 011
// and 021, and its assignment table carries a composite foreign key into a table created by 020.
// It also brings the first thing this list has not had to think about — two GLOBAL tables, which
// belong to no workspace at all. `tenantTablesInMigrations` reads `create table app.X` and cannot
// tell a global table from a tenant one, so the day 030 reaches the instance the completeness rule
// will require rows for all three; the snapshot's own declaration says what such a row will and
// will not mean, because a row in a list called `tenant_tables` is not the place to discover that
// two of its entries are not tenant-owned.
//
// Batch 040 joins for the same structural reason a fourth time, and the chain is now six batches
// deep: its knowledge policies call helpers created by 011 and 021, and app.knowledge_items carries
// composite foreign keys into BOTH tables 020 creates. What it adds to this list's own problem is
// not a new kind of row — both of its tables are ordinary tenant tables and will take ordinary rows
// — but a new kind of thing the rows cannot say: app.knowledge_items is the first table whose scope
// is TWO columns, a mandatory Business and a nullable Page override, and none of the properties
// `tenant_tables` records can see that. The snapshot's own declaration says so, because a list that
// silently describes half a scope is the shape 030 found one row earlier.
//
// Batch 041 joins for a reason that is not the same one a fifth time, and the difference is worth
// the four lines. Every batch above is declared because of TABLES it cannot create here. 041
// creates no table, no view and no policy at all — one function, app.knowledge_scope_applies — so
// it will add no row to `tenant_tables` on the day it lands, and the completeness rule that will
// one day REQUIRE rows for the twelve tables above will require none for this batch. What puts it
// on this list is its apply-time block: two of its assertions read `app.knowledge_items`::regclass,
// which is 040's table and is not here, so the batch cannot be applied to this instance for
// exactly the reason 040 cannot. A list of batches-that-owe-rows and a list of
// batches-that-cannot-be-applied have been the same list until now, and this is the entry that
// separates them.
// Batch 050 joins for a reason that is NOT the structural one, and the difference is worth stating
// because the list would otherwise read as five instances of one rule. Its three tables reference
// app.workspaces and nothing else, so its SQL dependencies are all on the instance — it is the
// first batch in this tail that COULD be applied. It is declared not applied because the
// declaration must name a TAIL of the ordered set: a database holding 050 while missing 011, 020,
// 021, 030 and 040 is DIVERGENT rather than behind, which is a different finding with a different
// fix, and `pendingMigrations` refuses a declaration that is not a tail for exactly that reason.
// What it adds to this list's own problem is a third kind of thing the rows cannot say: these are
// the first TENANT tables in the schema with NO POLICY AT ALL, and none of the five properties
// `tenant_tables` records — rls_enabled, rls_forced, has_pk, comment, owner — can tell a table no
// role can read from one with a full policy set.
// Batch 060 joins for a reason that is NOT the structural one, and saying so is the point of this
// list. Its own dependencies are shallow — a foreign key into app.workspaces, which the instance
// has — so it could be applied there. It is declared all the same, because
// `pendingDeclarationLint` requires the declaration to name a TAIL of the ordered set: an instance
// holding 060 while missing 011 through 040 is DIVERGENT rather than behind, which is a different
// finding with a different fix. It also brings the first table this repository has created OUTSIDE
// `app` — private.ai_credential_references, where §3.1 puts secret references by name — which
// `tenantTablesInMigrations` cannot see in either direction, so `schemaLint` is widened in the same
// change to hold a `private` table to the same owner-comment, ENABLE, FORCE and primary-key rules.
// Batch 130 joins a fifth time and the chain is SEVEN batches deep, on a narrower dependency than
// any before it: its one policy calls app.workspace_member_role, which 011 creates and this
// instance does not have. Its own table takes an ordinary row the day it lands; its three GLOBAL
// tables — app.billing_plans, app.billing_plan_versions and app.plan_entitlements — would not
// belong in `tenant_tables` even then, exactly as 030's two do not. What 130 adds to this list's
// own problem is a third thing the rows cannot say, and it is the thing that batch exists to
// enforce: its property is an ABSENCE OF GRANTS — no role holds INSERT, UPDATE or DELETE on
// app.billing_subscriptions — and `tenant_tables` records rls_enabled, rls_forced, has_pk, comment
// and owner, not one of which can see a privilege.
// Batch 140 joins for a reason that is NOT the structural one the five above share, and the
// difference is worth a sentence because the pattern would otherwise look automatic. Each of those
// five depends on an object an earlier undeployed batch creates; 140 depends on none — its two
// tables carry no foreign key at all (§11.4 purges tenant content in step 7 and RETAINS audit in
// step 8, so an audit row must outlive the rows it names), call no helper, and carry no policy, so
// it would apply here exactly as it stands. It is declared because the declaration must name a TAIL
// of the ordered set, and because its apply-time block WRITES A PROBE ROW into app.audit_logs as
// the migration role to prove the append-only trigger fires for the one identity FORCE ROW LEVEL
// SECURITY does not reach. Doing that to a live database in order to make a lint pass is the
// inversion 011's header refuses, one table further along and on an audit log.
//
// BATCH 110 JOINS THE LIST AND ITS REASON IS THE STRUCTURAL ONE, not 140's. It depends on
// app.workspaces, which batch 010 creates and the instance HAS — but its own children hang off
// app.meta_connections, and more to the point the declaration must name a TAIL of the ordered set: a
// database holding 130 and 140 while missing 110 is DIVERGENT rather than behind, and
// pendingDeclarationLint refuses a declaration that is not a tail. Ten batches become eleven and the
// tail stays contiguous, because 110 sorts between 060 and 130.
// Batch 051 joins for the structural reason five of the others share and adds one of its own. Its
// three tables reference app.workspaces, which 010 created and this instance has; but its two
// policies CALL app.is_active_member, which 011 creates and this instance does not have, so the
// migration could not apply here even if somebody wanted it to. What is worth naming is WHERE it
// joins: it sorts BETWEEN 050 and 060, so it is not appended, and a resolver who appends it produces
// an unsorted declaration that pendingDeclarationLint refuses with a message about a tail — which
// reads like a missing batch rather than like a misplaced one. Batches 061, 110 and 131 are being
// written in parallel and two of them sort into the middle as well, so this is the ordinary case
// from here on rather than a peculiarity of 051.
// Batch 070 joins for the structural reason nine of the others share, and its position is the point
// worth naming: it sorts between 061 and 110, so it is INSERTED and not appended. A resolver who
// appends it produces an unsorted declaration, and pendingDeclarationLint refuses that with a
// message about a TAIL — which reads like a missing batch rather than like a misplaced one. 051
// recorded the same thing about its own position between 050 and 060; from 110 onwards this is the
// ordinary case rather than a peculiarity.
// Batch 080 joins for the structural reason most of the list shares, and it is worth naming which
// dependency does the work, because 080 has more of them than any batch before it. Its five tables
// reference app.business_profiles and app.page_context_profiles over the composite scope keys batch
// 020 creates; its policies call app.is_active_member, app.workspace_member_role,
// app.member_scope_admits_business and app.member_scope_admits_page, which 011 and 021 create; and
// app.content_ideas references app.research_suggestions, which 070 creates and which is itself on
// this list. So the migration could not apply to this instance even if somebody wanted it to. It
// sorts between 070 and 110, so it is INSERTED into the middle of this array rather than appended —
// the trap 051 recorded and 070 recorded after it, because appending produces a declaration that is
// not a TAIL and pendingDeclarationLint refuses that with a message about divergence.
// Batch 081 joins for the structural reason most of this list shares, and its own peculiarity is
// the reason it is spelled out rather than counted. Structurally it is the easiest case on the
// list: every foreign key it writes reaches a table batch 080 creates — app.content_items and
// app.content_variants — and 080 is itself declared here, so 081 could not apply to this instance
// under any reading. THE PECULIARITY IS THAT ITS LARGEST ACT IS AN ABSENCE. 081 is §6's "target
// placeholder contract" and the thing that makes it that is a foreign key it does NOT write, the
// social FK the registry gives to batch 111; a reader could take a batch whose headline is a
// withheld constraint to be small enough to leave off a declaration. It is declared all the same,
// for batch 132's reason: this list names which migration FILES an instance has run, not how much
// each one does, and an instance that had run 081 would have executed an apply-time block asserting
// that the social key is absent. It sorts between 080 and 110, so it is INSERTED rather than
// appended — the trap 051 recorded and 070 and 080 recorded after it.
// Batch 090 joins for the structural reason the list shares, and its dependency chain is one link
// longer than 080's: its three tables reference app.business_profiles and app.page_context_profiles
// over batch 020's composite scope keys, its policies call app.is_active_member,
// app.workspace_member_role, app.member_scope_admits_business and app.member_scope_admits_page from
// 011 and 021, and app.approval_requests references app.content_items AND app.content_versions —
// the latter over the FOUR-column key (workspace_id, business_profile_id, content_item_id, id) that
// batch 080 creates and that is itself on this list. So the migration could not apply to this
// instance even if somebody wanted it to. It sorts between 080 and 110, so it is INSERTED into the
// middle of this array rather than appended — the trap 051 recorded, 070 recorded after it and 080
// recorded after that, because appending produces a declaration that is not a TAIL and
// pendingDeclarationLint refuses that with a message about divergence rather than about a missing
// batch.
// Batch 092 follows 090 for 082's reason.
// Batch 100 joins for the structural reason most of the list shares and for one no earlier entry
// has had. Its four tables reference app.business_profiles and app.page_context_profiles over the
// composite scope keys batch 020 creates; its policies call app.is_active_member,
// app.workspace_member_role, app.member_scope_admits_business and app.member_scope_admits_page,
// which 011 and 021 create; and app.content_asset_links references app.content_versions over a
// composite scope key batch 080 creates — so it depends on a batch that is ITSELF on this list,
// which 080 was the first to do and 100 now does one link further along the chain. It sorts between
// 080 and 110, so it is INSERTED into the middle of this array rather than appended — the trap 051
// recorded, 070 recorded after it and 080 recorded after that, because appending produces a
// declaration that is not a TAIL and pendingDeclarationLint refuses that with a message about
// divergence.
const NOT_ON_THE_INSTANCE = [AUTHZ_MIGRATION, '020_business.sql', '021_member_scope.sql', '022_business_service_path_closed.sql',
  '030_industry.sql', '031_industry_service_path_closed.sql', '040_knowledge.sql', '041_knowledge_resolution.sql', '042_knowledge_service_path_closed.sql',
  '050_async_kernel.sql', '051_notification.sql', '060_ai_gateway.sql',
  '061_metering.sql', '062_metering_service_path_closed.sql', '070_research.sql', '071_research_service_path_closed.sql', '080_content.sql', '081_content_targets.sql',
  // Batch 082 creates no table and no fixture: five RESTRICTIVE policies on batch 080's tables and an
  // apply-time block, which the instance has not run. Declared for batch 132's reason — the list is
  // about which FILES the instance has run, not which objects they make — and INSERTED between 081 and
  // 110 so the tail stays contiguous.
  '082_content_service_path_closed.sql', '083_content_targets_service_path_closed.sql',
  // Batch 091 (calendar) is INSERTED between 090 and 092, its numeric place, so the declaration stays a TAIL.
  '090_approval.sql', '091_calendar.sql', '092_approval_service_path_closed.sql',
  '093_updated_at_triggers.sql',
  '094_approval_requested_by.sql', '100_asset.sql',
  '101_asset_service_path_closed.sql',
  '102_updated_by_is_caller.sql', '103_asset_original_filename_withheld.sql', '104_fk_supporting_indexes.sql',
  // Batch 105 creates seven restrictive UPDATE policies on tables batches 010-040 made, and an apply-time
  // block. INSERTED after 104, its numeric place, so the declaration stays a TAIL of the ordered set.
  '105_updated_by_on_update_is_caller.sql',
  '110_meta_connector.sql',
  '111_social_fk.sql',
  // Batch 120 creates five tables and alters one batch 081 created, and every one of its foreign
  // keys reaches a batch that is itself on this list; 122 creates nothing but two closures and an
  // apply-time block. Both are INSERTED between 111 and 130 rather than appended, because the
  // declaration must name a TAIL of the ordered set and appending would have made it a set with a
  // hole in it -- the trap 051 recorded and 070, 080 and 100 recorded after it.
  // Batch 121 creates ONE table, whose only foreign key reaches app.published_posts -- a batch 120
  // table, itself on this list -- and adds one key to that table as a forward fix. INSERTED between
  // 120 and 122, which is both its numeric place and the place that keeps the declaration a TAIL of
  // the ordered set rather than a set with a hole in it.
  '120_publisher.sql', '121_publisher_metrics.sql', '122_publisher_service_path_closed.sql',
  // Batch 123: ten restrictive UPDATE policies on tables batches 070-120 made and one CHECK on 090's
  // approval_requests; INSERTED after 122, its numeric place, so the declaration stays a TAIL.
  '123_attribution_closures_everywhere.sql',
  // Batch 124: the key 091 deferred, after 120's publish_intents.
  '124_calendar_publish_intent_fk.sql',
  // Batch 125: one restrictive policy on 090's approval_requests, after 123's closures beside it.
  '125_approval_settled_is_immutable.sql',
  // Batch 126: 125's function replaced and one CHECK on 090's approval_requests, after 125.
  '126_approval_decision_frozen_for_every_writer.sql',
  // Batch 127: nineteen restrictive INSERT policies on tables batches 010-120 made, after 126.
  '127_created_by_on_insert_is_caller.sql',
  '130_billing.sql', '131_billing_projection.sql', '132_entitlement_resolution.sql',
  '140_audit.sql',
  // Batch 150: performance_snapshots (121's, not on the instance) re-keyed to (id, metric_time); APPENDED after
  // 140, its numeric place, so the declaration stays a TAIL.
  '150_performance_snapshots_key.sql',
  // Batch 170: the client UPDATE of 010's workspaces.lifecycle_state revoked (Q-026-5 / Q-027-5); it could apply
  // to the instance on its own, but it sorts after 150, so it is APPENDED and the declaration stays a TAIL.
  '170_workspace_lifecycle_not_client_writable.sql'];

test('the digest gap between the tree and the instance is exactly what the snapshot declares', async () => {
  const snap = await snapshot();
  const declared = pendingMigrations(snap);
  assert.deepEqual(declared, NOT_ON_THE_INSTANCE,
    'these and only these batches are declared not applied to the instance');

  // The two digests DIFFER, and that is the point: if they were equal, the declaration would be
  // excluding nothing and the field would be decoration.
  assert.notEqual(await migrationSetDigest(), await appliedMigrationDigest(snap),
    'a declaration that excludes a batch must actually change the digest, or it excludes nothing');

  // And the applied digest is the one the snapshot carries, so the exclusion is not a licence to
  // let the rest drift.
  assert.equal(await appliedMigrationDigest(snap), snap.taken_against_migrations);
});

test('a snapshot that no longer matches the migrations is refused, not read', async () => {
  const stale = { ...(await snapshot()), taken_against_migrations: '0'.repeat(16) };
  const problems = await catalogLint(stale);
  assert.equal(problems.length, 1, 'a stale snapshot produces one refusal, not a list of stale findings');
  assert.match(problems[0], /Retake it/);
  // And it refuses BEFORE reading the catalog, so a stale file cannot report a clean database.
  const staleAndBroken = { ...stale, catalog: { ...stale.catalog, our_schemas: [] } };
  assert.deepEqual(await catalogLint(staleAndBroken), problems,
    'a stale snapshot must refuse on staleness alone, never report on contents it cannot vouch for');
});

test('the catalog rules reject what the text rules cannot see', async () => {
  const base = await snapshot();
  const digest = base.taken_against_migrations;
  const withCatalog = (catalog) => catalogLint({ ...base, catalog: { ...base.catalog, ...catalog } }, digest);

  // ENABLE without FORCE — the difference the specified lint rule cannot express, because
  // relrowsecurity and relforcerowsecurity are different catalog columns.
  //
  // The broken row is made by MUTATING a real one rather than by replacing the list with a
  // synthetic table, and that is not cosmetic. Since batch 020 the list itself is checked for
  // completeness against the migrations this instance has received, so a fabricated single-row
  // `tenant_tables` now fails on five missing tables and one table no migration creates — six
  // findings about the fixture, none about the rule under test. A case whose subject is drowned by
  // its own scaffolding is a case nobody reads.
  const damage = (mutate) => base.catalog.tenant_tables.map((t, i) => (i === 0 ? { ...t, ...mutate } : t));
  assert.ok((await withCatalog({ tenant_tables: damage({ rls_forced: false }) }))
    .some((p) => /relforcerowsecurity is false/.test(p)));
  assert.deepEqual(await withCatalog({ tenant_tables: damage({}) }), [],
    'the unmutated list is clean, so each finding below is caused by the mutation and not by the copy');

  // A table whose RLS was turned off after the migration ran. No file changes; the catalog does.
  assert.ok((await withCatalog({ tenant_tables: damage({ rls_enabled: false }) }))
    .some((p) => /relrowsecurity is false/.test(p)));

  // RFC-2026-017 §3's owner rule, which moved into `tenantTableLint` with the rest of the per-table
  // rules and is asserted here so the move is not a quiet loss.
  assert.ok((await withCatalog({ tenant_tables: damage({ owner: 'app_command' }) }))
    .some((p) => /owned by app_command/.test(p)));
  assert.ok((await withCatalog({ tenant_tables: damage({ owner: undefined }) }))
    .some((p) => /no owner recorded/.test(p)));

  // THE LIST ITSELF, in both directions. Every rule above is a rule about the rows in
  // `tenant_tables`, so until batch 020 a snapshot could satisfy all of them by simply omitting a
  // table — and with a batch now declared not applied, "absent because it is not on this instance"
  // and "absent because nobody measured it" are different states that must not look alike.
  const dropped = base.catalog.tenant_tables.slice(1);
  assert.ok((await withCatalog({ tenant_tables: dropped }))
    .some((p) => new RegExp(`app\\.${base.catalog.tenant_tables[0].table} is created by a migration`).test(p)),
    'a tenant table the applied migrations create and the snapshot omits is a finding, not a silence');
  const invented = [...base.catalog.tenant_tables,
    { table: 'shadow_table', rls_enabled: true, rls_forced: true, has_pk: true, comment: 'owner: nobody', owner: 'postgres' }];
  assert.ok((await withCatalog({ tenant_tables: invented }))
    .some((p) => /tenant_tables records app\.shadow_table and no migration/.test(p)),
    'a row for a table no applied migration creates is the divergence the snapshot exists to catch');

  // A view created without security_invoker, and a definer function whose search_path was widened.
  assert.ok((await withCatalog({ exposed_views: [{ view: 'page_v', reloptions: null }] }))
    .some((p) => /not security_invoker/.test(p)));
  assert.ok((await withCatalog({ security_definer_functions: [{ function: 'private.helper', config: ['search_path=public'], owner: 'app_owner' }] }))
    .some((p) => /without an empty search_path/.test(p)));

  // A grant that opens `private` to every client role.
  assert.ok((await withCatalog({ public_grants: { usage_on_private: true, create_on_app: false } }))
    .some((p) => /USAGE on private/.test(p)));
});

// The measurement that answers DATA-DEC-03's decisive question, kept as a standing assertion.
// A new role gaining BYPASSRLS makes every policy inert for it, forced or not, and no RLS test
// written against client roles would notice.
test('a role gaining BYPASSRLS is a finding, not a detail', async () => {
  const base = await snapshot();
  const digest = base.taken_against_migrations;
  const withRole = [...base.catalog.roles_bypassing_rls, 'app_worker'];
  const problems = await catalogLint({ ...base, catalog: { ...base.catalog, roles_bypassing_rls: withRole } }, digest);
  assert.ok(problems.some((p) => /app_worker bypasses RLS/.test(p)),
    'a role outside the known platform set that bypasses RLS must be reported');
  // The platform's own five are known and must not be reported as findings every run.
  assert.deepEqual(await catalogLint(base, digest), []);
});

// ---------------------------------------------------------------------------
// The fixture catalog. §12.6 fixes the symbolic identities and says the real UUIDs
// live here and are never generated per test.
//
// Every UUID is uuid5 of its own symbol, so this file states nothing that cannot be
// recomputed. A random UUID pasted in would be an unverifiable constant — true only
// because it is written down, which is the shape of evidence this repository keeps
// removing.
const FIXTURES = 'db/foundation/seeds/fixture-catalog.json';
const SPEC_SYMBOLS = [
  'user_owner_a', 'user_editor_a', 'user_approver_a', 'user_viewer_a', 'user_suspended_a',
  'user_owner_b', 'workspace_a', 'workspace_b', 'business_a1', 'business_a2', 'business_b1',
  'page_a1', 'page_a2', 'page_b1',
];

// Symbols §12.6 does not name, listed one at a time with the batch that needed one and why. The
// closed-set assertion below is over SPEC_SYMBOLS ∪ ADDED_SYMBOLS, so the catalog can still only
// grow through an edit here — what changed is that growing it is possible at all. §12.6's list is
// the identities the SPECIFICATION fixes, and it was written before any table existed; reading it
// as the complete universe of fixture rows would mean no batch could ever assert a rule about a
// state §12.6 happened not to enumerate.
const ADDED_SYMBOLS = [
  // Batch 020. §11.3 — "archive closes new creation under a Business" — is a real narrowing in
  // 020's page INSERT policy, and asserting it needs an archived Business. It is a THIRD business
  // rather than an archived business_a2, whose whole purpose is to be the Business batch 021's
  // member scope excludes the editor from: one fixture row carrying two unrelated controls is how a
  // case starts failing for the other one's reason.
  'business_a3_archived',
  // Batch 021. §8.6 case 4 — "same Business, allowed Page A, row Page B → deny" — cannot be carried
  // by any identity §12.6 names: user_editor_a and user_approver_a are both scoped at BUSINESS
  // level, and §7 gives a business scope every Page beneath it, so neither can be refused a Page
  // inside their own Business. It needs a member whose scope is a single PAGE, and a second Page
  // under the SAME Business for that member to be refused. page_a2 cannot be the second Page: it is
  // under business_a2, so a refusal there is case 3's control wearing case 4's name.
  'user_page_editor_a',
  'page_a1_sibling',
  // Batch 030. §4's ERD makes an industry assignment zero-or-one per Business, so batch 030's
  // permitted INSERT needs a live Business that has none — while every OTHER live Business in
  // workspace A must carry one, or the scope and cross-tenant negatives are about a missing row
  // rather than about a policy. business_a3_archived cannot be that slot: §11.3 closes new creation
  // under an archived Business and 030's INSERT policies refuse it, which is its own case.
  'business_a4_unassigned',
  // The first fixture rows that belong to NO TENANT. §5 scopes industry.core "global/business", so
  // these three carry no `_a` or `_b` suffix — every other symbol here ends in the workspace its row
  // lives in, and a suffix on a catalog row would assert a boundary the row does not have. Two
  // versions rather than one because a re-pin needs a target that is not the version already
  // pinned: an UPDATE case that set the value the row already held would pass against a database
  // where the write did nothing.
  'industry_pack_interior',
  'industry_pack_interior_v1',
  'industry_pack_interior_v2',
  // Batch 040. Knowledge is the first family whose SCOPE IS TWO COLUMNS — §4 invariant 3 gives every
  // knowledge row a Business scope and makes the Page scope a nullable OVERRIDE — so the fixture has
  // to carry rows of BOTH shapes or half the narrowing is untested and green. Five items, because
  // each one carries exactly one control: the business-level row every positive reads, the
  // page-level row inside a single-Page scope, its SIBLING under the same Business (§8.6 case 4 at a
  // granularity no earlier table has, because a knowledge row is the first that carries its own page
  // scope rather than inheriting its parent's), the row outside the editor's Business scope (§8.6
  // case 3), and the row across the tenant boundary (§8.6 case 5).
  //
  // A knowledge item needs a SYMBOL where a version, a member scope and an industry assignment did
  // not, and the reason is a property of the schema rather than a preference: those three are
  // addressed by a natural key some document fixes — parent and ordinal, member and target, the
  // Business an assignment belongs to. A knowledge item has none. Nothing in §4, §5 or §8 says a
  // Business holds one voice profile, so inventing a `unique (business_profile_id, kind)` to save
  // five constants would be writing a product decision into a constraint.
  'knowledge_a1_business',
  'knowledge_a1_page',
  'knowledge_a1_sibling_page',
  'knowledge_a2_business',
  'knowledge_b1_business',
  // And one row that is not knowledge. 040's INSERT policy carries §11.3's archive clause TWICE —
  // once for the Business and once for the Page — because a knowledge item is the first row in this
  // schema with two parents that can be archived independently. business_a3_archived can only ever
  // exercise the first: a refusal there is the Business clause firing and says nothing about the
  // second. This is an ARCHIVED PAGE under a LIVE Business, the only fixture row where the two
  // parents disagree.
  'page_a1_archived',
  // Batch 050 adds TWO symbols for THREE tables, and the asymmetry is the rule this list has
  // applied since batch 020 rather than an oversight. A JOB is addressed by (workspace_id,
  // dedupe_key) and a CONSUMER LEDGER row by (workspace_id, consumer, event_id) — both unique
  // constraints in 050_async_kernel.sql, both spelled out of ids this catalog already fixes plus
  // text the fixture and the case file share — so neither needs an id of its own, exactly as a
  // version row, a member scope and an industry assignment did not.
  //
  // AN OUTBOX EVENT IS THE FIRST ROW IN THIS SCHEMA WHOSE ID ANOTHER ROW MUST NAME. CTR-EVT-001
  // makes `event_id` the envelope's required identity, and a consumer ledger row records that a
  // consumer handled THAT event — one row addressing another BY ITS ID is the mechanism of
  // deduplication rather than an accident of the fixture. Two of them, one per workspace, because
  // the pair is what makes workspace_id's place in the ledger's natural key legible as data: one
  // consumer, two tenants, two rows.
  'outbox_event_a',
  'outbox_event_b',
  // Batch 060. One symbol for three tables, and the arithmetic is the rule rather than restraint: a
  // model policy is addressed by the Workspace it belongs to (workspace_id IS its primary key), and
  // a credential reference by the Workspace too — both natural keys this file already fixes. A
  // GLOBAL curated model has none, which is exactly why batch 030's pack needed one: a catalog no
  // case can address is a catalog no case can be about. Its `model_key` is synthetic on purpose —
  // OPEN-004 owns the BYOK model allowlist, it is open, and §15 forbids an agent choosing it.
  'ai_model_openai_text',
  // Batch 130. TWO symbols, and it is the smallest addition any batch with four new tables has
  // made, because three of the four things this batch could have named have a natural key some
  // document fixes: a subscription is addressed by the workspace it belongs to (§1 of the Stripe
  // billing contract gives a workspace at most one live subscription, and 130 makes that a partial
  // unique index), and an entitlement by the published revision and the feature key.
  //
  // The two that ARE named belong to no tenant, which is why neither carries an `_a` or `_b`
  // suffix. They exist for the reason 030's pack rows exist — a catalog no case can address is a
  // catalog no case can be about — and for one more that is peculiar to this family: NO IDENTITY IN
  // THE SCHEMA MAY READ EITHER OF THEM, so the only way this suite can assert that the plan catalog
  // is global is two subscriptions, one per tenant, naming the same revision id in their own WHERE
  // clauses.
  'billing_plan_starter',
  'billing_plan_starter_v1',
  // Batch 140. Four rows for two tables NO REQUEST-PATH IDENTITY CAN READ, which is why they are
  // here at all and why the reason differs from every entry above: nothing in this list exists so
  // that a POSITIVE case can read it. `service-sees-zero-audit-logs` and
  // `service-sees-zero-security-events` are the only two cases on those tables that row level
  // security decides — every client refusal is a privilege-layer one — so they are what the CI
  // negative control rests on, and against an empty table they would pass with row level security
  // on or off. Two tenants, so the batch's substitute for a cross-tenant claim ("both owners are
  // refused identically") is about two real rows.
  //
  // An audit record needs a SYMBOL for the reason a knowledge item does: it has no natural key. §4's
  // ERD hangs AUDIT_LOG off WORKSPACE with no ordinal, and inventing a unique constraint so a case
  // could address a row without a symbol would be writing a product decision into a schema.
  //
  // The two in each pair are NOT interchangeable. audit_log_a1's ACTOR IS user_editor_a, because
  // §8.4 marks "Tenant audit SELECT" `O` for the editor — own rows — and that is the one cell in
  // the whole matrix where the reader IS the subject of the record; audit_log_b1 is a DENIED DELETE
  // carrying an error_code and a change_before_ref, so the two rows take opposite branches of every
  // cross-field CHECK CTR-AUD-001 states and JSON Schema cannot. security_event_a1 carries NO ACTOR
  // — §9.1's own example of that family is a "replay anomaly", which is a pattern rather than
  // somebody's act — and security_event_b1 carries one.
  'audit_log_a1',
  'audit_log_b1',
  'security_event_a1',
  'security_event_b1',
  // Batch 110. TWO symbols for FOUR tables, and the arithmetic is this list's rule rather than
  // restraint. A social account is addressed by (workspace_id, external_account_hash), which
  // 110_meta_connector.sql makes unique; a credential reference by the connection it belongs to; a
  // raw delivery by its delivery_hash, which the same file makes unique because a dedupe key that is
  // not unique deduplicates nothing. All three are natural keys spelled out of ids this catalog
  // already fixes plus text the fixture and the case file share — exactly as a version row, a member
  // scope, an industry assignment and a billing subscription are.
  //
  // A META CONNECTION HAS NONE. §4's ERD reads WORKSPACE ||--o{ META_CONNECTION with no ordinal and
  // no natural key, and inventing a `unique (workspace_id, display_name)` so the fixture could
  // address a row without a symbol would be writing a product decision into a constraint — a
  // Workspace may hold two connections and nothing says otherwise.
  //
  // THE TWO ARE NOT INTERCHANGEABLE, and neither is decoration. Every case on this family is a
  // refusal, so a refusal that holds for tenant A because tenant B has no row would be a refusal
  // about a missing fixture. Both sides carry a connection AND a discovered account whose external
  // account hash is THE SAME on both, which is what makes app.social_accounts' workspace-scoped
  // natural key legible as data: a key that had lost `workspace_id` would fail to LOAD.
  'meta_connection_a',
  'meta_connection_b',
  // Batch 061. Eight symbols for three tables, itemised rather than summarised because eight is
  // enough that a reader is entitled to ask what each one buys.
  //
  // THE IDENTITY IS THE ONE WORTH ARGUING WITH. §12.6 names an owner, an editor, an approver, a
  // viewer and a suspended member of workspace_a, and no ADMIN — and §8.4's "Usage/quota summary
  // SELECT" is `Y` for the owner AND `Y` for the admin, two unconditional cells rather than a `Y`
  // and a `P`. Batch 061's SELECT policy therefore resolves `app.workspace_member_role(workspace_id)
  // in ('owner', 'admin')`, and the admin half of that predicate could be exercised by no identity
  // the specification names: it could have been inverted without a case failing. The member is also
  // SCOPED to business_a1 while user_owner_a deliberately holds no scope row, because proving that
  // 061's RESTRICTIVE narrowing subtracts anything needs a caller who passes the role predicate AND
  // is narrowed, and 021's reading — "a member with no scope row is not narrowed" — needs the other
  // half to stay unscoped.
  'user_admin_a',
  // FOUR BUCKETS, one control each, and none of them is a duplicate of another: a workspace-level
  // bucket (business_profile_id NULL, the branch 021's scope types do not reach), one INSIDE the
  // admin's scope, one OUTSIDE it under business_a2 — the Business that exists to be excluded —
  // and one in workspace_b, which is both the cross-tenant target and user_owner_b's own positive.
  // Drop any one and a case somewhere below stops being about what it says: without the b-side row
  // the cross-tenant negative is satisfied by a policy that denies everyone, and without the
  // inside-scope row the narrowing negative is.
  'quota_bucket_a_all',
  'quota_bucket_a1',
  'quota_bucket_a2',
  'quota_bucket_b',
  // TWO LEDGER ROWS, addressed by CTR-USG-001's `usage_id`. app.usage_events has no natural key a
  // case could spell out of ids this catalog already fixes — its dedupe_key is composed from a
  // job_id, and batch 050 gave a job no symbol because a job has a key of its own — so this is the
  // knowledge-item situation rather than the version-row one. Two tenants because NO REQUEST-PATH
  // IDENTITY MAY READ EITHER: the suite's substitute for a cross-tenant claim on such a table is
  // 030's and 140's, "both owners are refused identically", and that is about two real rows or it is
  // about nothing.
  'usage_event_a1',
  'usage_event_b1',
  // ONE HOLD, and the asymmetry with the pair above is deliberate. §8 has no row for a reservation
  // in any of its four matrices, so there is no cell for a both-owners-refused-identically
  // substitute to be ABOUT; this row exists only so that `service-sees-zero-usage-reservations` —
  // the case that table's negative control rests on — addresses a row rather than an empty table.
  'usage_reservation_a1',
  // Batch 051. FOUR ROWS ON ONE TABLE, and two of them carry a control no fixture row in this
  // repository has been able to carry before, because no table before app.notifications is scoped by
  // WORKSPACE AND USER. §5 scopes notification.core "workspace/user" and §8.4 marks "Own
  // notification SELECT/mark read" `O`, so the policy is a conjunction — the recipient AND active
  // membership — and each term, dropped, leaks something the other does not catch:
  //
  //   notification_editor_a     is addressed to a DIFFERENT ACTIVE MEMBER of workspace_a. Without
  //                             it, dropping `user_id = (select auth.uid())` from the predicate is
  //                             invisible: every case in the suite is about two workspaces, and this
  //                             is the only row about two people in one.
  //   notification_suspended_a  is addressed to user_suspended_a. Without it, dropping
  //                             `app.is_active_member(workspace_id)` is invisible too, because
  //                             `suspended-a-sees-zero-notifications` would be satisfied by there
  //                             being nothing addressed to them.
  //
  // The other two are the ordinary pair: an A-side row its own recipient READS, so the negatives
  // beside it are not measured against an empty table, and a B-side row every A-side identity
  // attacks while holding its exact id. A notification needs a SYMBOL for the reason a knowledge
  // item and an audit record do — it has no natural key any document fixes — while this batch's
  // other two tables need none, which the catalog records beside them.
  'notification_editor_a',
  'notification_owner_a',
  'notification_owner_b',
  'notification_suspended_a',
  // Batch 131. TWO symbols for THREE tables, and the arithmetic is this list's own rule rather than
  // restraint. A WEBHOOK RECEIPT is addressed by (provider, livemode, provider_event_hash) and a
  // PAYMENT by (provider, livemode, provider_payment_hash) — §8.2 of the Stripe billing contract
  // fixes the first as the inbound idempotency key and 131_billing_projection.sql makes both unique
  // constraints — and both digests are COMPUTED, in the fixture and in the case file alike, from a
  // synthetic label the two share. So neither needs an id of its own, exactly as a version row, a
  // member scope, an industry assignment, a job and a ledger row did not.
  //
  // AN INVOICE'S ID IS A VALUE ANOTHER ROW MUST NAME, which is the one thing this catalog admits a
  // symbol for once a natural key exists: app.billing_payments reaches an invoice through TWO
  // composite foreign keys, one over (workspace_id, id) for §3.3's scope path and one over
  // (id, livemode) for §5.2's mode separation. Batch 050 recorded the same reasoning for an outbox
  // event, whose id a consumer ledger row must name.
  //
  // The two are NOT interchangeable. billing_invoice_a is SETTLED and carries a succeeded charge
  // plus a partial refund, so `direction`'s two values and the append-only claim are both live as
  // data; billing_invoice_b is UNSETTLED and its only payment FAILED, so `failure_code`'s CHECK — a
  // code belongs to a failure — is satisfied in both directions by real rows. The pair is also what
  // makes the two sides of the tenant boundary distinguishable rather than duplicates, which matters
  // more here than usual: no identity can read either table, so the batch's substitute for a
  // cross-tenant assertion is "both owners are refused identically" and that substitute is worth
  // more when the rows differ in the column an owner would most want to read.
  'billing_invoice_a',
  'billing_invoice_b',
  // Batch 070 adds TWELVE symbols for FIVE tables, and the asymmetry is this list's own rule rather
  // than a budget: a symbol exists where a row has NO natural key, and four of research.core's five
  // tables have none that any document fixes. 070 refuses to invent one for each — nothing in §4,
  // §5 or §8 says a run cites a URL once or that a source supports one piece of evidence — so a
  // source, an evidence item and a suggestion are addressed by an id or by nothing. A SNAPSHOT is
  // the exception and gets none: (workspace_id, research_source_id, content_hash) is unique in
  // 070_research.sql, because that triple is what app.research_evidence has to name single-valued
  // after §10's purge removes the locator, so a case addresses a capture by its digest exactly as
  // batch 010's cases address an invitation by its token hash.
  //
  // FIVE RUNS, because the run is the one table in this batch that carries §4 invariant 3's TWO-
  // COLUMN scope and its restrictive narrowing therefore has two branches and four outcomes to
  // exercise: a business-level row inside the scope, a page-level row inside it, a page-level row
  // under a SIBLING page of the same Business (§8.6 case 4, which no identity §12.6 names can carry
  // — 021 added user_page_editor_a and page_a1_sibling for exactly this), a row under a Business
  // outside the member's scope (§8.6 case 3), and a row across the tenant boundary (§8.6 case 5).
  // Batch 040 met the same shape one family over and needed five knowledge items for it.
  'research_run_a1',
  'research_run_a1_page',
  'research_run_a1_sibling_page',
  'research_run_a2',
  'research_run_b1',
  // TWO A-SIDE SOURCES, and the second is not a duplicate. A source carries no page column of its
  // own — a nullable copy of its run's page could not be held equal to it under MATCH SIMPLE — so
  // batch 070's whole child design is that a child's reach IS its parent's reach, resolved by a
  // restrictive policy through app.research_runs. Asserted only against a BUSINESS-level parent,
  // that claim would still hold if somebody replaced the exists() with
  // member_scope_admits_business, which is the substitution the design exists to refuse.
  // research_source_a1_sibling_page is the row that makes the page half of it falsifiable.
  'research_source_a1',
  'research_source_a1_sibling_page',
  'research_source_b1',
  // One evidence item and one suggestion per side. Both sides are loaded because no client role
  // holds any privilege on app.research_snapshots at all, so this batch's substitute for a
  // cross-tenant claim on that table is 030's and 140's — both owners refused identically — and
  // that substitute is about two real rows or it is about nothing. The two pairs also differ in the
  // column an owner would most want to read: the A-side evidence names a capture by digest and the
  // B-side names none, and the A-side suggestion is untouched while the B-side is dismissed.
  'research_evidence_a1',
  'research_evidence_b1',
  'research_suggestion_a1',
  'research_suggestion_b1',
  // Batch 080. FIVE CONTENT ITEMS FOR THE SAME REASON 070 NEEDED FIVE RUNS AND 040 NEEDED FIVE
  // KNOWLEDGE ITEMS: the item is the table in this family that carries §4 invariant 3's two-column
  // scope, so its narrowing has two branches and four outcomes to exercise — a business-level row
  // inside the member's scope, a page-level row inside it, a page-level row under a SIBLING page of
  // the same Business (§8.6 case 4), a row under a Business outside the scope (case 3), and a row
  // across the tenant boundary (case 5).
  'content_item_a1',
  'content_item_a1_page',
  'content_item_a1_sibling_page',
  'content_item_a2',
  'content_item_b1',
  // TWO VERSIONS, AND THEY ARE THE FIRST SYMBOLS IN THIS LIST ADDED FOR A ROW THAT HAS A NATURAL
  // KEY. (content_item_id, version_no) is unique, so a version can be addressed the way batch 020's
  // version rows are and four of the fixture's five are. These two are named because the VARIANT
  // and the QUALITY REVIEW are addressed through a version id: a case that resolved that id with a
  // join on app.content_versions would put two tables' policies behind one result, and a refusal it
  // observed could not be attributed to the table the case is named for.
  'content_version_a1',
  'content_version_b1',
  // A THIRD VERSION SYMBOL, for the row under the sibling Page, and it buys the only thing the two
  // above cannot: a NEGATIVE for the two-level chain. A variant and a quality review resolve their
  // reach through a version and then through that version's item, and a chain asserted only in the
  // positive direction would still hold if somebody cut the second link. This is the row that makes
  // cutting it fail.
  'content_version_a1_sibling_page',
  // One quality review per side, for the reason batch 040's knowledge item needed a symbol: a review
  // has no natural key at all. Nothing says a version is reviewed once — a rule set may be re-run —
  // and inventing a uniqueness so a case could address one without a constant would be writing a
  // product decision into a constraint. The two sides are loaded in DIFFERENT states, `warn` and
  // `block`, so a cross-tenant read that returned the wrong tenant's row would be visible as a
  // different status rather than as an identical copy.
  'quality_review_a1',
  'quality_review_b1',
  // And the review under the sibling-page version, for the reason its version needed a symbol: the
  // negative half of the chain on the one table in this family that is two levels from the page.
  'quality_review_a1_sibling_page',
  // Batch 081. NO SYMBOL FOR A TARGET ROW AND THREE FOR A COLUMN OF ONE, which is the first time
  // this list has done that and is the reason it is three lines of comment rather than three names.
  //
  // A CONTENT TARGET HAS A NATURAL KEY: 081_content_targets.sql makes (content_item_id,
  // social_account_id) unique among rows whose deleted_at is null, which is §4.6's "unique active
  // target", so every case addresses one out of ids already fixed here — batch 020's rule for a
  // version row, applied in turn by 021, 030, 051, 070 and 080.
  //
  // THE DESTINATIONS ARE THE OPPOSITE CASE AND THE OPPOSITE CASE IS THE POINT OF THIS BATCH.
  // `social_account_id` carries no foreign key — §6's registry gives that key to batch 111 — and
  // app.social_accounts fixes no id of its own, so the value is a bare uuid resolved against
  // nothing, reachable through no other table's natural key, and shared between a fixture and a
  // case. That is exactly the constant this catalog exists to fix. Fixing it is also what keeps the
  // gap VISIBLE: three ids that name no row are the first thing a reader meets. Batch 111 must
  // repoint all three at social accounts that exist, and the fixture will refuse to load until it
  // does — which is the intended failure, because a fixture that kept loading through the addition
  // of a foreign key is one whose rows never depended on it.
  'social_account_a1',
  'social_account_a2',
  'social_account_b1',
  // Batch 090. SIX REQUESTS AND NOTHING ELSE, WHICH IS THE SMALLEST SYMBOL COUNT A THREE-TABLE
  // BATCH HAS ADDED, and the reason is that two of its three tables have natural keys this catalog
  // already fixes the parts of. A POLICY is (workspace_id, business_profile_id, policy_key,
  // version) — §5's "policy versioned" as a constraint. An EVENT is (workspace_id,
  // approval_request_id, action, idempotency_key) — §4.7's "unique idempotency key ต่อ action",
  // which means a case addresses an event BY the key whose whole purpose is to identify an action.
  // A REQUEST has no natural key: nothing says a content version is requested once, a rejected
  // version is revised and re-requested, and inventing a uniqueness so a case could address one
  // without a constant would be writing a product decision into a constraint.
  //
  // The first five are the four outcomes of the scope chain plus the tenant boundary, and they are
  // one level further from the page than batch 080's items were: a request carries NO page column,
  // so each of these exercises a branch of app.content_items' narrowing through the request's own
  // restrictive policy rather than through a column of its own.
  'approval_request_a1',
  'approval_request_a1_page',
  'approval_request_a1_sibling_page',
  'approval_request_a2',
  'approval_request_b1',
  // And one row that is not about scope at all. Both UPDATE policies on app.approval_requests carry
  // `status = 'pending'` in their USING half, which is how §8.3's two write rows are kept from
  // acting on a request that has already been decided. That claim cannot be tested against a
  // pending row, so the fixture loads a SECOND request on a version that already has one, already
  // approved — which is also the demonstration that the table accumulates requests rather than
  // replacing them, and therefore that it was right not to give it a natural key.
  'approval_request_a1_decided',
  // Batch 100. FIVE ASSETS FOR THE REASON 080 NEEDED FIVE ITEMS, 070 FIVE RUNS AND 040 FIVE
  // KNOWLEDGE ITEMS: the asset is the table in this family that carries §4 invariant 3's two-column
  // scope, so its narrowing has two branches and four outcomes to exercise — a business-level row
  // inside the member's narrowing, a page-level row inside it, a page-level row under a SIBLING page
  // of the same Business (§8.6 case 4), a row under a Business outside the narrowing (case 3), and a
  // row across the tenant boundary (case 5). An asset has no natural key any document fixes, so each
  // is named here.
  'asset_a1',
  'asset_a1_page',
  'asset_a1_sibling_page',
  'asset_a2',
  'asset_b1',
  // FOUR VERSIONS, EACH A ROW THAT ALREADY HAS A NATURAL KEY, and they carry symbols for batch 080's
  // reason rather than a new one: a CONTENT ASSET LINK is addressed through an asset_version_id, and
  // a case that resolved that id by joining app.asset_versions would put two tables' policies behind
  // one result. The sibling-page one buys the NEGATIVE half of the child narrowing, exactly as
  // content_version_a1_sibling_page does one family over. The A2 one buys something no earlier symbol
  // has: it is the PURGED row — object_key null, purged_at stamped, status `purged` — so
  // asset_versions_purged_row_names_no_object and asset_versions_purged_status_agrees are satisfied
  // in the interesting direction by a row rather than only in the vacuous one.
  'asset_version_a1',
  'asset_version_a1_sibling_page',
  'asset_version_a2',
  'asset_version_b1',
  // THREE RIGHTS RECORDS, and none has a natural key: §2.2's ERD draws ASSETS ||--o{ ASSET_RIGHTS, so
  // a Business may hold several rights over one asset, and inventing a uniqueness so a case could
  // address one without a constant would be writing a product decision into a constraint (040's
  // argument about a knowledge item). The B-side record is the only row in the catalog that carries a
  // licence proof, which is what makes §9.1's "proof by permission" refusal a withheld COLUMN rather
  // than an empty one.
  'asset_rights_a1',
  'asset_rights_a1_sibling_page',
  'asset_rights_b1',
  // Batch 120. A PUBLISH INTENT has a natural key -- (workspace_id, idempotency_key), the same shape
  // §4.6 gives a content idea, which this catalog refuses a symbol for -- and carries one anyway,
  // because every publish target is addressed THROUGH its intent's id and a case that resolved that
  // id by subselect would put app.publish_intents' whole policy set behind the result of a case about
  // app.publish_targets. That is the catalog's second clause, the one a content version carries a
  // symbol under.
  'publish_intent_a1',
  'publish_intent_a1_page',
  'publish_intent_a1_sibling_page',
  'publish_intent_a2',
  'publish_intent_b1',
  // A PUBLISH TARGET carries one for the same reason a level down: a job, a post and an asset pin are
  // each addressed through `publish_target_id`, which app.publish_jobs and app.published_posts make
  // UNIQUE. THE THREE OF THEM GET NONE, because nothing is addressed through any of them -- each is
  // reached by its target's symbol and its own natural key, which is batch 090's approval event
  // addressed by (approval_request_id, action, idempotency_key).
  'publish_target_a1_fb',
  'publish_target_a1_ig',
  'publish_target_a1_sibling_page',
  'publish_target_a2',
  'publish_target_b1',
  // AND BATCH 081's SIX CONTENT TARGETS, which that batch declared needed no symbol and which batch
  // 120 gives one each -- the catalog's own second clause arriving on schedule (app.publish_targets
  // references a content target BY ID, so the row is now addressed through, exactly as a content
  // version is) plus a third clause this catalog did not have before. A case resolves a natural key
  // with a subselect and a subselect runs AS THE CASE'S IDENTITY; batches 080 and 081 grant app_worker
  // nothing on app.content_variants or app.content_targets, so a fan-out helper resolving its aim or
  // its variant that way would have had `service-cannot-fan-out-a-publish-target` refused on the wrong
  // table at the wrong layer -- and passing. The variant is written by batch 120's own fixture; the
  // six ids are FIXED in batch 081's, which is what batch 111 did to batch 110's on the day a foreign
  // key started naming those rows.
  'content_target_a1_fb',
  'content_target_a1_ig',
  'content_target_a1_page',
  'content_target_a1_sibling_page',
  'content_target_a2',
  'content_target_b1',
  'content_variant_a1_page_facebook',
  // AND BATCH 120's THREE POSTS, which that batch declared needed no symbol -- "nothing is addressed
  // through them" -- and which batch 121 gives one each, because something now is. §4.8 makes
  // (published_post_id, metric_time) a metric snapshot's natural key and batch 121 makes it a unique,
  // so a metric case that resolved its post by subselect would put app.published_posts' whole policy
  // set behind the result of a case about app.performance_snapshots. That is the catalog's first
  // clause, arriving for a post exactly as batch 120 recorded it arriving for a content target. The
  // ids are FIXED in batch 120's own fixture, which is what batch 120 did to batch 081's on the day a
  // foreign key started naming those rows. A JOB AND AN ASSET PIN STILL CARRY NO SYMBOL.
  'published_post_a1_fb',
  'published_post_a2',
  'published_post_b1',
  // BATCH 091's six: three calendar placements and three schedules, each addressed by id in a case (the
  // uniqueness, narrowing, edit, cancel and cross-tenant cases) and each fixed in 091's own fixture.
  'calendar_item_a1',
  'calendar_item_a2',
  'calendar_item_b1',
  'content_schedule_a1_fb',
  'content_schedule_a1_ig',
  'content_schedule_b1',
  // BATCH 091's CORRECTIONS: the rows outside a scope and the settled rows its first head lacked (C0 F1/F2,
  // A1 F1/F2), and the deleted placement (A1 F9).
  'calendar_item_a1_sibling_page',
  'calendar_item_a1_deleted',
  'content_schedule_a2',
  'content_schedule_a1_sibling_page',
  'content_schedule_a1_page_cancelled',
  'content_schedule_a1_page_completed',
  'content_schedule_a1_page_failed',
];
const REQUIRED_SYMBOLS = [...SPEC_SYMBOLS, ...ADDED_SYMBOLS];

test('every identity the data package names is in the catalog, and each id is derived not invented', async () => {
  const { createHash } = await import('node:crypto');
  const catalog = JSON.parse(await readFile(FIXTURES, 'utf8'));
  const identities = catalog.identities ?? {};

  for (const symbol of SPEC_SYMBOLS) {
    assert.ok(identities[symbol], `§12.6 names ${symbol} and the catalog must fix its id`);
  }
  assert.deepEqual(Object.keys(identities).sort(), [...REQUIRED_SYMBOLS].sort(),
    'the catalog carries the identities §12.6 names plus the ones a batch declared above — no more, '
    + 'no fewer. An id that appears in a fixture without appearing here is the unverifiable constant '
    + 'this whole file exists to refuse.');

  // Recompute uuid5(namespace, name) here. If a value was edited by hand, this fails.
  const uuid5 = (namespace, name) => {
    const ns = Buffer.from(namespace.replace(/-/g, ''), 'hex');
    const hash = createHash('sha1').update(Buffer.concat([ns, Buffer.from(name, 'utf8')])).digest();
    hash[6] = (hash[6] & 0x0f) | 0x50;
    hash[8] = (hash[8] & 0x3f) | 0x80;
    const h = hash.subarray(0, 16).toString('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  };

  for (const symbol of REQUIRED_SYMBOLS) {
    const entry = identities[symbol];
    assert.match(entry.uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      `${symbol} must be a v5 UUID — a v4 would mean it was generated rather than derived`);
    assert.equal(entry.uuid, uuid5(catalog.namespace, `thinkbizthai.fixture.${symbol}`),
      `${symbol} does not match its own recipe — the value was edited by hand and is no longer reproducible`);
    assert.ok(entry.role && entry.role.length > 8, `${symbol} states what it is for`);
  }

  // Two identities sharing an id would make every cross-tenant assertion vacuous.
  const ids = REQUIRED_SYMBOLS.map((s) => identities[s].uuid);
  assert.equal(new Set(ids).size, ids.length, 'no two identities share a UUID');
});

// The three service roles RFC-2026-017 created. Each property below was a decision, so each is
// asserted rather than assumed — a role that quietly gained BYPASSRLS would look identical to a
// working one from every angle except this check.
test('the service roles exist and RLS still applies to every one of them', async () => {
  const base = await snapshot();
  const digest = base.taken_against_migrations;
  assert.deepEqual(await catalogLint(base, digest), []);

  const roles = base.catalog.service_roles ?? [];
  assert.deepEqual(roles.map((r) => r.role).sort(), ['app_command', 'app_maintenance', 'app_worker']);
  for (const r of roles) {
    assert.equal(r.bypassrls, false, `${r.role} must not bypass RLS — that is the entire decision`);
    assert.equal(r.canlogin, false, `${r.role} is not reachable until something grants it deliberately`);
    assert.equal(r.has_password, false, `${r.role} has nothing to authenticate as, so nothing to leak`);
    // Measured in the direction that matters. The old field counted roles the service role is a
    // MEMBER OF -- trivially zero, and true no matter who could become app_worker. What the rule
    // means is that nothing can become it except the administrative role the suite uses to SET
    // ROLE, and granting anything else picks the connection method RFC-2026-017 left open.
    assert.equal(r.members_besides_admin, 0, `${r.role} has no members besides the administrative role; granting one picks the connection method`);
    assert.equal(r.superuser, false, `${r.role} must not be a superuser — a superuser bypasses RLS whatever rolbypassrls says`);
    // Two switches PostgreSQL keeps separate and batch 002 conflated. Without SET, every
    // service-path assertion dies at the assume-identity step — and dies with 42501, the same code
    // an RLS refusal raises, so a suite checking only the code would read isolation it never
    // tested. With INHERIT, the admin role holds these privileges ambiently, which is the property
    // the topology exists to deny.
    assert.equal(r.assumable_by_admin, true, `${r.role} must be assumable by an explicit SET ROLE`);
    assert.equal(r.inherited_by_admin, false, `${r.role} must not be inherited ambiently`);
  }

  const withCatalog = (patch) => catalogLint({ ...base, catalog: { ...base.catalog, ...patch } }, digest);

  // The defect the decision exists to prevent, and the one that is invisible from outside.
  const bypassing = roles.map((r) => (r.role === 'app_worker' ? { ...r, bypassrls: true } : r));
  assert.ok((await withCatalog({ service_roles: bypassing })).some((p) => /app_worker holds BYPASSRLS/.test(p)));

  // A role deleted rather than altered is just as much a regression.
  assert.ok((await withCatalog({ service_roles: roles.filter((r) => r.role !== 'app_command') }))
    .some((p) => /app_command is missing/.test(p)));

  // Reachable with no credential, and quietly granted the private schema.
  assert.ok((await withCatalog({ service_roles: roles.map((r) => (r.role === 'app_worker' ? { ...r, canlogin: true } : r)) }))
    .some((p) => /can log in with no password/.test(p)));
  assert.ok((await withCatalog({ service_roles: roles.map((r) => (r.role === 'app_worker' ? { ...r, can_use_private: true } : r)) }))
    .some((p) => /USAGE on private/.test(p)));
  // Both switches must bite, and separately.
  const notAssumable = roles.map((r) => (r.role === 'app_worker' ? { ...r, assumable_by_admin: false } : r));
  assert.ok((await withCatalog({ service_roles: notAssumable })).some((p) => /cannot be assumed/.test(p)));
  const ambient = roles.map((r) => (r.role === 'app_worker' ? { ...r, inherited_by_admin: true } : r));
  assert.ok((await withCatalog({ service_roles: ambient })).some((p) => /inherited ambiently/.test(p)));
});

// The managed-schema rule, pinned by cases rather than by the shape of its regex.
//
// Its first version matched any `create|alter|drop` within 200 characters of `auth.`, so it read
// `create policy p on app.t using ((select auth.uid()) = user_id)` as this file creating something
// in the `auth` schema — and §8.5 MANDATES that call in every tenant policy. The rule rejected the
// shape the specification requires, and did it inconsistently: only the policies whose `create`
// fell inside the window were flagged. A1 hit it on the first real migration.
//
// What §3.1 forbids is the managed schema being the TARGET of the DDL. These cases say so directly,
// so a future rewrite of the pattern is judged on what it decides rather than on how it looks.
test('the managed-schema rule flags DDL targets and allows a call inside a predicate', async () => {
  const flagged = async (sql) =>
    (await schemaLint([{ name: 't.sql', sql }])).some((p) => /Supabase-managed/.test(p));

  // Allowed: §8.5's mandated policy shape, at any distance, and reading a managed table.
  assert.equal(await flagged("create policy p on app.workspaces for select to authenticated using ((select auth.uid()) = owner_id);"), false);
  assert.equal(await flagged("create policy a_very_long_policy_name_indeed on app.workspace_members for select to authenticated using (workspace_id in (select workspace_id from app.workspace_members m where m.user_id = (select auth.uid()) and m.status = 'active' and m.deleted_at is null));"), false);
  assert.equal(await flagged("create policy p on app.user_profiles for select to authenticated using (user_id in (select id from auth.users));"), false);

  // Flagged: the managed schema as the target, in either position it can appear.
  assert.equal(await flagged('create table auth.shadow (id uuid primary key);'), true);
  assert.equal(await flagged('create table if not exists storage.extra (id uuid primary key);'), true);
  assert.equal(await flagged('alter table realtime.messages add column x text;'), true);
  assert.equal(await flagged('drop function auth.uid();'), true);
  assert.equal(await flagged('create or replace view auth.v as select 1;'), true);
  assert.equal(await flagged('create policy p on auth.users for select to authenticated using (true);'), true);
  assert.equal(await flagged('create index i on storage.objects (name);'), true);
});

// The exemption register, read in BOTH directions -- which is the difference between a control and
// a list, and it is RFC-2026-016 §4's own wording.
//
// "Force where compatible" was retired for being unfalsifiable: nothing could be pointed at to
// decide whether a table met it. The register is the falsifiable form. It was mandated on
// 2026-09-05 and did not exist until A1's countersignature §5.1 observed that the replacement for
// an unfalsifiable phrase was unfalsifiable by absence.
//
// It is empty today, and empty only MEANS anything if a non-empty register would be checked. So
// every case below constructs the situation rather than asserting on the file.
test('an unforced table with no registered exemption is refused', async () => {
  const base = await snapshot();
  const unforced = structuredClone(base);
  unforced.catalog.tenant_tables[0].rls_forced = false;

  const problems = await catalogLint(unforced, unforced.taken_against_migrations, { exemptions: [] });
  assert.ok(problems.some((p) => /relforcerowsecurity is false and no table-wide exemption/.test(p)),
    `an unforced table must be refused when nothing registers it:\n${problems.join('\n')}`);

  // And accepted when it IS registered -- otherwise the register is decoration and the rule is
  // just "never unforced", which is not what the RFC decided.
  const registered = await catalogLint(unforced, unforced.taken_against_migrations, {
    exemptions: [{
      role: '*', table: unforced.catalog.tenant_tables[0].table, operation: 'all',
      reason: 'constructed by this test', owner: '/claude/a0_atlas', review_date: '2099-01-01',
    }],
  });
  assert.deepEqual(registered, [], `a registered exemption must be accepted:\n${registered.join('\n')}`);
});

test('a registered exemption the catalog does not show is refused too', async () => {
  const base = await snapshot();
  // Every table is forced, so ANY row is a claim about a state that was not taken.
  const stale = await catalogLint(base, base.taken_against_migrations, {
    exemptions: [{
      role: '*', table: base.catalog.tenant_tables[0].table, operation: 'all',
      reason: 'an exemption nobody took', owner: '/claude/a0_atlas', review_date: '2099-01-01',
    }],
  });
  assert.ok(stale.some((p) => /is FORCED, so the exemption this row records was not taken/.test(p)),
    `a row with no matching catalog state must be refused:\n${stale.join('\n')}`);

  // A row for a table that does not exist at all is the same defect, one step further.
  const absent = await catalogLint(base, base.taken_against_migrations, {
    exemptions: [{
      role: '*', table: 'a_table_that_does_not_exist', operation: 'all',
      reason: 'x', owner: 'y', review_date: '2099-01-01',
    }],
  });
  assert.ok(absent.some((p) => /is not in the catalog/.test(p)), absent.join('\n'));
});

test('an exemption is refused when it is incomplete, mis-typed, or past its review date', async () => {
  const base = await snapshot();
  const unforced = structuredClone(base);
  const table = unforced.catalog.tenant_tables[0].table;
  unforced.catalog.tenant_tables[0].rls_forced = false;
  const lint = (row) => catalogLint(unforced, unforced.taken_against_migrations, { exemptions: [row] });

  // RFC-2026-016 §4 names six fields. A row missing one is not a weaker exemption, it is an
  // exemption nobody can review.
  for (const field of ['role', 'operation', 'reason', 'owner', 'review_date']) {
    const row = { role: '*', table, operation: 'all', reason: 'r', owner: 'o', review_date: '2099-01-01' };
    delete row[field];
    const problems = await lint(row);
    assert.ok(problems.some((p) => p.includes(`no ${field}`)), `a row missing ${field} must be refused:\n${problems.join('\n')}`);
  }

  const badOperation = await lint({ role: '*', table, operation: 'everything', reason: 'r', owner: 'o', review_date: '2099-01-01' });
  assert.ok(badOperation.some((p) => /is not one of select, insert, update, delete, all/.test(p)), badOperation.join('\n'));

  // The date is compared against the snapshot's own measurement date, so an exemption cannot age
  // into permanence while the database it describes stands still.
  const expired = await lint({ role: '*', table, operation: 'all', reason: 'r', owner: 'o', review_date: '2000-01-01' });
  assert.ok(expired.some((p) => /is a finding, not a fact that ages into permanence/.test(p)), expired.join('\n'));
});

// The granularity the register DECLARES against the granularity the catalog can CORROBORATE.
//
// C0's review D2: rows were matched to a table by name alone, so `{role: 'app_worker', operation:
// 'select'}` -- the narrowest shape the register allows -- bought its table a blanket pass, and the
// same row suppressed `rls_enabled` as well as `rls_forced`. `role` and `operation` were validated
// for presence and vocabulary and then never consulted, so the two dimensions RFC-2026-016 §4 names
// were untested precisely because they were unenforced.
//
// What the catalog can corroborate is written out in scripts/db/run.mjs and in the register's own
// `_what_the_catalog_can_corroborate`. These cases hold the lint to it, and the row ACCEPTED below
// is not the maximal `role: '*', operation: 'all'`.
test('a row narrower than the catalog can corroborate suppresses nothing', async () => {
  const base = await snapshot();
  const unforced = structuredClone(base);
  const table = unforced.catalog.tenant_tables[0].table;
  unforced.catalog.tenant_tables[0].rls_forced = false;
  const lint = (row) => catalogLint(unforced, unforced.taken_against_migrations, { exemptions: [row] });

  // The exact row from the finding. `relforcerowsecurity` is one value for the whole table, so
  // nothing in the catalog says this exemption was taken for one role and one command.
  const narrow = await lint({
    role: 'app_worker', table, operation: 'select',
    reason: 'the shape the finding used', owner: '/claude/a0_atlas', review_date: '2099-01-01',
  });
  assert.ok(narrow.some((p) => /relforcerowsecurity is false and no table-wide exemption/.test(p)),
    `a narrow row must not suppress the table-wide finding:\n${narrow.join('\n')}`);
  assert.ok(narrow.some((p) => /narrower than anything this catalog records/.test(p)),
    `a per-operation exemption must be refused as uncorroborable:\n${narrow.join('\n')}`);

  // Operation alone is enough to make it uncorroborable, even scoped to the whole table.
  const perOperation = await lint({
    role: '*', table, operation: 'update', reason: 'r', owner: 'o', review_date: '2099-01-01',
  });
  assert.ok(perOperation.some((p) => /relforcerowsecurity is false and no table-wide exemption/.test(p)),
    perOperation.join('\n'));

  // And role alone is too: a role-scoped row is a claim about the ROLE, which a table's FORCE
  // column is not evidence about in either direction.
  const perRole = await lint({
    role: 'app_worker', table, operation: 'all', reason: 'r', owner: 'o', review_date: '2099-01-01',
  });
  assert.ok(perRole.some((p) => /relforcerowsecurity is false and no table-wide exemption/.test(p)),
    perRole.join('\n'));
});

test('a role-scoped row is corroborated against the role, not against the table', async () => {
  const base = await snapshot();
  const table = base.catalog.tenant_tables[0].table;
  const row = (role) => ({
    role,
    table,
    operation: 'all',
    reason: 'the platform ships this role with BYPASSRLS, which is the measurement behind DATA-DEC-03',
    owner: '/claude/a0_atlas',
    review_date: '2099-01-01',
  });

  // ACCEPTED, and it is not `role: '*'`. `service_role` is in the catalog's measured
  // roles_bypassing_rls, so the exemption this row records is one the catalog shows -- on every
  // table at once, which is why naming a table in it narrows nothing and suppresses nothing.
  assert.deepEqual(await catalogLint(base, base.taken_against_migrations, { exemptions: [row('service_role')] }), [],
    'a row naming a role the catalog shows bypassing must be accepted');

  // REFUSED. app_worker holds neither rolbypassrls nor rolsuper, so this row claims an exemption
  // no field in the snapshot shows -- and under the previous rule it was accepted on any table that
  // was not enabled-and-forced, with no catalog evidence about app_worker at all.
  const unshown = await catalogLint(base, base.taken_against_migrations, { exemptions: [row('app_worker')] });
  assert.ok(unshown.some((p) => /app_worker is exempt from row level security nowhere in this catalog/.test(p)),
    `a role the catalog does not show bypassing must be refused:\n${unshown.join('\n')}`);
});

test('no register row excuses a tenant table having no row level security at all', async () => {
  const base = await snapshot();
  const off = structuredClone(base);
  const table = off.catalog.tenant_tables[0].table;
  off.catalog.tenant_tables[0].rls_enabled = false;
  off.catalog.tenant_tables[0].rls_forced = false;

  // The maximal exemption, which is the one that used to suppress both columns. §4 retired the
  // FORCE condition and replaced it with this register; RFC-2026-012 commits the whole boundary to
  // row level security, and nothing here was ever authorised to excuse relrowsecurity.
  const problems = await catalogLint(off, off.taken_against_migrations, {
    exemptions: [{
      role: '*', table, operation: 'all', reason: 'r', owner: 'o', review_date: '2099-01-01',
    }],
  });
  assert.ok(problems.some((p) => /relrowsecurity is false — the exemption register replaces the FORCE condition only/.test(p)),
    `an unenabled table must be refused whatever the register says:\n${problems.join('\n')}`);
  // ...and the same row still does its own job, so this is a narrowing and not a blanket refusal.
  assert.ok(!problems.some((p) => /relforcerowsecurity is false/.test(p)), problems.join('\n'));
});

// ---------------------------------------------------------------------------
// db-migrate-clean applies its own prerequisite (C0's review D3).
//
// Batch 000 installs pgcrypto into `public` on a database where nothing has installed it anywhere,
// and batch 004 refuses a database with pgcrypto in `public`. Both are applied and migration
// invariant 1 forbids rewriting either, so the set is applicable only where pgcrypto already exists
// outside `public` -- which was true of the provisioned instance by the platform's doing, and of CI
// by one line inside a GitHub workflow. `make db-migrate-clean` could not apply this repository's
// own migration set to a bare Postgres.
test('db-migrate-clean applies the prerequisite the migration set needs, before batch 000', async () => {
  const steps = await migrateCleanSteps();
  assert.equal(steps[0].name, PREREQUISITE, 'the prerequisite runs first or it is not a prerequisite');
  assert.match(steps[0].sql, /create schema if not exists extensions/i);
  assert.match(steps[0].sql, /create extension if not exists pgcrypto with schema extensions/i,
    'the prerequisite is the pgcrypto placement batch 004 asserts and batch 000 would otherwise get wrong');

  // Every batch still runs, in order, after it. The prerequisite is added to the command, not
  // substituted for anything.
  const batches = steps.slice(1).map((s) => s.name);
  assert.deepEqual(batches, [...batches].sort(), 'batches apply in lexical order');
  assert.ok(batches.every((n) => n.endsWith('.sql')));
  assert.ok(batches.includes('000_foundation.sql') && batches.includes('004_correct_the_batch_000_record.sql'),
    `both halves of the contradiction must still be applied: ${batches.join(', ')}`);

  // And it is NOT a migration: it carries no batch number, joins no digest, and reserves nothing in
  // the migration registry, so the committed snapshot does not go stale because the command grew a
  // step.
  assert.doesNotMatch(PREREQUISITE, /\/migrations\//);
  const snap = await snapshot();
  assert.equal(await appliedMigrationDigest(snap), snap.taken_against_migrations,
    'adding the prerequisite must not move the migration set digest');
});

test('the CI shim no longer satisfies the prerequisite behind the command', async () => {
  const shim = await readFile('db/foundation/ci/supabase-shim.sql', 'utf8');
  // While the placement lived here, CI prepared the container BEFORE db-migrate-clean ran, so the
  // step that would exercise the prerequisite never exercised it. If it comes back, the command's
  // self-sufficiency stops being observed by anything.
  assert.doesNotMatch(shim, /create\s+extension[^;]*pgcrypto/i,
    'pgcrypto placement belongs to db/foundation/prerequisites.sql, which db-migrate-clean applies itself');
  // The shim keeps saying what it is not.
  assert.match(shim, /A SHIM, not Supabase/);
  assert.match(shim, /It proves NOTHING about the platform/);
  // And it keeps the parts that really are platform emulation and really are CI-only.
  assert.match(shim, /create schema if not exists auth/i);
  assert.match(shim, /create or replace function auth\.uid\(\)/i);
});

// RFC-2026-019 §5. The decision is a NEGATIVE, and these are what make a negative fail a build.
//
// RFC-2026-018 proposed granting app_command to authenticator and was approved before the misreading
// under it was found: RFC-2026-017 §3 defines app_command as the OWNER of the SECURITY DEFINER
// command functions, not a role the request path assumes. Had it been implemented, the first rule
// below could never have been written -- the state it forbids would have been the intended state.
test('a membership in any service role is refused, because the decision is that there is none', async () => {
  const base = await snapshot();
  const digest = base.taken_against_migrations;

  for (const role of ['app_worker', 'app_command', 'app_maintenance']) {
    const granted = structuredClone(base);
    granted.catalog.authenticator_memberships = [...granted.catalog.authenticator_memberships, role];
    const problems = await catalogLint(granted, digest, { exemptions: [] });
    assert.ok(problems.some((p) => p.includes(`authenticator is a member of ${role}`)),
      `granting ${role} to authenticator must fail the lint:\n${problems.join('\n')}`);
  }

  // The memberships it DOES hold are the platform's own and are not findings — a rule that fired on
  // those would be one nobody could keep green, and a guard nobody can keep green gets turned off.
  assert.deepEqual(await catalogLint(base, digest, { exemptions: [] }), []);

  // And an unmeasured property must not read as a passing one.
  const unmeasured = structuredClone(base);
  delete unmeasured.catalog.authenticator_memberships;
  const silent = await catalogLint(unmeasured, digest, { exemptions: [] });
  assert.ok(silent.some((p) => /does not record what authenticator is a member of/.test(p)), silent.join('\n'));
});

test('a tenant table owned by app_command is refused, and an unrecorded owner too', async () => {
  const base = await snapshot();
  const digest = base.taken_against_migrations;

  // RFC-2026-017 §3: app_command is deliberately not the table owner, because a SECURITY DEFINER
  // function owned by the table owner is exempt from the policies on a forced table -- which is the
  // entire mechanism the role exists to provide.
  const owned = structuredClone(base);
  owned.catalog.tenant_tables[0].owner = 'app_command';
  const problems = await catalogLint(owned, digest, { exemptions: [] });
  assert.ok(problems.some((p) => /is owned by app_command/.test(p)), problems.join('\n'));

  const unrecorded = structuredClone(base);
  delete unrecorded.catalog.tenant_tables[0].owner;
  const silent = await catalogLint(unrecorded, digest, { exemptions: [] });
  assert.ok(silent.some((p) => /no owner recorded/.test(p)), silent.join('\n'));
});

test('a SECURITY DEFINER function with no recorded owner is refused, and app_command is not', async () => {
  const base = await snapshot();
  const digest = base.taken_against_migrations;

  const unrecorded = structuredClone(base);
  delete unrecorded.catalog.security_definer_functions[0].owner;
  const problems = await catalogLint(unrecorded, digest, { exemptions: [] });
  assert.ok(problems.some((p) => /SECURITY DEFINER with no owner recorded/.test(p)), problems.join('\n'));

  // The rule forbids not knowing, not the owner itself. A command function owned by app_command is
  // what RFC-2026-017 §3 expects, and a lint that refused it would refuse the design.
  const command = structuredClone(base);
  command.catalog.security_definer_functions.push({
    function: 'app.create_workspace', owner: 'app_command', config: ['search_path=""'],
  });
  assert.deepEqual(await catalogLint(command, digest, { exemptions: [] }), []);
});

// ---------------------------------------------------------------------------
// RFC-2026-020 §6.2 and §6.3, as decision logic.
//
// The proofs themselves need a Postgres and this host has none -- no psql, no docker -- so they
// run in CI, behind `make db-rls-smoke`, and a failure fails the build. What CAN be executed here
// is the part that decides what a transcript MEANS, and that is the part worth executing: a proof
// is only as good as its willingness to fail, and most cases below drive it with output that must
// make it fail.
//
// This is the same shape C0's review D4 asked for elsewhere in this package -- a property driven
// through a fake driver rather than protected by a grep.

import {
  proveCycleExists, proveDefinerIsNotInlined, proveExecuteGrants,
  proveTheHelperAnswersOnlyForTheCaller, proveThePolicyIsLoadBearing,
} from '../../scripts/db/authz-proofs.mjs';

const IDS = {
  owner: '5c460eb8-0710-557a-b423-f9b12c76834f',
  suspended: '9b10ac91-406b-5322-9755-bfb16b0b4aa3',
  ownerB: '297ad853-58a6-5e83-87e1-f936f9c3ddff',
  workspace: 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
};
// Answers handed back in the order the proof asks for them, so a proof that stops asking early
// fails loudly rather than reading someone else's answer.
const queued = (...answers) => { const q = [...answers]; return async () => q.shift() ?? { rows: [] }; };
const planOf = (...lines) => ({ rows: lines.map((l) => ({ 'QUERY PLAN': l })) });

test('the 42P17 proof passes only on 42P17, and a quiet database fails it', async () => {
  const raised = await proveCycleExists(
    queued({ error: { code: '42P17', message: 'infinite recursion detected in policy for relation "workspace_members"' } }), IDS);
  assert.equal(raised.ok, true, raised.detail);
  assert.match(raised.transcript, /infinite recursion detected/);

  // The failure that matters most: the cycle 010's header justified two unimplemented matrix cells
  // with turns out not to exist. That must be loud, not green.
  const quiet = await proveCycleExists(queued({ rows: [{ members: '5' }] }), IDS);
  assert.equal(quiet.ok, false);
  assert.match(quiet.detail, /did NOT raise/);

  // Any other error is a different failure and must not be laundered into this one.
  const other = await proveCycleExists(queued({ error: { code: '42501', message: 'permission denied' } }), IDS);
  assert.equal(other.ok, false);
  assert.match(other.detail, /rather than 42P17/);
});

test('the inlining proof fails when its own control cannot demonstrate inlining', async () => {
  // The trap the proof is built to avoid. If the INVOKER control is not inlined either, the
  // instrument cannot tell inlining from its absence, and "the definer was not inlined" is a
  // sentence about nothing. A vacuous instrument must fail rather than agree.
  const vacuous = await proveDefinerIsNotInlined(queued(
    planOf('Result', '  Output: app.__proof_invoker()'),
    planOf('Result', '  Output: app.__proof_definer()'),
    planOf('Result', "  Output: app.workspace_member_role('...'::uuid)"),
  ), IDS);
  assert.equal(vacuous.ok, false);
  assert.match(vacuous.detail, /cannot tell inlining from its absence/);
});

test('the inlining proof reports the decision wrong when SECURITY DEFINER is inlined', async () => {
  // RFC-2026-020 option G rests on this being impossible. If it happens, the required response is
  // to revert the batch and reopen the decision -- so the proof has to say that, not merely fail.
  const inlined = await proveDefinerIsNotInlined(queued(
    planOf('Result', "  Output: (NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))"),
    planOf('Result', "  Output: (NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))"),
    planOf('Result', "  Output: app.workspace_member_role('...'::uuid)"),
  ), IDS);
  assert.equal(inlined.ok, false);
  assert.match(inlined.detail, /THE DECISION IS WRONG/);

  // And the passing shape: invoker inlined, definer left as a call, shipped left as a call with no
  // scan of the table it reads.
  const correct = await proveDefinerIsNotInlined(queued(
    planOf('Result', "  Output: (NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::uuid"),
    planOf('Result', '  Output: app.__proof_definer()'),
    planOf('Result', "  Output: app.workspace_member_role('...'::uuid)"),
  ), IDS);
  assert.equal(correct.ok, true, correct.detail);

  // A shipped helper whose BODY appears in the plan is the cycle coming back, even when the pair
  // behaved.
  const spliced = await proveDefinerIsNotInlined(queued(
    planOf('Result', "  Output: (NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::uuid"),
    planOf('Result', '  Output: app.__proof_definer()'),
    planOf('Limit', '  ->  Seq Scan on app.workspace_members m'),
  ), IDS);
  assert.equal(spliced.ok, false);
  assert.match(spliced.detail, /was not left as a call/);
});

test("the negative control fails when dropping app_authz's policy changes nothing", async () => {
  // This is RFC-2026-020's security argument made falsifiable. A helper that silently bypassed
  // would keep answering with its policy gone, and every isolation case would still pass.
  const bypassing = await proveThePolicyIsLoadBearing(
    queued({ rows: [{ members: '5' }] }, { rows: [{ members: '5' }] }), IDS, 5);
  assert.equal(bypassing.ok, false);
  assert.match(bypassing.detail, /bypassing rather than being policed/);

  const policed = await proveThePolicyIsLoadBearing(
    queued({ rows: [{ members: '5' }] }, { rows: [{ members: '1' }] }), IDS, 5);
  assert.equal(policed.ok, true, policed.detail);

  // And if the roster never worked in the first place, the control has nothing to negate.
  const neverWorked = await proveThePolicyIsLoadBearing(
    queued({ rows: [{ members: '1' }] }, { rows: [{ members: '1' }] }), IDS, 5);
  assert.equal(neverWorked.ok, false);
  assert.match(neverWorked.detail, /nothing to negate/);
});

test('the helper must answer about its caller and nobody else', async () => {
  const answers = (owner, suspended, stranger) => queued(
    { rows: [owner] }, { rows: [suspended] }, { rows: [stranger] });
  const OWNER = { role: 'owner', member: 't' };
  const NOBODY = { role: '<null>', member: 'f' };

  assert.equal((await proveTheHelperAnswersOnlyForTheCaller(answers(OWNER, NOBODY, NOBODY), IDS)).ok, true);

  // §12.6 assertion 5, asked through the helper -- the path batch 011's widened policy newly opens.
  const suspendedIsActive = await proveTheHelperAnswersOnlyForTheCaller(
    answers(OWNER, { role: 'viewer', member: 't' }, NOBODY), IDS);
  assert.equal(suspendedIsActive.ok, false);
  assert.match(suspendedIsActive.detail, /SUSPENDED member/);

  // §6.3/12: the helper is callable by anyone, so it must not be a membership oracle for third
  // parties.
  const oracle = await proveTheHelperAnswersOnlyForTheCaller(
    answers(OWNER, NOBODY, { role: 'owner', member: 't' }), IDS);
  assert.equal(oracle.ok, false);
  assert.match(oracle.detail, /membership oracle for third parties/);

  // Without the positive, both negatives are satisfied by a helper that answers nothing at all.
  const dead = await proveTheHelperAnswersOnlyForTheCaller(answers(NOBODY, NOBODY, NOBODY), IDS);
  assert.equal(dead.ok, false);
  assert.match(dead.detail, /satisfied by the helper never answering/);
});

test('EXECUTE is checked for PUBLIC, for the callers that need it, and for the one that does not', async () => {
  const acls = (rows) => queued({ rows });
  const GOOD = [
    { function: 'is_active_member', acl: 'app_authz=X/app_authz authenticated=X/app_authz' },
    { function: 'jwt_subject', acl: 'app_authz=X/app_authz' },
    { function: 'workspace_member_role', acl: 'app_authz=X/app_authz authenticated=X/app_authz' },
  ];
  assert.equal((await proveExecuteGrants(acls(GOOD))).ok, true);

  // A default ACL means PUBLIC may execute, and PUBLIC reaches anon -- which batch 010 grants
  // nothing anywhere.
  const defaulted = await proveExecuteGrants(acls([{ function: 'jwt_subject', acl: '<default: PUBLIC may execute>' }]));
  assert.equal(defaulted.ok, false);
  assert.match(defaulted.detail, /PUBLIC may execute it/);

  const toPublic = await proveExecuteGrants(acls([
    ...GOOD.slice(0, 2), { function: 'workspace_member_role', acl: 'app_authz=X/app_authz =X/app_authz' },
  ]));
  assert.equal(toPublic.ok, false);
  assert.match(toPublic.detail, /EXECUTE to PUBLIC/);

  // The narrowing this batch makes deliberately: jwt_subject has no caller outside the helpers that
  // own it, so a grant to authenticated is a callable surface -- an RPC endpoint where `app` is the
  // exposed schema -- that nothing asked for.
  const widened = await proveExecuteGrants(acls([
    ...GOOD.slice(0, 1),
    { function: 'jwt_subject', acl: 'app_authz=X/app_authz authenticated=X/app_authz' },
    ...GOOD.slice(2),
  ]));
  assert.equal(widened.ok, false);
  assert.match(widened.detail, /jwt_subject is EXECUTE-granted to authenticated/);

  // And the policies must still be able to call what they call.
  const unreachable = await proveExecuteGrants(acls([
    { function: 'is_active_member', acl: 'app_authz=X/app_authz' }, ...GOOD.slice(1),
  ]));
  assert.equal(unreachable.ok, false);
  assert.match(unreachable.detail, /not EXECUTE-granted to authenticated/);
});

// ---------------------------------------------------------------------------
// RFC-2026-020 §6.1/1-7, each rule shown to REJECT.
//
// These rules are asked of the CI container rather than of the committed snapshot, because the
// provisioned instance does not have batch 011 and must not. That makes them the rules least
// likely to be exercised by anything on this host -- and a rule nothing has ever seen fail is a
// rule nobody has checked. Every case below hands authzLint a catalog that violates exactly one
// thing and requires it to say so.

import { AUTHZ_POLICY, AUTHZ_POLICY_QUAL, AUTHZ_TABLE, authzLint, platformIdentityLint } from '../../scripts/db/run.mjs';

// What the CI container actually measured on the green run, reduced to the fields the rules read.
const GOOD_AUTHZ = () => ({
  authenticator_memberships: [],
  authz: {
    role: { canlogin: false, bypassrls: false, superuser: false, inherit: false, has_password: false },
    owns_tables: [],
    functions: [
      { function: 'app.is_active_member', security_definer: true, config: ['search_path=""'] },
      { function: 'app.jwt_subject', security_definer: true, config: ['search_path=""'] },
      { function: 'app.workspace_member_role', security_definer: true, config: ['search_path=""'] },
    ],
    policies: [{
      table: AUTHZ_TABLE, policy: AUTHZ_POLICY, command: 'select', qual: AUTHZ_POLICY_QUAL,
    }],
    grants: {
      schemas: ['USAGE on schema app'],
      tables: [],
      columns: ['app.workspace_members.role', 'app.workspace_members.status',
        'app.workspace_members.user_id', 'app.workspace_members.workspace_id'],
    },
  },
});

const broken = (mutate) => { const c = GOOD_AUTHZ(); mutate(c); return authzLint(c); };
const rejects = (mutate, pattern, label) => {
  const problems = broken(mutate);
  assert.ok(problems.some((p) => pattern.test(p)), `${label}: expected a finding matching ${pattern}, got ${JSON.stringify(problems)}`);
};

test('the batch-011 catalog rules pass on what CI measured, so their rejections mean something', () => {
  assert.deepEqual(authzLint(GOOD_AUTHZ()), [],
    'the shape CI measured on the green run must satisfy every rule, or every rejection below is '
    + 'just the fixture being wrong');
});

test('§6.1/1: every app_authz role attribute is refused when true, and when unmeasured', () => {
  // NOBYPASSRLS is the load-bearing one: a bypassing helper owner answers every authorization
  // question yes, for reasons unrelated to the caller.
  rejects((c) => { c.authz.role.bypassrls = true; }, /rolbypassrls/, 'bypassrls');
  rejects((c) => { c.authz.role.superuser = true; }, /rolsuper/, 'superuser');
  rejects((c) => { c.authz.role.canlogin = true; }, /rolcanlogin/, 'canlogin');
  rejects((c) => { c.authz.role.inherit = true; }, /rolinherit/, 'inherit');
  rejects((c) => { c.authz.role.has_password = true; }, /a password/, 'password');
  // An unmeasured property must not read as a passing one -- the rule this file applies everywhere.
  rejects((c) => { delete c.authz.role.bypassrls; }, /carries no bypassrls field/, 'unmeasured');
  // And no block at all is a refusal rather than silence.
  assert.ok(authzLint({}).some((p) => /records no app_authz block/.test(p)));
});

test('§6.1/2: authenticator being a member of app_authz is refused', () => {
  // RFC-2026-019 §5's negative, extended by one name. A membership makes the helper owner
  // assumable from a JWT claim, which is the whole boundary.
  rejects((c) => { c.authenticator_memberships = ['anon', 'app_authz']; }, /authenticator is a member/, 'member');
  rejects((c) => { delete c.authenticator_memberships; }, /does not record what authenticator is a member of/, 'unmeasured');
});

test('§6.1/3: a table owned by app_authz is refused', () => {
  // Same rule as app_command, same reason: a SECURITY DEFINER function owned by the table owner is
  // not subject to the policies on that table.
  rejects((c) => { c.authz.owns_tables = ['workspace_members']; }, /owns app\.workspace_members/, 'owner');
  rejects((c) => { delete c.authz.owns_tables; }, /does not record which tables/, 'unmeasured');
});

test('§6.1/4: an invoker-mode helper, or one with no pinned search_path, is refused', () => {
  // Option D arriving unremarked: an invoker-mode helper runs as the caller, whose policy set on
  // app.workspace_members by then contains the policy that calls it.
  rejects((c) => { c.authz.functions[0].security_definer = false; }, /is not SECURITY DEFINER/, 'invoker');
  rejects((c) => { c.authz.functions[0].config = []; }, /does not pin an empty search_path/, 'search_path');
  // The role exists only as the owner of the helpers, so owning none means the batch did not land.
  rejects((c) => { c.authz.functions = []; }, /owns no function at all/, 'empty');
  rejects((c) => { delete c.authz.functions; }, /does not record the functions/, 'unmeasured');
});

test('§6.1/5: the pinned policy expression is the control, and every widening changes it', () => {
  // This is the string RFC-2026-020 §4 chose option G over option E for: E needed no exemption but
  // its central claim had no artefact that could hold it, and this one is a comparison a build
  // performs on every run.
  rejects((c) => { c.authz.policies[0].qual = 'true'; }, /policy expression is not the pinned one/, 'using (true)');
  rejects((c) => { c.authz.policies[0].qual = AUTHZ_POLICY_QUAL.replace(" AND (status = 'active'::text)", ''); },
    /policy expression is not the pinned one/, 'dropped the active check');
  rejects((c) => { c.authz.policies.push({ ...c.authz.policies[0], policy: 'second' }); },
    /holds 2 policies/, 'a second policy is a second decision');
  rejects((c) => { c.authz.policies[0].command = 'all'; }, /is FOR ALL/, 'command');
  rejects((c) => { c.authz.policies[0].table = 'workspaces'; }, /policy is on app\.workspaces/, 'table');
  rejects((c) => { c.authz.policies[0].policy = 'renamed'; }, /is named renamed/, 'name');
  rejects((c) => { delete c.authz.policies; }, /does not record the policies/, 'unmeasured');
});

test('§6.1/6: a wider grant than USAGE on app and four columns is refused', () => {
  // Column-scoped so the role cannot read token_hash or anything else it was given no reason to.
  rejects((c) => { c.authz.grants.tables = ['app.workspace_invitations']; }, /whole-table privilege/, 'table grant');
  rejects((c) => { c.authz.grants.schemas.push('USAGE on schema private'); }, /schema grants/, 'schema');
  rejects((c) => { c.authz.grants.columns.push('app.workspace_invitations.token_hash'); }, /column SELECT/, 'column');
  rejects((c) => { c.authz.grants.columns.pop(); }, /column SELECT/, 'missing column');
  rejects((c) => { delete c.authz.grants; }, /does not record .*grants/, 'unmeasured');
});

test('§6.1/7: a platform auth.uid() that moved fails the build instead of diverging silently', () => {
  // The cost of RFC-2026-020 §5/4 -- inlining a copy of the platform expression because no role our
  // migrations create can call auth.uid() -- made falsifiable. If Supabase changes the original,
  // the inlined copy becomes a different function from the one every other policy in the schema
  // uses, and that divergence must be decided rather than absorbed.
  const measured = {
    definition: 'CREATE OR REPLACE FUNCTION auth.uid()\n RETURNS uuid\n LANGUAGE sql\n STABLE\nAS $function$\n'
      + "  select \n  coalesce(\n    nullif(current_setting('request.jwt.claim.sub', true), ''),\n"
      + "    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')\n  )::uuid\n$function$\n",
    measured_at: '2026-09-06',
  };
  assert.deepEqual(platformIdentityLint({ platform_auth_uid: measured }), [],
    'the body measured read-only on the instance must satisfy the rule');

  const moved = { ...measured, definition: measured.definition.replace('request.jwt.claims', 'request.jwt.claims_v2') };
  assert.ok(platformIdentityLint({ platform_auth_uid: moved })
    .some((p) => /is not the function batch 011 copied a branch of/.test(p)),
  'a platform change must fail the build');

  // And an unmeasured field is not a passing one: the whole point of §5/4 is that the copy is held
  // to the original by a build rather than by memory.
  assert.ok(platformIdentityLint({}).some((p) => /records no platform auth\.uid\(\) definition/.test(p)));
});

// RFC-2026-022 §5's map, checkable WHILE EMPTY.
//
// The file is created before any batch classifies a cell, because four batches were about to
// classify at the same time and each creating it would have made a four-way conflict over a file
// whose whole purpose is to be one list. Empty is a claim — "no §8 `S` cell has been classified" —
// and a rule that only wakes up once there is an entry cannot hold it, so every case below
// constructs an entry rather than asserting on the file.
test('the service-policy map is refused when an entry is incomplete, unknown-shaped, or about nothing', async () => {
  const { servicePolicyMapLint } = await import('../../scripts/db/run.mjs');
  // QUALIFIED NAMES, since batch 110. The set is what the migrations actually create and a cell may
  // name a table in either schema our migrations own; an entry that writes the bare name still means
  // `app`, which is the form RFC-2026-022 §7.2's own example uses.
  const tables = new Set(['app.jobs', 'app.audit_logs', 'private.meta_webhook_inbox']);
  const good = { cell: '§8.4 Audit/security INSERT', table: 'audit_logs', operation: 'insert',
    shape: 'carried', why: 'the server already resolved the tenant', batch: '140' };

  assert.deepEqual(servicePolicyMapLint({ cells: [good] }, tables), [],
    'a complete entry naming a table a migration creates is accepted; otherwise the file could never grow');

  // RFC-2026-022 §3's test has TWO outcomes. A third would be a decision this file is not entitled
  // to record, so it is refused rather than stored.
  assert.ok(servicePolicyMapLint({ cells: [{ ...good, shape: 'partial' }] }, tables)
    .some((p) => /neither 'carried' nor 'discovered'/.test(p)));

  for (const field of ['cell', 'table', 'operation', 'shape', 'why', 'batch']) {
    const entry = { ...good }; delete entry[field];
    assert.ok(servicePolicyMapLint({ cells: [entry] }, tables).some((p) => p.includes(`no ${field}`)),
      `an entry missing ${field} is not a weaker classification, it is one nobody can review`);
  }

  // A SEVENTH FIELD IS A CLAIM THE REGISTER DOES NOT DECLARE, and this check exists because a batch
  // 100 reversal probe added one and NOTHING NOTICED. `role` and `broker_owner` are not decoration:
  // RFC-2026-022 §7.2's own proposed shape carries both and gives them meaning -- "`role: null` is
  // only valid with a `broker_owner`, so a DISCOVERED row cannot quietly acquire a service policy" --
  // while this repository's `_shape` declares neither. A row that grew one would read as an
  // authorisation in the one file §7.1/6 makes the answer to "which shape does this cell take".
  // Closed set, so a later batch that needs them adds them to `_shape` in a diff a reviewer reads.
  for (const field of ['role', 'broker_owner', 'rfc', 'approved']) {
    assert.ok(servicePolicyMapLint({ cells: [{ ...good, [field]: 'anything' }] }, tables)
      .some((p) => p.includes(`\`${field}\` is not a field this register declares`)),
    `an undeclared \`${field}\` on a classification row must be refused rather than ignored`);
  }
  assert.deepEqual(servicePolicyMapLint({ cells: [good] }, tables), [],
    'and the six declared fields alone still pass, so the closed set did not turn the rule off');

  // A classification of a cell on a table no migration creates is a claim about nothing.
  assert.ok(servicePolicyMapLint({ cells: [{ ...good, table: 'not_a_table' }] }, tables)
    .some((p) => /app\.not_a_table is created by no migration/.test(p)),
  'an unqualified name resolves to `app` and is checked there');

  // A CELL ON A TABLE IN `private`, which the rule could not express until batch 110 needed it.
  // §8.3's "Raw token/webhook SELECT" is about the raw webhook inbox, and §3.1 puts "raw webhook" in
  // `private` by name — so a rule that only understood `app` could not record a true classification.
  // Both directions: the qualified name is accepted when the migrations create it, and refused when
  // they do not, so the widening did not turn the check off for the schema it was widened for.
  assert.deepEqual(servicePolicyMapLint({ cells: [{ ...good, table: 'private.meta_webhook_inbox' }] }, tables), [],
    'a cell on a table in `private` is a classification the rule can state');
  assert.ok(servicePolicyMapLint({ cells: [{ ...good, table: 'private.not_a_table' }] }, tables)
    .some((p) => /private\.not_a_table is created by no migration/.test(p)),
  'and a qualified name is still checked against the migrations rather than trusted');

  // One statement, one answer.
  assert.ok(servicePolicyMapLint({ cells: [good, { ...good, shape: 'discovered' }] }, tables)
    .some((p) => /classified twice/.test(p)));

  // And a file with no cells array at all is refused rather than read as an empty map — the shape
  // this repository has been caught by twice, where "unmeasured" read as "passing".
  assert.ok(servicePolicyMapLint({}, tables).some((p) => /has no `cells` array/.test(p)));
});

test('the committed map classifies only cells on tables the migrations create', async () => {
  const { SERVICE_POLICY_MAP, servicePolicyMapLint, tablesCreatedByMigrations } =
    await import('../../scripts/db/run.mjs');
  const map = JSON.parse(await readFile(SERVICE_POLICY_MAP, 'utf8'));

  // THE ENTRY LANDED, WHICH IS THE DIFF THE PREVIOUS VERSION OF THIS TEST EXISTED TO PRODUCE. It
  // asserted `map.cells` deepEqual [] and said "when the first entry lands this assertion changes in
  // a diff, which is the point". Batch 110 classifies §8.3's "Raw token/webhook SELECT", which
  // RFC-2026-022 §3's own table assigns to batches 110 and 131, so the empty assertion is replaced
  // by the one it was standing in for: the map is checked against the tables that exist.
  //
  // AND IT IS CHECKED AGAINST THE REAL SET NOW. The old call passed `new Set()`, which no entry can
  // be in — fine while the file was empty and useless the moment it was not, because "unmeasured
  // reads as passing" is the shape this file exists to refuse.
  const tables = await tablesCreatedByMigrations();
  assert.ok(tables.has('private.meta_webhook_inbox') && tables.has('app.jobs'),
    'the table set was derived from the migrations, in both schemas');
  assert.deepEqual(servicePolicyMapLint(map, tables), [],
    'the committed map satisfies its own rule against the tables the migrations create');

  assert.ok(Array.isArray(map.cells) && map.cells.length >= 1,
    'at least one §8 `S` cell is classified. RFC-2026-022 is APPROVED AND NOT IN EFFECT — the only '
    + 'member of app_worker is postgres, which bypasses RLS — so a batch classifies here and writes '
    + 'no service policy.');

  // A CLASSIFICATION AUTHORISES NO POLICY, and that is the half a reader is most likely to get
  // wrong. Every cell in the map is checked against the migration text: a `discovered` cell may have
  // no policy on its table at all (RFC-2026-022 §5/5 and §7.1/5, "permanently, not pending"), and no
  // migration may name a service role in a policy on any classified table while §7 does not hold.
  const migrations = await readdir('db/foundation/migrations');
  const text = (await Promise.all(migrations.sort()
    .map((f) => readFile(`db/foundation/migrations/${f}`, 'utf8')))).join('\n');
  for (const cell of map.cells) {
    const qualified = cell.table.includes('.') ? cell.table : `app.${cell.table}`;
    // The pattern names a SERVICE ROLE, which it did not when it was written. Every table
    // classified then carried no policy at all, so "a policy on this table" and "a service policy
    // on this table" were the same set and the narrower one was never needed. Batch 051 classifies
    // app.notifications, which carries §8.4's `O` policy TO authenticated -- a CLIENT policy, which
    // RFC-2026-022 neither grants nor forbids. Left as it was, this assertion would have refused a
    // batch for writing exactly the policy its access-matrix row requires.
    assert.doesNotMatch(text, new RegExp(`create\\s+policy[^;]*\\bon\\s+${qualified.replace('.', '\\.')}\\b[^;]*\\bto\\s+app_(worker|command|maintenance)\\b`, 'i'),
      `${qualified} is classified ${cell.shape} in the service-policy map and a migration writes a `
      + 'policy on it. RFC-2026-022 is NOT IN EFFECT: a batch classifies a cell here and writes no '
      + 'service policy until §7 holds, and a DISCOVERED cell gets none ever.');
  }
});

// A RULE NO TARGET INVOKES IS A RULE NOBODY RUNS, which is the shape this repository has removed
// twice already. `servicePolicyMapLint` shipped exported and exercised by the test above and was
// composed into no target: `make db-schema-lint` was schemaLint + catalogLint and nothing else, so
// the map was read by a unit test and by no declared command. That was harmless while the file was
// empty and stopped being harmless when batch 061 classified a cell.
test('the schema-lint target reads the service-policy map, and rejects one it cannot read', async () => {
  const { servicePolicyMapCheck } = await import('../../scripts/db/run.mjs');
  assert.deepEqual(await servicePolicyMapCheck(), [],
    'the committed map passes the check the declared command now runs over it');
  // The wiring, asserted at the composition rather than only at the function: a check that exists
  // and is not called is exactly the thing this test was added to stop.
  const source = await readFile('scripts/db/run.mjs', 'utf8');
  assert.match(source, /target === 'schema-lint'[\s\S]{0,200}?servicePolicyMapCheck\(\)/,
    'db-schema-lint must compose the map check. RFC-2026-022 §7.1/6 asks for a rule that reads the map in '
    + 'BOTH directions, and a rule reachable only from a unit test is read in neither by the command '
    + 'contract the data package declares.');
  // And it REJECTS rather than passing on a file it cannot read as a map — the "unmeasured reads as
  // passing" shape the map's own header says this repository has been caught by twice.
  const refused = await servicePolicyMapCheck('db/foundation/seeds/fixture-catalog.json');
  assert.ok(refused.some((p) => /has no `cells` array/.test(p)),
    'a file with no cells array is refused rather than read as an empty map');
  const missing = await servicePolicyMapCheck('db/foundation/lint/there-is-no-such-file.json');
  assert.ok(missing.some((p) => /could not be read as JSON/.test(p)),
    'and an absent file is a finding rather than a silent zero-problem answer');
});

test('every entry in the map names a table a migration creates, and none of them buys a policy', async () => {
  const { readdir } = await import('node:fs/promises');
  const { SERVICE_POLICY_MAP, servicePolicyMapLint } = await import('../../scripts/db/run.mjs');
  const map = JSON.parse(await readFile(SERVICE_POLICY_MAP, 'utf8'));

  // THE ASSERTION THAT USED TO BE HERE WAS `assert.deepEqual(map.cells, [])`, and its own message
  // said "when the first entry lands this assertion changes in a diff, which is the point". Batch
  // 061 is that batch: it classifies §8.4's "Usage ledger INSERT" on app.usage_events. The empty
  // claim is replaced rather than deleted, by the two claims that survive the file having content.
  //
  // FIRST: the map satisfies its own rule, measured against the tables the migration set ACTUALLY
  // creates rather than against a hand-kept list. The previous version passed an empty set, which
  // was correct while the map was empty and would have been a rule asking a question it could not
  // answer the moment it was not.
  //
  // AND IT READS THE SET THROUGH THE RULE'S OWN HELPER RATHER THAN REBUILDING IT. This test once
  // globbed the migration directory itself and matched `create table app.(\w+)`, which yields
  // UNQUALIFIED names. Batch 110 classifies a cell on `private.meta_webhook_inbox` and widened
  // `table` to accept a schema-qualified name, so the hand-rolled set became the wrong SHAPE and
  // the rule reported that two tables which plainly exist do not. A test that builds its own copy
  // of the thing it is checking against is a second definition, and it drifts.
  const { tablesCreatedByMigrations } = await import('../../scripts/db/run.mjs');
  const created = await tablesCreatedByMigrations();
  const dir = 'db/foundation/migrations';
  await readdir(dir);
  assert.ok(created.size > 0, 'the migration set creates tables, or this rule is asking nothing');
  assert.deepEqual(servicePolicyMapLint(map, created), [],
    'the committed map satisfies its own rule against the tables the migrations create');

  // SECOND, AND IT IS THE HALF THE EMPTY ASSERTION WAS REALLY PROTECTING: an entry classifies a
  // cell and BUYS NO POLICY. RFC-2026-022 is APPROVED AND NOT IN EFFECT — measured, the only member
  // of app_worker is postgres, which bypasses RLS — so a batch records the shape here and writes
  // nothing to `pg_policy`. A map row appearing beside a service policy is that decision being put
  // into effect by a migration rather than by the §7 conditions the RFC lists.
  assert.match(String(map._not_in_effect), /NOT IN EFFECT/,
    'the file says so where an author reads it, so an entry cannot be mistaken for an authorisation');
  for (const cell of map.cells) {
    const migration = await readFile(`${dir}/${cell.batch}`, 'utf8');
    const code = migration.replace(SQL_LINE_COMMENTS, '');
    // `cell.table` may be schema-qualified since batch 110 -- its own cell is on a table in
    // `private` -- so the schema is taken from the name when it carries one and defaults to `app`
    // when it does not, which is what the rule itself does. Hard-coding `app.` here would have
    // built `on app.private.meta_webhook_inbox`, a pattern nothing can match, and the assertion
    // would have passed by asking a question about a table that does not exist.
    const qualified = cell.table.includes('.') ? cell.table : `app.${cell.table}`;
    assert.doesNotMatch(code, new RegExp(`create policy[^;]*on ${qualified.replace('.', '\\.')}[^;]*to app_worker`, 'i'),
      `${cell.batch} classifies ${qualified}.${cell.operation} in the service-policy map AND writes a `
      + 'service policy for it. RFC-2026-022 §5/8: a policy TO app_worker is unreachable today except from '
      + 'an identity for which it is moot.');
    assert.doesNotMatch(code, /current_setting\('app\.workspace_id'/,
      `${cell.batch} spells the confinement expression. RFC-2026-022 §5/2 gives it exactly one legal `
      + 'spelling and §7.1/7 requires that literal to appear ONCE in the tree, in the lint — a second '
      + 'spelling in a migration is the failure M4 measured, and it fails open into an error.');
  }
});

// THIS ASSERTION CHANGED IN A DIFF, WHICH IS WHAT ITS PREDECESSOR SAID WOULD HAPPEN. It read
// `assert.deepEqual(map.cells, [])` with the note "when the first entry lands this assertion changes
// in a diff, which is the point". Batch 051 classified §8.4's notification cell, so the empty
// assertion is replaced rather than deleted, and by a stronger one: the committed map is checked
// against the REAL migration table set in BOTH directions — a row about a table no migration creates
// is refused by the lint, and a row whose batch does not exist is refused here.
//
// What is deliberately NOT asserted is a COUNT of the cells. RFC-2026-022 §3 lists nine `S` cells
// across §8.2-§8.4 and batches 061, 110 and 131 are being written in parallel with this one; a number
// pinned here would be true of one branch and false of the tree it merged into, which is the defect
// the 2026-09-07 integration recorded four times over.
test('the committed service-policy map satisfies its own rule, and every entry names a real batch', async () => {
  const { SERVICE_POLICY_MAP, servicePolicyMapLint, tablesCreatedByMigrations } = await import('../../scripts/db/run.mjs');
  const map = JSON.parse(await readFile(SERVICE_POLICY_MAP, 'utf8'));

  const dir = 'db/foundation/migrations';
  const names = (await readdir(dir)).filter((n) => n.endsWith('.sql')).sort();
  const files = await Promise.all(names.map(async (name) => ({ name, sql: await readFile(`${dir}/${name}`, 'utf8') })));
  // `tenantTablesInMigrations` answers a DIFFERENT question -- which tables carry workspace_id --
  // and it answers it with unqualified names. The rule's own set is `tablesCreatedByMigrations`,
  // which is schema-qualified since batch 110 classified a cell on a table in `private`, and a
  // `private` table is not a tenant table at all. The two happened to agree while every classified
  // cell was on a tenant table in `app`; they do not agree now.
  const tables = await tablesCreatedByMigrations(files);

  assert.deepEqual(servicePolicyMapLint(map, tables), [],
    'the committed map satisfies its own rule against the tables the migrations actually create');

  for (const cell of map.cells) {
    assert.ok(names.includes(cell.batch),
      `${cell.table}.${cell.operation} is classified by ${cell.batch}, which is not a migration in ${dir}. `
      + 'A classification attributed to a batch that does not exist is a row nobody can review against a '
      + 'file.');
    assert.match(cell.cell, /^§8\.[1-4] /,
      `${cell.table}.${cell.operation}: the cell must be quoted from one of §8's four access matrices`);
  }

  // AND THE DECISION IS STILL NOT IN EFFECT, which is the property a non-empty map could quietly
  // lose. RFC-2026-022's status line and this file's own `_not_in_effect` field both say a batch
  // classifies here and writes NO service policy until §7 holds; the day somebody writes one, that
  // field has to change first, and this is what says so.
  assert.match(map._not_in_effect, /NOT IN EFFECT/,
    'the map records that RFC-2026-022 is approved and not in effect — measured, the only member of '
    + 'app_worker is postgres, which bypasses RLS. A classification authorises no policy, and a map '
    + 'that stopped saying so would read as one that did.');
});

// The committed map is no longer empty, and this test moved with it in the diff the previous
// version asked for by name: it said "when the first entry lands this assertion changes in a diff,
// which is the point." What replaces `deepEqual(cells, [])` is not a weaker claim — an exact list
// would have to be rewritten by every batch that classifies a cell, and four are being written at
// once — but a claim about EVERY entry: each is well formed, each names a table a migration
// actually creates, and each classifies a cell no other entry classifies.
test('every classified S cell is well formed and names a table a migration creates', async () => {
  const { SERVICE_POLICY_MAP, servicePolicyMapLint, tablesCreatedByMigrations } =
    await import('../../scripts/db/run.mjs');
  const map = JSON.parse(await readFile(SERVICE_POLICY_MAP, 'utf8'));

  // The tables the migration set actually creates, from the rule's OWN helper rather than from a
  // regex written beside it. This test built the set itself with `create table app.(\w+)`, which is
  // right up to the moment a cell is classified on a table outside `app`: batch 110's is on
  // private.meta_webhook_inbox, and the names the rule compares against have been schema-qualified
  // since. A second definition of "the tables the migrations create" does not merely duplicate the
  // first, it drifts from it -- this is the seventh copy found in one integration round, and the
  // one before it sat inside a `doesNotMatch`, where drift makes an assertion QUIETER rather than
  // louder and nothing fails at all.
  const tables = await tablesCreatedByMigrations();
  assert.ok(tables.size >= 18, 'the table set is read from the migrations, not from a list in this file');

  assert.deepEqual(servicePolicyMapLint(map, tables), [],
    'the committed map satisfies its own rule against the tables the migration set creates');

  // RFC-2026-022 is APPROVED AND NOT IN EFFECT — measured 2026-09-08, the only member of app_worker
  // is postgres, which bypasses RLS — so an entry classifies a cell and authorises no policy. That
  // is asserted as the SHAPE of every entry rather than as a count, because a count is the thing
  // four parallel branches each get right about their own base and wrong about the merged tree.
  assert.ok(Array.isArray(map.cells), 'the file is a list of classifications');
  for (const cell of map.cells) {
    assert.ok(['carried', 'discovered'].includes(cell.shape),
      `${cell.cell}: RFC-2026-022 §3's test has two outcomes and a third would be a decision this file is `
      + 'not entitled to record');
    assert.match(cell.batch, /^\d{3}_[a-z_]+\.sql$/,
      `${cell.cell}: the batch that classified it is named as a migration filename, so a reviewer can go and `
      + 'read the statement the classification is about');
    assert.ok(cell.why.length > 80,
      `${cell.cell}: §5's shape requires the reason to be "a sentence someone can disagree with", and a `
      + 'one-word reason is a verdict rather than an argument');
  }
});


// `sessionDriver` carries the same privilege decision `bufferedDriver` does, and these check it
// WITHOUT a database, because that decision is statically decidable and a control only a live
// target can check is a control most runs do not check.
//
// The fake records what the driver assembled. That is the seam the buffered driver's own comment
// argues for: "a test that cannot see the SQL this driver actually assembles cannot check one".
const recordingSession = (results = {}) => {
  const sent = [];
  return {
    sent,
    async exec(sql) { sent.push(sql); return results[sql] ?? { rows: [] }; },
  };
};

test('the session driver resets role immediately before an identity call and never otherwise', async () => {
  const { sessionDriver } = await import('../../scripts/db/rls-smoke.mjs');
  const session = recordingSession();
  const driver = sessionDriver(session);
  await driver.begin();
  await driver.exec('select private.as_user($1)', ['11111111-1111-1111-1111-111111111111']);
  assert.deepEqual(session.sent, [
    'begin;',
    'reset role;',
    "select private.as_user('11111111-1111-1111-1111-111111111111');",
  ], 'reset role must be the statement immediately before the identity call, inside the transaction');

  // A0's review D7 and A3's batch-060 correction as one case: a table in `private` whose NAME
  // begins `as_` must not buy a role reset, and neither must a case passing `private.as_` as a
  // VALUE. Either would run a case's own statement as the role that BYPASSES row level security.
  const other = recordingSession();
  const d2 = sessionDriver(other);
  await d2.exec('select * from private.as_of_date where label = $1', ['private.as_user(']);
  assert.equal(other.sent.length, 1, 'a read of a private TABLE must not emit reset role');
  assert.doesNotMatch(other.sent[0], /reset role/, 'no reset role for a table read');
  assert.match(other.sent[0], /'private\.as_user\('/, 'the parameter must arrive as a literal, not as code');
});

test('the session driver stops if the role reset it needs was refused', async () => {
  const { sessionDriver } = await import('../../scripts/db/rls-smoke.mjs');
  // A reset that failed and was ignored would run the identity call as whatever role the session
  // already held, and the case would then assert against the wrong identity WHILE PASSING.
  const session = recordingSession({ 'reset role;': { error: { code: '42501', message: 'denied' } } });
  const driver = sessionDriver(session);
  const out = await driver.exec('select private.as_service()', []);
  assert.equal(out.error?.code, '42501', 'the refusal must be returned, not swallowed');
  assert.deepEqual(session.sent, ['reset role;'], 'the identity call must not be issued after a failed reset');
});

test('both drivers inline parameters through one escaping function, not two', async () => {
  const smoke = await import('../../scripts/db/rls-smoke.mjs');
  assert.equal(typeof smoke.inlineParams, 'function');
  assert.equal(typeof smoke.assumesIdentityCall, 'function');
  assert.equal(smoke.inlineParams('select $1', ["o'brien"]), "select 'o''brien'");
  // THE DEFECT AN ADVERSARIAL READ FOUND, as three cases. Substitution used to run pass by pass
  // over the ALREADY SUBSTITUTED string, so a value containing a later placeholder was re-scanned
  // and escaped its own literal. Harmless while psql read only `--command`; not harmless once the
  // driver writes to psql's stdin, where a line beginning with a backslash is psql's.
  assert.equal(smoke.inlineParams('select $1 as a, $2 as b', ['x$2y', 'B']),
    "select 'x$2y' as a, 'B' as b",
    'a value containing $2 must stay inside its own literal');
  assert.equal(smoke.inlineParams('select $10 as a', ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'TENTH']),
    "select 'TENTH' as a",
    '$10 must not be eaten by the $1 pass');
  assert.equal(smoke.inlineParams('select $1 as a, $2 as b', ['pay $20 today', 'ok']),
    "select 'pay $20 today' as a, 'ok' as b",
    'an innocent value carrying a dollar sign must not corrupt the statement');
  assert.equal(smoke.inlineParams('select $3 as a', ['one', 'two']), 'select $3 as a',
    'a placeholder with no parameter is left alone rather than replaced with undefined');
  const withNul = 'a' + String.fromCharCode(0) + 'b';
  assert.throws(() => smoke.inlineParams('select $1', [withNul]), /NUL byte/,
    'a NUL byte must be refused rather than truncated somewhere downstream');
  // §6.3 of the parallel-integration record: ONE copy of a privilege decision. A second spelling
  // of either rule is exactly the drift that rule exists for, so the source is checked for one.
  const source = (await readFile('scripts/db/rls-smoke.mjs', 'utf8')).replace(/^\s*\/\/.*$/gm, '');
  assert.equal((source.match(/standard_conforming_strings/g) ?? []).length, 0,
    'the escaping rule belongs in a comment on inlineParams, not restated in code');
  assert.equal((source.match(/private\\\.as_/g) ?? []).length, 1,
    'the anchored identity-call pattern must appear exactly once in code');
});


// `parseSessionOutcome` is the session's boundary logic as a pure function, and these are the
// tests the first version of that session did not have. Every case below is synthetic psql
// output: no database, no process, and therefore checkable on every run rather than only where a
// live target happens to be wired.
//
// THE FIRST VERSION DECIDED "this is an error" WITH A REGEX OVER MERGED stdout+stderr, and a row
// value could forge a privilege refusal — a false PASS in the one function whose job is to stop
// false passes. Three of the five cases here are that defect, written so a reintroduction fails
// the build rather than being found by the next adversarial reader.
const MARKERS = { open: '__pd_open_T__', stat: '__pd_stat_T__', close: '__pd_close_T__' };
const session = (rows, status) => [MARKERS.open, ...rows, `${MARKERS.stat} ${status}`, MARKERS.close].join('\n');

test('a row value shaped like a privilege refusal is data, not an error', async () => {
  const { parseSessionOutcome } = await import('../../scripts/db/psql-driver.mjs');
  // The exact value that broke the first implementation.
  const forged = 'ERROR:  42501: permission denied for table app.workspaces';
  const out = parseSessionOutcome(session(['note', forged], 'false 00000'), MARKERS);
  assert.equal(out.error, undefined,
    'psql reported no error, so nothing in the ROWS may turn this into one — that was a false pass');
  assert.deepEqual(out.rows, [{ note: forged }],
    'the forged text must arrive as the value it is');

  // And the multi-line CSV shape, where the continuation line also starts at column 0.
  const wrapped = parseSessionOutcome(session(['note', '"hello', `${forged}"`], 'false 00000'), MARKERS);
  assert.equal(wrapped.error, undefined, 'a quoted multi-line value must not become an error either');
});

test('the error flag comes from psql and the SQLSTATE with it, or the outcome is refused', async () => {
  const { parseSessionOutcome } = await import('../../scripts/db/psql-driver.mjs');
  const denied = parseSessionOutcome(session([], 'true 42501 permission denied for schema private'), MARKERS);
  assert.equal(denied.error.code, '42501');
  assert.equal(denied.error.message, 'permission denied for schema private');

  // A code psql could not have produced must not be passed on as one.
  const bogus = parseSessionOutcome(session([], 'true notacode something went wrong'), MARKERS);
  assert.equal(bogus.error.code, null, 'a five-character SQLSTATE or nothing — never a guess');

  // Neither true nor false is an outcome nobody can classify, and that is not a pass.
  const junk = parseSessionOutcome(session([], 'maybe 00000'), MARKERS);
  assert.match(junk.error.message, /neither true nor false/);

  // An error with no message falls back to stderr, which is the ONLY thing stderr is used for.
  const quiet = parseSessionOutcome(session([], 'true 42501'), MARKERS, 'psql: FATAL: something');
  assert.equal(quiet.error.code, '42501');
  assert.match(quiet.error.message, /FATAL/);
});

test('a forged marker is refused rather than chosen between', async () => {
  const { parseSessionOutcome } = await import('../../scripts/db/psql-driver.mjs');
  // This is test-kits/db/rls-assertions.test.mjs's forging case, carried onto the function that
  // replaced `resultRegion`. The live driver puts a randomUUID in each marker so a value cannot
  // contain the one it would need — but "unreachable" is a claim and a refusal is a control.
  const forged = parseSessionOutcome(
    session(['a', MARKERS.close], 'false 00000'), MARKERS);
  assert.match(forged.error.message, /printed 1 open, 1 status and 2 close/);
  assert.match(forged.error.message, /will not choose an occurrence/);

  const missing = parseSessionOutcome([MARKERS.open, 'a', '1'].join('\n'), MARKERS);
  assert.match(missing.error.message, /0 status and 0 close/,
    'a truncated read is not an empty result');

  const outOfOrder = parseSessionOutcome(
    [`${MARKERS.stat} false 00000`, MARKERS.open, MARKERS.close].join('\n'), MARKERS);
  assert.match(outOfOrder.error.message, /out of order/);
});

test('a status marker that is not at the start of its line is refused', async () => {
  const { parseSessionOutcome } = await import('../../scripts/db/psql-driver.mjs');
  // psql prints `\echo` output at column 0. A marker appearing mid-line means it came from
  // somewhere else, and the flag on that line is not psql's answer about this statement.
  const out = parseSessionOutcome(
    [MARKERS.open, `x,${MARKERS.stat} true 42501`, MARKERS.close].join('\n'), MARKERS);
  assert.match(out.error.message, /printed inside another line/);
  assert.equal(out.error.code, null,
    'an unclassifiable outcome carries no SQLSTATE, which is what expectDenied refuses');
});

test('an empty result is empty and a header alone is not a row', async () => {
  const { parseSessionOutcome } = await import('../../scripts/db/psql-driver.mjs');
  assert.deepEqual(parseSessionOutcome(session(['n'], 'false 00000'), MARKERS).rows, [],
    'a header with no data rows is zero rows — counting lines is what made a set_config row look like a tenant row');
  assert.deepEqual(parseSessionOutcome(session([], 'false 00000'), MARKERS).rows, [],
    'no output at all is zero rows');
  assert.deepEqual(parseSessionOutcome(session(['name,n', 'x,2'], 'false 00000'), MARKERS).rows,
    [{ name: 'x', n: '2' }], 'rows are keyed by column name, which is the shape the cases read');
});

// THE ~128 KiB CEILING ON A MIGRATION IS GONE, AND THIS RULE IS WHAT KEEPS IT GONE.
//
// Batch 100 found that scripts/db/psql-driver.mjs handed a migration to psql as ONE argv string
// (`--command`), which Linux caps at MAX_ARG_STRLEN = 131,072 bytes: batch 100's first version failed
// with `spawn E2BIG` before psql started (CI run 34753787430) and 070_research.sql had cleared the
// ceiling by 219 bytes. Batch 100 wrote a byte budget here to make the limit visible and left the
// fix -- feed the script on stdin -- to A0 as an open blocker. This is that fix, and the budget
// rule it replaces: the driver's `script()` now feeds psql on stdin, `db-migrate-clean` proves it on
// every run by applying a 200,000-byte no-op script after the real set (run.mjs CEILING_PROBE_SQL),
// and a migration may be as long as it needs to be.
//
// WHAT STDIN CHANGES THAT `--command` DID NOT, and the one rule that follows from it: psql PARSES a
// script it reads, so a line beginning with a backslash is a meta-command and is EXECUTED -- `\!`
// runs a shell command. Under `--command` such a line was a syntax error. No migration carries one
// and none may. Fixtures and cases keep the `--command` path (rls-smoke.mjs says why), so they are
// not held to this.
const CEILING_PROBE_MINIMUM = 131072;

test('a migration may exceed the old argv ceiling, and none may carry a psql meta-command', async () => {
  const driver = await readFile('scripts/db/psql-driver.mjs', 'utf8');
  assert.match(driver, /export async function script\(sql, options = \{\}\) \{\n  return query\([^\n]*viaStdin: true/,
    'the driver feeds a script on stdin; a script path that went back to --command would bring the 128 KiB ceiling back with it');
  const runner = await readFile('scripts/db/run.mjs', 'utf8');
  assert.match(runner, /const probe = await script\(CEILING_PROBE_SQL\);/,
    'db-migrate-clean applies the ceiling probe after the real set, so the claim is proven on every run rather than once');
  const { CEILING_PROBE_SQL, CEILING_PROBE_BYTES } = await import('../../scripts/db/run.mjs');
  assert.ok(Buffer.byteLength(CEILING_PROBE_SQL, 'utf8') > CEILING_PROBE_MINIMUM,
    `the probe is ${Buffer.byteLength(CEILING_PROBE_SQL, 'utf8')} bytes and must exceed the old ceiling of ${CEILING_PROBE_MINIMUM}, or it proves nothing`);
  assert.equal(CEILING_PROBE_BYTES, 200000, 'and its size is declared, so a shrink is a diff a reviewer reads');
  assert.match(CEILING_PROBE_SQL, /^do \$\$ begin end \$\$;\n-- x+\n$/,
    'the probe is one empty DO block and a comment: it must change nothing in the database it is applied to');
  const dir = 'db/foundation/migrations';
  const names = (await readdir(dir)).filter((n) => n.endsWith('.sql')).sort();
  assert.ok(names.length > 0, 'there must be migrations for this rule to be about anything');
  // The post-migrate pass feeds its replacements on stdin too (A1's review of d70d2d6 measured a `\\!`
  // line in one running on the host), so they are held to the same rule.
  const replacements = (await readdir('db/foundation/invariants')).filter((n) => n.endsWith('.sql')).map((n) => `db/foundation/invariants/${n}`);
  assert.ok(replacements.length >= 10, 'the replacements are read by this rule');
  // ANYWHERE ON A LINE, not only at its start (blocker 186 item 12; Q0 F4 on batch 125: `select 1; \\! touch
  // <file>` appended to a migration ran a shell command at migrate-clean while this rule read the line
  // as clean). psqlLex reads the text as psql does: a backslash inside a literal, a dollar-quoted body,
  // a quoted identifier or a comment is text, and anywhere else it is a command psql executes.
  const { psqlLex } = await import('../../scripts/db/psql-driver.mjs');
  for (const name of [...names, 'db/foundation/prerequisites.sql', ...replacements]) {
    const text = await readFile(name.includes('/') ? name : `${dir}/${name}`, 'utf8');
    const meta = psqlLex(text).metaCommands;
    assert.deepEqual(meta, [],
      `${name} line ${meta[0]?.line} carries a backslash outside any literal, body or comment. Under stdin psql executes that as a meta-command -- \\! runs a shell command -- where --command would have refused it as syntax. A migration is SQL and nothing else.`);
  }
  // The lexer, on the shapes the reviews measured and the shapes it must leave alone.
  // Batch 128 refuses every E'' string (C0 N2, A1 N4, Q0 N7 on 127's re-check), so each shape below that
  // opens one carries one more finding than it did: E'\\'' and its \\gexec 1 -> 2, e'\\'' 0 -> 1, and
  // `1.e'` 2 -> 3 (psql reads that one as a plain literal; refused with the rest, fail closed).
  for (const [sql, n] of [['select 1; \\! touch f', 1], ['select 1 \\gexec', 1], ['\\c other', 1], ['select 1;\n  \\set a COM', 1],
    ["select E'\\'' as a; \\gexec", 2], ["select '%\\_by';", 0], ["select '\\!' as a;", 0], ['select $$ \\! $$;', 0], ['select $t$ \\! $t$;', 0],
    ['-- \\! a comment\nselect 1;', 0], ['/* \\! /* nested */ */ select 1;', 0], ['select "a\\b" from t;', 0],
    // Batch 126's review round (A1 F1, Q0 F1): where psql's lexer could part from this one, refused. A
    // bare CR ends a -- comment for psql (A1 L3); standard_conforming_strings, named anywhere (A1 L2, Q0
    // X1); a quote after an odd run of backslashes in a plain literal, which is where turning it off by
    // any spelling moves the literal's end (A1 L2 by set_config); `1.e'` is a plain literal (A1 L1); a
    // plain literal read as an E-string, and a dollar tag after an identifier character, would each
    // hide the \\! (Q0 M-LEX-E, M-LEX-DQ).
    ['select 1 as one; -- a comment\r \\! touch f\n', 1], ["set standard_conforming_strings = off;\nselect 'x';", 1],
    // The sql-lexer batch: this one also leaves its last literal unterminated, which the one lexer refuses (fail
    // closed) where the old scanner read it to the end: 1 -> 2. And `1.e'` is trailing junk after a number to
    // PostgreSQL 15+, refused as such besides its other findings: 3 -> 4.
    ["select set_config('standard_' || 'conforming_strings', 'off', false);\nselect 'x\\' as a, ' \\! f\nas b;", 2],
    ["set standard_conforming_strings = off;\nselect '\\''; \\! touch f\n-- '", 2], ["select 1.e'\\' \\! touch f\n';", 4],
    ["select '\\'; \\! x\n-- '", 2], ['select 1 as x$a$; \\! x\n-- $a$', 1],
    ["select 'a\\\\';", 0], ['select 1;\r\nselect 2;\r\n', 0], ["select e'\\'' as a;", 1],
    // Batch 127 (Q0 F1 on batch 126's re-check): the odd-run rule at runs of three and five, not one alone.
    // Narrowed to `run === 1` the rule passed every layer and XODD3B -- the setting turned off by a
    // concatenated name, then three backslashes before the quote -- ran a shell command at migrate-clean.
    // Each odd run is one finding and hides its \\! from nobody; each even run is none.
    ["select pg_catalog.set_config('standard_' || 'conforming_strings', 'off', false);\nselect '\\\\\\''; \\! touch f\n-- '", 1],
    ["select 'a\\\\\\'' as b; \\! x\n-- '", 1], ["select 'a\\\\\\\\\\'' as b; \\! x\n-- '", 1],
    ["select 'a\\\\\\\\';", 0], ["select 'a\\\\\\\\\\\\';", 0],
    // Batch 127 (C0 R2 on batch 126): a change of client encoding, by name anywhere or by SET NAMES, is
    // refused, and `\\encoding` is a backslash like any other. A string or column that merely says
    // "names" is not.
    ["set client_encoding = 'SJIS';\nselect 1;", 1], ["select pg_catalog.set_config('client_encoding', 'BIG5', false);", 1],
    ["alter role app_worker set client_encoding = 'GBK';", 1], ['-- client_encoding, in a comment\nselect 1;', 1],
    ["SET NAMES 'SJIS';", 1], ["set session names 'UHC';\nselect 1;", 1], ["/* c */ set local names 'GB18030';", 1],
    ['\\encoding SJIS', 1],
    // Batch 127's review round (C0 F6): the SET NAMES words anywhere, not at a statement head alone. C0
    // measured the first shape below passing the head-only rule and moving psql's encoding to SJIS. A
    // literal, a dollar body and a comment between the words are read; a word that merely contains
    // "names" or "set" is not.
    ["do $$ begin execute 'set names ''SJIS'''; end $$;", 1], ["select 'set names' as a;", 1],
    ["set/* c */names 'BIG5';", 1], ["select $b$ set local\n names 'GBK' $b$;", 1],
    ["select 'names' as names, 1 as set_names, 2 as offset_names;", 0],
    // Batch 128 (C0 N2, A1 N4, Q0 N7 on 127's re-check): a U& or E'' escape spells a name the rules above
    // read as written, and each shape below passed them and, measured, moved psql's encoding or turned
    // standard_conforming_strings off. Each is refused wherever it opens a token, at top level or inside a
    // literal or dollar body (EXECUTE runs a literal's text); a comment, a quoted identifier, a word that
    // ends in e or u before a quote, and a literal 'e' are not.
    ["set U&\"client\\005fencoding\" to 'SJIS';", 1], ["set U&\"client!005fencoding\" UESCAPE '!' to 'SJIS';", 1],
    ["select set_config(U&'client\\005fencoding', 'SJIS', false);", 1], ["select set_config(E'client\\137encoding', 'GBK', false);", 1],
    ["do $$ begin execute 'set U&\"client\\005fencoding\" to ''SJIS'''; end $$;", 1],
    // The sql-lexer batch: the E'' literal is decoded and its text read as SQL, so its `set names` is read too: 1 -> 2.
    ["do $$ begin execute E'set\\x20names ''SJIS'''; end $$;", 2], ["do $$ begin execute E'set client\\x5fencoding to ''BIG5'''; end $$;", 1],
    ["set U&\"standard\\005fconforming\\005fstrings\" to off;", 1], ["do $$ begin execute 'select E''x'''; end $$;", 1],
    ["select 'e' as e, date'2026-10-03' as d, menu&'x' as m;", 0], ["select d.deptype = 'e' from pg_depend d;", 0],
    ["-- U&\"x\" and E'y' in a comment\nselect \"U&'\" from t;", 0],
    // Batch 128's review round (C0 F1): allow_system_table_mods, named anywhere, as client_encoding is; its
    // U& spelling is an escape spelling and is refused as one. C0 X2 and X2b used it to make a schema named
    // pg_c0api and a view in pg_catalog, past every rule that read by schema name.
    ['set allow_system_table_mods = on;', 1], ["select pg_catalog.set_config('allow_system_table_mods', 'on', true);", 1],
    ['set U&"allow\\005fsystem\\005ftable\\005fmods" = on;', 1],
    // The owed-tooling batch (C0 G1 on batch 129's re-check): COPY ... TO/FROM PROGRAM runs a shell command as
    // the server's OS user, the server-side twin of `\!`, and no layer read it. Any spelling with whitespace or
    // comments between the words, at top level or in a literal or dollar body EXECUTE would run; not COPY to a
    // file or to STDOUT, and not the word "program" elsewhere.
    ["copy app.jobs to program 'touch /tmp/x';", 1], ["COPY app.jobs FROM PROGRAM 'cat /etc/passwd';", 1],
    ["copy (select 1) to /* c */ program 'x';", 1], ["copy t from\n-- c\nprogram 'x';", 1],
    ["do $$ begin execute 'copy app.jobs to program ''touch x'''; end $$;", 1], ["do $f$ begin execute $q$copy t from program 'x'$q$; end $f$;", 1],
    ['copy app.jobs to stdout;', 0], ["select 'the program to run' as note;", 0],
    // The owed-tooling batch's review round (C0-OT-2, Q0-OT-3): COPY TO or FROM a server file wrote a file on the
    // host with every layer green, and G1's remedy named the server-file functions too. Each spelling refused;
    // STDIN and STDOUT, the word "copy" in prose, and a function NAMED after FUNCTION (not called) admitted.
    ["copy app.jobs from '/tmp/x';", 1], ["copy (select 'q0c') to '/tmp/x';", 1], ["COPY \"app\".\"jobs\" (id, kind) TO '/tmp/x';", 1],
    ["copy(select (1)) to /* c */ '/tmp/x';", 1], ["copy binary t from '/tmp/x';", 1], ["do $$ begin execute 'copy (select 1) to ''/tmp/x'''; end $$;", 1],
    ["select pg_read_file('/etc/hosts');", 1], ["select pg_catalog.\"pg_read_file\"('/etc/hosts');", 1], ["select lo_export(1, '/tmp/x');", 1],
    ["select lo_import('/tmp/x');", 1], ["select count(*) from pg_ls_dir /* c */ ('.');", 1], ["select pg_stat_file('postgresql.conf');", 1],
    ['copy app.jobs from stdin;', 0], ["select 'a nullable copy of the item''s page could not be held equal to ' || 'x';", 0],
    ['grant execute on function pg_catalog.pg_ls_dir(text) to authenticated;', 0], ['alter function pg_catalog.pg_read_file(text) rename to probe_x;', 0]]) {
    assert.equal(psqlLex(sql).metaCommands.length, n, `${JSON.stringify(sql)}: ${n} meta-command(s)`);
  }
  const { metaCommandFindings } = await import('../../scripts/db/run.mjs');
  assert.match(metaCommandFindings([{ name: '999_x.sql', sql: 'select 1; \\! touch f' }]).join(''), /999_x\.sql line 1: a psql meta-command/,
    'migrate-clean refuses it live, before the first script is applied');
  assert.deepEqual(metaCommandFindings([{ name: '999_x.sql', sql: "select '\\!';" }]), []);
  assert.match(metaCommandFindings([{ name: '999_x.sql', sql: "select 1;\ncopy app.jobs to program 'touch f';" }]).join(''), /999_x\.sql line 2: [^\n]*COPY \.\.\. TO\/FROM PROGRAM/,
    'and a COPY ... TO PROGRAM in a migration, before the first script is applied (C0 G1 on 129)');
  assert.match(metaCommandFindings([{ name: '999_x.sql', sql: "select 1;\ncopy (select 'x') to '/tmp/x';\nselect pg_read_file('/etc/hosts');" }]).join('\n'),
    /999_x\.sql line 2: [^\n]*COPY \.\.\. TO\/FROM a server file[\s\S]*999_x\.sql line 3: [^\n]*a server-file function call/,
    'and a COPY to a server file and a server-file function call, each by line (C0-OT-2, Q0-OT-3)');
  // Since batch 129 the system object fingerprint is scanned with them and taken first (C0 G1, Q0 F1 on 128's
  // re-check), then the loop.
  assert.match(runner, /const meta = metaCommandFindings\(\[\{ name: 'the system object fingerprint', sql: SYSTEM_FINGERPRINT_SNAPSHOT_SQL \}, \.\.\.steps\]\);\n\s*if \(meta\.length\) \{[^\n]*return 1; \}\n(?:\s*\/\/[^\n]*\n)*\s*const \{ query, feed: readRows \} = await import\('\.\/psql-driver\.mjs'\);\n\s*const taken = await script\(SYSTEM_FINGERPRINT_SNAPSHOT_SQL\);\n[\s\S]*?\n\s*for \(const \{ name, sql \} of steps\) \{/,
    'and the scan runs before the fingerprint and the loop that applies them');
});

// ONE SQL LEXER FOR EVERY STATIC READER (the sql-lexer batch; the Owner's `ลุยต่อเลย เอาตามแนะนำ`, 2026-10-04, accepting
// A0's recommendation over a parser RFC). scripts/db/sql-lexer.mjs follows PostgreSQL's lexical rules and psql's two
// additions, and every static reader reads through it: psqlLex and its refusals, the COPY and server-file rules, the
// do-block counter and allowlist, the comment and literal strippers, the audit tripwires and the view scans. This test
// holds (1) the golden corpus: each spelling the review rounds measured, tokenized as PostgreSQL does or refused;
// (2) fail closed: a text the lexer cannot classify is refused, never read past; (3) the differential: for every
// script the repository feeds psql, the lexer's statement split is the split psql SENT, measured on PostgreSQL 17.11
// (log_statement = all, one entry per query psql sent) and recorded with each source's sha256; and (4) the readers
// built on it. What no lexer decides -- what a statement means, and text computed at run time -- stays held by the
// live catalog probes (blocker 186's sql-lexer sentence).
test('one SQL lexer reads every fed source as PostgreSQL and psql do: the golden corpus, the fail-closed refusals and the measured statement split', async () => {
  const L = await import('../../scripts/db/sql-lexer.mjs');
  const { psqlLex, SERVER_FILE_FUNCTIONS, APPROVED_EXTENSIONS } = await import('../../scripts/db/psql-driver.mjs');
  const sig = (sql, options) => L.lexSql(sql, options).tokens.filter((t) => !L.isTrivia(t)).map((t) => [t.kind, t.value ?? t.text]);
  // (1) Tokenized as PostgreSQL does. Every token's text concatenates back to the input.
  for (const [sql, want, options] of [
    // A quote inside a dollar body, `--` inside a literal, `/*` inside a dollar body (C0-OTR-1, A1-RC-3, A1-RC-I1).
    ["select $q$'$q$, 'a--', $q$/*$q$", [['ident', 'select'], ['dollar', "'"], ['punct', ','], ['string', 'a--'], ['punct', ','], ['dollar', '/*']]],
    // A `--` comment ends at a bare CR as well as at LF (scan.l: non_newline is [^\n\r]), so psql reads the backslash after it.
    ['select 1 -- c\r\\! touch f\n', [['ident', 'select'], ['number', '1'], ['meta', '\\! touch f']], { psql: true }],
    ['select 1 -- c\r\n', [['ident', 'select'], ['number', '1']]],
    // Nested block comments; a quoted identifier with a doubled quote; case folding.
    ['/* a /* b */ c */ SELECT "x""Y" FROM T', [['ident', 'select'], ['qident', 'x"Y'], ['ident', 'from'], ['ident', 't']]],
    // Dollar quotes: a different tag inside is body text; a `$` after an identifier character continues the identifier.
    ['select $a$ $b$ x $b$ $a$, a$b$c', [['ident', 'select'], ['dollar', ' $b$ x $b$ '], ['punct', ','], ['ident', 'a$b$c']]],
    ['select $_1$x$_1$, $1', [['ident', 'select'], ['dollar', 'x'], ['punct', ','], ['param', '$1']]],
    // String continuation across a newline (comments allowed after it), and in the E'' state the first segment opened.
    ["select 'a'\n  -- c\n'b', E'x'\n'\\''", [['ident', 'select'], ['string', 'ab'], ['punct', ','], ['estring', "x'"]]],
    ["select 'a' 'b'", [['ident', 'select'], ['string', 'a'], ['string', 'b']]],
    // E'', U&'' with UESCAPE, U&"" decoded; B'', X'', N''; `ex'` is an identifier then a plain literal.
    ["select E'\\x20\\101\\u0042', U&'d!0061t!+000061' UESCAPE '!', U&\"client\\005fencoding\"", [['ident', 'select'], ['estring', ' AB'], ['punct', ','], ['ustring', 'data'], ['punct', ','], ['uident', 'client_encoding']]],
    ["select B'101', X'1F', N'n', ex'y'", [['ident', 'select'], ['bstring', '101'], ['punct', ','], ['xstring', '1F'], ['punct', ','], ['string', 'n'], ['punct', ','], ['ident', 'ex'], ['string', 'y']]],
    // Operators cut before an embedded comment; casts; the trailing +/- rule.
    ['select 1+/*c*/2, a::text, 3*-4', [['ident', 'select'], ['number', '1'], ['op', '+'], ['number', '2'], ['punct', ','], ['ident', 'a'], ['punct', '::'], ['ident', 'text'], ['punct', ','], ['number', '3'], ['op', '*'], ['op', '-'], ['number', '4']]],
    ['select 1.5e3, .5, 1_000, 0x1F', [['ident', 'select'], ['number', '1.5e3'], ['punct', ','], ['number', '.5'], ['punct', ','], ['number', '1_000'], ['punct', ','], ['number', '0x1F']]],
  ]) {
    assert.deepEqual(sig(sql, options), want, `tokenized as PostgreSQL does: ${JSON.stringify(sql)}`);
    const { tokens, refusals } = L.lexSql(sql, options);
    assert.deepEqual(refusals, [], `and classified whole: ${JSON.stringify(sql)}`);
    assert.equal(tokens.map((t) => t.text).join(''), sql, 'the tokens are the text');
  }
  // Statements split where psql splits them: at `;` outside parentheses, whatever a literal, body or name holds.
  assert.deepEqual(L.splitStatements(L.lexSql("select 1;; select (2;3); select ';', $$;$$, \"a;b\" -- ;\n;").tokens).map((s) => s.head),
    ['select 1', 'select (2;3)', "select ';', $$;$$, \"a;b\""]);
  // (2) Fail closed: what the lexer cannot classify is a refusal, never a token read past.
  for (const [sql, reason, options] of [
    ["select 'abc", /unterminated quoted string/], ['select $x$ abc', /unterminated dollar-quoted/], ['/* open /* nested */', /unterminated \/\* comment/],
    ['select "x', /unterminated quoted identifier/], ['select ""', /zero-length/], ["select 1.e'\\''", /trailing junk/], ['select 1x', /trailing junk/],
    ['select {}', /no SQL token holds/], ['select \u0001', /no SQL token holds/], ['select $ 1', /opens no dollar quote/],
    ["select E'\\u12'", /malformed escape/], ["select U&'\\00zz'", /malformed escape/], ["select X'zz'", /hex digits/],
    ['select x[1:n]', /psql variable/, { psql: true }], ["select :'v'", /psql variable/, { psql: true }],
  ]) {
    assert.match(L.lexSql(sql, options).refusals.map((r) => r.reason).join('; '), reason, `refused: ${JSON.stringify(sql)}`);
    assert.ok(psqlLex(sql).metaCommands.length > 0, `and psqlLex refuses it: ${JSON.stringify(sql)}`);
  }
  assert.deepEqual(L.lexSql('select x[1:n], a::int', {}).refusals, [], 'outside psql a slice is a slice');
  // The spellings the review rounds measured, through psqlLex: each refused, by what it is.
  const refusedBy = (sql) => psqlLex(sql).metaCommands.map((m) => m.text).join(' | ');
  for (const [sql, why] of [
    ['copy app.jobs to $p$/tmp/x$p$;', /COPY \.\.\. TO\/FROM a server file/], ["copy (select ';') to '/tmp/x';", /COPY \.\.\. TO\/FROM a server file/],
    ["COPY \"app\".\"jobs\" (id) TO U&'/tmp/x';", /COPY \.\.\. TO\/FROM a server file/], ['copy t from $$/etc/passwd$$;', /server file/], ['copy t to x;', /server file/],
    ["copy t to program 'id';", /PROGRAM/], ["do $$ begin execute $q$copy t from program 'id'$q$; end $$;", /PROGRAM/], ['copy;', /COPY statement whose target this lexer cannot read/],
    ["select be_lo_export(1, '/tmp/x');", /server-file function call/], ["select pg_read_file_all('/etc/hosts');", /server-file function call/],
    ["select \"pg_read_file\" /* c */ ('/etc/hosts');", /server-file function call/],
    ["create function public.f(text) returns text language internal strict as 'pg_read_file_all';", /LANGUAGE internal/],
    ["create function public.g(oid, text) returns integer as 'be_lo_export' language 'internal';", /LANGUAGE internal/],
    ["create function public.h() returns int as '$libdir/x', 'y' language C;", /LANGUAGE c/],
    ["do $$ begin execute 'create function public.f(text) returns text language internal as ''pg_read_file_all'''; end $$;", /LANGUAGE internal/],
    ['set U&"client\\005fencoding" to \'SJIS\';', /U& escape spelling/], ["select E'\\x20';", /E'' escape spelling/],
    ["do $$ begin set names 'SJIS'; end $$;", /set names/], ["do $$ begin execute 'set local names ''SJIS'''; end $$;", /set names/],
    ['select 1; -- c\r\\! touch f\n', /\\! touch f/], ['set standard_conforming_strings = off;', /standard_conforming_strings/],
    ['create extension file_fdw;', /CREATE EXTENSION file_fdw/], ['CREATE EXTENSION IF NOT EXISTS "dblink";', /CREATE EXTENSION dblink/],
    ["create server s foreign data wrapper file_fdw;", /foreign table, foreign data wrapper, server/],
    ["create foreign table t (x text) server s options (program 'id');", /foreign table, foreign data wrapper, server/],
    ['import foreign schema x from server s into y;', /foreign table/], ['create user mapping for public server s;', /user mapping/],
    ['create function f() returns int language sql begin atomic select 1; end;', /BEGIN ATOMIC/],
  ]) {
    assert.match(refusedBy(sql), why, `refused: ${JSON.stringify(sql)}`);
  }
  for (const sql of ['copy app.jobs to stdout;', 'copy t (a, b) from stdin with (format csv);', 'create extension if not exists pgcrypto with schema extensions;',
    'alter table t add constraint f foreign key (a) references u (a);', "select 'view(s), materialized view(s) or foreign table(s)' as m;",
    'grant execute on function pg_catalog.pg_read_file(text) to authenticated;', 'select x.copy from t as x;', "select 'a copy of the item' as c;",
    "select 'x' as y where z = 'begin atomic';", 'select a::text, b[1:2] from t;', "create function f() returns int language sql return 2;"]) {
    assert.deepEqual(psqlLex(sql).metaCommands, [], `admitted: ${sql}`);
  }
  assert.deepEqual(APPROVED_EXTENSIONS, ['pgcrypto'], 'the one extension the migrations create (000_foundation.sql, prerequisites.sql)');
  for (const name of ['pg_read_file', 'lo_export', 'pg_read_file_all', 'be_lo_export', 'be_lo_import', 'pg_stat_file_1arg']) assert.ok(SERVER_FILE_FUNCTIONS.includes(name), `${name} is read`);
  // EVERY name in the list, called, is refused (Q0-OT2-5: twelve of the seventeen were pinned by nothing), and named
  // after FUNCTION it is not a call.
  assert.equal(SERVER_FILE_FUNCTIONS.length, 33, 'the seventeen by name and the sixteen internal symbols measured on 17.11');
  for (const name of SERVER_FILE_FUNCTIONS) {
    assert.match(refusedBy(`select pg_catalog.${name}('x');`), /server-file function call/, `${name}(...) is refused`);
    assert.deepEqual(psqlLex(`comment on function pg_catalog.${name}(text) is 'x';`).metaCommands.filter((x) => /server-file/.test(x.text)), [], `${name} after FUNCTION is not a call`);
  }
  // The depth the nested reading goes to, and past it, refused.
  let deep = "select 'set names'";
  for (let k = 0; k < L.NESTED_DEPTH; k += 1) deep = `select '${deep.replace(/'/g, "''")}'`;
  assert.match(refusedBy(deep), /nested past the depth/, 'a literal nested past the depth read is refused');
  // (3) The differential, measured on a live cluster and recorded (test-kits/db/sql-lexer-differential.json): every
  // source the repository feeds psql -- prerequisites, migrations, replacements, the CI shim, the helper, the
  // fixtures, every probe and drift in run.mjs, the WS:911 fixture and the EXPLAIN harness -- split by the lexer into
  // exactly the queries psql sent. A source whose text has not changed since is checked again here, by sha256.
  const recorded = JSON.parse(await readFile('test-kits/db/sql-lexer-differential.json', 'utf8'));
  assert.ok(recorded.sources.length >= 200, `the differential covers every fed source (${recorded.sources.length})`);
  assert.deepEqual(recorded.sources.filter((s) => !s.same || s.lexer !== s.psql), [], 'and on every one the lexer split what psql sent');
  const { createHash } = await import('node:crypto');
  const m = await import('../../scripts/db/run.mjs');
  const current = new Map();
  for (const s of recorded.sources) {
    if (s.source.startsWith('db/') || s.source.startsWith('tests/')) current.set(s.source, await readFile(s.source, 'utf8').catch(() => null));
  }
  for (const p of m.CATALOG_RULE_PROBES) { current.set(`probe ${p.label}`, p.sql); (p.selfTests ?? []).forEach((t, i) => current.set(`drift ${p.label} #${i + 1}`, t.drift)); }
  let rechecked = 0;
  for (const s of recorded.sources) {
    const sql = current.get(s.source);
    if (typeof sql !== 'string' || createHash('sha256').update(sql).digest('hex') !== s.sha256) continue;
    rechecked += 1;
    assert.equal(psqlLex(sql).statements.length, s.psql, `${s.source}: the lexer splits it into the ${s.psql} queries psql sent`);
  }
  const migrations = recorded.sources.filter((s) => s.source.startsWith('db/foundation/migrations/'));
  assert.ok(migrations.length >= 40 && migrations.every((s) => createHash('sha256').update(current.get(s.source) ?? '').digest('hex') === s.sha256),
    'every recorded migration is unchanged (an integrated migration is never rewritten), so each is re-checked');
  assert.ok(rechecked >= 150, `re-checked here: ${rechecked}`);
  // (4) The readers built on it.
  assert.equal("select 'a--' x -- c\n".replace(L.SQL_LINE_COMMENTS, ''), "select 'a--' x \n", 'a `--` inside a literal is not a comment');
  assert.equal('select $f$ begin -- c\n end $f$ /* k */'.replace(L.SQL_LINE_COMMENTS, ''), 'select $f$ begin \n end $f$ /* k */', 'a body is code; a block comment is kept by the line-comment reader');
  assert.equal("select $q$'$q$, 'b' -- '\n".replace(L.SQL_LITERALS, "''"), "select $q$'$q$, '' -- '\n", 'a quote inside a dollar body or a comment opens no literal');
  assert.throws(() => "select 'open".replace(L.SQL_LINE_COMMENTS, ''), /cannot classify/, 'a reader over a text that does not lex fails closed');
  assert.deepEqual(L.canonicalStatements("do $$ begin execute 'grant insert on \"app\".audit_logs to anon'; end $$;").map((s) => s.text),
    ["do ''", "begin execute ''", 'end', 'grant insert on app . audit_logs to anon'], 'every level, canonical');
  assert.equal(m.doBlockOpeners('x.sql', "do $$ begin end $$;\n-- do $$\nselect 'do $$';\nDO LANGUAGE plpgsql $b$ begin end $b$;\ndo\n'begin end';"), 3, 'the do-block counter reads DO tokens only');
});

// updated_at IS THE DATABASE'S TO WRITE, ON EVERY TABLE THAT HANDS THE COLUMN TO A CLIENT.
//
// Three reviews found the same shape in three batches (C0-080 M4, C0-081 M3, C0-090 M5): a table
// with `updated_at … default now()`, the column inside the UPDATE grant to `authenticated`, and no
// trigger -- so the column held whatever the last client wrote. Batch 093 attaches
// private.set_updated_at to the five tables and asserts, against the live catalog, that no table in
// `app` admits a non-owner UPDATE on updated_at without a BEFORE UPDATE trigger calling it. This is
// the static twin: it reads every migration's text, pairs each `grant update (… updated_at …) on
// app.<table> to <role>` with a `create trigger set_updated_at before update on app.<table>` somewhere
// in the set, and fails on the pair that has no trigger -- before a database is involved, and by
// name. The apply-time rule is the one that survives a later batch dropping the trigger; this one
// is the one that fails on the author's machine.
// A FORWARD FIX WHOSE ONLY GUARD IS ITS OWN APPLY-TIME BLOCK IS GUARDED BY NOTHING A REVIEWER CAN
// SEE FAIL LOCALLY: Q0-111 F1 emptied 111_social_fk.sql and the static suite stayed green. The
// closures (082/083/092/101) are held by SERVICE_PATH_CLOSURES and 093 by the rule below; 094 and
// 111 were read by nothing. This pins each file's statements and the messages its block raises,
// so deleting the block -- or the statement it guards -- fails here, by name, before a database.
test('the forward fixes 094 and 111 keep their statements and their apply-time blocks', async () => {
  const requestedBy = (await readFile('db/foundation/migrations/094_approval_requested_by.sql', 'utf8')).replace(SQL_LINE_COMMENTS, '');
  assert.match(requestedBy, /create policy approval_requests_requester_is_caller on app\.approval_requests\s+as restrictive\s+for insert to authenticated\s+with check \(requested_by = \(select auth\.uid\(\)\)\);/,
    '094: one RESTRICTIVE INSERT policy, requested_by = auth.uid(), TO authenticated');
  assert.match(requestedBy, /did not write approval_requests_requester_is_caller as a RESTRICTIVE INSERT policy/, '094 asserts its own policy at apply time');
  assert.match(requestedBy, /requested_by became updatable by authenticated/, '094 asserts the column stays out of the UPDATE grant');
  const socialKey = (await readFile('db/foundation/migrations/111_social_fk.sql', 'utf8')).replace(SQL_LINE_COMMENTS, '');
  assert.match(socialKey, /alter table app\.social_accounts\s+add constraint social_accounts_scope_key unique \(workspace_id, id\);/, '111: the scope key on social_accounts');
  assert.match(socialKey, /create index if not exists content_targets_social_scope_idx\s+on app\.content_targets \(workspace_id, social_account_id\);/, '111: the supporting index');
  assert.match(socialKey, /add constraint content_targets_social_scope_fk\s+foreign key \(workspace_id, social_account_id\)\s+references app\.social_accounts \(workspace_id, id\)\s+not valid;/, '111: the key, NOT VALID first');
  assert.match(socialKey, /validate constraint content_targets_social_scope_fk;/, '111: then validated');
  for (const message of ['did not leave content_targets_social_scope_fk as a validated', 'a second foreign key involves social_account_id', 'content_targets_social_scope_idx does not lead with']) {
    assert.match(socialKey, new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `111 asserts at apply time: ${message}`);
  }
});

// BATCH 105 (blocker 189; the Owner's remedy (a), 2026-09-27): seven RESTRICTIVE UPDATE policies binding
// updated_by to the caller where the column was client-updatable and bound nowhere. Pinned here so an
// emptied file fails before a database, as Q0-111 F1 showed a forward fix otherwise can.
test('the forward fix 105 keeps its seven UPDATE closures and its apply-time block', async () => {
  const code = (await readFile('db/foundation/migrations/105_updated_by_on_update_is_caller.sql', 'utf8')).replace(SQL_LINE_COMMENTS, '');
  // 105's own seven; batch 123 added the other ten to the probe's list (its own test is below).
  const SEVEN = ['business_profiles', 'industry_assignments', 'knowledge_items', 'page_context_profiles',
    'workspace_invitations', 'workspace_settings', 'workspaces'];
  for (const t of SEVEN) {
    assert.match(code, new RegExp(`create policy ${t}_updated_by_on_update_is_caller on app\\.${t}\\s+as restrictive for update to authenticated\\s+with check \\(updated_by = \\(select auth\\.uid\\(\\)\\)\\);`),
      `105: ${t} carries a RESTRICTIVE UPDATE policy binding updated_by to the caller, with no USING`);
  }
  assert.equal([...code.matchAll(/create policy/g)].length, 7, '105 creates exactly seven policies');
  assert.match(code, /of its seven updated_by UPDATE closures in their required shape/, '105 asserts its seven at apply time');
  assert.match(code, /updated_by is client-updatable and no UPDATE policy for authenticated even names updated_by = auth\.uid\(\), or row level security is not enabled and forced/, '105 asserts the general rule at apply time');
  // The rule's SQL, not only its message (C0's review of 105, F7): every client-updatable updated_by, every UPDATE or ALL policy.
  assert.match(code, /has_column_privilege\('authenticated', c\.oid, a\.attnum, 'UPDATE'\)/);
  assert.match(code, /pol\.polcmd in \('w', '\*'\)/);
  assert.match(code, /c\.relkind in \('r', 'p'\)/, 'partitioned tables too (Q0 F2)');
  assert.match(code, /not \(c\.relrowsecurity and c\.relforcerowsecurity\)/, 'a policy binds nothing with RLS off (Q0 F2)');
});

// BATCH 123 (the Owner's one-page summary items 2 and 3, 2026-09-28): batch 105's restrictive UPDATE closure
// on the ten remaining updated_by tables, the general rule made EXACT, and decided_by as a pair with
// decided_at. Pinned here so an emptied file fails before a database.
test('the forward fix 123 keeps its ten UPDATE closures, its decider closure and pair, and its exact general rule', async () => {
  const code = (await readFile('db/foundation/migrations/123_attribution_closures_everywhere.sql', 'utf8')).replace(SQL_LINE_COMMENTS, '');
  const { UPDATED_BY_ON_UPDATE_CLOSURES } = await import('../../scripts/db/run.mjs');
  const TEN = ['approval_policies', 'approval_requests', 'asset_rights', 'assets', 'content_ideas', 'content_items',
    'content_targets', 'publish_intents', 'research_runs', 'research_suggestions'];
  assert.equal(UPDATED_BY_ON_UPDATE_CLOSURES.length, 19, "105's seven, 123's ten and 091's two, carried from birth");
  for (const t of TEN) {
    assert.ok(UPDATED_BY_ON_UPDATE_CLOSURES.includes(t), `the probe pins ${t}`);
    assert.match(code, new RegExp(`create policy ${t}_updated_by_on_update_is_caller on app\\.${t}\\s+as restrictive for update to authenticated\\s+with check \\(updated_by = \\(select auth\\.uid\\(\\)\\)\\);`),
      `123: ${t} carries 105's restrictive UPDATE closure`);
  }
  assert.match(code, /create policy approval_requests_decided_by_on_update_is_caller on app\.approval_requests\s+as restrictive for update to authenticated\s+with check \(decided_by is null or decided_by = \(select auth\.uid\(\)\)\);/,
    '123: who decided is the caller, whichever permissive policy admitted the row (Q0 on 123, F2)');
  assert.equal([...code.matchAll(/create policy/g)].length, 11, '123 creates exactly eleven policies: ten updated_by closures and the decider closure');
  assert.match(code, /add constraint approval_requests_decider_is_a_pair\s+check \(\(decided_at is null\) = \(decided_by is null\)\);/, '123: decided_at and decided_by are a pair');
  // The general rule requires the CLOSURE itself, by name and exact text -- not text presence (105's weakness).
  assert.match(code, /pol\.polname = c\.relname \|\| '_updated_by_on_update_is_caller'/);
  assert.match(code, /pg_catalog\.pg_get_expr\(pol\.polwithcheck, pol\.polrelid\) = '\(updated_by = \( SELECT auth\.uid\(\) AS uid\)\)'/);
  assert.match(code, /updated_by is client-updatable without batch 105''s exact restrictive UPDATE closure/);
  assert.match(code, /CHECK \(\(\(decided_at IS NULL\) = \(decided_by IS NULL\)\)\)/, '123 asserts the pair by definition text');
  assert.match(code, /con\.conname = 'approval_requests_decision_has_a_decider' and con\.convalidated/, "123 asserts 090's equivalence beside the pair (Q0 on 123, F1)");
  assert.match(code, /batch 123''s approval_requests_decided_by_on_update_is_caller is missing or not in its required shape/, '123 asserts its decider closure at apply time');
  const { PINNED_CHECKS, DECIDER_CLOSURES } = await import('../../scripts/db/run.mjs');
  assert.deepEqual(DECIDER_CLOSURES, ['approval_requests'], 'the probe pins the decider closure');
  assert.ok(code.includes(PINNED_CHECKS['approval_requests.approval_requests_decider_is_a_pair']), '123 and the probe pin the pair in one text');
  assert.ok(code.includes(PINNED_CHECKS['approval_requests.approval_requests_decision_has_a_decider'].replace(/'/g, "''")), "123 and the probe pin 090's equivalence in one text");
});

// BATCH 127 (blocker 186's created_by class; A1 F5 on batch 123, A1 F3 on batch 091): created_by at INSERT
// bound by a restrictive closure on every table that hands it to a client. Pinned here so an emptied
// file fails before a database.
test('the forward fix 127 keeps its nineteen created_by INSERT closures and its exact general rule', async () => {
  const code = (await readFile('db/foundation/migrations/127_created_by_on_insert_is_caller.sql', 'utf8')).replace(SQL_LINE_COMMENTS, '');
  const { CREATED_BY_CLOSURES, CREATED_BY_CHECK_TEXT } = await import('../../scripts/db/run.mjs');
  for (const t of CREATED_BY_CLOSURES) {
    assert.match(code, new RegExp(`create policy ${t}_created_by_is_caller on app\\.${t}\\s+as restrictive for insert to authenticated\\s+with check \\(created_by = \\(select auth\\.uid\\(\\)\\)\\);`),
      `127: ${t} carries a RESTRICTIVE INSERT closure binding created_by to the caller`);
  }
  assert.equal([...code.matchAll(/create policy/g)].length, CREATED_BY_CLOSURES.length, '127 creates exactly one policy per pinned table, and the probe pins every table it closes');
  // The general rule requires the closure itself, by name and exact text, from birth (123's lesson), with
  // no fixed count (091's lesson), over every client-insertable created_by.
  assert.match(code, /pol\.polname = c\.relname \|\| '_created_by_is_caller'/);
  assert.match(code, /not pol\.polpermissive and pol\.polcmd = 'a' and pol\.polqual is null/);
  assert.ok(code.includes(`pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) = '${CREATED_BY_CHECK_TEXT}'`), '127 and the probe pin one text');
  assert.match(code, /has_column_privilege\('authenticated', c\.oid, a\.attnum, 'INSERT'\)/);
  assert.match(code, /c\.relkind in \('r', 'p'\)/);
  assert.match(code, /not \(c\.relrowsecurity and c\.relforcerowsecurity\)/);
  assert.match(code, /created_by is client-insertable without batch 127''s exact restrictive INSERT closure/);
  assert.doesNotMatch(code, /count_of/, 'no fixed count: the probe\'s pinned list keeps it');
});

// BATCH 125 (A1 N1 and C0 F2 on batch 123's corrections): a settled approval request cannot be updated by
// a client, whichever permissive policy would admit it. Pinned here so an emptied file fails before a database.
test('the forward fix 125 keeps its settled-row closure, the database-owned decision time, its apply-time block and its pins', async () => {
  const code = (await readFile('db/foundation/migrations/125_approval_settled_is_immutable.sql', 'utf8')).replace(SQL_LINE_COMMENTS, '');
  assert.match(code, /create policy approval_requests_settled_is_immutable on app\.approval_requests\s+as restrictive for update to authenticated\s+using \(status = 'pending'\)\s+with check \(true\);/,
    "125: restrictive, UPDATE, TO authenticated, USING status = 'pending', WITH CHECK true (USING alone would refuse every transition)");
  assert.equal([...code.matchAll(/create policy/g)].length, 1, '125 creates exactly one policy');
  assert.match(code, /batch 125''s approval_requests_settled_is_immutable is missing or not in its required shape/, '125 asserts it at apply time');
  const { PINNED_POLICIES } = await import('../../scripts/db/run.mjs');
  assert.deepEqual(PINNED_POLICIES['approval_requests.approval_requests_settled_is_immutable'], { cmd: 'w', using: "(status = 'pending'::text)", check: 'true' },
    'the pinned policy probe pins it by the same deparse');
  assert.ok(code.includes("(status = ''pending''::text)"), '125 and the probe pin one text');
  // decided_at is the database's (the Owner's decision of 2026-09-28; A1 F4, Q0 F7 on batch 123).
  assert.match(code, /create function private\.set_decided_at\(\)\s+returns trigger\s+language plpgsql\s+security invoker\s+set search_path = ''/,
    '125: an invoker trigger function with an empty search_path');
  assert.match(code, /if old\.decided_by is null and new\.decided_by is not null then\s+new\.decided_at := pg_catalog\.now\(\);/, 'a decision is timed by the database');
  assert.match(code, /elsif old\.decided_by is not null\s+and \(new\.decided_by is distinct from old\.decided_by or new\.decided_at is distinct from old\.decided_at\) then\s+raise exception/,
    'and a recorded decision keeps its decider and time, for every writer');
  assert.match(code, /revoke all on function private\.set_decided_at\(\) from public;/);
  assert.match(code, /create trigger set_decided_at before update on app\.approval_requests\s+for each row execute function private\.set_decided_at\(\);/);
  assert.match(code, /md5\(p\.prosrc\) = '[0-9a-f]{32}'/, "125's block pins the function body, so a later rewrite fails the post-migrate pass");
  const body = code.match(/as \$\$([\s\S]*?)\$\$;/)[1];
  const { createHash } = await import('node:crypto');
  assert.ok(code.includes(`md5(p.prosrc) = '${createHash('md5').update(body).digest('hex')}'`), 'and the pinned digest is the body written above it');
  // BATCH 126, the forward fix to 125 (blocker 186 items 13, 15 and 17), held in the same test so the
  // suite's names, and so its digest, do not move.
  const next = (await readFile('db/foundation/migrations/126_approval_decision_frozen_for_every_writer.sql', 'utf8')).replace(SQL_LINE_COMMENTS, '');
  assert.match(next, /create or replace function private\.set_decided_at\(\)\s+returns trigger\s+language plpgsql\s+security invoker\s+set search_path = ''/,
    '126 keeps the invoker function, its name and its empty search_path');
  assert.match(next, /if tg_op = 'INSERT' then\s+if new\.decided_by is not null then\s+new\.decided_at := pg_catalog\.statement_timestamp\(\);/,
    'an INSERT that names a decider is timed by the database (item 15)');
  assert.match(next, /elsif old\.status <> 'pending'\s+and \(new\.status is distinct from old\.status\s+or new\.decided_by is distinct from old\.decided_by\s+or new\.decided_at is distinct from old\.decided_at\) then\s+raise exception 'a settled approval request keeps its status, decided_by and decided_at'/,
    'a settled request keeps its outcome for every writer that fires triggers (item 15)');
  assert.match(next, /elsif old\.status <> 'pending'\s+and \(pg_catalog\.to_jsonb\(new\) - array\['updated_at', 'updated_by'\]\)\s+is distinct from \(pg_catalog\.to_jsonb\(old\) - array\['updated_at', 'updated_by'\]\) then\s+raise exception 'a settled approval request keeps what it decided: every column but updated_at and updated_by'/,
    'and what it decided: every column but updated_at and updated_by, read as the row so a later column is frozen too (Q0 F2 on 126)');
  assert.match(next, /elsif old\.decided_by is null and new\.decided_by is not null then\s+new\.decided_at := pg_catalog\.statement_timestamp\(\);/,
    "the statement's time, not the transaction's (item 17)");
  assert.doesNotMatch(next, /pg_catalog\.now\(\)/, 'and now() is gone from the body');
  assert.match(next, /revoke all on function private\.set_decided_at\(\) from public;/);
  assert.match(next, /drop trigger set_decided_at on app\.approval_requests;\s+create trigger set_decided_at before insert or update on app\.approval_requests\s+for each row execute function private\.set_decided_at\(\);/);
  assert.match(next, /add constraint approval_requests_decided_after_created check \(decided_at >= created_at\);/, 'a decision cannot predate its request (item 17)');
  const nextBody = next.match(/as \$\$([\s\S]*?)\$\$;/)[1];
  const nextDigest = createHash('md5').update(nextBody).digest('hex');
  assert.ok(next.includes(`md5(p.prosrc) = '${nextDigest}'`), "126's block pins the body written above it");
  const replacement = await readFile('db/foundation/invariants/125_approval_settled_is_immutable.1.sql', 'utf8');
  assert.ok(replacement.includes(`md5(p.prosrc) = '${nextDigest}'`), "125's replacement pins 126's body");
  assert.ok(replacement.includes('BEFORE INSERT OR UPDATE ON app.approval_requests'), "and 126's trigger definition");
  const { PINNED_TRIGGER_FUNCTIONS, PINNED_TABLE_TRIGGERS, PINNED_CHECKS: CHECKS } = await import('../../scripts/db/run.mjs');
  assert.deepEqual(PINNED_TRIGGER_FUNCTIONS.find(([f]) => f === 'private.set_decided_at()'), ['private.set_decided_at()', 'invoker', nextDigest, 'migration owner'],
    'and the pinned trigger probe pins the same body, a second pin in another file (item 13), and its owner (Q0 F8 on 126)');
  assert.ok(PINNED_TABLE_TRIGGERS['app.approval_requests'].includes('CREATE TRIGGER set_decided_at BEFORE INSERT OR UPDATE ON app.approval_requests FOR EACH ROW EXECUTE FUNCTION private.set_decided_at()'));
  assert.equal(CHECKS['approval_requests.approval_requests_decided_after_created'], 'CHECK ((decided_at >= created_at))');
  // The non-client writer is shown refused on every rls-smoke run, by the loader itself (item 15).
  const fixture = await readFile('tests/db/identity/fixtures/090-approval-fixture.sql', 'utf8');
  assert.match(fixture, /the loader overturned a settled approval request/);
  assert.match(fixture, /the loader changed what a settled approval request decided/);
  assert.match(fixture, /the loader turned a cancelled approval request into a decision/);
  assert.match(fixture, /kept the decision time the loader sent/);
});

test('every table that grants updated_at to a role also has the database maintain it', async () => {
  const dir = 'db/foundation/migrations';
  const names = (await readdir(dir)).filter((n) => n.endsWith('.sql')).sort();
  const texts = await Promise.all(names.map(async (n) => [n, (await readFile(`${dir}/${n}`, 'utf8')).replace(SQL_LINE_COMMENTS, '')]));
  const triggered = new Set();
  for (const [, code] of texts) {
    for (const m of code.matchAll(/create trigger set_updated_at before update on (app\.\w+)/g)) triggered.add(m[1]);
  }
  assert.ok(triggered.size >= 30, `${triggered.size} tables carry the trigger; the set is larger than that, so the parse missed it`);
  const granted = [];
  for (const [name, code] of texts) {
    for (const m of code.matchAll(/grant update \(([^)]*)\)\s*\n?\s*on (app\.\w+) to (\w+)/g)) {
      if (/\bupdated_at\b/.test(m[1])) granted.push({ name, table: m[2], role: m[3] });
    }
  }
  assert.ok(granted.length >= 12, `${granted.length} grants name updated_at; there are more, so the parse missed some`);
  const orphans = granted.filter((g) => !triggered.has(g.table)).map((g) => `${g.table} (${g.role}, ${g.name})`);
  assert.deepEqual(orphans, [],
    `updated_at is granted and no migration attaches private.set_updated_at:\n  ${orphans.join('\n  ')}\n`
    + 'Attach the trigger in the batch that grants the column, as every batch since 010 does, or keep updated_at '
    + 'out of the grant as 070 does for research_suggestions. Batch 093 closed the five that existed on 2026-09-15.');
  // AND THE FIVE 093 CLOSED, PINNED, so that the rule above cannot be satisfied by a grant quietly
  // losing the column instead of gaining the trigger.
  for (const table of ['app.content_ideas', 'app.content_items', 'app.content_targets', 'app.approval_policies', 'app.approval_requests']) {
    assert.ok(triggered.has(table), `${table}: the trigger batch 093 attached is gone`);
  }
  const closer = texts.find(([n]) => n === '093_updated_at_triggers.sql');
  assert.ok(closer, 'batch 093 is in the migration set');
  assert.match(closer[1], /updated_at is client-writable and no BEFORE UPDATE trigger maintains it/,
    "and it asserts the general rule at apply time, against the live catalog, in the words a failure prints");
});

// THE FIXTURES AND THE AUTH-CONTEXT HELPER ARE FED TO psql ON STDIN TOO (driver `feed`), so the
// meta-command rule that holds migrations holds them: a line beginning with a backslash is psql's,
// and `\!` runs a shell command. The case path keeps --command and is not held to this.
test('no fixture or test helper carries a psql meta-command, because the loader feeds them on stdin', async () => {
  const driver = await readFile('scripts/db/psql-driver.mjs', 'utf8');
  assert.match(driver, /export async function feed\(sql, options = \{\}\) \{\n  return query\(sql, \{ \.\.\.options, viaStdin: true \}\);/,
    'feed() is the stdin path a fixture takes; a loader that went back to --command would bring the 128 KiB ceiling back for fixtures');
  const smoke = await readFile('scripts/db/rls-smoke.mjs', 'utf8');
  assert.match(smoke, /const installed = await feed\(helpers\);/, 'the auth-context helper installs through feed()');
  assert.match(smoke, /const loaded = await feed\(await readFile\(path, 'utf8'\)\);/, 'every fixture loads through feed()');
  const dir = 'tests/db/identity/fixtures';
  const files = (await readdir(dir)).filter((n) => n.endsWith('.sql')).map((n) => `${dir}/${n}`);
  files.push('db/foundation/test-helpers/auth-context.sql');
  assert.ok(files.length >= 10, 'the fixtures were found');
  // Anywhere psql would execute one (blocker 186 item 12), and the smoke target refuses it live too.
  const { psqlLex } = await import('../../scripts/db/psql-driver.mjs');
  for (const file of files) {
    const meta = psqlLex(await readFile(file, 'utf8')).metaCommands;
    assert.deepEqual(meta, [], `${file} line ${meta[0]?.line} carries a backslash outside any literal, body or comment: on stdin psql executes that as a meta-command`);
  }
  assert.match(smoke, /psqlLex\(sql\)\.metaCommands[\s\S]*return 1;\n  \}\n  const installed = await feed\(helpers\);/,
    'rls-smoke scans the helper and every fixture before it feeds the first');
});

// EVERY FOREIGN KEY HAS A SUPPORTING INDEX, AND THE RULE IS LIVE (batch 104, C0-111 M1). run.mjs said
// so for months while no target read pg_index. Now migrate-clean applies FK_SUPPORT_PROBE_SQL after
// every set, and the four exemptions are named twice -- in run.mjs with a reason, and in 104's own
// apply-time block -- and this rule holds the two lists equal so neither can drift.
const FK_SUPPORT_PROBE_SQL_TEXT = (runner) => runner.slice(runner.indexOf('export const FK_SUPPORT_PROBE_SQL'), runner.indexOf('export async function migrateCleanSteps'));
test('every foreign key has a supporting index, asserted live after every migrate-clean, with named and reasoned exemptions', async () => {
  const runner = await readFile('scripts/db/run.mjs', 'utf8');
  // Since batch 125 the probe is the first of CATALOG_RULE_PROBES, run by that executor and self-tested
  // (C0 on 123's corrections, F6); the executor's own test holds that a failing verdict fails the target.
  const { CATALOG_RULE_PROBES } = await import('../../scripts/db/run.mjs');
  assert.equal(CATALOG_RULE_PROBES[0].label, 'fk support probe', 'migrate-clean applies the probe, first among the catalog-rule probes');
  assert.deepEqual(CATALOG_RULE_PROBES[0].selfTests.map((t) => t.raises), ['foreign key(s) with no supporting index and no named exemption', 'exempted foreign key(s) do not exist'],
    'and each of its two rules has its own drift');
  assert.match(FK_SUPPORT_PROBE_SQL_TEXT(runner), /exempted foreign key\(s\) do not exist/, 'and the probe refuses a stale exemption');
  const { FK_SUPPORT_EXEMPTIONS, FK_SUPPORT_PROBE_SQL } = await import('../../scripts/db/run.mjs');
  assert.match(FK_SUPPORT_PROBE_SQL, /pg_catalog\.pg_index/, 'the probe reads pg_index');
  assert.match(FK_SUPPORT_PROBE_SQL, /IS NOT NULL\)'/, 'and accepts a partial index on one of the key\'s own columns IS NOT NULL');
  for (const [key, reason] of Object.entries(FK_SUPPORT_EXEMPTIONS)) {
    assert.ok(reason.length > 40, `exemption ${key} carries a reason`);
    // Keyed schema.table.constraint (blocker 186 item 18; Q0 F6 on batch 125): by name alone, a key on
    // another table named like an exempt one passed.
    assert.match(key, /^[a-z_]+\.[a-z_]+\.[a-z_]+_fk$/, `exemption ${key} is keyed schema.table.constraint`);
    assert.match(FK_SUPPORT_PROBE_SQL, new RegExp(`'${key.replace(/\./g, '\\.')}'`), `the probe exempts ${key}`);
  }
  assert.match(FK_SUPPORT_PROBE_SQL, /not \(fk\.key = any \(exempt\)\)/, 'the exemption is matched on the qualified key, not on the name');
  assert.match(FK_SUPPORT_PROBE_SQL, /format\('%s\.%s\.%s', n\.nspname, cl\.relname, c\.conname\) = e/, 'and so is a stale exemption');
  const migration = await readFile('db/foundation/migrations/104_fk_supporting_indexes.sql', 'utf8');
  const code = migration.replace(SQL_LINE_COMMENTS, '');
  const listed = [...code.matchAll(/'([a-z_]+_fk)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(listed, Object.keys(FK_SUPPORT_EXEMPTIONS).map((k) => k.split('.')[2]).sort(), '104\'s block and run.mjs exempt the same keys');
  assert.equal([...code.matchAll(/create index if not exists/g)].length, 11, '104 creates the eleven indexes it says it does');
});

// THE CATALOG-RULE PROBES (plan and disposition of 2026-09-27; the weak-assertion survey's items 1,
// 2 and 4). Each states a rule over all of app and private that no apply-time block states; the live
// half is `make db-migrate-clean` itself, where each was shown to fail by name on the drift it closes.
test('the catalog-rule probes run in migrate-clean after the ceiling probe, each as built, after each of its drifts and clean again', async () => {
  // Comments stripped first: a `return 1` moved into a comment must not satisfy a text match.
  const runner = (await readFile('scripts/db/run.mjs', 'utf8')).replace(/\/\/[^\n]*/g, '');
  const ceiling = runner.indexOf('const probe = await script(CEILING_PROBE_SQL);');
  const loop = runner.indexOf('const unsafe = unsafeDrifts(CATALOG_RULE_PROBES);');
  const pass = runner.indexOf('plan = await postMigratePlan();');
  assert.ok(ceiling > 0 && loop > ceiling && pass > loop, 'after the ceiling probe and before the post-migrate pass');
  // The FK-support probe is one of the list now, self-tested like the rest (C0 on 123's corrections, F6).
  assert.doesNotMatch(runner, /await script\(FK_SUPPORT_PROBE_SQL\)/, 'no untested run of the FK-support probe outside the list');
  // The executor, whole: every drift checked BEFORE any job is fed (blocker 186 item 12; C0 F4 on 125),
  // then every job the pure planner names, each with its own nonce and its whole transcript, nothing
  // between it and the verdict.
  assert.match(runner.slice(loop, pass).replace(/\n\s*\n/g, '\n'),
    /^const unsafe = unsafeDrifts\(CATALOG_RULE_PROBES\);\n\s*if \(unsafe\.length\) \{ for \(const u of unsafe\) stderr\.write\([^\n]*\); return 1; \}\n\s*const probeOutcomes = \[\];\n\s*for \(const job of catalogProbeJobs\(CATALOG_RULE_PROBES\)\) \{ const nonce = randomUUID\(\); probeOutcomes\.push\(\{ \.\.\.job, nonce, result: await feedTranscript\(probeJobScript\(job, nonce\)\) \}\); \}\n\s*const probeVerdict = decideCatalogProbes\(CATALOG_RULE_PROBES, probeOutcomes\);\n\s*for \(const failure of probeVerdict\.failures\) stderr\.write\([^\n]*\);\n\s*if \(!probeVerdict\.ok\) return 1;\n\s*for \(const claim of probeVerdict\.claims\) stdout\.write\([^\n]*\);\n\s*let plan;\n\s*try \{ $/,
    'the executor is exactly: refuse an unsafe drift, run every job with a fresh nonce, decide, fail on a failing verdict -- no skip, no substitute, no early return');
  const m = await import('../../scripts/db/run.mjs');
  assert.deepEqual(m.CATALOG_RULE_PROBES.map((p) => p.sql),
    [m.FK_SUPPORT_PROBE_SQL, m.FK_ACTION_PROBE_SQL, m.UPDATED_BY_CLOSURE_PROBE_SQL, m.REQUESTER_CLOSURE_PROBE_SQL,
      m.UPDATED_BY_ON_UPDATE_CLOSURE_PROBE_SQL, m.DECIDER_CLOSURE_PROBE_SQL, m.CLOSURE_COVERAGE_PROBE_SQL,
      m.CREATED_BY_CLOSURE_PROBE_SQL, m.INSERT_CLOSURE_COVERAGE_PROBE_SQL, m.PERMISSIVE_POLICY_PROBE_SQL, m.CLIENT_PRIVILEGE_PROBE_SQL,
      m.CLIENT_SCHEMA_PROBE_SQL, m.CLIENT_MEMBERSHIP_PROBE_SQL, m.SYSTEM_FINGERPRINT_PROBE_SQL, m.PINNED_CHECK_PROBE_SQL,
      m.PINNED_POLICY_PROBE_SQL, m.SECURITY_DEFINER_PROBE_SQL, m.POLICY_HELPER_PROBE_SQL, m.TRIGGER_PROBE_SQL, m.PINNED_TRIGGER_PROBE_SQL,
      m.PINNED_GRANT_PROBE_SQL, m.READ_ALLOWLIST_PROBE_SQL, m.DATA_CLASSIFICATION_PROBE_SQL, m.PINNED_SHAPE_PROBE_SQL, m.VOCABULARY_CHECK_PROBE_SQL,
      m.POLICY_SET_PROBE_SQL, m.INDEX_COVERAGE_PROBE_SQL, m.PINNED_DEFAULT_PROBE_SQL, m.REWRITE_RULE_PROBE_SQL, m.PG_CATALOG_GUARD_SQL],
    'all thirty, in order (the pinned shape, vocabulary check, policy set and index coverage probes are the batch 150 prerequisite draft: survey §6 items 5-7 and plan (b); the read allowlist and data classification probes are the batch 170 draft: RFC-2026-021 §8.2 and §8.5, plan (b) and (c)):one rule per probe or one drift per rule (C0 on 123, F5; Q0 on 123, F3; C0 on its corrections, F6); the pinned trigger probe is blocker 186 item 13; the pinned grant and default probes are batch 091\'s third round (C0 H1, H3; A1 R1, R3); the rewrite rule and pg_catalog guard probes are batch 126\'s review round (Q0 F5, F3); the created_by closure and INSERT coverage probes are batch 127 (blocker 186\'s created_by class; A1 F5 on 123), and so is the permissive policy probe (the Owner\'s answer to A0\'s recommendation (3), 2026-10-03); the client privilege and policy helper probes are batch 127\'s review round (C0 F1, F4; A1 F1, F2; Q0 F1); the client schema and client membership probes are batch 128 (A1 N1, N3, N5; C0 N1; Q0 N1, N2 on 127\'s re-check); the system object fingerprint probe is batch 129 (C0 G1, Q0 F1 on 128\'s re-check)');
  // AS MANY DRIFTS AS RULES (Q0 on 123, F3): each raise is a rule, and each is answered by its own
  // drift, in order, so a rule its probe's drifts never reach cannot be added unnoticed. EVERY spelling
  // of a raise counts, and each must be the one spelling whose prefix can be read (Q0's re-test of the
  // corrections, F2: `raise '...'` or `raise exception using message` needed no drift); each prefix is
  // non-empty and distinct within its probe (C0's re-verification, F5). And each drift NAMES what its
  // refusal must name (blocker 186 item 11).
  for (const { label, sql, selfTests } of m.CATALOG_RULE_PROBES) {
    const every = [...sql.matchAll(/\braise\b(?!\s+(?:notice|warning|info|debug|log)\b)/gi)].length;
    const raises = [...sql.matchAll(/\braise exception '([^']*)/g)].map((r) => r[1]);
    assert.equal(every, raises.length, `${label}: every raise is \`raise exception '<literal>...'\`, so its prefix can be read`);
    assert.equal(selfTests.length, raises.length, `${label}: ${raises.length} rule(s) and ${selfTests.length} self-test(s)`);
    selfTests.forEach(({ raises: prefix, names }, i) => {
      assert.ok(prefix.length >= 12, `${label}: self-test ${i + 1}'s prefix says which rule it answers`);
      assert.ok(raises[i].startsWith(prefix), `${label}: self-test ${i + 1} answers rule ${i + 1} ("${prefix}")`);
      raises.forEach((other, j) => { if (j !== i) assert.ok(!other.startsWith(prefix), `${label}: self-test ${i + 1}'s prefix also matches rule ${j + 1}`); });
      assert.ok(Array.isArray(names) && names.length > 0 && names.every((n) => n.length >= 6), `${label}: self-test ${i + 1} names the object its refusal must name`);
      assert.match(raises[i], /: %$/, `${label}: rule ${i + 1} prints what it found, so a refusal can be tied to its object`);
    });
  }
  // No drift and no probe holds a psql meta-command or a top-level transaction-control statement, and
  // the rule reads statement position: a function body is admitted (blocker 186 item 12; A1 V4).
  assert.deepEqual(m.unsafeDrifts(m.CATALOG_RULE_PROBES), [], 'no shipped drift is unsafe');
  assert.ok(m.CATALOG_RULE_PROBES.some((p) => p.selfTests.some((t) => /\$f\$ begin return new; end \$f\$/.test(t.drift))),
    'a drift that rewrites a function body ships, which the keyword rule would have refused');
  // THE JOB LIST, DERIVED HERE INDEPENDENTLY AND COMPARED WHOLE (Q0's re-test, F1: a one-line filter in
  // catalogProbeJobs skipped a drift, and the verdict, built from the same function, agreed with it).
  const derived = [];
  for (const p of m.CATALOG_RULE_PROBES) {
    derived.push({ label: p.label, kind: 'as built', sql: p.sql });
    p.selfTests.forEach((t, i) => derived.push({ label: p.label, kind: `after drift ${i + 1}`, drift: t.drift, sql: p.sql, raises: t.raises, names: t.names }));
  }
  for (const p of m.CATALOG_RULE_PROBES) derived.push({ label: p.label, kind: 'as built, after every drift', sql: p.sql });
  assert.deepEqual(m.catalogProbeJobs(m.CATALOG_RULE_PROBES), derived, 'every probe as built, after each of its drifts, and again at the end');
  assert.equal(derived.length, 2 * m.CATALOG_RULE_PROBES.length + m.CATALOG_RULE_PROBES.reduce((n, p) => n + p.selfTests.length, 0));
  // AND THE VERDICT, DRIVEN BY OUTCOMES BUILT FROM THE REAL PROBES, transcripts included: the right ones
  // pass and each claim counts the drifts refused. Then each real drift job is answered every wrong way
  // the reviews named (C0 F1, Q0 F1 on batch 125), one at a time, and each must fail the verdict.
  const nonce = '0b7c5a1e-0000-4000-8000-00000000c0de';
  const marks = (tx = '7', end = false) => `probe\n${m.PROBE_TX_MARK}7\nprobe\n${nonce}:mark:${tx}\n${end ? `probe\n${nonce}:end:${tx}\n` : ''}`;
  const passed = (j) => ({ ...j, nonce, result: { stdout: marks('7', true), stderr: '' } });
  const raised = (j, message, code = 'P0001', extra = {}) => ({ ...j, nonce,
    result: { error: { code, message }, stdout: marks(), stderr: `ERROR:  ${code}: ${message}\nCONTEXT:  PL/pgSQL function inline_code_block\n`, ...extra } });
  const right = derived.map((j) => (j.raises ? raised(j, `${j.raises}: ${j.names.join(', ')}`) : passed(j)));
  const verdict = m.decideCatalogProbes(m.CATALOG_RULE_PROBES, right);
  assert.equal(verdict.ok, true, verdict.failures.join('; '));
  m.CATALOG_RULE_PROBES.forEach((p, i) => assert.match(verdict.claims[i], p.selfTests.length === 1 ? /refused its drift/ : new RegExp(`refused each of its ${p.selfTests.length} drifts`)));
  const allRaises = m.CATALOG_RULE_PROBES.flatMap((p) => p.selfTests.map((t) => t.raises));
  const fails = (k, outcome, why) => {
    const outcomes = right.map((o, n) => (n === k ? outcome : o));
    const v = m.decideCatalogProbes(m.CATALOG_RULE_PROBES, outcomes);
    assert.equal(v.ok, false, `${derived[k].label} ${derived[k].kind}: ${why} must fail`);
    assert.match(v.failures.join('\n'), new RegExp(`declares \\d+ drift\\(s\\) and \\d+ were refused|${derived[k].kind}`), `${derived[k].label}: and say which job`);
  };
  for (const [k, job] of derived.entries()) {
    if (!job.raises) {
      fails(k, { ...passed(job), result: { stdout: marks('7', false), stderr: '' } }, 'a pass whose closing marker never printed');
      fails(k, { ...passed(job), result: { stdout: marks('8', true), stderr: '' } }, 'a pass in another transaction');
      continue;
    }
    const message = `${job.raises}: ${job.names.join(', ')}`;
    for (const other of allRaises.filter((r) => r !== job.raises)) fails(k, raised(job, `${other}: ${job.names.join(', ')}`), `answered by "${other}"`);
    fails(k, passed(job), 'a pass');
    fails(k, raised(job, message, '42601'), 'a non-P0001 error carrying the right text');
    fails(k, raised(job, message, 'P0004'), 'an assert');
    fails(k, raised(job, `${job.raises}: something else`), 'a refusal that does not name the drift\'s object');
    fails(k, raised(job, message, 'P0001', { stdout: `probe\n${m.PROBE_TX_MARK}7\n` }), 'a refusal raised before the probe ran (the drift raised it)');
    fails(k, raised(job, message, 'P0001', { stdout: marks('9') }), 'a refusal after the drift ended the transaction');
    fails(k, raised(job, message, 'P0001', { stderr: `WARNING:  01000: x\nERROR:  P0001: ${message}\nERROR:  22012: division by zero\n` }), 'a forged ERROR line beside the real one');
    fails(k, raised(job, message, 'P0001', { stdout: marks('7', true) }), 'a refusal that also printed the closing marker');
    fails(k, { ...raised(job, message), nonce: undefined }, 'an outcome with no nonce');
  }
  // THE JOB SCRIPT, in order: the transaction id before the drift, the drift, the nonce and the id after
  // it, the search_path pinned, the pg_catalog guard (Q0 F3 on 126), the probe, the closing marker, rollback.
  const script = m.probeJobScript({ drift: 'D;', sql: 'S' }, nonce).split('\n');
  assert.deepEqual(script, ['begin;', `select '${m.PROBE_TX_MARK}' || pg_catalog.txid_current() as probe;`, 'D;',
    `select '${nonce}:mark:' || pg_catalog.txid_current() as probe;`, 'set local search_path = pg_catalog;', ...m.PG_CATALOG_GUARD_SQL.trimEnd().split('\n'), 'S',
    `select '${nonce}:end:' || pg_catalog.txid_current() as probe;`, 'rollback;', '']);
  // The guard decides by EXISTS over OID comparisons, before anything a drift could overload is called.
  // Since 128's review round in every schema initdb made but public, and relations too but in pg_toast (C0
  // F1, Q0 F1: views, a table and a definer function in information_schema and pg_catalog passed every layer).
  assert.match(m.PG_CATALOG_GUARD_SQL, /^do \$\$\ndeclare\n  offending text;\nbegin\n  if exists \(select 1 from pg_catalog\.pg_proc p where p\.pronamespace < 16384::pg_catalog\.oid and p\.pronamespace <> 2200::pg_catalog\.oid and p\.oid >= 16384::pg_catalog\.oid\)\n     or exists \(select 1 from pg_catalog\.pg_operator o where o\.oprnamespace < 16384::pg_catalog\.oid and o\.oprnamespace <> 2200::pg_catalog\.oid and o\.oid >= 16384::pg_catalog\.oid\)\n     or exists \(select 1 from pg_catalog\.pg_cast k where k\.oid >= 16384::pg_catalog\.oid\)\n     or exists \(select 1 from pg_catalog\.pg_class c where c\.relnamespace < 16384::pg_catalog\.oid and c\.relnamespace <> 2200::pg_catalog\.oid and c\.relnamespace <> 99::pg_catalog\.oid and c\.oid >= 16384::pg_catalog\.oid\) then\n/,
    'functions and operators in any schema initdb made but public, casts, and relations in one but public and pg_toast, at or above FirstNormalObjectId, decided first');
  // THE PROBES AND THEIR PINS, BY DIGEST (Q0 F2: no test pinned the values). A change to a probe, its
  // pinned lists, its drift, its raise or the objects it names changes one of these, in the same diff as
  // the reason for it.
  const { createHash } = await import('node:crypto');
  const digests = Object.fromEntries(m.CATALOG_RULE_PROBES.map((p) => [p.label,
    createHash('sha256').update([p.sql, ...p.selfTests.flatMap((t) => [t.drift, t.raises, ...t.names])].join('\u0000')).digest('hex').slice(0, 16)]));
  // Batch 123's corrections gave every rule its own drift (Q0 on 123, F3). A probe with one drift keeps
  // its digest's form; fk action (its stale-exemption rule is written only when an exemption exists)
  // d5454eaec7997fd7 to d73a065f573244b3, security definer 11591f0ab317753e to 46a6b919f897b53f and
  // trigger d32161f00a2a325f to f182e8b44bddb963 each changed.
  // Batch 125: the FK-support probe joins the list with two drifts (C0 on 123's corrections, F6) and its
  // stale-exemption list is ordered; the coverage probe reads every *_by column (A1 N3):
  // f42eb9fea5983fb7 to 15309262269afd58; the pinned policy probe is new.
  // Batch 126 (the hardening batch, blocker 186 items 11-14 and 17-19) moved EVERY digest once, because
  // each drift's `names` joined the digested text (item 11). Besides that: fk support keys its exemptions
  // by schema.table.constraint and its first drift adds a namesake key (item 18); pinned check pins
  // approval_requests_decided_after_created (item 17); trigger prints what differs in its second rule
  // and gains the parameter-grant rule and drift (items 11, 14); pinned trigger probe is new (item 13);
  // pinned grant and pinned default probes are new (batch 091's third round: C0 H1 and H3, A1 R1 and R3).
  // Batch 126's review round: pinned check 9160fbd1a4c57d58 to 9fbe921cb30965f5 (a NOT NULL rule on the
  // column the order CHECK reads, Q0 F8); pinned trigger 24fef9153a8b1c5c to f136765c6beb5dbf (126's new
  // body digest, the owner pinned, Q0 F2 and F8); pinned grant d7e4ecebf95f0fae to 2e3ef3743a2ca6ad (the
  // owner rule and the grant option, C0 F3 and F5, A1 F3, Q0 F7); rewrite rule and pg_catalog guard are new
  // (Q0 F5, F3).
  // Batch 127: the created_by INSERT closure, INSERT coverage and permissive policy probes are new; the
  // last carries the 74 pinned permissive policies, so any change to one of them moves its digest.
  // Batch 127's review round: the client privilege and policy helper probes are new (C0 F1, F4; A1 F1, F2;
  // Q0 F1); pinned policy 8d249faed4de9d73 to a7be93780c68245a (the other thirty-one member-scope
  // narrowings pinned by exact deparse, C0 F3).
  // Batch 128 (127's re-checks): the client schema and client membership probes are new (A1 N1, N3, N5; C0 N1;
  // Q0 N1, N2); client privilege 9050ddad1ecc37bc to 7d4a93840aeecd07 (every schema but the system ones, rule
  // 3 outside app, a MAINTAIN input and two new-schema inputs: A1 N1, C0 N1, Q0 N1, N6); security definer
  // 890866dd704c458b to 971a408c8189e608 (the extension-member rule and its drift, A1 N2); policy helper
  // 148d38b00e422888 to 3fcabdc5eecec27c (its first drift exercises all five conditions, C0 N4).
  // Batch 128's review round (C0 F1, F2; Q0 F1: objects in information_schema, pg_catalog or a pg_* schema the
  // migration owner made, and CREATE on the database, passed every layer): client privilege 7d4a93840aeecd07
  // to a620d5629d5192d7 (each rule also reads a relation made after initdb, whatever its schema; each drift
  // gains a temporary object); client schema 3157fdd0208c0772 to 13ad35c1af22ba18 (every schema, the system
  // ones' default USAGE pinned, and CREATE and TEMPORARY on the database); security definer 971a408c8189e608
  // to 42d056bde20ea854 and policy helper 3fcabdc5eecec27c to 79f1d9721698eb44 (a function made after initdb
  // in a system schema is read); pg_catalog guard dde779af70d95fcf to 75f034a2f40a686e (every schema initdb
  // made but public, relations too, and its drift puts a view and a definer function in information_schema).
  // Batch 129 (128's re-checks): the system object fingerprint probe is new (C0 G1, Q0 F1); client privilege
  // a620d5629d5192d7 to 86e1f9ff6b3eda34 (a pg_toast object in each of its three drifts, Q0 F2; rule 4 and its
  // drift, pg_default_acl, A1 R1); client schema 13ad35c1af22ba18 to 6c400e229948cda6 (every other database, Q0
  // F3); client membership 9dc722ac7efd2c45 to 930e93b4411edcf5 (the roles' own attributes and a drift, A1
  // R2, C0 F3).
  // Batch 129's review round (129's re-checks): client membership 930e93b4411edcf5 to d82a36c9fbe730c6 (every
  // role default a client session starts with, and a drift, A1 R2); system object fingerprint 35887b50de64acf6
  // to 6a533b62eacf2022 (prosqlbody read, A1 R1; the name compared, C0 F2, Q0 F1; three more shapes in its
  // drift); trigger 9f3dc969be47bd74 to 7ebb13f1c66bd33a (event triggers pinned, and a drift, A1 R3).
  // The batch 170 draft (plan "Batch 170 -- Can do now", assertion only): pinned grant 2e3ef3743a2ca6ad to
  // 7a8fe3e222e6827f (every table in app and private and every non-superuser role, read from
  // db/foundation/lint/pinned-grants.json; the table-list rule and its drift first; a column privilege a
  // table-level one implies is read at the table level; non-client roles granted and revoked in drifts 3
  // and 4); the read allowlist and data classification probes are new (RFC-2026-021 §8.2 and §8.5; ERD §9.1).
  // Batch 170's review round: pinned grant 7a8fe3e222e6827f to baa6379790cb8733 (the first rule also names a
  // view, materialized view or foreign table in app or private, and its drift adds two, A1 R2, Q0 Q-2; the
  // superuser set and every non-superuser role's memberships are rules 3 and 4 with a drift each, A1 R1,
  // Q0 Q-1, Q-5; a column for anon in the column drift, Q0 Q-5).
  // Batch 150's prerequisites (plan "Batch 150 -- Can do now", assertion only): the pinned shape,
  // vocabulary check, policy set and index coverage probes are new (weak-assertion survey §6 items 5, 6 and 7;
  // ERD §3.3), each reading a lint file in db/foundation/lint/; no existing digest moves.
  // Batch 150-prereq's review round: pinned shape d9d0a827e5be09e3 to b54ae8e9c8c7f6ce (rule 5, triggers, and
  // its drift, A1 S4, C0-8; a roles drift, Q0 Q-3), policy set 10e2446a17df3d73 to 3c643bfe1fcfb040 (a roles
  // drift, Q0 Q-3), index coverage 7e53a75a9931e962 to ae187b635c0ae0f4 (btree only and the NULLS order, C0-1,
  // Q0 Q-1; drifts for HASH, BRIN, NULLS LAST, a column behind a non-predicate column and a table-qualified
  // column, Q0 Q-2). The vocabulary check probe and every older digest stay.
  // Batch 150: pinned shape b54ae8e9c8c7f6ce to 11ba1271ffc00d70 (Q150-a: performance_snapshots_pkey and its
  // index pinned as (id, metric_time), the text the probe embeds); data classification 42c77e0015f12eaf to
  // 77b41feaee177714 (Q170-d: SECRET-4 keeps no client privilege; PROVIDER-3, INTERNAL-3 and the twelve open
  // tables are held to db/foundation/lint/safe-projections.json both ways, two new rules and two new drifts;
  // the SECRET-4 drift moved to private tables). Every other digest stays.
  // Batch 150's review round: data classification 77b41feaee177714 to a848ca33af3460e3 (Q0 Q-3: the widen drift
  // also grants a column UPDATE and INSERT and a table TRUNCATE and TRIGGER on the classed tables, each named).
  // Batch 170 (Q-026-5 / Q-027-5, revoke): pinned grant baa6379790cb8733 to eb5ecbffb7f4f3cf (the pinned list the
  // probe embeds loses authenticated UPDATE (lifecycle_state) on app.workspaces; no rule and no drift changed).
  // Every other digest stays.
  // The owed-tooling batch (2026-10-04, no migration): pinned trigger f136765c6beb5dbf to 6c73217f9ce9e45f (every
  // table in app and private, 51 triggers and four functions, its two drifts widened: A1 R-2 on 170's re-check);
  // pinned grant eb5ecbffb7f4f3cf to 06c68d76dce9d29a (rules 7 and 8, the schemas' owner and privileges and every
  // non-superuser role's attributes and default ACLs, a drift each: A1 S1, S3, Q0 R-2 on 170-assert's re-check;
  // the probe also embeds pinned-grants.json, whose _how_measured line moved, C0-170-3, though the probe reads
  // only its tables); index coverage ae187b635c0ae0f4 to 2d47460e43a5c68e (a key's collation and operator class,
  // and their drifts: Q0 R-2 on 150-prereq's re-check). Every other digest stays.
  // The owed-tooling batch's review round: pinned trigger 6c73217f9ce9e45f to 8412a302b7f190a7 (a third rule: every
  // internal trigger on a table in app or private is one of its table's FK checks, and its drift, a trigger hidden
  // by tgisinternal and an FK trigger re-pointed at RI_FKey_cascade_del: A1-OT-1). Every other digest stays.
  assert.deepEqual(digests, {
    'fk support probe': '1510c7eb5f686b44',
    'fk action probe': '14d32b2acc3908ca',
    'updated_by insert closure probe': 'a15274e9fa49639c',
    'requester closure probe': '17130eb51d94ff25',
    'updated_by update closure probe': '024492df9c6413be',
    'decider closure probe': '84bd3a00310d26af',
    'closure coverage probe': '1a626907571ffb7e',
    'created_by insert closure probe': '00def6f1e5194911',
    'insert closure coverage probe': '3996c38c9f5081a9',
    'permissive policy probe': '2fd449e14cd8900f',
    'client privilege probe': '86e1f9ff6b3eda34',
    'client schema probe': '6c400e229948cda6',
    'client membership probe': 'd82a36c9fbe730c6',
    'system object fingerprint probe': '6a533b62eacf2022',
    'pinned check probe': '9fbe921cb30965f5',
    'pinned policy probe': 'a7be93780c68245a',
    'security definer probe': '42d056bde20ea854',
    'policy helper probe': '79f1d9721698eb44',
    'trigger probe': '7ebb13f1c66bd33a',
    'pinned trigger probe': '8412a302b7f190a7',
    'pinned grant probe': '06c68d76dce9d29a',
    'read allowlist probe': 'a97a58b338e52627',
    'data classification probe': 'a848ca33af3460e3',
    'pinned shape probe': '11ba1271ffc00d70',
    'vocabulary check probe': 'd28d49cb3af0a0fd',
    'policy set probe': '3c643bfe1fcfb040',
    'index coverage probe': '2d47460e43a5c68e',
    'pinned default probe': '570796093410bc0a',
    'rewrite rule probe': '7125c3c6adc84957',
    'pg_catalog guard probe': '75f034a2f40a686e',
  },'a probe, a pinned list, a drift, a raise or a named object changed: update this digest in the same change, saying why');
  // What each probe must READ, stated as intent beside the digest (the digest says THAT it changed;
  // these say WHAT must survive a change). Each names the finding that made it necessary.
  assert.match(m.FK_ACTION_PROBE_SQL, /confdeltype <> 'a' or c\.confupdtype <> 'a' or c\.condeferrable or not c\.convalidated/, 'actions, deferrable and NOT VALID (Q0 F4)');
  assert.match(m.FK_ACTION_PROBE_SQL, /n\.nspname not in \('pg_catalog', 'information_schema'\)/, 'every schema but the system ones (Q0 F07)');
  for (const [sql, suffix] of [[m.UPDATED_BY_CLOSURE_PROBE_SQL, 'updated_by_is_caller'], [m.REQUESTER_CLOSURE_PROBE_SQL, 'requester_is_caller'],
    [m.UPDATED_BY_ON_UPDATE_CLOSURE_PROBE_SQL, 'updated_by_on_update_is_caller'], [m.DECIDER_CLOSURE_PROBE_SQL, 'decided_by_on_update_is_caller'],
    [m.CREATED_BY_CLOSURE_PROBE_SQL, 'created_by_is_caller']]) {
    assert.match(sql, /pg_get_expr\(pol\.polwithcheck, pol\.polrelid\) = '/, `${suffix}: closures compared by TEXT, not tokens (A1 F3)`);
    assert.match(sql, new RegExp(`has no %s_${suffix}[\\s\\S]*where not exists`), `${suffix}: a dropped closure is caught (C0 LOW 3)`);
  }
  // The coverage probe's generality is ONE predicate (blocker 186 item 19; Q0 F5 on batch 125: reverted to
  // `attname = 'updated_by'` with the digest refreshed, a client-writable decided_by passed every layer).
  assert.match(m.CLOSURE_COVERAGE_PROBE_SQL, /and a\.attname like '%\\_by'\n/, 'every column named *_by, by one LIKE (A1 N3)');
  assert.doesNotMatch(m.CLOSURE_COVERAGE_PROBE_SQL, /attname\s*(=|in\b|~)/, 'and no single column, list or regex narrows it');
  assert.match(m.CLOSURE_COVERAGE_PROBE_SQL, /has_column_privilege\('authenticated', c\.oid, a\.attnum, 'UPDATE'\)/, 'client-updatable, read from the catalog');
  // AND THE WHOLE STATEMENT, every join and every predicate (Q0 F4 on 126: `and a.attname not like
  // 'decided%'` on the next line passed the LIKE assertion, and with it a client-writable decided_by).
  // Rebuilt here from its own pinned list, so the only free text is what this test states.
  const pinnedKeys = Object.entries(m.ATTRIBUTION_UPDATE_CLOSURES).flatMap(([col, tables]) => tables.map((t) => `'${t}.${col}'`)).join(', ');
  assert.equal(m.CLOSURE_COVERAGE_PROBE_SQL.match(/\n  (select string_agg[\s\S]*?\]\)\);)\n/)?.[1].replace(/\s+/g, ' '),
    "select string_agg(format('app.%s.%s', c.relname, a.attname), ', ' order by c.relname, a.attname) into offending"
    + ' from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace'
    + ' join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped'
    + " where n.nspname = 'app' and c.relkind in ('r', 'p') and a.attname like '%\\_by'"
    + " and pg_catalog.has_column_privilege('authenticated', c.oid, a.attnum, 'UPDATE')"
    + ` and not (format('%s.%s', c.relname, a.attname) = any (array[${pinnedKeys}]));`,
    'the coverage probe\'s statement is exactly this: no predicate added, dropped or narrowed');
  assert.equal((m.CLOSURE_COVERAGE_PROBE_SQL.match(/\bselect\b/g) ?? []).length, 1, 'and it is the probe\'s only statement that reads');
  // THE SAME AT INSERT (batch 127): the UPDATE probe read UPDATE alone, so a later table granting
  // authenticated INSERT on a *_by column with no closure passed every probe. Pinned whole, as above.
  const insertKeys = Object.entries(m.ATTRIBUTION_INSERT_CLOSURES).flatMap(([col, tables]) => tables.map((t) => `'${t}.${col}'`)).join(', ');
  assert.equal(m.INSERT_CLOSURE_COVERAGE_PROBE_SQL.match(/\n  (select string_agg[\s\S]*?\]\)\);)\n/)?.[1].replace(/\s+/g, ' '),
    "select string_agg(format('app.%s.%s', c.relname, a.attname), ', ' order by c.relname, a.attname) into offending"
    + ' from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace'
    + ' join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped'
    + " where n.nspname = 'app' and c.relkind in ('r', 'p') and a.attname like '%\\_by'"
    + " and pg_catalog.has_column_privilege('authenticated', c.oid, a.attnum, 'INSERT')"
    + ` and not (format('%s.%s', c.relname, a.attname) = any (array[${insertKeys}]));`,
    'the INSERT coverage probe\'s statement is exactly this: no predicate added, dropped or narrowed');
  assert.equal((m.INSERT_CLOSURE_COVERAGE_PROBE_SQL.match(/\bselect\b/g) ?? []).length, 1, 'and it is that probe\'s only statement that reads');
  // Every attribution column at INSERT is pinned to the closure list of its own column, and each list is
  // the one its own closure probe pins by exact text.
  assert.deepEqual(m.ATTRIBUTION_INSERT_CLOSURES, { created_by: m.CREATED_BY_CLOSURES, requested_by: m.REQUESTER_CLOSURES, updated_by: m.UPDATED_BY_CLOSURES });
  assert.equal(m.CREATED_BY_CHECK_TEXT, '(created_by = ( SELECT auth.uid() AS uid))', 'created_by at INSERT is exactly the caller, as 105\'s updated_by at UPDATE');
  assert.equal(m.CREATED_BY_CLOSURES.length, 19, 'nineteen tables grant authenticated INSERT on created_by, measured from the catalog at batch 127');
  assert.deepEqual([...m.CREATED_BY_CLOSURES].sort(), m.CREATED_BY_CLOSURES, 'sorted, so a diff to the list reads as one line');
  // EVERY CLIENT-WRITABLE TABLE'S PERMISSIVE SET, EXACTLY (batch 127, recommendation (3)). The probe reads
  // every app table anon or authenticated may INSERT, UPDATE or DELETE, compares each permissive policy by
  // (table, name), command, roles and both halves' deparse, and names what is unlisted, missing or changed.
  // Its reading predicates are pinned here, so one dropped or narrowed fails before a database.
  const permissive = m.PERMISSIVE_POLICY_PROBE_SQL;
  assert.match(permissive, /where n\.nspname = 'app' and c\.relkind in \('r', 'p'\)\n\s+and exists \(select 1 from unnest\(array\['anon', 'authenticated'\]\) as cr\(r\)\n\s+where pg_catalog\.has_any_column_privilege\(cr\.r, c\.oid, 'INSERT'\)\n\s+or pg_catalog\.has_any_column_privilege\(cr\.r, c\.oid, 'UPDATE'\)\n\s+or pg_catalog\.has_table_privilege\(cr\.r, c\.oid, 'DELETE'\)\)\n/,
    'client-writable means INSERT or UPDATE on any column, or DELETE, for anon or authenticated');
  assert.match(permissive, /from writable w join pg_catalog\.pg_policy pol on pol\.polrelid = w\.oid\n\s+where pol\.polpermissive\n/, 'every permissive policy on those tables, of every command');
  assert.match(permissive, /where not exists \(select 1 from pinned p where p\.k = f\.k and p\.cmd = f\.cmd and p\.roles = f\.roles\n\s+and p\.using_text is not distinct from f\.using_text and p\.check_text is not distinct from f\.check_text\)/,
    'a found policy is listed only by its name, command, roles and both texts');
  assert.match(permissive, /where not exists \(select 1 from found f where f\.k = p\.k and f\.cmd = p\.cmd and f\.roles = p\.roles\n\s+and f\.using_text is not distinct from p\.using_text and f\.check_text is not distinct from p\.check_text\)/,
    'and a pinned policy is found only the same way');
  assert.match(permissive, /select 'unlisted or changed: app\.' \|\| f\.k as x from found f[\s\S]*union all\n\s+select 'missing or changed: app\.' \|\| p\.k from pinned p/, 'both directions named');
  assert.equal((permissive.match(/\bselect\b/g) ?? []).length, 11, 'eleven selects, counted at batch 127: no reading clause added unseen');
  const pkeys = Object.keys(m.PERMISSIVE_POLICIES);
  assert.deepEqual([...pkeys].sort(), pkeys, 'sorted, so a diff to the list reads as one line per policy');
  assert.equal(pkeys.length, 74, 'seventy-four permissive policies on the client-writable tables, measured from the catalog at batch 127');
  const ptables = new Set(pkeys.map((k) => k.split('.')[0]));
  assert.equal(ptables.size, 25, 'on twenty-five client-writable app tables');
  for (const t of m.CREATED_BY_CLOSURES) assert.ok(ptables.has(t), `${t}: a created_by table has its permissive set pinned (D1 fails by name on all nineteen)`);
  for (const [k, p] of Object.entries(m.PERMISSIVE_POLICIES)) {
    assert.match(k, /^[a-z_]+\.[a-z_]+$/, `${k}: table.policy`);
    assert.ok(['r', 'a', 'w', 'd', '*'].includes(p.cmd), `${k}: a policy command`);
    assert.equal(p.roles, 'authenticated', `${k}: every permissive policy here is TO authenticated`);
    assert.ok(p.cmd === 'a' ? p.using === null : p.using !== null, `${k}: USING exactly when the command has one`);
    assert.ok(p.cmd === 'r' ? p.check === null : p.check !== null, `${k}: WITH CHECK exactly when the command has one`);
  }
  // A1 F5 on batch 123 counted 22 permissive INSERT policies on 17 tables; with 091's two tables, 24 on 19.
  assert.equal(Object.values(m.PERMISSIVE_POLICIES).filter((p) => p.cmd === 'a').length, 24, 'the twenty-four permissive INSERT policies batch 127 measured');
  assert.deepEqual([...new Set(Object.entries(m.PERMISSIVE_POLICIES).filter(([, p]) => p.cmd === 'a' && p.check.startsWith('((created_by = ( SELECT auth.uid() AS uid))')).map(([k]) => k.split('.')[0]))].sort(),
    m.CREATED_BY_CLOSURES, 'the nineteen created_by tables are exactly the tables whose permissive INSERT policies bind created_by');
  // WHAT REACHES PAST EVERY POLICY, FAIL-CLOSED (batch 127's review round: C0 F1, A1 F1 and F2, Q0 F1). Its
  // reading predicates are pinned here, so one dropped or narrowed fails before a database.
  const clientPriv = m.CLIENT_PRIVILEGE_PROBE_SQL;
  assert.deepEqual(m.CLIENT_ROLES, ['anon', 'authenticated', 'public'], 'the client roles, PUBLIC included, which both inherit');
  assert.deepEqual([m.CLIENT_VIEWS, m.CLIENT_NON_APP_TABLES], [{}, {}], 'both allowlists empty, measured at batch 127: a pin is an RFC-sized decision, in the same diff as its reason');
  assert.equal((clientPriv.match(/unnest\(array\['anon', 'authenticated', 'public'\]\) as cr\(r\)/g) ?? []).length, 3, 'every rule reads every client role');
  // EVERY SCHEMA BUT THE SYSTEM ONES (batch 128; A1 N1, C0 N1, Q0 N1 on 127's re-check: a view or table in
  // a fourth schema passed every layer while the rules read three by name).
  assert.equal(m.NON_SYSTEM_SCHEMA, "n.nspname not in ('pg_catalog', 'information_schema') and n.nspname !~ '^pg_'", 'the system schemas, and nothing else, are left out');
  // AND EVERY RELATION MADE AFTER INITDB, IN ANY SCHEMA (batch 128's review round; C0 F1, Q0 F1: a view or an
  // RLS-less table in information_schema, in pg_catalog or in a pg_* schema the migration owner made passed
  // every layer). The schema names are no longer the whole test: the object's own OID is read too.
  assert.equal(m.FIRST_NORMAL_OID, 16384, 'FirstNormalObjectId: everything initdb made is below it');
  assert.equal(m.userObject('c.oid'), "((n.nspname not in ('pg_catalog', 'information_schema') and n.nspname !~ '^pg_') or c.oid >= 16384)",
    'a relation is read when its schema is not a system one by name, OR when it was made after initdb, whatever its schema');
  assert.doesNotMatch(clientPriv, /where \$\{?NON_SYSTEM_SCHEMA|where n\.nspname not in \('pg_catalog', 'information_schema'\) and n\.nspname !~ '\^pg_' and c\.relkind/,
    'no rule reads by schema name alone');
  assert.doesNotMatch(clientPriv, /nspname in \(/, 'no rule reads a list of schemas by name');
  assert.match(clientPriv, /where \(\(n\.nspname not in \('pg_catalog', 'information_schema'\) and n\.nspname !~ '\^pg_'\) or c\.oid >= 16384\) and c\.relkind in \('r', 'p', 'v', 'm', 'f'\)\n[\s\S]*select unnest\(array\['TRUNCATE', 'TRIGGER', 'REFERENCES'\]\n\s+\|\| case when pg_catalog\.current_setting\('server_version_num'\)::integer >= 170000 then array\['MAINTAIN'\]/,
    'rule 1: every relation kind in the three schemas, the four privileges no policy governs (C0 F1, X6)');
  assert.match(clientPriv, /where case when privs\.p = 'REFERENCES' then pg_catalog\.has_any_column_privilege\(cr\.r, rels\.oid, privs\.p\)\n\s+else pg_catalog\.has_table_privilege\(cr\.r, rels\.oid, privs\.p\) end;/, 'REFERENCES on any column');
  assert.match(clientPriv, /where \(\(n\.nspname not in \('pg_catalog', 'information_schema'\) and n\.nspname !~ '\^pg_'\) or c\.oid >= 16384\) and c\.relkind in \('v', 'm', 'f'\)\n\s+and \(pg_catalog\.has_any_column_privilege\(cr\.r, c\.oid, 'SELECT'\) or pg_catalog\.has_any_column_privilege\(cr\.r, c\.oid, 'INSERT'\)\n\s+or pg_catalog\.has_any_column_privilege\(cr\.r, c\.oid, 'UPDATE'\) or pg_catalog\.has_table_privilege\(cr\.r, c\.oid, 'DELETE'\)\)\n\s+and not \(format\('%s\.%s', n\.nspname, c\.relname\) = any \(array\[\]::text\[\]\) and c\.relkind = 'v'\n\s+and exists \(select 1 from pg_catalog\.pg_options_to_table\(c\.reloptions\) o\n\s+where o\.option_name = 'security_invoker'/,
    'rule 2: any client privilege on a view, materialized view or foreign table, unless pinned AND security_invoker (A1 F1, Q0 F1)');
  assert.match(clientPriv, /where n\.nspname <> 'app' and \(\(n\.nspname not in \('pg_catalog', 'information_schema'\) and n\.nspname !~ '\^pg_'\) or c\.oid >= 16384\) and c\.relkind in \('r', 'p'\)\n\s+and \(pg_catalog\.has_any_column_privilege\(cr\.r, c\.oid, 'SELECT'\) or pg_catalog\.has_any_column_privilege\(cr\.r, c\.oid, 'INSERT'\)\n\s+or pg_catalog\.has_any_column_privilege\(cr\.r, c\.oid, 'UPDATE'\) or pg_catalog\.has_table_privilege\(cr\.r, c\.oid, 'DELETE'\)\)\n\s+and not \(format\('%s\.%s', n\.nspname, c\.relname\) = any \(array\[\]::text\[\]\)\);/,
    'rule 3: any client privilege on a table outside app, unless pinned (A1 F2; A1 F6 on 123; A1 V13 on 127\'s re-check)');
  // RULE 4, WHAT EVERY LATER OBJECT WILL CARRY (batch 129; A1 R1 on 128's re-check): every pg_default_acl
  // entry, every schema and none, every object type, any grantee that is PUBLIC, anon or authenticated.
  assert.match(clientPriv, /from pg_catalog\.pg_default_acl d cross join lateral pg_catalog\.aclexplode\(d\.defaclacl\) a\n\s+where a\.grantee = 0::pg_catalog\.oid or a\.grantee in \(select r\.oid from pg_catalog\.pg_roles r where r\.rolname in \('anon', 'authenticated'\)\)\n\s+\) f;/,
    'rule 4: every default privilege whose grantee is PUBLIC, anon or authenticated, with no filter on schema or object type');
  assert.equal((clientPriv.match(/\bselect\b/g) ?? []).length, 9, 'nine selects, counted at batch 129 (six at 127\'s review round, and rule 4\'s three): no reading clause added unseen');
  // AND NOT ONLY THROUGH pg_temp (batch 129; Q0 F2 on 128's re-check: a mutation reading the schema's OID, or
  // keeping the arm for pg_temp alone, passed the three drifts). Each of the three puts an object in pg_toast,
  // an initdb schema with a pg_* name, which only the object's own OID reads; and names it.
  const privDrifts = m.CATALOG_RULE_PROBES.find((p) => p.label === 'client privilege probe').selfTests;
  privDrifts.slice(0, 3).forEach(({ drift, names }, i) => {
    assert.match(drift, /set_config\('allow_system_' \|\| 'table_mods', 'on', true\)/, `drift ${i + 1}: the switch, for its own transaction only`);
    assert.match(drift, /create (table|view) pg_toast\.probe_toast_/, `drift ${i + 1}: an object in pg_toast`);
    assert.ok(names.some((n) => n.includes('pg_toast.probe_toast_')), `drift ${i + 1}: and its refusal names it`);
  });
  // WHICH SCHEMAS A CLIENT MAY USE OR CREATE IN, AND WHAT A CLIENT ROLE MAY BECOME (batch 128; A1 N1, N3,
  // N5, C0 N1, Q0 N1, N2 on 127's re-check). Both read the catalog whole, and both lists are what the clean
  // set measured.
  // Since 128's review round EVERY schema, the system ones included (C0 F1, Q0 F1: C0 X2 made a schema named
  // pg_c0api and granted clients USAGE on it with every layer green), and the database (C0 F2: CREATE on it,
  // C0 X4, passed every layer and let a client make a schema of its own). The USAGE initdb gives PUBLIC on
  // pg_catalog and information_schema, and the TEMPORARY it gives PUBLIC on the database, are pinned as
  // measured on the clean set.
  const usageForAll = { anon: ['USAGE'], authenticated: ['USAGE'], public: ['USAGE'] };
  assert.deepEqual(m.CLIENT_SCHEMA_PRIVILEGES, { app: { authenticated: ['USAGE'] }, information_schema: usageForAll, pg_catalog: usageForAll, public: usageForAll },
    'client USAGE on app (authenticated), and on public, pg_catalog and information_schema (all three), CREATE on none, measured at 128\'s review round');
  assert.deepEqual(m.CLIENT_DATABASE_PRIVILEGES, { anon: ['TEMPORARY'], authenticated: ['TEMPORARY'], public: ['TEMPORARY'] },
    'TEMPORARY on the database for the three, through PUBLIC, and CREATE for none, measured at 128\'s review round');
  assert.match(m.CLIENT_SCHEMA_PROBE_SQL, /from pg_catalog\.pg_namespace n, unnest\(array\['anon', 'authenticated', 'public'\]\) as cr\(r\), unnest\(array\['USAGE', 'CREATE'\]\) as p\(p\), \(values \(''\), \(' WITH GRANT OPTION'\)\) as go\(opt\)\n\s+where pg_catalog\.has_schema_privilege\(cr\.r, n\.oid, p\.p \|\| go\.opt\)\n\s+union all\n/,
    'every client role, USAGE and CREATE, each with and without grant option, on every schema, with no filter on the schema');
  assert.match(m.CLIENT_SCHEMA_PROBE_SQL, /from unnest\(array\['anon', 'authenticated', 'public'\]\) as cr\(r\), unnest\(array\['CREATE', 'TEMPORARY'\]\) as p\(p\), \(values \(''\), \(' WITH GRANT OPTION'\)\) as go\(opt\)\n\s+where pg_catalog\.has_database_privilege\(cr\.r, pg_catalog\.current_database\(\), p\.p \|\| go\.opt\)\n/,
    'and CREATE and TEMPORARY on the current database, each with and without grant option');
  assert.doesNotMatch(m.CLIENT_SCHEMA_PROBE_SQL, /nspname\s*(not\b|in\b|!?~|<>|!=|=|like\b)|\.oid\s*[<>]/i, 'no schema is left out, by name or by OID');
  assert.match(m.CLIENT_SCHEMA_PROBE_SQL, /select 'unlisted: ' \|\| f\.g as x from found f[\s\S]*union all\n\s+select 'missing: ' \|\| p\.g from pinned p/, 'both directions named');
  // AND EVERY OTHER DATABASE (batch 129; Q0 F3 on 128's re-check: CREATE on template1 passed every layer).
  assert.match(m.CLIENT_SCHEMA_PROBE_SQL, /from pg_catalog\.pg_database d, unnest\(array\['anon', 'authenticated', 'public'\]\) as cr\(r\), unnest\(array\['CREATE', 'TEMPORARY'\]\) as p\(p\), \(values \(''\), \(' WITH GRANT OPTION'\)\) as go\(opt\)\n\s+where d\.datname <> pg_catalog\.current_database\(\) and \(p\.p = 'CREATE' or go\.opt <> ''\)\n\s+and pg_catalog\.has_database_privilege\(cr\.r, d\.oid, p\.p \|\| go\.opt\)\n/,
    'every other database: CREATE, and any grant option, for every client role, each named with its database');
  assert.equal((m.CLIENT_SCHEMA_PROBE_SQL.match(/\bselect\b/g) ?? []).length, 9, 'nine selects, counted at batch 129 (eight at 128\'s review round, and every other database): no reading clause added unseen');
  assert.deepEqual(m.CLIENT_ROLE_MEMBERSHIPS, [], 'anon and authenticated are members of no role, measured at batch 128: a pin is an RFC-sized decision');
  assert.match(m.CLIENT_MEMBERSHIP_PROBE_SQL, /with recursive reach\(client, roleid\) as \(\n\s+select r\.rolname::text, m\.roleid\n\s+from pg_catalog\.pg_roles r join pg_catalog\.pg_auth_members m on m\.member = r\.oid\n\s+where r\.rolname in \('anon', 'authenticated'\)\n\s+union\n\s+select reach\.client, m\.roleid\n\s+from reach join pg_catalog\.pg_auth_members m on m\.member = reach\.roleid\n\s+\)/,
    'pg_auth_members read recursively from both client roles, with no filter on INHERIT, SET or ADMIN');
  // AND WHAT A CLIENT ROLE IS (batch 129; A1 R2, C0 F3 and X6 on 128's re-check: bypassrls was held by
  // rls-smoke alone). Seven attributes, each false for both roles as the shim makes them, read from pg_roles.
  assert.deepEqual(m.CLIENT_ROLE_FALSE_ATTRIBUTES, ['rolbypassrls', 'rolcanlogin', 'rolcreatedb', 'rolcreaterole', 'rolinherit', 'rolreplication', 'rolsuper'],
    'superuser, bypassrls, createrole, createdb, inherit, login and replication, each pinned false, measured at batch 129');
  assert.match(m.CLIENT_MEMBERSHIP_PROBE_SQL, /from pg_catalog\.pg_roles r cross join lateral \(values \('rolbypassrls', r\.rolbypassrls\), \('rolcanlogin', r\.rolcanlogin\), \('rolcreatedb', r\.rolcreatedb\), \('rolcreaterole', r\.rolcreaterole\), \('rolinherit', r\.rolinherit\), \('rolreplication', r\.rolreplication\), \('rolsuper', r\.rolsuper\)\) as a\(k, v\)\n\s+where r\.rolname in \('anon', 'authenticated'\) and a\.v is distinct from false\n/,
    'each attribute of both client roles, any value but false named');
  assert.match(m.CLIENT_MEMBERSHIP_PROBE_SQL, /where not exists \(select 1 from pg_catalog\.pg_roles r where r\.rolname = c\.r\)/, 'and a client role that does not exist');
  // AND WHAT EVERY CLIENT SESSION STARTS WITH (batch 129's review round; A1 R2: pg_db_role_setting was read for
  // session_replication_role alone). Every default for anon, authenticated or every role, in any database.
  assert.deepEqual(m.CLIENT_ROLE_SETTINGS, [], 'no role default applies to a client session, measured at batch 129: a pin is an RFC-sized decision');
  assert.match(m.CLIENT_MEMBERSHIP_PROBE_SQL, /from pg_catalog\.pg_db_role_setting s\n\s+left join pg_catalog\.pg_roles r on r\.oid = s\.setrole\n\s+left join pg_catalog\.pg_database d on d\.oid = s\.setdatabase\n\s+cross join lateral unnest\(s\.setconfig\) as g\(setting\)\n\s+where s\.setrole = 0::pg_catalog\.oid or r\.rolname in \('anon', 'authenticated'\)\n\s+\) f\n\s+where not \(x = any \(array\[\]::text\[\]\)\);/,
    'every setting default for a client role or for every role, in any database, none pinned');
  assert.equal((m.CLIENT_MEMBERSHIP_PROBE_SQL.match(/\bselect\b/g) ?? []).length, 10, 'ten selects, counted at batch 129\'s review round (four at 128, the attribute rule\'s four, and the settings rule\'s two)');
  // WHAT initdb MADE, AS initdb MADE IT (batch 129; C0 G1, Q0 F1 on 128's re-check: a view, a function and a
  // grant initdb made, redefined or re-granted in place, kept OIDs below 16384 and passed every layer). The
  // fingerprint is COMPUTED on the database itself before the migrations, not pinned here; what it reads is.
  const fp = m.SYSTEM_FINGERPRINT_ROWS;
  assert.match(fp, /row\(p\.proowner, p\.prolang, p\.prokind, p\.prosecdef, p\.proleakproof, p\.proisstrict, p\.provolatile, p\.proparallel,\n\s+p\.procost, p\.prorows, p\.prosupport, p\.prorettype, p\.proargdefaults::text, p\.prosrc, p\.prosqlbody::text, p\.probin, p\.proconfig, p\.proacl\)::text as fp\n\s+from pg_catalog\.pg_proc p join pg_catalog\.pg_namespace n on n\.oid = p\.pronamespace\n\s+where p\.oid < 16384::pg_catalog\.oid\n/,
    'every function initdb made: owner, language, security, settings, body (prosrc, and prosqlbody since 129\'s review round, A1 R1), binary and ACL among the rest');
  assert.match(fp, /row\(c\.relowner, c\.relkind, c\.relacl, c\.relrowsecurity, c\.relforcerowsecurity, c\.relhasrules, c\.relhastriggers, c\.reloptions,\n\s+case when c\.relkind in \('v', 'm'\) then pg_catalog\.pg_get_viewdef\(c\.oid\) end,/,
    'every relation initdb made: owner, ACL, row level security, rules, triggers, options and a view\'s definition');
  assert.match(fp, /row\(a\.attnum, a\.attname, a\.atttypid, a\.attacl\)::text order by a\.attnum\) from pg_catalog\.pg_attribute a where a\.attrelid = c\.oid and a\.attnum > 0\)/, 'and every column, its ACL included');
  assert.match(fp, /from pg_catalog\.pg_rewrite r where r\.ev_class = c\.oid[\s\S]*from pg_catalog\.pg_trigger t where t\.tgrelid = c\.oid[\s\S]*from pg_catalog\.pg_policy pol where pol\.polrelid = c\.oid/, 'and the names of its rules, triggers and policies');
  assert.match(fp, /select 'schema', n\.oid, n\.nspname::text, row\(n\.nspowner, n\.nspacl\)::text\n\s+from pg_catalog\.pg_namespace n\n\s+where n\.oid < 16384::pg_catalog\.oid\n/, 'every schema initdb made, owner and ACL');
  assert.match(fp, /row\(l\.lanowner, l\.lanpltrusted, l\.lanplcallfoid, l\.laninline, l\.lanvalidator, l\.lanacl\)::text\n\s+from pg_catalog\.pg_language l\n\s+where l\.oid < 16384::pg_catalog\.oid$/, 'every language initdb made');
  assert.equal((fp.match(/ < 16384::pg_catalog\.oid/g) ?? []).length, 4, 'four kinds, each read whole below FirstNormalObjectId and nowhere filtered by schema');
  assert.doesNotMatch(fp, /nspname\s*(not\b|in\b|!?~|<>|!=|=|like\b)/i, 'no schema is left out by name');
  assert.ok(m.SYSTEM_FINGERPRINT_SNAPSHOT_SQL.includes(fp) && m.SYSTEM_FINGERPRINT_PROBE_SQL.includes(fp), 'the reference is taken and compared by the same text');
  assert.match(m.SYSTEM_FINGERPRINT_PROBE_SQL, /from now n full join catalog_baseline\.system_fingerprint b on b\.kind = n\.kind and b\.objoid = n\.objoid\n\s+where \(n\.fp, n\.ident\) is distinct from \(b\.fp, b\.ident\)\n/,
    'compared both ways by kind and OID: a changed, gone, new or renamed row is counted (the name since 129\'s review round, C0 F2, Q0 F1)');
  assert.match(m.SYSTEM_FINGERPRINT_PROBE_SQL, /when n\.ident is distinct from b\.ident then ' \[renamed to ' \|\| n\.ident \|\| '\]'/, 'and a rename is named as one');
  // The drift carries each shape the reviews named, so a narrowing of what is read fails at migrate-clean too.
  const fpDrift = m.CATALOG_RULE_PROBES.find((p) => p.label === 'system object fingerprint probe').selfTests[0];
  for (const shape of [/create or replace view information_schema\./, /security definer;/, /grant execute on function pg_catalog\./,
    /create or replace function information_schema\.\w+\([^)]*\) returns integer language sql immutable parallel safe strict return /, / rename to probe_renamed_read_file;/, /alter table information_schema\.\w+ rename to /]) {
    assert.match(fpDrift.drift, shape, `the fingerprint's drift holds ${shape}`);
  }
  assert.match(m.SYSTEM_FINGERPRINT_PROBE_SQL, /if differing > 0 then\n\s+raise exception/, 'and any one of them refuses');
  assert.match(m.SYSTEM_FINGERPRINT_SNAPSHOT_SQL, /^set local search_path = pg_catalog;\n/, 'taken under the search_path the probe runs with, so the texts compare');
  assert.match(m.SYSTEM_FINGERPRINT_SNAPSHOT_SQL, /if exists \(select 1 from catalog_baseline\.system_fingerprint\) then\n\s+return;\n\s+end if;\n\s+if exists \(select 1 from pg_catalog\.pg_namespace where nspname = 'app'\) then\n\s+raise exception/,
    'the first fingerprint is kept, and none is taken on a database the migrations already built');
  // The executor takes it before the prerequisite, seals it, and refuses a run whose seal moved by the end.
  const exec = (await readFile('scripts/db/run.mjs', 'utf8')).replace(/\/\/[^\n]*/g, '');
  const at = (t) => { const i = exec.indexOf(t); assert.ok(i > 0, `the executor holds: ${t}`); return i; };
  const takenAt = at('const taken = await script(SYSTEM_FINGERPRINT_SNAPSHOT_SQL);');
  const sealedAt = at('const sealed = await query(SYSTEM_FINGERPRINT_SEAL_SQL);');
  const stepsAt = at('for (const { name, sql } of steps) {');
  const resealedAt = at('const resealed = await query(SYSTEM_FINGERPRINT_SEAL_SQL);');
  const movedAt = at("if (resealed.rows?.length !== 1 || resealed.rows[0].seal !== seal) {");
  const ceilingAt = at('const probe = await script(CEILING_PROBE_SQL);');
  assert.ok(takenAt < sealedAt && sealedAt < stepsAt && stepsAt < resealedAt && resealedAt < movedAt && movedAt < ceilingAt,
    'fingerprint, seal, every step, the seal again and its comparison, then the probes');
  assert.match(exec.slice(takenAt, stepsAt), /if \(taken\.error\) \{[^\n]*return 1; \}\n[\s\S]*if \(!seal \|\| !\/\^\[1-9\]\\d\*:\[0-9a-f\]\{32\}\$\/\.test\(seal\)\) \{[^\n]*return 1; \}/, 'no fingerprint, or an empty one, fails the target');
  assert.match(exec.slice(movedAt, ceilingAt), /^[^\n]*\n\s+stderr\.write\([^\n]*\);\n\s+return 1;\n\s+\}/, 'and a moved seal fails it');
  // THE REFERENCE OUT OF THE DATABASE'S REACH (batch 129's review round; C0 F1: a view swapped in for the table
  // answered the seal query with the old rows and the probe with new ones, and every layer was green). The rows
  // are read into the executor's memory before the first migration, the table must hold exactly them, and
  // after the last migration they are read again from the catalogs and compared in JavaScript; the table's
  // identity is read before and after.
  const identityAt = at('const relation = await query(SYSTEM_FINGERPRINT_RELATION_SQL);');
  const beforeAt = at('const before = await readRows(SYSTEM_FINGERPRINT_READ_SQL);');
  const heldAt = at('const held = await readRows(SYSTEM_FINGERPRINT_TABLE_READ_SQL);');
  const unheldAt = at('const unheld = diffSystemFingerprint(held.rows, before.rows);');
  const identityAfterAt = at('const relationAfter = await query(SYSTEM_FINGERPRINT_RELATION_SQL);');
  const afterAt = at('const after = await readRows(SYSTEM_FINGERPRINT_READ_SQL);');
  const comparedAt = at('const moved = diffSystemFingerprint(before.rows, after.rows);');
  assert.ok(sealedAt < identityAt && identityAt < beforeAt && beforeAt < heldAt && heldAt < unheldAt && unheldAt < stepsAt
    && movedAt < identityAfterAt && identityAfterAt < afterAt && afterAt < comparedAt && comparedAt < ceilingAt,
    'the identity, the rows and the table read before the first migration; the identity and the rows again after the last, then compared, before the probes');
  assert.match(exec.slice(identityAt, beforeAt), /if \(!identity \|\| !SYSTEM_FINGERPRINT_RELATION_SHAPE\.test\(identity\)\) \{[^\n]*return 1; \}/, 'a table that is not one plain table fails the target');
  assert.match(exec.slice(unheldAt, stepsAt), /^[^\n]*\n\s+if \(unheld\.length\) \{[^\n]*return 1; \}/, 'and so does a table that does not hold what the catalogs read');
  assert.match(exec.slice(identityAfterAt, afterAt), /if \(identityAfter !== identity\) \{\n\s+stderr\.write\([^\n]*\);\n\s+return 1;\n\s+\}/, 'a replaced table fails it');
  assert.match(exec.slice(comparedAt, ceilingAt), /^[^\n]*\n\s+if \(moved\.length\) \{\n\s+stderr\.write\([^\n]*\);\n\s+return 1;\n\s+\}/, 'and any initdb object not as it was fails it');
  assert.equal(m.SYSTEM_FINGERPRINT_READ_SQL, `begin;\nset local search_path = pg_catalog;\n${fp};\nrollback;\n`, 'read by the same text, under the same search_path, as the fingerprint was taken');
  assert.match(m.SYSTEM_FINGERPRINT_RELATION_SQL, /from pg_catalog\.pg_class c join pg_catalog\.pg_namespace n on n\.oid = c\.relnamespace\n\s+where n\.nspname = 'catalog_baseline' and c\.relname = 'system_fingerprint'$/, 'the identity read from pg_class, not from the relation');
  for (const ok of ['16390 r rules=f triggers=f rls=f owner=10']) assert.match(ok, m.SYSTEM_FINGERPRINT_RELATION_SHAPE);
  for (const bad of ['16390 v rules=f triggers=f rls=f owner=10', '16390 r rules=t triggers=f rls=f owner=10', '16390 r rules=f triggers=t rls=f owner=10',
    '16390 r rules=f triggers=f rls=t owner=10', '16390 p rules=f triggers=f rls=f owner=10', '']) assert.doesNotMatch(bad, m.SYSTEM_FINGERPRINT_RELATION_SHAPE, `refused: ${bad}`);
  // The comparison, pure, on synthetic rows: each way a row can move is named as the probe names it.
  const row = (kind, objoid, ident, fp) => ({ kind, objoid: String(objoid), ident, fp });
  const base = [row('function', 1, 'pg_catalog.f(integer)', 'a'), row('relation', 2, 'information_schema.v', 'b'), row('schema', 3, 'information_schema', 'c')];
  assert.deepEqual(m.diffSystemFingerprint(base, base), [], 'the same rows: nothing');
  assert.deepEqual(m.diffSystemFingerprint(base, [...base].reverse()), [], 'in any order');
  assert.deepEqual(m.diffSystemFingerprint(base, [row('function', 1, 'pg_catalog.f(integer)', 'a2'), base[1], base[2]]), ['function pg_catalog.f(integer) [changed]']);
  assert.deepEqual(m.diffSystemFingerprint(base, [row('function', 1, 'pg_catalog.g(integer)', 'a'), base[1], base[2]]), ['function pg_catalog.f(integer) [renamed to pg_catalog.g(integer)]']);
  assert.deepEqual(m.diffSystemFingerprint(base, [base[0], row('relation', 2, 'public.v', 'b2'), base[2]]), ['relation information_schema.v [renamed to public.v] [changed]']);
  assert.deepEqual(m.diffSystemFingerprint(base, [base[0], base[2]]), ['relation information_schema.v [gone]']);
  assert.deepEqual(m.diffSystemFingerprint(base, [...base, row('language', 4, 'plx', 'd')]), ['language plx [not in the fingerprint]']);
  assert.deepEqual(m.diffSystemFingerprint(base, [...base, base[0]]), ['function pg_catalog.f(integer) [read twice after]']);
  assert.deepEqual(m.diffSystemFingerprint(base, [row('function', 1, 'pg_catalog.f(integer)', 'a2'), row('relation', 9, 'information_schema.v', 'b')]),
    ['function pg_catalog.f(integer) [changed]', 'relation information_schema.v [gone]', 'relation information_schema.v [not in the fingerprint]', 'schema information_schema [gone]'],
    'sorted, and keyed by kind and OID: the same name under another OID is a row gone and a row new');
  // AND THE DEFINER PROBE READS EXTENSION MEMBERS (batch 128; A1 N2 on 127's re-check).
  assert.deepEqual(m.EXTENSION_DEFINER_FUNCTIONS, [], 'no SECURITY DEFINER extension member, measured at batch 128');
  assert.match(m.SECURITY_DEFINER_PROBE_SQL, /join pg_catalog\.pg_depend d on d\.classid = 'pg_catalog\.pg_proc'::pg_catalog\.regclass and d\.objid = p\.oid and d\.deptype = 'e'\n\s+join pg_catalog\.pg_extension e on d\.refclassid = 'pg_catalog\.pg_extension'::pg_catalog\.regclass and e\.oid = d\.refobjid\n\s+where p\.prosecdef and \(n\.nspname not in \('pg_catalog', 'information_schema'\) or p\.oid >= 16384\)\n/,
    'every SECURITY DEFINER extension member, in every schema the first rule reads, and any made after initdb in a system schema (C0 X5, Q0 ISF)');
  // THE HELPERS THE POLICIES CALL, BY BODY (C0 F4): pinned like the definer functions, and every function a
  // policy depends on is pinned somewhere.
  assert.match(m.POLICY_HELPER_PROBE_SQL, /md5\(p\.prosrc\) <> pin\.digest/, 'body digests (C0 X1)');
  assert.match(m.POLICY_HELPER_PROBE_SQL, /where d\.classid = 'pg_catalog\.pg_policy'::pg_catalog\.regclass and d\.refclassid = 'pg_catalog\.pg_proc'::pg_catalog\.regclass\n\s+and \(n\.nspname not in \('pg_catalog', 'information_schema'\) or p\.oid >= 16384\)\n/,
    'every function any policy depends on, in every schema but the system ones, and any made after initdb in one (Q0 F1 on 128)');
  assert.deepEqual(m.POLICY_HELPER_FUNCTIONS.map(([f]) => f.split('(')[0]),
    ['app.member_scope_admits_business', 'app.member_scope_admits_page', 'app.member_scope_covers_business', 'app.member_scope_covers_page', 'app.member_scope_is_narrowed'],
    'the four helpers the policies call and the one two of them call, measured at batch 127\'s review round');
  assert.deepEqual(m.POLICY_PLATFORM_FUNCTIONS, ['auth.uid()'], 'the platform\'s one function the policies call');
  // THE MEMBER-SCOPE NARROWINGS, BY EXACT DEPARSE (C0 F3): all thirty-three, not only 091's two.
  const narrowings = Object.keys(m.PINNED_POLICIES).filter((k) => /_scope_narrow/.test(k));
  assert.equal(narrowings.length, 33, 'thirty-three member-scope narrowings, measured from the catalog at batch 127\'s review round');
  for (const k of narrowings) {
    const p = m.PINNED_POLICIES[k];
    assert.equal(p.cmd, '*', `${k}: FOR ALL`);
    assert.equal(p.using, p.check, `${k}: both halves the same text, as measured`);
    assert.match(p.using, /app\.member_scope_admits_(business|page)\(|FROM app\.[a-z_]+ /,
      `${k}: it calls a pinned helper, or reads a parent table whose own narrowing applies under its row level security`);
    // NO DISJUNCTION AND NO CONSTANT (batch 128; Q0 N4 on 127's re-check). The match above is a substring:
    // with `... OR true` written into the pin and a later file together (digests refreshed), it still
    // matched, migrate-clean compared the weakened text with the weakened pin, and rls-smoke had no row
    // outside a narrowed member's scope on content_ideas, publish_target_assets, research_evidence and
    // research_suggestions, so every layer stayed green. A narrowing is a conjunction of scope tests: no
    // pinned narrowing may contain the word OR, TRUE or NOT anywhere (a disjunct, a constant branch such as
    // `ELSE true` or `coalesce(..., true)`, or a negation). Measured at batch 128: none of the 33 does, but
    // quota_buckets, whose one disjunction is its decision (a workspace-wide bucket has no Business, so no
    // scope narrows it) and is held here by its whole text. A constant spelled another way (`1 = 1`) is
    // not read by this test; the pinned policy probe and the digest hold the text, and rls-smoke the rows.
    const words = (p.using.match(/\b(or|true|not)\b/gi) ?? []).map((w) => w.toUpperCase());
    if (k === 'quota_buckets.quota_buckets_scope_narrows_member') {
      assert.equal(p.using, '((business_profile_id IS NULL) OR app.member_scope_admits_business(workspace_id, business_profile_id))',
        `${k}: its one disjunction, exactly as measured`);
      assert.deepEqual(words, ['OR'], `${k}: one OR, and no constant or negation`);
    } else {
      assert.deepEqual(words, [], `${k}: no OR, TRUE or NOT in a narrowing (Q0 N4 on 127's re-check)`);
    }
  }
  assert.match(m.PINNED_CHECK_PROBE_SQL, /con\.convalidated\s+and pg_catalog\.pg_get_constraintdef\(con\.oid\) = pin\.def/, 'CHECKs compared by TEXT and validated (Q0 on 123, F1)');
  assert.deepEqual(Object.keys(m.PINNED_CHECKS).sort(), ['approval_requests.approval_requests_decided_after_created', 'approval_requests.approval_requests_decider_is_a_pair', 'approval_requests.approval_requests_decision_has_a_decider'],
    '090\'s equivalence and 123\'s pair, which together make a cancelled, pending or expired request name no decider, and 126\'s order of creation and decision');
  assert.match(m.SECURITY_DEFINER_PROBE_SQL, /where p\.prosecdef and \(n\.nspname not in \('pg_catalog', 'information_schema'\) or p\.oid >= 16384\)\n\s+and not exists \(select 1 from pg_catalog\.pg_depend d/, 'every schema (A1 F3, Q0 F3), and a function made after initdb in a system one (C0 X5, Q0 ISF on 128)');
  assert.match(m.SECURITY_DEFINER_PROBE_SQL, /md5\(p\.prosrc\) <> pin\.digest/, 'body digests (A1 F2)');
  assert.match(m.SECURITY_DEFINER_PROBE_SQL, /has_function_privilege\('public', p\.oid, 'EXECUTE'\)/, 'no EXECUTE for PUBLIC (A1 F3)');
  assert.doesNotMatch(m.SECURITY_DEFINER_PROBE_SQL, /array_to_string\(p\.proconfig/, 'settings compared, never printed (A1 F5)');
  assert.match(m.TRIGGER_PROBE_SQL, /where n\.nspname not in \('pg_catalog', 'information_schema'\) and t\.tgenabled <> 'O';/, 'internal triggers included (C0 M2)');
  assert.match(m.TRIGGER_PROBE_SQL, /pg_catalog\.pg_get_triggerdef\(t\.oid\) as def/, 'definitions by TEXT (C0 M1)');
  assert.match(m.TRIGGER_PROBE_SQL, /session_replication_role=%/, 'no default session_replication_role (Q0 F5)');
  assert.deepEqual(m.PINNED_EVENT_TRIGGERS, [], 'no event trigger, measured at batch 129');
  assert.match(m.TRIGGER_PROBE_SQL, /from pg_catalog\.pg_event_trigger e\n\s+where not \(e\.evtname::text = any \(array\[\]::text\[\]\)\);/, 'every event trigger, enabled or not, none pinned (A1 R3 on 129)');
  assert.match(m.TRIGGER_PROBE_SQL, /pg_inherits i where i\.inhparent = c\.oid or i\.inhrelid = c\.oid/, 'no child, no partitions (A1 F2)');
  assert.match(m.TRIGGER_PROBE_SQL, /from pg_catalog\.pg_parameter_acl p\s+cross join lateral pg_catalog\.aclexplode\(p\.paracl\) a[\s\S]*where p\.parname = 'session_replication_role' and not coalesce\(r\.rolsuper, false\);/,
    'no parameter grant of session_replication_role to a non-superuser (blocker 186 item 14; A1 V3 on 125)');
  assert.match(m.PINNED_TRIGGER_PROBE_SQL, /where not t\.tgisinternal[\s\S]*'unpinned: ' \|\| f\.def/, 'every non-internal trigger on a pinned table, an unpinned one by name (Q0 F3 on 125)');
  assert.match(m.PINNED_TRIGGER_PROBE_SQL, /md5\(p\.prosrc\) <> pin\.digest/, 'the functions they run, by body digest (Q0 F3, F8 on 125)');
  assert.match(m.PINNED_TRIGGER_PROBE_SQL, /pg_get_userbyid\(p\.proowner\) <> case when pin\.owner = 'migration owner' then current_user::text else pin\.owner end\n\s+then ' \[owner is not the pinned owner\]'/,
    'and by owner (Q0 F8 on 126)');
  assert.ok(m.PINNED_TRIGGER_FUNCTIONS.every((row) => row.length === 4 && row[3].length > 0), 'every pinned trigger function names its owner');
  assert.deepEqual(m.PINNED_NOT_NULL, ['app.approval_requests.created_at'], 'the column 126\'s order CHECK reads that must never be NULL (Q0 F8 on 126)');
  assert.match(m.PINNED_CHECK_PROBE_SQL, /and a\.attname = split_part\(pin\.k, '\.', 3\) and a\.attnum > 0 and not a\.attisdropped and a\.attnotnull\);/, 'read from attnotnull');
  assert.match(m.REWRITE_RULE_PROBE_SQL, /where n\.nspname in \('app', 'private'\)\n\s+and not \(r\.rulename = '_RETURN' and c\.relkind in \('v', 'm'\)\);/,
    'no rewrite rule in app or private but a view\'s _RETURN (Q0 F5 on 126)');
  // EVERY TABLE IN app AND private SINCE THE OWED-TOOLING BATCH (A1 R-2 on batch 170's re-check: a BEFORE UPDATE
  // trigger on app.workspaces writing NEW.lifecycle_state passed every layer while only approval_requests was
  // read). The probe reads every non-internal trigger on a table in those two schemas, not a pinned table list.
  assert.equal((m.PINNED_TRIGGER_PROBE_SQL.match(/where not t\.tgisinternal\n\s+and n\.nspname in \('app', 'private'\)/g) ?? []).length, 2,
    'both rules read every table in app and private: the trigger set, and the functions those triggers run');
  assert.doesNotMatch(m.PINNED_TRIGGER_PROBE_SQL, /= any \(array\['app\.approval_requests'\]\)/, 'and no longer a list of pinned tables');
  assert.match(m.PINNED_TRIGGER_PROBE_SQL, /where t\.tgisinternal\n\s+and n\.nspname in \('app', 'private'\)\n\s+and not \(pn\.nspname = 'pg_catalog' and con\.contype = 'f'\n\s+and \(\(con\.conrelid = t\.tgrelid and p\.proname in \('RI_FKey_check_ins', 'RI_FKey_check_upd'\)\)\n\s+or \(con\.confrelid = t\.tgrelid and p\.proname in \('RI_FKey_noaction_del', 'RI_FKey_noaction_upd'\)\)\)\);/,
    'and every INTERNAL trigger there is one of its table\'s FK checks, so a trigger marked internal in pg_catalog is named (A1-OT-1)');
  assert.ok(m.PINNED_TABLE_TRIGGERS['app.approval_requests'].includes('CREATE TRIGGER set_decided_at BEFORE INSERT OR UPDATE ON app.approval_requests FOR EACH ROW EXECUTE FUNCTION private.set_decided_at()'),
    'the table whose decision time is the database\'s is still pinned');
  assert.deepEqual(m.PINNED_TABLE_TRIGGERS['app.workspaces'], ['CREATE TRIGGER set_updated_at BEFORE UPDATE ON app.workspaces FOR EACH ROW EXECUTE FUNCTION private.set_updated_at()'],
    'app.workspaces carries set_updated_at and nothing else: no trigger writes lifecycle_state');
  assert.deepEqual(m.PINNED_TRIGGER_FUNCTIONS.map(([f]) => f), ['private.refuse_mutation()', 'private.set_decided_at()', 'private.set_deleted_at()', 'private.set_updated_at()'],
    'the four functions the 51 triggers run, each pinned');
  for (const [f, security, digest, owner] of m.PINNED_TRIGGER_FUNCTIONS.filter(([, s]) => s === 'definer')) {
    assert.deepEqual([f, owner, digest], m.SECURITY_DEFINER_FUNCTIONS.find(([g]) => g === f), `${f}: its definer pin is the security definer probe's, one text`);
  }
  // The pinned list, re-derived from the migration text: every `create trigger <name> ... on <table>` in app or
  // private, by (table, name), is exactly the pinned set, so a trigger a migration adds without its pin fails
  // here before a database (and the probe names it at migrate-clean).
  {
    const fromText = new Set();
    for (const name of (await readdir('db/foundation/migrations')).filter((n) => n.endsWith('.sql'))) {
      const code = (await readFile(`db/foundation/migrations/${name}`, 'utf8')).replace(SQL_LINE_COMMENTS, '');
      for (const t of code.matchAll(/create\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+(\w+)\s+(?:before|after|instead\s+of)[^;]*?\bon\s+((?:app|private)\.\w+)/gi)) fromText.add(`${t[2]}:${t[1]}`);
    }
    const pinned = Object.entries(m.PINNED_TABLE_TRIGGERS).flatMap(([t, defs]) => defs.map((d) => `${t}:${d.split(' ')[2]}`));
    assert.deepEqual([...fromText].sort(), [...pinned].sort(), 'the triggers the migrations create are exactly the pinned ones, by table and name');
    assert.equal(pinned.length, 51, 'fifty-one, measured on the clean set through 170');
    for (const [t, defs] of Object.entries(m.PINNED_TABLE_TRIGGERS)) {
      for (const d of defs) assert.match(d, new RegExp(`^CREATE TRIGGER \\w+ (?:BEFORE|AFTER) [A-Z ]+ ON ${t.replace('.', '\\.')} FOR EACH (?:ROW|STATEMENT) EXECUTE FUNCTION private\\.\\w+\\(\\)$`), `${t}: a pg_get_triggerdef text`);
    }
  }
  // The grant probe is an ALLOWLIST read from the catalog (C0 H1, A1 R3 on 091's third round): every
  // non-superuser role, every table privilege MAINTAIN included on 17+, every column privilege, each
  // compared both ways against the pinned set.
  assert.equal((m.PINNED_GRANT_PROBE_SQL.match(/^    select rolname as r from pg_catalog\.pg_roles where not rolsuper and rolname !~ '\^pg_'\n  \), /gm) ?? []).length, 2,
    'every role but superusers and predefined roles, not a named list, at table and at column level, each role CTE anchored to its end of line so no condition can be appended to it (Q0 Q-5 on the batch 170 draft: a condition dropping anon passed a prefix match)');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'\][\s\S]*then array\['MAINTAIN'\]/, 'every table privilege, MAINTAIN on 17+ (A1 R1)');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /unnest\(array\['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'\]\) as p\(p\), \(values \(''\), \(' WITH GRANT OPTION'\)\) as go\(opt\)\n\s+where pg_catalog\.has_column_privilege\(roles\.r, cols\.rel, cols\.attnum, p\.p \|\| go\.opt\)/,
    'every column, by the effective privilege, all four column privileges, each with and without grant option (Q0 F7, C0 F3, A1 F3 on 126)');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /from roles, tabs, tprivs, \(values \(''\), \(' WITH GRANT OPTION'\)\) as go\(opt\)\n\s+where pg_catalog\.has_table_privilege\(roles\.r, tabs\.t::regclass, tprivs\.p \|\| go\.opt\)/,
    'every table privilege with and without grant option');
  assert.ok(!Object.values(m.PINNED_GRANTS).some((roles) => JSON.stringify(roles).includes('GRANT OPTION')), 'and no grant option is ever pinned');
  // Its first rule since the batch 170 draft: the TABLE list is closed, both ways, over app and private.
  assert.match(m.PINNED_GRANT_PROBE_SQL, /^do \$\$\ndeclare\n  offending text;\nbegin\n  select string_agg\(x, ', ' order by x\) into offending from \(\n    select 'unpinned: ' \|\| format\('%s\.%s', n\.nspname, c\.relname\) as x\n[^\n]*\n     where n\.nspname in \('app', 'private'\) and c\.relkind in \('r', 'p'\)\n[\s\S]*?select 'pinned but absent: ' \|\| tabs\.t [\s\S]*?raise exception 'app or private table\(s\) not exactly the pinned grant table list: %'/,
    'its first rule: every table in app and private is pinned and every pinned table exists (the batch 170 draft)');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /raise exception 'app or private table\(s\) not exactly the pinned grant table list: %', offending;\n  end if;\n  select string_agg\(format\('%s \(owner %s\)'[\s\S]*where not exists \(select 1 from pg_catalog\.pg_roles o where o\.oid = c\.relowner and o\.rolsuper\);\n  if offending is not null then\n    raise exception 'pinned table\(s\) owned by a role that is not a superuser/,
    'its second rule: the owner the role set leaves out is a superuser, stated rather than assumed (C0 F5 on 126)');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /where pg_catalog\.has_column_privilege\(roles\.r, cols\.rel, cols\.attnum, p\.p \|\| go\.opt\)\n\s+and not pg_catalog\.has_table_privilege\(roles\.r, cols\.rel, p\.p \|\| go\.opt\)\n\s+\), pinned as/,
    'a column privilege is read unless a table-level privilege, with the same grant option, already implies it (the table-level rule reads that one)');
  assert.equal((m.PINNED_GRANT_PROBE_SQL.match(/'unlisted: ' \|\| f\.g/g) ?? []).length, 3, 'an unlisted grant named at both levels, and an unlisted schema privilege (rule 7, the owed-tooling batch)');
  // Batch 170's review round (A1 R1, R2; Q0 Q-1, Q-2, Q-5): the three premises of the reading are rules.
  assert.match(m.PINNED_GRANT_PROBE_SQL, /union all\n    select 'not a table: ' \|\| format\('%s\.%s \(relkind %s\)', n\.nspname, c\.relname, c\.relkind\)\n\s+from pg_catalog\.pg_class c join pg_catalog\.pg_namespace n on n\.oid = c\.relnamespace\n\s+where n\.nspname in \('app', 'private'\) and c\.relkind in \('v', 'm', 'f'\)\n  \) d;\n  if offending is not null then\n    raise exception 'app or private table\(s\) not exactly the pinned grant table list: %'/,
    'the first rule also names every view, materialized view and foreign table in app and private (A1 R2 d05b, d06; Q0 Q-2 T07)');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /select string_agg\(r\.rolname::text, ', ' order by r\.rolname\) into offending\n\s+from pg_catalog\.pg_roles r\n\s+where r\.rolsuper and r\.rolname <> session_user;\n  if offending is not null then\n    raise exception 'superuser role\(s\) other than the migration owner/,
    'no superuser but the migration owner, whom the role set leaves out (A1 R1 d01; Q0 G18, Q-5)');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /with recursive reach\(member, roleid\) as \(\n\s+select r\.rolname::text, m\.roleid\n\s+from pg_catalog\.pg_roles r join pg_catalog\.pg_auth_members m on m\.member = r\.oid\n\s+where not r\.rolsuper and r\.rolname !~ '\^pg_'\n\s+union\n\s+select reach\.member, m\.roleid\n\s+from reach join pg_catalog\.pg_auth_members m on m\.member = reach\.roleid\n\s+\)[\s\S]*?where not \(x = any \(array\[\]::text\[\]\)\);\n  if offending is not null then\n    raise exception 'role membership\(s\) of a non-superuser role not pinned/,
    'every non-superuser, non-pg_* role\'s memberships, recursively and whatever the option, none pinned (A1 R1 d03, d04b; Q0 G17, Q-1)');
  assert.deepEqual(m.PINNED_ROLE_MEMBERSHIPS, [], 'no non-superuser role is a member of another, measured in batch 170\'s review round');
  // The owed-tooling batch (A1 S1, Q0 R-2, A1 S3 on batch 170-assert's re-check): the schemas' owner and every
  // non-superuser role's USAGE and CREATE on them (rule 7), and every non-superuser role's attributes and every
  // default privilege entry (rule 8).
  assert.match(m.PINNED_GRANT_PROBE_SQL, /from unnest\(array\['app', 'private'\]\) as s\(s\) left join pg_catalog\.pg_namespace n on n\.nspname = s\.s\n\s+where n\.oid is null or n\.nspowner <> \(select o\.oid from pg_catalog\.pg_roles o where o\.rolname = session_user\)/,
    'rule 7: app and private exist and are owned by the migration owner (A1 S1: `alter schema private owner to app_command` passed every layer)');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /unnest\(array\['USAGE', 'CREATE'\]\) as p\(p\),\n\s+\(values \(''\), \(' WITH GRANT OPTION'\)\) as go\(opt\)\n\s+where not r\.rolsuper and r\.rolname !~ '\^pg_' and pg_catalog\.has_schema_privilege\(r\.rolname, s\.s, p\.p \|\| go\.opt\)\) f/,
    'rule 7: every non-superuser role\'s USAGE and CREATE on both, with and without grant option');
  assert.deepEqual(m.PINNED_SCHEMA_PRIVILEGES, ['app_authz USAGE on app', 'app_worker USAGE on app', 'authenticated USAGE on app'], 'measured on the clean set through 170: USAGE on app for three roles, nothing on private, no CREATE');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /\(values \('rolbypassrls', r\.rolbypassrls\), \('rolcanlogin', r\.rolcanlogin\), \('rolcreatedb', r\.rolcreatedb\),\n\s+\('rolcreaterole', r\.rolcreaterole\), \('rolinherit', r\.rolinherit\), \('rolreplication', r\.rolreplication\)\) as a\(a, v\)\n\s+where not r\.rolsuper and r\.rolname !~ '\^pg_' and a\.v/,
    'rule 8: the six attributes of every non-superuser, non-pg_* role, each pinned false (Q0 R-2, A1 S3: app_worker BYPASSRLS was held by rls-smoke alone)');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /from pg_catalog\.pg_default_acl d left join pg_catalog\.pg_namespace n on n\.oid = d\.defaclnamespace\n\s+\) d;\n  if offending is not null then\n    raise exception 'a non-superuser role holds an attribute pinned false, or a default privilege entry exists/,
    'rule 8: and no default privilege entry at all, whoever it grants to (A1 S3)');
  assert.equal((m.PINNED_GRANT_PROBE_SQL.match(/'missing: ' \|\| p\.g/g) ?? []).length, 3, 'and a missing one, at both levels and on a schema');
  // EVERY TABLE AND EVERY ROLE, AS DATA (the batch 170 draft; plan (a)). The pinned list is the lint file,
  // one entry per table, and its tables are exactly the tables the migrations create in app and private.
  {
    const file = JSON.parse(await readFile(m.PINNED_GRANTS_FILE, 'utf8'));
    assert.deepEqual(m.PINNED_GRANTS, file.tables, 'the probe reads the lint file and nothing else');
    // WHAT IT WAS MEASURED ON (the owed-tooling batch; C0-170-3, A1 F170-3, Q0-F5 on batch 170: the text said
    // "through 140" after 150 and 170 had changed the grants). The generator now writes the last migration's
    // name and the server version it read; both files carry exactly that text over the CURRENT last migration,
    // so a batch that adds a migration without regenerating them fails here, by name.
    const gen = await import('../../scripts/db/generate-pinned-grants.mjs');
    const exceptionsFile = JSON.parse(await readFile(m.READ_ALLOWLIST_EXCEPTIONS_FILE, 'utf8'));
    const last = (await readdir('db/foundation/migrations')).filter((n) => n.endsWith('.sql')).sort().at(-1);
    assert.equal(gen.lastMigration(), last, 'the generator names the last migration in the directory');
    const version = file._how_measured.match(/, PostgreSQL (\d+\.\d+)\)/)?.[1];
    assert.ok(version, 'and the server version it measured on');
    assert.equal(file._how_measured, gen.grantsDoc(gen.measuredOn(last, version))._how_measured, `pinned-grants.json says it was measured through ${last}`);
    assert.equal(exceptionsFile._how_measured, gen.exceptionsDoc(gen.measuredOn(last, version))._how_measured, `and so does the known-exceptions file`);
    assert.doesNotMatch(await readFile('scripts/db/generate-pinned-grants.mjs', 'utf8'), /through 1[0-9]0\b/, 'the generator carries no migration number of its own');
    const created = new Set();
    for (const name of (await readdir('db/foundation/migrations')).filter((n) => n.endsWith('.sql'))) {
      for (const t of (await readFile(`db/foundation/migrations/${name}`, 'utf8')).matchAll(/^create table if not exists ((?:app|private)\.[a-z_]+)/gm)) created.add(t[1]);
    }
    assert.deepEqual(Object.keys(m.PINNED_GRANTS), [...created].sort(), 'one entry per table the migrations create in app and private, sorted');
    assert.equal(created.size, 66, 'sixty-six tables at the batch 170 draft');
    for (const [table, roles] of Object.entries(m.PINNED_GRANTS)) {
      assert.deepEqual(Object.keys(roles), Object.keys(roles).sort(), `${table}: roles sorted`);
      for (const [role, privs] of Object.entries(roles)) {
        assert.ok(role !== 'postgres' && !/^pg_/.test(role), `${table}: ${role} is a non-superuser, non-predefined role`);
        assert.ok(Object.keys(privs).length > 0 && Object.keys(privs).every((k) => ['table', 'SELECT', 'INSERT', 'UPDATE', 'REFERENCES'].includes(k)), `${table}: ${role} lists table-level privileges and the four column privileges only`);
        for (const [k, v] of Object.entries(privs)) assert.ok(Array.isArray(v) && v.length > 0 && new Set(v).size === v.length, `${table}: ${role} ${k} is a non-empty list with no repeat`);
        for (const p of privs.table ?? []) assert.ok(!privs[p], `${table}: ${role}'s table-level ${p} is not also listed by column`);
      }
    }
    // The roles no rule read before the draft are now read and hold, measured, nothing.
    const holders = new Set(Object.values(m.PINNED_GRANTS).flatMap((roles) => Object.keys(roles)));
    assert.deepEqual([...holders].sort(), ['app_authz', 'app_worker', 'authenticated'], 'measured at the draft: only these three roles hold anything on any table; anon, service_role, app_command and app_maintenance hold nothing');
  }
  {
    const migration = await readFile('db/foundation/migrations/091_calendar.sql', 'utf8');
    for (const table of ['app.calendar_items', 'app.content_schedules']) {
      const { authenticated, ...others } = m.PINNED_GRANTS[table];
      assert.deepEqual(others, {}, `no role but authenticated holds anything on ${table}`);
      for (const priv of ['SELECT', 'INSERT', 'UPDATE']) {
        const written = migration.match(new RegExp(`grant ${priv.toLowerCase()} \\(([^)]*)\\)\\s+on ${table.replace('.', '\\.')} to authenticated;`));
        assert.ok(written, `091 writes one ${priv} grant on ${table}`);
        assert.deepEqual(authenticated[priv], written[1].split(',').map((c) => c.trim()), `the pinned ${priv} columns on ${table} are 091's grant as written`);
      }
      assert.deepEqual([authenticated.table ?? [], authenticated.REFERENCES ?? []], [[], []], `no table-level grant and no REFERENCES on ${table}`);
    }
  }
  // THE READ ALLOWLIST (the batch 170 draft; RFC-2026-021 §8.1, §8.2, §8.5). The allowlist is an empty array
  // on approval, and stays one; an entry, when one is written, carries every field §8.1 names, `caller`
  // included. The known exceptions are authenticated base-table grants read by column, each from a
  // migration that grants it, sorted and without repeat.
  {
    assert.deepEqual(JSON.parse(await readFile(m.READ_ALLOWLIST_FILE, 'utf8')), [], 'read-allowlist.json is an empty array (RFC-2026-021 §8.1, §7/3)');
    for (const e of m.READ_ALLOWLIST) {
      assert.deepEqual(Object.keys(e).sort(), ['base_tables', 'batch', 'caller', 'columns', 'roles', 'rfc', 'sensitivity', 'view'], 'an entry is exactly §8.1\'s fields');
      assert.ok(typeof e.caller === 'string' && e.caller.length > 0, 'C1 as a required field: an entry that cannot name its caller cannot be written');
      assert.ok(!e.roles.includes('anon'), '§7/4: anon is granted nothing');
    }
    const exc = m.READ_ALLOWLIST_EXCEPTIONS;
    assert.equal(exc.length, 41, 'forty-one inherited authenticated base-table grants, measured at the draft');
    assert.deepEqual(exc.map((e) => e.relation), exc.map((e) => e.relation).sort(), 'sorted by relation');
    assert.equal(new Set(exc.map((e) => `${e.role} ${e.relation}`)).size, exc.length, 'no repeat');
    for (const e of exc) {
      assert.deepEqual([e.role, e.level], ['authenticated', 'columns'], `${e.relation}: authenticated, by column grants (no table-wide SELECT, §8.4)`);
      assert.ok(e.granted_by.length > 0, `${e.relation}: names the migration that grants it`);
      for (const f of e.granted_by) {
        const sql = (await readFile(`db/foundation/migrations/${f}`, 'utf8')).replace(SQL_LINE_COMMENTS, '');
        assert.match(sql, new RegExp(`grant\\s+[^;]*select[^;]*\\s+on\\s+(?:table\\s+)?${e.relation.replace('.', '\\.')}\\s+to\\s+[^;]*authenticated`, 'i'), `${e.relation}: ${f} grants it SELECT`);
      }
    }
    assert.deepEqual(Object.entries(m.PINNED_GRANTS).filter(([, r]) => r.authenticated?.SELECT || r.authenticated?.table?.includes('SELECT') || r.anon).map(([t]) => t), exc.map((e) => e.relation),
      'the exceptions are exactly the client SELECT grants the pinned grant list holds');
    assert.match(m.READ_ALLOWLIST_PROBE_SQL, /where \(\(n\.nspname not in \('pg_catalog', 'information_schema'\) and n\.nspname !~ '\^pg_'\) or c\.oid >= 16384\) and c\.relkind in \('r', 'p', 'v', 'm', 'f'\)\n\s+and pg_catalog\.has_any_column_privilege\(cr\.r, c\.oid, 'SELECT'\)/,
      'every relation in any schema but the system ones, or made after initdb, that a client role can SELECT from');
    assert.match(m.READ_ALLOWLIST_PROBE_SQL, /unnest\(array\['anon', 'authenticated', 'public'\]\) as cr\(r\)/, 'anon, authenticated and PUBLIC');
    assert.match(m.READ_ALLOWLIST_PROBE_SQL, /case when c\.relkind not in \('r', 'p'\) then 'view'\n\s+when pg_catalog\.has_table_privilege\(cr\.r, c\.oid, 'SELECT'\) then 'table' else 'columns' end/, 'the level: a view, a table-wide SELECT or column grants');
    assert.equal((m.READ_ALLOWLIST_PROBE_SQL.match(/raise exception/g) ?? []).length, 2, 'two rules: a grant on no list, and a list row with no grant');
  }
  // THE CLASSIFICATION REGISTRY (the batch 170 draft; plan (c); ERD §5, §9.1). Every table the migrations
  // create, each with its §5 classes verbatim; a class only where §5 gives one or §9.1/§9.2 names the
  // table's content as a refused class's example; every mixed row it leaves open is a finding.
  {
    const reg = m.DATA_CLASSIFICATION;
    const classes = ['PUBLIC-0', 'TENANT-1', 'PII-2', 'CONTENT-2', 'MEDIA-2', 'INTEGRATION-2', 'PROVIDER-3', 'AUTH-3', 'FIN-3', 'RIGHTS-3', 'COPYRIGHT-3', 'INTERNAL-3', 'SECRET-4', 'SECURITY-4'];
    const erd = await readFile('docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md', 'utf8');
    for (const c of classes) assert.ok(erd.includes(`| \`${c}\` |`), `${c} is a §9.1 class`);
    assert.deepEqual(Object.keys(reg.tables), Object.keys(m.PINNED_GRANTS), 'the registry classifies exactly the tables the migrations create, in the same order');
    assert.deepEqual(m.REFUSED_CLASSES, ['SECRET-4', 'PROVIDER-3', 'INTERNAL-3'], 'the three classes the plan names');
    for (const [t, e] of Object.entries(reg.tables)) {
      assert.ok(e.erd_classes.length > 0 && e.erd_classes.every((c) => classes.includes(c)), `${t}: its §5 classes are §9.1 classes`);
      const line = Number(e.family.match(/:(\d+)\)$/)?.[1]);
      assert.ok(erd.split('\n')[line - 1]?.includes(`| ${e.erd_classes.join('/')} |`), `${t}: the §5 row it cites carries exactly ${e.erd_classes.join('/')}`);
      if (e.erd_classes.length === 1) assert.equal(e.class, e.erd_classes[0], `${t}: a one-class row is that class`);
      else if (e.class !== null) {
        assert.ok(m.REFUSED_CLASSES.includes(e.class) && /§9\.[12] \(/.test(e.resolved_by), `${t}: a multi-class row is resolved only INTO a refused class, by §9.1/§9.2 text`);
      }
      const open = e.class === null && e.erd_classes.some((c) => m.REFUSED_CLASSES.includes(c)) && !e.erd_classes.every((c) => m.REFUSED_CLASSES.includes(c));
      assert.equal(open, e.class === null && typeof e.finding === 'string' && e.finding.length > 40, `${t}: a table left open between a refused class and another carries a finding, and only such a table has one with no class`);
      if (!e.named_in_family) assert.match(e.family_inferred_from, /^batch \d{3} \(§6/, `${t}: an inferred family names the §6 batch it is inferred from`);
    }
    assert.deepEqual(m.REFUSED_CLASS_TABLES, ['app.billing_webhook_receipts', 'app.consumer_ledger', 'app.jobs', 'app.outbox_events', 'private.ai_credential_references',
      'private.meta_credential_references', 'private.meta_webhook_inbox', 'private.push_subscription_references'], 'the eight tables in a refused class, measured unexposed at the draft');
    assert.deepEqual(Object.entries(reg.tables).filter(([, e]) => e.finding && e.class === null).map(([t]) => t),
      ['app.ai_model_policies', 'app.ai_models', 'app.meta_connections', 'app.notification_preferences', 'app.notifications', 'app.performance_snapshots',
        'app.publish_intents', 'app.publish_jobs', 'app.publish_target_assets', 'app.publish_targets', 'app.published_posts', 'app.social_accounts'],
      'the twelve tables the ERD leaves between a refused class and another: findings, never guesses');
    assert.deepEqual(reg.columns, {}, 'the ERD names no column, so no column is classed');
    assert.match(m.DATA_CLASSIFICATION_PROBE_SQL, /case when p\.p in \('SELECT', 'INSERT', 'UPDATE', 'REFERENCES'\) then pg_catalog\.has_any_column_privilege\(cr\.r, t\.t::regclass, p\.p\)\n\s+else pg_catalog\.has_table_privilege\(cr\.r, t\.t::regclass, p\.p\) end/,
      'any privilege, by any column or table-wide');
    assert.match(m.DATA_CLASSIFICATION_PROBE_SQL, /'SELECT', 'INSERT', 'UPDATE', 'REFERENCES', 'DELETE', 'TRUNCATE', 'TRIGGER'\]\n\s+\|\| case when [^\n]*then array\['MAINTAIN'\]/, 'every table privilege, MAINTAIN on 17+');
    // Rule 2 at table and column level (2), and rule 3's three found-sets written twice, once per direction (6).
    assert.equal((m.DATA_CLASSIFICATION_PROBE_SQL.match(/unnest\(array\['anon', 'authenticated', 'public'\]\) as cr\(r\)/g) ?? []).length, 8, 'the three client roles, at table and at column level, in every rule');
    // Batch 150 (Q170-d, answered 2026-10-04 as A0 recommended): the eight refused tables split in two, both
    // halves computed from the registry. SECRET-4 keeps "no client privilege"; PROVIDER-3 and INTERNAL-3 get a
    // pinned safe projection.
    assert.deepEqual(m.NO_PRIVILEGE_TABLES, ['private.ai_credential_references', 'private.meta_credential_references', 'private.meta_webhook_inbox', 'private.push_subscription_references'],
      'the four SECRET-4 tables (meta_webhook_inbox by its PROVIDER-3/SECRET-4 row): no client privilege of any kind');
    assert.deepEqual(m.PROJECTION_TABLES, ['app.billing_webhook_receipts', 'app.consumer_ledger', 'app.jobs', 'app.outbox_events'], 'the four PROVIDER-3 or INTERNAL-3 tables: a pinned safe projection');
    assert.deepEqual([...m.NO_PRIVILEGE_TABLES, ...m.PROJECTION_TABLES].sort(), [...m.REFUSED_CLASS_TABLES].sort(), 'the two halves are the eight, with nothing lost between them');
    assert.ok(m.DATA_CLASSIFICATION_PROBE_SQL.includes(`from unnest(array[${m.NO_PRIVILEGE_TABLES.map((t) => `'${t}'`).join(', ')}]::text[]) as t(t), `),
      'the SQL refuses every SECRET-4 table, as the registry gives them (Q0 Q-5 on the batch 170 draft: one dropped from the SQL passed with the digest refreshed)');
    assert.equal(m.DATA_CLASSIFICATION_PROBE_SQL.split(`from unnest(array[${m.PROJECTION_TABLES.map((t) => `'${t}'`).join(', ')}]::text[]) as t(t), `).length - 1, 4,
      'and reads every PROVIDER-3 or INTERNAL-3 table at column and table level, both ways');
    assert.equal(m.DATA_CLASSIFICATION_PROBE_SQL.split(`from unnest(array[${m.OPEN_CLASS_TABLES.map((t) => `'${t}'`).join(', ')}]::text[]) as t(t), `).length - 1, 2,
      'and every open table, both ways');
    assert.equal((m.DATA_CLASSIFICATION_PROBE_SQL.match(/raise exception/g) ?? []).length, 4, 'four rules: the registry, SECRET-4, outside the projection, a projection column no client reads');
    assert.match(m.DATA_CLASSIFICATION_PROBE_SQL, /pg_catalog\.has_column_privilege\(cr\.r, t\.t::regclass, a\.attnum, p\.p\)/, 'each column of a projection table, for every column privilege');
    // The review round (Q0 Q-3, mutant M5ab): rule 3's two privilege lists, pinned by text in both directions,
    // MAINTAIN included (no drift can grant MAINTAIN on a server before 17, so the text holds it).
    assert.equal((m.DATA_CLASSIFICATION_PROBE_SQL.match(/unnest\(array\['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'\]\) as p\(p\), pg_catalog\.pg_attribute a\n/g) ?? []).length, 2,
      'rule 3 reads SELECT, INSERT, UPDATE and REFERENCES per column of a projection table, both ways');
    assert.equal((m.DATA_CLASSIFICATION_PROBE_SQL.match(/unnest\(array\['DELETE', 'TRUNCATE', 'TRIGGER'\]\n\s+\|\| case when pg_catalog\.current_setting\('server_version_num'\)::integer >= 170000 then array\['MAINTAIN'\] else array\[\]::text\[\] end\) as p\(p\)\n\s+where pg_catalog\.has_table_privilege\(cr\.r, t\.t::regclass, p\.p\)/g) ?? []).length, 2,
      'and DELETE, TRUNCATE, TRIGGER and MAINTAIN per projection table, both ways');
  }
  // THE PINNED SAFE PROJECTIONS (batch 150; Q170-d). The file's tables are the registry's, its rows are today's
  // client column reads from pinned-grants.json, and every column it flags is a finding with an owner.
  {
    const file = JSON.parse(await readFile(m.SAFE_PROJECTIONS_FILE, 'utf8'));
    assert.deepEqual(m.SAFE_PROJECTIONS, file, 'the probe reads the lint file and nothing else');
    assert.deepEqual(Object.keys(file.tables), m.PROJECTION_TABLES, 'the classed tables are exactly the PROVIDER-3 and INTERNAL-3 ones, in registry order');
    assert.deepEqual(Object.keys(file.open_tables), m.OPEN_CLASS_TABLES, 'the open tables are exactly the registry\'s twelve findings, in registry order');
    for (const [t, e] of Object.entries(file.tables)) {
      assert.ok(m.PROJECTION_CLASSES.includes(e.class) && e.class === m.DATA_CLASSIFICATION.tables[t].class, `${t}: its class is the registry's, PROVIDER-3 or INTERNAL-3`);
    }
    for (const [t, e] of Object.entries(file.open_tables)) assert.deepEqual(e.erd_classes, m.DATA_CLASSIFICATION.tables[t].erd_classes, `${t}: its §5 classes are the registry's`);
    for (const [part, entries] of [['tables', file.tables], ['open_tables', file.open_tables]]) {
      for (const [t, e] of Object.entries(entries)) {
        assert.ok(typeof e.review === 'string' && e.review.length > 20, `${part} ${t}: reviewed against §9.1`);
        const client = Object.fromEntries(Object.entries(m.PINNED_GRANTS[t]).filter(([r]) => m.CLIENT_ROLES.includes(r)).map(([r, g]) => [r, g.SELECT ?? []]).filter(([, cols]) => cols.length));
        assert.deepEqual(e.projection, client, `${part} ${t}: the projection is pinned-grants.json's client SELECT columns, in attnum order`);
        if (part === 'tables') {
          for (const [r, g] of Object.entries(m.PINNED_GRANTS[t]).filter(([r]) => m.CLIENT_ROLES.includes(r))) {
            assert.deepEqual(Object.keys(g).filter((k) => k !== 'SELECT'), [], `${t}: ${r} holds no privilege but a column read (rule 3 refuses every other)`);
          }
        }
      }
    }
    assert.equal(m.SAFE_PROJECTION_ROWS.length, 71, 'seventy-one client column reads, on seven open tables; none on a classed one');
    // SP-4 since the review round (A1 F150-1): deep_link_target_ref's form admits a provider-id and a token shape.
    assert.deepEqual(file.findings.map((f) => f.id), ['SP-1', 'SP-2', 'SP-3', 'SP-4'], 'four columns read as unsafe or unproven, recorded and kept');
    for (const f of file.findings) {
      const [s, t, c] = f.column.split('.');
      assert.ok((file.open_tables[`${s}.${t}`] ?? file.tables[`${s}.${t}`])?.projection.authenticated?.includes(c), `${f.id}: names a column the projection pins, so it is kept, not dropped`);
      assert.ok(['LOW', 'INFO', 'MEDIUM'].includes(f.severity) && f.finding.length > 60 && f.owner.length > 2, `${f.id}: a severity, a finding and an owner`);
    }
  }
  // THE PINNED SHAPES (the batch 150 prerequisite draft; survey §6 item 5). The probe reads the lint file;
  // its tables exist in the migrations; 121's constraints are every one 121 names, by text now and not by
  // name; the two pins of performance_snapshots' narrowing agree; and the probe reads FORCE.
  {
    const file = JSON.parse(await readFile(m.PINNED_SHAPES_FILE, 'utf8'));
    assert.deepEqual(m.PINNED_SHAPES, file.tables, 'the probe reads the lint file and nothing else');
    assert.deepEqual(Object.keys(m.PINNED_SHAPES), ['app.performance_snapshots', 'app.published_posts', 'app.usage_events'], 'the table batch 150 rebuilds, the table its key references, and the table of survey item 6\'s unique key');
    for (const [t, s] of Object.entries(m.PINNED_SHAPES)) {
      assert.ok(Object.keys(m.PINNED_GRANTS).includes(t), `${t}: a table the migrations create`);
      assert.deepEqual(s.rls, { enabled: true, forced: true }, `${t}: row level security enabled and FORCED (Q0 D30: FORCE was asserted nowhere)`);
      for (const [k, c] of Object.entries(s.constraints)) {
        assert.ok(['c', 'f', 'p', 'u', 'x'].includes(c.type) && c.def.length > 6, `${t}.${k}: a typed constraint with its text`);
        assert.match(c.def, { c: /^CHECK /, f: /^FOREIGN KEY /, p: /^PRIMARY KEY /, u: /^UNIQUE /, x: /^EXCLUDE / }[c.type], `${t}.${k}: the text is of its type`);
      }
      for (const [k, def] of Object.entries(s.indexes)) assert.ok(def.startsWith(`CREATE INDEX ${k} ON ${t} USING `) || def.startsWith(`CREATE UNIQUE INDEX ${k} ON ${t} USING `), `${t}.${k}: its own pg_get_indexdef, schema-qualified`);
      for (const [k, p] of Object.entries(s.policies)) {
        assert.ok(['r', 'a', 'w', 'd', '*'].includes(p.cmd) && typeof p.permissive === 'boolean' && typeof p.roles === 'string', `${t}.${k}: command, flag and roles`);
      }
      // Batch 150-prereq's review round (A1 S4, C0-8): the trigger set is pinned too, and is empty today.
      assert.deepEqual(s.triggers, {}, `${t}: no non-internal trigger, pinned as an empty set (rule 5)`);
    }
    const m121 = (await readFile('db/foundation/migrations/121_publisher_metrics.sql', 'utf8')).replace(SQL_LINE_COMMENTS, '');
    const named = [...m121.matchAll(/constraint (performance_snapshots_[a-z_]+)\s*\n?\s*(?:check|unique|foreign|primary)/g)].map((x) => x[1]);
    assert.ok(named.length >= 9, 'measured: 121 names its performance_snapshots constraints');
    for (const n of named) assert.ok(m.PINNED_SHAPES['app.performance_snapshots'].constraints[n], `${n}: every constraint 121 names is pinned by text`);
    assert.ok(m.PINNED_SHAPES['app.published_posts'].constraints.published_posts_scope_unique, 'the key 121 added to published_posts, which performance_snapshots_post_scope_fk references');
    assert.deepEqual(m.PINNED_SHAPES['app.usage_events'].constraints.usage_events_dedupe_key_unique, { type: 'u', def: 'UNIQUE (workspace_id, dedupe_key)' }, 'survey item 6: the dedupe key, which had no probe');
    const narrowing = m.PINNED_SHAPES['app.performance_snapshots'].policies.performance_snapshots_scope_narrowing;
    assert.deepEqual([narrowing.using, narrowing.check], [m.PINNED_POLICIES['performance_snapshots.performance_snapshots_scope_narrowing'].using, m.PINNED_POLICIES['performance_snapshots.performance_snapshots_scope_narrowing'].check], 'the two pins of the narrowing are one text');
    assert.match(m.PINNED_SHAPE_PROBE_SQL, /where c\.oid is null or not \(c\.relrowsecurity and c\.relforcerowsecurity\)/, 'rule 1 reads ENABLE and FORCE');
    assert.match(m.PINNED_SHAPE_PROBE_SQL, /pg_catalog\.pg_get_constraintdef\(con\.oid\) as def, con\.convalidated as ok/, 'rule 2: constraint text and validation');
    assert.match(m.PINNED_SHAPE_PROBE_SQL, /pg_catalog\.pg_get_indexdef\(i\.indexrelid\) as def, i\.indisvalid as ok/, 'rule 3: index text and validity');
    assert.match(m.PINNED_SHAPE_PROBE_SQL, /pg_catalog\.pg_get_expr\(pol\.polqual, pol\.polrelid\) as using_text, pg_catalog\.pg_get_expr\(pol\.polwithcheck, pol\.polrelid\) as check_text/, 'rule 4: both halves of every policy');
    assert.match(m.PINNED_SHAPE_PROBE_SQL, /pg_catalog\.pg_get_triggerdef\(tg\.oid\) as def, tg\.tgenabled = 'O' as ok\n\s+from pg_catalog\.pg_trigger tg where not tg\.tgisinternal and tg\.tgrelid = any/, 'rule 5: every non-internal trigger by text and enabled (A1 S4, C0-8)');
    assert.equal((m.PINNED_SHAPE_PROBE_SQL.match(/select 'unlisted or changed: ' \|\| f\.k as x from found f/g) ?? []).length, 4, 'rules 2-5 name what is found and not pinned');
    assert.equal((m.PINNED_SHAPE_PROBE_SQL.match(/select 'missing or changed: ' \|\| p\.k from pinned p/g) ?? []).length, 4, 'and what is pinned and not found');
    assert.equal((m.PINNED_SHAPE_PROBE_SQL.match(/ and [pf]\.roles is not distinct from [pf]\.roles/g) ?? []).length, 2, 'rule 4 compares roles both ways (Q0 Q-3, mutant C2)');
    // Batch 150 (Q150-a, answered 2026-10-04 as A0 recommended): the key is (id, metric_time), written by a
    // forward migration and pinned in the same diff; no `partition by` (Q150-b); 121 is not edited.
    const ps = m.PINNED_SHAPES['app.performance_snapshots'];
    assert.deepEqual(ps.constraints.performance_snapshots_pkey, { type: 'p', def: 'PRIMARY KEY (id, metric_time)' }, 'the key carries the partition column');
    assert.equal(ps.indexes.performance_snapshots_pkey, 'CREATE UNIQUE INDEX performance_snapshots_pkey ON app.performance_snapshots USING btree (id, metric_time)', 'and so does its index');
    for (const [k, c] of Object.entries(ps.constraints).filter(([, c]) => ['p', 'u'].includes(c.type))) assert.match(c.def, /\bmetric_time\b/, `${k}: every unique carries metric_time (partition-ready)`);
    const m150 = await readFile('db/foundation/migrations/150_performance_snapshots_key.sql', 'utf8');
    const m150code = m150.replace(SQL_LINE_COMMENTS, '');
    assert.match(m150code, /alter table app\.performance_snapshots drop constraint performance_snapshots_pkey;\nalter table app\.performance_snapshots add constraint performance_snapshots_pkey primary key \(id, metric_time\);/, '150 re-keys the table in two statements');
    assert.match(m150code, /set lock_timeout = '5s';\nset statement_timeout = '60s';\n\n[\s\S]*?\nset lock_timeout = default;\nset statement_timeout = default;/, 'risky DDL under both timeouts, reset after (migration invariant 3)');
    assert.doesNotMatch(m150code, /\bpartition\s+by\b|attach\s+partition|create\s+(unique\s+)?index/i, 'no partitioning and no index (Q150-b)');
    assert.match(m150code, /if offending is distinct from 'PRIMARY KEY \(id, metric_time\)' then/, 'its block asserts the key by text');
    assert.match(m150code, /con\.contype = 'f' and con\.confrelid = 'app\.performance_snapshots'::regclass/, 'and that nothing references the table');
    // The review round (C0-6, A1 F150-3): check 2 reads every unique INDEX too, by its key columns, so a bare
    // unique index on (id) fails 150 and not only the pinned shape probe.
    assert.match(m150code, /from pg_catalog\.pg_index i join pg_catalog\.pg_class ic on ic\.oid = i\.indexrelid\n\s+where i\.indrelid = 'app\.performance_snapshots'::regclass and i\.indisunique\n[\s\S]*?a\.attnum = any \(\(i\.indkey::int2\[\]\)\[0:i\.indnkeyatts - 1\]\) and a\.attname = 'metric_time'/,
      'every unique index carries metric_time among its key columns');
    assert.match(m121, /id\s+bigint generated always as identity primary key,/, '121 is not edited (migration invariant 1)');
  }
  // Batch 170 (Q-026-5 / Q-027-5, answered "revoke" 2026-10-04; open_blockers[195]): no client role writes
  // app.workspaces.lifecycle_state. One forward migration revokes the one column from authenticated's UPDATE and
  // touches no other grant and no policy; the pinned grant list moves in the same diff; 010 is not edited.
  {
    const ws = m.PINNED_GRANTS['app.workspaces'];
    assert.deepEqual(ws.authenticated.UPDATE, ['name', 'updated_by'], 'the owner still updates name and updated_by, and nothing else');
    assert.deepEqual(ws.authenticated.SELECT, ['id', 'name', 'lifecycle_state', 'created_at', 'updated_at', 'created_by', 'updated_by'], 'members still read the state');
    assert.deepEqual([ws.authenticated.table, ws.authenticated.INSERT, ws.anon], [undefined, undefined, undefined], 'no table-level client privilege, no client INSERT, nothing for anon');
    for (const [table, roles] of Object.entries(m.PINNED_GRANTS)) {
      for (const r of m.CLIENT_ROLES.filter((r) => roles[r])) {
        for (const p of ['UPDATE', 'INSERT']) {
          assert.ok(!(table === 'app.workspaces' && ((roles[r][p] ?? []).includes('lifecycle_state') || (roles[r].table ?? []).includes(p))), `${r} cannot ${p} app.workspaces.lifecycle_state`);
        }
      }
    }
    const m170 = await readFile('db/foundation/migrations/170_workspace_lifecycle_not_client_writable.sql', 'utf8');
    const m170code = m170.replace(SQL_LINE_COMMENTS, '');
    assert.equal((m170code.match(/^revoke [^\n]*$/gm) ?? []).join('\n'), 'revoke update (lifecycle_state) on app.workspaces from authenticated;', '170 revokes exactly one column from one role');
    assert.doesNotMatch(m170code, /^\s*grant\b|\b(create|alter|drop)\s+(policy|table|function|trigger|index)\b/im, 'and grants nothing and creates, alters or drops no policy, table, function, trigger or index');
    // The review round (A1 F170-2): the keyword list above does not see `create or replace function`, a view,
    // a rule or `alter default privileges`. So 170's code, comments stripped, is held to exactly three
    // statements -- the revoke, the column comment (string literals only) and one do-block -- and the
    // do-block, its string literals blanked, issues no statement of its own beyond reading the catalog.
    const m170do = m170code.match(/^do \$\$$[\s\S]*?^end \$\$;$/gm) ?? [];
    assert.equal(m170do.length, 1, '170 carries exactly one do-block');
    assert.deepEqual(m170code.replace(m170do[0], '').split(';').map((t) => t.trim()).filter(Boolean).map((t) => t.split(/\s+/).slice(0, 3).join(' ')),
      ['revoke update (lifecycle_state)', 'comment on column'], 'and outside it only the revoke and the column comment, in that order');
    assert.match(m170code, /^comment on column app\.workspaces\.lifecycle_state is(\s+'(?:[^']|'')*')+;$/m, 'the comment statement is string literals and nothing else');
    // The owed-tooling batch (C0-170R-1, A1 R-1, Q0R-F1 on 170's re-check): that was a keyword DENYLIST, and a
    // side-effecting call inside `select ... into offending` -- set_config, or any function -- passed it. The
    // do-block is now held to an ALLOWLIST of 170's own shapes, literals blanked: `declare offending text;
    // begin ... end $$;` around statements each of which is `select string_agg(...) into offending from ...`,
    // `if ... then raise exception '', ...` or `end if`; every call one of six catalog-reading functions; every
    // FROM source pg_catalog.pg_attribute or unnest(...). Each shape is shown to refuse its drift below. Since
    // the review round no double-quoted identifier and no block comment either, so "every call" means every call
    // however it is spelled; a call whose name is COMPUTED (an EXECUTE, refused by shape) is the only kind not read.
    const doBlockShapeProblems = (block) => {
      const blank = block.replace(SQL_LITERALS, "''");
      const body = blank.match(/^do \$\$\ndeclare\n {2}offending text;\nbegin\n([\s\S]*)\nend \$\$;$/);
      if (!body) return ['not `do $$ declare offending text; begin ... end $$;`'];
      const problems = [];
      // The owed-tooling batch's review round (C0-OT-1, A1-OT-2, Q0-OT-1): the scans below read bare names, so a
      // double-quoted identifier (`"set_config"(`, `pg_catalog."set_config"(`, `from "app"."jobs"`) or a block
      // comment between a name and its `(` or after FROM (`set_config/**/(`) passed every one of them, and
      // PostgreSQL 17.11 executes each. 170's block, literals blanked and line comments stripped, holds neither,
      // so either one is refused outright rather than read past.
      if (body[1].includes('"')) problems.push('a double-quoted identifier, which the name scans do not read');
      if (body[1].includes('/*')) problems.push('a block comment, which the name scans do not read past');
      // The sql-lexer batch (C0-OTR-1, A1-RC-3 on the owed-tooling review round): the block's literals are blanked
      // and its comments stripped by the one lexer now (scripts/db/sql-lexer.mjs), so a `'` inside a dollar-quoted
      // literal or a `--` inside a plain one no longer moves where a literal or a comment ends. 170's block holds
      // no dollar-quoted literal, so one is refused outright, as a quoted name and a block comment are.
      if (body[1].includes('$')) problems.push('a dollar-quoted literal or parameter, which the name scans do not read');
      const SHAPES = [/^select string_agg\(.*\) into offending from (?:pg_catalog\.pg_attribute a|unnest\(array\[[^\]]*\]\) as cr\(r\), unnest\(array\[[^\]]*\]\) as p\(p\)) where .+$/,
        /^if .+ then raise exception '', .+$/, /^end if$/];
      for (const stmt of body[1].split(';').map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean)) {
        if (!SHAPES.some((r) => r.test(stmt))) problems.push(`statement of no allowed shape: ${stmt.slice(0, 40)}`);
      }
      const CALLS = ['string_agg', 'format', 'unnest', 'coalesce', 'pg_catalog.has_column_privilege', 'pg_catalog.has_table_privilege'];
      const KEYWORDS = ['and', 'or', 'not', 'in', 'any', 'all', 'exists', 'then'];
      for (const c of body[1].matchAll(/(\bas\s+)?\b([a-z_][a-z0-9_$]*(?:\s*\.\s*[a-z_][a-z0-9_$]*)*)\s*\(/gi)) {
        const name = c[2].replace(/\s+/g, '').toLowerCase();
        if (!c[1] && !CALLS.includes(name) && !KEYWORDS.includes(name)) problems.push(`call outside the allowlist: ${name}`);
      }
      for (const f of body[1].matchAll(/\bfrom\s+([a-z_][\w.]*)/gi)) {
        if (!['pg_catalog.pg_attribute', 'unnest'].includes(f[1].toLowerCase())) problems.push(`FROM source outside the allowlist: ${f[1]}`);
      }
      if (/\bjoin\b/i.test(body[1])) problems.push('a JOIN, a source outside the allowlist');
      for (const r of body[1].matchAll(/\b([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\b(?!\s*\()/gi)) {
        if (!['cr', 'p', 'a'].includes(r[1].toLowerCase()) && `${r[1]}.${r[2]}`.toLowerCase() !== 'pg_catalog.pg_attribute') problems.push(`relation outside the allowlist: ${r[1]}.${r[2]}`);
      }
      return problems;
    };
    assert.deepEqual(doBlockShapeProblems(m170do[0]), [], '170\'s do-block is of the allowed shapes, calls and sources only');
    const before = (extra) => m170do[0].replace(/\nend \$\$;$/, () => `\n${extra}\nend $$;`);
    for (const [extra, problem] of [
      ["  select pg_catalog.set_config('role', 'app_worker', false) into offending;", /statement of no allowed shape|call outside the allowlist: pg_catalog\.set_config/],
      ["  select string_agg(x, ', ') into offending from (select app.jwt_subject()::text as x) s;", /call outside the allowlist: app\.jwt_subject/],
      ["  select string_agg(w.name, ', ') into offending from app.workspaces w;", /FROM source outside the allowlist: app\.workspaces/],
      ["  select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where exists (select 1 from app.jobs);", /FROM source outside the allowlist: app\.jobs/],
      ["  select string_agg(format('%s %s', cr.r, p.p), ', ') into offending from unnest(array['anon']) as cr(r), unnest(array['UPDATE']) as p(p), private.meta_credential_references where true;", /statement of no allowed shape|relation outside the allowlist: private\.meta_credential_references/],
      ['  perform pg_catalog.pg_sleep(0);', /statement of no allowed shape: perform/],
      ['  if true then update app.workspaces set name = name; end if;', /statement of no allowed shape/],
      ["  if offending is null then raise exception 'x: %', pg_catalog.set_config('role', 'anon', false); end if;", /call outside the allowlist: pg_catalog\.set_config/],
      ["  execute 'select 1';", /statement of no allowed shape: execute/],
      // The review round's spellings (C0 M-C1, A1 §3.1, Q0 Q1a/Q1b), each in an allowed statement shape.
      ["  select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where \"set_config\"('role', 'app_worker', false) is not null;", /a double-quoted identifier/],
      ["  select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where pg_catalog.\"set_config\"('role', 'app_worker', false) is not null;", /a double-quoted identifier/],
      ["  select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where set_config/**/('role', 'app_worker', false) is not null;", /a block comment/],
      ["  select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where exists (select 1 from \"app\".\"workspaces\" for update);", /a double-quoted identifier/],
      ["  select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where exists (select 1 from/**/app/**/./**/jobs);", /a block comment/],
      // The sql-lexer batch (C0-OTR-1, A1-RC-3): a `'` inside a dollar-quoted literal desynced the old blanker, which
      // paired it with the next quote and blanked the call between; and `'a--'` was cut at its `--` by the old comment
      // strip, taking the rest of the line with it. Read by the lexer, each call is seen and refused.
      ["  select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where $q$'$q$ = '' and pg_catalog.set_config('role', 'app_worker', false) is not null and '' = '';", /a dollar-quoted literal[\s\S]*call outside the allowlist: pg_catalog\.set_config/],
      ["  select string_agg(a.attname, 'a--') into offending from pg_catalog.pg_attribute a where pg_catalog.set_config('role', 'app_worker', false) is not null;", /call outside the allowlist: pg_catalog\.set_config/],
    ]) {
      assert.match(doBlockShapeProblems(before(extra)).join('; '), problem, `the allowlist refuses: ${extra.trim()}`);
    }
    // EACH OF THE JOIN AND RELATION RULES REFUSES A DRIFT NO OTHER RULE DOES (Q0-OT-1: removing either left every
    // test green). An unqualified relation reached through a JOIN, which the FROM and relation scans do not read;
    // and a qualified relation after a comma in a subquery's FROM list, which the FROM scan (first source only)
    // does not read. Each drift draws exactly one problem, so each rule is shown to be the one that refuses it.
    for (const [extra, only] of [
      ["  select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where exists (select 1 from pg_catalog.pg_attribute b join jobs on true);", 'a JOIN, a source outside the allowlist'],
      ["  select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where exists (select 1 from pg_catalog.pg_attribute b, app.jobs);", 'relation outside the allowlist: app.jobs'],
    ]) {
      assert.deepEqual(doBlockShapeProblems(before(extra)), [only], `exactly one rule refuses: ${extra.trim()}`);
    }
    assert.match(m170code, /pg_catalog\.has_column_privilege\(cr\.r, 'app\.workspaces', 'lifecycle_state', p\.p\)/, 'its block reads every client role against the column');
    assert.match(m170code, /unnest\(array\['anon', 'authenticated', 'public'\]\) as cr\(r\),\s+unnest\(array\['UPDATE', 'INSERT', 'UPDATE WITH GRANT OPTION', 'INSERT WITH GRANT OPTION'\]\) as p\(p\)/, 'for UPDATE and INSERT, with and without grant option');
    assert.match(m170code, /if offending is distinct from 'name, updated_by'/, 'and holds the owner\'s other UPDATE columns to name and updated_by');
    const m010 = await readFile('db/foundation/migrations/010_identity.sql', 'utf8');
    assert.match(m010, /^grant update \(name, lifecycle_state, updated_by\) on app\.workspaces to authenticated;$/m, '010 is not edited (migration invariant 1): the forward migration narrows its grant');
  }
  // THE VOCABULARY CHECKS (survey §6 item 6). Each pinned text is of the selector's shape and named by a
  // migration; a vocabulary shared by several homes is one text in each, so the rewrite of every home alike
  // that passed the relative pins now differs from the fixed text.
  {
    const file = JSON.parse(await readFile(m.VOCABULARY_CHECKS_FILE, 'utf8'));
    assert.deepEqual(m.VOCABULARY_CHECKS, file.checks, 'the probe reads the lint file and nothing else');
    const keys = Object.keys(m.VOCABULARY_CHECKS);
    assert.equal(keys.length, 60, 'sixty vocabulary CHECKs, measured at 1319042');
    assert.deepEqual(keys, [...keys].sort(), 'sorted');
    const all = (await Promise.all((await readdir('db/foundation/migrations')).filter((n) => n.endsWith('.sql')).map((n) => readFile(`db/foundation/migrations/${n}`, 'utf8')))).join('\n');
    for (const [k, def] of Object.entries(m.VOCABULARY_CHECKS)) {
      assert.match(k, /^(app|private)\.[a-z_]+\.[a-z0-9_]+$/, `${k}: schema.table.constraint`);
      assert.ok(def.includes("ARRAY['") || /^CHECK \(\([a-z_]+ = '[^']*'::text\)\)$/.test(def), `${k}: of the selector's shape`);
      assert.ok(all.includes(k.split('.')[2]), `${k}: a constraint a migration names`);
    }
    for (const [col, homes] of [['channel', ['app.notification_preferences.notification_preferences_channel_known', 'app.notifications.notifications_channel_known']],
      ['provider', ['app.ai_models.ai_models_provider_known', 'private.ai_credential_references.ai_credential_references_provider_known']],
      ['dimension', ['app.quota_buckets.quota_buckets_dimension_known', 'app.usage_events.usage_events_dimension_known', 'app.usage_reservations.usage_reservations_dimension_known']],
      ['quantity_unit', ['app.quota_buckets.quota_buckets_quantity_unit_known', 'app.usage_events.usage_events_quantity_unit_known', 'app.usage_reservations.usage_reservations_quantity_unit_known']]]) {
      assert.equal(new Set(homes.map((h) => m.VOCABULARY_CHECKS[h])).size, 1, `${col}: the survey's shared vocabulary is one fixed text in every home`);
    }
    assert.match(m.VOCABULARY_CHECK_PROBE_SQL, /where con\.contype = 'c' and n\.nspname in \('app', 'private'\)\n\s+and \(pg_catalog\.strpos\(pg_catalog\.pg_get_constraintdef\(con\.oid\), 'ARRAY\['''\) > 0\n\s+or pg_catalog\.pg_get_constraintdef\(con\.oid\) ~ '\^CHECK \[\(\]\[\(\]\[a-z_\]\+ = ''\[\^''\]\*''::text\[\)\]\[\)\]\$'\)/,
      'the selector: a literal array, or the single-column equality');
    assert.equal((m.VOCABULARY_CHECK_PROBE_SQL.match(/raise exception/g) ?? []).length, 2, 'two rules: found and not pinned, pinned and not found');
  }
  // THE POLICY SET (survey §6 item 7). With the other lists it names every policy in app exactly once; its
  // rows are the read predicates on the 16 tables PERMISSIVE_POLICIES has no row for (C0-5 on the review
  // round: not "tables no client writes"), the service-path closures and app_authz's own.
  {
    const file = JSON.parse(await readFile(m.POLICY_SET_FILE, 'utf8'));
    assert.deepEqual(m.POLICY_SET, file.policies, 'the probe reads the lint file and nothing else');
    const rows = Object.entries(m.POLICY_SET);
    assert.equal(rows.length, 44, 'forty-four policies no other list named, measured at 1319042');
    const others = new Set(m.PINNED_POLICY_KEYS().filter((k) => !m.POLICY_SET[k]));
    for (const [k] of rows) assert.ok(!others.has(k), `${k}: pinned once, here`);
    assert.equal(m.PINNED_POLICY_KEYS().length, 209, 'two hundred and nine policies in app, every one named');
    const service = rows.filter(([k]) => k.endsWith('_service_path_closed'));
    assert.equal(service.length, 26, 'twenty-six service-path closures');
    for (const [k, p] of service) {
      assert.deepEqual([p.permissive, p.cmd, p.roles, p.using, p.check], [false, '*', 'public', "(CURRENT_USER = 'authenticated'::name)", "(CURRENT_USER = 'authenticated'::name)"], `${k}: the closure's one shape`);
    }
    const reads = rows.filter(([k]) => !k.endsWith('_service_path_closed') && k !== `${m.AUTHZ_TABLE}.${m.AUTHZ_POLICY}`);
    assert.equal(reads.length, 17, 'seventeen permissive read predicates');
    assert.equal(new Set(reads.map(([k]) => k.split('.')[0])).size, 16, 'on sixteen tables (C0-5: the draft said thirteen)');
    for (const [k] of reads) assert.ok(!Object.keys(m.PERMISSIVE_POLICIES).some((p) => p.split('.')[0] === k.split('.')[0]), `${k}: on a table PERMISSIVE_POLICIES has no row for`);
    assert.match(m.POLICY_SET_PROBE_SQL, / and f\.roles = p\.roles\n/, 'rule 2 compares roles (Q0 Q-3, mutant C6)');
    for (const [k, p] of reads) {
      assert.deepEqual([p.permissive, p.cmd, p.roles, p.check], [true, 'r', 'authenticated', null], `${k}: a permissive SELECT for authenticated`);
      assert.ok(p.using.length > 10, `${k}: with its predicate`);
    }
    assert.equal(m.POLICY_SET[`${m.AUTHZ_TABLE}.${m.AUTHZ_POLICY}`]?.roles, m.AUTHZ_ROLE, 'app_authz\'s own policy, read live as well as by the static authz lint');
    assert.match(m.POLICY_SET_PROBE_SQL, /where \(\(n\.nspname not in \('pg_catalog', 'information_schema'\) and n\.nspname !~ '\^pg_'\) or c\.oid >= 16384\)\n\s+and not \(n\.nspname = 'app' and format/, 'rule 1 reads every policy on a table in any schema but the system ones, or made after initdb');
    assert.equal((m.POLICY_SET_PROBE_SQL.match(/raise exception/g) ?? []).length, 2, 'two rules');
  }
  // INDEX COVERAGE (plan (b); ERD §3.3). Exemptions keyed schema.table.column with a reason; every index a
  // migration names *_keyset_idx is a declared lookup; the named WS:911 queries are there; the content first
  // page is a finding, not a lookup.
  {
    const file = JSON.parse(await readFile(m.INDEX_COVERAGE_FILE, 'utf8'));
    assert.deepEqual(m.INDEX_COVERAGE, file, 'the probe reads the lint file and nothing else');
    for (const [k, reason] of Object.entries(m.INDEX_COVERAGE.rls_predicate_exemptions)) {
      assert.match(k, /^(app|private)\.[a-z_]+\.[a-z_]+$/, `${k}: keyed schema.table.column`);
      assert.ok(reason.length > 40, `${k}: carries a reason`);
    }
    assert.deepEqual(Object.keys(m.INDEX_COVERAGE.rls_predicate_exemptions), ['app.approval_requests.status', 'app.calendar_items.deleted_at', 'app.content_schedules.status', 'app.workspaces.lifecycle_state'],
      'the four uncovered predicate columns measured at 1319042, all state filters');
    const keyset = [];
    for (const name of (await readdir('db/foundation/migrations')).filter((n) => n.endsWith('.sql'))) {
      for (const x of (await readFile(`db/foundation/migrations/${name}`, 'utf8')).matchAll(/^create index if not exists ([a-z_]+_keyset_idx)\s+on ((?:app|private)\.[a-z_]+)/gm)) keyset.push(x[2]);
    }
    assert.equal(keyset.length, 21, 'twenty-one *_keyset_idx indexes in the migrations, as the catalog measured');
    const lookups = Object.entries(m.INDEX_COVERAGE.lookups);
    for (const t of keyset) assert.ok(lookups.some(([, l]) => l.table === t && /DESC$/.test(l.columns.at(-1))), `${t}: its keyset cursor is a declared lookup`);
    for (const q of ['membership check', 'workspace switch / list', 'calendar first page', 'library first page', 'worker claim']) assert.ok(m.INDEX_COVERAGE.lookups[q], `WS:909-917's ${q} is declared`);
    for (const [name, l] of lookups) {
      assert.ok(Object.keys(m.PINNED_GRANTS).includes(l.table), `${name}: on a table the migrations create`);
      assert.ok(l.columns.length > 0 && l.columns.every((c) => /^[a-z_]+( DESC)?$/.test(c)), `${name}: column names, each with its direction`);
      assert.ok(l.why.length > 20, `${name}: says why`);
    }
    assert.equal(m.INDEX_COVERAGE.findings.find((f) => f.id === 'IC-1')?.table, 'app.content_items', 'the content first page, served by no index, is a finding (Q150-b), not a lookup that would fail');
    assert.ok(!lookups.some(([, l]) => l.table === 'app.content_items'), 'and no lookup claims it');
    assert.match(m.INDEX_COVERAGE_PROBE_SQL, /pg_catalog\.pg_depend d on d\.classid = 'pg_catalog\.pg_policy'::pg_catalog\.regclass and d\.objid = pol\.oid/, 'rule 1 reads what each policy depends on');
    assert.match(m.INDEX_COVERAGE_PROBE_SQL, /where i\.indisvalid and i\.indpred is null and am\.amname = 'btree'\n/, 'and counts only valid whole btree indexes (C0-1, Q0 Q-1: HASH and BRIN passed)');
    // Batch 150-prereq's review round (Q0 Q-2): the mechanics mutants C8, C9 and C10 changed with every layer
    // green. The leading run stops at the first key column no policy reads (C8; drift 1's probe_ic_t also
    // carries an index with its predicate column behind such a column); a column the USING deparse qualifies by
    // its own table counts (C9; drift 1's probe_ic_q); rule 2 reads only valid btree indexes (C10, which an
    // ordinary migration cannot drive, so it is held here), and compares the NULLS order (C0-1).
    assert.match(m.INDEX_COVERAGE_PROBE_SQL, /where k\.ord <= coalesce\(\(select min\(v\.ord\) - 1 from unnest\(\(i\.indkey::int2\[\]\)\[0:i\.indnkeyatts - 1\]\) with ordinality as v\(k, ord\)\n\s+where not \(v\.k = any \(s\.cols\)\) or \(\(i\.indcollation::pg_catalog\.oid\[\]\)\[v\.ord - 1\] is distinct from[\s\S]*?\), i\.indnkeyatts\)\) as run/,
      'rule 1: the run is the key columns up to the first one no policy reads, or the first under another collation or operator class (C8; Q0 R-2 on 150-prereq)');
    // The owed-tooling batch (Q0 R-2 on 150-prereq's re-check: (user_id, status COLLATE "C") passed every layer):
    // a key column counts only under its column's own collation and its access method's default operator class,
    // in rule 1's run (both copies of its CTE) and in rule 2's column text.
    for (const alias of ['v', 'k']) {
      const reads = new RegExp(`\\(\\(i\\.indcollation::pg_catalog\\.oid\\[\\]\\)\\[${alias}\\.ord - 1\\] is distinct from \\(select ca\\.attcollation from pg_catalog\\.pg_attribute ca where ca\\.attrelid = i\\.indrelid and ca\\.attnum = ${alias}\\.k\\)\\n\\s+or not coalesce\\(\\(select oc\\.opcdefault from pg_catalog\\.pg_opclass oc where oc\\.oid = \\(i\\.indclass::pg_catalog\\.oid\\[\\]\\)\\[${alias}\\.ord - 1\\]\\), false\\)\\)`, 'g');
      assert.equal((m.INDEX_COVERAGE_PROBE_SQL.match(reads) ?? []).length, alias === 'v' ? 2 : 1, `the key's collation and operator class read through ${alias} (${alias === 'v' ? 'rule 1 and the exemption rule, one copy of the CTE each' : 'rule 2'})`);
    }
    assert.match(m.INDEX_COVERAGE_PROBE_SQL, /\|\| case when \(\(i\.indcollation[\s\S]*?then ' \(non-default collation or operator class\)' else '' end end order by k\.ord\)/,
      'rule 2 marks a key under another collation or operator class, so it never equals the lookup\'s column');
    assert.match(m.INDEX_COVERAGE_PROBE_SQL, /where pol\.using_text ~ \('\(\^\|\[\^\.a-z0-9_\]\)' \|\| a\.attname \|\| '\[\[:>:\]\]'\)\n\s+or pol\.using_text ~ \('\[\[:<:\]\]' \|\| c\.relname \|\| '\[\.\]' \|\| a\.attname \|\| '\[\[:>:\]\]'\)\n/,
      'rule 1: a column named unqualified, or qualified by its own table (C9)');
    assert.match(m.INDEX_COVERAGE_PROBE_SQL, /where i\.indisvalid and am\.amname = 'btree' and n\.nspname in \('app', 'private'\)\n/, 'rule 2 reads valid btree indexes only (C10; C0-1)');
    assert.match(m.INDEX_COVERAGE_PROBE_SQL, /\|\| case \(i\.indoption::int2\[\]\)\[k\.ord - 1\] & 3 when 2 then ' NULLS FIRST' when 1 then ' NULLS LAST' else '' end/, 'rule 2 reads the NULLS order where it differs from the direction\'s default (C0-1)');
    assert.equal((m.INDEX_COVERAGE_PROBE_SQL.match(/join pg_catalog\.pg_am am on am\.oid = ic\.relam/g) ?? []).length, 3, 'the access method joined in rule 1 (twice, as its CTE is written twice) and rule 2');
    assert.match(m.INDEX_COVERAGE_PROBE_SQL, /idx\.cols\[1:pg_catalog\.cardinality\(l\.cols\)\] = l\.cols and idx\.pred is not distinct from l\.pred/, 'rule 2: the index begins with the lookup, in order, direction and NULLS order, with its predicate');
    assert.equal((m.INDEX_COVERAGE_PROBE_SQL.match(/raise exception/g) ?? []).length, 3, 'three rules');
  }
  // THE WS:911 FIXTURE AND THE EXPLAIN HARNESS (plan (c)). The full shape is the workstream's own numbers; the
  // default is small; the SQL is one transaction's worth of INSERTs with nothing psql would execute and no
  // transaction control of its own; the harness rolls back, asserts no timing, and is in no make target or CI
  // workflow (CI is protected: adding it is the Integration Owner's).
  {
    const fx = await import('./ws905-fixture.mjs');
    const h = await import('../../scripts/db/explain-harness.mjs');
    const { psqlLex } = await import('../../scripts/db/psql-driver.mjs');
    const ws = await readFile('docs/plans/core-database-and-rls-workstream-th.md', 'utf8');
    assert.ok(ws.includes('100 Workspaces, 10 Businesses/workspace, 20 Pages/workspace, 100k Content, 1M Usage/Audit/Metric rows'), 'WS:911 still names the shape');
    assert.deepEqual([fx.WS905_FULL.workspaces, fx.WS905_FULL.businessesPerWorkspace, fx.WS905_FULL.pagesPerWorkspace, fx.WS905_FULL.contentRows, fx.WS905_FULL.usageRows, fx.WS905_FULL.auditRows, fx.WS905_FULL.metricRows],
      [100, 10, 20, 100_000, 1_000_000, 1_000_000, 1_000_000], 'the full shape is WS:911\'s');
    const full = fx.expectedCounts(fx.WS905_FULL);
    assert.deepEqual([full['app.workspaces'], full['app.business_profiles'], full['app.page_context_profiles'], full['app.content_items'], full['app.usage_events'], full['app.audit_logs'], full['app.performance_snapshots']],
      [100, 1000, 2000, 100_000, 1_000_000, 1_000_000, 1_000_000], 'and the counts the harness checks after loading it');
    assert.ok(fx.WS905_SMALL.contentRows <= 1000 && fx.WS905_SMALL.usageRows <= 10_000, 'the default is small');
    assert.equal(fx.ws905Scaled(0.2).contentRows, 20_000, 'a factor scales the volume');
    assert.equal(fx.ws905Scaled(0.2).workspaces, 100, 'and keeps the tenant hierarchy');
    assert.throws(() => fx.checkParams({ ...fx.WS905_SMALL, workspaces: 0 }), /positive integer/);
    assert.throws(() => fx.checkParams({ ...fx.WS905_SMALL, rows: 1 }), /unknown fixture parameter/);
    for (const p of [fx.WS905_SMALL, fx.WS905_FULL]) {
      const sql = fx.fixtureSql(p);
      const lexed = psqlLex(sql);
      assert.deepEqual(lexed.metaCommands, [], 'no psql meta-command in the fixture');
      assert.deepEqual(lexed.statements.filter((s) => m.TRANSACTION_CONTROL.test(s.head)), [], 'no transaction control: the harness owns the transaction');
      assert.ok(lexed.statements.every((s) => /^(-- [^\n]*\n)?insert into app\.[a-z_]+ \(/.test(s.head)), 'INSERTs into app only');
      for (const t of Object.keys(fx.expectedCounts(p))) assert.ok(sql.includes(`insert into ${t} (`), `${t}: loaded`);
      assert.doesNotMatch(sql, /@|https?:/, 'synthetic: no address of any kind');
    }
    const script = h.harnessScript(fx.WS905_SMALL);
    assert.match(script, /^begin;\n/, 'one transaction');
    assert.match(script, /\nrollback;\n$/, 'rolled back: no row stays (sequences, reltuples, dead tuples and WAL do not roll back; A1 S2, Q0 Q-5)');
    // Batch 150-prereq's review round (A1 S3, C0-4, Q0 Q-6): before the first write, every table the fixture
    // loads must be empty, or the harness refuses with exit 2.
    const firstInsert = script.indexOf('\ninsert into ');
    const emptiness = script.indexOf(`raise exception '${h.NOT_EMPTY}`);
    assert.ok(emptiness > 0 && emptiness < firstInsert, 'the emptiness refusal comes before the first INSERT');
    for (const t of Object.keys(fx.expectedCounts(fx.WS905_SMALL))) assert.ok(script.slice(0, firstInsert).includes(`select '${t}' as t where exists (select 1 from ${t})`), `${t}: read for rows before any write`);
    assert.match(await readFile('scripts/db/explain-harness.mjs', 'utf8'), /return out\.error\.code === 'P0001' && out\.error\.message\.startsWith\(NOT_EMPTY\) \? EXIT\.refused : EXIT\.failed;/, 'and that refusal exits 2, not 1');
    assert.doesNotMatch(script, /^\s*commit\b/im, 'never committed');
    assert.deepEqual(psqlLex(script).metaCommands, [], 'and nothing psql would execute');
    assert.doesNotMatch(script, /p95|statement_timeout|\bms\b/, 'no timing is asserted (Q150-d)');
    assert.deepEqual(h.NAMED_QUERIES.slice(0, 6).map((q) => q.name), ['membership check', 'workspace list', 'content first page', 'calendar first page', 'library first page', 'worker claim'],
      'WS:909-917\'s named queries, in its order');
    assert.deepEqual(h.NAMED_QUERIES.filter((q) => q.klass === 'membership').map((q) => q.name), ['membership check', 'workspace list'], 'the two the seq scan budget reads');
    // Batch 150 (Q150-e, answered 2026-10-04 as A0 recommended): the workspace list is read from the caller's
    // active memberships and joined to workspaces, the query text alone; no policy and no index changed for it.
    const list = h.NAMED_QUERIES.find((q) => q.name === 'workspace list');
    assert.equal(list.role, 'authenticated', 'still read as the client, through every policy');
    assert.match(list.sql, /^select w\.id, w\.name from app\.workspace_members m join app\.workspaces w on w\.id = m\.workspace_id where m\.user_id = md5\('ws905:user:' \|\| \(\(1 - 1\) \* 4 \+ 1\)::text\)::uuid and m\.status = 'active' order by w\.name limit 50$/,
      'from workspace_members (the caller\'s active rows), then workspaces by key (F2, open_blockers[194] (1))');
    assert.doesNotMatch(list.sql, /^select w\.id, w\.name from app\.workspaces w /, 'and no longer from workspaces outward');
    const seq = h.summarisePlan([{ Plan: { 'Node Type': 'Limit', 'Total Cost': 9, Plans: [{ 'Node Type': 'Sort', 'Sort Key': ['x'], Plans: [{ 'Node Type': 'Seq Scan', 'Relation Name': 'workspace_members' }] }] } }]);
    assert.deepEqual([seq.seqScans, seq.sorts, seq.totalCost], [['workspace_members'], ['x'], 9], 'a Seq Scan and a Sort are read from the plan JSON');
    assert.deepEqual(h.verdict([{ name: 'membership check', klass: 'membership', summary: seq }, { name: 'worker claim', klass: 'worker', summary: seq }]).flagged,
      ['membership check: Seq Scan on workspace_members'], 'only a membership-class seq scan is flagged');
    assert.deepEqual(h.parseArgs(['--scale', 'full', '--json']), { scale: 'full', analyze: false, json: true, failOnSeqScan: false });
    assert.equal(h.EXIT.seqScan, 3, 'a flagged plan fails only under --fail-on-seq-scan');
    assert.doesNotMatch(await readFile('Makefile', 'utf8'), /explain-harness/, 'not a make target');
    for (const f of (await readdir('.github/workflows')).filter((n) => /\.ya?ml$/.test(n))) {
      assert.doesNotMatch(await readFile(`.github/workflows/${f}`, 'utf8'), /explain-harness|ws905/, `${f}: not run by CI (the Integration Owner's to add)`);
    }
  }
  assert.deepEqual(m.PINNED_DEFAULTS, { 'app.calendar_items.timezone': "'Asia/Bangkok'::text" }, 'DEC-UX-06 (C0 H3 on 091\'s third round)');
  assert.match(m.PINNED_DEFAULT_PROBE_SQL, /pg_catalog\.pg_get_expr\(d\.adbin, d\.adrelid\) = pin\.def/, 'defaults compared by TEXT');
  for (const [key, reason] of Object.entries(m.FK_ACTION_EXEMPTIONS)) {
    assert.match(key, /^[a-z_]+\.[a-z_]+\.[a-z_]+$/, `FK action exemption ${key} is keyed schema.table.constraint`);
    assert.ok(reason.length > 40, `FK action exemption ${key} carries a reason`);
  }
  // THE LESSON OF PR #157: a list a probe prints is ordered, or two runs of the same database disagree.
  for (const { label, sql } of m.CATALOG_RULE_PROBES) {
    for (const agg of sql.matchAll(/string_agg\(([\s\S]*?)\) into/g)) assert.match(agg[1], /order by/i, `${label}: a string_agg with no ORDER BY`);
  }
});

test('the catalog-probe verdict fails on every way the outcomes can be wrong, and passes only on the right ones', async () => {
  const { decideCatalogProbes, catalogProbeJobs, unsafeDrifts, PROBE_TX_MARK } = await import('../../scripts/db/run.mjs');
  const probes = [{ label: 'p', sql: 'S', claim: 'holds', selfTests: [{ drift: 'D;', raises: 'p refused', names: ['object d'] }, { drift: 'E;', raises: 'p also', names: ['object e'] }] }];
  assert.deepEqual(catalogProbeJobs(probes).map((j) => `${j.kind}:${j.drift ?? ''}:${j.sql}`), ['as built::S', 'after drift 1:D;:S', 'after drift 2:E;:S', 'as built, after every drift::S']);
  const nonce = '0b7c5a1e-0000-4000-8000-00000000c0de';
  const out = (end) => `probe\n${PROBE_TX_MARK}41\nprobe\n${nonce}:mark:41\n${end ? `probe\n${nonce}:end:41\n` : ''}`;
  const refusal = (message) => ({ error: { code: 'P0001', message }, stdout: out(false), stderr: `ERROR:  P0001: ${message}\n` });
  const good = () => [
    { label: 'p', kind: 'as built', sql: 'S', nonce, result: { stdout: out(true), stderr: '' } },
    { label: 'p', kind: 'after drift 1', drift: 'D;', sql: 'S', nonce, result: refusal('p refused: object d') },
    { label: 'p', kind: 'after drift 2', drift: 'E;', sql: 'S', nonce, result: refusal('p also: object e') },
    { label: 'p', kind: 'as built, after every drift', sql: 'S', nonce, result: { stdout: out(true), stderr: '' } },
  ];
  const control = decideCatalogProbes(probes, good());
  assert.equal(control.ok, true, `control: the right outcomes pass (${control.failures.join('; ')})`);
  const wrong = [
    ['the probe fails as built', (o) => { o[0].result = refusal('p refused: y'); o[0].result.stdout = out(false); }, /p: as built: p refused/],
    ['the probe passes after its drift', (o) => { o[1].result = { stdout: out(true), stderr: '' }; }, /self-test after drift 1 passed/],
    ['the drift fails with a syntax error', (o) => { o[1].result = { ...refusal('syntax'), error: { code: '42601', message: 'syntax' } }; }, /failed with 42601/],
    ['the drift trips another raise', (o) => { o[1].result = refusal('something else: object d'); }, /must refuse it/],
    ['the second drift trips the first rule', (o) => { o[2].result = refusal('p refused: object e'); }, /after drift 2 failed with P0001: p refused/],
    ['the refusal does not name the drift\'s object', (o) => { o[1].result = refusal('p refused: something else'); }, /refused without naming object d/],
    ['the drift raised the prefix itself, before the probe', (o) => { o[1].result.stdout = `probe\n${PROBE_TX_MARK}41\n`; }, /did not run after its drift/],
    ['the drift ended the transaction', (o) => { o[1].result.stdout = out(false).replace(`${nonce}:mark:41`, `${nonce}:mark:42`); }, /did not run after its drift/],
    ['a drift printed a marker of its own', (o) => { o[1].result.stdout = `${out(false)}${PROBE_TX_MARK}41\n`; }, /did not run after its drift/],
    ['a forged ERROR line sits beside the real one', (o) => { o[1].result.stderr = 'WARNING:  01000: \nERROR:  P0001: p refused: object d\nERROR:  P0001: p refused: object d\n'; }, /left 2 ERROR line/],
    ['the outcome carries no nonce', (o) => { delete o[1].nonce; }, /ran with no nonce/],
    ['the self-test was skipped', (o) => o.splice(1, 1), /not run after drift 1/],
    ['only the second self-test was skipped', (o) => o.splice(2, 1), /not run after drift 2/],
    ['the probe was fed something else', (o) => { o[0].sql = 'select 1'; }, /not run as built/],
    ['a drift job was fed another drift', (o) => { o[1].drift = 'E;'; }, /not run after drift 1/],
    ['nothing was run', (o) => o.splice(0), /4 probe run\(s\) were due and 0/],
    ['a drift left residue, so the probe fails again at the end', (o) => { o[3].result = refusal('p refused: left behind'); }, /as built, after every drift: p refused: left behind/],
    ['the clean-again round was skipped', (o) => o.splice(3, 1), /not run as built, after every drift/],
    ['an outcome has no result', (o) => { delete o[0].result; }, /not run as built/],
    ['as built passed but never closed', (o) => { o[0].result.stdout = out(false); }, /closing marker never printed/],
  ];
  for (const [label, mutate, pattern] of wrong) {
    const outcomes = good(); mutate(outcomes);
    const verdict = decideCatalogProbes(probes, outcomes);
    assert.equal(verdict.ok, false, `${label}: the verdict must fail`);
    assert.match(verdict.failures.join('\n'), pattern, `${label}: and say why`);
  }
  // A drift the verdict did not count is a declared drift not refused, and that alone fails it (C0 F1 on 125).
  const short = good(); short[1].result = { stdout: out(true), stderr: '' };
  assert.match(decideCatalogProbes(probes, short).failures.join('\n'), /p: declares 2 drift\(s\) and 1 were refused/);
  // Transaction control at STATEMENT POSITION, and any psql meta-command, are refused before anything runs
  // (blocker 186 item 12; Q0 F3, A1 N5 on 123's corrections; A1 V4, Q0 TG1/TG2 on 125).
  for (const control of ['commit;', 'begin; select 1;', 'rollback;', 'end;', 'savepoint s;', 'start transaction;', '/* x */ COMMIT;',
    "select 'com' || 'mit' \\gexec", '\\c other', 'select 1; \\set AUTOCOMMIT off', '\\i f.sql']) {
    const tx = [{ label: 't', sql: 'S', claim: 'holds', selfTests: [{ drift: `alter table x add y int; ${control}`, raises: 't refused', names: ['object t'] }] }];
    assert.match(unsafeDrifts(tx).join('\n'), /drift 1 holds (transaction control|a psql meta-command)/, `a drift ending "${control}" is refused before any job is fed`);
    const outcomes = catalogProbeJobs(tx).map((j) => ({ ...j, nonce, result: j.raises ? refusal('t refused: object t') : { stdout: out(true), stderr: '' } }));
    assert.equal(decideCatalogProbes(tx, outcomes).ok, false, `and the verdict refuses it too ("${control}")`);
  }
  // And what is NOT transaction control at statement position is admitted: a DO block, a function body,
  // a literal and a comment (A1 V4: the keyword rule refused every one of these).
  for (const admitted of ['do $$ begin perform 1; end $$;', "create function pg_temp.f() returns int language plpgsql as $f$ begin return 1; end $f$;",
    "select 'commit';", '-- commit\nselect 1;', 'alter table x add column "end" int;']) {
    const tx = [{ label: 't', sql: 'S', claim: 'holds', selfTests: [{ drift: admitted, raises: 't refused', names: ['object t'] }] }];
    assert.deepEqual(unsafeDrifts(tx), [], `"${admitted}" holds no transaction control at statement position`);
  }
  // A probe whose own SQL carries a meta-command is refused too.
  assert.match(unsafeDrifts([{ label: 'q', sql: 'select 1; \\! touch f', claim: 'x', selfTests: [] }]).join(''), /its SQL carries a psql meta-command/);
  // A probe with no self-test fails even when everything that was due came back right.
  const bare = [{ label: 'q', sql: 'S', claim: 'holds', selfTests: [] }];
  const unproven = decideCatalogProbes(bare, [{ label: 'q', kind: 'as built', sql: 'S', nonce, result: { stdout: out(true) } }, { label: 'q', kind: 'as built, after every drift', sql: 'S', nonce, result: { stdout: out(true) } }]);
  assert.equal(unproven.ok, false, 'a probe that cannot be shown to fail');
  assert.match(unproven.failures.join('\n'), /q: carries no self-test drift/);
  // A drift that names nothing cannot be tied to its object.
  const nameless = [{ label: 'n', sql: 'S', claim: 'holds', selfTests: [{ drift: 'D;', raises: 'n refused' }] }];
  assert.match(decideCatalogProbes(nameless, []).failures.join('\n'), /drift 1 names nothing/);
});

// AN APPLY-TIME BLOCK CANNOT BE SILENCED FROM INSIDE ITS OWN PREDICATE. Q0-080 Q1, Q0-081 F4,
// Q0-pre-080 F3 (P6) and Q0-062-071 F2 each showed the same reversal: prefix a claim's `where` with
// `false and`, or put a bare `return;` ahead of the assertions, and every suite stays green while
// the block asserts nothing. The database side cannot see it (a silent block applies clean), and
// the static rules that read a block's SENTENCES were satisfied by the sentences. This rule reads
// every do-block of every migration with comments and string literals stripped, and refuses the
// shapes that make a predicate constant or the block return early. It is a vocabulary, and it says
// so: `1 = 0`, `coalesce(false, ...)` and a `when false then` inside a case are not in it -- a
// reviewer reads the diff; this rule makes the cheap version of the trick fail by name.
const SILENCERS = [
  ['where false', /\bwhere\s+false\b/i],
  ['if false', /\bif\s+false\b/i],
  ['where true or', /\bwhere\s+true\s+or\b/i],
  ['(false and', /\(\s*false\s+and\b/i],
  ['(true or', /\(\s*true\s+or\b/i],
  ['and false', /[^=<>!]\s+and\s+false\b/i],
  ['or true', /[^=<>!]\s+or\s+true\b/i],
  ['bare return', /^\s*return;\s*$/m],
];
test('no apply-time block in any migration is silenced from inside its own predicate or by an early return', async () => {
  const dir = 'db/foundation/migrations';
  const names = (await readdir(dir)).filter((n) => n.endsWith('.sql')).sort();
  let blocks = 0;
  for (const name of names) {
    const raw = await readFile(`${dir}/${name}`, 'utf8');
    // comments first, then string literals ('...' with '' inside), so a message that SAYS "false and"
    // (131_billing_projection.sql:1295 does) is not a predicate that IS.
    const code = raw.replace(SQL_LINE_COMMENTS, '').replace(SQL_LITERALS, "''");
    for (const block of code.matchAll(/do \$\$[\s\S]*?end \$\$;/g)) {
      blocks += 1;
      for (const [label, pattern] of SILENCERS) {
        assert.doesNotMatch(block[0], pattern,
          `${name}: an apply-time block contains \`${label}\`, which makes a claim constant or returns before it -- Q0's reversal, refused by name`);
      }
    }
  }
  // 32 on 2026-09-15 (a `grep -c 'do $$'` says 39: the rest are in comments and messages). A block
  // opened with another dollar-quote tag is outside this rule, and a reviewer should ask why it was.
  assert.ok(blocks >= 30, `the do-blocks were found (${blocks})`);
});

// THE POST-MIGRATE ASSERTION PASS (Q0's D01h in general form; plan and Owner disposition of
// 2026-09-27). Until this pass every apply-time block ran once, when its own file was applied, so a
// later file could undo any batch's guarantee with every layer green -- measured: a later file that
// drops 061's `usage_events_dimension_known` left rls-smoke ok. These rules hold the wiring, the
// coverage and the register; the live half is `make db-migrate-clean` itself, on every CI run.
test('migrate-clean re-runs every apply-time block after the FK probe, each rolled back, and any failure fails the target', async () => {
  // Comments removed first: Q0 moved `return 1;` into a comment and a text match still found it.
  const runner = (await readFile('scripts/db/run.mjs', 'utf8')).replace(/\/\/[^\n]*/g, '');
  const fk = runner.indexOf('const probeOutcomes = [];');
  const pass = runner.indexOf('plan = await postMigratePlan();');
  assert.ok(fk > 0 && pass > fk, 'the pass runs inside migrate-clean, after the catalog-rule probes (the FK probe among them)');
  assert.match(runner, /const rerun = \(sql\) => feed\(`begin;\\n\$\{sql\}\\nrollback;\\n`\);/, 'each block runs in its own transaction and is rolled back, so the pass changes nothing');
  // The executor, whole: every job the pure planner names, run as named, nothing between it and the verdict.
  const body = runner.slice(pass, runner.indexOf("if (target === 'migrate-upgrade')")).replace(/\n\s*\n/g, '\n');
  assert.match(body, /^plan = await postMigratePlan\(\); \} catch \(error\) \{ stderr\.write\([^\n]*\); return 1; \}\n\s*const outcomes = \[\];\n\s*for \(const job of postMigrateJobs\(plan\)\) outcomes\.push\(\{ \.\.\.job, result: await rerun\(job\.sql\) \}\);\n\s*const verdict = decidePostMigrate\(plan, outcomes\);\n\s*for \(const failure of verdict\.failures\) stderr\.write\([^\n]*\);\n\s*if \(!verdict\.ok\) return 1;\n\s*stdout\.write\([^\n]*verdict\.summary[^\n]*\);\n\s*return 0;\n\s*\}\n\s*$/,
    'the executor is exactly: plan, run every job, decide, fail on a failing verdict -- no skip, no substitute script, no early return');
});

// THE DECISION, driven by synthetic outcomes (Q0 F1: the first version was guarded only by regexes over
// its own text, and five evasive edits survived with real drift present).
test('the post-migrate verdict fails on every way the outcomes can be wrong, and passes only on the right ones', async () => {
  const { decidePostMigrate, postMigrateJobs } = await import('../../scripts/db/run.mjs');
  const plan = [
    { id: 'a.sql#1', line: 1, sql: 'A' },
    { id: 'b.sql#1', line: 9, sql: 'B', superseded: { replacement: 'b.1.sql', replacementSql: 'B2', fails_with: 'b counts three and writes one' } },
  ];
  const good = () => [
    { id: 'a.sql#1', kind: 'verbatim', sql: 'A', result: { rows: [] } },
    { id: 'b.sql#1', kind: 'verbatim', sql: 'B', result: { error: { code: 'P0001', message: 'b counts three and writes one, and more' } } },
    { id: 'b.sql#1', kind: 'replacement', sql: 'B2', result: { rows: [] } },
  ];
  assert.deepEqual(postMigrateJobs(plan).map((j) => `${j.id}/${j.kind}`), ['a.sql#1/verbatim', 'b.sql#1/verbatim', 'b.sql#1/replacement'], 'every block, then each replacement');
  const control = decidePostMigrate(plan, good());
  assert.equal(control.ok, true, `control: the right outcomes pass (${control.failures.join('; ')})`);
  assert.equal(control.summary, '2 apply-time blocks, 1 re-run as written, 1 superseded and replaced');
  const wrong = [
    ['an unregistered block fails', (o) => { o[0].result = { error: { code: 'P0001', message: 'drift' } }; }, /no longer holds/],
    ['an unregistered block was fed something else', (o) => { o[0].sql = 'select 1'; }, /a\.sql#1 was not run as written/],
    ['a superseded block was skipped', (o) => o.splice(1, 1), /b\.sql#1 was not run as written/],
    ['a superseded block passes as written', (o) => { o[1].result = { rows: [] }; }, /passes as written; the register entry is stale/],
    ['a superseded block fails with a syntax error', (o) => { o[1].result = { error: { code: '42601', message: 'b counts three and writes one' } }; }, /stale/],
    ['a superseded block fails at another raise', (o) => { o[1].result = { error: { code: 'P0001', message: 'something earlier broke' } }; }, /stale/],
    ['the replacement was never run', (o) => o.splice(2, 1), /replacement b\.1\.sql was not run/],
    ['the replacement was fed something else', (o) => { o[2].sql = 'null;'; }, /replacement b\.1\.sql was not run/],
    ['the replacement fails', (o) => { o[2].result = { error: { code: 'P0001', message: 'pin broken' } }; }, /replacement b\.1\.sql fails/],
    ['an outcome came back with no result', (o) => { delete o[0].result; }, /no longer holds/],
    ['nothing was run', (o) => o.splice(0), /3 script\(s\) were due and 0/],
  ];
  for (const [label, mutate, pattern] of wrong) {
    const outcomes = good();
    mutate(outcomes);
    const verdict = decidePostMigrate(plan, outcomes);
    assert.equal(verdict.ok, false, `${label}: the verdict must fail`);
    assert.match(verdict.failures.join('\n'), pattern, `${label}: and say why`);
  }
});

test('the post-migrate plan covers every do-block of every migration, and each superseded one has a final-state replacement', async () => {
  const { postMigratePlan, INVARIANTS, SUPERSEDED } = await import('../../scripts/db/run.mjs');
  const plan = await postMigratePlan();
  const dir = 'db/foundation/migrations';
  let opened = 0;
  for (const name of (await readdir(dir)).filter((n) => n.endsWith('.sql'))) {
    opened += (await readFile(`${dir}/${name}`, 'utf8')).split('\n').filter((l) => /^do \$\$\s*$/.test(l)).length;
  }
  assert.equal(plan.length, opened, 'every block is in the plan exactly once');
  assert.ok(plan.length >= 42, `42 blocks on 2026-09-27 and a migration is never edited, so never fewer (${plan.length})`);
  const register = JSON.parse(await readFile(SUPERSEDED, 'utf8'));
  const superseded = plan.filter((b) => b.superseded);
  assert.equal(superseded.length, register.entries.length, 'every register entry landed on a block');
  const replacements = (await readdir(INVARIANTS)).filter((n) => n.endsWith('.sql')).sort();
  assert.deepEqual(replacements, register.entries.map((e) => e.replacement).sort(), 'no replacement file sits outside the register');
  for (const block of superseded) {
    const text = block.superseded.replacementSql;
    assert.match(text, /^do \$\$\n[\s\S]*\nend \$\$;\n$/, `${block.superseded.replacement} is one do-block and nothing else`);
    for (const later of block.superseded.superseded_by) {
      assert.match(text, new RegExp(`SUPERSEDED BY [^\\n]*\\b${later.slice(0, 3)}\\b`), `${block.superseded.replacement} says where ${later} changed it`);
    }
    const code = text.replace(SQL_LINE_COMMENTS, '').replace(SQL_LITERALS, "''");
    // One block and nothing else, and nothing that could end the pass's transaction from inside it:
    // C0 found `end $$; commit; ...` satisfied the shape rule above and would commit past the rollback.
    assert.equal(code.split('end $$;').length - 1, 1, `${block.superseded.replacement} closes exactly one block`);
    assert.doesNotMatch(code, /\b(commit|rollback|savepoint|release)\b/i, `${block.superseded.replacement} carries no transaction control`);
    assert.doesNotMatch(code, /pol\.polname::text <> all|con\.conname <> '/, `${block.superseded.replacement} excludes later names as (table, name) pairs, never bare`);
    for (const [label, pattern] of SILENCERS) {
      assert.doesNotMatch(code, pattern, `${block.superseded.replacement} contains \`${label}\``);
    }
    assert.ok(block.superseded.why.length > 20, `${block.id} says why`);
    // fails_with IS DETERMINISTIC. It must match the literal of one of the block's own raises, and
    // may run past that literal's first `%` only when the argument is declared integer. A text
    // argument is built by string_agg in an order Postgres does not fix: 120's first entry included
    // the first of two policy names, and main's CI run 36311266393 received them the other way round
    // and failed the pass on an entry that was not stale.
    // A raise with no argument is matched too, its doubled quotes read as the message prints them:
    // 125's block is the first superseded block whose raises carry no argument (batch 126).
    const raises = [...block.sql.matchAll(/raise exception '((?:[^']|'')*)'(?:\s*,\s*([a-z_]+))?/g)]
      .map(([all, literal, argument]) => [all, literal.replace(/''/g, "'"), argument]);
    const raise = raises.find(([, literal]) => block.superseded.fails_with.startsWith(literal.split('%')[0]));
    assert.ok(raise, `${block.id}'s fails_with matches none of its block's raises`);
    const [, literal, argument] = raise;
    if (block.superseded.fails_with.length > literal.split('%')[0].length) {
      assert.match(block.sql, new RegExp(`^\\s*${argument}\\s+integer\\b`, 'm'),
        `${block.id}'s fails_with runs past the first % into \`${argument}\`, which is not declared integer; stop it before the %`);
    }
    // ADDITIVE ONLY. Every line of the original block is still in its replacement, in order; a
    // replacement may add (a pin, an exclusion, a comment) and may move a trailing semicolon, and may
    // remove nothing. A1 measured the first version accepting a replacement that dropped a FORCE ROW
    // LEVEL SECURITY check, and one whose whole body was `null;`. An exclusion added to a predicate
    // is still a relaxation this rule cannot see -- that is the reviewer's, and the README says so.
    const norm = (l) => l.replace(/;\s*$/, '').replace(/\s+$/, '');
    const theirs = text.split('\n').map(norm);
    let at = 0;
    for (const line of block.sql.split('\n').map(norm).filter((l) => l.trim() !== '')) {
      const found = theirs.indexOf(line, at);
      assert.ok(found >= 0, `${block.superseded.replacement} no longer carries this line of ${block.id}, in order: ${line.trim()}`);
      at = found + 1;
    }
  }
});

test('a do-block the pass cannot extract is refused, and a register that lies about the repository is refused', async () => {
  const { applyTimeBlocks, postMigratePlan } = await import('../../scripts/db/run.mjs');
  assert.equal(applyTimeBlocks('x.sql', 'select 1;\ndo $$\nbegin\nend $$;\n-- do $$ in a comment\n').length, 1, 'control: the house form is extracted and a comment is not a block');
  assert.throws(() => applyTimeBlocks('x.sql', 'DO $body$\nbegin\nend $body$;\n'), /open a do-block/, 'another dollar tag would escape the pass');
  assert.throws(() => applyTimeBlocks('x.sql', '  do $$ begin end $$;\n'), /open a do-block/, 'so would an inline block');
  assert.throws(() => applyTimeBlocks('x.sql', 'do $$\nbegin\n'), /never closes/, 'and an unterminated one');
  assert.throws(() => applyTimeBlocks('x.sql', 'do language plpgsql $$\nbegin\nend $$;\n'), /open a do-block/, 'and a block naming its language first (C0)');
  assert.throws(() => applyTimeBlocks('x.sql', 'do\n$$\nbegin\nend $$;\n'), /open a do-block/, 'and one with its $$ on the next line (C0)');
  assert.throws(() => applyTimeBlocks('x.sql', 'select 1; do $$\nbegin\nend $$;\n'), /open a do-block/, 'and one opened mid-line (Q0 X3)');
  // The sql-lexer batch: the do-block counter reads DO tokens through the one lexer. The control that stood here, a
  // `$$` body whose message says `do $$`, is not SQL -- PostgreSQL ends that body at the `$$` in the message and the
  // rest is an unterminated literal -- so the lexer refuses it (fail closed); the message is now spelled with another tag.
  assert.equal(applyTimeBlocks('x.sql', "do $$\nbegin\n  raise exception 'we do $b$ here';\nend $$;\n").length, 1, 'control: a message that mentions do $b$ is not a block');
  assert.throws(() => applyTimeBlocks('x.sql', "do $$\nbegin\n  raise exception 'we do $$ here';\nend $$;\n"), /cannot classify/, 'and a text that is not SQL is refused, not counted');
  const entry = { block: '030_industry.sql#1', superseded_by: ['031_industry_service_path_closed.sql'], replacement: '030_industry.1.sql', fails_with: 'app.industry_assignments carries 3 restrictive policies', why: 'a control entry for this test' };
  await postMigratePlan({ entries: [entry] }); // control: a true entry is accepted
  const lies = [
    [[entry, entry], /listed twice/],
    [[{ ...entry, superseded_by: [] }], /names no later file/],
    [[{ ...entry, fails_with: undefined }], /does not record the raise/],
    [[{ ...entry, superseded_by: ['999_nothing.sql'] }], /not a migration/],
    [[{ ...entry, superseded_by: ['020_business.sql'] }], /does not sort after/],
    [[{ ...entry, replacement: 'absent.sql' }], /is not a file/],
    [[{ ...entry, block: '030_industry.sql#2' }], /no such block/],
  ];
  for (const [entries, pattern] of lies) await assert.rejects(postMigratePlan({ entries }), pattern);
});

// THE SOCIAL KEY CARRIES NO ON DELETE ACTION, BY DECISION (Owner, 2026-09-15, disposition §5): a social
// account row is never hard-deleted except by workspace closure, so NO ACTION is the answer and not a
// default. A later batch that adds CASCADE or SET NULL here is changing that decision, and this rule
// makes it do so in a diff that says so rather than in a clause nobody reads.
test('content_targets_social_scope_fk carries no ON DELETE action, by the Owner\'s decision of 2026-09-15', async () => {
  const code = (await readFile('db/foundation/migrations/111_social_fk.sql', 'utf8')).replace(SQL_LINE_COMMENTS, '');
  const key = code.match(/add constraint content_targets_social_scope_fk[\s\S]*?;/);
  assert.ok(key, '111 adds the key');
  assert.doesNotMatch(key[0], /on\s+(delete|update)/i, 'the key names no ON DELETE or ON UPDATE action: a social account row is never hard-deleted (disposition 2026-09-15 §5), so there is nothing to cascade, null or restrict');
  const readme = await readFile('db/foundation/README.md', 'utf8');
  assert.match(readme, /The key carries no ON DELETE action, by decision/, 'and the README records the decision beside the key');
  for (const later of (await readdir('db/foundation/migrations')).filter((n) => n > '111_social_fk.sql')) {
    const text = (await readFile(`db/foundation/migrations/${later}`, 'utf8')).replace(SQL_LINE_COMMENTS, '');
    assert.doesNotMatch(text, /content_targets_social_scope_fk[\s\S]{0,300}on\s+delete/i, `${later} does not give the social key an ON DELETE action without changing the decision first`);
  }
});

// ---------------------------------------------------------------------------------------------
// BATCH 141 PREPARATION (A0, 2026-10-03; no migration). Plan:
// evidence/WP-0A-DB-00/a0-phase-plan-141-170-2026-10-03.md, "Batch 141 -- 3. Can do now". Four
// static holds on what 141 can do before any of its decisions (Q141-a/b/c) is taken: the §8.4 cell
// classified in the service-policy map, the audit coverage map, the store's reading of CTR-AUD-001,
// and fixtures that validate against the Draft contract.
// ---------------------------------------------------------------------------------------------

const AUDIT_MIGRATION_140 = 'db/foundation/migrations/140_audit.sql';
const AUDIT_COVERAGE_MAP = 'db/foundation/lint/audit-coverage-map.json';
const AUD_FIXTURES = 'test-kits/db/fixtures/ctr-aud-001';
const ERD_DOC = 'docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md';
const SEC_DOC = 'docs/plans/meta-security-production-ops-workstream-th.md';
const WP_FILE = 'work-packages/WP-0A-DB-00.json';
// One of the two audit tables, as a later migration might spell it: optionally schema-qualified, either
// part optionally quoted, whitespace allowed around the dot, and not a longer name that begins with it.
const AUDIT_TABLE_REF = String.raw`(?:"?app"?\s*\.\s*)?"?(?:audit_logs|security_events)"?(?![\w"])`;
const AUDIT_TABLE_POLICY = new RegExp(String.raw`create\s+policy[^;]*\bon\s+(?:only\s+)?${AUDIT_TABLE_REF}`, 'i');
const AUDIT_TABLE_ALTER = new RegExp(String.raw`alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${AUDIT_TABLE_REF}`, 'i');
// A migration's text with its comments made whitespace, for the later-migration tripwires (the owed-tooling batch's
// review round; A1-OT-3, Q0-OT-8: the scans stripped `--` comments only, so `grant insert on /* x */ app.audit_logs`
// and `alter table /* x */ app.audit_logs ...` passed them). Line comments and NESTED block comments, outside
// single-quoted literals and double-quoted identifiers, each become one space; nothing else changes.
const sqlWithoutComments = (text) => stripComments(text);
// Since the sql-lexer batch the tripwires read every statement at every level -- the top level, and the text of every
// literal and dollar body read again as SQL, as EXECUTE or a DO body would -- in the lexer's canonical form: comments
// gone, words single-spaced, `"app"` written app, literals blanked to '' (their text is a level of its own), each
// statement ended by its own `;`. So a `;` inside a quoted name or a literal no longer ends a `[^;]*` early, a `--`
// inside a dollar body no longer eats the statement after it (A1-RC-I1, Q0-OT2-7), and a GRANT a DO block EXECUTEs
// from a literal is read as a statement. What a statement COMPUTES at run time is still not read.
const auditScanText = (text) => canonicalStatements(text).map((st) => `${st.text};`).join('\n');

// The body of one `create table` in 140, read from the file with line comments stripped: its
// columns (name, type, not null) and its constraint text.
const tableBodyOf = (code, table) => {
  const start = code.indexOf(`create table if not exists ${table} (`);
  assert.ok(start >= 0, `${table} is created by 140_audit.sql`);
  const end = code.indexOf('\n);', start);
  return code.slice(start, end);
};
// EVERY column line, whatever its type (batch 141 prep review, Q0-F1): a `jsonb` or `bigint` column
// added to 140's body is a column the conformance reading must name, not one it fails to see.
const columnsOf = (body) => {
  const columns = new Map();
  for (const m of body.matchAll(/^ {2}"?(\w+)"?\s+(\w+)([^\n]*)$/gm)) {
    if (m[1] === 'constraint') continue;
    columns.set(m[1], { type: m[2], notNull: /\bnot null\b|\bprimary key\b/.test(m[3]) });
  }
  return columns;
};

test('batch 141 prep: the §8.4 audit/security INSERT cell is classified CARRIED, and still buys no policy', async () => {
  const { SERVICE_POLICY_MAP, servicePolicyMapLint, tablesCreatedByMigrations } = await import('../../scripts/db/run.mjs');
  const map = JSON.parse(await readFile(SERVICE_POLICY_MAP, 'utf8'));
  assert.deepEqual(servicePolicyMapLint(map, await tablesCreatedByMigrations()), []);
  for (const table of ['audit_logs', 'security_events']) {
    const rows = map.cells.filter((c) => (c.table.includes('.') ? c.table : `app.${c.table}`) === `app.${table}`);
    assert.equal(rows.length, 1, `app.${table} is classified exactly once`);
    const [row] = rows;
    assert.equal(row.operation, 'insert', `app.${table}: the §8.4 cell is the INSERT; UPDATE/DELETE is N for every role`);
    assert.equal(row.shape, 'carried', `app.${table}: RFC-2026-022 §3 classes this cell CARRIED and §7.2 uses it as its own example`);
    assert.equal(row.batch, '140_audit.sql');
    assert.match(row.cell, /^§8\.4 Audit\/security INSERT \| N \| N \| N \| N \| N \| S\b/,
      `app.${table}: the cell is quoted from §8.4's row`);
    assert.match(row.why, /Q141-a/, `app.${table}: the row says the producer is undecided rather than implying one`);
    // The owed-tooling batch (Q0 R4 on 141-prep's re-check, A1 R1's sentence: dropping it passed every test).
    assert.match(row.why, /RE-CONFIRMED WHEN Q141-a IS ANSWERED/, `app.${table}: the CARRIED row is re-confirmed when Q141-a is answered`);
    assert.match(row.why, /open_blockers\[32\]/, `app.${table}: and owes the scope-path check open_blockers[32] assigns to the producer`);
  }
  // _shape.batch's reading (the owed-tooling batch; Q0 R3 on 141-prep's re-check, C0 G4's change: restoring the
  // old "the migration batch that classified it" alone passed every test). Held with its blocker, [191] (8).
  assert.match(map._shape.batch, /where a cell was classified with no migration \(the two §8\.4 rows, batch 141 prep\), the migration batch that owns the cell in RFC-2026-022 §3's table and §6's registry/,
    '_shape.batch names the owning batch where no migration classified the cell');
  assert.match(map._shape.batch, /open_blockers\[191\] \(8\)$/, 'and cites the blocker that owes the reading to A1');
  // NO POLICY AT ALL on either table, which is stronger than "no service policy" and true today:
  // RFC-2026-022 is approved and NOT IN EFFECT, and 140 writes no client policy either.
  const code = auditScanText(await readFile(AUDIT_MIGRATION_140, 'utf8'));
  assert.doesNotMatch(code, /create\s+policy/i, '140 writes no policy; a classification authorises none');
  // A TRIPWIRE, NOT THE AUTHORITY (batch 141 prep review, A1 R4 and Q0-F6). The text scan accepts the
  // schema-qualified, quoted and unqualified spellings (`app.audit_logs`, `"app"."audit_logs"`,
  // `audit_logs` under a search_path), but it cannot see a policy built by a dynamic EXECUTE; the
  // catalog is what decides, and 140's own block refuses only a service or anonymous role's policy, so a
  // catalog assertion for every role is owed with batch 141's migration (open_blockers[191] (9)).
  for (const later of (await readdir('db/foundation/migrations')).filter((n) => n > '140_audit.sql')) {
    const text = auditScanText(await readFile(`db/foundation/migrations/${later}`, 'utf8'));
    assert.doesNotMatch(text, AUDIT_TABLE_POLICY,
      `${later} writes a policy on an audit table while RFC-2026-022 is not in effect and Q141-a is open`);
  }
  // The tripwire's own spellings, so a narrowed regex fails here rather than going quiet.
  for (const spelling of ['create policy p on app.audit_logs for insert', 'CREATE POLICY "p" ON "app"."security_events" FOR SELECT',
    'create policy p on audit_logs for all', 'create policy p on app . "audit_logs" to authenticated']) {
    assert.match(spelling, AUDIT_TABLE_POLICY, `the later-migration scan misses: ${spelling}`);
  }
  assert.doesNotMatch('create policy p on app.audit_logs_archive for select', AUDIT_TABLE_POLICY,
    'the scan names the two audit tables, not a table whose name begins with theirs');
});

test('batch 141 prep: the audit coverage map names real tables, real §8 rows, live blockers, and no producer', async () => {
  const { tablesCreatedByMigrations } = await import('../../scripts/db/run.mjs');
  const map = JSON.parse(await readFile(AUDIT_COVERAGE_MAP, 'utf8'));
  const tables = await tablesCreatedByMigrations();
  const wpText = await readFile(WP_FILE, 'utf8');
  const wpLines = wpText.split('\n');
  const blockers = JSON.parse(wpText).open_blockers;
  const erd = await readFile(ERD_DOC, 'utf8');
  const code = (await readFile(AUDIT_MIGRATION_140, 'utf8')).replace(SQL_LINE_COMMENTS, '');
  const vocabulary = [...code.match(/audit_logs_action_category_known\s+check \(action_category in \(([^)]*)\)\)/)[1]
    .matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.equal(vocabulary.length, 6, "140's category CHECK was read");

  // THE TABLE SET IS THE MIGRATIONS', NOT THE CATALOG SNAPSHOT'S. catalog-snapshot.json was taken
  // against the provisioned instance on 2026-09-06 and declares 140 (with every batch after 010) not
  // applied there, so it lists none of the tables this map names. The day 140 is applied and the
  // snapshot retaken, this assertion fails and the map should be checked against the snapshot too.
  const snapshot = JSON.parse(await readFile('db/foundation/lint/catalog-snapshot.json', 'utf8'));
  assert.ok(snapshot.not_applied_to_this_instance.migrations.includes('140_audit.sql'),
    'catalog-snapshot.json now claims 140 is applied: check the coverage map against the snapshot as well');

  // §8 is the slice from its heading to §9's (batch 141 prep review, Q0-F3): a first-column cell
  // elsewhere in the ERD -- "Zone" in §3 -- is not a row of the access matrices.
  const section8 = erd.slice(erd.indexOf('\n## 8. '), erd.indexOf('\n## 9. '));
  assert.ok(section8.length > 1000 && section8.includes('| Audit/security INSERT |'), "the ERD's §8 slice was read");
  // A CLOSED KEY SET per row (batch 141 prep review, Q0-F4): `_shape`'s keys and the three notes it
  // declares, so a row cannot grow a `producer` -- which would be Q141-a decided in a lint file.
  // The owed-tooling batch (Q0 R1 on 141-prep's re-check, N07: `producer` added to `_shape` and to a row in one
  // file passed, because the set was read from `_shape` itself). The nine keys are a literal here, `_shape`
  // must be exactly them, and the map's own top-level keys are closed too.
  const SHAPE_KEYS = ['id', 'action', 'source', 'category', 'tables', 'producer_path', 'producer_decision', 'section8_cell', 'blockers'];
  assert.deepEqual(Object.keys(map._shape), SHAPE_KEYS, "_shape declares exactly the nine row keys, in order");
  assert.deepEqual(Object.keys(map), ['_what', '_written_by', '_sources', '_shape', '_undecided', 'actions'], 'and the map has no field beyond its six');
  const rowKeys = new Set([...SHAPE_KEYS, 'tables_note', 'category_note', 'section8_note']);
  const ids = map.actions.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, 'every action id is unique');
  for (const a of map.actions) {
    assert.match(a.id, /^[a-z_]+\.[a-z_]+$/, `${a.id}: a dotted, stable id`);
    for (const key of Object.keys(a)) assert.ok(rowKeys.has(key), `${a.id}: \`${key}\` is not a field this map's _shape declares`);
    // Q141-a is open: a producer named here would be that decision taken in a lint file.
    assert.equal(a.producer_path, 'UNDECIDED', `${a.id}: the producer path is Q141-a's, not this map's`);
    assert.equal(a.producer_decision, 'Q141-a', `${a.id}: cites the question that decides it`);
    assert.ok(Array.isArray(a.tables), `${a.id}: tables is a list`);
    if (a.tables.length === 0) assert.ok(a.tables_note?.length > 40, `${a.id}: no table only with a reason`);
    for (const t of a.tables) {
      assert.match(t, /^(app|private)\.\w+$/, `${a.id}: ${t} is schema-qualified`);
      assert.ok(tables.has(t), `${a.id}: ${t} is created by no migration`);
    }
    if (a.category === null) {
      assert.ok(a.category_note?.length > 40, `${a.id}: a null category is a finding and says so`);
    } else {
      assert.ok(vocabulary.includes(a.category), `${a.id}: ${a.category} is not one of 140's six categories`);
    }
    if (a.section8_cell === null) {
      assert.ok(a.section8_note?.length > 20, `${a.id}: no §8 row only with a reason`);
    } else {
      assert.ok(Array.isArray(a.section8_cell) && a.section8_cell.length > 0, `${a.id}: names its §8 row(s)`);
      for (const cell of a.section8_cell) {
        assert.ok(section8.includes(`\n| ${cell} |`), `${a.id}: "${cell}" is not a row of the ERD's §8 matrices`);
      }
    }
    assert.ok(Array.isArray(a.blockers) && a.blockers.length > 0, `${a.id}: every row names the blocker that holds it`);
    for (const b of a.blockers) {
      assert.ok(Number.isInteger(b.index) && blockers[b.index] !== undefined, `${a.id}: open_blockers[${b.index}] exists`);
      assert.ok(blockers[b.index].includes(b.quote),
        `${a.id}: open_blockers[${b.index}] no longer says "${b.quote}" -- the list moved or the blocker changed`);
      assert.ok(wpLines[b.line - 1]?.includes(JSON.stringify(blockers[b.index]).slice(1, 80)),
        `${a.id}: open_blockers[${b.index}] is not on ${WP_FILE}:${b.line}`);
    }
  }
  // A `source` that cites a blocker quotes it too (the owed-tooling batch; plan D3 and C0-7 on the RFC batch:
  // two prose `(line N)` numbers here were pinned by no test, and one had gone stale when 170 moved every
  // blocker up a line). No `(line N)`; each `open_blockers[i]` carries `("<quote>")` that blocker i says.
  const sourceProblems = (actions) => actions.flatMap((a) => {
    const out = /\(line \d+\)/.test(a.source ?? '') ? [`${a.id}: a line number in its source`] : [];
    for (const c of (a.source ?? '').matchAll(/open_blockers\[(\d+)\]( \("((?:[^"\\]|\\.)+)"\))?/g)) {
      if (!c[2]) out.push(`${a.id}: open_blockers[${c[1]}] carries no quote`);
      else if (!blockers[Number(c[1])]?.includes(c[3])) out.push(`${a.id}: open_blockers[${c[1]}] does not say "${c[3]}"`);
      else if (blockers.filter((b) => b.includes(c[3])).length !== 1) out.push(`${a.id}: "${c[3]}" is said by more than one blocker`);
    }
    return out;
  });
  assert.deepEqual(sourceProblems(map.actions), [], 'every blocker a source cites still says its quote');
  assert.equal(map.actions.filter((a) => /open_blockers\[\d+\] \("/.test(a.source ?? '')).length, 2, 'the two sources that cite a blocker (rights change, schedule history)');
  const drifted = JSON.parse(JSON.stringify(map.actions));
  drifted.find((a) => a.id === 'owed.asset_rights_change').source = 'WP-0A-DB-00 open_blockers[157] ("Owed to the command surface, to A1 Security/Audit and to batch 141")';
  drifted.find((a) => a.id === 'owed.schedule_transition_history').source = 'WP-0A-DB-00 open_blockers[190] (line 445), item (f)';
  assert.deepEqual(sourceProblems(drifted), ['owed.asset_rights_change: open_blockers[157] does not say "Owed to the command surface, to A1 Security/Audit and to batch 141"',
    'owed.schedule_transition_history: a line number in its source', 'owed.schedule_transition_history: open_blockers[190] carries no quote'], 'and a moved citation or a line number fails');

  // SEC-009's six action classes, read from the document rather than typed here, each have a row.
  const sec009 = (await readFile(SEC_DOC, 'utf8')).split('\n').find((l) => l.startsWith('| SEC-009 |'));
  const named = sec009.match(/\| ([a-z]+(?:\/[a-z]+)+) action/)[1].split('/');
  assert.deepEqual([...named].sort(), [...vocabulary].sort(), "SEC-009's classes are 140's categories");
  for (const category of named) {
    assert.ok(map.actions.some((a) => a.category === category), `SEC-009's ${category} action has no row`);
  }
  // And the two actions the work package records as owed to 141's coverage, by blocker.
  assert.ok(map.actions.some((a) => a.id === 'owed.asset_rights_change' && a.blockers.some((b) => b.index === 156)),
    'the rights change open_blockers[156] owes to batch 141');
  assert.ok(map.actions.some((a) => a.id === 'owed.schedule_transition_history' && a.blockers.some((b) => b.index === 190)),
    "091's schedule transition history, open_blockers[190] (f)");
  // The support row's own blocker, which this batch wrote for F7 (batch 141 prep review, Q0-F2).
  assert.ok(map.actions.some((a) => a.id === 'support.break_glass_access' && a.blockers.some((b) => b.index === 191)),
    'support/break-glass access is held by open_blockers[191] (1)');
  // THE ROWS THE REVIEW ROUND ADDED (C0 G1, A1 R2), each held by the blocker that records what the map
  // is complete against, so dropping one fails by name instead of narrowing the map quietly.
  const reviewRound = {
    'delete.business_or_page': 'delete', 'delete.account': 'delete', 'role.member_remove_or_suspend': 'role',
    'security.security_event': null, 'admin.approval_policy_manage': null, 'admin.workspace_update': null,
    'export.data_export': null, 'billing.admin_adjustment': 'billing', 'support.manual_replay': null,
    'support.service_health_banner': null, 'hold.legal_finance_rights': null,
  };
  for (const [id, category] of Object.entries(reviewRound)) {
    const row = map.actions.find((a) => a.id === id);
    assert.ok(row, `the coverage map lost ${id}`);
    assert.equal(row.category, category, `${id}: category ${category}`);
    assert.ok(row.blockers.some((b) => b.index === 191), `${id}: held by open_blockers[191] (5) or (7)`);
  }
  assert.ok(map.actions.some((a) => a.id === 'security.security_event' && a.tables.includes('app.security_events')),
    "the §8.4 cell's security half has a row on app.security_events");
  assert.match(blockers[191], /WHETHER ANOTHER DOMAIN DOCUMENT NAMES A FURTHER AUDITED ACTION IS OWED TO A0/,
    'what the map is complete against, and what is owed beyond it, is recorded');
  assert.match(map._what, /complete against those sources ONLY/, "the map's own claim is the narrowed one");
});

// The contract's leaves, with $ref resolved: path -> { schema, required } where required means
// required at every step from the root.
const contractLeaves = async () => {
  const dir = 'contract-catalog/shared-kernel';
  const load = async (p) => JSON.parse(await readFile(p, 'utf8'));
  const refs = {
    '../ctr-ten-001/schema.json': await load(`${dir}/ctr-ten-001/schema.json`),
    '../ctr-err-001/schema.json': await load(`${dir}/ctr-err-001/schema.json`),
  };
  const schema = await load(`${dir}/ctr-aud-001/schema.json`);
  const leaves = new Map();
  const walk = (node, path, required) => {
    const s = node.$ref ? refs[node.$ref] : node;
    assert.ok(s, `${path}: unresolvable $ref ${node.$ref}`);
    if (s.properties && Object.keys(s.properties).length > 0) {
      for (const [name, sub] of Object.entries(s.properties)) {
        walk(sub, path ? `${path}.${name}` : name, required && (s.required ?? []).includes(name));
      }
    } else {
      leaves.set(path, { schema: s, required });
    }
  };
  walk(schema, '', true);
  return { schema, refs, leaves };
};

test('batch 141 prep: app.audit_logs reads CTR-AUD-001 column for property, with every divergence pinned', async () => {
  const conformance = JSON.parse(await readFile(`${AUD_FIXTURES}/store-conformance.json`, 'utf8'));
  const code = (await readFile(AUDIT_MIGRATION_140, 'utf8')).replace(SQL_LINE_COMMENTS, '');
  const body = tableBodyOf(code, 'app.audit_logs');
  const columns = columnsOf(body);
  const { leaves } = await contractLeaves();

  // BOTH DIRECTIONS. Every column the store has is in the reading, and nothing the reading names is
  // missing from the store.
  assert.deepEqual([...columns.keys()].sort(), Object.keys(conformance.columns).sort(),
    'the columns of app.audit_logs and the columns the conformance reading names differ');
  const mapped = new Set(Object.values(conformance.columns).flatMap((c) => c.paths));
  for (const path of mapped) assert.ok(leaves.has(path), `CTR-AUD-001 no longer has ${path}, which the store maps`);
  // Every contract leaf is mapped by a column or pinned as unmapped -- and not both.
  for (const path of leaves.keys()) {
    const pinned = Object.hasOwn(conformance.unmapped_contract_paths, path);
    assert.ok(mapped.has(path) !== pinned,
      `CTR-AUD-001's ${path} is ${mapped.has(path) ? 'both mapped and pinned unmapped' : 'neither mapped by a column nor pinned as a divergence'}`);
  }
  for (const path of Object.keys(conformance.unmapped_contract_paths)) {
    assert.ok(leaves.has(path), `the pinned unmapped path ${path} is no longer in CTR-AUD-001`);
  }

  // THE DIVERGENCES ARE A CLOSED LIST: the four 140 declares (open_blockers[33], line 287), and the
  // ones this reading found that 140 does not declare. Adding one is a diff a reviewer reads.
  const divergences = conformance.divergences;
  assert.deepEqual(Object.keys(divergences).filter((k) => divergences[k].declared).sort(),
    ['error_is_one_column', 'no_details_column', 'no_locale_no_timezone', 'tenant_context_flattened'],
    "140's four declared divergences, exactly");
  assert.deepEqual(Object.keys(divergences).filter((k) => !divergences[k].declared).sort(),
    ['audit_id_is_a_uuid_named_id', 'created_at_is_store_only', 'ids_not_blank_narrows_min_length', 'scope_ids_are_uuid',
      'two_contract_values_one_column'],
    'the undeclared divergences this reading found, each a finding in the draft record or its review round');
  const used = new Set([
    ...Object.values(conformance.columns).map((c) => c.divergence).filter(Boolean),
    ...Object.values(conformance.unmapped_contract_paths),
    ...Object.values(conformance.type_narrowings),
    ...Object.values(conformance.check_narrowings),
  ]);
  assert.deepEqual([...used].sort(), Object.keys(divergences).sort(), 'every divergence is used, and only those');
  const wp = JSON.parse(await readFile(WP_FILE, 'utf8'));
  assert.match(wp.open_blockers[33], /four divergences are declared in the migration header/,
    'open_blockers[33] still records the four declared divergences');

  // TYPE AND REQUIREDNESS, column by column, from the column's first contract path.
  for (const [name, { paths }] of Object.entries(conformance.columns)) {
    const column = columns.get(name);
    if (paths.length === 0) continue;
    const { schema, required } = leaves.get(paths[0]);
    assert.equal(column.notNull, required, `${name}: NOT NULL must follow ${paths[0]}'s requiredness in CTR-AUD-001`);
    const expected = conformance.type_narrowings[name] ? 'uuid'
      : schema.format === 'date-time' ? 'timestamptz'
        : schema.const === true ? 'boolean' : 'text';
    assert.equal(column.type, expected, `${name}: ${paths[0]} reads as ${expected}`);
    if (expected === 'uuid') assert.equal(schema.type, 'string', `${name}: the narrowing pinned is string -> uuid`);
  }

  // VOCABULARIES AND GRAMMARS, CHECK text against the contract keyword, so a moved enum or pattern
  // fails by column name.
  const inList = (column) => [...body.match(new RegExp(`check \\(${column} in \\(([^)]*)\\)\\)`))[1]
    .matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.deepEqual(inList('action_category'), leaves.get('action.category').schema.enum, 'action_category = action.category enum');
  assert.deepEqual(inList('outcome'), leaves.get('outcome').schema.enum, 'outcome = outcome enum');
  assert.deepEqual(inList('actor_kind'), leaves.get('actor.kind').schema.enum, 'actor_kind = actor.kind enum');
  assert.deepEqual(leaves.get('tenant_context.actor.kind').schema.enum, leaves.get('actor.kind').schema.enum,
    'the two actor kinds the column collapses still agree');
  for (const [column, path] of [['action_name', 'action.name'], ['reason_key', 'reason_key'],
    ['retention_policy_ref', 'retention.policy_ref'], ['change_before_ref', 'change.before_ref'],
    ['change_after_ref', 'change.after_ref']]) {
    const { schema } = leaves.get(path);
    const sqlPattern = body.match(new RegExp(`${column} ~ '([^']*)'`))?.[1];
    assert.equal(sqlPattern, schema.pattern.replaceAll('(?:', '('), `${column}: CHECK pattern = ${path} pattern`);
    assert.match(body, new RegExp(`length\\(${column}\\) <= ${schema.maxLength}\\b`), `${column}: CHECK length = ${path} maxLength`);
  }
  for (const flag of ['secret_redacted', 'content_redacted', 'pii_redacted']) {
    assert.equal(leaves.get(`redaction.${flag}`).schema.const, true, `redaction.${flag} is const true`);
  }
  assert.match(body, /check \(secret_redacted and content_redacted and pii_redacted\)/, 'the store asserts all three');

  // THE NOT-BLANK CHECKS, BOTH DIRECTIONS (batch 141 prep review, C0 G2). Every `*_not_blank` CHECK on
  // the table is named in check_narrowings, every name there has its CHECK with exactly this text, and
  // each column's contract paths are strings of minLength 1 -- which is why `length(btrim(x)) > 0` is a
  // narrowing (F15 on open_blockers[33]) and not a restatement.
  const notBlank = [...body.matchAll(/constraint audit_logs_(\w+)_not_blank\b/g)].map((m) => m[1]).sort();
  assert.deepEqual(notBlank, Object.keys(conformance.check_narrowings).sort(),
    "app.audit_logs' not-blank CHECKs and the columns check_narrowings names differ");
  for (const [column, divergence] of Object.entries(conformance.check_narrowings)) {
    assert.equal(divergence, 'ids_not_blank_narrows_min_length', `${column}: the narrowing is the one F15 pins`);
    const nullable = !columns.get(column).notNull;
    const check = nullable ? `${column} is null or length\\(btrim\\(${column}\\)\\) > 0` : `length\\(btrim\\(${column}\\)\\) > 0`;
    assert.match(body, new RegExp(`constraint audit_logs_${column}_not_blank\\s+check \\(${check}\\)`),
      `${column}: audit_logs_${column}_not_blank is \`${nullable ? `${column} is null or ` : ''}length(btrim(${column})) > 0\``);
    for (const path of conformance.columns[column].paths) {
      const { schema } = leaves.get(path);
      assert.equal(schema.type, 'string', `${column}: ${path} is a string in the contract`);
      assert.equal(schema.minLength, 1, `${column}: ${path} is minLength 1 in the contract, which " " satisfies`);
    }
  }
  assert.match(wp.open_blockers[33], /\(F15\) 140's not-blank CHECKs/, 'open_blockers[33] records F15');

  // NO LATER MIGRATION CHANGES EITHER AUDIT TABLE (batch 141 prep review, Q0-F1): the reading above is
  // of 140's CREATE TABLE, so a later `alter table ... add column` would add a column it never sees. A
  // forward fix to this family arrives with its own conformance update; this makes that a failure here
  // rather than an omission. Like the policy scan above, a tripwire and not the catalog.
  for (const later of (await readdir('db/foundation/migrations')).filter((n) => n > '140_audit.sql')) {
    const text = auditScanText(await readFile(`db/foundation/migrations/${later}`, 'utf8'));
    assert.doesNotMatch(text, AUDIT_TABLE_ALTER,
      `${later} alters an audit table: update store-conformance.json and this test with it`);
  }
  for (const spelling of ['alter table app.audit_logs add column details jsonb', 'ALTER TABLE IF EXISTS ONLY "app"."security_events" ADD x int',
    'alter table audit_logs add column y bigint']) {
    assert.match(spelling, AUDIT_TABLE_ALTER, `the later-migration ALTER scan misses: ${spelling}`);
  }
  // AND EVERY OTHER WAY A LATER MIGRATION CHANGES WHO CAN WRITE OR WHAT IS STORED (the owed-tooling batch; Q0 R2,
  // C0 N3, A1 N2 and N3 on 141-prep's re-check: a later GRANT, CREATE TRIGGER, ALTER POLICY or a drop-and-recreate
  // of either table passed the two scans above and was caught only because any new migration fails the
  // generic not-applied snapshot test, which sees THAT a file was added, not what it writes). Still a tripwire,
  // a text scan of the spellings pinned below and no more: a dynamic EXECUTE, a statement on another relation
  // that reaches these (a function a trigger runs, rewritten -- the pinned trigger probe holds that body), and
  // any spelling not pinned here are not read; the live probes (pinned grant, trigger, pinned trigger, rewrite
  // rule) hold the catalog, and the catalog assertion for every role is owed with batch 141's migration
  // (open_blockers[191] (9)). Since the review round (A1-OT-3) comments are read as whitespace, and CREATE RULE
  // and a rename onto either name are read too.
  for (const later of (await readdir('db/foundation/migrations')).filter((n) => n > '140_audit.sql')) {
    const text = auditScanText(await readFile(`db/foundation/migrations/${later}`, 'utf8'));
    for (const [what, pattern] of AUDIT_TABLE_TOUCH) assert.doesNotMatch(text, pattern, `${later}: ${what} on an audit table`);
  }
  for (const [spelling, what] of [
    ['grant insert on app.audit_logs to authenticated', 'a GRANT or REVOKE'], ['GRANT SELECT ON TABLE "app"."security_events" TO app_worker', 'a GRANT or REVOKE'],
    ['grant select on app.jobs, app.audit_logs to app_command', 'a GRANT or REVOKE'], ['revoke all on audit_logs from app_worker', 'a GRANT or REVOKE'],
    ['grant update on all tables in schema app to app_worker', 'a GRANT or REVOKE on every table in app'],
    ['create trigger t before insert on app.audit_logs for each row execute function private.f()', 'a trigger'],
    ['CREATE OR REPLACE TRIGGER t AFTER INSERT ON "app"."security_events" FOR EACH ROW EXECUTE FUNCTION f()', 'a trigger'],
    ['drop trigger refuse_mutation on app.audit_logs', 'a trigger'], ['alter trigger refuse_truncate on app.security_events rename to x', 'a trigger'],
    ['alter policy p on app.audit_logs using (true)', 'a policy changed or dropped'], ['drop policy if exists p on security_events', 'a policy changed or dropped'],
    ['drop table app.audit_logs', 'a table dropped or created'], ['drop table if exists app.jobs, app.security_events cascade', 'a table dropped or created'],
    ['create table app.audit_logs (id uuid primary key, details jsonb)', 'a table dropped or created'],
    ['create unlogged table if not exists "app"."security_events" (id uuid)', 'a table dropped or created'],
    // The review round (A1-OT-3, Q0-OT-8): comments between the words, a rewrite rule, and a rename onto the name.
    ['grant insert on /* x */ app.audit_logs to authenticated', 'a GRANT or REVOKE'], ['grant insert on table/**/app.audit_logs to authenticated', 'a GRANT or REVOKE'],
    ['create trigger t before insert on/* a /* nested */ b */app.audit_logs for each row execute function f()', 'a trigger'],
    ['create /* c */ trigger t before insert on app.security_events for each row execute function f()', 'a trigger'],
    ['drop policy p on /* c */ app.security_events', 'a policy changed or dropped'], ['drop /* c */ table app.audit_logs', 'a table dropped or created'],
    ['create rule r as on insert to app.audit_logs do instead nothing', 'a rewrite rule'],
    ['CREATE OR REPLACE RULE "r" AS ON UPDATE TO "app"."security_events" DO INSTEAD NOTHING', 'a rewrite rule'],
    ['alter table app.audit_logs_new rename to audit_logs', 'a table renamed onto either name'],
    ['ALTER TABLE IF EXISTS app.x RENAME TO "security_events"', 'a table renamed onto either name'],
  ]) {
    assert.ok(AUDIT_TABLE_TOUCH.some(([w, p]) => w === what && p.test(auditScanText(spelling))), `the later-migration scan reads ${what}: ${spelling}`);
  }
  assert.match(sqlWithoutComments('alter table /* x */ app.audit_logs disable trigger refuse_mutation'), AUDIT_TABLE_ALTER, 'the older ALTER scan reads past a comment too');
  assert.match(sqlWithoutComments('create policy p on /* x */ app.audit_logs for insert'), AUDIT_TABLE_POLICY, 'and the older POLICY scan');
  assert.equal(sqlWithoutComments("select '/* not a comment */', \"--x\" -- gone\n/* a /* b */ c */ from t"), "select '/* not a comment */', \"--x\"  \n  from t",
    'a comment inside a literal or a quoted identifier is kept; a nested one is removed whole');
  // The sql-lexer batch (A1-RC-I1, Q0-OT2-7): a `--` inside a dollar-quoted string is not a comment, so the statement
  // after it on the line is read; a `;` inside a quoted name or a literal does not end the statement; a GRANT that a
  // DO block EXECUTEs from a literal is read as the statement it is.
  assert.equal(sqlWithoutComments("select $q$ -- not a comment $q$; grant x -- gone"), "select $q$ -- not a comment $q$; grant x  ", 'a dollar body is kept whole');
  for (const [spelling, what] of [
    ['select $$--$$; grant insert on app.audit_logs to anon;', 'a GRANT or REVOKE'],
    ['create trigger "t;x" before insert on app.audit_logs for each row execute function f();', 'a trigger'],
    ["alter policy p on app.audit_logs using (x <> ';');", 'a policy changed or dropped'],
    ["do $$ begin execute 'grant insert on app.audit_logs to anon'; end $$;", 'a GRANT or REVOKE'],
    ["do $d$ begin execute $g$drop table app.security_events$g$; end $d$;", 'a table dropped or created'],
  ]) {
    assert.ok(AUDIT_TABLE_TOUCH.some(([w, p]) => w === what && p.test(auditScanText(spelling))), `the lexer-read scan reads ${what}: ${spelling}`);
  }
  assert.match(auditScanText('create policy "a;b" on app.audit_logs for insert;'), AUDIT_TABLE_POLICY, 'and the POLICY scan past a `;` in a quoted name');
  for (const other of ['grant select on app.audit_logs_archive to app_worker', 'create trigger t before insert on app.my_security_events for each row execute function f()',
    'drop table app.audit_logs_old', 'revoke update (lifecycle_state) on app.workspaces from authenticated',
    'create rule r as on insert to app.audit_logs_archive do instead nothing', 'alter table app.jobs rename to jobs_old', 'alter table app.audit_logs_old rename column x to audit_logs']) {
    assert.ok(!AUDIT_TABLE_TOUCH.some(([, p]) => p.test(other)), `and names the two audit tables, not another: ${other}`);
  }
});

// The later-migration scan's other spellings (the owed-tooling batch). Each table reference is bounded on both
// sides, so a name that merely contains `audit_logs` is not read as it.
const AUDIT_TABLE_REF_BOUNDED = String.raw`(?<![\w."])${AUDIT_TABLE_REF}`;
const AUDIT_TABLE_TOUCH = [
  ['a GRANT or REVOKE', new RegExp(String.raw`\b(?:grant|revoke)\b[^;]*\bon\s+(?:table\s+)?(?:[^;]*?,\s*)?${AUDIT_TABLE_REF_BOUNDED}`, 'i')],
  ['a GRANT or REVOKE on every table in app', /\b(?:grant|revoke)\b[^;]*\bon\s+all\s+tables\s+in\s+schema\s+[^;]*(?<![\w"])"?app"?(?![\w"])/i],
  ['a trigger', new RegExp(String.raw`\b(?:create\s+(?:or\s+replace\s+)?(?:constraint\s+)?|drop\s+|alter\s+)trigger\b[^;]*\bon\s+(?:only\s+)?${AUDIT_TABLE_REF_BOUNDED}`, 'i')],
  ['a policy changed or dropped', new RegExp(String.raw`\b(?:alter|drop)\s+policy\b[^;]*\bon\s+(?:only\s+)?${AUDIT_TABLE_REF_BOUNDED}`, 'i')],
  ['a table dropped or created', new RegExp(String.raw`\b(?:drop\s+table\b[^;]*|create\s+(?:(?:global\s+|local\s+)?(?:temp|temporary)\s+|unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?)${AUDIT_TABLE_REF_BOUNDED}`, 'i')],
  // The review round (A1-OT-3): a rewrite rule on either table (DO INSTEAD NOTHING drops every audit write), and a
  // table renamed onto either name (a create-then-rename swap; only the rename's target names the table).
  ['a rewrite rule', new RegExp(String.raw`\bcreate\s+(?:or\s+replace\s+)?rule\b[^;]*\bon\s+(?:select|insert|update|delete)\s+to\s+${AUDIT_TABLE_REF_BOUNDED}`, 'i')],
  ['a table renamed onto either name', /\balter\s+table\b[^;]*\brename\s+to\s+"?(?:audit_logs|security_events)"?(?![\w"])/i],
];

test('batch 141 prep: CTR-AUD-001 fixtures validate as declared, and every valid one fits the store', async () => {
  const { validate } = await import('../contracts/json-schema-subset.mjs');
  const { schema, refs, leaves } = await contractLeaves();
  const resolve = (ref) => refs[ref] ?? null;
  const conformance = JSON.parse(await readFile(`${AUD_FIXTURES}/store-conformance.json`, 'utf8'));
  // Each invalid fixture fails for ONE stated reason, at its path -- not for an incidental one.
  const INVALID = {
    'invalid-category-rights.json': '$.action.category: value not in enum',
    'invalid-category-schedule.json': '$.action.category: value not in enum',
    'invalid-delete-without-before-ref.json': "$.change: missing required property 'before_ref'",
    'invalid-details-not-empty.json': '$.details: has 1 properties, more than maxProperties 0',
    'invalid-failed-without-error.json': "$: missing required property 'error'",
    'invalid-pii-not-redacted.json': '$.redaction.pii_redacted: expected const true',
    'invalid-succeeded-with-error.json': '$: matches a schema it must not match',
    'invalid-tenant-locale-not-thai.json': '$.tenant_context.locale: expected const "th-TH"',
  };
  const files = (await readdir(AUD_FIXTURES)).filter((n) => /^(valid|invalid)-.*\.json$/.test(n)).sort();
  assert.deepEqual(files.filter((n) => n.startsWith('invalid-')), Object.keys(INVALID).sort(),
    'every invalid fixture has its expected reason here, and every expectation has its fixture');
  const valid = files.filter((n) => n.startsWith('valid-'));
  assert.ok(valid.length >= 4, 'at least four valid fixtures');
  const categories = new Set();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const at = (doc, path) => path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), doc);
  for (const name of files) {
    const doc = JSON.parse(await readFile(`${AUD_FIXTURES}/${name}`, 'utf8'));
    const errors = validate(schema, doc, { resolve });
    if (name.startsWith('invalid-')) {
      assert.equal(errors.length, 1, `${name} fails for exactly one reason, got ${JSON.stringify(errors)}`);
      assert.ok(errors[0].startsWith(INVALID[name]), `${name}: expected "${INVALID[name]}", got "${errors[0]}"`);
      // F6's evidence is the category each names, not only the enum error (batch 141 prep review, Q0-F5).
      const F6 = { 'invalid-category-rights.json': 'rights', 'invalid-category-schedule.json': 'schedule' };
      if (F6[name]) assert.equal(doc.action.category, F6[name], `${name}: the category F6 shows the enum refusing`);
      continue;
    }
    assert.deepEqual(errors, [], `${name} is valid against CTR-AUD-001`);
    categories.add(doc.action.category);
    // THE STORE CAN HOLD IT: every NOT NULL column gets a value, the copies a column collapses
    // agree, and the uuid-typed columns get uuids.
    for (const [column, { paths }] of Object.entries(conformance.columns)) {
      if (paths.length === 0) continue;
      const values = paths.map((p) => at(doc, p)).filter((v) => v !== undefined);
      assert.ok(new Set(values.map((v) => JSON.stringify(v))).size <= 1,
        `${name}: ${paths.join(', ')} disagree, and app.audit_logs.${column} can hold one of them`);
      if (leaves.get(paths[0]).required) assert.ok(values.length > 0, `${name}: ${column} is NOT NULL and gets no value`);
      if (conformance.type_narrowings[column] && values.length > 0) {
        assert.match(values[0], uuid, `${name}: ${column} is uuid in the store`);
      }
    }
  }
  assert.ok(categories.size >= 4, 'the valid fixtures span at least four of the six categories');

  // app.security_events: no contract governs it, and the conformance file says so; the day one does,
  // this fails and the reading above owes it a twin.
  assert.ok(conformance.not_governed['app.security_events'], 'the gap is recorded');
  for (const entry of await readdir('contract-catalog/shared-kernel', { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const text = await readFile(`contract-catalog/shared-kernel/${entry.name}/schema.json`, 'utf8');
    assert.doesNotMatch(text, /security_event|source_ip_hash|user_agent_hash/,
      `${entry.name} now describes the security event; write its store conformance`);
  }
});

// ---------------------------------------------------------------------------------------------------
// BATCH 160 PREPARATION: THE RETENTION MAP, THE §11.1 EXPORT MANIFEST FIXTURE AND THE §11.4 PURGE ORDER.
// Data only, no migration (the plan for 141-170, "Batch 160 -- 3. Can do now"). Each file was measured on
// a clean migrate-clean and is held here against what the MIGRATION TEXT says, re-derived on every run:
// the table set, the columns, the UPDATE/DELETE grants, the policies, the triggers, the indexes and the
// foreign keys. A file that described a schema that no longer exists fails here, not in batch 160.
// ---------------------------------------------------------------------------------------------------
const RETENTION_MAP = 'db/foundation/lint/retention-map.json';
const PURGE_ORDER = 'db/foundation/lint/purge-order.json';
const EXPORT_FIXTURE = 'test-kits/db/export-manifest.fixture.json';
const ERD = 'docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md';

async function migrationText160() {
  const names = (await readdir('db/foundation/migrations')).filter((n) => n.endsWith('.sql')).sort();
  return Promise.all(names.map(async (n) => ({ name: n,
    sql: (await readFile(`db/foundation/migrations/${n}`, 'utf8')).replace(SQL_LINE_COMMENTS, '') })));
}

// The bodies of every `create table`, by table, read with the parenthesis depth so a CHECK or a
// default with parentheses inside does not end the body early.
function tableBodies160(files) {
  const bodies = new Map();
  for (const { sql } of files) {
    for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?((?:app|private)\.(\w+))\s*\(/gi)) {
      let depth = 1; let i = m.index + m[0].length;
      for (; i < sql.length && depth; i++) { if (sql[i] === '(') depth++; else if (sql[i] === ')') depth--; }
      bodies.set(m[1].toLowerCase(), { short: m[2], body: sql.slice(m.index + m[0].length, i - 1) });
    }
  }
  return bodies;
}

function columnsOf160(files, bodies, table) {
  const cols = new Set();
  const { body } = bodies.get(table);
  for (const line of body.split(/,\s*\n/)) {
    const m = line.trim().match(/^([a-z_][a-z0-9_]*)\s+(?!key\b|\()/i);
    if (m && !/^(constraint|primary|unique|check|foreign|exclude)$/i.test(m[1])) cols.add(m[1].toLowerCase());
  }
  const esc = table.replace('.', '\\.');
  for (const { sql } of files) {
    for (const m of sql.matchAll(new RegExp(`alter\\s+table\\s+(?:only\\s+)?${esc}\\s+([^;]*);`, 'gi'))) {
      for (const a of m[1].matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi)) cols.add(a[1].toLowerCase());
    }
  }
  return cols;
}

// UPDATE grants as `table|role:column`, DELETE/TRUNCATE grants as `table|role`, replayed in file order
// with revokes. Measured equal to the live catalog at 75c9274: 216 UPDATE pairs, no DELETE or TRUNCATE.
// A schema-wide `on all tables in schema app` is expanded to every table of that schema the migrations
// create (the review round, Q0-F2: it passed every static layer before).
function grants160(files, columnsByTable, tables = []) {
  const update = new Set(); const remove = new Set();
  for (const { sql } of files) {
    for (const m of sql.matchAll(/\b(grant|revoke)\s+([^;]*?)\s+on\s+(?:(?:table\s+)?((?:(?:app|private)\.\w+\s*,?\s*)+)|all\s+tables\s+in\s+schema\s+((?:app|private)(?:\s*,\s*(?:app|private))*))\s+(to|from)\s+([^;]+);/gi)) {
      const grant = m[1].toLowerCase() === 'grant';
      const objects = m[3] ? m[3].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
        : m[4].split(',').map((s) => s.trim().toLowerCase()).flatMap((s) => [...tables].filter((t) => t.startsWith(`${s}.`)));
      const roles = m[6].split(',').map((s) => s.trim().toLowerCase().replace(/\s+with\s+grant\s+option$/, ''));
      for (const o of objects) for (const r of roles) {
        for (const item of m[2].split(/,(?![^()]*\))/).map((s) => s.trim().toLowerCase())) {
          const cols = item.match(/^update\s*\(([^)]*)\)$/);
          const touch = (k) => (grant ? update.add(k) : update.delete(k));
          if (cols) for (const c of cols[1].split(',')) touch(`${o}|${r}:${c.trim()}`);
          else if (['update', 'all', 'all privileges'].includes(item)) for (const c of columnsByTable(o)) touch(`${o}|${r}:${c}`);
          if (['delete', 'truncate', 'all', 'all privileges'].includes(item)) (grant ? remove.add(`${o}|${r}`) : remove.delete(`${o}|${r}`));
        }
      }
    }
  }
  return { update, remove };
}

// Index names and their column lists: `create index` statements, named PRIMARY KEY / UNIQUE constraints
// and inline primary keys. Measured equal to the live catalog at 75c9274: all 269 indexes, by name and
// leading column. A partial index carries its WHERE predicate as written (the review round, C0 G6: 33
// are partial, and a predicate can exclude the very rows a sweep reads).
function indexes160(files, bodies) {
  const idx = new Map();
  const list = (s) => s.split(',').map((c) => c.trim().split(/\s+/)[0].toLowerCase());
  for (const { sql } of files) {
    for (const m of sql.matchAll(/create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?(\w+)\s+on\s+(?:only\s+)?((?:app|private)\.\w+)(?:\s+using\s+\w+)?\s*\(([^)]*)\)([^;]*);/gi)) {
      const where = m[4].match(/\bwhere\s+([\s\S]*)$/i);
      idx.set(m[1], { table: m[2].toLowerCase(), cols: list(m[3]), ...(where ? { where: where[1].replace(/\s+/g, ' ').trim() } : {}) });
    }
    for (const m of sql.matchAll(/alter\s+table\s+(?:only\s+)?((?:app|private)\.\w+)\s+add\s+constraint\s+(\w+)\s+(?:primary\s+key|unique(?:\s+nulls\s+not\s+distinct)?)\s*\(([^)]*)\)/gi)) {
      idx.set(m[2], { table: m[1].toLowerCase(), cols: list(m[3]) });
    }
    for (const m of sql.matchAll(/drop\s+index\s+(?:if\s+exists\s+)?(?:(?:app|private)\.)?(\w+)/gi)) idx.delete(m[1]);
  }
  for (const [table, { short, body }] of bodies) {
    for (const c of body.matchAll(/constraint\s+(\w+)\s+(?:primary\s+key|unique(?:\s+nulls\s+not\s+distinct)?)\s*\(([^)]*)\)/gi)) idx.set(c[1], { table, cols: list(c[2]) });
    for (const c of body.matchAll(/^\s*(?!constraint\b)([a-z_]+)\s+[a-z0-9_ ()]+?\bprimary\s+key\b/gim)) idx.set(`${short}_pkey`, { table, cols: [c[1].toLowerCase()] });
    for (const c of body.matchAll(/^\s*primary\s+key\s*\(([^)]*)\)/gim)) idx.set(`${short}_pkey`, { table, cols: list(c[1]) });
  }
  return idx;
}

const covering160 = (idx, table, key) => [...idx].filter(([, v]) => v.table === table && v.cols.length >= key.length
  && key.every((k) => v.cols.slice(0, key.length).includes(k))).map(([n]) => n).sort();

// Foreign-key edges child -> parent from the migration text: inline `references` in a create-table body
// and `alter table ... add constraint ... references`. Measured equal to the live catalog at 75c9274:
// 90 keys over 87 distinct edges. Each edge is `fk|child|parent`, the key's name read from the text: a
// named constraint, or PostgreSQL's default `<table>_<columns>_fkey` (the review round, C0 G8 / Q0-F4:
// the names were never compared before; all 90 equal pg_constraint, measured live by C0 at 1706111).
function fkEdges160(files, bodies) {
  const edges = [];
  const named = (table, short, piece, parent) => {
    const c = piece.match(/constraint\s+(\w+)\s+(?:foreign\s+key\s*\([^)]*\)\s*)?references$/i);
    if (c) return `${c[1]}|${table}|${parent}`;
    const fk = piece.match(/foreign\s+key\s*\(([^)]*)\)\s*references$/i);
    if (fk) return `${short}_${fk[1].split(',').map((s) => s.trim()).join('_')}_fkey|${table}|${parent}`;
    const col = piece.match(/(?:^|[,(]|add\s+column\s+(?:if\s+not\s+exists\s+)?)\s*([a-z_][a-z0-9_]*)\s+[^,]*?references$/i);
    return `${col ? `${short}_${col[1]}_fkey` : '?'}|${table}|${parent}`;
  };
  for (const [table, { short, body }] of bodies) {
    for (const r of body.matchAll(/references\s+((?:app|private)\.\w+)/gi)) {
      const start = Math.max(body.slice(0, r.index).lastIndexOf(',\n'), 0);
      edges.push(named(table, short, body.slice(start, r.index + 'references'.length).replace(/\s+/g, ' ').trim(), r[1].toLowerCase()));
    }
  }
  for (const { sql } of files) {
    for (const m of sql.matchAll(/alter\s+table\s+(?:only\s+)?((?:app|private)\.(\w+))([^;]*?)references\s+((?:app|private)\.\w+)/gi)) {
      if (/add\s+constraint|add\s+column|foreign\s+key/i.test(m[3])) edges.push(named(m[1].toLowerCase(), m[2], `${m[3]}references`.replace(/\s+/g, ' ').trim(), m[4].toLowerCase()));
    }
  }
  return edges.sort();
}

// §5 and §10 read from the document itself, so a class this map calls defined is one the document defines.
function erdTable160(lines, from, to) {
  const start = lines.findIndex((l) => l.startsWith(from));
  const end = lines.findIndex((l, i) => i > start && l.startsWith(to));
  assert.ok(start >= 0 && end > start, `the ERD still has ${from} before ${to}`);
  const rows = [];
  for (let i = start; i < end; i++) {
    if (!lines[i].startsWith('| `')) continue;
    rows.push({ line: i + 1, cells: lines[i].split('|').map((s) => s.trim()).slice(1, -1) });
  }
  return rows;
}
const reaches160 = (cell, cls) => cell.split('/').some((tok) => tok === cls || (tok.endsWith('*') && cls.startsWith(tok.slice(0, -1))));

// A RETENTION WINDOW in any form §10 and DATA-DEC write one: an English unit (not followed by a letter),
// a Thai unit (no `\b`: in JavaScript it is an ASCII boundary, so `วัน\b` never matched at the end of a
// string or before a space -- the review round, C0 G1 / A1 S1 / Q0-F1), with or without a space or a
// hyphen between the digit and the unit.
const WINDOW160 = /\d+\s*-?\s*(?:(?:hours?|days?|weeks?|months?|years?)(?![A-Za-z])|ชั่วโมง|วัน|สัปดาห์|เดือน|ปี)/i;
// The trigger functions that REFUSE a write, and the ones read to only stamp a timestamp. A trigger on a
// table with anonymise columns whose function is in neither list fails until it is read and placed.
const REFUSING_FUNCTIONS160 = ['private.refuse_mutation', 'private.set_decided_at'];
const STAMPING_FUNCTIONS160 = ['private.set_updated_at', 'private.set_deleted_at'];
// §11.4 step 8 (ERD:598) names finance, audit and security: a table of those classes goes in phase 8.
const STEP8_CLASSES160 = ['FINANCE-HISTORY', 'AUDIT', 'SECURITY'];

test('the retention map has one row per table, every class is one §10 defines and §5 reaches or a finding, and every blocking control it names holds in the migrations', async () => {
  const map = JSON.parse(await readFile(RETENTION_MAP, 'utf8'));
  const { tablesCreatedByMigrations } = await import('../../scripts/db/run.mjs');
  const tables = await tablesCreatedByMigrations();
  const files = await migrationText160();
  const bodies = tableBodies160(files);
  const cols = (t) => columnsOf160(files, bodies, t);
  const { update, remove } = grants160(files, cols, tables);
  const idx = indexes160(files, bodies);
  const all = files.map((f) => f.sql).join('\n');
  const lines = (await readFile(ERD, 'utf8')).split('\n');

  // THE WINDOW GUARD BITES ON THE FORMS §10 WRITES (a self-test, so it cannot rot silently again), and
  // not on the ids and counts the map does carry.
  for (const w of ['180 วัน', 'อายุ Workspace + 1 ปี', '12 เดือนหลัง final state', '30วัน', '24 ชั่วโมง', '2 สัปดาห์',
    '30-day recovery', '30 days', '1 year', '24 hours', '2 weeks']) assert.match(JSON.stringify({ basis: w }), WINDOW160, `the window guard reads "${w}"`);
  for (const w of ['row 5 of 27 (ERD:492)', 'F160-13', 'WP:446 (open_blockers[192])', 'section 5, line 201']) assert.doesNotMatch(w, WINDOW160, `"${w}" is not a window`);

  // EXACTLY ONE ROW PER TABLE, AND NO ROW FOR A TABLE NO MIGRATION CREATES.
  const named = map.rows.map((r) => r.table);
  assert.equal(new Set(named).size, named.length, 'no table has two rows');
  assert.deepEqual([...named].sort(), [...tables].sort(), 'the rows are exactly the tables the migrations create, in app and private');
  assert.ok(tables.size >= 66, `the table set was derived (measured 66 at 75c9274), got ${tables.size}`);

  // §10, READ FROM THE DOCUMENT: the 27 classes, their row numbers and their final behaviour verbatim.
  const s10 = erdTable160(lines, '## 10. Retention Baseline', '### Retention precedence');
  assert.equal(s10.length, 27, '§10 defines 27 classes');
  assert.deepEqual(Object.keys(map.section10_classes), s10.map((r) => r.cells[0].replace(/`/g, '')), 'the map carries §10\'s classes, in §10\'s order, and no other');
  s10.forEach((r, i) => {
    const c = map.section10_classes[r.cells[0].replace(/`/g, '')];
    assert.equal(c.row, i + 1); assert.equal(c.line, r.line);
    assert.equal(c.final_behaviour_as_written, r.cells[4], `${r.cells[0]}'s final behaviour is quoted, not paraphrased`);
    assert.ok(c.final_behaviour.length && c.final_behaviour.every((b) => ['purge', 'anonymise', 'retain'].includes(b)));
  });
  const s5 = new Map(erdTable160(lines, '## 5. Canonical Data Dictionary Summary', '### Required field-level dictionary template').map((r) => [r.line, r.cells]));

  const findings = new Map(map.findings.map((f) => [f.id, f]));
  assert.equal(findings.size, map.findings.length, 'finding ids are unique');
  const DECISIONS = ['DATA-DEC-03', 'DATA-DEC-04', 'DATA-DEC-05', 'DATA-DEC-06', 'DATA-DEC-07', 'DATA-DEC-08', 'DATA-DEC-09', 'DATA-DEC-10', 'Q160-a', 'Q160-b', 'Q160-c', 'Q160-d'];
  const KINDS = ['no-delete-grant', 'no-update-grant', 'client-only-update', 'grant-without-policy', 'trigger', 'no-schema-usage'];
  const policyTo = (table, role) => new RegExp(`create\\s+policy[^;]*\\bon\\s+${table.replace('.', '\\.')}\\b[^;]*\\bto\\s+[^;]*\\b${role}\\b`, 'i').test(all);
  const holders = (t, c) => [...update].filter((k) => k.startsWith(`${t}|`) && k.endsWith(`:${c}`)).map((k) => k.slice(t.length + 1).split(':')[0]);
  const used = new Set();

  for (const r of map.rows) {
    const at = r.table;
    const row5 = s5.get(r.section5.line);
    assert.ok(row5, `${at}: §5 line ${r.section5.line} is a row of §5`);
    assert.deepEqual([r.section5.module, r.section5.family, r.section5.sensitivity, r.section5.retention],
      [row5[0].replace(/`/g, ''), row5[1], row5[4], row5[5]], `${at}: the §5 cells are verbatim`);
    for (const k of r.section9_classes) assert.ok(r.section5.sensitivity.split('/').includes(k), `${at}: ${k} is picked from §5's sensitivity cell, not invented`);
    // An export-excluding class §5's cell carries and the row does not pick is a judgement, so it carries
    // its reason (the review round, A1 S4 / Q0-F3 / C0 N2): the exclusion's input is held, not only its output.
    const notPicked = ['SECRET-4', 'SECURITY-4', 'INTERNAL-3'].filter((k) => r.section5.sensitivity.split('/').includes(k) && !r.section9_classes.includes(k));
    assert.deepEqual((r.section9_not_picked ?? []).map((n) => n.class), notPicked, `${at}: every excluding class §5 gives it and it does not pick carries a reason, and only those`);
    for (const n of r.section9_not_picked ?? []) assert.ok(n.why.length > 40, `${at}: ${n.class} not picked, and why`);

    if (r.class_status === 'defined') {
      const c = map.section10_classes[r.section10_class];
      assert.ok(c, `${at}: ${r.section10_class} is a class §10 defines`);
      assert.ok(reaches160(r.section5.retention, r.section10_class), `${at}: §5's cell ${r.section5.retention} reaches ${r.section10_class}; a class §5 does not reach is a finding, not a definition`);
      assert.equal(r.section10_row, `row ${c.row} of 27 (ERD:${c.line})`);
      assert.deepEqual(r.final_behaviour, c.final_behaviour, `${at}: the behaviour is the class's`);
      assert.ok(r.decisions.includes('Q160-a'), `${at}: a defined class still needs §10's numbers approved (Q160-a)`);
      for (const extra of r.section10_classes_by_row ?? []) { assert.ok(map.section10_classes[extra] && reaches160(r.section5.retention, extra)); used.add(extra); }
      if (r.also_claimed_by) { assert.ok(map.section10_classes[r.also_claimed_by] && findings.has(r.also_claimed_finding)); used.add(r.also_claimed_by); }
      used.add(r.section10_class);
    } else {
      assert.equal(r.class_status, 'finding', `${at}: a class is defined or it is a finding`);
      assert.equal(r.section10_class, null); assert.equal(r.section10_row, null);
      assert.deepEqual(r.final_behaviour, [], `${at}: a finding row is given no behaviour`);
      const f = findings.get(r.finding);
      assert.ok(f, `${at}: its finding ${r.finding} is recorded`);
      assert.equal(f.class_as_written, r.section5.retention, `${at}: the finding is about the class §5 wrote for it`);
    }
    // NEVER A NUMBER: no row states a window, defined or not. §10's numbers are unapproved (ERD:484).
    assert.doesNotMatch(JSON.stringify(r), WINDOW160, `${at}: no row carries a retention number`);
    const numericLeaves = [];
    const walk = (v, path) => { if (typeof v === 'number') numericLeaves.push(path); else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], `${path}.${k}`); };
    walk(r, 'row');
    assert.deepEqual(numericLeaves, ['row.section5.line'], `${at}: no number is a field of a row except its §5 line (no retention_days)`);

    const columns = cols(at);
    for (const s of r.sweeps) {
      for (const k of s.key) assert.ok(columns.has(k), `${at}: the sweep column ${k} exists`);
      assert.deepEqual(s.covered_by, covering160(idx, at, s.key), `${at}: the indexes covering ${s.key} are what the migrations create`);
      // A PARTIAL covering index carries its predicate; when every covering index is partial, whether it
      // serves the sweep is a judgement, recorded, and a predicate that excludes the sweep's rows is F160-13.
      const partial = Object.fromEntries(s.covered_by.filter((n) => idx.get(n).where).map((n) => [n, idx.get(n).where]));
      assert.deepEqual(s.partial_predicates ?? {}, partial, `${at}: the partial predicates of the indexes covering ${s.key} are what the migrations write`);
      if (s.covered_by.length && s.covered_by.every((n) => idx.get(n).where)) {
        assert.ok(['serves-the-sweep', 'F160-13'].includes(s.partial_cover?.verdict) && s.partial_cover.why.length > 40, `${at}: ${s.key} is covered only by partial indexes, and whether they serve the sweep is recorded`);
      } else {
        assert.equal(s.partial_cover, undefined, `${at}: a partial-cover verdict only where every covering index is partial`);
      }
    }
    if (r.sweep_finding) assert.ok(findings.has(r.sweep_finding));
    if (!r.sweeps.length && r.class_status === 'defined' && !['app.billing_plans', 'app.billing_plan_versions', 'app.plan_entitlements'].includes(at)) {
      assert.ok(r.sweep_finding, `${at}: a defined class with nothing to sweep on is a finding`);
    }
    for (const c of r.anonymise_columns) assert.ok(columns.has(c), `${at}: the anonymise column ${c} exists`);
    if (!r.final_behaviour.includes('anonymise')) assert.deepEqual(r.anonymise_columns, []);
    for (const d of r.decisions) assert.ok(DECISIONS.includes(d), `${at}: ${d} is an open decision id`);
    if (['F160-01', 'F160-02', 'F160-03'].includes(r.finding)) assert.ok(r.decisions.includes('Q160-c'));

    // EVERY CONTROL NAMED HOLDS, AND THE ONES THAT MUST BE NAMED ARE.
    const kinds = r.blocking_controls.map((c) => c.kind);
    assert.ok(kinds.every((k) => KINDS.includes(k)), `${at}: every control is of a known kind`);
    assert.ok(kinds.includes('no-delete-grant'), `${at}: no role may purge it, and the map says so`);
    assert.equal(kinds.includes('no-schema-usage'), at.startsWith('private.'));
    const anonCovered = [];
    for (const c of r.blocking_controls) {
      if (c.kind === 'no-delete-grant') {
        assert.ok(![...remove].some((k) => k.startsWith(`${at}|`)), `${at}: no migration grants DELETE or TRUNCATE on it`);
      } else if (c.kind === 'no-update-grant') {
        for (const col of c.columns) assert.deepEqual(holders(at, col), [], `${at}.${col}: no role holds UPDATE on it`);
        anonCovered.push(...c.columns);
      } else if (c.kind === 'client-only-update') {
        for (const col of c.columns) assert.deepEqual(holders(at, col), ['authenticated'], `${at}.${col}: only the client role holds UPDATE; a sweep is not a client`);
        anonCovered.push(...c.columns);
      } else if (c.kind === 'grant-without-policy') {
        for (const col of c.columns) assert.ok(holders(at, col).includes(c.role), `${at}.${col}: ${c.role} holds UPDATE`);
        assert.ok(!policyTo(at, c.role), `${at}: and no policy admits ${c.role}`);
        anonCovered.push(...c.columns);
      } else if (c.kind === 'trigger') {
        const esc = (s) => s.replace('.', '\\.');
        assert.match(all, new RegExp(`create\\s+trigger\\s+${c.trigger}\\s[^;]*\\bon\\s+${esc(at)}\\b[^;]*execute\\s+(?:function|procedure)\\s+${esc(c.function)}\\s*\\(`, 'i'), `${at}: trigger ${c.trigger} runs ${c.function}`);
        assert.match(all, new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+${esc(c.function)}\\s*\\(`, 'i'), `${c.function} exists`);
        // AND IT STAYS: no `drop trigger` or `disable trigger` after its last create (the review round, Q0-F2).
        const lastCreate = Math.max(...[...all.matchAll(new RegExp(`create\\s+trigger\\s+${c.trigger}\\s[^;]*\\bon\\s+${esc(at)}\\b`, 'gi'))].map((m) => m.index));
        const undo = new RegExp(`drop\\s+trigger\\s+(?:if\\s+exists\\s+)?${c.trigger}\\s+on\\s+${esc(at)}\\b|alter\\s+table\\s+(?:only\\s+)?${esc(at)}\\s+disable\\s+trigger\\s+(?:${c.trigger}|all|user)\\b`, 'gi');
        assert.ok(![...all.matchAll(undo)].some((m) => m.index > lastCreate), `${at}: trigger ${c.trigger} is not dropped or disabled after it is created`);
      } else if (c.kind === 'no-schema-usage') {
        assert.doesNotMatch(all, /grant\s+[^;]*\busage\b[^;]*\bon\s+schema\s+private\b/i, 'no migration grants USAGE on private');
      }
    }
    assert.deepEqual([...anonCovered].sort(), [...r.anonymise_columns].sort(), `${at}: every anonymise column is held by exactly one named control`);
    // TWO-WAY: every trigger in the text that runs a REFUSING function on this table is named on its row
    // (refuse_mutation and, since the review round, A1 S2, set_decided_at); and on a table with anonymise
    // columns every trigger's function is one read as refusing or as stamping, never an unread one.
    for (const m of all.matchAll(new RegExp(`create\\s+trigger\\s+(\\w+)\\s[^;]*\\bon\\s+${at.replace('.', '\\.')}\\b[^;]*execute\\s+(?:function|procedure)\\s+([\\w.]+)\\s*\\(`, 'gi'))) {
      const fn = m[2].toLowerCase();
      if (REFUSING_FUNCTIONS160.includes(fn)) {
        assert.ok(r.blocking_controls.some((c) => c.kind === 'trigger' && c.trigger === m[1] && c.function === fn), `${at}: the refusal trigger ${m[1]} (${fn}) is named`);
      } else if (r.anonymise_columns.length) {
        assert.ok(STAMPING_FUNCTIONS160.includes(fn), `${at}: trigger ${m[1]} runs ${fn}, read neither as refusing nor as stamping; read it and place it`);
      }
    }
  }

  // THE CONTROLS ON EVERY ROW HOLD: no policy names a non-client role, and app_maintenance holds nothing.
  assert.deepEqual(map.controls_on_every_row.map((c) => c.kind), ['no-executor', 'no-legal-hold-table', 'no-deletion-manifest']);
  assert.doesNotMatch(all, /create\s+policy[^;]*\bto\s+[^;]*\b(app_worker|app_maintenance|app_command|service_role)\b/i, 'no policy admits a service role (RFC-2026-022 not in effect)');
  assert.doesNotMatch(all, /\bgrant\s+[^;]*\bto\s+[^;]*\bapp_maintenance\b/i, 'app_maintenance holds no grant');
  assert.ok(![...tables].some((t) => /hold/.test(t)), 'no legal-hold table exists yet; when one does, this row changes in a diff');

  // TWO-WAY: a §10 class no row uses is listed, with a reason, and nothing else is.
  const unused = Object.keys(map.section10_classes).filter((c) => !used.has(c));
  assert.deepEqual(map.section10_classes_without_a_row.map((w) => w.class), unused);
  for (const w of map.section10_classes_without_a_row) assert.ok(w.why.length > 10, `${w.class}: the absence has a reason`);
  for (const f of map.findings) assert.ok(f.what && f.source, `${f.id}: says what and where`);

  // EVERY open_blockers[i] CITATION IN THE MAP CARRIES A QUOTE ITS BLOCKER STILL SAYS (the owed-tooling batch;
  // Q0-F9 and C0-7 on the RFC batch, open_blockers[195] (6)). Until this batch a citation read
  // `WP:<line> (open_blockers[i])` and the test checked that line <line> is blocker i, so a consistent move of
  // line and index together to the WRONG blocker stayed green (Q0's Q2, measured exit 0), and every citation
  // had to move whenever the manifest above the list grew a line. Now each reads `open_blockers[i] ("<quote>")`:
  // no line number, and the quote -- the finding's own id where its blocker names it -- must be in blocker i.
  const blockers = JSON.parse(await readFile('work-packages/WP-0A-DB-00.json', 'utf8')).open_blockers;
  assert.deepEqual(retentionCitationProblems(map, blockers), [], 'every citation\'s blocker says its quote');
  const cites = [...JSON.stringify(map).matchAll(/open_blockers\[\d+\]/g)];
  assert.ok(cites.length >= 19, `the map cites its blockers (measured 17 findings and two controls), got ${cites.length}`);
  // Its own drifts: a citation moved to the wrong blocker, a quote dropped, and a line number put back.
  const moved = JSON.parse(JSON.stringify(map));
  moved.findings[0].source = moved.findings[0].source.replace('open_blockers[4]', 'open_blockers[5]');
  assert.match(retentionCitationProblems(moved, blockers).join('; '), /F160-01: open_blockers\[5\] does not say "DEFINES NO SUCH CLASS"/, 'a citation moved to the wrong blocker fails');
  const bare = JSON.parse(JSON.stringify(map));
  bare.controls_on_every_row[1].what = bare.controls_on_every_row[1].what.replace(/ \("no legal-hold table"\)/, '');
  assert.match(retentionCitationProblems(bare, blockers).join('; '), /no-legal-hold-table: open_blockers\[120\] carries no quote/, 'a citation with no quote fails');
  const lined = JSON.parse(JSON.stringify(map));
  lined.findings[3].source = `${lined.findings[3].source}; WP:447`;
  assert.match(retentionCitationProblems(lined, blockers).join('; '), /F160-04: a manifest line number/, 'a line-number citation fails');
  // A QUOTE IS SAID BY ONE BLOCKER ONLY (the owed-tooling batch's review round; Q0-OT-4, C0-OT-4: three quotes were
  // in two blockers each, and F160-04's citation moved from [192] to [91] with its quote stayed green). The three
  // were lengthened to text their own blocker alone says; a short quote two blockers share fails, moved or not.
  const shared = JSON.parse(JSON.stringify(map));
  shared.findings[3].source = shared.findings[3].source.replace(/open_blockers\[192\] \("[^"]*"\)/, 'open_blockers[91] ("F160-04")');
  assert.match(retentionCitationProblems(shared, blockers).join('; '), /F160-04: "F160-04" is said by more than one blocker/, 'Q0\'s Q4: the citation moved to the other carrier fails');

  // THE RECORDS THE REVIEW ROUND WROTE ARE HELD (the owed-tooling batch; C0 R1 on 160-prep's re-check: the
  // pairing was checked only IF present, so removing it from the invitations row, or the F160-17 finding
  // whole, stayed green while open_blockers[192] (13) and the disposition still cited it). The finding set is
  // exactly F160-01..F160-17, every F160 id blocker 192 names is one of them, and the also_claimed_by pairs
  // are exactly the three the map records.
  const ids = map.findings.map((f) => f.id);
  assert.deepEqual(ids, Array.from({ length: 17 }, (_, k) => `F160-${String(k + 1).padStart(2, '0')}`), 'the findings are F160-01 to F160-17, in order');
  for (const id of new Set(blockers[192].match(/F160-\d\d/g))) assert.ok(ids.includes(id), `${id}, which open_blockers[192] names, is a finding in the map`);
  assert.deepEqual(Object.fromEntries(map.rows.filter((r) => r.also_claimed_by || r.also_claimed_finding).map((r) => [r.table, [r.also_claimed_by, r.also_claimed_finding]])), {
    'app.content_versions': ['HISTORY', 'F160-16'],
    'app.knowledge_item_versions': ['HISTORY', 'F160-16'],
    'app.workspace_invitations': ['AUTH-HISTORY', 'F160-17'],
  }, 'the three also_claimed_by pairs, F160-17 on the invitations row among them');
  const f17 = map.findings.find((f) => f.id === 'F160-17');
  assert.deepEqual([f17.class_as_written, f17.decision], ['TOKEN-SHORT', null], 'F160-17 is about §5\'s TOKEN-SHORT and decides nothing');
  assert.match(f17.what, /AUTH-HISTORY's data column names "invitations history"/, 'and records the disagreement with §10 AUTH-HISTORY');
  assert.equal(map.rows.find((r) => r.table === 'app.workspace_invitations').section10_class, 'TOKEN-SHORT', 'the map keeps §5\'s class on the row');
  assert.match(blockers[192], /\(13\) F160-17: /, 'and blocker 192 (13) still holds it');
});

// §11.1's minimum export domains (ERD:546-555) by the §10 classes that hold them: settings (TENANT-LIFE and the
// profile versions' HISTORY), members/roles/scopes (AUTH-HISTORY), knowledge and content with their versions,
// variants, quality, approval, calendar and publish history (CONTENT-, APPROVAL-, SCHEDULE-, PUBLISH-HISTORY),
// research citations and evidence (RESEARCH-RUN), asset metadata and originals (ASSET-ORIGINAL), usage and
// billing (FINANCE-HISTORY) and the tenant-visible audit trail (AUDIT). The owed-tooling batch (C0 R2, Q0 R-5).
const MINIMUM_DOMAIN_CLASSES = ['TENANT-LIFE', 'HISTORY', 'AUTH-HISTORY', 'CONTENT-HISTORY', 'APPROVAL-HISTORY', 'SCHEDULE-HISTORY',
  'PUBLISH-HISTORY', 'RESEARCH-RUN', 'ASSET-ORIGINAL', 'FINANCE-HISTORY', 'AUDIT'];
function exportLabelProblems(map, manifest, outsideWorkspace) {
  const byTable = new Map(map.rows.map((r) => [r.table, r]));
  const problems = [];
  // Every omitted bucket, not `outside-minimum-domains` alone (the owed-tooling batch's review round; C0-OT-3:
  // content_items moved into `internal-job` stayed green). A table of a minimum domain's class may be omitted only
  // as `in-minimum-domain-projection-undecided` (its projection owed) or as `not-workspace-data`, whose membership
  // is derived below from the purge order; in any other bucket it is named with the bucket.
  for (const o of manifest.omitted.filter((b) => !['in-minimum-domain-projection-undecided', 'not-workspace-data'].includes(b.class))) {
    for (const t of o.tables) {
      const c = byTable.get(t)?.section10_class;
      if (MINIMUM_DOMAIN_CLASSES.includes(c)) problems.push(`${t}: ${c} is a minimum export domain's class, labelled ${o.class === 'outside-minimum-domains' ? 'outside them' : `omitted as ${o.class}`}`);
    }
  }
  const nwd = manifest.omitted.filter((o) => o.class === 'not-workspace-data').flatMap((o) => o.tables).sort();
  const expected = outsideWorkspace.filter((t) => t !== 'app.user_profiles').sort();
  if (JSON.stringify(nwd) !== JSON.stringify(expected)) problems.push(`not-workspace-data is not exactly the tables outside any workspace's purge: ${nwd.join(', ')}`);
  return problems;
}
// Export is never allowed from a §5 cell carrying SECRET-4 or from a table with a token, secret, credential or
// password column (A1 R1, R2; Q0 R-3 on 160-prep's re-check). A `*_redacted` flag names no material (audit_logs'
// secret_redacted boolean says a value WAS redacted); measured, the material columns are credential_reference (x3)
// and token_hash.
const exportForbidden = (row, columns) => row.section5.sensitivity.split('/').includes('SECRET-4')
  || [...columns].some((c) => /(^|_)(token|secret|credential|password)s?(_|$)/.test(c) && !/_redacted$/.test(c));
function exportAllowedProblems(map, included, forbidden) {
  const problems = [];
  for (const t of forbidden) {
    if (included.includes(t)) problems.push(`${t}: exported from a SECRET-4 cell or with token or credential columns`);
    if ((map.rows.find((r) => r.table === t).section9_not_picked ?? []).some((n) => n.export_allowed === true)) problems.push(`${t}: export_allowed on a SECRET-4 cell or token-bearing table`);
  }
  return problems;
}

// The retention map's blocker citations: `open_blockers[i] ("<quote>")`, the quote in blocker i, and no
// `WP:<line>` (the owed-tooling batch; Q0-F9, C0-7).
function retentionCitationProblems(map, blockers) {
  const problems = [];
  const texts = [...map.controls_on_every_row.map((c) => [c.kind, c.what]), ...map.findings.map((f) => [f.id, f.source])];
  for (const [where, text] of texts) {
    if (/\bWP:\d/.test(text)) problems.push(`${where}: a manifest line number`);
    for (const c of text.matchAll(/open_blockers\[(\d+)\]( \("((?:[^"\\]|\\.)+)"\))?/g)) {
      if (!c[2]) { problems.push(`${where}: open_blockers[${c[1]}] carries no quote`); continue; }
      if (!blockers[Number(c[1])]?.includes(c[3])) problems.push(`${where}: open_blockers[${c[1]}] does not say "${c[3]}"`);
      else if (blockers.filter((b) => b.includes(c[3])).length !== 1) problems.push(`${where}: "${c[3]}" is said by more than one blocker`);
    }
  }
  return problems;
}

test('the §11.1 export manifest fixture never carries an excluded class, every table is in the retention map, and its checksums recompute', async () => {
  const { createHash } = await import('node:crypto');
  const map = JSON.parse(await readFile(RETENTION_MAP, 'utf8'));
  const { manifest } = JSON.parse(await readFile(EXPORT_FIXTURE, 'utf8'));
  const catalog = JSON.parse(await readFile('db/foundation/seeds/fixture-catalog.json', 'utf8'));
  const byTable = new Map(map.rows.map((r) => [r.table, r]));

  // §11.1/6's fields, and §11.1/3's snapshot: fixture identities, never generated here.
  assert.equal(manifest.schema_version, 'export-manifest/0.1-draft');
  assert.match(manifest.generated_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(manifest.workspace_id, catalog.identities.workspace_a.uuid);
  assert.equal(manifest.requested_scope.workspace_id, manifest.workspace_id);
  assert.equal(manifest.requester, catalog.identities.user_owner_a.uuid);
  assert.ok(manifest.policy_version);

  // CHECKSUMS RECOMPUTE: each synthetic body by the recipe, then the package over the files in order.
  const sha = (s) => createHash('sha256').update(s).digest('hex');
  for (const f of manifest.files) {
    assert.ok(Number.isInteger(f.rows) && f.rows > 0, `${f.table}: a count`);
    assert.equal(f.path, `${f.table.replace('.', '/')}.jsonl`);
    const body = Array.from({ length: f.rows }, (_, k) => `${JSON.stringify({ fixture_row: k + 1, table: f.table })}\n`).join('');
    assert.equal(f.sha256, sha(body), `${f.table}: the checksum is the body's`);
  }
  assert.equal(manifest.package_sha256, sha(manifest.files.map((f) => `${f.path}\t${f.rows}\t${f.sha256}\n`).join('')), 'the package checksum recomputes');

  // EVERY TABLE IS IN THE MAP, AND THE MAP IS PARTITIONED: each row is exported or omitted with a reason, once.
  const included = manifest.files.map((f) => f.table);
  const omitted = manifest.omitted.flatMap((o) => o.tables);
  for (const t of [...included, ...omitted]) assert.ok(byTable.has(t), `${t} is a row of the retention map`);
  assert.deepEqual([...included, ...omitted].sort(), map.rows.map((r) => r.table).sort(), 'every table is exported or omitted, exactly once');
  for (const o of manifest.omitted) assert.ok(o.reason.length > 20 && o.tables.length, `${o.class}: omitted with a reason`);
  // A table whose class §11.1's minimum domains name -- publish history (ERD:552), usage and billing
  // (ERD:554) -- is never labelled as outside them (the review round, C0 G3: four were).
  // Since the owed-tooling batch every §11.1 domain, not today's two (C0 R2, Q0 R-5 on 160-prep's re-check: N10
  // moved content_items to outside-minimum-domains and EX-14 moved publish_jobs to not-workspace-data, each
  // green). The declared rule, as exportLabelProblems reads it: no table of a class a minimum domain names is
  // labelled outside them, and not-workspace-data is exactly the tables the purge order holds as outside any
  // workspace's purge, less user_profiles (its own user-scoped bucket).
  const purgeOrder = JSON.parse(await readFile(PURGE_ORDER, 'utf8'));
  const outsideWorkspace = purgeOrder.order.filter((o) => o.outside_workspace_purge).map((o) => o.table);
  assert.deepEqual(exportLabelProblems(map, manifest, outsideWorkspace), [], 'every omitted bucket holds the declared rule: no minimum-domain table outside the two buckets that may hold one, and not-workspace-data derived');
  const relabel = (from, to, table) => {
    const copy = JSON.parse(JSON.stringify(manifest));
    copy.omitted.find((o) => o.class === from).tables = copy.omitted.find((o) => o.class === from).tables.filter((t) => t !== table);
    copy.files = copy.files.filter((f) => f.table !== table);
    (copy.omitted.find((o) => o.class === to).tables).push(table);
    return copy;
  };
  for (const [table, from, to, problem] of [
    ['app.content_items', null, 'outside-minimum-domains', /app\.content_items: CONTENT-HISTORY is a minimum export domain's class/],
    ['app.workspace_settings', null, 'outside-minimum-domains', /app\.workspace_settings: TENANT-LIFE is a minimum export domain's class/],
    ['app.audit_logs', null, 'outside-minimum-domains', /app\.audit_logs: AUDIT is a minimum export domain's class/],
    ['app.publish_jobs', 'in-minimum-domain-projection-undecided', 'not-workspace-data', /not-workspace-data is not exactly the tables outside any workspace's purge/],
  ]) {
    const copy = from ? relabel(from, to, table) : (() => { const c = JSON.parse(JSON.stringify(manifest)); c.files = c.files.filter((f) => f.table !== table); c.omitted.find((o) => o.class === to).tables.push(table); return c; })();
    assert.match(exportLabelProblems(map, copy, outsideWorkspace).join('; '), problem, `${table} relabelled ${to} fails`);
  }
  // The review round (C0-OT-3, C0 M-C2): the same omission through another bucket. And Q0-OT-5: the eleven
  // classes are a literal, each tied to the ERD §11.1 line that names its domain, and each class is held by a
  // drift of its own -- one exported table of that class moved to outside-minimum-domains must fail by name -- so
  // cutting a class from the list turns its drift green and this test red.
  {
    const c = JSON.parse(JSON.stringify(manifest));
    c.files = c.files.filter((f) => f.table !== 'app.content_items');
    c.omitted.find((o) => o.class === 'internal-job').tables.push('app.content_items');
    assert.match(exportLabelProblems(map, c, outsideWorkspace).join('; '), /app\.content_items: CONTENT-HISTORY is a minimum export domain's class, labelled omitted as internal-job/,
      'a minimum-domain table omitted as an internal job fails (M-C2)');
  }
  const erd = (await readFile(ERD_DOC, 'utf8')).split('\n');
  const DOMAIN_LINES = {
    'TENANT-LIFE': [548, 'Workspace/business/page settings'], HISTORY: [548, 'Workspace/business/page settings'],
    'AUTH-HISTORY': [549, 'Members/roles/scopes'], 'CONTENT-HISTORY': [552, 'Content/version/variant/quality'],
    'APPROVAL-HISTORY': [552, 'approval'], 'SCHEDULE-HISTORY': [552, 'calendar'], 'PUBLISH-HISTORY': [552, 'publish history'],
    'RESEARCH-RUN': [551, 'Research citation/evidence metadata'], 'ASSET-ORIGINAL': [553, 'Asset metadata/rights + originals'],
    'FINANCE-HISTORY': [554, 'Usage/billing invoices'], AUDIT: [555, 'Tenant-visible audit trail'],
  };
  assert.deepEqual(MINIMUM_DOMAIN_CLASSES, Object.keys(DOMAIN_LINES), 'the eleven minimum-domain classes, a literal (Q0-OT-5)');
  assert.equal(erd[545], 'Minimum export domains:', 'ERD:546 still opens the §11.1 minimum domain list');
  for (const [cls, [line, words]] of Object.entries(DOMAIN_LINES)) {
    assert.ok(erd[line - 1].startsWith('- ') && erd[line - 1].includes(words), `${cls}: ERD:${line} names its domain ("${words}")`);
    const table = included.find((t) => byTable.get(t).section10_class === cls);
    assert.ok(table, `${cls}: at least one exported table carries the class`);
    const c = JSON.parse(JSON.stringify(manifest));
    c.files = c.files.filter((f) => f.table !== table);
    c.omitted.find((o) => o.class === 'outside-minimum-domains').tables.push(table);
    assert.match(exportLabelProblems(map, c, outsideWorkspace).join('; '), new RegExp(`${table.replace('.', '\\.')}: ${cls} is a minimum export domain's class`),
      `${cls}: ${table} labelled outside the minimum domains fails`);
  }

  // §11.1/5's EXCLUSIONS, each by a property of the map rather than by the fixture's own list, and each
  // matching at least one table so the rule cannot pass by matching nothing.
  const excluded = {
    'SECRET-4': (r) => r.section9_classes.includes('SECRET-4'),
    'raw webhook': (r) => /webhook/.test(r.table),
    'internal job': (r) => r.section9_classes.includes('INTERNAL-3'),
    'SECURITY detail': (r) => r.section9_classes.includes('SECURITY-4'),
    'research snapshot': (r) => r.section10_class === 'RESEARCH-SNAPSHOT',
  };
  for (const [what, match] of Object.entries(excluded)) {
    const hits = map.rows.filter(match).map((r) => r.table);
    assert.ok(hits.length >= 1, `${what} matches at least one table`);
    for (const t of hits) assert.ok(!included.includes(t), `${t} (${what}) never appears in an export`);
  }
  // AND BY §5's WHOLE CELL (the review round, A1 S4 / Q0-F3): an exported table whose §5 cell carries an
  // excluding class it did not pick is exported only where the map records that judgement as export_allowed
  // (today audit_logs alone, as the "Tenant-visible audit trail", ERD:555).
  for (const t of included) {
    const r = byTable.get(t);
    for (const k of ['SECRET-4', 'SECURITY-4', 'INTERNAL-3'].filter((c) => r.section5.sensitivity.split('/').includes(c))) {
      assert.equal(r.section9_not_picked?.find((n) => n.class === k)?.export_allowed, true, `${t}: §5's cell carries ${k}; it is exported only by a recorded judgement`);
    }
  }
  for (const t of ['private.ai_credential_references', 'private.meta_credential_references', 'private.push_subscription_references',
    'private.meta_webhook_inbox', 'app.billing_webhook_receipts', 'app.jobs', 'app.outbox_events', 'app.consumer_ledger',
    'app.security_events', 'app.research_snapshots']) assert.ok(omitted.includes(t), `${t} is omitted by name too`);
  // EXPORT IS NEVER ALLOWED FROM A SECRET-4 CELL OR A TABLE HOLDING TOKEN OR CREDENTIAL MATERIAL, DERIVED AND
  // PINNED (the owed-tooling batch; A1 R1, R2 and Q0 R-3 on 160-prep's re-check: writing export_allowed: true on
  // meta_connections' SECRET-4 entry and exporting it stayed green, and workspace_invitations' token_hash was
  // excluded only by the fixture's own list). The set is derived from §5's whole cell and from the column
  // names the migrations create, and pinned by name, so a new member is a reviewed change to this list.
  const files160 = await migrationText160();
  const bodies = tableBodies160(files160);
  const forbidden = map.rows.filter((r) => exportForbidden(r, columnsOf160(files160, bodies, r.table))).map((r) => r.table);
  assert.deepEqual(forbidden, ['app.ai_model_policies', 'app.ai_models', 'app.meta_connections', 'app.notification_preferences', 'app.notifications',
    'app.social_accounts', 'app.workspace_invitations', 'private.ai_credential_references', 'private.meta_credential_references',
    'private.meta_webhook_inbox', 'private.push_subscription_references'], 'every SECRET-4-cell or token/credential-bearing table, derived, pinned');
  assert.deepEqual(exportAllowedProblems(map, included, forbidden), [], 'none is exported, and none carries export_allowed');
  assert.deepEqual(map.rows.filter((r) => (r.section9_not_picked ?? []).some((n) => n.export_allowed === true)).map((r) => r.table), ['app.audit_logs'],
    'export_allowed is the audit trail\'s alone (A1 R2), a judgement recorded once');
  const opened = JSON.parse(JSON.stringify(map));
  opened.rows.find((r) => r.table === 'app.meta_connections').section9_not_picked[0].export_allowed = true;
  assert.deepEqual(exportAllowedProblems(opened, [...included, 'app.meta_connections', 'app.workspace_invitations'], forbidden),
    ['app.meta_connections: exported from a SECRET-4 cell or with token or credential columns', 'app.meta_connections: export_allowed on a SECRET-4 cell or token-bearing table',
      'app.workspace_invitations: exported from a SECRET-4 cell or with token or credential columns'], 'Q0 EX-11 and A1 R1 each fail by name');
  assert.ok(!included.some((t) => t.startsWith('private.')), 'nothing in private is exported');
});

test('the §11.4 purge order is a topological order of the foreign keys the migrations create, children first, covering every table', async () => {
  const purge = JSON.parse(await readFile(PURGE_ORDER, 'utf8'));
  const map = JSON.parse(await readFile(RETENTION_MAP, 'utf8'));
  const { tablesCreatedByMigrations } = await import('../../scripts/db/run.mjs');
  const tables = await tablesCreatedByMigrations();
  const files = await migrationText160();
  const bodies = tableBodies160(files);

  // THE EDGES ARE THE MIGRATIONS' FOREIGN KEYS, by name, child and parent: a key added, dropped, renamed or
  // re-pointed fails here.
  assert.deepEqual(purge.edges.map((e) => `${e.fk}|${e.child}|${e.parent}`).sort(), fkEdges160(files, bodies), 'the declared edges are the foreign keys the migrations create, by name');
  assert.ok(purge.edges.length >= 90, `measured 90 keys at 75c9274, got ${purge.edges.length}`);
  assert.equal(new Set(purge.edges.map((e) => e.fk)).size, purge.edges.length, 'each key once');

  // EVERY TABLE EXACTLY ONCE.
  const order = purge.order.map((o) => o.table);
  assert.equal(new Set(order).size, order.length);
  assert.deepEqual([...order].sort(), [...tables].sort(), 'the order covers every table');
  assert.equal(order[order.length - 1], 'app.workspaces', 'the tenant root goes last');
  for (const o of purge.order) assert.ok([6, 7, 8, 9].includes(o.phase), `${o.table}: a §11.4 phase`);

  // THE PHASE FOLLOWS THE ROW (the review round, C0 G7 / A1 S3 / Q0-F4): the root alone is 9; a class
  // §11.4 step 8 names (finance, audit, security) or a row §10 keeps without a purge is 8; every other
  // defined class is 6 or 7, one phase per class; a finding row's phase is a judgement within 6-8.
  const rowOf = new Map(map.rows.map((r) => [r.table, r]));
  const phaseOf = new Map(purge.order.map((o) => [o.table, o.phase]));
  const keptOnly = (r) => r.final_behaviour.includes('retain') && !r.final_behaviour.includes('purge');
  const classPhase = new Map();
  for (const o of purge.order) {
    const r = rowOf.get(o.table);
    assert.equal(o.phase === 9, o.table === 'app.workspaces', `${o.table}: phase 9 is the tenant root alone`);
    if (o.table === 'app.workspaces') continue;
    if (r.class_status === 'finding') { assert.ok([6, 7, 8].includes(o.phase), `${o.table}: a finding row's phase is 6-8`); continue; }
    if (STEP8_CLASSES160.includes(r.section10_class) || keptOnly(r)) assert.equal(o.phase, 8, `${o.table}: ${r.section10_class} is anonymised or kept in §11.4 step 8 (ERD:598)`);
    else assert.ok([6, 7].includes(o.phase), `${o.table}: ${r.section10_class} is purged in step 6 or 7`);
    if (classPhase.has(r.section10_class)) assert.equal(o.phase, classPhase.get(r.section10_class), `${o.table}: one phase per class (${r.section10_class})`);
    classPhase.set(r.section10_class, o.phase);
  }
  // NOT PHASE-MONOTONE, AND SAID SO: a table placed after one of a higher phase is there because a kept
  // child holds a key to it (F160-14), and the file names each such table and the conflicts that put it there.
  const inversions = order.filter((t, i) => order.slice(0, i).some((u) => phaseOf.get(u) > phaseOf.get(t)));
  assert.deepEqual(purge.phase_inversions.map((p) => p.table), inversions, 'every phase inversion is declared, and only those');
  for (const p of purge.phase_inversions) {
    assert.ok(p.because.length && p.because.every((fk) => purge.retention_conflicts.some((c) => c.fk === fk && c.parent === p.table)), `${p.table}: out of phase order because of declared retention conflicts on it`);
  }
  // A TABLE NO WORKSPACE OWNS -- no workspace_id column and no key to the root -- stays in the graph for its
  // keys and is marked outside a workspace's purge: a workspace deletion never touches a global catalog
  // row or a profile shared with other workspaces.
  const toRoot = (t) => purge.edges.some((e) => e.child === t && e.parent === 'app.workspaces');
  for (const o of purge.order) {
    const outsideWorkspace = o.table !== 'app.workspaces' && !columnsOf160(files, bodies, o.table).has('workspace_id') && !toRoot(o.table);
    assert.equal(o.outside_workspace_purge === true, outsideWorkspace, `${o.table}: outside_workspace_purge is ${outsideWorkspace}`);
    if (outsideWorkspace) assert.ok(o.why.length > 20, `${o.table}: and why`);
  }
  // THE REFUSAL TRIGGERS THAT REFUSE EVERY ROLE'S DELETE are named on the entry, as on the map's row.
  for (const o of purge.order) {
    const refusing = rowOf.get(o.table).blocking_controls.filter((c) => c.kind === 'trigger' && c.function === 'private.refuse_mutation').map((c) => c.trigger);
    assert.deepEqual(o.refused_by ?? [], refusing, `${o.table}: the refusal triggers on its purge are named`);
  }

  // CHILDREN BEFORE PARENTS, for every key that is neither a self-reference nor a declared cycle break.
  const pos = new Map(order.map((t, i) => [t, i]));
  const breaks = new Set(purge.cycle_breaks.map((b) => b.fk));
  for (const b of purge.cycle_breaks) {
    const e = purge.edges.find((x) => x.fk === b.fk);
    assert.ok(e && e.child === b.child && e.parent === b.parent, `${b.fk} is a declared key`);
    assert.ok(purge.edges.some((x) => x.child === b.parent && x.parent === b.child), `${b.fk} breaks a real cycle: the reverse key exists`);
    assert.ok(b.how.length > 20);
  }
  for (const e of purge.edges) {
    if (e.child === e.parent || breaks.has(e.fk)) continue;
    assert.ok(pos.get(e.child) < pos.get(e.parent), `${e.fk}: ${e.child} is purged before ${e.parent}`);
  }
  assert.deepEqual(purge.self_references.map((s) => s.fk).sort(), purge.edges.filter((e) => e.child === e.parent).map((e) => e.fk).sort(), 'every self-reference is declared');

  // THE CONFLICTS RECOMPUTE: a key whose child §10 keeps and whose parent §10 purges.
  const beh = new Map(map.rows.map((r) => [r.table, r.final_behaviour]));
  const kept = (t) => beh.get(t).includes('retain') && !beh.get(t).includes('purge');
  const conflicts = purge.edges.filter((e) => e.child !== e.parent && kept(e.child) && beh.get(e.parent).includes('purge')).map((e) => e.fk).sort();
  assert.deepEqual(purge.retention_conflicts.map((c) => c.fk).sort(), conflicts, 'every retention conflict is declared, and only those');
  for (const c of purge.retention_conflicts) {
    assert.ok(purge.edges.some((e) => e.fk === c.fk && e.child === c.child && e.parent === c.parent), `${c.fk}: its child and parent are the key's`);
    assert.deepEqual([c.child_behaviour, c.parent_behaviour], [beh.get(c.child), beh.get(c.parent)], `${c.fk}: the behaviours are the map's`);
  }
  assert.ok(conflicts.length >= 1, 'measured 12 at 75c9274; the finding is F160-14');
});
