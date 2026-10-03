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

const run = promisify(execFile);

const CONNECTION = 'DB_TEST_URL';

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
  } catch { /* an unparseable URL still gets the scheme rule above */ }
  for (const part of parts) {
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
    env: { ...env, LC_ALL: 'C', TZ: 'UTC', PGTZ: 'UTC', PGOPTIONS: '-c client_min_messages=warning' },
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

// WHAT psql WOULD EXECUTE AS A META-COMMAND, AND WHERE EACH TOP-LEVEL STATEMENT BEGINS (blocker 186
// item 12; Q0 F2 and F4, A1 V4, C0 F4 on batch 125). On stdin psql executes an unquoted backslash
// ANYWHERE on a line -- `select 1; \! touch f` ran a shell command out of a migration (Q0 MC1) -- and
// the rule that held migrations read only a line BEGINNING with one. This is a lexer in psql's own
// terms: outside single-quoted literals (E'' with its backslash escapes), dollar-quoted bodies,
// double-quoted identifiers and comments (`--` to the end of the line, `/* */` nested), a backslash
// is a meta-command. Inside them it is text, which is why the coverage probe's `'%\_by'` passes.
// Statements split on `;` at parenthesis depth zero, as psql splits them, and each statement's HEAD
// is its text with comments removed and whitespace collapsed, so a rule can read the statement's
// first words rather than any word anywhere (A1 V4: the keyword rule refused every DO block).
// Known over-refusal, which fails closed: a SQL-standard `begin atomic ... end` body is split at its
// inner `;`, so its `end` reads as a statement head.
//
// WHERE psql'S LEXER COULD PART FROM THIS ONE, REFUSED RATHER THAN MODELLED (batch 126's review round:
// A1 F1, Q0 F1). This is not psql's lexer, and A1 and Q0 each ran a shell command out of a migration past
// every scan through a place the two disagree. So the scan reports, as a finding in `metaCommands`
// beside the backslashes, every shape on which they could disagree, and the caller refuses the source:
//   * a carriage return not followed by a line feed: psql ends a `--` comment at a bare CR (A1 L3);
//   * any mention of standard_conforming_strings, in any statement, literal or comment: with it off,
//     psql reads a backslash in a plain literal as an escape (A1 L2, Q0 X1);
//   * a quote inside or closing a PLAIN literal that follows an ODD run of backslashes. With the setting
//     off, psql reads `\x` as one escaped character, so a quote is escaped exactly when an odd run of
//     backslashes precedes it, and that is the only place the two readings of a plain literal can
//     part. With none, the setting cannot move where a plain literal ends, whatever spelling turns it
//     off (set_config of a concatenated name included). A backslash elsewhere in a plain literal (the
//     regexes in 030, 050, 070, 140 and others, which are integrated and are not edited) is admitted;
//   * `e'` opens an E-string only where psql's would: not after an identifier character and not after
//     a `.` -- `1.e'\'` is one junk token and a plain literal to psql 15+ (A1 L1), and is now a plain
//     literal whose closing quote follows one backslash, refused above.
//   * A CHANGE OF CLIENT ENCODING, by any mention of client_encoding (SET, set_config, ALTER ... SET,
//     a comment) and by the token sequence `set [session|local] names` ANYWHERE in the text, its words
//     separated by whitespace or comments (batch 127, from C0 R2 on batch 126). The first version read
//     it only at a statement head, and C0 measured `execute 'set names ''SJIS'''` inside a DO body
//     reaching psql unrefused and moving its encoding (C0 F6 on batch 127): a literal, a dollar body and
//     a comment are read now, as client_encoding always was. psql re-reads the client encoding after
//     every statement, and in a multibyte client encoding (SJIS, BIG5, GBK, UHC, GB18030) it masks the byte or bytes after a high byte before it
//     lexes, so a quote, a backslash, a `-` or a newline after any non-ASCII character can vanish for
//     psql while this lexer reads it. `\encoding` is a backslash and is refused above with the rest.
//   * A U& OR E'' ESCAPE SPELLING, anywhere the server could lex one (batch 128; C0 N2, A1 N4, Q0 N7 on
//     127's re-check). The two rules above read the NAMES as written, and an escape spells them past
//     that: `set U&"client\005fencoding" to 'SJIS'`, `execute E'set\x20names ...'` in a DO body and
//     `set U&"standard\005fconforming\005fstrings" to off` each passed this lexer and, measured, moved
//     psql's encoding or turned the setting off. So `U&"`, `U&'` and `E'` (any case, not after an
//     identifier character) are refused wherever they open a token: at top level, and inside every
//     plain literal and dollar-quoted body, read again as SQL (with '' undoubled) to a depth of eight,
//     past which a text that could hold one is refused, because EXECUTE runs a literal's text and a DO
//     body is SQL. Not in a comment or a quoted
//     identifier, which nothing executes. Measured at batch 128: no .sql file under db/ or tests/ (87),
//     no replacement, fixture or helper, and no probe or drift carries either, so nothing integrated is
//     refused. This also refuses an E'' string that spells nothing at all: fail closed, since a reader
//     cannot tell from the text what its escapes spell. `1.e'...'` is refused with them (psql reads
//     it as a plain literal; it is junk either way).
//     WHAT THIS DOES NOT REACH, and why it is not a byte rule: a name or SET whose words are COMPUTED at
//     run time -- set_config('client_' || 'encoding', ...), EXECUTE of 'set ' || 'names ...', chr(95),
//     format('%s', ...), convert_from(...), or any other expression that BUILDS the text psql never sees
//     spelled out -- still changes it. Escapes were the static spellings of that class, and are refused
//     above; what remains is computation. The fail-closed answer for
//     standard_conforming_strings was a rule on the one place the two readings part (a quote after an odd run of backslashes); for an encoding they part after
//     EVERY non-ASCII character, and measured on the sources fed at batch 127 that is 4,611 places in 77
//     of 86 files, most of them `§` before a digit in a comment, in integrated migrations that are never
//     edited. So the computed-name case stays outside this list, named here and in the batch 127 and 128
//     records.
//     ONE LAYER FOR THE RULE'S OWN CODE (batch 128's review round; Q0 F2). migrate-clean refuses an escape
//     spelling through this same function, so a weakened escapeSpellings (its E'' or U& arm removed) is
//     caught by the static lexer shapes in foundation-contract alone: Q0 measured QESC1 and QESC2 with a
//     reviewer drift in a later file, static 1, migrate-clean 0, rls-smoke 0. That is the shape of every
//     lexer rule here, and is stated rather than doubled.
// The claim is the shapes measured and this list, not "anywhere psql would execute one".
export const SET_NAMES = /\bset(?:\s|\/\*[\s\S]*?\*\/|--[^\n]*\n)+(?:(?:session|local)(?:\s|\/\*[\s\S]*?\*\/|--[^\n]*\n)+)?names\b/gi;
// Every place a U& or E'' token opens, at top level and inside every literal and dollar body read again as
// SQL (batch 128). Returns the offset in `text` of each, or of the outermost literal or body that holds it.
export const ESCAPE_SPELLING_DEPTH = 8;
export function escapeSpellings(text, depth = 0, base = null, out = []) {
  const IDENT = /[A-Za-z0-9_$\u0080-\uffff]/;
  const isIdent = (ch) => ch !== undefined && IDENT.test(ch);
  const TAG = /\$([A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff]*)?\$/y;
  const at = (i) => (base === null ? i : base);
  // Sound as a shortcut: a token at any depth is spelled in the raw text with these characters (a literal
  // inside a literal only doubles its quotes), so a text with none of them holds none.
  if (!/[uU]&["']|[eE]'/.test(text)) return out;
  // Past the depth this scan reads, a text that could hold one is refused rather than skipped: fail closed.
  if (depth > ESCAPE_SPELLING_DEPTH) { out.push({ at: at(0), kind: "U& or E'' (nested past the depth this scan reads)" }); return out; }
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '-' && next === '-') { const eol = text.indexOf('\n', i); i = eol === -1 ? text.length : eol; continue; }
    if (ch === '/' && next === '*') {
      let nest = 1; i += 2;
      while (i < text.length && nest > 0) {
        if (text[i] === '/' && text[i + 1] === '*') { nest += 1; i += 2; continue; }
        if (text[i] === '*' && text[i + 1] === '/') { nest -= 1; i += 2; continue; }
        i += 1;
      }
      i -= 1; continue;
    }
    if ((ch === 'u' || ch === 'U') && next === '&' && (text[i + 2] === '"' || text[i + 2] === "'") && !isIdent(text[i - 1])) { out.push({ at: at(i), kind: 'U&' }); continue; }
    if ((ch === 'e' || ch === 'E') && next === "'" && !isIdent(text[i - 1])) { out.push({ at: at(i), kind: "E''" }); continue; }
    if (ch === '"') {
      let j = i + 1;
      for (; j < text.length; j += 1) { if (text[j] === '"') { if (text[j + 1] === '"') { j += 1; continue; } break; } }
      i = j; continue;
    }
    if (ch === "'") {
      const escapes = (text[i - 1] === 'e' || text[i - 1] === 'E') && !isIdent(text[i - 2]);
      let j = i + 1;
      for (; j < text.length; j += 1) {
        if (escapes && text[j] === '\\') { j += 1; continue; }
        if (text[j] === "'") { if (text[j + 1] === "'") { j += 1; continue; } break; }
      }
      if (j > i + 1) escapeSpellings(text.slice(i + 1, j).replace(/''/g, "'"), depth + 1, at(i), out);
      i = j; continue;
    }
    if (ch === '$' && !isIdent(text[i - 1])) {
      TAG.lastIndex = i;
      const tag = TAG.exec(text);
      if (tag) {
        const close = text.indexOf(tag[0], i + tag[0].length);
        const end = close === -1 ? text.length : close;
        escapeSpellings(text.slice(i + tag[0].length, end), depth + 1, at(i), out);
        i = (close === -1 ? text.length : close + tag[0].length) - 1; continue;
      }
    }
  }
  return out;
}
export function psqlLex(sql) {
  const text = String(sql);
  const metaCommands = [];
  const statements = [];
  {
    let at = 1;
    for (let k = 0; k < text.length; k += 1) {
      if (text[k] === '\n') at += 1;
      else if (text[k] === '\r' && text[k + 1] !== '\n') metaCommands.push({ line: at, text: '\\r: a bare carriage return, which ends a -- comment for psql' });
    }
    for (const found of text.matchAll(/standard_conforming_strings/gi)) {
      metaCommands.push({ line: text.slice(0, found.index).split('\n').length, text: 'standard_conforming_strings, which changes how psql reads a backslash' });
    }
    for (const found of text.matchAll(/client_encoding/gi)) {
      metaCommands.push({ line: text.slice(0, found.index).split('\n').length, text: 'client_encoding, which changes how psql splits the bytes that follow' });
    }
    for (const found of text.matchAll(SET_NAMES)) {
      metaCommands.push({ line: text.slice(0, found.index).split('\n').length, text: 'set names, which changes the client encoding psql splits bytes by' });
    }
    // Not a place psql's lexer parts from this one, but the one scan every fed script passes before it is
    // applied (batch 128's review round; C0 F1): allow_system_table_mods lets the migration owner, a
    // superuser, create a schema named pg_* and write pg_catalog, where C0 X2 and X2b put a definer-rights
    // view a client could read every tenant through. The catalog rules read such an object by its OID
    // now and the pg_catalog guard refuses it; this names the switch itself. Any mention, as with
    // client_encoding; an escape spelling of it is refused below; a name computed at run time is not read
    // here and is left to those two.
    for (const found of text.matchAll(/allow_system_table_mods/gi)) {
      metaCommands.push({ line: text.slice(0, found.index).split('\n').length, text: 'allow_system_table_mods, which lets a superuser write pg_catalog and name a schema pg_*' });
    }
    for (const found of escapeSpellings(text)) {
      metaCommands.push({ line: text.slice(0, found.at).split('\n').length,
        text: `a ${found.kind} escape spelling, which can spell client_encoding, set names or standard_conforming_strings past the rules that read them` });
    }
  }
  let head = '';
  let headLine = 1;
  let line = 1;
  let depth = 0;
  const isIdent = (ch) => ch !== undefined && /[A-Za-z0-9_$\u0080-\uffff]/.test(ch);
  const endStatement = () => {
    const h = head.replace(/\s+/g, ' ').trim();
    if (h) statements.push({ line: headLine, head: h });
    head = '';
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '\n') { line += 1; head += ' '; continue; }
    if (!head.trim()) headLine = line;
    if (ch === '-' && next === '-') {
      while (i < text.length && text[i] !== '\n') i += 1;
      i -= 1; head += ' '; continue;
    }
    if (ch === '/' && next === '*') {
      let nest = 1; i += 2;
      while (i < text.length && nest > 0) {
        if (text[i] === '\n') line += 1;
        if (text[i] === '/' && text[i + 1] === '*') { nest += 1; i += 2; continue; }
        if (text[i] === '*' && text[i + 1] === '/') { nest -= 1; i += 2; continue; }
        i += 1;
      }
      i -= 1; head += ' '; continue;
    }
    if (ch === "'") {
      const escapes = /[eE]/.test(text[i - 1] ?? '') && !isIdent(text[i - 2]) && text[i - 2] !== '.';
      let j = i + 1;
      for (; j < text.length; j += 1) {
        if (text[j] === '\n') line += 1;
        if (escapes && text[j] === '\\') { j += 1; continue; }
        if (!escapes && text[j] === "'") {
          let run = 0;
          while (j - 1 - run > i && text[j - 1 - run] === '\\') run += 1;
          if (run % 2 === 1) metaCommands.push({ line, text: "\\' inside a plain literal, which ends elsewhere for psql when standard_conforming_strings is off" });
        }
        if (text[j] === "'") { if (text[j + 1] === "'") { j += 1; continue; } break; }
      }
      head += text.slice(i, j + 1); i = j; continue;
    }
    if (ch === '"') {
      let j = i + 1;
      for (; j < text.length; j += 1) {
        if (text[j] === '\n') line += 1;
        if (text[j] === '"') { if (text[j + 1] === '"') { j += 1; continue; } break; }
      }
      head += text.slice(i, j + 1); i = j; continue;
    }
    if (ch === '$' && !isIdent(text[i - 1])) {
      const tag = text.slice(i).match(/^\$([A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff]*)?\$/);
      if (tag) {
        const close = text.indexOf(tag[0], i + tag[0].length);
        const end = close === -1 ? text.length : close + tag[0].length;
        const body = text.slice(i, end);
        line += body.split('\n').length - 1;
        head += body; i = end - 1; continue;
      }
    }
    if (ch === '\\') {
      const eol = text.indexOf('\n', i);
      metaCommands.push({ line, text: text.slice(i, eol === -1 ? text.length : eol) });
      head += ch; continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) { endStatement(); continue; }
    head += ch;
  }
  endStatement();
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
      env: { ...env, LC_ALL: 'C', TZ: 'UTC', PGTZ: 'UTC', PGOPTIONS: '-c client_min_messages=warning' },
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
