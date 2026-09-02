import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

// Every floor added for reviews seventeen and eighteen counts something: tests, assertions, and
// then the names. Probing each one produced the next: preserve the count, preserve the assertions,
// preserve the names. **Counting anything can be satisfied by repeating anything**, and a fourth
// count would be defeated by preserving a fourth number.
//
// So this one is not a count. It takes a copy of the repository, reverses a real rule in a real
// contract, runs the suite that is supposed to notice, and asserts it FAILS. A suite hollowed into
// placeholders passes its floors and fails here, because a placeholder notices nothing.
//
// The limit is stated where it belongs and not papered over: an author who edits this file too is
// caught by the integrity tripwire and by a reviewer reading the diff, which is item 1 on the
// "not closed" list and always was.
const REPOSITORY = process.cwd();

async function repositoryCopy() {
  const root = await mkdtemp(join(tmpdir(), 'ratchet-bite-'));
  for (const entry of ['contract-catalog', 'test-kits', 'scripts', 'package.json']) {
    await cp(join(REPOSITORY, entry), join(root, entry), { recursive: true });
  }
  return root;
}

// The child must not inherit the test runner's own environment. `NODE_TEST_CONTEXT` makes a
// nested `node --test` report as a subtest of its parent and exit 0 whatever happens inside, so
// the first version of this file saw status 0 for a suite that was failing four tests. **A probe
// that silently fails to observe looks exactly like a guard that does not fire** -- recorded in
// this package once already, and repeated here.
const runSuite = (root, suite) => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  return spawnSync(process.execPath, ['--test', suite], { cwd: root, encoding: 'utf8', env });
};

test('the mutation-coverage ratchet fails when a real rule is reversed', async () => {
  const root = await repositoryCopy();
  const suite = 'test-kits/contracts/schema-mutation-coverage.test.mjs';

  // It must pass on an unmodified copy first — otherwise this test proves nothing about the
  // mutation, only that something is broken.
  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `the suite must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  // A real rule, in the contract every module composes: the envelope's closure against
  // undeclared properties.
  const schemaPath = join(root, 'contract-catalog/shared-kernel/ctr-api-001/schema.json');
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  schema.additionalProperties = true;
  await writeFile(schemaPath, `${JSON.stringify(schema)}\n`);

  const after = runSuite(root, suite);
  assert.notEqual(after.status, 0,
    'opening CTR-API-001 to undeclared properties must fail the mutation-coverage suite; '
    + 'a suite that passes this has stopped observing the catalog');
});

test('the conformance ratchet fails when a negative fixture stops being rejected', async () => {
  const root = await repositoryCopy();
  const suite = 'test-kits/contracts/shared-kernel-schema-conformance.test.mjs';

  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `the suite must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  // Widen the secret-handle pattern so a handle that is not a secret handle becomes valid — the
  // exact reversal two independent reviews used.
  const schemaPath = join(root, 'contract-catalog/shared-kernel/ctr-sec-001/schema.json');
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  schema.properties.handle.pattern = '^.*$';
  await writeFile(schemaPath, `${JSON.stringify(schema)}\n`);

  const after = runSuite(root, suite);
  assert.notEqual(after.status, 0,
    'widening the secret-handle pattern to ^.*$ must fail the conformance suite');
});
