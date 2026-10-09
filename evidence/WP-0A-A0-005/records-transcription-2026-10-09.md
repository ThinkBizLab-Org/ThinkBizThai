# Records transcription: WP-0A-A0-005 `integration_verified` on R0's ruling of 2026-10-09

Date: 2026-10-09. Scribe: a records-only subagent of A0 (`/claude/a0_atlas`). Branch
`agent/claude/WP-0A-A0-005-cardholder-data-scan`, cut from `origin/main` `d44dbdbb1efebc9d891e3d31fdf01a8a8060c59a`.
This file decides nothing. It records what R0's ruling says A0 records, and the facts checked before doing so.

The ruling `evidence/WP-0A-A0-005/r0-ruling-2026-10-09.md` was **not on `main`** when this branch was cut. A0
carried it onto this branch with `git cherry-pick -x 4e59a323dc940dc084a030c2259a50798f223c6c` (first commit on the
branch). The ruling's "How it reaches `main`" paragraph expected it to land on `main` first so that this PR could
take the records-only path; because a role file is carried here, this PR takes the full path instead, as A0
directed.

## 1. Facts verified

| Fact | Command | Result |
|---|---|---|
| PR #190 merged, merge and head commits | `gh pr view 190 --json state,mergeCommit,headRefOid,mergedAt,mergedBy` | `MERGED` `2026-10-06T11:43:05Z`; merge `5debf570215c2a1e7f8cd8be14e6226419ba60c4`; head `2d015cc9aa1cb39b976c3e89978210f8a3c09918`; `mergedBy` `workstationgroup` (the repository account) |
| Merge parents | `git log -1 --format='%H %P' 5debf570215c2a1e7f8cd8be14e6226419ba60c4` | `8689e3c792ecd4178b07376a8fab167f59a9ac9b` (`main`) and `2d015cc9…` (head) |
| Merge is on `main` | `git merge-base --is-ancestor 5debf570 origin/main` | exit 0 |
| `main` at merge contained in the head | `git merge-base --is-ancestor 8689e3c 2d015cc9` | exit 0 |
| CI on that exact head | `gh run view 37419674193 --json name,event,headSha,status,conclusion`; `gh run list --commit 2d015cc9…` | `Bootstrap validation`, `pull_request`, `headSha` `2d015cc9…`, `completed` / `success`; the only run on that commit |
| Role verdicts (C0, A1, Q0 at `db6274c`) not tripped by later commits | `git diff --quiet db6274c 2d015cc9 -- scripts/scan-repository-secrets.mjs test-kits/secret-scan.test.mjs architecture/decisions/RFC-2026-008-cardholder-data-scan.md scripts/test-suite-contract.mjs` | exit 0: the judged code paths are byte-identical at the final head |
| R0 sync reading's carry rule not tripped | `git diff --name-only 8f6b2994 2d015cc9` | only `evidence/WP-0A-A0-005/r0-sync-reading-2026-10-06.md` and `handoffs/WP-0A-A0-005-author-handoff.json` |
| Every file the appended text cites is on `main` | `git cat-file -e origin/main:<path>` for `r0-recheck-2026-10-06.md`, `r0-sync-reading-2026-10-06.md`, `evidence/WP-0A-CON-005/records-transcription-2026-10-06.md`, both 2026-10-08 Owner dispositions | all exit 0. The ruling itself is on this branch only (see above) |
| The Owner's words and their source | `grep -n` in `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-08-rfc-025-s6-answers.md` | §6 item 5 quotes A0's message (names the rule, no PR number) and the reply `คุณทำเลย` |
| The link to #190 | `grep -n '#190'` in `evidence/WP-0A-CON-005/records-transcription-2026-10-06.md` and `…-rfc-030.md` | line 41 "A0 reports that the Owner … repeated … for #190 and #197"; RFC-030 disposition §2 restates it |
| Transcription exact | node: blockquote lines of the ruling's §4 (b) with `> ` removed, joined by single spaces, compared to `open_blockers[10]` as bytes | equal; 2 backticks and 4 apostrophes kept |
| Nothing else in the manifest changed | node: `open_blockers[0..9]` and every field other than `status` compared with `origin/main` | identical |

## 2. What is recorded, and from where

Source: `evidence/WP-0A-A0-005/r0-ruling-2026-10-09.md` §4 "(b) What A0 records, and where", the role verdict that
names this package and the target status (RFC-2026-025 §6.2 item 1).

In `work-packages/WP-0A-A0-005.json`:

1. `status`: `in_review` → `integration_verified`.
2. `open_blockers[10]` appended: R0's block, beginning `R0 RULING 2026-10-09 (evidence/WP-0A-A0-005/r0-ruling-2026-10-09.md)`
   and ending `Stop-the-line: none.`, copied programmatically from the ruling, byte for byte.

## 3. What is not done

- `open_blockers[0]`–`[9]` are untouched. `[5]` (the RFC-2026-008 governance merge) is not closed; the ruling puts it
  outside its scope.
- No acknowledgement of `amended_by` on `WP-0A-A0-003.json` or `WP-0A-A0-002.json`.
- `required_human_authorities` and `ownership` are unchanged.
- No move to `done`. No role verdict written; no merge.

## Flags for the reader

1. **The presser clause rests on A0's report.** The Owner's `คุณทำเลย` of 2026-10-06, as quoted on `main`, names no
   PR. That it covered #190 is A0's account (`evidence/WP-0A-CON-005/records-transcription-2026-10-06.md` §2,
   restated in the RFC-030 disposition §2). The ruling says so in the recorded text.
2. **The ruling is void if the Owner says otherwise.** Per its §3 last paragraph, if the Owner says that
   `คุณทำเลย` did not cover #190, the status goes back through the full path and R0 rules again.
3. **Full path, not records-only.** The ruling expected to reach `main` before this PR. It is carried here instead,
   so C0 reading in R0's place under §6.2 item 1 does not apply as the ruling described; this PR needs the full
   role path.
