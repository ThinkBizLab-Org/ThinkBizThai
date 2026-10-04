# Q0 independent test of batch 170 (PR #175)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-170`, head `ff13faf` (the handoff, alone and last) over the plan and disposition
`e7f9c2c` and the code `03dbd30`, base `9a07459` (main; `origin/main` is still `9a07459` and the head contains it).
Author `/claude/a0_atlas`. PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/175>: Draft and OPEN, head
`ff13faf`, MERGEABLE, required check "bootstrap" run 37178438714 SUCCESS (read with `gh pr view 175`).
**Tested on:** my own branch `review/q0-batch-170`, created at `ff13faf`. **Date:** 2026-10-04. The file name
carries the phase's date (2026-10-03), as the batch's own plan and disposition do.

This record holds findings. It advances no status. It approves nothing, test-verifies nothing on anyone's
behalf, and decides nothing that the Integration Owner or the Product Owner holds.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and I am the same vendor and model family. My
independence from the Author is the independence RFC-2026-024 describes, and no more. Accepting this record as
the Tester role's signature is the Integration Owner's act and the Product Owner's act, not mine.

I fixed nothing. Every mutation below was made in my own worktree; before it I saved the file it touched to the
private directory, and afterwards I restored it from that copy or with `git checkout --`. A temporary
`171_q0_mutation.sql` was created for M1-M3 and deleted after them. `140_audit.sql` was compared by sha256 before
and after every drift round (`2ac596bb950e8dfb…`, equal every time). `git status` was clean before this file was
written. Nothing was pushed.

## 1. Measured versus read

**Setup for every measured run:** Node `v24.20.0` from `/Users/bank/.local/node-v24.20.0/bin` (checked with
`node -v` before each run, every script prints it; the PATH Node 26 was not used). PostgreSQL 17.11 from
`/opt/homebrew/bin`. A fresh `initdb --locale=C -A trust -U postgres` for each round, on 127.0.0.1:**5503** only,
TCP only (`-c unix_socket_directories=''`), `LC_ALL=C`. The shim `db/foundation/ci/supabase-shim.sql` first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean` and `make db-rls-smoke`. Private
directory `scratchpad/q0-170/`. I touched no other port. The cluster is stopped and its data directory removed;
5503 is free.

### 1.1 Repository commands, on the branch NAME

The branch is checked out in A0's worktree, so I checked out the name `agent/claude/WP-0A-DB-00-batch-170` in my
own worktree with `git checkout --ignore-other-worktrees`. `git rev-parse --abbrev-ref HEAD` printed that name and
HEAD was `ff13fafe0714699da3eb2b173b89a0ce4480e6e3`. I committed nothing there and switched back to
`review/q0-batch-170` at the same commit.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 9a07459 WP-0A-DB-00` | 0 | "all 14 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |
| `verify-branch-scope.mjs 9a07459 WP-0A-DB-00` at `03dbd30` (detached, scope only) | 0 | "all 11 changed path(s) are declared" -- the plan's §0.1 figure |

### 1.2 The database layers on the head as built

| Round | Head | Command | Exit | Output |
|---|---|---|---|---|
| r1 | `ff13faf` | `make db-migrate-clean` | 0 | "applied 170_workspace_lifecycle_not_client_writable.sql"; pinned grant probe "43 table-level and 1327 column-level grants"; "post-migrate pass: 51 apply-time blocks, 39 re-run as written, 12 superseded and replaced" |
| r1 | | `make db-rls-smoke`, twice, same database | 0, 0 | "1087 isolation case(s) passed"; "db-authz-proofs: ok — 6 claim(s)" |
| main | `9a07459` (detached, then back) | migrate-clean, rls-smoke | 0, 0 | "1079 isolation case(s) passed" |
| main | | `lifecycle-forms.sql` | 0 | **48 of 72 admitted** (table below) |
| r2 | `ff13faf` | migrate-clean, rls-smoke, `lifecycle-forms.sql` | 0, 0, 0 | 1087 cases; **0 of 72 admitted, 72 refused** `42501 permission denied for table workspaces` |

`lifecycle-forms.sql` is A0's script text (`a0-170r/lifecycle-forms.sql`), which I read in full and copied
unchanged into my directory before running it: one transaction rolled back, synthetic ids, the owner O of W1
(`active`) and W2 (`closing`), an editor of W3; P owns W3 and W4.

| form | main `9a07459`: admitted / 42501 | head: admitted / 42501 |
|---|---|---|
| `where id = W1`, `returning id`, `case` in SET, PostgREST CTE `where id` | 2 / 6 each (`active`, `closing` admitted; the six others "new row violates row-level security policy") | 0 / 8 each |
| no WHERE, `where true`, `returning 1`, PostgREST CTE no filter, the column alone | **8 / 0 each**, rows=2, W1 and W2 moved, W3 and W4 untouched (e.g. `where_true` to `deleted`: `W1=deleted,W2=deleted,W3=active,W4=active`) | 0 / 8 each |
| the owner's four rename / `updated_by` forms | 1 row each | 1 row each |

Who can write the column on the head (`has_column_privilege`, my own read `q-extra.sql`): among non-superuser
roles only `app_worker` (UPDATE and INSERT; `rolcanlogin` f, `rolbypassrls` f; its only member `postgres`). The
column ACL is `{authenticated=r/postgres}`; the table ACL `{postgres=arwdDxtm/postgres,app_worker=arw/postgres}`.
On main, anon and PUBLIC held neither UPDATE nor INSERT on the column (A0's "measured" claim, TRUE). **No function
in `app`, `private` or `public` mentions `lifecycle_state` at all** (0 rows), and the only trigger on
`app.workspaces` is `set_updated_at` -- so "nothing on a request path writes `lifecycle_state` now" is TRUE as
measured. The applied column comment is 170's text.

### 1.3 Do the new cases fail for the right reason?

I ran only the eight batch-170 cases through the repository's own runner (`runCases`, `sessionDriver`, the same
fixtures) and logged the raw database message of each case statement (`probe-cases.mjs`).

| case | head: raw / verdict | pre-170 column grant restored by hand: raw / verdict |
|---|---|---|
| `…-to-closing-by-id` | `42501 permission denied for table workspaces` / PASS | rows=1 / FAIL "1 row(s) came back. The operation was permitted." |
| `…-to-access-blocked-by-id` | 42501 permission denied / PASS | `42501 new row violates row-level security policy for table "workspaces"` / FAIL "declares it is refused by the grant layer and the database refused it at the policy layer" |
| `…-with-no-where` | 42501 permission denied / PASS | rows=0 / FAIL "zero rows rather than refusing" |
| `…-where-true` | 42501 permission denied / PASS | rows=0 / FAIL "zero rows rather than refusing" |
| `…-returning-a-constant` | 42501 permission denied / PASS | rows=1 / FAIL "permitted" |
| `…-to-deleted-through-the-postgrest-shape` | 42501 permission denied / PASS | rows=1 / FAIL "permitted" |
| `…-queue-every-workspace-it-owns-for-purge` | 42501 permission denied / PASS | rows=0 / FAIL "zero rows rather than refusing" |
| `owner-a-can-still-rename-…-after-batch-170` | rows=1 / PASS | rows=1 / PASS |

So each refusal is attributed by `expectDeniedBy` (`db/foundation/test-helpers/rls-assertions.mjs:270`) to the
**grant** layer on the table `workspaces`, from the message, and not to RLS filtering: a policy-layer 42501 fails
the targeted `access_blocked` case, and an RLS-filtered zero-row result fails the three column-free cases. Full
`make db-rls-smoke` with the column grant restored: exit 2, "FAILED — 7 of 1087", exactly these seven; the
positive and every other case pass. The handoff's limitation 4 (the pre-170 leg only by a hand grant) is also
closed by measurement: in round m4a (§2) migrate-clean stopped at 170, leaving the schema through 150 -- main's
privileges, built by migrations -- and the branch's rls-smoke on it failed exactly the same seven.

## 2. Mutation table, per-layer verdicts

"static" is `node --test test-kits/db/foundation-contract.test.mjs`; "migrate-clean" a fresh cluster; "rls-smoke"
the whole suite. CAUGHT means the layer exits non-zero for this mutation's reason; BLIND means it passes.

| # | mutation | static | migrate-clean | rls-smoke |
|---|---|---|---|---|
| M1 | later file `171_q0_mutation.sql`: `grant update (lifecycle_state) on app.workspaces to authenticated` | undeclared file: exit 1, 17 fail (the catalog-snapshot / not-applied tests -- an artefact of any new file). Declared as not applied in the snapshot and `NOT_ON_THE_INSTANCE`: **exit 0, 80/80, BLIND** | **CAUGHT**, exit 2: pinned grant probe "unlisted: authenticated UPDATE (lifecycle_state) on app.workspaces" | **CAUGHT**: 7 of 1087 fail, exactly the seven |
| M1c | M1 plus the pin moved back to main's line | **CAUGHT**: the digest assertion, `'pinned grant probe': 'baa6379790cb8733'` actual vs `eb5ecbffb7f4f3cf` expected | **CAUGHT**, exit 2, by 170's own block in the post-migrate pass: "170_workspace_lifecycle_not_client_writable.sql#1 (line 83) no longer holds … a client role can write app.workspaces.lifecycle_state: authenticated UPDATE" | (as M1) |
| M2 | later file: `grant update on app.workspaces to authenticated` (table-level) | not run (no static rule reads a later migration's grants; M1 declared shows it) | **CAUGHT**, exit 2: closure coverage probe "app.workspaces.created_by" and pinned grant probe "table-level … unlisted: authenticated UPDATE on app.workspaces" | **CAUGHT** (live grant, column grant revoked): 7 of 1087 fail, exactly the seven |
| M3 | later file: `alter policy workspaces_update_owner … using (true) with check (true)` | not run | **CAUGHT**, exit 2: permissive policy probe "missing or changed: app.workspaces.workspaces_update_owner" | **CAUGHT** by older cases: 3 fail (`viewer-`, `approver-`, `editor-a-cannot-update-workspace-a`); all eight batch-170 cases PASS -- the grant refuses first, so they neither need nor try to discriminate a policy widening |
| M4a | 170's block weakened (check 1 drops `authenticated`, check 2 expects `name, lifecycle_state, updated_by`), revoke KEPT, M1's later regrant, pin moved, digest refreshed | **CAUGHT**: "the owner still updates name and updated_by, and nothing else" (`+ 'lifecycle_state'`) | **CAUGHT** at 170's own apply: "authenticated's UPDATE … is not exactly (name, updated_by): name, updated_by" (an inconsistent weakening fails itself) | on the schema through 150: 7 of 1087 fail |
| M4b | the coordinated weakening: 170's revoke removed, block checks 1 and 2 weakened to match, pin moved to main's line, digest refreshed to `baa6379790cb8733` | **CAUGHT**: "the owner still updates name and updated_by, and nothing else" | **BLIND**: exit 0, post-migrate "51 apply-time blocks, 39 re-run as written" | **CAUGHT**: 7 of 1087 fail, exactly the seven |

If M4b also rewrote the static assertions at `test-kits/db/foundation-contract.test.mjs:3303-3327`, rls-smoke
would be the only layer left. That last step is READ, not measured; the rls-smoke verdict it rests on is measured.

### 2.1 The plan's drifts, re-run (appended to `140_audit.sql`, restored byte for byte)

| drift | migrate-clean | 170's block said |
|---|---|---|
| d1 `grant update on app.workspaces to authenticated;` | 2 | "a client role can write app.workspaces.lifecycle_state: authenticated UPDATE" |
| d2 `grant insert (lifecycle_state) on app.workspaces to anon;` | 2 | "… anon INSERT" |
| d3 `grant update (lifecycle_state) on app.workspaces to public;` | 2 | "… anon UPDATE, authenticated UPDATE, public UPDATE" |
| d4 `revoke update (name) on app.workspaces from authenticated;` | 2 | "… is not exactly (name, updated_by): updated_by" |
| d5 `revoke select (lifecycle_state) on app.workspaces from authenticated;` | 2 | "authenticated's SELECT on app.workspaces changed: id, name, created_at, updated_at, created_by, updated_by" |
| d6 (mine) `grant update (lifecycle_state) … to authenticated with grant option;` | **0** | -- 170's `revoke` removes the privilege and its grant option together, so a pre-170 grant option is absorbed; the block's WITH GRANT OPTION readings bite only on a later file |

Plan §3's five messages are reproduced word for word. sha256 of `140_audit.sql` `2ac596bb950e8dfb` before and
after each of the six.

## 3. Claims checked

| claim (where) | verdict | how |
|---|---|---|
| 170 is one `revoke` and a comment, nothing else (170.sql, plan §1, handoff, commit `03dbd30`) | TRUE | read; static assertion; r1 catalog |
| anon / PUBLIC held nothing on the column before 170 | TRUE | main forms run, `has_column_privilege` |
| 48 of 72 admitted on main, 72 of 72 refused 42501 privilege on the head; owner's four rename forms admitted | TRUE | §1.2 |
| eight cases, seven fail on the pre-170 privilege, the positive passes; 1079 → 1087 | TRUE | §1.3, §1.2 |
| post-migrate pass 51 / 39 / 12 | TRUE | r1 |
| drifts d1-d5 and their messages | TRUE | §2.1 |
| pin: one-line diff; digest `baa6379790cb8733` → `eb5ecbffb7f4f3cf` | TRUE | diff; M1c shows the old pin yields exactly the old digest |
| assertion floor 932 → 942, "ten assertions" | TRUE | ten `assert.*` calls in the new block; `npm run verify` green |
| tests stay 684; VERIFICATION.md not needed | TRUE | `npm run verify` |
| every `open_blockers` pin moves 256+i → 255+i, 52 pins | TRUE | `"open_blockers"` opens at line 254, element 0 at 255; my script: 52 changed lines in the two maps, every one a pure shift by −1; 19 retention citations recomputed, 0 wrong |
| amendment paths four → three; rationale names the three | TRUE | manifest diff; scope check exit 0 |
| `open_blockers[195]` edit is append-only (8)/(9), no other blocker changed | TRUE | old and new [195] share a 9805-character prefix; the other 195 entries are byte-identical |
| (9) "nothing on a request path writes `lifecycle_state`"; app_worker's only member is postgres | TRUE | §1.2 catalog reads |
| `ff13faf` is the handoff alone and last; "9a07459..e7f9c2c: 3 added, 10 modified" | TRUE | `git show --stat` |
| handoff tests list (pre170grant exit 2, 7 of 1087; scope 11 at `03dbd30`) | TRUE | §1.3, §1.1 |
| Owner's words quoted verbatim (`ลุยต่อเลย เอาตามแนะนำ`, `เอาตามที่แนะนำเลย ลุยต่อ`, `คุณทำต่อยาวจนนกว่าจะจบ phase เลย แล้วรีวิวทีเดียว`, the 127 §6 delegation, `เิาตามแนะนำ`) | TRUE | matched against the cited dispositions (rfc-026-027 §8 line 139; 129 §1 lines 12, 21; 127 §6 lines 75, 77; 150 §1 line 14) |
| Q-026-5 / Q-027-5 answered "revoke, in the first of batch 170's migrations" | TRUE | rfc-026-027 disposition §7 row (line 131) and §8 |
| Q-027-6 "Done: 170" (disposition §2 line 46; plan line 16 and §1 item 3; 170.sql:3-4; [195] (8)) | **PARTLY** | Q0-F1 |
| "a later file that grants the column back fails migrate-clean here as well as in the pinned grant probe" (170.sql:81-82) | TRUE in substance | Q0-F2 |
| A0 did not merge #175; PR is Draft | TRUE | `gh pr view 175` |

## 4. Findings

**Q0-F1 — LOW (record accuracy).** The disposition records Q-027-6 as **Done** by this file
(`evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-170.md:46`), and the plan
(`a0-batch-170-plan-2026-10-03.md:16`, `:77`), 170's header (`db/foundation/migrations/170_workspace_lifecycle_not_client_writable.sql:3-4`)
and `open_blockers[195]` (8) (`work-packages/WP-0A-DB-00.json:450`) take the number 170 from Q-027-6. But Q-027-6,
as the RFC batch recorded it (`product-owner-disposition-2026-10-03-batch-rfc-026-027.md:105`), asks for the
number and landing order of **RFC-2026-027's gate migration**, "landing after approval and before any batch that
relies on the gate", and is the Integration Owner's to assign. The revoke's place comes from §7's row (line 131:
"in the **first** of batch 170's migrations … whichever lands first"), not from Q-027-6. Consequence: the gate
migration still has no number (170 is now taken), and a reader of "Q-027-6 Done" would believe it does. Nothing
in the database is affected. *Remedy:* on the next touch of these records, say that 170's number follows §7's
"first of batch 170's migrations", and that Q-027-6 -- the gate's number, now the next free after 170 -- stays
the Integration Owner's to assign; or record "Done" explicitly as A0's reading of Q-027-6, as §8 records its other
readings. Not stop-the-line; does not block the merge.

**Q0-F2 — INFO.** 170.sql:81-82 says a later regrant "fails migrate-clean here as well as in the pinned grant
probe". Measured: with the pin unchanged (M1) migrate-clean stops at the pinned grant probe and never reaches the
post-migrate pass, so one run reports only the probe; 170's block fires only once the pin has also moved (M1c).
Both layers are real and independent; the sentence is true of the layers, not of one run's output. *Remedy:*
none required.

**Q0-F3 — INFO.** The static suite is blind to a later file that grants the column back when the file is declared
(M1: 80/80). This is by design -- the DB layers hold it (M1, M1c, M2) -- and is recorded so nobody reads the
static floor as covering later files. *Remedy:* none required.

**Q0-F4 — INFO.** With a client table-level `UPDATE` on `app.workspaces` granted live (M2), the only rls-smoke
failures are batch 170's seven; no case exercises a client UPDATE of `id`, `created_at` or `created_by` on this
table. migrate-clean holds it three ways (pinned grant probe, closure coverage probe, 170's block checks 1-2).
*Remedy:* optional, a case for a later batch.

**Q0-F5 — INFO.** Concur with the plan's F4: `db/foundation/lint/pinned-grants.json:3` `_how_measured` still says
"through 140" while the pin now reflects 170. *Remedy:* one-phrase edit at the next regeneration.

The plan's F1-F3 (no writer of the §11.4 transitions; app_worker's table-level UPDATE with only `postgres` as a
member; no state-entry timestamp) are confirmed as measured or as already held; I add nothing to them.

## 5. Stop-the-line verdict

**No stop-the-line.** No secret, no tenant leak, no lost job, no migration divergence (170 is new, 010 is not
edited, the catalog declaration is a tail), no irreversible deletion, no contract mismatch. The change narrows a
client privilege; every layer measured green on the head; the new cases discriminate the gap at the right layer.

**Nothing found blocks the merge.** Q0-F1 is a record correction. Whether the merge happens, and under which
bar (RFC-2026-002, the standing delegation of batch 127 §6, the open RFC-2026-025 §5 points), is the Integration
Owner's and the Product Owner's to decide, not this record's.

## 6. Limits

- The large harness (`explain-harness.mjs`) was not run, as instructed; nothing in this batch touches an index
  or a query plan.
- M2 and M3 were not run against the static suite; M4b's final step (also rewriting the static assertions) is
  reasoned, not measured.
- `lifecycle-forms.sql` is A0's text, read in full and run unchanged; the case probe and the catalog reads are
  mine. All PostgreSQL measurement is 17.11 on macOS, not CI's service container; CI's "bootstrap" result is read
  from GitHub, not re-run.
- I am not independent of the Author beyond RFC-2026-024 (§0).
