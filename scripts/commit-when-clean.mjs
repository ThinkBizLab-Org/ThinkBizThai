#!/usr/bin/env node
// I have committed a red tree three times, each time by running `npm run verify` AFTER the commit
// instead of before it. The rule "read the exit code before you commit" is in the briefing and I
// wrote it myself after the second time; a rule I have broken three times is not a rule, it is a
// hope.
//
// So the order is enforced rather than remembered: this runs the verifier, and only if it reports
// clean does it stage and commit. A red tree cannot become a commit through this path.
//
// Usage: node scripts/commit-when-clean.mjs <message-file>
// Exit codes: the verifier's own code when it is not clean; git's when the commit fails; 0 clean.
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const run = (command, args) => spawnSync(command, args, { encoding: 'utf8', stdio: 'pipe' });

async function main(argv) {
  const messageFile = argv[2];
  if (!messageFile) {
    process.stderr.write('usage: commit-when-clean.mjs <message-file>\n');
    return 2;
  }

  const verify = run('npm', ['run', 'verify']);
  const output = `${verify.stdout ?? ''}${verify.stderr ?? ''}`;
  if (verify.status !== 0) {
    process.stderr.write('refusing to commit: the tree is not clean\n');
    process.stderr.write(`${output.trimEnd().split('\n').slice(-3).join('\n')}\n`);
    return verify.status ?? 1;
  }
  // The verifier prints `clean: exit 0 — tests N, pass N, …`. Requiring that line as well as the
  // status closes the case where something silences npm and every command exits 0 saying nothing.
  if (!/^clean: exit 0 — tests \d+, pass \d+/m.test(output)) {
    process.stderr.write('refusing to commit: the verifier exited 0 without reporting a clean run\n');
    return 90;
  }

  const staged = run('git', ['add', '-A']);
  if (staged.status !== 0) {
    process.stderr.write(`${staged.stderr}`);
    return staged.status ?? 1;
  }
  const commit = run('git', ['commit', '-F', messageFile]);
  process.stdout.write(`${commit.stdout ?? ''}${commit.stderr ?? ''}`);
  if (commit.status !== 0) return commit.status ?? 1;
  process.stdout.write(`${output.match(/^clean: .*$/m)?.[0] ?? ''}\n`);
  return 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exit(await main(process.argv));
}
