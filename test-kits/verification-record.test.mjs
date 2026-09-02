import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parseCounts, render, RECORD_PATH } from '../scripts/record-verification.mjs';

// The record is only worth anything if it cannot drift from the run. This asserts the parser
// and the renderer, and -- the part that matters -- that the committed file states the counts
// this very suite is producing.
test('the parser reads the last summary, not the first', () => {
  // A test can print a summary-shaped line. The runner emits its real summary last, and this
  // repository has already been shown a forged early match once.
  const output = ['ℹ tests 9999', 'ℹ pass 9999', 'ℹ tests 12', 'ℹ pass 11', 'ℹ fail 1',
    'ℹ skipped 0', 'ℹ todo 0', 'ℹ cancelled 0', 'ℹ suites 0'].join('\n');
  const counts = parseCounts(output);
  assert.equal(counts.tests, 12);
  assert.equal(counts.pass, 11);
  assert.equal(counts.fail, 1);
});

test('a missing summary reads as null rather than zero', () => {
  const counts = parseCounts('nothing useful here');
  assert.equal(counts.pass, null);
  assert.equal(counts.fail, null);
});

test('the rendered record contains the counts it was given', () => {
  const body = render({ tests: 7, pass: 7, fail: 0, skipped: 0, todo: 0 });
  assert.match(body, /\| tests \| 7 \|/);
  assert.match(body, /\| pass \| 7 \|/);
  assert.match(body, /written by `npm run record:verification`/);
});

// The record cannot be compared to the run from INSIDE the run -- the run has not finished.
// That comparison lives in scripts/run-test-suite.mjs, which sees the runner's own summary
// after the fact and exits 89 on a mismatch. What this file can assert is everything else:
// that the record exists, states a clean run, and is internally consistent.
// The file is compared byte-for-byte against the writer's own output in
// scripts/run-test-suite.mjs, which is the only place that knows the real counts. What this
// file can assert is that the committed record is SHAPED like generated output and states a
// clean run -- three rounds of review each found a new markdown spelling that misled a reader
// while a parser passed, so nothing here parses the file as a table any more.
test('the committed verification record is the generated block and states a clean run', async () => {
  const recorded = await readFile(RECORD_PATH, 'utf8');
  const counts = Object.fromEntries([...recorded.matchAll(/^\| (tests|pass|fail|skipped|todo) \| (\d+) \|$/gm)]
    .map(([, label, value]) => [label, Number(value)]));
  assert.equal(recorded, render(counts),
    `${RECORD_PATH} is not what render() produces for the counts it states; it has been edited by hand`);
  assert.equal(counts.fail, 0, `${RECORD_PATH} records a failing run`);
  assert.equal(counts.skipped, 0, `${RECORD_PATH} records skipped tests`);
  assert.equal(counts.todo, 0, `${RECORD_PATH} records todo tests`);
  assert.equal(counts.tests, counts.pass, `${RECORD_PATH} records ${counts.tests} tests and ${counts.pass} passing`);
  assert.ok(counts.pass > 0, `${RECORD_PATH} records no passing tests`);
});
