# A1 security review: batch 170, the assertion-only part

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-170-assert` (PR #171, Draft, open, not merged),
  head `db995b6` (`db995b6477f49b55ea2ca79bc0b049fa1d151db1`) over code `dee6561`
  (`dee65613dd3fc88b35fb54eed1f5977139cfd15e`), base `2f6ab9e` (main). Author `/claude/a0_atlas`.
- **Checked out as:** local branch `review/a1-batch-170-assert` at `db995b6`, in this run's own worktree.
  The branch name itself is checked out in two other worktrees, so for `verify`, `check:handoff` and
  branch scope I made a local clone in my private directory (`a1-170-assert/repo`), created
  `agent/claude/WP-0A-DB-00-batch-170-assert` there at `db995b6` (`git rev-parse --abbrev-ref HEAD`
  printed that name; `main` and `origin/main` there are `2f6ab9e`) and measured on that name, not
  detached. I committed nothing in the clone.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch. I am the same
vendor and model family as the Author. Under RFC-2026-024 that is the stated independence limit of this
role run. Accepting this review as the A1 role's signature is the Integration Owner's and the Product
Owner's act, not mine.

## 1. Read and measured

**Read:**

- `CONTRIBUTING_AGENTS.md`.
- The plan, `a0-batch-170-assert-plan-2026-10-03.md`, and the disposition,
  `product-owner-disposition-2026-10-03-batch-170-assert.md`, both in full.
- All five commit messages, `2f6ab9e..db995b6`.
- `git diff 2f6ab9e..db995b6`, read as follows:
  - `scripts/db/run.mjs`: the whole hunk (probes 6, 6b and 6c, `:1221-1431`, and the three
    `CATALOG_RULE_PROBES` entries, `:1758-1813`), with the client privilege and client membership probes
    it relies on (`:425-665`) and schema lint's view rule (`:2178-2183`).
  - `scripts/db/generate-pinned-grants.mjs`: in full.
  - `read-allowlist.json`, `read-allowlist-known-exceptions.json`: in full. `pinned-grants.json` and
    `data-classification.json`: read by script (holders, classes, findings, the client rows of every table
    whose §5 row names a refused class).
  - The batch 170 blocks of `foundation-contract.test.mjs`, the `identity-isolation.test.mjs` hunk,
    `test-suite-contract.mjs`, `branch-identity.test.mjs`: in full.
  - README rules 7, 16 and 17.
  - `work-packages/WP-0A-DB-00.json`: every `open_blockers` entry that differs from `2f6ab9e`, by script
    (only `[18]`, `[93]`, `[115]`, `[185]` differ, each keeping its old text as a prefix; `[193]` is new and
    last; 193 → 194 entries), and `ownership`.
  - The handoff: every field.
- Governing text: RFC-2026-021 §8.1-§8.5 (`:406-468`) and its header (approved 2026-09-06); the phase
  plan's "Batch 170" section (`a0-phase-plan-141-170-2026-10-03.md:210-226`); the 127 and 129
  dispositions, for the quoted Owner words.

**Measured** (Node `v24.20.0`, checked before each measured run; PostgreSQL from `/opt/homebrew/bin`;
127.0.0.1:5501 only, TCP only, `-c unix_socket_directories=''`; `initdb --locale=C -A trust -U postgres`
afresh every round; `LC_ALL=C`; the shim first; `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres`;
every drift APPENDED to `140_audit.sql` from a saved copy and restored after the round, sha256
`2ac596bb950e8dfb…37149` before, after every round and at the end):

| command | where | exit | result |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs 2f6ab9e WP-0A-DB-00` | clone, on the branch name | **0** | "all 19 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | clone, on the branch name | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | clone, on the branch name | **0** | "clean: exit 0 — tests 684, pass 684, fail 0" |
| `make db-migrate-clean`, `make db-rls-smoke` (r0, r1, r2: three clean rounds) | worktree, `db995b6` | **0**, **0** each | 26 probes, each refusing its drifts; pinned grant 66 / 43 / 1328, read allowlist 0 + 41, classification 66 / 8 / 0; 1079 isolation cases, 6 authz claims |
| second `make db-rls-smoke` on r2's database | same | **0** | 1079 cases |
| `generate-pinned-grants.mjs --check` (r0, r2) | same | **0**, **0** | both files match the catalog; 66 tables |
| `generate-pinned-grants.mjs --check` after d08 (below) applied | same | **1** | `pinned-grants.json: DIFFERS from the catalog` |
| PR #171 required check | GitHub | success | run 37150768335, "Bootstrap validation", head `db995b6` |
| #170's merge record | GitHub | — | merged 2026-10-03T19:56:36Z at head `1b79315`, merge commit `2f6ab9e`; run 37149325739 success on `1b79315` |

**Before and after** (the draft's claim that B2, C1 and A1 passed every layer on main and fail now;
main's tree extracted with `git archive 2f6ab9e` into the private directory):

| drift appended to 140 | main `2f6ab9e` mc / rs | head `db995b6` mc / rs | named at head by |
|---|---|---|---|
| (clean) | 0 / 0 | 0 / 0 | — |
| B2 `grant select on app.workspaces to authenticated;` | **0 / 0** | **2** / 0 | pinned grant (table, unlisted); read allowlist `(table)` |
| C1 `grant select (input_ref) on app.jobs to authenticated;` | **0 / 0** | **2** / 0 | pinned grant; read allowlist; data classification |
| A1 `grant select (input_ref) on app.jobs to app_command;` | **0 / 0** | **2** / 0 | pinned grant only |

**My drifts** (each a full round: fresh cluster, shim, drift appended to 140, migrate-clean (mc),
rls-smoke (rs); schema lint (sl) run separately with the same append; "probes" = each of the 26
`CATALOG_RULE_PROBES` run alone, `begin; drift; probe; rollback;`, on a migrated clean database,
script `a1-170-assert/probes.mjs`):

| id | drift | sl | mc | rs | probes that name it |
|---|---|---|---|---|---|
| d01 | `create role probe_su superuser nologin;` | 0 | **0** | 0 | none |
| d02b | `create role probe_su2 superuser nologin; grant probe_su2 to app_command;` | 0 | **0** | 0 | none |
| d03 | `grant app_worker to app_command;` | 0 | **0** | 0 | none |
| d04b | `grant usage on schema private to pg_monitor; grant select on private.meta_credential_references to pg_monitor; grant pg_monitor to app_command;` | 0 | **0** | 0 | none |
| d05 | `create view app.probe_v as select * from private.meta_credential_references;` + usage and select to `app_command` | **2** (not security_invoker) | 0 | 0 | none |
| d05b | the same view created `with (security_invoker = true)`, then `alter view app.probe_v2 reset (security_invoker);`, select to `app_command` | **0** | **0** | 0 | none |
| d06 | `create materialized view app.probe_mv as select * from private.meta_credential_references;` + select to `app_command` | **0** | **0** | 0 | none |
| d07 | a SECURITY DEFINER set-returning function over the same table, EXECUTE to `app_command` | — | 2 | 0 | security definer probe |
| d08 | `alter table app.notifications add column push_secret_ref text; grant select (push_secret_ref) on app.notifications to authenticated;` | 0 | 2 | 0 | pinned grant only |
| d09 | `alter role app_worker rename to app_worker_x;` | — | 2 | 2 | pinned grant ("missing: app_worker …") |
| d10 | `grant select (id) on app.audit_logs to public;` | — | 2 | 2 | pinned grant (every role); read allowlist (anon, authenticated, public) |
| d11 | `grant select (id) on app.ai_models to app_worker with grant option;` (beside its table-level SELECT) | — | 2 | 0 | pinned grant ("SELECT WITH GRANT OPTION (id)") |
| d12 | `create role web_reader nologin noinherit; grant select (id, input_ref) on app.jobs to web_reader;` | — | 2 | 0 | pinned grant only |
| d13 | `create table public.probe_copy as select * from private.meta_credential_references;` + select to `app_command` | 0 | **0** | 0 | none |
| d15 | `grant select (id) on app.workspaces to authenticated with grant option;` | — | 2 | 0 | pinned grant only |

Exercised on a database built with d02b, d03, d04b, d05 and d06 appended (mc 0, rs 0), then d05b
(mc 0, rs 0), as `set session authorization app_command`:

- without any membership, `select count(*) from app.jobs` → `permission denied for table jobs`;
- `set role app_worker` (d03) → `select count(*) from app.jobs` runs (`current_user` app_worker);
- `set role probe_su2` (d02b) → `current_setting('is_superuser')` = `on`;
- `set role pg_monitor` (d04b) → `select count(*) from private.meta_credential_references` runs, 0 rows
  (forced RLS, no policy for that role; the grant itself is live);
- `select count(*) from app.probe_v2` (d05b) → **2** rows of `private.meta_credential_references`
  (SECRET-4), read through a definer-rights view.

Generator laundering, measured: with d08 applied, the generator rewrote one line of
`pinned-grants.json`; a round with d08 appended and the regenerated file then gave mc **0**, rs 0; and
`node --test test-kits/db/foundation-contract.test.mjs` failed **1 of 80** — the probe digest test,
`pinned grant probe` `7a8fe3e222e6827f` → `3de86c3fbf1867e9`. The file was restored from a saved copy
(sha256 equal to `db995b6`'s blob, `82f2be6a…a714`).

Role catalog on the clean set: `anon`, `authenticated`, `service_role`, `app_worker`, `app_command`,
`app_maintenance`, `app_authz` are all NOINHERIT and NOLOGIN; `postgres` is the only superuser; the only
memberships are `postgres` in each `app_*` role (SET, not INHERIT) and pg_monitor's predefined three.
Relations in `app`/`private`: `r` 66, `i` 269, `S` 5; no view, materialized view or foreign table.

## 2. The questions

### 2.1 Can any role gain a privilege on an app/private table without the pinned grant probe naming it?

What the probe names, measured: a column grant beside a table grant when it adds something (d11's grant
option); a grant option at either level (d11, d15, self-test); a new table, in either schema, and a
pinned one renamed away (self-test; the draft's A4); a role renamed (d09: every pinned row of the old
name is "missing"); PUBLIC (d10: one unlisted row per role, since every role inherits PUBLIC); a new
non-superuser role (d12). A redundant column grant under a table grant is not named, and changes no
effective privilege (the plan's F10, stated).

What it does not name — **yes, a role can**:

1. **By role membership.** The probe reads `has_table_privilege`/`has_column_privilege`, which follow
   INHERITED privileges only, and every non-superuser role on this cluster is NOINHERIT. A membership
   grants SET ROLE, which nothing reads for a non-client role: d03 gives `app_command` all of
   `app_worker`'s reach, d02b makes `app_command` able to become a superuser, and d01 adds a superuser
   nobody pins. Each passed sl, mc, rs and all 26 probes, and d03 and d02b were exercised. The client
   membership probe (`run.mjs:640-665`) reads `anon` and `authenticated` only (`:647`). **R1.**
2. **Through a relation that is not a table.** The table list (`run.mjs:1274`) and the role reading read
   relkind `r` and `p` only. A definer-rights view or a materialized view in `app` over a `private`
   SECRET-4 table, granted to a non-client role, is read by no probe: the client privilege probe
   reads client roles only, and schema lint's text rule (`run.mjs:2179`) matches `create view app.x`
   without the option, not `alter view … reset (security_invoker)` and not `create materialized view`.
   d05b and d06 passed every layer, and `app_command` read two SECRET-4 reference rows through d05b. **R2.**
3. **By a grant to a predefined role.** The role set leaves out `pg_*` (`run.mjs:1292`, `:1306`), so a
   grant on a `private` table to `pg_monitor`, and `pg_monitor` granted to `app_command`, passed every
   layer (d04b). README rule 7 says the `pg_*` exclusion; the handoff does not. **R3.**

(d13, a copy outside `app` and `private` readable by a non-client role, is not a privilege on an
app/private table; recorded as a limit, §7.)

None of these is opened by this batch: on main no probe read any non-client role's reach at all. They
bear on how the batch's coverage is described (R1, R2, R3).

### 2.2 Does the read allowlist's two-way rule catch a client SELECT grant added under a new name?

- **Under a new relation name: yes.** A grant on a table no list names (C1, d10, the self-test's
  `app.jobs` and `app.user_profiles`), a view no entry names (self-test), and a table-wide SELECT over an
  excepted table (B2, read at level `table`, §8.4) are each named. A renamed excepted table is named
  both ways (rule 1 for the new name, rule 2 for the old).
- **Under a new ROLE name: no, by design.** `CLIENT_ROLES` is fixed to `anon`, `authenticated`,
  `public`. A SELECT for a new role (d12, `web_reader`) is named only by the pinned grant probe. Which
  role a client session becomes on the platform is the authenticator's membership, outside this cluster.
- **Under a new COLUMN or grant option on an excepted table: no.** The rule reads by relation and level,
  so d08 (a new column read by `authenticated` on `app.notifications`) and d15 (grant option) are named by
  the pinned grant probe alone. README rule 16 says so ("Which columns are granted is rule 7's").

### 2.3 Does the classification rule catch a client grant on a SECRET-4 column?

**No.** `columns` is `{}` (the ERD classes no column, plan F3), so rule 17's column half asserts
nothing. Its table half refuses the eight refused tables (C1 measured). The six tables whose §5 row pairs
SECRET-4 with another class (`ai_model_policies`, `ai_models`, `meta_connections`, `social_accounts`,
`notifications`, `notification_preferences`) are open findings with no class, so rule 17 holds none of
them. d08 put a secret-shaped column on `notifications` (PII-2/SECRET-4, read by `authenticated` today)
and granted it to the client: only the pinned grant probe named it. The handoff's acceptance says
"met at table level", which is accurate; README rule 17's heading ("on a table or column") is not. **R5.**

### 2.4 Anything newly opened, or a false sense of coverage?

Nothing is opened. The diff adds no migration, policy, grant or role. B2, C1 and A1 passed every layer
on main and fail migrate-clean by name on the head (measured). The false-sense points are R1–R5. One
positive, measured: re-running the generator after a drift does not quietly bless it. The probe's digest
test fails, so a new grant needs both a JSON diff and a digest edit in a protected test file (R6).

## 3. Findings

| id | grade | finding | where | remedy |
|---|---|---|---|---|
| **R1** | MEDIUM (coverage claim; pre-existing gap) | A non-client role's SET ROLE reach is not read. Every non-superuser role is NOINHERIT, so `has_*_privilege` misses what a membership gives. d03 (`grant app_worker to app_command`) and d02b (a new superuser granted to `app_command`) passed sl, mc, rs and all 26 probes and were exercised. d01 (a new superuser) passed every layer too. Yet blocker 185 says "THE OTHER ROLES' REACH, AS GRANTS, IS NOW PINNED", and its STILL OWED list does not name memberships or the superuser set. README rule 7 says the probe reads every role's "effective" privileges. | `scripts/db/run.mjs:1292`, `:1306`, `:647`; `work-packages/WP-0A-DB-00.json:438` (`[185]`); `db/foundation/README.md:439-442` | Extend the client membership probe to every non-superuser role: a recursive `pg_auth_members` closure pinned as measured (today, `postgres` → each `app_*` only). Add a rule that the superuser set is exactly the migration owner. Use d03, d02b and d01 as self-tests. Until then, name role memberships and the superuser set in `[185]`'s STILL OWED. Owner: A0. |
| **R2** | MEDIUM (coverage claim; pre-existing gap) | A view or materialized view in `app`/`private` that a non-client role can read is read by no layer. d05b (an invoker view switched off by `ALTER VIEW … RESET`) and d06 (a matview) over `private.meta_credential_references` (SECRET-4), granted to `app_command`, passed sl, mc, rs and every probe. `app_command` read 2 rows through d05b. Schema lint catches only d05's plain `create view` without the option. | `scripts/db/run.mjs:1274` (relkind `r`, `p`), `:2179`; `[185]` | Close the relation list, not only the table list. Rule 7's first rule could read relkinds `v`, `m` and `f` in `app`/`private` (none today, measured) so that any such relation is named. Or add a catalog rule, for every role, that every view in `app`/`private` is `security_invoker` and no matview or foreign table exists. Use d05b and d06 as self-tests. Owner: A0, on `[185]`. |
| **R3** | LOW | A grant on an app/private table to a predefined `pg_*` role is not read (d04b passed every layer). README rule 7 states the exclusion. The handoff's `security_privacy_cost_impact` ("any grant or revoke for any non-superuser role on any app or private table") and acceptance (a) ("every non-superuser role") do not. | `scripts/db/run.mjs:1292`, `:1306`; `handoffs/WP-0A-DB-00-author-handoff.json` | Read the grantees in `relacl` of `app`/`private` relations, and refuse any `pg_*` grantee. Or qualify both handoff sentences "non-superuser, non-`pg_*`". Owner: A0. |
| **R4** | LOW (a reading, for the RFC's owner) | RFC-021 §8.5 names the inherited grants as `010`, `020` and `021`'s. It closes the list as "exactly the grants that exist today", and the RFC was approved 2026-09-06. Ten of the 41 exception rows come from those three files. The other 31 come from 030 to 130, and the first commits of 28 of them are dated after 2026-09-06. The batch reads "today" as batch 170's day, which the phase plan's wording allows. Blocker 18 still says the list is "CLOSED as §8.5 asks", which presents a reading as conformance. No exposure changes: the grants exist and are now pinned. | `db/foundation/lint/read-allowlist-known-exceptions.json`; `WP-0A-DB-00.json:271` (`[18]`); README `:572`; RFC-021 `:461-467` | State the reading in `[18]` and README rule 16. Put the question to A1 (RFC-021's author) and the Owner, beside Q170-b (keep or convert): which grants count as "inherited". Owner: A0 to record it; A1 and the Owner to answer. |
| **R5** | LOW (wording) | README rule 17's heading says "No client privilege on a table **or column** classed SECRET-4 …", but the column half asserts nothing (`columns` is `{}`). Six SECRET-4-bearing tables are open and outside the rule, and d08 was named by rule 7 alone. The phase plan's item (c) asked for a column rule. The handoff's "met at table level" is accurate. | `db/foundation/README.md:581`; `db/foundation/lint/data-classification.json` | Qualify the heading ("table; column half empty until the ERD classes columns, F3"). If Q170-d is answered "pinned safe projection", pin the open tables' current client column sets as that projection. A new client column on an open SECRET-4-bearing table would then fail rule 17, not only rule 7. Owner: A0, with Q170-d. |
| **R6** | INFO (positive) | The generator cannot quietly bless a drift. After d08, `--check` exited 1. A regenerated file made migrate-clean 0, but the foundation-contract probe digest test failed (1 of 80). The closed list rests on a reviewed JSON diff plus a digest edit in a protected test. The exceptions file is held the same way, and also by its count of 41. | `test-kits/db/foundation-contract.test.mjs` (digest map) | None. |
| **R7** | INFO | Records. `4d9c9ac`'s message still says "assertion floors 525 -> 590", while its content is 747 → 788. The cherry-pick resolution changed the content, not the message; `dee6561` and the plan say so. The plan's §1 and §3 keep the draft's 525 → 590 and 677 tests, labelled as the draft's and superseded in §0.1. My migrate-clean wall times (9–14 s, on a machine shared with other runs) are not comparable to F15's 4.6–4.7 s. | plan `:99-104`, `:134` | None required. |

## 4. Claims checked

True as stated (measured or read):

- Cherry-picks. `e3f1db7`'s patch is byte-identical to `1319042`'s. `4d9c9ac` differs from `3b04a7b` only
  in `scripts/test-suite-contract.mjs` (the floors and their comments) and the integrity manifest's
  digests of the two files. `foundation-contract.test.mjs` merged without a conflict (its content hunk is
  equal).
- Floors 747 → 788 and 2166 → 2167. No test was added or renamed, so the suite stays at 684 (verify
  passed 684/684 on the branch name, and the coverage floor guard is inside `check`).
- `evidence/VERIFICATION.md` is out of `amends_without_owning`. Scope exits 0 with 19 paths.
- The 55 moved citations: retention-map 19, audit-coverage-map 35, store-conformance 1. Each one changed
  by exactly -1 (55 of 55), and nothing else on those lines changed. The tests that read them pass.
- The blockers. `[18]`, `[93]`, `[115]` and `[185]` are extended, each with its old text kept as a
  prefix. `[193]` is new and last. No index moves. The draft's citations WP:271, :346, :368 and :438 name
  `[18]`, `[93]`, `[115]` and `[185]` on this tree.
- The generator. It is 132 lines, refuses without `DB_TEST_URL`, `--check` exits 0 on the clean set and
  1 on a drift, and the output is deterministic (two `--check` runs on different fresh clusters both
  matched byte for byte).
- The handoff's reviewer citations: `run.mjs:1232`, `:1323`, `:1378`, and `foundation-contract:2985`.
  `identity-isolation.test.mjs:8040`. F9's test name at `:8029`.
- F1's condition. No table whose §5 row mixes a refused class with another class carries a class.
  `billing_webhook_receipts` is refused and nobody holds anything on it.
- The disposition. The Owner's words are verbatim in the 127 and 129 dispositions. #170's merge (head,
  commit, time and check run) matches GitHub. Q170-a to Q170-d are UNANSWERED, and nothing in the diff
  decides one.
- "Seven of [the twelve] read by `authenticated` today". The seven are `notifications` and six publisher
  tables.
- The handoff's head (`13cc635`) and `check:handoff` exit 0. PR #171's required check is green on `db995b6`.

Not true as worded: blocker 185's "the other roles' reach … is now pinned" (R1, R2); the handoff's "any
non-superuser role" (R3); blocker 18's "CLOSED as §8.5 asks" (R4, a reading); README rule 17's "or
column" (R5).

## 5. Stop-the-line verdict

**No stop-the-line.** No secret, tenant leak, duplicate side effect, lost job, migration divergence,
irreversible deletion or contract mismatch is introduced. The batch writes no migration, policy, grant or
role, and every drift in §1 that passes is a gap present on main too, in an area this batch narrows
rather than widens. Nothing here blocks the merge from the Security/Privacy side. R1 and R2 are MEDIUM
because the batch's records describe the closure more broadly than it is. I recommend that `[185]`'s STILL
OWED name role memberships, the superuser set and non-table relations (R1, R2) before or with the merge,
so the closure is not read wider than it is. The wording fixes (R3–R5) can follow. Q170-a to Q170-d stay
with their owners; this review answers none of them.

## 6. What I did not do

I fixed nothing, approved nothing and answered no Q-id. I did not push. The only file I wrote in the
repository is this one.

## 7. Limits

- Same vendor and model family as the Author (§0).
- One cluster, PostgreSQL from `/opt/homebrew/bin`, the shim's roles only. A provisioned Supabase
  instance (its roles, default ACLs, Data API exposure) was not read (Q170-c, F13).
- d13 (a table copied outside `app`/`private` and granted to a non-client role) passed every layer. It is
  not a privilege on an app/private table, so it is recorded here, not graded. Rule 3 of the client
  privilege probe holds the client side of it.
- Sequences (5 in `app`/`private`) and functions other than SECURITY DEFINER ones were not probed for
  non-client roles (`[185]` already owes them).
- The probe attribution (`probes.mjs`) runs each probe alone in a rolled-back transaction on a migrated
  database. It is equivalent to, but not the same run as, migrate-clean's own as-built pass. Each drift's
  migrate-clean and rls-smoke exits come from full fresh-cluster rounds.
- Migration first-commit dates (R4) come from `git log --diff-filter=A`, which records when a file first
  entered history, not when its grants were written.
- Cleanup. Port 5501's cluster was stopped and its data directory removed (`lsof` shows nothing on 5501).
  No other port was touched. `140_audit.sql` and `pinned-grants.json` are byte-identical to `db995b6`, and
  the worktree was clean before this file was added.
