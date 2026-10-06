# Q0 test of WP-0A-A0-004's CI increment (PR #197), 2026-10-06

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/197, branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, head `6fa511fd` (substantive commit `475fa3dc`, then the
handoff-only commit `6fa511fd`), base `origin/main` = `9b34be7d`. The increment adds two steps to
`.github/workflows/ci.yml`: the checkout assertion, and `Decide whether the negative control must run` (`id:
db_surface`). It also conditions the negative control on that decision, amends RFC-2026-007 (Proposed), and adds six
tests to `test-kits/branch-scope.test.mjs`.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent Tester run
`/claude/q0_sentinel` (RFC-2026-024 §3/3-4). I share a vendor, a model family and a parent with the Author, and the
Author wrote my brief. I wrote none of the PR's content and I fix nothing. This file test-verifies only. It is not a
review approval, a security review, an integration verdict, a merge authorisation or a G0 signature, and it moves no
package status. The Owner made A1's and Q0's confirmation a condition of the skip ("the skip cannot let a pull request
that should be checked slip through"). §5 says what I can and cannot confirm.

## 1. Environment

- Private clone of the local repository under `scratchpad/q0-ci/repo`, checked out on the branch **name**
  `agent/claude/WP-0A-A0-004-ci-independent-guard-step` at `6fa511fd`. Not detached. `refs/remotes/origin/main` set to
  `9b34be7d`, the same commit as the main repository's `origin/main`.
- Node `v24.20.0` and npm `11.19.0`, from `/Users/bank/.local/node-v24.20.0/bin`, first on PATH. git as installed.
  Global `core.quotePath` is unset, so it has git's default (`true`), as on a GitHub runner.
- The workflow logic was run locally. I cut the body of `Decide whether the negative control must run` out of `ci.yml`
  with `awk`, independently of the test's own extractor. I ran it against throwaway git repositories under
  `bash --noprofile --norc -e`. That is the shell CI really uses: see §4, Q13.

## 2. Repository commands at `6fa511fd`

| Command | Exit | Result |
|---|---|---|
| `git rev-parse --abbrev-ref HEAD` | 0 | `agent/claude/WP-0A-A0-004-ci-independent-guard-step` |
| `npm run check` | 0 | tests 698, pass 698, fail 0, cancelled 0, skipped 0, todo 0 |
| `npm run check:handoff` | 0 | |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-004` | 0 | "all 9 changed path(s) are declared, and every amendment explains one" |
| `node scripts/verify-test-coverage-floor.mjs` | 0 | |
| `node --test test-kits/branch-scope.test.mjs` | 0 | 16/16 |
| `gh run view 37401947409` (read-only; CI on `pull_request` at `6fa511fd`) | n/a | `completed` / `success`. The checkout step logged `checkout: HEAD 6fa511fd… is the commit this run reports on`. The decision step logged `the database surface changed; the control RUNS. Paths: .github/workflows/ci.yml`, with `BASE_SHA: 9b34be7d…`. The negative control ran 02:09:24 to 02:20:42. The step header reads `shell: /usr/bin/bash -e {0}`. |

These reproduce every figure in A0's report. A0's CI timing on `a5f6466` was not re-measured. I relied only on the run
above.

## 3. The mutation table: does each path class run or skip as designed?

Each row is a fresh repository: a base commit holding one file in every surface entry and a few files off it, then a
head commit with the change. The result is what the extracted step writes to `GITHUB_OUTPUT`. "RUNS" means the control
runs, because nothing was written. Every row exited 0. I re-ran the table under `-eo pipefail` as well, and the output
was byte-identical.

| Class | Change | Result | As designed? |
|---|---|---|---|
| Off surface | `docs/`, `scripts/other.mjs`, `evidence/` edited | SKIPPED | yes |
| Off surface | empty diff (identical trees) | SKIPPED | yes |
| Surface, each entry | edit to `db/foundation/migrations/000_x.sql`, new `db/new.sql`, `scripts/db/run.mjs`, new `scripts/db/new.mjs`, `tests/db/identity/c.mjs`, `test-kits/db/t.test.mjs`, `.github/workflows/ci.yml`, new `.github/actions/x.yml`, `Makefile`, `package.json`, `package-lock.json`, `.node-version` | RUNS, all 12 | yes |
| Rename off surface | `git mv tests/db/identity/c.mjs docs/c.mjs` | RUNS | yes |
| Rename onto surface | `git mv docs/readme.md db/x/readme.md` | RUNS | yes |
| Delete | `git rm` of a migration | RUNS | yes |
| Mode only | `chmod +x scripts/db/run.mjs` | RUNS | yes |
| Type change | `Makefile` replaced by a symlink | RUNS | yes |
| Near misses | `docs/db/x`, `docs/Makefile`, a root file `Makefile ` (trailing space) | SKIPPED | yes. None of these is read by the control. |
| Branch behind main | main changed `db/a.sql` after the branch forked, and the branch changed only `docs/` | RUNS (the tree-to-tree diff names `db/a.sql`) | yes |
| **Special-character path** | **new `db/foundation/migrations/058_ข้อมูล.sql` (Thai name)** | **SKIPPED** | **no (Q10)** |
| **Special-character path** | **new migration `001_café.sql`** | **SKIPPED** | **no (Q10)** |
| **Special-character path** | **new `scripts/db/a"b.mjs`** | **SKIPPED** | **no (Q10)** |
| **Special-character path** | **new `db/` file with a TAB in its name** | **SKIPPED** | **no (Q10)** |
| **Special-character path** | **new `db/` file with a NEWLINE in its name** | **SKIPPED** | **no (Q10)** |
| Control for Q10 | the Thai name with `git -c core.quotePath=false` | RUNS | the cause is quoting |

**Does a diff that cannot be computed run the step? Yes.** Each case below printed "the control RUNS", left `skip` unset
and exited 0:

| Case | Result |
|---|---|
| `BASE_SHA` empty | RUNS |
| `BASE_SHA` = 40 × `f` (not in the clone) | RUNS |
| `BASE_SHA` = a tree id, not a commit | RUNS |
| no repository at all (the test's case, re-run by the test) | RUNS |
| `DB_SURFACE` = `(`, so grep exits 2 (the test's case) | RUNS |
| a push to `main` | The decision step has `if: github.event_name == 'pull_request'`, so its output is unset. `'' != 'true'` holds, and the control runs. Read, not run: a workflow cannot run locally. CI's own push runs are the measurement. |

The one green PR run above took the RUNS branch. **No CI run has yet taken the SKIPPED branch.** That branch has been
exercised only locally.

## 4. Do the pinning tests bite?

For each mutant I edited `.github/workflows/ci.yml` in the clone and refreshed the digests with
`node scripts/regenerate-integrity-manifest.mjs`, so the integrity tripwire is not what fires. I then ran the four test
files that read `ci.yml` (`test-kits/branch-scope`, `test-kits/repository-json`, `test-kits/test-coverage-floor` and
`tests/db/identity/identity-isolation`, 366 tests unmutated, all pass), plus `node scripts/verify-test-coverage-floor.mjs`.
I restored the file with `git checkout -- .` after every row, and `git status` was clean at the end.

| # | Mutant | Failing tests | Caught |
|---|---|---|---|
| P1 | drop the control's `if:` | 1 (`…skipped only on an explicit skip=true…`) | yes |
| P2 | `!= 'true'` → `== 'false'` | 1 | yes |
| P3 | drop `--no-renames` | 1 (`every path on the database surface…`) | yes |
| P4 | drop `test-kits/db/` | 1 | yes |
| P5 | drop `\.github/` | 2 (+ the measured closure) | yes |
| P6 | drop `Makefile$` | 2 | yes |
| P7 | drop `tests/db/` | 2 | yes |
| P8 | drop the `^` anchor | 1 (the near-miss assertion) | yes |
| P9 | delete the `grep exit -ne 1` branch | 1 (`when the diff cannot be computed…`) | yes |
| P10 | `grep -E` → `grep -F` | 2 | yes |
| P11 | drop the decision step's `if: github.event_name == 'pull_request'` | 1 | yes |
| P11c | decision step `if:` → `always()` | 1 | yes |
| P12 | `continue-on-error: true` on the decision step | 1 | yes |
| P13 | remove only the `if !` around the diff (a diff failure would fail the job) | 0 | **no (Q12)** |
| P14 | remove only the base-commit check | 0 | **no (Q12)** |
| P13+P14 | both removed together | 1 | yes |
| P15 | `skip=true` written before the grep | 4 | yes |
| P16 | `BASE...HEAD` (merge-base diff) instead of the tree-to-tree diff | 0 | **no (Q11)** |
| P17 | `skip=true` written in the "base not in clone" branch | 2 | yes |
| P18 | a job-level `if:` on `bootstrap` | 1 | yes |
| P19 | control `if: always() && …` | 1 | yes |
| P20 | `skip=true` written when grep fails (exit > 1) | 2 | yes |
| C1 | `EXPECTED_SHA` → `github.sha` only | 1 (`the checkout is asserted…`) | yes |
| C2 | assertion `exit 1` → `exit 0` | 1 | yes |
| C3 | drop the `-z "${EXPECTED_SHA}"` clause | 0 | equivalent: an empty value never equals a 40-hex HEAD. This agrees with A0. |
| C4 | `!=` → `=` | 1 | yes |
| C5 | `continue-on-error: true` on the assertion | 1 | yes |
| C6 | assertion moved after `setup-node` | 1 | yes |
| C7 | assertion step deleted | 1 | yes |

The floor guard exited 0 for every mutant. That is expected: the mutants change no test file.

So 25 of 29 mutants are caught. C3 is equivalent. P13 and P14 each survive alone, because the other clause covers them
on every tested input; together they are caught. P16 survives (Q11). A0 reported 8 of 9 caught, with C3 the one
equivalent. That figure is reproduced, and this table is wider than it.

The closure measurement was checked separately. Walking the actual import graph by hand, every `import`, dynamic
`import()`, `new URL(…, import.meta.url)` and `readdir` in `scripts/db/{run,rls-smoke,authz-proofs,psql-driver,sql-lexer,audit-producer-rule}.mjs`,
`tests/db/identity/{run-isolation,isolation-cases}.mjs` and `db/foundation/test-helpers/rls-assertions.mjs` names a path
under `db/`, `scripts/db/` or `tests/db/`. I found no read off the surface. A0's path set is reproduced.

## 5. Findings

| ID | Grade | Finding |
|---|---|---|
| Q10 | **Minor, a condition before the Owner's merge** | **The step fails open on paths that git quotes.** `git diff --name-only` with the default `core.quotePath=true` prints any path containing a byte ≥ 0x80, a `"`, a TAB, a newline or another control character as a C-quoted string that **starts with `"`**: `"db/foundation/migrations/058_\340\270\202….sql"`. The `^(db/|…)` pattern cannot match it, grep exits 1, and the step writes `skip=true` while a surface path changed (§3, five rows). This contradicts RFC-2026-007 §Amendment B ("Any changed path on the surface … RUNS") and the step's comment ("every other outcome … leaves skip unset"). **Exposure today is narrow, which is why this is Minor.** No tracked path is non-ASCII (`git ls-files` count 0). A rename or deletion of an existing ASCII path still RUNS, because `--no-renames` names the old path. A new migration also trips `test-kits/db` snapshot tests unless `db/foundation/lint/catalog-snapshot.json`, an ASCII path on the surface, changes with it: probe measured, at least 8 tests fail. So the realistic slip needs a new specially named file in a directory the control enumerates (`migrations/`, `invariants/` via `readdir`) with no ASCII companion. I did not establish that `invariants/` forces a companion. The `Database foundation` step still applies such a file and runs one `db-rls-smoke`. Only the per-family negative control is skipped. **Why I make it a condition anyway:** the Owner's condition is that the skip *cannot* let a pull request slip through, and this is a class where it can by construction, held shut only by an unrelated guard. `core.quotePath=false` alone does not close it: TAB and `"` stay quoted (measured). A fix that closes it, for the Author to choose: `git diff -z …` with NUL-aware matching, or fail closed on any output line beginning with `"`. Pin it with a test that adds a Thai-named file under `db/` and asserts RUNS. |
| Q11 | Minor | **The tree-to-tree property is load-bearing and unpinned.** RFC §Amendment A.2 and the step's comment rest the skip on "the control's inputs are byte-identical to the base's", which is true only for a two-dot (tree-to-tree) diff. Mutant P16 (`BASE...HEAD`) passes all 16 tests, because every scratch repository in the tests is linear. On a branch behind main that changed `db/` after the fork, the shipped step RUNS but P16 SKIPS (§3, "branch behind main"). Strict branch protection keeps such a head from merging, but the PR's green would then rest on a skipped control. Suggested pin: one scratch case with the base ahead of the merge-base on a surface path, asserting RUNS. |
| Q12 | Info | **Two fail-closed clauses are each untested alone** (P13, P14). The base-commit check catches every input that would make `git diff` fail, so the `if !` guard around the diff is never the deciding clause in a test, and the reverse holds too. Both are reachable in principle. One example: a partial clone (`filter: tree:0`) has the commit, so `cat-file -e` passes, but lacks its tree, so the diff fails. Defence in depth that is correct by reading. I require no change. A test that makes the diff fail on a present commit would pin the guard. |
| Q13 | Info | **The shell is stated wrongly.** The test comment and RFC §Amendment D say the step is run "with `bash --noprofile --norc -eo pipefail`, as GitHub does". With no `shell:` key, GitHub runs `bash -e {0}`, and CI's own log at `6fa511fd` shows `shell: /usr/bin/bash -e {0}`. For this script the difference is immaterial: my whole §3 table is identical under both. The sentence should still say what CI does. |
| Q14 | Info | The SKIPPED branch has never run in CI (§3). The first off-surface pull request after merge is its first real exercise, and its log line `the control is SKIPPED` should be looked at once. |

There is no Blocker or Major finding, and no stop-the-line.

## 6. Verdict

VERDICT: **`test_verified_with_conditions`**, Tester role, WP-0A-A0-004's CI increment, PR #197, head `6fa511fd`.

- Every declared command passes on the branch name: `npm run check` 698/698 with skipped 0 and todo 0,
  `check:handoff` 0, branch scope 0 with 9 paths, floor guard 0, and branch-scope 16/16. CI on `6fa511fd` is green, and
  the checkout assertion held there.
- Every surface entry, rename, delete, mode change and type change RUNS. Off-surface changes SKIP. Every diff that
  cannot be computed RUNS without failing the job. The checkout assertion catches all six of its non-equivalent mutants (C3 is equivalent).
- **Condition Q10 (owed before the Owner merges):** paths that git quotes must not produce `skip=true`, and a test must
  pin that. Until then, Q0 **cannot** give the Owner the confirmation he asked for: that the skip cannot let a pull
  request that should be checked slip through. With Q10 fixed and pinned, it can, within RFC §Amendment E's stated limits
  (image drift, a red base).
- Q11 is recommended in the same change. Q12-Q14 require nothing.

**Stop-the-line: none.** The control still runs on every push to `main`. Every pull request still runs the
`Database foundation` step and one full `db-rls-smoke`. No secret, tenant data or migration is touched.

**Manifest wording A0 records on my behalf:**

> Tester /claude/q0_sentinel at head 6fa511fd (evidence/WP-0A-A0-004/q0-ci-increment-2026-10-06.md): test_verified_with_conditions. npm run check 698/698, check:handoff 0, branch scope 0 (9 paths), floor 0, branch-scope 16/16; CI 37401947409 green. Path-class table runs/skips as designed except Q10: a new surface file whose name git quotes (non-ASCII, ", TAB, newline) is SKIPPED because the quoted line starts with `"`; condition before merge, fix with -z or fail-closed on a leading quote, pinned by a test. Mutation table 25/29 caught, C3 equivalent, P13/P14 mutually covered, P16 (three-dot diff) survives (Q11, Minor).
