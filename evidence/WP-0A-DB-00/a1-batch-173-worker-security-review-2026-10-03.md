# A1 security review: batch 173 (migration 173, the worker's login identity, RFC-2026-028)

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-173-worker` (PR #184, Draft, OPEN, not merged), head `b001495`
  (`b0014953593364bfff6521b41a0ae13b3983d50b`) over code `eb413e9`, base `aa0e89f` (main). Author `/claude/a0_atlas`.
  The required check `bootstrap` (run `37285050018`, head `b001495`) completed **success** at 2026-10-05T09:03:50Z;
  I read its log for the worker proofs (§2, C0-2).
- **Checked out as:** local branch `review/a1-batch-173-worker` at `b001495`, in this run's own worktree
  (`wf_5ea6382b-87d-3`). For `verify-branch-scope`, `check:handoff` and `verify` I checked out the branch NAME
  `agent/claude/WP-0A-DB-00-batch-173-worker` in the same worktree (`--ignore-other-worktrees`, because worktree
  `wf_5ea6382b-87d-1` holds it; `git rev-parse --abbrev-ref HEAD` printed that name at `b001495`), committed nothing
  there, and switched back to `review/a1-batch-173-worker` before writing this file.
- **Status:** this file records findings. It advances no status and approves nothing: not batch 173, not
  RFC-2026-028, not D1-D12 of the disposition, not the migration number 173. It fixes nothing.
- **File name:** carries the phase's date (2026-10-03), as every record of this phase does; written 2026-10-05.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, of the same vendor and model
family as the Author and as the drafter of RFC-2026-028. Under RFC-2026-024 that is the stated independence limit of
this role run. Accepting this review as the A1 role's signature is the Integration Owner's and the Product Owner's
act, not mine. Where the RFC, plan or blockers name "A1's acceptance as DATA-DEC-03's co-owner" (RFC-2026-028 Status
line, `open_blockers[199]`), this file is a findings record about it, not that acceptance.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-173-worker-plan-2026-10-03.md`; the disposition
`product-owner-disposition-2026-10-03-batch-173-worker.md`; both commit messages; `git diff aa0e89f..b001495` (17
paths; in full: `173_worker_login_identity.sql`, the `scripts/db/run.mjs`, `authz-proofs.mjs` and `rls-smoke.mjs`
hunks, the RFC's Implemented line, the manifest's ownership and blocker edits, the credential-shaped lines of
`foundation-contract.test.mjs`); RFC-2026-028 whole; my own re-check of its review round
(`a1-batch-rfc-023-028-recheck-2026-10-03.md`, A1R-1..4); `psql-driver.mjs`'s `invoke`/`feed`/`scrubbedEnv`.

**Repository checks, on the branch NAME** (Node `v24.20.0`, checked first):

| Command | Exit | Result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs aa0e89f WP-0A-DB-00` | 0 | "all 17 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 691, pass 691, fail 0" |

**Live measurements.** Node `v24.20.0` checked before every round (the round script prints it); PostgreSQL 17.11
(`/opt/homebrew/bin`) on `127.0.0.1:5501` only, TCP only (`unix_socket_directories=''`), `initdb --locale=C -A trust
-U postgres`, `LC_ALL=C`, the shim first, then `make db-migrate-clean` and `make db-rls-smoke`; re-initdb every round;
private directory `scratchpad/a1-173-worker/`. Drifts were appended to `140_audit.sql` where the object exists at 140,
and to `173_worker_login_identity.sql` only where the drift names `app_worker_login`, which does not exist when 140
runs (the plan's D11 reason, which I accept); every file restored byte for byte (`cmp` after each round; at the end
sha1 `2ac2fc2c…` for 140 and `61ec25a7…` for 173, equal to `aa0e89f`'s and `b001495`'s blobs; `git status` clean).
The cluster was stopped and its directory removed at the end; port 5501 free (`lsof` exit 1).

| Round | What | Result |
|---|---|---|
| r1 | clean, `-A trust` | migrate-clean 0, rls-smoke 0; post-migrate pass 54/38/16; pinned grant probe "refused each of its 10 drifts", client membership probe 3; 1200 isolation cases; `db-authz-proofs: ok — 13 … 1 not run (worker-login-authentication)`; then P1-P14 and L1-L8 (§2) |
| r2 | `pg_hba`: `postgres` trust by name, every other role `scram-sha-256` | migrate-clean 0, rls-smoke 0; `worker-login-authentication` **RUN, ok** (wrong: `password authentication failed`; none: `fe_sendauth: no password supplied`; generated: connects); `db-authz-proofs: ok — 14`; afterwards stored credential null, guessed and empty passwords refused, no `tbt-worker-login-*` directory left; neither verifier nor plaintext in `server.log`, `migrate.log` or `smoke.log` |
| r3 | as r2 plus `host all app_worker_login 127.0.0.1/32 trust` first | rls-smoke 2: `FAIL worker-login-authentication`, "pg_hba line(s) 1 trust app_worker_login by name" |
| r3b | same cluster, line 1 replaced by `host all +app_worker 127.0.0.1/32 trust`, reloaded | the role connects with no credential; `authz-proofs.mjs` exit 0, **NOT RUN** (A1-173-2) |
| r5 | 140 + computed credential, `execute format('create role %I nologin noinherit %s %L', …, 'pass'\|\|'word', …)` | migrate-clean 2, rule 9: "holds a stored credential on a migrate-clean cluster …: a1_probe_cred" (r4, the same without `noinherit`, was refused one rule earlier by rule 8) |
| r6 | 140 + `create role … encrypted password '…'` | migrate-clean 2 before the first script: `140_audit.sql line 1020: a PASSWORD clause that is not PASSWORD NULL` |
| r7 | clean, fresh | as r1; then Q-028-13's local half (§2, Q1-Q3) |
| r8 / r9 / r10 | 173 + `alter role app_worker_login createrole` / `superuser` / `inherit` | each migrate-clean 2: rule 8 `rolcreaterole`; "superuser role(s) other than the migration owner …: app_worker_login"; rule 8 `rolinherit` |
| r11 / r12 | 173 + `grant create, temporary on database postgres to app_worker_login` / `grant execute on function app.knowledge_scope_applies(…) to app_worker_login` | each migrate-clean 2: 173's block in the post-migrate pass, "owns or is granted something of its own: a pg_database" / "a pg_proc" |
| r13 | 140 + `grant execute on function app.is_active_member(uuid) to app_worker` | **migrate-clean 0** (A1-173-3) |
| r14 | 140 + `grant create on database postgres to app_worker` | **migrate-clean 0**; then, logged in as `app_worker_login`: `set local role app_worker; create schema a1_worker_owned; create table …` succeed, schema owner `app_worker` (A1-173-3) |

Static (no database): `fedSqlSources()` returns 96 sources and `workerCredentialLint` finds nothing in them. Shapes I
fed it: `with password $q$x$q$`, `U&'x'`, `"password" 'x'`, `create user … password`, a clause four levels deep in
nested dollar bodies — each refused; a `:'p'` variable reference — refused as unclassifiable; `format('…pass' ||
'word %L')`, a `\gexec`-built statement and a split `'SCRAM-SHA-' || '256$…'` literal — not seen, which is the limit
the code states, held live by rule 9 (r5).

## 2. The questions

**Can `app_worker_login` log in without the harness's test password?** On a cluster that asks it (r2): no. With
the stored credential null after the run (read from `pg_authid`), no password is refused `fe_sendauth: no password
supplied` and a guessed one `password authentication failed`. The harness removes the verifier and the password
directory in its `finally` (r2: credential null, no directory left). On a `trust` cluster it logs in with nothing,
as every role does there (r1, L1); that is the RFC's stated scope (§3.3/1), not new. A `trust` line reaching the role
through a group (`+app_worker`) lets it in too and is reported NOT RUN, not FAIL: A1-173-2. **In CI** (run
`37285050018`, job "Database foundation" step of `bootstrap`): `ok worker-login-authentication`, RUN — the container's
`pg_hba` reads `… 128 host all scram-sha-256` after its `trust` lines, the wrong credential `password authentication
failed`, none `fe_sendauth: no password supplied`, the generated one connects; `db-authz-proofs: ok — 14 claim(s)`. So
C0-2's question (`open_blockers[201]` (6)) reads RUN on this head; recording it there is the Integration Owner's.

**Can it act with `app_worker`'s privileges without SET ROLE?** Not as migrated. P3: `pg_has_role(…, 'app_worker',
'USAGE')` false, `'SET'` true; P4/P5: USAGE only on `public`, `pg_catalog`, `information_schema`, no relation
privilege anywhere; L2/L3: `42501 permission denied for schema app` / `… schema private`. **But the role can change
that itself**: an ordinary role may set its own session defaults, and `alter role app_worker_login set role =
'app_worker'`, run AS `app_worker_login`, succeeds (L7); every later session then starts as `app_worker`
(`current_user` `app_worker`, `select count(*) from app.workspaces` returns 0 instead of `42501`, and after `commit`
of a `set local role` it is still `app_worker`). A1-173-1.

**Can it bypass RLS?** No. `rolbypassrls` false (P1); P9: no table `app_worker` can touch has RLS off or unforced, in
any schema it can use; under `set local role app_worker`: 22 of 22 readable tables read zero rows while the
connection role reads the fixture's (the proof, r7), `insert … default values` into `app.ai_model_policies` and
`app.jobs` refused `42501 new row violates row-level security policy` (L4), `update app.workspaces` 0 rows, `delete
from app.jobs` `42501` (L5). `set local session authorization postgres`, `set local role app_command`, `alter role
app_worker_login inherit|bypassrls`, `grant app_worker to app_worker_login with inherit true` all refused (L6).

**Can it reach any client path?** No. P6: it can execute no function in any non-system schema it can use; P7: the only
function `app_worker` can execute there is `app.knowledge_scope_applies` (invoker); `app.close_workspace` `42501`
(the proof); `set local role` to `authenticated`, `anon`, `app_authz`, `app_command`, `app_maintenance`, `postgres`
each `42501` (the proof), and to `service_role` `pg_has_role … SET` false (P3).

**Can it be granted a privilege directly without a probe naming it?** For the login role itself, no for every shape I
tried: table (rule's table arm, A0's D1), schema (rule 7), membership (4, 4b), attribute (8, r8-r10), default ACL (8),
setting (settings rule), ownership (rule 2), credential (9, r5; lint, r6), and — the catch-all — any ACL or ownership
on any object, database included, through 173's own `pg_shdepend` arm in the post-migrate pass (r11, r12). For
`app_worker`, the role it can now become: **yes**, a database `CREATE` and a function `EXECUTE` pass every probe
(r13, r14), and r14 shows the login role then creating a schema `app_worker` owns. A1-173-3.

**Does any fed source set a password?** No: 96 sources, `workerCredentialLint` empty; the migration's only clause is
`password null` (`173_worker_login_identity.sql:69`). The harness sets a client-computed verifier at run time
(`authz-proofs.mjs`), which is not a fed source; the probe self-test `alter role app_worker_login password
'probe-not-a-credential'` (`run.mjs`, pinned grant probe self-tests) is a plaintext in JS run inside a rolled-back
transaction, a probe value and not a credential; neither it nor the verifier reached the server log (r2).

**Is the session-GUC obligation testable?** The property is: `workerTransactionStartProblem`
(`authz-proofs.mjs:995`) is a pure function, executed in rls-smoke on two consecutive jobs with its control (r7:
`is_local true` → the second starts `''`; `false` → the uuid leaks and the check refuses). A self-set login default
for `app.workspace_id` is refused by PostgreSQL (`42501 permission denied to set parameter`, L7), so that route around
the check is closed. Two gaps: the production runner's copy is an obligation in prose (RFC-2026-028 line 6,
`open_blockers[201]` (5)) with nothing mechanical that makes the runner batch call it (A1-173-6, INFO); and the check
reads only the GUC, so the self-set `role` default of A1-173-1 passes it.

**Anything newly opened?** Yes, and by design: a non-superuser LOGIN identity that can become `app_worker` now exists
on every migrate-clean cluster, logging in with no credential on `trust` clusters. Today `app_worker` reads and writes
nothing (no policy names it), so the reach is zero rows. Two consequences the batch does not hold: the role can
re-point its own login defaults and credential (A1-173-1), and `app_worker`'s non-table privileges are unpinned while
something other than a superuser can now exercise them (A1-173-3).

**Q-028-13, local half** (r7, rolled back): 173 as written, applied by a non-superuser `CREATEROLE` role holding
`app_worker` with admin: one member row (`a1_owner`, grantor `postgres`, admin t, inherit f, set f), the block holds,
`set local role app_worker_login` refused, `alter role app_worker_login password null` succeeds (A1R-3: CREATEROLE with
ADMIN). With `createrole_self_grant = 'set, inherit'` in force and 173's `SET LOCAL` left out: a second row (grantor
`a1_owner`, admin f, inherit t, set t), and 173's block refuses naming both rows. With the setting in force and 173 as
written: one row — its `SET LOCAL` wins. A0's claim reproduced.

## 3. Findings

**A1-173-1 — MEDIUM. The login role can change its own session defaults and its own credential, which undoes §3.1's
fail-closed property for every later session, on any instance, and no rule reads it at run time.**
`db/foundation/migrations/173_worker_login_identity.sql:22-24` ("never ambiently"; "has no default setting");
`architecture/decisions/RFC-2026-028-worker-identity.md:111-115` (§3.1, fail closed before `SET LOCAL ROLE`),
`:178-183` (§3.3/2 "Who else can mint the credential" names the migration owner only), `:275` (§3.6 settings row, an
operator's `set role` default), `:278`; `scripts/db/run.mjs:649` (the settings rule's comment). Measured (L7): as
`app_worker_login`, `alter role app_worker_login set role = 'app_worker'` and `… set search_path = app` succeed, and
`alter role app_worker_login password '<verifier>'` succeeds (PostgreSQL lets an ordinary role set its own defaults
and its own password; `connection limit`, `valid until`, `inherit` and `bypassrls` are refused). After it, a new
session is `app_worker` from its first statement, a read of `app.workspaces` returns rows the worker's policies admit
(0 today) instead of `42501`, and `set local role` no longer returns it to itself at commit. Nothing catches it: the
settings rule runs on migrate-clean only and reads what migrations did; the snapshot is a point-in-time read; the A1R-2
check reads only `app.workspace_id`. It needs the worker's credential (or code execution in the worker) and grants
nothing beyond `app_worker`, so it is a defence-in-depth gap, not an escalation; its weight grows when the first
`TO app_worker` policy lands. A self-rotated verifier also reads `has_password: true` in the snapshot, the same as the
operator's. **Remedy:** (a) RFC-2026-028 §3.3/2 and §3.6 name the role itself among those who can set its credential
and its defaults; (b) the A1R-2 obligation (`open_blockers[201]` (5)) is widened: the production runner, at connect
and at each job transaction's start BEFORE `set local role`, refuses unless `current_user = session_user =
'app_worker_login'` and `pg_db_role_setting` holds no row for its role (readable by the role: L8), with the harness's
copy and a control (a self-set `role` default refused) in the harness now or in the runner batch; (c) Q-028-3's
custody runbook records that a worker-side `ALTER ROLE … PASSWORD` is possible and how it is detected on the platform
(statement log or audit of `ALTER ROLE`, or a verifier fingerprint compared at each snapshot where the reader can see
it). Owed before the provisioned instance gets a credential (Q-028-3), not before this merge.

**A1-173-2 — LOW. A `trust` line that reaches the role other than by its exact name is reported NOT RUN and passes.**
`scripts/db/authz-proofs.mjs:1067` (`users.split(',').includes(WORKER_LOGIN_ROLE)`), `:1073-1076` (a wrong credential
that connects → `ok = true, notRun = true`). Measured (r3b): `host all +app_worker 127.0.0.1/32 trust` before a
`scram-sha-256` line for everyone else: the role connects with no credential, `authz-proofs.mjs` exits 0, "NOT RUN".
The same holds for `@file` user lists and for a `trust` line restricted by database or address that the login happens
to match. RFC §5/12's drift is the by-name line, which is held (r3); but D10's "a pg_hba line trusting the role … is
a failure wherever it stands" is narrower in code than in words. In CI this matters only if the container's rules
change. **Remedy:** decide NOT RUN only when every rule in effect that the login can match is `trust` for user `all`
(the "cluster trusts everyone" case); any `trust` rule whose user list is not exactly `all` and that admits the role
(by name, `+group` it belongs to, or `@file`) is FAIL; add the `+app_worker` fixture to the fake-driver test.

**A1-173-3 — LOW. `app_worker`'s database-level privileges and per-role function EXECUTE are unpinned, and since this
batch a non-superuser login can exercise them.** `scripts/db/run.mjs` (the client schema probe pins database
`CREATE`/`TEMPORARY` for client roles only; the security definer probe pins "no EXECUTE for PUBLIC", not per-role
EXECUTE; the pinned grant probe pins tables and two schemas). Measured: `grant create on database postgres to
app_worker` (r14) and `grant execute on function app.is_active_member(uuid) to app_worker` (r13), each appended to
140, pass every layer (migrate-clean 0); after r14, logged in as `app_worker_login`, `set local role app_worker;
create schema a1_worker_owned; create table …` succeed, owner `app_worker`. Before 173 the only member of `app_worker`
was the superuser, for which these were moot (RFC-2026-022 §5/8); now they are reachable through a credential. Nothing
grants either today (P7, P12). The same drifts on `app_worker_login` itself are caught by 173's `pg_shdepend` arm
(r11, r12), which reads only that role. **Remedy:** extend the database arm (CREATE, TEMPORARY, CONNECT with grant
option, per database) and a per-role EXECUTE pin over functions in `app`, `private` and every non-system schema to
`app_worker` (and the other service roles), each with drift C and D as its self-test; owner A0 (the probes), on
`open_blockers[201]`.

**A1-173-4 — INFO (records). The drift record overstates what was executed, though the property holds.**
`work-packages/WP-0A-DB-00.json` `open_blockers[201]` (8) and plan §4 D12 (`a0-batch-173-worker-plan-2026-10-03.md:116`)
say the login role's `inherit` was "measured refused … as appended drifts"; the measured list D1-D11 (plan §3, the
handoff's `tests`) has `bypassrls` (D4) and no `inherit`. RFC-2026-028 line 6 says "§5/1-4 … executed"; §5/1 also names
`createrole` and `superuser`, in neither list. I measured all three (r8-r10): each refused by name. **Remedy:** add
r8-r10 (or A0's own) to the drift record at the re-check.

**A1-173-5 — INFO (accuracy).** `173_worker_login_identity.sql:81-82` says the block reads `pg_default_acl`; it does
not query it (its `pg_shdepend` arm covers a default ACL naming the role, which is equivalent for this role). And the
test credential's directory is the OS temporary directory (`authz-proofs.mjs:1022`), not "the cluster's own directory
or the job's temporary directory" of RFC §3.3/3; mode 0700/0600 and the `finally` hold (r2), but a killed run leaves
the plaintext file there and the verifier on the (throwaway) cluster, and the transcript prints the file's path (not
its content). **Remedy:** wording; optionally a stated limit.

**A1-173-6 — INFO (obligation without an anchor).** A1R-2's production check is prose (RFC line 6) and a blocker
(`[201]` (5)); nothing will fail if the runner batch omits it. **Remedy:** when the runner lands, a static test that
its transaction-start path calls the check (and A1-173-1's identity check), plus §5/13 through that code path, as
`[201]` (5) already says.

Carried, not new: A1R-3's sentence (`RFC-2026-028-worker-identity.md:179`, "`ADMIN` on a role is enough") is
unchanged, as the Implemented line says ("No other sentence of this file changed"); it stays on `open_blockers[199]`.
A1R-1 is resolved in code and reproduced (§2). A1R-2 is recorded as an obligation. A1R-4 rides on Q-028-13's platform
half.

## 4. Claims checked

| Claim (where) | Verdict |
|---|---|
| Role `LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD NULL`, one membership `inherit false, set true, admin false` (migration, commit, plan §1) | TRUE (P1, P2) |
| `set local createrole_self_grant = ''` first; block reads members per row both ways; no `pg_authid` read (A1R-1) | TRUE (file; Q1-Q3); the block's `'pg_catalog.pg_authid'::regclass` is a name lookup |
| Rule 4b, rule 8 one admitted attribute both ways, rule 9, settings rule, authenticator negative, `workerLoginSnapshotLint` (commit, plan §2) | TRUE as code; rule 9 live (r5); 4b, 8, settings via the probe's 10 self-tests (r1) |
| `workerCredentialLint` over 96 fed sources, every lexer level, run by schema-lint, migrate-clean before the first script, rls-smoke | TRUE (96, clean; r6 refused before any script; level-4 refusal); computed clauses unseen, as stated |
| Four proofs; 42501 schema message; app_worker only; no client command; 22 tables zero rows; no lingering workspace; NOT RUN on trust; controls red | TRUE (r1, r7); RUN on scram (r2); trust-by-name FAIL (r3); group trust NOT RUN (A1-173-2) |
| Credential 32 random bytes, client-computed SCRAM verifier, plaintext only in a 0600 PGPASSFILE, removed in `finally` | TRUE (code; r2 connects with it, so the verifier is the one checked; credential null and no directory after) |
| Pinned grant probe 10 self-tests (8 before), client membership 3; post-migrate 54/38/16; 1200 cases; 13 + 1 NOT RUN | TRUE (r1, r7) |
| Tests 688 → 691, floor 82 → 85; `verify` green | TRUE (691 pass) |
| `pinned-grants.json`, known exceptions: only `_how_measured` moves; `catalog-snapshot.json` declares 173 pending; `superseded.json` unchanged | TRUE (diff) |
| Manifest: branch slot; `[113]`, `[193]`, `[196]`, `[198]`, `[199]`, `[200]` appended; `[201]` added last; four amended-without-owning files named | TRUE: each old entry is a prefix of the new one; 201 → 202 entries; scope verifier exit 0 |
| D12 / `[201]` (8) "inherit measured as appended drift"; RFC "§5/1 … executed" | OVERSTATED (A1-173-4); property TRUE (r8-r10) |
| `b001495` changes only the handoff; `check:handoff` green | TRUE (one file; exit 0) |
| PR #183 merged at `58cff07`, merge `aa0e89f`, 2026-10-05T07:25:34Z, run `37275560917` green (disposition §2) | TRUE (`gh`) |
| PR #184 Draft, not merged | TRUE (`gh`: Draft, OPEN, head `b001495`) |
| Q-028-13 local half: one admin row with the setting empty, a second row refused by name with it set, the applier can alter the credential | TRUE (Q1-Q3) |
| "It holds app_worker's privileges only after `set local role app_worker`, never ambiently" (migration :22-23, RFC §3.1) | TRUE as migrated; the role can make it false itself (A1-173-1) |

## 5. Stop-the-line verdict

**No stop-the-line.** No secret, credential, connection string or customer data in the diff (the only verifier-shaped
strings are RFC 7677's public test vector, fake drift literals and regex patterns in tests; `npm run scan:secrets`
exit 0, and `verify` runs it); no fed source
sets a credential; the harness leaves none behind (r2); no tenant path is reachable that was not before (the new
identity reads and writes zero rows); the migration is new, no integrated migration is rewritten.

**Does anything in security block the merge?** No finding of mine does. A1-173-1 must be folded before the
provisioned instance gets a credential (Q-028-3, `[201]` (7)) — 173 is declared not applied there and no credential
exists anywhere outside a test run; A1-173-2 and -3 are LOW gaps in tests and pins, owed on `[201]`; -4 to -6 are
records. The required check is green on `b001495` (run `37285050018`) and CI ran §5/12 (RUN, ok). The merge still
needs, as process conditions not findings: the Integration Owner's acceptance of the number 173 (`[201]` (1)) and
evidence (`[188]`), C0-2's reading recorded (`[201]` (6)), and C0's and Q0's runs.

## 6. Limits

- Same vendor and model family as the Author (§0).
- Local clusters only; nothing on the provisioned instance or the platform pooler was measured (Q-028-12, Q-028-13's
  platform half). L7's self-alter behaviour is PostgreSQL 17.11's; the platform's version was not read.
- CI was read from its log only (run `37285050018`); I did not measure the container, and A1-173-2's group-trust shape
  was not tried there.
- I re-ran A0's drifts only where my question needed them (D6's class by r6; rule 9 by r5; §5/1 by r8-r10); D1-D5 and
  D7-D11 are read from the plan and held by the probes' self-tests I saw refuse (r1), not re-appended.
- Q-028-5's `app.jobs` columns, Q-028-11 and the runner are not in this batch and were not reviewed as code.
