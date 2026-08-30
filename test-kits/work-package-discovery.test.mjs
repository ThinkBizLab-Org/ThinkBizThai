import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

const validator = resolve('scripts/validate-work-packages.mjs');
const readyExample = resolve('.agents/examples/work-package-ready.example.json');

test('rejects a later invalid Ready manifest discovered beside a valid manifest', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'thinkbizthai-package-test-'));
  try {
    const valid = JSON.parse(await readFile(readyExample, 'utf8'));
    const invalid = structuredClone(valid);
    invalid.work_package_id = 'WP-EXAMPLE-002';
    invalid.role_assignments.tester_agent_run_id = invalid.role_assignments.author_agent_run_id;
    await writeFile(join(directory, 'valid.json'), `${JSON.stringify(valid)}\n`);
    await writeFile(join(directory, 'invalid.json'), `${JSON.stringify(invalid)}\n`);
    const result = spawnSync(process.execPath, [validator, directory], { encoding: 'utf8' });
    assert.equal(result.status, 67);
    assert.match(result.stderr, /invalid\.json/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
