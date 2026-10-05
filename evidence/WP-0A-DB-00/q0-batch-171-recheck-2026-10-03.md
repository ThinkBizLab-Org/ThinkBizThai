# Q0 independent test re-check of batch 171's review round (PR #181)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-171`, head `cf9d1de` (the handoff, last and alone), over the
review round's code commit `155412a`, base `700715e` (`main`). Previous reviewed head `d3ffe6a`. **Author:**
`/claude/a0_atlas`.
**PR:** https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/181 — Draft, OPEN, head `cf9d1de`. Check `bootstrap`
(run 37244108784) was **IN_PROGRESS** when last read (§7); this record does not report a CI result for `cf9d1de`.
**Tested on:** my own branch `recheck/q0-batch-171`, created at `cf9d1de`. The repository commands ran on the
branch NAME (§1.1).
**Date:** 2026-10-05. The file name carries the phase's date (2026-10-03), as the batch's other records do.

This file records findings. It advances no status, approves nothing, test-verifies nothing on anyone's behalf,
and decides nothing that the Integration Owner, A1 or the Product Owner holds. It repairs nothing. It is narrow:
my own findings of `q0-batch-171-test-review-2026-10-03.md` first, then what the review round changed.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and the same vendor and model family as the Author.
A0's workflow wrote my brief, chose the questions, the port and the output file, and A0 wrote the change under
test. My independence is the independence `RFC-2026-024` describes, and no more. Whether this record counts as
the Tester role's signature is the Integration Owner's and the Product Owner's act, not mine.

## 1. Measured versus read

**Setup for every measured run:** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin` first on PATH), printed
at the head of every round's log; the PATH Node 26 was not used. PostgreSQL 17.11 from `/opt/homebrew/bin`. A
fresh `initdb --locale=C -A trust -U postgres` for every round, on 127.0.0.1:**5503** only, TCP only
(`-c unix_socket_directories=''`), `LC_ALL=C`; the shim `db/foundation/ci/supabase-shim.sql` first;
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`. Private directory `scratchpad/q0-171r2/`. I touched
no other port. Every edit to a tracked file was restored from a private copy and checked with `cmp` after every
round and at the end; final sha256: `140_audit.sql` `2ac596bb…c1ad37149` (the same as A0's and my first record's),
`171_…sql` `769ebdc6…`, `run.mjs` `57dc082e…`, `authz-proofs.mjs` `a77b782e…`, `isolation-cases.mjs` `d7ee79a3…`;
the temporary `172_q0_mutation.sql` absent. At the end `pg_isready -h 127.0.0.1 -p 5503` printed "no response"
and the data directory was removed. `git status --porcelain` was empty before I wrote this file. Nothing pushed.

**Measured:** the three repository commands on the branch name (§1.1); both database layers on an untouched tree
twice (§1.2); the four mutations the brief names in nine variants, in place, in a later file and in code, pins
as shipped and refreshed (§2); two discriminating mutations against the round's code and against `d3ffe6a`'s
(§2.1); six drifts on the round's 171 and three on `d3ffe6a`'s (§3); the family census per identity and the
widened §6/6 census (§4); try-it's demo and its two negative controls (§5); the claims in §6.

**Read, not executed:** the EXPLAIN harness (unchanged by the round); 171 and 011 under a non-superuser migration
owner (still owed, `open_blockers[198]` (2)); the disposition's reading of the Owner's words, which is the
Owner's to confirm (`[195]` (e)); A0's own cluster cleanup on 5507 (another run's port; not probed).

### 1.1 Repository commands, on the branch NAME

The branch is checked out in A0's worktrees. I ran `git checkout --ignore-other-worktrees
agent/claude/WP-0A-DB-00-batch-171` in my worktree; `git branch --show-current` printed that name and HEAD was
`cf9d1de748879b7ce2375d7fd5c80f8a5a537ac1`. I committed nothing there and switched back to
`recheck/q0-batch-171` before any database round.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 700715e WP-0A-DB-00` | 0 | "all 30 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |

### 1.2 Untouched rounds

| round | `migrate-clean` | `rls-smoke` |
|---|---|---|
| r1 | 0, "52 apply-time blocks, 38 re-run as written, 14 superseded and replaced" | 0, "1129 isolation case(s) passed"; "7 claim(s) discharged by execution" |
| r2 (fresh cluster) | 0, the same | 0, the same |

r1's lifecycle proof prints, for each of `access_blocked, purge_queued, held, purging, verify, deleted`: gate 0,
case 8 4 (= baseline), case 11 0 (18 lines). The §6.1 proof prints both pinned expressions (app_authz's
membership qual and `workspaces_select_authz_own_open`'s). Plan §8.2's C0 L2 and C0 N2 rows are true.

## 2. The mutation table

Placement as in my first record: **in place** = SQL after a fresh migrate, then `rls-smoke` with every static
guard bypassed; **later file** = the SQL as `172_q0_mutation.sql`, migrate-clean with run.mjs's pins as shipped,
then with every pin the mutation moves refreshed from the catalog (the helper's body digest, the
`PERMISSIVE_POLICIES` deparses, `AUTHZ_WORKSPACES_POLICY_QUAL`) and `rls-smoke` after; **in code** = 171 edited,
the same two attempts (no refresh is possible when 171's own block refuses at apply). The control later file
(`select 1;`) migrated with exit 0. M2c and M2d are new in this re-check: they admit a blocked state **other
than** `access_blocked` (`held`), the state the round's C0 L2 widening reaches.

| # | mutation | in place: cases / proofs | later file, as shipped | later file, refreshed | in code (171 edited) |
|---|---|---|---|---|---|
| M1a | helper's state conjunct dropped, join kept | 1129 pass / proof fails: case 11 in every blocked state | security definer probe (body digest) | post-migrate pass, 171#1 "does not apply the admitted-state gate"; smoke: proof fails | 171's block at apply, same message |
| M1b | helper's join and conjunct dropped (011's body) | **30 fail** / proof fails (case 7, 8, 10, 11) | security definer probe | post-migrate pass, same; 30 fail | 171's block at apply |
| M2a | `access_blocked` admitted by the helper only | 1129 pass / proof fails: case 11 in `access_blocked` | security definer probe | post-migrate pass, same; proof fails | 171's block at apply |
| M2b | `access_blocked` admitted by helper and app_authz's policy | **15 fail** / proof fails (case 10, gate, case 11) and §6.1 pinned qual | permissive policy + security definer probes | post-migrate pass: "admitted lifecycle literal is not the same in app.workspaces' three gated policies"; 15 fail | 171's block at apply |
| **M2c** | `held` admitted by the helper only | 1129 pass / **proof fails: "case 11 … owner of a held workspace reads 4 row(s)"**, the only failure | security definer probe | post-migrate pass, 171#1; proof fails | 171's block at apply |
| **M2d** | `held` admitted by helper and policy | **3 fail** (owner's sweep in held, 38 rows; the helpers, 1; other member rows, 6) / proof fails (case 10, gate, case 11 in held) and pinned qual | permissive policy + security definer probes | post-migrate pass, literal check; 3 fail | 171's block at apply |
| M3a | app_authz's workspaces policy `using (true)` | 1129 pass / proof fails (case 10 ×6) and pinned qual | permissive policy probe | post-migrate pass, literal check; proof fails | 171's block at apply, literal check |
| M3b | app_authz's policy `AND` → `OR`, literal kept | 1129 pass / proof fails (case 10 ×6) and pinned qual | permissive policy probe | **migrate-clean exit 0**; smoke: 1129 pass, **only the lifecycle proof's case 10 fails** | block passes; probe as shipped; refreshed: exit 0, then the same proof failure |
| M4 | `workspace_settings_select_active_member` reverted to 010's text | **9 fail** / proofs 7 ok | permissive policy probe | post-migrate pass, §6/6: "…without the helper…: workspace_settings.workspace_settings_select_active_member"; 9 fail | 171's block at apply, same |

**Verdict per layer.** Every variant is refused by at least one database layer in every placement. 171's block
refuses all nine in code but M3b; run.mjs's pins refuse all nine as later files; with pins refreshed, the
post-migrate re-run of 171's block refuses eight of nine; M3b is then held by the lifecycle proof alone, as in my
first record (Q0-171-3, unchanged). The static suite holds none of these by design (nothing in it reads 171).

**Do the new cases fail for the right reason?** Yes, measured. In every red round each failing case is one of
batch 171's, at phase `assert`, with the row count the mutation predicts: owner's sweep 38 (39 tables less
`app.workspaces`), editor 35, viewer 34; business read 4; notification 1; the two INSERTs "1 row(s) came back.
The operation was permitted."; the no-effect writes "the write must affect no row". M2d's three are exactly the
three `held` cases; M4's nine are exactly those that read `workspace_settings`. No case older than 171 failed in
any gate mutation (M1–M4).

### 2.1 The round's two test changes, discriminated

Each mutation was run in place against the round's test code and against `d3ffe6a`'s, everything else equal.

| mutation | round's code (`155412a`) | `d3ffe6a`'s code | so |
|---|---|---|---|
| M2c (`held` admitted by the helper only) | rls-smoke **exit 2**: proof fails, case 11 in `held` | rls-smoke **exit 0** (`d3ffe6a`'s `authz-proofs.mjs`: case 11 in `access_blocked` only) | C0 L2's six-state widening holds a mutation the earlier proof did not |
| ML4 (a restrictive policy hiding notifications from editors: the editor's sweep gains an empty family in active) | **6 fail**: the five notification cases that read as the editor, and `editor-a-reads-no-row-of-any-family-…` at phase **`before`** ("1 row(s) were visible and none should have been … its verdict after the change would be vacuous") | **5 fail**: the same five; the editor's sweep **passes** (vacuously on notifications) | C0 L4's per-family before-read holds a vacuity the earlier before-read did not |

## 3. Drifts appended to `140_audit.sql`

Each on a fresh cluster; `140_audit.sql` restored and `cmp`-checked after each.

| drift | 171 at `155412a` | 171 at `d3ffe6a` |
|---|---|---|
| d1: `probe_ungated`, an ungated membership join on `workspace_settings` TO authenticated | exit 2, **171 (6)**: "…without the helper…: workspace_settings.probe_ungated" | (first record: 171 (6)) |
| q1: the same, named `workspaces_update_owner` (my Q0-171-1) | exit 2, **171 (6)**: "…: workspace_settings.workspaces_update_owner" | exit 2, but **171 applied**; refused only by the permissive policy and policy set probes |
| rpub: the same TO PUBLIC (no TO clause) | exit 2, **171 (6)**: "…: workspace_settings.q0_probe_public" | exit 2, 171 applied; pins only |
| ranon: the same TO anon | exit 2, **171 (6)**: "…: workspace_settings.q0_probe_anon" | exit 2, 171 applied; pins only |
| e1: `app.is_active_member(workspace_id) or <ungated join>` | exit 2, **171 applied**; permissive policy probe and policy set probe | — |
| e2: the ungated join TO `q0_client`, a new role granted to authenticated `with inherit true` | exit 2, **171 applied**; permissive policy probe, client membership probe ("authenticated -> q0_client") and pinned grant probe | — |

The round's 171 (6) now refuses what `d3ffe6a`'s let through (q1, rpub, ranon), so Q0-171-1 is **closed**,
measured. e1 is the stated limit `open_blockers[198]` (6) names, held as it says. e2 is not named there (§6,
Q0-171R-1).

## 4. Census and families (r2's cluster)

- Widened §6/6 census (permissive, `app`, TO authenticated, TO anon or TO PUBLIC): **91** client policies, **0**
  TO PUBLIC, **0** TO anon, **89** on workspace-scoped tables, **3** calling neither helper —
  `workspaces.workspaces_select_active_member`, `workspaces.workspaces_update_owner`,
  `workspace_members.workspace_members_select_own_active`, exactly the three `(table, name)` pairs 171 exempts.
  `authenticated` and `anon` are members of no role. Plan §8.2's census is true.
- Each identity's empty families of the 40 in active, read as that identity: owner 1 (`workspace_member_scopes`);
  editor 4 (`workspace_invitations, workspace_members, quota_buckets, billing_subscriptions`); viewer 5 (those and
  `notifications`). These equal `LIFECYCLE_EMPTY_IN_ACTIVE` (`tests/db/identity/isolation-cases.mjs:19652-19656`)
  set for set, so no non-empty family is excluded from the before-read. Plan §8.2's C0 L4 row and `[198]` (5)
  are true.

## 5. try-it

`try-it.mjs` is unchanged by the round. As in my first record its `up` refuses 5503, so I replayed `demo()`'s loop
(`q0-171r2/q0-demo.mjs`: `DEMO_STEPS`, `demoPlanProblems`, `buildCases`, `runCases`, rls-smoke's `sessionDriver`).

| run | result |
|---|---|
| untouched (r2) | **"All 15 steps behaved as expected."**, exit 0 |
| negative control: 171 reverted in place (`m0full`) | exit 1, "DEMO FAILED: 1 of 15 steps (14)": step 14 "38 row(s) were visible" |
| control of the control: Q-027-1's own-row policy dropped (`mown`) | exit 1, steps 2, 3 and 15 NOT AS EXPECTED; step 14 still as expected |

## 6. Findings

Grades: MEDIUM = a property the batch states as held is not held, measured; LOW = held, but a record or a guard
says more than is true, or a guard is narrower than its words; INFO = worth knowing, no change asked.

### My earlier findings

- **Q0-171-1 (LOW) — closed, measured.** 171 (6) keys the exemption on `(relname, polname)`
  (`171_workspace_lifecycle_visibility.sql:321-323`); q1 is refused by it (§3), and so are TO PUBLIC and TO anon.
  The comment and plan §3 now say what the code does.
- **Q0-171-2 (LOW) — closed, read.** 171's header no longer lists `policy-set.json` as pinned and says why
  (`:61-63`); the manifest's rationale no longer names `retention-map.json`. Neither path is in
  `git diff 700715e..cf9d1de`.
- **Q0-171-3 (INFO) — unchanged, re-measured.** M3b with its qual refreshed is held by the lifecycle proof's case
  10 alone. The proof must stay inside `make db-rls-smoke`.
- **Q0-171-4 (INFO) — unchanged.** try-it's plan checker still accepts the demo without step 15 (not re-run;
  `try-it.mjs` is untouched).

### New in this re-check

### Q0-171R-1 (LOW) — 171 (6)'s comment says it reaches every policy a client role reaches; a policy TO a role that authenticated inherits escapes it

`db/foundation/migrations/171_workspace_lifecycle_visibility.sql:299-300` says the block covers "Every permissive
policy a client role reaches -- TO authenticated, TO anon, or with no TO clause", and `open_blockers[198]` (6)
(`work-packages/WP-0A-DB-00.json:453`) lists two shapes the block still does not see. Drift e2 (§3) is a third:
the ungated join TO a role `authenticated` is granted `with inherit true`. 171 applied it. It was refused by the
permissive policy probe, the **client membership probe** and the pinned grant probe — and the membership is
refused whatever the policy says, so nothing is open today. The guard is narrower than its words.
**Remedy:** either say "TO authenticated, TO anon or TO PUBLIC" without "every policy a client role reaches" in
171's comment (171 is not integrated), or add "a policy TO a role a client role is a member of (held by the
client membership probe)" to `[198]` (6). No code change asked.

### Q0-171R-2 (INFO) — a failing per-family before-read does not name the family

When ML4 emptied the editor's notifications, `editor-a-reads-no-row-of-any-family-…` failed at `before` with "1
row(s) were visible and none should have been"; the row it saw is the family's name, but the runner prints only
the count (`tests/db/identity/run-isolation.mjs:370`). A reader has to re-run the query to learn which family.
Accurate and fails for the right reason; no change asked.

### Claims checked against the round

True, measured or read:

- Commit `155412a`'s body and plan §8.3: migrate-clean and rls-smoke green twice, 1129 cases, 7 proofs; four
  drifts each refused by 171 (6) (I reproduced all four: d1, q1, rpub, ranon); `140_audit.sql` restored with sha256
  `2ac596bb…c1ad37149`; 685 tests; 30 paths (§1, §3).
- Plan §8.1: the three cherry-picks carry `-x` lines naming `b450465`, `ff844b4`, `4271532`, and each review
  record is byte-identical to its source commit's (`git diff --quiet`).
- Plan §8.2, every "measured" cell: six-state gate/case 8/case 11 (§1.2); the families (§4); both pinned
  expressions printed (§1.2); the census (§4). Every "read" cell: `131` has 0 helper calls, `130` has 6 (C0 N4);
  ERD:282 reads "`170` | A1 Security | … | A0 manifest only" (C0 L6); the static-rule disposition's lines 19-21
  say A0 "recommended nothing on its item 3 (the SLO …)" and line 44 "Not item 3" (C0 M1).
- Plan §8.3: "no `open_blockers` line moves" — every manifest hunk in `d3ffe6a..155412a` has equal old and new
  line counts; `npm run verify` (685, which runs the coverage map's line pins) passed.
- The RFC Status lines, RFC-2026-027's Author line and `Revised:` lines, disposition §1/§3/§4/§5, `[53]`, `[95]`,
  `[195]` (a)/(e) and `[198]` (5)-(8) say what A0's "done" list says they say (word diff read).
- `cf9d1de` changes only `handoffs/WP-0A-DB-00-author-handoff.json`, cites `155412a` as `head_revision`, and
  `check:handoff` passes on the branch name.

Not judged: whether the Owner's words reach D1-D3 (A0 now records that as its reading, owed on `[195]` (e)).

## 7. Stop-the-line verdict

**No stop-the-line.** No secret, tenant leakage, duplicate side effect, lost job, migration divergence,
irreversible deletion or contract mismatch was found. 171 is not applied to the provisioned instance. Every
mutation and drift I put to the round's tree was refused by at least one database layer, and the new and widened
tests fail for the reason they name — including two mutations (M2c, ML4) that the previous head's tests let
through.

**Does anything block the merge?** Nothing in this record. Q0-171R-1 is LOW and a wording fix. What remains is
outside the Tester's lane: CI on `cf9d1de` was **IN_PROGRESS** (run 37244108784) when I last read it, and a green
required run on the head is a precondition for merge under `RFC-2026-002`; the C0 and A1 re-checks of this round;
the owed named-role acceptances (`[194]`, `[195]` (a)) and the Owner's confirmation (`[195]` (e)); Integration
Owner evidence (`[188]`). Those are not mine to judge.

## 8. Limits

- Same vendor and model family as the Author, briefed by the Author's workflow (§0).
- Every cluster was a superuser-owned throwaway PostgreSQL 17.11 with the shim, not Supabase; nothing here says
  how 171 or 011 apply under a non-superuser migration owner (`[198]` (2)).
- try-it's demo was replayed through its exported pieces on 5503, not through `try-it.mjs up`/`demo`.
- The mutation set is the brief's four ideas in nine variants plus ML4; it is not exhaustive. "Refreshed" means the
  three run.mjs pins a mutation moves; the integrity manifest and `foundation-contract.test.mjs`'s probe digests
  were not refreshed, because nothing static reads 171.
- Cases 8 and 11 still read `business_profiles` only (`[198]` (7)); I did not test a mutation that opens a
  blocked state for one other family only.
- Timing (the ratified p95) was not measured.
