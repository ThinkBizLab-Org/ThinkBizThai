import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCoverage,
  discoverTestFiles,
  extractTestPattern,
  globToRegExp,
  verifyTestCoverageFloor,
} from '../scripts/verify-test-coverage-floor.mjs';

const CURRENT = 'test-kits/**/*.test.mjs';
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

test('a test:bootstrap without a single-quoted pattern is rejected', () => {
  assert.throws(() => extractTestPattern('node --test test-kits/**/*.test.mjs'), (error) => error.code === 74);
  assert.throws(() => extractTestPattern(undefined), (error) => error.code === 74);
  assert.equal(extractTestPattern("node --test 'test-kits/**/*.test.mjs'"), CURRENT);
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
