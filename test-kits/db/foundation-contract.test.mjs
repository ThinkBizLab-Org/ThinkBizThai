import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { promisify } from 'node:util';
import test from 'node:test';

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
const NOT_ON_THE_INSTANCE = [AUTHZ_MIGRATION, '020_business.sql', '021_member_scope.sql',
  '030_industry.sql', '040_knowledge.sql', '041_knowledge_resolution.sql',
  '050_async_kernel.sql', '051_notification.sql', '060_ai_gateway.sql',
  '061_metering.sql', '070_research.sql', '080_content.sql', '081_content_targets.sql',
  '110_meta_connector.sql', '130_billing.sql', '131_billing_projection.sql',
  '132_entitlement_resolution.sql', '140_audit.sql'];

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
  'content_target_destination_a1',
  'content_target_destination_a2',
  'content_target_destination_b1',
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
    const code = migration.replace(/--[^\n]*/g, '');
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
