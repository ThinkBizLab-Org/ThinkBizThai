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
  'test-kits': 32,
  'test-kits/contracts': 7,
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

// Independent review seventeen replaced eight of the nine contract suites with one-test
// placeholders, keeping only shared-kernel-contract-catalog.test.mjs, then reversed three real
// rules: CTR-SEC-001's handle pattern to `^.*$`, its six redaction consts from true to false, and
// CTR-API-001's root additionalProperties to true. **exit 0, 167/167, no failing test.**
//
// The per-DIRECTORY floor was 7 against 78 declared tests -- ninety per cent headroom in the one
// floor written specifically to stop a protected suite being swapped for a placeholder. Ten Draft
// contracts, including the envelope every module composes and the secret-handle contract, lost
// every ratchet at once: the constraint surface, the registry, the caveats, the mutation walk.
// DIGESTED_FLOOR does not help -- it ratchets WHICH files are digested, and every gutted file
// stayed digested.
//
// A floor per file, at what each suite declares today. Adding tests is free; a file that has ever
// declared N must keep declaring N, or the number is edited deliberately, in a diff a reviewer
// reads.
export const DECLARED_TEST_FLOOR_BY_FILE = {
  'test-kits/branch-identity.test.mjs': 8,
  'test-kits/branch-scope.test.mjs': 7,
  'test-kits/capability-profile.test.mjs': 4,
  'test-kits/ci-guard-behaviour.test.mjs': 14,
  'test-kits/contracts/catalog-groups.test.mjs': 7,
  'test-kits/contracts/catalog-reference-integrity.test.mjs': 6,
  'test-kits/contracts/catalog-registry.test.mjs': 14,
  'test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs': 8,
  'test-kits/contracts/ctr-job-001-reference-hardening.test.mjs': 6,
  'test-kits/contracts/schema-mutation-coverage.test.mjs': 10,
  'test-kits/contracts/shared-kernel-contract-catalog.test.mjs': 6,
  'test-kits/contracts/shared-kernel-envelope-contracts.test.mjs': 15,
  'test-kits/contracts/shared-kernel-schema-conformance.test.mjs': 6,
  'test-kits/handoff-conformance.test.mjs': 10,
  'test-kits/integrity-manifest-rebuild.test.mjs': 3,
  'test-kits/protocol-schema-conformance.test.mjs': 4,
  'test-kits/repository-json.test.mjs': 4,
  'test-kits/role-separation.test.mjs': 8,
  'test-kits/secret-scan.test.mjs': 45,
  'test-kits/test-coverage-floor.test.mjs': 31,
  'test-kits/toolchain-contract.test.mjs': 3,
  'test-kits/verification-record.test.mjs': 4,
  'test-kits/work-package-discovery.test.mjs': 1,
  'test-kits/work-package-ownership.test.mjs': 8,
};

// Independent review eighteen answered the question the per-file floor was written to close, and
// the answer was yes. The floor pins the `test()` COUNT, so a suite can be rewritten as N
// placeholders -- `test('placeholder 1', () => { assert.ok(true); })` ten times -- and the count
// is unchanged. It then added `ctr-api-001 properties.data.maxProperties = 3`, so a success
// envelope carrying four fields is rejected by the contract every module composes, and got
// **exit 0, 233/233**, with `record:verification` not even needed because nothing moved.
//
// Hollowing preserves the count. It cannot preserve the ASSERTIONS: a placeholder makes one
// trivial assertion where the real test made many. This is the same ratchet shape one level down,
// and it needs no new machinery.
export const DECLARED_ASSERTION_FLOOR_BY_FILE = {
  'test-kits/branch-identity.test.mjs': 15,
  'test-kits/branch-scope.test.mjs': 37,
  'test-kits/capability-profile.test.mjs': 4,
  'test-kits/ci-guard-behaviour.test.mjs': 27,
  'test-kits/contracts/catalog-groups.test.mjs': 9,
  'test-kits/contracts/catalog-reference-integrity.test.mjs': 6,
  'test-kits/contracts/catalog-registry.test.mjs': 16,
  'test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs': 11,
  'test-kits/contracts/ctr-job-001-reference-hardening.test.mjs': 25,
  'test-kits/contracts/schema-mutation-coverage.test.mjs': 15,
  'test-kits/contracts/shared-kernel-contract-catalog.test.mjs': 25,
  'test-kits/contracts/shared-kernel-envelope-contracts.test.mjs': 48,
  'test-kits/contracts/shared-kernel-schema-conformance.test.mjs': 11,
  'test-kits/handoff-conformance.test.mjs': 19,
  'test-kits/integrity-manifest-rebuild.test.mjs': 10,
  'test-kits/protocol-schema-conformance.test.mjs': 6,
  'test-kits/repository-json.test.mjs': 14,
  'test-kits/role-separation.test.mjs': 8,
  'test-kits/secret-scan.test.mjs': 86,
  'test-kits/test-coverage-floor.test.mjs': 89,
  'test-kits/toolchain-contract.test.mjs': 3,
  'test-kits/verification-record.test.mjs': 14,
  'test-kits/work-package-discovery.test.mjs': 2,
  'test-kits/work-package-ownership.test.mjs': 8,
};
