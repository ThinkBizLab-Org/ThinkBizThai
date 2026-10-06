# R0 integration verdict: WP-0A-A0-004's CI increment, PR #197 at head `6fa511f`

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/197 (Draft), branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, head `6fa511fdfe76a86937f92d839ecd493fd61fbf9e`,
base `main @ 9b34be7d7895df3f6a1cc739051299f4cddcbe20`, package `WP-0A-A0-004`, increment of
2026-10-06 (RFC-2026-007 Amendment 2026-10-06: the negative-control skip rule and the checkout
assertion). Run: `/claude/r0_steward`, this package's Integration Owner
(`role_assignments.integration_owner_agent_run_id`).

Measured 2026-10-06 between 01:55 and 02:40 UTC, in a private clone, on the branch NAME (not detached),
with Node 24.20.0 / npm 11.19.0 from `/Users/bank/.local/node-v24.20.0/bin`.

## 0. What I am

I am a subagent spawned by a workflow script of `/claude/a0_atlas`, the Author of this package, acting as
the Integration Owner run `/claude/r0_steward`. RFC-2026-024 §3/3-4 requires this disclosure. I share a
vendor (Anthropic), a model family and a parent with the Author, and the Author's workflow wrote my brief,
including its list of what A0 did and its measurements. I treated every line of that brief as a claim and
re-measured what I rely on below. I wrote none of the PR's content and I fix nothing. This file is not a
merge authorisation, not the Owner's disposition of the amendment, not a G0 signature, and it moves no
package status in any manifest. A same-vendor signature does not pass Gate G0's external verification
(RFC-2026-024 §3/5). I did not read the A1, C0 or Q0 files being written for this increment in parallel;
this verdict is independent of them, and §5 makes theirs a condition.

## 1. Verdict

**`integration_verified`: CONDITIONAL. Not met at `6fa511f`.** The increment integrates as designed: the
job and its required check `bootstrap` are untouched in name and run on every pull request, the decision
step is a skipped STEP and never a skipped job, the control runs on every push to `main`, the measured
closure of what the control reads lies inside `DB_SURFACE` (re-measured independently, §2.2), the checkout
assertion holds on the PR's own run, and CI is green on the head with the control executed. It reaches
`integration_verified` when conditions **C1-C6** in §5 all hold on one final head.

- Stop-the-line: **none**. Nothing is merged; the `Database foundation` step (clean migrate, schema lint,
  one full `db-rls-smoke`) still runs on every pull request whatever the decision step says.
- Blocks the Owner's merge as of `6fa511f`: **yes**, until C1-C6 hold. The two findings that need a change
  (R0-F1, R0-F2) are small; the rest are sequencing.
- Governance PR (RFC-2026-025 §5 item 6): **yes**. It changes CI (`.github/workflows/ci.yml`) and an RFC
  (RFC-2026-007). **The Owner merges it personally. The standing delegation to A0 does not apply.**
- Record-only (RFC-2026-025 §5 item 1): **no**. Role runs are required, and the earlier verdicts at
  `acbcee1` do not cover this increment (the manifest says so itself).

## 2. Integration tests

| # | Test | Result at `6fa511f` | Basis |
|---|---|---|---|
| T1 | Head contains current `main` (strict protection; RFC-2026-025 §5 item 6) | **No, since 02:19 UTC** | Head is `9b34be7` + 2. `main` moved to `25663e3` (PR #195, WP-0A-CON-003, merged 02:19 UTC, during this review). `git merge-tree --write-tree` of `25663e3` and `6fa511f`: clean. #195's diff touches no path on `DB_SURFACE` and none of this branch's paths (§2.3). |
| T2 | Role verdicts for THIS increment exist and do not block | **No, not yet** | Only verdicts at `acbcee1` (previous increment) are on the branch. A1 and Q0 confirmation is the Owner's own condition for the skip. |
| T3 | Protected paths changed only under a decision record, with the right merger | **Yes, pending the Owner** | `ci.yml` (this package's, by RFC-2026-007's transfer) and RFC-2026-007 (Amendment written `Proposed`). The two cross-package edits are declared in `amends_without_owning` and the scope guard accepts them (§2.1). |
| T4 | Required check green on the head, with the control actually run | **Yes** | Run 37401947409 (`pull_request`, head `6fa511f`), conclusion success. |

### 2.1 Gates I ran myself (private clone, branch name checked out at `6fa511f`)

| Command | Result |
|---|---|
| `git branch --show-current` | `agent/claude/WP-0A-A0-004-ci-independent-guard-step` |
| `npm ci --ignore-scripts` | exit 0 |
| `npm run check` | exit 0; tests 698, pass 698, fail 0, cancelled 0, skipped 0, todo 0 |
| `npm run check:handoff` | exit 0; "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-004` (`origin/main` = `9b34be7`) | exit 0; "all 9 changed path(s) are declared, and every amendment explains one" |
| `node scripts/verify-test-coverage-floor.mjs` | exit 0 |
| `node --test test-kits/branch-scope.test.mjs` | 16 tests, 16 pass |

The Author's measurements in the brief reproduce.

### 2.2 The closure, re-measured without the Author's test

I wrote my own walk (not the one in `branch-scope.test.mjs`): start at `scripts/db/run.mjs`, follow every
relative static or dynamic import, collect every quoted string literal that names an existing repository
path, and follow literal `.mjs` paths (for modules started with `spawn`). Result:

- modules reached: `scripts/db/{run,rls-smoke,authz-proofs,psql-driver,sql-lexer,audit-producer-rule,try-it}.mjs`,
  `tests/db/identity/{run-isolation,isolation-cases}.mjs`, `db/foundation/test-helpers/rls-assertions.mjs`;
- bare (package) imports: none;
- existing literal paths outside `DB_SURFACE`: **none**.

This matches the Author's set (`try-it.mjs` is extra in mine and is on the surface). The file reads in those
modules use path constants, not paths assembled at run time from fragments. The residual limits the RFC
records in §E (floating `postgres:17`, the runner's `psql`, inheriting the base's result, a static walk) are
real and correctly stated; they are not regressions, because the control still runs on every push to `main`.

### 2.3 What landed on `main` during the review

`9b34be7..25663e3`: PR #195 (WP-0A-CON-003): evidence, `handoffs/WP-0A-CON-003-author-handoff.json`,
`work-packages/WP-0A-CON-003.json`, and one contract-catalog example file. None of it is on `DB_SURFACE` and
none of it is a path this branch changes. A trial merge of `25663e3` into `6fa511f` is clean; I ran
`npm run check` on that merged tree (§6).

### 2.4 CI on the head

Run 37401947409, event `pull_request`, `headSha` `6fa511f`, conclusion **success**:

- `Verify the checkout is the commit this run reports on`: success; log line
  `checkout: HEAD 6fa511fdfe76a86937f92d839ecd493fd61fbf9e is the commit this run reports on`.
- `Decide whether the negative control must run`: success; log `the database surface changed; the control
  RUNS. Paths: .github/workflows/ci.yml`.
- `Negative control - each table family must be detectable on its own`: success, 02:09:24 to 02:20:42 UTC
  (11 min 18 s); log ends `every family above failed the suite, as each must.`
- `Validate repository bootstrap`: 8 min 19 s.

The skip path itself has not run in CI and cannot on this PR. Its first observation is the first later pull
request that touches nothing on the surface (§7).

## 3. Branch protection context

Read with `gh api repos/ThinkBizLab-Org/ThinkBizThai/branches/main/protection`: `required_status_checks`
`strict: true`, contexts `["bootstrap"]` (app 15368); `enforce_admins: true`;
`required_conversation_resolution: true`; force-push and deletion off.

- The increment keeps the job name `bootstrap`, adds no job-level `if`, and adds steps inside the job. A
  required context is therefore still produced on every pull request and every push to `main`. A test pins
  "no job-level `if`" (my mutation M6 below, caught).
- A skipped step leaves the job's conclusion to the other steps. A skipped JOB would have reported
  `skipped`, which GitHub counts as passing a required check; the design avoids that, and the RFC says why.
- `strict: true` means the head must contain `main` to merge, so T1 must be re-established (C1).
- The new checkout assertion closes A1 F1 from PR #189 for the case it names. One consequence for the Owner:
  a re-run of an OLD run after the branch moved now fails red instead of passing on the wrong commit. That
  is intended; the current head's own run is the one that counts.
- The PR carries **no labels** (`gh pr view 197 --json labels` = `[]`; the repository has no GOVERNANCE
  label). The governance marker is the title prefix `GOVERNANCE:`. The brief's "labelled GOVERNANCE" is
  inaccurate as stated; nothing depends on it.

## 4. Findings

### R0-F1. MEDIUM (fails open on a class of path names; masked today). Condition C4.

The RFC (Amendment §B) and the manifest say the decision step fails closed on "any changed path on the
surface". It does not when the path name contains a non-ASCII byte, a double quote, a backslash or a tab.
`git diff --name-only` prints such a path C-quoted under the default `core.quotePath=true`, as
`"db/foundation/migrations/0002_\340\271\204...sql"`. The leading `"` does not match `^(db/|...)`, grep exits
1, and the step writes `skip=true`.

Measured by extracting the step's `run:` body from `ci.yml` and running it with
`bash --noprofile --norc -eo pipefail` against throwaway repositories:

| Change between base and head | Step output |
|---|---|
| `docs/a.md` only | `skip=true` (correct) |
| `db/foundation/migrations/0002_ไทย.sql` added | **`skip=true`** |
| `db/foundation/migrations/0002"q.sql` added | **`skip=true`** |
| a file with a tab in its name under `db/foundation/migrations/` | **`skip=true`** |
| `db/ไทย/a.sql` added | **`skip=true`** |
| ASCII edit to `db/foundation/migrations/0001.sql` | empty (control runs; correct) |

Such a file is read by the control: `scripts/db/run.mjs:49` loads every `*.sql` in
`db/foundation/migrations` by `readdir`, with no name pattern, and I found no general guard on migration file
names (`foundation-contract.test.mjs:2283` checks one field of one record only).

Why it is masked today: `Verify branch scope` runs earlier in the same job and reads the same quoted name.
I committed `db/foundation/migrations/999_ไทย.sql` on a probe branch and ran
`node scripts/verify-branch-scope.mjs <base> WP-0A-A0-008` (a package whose `writable_paths` include
`db/**`): exit 73, the quoted path reported as undeclared. So the job goes red before the control is reached,
and no such pull request can turn `bootstrap` green today. The skip rule's fail-closed property therefore
rests, for this class, on a quoting defect in another guard, which a fix there would remove. The disposition
branch path does not reopen it: `verify-disposition-branch.mjs` admits only decision-record status lines.

Fix shape (the Author's call, not mine): read the diff with `git -c core.quotePath=false diff -z
--no-renames --name-only` and match with `grep -z`, or treat any output line beginning with `"` as on the
surface; add a test case with a non-ASCII name and one with a quote. Either keeps the step's fail-closed
claim true without depending on the scope guard.

### R0-F2. LOW (test gap; a stated claim is not tested). Condition C4.

The branch `if ! changed="$(git diff ...)"` ("the diff could not be computed; the control RUNS") is reached
by none of the five cases in `when the diff cannot be computed the negative control runs`. Every one of them
(empty base, base not in the clone, not a commit, no repository, malformed pattern) exits at the earlier
`git cat-file -e` check or at grep. My mutation `git diff ... HEAD || true` survives the whole suite
(fail 0), and that mutant writes `skip=true` when the diff fails. The branch is reachable: in a repository
where the base commit object exists but its tree object is missing, `git cat-file -e <base>^{commit}`
succeeds, `git diff` exits 128, the step as written prints "could not be computed; the control RUNS" and
writes nothing, and the mutant writes `skip=true`. RFC Amendment §D's "a run on ... no repository" and the
manifest's "run on every undeterminable diff" are therefore claims about one more branch than the tests
reach. Add the missing-tree case (or an equivalent that passes `cat-file` and fails `diff`), or narrow the
claim.

### R0-F3. OBSERVATION. Two-dot diff not pinned.

My mutation `"${BASE_SHA}...HEAD"` (merge-base, three-dot) survives (fail 0). The two-dot form as written is
the safer one: when `main` moved on the surface after the branch point, two-dot runs the control and
three-dot does not. With `strict: true` the difference is small, but the choice is a property of the rule;
a one-line assertion on the diff form would pin it. Not a condition.

### R0-F4. OBSERVATION. The rationale assumes a base on `main`.

The workflow comment and RFC say a skip is sound because the base's inputs are those "whose push to main ran
it". For a pull request whose base branch is not `main` (stacked PRs), the base never ran the control. This
is harmless for what reaches `main`: the pull request into `main` that carries such work diffs against a
`main` commit, and every push to `main` runs the control. Worth one line in Amendment §E. Not a condition.

### Independent mutation run (mine, on `ci.yml`, `node --test test-kits/branch-scope.test.mjs`)

| Mutation | Failing tests |
|---|---|
| M1 `--no-renames` removed | 1 (caught) |
| M2 two-dot to three-dot | 0 (survives; R0-F3) |
| M3 `\.github/` removed from `DB_SURFACE` | 2 (caught) |
| M4 `git diff ... HEAD \|\| true` | 0 (survives; R0-F2) |
| M5 `\| head -1` after the grep | 0 (equivalent under `pipefail`; not a defect) |
| M6 a job-level `if` added | 1 (caught) |
| M7 a missing base writes `skip=true` | 2 (caught) |
| M8 `test-kits/db/` removed (margin entry) | 1 (caught) |
| M9 `Makefile` removed | 2 (caught) |

## 5. What must hold before the Owner merges

C1. **Sync with `main`.** Merge current `main` (`25663e3` or later) into the branch, then put the handoff
refresh last and alone, and run `npm run check:handoff` on the branch NAME. Required by `strict: true` and
by RFC-2026-025 §5 item 6.

C2. **Green `bootstrap` on the final head**, with the `Verify the checkout...` line naming that head and the
negative control executed (it will be: the branch's tree differs from its base in `.github/`).

C3. **Role verdicts for this increment**, at the final head or carried to it under RFC-2026-025 §5 item 2:
A1 (Security) and Q0 (Tester) confirming that the skip cannot let a pull request that should be checked
slip through (the Owner's own condition on `ได้ทำตามที่คุณแนะนำ`), and C0 review. Each non-blocking, or its
conditions met. No security finding of any grade left open against the PR (RFC-2026-002 clause 4).

C4. **R0-F1 and R0-F2 answered.** R0-F1: fixed with a test, or accepted by the Owner in writing with Amendment
§E stating that the fail-closed property for quoted path names currently depends on `Verify branch scope`
failing first. R0-F2: the missing case added, or the claim narrowed. A fix commit that touches `ci.yml` or a
test is re-verified by all required role runs (RFC-2026-025 §5 item 2). I recommend fixing both; each is a
few lines.

C5. **The Owner disposes of RFC-2026-007 Amendment 2026-10-06** (it is written `Proposed`). The approved text
should be the one at the final head, so any C4 change lands before the disposition.

C6. **The Owner merges personally** (RFC-2026-025 §5 item 6), after taking the PR out of Draft, with every
review conversation resolved (`required_conversation_resolution: true`). Record the PR URL, final head SHA,
CI run and these evidence links in the handoff, as RFC-2026-002 asks.

Once C1-C6 hold on one head and the head's tree differs from `6fa511f` only by the C1 merge of off-surface
`main` commits, the handoff refresh, role evidence files and the C4/C5 changes, this verdict applies to that
head; a change to the skip rule beyond C4 needs a new R0 reading.

## 6. The trial merge with current `main`

I ran `npm run check` on `6fa511f` merged with
`25663e3`, run in a probe worktree whose branch name no manifest claims. Because of that name, the
handoff-conformance guard there does not judge this package's handoff, so the probe says only that the merged
tree's tests pass; C1 still requires the measurement on the real branch name.

Result: merge commit `d65d7ec` (probe only, not pushed); `npm run check` exit 0; tests 698, pass 698, fail 0, skipped 0, todo 0. The test count is unchanged because #195 adds no test.

## 7. After the merge (not conditions)

- O1. The first pull request after the merge that touches nothing on `DB_SURFACE` should show the decision
  step's log line `the control is SKIPPED` and the control step as skipped, with `bootstrap` green. The first
  push to `main` after it should show the control run. Whoever records the next CI timing should cite both.
- O2. Rollback is a reviewed revert of the increment's commit (RFC Amendment §F); no data, provider or
  credential effect. Never a force-push.
- O3. Not created by this increment and not a condition: `WP-0A-A0-001.json` `ownership.amended_by[2]`
  still reads `acknowledgement_status: pending`. I gave that acknowledgement in
  `r0-integration-verdict-2026-10-05.md` §7.3; flipping the field is owed on a WP-0A-A0-001 branch.
- O4. Two worktrees hold the branch name `agent/claude/WP-0A-A0-004-ci-independent-guard-step`
  (`.claude/worktrees/wf_28ddee91-802-1` and `wf_a647622e-f03-1`, both at `6fa511f`); the manifest records the
  stale one. Remove it before the C1 sync so the sync is made in one place.
