# Author closure of the role conditions on WP-0A-A0-004, 2026-10-06

Run: `/claude/a0_atlas` (Author), through a subagent of its workflow. PR
https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/189, branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, role verdicts taken at head `acbcee1`.

A0 executes here under the Product Owner's standing delegation, in the Owner's words
"เอาตามที่คุณแนะนำทุกอย่าง" ("do everything you recommend"). A0 does not decide anything below. Each
change applies a role run's own words, and that role run re-checks it. This file approves nothing,
moves no package status, and is not a re-verification of any finding.

## 1. Role files carried onto the branch

Cherry-picked with `-x`, in this order: `d028755` (C0), `4adfe7c` (A1), `0060adf` (Q0), `ebaf80f`
(R0). They add only `evidence/WP-0A-A0-004/{c0-contract,a1-security,q0-test}-reverify-2026-10-05.md`
and `r0-integration-verdict-2026-10-05.md`, all inside `writable_paths`.

## 2. Conditions closed, each as the role worded it

| Condition | Where | What changed |
|---|---|---|
| R1 / C0 F1 | `independence.cross_vendor_exception` | The quoted item is now marked as the disposition's §1.2 translation of A0's Thai message, not the Owner's words. The record says the message named no package ids, and that the 15-package list (WP-0A-A0-002..009, WP-0A-CON-002..008) is A0's mapping in disposition §3 row 1, by which WP-0A-A0-004 is one of the 15. The Owner's verbatim reply `บืนยันขั้น 2` is kept. `prefer_cross_vendor_review` is still `false`, and the field's meaning is unchanged. |
| R2 / A1 F2 | `ownership.amends_without_owning` | The rationale now says what git history shows. `a5c33fd` (2026-09-04) changed `WP-0A-A0-004.json` only, and no owner manifest records its five-path amendment. `WP-0A-A0-001.json`'s only WP-0A-A0-004 entry is `amended_by[2]`, the ci.yml transfer. `WP-0A-CON-008.json` and `WP-0A-A0-002.json` contain no WP-0A-A0-004 entry. The entries that `git log -S` finds were added in `086921a` and removed in `ae5864d` (both 2026-09-02, before `a5c33fd`). `recorded_on` changed from three manifests to `[]`. `paths` is still `[]`. |

## 3. Recommendations adopted

| Source | Where | What changed |
|---|---|---|
| C0 F2 / Q0 Q4 | The `open_blockers` entry on the pull-request-only branch-scope guard | "inferred ..., not measured by an attempted direct push" now cites the measured refusal at `evidence/g0-tracker-th.md:28`: `GH006: Protected branch update failed` / `Required status check "bootstrap" is expected`, for a direct push made as an admin. |
| A1 F3 | The protected-CI `open_blockers` entry | Now also records `checks[0]` = {`bootstrap`, `app_id` 15368} and `required_conversation_resolution: true`, citing A1 §3.1. |
| A1 F1 | A new `open_blockers` entry | `ci.yml:54` checks out by `head_ref` and does not assert that HEAD equals `pull_request.head.sha`. The finding is LOW and pre-existing. Fixing it in `ci.yml` is a governance change for the Owner (RFC-2026-025 §5 item 6), so it is not made here. |
| Q0 Q5 | The handoff's `tests` entry for `verify-branch-scope.mjs` | Records the final exit 0, measured at this branch's head after the manifest commit. See the §5 addendum. |

A related edit is needed so the record stays true. The old last `open_blockers` entry said "No role verdict
exists for this package at any head", and that stopped being true once the four role files reached the
branch. It now names the four verdicts and says that R3-R6 are still owed. R0 also recommended citing
its §7 acknowledgement in `required_human_authorities[1]` and `open_blockers[3]`. That was not in this
run's list, so it is **not** applied. Both entries still say the acknowledgement is pending, which is
still true of the field in `WP-0A-A0-001.json`.

## 4. Still owed (not done here)

- **R3:** C0 re-checks R1, and A1 re-checks R2. Because the closure commit also touched the
  `open_blockers` entries above, R0 §5 says every required role run may need to re-verify instead. That
  call belongs to the Integration Owner.
- **R4:** run `npm run refresh:handoff` as the last commit, after the re-checks are on the branch.
- **R5:** green `bootstrap` on the final head. **R6:** leave Draft, and merge pinned to that head.
- Flipping `acknowledgement_status` in `WP-0A-A0-001.json`, on a WP-0A-A0-001 branch (R0 §7.3).

## 5. Addendum: measured after the closure commit `f2b56d9`

This was run on the branch name, with Node `v24.20.0` and npm `11.19.0`. `origin/main` = `8c089cc` is an
ancestor of the head, so no merge was needed.

| Command | Exit | Result |
|---|---|---|
| `node scripts/commit-when-clean.mjs` (runs `npm run verify`) for `f2b56d9` | 0 | `clean: exit 0 — tests 692, pass 692, fail 0, skipped 0, todo 0` |
| `node scripts/verify-branch-scope.mjs 8c089cc… WP-0A-A0-004` | 0 | `all 9 changed path(s) are declared, and every amendment explains one` |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-004.json` | 0 | |
| `node scripts/validate-work-packages.mjs` | 0 | |
| `node scripts/verify-test-coverage-floor.mjs` | 0 | |
| `npm run regenerate:manifest` | 0 | no digest moved |

The handoff's `tests` now carries the final exit 0 next to the earlier exit 74 (Q0 Q5). The handoff is
**not** refreshed here. Its cited head is still `40bfc8d`, so `check:handoff` is expected to be red until
R4.
