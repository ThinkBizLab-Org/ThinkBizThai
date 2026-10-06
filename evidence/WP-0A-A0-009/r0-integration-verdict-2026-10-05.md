# WP-0A-A0-009 — R0 integration verdict on PR #207, 2026-10-05

| Field | Value |
|---|---|
| Work package | WP-0A-A0-009 |
| Agent run id | `/claude/r0_steward` (Integration Owner; named successor to `/root/r0_steward` by the Owner's G0 step 2 item 2) |
| Subject | PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/207 (Draft, OPEN, MERGEABLE, `mergeStateStatus` BEHIND) |
| Branch | `agent/claude/WP-0A-A0-009-service-path-corrected` |
| Head | `0cbdc3f4782cbd64da810f78bb99fb4b21f7fb52` |
| Branch point (`git merge-base`) | `0955b32e6de055a6677d9e1b0e73373d209cb613` (PR #203) |
| Base (`origin/main`, `git ls-remote`) | `9b4a0ce60a3fcb6d1b65fa9f4cde8c0307e72b42` (PR #206, WP-0A-A0-005) |
| Toolchain | Node v24.20.0 |
| Date | 2026-10-07 (file name keeps the dispatch date 2026-10-05) |

## 0. What I am

I am a subagent spawned by a workflow script of `/claude/a0_atlas`, acting as this package's Integration
Owner run `/claude/r0_steward`. RFC-2026-024 §3/3 requires this disclosure: I share a vendor and a parent
with the Author. I wrote none of the PR's content and I fix nothing. This file is Integration Owner
evidence only. It does not merge, does not move the package's status, and does not move Gate G0. This is
the first R0 verdict for this package at any head (manifest `open_blockers[3]`).

## 1. Verdict

**`integration_conditional` — NOT `integration_verified` at `0cbdc3f4`.** Stop-the-line: **none**.
Blocks merge: **yes, until the conditions in §4 hold.**

Answer to the question put to me: **yes, the package can move to `integration_verified` once the three
role files are on the branch, the branch contains `main`, the handoff is refreshed last and alone, and CI
is green at that head.** Nothing in the content blocks it. The only blocking item is mechanical: `main`
moved to `9b4a0ce` (PR #206) after the branch point, so the head does not contain `main`, the required
check cannot satisfy strict protection, and the scope guard against current `main` exits 73 (C0 F1). I
measured that a sync closes it without changing the package's own diff (§3).

## 2. The four conditions

| Condition | State at `0cbdc3f4` | Basis |
|---|---|---|
| Head contains main | **Not met** | `git merge-base --is-ancestor origin/main 0cbdc3f4` exit 1; merge-base `0955b32e`. `0955b32..9b4a0ce` is PR #206: `evidence/WP-0A-A0-005/records-transcription-2026-10-06.md`, `handoffs/WP-0A-A0-005-author-handoff.json`, `work-packages/WP-0A-A0-005.json`. `gh pr view 207`: `mergeStateStatus` BEHIND. |
| Every role verdict non-blocking | **Met after the sync** | C0 `approved`, blocks only through F1 (the sync), and states no re-check is needed if the diff does not change. A1 `security_approved`, blocks: no. Q0 `test_verified`, blocks: no. No finding of any role is stop-the-line. |
| Every gate in the manifest satisfied | **Met after the sync, except `integration_verified`** | `author_complete`: self-check `evidence/WP-0A-A0-009/author-self-check-2026-10-07.md`, handoff last and alone at `0cbdc3f4`. `review_approved`: C0 (`fa8c74a1`), including acceptance of the `product_reviewer_note` mapping (step 2 item 3) and the `_run_id_disambiguation` correction. `security_approved`: A1 (`f911d501`), the first A1 verdict with RFC-2026-019 as its subject, which is exactly what `open_blockers[0]` names as its closure. `test_verified`: Q0 (`25add715`), read CI run 37507939960 at this head including `db-rls-smoke: 1200 isolation case(s) passed`. `integration_verified`: withheld by this file until §4. |
| Nothing protected changed | **Met** | `git diff --stat 0955b32e 0cbdc3f4`: three paths, `work-packages/WP-0A-A0-009.json`, `handoffs/WP-0A-A0-009-author-handoff.json`, `evidence/WP-0A-A0-009/author-self-check-2026-10-07.md`, all inside `ownership.writable_paths`. Neither RFC-2026-018 nor RFC-2026-019 changed, so this is not a governance PR (RFC-2026-025 §5 item 6). No script, test, CI, lockfile, contract, digest, migration, `db/**` or root config. Each role commit has parent `0cbdc3f4` and adds exactly one file under `evidence/WP-0A-A0-009/`. |

CI: PR #207's required check `bootstrap` (Bootstrap validation, run 37507939960) concluded **SUCCESS** at
head `0cbdc3f4` (completed 2026-10-06T18:06:21Z). That run was against `0955b32`; it does not satisfy
strict protection against `9b4a0ce`.

## 3. The blocking finding, re-measured by this role

I did not take C0 F1 on report. In this worktree:

1. At `0cbdc3f4`: `node scripts/verify-branch-scope.mjs 9b4a0ce6… WP-0A-A0-009` → **exit 73**, naming
   PR #206's three WP-0A-A0-005 paths. Against `0955b32e` → exit 0 ("all 3 changed path(s) are
   declared").
2. **Sync measured, then discarded.** A temporary `git merge --no-ff origin/main` on top of `0cbdc3f4`
   merged without conflict; a second temporary merge of the three role commits (`fa8c74a1`, `f911d501`,
   `25add715`) merged without conflict. On that tree:
   - `git diff --stat origin/main HEAD`: six paths, the package's three plus the three role files
     (`c0-contract-reverify-2026-10-05.md`, `a1-security-reverify-2026-10-05.md`,
     `q0-test-reverify-2026-10-05.md`); the package's three with the same line counts as
     `0955b32..0cbdc3f` (109 / 165 / 16).
   - `git diff --stat 0cbdc3f4 HEAD` over `work-packages handoffs architecture scripts tests .github
     package*.json` and the self-check: only the two WP-0A-A0-005 records brought in by #206. The package's
     own blobs are unchanged by the sync.
   - `verify-branch-scope 9b4a0ce6… WP-0A-A0-009` → **exit 0** ("all 6 changed path(s) are declared").
   - `npm run check` → **exit 0**, tests 716, pass 716, fail 0, skipped 0, todo 0. Measured on a worktree
     branch, not the branch name, so the handoff guard did not read this branch's handoff (it would be red
     until the refresh in §4 item 3); the handoff guard on the branch name is condition 4 below.
   - `validate-work-packages`, `validate-work-package-ownership`,
     `validate-work-package-role-separation work-packages/WP-0A-A0-009.json` → 0 / 0 / 0.

   I reset the worktree to `0cbdc3f4` afterwards; neither temporary merge is on any branch, and neither
   is this file's commit. This file's one commit has parent `0cbdc3f4`, like the three role commits.

So after the sync the PR's own diff is identical, which is C0's stated condition for not re-checking. A1
and Q0 set none.

## 4. What A0 must do before merge

1. **Sync (C0 F1; blocking).** Merge `origin/main` into `agent/claude/WP-0A-A0-009-service-path-corrected`
   on the branch name, never detached. Expect no conflict. No rebase, no force-push.
2. **Put the four role files on the branch**: `fa8c74a1` (C0), `f911d501` (A1), `25add715` (Q0) and this
   file's commit. All four have parent `0cbdc3f4`, so merging or cherry-picking them adds exactly one
   file each and brings in nothing else.
3. **Handoff last and alone.** `npm run refresh:handoff` on the branch name, as the last commit, after the
   role files. Record in it the `npm run check` result on the synced head (C0 F4: the handoff's last
   recorded run is 705 tests, before the `0955b32` sync).
4. **CI green** on that head: `bootstrap` SUCCESS with every step success, including `db-rls-smoke`, and
   the head containing `main` as it then stands. If `main` moves again before merge, repeat 1, 3 and 4.
5. **Re-readings.** C0, A1, Q0: none, **provided** `git diff <main>...HEAD` lists only the package's
   three paths with the blobs reviewed at `0cbdc3f4`, the four role/R0 files, and a handoff differing
   only in its cited revisions and recorded runs. If A0 also edits the manifest (item 5), C0 confirms the
   wording, records only. R0: a short reading of the four conditions with the new head SHA and CI run.
6. **Merge** under the standing delegation (`thinkbizthai-po-directed-merge-by-author`, RFC-2026-025 §5
   item 6), only after items 1-5 hold. This PR changes no RFC, so it is not a governance PR and does not
   need the Owner's personal merge.

### 4.1 Rulings on the non-blocking findings

- **Q0-N1 (`open_blockers[3]` and `[0]` go stale as verdicts land).** Ruling: **not a merge condition.**
  They are true at `0cbdc3f4` and are made false by the role files themselves. A0 may correct them in
  the sync pass (records only; C0 confirms wording per item 5), or leave them for the post-merge records
  transcription (§4.2). Either is acceptable; I prefer the transcription, so the reviewed diff does not
  move.
- **Q0-N3 / A1-009-5 (`required_human_authorities[1]`).** Ruling: **met in substance, not as written.**
  A1's countersignature of the role topology exists (`evidence/WP-0A-DB-00/a1-countersignature-role-topology.md`,
  `aaa35efb`, 2026-09-06), but it postdates `001_service_roles.sql` (`dab96378`, 2026-09-05), so "before
  the roles are created" did not hold. The roles' creation is WP-0A-DB-00's act, not this package's, and
  A1's `security_approved` on this package now exists. Record it as satisfied after the fact, with the
  inversion named, in the transcription. Not blocking.
- **C0 F2 (`open_blockers[1]` "they exist" too broad), C0 F3 / A1-009-2 (RFC-2026-019 §8 "A1 has not seen
  this RFC"), A1-009-1 (RFC-2026-019 §5 item 2's FORCE-RLS rationale, also `scripts/db/run.mjs:3635-3636`),
  Q0-N2 (RFC-2026-019 status line, §4/3, §4/5).** Ruling: **owed by A0 on the governance PR already named
  in the handoff** (a dated line on RFC-2026-019), not by #207. That PR must carry all four: migration 172
  and RFC-2026-028; the narrower reading of F2 (`app_command`'s components exist via 172; `app_worker`'s
  path is a declared migration 173 not yet applied to the provisioned instance under RFC-2026-028;
  `app_maintenance` has no non-superuser path); §8's stale sentence; and §5 item 2's corrected rationale
  (under `FORCE ROW LEVEL SECURITY` the owner is subject to the policies; the rule is right for another
  reason). The `run.mjs` problem message is a `scripts/` change outside this package's writable paths;
  it is owed by the run.mjs owner on its own PR. None of these blocks #207.
- **A1-009-3, A1-009-4 (Info).** Recorded; no action owed by #207. A1-009-4 (rule-4 cases do not
  measure the platform's real `aal` claim nor prove the `app_command` row policy refuses independently
  of the in-function check) is a test-coverage item for the identity package that owns the isolation
  cases.

### 4.2 Post-merge transcription (provided for explicitly)

Unlike WP-0A-A0-005's R0 files, this file provides for recording after the merge. When, and only when,
§4 items 1-5 held at one final head that was then merged, A0 as scribe may record on a records-only
increment, on this file's behalf: `status` → `integration_verified` with the wording "R0
`/claude/r0_steward` integration_verified at <final head>, CI run <run id>, merged as <merge commit>",
citing this file and R0's short reading from item 5. In the same increment it may close
`open_blockers[0]` (A1's `security_approved`, `f911d501`) and `open_blockers[3]` (the four verdicts), and
annotate `required_human_authorities[1]` per §4.1. It moves no further than `integration_verified`:
`done` is not this role's to give, and Gate G0 stays "Specification Baseline Complete / External
Verification Pending" (`open_blockers[2]`).

## 5. Acknowledgement: the job-reference change (WP-0A-CON-005, RFC-2026-006)

**None pending for this package. Nothing to acknowledge.**

- `work-packages/WP-0A-CON-005.json`'s `authorized_cross_package_amendments` names WP-0A-CON-001's
  `ctr-job-001` schema, examples, manifest and test, `ctr-api-001` and `ctr-idm-001` schemas, and
  WP-0A-A0-002's `test-kits/integrity-manifest.json`. None of WP-0A-A0-009's writable paths
  (the two RFCs, `evidence/WP-0A-A0-009/**`, `handoffs/WP-0A-A0-009-*.json`,
  `work-packages/WP-0A-A0-009.json`).
- `git log origin/main --` both RFCs and this manifest lists `8701555f`, `00a47722`, `b788085e`,
  `433a4af7`, `c4986708`, `69ed807e`, `d312e3d2`, `2bb247dc`, `066a469a`; none is a WP-0A-CON-005 commit.
- No other manifest declares an amendment of these paths, and this manifest's
  `amends_without_owning.paths` is `[]`, so nothing is owed by or to the Codex run either. The
  job-reference acknowledgement this role gave is WP-0A-A0-002's (its R0 verdict §5); it does not reach
  here.

## 6. Commands

| Command | Exit | Result |
|---|---|---|
| `git fetch origin`; `git ls-remote origin main <branch>` | 0 | main `9b4a0ce6`, branch `0cbdc3f4` |
| `gh pr view 207 --json …` (read) | 0 | Draft, OPEN, MERGEABLE, BEHIND; `bootstrap` SUCCESS, run 37507939960 |
| `git merge-base --is-ancestor origin/main HEAD` (at `0cbdc3f4`) | **1** | head does not contain main |
| `git merge-base origin/main HEAD` | 0 | `0955b32e` |
| `git diff --stat 0955b32e 0cbdc3f4` / `0955b32e origin/main` | 0 | the package's three paths / #206's three WP-0A-A0-005 paths |
| `git show --stat fa8c74a1` / `f911d501` / `25add715` | 0 | one evidence file each, parent `0cbdc3f4` |
| `node scripts/verify-branch-scope.mjs 9b4a0ce6… WP-0A-A0-009` (at `0cbdc3f4`) | **73** | #206's three paths |
| `node scripts/verify-branch-scope.mjs 0955b32e… WP-0A-A0-009` (at `0cbdc3f4`) | 0 | three paths declared |
| temp `git merge --no-ff origin/main`, then temp merge of the three role commits | 0 / 0 | no conflict |
| `node scripts/verify-branch-scope.mjs 9b4a0ce6… WP-0A-A0-009` (temp merge) | 0 | six paths declared |
| `npm run check` (temp merge, worktree branch) | 0 | tests 716, pass 716, fail 0, skipped 0, todo 0 |
| `node scripts/validate-work-packages.mjs` / `-ownership.mjs` / `-role-separation.mjs work-packages/WP-0A-A0-009.json` (temp merge) | 0 / 0 / 0 | — |
| `git reset --hard 0cbdc3f4` | 0 | temp merges discarded |
| `git log origin/main --` both RFCs and the manifest | 0 | nine commits, none CON-005's |

VERDICT: integration_conditional (not integration_verified at `0cbdc3f4`). Stop-the-line: none. Blocks
merge: yes, through the missing sync with `main` (C0 F1) only. It becomes `integration_verified` when §4
items 1-5 hold at one head; no role needs to re-read if the package's diff is unchanged.
