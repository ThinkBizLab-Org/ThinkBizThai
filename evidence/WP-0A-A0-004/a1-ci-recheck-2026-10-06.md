# A1 Security/Privacy re-check — WP-0A-A0-004's CI increment at PR #197 head `d6a1e85`

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer named by `work-packages/WP-0A-A0-004.json`
`role_assignments.security_reviewer_agent_run_id`.
Subject: https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/197 (Draft, GOVERNANCE), branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, head
`d6a1e85042225f5d88082e1d71d8f27997c29fb5`. First round: `a1-ci-increment-2026-10-06.md` (at `6fa511f`).
Date: 2026-10-06.

**This document records findings. It advances no package status, writes `security_approved`
nowhere, and repairs nothing it found.**

---

## 0. What I am, before anything else

**I am a subagent spawned by a workflow run of `/claude/a0_atlas`, the Author of this increment,
in the same vendor and model family (RFC-2026-024 §3/3-4).** A0's workflow wrote my brief,
including its summary of what changed after the first round. I treated that summary as the
Author's claim and checked it against the tree, the CI log and local execution. A same-vendor
review does not pass Gate G0's external verification (RFC-2026-024 §3/5); a defect neither A0 nor
I thought of is one I probably did not find (§6).

## 1. Verdict

> **No security or privacy objection to PR #197 at `d6a1e85`. A1 F1, F2, F3 and F4 from the first
> round are closed, each verified by executing the step as committed, and I1 is recorded in
> RFC-2026-007 §Amendment E as I asked. One new LOW finding (N1): the `base.ref == 'main'` guard
> is an Actions expression, and Actions compares strings ignoring case, so a pull request into a
> branch named `Main` or `MAIN` passes it. 26 crafted attempts against the new step found no
> other skip that should not happen.**

Stop-the-line: **no**. Blocks the Owner's merge on security grounds: **no**. N1 needs someone with
write access to create a case-variant of `main`, and the control still runs on every push to
`main`, so nothing reaches `main` unchecked. It is a one-line fix I recommend, not a precondition.

## 2. The first round's findings

| Finding | Status at `d6a1e85` | Basis |
|---|---|---|
| F1 root `GNUmakefile` / `makefile` skipped | **Closed** | `DB_SURFACE` holds `(GNUmakefile\|makefile\|Makefile)$`; cases 08-09 RUN |
| F2 base not on `main` skipped | **Closed, with N1** | step `if:` adds `github.event.pull_request.base.ref == 'main'` (`ci.yml:198`); see N1 for case |
| F3 `.gitattributes` and symlinks | **Closed** | `(.*/)?\.gitattributes$` on the surface (cases 10-12 RUN); `git ls-tree -r -z` of both trees, `grep -qz '^120000 '`, RUN unless grep exits exactly 1 (cases 13, 22 RUN) |
| F4 quoted paths never matched | **Closed** | `git -c core.quotePath=false diff -z`, `grep -zE` over a file; cases 02-07 RUN, including TAB, newline, `"`, `\` and an invalid UTF-8 byte |
| I1 in-job code can steer the step | **Recorded** | RFC-2026-007 §Amendment E "A hostile author" |

## 3. Measured

### 3.1 Toolchain and the Author's commands

Private clone of the local repository under `…/scratchpad/a1-ci-r/repo`, checked out **by branch
name** (`git checkout -B agent/claude/WP-0A-A0-004-ci-independent-guard-step d6a1e850…`;
`git branch --show-current` printed the name; `git rev-parse HEAD` = `d6a1e850…`). Node `v24.20.0`,
npm `11.19.0` from `/Users/bank/.local/node-v24.20.0/bin`, first on `PATH`; `npm ci --ignore-scripts`.

| Command | Result |
|---|---|
| `node --test test-kits/branch-scope.test.mjs` | 20 tests, 20 pass, 0 fail |
| `npm run check` | see §3.4 |

### 3.2 The decision step, executed against crafted trees

I extracted the `run:` block of step `db_surface`, its `if:` and its `DB_SURFACE` **from `ci.yml` at
`d6a1e85` by program** (not retyped) and ran it as
`env -i PATH=/usr/bin:/bin … bash --noprofile --norc -eo pipefail step.sh`. Each head was built with
git plumbing (`update-index --cacheinfo`, `write-tree`, `commit-tree`) on top of `d6a1e85` in a
second private clone, so case-only names, newlines and modes are exact and no working tree or
case-insensitive filesystem is involved. Every case exited 0.

| # | Change (base = `d6a1e85` unless noted) | Decision |
|---|---|---|
| 00 | none | SKIP (correct) |
| 01 | `README.md` only | SKIP (correct) |
| 02 | `db/foundation/migrations/099_ทดสอบ.sql` | RUN |
| 03 | `db/…/099_a"b.sql` | RUN |
| 04 | `db/…/099_a<TAB>b.sql` | RUN |
| 05 | `db/…/099_a<LF>b.sql` | RUN |
| 06 | `db/…/099_a\b.sql` | RUN |
| 07 | `db/…/099_<0xFF>.sql` (invalid UTF-8) | RUN |
| 08 | root `GNUmakefile` | RUN |
| 09 | root `makefile` (exact lower case, via plumbing) | RUN |
| 10 | root `.gitattributes` | RUN |
| 11 | `db/.gitattributes` | RUN |
| 12 | `docs/.gitattributes` | RUN (margin) |
| 13 | symlink `docs/link` added off the surface | RUN (symlink branch) |
| 14 | `docs/Makefile` | SKIP (correct: make reads only the cwd) |
| 15 | `DB/x.sql` | SKIP (correct on the Linux runner) |
| 16 | mode change `100644 → 100755` on a `db/` file | RUN |
| 17 | gitlink (mode `160000`) at `docs/sub` | SKIP (correct: checkout does not fetch submodules) |
| 18 | gitlink at `db/sub` | RUN |
| 19 | root `Makefile ` (trailing space) | SKIP (correct: make does not read it) |
| 20 | new `.github/CODEOWNERS` | RUN |
| 21 | delete a `db/` file | RUN |
| 22 | base holds a symlink, head deletes it | RUN (symlink branch, base tree) |
| 23 | head behind a base whose newer commit added a migration | RUN (two-dot diff names it) |
| 24 | `BASE_SHA` empty | RUN, nothing written |
| 25 | `BASE_SHA` = forty zeros | RUN |
| 26 | `BASE_SHA` = a tree object | RUN (`^{commit}` refuses it) |

Error paths: `DB_SURFACE='('` → grep exit 2 → RUN; an unwritable `GITHUB_OUTPUT` on the skip path
→ step exit 1 → job red, never a silent skip. I could not make `mktemp -d` fail on macOS
(`TMPDIR` pointing nowhere was ignored); the `if ! work="$(mktemp -d)"` guard is correct on read.

**Tool divergence.** Locally `grep` is BSD grep 2.6.0 and `bash` is 3.2; the runner has GNU grep and
bash 5.2. On read, GNU semantics can only add matches here (a non-text byte treated as a line
terminator, or `^` after an embedded newline, starts more records, and every surface entry is
anchored at the record start or ends in ASCII), so they fail toward RUN. The Author's own cases
for quoted names and symlinks ran on the runner's GNU grep inside `npm run check` of CI run
37406144369 and passed (log: `✔ a path git would quote still makes the negative control run …`,
`✔ a symlink in either tree makes the negative control run …`, `ℹ tests 702`, `ℹ pass 702`).

### 3.3 The platform run on `d6a1e85`

`gh run view 37406144369`: event `pull_request`, head `d6a1e850…`, branch name as above, conclusion
`success`; every step `success`, including `Decide whether the negative control must run` and the
control. Log lines: `checkout: HEAD d6a1e850… is the commit this run reports on`; the decision step
ran with `BASE_SHA: 25663e31…` (merge of PR #195, an ancestor of the head) and printed `the database
surface changed; the control RUNS. Paths: .github/workflows/ci.yml`; the control printed `every
family above failed the suite, as each must.` The runner's shell for the step is `/usr/bin/bash -e
{0}` (no `pipefail`), which matches the Author's harness; no pipe affects the decision. The SKIP
branch has still not run on the platform, as RFC §Amendment E says.

### 3.4 Full suite

`npm run check` on the branch name in the private clone: exit 0, 702 tests, 702 pass, 0 fail, 0 skipped, 0 todo.

## 4. Findings

### N1 — LOW. `base.ref == 'main'` is case-insensitive

GitHub's expressions reference, Operators: "GitHub ignores case when comparing strings." So the
step's `if: … && github.event.pull_request.base.ref == 'main'` is true for a pull request into
`Main`, `MAIN` or `mAiN`. The push trigger is `branches: [main]`, so a push to such a branch never
ran the control, and the skip premise ("a base on `main` ran the control") is false for it. A
pull request into `MAIN`, whose tip carries a `db/` change pushed there directly, diffs against
that tip and SKIPS — the F2 shape, narrowed to a case variant. RFC-2026-007 §Amendment B says "A
pull request into any branch other than `main`: likewise [runs]", which this contradicts.

Reach: creating `MAIN` beside `main` needs write access, and the merge into `main` still runs the
control on `main`'s push. **Not measured:** I did not create such a branch (that would be a push),
so whether GitHub accepts a branch differing from `main` only by case, and whether the
`branches: [main]` push filter matches it, are unverified. The case-insensitive comparison itself
is documented, not inferred.

Fix (one line, plus a test): keep the `if:`, and compare inside the script, where bash is
case-sensitive:
`BASE_REF: ${{ github.event.pull_request.base.ref }}` and
`[ "${BASE_REF:-}" = main ] || { echo "negative control: base is not main; the control RUNS"; exit 0; }`.
The static test can then pin the shell comparison, and a harness case with `BASE_REF=MAIN` RUNS.

### Attempts that did not produce a wrong skip

- Every byte class git quotes, plus invalid UTF-8 (cases 02-07).
- Mode-only change, deletion, gitlinks, symlinks in either tree (16-18, 21-22).
- A head behind a base that changed `db/`, and an unusable `BASE_SHA` (23-26).
- **Off-surface inputs the control could read at run time.** Re-read the closure modules for
  `readFile`, `readdir`, `spawn`, `new URL` and `process.env`: every file path resolves under
  `db/` or `scripts/db/`; `authz-proofs.mjs` writes its worker credential files under a
  `mkdtemp` in the runner's temp directory and points `PGPASSFILE` there. `psql` reads `~/.psqlrc`
  from `/home/runner`, not the repository. No test in `npm run check` writes into the checked-out
  tree (`ratchets-bite` mutates a copy). No root file off the surface (`.npmrc`, `.gitmodules`,
  `.env`) is read by `make db-rls-smoke`. I agree the surface is complete for honest change.
- GNU make's built-in RCS/SCCS rules for remaking `Makefile` (`RCS/Makefile,v`, `SCCS/s.Makefile`)
  are off the surface, but they would call `co`/`get`; I did not check whether the runner image ships
  them. Such a file is a protected root-level path the branch-scope guard makes the PR declare.
  Recorded as considered, not a finding.

## 5. Stop-the-line check

No secret, credential, PII, tenant data or production configuration is touched. The increment
changes CI control flow, one RFC, tests and records. `permissions: contents: read` and
`persist-credentials: false` are unchanged; no new action, dependency or network access.
**Not stop-the-line.**

## 6. What I did NOT check

- I did not create a case-variant branch or push anything; N1's platform half is unmeasured.
- I did not run GNU grep or bash 5.2 locally; their behaviour rests on the reading in §3.2 and on
  the Author's tests passing on the runner.
- I did not run the database or the control locally; the control's behaviour is the CI run's.
- I did not re-derive the Author's mutation results or re-read the other roles' re-checks.
- Nothing was pushed, commented on GitHub, or written outside this file and my scratchpad.
