# Batch 150's prerequisites: plan, item to change to test, measured

**Package:** `WP-0A-DB-00`. **Branch:** `agent/claude/WP-0A-DB-00-batch-150-prereq`, cut from main
`b5f53c3` (PR #171, batch 170 assertions, merged by A0 at its reviewed head `e182b0f` under the Owner's
standing delegation, `product-owner-disposition-2026-10-03-batch-127.md` §6; the required CI run
"bootstrap" was green on `e182b0f`; merged 2026-10-03T21:52:26Z).

Written 2026-10-04 by a subagent of the Author run `/claude/a0_atlas`. It is the Author's record. It
approves nothing, decides none of the plan's Q-ids, and adds **no migration, no policy, no index and no
grant**. Gate: pre-G0 (CONTRIBUTING_AGENTS.md:23). Its disposition is
`product-owner-disposition-2026-10-03-batch-150-prereq.md` in this directory.

This file began as the draft record `a0-batch-150-prereq-draft-2026-10-03.md` (`9e45aa4` on the local
branch `draft/wp-db00-150-prereq`) and was moved here with `git mv`. Sections 0, 6.1, 6.2, 7, 8 and 9 are
new or rewritten. Sections 1 to 6 are the draft's, kept as measured at `1319042`. What this branch
re-measured is stated in §0.1 and §0.2. Source: the phase plan for 141–170
(`a0-phase-plan-141-170-2026-10-03.md`), "Batch 150 — 3. Can do now". The Owner ended the hardening chain
at 129 and told A0 to do everything that needs no pending decision.

**No migration.** Every item is an assertion, lint data, a fixture generator, a harness or a test.
Q150-a, Q150-b, Q150-c and Q150-d are left undecided (§7).

## 0. Commits on this branch

| commit | what |
|---|---|
| `6a7bf73` | the draft's `fef718d`, cherry-picked. The draft was cut at `1319042`, the head of the batch 170 draft. That draft merged in reworked form as #171 (`b5f53c3`), so only `fef718d` and `9e45aa4` were taken. Three conflicts: `scripts/test-suite-contract.mjs` (main had moved foundation-contract's assertion floor to 793; the draft's 590 → 675 was its base's), the digest comment in `test-kits/db/foundation-contract.test.mjs` (main's batch 170 review-round comment and the draft's 150 comment, both kept), and `test-kits/integrity-manifest.json`. They were resolved by keeping main's text, taking the guard's own count (§0.1) and regenerating the manifest. `scripts/db/run.mjs` and `db/foundation/README.md` merged without conflict; three README phrases that said "the draft" were reworded. The commit keeps the draft's message, whose "590 -> 675" is the base's, not this branch's. |
| `305935c` | the draft's `9e45aa4` (the draft record), cherry-picked without conflict. |
| `9d57cda` | packaging: the branch slot and increment rationale; blockers 179 and 185 extended and 194 new; the branch-identity slot; the integrity manifest. Committed plainly. `commit-when-clean` refused with exit 1 (tests 684, pass 682, fail 2), and the only two failures were the handoff guard ("the handoff for this branch describes this branch" and the handoff ratchet). The last commit refreshes it. |
| next | this plan (moved from the draft record) and the disposition. |
| last, alone | `npm run refresh:handoff`, then the handoff's text fields. |

### 0.1 Floors, digests, manifest, verification record, line numbers

- `scripts/test-suite-contract.mjs`, read through the guard's own `stripNonCode`: main `b5f53c3` holds
  foundation-contract's floor at **793**, and this branch makes **878** assertions. So the floor moves
  793 → 878 (+85, the same 85 the draft added on its base, 590 → 675). No test is added or renamed, so
  the test floor and the name digest stay. The draft's numbers are not used.
- The four new probe digests are the draft's and pass on this tree: `pinned shape probe`
  `d9d0a827e5be09e3`, `vocabulary check probe` `d28d49cb3af0a0fd`, `policy set probe` `10e2446a17df3d73`
  and `index coverage probe` `7e53a75a9931e962`. No existing digest moves; main's `pinned grant probe`
  `baa6379790cb8733` is kept.
- The lint files were measured at `1319042`. The migrations are byte-identical between `1319042` and
  `b5f53c3` (an empty diff under `db/foundation/migrations`), so the catalog they describe is the same.
  Migrate-clean on this branch confirms every count (§0.2).
- `evidence/VERIFICATION.md` is **not amended**. The suite stays **684** tests (`npm run check`), so the
  record holds byte for byte. `amends_without_owning.paths` is unchanged (the same three files as #171),
  so no WP line citation in the lint files moves. `verify-branch-scope` exited 74 before the packaging
  commit (the draft's F12: the branch-identity amendment declared and not made) and 0 after it.
- The new blocker `open_blockers[194]` is appended at the end, so no blocker index moves. The phase plan's
  `WP:432` (blocker 179) and `WP:438` (blocker 185) still name those blockers on this branch.
- `test-kits/integrity-manifest.json`: regenerated (88 digests).
- The line numbers in §1 are the draft's. On this branch, the four file constants in `scripts/db/run.mjs`
  are at :1491 (`PINNED_SHAPES_FILE`), :1561 (`VOCABULARY_CHECKS_FILE`), :1602 (`POLICY_SET_FILE`) and
  :1654 (`INDEX_COVERAGE_FILE`), and the new probe jobs start at :2109. The static blocks in
  `test-kits/db/foundation-contract.test.mjs` start at :3131 (shapes), :3165 (vocabularies), :3190
  (policy set), :3215 (index coverage) and :3253 (fixture and harness); the harness refusal test is at
  :107-110. README rules 18-21 are at `db/foundation/README.md`:614-643, and the harness section is at :696.

### 0.2 Measured on this branch

Setup for every round:

- Node `v24.20.0`, checked with `node -v` before each run. One round ran under the PATH Node 26 and was
  discarded; after that, Node 24.20.0 was put first on the PATH explicitly.
- PostgreSQL 17.11 from `/opt/homebrew/bin`, a fresh `initdb --locale=C -A trust -U postgres` per round.
- 127.0.0.1:5507 only, TCP only (`-c unix_socket_directories=''`), with `LC_ALL=C`.
- The shim `db/foundation/ci/supabase-shim.sql` applied first, then
  `DB_TEST_URL=postgresql://postgres@127.0.0.1:5507/postgres`.
- Private directory `scratchpad/a0-150-prereqr/`.

| Item | Command | Exit | Output |
|---|---|---|---|
| all | `npm run check`, the cherry-picked code alone, before packaging | 0 | tests 684, pass 684 |
| all | `npm run check`, the tree of `9d57cda` before its commit, handoff not yet refreshed | 1 | tests 684, pass 682, fail 2: the handoff guard only |
| scope | `node scripts/verify-branch-scope.mjs b5f53c3 WP-0A-DB-00` | 74 → 0 | before packaging: "declares 1 amendment(s) that explain nothing ...: test-kits/branch-identity.test.mjs"; after: "all 14 changed path(s) are declared" |
| round 1 | `make db-schema-lint` | 0 | |
| round 1 | `make db-migrate-clean` | 0 | the four new probes as in the draft: "32 constraints, 18 indexes and 4 policies", "the 60 vocabulary CHECKs", "209 in app ... the 44 rows", "4 exempt ... the 28 declared lookups"; each "refused each of its N drifts; clean again after every drift"; post-migrate pass 49 / 37 / 12; 5.2 s |
| round 1 | `make db-rls-smoke`, first run | 0 | 1079 isolation case(s) passed; `db-authz-proofs: ok — 6 claim(s)` |
| round 1 | `make db-rls-smoke`, second run, same database | 0 | 1079; 6 claims |
| round 2 | `make db-migrate-clean` | 0 | as in round 1 |
| round 2 | `node scripts/db/explain-harness.mjs --scale small` | 0 | |
| round 2 | `node scripts/db/explain-harness.mjs --scale 0.2` | 0 | loaded, analysed and rolled back in 10 s; the same scans, indexes and sorts as §5; "membership-class seq scans: workspace list: Seq Scan on workspaces" |
| round 2 | the same with `--fail-on-seq-scan` | 3 | the workspace list (F2) |
| D1 | `alter table app.performance_snapshots no force row level security;` appended to 140 | mc 2, rs 0 | "pinned shape probe: as built: ... app.performance_snapshots (rls true, forced false)" |
| D4 | `performance_snapshots_scope_time_idx` rebuilt as `(workspace_id, metric_time)` | mc 2, rs 0 | "missing or changed: app.performance_snapshots.performance_snapshots_scope_time_idx; unlisted or changed: ..." |
| D6 | `create policy probe_extra_read on app.published_posts for select to authenticated using (app.is_active_member(workspace_id));` | mc 2, rs 0 | pinned shape ("unlisted or changed: app.published_posts.probe_extra_read") and policy set ("no pinned list names: app.published_posts.probe_extra_read") |
| D9 | `drop index app.jobs_available_at_idx; drop index app.assets_library_keyset_idx;` | mc 2, rs 0 | index coverage: "library first page on app.assets (...); worker claim on app.jobs (available_at)" |

`140_audit.sql` was saved before the drift rounds (sha256 `2ac596bb950e8dfb…`, the same as the draft's).
It was restored byte for byte after each round, the sha256 matched every time, and `git status` shows it
unchanged. The harness ran only at small and 0.2 scale, on the round's own cluster. Free space on
`/System/Volumes/Data` stayed at 11 GiB before and after every round, and the cluster was removed after
each round.

## 1. Item → file → rule and test (the draft's, measured at `1319042`; line numbers re-measured in §0.1)

| Plan item | File(s) | Rule (probe in `scripts/db/run.mjs`) | Self-test drifts | Static test (`test-kits/db/foundation-contract.test.mjs`) |
|---|---|---|---|---|
| (a) survey item 5: 121's unique keys, indexes, CHECKs and policy by `pg_get_constraintdef` / `pg_get_indexdef` / `pg_get_expr`, plus `relforcerowsecurity` | `db/foundation/lint/pinned-shapes.json` (new): `app.performance_snapshots`, `app.published_posts` (121 added the key the snapshot FK references), `app.usage_events` (item 6's unique key); `run.mjs:1433-1504` | **pinned shape probe** (`run.mjs:2051`), 4 rules: (1) RLS enabled AND forced; (2) every constraint by type, text and validation, both ways (32); (3) every index by text and validity, both ways (18); (4) every policy by flag, command, roles and both halves, both ways (4) | 4: FORCE off; a CHECK rewritten under its own name + `usage_events_dedupe_key_unique` dropped + a new CHECK; an index rebuilt narrower under its name + a new index; the read policy `... or true` + a looser sibling | `:3116-3149`: the probe reads the file; tables exist; every constraint 121 names on performance_snapshots is pinned; the dedupe key's text; the narrowing's two pins agree; reading predicates (FORCE, constraintdef + convalidated, indexdef + indisvalid, both policy halves); digest `d9d0a827e5be09e3` |
| (a) survey item 6: the vocabulary CHECKs' text across the schema (measure the set) | `db/foundation/lint/vocabulary-checks.json` (new, 60 rows); `run.mjs:1506-1544` | **vocabulary check probe** (`run.mjs:2076`), 2 rules: (1) a CHECK in app/private whose deparse holds `ARRAY['` or is `CHECK ((col = 'v'::text))`, not pinned in that exact text; (2) a pinned one not found validated in its text | 2: channel widened in one home + dimension widened in one home + a new vocabulary; one dropped + one rewritten as a regex (out of the selector) | `:3150-3174`: 60, sorted, each of the selector's shape and named by a migration; the four shared vocabularies (channel, provider, dimension, quantity_unit) are one text in every home; the selector text; digest `d28d49cb3af0a0fd` |
| (a) survey item 7: the narrowing predicates not already pinned (measure what is left) | `db/foundation/lint/policy-set.json` (new, 44 rows); `run.mjs:1546-1593` | **policy set probe** (`run.mjs:2089`), 2 rules: (1) every policy on a table in any non-system schema (or made after initdb) is named by `PERMISSIVE_POLICIES`, `PINNED_POLICIES`, the five closure lists or the file; (2) every file row found in its exact text | 2: a looser permissive read on a read-only table + a policy in `private`; a read predicate gutted + a service-path closure opened | `:3175-3199`: 44 rows, disjoint from the other lists, 209 in all; the 26 service-path rows' one shape; the 17 read rows are permissive SELECT to authenticated; app_authz's policy; digest `10e2446a17df3d73` |
| (b) index coverage for RLS-predicate and keyset cursor columns | `db/foundation/lint/index-coverage.json` (new: 4 exemptions keyed `schema.table.column`, 28 lookups, 3 findings); `run.mjs:1595-1675` | **index coverage probe** (`run.mjs:2102`), 3 rules: (1) every USING column of a policy's own table (pg_depend ∩ named in the USING deparse) sits in the leading run of a valid whole index of such columns, or is exempt; (2) every declared lookup is served by a valid index beginning with its columns, in order and direction, with exactly its predicate; (3) every exemption names an uncovered column | 3: a new table filtering an unindexed column + an existing read policy narrowed on `title`; the worker-claim index dropped + the library keyset rebuilt ascending; an exempt column given an index | `:3200-3231`: exemption keys and reasons; the four exemptions by name; every `*_keyset_idx` a migration creates (21) is a lookup; the five named WS:905-910 lookups; the content first page is finding IC-1 and no lookup; reading predicates; digest `7e53a75a9931e962` |
| (c) WS:905 fixture generator, scale a parameter, small by default | `test-kits/db/ws905-fixture.mjs` (new) | — (not a probe; never applied by migrate-clean, rls-smoke or CI) | — | `:3232-3279`: `WS905_FULL` is WS:905's numbers and the docs line still says them; expected counts; small default; `ws905Scaled` keeps the hierarchy; parameter checks; no meta-command, no transaction control, INSERTs into app only, every table loaded, no address |
| (c) EXPLAIN harness: named queries, seq scans on membership checks, `DB_TEST_URL` only, no p95, not in CI | `scripts/db/explain-harness.mjs` (new) | — | — | `:89-116` (the refusal test): exit 2 with no `DB_TEST_URL` and with a host off the allowlist, nothing on stdout; `:3261-3279`: one transaction, rolled back, never committed, no timing, the named queries in WS order, the membership class, plan summary and verdict on synthetic plans, exit 3 only under the flag, absent from `Makefile` and `.github/workflows/ci.yml` |

Also changed: `db/foundation/README.md` (rules 18-21 at `:591-621`; the count is twenty-two families in
thirty probes at `:322-328`; a harness section at `:673`); `scripts/test-suite-contract.mjs`
(foundation-contract assertion floor 590 → 675, the guard's own count read through `stripNonCode`; no test is
added or renamed, so the test floor, the name digests and the suite count, 677, stay, and
`evidence/VERIFICATION.md` is not touched); `test-kits/integrity-manifest.json` (regenerated, 88 digests). No
existing probe digest moved.

## 2. How the data was measured (the draft's)

On a fresh cluster after `make db-migrate-clean` at `1319042`, with `search_path = pg_catalog` (as every probe
job runs, so deparse is schema-qualified):

- **Shapes:** the three tables' constraints, indexes, policies and RLS flags, read from the catalog.
- **Vocabulary CHECKs:** 269 CHECKs in app and private; 60 match the selector (59 app, 1 private).
- **Policies:** 209 in app (none elsewhere). Already pinned: 74 permissive policies of client-writable tables,
  36 restrictive policies, 55 closures. Not read by any migrate-clean rule: 44. They are 17 permissive
  SELECT policies on the 13 tables a client only reads, 26 `*_service_path_closed` (rls-smoke's
  `SERVICE_PATH_CLOSURE_ON` text check covers all 26 by name, measured from `isolation-cases.mjs`, but
  migrate-clean did not), and `workspace_members_select_authz_own_active` (static authz lint on the
  committed snapshot only). **All 33 scope narrowings were already pinned by 127's review round.**
- **RLS predicate columns:** 112 (table, column) pairs a policy reads in its USING half on its own table; 108
  covered, 4 not: `approval_requests.status`, `calendar_items.deleted_at`, `content_schedules.status`,
  `workspaces.lifecycle_state`, all state filters applied with covered scope columns. These are exemptions with
  reasons.
- **Keyset cursors and lookups:** 21 indexes named `*_keyset_idx` plus 7 serving the named queries (membership
  check, workspace list, calendar, worker claim, member scope helpers, metrics per post, quota recompute). All
  28 are served.

The generator scripts (`gen.mjs`, `gen-ic.mjs`) live in the subagent's private directory, not in the repository
(F10).

## 3. Commands and exit codes (the draft's, at `1319042` on port 5509; this branch's are §0.2)

Setup for every live round: PostgreSQL 17.11 from `/opt/homebrew/bin`. Each round ran `initdb --locale=C -A trust
-U postgres` afresh on 127.0.0.1:5509 only, TCP only (`-c unix_socket_directories=''`), with `LC_ALL=C`. The shim
`db/foundation/ci/supabase-shim.sql` was applied first, and `DB_TEST_URL=postgresql://postgres@127.0.0.1:5509/postgres`.
Node was `v24.20.0`, checked with `node -v` before each run (a PATH Node 26 exists and was not used).

| Command | Exit | Output |
|---|---|---|
| `make db-migrate-clean`, fresh cluster, at `1319042` (baseline) | **0** | 26 probes; post-migrate pass 49 / 37 / 12; 4.9 s |
| `make db-migrate-clean`, fresh cluster, this tree | **0** | 30 probes, each refusing every drift and clean again; "pinned shape probe: ... 32 constraints, 18 indexes and 4 policies ... (refused each of its 4 drifts)"; "vocabulary check probe: the 60 vocabulary CHECKs ... (each of its 2)"; "policy set probe: ... 209 in app ... 44 rows ... (each of its 2)"; "index coverage probe: ... 4 exempt ... 28 declared lookups ... (each of its 3)"; post-migrate pass 49 / 37 / 12; 6.5 s |
| `make db-rls-smoke`, the same database, first run | **0** | 1079 isolation case(s) passed; `db-authz-proofs: ok — 6 claim(s)` |
| `make db-rls-smoke`, the same database, second run | **0** | 1079 cases; 6 claims |
| `make db-schema-lint` | **0** | |
| `npm run check` (node 24.20.0) | **0** | tests 677, pass 677, fail 0 |
| `node scripts/commit-when-clean.mjs` for `fef718d` | **0** | "clean: exit 0 — tests 677, pass 677, fail 0, skipped 0, todo 0" |
| `node scripts/verify-branch-scope.mjs 999456d WP-0A-DB-00` (and `1319042`) | **74** | "declares 1 amendment(s) that explain nothing this branch changed: test-kits/branch-identity.test.mjs" (F12) |
| `node scripts/refresh-author-handoff.mjs --check` | **75** | "no work package declares ownership.branch \"draft/wp-db00-150-prereq\"" (F12) |
| `node scripts/db/explain-harness.mjs --scale small` | **0** | 0 s; membership check and workspace list seq-scan their tiny tables (expected at 4 workspaces) |
| `node scripts/db/explain-harness.mjs --scale 0.2` (moderate), on a fresh migrate-clean of `fef718d` | **0** | §5; 22 s, rolled back |
| the same with `--fail-on-seq-scan` | **3** | the workspace list's seq scan on `workspaces` |
| `node scripts/db/explain-harness.mjs --scale full` | **1** | `could not extend file ...: No space left on device (53100)` (F1) |

## 4. Drifts as later migrations, per layer (the draft's; four re-run on this branch, §0.2)

Each drift was appended to `db/foundation/migrations/140_audit.sql`, in a private export of the tree, from a
saved copy (sha256 `2ac596bb950e…`). The file was restored byte for byte after every round, and the sha256 was
checked after each round and equals the saved one at the end. Each round ran on a fresh cluster with the shim:
`make db-schema-lint` (sl), `make db-migrate-clean` (mc), `make db-rls-smoke` (rs). "Before" is `1319042`,
extracted with `git archive`; "after" is `fef718d`.

| Id | Drift appended to 140 | Before sl / mc / rs | After sl / mc / rs | Named by (after; mc) |
|---|---|---|---|---|
| clean | nothing | 0 / 0 / 0 | 0 / 0 / 0 | — |
| D1 | `alter table app.performance_snapshots no force row level security;` (Q0 D30) | 0 / **0** / **0** | 0 / **2** / 0 | pinned shape: "app.performance_snapshots (rls true, forced false)" |
| D2 | `performance_snapshots_metrics_is_bounded` re-added as `<= 65536` | 0 / 0 / 2 | 0 / **2** / 2 | pinned shape (constraint missing/unlisted). Before: rls-smoke alone, because the 121 fixture's size probe was refused by the wrong constraint |
| D3 | `drop constraint usage_events_dedupe_key_unique` | 0 / 2 / 0 | 0 / 2 / 0 | before: post-migrate 061#1 ("declares three unique constraints ... holds 2"); after: also pinned shape |
| D4 | `performance_snapshots_scope_time_idx` rebuilt as `(workspace_id, metric_time)` | 0 / **0** / **0** | 0 / **2** / 0 | pinned shape (index missing/unlisted) |
| D5 | every home of `dimension` widened alike (quota_buckets, usage_events, usage_reservations) | 0 / **0** / **0** | 0 / **2** / 0 | vocabulary check; pinned shape (usage_events). The survey's "identical rewrite of every home" survivor, measured |
| D6 | `create policy probe_extra_read on app.published_posts for select ... using (app.is_active_member(workspace_id))` | 0 / **0** / **0** | 0 / **2** / 0 | policy set ("no pinned list names"); pinned shape |
| D7 | `research_sources_select_active_member` narrowed with `and source_uri <> ''` | 0 / **0** / **0** | 0 / **2** / 0 | policy set (row changed); index coverage ("app.research_sources.source_uri") |
| D8 | `approval_events_service_path_closed` opened (`using (true) with check (true)`) | 0 / 2 / 2 | 0 / 2 / 2 | before: post-migrate 092#1 and rls-smoke; after: also policy set |
| D9 | `drop index app.jobs_available_at_idx; drop index app.assets_library_keyset_idx;` | 0 / **0** / **0** | 0 / **2** / 0 | index coverage ("worker claim on app.jobs (available_at)", "library first page on app.assets (...)") |
| D10 | `notifications_channel_known` widened in one home | 0 / 2 / 0 | 0 / 2 / 0 | before: post-migrate 051#1 (homes differ); after: also vocabulary check |

**Per-layer verdict.** Before this draft, **D1, D4, D5, D6, D7 and D9 passed every layer**. Each now fails
migrate-clean by name. D2 was held by rls-smoke alone, and only by accident: a fixture's probe was refused by
the wrong constraint. D3, D8 and D10 were already held by a post-migrate block; they are now held twice.
Schema lint and rls-smoke are unchanged by this draft. In the "after" rounds a probe's as-built failure also
makes its own self-tests fail (an unrelated raise answers first). That is the existing executor's behaviour,
and migrate-clean still exits 2 naming the drift.

## 5. The EXPLAIN plans at a moderate scale (the draft's; re-run on this branch, §0.2)

Fixture `ws905Scaled(0.2)`: 100 workspaces, 10 businesses and 20 pages per workspace, 20,000 content items, 200,000
usage, audit and metric rows, plus 2,000 published posts, 5,000 calendar items, 2,000 assets and 1,000 jobs. It
was loaded, ANALYZEd and rolled back in 22 s. The plans are EXPLAIN estimates (no ANALYZE). The user is workspace
1's owner.

| Query | Run as | Seq scan | Index(es) | Sort |
|---|---|---|---|---|
| membership check (`workspace_member_role`'s body) | app_authz | none | `workspace_members_one_per_workspace` | — |
| workspace list | authenticated | **`workspaces`** | `workspace_members_user_id_status_idx` (the policy's EXISTS) | `w.name` |
| content first page | authenticated | none | `content_items_page_scope_idx` | **`created_at DESC, id DESC`** (no keyset index: IC-1) |
| calendar first page | authenticated | none | `calendar_items_date_idx`, `content_items_page_scope_idx` (narrowing) | `scheduled_local_date, id` |
| library first page | authenticated | none | `assets_library_keyset_idx` | — |
| worker claim | migration owner (F4) | none | `jobs_available_at_idx` | — |
| metrics per post | authenticated | none | `performance_snapshots_post_time_idx` + 4 narrowing joins | — |
| usage recompute | migration owner | none | `usage_events_bucket_recompute_idx` | — |
| audit first page | migration owner | none | `audit_logs_workspace_keyset_idx` | — |

At small scale (4 workspaces), the membership check and the workspace list both seq-scan their tiny tables. At
0.2, only the workspace list does: it reads `workspaces` (100 rows) whole and filters with the policy (F2).

## 6. Gaps and findings (the draft's text; owners in §6.1, the incident in §6.2)

- **F1 (incident, environment).** The full-scale harness run (1M rows ×3) filled the volume. At the failure
  `/System/Volumes/Data` had 129 MiB free; the cluster held 1.7 GB. psql reported `No space left on device`, the
  transaction rolled back, and the cluster was stopped and removed at once (1.9 GiB free after). After three
  0.2-scale runs on one cluster, free space fell to 176 MiB again (dead tuples and WAL), and the cluster was
  removed again. Another session writing to that volume in those windows could have failed. **The full WS:905
  scale was not measured here.** The README states the ~2 GB need. The harness has no free-space guard.
- **F2 (finding for batch 150).** The workspace list's plan seq-scans `app.workspaces` at 100 workspaces.
  WS:907's budget says no sequential scan for "workspace switch/list". The policy
  `workspaces_select_active_member` is read from `workspaces` outward (`lifecycle_state` plus an EXISTS on
  `workspace_members`), so the planner starts from the workspace table. Whether 100 rows is "a growing table" is
  for Q150-d. A query written from `workspace_members` would plan differently. Not changed here.
- **F3 (finding IC-1).** No index serves the content first page: `app.content_items` has no
  `(workspace_id, business_profile_id, created_at DESC, id DESC)`, and the plan sorts. Adding one is a migration
  (Q150-b). It is recorded in `db/foundation/lint/index-coverage.json` (`findings`, IC-1), not as a lookup.
- **F4.** No worker identity exists (RFC-2026-022 §7, DATA-DEC-03), so the worker claim, usage and audit plans
  run as the migration owner, which bypasses RLS. Their plans show no policy cost. The claim query orders by
  `available_at` only; no index is priority-aware, and `jobs` has no status column.
- **F5 (stated limit, IC-2 and IC-3).** Index-coverage rule 1 reads only the USING columns of a policy's own
  table. A helper's internal lookup (`workspace_member_role`, the member-scope helpers) and the parent lookups
  inside a narrowing's EXISTS are not computed. The helpers are declared as lookups; the parent lookups are
  served by scope keys today, but no rule reads them (`index-coverage.json`, findings IC-2 and IC-3).
- **F6 (stated limit).** The vocabulary selector reads `ARRAY['` and the single-column text equality. A vocabulary
  written as an OR of equalities, a regex or a domain is outside it, and the other 209 CHECKs are not pinned
  by text (`vocabulary-checks.json`, `_selector_limit`).
- **F7 (stated limit).** The pinned shapes pin no column: not type, NOT NULL, default or identity. On
  PostgreSQL 17, NOT NULL is not in `pg_constraint`. A rebuild of `performance_snapshots` that changed
  `id`'s identity or `metric_time`'s nullability passes rule 2. Pinning columns is owed with Q150-a.
- **F8 (stated limit).** The policy set's rule 1 reads policies. Whether RLS is enabled and forced on every
  other tenant table is held by the static lint on the committed snapshot and by rls-smoke, not here, except
  for the three shape tables.
- **F9.** The new probes compare PostgreSQL 17.11 deparse text. CI uses `postgres:17`; that it renders
  identically is inferred, as for rules 2 and 5 (README).
- **F10.** The scripts that turned the catalog reads into the four lint files are not in the repository, as with
  the batch 170 draft's F14. A later batch edits the JSON by hand or writes its own generator.
- **F11 (citation drift in the plan).** The plan cites `run.mjs:883-893` for the audit partition refusal; at
  `1319042` it is `run.mjs:1116-1125`. It cites `run.mjs:607-611` for `PINNED_CHECKS`; that is `run.mjs:837`.
  The batch 170 draft's F12 already noted the second. These citations read as the plan says: WS:575, 905-910;
  ERD:109, 280, 289-290; WP:432, :438; survey §6 at `:317-335`; `psql-driver.mjs:152` (`ON_ERROR_STOP=1`);
  `run.mjs:80-85` (FK support).
- **F12 (packaging, not done by instruction).** The manifest's `ownership.branch` names batch 129's branch.
  `check:scope` exits 74 and `check:handoff` exits 75 on this branch. Whoever packages the batch updates the
  slot, the rationale and the branch-identity slot, and writes the handoff. This branch is stacked on the
  unreviewed batch 170 draft: a change there moves this draft's floors, digests and integrity manifest.
- **F13 (CI).** The harness is not a make target and not in `.github/workflows/ci.yml`. CI is protected, so
  running it there is the Integration Owner's to add. The four new probes do run in CI, because CI already runs
  `make db-migrate-clean`.
- **F14 (fixture realism).** The fixture is uniform: round-robin workspaces and businesses, no skew, no deleted
  share beyond 2% of content. Plans on real distributions may differ. It is synthetic by construction.

### 6.1 Each finding's owner and where it is held

| Finding | Owner | Held on |
|---|---|---|
| F1, the disk incident | A0 (a free-space guard, if the full scale is to be run) | §6.2, an incident note; `open_blockers[194]` (12) |
| F2, the workspace list seq-scans `app.workspaces` (against WS:907) | batch 150's author, under Q150-d | `open_blockers[194]` (1) |
| F3 = IC-1, no index serves the content first page | batch 150's author, under Q150-b | `open_blockers[194]` (2); `index-coverage.json` `findings` |
| F4, no worker identity, so the worker plans run as the owner | DATA-DEC-03 and the worker RFC | `open_blockers[113]`, cross-referenced from `[194]` (3) |
| F5 = IC-2 and IC-3, rule 1 reads own-table USING columns only | A0 | `open_blockers[194]` (5); `index-coverage.json` `findings` |
| F6, the vocabulary selector misses OR, regex and domain vocabularies | A0 | `open_blockers[194]` (6) |
| F7, the shape pins cover no column | A0, with Q150-a | `open_blockers[194]` (4) and `[179]` |
| F8, the policy set reads policies, not RLS flags | A0 | `open_blockers[194]` (7) |
| F9, deparse text on 17.11 against CI's postgres:17 | INFO | `open_blockers[194]` (10) |
| F10, the lint files' generators are not in the repository | A0 | `open_blockers[194]` (8) |
| F11, citation drift in the phase plan | A0 | A record, not a debt. The phase plan cites `run.mjs:883-893` and `:607-611`. On this branch the audit partition refusal is at `run.mjs:1116` and `PINNED_CHECKS` at `:837`. |
| F12, packaging | A0 | closed by `9d57cda` (§0) |
| F13, the harness is not in CI | the Integration Owner (CI is protected) | `open_blockers[194]` (9) |
| F14, the fixture is uniform | batch 150's author | `open_blockers[194]` (11) |
| survey §6 items 5-7 | A0 | closed here; recorded on `open_blockers[185]` |
| `performance_snapshots`' key | the Owner (Q150-a) | `open_blockers[179]`, extended |

### 6.2 Incident note: the draft's full-scale run filled the disk (F1)

- **What happened.** The draft ran `explain-harness.mjs --scale full` (1M usage, audit and metric rows) on
  its own cluster. Free space on `/System/Volumes/Data` fell to 129 MiB. PostgreSQL failed with `could
  not extend file ...: No space left on device (53100)`, and the transaction rolled back.
- **Response.** The cluster was stopped and removed at once. Later, three 0.2-scale runs on one cluster
  brought free space down to 176 MiB again (dead tuples and WAL), and that cluster was removed too.
- **Exposure.** Any other session writing to that volume in those windows could have failed. None is
  known to have.
- **Consequence.** The full WS:905 scale has **not** been measured. The README states the ~2 GB need,
  and the harness has no free-space guard.
- **On this branch.** The harness ran only at small and 0.2 scale, on a fresh cluster each round,
  removed afterwards. The volume held 11 GiB free throughout.

## 7. Decisions not taken (the plan's Q-ids): UNANSWERED

| Q-id | Owner | Question | A0's recommendation (the phase plan's) | Status |
|---|---|---|---|---|
| Q150-a | Owner | Change `performance_snapshots`' primary key to `(id, metric_time)` now, while the table is empty and applied nowhere, without declaring partitioning? | **Yes**, as a small forward migration once the item-5 pins exist (they now do). Later partitioning becomes "create a parent and ATTACH this table", with no rewrite. It reverses the "id alone" answer to question C. The pinned shape probe holds today's `PRIMARY KEY (id)` by text, so the change rewrites `pinned-shapes.json` in the same diff. | **UNANSWERED** |
| Q150-b | Owner | Defer `partition by` and all production index work until a production-like fixture and an SLO exist? | **Yes.** The 150 migration waits; the fixture, harness and probes land now. No index is added here, and IC-1 stays a finding. | **UNANSWERED** |
| Q150-c | Owner / A0 | Who owns 150, and in which range? | **A0 authors, A1 reviews, number 150**, with a recorded one-time exception to MOD-120's range for the rebuild. | **UNANSWERED** |
| Q150-d | Product / Ops | Set the p95 DB-time SLO per query class. | **Draft values from the first fixture run, then the Owner ratifies them.** The harness asserts no timing; §5 is a plan summary, not a budget. | **UNANSWERED** |

## 8. What is not done

- No migration, policy, index or grant: each would take Q150-a or Q150-b.
- The harness is not a make target and is not in `.github/workflows/ci.yml`. CI is protected, so adding
  it needs the Integration Owner (F13). The four new probes do run in CI, through `make db-migrate-clean`.
- The full WS:905 scale is not measured (§6.2).
- The generators behind the four lint files are not in the repository (F10).
- The role runs (C0, Q0, A1) follow this commit. Nothing here is reviewed, tested by an independent role
  or approved.

## 9. Cleanup

The cluster on 127.0.0.1:5507 was stopped and its data directory removed after every round, and again
at the end. Port 5507 is free. Ports 5432 and 5499, and every other run's port, were not touched.
`140_audit.sql` is byte-identical to main's. The draft's own cleanup (port 5509, its exports) is its
record, kept below.

### 9.1 The draft's cleanup note

The cluster on 127.0.0.1:5509 was stopped and its data directory removed after each use, and at the end.
Port 5509 is free, and no other port was touched. The private exports (`base`, `wt`) were removed. In every
round's tree, `140_audit.sql` is byte-identical to its saved copy.
