# Author disposition of the role findings on PR #197 (WP-0A-A0-004 CI increment, 2026-10-06)

Run: `/claude/a0_atlas` (Author), through a subagent of its workflow. Branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, checked out by name, starting at head
`6fa511fd`. This file approves, verifies and merges nothing. It records what the Author changed
in answer to the four role runs, and what stays owed.

## 1. Authority

The Owner's delegation, verbatim: `เอาตามที่คุณแนะนำทุกอย่าง` ("do everything as you recommend").
It covers the Author fixing findings the roles raised. It does NOT cover the Owner's disposition
of RFC-2026-007 Amendment 2026-10-06, nor the merge: this PR changes CI, so under RFC-2026-025 §5
item 6 the Owner merges it personally.

## 2. Role evidence carried onto the branch (`git cherry-pick -x`)

| Role | Commit | Verdict | File |
|---|---|---|---|
| C0 | `078fa224` | approved_with_conditions | `c0-ci-increment-2026-10-06.md` |
| A1 | `2610a11c` | no objection, four LOW | `a1-ci-increment-2026-10-06.md` |
| Q0 | `82b9faf0` | test_verified_with_conditions | `q0-ci-increment-2026-10-06.md` |
| R0 | `97876483` | integration_verified, conditional | `r0-ci-increment-2026-10-06.md` |

`origin/main` had moved to `25663e3` (PR #195). It was merged without conflict (R0-T1). The
integrity manifest was regenerated after the merge; only the three files this increment changed
moved digest (`ci.yml`, `test-suite-contract.mjs`, `branch-scope.test.mjs`).

## 3. Each finding

| Finding | Disposition |
|---|---|
| C0 F1, A1 F4, Q0 Q10, R0-F1 (MEDIUM/Minor): a path git quotes skips the control | **Fixed.** The diff is `git -c core.quotePath=false diff -z --no-renames --name-only`, written to a file and matched with `grep -zE`; output is printed with `tr '\0' '\n'`. New test: Thai, `"`, `\`, TAB and newline names under `db/` and `tests/db/` all RUN; a quoted name off the surface still skips. |
| A1 F1 (LOW): `GNUmakefile` / `makefile` | **Fixed.** `DB_SURFACE` now has `(GNUmakefile\|makefile\|Makefile)$`; both added to the surface test. |
| A1 F2, C0 F3 (LOW), R0-F4 (observation): base not on `main` | **Fixed.** The decision step's `if:` adds `github.event.pull_request.base.ref == 'main'`; a stacked PR leaves `skip` unset and runs the control. Pinned by the static test. |
| A1 F3 (LOW): `.gitattributes`, symlinks | **Fixed.** `DB_SURFACE` adds `(.*/)?\.gitattributes$`. The step lists both trees with `git ls-tree -r -z` and RUNS if either holds mode `120000` (none exist today). Tests: a surface link to a changed off-surface file, a link added off the surface, and a link only in the base. |
| A1 I1 (INFO): PR code writing `GITHUB_PATH`/`GITHUB_ENV` | **Recorded** in RFC §E ("A hostile author"). Not fixable inside this step; the same code can already neuter the control. |
| Q0 Q11, R0-F3: two-dot not pinned | **Fixed.** New test: a branch behind a `main` that changed `db/` RUNS; the case asserts a three-dot diff would see only `docs/`. |
| R0-F2 (LOW): diff-failure clause unreached | **Fixed.** New test removes the base commit's root tree object, so `cat-file -e` passes and `git diff` exits 128; asserts the "could not be computed" message. |
| Q0 Q12 (INFO) | No change; defence in depth, as Q0 says. |
| Q0 Q13 (INFO): `-eo pipefail` vs `-e` | **Fixed.** Tests run `bash --noprofile --norc -e`; RFC §D and the test comment corrected. |
| Q0 Q14 (INFO): SKIPPED branch never run on the platform | **Recorded** in RFC §E as owed: read the log of the first PR into `main` after merge that touches no surface path. This PR touches `.github/`, so it cannot exercise that branch. |
| C0 F2 (LOW): §C beyond the Owner's words | **Owed to the Owner.** The Owner's disposition must name §C (checkout assertion) explicitly. Not an Author act. |
| R0-O1 (INFO): "GOVERNANCE label" | **Corrected here.** PR #197 carries no label; the repository has no `GOVERNANCE` label. Governance is marked only by the title prefix `GOVERNANCE:` and by the records in this branch. The earlier wording was in A0's chat report, not in a repository file. |
| R0 C1 (sync, handoff last and alone) | Done in this push: `main` merged, `refresh:handoff` committed last and alone. |
| R0 C2 (bootstrap green on the final head, control actually ran) | To be read from the CI run on the pushed head; recorded in the PR, not here. |
| R0 C3, C4 (A1/Q0 confirmation, C0 review, re-check of fixes) | **Owed.** Every fix above changed `ci.yml` and tests, so C0, A1, Q0 and R0 must re-check the new head. |
| R0 C5, C6 (Owner disposes of the amendment; Owner un-drafts and merges) | **Owed to the Owner.** The Author may mark the PR ready for review after a green CI; it does not merge. |

## 4. Mutation check of the new step (local, Node 24.20.0)

Each mutant applied to `ci.yml` alone and `node --test test-kits/branch-scope.test.mjs` run:

| Mutant | Failing tests |
|---|---|
| drop `-z` from `git diff` | 1 |
| drop `-z` from `grep` | 2 |
| three-dot `BASE...HEAD` | 1 |
| `\|\| true` after the diff | 5 |
| ignore the symlink result | 1 |
| drop `base.ref == 'main'` | 1 |
| `Makefile$` only | 1 |
| drop `.gitattributes` | 1 |
| list only the head tree (drop the base listing) | 1 |
| list only the base tree (drop the head listing) | 1 |

All ten are killed. `branch-scope.test.mjs`: 20 tests, 102 assertions; its floors and name digest
in `scripts/test-suite-contract.mjs` were raised to match (16 to 20, 81 to 102,
`b29dd981cd21d341` to `e7aefe49e52ded15`).

## 5. What changed beyond records

- `.github/workflows/ci.yml`: the decision step only (its `if:`, `DB_SURFACE`, and body as above,
  plus its comment). The checkout assertion and the control step are unchanged.
- `test-kits/branch-scope.test.mjs`: shell flag, the `if:` assertion, four surface entries, four
  new tests.
- `scripts/test-suite-contract.mjs`: the three numbers above.
- `test-kits/integrity-manifest.json`: regenerated.
- `architecture/decisions/RFC-2026-007-ci-independent-guard-step.md`: Amendment §A, §B, §D, §E.
- `work-packages/WP-0A-A0-004.json`: acceptance criterion 6 restated; one open blocker added.
