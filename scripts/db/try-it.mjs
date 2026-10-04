#!/usr/bin/env node
// TRY IT: a throwaway local Postgres with this repository's database foundation on it, for a person
// who wants to SEE the row level security work rather than read that CI says it does.
//
//   node scripts/db/try-it.mjs up    [--dir <path>] [--port <n>]   make a cluster, migrate it, load the fixtures
//   node scripts/db/try-it.mjs demo  [--dir <path>]                 a scripted tour; exits 1 if any step differs
//   node scripts/db/try-it.mjs psql  [--dir <path>]                 print (not run) the psql command and a cheat-sheet
//   node scripts/db/try-it.mjs down  [--dir <path>]                 stop the cluster and delete what `up` made
//
// db/foundation/TRY-IT.md is the guide. What this file holds to:
//
//   * NOTHING NEW IS WRITTEN TWICE. The shim is db/foundation/ci/supabase-shim.sql, fed as CI feeds it; the
//     migrations go through `node scripts/db/run.mjs migrate-clean` itself (prerequisite, every batch in order,
//     every probe); the helpers and fixtures through rls-smoke's own loadHelpersAndFixtures(); and every
//     refusal the demo shows is a case from tests/db/identity/isolation-cases.mjs, run through run-isolation's
//     runCases, so the demo's verdict is the suite's verdict on that case and its SQL cannot drift from it.
//   * ONLY A CLUSTER IT MADE. `up` refuses a directory that exists and is not empty, and a directory inside
//     the repository; `down` deletes only a directory holding the marker `up` wrote, and only when nothing
//     but what `up` made is in it. Port 5432 is never used, and the URL every subcommand builds must pass
//     tryItRefusal (the repository's testHostRefusal, narrowed to localhost addresses and a non-default port).
//   * THE CLUSTER LISTENS ON 127.0.0.1 ONLY, OVER TCP, WITH NO UNIX SOCKET, and trusts local connections:
//     it holds synthetic fixtures and nothing else, and it is deleted by `down`.
//   * THE DEMO CANNOT PASS VACUOUSLY. Every step declares what it expects; a step with no expectation, a case
//     the suite no longer has, or a case whose expectation differs from the step's is refused before anything
//     runs (demoPlanProblems), and test-kits/db/foundation-contract.test.mjs holds the same statically.
//
// Node built-ins only (RFC-2026-001). Needs initdb, pg_ctl and psql on PATH (Homebrew postgresql@17 is fine).
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile, appendFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { argv, env, exit, stdout, stderr } from 'node:process';
import { fileURLToPath } from 'node:url';

import { testHostRefusal, feed, query, openSession, psqlLex } from './psql-driver.mjs';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MARKER = 'thinkbizthai-try-it.json';
export const MARKER_TOOL = 'thinkbizthai scripts/db/try-it.mjs';
export const DATABASE = 'thinkbizthai_try';
export const DEFAULT_DIR = join(tmpdir(), 'thinkbizthai-try-it');
// What `up` puts in its directory, and therefore the only names `down` will delete.
export const OWNED_ENTRIES = Object.freeze([MARKER, 'data', 'postgres.log', 'migrate-clean.log']);
// A free port is looked for here. 5432 is the default every local Postgres takes; the rest are ports
// this repository's records have used for measurement clusters, left alone so a run never meets one.
export const PORT_RANGE = Object.freeze([55420, 55479]);
export const RESERVED_PORTS = Object.freeze([5432, 5499, 5501, 5503, 5505, 5507, 5509, 5511]);
export const LOCAL_HOSTS = Object.freeze(['localhost', '127.0.0.1', '[::1]']);
export const SHIM = 'db/foundation/ci/supabase-shim.sql';
// initdb and the server are started with LC_ALL=C: on macOS a postmaster that inherits a locale the C library
// resolves through a thread refuses to start ("postmaster became multithreaded during startup", measured).
const CLUSTER_ENV = Object.freeze({ LC_ALL: 'C', LANG: 'C' });

// THE HOST GUARD. testHostRefusal is the repository's (db-reset-test and the EXPLAIN harness use it), and it
// also admits `postgres`, CI's service-container name; this tool runs on a person's machine, so it is
// narrowed to the loopback names, and to a port that is not 5432, where somebody's own Postgres lives.
export function tryItRefusal(url) {
  const shared = testHostRefusal(url);
  if (shared) return shared;
  const parsed = new URL(String(url));
  if (!LOCAL_HOSTS.includes(parsed.hostname.toLowerCase())) return `its host is not one of ${LOCAL_HOSTS.join(', ')}`;
  const port = Number(parsed.port || 5432);
  if (RESERVED_PORTS.includes(port)) return `its port ${port} is one this tool never touches`;
  return null;
}

export const urlFor = (port, database = DATABASE) => `postgresql://postgres@127.0.0.1:${port}/${database}`;

// --- the demo plan ----------------------------------------------------------------------------------------
//
// Two kinds of step. A `counts` step is written here: it assumes a fixture user and counts what that user
// can see, and it expects exact numbers, measured on the fixture as loaded and pinned (a change to a fixture
// or a policy that moves one is a step that fails, which is the point). A `case` step names a case in
// tests/db/identity/isolation-cases.mjs and repeats the outcome that case expects; the case's own SQL, identity
// and assertion run, through runCases.
export const USERS = Object.freeze({
  user_owner_a: 'the owner of workspace A',
  user_editor_a: 'an editor in workspace A, scoped to business A1',
  user_viewer_a: 'a viewer in workspace A',
  user_approver_a: 'an approver in workspace A, scoped to business A1',
  user_owner_b: 'the owner of workspace B, the other tenant',
});

export const COUNTS_SQL = 'select (select count(*) from app.workspaces)::text as workspaces,'
  + ' (select count(*) from app.business_profiles)::text as businesses,'
  + ' (select count(*) from app.content_items)::text as content_items';

export const DEMO_STEPS = Object.freeze([
  {
    heading: '1. What each person can see',
    title: 'The owner of workspace A',
    kind: 'counts', user: 'user_owner_a',
    expect: { workspaces: '1', businesses: '4', content_items: '4' },
    proves: 'The database holds 2 workspaces, 5 businesses and 5 content items in all. The owner of A sees all of A'
      + ' (1 workspace, businesses A1-A4, the 4 content items under them) and nothing of B.',
  },
  {
    title: 'An editor in workspace A',
    kind: 'counts', user: 'user_editor_a',
    expect: { workspaces: '1', businesses: '1', content_items: '3' },
    proves: 'The editor\'s membership is scoped to business A1, so they see that one business and its 3 content items,'
      + ' not businesses A2-A4 and not the item under A2.',
  },
  {
    title: 'A viewer in workspace A',
    kind: 'counts', user: 'user_viewer_a',
    expect: { workspaces: '1', businesses: '4', content_items: '4' },
    proves: 'The viewer\'s membership covers all businesses, so they may read everything in A (writing is step 3).',
  },
  {
    title: 'The owner of workspace B',
    kind: 'counts', user: 'user_owner_b',
    expect: { workspaces: '1', businesses: '1', content_items: '1' },
    proves: 'The other tenant sees only its own: workspace B, business B1 and its one content item, none of A\'s.',
  },
  {
    heading: '2. One tenant cannot read the other',
    title: 'Owner A reads its own workspace by id (the control)',
    kind: 'case', case: 'owner-a-sees-workspace-a', expect: 'rows',
    proves: 'The read below is not empty merely because the table is empty.',
  },
  {
    title: "Owner A asks for workspace B by its exact id",
    kind: 'case', case: 'owner-a-cannot-see-workspace-b', expect: 'no-rows',
    proves: "Holding the other tenant's real id is not enough: the row is filtered out, 0 rows.",
  },
  {
    title: "Owner A asks for business B1 by its exact id",
    kind: 'case', case: 'owner-a-cannot-see-business-b1', expect: 'no-rows',
    proves: 'The same holds one level down, for a business of tenant B.',
  },
  {
    heading: '3. A viewer cannot write',
    title: 'The viewer tries to create a content item',
    kind: 'case', case: 'viewer-a-cannot-create-a-content-item', expect: 'denied',
    proves: 'A viewer may read content (step 1) but an INSERT is refused by the row level security policy, error 42501.',
  },
  {
    heading: '4. Nobody moves a workspace through its lifecycle by hand (batch 170)',
    title: "Owner A tries to set its own workspace's lifecycle_state to 'closing'",
    kind: 'case', case: 'owner-a-cannot-move-workspace-a-to-closing-by-id', expect: 'denied',
    proves: 'Closing a workspace needs confirmation and an audit event, so no client role holds the column: refused by the privilege system, error 42501.',
  },
  {
    title: 'The same owner can still rename the workspace (the control)',
    kind: 'case', case: 'owner-a-can-still-rename-workspace-a-after-batch-170', expect: 'rows',
    proves: 'The refusal above is about lifecycle_state only, not about every change to the table.',
  },
  {
    heading: '5. Nobody writes a row in someone else\'s name (batch 127)',
    title: 'Owner A creates a content item but puts the editor in created_by',
    kind: 'case', case: 'owner-a-cannot-forge-created-by-alone-on-a-content-item', expect: 'denied',
    proves: 'created_by must be the person actually writing; a forged author is refused, error 42501.',
  },
  {
    heading: '6. A settled approval cannot be changed (batches 125 and 126)',
    title: 'The approver tries to decide an already-approved request again',
    kind: 'case', case: 'approver-a-cannot-redecide-a-settled-approval-request', expect: 'no-effect',
    proves: 'Once decided, a request is out of reach: the update touches 0 rows, and a second read shows it still says approved.',
  },
  {
    title: 'The workspace owner tries the same',
    kind: 'case', case: 'owner-a-cannot-redecide-a-settled-approval-request', expect: 'no-effect',
    proves: 'Not even the owner can overwrite the approver\'s decision.',
  },
]);

// Everything that would let the demo report success without having shown anything. Pure, so the contract
// test can run it without a database. `cases` is buildCases(resolve); `users` the catalog's identities.
export function demoPlanProblems(steps, cases, users) {
  const problems = [];
  const byId = new Map(cases.map((c) => [c.id, c]));
  if (!steps.length) problems.push('the demo has no steps');
  steps.forEach((step, i) => {
    const at = `step ${i + 1} (${step.title ?? 'untitled'})`;
    if (!step.title || !step.proves) problems.push(`${at}: says nothing about what it proves`);
    if (step.kind === 'counts') {
      if (!users[step.user]) problems.push(`${at}: ${step.user} is not a fixture identity`);
      if (!USERS[step.user]) problems.push(`${at}: ${step.user} has no plain-English description`);
      const keys = Object.keys(step.expect ?? {});
      if (keys.join(',') !== 'workspaces,businesses,content_items') problems.push(`${at}: expects no exact count for each of workspaces, businesses, content_items`);
      for (const k of keys) if (!/^\d+$/.test(step.expect[k])) problems.push(`${at}: ${k} is not an exact count`);
    } else if (step.kind === 'case') {
      const c = byId.get(step.case);
      if (!c) { problems.push(`${at}: the suite has no case ${step.case}`); return; }
      if (!['rows', 'no-rows', 'denied', 'no-effect'].includes(step.expect)) problems.push(`${at}: expects nothing the demo can check`);
      if (c.expect !== step.expect) problems.push(`${at}: expects ${step.expect} and the suite's case expects ${c.expect}`);
      if (c.expect === 'denied' && !c.deniedBy) problems.push(`${at}: a refusal with no named layer could be any refusal`);
      if (c.expect === 'no-effect' && !c.witness) problems.push(`${at}: a no-effect case with no witness`);
    } else {
      problems.push(`${at}: unknown kind ${step.kind}`);
    }
  });
  // A tour of refusals alone would pass on a database that refuses everything.
  if (!steps.some((s) => s.expect === 'rows' || s.kind === 'counts')) problems.push('no step expects to see a row');
  return problems;
}

// --- small helpers ----------------------------------------------------------------------------------------
const say = (text = '') => stdout.write(`${text}\n`);
const fail = (text) => { stderr.write(`try-it: ${text}\n`); return 1; };

function parseArgs(args) {
  const out = { command: args[0], dir: DEFAULT_DIR, port: null };
  for (let i = 1; i < args.length; i += 1) {
    const next = args[i + 1] ?? '';
    if (args[i] === '--dir' && next) out.dir = args[++i];
    else if (args[i] === '--port' && /^\d+$/.test(next) && Number(next) >= 1024 && Number(next) <= 65535) out.port = Number(args[++i]);
    else out.unknown ??= args[i];
  }
  out.dir = resolve(out.dir);
  return out;
}

function runTool(file, args, { input, envExtra, logTo } = {}) {
  return new Promise((done) => {
    const child = spawn(file, args, { cwd: REPO, env: { ...env, ...envExtra }, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('error', (error) => done({ code: error.code === 'ENOENT' ? 127 : 1, out: `${file}: ${error.message}` }));
    child.on('close', async (code) => {
      if (logTo) await appendFile(logTo, out);
      done({ code, out });
    });
    child.stdin.end(input ?? '');
  });
}

function portIsFree(port) {
  return new Promise((done) => {
    const server = createServer();
    server.once('error', () => done(false));
    server.listen({ port, host: '127.0.0.1', exclusive: true }, () => server.close(() => done(true)));
  });
}

async function freePort() {
  for (let p = PORT_RANGE[0]; p <= PORT_RANGE[1]; p += 1) if (await portIsFree(p)) return p;
  return null;
}

const insideRepo = (path) => {
  let real = path;
  try { real = realpathSync(path); } catch { /* not created yet: compare as given */ }
  const repo = realpathSync(REPO);
  return real === repo || real.startsWith(repo + sep);
};

async function readMarker(dir) {
  const path = join(dir, MARKER);
  if (!existsSync(path)) return null;
  try {
    const marker = JSON.parse(await readFile(path, 'utf8'));
    return marker.tool === MARKER_TOOL && marker.dir === dir && Number.isInteger(marker.port) ? marker : null;
  } catch { return null; }
}

// --- up ---------------------------------------------------------------------------------------------------
async function up({ dir, port: askedPort }) {
  if (insideRepo(dir)) return fail(`${dir} is inside the repository; the cluster goes outside it (default ${DEFAULT_DIR}).`);
  const already = await readMarker(dir);
  if (already) {
    return fail(`${dir} already holds a try-it cluster on port ${already.port}. Run \`node scripts/db/try-it.mjs demo\` to use it, or \`down\` first to start over.`);
  }
  if (existsSync(dir) && readdirSync(dir).length) return fail(`${dir} exists and is not empty, and it was not made by \`up\`. Nothing was touched. Pass --dir <a new path>.`);
  const port = askedPort ?? await freePort();
  if (!port) return fail(`no free port in ${PORT_RANGE.join('-')}; pass --port <n>.`);
  if (RESERVED_PORTS.includes(port)) return fail(`port ${port} is one this tool never touches.`);
  if (!await portIsFree(port)) return fail(`port ${port} is in use.`);
  const url = urlFor(port);
  const refusal = tryItRefusal(url);
  if (refusal) return fail(`refusing ${url}: ${refusal}`);

  const data = join(dir, 'data');
  const log = join(dir, 'postgres.log');
  await mkdir(dir, { recursive: true });
  // The marker first, so a half-made cluster is still one `down` will clean up.
  await writeFile(join(dir, MARKER), `${JSON.stringify({ tool: MARKER_TOOL, dir, port, database: DATABASE, created: new Date().toISOString() }, null, 2)}\n`);
  say(`[1/6] initdb: a new, empty cluster in ${data} (locale C, superuser postgres)`);
  const init = await runTool('initdb', ['-D', data, '-U', 'postgres', '--locale=C', '-E', 'UTF8', '--auth=trust', '--no-instructions', '--no-sync'], { envExtra: CLUSTER_ENV });
  if (init.code !== 0) return fail(`initdb failed${init.code === 127 ? ' (is PostgreSQL installed and initdb on PATH?)' : ''}:\n${init.out}`);
  // Loopback TCP only, no unix socket, and settings for a disposable cluster: small, and not durable.
  await appendFile(join(data, 'postgresql.conf'), [
    '', '# scripts/db/try-it.mjs: a disposable local cluster',
    "listen_addresses = '127.0.0.1'", `port = ${port}`, "unix_socket_directories = ''",
    'max_connections = 20', "shared_buffers = '32MB'", 'fsync = off', 'synchronous_commit = off',
    'full_page_writes = off', "max_wal_size = '96MB'", "min_wal_size = '32MB'", '',
  ].join('\n'));
  say(`[2/6] pg_ctl start: listening on 127.0.0.1:${port} (TCP only, no unix socket)`);
  const started = await runTool('pg_ctl', ['-D', data, '-l', log, '-w', '-t', '60', 'start'], { envExtra: CLUSTER_ENV });
  if (started.code !== 0) return fail(`pg_ctl start failed; see ${log}:\n${started.out}`);

  process.env.DB_TEST_URL = url;
  const created = await query(`create database ${DATABASE}`, { url: urlFor(port, 'postgres') });
  if (created.error) return fail(`create database: ${created.error.message}`);

  say(`[3/6] the Supabase shim (${SHIM}), as CI applies it before migrating`);
  const shim = await readFile(join(REPO, SHIM), 'utf8');
  const meta = psqlLex(shim).metaCommands;
  if (meta.length) return fail(`${SHIM} line ${meta[0].line} carries a psql meta-command; it is not fed.`);
  const shimmed = await feed(shim, { url });
  if (shimmed.error) return fail(`the shim did not apply: ${shimmed.error.message}`);

  say('[4/6] node scripts/db/run.mjs migrate-clean: the prerequisite, every migration in order, and every probe');
  const migrateLog = join(dir, 'migrate-clean.log');
  const migrated = await runTool(process.execPath, ['scripts/db/run.mjs', 'migrate-clean'],
    { envExtra: { DB_TEST_URL: url, LC_ALL: 'C', TZ: 'UTC' }, logTo: migrateLog });
  const applied = (migrated.out.match(/^ {2}applied /gm) ?? []).length;
  const summary = migrated.out.split('\n').find((l) => l.startsWith('db-migrate-clean:')) ?? '(no summary line)';
  if (migrated.code !== 0) return fail(`migrate-clean failed; the whole output is in ${migrateLog}. Its summary: ${summary}`);
  say(`      ${applied} scripts applied; ${summary}`);

  say('[5/6] the auth-context helpers and the identity fixtures, loaded exactly as `make db-rls-smoke` loads them');
  const { loadHelpersAndFixtures } = await import('./rls-smoke.mjs');
  const { FIXTURE_SQL_FILES } = await import('../../tests/db/identity/run-isolation.mjs');
  if (await loadHelpersAndFixtures() !== 0) return fail('the helpers or a fixture did not load (above).');
  say(`      ${FIXTURE_SQL_FILES.length} fixture files loaded`);

  const counted = await query(`select (select count(*) from pg_tables where schemaname in ('app','private'))::text as tables,
    (select count(*) from pg_policies where schemaname in ('app','private'))::text as policies,
    (select count(*) from app.workspaces)::text as workspaces`, { url });
  const n = counted.rows?.[0] ?? {};
  say('[6/6] ready');
  say();
  say(`DB_TEST_URL=${url}`);
  say();
  say(`What you have now: a private PostgreSQL ${await serverVersion(url)} cluster in ${dir}, listening only on`
    + ` 127.0.0.1:${port}, with the database "${DATABASE}" built exactly as CI builds its test database: the shim,`
    + ` then all ${applied - 1} migrations (${n.tables ?? '?'} tables in app and private, ${n.policies ?? '?'} row level security policies),`
    + ` then the synthetic fixtures (${n.workspaces ?? '?'} workspaces: tenant A and tenant B, which the tests set against each other).`
    + ' Nothing here is real data and nothing is connected to any other service. Next: `node scripts/db/try-it.mjs demo`'
    + ' for the guided tour, `node scripts/db/try-it.mjs psql` to poke at it yourself, and `node scripts/db/try-it.mjs down`'
    + ' to stop it and delete it.');
  return 0;
}

async function serverVersion(url) {
  const v = await query('show server_version', { url });
  return v.rows?.[0]?.server_version ?? '';
}

// --- connect to what `up` made ----------------------------------------------------------------------------
async function attached(dir) {
  const marker = await readMarker(dir);
  if (!marker) return { error: `no try-it cluster in ${dir}. Run \`node scripts/db/try-it.mjs up\` first${dir === DEFAULT_DIR ? '' : ` (with --dir ${dir})`}.` };
  const url = urlFor(marker.port);
  const refusal = tryItRefusal(url);
  if (refusal) return { error: `refusing ${url}: ${refusal}` };
  return { marker, url };
}

// --- demo -------------------------------------------------------------------------------------------------
const shown = (sql, params) => String(sql).replace(/\$(\d+)/g, (whole, d) => (params?.[d - 1] === undefined ? whole : `'${params[d - 1]}'`));

function describeOutcome(outcome) {
  if (!outcome) return 'nothing was recorded';
  if (outcome.error) return `refused: ERROR ${outcome.error.code ?? '(no code)'}: ${outcome.error.message}`;
  const rows = outcome.rows ?? [];
  if (!rows.length) return '0 rows';
  const body = rows.slice(0, 3).map((r) => JSON.stringify(r)).join(', ');
  return `${rows.length} row${rows.length === 1 ? '' : 's'}: ${body}${rows.length > 3 ? ', ...' : ''}`;
}

const EXPECTED_TEXT = {
  rows: 'at least one row comes back',
  'no-rows': '0 rows (filtered out, not an error)',
  denied: 'refused with ERROR 42501',
  'no-effect': '0 rows changed, and a second read shows the row unchanged',
};

async function demo({ dir }) {
  const at = await attached(dir);
  if (at.error) return fail(at.error);
  process.env.DB_TEST_URL = at.url;
  const { buildCases } = await import('../../tests/db/identity/isolation-cases.mjs');
  const { fixtureResolver, runCases, FIXTURE_CATALOG } = await import('../../tests/db/identity/run-isolation.mjs');
  const { sessionDriver } = await import('./rls-smoke.mjs');
  const catalog = JSON.parse(await readFile(join(REPO, FIXTURE_CATALOG), 'utf8')).identities;
  const resolveId = await fixtureResolver();
  const cases = buildCases(resolveId);
  const plan = demoPlanProblems(DEMO_STEPS, cases, catalog);
  if (plan.length) { for (const p of plan) stderr.write(`  ${p}\n`); return fail('the demo plan is not sound, so nothing was run.'); }
  const nameOf = new Map(Object.entries(catalog).map(([k, v]) => [v.uuid, k]));
  const who = (subject) => { const sym = nameOf.get(subject); return `${sym} (${USERS[sym] ?? catalog[sym]?.role?.split('.')[0] ?? 'a fixture identity'}) id ${subject}`; };
  const byId = new Map(cases.map((c) => [c.id, c]));

  say('ThinkBizThai database foundation: a guided tour of row level security');
  say(`Database: ${at.url}`);
  say('Every step runs inside its own transaction and is rolled back, so the tour changes nothing and can be run again.');
  const session = openSession({ url: at.url });
  const failures = [];
  try {
    for (const [i, step] of DEMO_STEPS.entries()) {
      if (step.heading) { say(); say(`== ${step.heading} ==`); }
      say();
      say(`-- ${step.title}`);
      // Every statement the driver runs is recorded, so what is printed is what the assertion judged.
      const record = [];
      const inner = sessionDriver(session);
      const driver = { ...inner, async exec(statement, params) { const outcome = await inner.exec(statement, params); record.push({ statement, params, outcome }); return outcome; } };
      let testCase;
      if (step.kind === 'counts') {
        testCase = { id: `demo-counts-${step.user}`, as: { helper: 'as_user', subject: resolveId(step.user) }, sql: COUNTS_SQL, params: [], expect: 'rows' };
      } else {
        testCase = byId.get(step.case);
      }
      say(`   as:       ${who(testCase.as.subject)}`);
      say(`   runs:     ${shown(testCase.sql, testCase.params)}`);
      say(`   expected: ${step.kind === 'counts' ? `workspaces ${step.expect.workspaces}, businesses ${step.expect.businesses}, content items ${step.expect.content_items}` : EXPECTED_TEXT[step.expect]}`);
      const result = await runCases([testCase], driver);
      const main = record.find((r) => r.statement === testCase.sql);
      say(`   got:      ${describeOutcome(main?.outcome)}`);
      if (testCase.witness) {
        const w = record.filter((r) => r.statement === testCase.witness.sql).pop();
        say(`   then, as ${nameOf.get(testCase.witness.as.subject)}: ${shown(testCase.witness.sql, testCase.witness.params)}`);
        say(`             ${describeOutcome(w?.outcome)}`);
      }
      let problem = result.failed[0] ? `${result.failed[0].phase ?? 'assertion'}: ${result.failed[0].detail ?? result.failed[0].error ?? JSON.stringify(result.failed[0])}` : null;
      if (!problem && step.kind === 'counts') {
        const row = main?.outcome?.rows?.[0] ?? {};
        const off = Object.entries(step.expect).filter(([k, v]) => row[k] !== v).map(([k, v]) => `${k} is ${row[k]}, expected ${v}`);
        if (off.length) problem = off.join('; ');
      }
      say(`   proves:   ${step.proves}`);
      say(`   result:   ${problem ? `NOT AS EXPECTED -- ${problem}` : 'as expected'}`);
      if (problem) failures.push(`step ${i + 1}: ${step.title}`);
    }
  } finally {
    await session.close();
  }
  say();
  if (failures.length) {
    say(`DEMO FAILED: ${failures.length} of ${DEMO_STEPS.length} steps did not behave as expected:`);
    for (const f of failures) say(`  ${f}`);
    return 1;
  }
  say(`All ${DEMO_STEPS.length} steps behaved as expected.`);
  say('What this does NOT show: any app or screen, the service worker path, or a real Supabase project. It shows the');
  say('database rules on a local copy built the way CI builds one.');
  return 0;
}

// --- psql ---------------------------------------------------------------------------------------------------
async function psqlHelp({ dir }) {
  const at = await attached(dir);
  if (at.error) return fail(at.error);
  const ids = JSON.parse(await readFile(join(REPO, 'db/foundation/seeds/fixture-catalog.json'), 'utf8')).identities;
  say('Connect (copy and paste; this script does not run it):');
  say();
  say(`  psql "${at.url}"`);
  say();
  say('You connect as the superuser "postgres", which row level security does NOT apply to: as yourself you see every');
  say('row of both tenants. To see what one fixture user sees, become them inside a transaction. Five lines:');
  say();
  say('  begin;');
  say(`  select private.as_user('${ids.user_owner_a.uuid}');  -- user_owner_a; any id below works`);
  say("  select current_user, current_setting('request.jwt.claims', true);  -- authenticated, and that id");
  say('  select id, name from app.workspaces;                               -- only what that user may see');
  say('  rollback;                                                          -- back to being postgres, nothing kept');
  say();
  say('Fixture users you can put in place of that id:');
  for (const sym of Object.keys(USERS)) say(`  ${sym.padEnd(16)} ${ids[sym].uuid}   ${USERS[sym]}`);
  say();
  say('Without the helper, the same identity is two settings (what Supabase sets from a login token):');
  say("  select set_config('request.jwt.claims', '{\"role\":\"authenticated\",\"sub\":\"<id>\"}', true), set_config('role', 'authenticated', true);");
  return 0;
}

// --- down ---------------------------------------------------------------------------------------------------
async function down({ dir }) {
  const marker = await readMarker(dir);
  if (!marker) return fail(`${dir} holds no marker written by \`up\`, so nothing is stopped and nothing is deleted.`);
  if (insideRepo(dir)) return fail(`${dir} is inside the repository; refusing to delete it.`);
  const extra = readdirSync(dir).filter((name) => !OWNED_ENTRIES.includes(name));
  if (extra.length) return fail(`${dir} holds things \`up\` did not make (${extra.join(', ')}); nothing is deleted.`);
  const data = join(dir, 'data');
  if (existsSync(join(data, 'postmaster.pid'))) {
    say(`stopping the cluster on port ${marker.port}`);
    const stopped = await runTool('pg_ctl', ['-D', data, '-m', 'fast', '-w', '-t', '60', 'stop'], { envExtra: CLUSTER_ENV });
    if (stopped.code !== 0) return fail(`pg_ctl stop failed, so nothing is deleted:\n${stopped.out}`);
  }
  await rm(dir, { recursive: true, force: true });
  say(`deleted ${dir}`);
  return 0;
}

const COMMANDS = { up, demo, psql: psqlHelp, down };

async function main() {
  const args = parseArgs(argv.slice(2));
  const command = COMMANDS[args.command];
  if (!command || args.unknown) {
    stderr.write(`${args.unknown ? `not understood: ${args.unknown}\n` : ''}usage: node scripts/db/try-it.mjs <up|demo|psql|down> [--dir <path>] [--port <1024-65535>]\n`
      + `  default --dir is ${DEFAULT_DIR}; see db/foundation/TRY-IT.md\n`);
    return 2;
  }
  process.chdir(REPO);
  return command(args);
}

if (import.meta.url === `file://${argv[1]}`) exit(await main());
