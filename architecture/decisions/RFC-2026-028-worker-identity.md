# RFC-2026-028 — The worker's identity: a login role that can only become `app_worker`, and what holds it there (DATA-DEC-03)

Status: **Approved 2026-10-05** by the Owner's delegation of A0's recommendation (`a0-batch-rfc-023-028-plan-2026-10-03.md` §6; decision recorded in `product-owner-disposition-2026-10-03-batch-rfc-023-028.md` §6): the identity and its pins (§3.1-§3.3, §3.6, §4/1). Q-028-5 (the `app.jobs` columns) is answered before RFC-2026-026's worker half; custody has a named owner (Q-028-3) before the provisioned instance gets a credential; the platform pooler is measured (Q-028-12, with Q170-c) before the worker connects through it. A1's acceptance as DATA-DEC-03's co-owner is owed. Earlier status: **Proposed** — 2026-10-05 by `/claude/a0_atlas` (A0), drafted in batch rfc-023-028 under the Owner's `ทำต่อตามแนะนำเลย` ("continue as recommended", 2026-10-05; transcribed in `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-rfc-023-028.md`), which answered A0's recommendation to draft this RFC. **Not approved; not in effect.** Nothing in this document creates a role, sets a password, writes a migration, policy, grant or pin, or changes a lint rule. The words directed that this RFC be written; they did not approve its text, which did not exist. Approval is the Owner's explicit act (which the Owner may take through the delegation of A0's recommendations), with A1's review as DATA-DEC-03's co-owner; A0's recommendation on approval is recorded in `evidence/WP-0A-DB-00/a0-batch-rfc-023-028-plan-2026-10-03.md`, not here.
Date: 2026-10-05
Revised: 2026-10-05, in the same batch's review round (`a0-batch-rfc-023-028-plan-2026-10-03.md` §7), folding the C0, A1 and Q0 role runs' findings into the text: §2/4 scoped to migrate-clean clusters; §3.1, §4/1 and §5/3 admit the applier's `CREATE ROLE` admin grant as the one member on an instance whose migration owner is not a superuser (C0-1, A1 F1); §3.3 records what the migration owner's credential can do, separates the credential from the request tier and states the production secret's strength (A1 F1, F3), scopes "inert" to password-asking `pg_hba` lines (A1 F8) and stops asserting that the CI container uses `trust` (C0-2); §3.6 reads the role on the provisioned instance (A1 F2); §4/1 no longer reads `pg_authid` (Q0-R3); §5 corrects §5/2's parenthetical (Q0-R5), marks §5/3's `authenticator` drift snapshot-only (Q0-R6), pins §5/7's message and replaces its control (Q0-R2), names the drifts of §5/8, §5/10 and §5/12 (Q0-R8), and adds §5/13 (a session-level `app.workspace_id`, A1 F4) and §5/14 (the snapshot reading); Q-028-3 and Q-028-12 gain conditions; new Q-028-13 (§4/1 applied by a non-superuser). Three quotations corrected (C0-6). Still Proposed; the revision approves nothing.
Implemented in part: 2026-10-05, in batch 173 (`evidence/WP-0A-DB-00/a0-batch-173-worker-plan-2026-10-03.md`), as one forward migration, `db/foundation/migrations/173_worker_login_identity.sql`; **in effect on migrate-clean clusters when that migration is integrated**, and declared not applied to the provisioned instance until Q-028-13's measurement there (and Q170-c) says how a non-superuser `CREATEROLE` applier and the platform's `createrole_self_grant` behave. Numbered 173 as Q-028-9 was answered (the next free number above the highest merged migration, `172`). It lands §3.1 (the role, `LOGIN` and every other attribute false, no credential, one membership `INHERIT FALSE, SET TRUE, ADMIN FALSE`), §4/1's apply-time block reading `pg_auth_members` **per row** with `createrole_self_grant` emptied for the transaction first (A1R-1), §3.6's pins (`scripts/db/run.mjs`: the fourth rule's pin and its per-row options rule, Q-028-10; the eighth rule's one admitted attribute; the settings rule; a ninth rule, no stored credential on a migrate-clean cluster; the `authenticator` negative; `workerLoginSnapshotLint` for the instance's snapshot), §5/5 as `workerCredentialLint` over every fed source, and §5/1-4, /6-10, /12-14 executed (the live cases in `scripts/db/authz-proofs.mjs`, logged in as the role with a generated credential set as a client-computed verifier and removed; §5/12 reported NOT RUN on a cluster that does not ask the role for a credential). **A1R-2, recorded here as an obligation:** §3.1's "every transaction the worker runs" includes, in the PRODUCTION worker's runner and not only in the test harness, the start-of-transaction check of §5/13 (refuse a job transaction whose `current_setting('app.workspace_id', true)` is neither null nor empty after `set local role app_worker`), owed to the batch that writes the runner (`RFC-2026-026`'s worker half), whose §5/13 case runs through that code path. **Not implemented here:** Q-028-5's `app.jobs` columns (the next batch: this RFC recommends them `not null` with `CTR-TEN-001`'s bounds and with `CTR-JOB-001`'s reading restated by its owner, which is outside this package's paths), Q-028-11's connection limit (the worker pool's size is not decided), the custody runbook (Q-028-3), the pooler (Q-028-12). Held on `open_blockers[201]`. No other sentence of this file changed.
Author: `/claude/a0_atlas` (A0 Integration / DB-00), co-owner of DATA-DEC-03 (ERD §15) and owner of the role-topology batches `001`-`004`; drafted by a subagent of that run
Reviewer sought: `/claude/a1_bastion` (A1 Security), DATA-DEC-03's co-owner and author of `RFC-2026-022`; `/claude/r0_steward` (Integration Owner), for credential custody, CI and the migration number (§9)
Answers: DATA-DEC-03 — `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:866`, "Force RLS service path | force where compatible | A0+A1 | ก่อน G1" (before G1); `RFC-2026-022` §5/8 ("choosing it, and paying for its credential custody, belongs to the RFC that creates the worker (`DATA-DEC-03`, due before G1)", `RFC-2026-022:418-420`) and §9's first bullet, which says the same in other words; `RFC-2026-019` §4/3 ("its shape is a dedicated login role issuing `SET LOCAL ROLE app_worker` per transaction")
Depends on: `RFC-2026-016` (approved) §4 (the exemption register that replaced "where compatible") and §5 (a service path that succeeds because it bypasses is indistinguishable from one a policy admitted); `RFC-2026-017` (approved) §3 (the service roles); `RFC-2026-019` (approved) §4/1, §4/3 and §5; `RFC-2026-022` (approved 2026-09-08, NOT in effect until a service identity exists) §5/2-§5/8, §7; `RFC-2026-026` (approved 2026-10-05, NOT in effect until `RFC-2026-023` and this decision hold) §3.2, §3.5, §9/2
Read with: `RFC-2026-023` (In review; brought current in the same batch). The two are independent: the command path needs no login role and the worker path needs no acting user (`RFC-2026-023` §7).
Holds: `work-packages/WP-0A-DB-00.json` `open_blockers[113]` (the worker identity) and `[199]` (this RFC's questions and findings)

---

## 1. What is open

`RFC-2026-022` decided what a service policy looks like and could not put it in effect. Its §5/8, quoted:
"**A policy `TO app_worker` written today is unreachable except from an identity for which it is moot**,
and a broker function has nobody to grant `EXECUTE` to." The reason is measured and still true at
`921efb5`: the only member of `app_worker` is the migration owner, `postgres`
(`003_service_role_no_ambient_inherit.sql:26`, `grant app_worker to postgres with inherit false, set true`),
and `postgres` bypasses row level security (`KNOWN_BYPASS`, `scripts/db/run.mjs:3816`). Every §8 `S` cell is
therefore classified and unimplemented: `db/foundation/lint/service-policy-map.json` holds sixteen rows,
thirteen CARRIED and three DISCOVERED, and authorises nothing.

DATA-DEC-03 is the decision that owns this, A0 and A1 jointly, due before G1. Its ERD default, "force where
compatible", is half of the answer. This RFC supplies the other half — the identity — and says what the
default now means.

## 2. What the tree says today, read rather than assumed

1. **The three service roles** (`001_service_roles.sql:30-50`): `app_worker`, `app_command` and
   `app_maintenance`, each `NOLOGIN NOBYPASSRLS NOINHERIT`, no password, created "holding no grant and no
   membership" (`001:12`); a role "becomes reachable only when something is deliberately granted membership in it, in
   a later batch, in a diff a reviewer reads". This RFC proposes that diff for `app_worker` and no other.
2. **The migration owner's membership** (`002`, `003`): `postgres` holds each with `inherit false, set
   true`. `003`'s header records why both switches matter: `alter role … noinherit` controls what the role
   inherits from roles *it* is a member of; the grant's `inherit_option` controls whether the *member*
   inherits from it. `002` confused them, and `003` corrected the record. §3.1 sets both, deliberately.
3. **`authenticator` is a member of none of the three** (`RFC-2026-019` §4/1, a negative asserted by
   `scripts/db/run.mjs:3714-3724`). `app_command` is reached only through a `SECURITY DEFINER` function the
   request session invokes (`RFC-2026-019` §4/2). Neither changes here.
4. **The probes that pin role topology** (batches 127-129, 170-assert, owed-tooling; `scripts/db/run.mjs`):
   - the client membership probe: `CLIENT_ROLE_MEMBERSHIPS = []` — no role grants membership to `anon` or
     `authenticated`, read recursively (`:640`);
   - the client attribute probe: `anon` and `authenticated` hold none of `CLIENT_ROLE_FALSE_ATTRIBUTES`
     (`:642`), and the settings rule pins `pg_db_role_setting` for them (`CLIENT_ROLE_SETTINGS = []`);
   - the client privilege and schema probes: every client privilege in every schema, by name and by OID;
   - the pinned grant probe's **fourth rule**: every non-superuser, non-`pg_*` role's memberships, read
     recursively from `pg_auth_members` **whatever the grant's INHERIT, SET or ADMIN option**, are exactly
     `PINNED_ROLE_MEMBERSHIPS`, which is **empty** (`:1340`);
   - its **seventh rule**: `app` and `private` owned by the migration owner, and every non-superuser role's
     `USAGE`/`CREATE` on them exactly `PINNED_SCHEMA_PRIVILEGES` (`app_authz`, `app_worker` and
     `authenticated` hold `USAGE` on `app`; nothing else) (`:1354`);
   - its **eighth rule**: no non-superuser, non-`pg_*` role holds `BYPASSRLS`, `LOGIN`, `CREATEDB`,
     `CREATEROLE`, `INHERIT` or `REPLICATION`, and `pg_default_acl` is empty (`:1457-1465`);
   - the snapshot rules over the provisioned instance: a service role with `BYPASSRLS` or superuser is a
     finding, a role that `canlogin` with no password is a finding, `KNOWN_BYPASS` is pinned (`:3787-3817`).

   So **on a migrate-clean cluster today no login role other than a superuser can exist** without a pin
   moving. That is the property this RFC must change by exactly one role, and the reason its migration moves
   three pins in one diff (§4). It is a statement about migrate-clean clusters only: on the provisioned
   instance `postgres` and `authenticator` are non-superuser login roles, read by the snapshot rules, not by
   the fourth or eighth rule (C0-1).
5. **"Force where compatible" was already made falsifiable.** `RFC-2026-016` §4 retired the phrase for being
   unfalsifiable and replaced it with `db/foundation/lint/rls-exemption-register.json`, read both ways: an
   unforced table with no row is refused, and a row whose exemption the catalog does not show is refused.
   The register is **empty**: every table in `app` has row level security enabled and forced.
6. **What a job row carries.** `app.jobs` (`050_async_kernel.sql:490-510`) stores `CTR-JOB-001`'s properties
   "minus `tenant_context`, which is resolved to §3.3's canonical `workspace_id`" (`050:426-427`). So the
   job keeps the workspace and drops the rest of `CTR-TEN-001`: **no `actor`, no `request_id`, no
   `correlation_id`**. `RFC-2026-026` §3.5 sources the worker's `actor` (Q-026-8: the job's
   `tenant_context.actor`) and its `request_id` and `correlation_id` from "the job's `tenant_context`". No
   column holds them. A finding, recorded on `open_blockers[199]` and answered in §3.4.
7. **How tests become the worker today.** `private.as_service()` (`db/foundation/test-helpers/auth-context.sql:95-108`)
   is called by the superuser connection and sets `role` to `app_worker` with `set_config(…, true)`. Under it
   `current_user` is `app_worker`, so policies apply and the service cases are not vacuous; but
   `session_user` is `postgres`, and no case has ever connected as anything but the superuser.

## 3. Decision proposed

### 3.1 One login role, which can become `app_worker` and nothing else

A role named **`app_worker_login`** (the name is not load-bearing; Q-028-2):

```
create role app_worker_login with login nosuperuser nobypassrls noinherit
  nocreatedb nocreaterole noreplication password null;
grant app_worker to app_worker_login with inherit false, set true, admin false;
```

- **`LOGIN`, and nothing else a role can hold.** It is the only non-superuser role allowed to log in. It
  owns nothing, holds no privilege of its own (no `USAGE` on any schema, no table, no function beyond what
  PUBLIC holds), and has no default setting.
- **A member of exactly one role, `app_worker`, with `INHERIT FALSE, SET TRUE, ADMIN FALSE`.** It holds
  `app_worker`'s privileges only after `SET LOCAL ROLE app_worker`, never ambiently. Both switches are set
  (`003`'s lesson): the role is `NOINHERIT` *and* the grant's `inherit_option` is false, so neither a later
  `alter role … inherit` nor a re-grant with the default option alone hands it the worker's reach.
- **No member besides the applier's `CREATE ROLE` admin grant.** `authenticator` is not (`RFC-2026-019`
  §5's negative, extended by one name); no client role is; no service role is. On a cluster whose applier
  is a superuser (every migrate-clean cluster) nothing is a member of it. On an instance whose migration
  owner is not a superuser — the provisioned instance, where `postgres` is not one (`run.mjs:3821`,
  `KNOWN_SUPERUSERS = ['supabase_admin']`; `open_blockers[198]` (2)) — PostgreSQL 16+ grants the creating
  `CREATEROLE` role membership in the role it creates, `ADMIN TRUE, INHERIT FALSE, SET FALSE`, so exactly
  one member is admitted there: the migration owner, with exactly those options (A1 measured it on a
  simulated non-superuser owner: admin t, inherit f, set f, grantor `postgres`; `catalog-snapshot.json`
  already reads the three service roles the same way, `members_besides_admin: 0`, `_membership_note`). Any
  other member, or that row with `INHERIT` or `SET` true, is a finding. What the admin row lets its holder do
  is §3.3/2's.
- **Every transaction the worker runs** opens `begin; set local role app_worker;`, then, for a CARRIED
  statement, `select set_config('app.workspace_id', $1, true)` from the job's tenant context
  (`RFC-2026-022` §5/7); it never issues `SET` or `SET ROLE` without `LOCAL`, and never `RESET ROLE` inside a
  transaction it has not ended. **A statement issued before `SET LOCAL ROLE` fails closed**: the login role
  has no `USAGE` on `app`, so it is refused with `42501` rather than running with some other reach.
- **Not `app_command`, not `app_maintenance`.** `app_command` is never reached by login (`RFC-2026-019` §4/2).
  `app_maintenance` — the cross-tenant path `RFC-2026-017` gives "retention sweeps, purge verification,
  backfills" (`RFC-2026-017:50`; "chunked" is `001:44`'s comment) — gets its own login role, if it needs one, in its own decision when its first use is
  written (Q-028-8). One credential that could become both the confined worker and the cross-tenant
  maintenance path would make every confinement this RFC relies on a matter of which `SET ROLE` the process
  chose.

**Why not make `app_worker` itself `LOGIN`.** `RFC-2026-019` §4/3 gave the shape, and three reasons hold it:
the credential and the privilege set stay separate, so a credential is rotated or revoked without touching
the role every policy names; `RESET ROLE` returns the session to a role that can read nothing, where on a
login `app_worker` it would be a no-op; and `app_worker`'s own pins (`NOLOGIN`, the eighth rule) stay true.

### 3.2 FORCE RLS compatibility: what "force where compatible" means now

Under `SET LOCAL ROLE app_worker`, `current_user` is `app_worker`: not a superuser, no `BYPASSRLS`, the owner
of no table. **Row level security applies to it on every table that has it enabled, forced or not**;
`FORCE` additionally binds the table *owner*, which is the migration owner and never the worker. So the
worker path is subject to every policy, and to none it is not named in — which on a table with no policy
`TO app_worker` is zero rows, the state `RFC-2026-022` §5/5 makes permanent for the queue.

"Force where compatible" is read through `RFC-2026-016` §4: **compatible everywhere today**. Every table in
`app` is forced and the exemption register is empty (§2/5). A table that cannot be forced later takes a
register row — role `*`, operation `all`, a reason someone can disagree with, an owner and a review date —
in the diff that unforces it. This RFC adds no exemption and asks for none.

`RFC-2026-016` §5's rule is the test of the whole decision: a service path that succeeds because it bypasses
is indistinguishable from one a policy admitted. With this role, a service case can for the first time be
run by an identity for which a policy is **not moot** — and §5/10's pair (the same read through the login
role returns zero rows, through `postgres` returns rows) is what shows it.

### 3.3 Credential custody: no secret in the repository, ever

1. **The migration creates the role with no password** (`password null`). Under `scram-sha-256` or `md5`
   authentication a role with no password cannot authenticate, so the role the migration creates is inert
   on every instance **whose every `pg_hba` line reaching the role asks for a password**, until an operator
   gives it a credential. Under a `trust` line it logs in with no password at all (A1 measured both ways,
   A1 F8); see /3 for the clusters where that holds. No migration, fixture, test, evidence file,
   handoff, CI log or URL in this repository carries a password, verifier or connection string with a
   credential for it (`CONTRIBUTING_AGENTS.md`, non-negotiable rules); the secret scan already refuses the
   shapes it knows, and §5/5 adds a static rule for `PASSWORD` in migration text.
2. **On the provisioned instance**, the credential is set **out of band** by the provisioning runbook,
   owned by the Integration Owner with operations: `alter role app_worker_login password '<SCRAM-SHA-256
   verifier>'` — a verifier computed client-side, never the plaintext, so no statement log holds the
   secret. The plaintext lives in the platform's secret store only, and reaches the worker process as an
   injected secret, never in a command line, a URL or a log line. Rotation sets a new verifier; sessions on
   the old one end with the pool's recycle. The cadence and the platform's secret store are Q-028-3's.
   Whether the platform's pooler accepts a custom login role, and in which mode, is read, not measured
   (Q-028-12; it rides on the platform measurement Q170-c already owes).

   Three conditions on that custody, each a condition of Q-028-3's answer (A1 F1, F3):

   - **The secret's scope excludes every request-path runtime.** The worker's credential lives in a secret
     scope (deployment, environment, or secret-store path) that no runtime serving a request can read. A
     worker that shares an environment-variable scope with the web tier hands a compromised web tier a
     cross-tenant service identity, which is the reach this role's confinement exists to deny.
   - **The production secret is at least as strong as the test one**: generated, at least 32 random bytes
     (§3.3/3's), never chosen by a person. A SCRAM verifier that reaches a statement log is attackable
     offline in proportion to the secret's entropy.
   - **Network restriction is decided and recorded either way**: whether a `pg_hba` line (or the
     platform's equivalent) restricts the role to the worker's egress is Q-028-3's to answer; "not
     restricted" is an acceptable answer only if it is written down with its reason.

   **Who else can mint the credential.** On the provisioned instance the migration owner holds `ADMIN` on
   the role (§3.1), and `ADMIN` on a role is enough to `alter role … password` it. So **whoever holds
   `postgres`'s credential can set the worker's** — the worker's credential is never stronger than the
   migration owner's custody. That is recorded, not mitigated here: whether a non-superuser migration owner can
   revoke the admin row after creation (its grantor is the bootstrap superuser) is read, not measured, and is
   left to Q-028-13's measurement.

   **The topology is re-read where custody happens.** Every step this paragraph takes out of band — the
   verifier, rotation, any network rule — happens on the provisioned instance, where the fourth rule, the
   eighth rule and the settings rule never run. So the custody runbook re-takes the catalog snapshot after
   each credential change, and the snapshot rules of §3.6 assert §3.1 against it (A1 F2; §5/14).
3. **Locally and in CI, a test-only credential, generated, never stored.** The harness that runs the
   worker-path cases (not the migration) sets the login role's password on the cluster it is testing, from
   32 random bytes it generates per cluster (locally) or per job (CI), held in a `0600` password file inside
   the cluster's own directory or the job's temporary directory, passed to children through `PGPASSFILE`,
   never printed, and deleted with the cluster. That is the pattern `scripts/db/try-it.mjs` already measured
   for the superuser credential (`open_blockers[196]` (2), done: `initdb --auth=scram-sha-256 --pwfile`, the
   password in `<dir>/pgpass` only). **On a cluster that authenticates by `trust`** — every measurement
   cluster this package's runs start, `initdb -A trust` — any password is accepted, so the credential proves
   nothing about authentication there; the topology cases (§5/7-10) still hold, because they rest on role
   attributes and memberships, and the authentication cases (§5/12) run only on a `scram-sha-256` cluster and
   are reported as not run elsewhere. **The CI service container is not known to be `trust`** (C0-2): CI
   runs `postgres:17` with `POSTGRES_PASSWORD` set and connects over TCP with `PGPASSWORD` (the CI workflow
   file, the service block and each job's environment), and that image's default host authentication when a
   password is set is `scram-sha-256` — read, not measured. The implementing batch measures it (`select
   type, database, user_name, address, auth_method from pg_hba_file_rules`, or a wrong password refused) and
   records what it found; if it is `scram-sha-256`, §5/12 runs in CI too.
4. **The snapshot rule** "a role that can log in with no password" (`run.mjs`, the service-role loop) reads
   the **provisioned** instance, where the operator has set the verifier; it is extended to this role. On a
   CI or local cluster before the harness runs, the role has no password and that is the intended state
   (inert), so the catalog rule there pins `rolcanlogin` true and reads nothing about the password.

### 3.4 Where the request, correlation and causation ids come from

`CTR-TEN-001` requires `workspace_id`, `actor`, `request_id`, `correlation_id`, `locale` and `timezone`;
`causation_id` is optional there and required of every worker audit row by `RFC-2026-026` §3.2. The
database **mints none of them** — no column default produces any — and checks only their shape. For each
kind of worker transaction:

| kind | `request_id` | `correlation_id` | `causation_id` | `actor` |
|---|---|---|---|---|
| **A job a user's request enqueued** (publish delivery, a closing workspace's later steps) | **minted by the worker per attempt** (one attempt is one request the worker makes of the database), recorded on the attempt | **carried from the enqueuing request**, unchanged across attempts, so every row the job causes joins the user's request | the job id (`RFC-2026-026` §3.2) | the job's `tenant_context.actor`, the user who started it (Q-026-8) |
| **A sweep no user started** (retention, the end of a recovery window) | minted per attempt | the sweep run's id, minted by the scheduler that enqueued it | the sweep's job id: a sweep is a job too, so `causation_id` is never null | `system_actor` (Q-026-8) |
| **An outbox consumer** | minted per attempt | `app.outbox_events.correlation_id` (`050:608`) | the event id, or its own `causation_id` | the event's producer context |

**The first row needs columns `app.jobs` does not have** (§2/6): the enqueuing request's `correlation_id`
and the job's `actor`. So before `RFC-2026-026`'s worker half lands, a forward migration in A0's kernel
range adds them to `app.jobs` as `CTR-TEN-001`'s `tenant_context` fields — `actor_kind`, `actor_id`,
`request_id` (the enqueuing request's, distinct from the attempt's), `correlation_id`, with
`CTR-TEN-001`'s bounds as `CHECK` constraints and `not null` (the table is empty and applied nowhere) — and
`CTR-JOB-001`'s reading of `tenant_context` is restated so the store and the contract agree again (Q-028-5).
The alternative, carrying them in `input_ref`'s payload, puts an audit field where no constraint and no
policy can read it, and is not recommended.

### 3.5 Which `S` cells it serves first, and what else each waits on

The identity unblocks every CARRIED cell **in shape** and none **in fact** until its policy batch lands. The
order A0 proposes (Q-028-7):

1. **`RFC-2026-026`'s worker half — §8.4 Audit/security INSERT** (`service-policy-map.json`, two CARRIED
   rows, `audit_logs` and `security_events`). Waits on this RFC and `RFC-2026-022` §7 only. First, because
   every later worker act must write its audit row in its own transaction or not happen (`RFC-2026-026`
   §3.4), so no other worker cell can be honest before this one is in effect. Also needs §3.4's `app.jobs`
   columns (the row's `actor`, `correlation_id`).
2. **§11.4's purge job** — §8.2 "Asset hard purge", the workspace-closure purge (CARRIED, `asset_versions`
   update), and the worker's lifecycle transitions `Closing --> AccessBlocked` and `AccessBlocked -->
   PurgeQueued` (`app_worker` holds `010`'s table-level `SELECT, INSERT, UPDATE` on `app.workspaces` and no
   policy there). Also waits on DATA-DEC-04 (the recovery window), the deletion-manifest tables
   (`open_blockers[150]`), a legal-hold store, §10's approved numbers (Q160-a), and — for "recovery window
   elapsed", which selects workspaces by age — a DISCOVERED claim through `RFC-2026-022`'s broker.
3. **The retention sweep** — §8.2 "Asset hard purge", the retention sweep (DISCOVERED, `assets` update).
   Waits on `RFC-2026-022` §5/6's broker owner (`app_queue`) and its broker, which need `CTR-JOB-001`'s
   lifecycle vocabulary (`RFC-2026-022` §9), and on §10's numbers. It is also where `RFC-2026-017` §3 (which
   gives retention sweeps to `app_maintenance`) and `service-policy-map.json` (which gives this row no role
   and a broker) disagree; Q-028-8.

The other CARRIED cells (notifications, usage, research, publish delivery and metrics) are served by the
same identity when their own policy batches are written; none is first.

**Jobs of a blocked workspace.** `RFC-2026-027`'s gate does not reach the worker: the worker is not a
member, and its policies carry a workspace through the confinement term, not `is_active_member`. §11.4's
`Closing --> AccessBlocked` step "revoke sessions/connectors/jobs" is therefore the broker's claimability rule
(which jobs of a workspace in which state may be claimed), owed with `CTR-JOB-001`'s vocabulary to the
broker batch — not to this identity (`open_blockers[198]` cross-references `[113]` for it).

### 3.6 How the role-topology probes pin it

Each probe of §2/4 keeps its meaning; three gain one pinned entry each, in the migration's own diff:

| probe | today | after this RFC's migration |
|---|---|---|
| client membership (`CLIENT_ROLE_MEMBERSHIPS`, batch 128) | `[]` | **unchanged**: nothing is a member of `anon` or `authenticated`; `grant authenticated to app_worker_login` fails it |
| client attributes and settings (batch 129) | `anon`, `authenticated` hold none; no settings | **unchanged** |
| client privilege and schema (batches 127-128) | pinned | **unchanged**: the login role is not a client role and holds nothing |
| fourth rule, `PINNED_ROLE_MEMBERSHIPS` (170-assert review) | `[]` | **exactly `['app_worker_login -> app_worker']`**; and the rule learns to read the grant's options for pinned entries, so a re-grant `with inherit true` or `with admin option` fails it (today it reads membership whatever the options; Q-028-10) |
| seventh rule, `PINNED_SCHEMA_PRIVILEGES` | three entries | **unchanged**: under `NOINHERIT` and `inherit false`, `has_schema_privilege('app_worker_login', 'app', 'USAGE')` is false; a direct `grant usage on schema app to app_worker_login` fails it |
| eighth rule (attributes false, `pg_default_acl` empty) | no exception | **exactly one pinned exception: `app_worker_login rolcanlogin`**; every other attribute, `rolinherit` included, still false for it |
| settings rule | client roles only | **extended to `app_worker_login`, pinned empty**: `alter role app_worker_login set role = 'app_worker'` (a session-level role at login, which would defeat `SET LOCAL`) fails it |
| `authenticator` negative (`RFC-2026-019` §5) | three service roles | **plus `app_worker_login`** |
| snapshot service-role rules, `KNOWN_BYPASS` | three roles; five bypassing | the login role read with them (no bypass, no superuser, a password on the provisioned instance, not inherited by the admin role); `KNOWN_BYPASS` **unchanged** |
| snapshot of the login role (A1 F2) | not read | **the snapshot carries the login role's attributes, its memberships with their three options, its members with theirs, its `pg_db_role_setting` rows and its connection limit, and the snapshot lint asserts §3.1 against them**: exactly one membership (`app_worker`, inherit f, set t, admin f); no member besides the migration owner's admin row (admin t, inherit f, set f); no setting; every attribute but `LOGIN` false. These are the only rules that run where an operator's `grant app_maintenance to app_worker_login`, `alter role … inherit` or `alter role … set role = 'app_worker'` would be made. The snapshot is a point-in-time read, so the custody runbook re-takes it after each credential change (§3.3/2) |

## 4. Migrations this implies later (none in this batch)

1. **The role** (after approval; Q-028-9 for the number): the `create role` and `grant` of §3.1, a comment,
   and an apply-time block asserting §3.1 in the catalog — the attributes; exactly one membership, with its
   three options; **no member besides, when the applier is not a superuser, the applier's own `CREATE ROLE`
   admin row, asserted with its options (admin t, inherit f, set f)**, and none at all when it is (C0-1,
   A1 F1); no ownership; no schema privilege; no `pg_db_role_setting` row. **The block does not read the
   password**: `pg_authid` is readable only by a superuser, the repository's own rule forbids reading it in a
   migration (`020_business.sql:652-655`), and `pg_roles.rolpassword` reads `********` whether or not a
   password is set (Q0-R3, measured). "No migration sets a password" is held statically by §5/5 instead, and
   the harness of §3.3/3 sets the test credential only after migrate-clean's post-migrate pass, so no re-run
   of an apply-time block ever sees it. The three pins of §3.6 move in the same
   diff (`scripts/db/run.mjs`, `db/foundation/lint/catalog-snapshot.json`'s declaration), and the post-migrate
   pass says which earlier apply-time block, if any, the role makes false (a `superseded.json` entry then).
2. **`app.jobs`' tenant-context columns** (§3.4, Q-028-5), in A0's kernel range, before `RFC-2026-026`'s worker
   half.
3. **`private.as_service()` and the runner** (test helpers, owner A1 Identity for `tests/db/identity/run-isolation.mjs`):
   a second connection that logs in as `app_worker_login`, beside the superuser's `SET ROLE` path, for §5/7-12;
   and `as_service`'s workspace argument, which `RFC-2026-022` §8 already owes to the first CARRIED policy.
4. **Nothing in this RFC writes a service policy.** Each cell's policy is its own batch's (§3.5).

## 5. Test obligations, each with the drift that must fail it

None is written by this RFC; each is owed by the batch that lands §4/1, unless marked.

**Static and catalog** (`make db-migrate-clean`, `scripts/db/run.mjs`):

1. The role's attributes are exactly §3.1's. Drifts: `alter role app_worker_login bypassrls`; `… inherit`;
   `… createrole`; `… superuser` — each fails migrate-clean by name (eighth rule, or the superuser-set rule).
2. Its only membership is `app_worker`, with `inherit false, set true, admin false`. Drifts: `grant app_command
   to app_worker_login`; `grant app_maintenance to app_worker_login`; `grant app_worker to app_worker_login
   with inherit true`; `… with admin option`. The first two fail the fourth rule. `with inherit true`
   **already fails today**, through the table-level grant rule (the login role then holds `app_worker`'s
   table privileges ambiently: "unlisted: app_worker_login INSERT on app.ai_model_policies; …", Q0
   measured, Q0-R5); only `with admin option` passes today and needs the fourth rule to read a pinned
   entry's options (Q-028-10), which also holds the `SET` option.
3. No member besides the applier's admin row (§3.1), and `authenticator` is not one. Drifts: `grant
   app_worker_login to authenticated` (the client membership probe); `grant app_worker_login to
   app_maintenance` (the fourth rule). **Snapshot-only:** `grant app_worker_login to authenticator` (the
   `RFC-2026-019` negative) cannot be applied on a migrate-clean cluster, because the shim creates no
   `authenticator` role (Q0 measured: `role "authenticator" does not exist`, Q0-R6); it is held by the
   snapshot rule over `catalog-snapshot.json` (`run.mjs:3714-3724`) and its drift is a snapshot fixture
   naming the membership, not a migration. If the shim later creates `authenticator`, the live drift joins
   this list.
4. It holds no privilege and no setting. Drifts: `grant usage on schema app to app_worker_login` (seventh
   rule); `grant select on app.jobs to app_worker_login` (the pinned grant probe); `alter role
   app_worker_login set role = 'app_worker'` and `… set search_path = app` (the settings rule, extended);
   `alter default privileges for role postgres grant select on tables to app_worker_login` (eighth rule's
   default-ACL arm).
5. No migration sets a password. A static rule over `db/foundation/migrations/*.sql`, through the
   repository's lexer: `PASSWORD` outside a string literal is admitted only as `password null`. Drift: a
   migration with `password 'x'` fails the static suite (and the secret scan names the literal).
6. It owns nothing. Drift: `alter table app.jobs owner to app_worker_login` fails (the owner rules; a
   table owner is exempt from its own unforced policies, which is the defect `RFC-2026-019` §5's rule exists
   for).

**Live** (`make db-rls-smoke`, as a connection that logs in as the role):

7. Before `SET LOCAL ROLE`: `select 1 from app.workspaces limit 1` is refused `42501` **with the message
   `permission denied for schema app`** — the SQLSTATE and the message both asserted, because a refusal
   one layer later carries the same SQLSTATE (Q0-R2, measured: with `grant usage on schema app to
   app_worker_login` the same statement is refused `42501` `permission denied for table workspaces`).
   Negative controls: (a) the membership re-granted `with inherit true` — the statement then returns zero
   rows with no error (Q0 measured), so the case goes red whatever it asserts; (b) `grant usage on schema
   app to app_worker_login` — the message changes, so the message assertion goes red.
8. `set local role app_worker` succeeds; `set local role app_command`, `… app_maintenance`, `… authenticated`
   and `… postgres` are each refused `42501`. Drift: `grant app_command to app_worker_login` — the
   `set local role app_command` case then succeeds and goes red (the fourth rule refuses the same grant
   statically, §5/2).
9. After `commit`, `current_user` is `app_worker_login` again (`SET LOCAL` ended with the transaction).
   Negative control: the same case written with `set role` instead of `set local role` goes red — the
   pooled-connection leak `RFC-2026-019` §4/3 names.
10. **The pair that shows the identity is not moot** (`RFC-2026-016` §5): through the login role under
    `set local role app_worker`, a read of `app.jobs` (DISCOVERED, no policy) returns **zero** rows; the same
    statement through `postgres` returns the fixture's rows. Batch `050`'s `service-sees-zero-*` cases are
    re-run through the login role, not only through `as_service()`, and stay permanent (`RFC-2026-022` §8).
    Drift: a permissive `for select to app_worker using (true)` policy on `app.jobs` — the login role then
    reads the fixture's rows and the zero-row case goes red.
11. Owed to `RFC-2026-026`'s worker-half batch, not this one: a CARRIED insert through the login role with
    the setting matching succeeds, with another workspace's id is refused by the policy, unset is refused
    (not `42704`, not `22P02`) — `RFC-2026-022` §7.4/9-10.
12. **Authentication, on a `scram-sha-256` cluster only**: no password refused (`fe_sendauth: no password
    supplied`), a wrong one refused, the generated one connects; the password appears in no printed line,
    log or URL. On a `trust` cluster these are reported as not run, never as passed (§3.3/3). Drift: a
    `host all app_worker_login 127.0.0.1/32 trust` line placed before the `scram-sha-256` line — the
    no-password case then connects and goes red. The harness connects with `-w` (no prompt).
13. **No session-level `app.workspace_id` survives into the next job** (A1 F4). A1 measured that
    `set_config('app.workspace_id', …, false)` in one transaction is still set in the next on the same
    connection, so a job that forgets to set its workspace would run with the previous job's, and a CARRIED
    policy reading the setting would admit it. The worker harness refuses to start a job's transaction when
    `current_setting('app.workspace_id', true)` is neither null nor empty at its start (after `set local
    role app_worker`, before its own `set_config(…, true)`). Case: two consecutive jobs on one connection,
    the first setting it with `true` — the second starts clean. Negative control: the first job sets it with
    `set_config(…, false)` — the second refuses to start, and a harness without the check goes red. The
    pooler's reset behaviour between clients is Q-028-12's.
14. **The provisioned instance's snapshot reads §3.1** (A1 F2, §3.6's last row): the snapshot lint run over
    a fixture snapshot. Drifts, each a fixture edit: the login role with `rolinherit` true; a membership in
    `app_maintenance`; the `app_worker` membership with `inherit_option` true; a member other than the
    migration owner's admin row; that admin row with `set_option` true; a `pg_db_role_setting` row
    (`role=app_worker`) — each a finding by name.

## 6. Alternatives

- **A. `app_worker` itself `LOGIN`.** Rejected (§3.1): it binds the credential to the role every policy
  names, makes `RESET ROLE` a no-op, and moves `app_worker`'s own pins.
- **B. An `INHERIT` login role, or a membership `with inherit true`.** Rejected: a connection that forgets
  the preamble then runs with the worker's reach silently, instead of failing `42501`. `003` was written
  because the repository's own record once claimed this property and did not have it.
- **C. `service_role` or `postgres` for the worker.** Rejected by `RFC-2026-017` and `RFC-2026-016` §5: both
  bypass, and every policy written for the worker would be moot.
- **D. One login role for the worker and the maintenance path.** Rejected (§3.1): a single credential that
  can become the cross-tenant role makes the worker's confinement a choice of the process.
- **E. Certificate authentication instead of a password.** Not rejected; not chosen. It removes a shared
  secret, but whether the platform and its pooler accept client certificates for a custom role is
  unmeasured. Recorded as an option for Q-028-3.
- **F. Do nothing until G1.** Rejected by DATA-DEC-03's own deadline: G1 needs a worker, and every `S` cell,
  `RFC-2026-026`'s worker half and §11.4 after its first step are blocked on this decision.

## 7. Rollback

Before approval: delete this file and its rows in `DECISION_RECORDS`, `DIGESTED_FLOOR` and the manifest's
writable paths; nothing depends on it. After §4/1 lands: a forward migration revokes the membership and
drops the role (after its sessions are ended on the provisioned instance), with the three pins of §3.6
reverted in the same diff; every `S` cell returns to unreachable, which is the state today. The credential
is revoked in the secret store by the Integration Owner. Never an edit of an integrated migration.

## 8. What this does not decide

- The broker (`app_queue`, `RFC-2026-022` §5/6), its signature and `CTR-JOB-001`'s lifecycle vocabulary.
- `app_maintenance`'s login, if any (Q-028-8).
- The worker's runtime, language, scheduler and deployment; only what the database sees of them.
- Any service policy, any cell's predicate, any retention number, the recovery window (DATA-DEC-04).
- Whether schema `app` is exposed to the Data API (`RFC-2026-021` §10); the worker does not use it.

## 9. Questions, each with A0's recommendation

All UNANSWERED. A0's recommendation is **a recommendation, not an answer**; each is held on
`open_blockers[199]` with its owner.

| id | for | question | A0's recommendation |
|---|---|---|---|
| Q-028-1 | Owner, A1 | Approve §3.1's shape: a dedicated `LOGIN NOINHERIT NOBYPASSRLS` role, member of `app_worker` alone with `inherit false, set true, admin false`, `SET LOCAL ROLE` per transaction? | **Yes**, after this batch's role runs report no stop-the-line and their findings are folded in. |
| Q-028-2 | A1 | The role's name. | **`app_worker_login`**; not load-bearing, but every pin of §3.6 spells it. |
| Q-028-3 | Integration Owner, operations, A1 | Custody on the provisioned instance: secret store, verifier set out of band, rotation cadence; or certificates (§6 E)? | **A SCRAM verifier set by the provisioning runbook from the platform's secret store; rotation at least every 90 days and on any suspicion; certificates revisited after the platform measurement (Q-028-12).** The cadence is operations' to set before G1. **Conditions of any answer (§3.3/2, A1 F3):** no request-path runtime can read the credential's secret scope; the production secret is generated with at least 32 random bytes; a decision on network restriction to the worker's egress is recorded either way; and the snapshot is re-taken after each credential change (A1 F2). |
| Q-028-4 | A0, A1, Q0 | Local and CI test credential as §3.3/3, with authentication cases on `scram-sha-256` clusters only? | **Yes**, reusing `try-it`'s measured password-file pattern; the harness, not the migration, sets it. |
| Q-028-5 | A0 (kernel range `050`), A6 (whose `RFC-2026-026` worker half needs it), CTR-JOB-001's owner | `app.jobs` keeps no `actor`, `request_id` or `correlation_id` (§2/6): add `CTR-TEN-001`'s fields as columns before `RFC-2026-026`'s worker half, or carry them in `input_ref`? | **Columns**, `not null` with `CTR-TEN-001`'s bounds, in a forward migration of A0's kernel range; `CTR-JOB-001`'s reading of `tenant_context` restated to match. |
| Q-028-6 | A1, A6 | §3.4's sources: `request_id` minted per attempt, `correlation_id` carried from the enqueuing request (or the sweep's run id), `causation_id` the job id, `actor` the job's (or `system_actor` for a sweep)? | **Yes**, as the table states; the database mints none of them. |
| Q-028-7 | Owner, A1 | The order of §3.5: the audit worker half first, then §11.4's purge, then the retention sweep? | **Yes.** The audit row is a precondition of every honest worker act; purge and sweep carry further dependencies listed beside each. |
| Q-028-8 | A1, Owner | The retention sweep: `app_worker` through the broker (the service-policy map's row) or `app_maintenance` (`RFC-2026-017` §3)? And does `app_maintenance` get a login? | **The broker, as `app_worker`**: a sweep is a job, claimed like any other, and the map's DISCOVERED row already says so; `app_maintenance` keeps purge verification and chunked backfills, each use with a recorded reason, and its login is its own RFC when the first such use is written. `RFC-2026-017` §3's row corrected by its owner (A0) then. |
| Q-028-9 | Integration Owner | The role migration's number. | **The next free number above the highest merged migration** when it is written (migrations apply in filename order, and a number below the applied set would run out of order on an instance that holds later ones), recorded as a one-time exception to the registry's ranges the way Q150-c's was; the role topology is A0's foundation work (`001`-`004`). |
| Q-028-10 | A0 | The fourth rule reads memberships "whatever the grant's INHERIT, SET or ADMIN option": should it read the options of a pinned entry? | **Yes**, in the same diff as the pin: a pinned membership is pinned with its three options, so §5/2's `with admin option` drift fails (its `with inherit true` drift already fails today through the table-level grant rule, Q0-R5). |
| Q-028-11 | A1 | A connection limit on the role? | **Yes, set to the worker pool's size and pinned in the snapshot**; a resource bound, not a security boundary, and recorded as such. |
| Q-028-12 | Integration Owner, A0 | The platform pooler: does it accept a custom login role, in which mode, and does `SET LOCAL ROLE` / `set_config(…, true)` end with the transaction there (`RFC-2026-022` §7.3 (d))? | **Measure it on the provisioned instance as part of Q170-c's read-only measurement, before the worker connects through the pooler; until measured, the worker connects directly or through a session-mode pool.** The same measurement reads what the pooler resets between clients — in particular whether a session-level custom setting such as `app.workspace_id` survives into another client's transaction (§5/13, A1 F4). |
| Q-028-13 | A0, Integration Owner | §4/1 applied by a non-superuser `CREATEROLE` role, as on the provisioned instance (C0-1, A1 F1): does the apply-time block hold with the applier's admin row (admin t, inherit f, set f) as the one member, does `createrole_self_grant` on the platform add `INHERIT` or `SET` to it, and can that owner revoke the row? | **Measure it before §4/1 is applied to the provisioned instance**: once on a local cluster where the applier is a non-superuser `CREATEROLE` role (as A1 simulated), and on the platform as part of Q170-c's read-only measurement (`createrole_self_grant`, the row's options, its grantor). Until measured, §4/1 is applied to migrate-clean clusters only. |

## 10. Provenance, and what a reviewer should discount

Drafted by a subagent of the Author's run, which is the run that owns `001`-`004` and the probes this RFC
asks to move; it proposes the identity its own batches will consume. Every file and line cited was read at
`921efb5`; nothing was measured on a database for this text (no DB-read input changed in this batch), so
every claim about PostgreSQL behaviour above — `SET LOCAL ROLE`'s scope, a no-password role's inertness
under `scram-sha-256`, `has_schema_privilege` under `inherit false` — is **to be executed by the batch that
lands §4/1, never cited** (`RFC-2026-020` §6.2's rule). The review round's role runs prototyped §3.1 on
throwaway clusters (A1 R0, Q0 §4: `evidence/WP-0A-DB-00/a1-batch-rfc-023-028-security-review-2026-10-03.md`,
`q0-batch-rfc-023-028-test-review-2026-10-03.md`), and the revision cites what they measured where it
changed the text; those prototypes are theirs, not the implementing batch's migration, and discharge no
obligation of §5. The reviewer should weigh §3.4's finding on its own:
it is about `RFC-2026-026`'s worker half, which this author also wrote.
