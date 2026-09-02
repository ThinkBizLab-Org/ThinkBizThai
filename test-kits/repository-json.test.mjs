import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
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

// Independent review sixteen amended RFC-2026-010 with a binding "Amendment 1" exempting internal
// service callers from tenant isolation and recording A1/A6 sign-off as satisfied. An approved RFC
// outranks the Decision Register AND CONTRIBUTING_AGENTS.md in this repository's own conflict
// order, so a rule reversed there survives every ratchet beneath it. All eleven decision records
// are digested now, which stops an EDIT.
//
// A NEW file was still only caught by the branch-scope guard, which runs in CI on a pull request
// and not in `npm run check` at all -- so `RFC-2026-011-internal-caller-exemption.md`, `Status:
// Approved`, could be written and tested green locally. The set is named here for the same reason
// every ratchet in this repository is named rather than counted.
const DECISION_RECORDS = [
  // The directory's placeholder, declared rather than special-cased: a walk that skips dotfiles
  // is a walk with a hole in it, and this one is what the first recursive run found.
  '.gitkeep',
  'RFC-2026-001-bootstrap-tooling-contract.md',
  'RFC-2026-002-manual-merge-control.md',
  'RFC-2026-003-contract-test-coverage-and-ownership-transfer.md',
  'RFC-2026-004-catalog-reference-integrity.md',
  'RFC-2026-005-secret-scan-strengthening.md',
  'RFC-2026-006-job-reference-hardening.md',
  'RFC-2026-007-ci-independent-guard-step.md',
  'RFC-2026-008-cardholder-data-scan.md',
  'RFC-2026-009-reference-bounds.md',
  'RFC-2026-010-shared-kernel-freeze-readiness.md',
];

test('the set of decision records is what it was, and each is digested', async () => {
  // The first version was `readdir(...).filter(n => n.endsWith('.md'))` — non-recursive and
  // case-sensitive. Independent review seventeen put the file back where it started two ways:
  // `architecture/decisions/amendments/RFC-2026-012-exemption.md` and
  // `architecture/decisions/RFC-2026-011-exemption.MD`, each **exit 0, 231/231**.
  //
  // `amendments/` is a more natural home for an amendment than the flat directory is, which is
  // what makes the subdirectory case the likelier one. The walk now matches the enumeration's
  // ambition: everything under the directory, at any depth, whatever it is called.
  const walk = async (directory, prefix = '') => {
    const found = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) found.push(...await walk(join(directory, entry.name), `${relative}/`));
      else found.push(relative);
    }
    return found.sort();
  };
  const present = await walk('architecture/decisions');
  const wrong = [];
  for (const name of present.filter((n) => !DECISION_RECORDS.includes(n))) {
    wrong.push(`architecture/decisions/${name} is a file nobody declared. An approved RFC outranks every `
      + 'document in the conflict order, so adding one is the highest-authority act available here.');
  }
  for (const name of DECISION_RECORDS.filter((n) => !present.includes(n))) wrong.push(`${name} was deleted`);

  // And each must carry a digest, so an edit is a tripwire and a deletion is a ratchet failure.
  const manifest = JSON.parse(await readFile('test-kits/integrity-manifest.json', 'utf8'));
  for (const name of present) {
    const key = `architecture/decisions/${name}`;
    if (manifest.files?.[key] === undefined) wrong.push(`${key} carries no digest`);
  }
  assert.deepEqual(wrong, [], `decision-record problem(s):\n  ${wrong.join('\n  ')}`);
});

test('no decision record exists outside the directory that holds them', async () => {
  // The recursive walk added one wave earlier starts at `architecture/decisions`, so
  // `architecture/RFC-2026-011-exemption.md` and `docs/sprint-0a/RFC-2026-011-exemption.md` were
  // both invisible to it — **exit 0** — while an approved RFC outranks every document in this
  // repository's conflict order. Independent review eighteen put one in each place.
  //
  // Ratcheted on CONTENT and NAME, repo-wide, rather than on location: a document that calls
  // itself an RFC or declares an approved status is a decision record wherever it sits.
  const RFC_NAME = /RFC-\d{4}-\d{3}/;
  // TWO signals, because one is not enough in either direction. The first version matched
  // `evidence/WP-0A-A0-001/rfc-002-exact-commit-verification.md`, which opens
  // `# RFC-2026-002 exact-commit verification` — an evidence record ABOUT an RFC, not an RFC. A
  // guard that reports a wrong reason is worse than one that stays silent, and this repository
  // has recorded that three times now.
  //
  // A decision record opens as one AND declares a status. An evidence file does neither.
  const RFC_HEADING = /^#\s*RFC-\d{4}-\d{3}/m;
  const RFC_STATUS = /^\s*(\*\*)?Status(\*\*)?:\s*(Approved|Accepted|Proposed)/mi;
  // `architecture/decisions` is the declared home and is checked by the test above; skipping all
  // of `architecture` was my own first version, and it let `architecture/RFC-2026-011-exemption.md`
  // -- one directory up from the declared home, the likeliest place of all -- pass at exit 0.
  const SKIP = new Set(['.git', 'node_modules']);
  const SKIP_PATHS = new Set(['architecture/decisions']);
  const found = [];
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (directory === '.' && SKIP.has(entry.name)) continue;
      const path = directory === '.' ? entry.name : `${directory}/${entry.name}`;
      if (SKIP_PATHS.has(path)) continue;
      if (entry.isDirectory()) { await walk(path); continue; }
      if (!entry.isFile() || !/\.(md|markdown|mdx|txt)$/i.test(entry.name)) continue;
      if (RFC_NAME.test(entry.name)) { found.push(`${path} — named as a decision record`); continue; }
      const body = await readFile(path, 'utf8');
      // Evidence files quote RFCs constantly; only a document that OPENS as one counts.
      const head = body.slice(0, 600);
      if (RFC_HEADING.test(head) && RFC_STATUS.test(head)) found.push(`${path} — opens as a decision record`);
    }
  };
  await walk('.');
  assert.deepEqual(found, [], `decision record(s) outside architecture/decisions:\n  ${found.join('\n  ')}\n`
    + 'An approved RFC outranks the Decision Register and CONTRIBUTING_AGENTS.md; where it sits does not change that.');
});
