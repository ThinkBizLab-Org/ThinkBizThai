#!/usr/bin/env node
// Regenerates db/foundation/lint/pinned-grants.json and db/foundation/lint/read-allowlist-known-exceptions.json
// from a live catalog read (batch 170, draft finding F14: the generator behind the committed data, in the
// repository rather than in a run's private directory).
//
//   DB_TEST_URL=postgresql://postgres@127.0.0.1:<port>/postgres node scripts/db/generate-pinned-grants.mjs [--check]
//
// Run it from the repository root on a database `make db-migrate-clean` has just built (the shim, then every
// migration). Without --check it rewrites both files; with --check it writes nothing and exits 1 when either
// file differs from what the catalog says, naming it. It reads only: one SELECT over has_table_privilege and
// has_column_privilege for every non-superuser, non-pg_* role and every table in app and private, each of the
// eight table and four column privileges with and without grant option, a column row dropped when the
// table-level privilege with the same option already holds (the reading rule 7 of the pinned grant probe
// applies). The output is deterministic: tables, roles and privileges sorted, columns in attnum order. The
// files are reviewed data; this script only says what the catalog holds, and a reviewer reads the diff.
//
// The known exceptions' granted_by is read from the migration text (a GRANT naming SELECT and authenticated
// on an app table) and is documentation; the probe reads role, relation and level. The script refuses a
// table-wide client SELECT and a measured client SELECT no migration grants, either direction, rather than
// writing them into a closed list.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { argv, env, exit, stderr, stdout } from 'node:process';

const GRANTS = 'db/foundation/lint/pinned-grants.json';
const EXCEPTIONS = 'db/foundation/lint/read-allowlist-known-exceptions.json';
const MIGRATIONS = 'db/foundation/migrations';

const MEASURE_SQL = `with roles as (select rolname::text as r from pg_roles where not rolsuper and rolname !~ '^pg_'),
tabs as (select c.oid, format('%s.%s', n.nspname, c.relname) as t from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('app', 'private') and c.relkind in ('r', 'p')),
tp as (select unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']) p),
go as (select * from (values (''), (' WITH GRANT OPTION')) v(opt)),
tl as (select tabs.t, roles.r, tp.p || go.opt as p from tabs, roles, tp, go where has_table_privilege(roles.r, tabs.oid, tp.p || go.opt)),
cols as (select tabs.oid, tabs.t, a.attnum, a.attname::text from tabs join pg_attribute a on a.attrelid = tabs.oid and a.attnum > 0 and not a.attisdropped),
cl as (select cols.t, roles.r, p.p || go.opt as p, cols.attnum, cols.attname from cols, roles, unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) p(p), go
       where has_column_privilege(roles.r, cols.oid, cols.attnum, p.p || go.opt) and not has_table_privilege(roles.r, cols.oid, p.p || go.opt))
select json_build_object(
  'table', (select json_agg(json_build_array(t, r, p) order by t, r, p) from tl),
  'column', (select json_agg(json_build_array(t, r, p, attname) order by t, r, p, attnum) from cl),
  'tables', (select json_agg(t order by t) from tabs));
`;

const q = JSON.stringify;
const TP = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'];
const ORDER = ['table', 'SELECT', 'INSERT', 'UPDATE', 'REFERENCES'];

const GRANTS_DOC = {
  _what: 'The closed list of every effective privilege every non-superuser, non-pg_* role holds on every table in schemas app and private (batch 170\'s assertion-only part, plan "Batch 170 -- Can do now" (a); read by PINNED_GRANT_PROBE_SQL in scripts/db/run.mjs).',
  _how_measured: 'Generated from a live catalog read on the clean set (the shim, then every migration through 140, PostgreSQL 17.11) with has_table_privilege and has_column_privilege, then committed as reviewed data. A column privilege a table-level privilege already implies is not listed: the table-level row carries it. No privilege is held WITH GRANT OPTION, and none is ever pinned with one.',
  _shape: 'tables: { "<schema>.<table>": { "<role>": { "table": [table-level privileges], "SELECT" | "INSERT" | "UPDATE" | "REFERENCES": [columns, in attnum order] } } }. A table no role holds anything on is an empty object, so the TABLE list is closed too. A batch that grants, revokes or adds a table changes this file in the same diff.',
};
const EXCEPTIONS_DOC = {
  _what: 'RFC-2026-021 §8.5: the inherited client base-table SELECT grants, named in one place as exceptions rather than as silence. CLOSED: it lists exactly the grants that exist today, measured, and any new one fails the read allowlist probe (scripts/db/run.mjs) unless it is a read-allowlist.json entry. Closing the list (converting these to allowlist views, or keeping them for Pilot) is owed to batch 170 and is Q170-b, undecided.',
  _how_measured: 'Generated from a live catalog read on the clean set (the shim, then every migration through 140, PostgreSQL 17.11): every (client role, base table) where has_any_column_privilege(role, table, \'SELECT\'). Measured: authenticated only, by column grants only (no table-wide SELECT anywhere); anon and PUBLIC hold none. granted_by is read from the migration text and is documentation; the probe reads role, relation and level.',
  _shape: '{ "role": "anon | authenticated | public", "relation": "<schema>.<table>", "level": "columns (SELECT by column grants only) | table (a table-wide SELECT)", "granted_by": ["the migration(s) whose GRANT SELECT names it"] }',
};

function renderGrants(m) {
  const g = {};
  for (const t of m.tables) g[t] = {};
  for (const [t, r, p] of m.table ?? []) { g[t][r] ??= {}; (g[t][r].table ??= []).push(p); }
  for (const [t, r, p, c] of m.column ?? []) { g[t][r] ??= {}; (g[t][r][p] ??= []).push(c); }
  for (const t of Object.keys(g)) for (const r of Object.keys(g[t])) g[t][r].table?.sort((a, b) => TP.indexOf(a) - TP.indexOf(b));
  const roleLine = (privs) => `{ ${ORDER.filter((k) => privs[k]).map((k) => `${q(k)}: ${q(privs[k]).replace(/","/g, '", "')}`).join(', ')} }`;
  let out = '{\n';
  for (const [k, v] of Object.entries(GRANTS_DOC)) out += `  ${q(k)}: ${q(v)},\n`;
  out += '  "tables": {\n';
  const tnames = Object.keys(g).sort();
  tnames.forEach((t, i) => {
    const comma = i < tnames.length - 1 ? ',' : '';
    const roles = Object.keys(g[t]).sort();
    if (!roles.length) { out += `    ${q(t)}: {}${comma}\n`; return; }
    out += `    ${q(t)}: {\n`;
    roles.forEach((r, j) => { out += `      ${q(r)}: ${roleLine(g[t][r])}${j < roles.length - 1 ? ',' : ''}\n`; });
    out += `    }${comma}\n`;
  });
  out += '  }\n}\n';
  JSON.parse(out);
  return { text: out, grants: g, tables: tnames };
}

function renderExceptions(g, tables, migrationsDir = MIGRATIONS) {
  const src = {};
  for (const f of readdirSync(migrationsDir).filter((n) => n.endsWith('.sql')).sort()) {
    const s = readFileSync(`${migrationsDir}/${f}`, 'utf8').replace(/--[^\n]*/g, '');
    for (const x of s.matchAll(/grant\s+([^;]*?)\s+on\s+(?:table\s+)?(app\.\w+)\s+to\s+([^;]*);/gi)) {
      if (!/select/i.test(x[1]) || !/authenticated/.test(x[3])) continue;
      (src[x[2]] ??= new Set()).add(f);
    }
  }
  const exc = [];
  for (const t of tables) {
    const a = g[t].authenticated;
    if (!a) continue;
    if (a.table?.includes('SELECT')) throw new Error(`a table-wide client SELECT on ${t}: not written into a closed list`);
    if (!a.SELECT) continue;
    if (!src[t]) throw new Error(`authenticated SELECTs ${t} and no migration grants it`);
    exc.push({ role: 'authenticated', relation: t, level: 'columns', granted_by: [...src[t]] });
  }
  for (const t of Object.keys(src)) if (!exc.some((e) => e.relation === t)) throw new Error(`a migration grants SELECT on ${t} to authenticated and none is measured`);
  let out = '{\n';
  for (const [k, v] of Object.entries(EXCEPTIONS_DOC)) out += `  ${q(k)}: ${q(v)},\n`;
  out += '  "exceptions": [\n';
  exc.forEach((e, i) => { out += `    { "role": ${q(e.role)}, "relation": ${q(e.relation)}, "level": ${q(e.level)}, "granted_by": ${q(e.granted_by).replace(/","/g, '", "')} }${i < exc.length - 1 ? ',' : ''}\n`; });
  out += '  ]\n}\n';
  JSON.parse(out);
  return out;
}

function main() {
  const check = argv.includes('--check');
  const url = env.DB_TEST_URL;
  if (!url) { stderr.write('generate-pinned-grants: DB_TEST_URL is not set; it reads a database `make db-migrate-clean` has built, and refuses without one.\n'); exit(2); }
  const r = spawnSync('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-d', url, '-f', '-'], { input: MEASURE_SQL, encoding: 'utf8' });
  if (r.status !== 0) { stderr.write(`generate-pinned-grants: psql exited ${r.status}: ${r.stderr}`); exit(2); }
  const measured = JSON.parse(r.stdout.trim());
  const grants = renderGrants(measured);
  const exceptions = renderExceptions(grants.grants, grants.tables);
  let differs = 0;
  for (const [path, text] of [[GRANTS, grants.text], [EXCEPTIONS, exceptions]]) {
    let current = null;
    try { current = readFileSync(path, 'utf8'); } catch { current = null; }
    if (current === text) { stdout.write(`${path}: matches the catalog\n`); continue; }
    differs += 1;
    if (check) stdout.write(`${path}: DIFFERS from the catalog\n`);
    else { writeFileSync(path, text); stdout.write(`${path}: rewritten from the catalog\n`); }
  }
  stdout.write(`${grants.tables.length} tables\n`);
  if (check && differs) exit(1);
}

main();
