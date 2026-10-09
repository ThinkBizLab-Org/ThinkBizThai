# RFC-2026-010 status line: SEC, AUD, OBS and USG are Candidate (WP-0A-CON-008, 2026-10-09)

Author: `/claude/a0_atlas`. Governance increment, full path. Built on `origin/main` `a4eed0e8` (PR #235's merge).
No role has run on it.

## 1. Facts verified

| Fact | Command | Result |
|---|---|---|
| PR #233 merged | `gh pr view 233 --json mergeCommit,headRefOid,mergedAt` | merge `65695129f1feed95d08b863ee8a935c0d122cb8c`, head `03e17484`, 2026-10-09T11:42:46Z |
| PR #235 merged | `gh pr view 235 --json mergeCommit,headRefOid,mergedAt` | merge `a4eed0e8d6f01fa341c3314052d14695bbdc59e7`, head `beca950c`, 2026-10-09T13:13:11Z |
| PR #231 merged | `gh pr view 231 --json mergeCommit,headRefOid,mergedAt`; `git log -1 --format=%P d17ff256` | merge `d17ff25606977b6e9135e9466e3606a7ccdc45da`, parents `75c60335` then `32d3a862`, 2026-10-09T10:11:52Z |
| #231 CI on its final head | `gh run list --commit 32d3a862…` | "Bootstrap validation" run `37914937881`, completed, success |
| #231 commits after the roles' head `749b86b2` | `git log 749b86b2..32d3a862`; `git show --name-only` each; `git log -1 --format=%B` each | four role files, each one file and each `cherry picked from`; then the handoff alone |
| #231 handoff at merge names the true basis and count (R0 #231 §8.2 item 5) | `git show 32d3a862:handoffs/WP-0A-CON-008-author-handoff.json` | names `ให้ A0 กดทั้งสองแบบ (Recommended)` and "NOT the 2026-10-03 standing delegation"; Q0 740/740, which Q0's file measured |
| #231 role verdicts | the four `*-review-2026-10-09-pr231.md` files | C0 `review_approved`, A1 `security_approved` (no finding of any grade), Q0 `test_verified`, R0 `integration_verified`; none stop-the-line |
| Contract status on main | `contract-catalog/shared-kernel/index.json` at `a4eed0e8` | SEC, AUD, OBS, USG `Candidate`; NTF `Draft` |
| A1 K2 and K3 on main (A1 §7 (e) says the long form applies once both are) | `grep` in `evidence/WP-0A-CON-004/product-owner-disposition-2026-10-09-candidate-sec-aud-obs-usg.md` (on main since `01deb3c1`) | F5 answer `ยังใช้ได้ RFC ตามมา (Recommended)` present; `อนุมัติ SEC (Recommended)` present |
| The Owner's three A6-side approvals | the same file, items 3 to 5 | `อนุมัติ AUD (Recommended)`, `อนุมัติ OBS (Recommended)`, `อนุมัติ USG (Recommended)` |
| The new line quotes A1 and A6 byte for byte, and keeps the rest of line 3 | a node script: A1 §7 (e) with the two placeholders filled, A6 §7 (WP-0A-CON-004 file) joined with single spaces and cut before `;`, main's line split on the replaced clause | all four `true` |

## 2. What is changed, and from which file

- `architecture/decisions/RFC-2026-010-shared-kernel-freeze-readiness.md` line 3. Only the clause
  "CTR-SEC-001 awaits A1; CTR-AUD-001, CTR-OBS-001 and CTR-USG-001 await A6;" is replaced, as R0 prescribed in
  `evidence/WP-0A-CON-006/r0-review-2026-10-09-pr235.md` §6 and `evidence/WP-0A-CON-004/r0-review-2026-10-09-pr233.md`
  §5 (R-233-4):
  - SEC: `evidence/WP-0A-CON-004/a1-sec-candidate-signature-2026-10-09.md` §7 (e), verbatim, with
    `<date>` = 2026-10-09 and `<disposition path>` =
    `evidence/WP-0A-CON-004/product-owner-disposition-2026-10-09-candidate-sec-aud-obs-usg.md`.
  - AUD, OBS, USG: `evidence/WP-0A-CON-004/a6-candidate-signature-2026-10-09.md` §7, up to and including
    "(evidence/WP-0A-CON-006/a6-candidate-signature-2026-10-09.md)". Then A0's words, marked "A0's words, not A6's":
    the three approvals, the disposition path, and the merges of #233 and #235.
  - Unchanged: "Partially approved 2026-09-02", the five A0-owned promotions, "CTR-NTF-001 is A5's and remains
    unassessed", and the Limitations sentence.
- `test-kits/integrity-manifest.json`: regenerated (`npm run regenerate:manifest`). A WP-0A-A0-002 amendment.
- `evidence/WP-0A-CON-008/product-owner-disposition-2026-10-09-three-governance-prs.md`: the Owner's press direction,
  as A0 relayed it.
- `work-packages/WP-0A-CON-008.json`:
  - `open_blockers[9]`: R0's #231 §8.3 words appended, old text whole, placeholders filled from gh and git (§1).
  - `[10]` (new): the two status records (#231 to `integration_verified` on R0's §8.3, then `in_review` for this
    increment), this increment, its presser basis and what is owed.
  - `[11]` (new): the amendment records on this package that R0's #233 and #235 files name as owed.
  - `amends_without_owning.paths` narrowed to `test-kits/integrity-manifest.json`, and the rationale appended.
  - `status`: `in_review`, as before.

## 3. What is not done

- No contract, schema, fixture, test or script changed.
- "Partially" is not dropped: CTR-NTF-001 is still Draft.
- NTF's clause does not change. It changes only in NTF's own Candidate step, in A5's words.
- A6 was not asked for post-disposition wording. R0's first option (A6 up to the semicolon, then A0's marked words)
  is used.
- No role verdict is written, and nothing is merged.

## 4. Flags for the reader

- **The Owner's press direction is A0's relay.** This run did not check it against the session transcript, and it
  has no timestamps. The disposition file says so.
- **`gh` shows `workstationgroup` as the merger of #231, #233 and #235.** That account cannot tell A0's press apart
  from the Owner's own click. `[9]`'s "pressed by A0" follows R0's words and #231's final handoff, which named A0 as
  the presser.
- **The RFC is governance.** RFC-2026-025 §6.1 item 5 says an RFC is not a record. This PR takes the full path with
  four roles.
