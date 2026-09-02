import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MIN_EXECUTED_TESTS, TEST_PATTERN } from './test-suite-contract.mjs';
import {
  assertEveryTestFileProtected,
  assertIntegrityManifest,
  assertNoEscapingPath,
  countDeclaredTests,
  discoverTestFiles,
} from './verify-test-coverage-floor.mjs';
import { readFile } from 'node:fs/promises';
import { RECORD_PATH, render } from './record-verification.mjs';
import { realpathSync } from 'node:fs';

// Four evidence files in this repository have quoted a test count that was true two edits
// earlier. The number now lives in one machine-written record, and this is the only place that
// knows the real figure -- after the run, from the runner's own summary. A stale record fails
// the check instead of reaching a reviewer.
export async function assertVerificationRecord(summary) {
  let recorded;
  try {
    recorded = await readFile(RECORD_PATH, 'utf8');
  } catch {
    const error = new Error(`${RECORD_PATH} is missing. Run \`npm run record:verification\` and commit it.`);
    error.code = 89;
    throw error;
  }
  // Byte-for-byte against what the writer would produce. Three rounds of independent review
  // each found another spelling that renders as a headline to a human and slipped past a
  // parser: `|tests|717|` without spaces, a second table appended below the prose, a
  // three-column table, a pipe-less GFM table, raw HTML, and plain bold prose. Enumerating
  // table syntaxes is a losing game -- markdown has more of them than a regex will ever hold.
  //
  // So the file is not parsed at all. It either IS the generated record or it is not one.
  const expected = render({
    tests: summary.tests, pass: summary.pass, fail: summary.fail,
    skipped: summary.skipped, todo: summary.todo,
  });
  if (recorded !== expected) {
    const detail = recorded.length === expected.length
      ? 'same length, different content'
      : `${recorded.length} bytes recorded, ${expected.length} expected`;
    const error = new Error(`${RECORD_PATH} is not the record this run would write (${detail}). Run \`npm run record:verification\` and commit it. The file must contain the generated block and nothing else -- a heading, a summary line or a second table added above it is exactly what this check exists to reject.`);
    error.code = 89;
    throw error;
  }
}

// `node --test` exits 0 while reporting `tests 0` whenever its pattern matches nothing,
// so a passing exit code alone cannot distinguish "everything passed" from "nothing ran".
// This runner asserts the count the runner itself reported, after the run.
// A test can print `ℹ tests 9999` to stdout, and that line lands in the same stream this
// floor audits. Independent integration verification demonstrated it. The runner emits its
// real summary last, so take the LAST match, never the first.
function lastCount(output, label) {
  const matches = [...output.matchAll(new RegExp(`^(?:ℹ|#) ${label} (\\d+)$`, 'gm'))];
  return matches.length > 0 ? Number(matches.at(-1)[1]) : null;
}

// `ℹ tests N` is pass + fail + skipped + todo. Independent review, security review and
// independent testing each separately replaced the whole suite with `{ skip: true }`
// placeholders whose bodies throw, and every floor reported PASSED on `tests N` while
// `pass` was 0. The floor is asserted on `pass`, and a skipped or todo test fails the run.
export function parseExecutedTests(output) {
  return lastCount(output, 'pass');
}

export function parseSummary(output) {
  return {
    tests: lastCount(output, 'tests'),
    pass: lastCount(output, 'pass'),
    fail: lastCount(output, 'fail'),
    skipped: lastCount(output, 'skipped'),
    todo: lastCount(output, 'todo'),
  };
}

export function assertNothingSkipped({ skipped, todo }) {
  if (skipped === null || todo === null) {
    throw new Error('could not read skipped/todo counts from the test runner output; refusing to report success');
  }
  if (skipped > 0 || todo > 0) {
    throw new Error(`test runner reported ${skipped} skipped and ${todo} todo tests. A skipped test is counted by \`tests N\` while executing nothing, which is the defect class this repository's guards exist to prevent. Skips must be removed, not tolerated.`);
  }
}

export function assertExecuted(executed, floor = MIN_EXECUTED_TESTS) {
  if (executed === null) {
    throw new Error('could not read an executed-test count from the test runner output; refusing to report success');
  }
  if (executed < floor) {
    throw new Error(`test runner PASSED ${executed} tests, below the required floor of ${floor}. A green run that executed nothing or less than the suite is the defect this floor exists to prevent.`);
  }
}

// The guard runs BEFORE the suite and so compared its declaration count to a literal.
// Independent review used phantom declarations to satisfy it while the runner executed
// fewer -- and the literal also breaks on any legitimate added test. Only here are both
// numbers real, so compare them to each other instead of to a constant.
export async function assertDeclarationsMatchExecution(pass) {
  const files = await discoverTestFiles('test-kits');
  // Independent security review rewrote a test file 150 ms into the run -- after node had
  // read its module body, so only this post-run count changed -- then restored the digested
  // bytes afterwards. The run went green with six assertions never executed and the tree
  // ended byte-identical to its digests. The pre-run checks cannot see that; these can,
  // because at this moment the file is still gutted.
  await assertIntegrityManifest();
  await assertEveryTestFileProtected(files);
  await assertNoEscapingPath(files);
  let declared = 0;
  for (const file of files) declared += countDeclaredTests(await readFile(file, 'utf8'));
  if (declared !== pass) {
    const error = new Error(`the suite declares ${declared} tests but the runner executed ${pass}. A declaration the runner does not execute, or a test the counter cannot see, means the floors are measuring something other than what runs.`);
    error.code = 88;
    throw error;
  }
  return declared;
}

async function main() {
  const child = spawn(process.execPath, ['--test', TEST_PATTERN], { stdio: ['inherit', 'pipe', 'inherit'] });
  let output = '';
  // Decode before concatenating. Buffer concatenation lets a chunk boundary inside the
  // summary's 3-byte `ℹ` corrupt it, which hands the parser an earlier forged match --
  // demonstrated by independent security review.
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    output += chunk;
    process.stdout.write(chunk);
  });
  const code = await new Promise((resolveExit) => child.on('close', resolveExit));
  if (code !== 0) process.exit(code ?? 1);
  const summary = parseSummary(output);
  try {
    assertNothingSkipped(summary);
    assertExecuted(summary.pass);
    await assertDeclarationsMatchExecution(summary.pass);
    await assertVerificationRecord(summary);
  } catch (error) {
    console.error(error.message);
    process.exit(Number.isInteger(error.code) ? error.code : 80);
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  await main();
}
