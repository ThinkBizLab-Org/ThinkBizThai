# WP-0A-CON-002 — Independent test verdict

Tester run: `/claude/q0_sentinel` (Anthropic, `claude-opus-5`). Skill profile `independent-qa`.
Author run under test: `/claude/a0_atlas`. This run did **not** author any artifact in this package.
Branch: `agent/claude/WP-0A-CON-002-envelope-contracts`
Head under test: `106f91c4fb5663761e9f3a232e831aca74970456`
Base compared against: `4e1d6e5`
Date: 2026-08-31

**This is independent Tester evidence only.** It is not review, security review,
integration verification, Product Owner disposition, merge authorization, or Gate G0
approval, and it does not move Gate G0.

Every claim below was reproduced by this run. Nothing is accepted on the Author's word.

## Toolchain observed

| | Claimed | Observed |
|---|---|---|
| node | `v24.20.0` | `v24.20.0` |
| npm | `11.19.0` | `11.19.0` |

All commands run through a login shell (`zsh -lc`) from the repository root.
Host filesystem probed and confirmed **case-insensitive** (APFS default); CI runs
`ubuntu-24.04`, which is case-sensitive. See G14.

Working-tree state **not produced by this run**, recorded so the closing `git status` is
not misread:

- At session start `work-packages/WP-0A-A0-002.json` was already modified
  (`"status": "backlog"` → `"in_review"`). This run left it untouched rather than
  reverting another package's in-flight state. It was reverted by another run partway
  through this session. `npm run check` was executed with that file both dirty and clean
  (and every attack ran against a clean `git archive` extract), with identical results, so
  it affects no finding here.
- `evidence/WP-0A-CON-002/review-contract.md` and `review-security.md` appeared as
  untracked files during this session, written by the concurrent Reviewer and Security
  reviewer runs. This run neither read them before forming its findings nor wrote to them.

## 1. Replay of the Author's evidence table

| Command | Author claim | Observed exit | Observed result | Verdict |
|---|---|---|---|---|
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` (pre-fix, reconstructed) | exit `1`, `tests 4 / pass 3 / fail 1`, both files named | `1` | `tests 4 / pass 3 / fail 1`; both files and both resolved paths named verbatim | **reproduced** |
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` (post-fix) | exit `0`, `tests 4 / pass 4 / fail 0` | `0` | `tests 4 / pass 4 / fail 0` | **reproduced** |
| `npm run check` | exit `0`, `tests 59 / pass 59 / fail 0` (46 → 59) | `0` | `tests 59 / suites 0 / pass 59 / fail 0 / cancelled 0 / skipped 0 / todo 0` | **reproduced** |
| `node --test test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | exit `0`, 9 tests | `0` | `tests 9 / pass 9 / fail 0` | **reproduced** |
| `node scripts/validate-work-package-ownership.mjs work-packages` | exit `0`, no output | `0` | no output | **reproduced** |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-002.json` | exit `0`, no output | `0` | no output | **reproduced** |
| `node scripts/scan-repository-secrets.mjs` | exit `0`, no output | `0` | no output | **reproduced** |
| baseline at `4e1d6e5` | 46 | `0` | `tests 46 / pass 46 / fail 0 / skipped 0 / todo 0` | **reproduced** (46 → 59 = +13) |

### How 59 decomposes

Measured by running each discovered test file individually. 11 files, no suites.

| File | Tests |
|---|---|
| `test-kits/capability-profile.test.mjs` | 4 |
| `test-kits/contracts/catalog-reference-integrity.test.mjs` | **4** (new) |
| `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | 6 |
| `test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | **9** (new) |
| `test-kits/repository-json.test.mjs` | 2 |
| `test-kits/role-separation.test.mjs` | 8 |
| `test-kits/secret-scan.test.mjs` | 2 |
| `test-kits/test-coverage-floor.test.mjs` | 14 |
| `test-kits/toolchain-contract.test.mjs` | 3 |
| `test-kits/work-package-discovery.test.mjs` | 1 |
| `test-kits/work-package-ownership.test.mjs` | 6 |
| **Total** | **59** |

Pre-existing 46 + 4 + 9 = 59. `git diff --name-status 4e1d6e5 106f91c -- test-kits scripts package.json`
returns exactly two `A` (added) lines and nothing else: no pre-existing test file, script,
or `package.json` entry was modified or removed.

## 2. The "guard written first, observed to fail" claim — reconstructed independently

`git archive 106f91c` was extracted into a scratch tree **outside the repository**, and
**only the two `$ref` string literals** were reverted from `../ctr-ten-001/schema.json`
to `../../ctr-ten-001/schema.json`. The guard file itself was not modified.

Observed, verbatim:

```
✖ every external $ref in the catalog resolves to a file that exists
✔ a $ref never escapes the contract catalog
✔ every manifest fixture and schema it declares exists on disk
✔ every fixture on disk is declared by its manifest
ℹ tests 4  ℹ pass 3  ℹ fail 1     exit 1

AssertionError [ERR_ASSERTION]: unresolved catalog $ref(s):
  contract-catalog/shared-kernel/ctr-evt-001/schema.json $.properties.tenant_context.$ref
    -> ../../ctr-ten-001/schema.json -> contract-catalog/ctr-ten-001/schema.json
  contract-catalog/shared-kernel/ctr-job-001/schema.json $.properties.tenant_context.$ref
    -> ../../ctr-ten-001/schema.json -> contract-catalog/ctr-ten-001/schema.json
```

Identical to the Author's claim, including exit code, counts, both file names, and both
resolved paths. **Claim reproduced.**

### Is the guard tautological?

No. Three independent falsification attempts confirm it derives its verdict from disk,
not from a hardcoded expectation of those two paths. The asserted expectation is the
empty list; the actual list is built from real `fs.access()` calls.

| Probe | Result |
|---|---|
| A1 — a **different** broken `$ref` injected into a **different** file (`ctr-err-001`) | caught, exit `1` |
| A2 — broken `$ref` inside an **array** (`anyOf`) | caught, exit `1` |
| A3 — broken `$ref` nested five levels deep (`definitions.a.b.c[0].d.allOf[0]`) | caught, exit `1` |

The guard fails for a genuine, disk-derived reason. **Not tautological.**

## 3. Fixture attacks — manifest claims vs. what the tests actually enforce

The Author's three predicates were extracted **verbatim from the shipped test file by
script** (no transcription) and driven with hand-built fixtures. `ACCEPTS` = the
predicate returned `true`.

### CTR-API-001

| # | Fixture | Predicate | Should be | |
|---|---|---|---|---|
| F1 | `kind:"success"`, `data` carrying a raw provider response **and a stack trace** (`/srv/app/src/db/pool.js:88`) | **ACCEPTS** | reject | **GAP** |
| F2a | `accepted.deep_link_ref` = `https://public.example.com/x` | rejects | reject | ok |
| F2b | `accepted.status_ref` = `HTTPS://public.example.com/jobs/j1` (uppercase scheme) | **ACCEPTS** | reject | **GAP** |
| F2c | `accepted.status_ref` = `//cdn.example.com/jobs/j1` (protocol-relative) | **ACCEPTS** | reject | **GAP** |
| F2d | `accepted.status_ref` = `ftp://public.example.com/jobs/j1` | **ACCEPTS** | reject | **GAP** |
| F3 | `api_version: 0` | rejects | reject | ok |
| F4 | `tenant_context.actor.kind` missing | rejects | reject | ok |
| F5 | `tenant_context` carrying extra `raw_jwt` and `db_dsn` (`postgres://u:p@h/db`) | **ACCEPTS** | reject | **GAP** |
| F6 | extra top-level envelope keys `internal_sql`, `debug_stack` | **ACCEPTS** | reject | **GAP** |
| F7 | `error.details` empty but `error.stack_trace` and `error.internal_message` present | **ACCEPTS** | reject | **GAP** |
| F8 | `kind:"success"`, `data: null` (`typeof null === "object"`) | **ACCEPTS** | reject | **GAP** |
| F9 | `kind:"success"`, `data: []` (an array) | **ACCEPTS** | reject | **GAP** |
| F10 | `accepted` carrying extra `provider_raw: {key:"sk-live-abc"}` | **ACCEPTS** | reject | **GAP** |

### CTR-PAG-001

| # | Fixture | Predicate | Should be | |
|---|---|---|---|---|
| F11 | `cursor` = base64url of `offset=40` → `b2Zmc2V0PTQw` | **ACCEPTS** | reject | **GAP** |
| F11b | `cursor` = base64url of `{"offset":40,"limit":20}` | **ACCEPTS** | reject | **GAP** |
| F12 | `page` with `has_more:true`, `next_cursor:null` | rejects | reject | ok |
| F12b | `page` with `has_more:true`, `next_cursor` **absent** | **ACCEPTS** | reject | **GAP** |
| F12c | `page` with `has_more:false`, `next_cursor` absent | rejects | reject | ok |
| F13 | `sort` = `created_at desc` + `created_at asc` (duplicate field, no real tiebreaker) | **ACCEPTS** | reject | **GAP** |
| F14 | `kind:"request"` that also carries `items` / `next_cursor` / `has_more` | **ACCEPTS** | reject | **GAP** |
| F15 | `kind:"page"` that also carries a request `cursor` | **ACCEPTS** | reject | **GAP** |

### CTR-IDM-001

| # | Fixture | Predicate | Should be | |
|---|---|---|---|---|
| F21 | `completed`, `result_ref` = `data:text/html;base64,PHNjcmlwdD4=` | **ACCEPTS** | reject | **GAP** |
| F22 | `completed`, `result_ref` = `file:///etc/passwd` | **ACCEPTS** | reject | **GAP** |
| F22b | `completed`, `result_ref` = `HTTPS://cdn.example.com/r/1` | **ACCEPTS** | reject | **GAP** |
| F23 | two records, **same key + same scope, different `payload_hash`** | both `true` individually | conflict | **GAP — untested** |
| F24 | `scope.operation` = `"DROP TABLE users"` (schema pattern `^[a-z0-9]+(\.[a-z0-9]+)+$`) | **ACCEPTS** | reject | **GAP** |
| F25 | `created_at` = `"not-a-date"` | **ACCEPTS** | reject | **GAP** |
| F26 | `failed`, `error` carrying `stack` and `details:{sql:..., api_key:"sk-live-abc"}` | **ACCEPTS** | reject | **GAP** |
| F27 | `completed` with extra `raw_provider_response:{key:"sk-live-abc"}` | **ACCEPTS** | reject | **GAP** |
| F28 | `scope` carrying an extra `other_workspace_id` (schema `additionalProperties:false`) | **ACCEPTS** | reject | **GAP** |

### `isPrivateRef` behaviour, measured

`isPrivateRef = (v) => isText(v) && !/^https?:\/\//.test(v)` — case-sensitive, scheme-blind.

| Value | `isPrivateRef` |
|---|---|
| `https://x/y` | `false` (rejected) |
| `HTTPS://x/y` | **`true`** |
| `Https://x/y` | **`true`** |
| `//cdn.x/y` | **`true`** |
| `ftp://x/y` | **`true`** |
| `data:text/html,x` | **`true`** |
| `file:///etc/passwd` | **`true`** |
| `javascript:alert(1)` | **`true`** |
| `" https://x/y"` (leading space) | **`true`** |

### Decisive end-to-end demonstration (G1 — the finding that matters most)

A single fixture named `examples/valid-qa-leak.json` was planted in a scratch copy of
`106f91c` and declared in the CTR-API-001 manifest. It carries, simultaneously:

- `accepted.status_ref` = `HTTPS://public.example.com/jobs/j1`
- `accepted.deep_link_ref` = `HTTPS://public.example.com/d/j1`
- `tenant_context.raw_jwt` = `eyJhbGciOiJIUzI1NiJ9.LEAK`
- top-level `internal_sql` = `SELECT * FROM users WHERE workspace_id=$1`
- top-level `debug_stack` = `TypeError: undefined\n at /srv/app/src/db/pool.js:88:12`

Result: **`npm run check` exit `0`, `tests 59 / pass 59 / fail 0`.**

It passes not only the validator but also the dedicated test
*"no fixture leaks a public URL where the baseline requires a private reference"*,
whose regex `/"(status_ref|deep_link_ref|result_ref|input_ref)":"https?:\/\//` is
case-sensitive.

This directly falsifies acceptance criterion 5 — *"No valid fixture carries a public URL
in `status_ref`, `deep_link_ref`, `result_ref` or `input_ref`"* — as an enforced property.
The criterion holds for the fixtures actually shipped (all clean, verified), but the guard
that is supposed to keep it holding does not.

### Negative-fixture mutation testing (this part is sound)

For each of the 9 shipped negative fixtures, only the defect its filename names was
repaired, and acceptance re-measured. All 9 flipped `false → true`. **No negative
fixture is rejected for an unintended or extra reason**, so none is a false-confidence
placeholder. Also confirmed: `fixture.includes('/valid-')` correctly classifies
`invalid-*.json` as negative (the leading `/` disambiguates).

## 4. Reference-integrity guard attacks

| # | Attack | Guard | |
|---|---|---|---|
| A1 | broken `$ref` in a different schema file | exit `1` | caught |
| A2 | broken `$ref` inside an array (`anyOf`) | exit `1` | caught |
| A3 | broken `$ref` nested five levels deep | exit `1` | caught |
| A4 | `$ref: "../../../../../../etc/passwd"` in **`manifest.json`** instead of `schema.json` | exit `0` | **MISSED** |
| A5 | `$ref: "../ctr-ten-001"` — resolves to a **directory** | exit `0` | **MISSED** |
| A6 | `$ref: "../CTR-TEN-001/Schema.json"` — case-differing path | exit `0` locally | **platform-divergent** |
| A7 | `$ref: "https://evil.example.com/tenant.json"` | exit `1` | caught, but **mislabelled** |
| A8 | broken `$ref` in `ctr-api-001/sub/schema.json` (nested subdirectory) | exit `0` | **MISSED** |
| A9 | broken `$ref` in `ctr-api-001/error-schema.json` (not named `schema.json`) | exit `0` | **MISSED** |
| A10 | `$ref: "../../../package.json"` — escapes the catalog to a file that exists | exit `1` | caught by the escape test |
| A11 | `manifest.schema` = `"../../../package.json"` (escapes its own contract dir) | exit `0` | **MISSED** |
| A12 | undeclared fixture hidden in `examples/extra/sneaky.json` | exit `1` | caught (the *directory* entry is flagged; the file is never inspected) |
| A13 | undeclared fixture directly in `examples/` | exit `1` | caught |
| A14 | new contract directory with no `schema.json` and no `manifest.json` | exit `0` | **MISSED** (silently skipped) |

Notes on the misses:

- **A4 / A8 / A9** share one root cause: the guard reads exactly
  `contract-catalog/shared-kernel/<dir>/schema.json` and nothing else. Any `$ref` in a
  manifest, a nested subdirectory, or a differently-named schema file is invisible.
- **A5**: `exists()` is `fs.access(path)` (`F_OK`), which succeeds on directories. A `$ref`
  pointing at a directory is "resolvable" to this guard and unusable to every real
  `$ref` resolver.
- **A7**: caught only incidentally — the URL is joined as a relative path
  (`.../ctr-api-001/https:/evil.example.com/tenant.json`) which happens not to exist. The
  *"a `$ref` never escapes the contract catalog"* test **passes** on it, because the
  bogus join still `startsWith('contract-catalog/')`. A remote `$ref` is a network
  dependency in a schema, and the test whose name implies it would be caught does not
  catch it.
- **A14**: `contractDirectories()` lists directories, then `continue`s past any without a
  `schema.json`/`manifest.json`. A contract directory can exist with no schema and no
  manifest and raise nothing.
- The guard's `CATALOG` is the hardcoded literal `'contract-catalog/shared-kernel'`. Today
  that is the only subtree (`find` confirms 7 contract directories, all under
  `shared-kernel/`), but a future `contract-catalog/<other>/` subtree would be entirely
  unguarded with no failure to announce it.

**Complete `$ref` inventory in the catalog today** (5 refs, all correct post-fix):
`ctr-api-001 → ../ctr-err-001/schema.json`, `ctr-api-001 → ../ctr-ten-001/schema.json`,
`ctr-evt-001 → ../ctr-ten-001/schema.json`, `ctr-idm-001 → ../ctr-err-001/schema.json`,
`ctr-job-001 → ../ctr-ten-001/schema.json`. All verified resolving on disk.

## 5. `index.json` unchanged and counts preserved

| Check | Result |
|---|---|
| `sha256` at `4e1d6e5` | `505f7a597970716d07a9a9a806908c7918d92293aac6d7b22e7acf77505a1262` |
| `sha256` at `106f91c` (working tree) | `505f7a597970716d07a9a9a806908c7918d92293aac6d7b22e7acf77505a1262` |
| `git diff 4e1d6e5 106f91c -- .../index.json` | empty |
| Contract count | 14 |
| Status tally | **Candidate 4 / Draft 10** |
| `CTR-API-001` / `CTR-PAG-001` / `CTR-IDM-001` | all `Draft` |

**Byte-identical.** Materializing the three Draft contracts did not promote anything.

## 6. Cross-package edit — parsed structural diff, not textual

Both `ctr-evt-001/schema.json` and `ctr-job-001/schema.json` were parsed at `4e1d6e5` and
at `106f91c`, flattened to leaf paths, and compared. **Identical result for both files:**

- **6 differing leaf paths**, and only 6:
  - `$.properties.tenant_context.$ref`: `"../../ctr-ten-001/schema.json"` → `"../ctr-ten-001/schema.json"`
  - `$.x-amended-by.work_package_id` / `.decision_record` / `.change` /
    `.acknowledgement_required_from` / `.acknowledgement_status` — all newly added
- `$id`, `title`, `type`, `additionalProperties`, `required`: **UNCHANGED**
- Property set: **UNCHANGED** (12 properties for `ctr-evt-001`, 18 for `ctr-job-001`) — no
  property added, removed, renamed, or re-typed
- Top-level key set gains exactly `x-amended-by` and nothing else
- No `version` or freeze-level field exists in either schema (they live in the manifests),
  and neither manifest was touched:
  `git diff --name-only 4e1d6e5 106f91c -- .../ctr-evt-001 .../ctr-job-001 .../ctr-ten-001 .../ctr-err-001`
  returns exactly the two `schema.json` files

Acceptance criterion 7 (*"limited to the two `$ref` string literals plus an `x-amended-by`
record, and changes no field, semantics, version or freeze level"*) — **verified**.

Not verified by this run, and out of a Tester's authority: whether amending two
**delivered** WP-0A-CON-001 artifacts is authorized. Both schemas carry
`acknowledgement_status: "pending"` from `/root/r0_steward`. That is an Integration Owner
ruling, and it is correctly declared as an open blocker by the Author.

## 7. Nothing weakened — WP-0A-A0-002 floors re-attacked at this head

Every attack from `evidence/WP-0A-A0-002/author-remediation-2.md` re-injected into a
scratch copy of `106f91c`. The repository itself was never modified.

| Injected regression | Expected | Observed |
|---|---|---|
| `test:bootstrap` = `": node scripts/run-test-suite.mjs"` (B1) | `74` | **74** |
| `test:bootstrap` = `"node scripts/run-test-suite.mjs \|\| true"` (B1b) | `74` | **74** |
| `check` drops `&& npm run test:bootstrap` (N2) | `81` | **81** |
| `check` drops `npm run verify:coverage-floor &&` (N2b) | `1` (backstop) | **1** |
| `TEST_PATTERN` → bare `**` inside a segment (B2) | `76` | **76** |
| four test files deleted (executed/declared floor) | non-zero | **75** |
| new test file declaring no `test()` | `78` | **78** |
| `test(` → `test.skip(` across the envelope suite | non-zero | **78** |
| control (unmodified) | `0` | **0**, `tests 59 / pass 59 / fail 0 / skipped 0 / todo 0` |

**No attack reached exit `0`.** The coverage floor, the declared-test floor, the
executed-count floor, and the wiring guard all still hold at this head, and skipping
tests is rejected rather than silently tolerated.

At head: `skipped 0`, `todo 0`. No test removed, no test skipped.

## Findings

Numbered for disposition. G-prefixed = gap between what a manifest/criterion **claims** and
what a test **enforces**.

| ID | Sev | Finding |
|---|---|---|
| **G1** | **High** | A `valid-` fixture carrying an uppercase-scheme public URL in `status_ref` **and** `deep_link_ref`, a raw JWT in `tenant_context`, and `internal_sql`/`debug_stack` at top level passes `npm run check` **59/59 green**. `isPrivateRef` and the leak test are both case-sensitive and scheme-blind (`HTTPS://`, `//host`, `ftp://`, `data:`, `file:`, `javascript:` all pass). Falsifies acceptance criterion 5 as an *enforced* property. |
| **G2** | **High** | CTR-API-001 manifest claims API-001 "no leak internal detail". The rule is enforced **only** on `error.details` being empty. `data` is checked as `typeof === "object"` and nothing else — a raw provider response and a full stack trace in `data` are accepted (F1). |
| **G3** | **High** | CTR-IDM-001 manifest states "payload-hash mismatch is a conflict" as a materialized rule. **No test exercises it.** Two records with the same `idempotency_key` and same `scope` but different `payload_hash` are each accepted, and nothing compares them (F23). The replay test only proves the *matching* direction. |
| **G4** | **Med** | CTR-PAG-001 claims an "opaque / tamper-safe" cursor. Only the **charset** `^[A-Za-z0-9_-]+$` is enforced. base64url of `offset=40`, and of `{"offset":40,"limit":20}`, are both accepted (F11, F11b). The shipped negative fixture `offset=40&limit=20` fails on `=`/`&`, not on decodability — the test named "rejected as not opaque" is a charset test. |
| **G5** | **Med** | CTR-PAG-001 "≥2 sort keys" is satisfied by `created_at` twice (F13). Duplicate fields are not a tiebreaker; the stated purpose is not enforced. |
| **G6** | **Med** | `validPage`: a `page` result with `has_more:true` and `next_cursor` **absent** is accepted, because `OPAQUE.test(undefined)` coerces to the string `"undefined"` and matches (F12b). The `null` case is handled; the missing case is a live defect. |
| **G7** | **Med** | Every `schema.json` declares `additionalProperties:false`, but **no predicate checks it and no validator ever executes the schema**. Extra keys carrying secrets are accepted at envelope, `tenant_context`, `accepted`, `error`, `scope`, and idempotency-record level (F5, F6, F7, F10, F27, F28). The shipped JSON Schemas are decorative with respect to the test suite. |
| **G8** | **Med** | `validApiEnvelope` accepts `kind:"success"` with `data: null` and with `data: []` (F8, F9) — `typeof null === "object"`. The schema says `{"type":"object"}`; the predicate does not. |
| **G9** | **Med** | CTR-IDM-001 `error` is `$ref`-ed to CTR-ERR-001, but `validIdempotency` checks only `error.code`. A `failed` record whose `error` carries a stack trace and `details:{sql:..., api_key:...}` is accepted (F26) — the emptiness rule applied to the API envelope is not applied here. |
| **G10** | **Low** | `scope.operation` is checked as `isText` only; the schema pattern `^[a-z0-9]+(\.[a-z0-9]+)+$` is unenforced (`"DROP TABLE users"` accepted, F24). Same for `created_at`, checked as `isText` (`"not-a-date"` accepted, F25). |
| **G11** | **Med** | Reference guard reads only `<contract-dir>/schema.json`. A broken or path-traversing `$ref` in `manifest.json` (A4), in a nested subdirectory (A8), or in any file not named `schema.json` (A9) is invisible. |
| **G12** | **Med** | `exists()` is `access(F_OK)`, which succeeds on directories: `$ref: "../ctr-ten-001"` is "resolvable" (A5) while unusable to any real resolver. |
| **G13** | **Low** | The *"a `$ref` never escapes the contract catalog"* test passes on `$ref: "https://evil.example.com/tenant.json"` (A7). The remote ref is caught only incidentally by the resolvability test. A network dependency in a schema should be named as one. |
| **G14** | **Low** | Dev/CI divergence: this host's filesystem is case-insensitive, so `$ref: "../CTR-TEN-001/Schema.json"` **passes locally** (A6). CI is `ubuntu-24.04` (case-sensitive) and would fail it. This fails **safe** in CI, but "the guard passed locally" is not evidence it passes in CI, and the guard gives different verdicts on the two platforms. |
| **G15** | **Low** | `CATALOG` is the hardcoded literal `'contract-catalog/shared-kernel'`. A future `contract-catalog/<other>/` subtree would be silently unguarded, and a contract directory with neither `schema.json` nor `manifest.json` is silently skipped (A14). |
| **G16** | **Low** | `manifest.schema` / `manifest.fixtures` existence is checked with no containment constraint: `"schema": "../../../package.json"` passes (A11). |
| **G17** | **Info** | CTR-PAG-001 claims "no duplicate or missing item between pages". Every `items` array in every fixture is `[]`. The claim is structurally untestable by fixture inspection and is not tested. Correctly out of a Draft's reach, but the manifest reads as if it were materialized. |

### What held up

- The pre-fix failure claim is exact and independently reproduced, and the guard is
  demonstrably not tautological (A1/A2/A3).
- All 9 negative fixtures fail for exactly their named reason — no placeholder negatives.
- `index.json` is byte-identical and still 4 Candidate / 10 Draft.
- The cross-package edit is exactly the two `$ref` literals plus `x-amended-by`, proven on
  parsed structures, with the property set and every schema invariant unchanged.
- No test removed, none skipped, `skipped 0 / todo 0`, and every WP-0A-A0-002 floor still
  rejects every re-injected attack.
- The Author's own limitations section already concedes that no validator resolves `$ref`
  at runtime and that the predicates are hand-written. G7 is that concession measured.

### Conditions on this verdict

- **C1 (must close before freeze).** G1 — the public-reference rule is enforced by two
  case-sensitive, scheme-blind checks. Acceptance criterion 5 is not enforced as written.
  A fixture violating it ships green today.
- **C2 (must close before freeze).** G2, G3 — CTR-API-001's "no internal-detail leak" is
  enforced only on `error.details`, and CTR-IDM-001's payload-hash conflict rule has no
  test at all. Both are stated in the manifests as materialized rules.
- **C3 (should close).** G6, G8 — two live predicate defects (`next_cursor` absent;
  `data: null` / `data: []`), independent of any judgement about contract scope.
- **C4 (should close).** G7 — the shipped JSON Schemas encode constraints
  (`additionalProperties:false`, `pattern`, `type`) that nothing executes. Either the
  predicates should mirror them or the divergence should be recorded as a known limit of
  the fixture harness, not left implicit.
- **C5 (should close).** G11, G12 — the reference guard's blind spots (`schema.json` only;
  directories count as resolvable) are the same *class* of blindness that let D3 ship: a
  check that looks at the wrong surface.

None of these makes any **shipped artifact** wrong. Every shipped fixture, `$ref`, index
entry, and schema in `106f91c` was independently verified correct. The conditions are
about the guards' ability to keep them correct, which is precisely what this package
exists to provide.

## Verdict rationale

`test_failed` would be wrong: every Author claim replayed exactly, the defect fix is real,
the guard is genuinely order-correct and non-tautological, the freeze level did not move,
the cross-package edit is minimal and proven so, and no existing protection was weakened.

`test_verified` would also be wrong: acceptance criterion 5 is falsifiable at head by a
fixture that passes `npm run check` green (G1), and two rules the manifests state as
materialized are enforced either partially (G2) or not at all (G3).

## Closing state

```
$ git status --short
?? evidence/WP-0A-CON-002/review-contract.md    <- concurrent Reviewer run, not this run
?? evidence/WP-0A-CON-002/review-security.md    <- concurrent Security run, not this run
?? evidence/WP-0A-CON-002/test-verdict.md       <- this run's only deliverable

$ git diff --stat
(empty — no tracked file modified by this run)

$ npm run check
ℹ tests 59  ℹ suites 0  ℹ pass 59  ℹ fail 0  ℹ cancelled 0  ℹ skipped 0  ℹ todo 0
exit 0
```

`evidence/WP-0A-CON-002/test-verdict.md` is the only file this run created. All test
artifacts — the pre-fix reconstruction, all 14 reference-guard attacks, all 31 fixture
attacks, the planted leaking fixture, and all 9 floor re-injections — were built and
executed **outside the repository** and are not present in it.

VERDICT: test_verified_with_conditions
