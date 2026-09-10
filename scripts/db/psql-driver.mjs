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
