# WP-0A-CON-004: R0 reading of PR #196 after `main` moved

Package: `WP-0A-CON-004`, Secret handle, audit event and observability contracts. PR:
https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/196, branch
`agent/claude/WP-0A-CON-004-security-audit-observability`. Head read: the local merge commit
`31879073f4ffd548ba49fc702705287bfa74dd57`, parents `a8f45dd9` (the PR head on GitHub) and `9e15881b`
(`origin/main`, which brings in PRs #191, #193, #194 and #195). Merge base `574c8a8c`. Not pushed. My
latest verdict is `r0-recheck-2026-10-06.md`, attested against `3082874`.

## 0. What I am, and the verdict

- A subagent of `/claude/a0_atlas`, spawned by A0's workflow script under RFC-2026-024, acting in the
  role `/claude/r0_steward`: this package's declared Integration Owner, and the Integration Owner of
  WP-0A-CON-008 (owner of `test-kits/contracts/catalog-registry.test.mjs`) and of WP-0A-A0-002 (owner
  of `test-kits/integrity-manifest.json`), the two files this merge had to resolve.
- The run that spawned me is this package's Author, and it made the merge I am reading. I record that
  so the reader can weigh what follows. I wrote none of the PR's content.
- I do not fix. My only change is this file. It approves no review, test or security gate, and it does
  not move G0, which stays Specification Baseline Complete / External Verification Pending. All data is
  synthetic; no database was started and no provider or credential was touched.

**Verdict: the sync changes nothing my verdict rests on, and my verdict stands.** The PR's own `+`/`-`
lines against `main` are identical before and after the merge except for the one integrity digest of
the file both sides edited, which now equals the merged bytes. Both conflicts were resolved by owner
side with no hand-made value. `integration_verified` may be recorded on the conditions in §4. Those
conditions add one thing my earlier verdict did not need: **C0's and Q0's own carry rules are tripped by
the `main` syncs, so each owes a short carry reading at a head after this merge before the PR merges**
(§3, R-1). A0 may then press the merge under the Owner's standing delegation. **Stop-the-line: none.**

## 1. Measured versus read

### Measured (by me, in this run)

Private clone at `…/scratchpad/r0-WP-0A-CON-004-sync`, checked out **on the branch name**
(`git branch --show-current` printed it) at `31879073`, `origin` set to the GitHub remote and fetched
(`origin/main` = `9e15881b`), `origin/HEAD` set to `origin/main` before any handoff measurement. Node
`v24.20.0`, npm `11.19.0`, `npm ci` exit 0.

| Command | Exit | Result |
|---|---|---|
| `git diff --name-only a8f45dd9 31879073` vs `git diff --name-only 574c8a8c 9e15881b` | 0 | identical (98 paths): the merge brings in only `main`'s paths |
| `git diff --name-only 9e15881b 31879073` vs `git diff --name-only 574c8a8c a8f45dd9` | 0 | identical: against `main` the merge carries only the branch's paths |
| overlap of the two sides | 0 | exactly two paths: `test-kits/contracts/catalog-registry.test.mjs`, `test-kits/integrity-manifest.json` (A0's two conflicts) |
| `git diff -U0` of `catalog-registry.test.mjs`, four ways | 0 | `9e15881b→31879073` equals `574c8a8c→a8f45dd9` line for line (the PR's six pins: AUD/OBS/SEC caveat, AUD/OBS/SEC annotation). `a8f45dd9→31879073` equals `574c8a8c→9e15881b` line for line (`main`'s NTF/USG caveat, USG annotation, NTF fixture list, NTF/USG source refs). No line is new to both parents: a clean union, no hand-made digest |
| `git diff 9e15881b 31879073 \| grep '^[+-]'` vs `git diff 574c8a8c a8f45dd9 \| grep '^[+-]'` | 1 | one difference only: the `catalog-registry.test.mjs` line in the integrity manifest, `a00c7828…→17a6ea14…` now versus `e9589221…→6403f1e5…` before. Confirms A0's report |
| `git show 31879073:test-kits/contracts/catalog-registry.test.mjs \| shasum -a 256` | 0 | `17a6ea142e3f6fa5aa3e6f51d74465b8d0cf21e4ce0d4bca6d576aec55e8fc93`, equal to the manifest entry |
| `npm run regenerate:manifest` in a throwaway clone of `31879073` | 0 | `rebuilt 91 digest(s)`, `git status` clean: every committed digest equals its file. `main`'s three moved digests (`json-schema-subset.mjs`, the two shared-kernel tests) came through untouched |
| `git diff fa102298 3082874` vs `git diff origin/main HEAD`, `+`/`-` lines, excluding `evidence/`, `handoffs/` and the integrity manifest | 1 | one line differs: `open_blockers[15]` of `work-packages/WP-0A-CON-004.json`, rewritten by `84074eff` (§3). Every contract, fixture, pin and test line of the PR is byte-identical to what I read at `3082874` |
| `git diff --quiet 3082874 HEAD -- contract-catalog/shared-kernel/ctr-{sec,aud,obs}-001` | 0 | this package's three contracts are byte-identical to my verdict head. Every other `contract-catalog/` change since then is `main`'s CTR-USG/NTF/FLG work |
| `node --test test-kits/contracts/catalog-registry.test.mjs` | 0 | tests 15, pass 15, fail 0 (recomputes every pin from the catalog) |
| `node --test test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs` | 0 | tests 8, pass 8, fail 0: none of the 22 CON-004 `KNOWN_UNBOUNDED` entries went stale |
| `json-schema-subset.mjs` changed by this merge (`git diff --quiet a8f45dd9 HEAD -- …`) | 1 | yes: `main`'s code-point `minLength`/`maxLength` fix arrives here for the first time. Scan of all 210 CTR-SEC/AUD/OBS fixtures: **0** contain a non-BMP character, so code-point and code-unit lengths are equal for every string in them and no fixture's outcome can move. The full suite below agrees |
| `git merge-base --is-ancestor origin/main HEAD` | 0 | the head contains `9e15881b` |
| `git diff --stat origin/main HEAD` vs `git diff --stat 574c8a8c a8f45dd9` | 0 | both `20 files changed, 1830 insertions(+), 80 deletions(-)` |
| `git diff --stat origin/main HEAD -- architecture/ scripts/ .github/ db/ package.json package-lock.json .node-version CONTRIBUTING_AGENTS.md contract-catalog/shared-kernel/index.json` | 0 | empty. Not a governance PR |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-004` | 0 | `all 20 changed path(s) are declared, and every amendment explains one` |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-CON-004-security-audit-observability` | 0 | `WP-0A-CON-004` |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-004.json` | 0 | passes |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | passes |
| `node -e` comparing manifest `open_blockers` with handoff `open_risks_or_blockers` and `known_limitations` | 0 | 17 = 17 = 17, **no index differs**: my earlier N-1 (A1 N-4) is closed in the handoff |
| `npm run check` at `31879073` | 0 | tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0. Explained in R-3 |
| `npm run check:handoff` at `31879073` | 91 | `cites base 574c8a8, which is not on this branch's side of its branch point 9e15881 (origin/main)… Run npm run refresh:handoff` |
| `gh pr view 196` | 0 | `OPEN`, not Draft, `mergeable: CONFLICTING`, `mergeStateStatus: DIRTY`, `headRefOid` `a8f45dd9`: GitHub sees the conflict this local merge resolves |
| `gh run list` on the branch | 0 | `Bootstrap validation` run `37393602459` on `a8f45dd9`: `success`. That head predates this sync, so it is not the merge head |

**Throwaway refresh** (`…/scratchpad/r0-con004-throwaway`, a clone of `31879073` on the branch name,
`origin/HEAD` → `origin/main` = `9e15881b`; never pushed): §5 has the numbers, taken with this file
committed first and the refresh committed last and alone.

### Read, not measured

- A0's merge report, which every measurement above confirms.
- The verdict and carry sections of `c0-recheck-2026-10-06.md` (`review_approved`),
  `a1-recheck-2026-10-06.md` (`security_approved_with_conditions`, N-1 closed) and
  `q0-recheck-2026-10-06.md` (`test_verified_with_conditions`). I did not re-run their probes or
  mutants.

## 2. Does the sync change what my verdict rests on?

**The package's own diff against `main`: no.** Same 20 paths, same line counts, same `+`/`-` lines,
except the one integrity digest that must move because the bytes it covers now include `main`'s pins.
The three contracts are byte-identical to `3082874`. In `catalog-registry.test.mjs`, the PR's six pins
are the PR's and `main`'s five changed lines are `main`'s, each copied from its owning side.

**Gates: no change in substance.** Scope (20/20 declared), identity, role separation and ownership
pass. The handoff guard (`check:handoff` 91) is stale, as it must be after a merge, and a refresh last
and alone cures it (§5).

**Protected paths: no change beyond the resolution.** As Integration Owner of both resolved files I
acknowledge the resolution: `integrity-manifest.json` differs from `main` by exactly the one
`catalog-registry.test.mjs` digest, and that digest equals the bytes; `catalog-registry.test.mjs`
differs from `main` by exactly the PR's six pin lines. No file under `architecture/`, `scripts/`,
`.github/`, `db/` or the root changes.

**What `main` brought that could matter:** the validator's code-point length fix. Measured harmless for
this package (0 non-BMP characters in 210 fixtures; full suite green).

## 3. Commits after my verdict that my conditions did not list, and findings

First-parent history `3082874..31879073`: the four role files (`8d847341` C0, `964af3d3` A1,
`bfce9115` Q0, `472ed056` my re-check), within my condition 1; three `main` merges (`f99ad990`,
`ff5c94b3`, `31879073`); two handoff refreshes (`53148435`, `a8f45dd9`), each handoff-only and each
superseded by the refresh still owed; and `84074eff`. No A0 merge-reading note is on the branch.

- **`f99ad990` and `ff5c94b3`, earlier `main` merges.** For each I compared the `+`/`-` lines of
  `main→merge` with `merge-base→branch tip`: equal. Both are clean, and neither moved PR content.
- **`84074eff`, `open_blockers[15]` closed in place. Ruled: sound, accepted, and it corrects my
  condition 2.** It touches one string of `work-packages/WP-0A-CON-004.json`; the index and the array
  length (17) are kept and `status` stays `in_review`. It cites each role's file and verdict correctly.
  It does not record the status move I asked for in condition 2, and says why: my wording names the
  final head SHA and its `bootstrap` run, and a commit made before the handoff refresh cannot contain
  either. That is right; my condition 2 could not be met as written. I replace it in §4.

**R-1 (blocks the merge, not stop-the-line): C0's and Q0's carry rules are tripped by the syncs.**
Q0's verdict carries to the refresh head only if `git diff 3082874 <refresh-head>` touches the handoff
and the four role files, and it says "A move of `main` that forces a second merge does too" need a new
Tester run. C0's carries to a head adding only role files and the handoff, and "any further change to
`contract-catalog/**`, `catalog-registry.test.mjs` or the package manifest's contract claims needs a C0
re-check". Since `3082874` there have been three `main` merges, `catalog-registry.test.mjs` took
`main`'s pins through a conflict, and `84074eff` edited the manifest. By measurement the PR's own
content is unchanged (§1) and `[15]` is not a contract claim, so I expect both readings to be short,
but the carry is each role's to give, not mine. Disposition: C0 and Q0 each record a carry reading at a
head containing `31879073`, carried on the branch before the final refresh. Any of the four roles that
finds a defect lapses this verdict.

**R-2 (record): GitHub is behind the local head.** PR #196 shows `CONFLICTING` at `a8f45dd9`. That is
the conflict this merge resolves; it clears on push.

**R-3 (answer to A0's question): why `npm run check` is green at an unrefreshed merge.** The in-suite
guard ("the handoff for this branch describes this branch") compares the cited head with
`branchTipBefore(HEAD)`. For a merge whose first parent is not on `origin/main`, that is the first
parent (`scripts/refresh-author-handoff.mjs` line 106 onward), here `a8f45dd9`. The handoff cites
`ff5c94b3`, and between `ff5c94b3` and `a8f45dd9` only the handoff changed, so the drift is empty and the
test passes by design. `npm run check:handoff` also checks the base against the branch point, and that
is what fails (91). At `3082874` my run was red because that head was an ordinary commit on top of a
merge, so its comparison point was the merge itself. The suite going green on a fresh merge is not a
false green on content, but it is not evidence that the handoff is current: **cite `check:handoff`, not
`npm run check`, for the handoff.** The first ordinary commit on top of this merge (this file) turns
the in-suite guard red until the refresh.

## 4. Verdict

**Does the sync change anything my verdict rests on? No.** The PR's own diff, its contract and test
bytes, its gates and its protected-path footprint are unchanged; the resolution is a clean owner-side
union with one regenerated digest that equals its bytes.

**Does my verdict stand once the handoff is refreshed last and alone and CI is green on that head? Yes,
with R-1 added.** `integration_verified` may be recorded when all of these hold on
`agent/claude/WP-0A-CON-004-security-audit-observability`, and not before:

1. This file is on the branch as its own commit, followed by C0's and Q0's carry readings (R-1), each an
   evidence file only. If either finds a defect, or anything under `contract-catalog/**`,
   `test-kits/**` (beyond what `main` brings) or the manifest's rules changes, this verdict lapses.
2. **(Replaces condition 2 of `r0-recheck-2026-10-06.md`.)** No manifest commit is owed before the
   refresh; `84074eff` is the pre-refresh record. The status move is recorded **after** the green run,
   where the head SHA exists: A0 records the wording below in its merge disposition, and the next
   CON-004 increment on `main` sets `status` and the record in `work-packages/WP-0A-CON-004.json`,
   alongside the R3 amendment records already owed.
3. The handoff is refreshed **last and alone** (`npm run refresh:handoff` where `origin/HEAD` is
   `origin/main`), and `npm run check:handoff` exits 0 on the branch name.
4. The required `bootstrap` check is green on that exact head, and the head still contains `main`. If
   `main` moves first, merge it again; if the merge is clean and the PR's `+`/`-` lines are unchanged
   except the one integrity digest of a file both sides edited (equal to its bytes), this reading
   applies without another R0 run. Any conflict in a contract of this package, or a resolution that
   takes a value from neither side, needs me again.

- **Stop-the-line:** none. No secret, tenant data, migration, job, external side effect or contract
  meaning is touched by the sync.
- **Merge path:** A1 recorded N-1 closed and no security finding open against the PR, and its one
  record item (the handoff copy of `[14]`) is measured done. The standing delegation (2026-10-03,
  RFC-2026-025 §5 item 6) applies: **A0 may press the merge once 1, 3 and 4 hold.** It is not a
  governance PR.

### Wording A0 records on my behalf, once 1, 3 and 4 hold

> integration_verified by /claude/r0_steward (evidence/WP-0A-CON-004/r0-integration-verdict-2026-10-05.md,
> r0-recheck-2026-10-06.md and r0-sync-reading-2026-10-06.md): A1 N-1 fixed in this PR (one annotation,
> its pin and digest); C0, A1 and Q0 re-checks on the branch, with C0's and Q0's carry readings after the
> main syncs; main 9e15881 merged at 31879073 with catalog-registry.test.mjs and integrity-manifest.json
> resolved by owner side (the PR's own +/- lines unchanged; catalog-registry digest regenerated to the
> merged bytes, 17a6ea14…); handoff refreshed last and alone; bootstrap green at <final head SHA> (run
> <run id>). Owed before done: the CON-004 amendment record on WP-0A-A0-002 and WP-0A-CON-008 (R3), the
> 22-bounds increment with A1 N-2 and Q0 O-2, and F5 to the Owner in the next Owner batch (R5).

A0 fills the two placeholders with measured values. If `main` moves again under condition 4, A0 also
replaces `9e15881` and `31879073` with the last merge's values.

## 5. Throwaway proof of condition 3 and the green suite

In the throwaway clone (on the branch name, `origin/HEAD` → `origin/main` = `9e15881b`, after a real
`npm ci`), this file was committed first and `npm run refresh:handoff` was committed alone on top. C0's
and Q0's carry readings did not exist yet; each adds one evidence file before the refresh and changes
none of the results below except the path counts.

| Step | Exit | Result |
|---|---|---|
| `npm run refresh:handoff`, commit the handoff alone | 0 | `now cites 9e15881..<this-file commit> — 10 added, 11 modified, 0 deleted`; base moved from `574c8a8` to the branch point against `origin/main` |
| `git show --stat HEAD` | 0 | one file, `handoffs/WP-0A-CON-004-author-handoff.json`, `+4 −3` |
| `npm run check:handoff` | 0 | `describes the branch: nothing substantive after its cited head` |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-004` | 0 | `all 21 changed path(s) are declared, and every amendment explains one` (20 + this file) |
| `npm run check` | 0 | tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0 |

Attested by `/claude/r0_steward` against `31879073f4ffd548ba49fc702705287bfa74dd57` on the branch name,
with `main` @ `9e15881b10277b141c651abcaa2eb0ad9e9e0c6f`.
