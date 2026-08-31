import { readFile, readdir } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GUARD_SCRIPT,
  MIN_DECLARED_TESTS,
  GUARDED_SCRIPT_DIGESTS,
  MIN_DECLARED_TESTS_BY_DIRECTORY,
  MIN_TEST_DIRECTORIES,
  MIN_TEST_FILES,
  RUNNER_SCRIPT,
  TEST_PATTERN,
  TEST_ROOT,
} from './test-suite-contract.mjs';
import { createHash } from 'node:crypto';

// A green `npm run check` must never mean "executed nothing".
// `node --test <pattern>` exits 0 with `tests 0` when the pattern matches no file,
// so a rename, relocation, or a shell that does not strip the quotes would report
// success having run no test at all. This guard fails the run instead.
const DEFAULT_FLOOR = MIN_TEST_FILES;
const DECLARED_TEST_FLOOR = MIN_DECLARED_TESTS;

export class CoverageFloorError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function globToRegExp(pattern) {
  let expression = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '*') {
      if (pattern[index + 1] === '*') {
        // `**` spans directory segments ONLY when it is a whole segment (`**/` or a
        // trailing `**`). Inside a segment -- `test-kits/**.test.mjs` -- node's glob
        // treats it as a single-segment `*`. Expanding it to `.*` here made the guard
        // accept a pattern under which the runner silently skipped the contract tests:
        // the same defect class this guard exists to catch. Independent testing found it.
        const atSegmentStart = index === 0 || pattern[index - 1] === '/';
        const next = pattern[index + 2];
        if (atSegmentStart && next === '/') {
          expression += '(?:[^/]+/)*';
          index += 2;
        } else if (atSegmentStart && next === undefined) {
          expression += '.*';
          index += 1;
        } else {
          expression += '[^/]*';
          index += 1;
        }
      } else {
        expression += '[^/]*';
      }
    } else {
      expression += character.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }
  return new RegExp(`${expression}$`);
}

// Verifying `test:bootstrap` in isolation is not enough: independent review showed that
// dropping `&& npm run test:bootstrap` from `check` leaves `npm run check` exiting 0 with
// zero tests while this guard stays silent. The wiring is therefore checked too.
export function assertPackageScripts(scripts) {
  const bootstrap = scripts?.['test:bootstrap'];
  if (bootstrap !== RUNNER_SCRIPT) {
    throw new CoverageFloorError(74, `test:bootstrap must be exactly \`${RUNNER_SCRIPT}\` so that no wrapper, chained operator, or extra flag can neutralise the runner; found: ${String(bootstrap)}`);
  }
  if (scripts?.['verify:coverage-floor'] !== GUARD_SCRIPT) {
    throw new CoverageFloorError(74, `verify:coverage-floor must be exactly \`${GUARD_SCRIPT}\`; found: ${String(scripts?.['verify:coverage-floor'])}`);
  }
  const check = scripts?.check;
  if (typeof check !== 'string') {
    throw new CoverageFloorError(74, 'package.json must declare a check script');
  }
  const missing = ['npm run verify:coverage-floor', 'npm run test:bootstrap'].filter((step) => !check.includes(step));
  if (missing.length > 0) {
    throw new CoverageFloorError(81, `check must invoke ${missing.join(' and ')}; a guard that is not wired into check protects nothing. Found: ${check}`);
  }
  const guardAt = check.indexOf('npm run verify:coverage-floor');
  const runnerAt = check.indexOf('npm run test:bootstrap');
  if (guardAt > runnerAt) {
    throw new CoverageFloorError(81, 'check must run verify:coverage-floor before test:bootstrap so a broken declaration fails fast.');
  }
  return TEST_PATTERN;
}

// A floor on files alone is gameable: eight files declaring no test at all satisfy it
// while the runner executes nothing. Count declared `test(...)` calls too.
// A raw line-anchored regex counted `test(` inside block comments, line comments and
// template literals -- independent review and independent testing each padded a suite that
// way and cleared the floor. Strip those regions before counting.
export function stripNonCode(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '')
    .replace(/`(?:\\[\s\S]|[^\\`])*`/g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/'(?:\\.|[^\\'\n])*'/g, "''")
    .replace(/"(?:\\.|[^\\"\n])*"/g, '""');
}

export function countDeclaredTests(source) {
  return (stripNonCode(source).match(/^\s*(?:await\s+)?test\s*\(/gm) ?? []).length;
}

export async function discoverTestFiles(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(directory, entry.name);
    // `isFile()` is false for a symlink, but `node --test` follows and EXECUTES one.
    // Independent security review placed a symlinked payload resolving outside the test
    // root: it ran, and the guard reported clean. A test root must contain no symlink.
    if (entry.isSymbolicLink()) {
      throw new CoverageFloorError(85, `symbolic link inside the test root: ${entryPath}. node --test follows and executes it while file-type discovery does not see it, so a symlink can run code the guard never inspected.`);
    }
    if (entry.isDirectory()) return discoverTestFiles(entryPath, root);
    return entry.isFile() && entry.name.endsWith('.test.mjs') ? [entryPath] : [];
  }));
  return nested.flat().sort();
}

export function assertCoverage(pattern, files, floor = DEFAULT_FLOOR) {
  if (files.length < floor) {
    throw new CoverageFloorError(75, `expected at least ${floor} test files under test-kits/, found ${files.length}. A green run that executes nothing is the defect this guard exists to prevent.`);
  }
  const matcher = globToRegExp(pattern);
  const unmatched = files.filter((file) => !matcher.test(posix.normalize(file.split('\\').join('/'))));
  if (unmatched.length > 0) {
    throw new CoverageFloorError(76, `test:bootstrap pattern '${pattern}' does not match ${unmatched.length} discovered test file(s): ${unmatched.join(', ')}. These would silently never run.`);
  }
  const directories = new Set(files.map((file) => file.split('/').slice(0, -1).join('/')));
  if (directories.size < MIN_TEST_DIRECTORIES) {
    throw new CoverageFloorError(77, `expected test files in at least ${MIN_TEST_DIRECTORIES} directories under test-kits/, found only: ${[...directories].join(', ')}. A pattern that stops descending into subdirectories is the WP-0A-A0-002 defect class.`);
  }
}

export async function assertDeclaredTests(files, floor = DECLARED_TEST_FLOOR, byDirectory = MIN_DECLARED_TESTS_BY_DIRECTORY) {
  let total = 0;
  const empty = [];
  const perDirectory = new Map();
  for (const file of files) {
    const declared = countDeclaredTests(await readFile(file, 'utf8'));
    if (declared === 0) empty.push(file);
    total += declared;
    const directory = file.split('/').slice(0, -1).join('/');
    perDirectory.set(directory, (perDirectory.get(directory) ?? 0) + declared);
  }
  if (empty.length > 0) {
    throw new CoverageFloorError(78, `discovered test file(s) declare no test at all: ${empty.join(', ')}. A file that is counted but declares nothing hides an empty suite behind the file floor.`);
  }
  if (total < floor) {
    throw new CoverageFloorError(78, `expected at least ${floor} declared tests across test-kits/, found ${total}.`);
  }
  // A global aggregate lets any one suite be swapped for a placeholder while the total
  // still clears the floor. Integration verification did exactly that to the contract
  // suite and every check stayed green, so each protected directory carries its own floor.
  for (const [directory, minimum] of Object.entries(byDirectory)) {
    const declared = directory === TEST_ROOT
      ? total
      : [...perDirectory].filter(([key]) => key === directory).reduce((sum, [, value]) => sum + value, 0);
    if (declared < minimum) {
      throw new CoverageFloorError(82, `directory '${directory}' declares ${declared} tests, below its floor of ${minimum}. A per-directory floor exists because a global total lets the suite it protects be replaced by a placeholder.`);
    }
  }
  return total;
}

// The guard pins the command string; nothing pins the BEHAVIOUR of the file that command
// runs. Independent review gutted main() to `return`, kept the exports, and npm run check
// exited 0 having executed nothing. That cannot be eliminated from inside a script the same
// commit can edit -- so this does not claim to close it. It makes the edit loud: changing a
// guarded script fails the run until its digest here is deliberately updated, which is a
// reviewable diff rather than a silent one.
export async function assertGuardedScriptDigests(digests = GUARDED_SCRIPT_DIGESTS) {
  const drifted = [];
  for (const [file, expected] of Object.entries(digests)) {
    const actual = createHash('sha256').update(await readFile(file, 'utf8')).digest('hex');
    if (actual !== expected) drifted.push(`${file}\n    expected sha256 ${expected}\n    actual   sha256 ${actual}`);
  }
  if (drifted.length > 0) {
    throw new CoverageFloorError(86, `guarded script(s) changed without updating GUARDED_SCRIPT_DIGESTS in scripts/test-suite-contract.mjs:\n  ${drifted.join('\n  ')}\nThis is a tripwire, not a security boundary: it makes an edit to the test-integrity scripts explicit and reviewable.`);
  }
}

export async function verifyTestCoverageFloor(packageJsonPath = 'package.json', testDirectory = TEST_ROOT, floor = DEFAULT_FLOOR) {
  const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const pattern = assertPackageScripts(manifest.scripts);
  await assertGuardedScriptDigests();
  let files;
  try {
    files = await discoverTestFiles(testDirectory);
  } catch (error) {
    if (error instanceof CoverageFloorError) throw error;
    // A missing or relocated test root must fail as this guard's own error, not as an
    // unhandled ENOENT whose non-numeric `code` bypasses the numeric exit path below.
    throw new CoverageFloorError(79, `cannot read the test root '${testDirectory}': ${error.message}. A relocated or deleted test root must fail the run, not silently execute nothing.`);
  }
  assertCoverage(pattern, files, floor);
  const declared = await assertDeclaredTests(files);
  return { pattern, files, declared };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await verifyTestCoverageFloor();
  } catch (error) {
    console.error(error.message);
    process.exit(Number.isInteger(error.code) ? error.code : 65);
  }
}
