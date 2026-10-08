# WP-0A-A0-004 — Author closure of the role findings on PR #212 (2026-10-08)

Author: `/claude/a0_atlas` (A0), through a subagent of A0's workflow run. **A0 executes; it decides nothing.**
This file records what the Author did with each finding of the four role runs on PR #212 at head
`e144077c`. It is not a review, a test verdict or an integration verdict. None of the fixes below is
verified until C0, A1, Q0 and R0 re-read the new head (RFC-2026-025 §5 item 2).

The Owner's words in force: `ให้ A0 กดเอง ลุยตามแนะนำเลย` (2026-10-08, for this PR; transcribed in
`author-records-classifier-ci-2026-10-08.md` §1), the standing `เอาตามที่คุณแนะนำทุกอย่าง`, and
2026-10-06 night `คืนนี้คุณยิงยาว เหมือนเดิมเบย ไม่ต้องถามผม ไล่ทำไปทั้งคืน`. None of them waives a role
verdict, a green `bootstrap` on the final head or an open security finding.

## 1. The role files carried onto the branch

Cherry-picked with `-x`, in this order, onto `e144077c`:

| Role | Source commit | File |
|---|---|---|
| C0 | `216cf95f` | `c0-review-2026-10-07.md` — `changes_requested` (F1 blocks A0's press) |
| A1 | `019654b7` | `a1-review-2026-10-07.md` — no security or privacy objection |
| Q0 | `06900bab` | `q0-review-2026-10-07.md` — `test_verified_with_conditions` |
| R0 | `d92b9245` | `r0-review-2026-10-07.md` — `integration_verified: CONDITIONAL` (C1–C5) |

`origin/main` had not moved (`bd019c9c`), so no merge was needed.

## 2. Disposition of every finding

| Finding | Grade | What A0 did |
|---|---|---|
| C0 F1 / A1-L1 / Q0 Q2 (log half) / R0-2 | Medium (C0, security-class) / Low | **Fixed.** Every log line of the step is printed between `::stop-commands::<token>` and `::<token>::`; the token is 32 hex digits from `/dev/urandom`, checked by `grep -E '^[0-9a-f]{32}$'`. With no valid token, the reason and the output are left out of the log and only the verdict prints. A pinned test reads the log the way the runner does (`TrimStart`, then the stop window) and finds only `stop-commands` and its resume; it also pins the token's form, that it differs between runs, that the summary heading is intact, and the no-token path. |
| C0 F2 / Q0 Q1 / R0-4 | Low | **Fixed.** A stub classifier in the base exercises exit 0 without the `records-only: ` first line, exit 0 with it on a later line, and exit 0 with it first. The mutation that drops the first-line rule now fails a test. |
| C0 F2 (second half) | Low | **Fixed** by the F1 test (a path name holding newlines and `::`). |
| R0-1 | Low (advisory) | **Fixed.** An exit 1 is reported as the classifier's reasons only when its first line begins `NOT records-only (`; any other exit 1 (a crash before the guard) is reported as not a classification. Pinned by two stub cases. Still fail closed either way. |
| A1-L2 / C0 F3 | Low / Info | **Fixed.** The summary carries at most the first 64 KiB of the classifier output (escaped, so at most about 320 KiB), with a note that it was cut; the log keeps all of it. Pinned with 5,000 long lines. |
| R0-3 | Low (advisory) | **Fixed.** The reason (which holds `BASE_REF`) is escaped in the summary like the output. Pinned with a base ref holding `<b>`. |
| Q0 Q2 (classifier half) | Low | **Recorded as owed** to WP-0A-DB-00's owner: the classifier prints path names unquoted, so a forged line can still show, indented and inert, in the log. RFC-2026-007 Amendment 2026-10-08 §C says so. |
| A1-I1 | Info | **Recorded as owed** to WP-0A-DB-00's owner: RFC-2026-025 §6.2 should name the base's copy of the classifier as the one the reader runs, and have the reader compare with the CI line. Not this package's file. |
| A1-I2 | Info | No change: a stale `base.sha` errs only towards NOT RECORDS-ONLY. |
| A1-I3 / Q0 condition | Info | **Still owed**: WP-0A-A0-002's acknowledgement of the `scripts/test-suite-contract.mjs` lines (now 27→30 tests, 146→166 assertions, digest `6ffa7b5c06c5877c`→`5fd8b3166f70762b`) on the merged head. |
| Q0 Q3 | Info | No change: the `mktemp -d` scratch directory lives on a one-use runner. |
| C0 F4 | Info | No change: the Owner's words are verbatim in the manifest, the RFC amendment and the Author record; the merge of this PR puts them on `main`. A0 writes no `product-owner-disposition-*` file in the Owner's name. |
| R0-5 | Record | **Recorded, status unchanged.** RFC-2026-007 Amendment 2026-10-06 and `required_human_authorities[2]` now say that PR #197 merged as `3072e85` on the Owner's `คุณทำเลย` as A0 reported it (`evidence/WP-0A-CON-005/records-transcription-2026-10-06.md` line 41), and that no written disposition of the amendment's content is on record. A0 does not turn the merge into an approval: the amendment stays Proposed and the line stays OWED. |
| R0 C1–C5 | Conditions | C1 needs C0, A1, Q0 and R0 to re-read the new head. C2: `bootstrap` green after the handoff refresh, which this run does **not** do yet. C3: `origin/main` is still `bd019c9c`, an ancestor. C4 and C5 are for the press. |

## 3. Files changed by this closure

- `.github/workflows/ci.yml` — the classification step only (comment block and run body).
- `test-kits/branch-scope.test.mjs` — three tests appended; none of the 27 changed.
- `architecture/decisions/RFC-2026-007-ci-independent-guard-step.md` — Amendment 2026-10-08 §A, §B, §C, §D, and the R0-5 record under Amendment 2026-10-06.
- `work-packages/WP-0A-A0-004.json` — scope, `required_human_authorities[2]`, `amends_without_owning.rationale`, `open_blockers`.
- `scripts/test-suite-contract.mjs` — the three branch-scope lines (declared amendment).
- `test-kits/integrity-manifest.json`, `evidence/VERIFICATION.md` — regenerated.
- This file and the four role files.

## 4. Self-check (Author's, not a verdict)

Mutations of the new step body, each reverted, each caught by `node --test test-kits/branch-scope.test.mjs`:
no `::stop-commands::`, no resume line, no token check, the exit 0 first-line rule removed, the exit 1
first-line rule removed, the summary cap removed, the reason unescaped. Command results are in §5.

## 5. Commands

Run in a worktree of this branch, checked out by name (not detached), Node `v24.20.0`, npm `11.19.0`.

| Command | Exit | Result |
|---|---|---|
| `node --test test-kits/branch-scope.test.mjs` | 0 | 30 tests, 30 pass (27 before) |
| the seven step mutations of §4, each reverted | — | each makes one test fail |
| `npm run record:verification` | 0 | `recorded 734 passing, 0 skipped, 0 todo` (731 before) |
| `npm run regenerate:manifest` (after the record) | 0 | `rebuilt 105 digest(s)` |
| `node scripts/verify-test-coverage-floor.mjs` | 0 | |
| `node scripts/verify-branch-scope.mjs bd019c9c WP-0A-A0-004` | 0 | all 13 changed paths declared, every amendment explains one |
| `node scripts/scan-repository-secrets.mjs` | 0 | |
| `npm run validate:protocol` | 0 | |
| `npm run verify` | — | run by `node scripts/commit-when-clean.mjs`, which commits only on a clean result |

Not done here, on purpose: the handoff refresh (it comes last and alone, after the re-reads), any
push with force, marking the PR ready, any merge, any status change in the manifest.
