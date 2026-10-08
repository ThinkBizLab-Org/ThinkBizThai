import assert from 'node:assert/strict';
import test from 'node:test';

import { declaredPaths, globToRegExp, undeclared } from '../scripts/verify-branch-scope.mjs';

// A manifest is a promise; a branch is a fact. `validate-work-package-ownership.mjs` checks the
// promise -- that declared outputs sit inside declared writable paths. Nothing checked the fact.
//
// Two failures in this repository came through that gap. A stacked rebase resolved with
// `--theirs` on a file the BASE had just changed silently reverted it: the payment-card
// separator withdrawal came back and the scanner then reported the package's own test file. And
// work done on the top branch while answering review findings accumulated changes to twenty-six
// paths belonging to packages further down the stack, none of them declared.
//
// The guard itself runs against a base ref, which a test cannot assume. What is asserted here is
// the matching, which is where a guard like this usually goes wrong: too permissive and it says
// nothing, too strict and it fails on the paths a package legitimately owns.
test('a glob matches within one segment, and `**` spans directories only as a whole segment', () => {
  assert.ok(globToRegExp('evidence/WP-0A-CON-008/**').test('evidence/WP-0A-CON-008/author-self-check.md'));
  assert.ok(globToRegExp('evidence/WP-0A-CON-008/**').test('evidence/WP-0A-CON-008/nested/deep.md'));
  assert.ok(!globToRegExp('evidence/WP-0A-CON-008/**').test('evidence/WP-0A-CON-007/author-self-check.md'));

  // A bare `*` must not cross a directory boundary -- this repository has already had a guard
  // defeated by a `**` that was read as spanning when it was written inside a segment.
  assert.ok(globToRegExp('handoffs/WP-0A-*-author-handoff.json').test('handoffs/WP-0A-CON-008-author-handoff.json'));
  assert.ok(!globToRegExp('handoffs/WP-0A-*-author-handoff.json').test('handoffs/nested/WP-0A-X-author-handoff.json'));
  assert.ok(!globToRegExp('scripts/*.mjs').test('scripts/nested/thing.mjs'));

  // A mid-path `**/` keeps the boundary it sits on. Independent review found it compiling to
  // `.*` with the slash dropped, so `evidence/**/notes.md` matched `evidence/XYZnotes.md` --
  // which a shell globstar does not. Latent, because no manifest uses the form today, and
  // fixed rather than left because the next one will.
  assert.ok(globToRegExp('evidence/**/notes.md').test('evidence/notes.md'));
  assert.ok(globToRegExp('evidence/**/notes.md').test('evidence/deep/notes.md'));
  assert.ok(!globToRegExp('evidence/**/notes.md').test('evidence/XYZnotes.md'));
});

test('a path that is neither owned nor recorded as an amendment is reported', () => {
  const manifest = {
    ownership: {
      writable_paths: ['work-packages/WP-X.json', 'evidence/WP-X/**'],
      amends_without_owning: { paths: ['package.json'] },
    },
  };
  const patterns = declaredPaths(manifest);
  assert.deepEqual(
    undeclared(['work-packages/WP-X.json', 'evidence/WP-X/note.md', 'package.json'], patterns),
    [],
  );
  assert.deepEqual(
    undeclared(['contract-catalog/shared-kernel/ctr-api-001/schema.json', 'work-packages/WP-Y.json'], patterns),
    ['contract-catalog/shared-kernel/ctr-api-001/schema.json', 'work-packages/WP-Y.json'],
  );
});

test('a manifest that declares nothing reports every changed path', () => {
  assert.deepEqual(undeclared(['a.md', 'b/c.json'], declaredPaths({})), ['a.md', 'b/c.json']);
});

test('an amendment list cannot be a pattern that names nothing', async () => {
  // `declaredPaths()` unions writable_paths and amends_without_owning.paths, and the ownership
  // validator read only the first of those -- not for shape, not for breadth, not for overlap.
  // Independent review thirteen appended `"**"` to the amendment list: globToRegExp('**')
  // compiles to /^.*$/, so a branch touching contracts it does not own reported
  // "all N changed path(s) are declared" at exit 0.
  //
  // The neighbouring field had been hardened and this one had nothing, which is the more general
  // lesson: a check on one field says nothing about the field beside it.
  const { validateManifestOwnership, OwnershipValidationError } = await import('../scripts/validate-work-package-ownership.mjs');
  const manifest = (paths, rationale = 'a reason long enough to be a reason and not a placeholder word') => ([{
    work_package_id: 'WP-T-001',
    ownership: {
      writable_paths: ['owned.txt'],
      read_only_paths: [],
      amends_without_owning: { paths, rationale },
    },
    outputs: { files: ['owned.txt'] },
  }]);

  for (const pattern of ['**', '*', '*/*', '**/*']) {
    assert.throws(() => validateManifestOwnership(manifest([pattern])),
      (error) => error instanceof OwnershipValidationError && error.code === 74,
      `${JSON.stringify(pattern)} names nothing and must be rejected`);
  }
  assert.throws(() => validateManifestOwnership(manifest(['/etc/passwd'])), { code: 74 });
  assert.throws(() => validateManifestOwnership(manifest(['../outside.txt'])), { code: 74 });
  assert.throws(() => validateManifestOwnership(manifest(['scripts/run-test-suite.mjs'], 'too short')), { code: 74 },
    'an amendment is a claim about another package\'s files and has to say why');

  // And the legitimate forms still pass: a concrete path, and a glob with a literal segment.
  assert.doesNotThrow(() => validateManifestOwnership(manifest(['scripts/run-test-suite.mjs'])));
  assert.doesNotThrow(() => validateManifestOwnership(manifest(['evidence/WP-0A-CON-007/**'])));
  assert.doesNotThrow(() => validateManifestOwnership(manifest([])), 'an empty amendment list needs no rationale');
});

test('an amendment cannot be a blanket permission over a tree', async () => {
  // `namesSomething` closed `["**"]`. Probing that fix immediately afterwards showed
  // `contract-catalog/**` and `scripts/**` still passed: one literal segment, an entire tree.
  //
  // And the probe found one already declared and unnoticed — WP-0A-CON-007 amended
  // `contract-catalog/shared-kernel/**`, covering **705 files, the whole catalog**, including
  // ctr-ntf-001 which belongs to A5 and which that package never touched. It named a permission
  // rather than recording work. Replaced with the thirteen contract directories its own git range
  // shows it changed.
  const { validateManifestOwnership, AMENDMENT_BREADTH_CAP, OwnershipValidationError } =
    await import('../scripts/validate-work-package-ownership.mjs');
  const tree = [];
  for (let i = 0; i < 400; i += 1) tree.push(`contract-catalog/shared-kernel/ctr-${i}/schema.json`);
  for (let i = 0; i < 20; i += 1) tree.push(`evidence/WP-0A-CON-007/note-${i}.md`);
  const manifest = (paths) => ([{
    work_package_id: 'WP-T-001',
    ownership: {
      writable_paths: ['owned.txt'],
      read_only_paths: [],
      amends_without_owning: { paths, rationale: 'a reason long enough to be a reason and not a placeholder word' },
    },
    outputs: { files: ['owned.txt'] },
  }]);

  // Breadth in files, measured against a tree with no protected file in it so the two rules are
  // observed separately.
  assert.throws(() => validateManifestOwnership(manifest(['evidence/**']), [
    ...Array.from({ length: 400 }, (unused, i) => `evidence/WP-X/note-${i}.md`),
  ]),
  (error) => error instanceof OwnershipValidationError && error.code === 74 && /covers 400 files/.test(error.message),
  'a whole-tree amendment must be rejected even though it names a literal segment');
  assert.throws(() => validateManifestOwnership(manifest(['contract-catalog/shared-kernel/**']), tree), { code: 74 });

  // Breadth in PROTECTION, which the file cap does not measure: `scripts/**` covers fifteen
  // files and would pass the cap — and those fifteen are every guard in this repository.
  assert.throws(() => validateManifestOwnership(manifest(['scripts/**']), tree),
    (error) => error instanceof OwnershipValidationError && error.code === 74 && /protected file/.test(error.message),
    'a glob over a guard is a permission, not a record');
  assert.throws(() => validateManifestOwnership(manifest(['.agents/**']), tree), { code: 74 });
  assert.throws(() => validateManifestOwnership(manifest(['contract-catalog/**']), tree), { code: 74 });
  assert.doesNotThrow(() => validateManifestOwnership(manifest(['scripts/verify-branch-scope.mjs']), tree),
    'naming the protected file is exactly what the rule asks for');

  // Bounded ones still pass, which is what makes the cap a cap rather than a ban.
  assert.doesNotThrow(() => validateManifestOwnership(manifest(['evidence/WP-0A-CON-007/**']), tree));
  assert.doesNotThrow(() => validateManifestOwnership(manifest(['contract-catalog/shared-kernel/ctr-1/**']), tree));
  assert.ok(AMENDMENT_BREADTH_CAP >= 64 && AMENDMENT_BREADTH_CAP <= 256,
    'the cap is pinned so that widening it is a deliberate edit, not a quiet one');

  // Without a file list the FILE-COUNT check cannot run, and the pure form stays pure — the real
  // validator always supplies the tree. The protected-file rule needs no tree and still applies,
  // which is the more important half: it does not depend on being called the right way.
  assert.doesNotThrow(() => validateManifestOwnership(manifest(['evidence/**'])),
    'breadth in files is measured only where the tree is known');
  assert.throws(() => validateManifestOwnership(manifest(['scripts/**'])), { code: 74 },
    'the protected-file rule must not depend on the caller supplying a file list');
});

test('an amendment that explains nothing the branch changed is not a record', async () => {
  // The manifest validator caps how broad one pattern may be. Probing that cap found fourteen
  // narrow per-contract globs summing to the whole catalog, at exit 0 — a cap on breadth cannot
  // see intent. The diff can.
  //
  // On its first run against this very branch it named six standing declarations that explained
  // nothing, including `.agents/**` — four protected protocol schemas the package never touched.
  const { deadAmendments } = await import('../scripts/verify-branch-scope.mjs');
  const changed = [
    'contract-catalog/shared-kernel/ctr-api-001/schema.json',
    'scripts/verify-branch-scope.mjs',
  ];
  assert.deepEqual(deadAmendments(changed, ['contract-catalog/shared-kernel/ctr-api-001/**']), []);
  assert.deepEqual(deadAmendments(changed, ['scripts/verify-branch-scope.mjs']), []);
  assert.deepEqual(deadAmendments(changed, ['.agents/**']), ['.agents/**'],
    'a declaration matching none of the diff is a permission granted for work that never happened');
  assert.deepEqual(
    deadAmendments(changed, ['contract-catalog/shared-kernel/ctr-ntf-001/**', 'evidence/WP-0A-CON-007/**']),
    ['contract-catalog/shared-kernel/ctr-ntf-001/**', 'evidence/WP-0A-CON-007/**']);
  assert.deepEqual(deadAmendments([], []), [], 'a package amending nothing is not in violation');
});

test('a glob may not stand in for any file the integrity manifest digests', async () => {
  // PROTECTED_KEYS was the first shielded set, and `test-kits/contracts/**` passed straight
  // through it: under the file cap, none of its files in PROTECTED_KEYS, and every one of them a
  // ratchet this repository is made of.
  const { validateManifestOwnership } = await import('../scripts/validate-work-package-ownership.mjs');
  const digested = ['test-kits/contracts/catalog-registry.test.mjs', 'test-kits/branch-scope.test.mjs'];
  const manifest = (paths) => ([{
    work_package_id: 'WP-T-001',
    ownership: {
      writable_paths: ['owned.txt'],
      read_only_paths: [],
      amends_without_owning: { paths, rationale: 'a reason long enough to be a reason and not a placeholder word' },
    },
    outputs: { files: ['owned.txt'] },
  }]);
  assert.throws(() => validateManifestOwnership(manifest(['test-kits/contracts/**']), [], digested), { code: 74 });
  assert.doesNotThrow(() => validateManifestOwnership(manifest(['test-kits/contracts/catalog-registry.test.mjs']), [], digested),
    'naming the suite is what the rule asks for');
});

// Two guards disagreed about which declarations exist, and the disagreement was exploitable.
// verify-branch-scope.mjs was taught on 2026-09-04 to read `authorized_cross_package_amendments`
// -- the prose field six of fourteen packages use -- because for those six it had been reporting
// a conclusion it never reached. The independent reviewer of this package then showed the fix
// reopened review thirteen's `["**"]` defect on the field beside the one it closed: the scope
// guard honoured the prose field while validate-work-package-ownership.mjs, which enforces shape
// and breadth, still saw only the machine one. A single entry `"**/* — …"` made the scope guard
// report every path declared for a branch that gutted a guard script.
//
// The reviewer also found the fix was pinned by NOTHING: reverting the prose read left the suite
// byte-identical. These three tests are that pin.
test('the scope guard reads the prose amendment field, not only the machine one', () => {
  const manifest = {
    work_package_id: 'WP-TEST',
    ownership: {
      writable_paths: ['owned/**'],
      authorized_cross_package_amendments: ['other/thing.mjs (WP-OTHER output) - permitted change: a reason'],
    },
  };
  const declared = declaredPaths(manifest);
  assert.ok(declared.includes('other/thing.mjs'),
    'a package that records its cross-package write in prose must have that write seen; six of fourteen packages use only this field');
  assert.deepEqual(undeclared(['other/thing.mjs'], declared), [],
    'the guard must not report a path as undeclared against a manifest that authorises it');
});

test('an unparseable prose amendment stops the run instead of being skipped', () => {
  const shapes = [
    ['a note with no path at all'],
    [42],
    [''],
  ];
  for (const paths of shapes) {
    assert.throws(
      () => declaredPaths({ work_package_id: 'WP-TEST', ownership: { authorized_cross_package_amendments: paths } }),
      /authorized_cross_package_amendments/,
      `${JSON.stringify(paths)} must throw: skipping is how the hole formed, and a declaration the guard cannot read must not become silently declared`);
  }
});

test('the ownership validator sees the same field the scope guard now honours', async () => {
  const { validateManifestOwnership } = await import('../scripts/validate-work-package-ownership.mjs');
  const blanket = {
    work_package_id: 'WP-TEST',
    ownership: {
      writable_paths: ['owned/**'],
      read_only_paths: [],
      authorized_cross_package_amendments: ['**/* - blanket'],
    },
    outputs: { files: [] },
  };
  assert.throws(() => validateManifestOwnership([blanket]), /names no path at all/,
    'a prose entry that matches everything must be refused here too; a guard that reads a declaration and a validator that checks declarations must not disagree about which declarations exist');
});

// ---------------------------------------------------------------------------------------------
// THE NEGATIVE CONTROL'S SKIP RULE AND THE CHECKOUT ASSERTION (RFC-2026-007 §Amendment 2026-10-06).
//
// Both live in .github/workflows/ci.yml as shell, and a workflow cannot be run here. So the step
// bodies are CUT OUT OF THE WORKFLOW TEXT and run with bash the way GitHub runs a `run:` that names
// no shell (`bash -e {0}`, as the job log prints it; Q0 Q13 on PR #197 corrected an earlier
// `-eo pipefail` here), against throwaway git repositories. A test that held a
// copy of the script would be testing the copy; these read the file CI executes.
const CI_WORKFLOW_PATH = '.github/workflows/ci.yml';
const DECISION_STEP = 'Decide whether the negative control must run';
const CONTROL_STEP = 'Negative control - each table family must be detectable on its own';
const CHECKOUT_STEP = 'Verify the checkout is the commit this run reports on';

function stepBlock(workflow, name) {
  const lines = workflow.split('\n');
  const start = lines.findIndex((line) => line.trim() === `- name: ${name}`);
  assert.ok(start >= 0, `ci.yml has no step named "${name}"`);
  const indent = lines[start].indexOf('-');
  let end = start + 1;
  while (end < lines.length && (lines[end].trim() === '' || lines[end].search(/\S/) > indent)) end += 1;
  return { start, lines: lines.slice(start, end) };
}

function runBody(block) {
  const at = block.lines.findIndex((line) => /^\s*run: \|\s*$/.test(line));
  assert.ok(at >= 0, `step "${block.lines[0].trim()}" has no block run:`);
  const indent = block.lines[at].search(/\S/);
  const body = [];
  for (const line of block.lines.slice(at + 1)) {
    if (line.trim() !== '' && line.search(/\S/) <= indent) break;
    body.push(line);
  }
  const margin = Math.min(...body.filter((l) => l.trim() !== '').map((l) => l.search(/\S/)));
  return body.map((l) => l.slice(margin)).join('\n');
}

function envValue(block, key) {
  const line = block.lines.find((l) => new RegExp(`^\\s*${key}: `).test(l));
  assert.ok(line, `step "${block.lines[0].trim()}" sets no ${key}`);
  const raw = line.replace(new RegExp(`^\\s*${key}: `), '').trim();
  return raw.startsWith("'") ? raw.slice(1, -1).replaceAll("''", "'") : raw;
}

async function runStep(body, env, cwd) {
  const { spawnSync } = await import('node:child_process');
  const { mkdtemp, writeFile, readFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = await mkdtemp(join(tmpdir(), 'ci-step-'));
  const script = join(dir, 'step.sh');
  const output = join(dir, 'github-output');
  await writeFile(script, body);
  await writeFile(output, '');
  const result = spawnSync('bash', ['--noprofile', '--norc', '-e', script], {
    cwd, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: process.env.HOME, GITHUB_OUTPUT: output, ...env },
  });
  return { code: result.status, out: `${result.stdout}${result.stderr}`, output: await readFile(output, 'utf8') };
}

async function scratchRepo() {
  const { spawnSync } = await import('node:child_process');
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join, dirname } = await import('node:path');
  const repo = await mkdtemp(join(tmpdir(), 'ci-skip-'));
  const git = (...args) => {
    const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
    assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  };
  git('init', '-q', '-b', 'main');
  // Assembled rather than written out: the repository's own secret scanner reports a literal address.
  git('config', 'user.email', ['ci-skip-test', 'example.invalid'].join('@'));
  git('config', 'user.name', 'ci skip test');
  git('config', 'commit.gpgsign', 'false');
  const put = async (path, text) => {
    await mkdir(join(repo, dirname(path)), { recursive: true });
    await writeFile(join(repo, path), text);
  };
  for (const path of ['docs/readme.md', 'db/foundation/migrations/000_x.sql', 'scripts/db/run.mjs', 'tests/db/identity/c.mjs',
    'test-kits/db/t.test.mjs', '.github/workflows/ci.yml', 'Makefile', 'package.json', 'package-lock.json', '.node-version',
    'evidence/WP-X/notes.md', 'scripts/other.mjs', 'test-kits/other.test.mjs', 'contract-catalog/x.json']) await put(path, 'base\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  const base = git('rev-parse', 'HEAD');
  return { repo, base, git, put, remove: (path) => rm(join(repo, path)) };
}

async function decide(change) {
  const { readFile } = await import('node:fs/promises');
  const block = stepBlock(await readFile(CI_WORKFLOW_PATH, 'utf8'), DECISION_STEP);
  const { repo, base, git, put, remove } = await scratchRepo();
  await change({ put, git, remove });
  git('add', '-A');
  git('commit', '-q', '--allow-empty', '-m', 'head');
  return runStep(runBody(block), { BASE_REF: 'main', BASE_SHA: base, DB_SURFACE: envValue(block, 'DB_SURFACE') }, repo);
}

test('the negative control is skipped only on an explicit skip=true from a pull-request-only step', async () => {
  const { readFile } = await import('node:fs/promises');
  const workflow = await readFile(CI_WORKFLOW_PATH, 'utf8');
  const decision = stepBlock(workflow, DECISION_STEP);
  const control = stepBlock(workflow, CONTROL_STEP);
  const text = (block) => block.lines.join('\n');

  assert.match(text(decision), /^\s*id: db_surface$/m);
  // On a push to main the step does not run, its output is unset, and the control RUNS. The same on
  // a pull request into any branch but main: the skip inherits the base's result, and only a base on
  // main is known to have run the control (A1 F2, C0 F3, R0-F4 on PR #197).
  assert.match(text(decision),
    /^\s*if: github\.event_name == 'pull_request' && github\.event\.pull_request\.base\.ref == 'main'$/m);
  assert.doesNotMatch(text(decision), /continue-on-error/,
    'a decision step allowed to fail would turn a failure into whatever its partial output says');
  assert.ok(decision.start < control.start, 'the decision must be taken before the control it governs');

  // Fail closed: the comparison is != 'true', so an unset, empty or unexpected value runs the control.
  // `== 'false'` would skip on every value nobody anticipated.
  const conditions = control.lines.filter((l) => /^\s*if: /.test(l)).map((l) => l.trim());
  assert.deepEqual(conditions, ["if: steps.db_surface.outputs.skip != 'true'"]);
  const code = workflow.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  assert.equal([...code.matchAll(/skip=true/g)].length, 1, 'exactly one line may write skip=true');
  assert.equal([...code.matchAll(/GITHUB_OUTPUT/g)].length, 1, 'exactly one line may write a step output');
  assert.equal([...code.matchAll(/steps\.db_surface\.outputs/g)].length, 1, 'only the control reads the decision');
  // And that one line is the decision step's last, after every path that RUNS the control has exited.
  const body = runBody(decision).trimEnd().split('\n');
  assert.equal(body.at(-1).trim(), 'echo "skip=true" >> "${GITHUB_OUTPUT}"');

  // A skipped STEP, never a skipped job: the required check `bootstrap` must report on every PR.
  const job = workflow.slice(workflow.indexOf('  bootstrap:'), workflow.indexOf('    steps:'));
  assert.ok(job.length > 0);
  assert.doesNotMatch(job, /^\s{4}if:/m, 'the bootstrap job must carry no job-level condition');
});

test('a pull request that changes nothing on the database surface skips the negative control', async () => {
  const result = await decide(async ({ put }) => {
    await put('docs/readme.md', 'changed\n');
    await put('evidence/WP-X/notes.md', 'changed\n');
    await put('scripts/other.mjs', 'changed\n');
    await put('test-kits/other.test.mjs', 'changed\n');
    await put('contract-catalog/x.json', 'changed\n');
    await put('handoffs/new.json', 'new\n');
  });
  assert.equal(result.code, 0, result.out);
  assert.equal(result.output.trim(), 'skip=true', result.out);
  assert.match(result.out, /the control is SKIPPED/);
});

test('every path on the database surface makes the negative control run, including a move off it', async () => {
  const onSurface = ['db/foundation/migrations/000_x.sql', 'db/foundation/new.sql', 'scripts/db/run.mjs', 'tests/db/identity/c.mjs',
    'test-kits/db/t.test.mjs', '.github/workflows/ci.yml', 'Makefile', 'package.json', 'package-lock.json', '.node-version',
    // GNU make reads GNUmakefile, then makefile, before Makefile (A1 F1 on PR #197).
    'GNUmakefile', 'makefile',
    // A .gitattributes anywhere can rewrite the bytes checked out on the surface (A1 F3).
    '.gitattributes', 'scripts/.gitattributes'];
  for (const path of onSurface) {
    const result = await decide(async ({ put }) => {
      await put('docs/readme.md', 'changed\n');
      await put(path, 'changed\n');
    });
    assert.equal(result.code, 0, `${path}: ${result.out}`);
    assert.equal(result.output, '', `${path} changed and the control was told to skip: ${result.out}`);
    assert.match(result.out, /the control RUNS/, path);
  }
  // A rename prints only its destination unless renames are off. Moving a fixture out of tests/db/
  // must still name tests/db/, or the move that changes what the control loads is the one it skips.
  const moved = await decide(async ({ git }) => { git('mv', 'tests/db/identity/c.mjs', 'docs/c.mjs'); });
  assert.equal(moved.output, '', `a file moved off the surface skipped the control: ${moved.out}`);
  const deleted = await decide(async ({ remove }) => { await remove('db/foundation/migrations/000_x.sql'); });
  assert.equal(deleted.output, '', `a deleted migration skipped the control: ${deleted.out}`);
  // A prefix, not a substring: `db/` deeper in a path is not the surface, and a file named Makefile
  // in a subdirectory is not the Makefile.
  const near = await decide(async ({ put }) => {
    await put('docs/db/notes.md', 'x\n');
    await put('docs/Makefile', 'x\n');
  });
  assert.equal(near.output.trim(), 'skip=true', near.out);
});

test('when the diff cannot be computed the negative control runs', async () => {
  const { readFile, mkdtemp } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const block = stepBlock(await readFile(CI_WORKFLOW_PATH, 'utf8'), DECISION_STEP);
  const body = runBody(block);
  const DB_SURFACE = envValue(block, 'DB_SURFACE');
  const { repo, base } = await scratchRepo();
  const cases = [
    ['an empty base', { BASE_REF: 'main', BASE_SHA: '', DB_SURFACE }, repo],
    ['a base that is not in the clone', { BASE_REF: 'main', BASE_SHA: 'f'.repeat(40), DB_SURFACE }, repo],
    ['a base that is not a commit', { BASE_REF: 'main', BASE_SHA: 'not-a-ref', DB_SURFACE }, repo],
    ['no repository at all', { BASE_REF: 'main', BASE_SHA: 'f'.repeat(40), DB_SURFACE }, await mkdtemp(join(tmpdir(), 'ci-norepo-'))],
    // grep exits 2 on a malformed pattern. That is neither "matched" nor "matched nothing".
    ['a pattern grep cannot compile', { BASE_REF: 'main', BASE_SHA: base, DB_SURFACE: '(' }, repo],
  ];
  for (const [what, env, cwd] of cases) {
    const result = await runStep(body, env, cwd);
    assert.equal(result.code, 0, `${what}: the step must not fail the job -- ${result.out}`);
    assert.equal(result.output, '', `${what}: the control was told to skip -- ${result.out}`);
    assert.match(result.out, /the control RUNS/, what);
  }
});

test('every repository path the negative control can read is on DB_SURFACE, measured from the code', async () => {
  // The skip rule is only as good as its path set. This walks what the control actually reads and
  // fails if any of it falls outside DB_SURFACE: a new import from scripts/db/ into, say,
  // scripts/lib/ would otherwise let a later edit to scripts/lib/ change the control's outcome on a
  // pull request that skips it.
  const { readFile } = await import('node:fs/promises');
  const { existsSync, statSync } = await import('node:fs');
  const { dirname, join, normalize } = await import('node:path');
  const workflow = await readFile(CI_WORKFLOW_PATH, 'utf8');
  const surface = new RegExp(envValue(stepBlock(workflow, DECISION_STEP), 'DB_SURFACE'));

  const read = new Set([CI_WORKFLOW_PATH, 'Makefile']);
  // The two database steps: the one that loads the container and the control itself.
  for (const name of ['Database foundation', CONTROL_STEP]) {
    const body = runBody(stepBlock(workflow, name));
    assert.match(body, /make db-/, `"${name}" runs no make target; this test no longer measures that step`);
    for (const m of body.matchAll(/(?:^|\s)((?:db|scripts|tests|test-kits)\/[\w./-]+)/g)) read.add(m[1]);
  }
  // make, then the Makefile's DB command, then its module graph and every literal repository path it names.
  const makefile = await readFile('Makefile', 'utf8');
  const entry = makefile.match(/^DB := node (\S+)$/m);
  assert.ok(entry, 'the Makefile no longer names its database entry point as `DB := node <script>`');
  const queue = [entry[1]];
  const modules = new Set();
  while (queue.length > 0) {
    const file = queue.pop();
    if (modules.has(file)) continue;
    modules.add(file);
    read.add(file);
    const source = await readFile(file, 'utf8');
    for (const m of source.matchAll(/(?:from\s+|import\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      queue.push(normalize(join(dirname(file), m[1])));
    }
    const literal = /['"`]((?:\.\.\/)+[\w./-]+|(?:db|scripts|tests|test-kits|contract-catalog|evidence|work-packages|docs|architecture|handoffs|\.github)\/[\w./-]*)['"`]/g;
    for (const m of source.matchAll(literal)) {
      const path = m[1].startsWith('../') ? normalize(join(dirname(file), m[1])) : m[1];
      read.add(path.replace(/\/$/, ''));
    }
    // A script named by path and spawned rather than imported (run.mjs starts rls-smoke.mjs that way).
    for (const m of source.matchAll(/['"]((?:scripts|tests)\/[\w./-]+\.mjs)['"]/g)) queue.push(m[1]);
  }
  // The walk must reach what the control is known to read, or it is measuring nothing.
  for (const known of ['scripts/db/rls-smoke.mjs', 'scripts/db/authz-proofs.mjs', 'scripts/db/psql-driver.mjs',
    'tests/db/identity/run-isolation.mjs', 'tests/db/identity/isolation-cases.mjs', 'db/foundation/test-helpers/rls-assertions.mjs',
    'db/foundation/test-helpers/auth-context.sql', 'db/foundation/ci/supabase-shim.sql', 'db/foundation/migrations',
    'db/foundation/prerequisites.sql', 'db/foundation/seeds/fixture-catalog.json']) {
    assert.ok(read.has(known), `the measured closure no longer reaches ${known}; the walk is broken, not the code`);
  }
  const { FIXTURE_SQL_FILES } = await import('../tests/db/identity/run-isolation.mjs');
  for (const fixture of FIXTURE_SQL_FILES) read.add(fixture);

  const existing = [...read].filter((path) => existsSync(path));
  assert.ok(existing.length >= 40, `only ${existing.length} paths measured`);
  const off = existing.filter((path) => !surface.test(statSync(path).isDirectory() ? `${path}/` : path));
  assert.deepEqual(off, [], `the negative control reads ${off.join(', ')}, which DB_SURFACE does not cover. `
    + 'A pull request changing only that path would skip the control while changing its outcome. Widen DB_SURFACE in '
    + 'ci.yml and RFC-2026-007 §Amendment together.');
});

test('the checkout is asserted to be the commit the run reports on, and anything else fails the job', async () => {
  const { readFile } = await import('node:fs/promises');
  const workflow = await readFile(CI_WORKFLOW_PATH, 'utf8');
  const step = stepBlock(workflow, CHECKOUT_STEP);
  const checkout = workflow.indexOf('uses: actions/checkout@');
  const setupNode = workflow.indexOf('uses: actions/setup-node@');
  const at = workflow.indexOf(`- name: ${CHECKOUT_STEP}`);
  assert.ok(checkout < at && at < setupNode, 'the assertion must run straight after the checkout, before anything is tested');
  assert.doesNotMatch(step.lines.join('\n'), /^\s*if: /m, 'it must hold on every event, pull request and push alike');
  assert.doesNotMatch(step.lines.join('\n'), /continue-on-error/);
  assert.equal(envValue(step, 'EXPECTED_SHA'), '${{ github.event.pull_request.head.sha || github.sha }}');

  const body = runBody(step);
  const { repo, git } = await scratchRepo();
  const head = git('rev-parse', 'HEAD');
  assert.equal((await runStep(body, { EXPECTED_SHA: head }, repo)).code, 0);
  const moved = await runStep(body, { EXPECTED_SHA: 'a'.repeat(40) }, repo);
  assert.equal(moved.code, 1, `a branch that moved after the event must fail the job: ${moved.out}`);
  assert.match(moved.out, /cannot report on a commit it did not test/);
  assert.equal((await runStep(body, { EXPECTED_SHA: '' }, repo)).code, 1, 'an empty expectation asserts nothing and must fail');
});

test('a path git would quote still makes the negative control run (C0 F1, A1 F4, Q0 Q10, R0-F1 on PR #197)', async () => {
  // Without -z, git prints these as "db/..." with a leading quote, and the anchored pattern misses them.
  const quoted = ['db/foundation/migrations/0002_ข้อมูล.sql', 'db/foundation/migrations/0003_a"b.sql',
    'db/foundation/migrations/0004_a\\b.sql', 'db/foundation/migrations/0005_a\tb.sql', 'db/foundation/migrations/0006_a\nb.sql',
    'tests/db/identity/fixtures/ชื่อ.sql'];
  for (const path of quoted) {
    const result = await decide(async ({ put }) => {
      await put('docs/readme.md', 'changed\n');
      await put(path, 'new\n');
    });
    assert.equal(result.code, 0, `${JSON.stringify(path)}: ${result.out}`);
    assert.equal(result.output, '', `${JSON.stringify(path)} changed and the control was told to skip: ${result.out}`);
    assert.match(result.out, /the database surface changed; the control RUNS/, JSON.stringify(path));
  }
  // And a quoted path OFF the surface still skips: -z must not turn every unusual name into a run.
  const off = await decide(async ({ put }) => { await put('docs/บันทึก "x".md', 'new\n'); });
  assert.equal(off.output.trim(), 'skip=true', off.out);
});

test('a symlink in either tree makes the negative control run (A1 F3 on PR #197)', async () => {
  const { readFile } = await import('node:fs/promises');
  const { symlink } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const block = stepBlock(await readFile(CI_WORKFLOW_PATH, 'utf8'), DECISION_STEP);
  const env = (BASE_SHA) => ({ BASE_REF: 'main', BASE_SHA, DB_SURFACE: envValue(block, 'DB_SURFACE') });

  // A link on the surface pointing off it: only the target changes, and no surface path is in the diff.
  {
    const { repo, git, put } = await scratchRepo();
    await put('docs/target.sql', 'one\n');
    await symlink('../../docs/target.sql', join(repo, 'db/foundation/linked.sql'));
    git('add', '-A');
    git('commit', '-q', '-m', 'base with a link');
    const base = git('rev-parse', 'HEAD');
    await put('docs/target.sql', 'two\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'head changes only the target');
    assert.equal(git('diff', '--name-only', base, 'HEAD'), 'docs/target.sql', 'the case must change no surface path');
    const result = await runStep(runBody(block), env(base), repo);
    assert.equal(result.code, 0, result.out);
    assert.equal(result.output, '', `a link on the surface read a changed file and the control was told to skip: ${result.out}`);
    assert.match(result.out, /symlink.*the control RUNS/);
  }
  // A link added off the surface: it is not on DB_SURFACE, and the step still runs the control.
  {
    const { repo, base, git } = await scratchRepo();
    await symlink('readme.md', join(repo, 'docs/link.md'));
    git('add', '-A');
    git('commit', '-q', '-m', 'head adds a link');
    const result = await runStep(runBody(block), env(base), repo);
    assert.equal(result.output, '', result.out);
    assert.match(result.out, /symlink.*the control RUNS/);
  }
  // A link only in the BASE tree, removed by the head: the head tree holds none, so only listing the
  // base catches it. A link that existed at the base could have pointed the base's control elsewhere.
  {
    const { repo, git, remove } = await scratchRepo();
    await symlink('readme.md', join(repo, 'docs/link.md'));
    git('add', '-A');
    git('commit', '-q', '-m', 'base with a link');
    const base = git('rev-parse', 'HEAD');
    await remove('docs/link.md');
    git('add', '-A');
    git('commit', '-q', '-m', 'head removes the link');
    assert.equal(git('ls-tree', '-r', 'HEAD').includes('120000 '), false, 'the head must hold no link');
    const result = await runStep(runBody(block), env(base), repo);
    assert.equal(result.output, '', result.out);
    assert.match(result.out, /symlink.*the control RUNS/);
  }
});

test('the diff is tree to tree: a branch behind main is compared with what main holds now (Q0 Q11, R0-F3 on PR #197)', async () => {
  // main moves on with a migration; the branch, cut before it, changes only docs. A three-dot diff
  // (merge base) sees only docs and would skip; the base's tree and the head's tree differ on db/.
  const { readFile } = await import('node:fs/promises');
  const block = stepBlock(await readFile(CI_WORKFLOW_PATH, 'utf8'), DECISION_STEP);
  const { repo, base: forkPoint, git, put } = await scratchRepo();
  await put('db/foundation/migrations/000_x.sql', 'main moved\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'main changes a migration');
  const mainNow = git('rev-parse', 'HEAD');
  git('checkout', '-q', '-b', 'feature', forkPoint);
  await put('docs/readme.md', 'feature\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'feature changes docs only');
  assert.equal(git('diff', '--name-only', `${mainNow}...HEAD`), 'docs/readme.md', 'the case must be one a three-dot diff would skip');
  const result = await runStep(runBody(block), { BASE_REF: 'main', BASE_SHA: mainNow, DB_SURFACE: envValue(block, 'DB_SURFACE') }, repo);
  assert.equal(result.code, 0, result.out);
  assert.equal(result.output, '', `a branch behind a main that changed db/ was told to skip: ${result.out}`);
  assert.match(result.out, /the database surface changed; the control RUNS/);
});

test('a base commit whose tree git cannot read runs the negative control from the diff branch (R0-F2 on PR #197)', async () => {
  // The commit object exists, so the first check passes; its tree is gone, so git diff exits 128.
  // This is the only case that reaches the `if ! git ... diff` clause; without it `|| true` there survives.
  const { readFile, rm } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const block = stepBlock(await readFile(CI_WORKFLOW_PATH, 'utf8'), DECISION_STEP);
  const { repo, base, git, put } = await scratchRepo();
  await put('docs/readme.md', 'changed\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'head');
  const tree = git('rev-parse', `${base}^{tree}`);
  await rm(join(repo, '.git', 'objects', tree.slice(0, 2), tree.slice(2)));
  assert.equal(git('cat-file', '-t', base), 'commit', 'the base commit itself must still be readable');
  const result = await runStep(runBody(block), { BASE_REF: 'main', BASE_SHA: base, DB_SURFACE: envValue(block, 'DB_SURFACE') }, repo);
  assert.equal(result.code, 0, `the step must not fail the job: ${result.out}`);
  assert.equal(result.output, '', result.out);
  assert.match(result.out, /could not be computed; the control RUNS/);
});

test('a base that is not exactly main runs the negative control, whatever its case (A1 N1 on PR #197)', async () => {
  // Actions compares `if:` strings ignoring case, so `base.ref == 'main'` is also true for a pull request
  // into `MAIN` or `Main`, a branch no push to main ever checked. The case-sensitive check is bash's, the
  // first test the step makes, and it must come before any path can write skip=true.
  const { readFile } = await import('node:fs/promises');
  const block = stepBlock(await readFile(CI_WORKFLOW_PATH, 'utf8'), DECISION_STEP);
  assert.equal(envValue(block, 'BASE_REF'), '${{ github.event.pull_request.base.ref }}');
  const body = runBody(block).split('\n');
  assert.deepEqual(body.slice(0, 4), [
    'if [ "${BASE_REF:-}" != main ]; then',
    '  echo "negative control: the base branch \'${BASE_REF:-}\' is not exactly main; the control RUNS"',
    '  exit 0',
    'fi',
  ]);

  // The same pull request each time, changing nothing on the surface: only the base branch differs.
  const { repo, base, git, put } = await scratchRepo();
  await put('docs/readme.md', 'changed\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'head');
  const DB_SURFACE = envValue(block, 'DB_SURFACE');
  for (const ref of ['MAIN', 'Main', 'mAiN', 'main2', 'main ', 'refs/heads/main', '']) {
    const result = await runStep(runBody(block), { BASE_REF: ref, BASE_SHA: base, DB_SURFACE }, repo);
    assert.equal(result.code, 0, `${JSON.stringify(ref)}: the step must not fail the job -- ${result.out}`);
    assert.equal(result.output, '', `${JSON.stringify(ref)}: a base that is not main was told to skip -- ${result.out}`);
    assert.match(result.out, /is not exactly main; the control RUNS/, JSON.stringify(ref));
  }
  const unset = await runStep(runBody(block), { BASE_SHA: base, DB_SURFACE }, repo);
  assert.equal(unset.output, '', `an unset base branch was told to skip: ${unset.out}`);
  assert.match(unset.out, /is not exactly main; the control RUNS/);
  // And `main` itself may still skip: the guard must not turn every pull request into a run.
  const main = await runStep(runBody(block), { BASE_REF: 'main', BASE_SHA: base, DB_SURFACE }, repo);
  assert.equal(main.code, 0, main.out);
  assert.equal(main.output.trim(), 'skip=true', main.out);
  assert.match(main.out, /the control is SKIPPED/);
});

// THE RECORDS-ONLY CLASSIFICATION STEP (RFC-2026-025 §6.6 item 1; RFC-2026-007 Amendment 2026-10-08). Pinned the way
// the decision step above is: its body is cut out of ci.yml and run with `bash -e` against throwaway repositories
// that hold a copy of the real classifier in their base commit. What is pinned: it gates nothing (exit 0 on every
// path, no step output, nothing reads it), it fails closed (RECORDS-ONLY only on the classifier's exit 0), and it
// runs the BASE's classifier before any of the pull request's own code runs.
const CLASSIFY_STEP = 'Classify the pull request for the records-only light path (informational, gates nothing)';
const CLASSIFIER = 'scripts/db/classify-records-only.mjs';

async function recordsRepo() {
  const { readFile } = await import('node:fs/promises');
  const scratch = await scratchRepo();
  await scratch.put(CLASSIFIER, await readFile(CLASSIFIER, 'utf8'));
  await scratch.put('evidence/WP-X/session-2026-10-01.md', 'first\n');
  scratch.git('add', '-A');
  scratch.git('commit', '-q', '-m', 'base with the classifier');
  return { ...scratch, base: scratch.git('rev-parse', 'HEAD') };
}

function commitHead(git) {
  git('add', '-A');
  git('commit', '-q', '--allow-empty', '-m', 'head');
}

async function classify(env, cwd) {
  const { readFile, mkdtemp } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const block = stepBlock(await readFile(CI_WORKFLOW_PATH, 'utf8'), CLASSIFY_STEP);
  const summary = join(await mkdtemp(join(tmpdir(), 'ci-summary-')), 'summary.md');
  const result = await runStep(runBody(block), { GITHUB_STEP_SUMMARY: summary, ...env }, cwd);
  let text = '';
  try { text = await readFile(summary, 'utf8'); } catch { text = ''; }
  return { ...result, summary: text };
}

function assertVerdict(result, verdict, what) {
  assert.equal(result.code, 0, `${what}: the step must never fail the job -- ${result.out}`);
  assert.equal(result.output, '', `${what}: the step must write no step output -- ${result.out}`);
  assert.match(result.out, new RegExp(`^records-only classifier: ${verdict} -- `, 'm'), `${what}: ${result.out}`);
  assert.ok(result.summary.includes(`(RFC-2026-025 §6.1): ${verdict}\n`), `${what}: the job summary does not carry ${verdict}: ${result.summary}`);
  assert.match(result.summary, /gates nothing/, what);
}

test('the records-only classification step gates nothing and runs the base classifier before the pull request code', async () => {
  const { readFile } = await import('node:fs/promises');
  const workflow = await readFile(CI_WORKFLOW_PATH, 'utf8');
  const step = stepBlock(workflow, CLASSIFY_STEP);
  const text = step.lines.join('\n');
  assert.deepEqual(step.lines.filter((l) => /^\s*if: /.test(l)).map((l) => l.trim()), ["if: github.event_name == 'pull_request'"]);
  assert.doesNotMatch(text, /^\s*id: /m, 'no id: nothing may read this step');
  assert.doesNotMatch(text, /continue-on-error/);
  assert.equal(envValue(step, 'BASE_REF'), '${{ github.event.pull_request.base.ref }}');
  assert.equal(envValue(step, 'BASE_SHA'), '${{ github.event.pull_request.base.sha }}');

  const body = runBody(step);
  assert.doesNotMatch(body, /GITHUB_OUTPUT|GITHUB_ENV|GITHUB_PATH/, 'it may write the log and the job summary, nothing a later step reads');
  assert.deepEqual([...body.matchAll(/\bexit\b\s*(\S*)/g)].map((m) => m[1]), ['0'], 'its one exit is exit 0');
  assert.equal([...body.matchAll(/report "RECORDS-ONLY"/g)].length, 1, 'one path prints RECORDS-ONLY');
  assert.match(body, /node "\$\{work\}\/classify-records-only\.mjs" "\$\{BASE_SHA\}" HEAD/);
  assert.match(body, /git show "\$\{BASE_SHA\}:scripts\/db\/classify-records-only\.mjs"/);
  assert.doesNotMatch(body, /node scripts\/db\/classify-records-only\.mjs/, "the pull request's own classifier must not be its judge");

  // Before the first step that executes the pull request's own code, after the checkout assertion and the toolchain.
  const at = workflow.indexOf(`- name: ${CLASSIFY_STEP}`);
  assert.ok(workflow.indexOf(`- name: ${CHECKOUT_STEP}`) < at);
  assert.ok(workflow.indexOf('- name: Verify pinned toolchain') < at);
  assert.ok(at < workflow.indexOf('run: npm ci --ignore-scripts'), 'it must run before npm ci');
  assert.ok(at < workflow.indexOf('run: npm run check'), 'it must run before npm run check');
});

test('a records-only pull request is classified RECORDS-ONLY, with the classifier output for the reader', async () => {
  const { repo, base, git, put } = await recordsRepo();
  await put('evidence/WP-X/session-2026-10-08.md', 'a session record\n');
  await put('evidence/WP-X/session-2026-10-01.md', 'first\nappended\n');
  await put('handoffs/WP-X-author-handoff.json', '{}\n');
  commitHead(git);
  const result = await classify({ BASE_REF: 'main', BASE_SHA: base }, repo);
  assertVerdict(result, 'RECORDS-ONLY', 'records only');
  assert.match(result.out, /^ {2}records-only: all 3 changed path\(s\) are records/m);
  assert.match(result.summary, /<pre>\nrecords-only: all 3 changed path\(s\)/);
});

test('a pull request that changes code is classified NOT RECORDS-ONLY, with the classifier reasons', async () => {
  const { repo, base, git, put } = await recordsRepo();
  await put('evidence/WP-X/session-2026-10-08.md', 'a session record\n');
  await put('scripts/other.mjs', 'changed\n');
  commitHead(git);
  const result = await classify({ BASE_REF: 'main', BASE_SHA: base }, repo);
  assertVerdict(result, 'NOT RECORDS-ONLY', 'a code change');
  assert.match(result.out, /exited 1 on/);
  assert.match(result.out, /scripts\/other\.mjs: outside evidence/);
  // A rewritten record and an Owner disposition are not records either; the base's classifier says why.
  const second = await recordsRepo();
  await second.put('evidence/WP-X/session-2026-10-01.md', 'rewritten\n');
  await second.put('evidence/WP-X/product-owner-disposition-2026-10-08.md', 'x\n');
  commitHead(second.git);
  const rewritten = await classify({ BASE_REF: 'main', BASE_SHA: second.base }, second.repo);
  assertVerdict(rewritten, 'NOT RECORDS-ONLY', 'a rewritten record');
  assert.match(rewritten.out, /rewritten, not appended to/);
  assert.match(rewritten.out, /product-owner-disposition-2026-10-08\.md: not a record file/);
});

test('a pull request that edits the classifier is judged by the base copy, not its own', async () => {
  const { repo, base, git, put } = await recordsRepo();
  await put(CLASSIFIER, "console.log('records-only: all 1 changed path(s) are records (forged).');\n");
  await put('scripts/other.mjs', 'changed\n');
  commitHead(git);
  const result = await classify({ BASE_REF: 'main', BASE_SHA: base }, repo);
  assertVerdict(result, 'NOT RECORDS-ONLY', 'an edited classifier');
  assert.match(result.out, /scripts\/db\/classify-records-only\.mjs: outside evidence/);
  assert.doesNotMatch(result.out, /forged/);
});

test('when the diff cannot be classified the step prints NOT RECORDS-ONLY and still exits 0', async () => {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { repo, base, git, put } = await recordsRepo();
  await put('evidence/WP-X/session-2026-10-01.md', 'first\nappended\n');
  commitHead(git);
  const plain = await scratchRepo();
  commitHead(plain.git);
  const cases = [
    ['an empty base', { BASE_REF: 'main', BASE_SHA: '' }, repo, /is not in this clone/],
    ['a base that is not in the clone', { BASE_REF: 'main', BASE_SHA: 'f'.repeat(40) }, repo, /is not in this clone/],
    ['a base that is not a commit', { BASE_REF: 'main', BASE_SHA: 'not-a-ref' }, repo, /is not in this clone/],
    ['no repository at all', { BASE_REF: 'main', BASE_SHA: base }, await mkdtemp(join(tmpdir(), 'ci-norepo-')), /is not in this clone/],
    ['a base holding no classifier', { BASE_REF: 'main', BASE_SHA: plain.base }, plain.repo, /holds no readable/],
  ];
  for (const [what, env, cwd, why] of cases) {
    const result = await classify(env, cwd);
    assertVerdict(result, 'NOT RECORDS-ONLY', what);
    assert.match(result.out, why, what);
  }

  // A base with no history in common with the head: the classifier's merge-base fails (exit 2), not a verdict.
  git('checkout', '-q', '--orphan', 'unrelated');
  await put('docs/readme.md', 'unrelated\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'unrelated');
  const unrelated = git('rev-parse', 'HEAD');
  git('checkout', '-q', 'main');
  const noBase = await classify({ BASE_REF: 'main', BASE_SHA: unrelated }, repo);
  assertVerdict(noBase, 'NOT RECORDS-ONLY', 'no merge base');
  assert.match(noBase.out, /exited 2 on .*which is not a classification/);

  // A blob the classifier must read is gone: the appended record cannot be compared with its base (exit 2).
  const blob = git('rev-parse', 'HEAD:evidence/WP-X/session-2026-10-01.md');
  await rm(join(repo, '.git', 'objects', blob.slice(0, 2), blob.slice(2)));
  const noBlob = await classify({ BASE_REF: 'main', BASE_SHA: base }, repo);
  assertVerdict(noBlob, 'NOT RECORDS-ONLY', 'a missing blob');
  assert.match(noBlob.out, /exited 2 on .*which is not a classification/);
});

test('a records-only pull request into a base that is not exactly main is NOT RECORDS-ONLY', async () => {
  const { repo, base, git, put } = await recordsRepo();
  await put('evidence/WP-X/session-2026-10-08.md', 'a session record\n');
  commitHead(git);
  for (const ref of ['MAIN', 'Main', 'main2', 'main ', 'refs/heads/main', 'release', '']) {
    const result = await classify({ BASE_REF: ref, BASE_SHA: base }, repo);
    assertVerdict(result, 'NOT RECORDS-ONLY', JSON.stringify(ref));
    assert.match(result.out, /is not exactly main/, JSON.stringify(ref));
  }
  const unset = await classify({ BASE_SHA: base }, repo);
  assertVerdict(unset, 'NOT RECORDS-ONLY', 'an unset base branch');
  // And the same diff into main is records-only: the guard must not make every pull request NOT.
  assertVerdict(await classify({ BASE_REF: 'main', BASE_SHA: base }, repo), 'RECORDS-ONLY', 'main');
  // With no job summary at all, the log still carries the verdict and the step still exits 0.
  const { readFile } = await import('node:fs/promises');
  const block = stepBlock(await readFile(CI_WORKFLOW_PATH, 'utf8'), CLASSIFY_STEP);
  const bare = await runStep(runBody(block), { BASE_REF: 'main', BASE_SHA: base }, repo);
  assert.equal(bare.code, 0, bare.out);
  assert.match(bare.out, /^records-only classifier: RECORDS-ONLY -- /m);
});
