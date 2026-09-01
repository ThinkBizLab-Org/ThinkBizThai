import assert from 'node:assert/strict';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

// Every ratchet in this repository points at `contract-catalog/shared-kernel` by name -- the
// mutation walk, the conformance suite, the reference-integrity check, the registry pin. That
// was fine while the catalog had one group, and independent review showed what it costs the
// moment it does not: a new `contract-catalog/billing/ctr-pay-001/` with `status: "Frozen"` --
// a level FREEZE_LEVELS explicitly rejects -- `owner: "nobody"`, zero fixtures, an unsupported
// schema keyword and a rule contradicting CONTRIBUTING_AGENTS.md passed at exit 0.
//
// The Decision Register declares 25 further contracts in other groups, so this is not
// hypothetical; it is the next package.
//
// A contract group that no suite governs must not be creatable by adding a directory. Adding
// one is now a deliberate act: declare the group here AND point the suites at it, or the check
// fails naming the directory nobody is checking.
const CATALOG = 'contract-catalog';

// Groups this repository's suites actually govern. Adding a name here is a promise that every
// ratchet has been pointed at it -- it is not a way to silence this test.
const GOVERNED_GROUPS = ['shared-kernel'];

const isDirectory = async (path) => (await stat(path)).isDirectory();

test('every contract directory lives in a group the suites govern', async () => {
  const ungoverned = [];
  for (const entry of await readdir(CATALOG, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (GOVERNED_GROUPS.includes(entry.name)) continue;
    const group = join(CATALOG, entry.name);
    const contracts = [];
    for (const child of await readdir(group, { withFileTypes: true })) {
      if (child.isDirectory() && await isDirectory(join(group, child.name))) contracts.push(child.name);
    }
    ungoverned.push(`${group} — ${contracts.length} contract directory(ies): ${contracts.join(', ') || 'none yet'}. `
      + 'No mutation walk, conformance suite, reference-integrity check or registry pin covers this group. '
      + 'Point them at it and add the group to GOVERNED_GROUPS in the same commit.');
  }
  assert.deepEqual(ungoverned, [], `contract group(s) no suite governs:\n  ${ungoverned.join('\n  ')}`);
});

test('a governed group is not silently emptied', async () => {
  // The reverse of the same hole: a group named here but absent, or present and empty, means
  // the suites are pointed at nothing and every count over it reads zero.
  const wrong = [];
  for (const group of GOVERNED_GROUPS) {
    const path = join(CATALOG, group);
    let entries;
    try { entries = await readdir(path, { withFileTypes: true }); }
    catch { wrong.push(`${path} is declared governed but does not exist`); continue; }
    const contracts = entries.filter((e) => e.isDirectory());
    if (contracts.length === 0) wrong.push(`${path} is declared governed but holds no contract`);
  }
  assert.deepEqual(wrong, [], `governed group(s) that are not there:\n  ${wrong.join('\n  ')}`);
});
