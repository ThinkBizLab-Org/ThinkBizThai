import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
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
  const { code, out } = run('scripts/verify-branch-identity.mjs', ['agent/claude/WP-0A-CON-008-handoff-base']);
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
  // Invoked THE WAY PRODUCTION INVOKES IT: no argv[2], from the repository root, so the default
  // `'work-packages'` is what the guard sees.
  //
  // Independent review fifteen caught the first version of this test passing an ABSOLUTE path,
  // while `npm run validate:protocol` passes the literal `'work-packages'`. Review fourteen's
  // stub -- `if (directory === 'work-packages') return;` -- compares against that literal, so
  // these rows never touched the branch and the whole ownership path was still removable at
  // exit 0. A process row that runs the guard with an argument production never uses is a unit
  // test wearing a process row's clothes.
  const guard = join(process.cwd(), 'scripts/validate-work-package-ownership.mjs');
  const { code, out } = run(guard, [], { cwd: root });
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
  const { code, out } = run(guard, [], { cwd: root });
  assert.equal(code, 0, out);
});

test('validate-work-package-ownership rejects an output outside its writable paths', async () => {
  // The other rule this validator carries, and the one review fifteen used to show the stub was
  // still live: an output a package does not own.
  const root = await mkdtemp(join(tmpdir(), 'ownership-cli-outside-'));
  spawnSync('mkdir', ['-p', join(root, 'work-packages')]);
  await writeFile(join(root, 'work-packages/WP-T-001.json'), JSON.stringify({
    work_package_id: 'WP-T-001',
    ownership: {
      writable_paths: ['owned.txt'],
      read_only_paths: [],
      amends_without_owning: { paths: [], rationale: 'none' },
    },
    outputs: { files: ['owned.txt', 'scripts/verify-test-coverage-floor.mjs'] },
  }));
  const guard = join(process.cwd(), 'scripts/validate-work-package-ownership.mjs');
  const { code, out } = run(guard, [], { cwd: root });
  assert.equal(code, 68, `an output outside writable_paths must be rejected, got ${code}: ${out}`);
  assert.match(out, /outside writable_paths/);
});

// Review fourteen's HIGH 1 was a stubbed guard. Asking the generalised question afterwards --
// *which exported guard functions does no test ever execute?* -- found nine, and the one that
// mattered: `validate-capability-profiles.mjs` sits in the `check` chain and was spawned by no
// test at all. Adding `if (manifestDirectory === 'work-packages') { process.exit(0); }` to its
// CLI passed at **exit 0**.
//
// So every guard the chain invokes is now spawned as a process, on a real failing input and on a
// real passing one. The pattern is the same in each: a guard that always fails would satisfy the
// failing row and block the repository, so both directions or neither.
// A real profile from this repository, minus its identity, so the fixture satisfies the profile
// schema instead of asserting a shape this test invented.
const realProfile = async () => {
  const directory = '.agents/capability-profiles';
  const name = (await readdir(directory)).filter((f) => f.endsWith('.json')).sort()[0];
  return JSON.parse(await readFile(join(directory, name), 'utf8'));
};

const capabilityFixture = async (profile, manifest) => {
  const root = await mkdtemp(join(tmpdir(), 'capability-cli-'));
  const profiles = join(root, 'profiles');
  const packages = join(root, 'work-packages');
  spawnSync('mkdir', ['-p', profiles]);
  spawnSync('mkdir', ['-p', packages]);
  if (profile) await writeFile(join(profiles, 'a0_atlas.json'), JSON.stringify(profile));
  await writeFile(join(packages, 'WP-T-001.json'), JSON.stringify(manifest));
  return { root, profiles, packages };
};

test('validate-capability-profiles rejects a role run with no capability declaration', async () => {
  // The real failure mode, found by reading the validator rather than assuming one: a manifest
  // that assigns a role to an agent_run_id no profile declares. My first version of this test
  // asserted a rejection the validator does not make and passed at exit 0 for the wrong reason --
  // the same defect as a probe that mutates something nothing reads.
  const profile = await realProfile();
  const { profiles, packages } = await capabilityFixture(profile, {
    work_package_id: 'WP-T-001',
    // The check applies from `ready` onward: a backlog package has no roles to honour yet.
    status: 'in_review',
    required_skill_profiles: [],
    role_assignments: { author_agent_run_id: '/claude/an-agent-with-no-profile' },
  });
  const guard = join(process.cwd(), 'scripts/validate-capability-profiles.mjs');
  const { code, out } = run(guard, [profiles, packages]);
  assert.equal(code, 68, `an undeclared role run must be rejected, got ${code}: ${out}`);
  assert.match(out, /without capability declarations/);
});

test('validate-capability-profiles accepts a manifest whose capabilities are all declared', async () => {
  const profile = await realProfile();
  const { profiles, packages } = await capabilityFixture(profile, {
    work_package_id: 'WP-T-001',
    status: 'in_review',
    required_skill_profiles: [],
    role_assignments: { author_agent_run_id: profile.agent_run_id },
  });
  const guard = join(process.cwd(), 'scripts/validate-capability-profiles.mjs');
  const { code, out } = run(guard, [profiles, packages]);
  assert.equal(code, 0, out);
});

test('scan-repository-secrets exits non-zero on a planted credential and zero on clean text', async () => {
  // The scanner is a chain step that no test had ever run as a process either. Its pure helpers
  // are unit-tested; `main` was not.
  const clean = await mkdtemp(join(tmpdir(), 'scan-clean-'));
  await writeFile(join(clean, 'notes.md'), 'A note with no credential in it at all.\n');
  const guard = join(process.cwd(), 'scripts/scan-repository-secrets.mjs');
  const ok = run(guard, [clean]);
  assert.equal(ok.code, 0, ok.out);

  const dirty = await mkdtemp(join(tmpdir(), 'scan-dirty-'));
  // Assembled at runtime so this file does not itself carry a scannable literal.
  await writeFile(join(dirty, 'leak.env'), `AWS_SECRET_ACCESS_KEY=${'A'.repeat(20)}${'b7Kd'.repeat(5)}\n`);
  const bad = run(guard, [dirty]);
  assert.notEqual(bad.code, 0, `a planted credential must be reported, got ${bad.code}: ${bad.out}`);
});

// A Product Owner disposition belongs to no work package, and the branch-identity guard correctly
// refuses it — CI found this the first time one was pushed, and there was no honest manifest to
// add the branch to. Declaring it under some package to satisfy a guard would have been a lie.
//
// So the exemption exists, and it is narrow enough that it cannot be borrowed: decision-record
// status lines and nothing else. These rows are what keep it narrow.
const dispositionRepo = async (edits) => {
  const root = await mkdtemp(join(tmpdir(), 'disposition-'));
  const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', ['guard-test', 'example.invalid'].join('@'));
  git('config', 'user.name', 'guard test');
  spawnSync('mkdir', ['-p', join(root, 'architecture/decisions')]);
  await writeFile(join(root, 'architecture/decisions/RFC-2026-001-x.md'),
    '# RFC-2026-001 — x\n\nStatus: Proposed — awaiting disposition\n\nBody text that must not move.\n');
  await writeFile(join(root, 'owned.txt'), 'base\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD').stdout.trim();
  for (const [path, body] of edits) await writeFile(join(root, path), body);
  git('add', '-A');
  git('commit', '-qm', 'change');
  return { root, base };
};
const dispositionGuard = join(process.cwd(), 'scripts/verify-disposition-branch.mjs');

test('a disposition branch that changes only status lines is recognised', async () => {
  const { root, base } = await dispositionRepo([
    ['architecture/decisions/RFC-2026-001-x.md',
      '# RFC-2026-001 — x\n\nStatus: Approved 2026-09-02 by the Product Owner — reason\n\nBody text that must not move.\n'],
  ]);
  const { code, out } = run(dispositionGuard, [base], { cwd: root });
  assert.equal(code, 0, out);
  assert.match(out, /only decision-record status lines changed/);
});

test('a branch that edits an RFC body is not a disposition', async () => {
  // The exemption must not become a way to rewrite a decision under cover of disposing it.
  const { root, base } = await dispositionRepo([
    ['architecture/decisions/RFC-2026-001-x.md',
      '# RFC-2026-001 — x\n\nStatus: Approved 2026-09-02 by the Product Owner — reason\n\nBody text that MAY now be skipped.\n'],
  ]);
  const { code, out } = run(dispositionGuard, [base], { cwd: root });
  assert.equal(code, 78, `expected NOT_A_DISPOSITION, got ${code}: ${out}`);
  assert.match(out, /changes a line that is not its status/);
});

test('a branch that touches anything outside the decision records is not a disposition', async () => {
  const { root, base } = await dispositionRepo([
    ['architecture/decisions/RFC-2026-001-x.md',
      '# RFC-2026-001 — x\n\nStatus: Approved 2026-09-02 by the Product Owner — reason\n\nBody text that must not move.\n'],
    ['owned.txt', 'changed\n'],
  ]);
  const { code, out } = run(dispositionGuard, [base], { cwd: root });
  assert.equal(code, 78, `expected NOT_A_DISPOSITION, got ${code}: ${out}`);
  assert.match(out, /owned\.txt is not a decision record/);
});
