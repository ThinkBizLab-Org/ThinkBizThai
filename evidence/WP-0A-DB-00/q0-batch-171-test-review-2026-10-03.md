# Q0 independent test of batch 171 (PR #181)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-171`, head `d3ffe6a` (the handoff, last and alone), over the code
commit `d6fbf5f`, base `700715e` (`main`). **Author:** `/claude/a0_atlas`.
**PR:** https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/181 (Draft, OPEN, head `d3ffe6a`; check `bootstrap`, run
37240428675, **success** on `d3ffe6a`).
**Tested on:** my own branch `review/q0-batch-171`, created at `d3ffe6a`. The repository commands ran on the branch
NAME (§1.1).
**Date:** 2026-10-05. The file name carries the phase's date (2026-10-03), as the batch's other records do.

This file records findings. It advances no status, approves nothing, test-verifies nothing on anyone's behalf, and
decides nothing that the Integration Owner, A1 or the Product Owner holds. It repairs nothing.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and the same vendor and model family as the Author. A0's
workflow wrote my brief, chose the questions, the port and the output file, and A0 wrote the change under test. My
independence is the independence `RFC-2026-024` describes, and no more. Whether this record counts as the Tester role's
signature is for the Integration Owner and the Product Owner to decide, not me.

## 1. Measured versus read

**Setup for every measured run:** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`), printed before each run; the
PATH Node 26 was not used. PostgreSQL 17.11 from `/opt/homebrew/bin`. A fresh `initdb --locale=C -A trust -U postgres`
for every round, on 127.0.0.1:**5503** only, TCP only (`-c unix_socket_directories=''`), `LC_ALL=C`; the shim
`db/foundation/ci/supabase-shim.sql` first (exit 0 every round); `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`.
Private directory `scratchpad/q0-171/`. I touched no other port. Each cluster was stopped and its data directory
removed; at the end `pg_isready -h 127.0.0.1 -p 5503` printed "no response". Every drift appended to
`db/foundation/migrations/140_audit.sql` was restored from a private copy and checked with `cmp`; sha256
`2ac596bb950e8dfb…` before and after. Every in-code mutation of `171_workspace_lifecycle_visibility.sql` and
`scripts/db/run.mjs` was restored from a private copy and checked with `cmp` (sha256 `9473ff8c…` and `f0b11b98…`); the
temporary later file `db/foundation/migrations/172_q0_mutation.sql` was removed after every round. `git status
--porcelain` was empty before I wrote this file. Nothing was pushed.

**Measured:** the four repository commands on the branch name (§1.1); both database layers on an untouched tree, twice
(r1, r2); the four mutations the brief names, in seven variants, in three placements each (§2); A0's four drifts and
one of mine (§3); try-it's demo, its negative controls and its plan checker (§4); the §6/6 census and the sweep's
table list against the catalog (§5); the claims in §6.

**Read, not executed:** the EXPLAIN harness and its 0.066 ms sample (plan §4.3); the replay of CI's 56 per-family
negative-control entries (plan §0.2); 171 and 011 under a non-superuser migration owner (A0 says read, not measured;
so do I); the disposition's reading of the Owner's words.

### 1.1 Repository commands, on the branch NAME

The branch is checked out in A0's worktree (`wf_c2446fc0-562-1`). I ran
`git checkout --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-171` in my own worktree; `git branch
--show-current` printed that name and HEAD was `d3ffe6aa0a35d871281e6ca4bf7b31f63ec1c506`. I committed nothing there
and switched back to `review/q0-batch-171` before any database round and before writing this file.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 700715e WP-0A-DB-00` | 0 | "all 27 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |

### 1.2 Untouched rounds

| round | `migrate-clean` | `rls-smoke` |
|---|---|---|
| r1 | 0, "52 apply-time blocks, 38 re-run as written, 14 superseded and replaced" | 0, "1129 isolation case(s) passed"; "7 claim(s) discharged by execution" |
| r2 (fresh cluster) | 0, the same | 0, the same |

The lifecycle proof's transcript on r1: as `app_authz`, A reads 1 row in `active` and `closing` and 0 in each of the
six blocked states; baseline 4 businesses; (c) 4; case 7 0 and 0; access_blocked 0; case 8 4; case 11 0; (d) 42501.
This is plan §4.2 row for row.

## 2. The mutation table

Seven variants of the four mutations the brief names. Each is placed three ways:

- **in place**: applied as SQL to a freshly migrated cluster, then `make db-rls-smoke` (the case layer and the proof
  layer, with every static guard bypassed);
- **later file**: the same SQL as `172_q0_mutation.sql`, then `make db-migrate-clean` — first with run.mjs's pins as
  shipped, then with every pin the mutation moves **refreshed from the catalog** (the helper's body digest in
  `SECURITY_DEFINER_FUNCTIONS`, the `PERMISSIVE_POLICIES` deparses, `AUTHZ_WORKSPACES_POLICY_QUAL`), then `rls-smoke`
  when migrate-clean passed;
- **in code**: 171 itself edited, the same two attempts. When 171's own block refuses at apply time, the mutated
  objects never reach the catalog and nothing can be refreshed; the refusal is the verdict.

A control later file that changes nothing (`select 1;`) migrated with exit 0, so every refusal below is the
mutation's. The static suite (`npm run test:bootstrap`) was also run against every in-code variant with the pins as
shipped: **685 of 685 pass for all seven**, so the no-database layer holds none of these, by design (nothing in it
reads 171's text); everything below is held by a database layer.

| # | mutation | in place: cases / proofs | later file, pins as shipped | later file, pins refreshed | in code (171 edited) | verdict |
|---|---|---|---|---|---|---|
| M1a | helper's state conjunct dropped, join kept | 1129 pass / **proof fails** (case 11: 4; (d): no 42501) | security definer probe (body digest) | **post-migrate pass**: 171#1 "does not apply the admitted-state gate" | **171's block at apply**, same message | held (block, digest, proof); no case fails: app_authz's policy still filters the join |
| M1b | helper's join and conjunct dropped (011's body; digest `83e32b72…`, 011's pin) | **30 cases fail** / proof fails (case 7 ×2, gate, case 11, (d)) | security definer probe | post-migrate pass, same message | 171's block at apply, same | held at every layer |
| M2a | `access_blocked` admitted by the helper only | 1129 pass / **proof fails** (case 11: 4) | security definer probe | post-migrate pass, same message | 171's block at apply, same | held (block, digest, proof); no case fails: the policy still refuses the state |
| M2b | `access_blocked` admitted by the helper and by app_authz's policy | **15 cases fail** / proof fails (case 10, gate, case 11) | permissive policy probe and security definer probe | post-migrate pass: "the admitted lifecycle literal is not the same in app.workspaces' three gated policies" | 171's block at apply, same | held at every layer |
| M3a | app_authz's workspaces policy widened to `using (true)` | 1129 pass / proof fails (case 10 ×6) and authz catalog proof (pinned qual) | permissive policy probe | post-migrate pass, literal check | 171's block at apply, literal check | held (block, pins, proof); no case fails |
| M3b | app_authz's policy widened, the literal kept (`AND` → `OR`) | 1129 pass / proof fails (case 10 ×6) and authz catalog proof | permissive policy probe | **migrate-clean exit 0**; rls-smoke exit 2: 1129 pass, **only the lifecycle proof's case 10 fails** | block passes; probe as shipped; refreshed: **exit 0**, then the same proof failure | held by the pinned qual, and with that refreshed by the proof alone (Q0-171-3) |
| M4 | `workspace_settings_select_active_member` reverted to 010's text | **9 cases fail** / proofs 7 ok | permissive policy probe | post-migrate pass, §6/6: "…without the helper…: workspace_settings.workspace_settings_select_active_member" | 171's block at apply, same | held at every layer but the proofs, which do not read 010's residual |

**Do the new cases fail for the right reason?** Yes, measured. In every red in-place round each failing case is one
of batch 171's 42, at phase `assert` (never `before`, `owner-first`, `assume-identity` or `assume-witness`), with the
row count the mutation predicts: the owner's sweep 38 rows (39 tables less `app.workspaces`, which 010 still gates),
the editor's 35, the viewer's 34; the business read 4; the notification read 1 (the owner's own); the two INSERTs "1
row(s) came back. The operation was permitted."; the three no-effect writes "the write must affect no row". M4's nine
are exactly the cases that read `workspace_settings` (the six owner sweeps, the editor's and the viewer's, and the
settings read), and each says "1 row(s) were visible". No case older than 171 failed in any round.

**A0's revert claim, re-measured.** With 171 reverted in full in place (011's body, 010's five policies, no app_authz
policy or grant on `app.workspaces`; my `m0full.sql`, written from 010 and 011, not from A0's): **30 of the 42 fail**,
the same 30 IDs as M1b; the 12 that pass are the six own-row reads, the five positives and the stranger's oracle check.
This is plan §0.2's row and `open_blockers[53]`/`[95]`'s evidence, as written.

## 3. Drifts appended to `140_audit.sql`

Each on a fresh cluster, `140_audit.sql` restored and `cmp`-checked after each.

| drift | migrate-clean | refused by |
|---|---|---|
| d1, A0's: `probe_ungated` on `workspace_settings` joining membership directly | 2 | 171 (6): "…without the helper…: workspace_settings.probe_ungated" |
| d2, A0's: a ninth state `archived` in the CHECK | 2 | 171 (5): "the lifecycle states in workspaces_lifecycle_state_known are not exactly the classified ones" |
| d3, A0's: a third app_authz policy, `using (true)` on `workspace_settings` | 2 | 171 (1): "app_authz holds 3 policies in schema app; RFC-2026-027 gives it exactly two" |
| d4, A0's: `grant select (name) on app.workspaces to app_authz` | 2 | 171 (3): "column SELECT is not exactly the six columns" |
| q1, mine: the same ungated policy as d1, **named `workspaces_update_owner`** | 2 | **not 171's block** (it applied); the permissive policy probe and the policy set probe ("no pinned list names: app.workspace_settings.workspaces_update_owner") |

A0's four drifts reproduce on another port with the same messages. q1 is Q0-171-1.

## 4. try-it

`try-it.mjs up` picks a port in 55420-55479 and refuses 5503 (`RESERVED_PORTS`), and this run may use 5503 only, so I
did not run the tool's own `up`/`demo`. I replayed `demo()`'s loop (`scratchpad/q0-171/q0-demo.mjs`): the same
`DEMO_STEPS`, the same `demoPlanProblems` gate, `buildCases`, `runCases` and rls-smoke's `sessionDriver`, the same
per-step verdict, on r2's cluster after rls-smoke.

| run | result |
|---|---|
| untouched (r2) | **"All 15 steps behaved as expected."**, exit 0; step 14 0 rows, step 15 1 row |
| negative control: 171 reverted in place (`m0full`) | exit 1, "DEMO FAILED: 1 of 15 steps (14)": step 14 "38 row(s) were visible"; step 15 (the control) still as expected |
| negative control of the control: Q-027-1's `workspace_members_select_own_active` dropped (`mown`) | exit 1, steps 2, 3 and **15** NOT AS EXPECTED (15: "nothing was visible"); step 14 still as expected |
| plan checker, step 14's `expect` flipped to `rows` | refused: "expects rows and the suite's case expects no-rows" |
| plan checker, step 15's case renamed | refused: "the suite has no case …-x" |
| plan checker, step 15 removed | **accepted** (Q0-171-4) |

So step 7 fails when the gate is gone, its control fails when its own premise is gone, and the two fail independently.
`TRY-IT.md`'s "13 → 15 steps" and "1129 … 7 claims" are true as measured.

## 5. Census and sweep, against the catalog (r2)

- RFC-2026-027 §6/6: 91 permissive `authenticated` policies in `app`, **89** on workspace-scoped tables, **3** calling
  neither helper: `workspaces_select_active_member`, `workspaces_update_owner`, `workspace_members_select_own_active`.
  Plan §2's census is true.
- The client-readable workspace-scoped tables (a `workspace_id` column, or `app.workspaces`, with any SELECT for
  `authenticated`): **40**, and they are exactly `LIFECYCLE_MEMBER_FAMILY` — none missing, none extra. The only other
  client-readable relation outside system schemas is `app.user_profiles`, which is not workspace-scoped.
  `open_blockers[198]` (5)'s "39 of the 40" is true.

## 6. Findings

Grades: MEDIUM = a property the batch states as held is not held, measured; LOW = held, but a record or a guard says
more than is true, or a guard is narrower than its words; INFO = worth knowing, no change asked.

### Q0-171-1 (LOW) — 171's §6/6 check exempts by policy NAME alone, so a policy anywhere borrowing an exempt name escapes it

`db/foundation/migrations/171_workspace_lifecycle_visibility.sql:313` exempts
`p.polname not in ('workspace_members_select_own_active', 'workspaces_select_active_member', 'workspaces_update_owner')`
without the table. Drift q1 (§3) put an ungated membership join on `workspace_settings` under the name
`workspaces_update_owner`: 171's block applied it and the post-migrate pass would re-run it green. It was refused only
because it is unpinned (the permissive policy probe and the policy set probe); a later batch that pins its new policy,
as every batch must, removes that refusal, and §6/6 is then held by the rls-smoke sweep alone. The comment at :296-301
and plan §2 say the block exempts "the three policies of 010"; the code exempts three names. **Remedy:** key the
exemption on `(c.relname, p.polname)` pairs — `workspace_members.workspace_members_select_own_active`,
`workspaces.workspaces_select_active_member`, `workspaces.workspaces_update_owner` — in 171 before it is integrated
(it is not integrated, so it is still editable), and add q1 to the plan's drifts.

### Q0-171-2 (LOW) — two records name files the diff does not change

- `work-packages/WP-0A-DB-00.json:120` (the `amends_without_owning.rationale`): "audit-coverage-map.json and
  retention-map.json (every open_blockers line pin +1 …)". `retention-map.json` is not in `git diff 700715e..d3ffe6a`,
  and its `line` fields cite another document (§10 rows 488-490), not the manifest. Plan §0.1 says it correctly ("cites
  blockers by quotation, so none moves there").
- `db/foundation/migrations/171_workspace_lifecycle_visibility.sql:60` lists `db/foundation/lint/policy-set.json` as
  "PINNED IN THE SAME DIFF". It is not changed, and need not be: the new policy is pinned in run.mjs's
  `PERMISSIVE_POLICIES`, which the policy set probe already reads (the probe passed in r1 and r2).

**Remedy:** drop `retention-map.json` from the rationale's sentence and `policy-set.json` from 171's header (171 is
not integrated).

### Q0-171-3 (INFO) — four of the seven mutations pass all 1129 cases; the lifecycle proof is what holds them at run time

M1a, M2a, M3a and M3b leave every case green, because 171's two layers (the helper's conjunct and app_authz's
policy's conjunct) each hide the other's removal. They are held statically by 171's block and run.mjs's pins, and at
run time by `proveTheLifecycleGate` (`scripts/db/authz-proofs.mjs:542`). For M3b (`AND` widened to `OR`, literal
kept) with its pinned qual refreshed, **the proof's case 10 is the only guard left anywhere** (migrate-clean exit 0,
1129 cases pass). This is defence in depth working as RFC-2026-027 §7.2 designed it, not a gap: the proof runs inside
`make db-rls-smoke` on every CI run. No change asked; it is recorded so that nobody moves the proof out of the
rls-smoke path or treats it as optional.

### Q0-171-4 (INFO) — try-it's plan checker accepts the demo without step 7's control

`demoPlanProblems` (`scripts/db/try-it.mjs:237`) requires some step that expects rows, not the control beside step 14;
with step 15 deleted the plan is accepted (§4). The demo cannot pass vacuously anyway — step 14's case carries a
`before` read that fails the step if any of the 39 tables is empty in `active` — so the control is explanatory, not
load-bearing. No change asked.

## 7. Claims checked

True, measured or read against the files:

- Commit `d6fbf5f`'s body and plan §0.2: 52 blocks / 38 / 14 superseded; 1129 cases; 7 proofs; 30 of 42 red with 171
  reverted, the 12 passing being the positives, own-row reads and the stranger's check; the four drifts and their
  messages; the §6/6 census 89/3. All re-measured (§1.2, §2, §3, §5).
- `open_blockers[53]`: "owner-a-reads-no-business… (4 rows) and owner-a-cannot-create… (admitted)" — measured.
  `open_blockers[95]`: "fails with it reverted (1 row, the owner's own notification)" — measured.
- Blocker edits: `[53]`, `[95]`, `[194]`, `[195]` are strict extensions of their base text (4931→5938, 2232→2891,
  14080→14945, 35166→36565 characters); no other entry of the base's 198 changed; `[198]` is new and last (199 total).
- All 33 `open_blockers` line pins in `audit-coverage-map.json` point at a line of the manifest holding their quote and
  at the blocker with that index.
- `d3ffe6a`'s body: "700715e..d6fbf5f (5 added, 21 modified, 0 deleted)" — 26 paths, 5 of them new.
- Disposition §2 and the plan's header: #180 merged at head `61a01f6`, merge commit `700715e`, 2026-10-04T21:37:21Z;
  run 37235924563 "Bootstrap validation" success on `61a01f6` (`gh`). PR #181 is a Draft, OPEN, head `d3ffe6a`, check
  `bootstrap` success (run 37240428675).
- The Owner's words quoted in the disposition appear verbatim in
  `product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md:116-117`. Whether they delegate approval of two
  RFCs is the reading the disposition says it is; it is not mine to grade.
- RFC-2026-026 and RFC-2026-027 are in `writable_paths`; RFC-2026-020 is not, and is not edited.

Not checked: the EXPLAIN harness figures; the 56-entry CI negative-control replay.

## 8. Stop-the-line verdict

**No stop-the-line.** No secret, tenant leakage, duplicate side effect, lost job, migration divergence, irreversible
deletion or contract mismatch was found. Migration 171 is declared not applied to the provisioned instance. The gate
held against every mutation and drift I put to it, at least at one database layer, and the new cases fail for the
reason they name.

**Does anything block the merge?** Nothing in this record. Q0-171-1 and Q0-171-2 are LOW and are cheapest fixed now,
because 171 is not yet integrated and migration invariant 1 forbids editing it afterwards; whether they are fixed
before the merge or carried on `open_blockers[198]` is the Author's and the Integration Owner's call. The owed
named-role acceptances (`open_blockers[194]`, `[195]` (a)) and Integration Owner evidence (`[188]`) are governance
items this record does not judge.

## 9. Limits

- Same vendor and model family as the Author, briefed by the Author's workflow (§0).
- Every cluster was a superuser-owned throwaway PostgreSQL 17.11 with the shim, not Supabase; the connection role in the
  runner's `ownerFirst` and connection-role witness is `postgres`. Nothing here says how 171 or 011 apply under a
  non-superuser migration owner (`open_blockers[198]` (2)).
- try-it's demo was replayed through its exported pieces on port 5503, not through `try-it.mjs up`/`demo` on its own
  port range, so `up`, `down`, the password file and the printed output were not exercised.
- The mutation set is the brief's four ideas in seven variants; it is not exhaustive. "Pins refreshed" means the three
  run.mjs pins the mutation moves; the four probe digests in `foundation-contract.test.mjs` and the integrity manifest
  were not refreshed, because no in-code variant reached the static suite red (§2).
- Timing (the ratified p95) was not measured.
