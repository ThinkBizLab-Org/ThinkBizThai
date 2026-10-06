# R0 reading of WP-0A-A0-004 after `main` moved

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/189, branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, package `WP-0A-A0-004`. The head I read is the Author's
local merge commit `1b9ca4582d3b8a6ed4b6fcf8b22e4b4af5bed35e` (parents `e3c10e64` = the pushed PR head, and
`fa102298` = `origin/main`), not pushed. Run: `/claude/r0_steward`, this package's Integration Owner.
Measured 2026-10-06.

This reading answers the clause in my re-check (`evidence/WP-0A-A0-004/r0-recheck-2026-10-06.md` §1 and §5 V6):
if `main` moves, R0 re-runs only if the update brings protected-path changes into the PR's own diff. It also
rules on the one commit after my re-check that V1-V6 named only by role (`e3c10e64`).

## 0. What I am

I am a subagent spawned by a workflow script of `/claude/a0_atlas`, the Author of this package, acting as the
Integration Owner run `/claude/r0_steward`. RFC-2026-024 §3/3-4 requires this disclosure. I share a vendor
(Anthropic), a model family and a parent with the Author, and the Author's workflow wrote my brief, including
its summary of the merge and of A0's own measurements. I treated those as claims and re-measured them in a
private clone (§2). I wrote none of the PR's content and I fix nothing. This file is not a merge authorisation,
not a G0 signature, and it moves no package status. A same-vendor signature does not pass Gate G0's external
verification (RFC-2026-024 §3/5).

## 1. Verdict

**The sync changes nothing my verdict rests on.** The PR's own diff against `main` is byte-identical before and
after the merge, it still touches no protected path, and every gate I can run locally is green on the merge
head. `main` did bring protected-path changes into the branch's *tree* (two RFCs, two contract tests and
`test-kits/integrity-manifest.json`, from PRs #187 and #188), but none into the PR's *diff*, which is the
trigger my re-check set. So no R0 re-run is owed for the sync, and no other role run is owed either.

**`e3c10e64` (the handoff commit) is sound and meets V3.** It is the V5 commit my re-check asked for, not an
unlisted extra (§3).

**`integration_verified`: CONDITIONAL, conditions unchanged in substance.** My verdict stands once **W1-W3**
(§4) hold on one final head. They restate V5 and V6 for the merge head; V1-V4 are met.

- Stop-the-line: **none**.
- Blocks the merge as of `1b9ca458`: **yes, until W1-W3 hold.** The one thing missing is the refresh: at
  `1b9ca458` `npm run check:handoff` exits **91** (§2). A0's report that the handoff guards are green is true of
  the `npm run check` suite, not of `check:handoff`; the handoff still cites base `8c089cc`.
- Governance PR (RFC-2026-025 §5 item 6): **no**. Record-only (item 1): **no**, as before. A0 presses the merge
  under the Owner's standing delegation, as my re-check §5 already said.
- No extra commit beyond `e3c10e64` and the merge was added after my re-check (§3).

## 2. What I measured

Private clone under my scratchpad, checked out with `git checkout -B
agent/claude/WP-0A-A0-004-ci-independent-guard-step 1b9ca458`, so `git branch --show-current` is the package
branch, not a detached HEAD. `origin` re-pointed to GitHub and fetched; `origin/HEAD` set to `main`.
`git ls-remote origin`: `main` = `fa102298`, PR branch = `e3c10e64` (so the merge is not pushed). Node
`v24.20.0`, npm `11.19.0`, `npm ci --ignore-scripts` exit 0. No database was used.

**The PR's own diff, before and after the sync**

| Measure | Result |
|---|---|
| `git merge-base e3c10e64 origin/main` | `8c089cc` (the base my re-check read) |
| `git merge-base --is-ancestor origin/main HEAD` | exit 0: the head contains current `main` |
| `git diff 8c089cc e3c10e64` vs `git diff origin/main...HEAD` vs `git diff origin/main HEAD` | `cmp`: all three byte-identical |
| `git diff --name-only origin/main HEAD` | 13 paths: 11 under `evidence/WP-0A-A0-004/`, `handoffs/WP-0A-A0-004-author-handoff.json`, `work-packages/WP-0A-A0-004.json` |
| `git diff --quiet origin/main HEAD -- .github package.json package-lock.json .node-version scripts test-kits contract-catalog CONTRIBUTING_AGENTS.md AGENTS.md CLAUDE.md docs architecture .agents db migrations` (run under `bash`, so the path list splits) | exit 0 (T4, and V4's narrower list also exit 0) |

**What `main` brought into the tree** (`git diff 8c089cc origin/main`, 26 files, +3533/-138): protected paths
`architecture/decisions/RFC-2026-006-job-reference-hardening.md`, `RFC-2026-009-reference-bounds.md`,
`test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs`, `ctr-job-001-reference-hardening.test.mjs`,
`test-kits/integrity-manifest.json`; the rest is CON-005/CON-007 manifests, handoffs and evidence. None of it
names `WP-0A-A0-004` (`grep -c` on the changed path list = 0), and `git diff --quiet 8c089cc origin/main --
.github package.json package-lock.json .node-version scripts` exit 0: `ci.yml` (so `open_blockers[7]`'s
`ci.yml:54`), the guards and the toolchain are what my verdicts read. `WP-0A-A0-001.json` is untouched, so the
`amended_by[2]` record is as my first verdict §7 left it.

**Gates at `1b9ca458`, on the branch name**

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-test-coverage-floor.mjs` | 0 | |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-004.json` | 0 | |
| `node scripts/validate-work-packages.mjs` | 0 | |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-004-ci-independent-guard-step` | 0 | `WP-0A-A0-004` |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-004` | 0 | `all 13 changed path(s) are declared, and every amendment explains one` |
| `npm run scan:secrets` | 0 | |
| `npm run check` | 0 | `tests 692 / pass 692 / fail 0 / cancelled 0 / skipped 0 / todo 0` (505 s) |
| `npm run check:handoff` | **91** | `cites base 8c089cc, which is not on this branch's side of its branch point fa10229 (origin/main) … Run npm run refresh:handoff.` |

The 91 is expected (V6: "If `main` moves: merge or rebase it in, re-run V5"). CI runs `npm run check`, not
`check:handoff`, so a green `bootstrap` alone would not show the handoff is current; W1 asks for both.

**Rehearsal of the refresh**, local, reset afterwards, never pushed: `npm run refresh:handoff` on `1b9ca458`
("now cites fa10229..1b9ca45 — 10 added, 3 modified, 0 deleted"; base moved from `8c089cc` to the branch
point). The diff is two lines, `base_revision` and `head_revision_or_patch_checksum`; the commit touches only
the handoff. After it: `check:handoff` exit 0 ("describes the branch: nothing substantive after its cited
head"), `verify-branch-scope` exit 0 (13 paths), and `known_limitations` and `open_risks_or_blockers` still
equal the manifest's eight `open_blockers` element by element.

**Role files carried byte-identical** (blob at `1b9ca458` = blob at the role run's own commit):
`c0-recheck-2026-10-06.md` `282905b` = `0bc041b`; `a1-recheck-2026-10-06.md` `2689b3f` = `2b290e3`;
`q0-recheck-2026-10-06.md` `a0c8656` = `93385ce`; `r0-recheck-2026-10-06.md` `20a8885` = `86781ab`. The four
first-verdict files were checked the same way in my re-check §2.1 and did not change after it.

**CI and PR, read-only** (`gh`): run `37367575232` on `e3c10e64`, `pull_request`, **success**. That head no
longer contains `main`; `gh pr view 189`: OPEN, not Draft, head `e3c10e64`, `mergeStateStatus: BEHIND`.

## 3. Commits after my re-check

`git log --first-parent ab70a54..1b9ca458` = two commits.

| Commit | Listed by V1-V6? | R0 reading |
|---|---|---|
| `e3c10e64` handoff refresh + C0 F7 wording | Yes, V3 and V5 | **Sound, meets V3.** Touches only the handoff (`git diff --name-only e3c10e64~1 e3c10e64`). `known_limitations` and `open_risks_or_blockers` each equal `open_blockers` (eight, same order), A1 F1's `ci.yml:54` entry included. `reviewer_instructions[0]` names the four first verdicts and the four re-checks, and no longer says no verdict exists. It also adopted my recommended `reviewer_instructions[3]` wording (acknowledgement given in first verdict §7; the field flip is still owed). `compatibility_impact` cites `git diff --quiet origin/main HEAD -- …` exit 0, which I re-measured. It was V5's commit at `e3c10e64`; the merge moved it from last, which W1 restores. |
| `1b9ca458` merge of `origin/main` | Yes, V6 ("merge or rebase it in") | **Sound.** Ordinary `ort` merge, no conflict, no force; the PR's diff is unchanged (§2). |

The four re-check files (`8e6105e`, `97fdf58`, `b7c5d3c`, `ab70a54`) sit between `5bbb3f1` and `e3c10e64`, as V1
required, each one file under `evidence/WP-0A-A0-004/`. **Q0 (V2):** `q0-recheck-2026-10-06.md` §6 is
`test_verified` at `5bbb3f1`, "Q0 blocks nothing of its own", and its only open items are the refresh and C0 F7,
both now in `e3c10e64`. V2 is met. No commit I did not expect is on the branch; there is no A0 merge-reading note.

## 4. What must hold before merge (W1-W3 replace V5-V6; V1-V4 are met)

- **W1 (handoff last and alone, again).** If this file is carried onto the branch, it is cherry-picked
  byte-for-byte first, and is the only commit between `1b9ca458` and the handoff commit. Then `npm run
  refresh:handoff` in one commit, the last, touching only `handoffs/WP-0A-A0-004-author-handoff.json`; `npm run
  check:handoff` exit 0 on the branch name; `known_limitations` and `open_risks_or_blockers` still equal
  `open_blockers`. If this file is carried, the same commit corrects two counts that it would make false:
  `rollback_or_forward_fix` "eleven evidence files of which ten are added" becomes twelve and eleven, and
  `reviewer_instructions[0]` names this file. The `tests` entry "at ab70a54 … 13 changed path(s)" is a dated
  measurement and stays. Nothing else changes in that commit. Carrying this file is optional: the PR is mergeable
  without it, and the merge record can cite it from this commit instead.
- **W2 (CI on that head).** The required check `bootstrap` is green on the final head, every step including
  `Verify branch scope` and `Negative control`, and `origin/main` is an ancestor of it. If `main` moves again,
  repeat the merge and W1. R0 re-runs only if the update brings a protected path into `git diff
  origin/main <final>`, or if the merge needs a conflict resolution in any of this PR's 13 (or 14) paths.
- **W3 (A1's carry condition and T4, on the final head).** `git diff --quiet origin/main <final> -- .github
  package.json package-lock.json .node-version scripts test-kits contract-catalog architecture .agents db
  migrations` exit 0.

Merge mechanics are unchanged from my re-check §5: merge commit pinned with `--match-head-commit` to the final
head, no squash, rebase or force; the state record quotes the Owner's delegation words verbatim and names who
pressed the button; a stop-the-line finding at any point revokes the delegation. The post-merge recording of
`integration_verified` is unchanged from my re-check §6, with this file added to the R0 file list in the
`open_blockers[6]` wording: `(r0-integration-verdict-2026-10-05.md, r0-recheck-2026-10-06.md,
r0-sync-reading-2026-10-06.md)`.

## 5. What I did not do

- I did not re-read the contents of the CON-005/CON-007 changes `main` brought in; they are not this PR's diff,
  were integrated under their own role runs, and the full suite is green with them.
- I did not call the branch-protection API, and I did not repeat the neutered-`scripts.check` sandbox: `ci.yml`
  and the guards are unchanged since my first verdict (§2).
- I pushed nothing. The refresh rehearsal stayed in my private clone and was reset.
