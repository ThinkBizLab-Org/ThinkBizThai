# Q0 re-check of WP-0A-A0-004's CI increment (PR #197), 2026-10-06

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/197, branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, head `d6a1e850` (substantive commit `204c8c5c`, then the
handoff-only commit `d6a1e850`), merge base with `main` = `25663e31`. This re-checks the Author's answer to the first role
round (`author-role-findings-disposition-2026-10-06.md`) against my first file, `q0-ci-increment-2026-10-06.md` (Q10-Q14).

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent Tester run
`/claude/q0_sentinel` (RFC-2026-024 §3/3-4). I share a vendor, a model family and a parent with the Author, and the
Author wrote my brief. I wrote none of the PR's content and I fix nothing. This file test-verifies only. It is not a
review approval, a security review, an integration verdict, a merge authorisation or a G0 signature, and it moves no
package status.

## 1. Environment

- Private clone under `scratchpad/q0-ci-r/repo`, checked out on the branch **name**
  `agent/claude/WP-0A-A0-004-ci-independent-guard-step` at `d6a1e850`. Not detached.
- Node `v24.20.0`, npm `11.19.0`, from `/Users/bank/.local/node-v24.20.0/bin`, first on PATH. git 2.55.0, macOS
  (BSD grep, case-insensitive APFS: see Q-R3). Global `core.quotePath` unset.
- The decision step's body was cut out of `ci.yml` with `awk`, independently of the test's extractor, and run with
  `bash --noprofile --norc -e` (what CI uses) against throwaway repositories.

## 2. Repository commands at `d6a1e850`

| Command | Exit | Result |
|---|---|---|
| `git rev-parse --abbrev-ref HEAD` | 0 | `agent/claude/WP-0A-A0-004-ci-independent-guard-step` |
| `npm run check` | 0 | tests 702, pass 702, fail 0, cancelled 0, skipped 0, todo 0 |
| `npm run check:handoff` | 0 | |
| `node scripts/verify-branch-scope.mjs 25663e31… WP-0A-A0-004` (the base CI used) | 0 | "all 14 changed path(s) are declared, and every amendment explains one" |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-004` | 73 | 64 undeclared paths, all from PR #194, merged to `main` (`9e15881b`) after this branch's sync. Not this branch's change; see §5 |
| `node scripts/verify-test-coverage-floor.mjs` | 0 | |
| `node --test test-kits/branch-scope.test.mjs` | 0 | 20/20 |
| the four test files that read `ci.yml` | 0 | 370/370 |
| `gh run view 37406144369` (read-only) | n/a | `pull_request`, head `d6a1e850`, `completed` / `success`. Checkout step: `checkout: HEAD d6a1e850… is the commit this run reports on`. Decision step: `BASE_SHA: 25663e31…`, `the database surface changed; the control RUNS. Paths: .github/workflows/ci.yml`. The negative control ran 03:01:35 to 03:16:32 and ended `every family above failed the suite, as each must.` The four new tests ran in CI's `npm run check` (702/702) under Ubuntu's GNU grep and passed. Every step header reads `shell: /usr/bin/bash -e {0}`. |

## 3. Independent path table on the new step

Each row is a fresh repository (base: one file per surface entry plus `docs/`, `contract-catalog/`). "RUNS" means no
`skip=true` was written. Every row exited 0.

| Case | Result | As designed? |
|---|---|---|
| `docs/` edit; empty diff | SKIPPED, SKIPPED | yes |
| new `db/…/058_ข้อมูล.sql` (Thai) | RUNS | yes: **Q10 closed** |
| new `db/…/001_café.sql` | RUNS | yes |
| new `scripts/db/a"b.mjs`; new `scripts/db/a\b.mjs` | RUNS, RUNS | yes |
| new `db/` file with TAB; with NEWLINE in its name | RUNS, RUNS | yes |
| new `docs/บันทึก.md` (quoted, off surface) | SKIPPED | yes |
| `GNUmakefile` at the root | RUNS | yes |
| `makefile` at the root (added through `git update-index`, so it is a distinct path even here) | RUNS | yes |
| `.gitattributes` at the root; `docs/deep/.gitattributes` | RUNS, RUNS | yes |
| near misses `docs/x.gitattributes`, `docs/GNUmakefile` | SKIPPED, SKIPPED | yes |
| symlink on the surface; only its off-surface target changes | RUNS (symlink branch) | yes |
| symlink added off the surface; symlink only in the base | RUNS, RUNS (symlink branch) | yes |
| branch behind a `main` that changed `db/`; branch changed only `docs/` | RUNS | yes: tree to tree |
| base root tree object removed (commit present) | RUNS, "the diff … could not be computed" | yes: R0-F2's branch |
| an **unchanged** subtree object removed (diff succeeds, `ls-tree -r` fails) | RUNS, "the trees … could not be listed" | yes (see Q-R2) |
| `BASE_SHA` empty; 40 × `f`; a tree id | RUNS ×3 | yes |

The stacked-PR condition (`base.ref == 'main'`) is read, not run: a workflow cannot run locally. It is pinned
statically (N7, N8 below). **The SKIPPED branch has still never run in CI** (Q14 stands, as recorded in RFC §E).

## 4. Do the new tests bite?

For each mutant, one literal replacement in `ci.yml`, then `node scripts/regenerate-integrity-manifest.mjs` (exit 0 every
time, so the integrity tripwire is not what fires), then `node --test test-kits/branch-scope.test.mjs` and
`node scripts/verify-test-coverage-floor.mjs` (exit 0 every time: no test file changed). Survivors were re-run against
all four `ci.yml`-reading test files (370 tests) and still survived. `git checkout -- .` after every row; the clone was
clean at the end. Harness: `scratchpad/q0-ci-r/mutate.mjs`.

| # | Mutant | Failing tests (of 20) | Caught |
|---|---|---|---|
| N1 | drop `-z` from `git diff` | 1 (quoted path) | yes |
| N2 | drop `-z` from the surface `grep` | 2 | yes |
| N3 | drop `-c core.quotePath=false` | 0 | **equivalent**: with `-z` git prints paths verbatim whatever `quotePath` says |
| N4 | three-dot `BASE...HEAD` | 1 (tree to tree) | yes: **Q11 pinned** |
| N5 | `|| true` inside the diff guard (old P13) | 1 (base tree unreadable) | yes: **R0-F2 / Q12 half pinned** |
| N6 | base-commit check removed alone (old P14) | 0 | no (Q-R2) |
| N7 | drop `base.ref == 'main'` | 1 | yes |
| N8 | `base.ref != 'main'` | 1 | yes |
| N9 | drop `GNUmakefile` | 1 | yes |
| N10 | drop lowercase `makefile` | 0 **on macOS** | platform-dependent (Q-R3) |
| N11 | `.gitattributes` root only | 1 | yes |
| N12 | drop `.gitattributes` | 1 | yes |
| N13 | symlink result ignored | 1 | yes |
| N14 | symlink check `-ne 1` → `-eq 0` (a grep error on the tree list would skip) | 0 | no (Q-R2; unreachable in practice) |
| N15 | base tree not listed | 1 | yes |
| N16 | head tree not listed | 1 | yes |
| N17 | head listing `>>` → `>` | 1 | yes |
| N18 | tree-listing failure guard removed | 0 | no (Q-R2) |
| N19 | `ls-tree` without `-r` (base; and both) | 1, 1 | yes |
| N20 | mode `120000` → `100755` | 1 | yes |
| N21 | `grep -zE` → `grep -zF` | 4 | yes |
| N22 | mktemp-failure branch writes `skip=true` | 1 | yes |
| N23 | control `if:` `!= 'true'` → `== 'false'` | 1 | yes |
| N24 | grep-error branch on matching removed | 1 | yes |

Nine of the Author's ten §4 mutants are among these rows and are caught (N1, N2, N4, N5, N7, N12, N13, N15, N16).
The tenth, "`Makefile$` only", was not run as such; its two halves are N9 (caught) and N10. Of my 25 rows: 20 caught, N3 equivalent, N6/N14/N18 survive, N10 survives here but is caught on
Linux by construction. The old P1-P20 / C1-C7 table was not re-run in full; N23 (= old P2) and the static assertions it
relied on are unchanged in the test file.

## 5. Findings

| ID | Grade | Finding |
|---|---|---|
| Q10 | **Closed** | `git -c core.quotePath=false diff -z` + `grep -zE`. Every quoted-name class from my first table now RUNS (§3), a quoted name off the surface still SKIPS, the pinning test bites (N1, N2), and it passed in CI under GNU grep. |
| Q11 | **Closed** | The behind-main test asserts the three-dot diff would see only `docs/`, and N4 is caught. |
| Q12 / R0-F2 | **Closed for the diff guard** | N5 is caught by the missing-root-tree test. The other half (N6) is still covered only by the diff guard: see Q-R2. |
| Q13 | **Closed** | Tests run `bash --noprofile --norc -e`; RFC §D and the test comment now say `bash -e {0}`, matching CI's log. |
| Q14 | Open, recorded | The SKIPPED branch has not run in CI. RFC §E records reading the first off-surface PR's log as owed. |
| Q-R1 | Info | **Branch behind `main`.** `origin/main` moved to `9e15881b` (PR #194) after the sync at `25663e31`. The branch-scope guard against the current `main` exits 73 on PR #194's 64 paths; against CI's base it exits 0. A re-sync and a fresh CI run on the final head are owed before merge (R0's sync condition), not a Tester condition. |
| Q-R2 | Info | **Three fail-closed clauses are unpinned.** (a) N18: the tree-listing guard. It is reachable: an unchanged subtree object missing lets `git diff` succeed while `ls-tree -r` fails. The shipped step RUNS; N18 SKIPS (measured). (b) N6: the base-commit check. With it removed, a tree id as `BASE_SHA` makes `git diff` succeed and the step SKIPS (measured); the test's "not a commit" case uses `not-a-ref`, which the diff also rejects. (c) N14: unreachable in practice (grep failing on a file the step just wrote). None is reachable from CI's inputs: the checkout is a full clone (`fetch-depth: 0`) and `base.sha` is always a commit. Defence in depth, correct by reading. A test deleting an unchanged subtree object, and one passing a tree id, would pin (a) and (b). |
| Q-R3 | Info | **The `makefile` entry is tested only on a case-sensitive filesystem.** On macOS (case-insensitive APFS) the test's `put('makefile', …)` overwrites the base's `Makefile`, git reports `M Makefile`, and `Makefile$` matches; so N10 survives locally. On CI's Linux it creates a distinct `makefile` and N10 would fail the test (by construction; not mutated in CI). The step itself handles `makefile` correctly (§3, added through the index). Pinning it platform-independently: add the path with `git update-index --add --cacheinfo`, or assert the diff names `makefile`. |
| Q-R4 | Info | A symbolic `BASE_SHA` such as `HEAD` passes `cat-file -e HEAD^{commit}` and the step SKIPS. Not reachable: GitHub supplies a 40-hex `base.sha`. Recorded for completeness only. |

There is no Blocker, Major or Minor finding, and no stop-the-line.

## 6. Verdict

VERDICT: **`test_verified`**, Tester role, WP-0A-A0-004's CI increment, PR #197, head `d6a1e850`.

- Every declared command passes on the branch name: `npm run check` 702/702 with skipped 0 and todo 0,
  `check:handoff` 0, branch scope 0 (14 paths, against CI's base `25663e31`), floor guard 0, branch-scope 20/20.
  CI 37406144369 on `d6a1e850` is green, the checkout assertion held, and the control actually ran (RUNS branch, ~15 min).
- My first-round condition **Q10 is closed and pinned**, and Q11, the diff-failure half of Q12 (R0-F2) and Q13 are
  closed and pinned. Every new clause the Author named is caught by a test when mutated, with digests refreshed.
- With Q10 closed, Q0 can give the confirmation the Owner asked for, within RFC §Amendment E's stated limits (image
  drift, a red base, a hostile author writing `GITHUB_ENV`/`GITHUB_PATH`): on the paths and inputs CI supplies, a pull
  request into `main` that changes anything the control reads, or holds a symlink, runs the control. The SKIPPED branch
  is so far exercised only locally (Q14).
- Q-R1 to Q-R4 require nothing from the Tester. Q-R1 (re-sync with `main`, fresh green CI) is owed before merge under
  R0's sync condition.

**Stop-the-line: none.**

**Manifest wording A0 records on my behalf:**

> Tester /claude/q0_sentinel at head d6a1e850 (evidence/WP-0A-A0-004/q0-ci-recheck-2026-10-06.md): test_verified. npm run check 702/702, check:handoff 0, branch scope 0 (14 paths, base 25663e31), floor 0, branch-scope 20/20; CI 37406144369 green, control ran. Q10 closed and pinned (Thai, café, ", \, TAB, newline under db//scripts/db/ all RUN); Q11 and R0-F2 pinned (three-dot and diff-guard mutants caught); Q13 corrected. New-clause mutants 20/25 caught, N3 equivalent; N6/N14/N18 (base-commit check, tree-listing guard) unpinned defence in depth, unreachable from CI's inputs; N10 (makefile) bites only on a case-sensitive FS. Branch is behind main 9e15881b (PR #194): re-sync and fresh CI owed before merge.
