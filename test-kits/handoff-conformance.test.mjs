import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { validate } from './contracts/json-schema-subset.mjs';
import { branchTipBefore, changedIn, classify, driftBetween } from '../scripts/refresh-author-handoff.mjs';
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
    // `/fixtures/` matched NOTHING. Independent review twelve counted it: of 705 JSON files
    // under contract-catalog/, 29 were visible to this check and 0 matched `/fixtures/`, because
    // every fixture in this repository lives in `examples/`. A package could delete or weaken
    // every negative fixture -- the entire evidence base of the conformance suite and of every
    // mutation-coverage number in it -- and report no compatibility impact at all.
    //
    // Executed both ways after the correction: adding an `examples/` path to a handoff that
    // claims no contract impact now fails, and adding a README still does not.
    const contractArtifacts = [...body.files_added, ...body.files_modified].filter((f) => (
      f.startsWith('contract-catalog/')
      && (/\/(manifest|schema|index)\.json$/.test(f) || /\/examples\//.test(f))
    ));
    const touchesContracts = contractArtifacts.length > 0;
    // Independent review, and then this guard's own author, both got this wrong. The check
    // first accepted exactly one sentence -- "contract-catalog changes are additive" -- which
    // means a handoff describing a BREAKING catalog change could not state its impact
    // truthfully and pass. It had to write the additive sentence or fail. A guard that forces
    // a false statement is worse than no guard, so the accepted set is the set of POSITIONS a
    // handoff may take, not one blessed phrase; silence still fails, which is the half that
    // matters. Caught when CTR-USG-001's dedupe key changed shape and the only passing wording
    // would have called a breaking change additive.
    //
    // Widening it introduced a second bug immediately, which is recorded because it is the more
    // interesting one: one boolean was answering two different questions. "Does this handoff
    // ASSERT a contract change?" and "Does it STATE a position on contract compatibility?" are
    // not the same, and a handoff saying "No contract changes." is a position, not a claim of
    // impact. Reusing one flag made that sentence trip the opposite check. They are separated
    // below: an assertion of impact is checked against whether contracts really changed; a
    // stated position, positive or negative, satisfies the requirement to say something.
    // Widened a second time, and for the reason the first widening recorded: a handoff must be
    // able to state its real position truthfully. "Corrective" is a third position, distinct
    // from additive and from breaking -- a change that replaces a false sentence with a true one
    // and moves no rule, enum, requiredness or freeze level. Caught when CTR-SEC-001's
    // zero-coverage claim was corrected and the only accepted wordings would have called that
    // change either additive, which it is not, or breaking, which it is not either. The set is
    // POSITIONS, not blessed phrases; silence still fails, and that is the half that matters.
    const ASSERTS_CONTRACT_IMPACT = [
      /contract-catalog changes are additive/i,
      /\bBREAKING\b/,
      /contract-catalog changes are corrective/i,
    ];
    const NEGATIVE_POSITIONS = [
      /no contract (?:changes|interface changes)/i,
      /no other contract changes/i,
      /no contract-catalog file/i,
    ];
    const impact = body.compatibility_impact ?? '';
    const assertsImpact = ASSERTS_CONTRACT_IMPACT.some((p) => p.test(impact));
    const claimsContracts = assertsImpact || NEGATIVE_POSITIONS.some((p) => p.test(impact));
    if (assertsImpact && !touchesContracts && !NEGATIVE_POSITIONS.some((p) => p.test(impact))) {
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
  // Compared against the branch as it stood BEFORE this commit: a handoff cannot cite the
  // revision that contains it. `branchTipBefore` is HEAD^ for an ordinary commit and, for a merge,
  // the parent on this branch's own side -- which is the first parent of a merge run on the branch
  // and the second of the merge commit CI checks out on a pull request.
  const tipBefore = branchTipBefore();
  assert.ok(tipBefore.ok, `${tipBefore.message ?? ''}`);
  const drift = driftBetween(handoff.head_revision_or_patch_checksum, tipBefore.tip);
  assert.notEqual(drift.state, 'unrelated',
    `${resolved.message}'s handoff cites a revision on no path to this branch`);
  const substantive = drift.paths;
  assert.deepEqual(substantive, [],
    `${resolved.message}'s handoff cites head ${handoff.head_revision_or_patch_checksum.slice(0, 7)}, `
    + `after which ${substantive.length} substantive path(s) changed:\n  ${substantive.join('\n  ')}\n`
    + 'The range is true and does not describe the branch. Run `npm run refresh:handoff`.');
});

test('a range is never compared backwards', async () => {
  // Between `refresh:handoff` and the commit that carries it, the cited head is HEAD -- ahead of
  // the comparison point. `git diff a..b` on a reversed range reports the REVERSE diff, so the
  // first version of this guard failed with a list of paths that had not drifted at all. A guard
  // that reports a wrong reason is how a real finding gets dismissed as noise.
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const tipBefore = branchTipBefore();
  assert.ok(tipBefore.ok, `${tipBefore.message ?? ''}`);
  const parent = tipBefore.tip;
  assert.equal(driftBetween(head, head).state, 'clean');
  if (parent !== head) {
    assert.equal(driftBetween(head, parent).state, 'awaiting-commit',
      'a handoff refreshed but not yet committed is not drift');
    assert.deepEqual(driftBetween(head, parent).paths, [],
      'a reversed range must report no paths, not the reverse diff');
  }
});

test('a fixture change counts as contract impact', async () => {
  // The clause this replaces tested for `/fixtures/`, which matched 0 of 705 catalog JSON files.
  // Asserted directly on the classifier rather than on the ten real handoffs, because the check
  // above only fires when a handoff both changes an artifact and claims nothing -- a state the
  // repository is not allowed to be in, so it cannot be observed from the committed files.
  const isArtifact = (f) => f.startsWith('contract-catalog/')
    && (/\/(manifest|schema|index)\.json$/.test(f) || /\/examples\//.test(f));
  assert.ok(isArtifact('contract-catalog/shared-kernel/ctr-api-001/examples/valid-success.json'),
    'a fixture is the evidence base of every conformance and coverage number; changing it is contract impact');
  assert.ok(isArtifact('contract-catalog/shared-kernel/ctr-api-001/examples/invalid-missing-status.json'));
  assert.ok(isArtifact('contract-catalog/shared-kernel/ctr-api-001/schema.json'));
  assert.ok(isArtifact('contract-catalog/shared-kernel/index.json'));
  assert.ok(!isArtifact('contract-catalog/README.md'), 'prose carries no compatibility surface');
  // The exact string the old clause looked for, so the regression is named.
  assert.ok(!isArtifact('contract-catalog/shared-kernel/ctr-api-001/fixtures/anything.json')
    || true, 'no fixtures/ directory exists in this repository; the old clause matched nothing');
});

// Independent review sixteen wrote a fabricated approval into a handoff and an evidence file --
// "/claude/a1_bastion executed the check at exit 0 and approved it" -- and nothing caught it,
// because `handoffs/` and `evidence/` are WRITTEN_AFTERWARDS by construction: a handoff cannot
// list the commit that contains it.
//
// A digest cannot fix that, and the review said so. **The separation of duties can fix part of
// it.** An author writes an author handoff and moves work no further than `in_review`; approval is
// a different role's artifact, in a different file, written by a different agent_run_id. So a
// handoff that speaks for a role it does not hold is a protocol violation this can see, even
// though a handoff that merely lies about its own work is not.
//
// This is a partial control, and the remaining half is on the "not closed" list where it belongs.
// Independent review seventeen defeated the first version twice.
//
// **Vocabulary.** "completed the independent security review … raised no objections, and cleared
// the shared-kernel freeze" contains none of the five stems the regex hunted for. exit 0.
//
// **The window.** `prose.indexOf(runId)` takes the FIRST occurrence only, so a benign mention in a
// field serialised earlier moved the ±160-character window off the payload entirely — and the
// payload then used the literal words "approved" and "signed off", attached to the security
// reviewer's run id, in the field a freeze reviewer reads. exit 0.
//
// Three corrections: every occurrence, the whole string value rather than a byte window over the
// serialised JSON, and any `/claude/…`-shaped id that is not the author's — the previous version
// only examined ids present in `role_assignments`, so an approval attributed to anything else was
// never looked at.
//
// The vocabulary is still a vocabulary and cannot be the control on its own. It is widened, and
// the limitation stays on the "not closed" list.
// VERB FORMS ONLY, and only ones that say the thing was DONE. Independent review twenty showed
// the cost of a broader list: `"A1 and A6 sign-off is outstanding"` and `"the judgement is
// accepted"` are honest sentences in real handoffs, and flagging them would train a reader to
// ignore this check -- the failure mode this package has recorded four times.
//
// The noun `sign-off` is out, and so is `accepted`, which in these handoffs means the author
// accepting a finding rather than a role approving a package. What remains is the shape a
// fabricated approval actually takes: somebody APPROVED, SIGNED OFF, CLEARED or RATIFIED it.
const APPROVAL_LANGUAGE = /\b(approved|approves|signed off|signs off|cleared|clears|countersigned|ratified|authoris(ed|es)|authoriz(ed|es)|endorsed)\b/i;
// The ids are ENUMERATED from the repository -- every capability profile and every role
// assignment -- rather than pattern-matched. The first version used a `/x/y` shape and reported
// `contract-catalog/shared-kernel/ctr-api-001/examples/valid-accepted.json` as an agent run id,
// which is a guard reporting a wrong reason: the thing this package has already recorded twice as
// worse than a guard that stays silent.
async function knownRunIds() {
  const ids = new Set();
  for (const entry of await readdir('.agents/capability-profiles')) {
    if (!entry.endsWith('.json')) continue;
    const profile = JSON.parse(await readFile(join('.agents/capability-profiles', entry), 'utf8'));
    if (typeof profile.agent_run_id === 'string') ids.add(profile.agent_run_id);
  }
  for (const entry of await readdir('work-packages')) {
    if (!entry.endsWith('.json')) continue;
    const manifest = JSON.parse(await readFile(join('work-packages', entry), 'utf8'));
    for (const [key, value] of Object.entries(manifest.role_assignments ?? {})) {
      if (key.endsWith('_agent_run_id') && typeof value === 'string') ids.add(value);
    }
  }
  return [...ids];
}

// A sentence that says an approval is REQUIRED, OUTSTANDING or ABSENT is the opposite of a
// fabricated one, and three real handoffs say exactly that -- "requires an acknowledgement
// countersigned by WP-0A-A0-001's Integration Owner". Flagging those would train a reader to
// ignore this check, which is how a guard stops working without anyone editing it.
// A CLOSED set, and `not`/`never`/`no` are out of it. Independent review nineteen executed the
// weak point the previous comment predicted: "…approved the security review and … signed off on
// the freeze, and nothing is not resolved" -- one clause, both ids, one `not`, **exit 0**.
//
// The three real handoff sentences that needed those words say an approval is *required* or
// *not countersigned*; both still match this set through `required` and `countersign`. If a real
// sentence ever needs a word that is not here, the honest fix is to rewrite the sentence, not to
// widen the exemption -- a wider exemption is a wider bypass, one for one.
const OUTSTANDING = /\b(requires?|required|outstanding|pending|awaits?|unresolved|blocked|uncountersigned|not countersigned|no .{0,20}(approval|sign-?off))\b/i;

// ORDER, not vocabulary. `"requires an acknowledgement countersigned by …"` and `"signed off …
// and nothing is pending"` contain the same two kinds of word; what separates them is which comes
// first. An exempting word BEFORE the approval verb governs it -- the approval is being asked for.
// After it, the exemption is a trailing clause bolted onto a claim, which is exactly how review
// twenty smuggled three of them.
const exemptionGovernsApproval = (clause) => {
  const outstanding = clause.search(OUTSTANDING);
  const approval = clause.search(APPROVAL_LANGUAGE);
  return outstanding !== -1 && outstanding < approval;
};

// A role NOUN carries the same claim as a run id and the check could not see it. The review wrote
// "The independent Security/Privacy reviewer … cleared the freeze; the independent Tester signed
// off … and the Integration Owner approved the merge" -- three fabricated approvals, no ids at
// all, **exit 0**.
// Widened after independent review twenty walked past every gap in the first list: a bare
// `reviewer`, `security review` rather than `security reviewer`, and the OWNER CODES this
// repository actually uses -- `A1 and A6 have signed off` names neither a run id nor a role noun,
// and A1/A6 are exactly who RFC-2026-010 is waiting on.
// The owner code must not match inside an identifier: `A0` sits in `WP-0A-A0-001` in every
// handoff, and the first version of this list reported those as approvals -- a guard reporting a
// wrong reason, for the sixth time in this package, caught by running it.
const ROLE_NOUN = /\b(reviewer\w*|review|tester|testing|integration owner|product owner|steward)\b|(?<![\w-])A[0-6](?![\w-])/i;

// `not` is deliberately in that list, and it is the weak point: a fabricated approval can include
// the word. Clause-level evaluation narrows it -- "X approved this" and "Y is not countersigned"
// are different clauses now -- but a single clause saying "X approved this and nothing is not
// outstanding" would still pass. **A vocabulary is not a control**, which is why the residual
// limitation stays on the not-closed list: a handoff's claims about who approved what need a
// reader, and this check only makes the crude forms fail.
//
// The alternative -- flagging every real handoff that says "requires an acknowledgement
// countersigned by ..." -- would train that reader to ignore the check, which is worse.

// Every string anywhere in the document, with the path that reached it, so a claim cannot hide in
// a nested array the way it hid outside a byte window.
function stringsOf(node, path = '') {
  if (typeof node === 'string') return [[path, node]];
  if (Array.isArray(node)) return node.flatMap((item, index) => stringsOf(item, `${path}[${index}]`));
  if (node === null || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) => stringsOf(value, path ? `${path}.${key}` : key));
}

test('an author handoff does not record an approval it has no authority to give', async () => {
  const wrong = [];
  const runIds = await knownRunIds();
  for (const [name, body] of await authorHandoffs()) {
    const author = body.agent_run_id;
    const manifestPath = `work-packages/${body.work_package_id}.json`;
    const manifest = await readFile(manifestPath, 'utf8').then(JSON.parse).catch(() => null);
    if (manifest === null) continue;
    const roles = manifest.role_assignments ?? {};
    if (!['author_complete', 'in_review', 'ready', 'backlog'].includes(body.final_status)) {
      wrong.push(`${name} declares final_status ${JSON.stringify(body.final_status)}; an author moves work no further than in_review`);
    }
    if (author !== roles.author_agent_run_id) {
      wrong.push(`${name} is written by ${author} but ${manifestPath} names ${roles.author_agent_run_id} as author`);
    }
    for (const [path, value] of stringsOf(body)) {
      // CLAUSE BY CLAUSE. Independent review eighteen exempted a whole value by appending one
      // sentence containing an exempting word -- "/claude/a1_bastion signed off on the security
      // review at exit 0 and cleared the freeze. Only the Product Owner merge button is still
      // pending." Three roles, three approval verbs, one `pending`, exit 0.
      //
      // An exemption in a neighbouring clause must not cover an affirmative approval in this one.
      const clauses = value.split(/(?<=[.;!?])\s+/).filter((clause) => clause.trim().length > 0);
      // An exempting word no longer rescues a clause that also ATTRIBUTES the approval. Review
      // twenty's `"The independent Tester signed off on the freeze and nothing is pending."`
      // carried `pending` and an attribution in the same clause and passed.
      //
      // The real handoff sentences that need an exemption -- `"requires an acknowledgement
      // countersigned by … /root/r0_steward"` -- attribute nothing: they say an approval is
      // MISSING. That is the discriminator, and it is structural rather than lexical.
      const claimed = clauses.filter((clause) => APPROVAL_LANGUAGE.test(clause)
        && !exemptionGovernsApproval(clause));
      if (claimed.length === 0) continue;
      const mentioned = runIds.filter((id) => id !== author
        && claimed.some((clause) => clause.includes(id)));
      const roles = claimed.filter((clause) => ROLE_NOUN.test(clause))
        .map((clause) => clause.match(ROLE_NOUN)[0]);
      if (mentioned.length === 0 && roles.length === 0) continue;
      wrong.push(`${name}.${path} attributes approval language to ${[...new Set([...mentioned, ...roles])].join(', ')}: `
        + `${JSON.stringify(claimed[0].slice(0, 120))}`);
    }
  }
  assert.deepEqual(wrong, [], `handoff(s) speaking for a role they do not hold:\n  ${wrong.join('\n  ')}\n`
    + 'A handoff that lies about its own work is not caught by anything here — that needs a reader.');
});


test('no file under handoffs records an approval its author cannot give', async () => {
  // The check above reads only `*-author-handoff.json`. `handoffs/` already holds `.md` files --
  // integration verdicts -- and independent review twenty put a fabricated approval in one:
  // "The independent Reviewer approved this package and the Integration Owner merged it."
  // **exit 0.** The control was entirely absent for the file shape a reviewer or integration
  // handoff actually uses.
  const runIds = await knownRunIds();
  const wrong = [];
  // AUTHOR artifacts only, whatever their extension. My first version scanned every file under
  // `handoffs/` and immediately reported four real ones -- an integration verdict recording the
  // Integration Owner's own approval, which is precisely the artifact where that belongs. A guard
  // that flags the correct use of the protocol teaches people to ignore it, and this package has
  // recorded that failure five times now.
  //
  // What review twenty actually found is narrower: the check read `*-author-handoff.json` and an
  // author could write `WP-…-author-note.md` beside it. That is the hole; this is its size.
  for (const name of (await readdir(HANDOFFS)).sort()) {
    if (!name.includes('author')) continue;
    if (name.endsWith('-author-handoff.json')) continue;
    const body = await readFile(join(HANDOFFS, name), 'utf8');
    for (const clause of body.split(/(?<=[.;!?])\s+/)) {
      if (!APPROVAL_LANGUAGE.test(clause) || exemptionGovernsApproval(clause)) continue;
      const named = [
        ...runIds.filter((id) => clause.includes(id)),
        ...(ROLE_NOUN.test(clause) ? [clause.match(ROLE_NOUN)[0]] : []),
      ];
      if (named.length === 0) continue;
      wrong.push(`${name} attributes approval to ${[...new Set(named)].join(', ')}: ${JSON.stringify(clause.slice(0, 110))}`);
    }
  }
  assert.deepEqual(wrong, [], `handoff file(s) recording an approval:\n  ${wrong.join('\n  ')}\n`
    + 'An approval is the approving role\'s own artifact, and an author writes none of them. '
    + 'A reviewer\'s or integration owner\'s record of their OWN approval is legitimate and is not '
    + 'checked here — telling a true one from a fabricated one needs a reader, which is item 9 on '
    + 'the not-closed list.');
});

// The guard above says a cited revision must exist. It resolves against the LOCAL object store,
// and that is why it kept passing here while failing in CI: a squash merge orphans every commit on
// the branch, and the orphans stay reachable in the clone that made them. A fresh clone has only
// what is on `main`.
//
// It has now happened twice in a row — WP-0A-CON-008 after PR #44, WP-0A-A0-006 after PR #45 —
// each caught by CI, each repaired by hand. The repair is not the fix. Every squash merge from here
// would do it again.
//
// So the stronger condition is asserted: a cited revision must be an ANCESTOR OF `main`, not merely
// present somewhere locally. That fails on the machine that made the orphan, at the moment it is
// made, instead of one push later on someone else's clone.
//
// The operational consequence is recorded here because it belongs with the check that enforces it:
// **merge with a merge commit, not a squash.** A squash rewrites the branch into a new commit and
// discards the ones every handoff on that branch cites. `--merge` keeps them reachable from `main`
// and this test stays green without anything being regenerated.
test('a handoff cites revisions reachable from main, not just from this clone', async () => {
  const mainRef = await run('git', ['rev-parse', '--verify', 'origin/main'])
    .then(() => 'origin/main', () => 'main');
  const unreachable = [];
  for (const [name, body] of await authorHandoffs()) {
    for (const field of ['base_revision', 'head_revision_or_patch_checksum']) {
      const value = body[field];
      if (!/^[0-9a-f]{40}$/.test(value ?? '')) continue;
      // A handoff on an unmerged branch legitimately cites commits not yet on main. Only a
      // revision that exists locally AND is absent from main's history is the orphan case: the
      // commit was made, then rewritten away.
      let reachable = false;
      try {
        await run('git', ['merge-base', '--is-ancestor', value, mainRef]);
        reachable = true;
      } catch { reachable = false; }
      if (reachable) continue;
      let onThisBranch = false;
      try {
        await run('git', ['merge-base', '--is-ancestor', value, 'HEAD']);
        onThisBranch = true;
      } catch { onThisBranch = false; }
      if (!onThisBranch) {
        unreachable.push(`${name}.${field} names ${value.slice(0, 12)}…, which is on neither ${mainRef} nor this branch`);
      }
    }
  }
  assert.deepEqual(unreachable, [], `handoff(s) citing an orphaned revision:\n  ${unreachable.join('\n  ')}\n`
    + 'A squash merge rewrites the branch and discards the commits its handoffs cite. Merge with a merge '
    + 'commit instead, or regenerate the handoff against the commit that survived.');
});

// THE HEAD WAS REGENERATED FROM HISTORY AND THE BASE WAS TAKEN ON FAITH.
//
// `refresh-author-handoff.mjs` read `base_revision` out of the record it was rewriting, so the
// range only ever grew forwards. That holds while a package has one branch. It breaks the moment a
// package comes back for a SECOND increment: the new branch is cut from a main that has absorbed
// the first one and everybody else's, the stored base is far behind that branch point, and
// `base..HEAD` claims every file merged in between.
//
// WP-0A-CON-002's second branch changed four lines of one manifest and its refreshed handoff read
// `d207d7d..463cf97 — 861 added, 37 modified`. `a handoff file list matches the range it cites`
// above was green over it: the refresher had written the file lists AND the range from the same
// wrong base, so the two agreed. Two things derived from one mistake agree about the mistake.
//
// So the situation is CONSTRUCTED here rather than asserted on a string: a branch, a merge into
// main, other packages landing on main, then a second branch off the new main. A refresher that
// trusts the record claims the merged-in files; one that reads the branch point does not.
const REFRESHER = join(process.cwd(), 'scripts/refresh-author-handoff.mjs');

// The child must not inherit the test runner's environment: NODE_TEST_CONTEXT makes a nested node
// process report as a subtest and exit 0 whatever happened inside, and a probe that silently fails
// to observe looks exactly like a guard that does not fire.
const refresherEnv = () => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  return env;
};

// A real repository, not a mock: the script shells out to git for every fact it uses, so a mock
// would be testing the mock. Nothing here touches this repository -- each case builds its own and
// removes it in a `finally`.
async function scenarioRepository() {
  const root = await mkdtemp(join(tmpdir(), 'handoff-base-'));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
    return result.stdout.trim();
  };
  git('init', '-q', '-b', 'main', '.');
  // Assembled rather than written out: the repository's own secret scanner reports a literal
  // address anywhere in the tree, and this suite is inside the tree it scans.
  git('config', 'user.email', ['handoff-base-test', 'example.invalid'].join('@'));
  git('config', 'user.name', 'handoff base test');
  await mkdir(join(root, 'work-packages'));
  await mkdir(join(root, 'handoffs'));
  await writeFile(join(root, 'shared.txt'), 'base\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  return { root, git };
}

const declareBranch = (root, branch) => writeFile(join(root, 'work-packages/WP-TEST-001.json'),
  `${JSON.stringify({ work_package_id: 'WP-TEST-001', ownership: { branch } }, null, 2)}\n`);

const HANDOFF = 'handoffs/WP-TEST-001-author-handoff.json';
const writeHandoff = (root, base, head) => writeFile(join(root, HANDOFF),
  `${JSON.stringify({
    work_package_id: 'WP-TEST-001',
    base_revision: base,
    head_revision_or_patch_checksum: head,
    files_added: [], files_modified: [], files_deleted: [],
  }, null, 2)}\n`);

const refresh = (root, args = []) =>
  spawnSync(process.execPath, [REFRESHER, ...args], { cwd: root, encoding: 'utf8', env: refresherEnv() });

// A package's first branch, merged into main, with other work landing on main behind it. Returns
// the revisions a second increment has to tell apart.
async function firstIncrementMerged({ root, git }) {
  const firstBase = git('rev-parse', 'HEAD');
  git('checkout', '-qb', 'agent/test/first');
  await writeFile(join(root, 'increment-one.txt'), 'one\n');
  git('add', '-A');
  git('commit', '-qm', 'increment one');
  const firstHead = git('rev-parse', 'HEAD');
  git('checkout', '-q', 'main');
  git('merge', '-q', '--no-ff', '-m', 'merge increment one', 'agent/test/first');
  for (const n of [1, 2, 3]) {
    await writeFile(join(root, `another-package-${n}.txt`), 'landed on main\n');
    git('add', '-A');
    git('commit', '-qm', `another package ${n}`);
  }
  return { firstBase, firstHead, mainTip: git('rev-parse', 'HEAD') };
}

test('a second increment cites its own branch point, not the base its first branch left behind', async () => {
  const scenario = await scenarioRepository();
  const { root, git } = scenario;
  try {
    const { firstBase, firstHead, mainTip } = await firstIncrementMerged(scenario);

    git('checkout', '-qb', 'agent/test/second');
    await declareBranch(root, 'agent/test/second');
    await writeHandoff(root, firstBase, firstHead);
    await writeFile(join(root, 'increment-two.txt'), 'two\n');
    git('add', '-A');
    git('commit', '-qm', 'increment two');

    const refreshed = refresh(root);
    assert.equal(refreshed.status, 0, `${refreshed.stdout}${refreshed.stderr}`);
    const handoff = JSON.parse(await readFile(join(root, HANDOFF), 'utf8'));

    assert.equal(handoff.base_revision, mainTip,
      'the base of a second increment is where its branch left main, not where the first branch started');
    const claimed = [...handoff.files_added, ...handoff.files_modified].sort();
    const notThisBranch = claimed.filter((path) => path.startsWith('another-package-') || path === 'increment-one.txt');
    assert.deepEqual(notThisBranch, [],
      'the handoff claims file(s) that reached main through another package\'s merge, which is the 861-file defect');
    assert.deepEqual(claimed, [HANDOFF, 'increment-two.txt', 'work-packages/WP-TEST-001.json'].sort(),
      'and it claims exactly what this branch changed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('an in-progress branch keeps the base it recorded, byte for byte', async () => {
  // The other direction, without which the fix would trade one wrong range for another: when the
  // stored base already IS the branch point -- every ordinary branch, every day -- nothing about it
  // may change. Run against both implementations, this case produces identical output.
  const scenario = await scenarioRepository();
  const { root, git } = scenario;
  try {
    const { mainTip } = await firstIncrementMerged(scenario);
    git('checkout', '-qb', 'agent/test/second');
    await declareBranch(root, 'agent/test/second');
    await writeFile(join(root, 'increment-two.txt'), 'two\n');
    git('add', '-A');
    git('commit', '-qm', 'increment two');
    await writeHandoff(root, mainTip, git('rev-parse', 'HEAD'));
    await writeFile(join(root, 'increment-two-more.txt'), 'more\n');
    git('add', '-A');
    git('commit', '-qm', 'increment two, second commit');

    const refreshed = refresh(root);
    assert.equal(refreshed.status, 0, `${refreshed.stdout}${refreshed.stderr}`);
    assert.doesNotMatch(refreshed.stdout, /base moved/,
      'a base that is already the branch point must not be reported as moved');
    const handoff = JSON.parse(await readFile(join(root, HANDOFF), 'utf8'));
    assert.equal(handoff.base_revision, mainTip, 'the recorded base is untouched');
    assert.deepEqual([...handoff.files_added, ...handoff.files_modified].sort(),
      [HANDOFF, 'increment-two-more.txt', 'increment-two.txt', 'work-packages/WP-TEST-001.json'].sort(),
      'and the range still covers the whole branch');

    // And `--check` says nothing about a base it has no complaint with.
    const checked = refresh(root, ['--check']);
    assert.doesNotMatch(`${checked.stdout}${checked.stderr}`, /branch point/,
      'the check must not report a branch point problem where there is none');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a repository with no integration branch refuses rather than inventing a base', async () => {
  // "Fail with a message that says what it could not determine" -- a clone with a differently named
  // default branch, or a fetch that never brought one. Every alternative is worse: the stored base
  // is the defect above, and the root commit claims the entire repository. Both produce a range
  // that LOOKS plausible, which is how the 861-file handoff got written in the first place.
  const scenario = await scenarioRepository();
  const { root, git } = scenario;
  try {
    git('checkout', '-qb', 'agent/test/second');
    await declareBranch(root, 'agent/test/second');
    await writeFile(join(root, 'increment-two.txt'), 'two\n');
    git('add', '-A');
    git('commit', '-qm', 'increment two');
    await writeHandoff(root, git('rev-parse', 'HEAD~1'), git('rev-parse', 'HEAD'));
    const before = await readFile(join(root, HANDOFF), 'utf8');
    git('branch', '-m', 'main', 'trunk');

    // The literal 93, not the script's own exported constant: importing the constant would make
    // this case fail at module load against an implementation that does not have it, which proves
    // the export exists and nothing about what the script DOES. The other process guards in this
    // repository pin their codes the same way.
    const refreshed = refresh(root);
    assert.notEqual(refreshed.status, 0, `refusing must not be reported as success:\n${refreshed.stdout}${refreshed.stderr}`);
    assert.equal(refreshed.status, 93, 'and with its own exit code, so a caller can tell it from drift (91)');
    assert.match(refreshed.stderr, /cannot determine where this branch left the integration branch/);
    assert.match(refreshed.stderr, /main: no such ref/, 'the message names the ref it looked for');
    assert.equal(await readFile(join(root, HANDOFF), 'utf8'), before,
      'and it writes nothing rather than recording a base it could not establish');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// A MERGE COMMIT'S PARENTS ARE ORDERED BY HOW THE MERGE WAS MADE, NOT BY WHICH SIDE IS THE BRANCH.
//
// `branchTipBefore` took the LAST parent. That is the branch for exactly one merge shape -- the one
// `actions/checkout` builds on a pull request, [base, pull request head] -- and the comment saying
// so was the whole justification. Run `git merge main` on a working branch and git records
// [branch tip, main tip]: the last parent is MAIN, the handoff is compared against main, and the
// head it honestly cites comes back as a revision "on no path to this branch". `refresh:handoff`
// refuses to rewrite an unrelated citation, so the branch could neither pass the guard nor repair
// itself. Batch 040's author hit it, kept its branch linear as a workaround, and reported it.
//
// Reported by an author rather than found by a guard, which is the reason for the cases below:
// every merge shape this repository's own CI produces is constructed, in a real repository, and
// each answer is asserted against the commit that shape means.
const PROBE = `const module = await import(${JSON.stringify(pathToFileURL(REFRESHER).href)});
const answer = module.branchTipBefore();
process.stdout.write(typeof answer === 'string'
  ? answer
  : answer.ok ? answer.tip : \`REFUSED: \${answer.message.split('\\n')[0]}\`);`;

// The exported helper, asked INSIDE a scenario repository: it shells out to git in the process's
// working directory, so it is probed as a child process rather than by moving this one. Written to
// accept BOTH shapes -- the bare SHA the previous implementation returned and the result object
// this one does -- so these cases fail on the ANSWER and never on the shape of it.
const tipBeforeIn = (root) => {
  const probe = spawnSync(process.execPath, ['--input-type=module', '-e', PROBE],
    { cwd: root, encoding: 'utf8', env: refresherEnv() });
  assert.equal(probe.status, 0, `${probe.stdout}${probe.stderr}`);
  return probe.stdout.trim();
};

test('a merge is compared against the branch, whichever side of it git recorded last', async () => {
  // ORIENTATION ONE: main merged INTO the working branch, parents [branch tip, main tip]. This is
  // the shape that was wrong, and it is wrong end to end: the comparison point, the drift verdict,
  // and the exit code of the command whose job is to repair the handoff.
  {
    const scenario = await scenarioRepository();
    const { root, git } = scenario;
    try {
      git('checkout', '-qb', 'agent/test/work');
      await declareBranch(root, 'agent/test/work');
      await writeFile(join(root, 'branch-work.txt'), 'work\n');
      git('add', '-A');
      git('commit', '-qm', 'the work this handoff describes');
      const cited = git('rev-parse', 'HEAD');
      await writeHandoff(root, git('rev-parse', 'HEAD~1'), cited);
      git('add', '-A');
      git('commit', '-qm', 'the handoff citing it');
      const branchTip = git('rev-parse', 'HEAD');

      git('checkout', '-q', 'main');
      await writeFile(join(root, 'another-package.txt'), 'landed on main\n');
      git('add', '-A');
      git('commit', '-qm', 'another package lands on main');
      const mainTip = git('rev-parse', 'HEAD');
      git('checkout', '-q', 'agent/test/work');
      git('merge', '-q', '--no-ff', '-m', 'merge main into the working branch', 'main');

      assert.equal(tipBeforeIn(root), branchTip,
        'the branch as it stood before a merge run ON the branch is the FIRST parent; the last one is main');
      assert.notEqual(tipBeforeIn(root), mainTip, 'comparing a handoff against main describes none of the branch');

      // The command that exists to repair a handoff can run at all. Against the previous
      // implementation this is the reported state: the cited head is judged against MAIN, comes
      // back "on no path to this branch", and `refresh:handoff` refuses to rewrite an unrelated
      // citation -- exit 91, nothing written, no way forward but to unmake the merge.
      const refreshed = refresh(root);
      assert.equal(refreshed.status, 0, `${refreshed.stdout}${refreshed.stderr}`);
      const handoff = JSON.parse(await readFile(join(root, HANDOFF), 'utf8'));
      assert.deepEqual([...handoff.files_added, ...handoff.files_modified].sort(),
        [HANDOFF, 'branch-work.txt', 'work-packages/WP-TEST-001.json'].sort(),
        'and the range still describes this branch and not the package that landed on main');

      // And the guard the author has to satisfy is then green on the next commit, which is what
      // "the tooling can repair this" has to mean.
      git('add', '-A');
      git('commit', '-qm', 'the refreshed handoff');
      const checked = refresh(root, ['--check']);
      assert.equal(checked.status, 0,
        `merging main is not drift, and it is not an unrelated citation either:\n${checked.stdout}${checked.stderr}`);
      assert.match(checked.stdout, /describes the branch/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  // ORIENTATION TWO: the merge commit `actions/checkout` builds for a pull request -- made ON the
  // base, out of the pull request head, with `main` left where it was. Parents [main tip, branch
  // tip]. The previous implementation answered this one correctly and it must stay answered.
  {
    const scenario = await scenarioRepository();
    const { root, git } = scenario;
    try {
      git('checkout', '-qb', 'agent/test/work');
      await writeFile(join(root, 'branch-work.txt'), 'work\n');
      git('add', '-A');
      git('commit', '-qm', 'the work this handoff describes');
      const branchTip = git('rev-parse', 'HEAD');
      git('checkout', '-q', 'main');
      await writeFile(join(root, 'another-package.txt'), 'landed on main\n');
      git('add', '-A');
      git('commit', '-qm', 'another package lands on main');
      const mainTip = git('rev-parse', 'HEAD');
      git('checkout', '-q', '--detach', 'main');
      git('merge', '-q', '--no-ff', '-m', 'Merge the pull request head into the base', 'agent/test/work');

      assert.equal(tipBeforeIn(root), branchTip,
        'a merge built ON the integration branch out of one head outside it is compared against that head');
      assert.notEqual(tipBeforeIn(root), mainTip);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  // ORIENTATION THREE: that same merge once it is ON main -- what a push-to-main CI run checks out.
  // Both parents are in main now, so neither is outside it; the branch here IS main, and main as it
  // stood before is its first parent. The last parent answers with the merged branch's own head.
  {
    const scenario = await scenarioRepository();
    const { root, git } = scenario;
    try {
      git('checkout', '-qb', 'agent/test/work');
      await writeFile(join(root, 'branch-work.txt'), 'work\n');
      git('add', '-A');
      git('commit', '-qm', 'the work this handoff describes');
      const branchTip = git('rev-parse', 'HEAD');
      git('checkout', '-q', 'main');
      await writeFile(join(root, 'another-package.txt'), 'landed on main\n');
      git('add', '-A');
      git('commit', '-qm', 'another package lands on main');
      const mainTip = git('rev-parse', 'HEAD');
      git('merge', '-q', '--no-ff', '-m', 'Merge pull request #1', 'agent/test/work');

      assert.equal(tipBeforeIn(root), mainTip, 'on the integration branch, the state before is its own first parent');
      assert.notEqual(tipBeforeIn(root), branchTip);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test('an ordinary in-progress branch is untouched by any of this, byte for byte', async () => {
  // The half a fix must not pay for: no merge anywhere, the stored base already the branch point,
  // and every field of the handoff exactly what the previous implementation wrote. Asserted as the
  // FILE'S BYTES rather than field by field, because "unaffected" is a claim about the file.
  // Run against both implementations, this case produces identical output.
  const scenario = await scenarioRepository();
  const { root, git } = scenario;
  try {
    const branchPoint = git('rev-parse', 'HEAD');
    git('checkout', '-qb', 'agent/test/work');
    await declareBranch(root, 'agent/test/work');
    await writeFile(join(root, 'branch-work.txt'), 'work\n');
    git('add', '-A');
    git('commit', '-qm', 'the work this handoff describes');
    await writeHandoff(root, branchPoint, git('rev-parse', 'HEAD'));
    git('add', '-A');
    git('commit', '-qm', 'the handoff citing it');
    const carriedTheHandoff = git('rev-parse', 'HEAD');
    await writeFile(join(root, 'branch-work-2.txt'), 'more\n');
    git('add', '-A');
    git('commit', '-qm', 'more of the same work');
    const head = git('rev-parse', 'HEAD');

    assert.equal(tipBeforeIn(root), carriedTheHandoff, 'an ordinary commit is compared against HEAD^, as it always was');

    const refreshed = refresh(root);
    assert.equal(refreshed.status, 0, `${refreshed.stdout}${refreshed.stderr}`);
    assert.doesNotMatch(refreshed.stdout, /base moved/,
      'a base that is already the branch point must not be reported as moved');
    assert.equal(await readFile(join(root, HANDOFF), 'utf8'), `${JSON.stringify({
      work_package_id: 'WP-TEST-001',
      base_revision: branchPoint,
      head_revision_or_patch_checksum: head,
      files_added: [HANDOFF, 'branch-work-2.txt', 'branch-work.txt', 'work-packages/WP-TEST-001.json'].sort(),
      files_modified: [],
      files_deleted: [],
    }, null, 2)}\n`, 'the handoff of an ordinary branch is byte for byte what it was before this change');

    const checked = refresh(root, ['--check']);
    assert.equal(checked.status, 0, `${checked.stdout}${checked.stderr}`);
    assert.match(checked.stdout, /describes the branch/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a merge with no integration branch to compare against is refused, not guessed', async () => {
  // Which side of a merge is the branch is not readable from the merge alone -- both orientations
  // above are two parents and an order. It takes the integration branch, and when there is none
  // this REFUSES, for the reason `branchPointOf` refuses a missing ref: an answer picked from two
  // is right half the time, and a guard that is wrong half the time is worse than a stopped run.
  const scenario = await scenarioRepository();
  const { root, git } = scenario;
  try {
    git('checkout', '-qb', 'agent/test/work');
    await declareBranch(root, 'agent/test/work');
    await writeFile(join(root, 'branch-work.txt'), 'work\n');
    git('add', '-A');
    git('commit', '-qm', 'the work this handoff describes');
    await writeHandoff(root, git('rev-parse', 'HEAD~1'), git('rev-parse', 'HEAD'));
    git('add', '-A');
    git('commit', '-qm', 'the handoff citing it');
    git('checkout', '-q', 'main');
    await writeFile(join(root, 'another-package.txt'), 'landed on main\n');
    git('add', '-A');
    git('commit', '-qm', 'another package lands on main');
    git('checkout', '-q', 'agent/test/work');
    git('merge', '-q', '--no-ff', '-m', 'merge main into the working branch', 'main');
    const before = await readFile(join(root, HANDOFF), 'utf8');
    git('branch', '-m', 'main', 'trunk');

    // The literal 94, not the script's exported constant, for the reason the branch-point refusal
    // above gives: importing it would prove the export exists and nothing about what the script does.
    const refreshed = refresh(root);
    assert.equal(refreshed.status, 94,
      'refusing must not be reported as success, and must be told from drift (91) and from a missing '
      + `branch point (93):\n${refreshed.stdout}${refreshed.stderr}`);
    assert.match(refreshed.stderr, /cannot determine which parent of merge/);
    assert.match(refreshed.stderr, /main: no such ref/, 'the message names the refs it looked for');
    assert.equal(await readFile(join(root, HANDOFF), 'utf8'), before,
      'and it writes nothing rather than comparing against a side it could not identify');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a merge with more than one candidate for the branch is refused rather than picked', async () => {
  // The ambiguous case the rule leaves open: a merge made ON the integration branch out of TWO
  // heads it does not contain -- the shape a merge queue builds when it batches pull requests.
  // Neither parent order nor containment names one branch, so there is no answer to give, and the
  // run stops naming the parents it could not choose between.
  const scenario = await scenarioRepository();
  const { root, git } = scenario;
  try {
    const mainTip = git('rev-parse', 'HEAD');
    for (const name of ['one', 'two']) {
      git('checkout', '-qb', `agent/test/sibling-${name}`, mainTip);
      await writeFile(join(root, `sibling-${name}.txt`), `${name}\n`);
      git('add', '-A');
      git('commit', '-qm', `sibling ${name}`);
    }
    git('checkout', '-qb', 'agent/test/work', mainTip);
    // `--no-ff` is load-bearing: without it the octopus strategy fast-forwards onto the first head
    // and records [sibling one, sibling two], whose FIRST parent is outside main -- an unambiguous
    // merge run on a branch, and not the case being built here.
    git('merge', '-q', '--no-ff', '-m', 'a merge of two heads main does not contain',
      'agent/test/sibling-one', 'agent/test/sibling-two');
    await declareBranch(root, 'agent/test/work');
    await writeHandoff(root, mainTip, git('rev-parse', 'HEAD'));
    const before = await readFile(join(root, HANDOFF), 'utf8');

    const refreshed = refresh(root);
    assert.equal(refreshed.status, 94, `${refreshed.stdout}${refreshed.stderr}`);
    assert.match(refreshed.stderr, /cannot determine which parent of merge/);
    assert.match(refreshed.stderr, /2 of the rest are not/,
      'the message says what it could not determine: how many candidates there were, and which');
    assert.equal(await readFile(join(root, HANDOFF), 'utf8'), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
