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
// bodies are CUT OUT OF THE WORKFLOW TEXT and run with bash the way GitHub runs them
// (`bash --noprofile --norc -eo pipefail`), against throwaway git repositories. A test that held a
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
  const result = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', script], {
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
  return runStep(runBody(block), { BASE_SHA: base, DB_SURFACE: envValue(block, 'DB_SURFACE') }, repo);
}

test('the negative control is skipped only on an explicit skip=true from a pull-request-only step', async () => {
  const { readFile } = await import('node:fs/promises');
  const workflow = await readFile(CI_WORKFLOW_PATH, 'utf8');
  const decision = stepBlock(workflow, DECISION_STEP);
  const control = stepBlock(workflow, CONTROL_STEP);
  const text = (block) => block.lines.join('\n');

  assert.match(text(decision), /^\s*id: db_surface$/m);
  // On a push to main the step does not run, its output is unset, and the control RUNS.
  assert.match(text(decision), /^\s*if: github\.event_name == 'pull_request'$/m);
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
    'test-kits/db/t.test.mjs', '.github/workflows/ci.yml', 'Makefile', 'package.json', 'package-lock.json', '.node-version'];
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
    ['an empty base', { BASE_SHA: '', DB_SURFACE }, repo],
    ['a base that is not in the clone', { BASE_SHA: 'f'.repeat(40), DB_SURFACE }, repo],
    ['a base that is not a commit', { BASE_SHA: 'not-a-ref', DB_SURFACE }, repo],
    ['no repository at all', { BASE_SHA: 'f'.repeat(40), DB_SURFACE }, await mkdtemp(join(tmpdir(), 'ci-norepo-'))],
    // grep exits 2 on a malformed pattern. That is neither "matched" nor "matched nothing".
    ['a pattern grep cannot compile', { BASE_SHA: base, DB_SURFACE: '(' }, repo],
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
