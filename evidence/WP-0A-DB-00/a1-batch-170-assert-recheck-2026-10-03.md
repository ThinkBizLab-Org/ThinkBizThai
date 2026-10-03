# A1 security re-check: batch 170-assert, the review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-170-assert` (PR #171, Draft, open, not merged),
  head `77b6249` (`77b62499f96e3470dc7b2cc3e530065b45e7b900`) over code `8f5424c`
  (`8f5424c6eb966c4df7ae9ca4cde3b6161f44ccc7`), base `2f6ab9e` (main). Author `/claude/a0_atlas`.
  Previous reviewed head `db995b6`; my earlier review is
  `evidence/WP-0A-DB-00/a1-batch-170-assert-security-review-2026-10-03.md` (R1-R7).
- **Scope:** a NARROW re-check of the review-round corrections (`db995b6..77b6249`), my own findings first.
- **Checked out as:** local branch `recheck/a1-batch-170-assert` at `77b6249`, in this run's own worktree.
  For `verify`, `check:handoff` and branch scope I checked out the branch NAME in the same worktree with
  `git checkout --ignore-other-worktrees` (same commit; the worktree was clean; `git rev-parse --abbrev-ref
  HEAD` printed the name; `main` and `origin/main` are `2f6ab9e`), measured, made no commit on it, and switched
  back to `recheck/a1-batch-170-assert`. A clone outside the worktree was refused by the harness.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch. I am the same
vendor and model family as the Author. Under RFC-2026-024 that is the stated independence limit of this
role run. Accepting this re-check as the A1 role's signature is the Integration Owner's and the Product
Owner's act, not mine.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; my earlier review; the plan's §9 (`a0-batch-170-assert-plan-2026-10-03.md:292-365`);
the disposition's diff; the messages of `8f5424c` and `77b6249`; `git diff db995b6..77b6249` for
`scripts/db/run.mjs`, `scripts/db/generate-pinned-grants.mjs`, `scripts/test-suite-contract.mjs`,
`test-kits/db/foundation-contract.test.mjs`, `tests/db/identity/identity-isolation.test.mjs`, the three lint
files, README rules 7, 16 and 17, and every changed `open_blockers` entry (`[18]`, `[93]`, `[115]`, `[185]`,
`[193]`, by word diff); the handoff's `security_privacy_cost_impact`, its head, and the two reviewer
citations. Governing text as in my earlier review (RFC-021 §8.1-§8.5); nothing it cites changed.

**Measured.** Node `v24.20.0` checked before every measured run (the drift scripts put
`/Users/bank/.local/node-v24.20.0/bin` first and print `node -v` per round; one first clean round ran under the
PATH Node 26 by mistake, was discarded and re-run). PostgreSQL 17.11 from `/opt/homebrew/bin`; 127.0.0.1:5501
only, TCP only, `-c unix_socket_directories=''`; `initdb --locale=C -A trust -U postgres` afresh every round;
`LC_ALL=C`; the shim first; `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres`; each drift APPENDED
to `140_audit.sql` from a saved copy and restored after the round (sha256 `2ac596bb950e8dfb…37149` before,
after every round and at the end). Scripts: `a1-170-assertr2/round.sh`, `static.sh`, `gen.sh`, `drifts/*.sql`.

| command | where | exit | result |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs 2f6ab9e WP-0A-DB-00` | branch name | **0** | "all 22 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | branch name | **0** | "describes the branch: nothing substantive after its cited head" (cited head `8f5424c`; `77b6249` touches only the handoff) |
| `npm run verify` | branch name | **0** | "clean: exit 0 — tests 684, pass 684, fail 0" |
| r0, r1 (clean): `make db-migrate-clean`, `make db-rls-smoke` | `77b6249` | **0**, **0** each | pinned grant: "… no other relation is there … no superuser but the migration owner exists, every non-superuser role is a member of exactly the 0 pinned role(s) … 43 table-level and 1328 column-level … (self-test: refused each of its 6 drifts)"; read allowlist 0 + 41; classification 66 / 8 / 0; 6 authz claims |
| `generate-pinned-grants.mjs --check` on r1 | same | **0** | both files match; 66 tables |
| the same after `grant select on app.workspaces to anon` (live, not a migration) | same | **3** | "REFUSED, nothing written: a table-wide client SELECT for anon on app.workspaces" |
| the same after revoking that and `revoke select on app.notifications from authenticated` | same | **1** | stderr "a migration grants SELECT on app.notifications to authenticated and the catalog holds none (a later revoke?); not written"; both files DIFFER. The worktree stayed clean (`--check` writes nothing) |
| PR #171 required check | GitHub | success | "Bootstrap validation", run 37153858421, head `77b6249`, completed 2026-10-03T21:09:15Z |

Counted from the committed files: `pinned-grants.json` 66 tables, holders `app_worker` 51, `authenticated`
41, `app_authz` 1, 43 table-level and 1328 column-level privileges (Q0 Q-4's correction is true). The
exceptions file: 41 rows, 10 with a `granted_by` in 010/020/021 and 31 from 13 later migrations (030, 040,
051, 061, 070, 080, 081, 090, 091, 100, 120, 121, 130), as `[18]`, README rule 16 and the plan state. The three
cherry-picked review files are byte-identical to their sources (`git diff 5a97b45 6012674`, `401c0d3 a4e798d`,
`75d2e3a ede313c` on each file: empty).

**Drift rounds** (each a full fresh-cluster round; mc = migrate-clean, rs = rls-smoke):

| id | drift appended to 140 | mc | rs | named by |
|---|---|---|---|---|
| d01 | `create role probe_su superuser nologin;` | **2** | 0 | pinned grant rule 3: "superuser role(s) other than the migration owner …: probe_su" |
| d02b | `create role probe_su2 superuser nologin; grant probe_su2 to app_command;` | **2** | 0 | rule 3 (`probe_su2`) |
| d03 | `grant app_worker to app_command;` | **2** | 0 | rule 4: "role membership(s) of a non-superuser role not pinned …: app_command -> app_worker" |
| d04b | grant on `private.meta_credential_references` to `pg_monitor`; `grant pg_monitor to app_command` | **2** | 0 | rule 4: `app_command -> pg_monitor`, `-> pg_read_all_settings`, `-> pg_read_all_stats`, `-> pg_stat_scan_tables` |
| d05b | invoker view in `app` over that table, `alter view … reset (security_invoker)`, select to `app_command` | **2** | 0 | rule 1: "not a table: app.probe_v2 (relkind v)" |
| d06 | matview in `app` over that table, select to `app_command` | **2** | 0 | rule 1: "not a table: app.probe_mv (relkind m)" |
| d08 | new column on `app.notifications`, select on it to `authenticated` | **2** | 0 | pinned grant only (classification: no, §2.3) |
| d09 | `alter role app_worker rename to app_worker_x;` | **2** | **2** | pinned grant ("missing: app_worker …") |
| d10 | `grant select (id) on app.audit_logs to public;` | **2** | **2** | pinned grant (every role); read allowlist (anon, authenticated, public) |
| d11 | `grant select (id) on app.ai_models to app_worker with grant option;` | **2** | 0 | pinned grant ("SELECT WITH GRANT OPTION (id)") |
| d12 | new role `web_reader`, column SELECT on `app.jobs` | **2** | 0 | pinned grant only |
| d13 | `create table public.probe_copy as select * from private.meta_credential_references;` + select to `app_command` | 0 | 0 | none (owed on `[185]`, as stated) |
| n01 | `grant app_worker to pg_monitor;` | 0 | 0 | none; see §2.1 |
| n02 | usage and select on `private.meta_credential_references` to `pg_read_all_stats` | 0 | 0 | none (stated, README rule 7); see §2.1 |
| n03 | plain definer view in `public` over that table, select to `app_command` | 0 | 0 | none in the DB layers; the static view test fails (`static.sh`: exit 1) |
| n04 | `alter role app_worker bypassrls;` | 0 | **2** | rls-smoke (84 of 1079 cases) |
| n05 | `alter role app_command rename to app_command_x;` | **2** | 0 | only incidentally: four of the pinned grant self-test drifts name `app_command` and fail with 42704; the as-built pass is clean |
| n06 | `alter schema private owner to app_command;` | **0** | **0** | **none**, schema lint 0 (§2.1, S1) |
| n07 | `grant create on schema app to app_command;` | 0 | 0 | none (S3) |
| n09 | invoker view in `app` over `app.jobs`, select to `authenticated` | **2** | 0 | client privilege probe; pinned grant rule 1; read allowlist ("authenticated SELECT (view) on app.probe_newv") |
| n10 | sequence in `private`, usage/select to `app_command` | 0 | 0 | none (sequences owed on `[185]`, as stated) |
| n11 | `alter role app_worker createrole;` | 0 | 0 | none (S3) |
| n12 | `alter default privileges in schema private grant select on tables to app_command;` | 0 | 0 | none now; a later table would be named by rule 1 and rule 6 (S3) |
| n13 | `alter role app_command inherit;` | 0 | 0 | none; no membership exists to inherit (S3) |
| n14 | database owner set to `app_command` (implicit `pg_database_owner`); select on that table to `pg_database_owner` | **2** | 0 | pinned grant: "unlisted: app_command SELECT on private.meta_credential_references" |
| n15 | `create recursive view public.probe_rv (…) as select id, credential_reference from private.meta_credential_references;` + select to `app_command` | **0** | **0** | **none**; schema lint 0; static view test 0 (S2) |
| n16 | `grant select (id) on private.meta_credential_references to authenticated;` | **2** | 0 | client privilege, pinned grant, read allowlist, data classification |

(n08, `grant postgres to app_command`, failed to apply: `postgres` is already a member of `app_command`, 0LP01.)

Exercised: on n15's database, as `set session authorization app_command`,
`select count(*) from public.probe_rv` returned **2** rows of `private.meta_credential_references`
(SECRET-4 locators) while `select … from private.meta_credential_references` was refused ("permission denied
for schema private"). On n06's database, in a rolled-back transaction as `app_command`,
`drop table private.meta_credential_references cascade` succeeded (after rollback the table still held 2 rows).
`alter role pg_monitor login` is refused ("role name \"pg_monitor\" is reserved … Cannot alter reserved roles").

## 2. The questions

### 2.1 Can any role gain a privilege on an app/private table without the pinned grant probe naming it?

**My R1 and R2 are closed, measured.** Every drift of mine that passed every layer at `db995b6` against an
app/private table now fails migrate-clean by name: d01, d02b (rule 3), d03, d04b (rule 4), d05b, d06
(rule 1). The cases the question lists are named: a column grant that adds something under a table grant
(d11's grant option), a grant option at table or column level (d11, self-test), a new table (self-test), a
role rename that strands pins (d09), PUBLIC (d10), a new role (d12), and an implicit `pg_database_owner`
membership (n14, because `has_table_privilege` follows it). A redundant column grant under a table grant is
still not named and changes nothing (plan F10). Rule 4's SQL (`run.mjs:1321-1335`) follows memberships from
every non-superuser, non-`pg_*` role into any role, `pg_*` or superuser included, whatever the option.

**R3 (a grant TO a `pg_*` role) is still not read, as the README and handoff now say, and on this cluster it
is held transitively.** A predefined role cannot be made LOGIN (measured), so a grant to one (n02), or an
app role granted to one (n01), is reachable only by a member of that `pg_*` role: a superuser (rule 3 allows
only the migration owner), another `pg_*` role, or a non-superuser role, which rule 4 names. The README's
statement is accurate and conservative. On a provisioned platform, where a non-superuser login role is already
a member of `pg_*` roles, rule 4 would name that membership and fail first (S4).

**What remains, all pre-existing, none opened by this round:**

- **Schema ownership (S1).** `alter schema private owner to app_command` (n06) passed sl, mc and rs, and
  `app_command` could then DROP the SECRET-4 reference table. No rule reads `nspowner` of `app`/`private`
  for a non-client role (the client privilege probe reads client schema privileges only; the system
  fingerprint reads objects below OID 16384). This is a capability over every table in the schema, not a
  grant, and it is missing from README rule 7's "still does not read" list and from `[185]`'s STILL OWED.
- **Relations outside `app`/`private` (S2, stated).** d13 and n15 pass every DB layer, as `[185]` and README
  rule 7 say. The static "no migration creates a view" test (`identity-isolation.test.mjs:8030`) catches a
  plain or materialized view anywhere (n03), but its regex does not match `create recursive view`, so n15, a
  definer view in `public` over a SECRET-4 table read by `app_command` (2 rows, exercised), passed every layer
  and `npm`'s static test.
- Sequences (n10) and non-definer functions, owed on `[185]` as stated; non-client role attributes other than
  rolsuper (n04 is caught by rls-smoke; n11, n13 by nothing) and non-client schema CREATE and default privileges
  (n07, n12), none of which grants a privilege on an existing app/private table (S3).

### 2.2 Does the read allowlist's two-way rule catch a client SELECT grant added under a new name?

Unchanged in this round, re-measured: a new relation name, yes (n09, a new view: client privilege probe, rule
1 of the pinned grant probe and the read allowlist; d10, n16); a new ROLE name, no by design (d12, named by
the pinned grant probe alone); a new column or grant option on an excepted table, no (d08, d11: the pinned
grant probe alone). README rule 16 says so.

### 2.3 Does the classification rule catch a client grant on a SECRET-4 column?

**No**, unchanged and now stated. `columns` is `{}`; d08 is named by the pinned grant probe alone. README
rule 17's heading now reads "a TABLE …; the column half is empty until the ERD classes columns"
(`README.md:602`), and `[193]` (13) records my R5 projection remedy as tied to Q170-d. My R5 is closed as
wording. On a refused table, the rule names the client grant (n16).

### 2.4 Anything newly opened, or a false sense of coverage?

Nothing is opened: `8f5424c` adds no migration, policy, grant or role, and every code change makes a probe
stricter. The one relaxation, the generator reporting a later REVOKE instead of refusing it, is in a
reviewer's tool that no gate runs, and it is disclosed (plan §9 preamble, header, README rule 7, `[193]`
(11)); measured: exit 1 with the stderr line, and `--check` still differs. The wording now matches what I
measured, with two gaps in the "still not read" lists: S1 (schema ownership) and S2's static regex.

## 3. Findings

| id | grade | finding | where | remedy |
|---|---|---|---|---|
| **R1** (earlier) | closed | Memberships and the superuser set are rules 3 and 4, each with a self-test; d01, d02b, d03 and d04b fail mc by name | `scripts/db/run.mjs:1315-1335` | none |
| **R2** (earlier) | closed | Rule 1 names any view, matview or foreign table in `app`/`private`; d05b and d06 fail mc by name | `scripts/db/run.mjs:1300-1303` | none |
| **R3** (earlier) | closed as wording; residual held transitively (INFO) | The handoff and README say "non-superuser, non-`pg_*`" and name the residual. n01 and n02 still pass but are reachable only through a membership rule 4 names (`pg_*` cannot LOGIN, measured) | handoff `security_privacy_cost_impact`; `db/foundation/README.md:464` | none required; `[185]` may say the residual is held by rule 4 on this cluster |
| **R4** (earlier) | closed as recorded | The 10/31 split and "closing at 41 accepts the 31" are in `_what`, `[18]`, `[93]`, README rule 16, Q170-b; the counts are true | lint `read-allowlist-known-exceptions.json`; `WP-0A-DB-00.json` `[18]` | the reading stays with A1 (RFC-021's owner) and the Owner, with Q170-b |
| **R5** (earlier) | closed as wording | Rule 17's heading narrowed; projection remedy recorded on `[193]` (13) | `db/foundation/README.md:602` | with Q170-d |
| **S1** | LOW (coverage list incomplete; pre-existing) | Ownership of schema `app` or `private` by a non-client role is read by no layer. n06 (`alter schema private owner to app_command`) passed sl, mc and rs, and `app_command` then dropped `private.meta_credential_references` (rolled back). Rule 2 holds table owners to superusers; nothing holds the schema owner. Not in README rule 7's "still does not read" list or `[185]`'s STILL OWED | `scripts/db/run.mjs:1308-1314` (rule 2, tables only); `db/foundation/README.md:464-467`; `WP-0A-DB-00.json` `[185]` | Add to rule 2: `app` and `private` are owned by the migration owner (one line, with a self-test drift `alter schema private owner to app_command`). Or name schema ownership and schema CREATE for non-client roles in `[185]`'s STILL OWED and README rule 7. Owner: A0 |
| **S2** | LOW (static rule narrower than worded; within a stated gap) | The static "no migration creates a view" regex `/create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\b/i` misses `create recursive view` (and `temp`/`temporary`). n15, a definer recursive view in `public` over SECRET-4, granted to `app_command`, passed sl, the static test, mc and rs, and `app_command` read 2 rows. Inside `app`/`private` rule 1 would name it (relkind `v`); outside, it is the class `[185]` already owes (Q0 Q-3, d13) | `tests/db/identity/identity-isolation.test.mjs:8030` | Widen the regex to `create\s+(?:or\s+replace\s+)?(?:(?:temp\|temporary)\s+)?(?:recursive\s+\|materialized\s+)?view\b`, with an in-memory check. The DB-side remedy is Q0 Q-3's closed schema list. Owner: A0 |
| **S3** | INFO | Non-client role attributes other than `rolsuper` (n11 CREATEROLE, n13 INHERIT), schema CREATE (n07) and default privileges (n12) for non-client roles are read by no probe. None gives a privilege on an existing app/private table today (n12's would be named on the next table; n04 BYPASSRLS is caught by rls-smoke, 84 cases). A role rename of a role that holds nothing (n05) is caught only because self-test drifts name the role | — | Optional: a non-client role-attribute pin beside `CLIENT_ROLE_FALSE_ATTRIBUTES` (`run.mjs:639`). Owner: A0, if wanted |
| **S4** | INFO (applicability, Q170-c) | Rules 2, 3 and 4 assume a superuser migration owner and no membership among non-superuser roles. On a provisioned Supabase instance (owner `postgres` not superuser; platform superusers and memberships) they would fail by design, before any drift. That is the right failure direction, but the pins will need a measured platform set | `scripts/db/run.mjs:1308-1335` | Record with Q170-c's measurement; no change now |
| **S5** | INFO (positive) | The generator's claims hold: `--check` 0 on clean, 3 with no file written on a table-wide anon SELECT, 1 with the stderr line on a later revoke; Q0 Q-4's counts and the 10/31 split are true; the three review files are byte-identical to their sources; CI green on `77b6249` | — | none |

## 4. Claims checked

True as stated (measured or read): the commit messages of `8f5424c` and `77b6249` (three rules, each with a
self-test; digest `7a8fe3e222e6827f` → `baa6379790cb8733` and floor 788 → 793, both held by `npm run verify`
passing 684/684 on the branch name; "no migration, policy, grant or role"; `77b6249` touches only the
handoff); plan §9.1-§9.3, every row I re-measured (d01, d02b, d03, d04b, d05b, d06 fail mc by the quoted text;
the generator's exits 0/3/1; T02's class still passes, as d13 and n15 show); the disposition's Q170-b and
Q170-d rows (text only, nothing decided); `[185]` narrowed to "TABLE AND COLUMN GRANTS … ARE PINNED", with
the review round's CLOSED and STILL OWED lists; `[18]` no longer asserts "as §8.5 asks" as a fact; `[115]`,
`[193]` (11)-(13); the handoff's "non-superuser, non-`pg_*`", its reviewer citations `run.mjs:1221` (section 6's
header) and `:1287` (`PINNED_GRANT_PROBE_SQL`), its cited head `8f5424c`; branch scope 22 paths.

Not complete as worded: README rule 7's and `[185]`'s lists of what the rule "still does not read" omit
schema ownership (S1); the static view test is described as refusing views but misses `create recursive
view` (S2). Neither describes a check as stronger than measured for app/private tables.

## 5. Stop-the-line verdict

**No stop-the-line.** No secret, tenant leak, duplicate side effect, lost job, migration divergence,
irreversible deletion or contract mismatch is introduced; the round adds no migration, policy, grant or role,
and every DB-layer change is stricter. My two MEDIUM findings (R1, R2) are closed by rules that I re-measured
failing on my own drifts. S1 and S2 are pre-existing gaps that need a migration someone writes on purpose;
they bear on how the coverage list reads, not on what main exposes today. Nothing here blocks the merge from
the Security/Privacy side. I recommend S1's one-line rule (or its STILL OWED entry) and S2's regex with or
before the merge. Merging still needs what CONTRIBUTING_AGENTS.md and RFC-2026-002 require: C0's and Q0's
re-checks of this round and the Owner's act. Q170-a to Q170-d stay with their owners.

## 6. What I did not do

I fixed nothing, approved nothing and answered no Q-id. I did not push. I made no commit on the branch name.
The only file I wrote in the repository is this one.

## 7. Limits

- Same vendor and model family as the Author (§0).
- One cluster, PostgreSQL 17.11 from `/opt/homebrew/bin`, the shim's roles only; no provisioned instance (S4,
  Q170-c).
- n03 and n15's static result comes from running only the identity-isolation view test with the drift appended
  (`node --test --test-name-pattern=…`), not the whole `npm run verify`.
- The generator refusal and late-revoke checks were applied live to a migrated database with `--check`, not as
  migrations; `--check` writes nothing (worktree clean afterwards).
- I did not re-run Q0's in-memory weakenings (W1b, W2b) or C0's text checks beyond the counts above.
- Cleanup: port 5501's cluster was stopped and its data directory removed (`lsof` shows nothing on 5501).
  No other port was touched. `140_audit.sql` is byte-identical to `77b6249`'s.
