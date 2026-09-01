import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { validate } from './contracts/json-schema-subset.mjs';
import { changedIn, classify } from '../scripts/refresh-author-handoff.mjs';
import { claimantsOf, reportFor } from '../scripts/verify-branch-identity.mjs';

const run = promisify(execFile);

// Ten handoffs were written and nothing validated them. `.agents/handoff.schema.json` was
// loaded by one test only to assert a single `const`, and no script or test ever loaded a
// handoff instance -- independent review pointed out that all ten happened to conform, and that
// this was unenforced.
//
// It also found what an unenforced document drifts into: two handoffs cited base and head SHAs
// that no longer existed in any branch after a rebase, `recommended_next_work_packages` was
// empty in all ten against a protocol that requires it, and four fields were byte-identical
// across every package -- so three packages that touch no contract at all claimed
// "contract-catalog changes are additive or corrective".
const HANDOFFS = 'handoffs';
const SCHEMA = '.agents/handoff.schema.json';
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

async function authorHandoffs() {
  const names = (await readdir(HANDOFFS)).filter((f) => f.endsWith('-author-handoff.json')).sort();
  const out = [];
  for (const name of names) out.push([name, await readJson(join(HANDOFFS, name))]);
  return out;
}

test('every author handoff satisfies .agents/handoff.schema.json', async () => {
  const schema = await readJson(SCHEMA);
  const bad = [];
  for (const [name, body] of await authorHandoffs()) {
    const errors = validate(schema, body, { resolve: () => null });
    if (errors.length > 0) bad.push(`${name}: ${errors.slice(0, 3).join('; ')}`);
  }
  assert.deepEqual(bad, [], `handoff(s) that do not satisfy the protocol schema:\n  ${bad.join('\n  ')}`);
});

test('every author handoff names a next package, as the protocol requires', async () => {
  // CONTRIBUTING_AGENTS.md: a handoff must list "the recommended next package". An empty array
  // satisfies the schema and not the sentence.
  const silent = [];
  for (const [name, body] of await authorHandoffs()) {
    if (!Array.isArray(body.recommended_next_work_packages) || body.recommended_next_work_packages.length === 0) {
      silent.push(name);
    }
  }
  assert.deepEqual(silent, [], `handoff(s) recommending no next package:\n  ${silent.join('\n  ')}`);
});

test('a handoff describes its own package, not a template', async () => {
  // Four fields were identical across all ten. Identical is not automatically wrong -- the
  // assumptions genuinely are shared -- but a claim ABOUT THE FILES CHANGED cannot be.
  const handoffs = await authorHandoffs();
  const rollbacks = new Set(handoffs.map(([, body]) => body.rollback_or_forward_fix));
  assert.equal(rollbacks.size, handoffs.length,
    'every handoff states the same rollback plan; a plan that does not mention what this package changed describes no package');

  const wrong = [];
  for (const [name, body] of handoffs) {
    // A contract ARTIFACT, not merely a path under the catalog. The first run of the reverse
    // check below reported WP-0A-A0-001 for adding `contract-catalog/README.md`, which carries
    // no compatibility surface at all -- a prose file cannot break a consumer. Narrowed to the
    // files a consumer actually reads: the index, each contract's manifest and schema, and the
    // fixtures a conformance suite runs.
    const contractArtifacts = [...body.files_added, ...body.files_modified].filter((f) => (
      f.startsWith('contract-catalog/')
      && (/\/(manifest|schema|index)\.json$/.test(f) || /\/fixtures\//.test(f))
    ));
    const touchesContracts = contractArtifacts.length > 0;
    const claimsContracts = /contract-catalog changes are additive/i.test(body.compatibility_impact ?? '');
    if (claimsContracts && !touchesContracts) {
      wrong.push(`${name} claims contract-catalog compatibility impact but changes no contract-catalog file`);
    }
    // Independent review eleven: the check ran one direction only. Claiming an impact you do
    // not have is the harmless half -- it looks worse than the truth. The half that matters is
    // a package that DOES change the contract catalog and says nothing about compatibility,
    // because a reader of that handoff has no reason to look.
    if (touchesContracts && !claimsContracts) {
      wrong.push(`${name} changes ${contractArtifacts.length} contract artifact(s) and states no compatibility impact `
        + `— ${contractArtifacts.slice(0, 3).join(', ')}${contractArtifacts.length > 3 ? ', …' : ''}`);
    }
  }
  assert.deepEqual(wrong, [], `handoff(s) claiming an impact they do not have:\n  ${wrong.join('\n  ')}`);
});

// A revision that is a full commit id can be CHECKED -- against the branch, after a rebase, by
// anyone. An abbreviated one usually can, until the object it named is gone: two handoffs cited
// short SHAs that no longer existed in any branch, which is how independent review found them.
//
// The two handoffs predating this work state a branch and a pending commit instead, which is
// honest for what they were, so this asserts what is checkable rather than one spelling: a
// revision is either a full commit id, or it says in words that it is not one.
// A shape check is not a fact check. Independent review put a handoff on this very package
// through with two invented 40-hex revisions, empty file lists against a 49-path branch, and
// "this package changed nothing" -- exit 0. And the same review found this package's OWN
// handoff citing a commit that exists only on a throwaway branch, omitting the two test files
// that are its deliverable.
//
// So the range is resolved against the repository and the file lists are compared to it.
async function revisionExists(sha) {
  try {
    const { stdout } = await run('git', ['cat-file', '-t', sha]);
    return stdout.trim() === 'commit';
  } catch { return false; }
}

test('a handoff cites revisions that exist and a range that is real', async () => {
  const bad = [];
  for (const [name, body] of await authorHandoffs()) {
    for (const field of ['base_revision', 'head_revision_or_patch_checksum']) {
      const value = body[field];
      if (!/^[0-9a-f]{40}$/.test(value ?? '')) continue;
      if (!(await revisionExists(value))) {
        bad.push(`${name}.${field} names ${value.slice(0, 12)}…, which is not a commit in this repository. A rebase orphans a SHA; the handoff has to be regenerated with it.`);
      }
    }
  }
  assert.deepEqual(bad, [], `handoff(s) citing a revision that does not exist:\n  ${bad.join('\n  ')}`);
});

test('a handoff file list matches the range it cites', async () => {
  const wrong = [];
  for (const [name, body] of await authorHandoffs()) {
    const base = body.base_revision;
    const head = body.head_revision_or_patch_checksum;
    if (!/^[0-9a-f]{40}$/.test(base ?? '') || !/^[0-9a-f]{40}$/.test(head ?? '')) continue;
    if (!(await revisionExists(base)) || !(await revisionExists(head))) continue;
    let stdout;
    try { ({ stdout } = await run('git', ['diff', '--no-renames', '--name-status', `${base}..${head}`])); }
    catch { wrong.push(`${name} cites a range git cannot diff`); continue; }
    const actual = { A: [], M: [], D: [] };
    for (const line of stdout.trim().split('\n').filter(Boolean)) {
      const [flag, ...rest] = line.split('\t');
      if (actual[flag[0]]) actual[flag[0]].push(rest.join('\t'));
    }
    for (const [flag, field] of [['A', 'files_added'], ['M', 'files_modified'], ['D', 'files_deleted']]) {
      const declared = [...(body[field] ?? [])].sort();
      const real = [...actual[flag]].sort();
      const missing = real.filter((f) => !declared.includes(f));
      const invented = declared.filter((f) => !real.includes(f));
      if (missing.length || invented.length) {
        wrong.push(`${name}.${field}: ${missing.length} path(s) the range changed but the handoff omits`
          + (missing.length ? ` (${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ', …' : ''})` : '')
          + `, ${invented.length} the handoff claims but the range does not contain`);
      }
    }
  }
  assert.deepEqual(wrong, [], `handoff(s) whose file list does not match their own range:\n  ${wrong.join('\n  ')}`);
});

test('a handoff records a revision range that can be checked, or says it cannot', async () => {
  const bad = [];
  for (const [name, body] of await authorHandoffs()) {
    for (const field of ['base_revision', 'head_revision_or_patch_checksum']) {
      const value = body[field];
      if (typeof value !== 'string' || value.trim() === '') {
        bad.push(`${name}.${field} is missing`);
        continue;
      }
      const full = /^[0-9a-f]{40}$/.test(value);
      const abbreviated = /^[0-9a-f]{7,39}$/.test(value);
      if (abbreviated && !full) {
        bad.push(`${name}.${field} is an abbreviated commit id (${value}). Abbreviations survive until the object does; two handoffs in this repository cited SHAs that a rebase had already orphaned. Record the full id.`);
      }
    }
  }
  assert.deepEqual(bad, [], `handoff(s) whose revision range cannot be checked:\n  ${bad.join('\n  ')}`);
});

// A handoff can cite a range that is entirely true and still describe none of the branch. The
// revision-resolving checks above prove a handoff cannot INVENT history; neither of them can
// tell that the cited range stopped four commits ago. This branch's own handoff cited
// 653f699..ae5864d -- accurate, and blind to every guard added after it, including the two
// checks directly above this one.
//
// The range is regenerated from history by `npm run refresh:handoff`, for the same reason the
// test count is: nobody should maintain by hand a fact the repository already knows.
test('the handoff for this branch describes this branch', async () => {
  const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
  const resolved = reportFor(branch, await claimantsOf(branch));
  if (resolved.code !== 0) {
    // A detached HEAD or a branch no package claims is the branch-identity guard's business,
    // not this one. Skipping here would hide it; that guard reports it in CI.
    return;
  }
  const handoff = JSON.parse(await readFile(`handoffs/${resolved.message}-author-handoff.json`, 'utf8'));
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const since = changedIn(handoff.head_revision_or_patch_checksum, head);
  const { substantive } = classify([...since.added, ...since.modified]);
  assert.deepEqual(substantive, [],
    `${resolved.message}'s handoff cites head ${handoff.head_revision_or_patch_checksum.slice(0, 7)}, `
    + `after which ${substantive.length} substantive path(s) changed:\n  ${substantive.join('\n  ')}\n`
    + 'The range is true and does not describe the branch. Run `npm run refresh:handoff`.');
});
