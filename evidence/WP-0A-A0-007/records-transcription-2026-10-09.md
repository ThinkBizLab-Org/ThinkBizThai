# Records transcription: WP-0A-A0-007 `integration_verified`, on R0's behalf

Date: 2026-10-09. Scribe: `/claude/a0_atlas` (this package's Author), a records increment after the merge
of PR #200. The Author decides nothing here. The status and the closing text come from R0's file
`evidence/WP-0A-A0-007/r0-recheck-2026-10-07.md` §5 ("Recording `integration_verified` after merge: what,
and in what exact words"), which says the record is made "after the merge, on a WP-0A-A0-007 branch from
the new `main`". This file states which facts were checked and where they came from.

This branch also carries two role files, by `git cherry-pick -x` of the roles' own commits, before the
records commit: `evidence/WP-0A-A0-007/q0-carry-2026-10-09.md` (from `d297f053128665eb9f28386bdf2a2189ec34f852`)
and `evidence/WP-0A-A0-007/a1-carry-2026-10-09.md` (from `cecd5ef388ed63b10f0748bde71026ac7740267f`). Both
blobs are byte-identical to their sources (`b670e2d5` and `7ef80b33`). Role files are not records under
RFC-2026-025 §6.1 item 2, so this PR takes the full path.

## 1. Facts verified in this run

| Item | Value | Command |
|---|---|---|
| PR #200 merged | `MERGED`, `mergedAt` `2026-10-06T16:50:24Z` | `gh pr view 200 --json mergeCommit,headRefOid,mergedAt,state,mergedBy` |
| `<FINAL_HEAD>` | `f544949d0a4dce5467cfaff71ea606cd4b6934b1` | same, `headRefOid`; second parent of the merge commit |
| `<MERGE_COMMIT>` | `4dd767df435e63c46603f7716da811dae287ee1d` | same, `mergeCommit`; `git log -1 --format=%P 4dd767df` gives `411dfa7e… f544949d…` |
| merge on `main` | ancestor of `origin/main` `d44dbdbb` | `git merge-base --is-ancestor 4dd767df origin/main` exit 0 |
| `<RUN_ID>` | `37497677595` | `gh run view 37497677595 --json headSha,conclusion,status,event,workflowName,headBranch`: `Bootstrap validation`, `pull_request`, branch `agent/claude/WP-0A-A0-007-amend-section-2`, `headSha` = final head, `completed`/`success`; `gh run list --commit f544949d…` lists this run only |
| V1: role files byte-identical | C0 `80d10405`, Q0 `33cefc08`, A1 `cead076e`, R0 `6e0a2699` | `git rev-parse <source>:<path>` vs `f544949d:<path>` vs `origin/main:<path>`, sources `f3a96e64`, `a0113e13`, `ca4feb9c`, `f427dfad`: all equal |
| V2: A1 confirms `open_blockers[1]` | `security_approved` at `279e272a`, "A1-007-2 wording confirmed in open_blockers[1]" | `a1-recheck-2026-10-07.md` §6 on `main` |
| V3: handoff last and alone | `f544949d` and `364c6480` each change `handoffs/WP-0A-A0-007-author-handoff.json` only | `git show --stat f544949d 364c6480` |
| V4: green, contains `main` of the moment | run above; head contains `411dfa7e`, the merge's first parent | `git log --format='%h %p %s' 279e272a..f544949d` |
| V5: nothing else after `279e272a` | the four role re-check files, the handoff, and `main`'s three WP-0A-CON-004 paths; the manifest is not in the diff | `git diff --name-status 279e272a f544949d` |
| C0 clause (4) | the PR's own diff is the same path list before and after the sync with `main` | `git diff --name-status dd11c601...364c6480` vs `git diff --name-status 411dfa7e f544949d`: identical |
| Q0-N3 | closed in the final handoff | `q0-carry-2026-10-09.md` M8 (Q0's own measurement); selects R0's `CLOSED IN THE FINAL HANDOFF` slot |

`gh pr view 200` reports `mergedBy` `workstationgroup`, the repository account A0 operates through. R0's
wording does not name the merger, so nothing here depends on it.

## 2. What is recorded, and from which file on `main` (or carried here)

`work-packages/WP-0A-A0-007.json`:

- `status`: `in_review` -> `integration_verified`. Source: `r0-recheck-2026-10-07.md` §4 ("this file
  converts to `integration_verified` at that final head without a further R0 run") and §5.
- `open_blockers[4]`: closed in place, index kept, with R0's §5 blockquote. Placeholders filled:
  `<DATE>` = 2026-10-09; `<A1_RECHECK_FILE>` (both) = `a1-recheck-2026-10-07.md`; Q0-N3 slot =
  `CLOSED IN THE FINAL HANDOFF`; `<FINAL_HEAD>`, `<MERGE_COMMIT>`, `<RUN_ID>` as in §1. The old text
  follows `Text as recorded: ` whole and ends the entry. R0's template shows a period after the
  placeholder; the old text already ends in one, so none is added, as PR #201 closed CON-003's entry. A1's
  verdict word is `security_approved`, so R0's "different verdict word" branch does not apply.
- `open_blockers[5]`: new, appended. It states that PR #200 merged with Q0's condition (4) and A1's
  A1-R2-1 tripped as written, that both roles ruled after the merge (2026-10-09) that their verdicts carry
  to `f544949d`, citing their files and commits, and that reading a role after the merge is a process
  lapse of the R19 class (`evidence/WP-0A-A0-002/r0-ruling-2026-10-09.md` R19). It quotes, verbatim:
  Q0's corrected clause and its "Wording A0 may record on this role's behalf" (`q0-carry-2026-10-09.md`
  §3), and A1's "Suggested transcription line" (`a1-carry-2026-10-09.md` §4).

No other field is touched. `open_blockers[0]`..`[3]` are unchanged.

## 3. What is not done

- **`open_blockers[2]` is not edited.** R0 (`r0-recheck-2026-10-07.md` §5, "Observation for that
  follow-up") notes that its "still needs a verdict from /claude/a1_bastion" clause is now met, and leaves
  any dated note to A0's own wording. No role file closes it, so this increment notes it here and records
  nothing for it.
- Not `done`, not Gate G0. No RFC, script, test, CI or contract file is touched. RFC-2026-016's stale
  status line, §4 and §7 stay owed to its owner (C0, R0).
- C0 wrote no carry ruling and none is recorded for it: its condition (4) is read as holding (§1), its
  conditions (1)-(3) are R0's V1, V3, V4. That is A0's reading, not C0's.
- Nothing is merged. No role verdict is written by the Author.

## 4. Flags for the reader

1. **The lapse is real.** PR #200 merged before Q0's and A1's carry clauses were closed. The 2026-10-09
   rulings are after the fact; the manifest says so in `open_blockers[5]` without excusing it.
2. R0's V1 asked for role files taken by path (`git checkout <commit> -- <path>`); PR #200 carried them by
   `cherry-pick -x`. The bytes are identical (§1), which is what V1 requires of each file.
3. Full path: this PR adds two role files, which RFC-2026-025 §6.1 item 2 keeps off the light path.
