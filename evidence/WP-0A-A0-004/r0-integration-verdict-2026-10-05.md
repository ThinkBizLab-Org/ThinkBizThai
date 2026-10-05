# R0 integration verdict: WP-0A-A0-004 at PR #189 head `acbcee1`

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/189 (Draft), branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, head `acbcee1ca3cc7c894eb0c7b97cde23fd4189e25d`,
base `main @ 8c089cc0bf30a234efa61752c6054d670f85a2a8`, package `WP-0A-A0-004`.
Run: `/claude/r0_steward`. Two capacities, kept apart below:

- this package's Integration Owner (`role_assignments.integration_owner_agent_run_id`), §1-§6;
- successor acknowledger to `/root/r0_steward` for `WP-0A-A0-001.json` `ownership.amended_by[2]` (step 2
  item 2, `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` §3 row 2), §7.

Measured 2026-10-05 19:00-19:10 UTC (2026-10-06 Bangkok). The file name keeps the date the brief gave.

## 0. What I am

I am a subagent spawned by a workflow script of `/claude/a0_atlas`, the Author of this package, acting as the
Integration Owner run `/claude/r0_steward`. RFC-2026-024 §3/3-4 requires this disclosure. I share a vendor
(Anthropic), a model family and a parent with the Author, and the Author's workflow wrote my brief, including
its one-line summaries of the C0, A1 and Q0 verdicts. I treated those summaries as claims and read each role
file in full at its commit (`d028755`, `4adfe7c`, `0060adf`). I wrote none of the PR's content and I fix
nothing. This file is not a merge authorisation, not a G0 signature, and it moves no package status in any
manifest. A same-vendor signature does not pass Gate G0's external verification (RFC-2026-024 §3/5).

## 1. Verdict

**`integration_verified`: CONDITIONAL. Not yet met at `acbcee1`.** The package's substance integrates: the
head contains `main`, nothing protected changed, the guard the package delivers works, and A1 and Q0 do not
block. It reaches `integration_verified` when conditions **R1-R6** in §5 are all true on one final head. Two
of them (R1, R2) are wording fixes to the package's own manifest that its role runs asked for; the rest are
mechanical.

- Stop-the-line: **none**.
- Blocks the merge as of `acbcee1`: **yes**, until R1-R6 hold. After that, nothing from R0 blocks it.
- Governance PR (RFC-2026-025 §5 item 6): **no**. The diff touches no RFC, `CONTRIBUTING_AGENTS.md`, CI file or
  gate. The standing delegation can apply once R1-R6 hold.
- Record-only (RFC-2026-025 §5 item 1): **no**. It rewords and removes open blockers and changes other
  manifest fields, so the role runs were required. They have run.

## 2. The four integration tests

| # | Test | Result | How |
|---|---|---|---|
| T1 | Head contains `main` | **Yes** | `git merge-base --is-ancestor origin/main acbcee1` exit 0, with `origin/main` = `8c089cc` freshly fetched. `git log origin/main..acbcee1` = `b0c5f4a`, `40bfc8d`, `acbcee1`. |
| T2 | Every role verdict non-blocking | **No, one condition open** | C0 `approved_with_conditions`, blocks = true (F1). A1 no objection, blocks = false, but F2 is a security finding against the PR (§4). Q0 `test_verified`, blocks = false. |
| T3 | Every gate in the manifest satisfied | **Not yet** | See §3. |
| T4 | Nothing protected changed | **Yes** | `git diff --name-only 8c089cc acbcee1` = four paths: `work-packages/WP-0A-A0-004.json`, `evidence/WP-0A-A0-004/author-self-check.md`, `evidence/WP-0A-A0-004/author-step2-and-retest-2026-10-06.md`, `handoffs/WP-0A-A0-004-author-handoff.json`. `git diff --quiet 8c089cc acbcee1 -- .github package.json package-lock.json .node-version scripts test-kits contract-catalog CONTRIBUTING_AGENTS.md AGENTS.md CLAUDE.md docs architecture .agents db migrations` exit 0. |

### 2.1 What I measured myself

Node `v24.20.0`, npm `11.19.0`. A private clone in my scratchpad, checked out **by branch name**
(`git branch --show-current` = the package branch, HEAD = `acbcee1`), `npm ci --ignore-scripts` exit 0. No
database was used.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-test-coverage-floor.mjs` | 0 | silent |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | silent |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-004.json` | 0 | |
| `node scripts/validate-work-packages.mjs` | 0 | |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-004-ci-independent-guard-step` | 0 | `WP-0A-A0-004` |
| `node scripts/verify-branch-identity.mjs agent/claude/nothing-here` | 75 | unclaimed branch refused |
| `node scripts/verify-branch-scope.mjs 8c089cc… WP-0A-A0-004` | 0 | `all 4 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` | 0 | `describes the branch: nothing substantive after its cited head` |

I did **not** re-run `npm run check` (about 12 minutes). C0, A1 and Q0 each ran it on the branch name at
`acbcee1` and each recorded `tests 692 / pass 692 / fail 0 / skipped 0 / todo 0`. Three independent green
runs on an unchanged executable tree (T4) are enough for integration; CI on the final head is R5.

I did **not** repeat the neutered-`scripts.check` sandbox. C0, A1 and Q0 each reproduced it independently
(guard step exit 81 on both the trailing `&` and the `||` forms, with digests regenerated), and this PR
touches neither `ci.yml` nor the guard.

**CI, read-only** (`gh run view 37358669435`, 19:06 UTC): head `acbcee1`, `in_progress`. Every step through
`Database foundation` is `success`, including `Verify test-integrity guard`, `Validate repository bootstrap`
and `Verify branch scope`. `Negative control` was still running. **Not green as measured.** The final head
will differ from `acbcee1` anyway (R3, R4), so R5 applies to that head.

`gh pr view 189`: OPEN, Draft, `mergeStateStatus: BLOCKED`.

## 3. Gates (`review_and_test_gates`) and required authorities

| Gate / authority | State at `acbcee1` | Evidence |
|---|---|---|
| `author_complete` | Met | `handoffs/WP-0A-A0-004-author-handoff.json`, `final_status: author_complete`, cites head `40bfc8d`; `check:handoff` exit 0. |
| `review_approved` | **Conditional** | C0 `d028755`: approved with condition F1. Met when R1 is fixed and C0 re-checks it (RFC-2026-025 §5 item 2: fix commits are re-verified by the run whose finding they answer). |
| `security_approved` | Given, with one carve-out | A1 `4adfe7c`: no objection on security/privacy grounds. Its F2 is a security finding against this PR, so RFC-2026-025 §5 item 6 bars a delegated merge while it is open (§4, R2). |
| `test_verified` | Met | Q0 `0060adf`: `test_verified`; Q1-Q6 are Info. |
| `integration_verified` | This file: conditional on R1-R6 | |
| Product reviewer | Not required | `product_reviewer_note`; step 2 item 3; `review_and_test_gates` has no product step. |
| RFC-2026-007 Owner disposition | Given | `RFC-2026-007…md:3` "Approved 2026-09-02"; commit `82aae60`. The PR's correction from RFC-2026-003 to RFC-2026-007 is right (C0 §3, Q0 M5, A1 §3.2; I read `RFC-2026-007:3` and `:66-72` myself). |
| `WP-0A-A0-001` `amended_by[2]` acknowledgement | **Given in §7 of this file** | The field in `WP-0A-A0-001.json` still reads `pending`; that file is outside this branch's scope (§7.3). |

Acceptance criteria 1-5: met, measured by Q0 (M2, M3) and C0, and I re-measured the ownership validator and
the floor guard. Criterion 6: **I accept the Author's in-place annotation** (C0 F4 left this to the Integration
Owner). The wording ("deriving the work-package id from the branch name and skipping cleanly") describes the
mechanism before `8df0f4c`; the workflow now resolves the branch through its manifest and refuses an
unclaimed branch unless it is a disposition branch, which is stricter. I measured exit 75 on an unclaimed
name. The criterion's purpose (the branch-scope guard runs on every pull request) is met. Rewriting the
criterion's text is not required for integration; if the Author rewrites it later, that is a manifest change
with its own review.

## 4. Role findings, as the Integration Owner reads them

| Finding | Grade | R0 reading |
|---|---|---|
| C0 F1: "WP-0A-A0-004 is one of those 15" stated as the Owner's, but disposition §3 row 1 says the 15 are A0's mapping | Minor | **Condition R1.** I read disposition §3 row 1 and §1.1-§1.2: the message the Owner answered named no package ids. C0's wording fix is right and does not change the field's value. |
| A1 F2: `amends_without_owning.rationale` and `recorded_on` say the `a5c33fd` amendment's record "stays on WP-0A-A0-001.json, WP-0A-CON-008.json and WP-0A-A0-002.json" | LOW (security) | **Condition R2.** I re-measured: `grep -c A0-004` on `WP-0A-CON-008.json` and `WP-0A-A0-002.json` = 0, and the only `A0-004` entry on `WP-0A-A0-001.json` is `amended_by[2]`, the `ci.yml` transfer. `git log -S'WP-0A-A0-004'` on the three files shows the entries added and later removed. The claim is false, and this PR rewrote that rationale, so it restates the claim. A1 did not make it a condition of its own verdict, but RFC-2026-025 §5 item 6 bars a delegated merge while **any** security finding of any grade is open against the PR. Fixing it costs one sentence in the same edit as R1. |
| A1 F1: `ci.yml:54` checks out `head_ref` and never asserts HEAD = `pull_request.head.sha` | LOW (security) | **Not a condition of this PR.** The PR does not touch `ci.yml`, and the finding pre-dates it on `main`. That reading follows the R4 precedent in `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` §8: a pre-existing item is not a finding against a PR that does not touch it. It is against **this package's** deliverable, though (`ci.yml` is in its `writable_paths`), so it must not live only in A1's file. Owed by the Author, recommended in the same edit: one `open_blockers` line naming it. A fix to `ci.yml` is a CI change, so it would be a governance PR, merged by the Owner personally (RFC-2026-025 §5 item 6). |
| C0 F2 / Q4: the direct-push blocker says "inferred, not measured", but `evidence/g0-tracker-th.md:28` records a measured GH006 refusal | Info | Optional. I read `:28`; it does record a direct push to `main` refused. Citing it would be more accurate. |
| A1 F3: protection read omits `checks[0].app_id: 15368` and `required_conversation_resolution` | Info | Optional. |
| C0 F3: blockers removed rather than closed in place with `Text as recorded:` | Info | Accepted as is. No rule requires the form; nothing cites the indices; git and the Author's evidence §2-§4 keep the originals. |
| C0 F4: criterion 6 annotated | Info | Accepted (§3). |
| C0 F5 / Q3: role files land after the handoff commit | Info | **Condition R4.** |
| Q2: CI not green on `acbcee1` | Info | **Condition R5.** |
| Q5: the handoff's branch-scope test entry records the before state (exit 74) only | Info | Recommended: the refreshed handoff (R4) records the exit 0 measured at the head. |
| Q6: `amended_by[2]` acknowledgement pending | Info | Given in §7. Not a condition of this PR's merge. |

## 5. What A0 must do before merge

All of R1-R6 must be true on **one** final head. Order matters: fixes first, then the role re-checks, then
the role files, then the handoff, then CI.

- **R1 (C0 F1).** In `independence.cross_vendor_exception`, attribute the 15-package list to A0's mapping, for
  example "and, by A0's mapping in that disposition's §3 row 1, WP-0A-A0-004 is one of those 15". Mark the
  quoted item as the record's translation of A0's Thai message. The field's meaning does not change.
- **R2 (A1 F2).** In `ownership.amends_without_owning`, state what is true: the five-path amendment of
  `a5c33fd` is recorded in git history only, and no owner manifest records it. Either empty `recorded_on`, or
  have the owners record it in their own manifests by their own branches. The guard reads only `paths` and
  `rationale` (A1 F2), so this is a wording change.
- **R3 (re-verification).** C0 re-checks R1 and A1 re-checks R2, each touching only its finding's scope
  (RFC-2026-025 §5 item 2). Each re-check is a role file on the branch. If the fix commit touches anything
  beyond those two fields, every required role run re-verifies instead.
- **R4 (role files and handoff).** Cherry-pick onto the PR branch the role files `d028755` (C0),
  `4adfe7c` (A1), `0060adf` (Q0), this file, and the R3 re-checks. All are under `evidence/WP-0A-A0-004/**`,
  inside `writable_paths`. Then run `npm run refresh:handoff`, so the handoff is the last commit and touches
  only itself (RFC-2026-025 §2 item 1).
- **R5 (CI).** The required check `bootstrap` is green on that final head, including `Negative control`, and
  the head still contains the current `main` (rebase and re-run R4 if `main` moves).
- **R6 (merge mechanics).** Take the PR out of Draft. Merge with a merge commit pinned to the final head
  (`--match-head-commit`), no squash, rebase or force. The next state record quotes the Owner's delegation
  words verbatim and names who pressed the button. A stop-the-line finding at any point revokes the
  delegation and returns the PR to the Owner.

Recommended in the same edit as R1-R2, not conditions: record A1 F1 as an `open_blockers` line; cite
`g0-tracker-th.md:28` in the direct-push note (C0 F2/Q4); add the `app_id` and conversation-resolution
settings to the protection blocker (A1 F3); update `required_human_authorities[1]` and `open_blockers[3]` to
cite §7 of this file as the acknowledgement, while saying that the field in `WP-0A-A0-001.json` still reads
`pending` until that package's owner records it.

**I do not re-run.** If R1-R3 change only the two named fields and the commits after them are role files and
the handoff, this verdict applies to the final head without a new R0 run: R0's tests T1, T3 and T4 are
mechanical (head contains `main`, CI green, `git diff --quiet` on the protected paths quiet), and R5 covers
them. If anything else changes, R0 re-runs.

## 6. Package state after the merge

When R1-R6 hold and the PR merges, `WP-0A-A0-004` may be recorded `integration_verified` citing this file.
The status field is the Author's to write, in a later record, not mine. It is **not** `done` and not G0. The
open blockers stay true after the merge: the guard is not unbypassable by someone who edits `ci.yml`; the
digest class is open; G0's external verification is not something an agent run can give.

## 7. Acknowledgement of `WP-0A-A0-001.json` `ownership.amended_by[2]` (second capacity)

### 7.1 What is being acknowledged

> `{"work_package_id": "WP-0A-A0-004", "decision_record": "architecture/decisions/RFC-2026-007-ci-independent-guard-step.md", "change": ".github/workflows/ci.yml was removed from writable_paths and outputs.files and transferred to WP-0A-A0-004, so the workflow can invoke the test-integrity guard as its own step. No status, role, gate or delivered output of this package changed.", "acknowledgement_required_from": "/root/r0_steward", "acknowledgement_status": "pending"}`

The brief also asked about a "job-reference change". There is none for this package. The `ctr-job-001`
acknowledgements (`contract-catalog/shared-kernel/ctr-job-001/schema.json:110,117`) are WP-0A-CON-001's and
do not name WP-0A-A0-004 (`grep -rn A0-004 contract-catalog` returns nothing). `amended_by[2]` is the only
acknowledgement this package owes. I do not act on `amended_by[0]`, `[1]` or `[3]` here.

### 7.2 Is it sound? Checked against the tree

| Claim in the entry | Check | Result |
|---|---|---|
| Authority is RFC-2026-007, and it is approved | `RFC-2026-007:3` "Approved 2026-09-02 by the Product Owner"; `:66-72` (Ownership transfer) names exactly this change and an acknowledgement pending from `/root/r0_steward`; commit `82aae60` | **Sound** |
| Only `writable_paths` and `outputs.files` lost `ci.yml` | `git show 3737893 -- work-packages/WP-0A-A0-001.json`: two deleted lines, `.github/workflows/ci.yml` in each list, nothing else. `072df92` reshaped `amended_by` into an array and added this entry; it did not touch status, roles, gates or outputs. | **Sound** |
| `ci.yml` now has one owner, WP-0A-A0-004 | `validate-work-package-ownership.mjs work-packages` exit 0 (my run). Q0 M3 and C0 §2 each parsed every manifest: only `WP-0A-A0-004.json` lists `ci.yml` in `writable_paths` or `outputs.files`. | **Sound** |
| No status, role, gate or delivered output of WP-0A-A0-001 changed | `WP-0A-A0-001.json` `status` is `integration_verified` at `8c089cc`. The file `ci.yml` still exists and still delivers WP-0A-A0-001's purpose (protected CI runs `npm run check`). Only its owner changed. | **Sound** |
| The transfer went the way `CONTRIBUTING_AGENTS.md` requires for protected CI | CI configuration is protected and goes through the Integration Owner/RFC path (`CONTRIBUTING_AGENTS.md` "Ownership and change control"). RFC-2026-007 is that path, approved by the Owner, and this acknowledgement is its Integration Owner leg. | **Sound** |

### 7.3 Acknowledgement

**Acknowledged.** As `/claude/r0_steward`, successor to `/root/r0_steward` for this acknowledgement by the
Product Owner's confirmed step 2 item 2, I acknowledge the amendment recorded at `WP-0A-A0-001.json`
`ownership.amended_by[2]`: `.github/workflows/ci.yml` transfers from WP-0A-A0-001 to WP-0A-A0-004 under
RFC-2026-007, and WP-0A-A0-001's status, roles, gates and other delivered outputs are unchanged.

Where it is recorded, and what stays owed:

- This file is the acknowledgement's evidence. It acknowledges `amended_by[2]` only.
- The field `acknowledgement_status` in `WP-0A-A0-001.json` still reads `pending`, and
  `acknowledgement_required_from` still reads `/root/r0_steward`. That file is outside this branch's
  `writable_paths`: `verify-branch-scope.mjs` would refuse it on this branch, and a declared amendment for it
  would make this PR need one. Flipping the field to `acknowledged`, and citing this file and its merged
  commit, is owed **on a WP-0A-A0-001 branch**, by that package's owner. That is record work on
  WP-0A-A0-001; it is not a condition of PR #189's merge or of this package's integration.
- The acknowledgement covers the transfer as recorded. It says nothing about later edits to `ci.yml` (for
  example `086921a`, `8df0f4c`), which went through this package's own reviews.
