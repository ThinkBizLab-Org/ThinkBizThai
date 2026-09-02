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

// The two cases above cover the mutation walk and the conformance suite. The rest of the ratchets
// -- the caveat and annotation digests, the fixture set, the index key sets, the reference
// restriction, the approval check -- were still pinned only statically, so hollowing
// `catalog-registry.test.mjs` alone switches off every pin it carries.
//
// One case per suite, each reversing something that suite exists to notice. They are written out
// rather than generated from a table for the reason recorded two waves ago: a test generated in a
// loop is one the declaration counter cannot see.

test('the registry ratchet fails when a caveat is rewritten into its opposite', async () => {
  const root = await repositoryCopy();
  const suite = 'test-kits/contracts/catalog-registry.test.mjs';
  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `the suite must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  const manifestPath = join(root, 'contract-catalog/shared-kernel/ctr-sec-001/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.untestable_by_fixture = 'Every claim this contract makes is demonstrated by its fixtures.';
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const after = runSuite(root, suite);
  assert.notEqual(after.status, 0,
    'inverting CTR-SEC-001\'s admission that its fixtures cannot demonstrate a claim must fail the registry suite');
});

test('the catalog-group ratchet fails when a schema holds an empty combinator', async () => {
  const root = await repositoryCopy();
  const suite = 'test-kits/contracts/catalog-groups.test.mjs';
  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `the suite must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  const schemaPath = join(root, 'contract-catalog/shared-kernel/ctr-evt-001/schema.json');
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  schema.properties.causation_id.not = {};
  await writeFile(schemaPath, `${JSON.stringify(schema)}\n`);

  const after = runSuite(root, suite);
  assert.notEqual(after.status, 0, '`not: {}` rejects every document at that location and must fail the group suite');
});

test('the reference ratchet fails when a $ref reaches outside a governed contract', async () => {
  const root = await repositoryCopy();
  const suite = 'test-kits/contracts/catalog-reference-integrity.test.mjs';
  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `the suite must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  const schemaPath = join(root, 'contract-catalog/shared-kernel/ctr-api-001/schema.json');
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  schema.properties.data.$ref = './vocab/schema.json';
  await writeFile(schemaPath, `${JSON.stringify(schema)}\n`);

  const after = runSuite(root, suite);
  assert.notEqual(after.status, 0, 'a $ref into a directory no ratchet iterates must fail the reference suite');
});

// Four contract suites had no behaviour case, which is four files whose hollowing still ships a
// rule. Listing what is covered and what is not is the point of doing this by name rather than by
// a table: the gap is visible.

test('the envelope ratchet fails when a required field stops being required', async () => {
  const root = await repositoryCopy();
  const suite = 'test-kits/contracts/shared-kernel-envelope-contracts.test.mjs';
  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `the suite must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  const schemaPath = join(root, 'contract-catalog/shared-kernel/ctr-ten-001/schema.json');
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  schema.required = schema.required.filter((name) => name !== 'workspace_id');
  await writeFile(schemaPath, `${JSON.stringify(schema)}\n`);

  const after = runSuite(root, suite);
  assert.notEqual(after.status, 0,
    'a tenant context that need not name a workspace must fail the envelope suite');
});

test('the catalog ratchet fails when a Candidate contract is promoted', async () => {
  const root = await repositoryCopy();
  const suite = 'test-kits/contracts/shared-kernel-contract-catalog.test.mjs';
  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `the suite must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  const indexPath = join(root, 'contract-catalog/shared-kernel/index.json');
  const index = JSON.parse(await readFile(indexPath, 'utf8'));
  for (const entry of index.contracts) if (entry.status === 'Candidate') { entry.status = 'Frozen'; break; }
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);

  const after = runSuite(root, suite);
  assert.notEqual(after.status, 0, 'promoting a contract to a level the register does not define must fail');
});

test('the schema-ref ratchet fails when the bound on a schema reference is lifted', async () => {
  const root = await repositoryCopy();
  const suite = 'test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs';
  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `the suite must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  const schemaPath = join(root, 'contract-catalog/shared-kernel/ctr-evt-001/schema.json');
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  schema.properties.metadata.properties.schema_ref.maxLength = 4096;
  await writeFile(schemaPath, `${JSON.stringify(schema)}\n`);

  const after = runSuite(root, suite);
  assert.notEqual(after.status, 0, 'a 4096-character schema reference must fail the bounds suite');
});

test('the job-reference ratchet fails when a job reference stops being bounded', async () => {
  const root = await repositoryCopy();
  const suite = 'test-kits/contracts/ctr-job-001-reference-hardening.test.mjs';
  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `the suite must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  // The reversal the suite actually notices, found by reading it rather than assuming: this field
  // is bounded by an allow-listed SCHEME, not by a length. My first version deleted a `maxLength`
  // that field does not have, and the case passed for the wrong reason -- the same defect this
  // package has recorded three times, caught here by the unmodified-copy assertion above failing
  // to be followed by a failure.
  const schemaPath = join(root, 'contract-catalog/shared-kernel/ctr-job-001/schema.json');
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  schema.properties.result_ref.pattern = '^.*$';
  await writeFile(schemaPath, `${JSON.stringify(schema)}\n`);

  const after = runSuite(root, suite);
  assert.notEqual(after.status, 0,
    'a job result reference that accepts any string at all must fail the hardening suite');
});
