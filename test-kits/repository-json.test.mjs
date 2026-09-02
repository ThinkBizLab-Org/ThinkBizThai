import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const jsonFiles = [
  '.agents/capabilities.schema.json',
  '.agents/handoff.schema.json',
  '.agents/status.schema.json',
  '.agents/work-package.schema.json',
  '.agents/examples/capability-profile.example.json',
  '.agents/examples/work-package-ready.example.json',
  '.agents/role-profiles/roles.json',
  'package.json',
  'package-lock.json',
  'work-packages/WP-0A-A0-001.json',
];

test('repository JSON artifacts parse and share the protocol version', async () => {
  const artifacts = await Promise.all(
    jsonFiles.map(async (file) => [file, JSON.parse(await readFile(file, 'utf8'))]),
  );

  for (const [file, artifact] of artifacts) {
    if (file.endsWith('.schema.json')) {
      assert.equal(artifact.properties.protocol_version.const, '1.0.0', `${file} constrains the protocol version`);
    } else if (file.startsWith('.agents/') || file.startsWith('work-packages/')) {
      assert.equal(artifact.protocol_version, '1.0.0', `${file} has the protocol version`);
    }
  }
});

test('toolchain configuration and CI remain aligned', async () => {
  const [nodeVersion, packageJson, packageLock, ci, rfc] = await Promise.all([
    readFile('.node-version', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse),
    readFile('package-lock.json', 'utf8').then(JSON.parse),
    readFile('.github/workflows/ci.yml', 'utf8'),
    readFile('architecture/decisions/RFC-2026-001-bootstrap-tooling-contract.md', 'utf8'),
  ]);

  assert.equal(nodeVersion.trim(), '24.20.0');
  assert.equal(packageJson.packageManager, 'npm@11.19.0');
  assert.deepEqual(packageJson.engines, { node: '24.20.0', npm: '11.19.0' });
  assert.deepEqual(packageLock.packages[''].engines, packageJson.engines);
  assert.match(ci, /persist-credentials: false/);
  assert.match(ci, /node-version: 24\.20\.0/);
  assert.match(ci, /test "\$\(npm --version\)" = "11\.19\.0"/);
  assert.match(rfc, /Node\.js `24\.20\.0` LTS/);
  assert.match(rfc, /npm `11\.19\.0`/);
});
