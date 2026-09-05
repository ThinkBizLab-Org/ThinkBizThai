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
import { execFile } from 'node:child_process';
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

// The raw invocation: either the text psql printed, or a classified error. Everything above it
// decides what the text MEANS; nothing below it does.
async function invoke(sql, { env = process.env, url = null } = {}) {
  const connection = url ?? connectionString(env);
  const args = [
    connection,
    '--no-psqlrc', '--quiet', '--no-align', '--csv',
    '--set', 'ON_ERROR_STOP=1',
    '--set', 'VERBOSITY=verbose',
    '--command', sql,
  ];
  try {
    const { stdout } = await run('psql', args, {
      env: { ...env, LC_ALL: 'C', TZ: 'UTC', PGTZ: 'UTC', PGOPTIONS: '-c client_min_messages=warning' },
    });
    return { stdout };
  } catch (failure) {
    // A missing psql is not a database refusal, and must never be classified as one.
    if (failure.code === 'ENOENT') {
      const error = new Error('psql is not on PATH. The live targets need it; they do not have a fallback that pretends to pass.');
      error.code = 'NO_PSQL';
      throw error;
    }
    return { error: parseError(redactConnection(String(failure.stderr ?? failure.message ?? ''), connection)) };
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
// So a boundary row is selected immediately before the statement whose outcome is wanted, and only
// what follows it is parsed. The marker is a constant this driver chooses; a value in the data
// that happened to contain it would be read as a boundary, which is why it is not a word.
export const RESULT_BOUNDARY = '__psql_driver_result_boundary__';

export function afterBoundary(stdout) {
  const at = String(stdout).lastIndexOf(RESULT_BOUNDARY);
  if (at === -1) return null;
  const newline = String(stdout).indexOf('\n', at);
  return newline === -1 ? '' : String(stdout).slice(newline + 1);
}

export async function queryFinal({ prelude = [], statement, epilogue = [] }, options = {}) {
  const sql = [
    ...prelude,
    `select '${RESULT_BOUNDARY}' as ${RESULT_BOUNDARY};`,
    statement,
    ...epilogue,
  ].join('\n');
  const out = await invoke(sql, options);
  if (out.error) return out;
  const tail = afterBoundary(out.stdout);
  if (tail === null) {
    // The boundary is selected before the statement, so its absence means psql stopped earlier
    // without a non-zero exit. Reporting it as an empty result would be a pass nobody earned.
    return { error: { code: null, message: 'the result boundary never printed: psql produced no output for the statement under test' } };
  }
  return { rows: rowsFromCsv(tail) };
}

// Several statements as one transaction, for fixtures and migrations. Deliberately separate from
// `query`: a fixture that half-applies leaves a suite asserting against a state nobody described.
export async function script(sql, options = {}) {
  return query(`begin;\n${sql}\ncommit;`, options);
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
