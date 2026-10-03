# A1 security/privacy review: batch 128, client roles, schemas and spellings

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-128`, head `b8435faf7f0d339ce101ceefccb49b3770679c8a`
  over code `d777d29`, base `18f1469` (main). Author `/claude/a0_atlas`. PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/167> (Draft).
- **Review branch:** the head was checked out into `review/a1-batch-128`; this file is its only change.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.

## 0. What I am

A subagent of `/claude/a0_atlas`, the Author's own run: the same vendor and the same model family, which
RFC-2026-024 records as the limit of this role's independence. Accepting this record as the A1 role's
signature is the Integration Owner's and the Product Owner's act, not mine.

## 1. Inputs read

`CONTRIBUTING_AGENTS.md`; `evidence/WP-0A-DB-00/a0-batch-128-plan-2026-10-03.md`;
`product-owner-disposition-2026-10-03-batch-128.md` (§1-§2); `git diff 18f1469..b8435fa` for
`scripts/db/run.mjs` and `scripts/db/psql-driver.mjs` in full, and the diff stat for the rest; the
manifest's batch 128 rationale (`work-packages/WP-0A-DB-00.json:118`).

## 2. Measured vs read

**Measured** (Node `v24.20.0`, checked under the exact PATH of each run; PostgreSQL at /opt/homebrew/bin;
127.0.0.1:5501, TCP only, `unix_socket_directories=''`; `initdb --locale=C -A trust -U postgres`;
`LC_ALL=C`; shim first):

| Command | Exit | Output |
|---|---|---|
| `make db-migrate-clean` | **0** | 24 probe lines, 23 with a self-test; client schema probe "exactly the 4 pinned"; client membership probe "exactly the 0 pinned"; security definer probe "refused each of its 3 drifts"; post-migrate pass 49 / 37 / 12 |
| `make db-rls-smoke` (same database) | **0** | "1079 isolation case(s) passed" |
| catalog reads as postgres | -- | `pg_default_acl`: 0 rows; `anon`, `authenticated`: `rolinherit = f`; both hold TEMP on the database (through PUBLIC) |
| `psqlLex` / `escapeSpellings` on three inputs (private script) | -- | `-- c\nselect E'x'` → 1 escape finding; `-- c\rselect E'x'` → 0 escape findings, but refused by the existing bare-CR rule (`psql-driver.mjs:421`); `select 'a'` → 0 |

A first migrate-clean round ran under Node 26 by mistake (a PATH ordering); it is discarded, the cluster
was re-initialised and every number above is from the Node 24 round.

**Read, not measured:** the membership, schema and extension rules' SQL against the attack classes in §3.
I did not run new adversarial drifts on the live cluster this round, and `140_audit.sql` was not
modified. The Author's drift tables (plan §3, §4) are taken as the Author's measurement, not re-run.

## 3. The questions, by class

1. **Role membership** (SET ROLE, SET SESSION AUTHORIZATION, PUBLIC, `pg_*` predefined roles, NOINHERIT).
   `CLIENT_MEMBERSHIP_PROBE_SQL` (`run.mjs` near the new 2b''''' block) reads `pg_auth_members`
   recursively from `anon` and `authenticated` with no filter on INHERIT, SET, ADMIN or the granted role's
   name, so a predefined `pg_*` role granted to a client is read like any other. SET SESSION AUTHORIZATION
   needs a superuser session user, which is only reachable through a membership this probe reads. A role
   cannot be granted to PUBLIC. NOINHERIT is confirmed in the catalog (`rolinherit = f`), which is why the
   privilege rules alone did not see it. Nothing newly opened, by reading.
2. **Schemas** (search_path, role-specific default privilege). Rules 1-3 and the schema probe now read every
   non-system schema; `pg_temp_*` and `pg_toast_temp_*` fall inside the `^pg_` exclusion (N2). A
   search_path only changes name resolution inside schemas the client can USE, and USAGE is pinned both
   ways. Default privileges: N1.
3. **Extension-member definer reached through an operator, cast or event trigger.** The third definer rule
   reads every `prosecdef` extension member wherever it is reached from; how it is reached does not matter
   to a catalog rule on the function. An operator over an *invoker* function remains Q0 N5, stated open by
   the Author. Event triggers require a superuser to create. Nothing newly opened, by reading.
4. **Lexer escape refusals.** Depth past eight fails closed (`psql-driver.mjs`, `escapeSpellings`); an
   unclosed dollar body is scanned to the end of the text; nested block comments are counted; CR is held
   by the older bare-CR rule (measured above). The quoted-identifier and comment exemptions match what the
   server executes. What stays outside is text computed at run time, which the driver comment and README
   state. Nothing newly opened.
5. **ALTER DEFAULT PRIVILEGES granting to authenticated.** N1.

## 4. Findings

| Id | Grade | Where | Finding | Remedy |
|---|---|---|---|---|
| N1 | INFO | `scripts/db/run.mjs`, client privilege / schema probes | No probe reads `pg_default_acl`. A default-privilege entry granting to a client role changes nothing until a later object is created, and the effective grant on that object is then read by the existing rules; measured, the clean set has 0 entries. A drift adding one is not named at the point it is written. | Optionally pin `pg_default_acl` to have no client grantee (anon, authenticated, PUBLIC), with a self-test drift, so the cause is named and not only its later effect. |
| N2 | INFO | `run.mjs`, `NON_SYSTEM_SCHEMA` | `^pg_` also excludes `pg_temp_*`; clients hold TEMP on the database through PUBLIC (measured). Temporary objects are session-local and hold no tenant rows, so this opens nothing persistent. Not stated in the README. | State it beside rule 13/14 in `db/foundation/README.md`; whether to revoke TEMP from PUBLIC is a platform decision, not this batch's. |
| N3 | INFO | plan §5 item 4 | The open items the Author lists (Q0 N5 operators, computed encoding names, owner-UPDATE bare-UPDATE cases, `1 = 1` narrowings, platform-vs-shim schema and membership lists, other roles' reach for RFC-2026-023) are each still open and correctly stated as open. | Keep them in blocker 186 as written. |

No CRITICAL, HIGH, MEDIUM or LOW finding.

## 5. Stop-the-line verdict

**No stop-the-line.** Nothing in this batch exposes a secret, leaks a tenant, or weakens a rule that held
before; the new rules only add refusals, and migrate-clean and rls-smoke are green on the code. From A1's
side nothing blocks the merge. The merge still needs what the process requires and this record does not
supply: the C0 and Q0 role runs on batch 128, a green required CI run on the head, and the Integration
Owner's and Product Owner's acceptance.

## 6. Limits

- No new adversarial drifts were run live this round; §3 is reading of the probe SQL plus the
  measurements in §2. A reviewer wanting live proof should re-run plan §3 rows R0, R1r, V11, V16 and V06b.
- Same vendor and model family as the Author (§0).
- The cluster on 5501 was stopped and its data directory removed; private artefacts are in the scratchpad
  directory `a1-128/` (logs `mc2.log`, `rs.log`, lexer script `lex.mjs`).
