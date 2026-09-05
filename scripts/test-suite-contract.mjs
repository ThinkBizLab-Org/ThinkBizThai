// Single source of truth for what the repository's test suite must execute.
// The pattern is handed to node's test runner as an argv string and never reaches a
// shell, so shell quoting, `globstar` support, and `script-shell` cannot change what runs.
// Two roots, not one. `test-kits/` holds the protocol and foundation suites; `tests/db/<module>/`
// is where the data package's §6 ownership contract puts a module's own tests, and A1's batch-010
// isolation suite landed there correctly rather than reaching into DB-00's directory.
//
// It was invisible to the runner. Fourteen tests existed, were green when run by hand, and `npm run
// check` did not execute one of them — which is the same thing as their not existing. A suite the
// runner cannot see is not a suite; it is a file that happens to contain assertions.
//
// Both roots are globbed, and both carry the same floors, digests and registry obligations. A
// module cannot escape the ratchets by living in its own directory.
export const TEST_PATTERN = ['test-kits/**/*.test.mjs', 'tests/**/*.test.mjs'];
export const TEST_ROOT = 'test-kits';
export const TEST_ROOTS = ['test-kits', 'tests'];
export const MIN_TEST_FILES = 8;
export const MIN_TEST_DIRECTORIES = 2;
export const MIN_DECLARED_TESTS = 30;
// A single global aggregate lets any one suite be replaced by a placeholder while the
// total still clears the floor. Independent integration verification did exactly that to
// the contract suite -- the suite this repository's guards exist to protect -- and every
// check stayed green. Floors are therefore per directory as well as global.
export const MIN_DECLARED_TESTS_BY_DIRECTORY = {
  'test-kits': 33,
  'test-kits/contracts': 7,
  'tests/db/identity': 14,
  'test-kits/db': 29,
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
  'test-kits/branch-scope.test.mjs': 10,
  'test-kits/capability-profile.test.mjs': 4,
  'test-kits/ci-guard-behaviour.test.mjs': 17,
  'test-kits/contracts/catalog-groups.test.mjs': 7,
  'test-kits/contracts/catalog-reference-integrity.test.mjs': 6,
  'test-kits/contracts/catalog-registry.test.mjs': 15,
  'test-kits/db/foundation-contract.test.mjs': 16,
  'test-kits/db/rls-assertions.test.mjs': 15,
  'tests/db/identity/identity-isolation.test.mjs': 14,
  'test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs': 8,
  'test-kits/contracts/ctr-job-001-reference-hardening.test.mjs': 6,
  'test-kits/contracts/schema-mutation-coverage.test.mjs': 10,
  'test-kits/contracts/shared-kernel-contract-catalog.test.mjs': 6,
  'test-kits/contracts/shared-kernel-envelope-contracts.test.mjs': 15,
  'test-kits/contracts/shared-kernel-schema-conformance.test.mjs': 6,
  'test-kits/handoff-conformance.test.mjs': 15,
  'test-kits/integrity-manifest-rebuild.test.mjs': 3,
  'test-kits/protocol-schema-conformance.test.mjs': 4,
  'test-kits/ratchets-bite.test.mjs': 17,
  'test-kits/repository-json.test.mjs': 7,
  'test-kits/role-separation.test.mjs': 8,
  'test-kits/secret-scan.test.mjs': 46,
  'test-kits/test-coverage-floor.test.mjs': 33,
  'test-kits/toolchain-contract.test.mjs': 3,
  'test-kits/verification-record.test.mjs': 4,
  'test-kits/work-package-discovery.test.mjs': 1,
  'test-kits/work-package-ownership.test.mjs': 8,
  'test-kits/authority-dispositions.test.mjs': 3,
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
// `ratchets-bite.test.mjs` reads 5 here and that is not a weakening: its assertions moved into
// the shared `mustNotice`/`assertFailed` helpers when it went from one reversal per suite to
// several. The number that matters for that file is REVERSAL_FLOOR below -- assertion counting is
// a proxy, and this is the one place in the repository where the proxy and the thing it proxies
// point in opposite directions.
export const DECLARED_ASSERTION_FLOOR_BY_FILE = {
  'test-kits/branch-identity.test.mjs': 15,
  'test-kits/branch-scope.test.mjs': 41,
  'test-kits/capability-profile.test.mjs': 4,
  'test-kits/ci-guard-behaviour.test.mjs': 33,
  'test-kits/contracts/catalog-groups.test.mjs': 9,
  'test-kits/contracts/catalog-reference-integrity.test.mjs': 6,
  'test-kits/contracts/catalog-registry.test.mjs': 19,
  'test-kits/db/foundation-contract.test.mjs': 66,
  'test-kits/db/rls-assertions.test.mjs': 62,
  'tests/db/identity/identity-isolation.test.mjs': 62,
  'test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs': 11,
  'test-kits/contracts/ctr-job-001-reference-hardening.test.mjs': 25,
  'test-kits/contracts/schema-mutation-coverage.test.mjs': 15,
  'test-kits/contracts/shared-kernel-contract-catalog.test.mjs': 25,
  'test-kits/contracts/shared-kernel-envelope-contracts.test.mjs': 50,
  'test-kits/contracts/shared-kernel-schema-conformance.test.mjs': 11,
  'test-kits/handoff-conformance.test.mjs': 36,
  'test-kits/integrity-manifest-rebuild.test.mjs': 10,
  'test-kits/protocol-schema-conformance.test.mjs': 6,
  'test-kits/ratchets-bite.test.mjs': 23,
  'test-kits/repository-json.test.mjs': 18,
  'test-kits/role-separation.test.mjs': 8,
  'test-kits/secret-scan.test.mjs': 88,
  'test-kits/test-coverage-floor.test.mjs': 95,
  'test-kits/toolchain-contract.test.mjs': 3,
  'test-kits/verification-record.test.mjs': 14,
  'test-kits/work-package-discovery.test.mjs': 2,
  'test-kits/work-package-ownership.test.mjs': 8,
  'test-kits/authority-dispositions.test.mjs': 8,
};

// Independent review eighteen defeated the test-count floor by hollowing a suite while preserving
// its count. I added an assertion-count floor; probing that immediately showed the obvious next
// step -- preserve BOTH. Ten placeholders making fifteen `assert.ok(true)` calls, plus
// `ctr-api-001 properties.data.maxProperties = 3`: **exit 0**, every floor satisfied.
//
// Counting anything can be satisfied by repeating anything. What hollowing cannot preserve is
// WHAT THE TESTS ARE CALLED: a suite's test names are a description of what it checks, and
// `placeholder 1..10` is not `every contract reaches the mutation-coverage floor`.
//
// This is a digest over the sorted distinct test names per file. Renaming a test is a deliberate
// edit here; deleting one and adding another is too. It is the same lesson as everywhere else in
// this repository -- a name cannot be paid for with a count -- arriving one level further down.
export const TEST_NAME_DIGEST_BY_FILE = {
  'test-kits/db/foundation-contract.test.mjs': '248e6605283dde53',
  'test-kits/db/rls-assertions.test.mjs': 'c239d834d0af07c5',
  'tests/db/identity/identity-isolation.test.mjs': 'ef28fd583f9655f2',
  'test-kits/branch-identity.test.mjs': '6df89e2083dc2641',
  'test-kits/branch-scope.test.mjs': '22516800c49b414b',
  'test-kits/capability-profile.test.mjs': 'd018e82c3f24965c',
  'test-kits/ci-guard-behaviour.test.mjs': 'cc42f80046d803e9',
  'test-kits/contracts/catalog-groups.test.mjs': '401597be61929abb',
  'test-kits/contracts/catalog-reference-integrity.test.mjs': '9753730c2bab68ba',
  'test-kits/contracts/catalog-registry.test.mjs': '795d5f06ff14da33',
  'test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs': 'd1304414d53dccd7',
  'test-kits/contracts/ctr-job-001-reference-hardening.test.mjs': '6675342a26c7bc01',
  'test-kits/contracts/schema-mutation-coverage.test.mjs': 'd84ed15beca0a546',
  'test-kits/contracts/shared-kernel-contract-catalog.test.mjs': 'bd0c948ddd7fa982',
  'test-kits/contracts/shared-kernel-envelope-contracts.test.mjs': 'b56843602dd83c11',
  'test-kits/contracts/shared-kernel-schema-conformance.test.mjs': '99724af4706e30ad',
  'test-kits/handoff-conformance.test.mjs': '8c5d4300c69b4f6e',
  'test-kits/integrity-manifest-rebuild.test.mjs': '91b24d70c4ac8fcb',
  'test-kits/protocol-schema-conformance.test.mjs': 'dc9a77399529cead',
  'test-kits/ratchets-bite.test.mjs': 'faba9df4b8a2c00e',
  'test-kits/repository-json.test.mjs': '7e14edf206ed7b3b',
  'test-kits/role-separation.test.mjs': '00a4c859fecdbbae',
  'test-kits/secret-scan.test.mjs': 'dc3d730ee7d4d461',
  'test-kits/test-coverage-floor.test.mjs': 'ad676cb55e0fa018',
  'test-kits/toolchain-contract.test.mjs': '593ef9010e698df4',
  'test-kits/verification-record.test.mjs': '550b0a1ed6388295',
  'test-kits/work-package-discovery.test.mjs': 'a3920136781048b6',
  'test-kits/work-package-ownership.test.mjs': 'edeaf529d5267bba',
  'test-kits/authority-dispositions.test.mjs': 'dd031bcd9460744c',
};

// How many reversals `ratchets-bite.test.mjs` puts through a suite. Independent review twenty
// showed why the number matters: with ONE reversal per suite, a stub keeping exactly the one
// assertion that reversal exercises survives -- 804 lines of `catalog-registry.test.mjs` reduced
// to 76, and `CTR-SEC-001` shipped as `Frozen` with its freeze requirements emptied, at exit 0.
//
// Each additional unrelated reversal is another pin a stub must reimplement to survive, and a
// stub that reimplements them all is the suite.
export const REVERSAL_FLOOR = 23;
