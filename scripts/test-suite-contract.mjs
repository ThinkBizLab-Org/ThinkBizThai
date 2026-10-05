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
// The post-migrate assertion pass (2026-09-27) added three tests to foundation-contract: the
// wiring, the coverage of every do-block, and the refusals. 63 to 66. Q0's F1 on that head added a
// fourth, the verdict driven by synthetic outcomes: 66 to 67. The catalog-rule probes added one
// more (2026-09-27): 67 to 68, and Q0's F2 on that head a sixth, the probe verdict: 68 to 69. Batch
// 105's pin test: 69 to 70. Batch 123's pin test: 70 to 71. Its corrections renamed two and added none.
// Batch 125's pin test: 71 to 72. Batch 127's pin test: 72 to 73. The batch 141 preparation draft
// (2026-10-03, no migration): four tests -- the §8.4 audit cell in the service-policy map, the audit
// coverage map, the store's reading of CTR-AUD-001 and its fixtures -- 73 to 77. Batch 160's preparation
// (2026-10-03, no migration): the retention map, the §11.1 export manifest fixture and the §11.4 purge order,
// three tests: 77 to 80. The sql-lexer batch (2026-10-04, no migration): one test, the one lexer's golden corpus,
// fail-closed refusals and measured statement split: 80 to 81. Batch 141 (2026-10-05, migration 172): one test,
// the closing command's succeeded row tied to its CTR-AUD-001 conformance fixture: 81 to 82. Batch 173 (2026-10-05,
// migration 173, RFC-2026-028): three tests -- the login role's migration and the static credential rule over every
// fed source, the snapshot lint of the login role per row, and the worker login proofs driven by a fake: 82 to 85.
  'test-kits/db/foundation-contract.test.mjs': 85,
  'test-kits/db/rls-assertions.test.mjs': 20,
// Batch 121 moved both floors for tests/db/identity/identity-isolation.test.mjs 
// -- 296 to 301 tests and 2101 to 2130 assertions -- and the assertion half moved only
// because C0 graded the omission a finding: five assertion-bearing tests had been added
// under a floor that did not move, which is the shape of a floor that stops meaning
// anything. Both numbers are what the guard itself prints, never a count taken by hand.
// Batch 123's corrections: 301 to 302 tests and 2133 to 2141 assertions, the named-constraint test
// (Q0's test of 123, F4), the guard's own counts. Batch 125: 302 to 303 tests and 2141 to 2144
// assertions, the runCases test of `violates` (Q0's re-test of 123's corrections, F5). Batch 091's
// corrections: 303 to 304 tests and 2144 to 2150 assertions, the static hold on its two CI control
// entries (C0's review of 091, F11), the guard's own counts. Batch 127: 304 to 305 tests and 2152 to
// 2166 assertions, the hold on its created_by-alone family (A1 F5 on 123), the guard's own counts.
// Batch 141 (migration 172): 305 to 307 tests, the `after` read-back's static shape and runAfter executed with a fake
// driver, the guard's own counts.
  'tests/db/identity/identity-isolation.test.mjs': 307,
  'test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs': 8,
  'test-kits/contracts/ctr-job-001-reference-hardening.test.mjs': 6,
  'test-kits/contracts/schema-mutation-coverage.test.mjs': 10,
  'test-kits/contracts/shared-kernel-contract-catalog.test.mjs': 6,
  'test-kits/contracts/shared-kernel-envelope-contracts.test.mjs': 15,
  'test-kits/contracts/shared-kernel-schema-conformance.test.mjs': 6,
  'test-kits/handoff-conformance.test.mjs': 19,
  'test-kits/integrity-manifest-rebuild.test.mjs': 3,
  'test-kits/protocol-schema-conformance.test.mjs': 4,
  'test-kits/ratchets-bite.test.mjs': 19,
  'test-kits/repository-json.test.mjs': 8,
  'test-kits/role-separation.test.mjs': 8,
  'test-kits/secret-scan.test.mjs': 46,
  'test-kits/test-coverage-floor.test.mjs': 35,
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
// The same tests moved the assertion floor with them, 258 to 276, and the corrections after the
// three role runs to 288: the count the guard's own regex reads, not one taken by hand. Batch 121's lesson from C0 is that a floor that stays put
// while assertion-bearing tests are added has stopped meaning anything.
// 288 to 290 with the fails_with determinism rule (main CI run 36311266393).
// 290 to 305 with the catalog-rule probes' contract test (2026-09-27), and to 313 after the three role
// runs' corrections (the verdict test, the self-tests' intent assertions): the guard's own count.
// 318 with batch 105's pin test, 322 after its role runs' corrections (2026-09-27), the guard's own count.
// 322 to 330 with batch 123's pin test (2026-09-28), the guard's own count.
// 330 to 342 after its role runs' corrections: one self-test per rule, the decider closure and the
// pinned checks (2026-09-28), the guard's own count.
// 342 to 365 with batch 125: the job list and verdict against the real probes, every raise spelling,
// transaction control, and 125's pin test (2026-09-28), the guard's own count.
// 365 to 418 with batch 126 (2026-10-03): the verdict driven every wrong way the reviews of 125 named,
// the psql lexer, the pinned trigger, grant and default probes and 126's pin test; no test is added and
// none renamed, so the test floor and the name digest stay; the guard's own count.
// 418 to 464 with batch 127 (2026-10-03): the created_by closure, INSERT coverage and permissive policy
// probes, the odd-run and client-encoding lexer shapes, and 127's pin test; one test added (127's pin
// test), so the test floor moves 72 to 73 and the name digest with it; the guard's own count.
// 464 to 480 with batch 127's review round (2026-10-03): the client privilege and policy helper probes'
// reading predicates, the thirty-three pinned member-scope narrowings and the SET NAMES shapes anywhere;
// no test is added and none renamed, so the test floor and the name digest stay; the guard's own count.
// 480 to 494 with batch 128 (2026-10-03): every schema in the client privilege probe, the client schema and
// client membership probes, the extension-member definer rule, no OR, TRUE or NOT in a narrowing, and the
// U& and E'' lexer shapes; no test is added and none renamed, so the test floor and the name digest stay;
// the guard's own count.
// 494 to 500 with batch 128's review round (2026-10-03): the object-OID reading (FirstNormalObjectId and
// userObject), no rule by schema name alone, the database privileges and their pin, and no schema left out
// of the client schema probe; no test is added and none renamed, so the test floor and the name digest
// stay; the guard's own count.
// 500 to 525 with batch 129 (2026-10-03): the system object fingerprint (what it reads, how it is taken,
// sealed and compared), the client roles' attributes, pg_default_acl, every other database, and a pg_toast
// object in each client privilege drift; no test is added and none renamed, so the test floor and the name
// digest stay; the guard's own count.
// 525 to 613 with the batch 141 preparation (2026-10-03, no migration): the §8.4 audit cell in the
// service-policy map, the audit coverage map, the store's reading of CTR-AUD-001 and its fixtures, 64
// assertions; the other 24 are batch 129's review round, which made 549 on main c5a648e without moving this
// floor. Four tests added, so the test floor moves 73 to 77 and the name digest with it; the guard's own count.
// 613 to 633 with the batch 141 preparation's review round (2026-10-03, no migration): every column of
// 140's body whatever its type, no later ALTER TABLE or policy on an audit table in any spelling, the
// not-blank CHECKs as a pinned narrowing, the coverage map's closed keys, §8 slice, support citation and
// the review round's eleven rows, and the F6 fixtures' categories; no test is added and none renamed, so
// the test floor and the name digest stay; the guard's own count.
// 633 to 720 with batch 160's preparation (2026-10-03, no migration): the retention map held against §5, §10
// and the migration text, the §11.1 export manifest fixture and the §11.4 purge order, 87 assertions; three
// tests added, so the test floor moves 77 to 80 and the name digest with it; the guard's own count.
// 720 to 747 with batch 160 preparation's review round (2026-10-04, no migration): the window guard reads
// Thai, hyphenated and numeric windows and tests itself, the excluded classes not picked carry a reason,
// partial covering indexes carry their predicate, set_decided_at is held both ways, schema-wide grants and
// later drop/disable trigger are read, the WP citations are checked, and the purge order holds its key
// names, its phases, its inversions, the tables no workspace owns and the conflicts' fields; no test is
// added and none renamed, so the test floor and the name digest stay; the guard's own count.
// 747 to 788 with batch 170's assertions (2026-10-04, no migration): the pinned grant list as data over every
// table and role, the read allowlist and its known exceptions, the classification registry, and the two new
// probes' reading predicates; no test is added and none renamed, so the test floor and the name digest stay;
// the guard's own count.
// 788 to 793 with batch 170's review round (2026-10-04, no migration): the pinned grant probe's three new
// premises (no view, matview or foreign table in app and private; no superuser but the migration owner;
// no membership among non-superuser roles, none pinned) and the classification SQL's refused tables; the
// role CTEs anchored in place of one assertion; no test added or renamed; the guard's own count.
// 793 to 878 with batch 150's prerequisites (2026-10-04, no migration): the pinned shapes, vocabulary
// checks, policy set and index coverage files and their probes' reading predicates, the WS:911 fixture's
// shape and the EXPLAIN harness's refusals, rollback and absence from the Makefile and CI; no test is added
// and none renamed, so the test floor and the name digest stay; the guard's own count.
// 878 to 898 with batch 150-prereq's review round (2026-10-04, no migration): the shared test-instance host
// guard (A1 S1, Q0 Q-4, C0-9), the harness's emptiness refusal (A1 S3, C0-4, Q0 Q-6), the pinned shape
// trigger set (A1 S4, C0-8), the roles comparisons (Q0 Q-3), the index coverage run, qualified column,
// btree and NULLS readings (C0-1, Q0 Q-1, Q-2) and the 16-table count (C0-5); no test added or renamed.
// 898 to 929 with batch 150 (2026-10-04, migration 150_performance_snapshots_key.sql): the key pinned as
// (id, metric_time) and 150's statements, timeouts and block read (Q150-a, Q150-b), the workspace list read
// from workspace_members (Q150-e), and rule 17's SECRET-4 / safe-projection split and the projection file
// (Q170-d); no test added or renamed, so the test floor and the name digest stay; the guard's own count.
// 929 to 932 with batch 150's review round: rule 17's two privilege lists pinned by text (Q0 Q-3) and 150's
// check 2 reading every unique index (C0-6, A1 F150-3); no test added or renamed; the guard's own count.
// 932 to 942 with batch 170 (2026-10-04, migration 170_workspace_lifecycle_not_client_writable.sql): the client
// UPDATE of workspaces.lifecycle_state revoked (Q-026-5 / Q-027-5), read from pinned-grants.json and from 170's
// statement and block, 010 unedited; no test added or renamed, so the test floor and the name digest stay;
// the guard's own count. 942 to 946 with batch 170's review round (A1 F170-2): 170's code held to exactly the
// revoke, the column comment and one do-block that runs no statement of its own; no test added or renamed;
// the guard's own count.
// 946 to 1000 with the owed-tooling batch (2026-10-04, no migration): 170's do-block held to an allowlist with
// its drifts, every trigger on app and private pinned and re-derived from the migration text, the pinned grant
// probe's schema and role-attribute rules, the index coverage key's collation and operator class, the
// generator's measured-on text, quoted blocker citations in the two maps, the export rules derived over every
// §11.1 domain and the F160-17 record, the 141-prep pins and audit-table tripwire, the host guard's halves and
// raw-query redaction, and COPY ... PROGRAM in the lexer; no test added or renamed, so the test floor and the
// name digest stay; the guard's own count. 1000 to 1014 with that batch's review round: the do-block's quoted
// and commented spellings and a drift each for its JOIN and relation rules, the internal-trigger rule's text,
// the COPY-to-file and server-file lexer shapes, the authority redaction cases, every omitted export bucket and
// the eleven classes tied to their ERD lines, one blocker per quote, and the tripwire's comment, rule and rename
// spellings; no test added or renamed; the guard's own count.
// 1014 to 1044 with the sql-lexer batch (2026-10-04, no migration): the one lexer's golden corpus, fail-closed
// refusals, the measured statement split and the readers built on it (one test added, so the test floor moves 80 to
// 81 and the name digest with it), the do-block allowlist's dollar and `'a--'` drifts, the tripwires' lexer-read
// spellings and the do-block counter's refusal of a text that is not SQL; the guard's own count.
// 1044 to 1074 with the try-it batch (2026-10-04, no migration). main at b0a3809 counted 1054 under the floor of
// 1044 (the sql-lexer review round added ten assertions without moving it); the try-it batch adds twenty to the
// existing live-target refusal test: scripts/db/try-it.mjs's host guard over every crafted URL, CI's host and the
// reserved ports, its refusals without a cluster, its demo plan held sound with a mutation each for the ways it
// could pass vacuously, and the next command it prints (the running Node's full path, the --dir in use,
// shell-quoted; the pin it notes a difference from is .node-version); no test added or renamed; the guard's own
// count.
// 1074 to 1101 with the try-it batch's review round (2026-10-04, no migration): twenty-seven assertions in the same
// test: migrate-clean's exit 0 not taken alone, the five runners entered by pathToFileURL, the repository check
// through the nearest existing ancestor, a file as --dir, down's refusals of a reserved port, a symlink and a
// postmaster.pid naming another data directory or port, a stopped cluster said to be stopped, a foreign entry
// never deleted, and the full script path in the next command; no test added or renamed; the guard's own count.
// 1101 to 1119 with the try-it batch's fix after the re-checks (2026-10-04, no migration): eighteen assertions in
// the same test: the per-cluster scram-sha-256 password (no trust, at least 24 random bytes, base64url, libpq's
// password-file line, 0600 exclusive-create files, PGPASSFILE over an inherited PGPASSWORD, no password in the URL
// or the printed psql line), the six runners entered by real paths, no bare-URL entry check anywhere in scripts/ or
// tests/ but the Integration Owner's two, and three runners invoked through a symlink running main(); no test added
// or renamed; the guard's own count.
// 1119 to 1121 with batch 171 (2026-10-05, migration 171, RFC-2026-027): the authz lint's second pinned pair -- its
// lifecycle term dropped, a helper call, `true`, the policy lost or renamed, and a workspace's name among the column
// grants, each a finding -- and the permissive list's count and roles moved to seventy-five with app_authz's policy
// on app.workspaces; no test added or renamed; the guard's own count.
  'test-kits/db/foundation-contract.test.mjs': 1121,
  'test-kits/db/rls-assertions.test.mjs': 108,
  // Batch 091's second round: 2150 to 2152, the converse hold that every 091 case is in exactly one
  // control family (Q0 F3 on 091's corrections), the guard's own count.
  // Batch 127: 2152 to 2166, the created_by-alone family hold, the guard's own count.
  // Batch 170: 2166 to 2167, batch 132's absence assertion turned into presence and emptiness of
  // read-allowlist.json, the line 132 said the landing batch would edit; the guard's own count.
  // The owed-tooling batch: 2167 to 2169, the view scan's own spellings (recursive and temporary views; A1 S2,
  // Q0 R-5 on 170-assert's re-check), the guard's own count.
  'tests/db/identity/identity-isolation.test.mjs': 2169,
  'test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs': 11,
  'test-kits/contracts/ctr-job-001-reference-hardening.test.mjs': 25,
  'test-kits/contracts/schema-mutation-coverage.test.mjs': 15,
  'test-kits/contracts/shared-kernel-contract-catalog.test.mjs': 25,
  'test-kits/contracts/shared-kernel-envelope-contracts.test.mjs': 50,
  'test-kits/contracts/shared-kernel-schema-conformance.test.mjs': 11,
  'test-kits/handoff-conformance.test.mjs': 63,
  'test-kits/integrity-manifest-rebuild.test.mjs': 10,
  'test-kits/protocol-schema-conformance.test.mjs': 6,
  'test-kits/ratchets-bite.test.mjs': 36,
  'test-kits/repository-json.test.mjs': 18,
  'test-kits/role-separation.test.mjs': 8,
  'test-kits/secret-scan.test.mjs': 88,
  'test-kits/test-coverage-floor.test.mjs': 100,
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
  'test-kits/db/foundation-contract.test.mjs': 'd4851295dd024f20',
  'test-kits/db/rls-assertions.test.mjs': '04e93ef6577ba5ce',
  'tests/db/identity/identity-isolation.test.mjs': '25aa50b576c0925b',
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
  'test-kits/handoff-conformance.test.mjs': 'aae5740519f84c40',
  'test-kits/integrity-manifest-rebuild.test.mjs': '91b24d70c4ac8fcb',
  'test-kits/protocol-schema-conformance.test.mjs': 'dc9a77399529cead',
  'test-kits/ratchets-bite.test.mjs': '7308ec4c18729af9',
  'test-kits/repository-json.test.mjs': '7e434c46d2b5cd7a',
  'test-kits/role-separation.test.mjs': '00a4c859fecdbbae',
  'test-kits/secret-scan.test.mjs': 'dc3d730ee7d4d461',
  'test-kits/test-coverage-floor.test.mjs': 'b20e89e6d8bd3be0',
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
