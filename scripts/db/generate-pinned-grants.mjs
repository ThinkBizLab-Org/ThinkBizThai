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
// The known exceptions' granted_by is read from the migration text (a GRANT naming SELECT and the client role,
// or PUBLIC, on an app table) and is documentation; the probe reads role, relation and level. Every client
// role is read, anon as well as authenticated (a PUBLIC grant reads as both). The script REFUSES, exit 3 and
// no file written, a table-wide client SELECT and a measured client SELECT no migration grants, rather than
// writing either into a closed list. A migration that grants a client SELECT the catalog no longer holds (a
// later REVOKE, which a closed list exists to permit) is reported on stderr and left out, not refused.
//
// Exit codes: 0 written, or (--check) both files match; 1 (--check) a file differs; 2 no DB_TEST_URL, or psql
// failed; 3 refused. It is a REVIEWER'S TOOL, not a gate: no make target, npm script, test or CI step runs it.
// The gate is the pinned grant and read allowlist probes in migrate-clean, which read the catalog against the
// committed files on every run; this script only says what the catalog holds (batch 170's review round: C0
// F7, Q0 Q-6).
import { readFileSync, writeFileSync, readdirSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { argv, env, exit, stderr, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';
import { SQL_LINE_COMMENTS } from './sql-lexer.mjs';

const GRANTS = 'db/foundation/lint/pinned-grants.json';
const EXCEPTIONS = 'db/foundation/lint/read-allowlist-known-exceptions.json';
const MIGRATIONS = 'db/foundation/migrations';

const MEASURE_SQL = `with roles as (select rolname::text as r from pg_roles where not rolsuper and rolname !~ '^pg_'),
tabs as (select c.oid, format('%s.%s', n.nspname, c.relname) as t from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('app', 'private') and c.relkind in ('r', 'p')),
tp as (select unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
                     || case when current_setting('server_version_num')::integer >= 170000 then array['MAINTAIN'] else array[]::text[] end) p),
go as (select * from (values (''), (' WITH GRANT OPTION')) v(opt)),
tl as (select tabs.t, roles.r, tp.p || go.opt as p from tabs, roles, tp, go where has_table_privilege(roles.r, tabs.oid, tp.p || go.opt)),
cols as (select tabs.oid, tabs.t, a.attnum, a.attname::text from tabs join pg_attribute a on a.attrelid = tabs.oid and a.attnum > 0 and not a.attisdropped),
cl as (select cols.t, roles.r, p.p || go.opt as p, cols.attnum, cols.attname from cols, roles, unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) p(p), go
       where has_column_privilege(roles.r, cols.oid, cols.attnum, p.p || go.opt) and not has_table_privilege(roles.r, cols.oid, p.p || go.opt))
select json_build_object(
  'table', (select json_agg(json_build_array(t, r, p) order by t, r, p) from tl),
  'column', (select json_agg(json_build_array(t, r, p, attname) order by t, r, p, attnum) from cl),
  'tables', (select json_agg(t order by t) from tabs),
  'version', split_part(current_setting('server_version'), ' ', 1));
`;

const q = JSON.stringify;
const TP = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'];
const ORDER = ['table', 'SELECT', 'INSERT', 'UPDATE', 'REFERENCES'];

// WHAT THE FILES SAY THEY WERE MEASURED ON (the owed-tooling batch; C0-170-3, A1 F170-3, Q0-F5 on batch 170):
// the text named the 140 batch as the last measured after 150 and 170 had changed the grants it describes, because it was a constant
// here. It now names the LAST migration in the directory and the server version the measurement read, both
// taken at run time; foundation-contract holds the committed files to this text over the current last
// migration, so a batch that adds a migration regenerates them (or fails there, by name).
export function lastMigration(dir = MIGRATIONS) {
  return readdirSync(dir).filter((n) => n.endsWith('.sql')).sort().at(-1);
}
export const measuredOn = (migration, version) => `the shim, then every migration through ${migration}, PostgreSQL ${version}`;
export const grantsDoc = (on) => ({
  _what: 'The closed list of every effective privilege every non-superuser, non-pg_* role holds on every table in schemas app and private (batch 170\'s assertion-only part, plan "Batch 170 -- Can do now" (a); read by PINNED_GRANT_PROBE_SQL in scripts/db/run.mjs).',
  _how_measured: `Generated from a live catalog read on the clean set (${on}) with has_table_privilege and has_column_privilege, then committed as reviewed data. A column privilege a table-level privilege already implies is not listed: the table-level row carries it. No privilege is held WITH GRANT OPTION, and none is ever pinned with one.`,
  _shape: 'tables: { "<schema>.<table>": { "<role>": { "table": [table-level privileges], "SELECT" | "INSERT" | "UPDATE" | "REFERENCES": [columns, in attnum order] } } }. A table no role holds anything on is an empty object, so the TABLE list is closed too. A batch that grants, revokes or adds a table changes this file in the same diff.',
});
export const exceptionsDoc = (on) => ({
  _what: 'RFC-2026-021 §8.5: the inherited client base-table SELECT grants, named in one place as exceptions rather than as silence. CLOSED: it lists exactly the grants that exist today, measured, and any new one fails the read allowlist probe (scripts/db/run.mjs) unless it is a read-allowlist.json entry. Closing the list (converting these to allowlist views, or keeping them for Pilot) is owed to batch 170 and is Q170-b, undecided. "Inherited" is READ, not given: §8.5 names the inherited grants as those of 010, 020 and 021, and only 10 of the 41 rows come from them (010 x5, 020 x4, 021 x1); the other 31 come from 13 later migrations (030, 040, 051, 061, 070, 080, 081, 090, 091, 100, 120, 121, 130). Closing the list at 41 reads §8.5\'s "the grants that exist today" as batch 170\'s day, and so ACCEPTS those 31 as §8.5 exceptions; whether they count as inherited is for A1 (RFC-2026-021\'s owner) and the Owner, with Q170-b (review round: C0 F1, A1 R4).',
  _how_measured: `Generated from a live catalog read on the clean set (${on}): every (client role, base table) where has_any_column_privilege(role, table, 'SELECT'). Measured: authenticated only, by column grants only (no table-wide SELECT anywhere); anon and PUBLIC hold none. granted_by is read from the migration text and is documentation; the probe reads role, relation and level.`,
  _shape: '{ "role": "anon | authenticated | public", "relation": "<schema>.<table>", "level": "columns (SELECT by column grants only) | table (a table-wide SELECT)", "granted_by": ["the migration(s) whose GRANT SELECT names it"] }',
});

export function renderGrants(m, on = measuredOn(lastMigration(), m.version)) {
  const g = {};
  for (const t of m.tables) g[t] = {};
  for (const [t, r, p] of m.table ?? []) { g[t][r] ??= {}; (g[t][r].table ??= []).push(p); }
  for (const [t, r, p, c] of m.column ?? []) { g[t][r] ??= {}; (g[t][r][p] ??= []).push(c); }
  for (const t of Object.keys(g)) for (const r of Object.keys(g[t])) g[t][r].table?.sort((a, b) => TP.indexOf(a) - TP.indexOf(b));
  const roleLine = (privs) => `{ ${ORDER.filter((k) => privs[k]).map((k) => `${q(k)}: ${q(privs[k]).replace(/","/g, '", "')}`).join(', ')} }`;
  let out = '{\n';
  for (const [k, v] of Object.entries(grantsDoc(on))) out += `  ${q(k)}: ${q(v)},\n`;
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

class Refusal extends Error {}
// Every client role. PUBLIC has no pg_roles row: a PUBLIC grant reads as each of these holding it.
const CLIENT_ROLES = ['anon', 'authenticated'];

export function renderExceptions(g, tables, on, migrationsDir = MIGRATIONS) {
  const src = {};
  for (const f of readdirSync(migrationsDir).filter((n) => n.endsWith('.sql')).sort()) {
    // Comments stripped through the one SQL lexer (the sql-lexer batch's review round, C0-SL-4: this was the last
    // `--[^\n]*` reader, which took a `--` inside a literal or a dollar body for a comment).
    const s = readFileSync(`${migrationsDir}/${f}`, 'utf8').replace(SQL_LINE_COMMENTS, '');
    for (const x of s.matchAll(/grant\s+([^;]*?)\s+on\s+(?:table\s+)?(app\.\w+)\s+to\s+([^;]*);/gi)) {
      if (!/select/i.test(x[1])) continue;
      for (const role of CLIENT_ROLES) {
        if (new RegExp(`\\b(?:${role}|public)\\b`, 'i').test(x[3])) ((src[role] ??= {})[x[2]] ??= new Set()).add(f);
      }
    }
  }
  const exc = [];
  for (const t of tables) {
    for (const role of CLIENT_ROLES) {
      const a = g[t][role];
      if (!a) continue;
      if (a.table?.includes('SELECT')) throw new Refusal(`a table-wide client SELECT for ${role} on ${t}: not written into a closed list`);
      if (!a.SELECT) continue;
      if (!src[role]?.[t]) throw new Refusal(`${role} SELECTs ${t} and no migration grants it`);
      exc.push({ role, relation: t, level: 'columns', granted_by: [...src[role][t]] });
    }
  }
  for (const role of CLIENT_ROLES) {
    for (const t of Object.keys(src[role] ?? {})) {
      if (!exc.some((e) => e.role === role && e.relation === t)) {
        stderr.write(`generate-pinned-grants: a migration grants SELECT on ${t} to ${role} and the catalog holds none (a later revoke?); not written\n`);
      }
    }
  }
  let out = '{\n';
  for (const [k, v] of Object.entries(exceptionsDoc(on))) out += `  ${q(k)}: ${q(v)},\n`;
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
  const on = measuredOn(lastMigration(), measured.version);
  const grants = renderGrants(measured, on);
  let exceptions;
  try { exceptions = renderExceptions(grants.grants, grants.tables, on); } catch (e) {
    if (!(e instanceof Refusal)) throw e;
    stderr.write(`generate-pinned-grants: REFUSED, nothing written: ${e.message}\n`);
    exit(3);
  }
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

// Run only as a script, so foundation-contract can import lastMigration, measuredOn and the two docs. Real paths on
// both sides, so a script named through a symlink still runs main() (C0-TIR-1, A1 R1).
if (argv[1] && realpathSync(argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main();
