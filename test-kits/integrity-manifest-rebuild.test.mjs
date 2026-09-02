import assert from 'node:assert/strict';
import test from 'node:test';

import { rebuild } from '../scripts/regenerate-integrity-manifest.mjs';

// The rebuild runs during a rebase, under a conflict, which is when a wrong tool does the most
// damage. Four places told someone to "rebuild the digests" and no command existed, so every
// rebuild until now was improvised from memory at that exact moment.
//
// What must hold: it rebuilds digests, it does not decide what deserves one, and it reports
// anything appearing or disappearing rather than absorbing it silently.
test('a file the manifest names but that is gone is dropped, and reported', async () => {
  const manifest = { note: 'kept', files: { 'package.json': 'stale', 'no/such/file.mjs': 'stale' } };
  const { manifest: rebuilt, dropped, added } = await rebuild(manifest, []);
  assert.deepEqual(dropped, ['no/such/file.mjs']);
  assert.deepEqual(added, []);
  assert.equal(rebuilt.files['no/such/file.mjs'], undefined);
  assert.match(rebuilt.files['package.json'], /^[0-9a-f]{64}$/);
  assert.equal(rebuilt.note, 'kept', 'everything but `files` is carried through untouched');
});

test('a discovered test file that was not digested is added, and reported', async () => {
  const manifest = { files: {} };
  const { manifest: rebuilt, added } = await rebuild(manifest, ['package.json']);
  assert.deepEqual(added, ['package.json']);
  assert.match(rebuilt.files['package.json'], /^[0-9a-f]{64}$/);
});

test('a digest is recomputed over bytes, and the order is stable', async () => {
  const manifest = { files: { 'package.json': 'wrong', '.node-version': 'wrong' } };
  const { manifest: rebuilt, added, dropped } = await rebuild(manifest, []);
  assert.deepEqual([added, dropped], [[], []]);
  assert.deepEqual(Object.keys(rebuilt.files), ['.node-version', 'package.json'],
    'keys are sorted, so a rebuild produces the same bytes whatever order it walked in');
  for (const value of Object.values(rebuilt.files)) assert.match(value, /^[0-9a-f]{64}$/);
});
