import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

const validator = resolve('scripts/validate-work-package-role-separation.mjs');
const backlogManifest = resolve('work-packages/WP-0A-A0-001.json');
const readyExample = resolve('.agents/examples/work-package-ready.example.json');

function validate(manifestPath) {
  return spawnSync(process.execPath, [validator, manifestPath], { encoding: 'utf8' });
}

test('accepts the backlog bootstrap manifest', () => {
  assert.equal(validate(backlogManifest).status, 0);
});

test('accepts a Ready manifest with four distinct named role IDs', () => {
  assert.equal(validate(readyExample).status, 0);
});

test('accepts null optional approval roles and a non-approval agent reference', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'thinkbizthai-role-test-'));
  try {
    const manifest = JSON.parse(await readFile(readyExample, 'utf8'));
    manifest.role_assignments.security_reviewer_agent_run_id = null;
    manifest.role_assignments.product_reviewer_agent_run_id = null;
    manifest.role_assignments.observer_agent_run_id = manifest.role_assignments.author_agent_run_id;
    const validManifest = join(directory, 'optional-and-observer-roles.json');
    await writeFile(validManifest, `${JSON.stringify(manifest)}\n`);
    assert.equal(validate(validManifest).status, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects a Ready manifest with duplicate named role IDs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'thinkbizthai-role-test-'));
  try {
    const manifest = JSON.parse(await readFile(readyExample, 'utf8'));
    manifest.role_assignments.tester_agent_run_id = manifest.role_assignments.author_agent_run_id;
    const invalidManifest = join(directory, 'duplicate-role.json');
    await writeFile(invalidManifest, `${JSON.stringify(manifest)}\n`);
    assert.equal(validate(invalidManifest).status, 67);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects a Ready manifest with a conditional approval role assigned to the reviewer run', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'thinkbizthai-role-test-'));
  try {
    const manifest = JSON.parse(await readFile(readyExample, 'utf8'));
    manifest.role_assignments.security_reviewer_agent_run_id = manifest.role_assignments.reviewer_agent_run_id;
    const invalidManifest = join(directory, 'duplicate-conditional-role.json');
    await writeFile(invalidManifest, `${JSON.stringify(manifest)}\n`);
    assert.equal(validate(invalidManifest).status, 67);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects a Ready manifest with an empty named role ID', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'thinkbizthai-role-test-'));
  try {
    const manifest = JSON.parse(await readFile(readyExample, 'utf8'));
    manifest.role_assignments.reviewer_agent_run_id = '';
    const invalidManifest = join(directory, 'empty-role.json');
    await writeFile(invalidManifest, `${JSON.stringify(manifest)}\n`);
    assert.equal(validate(invalidManifest).status, 67);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects an unsupported work-package status', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'thinkbizthai-role-test-'));
  try {
    const manifest = JSON.parse(await readFile(readyExample, 'utf8'));
    manifest.status = 'invented_status';
    const invalidManifest = join(directory, 'unsupported-status.json');
    await writeFile(invalidManifest, `${JSON.stringify(manifest)}\n`);
    assert.equal(validate(invalidManifest).status, 66);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects malformed JSON', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'thinkbizthai-role-test-'));
  try {
    const invalidManifest = join(directory, 'malformed.json');
    await writeFile(invalidManifest, '{');
    assert.equal(validate(invalidManifest).status, 65);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
