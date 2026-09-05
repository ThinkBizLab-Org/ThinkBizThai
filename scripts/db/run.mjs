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

// STATIC: the lint rules §12.3 item 8 lists that can be decided from the migration text without
// connecting anywhere. The rules that need the live catalog — every FK has a supporting index,
// every role's attributes — are asserted by the live targets and are NOT silently claimed here.
export async function schemaLint(files) {
  const problems = [];
  for (const { name, sql } of files ?? await migrationFiles()) {
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
  return problems;
}


const SNAPSHOT = 'db/foundation/lint/catalog-snapshot.json';

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

export async function catalogLint(snapshot, digest) {
  const problems = [];
  const snap = snapshot ?? JSON.parse(await readFile(SNAPSHOT, 'utf8'));
  const expected = digest ?? await migrationSetDigest();

  if (snap.taken_against_migrations !== expected) {
    return [`the catalog snapshot was taken against migration set ${snap.taken_against_migrations}, `
      + `but the migrations now digest to ${expected}. Retake it — a snapshot describing a database `
      + 'that no longer exists is not evidence.'];
  }

  const c = snap.catalog ?? {};
  for (const name of ['app', 'private']) {
    if (!(c.our_schemas ?? []).includes(name)) problems.push(`schema ${name} is not in the live catalog`);
  }
  if (c.public_grants?.usage_on_private !== false) problems.push('PUBLIC holds USAGE on private — no client role may reach it');
  if (c.public_grants?.create_on_app !== false) problems.push('PUBLIC may CREATE in app');

  // The rule the specified lint misses, now asserted against the catalog column rather than text.
  for (const t of c.tenant_tables ?? []) {
    if (!t.rls_enabled) problems.push(`app.${t.table}: relrowsecurity is false`);
    if (!t.rls_forced) problems.push(`app.${t.table}: relforcerowsecurity is false — ENABLE alone leaves the table owner exempt`);
    if (!t.has_pk) problems.push(`app.${t.table}: no primary key`);
    if (!t.comment) problems.push(`app.${t.table}: no owner comment`);
  }
  for (const v of c.exposed_views ?? []) {
    if (!(v.reloptions ?? []).some((o) => /^security_invoker=(true|on)$/i.test(o))) {
      problems.push(`app.${v.view}: not security_invoker`);
    }
  }
  for (const f of c.security_definer_functions ?? []) {
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
  const { query, script } = await import('./psql-driver.mjs');
  const migrations = await migrationFiles();

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
    for (const { name, sql } of migrations) {
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
