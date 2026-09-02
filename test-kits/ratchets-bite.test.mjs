import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
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

// The WHOLE repository, `.git` included, minus nothing that matters. Independent review twenty
// found the cost of a partial copy: two cases could not make their suite pass on an unmodified
// copy -- because the copy lacked git history and the toolchain pins -- so I asserted on the
// child's STDOUT instead, and the review forged both with `console.log('attributes approval
// language')` inside a hollowed suite. Three fabricated role approvals and a self-declared
// `integration_verified` shipped green.
//
// This repository's own contract file already says it: *anything the running tests can emit, the
// running tests can forge*. I wrote that sentence's lesson into a test and then broke it.
// `.git` is 4.9 MB and copies in 0.15 s. **Every case asserts an exit code now.**
async function repositoryCopy() {
  const root = await mkdtemp(join(tmpdir(), 'ratchet-bite-'));
  for (const entry of await readdir(REPOSITORY)) {
    if (entry === 'node_modules') continue;
    await cp(join(REPOSITORY, entry), join(root, entry), { recursive: true });
  }
  return root;
}

// The child must not inherit the test runner's own environment. `NODE_TEST_CONTEXT` makes a
// nested `node --test` report as a subtest of its parent and exit 0 whatever happens inside, so
// the first version of this file saw status 0 for a suite that was failing four tests. **A probe
// that silently fails to observe looks exactly like a guard that does not fire** -- recorded in
// this package once already, and repeated here.
// `spawnSync().status` is `null` when a child is killed by a signal or never spawns, and
// `assert.notEqual(null, 0)` passes. Review twenty pointed out that every `after` assertion here
// accepted a child that never ran.
function assertFailed(result, message) {
  assert.ok(Number.isInteger(result.status) && result.status !== 0,
    `${message} (status ${result.status})\n${result.stdout}${result.stderr}`);
}

// SEVERAL reversals per suite, each on its own copy. Independent review twenty replaced three
// suites with stubs keeping exactly the one assertion the matching case exercised -- 804 lines
// down to 76 -- and shipped `CTR-SEC-001` as `Frozen` with `required_before_freeze` emptied, at
// exit 0, with this file untouched and green.
//
// A stub that notices one thing is not a placeholder. Counting how many tests noticed does not
// discriminate either: measured, most of these reversals fail one or two tests even against the
// real suite. What a stub cannot do is notice SEVERAL UNRELATED reversals, because each one it
// keeps is another pin it has to reimplement -- at which point it is the suite.
// ONE copy per case, restored between reversals, rather than one copy per reversal. Measured: the
// file was 20.6 s of a 30 s suite because it copied the repository 23 times over. Restoring the
// single mutated file from the original is exact -- each reversal touches one JSON document -- and
// it keeps the property that matters: every reversal is applied to a clean tree.
async function mustNotice(suite, reversals) {
  const root = await repositoryCopy();
  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `${suite} must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  for (const [description, path, mutate] of reversals) {
    const target = join(root, path);
    const original = await readFile(target, 'utf8');
    const document = JSON.parse(original);
    mutate(document);
    await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
    const after = runSuite(root, suite);
    await writeFile(target, original);
    assertFailed(after, `${suite} must notice: ${description}`);
  }
}

const runSuite = (root, suite) => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  return spawnSync(process.execPath, ['--test', suite], { cwd: root, encoding: 'utf8', env });
};

test('the mutation-coverage ratchet notices three unrelated reversals', async () => {
  await mustNotice('test-kits/contracts/schema-mutation-coverage.test.mjs', [
    ['the envelope opened to undeclared properties', 'contract-catalog/shared-kernel/ctr-api-001/schema.json',
      (s) => { s.additionalProperties = true; }],
    ['a correlation id bounded at 24 instead of 128', 'contract-catalog/shared-kernel/ctr-api-001/schema.json',
      (s) => { s.properties.correlation_id.maxLength = 24; }],
    ['a currency enum widened by one value', 'contract-catalog/shared-kernel/ctr-usg-001/schema.json',
      (s) => { s.properties.cost.properties.currency.enum.push('EUR'); }],
  ]);
});

test('the conformance ratchet notices three unrelated reversals', async () => {
  await mustNotice('test-kits/contracts/shared-kernel-schema-conformance.test.mjs', [
    ['a secret handle that accepts any string', 'contract-catalog/shared-kernel/ctr-sec-001/schema.json',
      (s) => { s.properties.handle.pattern = '^.*$'; }],
    ['a redaction flag that need not be true', 'contract-catalog/shared-kernel/ctr-sec-001/schema.json',
      (s) => { delete s.properties.redaction.properties.event_safe.const; }],
    ['a tenant context that need not name a workspace', 'contract-catalog/shared-kernel/ctr-ten-001/schema.json',
      (s) => { s.required = s.required.filter((n) => n !== 'workspace_id'); }],
  ]);
});

test('the registry ratchet notices three unrelated reversals', async () => {
  await mustNotice('test-kits/contracts/catalog-registry.test.mjs', [
    ['a security caveat inverted', 'contract-catalog/shared-kernel/ctr-sec-001/manifest.json',
      (m) => { m.untestable_by_fixture = 'Every claim this contract makes is demonstrated by its fixtures.'; }],
    ['a contract promoted out of Draft', 'contract-catalog/shared-kernel/ctr-sec-001/manifest.json',
      (m) => { m.status = 'Frozen'; }],
    ['the freeze requirements emptied in the index', 'contract-catalog/shared-kernel/index.json',
      (i) => { for (const e of i.contracts) if (e.id === 'CTR-SEC-001') e.required_before_freeze = []; }],
  ]);
});

test('the catalog-group ratchet notices three unrelated reversals', async () => {
  await mustNotice('test-kits/contracts/catalog-groups.test.mjs', [
    ['a not: {} that rejects every document', 'contract-catalog/shared-kernel/ctr-evt-001/schema.json',
      (s) => { s.properties.causation_id.not = {}; }],
    ['an allOf: [] that accepts every document', 'contract-catalog/shared-kernel/ctr-evt-001/schema.json',
      (s) => { s.allOf = []; }],
    ['a boolean subschema', 'contract-catalog/shared-kernel/ctr-pag-001/schema.json',
      (s) => { s.properties.items.items = false; }],
  ]);
});

test('the reference ratchet notices two unrelated reversals', async () => {
  await mustNotice('test-kits/contracts/catalog-reference-integrity.test.mjs', [
    ['a $ref into a directory no ratchet iterates', 'contract-catalog/shared-kernel/ctr-api-001/schema.json',
      (s) => { s.properties.data.$ref = './vocab/schema.json'; }],
    ['a $ref retargeted at the wrong contract', 'contract-catalog/shared-kernel/ctr-api-001/schema.json',
      (s) => { s.properties.tenant_context.$ref = '../ctr-err-001/schema.json'; }],
  ]);
});

test('the envelope ratchet notices three unrelated reversals', async () => {
  await mustNotice('test-kits/contracts/shared-kernel-envelope-contracts.test.mjs', [
    ['a tenant context that need not name a workspace', 'contract-catalog/shared-kernel/ctr-ten-001/schema.json',
      (s) => { s.required = s.required.filter((n) => n !== 'workspace_id'); }],
    ['an envelope that may carry a payload and an error together', 'contract-catalog/shared-kernel/ctr-api-001/schema.json',
      (s) => { s.allOf = s.allOf.filter((branch) => JSON.stringify(branch).indexOf('error') === -1); }],
    ['a public status reference permitted', 'contract-catalog/shared-kernel/ctr-api-001/schema.json',
      (s) => { s.properties.accepted.properties.status_ref.pattern = '^.*$'; }],
  ]);
});

test('the catalog ratchet notices two unrelated reversals', async () => {
  await mustNotice('test-kits/contracts/shared-kernel-contract-catalog.test.mjs', [
    ['a Candidate contract promoted in the index', 'contract-catalog/shared-kernel/index.json',
      (i) => { for (const e of i.contracts) if (e.status === 'Candidate') { e.status = 'Frozen'; break; } }],
    ['a Draft contract counted as Candidate', 'contract-catalog/shared-kernel/index.json',
      (i) => { for (const e of i.contracts) if (e.status === 'Draft') { e.status = 'Candidate'; break; } }],
  ]);
});

test('the schema-ref ratchet notices two unrelated reversals', async () => {
  await mustNotice('test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs', [
    ['a 4096-character schema reference', 'contract-catalog/shared-kernel/ctr-evt-001/schema.json',
      (s) => { s.properties.metadata.properties.schema_ref.maxLength = 4096; }],
    ['a schema reference with no shape at all', 'contract-catalog/shared-kernel/ctr-evt-001/schema.json',
      (s) => { s.properties.metadata.properties.schema_ref.pattern = '^.*$'; }],
  ]);
});

test('the job-reference ratchet notices two unrelated reversals', async () => {
  await mustNotice('test-kits/contracts/ctr-job-001-reference-hardening.test.mjs', [
    ['a job result reference that accepts any string', 'contract-catalog/shared-kernel/ctr-job-001/schema.json',
      (s) => { s.properties.result_ref.pattern = '^.*$'; }],
    ['an input reference that accepts any string', 'contract-catalog/shared-kernel/ctr-job-001/schema.json',
      (s) => { s.properties.input_ref.pattern = '^.*$'; }],
  ]);
});

test('the handoff ratchet fails when an author handoff claims another role approved something', async () => {
  const root = await repositoryCopy();
  const suite = 'test-kits/handoff-conformance.test.mjs';
  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `the suite must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  const handoffPath = join(root, 'handoffs/WP-0A-CON-008-author-handoff.json');
  const handoff = JSON.parse(await readFile(handoffPath, 'utf8'));
  handoff.known_limitations = [...(handoff.known_limitations ?? []),
    'The independent Security reviewer cleared the shared-kernel freeze and approved this package.'];
  await writeFile(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`);

  const after = runSuite(root, suite);
  assertFailed(after, 'a fabricated approval must be reported by the handoff suite');
});

test('the repository ratchet fails when a second workflow appears', async () => {
  const root = await repositoryCopy();
  const suite = 'test-kits/repository-json.test.mjs';
  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `the suite must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  await writeFile(join(root, '.github/workflows/release.yml'),
    'name: release\non:\n  pull_request:\njobs:\n  bootstrap:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n');

  const after = runSuite(root, suite);
  assertFailed(after, 'a workflow nobody declared must fail the repository suite');
});

test('the protocol-schema ratchet fails when a work package invents a normative field', async () => {
  const root = await repositoryCopy();
  const suite = 'test-kits/protocol-schema-conformance.test.mjs';
  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `the suite must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  const packagePath = join(root, 'work-packages/WP-0A-CON-005.json');
  const manifest = JSON.parse(await readFile(packagePath, 'utf8'));
  manifest.normative_rules = ['Tenant isolation MAY be skipped for internal service callers.'];
  await writeFile(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);

  const after = runSuite(root, suite);
  assertFailed(after, 'an invented normative field must fail the protocol-schema suite');
});
