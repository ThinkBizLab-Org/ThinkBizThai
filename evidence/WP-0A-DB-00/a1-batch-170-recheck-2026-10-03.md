# A1 security review re-check: batch 170's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-170` (PR #175, Draft, open, not merged), head
  `1c3e11d` (`1c3e11dfd793b3420c96ec9a7ba08ab5c3ac5ac0`) over code `f728eca`
  (`f728eca189cc3b4193211643f420359b5a92e89f`), base `9a07459` (main). Author `/claude/a0_atlas`.
  Previous reviewed head `ff13faf`; my earlier review is `a1-batch-170-security-review-2026-10-03.md`.
- **Scope:** narrow re-check of the review-round corrections (`ff13faf..1c3e11d`), my own findings first.
- **Checked out as:** local branch `recheck/a1-batch-170` at `1c3e11d`, in this run's own worktree. For
  `verify`, `check:handoff` and branch scope I checked out the branch NAME
  `agent/claude/WP-0A-DB-00-batch-170` in the same worktree (`git checkout --ignore-other-worktrees`; the ref
  already pointed at `1c3e11d` locally and on origin and was not moved; `git rev-parse --abbrev-ref HEAD`
  printed the name), ran the three commands, and switched back to `recheck/a1-batch-170` before writing
  this file. Nothing was committed on the branch name.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch. I am the same vendor
and model family as the Author. Under RFC-2026-024 that is the stated independence limit of this role run.
Accepting this re-check as the A1 role's signature -- including A1's acceptance owed on Q-026-5 / Q-027-5
-- is the Integration Owner's and the Product Owner's act, not mine. This file is input to that acceptance.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; my earlier review; the three commit messages `ff13faf..1c3e11d` (and
the three cherry-picks' `-x` trailers); `git diff ff13faf..f728eca` for the migration, the test, the floor,
the integrity manifest, the plan, the disposition and the manifest; `git diff 9a07459..1c3e11d --stat`;
plan §0-§1 and §9 in full; disposition §2; `open_blockers[195]` (8)-(10) by script; the handoff's
acceptance, tests and limitations by script; `product-owner-disposition-2026-10-03-batch-rfc-026-027.md`
§5 row Q-026-5 (:96), §5 row Q-027-6 (:105), §7 row Q-026-5/Q-027-5 (:131) and §8 (:135-172).

**Measured.** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`; `node -v` checked inside every round
script and before every npm run; the PATH Node 26 was never used). PostgreSQL 17.11 from
`/opt/homebrew/bin`, port **5501** on `127.0.0.1` only, `unix_socket_directories=''`,
`initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the shim first, re-initdb every round. Private
directory `a1-170r2/` in the run's scratchpad. The cluster was stopped and its data directory removed at
the end; `lsof` shows nothing listening on 5501. No other port was touched.

| # | command | head / state | exit | result |
|---|---|---|---|---|
| r1 | shim, `make db-migrate-clean`, `make db-rls-smoke` | `1c3e11d`, fresh cluster | 0, 0 | post-migrate pass 51 blocks, 39 as written, 12 replaced; smoke ok, authz proofs 6 |
| C | my earlier `catalog.sql`, as postgres | r1 | 0 | identical to the earlier run (§2.1) |
| P-after | `paths.sql`: my earlier 25 forms **plus 4 new** (a client temp view with an `INSTEAD` rule, `CREATE RULE` on the table, `set_config('role', ...)` then UPDATE, a nested writable CTE) x {authenticated as the owner of two workspaces, anon}; 7 positives | r1 | 0 | 0 of 56 real client attempts admitted (the two `set_role_worker` rows are the known harness artefact: the DO block's session user is the superuser); 7 of 7 positives admitted |
| S | login role `a1_login` (NOINHERIT, member of authenticated only): `set role` and `set_config('role', ...)` to app_worker / postgres / service_role; then as authenticated UPDATE, MERGE, INSERT ... ON CONFLICT DO UPDATE of the column | r1 | -- | all five role switches refused "permission denied to set role"; the three writes refused 42501 "permission denied for table workspaces"; role dropped |
| F-after | A0's `lifecycle-forms.sql` (my earlier unedited copy) | r1 | 0 | 9 forms x 8 states: **0 of 72 admitted**; the 4 rename/updated_by positives admitted |
| pre | r1 + `grant update (lifecycle_state) on app.workspaces to authenticated` by hand; paths, forms, rls-smoke | r1+grant | 0, 0, 2 | paths: 13 real forms admitted (my earlier 12 plus the new temp-view `INSTEAD` rule); forms: **48 of 72**; rls-smoke "FAILED -- 7 of 1087" |
| dA | append `grant update (lifecycle_state) ... to authenticated with grant option;` to `140_audit.sql` | +drift | 0 | 170's revoke removes it (as before) |
| dE | append `grant update on app.workspaces to authenticated;` | +drift | 2 | refused by **170's block**: "a client role can write app.workspaces.lifecycle_state: authenticated UPDATE" |
| dI | append `grant insert (lifecycle_state) on app.workspaces to authenticated;` | +drift | 2 | refused by **170's block**: "... authenticated INSERT" |
| dR | append `create rule a1_r as on update to app.workspaces do also update app.workspaces set lifecycle_state = 'closing' where ...` | +drift | 2 | refused by the **rewrite rule probe** ("app.workspaces.a1_r") -- closes my earlier limit "rules not drifted" |
| dT | append a plpgsql `private.a1_tg()` that sets `new.lifecycle_state := 'closing'` when `new.name = 'close me'`, and `create trigger a1_tg before update on app.workspaces` | +drift | **0, 0** | **migrate-clean and rls-smoke both pass**; then, as authenticated with the owner's claims, `update app.workspaces set name = 'close me' where id = ...` -> `UPDATE 1`, state **`closing`** (R-2) |
| -- | `140_audit.sql` sha256 prefix before / after each drift | -- | -- | `2ac596bb950e8dfb` / `2ac596bb950e8dfb` every time; `git status` clean |
| M0-M5 | static mutations of 170, `node --test test-kits/db/foundation-contract.test.mjs` after each, 170 restored | `1c3e11d` | 0,1,1,1,0,0 | M0 unmutated: 0. M1 `create or replace function`, M2 `create view`, M3 `alter default privileges` appended: each 1, on "and outside it only the revoke and the column comment, in that order". M4 `select pg_catalog.set_config('role', 'app_worker', false) into offending;` and M5 `select pg_catalog.lo_import(...) into offending;` inside the do-block: **0** (R-1). 170 sha256 prefix `9a2dbb97718920f8` before and after |
| V1 | `node scripts/verify-branch-scope.mjs 9a07459 WP-0A-DB-00` | branch name, `1c3e11d` | 0 | "all 17 changed path(s) are declared, and every amendment explains one" |
| V2 | `npm run check:handoff` | branch name | 0 | "describes the branch: nothing substantive after its cited head" |
| V3 | `npm run verify` | branch name | 0 | "clean: exit 0 -- tests 684, pass 684, fail 0, skipped 0, todo 0"; tree clean after |

## 2. My earlier findings

| id | was | now | how |
|---|---|---|---|
| F170-1 | INFO: 170's block does not see a NOINHERIT membership | **Closed** (wording) | `170_...sql:83-89` now says that reach is the client membership probe's and the pinned grant probe's, not the block's. Read; true (my dB earlier). Diff of 170 in this round is comment lines only (read: every `-`/`+` line in `ff13faf..f728eca` for the file starts with `--`). |
| F170-2 | LOW: the static "no DDL" check misses `create or replace function`, view, rule, `alter default privileges` | **Closed for what it named** (measured M1-M3 red; A0's M for `create rule` read, and a rule is also refused at runtime, dR). Residual R-1 below. | `test-kits/db/foundation-contract.test.mjs:3322-3332` |
| F170-3 | INFO: `pinned-grants.json` `_how_measured` "through 140" | **Owed, recorded**: on `open_blockers[195]` (10), plan §9.2, the handoff's limitations. The reason (the generator writes the text, `scripts/db/generate-pinned-grants.mjs`) is sound; I accept the deferral. | read |
| F170-4 | INFO: no writer of §11.4 transitions | unchanged, held on (9) | read |
| F170-5 | INFO: app_worker table grant, no policy | unchanged, held on `[113]` | read |

## 3. The questions

### 3.1 Can any client role still move `lifecycle_state` by any path? **No, today (measured). One future path is not guarded (R-2).**

On a fresh cluster at `1c3e11d`: the column ACL is `{authenticated=r/postgres}`, table ACL
`{postgres=arwdDxtm/postgres,app_worker=arw/postgres}`; UPDATE/INSERT on the column false for every role but
app_worker and postgres; anon and authenticated are members of no role; no view, matview or non-`_RETURN`
rule depends on `app.workspaces`; the only trigger on it is `set_updated_at`; no user function writes it;
two client-executable SECURITY DEFINER functions, both read-only `sql`; no client CREATE on any schema
(catalog C, identical to the earlier run).

Every UPDATE form (targeted, no WHERE, `where true`, `returning`, `= default`, self-assign, row
constructor, sub-select SET, `UPDATE ... FROM`, PostgREST CTE, nested writable CTE), **INSERT ... ON
CONFLICT DO UPDATE**, INSERT naming the column, **MERGE** (matched, `on true`, not-matched insert), COPY, a
client **temporary view** (plain and with an `INSTEAD` rule), a client `pg_temp` **definer function**,
**CREATE TRIGGER** and **CREATE RULE** on the table, ALTER, TRUNCATE, DELETE, and a role switch by `SET ROLE`
or `set_config('role', ...)` from a login holding only authenticated: refused (P-after, S). A0's matrix: 0
of 72 (F-after). The same probes admit 13 forms and 48 of 72 with the pre-170 privilege restored (pre), so
the result is the revoke's.

Regression guards, measured as drifts: a table-level UPDATE grant (dE) and a column INSERT grant (dI) are
refused by 170's block; a column grant before 170 is removed by it (dA); a rule (dR) by the rewrite rule
probe; a membership, a definer function and a view by the probes measured in my earlier run (dB, dC, dD).
**A `BEFORE UPDATE` trigger that assigns `NEW.lifecycle_state` is refused by nothing** (dT, R-2): column
privileges are checked on the statement's SET list, not on what a trigger writes into `NEW`, so a client
rename would move the state. No such trigger exists today.

### 3.2 Did the revoke remove anything else a client legitimately needs? **No (measured).**

The 7 positives of `paths.sql` (targeted rename, rename alone, `updated_by` alone, unfiltered rename,
`SELECT lifecycle_state`, `SELECT ... FOR UPDATE`, PostgREST PATCH of `name`) and A0's 4 positives are all
admitted; the column ACL keeps `name` and `updated_by` `rw` and every other column `r`; rls-smoke 1087
cases pass. The one capability lost is §11.4's owner-initiated close / cancel, which is the Owner's chosen
trade and is owed on `[195]` (9) -- unchanged since my earlier review.

### 3.3 Is `open_blockers[195]`'s finding closed? **Yes (measured).**

(8)'s finding -- one client UPDATE moves any §11.4 state -- is closed: 0/72 and 0/56 on the head, 48/72 and
13 with the old privilege. (8) as corrected is true; (10) truly records what was fixed and what is owed.
R-2 is a guard gap for a future migration, not a re-opening of (8).

## 4. Claims checked

| claim (where) | verdict |
|---|---|
| 170's diff this round is comment lines only (commit `f728eca`, plan §9.2) | TRUE (read the hunks) |
| the four new assertions; old keyword assertion kept; floor 942 -> 946; tests stay 684 (commit, plan §9.2, `scripts/test-suite-contract.mjs:223-226`, handoff) | TRUE (read four `assert.*` calls; V3 684/684 with the floor) |
| "`create or replace function`, `create view`, `create rule`, `alter default privileges` ... each fails the file" (commit, plan §9.2, [195] (10)(b)) | TRUE for function, view, default privileges (M1-M3); rule read, not re-mutated |
| the do-block, literals blanked, "runs no DDL, DML, dynamic SQL or setting" / "issues no statement of its own beyond reading the catalog" (commit, test comment `:3325`, plan §9.2) | **OVERSTATED** for "setting" and "beyond reading the catalog": a `select set_config(...) into ...` or any side-effecting function call through `SELECT ... INTO` passes (M4, M5). R-1. |
| 170's number comes from Q-026-5 / Q-027-5's answer, "the first of batch 170's migrations" (170 header, plan, disposition §2, [195] (8), handoff) | TRUE in substance. The quoted words are verbatim in the RFC disposition §8 (:170); its §7 row (:131) reads "now in the **first** of batch 170's migrations". Q-027-6 (:105) numbers RFC-2026-027's gate migration -- TRUE |
| disposition §2 row Q-027-6 now "Not this batch", the first writing stated (`product-owner-disposition-2026-10-03-batch-170.md:46`) | TRUE (read; nothing hidden: the old wording is named) |
| [195] (8) corrected in place, the correction stated in (10) | TRUE (read; the branch is unmerged, so an in-place correction rewrites no integrated record) |
| cherry-picks C0 49bcb9b->996e24e, A1 96caa2c->a18670e, Q0 6af2fb0->323baf7 | TRUE (`-x` trailers; my file `a18670e` is my text) |
| `pinned-grants.json` "through 140" owed, generator lines 58/63 | TRUE that it is owed and recorded; generator lines read, not re-derived |
| verify-branch-scope 17 paths, check:handoff, verify 684/684 on the branch name; handoff cites `f728eca` (commit `1c3e11d`) | TRUE (V1-V3) |
| migrate-clean, rls-smoke: 51/39/12, 1087 cases | TRUE (r1, on 5501) |
| not re-running drifts this round "because the block and statement are unchanged" (A0's not-done list) | Reasonable for 170's own block; I re-ran five drifts anyway (dA, dE, dI, dR, dT) |

## 5. Findings

| id | grade | file:line | finding | remedy |
|---|---|---|---|---|
| R-2 | LOW | `db/foundation/migrations/170_workspace_lifecycle_not_client_writable.sql:90-127` (and no other probe) | No guard holds the trigger path. A later migration that adds a `BEFORE UPDATE` trigger on `app.workspaces` assigning `NEW.lifecycle_state` passes migrate-clean and rls-smoke, and a client's rename then moves the state (dT: `UPDATE 1`, `closing`). Column privileges do not apply to trigger-written values. Not live: the only trigger today is `set_updated_at`, whose function names neither the table nor the column (catalog C7, C7b). My earlier review said other probes hold "the other paths"; it had not drifted a trigger. | Not in this batch. In the batch that writes the §11.4 command (owed on `[195]` (9)) or any earlier one touching 170's family: pin the trigger set of `app.workspaces` (exactly `set_updated_at` -> `private.set_updated_at()`), in 170's successor block or the catalog snapshot, with a drift like dT. Record it on `[195]`. |
| R-1 | INFO | `test-kits/db/foundation-contract.test.mjs:3331-3332`; commit `f728eca` body; plan §9.2 | The do-block keyword check does not see a side-effecting function called through `SELECT ... INTO` (M4 `set_config('role', ...)`, M5 `lo_import`): both pass the file. The wording "runs no ... setting" / "beyond reading the catalog" claims more than the regex holds. Residual of F170-2; what F170-2 named is closed. | Either narrow the wording (e.g. "no DDL, DML, `execute`, `set`/`reset` or `perform`"), or hold the block's statements to `select ... into offending from pg_catalog...` / `if ... raise` only. Optional; not merge-blocking. |
| F170-3 | INFO | `db/foundation/lint/pinned-grants.json:3` | Still "through 140"; owed and recorded on `[195]` (10). | As recorded: the next batch that touches the generator. |

No earlier finding of mine is open other than F170-3 (owed by record) and the unchanged F170-4/F170-5.

## 6. Stop-the-line

**None.** No secret, tenant leak, lost job, divergent migration, irreversible deletion or contract mismatch.
The round changed comments, one test block, the floor, a digest, and records; nothing a client executes.

**Does anything block the merge from A1's side?** No. R-2 is a guard gap for a future migration with no
live path today; R-1 is test precision. Whether the merge bar of RFC-2026-002 and `open_blockers[188]` is
met is the Integration Owner's and Product Owner's reading, not mine.

## 7. Limits

- Same vendor and model family as the Author (RFC-2026-024).
- The shim, not a hosted Supabase project; PostgREST itself not run, its request shapes sent as SQL.
- "Before" measured by restoring the pre-170 grant on the head's schema, not on a `9a07459` checkout.
- dB, dC, dD (membership, definer function, view) were not re-run this round; they are carried from my
  earlier run on `ff13faf`, and nothing they read changed (170's diff is comments).
- A0's `create rule` static mutation was read, not re-run; dR measured the runtime probe instead.
- R-2 was measured with one trigger shape (plpgsql, `BEFORE UPDATE`, function in `private`); an
  `INSERT`-time trigger or one in another schema was not tried.
- The large harness was not run.
