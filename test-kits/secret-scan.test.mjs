import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanDirectory } from '../scripts/scan-repository-secrets.mjs';

test('accepts synthetic safe content', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'thinkbizthai-secret-test-'));
  try {
    await writeFile(join(directory, 'safe.txt'), 'synthetic fixture without credentials\n');
    assert.deepEqual(await scanDirectory(directory), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects a synthetic private-key pattern', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'thinkbizthai-secret-test-'));
  try {
    const file = join(directory, 'unsafe.txt');
    await writeFile(file, `-----BEGIN ${'PRIVATE KEY-----'}\nsynthetic only\n`);
    assert.deepEqual(await scanDirectory(directory), [file]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
