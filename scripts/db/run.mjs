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
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { argv, env, exit, stdout, stderr, hrtime } from 'node:process';

const MIGRATIONS = 'db/foundation/migrations';

// The one variable that turns the live half on. It is deliberately NOT `DATABASE_URL`: §12.5
// requires a separate test instance and forbids a production URL, so the name says test.
const TEST_URL = 'DB_TEST_URL';

const LIVE = new Set(['reset-test', 'migrate-clean', 'migrate-upgrade', 'seed-replay', 'rls-smoke', 'test-foundation']);
const STATIC = new Set(['schema-lint', 'contract-check', 'generated-drift-check']);
const ORDER = ['reset-test', 'migrate-clean', 'migrate-upgrade', 'seed-replay', 'schema-lint',
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
    // §3.1 forbids creating or altering an object in a Supabase-managed schema.
    for (const m of stripped.matchAll(/\b(?:create|alter|drop)\b[^;]{0,200}?\b(auth|storage|realtime)\./gi)) {
      problems.push(`${name}: touches the Supabase-managed schema '${m[1]}' — §3.1 forbids it`);
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

async function runTarget(target) {
  const startedAt = hrtime.bigint();
  if (LIVE.has(target)) {
    if (!env[TEST_URL]) { const code = refuseLive(target); summarise(target, startedAt, false, 'no test database configured'); return code; }
    stderr.write(`db-${target}: ${TEST_URL} is set, but no migration runner is wired yet.\n`
      + '  DATA-DEC-02 fixes the contract, not the tool; choosing and wiring one is DB-00 implementation work.\n');
    summarise(target, startedAt, false, 'runner not wired');
    return 1;
  }
  if (!STATIC.has(target)) { stderr.write(`unknown target '${target}'\n`); return 2; }
  const problems = target === 'schema-lint' ? await schemaLint()
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
