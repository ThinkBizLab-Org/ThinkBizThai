// A package may declare `required_human_authorities`: things that must happen outside the
// package before its work is releasable. The field is an unconstrained array of free text in
// `.agents/work-package.schema.json`, and its entries have been carrying two incompatible
// meanings under one name -- "Product Owner disposition of RFC-2026-004", which is a person,
// and "A1 sign-off for CTR-SEC-001", which is an agent run. A field named *human* authorities
// has been listing agent runs.
//
// That was harmless while nothing depended on the distinction. RFC-2026-013 records the
// Product Owner's ruling that an agent run's assessment IS that role's signature, which makes
// the distinction load-bearing.
//
// WHAT THIS FILE CHECKS, and it is narrower than the field's name suggests:
//
//   Every entry that names a decision record resolves to a decision record that EXISTS and
//   carries a Product Owner disposition. A package citing an RFC nobody wrote, or one still
//   `Proposed`, fails here.
//
// WHAT IT DOES NOT CHECK, stated because a guard that reports a wider reason than it can
// substantiate is worse than one that stays silent:
//
//   - that the disposition was correct, or that the Product Owner read the RFC
//   - that an agent-role entry was genuinely signed -- that lives in the role's own evidence
//   - that a human authority with no RFC (the accountant, Privacy/Legal) has been satisfied.
//     Nothing in this repository can close those, and this file does not pretend to.
//
// Classification is by DECLARED SET, not by parsing prose. An entry phrased in a way the set
// does not recognise fails loudly and asks to be classified. That direction is deliberate: the
// alternative is a regex that quietly reads an unfamiliar sentence as satisfied.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PACKAGES = 'work-packages';
const DECISIONS = 'architecture/decisions';

// A disposition is a Status line that records a decision, not one that records a proposal.
// `Proposed` is the only status that means nobody has ruled; everything else is a ruling and
// its wording is the Product Owner's to choose, so this matches the absence of the one word
// rather than guessing at an approval vocabulary. Independent review has twice caught an
// approval check that accepted a noun where a verb was meant; the safer shape here is to
// require the record to say something other than "still open".
const UNDISPOSED = /^status:\s*proposed\s*$/i;

// Roles a capability profile declares an agent run may hold. An entry naming one of these is
// satisfied by that role's own signature under RFC-2026-013, not by anything this file reads.
const AGENT_HOLDABLE = /(?<![\w-])(A[1-6]|Integration Owner|Independent Reviewer|Independent Tester)(?![\w-])/;

// Authorities that are a person and stay a person. RFC-2026-013 is explicit that the Product
// Owner's own role is not delegated by the ruling it records.
const HUMAN_ONLY = /(Product Owner|Accountant|Privacy\/Legal|Legal|Privacy|skincare reviewer)/i;

const CITES_DECISION = /(RFC-\d{4}-\d{3})/;

async function manifests() {
  const found = [];
  for (const name of (await readdir(PACKAGES)).sort()) {
    if (!name.endsWith('.json')) continue;
    found.push(JSON.parse(await readFile(join(PACKAGES, name), 'utf8')));
  }
  assert.ok(found.length > 0, 'no work-package manifests were read — this guard would pass on an empty set, which is the one way it must not pass');
  return found;
}

async function decisionRecords() {
  const byId = new Map();
  for (const name of await readdir(DECISIONS)) {
    if (!name.endsWith('.md')) continue;
    const id = CITES_DECISION.exec(name)?.[1];
    if (!id) continue;
    const text = await readFile(join(DECISIONS, name), 'utf8');
    const status = text.split('\n').find((line) => /^status:/i.test(line.trim()))?.trim() ?? '';
    byId.set(id, { name, status });
  }
  assert.ok(byId.size > 0, 'no decision records were read — every citation would then be unresolvable and this guard would report the wrong reason for every package');
  return byId;
}

test('every authority a package claims on a decision record matches that record', async () => {
  const records = await decisionRecords();
  const problems = [];
  for (const manifest of await manifests()) {
    const id = manifest.work_package_id ?? '<unknown>';
    for (const entry of manifest.required_human_authorities ?? []) {
      const cited = CITES_DECISION.exec(entry)?.[1];
      if (!cited) continue;
      const record = records.get(cited);
      if (record === undefined) {
        problems.push(`${id} requires a disposition of ${cited}, and no decision record by that id exists. A package cannot wait on a document nobody wrote.`);
        continue;
      }
      if (UNDISPOSED.test(record.status)) {
        problems.push(`${id} requires a disposition of ${cited}, which is still "${record.status}". The package may not be treated as clear of it.`);
      }
    }
  }
  assert.deepEqual(problems, [], `authority claim(s) that do not match the record they name:\n  ${problems.join('\n  ')}`);
});

test('every declared authority is classified, so no new one is silently satisfied', async () => {
  const unclassified = [];
  for (const manifest of await manifests()) {
    const id = manifest.work_package_id ?? '<unknown>';
    for (const entry of manifest.required_human_authorities ?? []) {
      if (CITES_DECISION.test(entry)) continue;
      if (HUMAN_ONLY.test(entry) || AGENT_HOLDABLE.test(entry)) continue;
      unclassified.push(`${id}: "${entry.slice(0, 90)}" names neither a decision record, an agent-holdable role, nor a human authority. Classify it in this file or rewrite the entry; an authority nobody can categorise is one nobody will check.`);
    }
  }
  assert.deepEqual(unclassified, [], `unclassified authority declaration(s):\n  ${unclassified.join('\n  ')}`);
});

test('the classification sets do not overlap into nonsense', () => {
  // A guard whose two sets both match the same string decides by evaluation order, which is an
  // accident rather than a rule. These are the real entries in the tree, and the two that
  // legitimately contain both a role noun and a human noun are the reason the decision-record
  // branch is checked FIRST -- "Product Owner disposition of RFC-2026-010" is resolved by the
  // record it names, not by either word in it.
  assert.ok(AGENT_HOLDABLE.test('A1 sign-off for CTR-SEC-001'), 'an A1 sign-off must read as agent-holdable');
  assert.ok(HUMAN_ONLY.test('Accountant and Privacy/Legal review'), 'the accountant must read as human-only');
  assert.ok(!AGENT_HOLDABLE.test('A6 relay pipeline'.replace('A6', 'A66')), 'a role noun must not match inside a longer token');
  assert.ok(CITES_DECISION.test('Product Owner disposition of RFC-2026-010'), 'a decision citation must be recognised before either classification');
});
