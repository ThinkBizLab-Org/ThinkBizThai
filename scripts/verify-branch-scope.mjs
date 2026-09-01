import { readFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);

// `validate-work-package-ownership.mjs` checks what a manifest DECLARES: that its outputs sit
// inside its writable paths and outside its forbidden ones. It cannot see what a branch
// actually changed, because a manifest is a promise and a branch is a fact.
//
// Two things this repository has already done make that gap expensive. A stacked rebase
// resolved with `--theirs` on a file the BASE had just changed silently reverted it -- the
// separator withdrawal came back, and the scanner then reported the package's own test file.
// And work done on the top branch while fixing review findings quietly accumulated changes to
// paths that belong to packages further down the stack.
//
// So this compares the branch diff against the union of every declared writable path and every
// recorded amendment, and reports what is in neither.
export function globToRegExp(glob) {
  let out = '^';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // `**` spans directories only as a whole segment, matching what a shell glob does.
        const wholeSegment = (i === 0 || glob[i - 1] === '/') && (glob[i + 2] === '/' || i + 2 === glob.length);
        if (wholeSegment) {
          // A trailing `**` matches everything below. A mid-path `**/` must keep the boundary it
          // sits on: `evidence/**/notes.md` is not allowed to match `evidence/XYZnotes.md`, which
          // is what dropping the slash produced.
          if (i + 2 === glob.length) { out += '.*'; i += 1; continue; }
          out += '(?:.*/)?';
          i += 2;
          continue;
        }
        out += '[^/]*'; i += 1; continue;
      }
      out += '[^/]*';
    } else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`${out}$`);
}

export function declaredPaths(manifest) {
  const ownership = manifest.ownership ?? {};
  return [
    ...(ownership.writable_paths ?? []),
    ...(ownership.amends_without_owning?.paths ?? []),
  ];
}

export function undeclared(changedFiles, patterns) {
  const matchers = patterns.map(globToRegExp);
  return changedFiles.filter((file) => !matchers.some((m) => m.test(file)));
}

// The other direction: an amendment that explains NOTHING the branch changed.
//
// The manifest validator caps how broad one pattern may be, but a package can still declare
// fourteen narrow globs that sum to the whole catalog -- found by probing that cap, which passed
// at exit 0. A cap on breadth cannot see intent; the diff can. An amendment is a record of what
// a package touched outside its scope, so a pattern matching none of what it touched is not a
// record of anything.
//
// This is what would have caught `.agents/**` on this very package: four protected schemas
// declared, none of them changed.
export function deadAmendments(changedFiles, patterns) {
  return patterns.filter((pattern) => {
    const matcher = globToRegExp(pattern);
    return !changedFiles.some((file) => matcher.test(file));
  });
}

async function main() {
  const [base, packageId] = process.argv.slice(2);
  if (!base || !packageId) {
    console.error('usage: node scripts/verify-branch-scope.mjs <base-ref> <work-package-id>');
    process.exit(2);
  }
  const manifest = JSON.parse(await readFile(`work-packages/${packageId}.json`, 'utf8'));
  // `--no-renames`. Git's rename detection prints only the DESTINATION of an R100, so a branch
  // that moves another package's file out from under it reports one declared path and nothing
  // else. Independent review demonstrated it: `git mv` on another contract's schema.json into
  // this package's evidence directory reported "all 1 changed path(s) are declared", exit 0.
  // That is the first failure this guard was written for -- a rebase silently relocating a file
  // -- reappearing through the tool's own default.
  const diff = (await run('git', ['diff', '--no-renames', '--name-only', `${base}..HEAD`])).stdout.trim();
  const changed = diff ? diff.split('\n') : [];
  const stray = undeclared(changed, declaredPaths(manifest));
  if (stray.length > 0) {
    console.error(`${packageId} changed ${stray.length} path(s) it neither owns nor records as an amendment:`);
    for (const file of stray) console.error(`  ${file}`);
    console.error('Declare each one in ownership.writable_paths or ownership.amends_without_owning, with a reason, or move the change to the package that owns it.');
    process.exit(73);
  }
  const dead = deadAmendments(changed, manifest.ownership?.amends_without_owning?.paths ?? []);
  if (dead.length > 0) {
    console.error(`${packageId} declares ${dead.length} amendment(s) that explain nothing this branch changed:`);
    for (const pattern of dead) console.error(`  ${pattern}`);
    console.error('An amendment records what a package touched outside its own scope. A declaration matching none of '
      + 'the diff is a standing permission over another package\'s files, granted for work that never happened.');
    process.exit(74);
  }
  console.log(`${packageId}: all ${changed.length} changed path(s) are declared, and every amendment explains one`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
