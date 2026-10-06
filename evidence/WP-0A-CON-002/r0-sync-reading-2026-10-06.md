# R0 reading of WP-0A-CON-002 after `main` moved

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/193, branch
`agent/claude/WP-0A-CON-002-restore-rfc-002`, package `WP-0A-CON-002`. The head I read is A0's local merge
commit `000a6f7280c436944ac00474efdd4e2b070a5c19` (parents `630a38cd` = the pushed PR head, and `574c8a8c` =
`origin/main`, PR #192). It is not pushed. Run: `/claude/r0_steward`, this package's Integration Owner.
Measured 2026-10-06.

This reading answers three questions. Does the sync change anything my verdict
(`evidence/WP-0A-CON-002/r0-integration-verdict-2026-10-05.md`, commit `6ddd8b10`, carried as `fc24d461`,
`integration_verified_with_conditions` at `568658c`) rests on? Does the verdict stand once the handoff is
refreshed last and alone and CI is green? And what is my ruling on `630a38cd`, the A0 merge-reading note that my
§5 C5 did not list?

## 0. What I am

I am a subagent spawned by a workflow script of `/claude/a0_atlas`, the Author of this package. I act as the
Integration Owner run `/claude/r0_steward`; RFC-2026-024 §3/3-4 requires this disclosure. I share a vendor
(Anthropic), a model family and a parent with the Author. The Author's workflow wrote my brief, including its
summary of the merge, of the conflict resolution and of A0's own measurements. I treated those as claims and
re-measured them in a private clone (§2). I wrote none of the PR's content and I fix nothing. This file is not
a merge authorisation, not a G0 signature, and it moves no package status. A same-vendor signature does not
pass Gate G0's external verification (RFC-2026-024 §3/5). It is one commit on a local branch
`r0/WP-0A-CON-002-sync-2026-10-06` cut from `000a6f72`, and it is **not pushed**.

## 1. Verdict

**My verdict at `6ddd8b10` was voided by its own C4, and I re-issue it here on the synced head.** C4 says "A
merge of `main` that conflicts with or changes this package's seven paths voids this verdict." The merge
conflicted in `test-kits/integrity-manifest.json`, which is one of those seven paths. The verdict therefore did
not carry across the sync by itself. That is why this reading exists. A0 was right to ask for it rather than
treat the merge as covered.

Having read the sync, **I find that it changes nothing the verdict rests on**:

- **The PR's own diff is unchanged.** Eleven of its twelve paths have per-file patches identical before and
  after the sync. In the twelfth, the manifest, the changed lines are identical: the same three digest lines,
  removed and added. Only the hunk's context lines and the blob index line differ, because `main` changed two
  neighbouring digests (§2).
- **The conflict was context only, and it was resolved correctly.** Every one of the five digests in the
  conflict region equals `shasum -a 256` of its file at the merge head. A fresh `npm run regenerate:manifest`
  reproduces the committed manifest byte for byte (§2).
- **No protected path entered the diff.** No contract-catalog file, RFC, CI file, script, lockfile or
  root configuration is in `git diff origin/main HEAD`.
- **The one new interaction is covered.** `main` changed two contract tests that import this PR's
  validator, `json-schema-subset.mjs`. They pass with the PR's validator, 14/14, as they did with `main`'s.
- **The gates hold.** Every gate I can run locally is green on the branch name, except `check:handoff`. That
  one is red (exit 91), only because the refresh has not been made yet.

**The verdict stands as `integration_verified_with_conditions`.** It is effective on the final head H once
**Z1 to Z4** (§4) hold on H. Those conditions replace C2 to C5 of my verdict; C1 is met and C6 is unchanged. No
C0, A1 or Q0 re-run is owed for this sync: no line they verified changed, and no finding of theirs is touched.

- Stop-the-line: **none**.
- Blocks the merge at `000a6f72`: **yes, until Z1 to Z4 hold.** The handoff cites base `8c089cc`, and `npm run
  check:handoff` exits 91. GitHub reports PR #193 as `CONFLICTING` / `DIRTY` until this merge is pushed.
- Governance PR under RFC-2026-025 §5 item 6: **no**, as before. A0 presses the merge under the Owner's standing
  delegation; no merge by the Owner in person is needed.
- **`630a38cd`, the A0 merge-reading note: accepted** (§3).

## 2. What I measured

I made a private clone in my scratchpad (`r0-WP-0A-CON-002-sync/`) with `git checkout -B
agent/claude/WP-0A-CON-002-restore-rfc-002 000a6f72`, so `git branch --show-current` is the package branch, not
a detached HEAD. I pointed `origin` at GitHub and fetched. `git ls-remote origin` gives `main` = `574c8a8c` and
the PR branch = `630a38cd`, so the merge is not pushed. Node `v24.20.0`, npm `11.19.0`, `npm ci
--ignore-scripts` exit 0. No database was used outside `npm run check`'s own suite.

### The PR's own diff, before and after the sync

| Measure | Result |
|---|---|
| `git merge-base 630a38cd origin/main` | `8c089cc0` (the base my verdict measured) |
| `git merge-base --is-ancestor origin/main HEAD` | exit 0: the head contains current `main` |
| `git diff --stat 8c089cc 630a38cd` vs `git diff --stat origin/main HEAD` | both `12 files changed, 1148 insertions(+), 70 deletions(-)` |
| Per-file `git diff 8c089cc 630a38cd -- f` vs `git diff origin/main HEAD -- f`, for the 11 paths other than the manifest | identical (sha1 of each patch equal) |
| `test-kits/integrity-manifest.json`, `+`/`-` lines only (`-U0`) | identical, 6 lines: the old and new digests of `json-schema-subset.mjs`, `shared-kernel-envelope-contracts.test.mjs` and `shared-kernel-schema-conformance.test.mjs` |
| Whole-diff `cmp` | differs only at the manifest's `index` line and at two context lines, the `ctr-evt-001-schema-ref-bounds` and `ctr-job-001-reference-hardening` digests, which `main` changed |
| `git merge-tree --write-tree 630a38cd 574c8a8c` | exit 1: one conflict, `test-kits/integrity-manifest.json` only |

### What `main` brought in, and where it touches this package

`git diff 8c089cc origin/main` covers PRs #187, #188, #189 and #192: 50 files, +6672/-274. 37 files are under
`evidence/` (none under `WP-0A-CON-002`). The others are RFC-2026-006 and RFC-2026-009, the handoffs and manifests
of WP-0A-A0-002, A0-004, CON-005 and CON-007, the two contract tests below, and the integrity manifest. Of this
PR's twelve paths, **only the integrity manifest** was touched by `main`.

- `test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs` (+204/-17) and
  `ctr-job-001-reference-hardening.test.mjs` (+26) both `import { validate } from './json-schema-subset.mjs'`.
  On the merged tree they run against **this PR's** validator: the code-point string length plus the stricter
  `date-time`. That pairing did not exist at `568658c`, so no role run saw it. I measured it: the two files pass
  **14/14** with the PR's validator and **14/14** with `main`'s. The PR's validator change does not break `main`'s
  new assertions.
- Neither PR touched `contract-catalog/`, so the RFC-2026-004 acknowledgement in my verdict §6 still reads against
  unchanged schemas.

### The conflict resolution

| File | `shasum -a 256` at `000a6f72` | Manifest entry at `000a6f72` | Source |
|---|---|---|---|
| `json-schema-subset.mjs` | `9037cc0a…5632` | equal | PR (the PR changed this file) |
| `shared-kernel-envelope-contracts.test.mjs` | `eebf6200…6c90` | equal | PR, merged cleanly |
| `shared-kernel-schema-conformance.test.mjs` | `df1e8514…e19b` | equal | PR, merged cleanly |
| `ctr-evt-001-schema-ref-bounds.test.mjs` | `cc93f8be…6391` | equal | `main` (the PR did not touch it) |
| `ctr-job-001-reference-hardening.test.mjs` | `66e9d40c…89cb` | equal | `main` (the PR did not touch it) |

`npm run regenerate:manifest` on the merge head printed `rebuilt 91 digest(s)`. Then `git diff --quiet --
test-kits/integrity-manifest.json` exited 0: the committed resolution is exactly what the generator writes.

### Gates at `000a6f72`, on the branch name

| Command | Exit | Output |
|---|---:|---|
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-002` | 0 | `all 12 changed path(s) are declared, and every amendment explains one` |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-002.json` | 0 | |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | |
| `node scripts/validate-work-packages.mjs` | 0 | |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-CON-002-restore-rfc-002` | 0 | `WP-0A-CON-002` |
| `node scripts/verify-test-coverage-floor.mjs` | 0 | |
| `npm run scan:secrets` | 0 | |
| `node --test test-kits/contracts/*.test.mjs` | 0 | `79 / 79` |
| protected-path `git diff --quiet origin/main HEAD -- .github package.json package-lock.json .node-version scripts contract-catalog CONTRIBUTING_AGENTS.md AGENTS.md CLAUDE.md docs architecture .agents db migrations` | 0 | nothing protected in the diff |
| `npm run check` | 0 | `tests 692 / pass 692 / fail 0 / cancelled 0 / skipped 0 / todo 0` (258 s) |
| `npm run check:handoff` | **91** | `cites base 8c089cc, which is not on this branch's side of its branch point 574c8a8 (origin/main) … Run npm run refresh:handoff.` |

These agree with A0's report: 692/692, exit 91, 12 paths and an unchanged diff.

### The refresh, rehearsed

This was done locally, reset afterwards and never pushed. `npm run refresh:handoff` on `000a6f72` printed "now
cites 574c8a8..000a6f7 — 6 added, 6 modified, 0 deleted". The tool changed three things in the handoff:

- `base_revision` became `574c8a8c`.
- `head_revision_or_patch_checksum` became `000a6f72`.
- `files_added` grew from 1 to 6 entries, the five evidence files now on the branch plus the closure note.

After a throwaway commit of that change:

- `npm run check:handoff` exited 0 ("describes the branch: nothing substantive after its cited head").
- `verify-branch-scope` exited 0 (12 paths).
- `node --test test-kits/handoff-conformance.test.mjs` passed 19/19.

Then `git reset --hard 000a6f72` left the tree clean.

**A0's hand-edited draft** (`scratchpad/con002-handoff-edited.json`, read, not adopted) differs from the tool's
output in four ways:

1. It still cites base `8c089cc` and head `630a38cd`, so as written it fails `check:handoff`.
2. It extends one `assumptions` entry.
3. It rewrites one `open_risks_or_blockers` entry.
4. It adds a K2/Q0-R1/Q0-N1 carry entry.

Two of its sentences are false after this reading. "R0 C5 permits no manifest edit beyond the C6 status line"
is still true. But "the merge-reading note 630a38c is a commit R0 C5 does not list; that note itself says the
Owner decides" is now answered (§3). And "C1-C5 hold on one head" now reads "Z1-Z4" (§4). The assumption "no
code, test, schema, fixture, manifest or CI edit follows 0d649fb" also needs "apart from the merge of `main` at
`000a6f7`, which leaves this PR's diff unchanged", because that merge rewrote two context lines of the
manifest. Z1 states what the refresh commit may carry.

### Role files carried byte for byte

Each blob at `000a6f72` equals the blob at the role run's own commit. Each pick adds exactly one file and carries
its `-x` trailer.

| File | Role commit | Pick on the branch | Blob |
|---|---|---|---|
| `c0-contract-reverify-2026-10-05.md` | `1f297e11` | `1ab2e3a6` | `ffdd0bfa` = `ffdd0bfa` |
| `a1-security-reverify-2026-10-05.md` | `0b5249e6` | `15f01cbf` | `ff72bd34` = `ff72bd34` |
| `q0-test-reverify-2026-10-05.md` | `c1cfe8b4` | `0ad158bb` | `7d6aa531` = `7d6aa531` |
| `r0-integration-verdict-2026-10-05.md` | `6ddd8b10` | `fc24d461` | `bc80f9d1` = `bc80f9d1` |

### CI and the PR, read only (`gh`)

- Run `37375531578` on `630a38cd` (`pull_request`) concluded **success**. Every step ran and passed, including
  `Verify test-integrity guard`, `Verify branch scope`, `Database foundation` and `Negative control`.
- That head does not contain `main`, and its handoff was not refreshed after the cherry-picks. The run
  therefore does not satisfy Z3.
- `gh pr view 193`: OPEN, Draft, head `630a38cd`, `mergeable: CONFLICTING`, `mergeStateStatus: DIRTY`.

## 3. Commits after my verdict, and my §5 conditions

`git log --first-parent 568658cf..000a6f72` lists six commits.

| Commit | Listed by my §5? | R0 reading |
|---|---|---|
| `1ab2e3a6`, `15f01cbf`, `0ad158bb`, `fc24d461`: the C0, A1, Q0 and R0 picks | Yes, C1 | **Met** (§2: blob-identical, one file each, `-x` trailers). |
| `630a38cd` A0 merge-reading note | **No.** C5 permitted only the four evidence files, the handoff refresh, the C6 status edit and a clean merge of `main` | **Accepted.** See below. |
| `000a6f72` merge of `origin/main` `574c8a8c` | C4 allowed a merge of `main`, but C4 also says a merge that conflicts in this package's paths voids the verdict | **Accepted after this reading.** The conflict was context only, the resolution is exact (§2), and the PR's diff is unchanged. With that measured, this merge is what C4 was meant to allow. I re-issue the verdict on it (§1). |

**Ruling on `630a38cd`.** C5 exists to stop any content change slipping in between my verdict and the merge,
above all a fix for K2, Q0-R1 or Q0-N1, which would need the owning role to re-verify. `630a38cd` is not that
kind of change.

- It adds one file, `evidence/WP-0A-CON-002/author-merge-reading-2026-10-06.md`, inside this package's
  evidence directory. It touches no code, test, schema, fixture, manifest, index, CI file or RFC
  (`git diff-tree` lists that one path). `verify-branch-scope` accepts it.
- It is the record my own action A5 asked the merger to make. Writing it on the branch rather than only in the
  merge disposition is an acceptable place for it.
- I read it against my verdict, and its statements are accurate. A1's only blocking item is CI. R2 and R3 are
  Info. It is not a governance PR. K2, Q0-R1 and Q0-N1 are carried, not fixed, with Q0-R1 and Q0-N1 first. The
  still-owed items match C2 to C4.
- One reference needs a gloss. It cites my verdict as `6ddd8b10`; on the branch that commit is the pick
  `fc24d461` of `6ddd8b10`, and the blobs are equal. That is not an error.
- It is Author evidence and decides nothing. It cannot stand in for any role verdict, and I do not read it as
  one.

I extend C5 to it. The Owner does not need to rule on it, so the question the note puts to "the merger" is
answered here.

## 4. What must hold before the merge

Z1 to Z4 replace C2 to C5 of my verdict. C1 is met. C6 is unchanged: the optional status edit of the manifest,
which, if A0 makes it, comes before the handoff refresh, with `npm run check` exit 0.

- **Z1. Handoff last and alone.** If A0 carries this file onto the branch, it is cherry-picked `-x` byte for
  byte, before the refresh. After that, `npm run refresh:handoff` runs on the branch name in one commit. That
  commit is the last one and touches only `handoffs/WP-0A-CON-002-author-handoff.json`. On the branch name,
  `npm run check:handoff` must exit 0 and `npm run check` must pass 692/692 (or more). `npm run check` alone does
  not show that the handoff is current, because it does not run the base check, so both are required. The
  rehearsal in §2 shows the scope of the refresh. The tool's output alone is sufficient: base `574c8a8c`, or the
  then-current branch point, the head it computes, and the expanded `files_added`. A0 may also carry the text
  edits of its draft in that same commit, because they touch only the handoff. If it does, it makes the three
  corrections named in §2: the `630a38c` sentence cites this file §3 as settled, "C1-C5" becomes "Z1-Z4 of
  r0-sync-reading-2026-10-06.md", and the assumption carries the merge exception. The base and head must be the
  ones the tool writes, never hand-typed.
- **Z2. Scope on H.** `git diff --name-only origin/main...H` must give the 12 paths of §2, or 13 if this file is
  carried. `verify-branch-scope` must exit 0, and the protected-path `git diff --quiet` of §2 must exit 0.
  The manifest's `-U0` change lines must still be exactly the six of §2.
- **Z3. CI on H.** The required check `bootstrap` must conclude `success` on H, with every step run and none
  skipped. `630a38cd`'s green run does not count. If no hosted runner is acquired, the run is re-run. That is an
  infrastructure fact, not a waiver.
- **Z4. Main contained, nothing else lands.** `origin/main` must be an ancestor of H at the moment of merge.
  Between `000a6f72` and H the only commits allowed are this file (optional), the C6 status edit (optional) and
  the refresh. If `main` moves again, A0 merges it normally and repeats Z1 to Z3. **R0 re-runs only if** that
  merge needs a conflict resolution in one of this PR's paths, or brings a protected path into `git diff
  origin/main H`. Any other commit, including a fix for K2, Q0-R1 or Q0-N1, voids this verdict, as C5 already
  says.

The merge mechanics are unchanged from my verdict, A5. The merge is a merge commit pinned to H with
`--match-head-commit`, with no squash, rebase or force. The disposition quotes the Owner's delegation words
verbatim, names who pressed the button, and records the A5 reading. That reading is already on the branch in
`630a38cd`, and the disposition may cite it. A stop-the-line finding at any point revokes the delegation. My
verdict's A6 and A7 (carrying K2, Q0-R1 and Q0-N1 into the next increment, and keeping `open_blockers[14]`
(a) to (f) and K3 on their paths) are unchanged. My §6 acknowledgement is unchanged, because `main` touched no
contract-catalog file.

## 5. What I did not do

- I did not re-read the contents of the A0-002, A0-004, CON-005 and CON-007 records that `main` brought in. They
  are not this PR's diff, they were integrated under their own role runs, and the full suite is green with them.
- I re-ran no role probe and no mutation. The only new cross-package pairing, `main`'s two tests on the PR's
  validator, I measured directly (§2).
- I measured on macOS with Node 24.20.0, not in CI's container. CI has not run on `000a6f72`.
- I pushed nothing and commented on nothing. The refresh rehearsal stayed in my private clone and was reset.

VERDICT: integration_verified_with_conditions (re-issued on `000a6f72`; conditions Z1-Z4, all mechanical)

— `/claude/r0_steward`, Integration Owner, WP-0A-CON-002
