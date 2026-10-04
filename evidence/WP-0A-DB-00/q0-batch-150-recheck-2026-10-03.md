# Q0 independent test re-check of batch 150's review round (PR #173)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-150`, head `218f91f` (the handoff refresh, alone) over the review-round code
`2492ae9`, base `1930f41` (main). Author `/claude/a0_atlas`. The previous reviewed head was `c0fa18e`; my
earlier record is `q0-batch-150-test-review-2026-10-03.md` (cherry-picked onto the branch as `c2e713c`).
PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/173>: Draft, OPEN, not merged, head `218f91f`,
required check "bootstrap" run 37171840296 SUCCESS (read with `gh pr view 173`). **Tested on:** my own branch
`recheck/q0-batch-150`, created at `218f91f`. **Date:** 2026-10-04. The file name carries the phase's date
(2026-10-03), as the batch's plan and disposition do.

This is a narrow re-check of the review-round corrections. It holds findings and advances no status. It
approves nothing, test-verifies nothing on anyone's behalf, and decides nothing that the Integration Owner or
the Product Owner holds.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and I am the same vendor and model family. My
independence from the Author is the independence RFC-2026-024 describes, and no more. Accepting this record as
the Tester role's signature is the Integration Owner's act and the Product Owner's act, not mine.

I fixed nothing. Every mutation below was made in my own worktree. Before it, I saved each file it touched
to the private directory, and afterwards I restored each file from that copy. `git status --porcelain` printed
0 lines after every file mutant. `140_audit.sql` was checked by sha256 after every drift
(`2ac596bb950e8dfb…`, equal every time). The temporary `151_q0_mutant.sql` was deleted after each use. Nothing
was pushed.

## 1. Measured versus read

**Setup for every measured run:**

- Node `v24.20.0`, from `/Users/bank/.local/node-v24.20.0/bin`. Every script prints `node -v`, and the PATH
  Node 26 was not used.
- PostgreSQL 17.11 from `/opt/homebrew/bin`.
- A fresh `initdb --locale=C -A trust -U postgres` for every round, on 127.0.0.1:**5503** only, TCP only
  (`-c unix_socket_directories=''`), with `LC_ALL=C`.
- The shim `db/foundation/ci/supabase-shim.sql` ran first, then
  `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`.
- Private directory: `scratchpad/q0-150r2/`.
- I did not touch 5432, 5499 or any other run's port.
- The harness ran at scale **0.05** only.

### 1.1 Repository commands, on the branch NAME

A0's worktree has the branch checked out, so I checked out the name `agent/claude/WP-0A-DB-00-batch-150` in my
own worktree with `git checkout --ignore-other-worktrees`. `git rev-parse --abbrev-ref HEAD` printed that name,
and HEAD was `218f91f`. I ran the three commands below, committed nothing, and switched back to
`recheck/q0-batch-150` at the same commit.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 1930f41 WP-0A-DB-00` | 0 | "all 19 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |

### 1.2 The database layers on the head as built (r1)

| Command | Exit | Output |
|---|---|---|
| static (`node scripts/run-test-suite.mjs`) | 0 | pass 684, fail 0 |
| probe digests, recomputed with the test's own formula | — | data classification `a848ca33af3460e3`, pinned grant `baa6379790cb8733`, pinned shape `11ba1271ffc00d70`: all three as the test pins them |
| `make db-migrate-clean` | 0 | "applied 150_performance_snapshots_key.sql"; data classification "66 tables … 4 SECRET-4 … 4 PROVIDER-3 or INTERNAL-3 … 12 open … exactly the **71** column reads … refused each of its 4 drifts"; pinned shape "32 constraints, 18 indexes, 4 policies and 0 non-internal triggers … refused each of its 5 drifts"; post-migrate "**50** apply-time blocks, **38** re-run as written, **12** superseded" |
| `make db-rls-smoke`, run twice on the same database | 0, 0 | "1079 isolation case(s) passed"; "db-authz-proofs: ok — 6 claim(s)", both times |
| catalog read | 0 | `PRIMARY KEY (id, metric_time)`; 0 foreign keys reference the table; relkind `r`; `id` `attidentity = a`, NOT NULL; `metric_time` NOT NULL; 4 rows (121's fixtures); the table comment names `(id, metric_time)`; the key comment reads back the "id ALONE IS NOT UNIQUE" text |

### 1.3 C0-1 and Q-4 re-measured on the r1 database (each in a rolled-back transaction)

| Experiment | Result |
|---|---|
| A: attach the table as-is to a range parent whose `id` is an identity | refused: "table "performance_snapshots" being attached contains an identity column "id"" / "The new partition may not contain an identity column" |
| A2: the same with a parent whose `id` is not an identity | refused, with the same message |
| B: the recorded path: `drop identity` on the table, a parent with `id generated always as identity` and key `(id, metric_time)`, attach, `setval` to `max(id)` | accepted; restarted to 4; **4 rows** read through the parent; the partition reads `attidentity = 'a'`; its key is still `PRIMARY KEY (id, metric_time)` |
| C: roles other than the owner (`postgres`) holding INSERT or UPDATE on `performance_snapshots.id` | **`pg_write_all_data`: INSERT and UPDATE**. Nothing else. `pg_write_all_data` has 0 members on this cluster, and `postgres` is the only superuser. |
| D: as the owner, a second row with `id = 1` at another `metric_time` (`overriding system value`) | accepted: `id 1` has 2 rows |
| E: as the owner, `update … set id = 2` | refused: "column "id" can only be updated to DEFAULT" (GENERATED ALWAYS) |
| F: a role made a member of `pg_write_all_data`, no BYPASSRLS, inserts a duplicate `id` | refused: "new row violates row-level security policy" (RLS is forced) |
| F2: the same member with BYPASSRLS | **accepted**: `id 1` has 2 rows |

### 1.4 The harness at scale 0.05, and whether it is idempotent

I ran the branch harness `--scale 0.05 --json --fail-on-seq-scan` twice on one fresh cluster (migrate-clean 0).
Free space on the data volume was 12 GiB before the runs.

| Run | Exit | Workspace list | Flagged |
|---|---|---|---|
| h1 | **0** | no Seq Scan; Bitmap Index Scan `workspace_members_user_id_status_idx` → Nested Loop → Index Scan `workspaces_pkey`; cost 27.30 | [] |
| h2, same cluster | **0** | the same plan shape and the same indexes; cost 28.11 | [] |

No Seq Scan appears in any of the nine named queries in either run, and every query used the same indexes in
both runs. Costs drift between runs: the workspace list 27.30 → 28.11, the worker claim 2.08 → 3.72 and the
audit first page 177.91 → 192.01. The harness header records this drift. After the runs, `app.workspaces`,
`app.workspace_members` and `app.performance_snapshots` counted 0 rows, and `n_live_tup` summed to 0 over `app`
and `private`. The database was 159 MB.

**Verdict:** the workspace list no longer seq-scans, and the run is idempotent in exit code, plan shape and
residue. The numbers match my first record on `c0fa18e`, as they should: the query text did not change in the
review round. I did not re-run main's harness. Its "before" (Seq Scan, cost 865.54, exit 3) comes from my first
record.

**Read, not measured:** the plan §11 table, the disposition §5 and §7, the commit bodies of `2492ae9` and
`218f91f`, and the handoff text fields, each against the diff `c0fa18e..218f91f`. I also compared `open_blockers`
on `c0fa18e` with the head (§3).

## 2. Mutation table

The layers are **static** (`node scripts/run-test-suite.mjs`, 684 tests), **mc** (`make db-migrate-clean` on a
fresh cluster) and **rs** (`make db-rls-smoke` on the same database). "Killed" means the layer exited non-zero
and named the mutant. SQL drifts were appended to `140_audit.sql` unless the row says "later file".

| # | Mutation | static | mc | rs | What refused it |
|---|---|---|---|---|---|
| M1 | **Revert the key in a later file** (`151_q0_mutant.sql`: drop `performance_snapshots_pkey`, re-add `primary key (id)`) | killed (17) | **killed** (2) | survived | Static: incidentally, through the snapshot digest gap that any new migration file opens. mc: pinned shape probe "missing or changed: … performance_snapshots_pkey". Run by hand on that database, 150's block also refuses it: "batch 150's primary key … is not (id, metric_time): PRIMARY KEY (id)". |
| E1L | Unique index on `(id)`, **later file** | killed (17, incidental) | **killed** (2) | survived | mc: pinned shape probe ("unlisted or changed: … q0_ps_id_uix"). Run by hand, 150's block check 2 also refuses it: "does not carry metric_time: index q0_ps_id_uix". |
| M2 | **Duplicate id, schema**: `unique (id)` constraint | — | **killed** (2) | survived | `150_performance_snapshots_key.sql: a unique key … does not carry metric_time: performance_snapshots_id_unique (P0001)` |
| E1 | Bare unique index on `(id)` | — | **killed** (2) | survived | 150 check 2: "… index q0_ps_id_uix (P0001)". **New since `c0fa18e`**: before the round, 150 passed it. |
| E2 | Unique index `(id) include (metric_time)` | — | **killed** (2) | survived | 150 check 2: "… index q0_ps_id_incl_uix". An INCLUDE column does not count. |
| X1 | Exclusion constraint `exclude using btree (id with =)` | — | **killed** (2) | survived | **150 check 2 passed it.** Only the pinned shape probe refused it ("unlisted or changed: … q0_ps_id_excl"). See Q2-2. |
| M2d | **Duplicate id, data** (§1.3 D, F, F2) | n/a | n/a | n/a | Accepted as the owner, and accepted as a BYPASSRLS member of `pg_write_all_data`. Refused without BYPASSRLS (RLS). See Q2-1. |
| M3a | **Widen the projection by one column, file only**: `provider_request_key` added to `publish_jobs` in `safe-projections.json` | **killed** (1) | **killed** (2) | survived | Static: the data classification digest. mc: "pinned safe projection column(s) no client role reads: authenticated SELECT (provider_request_key) on app.publish_jobs" |
| M3b | Widen by **grant only**: `grant select (provider_request_key) on app.publish_jobs to authenticated` | — | **killed** (2) | **killed** (2) | mc: rule 17 and the pinned grant probe. rs: the provider-key isolation case. |
| M3d | Widen **consistently** with `publish_jobs.last_error_code`: grant, both lint files, 71 → 72, digests refreshed (data classification `1b492caf220aac5c`, pinned grant `815364364f2ba1cf`), manifest regenerated | **survived** (684/684) | **killed** (2) | survived | As on `c0fa18e`: rule 17 passes it by design. Only `120_publisher.sql#1`'s post-migrate replacement refused it: "a client role can read a PROVIDER-3 column §9.1 keeps to a safe projection: publish_jobs.last_error_code". Q-7 is still owed, as recorded on `[193]`. |
| M4a | **New PROVIDER-3 column with a client grant**, on an open table (`publish_targets.provider_error_text`) | — | **killed** (2) | survived | Rule 17 ("outside the pinned safe projection") and the pinned grant probe |
| M4b | The same on a classed table (`jobs.provider_payload jsonb`) | — | **killed** (2) | survived | Rule 17, the pinned grant probe and the read allowlist probe |
| Q3 | The four non-SELECT grants on the classed tables (A0's drift) | — | **killed** (2) | survived | Rule 17 names all four: "anon INSERT (id) on app.outbox_events, anon TRIGGER on app.billing_webhook_receipts, authenticated TRUNCATE on app.consumer_ledger, authenticated UPDATE (progress_stage) on app.jobs". The client privilege probe and the pinned grant probe also refuse it. |
| M5ab | **Weaken rule 17 in code, digests refreshed**: INSERT and UPDATE dropped from the column list, TRUNCATE and TRIGGER from the table list; digest `07bf97b8c5fd9efa`; manifest regenerated | **killed** (1) | **killed** (2) | survived | Static: "rule 3 reads SELECT, INSERT, UPDATE and REFERENCES per column of a projection table, both ways". mc: "its self-test after drift 3 was refused without naming authenticated UPDATE (progress_stage) on app.jobs, anon INSERT (id) …". **Q-3 is closed.** On `c0fa18e` this mutant survived static and mc. |
| M5m | Weaken rule 17 in code, digests refreshed: MAINTAIN dropped from the table list only; digest `28bd4f800e2ab3d0` | **killed** (1) | survived (0) | survived | Static only: "and DELETE, TRUNCATE, TRIGGER and MAINTAIN per projection table, both ways". This is as designed: no drift grants MAINTAIN, and the test comment says the text holds it. |

## 3. Are the claims true?

| Claim | Where | Verdict |
|---|---|---|
| Cherry-pick map: C0 `607cf5d` → `b073813`, A1 `4a08b8a` → `9c6da72`, Q0 `63d4d5f` → `c2e713c`, `-x`, no conflict | plan §11.1; A0's report | **TRUE**: each commit carries its "cherry picked from" line, and each file is identical to its source |
| C0-1: an attach alone is refused; the path is drop identity, then attach, then restart; 4 rows read through the parent; `attidentity = 'a'` | 150 :19-27, :99-104; plan §11.2; `[179]` | **TRUE** (§1.3 A, A2, B) |
| `id` is unique only because "no role but the owner holds INSERT or UPDATE on it" | 150 :30-31 and the **catalog key comment** (:84-85); README rule 18 :642-643 | **FALSE as worded.** `pg_write_all_data` holds both (§1.3 C). A BYPASSRLS member inserts a duplicate (F2). UPDATE is refused to every role by GENERATED ALWAYS (E). `[194]` (14) and plan §11.2 do name the `pg_write_all_data` gap. Finding Q2-1. |
| C0-6: check 2 reads every unique index's key columns, not INCLUDE; E1 and M2 give mc 2, named | 150 :128-151; plan §11.2; commit `2492ae9` | **TRUE** (E1, E2, M2). Exclusion constraints are not read (X1, Q2-2). |
| 150's block, re-run by the post-migrate pass, makes "a later file that undoes any of it" fail "here as well as in the pinned shape probe" | 150 :112-113 | **TRUE in substance, not shown by migrate-clean**: in M1 and E1L the pinned shape probe fails first, so the post-migrate pass is not reached. Run by hand on those databases, the block refuses both. |
| Q-3: the widen drift adds the four grants, each named; two static regexes; digest `77b41feaee177714` → `a848ca33af3460e3`; floor 929 → 932; M5ab mc 2, static 1 | `run.mjs` :2185-2192; test :3202-3207; plan §11.2-11.4; commit `2492ae9` | **TRUE** (digest recomputed; M5ab; Q3; the suite passes at the new floor) |
| SP-4 added; the tests expect SP-1..SP-4; projection unchanged at 71 | `safe-projections.json`; test :3234 | **TRUE** (static 684; rule 17 "71 column reads") |
| C0-3 and F150-5: the harness comment says nothing binds the literal, and that the BFF must bind it; the query text is unchanged | `explain-harness.mjs` :82-89 | **TRUE**: the diff touches comments and one `source` string only |
| Q-5: the harness header says Q150-d is answered with PROPOSED values | `explain-harness.mjs` :27-29 | **TRUE** |
| C0-2 and Q-1: 16, not 17, in the disposition, plan, WP rationale and handoff; disposition §7 records the correction; the earlier commit messages are left as pushed | disposition :1, :7, :35, :98, §7; plan :11, :329; WP :118; handoff :35 | **TRUE**: no "17 Q-ids/questions/answers" remains in those four files |
| Q-2: `decisions_consumed` rewritten to what this batch consumes | handoff | **TRUE**: it names Q150-a, Q150-e and Q170-d as implemented, Q150-b, -c and -d as direction, and the rest as owed |
| `[179]`, `[193]` and `[194]` extended by appending; no blocker added (195) | plan §11.3 | **TRUE**: on `c0fa18e` → `218f91f`, each of the three new texts starts with the old text byte for byte (+1601, +1875, +2126 chars); all other blockers are equal; 195 both sides |
| Integrity manifest 88 digests; suite 684, 80 tests in the file | plan §11.3 | **TRUE** (the regeneration printed 88; 684 tests) |
| Measured on fresh clusters: mc 0 with 50 / 38 / 12, rls-smoke 0 twice | commit `2492ae9`; plan §11.4 | **TRUE**, reproduced (r1) |
| The branch-name guards are not recorded in the handoff, because a later run cannot be (C0-9) | plan §0.2, §11.4 | **TRUE**, and they pass (§1.1) |
| PR #173 still Draft, not merged | A0's report | **TRUE** (`gh pr view 173`) |

### 3.1 My own findings from `c0fa18e`

| ID | Then | Now |
|---|---|---|
| Q-1 (LOW) | the count said 17 | **Closed** |
| Q-2 (LOW) | stale `decisions_consumed` | **Closed** |
| Q-3 (LOW) | rule 3's non-SELECT lists were undriven and unpinned | **Closed** (M5ab killed by static and mc; M5m killed by static) |
| Q-4 (LOW) | `id` lost uniqueness, and nothing said so | **Closed as recorded** (an accepted property). Its stated basis is overstated: Q2-1. |
| Q-5 (INFO) | harness header said "undecided" | **Closed** |
| Q-6 (INFO) | table comment edits beyond the one sentence | **Closed**: 150's header :55-59 lists them |
| Q-7 (INFO) | no per-column review | **Owed** (optional), recorded on `[193]`; M3d still survives static and rule 17 by design |

## 4. Findings

| ID | Grade | File:line | Finding | Remedy |
|---|---|---|---|---|
| Q2-1 | LOW | `db/foundation/migrations/150_performance_snapshots_key.sql`:30-32 and :84-86 (the comment written to the catalog); `db/foundation/README.md`:642-643 | The accepted property rests on "no role but the table's owner holds INSERT or UPDATE on [id]". On a clean migrate-clean, the predefined role `pg_write_all_data` holds both (measured; 0 members here). A BYPASSRLS member of it inserted a second row with an existing `id` (measured). Any superuser can as well. The UPDATE half is moot, because GENERATED ALWAYS refuses `update … set id = <value>` to every role (measured). `[194]` (14) and plan §11.2 already name the `pg_write_all_data` gap, so the record is inconsistent: the comment shipped to the catalog states more than was measured. Nothing leaks, and no client reach changes. | 150 is not integrated, so word it in place. For example: "no role this repository creates holds INSERT on id; the owner, superusers and a BYPASSRLS member of pg_write_all_data can insert a duplicate (Q170-c)". Apply the same wording to README rule 18. Optionally drop "or UPDATE". |
| Q2-2 | INFO | `150_performance_snapshots_key.sql`:128-151 (check 2) | Check 2 reads `p`/`u` constraints and `indisunique` indexes. An exclusion constraint `exclude using btree (id with =)` enforces `id` uniqueness and would block a partition by `metric_time` (a partitioned table's exclusion constraint must include the partition key). It passes check 2 (X1). The pinned shape probe refuses it, so the claim "every unique … carries metric_time" holds today through rule 18, not through 150's block. | Optional: add `contype = 'x'` to check 2's constraint branch (or say in its comment that exclusion constraints are rule 18's), with the static regex updated. |

No finding is above LOW.

## 5. Stop-the-line verdict

**No stop-the-line.** None of the classes in `CONTRIBUTING_AGENTS.md`:44 is present:

- No secret is exposed.
- No tenant leaks: rls-smoke passed 1079 cases twice, and no grant, policy or client reach changed in the round.
- No migration diverges: 150 is unintegrated and was edited in place, which `CONTRIBUTING_AGENTS.md`:37 permits;
  121 is unedited.
- Nothing is irreversibly deleted, nothing is a duplicate side effect, and nothing is a contract mismatch.

**Does anything block the merge?** Nothing I measured. All four guards pass on the branch name, every DB layer
is green, and every finding from my first pass is closed or owed by name. Q2-1 is a false sentence in a catalog
comment and in README rule 18 of a migration that is not yet integrated. Correcting it in place before the merge
is cheaper than a forward fix afterwards. Whether that is a merge condition is the Integration Owner's call,
not mine. The merge bar (RFC-2026-002; disposition 127 §6) is not mine to assess. Integration Owner evidence is
still owed.

## 6. Limits

- One host and one PostgreSQL version (17.11). The harness ran at scale 0.05 only, twice, on one cluster. I did
  not re-run main's "before" harness, and I did not re-measure any timing (Q150-d).
- The mutations are the ones listed. M1 and E1L are later files, which the task's "append to 140" rule does not
  cover. For those two, 150's block was run by hand on the failed migrate-clean database; the post-migrate pass
  itself did not reach it.
- `pg_write_all_data` had no member on the test cluster. A provisioned Supabase instance's role memberships
  were not measured (Q170-c).
- I read the text corrections (C0-4, C0-7, C0-8, C0-9, F150-4) against the diff and did not re-grade them. SP-4
  is A1's measurement, and I did not repeat it.
- The branch-name commands ran in my worktree with `--ignore-other-worktrees` while A0's worktree had the same
  branch checked out. No commit was made on that name.
- Cleanup: every cluster on 5503 was stopped and its data directory removed after its round. `lsof` showed
  nothing on 5503 at the end. Every mutated file was restored from its saved copy (`git status --porcelain`
  empty), `140_audit.sql`'s sha256 matched after every drift, and `151_q0_mutant.sql` is gone. Scratch scripts
  and logs remain in `scratchpad/q0-150r2/`, uncommitted.
