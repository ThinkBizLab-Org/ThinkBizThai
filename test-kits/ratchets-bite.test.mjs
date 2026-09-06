import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, utimes, writeFile } from 'node:fs/promises';
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
// A ratchet that fills the disk it runs on is a ratchet someone turns off.
//
// Every case here copies the repository and removes it in a `finally`. That is correct while the
// process lives, and useless when it does not: a timeout, a Ctrl-C or an OOM kill leaves the copy
// behind. Measured after one session of iterating on a single case: 597 copies in the system
// temporary directory and 463 MB free on a 228 GB disk. Each copy had also been dragging ten agent
// worktrees, so they were 95 MB rather than 14 -- two independent defects compounding, and the
// timing numbers taken during that period were inflated by both, not by the recursion alone.
//
// So: sweep this suite's own leftovers before making another, and refuse to start when the sweep
// cannot get the count down. Refusing is the point. A silent accumulation is what turned a slow
// test into an unusable machine.
//
// And it must sweep only ITS OWN. The first version deleted every `ratchet-bite-*` directory it
// found, which is correct for one runner and wrong the moment there are two: four agent worktrees
// running this suite at once deleted each other's copies mid-run, and the cases then failed with
// ENOENT and `must pass on an unmodified copy` -- a guard reporting a wrong reason, which this
// package has already recorded as worse than a guard that stays silent. Three separate runs hit it
// within an hour and two of them diagnosed it independently before the cause was found.
//
// So the owning process id is IN THE NAME, and a copy is swept only when its owner is gone.
// `process.kill(pid, 0)` signals nothing and throws ESRCH when no such process exists; EPERM means
// it exists and belongs to someone else, which is still alive and still must not be touched.
//
// A pid is not an identity, though, and that is the hole the pid check opened while closing the
// other one. `process.kill(pid, 0)` answers "does SOME process hold this number", not "is the
// process that made this copy still alive". Pids are recycled -- macOS wraps at 99998 -- so an
// abandoned copy whose number comes back around reads as live forever: never swept, and, because
// the leftover COUNT also excludes live copies, never counted. It would sit there permanently,
// invisible to the very assertion written to notice accumulation. That is the 597-copy failure
// re-entering through the door its own fix opened, and it fails silently, which is worse.
//
// So liveness has a second condition, and it is the one thing a recycled pid cannot fake: age. No
// copy this suite makes outlives the run that made it by hours, so a copy past the floor cannot
// belong to a live run whatever its pid says, and one inside the floor is young enough that the
// pid check is answering about the right process. Twelve hours is far past the longest case ever
// measured here -- 2.3 hours, and that was the worktree-recursion defect fixed in 23c6d8b; cases
// run in seconds now -- which is deliberate. The floor is a backstop for a coincidence, not a
// second opinion on liveness, so it is set where it can only ever catch copies the pid check got
// wrong.
const COPY_PREFIX = 'ratchet-bite-';
const MAX_LEFTOVER_COPIES = 8;
const MAX_LIVE_COPY_AGE_MS = 12 * 60 * 60 * 1000;

// `ratchet-bite-<pid>-<random>`; anything without a parseable pid is from an older revision of this
// file and is treated as abandoned, which it is.
export function ownerOf(name) {
  const pid = Number(name.slice(COPY_PREFIX.length).split('-')[0]);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

export function stillRunning(pid) {
  if (pid === null) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code === 'EPERM'; }
}

// `mtime`, not `birthtime`. `birthtime` is not populated on every filesystem this can run on and
// silently reads as the epoch where it is missing, which would make every copy look ancient and
// hand the sweep back the deletion power this whole design took away from it. `mtime` is never
// EARLIER than creation, so its error runs in the safe direction only: a live copy can read as
// younger than it is, never older, and an abandoned copy's clock stops with the process that
// owned it and ages out exactly as intended.
export async function olderThanFloor(path, now = Date.now()) {
  // A copy that disappeared between the listing and the stat is already gone -- a concurrent
  // sweep's, most likely. Not abandoned, because there is nothing left to abandon.
  const stats = await stat(path).catch(() => null);
  if (stats === null) return false;
  return now - stats.mtimeMs > MAX_LIVE_COPY_AGE_MS;
}

export async function abandonedCopiesIn(dir) {
  const abandoned = [];
  for (const name of (await readdir(dir)).filter((entry) => entry.startsWith(COPY_PREFIX))) {
    if (!stillRunning(ownerOf(name)) || await olderThanFloor(join(dir, name))) abandoned.push(name);
  }
  return abandoned;
}

export async function sweepLeftoverCopies() {
  const dir = await realpath(tmpdir());
  for (const name of await abandonedCopiesIn(dir)) {
    await rm(join(dir, name), { recursive: true, force: true }).catch(() => {});
  }
  // Count only what this sweep was entitled to remove. A concurrent run's copies are not leftovers,
  // and refusing to start because a colleague is working is a guard that punishes parallelism.
  const left = await abandonedCopiesIn(dir);
  assert.ok(left.length <= MAX_LEFTOVER_COPIES,
    `${left.length} abandoned repository copies remain under ${dir} after sweeping, above the ${MAX_LEFTOVER_COPIES} this suite tolerates. `
    + 'Each is a full checkout. They accumulate when a run is killed before its cleanup, and they will fill the disk; '
    + 'remove them before running this suite again rather than letting it add more. '
    + 'Copies belonging to a running process are not counted and are never removed.');
}

async function repositoryCopy() {
  await sweepLeftoverCopies();
  // `realpath` the copy root. `$TMPDIR` on macOS is `/var/folders/…`, a symlink to
  // `/private/var/folders/…`, and `test-coverage-floor.test.mjs` resolves realpaths against the
  // working directory — so three of its tests failed on an unmodified copy and it was the one
  // suite left without a behaviour case. Independent review twenty-two said the obstacle was
  // removable and it was: one call, and the suite passes from a copy.
  const root = await realpath(await mkdtemp(join(tmpdir(), `${COPY_PREFIX}${process.pid}-`)));
  for (const entry of await readdir(REPOSITORY)) {
    // `node_modules` was the only exclusion, and that was enough until the agent harness began
    // creating linked git worktrees under `.claude/worktrees/` -- each a full checkout of this
    // repository. Ten of them stood at once: 80 MB of a 95 MB tree. Every copy this function makes
    // dragged them along, and a test that copies the repository and runs the whole check inside it
    // ran for 2.3 hours instead of seconds.
    //
    // Skipping `.claude` is safe and checked rather than assumed: the repository tracks no file
    // under it -- `git ls-files .claude` is empty -- and `.gitignore` excludes the worktrees. It is
    // harness state, not repository content. The assertion below is what stops this exclusion from
    // quietly becoming a hole.
    if (entry === 'node_modules' || entry === '.claude') continue;
    await cp(join(REPOSITORY, entry), join(root, entry), { recursive: true });
  }
  // A copy that lost the repository would make every reversal below pass over nothing.
  const copied = await readdir(root);
  assert.ok(copied.includes('contract-catalog') && copied.includes('scripts') && copied.includes('test-kits'),
    `the repository copy is missing top-level directories the reversals need: ${copied.join(', ')}`);
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

  let applied = 0;
  try {
  for (const [description, path, find, replace] of edits) {
    const target = join(root, path);
    const original = await readFile(target, 'utf8');
    assert.ok(original.includes(find), `${path} no longer contains ${JSON.stringify(find.slice(0, 60))}; the edit would be a no-op`);
    await writeFile(target, original.replace(find, replace));
    const after = runSuite(root, suite);
    await writeFile(target, original);
    assertFailed(after, `${suite} must notice: ${description}`);
    applied += 1;
  }
  assert.equal(applied, edits.length, `${suite}: ${applied} of ${edits.length} source edits executed`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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

  let applied = 0;
  try {
  for (const [description, path, mutate] of reversals) {
    const target = join(root, path);
    const original = await readFile(target, 'utf8');
    const document = JSON.parse(original);
    mutate(document);
    await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
    const after = runSuite(root, suite);
    await writeFile(target, original);
    assertFailed(after, `${suite} must notice: ${description}`);
    applied += 1;
  }
  // THE LOOP MUST CONSUME WHAT IT WAS HANDED. Independent review twenty-two wrote
  // `reversals.filter(() => false)` -- the runtime length assertion above still passed, all 30
  // tuples stayed in the file, and not one executed. The source-level blacklist that caught
  // `.slice(0, 0)` is a vocabulary, and `reversals.slice (0, 0)` defeats it with a space.
  //
  // Counting what ran cannot be satisfied by a spelling.
  assert.equal(applied, reversals.length,
    `${suite}: ${applied} of ${reversals.length} reversals executed`);
  } finally {
    // `rm` after the loop leaks a 7-13 MB copy on every failure, and a reviewer's job is to make
    // it fail: review twenty-two accumulated 23 directories and ~200 MB doing exactly that.
    await rm(root, { recursive: true, force: true });
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
    ['a Candidate contract promoted to a level the register does not define', 'contract-catalog/shared-kernel/index.json',
      (i) => { for (const e of i.contracts) if (e.status === 'Candidate') { e.status = 'Frozen'; break; } }],
    // A Draft counted as Candidate is the promotion that must never happen by drift. Five
    // contracts are Draft precisely because their co-owners have not signed, so this reversal
    // now names one of them rather than taking whichever came first.
    ['a co-owned Draft contract promoted without its co-owner', 'contract-catalog/shared-kernel/index.json',
      (i) => { for (const e of i.contracts) if (e.id === 'CTR-SEC-001') e.status = 'Candidate'; }],
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

test('the coverage-floor ratchet notices a guard stopped being enforced', async () => {
  // The last suite without a behaviour case, and the one that mattered most: independent review
  // twenty-two found that `assertNoPackageManagerConfig` and `assertDigestedFilesAreRegular` are
  // executed by **no test at all**, so `if (directory) return;` disabled the `.npmrc` guard at
  // exit 0 — reopening review seventeen's finding in full, with both CI steps green and zero
  // tests run.
  //
  // These two are the guards that close the two worst holes found in this repository: an npm
  // setting that silences every command, and a symlink that makes a digest vouch for a file
  // outside the tree.
  await mustNoticeSourceEdit('test-kits/test-coverage-floor.test.mjs', [
    ['the package-manager configuration check disabled',
      'scripts/verify-test-coverage-floor.mjs',
      'export async function assertNoPackageManagerConfig(directory = \'.\') {',
      'export async function assertNoPackageManagerConfig(directory = \'.\') {\n  if (directory) return;'],
    ['the regular-file check disabled, so a symlinked guard passes',
      'scripts/verify-test-coverage-floor.mjs',
      'export async function assertDigestedFilesAreRegular(manifestPath = INTEGRITY_MANIFEST) {',
      'export async function assertDigestedFilesAreRegular(manifestPath = INTEGRITY_MANIFEST) {\n  if (manifestPath) return;'],
    ['the digested-set ratchet disabled',
      'scripts/verify-test-coverage-floor.mjs',
      'export async function assertDigestedSetNeverShrinks(manifestPath = INTEGRITY_MANIFEST, floor = DIGESTED_FLOOR) {',
      'export async function assertDigestedSetNeverShrinks(manifestPath = INTEGRITY_MANIFEST, floor = DIGESTED_FLOOR) {\n  if (floor) return;'],
  ]);
});

// THE VERIFIER ITSELF, and the commit gate that believes it.
//
// `verify-clean-run.mjs` was pinned by two `assert.match` calls against its own SOURCE. The
// independent reviewer of this package gutted it while leaving both pinned substrings present but
// unreachable: it printed `clean: exit 0 — tests 260, pass 260, fail 0` while `npm run check`
// reported eight failing tests and a reversed contract rule. And the forged line satisfies
// `commit-when-clean.mjs`'s own clean-line regex, so ONE edit defeats the verifier and the commit
// gate together.
//
// That is the static-property class this file exists to retire -- "every static property of a file
// can be reproduced by a file that does nothing" -- never applied to the verifier itself. It is
// applied here.
//
// `commit-when-clean.mjs` was executed by NO test at all: its only appearances in the repository
// were two digest entries. Two one-line edits made it commit a tree with CTR-SEC-001's handle
// pattern widened to `^.*$`, at exit 0.
// The same environment the suite runner uses: NODE_TEST_CONTEXT makes a nested `node --test`
// report as a subtest and exit 0 whatever happens inside, and a probe that silently fails to
// observe looks exactly like a guard that does not fire.
const CHILD_ENV = (() => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  return env;
})();

async function reverseContractRule(root) {
  const path = join(root, 'contract-catalog/shared-kernel/ctr-sec-001/schema.json');
  const schema = JSON.parse(await readFile(path, 'utf8'));
  schema.properties.handle.pattern = '^.*$';
  await writeFile(path, `${JSON.stringify(schema, null, 2)}\n`);
}

test('the verifier cannot report clean over a failing check, and the gate refuses what it reports', async () => {
  // THE DEFECT. `verify-clean-run.mjs` was pinned by two `assert.match` calls against its own
  // SOURCE. The independent reviewer of this package gutted it while leaving both pinned
  // substrings present but unreachable: it printed `clean: exit 0 — tests 260, pass 260, fail 0`
  // over a check reporting eight failures and a reversed contract rule. The forged line also
  // satisfies `commit-when-clean.mjs`'s clean-line regex, so ONE edit defeated the verifier and
  // the commit gate together. Static properties again -- the class this file exists to retire,
  // never applied to the verifier itself.
  //
  // WHY THIS CALLS A FUNCTION INSTEAD OF RUNNING THE SCRIPT. `verify-clean-run.mjs` runs the WHOLE
  // check, and the check contains this suite, so a behaviour test that runs it re-enters itself.
  // Measured before that was understood: 2.3 hours, then 74 seconds after two narrowings, still
  // recursing and still red on its own control. The decision the script makes is pure -- given a
  // status and an output, is this clean -- so it is now separated into `decide()` and pinned here
  // with synthetic inputs. No copy, no recursion, milliseconds.
  const { decide } = await import('../scripts/verify-clean-run.mjs');
  const cleanOutput = ['ℹ tests 260', 'ℹ pass 260', 'ℹ fail 0', 'ℹ skipped 0', 'ℹ todo 0'].join('\n');

  const clean = decide(0, cleanOutput);
  assert.equal(clean.exit, 0, 'a check that exited 0 having run tests is clean');
  assert.ok(clean.stdout.some((line) => /^clean: exit 0/.test(line)), 'and says so in the line the commit gate reads');

  // The exact shape the gutted reporter produced: output that looks clean, status that is not.
  const liar = decide(1, cleanOutput);
  assert.notEqual(liar.exit, 0, 'a failing status must not be reported clean however clean the output looks');
  assert.ok(!liar.stdout.some((line) => /^clean: exit 0/.test(line)),
    'and the clean line must not be printed — that line is what commit-when-clean reads, and forging it defeats both');

  // The `.npmrc` case: exit 0 with nothing having run. Review seventeen turned every `npm run`
  // into a no-op with one line and this reporter called it clean.
  const ranNothing = decide(0, '');
  assert.equal(ranNothing.exit, 90, 'exit 0 with no passing test reported is not clean; something ran nothing');

  // A failing count is not a failing test, and quoting the wrong one is how this went unnoticed twice.
  const countFailure = decide(88, ['ℹ tests 260', 'ℹ pass 260', 'ℹ fail 0'].join('\n'));
  assert.equal(countFailure.exit, 88, 'the check\'s own code is passed through unchanged');
  assert.ok(countFailure.stderr.some((line) => /every test passed and the run still failed/.test(line)),
    'and the shape needs saying in words, because the numbers look clean');
});

test('the commit gate refuses a red tree, and is executed rather than digested', async () => {
  // `commit-when-clean.mjs` appeared in the repository only as two digest entries -- no test of
  // any kind executed it, and a digest pins bytes while only running the thing pins behaviour. Two
  // one-line edits made it commit a tree with CTR-SEC-001's handle pattern widened to `^.*$`.
  //
  // The copy is made red by a synthetic credential built here and never written into this
  // repository: `scan:secrets` is an early step of the check chain, so it fails in seconds without
  // the suite running, and nothing any guard pins is touched.
  const root = await repositoryCopy();
  try {
    const planted = ['AKIA', 'Q'.repeat(16)].join('');
    await writeFile(join(root, 'docs/planted-for-a-ratchet.md'), `key = ${planted}\n`);
    const message = join(root, 'commit-message.txt');
    await writeFile(message, 'probe: this commit must be refused\n');

    const gate = spawnSync('node', ['scripts/commit-when-clean.mjs', message], { cwd: root, encoding: 'utf8', env: CHILD_ENV });
    assertFailed(gate, 'the commit gate must refuse a tree the verifier reports NOT clean');
    assert.doesNotMatch(`${gate.stdout}${gate.stderr}`, /^\[.* [0-9a-f]{7}\]/m, 'and it must not have produced a commit');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// The sweeper's own case, added after it deleted four concurrent runs' repository copies.
//
// It is not testing tidiness. A sweep that removes a copy another process is executing inside makes
// that process fail with ENOENT and `must pass on an unmodified copy` -- a guard reporting a reason
// that is not the reason, which is the failure mode this whole file exists to prevent in others.
test('the sweep removes an abandoned copy and never one a live process owns', async () => {
  const dir = await realpath(tmpdir());

  // A pid that is certainly gone: spawn something trivial and wait for it to exit.
  const dead = spawnSync(process.execPath, ['-e', 'process.exit(0)']);
  assert.equal(dead.status, 0);
  const deadPid = dead.pid;
  assert.equal(stillRunning(deadPid), false, 'a process that has exited must not read as running');
  assert.equal(stillRunning(process.pid), true, 'this process must read as running');

  const mine = join(dir, `${COPY_PREFIX}${process.pid}-live-case`);
  const theirs = join(dir, `${COPY_PREFIX}${deadPid}-abandoned-case`);
  await mkdir(mine, { recursive: true });
  await mkdir(theirs, { recursive: true });

  try {
    await sweepLeftoverCopies();
    // The half that was broken: a copy owned by a running process survives a sweep.
    assert.ok(existsSync(mine), 'the sweep removed a copy owned by a live process — this is what deleted '
      + "four concurrent runs' repositories mid-test");
    // The half that already worked, and must keep working: an abandoned copy is removed, because
    // the reason this sweep exists is 597 leftovers and a full disk.
    assert.ok(!existsSync(theirs), 'the sweep left behind a copy whose owner is gone');
  } finally {
    await rm(mine, { recursive: true, force: true });
    await rm(theirs, { recursive: true, force: true });
  }

  // A name from before pids were in it has no owner, so it is abandoned by definition.
  assert.equal(ownerOf(`${COPY_PREFIX}Ab3xY9`), null);
  assert.equal(ownerOf(`${COPY_PREFIX}${process.pid}-Ab3xY9`), process.pid);
});

// The age floor's own case. The pid check alone cannot be tested against a recycled pid -- you
// cannot ask the operating system to hand a specific number back -- but the situation it produces
// can be built exactly: a copy whose pid IS live and which is far too old to belong to that
// process. Before the floor, the sweep read that as live and left it, forever, uncounted.
test('the sweep removes a copy past the age floor even when its pid reads as live', async () => {
  const dir = await realpath(tmpdir());
  // This process's own pid, so `stillRunning` is certainly true: the ONLY thing that can condemn
  // these directories is their age. That is what makes the two of them a pair -- same owner, same
  // everything, and only the clock between them.
  const recycled = join(dir, `${COPY_PREFIX}${process.pid}-recycled-pid-case`);
  const fresh = join(dir, `${COPY_PREFIX}${process.pid}-fresh-case`);
  await mkdir(recycled, { recursive: true });
  await mkdir(fresh, { recursive: true });

  // An hour past the floor, not a second past it: a boundary case would pass on a sweep that
  // compared the wrong way round, and this is asserting the direction as much as the threshold.
  const stale = (Date.now() - MAX_LIVE_COPY_AGE_MS - 3_600_000) / 1000;
  await utimes(recycled, stale, stale);

  try {
    assert.equal(stillRunning(ownerOf(`${COPY_PREFIX}${process.pid}-recycled-pid-case`)), true,
      'the fixture is void unless the pid genuinely reads as live -- that is the whole situation');
    assert.equal(await olderThanFloor(recycled), true, 'a copy backdated past the floor must read as past it');
    assert.equal(await olderThanFloor(fresh), false, 'a copy made moments ago must not');

    await sweepLeftoverCopies();
    // The gap this closes: a live pid is no longer a permanent exemption. Without the floor this
    // directory survives every sweep this repository will ever run, and the leftover count -- which
    // excludes live copies -- never sees it either, so the guard cannot fire on it.
    assert.ok(!existsSync(recycled),
      'a copy older than any run could possibly be survived the sweep because its pid was reused — '
      + 'that copy can never be removed and is never counted, which is the silent accumulation this suite exists to stop');
    // And the floor must not have cost us the fix it backstops: a live run's copy is young, and
    // young plus live still means untouchable.
    assert.ok(existsSync(fresh), 'the age floor swept a live run’s copy — the concurrency defect, reintroduced');
  } finally {
    await rm(recycled, { recursive: true, force: true });
    await rm(fresh, { recursive: true, force: true });
  }

  // A vanished copy is not abandoned. `abandonedCopiesIn` lists names and then stats them, and
  // between those two steps a concurrent sweep can remove one; reporting it as abandoned would
  // inflate the count that decides whether this suite refuses to start.
  assert.equal(await olderThanFloor(join(dir, `${COPY_PREFIX}${process.pid}-was-never-here`)), false);
});
