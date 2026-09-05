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

function parseError(stderr) {
  const code = stderr.match(/SQLSTATE[:\s]+([0-9A-Z]{5})/)?.[1]
    ?? stderr.match(/^psql:.*?:\s*ERROR:\s.*\n.*?([0-9A-Z]{5})/m)?.[1]
    ?? null;
  const message = stderr.match(/ERROR:\s+(.*)/)?.[1]?.trim() ?? stderr.trim();
  return { code, message };
}

// Rows come back as unaligned, tuples-only CSV so an empty result is an empty string rather than a
// header row that would count as one.
function parseRows(stdout) {
  const text = stdout.trim();
  if (text === '') return [];
  return text.split('\n').map((line) => ({ _: line }));
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

// One statement, one outcome, shaped exactly as the assertion helpers expect: { rows, error }.
export async function query(sql, { env = process.env, url = null } = {}) {
  const connection = url ?? connectionString(env);
  const args = [
    connection,
    '--no-psqlrc', '--quiet', '--tuples-only', '--no-align', '--csv',
    '--set', 'ON_ERROR_STOP=1',
    '--set', 'VERBOSITY=verbose',
    '--command', sql,
  ];
  try {
    const { stdout } = await run('psql', args, {
      env: { ...env, LC_ALL: 'C', TZ: 'UTC', PGTZ: 'UTC', PGOPTIONS: '-c client_min_messages=warning' },
    });
    return { rows: parseRows(stdout) };
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
