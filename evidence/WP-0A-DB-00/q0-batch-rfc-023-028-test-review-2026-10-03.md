# Q0 independent test of batch rfc-023-028 (PR #182)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-023-028`, head `b0adf6b` (the handoff, last and alone), over the
evidence commit `3d21389` and the code commit `1da0b1c`, base `921efb5` (`main`). **Author:** `/claude/a0_atlas`.
**PR:** https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/182 (Draft, OPEN, MERGEABLE, head `b0adf6b`; check
`bootstrap`, run 37255381909, **success** on `b0adf6b`).
**Tested on:** my own branch `review/q0-batch-rfc-023-028`, created at `b0adf6b`. The repository commands ran on the
branch NAME (§1.1).
**Date:** 2026-10-05. The file name carries the phase's date (2026-10-03), as the batch's other records do.

This file records findings. It advances no status, approves nothing, test-verifies nothing on anyone's behalf, and
decides nothing that the Integration Owner, A1, A1 Identity or the Product Owner holds. It repairs nothing. It approves
neither RFC and answers none of Q-023-1..8 or Q-028-1..12.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and the same vendor and model family as the Author. A0's
workflow wrote my brief, chose the questions, the port and the output file, and A0 wrote the change under test. My
independence is the independence `RFC-2026-024` describes, and no more. Whether this record counts as the Tester role's
signature is for the Integration Owner and the Product Owner to decide, not me.

## 1. Measured versus read

**Setup for every measured run:** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`), printed before each run; the
PATH Node 26 was not used. PostgreSQL 17.11 from `/opt/homebrew/bin`. A fresh `initdb --locale=C -A trust -U postgres`
for every round, on 127.0.0.1:**5503** only, TCP only (`-c unix_socket_directories=''`), `LC_ALL=C`; the shim
`db/foundation/ci/supabase-shim.sql` first (exit 0 every round); `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`.
Private directory `scratchpad/q0-rfc-023-028/`. I touched no other port. The one migration drift was appended to
`db/foundation/migrations/140_audit.sql` and restored from a private copy, checked with `cmp`; sha256
`2ac596bb950e8dfb…` before and after. The cluster was stopped and its data directory removed; at the end
`pg_isready -h 127.0.0.1 -p 5503` printed "no response". `git status --porcelain` was empty before I wrote this file.
Nothing was pushed.

**Measured:** the four repository commands on the branch name (§1.1); A0's seven drifts D1-D7 (§2); two untouched
database rounds and one with a drift (§3); a prototype of RFC-2026-028 §3.1 on a migrated cluster, with every §5/1-§5/10
and §5/12 obligation run against today's `scripts/db/run.mjs` probes (§4); a prototype of RFC-2026-023 §3.2 as revised,
with every case and negative control of its §6 that does not need a command function (§5); the citations listed in §6.

**Read, not executed:** RFC-2026-023 §3.3's closure amendment and §8's closing command (no command function exists);
RFC-2026-028 §5/5 (the static `PASSWORD` rule does not exist yet) and §5/11 (owed elsewhere); `md5` authentication
(§3.3/1 says scram or md5; I measured scram only); the platform pooler (Q-028-12); A0's `commit-when-clean` refusal on
`1da0b1c` (plan §3); the disposition's reading of the Owner's words; `ALTER FUNCTION ... OWNER TO` under a
non-superuser migration owner (finding Q0-R1's last sentence).

### 1.1 Repository commands, on the branch NAME

The branch is checked out in A0's worktrees. I ran `git checkout --ignore-other-worktrees
agent/claude/WP-0A-DB-00-batch-rfc-023-028` in my own worktree; `git branch --show-current` printed that name and HEAD
was `b0adf6b51299d57e6d8c010c31d13bf6e6bc474b`. I committed nothing there and switched back to
`review/q0-batch-rfc-023-028` before any database round and before writing this file.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 921efb5 WP-0A-DB-00` | 0 | "all 11 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| `npm run check` | 0 | tests 685, pass 685, fail 0 |

## 2. A0's drifts, re-run

Each applied to the working tree on the branch name, measured, restored from a private copy and checked with `cmp`.

| id | exit (A0) | exit (Q0) | what failed, as I saw it |
|---|---|---|---|
| D1 | 1 | 1 | "…RFC-2026-028-worker-identity.md is a file nobody declared" |
| D2 | 73 | 73 | "changed 1 path(s) it neither owns nor records as an amendment" |
| D3 | 74 | 74 | "declares 1 amendment(s) that explain nothing this branch changed" |
| D4 | 73 | 73 | the same as D2, for `test-kits/repository-json.test.mjs` |
| D5 | 1 | 1 | `foundation-contract.test.mjs`, 1 failing (all 33 pins +1) |
| D6 | 86 | 86 | "content does not match its recorded digest" — a tripwire on any edit, as plan §2 says |
| D7 | 1 | 1 | "…RFC-2026-028-worker-identity.md carries no digest" |

All seven reproduce. I also re-measured the line pins directly: 33 pins in `audit-coverage-map.json`, every one at
line `257+i`, every quote present on its line; `open_blockers` opens on manifest line 256; `[199]` is on line 456 and is
the last entry (200 entries, 199 at base). `[113]` and `[195]` are the only changed entries, and each base text is a
prefix of the new one (append-only). Only `branch`, `writable_paths` (+1 path, the RFC) and `amends_without_owning`
(four paths, `test-suite-contract.mjs` gone) changed in `ownership`.

## 3. Database rounds

| round | `migrate-clean` | `rls-smoke` |
|---|---|---|
| r1, untouched | 0, "52 apply-time blocks, 38 re-run as written, 14 superseded and replaced" | 0, "1129 isolation case(s) passed"; "7 claim(s) discharged by execution" |
| r2, §3.1's two statements appended to `140_audit.sql`, no pin moved | **2**: "pinned grant probe: as built: role membership(s) of a non-superuser role not pinned … app_worker_login -> app_worker (P0001)"; its self-tests after drifts 5-8 then fail on the same raise | 0 (not meaningful: it ran on the cluster migrate-clean had built) |
| r3, untouched after restore | 0, the same as r1 | 0, the same as r1 |

A0 ran neither layer; nothing the DB layer reads changed, and r1/r3 agree with batch 171's numbers. r2 confirms
RFC-2026-028 §2/4's premise: the role cannot be added today without a pin moving.

## 4. RFC-2026-028: are the test obligations executable, and does each drift fail?

The role was created exactly as §3.1 writes it, on r1's migrated cluster. Catalog: `rolcanlogin t, rolinherit f,
rolbypassrls f`, `rolpassword` null; one membership `app_worker`, `inherit_option f, set_option t, admin_option f`;
`has_schema_privilege('app_worker_login','app','USAGE')` **false**, `pg_has_role(…,'app_worker','USAGE')` false, `'SET'`
true. So §3.6's claim that the seventh rule does not move holds on PostgreSQL 17.

"sim" below is `PINNED_GRANT_PROBE_SQL` exported from today's `run.mjs` with §3.6's two pins simulated by text
substitution (the fourth rule's array gains `'app_worker_login -> app_worker'`; the eighth rule excepts
`app_worker_login rolcanlogin`). Each drift ran in its own rolled-back transaction.

| § | drift | probe | result |
|---|---|---|---|
| 3.1 | none | shipped | refused, fourth rule, `app_worker_login -> app_worker` |
| 3.1 | none | sim; client membership probe | **pass**, both (the shape needs exactly the two pins §3.6 names, plus the settings rule's extension) |
| 5/1 | `bypassrls`, `inherit`, `createrole` | sim | refused by name, eighth rule |
| 5/1 | `superuser` | sim | refused, "superuser role(s) other than the migration owner" |
| 5/2 | `grant app_command`, `grant app_maintenance` | sim | refused, fourth rule |
| 5/2 | `grant app_worker … with inherit true` | sim | **refused today**, by the table-level grant rule ("unlisted: app_worker_login INSERT on app.ai_model_policies; …") — not only after Q-028-10 (Q0-R5) |
| 5/2 | `grant app_worker … with admin option` | sim | **passes** today, as §5/2 says; needs Q-028-10 |
| 5/3 | `grant app_worker_login to authenticator` | — | **not executable**: `role "authenticator" does not exist` on the shim cluster (Q0-R6) |
| 5/3 | `grant app_worker_login to authenticated` | client membership; sim | refused by both |
| 5/4 | `grant usage on schema app` | sim | refused, seventh rule |
| 5/4 | `grant select on app.jobs` | sim | refused, table-level rule |
| 5/4 | `alter role … set role = 'app_worker'`, `… set search_path = app` | sim; client | **pass** today — the settings rule's extension is owed, as §3.6 says. Measured why it matters: a fresh login then starts as `current_user = app_worker` and `select count(*) from app.jobs` runs (0 rows) before any `SET LOCAL` |
| 5/4 | `alter default privileges … to app_worker_login` | sim | refused, eighth rule's default-ACL arm |
| 5/6 | `alter table app.jobs owner to app_worker_login` | sim | refused, "pinned table(s) owned by a role that is not a superuser" |

**Live, connecting as `app_worker_login`** (trust cluster; role committed on the throwaway cluster):

| § | measured |
|---|---|
| 5/7 | `select 1 from app.workspaces limit 1` → `42501: permission denied for schema app` ✔. **Negative control as written** (`grant usage on schema app to app_worker_login`) → `42501: permission denied for table workspaces` — **the same SQLSTATE**, so a case that asserts 42501 stays green (Q0-R2). An alternative control, the membership re-granted `with inherit true`, returns `0` with no error, which turns any form of the case red |
| 5/8 | `set local role app_worker` succeeds; `app_command`, `app_maintenance`, `authenticated`, `postgres` each `42501: permission denied to set role "…"` ✔ |
| 5/9 | inside: `app_worker`; after `commit`: `app_worker_login` ✔. Negative control (`set role` then `begin; commit;`): `app_worker` — red, as §5/9 says ✔ |
| 5/10 | `app.jobs` through the login role under `set local role app_worker`: **0**; through `postgres`: **2** (the fixture's rows); through `private.as_service()`: 0 ✔ |
| 5/12 | first line of `pg_hba.conf` made `host all app_worker_login 127.0.0.1/32 scram-sha-256` (reloaded). Null verifier, no password: `fe_sendauth: no password supplied` (psql printed a prompt first; a harness should pass `-w`). Null verifier, a password: `password authentication failed`. A SCRAM verifier computed client-side in Node from 32 random bytes and set with `alter role … password :'v'`: stored as `SCRAM-SHA-256$…`; the generated credential through a `0600` `PGPASSFILE` connects; a wrong one is refused; none is refused. The password appeared on 0 lines of the server log; all three secret files were deleted (0 left). Nothing secret is in this file ✔ |

**Also measured:** `pg_authid` is unreadable to a non-superuser (`permission denied for table pg_authid`), and
`pg_roles.rolpassword` reads `********` for a role whose password is null (Q0-R3).

## 5. RFC-2026-023: §3.2 as revised, and its §6 controls

Prototype inside one rolled-back transaction on r1's cluster: the five-column grant, the `app_authz` policy `using
(user_id = app.jwt_subject())`, both helpers as §3.2 writes them (`SECURITY DEFINER`, `STABLE`, `sql`,
`search_path = ''`, owned by `app_authz`, membership conjunct `app.is_active_member`), `EXECUTE` to `app_command` alone.
Called as `app_command` with the claims of fixture users, workspace `c4840acc…`:

**First, as written, every call failed `permission denied for schema app`.** `app_command` holds no `USAGE` on `app`
(`PINNED_SCHEMA_PRIVILEGES`, `run.mjs:1354`), and RFC-2026-023 §5 does not list that grant or that pin (Q0-R1). With
`grant usage on schema app to app_command` added inside the transaction:

| acting user | page-own | page-sibling | business-own | business-other |
|---|---|---|---|---|
| page-scoped (`c31e3c84…`) | t | **f** | t | f |
| business-scoped (`a324d4a6…`) | t | t | t | **f** |
| owner, no scope row | t | t | t | t |
| member of another workspace only | f | f | f | f |
| suspended member | f | f | f | f |
| no claims | f | f | f | f |
| owner, workspace `closing` | t | t | t | t (as in `active`) |
| owner, `access_blocked` / `deleted` | f | f | f | f |

| §6 control | measured |
|---|---|
| gate inherited; negative control: helper rewritten to repeat `011`'s join with no lifecycle conjunct | owner in `access_blocked`: business-own **t**, business-other **t** — red, as §6 says ✔ |
| scope half; negative control: the new `app_authz` policy dropped | page-scoped user's sibling page **t**, business-scoped user's other business **t** — the false cases go true, as §6 says ✔ |
| `scope_type` withheld from the grant ("fails to create (42501 at CREATE FUNCTION, or at first call)") | `CREATE FUNCTION` and `ALTER FUNCTION … OWNER TO app_authz` **succeed**; the first call fails `permission denied for table workspace_member_scopes` (Q0-R7) |
| `EXECUTE` held as §3.2 says | `authenticated`: `permission denied for function acting_user_admits_business`; `anon`: `permission denied for schema app` (both 42501) ✔ |

So §6's new cases are executable and their negative controls go red — once `app_command` can use schema `app`.

## 6. Claims checked

**True, re-measured or read at the cited line:** commit `1da0b1c` touches the 8 code paths its message lists, `3d21389`
the plan and disposition only, `b0adf6b` the handoff only (last and alone). The handoff's `base_revision` is `921efb5`,
its head `3d21389`, `final_status` `author_complete`, ten files listed (the handoff itself aside). #181: merged
2026-10-05T00:15:42Z, merge commit `921efb5`, head `d99d22c`, run 37245602888 `success` on `d99d22c` (`gh`). The
RFC-2026-028 §2 citations: `003:26`; `run.mjs:640`, `:642`, `:1340`, `:1354`, the eighth rule at `:1455-1465`,
`:3714-3724`, `:3803`, `:3816`; `auth-context.sql:95-108`; ERD `:866`; `050:426-427`, `:490-510` (no `actor`,
`request_id` or `correlation_id` column), `:608`; `010:427` (`app_worker` table-level `select, insert, update` on
`app.workspaces`); `service-policy-map.json` 16 cells, 13 carried, 3 discovered; RFC-2026-017 §3 gives retention sweeps
to `app_maintenance` (line 50); RFC-2026-026 §3.5 sources the ids from "the job's `tenant_context`" (lines 276-279). The
RFC-2026-023 citations: `021:326`, `:389-400`, `:415-450`, `:505-507`; `011:211-216`; `171:77`, `:171-226`.
`audit-coverage-map.json` is read only by `test-kits/db/foundation-contract.test.mjs` (grep of `scripts`, `tests`,
`test-kits`, `db/foundation/ci`, `Makefile`, `.github`). A0's finding (4) and its grade (MEDIUM for the design, nothing
live) are right: no worker exists, and the columns are absent.

**Incomplete or inaccurate:** Q0-R1, Q0-R4 (the `[199]` (3) text and RFC-2026-023 §5), Q0-R5, Q0-R7, Q0-R8 below. The
disposition makes no claim I found false.

## 7. Findings

| id | grade | where | finding | remedy |
|---|---|---|---|---|
| Q0-R1 | MEDIUM | `RFC-2026-023-acting-user-narrowing.md:117-124` (§5), `:26` (§0/6) | **Measured:** `app_command` holds no `USAGE` on schema `app`, so every call to the helpers as `app_command` — and any `app_command`-owned command function body that names an `app` relation — fails `42501 permission denied for schema app`. §5's pin list (the `SECURITY DEFINER` pin, `pinned-grants.json`, the policy set, the closure-text rule) omits `'app_command USAGE on app'` in `PINNED_SCHEMA_PRIVILEGES` (the seventh rule) and the grant itself. Fails closed (the seventh rule would refuse the grant), so nothing is unsafe; §6's cases are not runnable as the text lists the costs. Read, not measured: under a non-superuser migration owner (the platform), `ALTER FUNCTION … OWNER TO` requires the new owner to hold `CREATE` on the schema, which the seventh rule pins to nobody — this applies to the `app_authz` helpers and every `app_command` function alike. | Add the `USAGE` grant and the seventh-rule pin to §5 and to RFC-2026-026's command half; state how ownership is assigned on the platform, or record it as owed with Q170-c. |
| Q0-R2 | MEDIUM | `RFC-2026-028-worker-identity.md:276-277` (§5/7) | **Measured:** the negative control does not fail. With `grant usage on schema app to app_worker_login` the statement is still refused `42501` (`permission denied for table workspaces`), so a case written "refused `42501`" stays green with the control applied. The mechanism is held statically (the seventh rule refuses that grant, §4), but this live case as written proves nothing it claims. | Pin the message ("permission denied for schema app"), or use a control that changes the outcome: the membership re-granted `with inherit true` (measured: 0 rows, no error) or the `set role` login setting of §5/4. |
| Q0-R3 | MEDIUM | `RFC-2026-028-worker-identity.md:235-240` (§4/1, `pg_authid.rolpassword is null`) | The apply-time block reads `pg_authid`, which the repository's own rule forbids in migrations (`020_business.sql:652-655`: readable only by a superuser, and `postgres` is not one on the platform). **Measured:** a non-superuser read is `permission denied for table pg_authid`, and `pg_roles.rolpassword` shows `********` even when the password is null, so the assertion cannot be made on the target from either view. It also collides with §3.3/3: a harness that sets the test credential before any re-run of apply-time blocks makes it false. | Drop the password arm from the apply-time block and rely on §5/5's static rule; or confine it to a superuser-owned cluster and say the platform half is not asserted; order the harness's credential after migrate-clean's post-migrate pass. |
| Q0-R4 | LOW | `RFC-2026-023-acting-user-narrowing.md:119`; `work-packages/WP-0A-DB-00.json:456` (`[199]` (3)) | Shape B falsifies more than "171's block, two policies and six columns". **Read:** 171's rule 4 (`171:249-255`, app_authz owns exactly the three helpers) fails on the two new helpers; and two **existing replacements** fail too — `invariants/011_authorization_helpers.2.sql` and `invariants/021_member_scope.1.sql` assert exactly two `app_authz` policies, and `021_member_scope.1.sql:40-49` asserts `app_authz` holds **no** `SELECT` on `workspace_member_scopes`. The implementing batch must edit those replacements, not only add a 171 entry. Fails closed (`superseded.json` guard 3). | List all four in §5 and append them to `[199]` (3). |
| Q0-R5 | LOW | `RFC-2026-028-worker-identity.md:256-259` (§5/2) | "the last two only once it reads options": **measured**, `with inherit true` already fails today (table-level grant rule, and the seventh rule would follow); only `with admin option` needs Q-028-10. Understates the current guard. | Say so; keep Q-028-10 for the admin and SET options. |
| Q0-R6 | LOW | `RFC-2026-028-worker-identity.md:252`, `:260-261` (§5/3) | The heading puts §5/1-6 under `make db-migrate-clean`, but `grant app_worker_login to authenticator` cannot be applied there: **measured**, the role does not exist on the shim cluster. The negative it names is a snapshot rule over `catalog-snapshot.json` (`run.mjs:3714-3724`), read only from the provisioned instance. | Mark the drift as snapshot-only, or have the shim create `authenticator` so the live probes can hold it. |
| Q0-R7 | LOW | `RFC-2026-023-acting-user-narrowing.md:139` (§6) | "fails to create (42501 at CREATE FUNCTION, or at first call)": **measured**, creation and the owner change succeed; only the first call fails (`permission denied for table workspace_member_scopes`). | "at first call", and make it a case rather than a drift if it is to hold. |
| Q0-R8 | LOW | `RFC-2026-028-worker-identity.md:248` and `:278-292` (§5/8, §5/10, §5/12); `handoffs/WP-0A-DB-00-author-handoff.json:109-111` | §5 promises "each with the drift that must fail it"; §5/8, §5/10 and §5/12 name none (natural ones: `grant app_command to app_worker_login`; a permissive `using (true)` policy on `app.jobs` to `app_worker`; a `trust` line for the role). Separately, the handoff records `make db-migrate-clean; make db-rls-smoke` with `exit_code: 0` and result "not run". | Name the three drifts; record an unrun command without an exit code (or as not run in `known_limitations`). |

None of these is live: no role, helper, grant or policy is created by this batch, and every tooling guard I tested fails
closed. A0's three findings (`[199]` (3)-(5)) stand; Q0-R4 widens (3).

## 8. Answers to the brief

- **Are the test obligations executable as written, each with a drift that fails if the mechanism were missing?**
  Mostly. RFC-2026-028: §5/1, §5/2 (bar `admin option`, as stated), §5/3's client half, §5/4's grant and default-ACL
  halves, §5/6, §5/8, §5/9 and §5/10 execute and their drifts fail by name against today's probes once §3.6's two pins
  move; §5/12 executes on a scram cluster. Not as written: §5/7's negative control (Q0-R2), §4/1's `pg_authid` assertion
  (Q0-R3), §5/3's `authenticator` drift (Q0-R6), and three obligations with no drift (Q0-R8). RFC-2026-023: §6's new
  cases and both negative controls execute and go red — after an `app_command` schema grant the text does not list
  (Q0-R1); its `scope_type` drift fails at call, not at create (Q0-R7).
- **Plan, disposition and blocker claims:** true where checked (§6), with `[199]` (3) incomplete (Q0-R4).
  `npm run check` passes (685/685).
- **Commit messages, handoff:** true, with the handoff's exit code for an unrun command (Q0-R8).
- **`verify-branch-scope`, `npm run verify`, `npm run check:handoff` on the branch name:** 0, 0, 0.
- **Stop-the-line:** **none.** No secret, tenant leak, lost job, migration divergence or contract mismatch is live; the
  batch is text, and every defect found is in a Proposed or In-review RFC whose implementing batch would be refused by
  existing guards.
- **Does anything block the merge?** Nothing from this role, provided the findings are folded into the RFC text or
  recorded on `open_blockers[199]` per the 127 §6 bar. Q0-R1, Q0-R2 and Q0-R3 should be folded **before** A0 recommends
  approval under plan §6 condition 1.

## 9. Limits

- One vendor and model family as the Author (§0).
- PostgreSQL 17.11 only; the platform's version, pooler (Q-028-12), non-superuser migration owner and `md5` were not
  measured.
- The §3.6 pins were simulated by text substitution into the exported probe SQL, not by editing `run.mjs`; the settings
  rule's extension and the §5/5 static rule do not exist and were not simulated.
- The RFC-2026-023 prototype is my own writing of §3.2's text; the closure amendment (§3.3), a command function and the
  closing command (§8) were not built.
- Private scripts and logs (`drifts.sh`, `round.sh`, `static-drifts.sh`, `live.sh`, `scram.sh`, `shapeb.sql` and their
  logs) stay in the private directory and are not evidence by themselves; this file is.
