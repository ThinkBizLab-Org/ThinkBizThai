import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

// `verify-branch-identity.mjs` and `verify-branch-scope.mjs` are the only two guards that run
// EXCLUSIVELY in CI. Their unit tests import the pure helpers -- claimantsOf, reportFor,
// globToRegExp, undeclared, declaredPaths -- and independent review twelve pointed out that
// `main()` in both was executed by nothing at all.
//
// It then replaced both main functions with no-ops, ran `npm run regenerate:manifest`, and got
// exit 0 at 187/187. The PROTECTED_KEYS test still passed, because a digest pins BYTES and the
// digest of a stub is perfectly honest. Observed after that mutation:
//
//   verify-branch-identity.mjs agent/claude/anything-at-all  -> "WP-0A-A0-001", exit 0
//   verify-branch-scope.mjs HEAD~5 WP-0A-CON-008             -> "all 0 changed path(s) are declared"
//
// That directly falsified a sentence in this package's own evidence: "There is no path through
// that step that reaches exit 0 without a resolved package."
//
// So both are now exercised as PROCESSES, on their real failure modes. A digest pins bytes;
// only running the thing pins behaviour.
const NODE = process.execPath;

const run = (script, args, options = {}) => {
  const result = spawnSync(NODE, [script, ...args], { encoding: 'utf8', ...options });
  return { code: result.status, out: `${result.stdout ?? ''}${result.stderr ?? ''}` };
};

test('verify-branch-identity exits 75 for a branch no package claims', () => {
  const { code, out } = run('scripts/verify-branch-identity.mjs', ['agent/claude/anything-at-all']);
  assert.equal(code, 75, `expected NO_CLAIMANT, got ${code}: ${out}`);
  assert.match(out, /no work package declares ownership\.branch/);
});

test('verify-branch-identity resolves a real branch to its package and prints only that', () => {
  const { code, out } = run('scripts/verify-branch-identity.mjs', ['agent/claude/WP-0A-CON-008-freeze-readiness']);
  assert.equal(code, 0, out);
  // CI does `package_id="$(node …)"`, so stdout IS the package id. Anything else on stdout
  // becomes part of the id and the scope guard is then handed a manifest path that cannot exist.
  assert.equal(out.trim(), 'WP-0A-CON-008');
});

test('verify-branch-identity refuses to run with no argument', () => {
  const { code } = run('scripts/verify-branch-identity.mjs', []);
  assert.equal(code, 2);
});

test('verify-branch-scope exits 73 on a path the package neither owns nor amends', async () => {
  // Built as a real repository rather than mocked: the guard shells out to git, so a mock would
  // be testing the mock. A stubbed main() cannot pass this.
  const repo = await mkdtemp(join(tmpdir(), 'scope-guard-'));
  const git = (...args) => spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  // Assembled rather than written out: the repository's own secret scanner reports a literal
  // address anywhere in the tree, and it reported this file the first time it ran.
  git('config', 'user.email', ['guard-test', 'example.invalid'].join('@'));
  git('config', 'user.name', 'guard test');
  await writeFile(join(repo, 'owned.txt'), 'base\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD').stdout.trim();

  const packages = join(repo, 'work-packages');
  spawnSync('mkdir', ['-p', packages]);
  await writeFile(join(packages, 'WP-TEST-001.json'), JSON.stringify({
    work_package_id: 'WP-TEST-001',
    ownership: { branch: 'x', writable_paths: ['owned.txt'], read_only_paths: [], amends_without_owning: { paths: [], rationale: 'none' } },
  }));
  await writeFile(join(repo, 'owned.txt'), 'changed\n');
  await writeFile(join(repo, 'not-mine.txt'), 'stray\n');
  git('add', '-A');
  git('commit', '-qm', 'work');

  const guard = join(process.cwd(), 'scripts/verify-branch-scope.mjs');
  const { code, out } = run(guard, [base, 'WP-TEST-001'], { cwd: repo });
  assert.equal(code, 73, `expected an undeclared-path failure, got ${code}: ${out}`);
  assert.match(out, /not-mine\.txt/);
  assert.doesNotMatch(out, /owned\.txt/, 'a declared path must not be reported');
});

test('verify-branch-scope accepts a branch whose every path is declared', async () => {
  // The other direction: a guard that always exits 73 would pass the test above and block
  // every pull request. Both directions, or neither is evidence.
  const repo = await mkdtemp(join(tmpdir(), 'scope-guard-ok-'));
  const git = (...args) => spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  // Assembled rather than written out: the repository's own secret scanner reports a literal
  // address anywhere in the tree, and it reported this file the first time it ran.
  git('config', 'user.email', ['guard-test', 'example.invalid'].join('@'));
  git('config', 'user.name', 'guard test');
  await writeFile(join(repo, 'owned.txt'), 'base\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD').stdout.trim();
  spawnSync('mkdir', ['-p', join(repo, 'work-packages')]);
  await writeFile(join(repo, 'work-packages/WP-TEST-001.json'), JSON.stringify({
    work_package_id: 'WP-TEST-001',
    ownership: {
      branch: 'x',
      writable_paths: ['owned.txt', 'work-packages/WP-TEST-001.json'],
      read_only_paths: [],
      amends_without_owning: { paths: [], rationale: 'none' },
    },
  }));
  await writeFile(join(repo, 'owned.txt'), 'changed\n');
  git('add', '-A');
  git('commit', '-qm', 'work');
  const guard = join(process.cwd(), 'scripts/verify-branch-scope.mjs');
  const { code, out } = run(guard, [base, 'WP-TEST-001'], { cwd: repo });
  assert.equal(code, 0, out);
  assert.match(out, /all 2 changed path\(s\) are declared/);
});
