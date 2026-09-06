#!/usr/bin/env node
// The single entry point behind every `make db-*` target.
//
// DATA-DEC-02 fixes the contract as commands and outcomes; this file is the wrapper that hides
// which tool performs them. Today no tool is chosen and no database is provisioned, and that is
// the point of how this is written:
//
//   **A target that cannot do its job exits non-zero and says what is missing.** It never reports
//   a pass it did not earn. This repository has spent its whole history removing guards that
//   reported clean runs they could not substantiate — a database harness that printed "ok" with no
//   database would be the largest one yet.
//
// Targets split into two kinds:
//   * STATIC — answerable from the repository alone (schema lint over the migration text, the
//     command contract itself). These run anywhere and really check.
//   * LIVE   — require a Postgres test instance (migrate, seed replay, RLS smoke). These refuse,
//     naming the environment variable that would let them run.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { argv, env, exit, stdout, stderr, hrtime } from 'node:process';

const MIGRATIONS = 'db/foundation/migrations';

// The one variable that turns the live half on. It is deliberately NOT `DATABASE_URL`: §12.5
// requires a separate test instance and forbids a production URL, so the name says test.
const TEST_URL = 'DB_TEST_URL';

export const LIVE = new Set(['reset-test', 'migrate-clean', 'migrate-upgrade', 'seed-replay', 'rls-smoke', 'test-foundation']);
const STATIC = new Set(['schema-lint', 'contract-check', 'generated-drift-check']);
export const ORDER = ['reset-test', 'migrate-clean', 'migrate-upgrade', 'seed-replay', 'schema-lint',
  'rls-smoke', 'contract-check', 'generated-drift-check', 'test-foundation'];

const redact = (text) => String(text).replace(/(postgres(?:ql)?:\/\/)[^\s"']*/gi, '$1[redacted]');

// §12.5: a stable summary line — command, elapsed, outcome — on every target, pass or fail.
function summarise(target, startedAt, ok, detail) {
  const ms = Math.round(Number(hrtime.bigint() - startedAt) / 1e6);
  stdout.write(`db-${target}: ${ok ? 'ok' : 'FAILED'} in ${ms}ms${detail ? ` — ${redact(detail)}` : ''}\n`);
}

async function migrationFiles() {
  const names = (await readdir(MIGRATIONS)).filter((n) => n.endsWith('.sql')).sort();
  const out = [];
  for (const name of names) out.push({ name, sql: await readFile(join(MIGRATIONS, name), 'utf8') });
  return out;
}

// What `db-migrate-clean` applies, in order, and the reason it is a function rather than a loop
// inside the target: the prerequisite is part of the declared command, so it has to be visible to
// a test without reading this file as text.
//
// Batch 000 installs pgcrypto into `public` when nothing has installed it anywhere, and batch 004
// refuses a database with pgcrypto in `public`. Both are applied and migration invariant 1 forbids
// rewriting either, so the set is applicable only where pgcrypto already exists outside `public`.
// That was true of the provisioned instance by the platform's doing and of CI by a line inside a
// GitHub workflow — which meant `make db-migrate-clean` could not apply this repository's own
// migration set to a bare Postgres (C0's review D3). PREREQUISITE is that line, moved into the
// command, where it is applied on every database rather than on the two that were prepared.
export const PREREQUISITE = 'db/foundation/prerequisites.sql';

export async function migrateCleanSteps() {
  return [
    { name: PREREQUISITE, sql: await readFile(PREREQUISITE, 'utf8') },
    ...await migrationFiles(),
  ];
}

// STATIC: the lint rules §12.3 item 8 lists that can be decided from the migration text without
// connecting anywhere. The rules that need the live catalog — every FK has a supporting index,
// every role's attributes — are asserted by the live targets and are NOT silently claimed here.
export async function schemaLint(files) {
  const problems = [];
  const all = files ?? await migrationFiles();
  for (const { name, sql } of all) {
    const stripped = sql.replace(/--[^\n]*/g, '');
    // §3.1 forbids creating or altering an OBJECT in a Supabase-managed schema.
    //
    // The first version of this rule matched any `create|alter|drop` within 200 characters of
    // `auth.`, `storage.` or `realtime.`. That reads `create policy p on app.t using
    // ((select auth.uid()) = user_id)` as this file creating something in the `auth` schema —
    // and §8.5 MANDATES that exact call in every tenant policy, so the rule rejected the shape
    // the specification requires. A1 hit it on the first real migration and, correctly, did not
    // contort the SQL to dodge it.
    //
    // It was also formatting-dependent: only the policies whose `create` fell inside the
    // 200-character window matched, so four of ten were flagged and six identical ones were not.
    // A rule whose verdict depends on where a line wraps is not a rule.
    //
    // What §3.1 actually forbids is the managed schema being the TARGET of the DDL. A target
    // appears in exactly two places: straight after the object kind (`create table auth.x`,
    // `alter function auth.f`), or after `on` for the objects that attach to a table
    // (`create policy p on auth.users`, `create index i on storage.objects`). A schema-qualified
    // call inside a predicate is in neither position.
    //
    // Out of scope, deliberately: `grant`/`revoke` naming a managed schema. That alters
    // privileges, not an object, and widening this rule to cover it is a separate decision with
    // its own false-positive surface.
    const MANAGED = '(auth|storage|realtime)';
    const KIND = '(?:table|schema|view|materialized\\s+view|function|procedure|type|domain|sequence|extension|publication|subscription)';
    const ATTACHED = '(?:policy|index|trigger|rule)';
    const targets = [
      // create/alter/drop <kind> [if [not] exists] <managed>.<name>
      new RegExp(`\\b(?:create|alter|drop)\\s+(?:or\\s+replace\\s+)?${KIND}\\s+(?:if\\s+(?:not\\s+)?exists\\s+)?${MANAGED}\\.`, 'gi'),
      // create/alter/drop policy|index|trigger <name> on [only] <managed>.<table>
      new RegExp(`\\b(?:create|alter|drop)\\s+${ATTACHED}\\b[^;]{0,120}?\\bon\\s+(?:only\\s+)?${MANAGED}\\.`, 'gi'),
    ];
    for (const pattern of targets) {
      for (const m of stripped.matchAll(pattern)) {
        problems.push(`${name}: creates or alters an object in the Supabase-managed schema '${m[1]}' — §3.1 forbids it`);
      }
    }
    // §8.5: a SECURITY DEFINER function pins an empty search_path.
    for (const m of stripped.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([\w.]+)[\s\S]*?\$\$/gi)) {
      const body = m[0];
      if (/security\s+definer/i.test(body) && !/set\s+search_path\s*=\s*''/i.test(body)) {
        problems.push(`${name}: ${m[1]} is SECURITY DEFINER without an empty search_path — §8.5`);
      }
    }
    // §8.5: an exposed view is security invoker.
    for (const m of stripped.matchAll(/create\s+(?:or\s+replace\s+)?view\s+app\.(\w+)([\s\S]*?);/gi)) {
      if (!/security_invoker\s*=\s*(true|on)/i.test(m[2])) {
        problems.push(`${name}: view app.${m[1]} is not security_invoker — §8.5`);
      }
    }
    for (const m of stripped.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?app\.(\w+)/gi)) {
      const t = m[1];
      const has = (re) => new RegExp(re, 'i').test(stripped);
      if (!has(`comment\\s+on\\s+table\\s+app\\.${t}\\b`)) problems.push(`${name}: table app.${t} has no owner comment — §3.1`);
      if (!has(`alter\\s+table\\s+app\\.${t}\\s+enable\\s+row\\s+level\\s+security`)) problems.push(`${name}: table app.${t} does not ENABLE ROW LEVEL SECURITY`);
      // FORCE is a DIFFERENT catalog column from ENABLE, and the data package's own lint rule tests
      // only the first — so ENABLE-without-FORCE passes it clean while the table owner stays exempt.
      // RFC-2026-016 records that gap. It is closed here, in the batch every later one inherits.
      if (!has(`alter\\s+table\\s+app\\.${t}\\s+force\\s+row\\s+level\\s+security`)) problems.push(`${name}: table app.${t} does not FORCE ROW LEVEL SECURITY — ENABLE alone leaves the table owner exempt`);
      if (!/primary\s+key/i.test(stripped.slice(m.index, m.index + 4000))) problems.push(`${name}: table app.${t} declares no primary key`);
    }
  }
  problems.push(...identityExpressionLint(all));
  return problems;
}

// RFC-2026-020 §6.1/7, the half of it that is decidable from migration TEXT.
//
// §5/4 inlines the platform's identity expression because no role our migrations create can call
// `auth.uid()` — measured, and recorded in 011's own header. A copied expression drifts, so the
// copy is held to two properties a build can check without a database:
//
//   * it is written character for character as AUTHZ_IDENTITY_SQL, so the string the platform
//     comparison in `catalogLint` checks is the string the migration actually contains; and
//   * it appears EXACTLY TWICE, in one migration. Twice is not a tidy number picked afterwards:
//     `app.jwt_subject()` is the one named home the helpers call, and `app_authz`'s own policy has
//     to inline it because a function call there would re-enter the cycle the role exists to break.
//     A third occurrence is a third place to forget, and a first-and-only occurrence would mean one
//     of those two started calling something else.
export function identityExpressionLint(files) {
  const problems = [];
  const counts = new Map();
  for (const { name, sql } of files) {
    const stripped = sql.replace(/--[^\n]*/g, '');
    const occurrences = stripped.split(AUTHZ_IDENTITY_SQL).length - 1;
    if (occurrences > 0) counts.set(name, occurrences);
  }
  const authz = files.find((f) => f.name === AUTHZ_MIGRATION);
  if (!authz) return problems;
  for (const [name, occurrences] of counts) {
    if (name === AUTHZ_MIGRATION) continue;
    problems.push(`${name}: contains the pinned identity expression ${occurrences} time(s). It belongs to `
      + `${AUTHZ_MIGRATION} alone — every other reader goes through app.jwt_subject(), which is what makes `
      + 'one lint rule able to hold the copy to the platform.');
  }
  const here = counts.get(AUTHZ_MIGRATION) ?? 0;
  if (here !== 2) {
    problems.push(`${AUTHZ_MIGRATION}: the identity expression appears ${here} time(s) and must appear exactly `
      + "twice — app.jwt_subject()'s body and app_authz's own policy, which cannot call a function without "
      + 're-entering the recursion it exists to break. Expected, character for character: '
      + `${AUTHZ_IDENTITY_SQL}`);
  }
  return problems;
}


const SNAPSHOT = 'db/foundation/lint/catalog-snapshot.json';
const EXEMPTIONS = 'db/foundation/lint/rls-exemption-register.json';

// The text lint reads migration files. This reads what the database actually BECAME.
//
// They are not the same rule. `alter table ... force row level security` appearing in a file says
// somebody wrote it; `relforcerowsecurity` in the catalog says the database is in that state. A
// migration that failed halfway, a later one that undid it, or a hand-run statement in the
// dashboard all break the first without touching the second.
//
// The snapshot is committed evidence, and committed evidence goes stale — this repository has
// spent its whole history on exactly that failure. So the snapshot names the migration set it was
// taken against, and a mismatch FAILS. It cannot quietly describe a database that no longer exists.
export async function migrationSetDigest(files) {
  const each = (files ?? await migrationFiles()).map(({ sql }) =>
    createHash('sha256').update(sql).digest('hex'));
  return createHash('sha256').update(each.join('\n') + '\n').digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------------------------
// RFC-2026-020, as rules. §6.1 lists seven; this section carries all seven and nothing else.
// ---------------------------------------------------------------------------------------------
//
// WHERE EACH ONE IS ANSWERED, because the answer is not the same place for all seven and pretending
// it was would be the defect this file exists to remove.
//
//   1-6  are properties of a database that HAS batch 011. `authzLint` is exported so it can be run
//        against either catalog: the committed snapshot, when the provisioned instance has received
//        011, and the CI container, which receives it on every pull request. Today it is the second
//        — see `scripts/db/authz-proofs.mjs`, which measures the container and calls this.
//   7    is a property of the PLATFORM and of this repository's own text: the recorded body of
//        `auth.uid()` against the expression batch 011 inlines. It needs no batch-011 database and
//        runs on every `npm run check`, here and in `identityExpressionLint` above.
export const AUTHZ_ROLE = 'app_authz';
export const AUTHZ_MIGRATION = '011_authorization_helpers.sql';
export const AUTHZ_TABLE = 'workspace_members';
export const AUTHZ_POLICY = 'workspace_members_select_authz_own_active';

// The identity expression as WRITTEN in 011, character for character. `identityExpressionLint`
// holds the migration to it; rule 7 holds it to the platform.
export const AUTHZ_IDENTITY_SQL =
  "(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid";

// The same expression as POSTGRES DEPARSES IT, which is what `pg_get_expr(polqual, polrelid)`
// returns and what rule 5 pins.
//
// **This string is the control.** Any widening of app_authz's single policy — `using (true)`, a
// dropped `status = 'active'`, an added function call, a second column — changes it, and the build
// fails with a diff showing exactly what changed. That is why RFC-2026-020 §4 chose option G over
// option E: E needed no exemption at all but its central claim ("the projection equals the table")
// had no artefact that could hold it, and this one is a string comparison a build performs.
//
// Derived from PostgreSQL 17.6's own deparser rather than written by hand: measured read-only on
// the provisioned instance 2026-09-06 with `explain (verbose, costs off)` over the same expression
// (`ruleutils.c` prints both), and CI applies 011 to postgres:17 and compares the real
// `pg_get_expr` against it on every run.
export const AUTHZ_POLICY_QUAL =
  "((user_id = (((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text))::uuid)"
  + " AND (status = 'active'::text))";

// §6.1/6, exactly. Anything else app_authz holds is a widening nobody declared.
export const AUTHZ_SCHEMA_GRANTS = ['USAGE on schema app'];
export const AUTHZ_COLUMN_GRANTS = ['role', 'status', 'user_id', 'workspace_id'];

// The platform's own `auth.uid()`, measured read-only on `xtvtflkntpqfvflvdbwk` 2026-09-06 and
// normalised (whitespace collapsed, case folded). RFC-2026-020 §2.2 and the evidence file Q5 carry
// the verbatim `pg_get_functiondef`.
export const PLATFORM_AUTH_UID_BODY =
  "select coalesce( nullif(current_setting('request.jwt.claim.sub', true), ''), "
  + "(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub') )::uuid";

// The branch of it batch 011 copies. `auth.uid()` COALESCEs the legacy singular GUC FIRST; 011
// reads only the second, so where the two differ 011 DENIES. Narrower in the safe direction, and
// stated rather than glossed — rule 7 requires this substring to still be there.
export const PLATFORM_IDENTITY_BRANCH =
  "(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')";

const collapse = (text) => String(text).replace(/\s+/g, ' ').trim().toLowerCase();

// The roles the access matrix is written for. A policy naming one of these is §8.1 being
// implemented; a policy naming any OTHER role is an exemption in RFC-2026-016 §4's sense and owes
// the register a row. See `registerLint` below.
export const REQUEST_PATH_ROLES = ['anon', 'authenticated', 'service_role'];

// RFC-2026-020 §6.1/1-6, against a catalog that HAS batch 011.
//
// `catalog` is the snapshot's `catalog` object, or the same shape measured live. Every rule reads a
// named field and reports when the field is MISSING as well as when it is wrong: an unmeasured
// property must not read as a passing one, which is the rule this file already applies to
// `service_roles.superuser` and to `authenticator_memberships`.
export function authzLint(catalog) {
  const problems = [];
  const c = catalog ?? {};
  const authz = c.authz;
  if (authz === undefined || authz === null) {
    return [`the catalog records no ${AUTHZ_ROLE} block, so RFC-2026-020 §6.1/1-6 cannot be checked — `
      + 'and an unmeasured property must not read as a passing one'];
  }

  // 1. The role exists with every attribute false and no password.
  const role = authz.role ?? {};
  for (const [field, label] of [['canlogin', 'rolcanlogin'], ['bypassrls', 'rolbypassrls'],
    ['superuser', 'rolsuper'], ['inherit', 'rolinherit'], ['has_password', 'a password']]) {
    if (role[field] === undefined) problems.push(`${AUTHZ_ROLE} carries no ${field} field — ${label} is what RFC-2026-020 §6.1/1 asserts, and it cannot be asserted from a field nobody measured`);
    else if (role[field]) problems.push(`${AUTHZ_ROLE} holds ${label} — RFC-2026-020 §5/2 creates it NOLOGIN NOBYPASSRLS NOINHERIT with no password. `
      + (field === 'bypassrls' || field === 'superuser'
        ? 'A helper owner that bypasses row level security reads every membership row in the database and answers every authorization question yes, for reasons unrelated to the caller.'
        : 'A default is not a decision and neither is a drift.'));
  }

  // 2. `authenticator` is a member of it: no. RFC-2026-019 §5's negative, extended by one name.
  if (c.authenticator_memberships === undefined) {
    problems.push(`the snapshot does not record what authenticator is a member of, so ${AUTHZ_ROLE} cannot be `
      + 'excluded from that list');
  } else if (c.authenticator_memberships.includes(AUTHZ_ROLE)) {
    problems.push(`authenticator is a member of ${AUTHZ_ROLE} — RFC-2026-020 §5/2 grants it membership to nothing. `
      + 'A membership makes the helper owner assumable from a JWT claim, which is the whole boundary.');
  }

  // 3. No table in app is owned by it.
  if (authz.owns_tables === undefined) problems.push(`the catalog does not record which tables ${AUTHZ_ROLE} owns`);
  else if (authz.owns_tables.length > 0) {
    problems.push(`${AUTHZ_ROLE} owns app.${authz.owns_tables.join(', app.')} — RFC-2026-020 §5/2 says it owns no `
      + 'table, for the same reason app_command does not: a SECURITY DEFINER function owned by the table owner is '
      + 'not subject to the policies on that table.');
  }

  // 4. Every function it owns is SECURITY DEFINER with an empty search_path.
  if (authz.functions === undefined) problems.push(`the catalog does not record the functions ${AUTHZ_ROLE} owns`);
  else {
    if (authz.functions.length === 0) problems.push(`${AUTHZ_ROLE} owns no function at all — the role exists only as the owner of the helpers, so an empty set means batch 011 did not land`);
    for (const f of authz.functions) {
      if (!f.security_definer) {
        problems.push(`${f.function} is owned by ${AUTHZ_ROLE} and is not SECURITY DEFINER — that is RFC-2026-020 `
          + "option D arriving unremarked: an invoker-mode helper runs as the caller, whose policy set on "
          + 'app.workspace_members by then contains the policy that calls it.');
      }
      if (!(f.config ?? []).some((o) => /^search_path=""$/.test(o))) {
        problems.push(`${f.function} is owned by ${AUTHZ_ROLE} and does not pin an empty search_path (§8.5)`);
      }
    }
  }

  // 5. Exactly one policy, on app.workspace_members, FOR SELECT, and its qual is the pinned string.
  const policies = authz.policies;
  if (policies === undefined) problems.push(`the catalog does not record the policies ${AUTHZ_ROLE} holds`);
  else if (policies.length !== 1) {
    problems.push(`${AUTHZ_ROLE} holds ${policies.length} policies in schema app; RFC-2026-020 §5/3 gives it exactly one. `
      + 'The exemption is structural, not scopal — a second policy is a second decision and needs its own RFC.');
  } else {
    const [p] = policies;
    if (p.table !== AUTHZ_TABLE) problems.push(`${AUTHZ_ROLE}'s policy is on app.${p.table}, and §5/3 puts it on app.${AUTHZ_TABLE}`);
    if (p.policy !== AUTHZ_POLICY) problems.push(`${AUTHZ_ROLE}'s policy is named ${p.policy}, and batch 011 names it ${AUTHZ_POLICY}`);
    if (p.command !== 'select') problems.push(`${AUTHZ_ROLE}'s policy is FOR ${String(p.command).toUpperCase()}, and §5/3 gives it SELECT only`);
    if (p.qual !== AUTHZ_POLICY_QUAL) {
      problems.push(`${AUTHZ_ROLE}'s policy expression is not the pinned one. This string IS the control — any `
        + 'widening changes it, and RFC-2026-020 §4 chose this option over the alternatives precisely because the '
        + 'claim is a string a build can compare.\n'
        + `      pinned:   ${AUTHZ_POLICY_QUAL}\n`
        + `      measured: ${p.qual}`);
    }
  }

  // 6. Its grants are exactly USAGE on app and a column-scoped SELECT on app.workspace_members.
  const grants = authz.grants;
  if (grants === undefined) problems.push(`the catalog does not record ${AUTHZ_ROLE}'s grants`);
  else {
    const schemas = [...(grants.schemas ?? [])].sort();
    if (schemas.join('|') !== AUTHZ_SCHEMA_GRANTS.join('|')) {
      problems.push(`${AUTHZ_ROLE} holds schema grants [${schemas.join(', ')}] and §6.1/6 gives it exactly `
        + `[${AUTHZ_SCHEMA_GRANTS.join(', ')}]`);
    }
    const tables = [...(grants.tables ?? [])].sort();
    if (tables.length > 0) {
      problems.push(`${AUTHZ_ROLE} holds whole-table privilege(s) on ${tables.join(', ')}. §6.1/6 makes the SELECT `
        + 'COLUMN-scoped, so the role cannot read token_hash or anything else it was not given a reason to read.');
    }
    const columns = [...(grants.columns ?? [])].sort();
    const expected = [...AUTHZ_COLUMN_GRANTS].sort().map((column) => `app.${AUTHZ_TABLE}.${column}`);
    if (columns.join('|') !== expected.join('|')) {
      problems.push(`${AUTHZ_ROLE} holds column SELECT on [${columns.join(', ')}] and §6.1/6 gives it exactly `
        + `[${expected.join(', ')}]`);
    }
  }
  return problems;
}

// RFC-2026-020 §6.1/7. The cost of §5/4, made falsifiable.
//
// 011 inlines the platform's identity expression because no role our migrations create can call
// `auth.uid()` — measured, not assumed. The cost of a copy is that Supabase can change the original
// and nothing would notice. So the platform's body is recorded in the snapshot as measured, and
// this compares it against both the pinned body and the branch 011 actually copied. A Supabase
// change fails the build with a diff instead of diverging silently.
export function platformIdentityLint(catalog) {
  const problems = [];
  const recorded = (catalog ?? {}).platform_auth_uid;
  if (recorded === undefined || recorded === null) {
    return ['the snapshot records no platform auth.uid() definition, so RFC-2026-020 §6.1/7 cannot be checked — '
      + 'and the whole point of §5/4 is that the copy is held to the original by a build rather than by memory'];
  }
  const body = collapse(String(recorded.definition ?? '').replace(/^[\s\S]*?\$function\$/, '').replace(/\$function\$[\s\S]*$/, ''));
  if (body !== collapse(PLATFORM_AUTH_UID_BODY)) {
    problems.push('the platform\'s auth.uid() is not the function batch 011 copied a branch of.\n'
      + `      recorded on ${recorded.measured_at ?? 'an unrecorded date'}: ${body}\n`
      + `      expected:                  ${collapse(PLATFORM_AUTH_UID_BODY)}\n`
      + '      Batch 011 inlines this expression because no role our migrations create can call auth.uid() '
      + '(RFC-2026-020 §2.3, measured). If the platform moved, the inlined copy is now a different function '
      + 'from the one every other policy in the schema uses, and that divergence must be decided rather than absorbed.');
  }
  if (!collapse(PLATFORM_AUTH_UID_BODY).includes(collapse(PLATFORM_IDENTITY_BRANCH))) {
    problems.push('the branch batch 011 copies is no longer a substring of the platform body this rule pins. '
      + 'The two constants have drifted apart inside this file, which makes the comparison vacuous.');
  }
  if (collapse(AUTHZ_IDENTITY_SQL) !== `${collapse(PLATFORM_IDENTITY_BRANCH)}::uuid`) {
    problems.push(`the expression batch 011 inlines (${AUTHZ_IDENTITY_SQL}) is not the platform's own `
      + `request.jwt.claims branch cast to uuid (${PLATFORM_IDENTITY_BRANCH}::uuid). §5/4 permits a COPY of the `
      + 'platform expression and nothing else; anything wider is a second identity model nobody decided on.');
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------
// A0's OPEN BLOCKER, closed here: the exemption register could not carry the form RFC-2026-016 §4
// actually sanctions.
// ---------------------------------------------------------------------------------------------
//
// §4's own sentence is "A bypass is a policy on a named role, never a role attribute". Until this
// change the corroboration rule demanded `rolbypassrls` or `rolsuper` and nothing else — so the
// only exemption the register could corroborate was the ROLE ATTRIBUTE, which is the form §4 was
// REPLACING. A row for a policy-on-a-named-role failed the lint, and `app_authz` — whose entire
// exemption is one policy on one named role, and which must hold neither attribute — could not be
// registered at all. The sanctioned form had no home in the register built for it.
//
// It is widened here rather than in the change that landed RFC-2026-020, because widening a
// corroboration rule in the same commit as the decision that needs it wider is how a rule stops
// being a check.
//
// THE WIDENING IS NARROWER THAN THE ONE IT JOINS, AND THAT IS THE POINT. A role attribute holds
// for every table in the database at once, so naming a table in an attribute-corroborated row
// narrows nothing. A POLICY is attached to one relation, so for this form the row's `table` field
// is corroborable — and it is checked. A row claiming an exemption on app.X while the catalog
// shows the policy on app.Y describes a database that does not exist, and is refused.
export function roleScopedCorroboration(e, where, { bypassing, rolePolicies, pending }) {
  const problems = [];
  if (bypassing.has(e.role)) return problems;

  const forRole = (rolePolicies ?? []).filter((p) => p.role === e.role);
  if (forRole.length === 0) {
    const blocked = [...(pending ?? [])];
    problems.push(`${where}: ${e.role} is exempt from row level security nowhere in this catalog — it holds `
      + 'neither rolbypassrls nor rolsuper, and no policy in schema app names it. A row naming a role is '
      + 'corroborated against that role: by a role ATTRIBUTE, which is database-wide, or by a POLICY naming '
      + 'it, which is the form RFC-2026-016 §4 calls the sanctioned one. This row records an exemption the '
      + 'catalog does not show.'
      + (blocked.length > 0
        ? `\n      Note: ${blocked.join(', ')} ${blocked.length === 1 ? 'is' : 'are'} declared not applied to `
          + 'this instance, so a policy that batch creates cannot appear in this snapshot yet. Register the row '
          + 'when the batch reaches the instance and the snapshot is retaken — not before. A row is corroborated '
          + 'by a measurement or it is not corroborated.'
        : ''));
    return problems;
  }

  // The table field means something for this form, so it is checked.
  if (e.table && !forRole.some((p) => p.table === e.table)) {
    problems.push(`${where}: the policy corroborating ${e.role} is on app.${[...new Set(forRole.map((p) => p.table))].join(', app.')}, `
      + `and this row claims app.${e.table}. Unlike a role attribute — which is database-wide, so naming a table `
      + 'in such a row narrows nothing — a policy is attached to one relation, so for this form the table is '
      + 'corroborable and it does not corroborate. Register the exemption that was actually taken.');
  }
  return problems;
}

// The other direction, and the one that makes the register COMPLETE rather than merely consistent.
//
// RFC-2026-016 §4 requires the register be read in both directions, and completeness is the whole
// of what it proves about the roles that are NOT in it. So: every policy in schema `app` naming a
// role OUTSIDE the request path is an exemption in §4's sense, and owes the register a row.
//
// Request-path roles are excluded because a policy naming `anon`, `authenticated` or `service_role`
// is §8.1's access matrix being implemented, not an exemption. Demanding a row for each would fill
// the register with the access matrix and make it unreadable — and a register nobody reads is the
// unfalsifiable shape §4 retired "force where compatible" for being.
//
// Today, measured, this passes vacuously: all ten policies on the provisioned instance name
// `authenticated`. It is written now because it is what will FORCE `app_authz`'s row into the
// register the day batch 011 reaches that instance and the snapshot records its policy — rather
// than leaving that to whoever remembers. A vacuous rule that becomes load-bearing on a known
// future measurement is not the same as a rule nobody checks.
export function roleScopedCompleteness(rolePolicies, register) {
  const registered = new Set((register?.exemptions ?? []).map((e) => e.role));
  const problems = [];
  for (const role of [...new Set((rolePolicies ?? []).map((p) => p.role))].sort()) {
    if (registered.has(role)) continue;
    const tables = [...new Set((rolePolicies ?? []).filter((p) => p.role === role).map((p) => p.table))].sort();
    problems.push(`app.${tables.join(', app.')} carr${tables.length === 1 ? 'ies' : 'y'} a policy naming ${role}, `
      + 'which is not a request-path role and has no row in the exemption register. RFC-2026-016 §4 calls a policy '
      + 'on a named role the sanctioned form of a bypass, and §4 requires the register be read in BOTH directions: '
      + 'an exemption either has a row or it does not exist. Register it, with a reason, an owner and a review '
      + 'date, or drop the policy.');
  }
  return problems;
}

// A snapshot describes ONE database, and this repository's migration set can move ahead of it.
//
// Until batch 011 that could not happen honestly: every batch was applied to the provisioned
// instance before its snapshot was retaken, so `taken_against_migrations` and the digest of
// `db/foundation/migrations/*.sql` were the same number and a difference could only mean neglect.
// Batch 011 is the first migration this repository has written that is NOT applied to the instance
// — deliberately, because CI is its proof surface and applying an unmerged authorization boundary
// to a live database is not something a batch does to prove itself.
//
// So the gap is DECLARED rather than absorbed. `not_applied_to_this_instance.migrations` names, by
// filename, every batch the instance has not received; the expected digest is the digest of the set
// WITHOUT them. Nothing is weakened: a batch the instance HAS received still has to be in the
// digest, an undeclared change still fails exactly as before, and the declaration itself is checked
// below — it must name files that exist, and it must name a TAIL of the ordered set, because a
// database missing a middle batch while holding later ones is divergent rather than merely behind,
// and that is a different finding with a different fix.
export function pendingMigrations(snap) {
  return [...new Set((snap?.not_applied_to_this_instance?.migrations ?? []))];
}

export async function appliedMigrationDigest(snap, files) {
  const pending = new Set(pendingMigrations(snap));
  const all = files ?? await migrationFiles();
  return migrationSetDigest(all.filter(({ name }) => !pending.has(name)));
}

export async function pendingDeclarationLint(snap, files) {
  const problems = [];
  const declaration = snap?.not_applied_to_this_instance;
  if (declaration === undefined) return problems;
  if (!Array.isArray(declaration.migrations)) {
    return ['not_applied_to_this_instance has no migrations array. The gap between the repository and the '
      + 'instance is declared by NAME or it is not declared at all.'];
  }
  if (typeof declaration.why !== 'string' || declaration.why.trim().length < 40) {
    problems.push('not_applied_to_this_instance carries no stated reason. A snapshot that stops describing the '
      + 'whole migration set has to say why in a sentence someone can disagree with.');
  }
  const all = (files ?? await migrationFiles()).map(({ name }) => name);
  const declared = pendingMigrations(snap);
  for (const name of declared) {
    if (!all.includes(name)) {
      problems.push(`not_applied_to_this_instance names ${name}, which is not in db/foundation/migrations. `
        + 'A declaration that excludes a file nobody can find excludes nothing and hides everything.');
    }
  }
  const tail = all.slice(all.length - declared.length);
  if (declared.length > 0 && [...declared].sort().join('|') !== [...tail].sort().join('|')) {
    problems.push(`not_applied_to_this_instance names [${declared.join(', ')}], which is not the tail of the `
      + `migration set ([${tail.join(', ')}]). An instance missing a middle batch while holding later ones is `
      + 'DIVERGENT, not behind, and that is a different finding with a different fix. Declaring it here would '
      + 'let the digest go on matching while the database and the repository disagree about what is in it.');
  }
  return problems;
}

export async function catalogLint(snapshot, digest, exemptions) {
  const problems = [];
  const snap = snapshot ?? JSON.parse(await readFile(SNAPSHOT, 'utf8'));
  const register = exemptions ?? JSON.parse(await readFile(EXEMPTIONS, 'utf8'));

  // The declaration is checked BEFORE it is used. A malformed one must not be allowed to shrink the
  // set the digest is taken over.
  const declarationProblems = await pendingDeclarationLint(snap);
  if (declarationProblems.length > 0) return declarationProblems;
  const pending = new Set(pendingMigrations(snap));
  const expected = digest ?? await appliedMigrationDigest(snap);

  if (snap.taken_against_migrations !== expected) {
    return [`the catalog snapshot was taken against migration set ${snap.taken_against_migrations}, `
      + `but the migrations now digest to ${expected}. Retake it — a snapshot describing a database `
      + 'that no longer exists is not evidence.'
      + (pending.size > 0 ? ` (${pending.size} batch(es) are declared not applied to this instance and are `
        + `excluded from that digest: ${[...pending].join(', ')}.)` : '')];
  }

  const c = snap.catalog ?? {};
  for (const name of ['app', 'private']) {
    if (!(c.our_schemas ?? []).includes(name)) problems.push(`schema ${name} is not in the live catalog`);
  }
  if (c.public_grants?.usage_on_private !== false) problems.push('PUBLIC holds USAGE on private — no client role may reach it');
  if (c.public_grants?.create_on_app !== false) problems.push('PUBLIC may CREATE in app');

  // The rule the specified lint misses, now asserted against the catalog column rather than text.
  //
  // An unforced table is a finding UNLESS the exemption register carries a row for it. That is
  // RFC-2026-016 §4's replacement for "force where compatible": the condition was retired for being
  // unfalsifiable, and a register is the falsifiable form — an exemption either has a row or it
  // does not exist.
  //
  // WHAT THIS CATALOG CAN AND CANNOT CORROBORATE. §4 names the register role × table × operation
  // and requires the lint to read it in BOTH directions. Reading a row in the second direction
  // means finding, in this snapshot, the state the row claims — so the granularity the lint can
  // ENFORCE is bounded by the granularity the snapshot RECORDS, and it records exactly two kinds of
  // exemption, neither of which has three dimensions:
  //
  //   * `relrowsecurity` / `relforcerowsecurity` are properties of a TABLE. Each is one value for
  //     the whole table, for every role and every operation at once; FORCE changes exactly one
  //     thing, whether the table OWNER is subject to the policies. So an unforced table corroborates
  //     one row and one only: role `*`, operation `all`.
  //   * `rolbypassrls` / `rolsuper` are properties of a ROLE. Each holds for every table in the
  //     database at once. So a row naming a role is corroborated against that role's own
  //     attributes, and naming a table in such a row narrows nothing — the bypass is not confined
  //     to the table the row names.
  //   * NOTHING here is per-operation. The snapshot counts a table's policies; no field says which
  //     command any policy is FOR. An `operation` other than `all` therefore asserts a state
  //     nothing in this file can show, which is exactly the unfalsifiable shape §4 retired "force
  //     where compatible" for being. It is refused rather than accepted on trust. Corroborating it
  //     would need a per-policy `cmd` measurement this snapshot does not carry.
  //
  // The previous version declared that granularity and enforced none of it: rows were matched to a
  // table by NAME alone, so `{role: 'app_worker', operation: 'select'}` bought the whole table a
  // blanket pass, and the same row suppressed `rls_enabled` as well as `rls_forced` — one register
  // row excusing a tenant table carrying no row level security at all. C0's review D2.
  //
  // The direction "a role bypass without a row cannot pass" is NOT carried by the register: a
  // service role holding BYPASSRLS or SUPERUSER is refused unconditionally below, and the platform
  // roles that hold it are pinned in KNOWN_BYPASS. A role-scoped row is therefore corroborative
  // only — it records and dates a bypass that exists, and is refused when the catalog stops showing
  // it — and it suppresses no table finding, because a table's FORCE state is not evidence about a
  // role.
  const TABLE_WIDE = (e) => e.role === '*' && e.operation === 'all';
  const forceExemptions = (table) => (register.exemptions ?? []).filter((e) => e.table === table && TABLE_WIDE(e));
  for (const t of c.tenant_tables ?? []) {
    // ENABLE is not exemptible and no row can make it so. RFC-2026-012 commits the whole
    // client/database boundary to row level security, and §4 retired only the FORCE condition; the
    // register replaces that condition and nothing else.
    if (!t.rls_enabled) {
      problems.push(`app.${t.table}: relrowsecurity is false — the exemption register replaces the FORCE `
        + 'condition only (RFC-2026-016 §4), and no row excuses a tenant table carrying no row level security at all');
    }
    if (!t.rls_forced && forceExemptions(t.table).length === 0) {
      problems.push(`app.${t.table}: relforcerowsecurity is false and no table-wide exemption `
        + "(role '*', operation 'all') is registered — ENABLE alone leaves the table owner exempt");
    }
    if (!t.has_pk) problems.push(`app.${t.table}: no primary key`);
    if (!t.comment) problems.push(`app.${t.table}: no owner comment`);
  }

  // And the other direction, which is what makes it a control rather than a list. A row here claims
  // an exemption was taken; if the catalog does not show it, the register is describing a database
  // that does not exist — and a register nobody can trust to be complete cannot be read as evidence
  // that the tables NOT in it are forced.
  const OPERATIONS = ['select', 'insert', 'update', 'delete', 'all'];
  const known = new Map((c.tenant_tables ?? []).map((t) => [t.table, t]));
  // Every role this snapshot shows exempt from row level security, from either attribute that
  // produces one. It is the only evidence a row naming a role can be read against.
  const bypassing = new Set([
    ...(c.roles_bypassing_rls ?? []),
    ...(c.roles_superuser ?? []),
    ...(c.service_roles ?? []).filter((r) => r.bypassrls || r.superuser).map((r) => r.role),
  ]);
  // The OTHER evidence a row naming a role can be read against, and the one RFC-2026-016 §4
  // actually sanctions: a policy in schema `app` whose `polroles` names that role. Measured from
  // `pg_policy`, one entry per (policy, table, role) pair, and restricted to roles OUTSIDE the
  // request path — a policy naming `anon`, `authenticated` or `service_role` is §8.1 being
  // implemented, not an exemption, and demanding a register row for each would fill the register
  // with the access matrix and make it unreadable.
  if (c.role_scoped_policies === undefined) {
    problems.push('the snapshot does not record which policies name which roles, so a policy-on-a-named-role — '
      + 'the form RFC-2026-016 §4 calls the sanctioned one — can be corroborated in neither direction, and an '
      + 'unmeasured property must not read as a passing one');
  }
  const rolePolicies = (c.role_scoped_policies ?? []).filter((p) => !REQUEST_PATH_ROLES.includes(p.role));
  for (const [index, e] of (register.exemptions ?? []).entries()) {
    const where = `rls-exemption-register.exemptions[${index}]`;
    for (const field of ['role', 'table', 'operation', 'reason', 'owner', 'review_date']) {
      if (!e[field]) problems.push(`${where}: no ${field} — RFC-2026-016 §4 requires role, table, operation, reason, owner and review date`);
    }
    if (e.operation && !OPERATIONS.includes(e.operation)) {
      problems.push(`${where}: operation ${JSON.stringify(e.operation)} is not one of ${OPERATIONS.join(', ')}`);
    } else if (e.operation && e.operation !== 'all') {
      problems.push(`${where}: operation ${JSON.stringify(e.operation)} is narrower than anything this catalog `
        + 'records. relforcerowsecurity is table-wide and rolbypassrls is role-wide, and no field in the snapshot '
        + 'says which command a policy is for, so a per-operation exemption can be corroborated in neither '
        + "direction. Register the exemption that was actually taken, with operation 'all'.");
    }
    const table = known.get(e.table);
    if (e.table && table === undefined) {
      problems.push(`${where}: app.${e.table} is not in the catalog — the exemption is for a table that does not exist`);
    } else if (table && e.role === '*') {
      // A table-wide row is a claim about the TABLE, and the table's own FORCE column answers it.
      if (table.rls_forced) {
        problems.push(`${where}: app.${e.table} is FORCED, so the exemption this row records was not taken. `
          + 'Remove the row: a register carrying exemptions nobody took cannot be read as complete, and completeness '
          + 'is the whole of what it proves about the tables that are NOT in it.');
      }
    } else if (table && e.role) {
      // A row naming a role is a claim about the ROLE, and only the role's own attributes answer
      // it. Nothing about app.<table> being forced or unforced is evidence either way, which is
      // why the previous version — which read the table's state for every row — could accept a
      // role-scoped row with no catalog evidence about that role at all.
      //
      // A0's OPEN BLOCKER, found by A1 while writing RFC-2026-020 and due with this batch. Until
      // now this branch demanded `rolbypassrls` or `rolsuper` and nothing else — so the only
      // exemption the register could corroborate was the ROLE ATTRIBUTE, which is precisely the
      // form RFC-2026-016 §4 RETIRED. §4's own sentence is "A bypass is a policy on a named role,
      // never a role attribute", and a row for such a policy FAILED here, because the rule
      // recognised only the shape it was replacing. `app_authz`, whose entire exemption is one
      // policy on one named role and which must hold neither attribute, could not be registered
      // at all.
      //
      // Widened below, and the widening is itself falsifiable in both directions — see
      // `roleScopedCorroboration` and the completeness pass after this loop. It was deliberately
      // NOT widened in the change that landed RFC-2026-020: widening a corroboration rule in the
      // same commit as the decision that needs it wider is how a rule stops being a check.
      problems.push(...roleScopedCorroboration(e, where, { bypassing, rolePolicies, pending }));
    }
    // An exemption past its review date is a finding rather than a grandfathered fact. Dates are
    // compared against the snapshot's own measurement date, not against now(): the register is
    // judged against the database state it is being read with. The limitation of that choice,
    // stated rather than hidden (C0 §6.1): `taken_at` only has to move when the migration digest
    // does, so against a still snapshot an exemption does not expire on its own. The comparison is
    // lexicographic and is correct only for zero-padded YYYY-MM-DD on both sides.
    if (e.review_date && snap.taken_at && String(e.review_date) < String(snap.taken_at)) {
      problems.push(`${where}: review date ${e.review_date} is before the snapshot was taken (${snap.taken_at}). `
        + 'An expired exemption is a finding, not a fact that ages into permanence.');
    }
  }
  problems.push(...roleScopedCompleteness(rolePolicies, register));

  // RFC-2026-020 §6.1/1-6, and the honest answer to "which database is this snapshot describing".
  //
  // The snapshot describes the PROVISIONED INSTANCE. Batch 011 is deliberately not applied there —
  // CI is this batch's proof surface, and applying an unmerged authorization boundary to a live
  // database to make a lint pass is the inversion this file exists to prevent. So the objects
  // RFC-2026-020 §6.1/1-6 are about do not exist on the instance, and NO FIELD IS INVENTED FOR
  // THEM: there is no `authz` block, and the gap is declared by name in
  // `not_applied_to_this_instance` instead.
  //
  // The absence is checked in BOTH directions, which is what stops it being a hole:
  //
  //   * while 011 is declared pending, an `authz` block MUST NOT be present — a block describing
  //     objects the declaration says are not there is a measurement of nothing; and
  //   * the moment 011 stops being declared pending, the block becomes REQUIRED, and rules 1-6 run
  //     against it.
  //
  // Until then rules 1-6 are answered where the objects actually exist: `scripts/db/authz-proofs.mjs`
  // measures the CI container after `db-migrate-clean` applies 011, and calls `authzLint` on that
  // live catalog. The rules are not skipped; they are asked of a database that can answer them.
  if (pending.has(AUTHZ_MIGRATION)) {
    if (c.authz !== undefined) {
      problems.push(`the snapshot carries an ${AUTHZ_ROLE} block while ${AUTHZ_MIGRATION} is declared not applied `
        + 'to this instance. One of the two is false. A block describing objects the declaration says do not '
        + 'exist is not a measurement — it is the invented field this whole file exists to refuse.');
    }
  } else {
    problems.push(...authzLint(c));
  }

  // §6.1/7 is a property of the PLATFORM, not of batch 011, so it is checked against this snapshot
  // whether or not 011 has been applied: `auth.uid()` exists on the instance either way, and the
  // inlined copy in 011 is held to it here.
  problems.push(...platformIdentityLint(c));
  // RFC-2026-019 §5, and the reason it is three rules rather than a sentence.
  //
  // The decision is a NEGATIVE -- authenticator is granted membership in none of the service roles --
  // and a negative is the strongest thing a lint can hold: nobody has to remember it, and a later
  // grant fails the build until an RFC changes the decision. RFC-2026-018 proposed the opposite and
  // would have made this rule impossible to write.
  const SERVICE_ROLES_NOT_FOR_THE_REQUEST_PATH = ['app_worker', 'app_command', 'app_maintenance'];
  if (c.authenticator_memberships === undefined) {
    problems.push('the snapshot does not record what authenticator is a member of, so RFC-2026-019 §4/1 '
      + 'cannot be checked — and an unmeasured property must not read as a passing one');
  } else {
    for (const role of c.authenticator_memberships.filter((r) => SERVICE_ROLES_NOT_FOR_THE_REQUEST_PATH.includes(r))) {
      problems.push(`authenticator is a member of ${role} — RFC-2026-019 §4/1 grants it membership in none of `
        + 'the service roles. The request path runs as authenticated and reaches app_command only as the owner '
        + 'of a SECURITY DEFINER function it invokes; a membership makes the role assumable by a JWT claim, '
        + 'which skips the function entirely.');
    }
  }

  // §3 of RFC-2026-017: app_command is deliberately NOT the table owner. A SECURITY DEFINER function
  // owned by the table owner is exempt from the policies on a forced table, so the whole point of
  // routing privileged writes through such a function dies if the owner is the table's owner.
  for (const t of c.tenant_tables ?? []) {
    if (t.owner === undefined) {
      problems.push(`app.${t.table}: no owner recorded — RFC-2026-017 §3 turns on which role owns it`);
    } else if (t.owner === 'app_command') {
      problems.push(`app.${t.table} is owned by app_command — RFC-2026-017 §3 requires it not be the table `
        + 'owner, because a SECURITY DEFINER function owned by the table owner is exempt from the policies '
        + 'on a forced table');
    }
  }

  for (const v of c.exposed_views ?? []) {
    if (!(v.reloptions ?? []).some((o) => /^security_invoker=(true|on)$/i.test(o))) {
      problems.push(`app.${v.view}: not security_invoker`);
    }
  }
  for (const f of c.security_definer_functions ?? []) {
    // Recorded so that the first function owned by app_command arrives in a diff rather than
    // unremarked. This rule does not forbid that owner — it is what RFC-2026-017 §3 expects of a
    // command function — it forbids not knowing.
    if (!f.owner) {
      problems.push(`${f.function}: SECURITY DEFINER with no owner recorded — the owner is what decides `
        + 'whether the function is subject to the policies on a forced table');
    }
    if (!(f.config ?? []).some((o) => /^search_path=""$/.test(o))) {
      problems.push(`${f.function}: SECURITY DEFINER without an empty search_path`);
    }
    // A SECURITY DEFINER function owned by a role that bypasses RLS is exempt from every policy
    // written for it, forced or not. Recorded, not yet failing: batch 000's helper is owned by
    // `postgres` because that is the only role the platform gives us today, and the role topology
    // that fixes it is A1's to create. Failing here would fail the repository for a defect it
    // cannot fix yet; naming it keeps it visible until it can.
    if ((c.roles_bypassing_rls ?? []).includes(f.owner)) {
      stderr.write(`  note: ${f.function} is owned by ${f.owner}, which bypasses RLS. `
        + 'It is exempt from every policy regardless of FORCE. Tracked for the role topology.\n');
    }
  }

  // The service roles RFC-2026-017 created. Every property here was a deliberate decision, so
  // every one is asserted rather than assumed to hold.
  //
  // `has_password` is read from `pg_authid` in the snapshot, NOT `pg_roles`: `pg_roles` replaces
  // rolpassword with the literal '********', so the obvious query reports a password on every role
  // including ones that have none. The first measurement taken here made exactly that mistake.
  const SERVICE_ROLES = ['app_command', 'app_maintenance', 'app_worker'];
  const present = (c.service_roles ?? []).map((r) => r.role).sort();
  if (c.service_roles !== undefined) {
    for (const name of SERVICE_ROLES) {
      if (!present.includes(name)) problems.push(`service role ${name} is missing from the catalog — RFC-2026-017 created it`);
    }
    for (const r of c.service_roles ?? []) {
      // The one that matters. A service role that bypasses RLS is the exact defect this whole
      // decision exists to prevent, and it would look identical to a working one from the outside.
      if (r.bypassrls) problems.push(`${r.role} holds BYPASSRLS — RFC-2026-017 requires that RLS apply to it, and every policy written for it is inert while this is true`);
      // The other half of RFC-2026-016 §6, missing until A1's countersignature §5.2 pointed at it.
      // A SUPERUSER bypasses row level security whatever rolbypassrls says, so a service role that
      // acquired superuser would satisfy the check above and defeat the decision entirely. The
      // cheaper half was implemented and the half that cannot be worked around was not.
      if (r.superuser) problems.push(`${r.role} is a SUPERUSER — a superuser bypasses row level security whatever rolbypassrls says, so every policy written for this role is inert`);
      if (r.superuser === undefined) problems.push(`${r.role} carries no superuser field in the snapshot — the property RFC-2026-016 §6 requires cannot be checked, and an unmeasured property must not read as a passing one`);
      if (r.canlogin && !r.has_password) problems.push(`${r.role} can log in with no password`);
      if (r.can_use_private) problems.push(`${r.role} has USAGE on private, which no service role is granted`);
      // Two different switches, and batch 002 confused them. `assumable` is what lets a test or a
      // maintenance path deliberately become this role; `inherited` would hand its privileges to
      // the admin role ambiently, which is how a path ends up running with more than it declared.
      if (r.assumable_by_admin === false) problems.push(`${r.role} cannot be assumed by the administrative role — every service-path assertion fails at the assume-identity step, and with SQLSTATE 42501, the same code an RLS refusal raises`);
      if (r.inherited_by_admin === true) problems.push(`${r.role} is inherited ambiently by the administrative role; it must be taken by an explicit SET ROLE`);
    }
  }

  // The measurement that answers DATA-DEC-03's decisive question, kept as a standing assertion
  // rather than a one-off: these are the roles that bypass RLS on this platform today. A new one
  // appearing is a security event, not a detail.
  const KNOWN_BYPASS = ['postgres', 'service_role', 'supabase_admin', 'supabase_etl_admin', 'supabase_read_only_user'];
  const unexpected = (c.roles_bypassing_rls ?? []).filter((r) => !KNOWN_BYPASS.includes(r));
  // And the superuser set, pinned the same way and for the same reason: superuser is the wider
  // property. Measured 2026-09-06 — `supabase_admin` is the only rolsuper on the instance. A second
  // one appearing is a platform change with security consequences, not a detail.
  const KNOWN_SUPERUSERS = ['supabase_admin'];
  for (const role of (c.roles_superuser ?? []).filter((r) => !KNOWN_SUPERUSERS.includes(r))) {
    problems.push(`${role} is a SUPERUSER and was not when this was measured — a superuser bypasses row level security, so every policy in this database is advisory for it`);
  }
  for (const r of unexpected) problems.push(`role ${r} bypasses RLS and is not in the known platform set — every policy is inert for it`);

  return problems;
}

// STATIC: the command contract describes itself honestly — every target §12.5 names is reachable.
export async function contractCheck(makefileText) {
  const makefile = makefileText ?? await readFile('Makefile', 'utf8');
  return ORDER.concat('verify')
    .filter((t) => !new RegExp(`^db-${t}:`, 'm').test(makefile))
    .map((t) => `Makefile exposes no target db-${t}, which §12.5 requires`);
}

// STATIC: nothing is generated yet, so there is nothing to drift. Saying so is the honest answer;
// returning ok as though a comparison happened is not.
async function generatedDriftCheck() { return []; }

function refuseLive(target) {
  stderr.write(
    `db-${target} needs a Postgres test instance and none is configured.\n`
    + `  Set ${TEST_URL} to a TEST database. §12.5 forbids a production URL and requires a separate instance;\n`
    + '  db-reset-test additionally refuses any host or database not on an explicit test allowlist.\n'
    + '  This target has no no-database mode. It fails rather than report a pass it cannot earn.\n');
  return 1;
}

// The live half, wired. Each target does its job or fails saying why; none has a mode that
// reports a pass without a database, which is what `refuseLive` exists to enforce.
async function runLive(target) {
  const { script } = await import('./psql-driver.mjs');

  if (target === 'reset-test') {
    // §12.5: reset must refuse any host or database outside an explicit test allowlist. The
    // allowlist is deliberately narrow — a local container or the CI service — because this target
    // DROPS things, and the cost of a wrong match is someone's data.
    const url = env[TEST_URL] ?? '';
    const allowed = /@(localhost|127\.0\.0\.1|postgres)[:/]/.test(url);
    if (!allowed) {
      stderr.write('db-reset-test refuses this host: it is not localhost, 127.0.0.1 or the CI service container.\n'
        + '  This target drops and recreates. It does not run against a host it cannot recognise as a test instance.\n');
      return 1;
    }
    const out = await script('drop schema if exists app cascade;\ndrop schema if exists private cascade;');
    if (out.error) { stderr.write(`  ${out.error.message}\n`); return 1; }
    return 0;
  }

  if (target === 'migrate-clean') {
    // The prerequisite first, then every batch. It is applied here rather than assumed of the
    // caller for the reason the file itself gives: a prerequisite that lives in a workflow is a
    // prerequisite the command does not have.
    for (const { name, sql } of await migrateCleanSteps()) {
      const out = await script(sql);
      if (out.error) { stderr.write(`  ${name}: ${out.error.message} (${out.error.code ?? 'no code'})\n`); return 1; }
      stdout.write(`  applied ${name}\n`);
    }
    return 0;
  }

  if (target === 'migrate-upgrade') {
    // An upgrade path needs a previous-release fixture to upgrade FROM, and none is declared yet.
    // Saying so is the honest outcome; re-running migrate-clean and calling it an upgrade would be
    // a target reporting a check it did not perform.
    stderr.write('db-migrate-upgrade has no previous-release fixture to upgrade from.\n'
      + '  §12.5 asks for FIXTURE=previous-release; none is declared, so there is nothing to verify.\n'
      + '  This is a missing fixture, not a passing upgrade.\n');
    return 1;
  }

  if (target === 'seed-replay') {
    // Idempotence is the claim: applying twice leaves the same counts. Nothing seeds yet beyond
    // the identity fixture, which is a test fixture rather than a global seed, so there is no
    // global seed runner to replay.
    stderr.write('db-seed-replay has no global seed to replay. §12.3 item 4 is not implemented, and an empty replay is not a passing one.\n');
    return 1;
  }

  if (target === 'rls-smoke' || target === 'test-foundation') {
    // rls-smoke goes through the adapter that binds A1's cases to psql. test-foundation runs the
    // module suites under tests/, which are the static half and need no database — they are here
    // because §12.5 names the target, and running them twice is cheaper than a target that lies.
    const entry = target === 'rls-smoke'
      ? ['scripts/db/rls-smoke.mjs']
      : ['--test', 'tests/**/*.test.mjs'];
    const { code } = await new Promise((done) => {
      const child = spawn(process.execPath, entry, {
        stdio: 'inherit',
        env: { ...env, LC_ALL: 'C', TZ: 'UTC' },
      });
      child.on('close', (code) => done({ code }));
    });
    return code === 0 ? 0 : 1;
  }

  return 1;
}

async function runTarget(target) {
  const startedAt = hrtime.bigint();
  if (LIVE.has(target)) {
    if (!env[TEST_URL]) { const code = refuseLive(target); summarise(target, startedAt, false, 'no test database configured'); return code; }
    let code;
    try {
      code = await runLive(target);
    } catch (failure) {
      // A missing psql, or anything else that stopped the target from doing its job, is a failure
      // reported as itself. It is never folded into the database's own vocabulary.
      stderr.write(`db-${target}: ${failure.message}\n`);
      code = 1;
    }
    summarise(target, startedAt, code === 0, code === 0 ? '' : 'see above');
    return code;
  }
  if (!STATIC.has(target)) { stderr.write(`unknown target '${target}'\n`); return 2; }
  const problems = target === 'schema-lint' ? [...await schemaLint(), ...await catalogLint()]
    : target === 'contract-check' ? await contractCheck()
    : await generatedDriftCheck();
  for (const p of problems) stderr.write(`  ${p}\n`);
  summarise(target, startedAt, problems.length === 0, problems.length ? `${problems.length} problem(s)` : '');
  return problems.length === 0 ? 0 : 1;
}

async function verify() {
  const failed = [];
  for (const target of ORDER) if (await runTarget(target) !== 0) failed.push(target);
  if (failed.length === 0) { stdout.write('db-verify: ok — every target passed\n'); return 0; }
  stdout.write(`\ndb-verify: FAILED — ${failed.length} of ${ORDER.length} target(s): ${failed.join(', ')}\n`);
  if (!env[TEST_URL]) stdout.write(`  ${[...LIVE].filter((t) => failed.includes(t)).length} of them need ${TEST_URL}, which is unset.\n`);
  return 1;
}

if (import.meta.url === `file://${argv[1]}`) {
  const target = argv[2];
  if (!target) { stderr.write('usage: node scripts/db/run.mjs <target>\n'); exit(2); }
  exit(target === 'verify' ? await verify() : await runTarget(target));
}
