# Records transcription: PR #207 merge record and WP-0A-A0-009 `integration_verified`, on R0's behalf

Date: 2026-10-09. Scribe: `/claude/a0_atlas` (WP-0A-A0-009's Author). The Author decides nothing here: every word
recorded in the manifest is copied from R0's `evidence/WP-0A-A0-009/r0-short-reading-2026-10-09.md` §4, and every
status move rests on R0's verdict in that file.

**Path: full, not light.** This PR carries R0's own short reading (commit `d6c441923f0f14eea7b57234efa36580d149cfeb`,
`cherry-pick -x` of `b739a164f243fe621343c4b4b9314b64401bffd1`). An `r0-*.md` file is not a record under
RFC-2026-025 §6.1 item 2, so this PR takes the full path, which is order (ii) of the short reading's §4 "Path".

## 1. Facts verified with `gh`/`git` in this run

| Fact | Value | How verified |
|---|---|---|
| PR | #207, branch `agent/claude/WP-0A-A0-009-service-path-corrected`, base `main`, `MERGED`, not a Draft | `gh pr view 207 --json mergeCommit,headRefOid,mergedAt,mergedBy,isDraft,state,baseRefName,headRefName` |
| Merged at | `2026-10-06T19:37:12Z` | same |
| Merge commit | `85ad66dabc2b4305abe6ea998758c4cbefc83148` | same, `mergeCommit`; `git merge-base --is-ancestor 85ad66da origin/main` exits 0 |
| Merge parents | `5cb5cb83871179be83b0fe98e34112e0d992eddc` (main), `d1efb73d87fa1fde3719fc85b04cf4c6c8d717cb` (final head) | `git log -1 --format=%P 85ad66da` |
| Final head | `d1efb73d87fa1fde3719fc85b04cf4c6c8d717cb` | `gh pr view 207` `headRefOid` |
| CI on the final head | run `37518860891`, `Bootstrap validation`, `pull_request`, `completed`/`success` | `gh run list --commit d1efb73d…`; `gh run view 37518860891 --json conclusion,headSha,event` |
| `mergedBy` | the repository account `workstationgroup` | `gh pr view 207` `mergedBy`. It does not show which run or person pressed |
| Commits after the roles' head `0cbdc3f4` | `72ffcccc` C0, `5b249954` A1, `f2c8864a` Q0, `a3012531` R0 (each `cherry-pick -x` of `fa8c74a1`, `f911d501`, `25add715`, `8997f531`), `28b0b77c` merge of main, `7f66cd67` handoff, `c2f57682` merge of main, `d1efb73d` handoff | `git log --oneline --first-parent 0cbdc3f4..d1efb73d`; `git log --format=%B -4 a3012531` |
| Role files on `main` | C0 `c0-contract-reverify-2026-10-05.md`, A1 `a1-security-reverify-2026-10-05.md` (`security_approved` at `0cbdc3f4`, its line 160), Q0 `q0-test-reverify-2026-10-05.md`, R0 `r0-integration-verdict-2026-10-05.md` (`integration_conditional`, §4.2 provides for this transcription) | `git log -1 origin/main -- evidence/WP-0A-A0-009/<file>`; read |
| Countersignature vs role creation | `aaa35efb` 2026-09-06 (`a1-countersignature-role-topology.md`) after `dab96378` 2026-09-05 (`001_service_roles.sql` added) | `git log --format='%h %ad' --date=short` on each path |
| Who pressed | not recorded on `main` | `git grep -e 85ad66d -e '#207' origin/main` outside `evidence/WP-0A-A0-009/`: no file names the presser |

**Carry clauses.** R0's short reading §3 measured each of C0's, A1's and Q0's carry clauses against the commits after
`0cbdc3f4` and found that each holds. R0's own re-reading proviso was tripped, by handoff prose beyond cited revisions
and recorded runs, and R0 discharged it in that same file. Its §2 rules that item 5 (R0's short reading) did not hold
at the press and holds now. This file records R0's ruling. It does not make one.

## 2. What is recorded, and from where

Source: `evidence/WP-0A-A0-009/r0-short-reading-2026-10-09.md` §4, carried on this branch as `d6c44192`. Each
blockquote was copied programmatically, with its lines joined by single spaces. `<S>` is filled with
`d6c441923f0f14eea7b57234efa36580d149cfeb`, the commit that carries the file on this branch. PR merges here use
`--merge`, so that SHA is unchanged on `main`.

- `status`: `in_review` → `integration_verified`. Authorised by R0's verdict line in the short reading
  ("`integration_verified` at `d1efb73d…`, CI run `37518860891`, merged as `85ad66da…`. Given after the merge").
- `open_blockers[0]`: R0's closing clause put in front, then the old text whole after "Text as recorded: ".
- `open_blockers[3]`: R0's closing clause put in front, then the old text whole after "Text as recorded: ".
- `required_human_authorities[2]`: R0's "RECORDED after PR #207 merged …" entry, appended. Entries `[0]` and `[1]`
  are byte-identical.

No other manifest field changes.

**Merge record for the state record (RFC-2026-025 §2 item 1).** Only R0's sourced sentence, verbatim, from its §4:

> PR #207 was merged at 2026-10-06T19:37:12Z as 85ad66dabc2b4305abe6ea998758c4cbefc83148 by the repository account workstationgroup (gh pr view 207, mergedBy); no file on main records which run or person pressed it. The authority R0's verdict named for the press is the Owner's standing delegation of 2026-10-03, `ถ้าเสร็จแล้วคุณ merge เองไปได้เลย` (evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-127.md §6).

No sentence about who pressed PR #207 is added. No file on `main` and no A0 record states it.

## 3. What this increment does not do

- It does not move the package to `done`. `open_blockers[1]` and `[2]` (G0 External Verification Pending) stay as
  written.
- It writes none of A1-009-1 or A1-009-2 (the dated line on RFC-2026-019). That line is owed by A0 on an RFC-2026-019
  governance PR. It also leaves the RFC-2026-017 §3 correction alone, which is owed under WP-0A-A0-008.
- It does not edit the merged handoff text that R-009-2 names (`assumptions[5]` and `assumptions[8]` as merged).
  This increment's handoff states R0's four merge conditions plus item 5 and cites §4.1 and §4.2 correctly.
- It writes no role verdict. It does not touch an RFC, CI, a script, a test, `ownership.branch` or `role_assignments`.

## 4. Flags for the reader

1. **R-009-1 (process).** PR #207 was pressed before R0's §4 item 5 reading existed. The record says so in
   `open_blockers[3]`, in R0's words. It does not imply that item 5 held at the press.
2. **No presser statement.** `gh` shows only the repository account. Whether `--match-head-commit` was used cannot be
   shown.
3. **`<S>` is the branch SHA `d6c44192`.** If this PR merges with `--merge` (not squash or rebase), that commit
   reaches `main` unchanged. Any other merge method would leave `<S>` pointing at a commit that is not on `main`.
