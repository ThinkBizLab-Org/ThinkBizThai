# WP-0A-CON-004: records transcription after PR #210 merged (2026-10-09)

Written by a subagent of `/claude/a0_atlas` (the Author). This file transcribes words that are already on
`main` and the facts that fill their placeholders. It is not a role verdict and decides nothing. The
earlier records PR of this package (#205, `records-transcription-2026-10-06.md`) recorded the
2026-10-06 increment; this one records only what is new for PR #210, the 22-bounds increment.

Branch: `agent/claude/WP-0A-CON-004-security-audit-observability-2026-10-09`, cut from `origin/main`
`d44dbdbb1efebc9d891e3d31fdf01a8a8060c59a` (PR #220).

## 1. Facts verified

| Fact | Value | Command |
|---|---|---|
| PR #210 state | `MERGED`, 2026-10-07T17:13:46Z, head branch `agent/claude/WP-0A-CON-004-security-audit-observability-2026-10-07` | `gh pr view 210 --json state,mergeCommit,headRefOid,mergedAt,headRefName` |
| Final head PR #210 merged at | `ed6cb5b589d61c414db10b298e837bb9bf64dc64` | same |
| Merge commit on `main` | `389f38454b0c9711fca1e595f71511970e835076` | same |
| Merge parents | `7fb0fc054d1092272de56bedfbab4000470cb489` (main, PR #202), `ed6cb5b589d61c414db10b298e837bb9bf64dc64` | `git log -1 --format=%P 389f3845` |
| CI on the final head | `Bootstrap validation`, run `37655997783`, `pull_request`, `headSha` `ed6cb5b5…`, **success** | `gh run list --commit ed6cb5b589d61c414db10b298e837bb9bf64dc64` |
| Commits after the heads the roles read (`ed477099`) | `5d998360` C0, `535a9998` A1, `0ab11409` Q0, `e39a6dd5` R0 (each one file, `(cherry picked from commit …)`), then `ed6cb5b5` handoff only. Nothing else | `git log --first-parent ed477099..ed6cb5b5`; `git show --stat <each>` |
| Paths changed `ed477099..ed6cb5b5` | the four `evidence/WP-0A-CON-004/*-recheck-2026-10-07b.md` files and `handoffs/WP-0A-CON-004-author-handoff.json`. No path under `contract-catalog/**`, `test-kits/**` or `scripts/**` | `git diff --stat ed477099 ed6cb5b5` |
| Each cherry-pick blob-identical to its role commit and to `main` | C0 `8071bfcd`, A1 `910226ff`, Q0 `ffde3c52`, R0 `e55ddf94`; each role commit's parent is `ed477099` | `git rev-parse <commit>:<file>` on the role commit, `ed6cb5b5` and `origin/main` |
| `main` did not move before the merge | first parent of the merge is `7fb0fc05`, which `ed477099` already contained (R0 §1) | `git log -1 --format=%P 389f3845` |
| Handoff guard at the final head, on the branch name | exit 0, `describes the branch: nothing substantive after its cited head` | scratch clone, `refs/remotes/origin/main` set to `7fb0fc05` (main as it stood before the merge), branch checked out by name at `ed6cb5b5`, `npm run -s check:handoff`. Run against today's `origin/main` the guard exits 91, because the head is now itself on `main`; that is a post-merge artefact, not a pre-merge state |
| Handoff copies at the final head | `known_limitations` and `open_risks_or_blockers` each deep-equal to the manifest's 20 `open_blockers` | `node -e` comparison in the same scratch clone |
| No records PR has touched the manifest since the merge | last commit touching `work-packages/WP-0A-CON-004.json` on `main` is `38429598` (inside #210); no open PR | `git log origin/main -- work-packages/WP-0A-CON-004.json`; `gh pr list --state open` |
| The amendment records named as owed are still owed | none of WP-0A-CON-008, WP-0A-A0-002, WP-0A-CON-007, WP-0A-CON-003 mentions WP-0A-CON-004 in `ownership.amended_by` on `main` `d44dbdbb` | `git show origin/main:work-packages/<WP>.json` read with `node` |

### Role conditions checked against `ed477099..ed6cb5b5`

| Role file (on `main`) | Verdict at `ed477099` | Carry clause | Holds at `ed6cb5b5` |
|---|---|---|---|
| `c0-recheck-2026-10-07b.md` §5 | `review_approved` | "If any line under `contract-catalog/` or `test-kits/contracts/` changes after `ed477099`, a new C0 re-check is needed." | yes, no such path changed |
| `q0-recheck-2026-10-07b.md` §7 | `test_verified` | carries to a head whose diff from `ed477099` is only role evidence under `evidence/WP-0A-CON-004/`, a handoff refresh, `open_blockers` text, or a clean automatic merge | yes, role evidence and one handoff refresh only |
| `a1-recheck-2026-10-07b.md` §6 | `security_approved` | nothing under `ctr-{sec,aud,obs}-001/` changes, `npm run verify` stays clean on the branch name, `KNOWN_UNBOUNDED` keeps none of the 22; role evidence files need no new A1 reading | yes for the paths and `KNOWN_UNBOUNDED` (no `test-kits/**` change); the full suite was not re-run here, CI run `37655997783` on the head is green |
| `r0-recheck-2026-10-07b.md` §4, conditions 1-4 | not yet `integration_verified`; content correct | 1 C0 re-check at `ed477099`; 2 Q0 carry at `ed477099`; 3 later head only role evidence files carried by `cherry-pick -x`, one file each, blob identical, then one handoff refresh last and alone, `check:handoff` 0; 4 green `Bootstrap validation` on that exact head, head contains `main` | 1 yes; 2 yes; 3 yes (rows above); 4 yes (run `37655997783`; first parent `7fb0fc05`) |

## 2. What is recorded

From `evidence/WP-0A-CON-004/r0-recheck-2026-10-07b.md` §4, subsections "`integration_verified` may be
recorded after the merge" and "Wording A0 records on my behalf":

- `status`: `in_review` → `integration_verified`.
- `open_blockers[14]`: R0's blockquote, lines joined with single spaces, placed as the closing text in
  front of the old entry, index kept. The old text follows whole after "Text as recorded:". The three
  placeholders are filled: `<final head SHA>` = `ed6cb5b589d61c414db10b298e837bb9bf64dc64`, `<run id>` =
  `37655997783`, `<merge SHA>` = `389f38454b0c9711fca1e595f71511970e835076`. No other word is changed.
- The branch slot, because R0 §4 asks for the record "on a new dated branch whose
  `branch-identity.test.mjs` row is repointed (R-3 of my first review)":
  - `ownership.branch` → `agent/claude/WP-0A-CON-004-security-audit-observability-2026-10-09`, with a
    dated sentence appended to `ownership.branch_note`;
  - `test-kits/branch-identity.test.mjs` (WP-0A-CON-008's file): the WP-0A-CON-004 row repointed, nothing
    else;
  - `test-kits/integrity-manifest.json` (WP-0A-A0-002's file): that file's digest, by
    `npm run regenerate:manifest`, never by hand.
- `ownership.amends_without_owning.paths` narrowed to those two files; a "RECORDS BRANCH 2026-10-09"
  sentence appended to its `rationale`.
- `handoffs/WP-0A-CON-004-author-handoff.json` refreshed for this increment, last and alone.

## 3. What is not done

- No move to `done`. The A6 countersignature (`open_blockers[17]`), `[18]`, `[19]`, the amendment records
  on the four owners' manifests, R0's R-1 to WP-0A-CON-003 and the items in `open_blockers` 0-9 stay open.
- No role verdict is written here, and no Owner word is quoted.
- R0's wording is not edited, including where §4 below notes a reading point.
- No `required_human_authorities` entry is added.

## 4. Flags for the reader

1. **This PR is not records-only (full path).** Under RFC-2026-025 §6.1 item 5 and its "Narrower in one
   place" paragraph, moving the branch slot (`ownership.branch`, the pinned row of
   `test-kits/branch-identity.test.mjs`, the regenerated integrity manifest) takes the full path. The slot
   moves because R0 §4 names a new dated branch with the row repointed as the vehicle for this record. A
   reader who reads R0 §4 as permitting rather than requiring the new branch should say so; the records
   themselves (status, `[14]`, the narrowing) would then be light-path content on the 2026-10-07 name.
2. **"A1 security_approved carried by R0's carry reading".** R0 wrote this before A1's own
   `a1-recheck-2026-10-07b.md`, which gives a fresh `security_approved` at `ed477099`. The words are true
   (R0's carry reading did carry it) but do not mention A1's own re-check. Recorded as R0 wrote them.
3. **R0 §4 said "No new R0 run is needed for that records PR if its only content is this transcription".**
   This PR also moves the branch slot that the same paragraph asks for. Whether that slot move counts as
   part of "this transcription" is the reader's call.
4. **A1's carry term "`npm run verify` stays clean on the branch name"** was not re-measured on
   `ed6cb5b5` here; the evidence is CI run `37655997783` (green) and the handoff guard measured above. No
   `test-kits/**`, `scripts/**` or `contract-catalog/**` path changed after `ed477099`, where A1, Q0 and R0
   each measured the full suite 716/716 on the branch name.
5. **Who pressed the merge** is not recorded here. R0's wording does not say who merged, so nothing in
   this record depends on it.
