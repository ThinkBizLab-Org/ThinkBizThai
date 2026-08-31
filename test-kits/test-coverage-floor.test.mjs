import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCoverage,
  assertDeclaredTests,
  assertPackageScripts,
  countDeclaredTests,
  discoverTestFiles,
  globToRegExp,
  verifyTestCoverageFloor,
} from '../scripts/verify-test-coverage-floor.mjs';
import { assertExecuted, parseExecutedTests } from '../scripts/run-test-suite.mjs';
import { GUARD_SCRIPT, RUNNER_SCRIPT, TEST_PATTERN } from '../scripts/test-suite-contract.mjs';

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
  assert.equal(parseExecutedTests('# tests 12'), 12);
  assert.equal(parseExecutedTests('no summary here'), null);
  assert.throws(() => assertExecuted(parseExecutedTests('ℹ tests 0')), /executed 0 tests/);
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
