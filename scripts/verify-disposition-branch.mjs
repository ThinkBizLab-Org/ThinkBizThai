#!/usr/bin/env node
// A branch is judged against the work package that names it. That model has a hole, and CI found
// it the first time a Product Owner disposition was pushed: **disposing an RFC is not a work
// package's act.** The branch carrying it belongs to no package, `verify-branch-identity.mjs`
// correctly exits 75, and there is no honest manifest to add it to — declaring it under some
// package would be a lie told to satisfy a guard.
//
// So a disposition branch is recognised as its own kind, and constrained so tightly that the
// recognition cannot be borrowed: every changed path must be a decision record, and every changed
// LINE must be its `Status:` line. A branch that touches anything else is not a disposition, and
// falls back to the package rules.
//
// Exit codes: 0 this is a disposition branch; 78 it is not; 2 usage.
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const NOT_A_DISPOSITION = 78;

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });

export function dispositionProblems(base, head = 'HEAD') {
  const changed = git('diff', '--no-renames', '--name-only', `${base}..${head}`)
    .split('\n').filter(Boolean);
  if (changed.length === 0) return ['the branch changes nothing'];

  const problems = [];
  const decisions = /^architecture\/decisions\/[^/]+\.md$/;
  // The generated files every commit touches; they carry no decision and are rebuilt from the
  // tree, so they neither make a branch a disposition nor disqualify one.
  const generated = new Set(['test-kits/integrity-manifest.json', 'evidence/VERIFICATION.md']);

  const records = changed.filter((path) => decisions.test(path));
  const others = changed.filter((path) => !decisions.test(path) && !generated.has(path));
  if (records.length === 0) problems.push('no decision record changed');
  for (const path of others) problems.push(`${path} is not a decision record`);

  for (const path of records) {
    const diff = git('diff', '--no-renames', '-U0', `${base}..${head}`, '--', path);
    // `/^[+-][^+-]/` was meant to skip the `+++ b/path` and `--- a/path` headers, and it did.
    // It also skipped every CONTENT line whose first character is `-` or `+` -- which is every
    // markdown bullet. So a branch belonging to no package could add bullets to an Approved
    // decision record, or write a whole new one in bullets, and this check would examine none of
    // them and call it a disposition. Demonstrated end to end by the independent reviewer of
    // WP-0A-A0-004: three "superseding rules" injected into RFC-2026-007 itself, the digest
    // regenerated with a declared script, and every step of `npm run check` at exit 0.
    //
    // The headers are recognised by what they ARE -- `+++ ` and `--- ` at the start of a line
    // with `-U0` -- rather than by a shape that a content line can accidentally match.
    const DIFF_HEADER = /^(\+\+\+ |--- |@@ |diff |index |new file|deleted file|similarity|rename )/;
    const touched = diff.split('\n')
      .filter((line) => (line.startsWith('+') || line.startsWith('-')) && !DIFF_HEADER.test(line))
      .map((line) => line.slice(1));
    for (const line of touched) {
      if (!/^\s*(\*\*)?Status(\*\*)?\s*:/.test(line)) {
        problems.push(`${path} changes a line that is not its status: ${JSON.stringify(line.trim().slice(0, 70))}`);
      }
    }
    if (touched.length === 0) problems.push(`${path} changed with no status line touched`);
  }
  return problems;
}

async function main(argv) {
  const base = argv[2];
  if (!base) {
    process.stderr.write('usage: verify-disposition-branch.mjs <base-ref>\n');
    return 2;
  }
  const problems = dispositionProblems(base);
  if (problems.length > 0) {
    process.stderr.write('this branch is not a Product Owner disposition:\n');
    for (const problem of problems) process.stderr.write(`  ${problem}\n`);
    process.stderr.write('A disposition changes decision records\' status lines and nothing else. '
      + 'Any other branch is judged against the work package that names it.\n');
    return NOT_A_DISPOSITION;
  }
  process.stdout.write('disposition branch: only decision-record status lines changed\n');
  return 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exit(await main(process.argv));
}
