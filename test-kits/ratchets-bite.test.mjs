import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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
  if (result.status === null) {
    assert.fail(`${message}: the child never ran (signal ${result.signal ?? 'none'}). `
      + 'This is not a guard failure — check disk space and process limits before reading it as one.');
  }
  assert.ok(result.status !== 0, `${message} (status ${result.status})\n${result.stdout}${result.stderr}`);
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
// The same shape for a suite whose enforcement lives in a SCRIPT: reverse a rule in the script
// and require the suite that proves it to fail. Independent review twenty-one showed why the
// distinction I drew two waves ago -- "hollowing these removes the proof, not the enforcement" --
// was only half true: hollow the proof AND edit the script, and the enforcement goes with it.
//
// It turned the secret scanner off with one line (`if (isProsePath(relativePath)) return [];`,
// extending a PII exemption to every credential rule), hollowed the two suites that would have
// noticed, and committed an AWS key pair under `evidence/`. **exit 0.** "Never commit API keys,
// tokens, passwords" is the first non-negotiable rule in CONTRIBUTING_AGENTS.md.
async function mustNoticeSourceEdit(suite, edits) {
  assert.ok(edits.length >= 2, `${suite} must be probed with at least two source edits, got ${edits.length}`);
  const root = await repositoryCopy();
  const before = runSuite(root, suite);
  assert.equal(before.status, 0, `${suite} must pass on an unmodified copy:\n${before.stdout}${before.stderr}`);

  for (const [description, path, find, replace] of edits) {
    const target = join(root, path);
    const original = await readFile(target, 'utf8');
    assert.ok(original.includes(find), `${path} no longer contains ${JSON.stringify(find.slice(0, 60))}; the edit would be a no-op`);
    await writeFile(target, original.replace(find, replace));
    const after = runSuite(root, suite);
    await writeFile(target, original);
    assertFailed(after, `${suite} must notice: ${description}`);
  }
  await rm(root, { recursive: true, force: true });
}

async function mustNotice(suite, reversals) {
  // At least two, asserted HERE rather than by counting source lines. Independent review
  // twenty-one wrote `reversals.slice(0, 0)` into the loop below: the 23 tuples stayed in the
  // file, the source-line count still read 23, and **not one of them executed** -- twelve
  // behaviour cases became no-ops that still printed a tick, and a hollowed
  // `catalog-registry.test.mjs` then shipped CTR-SEC-001 as `Frozen` with its security co-owner
  // dropped, at exit 0.
  //
  // A check inside the thing it constrains cannot be satisfied by dead syntax.
  assert.ok(reversals.length >= 2, `${suite} must be probed with at least two reversals, got ${reversals.length}`);
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
  // Independent review twenty-one filled a disk running this file four times: 35 whole-repository
  // copies per run, ~840 MB, never removed. A guard that exhausts the machine it runs on is a
  // guard that gets deleted, and the failure mode is `spawnSync` returning `status: null`, which
  // this file used to report as "the suite must pass on an unmodified copy" -- a misleading reason
  // for a disk-full condition.
  await rm(root, { recursive: true, force: true });
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

// GENERATED, not listed. Independent review twenty-one reduced `catalog-registry.test.mjs` from
// 803 lines to 90 -- fourteen tests carrying the original names, and exactly three real pins, the
// three this case used to reverse -- and shipped A6 dropped as co-owner of CTR-AUD-001,
// CTR-OBS-001 and CTR-USG-001, with CTR-MOD-001's freeze requirements emptied. **exit 0.**
//
// Reimplementing three named pins costs three lines. Reimplementing a cross-product over every
// contract and every pinned field IS the suite, which is the property this file claims and did not
// have. Reversal *diversity*, not reversal count.
test('the registry ratchet notices a reversal in every contract it pins', async () => {
  const contracts = (await readdir(join(REPOSITORY, 'contract-catalog/shared-kernel'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.ok(contracts.length >= 14, `expected the shared-kernel catalog, found ${contracts.length} contract(s)`);

  const reversals = [];
  for (const contract of contracts) {
    const manifestPath = `contract-catalog/shared-kernel/${contract}/manifest.json`;
    reversals.push([`${contract} promoted out of its freeze level`, manifestPath,
      (m) => { m.status = 'Frozen'; }]);
    // `owner = 'A0'` was my first version and it is a no-op for the contracts A0 already owns --
    // the case failed on `ctr-api-001` for that reason, which is the fifth time a reversal here
    // has been aimed at something that was not a change. A value no contract can legitimately
    // carry is a change for every one of them.
    reversals.push([`${contract} reassigned to an owner that does not exist`, manifestPath,
      (m) => { m.owner = 'nobody'; }]);
  }
  reversals.push(['the freeze requirements emptied in the index', 'contract-catalog/shared-kernel/index.json',
    (i) => { for (const entry of i.contracts) entry.required_before_freeze = []; }]);
  reversals.push(['a security caveat inverted', 'contract-catalog/shared-kernel/ctr-sec-001/manifest.json',
    (m) => { m.untestable_by_fixture = 'Every claim this contract makes is demonstrated by its fixtures.'; }]);

  await mustNotice('test-kits/contracts/catalog-registry.test.mjs', reversals);
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
  await rm(root, { recursive: true, force: true });
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
  await rm(root, { recursive: true, force: true });
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
  await rm(root, { recursive: true, force: true });
});

test('the secret-scan ratchet notices a rule removed from the scanner', async () => {
  await mustNoticeSourceEdit('test-kits/secret-scan.test.mjs', [
    ['the prose exemption widened from PII to every credential rule',
      'scripts/scan-repository-secrets.mjs',
      'function isProsePath(relativePath) {',
      'function isProsePath(relativePath) {\n  if (relativePath) return true;'],
    // Written as a filter rather than by rewriting the declaration: the scanner reads this file
    // too, and an uppercase identifier followed by `=` and a literal is exactly what its
    // `secret-named-assignment` rule matches. My first version made the scanner report the test
    // that proves the scanner works.
    ['every credential rule filtered out at the point of use',
      'scripts/scan-repository-secrets.mjs',
      '  ...CREDENTIAL_RULES.map((rule) => ({ ...rule, kind: \'credential\' })),',
      '  ...[].map((rule) => ({ ...rule, kind: \'credential\' })),'],
  ]);
});

test('the ci-guard ratchet notices a guard stubbed at its entry point', async () => {
  await mustNoticeSourceEdit('test-kits/ci-guard-behaviour.test.mjs', [
    ['the branch-scope guard stopped reporting stray paths',
      'scripts/verify-branch-scope.mjs',
      'const stray = undeclared(changed, declaredPaths(manifest));',
      'const stray = [];'],
    ['the branch-identity guard resolving every branch to one package',
      'scripts/verify-branch-identity.mjs',
      '  const report = reportFor(headRef, await claimantsOf(headRef));',
      "  const report = { code: 0, message: 'WP-0A-A0-001' };"],
  ]);
});

// `test-coverage-floor.test.mjs` has NO behaviour case, and the reason is worth writing down
// rather than leaving as an omission. It cannot pass from a copy at all: macOS `$TMPDIR` is
// `/var/folders/…`, a symlink to `/private/var/folders/…`, and that suite resolves realpaths and
// compares them against the working directory -- three of its tests fail on an unmodified copy
// before any mutation. Forcing it to pass would mean weakening exactly the path checks that make
// it worth having.
//
// It is the one suite here whose enforcement lives in a script AND whose proof cannot be probed
// this way. Its script is reached by every other case in this file, because `runSuite` runs
// `node --test` and the guard runs in the chain; what is not covered is the proof. Recorded on the
// "not closed" list rather than papered over.
