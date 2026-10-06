# C0 re-check of WP-0A-A0-004's CI increment (PR #197, head `d6a1e85`)

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/197 (title prefix `GOVERNANCE:`),
branch `agent/claude/WP-0A-A0-004-ci-independent-guard-step`, head
`d6a1e85042225f5d88082e1d71d8f27997c29fb5`, merge-base with `main` `25663e3` (PR #195). The fixes
are in `204c8c5`; `d6a1e85` is the handoff, last and alone. My first review was at `6fa511f`
(`c0-ci-increment-2026-10-06.md`). Re-checked 2026-10-06.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent
Reviewer run `/claude/c0_contract_reviewer` (RFC-2026-024). I share a vendor (Anthropic) and a parent
with the Author, and the Author's run wrote my brief. I wrote none of the PR's content and I fix
nothing. This file is a Reviewer verdict only. It is not a security review, a test verification, an
integration verdict, the Owner's disposition of the amendment, an answer to the Owner's condition
(that is A1's and Q0's), a merge authorisation or a G0 signature, and it moves no package status.

## 1. Verdict

**`approved_with_conditions`.** F1 (the decision step failing open on a quoted path) is closed: I
reproduced every case that failed at `6fa511f` and each now runs the control. F3 (a base not on
`main`) is closed by the new `base.ref == 'main'` condition. Where RFC-2026-007 Amendment
2026-10-06 quotes `ci.yml`, the text matches the workflow, and `DB_SURFACE` matches byte for byte.
The required check context is unchanged. The one condition left is not the Author's to close:
**C2**, the Owner's disposition of the amendment must name §C (the checkout assertion) explicitly
(F2, open, unchanged). C1 is met.

## 2. Measured

Private clone in the scratchpad, checked out **by branch name** (`git rev-parse --abbrev-ref HEAD` =
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, HEAD = `d6a1e85`), `npm ci`, Node
`v24.20.0`, npm `11.19.0`. No database.

| Command | Exit | Result |
|---|---|---|
| `npm run check` | 0 | `tests 702 / pass 702 / fail 0 / cancelled 0 / skipped 0 / todo 0` |
| `npm run check:handoff` | 0 | |
| `node scripts/verify-branch-scope.mjs 25663e3 WP-0A-A0-004` | 0 | "all 14 changed path(s) are declared, and every amendment explains one" |
| `node --test test-kits/branch-scope.test.mjs` | 0 | 20/20 |
| `node scripts/verify-test-coverage-floor.mjs` | 0 | |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-004.json` | 0 | |

Against `origin/main` as it stands now (`9e15881`, PR #194 merged after this head), the scope guard
exits 73 and lists 64 paths, all of them PR #194's (`contract-catalog/shared-kernel/ctr-usg-001/**`,
`evidence/WP-0A-CON-006/**` and the like). That is the two-dot diff seeing `main`'s new commits, not
this branch's. `git merge-tree --write-tree HEAD origin/main` is clean. `gh pr view 197` reports
`mergeStateStatus: BEHIND`. Syncing is R0's call; I note it so nobody reads the 73 as a defect here.

**CI run 37406144369**: `event: pull_request`, `headSha: d6a1e85…`, `conclusion: success`. Every step
succeeded. The decision step's log prints `shell: /usr/bin/bash -e {0}`, `BASE_SHA:
25663e310e654cc0d04fa3a0e19b03a80ef3896e`, then `the database surface changed; the control RUNS.
Paths:` and `.github/workflows/ci.yml`; the negative control step then ran and succeeded. So the
RUNS branch has run on the platform at this head. The SKIPPED branch has not, and cannot on this
PR (RFC §E records it as owed, Q0 Q14).

**The decision step, cut out of `ci.yml` at `d6a1e85`** and run with `bash --noprofile --norc -e`,
`env -i PATH=/usr/bin:/bin`, `GITHUB_OUTPUT`, `BASE_SHA` and the workflow's `DB_SURFACE`, against
throwaway repositories (macOS `/usr/bin/grep`, git 2.55.0; the runner has GNU grep, see §5):

| Change on the head | Output | Correct? |
|---|---|---|
| `docs/r.md` edited | `skip=true` | yes |
| `docs/ข้อมูล.md` added (quoted name, off the surface) | `skip=true` | yes |
| `db/foundation/migrations/0002_b.sql` added | RUNS | yes |
| `db/foundation/migrations/0002_ข้อมูล.sql` added | RUNS | yes (was `skip=true`, F1) |
| `db/foundation/migrations/0002_a"q.sql` added | RUNS | yes (was `skip=true`, F1) |
| `db/ฐาน/x.sql` added | RUNS | yes (was `skip=true`, F1) |
| migration name with `\`, TAB, newline | RUNS | yes |
| `tests/db/ทดสอบ.mjs` added | RUNS | yes |
| `GNUmakefile`, `makefile` added | RUNS | yes |
| `sub/Makefile` added | `skip=true` | yes (make reads the root only) |
| `.gitattributes`, `docs/.gitattributes` added | RUNS | yes |
| `docs/x.gitattributes` added | `skip=true` | yes (not an attributes file) |
| symlink added off the surface | RUNS (`grep exit 0`) | yes |
| symlink only in the base, removed on the head | RUNS | yes |
| `Makefile` deleted; migration moved to `docs/` | RUNS | yes |
| `.github/x.yml`, root `package.json` | RUNS | yes |
| empty base; base not in the clone | RUNS | yes |

The step exited 0 in every case.

**Mutants I applied to `ci.yml` myself**, then ran `node --test test-kits/branch-scope.test.mjs`:
drop `-z` from `git diff` (1 failing), drop `-z` from `grep` (2), drop the `base.ref` clause (1),
invert it to `!= 'main'` (1), ignore the symlink result (1), drop the `.gitattributes` entry (1),
reduce the makefile group to `Makefile$` (1), make the `mktemp` failure write `skip=true` (1). All
killed. This agrees with the Author's ten in the disposition record §4; I did not repeat those ten.

## 3. Status of my first-round findings

### F1 (MEDIUM): CLOSED

The diff is now `git -c core.quotePath=false diff -z --no-renames --name-only "${BASE_SHA}" HEAD`,
written to a file and matched with `grep -zE`. With `-z`, git prints every name raw, whatever
`core.quotePath` says, so the anchored pattern sees the real path. My §2 table shows each case that
failed open at `6fa511f` now runs the control, and a quoted name off the surface still skips. New
tests pin it: Thai, `"`, `\`, TAB and newline names under `db/` and `tests/db/`. The step no longer
depends on `Verify branch scope` quoting paths the same way, so the coupling I named in F1 is gone.
Amendment §B's "It writes nothing in any other case" now holds for the step on its own.

I checked the comment's claim "quotePath=false alone is not enough: TAB and quote are quoted
regardless": `git -c core.quotePath=false diff --name-only` still prints `"a\tq"`, `"a\"q"` and
`"a\\q"`, and prints `ข` raw. The claim is true. It leaves out the backslash, but the code does not
depend on the list.

### F2 (LOW, process): OPEN, the Owner's to close

Nothing an Author can do closes it, and the Author has not claimed to. The disposition record §3
and the manifest's new blocker both say the Owner's disposition must name §C. **C2 stands.** §C is
unchanged since `6fa511f` (`git diff 6fa511f d6a1e85 -- .github/workflows/ci.yml` touches only the
decision step).

### F3 (LOW): CLOSED

The decision step's `if:` is now `github.event_name == 'pull_request' &&
github.event.pull_request.base.ref == 'main'`. On a pull request into any other branch the step
does not run, `skip` stays unset and the control runs, which fails closed. `base.ref` on the
`pull_request` event is the bare branch name, so `'main'` is the right literal. RFC §B lists the
case, and the static test pins the condition (my mutant dropping it fails one test). The other half
of F3, a `main` base whose own push run was cancelled or skipped, is now covered in principle by
§E "Base red on main". That section speaks of a red result, not a missing one. I take that as close
enough for a LOW observation and do not raise it again.

## 4. Does the amendment text match `ci.yml` where it quotes it?

| RFC quote | In `ci.yml` at `d6a1e85` | Match |
|---|---|---|
| `DB_SURFACE` code block (§A) | `env.DB_SURFACE` of `db_surface` | **byte for byte**: `grep -F -x` of the workflow's value finds the RFC's line, and the RFC holds no other pattern line |
| `Decide whether the negative control must run`, `id: db_surface` | step name and id | exact |
| `github.event.pull_request.base.ref == 'main'` | in the step's `if:` | exact. The RFC wraps it across a line inside inline code, which Markdown renders as one space |
| `git -c core.quotePath=false diff -z --no-renames --name-only <pull_request.base.sha> HEAD` | same, with `"${BASE_SHA}"` for the placeholder | exact apart from the declared placeholder (also wrapped across a line) |
| `git ls-tree -r -z`, mode `120000` | `git ls-tree -r -z`, `grep -qz '^120000 '` | exact |
| `skip=true` | the only writer, last line | exact |
| `if: steps.db_surface.outputs.skip != 'true'` | the control step's `if:` | exact |
| `Verify the checkout is the commit this run reports on`, `github.event.pull_request.head.sha \|\| github.sha` | step name; `EXPECTED_SHA` | exact |
| `Negative control - each table family must be detectable on its own` | step name | exact |
| `shell: /usr/bin/bash -e {0}` (§D) | not in `ci.yml`; the job log of run 37406144369 | exact |
| §B "exit other than 0 or 1 … runs the control" | `linked -ne 1` and `matched -ne 1` after `matched -eq 0` | matches |

The manifest's restated acceptance criterion 6 quotes the same `git` command, and it matches too.

One stale copy is outside the RFC. The Author's first-round record,
`author-negative-control-skip-2026-10-06.md` line 63, still prints the old pattern (no
`GNUmakefile`/`makefile`, no `.gitattributes`). It is a dated record of `6fa511f`, the disposition
record names the change, and the normative text is the RFC, so this is not a finding. A reader
quoting the pattern should take it from the RFC or the workflow.

## 5. New observations (no finding)

- **The required check context is unchanged.** `git diff 25663e3 d6a1e85 -- .github/workflows/ci.yml`
  has no changed line at job level or above. The workflow keeps `name: Bootstrap validation`, the
  `on:` block, job `bootstrap`, no job `name:` and no job-level `if:`. The only `if:`s are on steps
  (lines 105, 198, 269).
- **GNU vs BSD `grep -z`.** I ran the step on macOS's BSD grep. The runner uses GNU grep, and only
  the RUNS branch has been seen there. Either way, every surface entry is anchored at the start of
  a NUL-terminated record by `^`, and a surface path starts with its prefix, so it cannot fail to
  match. An embedded newline could at most add a match (for example `docs/x\nMakefile`), which runs
  the control. That direction fails closed.
- **The temporary directory** from `mktemp -d` is not removed. It holds path lists only and dies
  with the runner.
- **Scope of the measurement.** The surface is anchored at the root for `Makefile`,
  `package.json`, `package-lock.json` and `.node-version`, which is what make, npm and the toolchain
  check read. Image drift, a hostile author and the static closure stay recorded in §E, as before.

## 6. What this re-check does not establish

It does not answer the Owner's condition (A1 and Q0 confirm the skip cannot let a pull request that
should be checked slip through), and it is not R0's integration reading of a synced head. The PR is
`BEHIND` `main` at `9e15881`. The Owner's disposition of the amendment, naming §C (C2), and the
Owner's personal merge (RFC-2026-025 §5 item 6) are still owed.
