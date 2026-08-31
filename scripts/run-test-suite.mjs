import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MIN_EXECUTED_TESTS, TEST_PATTERN } from './test-suite-contract.mjs';

// `node --test` exits 0 while reporting `tests 0` whenever its pattern matches nothing,
// so a passing exit code alone cannot distinguish "everything passed" from "nothing ran".
// This runner asserts the count the runner itself reported, after the run.
// A test can print `ℹ tests 9999` to stdout, and that line lands in the same stream this
// floor audits. Independent integration verification demonstrated it. The runner emits its
// real summary last, so take the LAST match, never the first.
export function parseExecutedTests(output) {
  const matches = [...output.matchAll(/^(?:ℹ|#) tests (\d+)$/gm)];
  return matches.length > 0 ? Number(matches.at(-1)[1]) : null;
}

export function assertExecuted(executed, floor = MIN_EXECUTED_TESTS) {
  if (executed === null) {
    throw new Error('could not read an executed-test count from the test runner output; refusing to report success');
  }
  if (executed < floor) {
    throw new Error(`test runner executed ${executed} tests, below the required floor of ${floor}. A green run that executed nothing or less than the suite is the defect this floor exists to prevent.`);
  }
}

async function main() {
  const child = spawn(process.execPath, ['--test', TEST_PATTERN], { stdio: ['inherit', 'pipe', 'inherit'] });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
    process.stdout.write(chunk);
  });
  const code = await new Promise((resolveExit) => child.on('close', resolveExit));
  if (code !== 0) process.exit(code ?? 1);
  try {
    assertExecuted(parseExecutedTests(output));
  } catch (error) {
    console.error(error.message);
    process.exit(80);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
