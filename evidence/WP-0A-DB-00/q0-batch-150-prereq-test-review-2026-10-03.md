# Q0 independent test of batch 150's prerequisites (PR #172)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-150-prereq`, head `782df87` over code `9d57cda`, base `b5f53c3` (main),
Author `/claude/a0_atlas`, Draft PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/172>.
**Reviewed on:** my own branch `review/q0-batch-150-prereq`, created at `782df87`. **Date:** 2026-10-03/04 (UTC
2026-10-03T22:37Z at the end of the live rounds).

This file records findings. It advances no status, approves nothing, test-verifies nothing on anyone's
behalf, and decides none of Q150-a..d.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and of the same vendor and model family. My
independence from the Author is the one RFC-2026-024 describes, and no more. Accepting this record as the
Tester role's signature is the Integration Owner's and the Product Owner's act, not mine. I did not fix
anything: every mutation below was made in a private export and restored.

## 1. Measured versus read

**Measured** (Node `v24.20.0`, checked with `node -v` before every measured run; PostgreSQL 17.11 from
`/opt/homebrew/bin`; a fresh `initdb --locale=C -A trust -U postgres` per round on 127.0.0.1:5503 only, TCP only,
`-c unix_socket_directories=''`, `LC_ALL=C`; the shim `db/foundation/ci/supabase-shim.sql` first; then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean` and `make db-rls-smoke`;
private directory `scratchpad/q0-150-prereq/`; the harness never above scale 0.05):

| Command | Where | Exit | Output |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs b5f53c3 WP-0A-DB-00` | branch NAME `agent/claude/WP-0A-DB-00-batch-150-prereq`, checked out in my worktree with `--ignore-other-worktrees` (its local ref = `origin/...` = `782df87`; no commit made on it) | 0 | "all 16 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | same | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | same | 0 | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |
| assertion count through the guard's own `stripNonCode` | `test-kits/db/foundation-contract.test.mjs` | — | base `b5f53c3` 793, head 878; declared tests 80 both: the floor 793 → 878 is exact and no test was added |
| integrity manifest | `test-kits/integrity-manifest.json` | — | 88 digests |
| migrations `1319042` vs `b5f53c3` | `git diff --stat` | 0 | empty, as the plan says |
| PR #171 / #172 | `gh pr view` | — | #171 mergedAt 2026-10-03T21:52:26Z, head `e182b0f`, merge `b5f53c3`; #172 Draft, head `782df87`, check "bootstrap" SUCCESS |
| clean round | migrate-clean / rls-smoke | 0 / 0 | the four new probes: 32 constraints, 18 indexes, 4 policies; 60 CHECKs; 209 policies, 44 rows; 4 exempt, 28 lookups; each "refused each of its N drifts"; post-migrate 49/37/12; 1079 cases, 6 claims |
| static layer alone | `node --test test-kits/db/foundation-contract.test.mjs`, unmutated export | 0 | 80 tests pass |
| harness `--scale 0.05`, run 1, 2 | one migrated cluster | 0, 0 | plan shapes identical; costs not (finding Q-5) |
| harness `--scale 0.05 --fail-on-seq-scan` | same | 3 | "workspace list: Seq Scan on workspaces" (F2 reproduced at 0.05) |
| harness `--scale` 0, 1.5, -1, `abc`, `0.000001x` | — | 2 each | refused before connecting |
| harness, `DB_TEST_URL=postgresql://postgres@q0-probe.invalid:5503/postgres?application_name=@localhost/` | — | **1** | it got past the allowlist and psql tried to resolve the off-list host (finding Q-4); the same URL without the suffix exits 2 |
| harness after rls-smoke on the same database | three rounds | **1** | "ws905 fixture: app.workspaces holds 102 row(s), not 100" (finding Q-6) |

`140_audit.sql` was saved (sha256 `2ac596bb950e8dfb…`, the plan's) and restored byte for byte after every
round; each restore printed "sha256 equal". My worktree's `git status` is clean apart from this file.

**Read, not measured:** the plan, the disposition, `git diff b5f53c3..782df87`, the commit messages, the
manifest's blocker edits (`open_blockers[179]`, `[185]` extended as pure suffixes; `[194]` new and last; only
`ownership.branch` and the rationale otherwise change), the handoff, the phase plan's "Batch 150", the batch 127
and 129 dispositions, WS and ERD lines. The full WS:905 scale was not run (by instruction).

## 2. Mutation table, per layer

Static = `node --test test-kits/db/foundation-contract.test.mjs` with the mutated probe's digest REFRESHED in the
test (so the digest pin alone is defeated); mc = `make db-migrate-clean`; rs = `make db-rls-smoke`. "Held" means
some layer exits non-zero.

### 2.1 The new pins weakened in code (`scripts/db/run.mjs`, digest refreshed)

| Id | Mutation | static | mc | rs | Verdict |
|---|---|---|---|---|---|
| C1 | pinned shape rule 1 reads ENABLE only (FORCE dropped) | **1** ("rule 1 reads ENABLE and FORCE") | **2** (self-test 1 not refused) | 0 | held twice |
| C2 | pinned shape rule 4 compares no `roles` (`run.mjs:1544`) | 0 | 0 | 0 | **survives**; Q-3 |
| C3 | pinned shape rule 3 compares indexes by validity only, not text | 0 | **2** (self-test 3 not named) | 0 | held by mc |
| C4 | vocabulary selector loses the single-column equality | **1** | **2** | 0 | held twice |
| C5 | vocabulary rule 2 drops `and f.ok` | 0 | 0 | 0 | survives, but **equivalent**: `pg_get_constraintdef` appends ` NOT VALID`, so rule 1 names the drift (L10xC5) |
| C6 | policy set rule 2 compares no `roles` (`run.mjs:1632`) | 0 | 0 | 0 | **survives**; Q-3 |
| C7 | policy set rule 1 reads `app` only | **1** | **2** | 0 | held twice |
| C8 | index coverage rule 1: "leading run" replaced by "any key column" (`run.mjs:1670-1675`) | 0 | 0 | 0 | **survives**; Q-2 |
| C9 | index coverage rule 1 loses the table-qualified alternative (`run.mjs:1667`) | 0 | 0 | 0 | **survives**; Q-2 |
| C10 | index coverage rule 2 counts invalid indexes (`run.mjs:1697`) | 0 | 0 | 0 | **survives**; Q-2 |

### 2.2 Drifts as a later file (appended to `140_audit.sql`, unmutated code)

| Id | Drift | static | mc | rs | Named by |
|---|---|---|---|---|---|
| D1 | `performance_snapshots` NO FORCE | 0 | **2** | 0 | pinned shape (the plan's claim, reproduced) |
| D4 | `performance_snapshots_scope_time_idx` rebuilt `(workspace_id, metric_time)` | 0 | **2** | 0 | pinned shape (reproduced) |
| D6 | `probe_extra_read` on `published_posts` | 0 | **2** | 0 | pinned shape and policy set (reproduced) |
| D9 | worker-claim and library keyset indexes dropped | 0 | **2** | 0 | index coverage rule 2 (reproduced) |
| L1 | `performance_snapshots.metric_time` DROP NOT NULL (F7, the stated limit) | 0 | **2** | 0 | not the new probe: 121's post-migrate block `121#1` (line 414). F7 holds for columns 121's block does not list |
| L2 | `workspace_members_user_id_status_idx` rebuilt `USING brin (user_id, status)` | 0 | **0** | 0 | **nothing**; the harness's workspace list stops using it (Q-1) |
| L3 | `jobs_available_at_idx` rebuilt `USING hash (available_at)` | 0 | **0** | 0 | **nothing**; worker claim becomes `SEQ SCAN on jobs; sort on available_at` (Q-1) |
| L4 | `assets_library_keyset_idx` rebuilt `created_at desc nulls last, id desc nulls last` | 0 | **0** | 0 | **nothing**; library first page gains `sort on created_at DESC, id DESC` (Q-1) |
| L5 | `research_runs_page_scope_idx` dropped | 0 | **2** | 0 | FK support and index coverage rule 1 (`research_runs.page_context_profile_id`) |
| L6 | `workspace_members_user_id_status_idx` narrowed to `where status = 'active'` | 0 | **2** | 0 | index coverage rule 1 (`workspace_members.status`) |
| L7 | `audit_logs_workspace_keyset_idx` narrowed to `(workspace_id, occurred_at desc)` | 0 | **2** | 0 | index coverage rule 2 |
| L8 | `content_versions` DISABLE RLS (F8) | 0 | **2** | **2** | post-migrate `082#1`; rls-smoke 5 of 1079 cases. F8's statement is accurate |
| L9 | `content_versions_select_active_member` TO authenticated, anon | 0 | **2** | 0 | policy set rule 2 |
| L9xC6 | L9 under C6 | — | **2** | 0 | not the policy set: post-migrate `080#1` ("a policy for a role that is not authenticated") |
| L10 | `notifications_channel_known` re-added NOT VALID | 0 | **2** | 0 | vocabulary rule 1 |
| L10xC5 | L10 under C5 | — | **2** | 0 | vocabulary rule 1 (C5 is equivalent) |
| L11xC2 | `published_posts_scope_narrowing` TO authenticated, anon, under C2 | — | **2** | 0 | not the shape probe: the pinned (restrictive) policy probe |
| L12 | new index `approval_requests (created_at, status)` | 0 | 0 | 0 | correct: `status` is still not in a leading run, the exemption stands |
| L12xC8 | L12 under C8 | — | **2** | 0 | rule 3 ("exemption naming no uncovered column"): C8 is distinguishable by a drift no self-test ships |

Plans for L2-L4 come from `explain-harness.mjs --scale 0.05` on a fresh migrate-clean of the drifted tree
(no rls-smoke, see Q-6); the clean baseline H0 shows `workspace_members_user_id_status_idx`,
`assets_library_keyset_idx` with no sort, and `jobs_available_at_idx`.

## 3. Findings

### Q-1 MEDIUM — index coverage counts an index that cannot serve the query (access method, NULLS order)

`scripts/db/run.mjs:1691-1697` (rule 2) and `:1670-1675` (rule 1) read key columns and the DESC bit only. They read
neither `pg_class.relam` nor the NULLS FIRST bit of `indoption`. Measured: L2 (BRIN), L3 (hash) and L4 (`DESC
NULLS LAST`) pass static, migrate-clean and rls-smoke. Meanwhile the very queries the lookups are declared for
lose their index. The worker claim becomes a Seq Scan plus Sort, the library first page sorts, and the workspace
list stops using its index. README rule 21 (`db/foundation/README.md:634-643`) and the probe's claim say
"served ... in order and direction", which is not what is checked. No index on the three pinned shape tables is
affected, because `pg_get_indexdef` carries `USING btree`. Not stop-the-line: no migration, no tenant path.
**Remedy:** require `amname = 'btree'` (or an explicit per-lookup access method) in rules 1 and 2. Compare the
NULLS bit against the lookup's direction (DESC implies NULLS FIRST unless the lookup says otherwise). Add a hash
drift and a NULLS LAST drift as self-tests. Owner: A0, on `open_blockers[194]`.

### Q-2 LOW — three index-coverage mechanics are pinned by neither a static assertion nor a self-test

C8 (the "leading run" becomes "any key column"), C9 (the table-qualified alternative dropped) and C10 (rule 2
counts invalid indexes) leave every layer green with the digest refreshed. The static block
(`test-kits/db/foundation-contract.test.mjs:3215-3245`) reads rule 1's `pg_depend` join and its
`indisvalid and indpred is null`, and rule 2's slice comparison. It does not read the run computation, the second
regex, or rule 2's `indisvalid`. L12xC8 shows that a drift distinguishing C8 exists, but none ships. C10 cannot
be driven by an ordinary transactional migration (only by a catalog write), so it is the least of the three.
**Remedy:** static regexes over the `runs` CTE and rule 2's `where i.indisvalid`. Add a self-test whose only
index carries the predicate column behind a non-predicate column, and a policy that names its own column
table-qualified.

### Q-3 LOW — no self-test drifts a policy's roles in the two new policy pins

C2 and C6 survive their own probes' layers. Today each is held elsewhere: L11xC2 by the pinned restrictive policy
probe (`run.mjs:932`, roles = `{authenticated}`), L9xC6 by post-migrate `080#1`. So the roles comparison of
rules 4 and 2 is untested code, and the held-by-another-layer cover is per table, not per rule. **Remedy:** a
`TO authenticated, anon` drift in each probe's self-tests.

### Q-4 LOW — the harness's host allowlist matches anywhere in the URL

`scripts/db/explain-harness.mjs:32` tests `/@(localhost|127\.0\.0\.1|postgres)[:/]/` against the whole URL, so
`...@q0-probe.invalid:5503/postgres?application_name=@localhost/` passes it. Measured: exit 1 at name resolution,
not exit 2. The regex is the existing `db-reset-test` guard's (`run.mjs:3563`), copied, so this is inherited as
well as new. The handoff's "runs only where DB_TEST_URL names an allowlisted host" and README :713 are therefore
true only for well-formed URLs. A guard against operator error, not an attack surface. **Remedy:** parse with
`new URL()` and compare `hostname` exactly, in both places; add the suffix case to the refusal test at
`foundation-contract.test.mjs:104`.

### Q-5 LOW — "rolled back" is not "left as it was": costs drift and disk grows

Run twice at 0.05 on one cluster, the plan shapes, indexes, sorts and exits were identical (idempotent in
verdict). Total costs moved: workspace list 865.54 → 866.54, worker claim 2.08 → 3.72, audit first page
180.48 → 193.31. Three 0.05 runs left a 548 MB cluster with 368 MB of WAL. Every table had 0 rows, but
`usage_events` held 39 MB, `audit_logs` 55 MB, and `audit_logs.reltuples` stayed 50000. Free space fell from
10 GiB to 8.2 GiB until the cluster was removed. The header (`explain-harness.mjs:15-16`) calls reltuples "the
one trace", which it is not. This is the mechanism behind the draft's second disk dip (plan §6.2). **Remedy:**
correct the comment and README :713-715; document one run per fresh cluster (or VACUUM after); the free-space
guard already owed (`open_blockers[194]` (12)).

### Q-6 LOW — the harness fails on any database rls-smoke has used

The count check (`explain-harness.mjs:105-106`) compares absolute counts. After `make db-rls-smoke`, which leaves
committed rows, it exits 1 ("app.workspaces holds 102 row(s), not 100"). It fails safe and rolls back, but the
README and the handoff say only "a database `make db-migrate-clean` built". **Remedy:** say "a fresh
migrate-clean, before rls-smoke", or check deltas.

### Q-7 LOW — WS line citations are off by about six

The branch cites the fixture and budgets as WS:905-910 (WS:907 for "no sequential scan", WS:908 for first pages,
WS:910 for the worker): 37 lines across `explain-harness.mjs`, `ws905-fixture.mjs`, `run.mjs`, the README
(:639, :696, :699), `index-coverage.json`, the manifest and the plan. In
`docs/plans/core-database-and-rls-workstream-th.md` (unchanged since `c5919db`) the fixture is at **:911**,
"no sequential scan" at **:913**, the p95 first page at **:914**, and the top-20 snapshot at **:917**. Lines
905-910 are §9.4 "Migration tests". The phase plan had it right (WS:909-917, WS:911). The static test reads the
text, not the line, so nothing fails. **Remedy:** re-cite in a follow-up. The `WS905` identifiers can stay as names.

### Q-8 INFO — record text

- `open_blockers[194]` cites "plan ... §5" for the findings, which are in plan §6 (§5 is the EXPLAIN plans).
  It also names `a0-batch-150-prereq-draft-2026-10-03.md`, which no longer exists on the branch (moved by
  `git mv`). `[185]` says "draft record §4", which is now plan §4.
- Plan §0.1 places the fixture/harness static block at :3253 and the refusal test at :107-110. The block's
  comment starts at :3247 and the loop at :104. This is within the block.
- `6a7bf73`'s message keeps the draft's "590 -> 675" and "measured at 1319042". The plan §0 and `9d57cda` say
  so, and the floor that holds is 878 (measured).

## 4. Claims checked

True as measured or read: the cherry-pick lineage and conflict set (plan §0); floor 793 → 878 by the guard's
count with 684 tests unchanged; four new digests, none moved (the static test passes; each refresh in §2.1
changed only its own); 88 manifest digests; byte-identical migrations `1319042`/`b5f53c3`; the counts
32/18/4, 60, 209/44, 4/28; D1, D4, D6, D9 fail migrate-clean by the new probe's name and pass rls-smoke; F2 at
small scale too; scope 0 with 16 paths; `check:handoff` 0; the three files amended outside ownership, with
`paths` unchanged; blocker 179/185 edits are suffixes and 194 is appended last; the Owner's words quoted
verbatim match the batch 127 and 129 dispositions; #171's merge time, head and check; PR #172 is a Draft, CI
green on `782df87`; no migration, policy, index or grant in the diff; the harness is in no Makefile target and
no workflow. Not true as stated: Q-4 (the allowlist), Q-5 ("the one trace"), Q-7 (WS lines), Q-8 (section and
file citations). F7 is narrower than written: 121's NOT NULL columns are held by 121's own block (L1).

## 5. Stop-the-line and merge

**No stop-the-line.** No secret, tenant leakage, migration divergence or contract mismatch was found. The branch
adds no migration, and every finding is in assertion tooling or records. **Nothing found here blocks the merge
on test grounds.** Q-1 is a gap in a probe that still adds coverage (D1, D4-D9 and L5-L7 are now held), owed by
name. The merge remains subject to the C0 and A1 role runs, the Integration Owner evidence RFC-2026-025 §5 still
owes, and the bar of 127 §6. Neither is mine to judge.

## 6. Limits

- Scale 0.05 only. The 0.2 plans and the full WS:905 scale were not re-run, so F2 at 0.2 is the Author's.
- One PostgreSQL build (17.11). CI's `postgres:17` was not run by me (F9 stands).
- The mutation set is mine and not exhaustive: 10 code mutants and 19 later-file drifts. I did not mutate the
  fixture generator's SQL or the harness's plan summariser beyond the shipped static tests.
- I measured on the branch name via `--ignore-other-worktrees` in my own worktree, where the Author's worktree
  holds the same name. I made no commit there and returned to `review/q0-batch-150-prereq`.
- Cleanup: the cluster on 5503 was stopped and its data directory removed after every round. Port 5503 is free.
  The private export was removed. 5432, 5499 and other runs' ports were not touched. Logs remain in the private
  directory.
