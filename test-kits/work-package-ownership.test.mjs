import assert from 'node:assert/strict';
import test from 'node:test';
import { OwnershipValidationError, validateManifestOwnership } from '../scripts/validate-work-package-ownership.mjs';

function manifest(overrides = {}) {
  return {
    work_package_id: 'WP-TEST-001',
    ownership: {
      writable_paths: ['outputs/**'],
      read_only_paths: ['docs/**'],
    },
    outputs: {
      files: ['outputs/result.json'],
    },
    ...overrides,
  };
}

test('accepts exact outputs within their package writable paths', () => {
  assert.doesNotThrow(() => validateManifestOwnership([manifest()]));
});

test('rejects an output outside writable paths', () => {
  assert.throws(
    () => validateManifestOwnership([manifest({ outputs: { files: ['elsewhere/result.json'] } })]),
    (error) => error instanceof OwnershipValidationError && error.code === 68,
  );
});

test('rejects an output that matches a read-only path', () => {
  assert.throws(
    () => validateManifestOwnership([manifest({
      ownership: { writable_paths: ['docs/**'], read_only_paths: ['docs/**'] },
      outputs: { files: ['docs/result.json'] },
    })]),
    (error) => error instanceof OwnershipValidationError && error.code === 69,
  );
});

test('rejects wildcard output declarations', () => {
  assert.throws(
    () => validateManifestOwnership([manifest({ outputs: { files: ['outputs/**'] } })]),
    (error) => error instanceof OwnershipValidationError && error.code === 67,
  );
});

test('rejects absolute, traversal, and directory-like ownership paths', () => {
  for (const [output, writablePath] of [
    ['/tmp/result.json', '/tmp/**'],
    ['../outside/result.json', '../outside/**'],
    ['C:\\temp\\result.json', 'C:\\temp\\*'],
    ['..\\outside\\result.json', '..\\outside\\*'],
    ['.', '.'],
  ]) {
    assert.throws(
      () => validateManifestOwnership([manifest({
        ownership: { writable_paths: [writablePath], read_only_paths: [] },
        outputs: { files: [output] },
      })]),
      (error) => error instanceof OwnershipValidationError && error.code === 67,
    );
  }
});

test('rejects a writable path that captures another package output', () => {
  const owner = manifest({
    work_package_id: 'WP-TEST-OWNER',
    ownership: { writable_paths: ['evidence/**'], read_only_paths: [] },
    outputs: { files: ['evidence/WP-TEST-OWNER/result.json'] },
  });
  const other = manifest({
    work_package_id: 'WP-TEST-OTHER',
    ownership: { writable_paths: ['evidence/WP-TEST-OTHER/**'], read_only_paths: [] },
    outputs: { files: ['evidence/WP-TEST-OTHER/result.json'] },
  });
  assert.throws(
    () => validateManifestOwnership([owner, other]),
    (error) => error instanceof OwnershipValidationError && error.code === 70,
  );
});
