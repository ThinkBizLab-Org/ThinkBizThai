#!/usr/bin/env node
// I have committed a red tree three times, each time by running `npm run verify` AFTER the commit
// instead of before it. The rule "read the exit code before you commit" is in the briefing and I
// wrote it myself after the second time; a rule I have broken three times is not a rule, it is a
// hope.
//
// So the order is enforced rather than remembered: this stages the tree, runs the verifier, and
// only if it reports clean, over a tree that did not move, does it commit. A red tree cannot become
// a commit through this path.
//
// Usage: node scripts/commit-when-clean.mjs <message-file>
// Exit codes: the verifier's own code when it is not clean; git's when the commit fails; 0 clean;
// 2 usage; 90 a silent verifier; 92 the tree moved; 95 the index holds unresolved conflicts or cannot
// be recorded (refused before anything is staged).
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

  // STAGED BEFORE THE VERIFIER RUNS, not after it (Q0-265-4, R0-265-4). Staging after the suite
  // meant a file this commit ADDS was untracked while the suite ran, and every guard that reads the
  // index (`git ls-files`: the tracked-file rules, the platform-kernel surface tests) verified a
  // tree without it: what was verified was not what was committed. Staging changes no path and no
  // byte, so the sample above and the one below compare what they always compared; a write landing
  // between the first sample and `git add` changes the tree, so the second sample refuses it. And
  // `git commit` takes the index, so a write landing after the second sample is left out of the
  // commit rather than committed unverified -- the window the old third sample only narrowed.
  //
  // Every refusal of the gate's own (a failed `git add`, a verifier that is not clean, 90, 92) puts
  // the index back as it was found, as the old order never touched it before the verifier passed. A
  // failing `git commit` itself leaves the index staged, as it did on main.
  //
  // AN INDEX WITH UNRESOLVED CONFLICTS IS REFUSED BEFORE ANYTHING IS STAGED (A1-278-1). `git add -A`
  // marks every conflicted path resolved, `<<<<<<<` markers included, and `git write-tree` cannot
  // record such an index, so there would be nothing to restore to: a refusal would leave the
  // conflicts silently resolved and a later plain `git commit` would commit the markers, which git
  // itself refuses while the paths are unmerged. So the gate stops first, with the index untouched.
  // 95 is a code of its own: no other refusal here means "resolve the conflicts first", and none of
  // the verifier's own codes is 95, so a caller reading only the code cannot mistake it.
  const unmerged = run('git', ['ls-files', '-u']);
  const index = run('git', ['write-tree']);
  if (unmerged.status !== 0 || (unmerged.stdout ?? '').trim() !== '' || index.status !== 0) {
    process.stderr.write('refusing to commit: the index holds unresolved conflicts or cannot be recorded; '
      + 'resolve them and stage the result, then run this again. Nothing was staged.\n');
    return 95;
  }
  const restore = () => { run('git', ['read-tree', index.stdout.trim()]); };
  const staged = run('git', ['add', '-A']);
  if (staged.status !== 0) {
    process.stderr.write(`${staged.stderr}`);
    restore();
    return staged.status ?? 1;
  }

  const verify = run('npm', ['run', 'verify']);
  const output = `${verify.stdout ?? ''}${verify.stderr ?? ''}`;
  if (verify.status !== 0) {
    restore();
    process.stderr.write('refusing to commit: the tree is not clean\n');
    process.stderr.write(`${output.trimEnd().split('\n').slice(-3).join('\n')}\n`);
    return verify.status ?? 1;
  }
  // The verifier prints `clean: exit 0 — tests N, pass N, …`. Requiring that line as well as the
  // status closes the case where something silences npm and every command exits 0 saying nothing.
  if (!/^clean: exit 0 — tests \d+, pass \d+/m.test(output)) {
    restore();
    process.stderr.write('refusing to commit: the verifier exited 0 without reporting a clean run\n');
    return 90;
  }

  // The index was staged from the tree before the verifier ran; the tree must still be what it was,
  // or the index may not be what the verifier read.
  if (treeState() !== before) {
    restore();
    process.stderr.write('refusing to commit: the working tree changed while the verifier was running. '
      + 'What was verified is not what would be committed.\n');
    return 92;
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
