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

test('the workflow still runs every guard it is the outside anchor for', async () => {
  // `ci.yml` was digested and matched by three regexes -- persist-credentials, the Node version,
  // the npm-version test. Nothing asserted that it still RUNS anything. Independent review sixteen
  // replaced it with `on: workflow_dispatch` plus checkout and setup-node, satisfying all three
  // regexes, and `npm run check` stayed at exit 0, 226/226.
  //
  // That is worse than the acknowledged edit-the-file-and-its-digest class: the integrity
  // manifest's own note names CI as the OUTSIDE ANCHOR for a tripwire that has no self-anchor. A
  // workflow that runs nothing anchors nothing, and deleting the branch-scope step also deletes
  // the only guard that catches an undeclared new file.
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  const required = [
    // The event, without which none of the steps below ever fire on a pull request.
    { pattern: /^\s*pull_request:/m, what: 'a pull_request trigger' },
    // RFC-2026-007: the guard is invoked BY THE WORKFLOW, not by the chain it audits, because a
    // compromised `scripts.check` string gets the last word over a guard inside it.
    { pattern: /node scripts\/verify-test-coverage-floor\.mjs/, what: 'the independent test-integrity guard step' },
    { pattern: /npm run check/, what: 'the repository check' },
    { pattern: /scripts\/verify-branch-identity\.mjs/, what: 'the branch-identity step' },
    { pattern: /scripts\/verify-branch-scope\.mjs/, what: 'the branch-scope step' },
  ];
  const missing = required.filter(({ pattern }) => !pattern.test(ci)).map(({ what }) => what);
  assert.deepEqual(missing, [], `the workflow no longer runs: ${missing.join(', ')}`);

  // And the branch-scope step must remain conditioned on a pull request rather than deleted --
  // the condition is what makes it skip on a push to main, which is a deliberate limitation
  // recorded in the evidence, not an accident to be silently widened or removed.
  assert.match(ci, /if: github\.event_name == 'pull_request'/,
    'the branch-scope step is pull-request scoped by design; losing the condition changes what it means');
});
