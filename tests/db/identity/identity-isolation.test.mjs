// What can be proven about the batch 010 isolation suite WITHOUT a database.
//
// Owner: A1 Identity. Run with:  LC_ALL=C TZ=UTC node --test tests/db/identity/
//
// This file does not prove tenant isolation and does not claim to. Isolation is proven by
// run-isolation.mjs against a live database, and no database is wired — RFC-2026-017 §7 and
// WP-0A-DB-00's open blockers both say so, and nothing here changes it.
//
// What it does prove is that the INSTRUMENT is honest, which is the failure mode this repository
// keeps finding: a suite whose assertions are shaped so that they would pass on a database with
// no policies at all. Three properties are checked, and each is checked because getting it wrong
// produces a green run that means nothing:
//
//   * every id comes from the fixture catalog and none is generated;
//   * no mutation is asserted with a read assertion, and every filtered write carries a witness;
//   * the migration's grants make the service denial attributable to RLS rather than to a
//     forgotten GRANT.
//
// And the last test runs the whole case list through a fake database where RLS does nothing, and
// requires the suite to FAIL. A suite that has never been observed failing is not evidence.

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import {
  AUTHORIZATION_CASE_COVERAGE, NOT_A_CONSTRAINT_CODE, OUTCOME_KINDS, SMOKE_COVERAGE, buildCases,
  isMutation,
} from './isolation-cases.mjs';
import { ASSERTION_FOR, ROLE_FOR_HELPER, assumeIdentity, fixtureResolver, runCases } from './run-isolation.mjs';
import {
  expectDenied, expectNoRows, expectRows,
} from '../../../db/foundation/test-helpers/rls-assertions.mjs';

const MIGRATION = 'db/foundation/migrations/010_identity.sql';
const FIXTURE = 'tests/db/identity/fixtures/010-identity-fixture.sql';
const CATALOG = 'db/foundation/seeds/fixture-catalog.json';
const CASES_FILE = 'tests/db/identity/isolation-cases.mjs';
const BUSINESS_MIGRATION = 'db/foundation/migrations/020_business.sql';
const BUSINESS_FIXTURE = 'tests/db/identity/fixtures/020-business-fixture.sql';

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const TABLES = ['user_profiles', 'workspaces', 'workspace_settings', 'workspace_members', 'workspace_invitations'];

const migration = await readFile(MIGRATION, 'utf8');
const migrationCode = migration.replace(/--[^\n]*/g, '');
const id = await fixtureResolver(CATALOG);
const cases = buildCases(id);

test('every case identity and every row id is read from the fixture catalog, never generated', async () => {
  const source = await readFile(CASES_FILE, 'utf8');
  const literals = [...source.matchAll(UUID)];
  assert.deepEqual(literals, [], 'a uuid literal in the case list means an id was written rather than '
    + 'resolved. §12.6 and the fixture catalog both require ids be read: a generated id makes a '
    + 'failure unreproducible, and it makes the cross-tenant assertion meaningless, because the '
    + "control is that tenant A holds tenant B's EXACT id and still cannot reach it.");

  const known = new Set(Object.values(JSON.parse(await readFile(CATALOG, 'utf8')).identities).map((e) => e.uuid));
  for (const testCase of cases) {
    for (const param of testCase.params ?? []) {
      if (typeof param === 'string' && UUID.test(param)) {
        UUID.lastIndex = 0;
        assert.ok(known.has(param), `${testCase.id} binds a uuid that is not in the catalog: ${param}`);
      }
      UUID.lastIndex = 0;
    }
  }
  assert.throws(() => id('a_symbol_that_does_not_exist'), /never generated/,
    'the resolver must refuse an unknown symbol rather than invent an id for it');
});

test('the fixture materialises exactly the catalog identities and invents no other row id', async () => {
  const known = new Set(Object.values(JSON.parse(await readFile(CATALOG, 'utf8')).identities).map((e) => e.uuid));
  const fixture = (await readFile(FIXTURE, 'utf8')).replace(/--[^\n]*/g, '');
  const used = new Set([...fixture.matchAll(UUID)].map((m) => m[0]));
  assert.ok(used.size > 0, 'the fixture must actually load identities');
  for (const value of used) {
    assert.ok(known.has(value), `the fixture writes ${value}, which is not a catalog identity. `
      + 'A fixture id nobody can recompute is an unverifiable constant.');
  }
  // Both tenants, and the suspended member the wording of §12.6/5 turns on.
  for (const symbol of ['workspace_a', 'workspace_b', 'user_owner_a', 'user_owner_b', 'user_suspended_a']) {
    assert.ok(used.has(id(symbol)), `the fixture must load ${symbol}`);
  }
  // §9.3 and §9.2: a digest, and no plaintext token to hash.
  assert.match(fixture, /sha256\(convert_to\(/, 'invitation tokens are stored as a digest (§9.3)');
  // And taken from pg_catalog, not through a schema-qualified pgcrypto call. This assertion used to
  // pin `public.digest(` -- which is exactly the call A1's countersignature §5.5 measured as absent
  // on the provisioned instance, where pgcrypto lives in `extensions`. The test was holding the
  // fixture to the shape that could not run against the platform, so it would have refused the fix.
  //
  // A0 CORRECTION, on C0's review D12: the reason this assertion used to give was false in both of
  // its halves, and became so in the increment that wrote it. `db/foundation/prerequisites.sql`
  // (formerly the CI shim's first two lines) installs pgcrypto in `extensions` before the batches
  // run, so `extensions.digest` DOES exist in the CI container now and `public.digest` exists in
  // neither place. The assertion is right and stays; only what it claimed about the two
  // environments was describing the arrangement the shim change replaced.
  assert.doesNotMatch(fixture, /\b(public|extensions)\.digest\s*\(/,
    'the digest must not be taken through a schema-qualified pgcrypto call. Where pgcrypto lives is '
    + 'an environment fact -- `extensions` on the provisioned instance and in CI, `public` on a '
    + 'database nobody prepared -- and a fixture that names a schema is a fixture that runs in one '
    + 'of them. sha256() has been in pg_catalog since PostgreSQL 11 and resolves in all of them.');
});

// C0's review D6 again, as a static ratchet rather than as a runtime one. `expectDeniedBy` checks
// `deniedOn` when a case declares it and does not invent one when a case does not -- silence is not
// a claim -- so nothing at run time stops a future 'denied' case from naming a layer and no object,
// which is the exact shape that let `permission denied for schema private` satisfy a claim about a
// table. The pairing is asserted here, where `npm run check` sees it without a database.
test('a case that names the layer refusing it also names the object refused', () => {
  for (const testCase of cases) {
    if (!testCase.deniedBy && !testCase.deniedOn) continue;
    assert.equal(testCase.expect, 'denied', `${testCase.id}: only a 'denied' case can name a refusal`);
    assert.ok(testCase.deniedBy && testCase.deniedOn,
      `${testCase.id}: deniedBy and deniedOn are declared together or not at all. A layer with no object `
      + 'is what `permission denied for schema private` satisfies, and that is the harness failing rather '
      + 'than the object under test being refused.');
    const { kind, name } = testCase.deniedOn;
    assert.ok(['table', 'schema'].includes(kind), `${testCase.id}: unknown deniedOn kind '${kind}'`);
    // The declared object must be one the case's own statement reaches. A case cannot claim a
    // refusal on something it never touches.
    const named = kind === 'table' ? new RegExp(`\\bapp\\.${name}\\b`) : new RegExp(`\\b${name}\\.`);
    assert.match(testCase.sql, named,
      `${testCase.id}: declares deniedOn ${kind} '${name}', which its own statement never names`);
    // And `private` is the harness's own schema, never an object under test: a case refused there
    // is the scaffolding failing, which is exactly the shape D6 was about.
    assert.notEqual(name, 'private', `${testCase.id}: private is the harness's schema, not a subject`);
  }
});

test('no write is asserted with a read assertion, and every filtered write carries a witness', () => {
  for (const testCase of cases) {
    assert.ok(OUTCOME_KINDS.includes(testCase.expect), `${testCase.id}: unknown outcome kind`);
    if (!isMutation(testCase.sql)) continue;
    assert.notEqual(testCase.expect, 'no-rows', `${testCase.id}: a write may never be asserted with `
      + 'expectNoRows. An empty result is also what a write returns when RLS is off and the row is '
      + 'absent, which is the state of a fresh test database.');
    if (testCase.expect === 'no-effect') {
      assert.match(testCase.sql, /\breturning\b/i, `${testCase.id}: a no-effect case must carry `
        + 'RETURNING, so "affected nothing" is an observable empty result set rather than a row '
        + "count inferred from a driver's reporting.");
      assert.ok(testCase.witness, `${testCase.id}: a no-effect case is TWO assertions. Without the `
        + 'witness it is expectNoRows wearing a different name.');
      assert.ok(testCase.witness.column && testCase.witness.equals !== undefined,
        `${testCase.id}: the witness must assert a VALUE, not merely that a row exists`);
    }
  }
});

test('every insert is asserted as a refusal, because an insert is the write that raises', () => {
  const inserts = cases.filter((c) => c.sql.trimStart().toLowerCase().startsWith('insert'));
  assert.ok(inserts.length >= 5, 'the forgery and wrong-role cases run through INSERT');
  for (const testCase of inserts) {
    // `rejected` joined this list with batch 020 and is not a loosening: it demands an error with a
    // NAMED SQLSTATE that may not be 42501, which is a narrower claim than `denied` and not a
    // weaker one. What stays excluded is the thing that mattered — `no-effect`, and `no-rows`,
    // either of which would assert less than the database actually does.
    assert.ok(['denied', 'rejected', 'rows'].includes(testCase.expect), `${testCase.id}: an INSERT has `
      + 'no USING clause to filter it silently — WITH CHECK either admits the row or raises, and a '
      + 'constraint may then refuse it. A no-effect assertion here would be weaker than the database '
      + 'actually is.');
  }
});

test('a rejected case names a SQLSTATE, and never the one that means a policy refused', () => {
  const rejected = cases.filter((c) => c.expect === 'rejected');
  assert.ok(rejected.length >= 1, 'batch 020 asserts §4 invariant 10 through a composite foreign key, '
    + 'and that assertion is the whole reason this outcome kind exists');
  for (const testCase of rejected) {
    assert.ok(testCase.sqlstate, `${testCase.id}: a 'rejected' case must declare the SQLSTATE it `
      + 'expects. Without one it asserts that something went wrong, which a broken fixture satisfies.');
    assert.match(testCase.sqlstate, /^[0-9A-Z]{5}$/, `${testCase.id}: a SQLSTATE is five characters`);
    assert.notEqual(testCase.sqlstate, NOT_A_CONSTRAINT_CODE,
      `${testCase.id}: 42501 is an RLS refusal and belongs to 'denied'. A case claiming the CONSTRAINT `
      + 'stopped the row must not be satisfiable by a policy stopping it, or the constraint could be '
      + 'dropped with nothing noticing — which is exactly what §4 invariant 10 asks to be proven.');
  }
  // And no case may declare a SQLSTATE it is not asserting through.
  for (const testCase of cases) {
    if (testCase.expect === 'rejected') continue;
    assert.equal(testCase.sqlstate, undefined,
      `${testCase.id}: declares a sqlstate and is not a 'rejected' case, so nothing checks it`);
  }
  assert.equal(ASSERTION_FOR.rejected, undefined, "'rejected' is handled by the runner, which compares "
    + 'the code; a single-helper mapping for it would lose the SQLSTATE that is the entire assertion.');
});

test('the runner maps each outcome kind to the helper it claims, with nothing softened', () => {
  assert.equal(ASSERTION_FOR.rows, expectRows);
  assert.equal(ASSERTION_FOR['no-rows'], expectNoRows);
  assert.equal(ASSERTION_FOR.denied, expectDenied, 'a refusal is asserted with expectDenied and '
    + 'nothing else. Substituting expectNoRows here is the single change that would make this '
    + 'entire suite green against a database with row level security switched off.');
  assert.equal(ASSERTION_FOR['no-effect'], undefined, 'no-effect is two assertions and is handled '
    + 'by the runner; a single-helper mapping for it would lose the witness');
});

test('the assertion RFC-2026-017 §7 says is owed exists, and it demands an error', () => {
  const owed = cases.filter((c) => (c.covers ?? []).includes('RFC-2026-017§7'));
  assert.ok(owed.length >= 4, 'the service identity is exercised on reads and writes, not once');

  const raising = owed.filter((c) => c.expect === 'denied');
  assert.ok(raising.length >= 1, 'RFC-2026-017 §7 asks for the service identity to be "denied with '
    + 'an error, not an empty result". At least one case must therefore demand 42501.');
  for (const testCase of raising) {
    assert.ok(testCase.sql.trimStart().toLowerCase().startsWith('insert'),
      `${testCase.id}: the raising service case must be an INSERT. An UPDATE whose USING clause `
      + 'filters the row reports zero rows and raises nothing, so it cannot carry this claim.');
  }
  // And the read half, which is what distinguishes RLS filtering from BYPASSRLS.
  assert.ok(owed.some((c) => c.expect === 'no-rows'),
    'a service role holding BYPASSRLS would SEE the rows. The read half is what notices.');
});

test('the service denial is attributable to row level security and not to a forgotten grant', () => {
  // The point of the grant. Without it, 42501 means "nobody granted app_worker anything" and the
  // assertion above proves nothing about policies at all.
  assert.match(migrationCode, /grant\s+usage\s+on\s+schema\s+app\s+to\s+app_worker/i);
  assert.match(migrationCode, /grant\s+select,\s*insert,\s*update\s+on\s+app\.workspaces\s+to\s+app_worker/i);
  // And the other half: no policy names a service role, so the refusal can only be RLS.
  for (const role of ['app_worker', 'app_command', 'app_maintenance']) {
    assert.doesNotMatch(migrationCode, new RegExp(`create\\s+policy[\\s\\S]{0,600}?\\bto\\s+${role}\\b`, 'i'),
      `batch 010 must write no policy TO ${role}. §8.1 marks no identity operation \`S\` — every `
      + 'service cell is `P` — so a service policy here would add a permission the matrix does not '
      + 'grant, which RFC-2026-016 §2 explicitly says the amendment does not do.');
  }
  // anon is granted nothing at all (§8.5: anonymous has no tenant policy).
  assert.doesNotMatch(migrationCode, /\bto\s+anon\b/i);
});

test('every table in the batch carries RLS, FORCE, a primary key, an owner comment and a policy', () => {
  for (const table of TABLES) {
    assert.match(migrationCode, new RegExp(`create table (?:if not exists )?app\\.${table}\\b`, 'i'));
    assert.match(migrationCode, new RegExp(`alter table app\\.${table} enable row level security`, 'i'));
    assert.match(migrationCode, new RegExp(`alter table app\\.${table} force row level security`, 'i'),
      `app.${table}: ENABLE and FORCE are different catalog columns and the data package's own lint `
      + 'rule tests only the first, so ENABLE alone leaves the table owner exempt from every policy.');
    assert.match(migration, new RegExp(`comment on table app\\.${table} is`, 'i'));
    assert.match(migrationCode, new RegExp(`create policy \\w+ on app\\.${table}\\b`, 'i'),
      `app.${table}: a forced table with no policy is unreachable by every client role. If that is `
      + 'intended it must be a decision in the file, not an omission.');
  }
  // Deny-by-default means the absences matter as much as the policies.
  assert.doesNotMatch(migrationCode, /create\s+policy[\s\S]{0,200}?\bfor\s+delete\b/i,
    '§8.5: there is no broad user delete on any tenant table. Deletion is a retention job (batch 160).');
});

test('every canonical scope name is the canonical one and no synonym appears', () => {
  for (const synonym of ['tenant_id', 'organization_id', 'org_id', 'brand_id', 'account_id']) {
    assert.doesNotMatch(migrationCode, new RegExp(`\\b${synonym}\\b`, 'i'),
      `§3.3 forbids the synonym ${synonym}; the canonical tenant scope field is workspace_id`);
  }
  // `page_id` is forbidden by name; page scope is page_context_profile_id, and batch 010 has none.
  assert.doesNotMatch(migrationCode, /\bpage_id\b/i);
  for (const table of ['workspace_settings', 'workspace_members', 'workspace_invitations']) {
    assert.match(migrationCode, new RegExp(`create table (?:if not exists )?app\\.${table}[\\s\\S]{0,900}?workspace_id`, 'i'),
      `app.${table} is tenant-owned and must carry workspace_id (§3.3)`);
  }
});

test('every policy predicate requires an ACTIVE membership, which is what §12.6/5 turns on', () => {
  const policies = [...migrationCode.matchAll(/create policy (\w+)([\s\S]*?);\n/g)];
  assert.ok(policies.length >= 8, 'the batch writes a policy set, not a token policy');
  for (const [body, name] of policies.map((m) => [m[0], m[1]])) {
    if (name.startsWith('user_profiles_')) continue; // user-scoped, not tenant-owned (§5).
    assert.match(body, /status\s*=\s*'active'/,
      `${name}: §7 says only status=active grants access, and suspension is a property of the `
      + 'membership row rather than of the token — so a predicate that omits it admits an identity '
      + 'whose claims are byte-identical to an active member\'s.');
    assert.match(body, /auth\.uid\(\)/,
      `${name}: the predicate must be anchored to the authenticated subject`);
  }
  // §8.5: an UPDATE policy has both halves.
  for (const [body, name] of policies.map((m) => [m[0], m[1]])) {
    if (!/for\s+update/i.test(body)) continue;
    assert.match(body, /using/i, `${name}: an UPDATE policy needs USING`);
    assert.match(body, /with\s+check/i, `${name}: an UPDATE policy needs WITH CHECK, or a row can be `
      + 'updated out of the scope that admitted it (§8.5)');
  }
});

test('the invitation token digest is writable and not readable, and no plaintext token exists', () => {
  assert.match(migrationCode, /grant insert \([^)]*token_hash[^)]*\)\s*on app\.workspace_invitations to authenticated/i);
  const selectGrants = [...migrationCode.matchAll(/grant select \(([^)]*)\)\s*on app\.workspace_invitations to (\w+)/gi)];
  assert.ok(selectGrants.length >= 1, 'the client select grant must be column-scoped');
  for (const grant of selectGrants) {
    assert.doesNotMatch(grant[1], /token_hash/i,
      `${grant[2]} must not hold SELECT on token_hash. §9.2: a token is never returned after write, `
      + 'and a digest that can be read back is an offline attack on the token it stands for.');
  }
  assert.match(migrationCode, /octet_length\(token_hash\)\s*>=\s*32/,
    '§9.3 stores a cryptographic hash only; a length floor keeps a plaintext token from fitting the shape');
});

test('the batch 020 fixture writes only catalog identities, and loads both sides of the boundary', async () => {
  const known = new Set(Object.values(JSON.parse(await readFile(CATALOG, 'utf8')).identities).map((e) => e.uuid));
  const fixture = (await readFile(BUSINESS_FIXTURE, 'utf8')).replace(/--[^\n]*/g, '');
  const used = new Set([...fixture.matchAll(UUID)].map((m) => m[0]));
  assert.ok(used.size > 0, 'the fixture must actually load rows');
  for (const value of used) {
    assert.ok(known.has(value), `the fixture writes ${value}, which is not a catalog identity. `
      + 'A fixture id nobody can recompute is an unverifiable constant, and the cross-tenant cases '
      + "are only worth anything because tenant A holds tenant B's REAL id — an invented one would "
      + 'make a failure impossible to reproduce and the assertion impossible to trust.');
  }
  // Both tenants, at every depth the batch creates, plus the archived business §11.3 needs.
  for (const symbol of ['business_a1', 'business_a2', 'business_a3_archived', 'business_b1',
    'page_a1', 'page_b1']) {
    assert.ok(used.has(id(symbol)), `the fixture must load ${symbol}`);
  }
  // The version rows carry no id of their own — they are addressed by parent and ordinal, which is
  // why the catalog needs no symbol for one. What has to be true instead is that the fixture writes
  // a version 1 for each of the four parents the cases address, and that it does so idempotently
  // through the NATURAL key: `on conflict (id)` on a row with no id would be a no-op that silently
  // inserted a second version 1 on every re-run.
  for (const parent of ['business_profile_id', 'page_context_profile_id']) {
    assert.match(fixture, new RegExp(`on conflict \\(${parent}, version_number\\) do nothing`),
      `the version insert keyed on ${parent} must be idempotent on the constraint the cases address `
      + 'it through, or a re-run and a case can disagree about which row is version 1');
  }
  assert.equal([...fixture.matchAll(/version_number, name, created_by\) values/g)].length, 2,
    'one version insert per version table');
  // The archived business is archived, or §11.3's case has nothing to bite on and passes because
  // every page insert happened to be refused for some other reason.
  assert.match(fixture, /timestamptz '2026-01-01 00:00:00\+00'/,
    'business_a3_archived carries a FIXED archived_at. A now()-relative value would make the fixture '
    + 'content depend on when it ran, which is the property the whole catalog exists to avoid.');
});

// ---------------------------------------------------------------------------
// Batch 020, statically. Same discipline as batch 010's block above: what can be read from the
// migration text is read from it, and the live half runs in CI through `make db-rls-smoke`.

const business = await readFile(BUSINESS_MIGRATION, 'utf8');
const businessCode = business.replace(/--[^\n]*/g, '');
const BUSINESS_TABLES = ['business_profiles', 'business_profile_versions',
  'page_context_profiles', 'page_context_profile_versions'];
const VERSION_TABLES = ['business_profile_versions', 'page_context_profile_versions'];

test('every batch 020 table carries RLS, FORCE, a primary key, an owner comment and a policy', () => {
  for (const table of BUSINESS_TABLES) {
    assert.match(businessCode, new RegExp(`create table (?:if not exists )?app\\.${table}\\b`, 'i'));
    assert.match(businessCode, new RegExp(`alter table app\\.${table} enable row level security`, 'i'));
    assert.match(businessCode, new RegExp(`alter table app\\.${table} force row level security`, 'i'),
      `app.${table}: ENABLE and FORCE are different catalog columns and the data package's own lint `
      + 'rule tests only the first, so ENABLE alone leaves the table owner exempt from every policy.');
    assert.match(businessCode, new RegExp(`create table (?:if not exists )?app\\.${table}[\\s\\S]{0,2000}?primary key`, 'i'),
      `app.${table}: no primary key`);
    assert.match(business, new RegExp(`comment on table app\\.${table} is`, 'i'));
    assert.match(businessCode, new RegExp(`create policy \\w+ on app\\.${table}\\b`, 'i'),
      `app.${table}: a forced table with no policy is unreachable by every client role. If that is `
      + 'intended it must be a decision in the file, not an omission.');
  }
  assert.doesNotMatch(businessCode, /create\s+policy[\s\S]{0,300}?\bfor\s+delete\b/i,
    '§8.5: there is no broad user delete on any tenant table. Archiving is an UPDATE of a typed '
    + 'lifecycle field (§11.3) and hard deletion is the retention job (batch 160).');
  assert.doesNotMatch(businessCode, /\bto\s+anon\b/i, '§8.5: anonymous holds no tenant policy and no grant');
});

test('no batch 020 policy joins the membership table, because that is what batch 011 removed', () => {
  const policies = [...businessCode.matchAll(/create policy (\w+)([\s\S]*?);\n/g)];
  assert.ok(policies.length >= 10, 'four tables, each with a SELECT and at least one write policy');
  for (const [body, name] of policies.map((m) => [m[0], m[1]])) {
    assert.doesNotMatch(body, /app\.workspace_members/,
      `${name}: RFC-2026-020 §5/5 makes membership uniform — policies read it through the helpers and `
      + 'never by joining app.workspace_members. A join here would evaluate that scan AS THE CALLER, so '
      + "`authenticated`'s whole policy set on the membership table (010's own-row policy ORed with "
      + "011's roster policy) would expand inside this table's evaluation, and the width of business "
      + 'visibility would become a property of another module\'s batch rather than of this file.');
    assert.match(body, /app\.(is_active_member|workspace_member_role)\s*\(/,
      `${name}: every predicate resolves membership through a batch 011 helper. A policy that resolved `
      + 'it some other way would be a second membership model in the same schema.');
    assert.match(body, /\bto\s+authenticated\b/i, `${name}: §8.5 writes tenant policies TO authenticated`);
  }
  // §8.5: an UPDATE policy has both halves, or a row can be updated out of the scope that admitted it.
  for (const [body, name] of policies.map((m) => [m[0], m[1]])) {
    if (!/for\s+update/i.test(body)) continue;
    assert.match(body, /using/i, `${name}: an UPDATE policy needs USING`);
    assert.match(body, /with\s+check/i, `${name}: an UPDATE policy needs WITH CHECK`);
  }
  // §8.5: a user INSERT asserts created_by = auth.uid(). All four tables take client inserts.
  const inserts = policies.filter(([body]) => /for\s+insert/i.test(body));
  assert.equal(inserts.length, 4, 'each of the four tables carries exactly one INSERT policy');
  for (const [body, name] of inserts.map((m) => [m[0], m[1]])) {
    assert.match(body, /created_by\s*=\s*\(select auth\.uid\(\)\)/,
      `${name}: without it, an owner can write a row naming somebody else as its author — the AUTH-3 `
      + 'attribution forged at the moment of writing (§8.5, §8.6 case 8).');
  }
});

test('an immutable version table grants no client role UPDATE or DELETE, and carries no such policy', () => {
  for (const table of VERSION_TABLES) {
    // The policy half. A policy with no grant is inert, and a grant with no policy is refused by
    // RLS rather than by privilege — a weaker refusal than §8.1's `N N N N N N` row asks for — so
    // both halves are asserted, exactly as the migration's own apply-time check asserts both.
    const policies = [...businessCode.matchAll(new RegExp(`create policy (\\w+) on app\\.${table}\\b([\\s\\S]*?);\\n`, 'g'))];
    assert.ok(policies.length >= 1, `app.${table}: a forced table with no policy at all is unreadable`);
    for (const [body, name] of policies.map((m) => [m[0], m[1]])) {
      assert.doesNotMatch(body, /for\s+(update|delete)\b/i,
        `${name}: §3.2 and §4 invariant 8 make a version immutable, and §8.1 marks version `
        + 'UPDATE/DELETE N for every role including the service.');
    }
    // The grant half, which is the one that makes the refusal a privilege-layer denial.
    for (const role of ['authenticated', 'app_worker', 'app_command', 'app_maintenance', 'anon']) {
      assert.doesNotMatch(businessCode,
        new RegExp(`grant[^;]*\\b(update|delete)\\b[^;]*on app\\.${table} to ${role}`, 'i'),
        `app.${table}: ${role} must hold neither UPDATE nor DELETE. The absence of the grant is what `
        + 'makes the refusal happen before RLS is consulted, and a policy can be widened by an edit '
        + 'while an absent privilege has to be granted.');
    }
    // And the version tables have no updated_at to stamp, so no trigger claims to stamp one.
    assert.doesNotMatch(businessCode, new RegExp(`create trigger set_updated_at before update on app\\.${table}`, 'i'),
      `app.${table}: an updated-at trigger on an immutable table is the first sentence of that table `
      + 'contradicting itself.');
  }
  // app_worker IS granted select and insert there, deliberately: without a grant the service
  // refusal above would be indistinguishable from a forgotten one.
  for (const table of VERSION_TABLES) {
    assert.match(businessCode, new RegExp(`grant select, insert on app\\.${table} to app_worker`, 'i'),
      `app.${table}: app_worker holds SELECT and INSERT and no policy, which is what makes "denied by `
      + 'RLS" and "denied by a missing grant" tell apart (RFC-2026-017 §7).');
  }
});

test('the scope path is canonical, composite, and closed against a cross-tenant parent', () => {
  for (const synonym of ['tenant_id', 'organization_id', 'org_id', 'brand_id', 'account_id', 'page_id']) {
    assert.doesNotMatch(businessCode, new RegExp(`\\b${synonym}\\b`, 'i'),
      `§3.3 forbids the synonym ${synonym}; the canonical fields are workspace_id, `
      + 'business_profile_id and page_context_profile_id');
  }
  for (const table of BUSINESS_TABLES) {
    assert.match(businessCode, new RegExp(`create table (?:if not exists )?app\\.${table}[\\s\\S]{0,1200}?workspace_id`, 'i'),
      `app.${table} is tenant-owned and must carry workspace_id (§3.3)`);
  }
  // §3.3 and §4 invariant 10: a child confirms its parent is in the SAME workspace, with a
  // composite foreign key. A single-column reference would say the business exists and nothing
  // about whose it is, so a row could carry workspace A and a business in workspace B — and every
  // policy in the file would then judge the caller against the workspace the ROW claims.
  assert.match(businessCode,
    /foreign key \(workspace_id, business_profile_id\)\s*references app\.business_profiles \(workspace_id, id\)/i,
    'business_profile_versions and page_context_profiles reference their business by the whole scope pair');
  assert.match(businessCode,
    /foreign key \(workspace_id, business_profile_id, page_context_profile_id\)\s*references app\.page_context_profiles \(workspace_id, business_profile_id, id\)/i,
    'page_context_profile_versions references its page by the whole scope path');
  // The unique constraints that make those references possible. Without them the foreign keys do
  // not compile, so this is really an assertion that nobody replaced them with a single-column key.
  assert.match(businessCode, /unique \(workspace_id, id\)/i, 'business_profiles carries the pair its children reference');
  assert.match(businessCode, /unique \(workspace_id, business_profile_id, id\)/i,
    'page_context_profiles carries the triple its version table references');
  // §8.5: a row may not be moved across tenant OR scope by an update, enforced by the privilege
  // system and not only by a WITH CHECK a later edit could weaken.
  for (const grant of businessCode.matchAll(/grant update \(([^)]*)\) on app\.(\w+)/gi)) {
    assert.doesNotMatch(grant[1], /workspace_id/i, `app.${grant[2]}: workspace_id is not updatable`);
    assert.doesNotMatch(grant[1], /business_profile_id/i,
      `app.${grant[2]}: business_profile_id is not updatable — a Page changing Business is a row moving `
      + 'across scope, which §8.5 forbids an update to do.');
  }
});

test('the coverage claim names what is NOT covered, with the batch that owes it', () => {
  for (const key of [1, 2, 3, 4, 5, 6, 7, 8]) {
    assert.ok(SMOKE_COVERAGE[key], `§12.6 assertion ${key} must be dispositioned`);
    assert.ok(SMOKE_COVERAGE[key].note.length > 40, `§12.6 assertion ${key} needs a real reason, not a flag`);
  }
  // Batch 020 created the tables assertion 2 names and paid HALF of it, recording the row as
  // 'partial' with batch 021 named as the one that owed the rest. 021 created
  // app.workspace_member_scopes, so the row is now `true` — and it is `true` only because the cases
  // moved with it. The citation check below is what makes that more than a word: §12.6/2 must be
  // cited by a case, and `editor-a-scope-does-not-reach-business-a2` is the one that replaced the
  // positive assertion of the wider state.
  assert.equal(SMOKE_COVERAGE[2].covered, true,
    'batch 021 creates the member scope table, so the half of §12.6/2 that 020 recorded as owed — '
    + '"never A2/Page A2" — is now asserted rather than deferred');
  assert.match(SMOKE_COVERAGE[2].note, /021/,
    'the note names the batch that paid the rest, so a reader can find the change that did it');
  // Batch 040 moved this from `false` to a LABELLED PARTIAL, and the line changing here is the
  // point: §12.6/3 names content AND knowledge, 040 creates the knowledge tables and asserts the
  // approver against them, and 080 still owes content. A batch that had flipped it to `true` would
  // have passed the citation check below on the knowledge cases alone.
  assert.equal(SMOKE_COVERAGE[3].covered, 'knowledge-half',
    'batch 040 creates one of the two families §12.6/3 names and asserts the approver against it, so '
    + 'the row is no longer `false` — and content is batch 080, so it is not `true` either');
  assert.equal(SMOKE_COVERAGE[7].covered, true,
    'batch 020 creates the business and page columns assertion 7 needs, so the "partial" batch 010 '
    + 'recorded is now paid: a forged workspace_id, a forged created_by, a forged business id, and a '
    + 'version attached across the tenant boundary all fail.');
  assert.equal(SMOKE_COVERAGE[8].covered, 'negative-half',
    'the positive half of assertion 8 cannot be asserted without first inventing a service '
    + 'permission §8.1 does not grant');
  for (const key of Object.keys(AUTHORIZATION_CASE_COVERAGE)) {
    assert.ok(String(AUTHORIZATION_CASE_COVERAGE[key]).length > 20, `§8.6 case ${key} needs a disposition`);
  }
  // Every assertion claimed covered must actually appear in a case.
  const claimed = Object.entries(SMOKE_COVERAGE).filter(([, v]) => v.covered === true).map(([k]) => `§12.6/${k}`);
  const cited = new Set(cases.flatMap((c) => c.covers ?? []));
  for (const label of claimed) {
    assert.ok(cited.has(label), `${label} is claimed covered but no case cites it`);
  }
});

test('assuming an identity is transaction-scoped and its failure is never read as a denial', () => {
  for (const helper of ['as_user', 'as_suspended_user', 'as_anonymous', 'as_service']) {
    const statements = assumeIdentity({ helper, subject: id('user_owner_a') });
    assert.match(statements.join('\n'), new RegExp(`private\\.${helper}\\b`));
    // A0 CORRECTION during integration, not by A1.
    //
    // A1 pinned the right PROPERTY — a failure to assume must never read as a denial, and the
    // setting must be transaction-scoped — but pinned it to the MECHANISM the foundation supplied
    // at the time: a GUC that worked around a guard, and an explicit call to that guard. Both were
    // rituals a proxy imposed on its callers, and A1 said so while writing them.
    //
    // The guard is no longer a proxy: each helper reads its own setting back and raises if
    // SET LOCAL did not take. So the property is pinned where it now lives, in the helpers, and
    // the caller is asserted to perform nothing — because a caller that has to perform something
    // is a caller that will eventually forget.
    assert.equal(statements.length, 1,
      'assuming an identity is ONE statement. Anything more is a ritual the guard imposes, and the '
      + 'previous two — a GUC and an explicit guard call — are exactly what that looks like.');
    assert.doesNotMatch(statements.join('\n'), /in_test_txn|assert_in_transaction/,
      'the workarounds the old proxy guard required must not come back');
  }
  assert.equal(assumeIdentity({ helper: 'as_anonymous' }).some((s) => s.includes('$1')), false,
    'the anonymous helper takes no subject; passing one would be an authenticated identity wearing '
    + "anonymous's name");
});

// The test that makes every test above worth something.
test('the suite FAILS against a database where row level security does nothing', async () => {
  // A fake that behaves the way an unprotected database behaves: every read returns the row, every
  // write succeeds, nothing is ever refused. This is not a strawman — it is the state of a fresh
  // test database before any policy is applied, and the state of any database reached by a role
  // holding BYPASSRLS.
  // The permissive database still holds whatever identity it was told to assume: an unprotected
  // database is one with no policies, not one with a broken driver. It therefore tracks the last
  // helper called and answers the role read-back truthfully — otherwise the transaction check added
  // for C0's D4 fires first, every case fails at assume-identity, and the assertions below still
  // pass while testing nothing about RLS at all.
  let assumed = null;
  const permissive = {
    begin: async () => { assumed = null; },
    rollback: async () => {},
    exec: async (sql) => {
      const became = sql.match(/private\.(as_\w+)/)?.[1];
      if (became) { assumed = ROLE_FOR_HELPER[became] ?? null; return { rows: [{}] }; }
      if (/current_setting\('role'/.test(sql)) return { rows: [{ role: assumed }] };
      if (/^\s*set/i.test(sql)) return { rows: [{}] };
      if (/returning|^\s*select/i.test(sql)) {
        return { rows: [{ id: 'x', name: 'renamed by whoever asked', default_timezone: 'UTC', user_id: 'x', workspace_id: 'x', token_hash: 'x' }] };
      }
      return { rows: [] };
    },
  };

  const report = await runCases(cases, permissive);
  assert.ok(report.failed.length > 0, 'a suite that cannot fail is not evidence');

  // And it must fail on the cases that matter, not merely somewhere.
  const failedIds = new Set(report.failed.map((f) => f.id));
  // Every failure must be an ASSERTION failure. A case that fell over while assuming its identity
  // proves nothing about policies, and this test would still be green on a suite that never
  // reached a single assertion.
  for (const failure of report.failed) {
    assert.equal(failure.phase, 'assert', `${failure.id} failed at ${failure.phase}, not at its `
      + `assertion: ${failure.detail}`);
  }
  assert.ok(failedIds.has('service-identity-is-denied-a-write-with-an-error'),
    'the assertion RFC-2026-017 §7 owes must be among the failures — it is the one written to '
    + 'detect exactly this database');
  assert.ok(failedIds.has('owner-a-cannot-see-workspace-b'),
    'the cross-tenant read must fail when nothing filters it');
  assert.ok(failedIds.has('viewer-a-cannot-update-workspace-a'),
    'a no-effect case must fail when the write succeeds — this is the witness half doing its job, '
    + 'because the statement itself returned rows and an empty-result assertion alone would also '
    + 'have caught it, but the witness is what catches a write that returns nothing and lands anyway');
  assert.ok(failedIds.has('anonymous-cannot-read-workspaces'),
    'anonymous must fail when nothing refuses it');

  // The positive cases must still PASS against a permissive database. If they failed too, the
  // suite would be failing for the wrong reason and the test above would prove nothing.
  const positives = report.results.filter((r) => r.expect === 'rows');
  assert.ok(positives.length >= 4);
  assert.deepEqual(positives.filter((r) => !r.ok), [],
    'the positive half of every visibility rule passes on a permissive database, which is exactly '
    + 'why a suite of positives alone proves nothing');
});

// The identity check, executed rather than grepped.
//
// C0's review D4: the helpers' inline read-back was asserted by a regex over the .sql file, and no
// test ever called one outside a transaction and watched it raise. Measuring the underlying question
// on the provisioned instance settled it against the guard -- `set_config(..., true)` applies for the
// statement that runs it, so a helper's own read-back sees the value even when there is no
// transaction block, and the check cannot fire. Two proxies had already been wrong here; this was
// the third, and it was inert rather than merely untested.
//
// What a caller depends on is different and checkable: the role is still held ONE STATEMENT LATER.
// That is true only inside a transaction block. These cases drive the runner with a fake driver, so
// they execute the property instead of reading the source that claims it.
test('a driver that forgets the transaction fails at assume-identity, not at the assertion', async () => {
  const { runCases, VERIFY_IDENTITY_SQL, ROLE_FOR_HELPER } = await import('./run-isolation.mjs');

  // The fake database: identity statements "succeed", and the role read-back reports whatever the
  // scenario says the connection is really holding.
  const driverThatHolds = (roleAfterwards) => ({
    async begin() {}, async rollback() {},
    async exec(sql) {
      if (sql === VERIFY_IDENTITY_SQL) return { rows: [{ role: roleAfterwards }] };
      if (/private\.as_/.test(sql)) return { rows: [{}] };
      return { rows: [{ id: 'x' }] };
    },
  });

  const one = [{
    id: 'probe', covers: [], as: { helper: 'as_user', subject: '00000000-0000-5000-8000-000000000000' },
    sql: 'select id from app.workspaces where id = $1', params: ['x'], expect: 'rows',
  }];

  // No transaction: SET LOCAL did not survive, so the connection is still whatever it logged in as.
  const forgotten = await runCases(one, driverThatHolds('postgres'));
  assert.equal(forgotten.failed.length, 1);
  assert.equal(forgotten.failed[0].phase, 'assume-identity',
    'a lost identity must be reported where it happened. Reported at the assertion it would read as '
    + '"the policy allowed it", which is the false pass this suite exists to prevent.');
  assert.match(forgotten.failed[0].detail, /did not survive the statement that set it/);

  // And the same suite passes when the role IS held, so the check is not simply always-red.
  const held = await runCases(one, driverThatHolds(ROLE_FOR_HELPER.as_user));
  assert.deepEqual(held.failed, []);
});

test('every identity helper the cases use has a role the runner can check', async () => {
  const { ROLE_FOR_HELPER, assumeIdentity } = await import('./run-isolation.mjs');
  const helpers = new Set();
  for (const testCase of cases) {
    helpers.add(testCase.as.helper);
    if (testCase.witness) helpers.add(testCase.witness.as.helper);
  }
  for (const helper of helpers) {
    assert.ok(ROLE_FOR_HELPER[helper], `${helper} is used by a case and has no expected role, so the `
      + 'check would pass by not knowing what to look for');
    // And the role named is the one the helper actually sets, read from the helper itself.
    assert.ok(assumeIdentity({ helper, subject: 'x' }).length > 0);
  }
});

// ---------------------------------------------------------------------------
// Batch 011, statically. What can be read from the file, read from the file.
//
// The live half -- 42P17, the inlining plan, the negative control -- runs in CI through
// scripts/db/authz-proofs.mjs, because it needs a Postgres and this host has none. These are the
// properties that are decidable from the migration text, and they are the ones a reviewer would
// otherwise have to hold in their head while reading it.

const AUTHZ_MIGRATION_FILE = 'db/foundation/migrations/011_authorization_helpers.sql';
const authz = await readFile(AUTHZ_MIGRATION_FILE, 'utf8');
const authzCode = authz.replace(/--[^\n]*/g, '');
const IDENTITY_EXPRESSION =
  "(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid";

test('app_authz holds exactly one policy, and its predicate is the caller\'s own ACTIVE row', () => {
  const toAuthz = [...authzCode.matchAll(/create policy (\w+)([\s\S]*?);\n/g)]
    .filter(([body]) => /to\s+app_authz\b/.test(body));
  assert.equal(toAuthz.length, 1,
    'RFC-2026-020 §5/3 gives app_authz exactly one policy. The exemption is structural, not scopal: '
    + 'a second policy is a second decision and needs its own RFC.');

  const [body, name] = [toAuthz[0][0], toAuthz[0][1]];
  assert.match(body, /for\s+select\b/i, `${name}: §5/3 gives it SELECT and nothing else`);
  assert.match(body, /status\s*=\s*'active'/,
    `${name}: dropping the active check would make the helper answer for a suspended membership`);
  assert.ok(body.includes(IDENTITY_EXPRESSION),
    `${name}: the predicate must inline the platform identity expression character for character`);

  // The one place in this schema where a function call would be a defect rather than a style
  // choice: this policy exists to break a rewrite cycle, and calling anything re-enters it.
  assert.doesNotMatch(body.replace(/current_setting|nullif/g, ''), /\bapp\.\w+\s*\(/,
    `${name}: this policy must not call a function. It is the base case of the recursion every `
    + 'other reader goes through a helper to avoid, and a call here re-enters exactly what '
    + 'RFC-2026-020 exists to break.');
});

test('the roster policy widens batch 010 rather than restating it, and only for owner and admin', () => {
  const roster = authzCode.match(/create policy workspace_members_select_workspace_roster([\s\S]*?);\n/);
  assert.ok(roster, 'the §8.1 member-list cell is implemented by a named policy');
  const body = roster[0];
  assert.match(body, /to\s+authenticated\b/i, 'the cell belongs to the request path');
  assert.match(body, /app\.workspace_member_role\s*\(/,
    'the predicate goes through the helper. An inline `exists (select ... from app.workspace_members)` '
    + 'here is the 42P17 this batch exists to break, and scripts/db/authz-proofs.mjs raises it on '
    + 'every CI run so the reason stays executed rather than remembered.');
  assert.match(body, /'owner'/, '§8.1 gives the member list to Owner');
  assert.match(body, /'admin'/, '§8.1 gives it to Admin');
  for (const role of ['editor', 'approver', 'viewer']) {
    assert.doesNotMatch(body, new RegExp(`'${role}'`),
      `§8.1 marks Editor \`P\` and gives viewer and approver nothing. \`P\` is conditional on a `
      + 'capability set no document defines, and inventing one here would be inventing the security '
      + 'boundary of every later policy (RFC-2026-020 §8).');
  }

  // Migration invariant 1: 010 is applied and must not be rewritten. The widening is additive,
  // which is what 010's own header said its predicates were written for.
  assert.doesNotMatch(authzCode, /drop\s+policy\s+if\s+exists\s+workspace_members_select_own_active/i,
    "batch 011 must not drop batch 010's policy. RLS policies are permissive and OR together, so "
    + 'the roster policy adds to it; replacing it would be rewriting a merged migration through the '
    + 'back door.');
});

test('every function batch 011 creates is SECURITY DEFINER owned by app_authz with an empty search_path', () => {
  const functions = [...authzCode.matchAll(/create or replace function (app\.\w+)\(([^)]*)\)([\s\S]*?)\$\$;/g)];
  assert.ok(functions.length >= 3, 'the batch writes the helper set, not a token helper');
  for (const [body, name] of functions.map((m) => [m[0], m[1]])) {
    assert.match(body, /security\s+definer/i,
      `${name}: RFC-2026-020 §6.1/4 requires it of everything app_authz owns. An invoker-mode helper `
      + "runs as the caller, whose policy set on app.workspace_members by then contains the policy "
      + 'that calls it — option D arriving unremarked.');
    assert.match(body, /set\s+search_path\s*=\s*''/i, `${name}: §8.5 pins an empty search_path`);
    assert.match(authzCode, new RegExp(`alter function ${name.replace('.', '\\.')}\\([^)]*\\) owner to app_authz`, 'i'),
      `${name}: ownership is what makes SECURITY DEFINER mean app_authz rather than the migration role, `
      + 'and a function owned by the table owner is exempt from the policies on a forced table.');
  }
});

test('EXECUTE is revoked from PUBLIC on every helper and granted only where there is a caller', () => {
  for (const fn of ['app.jwt_subject()', 'app.workspace_member_role(uuid)', 'app.is_active_member(uuid)']) {
    const escaped = fn.replace(/[.()]/g, '\\$&');
    assert.match(authzCode, new RegExp(`revoke all on function ${escaped} from public`, 'i'),
      `${fn}: a helper reachable by PUBLIC is reachable by anon, which batch 010 grants nothing anywhere`);
  }
  for (const fn of ['app.workspace_member_role(uuid)', 'app.is_active_member(uuid)']) {
    const escaped = fn.replace(/[.()]/g, '\\$&');
    assert.match(authzCode, new RegExp(`grant execute on function ${escaped} to authenticated`, 'i'),
      `${fn} is called from a policy written TO authenticated, and a policy's function call is `
      + 'evaluated as the caller, so the caller must hold EXECUTE');
  }

  // The deliberate narrowing. jwt_subject is called only from inside helpers that run as its owner,
  // and no policy names it -- app_authz's own policy inlines the expression instead, because a call
  // there would re-enter the cycle. So a grant would be a callable surface with no caller, and an
  // RPC endpoint wherever `app` is the API's exposed schema.
  assert.doesNotMatch(authzCode, /grant execute on function app\.jwt_subject\(\) to/i,
    'app.jwt_subject() is granted to nobody. Explicitly is not the same as widely, and the narrowest '
    + 'grant that leaves every real caller working is none.');
});

test('the identity expression appears exactly twice, and both places are forced to be there', () => {
  // RFC-2026-020 §5/4 copies the platform expression because no role our migrations create can call
  // auth.uid(). A copy drifts, so the copy is held to a count: app.jwt_subject()'s body is the one
  // named home every reader goes through, and app_authz's policy has to inline it because a
  // function call there re-enters the recursion. A third occurrence is a third place to forget.
  const occurrences = authzCode.split(IDENTITY_EXPRESSION).length - 1;
  assert.equal(occurrences, 2,
    `the identity expression appears ${occurrences} time(s) and must appear exactly twice — `
    + "app.jwt_subject()'s body and app_authz's own policy.");

  // And no migration calls auth.uid() from a context that runs as a role we created: measured
  // 2026-09-06, schema auth is owned by supabase_admin and postgres holds USAGE without grant
  // option, so no migration of ours can grant it.
  const helperBodies = [...authzCode.matchAll(/create or replace function[\s\S]*?\$\$([\s\S]*?)\$\$/g)]
    .map((m) => m[1]).join('\n');
  assert.doesNotMatch(helperBodies, /auth\.uid\(\)/,
    'a helper owned by app_authz cannot call auth.uid(): it fails with 42501 on the SCHEMA, not the '
    + 'function, and no migration of ours can grant the privilege that would fix it.');
});

// ---------------------------------------------------------------------------
// Batch 021, statically. Same discipline as the two blocks above: what can be read from the
// migration text is read from it, the live half runs in CI through `make db-rls-smoke`, and the
// properties this batch's design rests on are pinned here because they are the ones a reviewer
// would otherwise have to hold in their head while reading a long file.

const SCOPE_MIGRATION = 'db/foundation/migrations/021_member_scope.sql';
const SCOPE_FIXTURE = 'tests/db/identity/fixtures/021-member-scope-fixture.sql';
const CI_WORKFLOW = '.github/workflows/ci.yml';

const scope = await readFile(SCOPE_MIGRATION, 'utf8');
const scopeCode = scope.replace(/--[^\n]*/g, '');
const SCOPE_TABLE = 'workspace_member_scopes';
const NARROWED_TABLES = ['business_profiles', 'business_profile_versions',
  'page_context_profiles', 'page_context_profile_versions'];
const SCOPE_HELPERS = ['member_scope_is_narrowed', 'member_scope_covers_business',
  'member_scope_covers_page', 'member_scope_admits_business', 'member_scope_admits_page'];

// The predicate the whole batch rests on, pinned character for character.
//
// It is pinned against the migration TEXT and not against `pg_get_expr(polqual, polrelid)`, which
// is how RFC-2026-020 §6.1/5 pins app_authz's policy — and the difference is a refusal rather than
// a shortcut. That literal was DERIVED FROM A MEASUREMENT: PostgreSQL 17.6's own deparser, read
// read-only off the provisioned instance. Nobody has deparsed this policy on any database, and
// writing a plausible-looking deparse here would be inventing a measurement, which is the one thing
// this repository refuses everywhere else. The text pin holds today; the catalog pin is owed to
// whoever first applies 021 somewhere a `pg_get_expr` can be read off.
const SCOPE_SELECT_PREDICATE = `using (
    user_id = (select auth.uid())
    and app.is_active_member(workspace_id)
  )`;

test('the scope table carries RLS, FORCE, a primary key, an owner comment and a policy', () => {
  assert.match(scopeCode, new RegExp(`create table (?:if not exists )?app\\.${SCOPE_TABLE}\\b`, 'i'));
  assert.match(scopeCode, new RegExp(`alter table app\\.${SCOPE_TABLE} enable row level security`, 'i'));
  assert.match(scopeCode, new RegExp(`alter table app\\.${SCOPE_TABLE} force row level security`, 'i'),
    `app.${SCOPE_TABLE}: ENABLE and FORCE are different catalog columns and the data package's own `
    + 'lint rule tests only the first, so ENABLE alone leaves the table owner exempt from every policy.');
  assert.match(scopeCode, new RegExp(`create table (?:if not exists )?app\\.${SCOPE_TABLE}[\\s\\S]{0,600}?primary key`, 'i'),
    `app.${SCOPE_TABLE}: no primary key`);
  assert.match(scope, new RegExp(`comment on table app\\.${SCOPE_TABLE} is`, 'i'));
  assert.match(scopeCode, new RegExp(`create policy \\w+ on app\\.${SCOPE_TABLE}\\b`, 'i'));
  assert.doesNotMatch(scopeCode, /\bto\s+anon\b/i, '§8.5: anonymous holds no tenant policy and no grant');
  for (const synonym of ['tenant_id', 'organization_id', 'org_id', 'brand_id', 'account_id', 'page_id']) {
    assert.doesNotMatch(scopeCode, new RegExp(`\\b${synonym}\\b`, 'i'),
      `§3.3 forbids the synonym ${synonym}`);
  }
  assert.match(scopeCode, new RegExp(`create table (?:if not exists )?app\\.${SCOPE_TABLE}[\\s\\S]{0,600}?workspace_id`, 'i'),
    `app.${SCOPE_TABLE} is tenant-owned and must carry workspace_id (§3.3)`);
});

test('batch 021 adds to the merged batches and rewrites none of them', () => {
  // Migration invariant 1, as a property of the file rather than as a sentence in its header: every
  // `drop policy if exists X` must be followed by this file's own `create policy X`. A batch that
  // dropped 010's, 011's or 020's policy would be rewriting an applied migration through the back
  // door, and the drop is the only statement in this file that could do it.
  const drops = [...scopeCode.matchAll(/drop policy if exists (\w+) on app\.(\w+)/g)].map((m) => m[1]);
  assert.ok(drops.length >= 10, 'the batch writes a policy set, not a token policy');
  for (const name of drops) {
    assert.match(scopeCode, new RegExp(`create policy ${name}\\b`),
      `${name} is dropped by batch 021 and not created by it, so the drop removes a policy another `
      + 'batch owns. A later batch adds to a merged one and never replaces it (migration invariant 1).');
  }
  assert.ok(!scopeCode.includes("(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid"),
    'the inlined platform identity expression belongs to batch 011 alone — scripts/db/run.mjs holds it '
    + 'to a count of exactly two, and every other reader uses (select auth.uid()) inside a policy or '
    + 'goes through a helper');
});

test('no batch 021 policy names a membership table, and every one is written TO authenticated', () => {
  const policies = [...scopeCode.matchAll(/create policy (\w+)([\s\S]*?);\n/g)];
  assert.ok(policies.length >= 10, 'one table with two policies, four narrowings and six editor cells');
  for (const [body, name] of policies.map((m) => [m[0], m[1]])) {
    // A policy ON the scope table names it in its own `on` clause; what must not appear is a JOIN.
    const inPredicate = body.replace(/create policy \w+\s+on\s+app\.\w+/, '');
    for (const table of ['app.workspace_members', 'app.workspace_member_scopes']) {
      assert.doesNotMatch(inPredicate, new RegExp(table.replace('.', '\\.')),
        `${name}: membership and member scope are read through helpers and never by joining the table `
        + 'from a policy (RFC-2026-020 §5/5). A join here would evaluate that scan AS THE CALLER, so the '
        + "read table's whole policy set would expand inside this one's evaluation and the width of this "
        + 'predicate would stop being a property of this file.');
    }
    assert.match(body, /\bto\s+authenticated\b/i, `${name}: §8.5 writes tenant policies TO authenticated`);
  }
  for (const [body, name] of policies.map((m) => [m[0], m[1]])) {
    if (/for\s+update/i.test(body)) {
      assert.match(body, /using/i, `${name}: an UPDATE policy needs USING`);
      assert.match(body, /with\s+check/i, `${name}: an UPDATE policy needs WITH CHECK`);
    }
    if (!/for\s+insert/i.test(body)) continue;
    assert.match(body, /created_by\s*=\s*\(select auth\.uid\(\)\)/,
      `${name}: without it a caller can write a row naming somebody else as its author — and on the `
      + 'scope table the actor and the subject are different people by design, so an unasserted '
      + 'created_by would let an owner forge the attribution of an authorization grant (§8.5, §8.6/8).');
  }
});

test("the policy the scope helpers read through is exactly the caller's own active rows", () => {
  const own = scopeCode.match(/create policy workspace_member_scopes_select_own([\s\S]*?);\n/);
  assert.ok(own, 'the policy the whole batch rests on is named and present');
  assert.match(own[0], /for\s+select\s+to\s+authenticated/i);
  assert.ok(own[0].includes(SCOPE_SELECT_PREDICATE),
    'the predicate is pinned character for character. It is the ONLY thing between a SECURITY INVOKER '
    + "scope helper and another member's scope rows, and widening it fails OPEN rather than closed: a "
    + "caller who could see a second member's rows would inherit whatever that member is scoped to, and "
    + 'a caller whose own rows were hidden would look unscoped and therefore unnarrowed. Expected:\n'
    + `${SCOPE_SELECT_PREDICATE}`);
  assert.match(own[0], /user_id = \(select auth\.uid\(\)\)/,
    'the caller conjunct is what makes every helper an answer about the caller');
  assert.match(own[0], /app\.is_active_member\(workspace_id\)/,
    '§7: only status=active grants access, read through the batch 011 helper');
});

test('the scope helpers are invoker-mode, pin an empty search_path, and call auth.uid() nowhere', () => {
  const functions = [...scopeCode.matchAll(/create or replace function (app\.\w+)\(([^)]*)\)([\s\S]*?)\$\$;/g)];
  assert.equal(functions.length, SCOPE_HELPERS.length, 'the batch writes the helper set it declares');
  for (const [body, name] of functions.map((m) => [m[0], m[1]])) {
    assert.ok(SCOPE_HELPERS.includes(name.replace('app.', '')), `${name} is not a declared scope helper`);
    assert.match(body, /set\s+search_path\s*=\s*''/i, `${name}: every object is resolved by its full name`);
    // The security mode is pinned in BOTH directions, which is not redundancy. The absence of
    // `definer` is what the batch's argument turns on; the presence of `invoker` is what makes it a
    // stated decision rather than an inherited default -- batch 011 writes out every attribute of
    // app_authz for the same reason, and this is the single most arguable line in this batch.
    assert.match(body, /security\s+invoker/i,
      `${name}: write the mode out. It is the default, and a reader who finds the keyword absent `
      + 'cannot tell a decision from an omission — which on this particular function is the whole '
      + 'question a reviewer is here to answer.');
    assert.doesNotMatch(body, /security\s+definer/i,
      `${name}: RFC-2026-020 §5/3 gives app_authz EXACTLY ONE policy, on app.workspace_members. A `
      + 'SECURITY DEFINER helper owned by that role reading a new table would need a second policy and a '
      + "grant outside the set §6.1/6 pins — refused by authzLint, refused by 011's own apply-time block "
      + 'on any re-apply, and an amendment to an approved decision that no batch may make. A definer '
      + 'helper owned by anyone ELSE would be owned by the table owner, which is exempt from the policies '
      + 'on a forced table and is the anti-pattern RFC-2026-017 §3 exists to prevent.');
    assert.doesNotMatch(body, /auth\.uid\(\)/,
      `${name}: a \`language sql\` body is re-parsed in the calling session, so auth.uid() there is `
      + 'resolved as the CALLER and needs USAGE on schema auth — which the CI shim grants to nobody and '
      + "which no migration of ours can grant on the platform (011's header, measured). The same call "
      + 'inside a POLICY is stored already resolved and needs only EXECUTE, which is why every policy in '
      + '010, 020 and 021 uses it and works. The identity lives in the policy; the helpers read what that '
      + 'policy leaves them.');
  }
  for (const helper of SCOPE_HELPERS) {
    assert.match(scopeCode, new RegExp(`revoke all on function app\\.${helper}\\([^)]*\\) from public`, 'i'),
      `app.${helper}: a helper reachable by PUBLIC is reachable by anon, which is granted nothing anywhere`);
    assert.match(scopeCode, new RegExp(`grant execute on function app\\.${helper}\\([^)]*\\) to authenticated`, 'i'),
      `app.${helper}: it is called from a policy written TO authenticated, and a policy's function call `
      + 'is evaluated as the caller, so the caller must hold EXECUTE');
  }
});

test('batch 021 leaves app_authz exactly as RFC-2026-020 approved it', () => {
  assert.doesNotMatch(scopeCode, /\bto\s+app_authz\b/i,
    'no grant and no policy names app_authz. §5/3 gives it exactly one policy and §6.1/6 pins its grants '
    + 'to USAGE on schema app plus four columns of app.workspace_members; a batch that added to either '
    + 'would be amending an approved decision by migration.');
  assert.doesNotMatch(scopeCode, /owner to app_authz/i, 'batch 021 gives app_authz no new function to own');
  // And the claim is executed, not only grepped: the file asserts the policy count against the live
  // catalog AFTER it has run, which is the half 011's own block cannot reach.
  assert.match(scopeCode, /app_authz holds % policies in schema app/,
    '021 re-asserts RFC-2026-020 §5/3 at apply time, on the other side of itself. 011 asserts it before '
    + 'this file exists, which says nothing about what this file did.');
  assert.match(scopeCode, /pg_catalog\.pg_roles/,
    'pg_roles and never pg_authid: pg_authid is readable only by a superuser, and a migration that needs '
    + 'one to apply cannot be applied on the platform it targets (batch 020 found this)');
  assert.doesNotMatch(scopeCode, /pg_authid/,
    'a migration that reads pg_authid passes in CI and fails on the platform, where postgres is not a superuser');
});

test('the narrowing is RESTRICTIVE, covers all four batch 020 tables, and asks the right question', () => {
  const restrictive = [...scopeCode.matchAll(/create policy (\w+) on app\.(\w+)\s*\n\s*as restrictive([\s\S]*?);\n/g)];
  assert.equal(restrictive.length, 4,
    'four tables were granted Business/Page SELECT by batch 020 and all four have to be narrowed. A '
    + 'version row holds what a Business or Page USED TO SAY, so a narrowing that stopped at the current '
    + 'rows would leave the history of an out-of-scope Business readable — the quietest possible leak.');
  assert.deepEqual(restrictive.map((m) => m[2]).sort(), [...NARROWED_TABLES].sort());
  for (const [body, name, table] of restrictive.map((m) => [m[0], m[1], m[2]])) {
    assert.match(body, /for\s+all\s+to\s+authenticated/i,
      `${name}: one policy per table, FOR ALL, so the scope rule has one home per table rather than four`);
    assert.match(body, /using/i, `${name}: needs USING, which narrows SELECT, UPDATE and DELETE`);
    assert.match(body, /with\s+check/i, `${name}: needs WITH CHECK, or a scoped member can INSERT outside their scope`);
    assert.match(body, /app\.member_scope_admits_(business|page)\(/,
      `${name}: a Y operation is narrowed by scope WHERE SCOPE EXISTS, which is member_scope_admits_*. `
      + 'Using member_scope_covers_* here would deny every member who holds no scope row — every owner, '
      + 'admin and viewer in the fixture — which is the reading batch 021 rejected in its header.');
    assert.ok(NARROWED_TABLES.includes(table));
  }
  assert.equal([...scopeCode.matchAll(/as restrictive/gi)].length, 4,
    'exactly the four narrowing policies are restrictive. A permissive policy with the same predicate '
    + 'would WIDEN each table instead of narrowing it — a member would see everything their scope admits '
    + 'OR their membership admits, which is what batch 020 already does — and §12.6/2 would silently stop '
    + 'being implemented.');
});

test('the editor P asks for an EXPLICIT scope, which is what keeps it from being a Y', () => {
  const editorPolicies = [...scopeCode.matchAll(/create policy (\w+_scoped_editor) on app\.(\w+)([\s\S]*?);\n/g)];
  assert.equal(editorPolicies.length, 6,
    'the editor cell covers INSERT and UPDATE on both current tables and INSERT on both version tables, '
    + "which is 020's reading of §8.1: the producing operation is granted and only mutation of its record "
    + 'is denied');
  for (const [body, name] of editorPolicies.map((m) => [m[0], m[1]])) {
    assert.match(body, /app\.workspace_member_role\(workspace_id\) = 'editor'/,
      `${name}: §8.1 marks the editor P and owner and admin Y; the two Y cells are batch 020's policies `
      + 'and this one must not restate them, or the distinction the refusal protected is gone');
    assert.match(body, /app\.member_scope_covers_(business|page)\(/,
      `${name}: \`covers\`, never \`admits\`. P is "ผ่านตาม policy/EXPLICIT capability" and an absent `
      + 'scope row is not explicit, so an editor who has never been scoped must gain nothing from this '
      + 'batch. `admits` answers true for exactly that member and would ship the unconditional editor '
      + 'grant batch 020 refused to write.');
    for (const role of ['owner', 'admin', 'approver', 'viewer']) {
      assert.doesNotMatch(body, new RegExp(`'${role}'`),
        `${name}: §8.1 gives this cell to the editor conditionally and to owner and admin outright. `
        + "Naming another role here would either restate batch 020's policy or invent a grant.");
    }
  }
  const pageInsert = scopeCode.match(/create policy page_context_profiles_insert_scoped_editor([\s\S]*?);\n/);
  assert.ok(pageInsert);
  assert.match(pageInsert[0], /archived_at is null/,
    '§11.3: "archive closes new creation under a Business". Batch 020 refuses a Page under an archived '
    + 'Business; a permissive policy added later ORs past that unless it repeats the clause.');
});

test('a member scope can be created and not silently mutated, and the absence is at the grant layer', () => {
  assert.match(scopeCode, new RegExp(`grant select \\([\\s\\S]*?\\)\\s*on app\\.${SCOPE_TABLE} to authenticated`, 'i'),
    'the client SELECT grant is column-scoped');
  assert.match(scopeCode, new RegExp(`grant insert \\([\\s\\S]*?\\)\\s*on app\\.${SCOPE_TABLE} to authenticated`, 'i'),
    'the client INSERT grant is column-scoped, and it is what makes the editor refusal a POLICY refusal');
  for (const role of ['authenticated', 'app_worker', 'app_command', 'app_maintenance', 'anon', 'app_authz']) {
    assert.doesNotMatch(scopeCode,
      new RegExp(`grant[^;]*\\b(update|delete)\\b[^;]*on app\\.${SCOPE_TABLE} to ${role}`, 'i'),
      `app.${SCOPE_TABLE}: ${role} must hold neither UPDATE nor DELETE. §8.5 forbids a broad user delete `
      + 'and requires a soft delete through a typed lifecycle field; no document names one for this row, '
      + 'so batch 021 grants neither rather than inventing the field. The absence is what makes the '
      + 'refusal a privilege-layer denial the isolation suite can attribute to this table by name.');
  }
  assert.match(scopeCode, new RegExp(`grant select, insert on app\\.${SCOPE_TABLE} to app_worker`, 'i'),
    `app.${SCOPE_TABLE}: app_worker holds the two verbs a client holds and no policy, which is what makes `
    + '"denied by RLS" and "denied by a missing grant" tell apart (RFC-2026-017 §7)');
  for (const grant of scopeCode.matchAll(/grant update \(([^)]*)\) on app\.(\w+)/gi)) {
    assert.notEqual(grant[2], SCOPE_TABLE, `app.${SCOPE_TABLE} has no updatable column in this batch`);
  }
});

test("the scope types are §7's three, and each one is tied to the shape it implies", () => {
  assert.match(scopeCode, /check \(scope_type in \('all_businesses', 'business', 'page'\)\)/,
    '§7 names three scope types and this is all three, as text + a named CHECK (§3.2). A fourth value '
    + 'would be a scope nothing resolves and a missing one would be a scope nobody can write.');
  // Without this, a row could claim one scope and carry the target of another — and the helpers read
  // the claim and the target from the same row.
  assert.match(scopeCode, /workspace_member_scopes_shape_matches_type check/);
  assert.match(scopeCode, /scope_type = 'all_businesses'\s*\n?\s*and business_profile_id is null and page_context_profile_id is null/);
  // §3.3's composite foreign keys: a scope row cannot name a member, a Business or a Page from another
  // Workspace, and the refusal is the constraint rather than a policy (§4 invariant 10).
  assert.match(scopeCode, /foreign key \(workspace_id, user_id\)\s*\n?\s*references app\.workspace_members \(workspace_id, user_id\)/i);
  assert.match(scopeCode, /foreign key \(workspace_id, business_profile_id\)\s*\n?\s*references app\.business_profiles \(workspace_id, id\)/i);
  assert.match(scopeCode, /foreign key \(workspace_id, business_profile_id, page_context_profile_id\)\s*\n?\s*references app\.page_context_profiles \(workspace_id, business_profile_id, id\)/i);
  // NULLS NOT DISTINCT, because two all_businesses rows for one member carry two nulls and the default
  // spelling treats them as different rows — so the constraint would hold for the scope types whose
  // targets are set and silently not hold for the one whose targets are empty.
  assert.match(scopeCode, /unique nulls not distinct/i);
});

test('the deferred foreign key §6 reserves in this batch is refused, and the refusal is stated', () => {
  assert.doesNotMatch(scopeCode, /current_version_id/i,
    'a current_version_id pointer would be a second source of truth for "which version is latest", beside '
    + 'a version_number that is already unique per parent; nothing in this schema could keep it true, '
    + 'because no command function writes the current row and its version in one transaction; and a '
    + 'DEFERRABLE constraint is checked only at COMMIT, so RLS cannot enforce it. §5 names no such column.');
  assert.doesNotMatch(scopeCode, /deferrable/i, 'no constraint in this batch is deferred');
  assert.match(scope, /THE DEFERRED FOREIGN KEY: NOT ADDED/,
    'a registry row mentioning a constraint is not a requirement for one, but declining it silently would '
    + 'leave the next reader to rediscover the question');
});

test('the batch 021 fixture writes only catalog identities and carries both scope states', async () => {
  const known = new Set(Object.values(JSON.parse(await readFile(CATALOG, 'utf8')).identities).map((e) => e.uuid));
  const fixture = (await readFile(SCOPE_FIXTURE, 'utf8')).replace(/--[^\n]*/g, '');
  const used = new Set([...fixture.matchAll(UUID)].map((m) => m[0]));
  assert.ok(used.size > 0, 'the fixture must actually load rows');
  for (const value of used) {
    assert.ok(known.has(value), `the fixture writes ${value}, which is not a catalog identity. A fixture `
      + 'id nobody can recompute is an unverifiable constant.');
  }
  for (const symbol of ['user_page_editor_a', 'page_a1_sibling', 'user_editor_a', 'user_viewer_a',
    'user_suspended_a', 'user_owner_b', 'business_a1', 'page_a1', 'business_b1']) {
    assert.ok(used.has(id(symbol)), `the fixture must load ${symbol}`);
  }
  // BOTH STATES, or the reading of §7 this batch had to choose is untested. user_owner_a must NOT be
  // scoped — it is the control for "a member with no row is not narrowed" — and the other identities
  // must be, including the suspended one, whose row exists precisely so that
  // `suspended-a-sees-zero-scope-rows` is about a policy and not about an empty table.
  const scopeInsert = fixture.match(/insert into app\.workspace_member_scopes[\s\S]*?on conflict/);
  assert.ok(scopeInsert, 'the fixture writes scope rows');
  assert.doesNotMatch(scopeInsert[0], new RegExp(`'${id('user_owner_a')}',\\s*\\n?\\s*'(all_businesses|business|page)'`),
    'user_owner_a holds NO scope row. It is the unscoped control the whole batch is checked against, and '
    + '`owner-a-is-unscoped-and-sees-business-a2` asserts what that means.');
  for (const symbol of ['user_editor_a', 'user_approver_a', 'user_viewer_a', 'user_suspended_a',
    'user_page_editor_a', 'user_owner_b']) {
    assert.ok(scopeInsert[0].includes(id(symbol)), `${symbol} must hold a scope row`);
  }
  for (const type of ['all_businesses', 'business', 'page']) {
    assert.match(scopeInsert[0], new RegExp(`'${type}'`), `§7's ${type} scope has no row, so nothing exercises it`);
  }
  // Idempotent on the CONSTRAINT rather than on an inferred column list: the unique index is NULLS NOT
  // DISTINCT over five columns, three of which are null on some rows, and inference there is exactly
  // where a re-run would quietly insert a second copy instead of doing nothing.
  assert.match(fixture, /on conflict on constraint workspace_member_scopes_one_per_target do nothing/);
});

// The CI negative control, which is the one guard in this repository a new table can silently walk
// past. The step's own comment says so: "Adding a batch means adding a control, and nothing yet fails
// the build when someone forgets."
//
// This does not close that gap in general — deciding what a "table family" is, for every table in
// every future batch, is a rule A0 owns and is not derivable from a migration's text. It closes it for
// the table this batch adds, which is the half batch 021 can be held to.
test('the table batch 021 adds has its own entry in the CI negative control', async () => {
  const workflow = await readFile(CI_WORKFLOW, 'utf8');
  const controls = [...workflow.matchAll(/^\s*control\s+app\.(\w+)\s+'([^']+)'\s+(\d+)/gm)];
  assert.ok(controls.length >= 4, 'the control runs per table family, one entry per family');

  const forScopeTable = controls.find(([, table]) => table === SCOPE_TABLE);
  assert.ok(forScopeTable, `app.${SCOPE_TABLE} has no negative-control entry. The step disables row level `
    + "security on one table and requires a failed case whose id matches that table's pattern; a batch "
    + "that adds a table and no entry widens the gap the step's own blocker names, and its number keeps "
    + 'being reported as though it covered everything.');
  assert.equal(forScopeTable[3], '021', 'the entry is attributed to the batch that owes it');

  // The pattern has to match a case that ACTUALLY FAILS when RLS is off on this table, or the entry is
  // satisfied by any regression anywhere. With the scope table unprotected every caller sees every
  // scope row — including user_viewer_a's all_businesses row — so a narrowed member stops being
  // narrowed and a suspended member starts seeing rows.
  const pattern = new RegExp(`^${forScopeTable[2]}`);
  const detectable = cases.filter((c) => pattern.test(c.id) && ['no-rows', 'no-effect'].includes(c.expect));
  assert.ok(detectable.length >= 2,
    `no case whose id matches /${forScopeTable[2]}/ would fail with row level security disabled on `
    + `app.${SCOPE_TABLE}. A control naming a pattern nothing matches reports a pass it did not earn.`);
  assert.ok(detectable.some((c) => c.id === 'suspended-a-sees-zero-scope-rows'),
    'the suspended-member case is the sharpest of them: the fixture gives that identity a scope row on '
    + 'purpose, so with RLS off it sees one');

  // Every table the control names must exist in the migration set, so a renamed table takes its control
  // with it instead of leaving an entry that disables nothing.
  //
  // A2 KNOWLEDGE CORRECTION, batch 040. This list was four filenames written by hand, so a batch that
  // added a table AND its control entry failed here — the rule read "every table the control names is
  // created by one of these four migrations" rather than "by A migration", which is what it says it
  // checks. The directory is read instead, which is the shape batch 030's allowlist scan already uses
  // for the same reason: a rule about the migration SET must be derived from the set.
  const migrationNames = (await readdir('db/foundation/migrations')).filter((n) => n.endsWith('.sql')).sort();
  assert.ok(migrationNames.length >= 10, 'the whole migration set is read, not a list somebody maintains');
  const migrations = await Promise.all(migrationNames
    .map((name) => readFile(`db/foundation/migrations/${name}`, 'utf8')));
  const created = new Set(migrations.flatMap((sql) =>
    [...sql.replace(/--[^\n]*/g, '').matchAll(/create table (?:if not exists )?app\.(\w+)/g)].map((m) => m[1])));
  for (const [, table] of controls) {
    assert.ok(created.has(table), `the negative control disables row level security on app.${table}, which `
      + 'no migration creates — so that entry runs against nothing and its "the suite failed" is about '
      + 'some other table');
  }
});

// The case batch 020 wrote in order to be changed, and the change.
test('the case that asserted the un-narrowed state is gone and its replacement asserts the narrowing', () => {
  const ids = new Set(cases.map((c) => c.id));
  assert.ok(!ids.has('editor-a-sees-business-a2-until-batch-021'),
    'batch 020 asserted the wider state POSITIVELY so that narrowing it would change a test in a diff. It '
    + 'has been narrowed, so the case must not still be here claiming the editor sees business_a2.');

  const replacement = cases.find((c) => c.id === 'editor-a-scope-does-not-reach-business-a2');
  assert.ok(replacement, 'the replacement must exist and be findable by name, not merely implied by the '
    + 'absence of the old one — a case deleted and not replaced is a claim that stopped being checked, '
    + 'which is exactly what batch 020 wrote the original to prevent');
  assert.equal(replacement.expect, 'no-rows');
  assert.deepEqual(replacement.covers, ['§12.6/2', '§8.6/3'],
    'it carries the two labels the original carried as "-partial" and "-pending-021", now unqualified');

  // And the pair that stops the new negative from being satisfied by business_a2 becoming unreadable.
  for (const control of ['owner-a-is-unscoped-and-sees-business-a2',
    'viewer-a-all-businesses-scope-still-sees-business-a2']) {
    const positive = cases.find((c) => c.id === control);
    assert.ok(positive, `${control} is missing`);
    assert.equal(positive.expect, 'rows',
      `${control}: a narrowing asserted only by negatives is indistinguishable from a policy that hides `
      + 'the row from everybody, which would be a much worse batch shipping under the same test names');
  }

  // §8.6 cases 3 and 4 were recorded as owed by this batch. Both are now carried by cases, in both
  // directions, and the coverage map says so — which the citation check above holds it to.
  for (const label of ['§8.6/3', '§8.6/4']) {
    const cited = cases.filter((c) => (c.covers ?? []).includes(label));
    assert.ok(cited.some((c) => ['no-rows', 'denied', 'no-effect'].includes(c.expect)),
      `${label} needs the denial it is about`);
    assert.ok(cited.some((c) => c.expect === 'rows'),
      `${label} needs the positive that makes its denial mean something: without it the case is `
      + 'satisfied by a policy that hides the row from everybody, or by a fixture that never loaded it');
  }
  for (const key of [3, 4]) {
    assert.match(String(AUTHORIZATION_CASE_COVERAGE[key]), /COVERED BY BATCH 021/,
      `§8.6 case ${key} was recorded as owed by batch 021 and the map must say what happened to it`);
  }
});

// ---------------------------------------------------------------------------
// Batch 030, statically. Same discipline as the blocks above: what can be read from the migration
// text is read from it, and the live half runs in CI through `make db-rls-smoke`.
//
// This batch is the first with tables that belong to NO TENANT, so two of the properties asserted
// here have no counterpart earlier in the file: that the global catalog is reachable by nobody on
// the request path, and that no migration anywhere has quietly made it reachable.

const INDUSTRY_MIGRATION = 'db/foundation/migrations/030_industry.sql';
const INDUSTRY_FIXTURE = 'tests/db/identity/fixtures/030-industry-fixture.sql';
const industry = await readFile(INDUSTRY_MIGRATION, 'utf8');
const industryCode = industry.replace(/--[^\n]*/g, '');
// The two that belong to no workspace, and the one that does. Almost every assertion below splits
// on that line, which is the whole reason this batch needed its own block.
const GLOBAL_TABLES = ['industry_packs', 'industry_pack_versions'];
const ASSIGNMENT_TABLE = 'industry_assignments';
const INDUSTRY_TABLES = [...GLOBAL_TABLES, ASSIGNMENT_TABLE];
// The roles a client request can arrive as. `app_worker` is deliberately not one of them: it holds
// a grant on the global tables ON PURPOSE, so that the service denial is attributable to row level
// security rather than to a forgotten GRANT (batch 010's shape).
const CLIENT_ROLES = ['authenticated', 'anon'];

test('every table batch 030 creates carries RLS, FORCE, a primary key and an owner comment', () => {
  for (const table of INDUSTRY_TABLES) {
    assert.match(industryCode, new RegExp(`create table (?:if not exists )?app\\.${table}\\b`, 'i'));
    assert.match(industryCode, new RegExp(`alter table app\\.${table} enable row level security`, 'i'));
    assert.match(industryCode, new RegExp(`alter table app\\.${table} force row level security`, 'i'),
      `app.${table}: ENABLE and FORCE are different catalog columns and the data package's own lint `
      + 'rule tests only the first. On the two GLOBAL tables FORCE is doing more work than usual, not '
      + 'less: they carry no policy at all, so ENABLE plus FORCE is the whole of what makes every '
      + 'non-bypassing role — including the table owner — read zero rows.');
    assert.match(industryCode, new RegExp(`create table (?:if not exists )?app\\.${table}[\\s\\S]{0,900}?primary key`, 'i'),
      `app.${table}: no primary key`);
    assert.match(industry, new RegExp(`comment on table app\\.${table} is`, 'i'));
  }
  // §3.3's synonyms are forbidden outright, and `page_id` is forbidden by name. This batch has no
  // Page level at all — §4's ERD hangs INDUSTRY_ASSIGNMENT off BUSINESS_PROFILE and nothing else.
  for (const synonym of ['tenant_id', 'organization_id', 'org_id', 'brand_id', 'account_id', 'page_id']) {
    assert.doesNotMatch(industryCode, new RegExp(`\\b${synonym}\\b`, 'i'),
      `§3.3 forbids the synonym ${synonym}`);
  }
  // The tenant table carries the canonical scope. The GLOBAL ones must NOT: §3.3 requires the field
  // on "ทุก tenant-owned row", and a workspace_id on a catalog row would be a scope column with
  // nothing to scope — and the first policy that read it would narrow a catalog by a tenant that
  // does not own it.
  assert.match(industryCode, new RegExp(`create table (?:if not exists )?app\\.${ASSIGNMENT_TABLE}[\\s\\S]{0,900}?workspace_id`, 'i'),
    `app.${ASSIGNMENT_TABLE} is tenant-owned and must carry workspace_id (§3.3)`);
  for (const table of GLOBAL_TABLES) {
    const body = industryCode.match(new RegExp(`create table (?:if not exists )?app\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'));
    assert.ok(body, `app.${table}: the table definition must be findable`);
    assert.doesNotMatch(body[1], /workspace_id/i,
      `app.${table} is GLOBAL. §5 scopes this family "global/business" and §3.3 asks for the canonical `
      + 'scope field on tenant-owned rows only, so a workspace_id here would be a tenant boundary '
      + 'asserted about a row that has none — and every case in the suite about this table would then '
      + 'be measuring the wrong thing.');
  }
});

// THE EMPTY READ ALLOWLIST, AS A TEST.
//
// RFC-2026-012 §2 puts every direct client read behind a named `security_invoker` view and §3 starts
// that allowlist empty, growing "by RFC, not by a pull request". §9.1 classifies the published
// industry catalog PUBLIC-0 with "Client projection: allowed" — which licenses the CONTENT and names
// no object, no tier and no mechanism, while RFC-2026-012 names all three and sits at position 1 of
// CONTRIBUTING_AGENTS.md's conflict order.
//
// So this scans EVERY migration, not just 030's. The allowlist is a property of the schema rather
// than of one file, and a later batch granting the read is exactly the event this must notice.
//
// IT IS EXPECTED TO FAIL ONE DAY, AND THAT IS WHY IT LIVES HERE RATHER THAN IN 030's APPLY-TIME
// BLOCK. Batch 011 asserted app_authz's policy count at apply time and batch 021 had to route around
// it, because amending the assertion would have made an APPLIED migration's self-assertion false. An
// allowlist exists in order to grow; the batch that lands the RFC edits this test, in a diff a
// reviewer reads, and adds the negative-control entry and the cases beside it.
test('the industry pack catalog is not on the client read allowlist, and no migration puts it there', async () => {
  const files = await readdir('db/foundation/migrations');
  const migrations = await Promise.all(files.filter((n) => n.endsWith('.sql')).sort()
    .map(async (name) => [name, (await readFile(`db/foundation/migrations/${name}`, 'utf8')).replace(/--[^\n]*/g, '')]));
  assert.ok(migrations.length >= 9, 'the whole migration set is read, not one file');

  for (const [name, sql] of migrations) {
    for (const table of GLOBAL_TABLES) {
      for (const role of CLIENT_ROLES) {
        assert.doesNotMatch(sql, new RegExp(`grant\\s[^;]*\\bon\\s+app\\.${table}\\b[^;]*\\bto\\s[^;]*\\b${role}\\b`, 'i'),
          `${name} grants ${role} a privilege on app.${table}. RFC-2026-012 §3 says the read allowlist `
          + 'starts empty and each entry is added BY RFC, not by a pull request — and §2 says a client '
          + 'read goes through a named security_invoker view and never a base table. If an RFC has '
          + 'approved this entry, edit this test and name it, add the CI negative-control entry the '
          + 'grant makes possible, and add the cases that would now be about a policy rather than about '
          + 'a missing privilege.');
      }
    }
    // A `security_invoker` view over these tables IS the allowlist entry — the allowlist is the set
    // of such views — so one appearing without the RFC is the same finding wearing the other shape.
    for (const view of sql.matchAll(/create\s+(?:or\s+replace\s+)?view[\s\S]*?;/gi)) {
      assert.doesNotMatch(view[0], /industry_pack/i,
        `${name} creates a view over the industry pack catalog. That view is the allowlist entry `
        + 'RFC-2026-012 §3 reserves to an RFC.');
    }
  }

  // And the measured state agrees with the decision, which is what stops this from being a rule
  // about text alone: the provisioned instance holds no exposed view of any kind.
  const snapshot = JSON.parse(await readFile('db/foundation/lint/catalog-snapshot.json', 'utf8'));
  assert.deepEqual(snapshot.catalog.exposed_views, [],
    'the allowlist is empty in the catalog as well as in the migrations. A view measured here that no '
    + 'RFC named would be the same finding from the other direction.');

  // The refusal is stated in the migration rather than left to be inferred from an absence, because
  // 010's own rule is that a forced table with no policy must be a decision in the file.
  assert.match(industry, /NOTHING IS WRITTEN FOR app\.industry_packs OR app\.industry_pack_versions/,
    'a forced table with no policy is unreachable by every client role, and an absence is not a '
    + 'decision until somebody writes down that it is one');
  assert.match(industry, /RFC-2026-012/,
    'the batch names the decision it is obeying, so a reader can disagree with the reading rather '
    + 'than with the silence');
});

test('the industry catalog carries no policy, and the assignment carries the whole §8.1 set', () => {
  for (const table of GLOBAL_TABLES) {
    assert.doesNotMatch(industryCode, new RegExp(`create policy \\w+ on app\\.${table}\\b`, 'i'),
      `app.${table}: §8's four matrices contain no row for an industry pack anywhere, so there is no `
      + 'cell to implement and a policy here would be a permission nobody reviewed against a caller. '
      + 'The refusal is deny-by-default reaching the privilege layer, which the isolation cases assert '
      + 'as `deniedBy: grant`.');
  }
  const policies = [...industryCode.matchAll(new RegExp(`create policy (\\w+) on app\\.${ASSIGNMENT_TABLE}([\\s\\S]*?);\\n`, 'g'))];
  assert.equal(policies.length, 6,
    'select for every active member, insert and update for owner-or-admin, insert and update for a '
    + 'scoped editor, and one restrictive narrowing. Six, because §8.1 has exactly two Business rows '
    + 'and the editor cell is conditional.');
  for (const [body, name] of policies.map((m) => [m[0], m[1]])) {
    assert.match(body, /\bto\s+authenticated\b/i, `${name}: §8.5 writes tenant policies TO authenticated`);
    // RFC-2026-020 §5/5: membership and member scope are read through the helpers and never by
    // joining the tables, because a join would evaluate that scan AS THE CALLER and the width of this
    // table's visibility would become a function of a policy set belonging to another module.
    for (const table of ['app.workspace_members', 'app.workspace_member_scopes']) {
      assert.doesNotMatch(body, new RegExp(table.replace('.', '\\.')),
        `${name}: membership and member scope are read through helpers, never by joining the table`);
    }
    if (/for\s+update/i.test(body)) {
      assert.match(body, /using/i, `${name}: an UPDATE policy needs USING`);
      assert.match(body, /with\s+check/i, `${name}: an UPDATE policy needs WITH CHECK, or a row admitted by USING could be updated out of the scope that admitted it`);
    }
    if (!/for\s+insert/i.test(body)) continue;
    assert.match(body, /created_by\s*=\s*\(select auth\.uid\(\)\)/,
      `${name}: §8.5 requires a user action to assert created_by = auth.uid(), or a caller can write a `
      + 'row naming somebody else as its author (§8.6/8)');
    assert.match(body, /archived_at is null/,
      `${name}: §11.3 — "archive closes new creation under a Business". BOTH insert policies carry the `
      + 'clause, because a permissive policy ORs and one that omitted it would let its role do the one '
      + 'thing the other was written to prevent.');
  }
  // Deny-by-default means the absences matter as much as the policies.
  assert.doesNotMatch(industryCode, /create\s+policy[\s\S]{0,300}?\bfor\s+delete\b/i,
    '§8.5: there is no broad user delete. Un-pinning a Business is owed to whichever batch names the '
    + 'typed lifecycle field this row does not have.');
  assert.doesNotMatch(industryCode, /\bto\s+anon\b/i,
    '§8.5 gives anonymous no tenant policy, and a PUBLIC-0 catalog is the one family somebody might '
    + 'propose exposing anonymously — which is a security decision with an owner, not a grant a batch '
    + 'makes because the row is classified public');
});

test('a published pack version is immutable to every role, as absent grants and absent policies', () => {
  const versions = 'industry_pack_versions';
  // Three expressions of one rule, which is 020's form: no updated_at to stamp, no grant, no policy.
  const body = industryCode.match(new RegExp(`create table (?:if not exists )?app\\.${versions}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'));
  assert.ok(body);
  assert.doesNotMatch(body[1], /updated_at/i,
    `app.${versions}: an immutable row has no update to stamp, and §3.2 requires updated_at only of a `
    + 'MUTABLE row. A column here would be the first sentence of an immutable table contradicting '
    + 'itself.');
  assert.doesNotMatch(industryCode, new RegExp(`create trigger set_updated_at before update on app\\.${versions}`, 'i'),
    `app.${versions}: no trigger, because there is no column and no update`);
  for (const role of ['authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz']) {
    assert.doesNotMatch(industryCode,
      new RegExp(`grant[^;]*\\b(update|delete)\\b[^;]*on app\\.${versions}[^;]*to [^;]*${role}`, 'i'),
      `app.${versions}: ${role} must hold neither UPDATE nor DELETE. §8.1's only \`N\` in the SERVICE `
      + 'column is immutable version UPDATE/DELETE, and the industry pack contract says a published '
      + 'version is changed only by publishing a new one. An absent grant has to be granted; a policy '
      + 'can be widened by an edit.');
  }
  assert.match(industryCode, new RegExp(`grant select on app\\.${versions} to app_worker`, 'i'),
    `app.${versions}: app_worker holds SELECT and no policy, which is what makes the service's empty `
    + 'read attributable to row level security rather than to a forgotten GRANT — and it is the one '
    + 'grant the CI negative control for this table rests on');
  // And the claim is executed rather than only grepped: the apply-time block walks the whole grid of
  // roles against the live ACLs, which catches a grant made by a LATER batch that would not appear in
  // this file at all.
  assert.match(industryCode, /a published pack version can be updated or deleted/,
    '030 asserts its own immutability at apply time, against whatever database receives it');
  assert.match(industryCode, /the published version table carries an UPDATE or DELETE policy/,
    'both halves: a policy with no grant is inert, and a grant with no policy is denied by RLS instead '
    + 'of by privilege, which is a weaker refusal than immutability asks for');
});

test('the assignment pins a global row, is zero-or-one per Business, and cannot move across scope', () => {
  // §4's ERD: BUSINESS_PROFILE ||--o| INDUSTRY_ASSIGNMENT. Zero or one, as a constraint rather than a
  // convention — and it is also the pair every isolation case addresses an assignment through.
  assert.match(industryCode, /unique \(workspace_id, business_profile_id\)/i,
    '§4\'s ERD makes an industry assignment zero-or-one per Business');
  // §3.3's composite foreign key into the tenant parent, over the whole scope path.
  assert.match(industryCode,
    /foreign key \(workspace_id, business_profile_id\)\s*\n?\s*references app\.business_profiles \(workspace_id, id\)/i,
    'the tenant parent is referenced by the WHOLE scope pair, so an unrelated Workspace/Business pair '
    + 'fails at the database with 23503 for every caller including one the policy would admit (§4 '
    + 'invariant 10)');
  // And the GLOBAL parent by a single column, which is the difference this batch had to reason about
  // rather than copy: there is no shared scope column for a composite key to compare.
  assert.match(industryCode, /industry_pack_version_id\s+uuid\s+not null references app\.industry_pack_versions \(id\)/i,
    'a global parent has no tenant column to agree with, so its foreign key is single-column — stated '
    + 'here so that the asymmetry with the line above is a decision rather than an oversight');
  assert.doesNotMatch(industryCode, /industry_pack_id\s+uuid[\s\S]{0,80}?references app\.industry_packs \(id\)[\s\S]{0,400}?create table/i,
    'the assignment does not denormalise the pack: a version determines its pack, so a second column '
    + 'would be a second source of truth for a fact the foreign key already fixes');
  // §8.5, and the two columns that carry it.
  for (const grant of industryCode.matchAll(/grant update \(([^)]*)\) on app\.(\w+)/gi)) {
    assert.doesNotMatch(grant[1], /workspace_id/i, `app.${grant[2]}: workspace_id is not updatable`);
    assert.doesNotMatch(grant[1], /business_profile_id/i,
      `app.${grant[2]}: business_profile_id is not updatable — an assignment changing Business is a row `
      + 'moving across scope, which §8.5 forbids an update to do');
  }
  assert.match(industryCode, /a scope column of app\.industry_assignments is updatable/,
    'and the same claim against the live ACL at apply time, per column, because a grant made by a '
    + 'later batch would not appear in this file');
  assert.match(industryCode, /an industry assignment can be deleted through a granted path/,
    'no role holds DELETE, asserted at apply time as well as by the absent grant');
});

test('the editor P asks for an EXPLICIT scope, and the narrowing on the new table is RESTRICTIVE', () => {
  const editorPolicies = [...industryCode.matchAll(/create policy (\w+_scoped_editor) on app\.(\w+)([\s\S]*?);\n/g)];
  assert.equal(editorPolicies.length, 2,
    'the editor cell covers INSERT and UPDATE on the one table this batch offers a client write');
  for (const [body, name] of editorPolicies.map((m) => [m[0], m[1]])) {
    assert.match(body, /app\.workspace_member_role\(workspace_id\) = 'editor'/,
      `${name}: §8.1 marks the editor P and owner and admin Y; restating the two Y cells here would `
      + 'delete the distinction the conditional grant exists to keep');
    assert.match(body, /app\.member_scope_covers_business\(/,
      `${name}: \`covers\`, never \`admits\`. P is "ผ่านตาม policy/EXPLICIT capability" and an absent `
      + 'scope row is not explicit, so an editor who has never been scoped must gain nothing from this '
      + 'batch. `admits` answers true for exactly that member and would ship the unconditional editor '
      + 'grant batch 020 refused to write.');
    for (const role of ['owner', 'admin', 'approver', 'viewer']) {
      assert.doesNotMatch(body, new RegExp(`'${role}'`), `${name}: naming another role restates or invents a grant`);
    }
  }
  const restrictive = [...industryCode.matchAll(/create policy (\w+) on app\.(\w+)\s*\n\s*as restrictive([\s\S]*?);\n/g)];
  assert.equal(restrictive.length, 1,
    'one narrowing, on the one tenant table. The global tables have no member scope to narrow by: a '
    + 'scope row names a Business or a Page, and a catalog row is neither.');
  assert.equal(restrictive[0][2], ASSIGNMENT_TABLE);
  assert.match(restrictive[0][0], /for\s+all\s+to\s+authenticated/i,
    'FOR ALL, so the scope rule has ONE home on this table rather than one per permissive policy — and '
    + 'a seventh policy added by a later batch is ANDed with it automatically instead of being a '
    + 'seventh place to forget it');
  assert.match(restrictive[0][0], /app\.member_scope_admits_business\(workspace_id, business_profile_id\)/,
    '`admits`, never `covers`: §8\'s legend reads Y as "active + capability + scope ตรง", so an '
    + 'operation granted to every role is narrowed by scope WHERE ONE EXISTS and not where none does. '
    + '`covers` here would deny every member holding no scope row — every owner, admin and unscoped '
    + 'viewer in the fixture — which is the reading batch 021 rejected in its own header.');
  assert.match(industryCode, /carries % restrictive policies and batch 030 writes exactly one/,
    'and the count is re-asserted at apply time, because polpermissive is the one catalog column that '
    + 'tells a narrowing from a widening');
});

test("the industry pack contract's stable ids are constrained rather than merely documented", () => {
  // A rule stated in a document and not in a constraint is a rule the database does not have. Each of
  // these is a sentence of the industry pack contract with a CHECK behind it.
  assert.match(industryCode, /check \(pack_id ~ '\^\[a-z0-9\]\+\(\[\.-\]\[a-z0-9\]\+\)\*\$'\)/,
    'the stable ID rule is lowercase ASCII with dots and hyphens, and it is also the seed\'s stable '
    + 'key (§6 invariant 5) — an id that broke every consumer\'s cache key must not be seedable at all');
  assert.match(industryCode, /check \(version ~ '\^\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\$'\)/,
    '§4.5 reads patch, minor and major differently at activation time, which is only decidable from a '
    + 'version that has three numeric parts');
  assert.match(industryCode, /check \(checksum ~ '\^sha256:\[0-9a-f\]\{64\}\$'\)/,
    'the contract requires every consumer to pin pack_id + version + checksum, so a row carrying a '
    + 'digest nothing can verify would make the pin unverifiable everywhere it is used');
  assert.match(industryCode, /released_at\s+timestamptz not null/i,
    'a row in this catalog exists BECAUSE it was published. §5 calls the family "published immutable", '
    + 'and a nullable released_at would be a draft in a table nothing can update.');
  // The lifecycle §4.5 defines is NOT modelled, and the refusal is stated rather than left as an
  // absence a reader has to notice.
  assert.doesNotMatch(industryCode, /\bdeprecated_at\b|\bretired_at\b/i,
    'deprecation and retirement are UPDATEs of a row this batch makes immutable. A mutable status '
    + 'column beside an immutable row is the contradiction 020 refused one column over; the curation '
    + 'command path owes it.');
  assert.match(industry, /NO DEPRECATION OF A PUBLISHED VERSION/,
    'and the batch says so, because an absence is not a decision until somebody writes down that it is');
  // §5 assigns this family a retention class §10 never defines. Recorded rather than guessed at (§15).
  assert.match(industry, /§10 defines no `CATALOG` class/,
    'a retention class named in the inventory and defined nowhere is a finding in the baseline, and a '
    + 'batch that silently picked a window would be choosing an open decision');
});

test('batch 030 adds to the merged batches and rewrites none of them', () => {
  // Migration invariant 1 as a property of the file rather than as a sentence in its header: every
  // `drop policy if exists X` must be followed by this file's own `create policy X`.
  const drops = [...industryCode.matchAll(/drop policy if exists (\w+) on app\.(\w+)/g)].map((m) => m[1]);
  assert.equal(drops.length, 6, 'one drop per policy this batch creates, and no others');
  for (const name of drops) {
    assert.match(industryCode, new RegExp(`create policy ${name}\\b`),
      `${name} is dropped by batch 030 and not created by it, so the drop removes a policy another batch `
      + 'owns. A later batch adds to a merged one and never replaces it (migration invariant 1).');
  }
  for (const table of ['workspace_members', 'workspace_member_scopes', 'business_profiles',
    'page_context_profiles']) {
    assert.doesNotMatch(industryCode, new RegExp(`alter table app\\.${table}\\b`, 'i'),
      `batch 030 must not alter app.${table}, which belongs to a merged batch`);
  }
  assert.doesNotMatch(industryCode, /\bto\s+app_authz\b/i,
    'no grant and no policy names app_authz. RFC-2026-020 §5/3 gives it exactly one policy and §6.1/6 '
    + 'pins its grants; 030 creates no helper and needs no exemption.');
  assert.match(industryCode, /pg_catalog\.pg_roles/,
    'pg_roles and never pg_authid: pg_authid is readable only by a superuser, and a migration that '
    + 'needs one to apply cannot be applied on the platform it targets (batch 020 found this)');
  assert.doesNotMatch(industryCode, /pg_authid/,
    'a migration that reads pg_authid passes in CI and fails on the platform, where postgres is not a '
    + 'superuser');
  assert.ok(!industryCode.includes("(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid"),
    'the inlined platform identity expression belongs to batch 011 alone — scripts/db/run.mjs holds it '
    + 'to a count of exactly two');
});

test('the batch 030 fixture writes only catalog identities and pins two tenants to one global row', async () => {
  const known = new Set(Object.values(JSON.parse(await readFile(CATALOG, 'utf8')).identities).map((e) => e.uuid));
  const fixture = (await readFile(INDUSTRY_FIXTURE, 'utf8')).replace(/--[^\n]*/g, '');
  const used = new Set([...fixture.matchAll(UUID)].map((m) => m[0]));
  assert.ok(used.size > 0, 'the fixture must actually load rows');
  for (const value of used) {
    assert.ok(known.has(value), `the fixture writes ${value}, which is not a catalog identity. A fixture `
      + 'id nobody can recompute is an unverifiable constant.');
  }
  for (const symbol of ['industry_pack_interior', 'industry_pack_interior_v1', 'industry_pack_interior_v2',
    'business_a4_unassigned', 'business_a1', 'business_a2', 'business_b1']) {
    assert.ok(used.has(id(symbol)), `the fixture must load ${symbol}`);
  }

  const assignments = fixture.match(/insert into app\.industry_assignments[\s\S]*?on conflict/);
  assert.ok(assignments, 'the fixture writes assignment rows');
  // THE STATE EVERY CASE IN THIS BATCH DEPENDS ON, asserted rather than assumed.
  //
  // business_a1 and business_b1 name the SAME global version. Two tenants, one catalog row, and
  // neither owner can see the other's assignment — which is what "global" means and is asserted by a
  // pair of positives, because no identity can read both rows and compare them.
  for (const business of ['business_a1', 'business_b1']) {
    assert.match(assignments[0], new RegExp(`'${id(business)}',\\s*\\n?\\s*'${id('industry_pack_interior_v1')}'`),
      `${business} must be pinned to industry_pack_interior_v1. The two together are the only evidence `
      + 'in this suite that the catalog is global rather than replicated per tenant.');
  }
  // business_a2 is pinned to the OTHER version, so a `no-effect` witness reads back a value that
  // would visibly change if the blocked write had gone through.
  assert.match(assignments[0], new RegExp(`'${id('business_a2')}',\\s*\\n?\\s*'${id('industry_pack_interior_v2')}'`),
    'business_a2 is pinned to the second version, so the witness for a refused re-pin asserts a value '
    + 'rather than the mere existence of a row');
  // And the two Businesses that must have NO assignment, each for its own case.
  for (const [business, why] of [
    ['business_a4_unassigned', 'the permitted INSERT needs a live Business with no assignment, and §4\'s '
      + 'ERD makes an assignment zero-or-one per Business'],
    ['business_a3_archived', '§11.3 closes new creation under an archived Business, and that case needs a '
      + 'free slot under an archived parent — a pre-pinned row would make the refusal ambiguous between '
      + 'the policy and the zero-or-one constraint'],
  ]) {
    assert.ok(!assignments[0].includes(id(business)),
      `${business} must hold NO industry assignment: ${why}`);
  }

  // The checksum is COMPUTED from the version's own catalog symbol, not pasted. A hex string typed
  // into a fixture is exactly the unverifiable constant the catalog exists to refuse, and the column's
  // CHECK would accept any 64 hex characters.
  assert.match(fixture, /sha256\(convert_to\('thinkbizthai\.fixture\.industry_pack_interior_v1', 'utf8'\)\)/,
    'each checksum is a pure function of the symbol it belongs to, so anyone can recompute it');
  assert.doesNotMatch(fixture, /'sha256:[0-9a-f]{8}/i, 'no checksum is written as a literal digest');
  assert.doesNotMatch(fixture, /\b(public|extensions)\.digest\s*\(/,
    'where pgcrypto lives is an environment fact, and a fixture that names its schema runs in one '
    + 'environment and not the other (batch 020 found this)');
  assert.match(fixture, /timestamptz '2026-06-01 00:00:00\+00'/,
    'released_at is a FIXED timestamp. A now()-relative value would make the fixture content depend on '
    + 'when it ran, which is the property the whole catalog exists to avoid.');
  assert.match(fixture, /on conflict \(industry_pack_id, version\) do nothing/,
    'idempotent on the NATURAL key, so a re-run cannot produce a second publication of one version even '
    + 'if the id were regenerated');
  assert.match(fixture, /on conflict \(workspace_id, business_profile_id\) do nothing/,
    'and the assignment is idempotent on the pair §4\'s ERD makes unique, which is also the pair every '
    + 'case addresses it through');
});

// The CI negative control, extended to three tables — and two of them are the first in this
// repository where "disable row level security and watch a tenant boundary dissolve" is not
// available, because they have no tenant boundary.
test('the tables batch 030 adds have their own entries in the CI negative control', async () => {
  const workflow = await readFile(CI_WORKFLOW, 'utf8');
  const controls = [...workflow.matchAll(/^\s*control\s+app\.(\w+)\s+'([^']+)'\s+(\d+)/gm)];
  assert.ok(controls.length >= 7, 'the control runs per table family, and batch 030 adds three');

  for (const [table, floor] of [[ASSIGNMENT_TABLE, 2], ...GLOBAL_TABLES.map((t) => [t, 1])]) {
    const entry = controls.find(([, named]) => named === table);
    assert.ok(entry, `app.${table} has no negative-control entry. The step disables row level security `
      + "on one table and requires a failed case whose id matches that table's pattern; a batch that "
      + "adds a table and no entry widens the gap the step's own blocker names.");
    assert.equal(entry[3], '030', `app.${table}: the entry is attributed to the batch that owes it`);

    // The pattern must match a case that would ACTUALLY FAIL with RLS off on that table, or the entry
    // is satisfied by any regression anywhere. `denied` cases cannot: a privilege refusal is unchanged
    // by disabling row level security, which is exactly why the two global tables rest on so few.
    const pattern = new RegExp(`^${entry[2]}`);
    const detectable = cases.filter((c) => pattern.test(c.id) && ['no-rows', 'no-effect'].includes(c.expect));
    assert.ok(detectable.length >= floor,
      `app.${table}: ${detectable.length} case(s) matching /${entry[2]}/ would fail with row level `
      + `security disabled, and the entry needs at least ${floor}. A control naming a pattern nothing `
      + 'matches reports a pass it did not earn.');
  }

  // THE ASYMMETRY, NAMED RATHER THAN AVERAGED. On the global tables exactly one case each is
  // RLS-detectable, and it is the SERVICE read: app_worker holds SELECT and no policy, which is the
  // only grant either table carries. Every client case there is a privilege refusal and would still
  // pass with row level security off. So these two entries rest on one case apiece, and deleting that
  // case would leave the control naming a pattern nothing matches.
  for (const [table, name] of [['industry_packs', 'service-sees-zero-rows-in-the-industry-pack-catalog'],
    ['industry_pack_versions', 'service-sees-zero-published-pack-versions']]) {
    const only = cases.find((c) => c.id === name);
    assert.ok(only, `app.${table}'s negative-control entry rests on ${name}, which is missing. It is the `
      + 'ONLY case on that table that row level security decides — every other one is refused by the '
      + 'privilege system, which disabling RLS does not restore — so without it the entry disables '
      + 'something nothing notices.');
    assert.equal(only.expect, 'no-rows');
    assert.equal(only.as.helper, 'as_service',
      `${name} must run as the service identity: it is the only role holding a grant on a global table, `
      + 'and the grant is what makes the refusal attributable to row level security rather than to a '
      + 'forgotten GRANT');
  }
  // And the workflow says all of that in its own file, so the reason lives where the entries do.
  assert.match(workflow, /THE TWO GLOBAL TABLES, AND WHY AN ENTRY FOR THEM BITES AT ALL/,
    'a control whose mechanism differs from every other entry must explain itself where it runs, not '
    + 'only in a test that reads it');
});

// What batch 030 claims about its own coverage, and — more usefully — what it says it could not do.
//
// The generic check above requires every §12.6 assertion claimed `covered: true` to be cited by a
// case. That is necessary and not sufficient here: batch 030 moves NO row, because every assertion
// it touches was already true, so a batch that changed nothing at all would satisfy the generic
// check exactly as well. These are the claims that are specific to what this batch could and could
// not carry.
test('the coverage map records what batch 030 could carry and what a global row cannot', () => {
  const mentions = Object.values(SMOKE_COVERAGE).filter((v) => /030/.test(v.note));
  assert.ok(mentions.length >= 6,
    'batch 030 extends six §12.6 notes and moves no row. If a note stopped naming it, either the '
    + "assertion stopped being carried on this batch's tables or the note was rewritten by somebody "
    + 'who did not know it was load-bearing.');
  // BATCH 040 CHANGED THIS LINE, and that is the shape 021 chose when it retired
  // `editor-a-sees-business-a2-until-batch-021`: a claim that stops being true changes in a diff
  // rather than quietly becoming false. Batch 030's own claim is unaltered — its industry
  // assignment is still an ANALOGUE and still uncounted — but the ROW moved, because 040 creates
  // one of the two families §12.6/3 names.
  assert.equal(SMOKE_COVERAGE[3].covered, 'knowledge-half',
    'an approver refused an INDUSTRY ASSIGNMENT is a third in-scope ANALOGUE and is still not the '
    + 'content and knowledge tables §12.6/3 names. Batch 040 created the knowledge half of them; '
    + 'content is batch 080, so the row is a labelled partial rather than `true`.');
  assert.match(SMOKE_COVERAGE[3].note, /analogue/i,
    'and the note still says the three analogues are analogues rather than counting them: 040 pays '
    + 'none of them, and a note that dropped the word would be reporting evidence about the '
    + 'workspace, the page context and the industry assignment as evidence about knowledge');
  assert.match(SMOKE_COVERAGE[3].note, /080/,
    'a partial names the batch that owes the rest, or it is a `true` with a longer label');
  assert.equal(SMOKE_COVERAGE[8].covered, 'negative-half',
    'batch 030 gives the service a grant and no policy on two more tables, which is more NEGATIVE '
    + 'evidence. Asserting the positive half would still require inventing a service permission §8.1 '
    + 'does not grant.');
  assert.match(SMOKE_COVERAGE[1].note, /GLOBAL tables are deliberately NOT counted/,
    '§12.6/1 is a cross-tenant assertion, and a row belonging to no workspace cannot carry one. '
    + 'Counting the catalog refusals there would be reporting a refusal that holds for everybody as a '
    + 'tenant boundary that holds for one tenant.');
  assert.match(String(AUTHORIZATION_CASE_COVERAGE[4]), /BATCH 030 CARRIES NO CASE FOR IT AND SAYS SO/,
    '§8.6 case 4 is "same Business, allowed Page A, row Page B", and §4\'s ERD gives the industry '
    + 'assignment no Page level for it to be about');
  assert.match(String(AUTHORIZATION_CASE_COVERAGE[5]), /GLOBAL tables are excluded on purpose/,
    'the same refusal one case over, for the same reason');
  assert.match(String(AUTHORIZATION_CASE_COVERAGE[10]), /RFC-2026-012 §4/,
    'case 10 is the authorized server command, and batch 030 is the first family in this repository '
    + 'that is unreachable without one — which makes the gap larger rather than smaller');

  // The labels this batch introduced are cited by cases, the same way §12.6 labels are. Without
  // this, the decision the whole batch turns on could stop being asserted while every §12.6 row
  // stayed green.
  const cited = new Set(cases.flatMap((c) => c.covers ?? []));
  for (const label of ['RFC-2026-012§2', 'RFC-2026-012§3', '§9.1/PUBLIC-0', '§5/global']) {
    assert.ok(cited.has(label), `${label} is the reasoning batch 030 rests on and no case cites it`);
  }
  // And the empty allowlist is asserted at the layer that makes it an allowlist: a GRANT refusal.
  // A case that only demanded 42501 would pass just as happily against a database where the grant
  // existed and a policy refused instead, which is a different schema entirely.
  const catalogDenials = cases.filter((c) => (c.covers ?? []).includes('RFC-2026-012§3'));
  assert.ok(catalogDenials.length >= 3, 'the allowlist is asserted from more than one identity');
  for (const c of catalogDenials) {
    assert.equal(c.expect, 'denied', `${c.id}: an empty allowlist shows up as a refusal, not as zero rows`);
    assert.equal(c.deniedBy, 'grant',
      `${c.id}: the layer is the assertion. A policy refusal here would mean the grant EXISTS and `
      + 'something else refused, which is the state RFC-2026-012 §3 says only an RFC may create.');
  }
});

// =============================================================================================
// Batch 040 — knowledge, and the first family whose scope is two columns.
// =============================================================================================
const KNOWLEDGE_MIGRATION = 'db/foundation/migrations/040_knowledge.sql';
const KNOWLEDGE_FIXTURE = 'tests/db/identity/fixtures/040-knowledge-fixture.sql';
const knowledge = await readFile(KNOWLEDGE_MIGRATION, 'utf8');
const knowledgeCode = knowledge.replace(/--[^\n]*/g, '');
const KNOWLEDGE_ITEMS = 'knowledge_items';
const KNOWLEDGE_VERSIONS = 'knowledge_item_versions';
const KNOWLEDGE_TABLES = [KNOWLEDGE_ITEMS, KNOWLEDGE_VERSIONS];
// §5's four words for the knowledge profiles, verbatim. Two of them read as plurals and that is
// deliberate: normalising them would be two edits to a vocabulary a document fixed, and §3.2 makes a
// Phase 1 state changeable by migration, which is the mechanism for changing it once somebody with
// the authority to decide has.
const KNOWLEDGE_KINDS = ['voice', 'audience', 'offers', 'restrictions'];
// The roles §8.2 marks `Y` on "Knowledge current INSERT/UPDATE/archive". The editor is in this list
// and is NOT in §8.1's equivalent, which is the single most arguable line in the batch.
const KNOWLEDGE_WRITERS = ['owner', 'admin', 'editor'];

test('every batch 040 table carries RLS, FORCE, a primary key, an owner comment and a policy', () => {
  for (const table of KNOWLEDGE_TABLES) {
    assert.match(knowledgeCode, new RegExp(`create table (?:if not exists )?app\\.${table}\\b`, 'i'));
    assert.match(knowledgeCode, new RegExp(`alter table app\\.${table} enable row level security`, 'i'));
    assert.match(knowledgeCode, new RegExp(`alter table app\\.${table} force row level security`, 'i'),
      `app.${table}: ENABLE and FORCE are different catalog columns and the data package's own lint rule `
      + 'tests only the first, so ENABLE without FORCE passes it clean while the table owner stays exempt '
      + 'from every policy in the file');
    assert.match(knowledgeCode, new RegExp(`create table (?:if not exists )?app\\.${table}[\\s\\S]{0,900}?primary key`, 'i'),
      `app.${table}: no primary key`);
    assert.match(knowledge, new RegExp(`comment on table app\\.${table} is`, 'i'));
    assert.match(knowledgeCode, new RegExp(`create policy \\w+ on app\\.${table}\\b`, 'i'),
      `app.${table}: RFC-2026-017 §3 puts a table's policies in the migration that creates it. A forced `
      + 'table with no policy is unreachable, which is a decision batch 030 had to write down; this table '
      + 'is CONTENT-2 tenant data and has no such decision to make.');
  }
  // §3.3's synonyms are forbidden outright, `page_id` by name. Batch 020 records that this check reads
  // the file with line comments stripped and string literals kept, so writing a forbidden token even
  // to say it is forbidden fails the build. That is the rule behaving correctly.
  for (const synonym of ['tenant_id', 'organization_id', 'org_id', 'brand_id', 'account_id', 'page_id']) {
    assert.doesNotMatch(knowledgeCode, new RegExp(`\\b${synonym}\\b`, 'i'),
      `§3.3 forbids the synonym ${synonym}`);
  }
});

// THE SHAPE OF THE SCOPE, WHICH IS THIS BATCH'S WHOLE DESIGN.
//
// §5 scopes knowledge.core "business/page" and §3.3 lists knowledge under the Business row
// unconditionally and under the Page row conditionally ("ที่จำกัดเฉพาะเพจ"). §4 relation invariant 3
// settles it: every knowledge row has a Business scope, and the Page scope is a NULLABLE OVERRIDE
// that must be in the same Business. Neither column alone is the scope.
test('a knowledge row always has a Business scope and a Page scope only as a nullable override', () => {
  const body = knowledgeCode.match(new RegExp(`create table (?:if not exists )?app\\.${KNOWLEDGE_ITEMS}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'));
  assert.ok(body, 'the item table definition must be findable');
  assert.match(body[1], /workspace_id\s+uuid\s+not null/i,
    '§3.3 requires the canonical tenant scope on every tenant-owned row');
  assert.match(body[1], /business_profile_id\s+uuid\s+not null/i,
    '§4 invariant 3: EVERY knowledge row has a Business scope. A nullable business_profile_id would make '
    + 'the Page column a substitute for it rather than an override of it.');
  assert.match(body[1], /page_context_profile_id\s+uuid\s*,/i,
    '§4 invariant 3: the Page scope is a NULLABLE override. A NOT NULL page column would forbid '
    + 'business-level knowledge, which is most of it.');
  // The override's validity is a THREE-column foreign key: the Page must be a Page of THAT Business in
  // THAT Workspace. A single-column reference would say the Page exists and nothing more.
  assert.match(knowledgeCode,
    /foreign key \(workspace_id, business_profile_id, page_context_profile_id\)\s*\n?\s*references app\.page_context_profiles \(workspace_id, business_profile_id, id\)/i,
    'the Page override is referenced over the WHOLE scope path, so a Page belonging to another Business '
    + 'fails at the database with 23503 for every caller (§4 invariant 10)');
  assert.match(knowledgeCode,
    /foreign key \(workspace_id, business_profile_id\)\s*\n?\s*references app\.business_profiles \(workspace_id, id\)/i,
    'and the Business scope is referenced the same way, and is never null, so that key is checked on '
    + 'every row');
  // MATCH SIMPLE is the default and is the load-bearing choice: with any referencing column null the
  // key is satisfied trivially, which is what lets a business-level row exist. MATCH FULL would refuse
  // every one of them, because workspace_id and business_profile_id are never null.
  assert.doesNotMatch(knowledgeCode, /match\s+full/i,
    'MATCH FULL on the Page key would demand all three columns be null or none, and two of them are NOT '
    + 'NULL — so it would refuse every business-level knowledge row while looking like a stricter '
    + 'constraint. The default is the right one here and the file says why.');
  assert.match(knowledge, /MATCH SIMPLE/,
    'a default that is load-bearing is a decision, and a decision a reader cannot find is one they cannot '
    + 'disagree with');
  // §8.5, and the column that carries the second half of the scope.
  for (const grant of knowledgeCode.matchAll(/grant update \(([^)]*)\) on app\.(\w+)/gi)) {
    for (const column of ['workspace_id', 'business_profile_id', 'page_context_profile_id']) {
      assert.doesNotMatch(grant[1], new RegExp(`\\b${column}\\b`, 'i'),
        `app.${grant[2]}: ${column} is not updatable. §8.5 forbids moving a row across tenant OR SCOPE with `
        + 'an update, and a knowledge item changing Page is exactly that.');
    }
  }
  assert.match(knowledgeCode, /a scope or type column of app\.knowledge_items is updatable/,
    'and the same claim against the live ACL at apply time, per column, because a grant made by a later '
    + 'batch would not appear in this file');
});

// THE ONE THING IN THIS BATCH A REVIEWER SHOULD ARGUE WITH, held to the argument it made.
test("the knowledge version records no page of its own and its narrowing is the item's reachability", () => {
  const body = knowledgeCode.match(new RegExp(`create table (?:if not exists )?app\\.${KNOWLEDGE_VERSIONS}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'));
  assert.ok(body);
  assert.doesNotMatch(body[1], /page_context_profile_id/i,
    `app.${KNOWLEDGE_VERSIONS}: a nullable copy of the Page could not be held equal to the item's by any `
    + 'foreign key this schema can write — MATCH SIMPLE skips a null referencing column, so a version could '
    + 'claim to be business-level while its item is page-restricted, and the narrowing would then ask the '
    + 'Business question about the history of a page-restricted item. An unenforceable copy of the column '
    + 'the narrowing turns on is worse than no copy.');
  assert.doesNotMatch(body[1], /\bkind\b/i,
    `app.${KNOWLEDGE_VERSIONS}: a version determines its item and an item determines its kind, so a copy `
    + "here would be a second source of truth for a fact the foreign key already fixes — 021's refusal of "
    + "current_version_id and 030's of industry_pack_id, in the same words");
  assert.match(body[1], /workspace_id\s+uuid\s+not null/i);
  assert.match(body[1], /business_profile_id\s+uuid\s+not null/i,
    'the Business scope IS carried, because §3.3 requires it of every knowledge row unconditionally and '
    + 'because the composite key into the item is spelled over it');
  // And the narrowing that replaces the absent column.
  const narrowing = knowledgeCode.match(
    new RegExp(`create policy (\\w+) on app\\.${KNOWLEDGE_VERSIONS}\\s*\\n\\s*as restrictive([\\s\\S]*?);\\n`));
  assert.ok(narrowing, `app.${KNOWLEDGE_VERSIONS} carries a restrictive narrowing`);
  assert.match(narrowing[0], new RegExp(`from app\\.${KNOWLEDGE_ITEMS}\\b`),
    "a version is reachable exactly when its item is, which cannot drift from the item's rule because it IS "
    + "the item's rule — including the page half of it, and including any narrowing a later batch adds");
  assert.doesNotMatch(narrowing[0], /member_scope_admits_(business|page)\(/,
    "and it is NOT a copy of the item's predicate: a copy would have to guess which question to ask about a "
    + 'row that carries no page column, which is the guess this table exists without');
  assert.match(knowledgeCode, /the knowledge version narrowing does not resolve through the item/,
    'asserted at apply time against the deparsed policy expression as well, because a predicate rewritten '
    + "to read the version's own columns would pass every text check that merely named a table");
});

test('an immutable knowledge version grants no role UPDATE or DELETE, and carries no such policy', () => {
  const body = knowledgeCode.match(new RegExp(`create table (?:if not exists )?app\\.${KNOWLEDGE_VERSIONS}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'));
  assert.ok(body);
  assert.doesNotMatch(body[1], /updated_at/i,
    `app.${KNOWLEDGE_VERSIONS}: an immutable row has no update to stamp, and §3.2 requires updated_at only `
    + 'of a MUTABLE row');
  assert.doesNotMatch(knowledgeCode, new RegExp(`create trigger set_updated_at before update on app\\.${KNOWLEDGE_VERSIONS}`, 'i'));
  for (const role of ['authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz']) {
    assert.doesNotMatch(knowledgeCode,
      new RegExp(`grant[^;]*\\b(update|delete)\\b[^;]*on app\\.${KNOWLEDGE_VERSIONS}[^;]*to [^;]*${role}`, 'i'),
      `app.${KNOWLEDGE_VERSIONS}: ${role} must hold neither UPDATE nor DELETE. §8.2's "Knowledge version `
      + 'UPDATE/DELETE" is N for every role INCLUDING the service. An absent grant has to be granted; a '
      + 'policy can be widened by an edit.');
  }
  // And no DELETE on the item either, for anyone — §8.5 has no broad user delete and the item has a
  // typed lifecycle field instead.
  for (const table of KNOWLEDGE_TABLES) {
    assert.doesNotMatch(knowledgeCode, new RegExp(`grant[^;]*\\bdelete\\b[^;]*on app\\.${table}`, 'i'),
      `app.${table}: §8.5 requires a soft delete through a typed lifecycle field. The item has archived_at, `
      + 'which §8.2 names in the operation itself; a version has none, because nothing about an immutable '
      + 'row has a lifecycle.');
  }
  assert.doesNotMatch(knowledgeCode, /create\s+policy[\s\S]{0,400}?\bfor\s+delete\b/i,
    'and no DELETE policy either: a policy with no grant is inert, and a reader should not have to work out '
    + 'which of the two is missing');
  assert.match(knowledgeCode, new RegExp(`grant select, insert on app\\.${KNOWLEDGE_VERSIONS} to app_worker`, 'i'),
    `app.${KNOWLEDGE_VERSIONS}: app_worker holds the two verbs §8.2 allows it and no policy, which is what `
    + "makes the service's empty read attributable to row level security rather than to a forgotten GRANT");
  assert.match(knowledgeCode, /an immutable knowledge version can be updated or deleted/,
    '040 asserts its own immutability at apply time, against whatever database receives it, which catches a '
    + 'grant made by a LATER batch that no text rule in this file would see');
  assert.match(knowledgeCode, /the knowledge version table carries an UPDATE or DELETE policy/,
    'both halves: a policy with no grant is inert, and a grant with no policy is denied by RLS instead of by '
    + 'privilege, which is a weaker refusal than immutability asks for');
});

// §8.2's three knowledge rows, and the cell that differs from §8.1.
test('the §8.2 knowledge cells are implemented as written, and the editor is a Y and not a P', () => {
  const policies = [...knowledgeCode.matchAll(/create policy (\w+) on app\.(knowledge_\w+)([\s\S]*?);\n/g)];
  assert.equal(policies.length, 7,
    'select, insert and update on the item; select and insert on the version; and one restrictive narrowing '
    + 'per table. Seven, because §8.2 grants the version its producing operation and denies only mutation of '
    + 'the record.');
  const writes = policies.filter(([, name]) => /_writer$/.test(name));
  assert.equal(writes.length, 3, 'insert and update on the item, insert on the version');
  for (const [body, name] of writes.map((m) => [m[0], m[1]])) {
    for (const role of KNOWLEDGE_WRITERS) {
      assert.match(body, new RegExp(`'${role}'`),
        `${name}: §8.2 marks "Knowledge current INSERT/UPDATE/archive" Y for ${role}. THE EDITOR IS THE one `
        + 'to read carefully: §8.1 marks the Business/Page equivalent `P`, which 020 refused and 021 paid '
        + 'with an EXPLICIT member scope, and §8.2 marks THIS one `Y`. §7 says the same in prose — "editor: '
        + 'สร้าง/แก้ knowledge ... เมื่อ policy อนุญาต" — so the write policy names the editor '
        + "unconditionally and the scope rule narrows it, which is what §8's legend means by Y.");
    }
    for (const role of ['approver', 'viewer']) {
      assert.doesNotMatch(body, new RegExp(`'${role}'`),
        `${name}: §8.2 marks ${role} N on the knowledge write. §12.6/3 is the approver half of that.`);
    }
    // `covers` belongs to a `P` cell and would deny every member holding no scope row. Using it here
    // would be implementing a cell §8.2 does not have.
    assert.doesNotMatch(body, /member_scope_covers_/,
      `${name}: \`covers\` is the predicate for a \`P\` cell — "passes per EXPLICIT capability" — and §8.2 `
      + 'marks no client cell on these tables P. It answers false for a member with no scope row, so using it '
      + 'here would deny every unscoped owner, admin and editor the write the matrix grants them.');
    if (!/for\s+insert/i.test(body)) continue;
    assert.match(body, /created_by\s*=\s*\(select auth\.uid\(\)\)/,
      `${name}: §8.5 requires a user action to assert created_by = auth.uid(), or a caller can write a row `
      + 'naming somebody else as its author (§8.6/8)');
  }
  // §11.3, twice, because this family has two parents that can be archived independently.
  const itemInsert = policies.find(([, name]) => name === 'knowledge_items_insert_writer');
  assert.ok(itemInsert);
  assert.match(itemInsert[0], /from app\.business_profiles b[\s\S]*?archived_at is null/,
    'knowledge under an archived Business is new creation under it (§11.3)');
  assert.match(itemInsert[0], /page_context_profile_id is null[\s\S]{0,80}?or exists \([\s\S]*?from app\.page_context_profiles p[\s\S]*?archived_at is null/,
    'AND under an archived PAGE, which is the second half of §11.3 for a family whose rows carry their own '
    + 'Page. The clause is guarded on the override being set, so a business-level row is not refused for '
    + 'having no Page to check.');
  // The UPDATE policy deliberately carries NO archive clause: archiving IS an update of archived_at, so
  // a clause there would make un-archiving impossible.
  const itemUpdate = policies.find(([, name]) => name === 'knowledge_items_update_writer');
  assert.ok(itemUpdate);
  assert.doesNotMatch(itemUpdate[0], /archived_at is null/,
    'archiving is itself an UPDATE of archived_at, so an archive clause on the UPDATE policy would make '
    + "un-archiving impossible — 020 read §11.3 the same way on its own business update");
  assert.match(itemUpdate[0], /using/i, 'an UPDATE policy needs USING');
  assert.match(itemUpdate[0], /with\s+check/i,
    'and WITH CHECK, or a row admitted by USING could be updated out of the scope that admitted it (§8.5)');
});

test('the narrowing is RESTRICTIVE on both tables and asks the Business question or the Page question', () => {
  const restrictive = [...knowledgeCode.matchAll(/create policy (\w+) on app\.(knowledge_\w+)\s*\n\s*as restrictive([\s\S]*?);\n/g)];
  assert.equal(restrictive.length, 2,
    'one per table. Permissive policies OR together and cannot subtract, so a scope rule written as a '
    + 'permissive policy would WIDEN each table instead of narrowing it — and a version row holds what a '
    + 'knowledge item used to say, so a narrowing that skipped it would leave the history readable to a '
    + "member the current row is hidden from (021's own words).");
  assert.deepEqual(restrictive.map((m) => m[2]).sort(), [...KNOWLEDGE_TABLES].sort());
  for (const [body, name] of restrictive.map((m) => [m[0], m[1]])) {
    assert.match(body, /for\s+all\s+to\s+authenticated/i,
      `${name}: FOR ALL, so the scope rule has ONE home per table rather than one per command — and a `
      + 'permissive policy added by a later batch is ANDed with it automatically instead of being another '
      + 'place to forget it');
    assert.match(body, /with\s+check/i,
      `${name}: without WITH CHECK the narrowing filters reads and admits writes, which is the half of a `
      + 'scope rule that matters most');
  }
  const itemNarrowing = restrictive.find((m) => m[2] === KNOWLEDGE_ITEMS)[0];
  assert.match(itemNarrowing, /case when page_context_profile_id is null/,
    'the narrowing decides PER ROW which question to ask, because §4 invariant 3 makes the Page scope a '
    + 'nullable override on a row that always carries a Business scope');
  assert.match(itemNarrowing, /app\.member_scope_admits_business\(workspace_id, business_profile_id\)/,
    'the business-level branch');
  assert.match(itemNarrowing, /app\.member_scope_admits_page\(workspace_id, business_profile_id, page_context_profile_id\)/,
    'and the page-level one. Dropping this branch would admit every member scoped to a SIBLING Page under '
    + 'the same Business, and it would look exactly like a working policy from every other angle: the '
    + 'cross-tenant cases, the Business-scope cases and the suspended case would all still pass.');
  assert.doesNotMatch(itemNarrowing, /member_scope_covers_/,
    "`admits`, never `covers`: §8's legend reads Y as \"active + capability + scope ตรง\", so an operation "
    + 'granted to every role is narrowed by scope WHERE ONE EXISTS and not where none does. `covers` here '
    + 'would deny every member holding no scope row, which is the reading 021 rejected in its own header.');
  assert.match(knowledgeCode, /batch 040 wrote % restrictive policies and it creates two tables to narrow/,
    'and the count is re-asserted at apply time, because polpermissive is the one catalog column that tells '
    + 'a narrowing from a widening');
  assert.match(knowledgeCode, /the knowledge item narrowing does not ask both the Business and the Page question/,
    'and so is the presence of BOTH branches, against the deparsed expression — the count alone would be '
    + 'satisfied by a narrowing that asked only the Business question');
});

test('no batch 040 policy names a membership table, and every one is written TO authenticated', () => {
  const policies = [...knowledgeCode.matchAll(/create policy (\w+) on app\.(knowledge_\w+)([\s\S]*?);\n/g)];
  assert.ok(policies.length >= 7);
  for (const [body, name] of policies.map((m) => [m[0], m[1]])) {
    assert.match(body, /\bto\s+authenticated\b/i, `${name}: §8.5 writes tenant policies TO authenticated`);
    // RFC-2026-020 §5/5 and 020's reason: a join would evaluate that scan AS THE CALLER, so another
    // module's whole policy set would expand inside this table's evaluation and the width of knowledge
    // visibility would stop being a property of this file.
    for (const table of ['app.workspace_members', 'app.workspace_member_scopes']) {
      assert.doesNotMatch(body, new RegExp(table.replace('.', '\\.')),
        `${name}: membership and member scope are read through the helpers — app.is_active_member, `
        + 'app.workspace_member_role, app.member_scope_admits_* — and never by joining the table. '
        + 'RFC-2026-020 §5/5 exists for that, and batch 011 exists for it.');
    }
    for (const role of ['app_worker', 'app_command', 'app_maintenance', 'anon']) {
      assert.doesNotMatch(body, new RegExp(`\\bto\\s+${role}\\b`, 'i'),
        `${name}: §8.2 gives the service \`P\` and anonymous nothing. A policy for either would add a `
        + 'permission the matrix does not grant and would make the service denial unfalsifiable.');
    }
  }
  // The only tables a batch 040 policy reads besides its own are the two parents of §11.3's archive
  // clause and the item its version narrowing resolves through — all three written in THIS file or
  // read in the fail-closed direction, which is the property 020's warning was protecting.
  const foreign = policies.flatMap(([body]) =>
    [...body.matchAll(/from app\.(\w+)/g)].map((m) => m[1]))
    .filter((t) => !KNOWLEDGE_TABLES.includes(t));
  assert.deepEqual([...new Set(foreign)].sort(), ['business_profiles', 'page_context_profiles'],
    'and no others: any narrowing of those two can only make the INSERT refuse more, and neither is a '
    + 'membership table whose policy set belongs to another module');
  assert.match(knowledgeCode, /batch 040 wrote a policy for a service or anonymous role/,
    'and the same claim against the live catalog at apply time');
});

test('the typed profile is the row, and its four values are the four §5 names', () => {
  assert.match(knowledgeCode,
    new RegExp(`check \\(kind in \\(${KNOWLEDGE_KINDS.map((k) => `'${k}'`).join(', ')}\\)\\)`),
    '§5 lists the family as "items/versions/voice/audience/offers/restrictions" and §3.2 makes a Phase 1 '
    + "state text + a named CHECK whose values change by migration only. The four words are §5's, unchanged "
    + '— normalising the two that read as plurals would be two edits to a vocabulary a document fixed.');
  // The alternative shape, refused: four profile tables would be six entities §4's ERD does not have,
  // and no document names a single column of any of them.
  for (const invented of ['knowledge_voice', 'knowledge_audience', 'knowledge_offer', 'knowledge_restriction']) {
    assert.doesNotMatch(knowledgeCode, new RegExp(`create table (?:if not exists )?app\\.${invented}`, 'i'),
      "§4's ERD contains exactly two knowledge entities — KNOWLEDGE_ITEM and KNOWLEDGE_VERSION — and no "
      + 'document names a single column of a per-kind table, so four of them would be four identical shells '
      + 'reserved against a design somebody else has to do. 021 refused workspace_member_scope_versions for '
      + 'the same reason.');
  }
  assert.match(knowledge, /FOUR PROFILE TABLES \(rejected\)/,
    'and the batch says which shape it refused, so a reader can disagree with the reading rather than with '
    + 'the silence');
  // `kind` is not updatable, which is 040's own reading and is labelled as one.
  for (const grant of knowledgeCode.matchAll(/grant update \(([^)]*)\) on app\.(\w+)/gi)) {
    assert.doesNotMatch(grant[1], /\bkind\b/i,
      `app.${grant[2]}: a typed profile that can change type is not typed, and §8.2 names no operation that `
      + 'changes one');
  }
  // No document column standing in for the shape §5 declines to name.
  assert.doesNotMatch(knowledgeCode, /\b(jsonb|metadata|config|payload)\b/i,
    '§5 forbids "metadata", "config", "payload" and "JSON" without a declared JSON Schema version, maximum '
    + 'size, prohibited fields and owner, none of which exists — and a CONTENT-2 blob is the worst column in '
    + "the schema to invent on that basis. The resolved knowledge shape is batch 041's.");
});

test('batch 040 adds to the merged batches and rewrites none of them', () => {
  // Migration invariant 1 as a property of the file rather than as a sentence in its header.
  const drops = [...knowledgeCode.matchAll(/drop policy if exists (\w+) on app\.(\w+)/g)].map((m) => m[1]);
  assert.equal(drops.length, 7, 'one drop per policy this batch creates, and no others');
  for (const name of drops) {
    assert.match(knowledgeCode, new RegExp(`create policy ${name}\\b`),
      `${name} is dropped by batch 040 and not created by it, so the drop removes a policy another batch `
      + 'owns. A later batch adds to a merged one and never replaces it (migration invariant 1).');
  }
  for (const table of ['workspace_members', 'workspace_member_scopes', 'business_profiles',
    'page_context_profiles', 'industry_assignments']) {
    assert.doesNotMatch(knowledgeCode, new RegExp(`alter table app\\.${table}\\b`, 'i'),
      `batch 040 must not alter app.${table}, which belongs to a merged batch`);
  }
  assert.doesNotMatch(knowledgeCode, /\bto\s+app_authz\b/i,
    'no grant and no policy names app_authz. RFC-2026-020 §5/3 gives it exactly one policy and §6.1/6 pins '
    + 'its grants; 040 creates no helper and needs no exemption.');
  assert.match(knowledgeCode, /pg_catalog\.pg_roles/,
    'pg_roles and never pg_authid: pg_authid is readable only by a superuser, and a migration that needs one '
    + 'to apply cannot be applied on the platform it targets (batch 020 found this)');
  assert.doesNotMatch(knowledgeCode, /pg_authid/,
    'a migration that reads pg_authid passes in CI and fails on the platform, where postgres is not a '
    + 'superuser');
  assert.ok(!knowledgeCode.includes("(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid"),
    'the inlined platform identity expression belongs to batch 011 alone — scripts/db/run.mjs holds it to a '
    + 'count of exactly two');
  assert.match(knowledgeCode, /gen_random_uuid\(\)/,
    'unqualified, so it resolves from pg_catalog, which is always on the search path (batch 004)');
  assert.doesNotMatch(knowledgeCode, /(public|extensions)\.gen_random_uuid/,
    'a schema-qualified default runs in one environment and fails in the other, which is the failure batch '
    + '010 records at the head of its own file');
  assert.match(knowledgeCode, /private\.set_updated_at\(\)/,
    "§3.2's updated_at comes from batch 000's helper and is not reimplemented");
});

test('the batch 040 fixture writes only catalog identities and carries both scope shapes', async () => {
  const known = new Set(Object.values(JSON.parse(await readFile(CATALOG, 'utf8')).identities).map((e) => e.uuid));
  const fixture = (await readFile(KNOWLEDGE_FIXTURE, 'utf8')).replace(/--[^\n]*/g, '');
  const used = new Set([...fixture.matchAll(UUID)].map((m) => m[0]));
  assert.ok(used.size > 0, 'the fixture must actually load rows');
  for (const value of used) {
    assert.ok(known.has(value), `the fixture writes ${value}, which is not a catalog identity. A fixture id `
      + 'nobody can recompute is an unverifiable constant.');
  }
  for (const symbol of ['knowledge_a1_business', 'knowledge_a1_page', 'knowledge_a1_sibling_page',
    'knowledge_a2_business', 'knowledge_b1_business', 'page_a1_archived']) {
    assert.ok(used.has(id(symbol)), `the fixture must load ${symbol}`);
  }
  const items = fixture.match(/insert into app\.knowledge_items[\s\S]*?on conflict/);
  assert.ok(items, 'the fixture writes knowledge items');
  // BOTH SCOPE SHAPES, which is the state every narrowing case in this batch depends on. A fixture
  // carrying only business-level rows would leave the Page branch of the narrowing untested and green.
  assert.match(items[0], new RegExp(`'${id('knowledge_a1_business')}'[\\s\\S]{0,200}?null,`),
    'knowledge_a1_business carries a NULL page: the un-overridden state §4 invariant 3 makes the default');
  assert.match(items[0], new RegExp(`'${id('knowledge_a1_page')}'[\\s\\S]{0,200}?'${id('page_a1')}'`),
    'knowledge_a1_page carries page_a1: the overridden state, without which half the narrowing is untested');
  assert.match(items[0], new RegExp(`'${id('knowledge_a1_sibling_page')}'[\\s\\S]{0,200}?'${id('page_a1_sibling')}'`),
    'and knowledge_a1_sibling_page carries the OTHER Page of the SAME Business, which is the only pair in '
    + 'the fixture §8.6 case 4 can be about at knowledge granularity');
  // All four kinds live, so the vocabulary is exercised rather than merely permitted by a CHECK.
  for (const kind of KNOWLEDGE_KINDS) {
    assert.match(items[0], new RegExp(`'${kind}'`),
      `the fixture loads a '${kind}' row. A vocabulary that only ever appears in a CHECK is one no row has `
      + 'ever had to satisfy — 021 loaded the all_businesses scope type for the same reason.');
  }
  // The archived PAGE under a LIVE Business, which is the only row that can tell §11.3's second clause
  // from its first.
  assert.match(fixture, new RegExp(`'${id('page_a1_archived')}'[\\s\\S]{0,400}?timestamptz '2026-07-01`),
    'page_a1_archived is archived at a FIXED timestamp: a fixture whose content depends on when it ran is '
    + "one whose failures depend on when they ran (030's sentence about released_at)");
  assert.ok(!items[0].includes(id('business_a3_archived')),
    'no knowledge is loaded under the archived BUSINESS: §11.3 closes new creation under it and that case '
    + 'needs a parent with nothing under it, or the refusal is ambiguous');
  const versions = fixture.match(/insert into app\.knowledge_item_versions[\s\S]*?on conflict/);
  assert.ok(versions, 'the fixture writes version rows');
  assert.doesNotMatch(versions[0], new RegExp(`'${id('page_a1')}'`),
    'a version row carries no page, because the table has none — the fixture cannot quietly disagree with '
    + 'the schema about the one column this batch argued hardest about');
  assert.match(fixture, /on conflict \(knowledge_item_id, version_number\) do nothing/,
    'idempotent on the NATURAL key, so a re-run cannot produce a second version 1 even if an id were '
    + 'regenerated');
});

// The CI negative control, extended to two more tables — and unlike batch 030's global entries, both
// of these rest on several RLS-decided cases rather than on one.
test('the tables batch 040 adds have their own entries in the CI negative control', async () => {
  const workflow = await readFile(CI_WORKFLOW, 'utf8');
  const controls = [...workflow.matchAll(/^\s*control\s+app\.(\w+)\s+'([^']+)'\s+(\d+)/gm)];
  assert.ok(controls.length >= 9, 'the control runs per table family, and batch 040 adds two');

  for (const [table, floor] of [[KNOWLEDGE_ITEMS, 6], [KNOWLEDGE_VERSIONS, 3]]) {
    const entry = controls.find(([, named]) => named === table);
    assert.ok(entry, `app.${table} has no negative-control entry. The step disables row level security on `
      + "one table and requires a failed case whose id matches that table's pattern; a batch that adds a "
      + "table and no entry widens the gap the step's own blocker names.");
    assert.equal(entry[3], '040', `app.${table}: the entry is attributed to the batch that owes it`);
    const pattern = new RegExp(`^${entry[2]}`);
    const detectable = cases.filter((c) => pattern.test(c.id) && ['no-rows', 'no-effect'].includes(c.expect));
    assert.ok(detectable.length >= floor,
      `app.${table}: ${detectable.length} case(s) matching /${entry[2]}/ would fail with row level security `
      + `disabled, and the entry needs at least ${floor}. A control naming a pattern nothing matches reports `
      + 'a pass it did not earn.');
  }
  // The two patterns must not overlap, or one entry is satisfied by the other table's cases and the
  // control stops being per family — which is the exact defect the per-family rewrite fixed.
  const itemPattern = new RegExp(`^${controls.find(([, n]) => n === KNOWLEDGE_ITEMS)[2]}`);
  const versionPattern = new RegExp(`^${controls.find(([, n]) => n === KNOWLEDGE_VERSIONS)[2]}`);
  for (const c of cases) {
    assert.ok(!(itemPattern.test(c.id) && versionPattern.test(c.id)),
      `${c.id} matches BOTH batch 040 control patterns, so each entry could be satisfied by the other `
      + "table's regression");
  }
  // WHAT EACH ENTRY RESTS ON, named rather than counted. Batch 030 recorded that a global table's entry
  // can rest on a single case; neither of these does, and the specific cases are pinned so that
  // deleting one fails the build instead of leaving an entry that disables something nothing notices.
  for (const [table, name, expect] of [
    [KNOWLEDGE_ITEMS, 'page-editor-a-cannot-see-the-knowledge-item-of-the-sibling-page', 'no-rows'],
    [KNOWLEDGE_ITEMS, 'approver-a-cannot-update-a-knowledge-item', 'no-effect'],
    [KNOWLEDGE_ITEMS, 'owner-a-cannot-see-the-knowledge-item-of-business-b1', 'no-rows'],
    [KNOWLEDGE_VERSIONS, 'page-editor-a-cannot-see-the-knowledge-version-of-the-sibling-page', 'no-rows'],
    [KNOWLEDGE_VERSIONS, 'editor-a-scope-does-not-reach-the-knowledge-version-of-business-a2', 'no-rows'],
    [KNOWLEDGE_VERSIONS, 'service-sees-zero-knowledge-versions', 'no-rows'],
  ]) {
    const found = cases.find((c) => c.id === name);
    assert.ok(found, `app.${table}'s negative-control entry rests on ${name}, which is missing`);
    assert.equal(found.expect, expect, `${name}: only a filtered read or a filtered write is restored by `
      + 'disabling row level security. A `denied` case is a privilege refusal and would pass unchanged.');
  }
  assert.match(workflow, /TWO KNOWLEDGE TABLES, AND WHAT EACH ENTRY ACTUALLY RESTS ON/,
    'each entry says beside itself what disabling row level security on that table would let through, '
    + 'because a control whose mechanism lives only in a test is a control nobody reads at the point of use');
});

// What batch 040 claims about its own coverage, and — more usefully — what it says it did not pay.
test('the coverage map pays the knowledge half of §12.6/3 and names the batch that owes the rest', () => {
  assert.equal(SMOKE_COVERAGE[3].covered, 'knowledge-half',
    'app.knowledge_items is one of the two families §12.6/3 names, so the row is no longer false; content is '
    + 'batch 080, so it is not true');
  assert.match(SMOKE_COVERAGE[3].note, /080/, 'and the note names the batch that owes the other half');
  assert.match(SMOKE_COVERAGE[3].note, /analogue/i,
    'the three in-scope analogues stay labelled as analogues. Batch 040 pays none of them: they are evidence '
    + 'about the workspace, the page context and the industry assignment.');
  // The claim has to be carried by cases, and by cases of BOTH kinds — a refusal alone would be
  // satisfied by an approver who cannot see knowledge at all, which is a different (wrong) schema.
  const approver = cases.filter((c) => (c.covers ?? []).includes('§12.6/3') && /^approver-a-/.test(c.id));
  assert.ok(approver.length >= 5, '§12.6/3 is claimed for knowledge and must be carried by cases on the '
    + 'knowledge tables, not by the analogues');
  assert.ok(approver.some((c) => c.expect === 'rows'),
    'the approver READS knowledge — §8.2 marks that cell Y — so the refusals beside it are about editing '
    + 'rather than about visibility. Without this the claim is satisfied by an approver who sees nothing.');
  for (const verb of ['create', 'update', 'archive']) {
    assert.ok(approver.some((c) => c.id.includes(`cannot-${verb}`)),
      `§8.2 spells the operation "INSERT/UPDATE/archive", so ${verb} is part of the cell. A schema that `
      + 'refused a rename and permitted an archive would let an approver hide every knowledge item in the '
      + 'workspace.');
  }
  assert.ok(approver.some((c) => /knowledge-version/.test(c.id)),
    'and the version write, because an approver who could append a version would be editing knowledge '
    + 'history without touching the current row');
  // Nothing else moved, and the row a reader might expect to is named.
  assert.equal(SMOKE_COVERAGE[8].covered, 'negative-half',
    'batch 040 gives the service grants and no policy on two more tables, which is more NEGATIVE evidence. '
    + 'Asserting the positive half would still require inventing the `P` §8.2 leaves undefined.');
  const mentions = Object.values(SMOKE_COVERAGE).filter((v) => /040/.test(v.note));
  assert.ok(mentions.length >= 7,
    'batch 040 extends seven §12.6 notes and moves one row. If a note stopped naming it, either the '
    + "assertion stopped being carried on this batch's tables or the note was rewritten by somebody who did "
    + 'not know it was load-bearing.');
  // The labels this batch introduced are cited by cases, the same way §12.6 labels are. Without this the
  // decision the whole batch turns on could stop being asserted while every §12.6 row stayed green.
  const cited = new Set(cases.flatMap((c) => c.covers ?? []));
  for (const label of ['§4/invariant-3', '§8.2/knowledge-write', '§8.2/knowledge-select',
    '§8.2/knowledge-version-immutable', '§7/editor', '§11.3']) {
    assert.ok(cited.has(label), `${label} is reasoning batch 040 rests on and no case cites it`);
  }
  // And §12.6/7's note says which layer actually refuses a forged id here, rather than claiming a
  // constraint case this schema cannot produce for a caller.
  assert.match(SMOKE_COVERAGE[7].note, /rejected` CASE/,
    "040's INSERT policy checks the scope with the composite foreign keys' own conditions under RLS, so a "
    + 'caller who would violate one is refused by a policy first. A `rejected` case demanding 23503 would '
    + 'assert an outcome a correct database cannot produce, and the note says so rather than the suite '
    + 'faking one.');
  assert.equal(cases.filter((c) => c.expect === 'rejected' && /knowledge/.test(c.id)).length, 0,
    'so there is no such case, and this is what stops one being added without the note changing');
});
