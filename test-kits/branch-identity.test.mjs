import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { AMBIGUOUS_CLAIM, NO_CLAIMANT, UNREADABLE, claimantsOf, reportFor } from '../scripts/verify-branch-identity.mjs';

// The CI branch-scope step used to derive its package from the branch NAME. Independent review
// eleven showed that is two holes, not one: an unparseable name skipped the guard at exit 0,
// and a parseable name chose which manifest the branch was judged against.
const fixture = async (packages) => {
  const directory = await mkdtemp(join(tmpdir(), 'branch-identity-'));
  for (const [name, body] of Object.entries(packages)) {
    await writeFile(join(directory, name), typeof body === 'string' ? body : JSON.stringify(body));
  }
  return directory;
};
const manifest = (id, branch) => ({ work_package_id: id, ownership: branch === undefined ? {} : { branch } });

test('a branch is resolved to the package that names it', async () => {
  const directory = await fixture({
    'WP-1.json': manifest('WP-1', 'agent/claude/WP-1-alpha'),
    'WP-2.json': manifest('WP-2', 'agent/claude/WP-2-beta'),
  });
  const report = reportFor('agent/claude/WP-2-beta', await claimantsOf('agent/claude/WP-2-beta', directory));
  assert.equal(report.code, 0);
  assert.equal(report.message, 'WP-2');
});

test('an unparseable branch name no longer skips the guard', async () => {
  // The exact bypass: `agent/claude/tidy-up` parsed to nothing and the step exited 0.
  const directory = await fixture({ 'WP-1.json': manifest('WP-1', 'agent/claude/WP-1-alpha') });
  const report = reportFor('agent/claude/tidy-up', await claimantsOf('agent/claude/tidy-up', directory));
  assert.equal(report.code, NO_CLAIMANT);
  assert.match(report.message, /no work package declares ownership\.branch/);
});

test('a branch cannot select which manifest judges it by renaming', async () => {
  // Naming a branch after the package with the broadest writable paths used to be enough.
  const directory = await fixture({
    'WP-1.json': manifest('WP-1', 'agent/claude/WP-1-alpha'),
    'WP-BROAD.json': manifest('WP-BROAD', 'agent/root/WP-BROAD-bootstrap'),
  });
  const renamed = 'agent/claude/WP-BROAD-alpha';
  const report = reportFor(renamed, await claimantsOf(renamed, directory));
  assert.equal(report.code, NO_CLAIMANT, 'a name that resembles a package must not resolve to it');
});

test('two packages claiming one branch is an error, not a first-match', async () => {
  const directory = await fixture({
    'WP-1.json': manifest('WP-1', 'agent/claude/shared'),
    'WP-2.json': manifest('WP-2', 'agent/claude/shared'),
  });
  const report = reportFor('agent/claude/shared', await claimantsOf('agent/claude/shared', directory));
  assert.equal(report.code, AMBIGUOUS_CLAIM);
  assert.match(report.message, /WP-1, WP-2/);
});

test('an unreadable manifest fails loudly rather than reducing the claimant set', async () => {
  // Silently skipping a manifest that will not parse is how a claimant disappears and a branch
  // becomes unclaimed -- the same shape as the bypass this script replaces.
  const directory = await fixture({
    'WP-1.json': manifest('WP-1', 'agent/claude/WP-1-alpha'),
    'WP-BROKEN.json': '{ not json',
  });
  const report = reportFor('agent/claude/WP-1-alpha', await claimantsOf('agent/claude/WP-1-alpha', directory));
  assert.equal(report.code, UNREADABLE);
  assert.match(report.message, /WP-BROKEN\.json/);
});

test('every branch in this repository resolves to exactly one package', async () => {
  // Against the real manifests: the declarations must actually be consistent.
  const branches = new Map();
  for (const ref of [
    'agent/root/WP-0A-A0-001-repository-bootstrap',
    'agent/root/WP-0A-CON-001-contract-catalog',
    'agent/claude/WP-0A-A0-002-contract-test-coverage',
    'agent/claude/WP-0A-CON-008-squash-orphans-handoffs',
    'agent/claude/WP-0A-A0-007-rls-service-policy-defect',
    'agent/claude/WP-0A-A0-006-db00-data-decisions',
    'agent/claude/WP-0A-DB-00-a1-countersignature',
    'agent/claude/WP-0A-A0-008-service-path',
  ]) {
    const report = reportFor(ref, await claimantsOf(ref));
    assert.equal(report.code, 0, `${ref}: ${report.message}`);
    branches.set(ref, report.message);
  }
  assert.equal(new Set(branches.values()).size, branches.size, 'two branches resolved to the same package');
});

test('a package that declares a branch is not still in backlog', async () => {
  // `backlog` means the work has not been picked up. A package that names a branch has a branch
  // with commits on it and, in this stack, an open pull request. Two packages read `backlog`
  // while their work sat in pull requests #8 and #10 -- the status corrections were arriving
  // last, on the top branch, and these two were never reached. Nothing noticed, because status
  // was checked for being a VALID value and never against the evidence that work had started.
  const stale = [];
  for (const entry of await readdir('work-packages')) {
    if (!entry.endsWith('.json')) continue;
    const manifest = JSON.parse(await readFile(join('work-packages', entry), 'utf8'));
    if (manifest?.ownership?.branch && manifest.status === 'backlog') {
      stale.push(`${manifest.work_package_id} declares ${manifest.ownership.branch} and reads status backlog`);
    }
  }
  assert.deepEqual(stale, [], `package(s) whose status contradicts their own branch:\n  ${stale.join('\n  ')}`);
});

// Independent review twelve: the previous test pinned four refs out of thirteen. It repointed
// WP-0A-CON-002's `ownership.branch` at `agent/claude/WP-0A-CON-009-tidy`, ran
// `npm run regenerate:manifest`, and got exit 0 at 187/187 -- so a branch doing no CON-002 work
// would be judged against CON-002's eleven writable paths, including three contract directories
// and two contract test suites. The branch could still pick its judge; only the mechanism had
// moved, from the ref name into the manifest.
//
// The whole mapping is pinned. Repointing a branch is a diff line in this table too.
const BRANCH_OWNERSHIP = {
  'agent/root/WP-0A-A0-001-repository-bootstrap': 'WP-0A-A0-001',
  'agent/claude/WP-0A-A0-002-contract-test-coverage': 'WP-0A-A0-002',
  'agent/claude/WP-0A-A0-003-secret-scan': 'WP-0A-A0-003',
  'agent/claude/WP-0A-A0-004-ci-independent-guard-step': 'WP-0A-A0-004',
  'agent/claude/WP-0A-A0-005-cardholder-data-scan': 'WP-0A-A0-005',
  'agent/root/WP-0A-CON-001-contract-catalog': 'WP-0A-CON-001',
  'agent/claude/WP-0A-CON-002-stale-blockers': 'WP-0A-CON-002',
  'agent/claude/WP-0A-CON-003-stale-blockers': 'WP-0A-CON-003',
  'agent/claude/WP-0A-CON-004-security-audit-observability': 'WP-0A-CON-004',
  'agent/claude/WP-0A-CON-005-job-reference-hardening': 'WP-0A-CON-005',
  'agent/claude/WP-0A-CON-006-usage-and-notification': 'WP-0A-CON-006',
  'agent/claude/WP-0A-CON-007-reference-bounds': 'WP-0A-CON-007',
  'agent/claude/WP-0A-A6-001-metric-dictionary': 'WP-0A-A6-001',
  'agent/claude/WP-0A-CON-008-squash-orphans-handoffs': 'WP-0A-CON-008',
  'agent/claude/WP-0A-A0-007-rls-service-policy-defect': 'WP-0A-A0-007',
  'agent/claude/WP-0A-A0-006-db00-data-decisions': 'WP-0A-A0-006',
  'agent/claude/WP-0A-DB-00-a1-countersignature': 'WP-0A-DB-00',
  'agent/claude/WP-0A-A0-008-service-path': 'WP-0A-A0-008',
};

test('the whole branch-to-package mapping is pinned, not four rows of it', async () => {
  const declared = {};
  for (const entry of await readdir('work-packages')) {
    if (!entry.endsWith('.json')) continue;
    const manifest = JSON.parse(await readFile(join('work-packages', entry), 'utf8'));
    const branch = manifest?.ownership?.branch;
    if (branch) declared[branch] = manifest.work_package_id;
  }
  assert.deepEqual(declared, BRANCH_OWNERSHIP,
    'a branch was repointed at a different package, or a package declared a branch nobody pinned');

  // And each pinned branch must still resolve through the guard itself -- the table and the
  // resolver agreeing is the property CI depends on.
  for (const [branch, packageId] of Object.entries(BRANCH_OWNERSHIP)) {
    const report = reportFor(branch, await claimantsOf(branch));
    assert.equal(report.code, 0, `${branch}: ${report.message}`);
    assert.equal(report.message, packageId);
  }
});
