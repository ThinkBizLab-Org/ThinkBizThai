// The driver behind the live targets, and the reason no dependency was added.
//
// RFC-2026-001 forbids a runtime dependency and a test asserts it. A Postgres client from npm would
// break that. `psql` is present on the GitHub Actions runner image and on any developer machine
// with Postgres installed, so the driver shells out to it. DATA-DEC-02 fixes the command contract
// and explicitly leaves the tool to implementation, reviewable in this diff.
//
// What this file has to get right, and what a naive version gets wrong:
//
//   The assertion helpers distinguish `denied` (SQLSTATE 42501) from `errored` (anything else) from
//   `empty` from `rows`. A driver that reports "it failed" without the SQLSTATE collapses the first
//   two, and a constraint violation or a typo in a fixture then reads as a working RLS policy. So
//   VERBOSITY is set to verbose and the SQLSTATE is parsed out. If it cannot be parsed, the error is
//   reported WITHOUT a code rather than with a guessed one — `expectDenied` then refuses it, which
//   is the correct outcome for an outcome nobody can classify.
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { NESTED_DEPTH, keyword, psqlHeldSemicolons, splitStatements, walkLevels, word } from './sql-lexer.mjs';

const run = promisify(execFile);

const CONNECTION = 'DB_TEST_URL';

// THE TEST-INSTANCE HOST GUARD, shared by db-reset-test (which drops app and private) and the EXPLAIN
// harness (which writes up to 3.1M rows and rolls them back). Batch 150-prereq's review round (A1 S1, Q0
// Q-4, C0-9): both used `/@(localhost|127\.0\.0\.1|postgres)[:/]/` against the whole URL TEXT, so a URL
// whose authority names an allowlisted host but which libpq connects elsewhere passed it -- measured:
// `?host=` (libpq honours the query parameter over the authority), a host list `localhost:5432,other`,
// `?service=`, `?hostaddr=`, and an off-list host with `?application_name=@localhost/` appended. So the
// URL is PARSED: a postgres(ql):// URL whose authority holds one `@` and no `,`, whose hostname is exactly
// one of TEST_HOSTS, and which carries none of the query parameters libpq would connect by instead.
// Returns null when the URL may be used, else the reason (which never repeats the host). The driver also
// drops PGHOST, PGHOSTADDR, PGSERVICE and PGSERVICEFILE from psql's environment (scrubbedEnv), so an
// inherited variable cannot supply what the URL left out (PGHOSTADDR would override the host's address).
export const TEST_HOSTS = Object.freeze(['localhost', '127.0.0.1', '[::1]', 'postgres']);
const CONNECT_BY_PARAMS = new Set(['host', 'hostaddr', 'service', 'servicefile']);
export function testHostRefusal(url) {
  const text = String(url ?? '');
  // Batch 150-prereq's re-checks (C0 R-1, A1 R1, Q0 R-1): a WHATWG URL parser reads `#...` as a fragment,
  // but libpq does not, so `...postgres#?host=elsewhere` passed the query-parameter check below while libpq
  // connected by host=. Fail closed: refuse any `#`, and read the query parameters from the raw text, the
  // way libpq does, not from the parser.
  if (text.includes('#')) return 'it contains a #, which a URL parser and libpq read differently';
  const rawQuery = text.includes('?') ? text.slice(text.indexOf('?') + 1) : '';
  for (const pair of rawQuery.split('&')) {
    let key = pair.split('=')[0];
    try { key = decodeURIComponent(key); } catch { return 'its query string does not decode'; }
    if (CONNECT_BY_PARAMS.has(key.trim().toLowerCase())) return `it carries a ${key.trim().toLowerCase()} parameter, which libpq would connect by instead of the host`;
  }
  const authority = /^postgres(?:ql)?:\/\/([^/?#]*)/i.exec(text)?.[1];
  if (authority === undefined) return 'it is not a postgresql:// URL';
  if ((authority.match(/@/g) ?? []).length !== 1) return 'its authority does not name exactly one user@host';
  if (authority.includes(',')) return 'it names a list of hosts';
  let parsed;
  try { parsed = new URL(text); } catch { return 'it does not parse as a URL'; }
  if (!TEST_HOSTS.includes(parsed.hostname.toLowerCase())) return `its host is not one of ${TEST_HOSTS.join(', ')}`;
  for (const key of parsed.searchParams.keys()) {
    if (CONNECT_BY_PARAMS.has(key.toLowerCase())) return `it carries a ${key.toLowerCase()} parameter, which libpq would connect by instead of the host`;
  }
  return null;
}
export const SCRUBBED_ENV = Object.freeze(['PGHOST', 'PGHOSTADDR', 'PGSERVICE', 'PGSERVICEFILE']);
export function scrubbedEnv(env) {
  const out = { ...env };
  for (const k of SCRUBBED_ENV) delete out[k];
  return out;
}

// psql prints `ERROR:  message` then, under verbose, a line containing `SQLSTATE`. Both forms have
// been seen depending on version and locale, so both are matched.
// psql prints the host, the user and the database name in its own error text — "could not
// translate host name \"db.example.invalid\"" and friends. The password it keeps to itself, but
// §12.5 requires the connection URL redacted, and a host is half of one. The first version of this
// driver passed psql's stderr through untouched, and the test asserting a connection string never
// reaches the output caught it the moment the live targets were actually wired.
//
// Redaction works from the URL we were given rather than by guessing psql's phrasing: every
// component of the connection string is removed from anything on its way out. A format this driver
// has not seen cannot defeat it, because it is not matching formats.
export function redactConnection(text, url) {
  let out = String(text).replace(/(postgres(?:ql)?:\/\/)[^\s"']*/gi, '$1[redacted]');
  if (!url) return out;
  const parts = new Set();
  try {
    const parsed = new URL(url);
    for (const part of [parsed.hostname, parsed.username, parsed.password, parsed.port, parsed.pathname.replace(/^\//, '')]) {
      if (part && part.length > 2) parts.add(part);
    }
    // A bracketed IPv6 host is printed by psql without its brackets (Q0 G-2 on the guard fix: `::1`).
    if (parsed.hostname.startsWith('[') && parsed.hostname.length > 4) parts.add(parsed.hostname.slice(1, -1));
  } catch { /* an unparseable URL still gets the scheme rule above */ }
  // And every query parameter's value (A1 S6 on batch 150-prereq: a `?host=` value was printed), read from the
  // RAW text after the first `?`, not from the WHATWG parser: Q0 G-2 on the guard fix measured
  // `.../postgres#?host=q0-probe.invalid` at db-migrate-clean (a target the guard does not cover) printing the
  // fragment-carried host unredacted, because a parser reads `#...` as a fragment. Split on `&` only, as
  // testHostRefusal splits it (the owed-tooling batch's review round, A1-OT-4: a split on `#` too printed the
  // tail of `?host=a1-tail#x.invalid`).
  //
  // AND THE AUTHORITY AND PATH FROM THE RAW TEXT AS WELL (A1-OT-4). The parser above keeps percent-encoding in
  // the user, host and path of a non-special scheme, which psql prints decoded (`a1sec%72etuser` printed as
  // `a1secretuser`), and it throws on a host list or an IPv6 zone id, after which no authority part was
  // redacted at all. So the authority is also split by hand -- user and password before the last `@`, then
  // every host of a `,` list with its brackets and `:port` taken off -- and the database is the path up to the
  // first `?`; every part is redacted both as written and percent-decoded. This is not libpq's parser: it reads
  // more pieces than libpq would connect by, never fewer, and a piece of two characters or less is left alone,
  // as before.
  const raw = String(url);
  const add = (v) => {
    if (!v) return;
    let decoded = v;
    try { decoded = decodeURIComponent(v); } catch { /* the undecoded text is redacted as written */ }
    for (const x of [v, decoded]) if (x && x.length > 2) parts.add(x);
  };
  const rawQuery = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
  for (const pair of rawQuery.split('&')) {
    const eq = pair.indexOf('=');
    if (eq >= 0) add(pair.slice(eq + 1));
  }
  const auth = /^postgres(?:ql)?:\/\/([^/?]*)([^?]*)/i.exec(raw);
  if (auth) {
    const at = auth[1].lastIndexOf('@');
    const userinfo = at >= 0 ? auth[1].slice(0, at) : '';
    const colon = userinfo.indexOf(':');
    add(colon >= 0 ? userinfo.slice(0, colon) : userinfo);
    if (colon >= 0) add(userinfo.slice(colon + 1));
    for (const hostport of auth[1].slice(at + 1).split(',')) {
      const m = /^\[([^\]]*)\](?::(.*))?$/.exec(hostport) ?? /^([^:]*)(?::(.*))?$/.exec(hostport);
      if (!m) { add(hostport); continue; }
      add(m[1]);
      add(m[2]);
    }
    add(auth[2].replace(/^\//, ''));
  }
  // Longest first, so a part that contains another is redacted whole rather than leaving its remainder.
  for (const part of [...parts].sort((a, b) => b.length - a.length)) {
    out = out.split(part).join('[redacted]');
  }
  return out;
}

export function parseError(stderr) {
  // psql in verbose mode prints the SQLSTATE INLINE — `ERROR:  42501: permission denied ...` —
  // not on a separate `SQLSTATE:` line. The first version looked only for the separate line, so
  // every real refusal came back with code null, and expectDenied correctly refused an outcome it
  // could not classify: "an error with no code, which is not an RLS refusal".
  //
  // That is the guard behaving properly on a driver that was not telling it the truth. The
  // evidence was in the run before, printed as "42501: permission denied for schema private",
  // with the code sitting at the front of the message.
  const code = stderr.match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1]
    ?? stderr.match(/SQLSTATE[:\s]+([0-9A-Z]{5})/)?.[1]
    ?? null;
  const message = stderr.match(/ERROR:\s+(?:[0-9A-Z]{5}:\s*)?(.*)/)?.[1]?.trim() ?? stderr.trim();
  return { code, message };
}

// Rows have to come back keyed BY COLUMN NAME, because that is the shape A1's cases read:
// `seen.rows[0][witness.column]`. The first version returned `{ _: line }` — one anonymous field
// per output line — and every no-effect case failed with `name is undefined`, which reads exactly
// like the witness seeing a changed row. It was the driver, not the database.
//
// So the header row is kept (no --tuples-only) and used for the names. An empty result is then a
// header and nothing else, which is why parsing is a record walk rather than a line count: a
// header row must never arrive at `classify` as one visible row.
//
// psql renders SQL NULL and the empty string identically in CSV. Nothing here distinguishes them,
// and no assertion in the suite depends on the difference; a case that needs it must ask the
// database (`is null`) rather than the driver.
export function parseCsv(text) {
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;
  let open = false; // this record has begun, even if every field so far is empty
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') { field += ch; continue; }
      if (text[i + 1] === '"') { field += '"'; i += 1; continue; }
      quoted = false;
      continue;
    }
    if (ch === '"' && field === '') { quoted = true; open = true; continue; }
    if (ch === ',') { record.push(field); field = ''; open = true; continue; }
    if (ch === '\n') { record.push(field); records.push(record); record = []; field = ''; open = false; continue; }
    if (ch === '\r') continue;
    field += ch; open = true;
  }
  if (open || field !== '' || record.length > 0) { record.push(field); records.push(record); }
  return records;
}

export function rowsFromCsv(text) {
  const records = parseCsv(text);
  if (records.length === 0) return [];
  const [header, ...rest] = records;
  return rest.map((values) => Object.fromEntries(header.map((name, i) => [name, values[i] ?? null])));
}

export function connectionString(env = process.env) {
  const url = env[CONNECTION];
  if (!url) {
    const error = new Error(
      `${CONNECTION} is not set. This target needs a Postgres TEST instance; it has no no-database `
      + 'mode and will not report a pass it cannot earn.');
    error.code = 'NO_TEST_DATABASE';
    throw error;
  }
  return url;
}

// psql with the script on STDIN rather than as `--command`. Linux caps one argv string at
// MAX_ARG_STRLEN = 131,072 bytes, so under `--command` every migration was capped at ~128 KiB and the
// failure was `spawn E2BIG` before psql started, naming no statement: batch 100 hit it for real (CI run
// 34753787430) and 070_research.sql had cleared it by 219 bytes. stdin has no such cap. What stdin
// changes and `--command` did not: psql PARSES the script, so a line starting with a backslash is a
// meta-command and is executed. Migrations are held to carrying none by a static rule; fixtures and
// cases keep the `--command` path, whose whole-string-as-one-request semantics the case fences rely on.
function runWithInput(file, args, input, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { ...options, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (error) => reject(Object.assign(error, { stderr })));
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(Object.assign(new Error(`psql exited ${code}`), { code, stdout, stderr }));
    });
    child.stdin.on('error', () => { /* psql may exit before the whole script is written; close reports it */ });
    child.stdin.end(input);
  });
}

// The raw invocation: either the text psql printed, or a classified error. Everything above it
// decides what the text MEANS; nothing below it does.
async function invoke(sql, { env = process.env, url = null, viaStdin = false, transcript = false } = {}) {
  const connection = url ?? connectionString(env);
  const args = [
    connection,
    '--no-psqlrc', '--quiet', '--no-align', '--csv',
    '--set', 'ON_ERROR_STOP=1',
    '--set', 'VERBOSITY=verbose',
  ];
  const options = {
    env: { ...scrubbedEnv(env), LC_ALL: 'C', TZ: 'UTC', PGTZ: 'UTC', PGOPTIONS: '-c client_min_messages=warning' },
  };
  try {
    const { stdout, stderr } = viaStdin
      ? await runWithInput('psql', args, sql, options)
      : await run('psql', [...args, '--command', sql], options);
    return transcript ? { stdout, stderr: redactConnection(String(stderr ?? ''), connection) } : { stdout };
  } catch (failure) {
    // A missing psql is not a database refusal, and must never be classified as one.
    if (failure.code === 'ENOENT') {
      const error = new Error('psql is not on PATH. The live targets need it; they do not have a fallback that pretends to pass.');
      error.code = 'NO_PSQL';
      throw error;
    }
    const stderr = redactConnection(String(failure.stderr ?? failure.message ?? ''), connection);
    return transcript
      ? { error: parseError(stderr), stdout: String(failure.stdout ?? ''), stderr }
      : { error: parseError(stderr) };
  }
}

// One statement, one outcome, shaped exactly as the assertion helpers expect: { rows, error }.
export async function query(sql, options = {}) {
  const out = await invoke(sql, options);
  return out.error ? out : { rows: rowsFromCsv(out.stdout) };
}

// A whole case as one script, reporting the result of ONE statement in it.
//
// psql prints every result set in a script back to back with nothing saying where one ends and the
// next begins, and a case is a script: a transaction, an identity, the statement under test, and
// for a no-effect case a second identity and a witness read. Counting lines across all of that is
// how a `set_config` row ends up counted as a visible tenant row.
//
// So the statement's result is FENCED: a marker row is selected immediately before it and another
// immediately after it, and only what lies between them is parsed.
//
// Two markers rather than one, and counted rather than searched, because of C0's review D8. The
// first version selected one marker before the statement and parsed everything after the LAST
// occurrence of it. Both halves of that were movable:
//
//   * The result boundary could be moved FORWARD by data. A marker appearing in the statement's own
//     output won the `lastIndexOf`, so the tail became a suffix of the real result whose first line
//     was then eaten as a header — and a single occurrence in the final row yielded ZERO ROWS.
//     Zero rows is a PASS for `expectNoRows` and for half one of `expectNoEffect`, so the failure
//     mode was silent. It is not reachable from today's fixture, and it becomes reachable the
//     moment an isolation case reads a column carrying user content, which SMOKE_COVERAGE says
//     batches 020, 040 and 080 owe.
//   * The EPILOGUE was inside the parsed region. Anything it printed was parsed as extra rows of
//     the statement's result, its header read as a data row. That was safe only because the sole
//     caller passes `rollback;`, which prints nothing under --quiet, and nothing in the signature
//     or in a test said an epilogue must be silent. The closing marker makes it structural: the
//     epilogue is now outside the region, whatever it prints.
//
// Each marker select prints its marker exactly twice — once as the column name, once as the value —
// so 2 and 2 is the only shape this driver emits. Any other count means output somewhere carried a
// marker, and the driver refuses rather than choosing an occurrence: a boundary a value can move is
// a result boundary decided by the data.
//
// Still true and still by convention rather than by construction: a `statement` containing two
// statements has both outputs folded into one region, and a statement returning no result set at
// all parses to `[]`, indistinguishable from a header with no rows. `identity-isolation.test.mjs`
// asserts statically that every mutation case carries RETURNING, which is what makes the second
// safe.
export const RESULT_BOUNDARY = '__psql_driver_result_boundary__';
export const RESULT_END = '__psql_driver_result_end__';

const occurrencesOf = (text, marker) => text.split(marker).length - 1;

// `{ tail }` — the statement's own output — or `{ error }` saying why there is no such region.
export function resultRegion(stdout) {
  const text = String(stdout);
  const opens = occurrencesOf(text, RESULT_BOUNDARY);
  const closes = occurrencesOf(text, RESULT_END);
  // The opening boundary is selected before the statement, so its absence means psql stopped
  // earlier without a non-zero exit. Reporting that as an empty result would be a pass nobody
  // earned.
  if (opens === 0) {
    return { error: 'the result boundary never printed: psql produced no output for the statement under test' };
  }
  if (closes === 0) {
    return { error: 'the closing result boundary never printed: psql stopped at or inside the statement under '
      + 'test, so what it did print cannot be read as that statement\'s whole result' };
  }
  if (opens !== 2 || closes !== 2) {
    return { error: `the result boundary printed ${opens} time(s) and its close ${closes}, where each marker `
      + 'select prints exactly twice — its column name and its value. Output somewhere carries a marker, so the '
      + 'result boundary would be decided by the data rather than by the driver, and this driver will not choose '
      + 'an occurrence and call the answer a result.' };
  }
  const start = text.indexOf('\n', text.lastIndexOf(RESULT_BOUNDARY));
  const end = text.indexOf(RESULT_END);
  if (start === -1 || end < start) {
    return { error: 'the result boundaries printed out of order, so no region of this output is the statement\'s result' };
  }
  return { tail: text.slice(start + 1, end) };
}

export async function queryFinal({ prelude = [], statement, epilogue = [] }, options = {}) {
  const sql = [
    ...prelude,
    `select '${RESULT_BOUNDARY}' as ${RESULT_BOUNDARY};`,
    statement,
    `select '${RESULT_END}' as ${RESULT_END};`,
    ...epilogue,
  ].join('\n');
  const out = await invoke(sql, options);
  if (out.error) return out;
  const region = resultRegion(out.stdout);
  if (region.error) return { error: { code: null, message: region.error } };
  return { rows: rowsFromCsv(region.tail) };
}

// Several statements as one transaction, for migrations. Deliberately separate from `query`: a
// script that half-applies leaves a suite asserting against a state nobody described.
export async function script(sql, options = {}) {
  return query(`begin;\n${sql}\ncommit;`, { ...options, viaStdin: true });
}

// A file fed to psql AS WRITTEN, on stdin, for the fixtures and the auth-context helper: each of
// those carries its own begin/commit (a fixture is one transaction by its own text, and a helper
// install is a set of CREATE OR REPLACE statements), so wrapping them as `script` does would nest
// a transaction inside one. Under --command these were capped at MAX_ARG_STRLEN like a migration;
// on stdin they are not, and a line beginning with a backslash is a meta-command psql executes, so
// a static rule holds every fixture and helper to carrying none.
export async function feed(sql, options = {}) {
  return query(sql, { ...options, viaStdin: true });
}

// A script fed on stdin, as `feed` does, that keeps psql's whole TRANSCRIPT: stdout and stderr on
// success and on failure alike. The catalog-rule executor needs both (blocker 186 item 11): stdout
// carries the markers that say the probe, not the drift, raised, and stderr is where a forged
// `ERROR:` line would sit beside the real one. Nothing else uses it; `feed` keeps its shape.
export async function feedTranscript(sql, options = {}) {
  return invoke(sql, { ...options, viaStdin: true, transcript: true });
}

// WHAT psql WOULD EXECUTE AS A META-COMMAND, WHERE EACH TOP-LEVEL STATEMENT BEGINS, AND WHAT A FED SOURCE MAY
// NOT SAY (blocker 186 item 12 and every batch after it). Since the sql-lexer batch this reads the text through
// ONE tokenizer, scripts/db/sql-lexer.mjs, which follows PostgreSQL's lexical rules (and psql's two additions, the
// meta-command and the variable reference) and fails closed on anything it cannot classify. The regexes and the
// hand scanner that stood here -- SET_NAMES, COPY_PROGRAM, COPY_SERVER_FILE, SERVER_FILE_CALL, escapeSpellings
// -- and the scanner of psqlLex itself -- are gone: each review round since batch 125 found a spelling one of them
// read otherwise than PostgreSQL does (blocker 186's OWED-TOOLING sentence), and the Owner accepted A0's
// recommendation of one real lexer over another round of patterns (2026-10-04, `ลุยต่อเลย เอาตามแนะนำ`).
//
// Every finding goes into `metaCommands` ({ line, text }), and every caller refuses the source on any:
//   * at the top level, as psql reads it: every place the lexer cannot classify (an unterminated literal,
//     identifier, dollar body or comment, a number with trailing junk, a `$` or a character no token holds, a
//     psql variable reference psql would substitute); every META-COMMAND (a backslash outside every literal,
//     body, identifier and comment -- `\!` runs a shell command); a quote inside or closing a PLAIN literal
//     after an ODD run of backslashes (where turning standard_conforming_strings off by a computed name would
//     move the literal's end; batch 126/127); a `BEGIN ATOMIC` body, which psql 15+ keeps whole and this
//     splitter would not; a statement that begins with COPY whose shape the COPY rule below cannot read;
//   * ANY MENTION, in any statement, literal or comment, of standard_conforming_strings, client_encoding or
//     allow_system_table_mods (batches 126-128): these stay raw-text rules, the most a static reader can refuse;
//   * at EVERY LEVEL -- the top level, and the text of every literal and dollar body read again as SQL, as
//     EXECUTE, a DO block or a function body would read it, to a depth of eight (past which a text that could
//     hold another level is refused) -- by token, never by pattern over the raw text:
//       - an E'', U&'' or U&"" token: an escape can spell any name the rules here read as written (batch 128);
//         and a nested text that does not lex is still read for one by its raw spelling, fail closed;
//       - SET [SESSION|LOCAL] NAMES, a change of client encoding (batch 127);
//       - COPY: after COPY [BINARY], a parenthesised query (whatever it holds -- `copy (select ';') to 'f'`) or a
//         name with an optional column list, then TO or FROM, then a target. STDIN and STDOUT are admitted;
//         PROGRAM is refused (the server runs a shell command; C0 G1 on 129); ANY OTHER target, whatever its
//         quoting -- a plain, E'', U&'' or dollar-quoted literal (`COPY ... TO $p$path$p$`, C0-OTR-2, A1-RC-1,
//         Q0-OT2-1) -- is a server file and is refused (C0-OT-2, Q0-OT-3);
//       - a server-file function NAMED, as an identifier token (quoted or not), anywhere but in a GRANT, REVOKE
//         or COMMENT statement, which evaluates nothing and binds nothing. Until the sql-lexer batch's review
//         round only a CALL was refused (the name, then `(`, unless FUNCTION preceded it); C0-SL-1 measured an
//         operator over lo_export writing a host file with every layer green, and a rename doing the same, so
//         CREATE OPERATOR/CAST/AGGREGATE over one, ALTER FUNCTION (rename, set schema, owner) or CREATE/DROP of a
//         function by that name are refused with the call. The list is the functions by name and, measured on
//         PostgreSQL 17.11, the internal symbols they are built on (pg_read_file_all, be_lo_export, ...). A
//         literal holding only the name is read as SQL at the next level like any other, so `where proname =
//         'lo_export'` in a fed source is refused too: an over-refusal that fails closed, and no fed source has one;
//       - LANGUAGE internal or LANGUAGE c, by keyword or literal: a function so defined can alias ANY built-in
//         under a name no list holds (`create function f(text) ... language internal as 'pg_read_file_all'`,
//         A1-RC-2), so no fed source may define one;
//       - CREATE EXTENSION of anything but the extensions the migrations already create (APPROVED_EXTENSIONS,
//         pgcrypto: 000_foundation.sql:24 and prerequisites.sql:48 create it, so a blanket refusal would have
//         refused two integrated sources and is not what this rule is); CREATE or ALTER FOREIGN TABLE, FOREIGN
//         DATA WRAPPER or SERVER, CREATE or ALTER USER MAPPING and IMPORT FOREIGN SCHEMA: file_fdw's
//         `options (program ...)` ran a shell command at apply time (Q0-OT2-2).
// Statements split on `;` outside parentheses, as psql splits them, and each statement's HEAD is its text with
// comments removed and whitespace collapsed (the transaction-control rule reads its first words).
//
// WHAT THIS DOES NOT REACH, and why no lexer can: a statement whose words are COMPUTED at run time --
// set_config('client_' || 'encoding', ...), EXECUTE of 'copy t to ' || quote_literal(p), format(), chr(),
// convert_from() -- is text the source never spells. And what a statement MEANS (which function a name
// resolves to through search_path, what a trigger does) is the parser's and the catalog's. Those stay held by
// the live catalog probes in run.mjs; this is the early-warning layer in front of them.
export const SERVER_FILE_FUNCTIONS = ['lo_import', 'lo_export', 'pg_read_file', 'pg_read_binary_file', 'pg_stat_file', 'pg_ls_dir', 'pg_ls_logdir',
  'pg_ls_waldir', 'pg_ls_tmpdir', 'pg_ls_archive_statusdir', 'pg_ls_logicalsnapdir', 'pg_ls_logicalmapdir', 'pg_ls_replslotdir',
  'pg_file_write', 'pg_file_sync', 'pg_file_rename', 'pg_file_unlink', 'pg_logdir_ls',
  // The internal symbols the functions above are built on (pg_proc.prosrc where it differs from proname),
  // measured on PostgreSQL 17.11 in the sql-lexer batch.
  'be_lo_export', 'be_lo_import', 'be_lo_import_with_oid', 'pg_ls_dir_1arg', 'pg_ls_tmpdir_1arg', 'pg_ls_tmpdir_noargs',
  'pg_read_binary_file_all', 'pg_read_binary_file_all_missing', 'pg_read_binary_file_off_len', 'pg_read_binary_file_off_len_missing',
  'pg_read_file_all', 'pg_read_file_all_missing', 'pg_read_file_off_len', 'pg_read_file_off_len_missing', 'pg_stat_file_1arg'];
export const APPROVED_EXTENSIONS = ['pgcrypto'];
const REFUSED_LANGUAGES = ['internal', 'c'];
// The statements that name a function and reach nothing (C0-SL-1's remedy (a)).
const NAMING_ONLY = ['grant', 'revoke', 'comment'];
const ESCAPE_RAW = /(?<![A-Za-z0-9_$\u0080-￿])(?:[uU]&["']|[eE]')/;

// The token rules read at every level, over one statement's significant tokens. Each finding is { at, text },
// `at` an offset in the text the tokens came from.
function statementFindings(sig, { top }) {
  const out = [];
  const kw = (k) => keyword(sig[k]);
  const punct = (k, p) => sig[k]?.kind === 'punct' && sig[k].text === p;
  const closeParen = (k) => { let d = 0; for (let j = k; j < sig.length; j += 1) { if (punct(j, '(')) d += 1; if (punct(j, ')')) { d -= 1; if (d === 0) return j; } } return sig.length; };
  for (let k = 0; k < sig.length; k += 1) {
    const at = sig[k].start;
    // SET [SESSION|LOCAL] NAMES.
    if (word(sig[k]) === 'set') {
      const n = ['session', 'local'].includes(word(sig[k + 1])) ? k + 2 : k + 1;
      if (word(sig[n]) === 'names') out.push({ at, text: 'set names, which changes the client encoding psql splits bytes by' });
    }
    // COPY.
    if (kw(k) === 'copy' && !punct(k - 1, '.')) {
      let j = k + 1;
      if (kw(j) === 'binary') j += 1;
      let shaped = true;
      if (punct(j, '(')) j = closeParen(j) + 1;
      else if (word(sig[j]) !== null) {
        j += 1;
        while (punct(j, '.') && word(sig[j + 1]) !== null) j += 2;
        if (punct(j, '(')) j = closeParen(j) + 1;
      } else shaped = false;
      if (shaped && ['to', 'from'].includes(kw(j))) {
        const target = kw(j + 1);
        if (target === 'program') out.push({ at, text: 'COPY ... TO/FROM PROGRAM, which runs a shell command on the database server' });
        else if (target !== 'stdin' && target !== 'stdout') out.push({ at, text: 'COPY ... TO/FROM a server file, which reads or writes a file on the database host' });
      } else if (top && k === 0) out.push({ at, text: 'a COPY statement whose target this lexer cannot read, refused rather than guessed' });
    }
    // A server-file function, named anywhere but in a statement that can only name it. Since the sql-lexer
    // batch's review round (C0-SL-1) this is no longer "called": `create operator ... (function =
    // pg_catalog.lo_export)`, `create cast ... with function pg_read_file(text)`, `create aggregate ... (sfunc =
    // ...)`, and `alter function lo_export(oid, text) rename to x` / `set schema` then `x(...)` each reached the
    // function under a name no list holds, and the operator wrote a host file with every layer green. So the name
    // is refused as ANY identifier token, except in a GRANT, REVOKE or COMMENT statement, which evaluates no
    // expression and binds nothing: they name the function and reach nothing.
    const name = word(sig[k]);
    if (name !== null && SERVER_FILE_FUNCTIONS.includes(name.toLowerCase()) && !NAMING_ONLY.includes(kw(0))) {
      out.push({ at, text: punct(k + 1, '(') && kw(punct(k - 1, '.') ? k - 3 : k - 1) !== 'function'
        ? 'a server-file function call, which reads, lists or writes a file on the database host'
        : 'a server-file function named outside a GRANT, REVOKE or COMMENT (an operator, cast, aggregate, rename or schema move can reach it under another name)' });
    }
    // LANGUAGE internal / c.
    if (kw(k) === 'language') {
      const t = sig[k + 1];
      const lang = word(t) ?? (t && ['string', 'dollar'].includes(t.kind) ? t.value : null);
      if (lang !== null && REFUSED_LANGUAGES.includes(String(lang).toLowerCase())) {
        out.push({ at, text: `a LANGUAGE ${String(lang).toLowerCase()} function, which can alias any built-in (a server-file function included) under a name no list holds` });
      }
    }
    // CREATE EXTENSION outside the approved set; the foreign-data statements.
    if (kw(k) === 'create' && kw(k + 1) === 'extension') {
      let n = k + 2;
      if (kw(n) === 'if' && kw(n + 1) === 'not' && kw(n + 2) === 'exists') n += 3;
      const ext = word(sig[n]);
      if (ext === null || !APPROVED_EXTENSIONS.includes(ext)) out.push({ at, text: `CREATE EXTENSION ${ext ?? '(unread)'}, which is not one the migrations create (${APPROVED_EXTENSIONS.join(', ')})` });
    }
    const verb = kw(k) === 'create' || kw(k) === 'alter';
    const orReplace = kw(k + 1) === 'or' && kw(k + 2) === 'replace' ? 2 : 0;
    if ((verb && kw(k + 1 + orReplace) === 'foreign' && ['table', 'data'].includes(kw(k + 2 + orReplace)))
      || (verb && kw(k + 1) === 'server')
      || (verb && kw(k + 1) === 'user' && kw(k + 2) === 'mapping')
      || (kw(k) === 'import' && kw(k + 1) === 'foreign' && kw(k + 2) === 'schema')) {
      out.push({ at, text: 'a foreign table, foreign data wrapper, server or user mapping, which can read a file or run a program on the database host (file_fdw)' });
    }
  }
  return out;
}

export function psqlLex(sql) {
  const text = String(sql);
  const metaCommands = [];
  const lineOf = (pos) => text.slice(0, pos).split('\n').length;
  for (const found of text.matchAll(/standard_conforming_strings/gi)) {
    metaCommands.push({ line: lineOf(found.index), text: 'standard_conforming_strings, which changes how psql reads a backslash' });
  }
  for (const found of text.matchAll(/client_encoding/gi)) {
    metaCommands.push({ line: lineOf(found.index), text: 'client_encoding, which changes how psql splits the bytes that follow' });
  }
  for (const found of text.matchAll(/allow_system_table_mods/gi)) {
    metaCommands.push({ line: lineOf(found.index), text: 'allow_system_table_mods, which lets a superuser write pg_catalog and name a schema pg_*' });
  }
  let top = [];
  walkLevels(text, ({ tokens, refusals, depth, at, text: level }) => {
    const where = (pos) => lineOf(at === null ? pos : at);
    if (depth === 0) {
      top = tokens;
      for (const r of refusals) metaCommands.push({ line: r.line, text: `${r.reason}, which this lexer cannot classify, so the text is refused` });
      for (const t of tokens) {
        if (t.kind === 'meta') metaCommands.push({ line: t.line, text: t.text });
        if (t.kind === 'string' && t.odd) metaCommands.push({ line: t.line, text: "\\' inside a plain literal, which ends elsewhere for psql when standard_conforming_strings is off" });
      }
    } else if (refusals.length && ESCAPE_RAW.test(level)) {
      metaCommands.push({ line: where(0), text: "a U& or E'' escape spelling in a literal or body that does not lex, read by its raw spelling (fail closed)" });
    }
    for (const t of tokens) {
      if (t.kind === 'estring' || t.kind === 'ustring' || t.kind === 'uident') {
        metaCommands.push({ line: where(t.start), text: `a ${t.kind === 'estring' ? "E''" : 'U&'} escape spelling, which can spell client_encoding, set names or standard_conforming_strings past the rules that read them` });
      }
    }
    if (depth === 0) {
      for (const t of psqlHeldSemicolons(tokens)) metaCommands.push({ line: t.line, text: "a `;` psql would not end a statement at (a `begin` in CREATE FUNCTION or PROCEDURE, psqlscan.l's begin_depth), where this splitter would" });
    }
    for (const s of splitStatements(tokens)) {
      if (depth === 0) {
        for (let k = 0; k + 1 < s.tokens.length; k += 1) {
          if (keyword(s.tokens[k]) === 'begin' && keyword(s.tokens[k + 1]) === 'atomic') metaCommands.push({ line: s.tokens[k].line, text: 'a BEGIN ATOMIC body, which psql keeps whole where this splitter would not' });
        }
      }
      for (const f of statementFindings(s.tokens, { top: depth === 0 })) metaCommands.push({ line: where(f.at), text: f.text });
    }
  }, { psql: true, beyond: ({ at }) => metaCommands.push({ line: lineOf(at), text: `a literal or body nested past the depth this scan reads (${NESTED_DEPTH}), refused rather than skipped` }) });
  const statements = splitStatements(top).map((s) => ({ line: s.line, head: s.head }));
  metaCommands.sort((a, b) => a.line - b.line);
  return { metaCommands, statements };
}

// The identity helpers, as SQL the driver issues rather than as functions in the database. They
// use SET LOCAL for the reason auth-context.sql gives: under a transaction-mode pooler a session
// setting outlives the transaction and the next request inherits another tenant's identity.
export function asUser(subject) {
  if (!subject) throw new Error('asUser(null) is the anonymous case wearing a user name');
  return `select set_config('request.jwt.claims', json_build_object('role','authenticated','sub','${subject}')::text, true), set_config('role','authenticated',true);`;
}
export const asAnonymous = () =>
  "select set_config('request.jwt.claims','{\"role\":\"anon\"}',true), set_config('role','anon',true);";
export const asService = () =>
  "select set_config('request.jwt.claims','{\"role\":\"app_worker\"}',true), set_config('role','app_worker',true);";

// One case = one transaction: assume the identity, run the statement, roll back. Rolling back is
// what lets a write case run without mutating the fixture the next case depends on.
export async function inIdentity(identitySql, statement, options = {}) {
  const sql = `begin;\n${identitySql}\n${statement}\nrollback;`;
  return query(sql, options);
}

// ONE psql PROCESS FOR A WHOLE RUN, and the reason the `--command` path above exists at all is
// that this did not. `psql --command` exits between invocations, so a transaction cannot span two
// of them, so `bufferedDriver` had to REPLAY a case from its first statement on every step.
// Measured on the merged tree: 554 cases cost 1,797 psql invocations -- about 3.2 per case, each
// re-running everything before it. A session removes the replay rather than making it cheaper.
//
// THE FIRST VERSION OF THIS FUNCTION WAS WRONG IN THE WORST AVAILABLE WAY AND THE RECORD OF THAT
// BELONGS HERE RATHER THAN ONLY IN A COMMIT MESSAGE. It merged stderr into stdout so the kernel
// would order errors against results, and then decided "this is an error" with
// `/^(ERROR|FATAL|PANIC):/m` over the merged text. Row DATA lives in that same text, so a value
// could forge a privilege refusal:
//
//     select 'ERROR:  42501: permission denied for table app.workspaces' as note
//       -> { error: { code: '42501', ... } }        and `expectDenied` accepts it
//
// A case that should have returned rows reported a working RLS policy. That is a false PASS in the
// one function whose whole job is to stop false passes, and it was a regression: under `--command`
// "this is an error" came from a non-zero exit plus stderr, so stdout content could not become an
// error by construction. The first version also claimed, in a comment, that its counted markers
// were ones "DATA CANNOT FORGE" and were "strictly better" than `resultRegion`'s. Both were false.
// The count was taken the instant the marker was seen -- the FORGED one -- with the real `\echo`
// still in flight, so on any result spanning more than one flush the forgery passed and returned
// zero rows silently.
//
// WHAT FIXES IT IS NOT A TIGHTER REGEX. It is asking psql, rather than reading its output:
//
//   * `:ERROR` and `:SQLSTATE` are psql CLIENT variables, set by psql after each query. No row, no
//     column name and no error text can write them. Measured: with the forged value above, psql
//     reports `false 00000`; with a real refusal it reports `true 42501`.
//   * BECAUSE the status no longer comes from the text, STDERR NO LONGER NEEDS MERGING. It is a
//     separate pipe again, so stdout carries results and this driver's own `\echo` lines and
//     nothing else. That also retires a second defect the merge caused: psql's WARNING lines used
//     to land in the CSV parser and become the header, making every key garbage.
//   * The markers carry a `randomUUID` rather than a counter. A counter is a pure function of the
//     case list and therefore predictable; a UUID is not, so a value cannot contain the marker it
//     would need to forge. And the region is closed by waiting for the CLOSE marker, which psql
//     prints AFTER the status line -- so seeing CLOSE proves the status has arrived, which is the
//     structural fix for the count-taken-too-early hole rather than a wider count.
//
// STILL DEPENDS ON runOne's `finally { rollback }`. `ON_ERROR_STOP` is off, because this suite is
// mostly refusals and a session that ends on the first one is useless. An aborted transaction is
// cleared by the rollback `runOne` issues on every path; if that `finally` is removed, every case
// after the first refusal fails at assume-identity with 25P02 -- loudly, which is the right
// direction. `sessionDriver` now returns rollback's outcome rather than discarding it, so the
// coupling is at least observable.
// THE BOUNDARY LOGIC AS A PURE FUNCTION, which is the shape `resultRegion` above already had and
// the shape the first version of this session wrapper threw away. That mattered: `resultRegion` has
// a test that FORGES a marker (test-kits/db/rls-assertions.test.mjs), and burying the same
// reasoning inside a process wrapper left the replacement with no test of its own at all. Anything
// here can be checked against synthetic psql output, forged values included, with no database.
//
// `text` is psql's stdout for one statement; `diagnostics` is whatever it wrote to stderr, used
// ONLY as a fallback message and NEVER to decide whether there was an error.
export function parseSessionOutcome(text, { open, stat, close }, diagnostics = '') {
  const body = String(text);
  const count = (m) => body.split(m).length - 1;
  if (count(open) !== 1 || count(stat) !== 1 || count(close) !== 1) {
    return { error: { code: null, message: `the session markers printed ${count(open)} open, `
      + `${count(stat)} status and ${count(close)} close, where \\echo prints each exactly once. `
      + 'This driver will not choose an occurrence and call the answer a result.' } };
  }
  const statusLine = body.split('\n').find((l) => l.startsWith(stat));
  if (statusLine === undefined) {
    return { error: { code: null, message: 'the status marker printed inside another line, so psql\'s own '
      + 'error flag cannot be read for this statement' } };
  }
  // `\echo` joins its arguments with single spaces: <marker> <ERROR> <SQLSTATE> <message...>.
  const [, errored, sqlstate, ...rest] = statusLine.split(' ');
  if (errored === 'true') {
    const message = rest.join(' ').trim();
    return { error: { code: /^[0-9A-Z]{5}$/.test(sqlstate) ? sqlstate : null,
      message: message || String(diagnostics).trim() || 'psql reported an error with no message' } };
  }
  if (errored !== 'false') {
    return { error: { code: null, message: `psql's ERROR variable read ${JSON.stringify(errored ?? null)}, which `
      + 'is neither true nor false. An outcome nobody can classify is not a pass.' } };
  }
  const start = body.indexOf('\n', body.indexOf(open));
  const end = body.indexOf(stat);
  if (start === -1 || end < start) {
    return { error: { code: null, message: 'the session markers printed out of order, so no region of this '
      + 'output is the statement\'s result' } };
  }
  return { rows: rowsFromCsv(body.slice(start + 1, end)) };
}

export const SESSION_TIMEOUT_MS = 60_000;

export function openSession({ env = process.env, url = null, timeoutMs = SESSION_TIMEOUT_MS } = {}) {
  const connection = url ?? connectionString(env);
  // Directly, not through a shell: the shell was only there to merge stderr, and merging stderr is
  // exactly what created the forgeable-error hole.
  const child = spawn('psql',
    [connection, '--no-psqlrc', '--quiet', '--no-align', '--csv',
      '--set', 'ON_ERROR_STOP=0', '--set', 'VERBOSITY=verbose'],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...scrubbedEnv(env), LC_ALL: 'C', TZ: 'UTC', PGTZ: 'UTC', PGOPTIONS: '-c client_min_messages=warning' },
    });

  let buffer = '';
  let notify = null;
  let failure = null;
  let closed = false;
  // Kept only so a psql-level failure (a dropped connection, a missing binary) can be REPORTED.
  // Nothing in it is ever used to classify a statement's outcome -- that was the defect.
  let diagnostics = '';

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { buffer += chunk; if (notify) notify(); });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { diagnostics = (diagnostics + chunk).slice(-4000); });
  child.on('error', (error) => {
    failure ??= error.code === 'ENOENT'
      ? 'psql is not on PATH. The live targets need it; they do not have a fallback that pretends to pass.'
      : String(error.message);
    if (notify) notify();
  });
  child.on('close', (code, signal) => {
    closed = true;
    failure ??= `psql exited (code ${code}, signal ${signal}) with the session still open`;
    if (notify) notify();
  });

  const gone = () => closed || child.exitCode !== null || child.signalCode !== null;

  const waitFor = (marker) => new Promise((resolve, reject) => {
    // A deadline, because psql swallows a trailing `\echo` as literal text whenever the SQL leaves
    // an open quote or dollar-quote -- so the close marker never prints and, without this, `exec`
    // waits for ever. `execFile` could not do that: it returned when the process exited.
    const timer = setTimeout(() => {
      notify = null;
      child.kill('SIGKILL');
      reject(new Error(`psql did not answer within ${timeoutMs}ms. The statement may have left its `
        + 'lexer mid-statement -- an unterminated quote or dollar-quote swallows the marker that '
        + 'ends the region.'));
    }, timeoutMs);
    const check = () => {
      if (buffer.includes(marker)) { notify = null; clearTimeout(timer); resolve(); return; }
      if (failure !== null) { notify = null; clearTimeout(timer); reject(new Error(failure)); }
    };
    notify = check;
    check();
  });


  return {
    async exec(sql) {
      if (gone()) {
        return { error: { code: null, message: redactConnection(failure ?? 'the psql session is closed', connection) } };
      }
      // Unpredictable per statement. A counter is a pure function of the case list, so a fixture
      // value could carry the next one; a UUID cannot be guessed by data that was written first.
      const id = randomUUID();
      const open = `__pd_open_${id}__`;
      const stat = `__pd_stat_${id}__`;
      const close = `__pd_close_${id}__`;
      buffer = '';
      child.stdin.write(`\\echo ${open}\n${sql}\n\\echo ${stat} :ERROR :SQLSTATE :LAST_ERROR_MESSAGE\n\\echo ${close}\n`);
      try {
        await waitFor(close);
      } catch (error) {
        return { error: { code: null, message: redactConnection(error.message, connection) } };
      }
      const outcome = parseSessionOutcome(buffer, { open, stat, close }, diagnostics);
      if (outcome.error) {
        return { error: { ...outcome.error, message: redactConnection(outcome.error.message, connection) } };
      }
      return outcome;
    },
    async close() {
      // The first version awaited a `'close'` that had already fired and hung for ever. In
      // rls-smoke.mjs the report is written AFTER this, so a mid-run psql death produced an
      // indefinite hang with no report printed at all -- a CI job that burns to its timeout and
      // says nothing.
      if (gone()) return;
      child.stdin.end('\\q\n');
      await new Promise((resolve) => {
        const done = () => resolve();
        child.once('close', done);
        child.once('error', done);
        setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5_000);
      });
    },
    // For a test that needs to know what psql said without letting it decide anything.
    diagnostics: () => redactConnection(diagnostics, connection),
  };
}
