# Records transcription: R0's R5 acknowledged, and LP219-1's boundary marked (RFC-2026-025 §6)

Date: 2026-10-09. Scribe: `/claude/a0_atlas` (WP-0A-DB-00's Author). Path: the records light path of
RFC-2026-025 §6. The Author decides nothing here and moves no status. Both records quote or concern R0's words,
so under §6.2 item 1 the one independent reading is C0's, checked against the R0 files on `main` cited below.

## 1. Facts verified with `gh`/`git` in this run

| Fact | Value | How verified |
|---|---|---|
| PR #204 (WP-0A-A0-002 E4 increment) | `MERGED` `2026-10-08T00:34:38Z` | `gh pr view 204 --json mergeCommit,headRefOid,mergedAt,state` |
| PR #204 merge commit | `ae163ed8bb2473228b6d68dd8e764d55048857db`, parents `389f3845…` (main) and `56e47b22…` (head) | `gh pr view 204`; `git log -1 --format=%P ae163ed8` |
| PR #204 final head | `56e47b2258ed48d645379042dabae0d73ca1660c` | `gh pr view 204` `headRefOid` |
| CI on #204's head | run `37668637885`, `Bootstrap validation`, `pull_request`, `success` | `gh run list --commit 56e47b22…` |
| The thirteen modules | the 13 keys PR #204 added to `test-kits/integrity-manifest.json` (listed in `[205]`) | `git diff 389f3845 ae163ed8 -- test-kits/integrity-manifest.json`, added keys only |
| PR #220 (WP-0A-A0-002 records) | `MERGED` `2026-10-08T18:20:17Z`, merge `d44dbdbb1efebc9d891e3d31fdf01a8a8060c59a`, head `4631c1d8…` | `gh pr view 220`; `git log -1 --format=%P d44dbdbb` |
| CI on #220's head | run `37822054105`, `Bootstrap validation`, `pull_request`, `success` | `gh run list --commit 4631c1d8…` |
| WP-0A-A0-002 status on `main` | `integration_verified` | `node -e` read of `work-packages/WP-0A-A0-002.json` at `d44dbdbb` |
| PR #219 (DB-00 RFC-030 records) | `MERGED`, merge `1940d7be…`, head `199d1d79…` | `gh pr view 219` |
| LP219-1 source on `main` | `evidence/WP-0A-DB-00/light-path-reading-2026-10-08-pr219.md` §3, committed `26427333` | `git log -1 -- <file>` |
| Line pins after the edit | `open_blockers` lines 253–457 hold the same entries; `[203]` stays one line (456); one line (458) added after `[204]` | `node --test --test-name-pattern "batch 141 prep" test-kits/db/foundation-contract.test.mjs` under the suite lock: 4/4 pass, exit 0 |

## 2. What is recorded

1. **R5, as a new entry `open_blockers[205]`** (appended at the end; an acknowledgement, not a blocker).
   - Source: `evidence/WP-0A-A0-002/r0-review-2026-10-07.md` §3 "R5: DB-00's consequence", R0's paragraph
     verbatim, line breaks joined with single spaces. It is the finding table's R5, "Advisory, after merge", owner
     WP-0A-DB-00.
   - R0 kept it owed in `r0-recheck-2026-10-08.md` ("After merge, record R5 on WP-0A-DB-00.") and in
     `r0-ruling-2026-10-09.md` §6 ("stays owed on WP-0A-DB-00's own branch"). WP-0A-A0-002's `open_blockers[13]`
     on `main` says the same: "it is owed to that package after merge, not by this branch".
   - The entry names the thirteen modules and states the consequence in A0's words. From `ae163ed8` on, a DB-00
     edit to any of them also runs `npm run regenerate:manifest` and declares `test-kits/integrity-manifest.json`
     under `ownership.amends_without_owning`. These are A0's words and are marked as such, outside the quotation.
2. **LP219-1, as text appended to `open_blockers[203]`.** The old text is kept whole at the start.
   - Source: C0's advisory LP219-1, `light-path-reading-2026-10-08-pr219.md` §3.
   - The append marks where R0's words from `r0-review-2026-10-08-pr218.md` §5 begin and end. They begin at
     "R0 re-check 2026-10-08 at 3a7b44c5" and end at "Stop-the-line: none.".
   - It states that the prefix and the closing sentence ("C0’s, A1’s and Q0’s final-round words for PR #211 are not
     transcribed here; …") are A0's, not R0's.
   - Checked against the source: R0's §5 blockquote ends at "Stop-the-line: none.". The paragraph after it, which
     is outside the quote, carries the same content as A0's closing sentence.

## 3. What this increment does not do

- WP-0A-DB-00's `status` stays `in_review`.
- None of the thirteen modules, their digests, `test-kits/integrity-manifest.json` or any `ownership` field is
  edited.
- C0-218-3 and R-17 are not attempted. C0's, A1's and Q0's final-round words for PR #211 stay owed from their own
  role files.
- No RFC, CI, gate, contract, script, test, map or lockfile is touched.

## Flags for the reader

- **R19 (process, `r0-ruling-2026-10-09.md` §6).** PR #204 was pressed before R0's condition-2 and C0's
  condition-4 re-checks existed. Those carry clauses were tripped by the merge of main `6b37b9ed` and discharged
  only after the merge. R5 is an advisory consequence, not a status move, and R0's ruling of 2026-10-09 keeps it
  owed after measuring that change. So this record does not depend on the tripped clause. The reader may judge
  otherwise.
- **"The Product Owner merges personally"** appears in R0's review §5, next to R5. It is not quoted here. Who
  pressed #204 is recorded in WP-0A-A0-002 `open_blockers[13]` and `[15]`, not on this package.
- **The reader.** R0's words are the subject of both records, so C0 is proposed as the one reader (§6.2 item 1).
  The R0 file that names this package and the change is `r0-review-2026-10-07.md` §5 item 6, "Record R5 on
  WP-0A-DB-00", on `main`.
