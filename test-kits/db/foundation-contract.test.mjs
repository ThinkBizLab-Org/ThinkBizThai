import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
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
const NOT_ON_THE_INSTANCE = [AUTHZ_MIGRATION, '020_business.sql', '021_member_scope.sql',
  '030_industry.sql', '040_knowledge.sql', '041_knowledge_resolution.sql'];

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
