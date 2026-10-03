# Q0 independent test of batch 170-assert (assertion-only part)

**Package:** `WP-0A-DB-00`. **Subject:** branch `agent/claude/WP-0A-DB-00-batch-170-assert`, head `db995b6`
(code `dee6561`), base `2f6ab9e` (main), PR #171 (Draft). **Author:** `/claude/a0_atlas`.
**Tester run:** `/claude/q0_sentinel`. Checked out here as `review/q0-batch-170-assert` at `db995b6`.
Written 2026-10-04.

This file records findings. It advances no status, approves nothing, and decides none of Q170-a..d.

## 0. What I am

A subagent launched by a workflow of the Author run `/claude/a0_atlas`: the same vendor and the same model
family as the Author (RFC-2026-024). I am independent of the Author's draft and packaging runs and did not
write any of the subject's commits, but I am not independent of the Author's vendor or model. Accepting this
record as the Independent Tester's signature is the Integration Owner's and the Product Owner's act, not mine.

## 1. Measured vs read

Toolchain: Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`, checked with `node -v` before every
measured run; the PATH Node 26 was not used). PostgreSQL from `/opt/homebrew/bin`, `initdb --locale=C -A trust
-U postgres` afresh for every round, 127.0.0.1:5503 only, TCP only (`-c unix_socket_directories=''`),
`LC_ALL=C`, the shim `db/foundation/ci/supabase-shim.sql` first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean` and `make db-rls-smoke`.
Every drift was APPENDED to `db/foundation/migrations/140_audit.sql` in a private `git archive` copy of
`db995b6` and restored from a saved copy; its sha256 began `2ac596bb950e8dfb` after every one of 50 rounds (2 clean, 48 mutated).
The cluster was stopped and its data directory removed after every round; 5503 is free at the end. No other
port was touched. This worktree's tree was never mutated.

### 1.1 Gates on the branch NAME

The branch is checked out in two other worktrees, so I measured in a private clone with the branch checked out
by its real name `agent/claude/WP-0A-DB-00-batch-170-assert` at `db995b6` (not detached), `main` and
`origin/HEAD` at `2f6ab9e`:

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 2f6ab9e WP-0A-DB-00` | **0** | all 19 changed path(s) are declared, and every amendment explains one |
| `npm run check:handoff` | **0** | the handoff describes the branch: nothing substantive after its cited head |
| `npm run verify` | **0** | clean: tests 684, pass 684, fail 0 |

(A first `check:handoff` in the clone exited 91 only because the clone's `origin/HEAD` pointed at the source
worktree's branch rather than `main`; after `git remote set-head origin main` it exited 0. Recorded as a
measurement artefact, not a finding.)

### 1.2 Re-measured claims

| Claim | Where | Measured | Verdict |
|---|---|---|---|
| assertion floors 747 -> 788 and 2166 -> 2167 are the guard's own count | commit `dee6561`, plan §0.1, `scripts/test-suite-contract.mjs` | `stripNonCode` + `/\bassert\.\w+\(/g`: base 747 / 2166, head 788 / 2167 | TRUE |
| 55 WP line citations moved by exactly -1 (19 + 35 + 1) | `dee6561`, plan §0.1 | 55 changed numbers in the three files, every one by -1, no other change | TRUE |
| clean set: 66 tables, 43 table-level, 1328 column-level grants; 0 entries, 41 exceptions; 66 classified, 8 refused | plan §0.1, handoff | migrate-clean 0 with exactly these claims; rls-smoke 0 (1079 cases, 6 claims) | TRUE |
| generator `--check` reproduces both files byte for byte; exits 1 on a grant drift | plan §0.1, handoff | exit 0 on the clean set; exit 1 on every grant drift below | TRUE |
| blockers 18, 93, 115, 185 extended (prefix kept), 193 appended, no index moves | `dee6561` | old text is a prefix of each new text; 193 -> 194 blockers; only indices 18, 93, 115, 185, 193 differ | TRUE |
| twelve open tables, seven read by `authenticated` | README rule 17, blocker 193 | 12 / 7 from the lint files | TRUE |
| F1: classifying `published_posts` PROVIDER-3 fails rule 17 today | plan F1, Q170-d | round C2: migrate-clean 2, "authenticated SELECT on app.published_posts" | TRUE |
| ERD §9.1 rows `:448`, `:453`; 120:330, 120:563, 121:261, 121:297-298 | plan F1 | read; each line says what the plan says | TRUE |
| "held by app_worker (on 41 tables), authenticated (44) and app_authz (1)" | `scripts/db/run.mjs:1240-1241` | `pinned-grants.json`: app_worker on **51** tables, authenticated on **41**, app_authz on 1 | **FALSE** (Q-4) |
| "the other roles' reach, as grants, is now pinned" | `open_blockers[185]` extension, WP:438 | rounds G17, T07, T02 below | **OVERSTATED** (Q-1, Q-2, Q-3) |
| A0's report: "Committed plainly" for `dee6561`, `13cc635`; `db995b6` alone; push not forced; PR Draft | report, handoff | the log shows `db995b6` touches only the handoff; history is linear over `2f6ab9e` | consistent; push/PR state READ, not measured |
| the Owner's words, the #170 merge, CI run 37149325739 | disposition §1, §3 | READ only; not re-measured | not checked |

## 2. Mutation table

Layers: **sl** `make db-schema-lint`; **st** `node --test test-kits/db/foundation-contract.test.mjs
tests/db/identity/identity-isolation.test.mjs` (the static layer); **mc** migrate-clean; **rs** rls-smoke;
**gen** `generate-pinned-grants.mjs --check`. 0 = passed (the mutation was NOT caught by that layer).
"—" = not run (no DB-visible change). Names are the probe that named it at migrate-clean.

### 2.1 Grants, per role class (appended to 140)

| Id | Drift | sl/st/mc/rs/gen | Caught at mc by |
|---|---|---|---|
| G01 | `grant select (id) on app.workspaces to app_command` | 0/0/**2**/0/1 | pinned grant (unlisted) |
| G02 | `grant update on app.jobs to app_command` | 0/0/**2**/0/1 | pinned grant |
| G03 | `grant truncate on app.audit_logs to app_maintenance` | 0/1/**2**/0/1 | pinned grant |
| G04 | `grant select on private.meta_credential_references to service_role` | 0/1/**2**/0/1 | pinned grant |
| G05 | `grant delete on app.workspaces to app_worker` | 0/1/**2**/0/1 | pinned grant |
| G06 | `revoke insert on app.workspaces from app_worker` | 0/0/**2**/0/1 | pinned grant (missing) |
| G07 | `grant select on app.jobs to app_worker` (column -> table) | 0/0/**2**/0/1 | pinned grant |
| G08 | `grant select (lifecycle_state) on app.workspaces to app_authz` (the Q170-a shape) | 0/1/**2**/2/1 | pinned grant |
| G09 | `revoke select (status) on app.workspace_members from app_authz` | 0/0/**2**/2/1 | pinned grant (missing) |
| G10 | `grant select (external_post_hash) on app.published_posts to authenticated` | 0/0/**2**/2/1 | pinned grant only (published_posts is unclassified, F2) |
| G11 | `grant select on app.user_profiles to authenticated` (table-wide) | 0/0/**2**/0/1* | pinned grant; read allowlist ("(table)") |
| G12 | `revoke update (display_name) on app.user_profiles from authenticated` | 0/1/**2**/2/1 | pinned grant (missing) |
| G13 | `grant select (id) on app.workspaces to anon` | 0/1/**2**/0/1 | pinned grant; read allowlist |
| G14 | `grant select on app.audit_logs to public` | 0/0/**2**/2/1 | pinned grant; read allowlist |
| G15 | `grant select (name) on app.workspaces to authenticated with grant option` | 0/0/**2**/0/1 | pinned grant (WITH GRANT OPTION) |
| G16 | a new role granted SELECT on `app.jobs` | 0/0/**2**/0/1 | pinned grant |
| **G17** | `grant app_worker to app_command` | **0/0/0/0/0** | **nothing** (Q-1) |
| G18 | `alter role app_command superuser` | 0/0/**2**/0/0 | only the pinned grant probe's **self-test 4**, incidentally (Q-5) |
| G19 | `grant insert (id) on app.billing_webhook_receipts to authenticated` | 0/1/**2**/0/1 | pinned grant; data classification |
| G20 | `alter role app_authz superuser` | 0/0/**2**/2/1 | pinned grant (missing rows) |

\* G11's gen exit 1 is an uncaught `Error` ("a table-wide client SELECT ... not written into a closed list"),
not the `--check` difference (Q-6).

### 2.2 Tables and other relations (appended to 140)

| Id | Drift | sl/st/mc/rs/gen | Caught by |
|---|---|---|---|
| T01 | a new RLS-forced table `app.probe_q0_t`, no entry | **2**/1/**2**/0/1 | pinned grant ("unpinned"); data classification ("unclassified"); the existing schema lint |
| **T02** | `create schema probe_q0_ext`, a table in it, USAGE + SELECT to `app_worker` | **0/0/0/0/0** | **nothing** (Q-3) |
| T03 | `create view app.probe_q0_v` over `app.jobs` (input_ref), SELECT to `app_command` | **2**/1/0/0/0 | static only (schema lint; identity-isolation "no migration creates a view") |
| T04 | `create materialized view private.probe_q0_mv` over `private.meta_credential_references`, SELECT to `app_worker` | 0/1/0/0/0 | static only (the "no grant in `private`" tests) |
| **T07** | `create materialized view app.probe_q0_mv as select * from private.meta_credential_references; grant select on app.probe_q0_mv to app_worker` | **0/0/0/0/0** | **nothing** (Q-2) |
| T05 | a view over `app.jobs` granted to `authenticated` | **2**/1/**2**/0/1 | read allowlist ("(view)"); static |
| T06 | a sequence with USAGE, SELECT to `authenticated` | 0/0/0/0/0 | nothing; a sequence holds no row data (INFO, already owed in [185]) |

G17 confirmed by execution (round G17b, same cluster after migrate-clean exited 0):
`pg_has_role('app_command', 'app_worker', 'SET')` = `t`, `has_table_privilege('app_command', 'app.jobs',
'SELECT')` = `f`, and `set role app_command; set role app_worker; select count(*) from app.jobs` succeeds.

### 2.3 Allowlist, exceptions, pinned list and classification (data files, no drift unless stated)

| Id | Mutation | sl/st/mc/rs/gen | Caught at mc by |
|---|---|---|---|
| E1 | an exception row for `app.jobs` with no grant | 0/1/**2**/—/1 | read allowlist rule 2 |
| E2 | an allowlist entry for a view that does not exist | 0/1/**2**/—/0 | read allowlist rule 2 ("(view)"); st also by the digest (the SQL embeds the rows) |
| E3 | `app.workspaces` exception level `columns` -> `table` | 0/1/**2**/—/1 | read allowlist, both rules |
| E4 | the `app.notifications` exception removed, grant kept | 0/1/**2**/—/1 | read allowlist rule 1 |
| E5 | exception row + the grant (`select (id) on app.audit_logs` to authenticated) | 0/1/**2**/2/1 | pinned grant |
| P1 | pinned list narrower than the grant (one `app_worker` INSERT column dropped) | 0/1/**2**/—/1 | pinned grant (unlisted) |
| P2 | pinned list wider (authenticated SELECT (input_ref) on jobs, no grant) | 0/1/**2**/—/1 | pinned grant (missing) |
| P3 | P2 plus the grant: an "authorised" refused-class read | 0/1/**2**/0/1 | data classification ("authenticated SELECT on app.jobs") |
| C1 | `app.jobs` INTERNAL-3 -> TENANT-1 | 0/1/**2**/—/0 | the classification SQL embeds the refused list; st by its pinned names |
| C2 | `app.published_posts` -> PROVIDER-3 (F1) | 0/1/**2**/—/0 | data classification |
| C3 | `app.notifications` -> PII-2 (lifted out of a refused class) | 0/**1**/0/—/0 | static only ("resolved only INTO a refused class") |
| C4 | `billing_webhook_receipts` un-refused, plus a client grant | 0/1/**2**/0/1 | pinned grant |

### 2.4 Each new rule weakened in code, digests refreshed

The probe digest in `foundation-contract.test.mjs` was recomputed exactly as the test computes it and written
back, so the digest anchor is deliberately defeated; what remains is the static regexes and the self-tests.

| Id | Weakening | sl/st/mc/rs/gen | What still caught it |
|---|---|---|---|
| W1b | pinned grant role set `and rolname <> 'anon'` | **0/0/0**/—/0 | **nothing** (Q-5) |
| W1 | W1b plus `grant insert (name) on app.workspaces to anon` | 0/1/**0**/0/1 | static only (the RFC-021 §7/4 migration-text test); no probe at mc |
| W2b | data classification SQL drops `billing_webhook_receipts` | **0/0/0**/—/0 | **nothing** (Q-5) |
| W2 | W2b plus `grant insert (id) on app.billing_webhook_receipts to authenticated` | 0/1/**2**/0/1 | pinned grant |
| W3 | read allowlist skips `private` | 0/1/**2**/0/1 | static; client privilege, pinned grant, data classification at mc |
| W4 | pinned grant column rule skips `app.workspaces` | 0/0/**2**/0/1 | pinned grant itself ("missing" pinned rows: the closed list catches exclusion where rows exist) |
| W5 | the pinned grant table-list rule turned into a NOTICE | 0/1/**2**/—/0 | static ("3 rule(s) and 4 self-test(s)"); self-test |
| W6 | read allowlist rule 2 made `and false` | 0/0/**2**/—/0 | self-test drift 2 |

## 3. Findings

Grades: HIGH, MEDIUM, LOW, INFO. None is stop-the-line: every one is a gap in a rule this branch ADDS, and
each mutation that escapes would also escape main `2f6ab9e` (READ, not measured on main: the branch only
adds refusals and removes none). Nothing in the tree
does any of these today.

**Q-1 (MEDIUM). Role membership is reach the pinned grant probe does not read.**
`scripts/db/run.mjs:1291-1292` and `:1305-1306` read `has_table_privilege` / `has_column_privilege`, which
for a NOINHERIT role (`app_command`, `001_service_roles.sql:39`) exclude what it can `SET ROLE` to. G17
(`grant app_worker to app_command`) passes every layer, and `app_command` then reads `app.jobs` by
`set role app_worker`. The client membership probe reads client roles only. This contradicts the
`open_blockers[185]` extension (WP:438) "the other roles' reach, as grants, is now pinned", whose "STILL OWED"
list names functions, sequences and schema reach but not membership. **Remedy:** pin `pg_auth_members` among
non-superuser roles (closed list, with `set_option` and `inherit_option`) as a rule of the pinned grant probe
with a self-test drift, or record membership in `[185]` / `[193]` as owed and soften the claim.

**Q-2 (MEDIUM). A materialized view in `app` gives a non-client role SECRET-4 rows with every layer green.**
The pinned grant probe and the data classification probe read `relkind in ('r', 'p')` only
(`scripts/db/run.mjs:1274`, `:1404`); the read allowlist reads views but for client roles only
(`:1350-1357`); the static "no migration creates a view" regex is `create\s+(?:or\s+replace\s+)?view\b`
(`tests/db/identity/identity-isolation.test.mjs:8030` test, applied to all migration text) and does not match
`create materialized view`. T07 (`create materialized view app.probe_q0_mv as select * from
private.meta_credential_references; grant select ... to app_worker`) passes sl, st, mc, rs and gen; the view is
owned by the superuser that ran the migration, so it reads the credential table. (A plain view, T03, and a
matview in `private`, T04, are held by static tests only.) **Remedy:** extend the pinned grant probe's
table-list rule and grant rules to every relkind in `app` and `private` (`r, p, v, m, f`) and the static
view regex to `(?:materialized\s+)?view`; add a matview drift. Record it in `[185]` or `[193]` meanwhile.

**Q-3 (LOW). A new non-client schema escapes the pinned grant probe.**
The pinned list is scoped to `app` and `private` (`run.mjs:1274`). T02 (a new schema, a table, USAGE and
SELECT to `app_worker`) passes every layer. The client schema probe covers clients only. Within the plan's
stated scope ("every table in app and private"), so a scope limit, but not listed in `[185]`'s owed items.
**Remedy:** a closed list of non-system schemas, or state the limit in `[185]`.

**Q-4 (LOW). A comment in the shipped probe states wrong numbers.**
`scripts/db/run.mjs:1240-1241`: "held by app_worker (on 41 tables), authenticated (44) and app_authz (1)".
The committed `pinned-grants.json` gives `app_worker` on 51 tables, `authenticated` on 41, `app_authz` on 1.
**Remedy:** correct the comment (it changes no digest: comments are outside `PINNED_GRANT_PROBE_SQL`).

**Q-5 (LOW). Weakenings that remove a role or table with nothing pinned are invisible once the digest is
refreshed.** The closed list catches an exclusion only through its "missing" rows (W4 caught; W1b, W2b not).
W1b (`and rolname <> 'anon'`) passes static because the anchor at
`test-kits/db/foundation-contract.test.mjs:2978` is a prefix match and no pinned grant self-test drift uses
`anon`; W2b passes because the static test pins `REFUSED_CLASS_TABLES` (`:3084`) but not the SQL's interpolated
list, and no data classification self-test drift touches `billing_webhook_receipts`. Superuser promotion of a
role that holds nothing (G18) is caught only because `app_command` happens to appear in self-test drift 4.
The digest change is visible in review, which is the existing protocol's anchor, hence LOW. **Remedy:** anchor
the role CTE to its end of line; assert the classification SQL contains every refused table; add an `anon`
drift to the pinned grant self-tests; pin `rolsuper` for the non-superuser role set.

**Q-6 (LOW). The generator's refusals are partial and share exit 1 with `--check`.**
`scripts/db/generate-pinned-grants.mjs:93` reads `authenticated` only, so an `anon` or PUBLIC client SELECT
is silently left out of the exceptions file (G13: "read-allowlist-known-exceptions.json: matches the
catalog"), although its header (`:18-20`) says it refuses a measured client SELECT no migration grants. Its
refusals at `:95`, `:97`, `:100` are uncaught `Error`s, exit 1 with a stack trace (G11), the same code as
"DIFFERS". The generator is run by no make target, CI step or test and is not in the integrity manifest.
**Remedy:** read every client role, exit with a distinct code on refusal, and say in the README that it is a
reviewer's tool, not a gate.

**Q-7 (INFO). The read allowlist and the classification registry only ever add refusals at mc; the
rules that would lift a table out of a refused class are static-only** (C3). That is the design the plan
states; recorded so the layer is known.

**Q-8 (INFO). Handoff reviewer line citation.** The handoff's "the pinned grant probe from :1232" lands
inside the section comment that starts at `run.mjs:1221`; `PINNED_GRANTS` is `:1248`, as the plan says.

## 4. Stop-the-line verdict

**No stop-the-line.** No secret exposure, tenant leakage, migration divergence or contract mismatch in the
tree: the branch adds no migration, policy or grant; every gate is green on the branch name; every new rule
refuses what it claims on the clean set, and every mutation except G17, T02, T03, T04, T06, T07, C3, W1, W1b
and W2b failed migrate-clean by name (§2). The escapes (Q-1, Q-2, Q-3) are
pre-existing on main and are gaps in claims, not regressions.

**Merge:** nothing here blocks the Owner's merge as a matter of Q0's test result. Q0 recommends that before
or with the merge, A0 records Q-1 and Q-2 as owed (in `[185]` or `[193]`) and softens "the other roles'
reach, as grants, is now pinned", and corrects Q-4. Whether that is a merge condition is the Integration
Owner's and the Product Owner's call; the RFC-2026-025 §5 points the disposition leaves open remain open.

## 5. Limits

- Single machine, PostgreSQL 17 from Homebrew, the shim's roles; no provisioned instance (Q170-c).
- rls-smoke ran once per round, not twice. CI was not re-run or read; PR #171's state was not read.
- The static layer is the two test files run directly, not `npm run check` per mutation.
- G17's execution check reads `app.jobs` with zero rows; it shows the privilege, not a data read.
- I am a same-vendor, same-model-family subagent of the Author's run (§0).
- Commands, logs and drift files are in the private directory `q0-170-assert/` of the session scratchpad
  (`round.sh`, `drive.mjs`, `drive2.mjs`, `drive3.mjs`, `results*.txt`, `r-<id>/`); they are not committed.
