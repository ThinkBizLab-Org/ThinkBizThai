import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TEST_PATTERN } from './test-suite-contract.mjs';
import { realpathSync } from 'node:fs';

// Four times in this repository an evidence file has quoted a test count that was true two
// edits earlier. Every time the mechanism was identical: run the check, write the prose, make
// two more edits, ship the old number. The fix is not to be more careful. It is to stop typing
// the number.
//
// This runs the suite and writes the counts to one canonical file. Evidence prose points at
// that file instead of quoting a figure, and a test asserts the file matches a live run -- so
// a stale number fails the check rather than reaching a reviewer.
export const RECORD_PATH = 'evidence/VERIFICATION.md';

export function parseCounts(output) {
  const counts = {};
  for (const label of ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const matches = [...output.matchAll(new RegExp(`^(?:ℹ|#) ${label} (\\d+)$`, 'gm'))];
    // The LAST match: a test can print a summary-shaped line to stdout, and the runner emits
    // its real summary last. The same reasoning as run-test-suite.mjs, for the same reason.
    counts[label] = matches.length > 0 ? Number(matches.at(-1)[1]) : null;
  }
  return counts;
}

export function render(counts) {
  return `# Verification record

This file is **written by \`npm run record:verification\`** and asserted by
\`test-kits/verification-record.test.mjs\` against a live run. Do not edit it by hand;
an edited value fails the check.

It exists because four evidence files in this repository have quoted a test count that
was true two edits earlier — every time by the same mechanism: run the check, write
the prose, make two more edits, ship the old number. Evidence should point here rather
than restate a figure.

| count | value |
|---|---|
| tests | ${counts.tests} |
| pass | ${counts.pass} |
| fail | ${counts.fail} |
| skipped | ${counts.skipped} |
| todo | ${counts.todo} |

A per-package evidence file may still record the count that was true **when that
package was verified** — that is a historical fact and stays accurate. What must never
be stale is a claim about the tree as it stands, and that claim lives only here.
`;
}

async function main() {
  // TEST_PATTERN is a list of roots. Passing the array itself makes node stringify it into one
  // glob that matches nothing, and this script would then RECORD a clean run of zero tests —
  // a verification record stating the suite passed while nothing ran. Spread it.
  const child = spawn(process.execPath, ['--test', ...(Array.isArray(TEST_PATTERN) ? TEST_PATTERN : [TEST_PATTERN])], { stdio: ['inherit', 'pipe', 'inherit'] });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { output += chunk; });
  const code = await new Promise((done) => child.on('close', done));
  const counts = parseCounts(output);
  if (code !== 0 || counts.pass === null || counts.fail !== 0) {
    console.error(`refusing to record a verification for a run that did not pass cleanly: exit ${code}, ${JSON.stringify(counts)}`);
    process.exit(1);
  }
  await writeFile(RECORD_PATH, render(counts));
  console.log(`recorded ${counts.pass} passing, ${counts.skipped} skipped, ${counts.todo} todo`);
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  await main();
}
