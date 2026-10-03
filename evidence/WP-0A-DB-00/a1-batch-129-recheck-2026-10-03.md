# A1 re-check: batch 129's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-129` (PR #168, Draft), head `00bf2f5` over code
  `a9f7508`. Previous reviewed head `0f08d92`, base `75c9274` (main). Author `/claude/a0_atlas`.
- **Checked out as:** local branch `recheck/a1-batch-129-b` at `00bf2f5`, in this run's own worktree.
  An earlier A1 re-check run stopped before it measured anything. This run started fresh and used none
  of that run's output.
- **My earlier evidence:** `a1-batch-129-security-review-2026-10-03.md`, with findings R1 (MEDIUM), R2
  (LOW), R3 (LOW) and R4 (INFO).
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch. I am the same
vendor and model family as the Author. Under RFC-2026-024 that is the stated independence limit of this
role run. Accepting this re-check as the A1 role's signature is the Integration Owner's and the Product
Owner's act, not mine.

## 1. Scope

This is a narrow re-check. It covers three questions:

1. Does `a9f7508` close what it claims for R1, R2, R3 and C0 F1? For C0 F1 that means the in-memory
   comparison and the identity check on the baseline table.
2. Do the corrections regress anything or add a false positive?
3. Is the wording in the plan, blocker 186, the README and the handoff accurate about what the
   corrections cover?

I explored no new attack classes beyond these.

## 2. Read and measured

**Read:**

- `CONTRIBUTING_AGENTS.md`;
- `git diff 0f08d92 a9f7508` for `scripts/db/run.mjs`, `test-kits/db/foundation-contract.test.mjs` and
  `test-kits/integrity-manifest.json`, in full;
- `git diff a9f7508 00bf2f5` for README rules 5, 14 and 15, plan §5 and §9, blocker 186's added text in
  `work-packages/WP-0A-DB-00.json`, and the handoff's criteria, `security_privacy_cost_impact` and known
  limitations;
- `scripts/db/psql-driver.mjs`, for `feed`, `parseCsv` and the identity helpers.

**Measured.**

- Environment: Node `v24.20.0`, checked by `round.sh` before every round. PostgreSQL 17.11 from
  `/opt/homebrew/bin`.
- Cluster: a fresh `initdb --locale=C -A trust -U postgres` every round, with `LC_ALL=C`, on
  127.0.0.1:5501 over TCP only (`-c unix_socket_directories=''`).
- Order in every round: the shim, then the drift if there was one, then
  `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres make db-migrate-clean`, then
  `make db-rls-smoke`.
- Drifts: each was appended to `140_audit.sql` as a later-file drift. The file was restored after each
  round and checked with `cmp` against a copy taken first (sha1 `2ac2fc2c592be3b5fa7844ce12793093b782a502`).
- Layers in each drift round:
  - **static:** `node --test test-kits/db/foundation-contract.test.mjs tests/db/identity/identity-isolation.test.mjs`;
  - **sl:** `make db-schema-lint`;
  - **mc:** `make db-migrate-clean`;
  - **rs:** `make db-rls-smoke`.
- Private artefacts are in `.../scratchpad/a1-129r3/`: `round.sh`, `all.sh`, the drifts in `d/` and the
  logs in `logs/`.

### 2.1 Clean, and the suite

| Command | Exit | Output |
|---|---|---|
| `make db-migrate-clean` (fresh cluster, no drift) | **0** | "3753 objects initdb made, taken before the migrations and sealed"; "the 3753 objects initdb made, read again after the last migration and compared in memory, are as they were"; client membership probe refused each of its 3 drifts, fingerprint probe its drift, trigger probe each of its 6, each clean again |
| `make db-rls-smoke`, twice on that database | **0**, **0** | "db-authz-proofs: ok — 6 claim(s) discharged by execution", both times |
| `npm run check` (on `recheck/a1-batch-129-b` at `00bf2f5`) | **0** | tests 677, pass 677, fail 0 |
| `node scripts/verify-branch-scope.mjs 75c9274 WP-0A-DB-00` | **0** | "all 14 changed path(s) are declared, and every amendment explains one" |

On the clean set I found no false positive and no regression.

Catalog readings on the clean build:

- 56 initdb functions have `prosqlbody` set, and 56 of 56 have `prosrc = ''`, the same as my first
  review.
- `pg_db_role_setting` has 0 rows. `pg_event_trigger` has 0 rows.
- Every role but `postgres` has `rolcanlogin` false.

### 2.2 My drifts, per layer

None of these drifts repeats A0's drifts or the self-tests. Each one uses a shape that neither of them
used.

| Drift | What it does | static | sl | mc | rs | mc names |
|---|---|---|---|---|---|---|
| **r1** (R1) | Replaces `pg_catalog.obj_description(oid)` with another `BEGIN ATOMIC` body and `pg_catalog.round(numeric)` with `return trunc($1, 0)`, keeping invoker rights, volatility, strictness, parallel safety and cost as they were | 0 | 0 | **2** | 0 | "system object fingerprint, compared in memory: ... (2 ...): function pg_catalog.obj_description(oid) [changed], function pg_catalog.round(numeric) [changed]" |
| **r2** (R2) | `alter role authenticated in database postgres set search_path = public, app` and `alter database postgres set "request.jwt.claims" = '{...}'`. These are the role-in-one-database and database-wide forms | 0 | 0 | **2** | 0 | "client role setting default(s) not pinned ...: authenticated in database [redacted]: search_path=public, app, every role in database [redacted]: request.jwt.claims={...}" |
| **r3** (R3) | Creates an event trigger on `table_rewrite` over a SECURITY DEFINER function in `public`, then **disables** it, and creates a second one on `ddl_command_start` with `when tag in ('CREATE TABLE')` | 0 | 0 | **2** | 0 | "event trigger(s) not pinned ...: a1_r3_rewrite on table_rewrite, a1_r3_start on ddl_command_start" (the security definer probe also names the function) |
| **f1** (C0 F1) | Renames the baseline table and puts a **table** in its place, built by `create table ... as select` and holding the same rows, so the seal query answers the same. Adds `grant select on pg_catalog.pg_statistic to authenticated` | 0 | 0 | **2** | 0 | "its table was replaced while the migrations ran (16390 r rules=f triggers=f rls=f owner=10 before, 18422 r rules=f triggers=f rls=f owner=10 after)" |
| **f1b** (C0 F1) | Keeps the table and makes `_pg_char_max_length` SECURITY DEFINER. Then rewrites that function's row in the table to the new fingerprint, so the probe would see no difference | 0 | 0 | **2** | 0 | "its seal moved while the migrations ran (the table was rewritten)" |
| **r2login** (boundary, §3 N1) | `alter role postgres set "request.jwt.claims" = '{...}'`, a default on the role the sessions log in as | 0 | 0 | **0** | 0 | (not read; see N1) |

`140_audit.sql` was `cmp`-identical to the copy after every round and at the end.

**Pre-check for r1.** I applied r1 inside a rolled-back transaction on a clean build, and recorded the
result in `logs/pre-r1.log`:

- Both functions' fingerprint rows **without** `prosqlbody`, in `0f08d92`'s column list, are unchanged.
- With `prosqlbody` they differ.
- `ident` is unchanged.
- `round(2.7)` returns 2.

So r1 changes logic and nothing but the SQL-standard body. It is invisible to the fingerprint as it read
at `0f08d92`, and visible now. That is a catalog measurement. I did not re-run the old code end to end.
A0's plan §9.2 records the old code's run for its own R1 drift (every layer 0).

**SET ROLE does not apply role defaults** (`logs/q-setrole.log`, measured):

1. I ran `alter role authenticated set work_mem = '77kB'` and reconnected as `postgres`.
2. After `set role authenticated`, `work_mem` still read `4MB`, not `77kB`.
3. I reset the setting, and 0 rows were left.

## 3. Verdicts per finding

| Finding | Claimed change | Verdict | Basis |
|---|---|---|---|
| **R1** (MEDIUM) | `p.prosqlbody::text` in `SYSTEM_FINGERPRINT_ROWS`, a self-test shape and a static pin | **Closed** | r1 above. It covers both SQL-standard forms (`BEGIN ATOMIC` and `RETURN`) and covers `pg_catalog`, not only `information_schema`. The static pin reads the new column, the fingerprint's drift carries the shape, and A0's M-SQLBODY records the mutation failing. |
| **R2** (LOW) | A third rule in the client membership probe over `pg_db_role_setting`: `setrole = 0` or a client role, in any database, none pinned | **Closed as I asked for it, with a correction to my own remedy (N1)** | r2 above. It names the role-in-one-database form and the database-wide form, with no false positive on the clean set. |
| **R3** (LOW) | An event-trigger rule in the trigger probe, none pinned | **Closed** | r3 above. It names a disabled trigger, a tag-filtered one and one on `table_rewrite`, and the rule reads `pg_event_trigger` with no `evtenabled` filter. |
| **C0 F1** | In-memory comparison and the table's identity, before and after | **Closed for the shapes tried** | f1: a table swapped in, not a view, is refused by identity. f1b: an in-place row rewrite is refused by the seal, which runs first, and the in-memory comparison, which does not read the table, would name it too. A0's FV3, FV3n, SWAP, M-ID and M-MEM cover the view swap and each check alone. |
| **R4** (INFO) | No change | Unchanged, correct | Plan §9.2 records it. |

**Notes on the C0 F1 closure, from reading:**

- The rows read before the migrations are held in the executor's memory. The rows read after are read
  straight from the catalogs under `set local search_path = pg_catalog`, by the same text as the
  snapshot.
- `parseCsv` handles quoted newlines, so view definitions and node trees containing newlines parse as
  one field.
- The CSV layer cannot tell NULL from `''`. That does not touch the comparison: `ident` comes from
  `format` and `fp` is a `row(...)::text`, and neither is ever NULL. Inside the row text, NULL and `""`
  render differently.
- What remains trusted is the catalog output functions the reading calls. A superuser migration can
  replace those. The plan, blocker 186 and the handoff all say so.

## 4. New findings

### N1 (LOW, measured): the per-role arm of R2's rule reads defaults that never apply; the login role's are not read

- **What PostgreSQL does.** `anon` and `authenticated` are NOLOGIN, and the membership probe pins
  `rolcanlogin` false for both. PostgreSQL applies a role's `ALTER ROLE ... SET` defaults when that role
  logs in, and not on `SET ROLE` (measured above: `work_mem` stayed `4MB`). Client sessions reach these
  roles only by `SET ROLE`. In CI that is the driver's `set_config('role', ...)`. On the platform it is
  PostgREST's role switch from its login role.
- **What still holds.** The rule's `setrole = 0` arm (every role, in one database or all) reads defaults
  that do apply to client sessions. That arm is the part that matters, and r2 shows it holds.
- **What is not read.** No rule reads a default set on the role a session **logs in as**: `postgres` in
  CI, and the platform's login role in production. Drift r2login set `request.jwt.claims` on `postgres`
  and passed every layer.
- **Why that is not live today.** Neither the CI driver nor PostgREST is fooled by it, because both set
  `request.jwt.claims` and the role with `SET LOCAL` on every request.
- **How it would become live.** A `search_path` default, or any setting the policies read and the
  per-request preamble does not overwrite, would apply.
- **Who owns the miss.** This gap is in my own R2 remedy, which named client roles, PUBLIC and the
  database. The Author followed that remedy exactly.

The wording that overstates the rule:

- README rule 14: "since such a default applies before any statement a session runs".
- The probe's refusal: "each applied to every session of the role".
- The `run.mjs` comment: "applies to every session of that role before any statement runs".
- Plan §9.2 cites "a request.jwt.claims default for anon" as R2's measured closure, and blocker 186 item
  (ix) repeats it. For a NOLOGIN role that default is inert.

**Remedy:**

1. Say that per-role defaults on `anon` and `authenticated` are inert while `rolcanlogin` is pinned
   false, and that they are pinned empty as defence in depth.
2. Add the login role's defaults to blocker 186's "owed" list beside the platform's client role
   defaults. CI's login role is the superuser that runs the migrations, so pinning it in CI would have to
   exempt the run's own settings.

Nothing reachable on the clean set changes.

### N2 (INFO, measured): the refusal redacts the database name when it is the connection's

r2's refusal reads "authenticated in database [redacted]". The driver redacts the connection string's
parts from stderr, and here the database and the user are both named `postgres`. The rule still names
the role and the setting, so this affects diagnosis only. No remedy is needed. Another database's name,
such as `template1` in the fingerprint's own self-test drift, is printed.

### Wording checked and found accurate

- **Plan §5 and §9 and the README's rule 15.** Their statements of what the fingerprint reads match
  `SYSTEM_FINGERPRINT_ROWS`: name and schema, `prosrc` and `prosqlbody`, the relation identity check and
  the in-memory comparison. So does their list of what it does not read: types, operators, casts and the
  rest, an object made and dropped again, and the catalog output functions a superuser forgery could
  replace.
- **The handoff's `security_privacy_cost_impact`.** It scopes its claim with "within what plan section 5
  states ... and subject to its stated exclusions", and it records that the sentence as first written was
  broader than what the batch read.
- **Blocker 186's new text.** It records (vi) to (x) and the three owed items accurately, except for the
  R2 sentence that N1 corrects.
- **The handoff criterion "out of a migration's reach".** It is true of the reference relation. The
  output-function forgery stays owed, and the handoff's known limitations say so.

## 5. Stop-the-line verdict

**No stop-the-line. From A1's side, nothing in this re-check blocks the merge.**

- R1, R2, R3 and C0 F1 are closed for every shape I tried, at migrate-clean, by name.
- The clean run is green, and rls-smoke is green twice on one database.
- The suite passes 677 of 677.
- No secret, tenant leak, migration divergence or contract mismatch was found.
- N1 is LOW. It is a wording and coverage correction to my own earlier remedy, and nothing reachable on
  the clean set changes. Under the Owner's disposition of 2026-10-03, it goes to blocker 186 as owed
  unless the Owner chooses otherwise.
- N2 is INFO.

RFC-2026-002 still requires a green CI run on head `00bf2f5`, C0's and Q0's re-checks, and the
Integration Owner's or Owner's act.

## 6. Limits

- I measured `npm run check` on `recheck/a1-batch-129-b`, not on the branch name
  `agent/claude/WP-0A-DB-00-batch-129`, which is checked out elsewhere. The handoff guard's reading of
  the branch name was not measured by me.
- I did not re-run A0's drifts or mutations (FV3, FV3n, SWAP, RN3, M-ID, M-MEM, M-SQLBODY, M-IDENT). I
  read their record in plan §9.2 and §9.3.
- The "before" state for r1 is a catalog measurement in a rolled-back transaction, not an end-to-end run
  of `0f08d92`. For r2, r3, f1 and f1b I measured no "before". My first review and A0's plan §9.2 record
  that those classes passed every layer at `0f08d92`.
- I measured on PostgreSQL 17.11 only. The platform's login role and its role defaults (Supabase) are
  outside the CI shim.
- I am the same vendor and model family as the Author (§0).
- Cleanup: the cluster on 5501 was stopped, its data directory was removed, and the port is free.
  `140_audit.sql` is byte-identical to the copy taken first.
