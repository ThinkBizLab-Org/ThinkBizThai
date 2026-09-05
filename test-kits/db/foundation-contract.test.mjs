import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import test from 'node:test';

import { contractCheck, schemaLint } from '../../scripts/db/run.mjs';

const run = promisify(execFile);

// DB-00 is the first package in this repository with no way to prove itself here: the RLS
// assertions the data package asks for need a live Postgres, this host has none, and the
// repository forbids adding a dependency. The failure mode that invites is obvious — a harness
// that prints `ok` because it found nothing to check.
//
// So what IS provable without a database is pinned properly, and the rest is pinned to REFUSE.
// A live target that exits 0 with no database would be the largest false clean-run this repository
// has produced, on the one surface where a false pass means tenant data.

const MIGRATION = 'db/foundation/migrations/000_foundation.sql';
const lintOf = (sql, name = '000_test.sql') => schemaLint([{ name, sql }]);

test('batch 000 passes its own lint, so the lint is not green by having nothing to read', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  assert.ok(sql.length > 500, 'batch 000 is present and not a stub');
  assert.deepEqual(await lintOf(sql, '000_foundation.sql'), []);
});

// The rule that exists because the data package's own lint spec misses it. `relrowsecurity` and
// `relforcerowsecurity` are two different catalog columns; a table with ENABLE and no FORCE passes
// the specified rule cleanly while its owner stays exempt from every policy. RFC-2026-016 records
// the gap. Batch 000 creates no table yet, so this is pinned against a synthetic one — which is
// the point: the rule has to bite before the first tenant table is written, not after.
test('the lint rejects ENABLE without FORCE, which the specified rule would pass', async () => {
  const enableOnly = `
    create table app.workspace (id uuid primary key);
    comment on table app.workspace is 'owner: A0';
    alter table app.workspace enable row level security;
  `;
  const problems = await lintOf(enableOnly);
  assert.ok(problems.some((p) => /does not FORCE ROW LEVEL SECURITY/.test(p)),
    `ENABLE without FORCE must be rejected, got ${JSON.stringify(problems)}`);

  const forced = `${enableOnly}\n alter table app.workspace force row level security;`;
  assert.deepEqual(await lintOf(forced), [], 'and the same table with FORCE must pass');
});

test('the lint rejects a tenant table with no owner comment and no primary key', async () => {
  const problems = await lintOf(`
    create table app.page (title text);
    alter table app.page enable row level security;
    alter table app.page force row level security;
  `);
  assert.ok(problems.some((p) => /has no owner comment/.test(p)), 'owner comment');
  assert.ok(problems.some((p) => /declares no primary key/.test(p)), 'primary key');
});

test('the lint rejects a SECURITY DEFINER function that does not pin an empty search_path', async () => {
  const unpinned = `
    create function private.whoami() returns text language sql security definer as $$
      select current_user;
    $$;
  `;
  assert.ok((await lintOf(unpinned)).some((p) => /empty search_path/.test(p)));

  const pinned = unpinned.replace('security definer', "security definer set search_path = ''");
  assert.deepEqual(await lintOf(pinned), []);
});

test('the lint rejects a view that is not security invoker, and any write to a managed schema', async () => {
  assert.ok((await lintOf('create view app.page_v as select 1;')).some((p) => /not security_invoker/.test(p)));
  assert.deepEqual(await lintOf('create view app.page_v with (security_invoker = true) as select 1;'), []);

  for (const schema of ['auth', 'storage', 'realtime']) {
    const problems = await lintOf(`create table ${schema}.shadow (id uuid primary key);`);
    assert.ok(problems.some((p) => p.includes(`'${schema}'`)),
      `writing to the Supabase-managed schema ${schema} must be rejected — §3.1`);
  }
});

test('the command contract exposes every target the data package names', async () => {
  assert.deepEqual(await contractCheck(await readFile('Makefile', 'utf8')), []);
  // And the check is not vacuous: a Makefile missing one target must be caught.
  const stripped = (await readFile('Makefile', 'utf8')).replace(/^db-rls-smoke:.*$/m, '');
  assert.ok((await contractCheck(stripped)).some((p) => p.includes('db-rls-smoke')));
});

// The heart of it. Every target that needs a database must FAIL without one, and say so.
test('a target needing a database refuses without one, rather than reporting a pass', async () => {
  const live = ['reset-test', 'migrate-clean', 'migrate-upgrade', 'seed-replay', 'rls-smoke', 'test-foundation'];
  const env = { ...process.env, DB_TEST_URL: '', LC_ALL: 'C', TZ: 'UTC' };
  delete env.DB_TEST_URL;

  for (const target of live) {
    const result = await run('node', ['scripts/db/run.mjs', target], { env }).then(
      (ok) => ({ code: 0, ...ok }),
      (err) => ({ code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }));
    assert.notEqual(result.code, 0, `db-${target} exited 0 with no database — it must never report a pass it cannot earn`);
    assert.match(result.stderr, /DB_TEST_URL/, `db-${target} must name the variable that would let it run`);
    assert.match(result.stdout, new RegExp(`db-${target}: FAILED`), `db-${target} must print a failing summary line`);
  }
});

test('db-verify fails as a whole, and its summary names what is missing', async () => {
  const env = { ...process.env, LC_ALL: 'C', TZ: 'UTC' };
  delete env.DB_TEST_URL;
  const result = await run('node', ['scripts/db/run.mjs', 'verify'], { env })
    .then((ok) => ({ code: 0, ...ok }), (err) => ({ code: err.code ?? 1, stdout: err.stdout ?? '' }));
  assert.notEqual(result.code, 0, 'db-verify must not report clean while six of its targets cannot run');
  assert.match(result.stdout, /db-verify: FAILED — 6 of 9 target\(s\)/);
  assert.match(result.stdout, /need DB_TEST_URL, which is unset/);
  // The three that CAN run must actually have run and passed, or the failure is uninformative.
  for (const target of ['schema-lint', 'contract-check', 'generated-drift-check']) {
    assert.match(result.stdout, new RegExp(`db-${target}: ok`), `db-${target} is answerable without a database and must run`);
  }
});

test('a connection string never reaches the output', async () => {
  const env = { ...process.env, DB_TEST_URL: 'postgresql://user:hunter2@db.example.invalid:5432/prod', LC_ALL: 'C', TZ: 'UTC' };
  const result = await run('node', ['scripts/db/run.mjs', 'migrate-clean'], { env })
    .then((ok) => ({ code: 0, ...ok }), (err) => ({ code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }));
  const output = `${result.stdout}${result.stderr}`;
  assert.doesNotMatch(output, /hunter2/, '§12.5 requires the connection URL to be redacted');
  assert.doesNotMatch(output, /db\.example\.invalid/, 'the host is part of the URL and must not leak either');
});
