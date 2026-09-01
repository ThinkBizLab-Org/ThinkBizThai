#!/usr/bin/env node
// Which work package is a branch judged against? Until now: whatever its NAME parsed to.
//
// Independent review eleven found both halves of that broken. A branch called
// `agent/claude/tidy-up` parses to nothing, and the CI step said "nothing to scope" and exited
// **0** -- so the branch-scope guard is opt-out by rename. And a branch called
// `agent/claude/WP-0A-A0-001-anything` is judged against WP-0A-A0-001's writable paths, which
// are the broadest in the repository -- so a rename also SELECTS the judge.
//
// A ref name is not evidence. The claim has to be made inside the repository, where it appears
// in a diff: each work package declares `ownership.branch`, and a branch is judged against the
// package that names it. That makes the link two-way -- the branch cannot pick its manifest,
// and a manifest cannot be pointed at a branch without a reviewed edit.
//
// Exit codes: 0 match (package id on stdout), 75 no package claims this branch, 76 more than
// one does, 77 a manifest could not be read.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const NO_CLAIMANT = 75;
export const AMBIGUOUS_CLAIM = 76;
export const UNREADABLE = 77;

export async function claimantsOf(headRef, directory = 'work-packages') {
  const claimants = [];
  const unreadable = [];
  for (const entry of await readdir(directory)) {
    if (!entry.endsWith('.json')) continue;
    let manifest;
    try { manifest = JSON.parse(await readFile(join(directory, entry), 'utf8')); }
    catch (error) { unreadable.push(`${entry}: ${error.message}`); continue; }
    if (manifest?.ownership?.branch === headRef) {
      claimants.push(manifest.work_package_id ?? entry.replace(/\.json$/, ''));
    }
  }
  return { claimants: claimants.sort(), unreadable };
}

export function reportFor(headRef, { claimants, unreadable }) {
  if (unreadable.length > 0) {
    return { code: UNREADABLE, message: `work package manifest(s) could not be read:\n  ${unreadable.join('\n  ')}` };
  }
  if (claimants.length === 0) {
    return {
      code: NO_CLAIMANT,
      message: `no work package declares ownership.branch "${headRef}".\n`
        + 'A branch is judged against the package that names it, not against whatever its own name parses to. '
        + 'Declare this branch in the manifest of the package doing the work, in the same pull request.',
    };
  }
  if (claimants.length > 1) {
    return {
      code: AMBIGUOUS_CLAIM,
      message: `${claimants.length} work packages declare ownership.branch "${headRef}": ${claimants.join(', ')}.\n`
        + 'Exactly one package owns a branch; two claimants means the scope guard has no single set of writable paths to judge against.',
    };
  }
  return { code: 0, message: claimants[0] };
}

async function main(argv) {
  const headRef = argv[2];
  if (!headRef) {
    process.stderr.write('usage: verify-branch-identity.mjs <head-ref>\n');
    return 2;
  }
  const report = reportFor(headRef, await claimantsOf(headRef));
  if (report.code === 0) process.stdout.write(`${report.message}\n`);
  else process.stderr.write(`${report.message}\n`);
  return report.code;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(await main(process.argv));
