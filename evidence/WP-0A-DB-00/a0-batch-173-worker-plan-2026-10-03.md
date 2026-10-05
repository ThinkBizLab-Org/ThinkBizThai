# A0 plan, batch 173: the worker's login identity (RFC-2026-028), inert until an operator gives it a credential

**Package:** `WP-0A-DB-00`. **Author:** `/claude/a0_atlas` (A0), written by a subagent of that run on 2026-10-05.
**Branch:** `agent/claude/WP-0A-DB-00-batch-173-worker`, from `aa0e89f` (PR #183 merged). **Disposition:**
`product-owner-disposition-2026-10-03-batch-173-worker.md`. The file name carries the phase's date (2026-10-03), as every
plan of this phase does.

This batch implements one APPROVED decision record, `RFC-2026-028` (approved 2026-10-05 through the Owner's delegation of
A0's recommendation: the identity and its pins, §3.1-§3.3, §3.6, §4/1; Q-028-1..13 answered as A0 recommended). Where the
work raised a question no approved text answers, it is answered as A0 recommends under the delegation and named in §4;
everything else is owed with an owner on `open_blockers[201]`. Nothing here is reviewed, tested or approved by the
Author; the role runs (C0, A1, Q0) are owed. No draft preceded this batch: it was written whole in this run.

## 1. The one migration, and its number

`db/foundation/migrations/173_worker_login_identity.sql`. Q-028-9 was answered as A0 recommended: "the next free number
above the highest merged migration when it is written". The highest merged migration is `172`; `173` is free and sorts
after it, so on an instance holding the later set the file never runs out of order. It lies outside A0's foundation
range (`001`-`004`) as a one-time exception to the registry's ranges, as Q150-c's was; the Integration Owner's acceptance
is owed (`open_blockers[201]` (1)). No earlier apply-time block became false: the post-migrate pass reads 54 blocks, 38
as written and 16 superseded and replaced (53/37/16 before, plus 173's own), so `superseded.json` is unchanged.

What it does, and nothing else: `set local createrole_self_grant = ''` (A1R-1's remedy, before the role exists);
`create role app_worker_login with login nosuperuser nobypassrls noinherit nocreatedb nocreaterole noreplication password
null`; `grant app_worker to app_worker_login with inherit false, set true, admin false`; a comment on the role; one
apply-time block (§4/1). It writes no policy, grants nothing to `authenticator`, and does not touch `app.jobs` (§4 D4).
`catalog-snapshot.json` declares it not applied to the provisioned instance (§4 D5).

## 2. Item → change → test or drift

| # | Item (source) | Change | Held by |
|---|---|---|---|
| 1 | RFC-2026-028 §3.1: the role | the `create role` above; LOGIN and every other attribute stated false; no credential | 173's block (1: attributes, `rolconnlimit` -1, no expiry); rule 8 (one admitted attribute); drift D4 `bypassrls` (rule 8, measured) |
| 2 | §3.1: one membership, both switches | `grant app_worker ... with inherit false, set true, admin false` | 173's block (2, per row); rule 4 pin `app_worker_login -> app_worker`; **rule 4b** (each direct row with its three options, Q-028-10); drifts D3 `with inherit true` and D11 `with admin option` (rule 4b names the row and the missing pin, measured; D3 was refused only one rule later before 4b, Q0-R5), D5 `grant app_maintenance` (rule 4) |
| 3 | §3.1, A1R-1: no member besides the applier's admin row | `createrole_self_grant` emptied for the transaction; the block reads members PER ROW: none on a superuser-applied cluster, exactly `<applier> (admin true, inherit false, set false)` otherwise | 173's block (3); **measured locally with a non-superuser CREATEROLE applier** (§3): one row with the setting empty; with `'set, inherit'` a second row, refused by name; client membership probe self-test (`grant app_worker_login to authenticated`: `authenticated -> app_worker_login`, `-> app_worker`); drift D10 (two probes name it) |
| 4 | §3.1, §5/4, §5/6: owns nothing, holds nothing, no setting | — | 173's block (4: no `pg_shdepend` row of any kind for the role; 5: no USAGE/CREATE on `app` or `private`, no `pg_db_role_setting` row); rule 7 (D2 `grant usage on schema app`, measured); the table-level grant rule (D1 `grant select on app.jobs`, measured); rule 2 (D7 `alter table app.jobs owner to app_worker_login`, measured); the settings rule extended (D8 `set role = 'app_worker'`, measured; self-test also a `search_path` in one database); rule 8's default-ACL arm (self-test: a default privilege for the login role); D9 `connection limit 5` (173's block in the post-migrate pass, measured) |
| 5 | §3.3/1, §5/5: no credential in any fed source | `workerCredentialLint` (`scripts/db/run.mjs`): through the repository's lexer at every level, a PASSWORD clause but `password null`, a SCRAM or md5 verifier in any literal, or `\password`, in the CI shim, the prerequisite, every migration, replacement, helper and fixture (96 sources); run by schema-lint, by migrate-clean before its first script, and by rls-smoke over what it feeds | foundation-contract (clean over every fed source; drifts: a clause, ENCRYPTED, inside EXECUTE inside DO (level 2), a SCRAM and an md5 literal, the meta-command, an unlexable source); D6 `alter role ... password '...'` appended to 173: migrate-clean refuses before applying anything (measured) |
| 6 | §3.3, §5/5's live half | **rule 9** of the pinned grant probe: no non-superuser, non-`pg_*` role holds a stored credential on a migrate-clean cluster (read from `pg_authid` by the superuser running the probe; the block never reads it) | its self-test `alter role app_worker_login password '...'` (refused by name) |
| 7 | §3.6: the authenticator negative | `SERVICE_ROLES_NOT_FOR_THE_REQUEST_PATH` gains `app_worker_login` | foundation-contract (the snapshot with `authenticator` a member of it: a finding) |
| 8 | §3.6's last row, §5/14, A1 F2, A1R-1: the instance's snapshot | `workerLoginSnapshotLint`: once 173 is declared applied the snapshot must carry `worker_login` (attributes, memberships and members with their options per row, settings, whether a verifier is stored, the connection limit) and §3.1 is asserted against it; while declared not applied, absent is read as such | foundation-contract: clean shape; absent-when-applied; the fixture drifts §5/14 names (`rolinherit`, a membership in `app_maintenance`, `inherit_option` true, another member, the admin row with `set_option` true, a `pg_db_role_setting` row) plus A1R-1's second row for the migration owner, no verifier once applied, an unrecorded field |
| 9 | §3.3/3, §5/7-9: logged in as the role | `scripts/db/authz-proofs.mjs`, `worker-login-can-only-become-app-worker`: a generated test credential (32 random bytes, base64url) set as a **client-computed SCRAM-SHA-256 verifier** fed on stdin, the plaintext only in a 0600 libpq password file via PGPASSFILE, removed in a `finally`; then, logged in: current_user and session_user are the login role; before SET LOCAL ROLE `42501 permission denied for schema app`; `set local role app_worker` takes; `app_command`, `app_maintenance`, `authenticated`, `anon`, `app_authz`, `postgres` each `42501 permission denied to set role`; `app.close_workspace` as app_worker `42501` (no client path); after commit it is itself again | controls, each decided by the same function and required to go red: §5/7 (a) `with inherit true` (zero rows, no error), (b) `grant usage on schema app` (`permission denied for table workspaces`), §5/8 `grant app_command` (the SET takes), §5/9 `set role` without LOCAL (persists); a self-test of the shipped topology stays green |
| 10 | §3.2, §5/10, RFC-2026-016 §5 | `worker-login-reads-nothing-by-default`: every table app_worker may SELECT (22) read through the login role under `set local role app_worker`: zero rows each, while the connection role reads the fixture's rows in all 22 | control: a permissive `for select to app_worker using (true)` policy on `app.workspaces` turns it red (2 rows) |
| 11 | §5/13, A1 F4, A1R-2 | `worker-login-no-workspace-lingers`: two jobs on one connection; the start-of-transaction check `workerTransactionStartProblem` | the first job with `set_config(..., true)`: the second starts clean; control with `false`: the workspace leaks and the check refuses that job. The production runner's copy is owed (§5) |
| 12 | §5/12, C0-2 | `worker-login-authentication`: the cluster's `pg_hba` rules read; a pg_hba line trusting the login role by name is a failure; a wrong credential that connects means the cluster does not ask (NOT RUN, printed so, never counted as passed); otherwise no credential, a wrong one and the generated one | measured both ways on 5507 (§3) |
| 13 | Q0 R-1 on 170-assert (owed since) | rule 4's select and pinned filter asserted whole; the membership self-test gives `app_worker` a membership as MEMBER | foundation-contract; self-test names `app_worker -> app_authz`, `app_worker_login -> app_authz` |
| 14 | the pins' data | `pinned-grants.json`, `read-allowlist-known-exceptions.json` regenerated (only `_how_measured` moves: the login role holds nothing); `catalog-snapshot.json` (173 pending) | the generator's own check; foundation-contract (measured through 173) |

## 3. Measured

Node 24.20.0; PostgreSQL 17.11 on 127.0.0.1:5507 (TCP only, `unix_socket_directories=''`), `initdb --locale=C -A trust
-U postgres`, `LC_ALL=C`, the shim first, re-initdb every round, in the private directory `a0-173-workerr/`.

- **Final rounds** (two, fresh clusters, this branch's code): `make db-migrate-clean` exit 0 and `make db-rls-smoke` exit 0,
  twice. migrate-clean: post-migrate pass 54 / 38 / 16; the pinned grant probe refused each of its 10 drifts (8 before:
  rules 4b and 9 add one each), the client membership probe each of its 3; every other probe as before. rls-smoke: 1200
  isolation cases (unchanged); `db-authz-proofs: ok — 13 claim(s) discharged by execution; 1 not run on this cluster
  (worker-login-authentication)` (10 before: the four worker proofs added, the authentication one NOT RUN on a trust
  cluster).
- **Drifts on migrate-clean**, each APPENDED to `173_worker_login_identity.sql` (not to `140_audit.sql`, where the role
  does not exist yet: 140 sorts before 173), a fresh cluster each, the file restored byte for byte after (cmp):
  D1 `grant select on app.jobs to app_worker_login` (table-level rule: `unlisted: app_worker_login SELECT on app.jobs`);
  D2 `grant usage on schema app` (rule 7); D3 `grant app_worker ... with inherit true` (rule 4b); D4 `alter role ...
  bypassrls` (rule 8); D5 `grant app_maintenance to app_worker_login` (rule 4); D6 `alter role ... password '...'`
  (workerCredentialLint, before any script applied); D7 `alter table app.jobs owner to app_worker_login` (rule 2); D8
  `alter role ... set role = 'app_worker'` (the settings rule); D9 `alter role ... connection limit 5` (173's block, in the
  post-migrate pass); D10 `grant app_worker_login to authenticated` (the client membership probe and rule 4); D11 `grant
  app_worker ... with admin option` (rule 4b). Each migrate-clean exit 2, the object named.
- **Q-028-13, local half** (A1R-1): on the same cluster, inside rolled-back transactions, 173's statements and block run as
  a non-superuser `CREATEROLE` role holding `app_worker` with admin option. With `createrole_self_grant` empty (as 173
  sets it): one member row, the applier, admin t, inherit f, set f, grantor the bootstrap superuser; the block holds.
  With it `'set, inherit'` (173's SET LOCAL replaced): a second row, admin f, inherit t, set t, grantor the applier, and
  173's block refuses with both rows named. The applier can alter the role's credential (A1R-3: CREATEROLE with ADMIN);
  a plain `revoke app_worker_login from <applier>` by the applier leaves its admin row (WARNING: not granted by it).
  The platform's own setting and grantor are not measured (Q170-c).
- **§5/12 both ways**, on a cluster of this branch's code before the final rounds: a `pg_hba` line `host all app_worker_login
  127.0.0.1/32 scram-sha-256` placed first and reloaded: `worker-login-authentication` RUN and ok (wrong credential
  `password authentication failed`, none `fe_sendauth: no password supplied`, the generated verifier connects — so the
  client-computed verifier is the one PostgreSQL checks); a `trust` line for the role placed before it: FAIL, `pg_hba
  line(s) 1 trust app_worker_login by name`. `pg_hba.conf` restored byte for byte (cmp). After every run the role's
  stored credential was null again (`pg_authid`, read as the superuser) and the temporary directory empty.
- `scramVerifier` checked against an independent vector: RFC 7677's example (password `pencil`, its salt, 4096) gives the
  server signature the RFC prints (foundation-contract).
- `npm run check`, `node scripts/verify-branch-scope.mjs aa0e89f WP-0A-DB-00`, `npm run verify`: see the handoff (the
  suite count is in `evidence/VERIFICATION.md`, not here).

## 4. Answered as A0 recommends under the delegation (each named; none is a new decision of the Owner)

- **D1, the number 173** (Q-028-9, §1).
- **D2, Q-028-10: a pinned membership is pinned with its three options**, as a separate rule (4b) over every direct row
  of every non-superuser member, so a second row for the same pair is a finding too.
- **D3, A1R-1's remedy as A1 wrote it**: `set local createrole_self_grant = ''` before `create role`, and every reading of
  the role's members per `pg_auth_members` row (the block, rule 4b, the snapshot lint).
- **D4, Q-028-5 is the next batch, not this one.** The brief allowed the `app.jobs` columns here only if RFC-2026-028
  recommends them before the worker half AND they are bounded as the brief bounds them (nullable, a CHECK on shape
  matching 172's bound, pinned). The RFC does recommend them first, but **not null** with CTR-TEN-001's bounds (the table
  is empty and applied nowhere), with `CTR-JOB-001`'s reading of `tenant_context` restated by its owner in the same move;
  `contract-catalog/` is read-only for this package. A nullable copy would be neither the RFC's answer nor the brief's
  bound kept honestly, so it is recorded as the next batch (`open_blockers[201]` (3)), still before RFC-2026-026's worker
  half.
- **D5, 173 is declared not applied to the provisioned instance** until Q-028-13's platform half and Q170-c, as the RFC's
  own Q-028-13 answer says ("until measured, §4/1 is applied to migrate-clean clusters only").
- **D6, Q-028-11: no connection limit yet.** The answer is "the worker pool's size", which no decision fixes; the block
  pins -1, so setting one is a reviewed forward migration, and the snapshot lint records it without a number.
- **D7, a ninth probe rule** (no stored credential on a migrate-clean cluster), beyond §3.6's table: the RFC forbids the
  BLOCK reading `pg_authid`, not the superuser's probe, and the rule gives §5/5 a live half that a computed clause cannot
  pass.
- **D8, the test credential is set as a client-computed SCRAM verifier** (the RFC's §3.3/2 production rule applied to the
  test credential of §3.3/3 as well), so the plaintext never reaches the server.
- **D9, the negative controls of the login proofs run under `set local session authorization app_worker_login` inside
  one rolled-back superuser transaction**, not as committed drifts another login would see; the real login proves the
  identity, the controls prove each decision discriminates.
- **D10, §5/12 on a trust cluster is printed NOT RUN** (a status `formatProofs` now has), never counted as discharged; a
  `pg_hba` line trusting the role by name is a failure wherever it stands.
- **D11, measured drifts were appended to 173**, not to `140_audit.sql` as the brief's default says, because the role
  they name does not exist when 140 runs.
- **D12, one self-test per rule** (the suite's own rule): the login role's attribute drifts other than NOLOGIN are held by
  measured appended drifts and 173's block, not a second self-test of rule 8 (`open_blockers[201]` (8)).

## 5. What is owed, and to whom

On `open_blockers[201]` (new, at the end) and appended to `[113]`, `[193]` (Q0 R-1: done), `[196]`, `[198]`, `[199]`,
`[200]`; each names its owner: the number's acceptance; the platform half of Q-028-13 and the snapshot retaken with 173
applied; Q-028-5's columns (next batch); Q-028-11; **A1R-2 in the production runner** (recorded as an obligation in
RFC-2026-028's Implemented line); CI's `pg_hba` reading (C0-2), read off this branch's first CI run; Q-028-3's custody
runbook and Q-028-12's pooler; the stated limits; and this batch's independent review by C0, A1 and Q0. No CI entry is
added or needed: the proofs run inside `make db-rls-smoke`, which CI already runs.

## 6. Rollback

A forward migration (RFC-2026-028 §7): end the role's sessions, `revoke app_worker from app_worker_login`, `drop role
app_worker_login`; revert in the same diff the pins of §2 (PINNED_ROLE_MEMBERSHIPS, PINNED_ROLE_MEMBERSHIP_OPTIONS,
PINNED_ROLE_ATTRIBUTES, the settings rule's third name; rules 4b and 9 may stay, holding the empty sets), and
`superseded.json` for 173's block. Every service cell returns to unreachable, which is the state on main. No credential
exists to revoke anywhere: none is set outside a test run.
