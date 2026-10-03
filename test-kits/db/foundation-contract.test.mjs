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
  '140_audit.sql'];

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
    ["select set_config('standard_' || 'conforming_strings', 'off', false);\nselect 'x\\' as a, ' \\! f\nas b;", 1],
    ["set standard_conforming_strings = off;\nselect '\\''; \\! touch f\n-- '", 2], ["select 1.e'\\' \\! touch f\n';", 3],
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
    ["do $$ begin execute E'set\\x20names ''SJIS'''; end $$;", 1], ["do $$ begin execute E'set client\\x5fencoding to ''BIG5'''; end $$;", 1],
    ["set U&\"standard\\005fconforming\\005fstrings\" to off;", 1], ["do $$ begin execute 'select E''x'''; end $$;", 1],
    ["select 'e' as e, date'2026-10-03' as d, menu&'x' as m;", 0], ["select d.deptype = 'e' from pg_depend d;", 0],
    ["-- U&\"x\" and E'y' in a comment\nselect \"U&'\" from t;", 0],
    // Batch 128's review round (C0 F1): allow_system_table_mods, named anywhere, as client_encoding is; its
    // U& spelling is an escape spelling and is refused as one. C0 X2 and X2b used it to make a schema named
    // pg_c0api and a view in pg_catalog, past every rule that read by schema name.
    ['set allow_system_table_mods = on;', 1], ["select pg_catalog.set_config('allow_system_table_mods', 'on', true);", 1],
    ['set U&"allow\\005fsystem\\005ftable\\005fmods" = on;', 1]]) {
    assert.equal(psqlLex(sql).metaCommands.length, n, `${JSON.stringify(sql)}: ${n} meta-command(s)`);
  }
  const { metaCommandFindings } = await import('../../scripts/db/run.mjs');
  assert.match(metaCommandFindings([{ name: '999_x.sql', sql: 'select 1; \\! touch f' }]).join(''), /999_x\.sql line 1: a psql meta-command/,
    'migrate-clean refuses it live, before the first script is applied');
  assert.deepEqual(metaCommandFindings([{ name: '999_x.sql', sql: "select '\\!';" }]), []);
  assert.match(runner, /const meta = metaCommandFindings\(steps\);\n\s*if \(meta\.length\) \{[^\n]*return 1; \}\n\s*for \(const \{ name, sql \} of steps\) \{/,
    'and the scan runs before the loop that applies them');
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
  const requestedBy = (await readFile('db/foundation/migrations/094_approval_requested_by.sql', 'utf8')).replace(/--[^\n]*/g, '');
  assert.match(requestedBy, /create policy approval_requests_requester_is_caller on app\.approval_requests\s+as restrictive\s+for insert to authenticated\s+with check \(requested_by = \(select auth\.uid\(\)\)\);/,
    '094: one RESTRICTIVE INSERT policy, requested_by = auth.uid(), TO authenticated');
  assert.match(requestedBy, /did not write approval_requests_requester_is_caller as a RESTRICTIVE INSERT policy/, '094 asserts its own policy at apply time');
  assert.match(requestedBy, /requested_by became updatable by authenticated/, '094 asserts the column stays out of the UPDATE grant');
  const socialKey = (await readFile('db/foundation/migrations/111_social_fk.sql', 'utf8')).replace(/--[^\n]*/g, '');
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
  const code = (await readFile('db/foundation/migrations/105_updated_by_on_update_is_caller.sql', 'utf8')).replace(/--[^\n]*/g, '');
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
  const code = (await readFile('db/foundation/migrations/123_attribution_closures_everywhere.sql', 'utf8')).replace(/--[^\n]*/g, '');
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
  const code = (await readFile('db/foundation/migrations/127_created_by_on_insert_is_caller.sql', 'utf8')).replace(/--[^\n]*/g, '');
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
  const code = (await readFile('db/foundation/migrations/125_approval_settled_is_immutable.sql', 'utf8')).replace(/--[^\n]*/g, '');
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
  const next = (await readFile('db/foundation/migrations/126_approval_decision_frozen_for_every_writer.sql', 'utf8')).replace(/--[^\n]*/g, '');
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
  const texts = await Promise.all(names.map(async (n) => [n, (await readFile(`${dir}/${n}`, 'utf8')).replace(/--[^\n]*/g, '')]));
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
  const code = migration.replace(/--[^\n]*/g, '');
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
      m.CLIENT_SCHEMA_PROBE_SQL, m.CLIENT_MEMBERSHIP_PROBE_SQL, m.PINNED_CHECK_PROBE_SQL,
      m.PINNED_POLICY_PROBE_SQL, m.SECURITY_DEFINER_PROBE_SQL, m.POLICY_HELPER_PROBE_SQL, m.TRIGGER_PROBE_SQL, m.PINNED_TRIGGER_PROBE_SQL,
      m.PINNED_GRANT_PROBE_SQL, m.PINNED_DEFAULT_PROBE_SQL, m.REWRITE_RULE_PROBE_SQL, m.PG_CATALOG_GUARD_SQL],
    'all twenty-three, in order: one rule per probe or one drift per rule (C0 on 123, F5; Q0 on 123, F3; C0 on its corrections, F6); the pinned trigger probe is blocker 186 item 13; the pinned grant and default probes are batch 091\'s third round (C0 H1, H3; A1 R1, R3); the rewrite rule and pg_catalog guard probes are batch 126\'s review round (Q0 F5, F3); the created_by closure and INSERT coverage probes are batch 127 (blocker 186\'s created_by class; A1 F5 on 123), and so is the permissive policy probe (the Owner\'s answer to A0\'s recommendation (3), 2026-10-03); the client privilege and policy helper probes are batch 127\'s review round (C0 F1, F4; A1 F1, F2; Q0 F1); the client schema and client membership probes are batch 128 (A1 N1, N3, N5; C0 N1; Q0 N1, N2 on 127\'s re-check)');
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
    'client privilege probe': 'a620d5629d5192d7',
    'client schema probe': '13ad35c1af22ba18',
    'client membership probe': '9dc722ac7efd2c45',
    'pinned check probe': '9fbe921cb30965f5',
    'pinned policy probe': 'a7be93780c68245a',
    'security definer probe': '42d056bde20ea854',
    'policy helper probe': '79f1d9721698eb44',
    'trigger probe': '9f3dc969be47bd74',
    'pinned trigger probe': 'f136765c6beb5dbf',
    'pinned grant probe': '2e3ef3743a2ca6ad',
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
  assert.equal((clientPriv.match(/\bselect\b/g) ?? []).length, 6, 'six selects, counted at batch 127\'s review round: no reading clause added unseen');
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
  assert.equal((m.CLIENT_SCHEMA_PROBE_SQL.match(/\bselect\b/g) ?? []).length, 8, 'eight selects, counted at 128\'s review round (seven at 128, and the database): no reading clause added unseen');
  assert.deepEqual(m.CLIENT_ROLE_MEMBERSHIPS, [], 'anon and authenticated are members of no role, measured at batch 128: a pin is an RFC-sized decision');
  assert.match(m.CLIENT_MEMBERSHIP_PROBE_SQL, /with recursive reach\(client, roleid\) as \(\n\s+select r\.rolname::text, m\.roleid\n\s+from pg_catalog\.pg_roles r join pg_catalog\.pg_auth_members m on m\.member = r\.oid\n\s+where r\.rolname in \('anon', 'authenticated'\)\n\s+union\n\s+select reach\.client, m\.roleid\n\s+from reach join pg_catalog\.pg_auth_members m on m\.member = reach\.roleid\n\s+\)/,
    'pg_auth_members read recursively from both client roles, with no filter on INHERIT, SET or ADMIN');
  assert.equal((m.CLIENT_MEMBERSHIP_PROBE_SQL.match(/\bselect\b/g) ?? []).length, 4, 'four selects, counted at batch 128');
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
  assert.deepEqual(Object.keys(m.PINNED_TABLE_TRIGGERS), ['app.approval_requests'], 'the table whose decision time is the database\'s');
  // The grant probe is an ALLOWLIST read from the catalog (C0 H1, A1 R3 on 091's third round): every
  // non-superuser role, every table privilege MAINTAIN included on 17+, every column privilege, each
  // compared both ways against the pinned set.
  assert.match(m.PINNED_GRANT_PROBE_SQL, /from pg_catalog\.pg_roles where not rolsuper and rolname !~ '\^pg_'/, 'every role but superusers and predefined roles, not a named list');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'\][\s\S]*then array\['MAINTAIN'\]/, 'every table privilege, MAINTAIN on 17+ (A1 R1)');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /unnest\(array\['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'\]\) as p\(p\), \(values \(''\), \(' WITH GRANT OPTION'\)\) as go\(opt\)\n\s+where pg_catalog\.has_column_privilege\(roles\.r, cols\.rel, cols\.attnum, p\.p \|\| go\.opt\)/,
    'every column, by the effective privilege, all four column privileges, each with and without grant option (Q0 F7, C0 F3, A1 F3 on 126)');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /from roles, tabs, tprivs, \(values \(''\), \(' WITH GRANT OPTION'\)\) as go\(opt\)\n\s+where pg_catalog\.has_table_privilege\(roles\.r, tabs\.t::regclass, tprivs\.p \|\| go\.opt\)/,
    'every table privilege with and without grant option');
  assert.ok(!Object.values(m.PINNED_GRANTS).some((roles) => JSON.stringify(roles).includes('GRANT OPTION')), 'and no grant option is ever pinned');
  assert.match(m.PINNED_GRANT_PROBE_SQL, /^do \$\$\ndeclare\n  offending text;\nbegin\n  select string_agg\(format\('%s \(owner %s\)'[\s\S]*where not exists \(select 1 from pg_catalog\.pg_roles o where o\.oid = c\.relowner and o\.rolsuper\);\n  if offending is not null then\n    raise exception 'pinned table\(s\) owned by a role that is not a superuser/,
    'its first rule: the owner the role set leaves out is a superuser, stated rather than assumed (C0 F5 on 126)');
  assert.equal((m.PINNED_GRANT_PROBE_SQL.match(/'unlisted: ' \|\| f\.g/g) ?? []).length, 2, 'an unlisted grant named at both levels');
  assert.equal((m.PINNED_GRANT_PROBE_SQL.match(/'missing: ' \|\| p\.g/g) ?? []).length, 2, 'and a missing one');
  assert.deepEqual(Object.keys(m.PINNED_GRANTS), ['app.calendar_items', 'app.content_schedules'], 'batch 091\'s two tables');
  {
    const migration = await readFile('db/foundation/migrations/091_calendar.sql', 'utf8');
    for (const [table, { authenticated }] of Object.entries(m.PINNED_GRANTS)) {
      for (const priv of ['SELECT', 'INSERT', 'UPDATE']) {
        const written = migration.match(new RegExp(`grant ${priv.toLowerCase()} \\(([^)]*)\\)\\s+on ${table.replace('.', '\\.')} to authenticated;`));
        assert.ok(written, `091 writes one ${priv} grant on ${table}`);
        assert.deepEqual(authenticated[priv], written[1].split(',').map((c) => c.trim()), `the pinned ${priv} columns on ${table} are 091's grant as written`);
      }
      assert.deepEqual([authenticated.table, authenticated.REFERENCES], [[], []], `no table-level grant and no REFERENCES on ${table}`);
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
    const code = raw.replace(/--[^\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''");
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
    const code = text.replace(/--[^\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''");
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
  assert.equal(applyTimeBlocks('x.sql', "do $$\nbegin\n  raise exception 'we do $$ here';\nend $$;\n").length, 1, 'control: a message that mentions do $$ is not a block');
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
  const code = (await readFile('db/foundation/migrations/111_social_fk.sql', 'utf8')).replace(/--[^\n]*/g, '');
  const key = code.match(/add constraint content_targets_social_scope_fk[\s\S]*?;/);
  assert.ok(key, '111 adds the key');
  assert.doesNotMatch(key[0], /on\s+(delete|update)/i, 'the key names no ON DELETE or ON UPDATE action: a social account row is never hard-deleted (disposition 2026-09-15 §5), so there is nothing to cascade, null or restrict');
  const readme = await readFile('db/foundation/README.md', 'utf8');
  assert.match(readme, /The key carries no ON DELETE action, by decision/, 'and the README records the decision beside the key');
  for (const later of (await readdir('db/foundation/migrations')).filter((n) => n > '111_social_fk.sql')) {
    const text = (await readFile(`db/foundation/migrations/${later}`, 'utf8')).replace(/--[^\n]*/g, '');
    assert.doesNotMatch(text, /content_targets_social_scope_fk[\s\S]{0,300}on\s+delete/i, `${later} does not give the social key an ON DELETE action without changing the decision first`);
  }
});
