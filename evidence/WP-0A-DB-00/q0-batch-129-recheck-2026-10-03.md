# Q0 independent test re-check: batch 129's review round (PR #168)

- **Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-129`, head `00bf2f5` (the handoff, alone) over code
  `a9f7508` and the review-round record `70ad049`, base `75c9274` (main). Author `/claude/a0_atlas`. Previously
  reviewed head: `0f08d92` (my record: `q0-batch-129-test-review-2026-10-03.md`, cherry-picked as `bd7f5a0`).
- **Checked out as:** my own branch `recheck/q0-batch-129` at `00bf2f5a9f76590dbf0323e5560c27e3c1235d34` in
  this worktree. The Node suite and the scope, identity, manifest and secret checks ran on that branch name.
  The DB rounds ran in a private `git archive` clone of `00bf2f5` (`140_audit.sql` sha1 `2ac2fc2c592b…`, the
  same as the committed tree).
- **Status:** this file records findings. It does not advance any status, approve anything or fix anything.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own workflow. I am the same vendor and model family as the
Author (RFC-2026-024). I am independent of the Author's run, but not of its vendor or its orchestration, so this
record is evidence for the Tester role and not that role's signature. Accepting it as the role's signature is
the act of the Integration Owner and the Product Owner.

## 1. Measured vs read

Setup for every DB round:

- PostgreSQL 17.11 at `/opt/homebrew/bin`, with a fresh `initdb --locale=C -A trust -U postgres` per round.
- 127.0.0.1:**5503** only, TCP only (`-c unix_socket_directories=''`), with `LC_ALL=C`.
- The shim `db/foundation/ci/supabase-shim.sql` ran first. Then `make db-migrate-clean`, `make db-schema-lint`
  and `make db-rls-smoke` ran with `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`.
- Node was `v24.20.0`, checked before every run. The PATH Node 26 never ran a measured round.
- Each drift was appended to `140_audit.sql` and the file was restored after every round. `cmp` against the
  saved copy reported `restored` after all 15 rounds, and `save.sh check` reported `ok` at the end for
  `140_audit.sql`, `run.mjs`, `psql-driver.mjs` and the contract test.
- The cluster was stopped and its data directory removed after each round. At the end `lsof` on 5503 exited 1.
- Private directory: `…/scratchpad/q0-129r2/`.

**Measured (exit codes I observed myself):**

| Command | Exit | Output |
|---|---|---|
| `node scripts/run-test-suite.mjs` (branch `recheck/q0-batch-129`, `00bf2f5`) | **0** | tests 677, pass 677, fail 0 |
| `node scripts/verify-branch-scope.mjs 75c9274 WP-0A-DB-00` | **0** | "all 14 changed path(s) are declared, and every amendment explains one" |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-DB-00-batch-129` | **0** | `WP-0A-DB-00` |
| `node scripts/regenerate-integrity-manifest.mjs --check` | **0** | 88 digests |
| `node scripts/scan-repository-secrets.mjs` | **0** | clean |
| `make db-migrate-clean` (baseline) | **0** | "3753 objects initdb made, taken before the migrations and sealed"; "the 3753 objects initdb made, read again after the last migration and compared in memory, are as they were"; every probe refused its own drifts and was clean again |
| `make db-schema-lint` (baseline) | **0** | |
| `make db-rls-smoke` (baseline) | **0** | 1079 isolation cases passed |
| CI negative-control step (body from `ci.yml`, which is unchanged `0f08d92..00bf2f5`) | **0** | "every family above failed the suite, as each must" |

**Read, not measured:**

- The CI run of PR #168 and the `gh` PR state. There is no network here.
- The C0 and A1 re-checks of this round.
- The Author's §9.3 code-mutation table (M-ID, M-MEM, M-SQLBODY, M-IDENT). See §5.
- Fingerprint stability across PostgreSQL minor versions. Only 17.11 was available.

## 2. Try to break it: drift table (per layer)

Column key:

- **static**: `node --test test-kits/db/foundation-contract.test.mjs tests/db/identity/identity-isolation.test.mjs`
- **sl**: schema-lint
- **mc**: migrate-clean
- **rs**: rls-smoke

Exit 2 means refused, 0 means clean. Each round ran on a fresh cluster.

### 2a. The batch-128 re-check exploits and my 129 drifts, re-run at `00bf2f5`

| Id | Drift | static | sl | mc | rs | Named by |
|---|---|---|---|---|---|---|
| **X7** | initdb view replaced (built by EXECUTE) | 0 | 0 | **2** | 0 | in memory: `relation information_schema.information_schema_catalog_name [changed]` |
| **X8** | `_pg_char_max_length` replaced, SECURITY DEFINER over ideas | 0 | 0 | **2** | 0 | in memory: `function information_schema._pg_char_max_length(...) [changed]` |
| **Q-IPF** | `_pg_interval_type` replaced, SECURITY DEFINER over ideas | 0 | 0 | **2** | 0 | in memory: `function information_schema._pg_interval_type(...) [changed]` |
| **Q-IPVx** | the catalog-name view replaced in a DO block | 0 | 0 | **2** | 0 | in memory: the view `[changed]` |
| **Q-T1** | `grant create on database template1 to authenticated` | 0 | 0 | **2** | 0 | client schema probe: "unlisted: authenticated CREATE on database template1" |
| **seal** | Q-IPVx, then the view's row deleted from the reference table | 0 | 0 | **2** | 0 | "its seal moved while the migrations ran" |
| **X6** | `alter role authenticated bypassrls` | 0 | 0 | **2** | **2** (347/1079) | "authenticated rolbypassrls = true" |
| **QF3** (my F1 on 129) | `_pg_interval_type` renamed in place | 0 | 0 | **2** | 0 | in memory: `[renamed to information_schema.q0_renamed_interval_type(...)]`. The function's own row is now named; before, only the dependent views were. |
| **FV3** (C0 F1, C0's file verbatim) | Q-IPF and Q-GS, then the reference table renamed and a view put in its place | 0 | 0 | **2** | 0 | "its table was replaced while the migrations ran (16390 r … before, 18429 v rules=t … after)" |
| **RN3** (C0 F2, C0's file verbatim) | `pg_read_file` and `sql_features` renamed | 0 | 0 | **2** | 0 | in memory: both `[renamed to …]` |

The 129 review round therefore closes FV3, RN3 and my QF3, each of which was green on every layer at
`0f08d92` (as C0 measured and my own record states). Every batch-128 exploit (X7, X8, Q-IPF, Q-IPVx, Q-T1)
and the seal and X6 drifts stay refused at migrate-clean. The verdict on the initdb objects now comes from
the executor's in-memory comparison, not from the table, which matches the plan's §9.2 claim.

A note on X6: the client membership probe's settings self-test "failed with" the attribute rule's message,
because the as-built drift already trips the earlier rule and the first raise ends the block. This is the
documented ordering, not a defect. The run is refused either way, by name.

### 2b. The new rules, each with two fresh drifts of my own in a later file

| Id | Rule | Drift | static | sl | mc | rs | Named |
|---|---|---|---|---|---|---|---|
| QS1 | A1 R2 (role defaults) | `alter role anon in database postgres set search_path = app, public` | 0 | 0 | **2** | 0 | "anon in database [redacted]: search_path=app, public" (see R1) |
| QS2 | A1 R2 | `alter database postgres set row_security = off` (every role, one database) | 0 | 0 | **2** | **2** | "every role in database [redacted]: row_security=off" |
| QE1 | A1 R3 (event triggers) | an event trigger on `ddl_command_start`, then `DISABLE`d | 0 | 0 | **2** | 0 | "q0_evt_disabled on ddl_command_start". A disabled trigger is still named. |
| QE2 | A1 R3 | an event trigger on `sql_drop`, `ENABLE ALWAYS` | 0 | 0 | **2** | 0 | "q0_evt_always on sql_drop" |

The A1 R1 rule (`prosqlbody`) and the C0 F2 rule (name compared) are exercised by the fingerprint probe's own
self-test, which passed at baseline. They are also exercised by QF3 and RN3 above.

### 2c. Can the baseline be forged by a drift?

I measured three routes and none forged a green result:

- **Swapping the table** (FV3) is now refused by the identity read from `pg_class`.
- **Rewriting rows in place** (seal) is refused by the seal.
- **Changing initdb objects with the table untouched** (X7, X8, Q-IPF, Q-IPVx, QF3, RN3) is refused by the
  in-memory comparison, which does not read the table at all.

The residual is the class the Author records as owed on blocker 186 and in plan §9.6: a superuser migration
that replaces the catalog functions the reading itself calls. I did not measure that class in this re-check.

## 3. Graded findings

- **R1 (INFO, readability).** `scripts/db/psql-driver.mjs:35-48` (`redactConnection`) together with
  `scripts/db/run.mjs:669-680` (the rule-3 refusal text). The driver redacts every connection-URL component
  from stderr, and the CI database is named `postgres`. So the new rule's refusal reads "anon in database
  [redacted]: …" and the operator cannot tell which database the default sits in. The same effect is already
  noted for role names in the membership drift's comment. Nothing is hidden from the verdict, which still
  fails by name.
  **Remedy:** name the database by OID beside its name (for example `database #<oid>`), or say in the
  probe's comment that the current database appears redacted. This is owed, not blocking.

No finding is MEDIUM or higher. Every finding the earlier round raised that was meant to be closed (C0 F1,
C0 F2, my F1, A1 R2, A1 R3) is independently reproduced as closed above. A1 R1 is held by the self-test, which
passed at baseline.

## 4. Stop-the-line verdict, and what blocks the merge

**No stop-the-line.** I found none of the following: secret exposure, tenant leakage, a duplicate side effect,
a lost job, migration divergence, irreversible deletion or a contract mismatch. The round adds no migration,
and it strengthens drift detection.

**What blocks the merge** is the ordinary gate, not a defect I found:

- The PR is a Draft.
- RFC-2026-002 requires a green required CI run on `00bf2f5`, which I did not measure.
- The independent C0 and A1 re-checks of this round are still to come.
- This record is from the Author's own vendor and orchestration (§0). Accepting it as the Tester signature is
  the Integration Owner's and the Product Owner's act.

R1 is owed, not blocking.

## 5. Limits of this re-check

- **No code-mutation table of my own this round.** I did not produce the requested "each new rule weakened
  in code, digests refreshed" matrix in this re-check. For that layer I rely on the Author's plan §9.3 (read,
  not measured) and on the static reading pins I read in `foundation-contract.test.mjs`: the executor's
  order and refusals, the `prosqlbody` pin, the `(fp, ident)` comparison, the rule-3 `pg_db_role_setting`
  text and the rule-6 `pg_event_trigger` text. Whether every narrowing of the new rules fails some layer is
  therefore **read, not measured, here**. An independent role should measure it before the role's signature
  is accepted.
- **Database version:** only PostgreSQL 17.11 was measured.
- **Where the DB rounds ran:** in a byte-identical archive clone, not the worktree.
- **No network:** CI, `gh` and the other role runs were read, not measured.
- **Scope:** only the DB foundation layer named in the task.
