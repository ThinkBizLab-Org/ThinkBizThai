# Q0 test of WP-0A-A0-004 at PR #189, 2026-10-06

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/189, branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, head `acbcee1` (substantive head `40bfc8d`; the
handoff commit `acbcee1` comes after it), base `main @ 8c089cc` (merge-base = `origin/main` = `8c089cc`),
package `WP-0A-A0-004`. Four files: `work-packages/WP-0A-A0-004.json`,
`evidence/WP-0A-A0-004/author-step2-and-retest-2026-10-06.md`, `evidence/WP-0A-A0-004/author-self-check.md`
and `handoffs/WP-0A-A0-004-author-handoff.json`.

The file name keeps the date in the brief (`2026-10-05`). The measurements were taken on 2026-10-06.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent Tester
run `/claude/q0_sentinel`. RFC-2026-024 §3/3-4 requires this disclosure. I share a vendor, a model family
and a parent with the Author. The Author wrote my brief. I wrote none of the PR's content and I fix
nothing. This file is not a merge authorisation or a G0 signature, and it moves no package status. A
measurement against the tree stands on its own whoever runs it. The guards that read the branch name ran
in a private clone checked out on the branch **name** (§2), not on a detached HEAD.

## 1. Was there an earlier Q0 verdict to re-verify?

**No.** The brief asks me to re-check "my earlier conditions". None exist.

- `git log --all -- 'evidence/WP-0A-A0-004/*'` lists only Author commits.
- A grep for `A0-004` across `evidence/` and `handoffs/` finds no Q0, C0, A1 or R0 file for this package.
- The manifest says so itself (`open_blockers[6]`), and so does the Author evidence (§1).

So this is a **first** Q0 verdict. It covers the whole package as `reviewer_instructions[0]` asks, not
only this increment. No earlier condition is open or closed.

## 2. Measured and read

**Measured** means I ran it in this session and quote the result. **Read** means I opened the file or line
and compared it with the claim, without running anything.

| # | Claim under test | How | Result |
|---|---|---|---|
| M1 | The package's core claim. Neutering `scripts.check` leaves `npm run check` green, and the workflow's separate guard step still fails. | Measured. `git archive` of `acbcee1` into two sandboxes outside the repository. In A, ` &` was appended to the last step. In B, every ` && ` became ` \|\| `. `node scripts/regenerate-integrity-manifest.mjs` ran in each (`rebuilt 91 digest(s)`), so the digest tripwire is not what fires. | A: `npm run check` exit **0**, 0 test-count lines. `node scripts/verify-test-coverage-floor.mjs` exit **81** (`check step "npm run test:bootstrap &" contains "&"`). B: `npm run check` exit **0**, 0 test-count lines. The guard exits **81** (`contains "\|" …`). This reproduces the Author's §5.1 table exactly. |
| M2 | AC1/AC2: the guard is its own workflow step, before `npm run check`. | Read `.github/workflows/ci.yml` at the head. | `:74-75` is `Verify test-integrity guard` (`node scripts/verify-test-coverage-floor.mjs`). `:76-77` is `Validate repository bootstrap` (`npm run check`). **Pass.** |
| M3 | AC3/AC5: only `ci.yml` moved, the transfer is recorded, and no package overlaps. | Measured with a node script over `work-packages/`. Also `validate-work-package-ownership.mjs`. | `ci.yml` is in no `writable_paths` except WP-0A-A0-004's. It is absent from WP-0A-A0-001's `writable_paths` and `outputs.files`. `WP-0A-A0-001.json` `ownership.amended_by[2]` = {`WP-0A-A0-004`, RFC-2026-007, `acknowledgement_required_from: /root/r0_steward`, `pending`}. Ownership validator exit 0. **Pass.** |
| M4 | AC6, as annotated: the branch resolves through its manifest, and an unclaimed branch is refused. | Measured. `node scripts/verify-branch-identity.mjs` | This branch prints `WP-0A-A0-004` (exit 0). `agent/claude/nothing-here` exits **75** ("No work package declares ownership.branch …"). The annotation is accurate: since `8df0f4c` (`test(protocol): … resolve a branch by its manifest`, 2026-09-02) the step resolves the branch at `ci.yml:86-115` and does not parse it. **Pass, judged against the annotated behaviour.** |
| M5 | The authority correction: RFC-2026-007, not RFC-2026-003. | Read and measured. | `RFC-2026-007:3` = `Status: Approved 2026-09-02 by the Product Owner`. `:67-70` transfer `ci.yml` to WP-0A-A0-004. `RFC-2026-003` mentions neither `A0-004` nor `ci.yml` (grep count 0); its title is the contract-test coverage and `package.json` transfer. `git show 3737893:work-packages/WP-0A-A0-004.json` carries the RFC-2026-003 line at `:46`. `WP-0A-A0-002.json:46` is the identical string. `82aae60` = "Product Owner approves RFC-2026-003 through -009" (2026-09-02). **The correction is true, and so is the removal of the "RFC-2026-007 is Proposed" blocker.** |
| M6 | The step-2 items are applied as the disposition says. | Read `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` §2-§3, and RFC-2026-024 §3. | §2 quotes the Owner as `บืนยันขั้น 2`, the string in `cross_vendor_exception`. Row 1's package list (A0's mapping) is "WP-0A-A0-002..009 and WP-0A-CON-002..008", which includes A0-004. `prefer_cross_vendor_review: false`, and the exception is replaced by a withdrawal sentence, not deleted (RFC-2026-024 §3/1-2). Independence is restated as §3/3-5. Row 2: the successor is named, and the manifest says the acknowledgement stays pending, matching the row's "Naming a successor is not the successor acting". Row 3: `product_reviewer_note` agrees, and `review_and_test_gates` has no product step. **Faithful.** |
| M7 | The protected-CI blocker is rewritten correctly. | Measured, read-only: `gh api repos/ThinkBizLab-Org/ThinkBizThai/branches/main/protection`. | `contexts: ["bootstrap"]`, `strict: true`, `enforce_admins: true`, force-push `false`, deletion `false`, `required_pull_request_reviews` absent. This matches the manifest's `open_blockers[2]`. |
| M8 | The quiet diff behind the rebase claim. | Measured. `git diff --quiet e1fa28e 8c089cc -- .github/workflows/ci.yml package.json scripts/verify-test-coverage-floor.mjs` | exit 0. |
| R1 | Not-done item 3: does `evidence/g0-tracker-th.md` still say protected CI is externally blocked? | Read: grep for `external constraint`, `protected CI` and `branch protection`. | No. `:28` marks the row `complete`. `:93` strikes through the old 403 line, and `:94` says protection has worked since 2026-09-02. Nothing is owed there (see Q4 for one consequence). |

## 3. Repository commands (private clone on the branch name)

Private clone, branch `agent/claude/WP-0A-A0-004-ci-independent-guard-step`, checked out by name at
`acbcee1`. Node `v24.20.0`, npm `11.19.0`. `git status` was clean before and after.

| Command | Exit | Result |
|---|---|---|
| `git branch --show-current` | 0 | `agent/claude/WP-0A-A0-004-ci-independent-guard-step` (not detached) |
| `npm ci --ignore-scripts` | 0 | |
| `node scripts/verify-test-coverage-floor.mjs` (`required_tests[1]`) | 0 | standing alone |
| `node scripts/validate-work-package-ownership.mjs work-packages` (`required_tests[0]`) | 0 | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-004.json` | 0 | |
| `node scripts/validate-work-packages.mjs` | 0 | accepts the new `product_reviewer_note` and the empty `amends_without_owning.paths` |
| `npm run check` (`required_tests[2]`, `verify`) | 0 | `tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0` |
| `node scripts/verify-branch-identity.mjs <branch>` | 0 | `WP-0A-A0-004` |
| `node scripts/verify-branch-scope.mjs 8c089cc… WP-0A-A0-004` | 0 | `all 4 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` | 0 | `describes the branch: nothing substantive after its cited head` (handoff cites `40bfc8d`; `acbcee1` touches only the handoff) |
| `gh pr view 189` | 0 | OPEN, Draft, MERGEABLE, head `acbcee1`. Required check `bootstrap` was **IN_PROGRESS** on both reads (run 37358669435), so it was not measured green. |

The package declares no database test, so none was run and port 5513 was not used.

## 4. Findings

| ID | Grade | Finding |
|---|---|---|
| Q1 | Info | The brief assumed an earlier Q0 verdict. None exists (§1). This file is the first Q0 verdict, and C0, A1 and R0 still owe their first verdicts too, as `open_blockers[6]` says. |
| Q2 | Info (merge precondition) | CI `bootstrap` on `acbcee1` was in progress when I finished. Locally, `npm run check` is green on the branch name. A green required run on the final head is still a precondition I could not observe. |
| Q3 | Info (merge precondition) | If this file is carried onto the PR branch, it lands after the handoff commit. A0 must then run `npm run refresh:handoff` again, so the handoff is the last commit (RFC-2026-025 §2 item 1). |
| Q4 | Info | `open_blockers[5]`'s 2026-10-06 note says direct pushes to `main` being refused is "inferred …, not measured by an attempted direct push". `evidence/g0-tracker-th.md:28` records that measurement: a direct push to `main` as admin was refused with `GH006: Protected branch update failed`. The note understates the evidence, so it is not a defect. The same entry's base text says "protected CI is still an open Gate G0 item". That reads against the tracker row now marked `complete`, but the appended note covers it. Optional wording only. |
| Q5 | Info | The handoff's `tests` entry for `verify-branch-scope.mjs` records the **before** state (exit 74). The final exit 0 appears only in the PR body. I measured exit 0 at the head (§3), so the gap is only in the record. `amends_without_owning.recorded_on` still lists three manifests while `paths` is `[]`. The rationale says why, and the guard accepts it. |
| Q6 | Info | The acknowledgement at `WP-0A-A0-001.json` `amended_by[2]` is still `pending` against `/root/r0_steward` (M3). It is owed by `/claude/r0_steward` in WP-0A-A0-001's file. The manifest records it correctly as pending. Whether it gates this PR is R0's call, not Q0's. |

There is no Blocker, Major or Minor finding. I found no defect in the package or in this increment.

## 5. Verdict

**`test_verified`** at head `acbcee1`, for what this role tests:

- The package's load-bearing behaviour reproduces independently (M1). Both neutered forms of
  `scripts.check` leave `npm run check` at exit 0 with no test run. The workflow's own guard step exits 81
  on both.
- All six acceptance criteria hold at the head. AC6 is judged against its annotated, stricter behaviour
  (M2-M4).
- Every declared test passes on the branch name: 692/692, with skipped and todo at 0.
- The authority correction, the step-2 application and the protected-CI rewrite each match their sources
  (M5-M7).

- **Stop-the-line: none.** No secret, tenant data, migration, external side effect or contract meaning is
  touched. The sandboxes were `git archive` copies outside the repository.
- **Q0 findings block nothing.** The merge still waits on preconditions outside this role:
  - first verdicts from C0 `/claude/c0_contract_reviewer`, A1 `/claude/a1_bastion` and R0
    `/claude/r0_steward`;
  - a green `bootstrap` run on the final head (Q2);
  - a refreshed handoff as the last commit (Q3).
