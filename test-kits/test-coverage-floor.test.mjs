import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCoverage,
  assertDeclaredTests,
  assertGuardedScriptDigests,
  stripNonCode,
  assertPackageScripts,
  countDeclaredTests,
  discoverTestFiles,
  globToRegExp,
  verifyTestCoverageFloor,
} from '../scripts/verify-test-coverage-floor.mjs';
import { assertExecuted, assertNothingSkipped, assertRequiredTests, parseExecutedTests, parseSummary } from '../scripts/run-test-suite.mjs';
import { GUARD_SCRIPT, GUARDED_SCRIPT_DIGESTS, MIN_DECLARED_TESTS_BY_DIRECTORY, MIN_EXECUTED_TESTS, REQUIRED_TEST_NAMES, RUNNER_SCRIPT, TEST_PATTERN } from '../scripts/test-suite-contract.mjs';

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

const okScripts = (overrides = {}) => ({
  'test:bootstrap': RUNNER_SCRIPT,
  'verify:coverage-floor': GUARD_SCRIPT,
  check: 'node scripts/verify-toolchain.mjs && npm run validate:protocol && npm run verify:coverage-floor && npm run test:bootstrap',
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

// Independent review showed the guard protected nothing if `check` simply stopped
// invoking it, or stopped invoking the runner.
test('a check script that drops the runner or the guard is rejected', () => {
  assert.throws(
    () => assertPackageScripts(okScripts({ check: 'node scripts/verify-toolchain.mjs && npm run verify:coverage-floor' })),
    (error) => error.code === 81 && /npm run test:bootstrap/.test(error.message),
  );
  assert.throws(
    () => assertPackageScripts(okScripts({ check: 'node scripts/verify-toolchain.mjs && npm run test:bootstrap' })),
    (error) => error.code === 81 && /npm run verify:coverage-floor/.test(error.message),
  );
  assert.throws(
    () => assertPackageScripts(okScripts({ check: 'npm run test:bootstrap && npm run verify:coverage-floor' })),
    (error) => error.code === 81 && /before test:bootstrap/.test(error.message),
  );
  assert.throws(() => assertPackageScripts(okScripts({ check: undefined })), (error) => error.code === 74);
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
  assert.equal(MIN_DECLARED_TESTS_BY_DIRECTORY['test-kits/contracts'], 6);
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

// Counting cannot tell six real tests from six trivial ones, so the load-bearing suites
// are pinned by name against the runner's own output.
test('gutting a protected suite is caught by name even when every count still clears', () => {
  const full = REQUIRED_TEST_NAMES.join('\n');
  assert.doesNotThrow(() => assertRequiredTests(full));
  const gutted = REQUIRED_TEST_NAMES.slice(1).join('\n');
  assert.throws(() => assertRequiredTests(gutted), (error) => error.code === 84 && error.message.includes(REQUIRED_TEST_NAMES[0]));
  assert.throws(() => assertRequiredTests('ok 1 - x\nok 2 - y'), (error) => error.code === 84);
  assert.ok(REQUIRED_TEST_NAMES.length >= 10);
});

// A build script is editable by anyone who can edit the build script. This does not close
// that; it makes the edit loud enough to be reviewed.
test('editing a guarded script without updating its digest fails the run', async () => {
  await assert.doesNotReject(() => assertGuardedScriptDigests());
  await assert.rejects(
    () => assertGuardedScriptDigests({ 'scripts/run-test-suite.mjs': 'deadbeef'.repeat(8) }),
    (error) => error.code === 86 && /run-test-suite\.mjs/.test(error.message),
  );
  assert.ok(Object.keys(GUARDED_SCRIPT_DIGESTS).length >= 2);
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
  assert.equal(MIN_DECLARED_TESTS_BY_DIRECTORY['test-kits/contracts'], 6);
});
