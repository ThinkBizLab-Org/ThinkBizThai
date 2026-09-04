#!/usr/bin/env node
// I verified two commits with `npm run check 2>&1 | grep -E "ℹ (pass|fail)"`, read `pass 225,
// fail 0`, and shipped both at exit 88 -- the runner refusing a test count it could not
// reconcile. No test had failed. A summary line is not an exit code.
//
// This runs the check as a child process and reports the STATUS, so the fact I kept getting wrong
// is one a command produces rather than one I read out of a stream. `npm run verify` is the thing
// to run before committing.
//
// Exit codes: 0 clean; otherwise the check's own code, unchanged, so a caller sees what failed.
import { spawnSync } from 'node:child_process';

// The guard runs FIRST and OUTSIDE the chain, for the reason RFC-2026-007 gives about CI.
// Independent review sixteen put `… && true\nexit 0 && npm run test:bootstrap` into
// `scripts.check`: the coverage-floor guard fired and printed its rejection, and `sh` then ran
// the `exit 0` on the next line, so `npm run check` exited 0 anyway. A guard that lives inside
// the string it audits cannot report on that string -- the chain gets the last word.
const guard = spawnSync(process.execPath, ['scripts/verify-test-coverage-floor.mjs'], { encoding: 'utf8' });
if (guard.status !== 0) {
  process.stderr.write(`NOT clean: the coverage-floor guard exited ${guard.status}, run independently of the check chain\n`);
  process.stderr.write(`  ${`${guard.stdout ?? ''}${guard.stderr ?? ''}`.trimEnd().split('\n').at(-1) ?? ''}\n`);
  process.exit(guard.status ?? 1);
}

// The decision this script makes is pure: given the child's STATUS and its OUTPUT, is the tree
// clean, and what should be said about it. It was mixed into the running, so the only way to pin
// it was `assert.match` against this file's own source -- and the independent reviewer of
// WP-0A-CON-008 gutted it with both pinned substrings left present but unreachable, producing
// `clean: exit 0 — tests 260, pass 260, fail 0` over a check reporting eight failures and a
// reversed contract rule. The forged line also satisfied commit-when-clean's clean-line regex, so
// one edit defeated the verifier and the commit gate together.
//
// It cannot be pinned by running it: this script runs the WHOLE check, and the check contains the
// suite that would do the pinning, so a behaviour test re-enters itself -- measured at 2.3 hours,
// then 74 seconds after two narrowings, still recursing. The decision is separated here so the
// suite can call it with synthetic inputs and no recursion at all.
export function decide(code, output) {
  const counts = {};
  for (const key of ['tests', 'pass', 'fail', 'skipped', 'todo']) {
    const match = output.match(new RegExp(`^ℹ ${key} (\\d+)$`, 'm'));
    if (match) counts[key] = Number(match[1]);
  }
  const stated = Object.entries(counts).map(([key, value]) => `${key} ${value}`).join(', ');

  // Exit 0 is not evidence that anything ran. Independent review seventeen wrote a single line into
  // `.npmrc` -- `script-shell=/usr/bin/true` -- and every `npm run` in the repository became a
  // no-op: `npm run check` exited 0 having executed nothing, and THIS reporter exited 0 printing
  // `clean`, because it trusted a status without asking whether a suite had run.
  //
  // The chain string was byte-identical, every digest intact, no failing test. npm decides which
  // shell runs the chain, and that decision lived in a file no guard read.
  if (code === 0 && (counts.pass === undefined || counts.pass === 0)) {
    return {
      exit: 90,
      stderr: ['NOT clean: the check exited 0 without reporting a single passing test. '
        + 'Something ran nothing — check .npmrc, the shell npm was given, and whether the chain executed at all.'],
      stdout: [],
    };
  }

  if (code === 0) {
    return { exit: 0, stdout: [`clean: exit 0${stated ? ` — ${stated}` : ''}`], stderr: [] };
  }

  // The line that matters is the one the check printed last before giving up; a failing count and a
  // failing test look nothing alike, and quoting the wrong one is how this went unnoticed twice.
  const lastLine = output.trimEnd().split('\n').at(-1) ?? '';
  const stderr = [`NOT clean: exit ${code}${stated ? ` — ${stated}` : ''}`, `  ${lastLine}`];
  if (counts.fail === 0) {
    stderr.push('  Note: every test passed and the run still failed. The failure is not a failing test.');
  }
  return { exit: code, stdout: [], stderr };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = spawnSync('npm', ['run', 'check'], { encoding: 'utf8' });
  const decision = decide(result.status, `${result.stdout ?? ''}${result.stderr ?? ''}`);
  for (const line of decision.stdout) process.stdout.write(`${line}\n`);
  for (const line of decision.stderr) process.stderr.write(`${line}\n`);
  process.exit(decision.exit);
}
