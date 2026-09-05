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

import { catalogLint, migrationSetDigest } from '../../scripts/db/run.mjs';

const SNAPSHOT = 'db/foundation/lint/catalog-snapshot.json';
const snapshot = async () => JSON.parse(await readFile(SNAPSHOT, 'utf8'));

test('the committed catalog snapshot matches the migrations it claims to describe', async () => {
  const snap = await snapshot();
  assert.equal(snap.taken_against_migrations, await migrationSetDigest(),
    'the snapshot describes a different migration set than the one in the tree — retake it');
  assert.deepEqual(await catalogLint(snap), [], 'the live catalog satisfies every rule asserted against it');
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
  const enabledOnly = [{ table: 'workspace', rls_enabled: true, rls_forced: false, has_pk: true, comment: 'owner: A1' }];
  assert.ok((await withCatalog({ tenant_tables: enabledOnly })).some((p) => /relforcerowsecurity is false/.test(p)));
  const forced = [{ ...enabledOnly[0], rls_forced: true }];
  assert.deepEqual(await withCatalog({ tenant_tables: forced }), []);

  // A table whose RLS was turned off after the migration ran. No file changes; the catalog does.
  assert.ok((await withCatalog({ tenant_tables: [{ ...forced[0], rls_enabled: false }] }))
    .some((p) => /relrowsecurity is false/.test(p)));

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
const REQUIRED_SYMBOLS = [
  'user_owner_a', 'user_editor_a', 'user_approver_a', 'user_viewer_a', 'user_suspended_a',
  'user_owner_b', 'workspace_a', 'workspace_b', 'business_a1', 'business_a2', 'business_b1',
  'page_a1', 'page_a2', 'page_b1',
];

test('every identity the data package names is in the catalog, and each id is derived not invented', async () => {
  const { createHash } = await import('node:crypto');
  const catalog = JSON.parse(await readFile(FIXTURES, 'utf8'));
  const identities = catalog.identities ?? {};

  assert.deepEqual(Object.keys(identities).sort(), [...REQUIRED_SYMBOLS].sort(),
    'the catalog carries exactly the identities §12.6 names — no more, no fewer');

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
    assert.equal(r.memberships, 0, `${r.role} has no members yet; granting one picks the connection method`);
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
