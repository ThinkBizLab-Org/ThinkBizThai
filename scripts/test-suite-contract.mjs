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

// Counting cannot distinguish six real tests from six trivial ones. An earlier attempt
// pinned required test NAMES and checked them against the runner's output; independent
// testing defeated it twice -- a bodyless `test('<required name>');` is counted as a pass,
// and a bare `console.log` of the ten names satisfied the check with no test named any of
// them. Anything the running tests can emit, the running tests can forge.
//
// So the pin moved off the runtime stream and onto a static property the tests cannot
// influence: the CONTENT of the files themselves, recorded in test-kits/integrity-manifest.json.
// Gutting a protected suite changes its digest and fails the run.
//
// THIS IS A TRIPWIRE, NOT A SECURITY BOUNDARY, AND IT HAS NO SELF-ANCHOR.
// A commit that edits a protected file and its digest together passes. That cannot be
// fixed from inside a repository where one commit can change everything: every control
// built here lives in the same trust domain as the thing it guards. The real anchor is
// outside -- human review of the diff (RFC-2026-002) and protected CI, which is still an
// open Gate G0 requirement. The manifest's value is that tampering must appear as a
// deliberate, reviewable line in a diff instead of a silent behaviour change.
export const INTEGRITY_MANIFEST = 'test-kits/integrity-manifest.json';
