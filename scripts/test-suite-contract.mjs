// Single source of truth for what the repository's test suite must execute.
// The pattern is handed to node's test runner as an argv string and never reaches a
// shell, so shell quoting, `globstar` support, and `script-shell` cannot change what runs.
export const TEST_PATTERN = 'test-kits/**/*.test.mjs';
export const TEST_ROOT = 'test-kits';
export const MIN_TEST_FILES = 8;
export const MIN_TEST_DIRECTORIES = 2;
export const MIN_DECLARED_TESTS = 30;
// A single global aggregate lets any one suite be replaced by a placeholder while the
// total still clears the floor. Independent integration verification did exactly that to
// the contract suite -- the suite this repository's guards exist to protect -- and every
// check stayed green. Floors are therefore per directory as well as global.
export const MIN_DECLARED_TESTS_BY_DIRECTORY = {
  'test-kits': 30,
  'test-kits/contracts': 6,
};
// A green run must never mean "executed nothing". node --test exits 0 reporting `tests 0`
// when its pattern matches nothing, so the count is asserted after the run -- and it is
// asserted on `pass`, because `ℹ tests N` counts skipped and todo tests too.
export const MIN_EXECUTED_TESTS = 40;
export const RUNNER_SCRIPT = 'node scripts/run-test-suite.mjs';
export const GUARD_SCRIPT = 'node scripts/verify-test-coverage-floor.mjs';

// Counting cannot distinguish six real tests from six trivial ones -- independent testing
// replaced the whole contract suite with `test("x", () => {})` padding and every count-based
// floor stayed green. So the floor stops asking "how many" and asks "is the thing that must
// be checked still being checked": these test names must appear in the runner's own output.
// Renaming one is a deliberate, reviewable edit to this list; deleting the suite is not.
export const REQUIRED_TEST_NAMES = [
  'shared-kernel catalog preserves baseline IDs, versions, and freeze levels',
  'Candidate fixture validator accepts valid fixtures and rejects every declared negative fixture',
  'Candidate safety constraints reject unsafe detail, payload, and public job references',
  'negative fixtures demonstrate required tenant and job isolation metadata',
  'rejects a Ready manifest with duplicate named role IDs',
  'rejects a writable path that captures another package output',
  'rejects a synthetic private-key pattern',
  'any wrapper that could neutralise the runner is rejected',
  'a check script that drops the runner or the guard is rejected',
  'a run that executed nothing is rejected even when the runner exits zero',
];

// Mitigation, NOT closure. The guard pins the command string; nothing pins the behaviour of
// the file that command runs. Independent review gutted main() to `return`, kept the
// exports, and npm run check exited 0 having executed nothing. That cannot be eliminated
// from inside a script the same commit can edit. What it can do is make the edit loud: a
// change to a guarded script fails the run until its digest here is deliberately updated,
// which is a reviewable diff rather than a silent one.
export const GUARDED_SCRIPT_DIGESTS = {
  'scripts/run-test-suite.mjs': 'f22dd71e84baa540868908ecd01e98fb39d8744495d69f35691789e011620d93',
  'scripts/verify-test-coverage-floor.mjs': '523eb5867dde40d12fd530d7a983daa5e2c620288a8ee502225ca8b9cc5c7d84',
};
