# Records transcription: WP-0A-A0-008 `integration_verified`, on R0's behalf

Date: 2026-10-09. Scribe: `/claude/a0_atlas` (this package's Author), a records-only increment under
RFC-2026-025 §6. The Author decides nothing here. The status and the text that closes `open_blockers[3]` in
place come from R0's file `evidence/WP-0A-A0-008/r0-integration-verdict-2026-10-05.md` §5.1 ("The records
follow-up, after the merge"), with only the placeholders R0 named filled in. This file states which facts were
checked and where they came from.

## 1. Facts verified with `gh`/`git` in this run

| Fact / placeholder | Value | How verified |
|---|---|---|
| PR | https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/208 | `gh pr view 208 --json state,headRefName,mergedAt`: `MERGED`, branch `agent/claude/WP-0A-A0-008-service-path`, `mergedAt` `2026-10-06T19:14:41Z` |
| `<DATE>` | `2026-10-09` | the date of this transcription |
| `<MERGE_COMMIT>` | `5cb5cb83871179be83b0fe98e34112e0d992eddc` | `gh pr view 208 --json mergeCommit`; `git log -1 --format=%P 5cb5cb83`: `9b4a0ce6…` (main) and `763b4d60…`; `git merge-base --is-ancestor 5cb5cb83 origin/main` exit 0 |
| `<FINAL_HEAD>` | `763b4d60a3818982f7f743dc35641045fbafe5b4` | `gh pr view 208 --json headRefOid`; second parent of the merge |
| `<RUN_ID>` | `37516051508` | `gh run list --commit 763b4d60…`: one run, `Bootstrap validation`, event `pull_request`, `completed`, `success`; `gh run view 37516051508 --json headSha,jobs`: `headSha` = `<FINAL_HEAD>`, job `bootstrap` `success` |
| F2 choice | `LEFT OPEN` | this increment does not touch `open_blockers[1]` (§3) |
| `<THE ENTRY'S CURRENT TEXT, VERBATIM>` | `open_blockers[3]` as it read at `origin/main` `d44dbdbb` | copied by a node script from the manifest, asserted to start with its known opening; the new entry ends with it after `Text as recorded: ` |

One punctuation choice: R0's template ends `<THE ENTRY'S CURRENT TEXT, VERBATIM>.`; the old text already ends in a
full stop, so no second one is added. This follows the WP-0A-CON-003 closure (PR #201).

### 1.1 R0's conditions I1-I5 (§5), and each role's carry clause, against the commits after `25d449c`

`git log 25d449ca..763b4d60` (excluding what `main` `9b4a0ce` brought in) lists six commits: the C0, A1, Q0 and R0
role files (`19ccd11f`, `ca32c88f`, `012ece24`, `289b1c94`), the merge of `origin/main` `9b4a0ce` (`dd9f4778`), and
the handoff refresh (`763b4d60`).

| Condition | Holds? | How verified |
|---|---|---|
| I1 / C0 F1: sync with `main` | yes | `dd9f4778` has parents `289b1c94` and `9b4a0ce6`; the merge commit's first parent is `9b4a0ce6`, so the head contained the `main` of the moment |
| I2: role files byte-identical to source | yes | blob ids at `763b4d60`: C0 `e066719e`, A1 `f9fbd818`, Q0 `0f0600bc` (equal to those in `85b8795c`, `d6f1b44b`, `5fe4e875`), R0 `18d7a56e` (equal to `82b9d58b` and to `origin/main`) |
| I3 / Q0 (2): handoff last and alone | yes, by diff | `git show --stat 763b4d60`: one file, `handoffs/WP-0A-A0-008-author-handoff.json`. **Not re-measured:** `npm run check:handoff` at `<FINAL_HEAD>` cannot be reproduced on the branch name now that it is merged |
| I4 / Q0 (3): `bootstrap` green on the final head containing `main` | yes | CI run `37516051508` above; first merge parent `9b4a0ce6` |
| I5 / Q0 (4): nothing else after `25d449c` | yes | `git diff 25d449ca 763b4d60 -- work-packages/WP-0A-A0-008.json evidence/WP-0A-A0-008/author-self-check-2026-10-07.md` is empty; `git diff --stat 9b4a0ce6 763b4d60` lists only this package's seven paths |
| C0 carry: "No C0 re-check is needed if the PR's own diff is unchanged by the sync" | yes | the I5 diff above |
| A1 carry: a sync bringing in only other packages' files needs no re-check | yes | the sync brought only WP-0A-A0-005's three paths (`git diff --stat 25d449ca 763b4d60`) |

No condition was tripped, so the status move is recorded.

## 2. What is recorded

- `work-packages/WP-0A-A0-008.json` `status`: `in_review` → `integration_verified`. Authorised by R0's
  `r0-integration-verdict-2026-10-05.md` §5.1 (`status`: `integration_verified` (not `done`, not G0)) and its
  closing VERDICT line, which converts to `integration_verified` at the final head once I1-I5 hold (§1.1).
- `open_blockers[3]`: closed in place, index kept, with R0's §5.1 blockquote in front of the old text, which stays
  whole after `Text as recorded: `. Placeholders filled from §1 only.

## 3. What is not done

- `open_blockers[0]` stays open, as R0 §3.2 and §5.1 require. R0's optional dated note recording C0 F3 beside
  A1-008-1 is **not** written: R0 gives no exact wording for it, so it would be the Author's own words, and R0 asks
  C0 to confirm any rewording of `[0]`.
- `required_human_authorities[1]`: R0 asks to append the order (A1-008-2, C0 F4) as a dated current-state note in
  that entry. Under RFC-2026-025 §6.1 item 4 that array is strictly append-only, and text added to an old entry is
  not a record. It is not done here; it needs the full path or a new entry R0 words.
- C0 F2 (`open_blockers[1]`), A1-008-3 (`open_blockers[1]`) and A1-008-4 / Q0-N1 (`rollback_or_forward_fix`) are
  not made. R0 lists them as optional; none has exact wording on `main`, and `rollback_or_forward_fix` is not a field
  a records-only PR may change.
- No move to `done`; Gate G0 does not move. RFC-2026-017's stale status line and §7 are a governance matter for the
  RFC's owner.
- `ownership.amends_without_owning.paths` is already `[]`; nothing to narrow.

## 4. Flags for the reader

- **Who merged.** `gh pr view 208` reports `mergedBy` `workstationgroup`, the repository account. R0's wording does not
  name the merger, so nothing recorded here depends on it.
- **Status moved by the Author's hand.** RFC-2026-025 §6.2 makes "any move by the Author beyond `in_review`" a
  blocking finding unless a role verdict on `main` authorises it. The authorising file is R0's, cited in §2; the
  same shape was recorded for WP-0A-CON-003, CON-004, CON-005 and A0-002 (§6.5 of that RFC lists the moves).
- **F2 placeholder.** R0 offered `FIXED IN THIS FOLLOW-UP | LEFT OPEN`; `LEFT OPEN` was chosen because this increment
  does not change `open_blockers[1]`.
- **`check:handoff` at the merged head** could not be re-run (§1.1, I3); the diff evidence stands in for it.
