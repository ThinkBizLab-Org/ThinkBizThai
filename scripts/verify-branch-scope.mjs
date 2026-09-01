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
        if (wholeSegment) { out += '.*'; i += 1; if (glob[i + 1] === '/') i += 1; continue; }
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

// `amends_without_owning` is how a package records a change to a file another package owns. It
// was an unvalidated escape hatch: nothing read it except this file, and this file unioned it
// straight into the allowed set -- so it silently overrode the SAME manifest's own
// `forbidden_paths`, which name `.env`, `db/**`, `migrations/**` and private-key extensions.
//
// A package may amend what it does not own. It may not amend what it has itself declared
// forbidden, and it may not declare an amendment it never makes.
export function amendmentProblems(manifest, changedFiles) {
  const ownership = manifest.ownership ?? {};
  const amends = ownership.amends_without_owning ?? {};
  const problems = [];
  // A forbidden pattern with no slash names a FILE SHAPE, not a top-level path: `*.pem` must
  // forbid `keys/server.pem`, not only `server.pem`. Matching it as written let a private key
  // through in any subdirectory, which is the one thing that list exists for.
  const forbidden = (ownership.forbidden_paths ?? []).map(
    (pattern) => globToRegExp(pattern.includes('/') ? pattern : `**/${pattern}`),
  );
  for (const pattern of amends.paths ?? []) {
    if (pattern.startsWith('/') || pattern.includes('..')) {
      problems.push(`amends_without_owning declares "${pattern}", which is absolute or contains a traversal`);
    }
  }
  for (const file of changedFiles) {
    if (forbidden.some((m) => m.test(file))) {
      problems.push(`${file} is changed by this branch and matches this package's own forbidden_paths`);
    }
  }
  if ((amends.paths ?? []).length > 0 && !(amends.rationale ?? '').trim()) {
    problems.push('amends_without_owning declares paths with no rationale; an amendment without a reason is not a record');
  }
  return problems;
}

export function undeclared(changedFiles, patterns) {
  const matchers = patterns.map(globToRegExp);
  return changedFiles.filter((file) => !matchers.some((m) => m.test(file)));
}

async function main() {
  const [base, packageId] = process.argv.slice(2);
  if (!base || !packageId) {
    console.error('usage: node scripts/verify-branch-scope.mjs <base-ref> <work-package-id>');
    process.exit(2);
  }
  const manifest = JSON.parse(await readFile(`work-packages/${packageId}.json`, 'utf8'));
  const diff = (await run('git', ['diff', '--name-only', `${base}..HEAD`])).stdout.trim();
  const changed = diff ? diff.split('\n') : [];
  const forbidden = amendmentProblems(manifest, changed);
  if (forbidden.length > 0) {
    console.error(`${packageId} has amendment problems:`);
    for (const problem of forbidden) console.error(`  ${problem}`);
    process.exit(74);
  }
  const stray = undeclared(changed, declaredPaths(manifest));
  if (stray.length > 0) {
    console.error(`${packageId} changed ${stray.length} path(s) it neither owns nor records as an amendment:`);
    for (const file of stray) console.error(`  ${file}`);
    console.error('Declare each one in ownership.writable_paths or ownership.amends_without_owning, with a reason, or move the change to the package that owns it.');
    process.exit(73);
  }
  console.log(`${packageId}: all ${changed.length} changed path(s) are declared`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
