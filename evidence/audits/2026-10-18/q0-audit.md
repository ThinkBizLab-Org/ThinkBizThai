# Q0 round audit, 2026-10-18: `main` from `01b49187` (exclusive) to `27ff9970` (inclusive), merges #282–#294

- **Role:** Q0, independent Tester (`/claude/q0_sentinel`). Third round audit under RFC-2026-034 §2.3.
- **Range:** `01b49187..27ff9970` on `main` (first parent), the merges of PR #282 to #294, fixed at `27ff9970`
  [measured: `git log --first-parent --oneline 01b49187..27ff9970`, 13 merges; #284 merged before #282].
- **Reading time:** 2026-10-18T11:44:42Z to 12:20Z UTC [measured: `date -u`].
- **Brief:** `.claude/ntf-session/brief-audit-1018.md`.
- **Verdicts:** `test_verified` for each risk-lane PR in range: **#282, #286, #290, #291**. No fast-lane PR is in
  range. On `27ff9970`: the full suite passes 854 of 854 under the suite lock on the branch name `main`;
  `regenerate:manifest` and `record:verification` leave no diff; CI on `main` at `27ff9970` is green on both required
  jobs, with `Type-check the application` and `Application tests` (8 files, 293 of 293) green.
- **Stop-the-line:** no. **Security finding:** none raised by Q0.
- **Findings:** Q0-AUD1018-1 (Low, a flaky guard case: the SIGQUIT branch of the commit gate's interrupt test races
  its verifier's exit under load; the best-supported explanation of #294's 1-of-854 failure, not proven),
  Q0-AUD1018-2 (Info, mutation spot check of the commit gate), Q0-AUD1018-3 (Info, sync records still cite no `cmp`),
  Q0-AUD1018-4 (Info, scope). None blocks the verdicts above. The second round's Q0-AUD1017-1 is closed; -2 and -3
  continue as -3 and -4 here (§5).

## 0. Who I am

`/claude/q0_sentinel`, a Claude Code subagent (Anthropic, `claude-opus-5-5`) spawned by A0 (`/claude/a0_atlas`), who
authored every PR audited here; C0, A1 and R0 come from the same lineage, the same-lineage reading the Product Owner
accepted with disclosure. I disclose it and do not claim it is cured. I audit only: I fixed, pushed and merged nothing
and write no other role's verdict; I did not read the other auditors' 2026-10-18 files. One worktree in my scratchpad
(`q0wt`), added DETACHED at `27ff9970`; I checked out `main` in it (`--ignore-other-worktrees`) for the suite run only, to
measure on the branch name, then detached again, then cut this branch for this file alone. For §3.3 I used one
throwaway `git clone --shared` in my scratchpad (not a worktree; deleted afterwards). No `npm ci`, no `node_modules`.
Every mutation was restored (`git status --porcelain` empty after each batch). I never touched the main checkout or
any `$P/wt-*`, and removed no lock I did not create.

## 1. Commands on `27ff9970` [measured: scratchpad `q0a/suite.out`, `suite.log`, `record.out`, `handoff.out`]

On branch `main` at `27ff9970`, node v24.20.0, npm 11.19.0.

| Command | Result |
|---|---|
| `npm run check` (under `$P/suite.lock`, acquired 11:45:12Z, exit at 11:53:21Z) | exit 0; tests 854, pass 854, fail/cancelled/skipped/todo 0 |
| `npm run regenerate:manifest`, then `git diff --exit-code` | exit 0, no diff |
| `npm run record:verification`, then `git diff --exit-code` | exit 0 ("recorded 854 passing, 0 skipped, 0 todo"), no diff |
| `npm run check:handoff` | exit 75, "no work package declares ownership.branch "main"" — expected on `main`, not a defect |

Not run locally (need `node_modules` or CI's Postgres): `typecheck`, `test:app`, `verify-app-boundaries
--require-parser`, the web build and `Database foundation`; §2 reads them from CI.

## 2. CI on `main` [measured: `gh run view 39119363553 --json jobs` and `--log`; `gh run list --branch main --event push`]

Run 39119363553 (`push`, `main`, head `27ff9970`): `bootstrap` success (both validations 854/854, `Database foundation`
and the negative control success); `application` success (vulnerability audit, boundaries parsed, **Type-check the
application** and its negative control, **Application tests** 8 files 293 passed — 50 tenant-context, 45 run, 161
contract-fixtures, 9 idempotency, 7 stable-error, 17 envelope, 3 index, 1 web page — boundaries again, build, build-graph
check). Required checks on `main`: `bootstrap`, `application`, `strict: true` [measured: `gh api
…/branches/main/protection/required_status_checks`]. Every `main` push run in the range (`411dc065` … `27ff9970`, 13
runs) concluded success on both jobs.

## 3. Every merged PR: lane, readers, carries, CI, press

**Method.** Base = merge `^1`, final head = merge `^2`; for all 13, `headRefOid` equals `^2`, the base is an ancestor of
the head, and the merge has two parents. Classifier: the **base's** `classify-review-tier.mjs` and
`classify-records-only.mjs` read with `git show <base>:…` into a scratch directory and run as CI runs them (`<base> <head>
--lane --head-ref=… --repo=… --head-repo=…`); every run exited 0 and printed "classifier copy: the base's"
[scratchpad `q0a/cls/<n>/out`]. "CI printed" is the `review tier and lane:` line of the final head's `pull_request` run,
whose `BASE_SHA` equals merge `^1` in all 13. Post-reading commits were classified by script [`q0a/carry.py`]: role
files (`cherry-pick -x`, blob-equal to the source commit, one path), handoff-only commits, and merges of `main` (both
sides' paths, the merge's tree against `git merge-tree --write-tree`, `classify-records-only.mjs --sync` with the
merge's copy, `regenerate-integrity-manifest.mjs` at the merge then `git diff --quiet`).

| PR | Lane (local = CI) | Final head | Q0's reading → final head | Final-head CI (both jobs) |
|---|---|---|---|---|
| #282 | risk (role files make it not records-only) | `eeab508a` | `ff4c4178`; 4 role files, handoff, merge `c15ef7fa` (no overlap; tree = merge-tree; `--sync` 0; manifest round-trips), handoff | 39031574099, 843/843, app 293 |
| #283 | governance | `8db9b1eb` | `cd7f26ad`; 4 role files, merge `1e32d86b` (no overlap; `--sync` 0; manifest round-trips), handoff | 39033682171, 843/843 |
| #284 | audit | `11e3d5d6` | audit lane: four files, each `cherry-pick -x`, blob-equal, one path | 39029736692, 843/843 |
| #285 | governance | `ed9d6fc0` | `700362d0`; 4 role files, merge `3267c096` (overlap: manifest only, auto-merged; tree = merge-tree; `--sync` 0; round-trips), handoff | 39038006512, 843/843 |
| #286 | risk; read as governance by four roles | `3426ba72` | `67edeed1`; 4 role files, handoff `0da70aae` (the correction Q0-286-1 asked for), C0/A1 re-reads, handoff | 39042309658, 843/843 |
| #287 | governance | `2ffa49c3` | round 3 `2c50e9a8`; 4 role files, handoff | 39050751518, 843/843 |
| #288 | governance | `e73d4515` | `7cdfb26b`; 4 role files, merge `5f84c666` (no overlap; `--sync` 0; round-trips), handoff | 39057702206, 843/843 |
| #289 | governance | `3e01902f` | `f62a7220`; 4 role files, handoff | 39055610615, 843/843 |
| #290 | risk | `73259044` | `af7c2f49`; 4 role files, handoff | 39075278646, 843/843 |
| #291 | risk | `b220af5a` | `c935e0f2`; 4 role files, merge `3b4bcbe3` (no overlap; `--sync` 0; round-trips), handoff | 39078268099, 843/843 |
| #292 | governance | `eac0dc45` | round 3 `2e7e1463`; 4 role files, handoff | 39088865958, 851/851 |
| #293 | governance | `8543341a` | `a368dff8`; 4 role files, handoff | 39103142589, 852/852 |
| #294 | governance | `b762d9a6` | `7429e741` (after merge `98b138a2`, which Q0 read; R0-294-1); 4 role files, handoff | 39118384041, 854/854, app 293 |

### 3.1 Lanes

My runs print exactly what CI printed for all 13. No lane error. #282, #290 and #291 change only evidence, a handoff
and a manifest, but carry role files (and a manifest field change for #290, #291), so they are tier H and not
records-only, hence risk; #282's Q0 file (lane "records" at `ff4c4178`, before any role file) said in advance that the
role files would move it to risk. #286 changes `acceptance_criteria` and `deterministic_commands` in WP-1A-A0-002's
manifest: risk, read by all four roles under the 11:53:17Z answer, which is stricter than the lane needs. #284 is the
second round's audit, audit lane, on WP-0A-A0-001's branch. The eight governance PRs each touch a governance path
(an RFC, a guard test, `scripts/test-suite-contract.mjs`, `scripts/commit-when-clean.mjs`, the integrity manifest or
`db/foundation/lint/**`).

### 3.2 Readers on the final head, CI, press

- **CI.** Every final head has a green `pull_request` run on both required jobs, completed before its merge [measured:
  run `updatedAt` < `mergedAt` for all 13].
- **Q0's carries.** For all 13 every post-reading commit falls under the reading's own carry clause; all role files are
  blob-equal to their sources; every post-reading merge of `main` has a tree equal to `git merge-tree`, `--sync` exit 0,
  and a manifest that regenerates with no diff. No press went outside a Q0 verdict's words this round.
- **Risk-lane readers.** A1 and Q0 passed on the reading heads above and carry to each final head (#286: A1's
  round 2 at `0da70aae`, Q0 by clause (c); R0's `changes_requested` on `67edeed1` turned `ready` by its own clause (c) on
  that same handoff commit — R0's to confirm).
- **Who pressed.** `gh` shows `workstationgroup` for all 13; the repository records A0 as presser. The Owner quotes in
  the seven dispositions added in range were checked against the transcript by script [`q0a/quotes.py`]: every Thai or
  "(Recommended)" quote is found at its cited line (6128/6137 at 2026-10-17T11:53:13.702Z/11:53:17.372Z, 7512/7524 at
  16:21:29.114Z/16:31:14.663Z, 7894/7906 at 20:32:39.277Z/20:36:01.360Z, 8561/8565 at 2026-10-18T02:24:44.011Z/
  02:39:25.100Z); the three found elsewhere are labelled as A0's readings or translations (`ลุยยาว`, "ลุยเลย ไม่ต้องรอถาม",
  the English rendering of the 7524 option), not as the Owner's words. Every press is after the answer it cites. Whether
  each answer reaches its PR is C0's and R0's.

### 3.3 The 1-of-854 failure during #294's sync (brief: known)

A0's `sync-con008.sh` ran `record:verification` (no per-test output kept) at ~07:55Z on the uncommitted merge of
`3288e618` into `32ea7a46`, before `regenerate:manifest`; it refused with "pass 853, fail 1". The merge it then committed
(`54be8ab5`, later amended to `98b138a2`) carried `evidence/VERIFICATION.md` blob `a5dd2d01` = `main`'s side, so the
conflicted generated files had been taken from `main` (theirs), not ours as Q0-294-2's reproduction assumed. In a
throwaway clone on the branch name, `main`/`origin/main` at `3288e618`, the same uncommitted merge, both generated files
`--theirs` [scratchpad `q0a/repro-A.out`, `repro-B.out`, full per-test output kept]:

- (A) no regeneration: 6 failures (5 integrity-manifest cases, and the whole of `ratchets-bite.test.mjs` lost to the
  coverage-floor ratchet's error stream), 839 reported;
- (B) after `regenerate:manifest`: 854 of 854 pass (the runner then exits 89 on `VERIFICATION.md`, by design).

Neither state gives 1 of 854. A flaky case does (Q0-AUD1018-1): under concurrent load the commit gate's interrupt test
fails on exactly one assertion. That is the best-supported explanation; without the run's output it stays unproven.

## 4. Coverage of risk-lane code, and what merged

- **Risk-lane code in range: none.** #282, #286, #290 and #291 change records, handoffs and manifests only. No path
  under `src/` or `apps/` changed in range (CI's application tests stay 293).
- **Code in range** came through governance PRs Q0 read before merge: `scripts/commit-when-clean.mjs` (#292, three
  rounds, each with mutations), and guard tests `app-stack` (#287), `ratchets-bite` (#292), `branch-scope` (#293),
  `ci-guard-behaviour` and `handoff-conformance` (#294). Registry changes only raise counts and names: in all five test
  files every old test name is still present (39→40, 17→18, 25→26, 23→31, 21→21) [measured: `test(` names at
  `01b49187` and `27ff9970`].
- **Independent spot checks on `27ff9970`** (my worktree, restored after each):
  - `app-stack.test.mjs` (baseline 21/21) against five edits of `ci.yml`: a job-level `defaults: run: shell:` in
    `application`, a workflow-level `defaults:`, a `>> "$GITHUB_ENV"` write and a `>> $GITHUB_PATH` write in application
    steps, and a step `shell: sh` — **all five killed** (2 to 5 cases fail each).
  - `commit-when-clean.mjs` against the 12 commit-gate and `GIT_*` cases (baseline 12/12): Q0-AUD1018-2.
- **Merged without the tests its lane needed:** none found. Open from earlier readings and not re-graded here: Q0-292-3,
  -5, -7 (Info, unpinned gate paths), Q0-294-1, -3 (Info), Q0-281-1 (Low, `job-store.ts`'s list entry).

## 5. Findings

- **Q0-AUD1018-1 (Low, flaky guard case; `test-kits/ratchets-bite.test.mjs` "the commit gate puts the index back and
  stops its verifier when it is interrupted").** Its SIGQUIT branch asserts `stillRunning(verifierPid) === false` at once
  after the gate exits, but the gate waits only for `npm`'s `close`; the verifier is `npm`'s grandchild in the same
  group and can outlive it briefly. Measured on `27ff9970`: 0 of 5 sequential runs fail; 4 of 24 fail with 8 concurrent
  runs, and 1 of 8 in a mixed concurrent batch, every time on "SIGQUIT: and leave no verifier running"
  [`q0a/flake/*.out`, `q0a/stress/r2-2.out`]. A probe (temporary, restored) that polls instead of asserting found the
  verifier still present at the gate's exit in 3 of 24 SIGQUIT runs, gone 82–128 ms later; SIGTERM never showed it. So
  the gate's behaviour holds (the verifier dies at once, nothing is committed, the index is put back); the assertion
  races. A required-suite case that fails under load can fail `record:verification`, the commit gate or CI on a sound
  tree, and it is the best-supported cause of #294's 1-of-854 (§3.3). Owed: a bounded wait before that assertion (or the
  gate waiting until its verifier's group is gone) — a governance PR (a guard test or the gate), WP-0A-CON-008's.
- **Q0-AUD1018-2 (Info, commit gate mutation spot check).** Six one-at-a-time mutations of `commit-when-clean.mjs`
  against the 12 cases [`q0a/mut-*.out`]: `GIT_COMMON_DIR` not refused — killed; `GIT_INDEX_FILE` naming another index
  allowed — killed; the verifier keeping the caller's `GIT_*` — killed; an interrupt exiting 1 — killed; `if
  (!unreadable) restore()` made unconditional — survives; `SIGHUP` dropped from `SIGNALS` — survives. Both survivors
  are in classes already recorded open (Q0-292-3: SIGHUP right by probe, not pinned; Q0-292-5/-7: the read-error and
  readability paths), so nothing new is owed beyond those.
- **Q0-AUD1018-3 (Info, sync records; continues Q0-AUD1017-2).** `--sync` names `test-kits/integrity-manifest.json` as
  involved for `1e32d86b` (#283), `3267c096` (#285) and `5f84c666` (#288), whose messages say only "mechanical sync"
  and cite no `cmp` (RFC-2026-025 §6.3 item 1). Measured now, each round-trips and its tree equals `git merge-tree`, so
  each was mechanical in fact; `98b138a2` (#294) is not mechanical under §6.3 (a) (`main` changed the PR's own
  `scripts/test-suite-contract.mjs`; `--sync` exit 1), already R0-294-1 and recorded in its handoff. R0's call on records.
- **Q0-AUD1018-4 (Info, scope; continues Q0-AUD1017-3).** Without `node_modules` I did not run `typecheck`, `test:app`,
  line coverage or mutation of `src/**`; no `src/` or `apps/` path changed in range, and CI's green application job
  (293/293) stands in for them.
- **Closed:** Q0-AUD1017-1 (#268's press against Q0's carry clause) is recorded on `main` by #288 (`work-packages/
  WP-0A-DB-00.json`, its records transcription and handoff name it).

## 6. What this audit covers and does not

It covers the tests and CI of the cumulative diff `01b49187..27ff9970`, the lane and Q0 carry of all 13 PRs, and the
Q0 verdict on the risk-lane PRs (#282, #286, #290, #291). Governance PRs were read by Q0 on their reading heads before
merge and are not re-verdicted here; #284 is the audit lane. It does not judge records, Owner-answer scope, press
legality or security grades (C0, R0, A1).
