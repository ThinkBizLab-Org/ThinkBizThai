# Q0 independent test re-check of batch 170's review round (PR #175)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-170`, head `1c3e11dfd793b3420c96ec9a7ba08ab5c3ac5ac0` (the handoff, alone and
last) over the review-round code `f728eca189cc3b4193211643f420359b5a92e89f`, base `9a07459` (main; `origin/main`
is still `9a07459`). Previously reviewed head `ff13faf`. Author `/claude/a0_atlas`. PR
<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/175>: Draft and OPEN, head `1c3e11d`, MERGEABLE, required
check "bootstrap" run 37179908506 SUCCESS (read with `gh pr view 175`, not re-run). **Tested on:** my own branch
`recheck/q0-batch-170`, created at `1c3e11d`. **Date:** 2026-10-04; the file name carries the phase's date
(2026-10-03), as the batch's other records do. **Scope:** NARROW -- the review round `ff13faf..1c3e11d`, my own
findings Q0-F1..F5 first, and the mutation table re-measured on the new head.

This record holds findings. It advances no status. It approves nothing, test-verifies nothing on anyone's
behalf, and decides nothing that the Integration Owner or the Product Owner holds.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and I am the same vendor and model family. My
independence from the Author is the independence RFC-2026-024 describes, and no more. Accepting this record as
the Tester role's signature is the Integration Owner's act and the Product Owner's act, not mine.

I fixed nothing. Every mutation below was made in my own worktree from copies saved first in the private
directory, and restored from them afterwards; a temporary `171_q0_mutation.sql` was created for M1-M3 and deleted.
sha256 prefixes after every round: `140_audit.sql` `2ac596bb950e8dfb`, 170 `9a2dbb97718920f8` (both equal to
the head's). `git status` was clean before this file was written. Nothing was pushed.

## 1. Measured versus read

**Setup for every measured run:** Node `v24.20.0` from `/Users/bank/.local/node-v24.20.0/bin`, checked with
`node -v` before each run (every script prints it; the PATH Node 26 was not used). PostgreSQL 17.11 from
`/opt/homebrew/bin`. A fresh `initdb --locale=C -A trust -U postgres` for each round on 127.0.0.1:**5503** only,
TCP only (`-c unix_socket_directories=''`), `LC_ALL=C`; the shim `db/foundation/ci/supabase-shim.sql` first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean` and `make db-rls-smoke`. Private
directory `scratchpad/q0-170r2/`. I touched no other port. The cluster is stopped and its data directory removed;
5503 is free (`lsof` empty).

Why the database was run although 170's statements did not change: 170's text did change (comment lines, which
shift the block's line in the post-migrate pass message from 83 to 90), migrate-clean reads the file, and the
question asked for per-layer mutation verdicts on this head.

### 1.1 Repository commands, on the branch NAME

`recheck/q0-batch-170` is declared by no manifest, so `npm run check:handoff` there exits 75 ("no work package
declares ownership.branch"), as it should. I therefore checked out the name `agent/claude/WP-0A-DB-00-batch-170`
in my own worktree with `git checkout --ignore-other-worktrees` (`git rev-parse --abbrev-ref HEAD` printed the
name; HEAD `1c3e11dfd793…`; nothing committed there) and switched back to `recheck/q0-batch-170` afterwards.

| Command (on the name) | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 9a07459 WP-0A-DB-00` | 0 | "all 17 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |

### 1.2 The database layers on the head

| Round | Command | Exit | Output |
|---|---|---|---|
| r1 | migrate-clean | 0 | "applied 170_workspace_lifecycle_not_client_writable.sql"; pinned grant probe "43 table-level and 1327 column-level grants"; post-migrate pass "51 apply-time blocks, 39 re-run as written, 12 superseded and replaced" |
| r1 | rls-smoke, twice on the same database | 0, 0 | "1087 isolation case(s) passed"; "db-authz-proofs: ok — 6 claim(s)" |
| r1 | `lifecycle-forms.sql` (A0's text, unchanged since my first review) | 0 | 72 of 72 refused `42501 permission denied for table workspaces`; no lifecycle UPDATE admitted |
| r2 | fresh cluster, migrate-clean, rls-smoke | 0, 0 | the same counts |

### 1.3 Do the new cases fail for the right reason? (re-measured)

`probe-cases.mjs` (mine) runs only batch 170's eight cases through the repository's own runner and logs each
case statement's raw database message.

| case | head: raw / verdict | pre-170 column grant restored by hand: raw / verdict |
|---|---|---|
| `…-to-closing-by-id` | `42501 permission denied for table workspaces` / PASS | rows=1 / FAIL "permitted" |
| `…-to-access-blocked-by-id` | 42501 permission denied / PASS | `42501 new row violates row-level security policy for table "workspaces"` / FAIL "declares it is refused by the grant layer and the database refused it at the policy layer" |
| `…-with-no-where` | 42501 permission denied / PASS | rows=0 / FAIL "zero rows rather than refusing" |
| `…-where-true` | 42501 permission denied / PASS | rows=0 / FAIL "zero rows rather than refusing" |
| `…-returning-a-constant` | 42501 permission denied / PASS | rows=1 / FAIL "permitted" |
| `…-to-deleted-through-the-postgrest-shape` | 42501 permission denied / PASS | rows=1 / FAIL "permitted" |
| `…-queue-every-workspace-it-owns-for-purge` | 42501 permission denied / PASS | rows=0 / FAIL "zero rows rather than refusing" |
| `owner-a-can-still-rename-…-after-batch-170` | rows=1 / PASS | rows=1 / PASS |

Full rls-smoke with the column grant restored: exit 2, "FAILED — 7 of 1087", exactly these seven. Each refusal
is attributed to the **grant** layer on `workspaces`; a policy-layer 42501 and an RLS-filtered zero-row result
both FAIL. Unchanged from `ff13faf`, as expected (the round changed no case).

## 2. Mutation table, per-layer verdicts (on `1c3e11d`)

"static" is `node --test test-kits/db/foundation-contract.test.mjs`; "migrate-clean" a fresh cluster;
"rls-smoke" the whole suite on that cluster. CAUGHT = exits non-zero for this mutation's reason; BLIND = passes.

| # | mutation | static | migrate-clean | rls-smoke |
|---|---|---|---|---|
| M1 | later file `171_q0_mutation.sql`: `grant update (lifecycle_state) on app.workspaces to authenticated` (declared as not applied, so the static suite reads the mutation, not the undeclared-file artefact) | **BLIND**, exit 0, 80/80 (by design, Q0-F3) | **CAUGHT**, exit 2: pinned grant probe "unlisted: authenticated UPDATE (lifecycle_state) on app.workspaces" | **CAUGHT**: "FAILED — 7 of 1087", exactly the seven |
| M1c | M1 plus the pin moved back to main's line | **CAUGHT**: digest `'pinned grant probe': 'baa6379790cb8733'` actual vs `eb5ecbffb7f4f3cf` | **CAUGHT**, exit 2, by 170's block: "170_workspace_lifecycle_not_client_writable.sql#1 (line 90) no longer holds … authenticated UPDATE" | (as M1) |
| M2 | later file: `grant update on app.workspaces to authenticated` (table-level) | not run (as M1) | **CAUGHT**, exit 2: closure coverage probe "app.workspaces.created_by"; pinned grant probe "table-level … unlisted: authenticated UPDATE on app.workspaces" | **CAUGHT**: 7 of 1087, exactly the seven |
| M3 | later file: `alter policy workspaces_update_owner … using (true) with check (true)` | not run | **CAUGHT**, exit 2: permissive policy probe "missing or changed: app.workspaces.workspaces_update_owner" | **CAUGHT** by older cases: 3 fail (`viewer-`, `approver-`, `editor-a-cannot-update-workspace-a`); all eight batch-170 cases PASS (probe: 8 PASS) -- the grant refuses first |
| M4b | coordinated weakening of 170: revoke removed, block checks 1 and 2 weakened to match, pin moved to main's line, digest refreshed to `baa6379790cb8733` | **CAUGHT**: "the owner still updates name and updated_by, and nothing else" (`+ 'lifecycle_state'`) | **BLIND**: exit 0, "51 apply-time blocks, 39 re-run as written" | **CAUGHT**: 7 of 1087, exactly the seven |

These match my first review row for row; the review round neither weakened nor strengthened a DB layer (it changed
no statement). If M4b also rewrote the static block, rls-smoke would be the only layer left -- READ, not measured.

### 2.1 The new static assertions (A1 F170-2's fix), mutated

`static-mut.mjs` (mine): each mutation written into 170 in place, the static file run, 170 restored
(`9a2dbb97718920f8` before and after).

| # | mutation of 170 | static | first failing assertion |
|---|---|---|---|
| none | -- | exit 0, 80/80 | -- |
| A0-1 | `create or replace function app.q0x() …` appended | **CAUGHT** exit 1 | "and outside it only the revoke and the column comment, in that order" |
| A0-2 | `create view app.q0v …` appended | **CAUGHT** exit 1 (2 fail) | the same (and db-schema-lint) |
| A0-3 | `create rule q0r … do instead nothing` appended | **CAUGHT** exit 1 | "and outside it only …" |
| A0-4 | `alter default privileges in schema app grant update on tables to authenticated` appended | **CAUGHT** exit 1 | "and outside it only the revoke …" |
| A0-5 | `execute 'grant update (lifecycle_state) … to authenticated'` inside the block | **CAUGHT** exit 1 | "and the do-block, literals blanked, runs no DDL, DML, dynamic SQL or setting" |
| Q-6 | a second `do $x$ … $x$;` block appended | **CAUGHT** exit 1 (3 fail) | "and outside it only …" |
| Q-12 | `select set_config(…)` in the block **and** check 1 narrowed to `anon` | **CAUGHT** exit 1 | "for UPDATE and INSERT, with and without grant option" (the older pin) |
| Q-13 | revoke removed, `execute $g$grant select on app.workspaces to anon$g$` in the block | **CAUGHT** exit 1 | "the do-block … runs no DDL" |
| Q-7 | `lock table app.workspaces in access exclusive mode;` in the block | **BLIND**, 80/80 | -- |
| Q-8 | `select pg_catalog.set_config('search_path', 'public', false) into offending;` in the block | **BLIND**, 80/80 | -- |
| Q-9 | `select app.q0_some_function() into offending;` in the block | **BLIND**, 80/80 | -- |
| Q-10 | `load 'auto_explain';` in the block | **BLIND**, 80/80 | -- |
| Q-11 | `reassign owned by authenticated to postgres;` in the block | **BLIND**, 80/80 | -- |

A0's five mutations (plan §9.2) reproduce. That the old keyword assertion alone passed all five is READ (its
regex needs `grant` at line start or `create|alter|drop` directly before `policy|table|function|trigger|index`),
not re-measured. Q-7..Q-11 are Q0R-F1.

### 2.2 The plan's drifts, re-run (appended to `140_audit.sql`, restored byte for byte)

| drift | migrate-clean | 170's block said |
|---|---|---|
| d1 `grant update on app.workspaces to authenticated;` | 2 | "a client role can write app.workspaces.lifecycle_state: authenticated UPDATE" |
| d2 `grant insert (lifecycle_state) on app.workspaces to anon;` | 2 | "… anon INSERT" |
| d3 `grant update (lifecycle_state) on app.workspaces to public;` | 2 | "… anon UPDATE, authenticated UPDATE, public UPDATE" |
| d4 `revoke update (name) on app.workspaces from authenticated;` | 2 | "… is not exactly (name, updated_by): updated_by" |
| d5 `revoke select (lifecycle_state) on app.workspaces from authenticated;` | 2 | "authenticated's SELECT on app.workspaces changed: id, name, created_at, updated_at, created_by, updated_by" |
| d6 `grant update (lifecycle_state) … to authenticated with grant option;` | 0 | -- absorbed by 170's revoke, as in my first review |

sha256 of `140_audit.sql` `2ac596bb950e8dfb` before and after each of the six.

## 3. My own findings first

| finding (first review) | state on `1c3e11d` | how |
|---|---|---|
| Q0-F1 LOW: 170's number attributed to Q-027-6 | **CLOSED** | 170.sql:3-9, disposition :46 (row now "Not this batch", with the first writing stated) and :49, plan :13-19 and :80, manifest `amends_without_owning.rationale`, `open_blockers[195]` (8) (edited in place, the edit stated in (10)), handoff inputs and acceptance. `grep Q-027-6` over these finds no remaining "Done" attribution. The disposition row's wording of Q-027-6 matches the RFC batch disposition's (:105) |
| Q0-F2 INFO: the regrant sentence | **CLOSED** | 170.sql:83-85 now names the two layers and which stops first; M1 / M1c measure exactly that |
| Q0-F3 INFO: static blind to a declared later regrant | unchanged, by design | M1 static 80/80 |
| Q0-F4 INFO: no case for client UPDATE of id / created_at / created_by | **owed**, recorded in `[195]` (10) for a later batch | M2: still only the seven fail |
| Q0-F5 INFO: `_how_measured` "through 140" | **owed**, recorded in `[195]` (10) and plan §9.2 | `scripts/db/generate-pinned-grants.mjs:58` and `:63` do write the text; see Q0R-F2 |

## 4. Claims checked

| claim (where) | verdict | how |
|---|---|---|
| 170's diff in this round is comment lines only (plan §9.2, commit `f728eca`, A0's done list) | TRUE | every `+`/`-` line of `git diff ff13faf 1c3e11d -- db/foundation/migrations` begins `--`; r1/r2 and drifts unchanged |
| cherry-picks `-x` 49bcb9b→996e24e, 96caa2c→a18670e, 6af2fb0→323baf7 (plan §9.1, handoff) | TRUE | each carries "(cherry picked from commit …)"; `git diff` of each file against its source commit is empty |
| four new assertions; floor 942 → 946; tests stay 684 (commit, plan, handoff `compatibility_impact`) | TRUE | four `assert.*` calls added at foundation-contract.test.mjs:3327-3332; `npm run verify` 684/684; integrity manifest moves exactly the two changed files' digests |
| the new assertions catch `create or replace function`, view, rule, `alter default privileges`, and `execute` in the block | TRUE | §2.1 A0-1..A0-5 |
| "the do-block, literals blanked, issues no statement of its own beyond reading the catalog" / "runs no DDL, DML, dynamic SQL or setting" (test comment and message; `[195]` (10)(b) "runs no statement of its own") | **PARTLY** | Q0R-F1 |
| `[195]` (8) corrected in place, (10) appended, no other blocker changed (A0's done list) | TRUE | my `b195.mjs`: only element 195 differs among 196; old and new share a 10229-character prefix, the change is the (8) clause, and (10) is new text at the end; manifest keys changed: `ownership` (rationale) and `open_blockers` only |
| generator writes `_how_measured` (lines 58, 63) | TRUE | read |
| "the generator is not this batch's to amend" (plan §9.2) | **PARTLY** | Q0R-F2 |
| `1c3e11d` is the handoff alone and last; "9a07459..f728eca: 6 added, 11 modified" | TRUE | `git show --stat`; `git diff --name-status` counts 6 A, 11 M |
| handoff tests: scope 17 paths exit 0; check 684/684; r1/r2 0,0, 1087 | TRUE | §1.1, §1.2 (my own runs, port 5503, not A0's 5507) |
| PR #175 still Draft/OPEN, not merged; push was not forced | TRUE / READ | `gh pr view 175`; `origin/agent/claude/WP-0A-DB-00-batch-170` = `1c3e11d` and contains `ff13faf` |

## 5. New findings

**Q0R-F1 — LOW (a test that claims more than it holds).** The new do-block assertion
(`test-kits/db/foundation-contract.test.mjs:3331-3332`) is a keyword denylist. Its comment (:3322-3325) says the
block "issues no statement of its own beyond reading the catalog", its message says "runs no DDL, DML, dynamic SQL
or setting", and `open_blockers[195]` (10)(b) says "one do-block that runs no statement of its own". Measured
(§2.1 Q-7..Q-11): `select pg_catalog.set_config(…) into offending` (a setting, session-wide for the rest of
migrate-clean), a call of any function through `select … into`, `lock table`, `load`, and `reassign owned` inside
170's block all pass the file 80/80, and no DB layer would see the first two either. A1's F170-2 as scoped (the
four named DDL forms) is closed; the claim as written is not. *Remedy:* either hold the block positively -- e.g.
its statements, literals blanked, are exactly three `select … into offending from/where …` reading only
`pg_catalog` functions named in an allowlist (`has_column_privilege`, `has_table_privilege`, `string_agg`,
`format`, `unnest`, `coalesce`) and three `if … then raise exception … end if;` -- or narrow the comment, the
message and (10)(b) to the keywords actually tested. Not stop-the-line: 170 is reviewed text, and after
integration migration invariant 1 forbids editing it. Does not block the merge.

**Q0R-F2 — INFO (record accuracy).** Plan §9.2 says the `_how_measured` fix is owed because "the generator is
not this batch's to amend"; A0's done-list says it exceeds the round's limited scope. The second is a fair reason;
the first is not what the manifest says: `work-packages/WP-0A-DB-00.json` `ownership.writable_paths` includes
`scripts/db/**`, so the generator is within this package's writable paths. *Remedy:* on the next touch, say
"deferred by choice to keep the round narrow", not "not this batch's to amend". Nothing else changes.

No other new finding. The review-round code introduces no new behaviour in any DB layer.

## 6. Stop-the-line verdict

**No stop-the-line.** No secret, no tenant leak, no lost job, no migration divergence (170's statements are
byte-identical in effect to `ff13faf`; 010 is unedited), no irreversible deletion, no contract mismatch. Every
layer measured green on the head; the seven new refusals still fail at the grant layer on the pre-170 privilege,
and the positive passes.

**Nothing found blocks the merge.** Q0R-F1 (LOW) and Q0R-F2 (INFO) are a test-claim narrowing and a record
wording. Whether the merge happens, and under which bar (RFC-2026-002, the standing delegation of batch 127 §6,
the open RFC-2026-025 §5 points), is the Integration Owner's and the Product Owner's to decide, not this record's.

## 7. Limits

- Narrow re-check: only `ff13faf..1c3e11d`, my own five findings, the mutation table and the drifts. The cherry-
  picked C0 and A1 records were checked for byte-equality with their sources, not re-reviewed.
- M2 and M3 were not run against the static suite; M4b with the static block also rewritten is reasoned.
  A0's claim that the old keyword assertion passed all five of its mutations is read from the regex, not
  re-measured on `ff13faf`'s test file.
- `lifecycle-forms.sql` is A0's text, run unchanged; the probes, the static mutations and `b195.mjs` are mine.
  All PostgreSQL measurement is 17.11 on macOS, not CI's service container; CI's result is read from GitHub.
- The large harness (`explain-harness.mjs`) was not run; nothing in the round touches an index or a plan.
- I am not independent of the Author beyond RFC-2026-024 (§0).
