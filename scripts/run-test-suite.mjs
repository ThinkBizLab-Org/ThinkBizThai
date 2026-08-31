import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MIN_EXECUTED_TESTS, TEST_PATTERN } from './test-suite-contract.mjs';
import { countDeclaredTests, discoverTestFiles } from './verify-test-coverage-floor.mjs';
import { readFile } from 'node:fs/promises';

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
  } catch (error) {
    console.error(error.message);
    process.exit(error.code ?? 80);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
