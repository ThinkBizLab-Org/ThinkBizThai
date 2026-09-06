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
  isMutation, resolvePlaceholders,
} from './isolation-cases.mjs';
import { ASSERTION_FOR, ROLE_FOR_HELPER, assumeIdentity, fixtureResolver, runCases } from './run-isolation.mjs';
// Batch 060 widened `schemaLint` to hold a table in `private` to the same rules as one in `app`,
// because §3.1 puts secret references there and the previous pattern matched `app.` alone. The
// widening is exercised HERE rather than only where the migration is read: a lint rule nobody
// probes is a rule whose inertness is a hope.
import { schemaLint } from '../../../scripts/db/run.mjs';
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

// Every migration's text, with line comments stripped, read ONCE. Two rules below need to ask a
// question of the whole set rather than of one batch — "which tables exist in `private`" and "does
// any migration grant anything on one" — and both must read the SET, because the answer is a
// property of the schema and not of the file that happened to be edited.
const MIGRATIONS_DIR = 'db/foundation/migrations';
const migrationNamesInOrder = (await readdir(MIGRATIONS_DIR)).filter((n) => n.endsWith('.sql')).sort();
const migrationText = (await Promise.all(
  migrationNamesInOrder.map((n) => readFile(`${MIGRATIONS_DIR}/${n}`, 'utf8')),
)).join('\n').replace(/--[^\n]*/g, '');

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
    // `private` WAS FORBIDDEN OUTRIGHT AS A DECLARED OBJECT, AND THE RULE IS NARROWED RATHER THAN
    // REMOVED. C0's review D6 found `permission denied for schema private` satisfying a claim about
    // a TABLE, because the harness reaches `private.as_user` and a scaffolding failure raises the
    // same 42501 on the same schema. That failure mode is unchanged and still refused.
    //
    // What changed is that `private` now contains a SUBJECT. §3.1 puts "secret references" there by
    // name and batch 060 creates private.ai_credential_references, whose whole assertion is that
    // every identity — including the service — is refused on the SCHEMA, so that the day somebody
    // writes `grant usage on schema private` the refusal moves to the table and the cases fail.
    // Refusing to let a case say that would leave the strongest control in the batch unassertable,
    // and the only alternative — declaring no layer at all — is the unattributed shape D6 removed.
    //
    // The narrowing is that a case may name `private` ONLY when its own statement names a
    // `private.<table>` A MIGRATION CREATES. No scaffolding failure can satisfy that: the harness
    // touches private FUNCTIONS, and a case whose SQL names none of the migration's private tables
    // is refused here exactly as before.
    if (name === 'private') {
      const privateTables = [...migrationText.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?private\.(\w+)/gi)]
        .map((m) => m[1]);
      assert.ok(privateTables.length > 0,
        `${testCase.id}: declares deniedOn schema private, and no migration creates a table there. `
        + "Until one does, `private` is only the harness's own schema and a refusal on it is the "
        + 'scaffolding failing, which is exactly the shape D6 was about.');
      assert.ok(privateTables.some((t) => new RegExp(`\\bprivate\\.${t}\\b`).test(testCase.sql)),
        `${testCase.id}: declares deniedOn schema private and its statement names no private TABLE `
        + `that a migration creates (found: ${privateTables.join(', ')}). A case refused on private `
        + 'for any other reason is the harness failing to reach a helper.');
    }
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
// A policy's USING and WITH CHECK are two predicates and Postgres stores them in two catalog
// columns. A test that matches the WHOLE policy body passes when one half has been gutted and the
// other still carries the string — which is not hypothetical: TWO probes on this batch reversed a
// USING clause, left the WITH CHECK alone, and were NOT NOTICED until this split existed. A
// narrowing whose USING lost the Page branch filters nothing on read while still refusing the
// write, which reads as a working policy from every angle except the one that matters.
const halvesOf = (policy) => {
  const [before, after] = policy.split(/with\s+check/i);
  assert.ok(after !== undefined, 'the policy carries a WITH CHECK to split on');
  return [['USING', before], ['WITH CHECK', after]];
};

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
  // BOTH HALVES, separately. A probe that rewrote only the USING clause to read
  // app.business_profiles left `from app.knowledge_items` standing in the WITH CHECK and was NOT
  // NOTICED by a whole-body match — which is a narrowing that filters the wrong thing on every read
  // while still refusing the write, and reads as correct from every other angle.
  for (const [half, predicate] of halvesOf(narrowing[0])) {
    assert.match(predicate, new RegExp(`from app\\.${KNOWLEDGE_ITEMS}\\b`),
      `${half}: a version is reachable exactly when its item is, which cannot drift from the item's rule `
      + "because it IS the item's rule — including the page half of it, and including any narrowing a later "
      + 'batch adds');
    assert.doesNotMatch(predicate, /member_scope_admits_(business|page)\(/,
      `${half}: it is NOT a copy of the item's predicate. A copy would have to guess which question to ask `
      + 'about a row that carries no page column, which is the guess this table exists without.');
  }
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
  // BOTH HALVES, separately, and this is not caution: a probe that dropped the Page branch from the
  // USING clause alone was NOT NOTICED by a whole-body match, because the WITH CHECK still carried
  // the string. That schema filters nothing on READ for a page-scoped member while still refusing
  // their writes — the leak, without the symptom.
  const itemNarrowing = restrictive.find((m) => m[2] === KNOWLEDGE_ITEMS)[0];
  for (const [half, predicate] of halvesOf(itemNarrowing)) {
    assert.match(predicate, /case when page_context_profile_id is null/,
      `${half}: the narrowing decides PER ROW which question to ask, because §4 invariant 3 makes the Page `
      + 'scope a nullable override on a row that always carries a Business scope');
    assert.match(predicate, /app\.member_scope_admits_business\(workspace_id, business_profile_id\)/,
      `${half}: the business-level branch`);
    assert.match(predicate, /app\.member_scope_admits_page\(workspace_id, business_profile_id, page_context_profile_id\)/,
      `${half}: and the page-level one. Dropping this branch would admit every member scoped to a SIBLING `
      + 'Page under the same Business, and it would look exactly like a working policy from every other '
      + 'angle: the cross-tenant cases, the Business-scope cases and the suspended case would all still '
      + 'pass.');
    assert.doesNotMatch(predicate, /member_scope_covers_/,
      `${half}: \`admits\`, never \`covers\`. §8's legend reads Y as "active + capability + scope ตรง", so `
      + 'an operation granted to every role is narrowed by scope WHERE ONE EXISTS and not where none does. '
      + '`covers` here would deny every member holding no scope row, which is the reading 021 rejected in '
      + 'its own header.');
  }
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

// RFC-2026-021 was APPROVED while this batch was being written, and it decides two things batch 040
// would otherwise have inherited as convention. A batch that landed beside an approved decision
// touching its own grants and said nothing about it would be leaving a reader to work out whether
// the silence was agreement or ignorance.
test('batch 040 obeys the decision approved beside it about anon and the inherited grants', async () => {
  assert.match(knowledge, /RFC-2026-021/,
    'the batch names the decision it is obeying, so a reader can disagree with the reading rather '
    + 'than with the silence');
  // §7/4: anon is granted nothing, anywhere our migrations reach — not a table, not a column, not a
  // function, and above all not `usage on schema app`, because the first anon grant changes the
  // DENIAL LAYER of every object in app at once.
  assert.doesNotMatch(knowledgeCode, /\bto\s+anon\b/i,
    'RFC-2026-021 §7/4 decides that anon holds nothing anywhere our migrations reach. Batch 030 '
    + 'refused this as a judgement; it is now an approved decision, and the two anonymous cases '
    + 'assert the refusal on the SCHEMA so that widening it fails a test.');
  for (const c of cases.filter((k) => k.as.helper === 'as_anonymous' && /knowledge/.test(k.id))) {
    assert.equal(c.expect, 'denied', `${c.id}: anon holds no privilege, so the refusal is an error `
      + 'and not an empty result');
    assert.deepEqual(c.deniedOn, { kind: 'schema', name: 'app' },
      `${c.id}: refused during name resolution, on the SCHEMA — which is the assertion §7/4 makes `
      + 'checkable. The day anon is granted USAGE on app this moves to the table and fails.');
  }
  // §8.5 names 010, 020 and 021's inherited base-table grants and says the exceptions list must be
  // CLOSED; §10 says those grants are not what the RFC decides and owes them to 170. 030 wrote new
  // ones and 040 writes new ones, so the list will have to enumerate five batches. Recorded here
  // rather than left for whoever writes that list to discover.
  assert.match(knowledge, /§8\.5/,
    'the batch records that its own grants join a list RFC-2026-021 expects to be closed, and why '
    + 'that is a debt rather than a contradiction: every grant here is column-scoped and bounded by '
    + 'a predicate RLS can express, which is the distinction 030 drew about a GLOBAL table');
  for (const grant of knowledgeCode.matchAll(/grant (select|insert|update)([^;]*)on app\.(knowledge_\w+) to authenticated/gi)) {
    assert.match(grant[2], /\(/,
      `app.${grant[3]}: every client grant is COLUMN-SCOPED. RFC-2026-021's own Status line turns on `
      + 'it — "a column-scoped grant is not a table grant, so column drift is loud in the shape '
      + 'batch 010 writes" — so a table-wide grant here would remove the only reason these grants '
      + 'are an inherited shape rather than the failure RFC-2026-012 §2 names.');
  }
  // And the RFC is a decision record this repository digests, so it must be one the tree still has.
  const decisions = await readdir('architecture/decisions');
  assert.ok(decisions.includes('RFC-2026-021-client-read-allowlist.md'),
    'batch 040 cites RFC-2026-021 and the record must exist to be cited');
});

// FOUND BY CI, WHICH IS THE ONLY PLACE IT COULD BE FOUND, and turned into a build error so it
// cannot be found that way twice.
//
// `__SELF__` means "the subject of the identity running this case". Two of the four identity
// helpers have NO subject — `as_anonymous` and `as_service` set a role and a claim set with no
// `sub` — so the substitution yielded `undefined`, the driver inlined it as the literal text
// 'undefined', and Postgres answered 22P02 rather than the 42501 the case demanded. One case in
// 209, invisible to every static rule in this file, and it took a database to say so.
test('__SELF__ is refused for an identity that has no subject to be', () => {
  const scope = { A: id('workspace_a'), B: id('workspace_b') };
  // The two helpers that set a role and a claim set with no `sub`. ROLE_FOR_HELPER is the runner's
  // own map, so this cannot drift into asserting something about helpers that do not exist.
  for (const helper of ['as_anonymous', 'as_service']) {
    assert.ok(ROLE_FOR_HELPER[helper], `${helper} is a helper the runner knows`);
    assert.throws(
      () => resolvePlaceholders({ id: 'probe', as: { helper }, params: ['__SELF__'] }, scope),
      /has no JWT subject to be/,
      `${helper} has no subject, so a case using __SELF__ under it must fail to BUILD rather than `
      + 'reaching a database and coming back 22P02 on a uuid cast');
  }
  // And it still substitutes for an identity that HAS one, so the guard is not simply refusing
  // everything — which is the shape a guard takes when somebody makes it pass by making it inert.
  const substituted = resolvePlaceholders(
    { id: 'probe', as: { helper: 'as_user', subject: id('user_owner_a') }, params: ['__SELF__', '__A__'] },
    scope);
  assert.deepEqual(substituted.params, [id('user_owner_a'), id('workspace_a')]);
  // No case passes the string a missing subject used to produce. This is the failure as CI saw it:
  // the text 'undefined' inlined into a uuid column, answered with 22P02, which expectDenied
  // correctly refuses as not an RLS refusal — one case in two hundred and nine.
  for (const c of cases) {
    for (const param of c.params ?? []) {
      assert.notEqual(String(param), 'undefined',
        `${c.id}: passes the literal text 'undefined' as a parameter`);
    }
  }
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

// =============================================================================================
// Batch 041 — the resolved knowledge contract, and the four things it refuses to decide.
// ======================================================================================//
// This is the first batch in the foundation that creates NO TABLE, so most of the shapes the
// sections above assert have nothing here to be about. What replaces them is a different kind of
// rule, and it exists because the risk in this batch is not a policy written wrongly — it is a
// DECISION MADE QUIETLY. The registry row says "resolved knowledge contract"; the resolution rule
// it names has four inputs and three of them are not in this schema; and the natural object for the
// fourth is a view RFC-2026-021 reserves to an RFC. A batch that had built the obvious thing would
// have chosen a merge order, invented a hard/soft level, and opened the read allowlist, all without
// a line anywhere saying so. So the tests below hold the REFUSALS as tightly as the code.
const RESOLUTION_MIGRATION = 'db/foundation/migrations/041_knowledge_resolution.sql';
const resolution = await readFile(RESOLUTION_MIGRATION, 'utf8');
const resolutionCode = resolution.replace(/--[^\n]*/g, '');
const RESOLUTION_FUNCTION = 'knowledge_scope_applies';
// The predicate, pinned character for character after whitespace is collapsed. This is the whole
// content of the batch, so a test that checked anything less than the expression would be checking
// that a function exists.
const RESOLUTION_BODY = 'select item_business_profile_id is not null '
  + 'and in_business_profile_id is not null '
  + 'and item_business_profile_id = in_business_profile_id '
  + 'and ( item_page_context_profile_id is null '
  + 'or (in_page_context_profile_id is not null '
  + 'and item_page_context_profile_id = in_page_context_profile_id) )';
// The roles the batch says have a caller. Everything else must hold nothing, and the migration's
// apply-time block asserts the negative half against live ACLs because that half is what two
// approved decisions fix.
const RESOLUTION_GRANTEES = ['authenticated', 'app_worker'];

test('batch 041 creates one function and no table, no view and no policy', () => {
  assert.equal([...resolutionCode.matchAll(/create\s+(?:or\s+replace\s+)?function\s+app\.(\w+)/gi)]
    .map((m) => m[1]).join(','), RESOLUTION_FUNCTION,
    'exactly one function, and it is the one the header argues for');
  for (const [kind, pattern] of [
    ['table', /create\s+table\b/i],
    ['view', /create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\b/i],
    ['policy', /create\s+policy\b/i],
    ['index', /create\s+index\b/i],
    ['trigger', /create\s+trigger\b/i],
  ]) {
    assert.doesNotMatch(resolutionCode, pattern,
      `batch 041 creates a ${kind}. It creates one function and nothing else: a VIEW in particular is `
      + 'the allowlist entry RFC-2026-021 §3 reserves to an RFC — five objects and a registry row, '
      + 'against criteria whose C1 ("a named caller exists, and it is a client") fails here because '
      + 'there is no client. The registry calls this batch "resolved knowledge views/functions"; the '
      + "view half of that is not this batch's to write.");
  }
  // A table would also owe a CI negative-control entry, and the absence of one is only honest while
  // the absence of a table is real. The two are asserted together so neither can drift alone.
  assert.doesNotMatch(resolutionCode, /alter\s+table\b/i,
    'batch 041 alters no table. Migration invariant 1 forbids rewriting a merged batch, and every '
    + 'table this contract is about belongs to batch 040.');
});

// The declaration, read once. Both tests below read the FILE — the first version of the guard
// loop compared RESOLUTION_BODY against itself, which is a test asserting a constant, and the probe
// round is what showed it: three separate reversals of the predicate were all noticed by ONE
// assertion, and the loop beside it would have passed against any migration at all.
const resolutionDeclaration = resolutionCode.match(
  /create\s+or\s+replace\s+function\s+app\.knowledge_scope_applies([\s\S]*?)\$\$([\s\S]*?)\$\$/i);
const resolutionBodyText = (resolutionDeclaration?.[2] ?? '').replace(/\s+/g, ' ').trim();

test('the resolution predicate is pinned character for character, because the expression is the batch', () => {
  assert.ok(resolutionDeclaration, 'the function is declared with a dollar-quoted body this test can read');
  assert.equal(resolutionBodyText, RESOLUTION_BODY,
    'THE PREDICATE IS THE BATCH. §4 invariant 3 gives a knowledge row a mandatory Business scope and '
    + 'an optional Page override, so the expression has exactly two branches and each one is a '
    + 'sentence from a document: a business-level row reaches every Page of its Business, and a '
    + 'page-level row reaches its own Page only. Dropping the `is null` branch returns a strict '
    + 'subset and looks like a working query; dropping the `= in_page` branch hands every Page the '
    + 'knowledge of every other. Neither is visible in a row count, so the expression is pinned.');
});

test('the predicate asks both halves of the two-column scope and answers false rather than unknown', () => {
  // The whole-file pin above would catch every one of these, and that is exactly why they are here.
  // Batch 040's scar is a rule about ONE assertion covering two independent properties: its static
  // test and its apply-time block both matched a whole policy body, so gutting half of it went
  // unnoticed. A single `assert.equal` over a whole expression has the same shape — delete it and
  // four different reversals go quiet at once — so the three clauses that carry the meaning are also
  // asserted one at a time, against the FILE.
  for (const [clause, why] of [
    ['item_business_profile_id = in_business_profile_id',
      'the mandatory half of §4 invariant 3: a knowledge row of another Business is never in scope'],
    ['item_page_context_profile_id is null',
      'the business-level branch. Without it a resolved context for a Page contains no Business-level '
      + 'knowledge at all, which is a strict subset and looks like a working query'],
    ['item_page_context_profile_id = in_page_context_profile_id',
      'the page branch. Without it every Page of a Business receives the knowledge restricted to every '
      + 'other Page, which is the leak the nullable override exists to prevent'],
  ]) {
    assert.ok(resolutionBodyText.includes(clause), `${clause} is missing from the predicate — ${why}.`);
  }
  // TOTALITY, as a property of the text rather than only of the apply-time truth table. Every
  // conjunct that can be null carries an `is not null` beside it, because a predicate that answers
  // NULL filters like false in a WHERE and passes like TRUE in a CHECK — one contract, two meanings.
  for (const guarded of ['item_business_profile_id is not null', 'in_business_profile_id is not null',
    'in_page_context_profile_id is not null']) {
    assert.ok(resolutionBodyText.includes(guarded),
      `${guarded} is the guard that keeps the predicate two-valued. Without it the function returns `
      + 'SQL NULL for a scope argument the caller left out, and NULL means the opposite thing in a '
      + 'CHECK constraint from what it means in a WHERE clause.');
  }
  // And the behavioural half, which no static rule can reach: the migration runs the truth table on
  // every apply, so a reversal that survived this file still has to survive a database.
  for (const claim of [
    /a business-level knowledge row does not apply to a Page of its own Business/,
    /a business-level knowledge row does not apply to a request naming no Page/,
    /a page-level knowledge row does not apply to its own Page/,
    /a page-level knowledge row applies to a SIBLING Page of the same Business/,
    /a page-level knowledge row is not definitively excluded from a request naming no Page/,
    /a business-level knowledge row applies outside its own Business/,
    /a page-level knowledge row applies under a Business that is not its own/,
    /app\.knowledge_scope_applies returns NULL rather than false for a null scope/,
  ]) {
    assert.match(resolutionCode, claim,
      `the apply-time truth table no longer raises on ${claim.source}. Every static rule in this file `
      + 'reads TEXT; the truth table reads the function, on three generated uuids, in the database '
      + '`make db-migrate-clean` builds — which is the only place a predicate that parses and means '
      + 'the wrong thing is caught.');
  }
});

test('the resolution predicate names no object, which is what allows it to skip search_path', () => {
  const [, signature, body] = resolutionDeclaration;
  // The deviation from batch 021's helper shape, held to the premise it rests on.
  assert.doesNotMatch(signature, /set\s+search_path/i,
    'the function pins no search_path, which is a deviation from batch 021 and is argued for in the '
    + 'header: the body resolves no object, and a SET clause makes a SQL function opaque to the '
    + "planner's inliner — on the one object whose whole purpose is to be substituted into a filter "
    + 'over the columns §3.3 requires to be indexed.');
  assert.doesNotMatch(body, /\bfrom\b/i,
    'the body reads no relation. That is what makes the missing search_path pin safe AND what makes '
    + 'the contract a filter rather than a permission — a caller sees exactly the rows batch 040 '
    + 'already admits.');
  assert.doesNotMatch(body, /\w\s*\.\s*\w/,
    'the body names no schema-qualified object at all, which is the premise the whole search_path '
    + 'argument rests on. THE DAY THIS FAILS, THE PIN IS REQUIRED — and this assertion is how that '
    + 'day announces itself instead of passing quietly.');
  assert.match(signature, /security\s+invoker/i,
    'invoker mode is written out although it is the default, so a later edit that made this a '
    + 'definer is a visible change to a line rather than the absence of one. A SECURITY DEFINER '
    + "predicate over knowledge would be exactly the way around batch 011's helper that "
    + '`suspended-a-resolves-zero-knowledge-items` exists to refuse.');
  assert.match(signature, /\bimmutable\b/i,
    'the answer is a property of the four arguments and of nothing else — no table, no setting, no '
    + 'clock');
  // And the migration asserts the same three attributes against the live catalog, because a text
  // rule cannot see a function replaced by a later batch.
  for (const claim of [/prosecdef/, /provolatile/, /proconfig/]) {
    assert.match(resolutionCode, claim,
      `the apply-time block reads ${claim.source} from pg_proc, so the attributes above are asserted `
      + 'against the database and not only against this file');
  }
});

test('EXECUTE is revoked from PUBLIC and granted only where batch 041 says there is a caller', () => {
  assert.match(resolutionCode,
    /revoke\s+all\s+on\s+function\s+app\.knowledge_scope_applies\(uuid, uuid, uuid, uuid\)\s+from\s+public/i,
    '§8.5: a helper reachable by PUBLIC is reachable by every present and future role, including ones '
    + 'no batch here created. Batches 011 and 021 revoke first and grant explicitly; so does this one.');
  const granted = [...resolutionCode.matchAll(
    /grant\s+execute\s+on\s+function\s+app\.knowledge_scope_applies\([^)]*\)\s+to\s+(\w+)/gi)]
    .map((m) => m[1]);
  assert.deepEqual(granted, RESOLUTION_GRANTEES,
    'authenticated because it is the request path and already holds column-scoped SELECT on '
    + "app.knowledge_items, and app_worker for a reason that is 040's property rather than symmetry: "
    + '040 grants the service SELECT and NO POLICY so an empty service read is attributable to row '
    + 'level security, and a service that could not EXECUTE this predicate would get 42501 on the '
    + 'FUNCTION instead — the attribution holding for hand-written queries and failing for contract '
    + 'ones. `service-resolves-zero-knowledge-items` is the case that keeps it true.');
  for (const role of ['anon', 'app_command', 'app_maintenance', 'app_authz']) {
    assert.doesNotMatch(resolutionCode, new RegExp(`\\bto\\s+${role}\\b`, 'i'),
      `batch 041 grants ${role} nothing. RFC-2026-021 §7/4 decides anon holds no function EXECUTE `
      + 'anywhere our migrations reach; RFC-2026-020 §6.1/6 pins app_authz to four columns of '
      + 'app.workspace_members; there is no command surface for knowledge.core and the retention path '
      + 'is batch 160.');
  }
  // The negative half is asserted against the live ACLs too, because a grant made by a LATER batch
  // would not appear in this file.
  assert.match(resolutionCode, /has_function_privilege/,
    'the apply-time block sweeps the four roles and PUBLIC against the live ACL, which is the only '
    + 'form in which "we did not grant it" can fail a build after a later batch has run');
  assert.match(resolutionCode, /pg_catalog\.pg_roles/,
    'pg_roles and never pg_authid (batch 020), and here it does a second job: has_function_privilege '
    + 'RAISES on a role that does not exist, so an array of literal role names would turn an absent '
    + 'role into a migration failure that reads like a privilege finding');
  assert.doesNotMatch(resolutionCode, /pg_authid/,
    'a migration that reads pg_authid passes in CI and fails on the platform, where postgres is not a '
    + 'superuser');
});

test('batch 041 adds no client base-table grant, so the closed exceptions list still names five batches', () => {
  // RFC-2026-021 §8.5 says the known-exceptions list enumerating the inherited `authenticated`
  // base-table grants must be CLOSED, and batch 040 recorded that it will have to enumerate five
  // batches rather than three. This is the assertion that stops it becoming six by accident.
  for (const statement of resolutionCode.matchAll(/\b(?:grant|revoke)\b[\s\S]*?;/gi)) {
    assert.match(statement[0], /on\s+function\s+app\.knowledge_scope_applies\b/i,
      'every grant and revoke in batch 041 is about the one function it creates. A base-table grant '
      + 'here would be a SIXTH entry on a list RFC-2026-021 §8.5 requires to be closed, added by a '
      + 'batch that needed no new row privilege at all: the contract filters rows the caller already '
      + 'holds a column-scoped SELECT on.');
  }
  assert.match(resolution, /RFC-2026-021/,
    'the batch names the decision that forbids the object its own registry row calls for, so a reader '
    + 'can disagree with the reading rather than with the silence');
  assert.match(resolution, /C1/,
    'and names the criterion that fails — a named CLIENT caller — rather than refusing on a general '
    + 'unease about views');
});

test('batch 041 adds to the merged batches and rewrites none of them', () => {
  assert.equal([...resolutionCode.matchAll(/drop\s+policy\b/gi)].length, 0,
    'batch 041 drops no policy, because it creates none');
  for (const table of ['workspace_members', 'workspace_member_scopes', 'business_profiles',
    'page_context_profiles', 'industry_assignments', 'knowledge_items', 'knowledge_item_versions']) {
    assert.doesNotMatch(resolutionCode, new RegExp(`alter table app\\.${table}\\b`, 'i'),
      `batch 041 must not alter app.${table}, which belongs to a merged batch`);
  }
  // The industry side is the refusal a reader is most likely to look for, so it is asserted rather
  // than argued. §3 of the workstream document routes a cross-module read through a named contract,
  // and the one it names for industry.core is `resolved_industry_pack_v1`, which does not exist and
  // is A2 Industry's to build.
  for (const table of ['industry_packs', 'industry_pack_versions', 'industry_assignments']) {
    assert.doesNotMatch(resolutionCode, new RegExp(`app\\.${table}\\b`, 'i'),
      `batch 041 reads app.${table}. "Industry base" is the first term of the resolution rule and it `
      + 'is not in this database: batch 030 created no rule content, the industry pack contract makes '
      + 'loading and resolving a Core Runtime act, and a cross-module read belongs to '
      + 'resolved_industry_pack_v1, which does not exist.');
  }
  assert.ok(!resolutionCode.includes("(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid"),
    'the inlined platform identity expression belongs to batch 011 alone — scripts/db/run.mjs holds it '
    + 'to a count of exactly two');
  assert.match(resolutionCode, /gen_random_uuid\(\)/,
    "unqualified, so it resolves from pg_catalog (batch 004). The apply-time truth table's three ids "
    + 'are GENERATED rather than written, because a uuid literal typed into a migration is an invented '
    + 'fixture id and the claims are about the algebra rather than about any row.');
  assert.doesNotMatch(resolutionCode, /(public|extensions)\.gen_random_uuid/,
    'a schema-qualified default runs in one environment and fails in the other');
});

test('the batch names the resolution rule it implements half of, and the decision it refuses to make', () => {
  // The whole finding, held as text, because the finding IS the deliverable. Each of these is a
  // sentence a later reader has to be able to find without re-deriving it.
  assert.match(resolution, /Industry base → Business override → Page override → Content brief/,
    'the resolution rule is QUOTED from docs/plans/core-database-and-rls-workstream-th.md rather than '
    + 'paraphrased, so a reviewer checks the reading against the source and not against a summary');
  assert.match(resolution, /resolved_business_knowledge_v1/,
    'the cross-module read contract knowledge.core owes is named. It appears exactly once in the '
    + 'whole repository — as a table cell — with no schema, no field and no consumer, which is why '
    + 'this batch does not claim to have built it.');
  assert.match(resolution, /policy_conflict/,
    '§4.4 requires a conflict between layers to be RETURNED and forbids silently picking one — '
    + '"ห้ามเลือกค่าหนึ่งเงียบ ๆ" — so last-writer-wins is the one merge rule the documents rule out, '
    + 'and a batch implementing it would have implemented the forbidden thing');
  assert.match(resolution, /level\(hard\|soft\)/,
    'the exception clause of the rule needs a column batch 040 does not have, and the batch says '
    + 'which column and where the blueprint puts it');
  assert.match(resolution, /unique \(business_profile_id, kind\)/,
    'an override needs a key to bind on, and the fixture catalog already records why that key was '
    + 'deliberately not created');
  // The candidate answers, so the decision arrives as a choice rather than as whatever the next
  // batch happens to do first. RFC-2026-018 is the record of the alternative.
  for (const marker of [/\n-- {5}A\. /, /\n-- {5}B\. /, /\n-- {5}C\. /]) {
    assert.match(resolution, marker,
      'the header enumerates the candidate answers to the override question. A gap with no options '
      + 'beside it is a gap the next batch fills by default, which is exactly what RFC-2026-018 '
      + 'records happening.');
  }
  assert.match(resolution, /WHO OWES THE DECISION/,
    'and names the owner. CONTRIBUTING_AGENTS.md puts a contract-meaning change behind an RFC, so the '
    + 'gap has an author, a reviewer and an approver rather than a batch number.');
});

test('every predicate negative is paired with a statement that differs in exactly one argument', () => {
  // The two kinds of negative in the batch 041 block are not interchangeable, and this is the rule
  // that keeps them apart. A negative the PREDICATE produces returns nothing whether row level
  // security is on or off, so it cannot rest on the policy set for its meaning — it rests on a
  // sibling case that runs the same builder, as the same identity, against the same row, with one
  // argument changed, and returns the row.
  const byId = new Map(cases.map((c) => [c.id, c]));
  for (const [negative, positive, differs] of [
    ['owner-a-does-not-resolve-the-sibling-page-knowledge-item-for-page-a1',
      'owner-a-resolves-the-sibling-page-knowledge-item-for-the-sibling-page', 'the Page requested'],
    ['owner-a-does-not-resolve-the-page-scoped-knowledge-item-with-no-page-requested',
      'owner-a-resolves-the-page-scoped-knowledge-item-for-its-own-page', 'whether a Page is named'],
    ['owner-a-does-not-resolve-the-knowledge-item-of-business-a2-under-business-a1',
      'owner-a-resolves-the-knowledge-item-of-business-a2-under-business-a2', 'the Business requested'],
  ]) {
    const no = byId.get(negative);
    const yes = byId.get(positive);
    assert.ok(no && yes, `${negative} and ${positive} must both exist; a predicate negative alone is `
      + 'satisfied by a contract that resolves nothing at all');
    assert.equal(no.expect, 'no-rows');
    assert.equal(yes.expect, 'rows');
    assert.equal(no.as.subject, yes.as.subject,
      `${negative} and ${positive} run as the SAME identity, so ${differs} is the only difference and `
      + 'the refusal cannot be about visibility');
    assert.equal(no.params[no.params.length - 1], yes.params[yes.params.length - 1],
      `${negative} and ${positive} address the SAME row, so ${differs} is what the pair is about`);
    assert.notDeepEqual(no.params.slice(0, -1), yes.params.slice(0, -1),
      `${negative} and ${positive} must differ in the REQUEST, or they are the same case twice`);
  }
});

test('the resolution contract narrows what row level security admits and never widens it', () => {
  const resolutionCases = cases.filter((c) => /resolve/.test(c.id));
  assert.ok(resolutionCases.length >= 15,
    'the batch 041 block is present. Fewer cases than this means the contract is asserted by its '
    + 'apply-time truth table alone, which cannot say anything about row level security.');
  for (const c of resolutionCases) {
    assert.match(c.sql, /app\.knowledge_scope_applies\(business_profile_id, page_context_profile_id,/,
      `${c.id}: the case runs the contract as a FILTER over app.knowledge_items. A case that called `
      + 'the predicate on its own would assert arithmetic the migration already asserts on every '
      + 'apply, on generated uuids, as a nine-cell truth table.');
  }
  // The four cases where the PREDICATE says yes and the database refuses anyway. These are the ones
  // that make the claim in this test's name, and they are pinned by id so deleting one fails the
  // build rather than quietly leaving the claim to the three that remain.
  const filterNotPermission = [
    'owner-a-cannot-resolve-the-knowledge-item-of-business-b1',
    'page-editor-a-cannot-resolve-the-knowledge-item-of-the-sibling-page',
    'suspended-a-resolves-zero-knowledge-items',
    'service-resolves-zero-knowledge-items',
  ];
  for (const id of filterNotPermission) {
    const found = cases.find((c) => c.id === id);
    assert.ok(found, `${id} is missing, and it is one of the four cases that say the contract is a `
      + 'filter rather than a permission');
    assert.equal(found.expect, 'no-rows',
      `${id}: the predicate admits the row and the database returns nothing, which is a filtered read `
      + 'and not a refusal. A `denied` here would mean the caller could not run the contract at all, '
      + 'which is a different (weaker) claim.');
  }
  // And the anonymous case is a refusal rather than an empty read, on the SCHEMA, which is where the
  // decision RFC-2026-021 §7/4 makes is observable.
  const anonymous = cases.find((c) => c.id === 'anonymous-cannot-resolve-a-knowledge-item');
  assert.ok(anonymous, 'the contract is asked of the anonymous identity too');
  assert.equal(anonymous.expect, 'denied');
  assert.deepEqual(anonymous.deniedOn, { kind: 'schema', name: 'app' },
    'anon holds no USAGE on schema app, so name resolution refuses before either the function or the '
    + 'table is reached. The day anon is granted USAGE this moves to the function and the case fails, '
    + 'which is the notice §7/4 is written to produce.');
});

test('batch 041 owes no CI negative-control entry, and says at the entries what it did change', async () => {
  const workflow = await readFile(CI_WORKFLOW, 'utf8');
  const controls = [...workflow.matchAll(/^\s*control\s+app\.(\w+)\s+'([^']+)'\s+(\d+)/gm)];
  assert.equal(controls.filter((entry) => entry[3] === '041').length, 0,
    'no control entry is attributed to batch 041, because it creates no table for row level security '
    + "to be disabled on. The step's own blocker is that nothing fails the build when a batch adds a "
    + 'table and no entry, so a batch that adds no table has to say so somewhere a build can read.');
  assert.match(workflow, /BATCH 041 ADDS NO ENTRY, BECAUSE IT ADDS NO TABLE/,
    'and it says so beside the entries, where a reader of the step finds it');
  // What it DID change: the app.knowledge_items entry now rests on four more cases, and they are
  // pinned here for the reason batch 040 pinned its own — an entry resting on cases nobody names is
  // one deletion away from resting on fewer.
  const itemEntry = controls.find((entry) => entry[1] === KNOWLEDGE_ITEMS);
  assert.ok(itemEntry, 'the app.knowledge_items entry batch 040 wrote is still there');
  const pattern = new RegExp(`^${itemEntry[2]}`);
  for (const id of ['owner-a-cannot-resolve-the-knowledge-item-of-business-b1',
    'page-editor-a-cannot-resolve-the-knowledge-item-of-the-sibling-page',
    'suspended-a-resolves-zero-knowledge-items',
    'service-resolves-zero-knowledge-items']) {
    assert.match(id, pattern,
      `${id} must match the app.knowledge_items control pattern, or batch 041 has added four cases `
      + 'the control cannot see and the comment beside the entry is wrong');
    assert.ok(workflow.includes(id),
      `${id} is named beside the entry it strengthens, so deleting the case and leaving the comment is `
      + 'a diff a reviewer notices');
  }
  // And the three that do NOT strengthen it are named as not doing so, because counting them would
  // be the same error the per-family rewrite fixed one level down: a control credited with cases
  // that would pass with row level security switched off.
  assert.match(workflow, /refused by the PREDICATE, not by row level security/,
    'the step distinguishes the two kinds of negative batch 041 adds, at the point of use');
  const versionEntry = controls.find((entry) => entry[1] === KNOWLEDGE_VERSIONS);
  const versionPattern = new RegExp(`^${versionEntry[2]}`);
  for (const c of cases.filter((k) => /resolve/.test(k.id))) {
    assert.ok(!versionPattern.test(c.id),
      `${c.id} matches the app.knowledge_item_versions pattern. Batch 041 asserts nothing about that `
      + "table — the contract is about the item's two scope columns and a version carries only one of "
      + 'them — so a case of its that matched would credit an entry with evidence it did not earn.');
  }
});

test('the coverage map records that batch 041 moves no row and says what it extended instead', () => {
  // A batch that created no table cannot pay a §12.6 assertion, and claiming otherwise would be the
  // "analogue" error batches 020, 021 and 030 each refused. The row a reader might expect to move is
  // 3, which is `knowledge-half` because content is batch 080.
  assert.equal(SMOKE_COVERAGE[3].covered, 'knowledge-half',
    'batch 041 creates no content table, so §12.6/3 stays exactly where batch 040 left it');
  assert.equal(SMOKE_COVERAGE[8].covered, 'negative-half',
    'batch 041 grants the service EXECUTE on a predicate that reads no relation, which is more '
    + 'NEGATIVE evidence and not a positive: asserting the positive half would still require '
    + 'inventing the `P` §8.2 leaves undefined');
  const partials = Object.values(SMOKE_COVERAGE).filter((v) => v.covered !== true).length;
  assert.equal(partials, 2, 'the two labelled partials are still exactly the two batch 040 left');
  const extended = Object.values(SMOKE_COVERAGE).filter((v) => /041/.test(v.note));
  assert.equal(extended.length, 5,
    'batch 041 extends five §12.6 notes — the tenant boundary, member scope, the suspended member, '
    + 'the anonymous caller and the service — because a new way to REACH a table is a new place to '
    + 'lose a check, even when it is not a new object with rows. If a note stopped naming it, either '
    + 'the assertion stopped being carried through the contract or somebody rewrote a note without '
    + 'knowing it was load-bearing.');
  const authExtended = Object.values(AUTHORIZATION_CASE_COVERAGE).filter((v) => /041/.test(String(v)));
  assert.equal(authExtended.length, 5,
    '§8.6 cases 1, 4, 5, 6 and 7 are the five this batch can be asked about. It adds no write, so 2, '
    + '8 and 9 are untouched; it adds no command function, so 10 is still not applicable.');
  // The labels the batch rests on are cited by cases, the same way §12.6 labels are. Without this
  // the reasoning could stop being asserted while every §12.6 row stayed green.
  const cited = new Set(cases.flatMap((c) => c.covers ?? []));
  for (const label of ['§4.3/resolution-rule', '§4.4/page-override-scope', 'DB03/resolved-context',
    '041/filter-not-permission']) {
    assert.ok(cited.has(label), `${label} is reasoning batch 041 rests on and no case cites it`);
  }
});

// FOUND BY CHECKING, NOT BY READING. The header cited the resolution rule at
// core-database-and-rls-workstream-th.md:210. The rule is at 217; line 210 is a bullet about
// `brand_voice_profiles`. The quotation beside it was correct, the line number was not, and nothing
// in this repository could tell the difference -- which is the same class of defect as a coverage
// note that stops being true: a citation is a claim, and an unchecked claim decays.
//
// So every `<document>.md:<line>` citation in batch 041's migration is resolved against the
// document, and the check runs in BOTH directions: each declared citation must point at a line
// containing the phrase it was cited for, and each citation the migration actually makes must be
// declared here. A new citation therefore has to be added to this table, which is where somebody
// looks at it.
const CITATIONS = [
  ['docs/plans/core-database-and-rls-workstream-th.md', 93, 'resolved_business_knowledge_v1'],
  ['docs/plans/core-database-and-rls-workstream-th.md', 217, 'กฎ resolution'],
  ['docs/plans/core-database-and-rls-workstream-th.md', 555, 'resolved knowledge views/functions'],
  ['docs/sprint-0a/sprint-0a-industry-research-pack-th.md', 115, 'Core Runtime'],
  ['docs/sprint-0a/sprint-0a-industry-research-pack-th.md', 188, '4.4 Rule precedence'],
  ['docs/sprint-0a/sprint-0a-industry-research-pack-th.md', 653, 'Page override/contact/footer'],
];

test('every line batch 041 cites is the line that says what the batch says it says', async () => {
  const declared = new Set();
  for (const [file, line, phrase] of CITATIONS) {
    const lines = (await readFile(file, 'utf8')).split('\n');
    assert.ok(lines.length >= line, `${file} has no line ${line}`);
    assert.ok(lines[line - 1].includes(phrase),
      `${file}:${line} does not contain ${JSON.stringify(phrase)}. It reads: `
      + `${JSON.stringify(lines[line - 1].slice(0, 90))}. A citation is a claim, and this one is the `
      + 'kind a reviewer checks once and nobody checks again.');
    declared.add(`${file.split('/').pop()}:${line}`);
  }
  // The other direction: a citation the migration makes and this table does not declare is one
  // nobody has resolved. The header is the deliverable of this batch, so its references are held to
  // the same standard as its SQL.
  const made = new Set([...resolution.matchAll(/([a-z0-9-]+\.md):(\d+)/g)].map((m) => `${m[1]}:${m[2]}`));
  for (const citation of made) {
    assert.ok(declared.has(citation),
      `batch 041 cites ${citation} and no entry in this test resolves it. Add it, with the phrase the `
      + 'line is cited for -- the first version of this batch cited :210 for a rule that is at :217, '
      + 'and the quotation beside it was correct, which is exactly why nobody noticed.');
  }
  assert.ok(made.size >= 6, 'the header still carries its citations; a batch whose finding IS the '
    + 'deliverable does not get to stop naming where it read things');
});

// ======================================================================================// Batch 050 — the async kernel, and the first family in this schema no identity can read.
// =============================================================================================
//
// Every batch before this one could assert its policies. This one has none, so the static suite
// carries a larger share of the batch than usual and what it holds is different in kind:
//
//   * that the ABSENCE of a client grant and of a policy is a decision written in the file rather
//     than an omission, and that no migration anywhere reverses it;
//   * that the columns are the two CONTRACTS' own properties rather than a design — the opposite of
//     every earlier batch, where §5 named no column and the discipline was to invent none;
//   * that the two natural keys are workspace-scoped, because a retry may not reach across scope and
//     a key that dropped `workspace_id` would pass every other check in this repository.
const ASYNC_MIGRATION = 'db/foundation/migrations/050_async_kernel.sql';
const ASYNC_FIXTURE = 'tests/db/identity/fixtures/050-async-kernel-fixture.sql';
const asyncKernel = await readFile(ASYNC_MIGRATION, 'utf8');
const asyncCode = asyncKernel.replace(/--[^\n]*/g, '');
const JOBS = 'jobs';
const OUTBOX = 'outbox_events';
const LEDGER = 'consumer_ledger';
const ASYNC_TABLES = [JOBS, OUTBOX, LEDGER];
const JOB_CONTRACT = 'contract-catalog/shared-kernel/ctr-job-001/schema.json';
const EVENT_CONTRACT = 'contract-catalog/shared-kernel/ctr-evt-001/schema.json';

// The create-table body of one table, so a column assertion cannot be satisfied by a column of a
// different table in the same file. Three tables in one migration is the first time that matters.
const asyncTableBody = (table) => {
  const m = asyncCode.match(new RegExp(`create table (?:if not exists )?app\\.${table}\\b([\\s\\S]*?)\\n\\);`, 'i'));
  assert.ok(m, `app.${table} has no readable create-table body`);
  return m[1];
};

test('every table batch 050 creates carries RLS, FORCE, a primary key and an owner comment', () => {
  for (const table of ASYNC_TABLES) {
    assert.match(asyncCode, new RegExp(`create table (?:if not exists )?app\\.${table}\\b`, 'i'));
    assert.match(asyncCode, new RegExp(`alter table app\\.${table} enable row level security`, 'i'));
    assert.match(asyncCode, new RegExp(`alter table app\\.${table} force row level security`, 'i'),
      `app.${table}: ENABLE and FORCE are different catalog columns and the data package's own lint rule `
      + 'reads only the first. On a table with NO POLICY that difference is the whole control — without FORCE '
      + 'the table owner reads every row and the isolation suite cannot tell that from a working queue.');
    assert.match(asyncKernel, new RegExp(`comment on table app\\.${table} is`, 'i'));
    assert.match(asyncTableBody(table), /primary key/i, `app.${table} declares no primary key`);
    // §3.3's canonical scope. §5 scopes jobs.kernel to `workspace` and §4's ERD reads
    // WORKSPACE ||--o{ JOB, so every row here is tenant-owned and carries the canonical field.
    assert.match(asyncTableBody(table), /workspace_id\s+uuid\s+not null references app\.workspaces \(id\)/i,
      `app.${table}: §3.3 requires the canonical scope field on every tenant-owned row, NOT NULL and bound to `
      + 'the tenant root. A queue is the family where a reader might expect a global table, and three '
      + 'documents say otherwise — §5, §4\'s ERD and CTR-TEN-001, whose workspace_id is required.');
  }
  // And nothing BELOW the tenant, which is the other half of the same decision. CTR-TEN-001 makes
  // business_profile_id and page_context_profile_id optional properties of the tenant context; §5
  // scopes this family `workspace` and §4 hangs JOB off WORKSPACE alone.
  for (const column of ['business_profile_id', 'page_context_profile_id']) {
    assert.doesNotMatch(asyncCode, new RegExp(`^\\s*${column}\\s`, 'im'),
      `batch 050 declares no ${column} column. §5 scopes jobs.kernel \`workspace\` and §4's ERD gives it no `
      + 'scope below that, so the column would be a scope level two source documents decline. An event about '
      + "a Business records it in CTR-EVT-001's own subject instead.");
  }
});

// THE CENTRAL REFUSAL, held in both directions: no client grant appears anywhere, and the file says
// why rather than leaving an absence to be read as an oversight.
test('the job status projection is not on the client read allowlist, and no migration puts it there', async () => {
  const files = await readdir('db/foundation/migrations');
  const migrations = await Promise.all(files.filter((n) => n.endsWith('.sql')).sort()
    .map(async (name) => [name, (await readFile(`db/foundation/migrations/${name}`, 'utf8')).replace(/--[^\n]*/g, '')]));
  assert.ok(migrations.length >= 12, 'the whole migration set is read, not one file');

  for (const [name, sql] of migrations) {
    for (const table of ASYNC_TABLES) {
      for (const role of ['authenticated', 'anon']) {
        assert.doesNotMatch(sql, new RegExp(`grant\\s[^;]*\\bon\\s+app\\.${table}\\b[^;]*\\bto\\s[^;]*\\b${role}\\b`, 'i'),
          `${name} grants ${role} a privilege on app.${table}. §8.4's "Job redacted status SELECT" grants a `
          + 'REDACTED STATUS — §9.1 gives INTERNAL-3 the client projection "redacted status only" and the next '
          + 'row of the same matrix marks the internal job payload N for every client role — so the object is a '
          + 'security_invoker view, and RFC-2026-012 §2/§3 puts every such view on a read allowlist that starts '
          + 'empty and grows only by RFC. If an RFC has approved this entry, edit this test and name it, add the '
          + 'five objects RFC-2026-021 §3 requires, and rewrite the cases that would now be about a policy.');
      }
    }
    for (const view of sql.matchAll(/create\s+(?:or\s+replace\s+)?view[\s\S]*?;/gi)) {
      for (const table of ASYNC_TABLES) {
        assert.doesNotMatch(view[0], new RegExp(`\\bapp\\.${table}\\b`, 'i'),
          `${name} creates a view over app.${table}. That view IS the allowlist entry RFC-2026-012 §3 reserves `
          + 'to an RFC, and RFC-2026-021 §3 makes it five objects and a registry row rather than one.');
      }
    }
  }

  // The measured state agrees with the decision, which is what stops this being a rule about text.
  const snapshot = JSON.parse(await readFile('db/foundation/lint/catalog-snapshot.json', 'utf8'));
  assert.deepEqual(snapshot.catalog.exposed_views, [],
    'the allowlist is empty in the catalog as well as in the migrations');

  // And the batch states the refusal, with the criteria the candidate meets and the one it fails,
  // because an absence is not a decision until somebody writes down that it is one.
  assert.match(asyncKernel, /RFC-2026-021/,
    'the batch names the decision it is obeying, so a reader can disagree with the reading rather than with '
    + 'the silence');
  assert.match(asyncKernel, /C1 \(a named client caller exists\) FAILS TODAY/,
    "RFC-2026-021 §4's criteria are applied to this candidate rather than cited at it: C1 is the one that "
    + 'fails, and naming it lets the RFC that opens the entry start from a read instead of a blank page');
  assert.match(asyncKernel, /C7 \(a global table states its blast radius\) DOES NOT APPLY/,
    'and the criterion that does NOT apply is named too. app.jobs is a TENANT table, so the blast-radius '
    + "criterion written for a global one is not this candidate's obstacle — which is the difference between "
    + 'this candidate and the industry catalog, and is worth more to the next reviewer than a list of passes.');
});

// The other half of "no policy" — and, unlike the grants, this one has to be checked against an
// approved decision that EXPECTS it to change, which is why it lives here and not in the apply-time
// block. RFC-2026-016 §2 positively requires a `TO app_worker` policy once the GUC is decided.
test('batch 050 writes no policy at all, and argues the refusal instead of omitting it', () => {
  for (const table of ASYNC_TABLES) {
    assert.doesNotMatch(asyncCode, new RegExp(`create policy \\w+ on app\\.${table}\\b`, 'i'),
      `app.${table}: batch 050 writes no policy. §8 has no implementable cell for this family — the client row `
      + 'is a view on an empty allowlist and the service row is an `S` whose shape needs a GUC no document '
      + 'names — and a policy written for a caller that does not exist is a permission nobody reviewed.');
  }
  assert.equal([...asyncCode.matchAll(/create policy/gi)].length, 0,
    'not one policy in the whole file, which is what makes every case in the suite a refusal');
  assert.equal([...asyncCode.matchAll(/drop policy/gi)].length, 0,
    'and no drop either: a batch that dropped a policy it did not create would be rewriting a merged one '
    + '(migration invariant 1)');

  // The three reasons, each pinned, because this is the batch eight others inherit the shape from
  // and a refusal that loses its reason is a refusal the next batch reverses by accident.
  assert.match(asyncKernel, /NO DOCUMENT NAMES THE GUC/,
    'RFC-2026-016 §2 says "a server-set workspace GUC" and spells none. Writing one here would fix the name '
    + 'for batches 051, 061, 070, 100, 110, 120, 131 and 140.');
  assert.match(asyncKernel, /RFC-2026-019 §4\/3/,
    'and the approved decision that says nothing can yet BE app_worker');
  assert.match(asyncKernel, /THE SHAPE DOES NOT FIT THE FIRST TABLE IT WOULD LAND ON/,
    'the third reason is the one no earlier batch could have found: §3.4 specifies a lease claim with FOR '
    + 'UPDATE SKIP LOCKED, and a claim query cannot name a workspace because which workspace the next job '
    + 'belongs to is what reading the row tells you. A workspace-scoped GUC policy either refuses every claim '
    + 'or turns a queue into per-tenant polling. That is a finding about an approved decision and it must not '
    + 'be lost if this file is ever tidied.');

  // And the rule RFC-2026-020 §5/5 makes uniform, held even where there is no policy to break it.
  // A membership table in a FROM or a JOIN is the shape the rule is about; naming one inside a
  // raise hint is not, and the apply-time block quotes RFC-2026-020 §6.1/6 by name.
  for (const table of ['workspace_members', 'workspace_member_scopes']) {
    assert.doesNotMatch(asyncCode, new RegExp(`\\b(from|join)\\s+app\\.${table}\\b`, 'i'),
      `batch 050 must not read app.${table}. RFC-2026-020 §5/5: a predicate that joined a membership table `
      + "would evaluate that scan as the caller, re-entering authenticated's own policy set inside this "
      + "table's evaluation. The batch has no policy today and the rule is asserted anyway, because the first "
      + 'policy added here is the one most likely to reach for the join.');
  }
});

// THE CONTRACT ASSERTION. Every earlier batch had to record that §5 names no column of its family
// and invent none. This one is the opposite case, and the discipline that follows is stricter
// rather than looser: the columns ARE the contract's properties, so a field added to an envelope
// must fail the build here instead of being discovered by a consumer.
test('the async kernel carries every property CTR-JOB-001 and CTR-EVT-001 name', async () => {
  const job = JSON.parse(await readFile(JOB_CONTRACT, 'utf8'));
  const event = JSON.parse(await readFile(EVENT_CONTRACT, 'utf8'));
  const jobsBody = asyncTableBody(JOBS);
  const outboxBody = asyncTableBody(OUTBOX);

  // CTR-JOB-001, minus tenant_context, which §3.3 resolves to workspace_id.
  const jobProperties = Object.keys(job.properties).filter((p) => p !== 'tenant_context');
  assert.ok(jobProperties.length >= 17, 'the contract is read rather than a list of it retyped here');
  for (const property of jobProperties) {
    // `job_id` is the primary key, spelled `id` because §3.2 gives a domain aggregate a uuid and the
    // table is app.jobs — every other property keeps the contract's own name.
    const column = property === 'job_id' ? 'id' : property;
    assert.match(jobsBody, new RegExp(`^\\s*${column}\\s`, 'm'),
      `app.jobs has no column for CTR-JOB-001's \`${property}\`. A migration that contradicts a frozen `
      + 'contract is a defect and one that ignores it is worse: a job envelope this table cannot hold is a '
      + 'queue that drops a field every producer is entitled to send.');
  }
  assert.match(jobsBody, /^\s*id\s+uuid\s+primary key/m,
    "CTR-JOB-001 types job_id string(1..128) and §3.2 requires a uuid for a domain aggregate. A uuid's 36 "
    + 'characters satisfy both, and a text column would have let a producer choose a 128-character key for an '
    + 'aggregate root.');

  // CTR-EVT-001, minus tenant_context, minus payload, and with the three nested objects flattened.
  const flattened = {
    producer: ['producer_module_key', 'producer_implementation_version'],
    subject: ['subject_type', 'subject_id', 'subject_version'],
    metadata: ['schema_ref'],
  };
  for (const property of Object.keys(event.properties)) {
    if (property === 'tenant_context') continue;
    if (property === 'payload') {
      assert.equal(event.properties.payload.maxProperties, 0,
        'if the payload has acquired properties, this batch owes a column for them');
      assert.doesNotMatch(outboxBody, /^\s*payload\s/m,
        'CTR-EVT-001 fixes payload at maxProperties 0 until a domain payload contract is owner-approved, so a '
        + 'payload column would be a column whose only legal value is {}. §5 would also have PERMITTED one — '
        + 'the contract supplies the schema version, the owner and the prohibited fields §5 asks for — which is '
        + 'why the reason recorded is the contract and not the word ban.');
      continue;
    }
    for (const column of flattened[property] ?? [property]) {
      assert.match(outboxBody, new RegExp(`^\\s*${column}\\s`, 'm'),
        `app.outbox_events has no column for CTR-EVT-001's \`${property}\` (expected ${column})`);
    }
  }

  // The patterns are the contracts' own, character for character, because a rule stated in a
  // document and not in a constraint is a rule the database does not have (030).
  assert.ok(asyncCode.includes(event.properties.event_type.pattern),
    "CTR-EVT-001's event_type pattern is a CHECK constraint and not a comment");
  assert.ok(asyncCode.includes(event.properties.metadata.properties.schema_ref.pattern),
    "CTR-EVT-001's schema_ref pattern is a CHECK constraint. Its x-source records that an unconstrained "
    + 'schema_ref accepted file://, javascript:, data:, a protocol-relative authority, traversal and a cloud '
    + 'metadata address across sixteen probed hostile forms.');
  assert.equal([...asyncCode.matchAll(new RegExp(job.properties.input_ref.pattern.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'), 'g'))].length, 2,
    "CTR-JOB-001's reference pattern is a CHECK constraint on both input_ref and result_ref, character for "
    + 'character from the contract — non-capturing groups included, because a rewritten regex is a second '
    + 'source of truth for a rule the contract already states. Its '
    + 'x-reference-rule records the traversal and scheme bypasses the earlier deny-list form permitted, and a '
    + 'worker DEREFERENCES these values.');

  // And the bounds the contract DOES state, versus the four it does not. This batch adds no invented
  // maximum: a CHECK stricter than the wire would reject an envelope the schema accepts.
  for (const property of ['job_type', 'lease_owner', 'progress_stage', 'last_error_code']) {
    assert.equal(job.properties[property].maxLength, undefined,
      `CTR-JOB-001 still leaves \`${property}\` unbounded, while bounding job_id and dedupe_key at 128 after a `
      + 'security review found reference-shaped fields accepting 100000-character values. If its owner has '
      + "since bounded it, this batch's CHECK constraints should gain the bound in the same change — and until "
      + 'then a migration may not amend a contract by being stricter than it.');
  }
  assert.match(asyncKernel, /WHAT THE CONTRACT LEAVES UNBOUNDED, REPORTED AND NOT FIXED/,
    'the four unbounded fields are reported to the contract owner rather than silently constrained, which is '
    + 'the treatment batch 030 gave the undefined CATALOG retention class');
});

// THE ASSERTION THIS BATCH OWES MOST. A ledger keyed on (consumer, event_id) alone would still be
// unique, still make redelivery idempotent within one tenant, and still pass every other check in
// this repository — while letting one tenant's consumption suppress another's redelivery.
test('both natural keys are workspace-scoped, because a retry may not reach across scope', () => {
  assert.match(asyncCode, /unique\s*\(workspace_id,\s*consumer,\s*event_id\)/i,
    'app.consumer_ledger is unique on (workspace_id, consumer, event_id). `event_id` is what is deduplicated, '
    + '`consumer` is why two consumers each get one turn, and `workspace_id` is because a retry may not reach '
    + "across scope — CTR-IDM-001 makes workspace part of an idempotency key's scope by contract, and §11.1/9 "
    + 'states the principle.');
  assert.match(asyncCode, /unique\s*\(workspace_id,\s*dedupe_key\)/i,
    'app.jobs is unique on (workspace_id, dedupe_key). CTR-JOB-001 requires dedupe_key and states no '
    + 'uniqueness; a dedupe key that is not unique deduplicates nothing.');

  // The apply-time block reads both keys out of pg_constraint as COLUMN SETS, which is what catches
  // a key that was narrowed rather than removed — the failure mode a create-table diff hides.
  assert.match(asyncCode, /cols = 'consumer,event_id,workspace_id'/,
    'the apply-time block compares the ledger key as a sorted column set against the live catalog, so dropping '
    + 'workspace_id fails the APPLY and not merely a text match');
  assert.match(asyncCode, /cols = 'dedupe_key,workspace_id'/, 'and the same for the job key');

  // And the reason is recorded with the correction the dispatch to this batch needed, because a
  // positional citation into a numbered list is a defect this repository has now met three times.
  assert.match(asyncKernel, /§12\.6 — the deterministic fixture contract — has EIGHT required/,
    '§12.6 has eight smoke assertions and no ninth. The retry-idempotence sentence this batch applies is item '
    + '9 of §11.1, the export contract; the principle is general and the position was not, and recording that '
    + 'is what stops the next batch inheriting the wrong citation.');
  assert.equal(SMOKE_COVERAGE[9], undefined,
    'and no ninth key is invented in the coverage map. Batch 030 refused to add one for a shape §12.6 has no '
    + 'row for, and this batch keeps that rule.');
});

// The lifecycle refusal, which is what a reader will most want to argue with: a queue with no status
// column looks like a missing feature until you read what CTR-JOB-001's manifest reserves.
test('batch 050 invents no lifecycle vocabulary, in a column, in a CHECK or in an index predicate', async () => {
  const job = JSON.parse(await readFile(JOB_CONTRACT, 'utf8'));
  const manifest = JSON.parse(await readFile('contract-catalog/shared-kernel/ctr-job-001/manifest.json', 'utf8'));
  assert.match(manifest.freeze_boundary, /lifecycle state names and transition policy remain subject to/,
    'the contract reserves the lifecycle to an owner review. If that sentence has been lifted, the refusals '
    + 'below are the ones to revisit — and revisiting them is a decision, which is what this assertion makes '
    + 'someone do.');
  assert.equal(job.properties.status, undefined,
    'CTR-JOB-001 has no status field at all, which is why this batch has no status column');

  const jobsBody = asyncTableBody(JOBS);
  for (const invented of ['status', 'state', 'phase']) {
    assert.doesNotMatch(jobsBody, new RegExp(`^\\s*${invented}\\s+text`, 'im'),
      `app.jobs declares no \`${invented}\` column. §3.2's "Phase 1 state: text + named CHECK" is a rule about `
      + 'HOW a state is stored once someone with the authority has decided what the states ARE, and '
      + "CTR-JOB-001's manifest reserves that decision. A four-value enum here would be four words this "
      + "repository's source of truth never wrote (010's sentence about invitation status).");
  }
  // The lifecycle IS the contract's timestamps and counters, and each of them is present.
  for (const column of ['available_at', 'lease_owner', 'lease_expires_at', 'attempt', 'max_attempts',
    'cancel_requested_at', 'result_ref', 'last_error_code']) {
    assert.match(jobsBody, new RegExp(`^\\s*${column}\\s`, 'm'),
      `app.jobs carries ${column}: the lifecycle is expressed as the fields CTR-JOB-001 names, exactly as batch `
      + "010 expressed an invitation's as expires_at/accepted_at/revoked_at rather than as an enum.");
  }
  // AND THE SAME REFUSAL IN THE PLACE IT IS QUIETEST. A partial index whose predicate named
  // result_ref, cancel_requested_at and the attempt budget would define which jobs are still live.
  const jobIndexes = [...asyncCode.matchAll(/create index[\s\S]{0,200}?\bon app\.jobs\b([\s\S]*?);/gi)];
  assert.ok(jobIndexes.length >= 2, 'the job indexes are read, not assumed');
  for (const [, body] of jobIndexes) {
    assert.doesNotMatch(body, /\bwhere\b/i,
      'no index on app.jobs carries a predicate. The obvious claimability index would define which jobs are '
      + 'still live, and an index predicate is a quieter place to put a decision than a CHECK constraint, not '
      + 'a weaker one.');
  }
  assert.match(asyncKernel, /NO PARTIAL INDEX EXPRESSING CLAIMABILITY/,
    'and the refusal is stated, so the batch that decides the lifecycle knows what it is unlocking');

  // No app.job_attempts and no dead-letter table, with the reason each refusal rests on.
  for (const refused of ['job_attempts', 'job_dead_letter', 'dead_letter_queue', 'job_dlq']) {
    assert.doesNotMatch(asyncCode, new RegExp(`create table (?:if not exists )?app\\.${refused}\\b`, 'i'),
      `batch 050 creates no app.${refused}`);
  }
  assert.match(asyncKernel, /NO `app\.job_attempts`, AND THE REASON IS THE CONTRACT RATHER THAN THE REGISTRY/,
    "§4's ERD does carry JOB_ATTEMPT, so \"the registry does not name it\" would be a thin reason on its own. "
    + 'The deciding one is that CTR-JOB-001 models attempts as scalars on the envelope — attempt, max_attempts '
    + 'and last_error_code — and nothing in this schema could keep a table and a counter equal, which is 021\'s '
    + "reason for refusing current_version_id and 030's for refusing industry_pack_id.");
});

test('the ledger is append-only, the outbox envelope is immutable but for one column, and nothing is deletable', () => {
  // The ledger. §8.6 case 9 is "Immutable/LEDGER row → update/delete fail" and this is the first
  // ledger in the schema; four batches have carried that case on version tables only.
  assert.doesNotMatch(asyncCode, new RegExp(`grant\\s+[^;]*update[^;]*\\bon\\s+app\\.${LEDGER}\\b`, 'i'),
    'no role holds UPDATE on app.consumer_ledger. A ledger row that can be edited makes a redelivery '
    + 'replayable, which is the one thing the table exists to prevent.');
  assert.doesNotMatch(asyncTableBody(LEDGER), /updated_at/i,
    "and it carries no updated_at, because an append-only row has no update to stamp (020's rule about its "
    + 'version tables, one family over)');
  assert.doesNotMatch(asyncCode, new RegExp(`create trigger set_updated_at before update on app\\.${LEDGER}\\b`, 'i'),
    'and no trigger for one');

  // The outbox. One granted column and every other one ungranted, asserted here from the text and in
  // the apply-time block from the live ACL — because a grant made by a LATER batch appears in
  // neither this file nor a diff of it.
  const outboxUpdates = [...asyncCode.matchAll(new RegExp(`grant\\s+update\\s*\\(([^)]*)\\)\\s*on\\s+app\\.${OUTBOX}\\b`, 'gi'))];
  assert.equal(outboxUpdates.length, 1, 'exactly one UPDATE grant on the outbox');
  assert.equal(outboxUpdates[0][1].trim(), 'dispatched_at',
    'and it names dispatched_at alone. §10 retains an outbox row "until consumers ack + 30 days", so the row '
    + 'has to record having been published — and a role that could rewrite event_type, producer_module_key or '
    + 'subject_id could re-aim an event every consumer downstream routes on, after the transaction that '
    + 'produced it committed.');
  assert.match(asyncCode, /a column of the outbox envelope other than dispatched_at is updatable/,
    'the apply-time block walks every other column against six roles, which is what catches a later batch');

  // No DELETE anywhere, for anybody.
  for (const table of ASYNC_TABLES) {
    assert.doesNotMatch(asyncCode, new RegExp(`grant\\s+[^;]*delete[^;]*\\bon\\s+app\\.${table}\\b`, 'i'),
      `no role holds DELETE on app.${table}. §8.5 has no broad user delete, and every purge in this family is a `
      + 'retention sweep — JOB-SHORT, OUTBOX-SHORT and CONSUMER-LEDGER — which batch 160 owns through '
      + 'app_maintenance, granted nothing here.');
  }
  assert.doesNotMatch(asyncCode, /\bto\s+app_maintenance\b/i,
    'and app_maintenance holds nothing: a grant issued ahead of the thing that needs it is a grant nobody '
    + 'reviews against a caller (010)');
  assert.doesNotMatch(asyncCode, /\bto\s+app_command\b/i,
    'nor app_command, which owns command functions this batch does not write — and whose absence is exactly '
    + "what §3.4's outbox atomicity and §8.6 case 10 are owed to");

  // §3.2's identifier rule for a high-volume append-only row, which this is the first batch to need.
  for (const table of [OUTBOX, LEDGER]) {
    assert.match(asyncTableBody(table), /id\s+bigint generated always as identity primary key/i,
      `app.${table} keys on a bigint GENERATED ALWAYS AS IDENTITY, which is §3.2's rule for an append-only `
      + 'event or ledger at volume. ALWAYS and not BY DEFAULT: under BY DEFAULT a writer may supply its own '
      + "position in an ordered log, and the outbox's id IS the relay's cursor.");
  }
  assert.match(asyncCode, /a\.attidentity <> 'a'/,
    "and the apply-time block reads attidentity from the catalog, because 'always' in the DDL and 'always' in "
    + 'pg_attribute are two different claims until one is checked against the other');
});

test('the outbox and the ledger record what §3.4 and §10 say, and no foreign key between them', () => {
  // §3.4's atomicity rule, and the fact that no write path in this schema can satisfy it.
  assert.match(asyncKernel, /Domain state และ outbox event เขียน transaction เดียวกัน/,
    "§3.4's rule is quoted rather than paraphrased, because the batch's central finding is that it cannot be "
    + 'satisfied and a paraphrase is a place for that to soften');
  assert.match(asyncKernel, /WHY NOT A TRIGGER/,
    "and the obvious workaround is refused in writing: a trigger on another module's table is forbidden by "
    + "migration invariant 1 and by §3.4's own last bullet, and batch 040 refused to invent one for the "
    + 'adjacent gap');

  // §10's two retention classes, and the constraint their difference decides.
  assert.doesNotMatch(asyncCode, new RegExp(`references app\\.${OUTBOX}\\b`, 'i'),
    'app.consumer_ledger has NO foreign key to app.outbox_events. §10 purges an outbox row at ack + 30 days '
    + 'and keeps a ledger row for 180 days or the max replay window, so the key would take the ledger row with '
    + 'the event — destroying the replay safety the longer window exists for. "No FK" is the kind of absence a '
    + 'later reader adds without knowing what it buys.');
  assert.match(asyncKernel, /OUTBOX-SHORT/, 'and the class that decides it is named');
  assert.match(asyncKernel, /CONSUMER-LEDGER/, 'as is the other one');

  // §5 names a retention class §10 does not define, for the second time in this schema.
  assert.match(asyncKernel, /defines NO CLASS CALLED `LEDGER`/,
    "§5 assigns this family JOB-SHORT/LEDGER and §10's twenty-six-row table has no LEDGER row. Batch 030 "
    + 'reported the same defect about CATALOG; two families now name a class the retention baseline does not '
    + 'define, which is a finding about §10 rather than about either batch.');
  // And no number is encoded, because §10's own approval owns them (§15). The window appears in a
  // table COMMENT — where §5 and §10 are quoted — and nowhere a constraint could enforce it.
  assert.doesNotMatch(asyncCode, /interval\s*'/i,
    "no retention window is written into a constraint, a default or an index predicate. Batch 160 owns the "
    + "job and §10's own Product/Security/Legal approval owns the numbers; a number the schema enforced "
    + 'would read as ratified (§15).');
  for (const table of ASYNC_TABLES) {
    assert.doesNotMatch(asyncTableBody(table), /\b(30|90|180)\b/,
      `app.${table}'s definition contains no retention day count. The three classes §10 gives this family — `
      + 'JOB-SHORT, OUTBOX-SHORT and CONSUMER-LEDGER — carry numbers, and none of them is a constraint.');
  }
  // What IS provided is the column each sweep reads and an index over it, which is 010's treatment
  // of expires_at for TOKEN-SHORT before that job existed either.
  assert.match(asyncCode, /create index if not exists consumer_ledger_window_idx\s+on app\.consumer_ledger \(consumed_at\)/i,
    '§10 purges the ledger "by partition/window" and this is the column that window is over');
});

test('batch 050 adds to the merged batches and rewrites none of them', () => {
  for (const table of ['workspaces', 'workspace_members', 'workspace_member_scopes', 'business_profiles',
    'page_context_profiles', 'industry_assignments', 'knowledge_items']) {
    assert.doesNotMatch(asyncCode, new RegExp(`alter table app\\.${table}\\b`, 'i'),
      `batch 050 must not alter app.${table}, which belongs to a merged batch`);
  }
  assert.doesNotMatch(asyncCode, /\bto\s+app_authz\b/i,
    'no grant and no policy names app_authz. RFC-2026-020 §5/3 gives it exactly one policy and §6.1/6 pins its '
    + 'grants; 050 creates no helper and needs no exemption.');
  assert.match(asyncCode, /pg_catalog\.pg_roles/,
    'pg_roles and never pg_authid: pg_authid is readable only by a superuser, and a migration that needs one '
    + 'to apply cannot be applied on the platform it targets (batch 020 found this)');
  assert.doesNotMatch(asyncCode, /pg_authid/,
    'a migration that reads pg_authid passes in CI and fails on the platform');
  assert.ok(!asyncCode.includes("(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid"),
    'the inlined platform identity expression belongs to batch 011 alone — scripts/db/run.mjs holds it to a '
    + 'count of exactly two');
  assert.match(asyncCode, /gen_random_uuid\(\)/,
    'unqualified, so it resolves from pg_catalog, which is always on the search path (batch 004)');
  assert.doesNotMatch(asyncCode, /(public|extensions)\.gen_random_uuid/,
    'a schema-qualified default runs in one environment and fails in the other');
  assert.match(asyncCode, /private\.set_updated_at\(\)/,
    "§3.2's updated_at comes from batch 000's helper and is not reimplemented");
  // §3.3 forbids these synonyms outright in the canonical domain schema.
  for (const synonym of ['tenant_id', 'organization_id', 'brand_id', 'page_id']) {
    assert.doesNotMatch(asyncCode, new RegExp(`\\b${synonym}\\b`), `§3.3 forbids the synonym ${synonym} outright`);
  }
});

test('the batch 050 fixture writes only catalog identities and loads rows no identity can read', async () => {
  const known = new Set(Object.values(JSON.parse(await readFile(CATALOG, 'utf8')).identities).map((e) => e.uuid));
  const fixture = (await readFile(ASYNC_FIXTURE, 'utf8')).replace(/--[^\n]*/g, '');
  const used = new Set([...fixture.matchAll(UUID)].map((m) => m[0]));
  assert.ok(used.size > 0, 'the fixture must actually load rows');
  for (const value of used) {
    assert.ok(known.has(value), `the fixture writes ${value}, which is not a catalog identity. A fixture id `
      + 'nobody can recompute is an unverifiable constant.');
  }
  // Both tenants, so that every `service-sees-zero-*` case addresses one workspace's row while the
  // other tenant's sits beside it.
  for (const symbol of ['workspace_a', 'workspace_b', 'outbox_event_a', 'outbox_event_b']) {
    assert.ok(used.has(id(symbol)), `the fixture must load ${symbol}`);
  }
  // The ledger rows name the SAME consumer in two workspaces, which is what makes workspace_id's
  // place in the natural key legible as data rather than only as a constraint.
  assert.equal([...fixture.matchAll(/'fixture\.consumer'/g)].length, 2,
    'one consumer, two workspaces, two ledger rows. A key without workspace_id would have collapsed them the '
    + 'moment the two events shared an id.');
  // No status value, because there is no status column.
  assert.doesNotMatch(fixture, /\bstatus\b/i,
    'the fixture invents no lifecycle value either. A fixture is where a vocabulary nobody decided arrives '
    + 'most quietly.');
  // And the runner loads it, in order, or none of the above is reached.
  const runner = await readFile('tests/db/identity/run-isolation.mjs', 'utf8');
  assert.match(runner, /050-async-kernel-fixture\.sql/,
    'the runner applies this fixture. A fixture no runner loads is a file, not a fixture.');
});

test('the tables batch 050 adds have their own entries in the CI negative control', async () => {
  const workflow = await readFile(CI_WORKFLOW, 'utf8');
  const controls = [...workflow.matchAll(/^\s*control\s+app\.(\w+)\s+'([^']+)'\s+(\d+)/gm)];
  assert.ok(controls.length >= 12, 'the control runs per table family, and batch 050 adds three');

  // WHAT IS DETECTABLE HERE IS A DIFFERENT SET FROM EVERY EARLIER BATCH, and the predicate says so.
  // No client role holds anything, so a `denied` case whose layer is `grant` passes unchanged with
  // row level security off. The two outcomes that DO change are a filtered read and a policy-layer
  // write refusal — which is why each entry rests on exactly two cases rather than on a count.
  const flips = (c) => c.expect === 'no-rows' || c.expect === 'no-effect'
    || (c.expect === 'denied' && c.deniedBy === 'policy');
  for (const table of ASYNC_TABLES) {
    const entry = controls.find(([, named]) => named === table);
    assert.ok(entry, `app.${table} has no negative-control entry. The step disables row level security on one `
      + "table and requires a failed case whose id matches that table's pattern; a batch that adds a table and "
      + "no entry widens the gap the step's own blocker names.");
    assert.equal(entry[3], '050', `app.${table}: the entry is attributed to the batch that owes it`);
    const pattern = new RegExp(`^${entry[2]}`);
    const detectable = cases.filter((c) => pattern.test(c.id) && flips(c));
    assert.equal(detectable.length, 2,
      `app.${table}: ${detectable.length} case(s) matching /${entry[2]}/ would change behaviour with row level `
      + 'security disabled, and this entry rests on exactly two — the filtered service read and the '
      + 'policy-layer service insert. A control naming a pattern nothing matches reports a pass it did not '
      + 'earn, and one resting on more cases than it claims is a count nobody checked.');
  }
  // The three patterns must not overlap, or one entry is satisfied by another table's regression.
  const patterns = ASYNC_TABLES.map((t) => new RegExp(`^${controls.find(([, n]) => n === t)[2]}`));
  for (const c of cases) {
    assert.ok(patterns.filter((p) => p.test(c.id)).length <= 1,
      `${c.id} matches more than one batch 050 control pattern, so each entry could be satisfied by another `
      + "table's regression");
  }
  // The six cases are pinned by id and outcome, so deleting one fails the build instead of leaving
  // an entry that disables something nothing notices.
  for (const [table, name, expect] of [
    [JOBS, 'service-sees-zero-job-rows', 'no-rows'],
    [JOBS, 'service-cannot-enqueue-a-job-row', 'denied'],
    [OUTBOX, 'service-sees-zero-outbox-events', 'no-rows'],
    [OUTBOX, 'service-cannot-publish-an-outbox-event', 'denied'],
    [LEDGER, 'service-sees-zero-consumer-ledger-rows', 'no-rows'],
    [LEDGER, 'service-cannot-record-a-consumer-ledger-row', 'denied'],
  ]) {
    const found = cases.find((c) => c.id === name);
    assert.ok(found, `app.${table}'s negative-control entry rests on ${name}, which is missing`);
    assert.equal(found.expect, expect, `${name}: the outcome the control depends on`);
    if (expect === 'denied') {
      assert.equal(found.deniedBy, 'policy',
        `${name}: only a POLICY-layer refusal is restored by disabling row level security. app_worker holds `
        + 'the INSERT grant, so this insert succeeds the moment the policy set stops refusing it — a '
        + 'grant-layer refusal would pass unchanged and the control would report a detection it did not make.');
    }
  }
  assert.match(workflow, /THE THREE ASYNC-KERNEL TABLES, AND WHY EACH ENTRY RESTS ON EXACTLY TWO CASES/,
    'each entry says beside itself what disabling row level security on that table would let through, because '
    + 'a control whose mechanism lives only in a test is a control nobody reads at the point of use');
});

// What batch 050 claims about its own coverage, and — more usefully — what it says it did NOT cover.
// It moves no row, and the two a reader might expect it to move are the interesting ones.
test('the coverage map records what a family with no reader cannot carry', () => {
  // §12.6/1 and §8.6/5 are the tenant boundary, and this is the first batch that creates TENANT
  // tables and cannot assert one: no identity can read the rows, so there is nothing to observe the
  // boundary through. Counting the uniform grant-layer refusal as isolation would be exactly the
  // error batch 030 refused to make about its global rows.
  assert.equal(SMOKE_COVERAGE[1].covered, true, 'the row does not move — it was true before this batch');
  assert.match(SMOKE_COVERAGE[1].note, /050/,
    "§12.6/1's note must name batch 050 and say that its three tables are NOT counted");
  assert.match(SMOKE_COVERAGE[1].note, /no identity can read/i,
    'and say why: a table nobody can read has no observable tenant boundary, which is a different sentence '
    + "from batch 030's about rows that belong to no tenant");

  // §12.6/8 gains more negative evidence and no positive, for the sixth batch running.
  assert.equal(SMOKE_COVERAGE[8].covered, 'negative-half',
    "batch 050 owns the schema's FIRST `S` cell and still writes the service no policy, so the positive half "
    + 'stays unasserted. Asserting it would require choosing the workspace GUC no document names.');
  assert.match(SMOKE_COVERAGE[8].note, /first `S` cell/,
    'and the note records that this is the batch where the `S` shape arrived, because 010 predicted it by name '
    + 'and the next reader should find the answer where the question was sent');

  // The suspended and anonymous rows: one is extended honestly, the other is not claimed at all.
  assert.match(SMOKE_COVERAGE[6].note, /050/, 'anonymous is asserted on all three tables');
  assert.match(SMOKE_COVERAGE[5].note, /analogue/,
    '§12.6/5 is NOT claimed on this family: a suspended member refused where every active member is also '
    + 'refused has been refused by the privilege system, not by suspension. The three cases are labelled '
    + 'analogues and the note says so.');
  const suspended = cases.filter((c) => (c.covers ?? []).includes('§12.6/5-analogue'));
  assert.equal(suspended.length, 3, 'one analogue per batch 050 table, labelled rather than counted');

  // §8.6 case 9 names a LEDGER and this is the first one in the schema.
  assert.match(AUTHORIZATION_CASE_COVERAGE[9], /consumer_ledger/,
    '§8.6 case 9 reads "Immutable/ledger row → update/delete fail". Four batches have carried it on immutable '
    + 'VERSION tables; app.consumer_ledger is the other noun in that sentence.');
  const grid = cases.filter((c) => /consumer-ledger/.test(c.id) && (c.covers ?? []).includes('§8.6/9'));
  assert.equal(grid.length, 4,
    'all four cells: update and delete, by the workspace owner and by the service. A schema that granted one '
    + 'of the four would be caught by exactly one of these cases.');

  // §8.6 case 10 names the OUTBOX by that word, and batch 040 recorded that it "does not exist yet".
  // It exists now and the case is still unpayable, which is a more precise statement than before.
  assert.match(AUTHORIZATION_CASE_COVERAGE[10], /050/,
    '§8.6 case 10 is "Authorized server command → pass + expected audit/outbox". The outbox table now exists '
    + 'and the case is still not payable, because the missing half is the COMMAND — a sharper claim than batch '
    + '040 could make and the one this batch is entitled to.');
  assert.match(AUTHORIZATION_CASE_COVERAGE[8], /050/,
    '§8.6 case 8 is a forged created_by, and this family has no such column: §3.2 adds the actor columns for a '
    + 'USER MUTATION and §8 grants no client any write here. The disposition says so rather than leaving the '
    + 'case silently uncounted.');
});
// Batch 060 — the AI gateway, and the first batch that writes no policy at all.
// =============================================================================================
//
// Every other batch's tests ask whether the right cells were implemented. This one has to ask a
// different question, because §8's four matrices contain NO ROW for a model registry and NO ROW for
// a model policy: the tests below hold the batch to the ABSENCES it chose, and hold each absence to
// a reason a reader can disagree with. An absence with no rule behind it is indistinguishable from
// a batch that forgot.
const AI_MIGRATION = 'db/foundation/migrations/060_ai_gateway.sql';
const AI_FIXTURE = 'tests/db/identity/fixtures/060-ai-gateway-fixture.sql';
const ai = await readFile(AI_MIGRATION, 'utf8');
const aiCode = ai.replace(/--[^\n]*/g, '');
const AI_MODELS = 'ai_models';
const AI_POLICIES = 'ai_model_policies';
// Named for what the table HOLDS -- a reference -- rather than for the thing it deliberately does
// not hold. That is also what keeps the repository's own secret scan quiet: its
// `secret-named-assignment` rule fires on any UPPERCASE constant containing CREDENTIAL that is
// assigned a value of eight characters or more, and it fired on the first draft of this line. A
// scanner that cannot tell a table name from a key is behaving correctly; the fix is the name.
const AI_REFERENCES = 'ai_credential_references';
// DEC-014's five providers, lowercased. The decision register sits at position 2 of
// CONTRIBUTING_AGENTS.md's conflict order and the Product Master Plan — which spells three of them
// by vendor instead — sits at 5, so these are the spellings that win. §3.2 makes them changeable by
// migration only, which is what a named CHECK is for.
const AI_PROVIDERS = ['openai', 'claude', 'gemini', 'grok', 'openrouter'];
// The §9.2 permitted column list, plus the conventions §3.2/§3.3 require of any row and the one
// column §11.4 step 2 names. This is the SAME list the migration's apply-time block holds the live
// catalog to, and the test below requires the two to agree — a permitted set with two homes that
// can differ is a permitted set nobody maintains.
const CREDENTIAL_COLUMNS_PERMITTED = ['id', 'workspace_id', 'provider', 'credential_reference',
  'fingerprint', 'created_at', 'updated_at', 'rotated_at', 'expires_at', 'revoked_at',
  'created_by', 'updated_by'];

test('every batch 060 table carries RLS, FORCE, a primary key and an owner comment', () => {
  for (const [schema, table] of [['app', AI_MODELS], ['app', AI_POLICIES], ['private', AI_REFERENCES]]) {
    assert.match(aiCode, new RegExp(`create table if not exists ${schema}\\.${table}\\b`),
      `${schema}.${table} is created by batch 060`);
    assert.match(aiCode, new RegExp(`alter table ${schema}\\.${table} enable row level security`),
      `${schema}.${table} enables row level security`);
    assert.match(aiCode, new RegExp(`alter table ${schema}\\.${table} force row level security`),
      `${schema}.${table} FORCES it — ENABLE alone leaves the table owner exempt, and on a table with `
      + 'no policy the owner is the only identity FORCE has left to refuse');
    assert.match(aiCode, new RegExp(`comment on table ${schema}\\.${table} is`),
      `${schema}.${table} carries an owner comment (§3.1)`);
    assert.match(ai.slice(ai.indexOf(`create table if not exists ${schema}.${table}`)).slice(0, 4000),
      /primary key/i, `${schema}.${table} declares a primary key`);
  }
  // NOT "and a policy", which every batch before 030 asserted. The absence is the next test.
});

test('batch 060 writes no policy and no client grant, and says which silence decides it', () => {
  // The whole batch, not one table: this is the first migration in the repository with an empty
  // policy set everywhere, and a single `create policy` appearing later would be a permission
  // nobody reviewed against a §8 cell that does not exist.
  assert.equal((aiCode.match(/create\s+policy/gi) ?? []).length, 0,
    'batch 060 writes no policy at all. §8 has no row for a model registry or a model policy in any '
    + 'of its four matrices, so there is no cell to implement, and a policy here would be a '
    + 'permission invented rather than implemented.');
  assert.equal((aiCode.match(/drop\s+policy/gi) ?? []).length, 0,
    "and it drops none either, so it cannot have touched a merged batch's policy set");
  // THE OTHER DIRECTION, over the WHOLE migration set, which is what makes the header's claim true
  // rather than a statement about one file: no migration anywhere attaches a policy to a table this
  // batch creates. A policy added by a LATER batch would not appear in 060_ai_gateway.sql at all,
  // and it would silently turn three grant-layer refusals into policy-layer ones while every case
  // above still declared `grant`.
  for (const target of [`app.${AI_MODELS}`, `app.${AI_POLICIES}`, `private.${AI_REFERENCES}`]) {
    assert.doesNotMatch(migrationText, new RegExp(`create\\s+policy[\\s\\S]{0,200}?\\bon\\s+${target.replace('.', '\\.')}\\b`, 'i'),
      `a migration attaches a policy to ${target}. §8 has no row for this family, RFC-2026-012 §3 `
      + 'gives the client read to an RFC and RFC-2026-021 fixes what an entry is — so a policy here '
      + 'arrives with that decision or it arrives without a reviewer.');
  }
  // §5/5 of RFC-2026-020, asserted even though this batch writes no policy to break it. The rule is
  // that membership is read through batch 011's helpers and never by joining the membership tables,
  // and a batch with no policy at all is the cheapest possible place for it to hold — which is why
  // it is asserted over the whole FILE rather than over its (empty) policy set: the day somebody
  // adds a policy here, the join they must not write is already refused.
  //
  // The JOIN SHAPE and not the name, because the apply-time block's own error hints quote
  // "four columns of app.workspace_members" when they explain what app_authz may reach — and a rule
  // that cannot tell a citation from a scan is a rule somebody works around by rewording a message.
  for (const membership of ['workspace_members', 'workspace_member_scopes']) {
    assert.doesNotMatch(aiCode, new RegExp(`\\b(?:from|join|update|into)\\s+app\\.${membership}\\b`, 'i'),
      `060_ai_gateway.sql reads app.${membership} directly. A policy that joins a membership table `
      + "evaluates that scan as the CALLER, so `authenticated`'s whole policy set on another module's "
      + "table expands inside this one's evaluation (RFC-2026-020 §5/5, and batch 020's reason "
      + 'unchanged).');
  }

  // No grant to a client role, anywhere in the batch. This is RFC-2026-012 §2/§3 and RFC-2026-021's
  // empty allowlist, held to the migration TEXT — the same shape batch 030's catalog rule uses,
  // because the allowlist is designed to GROW and an apply-time assertion about it would be the
  // trap 011 set for 021.
  for (const role of CLIENT_ROLES) {
    assert.doesNotMatch(aiCode, new RegExp(`grant[\\s\\S]{0,300}?\\bto\\s+${role}\\b`),
      `batch 060 grants ${role} nothing. RFC-2026-012's inventory classifies this family "view only" `
      + 'and RFC-2026-021 keeps the read allowlist empty until a client caller exists (C1); a grant '
      + "here would be a sixth row on §8.5's closed list of inherited base-table grants, added by a "
      + 'pull request rather than by the RFC that owns it.');
  }
  // And the reasoning is IN THE FILE, not only in a review comment. A batch whose most consequential
  // property is an absence has to say why, where the next author reads it.
  for (const cited of [/RFC-2026-012/, /RFC-2026-021/, /§8 HAS NO ROW/i, /DEC-014/, /OPEN-004/]) {
    assert.match(ai, cited, `060_ai_gateway.sql names ${cited} in its own header`);
  }
});

test('the credential reference lives in private and holds only the columns §9.2 permits', () => {
  // §3.1 puts "secret references" in `private`, with no direct grant, reachable by server or worker
  // through a typed service only; §14's gate checklist requires a secret table not be exposed; and
  // `app` is the exposed schema. A batch that put this table in `app` would fail that box on the
  // day somebody read it, so the schema is asserted rather than assumed.
  assert.match(aiCode, new RegExp(`create table if not exists private\\.${AI_REFERENCES}\\b`),
    'the credential reference is in `private` (§3.1), not in the exposed schema');
  assert.doesNotMatch(aiCode, new RegExp(`create table[^;]*app\\.${AI_REFERENCES}\\b`),
    'and not in `app`');

  const body = aiCode.slice(aiCode.indexOf(`create table if not exists private.${AI_REFERENCES}`));
  const definition = body.slice(0, body.indexOf(');'));
  // Every column the table declares must be in the permitted set. Read from the definition rather
  // than from the apply-time block, so the two are independent statements of the same rule and the
  // test below can require them to agree.
  const declared = [...definition.matchAll(/^\s{2}(\w+)\s{2,}(?:uuid|text|timestamptz)\b/gm)].map((m) => m[1]);
  assert.ok(declared.length >= 10, `the column list was parsed, got ${JSON.stringify(declared)}`);
  for (const column of declared) {
    assert.ok(CREDENTIAL_COLUMNS_PERMITTED.includes(column),
      `private.${AI_REFERENCES}.${column} is outside §9.2's permitted list. "Secret table เก็บได้เพียง `
      + 'credential_reference, provider, fingerprint/last-four-like identifier, status, '
      + "created/rotated/expired timestamps และ audit reference\" — plus §3.3's canonical scope and "
      + "§3.2's convention columns. A column outside that is a credential, a ciphertext of one, or a "
      + 'field nobody classified.');
  }
  assert.ok(declared.includes('credential_reference'),
    'and the reference itself is there: an allowlist alone is satisfied by a table with no columns, '
    + 'and the whole design is that the database holds a reference INSTEAD of a credential');
  // The apply-time block carries the same list. Two homes that can differ is a permitted set nobody
  // maintains, so they are compared rather than trusted.
  // `indexOf` returning -1 would make `slice` read from the END of the file, and every assertion
  // below would then fail for a reason that has nothing to do with the allowlist — which is exactly
  // what happened when the block gained an explicit `::text` cast. The anchor is asserted first.
  const anchor = aiCode.indexOf('<> all (array[');
  assert.ok(anchor > 0, 'the apply-time block still holds the column set as an allowlist');
  const allowlistInBlock = aiCode.slice(anchor, anchor + 600);
  for (const column of CREDENTIAL_COLUMNS_PERMITTED) {
    assert.match(allowlistInBlock, new RegExp(`'${column}'`),
      `the apply-time allowlist names ${column}, so the live catalog is held to the same list as the text`);
  }
  // A denylist of names somebody thought of is defeated by the one they did not, which is why the
  // rule above is an allowlist. These four are asserted anyway, because they are the names the
  // repository's own secret scanner and RFC-2026-008's cardholder scan exist to catch.
  for (const forbidden of ['api_key', 'secret', 'access_token', 'ciphertext']) {
    assert.doesNotMatch(definition, new RegExp(`\\b${forbidden}\\b`),
      `private.${AI_REFERENCES} declares no ${forbidden} column (§9.2's absolute prohibitions)`);
  }
  // §9.2 calls the fingerprint "last-four-like", and the ceiling is what makes that a shape rather
  // than a hope: 010 put a 32-byte FLOOR on token_hash so a plaintext token could not fit a digest
  // column, and this is the mirror image.
  assert.match(definition, /fingerprint[\s\S]{0,200}?between 1 and 16/,
    'the fingerprint is capped so a whole API key does not fit a column §9.2 describes as '
    + '"last-four-like"');
});

test('no role holds any privilege on the credential reference, in any migration', () => {
  // Read across the WHOLE migration set, not just this batch: the claim is a property of the
  // schema, and a grant made by a later batch would not appear in 060_ai_gateway.sql at all. This
  // is the static home of an assertion 060 deliberately does NOT make at apply time — the command
  // surface RFC-2026-012 §4 names will one day need a grant here, and an applied migration whose
  // self-assertion an approved RFC makes false is the trap 011 set for 021.
  const grants = [...migrationText.matchAll(/grant\s+[\s\S]{0,400}?\bon\s+(?:table\s+)?private\.(\w+)/gi)];
  assert.deepEqual(grants.map((m) => m[1]), [],
    "no migration grants any privilege on any table in `private`. RFC-2026-012's inventory says of "
    + 'ai credential refs: "no read by anyone, including service", and §8.3\'s "Plain credential '
    + 'SELECT" is N in every column including the service\'s. This is the one table in the schema '
    + "where app_worker deliberately holds NOTHING, which is a departure from batch 010's shape and "
    + 'is argued in 060_ai_gateway.sql rather than assumed.');
  assert.doesNotMatch(migrationText, /grant\s+usage\s+on\s+schema\s+private/i,
    'and no role holds USAGE on schema `private`, which is the grant that would have to come first. '
    + 'RFC-2026-021 §7/4 makes exactly this argument about anon and schema app: the first grant is '
    + 'not one grant, it changes the denial layer of every object in the schema at once — here that '
    + 'would expose private.as_user, private.as_suspended_user and private.set_updated_at to every '
    + 'end user in the same statement.');
  // §8.3 grants "BYOK credential manage" to the owner, so the refusal is a REFUSAL and is recorded
  // as one rather than passing as an implementation.
  assert.match(ai, /BYOK credential manage/,
    'the migration names the §8.3 cell it does not implement, so the refusal is in the file');
  assert.ok(cases.some((c) => c.id === 'owner-a-cannot-create-a-credential-reference'),
    'and a case asserts it, so the day a command surface arrives the change is visible as a failing '
    + 'test rather than as a grant inside a migration');
});

test("the provider vocabulary is DEC-014's and is identical in both of its homes", () => {
  const checks = [...aiCode.matchAll(/check \(provider in \(([^)]*)\)\)/gi)]
    .map((m) => m[1].split(',').map((v) => v.trim().replace(/'/g, '')));
  assert.equal(checks.length, 2, 'two tables carry a provider column and each constrains it (§3.2)');
  assert.deepEqual(checks[0], AI_PROVIDERS,
    "the value set is DEC-014's five, lowercased. DEC-014 is Approved and the decision register sits "
    + "at position 2 of CONTRIBUTING_AGENTS.md's conflict order, above the data package at 4.");
  assert.deepEqual(checks[1], checks[0],
    'and the two homes hold the SAME list. A credential row for a provider the catalog cannot name '
    + "is what one of them being edited without the other produces, and the migration's apply-time "
    + 'block requires the two deparsed constraint definitions to be byte-identical against the live '
    + 'catalog as well.');
  // The MODEL set is not constrained, and that is the other half of the same rule: OPEN-004 owns
  // the BYOK model allowlist, it is open, and §15 forbids an agent choosing an open decision. So
  // models are rows a seed writes, never values in a CHECK.
  assert.doesNotMatch(aiCode, /check \(model_key in \(/i,
    'the model allowlist is DATA and not a CHECK: OPEN-004 is open and §15 forbids an agent closing '
    + "it. What is constrained is the FORM, which is 030's treatment of pack_id.");
  assert.match(aiCode, /ai_models_model_key_form/,
    'and the form IS constrained, because a rule stated in a document and not in a constraint is a '
    + 'rule the database does not have');
});

test('the model policy pins a curated row, and its tenant scope is its own primary key', () => {
  const body = aiCode.slice(aiCode.indexOf(`create table if not exists app.${AI_POLICIES}`));
  const definition = body.slice(0, body.indexOf(');'));
  assert.match(definition, /workspace_id\s+uuid\s+primary key references app\.workspaces \(id\)/,
    "§3.3's canonical scope IS the primary key, which is 010's shape for app.workspace_settings. "
    + "§4's ERD names no AI entity at all, so it states no cardinality to encode, and taking the "
    + 'shape from the one table in this schema that is already a per-workspace settings row is '
    + 'narrower than inventing a unique constraint from nothing.');
  assert.doesNotMatch(definition, /tenant_id|organization_id|brand_id|\bpage_id\b/,
    '§3.3 forbids those synonyms in the canonical domain schema');
  assert.match(definition, new RegExp(`ai_model_id\\s+uuid\\s+not null references app\\.${AI_MODELS} \\(id\\)`),
    "a policy names a CURATED CATALOG ROW by foreign key, which is OPEN-004's stop condition — "
    + '"ห้ามให้ user ใส่ model ID อิสระ" — expressed as a constraint rather than as a convention');
  for (const copied of ['provider', 'model_key', 'label']) {
    assert.doesNotMatch(definition, new RegExp(`\\b${copied}\\b`),
      `the policy does not copy ${copied} from the catalog row. A copy is a second source of truth `
      + 'for a fact the foreign key already fixes — 021 refusing current_version_id, 030 refusing '
      + 'industry_pack_id and 040 refusing kind, in the same words.');
  }
  // The global parent takes a SINGLE-column foreign key where every tenant parent in this schema
  // takes a composite one, and 030 recorded why: a global row has no tenant column to agree with.
  assert.doesNotMatch(definition, /foreign key \(workspace_id, ai_model_id\)/i,
    'and it is a single-column reference, because app.ai_models has no workspace_id for a composite '
    + "key to compare (030's finding, one family over)");
});

test('the schema lint holds a private table to the same rules, and that changes nothing for 000-040', async () => {
  // The widening this batch needed, and the inertness that makes it safe to land here.
  const forced = 'create table private.t (id uuid primary key);\n'
    + "comment on table private.t is 'owner: A3';\n"
    + 'alter table private.t enable row level security;\n'
    + 'alter table private.t force row level security;';
  assert.deepEqual(await schemaLint([{ name: '060_probe.sql', sql: forced }]), [],
    'a private table with all four properties passes');
  for (const [missing, expected] of [
    ["comment on table private.t is 'owner: A3';\n", /has no owner comment/],
    ['alter table private.t force row level security;', /does not FORCE ROW LEVEL SECURITY/],
    ['alter table private.t enable row level security;', /does not ENABLE ROW LEVEL SECURITY/],
  ]) {
    const damaged = forced.replace(missing, '');
    const problems = await schemaLint([{ name: '060_probe.sql', sql: damaged }]);
    assert.ok(problems.some((p) => expected.test(p) && /private\.t/.test(p)),
      `removing ${JSON.stringify(missing)} must be reported against private.t, got ${JSON.stringify(problems)}`);
  }
  const noKey = 'create table private.t (id uuid);\n'
    + "comment on table private.t is 'owner: A3';\n"
    + 'alter table private.t enable row level security;\n'
    + 'alter table private.t force row level security;';
  assert.ok((await schemaLint([{ name: '060_probe.sql', sql: noKey }]))
    .some((p) => /private\.t declares no primary key/.test(p)),
  "and a private table with no primary key is a finding, because §12.3's list is written about "
    + 'tables rather than about exposure');
  // The rule was widened in the batch that needed it, and it must not have changed any verdict for
  // the batches already merged. None of them creates a table outside `app`, so the claim is checkable
  // rather than merely plausible.
  assert.deepEqual([...migrationText.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?private\.(\w+)/gi)]
    .map((m) => m[1]), [AI_REFERENCES],
  'batch 060 creates the only table in `private` in the whole migration set, so widening the lint '
    + 'to reach that schema changes no verdict for batches 000-040');
});

test('batch 060 adds to the merged batches and rewrites none of them', () => {
  assert.ok(migrationNamesInOrder.includes('060_ai_gateway.sql'),
    'the batch is in the migration set the runner applies');
  // Migration invariant 1. This batch is unusual in that the check is trivially satisfiable — it
  // writes no policy at all — so what is asserted is that it touches no OBJECT another batch made.
  for (const foreign of ['workspace_members', 'workspace_member_scopes', 'business_profiles',
    'page_context_profiles', 'industry_packs', 'knowledge_items']) {
    assert.doesNotMatch(aiCode, new RegExp(`alter table app\\.${foreign}\\b`),
      `batch 060 does not alter app.${foreign}, which belongs to another batch`);
  }
  // And it consumes no authorization or scope helper, which is the registry's "011,020" read
  // honestly: §5 scopes this family "global/workspace", §7's three scope types all name a Business
  // or a Page, and batch 021's own header says a workspace row is not inside any of them.
  for (const helper of ['is_active_member', 'workspace_member_role', 'member_scope_admits_business',
    'member_scope_covers_business', 'member_scope_admits_page']) {
    assert.doesNotMatch(aiCode, new RegExp(`app\\.${helper}\\s*\\(`),
      `batch 060 calls no policy helper — it writes no policy. ${helper} has nothing to narrow on a `
      + 'family scoped global/workspace.');
  }
  assert.match(ai, /020 IS A DEPENDENCY IN THE REGISTRY AND NOT A DEPENDENCY IN THIS FILE/,
    'and the file says so, because a reader will look for the 020 dependency the registry names');
});

test('the two app tables batch 060 adds have control entries, and the private one deliberately has none', async () => {
  const workflow = await readFile(CI_WORKFLOW, 'utf8');
  const controls = [...workflow.matchAll(/^\s*control\s+app\.(\w+)\s+'([^']+)'\s+(\d+)/gm)];
  assert.ok(controls.length >= 11, 'the control runs per table family, and batch 060 adds two');

  // WHAT EACH ENTRY RESTS ON, counted with a rule 040's version could not use. That test counted
  // only `no-rows` and `no-effect`, on the ground that a `denied` case is a privilege refusal and
  // would pass unchanged with row level security off. That is true of every earlier batch and is
  // NOT true here: `service-cannot-set-an-ai-model-policy` is a `denied` case refused at the POLICY
  // layer, because app_worker holds the INSERT grant and an empty policy set is what stops the row.
  // Disabling row level security removes exactly the 42501 that case demands — the statement is then
  // admitted by the privilege system and stopped, if at all, by the primary key under a different
  // SQLSTATE — so the case fails either way and the control genuinely rests on it.
  const restoredByDisablingRls = (c) => ['no-rows', 'no-effect'].includes(c.expect)
    || (c.expect === 'denied' && c.deniedBy === 'policy');
  for (const [table, floor] of [[AI_MODELS, 1], [AI_POLICIES, 2]]) {
    const entry = controls.find(([, named]) => named === table);
    assert.ok(entry, `app.${table} has no negative-control entry. The step disables row level security on `
      + "one table and requires a failed case whose id matches that table's pattern; a batch that adds a "
      + "table and no entry widens the gap the step's own blocker names.");
    assert.equal(entry[3], '060', `app.${table}: the entry is attributed to the batch that owes it`);
    const pattern = new RegExp(`^${entry[2]}`);
    const detectable = cases.filter((c) => pattern.test(c.id) && restoredByDisablingRls(c));
    assert.ok(detectable.length >= floor,
      `app.${table}: ${detectable.length} case(s) matching /${entry[2]}/ would fail with row level security `
      + `disabled, and the entry needs at least ${floor}. A control naming a pattern nothing matches reports `
      + 'a pass it did not earn.');
  }
  // The two patterns must not overlap, or one entry is satisfied by the other table's cases.
  const modelPattern = new RegExp(`^${controls.find(([, n]) => n === AI_MODELS)[2]}`);
  const policyPattern = new RegExp(`^${controls.find(([, n]) => n === AI_POLICIES)[2]}`);
  for (const c of cases) {
    assert.ok(!(modelPattern.test(c.id) && policyPattern.test(c.id)),
      `${c.id} matches BOTH batch 060 control patterns, so each entry could be satisfied by the other `
      + "table's regression");
  }
  // The specific cases, pinned, so deleting one fails the build instead of leaving an entry that
  // disables something nothing notices. app.ai_models rests on ONE, which batch 030 warned is one
  // deletion away from resting on none — this is that refusal.
  for (const [table, name, expect] of [
    [AI_MODELS, 'service-sees-zero-rows-in-the-ai-model-registry', 'no-rows'],
    [AI_POLICIES, 'service-sees-zero-ai-model-policy-rows', 'no-rows'],
    [AI_POLICIES, 'service-cannot-set-an-ai-model-policy', 'denied'],
  ]) {
    const found = cases.find((c) => c.id === name);
    assert.ok(found, `app.${table}'s negative-control entry rests on ${name}, which is missing`);
    assert.equal(found.expect, expect, `${name}: the entry rests on this outcome kind`);
    assert.ok(restoredByDisablingRls(found),
      `${name}: only a case row level security actually decides is restored by disabling it. A `
      + 'grant-layer refusal would pass unchanged and the entry would report a pass it did not earn.');
  }

  // AND THE ABSENCE, IN BOTH DIRECTIONS, which is the whole finding of this batch's control story.
  const privateGrants = /grant\s+[\s\S]{0,400}?\bon\s+(?:table\s+)?private\./i.test(migrationText);
  const privateEntry = [...workflow.matchAll(/^\s*control\s+private\.(\w+)/gm)];
  if (privateGrants) {
    assert.ok(privateEntry.length > 0,
      'a migration now grants a privilege on a table in `private`, so some identity can reach it and '
      + 'the negative control must have an entry that disables row level security there. The entry '
      + 'was absent only because no grant existed.');
  } else {
    assert.deepEqual(privateEntry.map((m) => m[1]), [],
      'no role holds any privilege on private.ai_credential_references, so disabling row level '
      + "security on it restores nothing and NO case would fail. An entry would make the step's own "
      + 'first failure message — "The isolation suite PASSED with row level security DISABLED" — fire '
      + 'on a correct database, which is a control reporting a pass it did not earn.');
  }
  assert.match(workflow, /THERE IS NO ENTRY FOR private\.ai_credential_references/,
    'and the workflow says so beside the entries, because a control whose mechanism lives only in a '
    + 'test is a control nobody reads at the point of use');
  assert.match(workflow, /THE TWO AI GATEWAY TABLES IN `app`/,
    'each entry says beside itself what disabling row level security on that table would let through');
});

test('the batch 060 fixture writes only catalog identities and loads a row into private', async () => {
  const known = new Set(Object.values(JSON.parse(await readFile(CATALOG, 'utf8')).identities).map((e) => e.uuid));
  const fixture = (await readFile(AI_FIXTURE, 'utf8')).replace(/--[^\n]*/g, '');
  const used = new Set([...fixture.matchAll(UUID)].map((m) => m[0]));
  assert.ok(used.size > 0, 'the fixture must actually load rows');
  for (const value of used) {
    assert.ok(known.has(value), `the fixture writes ${value}, which is not a catalog identity. A `
      + 'fixture id nobody can recompute is an unverifiable constant.');
  }
  // BOTH tenants pin the SAME global model id, which is the only evidence this batch can offer that
  // the catalog is global: no client identity may read app.ai_models, so the pair of policy rows is
  // the assertion and neither owner can see either row.
  assert.ok(used.has(id('ai_model_openai_text')), 'the global curated model is loaded');
  for (const symbol of ['workspace_a', 'workspace_b']) {
    assert.ok(used.has(id(symbol)), `the fixture loads a model policy for ${symbol}`);
  }
  assert.equal((fixture.match(new RegExp(id('ai_model_openai_text'), 'g')) ?? []).length, 3,
    "the model id appears three times: the catalog row and BOTH workspaces' policies. Two tenants, "
    + 'one catalog row — which is how batch 030 asserted that a global catalog is not replicated per '
    + 'tenant, and the only shape available here.');
  // The private row, and the reason it has to exist.
  assert.match(fixture, new RegExp(`insert into private\\.${AI_REFERENCES}`),
    'the fixture loads a credential reference. Every case against that table is refused at name '
    + 'resolution, which passes whether or not the table has rows — so the row is what stops the '
    + 'negatives being satisfied by an empty table.');
  // And nothing in it looks like a credential. The repository's secret scan runs over this file on
  // every `npm run check`; this is the same claim asserted where a reader can see it.
  assert.match(fixture, /vault:\/\/fixture\//,
    'the reference is a readable synthetic LOCATOR. §9.2 permits a reference and forbids the value '
    + 'it points at appearing in this database, a log, an event, a job payload or a fixture.');
  for (const shape of [/\bsk-[A-Za-z0-9]/, /\beyJ[A-Za-z0-9_-]/, /-{5}BEGIN/]) {
    assert.doesNotMatch(fixture, shape, 'and it carries nothing shaped like a real credential');
  }
});

test('the coverage map records what batch 060 could carry and what a table with no policy cannot', () => {
  // NO ROW MOVES, which is the honest answer rather than a modest one — the same disposition batch
  // 030 recorded. What changes is the notes, and each of them says what 060 could NOT pay.
  assert.equal(SMOKE_COVERAGE[1].covered, true);
  assert.match(SMOKE_COVERAGE[1].note, /BATCH 060 ADDS NO CROSS-TENANT EVIDENCE AT ALL/,
    '§12.6/1 is about a tenant boundary, and app.ai_model_policies has no policy — so its cross-tenant '
    + 'case is a privilege refusal indistinguishable from the one every identity gets. Counting it '
    + "would be counting a refusal that holds for everybody, which is 030's finding about a global "
    + 'row applied to a tenant one.');
  assert.match(SMOKE_COVERAGE[2].note, /BATCH 060 CARRIES NO CASE FOR IT/,
    "§7's three scope types all name a Business or a Page, and this family is scoped "
    + 'global/workspace, so there is nothing for a member scope to narrow');
  assert.match(SMOKE_COVERAGE[5].note, /BATCH 060 RE-ASKS IT OF NOTHING/,
    'a suspended member sees zero rows there, and so does the owner. An assertion true of every '
    + 'identity is not evidence about the suspended one.');
  assert.match(SMOKE_COVERAGE[7].note, /BATCH 060 ADDS NO FORGERY CASE AND CANNOT/,
    'a forged column rides in on a permitted write, and no client role holds one here');
  // The two rows it genuinely extends.
  assert.match(SMOKE_COVERAGE[6].note, /only anonymous case in the suite whose declared object is `private`/,
    '§12.6/6 gains a shape it has never had: an anonymous refusal on a schema that is not `app`');
  assert.equal(SMOKE_COVERAGE[8].covered, 'negative-half',
    'batch 060 gives the service a grant and no policy on two more tables and NO grant at all on a '
    + 'third, which is more negative evidence and not a positive');
  assert.match(SMOKE_COVERAGE[8].note, /only case in the whole suite where the service is refused BY A POLICY/,
    'and the first service refusal decided by row level security rather than by the privilege system');
  // §8.6's ten, where this batch's tables cannot carry most of them and the disposition says so.
  for (const [key, expected] of [[1, /BATCH 060 CARRIES NO CASE FOR IT/],
    [3, /BATCH 060 CANNOT CARRY IT/], [4, /BATCH 060 CANNOT CARRY IT EITHER/],
    [5, /REFUSES TO COUNT/], [9, /BATCH 060 ADDS NO IMMUTABLE TABLE/],
    [10, /UNIMPLEMENTED §8 CELL/]]) {
    assert.match(String(AUTHORIZATION_CASE_COVERAGE[key]), expected,
      `§8.6 case ${key} states batch 060's disposition rather than leaving it to be inferred`);
  }
  // The labels this batch rests on are cited by cases, the same way §12.6 labels are. Without this
  // the reasoning the whole batch turns on could stop being asserted while every row stayed green.
  const cited = new Set(cases.flatMap((c) => c.covers ?? []));
  for (const label of ['§8/no-row', 'RFC-2026-021§4', 'RFC-2026-021§7', '§8.3/plain-credential',
    '§8.3/byok-manage', 'RFC-2026-012/credential-refs', '§9.2', 'OPEN-004', '§11.4/revoke']) {
    assert.ok(cited.has(label), `${label} is reasoning batch 060 rests on and no case cites it`);
  }
  const mentions = Object.values(SMOKE_COVERAGE).filter((v) => /060/.test(v.note));
  assert.equal(mentions.length, 8,
    'batch 060 extends every one of the eight §12.6 notes and moves none. Five of them say what it '
    + 'could not pay, which is the point: a batch whose tables have no client surface has to record '
    + 'the assertions it cannot make, or a later reader counts its silence as coverage.');
});

// =============================================================================================
// Batch 130 — billing. What may be stored at all, and who may write a commitment.
// =============================================================================================
//
// The static half of this batch carries more than usual, and the reason is written into
// 130_billing.sql's own apply-time block: three of the claims batch 130 cares about most are
// claims an ALREADY-NAMED batch is expected to change, so asserting them inside an applied
// migration would be 011's trap — a self-assertion that becomes false on the day it is meant to.
// They live here instead, where the batch that changes one edits a line a reviewer reads.
const BILLING_MIGRATION = 'db/foundation/migrations/130_billing.sql';
const BILLING_FIXTURE = 'tests/db/identity/fixtures/130-billing-fixture.sql';
const billing = await readFile(BILLING_MIGRATION, 'utf8');
const billingCode = billing.replace(/--[^\n]*/g, '');
const SUBSCRIPTION_TABLE = 'billing_subscriptions';
const BILLING_GLOBAL_TABLES = ['billing_plans', 'billing_plan_versions', 'plan_entitlements'];
const BILLING_TABLES = [...BILLING_GLOBAL_TABLES, SUBSCRIPTION_TABLE];
// The two tables §5.1 of the Stripe billing contract calls an immutable mapping and a versioned
// contract. A price and an entitlement are what a customer was charged and what they were promised.
const BILLING_IMMUTABLE = ['billing_plan_versions', 'plan_entitlements'];
const SERVICE_ROLES = ['app_worker', 'app_command', 'app_maintenance'];
// THE COLUMN DEFINITIONS ALONE, and the reason this helper exists is worth a sentence rather than a
// name. Batch 130 is the first migration whose own text has to NAME every shape it refuses — its
// apply-time block greps the catalog for `float4`, for `money`, and for column names matching
// pan|cvv|cvc|card|last4, and its comments explain why `last4` and `cancel_at_period_end` are
// absent. A rule reading the whole file would therefore be satisfied by the refusal and would fail
// on the batch that wrote it, which is the shape where a control starts being edited to make it
// pass. So the rules below read the CREATE TABLE bodies, which is where a column would actually
// arrive.
const billingTableBodies = [...billingCode.matchAll(/create table if not exists app\.\w+ \([\s\S]*?\n\);/g)]
  .map((m) => m[0]);
const allMigrations = async () => {
  const files = (await readdir('db/foundation/migrations')).filter((n) => n.endsWith('.sql')).sort();
  return Promise.all(files.map(async (name) =>
    [name, (await readFile(`db/foundation/migrations/${name}`, 'utf8')).replace(/--[^\n]*/g, '')]));
};

test('every batch 130 table carries RLS, FORCE, a primary key and an owner comment', () => {
  for (const table of BILLING_TABLES) {
    assert.match(billingCode, new RegExp(`create table if not exists app\\.${table}\\b`));
    assert.match(billingCode, new RegExp(`alter table app\\.${table} enable row level security`));
    assert.match(billingCode, new RegExp(`alter table app\\.${table} force row level security`),
      `app.${table}: ENABLE and FORCE are different catalog columns and the data package's own lint rule `
      + 'reads only the first. On a global table with no policy, FORCE is the whole control.');
    assert.match(billingCode, new RegExp(`comment on table app\\.${table} is`));
    assert.match(billingCode, new RegExp(`create table if not exists app\\.${table}[\\s\\S]{0,600}?primary key`));
  }
  // The policy set is ONE policy, on the one table §8.3 gives a client a cell for. Every other
  // table here is FORCE ROW LEVEL SECURITY with an empty policy set, which denies every
  // non-bypassing role including the one holding a grant — and 010's rule is that such an absence
  // must be a decision in the file rather than an omission.
  const policies = [...billingCode.matchAll(/create policy (\w+) on app\.(\w+)/g)];
  assert.equal(policies.length, 1,
    'batch 130 writes exactly one policy: §8.3 gives a client one operation on this family, '
    + '"Billing/subscription SELECT" for the owner, and everything else is an absence at the privilege '
    + 'layer');
  assert.equal(policies[0][1], 'billing_subscriptions_select_owner');
  assert.equal(policies[0][2], SUBSCRIPTION_TABLE);
  assert.match(billing, /NOTHING IS WRITTEN FOR app\.billing_plans, app\.billing_plan_versions OR app\.plan_entitlements/,
    'a forced table with no policy is unreachable by every role, and an absence is not a decision until '
    + 'somebody writes down that it is one');
});

// THE HEADLINE, AND IT IS ASSERTED OVER EVERY MIGRATION RATHER THAN OVER THIS ONE.
//
// 130_billing.sql grants no role INSERT, UPDATE or DELETE on app.billing_subscriptions, and its
// apply-time block asserts the CLIENT half against the live catalog. The SERVICE half cannot be
// asserted there: batch 131 must write this projection, so an app_worker or app_command grant — and
// under RFC-2026-012 §4 a policy to go with it — is expected, and an applied migration forbidding it
// would be false on the day it is meant to be (011's trap, which 021 had to route around).
//
// So it is asserted here, across the whole migration set, and the failure message names 131. A batch
// that legitimately adds the write path edits this test in the same diff, which is the whole point.
test('nothing in the migration set can create, change or end a billing subscription', async () => {
  const migrations = await allMigrations();
  assert.ok(migrations.length >= 12, 'the whole migration set is read, not one file');
  for (const [name, sql] of migrations) {
    for (const role of [...CLIENT_ROLES, ...SERVICE_ROLES, 'app_authz']) {
      for (const verb of ['insert', 'update', 'delete']) {
        assert.doesNotMatch(sql,
          new RegExp(`grant\\s[^;]*\\b${verb}\\b[^;]*\\bon\\s+app\\.${SUBSCRIPTION_TABLE}\\b[^;]*\\bto\\s[^;]*\\b${role}\\b`, 'i'),
          `${name} grants ${role} ${verb.toUpperCase()} on app.${SUBSCRIPTION_TABLE}. `
          + 'CONTRIBUTING_AGENTS.md: "Payment entitlement is derived only from a verified Stripe webhook '
          + 'projection. Checkout redirects are never proof of payment." The billing contract says the same '
          + 'in §2.1, §3/2 and §12.1, and RFC-2026-012 decision 1 says it for every family. If this is batch '
          + '131 landing the webhook projection, edit this test and name the RFC or the decision that '
          + 'authorises the writer, move the six `*-cannot-*-a-billing-subscription` cases to whatever layer '
          + 'now refuses them, and restate the negative control entry that rests on them.');
      }
    }
    // The policy half of the same claim. A write policy with no grant is inert, so this is the
    // weaker of the two — and it is here because the pair is what makes either mean anything.
    for (const m of sql.matchAll(new RegExp(`create policy \\w+ on app\\.${SUBSCRIPTION_TABLE}\\b[\\s\\S]*?;`, 'gi'))) {
      assert.match(m[0], /\bfor\s+select\b/i,
        `${name} writes a non-SELECT policy on app.${SUBSCRIPTION_TABLE}. §8.3 gives a client exactly one `
        + 'operation on this family and it is a read; a write policy here is a permission nobody reviewed '
        + 'against a caller.');
    }
  }
  // And the migration says so in its own file, because a control whose reason lives only in a test
  // is a control nobody reads at the point of use.
  assert.match(billing, /NOBODY MAY CREATE, CHANGE OR END A SUBSCRIPTION THROUGH THIS SCHEMA/);
  assert.match(billing, /CONTRIBUTING_AGENTS\.md/,
    'the batch names the rule it is obeying, so a reader can disagree with the reading rather than with '
    + 'the silence');
  // The cases that carry it: three verbs, two identities, all six at the GRANT layer.
  for (const who of ['owner-a', 'service']) {
    for (const verb of ['create', 'extend', 'delete']) {
      const found = cases.find((c) => c.id === `${who}-cannot-${verb}-a-billing-subscription`);
      assert.ok(found, `${who}-cannot-${verb}-a-billing-subscription is missing`);
      assert.equal(found.expect, 'denied');
      assert.equal(found.deniedBy, 'grant',
        `${found.id}: the refusal must be attributable to an ABSENT GRANT. A policy can be widened by an `
        + 'edit; an absent privilege has to be granted.');
      assert.deepEqual(found.deniedOn, { kind: 'table', name: SUBSCRIPTION_TABLE });
    }
  }
});

// The read side of the same boundary, and the reason it is a separate test: the plan catalog is
// refused for RFC-2026-012's reason and the subscription is granted for §8.3's, and a single test
// over both would let one of them be satisfied by the other.
test('the billing plan catalog is not on the client read allowlist, and no migration puts it there', async () => {
  const migrations = await allMigrations();
  for (const [name, sql] of migrations) {
    for (const table of BILLING_GLOBAL_TABLES) {
      for (const role of CLIENT_ROLES) {
        assert.doesNotMatch(sql, new RegExp(`grant\\s[^;]*\\bon\\s+app\\.${table}\\b[^;]*\\bto\\s[^;]*\\b${role}\\b`, 'i'),
          `${name} grants ${role} a privilege on app.${table}. RFC-2026-012 §3 says the read allowlist starts `
          + 'empty and each entry is added BY RFC, and RFC-2026-021 §3 says an entry is five objects plus a '
          + 'registry row. §9.1 licenses an owner/admin SUMMARY of FIN-3 content — a summary is a projection, '
          + 'and the projection is the object an RFC has to name. If an RFC has approved this entry, edit this '
          + 'test and name it, restate the negative-control entry the grant makes possible, and move the cases '
          + 'that are now about a policy rather than about a missing privilege.');
      }
    }
    for (const view of sql.matchAll(/create\s+(?:or\s+replace\s+)?view[\s\S]*?;/gi)) {
      assert.doesNotMatch(view[0], /billing_plan|plan_entitlements/i,
        `${name} creates a view over the billing plan catalog. That view IS the allowlist entry `
        + 'RFC-2026-012 §3 reserves to an RFC.');
    }
  }
  // No policy on any of the three either — the other half of "unreachable", and the half that
  // would matter the moment somebody wrote the grant.
  for (const table of BILLING_GLOBAL_TABLES) {
    assert.doesNotMatch(billingCode, new RegExp(`create policy \\w+ on app\\.${table}\\b`, 'i'),
      `app.${table}: §8 has no row for a plan catalog in any of its four matrices — §8.3's two rows are `
      + 'about a SUBSCRIPTION and about a plan/payment ACTION — so there is no cell to implement.');
  }
  // The batch names the criterion it fails and refuses to name the batch that would pass it,
  // because confirming a batch number by citation is what this package's own blockers refuse.
  assert.match(billing, /RFC-2026-021/,
    'the batch names the decision it is obeying about how the allowlist grows');
  assert.match(billing, /WHICH BATCH CREATES THE ENTRY IS NOT ASSIGNED/,
    "RFC-2026-021 §3 puts an entry in a new batch in the family owner's range and A0 assigns batch "
    + 'numbers; naming one here would create a batch number by citation, which this package refuses for '
    + "the industry catalog's 031 already");
  // And the measured state agrees, which is what stops this being a rule about text alone.
  const snapshot = JSON.parse(await readFile('db/foundation/lint/catalog-snapshot.json', 'utf8'));
  assert.deepEqual(snapshot.catalog.exposed_views, []);
});

// §3.2 fixes money and this is the batch that has some. The rule is asserted three ways because
// each catches a different mistake: the declared type catches a redefinition, the absent float
// types catch a new column, and the currency CHECK catches a constraint that ratified an
// UNVERIFIED decision.
test('a price is numeric(18,6) with an ISO-4217 currency, and no inexact type appears', () => {
  assert.match(billingCode, /unit_amount\s+numeric\(18,6\)\s+not null/,
    '§3.2: "เงิน: numeric(18,6) + ISO-4217 currency; ห้าม float". The scale is not decoration — a '
    + 'repository that stores money at two decimals cannot represent a per-unit price it later divides.');
  assert.equal(billingTableBodies.length, 4, 'four tables, four column lists to read');
  for (const body of billingTableBodies) {
    for (const inexact of ['float', 'double precision', 'real', 'money']) {
      assert.doesNotMatch(body, new RegExp(`\\b${inexact}\\b`, 'i'),
        `a column typed ${inexact} cannot hold a price exactly (and Postgres's own money type renders `
        + 'through a session GUC), which is why §3.2 forbids it rather than discouraging it');
    }
  }
  assert.match(billingCode, /currency\s+text\s+not null/);
  assert.match(billingCode, /check \(currency ~ '\^\[A-Z\]\{3\}\$'\)/,
    "ISO-4217 is three uppercase letters. The SHAPE is §3.2's and the VALUE is BILL-DEC-014's, which is "
    + 'marked UNVERIFIED against a live account.');
  assert.doesNotMatch(billingCode, /currency\s*=\s*'THB'/,
    'a constraint naming THB would encode an UNVERIFIED decision (BILL-DEC-014) as a schema rule');
  // And the apply-time block asks the catalog rather than the text, because a later ALTER would not
  // appear in this file at all.
  assert.match(billingCode, /format_type\(a\.atttypid, a\.atttypmod\)/,
    'the declared type is asserted against the live catalog, not only against the CREATE TABLE above');
  assert.match(billingCode, /typname in \('float4', 'float8', 'money'\)/,
    'and so is the absence of an inexact type on any column of any table this batch creates');
});

// §9.2 and BILL-DEC-003 forbid the DATA. This forbids the column SHAPES it arrives in, because a
// column named for a card is the column somebody eventually writes a card into — and RFC-2026-008
// records that the scan walks the working tree only, so a PAN that reaches `main` is a disclosure
// this repository has no mechanism to undo.
test('no table batch 130 creates carries a payment instrument by another name', () => {
  for (const body of billingTableBodies) {
    for (const forbidden of ['pan', 'cvv', 'cvc', 'card_number', 'cardholder', 'last4', 'last_four',
      'exp_month', 'exp_year', 'security_code', 'payment_method_token', 'card_fingerprint']) {
      assert.doesNotMatch(body, new RegExp(`\\b${forbidden}\\b`, 'i'),
        '§9.2 forbids a card PAN, a CVV and any provider-managed payment credential; BILL-DEC-003 marks '
        + `the same rule MANDATORY. A ${forbidden} column is where that data would arrive.`);
    }
  }
  // The one that would have been arguable, refused with its three conditions named rather than
  // debated in a later pull request.
  assert.match(billing, /THE ONE THAT WOULD HAVE BEEN ARGUABLE IS `last4`/,
    '§14.1 of the billing contract permits brand/last4/expiry "ที่ Stripe ส่งให้และมี UX need โดยต้องผ่าน '
    + 'privacy review" — three conditions, none of which holds at G0');
  assert.match(billing, /RFC-2026-008/,
    'the batch names the scanner decision that makes a card column a permanent disclosure rather than a '
    + 'removable mistake');
  // No provider identifier either. §9.3 requires an external account id to be an encrypted private
  // reference plus a stable hash, and neither exists here; §6's registry gives the provider read
  // model to 131.
  for (const body of billingTableBodies) {
    for (const provider of ['stripe', 'livemode', 'provider_status', 'customer_id', 'price_id',
      'product_id', 'invoice_id', 'payment_intent']) {
      assert.doesNotMatch(body, new RegExp(`\\b${provider}\\w*\\b`, 'i'),
      'batch 130 stores no provider identifier and no provider status: §9.3\'s safe form for an external id '
      + '(encrypted private reference + stable hash) does not exist in this repository, §9.1 classes a '
      + "provider identifier PROVIDER-3 with \"redact external identifiers\", and §6's registry gives the "
        + `webhook/invoice/payment read model to batch 131. A ${provider} column here would be that `
        + "batch's work arriving without that batch's review.");
    }
  }
  // The apply-time block asks the same question of the catalog, scoped to this batch's own tables
  // so that a privacy review approving a column in 131 does not make an applied migration's
  // self-assertion false — which is 011's trap and the reason the scope is stated.
  assert.match(billingCode, /\(\^\|_\)\(pan\|cvv\|cvc\|card\|last4\|iin\|bin\)\(\$\|_\)/,
    'the column-shape rule runs against the live catalog too, so a later ALTER on one of these four tables '
    + 'is caught as well as a later CREATE');
  assert.match(billing, /SCOPED TO THIS BATCH'S OWN FOUR TABLES AND NOT TO SCHEMA/,
    'and the scope is stated, because a rule over schema app would be the self-assertion 131 is expected '
    + 'to falsify — §14.1 of the billing contract permits brand/last4/expiry after a privacy review, on '
    + 'tables this batch does not create');
});

test('a published plan revision and its entitlements are immutable to every role', () => {
  for (const table of BILLING_IMMUTABLE) {
    for (const role of [...CLIENT_ROLES, ...SERVICE_ROLES, 'app_authz']) {
      for (const verb of ['update', 'delete']) {
        assert.doesNotMatch(billingCode,
          new RegExp(`grant\\s[^;]*\\b${verb}\\b[^;]*\\bon\\s+app\\.${table}\\b[^;]*\\bto\\s[^;]*\\b${role}\\b`, 'i'),
          `app.${table} grants ${role} ${verb.toUpperCase()}. §5.1 calls a price an "immutable mapping ... `
          + 'สร้าง revision ใหม่" and an entitlement a "versioned contract"; §3.2 and §4 invariant 8 say the '
          + 'same of every published version.');
      }
    }
    assert.doesNotMatch(billingCode,
      new RegExp(`create policy \\w+ on app\\.${table}[\\s\\S]{0,400}?for\\s+(update|delete)`, 'i'),
      `app.${table}: both halves are asserted, because either alone can be satisfied while the other is `
      + 'wrong — a policy with no grant is inert, and a grant with no policy is denied by RLS instead of by '
      + 'privilege, which is a weaker refusal than immutability asks for');
    assert.doesNotMatch(billingCode, new RegExp(`create table if not exists app\\.${table}[\\s\\S]{0,1600}?updated_at`),
      `app.${table} declares updated_at. An immutable row has no update to stamp, and §3.2 requires it only `
      + 'of a MUTABLE row — adding one is the first sentence of an immutable table contradicting itself.');
  }
  // Eight live cases, so both grids are complete rather than resting on the apply-time block for
  // half of each. 020 left one cell to its block and said so; a price and an entitlement are what
  // somebody was charged and what they were promised.
  const immutability = cases.filter((c) => (c.covers ?? []).includes('§8.6/9')
    && /(plan-price|plan-entitlement)/.test(c.id));
  assert.equal(immutability.length, 8,
    'update and delete, by the workspace OWNER and by the SERVICE identity, on each of the two tables');
  for (const c of immutability) {
    assert.equal(c.expect, 'denied');
    assert.equal(c.deniedBy, 'grant',
      `${c.id}: the refusal is an ABSENT GRANT, which is a stronger claim than a policy refusal because a `
      + 'policy can be widened by an edit');
  }
});

test('the §8.3 cells are implemented as written, and the admin P is refused for a new reason', () => {
  const policy = billingCode.match(/create policy billing_subscriptions_select_owner[\s\S]*?;/)[0];
  assert.match(policy, /\bfor\s+select\s+to\s+authenticated\b/i,
    '§8.5 writes tenant policies TO authenticated');
  assert.match(policy, /app\.workspace_member_role\(workspace_id\)\s*=\s*'owner'/,
    '§8.3 marks "Billing/subscription SELECT" `Y` for the owner ALONE, so the predicate is a role '
    + 'EQUALITY and not the membership test every earlier batch used. It is the narrowest client predicate '
    + 'in the schema, which is what makes the column-scoped grant beside it bounded by something RLS can '
    + 'express.');
  for (const role of ['admin', 'editor', 'approver', 'viewer']) {
    assert.doesNotMatch(policy, new RegExp(`'${role}'`),
      `§8.3 marks ${role} N or P on this row, and neither is a grant. Writing role in ('owner','admin') `
      + 'would delete the distinction between Y and P and ship every workspace admin the billing surface.');
  }
  // The refusal of admin's P is the one thing in this batch that is NOT the refusal every earlier
  // batch made, and the file has to say which one it is making.
  assert.match(billing, /THE ADMIN'S `P` IS REFUSED, and the reason is NOT the one 010, 011, 020, 021 and 030 all gave/,
    'earlier batches refused a `P` because no document defines the capability set. Here BILL-DEC-004 defines '
    + 'a Billing Admin ROLE, §7 fixes five built-ins that do not include it, and app.workspace_members.role '
    + 'is a CHECK in an APPLIED migration — so implementing it needs an RFC and a batch that owns that '
    + 'table, not a predicate here.');
  assert.match(billing, /BILL-DEC-004/);
  assert.match(billing, /migration invariant 1/,
    'and the file says why the sixth role cannot simply be added: 010 is applied');
  // The three N cells, asserted as zero rows for three ACTIVE members, each paired with the owner's
  // positive on the same row.
  for (const role of ['viewer', 'editor', 'approver']) {
    const c = cases.find((k) => k.id === `${role}-a-cannot-read-the-billing-subscription-of-tenant-a`);
    assert.ok(c, `the §8.3 N cell for ${role} has no case`);
    assert.equal(c.expect, 'no-rows',
      `${c.id}: an N on a SELECT row is a filtered read, not a refusal — the role holds the column grant `
      + 'like every other member and the policy is what excludes them');
  }
  assert.ok(cases.some((c) => c.id === 'owner-a-sees-the-billing-subscription-of-tenant-a' && c.expect === 'rows'),
    'without the positive, the three negatives are satisfied by a table nobody can read');
});

// Every batch since 021 has written a RESTRICTIVE policy and this one does not. An absence in a
// batch that creates four tables needs a reason a reviewer can check.
test('batch 130 writes no member-scope narrowing, because a subscription is a workspace row', () => {
  assert.doesNotMatch(billingCode, /as\s+restrictive/i,
    'a restrictive narrowing here would have to ask member_scope_admits_business with no Business to name, '
    + 'which denies every caller while looking like a control');
  for (const helper of ['member_scope_admits_business', 'member_scope_admits_page',
    'member_scope_covers_business', 'member_scope_covers_page', 'member_scope_is_narrowed']) {
    assert.doesNotMatch(billingCode, new RegExp(`\\b${helper}\\b`),
      "batch 130 calls no scope helper. §7's three scope types — all_businesses, business, page — every one "
      + 'of them names a Business or a Page, and a subscription names neither.');
  }
  assert.match(billing, /NO MEMBER-SCOPE NARROWING, AND THAT IS 021's SENTENCE RATHER THAN AN OMISSION/,
    '021 met this question about "Workspace UPDATE: Admin P" and answered it; the absence here cites that '
    + 'answer rather than re-deriving it');
  for (const table of BILLING_TABLES) {
    assert.doesNotMatch(billingCode, new RegExp(`create table if not exists app\\.${table}[\\s\\S]{0,1600}?business_profile_id`),
      `app.${table} carries no business_profile_id: §3.3 requires it of "knowledge, research, content, asset, `
      + "approval, calendar, publish\" and §4's ERD hangs SUBSCRIPTION off WORKSPACE and off nothing else");
  }
});

test('no batch 130 policy names a membership table, and the one it writes is TO authenticated', () => {
  // The whole-file half: no JOIN and no FROM against a membership table anywhere in the batch. The
  // NAMES appear in this file — an apply-time hint quotes RFC-2026-020 §6.1/6, which pins app_authz's
  // grants to four columns of app.workspace_members — so the rule is about the scan and not about the
  // string, which is the distinction 040's equivalent test draws by reading policy bodies.
  for (const table of ['workspace_members', 'workspace_member_scopes']) {
    assert.doesNotMatch(billingCode, new RegExp(`\\b(from|join)\\s+app\\.${table}\\b`, 'i'),
      `RFC-2026-020 §5/5: membership is read through the helpers and never by joining app.${table}. A scan `
      + "written into a policy here would run AS THE CALLER, so another module's whole policy set would "
      + 'expand inside this evaluation and the width of billing visibility would stop being a property of '
      + 'this file.');
  }
  const policies = [...billingCode.matchAll(/create policy (\w+) on app\.\w+([\s\S]*?);\n/g)];
  assert.equal(policies.length, 1, 'the one policy this batch writes');
  for (const [body, name] of policies.map((m) => [m[0], m[1]])) {
    for (const table of ['app.workspace_members', 'app.workspace_member_scopes']) {
      assert.doesNotMatch(body, new RegExp(table.replace('.', '\\.')),
        `${name}: membership is read through app.workspace_member_role and never by naming the table`);
    }
    assert.match(body, /\bto\s+authenticated\b/i, `${name}: §8.5 writes tenant policies TO authenticated`);
    for (const role of [...SERVICE_ROLES, 'anon', 'app_authz']) {
      assert.doesNotMatch(body, new RegExp(`\\bto\\s+${role}\\b`, 'i'),
        `${name}: a policy naming ${role} would add a permission §8.3 does not grant and would make the `
        + 'service denial the isolation suite asserts unfalsifiable');
    }
  }
  // The apply-time block asserts only the `anon` half, and the file says why it is narrower than
  // 020's, 021's, 030's and 040's. Without this the narrowing would look like a copy that lost a
  // word.
  assert.match(billing, /THE SERVICE ROLES ARE DELIBERATELY NOT IN THIS LIST/,
    '§8.3 marks the service `P` and 131 owes the projection that writes it, so an apply-time rule refusing '
    + 'a service policy would be a self-assertion an already-named batch is expected to falsify');
  assert.match(billingCode, /r\.rolname = 'anon'/,
    'RFC-2026-021 §7/4 IS asserted at apply time, because no later batch may change it without reversing an '
    + 'approved decision');
});

test('batch 130 adds to the merged batches and rewrites none of them', () => {
  const drops = [...billingCode.matchAll(/drop policy if exists (\w+) on app\.(\w+)/g)].map((m) => m[1]);
  assert.equal(drops.length, 1, 'one drop per policy this batch creates, and no others');
  for (const name of drops) {
    assert.match(billingCode, new RegExp(`create policy ${name}\\b`),
      `${name} is dropped by batch 130 and not created by it, so the drop removes a policy another batch `
      + 'owns (migration invariant 1)');
  }
  for (const table of ['workspaces', 'workspace_members', 'workspace_member_scopes', 'business_profiles',
    'page_context_profiles', 'industry_assignments', 'knowledge_items']) {
    assert.doesNotMatch(billingCode, new RegExp(`alter table app\\.${table}\\b`, 'i'),
      `batch 130 must not alter app.${table}, which belongs to a merged batch`);
  }
  assert.doesNotMatch(billingCode, /\bto\s+app_authz\b/i,
    'no grant and no policy names app_authz. RFC-2026-020 §5/3 gives it exactly one policy and §6.1/6 pins '
    + 'its grants; 130 creates no helper and needs no exemption.');
  assert.doesNotMatch(billingCode, /\bto\s+anon\b/i,
    'RFC-2026-021 §7/4: anon holds nothing anywhere our migrations reach');
  assert.match(billingCode, /pg_catalog\.pg_roles/);
  assert.doesNotMatch(billingCode, /pg_authid/,
    'a migration that reads pg_authid passes in CI and fails on the platform, where postgres is not a '
    + 'superuser (batch 020 found this)');
  assert.ok(!billingCode.includes("(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid"),
    'the inlined platform identity expression belongs to batch 011 alone');
  assert.match(billingCode, /gen_random_uuid\(\)/,
    'unqualified, so it resolves from pg_catalog, which is always on the search path (batch 004)');
  assert.doesNotMatch(billingCode, /(public|extensions)\.gen_random_uuid/);
  assert.match(billingCode, /private\.set_updated_at\(\)/,
    "§3.2's updated_at comes from batch 000's helper and is not reimplemented");
  // No created_by anywhere in this batch, which is 030's rule arriving somewhere less obvious: §3.2
  // asks for the actor columns on a row a USER mutates, and no user mutates any of these four.
  assert.doesNotMatch(billingCode, /\bcreated_by\b/,
    'no table here is user-mutated — no role holds INSERT or UPDATE on any of them — so §8.5\'s "user action '
    + 'ตรวจ created_by = (select auth.uid())" has nothing to attach to. The acting user belongs in the audit '
    + "event batch 140 owes and in billing_operations, which is 131's.");
});

// The one live subscription per workspace, which §1 of the billing contract requires and §13.1
// otherwise leaves to a reconciliation job to REPORT. A constraint refuses it instead.
test('a workspace holds at most one live subscription, as a partial unique index', () => {
  assert.match(billingCode,
    /create unique index if not exists billing_subscriptions_one_live_per_workspace\s+on app\.billing_subscriptions \(workspace_id\)\s+where local_access_state <> 'canceled'/,
    '§1: "หนึ่ง billable subscription ต่อหนึ่ง workspace". It is PARTIAL because §4\'s ERD gives this table '
    + '`WORKSPACE ||--o{ SUBSCRIPTION` — zero or MANY — so an ended subscription stays and a total unique '
    + 'index would forbid the history.');
  assert.match(billingCode, /i\.indisunique and i\.indpred is not null/,
    'the apply-time block asserts UNIQUE and PARTIAL from the catalog, because a non-unique index would '
    + 'enforce nothing and a total one would forbid the history');
  // The state vocabulary is §9's, and NO_PLAN is deliberately absent.
  assert.match(billingCode,
    /check \(local_access_state in \(\s*'pending', 'trialing', 'active', 'grace', 'restricted',\s*'cancel_scheduled', 'canceled', 'manual_fallback'\)\)/,
    "§9's local state machine as text + a named CHECK (§3.2), lowercased the way batch 010 lowercased "
    + "§11.4's diagram labels");
  assert.doesNotMatch(billingCode, /'no_plan'/,
    'NO_PLAN is the ABSENCE of a row, which is what buys the NOT NULL foreign key to the plan revision: '
    + 'every row is a commitment to a contract that exists');
  for (const body of billingTableBodies) {
    assert.doesNotMatch(body, /cancel_at_period_end/,
      '`cancel_scheduled` in local_access_state IS that flag, and a boolean beside it could disagree with '
      + 'the state — the second source of truth 021, 030 and 040 each refused one column over');
  }
  // BILL-DEC-012 says the grace number is policy and not schema.
  assert.match(billingCode, /grace_expires_at\s+timestamptz,/,
    '§10.1 requires the grace deadline to be recorded');
  assert.doesNotMatch(billingCode, /interval '7 days'/,
    'BILL-DEC-012: 7 days is a baseline that "ปรับได้ผ่าน policy ไม่ hard-code", so there is no default and '
    + 'no arithmetic here');
});

test('the batch 130 fixture writes only catalog identities and subscribes both tenants to one revision', async () => {
  const known = new Set(Object.values(JSON.parse(await readFile(CATALOG, 'utf8')).identities).map((e) => e.uuid));
  const fixture = (await readFile(BILLING_FIXTURE, 'utf8')).replace(/--[^\n]*/g, '');
  const used = new Set([...fixture.matchAll(UUID)].map((m) => m[0]));
  assert.ok(used.size > 0, 'the fixture must actually load rows');
  for (const value of used) {
    assert.ok(known.has(value), `the fixture writes ${value}, which is not a catalog identity`);
  }
  for (const symbol of ['billing_plan_starter', 'billing_plan_starter_v1', 'workspace_a', 'workspace_b']) {
    assert.ok(used.has(id(symbol)), `the fixture must load ${symbol}`);
  }
  // BOTH tenants on the SAME plan revision, which is the only proof available that the catalog is
  // global: no identity may read app.billing_plan_versions, so the claim has to be carried by two
  // subscriptions naming one id.
  const subscriptions = fixture.match(/insert into app\.billing_subscriptions[\s\S]*?on conflict[^;]*;/);
  assert.ok(subscriptions, 'the fixture loads subscriptions');
  assert.equal((subscriptions[0].match(new RegExp(id('billing_plan_starter_v1'), 'g')) ?? []).length, 2,
    'one subscription per tenant, both naming the same global plan revision');
  assert.match(subscriptions[0], new RegExp(id('workspace_a')));
  assert.match(subscriptions[0], new RegExp(id('workspace_b')));
  // Both entitlement kinds are loaded, for the reason batch 040 loaded all four of its `kind`
  // values: a vocabulary that only ever appears in a CHECK is a vocabulary no row has had to satisfy.
  for (const kind of ['limit', 'value']) {
    assert.match(fixture, new RegExp(`'${kind}'`), `the fixture loads an entitlement of kind ${kind}`);
  }
  assert.match(fixture, /21474836480/,
    "§5.3's own asset_storage_bytes, which does not fit an integer and is why §3.2 fixes these quantities "
    + 'as bigint');
  // No yearly price, because BILL-OQ-01 is OPEN: the vocabulary is the document's and the offering
  // is Product's.
  assert.doesNotMatch(fixture, /'year'/,
    'whether a yearly price is OFFERED is BILL-OQ-01 and still open; a fixture row would be this batch '
    + 'answering it');
  // And no card data, which is the one thing a billing fixture is most likely to acquire.
  assert.doesNotMatch(fixture, /\b\d{13,19}\b/,
    'a long digit run in a billing fixture is the shape RFC-2026-008 exists to report. Nothing here needs '
    + 'one, and a published provider test card is reported rather than exempted.');
});

test('the tables batch 130 adds have their own entries in the CI negative control', async () => {
  const workflow = await readFile(CI_WORKFLOW, 'utf8');
  const controls = [...workflow.matchAll(/^\s*control\s+app\.(\w+)\s+'([^']+)'\s+(\d+)/gm)];
  assert.ok(controls.length >= 13, 'the control runs per table family, and batch 130 adds four');

  for (const [table, floor] of [[SUBSCRIPTION_TABLE, 6], ...BILLING_GLOBAL_TABLES.map((t) => [t, 1])]) {
    const entry = controls.find(([, named]) => named === table);
    assert.ok(entry, `app.${table} has no negative-control entry. The step disables row level security on one `
      + "table and requires a failed case whose id matches that table's pattern; a batch that adds a table and "
      + "no entry widens the gap the step's own blocker names.");
    assert.equal(entry[3], '130', `app.${table}: the entry is attributed to the batch that owes it`);
    const pattern = new RegExp(`^${entry[2]}`);
    const detectable = cases.filter((c) => pattern.test(c.id) && ['no-rows', 'no-effect'].includes(c.expect));
    assert.ok(detectable.length >= floor,
      `app.${table}: ${detectable.length} case(s) matching /${entry[2]}/ would fail with row level security `
      + `disabled, and the entry needs at least ${floor}. A control naming a pattern nothing matches reports a `
      + 'pass it did not earn.');
  }

  // NONE OF BATCH 130's FOUR PATTERNS OVERLAPS ANY OTHER ENTRY IN THIS STEP, its own three included.
  // Batch 040 asserted this for its own pair; four new patterns make the hazard four times as likely,
  // so it is asserted against EVERY entry rather than only against the siblings.
  //
  // IT IS ASSERTED ONE-DIRECTIONALLY, AND THAT IS A FINDING RATHER THAN A CONVENIENCE. The same
  // claim made globally is FALSE TODAY: measured on this branch, sixteen pairs of the pre-existing
  // entries share cases, `app.business_profiles` and `app.workspace_member_scopes` sharing fifteen
  // of them (`editor-a-scope-does-not-reach-business-a2` matches both `[a-z0-9-]*business` and
  // `[a-z0-9-]*scope`). Those patterns are anchored with `^[a-z0-9-]*`, which matches a substring
  // anywhere in an id, so any id naming two families matches two entries. It is a weakness rather
  // than a hole — each `control` call runs with exactly one table's row level security off, so a
  // failure during it was caused by that table — but the guarantee is narrower than the step's own
  // wording implies. Repointing another batch's pattern is not this batch's to do; it is recorded in
  // the work package's open blockers, and batch 130 makes the problem no larger.
  const mine = controls.filter((c) => c[3] === '130');
  assert.equal(mine.length, 4, "batch 130's four entries");
  for (const [, table, pattern] of mine) {
    const own = new RegExp(`^${pattern}`);
    for (const [, other, otherPattern] of controls) {
      if (other === table) continue;
      const theirs = new RegExp(`^${otherPattern}`);
      const both = cases.filter((c) => own.test(c.id) && theirs.test(c.id));
      assert.deepEqual(both.map((c) => c.id), [],
        `case(s) match BOTH the app.${table} and app.${other} control patterns, so each entry could be `
        + "satisfied by the other table's regression");
    }
  }

  // WHAT EACH ENTRY RESTS ON, named rather than counted. The three global entries rest on ONE case
  // each — 030's weakness, repeated three times because the shape is the same — so each is pinned by
  // id, by outcome kind and by identity helper.
  for (const [table, name] of [
    ['billing_plans', 'service-sees-zero-rows-in-the-billing-plan-catalog'],
    ['billing_plan_versions', 'service-sees-zero-published-plan-prices'],
    ['plan_entitlements', 'service-sees-zero-plan-entitlements'],
  ]) {
    const only = cases.find((c) => c.id === name);
    assert.ok(only, `app.${table}'s negative-control entry rests on ${name}, which is missing. It is the ONLY `
      + 'case on that table row level security decides — every other one is a privilege refusal, which '
      + 'disabling RLS does not restore — so without it the entry disables something nothing notices.');
    assert.equal(only.expect, 'no-rows');
    assert.equal(only.as.helper, 'as_service',
      `${name} must run as the service identity: app_worker is the only role holding a grant on a global `
      + 'table, and the grant is what makes the refusal attributable to row level security');
  }
  // The tenant entry rests on six, and they fail for three different reasons. Five are pinned
  // because three of them are cases no earlier table in this schema could carry: §8.3 is the first
  // SELECT row where an ACTIVE member of the workspace is an `N`.
  for (const name of ['viewer-a-cannot-read-the-billing-subscription-of-tenant-a',
    'editor-a-cannot-read-the-billing-subscription-of-tenant-a',
    'approver-a-cannot-read-the-billing-subscription-of-tenant-a',
    'owner-a-cannot-read-the-billing-subscription-of-tenant-b',
    'service-sees-zero-billing-subscriptions']) {
    const found = cases.find((c) => c.id === name);
    assert.ok(found, `app.billing_subscriptions' entry rests on ${name}, which is missing`);
    assert.equal(found.expect, 'no-rows',
      `${name}: only a filtered read or a filtered write is restored by disabling row level security. A `
      + '`denied` case is a privilege refusal and would pass unchanged.');
  }
  assert.match(workflow, /THE FOUR BILLING TABLES, AND THE ASYMMETRY BETWEEN THEM/,
    'each entry says beside itself what disabling row level security on that table would let through, '
    + 'because a control whose mechanism lives only in a test is a control nobody reads at the point of use');
});

// What batch 130 claims about its own coverage, and — more usefully — what it says it could not
// carry. It moves NO §12.6 row, so the generic citation check would be satisfied by a batch that
// changed nothing at all.
test('the coverage map records what batch 130 could carry and what a workspace row cannot', () => {
  const mentions = Object.values(SMOKE_COVERAGE).filter((v) => /130/.test(v.note));
  assert.ok(mentions.length >= 7,
    'batch 130 extends seven §12.6 notes and moves no row. If a note stopped naming it, either the assertion '
    + "stopped being carried on this batch's tables or the note was rewritten by somebody who did not know it "
    + 'was load-bearing.');
  // The three it says it CANNOT carry, each with the reason in the note rather than in a commit
  // message.
  assert.match(SMOKE_COVERAGE[2].note, /BATCH 130 CARRIES NOTHING FOR THIS ASSERTION AND SAYS SO/,
    '§12.6/2 is about member scope, and a subscription is a workspace row that no scope type reaches');
  assert.match(SMOKE_COVERAGE[7].note, /BATCH 130 ADDS NO FORGERY CASE AT ALL, AND THE ABSENCE IS THE FINDING/,
    '§8.6/8 needs a write path for a forged column to travel down, and there is none');
  assert.match(SMOKE_COVERAGE[3].note, /BATCH 130 ADDS A FOURTH ANALOGUE AND IT IS NOT COUNTED EITHER/,
    'an approver refused a billing READ is not an approver refused a knowledge EDIT, and the row stays '
    + 'knowledge-half');
  assert.equal(SMOKE_COVERAGE[3].covered, 'knowledge-half', 'batch 130 moves nothing here');
  assert.equal(SMOKE_COVERAGE[8].covered, 'negative-half',
    'batch 130 gives the service a SELECT grant and no policy on four more tables, which is more NEGATIVE '
    + 'evidence — and it is the first batch where the service holds no write verb at all, so its write '
    + 'refusals are grant-layer and are deliberately not labelled RFC-2026-017 §7');
  assert.match(SMOKE_COVERAGE[8].note, /nothing in this repository can create, change or end a subscription/,
    'the headline belongs in the coverage map too, because that is where a reader looks for what a batch '
    + 'proved rather than for what it built');
  // §8.6's dispositions, and the three that say "not applicable" with a reason.
  for (const [key, needle] of [[3, 'BATCH 130 CARRIES NO CASE FOR IT AND SAYS WHY'],
    [4, 'BATCH 130 CARRIES NO CASE FOR IT'],
    [8, 'ON BATCH 130 THERE IS NO CASE AND THE ABSENCE IS THE FINDING'],
    [9, 'BATCH 130 ADDS TWO MORE IMMUTABLE TABLES'],
    [10, 'BATCH 130 MAKES THE GAP AS LARGE AS IT GETS']]) {
    assert.match(String(AUTHORIZATION_CASE_COVERAGE[key]), new RegExp(needle),
      `§8.6 case ${key}: batch 130's disposition is missing or was rewritten`);
  }
  // The labels this batch introduced are cited by cases, the same way §12.6 labels are. Without
  // this, the reasoning the whole batch turns on could stop being asserted while every §12.6 row
  // stayed green.
  const cited = new Set(cases.flatMap((c) => c.covers ?? []));
  for (const label of ['§8.3/billing-select', '§8.3/plan-payment-action', '§9.1/FIN-3', '§3.2/money',
    'RFC-2026-021§7/4', '§8.5/no-broad-delete']) {
    assert.ok(cited.has(label), `${label} is reasoning batch 130 rests on and no case cites it`);
  }
});

// =============================================================================================
// Batch 140 — audit, and the first table in this schema whose adversary can own it.
// =============================================================================================
//
// The tests below are shaped by one fact that no earlier batch's were: NEITHER OF THESE TABLES
// CARRIES A POLICY, and no client role holds a privilege on either. So there is no predicate to
// assert about, no membership helper to check a call to, and no narrowing to prove restrictive.
// What there IS to assert is the shape of a refusal — absent grants, absent policies, a trigger,
// and a set of columns a contract rather than a batch chose — plus the two claims this batch makes
// that nothing else in the repository makes: that a trigger reaches the table owner, and that
// FORCE ROW LEVEL SECURITY does not.
const AUDIT_MIGRATION = 'db/foundation/migrations/140_audit.sql';
const AUDIT_FIXTURE = 'tests/db/identity/fixtures/140-audit-fixture.sql';
const audit = await readFile(AUDIT_MIGRATION, 'utf8');
const auditCode = audit.replace(/--[^\n]*/g, '');
const AUDIT_LOGS = 'audit_logs';
const SECURITY_EVENTS = 'security_events';
const AUDIT_TABLES = [AUDIT_LOGS, SECURITY_EVENTS];
// The six roles the apply-time block walks. `app_authz` is in the list even though it owns no
// grant anywhere here, because RFC-2026-020 §6.1/6 pins its grant set and a batch that widened it
// would be amending an approved decision by migration.
const EVERY_ROLE = ['authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz'];
// CTR-AUD-001's six action categories, verbatim. Its own x-source calls them "exactly the six
// auditable action classes SEC-009 enumerates", so this list is the contract's and not a choice
// made in a migration.
const AUDIT_CATEGORIES = ['role', 'credential', 'publish', 'delete', 'billing', 'support'];
// The SQLSTATE private.refuse_mutation() raises. It is deliberately NOT 42501: rls-assertions.mjs
// accepts only 42501 as a denial, so a request-path identity that ever reached the trigger would
// fail loudly rather than pass under the wrong control's name.
const REFUSAL_SQLSTATE = 'ZZ140';

test('every batch 140 table carries RLS, FORCE, a primary key, an owner comment and NO policy', () => {
  for (const table of AUDIT_TABLES) {
    assert.match(auditCode, new RegExp(`create table (?:if not exists )?app\\.${table}\\b`, 'i'));
    assert.match(auditCode, new RegExp(`alter table app\\.${table} enable row level security`, 'i'));
    assert.match(auditCode, new RegExp(`alter table app\\.${table} force row level security`, 'i'),
      `app.${table}: ENABLE and FORCE are different catalog columns and the data package's own lint rule `
      + 'reads only the first (RFC-2026-016 §4)');
    assert.match(auditCode, new RegExp(`comment on table app\\.${table} is`, 'i'));
    assert.match(auditCode, new RegExp(`create table (?:if not exists )?app\\.${table}[\\s\\S]{0,600}?primary key`, 'i'));
    // The policy set is EMPTY, on purpose, and this is the direction that catches a batch adding one.
    assert.doesNotMatch(auditCode, new RegExp(`create policy \\w+ on app\\.${table}\\b`, 'i'),
      `app.${table} carries a policy. Batch 140 writes none: §8.4's client cells are refused because a `
      + 'client read is a named security_invoker view on an allowlist RFC-2026-021 §7/3 keeps empty, and '
      + "§8.4's one `S` cell is refused because RFC-2026-016 §2 conditions a service policy on a workspace "
      + 'GUC that does not exist. A policy here is one of those two decisions being changed by a migration '
      + 'rather than by an RFC.');
  }
  // And the other direction: FORCE with no policy denies every non-bypassing role, so the absence
  // above is the control rather than an omission. 030's two global tables established the shape.
  assert.match(audit, /Both tables are ENABLE \+ FORCE with an empty policy set/,
    'the migration states that the empty policy set is the decision, where a reader meets it');
});

// THE CENTRE OF THE BATCH. Three mechanisms, and the third is one no earlier batch used.
test('an audit record is append-only by absent grants, absent policies AND a trigger', () => {
  for (const table of AUDIT_TABLES) {
    for (const verb of ['update', 'delete', 'truncate']) {
      assert.doesNotMatch(auditCode, new RegExp(`grant[^;]*\\b${verb}\\b[^;]*on app\\.${table}\\b`, 'i'),
        `app.${table} grants ${verb.toUpperCase()} to somebody. §8.4's "Audit/security UPDATE/DELETE" is `
        + '`N N N N N N` — the service included — and TRUNCATE is the verb that empties a table with no '
        + 'DELETE grant, which no access matrix has a row for at all.');
    }
    // The trigger half. A row trigger for UPDATE and DELETE, a STATEMENT trigger for TRUNCATE,
    // which has no rows for a row trigger to fire on.
    assert.match(auditCode,
      new RegExp(`create trigger \\w+ before update or delete on app\\.${table}\\s+for each row execute function private\\.refuse_mutation\\(\\)`, 'i'),
      `app.${table} has no row-level append-only trigger. Absent grants stop every role our migrations `
      + 'can name and stop NOBODY ELSE: postgres owns every table in app and holds BYPASSRLS, so it is '
      + 'exempt from FORCE and can grant itself anything. On an audit log that is the adversary that '
      + 'matters, and §8.5 asks for a "command/trigger/privilege defense" rather than only the last of '
      + 'the three.');
    assert.match(auditCode,
      new RegExp(`create trigger \\w+ before truncate on app\\.${table}\\s+for each statement execute function private\\.refuse_mutation\\(\\)`, 'i'),
      `app.${table} has no TRUNCATE trigger. TRUNCATE fires no row trigger and is refused by no DELETE `
      + 'grant; it is the one verb that empties an append-only table while every row-level control stays '
      + 'green.');
  }
  // The function itself, and the properties that make it fire for a role that bypasses RLS.
  assert.match(auditCode, /create or replace function private\.refuse_mutation\(\)/);
  assert.match(auditCode, new RegExp(`errcode = '${REFUSAL_SQLSTATE}'`),
    'the trigger raises a SQLSTATE this batch owns, so the apply-time probe can tell "the trigger refused" '
    + 'from "something else went wrong" without asserting on a message string, whose language is the '
    + "server's lc_messages");
  assert.notEqual(REFUSAL_SQLSTATE, NOT_A_CONSTRAINT_CODE,
    'and it is deliberately NOT 42501: rls-assertions.mjs accepts only 42501 as a denial, so an identity '
    + 'that ever reached this trigger would fail loudly instead of passing under the name of a control '
    + 'that had not run');
  assert.match(auditCode, /security definer[\s\S]{0,120}set search_path = ''/i,
    "§8.5 asks an empty search_path of every SECURITY DEFINER function, and batch 000's set_updated_at is "
    + 'the precedent for a trigger function in `private` that a role holding nothing there can fire');
  assert.match(auditCode, /revoke all on function private\.refuse_mutation\(\) from public/i,
    '§8.5: EXECUTE is revoked from PUBLIC. A helper reachable by PUBLIC is reachable by anon.');
  // The claim is PROVEN rather than stated: the apply-time block writes a row as the migration role,
  // which owns the table and bypasses RLS, and requires all three verbs to raise.
  for (const verb of ['update_refused', 'delete_refused', 'truncate_refused']) {
    assert.match(auditCode, new RegExp(`if not ${verb} then`),
      `the apply-time probe does not require the ${verb.split('_')[0].toUpperCase()} to be refused. `
      + 'RFC-2026-020 §6.2 made "executed rather than cited" the rule for a claim a decision rests on, and '
      + "this batch's whole immutability claim rests on the trigger firing for the table owner.");
  }
  assert.match(auditCode, /if exists \(select 1 from app\.audit_logs where id = probe_id\) then/,
    'and the probe checks that its own row is gone, so a migration cannot seed test data into an audit log');
});

// RFC-2026-012 decision 2 and RFC-2026-021 §7/3 and §8.5, as a property of the file. This is
// asserted HERE and not in the migration's apply-time block for 030's reason: an allowlist exists in
// order to grow, and an applied migration whose self-assertion an approving RFC makes false is the
// trap 011 set for 021. The batch that opens a client read edits a line a reviewer reads.
test('no client role is granted anything on either audit table, and the batch says why', async () => {
  for (const role of CLIENT_ROLES) {
    assert.doesNotMatch(auditCode, new RegExp(`grant[^;]*on app\\.(${AUDIT_TABLES.join('|')})[^;]*to ${role}\\b`, 'i'),
      `batch 140 grants ${role} a privilege on an audit table. RFC-2026-012's inventory classifies audit `
      + '"safe view only" and security events "server-only" — the only two families in it carrying a '
      + 'redaction qualifier — and RFC-2026-021 §7/3 keeps the allowlist that would carry such a read '
      + 'EMPTY, while §8.5 says the list of inherited base-table grants "is CLOSED: any new one fails".');
  }
  assert.doesNotMatch(auditCode, /\bto\s+anon\b/i,
    'RFC-2026-021 §7/4 decides that anon holds nothing anywhere our migrations reach, and the first anon '
    + 'grant is `usage on schema app`, which changes the denial layer of every object in app at once');
  // Both decisions are cited in the file, so a reader can disagree with the reading rather than with
  // the silence.
  for (const rfc of ['RFC-2026-012', 'RFC-2026-021', 'RFC-2026-016']) {
    assert.match(audit, new RegExp(rfc), `batch 140 names ${rfc}, which it is obeying or refusing`);
  }
  const decisions = await readdir('architecture/decisions');
  for (const file of ['RFC-2026-012-client-database-boundary.md', 'RFC-2026-021-client-read-allowlist.md']) {
    assert.ok(decisions.includes(file), `batch 140 cites ${file} and the record must exist to be cited`);
  }
  // And the two cells that WOULD have been implementable are named, so this is a refusal rather than
  // an oversight a reviewer has to notice.
  assert.match(audit, /THE TWO CELLS THAT WOULD HAVE BEEN IMPLEMENTABLE ARE NAMED/,
    "§8.4's owner `Y` and editor `O` on Tenant audit SELECT are both writable predicates; the batch says "
    + 'so and refuses them for a reason about the OBJECT rather than about the predicate');
  // The five client cells are five cases, so the refusal is per cell rather than per table.
  const readRefusals = cases.filter((c) => (c.covers ?? []).includes('§8.4/tenant-audit-select')
    && c.expect === 'denied');
  assert.ok(readRefusals.length >= 5,
    '§8.4 gives "Tenant audit SELECT" five client cells — Y, P, O, "approval trail" and N — and each is '
    + 'refused for its own reason. One case standing for all five would make the other four look like '
    + 'consequences of it, and the day an allowlist entry opens one, exactly one line changes here.');
  for (const c of readRefusals) {
    assert.equal(c.deniedBy, 'grant',
      `${c.id}: the LAYER is the assertion. A policy-layer refusal would mean the grant EXISTS and `
      + 'something else refused, which is a schema RFC-2026-021 §3 says only an RFC may create.');
  }
  // AND EACH CELL IS PINNED BY IDENTITY, because a COUNT IS NOT A CELL. A probe renamed
  // `editor-a-cannot-read-their-own-audit-log` to something else and NOTHING NOTICED: the renamed
  // case still carried `§8.4/tenant-audit-select`, so five cases still covered the label while the
  // one cell that distinguishes this table from every other -- the reader who IS the subject of the
  // record -- had stopped being asserted. The five entries below are §8.4's five client cells, in
  // the order the matrix writes them, each held to the identity it is about.
  for (const [cell, name, helper, subject] of [
    ['owner Y', 'owner-a-cannot-read-the-audit-log-of-workspace-a', 'as_user', 'user_owner_a'],
    ['editor O', 'editor-a-cannot-read-their-own-audit-log', 'as_user', 'user_editor_a'],
    ['approver approval-trail', 'approver-a-cannot-read-the-audit-log', 'as_user', 'user_approver_a'],
    ['viewer N', 'viewer-a-cannot-read-the-audit-log', 'as_user', 'user_viewer_a'],
    ['the far tenant', 'owner-b-cannot-read-the-audit-log-of-workspace-b', 'as_user', 'user_owner_b'],
  ]) {
    const found = cases.find((c) => c.id === name);
    assert.ok(found, `§8.4's "${cell}" cell is asserted by ${name}, which is missing. Five cells, five `
      + 'cases: one case standing for all of them would make the other four look like consequences of it.');
    assert.equal(found.as.helper, helper, `${name}: the cell is about a specific identity`);
    assert.equal(found.as.subject, id(subject),
      `${name}: ${cell} is a claim about ${subject}, and a case run as anybody else asserts a different cell`);
    assert.ok((found.covers ?? []).includes('§8.4/tenant-audit-select'),
      `${name}: the case cites the matrix row it refuses a cell of`);
  }
  // The editor's cell is the one that needs the FIXTURE as well as the case: it is "own rows", so
  // the row the case reads has to be one this identity is the actor of.
  const ownRow = cases.find((c) => c.id === 'editor-a-cannot-read-their-own-audit-log');
  assert.deepEqual(ownRow.params, [id('audit_log_a1')],
    'the editor reads THE ROW THEY ARE THE ACTOR OF (the fixture makes user_editor_a audit_log_a1\'s '
    + "actor). Pointed at any other row the case asserts the viewer's `N` under the editor's name.");
});

// §5 names no column of any family and every batch from 020 to 040 recorded that it therefore
// invented nothing. This batch does not have to: CONTRIBUTING_AGENTS.md's conflict order puts the
// Contract Catalog at position 2 and the Core Database/RLS document at 4, and CTR-AUD-001 fixes the
// audit record's fields by name.
test("the audit row is CTR-AUD-001's shape, and every field it declines is declared", () => {
  assert.match(audit, /CTR-AUD-001/, 'the batch names the contract its columns come from');
  assert.match(audit, /Contract Catalog at position 2/,
    'and the reason a contract outranks §5\'s silence, so a reader can check the conflict order rather '
    + 'than take the column list on trust');
  for (const column of ['occurred_at', 'actor_kind', 'actor_id', 'action_category', 'action_name',
    'outcome', 'reason_key', 'correlation_id', 'causation_id', 'change_before_ref', 'change_after_ref',
    'error_code', 'secret_redacted', 'content_redacted', 'pii_redacted', 'retention_policy_ref']) {
    assert.match(auditCode, new RegExp(`\\b${column}\\b`), `app.audit_logs carries ${column} (CTR-AUD-001)`);
  }
  // The tenant context is flattened into the canonical §3.3 names rather than stored as a document.
  for (const column of ['workspace_id', 'business_profile_id', 'page_context_profile_id', 'request_id']) {
    assert.match(auditCode, new RegExp(`\\b${column}\\b`), `CTR-TEN-001's ${column}, in §3.3's canonical form`);
  }
  // The six categories are the contract's list, whole.
  for (const category of AUDIT_CATEGORIES) {
    assert.match(auditCode, new RegExp(`'${category}'`),
      `${category} is one of the six categories CTR-AUD-001's x-source calls "exactly the six auditable `
      + 'action classes SEC-009 enumerates". A shorter list would be this batch choosing which actions are '
      + 'auditable.');
  }
  // NO free-form bag, which is the one field the contract declares and holds empty.
  assert.doesNotMatch(auditCode, /\bdetails\s+jsonb\b/i,
    'CTR-AUD-001 declares `details` at maxProperties 0 and §5 forbids an untyped document column without a '
    + 'declared schema, size, prohibited fields and owner. A free-form bag is how a secret or a page of '
    + 'user content reaches an audit log, which is the failure OB-005 names.');
  for (const forbidden of ['metadata', 'payload', 'jsonb']) {
    assert.doesNotMatch(auditCode, new RegExp(`^\\s+\\w*${forbidden}\\w*\\s+jsonb`, 'im'),
      `no ${forbidden} column: §5 forbids one without a declared JSON Schema version, maximum size, `
      + 'prohibited fields and owner, none of which exists');
  }
  // And the divergences are DECLARED rather than left to be spotted.
  assert.match(audit, /FOUR DIVERGENCES FROM THE CONTRACT, EACH DELIBERATE/,
    'a store that silently drops a contract field is a store nobody can compare to the contract');
  assert.match(audit, /NO `locale` AND NO `timezone`/,
    'CTR-TEN-001 makes both `const`, so a column for either would store one value forever');
  // The record is immutable, so it carries no updated_at and no created_by/updated_by: §3.2 asks for
  // the first of a MUTABLE row and the second of a USER MUTATION, and an audit record is neither.
  assert.doesNotMatch(auditCode, /create trigger set_updated_at on app\.(audit_logs|security_events)/i,
    'an immutable row has no update to stamp');
  // Asked of the COLUMN LISTS rather than of the whole file: the column comments explain at length
  // why created_by is absent, and a rule that could not tell an explanation from a declaration would
  // be satisfied by deleting the explanation.
  for (const table of AUDIT_TABLES) {
    const body = auditCode.match(new RegExp(`create table (?:if not exists )?app\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'));
    assert.ok(body, `app.${table}'s definition is readable`);
    for (const column of ['created_by', 'updated_by', 'updated_at']) {
      assert.doesNotMatch(body[1], new RegExp(`^\\s+${column}\\s`, 'm'),
        `app.${table} declares ${column}. §3.2 asks for updated_at of a MUTABLE row and for created_by of a `
        + 'USER MUTATION, and an audit record is neither: the acting party is CTR-AUD-001\'s typed actor, '
        + 'whose id is not a uuid when the actor is a system_actor.');
    }
  }
});

// CTR-AUD-001's own `untestable_by_schema` note lists CROSS-FIELD CONSISTENCY as something JSON
// Schema in this subset cannot express. Two of its `allOf` rules are exactly that shape, and a CHECK
// constraint can hold both — so the STORE refuses a record the schema would only have failed at the
// edge, which is the strongest thing this batch can do for a contract it does not own.
test("the two cross-field rules CTR-AUD-001 states are CHECK constraints in the store", () => {
  assert.match(auditCode, /constraint audit_logs_delete_names_what_it_deleted\s+check \(action_category <> 'delete' or change_before_ref is not null\)/,
    'CTR-AUD-001 allOf[0] with PDPA-008: a deletion must leave a tombstone and an audit entry, and a delete '
    + 'that records no reference to what existed beforehand satisfies neither');
  assert.match(auditCode, /constraint audit_logs_outcome_matches_error\s+check \(\(outcome = 'succeeded'\) = \(error_code is null\)\)/,
    'allOf[1] and allOf[2] as ONE biconditional: a failed or denied action says why in CTR-ERR-001\'s '
    + 'vocabulary, and a successful one carrying an error is two contradictory statements about one event');
  assert.match(auditCode, /constraint audit_logs_redaction_asserted\s+check \(secret_redacted and content_redacted and pii_redacted\)/,
    'the three redaction flags are `const: true` in the contract, so a record that does not ASSERT '
    + 'redaction is refused by the store rather than accepted and hoped about');
  // The grammars, which are the contract's own patterns rather than shapes chosen here.
  assert.match(auditCode, /action_name ~ '\^\[a-z0-9_\]\+\(\\\.\[a-z0-9_\]\+\)\+\$'/,
    "the dotted <domain>.<entity>.<action> grammar, with the underscore CTR-AUD-001 deliberately permits "
    + 'inside a segment because DEC-010\'s entities are business_profile and page_context_profile');
  assert.match(auditCode, /reason_key ~ '\^audit\\\.\[a-z0-9_\.\]\+\$'/,
    'a stable KEY and never free text (CM-004, CTR-ERR-001, OBS-001)');
  assert.match(auditCode, /retention_policy_ref ~ '\^retention\\\.\[a-z0-9_\.\]\+\$'/,
    'SEC-009 and PDPA-006: the record names the policy governing it. A REFERENCE and not a duration — '
    + 'DATA-DEC-06 is open and a window written here would read as ratified (§15).');
  assert.match(auditCode, /\^\(snapshot\|record\):/,
    "the change reference's closed scheme list, adopted by the contract from CTR-IDM-001 after that "
    + "contract's own security review: a reference, never a value, so the record cannot leak state it does "
    + 'not hold');
});

test('the service holds grants and no policy, and the one S cell in the repository is refused', () => {
  for (const table of AUDIT_TABLES) {
    assert.match(auditCode, new RegExp(`grant select, insert on app\\.${table} to app_worker`, 'i'),
      `app.${table}: without the grant a service refusal is 42501 either way and proves only that somebody `
      + 'forgot a GRANT. With it and no policy, an empty read can only have come from row level security, '
      + 'and a role that had quietly acquired BYPASSRLS would SUCCEED where the suite demands a refusal.');
  }
  for (const role of ['app_worker', 'app_command', 'app_maintenance']) {
    assert.doesNotMatch(auditCode, new RegExp(`create\\s+policy[\\s\\S]{0,600}?\\bto\\s+${role}\\b`, 'i'),
      `batch 140 must write no policy TO ${role}`);
  }
  // The reason is the finding, and the finding is larger than this batch.
  assert.match(audit, /THE ONE `S` CELL IN THIS REPOSITORY/,
    '§8.4\'s "Audit/security INSERT | N N N N N S" is the first `S` cell any migration here has reached, '
    + "and batch 010's header named 140 as one of the batches that would inherit RFC-2026-016 §2's shape");
  assert.match(audit, /server-set workspace GUC/i,
    'RFC-2026-016 §2 conditions the service policy on a GUC derived from CTR-TEN-001, and that GUC has no '
    + 'name, no setter and no contract. The batch says so rather than naming one itself (DATA-DEC-03) or '
    + 'writing `with check (true)`, which is not the policy §2 sanctions.');
  assert.match(audit, /050, 061, 070 and[\s\S]{0,12}120 all inherit it/,
    'and the consequence is recorded for the program rather than for this batch: no `S` cell anywhere in '
    + '§8.2 to §8.4 can be implemented until that GUC exists');
  // The two cases that will flip when it does, and the layer that makes them flip.
  for (const name of ['service-cannot-write-an-audit-log', 'service-cannot-write-a-security-event']) {
    const found = cases.find((c) => c.id === name);
    assert.ok(found, `${name} is the case that asserts the present state of the S cell`);
    assert.equal(found.deniedBy, 'policy',
      `${name}: app_worker HOLDS the INSERT grant, so the refusal is row level security finding no `
      + 'permissive policy. A grant-layer refusal here would mean the grant was never made, and the day '
      + 'the policy is written this case would keep passing instead of flipping.');
  }
});

// The decision a reviewer should argue with first, made checkable.
test('the audit scope columns carry no foreign key, because §11.4 retains audit after it purges', () => {
  const bodies = AUDIT_TABLES.map((table) => {
    const m = auditCode.match(new RegExp(`create table (?:if not exists )?app\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'));
    assert.ok(m, `app.${table}'s definition is readable`);
    return [table, m[1]];
  });
  for (const [table, body] of bodies) {
    assert.doesNotMatch(body, /\breferences\b/i,
      `app.${table} carries a foreign key. §11.4's required order purges tenant content in step 7 and '
      + 'ANONYMIZES/RETAINS audit and security records in step 8, so an audit row must outlive the rows it '
      + 'names. A foreign key makes that impossible in both directions at once: either the audit row blocks '
      + 'the purge, or the purge deletes it — and this table refuses deletion.`);
    assert.match(body, /workspace_id\s+uuid\s+not null/,
      `app.${table} carries §3.3's canonical tenant scope, NOT NULL. A platform-scope record belonging to `
      + 'no workspace is deliberately not modelled, which is CTR-AUD-001\'s own boundary.');
  }
  assert.match(audit, /§4 invariant 10 is not enforced for these two tables/,
    'the COST of that decision is stated rather than absorbed: an audit row naming a Business in another '
    + "Workspace is refused by nothing here, and CTR-TEN-001's trust boundary is what refuses it in the "
    + 'producer, which is batch 141');
  // And the suite carries no case pretending otherwise.
  assert.equal(cases.filter((c) => c.expect === 'rejected' && /audit-log|security-event/.test(c.id)).length, 0,
    'a `rejected` case demands a constraint refusal, and there is no constraint here to refuse. Writing one '
    + 'would be the suite claiming a control nobody built.');
});

test('batch 140 adds to the merged batches and rewrites none of them', () => {
  assert.doesNotMatch(auditCode, /drop policy/i,
    'batch 140 writes no policy, so it drops none. A `drop policy` here could only name one another batch '
    + 'created (migration invariant 1).');
  const drops = [...auditCode.matchAll(/drop trigger if exists (\w+) on app\.(\w+)/g)];
  assert.equal(drops.length, 4, 'one drop per trigger this batch creates, and no others');
  for (const [, name, table] of drops) {
    assert.ok(AUDIT_TABLES.includes(table),
      `batch 140 drops a trigger on app.${table}, which it does not create`);
    assert.match(auditCode, new RegExp(`create trigger ${name} before[\\s\\S]{0,80}on app\\.${table}\\b`),
      `${name} is dropped by batch 140 and not created by it`);
  }
  for (const table of ['workspace_members', 'workspace_member_scopes', 'business_profiles',
    'page_context_profiles', 'industry_assignments', 'knowledge_items']) {
    assert.doesNotMatch(auditCode, new RegExp(`alter table app\\.${table}\\b`, 'i'),
      `batch 140 must not alter app.${table}, which belongs to a merged batch`);
  }
  // Membership is never read by joining the membership table — and here that is trivially true,
  // because nothing reads membership at all. Asserted anyway: the day somebody adds a policy, the
  // rule RFC-2026-020 §5/5 makes uniform is already in force on this file.
  assert.doesNotMatch(auditCode, /from app\.workspace_members\b/,
    'no predicate in batch 140 READS the membership table. There is no predicate at all today, and this is '
    + 'what stops the first one being written the way RFC-2026-020 §5/5 forbids. The table is NAMED once, '
    + "in an apply-time hint about app_authz's pinned grants, which is a sentence rather than a scan.");
  assert.doesNotMatch(auditCode, /\bto\s+app_authz\b/i,
    'no grant and no policy names app_authz (RFC-2026-020 §5/3 and §6.1/6)');
  assert.match(auditCode, /pg_catalog\.pg_roles/,
    'pg_roles and never pg_authid: pg_authid needs a superuser, so a migration reading it passes in CI and '
    + 'fails on the platform (batch 020 found this)');
  assert.doesNotMatch(auditCode, /pg_authid/);
  assert.ok(!auditCode.includes("(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid"),
    'the inlined platform identity expression belongs to batch 011 alone — scripts/db/run.mjs holds it to a '
    + 'count of exactly two');
  assert.match(auditCode, /gen_random_uuid\(\)/,
    'unqualified, so it resolves from pg_catalog, which is always on the search path (batch 004)');
  assert.doesNotMatch(auditCode, /(public|extensions)\.gen_random_uuid/);
  for (const synonym of ['tenant_id', 'organization_id', 'brand_id', 'page_id']) {
    assert.doesNotMatch(auditCode, new RegExp(`\\b${synonym}\\b`),
      `§3.3 forbids the synonym ${synonym} outright in the canonical domain schema`);
  }
});

// THE ASSERTION THIS BATCH OWES MOST AFTER THE TRIGGER, because a claim about what a control does
// not do is the half a reader is least likely to be told.
test('the immutability claim names the adversary it does not stop, and the pin it rests on', async () => {
  assert.match(audit, /FORCE ROW LEVEL SECURITY BUYS NOTHING HERE/,
    'postgres owns every table in app and holds BYPASSRLS, and BYPASSRLS beats FORCE: forcing makes the '
    + 'OWNER subject to policies, and a bypassing role is outside the row-security system whether or not it '
    + 'is the owner. A batch that wrote FORCE and implied it protected an audit log would be making the '
    + 'claim this file exists to avoid.');
  assert.match(audit, /WHAT FORCE IS STILL FOR/,
    'and the reason it is written anyway, so the two lines are not read as decoration');
  assert.match(audit, /tamper[\s\S]{0,20}RESISTANCE and not tamper EVIDENCE/,
    'the trigger raises the cost of destroying a record from one statement to two and does not stop a '
    + 'determined owner. Saying only the first half would be the overclaim.');
  assert.match(audit, /hash chain/,
    "CTR-AUD-001's freeze boundary leaves the store's tamper evidence OPEN and its untestable_by_schema "
    + 'note says there is no hash chain field because no source specifies one. This batch does not invent '
    + 'one and says where its claim stops.');
  // The claim rests on a measured fact, and the measurement has a home a build reads. If postgres
  // ever stops bypassing, the paragraph above is out of date and this fails rather than ageing.
  const runner = await readFile('scripts/db/run.mjs', 'utf8');
  assert.match(runner, /const KNOWN_BYPASS = \[[^\]]*'postgres'/,
    "batch 140's limitation statement rests on postgres bypassing row level security, which run.mjs pins "
    + 'and fails the build over. If postgres leaves that set, the paragraph in 140_audit.sql about FORCE '
    + 'buying nothing has to be rewritten, and this is what says so.');
});

test('the security event stores a digest and never an address, and its type is a grammar', () => {
  for (const column of ['source_ip_hash', 'user_agent_hash']) {
    assert.match(auditCode, new RegExp(`${column}\\s+bytea`),
      `§9.3: "IP/user-agent: store keyed hash or truncated/redacted representation". bytea, so a plaintext `
      + 'address does not fit the column at all.');
    assert.match(auditCode, new RegExp(`octet_length\\(${column}\\) = 32`),
      `${column} is exactly 32 bytes — 010's device for token_hash, tightened from a floor to an equality `
      + 'because this column holds a digest and nothing else');
  }
  assert.match(audit, /lives outside this database/,
    'a keyed hash needs a key and §9.2 forbids a secret in this database, so the key lives outside it');
  // A GRAMMAR and not a vocabulary, which is the opposite of what §3.2 asks for a Phase 1 STATE —
  // and the difference is that a state has a value set some document fixes and this does not.
  assert.match(auditCode, /event_type ~ '\^\[a-z0-9_\]\+\(\\\.\[a-z0-9_\]\+\)\+\$'/,
    'the dotted grammar CTR-AUD-001 fixes for action.name, reused rather than a second convention invented');
  assert.doesNotMatch(auditCode, /event_type in \(/,
    'no enum: NO DOCUMENT ENUMERATES the kinds of security event, and a CHECK over an invented vocabulary '
    + 'would be inventing the security taxonomy — which is what 010 refused for invitation status and 021 '
    + 'for a scope lifecycle');
  // The actor is optional here and mandatory on the audit log, which is a difference between the two
  // families rather than an inconsistency.
  assert.match(auditCode, /constraint security_events_actor_is_whole_or_absent\s+check \(\(actor_kind is null\) = \(actor_id is null\)\)/,
    "§9.1's own example of this family is a \"replay anomaly\", which is a pattern nobody performed — so "
    + 'the actor is nullable, and the two columns move together so a row cannot name a KIND of actor '
    + 'without naming one');
  assert.match(auditCode, /actor_kind\s+text\s+not null/,
    'while an audit record always has an actor, because it is a record of somebody\'s action');
  // And the private-schema half of §5's scope cell is refused with a measurable reason.
  assert.match(audit, /the private half is NOT honoured/,
    "§5 scopes this family \"workspace/private\" and a table in `private` is reachable by NO ROLE today: "
    + '§3.1 reaches it only "through a typed service" and none exists, while run.mjs fails the build when '
    + 'any service role holds USAGE on private. Its isolation would be unprovable, which is the '
    + 'unfalsifiable shape RFC-2026-016 §4 retired "force where compatible" for being.');
});

// The CI negative control, extended to two more tables — and each entry rests on a kind of case no
// earlier entry used.
test('the tables batch 140 adds have their own entries in the CI negative control', async () => {
  const workflow = await readFile(CI_WORKFLOW, 'utf8');
  const controls = [...workflow.matchAll(/^\s*control\s+app\.(\w+)\s+'([^']+)'\s+(\d+)/gm)];
  assert.ok(controls.length >= 11, 'the control runs per table family, and batch 140 adds two');

  // A case is RESTORED by disabling row level security when it is a filtered read, a filtered write,
  // or a POLICY-layer refusal. The third is 040's rule corrected: that batch counted only the first
  // two and noted that "a `denied` case is a privilege refusal and would pass unchanged" — which is
  // true of `deniedBy: 'grant'` and false of `deniedBy: 'policy'`. On these two tables the policy
  // layer is where most of the detectability lives, because no client role holds a privilege at all.
  const restoredByDisablingRls = (c) => ['no-rows', 'no-effect'].includes(c.expect)
    || (c.expect === 'denied' && c.deniedBy === 'policy');

  for (const table of AUDIT_TABLES) {
    const entry = controls.find(([, named]) => named === table);
    assert.ok(entry, `app.${table} has no negative-control entry. The step disables row level security on `
      + "one table and requires a failed case whose id matches that table's pattern; a batch that adds a "
      + "table and no entry widens the gap the step's own blocker names.");
    assert.equal(entry[3], '140', `app.${table}: the entry is attributed to the batch that owes it`);
    const pattern = new RegExp(`^${entry[2]}`);
    const detectable = cases.filter((c) => pattern.test(c.id) && restoredByDisablingRls(c));
    assert.ok(detectable.length >= 2,
      `app.${table}: ${detectable.length} case(s) matching /${entry[2]}/ would fail with row level security `
      + 'disabled, and the entry needs at least two. Batch 030 recorded that an entry resting on ONE case is '
      + 'one deletion away from resting on none; these rest on two, and both are named below.');
  }
  // The two patterns must not overlap, or one entry is satisfied by the other table's regression.
  const auditPattern = new RegExp(`^${controls.find(([, n]) => n === AUDIT_LOGS)[2]}`);
  const securityPattern = new RegExp(`^${controls.find(([, n]) => n === SECURITY_EVENTS)[2]}`);
  for (const c of cases) {
    assert.ok(!(auditPattern.test(c.id) && securityPattern.test(c.id)),
      `${c.id} matches BOTH batch 140 control patterns, so each entry could be satisfied by the other `
      + "table's regression");
  }
  // WHAT EACH ENTRY RESTS ON, pinned by id and by outcome so deleting one fails the build.
  for (const [table, name, expect, layer] of [
    [AUDIT_LOGS, 'service-sees-zero-audit-logs', 'no-rows', undefined],
    [AUDIT_LOGS, 'service-cannot-write-an-audit-log', 'denied', 'policy'],
    [SECURITY_EVENTS, 'service-sees-zero-security-events', 'no-rows', undefined],
    [SECURITY_EVENTS, 'service-cannot-write-a-security-event', 'denied', 'policy'],
  ]) {
    const found = cases.find((c) => c.id === name);
    assert.ok(found, `app.${table}'s negative-control entry rests on ${name}, which is missing`);
    assert.equal(found.expect, expect, `${name}: the outcome is what disabling row level security changes`);
    assert.equal(found.deniedBy, layer, `${name}: the layer is what makes it change`);
    assert.ok(restoredByDisablingRls(found), `${name} would not be restored by disabling row level security`);
  }
  assert.match(workflow, /THE TWO AUDIT TABLES, AND A CORRECTION TO WHAT MAKES AN ENTRY BITE/,
    'each entry says beside itself what disabling row level security on that table would let through, '
    + 'because a control whose mechanism lives only in a test is a control nobody reads at the point of use');
});

test('the batch 140 fixture writes only catalog identities and exercises both branches', async () => {
  const known = new Set(Object.values(JSON.parse(await readFile(CATALOG, 'utf8')).identities).map((e) => e.uuid));
  const fixture = (await readFile(AUDIT_FIXTURE, 'utf8')).replace(/--[^\n]*/g, '');
  const used = new Set([...fixture.matchAll(UUID)].map((m) => m[0]));
  assert.ok(used.size > 0, 'the fixture must actually load rows');
  for (const value of used) {
    assert.ok(known.has(value), `the fixture writes ${value}, which is not a catalog identity. A fixture id `
      + 'nobody can recompute is an unverifiable constant.');
  }
  for (const symbol of ['audit_log_a1', 'audit_log_b1', 'security_event_a1', 'security_event_b1']) {
    assert.ok(used.has(id(symbol)), `the fixture must load ${symbol}`);
  }
  // BOTH TENANTS, so "both owners are refused identically" is about two real rows rather than one.
  assert.ok(used.has(id('workspace_a')) && used.has(id('workspace_b')),
    'both sides of the boundary are loaded, or the refusal on the far side is about a missing row');
  // The ACTOR of the A-side audit row is user_editor_a, which is what makes the §8.4 `O` case a case
  // about that cell rather than about a role the matrix denies anyway.
  assert.match(fixture, new RegExp(`'user', '${id('user_editor_a')}'`),
    'audit_log_a1 is ABOUT user_editor_a. §8.4 marks "Tenant audit SELECT" `O` for the editor — own rows — '
    + 'so without this the case that asserts that cell would be indistinguishable from the viewer\'s `N`.');
  // BOTH BRANCHES of every cross-field rule, or the other branch is permitted and never satisfied.
  assert.match(fixture, /'succeeded'/, "the succeeded branch: no error_code, which allOf[2] requires");
  assert.match(fixture, /'denied'/, 'and the denied branch, which allOf[1] requires an error_code beside');
  assert.match(fixture, /'delete',/, "the delete category, which allOf[0] requires a before-reference for");
  assert.match(fixture, /'record:business_profile\//, 'and that reference, in the contract\'s own grammar');
  assert.match(fixture, /'auth\.session\.replay_detected', null, null/,
    "a security event with NO ACTOR — §9.1's own example is a replay anomaly, which is a pattern rather "
    + "than somebody's act — so the both-or-neither constraint is exercised in the absent direction");
  assert.match(fixture, /'auth\.credential\.rotation_failed', 'user'/, 'and one WITH an actor');
  // The hashes are computed and never pasted.
  // BOTH DIRECTIONS, because a probe that replaced ONE of the four computed digests with a pasted
  // hex literal was NOT NOTICED by a rule that only asked whether sha256 appeared at all. Three
  // survivors satisfied it while the fourth was an unverifiable constant.
  assert.equal((fixture.match(/sha256\(convert_to\(/g) ?? []).length, 4,
    'four computed digests: an IP and a user agent on each of the two security events. A pasted hex '
    + 'digest would be a constant nobody can recompute, which is the thing the fixture catalog exists to '
    + 'avoid, and §9.3 forbids the address itself.');
  assert.doesNotMatch(fixture, /\\x[0-9a-f]{16,}/i,
    'and no pasted byte literal anywhere. This is the half the count cannot make: a fifth hashed column '
    + 'added tomorrow with a literal would keep the count at four for the columns that already have one.');
  assert.doesNotMatch(fixture, /\bnow\(\)/,
    'every timestamp is FIXED: a fixture whose content depends on when it ran is one whose failures depend '
    + "on when they ran (030's sentence about released_at)");
  assert.match(fixture, /on conflict \(id\) do nothing/,
    'idempotent on the primary key, because an audit record has no natural key and inventing a unique '
    + 'constraint so a case could address one without a symbol would be writing a product decision into a '
    + 'schema to save four constants');
});

test('the coverage map records what a table nobody can read can and cannot carry', () => {
  const mentions = Object.values(SMOKE_COVERAGE).filter((v) => /140/.test(v.note));
  assert.ok(mentions.length >= 6,
    'batch 140 extends six §12.6 notes and moves no row. If a note stopped naming it, either the assertion '
    + "stopped being carried on this batch's tables or the note was rewritten by somebody who did not know "
    + 'it was load-bearing.');
  // NOTHING MOVES, and the two rows a reader might expect to are the point.
  assert.equal(SMOKE_COVERAGE[3].covered, 'knowledge-half',
    'batch 140 pays no part of §12.6/3. An approver refused an AUDIT read is a fourth in-scope analogue and '
    + 'is still not the content and knowledge tables that sentence names; content is batch 080.');
  assert.equal(SMOKE_COVERAGE[8].covered, 'negative-half',
    'and §12.6/8 stays a labelled partial. What CHANGED is what it is waiting for: the positive half is no '
    + 'longer unassertable because the matrix grants the service nothing — §8.4 marks the audit INSERT `S` '
    + '— it is unassertable because RFC-2026-016 §2 conditions the policy on a GUC nobody has named.');
  assert.match(SMOKE_COVERAGE[8].note, /workspace GUC/,
    'the note names the missing thing, so a reader can go and find whether it exists yet');
  assert.match(SMOKE_COVERAGE[8].note, /050, 061, 070 and 120/,
    'and names the other batches the same blocker reaches, because a finding recorded only where it was '
    + 'found is a finding the batches that inherit it will each rediscover');
  assert.match(SMOKE_COVERAGE[7].note, /carries a foreign key/,
    '§12.6/7 is the forged-id assertion, and batch 140 adds no case for it because nothing in this schema '
    + 'would refuse one. The note says so rather than letting the absence read as an oversight.');
  assert.match(String(AUTHORIZATION_CASE_COVERAGE[1]), /BATCH 140 HAS NO CASE FOR THIS AT ALL/,
    '§8.6 case 1 is "same Workspace + allowed role → pass", and there is no allowed client role on either '
    + 'table. Counting the service grant would report the absence of a client surface as coverage of one.');
  assert.match(String(AUTHORIZATION_CASE_COVERAGE[9]), /TRIGGER/,
    'case 9 is the immutable row, and batch 140 is the first to carry it against the table OWNER');
  assert.match(String(AUTHORIZATION_CASE_COVERAGE[10]), /one of those two now does/,
    'case 10 is "authorized server command → pass + expected audit/outbox", and the note it replaces said '
    + 'audit did not exist yet. It does now; what is missing is a writer.');
  // The labels this batch introduced are cited by cases, so the reasoning cannot stop being asserted
  // while every §12.6 row stays green.
  const cited = new Set(cases.flatMap((c) => c.covers ?? []));
  for (const label of ['§8.4/tenant-audit-select', '§8.4/security-event-details', '§8.4/audit-insert',
    '§8.4/audit-mutation', '§9.1/AUTH-3', 'RFC-2026-021§7']) {
    assert.ok(cited.has(label), `${label} is reasoning batch 140 rests on and no case cites it`);
  }
  // And every audit case is a refusal or an empty read: there is no passing client case to be had,
  // and one appearing would mean a grant was made without an allowlist entry.
  for (const c of cases.filter((k) => /audit-log|security-event/.test(k.id))) {
    assert.notEqual(c.expect, 'rows',
      `${c.id}: a passing case on these tables would mean somebody granted a client role a privilege, `
      + 'which RFC-2026-021 §3 gives to an RFC and takes away from a pull request');
  }
});
