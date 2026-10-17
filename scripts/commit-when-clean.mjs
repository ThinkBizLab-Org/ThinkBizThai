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
// be recorded (refused before anything is staged); 128 + the signal's number when SIGINT, SIGTERM,
// SIGHUP or SIGQUIT arrives after the gate starts staging and before the commit (the index put back
// first).
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { constants } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = (command, args) => spawnSync(command, args, { encoding: 'utf8', stdio: 'pipe' });

// The verifier runs asynchronously, in a process group of its own, so that a signal sent to the gate
// can be handled while it runs: `spawnSync` blocks the event loop, and a SIGTERM that arrives during it
// either kills the gate outright (no handler) or waits until the verifier has finished (a handler), and
// in neither case is the index put back before the gate is gone (A1-278-2). The group lets the gate stop
// the verifier and everything it started, so nothing of it is still touching the index when the index
// is put back.
//
// AND WITHOUT ANY `GIT_*` OF THE CALLER'S (Q0-292-2). A gate run from a hook carries the hook's
// GIT_INDEX_FILE (and a caller may set GIT_DIR, GIT_WORK_TREE, GIT_OBJECT_DIRECTORY, GIT_CONFIG_*),
// and the suite's own test files that start git in throwaway repositories would then act on the
// caller's repository (A1-292-2). The gate itself honours them -- it stages where its caller points
// it -- but the verifier runs in the working tree with a clean git environment, finding the
// repository from its directory as `npm run check` does in CI.
const VERIFIER_ENV = (() => {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  return env;
})();

function runVerifier(onSpawn) {
  return new Promise((done) => {
    const child = spawn('npm', ['run', 'verify'], { stdio: ['ignore', 'pipe', 'pipe'], detached: true, env: VERIFIER_ENV });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => done({ status: null, signal: null, stdout, stderr: `${stderr}${error.message}\n` }));
    child.on('close', (status, signal) => done({ status, signal, stdout, stderr }));
    onSpawn(child);
  });
}

// SIGQUIT too (A1-292-3): the verifier sits in a process group of its own, so a Ctrl-\\ the gate did not
// handle would kill the gate and leave the verifier running, orphaned, with the index staged.
const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT'];

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
  // `--no-optional-locks`: a plain `git status` refreshes the index and writes it back when it can
  // take the lock, so the gate's own sampling would change the index bytes it has to put back.
  const treeState = () => {
    const status = run('git', ['--no-optional-locks', 'status', '--porcelain', '-uall']);
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

  // THE INDEX FILE, COPIED BYTE FOR BYTE BEFORE THE GATE RUNS ANYTHING (A1-278r2-1). The first
  // version put the index back with `git read-tree <tree>`, which restores the tree and the staged
  // set but not what a tree cannot carry: intent-to-add entries, the assume-unchanged and
  // skip-worktree bits, sparse-checkout bits and the other per-entry flags were dropped, so a local
  // edit hidden with skip-worktree was visible again after a refusal and the next `git commit -a`
  // committed it. The file itself is what the caller had; the gate keeps its bytes and writes them
  // back -- through `index.lock` and a rename, as git writes it -- on every refusal of its own.
  // `--git-path index` honours GIT_INDEX_FILE and a linked worktree's own index. An index that does
  // not exist yet (a repository with nothing staged ever) is put back by removing what staging made.
  //
  // A SPLIT INDEX NAMES A SECOND FILE (A1-292-1). With `core.splitIndex` the index bytes refer to
  // `sharedindex.<sha>`, and when the gate's `git add -A` writes a new shared index git expires old
  // ones under `splitIndex.sharedIndexExpire`; with `now`, the file the found bytes name was deleted
  // and every git command then failed on the restored index. So the shared index file the found
  // index names (`git rev-parse --shared-index-path`) is kept too, and written back first if it is
  // gone. And whatever the configuration, the restore is CHECKED: `git ls-files -s` must read the
  // index put back. If it cannot, the gate does not leave an index no git command can read: it keeps
  // the found bytes beside the index, rebuilds the index from the tree it recorded before staging
  // (`git read-tree`, the old restore: the staged set kept, per-entry flags lost) and says so.
  const indexPath = run('git', ['rev-parse', '--git-path', 'index']);
  const indexFile = indexPath.status === 0 ? resolve(indexPath.stdout.trim()) : null;
  let found = null;
  let unreadable = indexFile === null;
  if (indexFile !== null) {
    try { found = readFileSync(indexFile); } catch (error) { unreadable = error.code !== 'ENOENT'; }
  }
  const sharedPath = found === null ? null : run('git', ['rev-parse', '--shared-index-path']);
  const sharedFile = sharedPath?.status === 0 && sharedPath.stdout.trim() !== '' ? resolve(sharedPath.stdout.trim()) : null;
  let sharedFound = null;
  if (sharedFile !== null) {
    try { sharedFound = readFileSync(sharedFile); } catch { unreadable = true; }
  }
  // The tree the index records before staging; set once `git write-tree` has run.
  let recordedTree = null;
  const readable = () => spawnSync('git', ['ls-files', '-s'], { stdio: ['ignore', 'ignore', 'pipe'] }).status === 0;
  const putBack = () => {
    if (sharedFound !== null) {
      let present = true;
      try { readFileSync(sharedFile); } catch { present = false; }
      if (!present) {
        writeFileSync(`${sharedFile}.commit-when-clean.tmp`, sharedFound);
        renameSync(`${sharedFile}.commit-when-clean.tmp`, sharedFile);
      }
    }
    let now = null;
    try { now = readFileSync(indexFile); } catch { /* absent: compared below */ }
    if (found === null ? now === null : (now !== null && now.equals(found))) return;
    if (found === null) { rmSync(indexFile, { force: true }); return; }
    const lock = `${indexFile}.lock`;
    writeFileSync(lock, found, { flag: 'wx' });
    renameSync(lock, indexFile);
  };
  const restore = () => {
    const kept = `${indexFile}.commit-when-clean`;
    try {
      putBack();
    } catch (error) {
      try { if (found !== null) writeFileSync(kept, found); } catch { /* reported below */ }
      process.stderr.write(`could not put the index back (${error.message}); `
        + (found === null ? 'remove the index to undo the staging.\n'
          : `the index as found is kept in ${kept}: move it over ${indexFile} to undo the staging.\n`));
      return;
    }
    if (readable()) return;
    try { if (found !== null) writeFileSync(kept, found); } catch { /* reported below */ }
    rmSync(indexFile, { force: true });
    const rebuilt = run('git', ['read-tree', recordedTree ?? 'HEAD']);
    process.stderr.write('the index as found could not be read back after it was put back, so it was rebuilt '
      + `from ${recordedTree === null ? 'HEAD' : `the tree it recorded before staging (${recordedTree})`} with git read-tree`
      + `${rebuilt.status === 0 ? '' : ' (which failed too; remove the index and stage again)'}: the staged set is kept, `
      + 'per-entry flags (intent-to-add, assume-unchanged, skip-worktree, sparse) are lost'
      + `${found === null ? '' : `; the bytes found are kept in ${kept}`}.\n`);
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
  // Every refusal of the gate's own (a failed `git add`, a verifier that is not clean, 90, 92, 95,
  // and a SIGINT, SIGTERM, SIGHUP or SIGQUIT between staging and the commit) puts the index file back byte for
  // byte as it was found, flags included, as the old order never touched it before the verifier
  // passed. A failing `git commit` itself leaves the index staged, as it did on main; a signal during
  // the commit is git's to handle. SIGKILL cannot be handled: after one, the index is left staged.
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
  if (index.status === 0) recordedTree = index.stdout.trim();
  if (unreadable || unmerged.status !== 0 || (unmerged.stdout ?? '').trim() !== '' || index.status !== 0) {
    // `git write-tree` may have written a cache tree into the index; nothing else has written it.
    if (!unreadable) restore();
    // A leftover `index.lock` makes `git write-tree` fail too; it is named, not left to read as a
    // conflict (Q0-292-4). The gate does not remove it: it may belong to a git that is still running.
    const lock = indexFile === null ? null : `${indexFile}.lock`;
    let locked = false;
    try { locked = lock !== null && readFileSync(lock) !== null; } catch { locked = false; }
    process.stderr.write(locked
      ? `refusing to commit: ${lock} exists, so the index cannot be recorded; if no git process is running, `
        + 'remove it, then run this again. Nothing was staged.\n'
      : 'refusing to commit: the index holds unresolved conflicts or cannot be recorded; '
        + 'resolve them and stage the result, then run this again. Nothing was staged.\n');
    return 95;
  }

  // From here until the commit, a signal puts the index back before the gate exits.
  let interrupted = null;
  let verifier = null;
  const onSignal = (signal) => {
    // A second signal escalates: whatever ignored the first is killed.
    const escalate = interrupted !== null;
    interrupted ??= signal;
    if (verifier !== null && verifier.exitCode === null && verifier.signalCode === null) {
      try { process.kill(-verifier.pid, escalate ? 'SIGKILL' : signal); } catch { /* already gone */ }
    }
  };
  for (const signal of SIGNALS) process.on(signal, onSignal);
  const release = () => { for (const signal of SIGNALS) process.off(signal, onSignal); };
  const interruptedExit = () => {
    restore();
    release();
    process.stderr.write(`refusing to commit: interrupted by ${interrupted}; the index is as it was found\n`);
    return 128 + (constants.signals[interrupted] ?? 0);
  };

  // A signal that arrived during a synchronous step is delivered only when the event loop turns.
  const turn = () => new Promise((next) => { setImmediate(next); });
  const staged = run('git', ['add', '-A']);
  // Turned before the status is read, so a Ctrl-C that killed `git add -A` along with the gate's own
  // group is reported as the interrupt it was, 128 + n, not as git's failure (A1-292-4).
  await turn();
  if (interrupted !== null) return interruptedExit();
  if (staged.status !== 0) {
    process.stderr.write(`${staged.stderr}`);
    restore();
    release();
    return staged.status ?? 1;
  }
  if (interrupted !== null) return interruptedExit();

  const verify = await runVerifier((child) => { verifier = child; });
  if (interrupted !== null) return interruptedExit();
  const output = `${verify.stdout ?? ''}${verify.stderr ?? ''}`;
  if (verify.status !== 0) {
    // Restored before the handlers are released, as on every other path (A1-292-5, C0-292-3).
    restore();
    release();
    process.stderr.write('refusing to commit: the tree is not clean\n');
    process.stderr.write(`${output.trimEnd().split('\n').slice(-3).join('\n')}\n`);
    return verify.status ?? 1;
  }
  // The verifier prints `clean: exit 0 — tests N, pass N, …`. Requiring that line as well as the
  // status closes the case where something silences npm and every command exits 0 saying nothing.
  if (!/^clean: exit 0 — tests \d+, pass \d+/m.test(output)) {
    restore();
    release();
    process.stderr.write('refusing to commit: the verifier exited 0 without reporting a clean run\n');
    return 90;
  }

  // The index was staged from the tree before the verifier ran; the tree must still be what it was,
  // or the index may not be what the verifier read.
  const moved = treeState() !== before;
  // Turned once more, so a signal that arrived during the sample is handled before the commit.
  await turn();
  if (interrupted !== null) return interruptedExit();
  if (moved) {
    restore();
    release();
    process.stderr.write('refusing to commit: the working tree changed while the verifier was running. '
      + 'What was verified is not what would be committed.\n');
    return 92;
  }
  release();
  const commit = run('git', ['commit', '-F', messageFile]);
  process.stdout.write(`${commit.stdout ?? ''}${commit.stderr ?? ''}`);
  if (commit.status !== 0) return commit.status ?? 1;
  process.stdout.write(`${output.match(/^clean: .*$/m)?.[0] ?? ''}\n`);
  return 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exit(await main(process.argv));
}
