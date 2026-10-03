# C0 contract review: batch 128, client roles, schemas and spellings the probes did not read

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-128`, head `b8435faf7f0d339ce101ceefccb49b3770679c8a`
  over code `d777d29`, base `18f1469` (main). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/167>.
- **Review branch:** `review/c0-batch-128`, checked out at the subject head `b8435fa`; this file is its only
  commit.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; `evidence/WP-0A-DB-00/a0-batch-128-plan-2026-10-03.md`;
  `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-128.md`;
  `git diff 18f1469..b8435fa` (12 files); blocker 186 (`open_blockers[185]` of
  `work-packages/WP-0A-DB-00.json`); `handoffs/WP-0A-DB-00-author-handoff.json`.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024 that makes this an independent-role run by configuration, not by provenance: I share the
Author's training and blind spots. Acceptance of this file as the C0 role's signature is the Integration
Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** Nothing I measured is reachable on the clean set. Every finding below is a later
  migration that could weaken a guarantee without any layer noticing, which is the same class as the
  127 re-check findings this batch closes. There is no tenant leak, secret, migration divergence or
  contract mismatch on the branch as built.
- **Blocks the merge: no, on my reading.** The batch strictly adds refusals. Each item it claims to
  close is closed for the drifts the 127 re-checks wrote, and I re-measured four of them myself. F1
  below is a residual hole in item 2's own reach. It should be **named in blocker 186 as owed**, which
  is a record correction and not a code change. Whether to fix it before the merge or carry it is the
  Owner's or A0's call under the standing delegation, not mine.

## 2. Measured vs read

### Measured (by me, on this head)

Node `v24.20.0` (`node -v` checked before every run; `/Users/bank/.local/node-v24.20.0/bin` first on PATH).
PostgreSQL 17.11 at `/opt/homebrew/bin`; `initdb --locale=C -A trust -U postgres`; 127.0.0.1:**5505** only,
`-c unix_socket_directories=''`; `LC_ALL=C`; the shim `db/foundation/ci/supabase-shim.sql` first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres`; a fresh initdb for every round. The database
layers ran on a `git archive` export of `b8435fa` in my private directory (`.../scratchpad/c0-128/wt`).
Each drift was appended to the export's `db/foundation/migrations/140_audit.sql` from a saved pristine copy
and restored after each round. `cmp` against the pristine copy (sha1 `2ac2fc2c592be3b5…`) passed after
every round and at the end, for both the export and this worktree, which no drift touched. The static,
`verify` and handoff commands ran in a private clone that had the branch checked out under its own name,
`agent/claude/WP-0A-DB-00-batch-128`, at `b8435fa`. That clone's `origin/HEAD` was set to `main`
(`18f1469`).

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 18f1469 WP-0A-DB-00` (branch name, head) | **0** | "all 12 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` (branch name, `origin/HEAD` = main) | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` (branch name) | **0** | "tests 677, pass 677, fail 0" (run twice, both 0) |
| `npm run check` (branch name) | **0** | |
| static: `node --test test-kits/db/foundation-contract.test.mjs tests/db/identity/identity-isolation.test.mjs` (clean) | **0** | |
| `make db-schema-lint`, `make db-migrate-clean` (clean round) | **0**, **0** | 23 catalog probes plus the pg_catalog guard. The client schema probe pins 4 triples, the client membership probe 0 roles, the security definer probe 5 plus 0 extension members. Each refused its drifts and was clean again. |
| `make db-rls-smoke`, twice on the same database | **0**, **0** | "1079 isolation case(s) passed", both times |

My first `check:handoff` exited 91. The cause was my clone's `origin/HEAD`, which pointed at the review
branch I had cloned from, so the guard saw `b8435fa` as the branch point. After
`git remote set-head origin main` it exited 0. The 91 was an artefact of my setup, not of the branch.

**Re-measured from the Author's table** (each layer: static / schema-lint / migrate-clean / rls-smoke):

| Drift | static | sl | mc | rs | Refusal (mc) |
|---|---|---|---|---|---|
| R0 `grant postgres to authenticated` | 0 | 0 | **2** | 0 | client membership probe: "authenticated -> app_authz, … app_worker, authenticated -> [redacted]", as the plan says |
| LU1 `set U&"client\005fencoding" to 'SQL_ASCII'` | **1** | 0 | **2** | 2 (nothing applied) | "140_audit.sql line 1019: … a U& escape spelling" (1019 because my drift has no header comment; the plan's 1020 has one) |
| V16 `grant create on schema app to authenticated` | 0 | 0 | **2** | 0 | client schema probe: "unlisted: authenticated CREATE on schema app" |
| V06b a definer `app.a1_all_ideas()` granted to authenticated and added to pgcrypto | 0 | 0 | **2** | 0 | "SECURITY DEFINER extension member(s) not pinned …: app.a1_all_ideas() (extension pgcrypto)" |

These match plan §3 exactly.

**My own drifts** (the findings below):

| Id | Drift | static | sl | mc | rs | Live effect, as `authenticated` with no JWT claims (the table itself returns 0 of 2) |
|---|---|---|---|---|---|---|
| X1 | `create view information_schema.c0_ideas as select id, workspace_id, created_by from app.content_ideas`, grant select, insert to authenticated | **1** (identity-isolation: "no migration creates a view") | 0 | 0 | 0 | reads **2 of 2** rows, across 2 workspaces |
| X1b | the same view built by a function's EXECUTE and the function dropped (F1sf's shape) | **0** | 0 | **0** | **0** | reads **2 of 2**, across 2 workspaces. **Every layer green.** |
| X2 | `set allow_system_table_mods = on; create schema pg_c0api; reset …`; USAGE to authenticated; the view as X1b; select, insert | 0 | 0 | **0** | **0** | reads **2 of 2**. **Every layer green.** |
| X2b | `set allow_system_table_mods = on`; the view built in **`pg_catalog`** as X1b; select, insert to authenticated | 0 | 0 | **0** | **0** | reads **2 of 2**. **Every layer green.** |
| X3 | SECURITY DEFINER `pg_catalog.c0_all_ideas()` granted to authenticated | 0 | 0 | **2** | 0 | held: the pg_catalog guard, "function c0_all_ideas()" |
| X5 | SECURITY DEFINER `information_schema.c0_all_ideas()` (count of `app.content_ideas`), EXECUTE to authenticated only | 0 | 0 | **0** | **0** | returns **2**. **Every layer green.** |
| X4 | `grant create on database postgres to authenticated` | 0 | 0 | **0** | **0** | `has_database_privilege(…,'CREATE')` true; `create schema c0_client_made` as authenticated succeeds (rolled back) |
| X6 | `alter role authenticated bypassrls` | 0 | 0 | 0 | **2** | held by rls-smoke alone: "FAILED — 347 of 1079 case(s)" |

On the built set (measured after X6, which touches only a role attribute), `pg_catalog` holds 266
relations and `information_schema` 69. None of either, and no function in either, has an OID at or above
16384. The only `pg_*` schemas are `pg_catalog` (11) and `pg_toast` (99). `allow_system_table_mods` is
`off` by default.

### Read, not measured

- The other drifts and mutations of plan §3 and §4 (R1r, V14c, V11, F1sf, F1srv, V13, the control, LU2,
  E2, DP5, NW, R1m, and every M row). I read their code paths in `run.mjs`, `psql-driver.mjs`, the
  foundation-contract test and `isolation-cases.mjs`, and they agree with the claims. I did not re-run
  them.
- The new rls-smoke case `owner-a-cannot-mark-a-teammates-notification-read-by-a-bare-update`. I measured
  1079 cases passing. I did not measure DP5 or MP5's refusal on exactly that case.
- `escapeSpellings` (`scripts/db/psql-driver.mjs:358-412`), read line by line. Comments and quoted
  identifiers are skipped. A literal is un-doubled and re-read. An E-string skips a backslashed character.
  A dollar tag is not opened after an identifier character, so `$1` opens nothing. Past depth eight the
  scan fails closed. The pre-filter `[uU]&["']|[eE]'` is sound, since nesting only doubles quotes. I
  found no static spelling of the three names that it misses. A run-time lookup such as
  `set_config(name, …) from pg_settings where name like 'client%encoding'` is the stated computed class.

## 3. Item by item: does each closed item do what blocker 186 and the 127 re-checks asked?

| Item | Asked | Verdict |
|---|---|---|
| 1. Client-role membership (Q0 N2, A1 N3) | Refuse `grant <role> to authenticated` followed by SET ROLE | **Closed.** The recursive read of `pg_auth_members` is independent of INHERIT, SET and ADMIN. R0 is refused by name (measured). The pinned set is empty, and on the shim plus every migration it is correctly empty: no role grants membership to `anon` or `authenticated`. The justification ("a pin is an RFC-sized decision") is sound. A client role's own attributes are not read (F3, INFO). |
| 2. Schemas read by name (A1 N1, C0 N1, Q0 N1) and client USAGE/CREATE (A1 N5) | Read every schema a client can reach, and pin client USAGE/CREATE | **Closed for new user schemas. Not closed for the schemas excluded as "system".** V16 is refused (measured). The four pinned triples (`authenticated` USAGE on `app`; anon, authenticated and PUBLIC USAGE on `public`) are what the built set holds, and they are justified by the shim and the grants in the migrations. But `information_schema` and any `pg_*`-named schema are excluded by name. A superuser migration can write in both, and clients hold USAGE on `information_schema` and `pg_catalog` by default. X1b, X2 and X2b pass every layer and cross tenants (**F1**). Database-level CREATE is not read either (**F2**). |
| 3. Extension-member SECURITY DEFINER (A1 N2) | Read definer functions hidden in an extension | **Closed** for the shape asked: V06b is refused by name (measured), and the pinned set is correctly empty (pgcrypto in `extensions`, plpgsql). The rule shares the first rule's exclusion of `information_schema`, and X5 passes every layer through it. That exclusion predates 128, so X5 sits in F1 as pre-existing. |
| 4. psqlLex U& and E'' (C0 N2, A1 N4, Q0 N7) | Refuse the escape spellings and correct the stated limit | **Closed.** LU1 is refused statically and by migrate-clean (measured). The limit is now stated as computed-at-run-time text, which is accurate. Over-refusal (any E-string, `1.e'`) fails closed and is stated. |
| 5. `notifications_update_own_read_state` (Q0 N3) | A layer that holds when pin and file are widened together | **Closed** by the bare-UPDATE rls-smoke case (read, and 1079 measured passing). The three owner-UPDATE policies without their own case are stated as still open (plan §5.4), which is accurate. |
| 6. `OR true` on narrowings (Q0 N4) | Refuse a widened narrowing statically | **Closed** for OR, TRUE and NOT. `1 = 1` is stated as not read. |
| 7a. MAINTAIN drift (Q0 N6) | A drift that names MAINTAIN | **Closed.** The drift is in the self-test (read). The clean round shows the probe's self-test refusing all 3 drifts. |
| 7b. Helper probe's five conditions (C0 N4, mine) | One drift name per condition | **Closed.** All five names are in the first drift (read), and the clean round refuses both drifts. |
| 7c. C0 F2 named (C0 N3, mine) | Name it | **Closed.** README rule 2 and `known_limitations[0]` of the handoff. |

## 4. Findings

### F1 — MEDIUM — Item 2 excludes `information_schema` and `pg_*` by name, and those schemas are client-reachable and writable by the migration owner

- **Where:** `scripts/db/run.mjs:451` (`NON_SYSTEM_SCHEMA`, used by the client privilege and client schema
  probes); `scripts/db/run.mjs:441` (the comment "a user schema cannot be named pg_*");
  `scripts/db/run.mjs:715` and `:734` (security definer rules 1 and 3,
  `not in ('pg_catalog', 'information_schema')`); `scripts/db/run.mjs:1090-1104` (the pg_catalog guard
  reads `pg_proc`, `pg_operator` and `pg_cast`, not `pg_class`, and not `information_schema`); README
  `db/foundation/README.md:459`; plan line 31; blocker 186's item (2).
- **What:** The plan and blocker 186 say item 2 now reads "every schema but the system ones". But
  `information_schema` is an ordinary schema owned by `postgres`, the migration role, and PUBLIC holds
  USAGE on it. With `set allow_system_table_mods = on`, a session parameter a superuser may set, the
  migration role can also create a `pg_*`-named schema and create relations in `pg_catalog`, where
  PUBLIC holds USAGE as well. The run.mjs:441 claim is true only for a non-superuser.
- **Measured:** X1b, X2 and X2b each put A1 V11's definer-rights view (A1's exploit) where no probe looks.
  Each passed static, schema-lint, migrate-clean and rls-smoke, and a claimless `authenticated` session
  read both workspaces' ideas (2 of 2) where the table returned 0. X5 does the same with a SECURITY
  DEFINER function in `information_schema`. X5 is pre-existing (rule 1 has excluded `information_schema`
  since it was written), but it is the same hole.
- **Grade:** MEDIUM, the grade A1 gave N1, which this is the remainder of. It is not stop-the-line:
  nothing is reachable on the clean set, where no object at OID 16384 or above exists in either schema
  (measured).
- **Remedy (for a later batch, or before merge if A0 prefers):** Read by object, not by schema name.
  Every relation and function with OID at or above 16384 in `pg_catalog` or `information_schema` is
  refused: extend the pg_catalog guard to `pg_class` and to `information_schema`, which the measurement
  shows is empty on the built set. The probes' `NON_SYSTEM_SCHEMA` then reads every schema whose
  namespace OID is at or above 16384, so a `pg_c0api` made by a superuser is read like any other.
  Statically refuse `allow_system_table_mods` in fed SQL, as the lexer refuses `client_encoding`. Add X1b,
  X2, X2b and X5 as self-test drifts. **In any case, blocker 186's item (2) and plan §1 item 2 should
  say "new user schemas", and list this as owed.**

### F2 — LOW — Database-level CREATE for a client role is not read

- **Where:** `scripts/db/run.mjs` client schema probe (`CLIENT_SCHEMA_PROBE_SQL`), which reads
  `has_schema_privilege` only.
- **Measured:** X4 (`grant create on database postgres to authenticated`) passes every layer. A client
  session then creates a schema of its own (rolled back).
- **Impact, as far as I measured:** none beyond that. The client owns what it creates, so it gains no
  RLS bypass. `pg_catalog` is searched first implicitly. Every definer and policy helper has
  `search_path = ''`. The one app function without a set search_path, `app.knowledge_scope_applies`,
  uses only `=` and `is not null` on `uuid`, which resolve in `pg_catalog`. I did not survey application
  code paths outside the database.
- **Remedy:** Add `CREATE` (and `TEMP`, pinned as PUBLIC holds it by default) on the database for anon,
  authenticated and PUBLIC to the client schema probe's pinned set.

### F3 — INFO — A client role's own attributes are not read at migrate-clean

- **Measured:** X6 (`alter role authenticated bypassrls`) passes static, schema-lint and migrate-clean.
  It is held by rls-smoke alone, with 347 of 1079 cases failing, so it is held loudly.
- **Remedy (optional):** have the membership probe also require `rolsuper`, `rolbypassrls`,
  `rolcreaterole`, `rolcreatedb` and `rolinherit` of anon and authenticated to be the measured values.
  It sits beside "what a client role may become".

### F4 — LOW — Plan §2 says the handoff's `tests` carry `check:handoff` and `npm run verify`; they do not

- **Where:** `evidence/WP-0A-DB-00/a0-batch-128-plan-2026-10-03.md:67-68`;
  `handoffs/WP-0A-DB-00-author-handoff.json` `tests`, 7 entries.
- **What:** The handoff records `npm run check` on the branch name at `0273a6a` (exit 0), but no
  `npm run check:handoff` and no `npm run verify` entry. I measured both at 0 on the head (§2), so the
  claim's substance holds and only the record is short.
- **Remedy:** Add the two entries to the handoff at the next refresh, or correct the plan's sentence.

## 5. Other claims checked

- **Ownership amendments:** `amends_without_owning` is now `scripts/test-suite-contract.mjs`,
  `test-kits/branch-identity.test.mjs` and `test-kits/integrity-manifest.json`, each changed and each
  explained in the rewritten rationale. `evidence/VERIFICATION.md` is correctly dropped: 128 adds no test,
  and the count stays 677 (measured). The foundation-contract assertion floor moves 480 → 494, and
  `verify` passes with it. Branch scope exits 0 on the branch name at the head (12 paths). The plan's
  "10" was on `d777d29`, before the plan, the disposition and the handoff.
- **Disposition:** It claims no new Owner words, and the decision table cites the 127 disposition §6. It
  records the merge of #166 as A0 executing the standing delegation, and says RFC-2026-002's literal rule
  is not met. Integration Owner evidence is still owed. I found nothing in it that overstates. `18f1469`
  is the merge of `f10c412` (`git log`).
- **Blocker 186:** "OWED TO BATCH 128" is marked closed, and "CLOSED BY BATCH 128" lists items (1)-(6) and
  the three notes with the measurements the plan gives. "STILL OWED" keeps Q0 N5, the computed-name
  limit, the other roles' reach, and (15)'s command-role half, (16) and (20). Item (2)'s wording is
  broader than what was closed (F1).
- **Handoff:** base `18f1469` and head `0273a6a`, with the handoff commit `b8435fa` last and alone.
  `known_limitations[0]` is C0 F2. `check:handoff` passes on the branch name.
- **No migration:** confirmed. No file under `db/foundation/migrations/` changed, and no number is asked
  of the Owner.

## 6. Limits of this review

- I am the same model family as the Author (§0). Shared blind spots are likely in exactly the place F1
  sits: what counts as a "system" schema.
- I re-ran 4 of the Author's 16 drifts and none of the 11 mutations. The rest are read (§2).
- Every database measurement is on the CI shim on PostgreSQL 17.11 locally. Nothing ran on the platform,
  where managed schemas and `authenticator` differ, as the plan states.
- I did not look for a second static spelling route beyond escapes (for example, a GUC alias). I know of
  none for `client_encoding` or `standard_conforming_strings`.
- Private artefacts (not in the repository) are under
  `/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/c0-128/`:
  `round.sh`, `d/*.sql` (drifts and post-queries), `logs/`, `static.log`, `static2.log`,
  `140_audit.sql.pristine`, the export `wt/` and the clone `clone/`. The cluster on 5505 was stopped and
  its data directory removed. `140_audit.sql` is byte-identical to the pristine copy in the export and in
  this worktree (`cmp`).
