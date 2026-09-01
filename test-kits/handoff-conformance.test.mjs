import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { validate } from './contracts/json-schema-subset.mjs';

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
    const touchesContracts = [...body.files_added, ...body.files_modified]
      .some((f) => f.startsWith('contract-catalog/'));
    const claimsContracts = /contract-catalog changes are additive/i.test(body.compatibility_impact ?? '');
    if (claimsContracts && !touchesContracts) {
      wrong.push(`${name} claims contract-catalog compatibility impact but changes no contract-catalog file`);
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
