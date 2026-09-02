import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CHAIN_COMMANDS,
  PROTECTED_KEYS,
  assertCoverage,
  assertDeclaredTests,
  assertIntegrityManifest,
  assertEveryTestFileProtected,
  assertNoEscapingPath,
  stripNonCode,
  assertPackageScripts,
  countDeclaredTests,
  discoverTestFiles,
  globToRegExp,
  verifyTestCoverageFloor,
} from '../scripts/verify-test-coverage-floor.mjs';
import { assertDeclarationsMatchExecution, assertExecuted, assertNothingSkipped, parseExecutedTests, parseSummary } from '../scripts/run-test-suite.mjs';
import { GUARD_SCRIPT, INTEGRITY_MANIFEST, MIN_DECLARED_TESTS_BY_DIRECTORY, MIN_EXECUTED_TESTS, RUNNER_SCRIPT, TEST_PATTERN } from '../scripts/test-suite-contract.mjs';

const CURRENT = TEST_PATTERN;
const files = [
  'test-kits/capability-profile.test.mjs',
  'test-kits/repository-json.test.mjs',
  'test-kits/role-separation.test.mjs',
  'test-kits/secret-scan.test.mjs',
  'test-kits/test-coverage-floor.test.mjs',
  'test-kits/toolchain-contract.test.mjs',
  'test-kits/work-package-discovery.test.mjs',
  'test-kits/work-package-ownership.test.mjs',
  'test-kits/contracts/shared-kernel-contract-catalog.test.mjs',
];

test('the repository pattern matches every discovered test file', async () => {
  const { pattern, files: discovered } = await verifyTestCoverageFloor();
  assert.equal(pattern, CURRENT);
  assert.ok(discovered.length >= 9, `expected at least 9 discovered test files, got ${discovered.length}`);
  assert.ok(discovered.includes('test-kits/contracts/shared-kernel-contract-catalog.test.mjs'));
});

test('the superseded glob is rejected because it never descends into test-kits/contracts', () => {
  assert.throws(
    () => assertCoverage('test-kits/*.test.mjs', files),
    (error) => error.code === 76 && /shared-kernel-contract-catalog/.test(error.message),
  );
});

test('a pattern matching nothing is rejected instead of passing with zero tests', () => {
  assert.throws(() => assertCoverage('no-such-dir/**/*.test.mjs', files), (error) => error.code === 76);
  assert.throws(() => assertCoverage(CURRENT, []), (error) => error.code === 75);
});

test('a collapsed suite is rejected before it can report a green run that executed nothing', () => {
  assert.throws(() => assertCoverage(CURRENT, files.slice(0, 3)), (error) => error.code === 75);
});

test('a suite confined to one directory is rejected as the WP-0A-A0-002 defect class', () => {
  const flat = files.filter((file) => !file.includes('/contracts/'));
  assert.throws(() => assertCoverage(CURRENT, flat, 4), (error) => error.code === 77);
});

const FULL_CHAIN = 'npm run verify:coverage-floor && node scripts/verify-toolchain.mjs && npm run scan:secrets && npm run validate:protocol && npm run test:bootstrap';

const okScripts = (overrides = {}) => ({
  'test:bootstrap': RUNNER_SCRIPT,
  'verify:coverage-floor': GUARD_SCRIPT,
  ...CHAIN_COMMANDS,
  check: 'npm run verify:coverage-floor && node scripts/verify-toolchain.mjs && npm run scan:secrets && npm run validate:protocol && npm run test:bootstrap',
  ...overrides,
});

test('the repository scripts satisfy the wiring contract', () => {
  assert.equal(assertPackageScripts(okScripts()), CURRENT);
});

// Independent testing neutralised the earlier substring form with a no-op prefix and with
// `|| true`, passing the guard while executing nothing. The runner command is now pinned.
test('any wrapper that could neutralise the runner is rejected', () => {
  for (const bootstrap of [
    `: ${RUNNER_SCRIPT}`,
    `true; ${RUNNER_SCRIPT}`,
    `${RUNNER_SCRIPT} || true`,
    `${RUNNER_SCRIPT} ; exit 0`,
    `echo ${RUNNER_SCRIPT}`,
    "node --test 'test-kits/**/*.test.mjs'",
    'node --test test-kits/**/*.test.mjs',
    undefined,
  ]) {
    assert.throws(() => assertPackageScripts(okScripts({ 'test:bootstrap': bootstrap })), (error) => error.code === 74, `expected rejection: ${bootstrap}`);
  }
});

// Independent testing changed one character -- `&&` to `||` before the runner -- and the
// substring check still passed while `||` short-circuited: npm run check exited 0 having
// executed no test, with every protected file byte-identical. The chain is parsed now.
test('a check script that could skip, comment out, or mask a step is rejected', () => {
  const base = 'npm run verify:coverage-floor && node scripts/verify-toolchain.mjs && npm run scan:secrets && npm run validate:protocol';
  for (const check of [
    `${base} || npm run test:bootstrap`,
    `${base} ; npm run test:bootstrap`,
    `${base} && # npm run test:bootstrap`,
    `${base} && npm run test:bootstrap | true`,
    `${base} && npm run test:bootstrap &`,
    `${base} && npm run test:bootstrap && echo masked`,
    `${base} &&  && npm run test:bootstrap`,
  ]) {
    assert.throws(() => assertPackageScripts(okScripts({ check })), (error) => error.code === 81, `expected rejection: ${check}`);
  }
  assert.doesNotThrow(() => assertPackageScripts(okScripts({ check: `${base} && npm run test:bootstrap` })));
  // The guard must be reached before anything can short-circuit past it.
  assert.throws(() => assertPackageScripts(okScripts({
    check: 'node scripts/verify-toolchain.mjs && npm run verify:coverage-floor && npm run test:bootstrap',
  })), (error) => error.code === 81 && /(must START|as its own && step|in the order)/.test(error.message));
});

// Everything that decides whether the suite runs must be digested, not only the suites.
test('the manifest covers the whole decision surface, not just the test files', async () => {
  const manifest = JSON.parse(await readFile(INTEGRITY_MANIFEST, 'utf8'));
  for (const required of ['package.json', '.github/workflows/ci.yml', 'scripts/verify-toolchain.mjs', 'scripts/test-suite-contract.mjs']) {
    assert.ok(required in manifest.files, `${required} decides whether the suite runs and must be digested`);
  }
  assert.ok(Object.keys(manifest.files).length >= 20);
  assert.match(manifest.note, /no self-anchor/i);
});

test('a check script that drops the runner or the guard is rejected', () => {
  assert.throws(
    () => assertPackageScripts(okScripts({ check: 'npm run verify:coverage-floor && node scripts/verify-toolchain.mjs' })),
    (error) => error.code === 81 && /npm run (test:bootstrap|scan:secrets)/.test(error.message),
  );
  assert.throws(
    () => assertPackageScripts(okScripts({ check: 'node scripts/verify-toolchain.mjs && npm run test:bootstrap' })),
    (error) => error.code === 81 && /(verify:coverage-floor|must START|as its own && step)/.test(error.message),
  );
  assert.throws(
    () => assertPackageScripts(okScripts({ check: 'npm run test:bootstrap && npm run verify:coverage-floor' })),
    (error) => error.code === 81 && /(before test:bootstrap|must START|in the order|as its own && step)/.test(error.message),
  );
  assert.throws(() => assertPackageScripts(okScripts({ check: undefined })), (error) => error.code === 74);
  // Independent review reduced the chain to the guard plus the runner and both this guard and
  // npm run check exited 0, silently deleting the toolchain pin, the secret scan and all three
  // protocol validators from CI. Every gating step is required now, not just the ends.
  for (const dropped of ['node scripts/verify-toolchain.mjs', 'npm run scan:secrets', 'npm run validate:protocol']) {
    const check = FULL_CHAIN.split(' && ').filter((step) => step !== dropped).join(' && ');
    assert.throws(() => assertPackageScripts(okScripts({ check })), (error) => error.code === 81, `dropping ${dropped} must be rejected`);
  }
  const reordered = 'npm run verify:coverage-floor && npm run validate:protocol && npm run scan:secrets && node scripts/verify-toolchain.mjs && npm run test:bootstrap';
  assert.throws(() => assertPackageScripts(okScripts({ check: reordered })), (error) => error.code === 81 && /in the order/.test(error.message));
  assert.throws(() => assertPackageScripts(okScripts({ 'verify:coverage-floor': 'echo skipped' })), (error) => error.code === 74);
});

// The pattern now reaches node as an argv string and never touches a shell, so the
// quote-stripping hazard is designed out. The executed count is asserted after the run.
test('a run that executed nothing is rejected even when the runner exits zero', () => {
  assert.equal(parseExecutedTests('ℹ tests 44\nℹ pass 44'), 44);
  assert.equal(parseExecutedTests('# tests 12\n# pass 12'), 12);
  assert.equal(parseExecutedTests('no summary here'), null);
  assert.throws(() => assertExecuted(parseExecutedTests('ℹ tests 6\nℹ pass 0')), /PASSED 0 tests/);
  assert.throws(() => assertExecuted(null), /could not read an executed-test count/);
  assert.throws(() => assertExecuted(39, 40), /below the required floor/);
  assert.doesNotThrow(() => assertExecuted(44, 40));
});

// A bare `**` inside a segment is single-segment for node's glob. Expanding it to `.*`
// made the guard accept a pattern under which the runner skipped test-kits/contracts.
test('a bare ** inside a segment does not span directories, matching node glob semantics', () => {
  assert.equal(globToRegExp('test-kits/**.test.mjs').test('test-kits/contracts/a.test.mjs'), false);
  assert.equal(globToRegExp('test-kits/**.test.mjs').test('test-kits/a.test.mjs'), true);
  assert.throws(() => assertCoverage('test-kits/**.test.mjs', files), (error) => error.code === 76 && /shared-kernel-contract-catalog/.test(error.message));
});

test('files counted but declaring no test cannot satisfy the floor', async () => {
  assert.equal(countDeclaredTests("test('a', () => {});\nawait test('b', () => {});"), 2);
  assert.equal(countDeclaredTests("// test( in a comment is not a declaration\nconst x = 1;"), 0);
  await assert.rejects(() => assertDeclaredTests(['test-kits/first-integration-slice-fixture-plan.md']), (error) => error.code === 78);
});

test('the repository suite clears the declared-test floor', async () => {
  const { declared } = await verifyTestCoverageFloor();
  assert.ok(declared >= 30, `expected at least 30 declared tests, found ${declared}`);
});

test('globstar spans nested directories without escaping the test root', () => {
  const matcher = globToRegExp(CURRENT);
  assert.ok(matcher.test('test-kits/a.test.mjs'));
  assert.ok(matcher.test('test-kits/contracts/b.test.mjs'));
  assert.ok(matcher.test('test-kits/contracts/deep/c.test.mjs'));
  assert.equal(matcher.test('other-kits/a.test.mjs'), false);
  assert.equal(matcher.test('test-kits/a.mjs'), false);
});

test('discovery walks nested directories on disk', async () => {
  const discovered = await discoverTestFiles('test-kits');
  assert.ok(discovered.some((file) => file.startsWith('test-kits/contracts/')));
  assert.ok(discovered.every((file) => file.endsWith('.test.mjs')));
});

// Integration verification replaced the six-test contract suite -- the suite this
// repository's guards exist to protect -- with one placeholder. The global total still
// cleared its floor and every check stayed green. Floors are now per directory too.
test('swapping a protected suite for a placeholder is rejected even when the total still clears', async () => {
  // The real contract suite is present, so the floor it carries is met.
  await assert.doesNotReject(() => assertDeclaredTests(files, 8, { 'test-kits/contracts': 6 }));
  // Drop it, as integration verification did: the global total still clears its floor...
  const withoutContracts = files.filter((file) => !file.startsWith('test-kits/contracts/'));
  await assert.doesNotReject(() => assertDeclaredTests(withoutContracts, 8, {}));
  // ...but the directory floor catches what the aggregate cannot see.
  await assert.rejects(
    () => assertDeclaredTests(withoutContracts, 8, { 'test-kits/contracts': 6 }),
    (error) => error.code === 82 && /test-kits\/contracts' declares 0 tests/.test(error.message),
  );
  // Raised to 7 when catalog-groups.test.mjs was added. The pin is an equality, not a floor, so
  // that a RAISE is as deliberate as a lowering: a floor that drifts up with the suite silently
  // re-baselines itself and stops being a statement about what must exist.
  assert.equal(MIN_DECLARED_TESTS_BY_DIRECTORY['test-kits/contracts'], 7);
});

// A test can print a summary line into the very stream the post-run floor audits.
test('a forged summary earlier in the stream cannot raise the executed count', () => {
  assert.equal(parseExecutedTests('ℹ pass 9999\nℹ ok\nℹ pass 46'), 46);
  assert.equal(parseExecutedTests('# pass 9999\n# pass 3'), 3);
  assert.throws(() => assertExecuted(parseExecutedTests('ℹ pass 9999\nℹ pass 0')), /PASSED 0 tests/);
});

// Independent review, security review and independent testing each separately replaced the
// suite with `{ skip: true }` placeholders whose bodies throw. Every count-based floor
// reported PASSED because `ℹ tests N` counts skipped tests. The floor now reads `pass`.
test('a suite skipped into silence is rejected, not counted as executed', () => {
  const skipped = 'ℹ tests 48\nℹ pass 0\nℹ fail 0\nℹ skipped 48\nℹ todo 0';
  assert.deepEqual(parseSummary(skipped), { tests: 48, pass: 0, fail: 0, skipped: 48, todo: 0 });
  assert.equal(parseExecutedTests(skipped), 0);
  assert.throws(() => assertNothingSkipped(parseSummary(skipped)), /48 skipped/);
  assert.throws(() => assertExecuted(parseExecutedTests(skipped)), /PASSED 0 tests/);
  assert.throws(() => assertNothingSkipped(parseSummary('ℹ pass 5\nℹ skipped 0\nℹ todo 2')), /2 todo/);
  assert.throws(() => assertNothingSkipped(parseSummary('nothing')), /could not read skipped\/todo/);
  assert.doesNotThrow(() => assertNothingSkipped(parseSummary('ℹ pass 5\nℹ skipped 0\nℹ todo 0')));
});

// Name pinning was defeated twice: a bodyless `test('<required name>');` counts as a pass,
// and a bare console.log of the names satisfied a substring check with no test so named.
// The pin is now on file CONTENT, which the running tests cannot influence.
test('gutting a protected file is caught by its content digest', async () => {
  const protectedCount = await assertIntegrityManifest();
  assert.ok(protectedCount >= 8, `expected at least 8 protected files, found ${protectedCount}`);
  await assert.rejects(() => assertIntegrityManifest('test-kits/no-such-manifest.json'), (error) => error.code === 86);
});

test('the manifest protects the guards, the contract, and the suites they defend', async () => {
  const manifest = JSON.parse(await readFile(INTEGRITY_MANIFEST, 'utf8'));
  for (const required of [
    'scripts/run-test-suite.mjs',
    'scripts/verify-test-coverage-floor.mjs',
    'scripts/test-suite-contract.mjs',
    'test-kits/contracts/shared-kernel-contract-catalog.test.mjs',
  ]) {
    assert.ok(required in manifest.files, `${required} must be digested; the file holding the floors and digests was previously unprotected`);
  }
  assert.match(manifest.note, /tripwire|no self-anchor/i);
});

// A build script is editable by anyone who can edit the build script. This does not close
// that; it makes the edit loud enough to be reviewed.
// The literal 54 here was brittle -- it broke on any legitimate added test and blamed the
// scanner. The real reconciliation happens in the runner, where both numbers exist.
test('every discovered test file is digested, and none resolves outside the repository', async () => {
  const { files: discovered } = await verifyTestCoverageFloor();
  assert.ok(discovered.length >= 9);
  await assert.doesNotReject(() => assertEveryTestFileProtected(discovered));
  await assert.rejects(
    () => assertEveryTestFileProtected([...discovered, 'test-kits/not-in-manifest.test.mjs']),
    (error) => error.code === 87 && /not-in-manifest/.test(error.message),
  );
  await assert.doesNotReject(() => assertNoEscapingPath(discovered));
});

test('a declaration the runner never executes is rejected', async () => {
  await assert.rejects(() => assertDeclarationsMatchExecution(1), (error) => error.code === 88 && /declares \d+ tests but the runner executed 1/.test(error.message));
});

// The scanner had no regex-literal state, so `/[/*]/` opened a phantom block comment to EOF.
test('a regex literal is not mistaken for a comment or a declaration', () => {
  assert.equal(countDeclaredTests("const r = /[/*]/;\ntest('a', () => {});\ntest('b', () => {});"), 2);
  assert.equal(countDeclaredTests("const r = /'\"`/;\ntest('a', () => {});"), 1);
  assert.equal(countDeclaredTests("const a = 4 / 2; /* test('x', () => {}); */\ntest('b', () => {});"), 1);
});

// Padding a suite with `test(` inside comments or template literals cleared the floor.
test('declaration counting ignores comments, template literals and strings', () => {
  const padded = ['/* test("a", () => {}); */', 'const t = `test(`;', 'test("real", () => {});', '// test("c")'].join('\n');
  assert.equal(countDeclaredTests(padded), 1);
  assert.equal(stripNonCode('/* x */ const a = 1;').includes('x'), false);
  assert.equal(countDeclaredTests('test("a", () => {});\nawait test("b", () => {});'), 2);
});

// The directory floor was pinned in its own commit while the executed floor was not:
// lowering MIN_EXECUTED_TESTS from 40 to 1 passed the entire check.
test('the executed-test floor and the directory floor are both pinned', () => {
  assert.ok(MIN_EXECUTED_TESTS >= 40, `MIN_EXECUTED_TESTS must not be lowered below 40, found ${MIN_EXECUTED_TESTS}`);
  // Raised to 7 when catalog-groups.test.mjs was added. The pin is an equality, not a floor, so
  // that a RAISE is as deliberate as a lowering: a floor that drifts up with the suite silently
  // re-baselines itself and stops being a statement about what must exist.
  assert.equal(MIN_DECLARED_TESTS_BY_DIRECTORY['test-kits/contracts'], 7);
});

// The manifest's key set was self-selecting: the floor required seven named keys and a length,
// and a length is satisfied by whatever remains. Independent review deleted the branch-scope
// guard, all four protocol schemas, the catalog index and the secret scanner -- 43 entries down
// to 36 -- then replaced the guard's entire enforcement path with `const stray = []`, and the
// check exited 0. That is a removal of protection, not the acknowledged
// edit-the-file-and-its-digest-together class.
test('every file whose absence from the manifest would itself be the defect is digested', async () => {
  const manifest = JSON.parse(await readFile('test-kits/integrity-manifest.json', 'utf8'));
  const missing = PROTECTED_KEYS.filter((key) => manifest.files?.[key] === undefined);
  assert.deepEqual(missing, [], `file(s) that must carry a digest and do not:\n  ${missing.join('\n  ')}\n`
    + 'A guard, a schema deciding what a package may claim, or a registry a gate decision rests on '
    + 'cannot be removed from the protected set by deleting a line.');
});

test('a step named in the chain cannot run something else', () => {
  // Requiring the STEP is not requiring the WORK. `test:bootstrap` and `verify:coverage-floor`
  // were pinned to exact commands and the three steps between them only by name, so
  // `"validate:protocol": "true"` and `"scan:secrets": "true"` each passed at exit 0 — the chain
  // still read correctly, every guard still listed, and two of them ran nothing at all.
  //
  // Found by probing the chain rather than by a review: "can a guard be made not to RUN, instead
  // of made to pass?" is a different question from "can a guard be made to pass", and the chain
  // check only ever answered the second.
  for (const name of Object.keys(CHAIN_COMMANDS)) {
    for (const replacement of ['true', ':', 'echo ok', 'node --version']) {
      assert.throws(() => assertPackageScripts(okScripts({ [name]: replacement })),
        (error) => error.code === 74,
        `${name} = ${JSON.stringify(replacement)} must be rejected`);
    }
    assert.throws(() => assertPackageScripts(okScripts({ [name]: undefined })), (error) => error.code === 74);
  }
  // And the real commands still pass, so the pin is a pin and not a ban.
  assert.doesNotThrow(() => assertPackageScripts(okScripts()));
});

test('the clean-run reporter separates a failing count from a failing test', async () => {
  // `npm run check` printed `pass 225, fail 0` and exited 88 -- a count the runner could not
  // reconcile, not a failing test. I verified two commits by grepping the summary lines and
  // shipped both red. This asserts the reporter says the thing I got wrong, out loud.
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('scripts/verify-clean-run.mjs', 'utf8');
  assert.match(source, /result\.status/, 'the reporter must read the process status, not the output');
  assert.match(source, /every test passed and the run still failed/,
    'the exit-88 shape needs saying in words, because the numbers look clean');

  const scripts = JSON.parse(await readFile('package.json', 'utf8')).scripts;
  assert.equal(scripts.verify, 'node scripts/verify-clean-run.mjs');
  // `verify` must not be a STEP of `check`: it runs check as a child, and a chain containing it
  // would recurse. Compared step by step, not by substring -- the first version of this line used
  // `check.includes('npm run verify')` and matched `npm run verify:coverage-floor`, failing the
  // moment it was written. Substring-instead-of-structure is the same habit that produced the
  // exit-88 report this whole test exists because of.
  const steps = scripts.check.split('&&').map((step) => step.trim());
  assert.ok(!steps.includes('npm run verify'), 'verify wraps check; check must not invoke verify');
});

test('the repository declares no dependency and no lifecycle script', async () => {
  // Probing the npm layer: `package.json` accepted `"dependencies": {"left-pad": "^1.3.0"}` and
  // `"preinstall": "node -e …"` at exit 0. CI runs `npm ci --ignore-scripts`, so a lifecycle
  // script does not execute there today — but that flag is one edit away, and a developer running
  // `npm install` has no such protection. **A preinstall script runs before every guard in this
  // repository**, which is a stronger position than any bypass found so far.
  //
  // Zero dependencies is a stated property of this repository and was asserted by nothing.
  const { readFile } = await import('node:fs/promises');
  const manifest = JSON.parse(await readFile('package.json', 'utf8'));
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    assert.equal(manifest[field], undefined,
      `package.json declares ${field}; this repository runs on the pinned toolchain and nothing else`);
  }

  // npm runs these around install, before anything here can look at the tree.
  const LIFECYCLE = [
    'preinstall', 'install', 'postinstall', 'prepare', 'prepublish', 'prepublishOnly',
    'prepack', 'postpack', 'preuninstall', 'uninstall', 'postuninstall', 'dependencies',
  ];
  const present = LIFECYCLE.filter((name) => manifest.scripts?.[name] !== undefined);
  assert.deepEqual(present, [], `package.json declares npm lifecycle script(s): ${present.join(', ')}`);

  // And the script set is pinned, so a new script cannot appear unremarked — the same reason the
  // chain is pinned step by step.
  assert.deepEqual(Object.keys(manifest.scripts).sort(), [
    'check', 'check:handoff', 'check:scope', 'record:verification', 'refresh:handoff',
    'regenerate:manifest', 'scan:secrets', 'test:bootstrap', 'validate:protocol', 'verify',
    'verify:coverage-floor',
  ]);

  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  assert.match(ci, /npm ci --ignore-scripts/,
    'CI must install with --ignore-scripts; without it a lifecycle script runs before every guard');
});

test('no npm configuration file redirects what npm run executes', async () => {
  // `script-shell=/usr/bin/true` in `.npmrc` makes every `npm run` a no-op. Independent review
  // seventeen ran it: `npm run check` exited 0 having executed nothing, and `npm run verify` --
  // the command this repository tells reviewers to trust because it reports the status -- exited
  // 0 printing `clean` and no counts at all.
  //
  // The chain string was untouched, so the allowed-alphabet check saw nothing wrong. **npm decides
  // which shell runs the chain, and that decision lived in a file no guard read.** Only CI's
  // `node scripts/verify-test-coverage-floor.mjs` step survived, because it is invoked directly
  // rather than through npm.
  //
  // If this repository ever needs an npm configuration file, digest it and add it to
  // DIGESTED_FLOOR in the same commit. Until then its absence is the control.
  const { readdir } = await import('node:fs/promises');
  const NPM_CONFIG_FILES = ['.npmrc', 'npmrc', '.yarnrc', '.yarnrc.yml', '.pnpmfile.cjs', 'pnpm-workspace.yaml'];
  const present = (await readdir('.')).filter((name) => NPM_CONFIG_FILES.includes(name));
  assert.deepEqual(present, [], `npm/package-manager configuration file(s) present: ${present.join(', ')}. `
    + 'One line in such a file can redirect or silence every npm run in this repository, including the verifier.');
});


test('package.json carries no field nobody declared', async () => {
  // Probed `"type": "commonjs"`, `"workspaces": ["packages/*"]` and an `"imports"` subpath map:
  // all three pass, and all three are inert here — every file is `.mjs`, so `type` changes
  // nothing, and the other two are unused. **Recording that they are inert rather than guarding
  // them as if they were dangerous**; the guard that is worth having is the same one every other
  // declaration file in this repository already has.
  //
  // A new top-level field is then a reviewed line, which is what stopped `normative_rules` in a
  // work package and `freeze_approved` in the catalog index.
  const { readFile } = await import('node:fs/promises');
  const manifest = JSON.parse(await readFile('package.json', 'utf8'));
  assert.deepEqual(Object.keys(manifest).sort(), ["description", "engines", "name", "packageManager", "private", "scripts", "version"]);
});
