# A1 Security/Privacy review — WP-0A-A0-004's CI increment at PR #197 head `6fa511f`

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer named by `work-packages/WP-0A-A0-004.json`
`role_assignments.security_reviewer_agent_run_id`.
Subject: https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/197 (Draft, GOVERNANCE), branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, head
`6fa511fdfe76a86937f92d839ecd493fd61fbf9e`, on `origin/main` `9b34be7`.
Date: 2026-10-06.

**This document records findings. It advances no package status, writes `security_approved`
nowhere, and repairs nothing it found.**

---

## 0. What I am, before anything else

**I am a subagent spawned by a workflow run of `/claude/a0_atlas`, the Author of this increment,
in the same vendor and model family (RFC-2026-024 §3/3-4).** A0's workflow wrote my brief, including
its summary of what was changed and measured. I treated that summary as the Author's claim and
checked it against the tree and against the workflow logic executed locally. Every claim below
names the command or `file:line` it rests on. A same-vendor review does not pass Gate G0's external
verification (RFC-2026-024 §3/5), and a defect neither A0 nor I thought of is one I probably did not
find (§7).

---

## 1. Verdict, in one sentence

> **No security or privacy objection to PR #197, with four LOW findings that the Owner should see
> before approving RFC-2026-007 §Amendment 2026-10-06. The checkout assertion is fail-closed in
> every case I could construct. The skip rule is fail-closed on every input the Author enumerated,
> but its premise — "the control's outcome is a function of DB_SURFACE and nothing else" — is
> false in four ways I reproduced: a root `GNUmakefile` or `makefile`, a root `.gitattributes`, a
> symlink on the surface whose target is off it, and a pull request whose base is not `main`. Each
> lets a pull request that changes what the control exercises skip it.**

Stop-the-line: **no**. Blocks the Owner's merge on security grounds: **no** — every hole in §4
needs either a path the branch-scope guard makes the PR declare in its manifest, or a non-`main`
base, and the control still runs unconditionally on every push to `main` (`ci.yml` `db_surface`
`if: github.event_name == 'pull_request'`), so nothing reaches `main` without the control running
on `main`'s own commit. What the holes defeat is the claim that a skipped PR "measured nothing new";
the Owner should approve the amendment knowing that, or after F1-F2 are fixed (each a one-line change).

---

## 2. What I checked, against the brief's focus list

| Attempt | Outcome | Basis |
|---|---|---|
| Edit a migration / any file under `db/`, `scripts/db/`, `tests/db/` | **RUNS** | §3.2 harness |
| Edit `.github/workflows/ci.yml` itself | **RUNS** | §3.2 case 6 |
| Move a surface file off the surface (`git mv db/... docs/...`) | **RUNS** (`--no-renames` names the old path) | §3.2 case 7 |
| Edit a test-kit or script outside the set | SKIPS — correct: the control does not read them | §3.2 case 8; closure re-checked §3.3 |
| Root `GNUmakefile` / `makefile` | **SKIPS — and `make` reads it instead of `Makefile`** | F1 |
| PR into a non-`main` branch that carries an unchecked DB change | **SKIPS** | F2 |
| Root `.gitattributes` (`*.sql text eol=crlf`) | **SKIPS — checkout bytes of every `.sql` change** | F3 |
| Symlink on the surface, later PR edits its off-surface target | **SKIPS** | F3 |
| Non-ASCII or `"` in a `db/` filename | SKIPS in this step (path printed quoted), **but the job goes red** at `Verify branch scope` | F4 |
| Empty / missing / non-commit base, diff failure, grep error | RUNS (Author's tests; logic re-read) | §3.2 |
| `push` to `main` | step does not run, `skip` unset, control RUNS | `ci.yml` `if:` |
| `workflow_dispatch`, `pull_request_target`, `merge_group` | not triggers of this workflow; adding one edits `.github/` → RUNS | `ci.yml:3-6` |
| A step in the same job writing `skip=true` | impossible: `steps.db_surface.outputs` come only from that step's `GITHUB_OUTPUT` | Actions semantics; INFO I1 for the related class |

---

## 3. Measured vs read

### 3.1 Toolchain and the Author's commands

Private clone of the local repository under
`…/scratchpad/a1-ci/repo`, checked out **by branch name**
(`git checkout -B agent/claude/WP-0A-A0-004-ci-independent-guard-step 6fa511fd`;
`git branch --show-current` printed the name; `git rev-parse HEAD` =
`6fa511fdfe76a86937f92d839ecd493fd61fbf9e`). Node `v24.20.0`, npm `11.19.0` from
`/Users/bank/.local/node-v24.20.0/bin`, first on `PATH`; `npm ci --ignore-scripts`.

| Command | Result |
|---|---|
| `node --test test-kits/branch-scope.test.mjs` | 16 tests, 16 pass, 0 fail |
| `npm run check:handoff` | exit 0 |
| `node scripts/verify-branch-scope.mjs upstream/main WP-0A-A0-004` (`upstream/main` = `9b34be7`) | exit 0 |
| `node scripts/verify-test-coverage-floor.mjs` | exit 0 |
| `npm run check` | see §3.4 |

### 3.2 The decision step, executed against crafted diffs

I extracted the `run:` block of step `db_surface` and its `DB_SURFACE` value **from `ci.yml` at
`6fa511f` by program** (not retyped), and ran it the way the runner does:
`bash --noprofile --norc -eo pipefail step.sh` with `BASE_SHA`, `DB_SURFACE` and a temporary
`GITHUB_OUTPUT`, after committing each crafted change on top of `6fa511f` in the private clone.
SKIP means the step wrote `skip=true`; every case exited 0.

| # | Change on top of `6fa511f` (base = `6fa511f` unless noted) | Decision |
|---|---|---|
| 1 | add `db/foundation/migrations/099_ทดสอบ.sql` | SKIP (git printed `"db/foundation/migrations/099_\340\270\227…sql"`) |
| 2 | add `db/foundation/migrations/099_a"b.sql` | SKIP |
| 3 | add root `GNUmakefile` (`include Makefile` + a `db-rls-smoke` rule) | SKIP |
| 4 | add root `makefile` (index entry via `git update-index --cacheinfo`; the clone is on a case-insensitive FS) | SKIP |
| 5 | add root `.gitattributes` = `*.sql text eol=crlf` | SKIP |
| 6 | append a comment to `.github/workflows/ci.yml` | RUN |
| 7 | `git mv db/foundation/test-helpers/auth-context.sql docs/auth-context.sql` | RUN |
| 8 | append to `test-kits/branch-scope.test.mjs` | SKIP (expected) |
| 9 | base = a branch commit that appended to `db/foundation/test-helpers/auth-context.sql`; head = that + a README edit | SKIP |
| 10a | replace `auth-context.sql` by a symlink to `../../../docs/auth-context.sql` | RUN |
| 10b | base = 10a; head edits `docs/auth-context.sql` only | SKIP |

`make` precedence, measured: with a root `GNUmakefile` of `include Makefile` plus
`db-rls-smoke: ; @echo FROM-GNUmakefile`, `make db-rls-smoke` printed `FROM-GNUmakefile`
(GNU Make 3.81 locally; the documented lookup order `GNUmakefile`, `makefile`, `Makefile` is the
same in the runner's GNU Make 4.x).

### 3.3 Closure re-check (read)

The nine closure modules (`scripts/db/{run,rls-smoke,authz-proofs,psql-driver,sql-lexer,
audit-producer-rule}.mjs`, `tests/db/identity/{run-isolation,isolation-cases}.mjs`,
`db/foundation/test-helpers/rls-assertions.mjs`) import only `node:` builtins and relative paths
(`grep -hoE "from '[^'.][^']*'"` over them returns nine `node:` specifiers and nothing else), so
no `node_modules`, `package.json` `imports` map or parent `package.json` can redirect a module.
`migrationFiles()` (`scripts/db/run.mjs:48-53`) applies every `*.sql` in
`db/foundation/migrations` with no filename rule. I agree with the Author's import-graph closure;
what it does not cover is input reached by something other than an import or a literal (F1, F3).

### 3.4 Full suite

`npm run check` on the branch name in the private clone: exit 0, 698 tests, 698 pass, 0 fail, 0 skipped, 0 todo.

---

## 4. Findings

### F1 — LOW. A root `GNUmakefile` or `makefile` replaces the `Makefile` the control runs, and is not on DB_SURFACE

Both database steps and the control invoke `make db-rls-smoke` (`ci.yml`, `Database foundation`
and `Negative control`). GNU make reads `GNUmakefile`, then `makefile`, then `Makefile`, and uses
the first it finds. `DB_SURFACE` anchors `Makefile$` inside `^(…)`, so it matches exactly
`Makefile`; §3.2 cases 3-4 skip, and the measured precedence shows the new file is what runs.

Reach: the branch-scope guard makes the PR declare the new root path in its manifest
(`writable_paths` or `amends_without_owning`), so the file is visible to C0/R0 — but nothing tells
a reviewer that a root `GNUmakefile` is a database change, and the RFC calls the surface "measured".
Not a new capability for a hostile author (the same file defeats the control when it does run);
the defect is that an *honest* make refactor would skip the control.

Fix (one token): `(GNUmakefile|makefile|Makefile)$`, and add the three names to the closure
test's expectations. Simpler and stronger: treat **every root-level file** as on the surface
(`^[^/]+$`), since root files are protected configuration anyway (CONTRIBUTING_AGENTS.md
"Ownership and change control").

### F2 — LOW. The skip trusts any base, but its premise holds only for a base on `main`

The rationale in `ci.yml` and the RFC amendment is that the base tree's control "ran on its push
to main". The workflow triggers on `pull_request` with no `branches:` filter (`ci.yml:3-4`), so
it runs for pull requests into any branch, and `push` runs only for `main`. A pull request into a
branch whose DB change was never controlled (pushed directly, or stacked on a branch whose own PR
run was superseded) skips: §3.2 case 9. That run is a green `bootstrap` check on the head SHA.

Reach: to land on `main` the head needs a pull request into `main`, whose run diffs against `main`
and runs the control; and `main`'s push run runs it again. The residual risk is a governance one:
under RFC-2026-002's manual merge control, "the head commit has a green required CI run" can be
read off a run that was not against `main`.

Fix: add `[ "${BASE_REF}" = main ] || { echo "...base is not main; the control RUNS"; exit 0; }`
with `BASE_REF: ${{ github.event.pull_request.base.ref }}`, and a test case for it. Then add a
Limitations line to the amendment.

### F3 — LOW. Inputs that change the bytes the control reads without a surface path in the diff

Two ways, both reproduced (§3.2 cases 5, 10a-10b):

- **Root `.gitattributes`.** `eol`, `text`, `ident` or `working-tree-encoding` attributes change
  what `actions/checkout` writes for every `db/**.sql` while their blobs, and therefore the diff,
  are unchanged. I did not measure the effect on the control's outcome (CRLF through
  `psql-driver.mjs`'s meta-command scan is the place I would look); the point is that the inputs
  are no longer byte-identical to the base's, which is the amendment's stated premise. F1's
  "every root file" fix covers it.
- **Symlinks.** Once a symlink exists on the surface (introducing it RUNS — case 10a), later
  pull requests that edit only its off-surface target SKIP (case 10b), while `readFile` follows the
  link. `git ls-files -s | awk '$1=="120000"'` is empty at `6fa511f`, so this is latent. Fix: the
  closure test asserts no mode-`120000` entry under the surface, or the step runs the control if
  `git ls-tree -r HEAD` shows one.

Neither is in RFC-2026-007 §Amendment E ("What this does NOT do"), which names image drift and
a red base only.

### F4 — LOW (latent; currently masked by another guard). Quoted paths never match DB_SURFACE

`git diff --name-only` with the default `core.quotePath=true` prints any path containing a byte
≥ 0x80, a `"`, a backslash or a control character inside double quotes with octal escapes, so the
line begins with `"` and `^(db/|…)` cannot match (§3.2 cases 1-2). `migrationFiles()` would apply
such a migration. **Today the job still goes red**: `scripts/verify-branch-scope.mjs:127` reads the
same quoted form, matches no declared path, and fails `Verify branch scope` before the control —
measured with case 1 against `WP-0A-DB-00`, which owns the migrations directory: "changed 1
path(s) it neither owns nor records as an amendment". So the defect is masked, not absent. Fix:
`git -c core.quotePath=false diff -z --no-renames --name-only` and split on NUL (and the same in
`verify-branch-scope.mjs`), or run the control when any line begins with `"`.

### I1 — INFO. In-job code can steer this step (pre-existing class)

`npm run check` executes the pull request's own test files before `db_surface`. Such code can
append to `GITHUB_PATH` (a fake `git` that prints an empty diff yields `skip=true`) or
`GITHUB_ENV` (`MAKEFILES`, `NODE_OPTIONS`), or rewrite `db/` in the working tree after the diff
was taken. The same code can already neutralise the control when it runs (a fake `psql`), so this
is not new exposure; it bounds what "fail-closed" means here: fail-closed against honest change,
not against a hostile author. Worth one sentence in the amendment's section E.

### The checkout assertion (A1 F1 from PR #189) — fail-closed, closed on read

I extracted its `run:` block the same way and executed it with HEAD = `6fa511f`:

| `EXPECTED_SHA` | exit |
|---|---|
| `6fa511f…` (full, equal) | 0 |
| empty | 1 |
| `HEAD~1` | 1 |
| `6fa511f` (abbreviated) | 1 |
| full SHA with a trailing space | 1 |

Read: `EXPECTED_SHA` comes through `env:`, not interpolated into the script, so no expression
injection. `pull_request.head.sha` is always set on `pull_request`; if it were not, the fallback
`github.sha` is the merge commit and mismatches → red. On `push`, `head_ref` is empty, checkout
takes `github.sha`, and the comparison holds. A re-run after the branch moved fails, as intended.
A **fork** pull request now fails closed too: `head_ref` names a branch in the fork, and checkout
from the base repository either errors or finds a same-named base-repo branch whose SHA is not
`head.sha` — before this step, the latter would have tested the wrong code green. The `-z` clause
is an equivalent mutant (an empty expected value can never equal a 40-hex HEAD), as the Author
says. I count A1 F1 (PR #189) **addressed and verified on read and by execution**; it is verified
on the platform only when a CI run on this head shows the step's "checkout: HEAD … is the commit
this run reports on" line.

---

## 5. Stop-the-line check

No secret, credential, PII, tenant data or production configuration is touched. The diff changes
CI control flow, one RFC, tests and records. `persist-credentials: false` and `permissions:
contents: read` are unchanged. No new action, no new network access, no new dependency.
**Not stop-the-line.**

---

## 6. Verdict, and what the Owner may rely on

> **Security: no objection to PR #197 at `6fa511f` on security/privacy grounds.** The checkout
> assertion closes A1 F1 from PR #189 and is fail-closed. The skip rule is fail-closed on every
> error path, but DB_SURFACE is incomplete in four reproduced ways (F1-F4, all LOW); F1 and F2
> are one-line fixes I recommend before the Owner approves RFC-2026-007 §Amendment 2026-10-06, and
> F3/I1 belong in its section E if not fixed. The control still runs on every push to `main`,
> which bounds the consequence of any skip to detection one merge later.

---

## 7. What I did NOT check

- No CI run on `6fa511f` was read; the platform behaviour of either new step is inferred from the
  workflow text and local execution.
- I did not run the database or the control itself; I did not measure whether CRLF (F3) changes
  the control's result.
- I did not read GitHub's documentation on how `pull_request.base.sha` is refreshed when `main`
  advances without a `synchronize`; the two-dot tree diff fails toward RUN when the head is
  behind its base, so a stale base only costs time.
- I did not re-derive the Author's mutation results (9 mutants, 8 killed).
- Nothing was pushed, commented on GitHub, or written outside this file and my scratchpad.
