# WP-0A-A0-008 — R0 integration verdict on PR #208, 2026-10-05

| Field | Value |
|---|---|
| Work package | WP-0A-A0-008 (the service path identity, measured rather than assumed; RFC-2026-017) |
| Agent run id | `/claude/r0_steward` (Integration Owner; named successor to `/root/r0_steward` by the Owner's confirmed G0 step 2 item 2) |
| Subject | PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/208 (Draft, OPEN, MERGEABLE, `mergeStateStatus` BEHIND) |
| Branch | `agent/claude/WP-0A-A0-008-service-path` |
| Head | `25d449ca38b299d584fcfcb21af40c2be630af3b` |
| Branch's merge-base with `main` | `0955b32e6de055a6677d9e1b0e73373d209cb613` (PR #203) |
| `main` (`git ls-remote`) | `9b4a0ce60a3fcb6d1b65fa9f4cde8c0307e72b42` (PR #206) |
| Toolchain | Node v24.20.0 |
| Date | 2026-10-07 (file name keeps the dispatch date 2026-10-05) |

## 0. What I am

I am a subagent spawned by a workflow script of `/claude/a0_atlas`, acting as this package's Integration
Owner run `/claude/r0_steward` (`role_assignments.integration_owner_agent_run_id`). RFC-2026-024 §3/3
requires this disclosure: I share a vendor, a model family and a parent with the Author. I wrote none of
the PR's content and I fix nothing. This file is Integration Owner evidence only. It does not merge, does
not move the package's status, does not transcribe any role's verdict into the manifest, and does not
move Gate G0. This is the first R0 verdict for this package at any head (manifest `open_blockers[3]`).

## 1. Verdict

**`integration_conditional` at `25d449c` — NOT `integration_verified` at this head.** Stop-the-line:
**none**. Blocks merge: **yes, until I1-I5 (§5) hold on one head**; all five are mechanical.

The content is sound by every role's reading and by mine. What is missing is that the head does not
contain `main` (`9b4a0ce`), the three role files and this one are not on the branch, and the handoff is
therefore not last. Once I1-I5 hold, this verdict converts to `integration_verified` at that final head
without a further R0 run, because the simulation in §4 already built that head and found every guard
green.

## 2. The four conditions

| Condition | State at `25d449c` | Basis |
|---|---|---|
| Head contains `main` | **Not met** | `git merge-base --is-ancestor origin/main HEAD` exit 1; merge-base `0955b32`. `main` gained PR #206 (`9b4a0ce`) after the sync. `gh pr view 208`: `mergeStateStatus` BEHIND; protection on `main` is `strict: true`, `contexts: ["bootstrap"]`, `enforce_admins: true`. `verify-branch-scope.mjs 9b4a0ce… WP-0A-A0-008` exits **73** naming PR #206's three WP-0A-A0-005 paths (C0 F1, reproduced). |
| Every role verdict non-blocking | **Met in substance** | C0 `approved`; its only blocking finding (F1) is the sync, not the content. A1 `security_approved`, no condition. Q0 `test_verified` conditional on the handoff refresh last and alone and `bootstrap` green on the final head, which are I3/I4 here. No role found a stop-the-line. |
| Every gate in the manifest satisfied | **Met except my own** | `author_complete`: the Author's self-check and the handoff last and alone at `25d449c` (`check:handoff` 0 on the branch name, C0 and Q0). `review_approved`: C0 `c0-contract-reverify-2026-10-05.md` (`85b8795c`). `security_approved`: A1 `a1-security-reverify-2026-10-05.md` (`d6f1b44b`). `test_verified`: Q0 `q0-test-reverify-2026-10-05.md` (`5fe4e875`), conditions = I3/I4. `integration_verified`: withheld by this file until I1-I5. |
| Nothing protected changed | **Met** | `git diff --stat 0955b32 25d449c`: three paths, `work-packages/WP-0A-A0-008.json` (20), `handoffs/WP-0A-A0-008-author-handoff.json` (127), `evidence/WP-0A-A0-008/author-self-check-2026-10-07.md` (126), all in `ownership.writable_paths`. RFC-2026-017 untouched, so not a governance PR (RFC-2026-025 §5 item 6). No script, test, CI, lockfile, contract, migration, `db/**`, digest or root config. Each role commit (`85b8795c`, `d6f1b44b`, `5fe4e875`) has parent `25d449c` and adds exactly one file under `evidence/WP-0A-A0-008/`. |

CI at `25d449c`: `bootstrap` (Bootstrap validation, run 37508038445) **SUCCESS**, completed
2026-10-06T18:07:02Z, against base `0955b32`. A re-run against `9b4a0ce` would fail at "Verify branch
scope" (the exit 73 above), so this green does not carry to a merge.

## 3. Reading the role verdicts together

### 3.1 Where the roles agree

- The increment applies the Owner's step 2 items 1-3 and no further; the `_run_id_disambiguation`
  correction is measured true (C0, Q0); the counts in `open_blockers[0]` reproduce (C0, A1, Q0, and me:
  1200 cases, 61 labelled `RFC-2026-017§7`, 20 `denied` / 39 `no-rows` / 2 `no-effect`).
- `open_blockers[1]`'s conclusion holds: the production service path is unproven.
- `required_human_authorities[1]`: C0 (F4) and A1 (§4) both read the existing countersignature
  (`evidence/WP-0A-DB-00/a1-countersignature-role-topology.md`) as answering the item's substance for the
  three roles of RFC-2026-017 §3, with its reservations carried, and both record that "before the roles
  are created" was **not met** (`dab9637` 2026-09-05 22:07 roles; `aaa35ef` 2026-09-06 03:14
  countersignature) and cannot now be. I accept that reading as an integration fact; it is not a
  condition on this PR.
- Stale wording outside the PR's diff: `rollback_or_forward_fix` still says "RFC-2026-017 is a Proposed
  decision record" (A1-008-4 = Q0-N1); RFC-2026-017's own status line and §7 "does not exist yet" are
  stale (C0 F3/F6), a governance matter for the RFC's owner.

### 3.2 Where they differ: `open_blockers[0]` (RFC-2026-017 §7)

C0 F3 reads §7's ask as **met at the policy layer**: the assertion exists, demands SQLSTATE `42501`, runs
as a non-bypassing role, and is a CI control. A1-008-1 reads §7 as **not discharged as written**: the 20
are denials by absence of policy, and at least four (`audit_logs`, `security_events`, `usage_events`,
`notifications`) are cells the matrix marks `S` for service, classified in
`db/foundation/lint/service-policy-map.json` as owed a service policy, so they will invert when those
policies land. Q0-N2 adds that all 20 reach `app_worker` by SET ROLE from a superuser.

I measured the label set myself (§6): the four tables A1 names appear in `service-policy-map.json`, and
so do `business_profiles`, `jobs`, `quota_buckets` and `usage_reservations` (a text match on the file,
not a cell-level reading; the cell reading is A1's and A1 Identity's). That supports A1's point that
"20 denials" counts cases whose expectation is provisional.

**Integration reading:** this difference does not block integration, because no acceptance criterion of
this package and no gate in `review_and_test_gates` requires §7 to be discharged (criterion 5 requires
only that the RFC not claim isolation proven and name the assertion as owed, which all three roles read
as met). It does bound what the follow-up may record: **`open_blockers[0]` stays open.** Where the
independent Reviewer and the Security reviewer differ on a security-surface claim, the Integration Owner
does not pick the more permissive reading. The follow-up records both readings in place (C0 F3, A1-008-1)
and leaves the closure to a later increment in which a service denial against a matrix-`N` cell exists,
or to the RFC owner's governance PR on §7. This is a limit on the records follow-up, not a condition on
the merge.

### 3.3 Non-blocking findings, left for a records follow-up

C0 F2 (one clause: `scripts/db/authz-proofs.mjs` does log in as `app_worker_login` on migrate-clean
clusters, with `worker-login-authentication` NOT RUN under `trust`); A1-008-2 (record the order of the
countersignature); A1-008-3 (restore that production's reachable bypassing path is `authenticator` →
`service_role`); A1-008-4 = Q0-N1 (`rollback_or_forward_fix` "Proposed"). All are manifest wording.
**None is made in this PR** (I5): a manifest edit after the role verdicts would restart them.

## 4. The final head, simulated (throwaway, never pushed)

I did not take C0 F1 on report and did not predict the fix; I built the head A0 is expected to push, in
a private clone under the scratchpad, on the branch **name** (never detached), from GitHub:

1. `git checkout -B agent/claude/WP-0A-A0-008-service-path origin/agent/claude/WP-0A-A0-008-service-path`
   (`25d449ca`), then `git merge --no-ff origin/main` (`9b4a0ce`): **no conflict**.
   `git diff --stat origin/main HEAD` lists the same three paths with the same line counts (126 / 127 /
   20), and `git diff 25d449ca HEAD --` those three paths is **empty**: the sync leaves the PR's own diff
   byte-identical, which is the condition C0, A1 and Q0 each set for not needing a re-check.
2. One commit adding the three role files, byte-identical to their source commits (blob ids
   `e066719e` C0 from `85b8795c`, `f9fbd818` A1 from `d6f1b44b`, `0f0600bc` Q0 from `5fe4e875`), plus a
   one-line placeholder for this file.
3. `npm run refresh:handoff` → "now cites 9b4a0ce..95738e9 — 5 added, 2 modified, 0 deleted; base moved
   from 0955b32 to this branch's branch point against main"; `git status` showed only the handoff
   modified; committed alone.

| Command (on that throwaway head, branch name) | Exit | Result |
|---|---|---|
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-008` (`9b4a0ce`, the comparison CI makes) | 0 | "all 7 changed path(s) are declared, and every amendment explains one" |
| `npm run check` | 0 | tests 716, pass 716, fail 0, skipped 0, todo 0 |

The throwaway commits exist only in the scratchpad clone; nothing was pushed. This file is committed on my
worktree branch on top of `25d449c`.

## 5. What A0 must do before merge

None of these is a governance step. PR #208 edits no RFC, `CONTRIBUTING_AGENTS.md`, CI or gate.

- **I1. Sync with `main` (C0 F1; blocking).** On the branch name, never detached: `git merge origin/main`
  (a normal merge; no rebase, no force-push). Expected clean (§4 step 1).
- **I2. Role files on the branch, file only.** Take each by path (`git checkout <commit> -- <path>`), not
  by merging the role branches, so the branch gains exactly:
  `evidence/WP-0A-A0-008/c0-contract-reverify-2026-10-05.md` from `85b8795c`,
  `evidence/WP-0A-A0-008/a1-security-reverify-2026-10-05.md` from `d6f1b44b`,
  `evidence/WP-0A-A0-008/q0-test-reverify-2026-10-05.md` from `5fe4e875`,
  and this file from its commit. Each byte-identical to its source (blob ids in §4 step 2).
- **I3. Handoff refreshed last and alone** (Q0 condition 2): `npm run refresh:handoff` on the branch name
  after I1 and I2; that commit changes `handoffs/WP-0A-A0-008-author-handoff.json` only; `npm run
  check:handoff` exits 0.
- **I4. `bootstrap` green on that final head, and the head contains the `main` of the moment** (Q0
  conditions 3). If `main` moves again before the merge, repeat I1 and I3; no C0, A1, Q0 or R0 re-check is
  needed if `git diff <new main>...HEAD` lists only the package's three paths with the blobs read at
  `25d449c`, the I2 files, and a handoff differing only in revisions and file lists.
- **I5. Nothing else changes after `25d449c`** (Q0 condition 4). `git diff 25d449c..<final head>` lists
  only the I2 files, the handoff, and paths `main` brought in. **The manifest is not edited in this PR.**
  The F2 / A1-008-2..4 / Q0-N1 wording, the closing of `open_blockers[3]`, and the status move go to the
  records follow-up after the merge.

When I1-I5 hold, this file converts to `integration_verified` at that final head without a further R0
run, and A0 may merge under the Owner's standing delegation (CI green, reviews clear, no stop-the-line),
recording the delegation's words in the disposition as that delegation requires.

### 5.1 The records follow-up, after the merge

On a WP-0A-A0-008 branch from the new `main`, the way PR #201 recorded WP-0A-CON-003 and the A0-007
follow-up recorded A0-007; it edits the manifest, so it is its own PR.

- `status`: `integration_verified` (not `done`, not G0).
- Close `open_blockers[3]` ("NO ROLE VERDICT EXISTS FOR THIS PACKAGE AT ANY HEAD …") in place, keeping its
  index, with this text, filling the placeholders and changing nothing else:

> CLOSED <DATE> BY A0 (/claude/a0_atlas) ON THE INTEGRATION OWNER'S CONFIRMATION, NOT A NEW FINDING: first role verdicts at 25d449c: Reviewer /claude/c0_contract_reviewer approved, F1 closed by the sync with main, F2 <FIXED IN THIS FOLLOW-UP | LEFT OPEN>, F3-F6 answers or Info (evidence/WP-0A-A0-008/c0-contract-reverify-2026-10-05.md); Security /claude/a1_bastion security_approved, no condition, A1-008-1..4 suggestions (a1-security-reverify-2026-10-05.md); Tester /claude/q0_sentinel test_verified, its conditions met at the final head, Q0-N1 and Q0-N2 non-blocking (q0-test-reverify-2026-10-05.md); Integration Owner /claude/r0_steward integration_verified at final head <FINAL_HEAD>, merged to main as <MERGE_COMMIT> with bootstrap green (CI run <RUN_ID>) (r0-integration-verdict-2026-10-05.md). integration_verified is not done and not Gate G0; open_blockers[0], [1] and [2] stay open after the merge. Text as recorded: <THE ENTRY'S CURRENT TEXT, VERBATIM>.

- `open_blockers[0]` **stays open** (§3.2). A dated note in place may record that C0 F3 reads §7 met at
  the policy layer and A1-008-1 reads it not discharged as written, citing both files; it must not close
  the entry.
- `required_human_authorities[1]`: append the order (A1-008-2, C0 F4) as a dated current-state note.
- Optional in the same PR: C0 F2's clause and A1-008-3's sentence in `open_blockers[1]`; A1-008-4 / Q0-N1
  in `rollback_or_forward_fix`. If `open_blockers[0]`, `[1]` or `required_human_authorities[1]` are
  reworded, C0 confirms the wording and A1 confirms anything touching A1-008-1..3.

If any of I1-I5 is not true, A0 does not use the wording above and the package stays `in_review`.

## 6. Commands

| Command | Exit | Result |
|---|---|---|
| `git fetch origin`; `git ls-remote origin main agent/claude/WP-0A-A0-008-service-path` | 0 | main `9b4a0ce6`, branch `25d449ca` |
| `git merge-base --is-ancestor origin/main HEAD` (at `25d449c`) | **1** | head does not contain main |
| `git merge-base origin/main HEAD` | 0 | `0955b32e` |
| `git diff --stat 0955b32e HEAD` | 0 | three paths, all writable |
| `git diff --name-only 0955b32e origin/main` | 0 | PR #206's three WP-0A-A0-005 paths |
| `git log -1 --format='%H %P'` and `git diff --stat <c>^ <c>` for `85b8795c`, `d6f1b44b`, `5fe4e875` | 0 | each parent `25d449c`; one evidence file each |
| `gh pr view 208 --json …` (read) | 0 | OPEN, Draft, MERGEABLE, BEHIND, `bootstrap` SUCCESS (run 37508038445) |
| `gh api …/branches/main/protection` (read) | 0 | `strict: true`, `contexts: ["bootstrap"]`, `enforce_admins: true` |
| `node scripts/validate-work-packages.mjs` / `-ownership.mjs` / `-role-separation.mjs work-packages/WP-0A-A0-008.json` | 0 / 0 / 0 | — |
| `node scripts/scan-repository-secrets.mjs` | 0 | not cited as secret-coverage assurance |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-008-service-path` | 0 | `WP-0A-A0-008` |
| `node scripts/verify-branch-scope.mjs 0955b32e… WP-0A-A0-008` | 0 | "all 3 changed path(s) are declared" |
| `node scripts/verify-branch-scope.mjs 9b4a0ce6… WP-0A-A0-008` | **73** | PR #206's three paths (C0 F1) |
| scratchpad `s7.mjs` (imports `buildCases`, reads `service-policy-map.json`; read-only) | 0 | 1200 / 61 / 20 denied / 39 no-rows / 2 no-effect; of the 20 denied tables, `audit_logs`, `security_events`, `usage_events`, `notifications`, `business_profiles`, `jobs`, `quota_buckets`, `usage_reservations` appear in the map (text match) |
| `git grep WP-0A-A0-008 work-packages contract-catalog`; `WP-0A-CON-005.json` `authorized_cross_package_amendments` | 0 | only this manifest; CON-005 names none of this package's paths |
| §4 simulation: `git clone` (GitHub) → `checkout -B <branch name>` → `merge --no-ff origin/main` | 0 | clean; package paths unchanged vs `25d449c` |
| §4: `npm run refresh:handoff` / `npm run check:handoff` / `verify-branch-scope.mjs origin/main WP-0A-A0-008` | 0 / 0 / 0 | cites `9b4a0ce..`; "nothing substantive after its cited head"; "all 7 changed path(s) are declared" |
| §4: `npm run check` on the simulated head (branch name) | 0 | tests 716, pass 716, fail 0, skipped 0, todo 0 (output read through a `grep` filter; the runner's own summary is the evidence) |

## 7. Acknowledgement: the job-reference change (WP-0A-CON-005, RFC-2026-006)

**None pending for this package. Nothing to acknowledge, so nothing is given here.**

- `WP-0A-CON-005.json`'s `authorized_cross_package_amendments` names WP-0A-CON-001's contracts
  (`ctr-job-001`, `ctr-api-001`, `ctr-idm-001`), its test, and WP-0A-A0-002's
  `test-kits/integrity-manifest.json`. None of WP-0A-A0-008's paths
  (`architecture/decisions/RFC-2026-017-service-path-identity.md`, `work-packages/WP-0A-A0-008.json`,
  `evidence/WP-0A-A0-008/**`, `handoffs/WP-0A-A0-008-*.json`).
- No manifest other than this one names WP-0A-A0-008, so no `ownership.amended_by` entry is pending, and
  this manifest's `amends_without_owning.paths` is `[]`. The `_run_id_disambiguation` field says the
  same, and C0 and Q0 measured it.
- The sync this file asks for (I1) brings in only PR #206's WP-0A-A0-005 records, not a WP-0A-CON-005
  commit. The job-reference acknowledgement belongs to WP-0A-CON-005 / WP-0A-CON-001 and to the
  integrity-manifest owner WP-0A-A0-002, where this role gives it if sound; it does not reach here.

## 8. What I did not do

I edited no tracked file other than adding this one, pushed nothing, merged nothing, moved no status,
transcribed no verdict and ran no database (the package changes no SQL; the live isolation run is C0's
measurement on port 5650 and CI's). The throwaway merge, role-file and handoff commits of §4 live only in
the scratchpad clone.

VERDICT: integration_conditional at 25d449c (not integration_verified at this head). Stop-the-line: none.
Blocks merge: yes, until I1-I5 hold on one head — the sync with main 9b4a0ce (C0 F1), the three role files
and this file on the branch, the handoff refreshed last and alone, and bootstrap green on a head containing
current main. Converts to integration_verified at that final head without a further R0 run.
open_blockers[0] stays open after the merge. Job-reference acknowledgement: none pending for this package.
