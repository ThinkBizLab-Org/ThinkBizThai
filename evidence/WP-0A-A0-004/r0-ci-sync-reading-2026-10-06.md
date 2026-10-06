# R0 reading of WP-0A-A0-004 (PR #197) after `main` moved to `5debf57`

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/197 (title prefix `GOVERNANCE:`), branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, package `WP-0A-A0-004`. The head I read is the
Author's local merge commit `f6652ee09de97949eedd2240372492dfadb231e2` (parents `ae90a14c` = the pushed PR
head, and `5debf570` = `origin/main` after PR #190), not pushed. Run: `/claude/r0_steward`, this package's
Integration Owner. This reads the sync against my latest verdict on this PR,
`evidence/WP-0A-A0-004/r0-n1-recheck-2026-10-06.md` (conditions E1-E5, and its carry clause in §4).

File name: the brief named `r0-sync-reading-2026-10-06.md`. That path already holds my merged reading of
PR #189's sync (`2ec75ba4`), and the brief's branch `r0/WP-0A-A0-004-sync-2026-10-06` is that run's branch.
I overwrite neither: this file is `r0-ci-sync-reading-2026-10-06.md`, committed on
`r0/WP-0A-A0-004-ci-sync-2026-10-06` from `f6652ee`.

Measured 2026-10-06 (about 11:30-12:10 UTC), in a private clone checked out on the branch NAME
(`git checkout -B agent/claude/WP-0A-A0-004-ci-independent-guard-step f6652ee`; `git branch --show-current`
printed it), `origin` re-pointed to GitHub and fetched (`origin/main` = `5debf57`, remote PR branch =
`ae90a14`). Node `v24.20.0` from `/Users/bank/.local/node-v24.20.0/bin`, first on `PATH`;
`npm ci --ignore-scripts` exit 0. No database was used.

## 0. What I am

I am a subagent spawned by a workflow script of `/claude/a0_atlas`, the Author of this package, acting as
the Integration Owner run `/claude/r0_steward`. RFC-2026-024 §3/3-4 requires this disclosure. I share a
vendor (Anthropic), a model family and a parent with the Author, and the Author's workflow wrote my brief,
including its account of the conflict resolution and its own measurements. I treated each as a claim and
re-measured what I rely on (§2). I wrote none of the PR's content and I fix nothing. This file is not a
merge authorisation, not the Owner's disposition of RFC-2026-007 Amendment 2026-10-06, not a G0 signature,
and it moves no package status. A same-vendor signature does not pass Gate G0's external verification
(RFC-2026-024 §3/5).

## 1. Verdict

**The sync changes nothing my verdict rests on.** The PR's own diff against `main` is the same 23 paths;
per file it is identical before and after the sync except the two generated values (`evidence/VERIFICATION.md`
counts, and three manifest digests that now hash the merged files); `ci.yml`, `branch-scope.test.mjs`,
RFC-2026-007, the handoff and the manifest are the same blobs as at `ae90a14`; `main` brought no path on
`DB_SURFACE`; every gate I can run is green on the merge head; and the conflict resolution is reproduced
by the repository's own generators byte for byte (§2).

**My verdict stands, unchanged: `integration_verified` CONDITIONAL on E1-E5** of
`r0-n1-recheck-2026-10-06.md` §4. E1 is met (§3). E2 and E3 are met again once the handoff is refreshed
last and alone and `bootstrap` is green on that head (§4, F1-F2). **E4 and E5 are not met and cannot be
met by A0.**

**The brief's framing is wrong, and I do not adopt it.** It says this is "not a governance PR" and that
"A0 presses the merge under the Owner's delegation". PR #197 changes `.github/workflows/ci.yml` and
RFC-2026-007 (`git diff --name-only origin/main f6652ee` lists both). RFC-2026-025 §5 item 6: "A PR that
changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or a gate) is merged by the Owner personally,
never by delegation." The PR's title starts `GOVERNANCE:`, the handoff's `assumptions[1]` says the Owner
merges it personally, never by delegation, and C0, A1, Q0 and my previous three readings all say the
same. **A0 must not press this merge.** The standing delegation (2026-10-03) and `คุณทำเลย` (2026-10-06,
limited to #187/#188) do not reach it, and neither does `เอาตามที่คุณแนะนำทุกอย่าง`: what R0 recommended
was the Owner's own merge.

- Stop-the-line: **none**. No category of `CONTRIBUTING_AGENTS.md` ("secret exposure, tenant leakage, …")
  is present; nothing is merged. A delegated merge of this PR would breach RFC-2026-025 §5 item 6; that is
  why E5 stands, not a finding against the package's content.
- Blocks the merge as of `f6652ee`: **yes**: the handoff refresh and CI on the final head (F1-F2), the
  Owner's disposition of the amendment (E4), and the Owner's own merge (E5).
- Governance PR (RFC-2026-025 §5 item 6): **yes**. Record-only (item 1): **no**.

## 2. What I measured, at `f6652ee` on the branch name

**The PR's own diff, before and after the sync**

| Measure | Result |
|---|---|
| `git log -1 --format=%P f6652ee` | `ae90a14c…` `5debf570…`; ordinary merge commit with the `Co-Authored-By` trailer |
| `git merge-base --is-ancestor origin/main HEAD` | exit 0: the head contains current `main` |
| `git diff origin/main HEAD` vs `git diff origin/main...HEAD` | `cmp`: byte-identical |
| `git diff --name-only 8689e3c ae90a14c` vs `git diff --name-only origin/main HEAD` | identical lists, 23 paths |
| Per path, `git diff 8689e3c ae90a14c -- p` vs `git diff origin/main HEAD -- p`, `index` lines dropped | identical for 21 paths, including `scripts/test-suite-contract.mjs` (floors 10→21, 41→112, digest `22516800…`→`c89691d0…`, as A0 reported). Differs only for `evidence/VERIFICATION.md` (694→705, was 692→703 in A0's account; generated) and `test-kits/integrity-manifest.json` |
| Blob at `ae90a14` = blob at `f6652ee` | `.github/workflows/ci.yml`, `test-kits/branch-scope.test.mjs`, `architecture/decisions/RFC-2026-007-ci-independent-guard-step.md`, `handoffs/WP-0A-A0-004-author-handoff.json`, `work-packages/WP-0A-A0-004.json` |

The manifest's PR-side lines are five: `ci.yml` `9dc0de85…`, RFC-2026-007 `53ad211e…` and
`branch-scope.test.mjs` `c269535e…` (the PR's own values, unchanged), and `VERIFICATION.md` `2286db60…` and
`test-suite-contract.mjs` `e52bd3e8…` (hashes of the merged files). RFC-2026-008 and
`scan-repository-secrets.mjs` carry `main`'s digests, so they are not in the PR's diff.

**The conflict resolution, reproduced.** I hashed every file the integrity manifest names: 91 entries, 0
mismatches. `npm run regenerate:manifest` ("rebuilt 91 digest(s)") and `npm run record:verification`
("recorded 705 passing, 0 skipped, 0 todo") left the tree unchanged (`git diff --stat` empty). So neither
generated file was edited by hand into a value the generators would not produce.

**What `main` brought** (`git diff 8689e3c 5debf57`, 19 files): PR #190's WP-0A-A0-005 work:
`scripts/scan-repository-secrets.mjs`, `test-kits/secret-scan.test.mjs`, RFC-2026-008,
`scripts/test-suite-contract.mjs` (its own floors), the integrity manifest, `VERIFICATION.md`, and
WP-0A-A0-005's manifest, handoff and evidence. `git diff --name-only 8689e3c 5debf57 -- .github db
migrations package.json package-lock.json .node-version` is empty; none of the 19 paths matches the
`DB_SURFACE` expression at `ci.yml:207`. So the decision step, the control step, the checkout assertion
and `DB_SURFACE` are what my verdict read.

**Carry clause.** My verdict carries across a merge of `main` commits "that touch no path on `DB_SURFACE`
and no path this branch changes (other than `test-kits/integrity-manifest.json` merged by git)". This sync
touched three paths the branch changes: the manifest (resolved by hand, not by git), `VERIFICATION.md`
(conflict, generated) and `scripts/test-suite-contract.mjs` (merged by git). The clause therefore did not
carry by itself, which is why this reading exists. Read here: all three are generated or merged values,
now reproduced by the generators and by the coverage-floor and integrity guards inside `npm run check`;
none changes the decision step or anything else the clause protects. **No new C0, A1 or Q0 run is owed for
the sync**, and no further R0 reading either, unless the conditions in §4 F2 are hit.

**Gates**

| Command | Exit | Output |
|---|---|---|
| `npm run check` | 0 | `tests 705 / pass 705 / fail 0 / cancelled 0 / skipped 0 / todo 0` (214 s) |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-004` | 0 | `all 23 changed path(s) are declared, and every amendment explains one` |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-004-ci-independent-guard-step` | 0 | `WP-0A-A0-004` |
| `npm run check:handoff` | **91** | `cites base 8689e3c, which is not on this branch's side of its branch point 5debf57 (origin/main) … Run npm run refresh:handoff.` |

The 91 is expected after a merge, and it corrects A0's report: the handoff guards green inside `npm run
check` are the suite's tests of the guard, not `check:handoff` on this branch. The handoff still cites
`8689e3c..8a46413`.

**Refresh rehearsal** (my clone only, reset to `f6652ee` afterwards, never pushed): `npm run
refresh:handoff` ("now cites 5debf57..f6652ee — 15 added, 8 modified, 0 deleted"); the diff is two lines,
`base_revision` and `head_revision_or_patch_checksum`; committed alone, then `check:handoff` exit 0
("describes the branch: nothing substantive after its cited head") and `verify-branch-scope` exit 0 (23
paths).

**CI and PR, read-only** (`gh`): run `37419001878` on `ae90a14`, `pull_request`, `success`. `gh pr view 197`:
OPEN, not Draft, head `ae90a14`, `mergeStateStatus: DIRTY` (it conflicted with `main` before this merge).

## 3. Commits after my verdict (`d7ef73d`)

`git log --first-parent d7ef73d..f6652ee` = three commits; before them, the role readings of `c178f3a`.

| Commit | Listed by my conditions? | R0 reading |
|---|---|---|
| `263aa60`, `8a9bb0a`, `0f43466` (and `d7ef73d`, my own file) | Yes, E1 | One file each under `evidence/WP-0A-A0-004/`. C0 `approved_with_conditions`, only C2 (the Owner's disposition naming §C) left, which is E4. A1: no objection, **A1 N1 closed**, no A1 finding open on PR #197. Q0 `test_verified`, conditional only on Q15 (handoff prose). **E1 met.** |
| `8a46413` merge of `main` `8689e3c` | Yes, E3 and the carry clause | Brought WP-0A-CON-004's contract schemas, test and evidence; no path on `DB_SURFACE`, and of this branch's paths only `test-kits/integrity-manifest.json` (merged by git). Inside the carry clause; **sound**. |
| `ae90a14` handoff refresh | Yes, E2 | Touches only the handoff. `known_limitations[11]` / `open_risks_or_blockers[11]` now say N1 FIXED IN `c178f3a`; `tests[0]` records 703/703 at `8a46413`; `assumptions[4]` cites the readings of `c178f3a`; `assumptions[1]` states the Owner's personal merge. Q15 and C0 F7's class are met. CI green on it. **Sound, met E2 at `ae90a14`.** The merge moved it from last; F1 restores it. |
| `f6652ee` merge of `main` `5debf57` | Yes, E3 ("if `main` moves again") | **Sound** (§2). |

No commit I did not expect is on the branch. There is no A0 merge-reading note, so there is nothing
unlisted to rule on.

Observation, not a condition: the handoff's `known_limitations` / `open_risks_or_blockers` differ from the
manifest's `open_blockers` at `[6]`, `[7]`, `[8]` and `[11]`, because the handoff states the current
position and the manifest stays as the role runs read it. That is consistent with my verdict §5 (the
manifest is corrected after the merge, not in this PR) and needs no change here.

## 4. What must hold before merge (F1-F2 restate E2-E3 for this head; E1 met; E4-E5 unchanged)

- **F1 (handoff last and alone, again).** If this file is carried onto the branch, it is cherry-picked
  byte-for-byte first, and it is the only commit between `f6652ee` and the handoff commit. Then `npm run
  refresh:handoff` on the branch name, in one commit, the last, touching only
  `handoffs/WP-0A-A0-004-author-handoff.json`; `npm run check:handoff` exit 0 on the branch name.
  Recommended in the same commit, not required: `tests[0]` records `npm run check` 705/705 at the final
  head (its 703 at `8a46413` is a dated measurement and stays true), and `reviewer_instructions` /
  `assumptions[4]` name this file if it is carried. Nothing else changes in that commit.
- **F2 (CI on that head).** `bootstrap` green on the final head with `origin/main` an ancestor: the checkout
  line names that head, the decision step logs `the control RUNS` (the head changes `.github/`), and the
  negative control succeeds. If `main` moves again, merge it in and repeat F1. R0 reads again only if the
  update brings a `DB_SURFACE` path, changes any of the five PR-owned blobs listed in §2, or needs a
  conflict resolution other than regenerating `VERIFICATION.md` and the integrity manifest with the
  repository's generators.
- **E4 (unchanged).** The Owner disposes of RFC-2026-007 Amendment 2026-10-06 at the final-head text,
  naming §C. At `f6652ee` the amendment's line still reads `Proposed 2026-10-06`.
- **E5 (unchanged, and the point the brief got wrong).** The Owner merges personally (RFC-2026-025 §5 item
  6), every review conversation resolved, merge commit pinned to the final head, no squash, rebase or
  force. A0 prepares the head and reports; A0 does not press the button.

The post-merge recording of `integration_verified` is as in `r0-n1-recheck-2026-10-06.md` §5, with this
file added to the R0 list: `(… r0-ci-increment-2026-10-06.md, r0-ci-recheck-2026-10-06.md,
r0-n1-recheck-2026-10-06.md, r0-ci-sync-reading-2026-10-06.md)`, and "merged to main by the Product Owner"
kept as written.

## 5. What I did not do

- I did not re-read the content of WP-0A-A0-005's or WP-0A-CON-004's changes that `main` brought; they are
  not this PR's diff, were integrated under their own role runs, and the full suite is green with them.
- I did not repeat the decision-step probe or the mutation run: the step, `DB_SURFACE` and
  `branch-scope.test.mjs` are the same blobs I measured at `c178f3a`.
- I did not call the branch-protection API, push anything, or comment on the PR. My clone and the refresh
  rehearsal stay under the scratchpad.
