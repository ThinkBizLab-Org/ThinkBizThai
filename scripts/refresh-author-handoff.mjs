#!/usr/bin/env node
// A handoff can cite a range that is entirely true and still describe none of the branch.
//
// `handoff-conformance.test.mjs` resolves every cited revision and diffs the cited range
// against `files_added` / `files_modified`, so a handoff cannot invent history. It cannot tell
// that the range STOPPED four commits ago. This branch's own handoff cited 653f699..ae5864d --
// accurate, and blind to every guard added after it.
//
// So the range is regenerated from history rather than typed, for the same reason the test
// count is: nobody should be maintaining by hand a fact the repository already knows.
//
// The rewrite is UNCONDITIONAL. The first version returned early when nothing substantive had
// drifted -- and so never advanced the citation, which meant the very next commit drifted again.
// Independent review twelve found the branch tip red because of exactly that: `refresh:handoff`
// reported "describes the branch" and wrote nothing, three commits in a row.
//
// Usage: refresh-author-handoff.mjs [--check]
//   default   rewrite the handoff for the package that owns the current branch
//   --check   report drift and exit 91 without writing anything
//   exit 93   the branch point could not be determined; see branchPointOf below
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

import { claimantsOf, reportFor } from './verify-branch-identity.mjs';

export const DRIFTED = 91;
export const NO_BRANCH_POINT = 93;

// Files that are WRITTEN AFTER the work they describe, so a handoff cannot be expected to list
// its own commit. Everything else changing after the cited head means the handoff is stale.
const WRITTEN_AFTERWARDS = [
  /^handoffs\//,
  /^evidence\//,
  /^OVERNIGHT-SUMMARY\.md$/,
  /^test-kits\/integrity-manifest\.json$/,
];

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

// A handoff cannot cite the commit that CONTAINS it -- that revision does not exist until the
// commit is made. So the range is compared against the branch as it stood BEFORE the current
// commit, which is the last parent of HEAD: `HEAD^` for an ordinary commit, and for the merge
// commit `actions/checkout` builds on a pull request, the branch head itself. Without this the
// check is red for exactly as long as it takes to write the follow-up commit, every time, and a
// guard that is normally red is a guard people learn to ignore.
// Between `refresh:handoff` and the commit that carries it, the cited head IS `HEAD`, which is
// AHEAD of the comparison point -- and `git diff a..b` on a reversed range reports the reverse
// diff, so the check used to fail with a list of paths that had not drifted at all. A guard must
// never report a wrong reason: that is how a real finding gets dismissed as noise.
export function driftBetween(cited, target) {
  if (cited === target) return { state: 'clean', paths: [] };
  try { execFileSync('git', ['merge-base', '--is-ancestor', cited, target], { stdio: 'ignore' }); }
  catch {
    // Not an ancestor. Either the handoff was just refreshed and its commit is still unwritten
    // (cited is HEAD), or it names a revision on no path to here, which is a different defect.
    const head = git('rev-parse', 'HEAD');
    if (cited === head) return { state: 'awaiting-commit', paths: [] };
    return { state: 'unrelated', paths: [] };
  }
  const since = changedIn(cited, target);
  return { state: 'drifted', paths: classify([...since.added, ...since.modified]).substantive };
}

export function branchTipBefore(head = 'HEAD') {
  const parents = git('rev-list', '--parents', '-1', head).split(' ');
  return parents.length > 1 ? parents[parents.length - 1] : head;
}

export function classify(paths) {
  const substantive = paths.filter((path) => !WRITTEN_AFTERWARDS.some((pattern) => pattern.test(path)));
  return { substantive, incidental: paths.filter((path) => !substantive.includes(path)) };
}

export function changedIn(base, head) {
  const output = git('diff', '--no-renames', '--name-status', `${base}..${head}`);
  const added = [];
  const modified = [];
  const deleted = [];
  for (const line of output.split('\n').filter(Boolean)) {
    const [status, path] = line.split('\t');
    if (status === 'A') added.push(path);
    else if (status === 'D') deleted.push(path);
    else modified.push(path);
  }
  return { added: added.sort(), modified: modified.sort(), deleted: deleted.sort() };
}

// THE HEAD WAS REGENERATED FROM HISTORY AND THE BASE WAS STILL TAKEN ON FAITH.
//
// `base_revision` came straight out of the record this script is rewriting, so the range only ever
// grew forwards. That is correct for exactly as long as a package has one branch. The moment a
// package comes back for a SECOND increment -- new branch, cut from a main that has since absorbed
// the first one and everybody else's -- the stored base is far behind the new branch point, and
// `base..HEAD` claims every file merged into main in between.
//
// Measured, not hypothesised. WP-0A-CON-002's second branch changed four lines of one manifest:
//
//     handoffs/WP-0A-CON-002-author-handoff.json now cites d207d7d..463cf97
//       -- 861 added, 37 modified, 0 deleted
//
// `handoff-conformance.test.mjs` was green over that. It diffs the cited range against
// `files_added`/`files_modified`, and this script had written BOTH from the same wrong range, so
// the two agreed. A check comparing two things derived from one mistake confirms the mistake. What
// did catch it was an unrelated assertion: the handoff claimed contract-catalog compatibility
// impact while changing no catalog file.
//
// The branch point is a fact in the history, so it is read from the history: `git merge-base HEAD
// <integration ref>`.
const isAncestor = (ancestor, descendant) => {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { stdio: 'ignore' });
    return true;
  } catch { return false; }
};

const resolveCommit = (revision) => {
  try { return execFileSync('git', ['rev-parse', '--verify', '--quiet', `${revision}^{commit}`], { encoding: 'utf8' }).trim(); }
  catch { return null; }
};

// WHICH REF STANDS FOR "the branch this work merges into".
//
// `main` first, because that is what this repository merges into and what a worktree or a clone
// has locally. `origin/main` second, because a local `main` can be behind the remote -- a branch
// cut from a freshly fetched `origin/main` has a branch point the stale local ref cannot see, and
// using the older of the two would reintroduce a smaller copy of the very over-claim above.
// `origin/HEAD` last, because it is the only one of the three that names a default branch called
// something else -- `master`, `trunk` -- without this script guessing at names.
export const INTEGRATION_REFS = ['main', 'origin/main', 'origin/HEAD'];

// A detached HEAD never reaches here: `reportFor` is asked first, and `git rev-parse --abbrev-ref
// HEAD` reads `HEAD`, which no package declares, so the run stops at NO_CLAIMANT with the
// branch-identity guard's own message. That is the right owner for that failure.
//
// When none of the refs resolves, this REFUSES. It does not fall back to the stored base, and it
// does not fall back to the root commit: both produce a range that looks plausible and describes
// work the branch did not do, which is the defect, not a degraded mode of it.
export function branchPointOf(head = 'HEAD', refs = INTEGRATION_REFS) {
  const found = [];
  const rejected = [];
  for (const ref of refs) {
    const commit = resolveCommit(ref);
    if (commit === null) { rejected.push(`${ref}: no such ref in this repository`); continue; }
    let base;
    try { base = execFileSync('git', ['merge-base', head, commit], { encoding: 'utf8' }).trim(); }
    catch { rejected.push(`${ref}: resolves to ${commit.slice(0, 7)}, which shares no history with ${head}`); continue; }
    found.push({ ref, base });
  }
  if (found.length === 0) {
    return {
      ok: false,
      message: `cannot determine where this branch left the integration branch. None of ${refs.join(', ')} could be used:\n`
        + `  ${rejected.join('\n  ')}\n`
        + 'A handoff\'s base_revision is that branch point. This script will not fall back to the base already in the '
        + 'handoff: a base left behind by an earlier merge is exactly what makes a branch claim files it never touched.\n'
        + 'Fetch the default branch (git fetch origin) or check out a clone that has it, then run this again.\n',
    };
  }
  // Two refs may put the branch point at two different commits -- a stale local `main` is the
  // ordinary reason. Take the LATER one: it is the closest shared commit, so it is the narrowest
  // honest range. When they are not on one line of history at all, say so rather than picking.
  let chosen = found[0];
  for (const candidate of found.slice(1)) {
    if (candidate.base === chosen.base) continue;
    if (isAncestor(chosen.base, candidate.base)) { chosen = candidate; continue; }
    if (isAncestor(candidate.base, chosen.base)) continue;
    return {
      ok: false,
      message: `cannot determine where this branch left the integration branch. ${chosen.ref} puts the branch point at `
        + `${chosen.base.slice(0, 7)} and ${candidate.ref} puts it at ${candidate.base.slice(0, 7)}, and neither is an `
        + 'ancestor of the other, so there is no single branch point to record.\n'
        + 'Reconcile those refs (git fetch origin, and fast-forward the local branch) before refreshing the handoff.\n',
    };
  }
  return { ok: true, ref: chosen.ref, base: chosen.base, considered: found, rejected };
}

// RECOMPUTE ONLY WHEN THE STORED BASE IS NOT ON THE BRANCH'S OWN SIDE OF THE BRANCH POINT, rather
// than unconditionally, and the reason is the same one that governs everything else here: a script
// should correct what it can prove is wrong and leave alone what it cannot.
//
// A stored base at or after the branch point is a base an author could legitimately have chosen --
// a second handoff on a long-lived branch describing only the increment since the first. Moving it
// backwards to the branch point would silently widen someone's deliberate range, with nothing in
// the diff to say why. A stored base BEFORE the branch point cannot be deliberate: everything
// between it and the branch point reached main through somebody else's reviewed merge.
//
// Three cases, and the ordinary one is the first:
//   stored === branch point                        -> untouched. An in-progress branch is unaffected.
//   stored is on the branch, after the branch point -> untouched.
//   stored is behind the branch point, or is not an
//   ancestor of HEAD at all (a SHA a squash merge
//   orphaned, or a revision from another branch)   -> replaced by the branch point.
//
// WHAT MOVING THE BASE FORWARD COSTS, stated rather than assumed away:
//
//  1. The commits between the old base and the new branch point leave this handoff's range. When
//     the earlier increment was merged normally they are still in main's history and in that
//     increment's own handoff. When it was SQUASHED -- PR #45 here -- the individual commits are
//     gone from history, and the earlier handoff is the only surviving record of what that
//     increment contained. That is why this only ever rewrites the handoff of the branch it is run
//     on, and never regenerates a handoff whose branch has been merged.
//  2. If part of THIS branch has already been merged into the integration branch while work
//     continues, the branch point moves onto the branch itself and the recomputed range describes
//     less than the branch did. Nothing here detects that: the drift check looks past the cited
//     head, not before the cited base. A reviewer seeing a range narrower than the pull request
//     should read it as this case and say so.
export function baseFor(stored, branchPoint, head = 'HEAD') {
  const resolved = typeof stored === 'string' ? resolveCommit(stored) : null;
  const onBranchSide = resolved !== null && isAncestor(resolved, head) && isAncestor(branchPoint, resolved);
  return onBranchSide ? { base: resolved, recomputed: false } : { base: branchPoint, recomputed: true };
}

async function main(argv) {
  const checkOnly = argv.includes('--check');
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  const resolved = reportFor(branch, await claimantsOf(branch));
  if (resolved.code !== 0) {
    process.stderr.write(`${resolved.message}\n`);
    return resolved.code;
  }
  const packageId = resolved.message;
  const path = `handoffs/${packageId}-author-handoff.json`;
  const handoff = JSON.parse(await readFile(path, 'utf8'));
  const stored = handoff.base_revision;
  const head = git('rev-parse', 'HEAD');
  const comparedAgainst = branchTipBefore();

  const branchPoint = branchPointOf(head);
  if (!branchPoint.ok) {
    process.stderr.write(branchPoint.message);
    return NO_BRANCH_POINT;
  }
  const { base, recomputed } = baseFor(stored, branchPoint.base, head);

  const drift = driftBetween(handoff.head_revision_or_patch_checksum, comparedAgainst);
  if (drift.state === 'unrelated') {
    process.stderr.write(`${path} cites ${handoff.head_revision_or_patch_checksum.slice(0, 7)}, `
      + 'which is on no path to this branch.\n');
    return DRIFTED;
  }
  const trailing = { substantive: drift.paths };
  if (checkOnly && trailing.substantive.length === 0 && !recomputed) {
    process.stdout.write(`${path} describes the branch: nothing substantive after its cited head\n`);
    return 0;
  }
  if (checkOnly) {
    // Reported separately from head drift, because they are different defects and a guard that
    // states the wrong reason is how a real finding gets dismissed as noise. Head drift means the
    // range stopped early; a stale base means the range STARTED before this branch existed.
    if (recomputed) {
      process.stderr.write(`${path} cites base ${String(stored).slice(0, 7)}, which is not on this branch's side of its `
        + `branch point ${branchPoint.base.slice(0, 7)} (${branchPoint.ref}). The range therefore claims work that `
        + `reached ${branchPoint.ref} through someone else's merge. Run \`npm run refresh:handoff\`.\n`);
    }
    if (trailing.substantive.length > 0) {
      process.stderr.write(`${path} cites a head ${handoff.head_revision_or_patch_checksum.slice(0, 7)} `
        + `with ${trailing.substantive.length} substantive change(s) after it:\n  `
        + `${trailing.substantive.slice(0, 8).join('\n  ')}\n`
        + 'The cited range is true and does not describe the branch. Run `npm run refresh:handoff`.\n');
    }
    return DRIFTED;
  }

  const range = changedIn(base, head);
  // Written only when it moved: an in-progress branch must see this field untouched, not
  // rewritten with the value it already had.
  if (recomputed) handoff.base_revision = base;
  handoff.head_revision_or_patch_checksum = head;
  handoff.files_added = range.added;
  handoff.files_modified = range.modified;
  if (Array.isArray(handoff.files_deleted) || range.deleted.length > 0) handoff.files_deleted = range.deleted;
  await writeFile(path, `${JSON.stringify(handoff, null, 2)}\n`);
  process.stdout.write(`${path} now cites ${base.slice(0, 7)}..${head.slice(0, 7)} — `
    + `${range.added.length} added, ${range.modified.length} modified, ${range.deleted.length} deleted\n`);
  if (recomputed) {
    process.stdout.write(`  base moved from ${String(stored).slice(0, 7)} to this branch's branch point against `
      + `${branchPoint.ref}. The commits in between reached ${branchPoint.ref} through another package's merge and `
      + 'are not this branch\'s work.\n');
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(await main(process.argv.slice(2)));
