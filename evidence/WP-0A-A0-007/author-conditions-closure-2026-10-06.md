# WP-0A-A0-007: Author closure of the role runs' record conditions, 2026-10-06

Author: `/claude/a0_atlas`, acting under the Owner's delegation "เอาตามที่คุณแนะนำทุกอย่าง". A0
executes the steps the roles named, each as the role worded it; it decides nothing, approves nothing,
moves no status and does not merge. PR #200 edits no RFC, `CONTRIBUTING_AGENTS.md`, CI or gate, so it
is not a governance PR (RFC-2026-025 §5 item 6; C0 §6, R0 §2).

## What this round changed

Records only. No code, test, contract, migration, digest or RFC text changed.

1. **Role files on the branch** (R0 §4 item 2). C0's file was committed on `d863f40`, not on the PR
   head, so only its one file was taken (`git checkout db65fbc4 -- evidence/WP-0A-A0-007/c0-contract-reverify-2026-10-05.md`)
   and committed; `db65fbc4` itself is not merged. A1 `85dd78c1`, Q0 `c9242e16` and R0 `0d6ed97a` were
   cherry-picked with `-x`.
2. **Sync with `main`** (C0 F1, A1-007-1, Q0-F1, R0 §4 item 1). `origin/main` (`d863f40`, PR #199)
   merged into the branch on the branch name with a normal merge, before any record fix. Clean, as R0's
   trial merge predicted; it brings in only #199's three WP-0A-A0-002 paths.
3. **C0 F2 / A1-007-2** — `open_blockers[1]`: the still-open list is now attributed to the lines of
   RFC-2026-028 that name each item ("among them", not exhaustive). Status line (line 3): Q-028-3
   custody, Q-028-12 pooler with Q170-c, A1's co-owner acceptance. "Implemented in part" line (line 6):
   Q-028-13 / Q170-c before the provisioned instance, A1R-2 (widened by A1-173-1), §5/5's secret-scan
   half NOT implemented (owed to the Integration Owner's path), Q-028-11's connection limit. Q-028-5,
   which the status line also names, is recorded as answered by the "Implemented, Q-028-5" line (line 7,
   migration `174_job_tenant_context.sql`; CTR-JOB-001's restatement owed to its owner). The blocker's
   tail is unchanged.
4. **C0 F3 / A1-007-3 / Q0-N1** — `author-self-check-2026-10-06.md` §3: a dated correction paragraph
   says `93bbdb6` did not touch the manifest and lists the four commits that did; the original sentence
   is left as written.
5. **C0 F5** — `required_human_authorities[2]`: the original text is kept, followed by a dated
   parenthetical giving the current state (decided: RFC-2026-017 / -019 / -028; what remains open is
   `open_blockers[1]`'s list).
6. **Q0-N2** — the manifest's `rollback_or_forward_fix`: "One Proposed decision record" now reads that
   RFC-2026-016 is Approved 2026-09-05 (`93bbdb6`), with the old wording quoted.

## Owed, not done here

- **RFC-2026-016's stale status line, §4 "the service path is undecided" and §7 cross-vendor clause**:
  untouched. Editing an Approved RFC is the governance path; owed to the RFC's owner (C0 F5 third
  bullet, A1 §3, R0 §4 "Not owed by this PR").
- **The handoff** is not refreshed in this round. Its `reviewer_instructions` still list `93bbdb6`
  (C0 F3); the final handoff refresh, last and alone, is where that and the base move belong. The
  handoff guard may read red until then.
- **Q0 re-verification on the synced head** (R0 §4 item 6): required; `test_failed` stands until then.
  C0 confirms the wording of items 3, 5 and 6 (records-only, R0 §4 item 6); A1 confirms item 3's
  phrasing since A1-007-2 is touched. R0 re-issues on the final head.
- `open_blockers[4]` ("no role verdict exists for this package at any head") is now superseded by the
  four role files on this branch; transcribing the verdicts into the manifest's status and blockers
  waits for Q0's re-verification and R0's re-issue.
- No merge; the standing delegation (RFC-2026-025 §5 item 6) applies only once R0 returns
  `integration_verified` on a green head that contains current `main`.
