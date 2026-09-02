# WP-0A-A0-002 — Independent Tester re-verification of the remediation delta

Tester run: `/claude/q0_sentinel` (Anthropic, `claude-opus-5`)
Delta verified: `1873ade..9403484`
Branch: `agent/claude/WP-0A-A0-002-contract-test-coverage`
Date: 2026-08-31

**Independent Tester evidence only.** This is not Reviewer, Security, Integration,
Product Owner, merge, or Gate G0 approval, and it does not move Gate G0. This run did
not author any part of the change under test. It re-verifies only the delta
`1873ade..9403484`; the conclusions recorded against `1873ade` in
`evidence/WP-0A-A0-002/test-verdict.md` are not restated here.

## Toolchain observed

| Item | Declared | Observed |
|---|---|---|
| Node | `24.20.0` | `v24.20.0` |
| npm | `11.19.0` | `11.19.0` |

Every command below was run through a login shell (`zsh -lc`) from the repository root.

## 1. Head-of-branch baseline

| Command | Exit | Result |
|---|---|---|
| `npm run check` at `9403484` | `0` | `tests 40 / suites 0 / pass 40 / fail 0 / cancelled 0 / skipped 0 / todo 0` |

The Author's claim of 40 is confirmed, including `skipped 0` and `todo 0`.

### Count decomposition (40)

Counted by `test(` declarations per file; the total is exact, not inferred.

| File | Tests |
|---|---|
| `test-kits/role-separation.test.mjs` | 8 |
| `test-kits/test-coverage-floor.test.mjs` (**new in this delta**) | 8 |
| `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | 6 |
| `test-kits/work-package-ownership.test.mjs` | 6 |
| `test-kits/capability-profile.test.mjs` | 4 |
| `test-kits/toolchain-contract.test.mjs` | 3 |
| `test-kits/repository-json.test.mjs` | 2 |
| `test-kits/secret-scan.test.mjs` | 2 |
| `test-kits/work-package-discovery.test.mjs` | 1 |
| **Total** | **40** |

32 (at `1873ade`) + 8 (the new guard suite) = 40. The delta adds tests and removes none.

## 2. Injected regressions — real exit codes observed

Every row was produced by editing the working tree, running `npm run check` through a
login shell, recording the true exit status, then restoring exactly and confirming
`git diff` was empty before the next row.

| # | Injected regression | Author claim | **Real exit observed** | Match |
|---|---|---|---|---|
| R1 | `test:bootstrap` reverted to `node --test 'test-kits/*.test.mjs'` | 76 | **76** | yes |
| R1c | R1 applied to a clean `1873ade` tree (counter-factual) | `0` | **0**, `tests 26 / pass 26 / fail 0` | yes |
| R2 | pattern left unquoted (`node --test test-kits/**/*.test.mjs`) | 74 | **74** | yes |
| R3 | pattern matching nothing (`'no-such-dir/**/*.test.mjs'`) | 75 (as written) | **76** | **no — see below** |
| R4 | suite emptied below the floor (7 files on disk) | 75 | **75** | yes |
| R5 | suite confined to one directory (8 files, `test-kits/` only) | 77 | **77** | yes |
| — | corrected state restored | `0` | **0**, `tests 40 / pass 40` | yes |

### R1 / R1c — the central claim is proven, not merely asserted

The counter-factual was verified against a pristine `1873ade` tree extracted with
`git archive` into a scratch directory outside the repository, so no working-tree state
could contaminate it:

- At `1873ade` with the superseded glob: `npm run check` exits **`0`**, `tests 26 / pass 26 / fail 0`.
  32 − 26 = **6 tests silently not executed** — precisely the six contract tests in
  `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` that this work package
  exists to protect. This is the silent-green defect, reproduced live.
- At `9403484` with the identical change: `npm run check` exits **`76`** and names the
  file by path: `pattern 'test-kits/*.test.mjs' does not match 1 discovered test file(s):
  test-kits/contracts/shared-kernel-contract-catalog.test.mjs. These would silently never run.`

The Author's central claim is **confirmed**. For this specific regression the guard does
what it says.

### R3 — the Author's evidence table is inaccurate

`evidence/WP-0A-A0-002/author-remediation.md` collapses two distinct states into one row:
`pattern matching nothing / suite emptied | exit 75`. These are different code paths and
they do not both exit 75:

- **pattern matching nothing** with the suite intact → exit **76** (the unmatched-files
  path), not 75.
- **suite emptied below the floor** → exit **75**.

The guard behaves correctly in both cases; the *documentation* of it is wrong. The
Author's own test file is right where the prose is wrong — `test-kits/test-coverage-floor.test.mjs`
asserts `code === 76` for `'no-such-dir/**/*.test.mjs'`. This is a recording defect in the
remediation evidence, not a defect in the guard. It must be corrected before the evidence
is relied on, because it misstates which failure mode produces which code.

## 3. Adversarial attack on the guard — **two bypasses found**

Condition C1 was that a green `npm run check` could execute nothing. I attempted to
construct that state at head `9403484`. **I succeeded.** Both results below are real,
reproduced, and restored.

### BYPASS 1 (critical) — a green `npm run check` that executes zero tests

```
"test:bootstrap": ": node --test 'test-kits/**/*.test.mjs'"
```

| Stage | Result |
|---|---|
| `npm run verify:coverage-floor` | exit `0` — guard satisfied |
| `npm run check` | **exit `0`** |
| Tests executed | **zero** — no test runner output at all |

The guard extracts the pattern with the regular expression `/--test\s+'([^']+)'/` applied
to the *declared script string*. It therefore validates a **substring of a declaration**,
never that `node --test` is the command actually invoked. Any prefix that neutralises the
command — here the shell no-op `:` — leaves the pattern textually present and the guard
satisfied, while nothing runs. `npm run check` exits `0` having executed no test.

This is condition C1 reproduced verbatim at head: *a green run that executed nothing.*

A related variant, `node --test 'test-kits/**/*.test.mjs' || true`, also passes the guard
and exits `0`; it ran all 40 tests here only because all 40 currently pass, but it
permanently swallows every future failure while the guard reports success.

### BYPASS 2 (high) — guard passes a pattern that drops all six contract tests

```
"test:bootstrap": "node --test 'test-kits/**.test.mjs'"
```

| Stage | Result |
|---|---|
| `npm run verify:coverage-floor` | **exit `0`** — guard satisfied |
| `node --test` actually executed | **34 of 40 tests** — all 6 contract tests missing |

The guard's `globToRegExp` expands a bare `**` (not followed by `/`) to `.*`, which
crosses directory separators. Node's own glob does not: in a non-standalone segment,
`**` behaves as a single-segment `*`. I confirmed the divergence directly — in an isolated
scratch tree of 7 top-level plus 1 nested test file, `node --test 'test-kits/**.test.mjs'`
reported `tests 7`, never descending into the nested directory, while the guard's matcher
accepted the pattern as matching all 8.

The guard therefore does not faithfully model the runner whose behaviour it exists to
constrain. This is the **same defect class as the original WP-0A-A0-002 bug** — a pattern
that silently stops descending into `test-kits/contracts/` — and the guard passes it.

The full `npm run check` still failed here (exit 1), but **not because of the guard**. It
failed on a separate literal-string assertion inside the test file,
`assert.equal(pattern, 'test-kits/**/*.test.mjs')`. That assertion, not the guard's
matching logic, is what actually pins the pattern. It is a useful backstop, but it only
fires if the test file itself is executed — and Bypass 1 shows the file need not execute
at all.

### Guard floor and directory checks are satisfiable without any test existing

`assertCoverage` counts **files on disk**, never tests. Verified directly against the
exported functions using a synthetic tree outside the repository: 8 files named
`*.test.mjs` across two directories, each containing only the comment `// no tests here`
and **zero** `test()` declarations, produce `GUARD VERDICT: PASS`. The floor of 8 and the
two-directory rule are structural file-shape checks, not coverage checks.

### Attacks that the guard correctly withstood

| Attempt | Result |
|---|---|
| `--test-name-pattern='zzz-matches-nothing'` appended after the pattern | exit `0`, `tests 40` — flag lands after the positional argument and is not consumed by node; no reduction |
| `--test-name-pattern` / `--test-shard` placed *before* the pattern | exit **74** — guard rejects, the regex requires `--test` immediately followed by a quoted pattern |
| double-quoted pattern instead of single-quoted | exit **74** — rejected (strict, arguably over-strict: a legitimate double-quoted rewrite is refused) |
| rename `test-kits/` away entirely | exit **1** — fails, but see the defect below |

### Additional guard defect — non-numeric error code crashes the handler

Renaming `test-kits/` makes `discoverTestFiles` throw an `ENOENT` error whose `.code` is
the **string** `'ENOENT'`. The handler is `process.exit(error.code ?? 65)`, which on Node
24 throws `ERR_INVALID_ARG_TYPE`. The result is a raw stack trace and exit `1` instead of
the intended diagnostic. The safety property holds — the run does fail non-zero — but the
guard crashes rather than reporting, and the `?? 65` fallback never engages for any
non-numeric error code.

## 4. Guard ordering in `npm run check`

Confirmed. The resolved order is:

1. `node scripts/verify-toolchain.mjs`
2. `npm run scan:secrets`
3. `npm run validate:protocol`
4. **`npm run verify:coverage-floor`**
5. `npm run test:bootstrap`

The guard runs **before** `test:bootstrap`, as claimed.

I record a dissent on the framing that "running before" makes the guard stronger. For
fail-fast on declaration drift, before is correct. But a check that runs before the test
run **structurally cannot observe what the test run did**. It can only inspect a declared
string and the file tree. That is exactly why Bypass 1 works. Closing C1 as stated —
"a green run must never mean executed nothing" — requires an assertion on the **actual
executed test count** after the runner exits (for example, parsing the reporter's
`tests N` and requiring `N >= floor`). No such assertion exists in this delta.

## 5. Guard fault injection — the new tests are genuinely coupled

`assertCoverage` was made a no-op by inserting an early `return` into
`scripts/verify-test-coverage-floor.mjs`.

| Stage | Result |
|---|---|
| `npm run test:bootstrap` against the broken guard | **exit `1`**, `tests 40 / pass 36 / fail 4` |
| Failing tests | superseded glob; pattern matching nothing; collapsed suite; single-directory suite |
| `npm run verify:coverage-floor` against the broken guard | exit `0` (expected — the guard is neutered) |
| File restored | byte-identical to the pre-injection copy (`diff` reports identical); `git status --short` empty |

**The new test file is not self-satisfying.** It fails when the guard is broken. This
condition is met.

The four tests that did *not* fail are the ones that do not route through `assertCoverage`
(`extractTestPattern`, `globToRegExp`, `discoverTestFiles`, and the live
`verifyTestCoverageFloor` call), which is the correct and expected partition.

## 6. Nothing weakened

| Check | Result |
|---|---|
| Test files removed or renamed in the delta | none — one file **added** (`test-kits/test-coverage-floor.test.mjs`) |
| `.skip` / `.todo` / `.only` / skip markers in any test file | none found |
| `skipped` / `todo` in the head run | `skipped 0 / todo 0` |
| `.github/` touched by this delta | **no** (directory exists and is unmodified) |
| `package-lock.json` touched by this delta | **no** (file exists and is unmodified) |
| Pre-existing validator scripts modified | **none** — `scripts/` gained only the new guard |

All validators re-run individually at head, each through a login shell:

| Command | Exit |
|---|---|
| `node scripts/verify-toolchain.mjs` | `0` |
| `node scripts/scan-repository-secrets.mjs` | `0` |
| `node scripts/validate-work-packages.mjs` | `0` |
| `node scripts/validate-capability-profiles.mjs` | `0` |
| `node scripts/validate-work-package-ownership.mjs` | `0` |
| `node scripts/verify-test-coverage-floor.mjs` | `0` |

Five validators plus the new guard: all exit `0`. `scan-repository-secrets.mjs` exiting
`0` continues to prove very little — see Security C1, which this delta explicitly leaves
open.

## 7. Disposition of this run's original conditions C1–C5

| Condition | Disposition |
|---|---|
| **C1** — a green run can execute nothing | **STILL OPEN — narrowed, not closed** |
| **C2** — only the A0-001 amendment is load-bearing | **CLOSED (as a record)** |
| **C3** — stale head SHA in the handoff | **CLOSED** |
| **C4** — Tester role assignment not recorded | **CLOSED** |
| **C5** — concurrent runs writing into the tree | **SUPERSEDED — replaced by N2 below** |

**C1 — still open.** The delta genuinely closes the *declaration-drift* subclass: a
reverted glob, an unquoted pattern, a shrunken suite, and a collapsed directory now all
fail loudly with distinct codes, where the first of those previously exited `0` having
skipped six tests. That is real, verified progress and it is the subclass the original
defect fell into. But the condition as written — a green run must never mean "executed
nothing" — is **not** met: Bypass 1 produces `npm run check` exit `0` with zero tests
executed at head `9403484`, and Bypass 2 shows the guard passing a pattern that drops the
six contract tests. The guard reasons about a declared string and a file tree; it never
observes execution. C1 is narrowed from "trivially reachable" to "reachable by editing
`test:bootstrap` in a way the guard's parser does not model", which is a meaningful
improvement, but it is not closure.

**C2 — closed as a record.** `RFC-2026-003` now carries a necessity table distinguishing
the forced WP-0A-A0-001 amendment from the three anticipatory WP-0A-CON-001 ones, and
Decision 3 now names all three removed globs including `fixtures/contracts/**`. This
matches what this run observed at `1873ade`. Whether an anticipatory cross-package
amendment carries the same authority as a corrective one remains a Reviewer / Integration
Owner ruling, not a Tester finding — unchanged.

**C3 — closed.** `handoffs/WP-0A-A0-002-author-handoff.json` line 8 now records
`"head_revision_or_patch_checksum": "1873ade"`, replacing `pending-commit`, and adds a
`superseded_by` pointer to the remediation document.

**C4 — closed.** `work-packages/WP-0A-A0-002.json` line 29 now records
`"tester_agent_run_id": "/claude/q0_sentinel"`.

**C5 — superseded.** The working tree is now clean; the concurrent runs' artifacts were
committed. The condition as phrased no longer describes the tree. It is replaced by N2.

## 8. New findings in this delta

**N1 — the Integration Owner run id in the manifest names a run that does not exist.**
`work-packages/WP-0A-A0-002.json` line 30 records
`"integration_owner_agent_run_id": "/claude/r0_steward"`. No capability profile declares
that run id; the declared profiles are `/claude/{a0_atlas,a1_bastion,c0_contract_reviewer,q0_sentinel}`
and `/root/{,a1_bastion,a5_loom,a6_relay,c0_contract_reviewer,q0_sentinel,r0_steward}`.
Every other reference in the repository — including line 190 of the same file, both
`amended_by.acknowledgement_required_from` fields, and the commit message — names
`/root/r0_steward`, described as an OpenAI Codex run. This field was **introduced by this
delta** (absent at `1873ade`), in the exact field the remediation claims to have
completed under R6/R7, and `validate-capability-profiles.mjs` exits `0` without catching
it. A benign reading exists — this package's own Integration Owner may be intended as a
future Claude Code run distinct from the two amended packages' Codex owner, which the
declared writable path `.agents/capability-profiles/cc-r0-steward.json` would support.
But the remediation document and the commit message then contradict each other on the
blocking reason: the document says "`/claude/r0_steward` has not yet recorded its own
capability declaration" while the commit message says "`/root/r0_steward` has not declared
its capability". One of the two is wrong. This is a separation-of-duties record error and
needs Reviewer / Integration Owner clarification before merge; it is not a test failure.

**N2 — the Author's commit contains three other independent roles' evidence artifacts.**
`9403484` adds `evidence/WP-0A-A0-002/test-verdict.md` (this run's own prior verdict),
`review-contract.md`, `review-security.md`, and the `cc-a1-bastion.json` /
`cc-c0-contract-reviewer.json` / `cc-q0-sentinel.json` capability declarations. These were
the uncommitted concurrent-run artifacts recorded as C5. Committing them resolves the
dirty tree, but it means the Author has taken custody of three independent roles' verdicts
inside its own commit. Because the files were untracked before, no diff can demonstrate
they were carried across unaltered, and the Author cannot attest to that on the
independent roles' behalf. This run confirms that the committed
`evidence/WP-0A-A0-002/test-verdict.md` still carries this run's own conditions C1–C5 and
its `VERDICT: test_verified_with_conditions` line unchanged. The Reviewer and Security
runs should confirm the same for their own artifacts. Chain-of-custody observation for
Integration disposition, not a falsified claim.

**N3 — the guard rejects legitimate double-quoted patterns.** `extractTestPattern`
requires single quotes. A maintainer rewriting `test:bootstrap` with double quotes — a
semantically identical and portable change — gets exit `74`. Over-strictness fails safe,
but it will read as a false positive and invites the wrong fix.

## 9. This run's own writes

This run wrote exactly one file: `evidence/WP-0A-A0-002/test-verdict-remediation.md`
(this document). Nothing was committed or pushed. Every injected regression was restored
and verified empty via `git diff` before the next was applied. All scratch work
(the `git archive` counter-factual tree, the synthetic floor tree, captured logs) was
performed outside the repository and left no artifact in it.

### `git status --short` and `git diff --stat` at completion

```
git status --short
?? evidence/WP-0A-A0-002/test-verdict-remediation.md

git diff --stat
(empty — no tracked file modified)
```

The only change in the repository is this run's single deliverable.

## Verdict

The central claim is **proven**: reverting `test:bootstrap` to the superseded glob exits
`0` with 6 tests silently unexecuted at `1873ade` and exits `76` naming the orphaned file
at `9403484`. All four claimed exit codes reproduce (74, 75, 76, 77), the guard runs
before `test:bootstrap`, the new suite genuinely fails against a broken guard, no test was
removed or skipped, `.github/` and `package-lock.json` are untouched, and all five
validators plus the new guard exit `0` at 40/40.

I cannot return `test_verified` unconditionally. Condition C1, which this delta is
principally offered to close, is **not closed**: I constructed a state at head `9403484`
in which `npm run check` exits `0` having executed zero tests, and a second in which the
guard accepts a pattern that drops all six contract tests. The guard validates a declared
string, not an execution. The remediation is a real and substantial narrowing of the
defect class, and it is correct as far as it goes — but the Author's framing of C1 as
"closed" overstates it, and the R3 row of the remediation evidence misstates an exit code.

Conditions carried forward for Reviewer / Security / Integration Owner disposition:
**C1 (narrowed, still open)**, **N1**, **N2**, **N3**, plus the guard's non-numeric
`process.exit` defect and the R3 documentation correction.

This is independent Tester evidence only. It is not Reviewer, Security, Integration,
Product Owner, merge, or Gate G0 approval.

VERDICT: test_verified_with_conditions
