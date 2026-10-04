# Q0 independent test of batch 150 (PR #173)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-150`, head `c0fa18e` (the handoff refresh, alone) over the plan and disposition
`4b252d4` and the code `2318c72`, base `1930f41` (main). Author `/claude/a0_atlas`. PR
<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/173>: Draft and OPEN, head `c0fa18e`, required check
"bootstrap" run 37169588210 SUCCESS (read with `gh pr view 173`). **Tested on:** my own branch
`review/q0-batch-150`, created at `c0fa18e`. **Date:** 2026-10-04. The file name carries the phase's date
(2026-10-03), as the batch's own plan and disposition do.

This record holds findings. It advances no status. It approves nothing, test-verifies nothing on anyone's
behalf, and decides nothing that the Integration Owner or the Product Owner holds.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and I am the same vendor and model family. My
independence from the Author is the independence RFC-2026-024 describes, and no more. Accepting this record as
the Tester role's signature is the Integration Owner's act and the Product Owner's act, not mine.

I fixed nothing. I made every mutation below in my own worktree. Before each one I saved the file it touched
to the private directory, and I restored the file from that copy afterwards. `140_audit.sql` was compared by
sha256 after every drift round (`2ac596bb950e8dfb…`, equal every time). `git status` was clean before this file
was written. Nothing was pushed.

## 1. Measured versus read

**Setup for every measured run:**

- Node `v24.20.0`, from `/Users/bank/.local/node-v24.20.0/bin/node`. I checked `node -v` before each run, and
  every script prints it.
- PostgreSQL 17.11 from `/opt/homebrew/bin`.
- A fresh `initdb --locale=C -A trust -U postgres` for each round, on 127.0.0.1:**5503** only, TCP only
  (`-c unix_socket_directories=''`), with `LC_ALL=C`.
- The shim `db/foundation/ci/supabase-shim.sql` ran first, then
  `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`.
- Private directory: `scratchpad/q0-150/`.
- I did not touch 5432, 5499 or any other run's port.
- The harness ran only at scale **0.05**.

### 1.1 Repository commands, on the branch NAME

The branch is checked out in A0's worktree, so I checked out the name `agent/claude/WP-0A-DB-00-batch-150` in
my own worktree with `git checkout --ignore-other-worktrees`. `git rev-parse --abbrev-ref HEAD` printed that
name, and HEAD was `c0fa18e`. I ran the four commands below, committed nothing, and switched back to
`review/q0-batch-150` at the same commit.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 1930f41 WP-0A-DB-00` | 0 | "all 15 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 684, pass 684, fail 0" |
| `npm run check` | 0 | tests 684, pass 684, fail 0 |

A first attempt in a private `git clone` exited **91** on `check:handoff`. That was an artifact of the clone:
its `origin/HEAD` pointed at the clone source's branch, not at `main`. That run is not evidence about the
branch, and I discarded it.

### 1.2 The database layers on the branch as built

| Round | Command | Exit | Output |
|---|---|---|---|
| r1 | `make db-migrate-clean` | 0 | "applied 150_performance_snapshots_key.sql"; the data classification probe's claim word for word as plan §0.2 quotes it (66 tables, 4 SECRET-4, 4 PROVIDER-3 or INTERNAL-3, 12 open, **71** column reads, 4 drifts refused); pinned shape probe "32 constraints, 18 indexes, 4 policies and 0 non-internal triggers" (5 drifts); post-migrate "50 apply-time blocks, 38 re-run as written, 12 superseded" |
| r1 | `make db-rls-smoke`, run twice, same database | 0, 0 | "1079 isolation case(s) passed"; "db-authz-proofs: ok — 6 claim(s)" |
| r1 | catalog read (`q1.sql`) | 0 | key `PRIMARY KEY (id, metric_time)`; 0 foreign keys reference the table; relkind `r`; `id` `attidentity = a`, NOT NULL; `metric_time` NOT NULL; 4 rows (121's fixtures); the table comment names `(id, metric_time)` |

### 1.3 The harness at scale 0.05 (Q150-e) and whether it is idempotent

| Round | Command | Exit | Workspace list |
|---|---|---|---|
| hb (fresh, migrate-clean 0) | **main's** harness text (`git show 1930f41:scripts/db/explain-harness.mjs`, copied in temporarily and deleted after the run) `--scale 0.05 --json --fail-on-seq-scan` | **3** | `Seq Scan on workspaces`; total cost 865.54; flagged "workspace list: Seq Scan on workspaces" |
| h (fresh, migrate-clean 0), run 1 | branch harness `--scale 0.05 --json --fail-on-seq-scan` | **0** | no Seq Scan; Bitmap Index Scan `workspace_members_user_id_status_idx` → Nested Loop → Index Scan `workspaces_pkey`; cost 27.30; flagged [] |
| h, run 2, same cluster | the same command | **0** | the same plan shape and indexes; cost 28.11; flagged [] |

All nine named queries were checked. Neither run plans a Seq Scan, and each query uses the same indexes in
both runs. Costs drift between runs: the workspace list moved 27.30 → 28.11, the worker claim 2.08 → 3.72 and
the audit first page 178.39 → 193.11. The harness header already records this drift. After each run every
table in `app` and `private` had `n_live_tup = 0`, and `app.workspaces`, `app.workspace_members` and
`app.performance_snapshots` counted 0 rows. The database grew to 159 MB, as the header says rollback does not
return that space.

**Verdict: idempotent.** The run is repeatable on one cluster with the same exit code, the same plan shapes and
no residue rows. Plan costs are not repeatable, and the harness does not claim they are. The fixture has 100
workspaces at every scale, so the 0.05 result reproduces the 0.2 result: the same before cost (865.54) and the
same after cost (27.30).

**Read, not measured:** ERD §9.1 as the plan quotes it. I compared the plan with the four source
dispositions: `-141-prep` §5 :85-87, `-150-prereq` §5 :102-106, `-160-prep` §5 :94-97 and `-170-assert` §5
:93-96. I also read the blocker edits, the commit messages and the handoff text fields against the diff.

## 2. Mutation table

The layers are **static** (`node scripts/run-test-suite.mjs`, 684 tests), **mc** (`make db-migrate-clean`,
fresh cluster) and **rs** (`make db-rls-smoke`, the same database). "Killed" means the layer exited non-zero
and named the mutant.

| # | Mutation | static | mc | rs | What refused it |
|---|---|---|---|---|---|
| M1 | **Revert the key in a later file**: a temporary `151_q0_mutant.sql` that drops `performance_snapshots_pkey` and re-adds it as `primary key (id)` | killed (17 fail) | **killed** (2) | survived (0) | Static: incidentally, through the snapshot digest gap that any new migration file opens, not through anything about the key. mc: pinned shape probe "missing or changed: … performance_snapshots_pkey; unlisted or changed: …" (P0001). The probes run before the post-migrate pass, so 150's re-run block was not reached. |
| M1b | The same revert **appended to 140** (before 150) | survived | survived (0) | survived (0) | Nothing, and nothing should: 150 re-keys afterwards, so the final state is `(id, metric_time)`. Not a defect. |
| M2 | **Duplicate id, schema**: `add constraint performance_snapshots_id_unique unique (id)` appended to 140 | survived | **killed** (2) | survived | `150_performance_snapshots_key.sql: a unique key on app.performance_snapshots does not carry metric_time: performance_snapshots_id_unique (P0001)` (150's block, rule 2) |
| M2d | **Duplicate id, data** (on the r1 database): copy row `id = 1` with `overriding system value` and `metric_time` + 7 h 13 min | n/a | n/a | n/a | As the owner the insert is **accepted**: `id 1` now has 2 copies (rolled back). As `app_worker` it is refused ("permission denied for table performance_snapshots"): no client or service role holds INSERT on `id`. See finding Q-4. |
| M3a | **Widen the projection by one column, file only**: `provider_request_key` added to `publish_jobs` in `safe-projections.json` | **killed** (1) | **killed** (2) | survived | Static: the data classification digest. mc: "pinned safe projection column(s) no client role reads: authenticated SELECT (provider_request_key) on app.publish_jobs" |
| M3b | Widen by **grant only**: `grant select (provider_request_key) on app.publish_jobs to authenticated` in 140 | survived | **killed** (2) | **killed** (2) | mc: data classification "outside the pinned safe projection …" and pinned grant probe "unlisted: …". rs: `owner-a-cannot-read-a-publish-jobs-provider-key` "1 row(s) came back" |
| M3c | Widen **consistently** with `provider_request_key`: grant in 140, `safe-projections.json`, `pinned-grants.json`, the 71 → 72 assertion, both digests refreshed and the integrity manifest regenerated | survived (684/684) | **killed** (2) | **killed** (2) | mc: the probe's own widen drift names that column, so its self-test fails. rs: as M3b. |
| M3d | Widen **consistently** with `publish_jobs.last_error_code` (a column no self-test names) | **survived** (684/684) | **killed** (2) | survived (0) | The data classification probe **passed**, as designed, with 72 column reads. Only `120_publisher.sql#1`'s post-migrate replacement refused it: "a client role can read a PROVIDER-3 column §9.1 keeps to a safe projection: publish_jobs.last_error_code". See finding Q-7. |
| M4a | **New PROVIDER-3 column with a client grant, open table**: `alter table app.publish_targets add column provider_error_text text; grant select (provider_error_text) … to authenticated` (140) | survived | **killed** (2) | survived | Data classification probe "outside the pinned safe projection …: authenticated SELECT (provider_error_text) on app.publish_targets", and the pinned grant probe |
| M4b | The same on a **classed** table: `app.jobs.provider_payload jsonb`, granted SELECT | survived | **killed** (2) | survived | Data classification probe (rule 3), pinned grant probe, read allowlist probe |
| M4c | An UPDATE grant on an open table: `grant update (failure_class) on app.publish_targets to authenticated` | survived | **killed** (2) | survived | The data classification probe passed. This is the documented limit: rule 3 reads only SELECT on the open tables. The pinned grant probe and the permissive policy probe refused it. |
| M5ab | **Weaken rule 17 in code, digests refreshed**: in `projectionFound` (`scripts/db/run.mjs`:1464, :1470) drop `INSERT` and `UPDATE` from the column privileges and `TRUNCATE` and `TRIGGER` from the table privileges; data classification digest set to `86ac77c297c86e3a`; integrity manifest regenerated | **survived** (684/684) | survived on a clean set (0) | survived | All four self-test drifts were still refused. With a drift granting `update (progress_stage)` on `jobs`, `insert (id)` on `outbox_events`, `truncate` on `consumer_ledger` and `trigger` on `billing_webhook_receipts`, rule 17 was silent. The pinned grant probe and the client privilege probe refused it (mc 2). See finding Q-3. |
| M5d | Weaken rule 17 in code, digests refreshed: rule 3's "outside the projection" check limited to `private.%` (:1514) | survived (684/684) | **killed** (2) | survived | "its self-test after drift 3 passed -- the probe must refuse it …" |
| D1 | Plan §6 D1 re-measured: `create table app.probe_ps_ref (ps_id bigint references app.performance_snapshots (id))` (140) | n/a | **killed** (2) | survived (0) | `150_performance_snapshots_key.sql: cannot drop constraint performance_snapshots_pkey … because other objects depend on it (2BP01)`, as the plan says |

When a SQL drift was appended to `140_audit.sql`, the static layer passed (M2s, M4as: 684/684). Expected: no
test reads 140's text for these shapes, and the DB layers exist to catch them.

## 3. Are the claims true?

| Claim | Where | Verdict |
|---|---|---|
| Key `(id, metric_time)`, no `partition by`, no index, both timeouts set and reset, 5-point block | migration 150; plan §1; handoff | **TRUE** (r1 catalog read; D1; M2) |
| No FK references the table; 121's block names no key column; no `superseded.json` entry | plan §2 | **TRUE** for the FK (0 rows) and the post-migrate counts (50 / 38 / 12, with 150's block re-run as written) |
| Workspace list: before Seq Scan, cost 865.54, exit 3; after index only, cost 27.30, exit 0 | plan §3; blockers [194] (1) | **TRUE**, reproduced at 0.05 (§1.3) |
| Rule 17: SECRET-4 no privilege; 4 + 12 tables held both ways; 71 reads; SP-1..SP-3 kept | plan §4; README rule 17; disposition §4 | **TRUE** as built (r1). The "both ways" coverage of non-SELECT privileges on the classed tables has no test of its own (Q-3). |
| Probe digests `11ba1271ffc00d70` and `77b41feaee177714`; integrity manifest 88 digests | plan §0.1 | **TRUE**: recomputed with the test's own formula |
| Line numbers in plan §0.1 (run.mjs :1423/:1445/:1479/:2166; harness :84; test :430/:2718/:3185/:3201/:3269/:3427; README :602/:624/:661/:729; WP :432/:446/:447 = blockers 179/193/194) | plan §0.1 | **TRUE** (each line read) |
| Blockers 18, 21, 29, 33, 93, 95, 148, 150, 179, 192, 193 and 194 extended by appending, none rewritten, none added | plan §7; commit 2318c72 | **TRUE**: each new text starts with main's text byte for byte; 195 blockers before and after |
| Each Q-id's "Answer" is the recommendation of the disposition it came from | disposition §5 | **TRUE** for all 16 rows (compared with the four source tables) |
| "**17** open questions / Q-ids / answers" | disposition :1, :7, :19, :35, :98; plan :11, :319; handoff :35; WP rationale :118; commit messages `2318c72` and `4b252d4` | **FALSE**: there are **16** (Q141-a/b/c, Q150-a..e, Q160-a..d, Q170-a..d). The disposition's own §5 has 16 rows, and no other Q141/150/160/170 id exists anywhere in `evidence/WP-0A-DB-00/`. Finding Q-1. |
| Handoff `decisions_consumed`: "None decided. Q150-a … Q150-e are read as OPEN and left open …" | handoff :29-31 | **FALSE**: stale text carried over from the batch 150-prereq handoff, unchanged from main. It contradicts the same file's `assumptions` and `acceptance_results`. Finding Q-2. |
| `c0fa18e` "1930f41..4b252d4: 4 added, 10 modified" | commit message | **TRUE** |
| #172 merged at `64684a2`, merge commit `1930f41`, check green (run 37162394369) | disposition §3 | **TRUE** (`gh run view`: success on `64684a2`; `1930f41`'s parents are `b5f53c3` and `64684a2`) |
| 121's table comment rewritten "with its 'id alone' sentence corrected" | plan §1; migration 150 :37-39, :67-82 | **MOSTLY TRUE**: the rewrite also drops "shorter than the family it belongs to" and adds "by the migrations' reading" (Q-6, INFO) |

## 4. Findings

| ID | Grade | File:line | Finding | Remedy |
|---|---|---|---|---|
| Q-1 | LOW | `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-150.md`:1, :7, :19, :35, :98; `evidence/WP-0A-DB-00/a0-batch-150-plan-2026-10-03.md`:11, :319; `handoffs/WP-0A-DB-00-author-handoff.json`:35; `work-packages/WP-0A-DB-00.json`:118 | The record says the Owner answered "17" Q-ids. It enumerates, and the evidence contains, **16**. Plan :319 says "All 17 answers are in the disposition's §5, one row each", but §5 has 16 rows. A count that is wrong in the file that transcribes the Owner's answer is a false record, though nothing executable depends on it. | Correct the count to 16 in the disposition, the plan, the handoff and the manifest rationale on the branch. If A0's phase-end summary really did list 17, name the 17th Q-id and its row. The pushed commit messages stay as they are; note the correction in the next commit. |
| Q-2 | LOW | `handoffs/WP-0A-DB-00-author-handoff.json`:29-31 | `decisions_consumed` is main's text from batch 150-prereq: "None decided. Q150-a, Q150-b, Q150-c, Q150-d and … Q150-e are read as OPEN and left open". This batch consumes the Owner's answers to all of them. `check:handoff` passes because it does not read text fields. | Rewrite the field to the answers this batch consumes (Q150-a, Q150-e and Q170-d implemented; the rest recorded), then re-run `refresh:handoff` and commit it last and alone. |
| Q-3 | LOW | `scripts/db/run.mjs`:1464, :1470 (rule 3's privilege lists), :2176-2183 (widen drift); `test-kits/db/foundation-contract.test.mjs`:3199 | Rule 3 claims to refuse every client privilege beyond the pinned SELECT columns on the four PROVIDER-3 and INTERNAL-3 tables, but no static assertion pins `projectionFound`'s privilege lists, and no self-test drift exercises column INSERT or UPDATE, or table TRUNCATE, TRIGGER or MAINTAIN, on those tables. Mutant M5ab removed four of them with the digest refreshed and survived static and a clean migrate-clean. A drift granting them passed rule 17 and was caught only by rule 7 and the client privilege probe. Before this batch, rule 2's drift covered `insert (id) on app.outbox_events to anon`; moving that drift to `private.meta_webhook_inbox` dropped the only INSERT coverage on an INTERNAL-3 table. The defence holds today, but through a different rule. | Extend the widen drift with `update (progress_stage) on app.jobs`, `insert (id) on app.outbox_events` (anon), `truncate on app.consumer_ledger` and `trigger on app.billing_webhook_receipts`, each in `names`. Add a static regex for `projectionFound`'s two privilege lists, MAINTAIN included. |
| Q-4 | LOW | `db/foundation/migrations/150_performance_snapshots_key.sql`:56, :61-65; plan §2 | After 150, `id` is no longer unique: the owner inserted a second row with `id = 1` (`overriding system value`), and it was accepted (M2d). Uniqueness of `id` now rests on `generated always as identity` and on no role but the owner holding INSERT on `id` (measured: `app_worker` and `authenticated` hold none). Neither the migration's comments, plan §2 nor README rule 18 says the key change gives up `id`'s uniqueness. Under a later monthly partitioning it cannot be enforced at all. | State it in the next writing (constraint comment, plan, blocker [194]): either an accepted property, or a pin that no non-owner role holds INSERT or UPDATE on `id` (150's block could assert it). |
| Q-5 | INFO | `scripts/db/explain-harness.mjs`:27 | The header still says "the SLO is Q150-d, undecided". Q150-d is answered (values drafted, ratification owed). | Reword at the next touch. |
| Q-6 | INFO | `db/foundation/migrations/150_performance_snapshots_key.sql`:67-82 | The rewritten table comment changes more than the "id alone" sentence: it drops "shorter than the family it belongs to" and adds "by the migrations' reading". Nothing tests the comment. | Either say so in the plan, or restore the dropped clause. |
| Q-7 | INFO | `db/foundation/lint/safe-projections.json` (`review` per table); `test-kits/db/foundation-contract.test.mjs`:3201-3230 | By design, a consistent widen (grant, both lint files, 71 → 72, two digests, manifest) passes static and rule 17 (M3d). What stopped `last_error_code` was 120's post-migrate replacement, not rule 17. The file's §9.1 review is one text per table, and the test checks only its length (> 20). Nothing requires a review line, or an SP finding, for an added column. The tripwires (the count, the digests, the manifest) make the change visible in the diff; the anchor is human review. | Optional: a per-column review map in `safe-projections.json`, with a test that every pinned column has an entry. |

## 5. Stop-the-line verdict

**No stop-the-line.** None of the stop-the-line classes in `CONTRIBUTING_AGENTS.md`:44 is present:

- No secret is exposed.
- No tenant leaks: rls-smoke ran 1079 cases twice and passed, and no client reach changed.
- No migration diverges: 150 is a forward migration, 121 is not edited, and 150 is declared not applied to the
  instance.
- Nothing is irreversibly deleted, and nothing is a contract mismatch.

**Does anything block the merge?** No test or measurement I ran blocks it. Q-1 and Q-2 are false statements in
the record: one in the Owner-answer transcription, and one in the handoff that a merge cites. I recommend
correcting both before the merge, but that is the Integration Owner's call, not mine. Q-3 and Q-4 can be owed on
blockers [193] and [194]. The merge bar itself (RFC-2026-002; disposition 127 §6) is not mine to assess. The
open items there are the C0 and A1 reports and Integration Owner evidence (`open_blockers[188]`).

## 6. Limits

- One host and one PostgreSQL version (17.11). The harness ran at 0.05 only. I did not run it at 0.2, and none
  of the plan's §5 timing values (Q150-d) were re-measured.
- The mutations are the ones listed. M1 was tested in a separate later file, which the task's "drifts appended
  to 140" rule does not cover; M1b is the 140 form. The post-migrate re-run of 150's block was not reached in M1,
  because the pinned shape probe failed first.
- I compared the §9.1 projection review with the plan's quotation of the ERD, not with a fresh reading of every
  column. SP-1..SP-3's grades are A0's, and I did not re-grade them.
- The branch-name commands ran in my worktree with `--ignore-other-worktrees` while A0's worktree had the same
  branch checked out. No commit was made on that name.
- Cleanup: every cluster on 5503 was stopped and its data directory removed after its round. `lsof` showed
  nothing on 5503 at the end. The temporary `151_q0_mutant.sql` and the copy of main's harness were deleted.
  Every mutated file was restored from its saved copy. The private clone was removed. The scratch scripts and
  logs remain in `scratchpad/q0-150/`, uncommitted.
