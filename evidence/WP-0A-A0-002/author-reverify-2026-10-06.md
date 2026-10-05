# WP-0A-A0-002 — Author re-verification at main, and the Owner's step 2 applied

Author run: `/claude/a0_atlas` (Anthropic, Claude Code), acting through a subagent of the Author run.
Date: 2026-10-06. Base: `origin/main` at `8c089cc`.
Branch: `agent/claude/WP-0A-A0-002-contract-test-coverage` (the manifest's `ownership.branch`).

This is Author evidence only. It is not a review, security, test, integration or Product Owner verdict,
it does not advance this package's status, and it does not move Gate G0. Where this file says a condition
is "answered", that is the Author's claim; the role that set the condition decides whether it is closed.

## 0. What this increment changes

Records only, all inside this package's `writable_paths`:

- `work-packages/WP-0A-A0-002.json`
- `evidence/WP-0A-A0-002/author-reverify-2026-10-06.md` (this file, new)
- `handoffs/WP-0A-A0-002-author-handoff.json`

No script, test, contract, RFC, `CONTRIBUTING_AGENTS.md`, CI file or gate changes, so by RFC-2026-025 §5
item 6 this is not a governance PR. The Author does not merge it.

The package's work itself reached main through PR #3 (merge `41e47bf`). RFC-2026-003 reads "Approved
2026-09-02 by the Product Owner" (`architecture/decisions/RFC-2026-003-contract-test-coverage-and-ownership-transfer.md:3`).

## 1. Every condition the latest verdicts set, at main `8c089cc`

The latest verdict of each role is at an old head, and none was re-run after the Author's round-7
remediation (`author-remediation-4.md`):

| Role | Run | Latest verdict | Head |
|---|---|---|---|
| Reviewer | `/claude/c0_contract_reviewer` | `changes_requested` (`review-contract-round7.md:491`) | `ffe36fa` |
| Security | `/claude/a1_bastion` | `security_approved_with_conditions` (`review-security-round7.md:520`) | `d16c382` |
| Tester | `/claude/q0_sentinel` | `test_failed` (`test-verdict-round7.md:283`) | `c631c07` |
| Integration Owner | `/claude/r0_steward` | `integration-verdict.md` | `4e1d6e5` |

These are therefore **re-verdicts owed at main**, not first verdicts. The table maps each condition to what
main shows today. Line numbers are at `8c089cc`.

### 1.1 Reviewer, round 7 (`review-contract-round7.md` "Required changes")

| # | Condition | State at main | Where |
|---|---|---|---|
| C0-1 | Regex-literal state in `stripNonCode`, with cases for `/[/*]/`, a backtick in a regex, and the §3b two-line phantom payload | Answered in part. Regex-literal tracking exists; cases for `/[/*]/` and a backtick inside a regex exist. The §3b two-line payload is not a separate test case. C0 rules whether the backtick case covers it. | `scripts/verify-test-coverage-floor.mjs:190-245`; `test-kits/test-coverage-floor.test.mjs:290-295,480-500` |
| C0-2 | Replace `assert.equal(declared, 54)` with a comparison against the runner's real `pass` | Answered. The literal is gone; the runner reconciles declared against executed (exit 88). | `scripts/run-test-suite.mjs:102-122`; `test-kits/test-coverage-floor.test.mjs:286-288` |
| C0-3 | Every discovered test file must be a manifest key; protect the four unprotected suites | Answered (exit 87). Also re-checked after the run (A1 S1b). | `scripts/verify-test-coverage-floor.mjs:579`; `scripts/run-test-suite.mjs:112` |
| C0-4 | Publish the round-7 author evidence with the attack matrix rows D, E, G, J and their real exit codes | Answered for D, G and J (`author-remediation-4.md:64-71`). Row E (the E4 residual) is answered by §3 of this file, measured. | `author-remediation-4.md` |
| C0-5 | Record the tripwire, the `package.json` entry-point exposure and the E4 residual in `open_blockers` | Tripwire: `open_blockers[1]`. Entry point: `open_blockers[2]`, now closed against CI (§1.3). **E4 was not recorded until this increment**: now `open_blockers[9]`. | `work-packages/WP-0A-A0-002.json` |
| C0-6 | `test-kits/integrity-manifest.json` in `writable_paths` and `outputs.files` | Answered. | manifest |
| C0 non-blocking | Correct acceptance criterion 1; reconcile `outputs.files`; note undigested validators and `ci.yml` | AC1 corrected in this increment (§2). `ci.yml` is digested. | manifest; `test-kits/integrity-manifest.json` |

### 1.2 Security, round 7 (`review-security-round7.md` "Conditions")

| # | Condition | State at main | Where |
|---|---|---|---|
| A1-1 | Record S1 and S1b as a documented limitation of exit 88; never describe `declared === executed` as a guarantee | **Answered differently than asked:** S1 and S1b were fixed rather than only recorded. The post-run path re-runs the digest, manifest-coverage and escaping-path checks before it counts (`author-remediation-4.md` "S1"). The "not a guarantee" wording is now `open_blockers[10]`. A1 rules whether a fix satisfies a condition that asked for a record. | `scripts/run-test-suite.mjs:106-113` |
| A1-2 | Constrain manifest keys to repository-relative paths before any digest is computed or printed (S2) | Answered. Drift is reported without the observed digest. | `scripts/verify-test-coverage-floor.mjs:30-33,382-398` |
| A1-3 | Hash protected files as bytes (S3) | Answered. | `scripts/verify-test-coverage-floor.mjs:388-389` |
| A1-4 | Mirror numeric exit-code handling in the runner (S4) | Answered. | `scripts/run-test-suite.mjs:145` |
| A1-5 | Carry C1 (the secret scanner) as tracked; do not cite a green `scan:secrets` as assurance | Carried: `open_blockers[5]`, updated. WP-0A-A0-003 and WP-0A-A0-005 have since changed the scanner; it is not this package's file. | manifest |
| S5 | Exit 88 rejects table-driven tests (recorded, not fixed) | Recorded in `open_blockers[10]`. | manifest |

### 1.3 Tester, round 7 (`test-verdict-round7.md`)

| # | Finding | State at main | Where |
|---|---|---|---|
| Q0-F1 (blocking) | `package.json`'s `check` chain can be neutered (`&`, `#`, `echo`), and CI ran only `npm run check` | **Answered for CI by work outside this package.** `.github/workflows/ci.yml:69-75` runs the guard as its own workflow step before `npm run check` (WP-0A-A0-004, RFC-2026-007, approved 2026-09-02). Locally a neutered `check` still exits 0; CI no longer depends on it. `open_blockers[2]` closed in place. | `.github/workflows/ci.yml:69-75` |
| Q0-F2 (blocking) | Exit 88 compares integers, so exact compensation cancels | Not fixed. It needs a digested file edited, so it is inside the disclosed digest class. Recorded as `open_blockers[10]`. Q0 decides whether that disposition is acceptable. | manifest |
| Q0-F3 (non-blocking) | A nested template literal invents a phantom declaration | Not fixed. A template literal still ends at its first backtick. Recorded as `open_blockers[11]`. | `scripts/verify-test-coverage-floor.mjs:255-268` |

### 1.4 Integration Owner

`integration-verdict.md` is at `4e1d6e5`, before rounds 5-7. It does not carry forward. A new R0 verdict
at main is owed, and R0 also disposes of the status/tree disagreement (`open_blockers[8]`).

## 2. Acceptance criterion 1

It said "reports 58 passing tests". Every package since has added tests, so the literal was false at every
later head, and the repository stopped typing the count by hand (`dfa7860`). The criterion now requires
every executed test to pass with `skipped` and `todo` zero, the count at or above the floors in
`scripts/test-suite-contract.mjs`, and declared equal to executed. The old text is quoted in the
criterion's own correction note. This narrows nothing: the floors and the reconciliation are stricter than
a typed count.

## 3. The E4 residual, measured

Sandbox copy of `8c089cc` (`git archive`, extracted under the scratchpad, outside the repository). A file
`e4-outside.mjs` sits outside the copy; `e4-link.mjs` at the copy's root is a symlink to it; a new test
`test-kits/e4-probe.test.mjs` imports `../e4-link.mjs` and declares one test.

| Step | Exit | Message |
|---|---|---|
| guard, new test not digested | 87 | discovered test file(s) are not digested in test-kits/integrity-manifest.json |
| guard, digest added | 87 | 1 digested file(s) are not in DIGESTED_FLOOR |
| `node --test test-kits/e4-probe.test.mjs` | 0 | prints `E4 PAYLOAD RAN outside test-kits`, pass 1 |

So the guard never inspects imports, and the code outside the tree runs whenever the file runs. Reaching
a green `npm run check` takes `scripts/test-suite-contract.mjs` and its digest edited in the same commit,
which puts E4 inside the disclosed digest class: only review of the diff catches it. Recorded, not fixed.
Not measured: the full `npm run check` with `DIGESTED_FLOOR` also edited.

## 4. The Owner's step 2, applied to this manifest

Source: `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` (merged in PR #186). The
Owner's words: "บืนยันขั้น 2".

- **Item 1, cross-vendor:** `independence.prefer_cross_vendor_review` is now `false`.
  `cross_vendor_exception` records the withdrawal in RFC-2026-024's form. `open_blockers[6]` is closed in
  place. That WP-0A-A0-002 is one of "the 15" is A0's mapping (disposition §3 row 1).
- **Item 2, successor:** `/claude/r0_steward` succeeds `/root/r0_steward` for the acknowledgements recorded
  pending against it. On this manifest that is `open_blockers[3]` (the RFC-2026-003 amendment
  acknowledgements on WP-0A-A0-001 and WP-0A-CON-001) and `[4]` (the WP-0A-CON-001 addendum). Both stay
  open: naming a successor is not the successor acting. `role_assignments._run_id_disambiguation` now
  says so.
- **Item 3, no Product reviewer:** `role_assignments.product_reviewer_note` records the null slot as a
  decision. This is a tooling package and `review_and_test_gates` has no product step.

### 4.1 The `amended_by` acknowledgers

All three entries in `ownership.amended_by` (WP-0A-A0-005, WP-0A-CON-007, WP-0A-CON-008) named
`/claude/a0_atlas`, the Author of all three amending packages, as acknowledger. An Author cannot
acknowledge its own amendment. R0 found this on PRs #188 and #190, and C0 F5 on WP-0A-A0-005 found it for
all three. Each entry now names `/claude/r0_steward`, this package's Integration Owner, and carries an
`acknowledgement_correction` saying when and why. **No acknowledgement is given:** every
`acknowledgement_status` stays `pending` until `/claude/r0_steward` records it.

## 5. Tests

Node `v24.20.0`, npm `11.19.0`, on the branch name `agent/claude/WP-0A-A0-002-contract-test-coverage`,
never detached. Results are in the handoff's `tests`, which `npm run verify` gates through
`node scripts/commit-when-clean.mjs`.

## 6. Owed, with owners

| What | Owner |
|---|---|
| C0 re-verdict at main | `/claude/c0_contract_reviewer` |
| A1 re-verdict at main, including whether A1-1's fix-instead-of-record is accepted | `/claude/a1_bastion` |
| Q0 re-verdict at main, including Q0-F1 closed by `ci.yml` and the Q0-F2 disposition | `/claude/q0_sentinel` |
| New R0 verdict at main; status/tree disposition; acknowledgements of the three `amended_by` entries and of `open_blockers[3]`/`[4]` | `/claude/r0_steward` |
| The `amended_by` entry on WP-0A-A0-001 for this package's amendment still names `/root/r0_steward` | WP-0A-A0-001's owner, then `/claude/r0_steward` |
