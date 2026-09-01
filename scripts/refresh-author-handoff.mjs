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
// Usage: refresh-author-handoff.mjs [--check]
//   default   rewrite the handoff for the package that owns the current branch
//   --check   report drift and exit 91 without writing anything
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

import { claimantsOf, reportFor } from './verify-branch-identity.mjs';

export const DRIFTED = 91;

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
  const base = handoff.base_revision;
  const head = git('rev-parse', 'HEAD');
  const comparedAgainst = branchTipBefore();

  const drift = driftBetween(handoff.head_revision_or_patch_checksum, comparedAgainst);
  if (drift.state === 'unrelated') {
    process.stderr.write(`${path} cites ${handoff.head_revision_or_patch_checksum.slice(0, 7)}, `
      + 'which is on no path to this branch.\n');
    return DRIFTED;
  }
  const trailing = { substantive: drift.paths };
  if (trailing.substantive.length === 0) {
    process.stdout.write(`${path} describes the branch: nothing substantive after its cited head\n`);
    return 0;
  }
  if (checkOnly) {
    process.stderr.write(`${path} cites a head ${handoff.head_revision_or_patch_checksum.slice(0, 7)} `
      + `with ${trailing.substantive.length} substantive change(s) after it:\n  `
      + `${trailing.substantive.slice(0, 8).join('\n  ')}\n`
      + 'The cited range is true and does not describe the branch. Run `npm run refresh:handoff`.\n');
    return DRIFTED;
  }

  const range = changedIn(base, head);
  handoff.head_revision_or_patch_checksum = head;
  handoff.files_added = range.added;
  handoff.files_modified = range.modified;
  if (Array.isArray(handoff.files_deleted) || range.deleted.length > 0) handoff.files_deleted = range.deleted;
  await writeFile(path, `${JSON.stringify(handoff, null, 2)}\n`);
  process.stdout.write(`${path} now cites ${base.slice(0, 7)}..${head.slice(0, 7)} — `
    + `${range.added.length} added, ${range.modified.length} modified, ${range.deleted.length} deleted\n`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(await main(process.argv.slice(2)));
