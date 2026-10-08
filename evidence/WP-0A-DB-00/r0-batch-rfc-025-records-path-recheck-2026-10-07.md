# R0 re-check: the RFC-2026-025 §6 governance PR (#211) at head `d12475a`

Date: 2026-10-07, measured into 2026-10-08 (+07:00). PR:
https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/211 (Draft, `GOVERNANCE:`). Branch
`agent/claude/WP-0A-DB-00-batch-rfc-025-records-path`, head `d12475a70f6707d45c936098b1cab19562bfc6dd`.
`origin/main` is `389f3845` (#210). This re-check follows A0's corrections to my first review
(`evidence/WP-0A-DB-00/r0-batch-rfc-025-records-path-review-2026-10-07.md` on the branch, first written as
`evidence/WP-0A-A0-001/r0-review-2026-10-07.md`, commit `b6d7f6ca`) and to C0's, A1's and Q0's reviews,
as A0 closes them in `evidence/WP-0A-DB-00/a0-batch-rfc-025-records-path-closure-2026-10-08.md`.

The handoff has **not** been refreshed on this head. A0 left it that way on purpose. I judge the handoff
guard with a throwaway local refresh (§1), which I made in my private clone and never pushed.

## 0. What I am

- A subagent of `/claude/a0_atlas`, spawned by A0's workflow script under RFC-2026-024. I act in the role
  `/claude/r0_steward`. That run is WP-0A-DB-00's declared Integration Owner. It is also the Integration
  Owner of WP-0A-A0-002 and WP-0A-CON-008, whose files this PR amends. For WP-0A-A0-001, whose manifest
  still names `/root/r0_steward`, I act as its named successor, as in my first review. `/root/r0_steward`
  is a different run, and this file is not that run's verdict.
- The run that spawned me is this PR's Author. I record that so the reader can weigh the verdict. I wrote
  none of the PR's content and no other role's file.
- I do not fix. My only change is this file. It gives an integration reading and acknowledgements. It
  approves no review, test or security gate, and it does not approve RFC-2026-025 §6, which only the Owner
  can do. It authorises no merge and does not move G0. Every input was synthetic: throwaway git
  repositories, in-memory manifests and the repository's own history. I started no database and touched no
  provider or credential.
- The user request relayed to this run reads `ข้อ 4 mw`. I can attest that string. I cannot attest A0's
  reading of it ("item 4: do it"), and §6's header now labels that reading as A0's.

## 1. Measured versus read

### Measured (by me, in this run)

These ran in a private clone at `…/scratchpad/r0-WP-0A-A0-001-recheck/`, checked out **on the branch name**
at `d12475a`, with `origin/main` at `389f3845`. Node `v24.20.0` came from
`/Users/bank/.local/node-v24.20.0/bin`, first on `PATH`.

| Command | Exit | Result |
|---|---|---|
| `git branch --show-current` | 0 | `agent/claude/WP-0A-DB-00-batch-rfc-025-records-path` |
| `npm run check` at `d12475a` (handoff as committed) | 1 | `tests 717, pass 715, fail 2`. The two failures are exactly `the handoff for this branch describes this branch` and `the handoff ratchet fails when an author handoff claims another role approved something`. This is what A0's closure note §3 says. |
| CI `bootstrap` on `d12475a`, run `37662290346` | fail | The same two tests, `pass 715, fail 2`, with "handoff cites head 794946d, after which 34 substantive path(s) changed". Red, as expected, until the refresh. |
| **Throwaway** `npm run refresh:handoff`, then a local commit (never pushed) | 0 | "now cites 389f384..d12475a — 8 added, 8 modified, 0 deleted". Only `handoffs/WP-0A-DB-00-author-handoff.json` changed (+8/−2). |
| `npm run check:handoff` on that throwaway commit | 0 | `describes the branch: nothing substantive after its cited head` |
| `npm run check` on that throwaway commit | 0 | **`tests 717, pass 717, fail 0`** |
| `git reset --hard d12475a` afterwards | 0 | the clone is back at `d12475a` and the status is clean |
| `npm run regenerate:manifest`, then `git diff --exit-code test-kits/integrity-manifest.json` | 0 / 0 | the committed manifest is the regenerator's output |
| `npm run record:verification`, then `git diff` | 0 | no difference: `evidence/VERIFICATION.md` stays at 717 |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-DB-00` | 0 | `all 16 changed path(s) are declared, and every amendment explains one` |
| `node scripts/verify-branch-identity.mjs <branch>` | 0 | `WP-0A-DB-00` |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-DB-00.json` | 0 | distinct role ids |
| `node scripts/db/classify-records-only.mjs origin/main HEAD` | 1 | NOT records-only (RFC, generated files and others). Correct for a governance PR. |
| `node scripts/db/classify-records-only.mjs --sync 56388d70 ad42e510 origin/main` | 1 | NOT mechanical: "main changed the PR's own path(s): test-kits/branch-identity.test.mjs". This is my R-6 case, and §6.3 classifies it correctly. |
| `git diff --name-only 389f3845 ad42e510` against the PR's own paths (`merge-base..56388d70`) | — | **identical lists**: the merge differs from `main` only at the PR's own paths |
| `git diff origin/main HEAD -- test-kits/branch-identity.test.mjs` | 0 | only the two DB-00 slot lines differ. #210's CON-004 slot from `main` is kept. |
| `git diff origin/main HEAD -- scripts/test-suite-contract.mjs` | 0 | test floor 86 → 87; assertion floor 1121 → **1329**, with a comment for each step; digest `63dd7456…` → `d01d2282…`. Nothing else changed. |
| manifest at `main`, at `f7e9ce8` and at the head, parsed | — | only `ownership.branch`, `ownership.amends_without_owning` (the same four paths; the `rationale` is restated) and `open_blockers` differ from `main`. `open_blockers` grows 203 → 204, and entries 0–202 are byte-equal to `main`. Entry `[203]` at the head **starts with** its `f7e9ce8` text, plus 2834 appended characters. `status` stays `in_progress`. `required_human_authorities` is unchanged. |
| the four moved review files: blob at the head vs blob in the original commits (`3056c273`, `bf252951`, `11b623ef`, `b6d7f6ca`, read from the reviewers' worktrees) | — | **all four blob ids are identical**. The cherry-picks carry `(cherry picked from commit …)`. |
| `gh pr view 211` | 0 | `OPEN`, Draft, `MERGEABLE`, `headRefOid` `d12475a7…`. `main` is `389f3845`, so the head contains current `main`. |

**§6.5 reproduced with the narrowed classifier at this head.** This ran read-only over `7fb0fc05`, with
`classify <m>^1 <m>^2` for every first-parent merge since `2026-10-05T12:00+07:00`:
- **26 PRs, 5 records-only:** #206, #205, #201, #199 and #198, with no exit 2.
- The printed status moves are exactly four, each `in_review -> integration_verified`: CON-004 (#205),
  CON-003 (#201), A0-002 (#199) and CON-005 (#198). #206 moves no status.
- `--sync <s>^1 <s> 7fb0fc05` for every first-parent merge on each PR branch: **50 syncs, 48 mechanical.**
  The two that are not mechanical are `f6652ee0` (#197) and `31879073` (#196).

**Q-025-6-3's claim was measured.** With the front-clause half of `appendOnlyStrings` removed (a copy
outside the repository), #206 and #201 exit 1. #205, #199 and #198 still exit 0. That matches the
question's text.

**Mutation spot-check, mine and independent of A0's.** I disabled one rule at a time, ran only
`--test-name-pattern 'the records-only classifier'`, and restored the file from a copy each time, checked
with `cmp`. The unmutated baseline passes.

| Rule disabled | Test |
|---|---|
| record file name (`RECORD_FILE_NAME`) | killed |
| depth: directly under `evidence/<package>/` | killed |
| `done` refused | killed |
| backward move refused | killed |
| value outside the flow refused | killed |
| `required_human_authorities` strictly appended (swapped back to the prefix/suffix rule) | killed |
| status moves recorded | killed |
| status moves printed by the CLI | killed |
| an existing record is appended to, not rewritten | killed |
| non-regular old mode (`100755 -> 100644`) | killed |
| **the merged commit is on `origin/main`** (the R-4 rule) | **killed** |

That is 11 of 11. R-4's surviving mutant from my first review is now killed.

**Adversarial probes of the pure functions** (in memory; "REC" means the classifier calls it a record):

| Probe | Result |
|---|---|
| status `in_review` → `done` / `in_progress` / `blocked` / removed | refused, each with its own reason |
| status `in_review` → `review_approved` / `integration_verified`; `backlog` → `integration_verified` | REC, and the move is printed |
| `required_human_authorities[0]` with ` -- waived` appended / `Not required: ` in front | refused |
| a new entry appended to `required_human_authorities` | REC |
| `open_blockers[0]` with a closing clause after it / in front of it | REC (Q-025-6-3 asks the Owner about both) |
| new `r0-review-x.md`, `product-owner-disposition-x.md`, `session-x.mjs`, `sub/session-x.md`, `.gitattributes`, `session-.md`, `Session-x.md`, `evidence/VERIFICATION.md` | refused |
| new `session-x.md`, new `light-path-reading-2026-10-08.md` | REC |
| **`session-r0-verdict-APPROVED.md`** (a role verdict under a record name) | **REC** (R2-1) |
| **an existing `light-path-reading-*.md` appended with `verdict superseded: APPROVED`** | **REC** (R2-1) |

### Read, not measured

- C0's, A1's and Q0's verdicts at `f7e9ce8`, as the closure note's table states them. I read the moved
  files only to confirm their blob ids, not to re-judge them.
- That A0's own mutation run killed the eleven mutants it names. My table above is a separate run.
- The Owner's words. I attest the string `ข้อ 4 mw` and nothing more.

## 2. My first-review findings, re-checked

| Finding | Re-check at `d12475a` |
|---|---|
| **R-1** (blocking): the head did not contain `main` `389f3845` | **Closed.** The merge `ad42e510` has parents `56388d70` and `389f3845`. It differs from `main` only at the PR's paths. The integrity manifest at the head is the regenerator's output (`cmp` 0). `VERIFICATION.md` round-trips. Both branch slots are present. `main` has not moved since. As §6.3 itself says, this sync was **not** mechanical, so every role verdict from `f7e9ce8` must be re-checked on the new head. A0 has asked for that. |
| **R-2** (state): no role run and no CI result | **Still open, as state.** The four reviews exist at `f7e9ce8`. None exists yet at this head, and CI is red here by design (handoff not refreshed). |
| **R-3**: §6.1 did not tell the Owner what it admitted | **Closed.** (1) Role files and Owner dispositions are now refused, new or appended, and the probes confirm it. §6.1's comparison says §5's exclusion is kept. (2) Closing a blocker is named as a widening, and Q-025-6-3 asks about both forms. (3) `status` is limited to forward moves short of `done`, and every move is printed. §6.2 makes the reader check each move against a role verdict on `main`, and Q-025-6-4 puts it to the Owner. The reliance on `verify-branch-scope` is stated. See R2-1 and R2-2 for what is left, which is advisory. |
| **R-4**: the on-`main` sync rule was untested | **Closed.** There is a CLI assertion (a side branch not on `main` gives exit 1), and my mutant is killed. |
| **R-5**: what lands on `main` must state the Owner's decision | **Accepted as text.** §6.7 "Order before the merge" puts it in my order. It is still **owed**, and it is a condition below. |
| **R-6**: branch slots make concurrent syncs non-mechanical | **Closed as information** in Q-025-6-2. This PR's own sync `ad42e510` is an instance of it (measured). |
| **R-7**: record placement | **Closed.** Each file was moved with `-x` provenance and a byte-identical blob (measured), which is what I asked for, not a hand copy. The same applies to **this** file: the task told me to write it under `evidence/WP-0A-A0-001/`, which `verify-branch-scope` refuses on #211. A0 should carry it the same way (`cherry-pick -x`, then `git mv` into `evidence/WP-0A-DB-00/`, blob unchanged) and cite it by its new path. |

**The plain `git commit` for `d12475a`** was not made through `commit-when-clean`. I measured A0's stated
reason: at `d12475a` the suite gives 715/717, and the two failures are exactly the handoff guard and its
ratchet. With a refreshed handoff on top, the suite gives 717/717. The departure is disclosed in the commit
message and in the closure note §3, and the refreshed head re-measures it. It is not a finding. The
refresh commit must go through `commit-when-clean`, or be checked with `npm run check` exit 0 on the
pushed head, which CI does.

## 3. New findings at this head

**R2-1 (advisory, for the Owner before Q-025-6-1; not blocking). The record gate checks a file's name,
not who wrote it.** Under §6.1 item 2, the Author can add `light-path-reading-*.md` (the reader's verdict
file name), or a `session-*.md` that carries a verdict. The Author can also append `verdict superseded` to
an existing `light-path-reading-*.md`. All of these classify as records (probes above). §6.2 relies on the
reader reading every added line, and that does catch a forgery made **before** the reading. Two gaps
remain:
- §6.2 does not say that the reading names the exact head it read.
- §6.2 does not say that any commit after the reading, other than the handoff refresh last and alone,
  needs a new reading.

§2 item 1's `--match-head-commit` pins the merge to a head, but not to the head that was read. I recommend
one sentence in §6.2: "The reading names the head it read. Any later commit other than the handoff
refresh voids it, and a `light-path-reading-*` file not committed by the reader run is a blocking
finding." Or A0 can put this to the Owner. This does not change my verdict.

**R2-2 (minor text; not blocking). §6.1's "wider in four places" omits one widening.** §5 item 1 excluded
"any other manifest field", and so excluded **new `open_blockers` entries**. §6.1 item 4 admits new
entries at the end, but the comparison paragraph names that only for `required_human_authorities`. A0
should add three words to item 4 of the list.

Neither finding is a security finding: each is a governance-text gap that the reader's duty already
partly covers. A1 may grade R2-1 differently, and if A1 does, A1's grade governs §6.2's merge condition.

## 4. Acknowledgements (as Integration Owner of WP-0A-A0-002 and WP-0A-CON-008), at `d12475a`

- `scripts/test-suite-contract.mjs` (A0-002): test floor 87; assertion floor 1320 → 1329, the guard's own
  count (717/717 with the refreshed handoff, so the floor guard passes); digest `d01d2282…`.
  **Acknowledged at `d12475a`.**
- `test-kits/integrity-manifest.json` (A0-002): regenerator output, `cmp`-clean at the head.
  **Acknowledged at `d12475a`.**
- `test-kits/branch-identity.test.mjs` (CON-008): only the two DB-00 slot lines differ from `main`, and
  #210's CON-004 line is present. **Acknowledged at `d12475a`.**
- `evidence/VERIFICATION.md` (CON-008): 717, and `record:verification` round-trips.
  **Acknowledged at `d12475a`.**

These acknowledgements carry to a later head when the only later changes are evidence files under
`evidence/WP-0A-DB-00/` (role files carried blob-identical), a records-only edit to
`work-packages/WP-0A-DB-00.json` that records the Owner's answers, the RFC status lines that record those
answers, and one handoff refresh last and alone. Any other change to these four files, or another merge
of `main`, requires a re-check (regenerate and `cmp`; both slots present).

## 5. Verdict

**Governance classification:** unchanged. This is a governance PR: it changes an RFC, so under §5 item 6
the **Owner merges it personally, never by delegation**. It is not records-only (exit 1, correct).

**`integration_verified` is NOT given at `d12475a`, but the integration content is correct.** Every
integration finding from my first review is closed (R-1, R-3, R-4, R-6, R-7) or accepted as an owed
step (R-5). The four amendments are acknowledged. The head contains current `main`. With a refreshed
handoff, the suite passes 717/717 and the handoff guard exits 0. What is missing is state, not content:
the refresh, CI, the other roles' re-checks and the Owner's answers.

- **Stop-the-line:** none. No secret, tenant, migration, data or contract risk. The PR changes no
  runtime path, and §6 is inert until the Owner approves it.
- **Blocks the merge:** yes, until all of the following hold, on this branch:
  1. **Handoff refresh, last and alone**, on the branch name: `npm run refresh:handoff`, then
     `npm run check:handoff` exit 0 and `npm run check` exit 0 (my throwaway refresh shows 717/717), made
     through `commit-when-clean`. Then **`bootstrap` green on that exact head**, and the head still
     contains `main`. If `main` moves, merge it again with the generators re-run and `cmp`-clean, and redo
     this step.
  2. **C0, A1 and Q0 re-check** the refreshed head. C0 records `review_approved` with F1–F5 closed. A1
     records `security_approved`, or `security_changes_requested` resolved, with **no security finding of
     any grade open**. A1-1 blocked the Owner's merge "until A1-1 is closed or accepted". Q0 records
     `test_verified` with Q1 and Q2 closed.
  3. **R-5: the Owner answers Q-025-6-1 to Q-025-6-5.** A0 records the answers on this branch (the
     disposition, the header line and the §6 `Status:` line, so that §6.4's "This PR is one" stays true).
     The roles re-read that commit under §5 item 2. **If the Owner refuses §6 (Q-025-6-1 = no), this PR
     does not merge as written:** the text must then record the refusal, or the PR is closed.
  4. After 3, a refresh of the handoff again, last and alone, and `bootstrap` green on that final head.
     My verdict carries to that head under the rule in §4. I need not run again unless something outside
     that rule changes.
  5. R2-1 and R2-2: A0 fixes them in text or puts them to the Owner before Q-025-6-1 is answered. I do not
     hold either as a condition.

### May `integration_verified` be recorded after the merge?

**For WP-0A-DB-00: no.** DB-00 is a long-running package in `in_progress` with 204 open blockers, and
this PR is one increment of it. Merging #211 does not make the package integration-verified, and A0 must
not move `work-packages/WP-0A-DB-00.json` `status` on the strength of this PR. What may be recorded after
the merge is that **the increment** is integrated. Once 1–4 hold and the Owner has merged #211, A0 records
it on my behalf in the next DB-00 records PR by appending to `open_blockers[203]`, with its index kept and
its old text whole at the start. The facts (merge commit, CI run, the Owner's answers) must be measured
from the merged PR.

**For WP-0A-A0-001**, the package named in this task: it is already `integration_verified` on `main`, and
this PR does not touch its manifest. Nothing is recorded there.

### Exact wording A0 appends to `open_blockers[203]` after the merge

> R0 re-check 2026-10-07 at d12475a (evidence/WP-0A-A0-001/r0-recheck-2026-10-07.md, carried to
> evidence/WP-0A-DB-00/ blob-identical): integration content correct; R-1, R-3, R-4, R-6, R-7 closed, R-5
> owed then done as recorded. Governance PR; the Owner merged it personally. With the handoff refreshed:
> 717/717, handoff guard 0; scope, identity, role separation 0; integrity manifest and VERIFICATION.md
> cmp-clean; §6.5 reproduced with the narrowed classifier (26/5, 50/48, four status moves); 11 of 11
> mutants killed. Amendments acknowledged by /claude/r0_steward at d12475a: test-suite-contract.mjs
> (87/1329, digest d01d2282), integrity-manifest.json, branch-identity.test.mjs (DB-00 and CON-004 slots),
> VERIFICATION.md (717). R2-1 (reading not pinned to its head; record names not authorship) and R2-2 (new
> open_blockers entries unnamed as a widening) advisory. The increment is integrated at merge <sha>, CI
> run <id>; WP-0A-DB-00's status is not moved by it. Stop-the-line: none.

`<sha>` and `<id>` are filled in from the merged PR. They are not mine to predict.

Attested by `/claude/r0_steward` against `d12475a70f6707d45c936098b1cab19562bfc6dd`.
