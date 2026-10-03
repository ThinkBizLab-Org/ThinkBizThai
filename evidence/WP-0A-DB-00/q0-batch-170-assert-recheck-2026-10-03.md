# Q0 independent test re-check of batch 170-assert's review round

**Package:** `WP-0A-DB-00`. **Subject:** branch `agent/claude/WP-0A-DB-00-batch-170-assert`, head `77b6249`
(code `8f5424c`), base `2f6ab9e` (main), PR #171 (Draft). **Author:** `/claude/a0_atlas`. **Previous reviewed
head:** `db995b6` (my first pass: `q0-batch-170-assert-test-review-2026-10-03.md`, cherry-picked as `ede313c`).
**Tester run:** `/claude/q0_sentinel`. Checked out here as `recheck/q0-batch-170-assert` at `77b6249`.
Written 2026-10-04. NARROW: my own findings Q-1..Q-8 first, then the review round's new rules.

This file records findings. It advances no status, approves nothing, and decides none of Q170-a..d.

## 0. What I am

A subagent launched by a workflow of the Author run `/claude/a0_atlas`: the same vendor and the same model
family as the Author (RFC-2026-024). I did not write any of the subject's commits, but I am not independent
of the Author's vendor or model. Accepting this record as the Independent Tester's signature is the
Integration Owner's and the Product Owner's act, not mine.

## 1. Measured vs read

Toolchain: Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`; `node -v` checked before every
measured run and inside every round; the PATH Node 26 was not used). PostgreSQL 17 from `/opt/homebrew/bin`,
`initdb --locale=C -A trust -U postgres` afresh for every round, 127.0.0.1:5503 only, TCP only
(`-c unix_socket_directories=''`), `LC_ALL=C`, the shim first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean` and `make db-rls-smoke`.
Each round ran on a private `git archive` copy of `77b6249`; every drift was APPENDED to
`db/foundation/migrations/140_audit.sql` and restored from a saved copy, whose sha256 began
`2ac596bb950e8dfb` after each of 63 rounds (2 clean, 61 mutated). After the last round every mutated
file in both copies compared byte-equal (`cmp`) with the pristine copy. The cluster was stopped and its
data directory removed after every round; 5503 is free at the end. No other port was touched. This
worktree's tree was never mutated.

### 1.1 Gates on the branch NAME

`git checkout --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-170-assert` in this worktree, the same
commit `77b6249` (clean tree; `main` and `origin/HEAD` both `2f6ab9e`); switched back to
`recheck/q0-batch-170-assert` afterwards, without any change in between:

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 2f6ab9e WP-0A-DB-00` | **0** | all 22 changed path(s) are declared, and every amendment explains one |
| `npm run check:handoff` | **0** | the handoff describes the branch: nothing substantive after its cited head |
| `npm run verify` | **0** | clean: tests 684, pass 684, fail 0 |

CI: `gh pr view 171` shows head `77b6249`, Draft, open, not merged, check `bootstrap` SUCCESS (run
37153858421). That was READ through the API; I did not re-run it.

### 1.2 Re-measured claims (commit messages, plan §9, disposition, blockers, handoff)

| Claim | Where | Measured | Verdict |
|---|---|---|---|
| foundation-contract floor 788 -> 793, the guard's own count | `8f5424c`, plan §9.3, `scripts/test-suite-contract.mjs` | `stripNonCode` + `/\bassert\.\w+\(/g`: 793 (80 tests); identity-isolation 2167 (305) | TRUE |
| pinned grant digest `7a8fe3e222e6827f` -> `baa6379790cb8733`; the others unchanged | `8f5424c`, plan §9.3 | the static test passes on the tree (clean rounds st 0) and fails when the probe changes (W-rounds before refresh) | TRUE |
| manifest 88 digests | plan §9.3 | `integrity-manifest.json` `files`: 88 | TRUE |
| the probe has 6 rules and 6 self-test drifts | handoff acceptance (a) | clean mc: "refused each of its 6 drifts"; W13 static: "5 rule(s) and 6 self-test(s)" when one is turned into a NOTICE | TRUE |
| clean set: 66 / 43 / 1328, 0 memberships pinned, 0 + 41, 66 / 8, 1079 cases, 6 claims, generator 0 | plan §9.3 r1/r2, handoff | rounds clean and clean2: sl 0, st 0, mc 0, rs 0 (1079 cases, 6 claims), gen 0, with exactly these claims | TRUE |
| comment counts: app_worker 51, authenticated 41, app_authz 1 | `run.mjs:1240-1242` (Q-4) | counted from `pinned-grants.json` | TRUE |
| reviewer citation `run.mjs:1221` (section), `:1287` (SQL) | handoff (Q-8) | `:1221` is the section heading, `:1287` is `export const PINNED_GRANT_PROBE_SQL` | TRUE |
| 10 of 41 exception rows from 010/020/021 (5/4/1); 31 from 13 later migrations | `[18]`, `[93]`, exceptions `_what`, README rule 16, disposition Q170-b | from `granted_by`: 010 x5, 020 x4, 021 x1; 31 rows over 030, 040, 051, 061, 070, 080, 081, 090, 091, 100, 120, 121, 130 | TRUE |
| "28 of them first committed after RFC-021's approval on 2026-09-06" | `[18]` | RFC-021 status line: approved 2026-09-06 (READ). First-add commit dates: 030 and 040 on 2026-09-06 (3 rows); the other 11 files 2026-09-07..09-28 (28 rows) | TRUE at day granularity |
| twelve open tables, six pairing SECRET-4 with another class; 8 refused | README rule 17 | 12 / 6 / 8 from `data-classification.json` | TRUE |
| `metrics jsonb not null` at `121:161`; "the payload" at `121:297-298` | plan §9.2 C0 F5 | read: both lines as cited | TRUE |
| `[115]`, `[193]` extended with the old text as a prefix; `[18]`, `[93]`, `[185]` reworded in place; 194 blockers, no index moves, WP still 455 lines | `8f5424c`, plan §9 | only indices 18, 93, 115, 185, 193 differ from `db995b6`; 115 and 193 keep the prefix; 194 = 194; 455 = 455 | TRUE |
| `[185]` narrowed to "table and column grants"; owed: a grant TO a `pg_*` role, relations outside app/private | `[185]`, handoff | text as stated; N09 and T02/N07 below still pass every layer, as recorded | TRUE |
| cherry-picks clean, `-x` | plan §9.1 | each of `6012674`, `a4e798d`, `ede313c` names its source; each review file is byte-identical to its source commit (`git diff --stat` empty) | TRUE |
| G11 -> generator exit 3; G13 -> exit 1, "DIFFERS" | plan §9.2 | G11 gen **3**; G13 gen **1**; also G14 (PUBLIC table-wide) gen **3** | TRUE |
| W1b and W2b now red ("measured in memory") | plan §9.2 Q-5 | on a fresh cluster: W1b st **1**, mc **2**; W2b st **1** | TRUE |
| push `db995b6..77b6249`, not forced; PR Draft, not merged | A0 report | the remote ref is `77b6249`; history is linear over `db995b6`; the PR is Draft (READ via `gh`) | consistent |
| `diff -rq` against wf-...-1 before `--ignore-other-worktrees`; `commit-when-clean` exit 0 twice | A0 report, plan §9.1 | READ only | not checked |

No claim I checked is false.

## 2. Mutation table

Layers: **sl** `make db-schema-lint`; **st** `node --test test-kits/db/foundation-contract.test.mjs
tests/db/identity/identity-isolation.test.mjs` (static); **mc** migrate-clean; **rs** rls-smoke; **gen**
`generate-pinned-grants.mjs --check`. 0 = passed (the layer did NOT catch the mutation); `skip` = rs not
run (no DB-visible change). "Then" is the verdict at `db995b6` from my first pass.

### 2.1 Grants per role class (add, revoke, widen), re-run

| Id | Drift | sl/st/mc/rs/gen | Then | Caught at mc by |
|---|---|---|---|---|
| G01 | `grant select (id) on app.workspaces to app_command` | 0/0/**2**/0/1 | same | pinned grant |
| G02 | `grant update on app.jobs to app_command` | 0/0/**2**/0/1 | same | pinned grant |
| G03 | `grant truncate on app.audit_logs to app_maintenance` | 0/1/**2**/0/1 | same | pinned grant |
| G04 | `grant select on private.meta_credential_references to service_role` | 0/1/**2**/0/1 | same | pinned grant |
| G05 | `grant delete on app.workspaces to app_worker` | 0/1/**2**/0/1 | same | pinned grant |
| G06 | `revoke insert on app.workspaces from app_worker` | 0/0/**2**/0/1 | same | pinned grant (missing) |
| G07 | `grant select on app.jobs to app_worker` | 0/0/**2**/0/1 | same | pinned grant |
| G08 | `grant select (lifecycle_state) on app.workspaces to app_authz` | 0/1/**2**/2/1 | same | pinned grant |
| G09 | `revoke select (status) on app.workspace_members from app_authz` | 0/0/**2**/2/1 | same | pinned grant |
| G10 | `grant select (external_post_hash) on app.published_posts to authenticated` | 0/0/**2**/2/1 | same | pinned grant |
| G11 | `grant select on app.user_profiles to authenticated` | 0/0/**2**/0/**3** | gen 1 (stack trace) | pinned grant; read allowlist; generator REFUSED |
| G12 | `revoke update (display_name) on app.user_profiles from authenticated` | 0/1/**2**/2/1 | same | pinned grant |
| G13 | `grant select (id) on app.workspaces to anon` | 0/1/**2**/0/1 | gen: exceptions "matched" | pinned grant; read allowlist; generator now renders the anon row |
| G14 | `grant select on app.audit_logs to public` | 0/0/**2**/2/**3** | gen 1 | pinned grant; read allowlist |
| G15 | `... to authenticated with grant option` | 0/0/**2**/0/1 | same | pinned grant |
| G16 | a new role granted SELECT on `app.jobs` | 0/0/**2**/0/1 | same | pinned grant |
| **G17** | `grant app_worker to app_command` | 0/0/**2**/0/0 | **0/0/0/0/0** | **rule 4**: "app_command -> app_worker" |
| G18 | `alter role app_command superuser` | 0/0/**2**/0/0 | mc 2 by accident | **rule 3**: "app_command" |
| G19 | `grant insert (id) on app.billing_webhook_receipts to authenticated` | 0/1/**2**/0/1 | same | pinned grant; data classification |
| G20 | `alter role app_authz superuser` | 0/0/**2**/2/1 | same | rule 3 ("app_authz") and pinned grant |

### 2.2 Relations, re-run

| Id | Drift | sl/st/mc/rs/gen | Then | Caught at mc by |
|---|---|---|---|---|
| T01 | a new RLS-forced table in `app`, no entry | **2**/1/**2**/0/1 | same | pinned grant; data classification; schema lint |
| **T02** | a new schema, a table, USAGE + SELECT to `app_worker` | **0/0/0/0/0** | same | **nothing**: still owed on `[185]` (Q-3) |
| T03 | a view in `app` over `app.jobs`, SELECT to `app_command` | **2**/1/**2**/0/0 | mc 0 | rule 1: "not a table: app.probe_q0_v (relkind v)" |
| T04 | a matview in `private` over the credential table, SELECT to `app_worker` | 0/1/**2**/0/0 | mc 0 | rule 1 (relkind m) |
| T05 | a view over `app.jobs` granted to `authenticated` | **2**/1/**2**/0/0 | same | read allowlist; rule 1 |
| T06 | a sequence, USAGE + SELECT to `authenticated` | 0/0/0/0/0 | same | nothing (INFO; sequences owed on `[185]`) |
| **T07** | a matview in `app` over `private.meta_credential_references`, SELECT to `app_worker` | 0/1/**2**/0/0 | **0/0/0/0/0** | rule 1 (relkind m); static regex now matches |

### 2.3 New mutations on the review round's rules

| Id | Drift | sl/st/mc/rs/gen | Caught at mc by |
|---|---|---|---|
| N01 | `grant pg_read_all_data to app_command` | 0/0/**2**/0/0 | rule 4: "app_command -> pg_read_all_data". Extra: `pg_has_role(..., 'SET')` = t, so the reach is real |
| N02 | `grant app_worker to app_command with inherit false, set false` | 0/0/**2**/0/0 | rule 4 (options ignored, as stated) |
| N03 | a new role made a member of `app_worker` | 0/0/**2**/0/1 | rule 4: "probe_q0_m -> app_worker" |
| **N04** | `alter role app_worker bypassrls` | 0/0/**0**/**2**/0 | **not at mc**; rls-smoke fails 84 of 1079 cases (R-2) |
| N05 | `create recursive view app.probe_q0_rv ...`, SELECT to `app_command` | 0/**0**/**2**/0/0 | rule 1 (relkind v). The static view regex does not match `create recursive view` (INFO) |
| **N06** | `create view public.probe_q0_pv as select * from private.meta_credential_references`, SELECT to `app_worker` | 0/1/**0**/0/0 | **static only** (identity-isolation's view regex). Extra: as `app_worker`, 2 rows read; `has_table_privilege` on the base table = f (R-3) |
| **N07** | `create table public.probe_q0_copy as select * from private.meta_credential_references`, SELECT to `app_worker` | **0/0/0/0/0** | **nothing** (R-3, the Q-3 class, owed on `[185]`) |
| N08 | database owner -> `app_command`; `grant select on app.jobs to pg_database_owner` | 0/1/**2**/0/1 | pinned grant: "unlisted: app_command SELECT on app.jobs" (the implicit membership is inherited). Extra: `has_table_privilege` = t |
| N09 | `grant select on app.jobs to pg_monitor` (no member) | **0/0/0/0/0** | nothing: A1 R3, owed on `[185]`. No role reaches it while rule 4 pins no membership |
| N10 | `grant app_command to authenticated` | 0/0/**2**/0/0 | client membership probe; rule 4 |
| **N11** | `alter role app_worker createrole` | **0/0/0/0/0** | **nothing** (R-2) |
| N12 | `create role probe_q0_su superuser nologin` | 0/0/**2**/0/0 | rule 3: "probe_q0_su" |
| N13 | a SECURITY DEFINER function in `app` over the credential table, EXECUTE to `app_worker` | 0/0/**2**/0/0 | security definer probe (pre-existing) |

### 2.4 Allowlist, exceptions, pinned list and classification (data files), re-run

| Id | Mutation | sl/st/mc/rs/gen | Caught at mc by |
|---|---|---|---|
| E1 | exception row for `app.jobs` with no grant | 0/1/**2**/skip/1 | read allowlist rule 2 |
| E2 | allowlist entry for a view that does not exist | 0/1/**2**/skip/0 | read allowlist: "authenticated SELECT (view) on app.probe_q0_view" |
| E3 | `app.workspaces` exception `columns` -> `table` | 0/1/**2**/skip/1 | read allowlist |
| E4 | `app.notifications` exception removed, grant kept | 0/1/**2**/skip/1 | read allowlist rule 1 |
| E5 | exception row plus its grant (`audit_logs`) | 0/1/**2**/2/1 | pinned grant |
| P1 | pinned list narrower than the grant | 0/1/**2**/skip/1 | pinned grant |
| P2 | pinned list wider than the grant | 0/1/**2**/skip/1 | pinned grant |
| P3 | P2 plus the grant (a refused-class read "authorised") | 0/1/**2**/0/1 | data classification |
| P4 | a pinned entry for a matview plus the matview (T07's) | 0/1/**2**/0/1 | rule 1: "not a table: app.probe_q0_mv (relkind m), pinned but absent" (a pinned entry cannot admit a view) |
| C1 | `app.jobs` INTERNAL-3 -> TENANT-1 | 0/1/**2**/skip/0 | data classification (the SQL embeds the refused list) |
| C2 | `app.published_posts` -> PROVIDER-3 | 0/1/**2**/skip/0 | data classification: "authenticated SELECT on app.published_posts" |
| C3 | `app.notifications` -> PII-2 | 0/**1**/0/skip/0 | static only (Q-7, by design) |
| C4 | `billing_webhook_receipts` un-refused, plus a client grant | 0/1/**2**/0/1 | pinned grant |

### 2.5 Each new rule weakened in code, digests refreshed

The probe digest in `foundation-contract.test.mjs` was recomputed exactly as the test computes it and written
back, so the digest anchor is deliberately defeated.

| Id | Weakening (+ drift) | sl/st/mc/rs/gen | What caught it |
|---|---|---|---|
| W1b | both role CTEs `and rolname <> 'anon'` (no drift) | 0/**1**/**2**/skip/0 | static: the anchored count; mc: the anon self-test. **Q-5 closed** (was 0/0/0) |
| W2b | classification SQL drops `billing_webhook_receipts` (no drift) | 0/**1**/0/skip/0 | static: the refused-array assertion. **Q-5 closed** (was 0/0/0) |
| W7 | rule 1 `relkind in ('v', 'f')` (+ T07's matview) | 0/1/**2**/0/0 | static regex; self-test drift 1 (its matview) |
| W8 | rule 3 `and r.rolname <> 'app_command'` (+ G18) | 0/1/**2**/0/0 | static regex (anchored at `session_user;`); self-test drift 3 |
| **W9** | rule 4 `... as x from reach where reach.member <> 'app_worker'` (+ `grant app_authz to app_worker`) | **0/0/0/0/0** | **nothing** (R-1) |
| W9b | W9 with no drift | 0/0/0/skip/0 | nothing (R-1) |
| W10 | `PINNED_ROLE_MEMBERSHIPS = ['app_command -> app_worker']` (+ G17) | 0/1/**2**/0/0 | static: `deepEqual(..., [])` and the empty-array regex. At mc, the self-test fails |
| W13 | rule 4 `raise exception` -> `raise notice` (+ G17) | 0/1/**2**/0/0 | static: "5 rule(s) and 6 self-test(s)"; self-test drift 4 |

## 3. My first-pass findings, re-checked

| Finding | Status at `77b6249` | Evidence |
|---|---|---|
| Q-1 (MEDIUM) membership | **CLOSED** | G17, N01, N02, N03 mc 2 by rule 4; W10 and W13 are red. A residual weakening is R-1 |
| Q-2 (MEDIUM) a matview or view in app or private | **CLOSED** | T03, T04, T07, N05 mc 2 by rule 1; P4; W7 red |
| Q-3 (LOW) a relation outside app and private | **OPEN, recorded** on `[185]`, the handoff and README rule 7 | T02 and N07 still pass every layer. N06 is held by static checks only |
| Q-4 (LOW) comment counts | **CLOSED** | §1.2 |
| Q-5 (LOW) weakenings once digests are refreshed | **CLOSED** for W1b, W2b and G18 | §2.5. The same class reappears in the new rule 4 (R-1) |
| Q-6 (LOW) generator | **CLOSED** | G11 and G14 exit 3 with no stack trace; G13 renders the anon row; README rule 7 and the header say "reviewer's tool, not a gate" |
| Q-7 (INFO) the lift side is static-only | unchanged, by design | C3 |
| Q-8 (INFO) handoff citation | **CLOSED** | §1.2 |

## 4. New findings

Grades: HIGH, MEDIUM, LOW, INFO. None is stop-the-line. Nothing in the tree does any of these today; each is
a gap in a rule this branch adds, or an escape that main `2f6ab9e` has too. The second point is READ: the
branch only adds refusals.

**R-1 (LOW). Rule 4's static anchor has an open gap, and no self-test membership has `app_worker` as the
member.** The assertion at `test-kits/db/foundation-contract.test.mjs:3003` matches the recursive CTE, then
`[\s\S]*?`, then the empty-pin filter. A condition added inside that gap, on the
`select distinct format('%s -> %s', reach.member, ...) as x from reach` line (`scripts/db/run.mjs:1330`),
still matches. Self-test drift 4 (`run.mjs:1825-1828`) names members `app_command`,
`app_maintenance`, `probe_pinned_mid` and `service_role` only. So W9 (`where reach.member <> 'app_worker'`)
with the digest refreshed, plus `grant app_authz to app_worker`, passes sl, st, mc, rs and gen. This is the
same class as Q-5, and LOW for the same reason: the digest change is visible in review. **Remedy:** anchor
that select and the `) f` that follows it exactly, with no `[\s\S]*?` between the CTE and the filter. Or make
the self-test give every role in the set at least one membership.

**R-2 (LOW). A non-client role's attributes other than `rolsuper` are not read at migrate-clean.** Rule 3
holds the superuser set. `CLIENT_ROLE_FALSE_ATTRIBUTES` (`run.mjs:639`) holds `anon` and `authenticated`
only. N04 (`alter role app_worker bypassrls`) passes mc and is caught only behaviourally by rls-smoke (84 of
1079 cases fail). N11 (`alter role app_worker createrole`) passes every layer. In PostgreSQL 16+ CREATEROLE
does not by itself reach table data, which is READ, not measured, hence LOW. Neither attribute is named in
`[185]`'s owed list. **Remedy:** extend rule 3 to pin `rolbypassrls`, `rolcreaterole`, `rolcreatedb` and
`rolreplication` (false, or a pinned list) for every non-superuser role, with a drift. Or record it as owed on
`[185]`.

**R-3 (LOW, extends Q-3). The `public` schema is the nearest case of "a relation outside app and private".**
N07, a `create table public... as select * from private.meta_credential_references` granted to `app_worker`,
passes every layer. N06, the same thing as a view, is held only by identity-isolation's view regex, and as
`app_worker` I read 2 rows through it. `public` exists on every cluster and is not a new schema, so a remedy
that closes the list of NEW schemas would not reach it. `[185]`'s owed wording ("a relation outside app and
private that a non-client role can read") does cover it. **Remedy:** when `[185]`'s item is done, include
`public` in the rule. Recording that here is enough for now.

**R-4 (INFO). Rules 3 and 4 encode shim premises the provisioned platform does not share** (READ, not
measured). On a Supabase instance `supabase_admin` is a superuser and the migration owner `postgres` is not,
and `authenticator` is a member of `anon`, `authenticated` and `service_role`. The shim creates none of these
(`supabase-shim.sql:43-54`). Rules 3 and 4 would then be red by design, not just "read as unlisted" as F13
says for grants. **Remedy:** add to F13 and `[193]` (9) that Q170-c's measurement must pin the platform's
superuser set and memberships before these rules can run there.

**R-5 (INFO). The static view regex does not match `create recursive view`** (N05). Rule 1 catches it at
mc, so the regex is only defense in depth. **Remedy (optional):** `create\s+(?:or\s+replace\s+)?(?:temp(?:orary)?\s+)?(?:recursive\s+|materialized\s+)?view\b`.

## 5. Stop-the-line verdict

**No stop-the-line.** No secret exposure, tenant leakage, migration divergence or contract mismatch in the
tree. The review round adds no migration, policy, grant or role. Every gate is green on the branch name, and
CI `bootstrap` is green on `77b6249` (read). Both clean rounds pass every layer with exactly the claims the
plan states. Every claim I checked in the commit messages, plan §9, the disposition, the blocker edits and the
handoff is true (§1.2). Both of my MEDIUM findings (Q-1, Q-2) are closed by measurement, as are Q-4, Q-5,
Q-6 and Q-8. The escapes that remain (T02, N07, N09, N11, W9) are not regressions. T02, N07 and N09 are owed
in `[185]`. N11 and W9 are new LOW gaps in rules this branch adds (R-1, R-2).

**Merge:** nothing in Q0's test result blocks the Owner's merge. Q0 recommends that A0 either fixes R-1 and
R-2 or records them as owed in `[185]`, and adds R-4 to F13. Whether that is a merge condition is the
Integration Owner's and the Product Owner's call. C0's and A1's re-checks of this round and the Integration
Owner evidence (RFC-2026-025 §5) are still owed and are not mine to give.

## 6. Limits

- Single machine, PostgreSQL 17 from Homebrew, the shim's roles; no provisioned instance (Q170-c). R-4 is read.
- rls-smoke ran once per round. Data and code mutations without a drift skipped it.
- The static layer is the two test files run directly, not `npm run check` per mutation.
- Foreign tables (relkind f) were not exercised: no FDW server exists on the shim. Rule 1 names them by
  text, and that is READ.
- The extra execution checks (N01, N06, N08) show the privilege, plus N06's two rows. No data beyond the
  shim and rls-smoke fixtures exists.
- CI, the PR state and A0's `diff -rq` and `commit-when-clean` runs are READ, not re-measured.
- I am a same-vendor, same-model-family subagent of the Author's run (§0).
- Commands, logs and drift files are in the private directory `q0-170-assertr2/` of the session scratchpad
  (`round.sh`, `drive.mjs`, `results.txt`, `drifts/`, `r-<id>/`). They are not committed.
