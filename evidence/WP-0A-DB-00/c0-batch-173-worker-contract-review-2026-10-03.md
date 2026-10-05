# C0 contract review: batch 173-worker

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-173-worker`, head
  `b0014953593364bfff6521b41a0ae13b3983d50b` over code `eb413e9fbafdf8f04a2a3dcad8d709ddf27293f1`, base
  `aa0e89f` (main, the merge of PR #183). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/184>.
- **Review branch:** `review/c0-batch-173-worker`, checked out at the subject head `b001495`. This file is its only
  commit.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-173-worker-plan-2026-10-03.md`; the disposition
  `product-owner-disposition-2026-10-03-batch-173-worker.md`; `git diff aa0e89f..b001495` (17 files) and both commit
  messages; `RFC-2026-028` whole (§1-§10, and the one line this batch adds); the rfc-023-028 disposition §6 (the
  approval record and the order "RFC-2026-023's batch, then RFC-2026-028's role migration, then the `app.jobs`
  columns"); `scripts/db/psql-driver.mjs` `script()` and `invoke()`; the migrate-clean apply loop in `run.mjs`;
  `.github/workflows/ci.yml` (the service container and the rls-smoke steps); the handoff; `open_blockers` at base and
  head, compared entry by entry.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under RFC-2026-024
that makes this an independent-role run by configuration, not by provenance: I share the Author's training and blind
spots. Acceptance of this file as the C0 role's signature is the Integration Owner's and the Product Owner's act, not
mine.

## 1. Verdict

- **Stop-the-line: no.** No secret, tenant leak, lost job, duplicate side effect, migration divergence or contract
  mismatch was found. The role is created with no credential. The harness's test credential is set as a verifier and
  removed: after every round I read `pg_authid.rolpassword` as null. No `SCRAM-SHA-256$` string appears in the smoke
  log or the server log.
- **Blocks the merge: nothing in this review.** The findings below are Low or Info. The merge still waits on what
  RFC-2026-002/025 require: a green required CI run on `b001495` (in progress when this was written, §5), the A1 and
  Q0 runs, and the Integration Owner's acceptance of the number 173 (`open_blockers[201]` (1)).
- **Q1, is migration 173 exactly RFC-2026-028 §3.1-§3.3 and §4/1? Yes.**
  - The `create role` and the `grant` are §3.1's two statements character for character
    (`173_worker_login_identity.sql:69,71`).
  - `set local createrole_self_grant = ''` is A1R-1's remedy, and it comes first (`:67`).
  - The apply-time block asserts §4/1 item by item:
    - the attributes, and stricter than the RFC: `rolconnlimit` -1 and no `rolvaliduntil`;
    - exactly one membership row with its three options;
    - members read per row: none when the applier is a superuser, and only the applier's own `(admin true, inherit
      false, set false)` row when it is not;
    - no `pg_shdepend` row, so no ownership, ACL or default ACL;
    - no `USAGE` or `CREATE` on `app` or `private`;
    - no `pg_db_role_setting` row.
  - The block reads no `pg_authid`.
  - No fed source carries a credential. `workerCredentialLint` reads all 96 fed sources and finds 0 problems
    (re-measured).
- **Q2, are the pins and drifts complete and legitimate? Yes.**
  - Every row of §3.6's table is present (`run.mjs:1376-1377, 1403, 1453-1469, 1520-1545, 695, 3951, 3712`).
  - The ninth rule and `PINNED_ROLE_MEMBERSHIP_OPTIONS` go beyond the table. Both are named in the disposition (D2,
    D7), and each holds one more drift. Neither loosens a pin.
  - The §5 obligations this batch owes are discharged. Three of §5/1's four drifts had no recorded measurement, so I
    measured them myself (C0-2).
- **Q3, is Q-028-5 handled as the RFC recommends? Yes.**
  - The RFC recommends the columns `not null`, with CTR-TEN-001's bounds, and with CTR-JOB-001 restated by its owner.
  - `contract-catalog/` is read-only for this package.
  - Deferring the columns to the next batch, still before RFC-2026-026's worker half, follows both the RFC and the
    approval record's order (rfc-023-028 disposition §6, "Next" 2-4).
  - A nullable copy would not have matched the RFC's answer. The Author refused it and named the refusal (D4).
- **Q4, is every decision named and recorded? Yes.**
  - D1-D12 are named in plan §4 and disposition §4, and recorded on `open_blockers[201]`.
  - One choice is unnamed: where the test credential file lives. It is C0-3.

## 2. Measured, with what

Every measured run used Node `v24.20.0` (checked before each one) and PostgreSQL 17.11. The cluster was
`127.0.0.1:5505` only, started with `initdb --locale=C -A trust -U postgres` and
`-c listen_addresses=127.0.0.1 -c unix_socket_directories=''`, under `LC_ALL=C`. The shim ran first, and each round
re-ran `initdb`. The private directory was `scratchpad/c0-173-worker/`. `TMPDIR` pointed into that directory, so the
harness's credential file stayed there too. I checked after each run that the directory was empty.

| what | result |
|---|---|
| `node scripts/verify-branch-scope.mjs aa0e89f WP-0A-DB-00`, on the branch NAME `agent/claude/WP-0A-DB-00-batch-173-worker` at `b001495` (checked out with `--ignore-other-worktrees`, no commit made, then back to the review branch) | exit 0, "all 17 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff`, same branch name | exit 0, "nothing substantive after its cited head" (the handoff cites `eb413e9`; `b001495` is the protocol commit) |
| `npm run verify`, same branch name | exit 0, "tests 691, pass 691, fail 0, skipped 0, todo 0" |
| the same three on `review/c0-batch-173-worker` | scope exit 0; `check:handoff` exit 75, "no work package declares ownership.branch" (expected: a review branch is not the package's branch, which is why the name is measured) |
| base round: `make db-migrate-clean`, `make db-rls-smoke` | exit 0, exit 0. Pinned grant probe: 10 drifts refused. Client membership probe: 3 refused. Post-migrate pass: 54 / 38 / 16. `db-authz-proofs: ok — 13 claim(s) discharged by execution; 1 not run on this cluster (worker-login-authentication)` |
| §5/7-9 transcript (base round) | logged in as `app_worker_login` on both `current_user` and `session_user`. Before `SET LOCAL ROLE`: `42501 permission denied for schema app`. `app_worker` taken. `app_command`, `app_maintenance`, `authenticated`, `anon`, `app_authz`, `postgres` each `42501 permission denied to set role`. `app.close_workspace` `42501`. Itself again after commit; the `set role` control persists. Controls (a), (b) and §5/8 red; the self-test green |
| §5/10 | 22 of 22 tables `app_worker` may SELECT hold fixture rows as the connection role, and every one reads zero through the login role. The permissive-policy control returns 2 rows (red) |
| §5/13 | `is_local true`: the next job starts with `''`. Control `is_local false`: the workspace leaks and the check refuses it |
| §5/12 with `host all app_worker_login 127.0.0.1/32 scram-sha-256` first | rls-smoke exit 0, `worker-login-authentication` RUN and ok. Wrong credential: `password authentication failed`. None: `fe_sendauth: no password supplied`. The generated one connects. `14 claim(s) discharged` |
| §5/12 drift: `host all app_worker_login 127.0.0.1/32 trust` first | rls-smoke exit 2, `FAIL worker-login-authentication`: "pg_hba line(s) 1 trust app_worker_login by name" |
| after each smoke round | `rolpassword is null` for the role; credential directory empty |
| catalog after migrate-clean | one membership row `app_worker_login -> app_worker (admin f, inherit f, set t)`, grantor `postgres`; no member |

**Drifts on migrate-clean.** Each ran on a fresh cluster. Each was appended to the file named, and the file was
restored with `cmp` (byte for byte) and `git status` clean after every one.

| drift (RFC §) | appended to | result |
|---|---|---|
| `alter role app_worker_login superuser` (§5/1) | 173 | exit 2: "superuser role(s) other than the migration owner …: app_worker_login" |
| `alter role app_worker_login inherit` (§5/1) | 173 | exit 2: rule 8, "app_worker_login rolinherit" |
| `alter role app_worker_login createrole` (§5/1) | 173 | exit 2: rule 8, "app_worker_login rolcreaterole" |
| `grant app_worker_login to app_maintenance` (§5/3) | 173 | exit 2: rule 4, "app_maintenance -> app_worker, app_maintenance -> app_worker_login" |
| `alter role app_worker_login set search_path = app` (§5/4) | 173 | exit 2: settings rule, "app_worker_login in every database: search_path=app" |
| `alter default privileges for role postgres grant select on tables to app_worker_login` (§5/4) | 173 | exit 2: rule 8's default-ACL arm, "default privilege entry in every schema, of role [redacted]" (the driver redacts the connection user's name) |
| `alter role app_worker_login valid until '2031-01-01'` (beyond §5) | 173 | exit 2: the post-migrate pass, 173's block, "rolvaliduntil = 2031-01-01 …" |
| `create role app_worker_login nologin` (a pre-existing role) | `140_audit.sql` | exit 2: "173_worker_login_identity.sql: role \"app_worker_login\" already exists (42710)" |

The brief's default location for drifts is `140_audit.sql`. The role does not exist when 140 runs, so every drift
that names the role went to 173, as the Author did (D11). The one drift that makes sense at 140, a role pre-created
before 173, was put there.

**Q-028-13, local half, re-measured** on the same cluster. The applier was `c_applier`, a non-superuser
`CREATEROLE` role holding `app_worker` with admin option, reached through `set role`.

- 173 as written, inside one transaction (rolled back): exactly one member row, `c_applier (admin t, inherit f,
  set f)` with grantor `postgres`. The block holds.
- With `createrole_self_grant = 'set, inherit'` in force at `create role`: a second row appears,
  `c_applier (admin f, inherit t, set t)` with grantor `c_applier`. This is A1R-1's row.
- 173 fed with no enclosing transaction (autocommit, as `psql -f` would apply it): see C0-1.

## 3. Findings

| id | grade | where | finding | remedy |
|---|---|---|---|---|
| C0-1 | Low | `db/foundation/migrations/173_worker_login_identity.sql:67` | A1R-1's remedy is `SET LOCAL`, so it works only inside a transaction block. Measured: fed in autocommit, PostgreSQL prints `WARNING: SET LOCAL can only be used in transaction blocks` and the setting stays `'set, inherit'`. `create role` and `grant` then commit with the second row (admin f, inherit t, set t). The block fails closed and names both rows, but the role and the row it refuses are already committed. migrate-clean is safe because `script()` wraps every migration in `begin … commit` (`psql-driver.mjs:364-366`). The provisioned instance is where it matters, and there the applier and its wrapping are not yet decided. 173 is held back there by D5. | Add to `open_blockers[201]` (2): before 173 is applied to the instance, the apply must run inside one transaction. Read whether the platform's migration runner wraps each file, alongside Q-028-13's platform half. Either recorded condition or a file change in a later forward migration is fine. No change to 173 is needed for migrate-clean. |
| C0-2 | Low | plan `:116-117`; `open_blockers[201]` (8); handoff `known_limitations[3]`; RFC-2026-028 Implemented line ("§5/1-4 … executed") | The records say the login role's other attribute drifts "(inherit, bypassrls) are refused as measured appended drifts". The plan's measured list (§3, D1-D11) holds `bypassrls` (D4) but no `inherit`, `createrole` or `superuser` drift. Those are three of §5/1's four named drifts. The claim was not backed by a recorded measurement. | **Re-measured here and true** (§2: each exit 2, refused by name). Record at the re-check that §5/1's inherit, createrole and superuser drifts are C0's measurement, not the Author's. |
| C0-3 | Low | `scripts/db/authz-proofs.mjs:1022` | The test credential's password file is created under `os.tmpdir()`. RFC-2026-028 §3.3/3 says "inside the cluster's own directory or the job's temporary directory". In CI (`/tmp` on an ephemeral runner) this is the job's temporary directory in effect. Locally it is the user's `TMPDIR`, which is neither. The file is 0600, exclusive-create, in a 0700 `mkdtemp` directory, and deleted in `finally` (measured: the directory was empty after every round). So the exposure is small, but the choice is unnamed among D1-D12. | Name it as a decision at the re-check (D13), or pass the cluster's directory or `RUNNER_TEMP` through. No security finding. |
| C0-4 | Info | `evidence/VERIFICATION.md` at `eb413e9` | The code commit's record reads 691 pass. The handoff's own `npm run check` line for that commit reads 691 tests, 689 pass, 2 fail (the handoff guard). The record was written ahead of the measurement it states, for a tree the next commit completes. At the head it is true: re-measured 691 / 691, and the Author's re-record left it byte for byte. | None for this batch. Recording only after the refresh would keep every commit's record a measurement. |
| C0-5 | Info | `173_worker_login_identity.sql:81-82`; `run.mjs:3712-3735` | The block's comment says it reads `pg_default_acl`. It reads default ACLs only through `pg_shdepend`, which records them, so the property holds (re-measured: the default-ACL drift is refused). The snapshot lint records no `valid_until`, while the block pins it. RFC §3.6's snapshot row does not list it either. | Correct the comment wording if 173 is ever superseded. Add `valid_until` to the snapshot fields when the snapshot is retaken with 173 applied (`open_blockers[201]` (2)). |
| C0-6 | Info | `run.mjs:2964-2990` | `workerCredentialLint` refuses the word `password` followed by anything but `NULL` in any token position, so `create table t (password text)` is refused (measured). This fails closed and the limits half-state it. It also misses a clause computed at run time (`'… pass' \|\| 'word …'`, measured clean), which is stated, and rule 9 holds that live on migrate-clean. | None. Record the column-name case in the stated limits if one is ever needed. |

## 4. Claims checked

- **Commit messages.**
  - `eb413e9`'s body matches its diff. The one exception is "eleven drifts … each refused by name", which is true
    for D1-D11, but §5/1's other three were not among them (C0-2).
  - `b001495`'s body claims "Nothing else changes". Re-measured: the commit touches the handoff alone, and
    `check:handoff` exits 0.
- **Plan §3 and the handoff's command lines.** Every outcome I re-ran matched: the base rounds, §5/12 both ways,
  Q-028-13 locally, the probe and self-test counts (10, 3), the 54 / 38 / 16 pass, and the 13+1 proof lines. I did
  not re-run D1-D11 one by one. I measured different drifts (§2), and the probes' self-tests cover D3, D8 and D10's
  shapes on every run.
- **Disposition.**
  - The Owner's words quoted in §1 match the earlier dispositions they cite.
  - The claim that RFC-2026-028 is approved matches rfc-023-028 disposition §6 ("RFC-2026-028 is APPROVED").
  - #183's merge record matches `git log` (merge `aa0e89f` of `58cff07`).
  - It claims nothing that it lacks. In particular, it states that RFC-2026-002's literal rule is not met when A0
    presses the merge.
- **Blocker edits.** `open_blockers` at base had 201 entries and at head 202. Entries [113], [193], [196], [198],
  [199] and [200] each start with their base text byte for byte, and only text is appended. [201] is new and last. No
  other entry changed.
- **RFC-2026-028.** One line was added (the Implemented line). Its claims hold: what landed, what did not, and
  A1R-2 recorded as an obligation. "§5/1 … executed" holds only with C0-2's measurements.
- **Manifest.** `amends_without_owning` names exactly the four out-of-ownership files the diff touches. Every other
  path is inside `writable_paths` (scope exit 0).
- **Order.** The rfc-023-028 approval set the order: RFC-2026-023's batch (141, merged in #183), then this
  migration, then the `app.jobs` columns. The order is kept.

## 5. CI

PR #184's required check `bootstrap` (run 37285050018) was `IN_PROGRESS` at both readings in this review, so it is
not read here. `open_blockers[201]` (6) asks whether `worker-login-authentication` prints RUN or NOT RUN in CI. The
CI service is `postgres:17` with `POSTGRES_PASSWORD` set and connects over TCP. Whether its default host rule asks
the role for a credential is still read, not measured. That reading, and the run's conclusion, are owed to the
re-check or the Integration Owner before merge.

## 6. Limits

- I share the Author's model family (§0).
- I did not run the CI negative-control loop locally.
- I did not measure the platform: Q-028-13's platform half, Q170-c, and the pooler (Q-028-12).
- I did not review RFC-2026-028's text for approval. It was approved before this batch.
- I read the foundation-contract tests' names, anchors and the RFC 7677 vector, not every assertion. I re-ran them
  through `npm run verify`.
- Cleanup: the 5505 cluster was stopped and its data directory removed after this file was written. The temporary
  credential directory was empty at every check.
