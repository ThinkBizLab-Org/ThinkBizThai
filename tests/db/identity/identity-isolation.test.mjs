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
import { readFile } from 'node:fs/promises';
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
  // Batch 020 created the tables assertion 2 names, and paid HALF of it. The other half —
  // "never A2/Page A2" — is member scope, which is batch 021, so the row reads 'partial' rather
  // than true. A row that claims more than the cases carry is the failure this map exists to
  // prevent; `covered: true` is checked against the citations below.
  assert.equal(SMOKE_COVERAGE[2].covered, 'partial');
  assert.match(SMOKE_COVERAGE[2].note, /021/,
    'a partial coverage claim must name the batch that owes the rest, or it is a note nobody can act on');
  assert.equal(SMOKE_COVERAGE[3].covered, false);
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
