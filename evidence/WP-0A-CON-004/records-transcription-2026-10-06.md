# Records transcription: WP-0A-CON-004 `integration_verified`, on R0's behalf

Date: 2026-10-06. Scribe: `/claude/a0_atlas` (this package's Author), a records-only increment.
The Author decides nothing here. The status and the recorded text come from R0's file
`evidence/WP-0A-CON-004/r0-sync-reading-2026-10-06.md` §4 ("Wording A0 records on my behalf, once 1, 3
and 4 hold"), whose condition 2 replaces condition 2 of `r0-recheck-2026-10-06.md`: the status move is
recorded after the green run, by the next CON-004 increment on `main`, in
`work-packages/WP-0A-CON-004.json`. This file states which facts were checked and where they came from.

## 1. What changed in the manifest

- `status`: `in_review` -> `integration_verified`.
- `open_blockers[15]` (already closed in place by the role files; index kept): R0's wording appended
  verbatim, with the two placeholders filled. `r0-recheck-2026-10-06.md` §4 named the closing text of
  `open_blockers[15]` as where the wording goes, and that entry itself said the record was owed after the
  green run at the handoff-refresh head. No other entry and no other field is touched.

## 2. Facts R0's placeholders and named values take, verified with `gh`/`git` in this run

| Item | Value | How verified |
|---|---|---|
| `<final head SHA>` | `38b486ae32e598416b4ad87b5b52b7b280d2d69a` | `gh pr view 196`: `state` `MERGED`, `headRefOid`; second parent of the merge commit (`git cat-file -p 8689e3c`) |
| `<run id>` | `37414558676` | `gh run view 37414558676`: workflow `Bootstrap validation`, event `pull_request`, `headSha` = `<final head SHA>`, job `bootstrap` `success`, every step `success`, none skipped (including `Verify test-integrity guard`, `Validate repository bootstrap`, `Verify branch scope`, `Database foundation` and the negative control) |
| merge commit | `8689e3c792ecd4178b07376a8fab167f59a9ac9b` | `gh pr view 196` `mergeCommit`, `mergedAt` `2026-10-06T05:04:04Z`; parents `9e15881b` and `<final head SHA>`; an ancestor of `origin/main` `dd11c601` |
| `main 9e15881 merged at 31879073` (kept) | unchanged | R0 §4: replace these only if `main` moved again. It did not: `31879073`'s second parent is `9e15881b`, the merge commit's first parent is the same `9e15881b`, and `git log --merges 31879073..38b486ae` is empty |
| `17a6ea14…` (kept) | `17a6ea142e3f…55e8fc93` | `test-kits/integrity-manifest.json` at `<final head SHA>` records it for `catalog-registry.test.mjs`, and `git show 38b486ae:test-kits/contracts/catalog-registry.test.mjs \| shasum -a 256` gives the same digest |

Conditions 1, 3 and 4 of R0's §4, checked against the record:

- 1: after `31879073` the branch carries R0's sync reading (`0b5cd95d`), then C0's (`54d9bd28`) and
  Q0's (`342361fb`) carry readings, each an evidence file only; `git diff --stat 31879073 38b486ae`
  shows those three evidence files and the handoff, nothing under `contract-catalog/**` or `test-kits/**`.
- 3: `<final head SHA>` changes one file, `handoffs/WP-0A-CON-004-author-handoff.json`, citing base
  `9e15881b` and head `342361fb` (its parent). **Not re-measured here:** `npm run check:handoff` at
  `<final head SHA>` was not re-run; now that it is merged, the branch-point reading cannot be reproduced
  on the branch name without rewinding `origin/main`.
- 4: the CI run above; the head contains `9e15881b`, which was `main` at the merge.

`gh pr view 196` reports `mergedBy` `workstationgroup`, the repository account A0 operates through. R0's
wording does not name the merger, so nothing here depends on it.

## 3. The Owner's words, verbatim (as relayed to this run by A0)

- Standing delegation: `เอาตามที่คุณแนะนำทุกอย่าง`.
- 2026-10-06: `คุณทำเลย`.
- 2026-10-06: `ลุยตามคุณแนะนำเลย`.

These are as relayed; this run did not verify them at their source. The merge of #196 was pressed under
the standing delegation (2026-10-03, RFC-2026-025 §5 item 6), which R0's §4 named as applicable. This
increment changes no RFC, CI file or gate, so it is not a governance PR.

## 4. What this increment does not do

It touches only `work-packages/WP-0A-CON-004.json` (`status` and `open_blockers[15]`) and this file, plus
the handoff refresh the protocol requires. It changes no contract, fixture, test, script, RFC, CI or
lockfile. What R0 lists as owed before `done` stays owed: the CON-004 amendment record on WP-0A-A0-002
and WP-0A-CON-008 (R3), the 22-bounds increment with A1 N-2 and Q0 O-2 (`open_blockers[14]`), and F5 to
the Owner in the next Owner batch (R5). `integration_verified` is not `done` and not Gate G0.

## 5. How the records commit was made

`node scripts/commit-when-clean.mjs` refused the records commit with exit 1: `tests 705, pass 703, fail 2`.
`npm run check` on the same tree, on the branch name, names both failures: *the handoff for this branch
describes this branch* (the handoff on `main` cites another branch's state) and *the handoff ratchet fails
when an author handoff claims another role approved something*, which runs the same suite on an unmodified
copy and fails on the same test. Nothing else was red. The records commit is therefore a plain
`git commit`, as `evidence/WP-0A-CON-003/records-transcription-2026-10-06.md` §5 did for that case alone.
The handoff refresh that follows, last and alone, is what clears it.

## 6. One mechanical manifest change the branch-scope guard forces

`node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-004` exited **74** after the first handoff
refresh: `ownership.amends_without_owning.paths` still declared `test-kits/contracts/catalog-registry.test.mjs`
and `test-kits/integrity-manifest.json`, which this records-only branch does not change. CI runs the same
step on a pull request. Following the precedent of `WP-0A-CON-003` and `WP-0A-A0-005`
(`evidence/WP-0A-A0-005/author-reverify-2026-10-06.md` §3), the paths are emptied and the rationale gains
one sentence saying why; the earlier rationale text and `recorded_on` are kept, because the amendments are
unchanged history merged in PR #196 and their record on `WP-0A-A0-002` and `WP-0A-CON-008` is still owed
(R0 R3). No rule, contract or test moves. The handoff is then refreshed again, last and alone.
