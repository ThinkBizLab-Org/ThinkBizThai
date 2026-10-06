# R0 re-check: WP-0A-A0-004's CI increment, PR #197 at head `d6a1e85`

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/197 (title prefix `GOVERNANCE:`, out of
Draft, no labels), branch `agent/claude/WP-0A-A0-004-ci-independent-guard-step`, head
`d6a1e85042225f5d88082e1d71d8f27997c29fb5`, merged base `main @ 25663e310e654cc0d04fa3a0e19b03a80ef3896e`,
package `WP-0A-A0-004`, increment of 2026-10-06 (RFC-2026-007 Amendment 2026-10-06, `Proposed`).
Run: `/claude/r0_steward`, this package's Integration Owner
(`role_assignments.integration_owner_agent_run_id`). This re-checks my first reading at `6fa511f`
(`evidence/WP-0A-A0-004/r0-ci-increment-2026-10-06.md`, conditions C1-C6, findings R0-F1 to R0-F4) after
the Author's fix commit `204c8c5` and handoff commit `d6a1e85`.

Measured 2026-10-06 between 03:05 and 03:40 UTC, in a private clone on the branch NAME (not detached), with
Node 24.20.0 / npm 11.19.0 from `/Users/bank/.local/node-v24.20.0/bin`.

## 0. What I am

I am a subagent spawned by a workflow script of `/claude/a0_atlas`, the Author of this package, acting as
the Integration Owner run `/claude/r0_steward`. RFC-2026-024 §3/3-4 requires this disclosure. I share a
vendor (Anthropic), a model family and a parent with the Author, and the Author's workflow wrote my brief,
including its summary of what A0 changed and its measurements (20/20, 702/702, run 37406144369). I treated
every line of that brief as a claim and re-measured what I rely on. I wrote none of the PR's content and I
fix nothing. This file is not a merge authorisation, not the Owner's disposition of the amendment, not a
G0 signature, and it moves no package status. A same-vendor signature does not pass Gate G0's external
verification (RFC-2026-024 §3/5). I did not read any C0, A1 or Q0 re-check of this head; §4 makes them a
condition.

## 1. Verdict

**`integration_verified`: CONDITIONAL. R0-F1 and R0-F2 are CLOSED; R0-F3 and R0-F4 are answered.** The
corrected decision step integrates as designed and fails closed on every case I could construct (§3). It
reaches `integration_verified` when **D1-D5** in §4 hold on one final head. They replace C1-C6 of my first
reading: C4 is closed by this file; C1, C2, C3, C5 and C6 carry over as D1-D5.

- Stop-the-line: **none**. Nothing is merged, and the database foundation step (clean migrate, schema lint,
  one full `db-rls-smoke`) still runs on every pull request whatever the decision step writes.
- Blocks the Owner's merge as of `d6a1e85`: **yes**, until D1-D5 hold. None of them needs a change to the
  skip rule. The only code-free gap is that `main` moved again (D1).
- Governance PR (RFC-2026-025 §5 item 6): **yes** (`.github/workflows/ci.yml` and RFC-2026-007). **The
  Owner merges it personally; the standing delegation to A0 does not apply.**
- Record-only (RFC-2026-025 §5 item 1): **no**. `204c8c5` changed `ci.yml`, a test and the test-suite
  contract, so every required role re-checks this head (RFC-2026-025 §5 item 2).

## 2. Integration tests at `d6a1e85`

| # | Test | Result | Basis |
|---|---|---|---|
| T1 | Head contains current `main` (`strict: true`) | **No.** `main` is `9e15881` (PR #194, WP-0A-CON-006, merged 03:08 UTC); `gh pr view 197` reports `mergeStateStatus: BEHIND`. | `git merge-base --is-ancestor origin/main d6a1e85` = false. Trial merge clean and green (§2.3). |
| T2 | Role verdicts for this head exist and do not block | **No, not yet.** | First-round C0/A1/Q0/R0 files are at `6fa511f`; the fixes need their re-checks. |
| T3 | Protected paths changed only under a decision record | **Yes, pending the Owner.** | `ci.yml` and RFC-2026-007 Amendment (still `Proposed`). `verify-branch-scope` against the merge base `25663e3`: exit 0, "all 14 changed path(s) are declared". |
| T4 | Required check green on the head, control actually run | **Yes.** | Run 37406144369 (§2.2). |

### 2.1 Gates I ran (private clone, branch NAME checked out at `d6a1e85`)

| Command | Result |
|---|---|
| `git branch --show-current` | `agent/claude/WP-0A-A0-004-ci-independent-guard-step` |
| `npm ci --ignore-scripts` | exit 0 |
| `npm run check` | exit 0; tests 702, pass 702, fail 0, cancelled 0, skipped 0, todo 0 |
| `npm run check:handoff` | exit 0; "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs 25663e31 WP-0A-A0-004` | exit 0; 14 paths declared |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-004` (`9e15881`) | exit 73: the two-dot diff now shows #194's paths (`test-kits/contracts/catalog-registry.test.mjs`, `work-packages/WP-0A-CON-006.json`, ...). Expected while BEHIND; it is D1, not a scope defect. |
| `node scripts/verify-test-coverage-floor.mjs` | exit 0 |
| `node --test test-kits/branch-scope.test.mjs` | tests 20, pass 20, fail 0 |

The brief's 20/20 and 702/702 reproduce. My local `grep` is BSD grep 2.6.0 (macOS); CI's is GNU grep on
`ubuntu-24.04`, and the same 20 tests passed there inside `npm run check` of run 37406144369 (§2.2), so the
`-z` behaviour the tests pin holds under both.

### 2.2 CI on the head

Run 37406144369, event `pull_request`, `headSha` `d6a1e85042225f5d88082e1d71d8f27997c29fb5`, conclusion
**success**, read with `gh run view --json` and `--log`:

- `Verify the checkout is the commit this run reports on`: `checkout: HEAD d6a1e850... is the commit this
  run reports on`.
- `Validate repository bootstrap`: `tests 702`, `pass 702`, `fail 0`.
- `Decide whether the negative control must run`: `shell: /usr/bin/bash -e {0}` (this confirms the RFC §D
  correction from `-eo pipefail` to `-e`); env `BASE_SHA: 25663e31...` and the new `DB_SURFACE`; log
  `the database surface changed; the control RUNS. Paths:` then `.github/workflows/ci.yml`.
- `Negative control - each table family must be detectable on its own`: success, 03:01:35 to 03:16:32 UTC.

The SKIPPED branch has still not run on the platform and cannot on this PR (it touches `.github/`). RFC §E
now records that as owed after the merge (§6 O1).

### 2.3 `main` moved during the re-check

`25663e3..9e15881` is PR #194 (WP-0A-CON-006): contract-catalog files under `ctr-ntf-001` and `ctr-usg-001`,
evidence, its handoff and manifest, `test-kits/contracts/catalog-registry.test.mjs` and
`test-kits/integrity-manifest.json`. **No path on `DB_SURFACE`** (the step's own pattern over that list:
grep exit 1). The one path both sides change is `test-kits/integrity-manifest.json`; git merges it without
conflict.

Trial merge in a probe worktree (branch `r0-probe-merge-9e15881`, not pushed): merge commit `a2352f1`;
`npm run check` exit 0, tests 702, pass 702, fail 0, skipped 0, todo 0 (the merged integrity manifest
verifies); `verify-branch-scope origin/main WP-0A-A0-004` exit 0, 14 paths declared. The probe's branch
name is claimed by no manifest, so its handoff guard does not judge this package; D1 still requires the
measurement on the real branch name.

## 3. R0-F1 to R0-F4, re-measured

### 3.1 Findings

| Finding | Status | Basis |
|---|---|---|
| R0-F1 (MEDIUM): a quoted path name skipped the control | **CLOSED** | The step now writes `git -c core.quotePath=false diff -z --no-renames --name-only` to a file and matches with `grep -zE`. My probe (§3.2, P3) runs Thai, `"`, `\`, TAB and newline names under `db/foundation/migrations/`, and a Thai directory under `tests/db/`: every one RUNS. The fail-closed property no longer rests on `Verify branch scope` failing first. Pinned: my mutants M3 and M6 below are killed. |
| R0-F2 (LOW): diff-failure clause unreached | **CLOSED** | The new test removes the base commit's root tree object. My probe P7 reproduces it independently: `cat-file -e` passes, `git diff` prints `fatal: unable to read tree (...)`, the step writes nothing and the control RUNS. My `git diff ... \|\| true` mutant (M1) now fails 5 tests (it survived at `6fa511f`). |
| R0-F3 (observation): two-dot not pinned | **Answered** | New test: a branch behind a `main` that changed `db/` RUNS. My three-dot mutant (M2) now fails 1 test (survived at `6fa511f`); probe P8 agrees. |
| R0-F4 (observation): base not on `main` | **Answered** | Step `if:` adds `github.event.pull_request.base.ref == 'main'`; RFC Amendment §A.1 and §B say why. Mutant M4 (drop it) fails 1 test. |

### 3.2 Independent probe (my harness, not the Author's tests)

I cut the step body out of `ci.yml` with `awk` (from `run: |` to the first blank line, ten-column dedent),
read `DB_SURFACE` from the same file, and ran it with `bash --noprofile --norc -eo pipefail`, `PATH` limited
to `/usr/bin:/bin`, against fresh throwaway repositories (base holds `db/foundation/migrations/0001.sql`,
`docs/a.md`, `Makefile`).

| # | Change from base to head | Step output |
|---|---|---|
| P1 | `docs/a.md` edited | `skip=true` (correct) |
| P2 | empty diff | `skip=true` (correct) |
| P3 | new migration named `0002_ไทย.sql`, `0002"q.sql`, `0002\b.sql`, with a TAB, with a newline | RUNS, all five |
| P3b | `tests/db/ไทย/x.mjs` added | RUNS |
| P4 | `GNUmakefile` / `makefile` added at the root | RUNS, both |
| P5 | `.gitattributes` at the root (`eol=crlf`) / at `x/y/.gitattributes` (`filter=`) | RUNS, both |
| P6 | symlink added under `docs/` (off the surface) | RUNS (`grep exit 0`) |
| P6b | symlink only in the base | RUNS |
| P7 | base commit's tree object deleted | RUNS (diff clause) |
| P8 | branch behind a `main` that changed `db/`, base = `main` tip | RUNS |
| P9 | `db/` file deleted | RUNS |
| P10 | `db/` file moved to `docs/` | RUNS |
| P11 | mode change only (`chmod +x`) on a `db/` file | RUNS |
| P12 | gitlink (mode 160000) added at `db/sub` | RUNS |
| P12b | gitlink added at `vendor/sub` | `skip=true` (correct: `actions/checkout` here sets no `submodules:`, so nothing off the surface is fetched) |
| P13 | `BASE_SHA` is a tree, not a commit | RUNS (base clause) |
| P14 | root `package.json` added | RUNS |
| P14b | only `apps/package.json` and `apps/Makefile` added | `skip=true` (correct: the control reads the root files only; the `Makefile` has no `include`) |

Every outcome is the one RFC Amendment §A/§B states. The step exited 0 in every case.

### 3.3 Independent mutation run (mine, on `ci.yml`, `node --test test-kits/branch-scope.test.mjs`)

| Mutation | Failing tests |
|---|---|
| M1 `\|\| true` after the diff | 5 (killed) |
| M2 two-dot to three-dot | 1 (killed) |
| M3 `grep -zE` to `grep -E` | 2 (killed) |
| M4 drop `base.ref == 'main'` | 1 (killed) |
| M5 ignore the symlink result | 1 (killed) |
| M6 `git diff` without `-z` | 1 (killed) |
| M7 drop `.gitattributes` from `DB_SURFACE` | 1 (killed) |
| M8 drop the base tree listing | 6 (killed) |
| M9 `mktemp` failure writes `skip=true` | 1 (killed) |
| M10 drop `--no-renames` | 1 (killed) |
| M11 `(GNUmakefile\|makefile\|Makefile)$` to `Makefile$` | 1 (killed) |
| M12 symlink `grep` exit 2 read as "no symlink" (`-ne 1` to `-eq 0`) | **0 (survives)** |

The Author's own ten mutants (disposition §4) agree with mine where they overlap.

### 3.4 New observation (not a condition)

**R0-F5. OBSERVATION.** M12 survives: no test makes `grep -qz '^120000 '` exit 2, so the step's "listing
them failed (grep exit ...)" half of the symlink clause is a stated property no test reaches. It is
practically unreachable (the step wrote that file one line earlier, and an unreadable scratch file would
also break the next grep, whose exit 2 already runs the control), so it is the same class as R0-F2 but of
far lower weight. A one-line static assertion on `-ne 1` would pin it. I do not make it a condition.

**R0-F6. OBSERVATION (record wording).** `work-packages/WP-0A-A0-004.json` `open_blockers[8]` still says
"governance PR, Draft"; PR #197 is out of Draft. Not worth a manifest edit inside this PR (it would restart
the re-checks); fold it into the post-merge follow-up in §5.

## 4. What must hold before the Owner merges (replaces C1-C6)

D1. **Sync with `main`.** Merge current `main` (`9e15881` or later) into the branch, regenerate nothing
unless `npm run check` asks, put the handoff refresh last and alone, and run `npm run check` and
`npm run check:handoff` on the branch NAME. My trial merge says this is clean (§2.3). If `main` moves
again with no path on `DB_SURFACE`, a further sync of the same kind does not need a new R0 reading.

D2. **Green `bootstrap` on the final head**: the checkout line names that head, the decision step logs
`the control RUNS` (it will: the branch differs from its base in `.github/`), and the negative control
step succeeds.

D3. **C0, A1 and Q0 re-check `204c8c5`/`d6a1e85`** (or the final head, carried under RFC-2026-025 §5
item 2 when only the D1 sync, the handoff and role files follow), each non-blocking or with its conditions
met; A1 and Q0 explicitly confirming that the skip cannot let a pull request that should be checked slip
through (the Owner's own condition). No security finding of any grade open against the PR (RFC-2026-002
clause 4). I have not read those re-checks.

D4. **The Owner disposes of RFC-2026-007 Amendment 2026-10-06** at the final-head text, naming §C (the
checkout assertion) explicitly, as C0 F2 asks, because §C goes beyond the Owner's words about the skip.

D5. **The Owner merges personally** (RFC-2026-025 §5 item 6), with every review conversation resolved
(`required_conversation_resolution: true`), and records the PR URL, final head SHA, CI run and these
evidence links in the handoff or the disposition (RFC-2026-002).

This verdict carries to a final head whose tree differs from `d6a1e85` only by the D1 merge of `main`
commits that touch no path on `DB_SURFACE` and no path this branch changes (other than
`test-kits/integrity-manifest.json` merged by git), the handoff refresh, role evidence files and the
Owner's disposition. Any further change to the decision step, `DB_SURFACE`, the control step, the checkout
assertion or `branch-scope.test.mjs` needs a new R0 reading.

## 5. Recording `integration_verified` after the merge

**Not in this PR.** An edit to `work-packages/WP-0A-A0-004.json` after the re-checks restarts them, and
the status move cannot cite a merge that has not happened. After D1-D5 hold and the Owner has merged, A0
records the move on a new WP-0A-A0-004 branch from the new `main`. That follow-up edits a manifest, so it is
not record-only: it goes through the role runs RFC-2026-025 §5 requires, or the Owner merges it.

**Exact wording A0 records for R0** in that follow-up (fill the four placeholders from the merge; change
nothing else in these fields):

- `status`: `integration_verified` (not `done`, not Gate G0).
- Replace `open_blockers[8]` and `open_blockers[11]` with this one entry:

> INCREMENT 2026-10-06 (PR #197, governance): the negative-control skip rule and the checkout assertion. Role verdicts at 6fa511f, then re-checked after the Author's fixes (204c8c5): Reviewer /claude/c0_contract_reviewer, Security /claude/a1_bastion and Tester /claude/q0_sentinel as recorded in evidence/WP-0A-A0-004/{c0,a1,q0}-ci-increment-2026-10-06.md and their re-checks of 204c8c5; Integration Owner /claude/r0_steward integration_verified at final head <FINAL_HEAD>, merged to main by the Product Owner as <MERGE_COMMIT> with bootstrap green (CI run <RUN_ID>), the negative control executed on that run (evidence/WP-0A-A0-004/r0-ci-increment-2026-10-06.md, r0-ci-recheck-2026-10-06.md). RFC-2026-007 Amendment 2026-10-06 disposed by the Product Owner on <DISPOSITION_DATE>, §C included. Owed and not a blocker: the first pull request into main that touches no DB_SURFACE path must show `the control is SKIPPED` in its job log (RFC-2026-007 Amendment §E). integration_verified is not done and not Gate G0.

- `open_blockers[7]` (A1 F1, checkout): replace "ADDRESSED IN THE 2026-10-06 GOVERNANCE INCREMENT, NOT YET
  VERIFIED ... It stays here until A1 re-checks it and the Owner disposes of the amendment." with "CLOSED by
  RFC-2026-007 Amendment 2026-10-06 §C, merged as <MERGE_COMMIT>; A1's re-check of 204c8c5 records it." only
  if A1's re-check says F1 is closed. Otherwise leave it.
- `open_blockers[0]`-`[5]`, `[6]`, `[9]` and `[10]` stay as they read on `main` after the merge; `[9]`
  (what the skip cannot see) stays true after the merge.

If any of D1-D5 is not true, A0 does not use this wording and the package stays `in_review`.

## 6. After the merge (not conditions)

- O1. Read the job log of the first pull request into `main` after the merge that touches no surface path:
  the decision step must print `the control is SKIPPED` and the control step must show as skipped with
  `bootstrap` green; the next push to `main` must show the control run. Cite both in the next CI timing.
- O2. Rollback: a reviewed revert of the increment (RFC Amendment §F). No data, provider or credential
  effect. Never a force-push.
- O3. Unchanged from my first reading: `WP-0A-A0-001.json` `ownership.amended_by[2]` still reads `pending`;
  flipping it is owed on a WP-0A-A0-001 branch.

## 7. What I did not do

- I pushed nothing. My probe clone, the trial merge `a2352f1` and the probe branch stay under the
  scratchpad. This file is the only thing committed, on `r0/WP-0A-A0-004-ci-recheck-2026-10-06` from
  `d6a1e85`.
- I did not call the branch-protection API again; §3 of my first reading stands (`strict: true`, context
  `bootstrap`, `enforce_admins: true`, `required_conversation_resolution: true`).
- I did not re-walk the closure of `scripts/db/run.mjs`: no file it reaches changed since `6fa511f`
  (`git diff --stat 6fa511f d6a1e85` touches none of `scripts/db/`, `tests/db/`, `db/` or the `Makefile`).
