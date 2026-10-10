# RFC-2026-010 status line: CTR-NTF-001 is Candidate (WP-0A-CON-008, 2026-10-11)

Author: `/claude/a0_atlas`. Governance increment, full path. Built on `origin/main` `89b2167d` (PR #244's merge).
NTF sequence item 4 of the Product Owner's NTF/A5 disposition of 2026-10-09
(`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-09-ntf-a5.md`).

## 1. Facts verified

| Fact | Command | Result |
|---|---|---|
| PR #244 merged | `gh pr view 244 --json mergeCommit,headRefOid,mergedAt` | merge `89b2167d9a8f62e91da666fd3e05105b3a431e1e`, head `469fd312`, 2026-10-10T17:43:55Z |
| #244 CI on its final head | `gh run list --commit 469fd312…` | run `38072357856`, success |
| CTR-NTF-001 on main | `contract-catalog/shared-kernel/index.json` and `ctr-ntf-001/manifest.json` at `89b2167d` | `Candidate`, version `1.0.0`; no contract is Draft |
| A5's words for the line | `evidence/WP-0A-CON-006/a5-ntf-candidate-reading-2026-10-10.md` §6 | extracted by script from the blockquote, joined with single spaces |
| PR #237 merged (for `open_blockers[10]`) | `gh pr view 237 --json mergeCommit,headRefOid,mergedAt`; `gh run list --commit 70632509…` | merge `b10e20a5`, head `70632509`, 2026-10-09T16:58:05Z; run `37961528756`, success |

## 2. What is changed, and from which file

- `architecture/decisions/RFC-2026-010-shared-kernel-freeze-readiness.md` line 3. Only the clause "CTR-NTF-001 is A5's
  and remains unassessed." is replaced:
  - A5's words, verbatim from its §6 (words A5 had already signed, R0-238R-1's first case).
  - Then A0's words, marked "A0's words, not A5's", in the form the line already uses for A6: the Owner's Q3
    `ให้ A0 กดทั้งชุด (Recommended)` with its disposition path, "CTR-NTF-001 is Candidate by PR #244 (merge 89b2167d)",
    and that neither A5's ratification nor the Owner's approval is toward Frozen.
  - Unchanged: "Partially approved 2026-09-02", the five A0-owned promotions, the SEC, AUD, OBS and USG clauses, and the
    Limitations sentence. "Partially" stays because the RFC's approval was given in parts; reading it as "all nine
    approved" would be a change of status wording that no role or Owner asked for.
- `test-kits/integrity-manifest.json`: regenerated. A WP-0A-A0-002 amendment, as on PR #237.
- `work-packages/WP-0A-CON-008.json`:
  - `open_blockers[10]`: R0's #237 words (`r0-recheck-2026-10-09-pr237.md` §6) appended, old text whole, placeholders
    filled from gh, git and the three re-check files.
  - `[12]` (new): the two status records (#237's increment to `integration_verified` on R0's words, then `in_review` for
    this increment), the change, and the presser basis R0 ruled (`evidence/WP-0A-CON-006/r0-review-2026-10-10-ntf3.md`
    §4.1).
  - `[13]` (new): the amendment records on this package that R0 named as owed for PRs #242, #243 and #244.
  - `status`: `in_review`, as before.

## 3. What is not done

- No contract, schema, fixture, test or script changes.
- Nothing freezes. The Frozen-stage owner signature and A5's F-1 to F-5 stay owed (WP-0A-CON-006 `open_blockers[31]`).
- R0's #244 post-merge words go on WP-0A-CON-006's next PR, not here.

## 4. Flags for the reader

- **Presser.** A0 presses this governance PR only under R0's ruling that Q3 names it, and only for this PR. The ruling
  corrected R0's earlier sentence that the Owner presses it personally (R0-244-2).
- **`gh` shows `workstationgroup` as the merger** of #237 and #244; who pressed rests on the session record and on
  R0's words.
