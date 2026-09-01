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

const result = spawnSync('npm', ['run', 'check'], { encoding: 'utf8' });
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
const code = result.status;

const counts = {};
for (const key of ['tests', 'pass', 'fail', 'skipped', 'todo']) {
  const match = output.match(new RegExp(`^ℹ ${key} (\\d+)$`, 'm'));
  if (match) counts[key] = Number(match[1]);
}

const stated = Object.entries(counts).map(([key, value]) => `${key} ${value}`).join(', ');
if (code === 0) {
  process.stdout.write(`clean: exit 0${stated ? ` — ${stated}` : ''}\n`);
  process.exit(0);
}

// The line that matters is the one the check printed last before giving up; a failing count and a
// failing test look nothing alike, and quoting the wrong one is how this went unnoticed twice.
const lastLine = output.trimEnd().split('\n').at(-1) ?? '';
process.stderr.write(`NOT clean: exit ${code}${stated ? ` — ${stated}` : ''}\n`);
process.stderr.write(`  ${lastLine}\n`);
if (counts.fail === 0 && code !== 0) {
  process.stderr.write('  Note: every test passed and the run still failed. The failure is not a failing test.\n');
}
process.exit(code);
