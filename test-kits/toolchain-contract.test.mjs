import assert from 'node:assert/strict';
import test from 'node:test';
import { TOOLCHAIN, assertToolchain } from '../scripts/toolchain-contract.mjs';

test('accepts the pinned Node and npm versions', () => {
  assert.doesNotThrow(() => assertToolchain({ nodeVersion: TOOLCHAIN.node, npmVersion: TOOLCHAIN.npm }));
});

test('rejects a mismatched Node version', () => {
  assert.throws(() => assertToolchain({ nodeVersion: 'v26.7.0', npmVersion: TOOLCHAIN.npm }));
});

test('rejects a mismatched npm version', () => {
  assert.throws(() => assertToolchain({ nodeVersion: TOOLCHAIN.node, npmVersion: '11.20.0' }));
});
