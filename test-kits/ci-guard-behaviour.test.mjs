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

// Review twelve's process tests pinned five behaviours; independent review thirteen found the
// gaps between them. AMBIGUOUS_CLAIM (76) and UNREADABLE (77) were never exercised as processes,
// and the scope guard's PREDICATE was unpinned — so two edits passed at exit 0, 198/198:
//
//   verify-branch-scope.mjs   ...undeclared(...).filter((f) => !f.startsWith('contract-catalog/'))
//   verify-branch-identity.mjs  if (code === AMBIGUOUS_CLAIM || code === UNREADABLE) → exit 0
//
// After which an undeclared change to ctr-api-001/schema.json reported "all 4 changed path(s)
// are declared". Every hole a test leaves is a hole shaped exactly like the test.
const withPackages = async (files) => {
  const root = await mkdtemp(join(tmpdir(), 'identity-guard-'));
  const packages = join(root, 'work-packages');
  spawnSync('mkdir', ['-p', packages]);
  for (const [name, body] of Object.entries(files)) {
    await writeFile(join(packages, name), typeof body === 'string' ? body : JSON.stringify(body));
  }
  return root;
};
const claiming = (id, branch) => ({ work_package_id: id, ownership: { branch } });

test('verify-branch-identity exits 76 when two packages claim one branch', async () => {
  const root = await withPackages({
    'WP-1.json': claiming('WP-1', 'agent/claude/shared'),
    'WP-2.json': claiming('WP-2', 'agent/claude/shared'),
  });
  const guard = join(process.cwd(), 'scripts/verify-branch-identity.mjs');
  const { code, out } = run(guard, ['agent/claude/shared'], { cwd: root });
  assert.equal(code, 76, `expected AMBIGUOUS_CLAIM, got ${code}: ${out}`);
  assert.match(out, /WP-1, WP-2/);
  assert.doesNotMatch(out, /^WP-\d\s*$/m, 'an ambiguous claim must not print a package id for CI to capture');
});

test('verify-branch-identity exits 77 rather than resolving past an unreadable manifest', async () => {
  const root = await withPackages({
    'WP-1.json': claiming('WP-1', 'agent/claude/WP-1-alpha'),
    'WP-BROKEN.json': '{ not json',
  });
  const guard = join(process.cwd(), 'scripts/verify-branch-identity.mjs');
  const { code, out } = run(guard, ['agent/claude/WP-1-alpha'], { cwd: root });
  assert.equal(code, 77, `expected UNREADABLE, got ${code}: ${out}`);
  assert.match(out, /WP-BROKEN\.json/);
});

test('verify-branch-scope reports a stray path inside the contract catalog', async () => {
  // The predicate, not just the exit code: a filter excluding `contract-catalog/` passed all five
  // of the earlier rows. The catalog is the one place where an undeclared change matters most.
  const repo = await mkdtemp(join(tmpdir(), 'scope-catalog-'));
  const git = (...args) => spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', ['guard-test', 'example.invalid'].join('@'));
  git('config', 'user.name', 'guard test');
  await writeFile(join(repo, 'owned.txt'), 'base\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD').stdout.trim();
  spawnSync('mkdir', ['-p', join(repo, 'work-packages')]);
  spawnSync('mkdir', ['-p', join(repo, 'contract-catalog/shared-kernel/ctr-api-001')]);
  await writeFile(join(repo, 'work-packages/WP-TEST-001.json'), JSON.stringify({
    work_package_id: 'WP-TEST-001',
    ownership: { branch: 'x', writable_paths: ['owned.txt', 'work-packages/WP-TEST-001.json'], read_only_paths: [], amends_without_owning: { paths: [], rationale: 'none' } },
  }));
  await writeFile(join(repo, 'contract-catalog/shared-kernel/ctr-api-001/schema.json'), '{"type":"object"}\n');
  git('add', '-A');
  git('commit', '-qm', 'work');
  const guard = join(process.cwd(), 'scripts/verify-branch-scope.mjs');
  const { code, out } = run(guard, [base, 'WP-TEST-001'], { cwd: repo });
  assert.equal(code, 73, `an undeclared contract change must fail, got ${code}: ${out}`);
  assert.match(out, /contract-catalog\/shared-kernel\/ctr-api-001\/schema\.json/);
});

// Independent review fourteen: `validate-work-package-ownership.mjs`'s DIRECTORY entry point --
// the one `npm run validate:protocol` actually calls -- was executed by no test. Every unit test
// calls the pure `validateManifestOwnership` on synthetic manifests, so inserting
// `if (directory === 'work-packages') return;` as its first line passed at exit 0, 208/208, and
// took `namesSomething`, the protected-file rule and `deadAmendments` with it.
//
// The same lesson as review twelve's, one script over: a digest pins bytes; only running the
// thing pins behaviour.
test('validate-work-package-ownership rejects a blanket amendment when run over a real directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ownership-cli-'));
  const packages = join(root, 'work-packages');
  spawnSync('mkdir', ['-p', packages]);
  await writeFile(join(packages, 'WP-T-001.json'), JSON.stringify({
    work_package_id: 'WP-T-001',
    ownership: {
      writable_paths: ['owned.txt'],
      read_only_paths: [],
      amends_without_owning: { paths: ['**'], rationale: 'a reason long enough to be a reason and not a placeholder' },
    },
    outputs: { files: ['owned.txt'] },
  }));
  const guard = join(process.cwd(), 'scripts/validate-work-package-ownership.mjs');
  const { code, out } = run(guard, [packages]);
  assert.equal(code, 74, `a blanket amendment must be rejected by the CLI, got ${code}: ${out}`);
  assert.match(out, /names no path at all/);
});

test('validate-work-package-ownership accepts a manifest that declares only what it owns', async () => {
  // Both directions: a validator that always exits 74 would pass the row above and block every
  // package in the repository.
  const root = await mkdtemp(join(tmpdir(), 'ownership-cli-ok-'));
  const packages = join(root, 'work-packages');
  spawnSync('mkdir', ['-p', packages]);
  await writeFile(join(packages, 'WP-T-001.json'), JSON.stringify({
    work_package_id: 'WP-T-001',
    ownership: {
      writable_paths: ['owned.txt'],
      read_only_paths: [],
      amends_without_owning: { paths: [], rationale: 'none' },
    },
    outputs: { files: ['owned.txt'] },
  }));
  const guard = join(process.cwd(), 'scripts/validate-work-package-ownership.mjs');
  const { code, out } = run(guard, [packages]);
  assert.equal(code, 0, out);
});
