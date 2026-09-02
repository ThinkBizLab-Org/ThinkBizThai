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
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const run = (command, args) => spawnSync(command, args, { encoding: 'utf8', stdio: 'pipe' });

// A path in `git status` may have been deleted; reading it must not throw.
function safeRead(path) {
  try { return readFileSync(path); } catch { return Buffer.from('<absent>'); }
}

async function main(argv) {
  const messageFile = argv[2];
  if (!messageFile) {
    process.stderr.write('usage: commit-when-clean.mjs <message-file>\n');
    return 2;
  }

  // The tree as it stands, before and after the verifier runs. `npm run verify` takes tens of
  // seconds, and `git add -A` stages whatever is on disk WHEN IT RUNS -- so a file written in
  // between would be committed unverified. Probing this myself, the edit landed early enough to
  // be caught by the verifier itself; the window that matters is the one after it returns, and
  // luck is not a control.
  // CONTENT, not `git status` output. My first version hashed the porcelain lines directly and
  // refused every commit -- `git add` rewrites the two status columns (` M path` becomes `M  path`),
  // so the second sample always differed. It looked like the guard working; it was the guard
  // firing on itself, which is the seventh wrong reason recorded in this package and the first
  // that would have blocked all work rather than allowing it.
  //
  // The paths, and a digest of each one's bytes: staging changes neither.
  //
  // `-uall` is load-bearing, and its absence was the EIGHTH wrong reason. Plain `--porcelain`
  // collapses an untracked directory into a single entry -- `?? evidence/WP-0A-A6-001/` -- which
  // is not a readable file, and which `git add -A` then expands into one entry per file. The path
  // set therefore differed across staging for reasons that had nothing to do with anything
  // changing, and the guard refused the FIRST COMMIT OF EVERY PACKAGE that creates its own
  // evidence directory. Two runs hit it independently within an hour: an A6 author run in its own
  // worktree, which worked around it rather than touching a guard outside its writable paths, and
  // A0 on this branch. `-uall` lists untracked files individually, so the set is the same on both
  // samples and the check measures what it claims to measure.
  const treeState = () => {
    const status = run('git', ['status', '--porcelain', '-uall']);
    const paths = (status.stdout ?? '').split('\n')
      .map((line) => line.slice(3).trim())
      .filter(Boolean)
      .sort();
    const digest = createHash('sha256');
    for (const path of paths) {
      digest.update(path);
      digest.update(safeRead(path));
    }
    return digest.digest('hex');
  };
  const before = treeState();

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

  if (treeState() !== before) {
    process.stderr.write('refusing to commit: the working tree changed while the verifier was running. '
      + 'What was verified is not what would be committed.\n');
    return 92;
  }

  const staged = run('git', ['add', '-A']);
  // And once more AFTER staging, because the window between the sample above and `git add` is not
  // zero. Measured: a write landing in that window was committed unverified, so the two-sample
  // check narrows the gap from the verifier's ~35 seconds to the milliseconds it takes to stage --
  // it does not eliminate it. Sampling after `git add` closes the staging window too; what
  // remains is the instant between staging and the commit itself, and the honest statement is
  // that a tree being written to while it is committed cannot be fully guarded from inside.
  if (staged.status === 0 && treeState() !== before) {
    run('git', ['reset']);
    process.stderr.write('refusing to commit: the working tree changed while staging. '
      + 'What was verified is not what would be committed.\n');
    return 92;
  }
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
