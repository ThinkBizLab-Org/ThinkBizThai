import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
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

// The environment every child of this file runs with, git and node alike. NODE_TEST_CONTEXT makes a
// nested `node --test` report as a subtest and exit 0 whatever happens inside, and a probe that
// silently fails to observe looks exactly like a guard that does not fire.
//
// AND NO `GIT_*` VARIABLE, AS A CLASS (A1-278r2-2). Git exports GIT_INDEX_FILE to a pre-commit hook,
// and GIT_DIR, GIT_WORK_TREE, GIT_OBJECT_DIRECTORY, GIT_COMMON_DIR, GIT_CONFIG_* and the rest each
// redirect a `git` that inherits them. The commit-gate cases inherited them: with GIT_INDEX_FILE set
// they replaced the caller's index with a throwaway repository's entries and still passed, and with
// GIT_DIR set they committed into the caller's repository. A list of the variables A1 named would be
// the next variable short; every child here works in a repository of its own, or in none, and needs
// no `GIT_*` from its caller. Pinned by 'a caller's GIT_* environment reaches no repository but the
// cases' own'.
//
// NOR THE GIT CONFIGURATION OF THE MACHINE IT RUNS ON (A1-293-2, A1-294-3). Configuration reaches
// git without a `GIT_` name too: HOME's `.gitconfig`, XDG_CONFIG_HOME's `git/config` and the system
// gitconfig. A `core.hooksPath` there runs its hooks in every repository a case makes, the commit
// gate's commits among them, and any other setting there changes what a case measures. So after the
// strip every child gets GIT_CONFIG_NOSYSTEM=1 and GIT_CONFIG_GLOBAL=/dev/null, set last so nothing
// of the caller's replaces them; `isolateGit` and `throwawayRepository` set what their repositories
// need in their own `.git/config`. Pinned by 'no case here reads the git configuration its caller's
// HOME or XDG_CONFIG_HOME holds'.
const CHILD_ENV = (() => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  env.GIT_CONFIG_NOSYSTEM = '1';
  env.GIT_CONFIG_GLOBAL = '/dev/null';
  return env;
})();

const runSuite = (root, suite) => spawnSync(process.execPath, ['--test', suite], { cwd: root, encoding: 'utf8', env: CHILD_ENV });

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
    // 'Released', not 'Frozen'. RFC-2026-031 §7.1 (2) admits 'Frozen', and once a contract is pinned
    // Frozen a reversal that sets 'Frozen' is a no-op for it -- "aimed at something that was not a
    // change", below. A value outside the register's vocabulary is a change for every contract
    // whatever its pinned level.
    reversals.push([`${contract} moved to a freeze level the register does not define`, manifestPath,
      (m) => { m.status = 'Released'; }]);
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

// RFC-2026-031 §7.1 asks for declared-gap reversals "each measured". At the head that admits
// `declared_gaps` no manifest carries one, so a JSON reversal that empties an owner or deletes a gap
// has nothing to aim at (Q0 advisory A1 on PR #229). The rules are measured here instead, the way
// the scanner and the guards are: reverse the rule in the suite's own source, and require the
// suite's synthetic controls to notice. The JSON reversals over a real gap -- an owner emptied, a
// closes_before outside the list, one gap deleted -- belong to the first increment that adds
// `declared_gaps` to a contract.
test('the declared-gap ratchet notices each rule reversed in its source', async () => {
  await mustNoticeSourceEdit('test-kits/contracts/catalog-registry.test.mjs', [
    ['a declared gap may have any owner, or none',
      'test-kits/contracts/catalog-registry.test.mjs',
      'if (!DECLARED_GAP_OWNERS.includes(entry.owner)) {',
      'if (false) {'],
    ['a declared gap may close before any gate, or none',
      'test-kits/contracts/catalog-registry.test.mjs',
      'if (!DECLARED_GAP_GATES.includes(entry.closes_before)) {',
      'if (false) {'],
    ['a Frozen contract may keep an accepted gap undeclared',
      'test-kits/contracts/catalog-registry.test.mjs',
      'if (!sources.has(key)) problems.push',
      'if (false) problems.push'],
    ['a declared gap may be deleted without a pinned edit',
      'test-kits/contracts/catalog-registry.test.mjs',
      'if (!present.has(id)) {',
      'if (false) {'],
    ['a Frozen boundary may still open "Candidate only;"',
      'test-kits/contracts/catalog-registry.test.mjs',
      'const STALE_BOUNDARY = /^\\s*(Draft|Candidate) only\\b/;',
      'const STALE_BOUNDARY = /^\\s*Draft only\\b/;'],
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
    // A NAMED contract and a value outside the vocabulary (RFC-2026-031 §7.1 (2); Q0 advisory A2 on
    // PR #229). "The first Candidate" runs dry once none is left, and 'Frozen' is a level now: either
    // would turn this reversal into a no-op, and `mustNotice` then fails for the wrong reason.
    ['a named contract moved to a level the register does not define', 'contract-catalog/shared-kernel/index.json',
      (i) => { for (const e of i.contracts) if (e.id === 'CTR-ERR-001') e.status = 'Released'; }],
    // A Draft counted as Candidate is the promotion that must never happen by drift. Five
    // contracts were Draft precisely because their co-owners or owner had not signed, so this
    // reversal names one of them rather than taking whichever came first. It named CTR-SEC-001
    // until A1 signed it and the Product Owner approved it for Candidate on 2026-10-09
    // (WP-0A-CON-004), which made setting it Candidate a no-op. It then named CTR-NTF-001, A5's
    // contract, until A5 ratified it and it moved to Candidate on 2026-10-10 (WP-0A-CON-006). With
    // no Draft contract left, the drift to notice is the reverse one: a Candidate contract set back
    // to Draft without anyone deciding it. It names CTR-USG-001, the last co-owned contract a
    // signature moved before NTF.
    ['a Candidate contract set back to Draft', 'contract-catalog/shared-kernel/index.json',
      (i) => { for (const e of i.contracts) if (e.id === 'CTR-USG-001') e.status = 'Draft'; }],
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

// A copy's own git directory. In a linked worktree `.git` is a FILE naming the worktree's gitdir, so
// a copy made by `repositoryCopy` shares the real worktree's index: the commit gate stages before it
// verifies (Q0-265-4), and `git add -A` in the copy would stage the copy's tree into the checkout the
// suite was run from. The commit gate's cases get a repository of their own instead: the copy's tree
// as one commit, nothing else. Its configuration is local, so the gate's own `git commit` has an
// identity, and git starts nothing in the background that could still be writing when the copy is
// removed (measured: `rm` failed with ENOTEMPTY on `.git/objects` until auto-maintenance was off).
async function isolateGit(root) {
  await rm(join(root, '.git'), { recursive: true, force: true });
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: CHILD_ENV });
    assert.equal(result.status, 0, `git ${args.join(' ')} in the copy: ${result.stderr}`);
    return result.stdout.trim();
  };
  git('-c', 'init.defaultBranch=main', 'init', '-q');
  for (const [key, value] of [['user.name', 'ratchet'], ['user.email', 'ratchet@invalid'], ['commit.gpgsign', 'false'],
    ['gc.auto', '0'], ['maintenance.auto', 'false'], ['core.fsmonitor', 'false']]) git('config', key, value);
  git('add', '-A');
  git('commit', '-qm', 'the copy');
  return git;
}

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
    await isolateGit(root);
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

// THE GATE VERIFIED A TREE IT DID NOT COMMIT (Q0-265-4, R0-265-4). `commit-when-clean.mjs` ran the
// verifier and only then `git add -A`, so a file the commit ADDS was untracked while the suite ran,
// and a guard that reads the index (`git ls-files`) passed over a tree without it. Here the guard is
// a real one: A1-257-9's case in test-kits/app-boundaries.test.mjs, which refuses any tracked file
// under a `.config/` directory, read from `git ls-files`. A new `.config/` file must make the gate
// refuse, and leave it untracked; under the old order the guard never saw it and the gate committed
// it at exit 0.
//
// The verifier is narrowed to that one guard for the reason the case above gives about the WHOLE
// check: this suite is in it, so running it here re-enters itself. It prints the clean line the
// gate reads only when that guard's run exits 0 having passed a test, as `verify-clean-run.mjs`
// does; it cannot import that script's `decide`, because importing it runs the coverage-floor
// guard, which refuses this copy's edited package.json. What is under test is the gate's order,
// not the verifier. A harmless new file is the control: the same gate and verifier commit it.
test('the commit gate verifies the tree it commits: a new file a guard refuses is refused before it is tracked', async () => {
  const root = await repositoryCopy();
  try {
    const packagePath = join(root, 'package.json');
    const manifest = JSON.parse(await readFile(packagePath, 'utf8'));
    manifest.scripts.verify = 'node gate-verifier.mjs';
    await writeFile(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(join(root, 'gate-verifier.mjs'), [
      "import { spawnSync } from 'node:child_process';",
      'const env = { ...process.env };',
      'delete env.NODE_TEST_CONTEXT;',
      'delete env.NODE_OPTIONS;',
      "const run = spawnSync(process.execPath, ['--test', '--test-name-pattern=^A1-257-9: a tracked', 'test-kits/app-boundaries.test.mjs'], { encoding: 'utf8', env });",
      "const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;",
      "const count = (key) => Number(output.match(new RegExp(`^ℹ ${key} (\\\\d+)$`, 'm'))?.[1] ?? 0);",
      'if (run.status === 0 && count(\'pass\') > 0) {',
      "  process.stdout.write(`clean: exit 0 — tests ${count('tests')}, pass ${count('pass')}, fail ${count('fail')}\\n`);",
      '  process.exit(0);',
      '}',
      "process.stderr.write(`NOT clean: exit ${run.status}\\n${output}`);",
      'process.exit(run.status || 1);',
      '',
    ].join('\n'));
    const git = await isolateGit(root);
    const message = join(root, '.git', 'probe-message.txt');
    const gate = () => spawnSync('node', ['scripts/commit-when-clean.mjs', message], { cwd: root, encoding: 'utf8', env: CHILD_ENV });

    // The control: a new file no guard refuses is committed.
    await writeFile(message, 'probe: a harmless new file\n');
    await writeFile(join(root, 'docs/harmless-for-a-ratchet.md'), 'nothing a guard refuses\n');
    const control = gate();
    assert.equal(control.status, 0, `the gate must commit a clean tree through the narrowed verifier:\n${control.stdout}${control.stderr}`);
    assert.ok(git('ls-files').split('\n').includes('docs/harmless-for-a-ratchet.md'), 'and the control file is committed');
    const head = git('rev-parse', 'HEAD');

    // The case: a new, untracked file the guard refuses once it is tracked.
    await writeFile(message, 'probe: this commit must be refused\n');
    await mkdir(join(root, '.config'), { recursive: true });
    await writeFile(join(root, '.config/planted-for-a-ratchet.txt'), 'a file under a .config/ directory\n');
    const refused = gate();
    assertFailed(refused, 'the gate must refuse a new file the guard refuses once it is tracked: the verifier must read the tree the commit takes');
    assert.equal(git('rev-parse', 'HEAD'), head, 'and it must not have produced a commit');
    assert.ok(!git('ls-files').split('\n').includes('.config/planted-for-a-ratchet.txt'),
      'and the refusal leaves the index as it found it: the planted file is not left staged');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// A throwaway repository for the commit gate's refusals that never reach the verifier's suite: no
// copy of this repository, only git and a `verify` script whose source the case chooses. The gate is
// run from this checkout's scripts/ with the throwaway as its working directory.
async function throwawayRepository(verifier = null) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'commit-gate-')));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: CHILD_ENV });
    return { status: result.status, out: (result.stdout ?? '').trim(), err: result.stderr ?? '' };
  };
  const ok = (...args) => {
    const result = git(...args);
    assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.err}`);
    return result.out;
  };
  ok('-c', 'init.defaultBranch=main', 'init', '-q');
  for (const [key, value] of [['user.name', 'ratchet'], ['user.email', 'ratchet@invalid'], ['commit.gpgsign', 'false'],
    ['gc.auto', '0'], ['maintenance.auto', 'false'], ['core.fsmonitor', 'false']]) ok('config', key, value);
  if (verifier !== null) {
    await writeFile(join(root, 'package.json'), `${JSON.stringify({ name: 'gate-probe', private: true, scripts: { verify: 'node verifier.mjs' } }, null, 2)}\n`);
    await writeFile(join(root, 'verifier.mjs'), verifier);
  }
  await writeFile(join(root, 'shared.txt'), 'base\n');
  ok('add', '-A');
  ok('commit', '-qm', 'base');
  const message = join(root, '.git', 'probe-message.txt');
  await writeFile(message, 'probe: this commit must be refused\n');
  const gate = () => spawnSync('node', [join(REPOSITORY, 'scripts/commit-when-clean.mjs'), message], { cwd: root, encoding: 'utf8', env: CHILD_ENV });
  return { root, git, ok, gate };
}

// A1-278-1. A merge stopped on a conflict holds unmerged index entries, and git refuses a plain
// `git commit` while it does. Staging first resolved them -- `git add -A` takes the file with its
// `<<<<<<<` markers as the resolution -- and `git write-tree` cannot record such an index, so the
// refusal that followed had nothing to restore: the conflict was gone and a later plain `git commit`
// committed the markers. The gate must refuse before it stages, and leave the merge as it found it.
test('the commit gate refuses a merge with unresolved conflicts before it stages anything', async () => {
  const { root, ok, gate } = await throwawayRepository();
  try {
    ok('checkout', '-qb', 'side');
    await writeFile(join(root, 'shared.txt'), 'side\n');
    ok('commit', '-qam', 'side');
    ok('checkout', '-q', 'main');
    await writeFile(join(root, 'shared.txt'), 'main\n');
    ok('commit', '-qam', 'main');
    const head = ok('rev-parse', 'HEAD');
    const merge = spawnSync('git', ['merge', 'side'], { cwd: root, encoding: 'utf8', env: CHILD_ENV });
    assert.notEqual(merge.status, 0, 'the merge must stop on its conflict for this case to mean anything');
    const unmergedBefore = ok('ls-files', '-u');
    assert.notEqual(unmergedBefore, '', 'and leave unmerged entries in the index');
    const conflicted = await readFile(join(root, 'shared.txt'), 'utf8');
    assert.match(conflicted, /^<<<<<<< /m);

    const refused = gate();
    assertFailed(refused, 'the gate must refuse an index with unresolved conflicts');
    assert.equal(ok('ls-files', '-u'), unmergedBefore,
      `and leave every unmerged entry where it was: nothing staged, nothing resolved\n${refused.stdout}${refused.stderr}`);
    assert.equal(await readFile(join(root, 'shared.txt'), 'utf8'), conflicted, 'and leave the conflicted file untouched');
    assert.equal(refused.status, 95, `with 95, before anything is staged:\n${refused.stdout}${refused.stderr}`);
    assert.match(refused.stderr, /unresolved conflicts/);
    assert.equal(ok('rev-parse', 'HEAD'), head, 'and make no commit');
    assert.ok(existsSync(join(root, '.git', 'MERGE_HEAD')), 'and leave the merge in progress');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// A1-278-4. The gate's own refusals after staging -- a verifier that exits 0 without the clean line
// (90) and a tree that moved while it ran (92) -- put the index back as they found it: what the
// caller had staged stays staged, and what the gate staged is unstaged again.
test('the commit gate\'s refusals after staging restore the index it found', async () => {
  const clean = "process.stdout.write('clean: exit 0 — tests 1, pass 1, fail 0\\n');\n";
  const cases = [
    [90, '// exits 0 and prints nothing\n'],
    [92, `import { appendFileSync } from 'node:fs';\nappendFileSync('shared.txt', 'moved while verifying\\n');\n${clean}`],
  ];
  for (const [code, verifier] of cases) {
    const { root, ok, gate } = await throwawayRepository(verifier);
    try {
      await writeFile(join(root, 'staged-by-caller.txt'), 'staged before the gate ran\n');
      ok('add', 'staged-by-caller.txt');
      await writeFile(join(root, 'left-unstaged.txt'), 'never staged by the caller\n');
      const head = ok('rev-parse', 'HEAD');
      const index = ok('write-tree');

      const refused = gate();
      assert.equal(refused.status, code, `the gate must refuse with ${code}:\n${refused.stdout}${refused.stderr}`);
      assert.equal(ok('rev-parse', 'HEAD'), head, `${code}: and make no commit`);
      assert.equal(ok('write-tree'), index, `${code}: and leave the index as it found it`);
      assert.deepEqual(ok('diff', '--cached', '--name-only').split('\n'), ['staged-by-caller.txt'],
        `${code}: what the caller staged stays staged, and nothing else is`);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

// A1-278r2-1. The index after a refusal is the index FILE the caller had, byte for byte -- not the
// tree it records. `git read-tree <tree>`, the first restore, put back the tree and the staged set and
// dropped every per-entry flag a tree cannot carry: a skip-worktree or assume-unchanged file's local
// edit showed again, and the next `git commit -a` committed it; an intent-to-add entry became an
// untracked file. Each refusal after staging -- the verifier not clean, 90, 92 -- is run over an index
// holding all three flags and a partial staging, and the file must come back unchanged.
async function flaggedIndex(root, ok) {
  await writeFile(join(root, 'hidden-by-skip-worktree.txt'), 'committed\n');
  await writeFile(join(root, 'hidden-by-assume-unchanged.txt'), 'committed\n');
  ok('add', 'hidden-by-skip-worktree.txt', 'hidden-by-assume-unchanged.txt');
  ok('commit', '-qm', 'flagged');
  ok('update-index', '--skip-worktree', 'hidden-by-skip-worktree.txt');
  ok('update-index', '--assume-unchanged', 'hidden-by-assume-unchanged.txt');
  await writeFile(join(root, 'hidden-by-skip-worktree.txt'), 'a private local edit\n');
  await writeFile(join(root, 'hidden-by-assume-unchanged.txt'), 'a private local edit\n');
  await writeFile(join(root, 'intent-to-add.txt'), 'announced, not staged\n');
  ok('add', '-N', 'intent-to-add.txt');
  await writeFile(join(root, 'staged-by-caller.txt'), 'staged before the gate ran\n');
  ok('add', 'staged-by-caller.txt');
  await writeFile(join(root, 'left-unstaged.txt'), 'never staged by the caller\n');
  const flags = ok('ls-files', '-v');
  for (const [flag, path] of [['S', 'hidden-by-skip-worktree.txt'], ['h', 'hidden-by-assume-unchanged.txt']]) {
    assert.ok(flags.split('\n').includes(`${flag} ${path}`), `the fixture must flag ${path} ${flag}:\n${flags}`);
  }
  const indexFile = join(root, '.git', 'index');
  return { indexFile, bytes: await readFile(indexFile), flags };
}

test('the commit gate\'s refusals put the index file back byte for byte, its per-entry flags included', async () => {
  const clean = "process.stdout.write('clean: exit 0 — tests 1, pass 1, fail 0\\n');\n";
  const cases = [
    [3, "process.stderr.write('NOT clean\\n');\nprocess.exit(3);\n"],
    [90, '// exits 0 and prints nothing\n'],
    [92, `import { appendFileSync } from 'node:fs';\nappendFileSync('shared.txt', 'moved while verifying\\n');\n${clean}`],
  ];
  let ran = 0;
  for (const [code, verifier] of cases) {
    const { root, ok, gate } = await throwawayRepository(verifier);
    try {
      const { indexFile, bytes, flags } = await flaggedIndex(root, ok);
      const head = ok('rev-parse', 'HEAD');

      const refused = gate();
      assert.equal(refused.status, code, `the gate must refuse with ${code}:\n${refused.stdout}${refused.stderr}`);
      assert.equal(ok('rev-parse', 'HEAD'), head, `${code}: and make no commit`);
      assert.equal(ok('ls-files', '-v'), flags, `${code}: and keep every per-entry flag (skip-worktree S, assume-unchanged h, intent-to-add)`);
      assert.ok((await readFile(indexFile)).equals(bytes), `${code}: and put the index file back byte for byte`);
      ran += 1;
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
  assert.equal(ran, cases.length, `${ran} of ${cases.length} refusals executed`);
});

// A1-278-2 (Info: an interrupt during the verifier left everything staged), and A1-292-3 (SIGQUIT). The
// gate stages before the verifier runs, so an interrupt while it runs used to leave everything staged:
// the gate blocked in `spawnSync` and died of the signal. It must stop the verifier, put the index file
// back and exit 128 + the signal's number, making no commit. The verifier here announces itself and
// then waits; the case signals the gate alone, so it is the gate that has to stop the verifier. SIGQUIT
// is the one a terminal sends with Ctrl-\, and with the verifier in a group of its own an unhandled one
// killed the gate and left the verifier running.
test('the commit gate puts the index back and stops its verifier when it is interrupted', async () => {
  const verifier = [
    "import { writeFileSync } from 'node:fs';",
    "writeFileSync('.git/verifier-started', String(process.pid));",
    'setTimeout(() => {}, 60_000);',
    '',
  ].join('\n');
  let ran = 0;
  const signals = [['SIGTERM', 143], ['SIGQUIT', 131]];
  for (const [sent, expected] of signals) {
    const { root, ok } = await throwawayRepository(verifier);
    try {
      const { indexFile, bytes, flags } = await flaggedIndex(root, ok);
      const head = ok('rev-parse', 'HEAD');
      const message = join(root, '.git', 'probe-message.txt');
      const child = spawn('node', [join(REPOSITORY, 'scripts/commit-when-clean.mjs'), message], { cwd: root, env: CHILD_ENV, stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';
      child.stdout.on('data', (chunk) => { output += chunk; });
      child.stderr.on('data', (chunk) => { output += chunk; });
      const exited = new Promise((done) => { child.on('exit', (code, signal) => done({ code, signal })); });

      const marker = join(root, '.git', 'verifier-started');
      const deadline = Date.now() + 30_000;
      while (!existsSync(marker) && Date.now() < deadline) await new Promise((next) => { setTimeout(next, 50); });
      assert.ok(existsSync(marker), `${sent}: the verifier must have started for this case to mean anything:\n${output}`);
      const verifierPid = Number(await readFile(marker, 'utf8'));
      const signalled = Date.now();
      child.kill(sent);
      const { code, signal } = await exited;
      // Bounded well under the verifier's own 60 s timer, so a gate that merely waits for its verifier
      // to end by itself -- no group kill, or a verifier not in a group of its own -- fails (Q0-292-1).
      const took = Date.now() - signalled;
      assert.ok(took < 5_000, `${sent}: the gate must stop its verifier, not wait for it: it exited ${took} ms after the signal`);

      assert.equal(signal, null, `the gate must handle ${sent} rather than die of it:\n${output}`);
      assert.equal(code, expected, `${sent}: and exit 128 + its number:\n${output}`);
      assert.equal(ok('rev-parse', 'HEAD'), head, `${sent}: and make no commit`);
      assert.equal(ok('ls-files', '-v'), flags, `${sent}: and keep every per-entry flag`);
      assert.ok((await readFile(indexFile)).equals(bytes), `${sent}: and put the index file back byte for byte`);
      // Q0-AUD1018-1. The gate waits for npm's `close`, and the verifier is npm's grandchild in the
      // same group: it has been sent the signal, but can still be exiting when the gate is. Measured
      // under eight concurrent runs: present at the gate's exit in 3 of 24 SIGQUIT runs and gone 82 to
      // 128 ms later, so the assertion raced (4 of 24 failed). It is given 2 s to be gone, far under
      // the verifier's own 60 s timer, so a verifier the gate left running still fails here.
      const gone = Date.now() + 2_000;
      while (stillRunning(verifierPid) && Date.now() < gone) await new Promise((next) => { setTimeout(next, 20); });
      assert.equal(stillRunning(verifierPid), false, `${sent}: and leave no verifier running`);
      ran += 1;
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
  assert.equal(ran, signals.length, `${ran} of ${signals.length} signals executed`);
});

// Q0-292-2. The gate honours its caller's `GIT_*` for its own git calls, but the verifier must not
// inherit them: run from a hook, it would carry the hook's GIT_INDEX_FILE into the whole suite, whose
// throwaway-repository tests would then act on the index being committed. The verifier here records
// every `GIT_*` it sees and refuses, so the gate refuses too; the gate is run with GIT_INDEX_FILE
// naming its own repository's index (harmless to its own calls) and a variable of no meaning to git.
test('the commit gate runs its verifier with no GIT_* of its caller\'s', async () => {
  const verifier = [
    "import { writeFileSync } from 'node:fs';",
    "writeFileSync('.git/verifier-git-env.json', JSON.stringify(Object.keys(process.env).filter((key) => key.startsWith('GIT_')).sort()));",
    'process.exit(3);',
    '',
  ].join('\n');
  const { root, ok } = await throwawayRepository(verifier);
  try {
    const message = join(root, '.git', 'probe-message.txt');
    const env = { ...CHILD_ENV, GIT_INDEX_FILE: join(root, '.git', 'index'), GIT_PROBE_FROM_THE_CALLER: 'set' };
    const head = ok('rev-parse', 'HEAD');
    const refused = spawnSync('node', [join(REPOSITORY, 'scripts/commit-when-clean.mjs'), message], { cwd: root, encoding: 'utf8', env });
    assert.equal(refused.status, 3, `the gate must pass on its verifier's refusal:\n${refused.stdout}${refused.stderr}`);
    assert.equal(ok('rev-parse', 'HEAD'), head, 'and make no commit');
    const seen = JSON.parse(await readFile(join(root, '.git', 'verifier-git-env.json'), 'utf8'));
    assert.deepEqual(seen, [], 'and the verifier must see no GIT_* variable from the gate\'s caller');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// A1-292-7. The verifier runs with no `GIT_*`, so it checks the repository it finds from its directory
// and that repository's own index. A caller whose GIT_INDEX_FILE named another index had the gate
// stage and commit that index while the verifier's guards read the other: a file a guard refuses was
// committed at exit 0. Each variable that points git elsewhere must be refused with 95 before anything
// is staged, the index and any other index untouched, nothing committed; GIT_INDEX_FILE naming the
// repository's own index (a plain `git commit`'s pre-commit hook) is allowed and reaches the verifier.
test('the commit gate refuses a caller whose GIT_* points git away from what its verifier checks', async () => {
  const { root, ok } = await throwawayRepository("process.stderr.write('NOT clean\\n');\nprocess.exit(3);\n");
  try {
    const { indexFile, bytes } = await flaggedIndex(root, ok);
    const other = join(root, '.git', 'another-index');
    await writeFile(other, bytes);
    const head = ok('rev-parse', 'HEAD');
    const message = join(root, '.git', 'probe-message.txt');
    const run = (extra) => spawnSync('node', [join(REPOSITORY, 'scripts/commit-when-clean.mjs'), message],
      { cwd: root, encoding: 'utf8', env: { ...CHILD_ENV, ...extra } });
    const refusals = [
      ['GIT_DIR', join(root, '.git')],
      ['GIT_WORK_TREE', root],
      ['GIT_COMMON_DIR', join(root, '.git')],
      ['GIT_OBJECT_DIRECTORY', join(root, '.git', 'objects')],
      ['GIT_ALTERNATE_OBJECT_DIRECTORIES', join(root, '.git', 'objects')],
      ['GIT_INDEX_FILE', other],
    ];
    let ran = 0;
    for (const [name, value] of refusals) {
      const refused = run({ [name]: value });
      assert.equal(refused.status, 95, `${name}: the gate must refuse before staging:\n${refused.stdout}${refused.stderr}`);
      assert.match(refused.stderr, new RegExp(name), `${name}: and name the variable`);
      assert.equal(ok('rev-parse', 'HEAD'), head, `${name}: and make no commit`);
      assert.ok((await readFile(indexFile)).equals(bytes), `${name}: and leave the repository's index untouched`);
      assert.ok((await readFile(other)).equals(bytes), `${name}: and leave the other index untouched`);
      ran += 1;
    }
    assert.equal(ran, refusals.length, `${ran} of ${refusals.length} variables executed`);
    const allowed = run({ GIT_INDEX_FILE: indexFile });
    assert.equal(allowed.status, 3, `GIT_INDEX_FILE naming the repository's own index must reach the verifier:\n${allowed.stdout}${allowed.stderr}`);
    assert.ok((await readFile(indexFile)).equals(bytes), 'and its refusal still puts the index back');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// C0-292r2-1. An index git could not read before the gate ran is refused with 95 (`git write-tree`
// fails on it), and the gate must leave it as it found it. The first version's readability check
// then "rebuilt" it from HEAD, replacing what the caller had staged while saying nothing was staged.
test('the commit gate leaves an index git could not read before it ran as it found it', async () => {
  const { root, ok, git, gate } = await throwawayRepository('// exits 0 and prints nothing\n');
  try {
    await writeFile(join(root, 'staged-one.txt'), 'one\n');
    await writeFile(join(root, 'staged-two.txt'), 'two\n');
    ok('add', 'staged-one.txt', 'staged-two.txt');
    const indexFile = join(root, '.git', 'index');
    const corrupted = Buffer.from(await readFile(indexFile));
    corrupted.write('XXXX', 0);
    await writeFile(indexFile, corrupted);
    assert.notEqual(git('ls-files', '-s').status, 0, 'git must be unable to read the index for this case to mean anything');
    const head = ok('rev-parse', 'HEAD');

    const refused = gate();
    assert.equal(refused.status, 95, `the gate must refuse with 95:\n${refused.stdout}${refused.stderr}`);
    assert.ok((await readFile(indexFile)).equals(corrupted), 'and leave the index byte for byte as it found it');
    assert.equal(ok('rev-parse', 'HEAD'), head, 'and make no commit');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// A1-292-4. A terminal's Ctrl-C reaches the gate's whole process group, so it kills a `git add -A` in
// progress as well as interrupting the gate. The gate read git's failure first and exited 1 -- a
// caller reading only the code saw a failed `git add`, not an interrupt. It must exit 130 with the
// index file put back. A clean filter that announces itself and then waits holds `git add -A` open;
// the gate runs in a group of its own here, so the case can signal that group as a terminal would.
test('the commit gate reports an interrupt during its git add as the interrupt, with the index put back', async () => {
  const { root, ok } = await throwawayRepository("process.stdout.write('clean: exit 0 — tests 1, pass 1, fail 0\\n');\n");
  let group = null;
  try {
    ok('config', 'filter.slow.clean', "sh -c 'touch .git/add-started; sleep 20; cat'");
    await writeFile(join(root, '.gitattributes'), '*.slow filter=slow\n');
    ok('add', '.gitattributes');
    ok('commit', '-qm', 'attributes');
    const { indexFile, bytes, flags } = await flaggedIndex(root, ok);
    await writeFile(join(root, 'held-by-the-filter.slow'), 'staged only through the slow filter\n');
    const head = ok('rev-parse', 'HEAD');
    const message = join(root, '.git', 'probe-message.txt');
    const child = spawn('node', [join(REPOSITORY, 'scripts/commit-when-clean.mjs'), message], { cwd: root, env: CHILD_ENV, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    group = child.pid;
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    const exited = new Promise((done) => { child.on('exit', (code, signal) => done({ code, signal })); });

    const marker = join(root, '.git', 'add-started');
    const deadline = Date.now() + 30_000;
    while (!existsSync(marker) && Date.now() < deadline) await new Promise((next) => { setTimeout(next, 50); });
    assert.ok(existsSync(marker), `git add -A must have reached the filter for this case to mean anything:\n${output}`);
    process.kill(-child.pid, 'SIGINT');
    const { code, signal } = await exited;

    assert.equal(signal, null, `the gate must handle SIGINT rather than die of it:\n${output}`);
    assert.equal(code, 130, `and exit 128 + 2, not git's failure:\n${output}`);
    assert.equal(ok('rev-parse', 'HEAD'), head, 'and make no commit');
    assert.equal(ok('ls-files', '-v'), flags, 'and keep every per-entry flag');
    assert.ok((await readFile(indexFile)).equals(bytes), 'and put the index file back byte for byte');
  } finally {
    // Whatever of the group is left (the filter's `sleep` when the case fails) is stopped.
    if (group !== null) { try { process.kill(-group, 'SIGKILL'); } catch { /* already gone */ } }
    await rm(root, { recursive: true, force: true });
  }
});

// A1-292-1. With `core.splitIndex` the index bytes name a `sharedindex.<sha>` file, and with
// `splitIndex.sharedIndexExpire=now` the gate's own `git add -A` deleted the one the found bytes name:
// putting the bytes back left an index no git command could read. A refusal must leave a readable
// index, byte-equal to the one found, flags included.
test('the commit gate\'s refusal leaves a split index readable when git expires shared indexes at once', async () => {
  const { root, ok, git, gate } = await throwawayRepository('// exits 0 and prints nothing\n');
  try {
    ok('config', 'core.splitIndex', 'true');
    ok('config', 'splitIndex.sharedIndexExpire', 'now');
    ok('config', 'splitIndex.maxPercentChange', '0');
    ok('update-index', '--split-index');
    const { indexFile, bytes, flags } = await flaggedIndex(root, ok);
    const shared = ok('rev-parse', '--shared-index-path');
    assert.notEqual(shared, '', 'the index must be split for this case to mean anything');
    for (let i = 0; i < 8; i += 1) await writeFile(join(root, `new-${i}.txt`), `new ${i}\n`);
    const head = ok('rev-parse', 'HEAD');

    const refused = gate();
    assert.equal(refused.status, 90, `the gate must refuse with 90:\n${refused.stdout}${refused.stderr}`);
    const read = git('ls-files', '-s');
    assert.equal(read.status, 0, `and leave an index git can read:\n${read.err}`);
    assert.equal(ok('rev-parse', 'HEAD'), head, 'and make no commit');
    assert.equal(ok('ls-files', '-v'), flags, 'and keep every per-entry flag');
    assert.ok((await readFile(indexFile)).equals(bytes), 'and put the index file back byte for byte');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// A1-278r2-2. Every case above runs with no `GIT_*` from its caller (CHILD_ENV). This runs them in a
// child whose environment points GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE and GIT_OBJECT_DIRECTORY at
// another repository, as a pre-commit hook points GIT_INDEX_FILE at the index being committed, and
// requires that repository to be untouched, file for file, `.git` included, and the cases to pass.
// Under the inherited environment the GIT_DIR run committed into it and failed, and the
// GIT_INDEX_FILE run passed having replaced its index. The cases run are every one whose name starts
// 'the commit gate' except the `.config/` one, whose git calls are `isolateGit` and the gate, as the
// red-tree case's are, and whose time goes on its narrowed verifier. The other repository is read
// only through the file system, never through git, so reading it cannot change it.
async function filesUnder(dir) {
  const files = new Map();
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    files.set(path.slice(dir.length), (await readFile(path)).toString('base64'));
  }
  return files;
}

test('a caller\'s GIT_* environment reaches no repository but the cases\' own', async () => {
  const victim = await realpath(await mkdtemp(join(tmpdir(), 'commit-gate-caller-')));
  try {
    const git = (...args) => {
      const result = spawnSync('git', args, { cwd: victim, encoding: 'utf8', env: CHILD_ENV });
      assert.equal(result.status, 0, `git ${args.join(' ')} in the caller's repository: ${result.stderr}`);
    };
    git('-c', 'init.defaultBranch=main', 'init', '-q');
    for (const [key, value] of [['user.name', 'caller'], ['user.email', 'caller@invalid'], ['commit.gpgsign', 'false'],
      ['gc.auto', '0'], ['maintenance.auto', 'false'], ['core.fsmonitor', 'false']]) git('config', key, value);
    await writeFile(join(victim, 'caller.txt'), 'the caller\'s own file\n');
    git('add', 'caller.txt');
    git('commit', '-qm', 'the caller');
    await writeFile(join(victim, 'caller-staged.txt'), 'staged by the caller\n');
    git('add', 'caller-staged.txt');
    const before = await filesUnder(victim);
    assert.ok(before.has('/.git/index'), 'the caller\'s repository must have an index for this case to mean anything');

    const redirections = [
      { GIT_DIR: join(victim, '.git'), GIT_WORK_TREE: victim },
      { GIT_INDEX_FILE: join(victim, '.git', 'index'), GIT_OBJECT_DIRECTORY: join(victim, '.git', 'objects') },
    ];
    let ran = 0;
    for (const redirection of redirections) {
      const env = { ...CHILD_ENV, ...redirection };
      const run = spawnSync(process.execPath, ['--test', '--test-name-pattern=^the commit gate(?! verifies)', 'test-kits/ratchets-bite.test.mjs'],
        { cwd: REPOSITORY, encoding: 'utf8', env });
      const output = `${run.stdout}${run.stderr}`;
      const names = Object.keys(redirection).join(', ');
      const count = (key) => Number(output.match(new RegExp(`^ℹ ${key} (\\d+)$`, 'm'))?.[1] ?? -1);
      assert.equal(run.status, 0, `the commit-gate cases must pass with ${names} pointed at another repository:\n${output}`);
      assert.ok(count('pass') >= 10 && count('fail') === 0, `and run every commit-gate case (pass ${count('pass')}, fail ${count('fail')}):\n${output}`);
      const after = await filesUnder(victim);
      const changed = [...new Set([...before.keys(), ...after.keys()])].filter((path) => before.get(path) !== after.get(path));
      assert.deepEqual(changed, [], `with ${names} set, the caller's repository must be untouched`);
      ran += 1;
    }
    assert.equal(ran, redirections.length, `${ran} of ${redirections.length} redirections executed`);
  } finally {
    await rm(victim, { recursive: true, force: true });
  }
});

// A1-293-2, A1-294-3. CHILD_ENV sets GIT_CONFIG_NOSYSTEM=1 and GIT_CONFIG_GLOBAL=/dev/null after its
// strip, so no child here reads the machine's git configuration. This makes a home whose
// `.gitconfig`, and an XDG_CONFIG_HOME whose `git/config`, each set `core.hooksPath` to hooks that
// append to a marker file, and first shows the probe is live: a plain `git commit` with either one
// runs the hooks, and the same commit with CHILD_ENV does not. Then it runs the commit-gate cases the case above runs, for the reason it gives, again in a
// child whose HOME and XDG_CONFIG_HOME are those two, with no GIT_* of its own, as a caller's
// machine would be, and requires the cases to pass and the marker never to appear. The system
// gitconfig cannot be planted without writing outside the test's own directories; GIT_CONFIG_NOSYSTEM
// is set beside GIT_CONFIG_GLOBAL in the same lines, and git reads the system file only without it.
const CONFIG_CASE = 'no case here reads the git configuration its caller\'s HOME or XDG_CONFIG_HOME holds';
const CALLER_HOOKS = ['pre-commit', 'prepare-commit-msg', 'commit-msg', 'post-commit', 'pre-merge-commit', 'post-merge',
  'post-checkout', 'post-rewrite', 'reference-transaction', 'post-index-change', 'pre-rebase', 'pre-auto-gc'];

async function hookingConfiguration(root) {
  const marker = join(root, 'hooks-ran.log');
  const hooks = join(root, 'hooks');
  await mkdir(hooks);
  for (const hook of CALLER_HOOKS) {
    await writeFile(join(hooks, hook), `#!/bin/sh\nprintf '%s %s\\n' '${hook}' "$PWD" >> '${marker}'\nexit 0\n`, { mode: 0o755 });
  }
  const config = `[core]\n\thooksPath = ${hooks}\n`;
  const home = join(root, 'home');
  const xdg = join(root, 'xdg');
  const empty = join(root, 'empty');
  await mkdir(home);
  await mkdir(join(xdg, 'git'), { recursive: true });
  await mkdir(empty);
  await writeFile(join(home, '.gitconfig'), config);
  await writeFile(join(xdg, 'git', 'config'), config);
  const ran = async () => (await readFile(marker, 'utf8').catch(() => ''));
  return {
    marker,
    ran,
    each: [['HOME', { HOME: home, XDG_CONFIG_HOME: empty }], ['XDG_CONFIG_HOME', { HOME: empty, XDG_CONFIG_HOME: xdg }]],
    both: { HOME: home, XDG_CONFIG_HOME: xdg },
  };
}

function probeCommit(dir, env) {
  for (const args of [['init', '-q', '-b', 'main'],
    ['-c', 'user.name=probe', '-c', `user.email=${['probe', 'example.invalid'].join('@')}`, '-c', 'commit.gpgsign=false',
      'commit', '-q', '--allow-empty', '-m', 'probe']]) {
    const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8', env });
    assert.equal(result.status, 0, `git ${args.join(' ')} in the probe repository: ${result.stderr}`);
  }
}

test('no case here reads the git configuration its caller\'s HOME or XDG_CONFIG_HOME holds', async (t) => {
  assert.equal(t.name, CONFIG_CASE, 'the name this case is pinned by must be its own');
  const root = await realpath(await mkdtemp(join(tmpdir(), 'commit-gate-config-')));
  try {
    const { marker, ran, each, both } = await hookingConfiguration(root);
    // The caller's environment as a child here saw it before CHILD_ENV set the two: no GIT_* at all.
    const caller = { ...CHILD_ENV };
    delete caller.GIT_CONFIG_NOSYSTEM;
    delete caller.GIT_CONFIG_GLOBAL;

    let probes = 0;
    for (const [where, home] of each) {
      const live = join(root, `live-${probes}`);
      await mkdir(live);
      probeCommit(live, { ...caller, ...home });
      assert.notEqual(await ran(), '', `a git that reads ${where}'s configuration must run its hook, or this case observes nothing`);
      await rm(marker, { force: true });
      const isolated = join(root, `isolated-${probes}`);
      await mkdir(isolated);
      probeCommit(isolated, { ...caller, ...home, GIT_CONFIG_NOSYSTEM: CHILD_ENV.GIT_CONFIG_NOSYSTEM, GIT_CONFIG_GLOBAL: CHILD_ENV.GIT_CONFIG_GLOBAL });
      assert.equal(await ran(), '', `with CHILD_ENV's two settings, git must not run the hook ${where}'s configuration installs`);
      probes += 1;
    }
    assert.equal(probes, each.length, `${probes} of ${each.length} probes executed`);

    const result = spawnSync(process.execPath, ['--test', '--test-name-pattern=^the commit gate(?! verifies)', 'test-kits/ratchets-bite.test.mjs'],
      { cwd: REPOSITORY, encoding: 'utf8', env: { ...caller, ...both } });
    const output = `${result.stdout}${result.stderr}`;
    const count = (key) => Number(output.match(new RegExp(`^ℹ ${key} (\\d+)$`, 'm'))?.[1] ?? -1);
    assert.equal(result.status, 0, `the commit-gate cases must pass with the caller's HOME and XDG_CONFIG_HOME installing hooks:\n${output}`);
    assert.ok(count('pass') >= 10 && count('fail') === 0,
      `and run every commit-gate case (tests ${count('tests')}, pass ${count('pass')}, fail ${count('fail')}):\n${output}`);
    assert.equal(await ran(), '', `no hook the caller's git configuration installs may run in a repository a case makes:\n${await ran()}`);
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
  const dead = spawnSync(process.execPath, ['-e', 'process.exit(0)'], { env: CHILD_ENV });
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
