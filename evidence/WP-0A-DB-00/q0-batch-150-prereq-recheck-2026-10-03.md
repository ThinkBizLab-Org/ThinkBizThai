# Q0 independent test re-check of batch 150-prereq's review round (PR #172)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-150-prereq`, head `00284c0` over code `7717c81`, base `b5f53c3` (main), Author
`/claude/a0_atlas`. Previous reviewed head `782df87` (my record:
`q0-batch-150-prereq-test-review-2026-10-03.md`, cherry-picked there as `af4bb79`). **Re-checked on:** my own
branch `recheck/q0-batch-150-prereq`, created at `00284c0`. **Date:** 2026-10-04.

This is a NARROW re-check of the review-round corrections. It records findings. It advances no status,
approves nothing, test-verifies nothing on anyone's behalf, and decides none of Q150-a..e.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and of the same vendor and model family. My
independence from the Author is the one RFC-2026-024 describes, and no more. Accepting this record as the
Tester role's signature is the Integration Owner's and the Product Owner's act, not mine. I fixed nothing:
every mutation below was made in a private export (`git archive 00284c0`) and restored byte for byte.

## 1. Measured versus read

**Measured.** Node `v24.20.0` (checked with `node -v` before every measured run; `/opt/homebrew/bin/node` is a
different version and was not used). PostgreSQL 17.11 from `/opt/homebrew/bin`. A fresh
`initdb --locale=C -A trust -U postgres` per round on 127.0.0.1:5503 only, TCP only
(`-c unix_socket_directories=''`), `LC_ALL=C`. The shim `db/foundation/ci/supabase-shim.sql` ran first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean` and `make db-rls-smoke`.
Private directory: `scratchpad/q0-150-prereqr2/`. The harness never ran above scale 0.05.

| Command | Where | Exit | Output |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs b5f53c3 WP-0A-DB-00` | branch NAME `agent/claude/WP-0A-DB-00-batch-150-prereq`, checked out in my worktree with `--ignore-other-worktrees` (local ref = `origin/...` = `00284c0`; no commit made on it; then back to `recheck/q0-batch-150-prereq`) | 0 | "all 20 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | same | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | same | 0 | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |
| assertions through the guard's own `stripNonCode` | `foundation-contract.test.mjs` at `782df87` and at `00284c0` | — | 878 → **898**, declared tests 80 → 80. The floor 878 → 898 is exact, and no test was added |
| integrity manifest | `test-kits/integrity-manifest.json` | — | 88 sha256 digests |
| migrations `b5f53c3` vs `00284c0` | `git diff --stat` | 0 | empty. `140_audit.sql` sha256 `2ac596bb950e8dfb…` |
| static layer, unmutated export | `node --test test-kits/db/foundation-contract.test.mjs` | 0 | 80 tests pass |
| R0: clean migrate-clean | 5503 | 0 | pinned shape "32 constraints, 18 indexes, 4 policies and 0 non-internal triggers ... (no column is pinned) (self-test: refused each of its 5 drifts)"; vocabulary 2 drifts; policy set 209 / 44 rows, 2 drifts; index coverage "valid whole btree ... in order, direction and NULLS order", 3 drifts |
| R0: catalog | same | — | 0 non-btree indexes in `app`/`private`; 0 key columns with a non-default NULLS order; 0 non-internal and 8 internal triggers on the three pinned tables |
| R0: harness `--scale 0.05`, h1 then h2, same cluster | same | 0, 0 | plan shapes, indexes, sorts and seq scans identical (diff with numbers masked: empty). Costs moved: workspace list 865.54 → 866.54, worker claim 2.08 → 3.72, audit first page 178.76 → 192.32 (as Q-5 said; now documented). `usage_events_id_seq` 1 → 50000 → 100000; database 14.8 MB → 102.6 MB → 165.4 MB; 0 rows left in `workspaces` |
| R0: rls-smoke after h1, h2 | same | 0 | "db-rls-smoke: ok", 6 claims discharged |
| R0: harness h3 after rls-smoke | same | **2** | "ws905 harness refuses a database that is not empty ...: app.assets, ..., app.workspaces already hold rows (P0001)" (19 tables). Sequence 100003 and size 167220915 bytes identical before and after: nothing written |
| harness and `make db-reset-test` with `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres#?host=q0-probe.invalid` | no server on 5503 | **1** / **2** (make) | both got past the guard; libpq resolved `q0-probe.invalid` ("could not translate host name ..."), and the host was printed unredacted. Finding R-1 |
| the same with `#?host=%2Fnonexistent-q0-dir` | same | **1** / **2** (make) | libpq tried the socket `/nonexistent-q0-dir/.s.PGSQL.5503`. Finding R-1 |
| `psql` directly with `#x?hostaddr=192.0.2.1` | same | 2 | "connection to server at "192.0.2.1", port 5503 failed: timeout expired" (TEST-NET-1; the guard admits this URL) |
| `psql` with `/?dbname=host%3Dq0-probe.invalid` | same | 2 | connected to 127.0.0.1 (refused): dbname inside a URI is not re-expanded, so no bypass |

`140_audit.sql` and the four mutable files were restored after every round, and each restore printed
"sha256 equal". My worktree's `git status` is clean apart from this file.

**Read, not measured:** the plan (§10 in full, the §6/§7 edits), the disposition's §5 table, `git diff
b5f53c3..00284c0` (the code in full, the records by section), the commit messages of `7717c81` and `00284c0`, the
manifest edits (`open_blockers[185]` changes "draft record §4" to "plan §4". `[194]` is rewritten in place:
pointers, Q150-e, (4), (9), (12), (13). The increment rationale gains a REVIEW ROUND suffix. Nothing else in
the manifest moves), the handoff's text fields, WS:909-917, ERD:279-282 and DR:161-163.

## 2. My earlier findings, re-measured

| Mine on `782df87` | Now | Evidence |
|---|---|---|
| Q-1 MEDIUM (hash, BRIN, NULLS LAST counted) | **closed** | R1-R4 below fail migrate-clean by name. N1-N3 are held by static and migrate-clean |
| Q-2 LOW (C8, C9, C10 survive) | **closed** | C8 and C9 now fail static and migrate-clean. C10 fails static only, as the plan says. It cannot be driven by a transactional migration |
| Q-3 LOW (roles never drifted) | **closed** | C2 and C6 now fail static and migrate-clean, each by its own probe |
| Q-4 LOW (allowlist matches anywhere) | **narrowed, not closed** | The parsed guard refuses all 15 crafted URLs, and G1, G3, G4 and G5 are caught by the static test. A `#` fragment still carries `?host=` past it: R-1 |
| Q-5 LOW ("the one trace") | **closed in text** | The header, README and test message now name sequences, reltuples, dead tuples and WAL, and say one run per fresh cluster. My R0 figures agree |
| Q-6 LOW (fails after rls-smoke) | **closed** | h3 exits 2 before writing (R0). Its condition is pinned only live: R-4 |
| Q-7 LOW (WS lines) | **closed** | WS:911 is the fixture, :913 no sequential scan, :914 p95 first page, :915 worker claim. No old citation is left in the branch's code, data, README, manifest or plan, except where the plan names the old one to correct it |
| Q-8 INFO (record text) | **closed or recorded** | 194 cites plan §6/§6.1/§10 and says where the draft went. 185 cites plan §4. `6a7bf73`'s "590 -> 675" is recorded on 194 (13) |

## 3. Mutation table, per layer

Static = `node --test test-kits/db/foundation-contract.test.mjs` with the mutated probe's digest REFRESHED in the
test, so the digest pin alone is defeated. mc = `make db-migrate-clean`, rs = `make db-rls-smoke`, each on a
fresh cluster. "Held" means some layer exits non-zero.

### 3.1 The new pins weakened in code

| Id | Mutation (`scripts/db/run.mjs` unless named) | static | mc | rs | Verdict |
|---|---|---|---|---|---|
| N1 | index coverage rule 1 drops `am.amname = 'btree'` (:1694) | **1** | **2** (drift 1 not naming `app.workspace_members.status`) | 0 | held twice |
| N2 | rule 2 drops `am.amname = 'btree'` (:1717) | **1** | **2** (drift 2 not naming the worker claim) | 0 | held twice |
| N3 | rule 2 drops the NULLS token | **1** | **2** (drift 2 not naming the audit_logs keyset) | 0 | held twice |
| N4 | pinned shape rule 5 computes but never raises | **1** ("4 rule(s) and 5 self-test(s)") | **2** (drift 5 passed) | 0 | held twice |
| N5 | rule 5 compares `def` only, not `tgenabled = 'O'` | 0 | 0 | 0 | survives, **equivalent today**: the pinned trigger set is empty, so no pinned trigger can be disabled. R-3 |
| C2 | pinned shape rule 4 compares no roles | **1** | **2** (drift 4 loses `published_posts_scope_narrowing`) | 0 | held twice (was 0/0/0) |
| C6 | policy set rule 2 compares no roles | **1** | **2** (drift 2 loses `approval_events_select_active_member`) | 0 | held twice (was 0/0/0) |
| C8 | rule 1's leading run read as "any key column" | **1** | **2** (loses `app.probe_ic_t.workspace_id`) | 0 | held twice (was 0/0/0) |
| C9 | rule 1 loses the table-qualified alternative | **1** | **2** (loses `app.probe_ic_q.workspace_id`) | 0 | held twice (was 0/0/0) |
| C10 | rule 2 counts invalid indexes | **1** | 0 | 0 | held by static only, as stated |
| H1 | `explain-harness.mjs:120` emptiness condition made `if false` | 0 | 0 | 0 | the harness after rls-smoke then exits **1** ("app.workspaces holds 102 row(s), not 100") after writing: sequence 3 → 50003, size 17.5 MB → 104.3 MB. Fails safe, but static does not pin it. R-4 |
| G1 | `testHostRefusal` ignores query parameters (`psql-driver.mjs`:46) | **1** | — | — | held |
| G2 | drops the `,` check | 0 | — | — | **equivalent**: WHATWG keeps the comma in the opaque host, so the hostname check refuses every listed form |
| G3 | drops the one-`@` check | **1** | — | — | held (`a@b@localhost`) |
| G4 | parameter keys compared case-sensitively | **1** | — | — | held (`?HOST=`) |
| G5 | `scrubbedEnv` scrubs nothing | **1** | — | — | held |

### 3.2 Drifts as a later file (appended to `140_audit.sql`, unmutated code)

| Id | Drift | static | mc | rs | Named by |
|---|---|---|---|---|---|
| R1 (my L3) | `jobs_available_at_idx` rebuilt `USING hash` | 0 | **2** | 0 | index coverage rule 2, "worker claim on app.jobs (available_at)". Was 0/0/0 |
| R2 (my L2) | `workspace_members_user_id_status_idx` rebuilt `USING brin` | 0 | **2** | 0 | rule 1, `app.workspace_members.status`. Was 0/0/0 |
| R3 (my L4) | `assets_library_keyset_idx` rebuilt `DESC NULLS LAST` | 0 | **2** | 0 | rule 2, the library first page. Was 0/0/0 |
| R4 | `jobs_available_at_idx` rebuilt `(available_at NULLS FIRST)` (an ascending variant no self-test ships) | 0 | **2** | 0 | rule 2, the worker claim |
| R5 | an AFTER UPDATE trigger on `app.usage_events` (a table drift 5 does not touch) | 0 | **2** | 0 | pinned shape rule 5, "unlisted or changed: app.usage_events.q0_probe_trg" |
| R6 | `DISABLE TRIGGER ALL` on `performance_snapshots` and `published_posts` (internal RI triggers, which rule 5 excludes) | 0 | **2** | **2** | not rule 5: the existing trigger probe ("trigger(s) not enabled: ... RI_ConstraintTrigger_... (tgenabled D, internal)"), and rls-smoke's 121 fixture ("a metric snapshot naming workspace_b over a post of workspace_a was accepted") |
| R7 | `workspace_members_user_id_status_idx` rebuilt `(user_id, status COLLATE "C")` | 0 | **0** | **0** | **nothing**. With `enable_seqscan = off`, `status = 'active'` is now a `Filter`, not an `Index Cond`: the index serves `user_id` only. R-2 |

## 4. Findings

### R-1 MEDIUM: a `#` fragment carries a connect-by parameter past the parsed host guard

`scripts/db/psql-driver.mjs:37-50`. `testHostRefusal` reads parameters from WHATWG `new URL(text).searchParams`.
For `postgresql://postgres@127.0.0.1:5503/postgres#?host=X`, WHATWG puts `?host=X` in the **fragment**, so
`searchParams` is empty and the URL is admitted. libpq has no fragment syntax. Its dbname runs to the first
`?`, so it reads `host=X` and connects there. I measured this with no server listening on 5503:

- `psql` resolved `q0-probe.invalid` and tried the socket `/nonexistent-q0-dir/...`.
- With `#x?hostaddr=192.0.2.1`, it tried 192.0.2.1:5503.
- `explain-harness.mjs` exited 1 and `make db-reset-test` exited 2 (its target 1) at connection, not at the
  refusal.
- The off-list host was printed unredacted. `redactConnection` (:79) reads the same `searchParams`, so S6's
  fix shares the hole.

So "carries none of the query parameters libpq would connect by" (`psql-driver.mjs:30-31`), the plan's
§10.2 S1 row, the handoff and blocker 194 (13) hold only for URLs without a `#`. The branch is **no worse than
main**: main's text regex admits the same URL. The round claims to close a MEDIUM, and the guard now gates
the target that drops `app` and `private`. It is a guard against operator error and a crafted environment
variable, not a remote surface.

**Remedy (A0):** refuse any URL containing `#`. Also refuse characters WHATWG strips but libpq keeps (ASCII tab,
LF, CR, and leading or trailing C0/space). Add the fragment forms to `crafted` (`foundation-contract.test.mjs:119`)
and to the both-tools loop. Owner of acceptance for `db-reset-test`: the Integration Owner, as 194 (13) says.

### R-2 LOW: index coverage reads neither collation nor operator class

Rules 1 and 2 (`run.mjs:1686-1720`) read key columns, access method, direction and NULLS order. They do not
read `indcollation` or `indclass`. R7 measured: a btree with `status COLLATE "C"` is counted as covering
`workspace_members.status` and serving the workspace switch lookup. The planner, however, can use it for
`user_id` only, and filters `status` (an index of another collation cannot match a default-collation clause).
The same holds for `kind`, `dimension` and `scope_type` in other lookups. It does not apply to the uuid and
timestamptz keys, which have one btree opclass. This is narrower and less likely than Q-1, and no index today
is affected. **Remedy:** in both rules, require each key column's `indcollation` to equal the column's
`attcollation` and its opclass to be the type's default btree opclass (`opcdefault`). Add a COLLATE drift as a
self-test. Alternatively, state the limit in README rule 21 and blocker 194 (5).

### R-3 INFO: rule 5's `tgenabled` comparison cannot fail today

N5 (compare the definition only) is equivalent while `triggers` is `{}` in every pinned shape. Disabled
**internal** triggers are not rule 5's job, and R6 shows the existing trigger probe and rls-smoke hold them.
**Remedy:** none now. When the first trigger is pinned, add a `DISABLE TRIGGER` drift for it.

### R-4 INFO: the emptiness refusal's condition is pinned only by a live run

H1 (`if occupied is not null` → `if false`, `explain-harness.mjs:120`) passes the static test, which checks only
that the raise text precedes the first INSERT (`foundation-contract.test.mjs:3348`). Live, the count check still
fails safe (exit 1, rolled back), but only after writing about 87 MB, which is what S3 asked to avoid.
**Remedy:** a static match on `if occupied is not null then raise exception`.

## 5. Claims checked

**True as measured or read:**

- The cherry-pick map (`9aec4f8`, `0805728`, `af4bb79` carry `-x` trailers naming `4a224c2`, `f975f86`,
  `c3b61e4`, and each adds one file).
- The floor 878 → 898 by the guard's count, with 80 tests and a suite of 684.
- The three digests: the static test passes, and every refresh in §3.1 moved only its own probe's.
- 88 manifest digests, and no migration diff.
- The clean set is unchanged: 0 non-btree indexes, 0 non-default NULLS orders and 0 non-internal triggers on
  the pinned tables, so nothing that passed is refused.
- The self-test counts 5 / 2 / 2 / 3.
- dA, dB, dL4 and dT2 reproduce as R1, R2, R3 and R5's shape: each 0 / **2** / 0, where each was 0 / 0 / 0.
- Under C2, C6, C8 and C9 each drift loses exactly the name the plan says.
- C10 is static-only, as stated.
- The harness: exit 0 on a fresh migrate-clean, then exit 2 after rls-smoke with sequence and size unchanged.
- The traces the header now names (sequences, reltuples, WAL and size growth) and costs drifting between
  repeats.
- WS:909-917 / :911 / :913 / :914 / :915.
- 17 read policies on 16 tables (the static test asserts it and passes).
- Disposition §5: every Q is UNANSWERED with options and a consequence of no. Q150-c's ERD:280 "DB performance
  owner", DR:163 MOD-140 (140-180, "A6 with A0 contract") and DR:161 MOD-120 (115-129) match the documents.
- Q150-e is separate.
- The refresh commit `00284c0` touches only the handoff and comes last.
- scope 0 over 20 paths, `check:handoff` 0, `verify` 0 (684).

**Not true as stated:** the parsed guard "refuses every URL that connects elsewhere" family of claims (R-1, a
`#` fragment). Nothing else I checked was false.

## 6. Stop-the-line and merge

**No stop-the-line.** I found no secret exposure, no tenant leakage, no migration divergence and no contract
mismatch. The branch adds no migration, policy, index or grant. R-1 needs a crafted `DB_TEST_URL` in the
operator's own environment, and main's guard admits the same URL.

**Nothing here blocks the merge on test grounds.** Every rule the round changed is a measured tightening, and
my Q-1, Q-2, Q-3, Q-5, Q-6 and Q-7 are closed. R-1 should, however, be fixed, or the claim corrected, before
the Integration Owner accepts the shared guard for `db-reset-test` (blocker 194 (13)), since that acceptance
rests on the guard's stated completeness. The merge remains subject to the C0 and A1 re-checks, the Integration
Owner evidence RFC-2026-025 §5 owes, and the bar of 127 §6. Neither is mine to judge.

## 7. Limits

- Scale 0.05 only. The 0.2 plans and the full WS:911 scale were not re-run.
- One PostgreSQL build (17.11). CI's `postgres:17` was not run by me.
- The mutation set is mine and not exhaustive: 16 code mutants and 7 later-file drifts. The R-1 bypass was
  measured against nothing listening (`.invalid`, a missing socket directory, TEST-NET-1). No real off-list
  host was contacted, and `db-reset-test` never reached a server.
- The allowlisted bare name `postgres` resolves through the local resolver, possibly through a DNS search
  domain on a workstation. This is inherited from main's allowlist and not tested here.
- I measured the three guards on the branch name with `--ignore-other-worktrees`, in my worktree, while the
  Author's worktrees `wf_6dce59ae-fd8-1` and `-5` hold the same name. I made no commit there.
- Cleanup: the cluster on 5503 was stopped and its data directory removed after every round. Port 5503 is
  free. The private export is removed at the end, and logs remain in the private directory. I did not touch
  5432, 5499 or other runs' ports. Free space on `/System/Volumes/Data` was 10 GiB at the end.
