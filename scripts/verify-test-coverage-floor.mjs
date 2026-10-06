import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DECLARED_ASSERTION_FLOOR_BY_FILE,
  TEST_NAME_DIGEST_BY_FILE,
  DECLARED_TEST_FLOOR_BY_FILE,
  GUARD_SCRIPT,
  MIN_DECLARED_TESTS,
  INTEGRITY_MANIFEST,
  MIN_DECLARED_TESTS_BY_DIRECTORY,
  MIN_TEST_DIRECTORIES,
  MIN_TEST_FILES,
  RUNNER_SCRIPT,
  TEST_PATTERN,
  TEST_ROOTS,
  TEST_ROOT,
} from './test-suite-contract.mjs';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';

// A green `npm run check` must never mean "executed nothing".
// `node --test <pattern>` exits 0 with `tests 0` when the pattern matches no file,
// so a rename, relocation, or a shell that does not strip the quotes would report
// success having run no test at all. This guard fails the run instead.
const DEFAULT_FLOOR = MIN_TEST_FILES;
const DECLARED_TEST_FLOOR = MIN_DECLARED_TESTS;

function isRepositoryRelativePath(path) {
  if (typeof path !== 'string' || path.length === 0 || path.startsWith('/') || path.includes('\\') || path.includes('\u0000')) return false;
  return path.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

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
// Every script the check chain invokes, pinned to the exact command it must run.
export const CHAIN_COMMANDS = {
  'scan:secrets': 'node scripts/scan-repository-secrets.mjs',
  'validate:protocol': 'node scripts/validate-work-packages.mjs && node scripts/validate-capability-profiles.mjs && node scripts/validate-work-package-ownership.mjs',
};

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
  // `String.includes` plus an index comparison is not enough. Independent testing changed
  // one character -- `&& npm run test:bootstrap` to `|| npm run test:bootstrap` -- and both
  // checks still passed while `||` short-circuited, so `npm run check` exited 0 having run
  // no test, with every protected file and the manifest byte-identical. `# &&` and
  // `&& echo` do the same. The chain is therefore parsed structurally.
  const steps = check.split('&&').map((step) => step.trim());
  if (steps.some((step) => step.length === 0)) {
    throw new CoverageFloorError(81, `check contains an empty step; every step must be a real command joined by &&. Found: ${check}`);
  }
  // A NEWLINE is a POSIX command separator and was in none of the forbidden sets. Independent
  // review sixteen wrote `… && true\nexit 0 && npm run test:bootstrap`: every required step
  // present as its own step, order and first/last satisfied, no forbidden character anywhere --
  // and `sh` ran `exit 0` before the suite. **exit 0, zero tests executed, no `ℹ pass` line at
  // all.** The whole suite, the verification record, the post-run integrity re-check and the
  // declaration reconciliation went with it, and CI's own `npm run check` step went green too.
  //
  // Enumerating separators was the wrong shape: `\n`, `\r`, `$(`, backticks and `(` are all
  // separators or substitutions, and the next one is whatever nobody listed. A step is now an
  // ALLOWED alphabet, and anything outside it is rejected whatever it means.
  const allowed = /^[A-Za-z0-9 ./:_@-]+$/;
  for (const step of steps) {
    if (!allowed.test(step)) {
      const offending = [...step].filter((character) => !allowed.test(character))
        .map((character) => JSON.stringify(character)).join(', ');
      throw new CoverageFloorError(81, `check step ${JSON.stringify(step)} contains ${offending}, which is not part of a command name or path. `
        + 'A newline, a substitution or a subshell can end the chain early while every structural check still passes.');
    }
  }
  for (const forbidden of ['||', ';', '|', '#', '&']) {
    // `&` is checked after splitting on `&&`, so any surviving `&` is a background operator.
    if (steps.some((step) => step.includes(forbidden))) {
      throw new CoverageFloorError(81, `check must be a plain && chain: '${forbidden}' would let a step be skipped, backgrounded, or commented out while this guard still saw the text. Found: ${check}`);
    }
  }
  // Requiring only the guard and the runner left the MIDDLE of the chain unconstrained.
  // Independent review reduced check to `verify:coverage-floor && test:bootstrap`, recomputed
  // the digest, and both this guard and npm run check exited 0 -- silently deleting the
  // toolchain pin, the secret scan and all three protocol validators from CI. Every step that
  // gates the repository is required, in order.
  const required = [
    'npm run verify:coverage-floor',
    'node scripts/verify-toolchain.mjs',
    'npm run scan:secrets',
    'npm run validate:protocol',
    'npm run test:bootstrap',
  ];
  const missing = required.filter((step) => !steps.includes(step));
  if (missing.length > 0) {
    throw new CoverageFloorError(81, `check must invoke ${missing.join(' and ')} as its own && step; a guard that is not wired into check protects nothing. Found: ${check}`);
  }
  // Equality, not containment. The review's newline carrier rode in on an EXTRA step -- the chain
  // was allowed to hold anything as long as it also held the five required ones. An extra step
  // buys nothing a required step does not.
  if (steps.length !== required.length) {
    const extra = steps.filter((step) => !required.includes(step));
    throw new CoverageFloorError(81, `check has ${steps.length} steps where ${required.length} are required`
      + `${extra.length > 0 ? `; unexpected: ${extra.map((step) => JSON.stringify(step)).join(', ')}` : ''}. `
      + 'The chain is exactly the five guards, in order.');
  }
  // Requiring the STEP is not requiring the WORK. `test:bootstrap` and `verify:coverage-floor`
  // were pinned to exact commands; the three steps between them were pinned only by name, so
  // `"validate:protocol": "true"` and `"scan:secrets": "true"` each passed at exit 0 with the
  // chain intact and every guard listed. A named step that runs `true` is a step that protects
  // nothing, and the chain check cannot tell the difference by reading the chain.
  for (const [name, command] of Object.entries(CHAIN_COMMANDS)) {
    if (scripts?.[name] !== command) {
      throw new CoverageFloorError(74, `${name} must be exactly \`${command}\`; a step named in check that runs something else `
        + `protects nothing while the chain still reads correctly. Found: ${String(scripts?.[name])}`);
    }
  }
  // A guard that is not reached enforces nothing. Independent testing replaced `&&` at
  // EVERY position: step 1 succeeded, the chain short-circuited, and npm run check exited 0
  // having never invoked this guard at all. Rejecting `||` inside a step cannot help when
  // the step containing that check never runs, so the guard must be the FIRST step.
  if (steps[0] !== 'npm run verify:coverage-floor') {
    throw new CoverageFloorError(81, `check must START with npm run verify:coverage-floor; a guard placed later is never reached if an earlier step short-circuits. Found first step: ${steps[0]}`);
  }
  const order = required.map((step) => steps.indexOf(step));
  if (order.some((position, index) => index > 0 && position < order[index - 1])) {
    throw new CoverageFloorError(81, `check must run its steps in the order ${required.join(' -> ')}; found: ${check}`);
  }
  if (steps.at(-1) !== 'npm run test:bootstrap') {
    throw new CoverageFloorError(81, `check must END with npm run test:bootstrap so nothing can follow and mask its exit code. Found: ${check}`);
  }
  return TEST_PATTERN;
}

// Counting declarations requires knowing which text is code. Chained regex replacements
// cannot: stripping block comments first made the `/*` inside a glob string such as
// 'test-kits/*.test.mjs' open a phantom comment that closed on the `*/` inside a later
// 'test-kits/**/*.test.mjs', erasing 11 real declarations from the count. Independent
// testing also drove it the other way, manufacturing phantom declarations from a template
// literal. A single left-to-right scan that tracks what it is inside is the only correct
// way to do this without a parser.
function regexCanStartHere(before) {
  const previous = before.replace(/\s+$/, '').slice(-1);
  return regexCanFollow(previous);
}

// The same question asked of ONE character instead of a whole buffer. `stripNonCode` knows the
// last significant character it appended, so it does not have to find it again.
function regexCanFollow(previous) {
  return previous === '' || '(,=:[!&|?{};+-*%~^<>'.includes(previous);
}

export function stripNonCode(source) {
  let out = '';
  let i = 0;
  // The last NON-WHITESPACE character appended to `out`, maintained as we go.
  //
  // This used to be recovered by `before.replace(/\s+$/, '').slice(-1)` over the whole of `out`,
  // on every `/` in a code position. Two things made that quadratic rather than merely wasteful:
  // `out` grows to the size of the file, and `keepNewlines` turns every comment and string into a
  // RUN OF SPACES, so `/\s+$/` had a long run to consume and reject at each candidate start.
  // Measured on this repository: 42,323ms for identity-isolation.test.mjs (622KB) against 18ms
  // for isolation-cases.mjs (701KB, larger) -- the difference being how many slashes sit in code
  // positions rather than inside string literals.
  //
  // Only four things are ever appended, and all four are whitespace: keepNewlines() output for a
  // comment, a regex literal or a string literal. The single-character code append below is the
  // ONLY one that can change the answer, which is what makes an incremental variable exact rather
  // than an approximation of the scan it replaces.
  let lastSignificant = '';
  const keepNewlines = (text) => text.replace(/[^\n]/g, ' ');
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += keepNewlines(source.slice(i, stop));
      i = stop;
      continue;
    }
    if (two === '//') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      out += keepNewlines(source.slice(i, stop));
      i = stop;
      continue;
    }
    // A regex literal may contain quotes, slashes and `/*`. Without tracking it, `/[/*]/`
    // opened a phantom block comment running to end of file. Distinguish it from division
    // by the last significant character before it.
    if (source[i] === '/' && regexCanFollow(lastSignificant)) {
      let j = i + 1;
      let inClass = false;
      while (j < source.length) {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j] === '\n') break;
        if (source[j] === '[') inClass = true;
        else if (source[j] === ']') inClass = false;
        else if (source[j] === '/' && !inClass) break;
        j += 1;
      }
      const stop = Math.min(j + 1, source.length);
      out += keepNewlines(source.slice(i, stop));
      i = stop;
      continue;
    }
    const quote = source[i];
    if (quote === '"' || quote === "'" || quote === '`') {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j] === quote) break;
        // A template literal may nest arbitrary code in ${...}; treat the whole literal as
        // non-code so nothing inside it can be counted as a declaration.
        if (quote !== '`' && source[j] === '\n') break;
        j += 1;
      }
      const stop = Math.min(j + 1, source.length);
      out += keepNewlines(source.slice(i, stop));
      i = stop;
      continue;
    }
    out += source[i];
    if (source[i].trim() !== '') lastSignificant = source[i];
    i += 1;
  }
  return out;
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

// A discovered file whose real path lies outside the repository executes code the guard
// never inspected. Independent testing reached /tmp this way during a green npm run check.
export async function assertNoEscapingPath(files, root = process.cwd()) {
  const realRoot = await realpath(root);
  for (const file of files) {
    const actual = await realpath(file);
    if (!actual.startsWith(`${realRoot}/`)) {
      throw new CoverageFloorError(85, `test file '${file}' resolves to '${actual}', outside the repository root. node --test would execute it while the guard inspected a path that is not the code that runs.`);
    }
  }
}

export function assertCoverage(pattern, files, floor = DEFAULT_FLOOR) {
  if (files.length < floor) {
    throw new CoverageFloorError(75, `expected at least ${floor} test files under test-kits/, found ${files.length}. A green run that executes nothing is the defect this guard exists to prevent.`);
  }
    // The runner takes a LIST of patterns now — `test-kits/**` for the protocol and foundation
    // suites, `tests/**` for a module's own tests, which the data package's ownership contract puts
    // in its own directory. A file must match at least one, and every discovered file must still
    // match SOMETHING: a test the pattern misses is a test the runner never executes. That is how
    // A1's fourteen isolation tests came to be green by hand and absent from `npm run check`.
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    const matchers = patterns.map(globToRegExp);
    const unmatched = files.filter((file) =>
      !matchers.some((m) => m.test(posix.normalize(file.split('\\').join('/')))));
  if (unmatched.length > 0) {
    throw new CoverageFloorError(76, `test:bootstrap pattern(s) '${patterns.join("', '")}' do not match ${unmatched.length} discovered test file(s): ${unmatched.join(', ')}. These would silently never run.`);
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

// Every protected file is digested in one manifest, including the scripts that do the
// checking and the contract that declares the floors. The manifest itself is the single
// unanchored artifact and is declared as such: nothing inside this repository can verify
// it, only a human reading the diff or a protected CI configuration can.
export async function assertIntegrityManifest(manifestPath = INTEGRITY_MANIFEST) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    throw new CoverageFloorError(86, `cannot read the integrity manifest '${manifestPath}': ${error.message}. Without it nothing pins the files that do the checking.`);
  }
  const entries = Object.entries(manifest.files ?? {});
  if (entries.length === 0) {
    throw new CoverageFloorError(86, `integrity manifest '${manifestPath}' protects no file.`);
  }
  const drifted = [];
  for (const [file, expected] of entries) {
    // A manifest key is a path this guard will read. Constrain it, or the manifest becomes
    // an arbitrary-file-read primitive whose mismatch message prints that file's real
    // digest into build logs -- a fingerprint oracle. Independent security review found both.
    if (!isRepositoryRelativePath(file) || !/^[0-9a-f]{64}$/.test(String(expected))) {
      throw new CoverageFloorError(86, `integrity manifest entry is not a repository-relative path with a sha256 digest: ${file}`);
    }
    let actual;
    try {
      // Hash bytes, not decoded text: 'utf8' maps distinct binaries onto the same string.
      actual = createHash('sha256').update(await readFile(file)).digest('hex');
    } catch (error) {
      drifted.push(`${file} — MISSING`);
      continue;
    }
    // Report drift without printing the observed digest.
    if (actual !== expected) drifted.push(`${file} — content does not match its recorded digest`);
  }
  if (drifted.length > 0) {
    throw new CoverageFloorError(86, `protected file(s) changed without updating ${manifestPath}:\n  ${drifted.join('\n  ')}\nThis is a tripwire, not a security boundary: it makes an edit to the guards or the suites they protect explicit and reviewable. A commit that updates both still passes; the anchor is human review of the diff and protected CI. Branch protection on main became real on 2026-09-02 -- required status check, admins included, verified by a rejected direct push -- so the outside anchor this sentence used to describe as missing now exists. What is still missing is a required review: the Product Owner opens the pull requests and GitHub forbids approving your own, so the human half of the anchor is the Product Owner reading the diff, not a control.`);
  }
  return entries.length;
}

// Independent review gutted the four test files the manifest did not name, with the manifest
// byte-identical -- exit 0, 54/54 green. That is NOT the unclosable digest-updating class,
// so it is closed: the protected set must cover every file the runner will execute.
// Independent review fourteen: the manifest's key set could still SHRINK. `PROTECTED_KEYS`
// names seventeen files whose absence is itself the defect -- and the four protocol validators
// were not among them, digested only because they happened to be listed. `regenerate:manifest`
// re-adds discovered test files and nothing else, so a deleted entry stays deleted.
//
// The review deleted four keys, stubbed the directory entry point of
// validate-work-package-ownership.mjs with `if (directory === 'work-packages') return;`, set this
// package's amendments to ["**"], and got exit 0 at 208/208 -- after which a branch changing a
// contract it neither owns nor amends reported "all 932 changed path(s) are declared".
//
// So the whole set is a ratchet, not just a named subset: a file that has ever been digested
// stays digested. Adding is free; removing is a deliberate edit here, in a diff a reviewer reads.
export const DIGESTED_FLOOR = [
  'scripts/verify-disposition-branch.mjs',
  'scripts/commit-when-clean.mjs',
  'test-kits/authority-dispositions.test.mjs',
  'test-kits/ratchets-bite.test.mjs',
  'architecture/decisions/.gitkeep',
  'package-lock.json',
  '.agents/capabilities.schema.json',
  '.agents/handoff.schema.json',
  '.agents/status.schema.json',
  '.agents/work-package.schema.json',
  '.github/workflows/ci.yml',
  '.node-version',
  'CONTRIBUTING_AGENTS.md',
  'architecture/decisions/RFC-2026-001-bootstrap-tooling-contract.md',
  'architecture/decisions/RFC-2026-002-manual-merge-control.md',
  'architecture/decisions/RFC-2026-003-contract-test-coverage-and-ownership-transfer.md',
  'architecture/decisions/RFC-2026-004-catalog-reference-integrity.md',
  'architecture/decisions/RFC-2026-005-secret-scan-strengthening.md',
  'architecture/decisions/RFC-2026-006-job-reference-hardening.md',
  'architecture/decisions/RFC-2026-007-ci-independent-guard-step.md',
  'architecture/decisions/RFC-2026-008-cardholder-data-scan.md',
  'architecture/decisions/RFC-2026-009-reference-bounds.md',
  'architecture/decisions/RFC-2026-010-shared-kernel-freeze-readiness.md',
  'architecture/decisions/RFC-2026-011-repository-language.md',
  'architecture/decisions/RFC-2026-012-client-database-boundary.md',
  'architecture/decisions/RFC-2026-013-agent-signature-scope.md',
  'architecture/decisions/RFC-2026-014-usage-measurement-identity.md',
  'architecture/decisions/RFC-2026-015-db00-data-foundation-decisions.md',
  'architecture/decisions/RFC-2026-016-rls-service-policy-and-platform.md',
  'architecture/decisions/RFC-2026-017-service-path-identity.md',
  'architecture/decisions/RFC-2026-018-service-path-connection.md',
  'architecture/decisions/RFC-2026-019-service-path-connection-corrected.md',
  'architecture/decisions/RFC-2026-020-authorization-helper-role.md',
  'architecture/decisions/RFC-2026-021-client-read-allowlist.md',
  'architecture/decisions/RFC-2026-022-service-policy-shape.md',
  'architecture/decisions/RFC-2026-023-acting-user-narrowing.md',
  'architecture/decisions/RFC-2026-024-cross-vendor-condition-withdrawn.md',
  'architecture/decisions/RFC-2026-025-owner-delegated-merge.md',
  'architecture/decisions/RFC-2026-026-audit-row-producer.md',
  'architecture/decisions/RFC-2026-027-lifecycle-visibility.md',
  'architecture/decisions/RFC-2026-028-worker-identity.md',
  'contract-catalog/README.md',
  'contract-catalog/shared-kernel/index.json',
  'docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md',
  'evidence/VERIFICATION.md',
  'package.json',
  'scripts/record-verification.mjs',
  'scripts/refresh-author-handoff.mjs',
  'scripts/regenerate-integrity-manifest.mjs',
  'scripts/run-test-suite.mjs',
  'scripts/scan-repository-secrets.mjs',
  'scripts/test-suite-contract.mjs',
  'scripts/toolchain-contract.mjs',
  'scripts/validate-capability-profiles.mjs',
  'scripts/validate-work-package-ownership.mjs',
  'scripts/validate-work-package-role-separation.mjs',
  'scripts/validate-work-packages.mjs',
  'scripts/verify-branch-identity.mjs',
  'scripts/verify-branch-scope.mjs',
  'scripts/verify-clean-run.mjs',
  'scripts/verify-test-coverage-floor.mjs',
  'scripts/verify-toolchain.mjs',
  'test-kits/branch-identity.test.mjs',
  'test-kits/branch-scope.test.mjs',
  'test-kits/capability-profile.test.mjs',
  'test-kits/ci-guard-behaviour.test.mjs',
  'test-kits/contracts/catalog-groups.test.mjs',
  'test-kits/contracts/catalog-reference-integrity.test.mjs',
  'test-kits/contracts/catalog-registry.test.mjs',
  'test-kits/db/foundation-contract.test.mjs',
  'test-kits/db/rls-assertions.test.mjs',
  'tests/db/identity/identity-isolation.test.mjs',
  'test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs',
  'test-kits/contracts/ctr-job-001-reference-hardening.test.mjs',
  'test-kits/contracts/json-schema-subset.mjs',
  'test-kits/contracts/schema-mutation-coverage.test.mjs',
  'test-kits/contracts/shared-kernel-contract-catalog.test.mjs',
  'test-kits/contracts/shared-kernel-envelope-contracts.test.mjs',
  'test-kits/contracts/shared-kernel-schema-conformance.test.mjs',
  'test-kits/handoff-conformance.test.mjs',
  'test-kits/integrity-manifest-rebuild.test.mjs',
  'test-kits/protocol-schema-conformance.test.mjs',
  'test-kits/repository-json.test.mjs',
  'test-kits/role-separation.test.mjs',
  'test-kits/secret-scan.test.mjs',
  'test-kits/test-coverage-floor.test.mjs',
  'test-kits/toolchain-contract.test.mjs',
  'test-kits/verification-record.test.mjs',
  'test-kits/work-package-discovery.test.mjs',
  'test-kits/work-package-ownership.test.mjs',
  'work-packages/WP-0A-CON-008.json',
  // E4 (open_blockers[9]): the modules digested tests import. Before this increment none was
  // digested, and one line in test-kits/db/ws905-fixture.mjs ran outside code under a green check.
  'db/foundation/test-helpers/rls-assertions.mjs',
  'scripts/db/audit-producer-rule.mjs',
  'scripts/db/authz-proofs.mjs',
  'scripts/db/explain-harness.mjs',
  'scripts/db/generate-pinned-grants.mjs',
  'scripts/db/psql-driver.mjs',
  'scripts/db/rls-smoke.mjs',
  'scripts/db/run.mjs',
  'scripts/db/sql-lexer.mjs',
  'scripts/db/try-it.mjs',
  'test-kits/db/ws905-fixture.mjs',
  'tests/db/identity/isolation-cases.mjs',
  'tests/db/identity/run-isolation.mjs',
];

// A file that has ever been digested stays digested. See DIGESTED_FLOOR above for why.
export async function assertDigestedSetNeverShrinks(manifestPath = INTEGRITY_MANIFEST, floor = DIGESTED_FLOOR) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const present = new Set(Object.keys(manifest.files ?? {}));
  const removed = floor.filter((key) => !present.has(key));
  if (removed.length > 0) {
    throw new CoverageFloorError(87, `${removed.length} file(s) were removed from ${manifestPath}: ${removed.join(', ')}. `
      + 'Protection is a ratchet: a file that has been digested stays digested, or a guard can be gutted by deleting its line.');
  }
  // And the floor maintains itself. Independent review sixteen computed the difference and found
  // exactly one digested file missing from this list -- `protocol-schema-conformance.test.mjs`,
  // the suite added two waves earlier to turn `.agents/*.schema.json` into controls. Deleting it
  // (with record:verification and regenerate:manifest, in that order) exited **0 at 222/222**,
  // and review fifteen's own MEDIUM 7 mutation then passed again.
  //
  // A hand-maintained ratchet drifts the moment someone adds a file and forgets the line. A file
  // that is digested must join the deletion ratchet in the same commit.
  const listed = new Set(floor);
  const unratcheted = [...present].filter((key) => !listed.has(key)).sort();
  if (unratcheted.length > 0) {
    throw new CoverageFloorError(87, `${unratcheted.length} digested file(s) are not in DIGESTED_FLOOR: ${unratcheted.join(', ')}. `
      + 'A file that is protected must also be undeletable; add it to the floor in the same commit.');
  }
  const duplicated = floor.filter((key, index) => floor.indexOf(key) !== index);
  if (duplicated.length > 0) {
    throw new CoverageFloorError(87, `DIGESTED_FLOOR lists ${duplicated.join(', ')} more than once; the list is hand-maintained and a duplicate is how it starts drifting.`);
  }
}

// See DECLARED_TEST_FLOOR_BY_FILE for why a per-directory floor was not enough.
export async function assertPerFileFloors(files, floors = DECLARED_TEST_FLOOR_BY_FILE) {
  const short = [];
  for (const [file, floor] of Object.entries(floors)) {
    if (!files.includes(file)) { short.push(`${file} is gone; it declared ${floor} test(s)`); continue; }
    const raw = await readFile(file, 'utf8');
    const source = stripNonCode(raw);
    const declared = countDeclaredTests(source);
    if (declared < floor) short.push(`${file} declares ${declared} test(s), floor ${floor}`);
    // The assertion floor, which hollowing cannot preserve: a placeholder makes one trivial
    // assertion where the real test made many.
    // The test NAMES, which hollowing cannot preserve: `placeholder 1..10` is not what the suite
    // was called before.
    // Read from the RAW file: `stripNonCode` removes string literals, which is exactly where a
    // test's name lives. The first version digested an empty list for every file and reported all
    // twenty-four as renamed -- a guard reporting a wrong reason, caught by running it.
    const names = [...new Set([...raw.matchAll(/^test\(\s*[`'"](.+?)[`'"]\s*,/gm)].map((m) => m[1]))].sort();
    const nameDigest = createHash('sha256').update(names.join('\n')).digest('hex').slice(0, 16);
    const expectedNames = TEST_NAME_DIGEST_BY_FILE[file];
    if (expectedNames !== undefined && nameDigest !== expectedNames) {
      short.push(`${file} renamed, added or removed tests — name digest ${expectedNames} became ${nameDigest}`);
    }
    const assertions = (source.match(/\bassert\.\w+\(/g) ?? []).length;
    const assertionFloor = DECLARED_ASSERTION_FLOOR_BY_FILE[file];
    if (assertionFloor !== undefined && assertions < assertionFloor) {
      short.push(`${file} makes ${assertions} assertion(s), floor ${assertionFloor}`);
    }
  }
  const unfloored = files.filter((file) => floors[file] === undefined
    || DECLARED_ASSERTION_FLOOR_BY_FILE[file] === undefined
    || TEST_NAME_DIGEST_BY_FILE[file] === undefined);
  for (const file of unfloored) short.push(`${file} has no declared-test floor; add one in the same commit`);
  if (short.length > 0) {
    throw new CoverageFloorError(84, `suite(s) below their own declared floor:\n  ${short.join('\n  ')}\n`
      + 'A suite that has declared N tests keeps declaring N, or a protected file can be swapped for a placeholder.');
  }
}

export async function assertEveryTestFileProtected(files, manifestPath = INTEGRITY_MANIFEST) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const protectedFiles = new Set(Object.keys(manifest.files ?? {}));
  const unprotected = files.filter((file) => !protectedFiles.has(file));
  if (unprotected.length > 0) {
    throw new CoverageFloorError(87, `discovered test file(s) are not digested in ${manifestPath}: ${unprotected.join(', ')}. An unprotected suite can be gutted with the manifest byte-identical.`);
  }
}

// npm decides which shell runs a script, and that decision lives in a file no guard read.
// Independent review seventeen wrote one line -- `script-shell=/usr/bin/true` -- into `.npmrc`:
// every `npm run` became a no-op, `npm run check` exited 0 having executed nothing, and
// `npm run verify` exited 0 printing `clean`, because IT runs through npm too.
//
// So this check lives HERE, in the guard CI invokes with `node` directly, which is the only thing
// in the repository a redirected script-shell cannot silence. That is the same reason RFC-2026-007
// gives for the workflow invoking this script rather than trusting the chain.
// `.gitattributes` is here for the same reason as `.npmrc`: it changes what tooling sees without
// changing a byte any guard reads. A `filter=` attribute routes file content through a program on
// checkout and check-in, so the bytes in the working tree need not be the bytes in the object
// store. The filter's definition lives in `.git/config` and is not committed -- which makes the
// attribute file harmless on its own and exactly the kind of thing that is harmless until it is
// not. Declare it and digest it if this repository ever needs one.
const PACKAGE_MANAGER_CONFIG = ['.npmrc', 'npmrc', '.yarnrc', '.yarnrc.yml', '.pnpmfile.cjs',
  'pnpm-workspace.yaml', '.gitattributes'];

// Every digested path must be a REGULAR FILE. `readFile` follows a symlink, so replacing a guard
// with a link to a file outside the repository keeps the digest matching -- the bytes are simply
// read from somewhere nothing here protects. Probed on `scripts/verify-branch-scope.mjs` pointed
// at `/tmp/elsewhere/x.mjs`: exit 0, everything green.
//
// What a symlink buys is not a byte change; it is a change of WHERE THE BYTES COME FROM. On
// another machine, in CI, or after a clone, that path holds something else or nothing at all --
// and the digest that vouched for the file vouched for a target no one can see from here.
export async function assertDigestedFilesAreRegular(manifestPath = INTEGRITY_MANIFEST) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const wrong = [];
  // EVERY PATH COMPONENT, not the leaf. Independent review eighteen ran
  // `git mv scripts tools && ln -s tools scripts`: every digested `scripts/*.mjs` leaf is still a
  // regular file, reached through a symlinked parent, so a leaf-only check saw nothing -- while
  // `resolve()` (which normalises but does not follow links) stopped matching `import.meta.url`
  // (which is the realpath), and `main()` in ten guards never ran. Every one of them exited 0
  // having done nothing.
  const seen = new Set();
  for (const key of Object.keys(manifest.files ?? {})) {
    const parts = key.split('/');
    for (let depth = 1; depth <= parts.length; depth += 1) {
      const path = parts.slice(0, depth).join('/');
      if (seen.has(path)) continue;
      seen.add(path);
      try {
        const stats = await lstat(path);
        if (stats.isSymbolicLink()) wrong.push(`${path} is a symbolic link`);
        else if (depth === parts.length && !stats.isFile()) wrong.push(`${path} is not a regular file`);
        else if (depth < parts.length && !stats.isDirectory()) wrong.push(`${path} is not a directory`);
      } catch (error) {
        wrong.push(`${path} cannot be inspected: ${error.code ?? error.message}`);
      }
    }
  }
  if (wrong.length > 0) {
    throw new CoverageFloorError(91, `digested path(s) that are not regular files:\n  ${wrong.join('\n  ')}\n`
      + 'A digest over a symlink vouches for a target outside this repository.');
  }
}

export async function assertNoPackageManagerConfig(directory = '.') {
  // Case-insensitively and Unicode-normalised. Independent review eighteen wrote `.NPMRC` on
  // macOS's case-insensitive filesystem: `npm config get script-shell` returned `/usr/bin/true`,
  // `npm run check` exited 0 with zero guards run, and `npm run verify` exited 0 with no output
  // at all -- while this check compared `'.NPMRC'` to `'.npmrc'` with `Array.includes` and found
  // nothing. The guard asserts the absence of a CLASS; comparing one spelling of it is not that.
  //
  // On a case-sensitive CI filesystem npm would not read `.NPMRC` -- so this is a local-evidence
  // bypass. Local evidence is what every handoff in this package records.
  const normalise = (name) => name.normalize('NFC').toLowerCase();
  const forbidden = PACKAGE_MANAGER_CONFIG.map(normalise);
  const present = (await readdir(directory)).filter((name) => forbidden.includes(normalise(name)));
  if (present.length > 0) {
    throw new CoverageFloorError(90, `package-manager configuration file(s) present: ${present.join(', ')}. `
      + 'One line in such a file redirects or silences every npm run in this repository, including the verifier. '
      + 'If one is ever needed, digest it and add it to DIGESTED_FLOOR in the same commit.');
  }
}

// E4 (open_blockers[9]). The guard pinned every discovered test file and never looked at what
// those files import. Three measured routes ran code from outside the repository during a green
// `npm run check`: (a) one import line added to test-kits/db/ws905-fixture.mjs, a module a
// digested suite imports but the manifest did not name -- guard exit 0, manifest unchanged, 23
// marker files written outside the clone; (b) an escaping import (through a symlink, or a plain
// `../../..` path) added to an EXISTING digested suite with its digest regenerated -- guard 0;
// (c) a NEW test file doing the same, which only needed the contract and manifest edited.
//
// The closure is therefore walked, statically, from every test file. Every module it reaches
// must be:
//   - a `node:` builtin (the repository declares no dependency, so there is no other bare
//     specifier it may name), or a `./` / `../` specifier with no `%`, `?`, `#` or `\` -- an ESM
//     specifier is a URL, and `%2e%2e/` IS `../` to the loader while it is not to a string check;
//   - lexically inside the repository, reached through no symbolic link at any path component,
//     and a regular file whose real path is inside the repository root;
//   - digested in the integrity manifest, so editing it is an edit to a protected file.
// A dynamic `import()` whose argument is not one string literal, and any `require` or
// `createRequire`, is refused outright: a computed specifier is a module the walk cannot name.
//
// Both halves are needed. Containment alone leaves an undigested fixture free to be gutted;
// digesting alone leaves route (b), which edits a digest anyway. Together, reaching outside
// code needs an import the walk can see, and the walk refuses every one that escapes.
//
// What this does NOT cover, stated so nobody cites it for more: code a test runs by spawning a
// process (`spawnSync(process.execPath, [...])`), files a test reads as data (SQL, JSON via
// readFile), and an import the scanner fails to see because `stripNonCode` misreads the text
// around it (open_blockers[11]). The last needs a digested file edited -- every module in the
// closure is now digested -- so it sits inside the disclosed digest class, not outside it.
export const ALLOWED_DEPENDENCIES = [];

const IMPORT_SPECIFIER = /^\.\.?\//;

function findStringLiteral(raw, stripped, from) {
  // The specifier is the first string literal after the keyword: a position where the raw text
  // holds a quote and the stripped text holds blank, i.e. the scanner classified it as a string.
  for (let i = from; i < raw.length; i += 1) {
    if (stripped[i] !== ' ' && stripped[i] !== '\n') {
      // Code between the keyword and the literal is fine (`{ a, b } from`), but a statement end
      // before any literal means there was none.
      if (stripped[i] === ';') return null;
      continue;
    }
    const quote = raw[i];
    if (quote === "'" || quote === '"') {
      let j = i + 1;
      while (j < raw.length && raw[j] !== quote && raw[j] !== '\n') {
        if (raw[j] === '\\') return { start: i, value: null };
        j += 1;
      }
      return { start: i, end: j + 1, value: raw.slice(i + 1, j) };
    }
    if (quote === '`') return { start: i, value: null };
  }
  return null;
}

// Every import, re-export and dynamic import in one module, with the statement text of each so
// the caller can see HOW `node:test` was bound. Found on the STRIPPED text, so a keyword inside a
// string or comment is never mistaken for one; the specifier is then read from the RAW text at
// the same offset, which works because stripNonCode preserves every offset.
export function extractImports(raw) {
  const stripped = stripNonCode(raw);
  const found = [];
  const refusals = [];
  for (const match of stripped.matchAll(/(?<![\w$.])(import|export|require|createRequire)(?![\w$])/g)) {
    const keyword = match[1];
    const at = match.index;
    if (keyword === 'require' || keyword === 'createRequire') {
      refusals.push(`\`${keyword}\` at offset ${at}: CommonJS loading is outside the static import walk`);
      continue;
    }
    let k = at + keyword.length;
    while (k < stripped.length && /\s/.test(stripped[k])) k += 1;
    const next = stripped[k] ?? '';
    if (keyword === 'import' && next === '.') continue; // import.meta
    if (keyword === 'import' && next === '(') {
      const literal = findStringLiteral(raw, stripped, k + 1);
      let after = literal?.end ?? -1;
      while (after > 0 && after < raw.length && /\s/.test(raw[after])) after += 1;
      const onlyArgument = literal && literal.value !== null
        && stripped.slice(k + 1, literal.start).trim() === '' && (raw[after] === ')' || raw[after] === ',');
      if (!onlyArgument) {
        refusals.push(`dynamic import() at offset ${at} whose argument is not one string literal`);
        continue;
      }
      found.push({ specifier: literal.value, statement: raw.slice(at, after + 1), dynamic: true });
      continue;
    }
    if (keyword === 'export') {
      // Only a re-export loads a module: `export * from`, `export { a } from`.
      if (next !== '*' && next !== '{') continue;
      let end = k;
      if (next === '{') {
        end = stripped.indexOf('}', k);
        if (end === -1) continue;
      }
      const rest = stripped.slice(end + 1, end + 200).match(/^\s*(?:as\s+[\w$]+\s*)?from(?![\w$])/);
      if (next === '{' && !rest) continue;
    }
    // From the keyword, not from `k`: `k` skipped stripped whitespace, and a string literal IS
    // stripped whitespace, so `import './x.mjs';` would have skipped straight past its specifier.
    const literal = findStringLiteral(raw, stripped, at + keyword.length);
    if (!literal || literal.value === null) {
      refusals.push(`\`${keyword}\` at offset ${at} has no plain string-literal specifier`);
      continue;
    }
    found.push({ specifier: literal.value, statement: raw.slice(at, literal.end).replace(/\s+/g, ' '), dynamic: false });
  }
  return { imports: found, refusals, stripped };
}

// Q0-C1 / Q0-N2. `import realTest from 'node:test'; const test = () => {};` keeps every lexical
// `test(` line, name and assertion -- so the per-file floor, the name digest and the assertion
// floor all hold -- while no original test runs. In a test file `test` is bound exactly once, by
// `import test from 'node:test';`, and in code every other occurrence of the identifier is a
// call (`test(`) or a member (`t.test`, `test.only`). Anything else rebinds or passes it on.
export function assertTestBindingIntact(file, raw, imports, strippedSource = undefined) {
  const problems = [];
  const fromNodeTest = imports.filter(({ specifier }) => specifier === 'node:test');
  if (fromNodeTest.length !== 1 || fromNodeTest[0].statement !== "import test from 'node:test'") {
    problems.push(`binds node:test as ${fromNodeTest.map(({ statement }) => JSON.stringify(statement)).join(', ') || 'nothing'}; exactly \`import test from 'node:test';\` is allowed`);
  }
  const stripped = strippedSource ?? stripNonCode(raw);
  const importAt = stripped.search(/(?<![\w$.])import\s+test\s+from(?![\w$])/);
  const importedAt = importAt === -1 ? -1 : stripped.indexOf('test', importAt + 6);
  for (const match of stripped.matchAll(/(?<![\w$.])test(?![\w$])/g)) {
    if (match.index === importedAt) continue;
    // Bounded scans, not slices: a whole-file `slice().replace(/\s+$/)` per occurrence made this
    // quadratic on the 600KB isolation suites.
    let b = match.index - 1;
    while (b >= 0 && /\s/.test(stripped[b])) b -= 1;
    let wordStart = b;
    while (wordStart >= 0 && /[\w$]/.test(stripped[wordStart])) wordStart -= 1;
    const previousWord = stripped.slice(wordStart + 1, b + 1);
    const previousChar = stripped[b] ?? '';
    let a = match.index + 4;
    while (a < stripped.length && /\s/.test(stripped[a])) a += 1;
    const next = stripped[a] ?? '';
    const isCall = next === '(' || (next === '.' && stripped[a + 1] !== '.');
    // An object key (`{ test: fn }`) names a property; it binds nothing.
    const isKey = next === ':' && (previousChar === '{' || previousChar === ',');
    if ((!isCall && !isKey) || ['function', 'class', 'const', 'let', 'var', 'new'].includes(previousWord)) {
      const line = raw.slice(0, match.index).split('\n').length;
      problems.push(`line ${line} uses \`test\` as something other than a call to the node:test import`);
    }
  }
  if (problems.length > 0) {
    throw new CoverageFloorError(93, `${file}: the \`test\` binding is not the runner's:\n  ${problems.join('\n  ')}\n`
      + 'A shadowed or aliased `test` keeps every counted declaration, name and assertion while running none of them.');
  }
}

export async function assertImportClosureContained(files, manifestPath = INTEGRITY_MANIFEST, root = process.cwd()) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const digested = new Set(Object.keys(manifest.files ?? {}));
  const realRoot = await realpath(root);
  const problems = [];
  const visited = new Set();
  const queue = files.map((file) => posix.normalize(file.split('\\').join('/')));
  const roots = new Set(queue);
  const { isBuiltin } = await import('node:module');
  while (queue.length > 0) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    if (!file.endsWith('.mjs') && !file.endsWith('.js')) continue; // a JSON import is a leaf
    let raw;
    try {
      raw = await readFile(join(root, file), 'utf8');
    } catch (error) {
      problems.push(`${file} cannot be read: ${error.code ?? error.message}`);
      continue;
    }
    const { imports, refusals, stripped } = extractImports(raw);
    for (const refusal of refusals) problems.push(`${file}: ${refusal}`);
    if (roots.has(file)) {
      try {
        assertTestBindingIntact(file, raw, imports, stripped);
      } catch (error) {
        if (!(error instanceof CoverageFloorError)) throw error;
        problems.push(error.message);
      }
    }
    for (const { specifier } of imports) {
      if (specifier.startsWith('node:')) {
        if (!isBuiltin(specifier)) problems.push(`${file} imports '${specifier}', which is not a node builtin`);
        continue;
      }
      if (!IMPORT_SPECIFIER.test(specifier)) {
        if (!ALLOWED_DEPENDENCIES.includes(specifier)) {
          problems.push(`${file} imports '${specifier}': only node: builtins and ./ or ../ paths are allowed, and the repository declares no dependency`);
        }
        continue;
      }
      if (/[%?#\\]/.test(specifier)) {
        problems.push(`${file} imports '${specifier}': a specifier is a URL, and %, ?, # or \\ makes what loads differ from what this walk reads`);
        continue;
      }
      const target = posix.normalize(posix.join(posix.dirname(file), specifier));
      if (!isRepositoryRelativePath(target)) {
        problems.push(`${file} imports '${specifier}', which resolves outside the repository`);
        continue;
      }
      const parts = target.split('/');
      let contained = true;
      for (let depth = 1; depth <= parts.length && contained; depth += 1) {
        const path = parts.slice(0, depth).join('/');
        try {
          const stats = await lstat(join(root, path));
          if (stats.isSymbolicLink()) { problems.push(`${file} imports '${specifier}' through the symbolic link ${path}`); contained = false; }
          else if (depth === parts.length && !stats.isFile()) { problems.push(`${file} imports '${specifier}', and ${path} is not a regular file`); contained = false; }
        } catch (error) {
          problems.push(`${file} imports '${specifier}', and ${path} cannot be inspected: ${error.code ?? error.message}`);
          contained = false;
        }
      }
      if (!contained) continue;
      const actual = await realpath(join(root, target));
      if (!actual.startsWith(`${realRoot}/`)) {
        problems.push(`${file} imports '${specifier}', whose real path ${actual} is outside the repository`);
        continue;
      }
      if (!digested.has(target)) {
        problems.push(`${file} imports ${target}, which is not digested in ${manifestPath}`);
      }
      queue.push(target);
    }
  }
  if (problems.length > 0) {
    throw new CoverageFloorError(92, `the import closure of the test files is not contained:\n  ${[...new Set(problems)].join('\n  ')}\n`
      + 'Every module a test reaches must be a node: builtin or a digested regular file inside this repository, '
      + 'or code nobody inspected runs during a green check (E4, open_blockers[9]).');
  }
  return visited.size;
}

export async function verifyTestCoverageFloor(packageJsonPath = 'package.json', testDirectory = TEST_ROOT, floor = DEFAULT_FLOOR) {
  await assertNoPackageManagerConfig();
  await assertDigestedFilesAreRegular();
  const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const pattern = assertPackageScripts(manifest.scripts);
  await assertIntegrityManifest();
  let files;
  try {
    files = (await Promise.all(TEST_ROOTS.map((r) => discoverTestFiles(r).catch(() => [])))).flat().sort();
  } catch (error) {
    if (error instanceof CoverageFloorError) throw error;
    // A missing or relocated test root must fail as this guard's own error, not as an
    // unhandled ENOENT whose non-numeric `code` bypasses the numeric exit path below.
    throw new CoverageFloorError(79, `cannot read the test root '${testDirectory}': ${error.message}. A relocated or deleted test root must fail the run, not silently execute nothing.`);
  }
  assertCoverage(pattern, files, floor);
  await assertEveryTestFileProtected(files);
  await assertDigestedSetNeverShrinks();
  await assertPerFileFloors(files);
  await assertNoEscapingPath(files);
  await assertImportClosureContained(files);
  const declared = await assertDeclaredTests(files);
  return { pattern, files, declared };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    await verifyTestCoverageFloor();
  } catch (error) {
    console.error(error.message);
    process.exit(Number.isInteger(error.code) ? error.code : 65);
  }
}

// The manifest's key set was self-selecting. Independent review deleted seven entries -- the
// branch-scope guard, all four protocol schemas, the catalog index and the secret scanner --
// gutted the guard's whole enforcement path, and the check still exited 0. The floor asked for
// seven named keys and a length, and a length is satisfied by whatever remains.
//
// These are the files whose ABSENCE from the manifest is itself the defect: a guard, a schema
// that decides what a package may claim, or a registry a gate decision rests on. Removing one
// from this list is a deliberate act in a diff a reviewer reads, which is the only anchor a
// tripwire can have.
export const PROTECTED_KEYS = [
  'package.json',
  '.github/workflows/ci.yml',
  '.node-version',
  'scripts/verify-test-coverage-floor.mjs',
  'scripts/run-test-suite.mjs',
  'scripts/test-suite-contract.mjs',
  'scripts/scan-repository-secrets.mjs',
  'scripts/verify-branch-scope.mjs',
  'scripts/verify-branch-identity.mjs',
  'scripts/verify-disposition-branch.mjs',
  'scripts/refresh-author-handoff.mjs',
  'scripts/verify-clean-run.mjs',
  'scripts/commit-when-clean.mjs',
  'scripts/record-verification.mjs',
  'scripts/regenerate-integrity-manifest.mjs',
  'contract-catalog/shared-kernel/index.json',
  'CONTRIBUTING_AGENTS.md',
  'docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md',
  '.agents/handoff.schema.json',
  '.agents/work-package.schema.json',
  '.agents/capabilities.schema.json',
  '.agents/status.schema.json',
];
