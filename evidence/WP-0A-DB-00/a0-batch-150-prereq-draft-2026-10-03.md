# A0 draft record: batch 150, the part that needs no decision

- **Package:** `WP-0A-DB-00`. **Author:** `/claude/a0_atlas`, written by a drafting subagent of that run.
- **Branch:** local `draft/wp-db00-150-prereq`, made at `1319042` (the head of the batch 170 draft,
  `draft/wp-db00-170-assert`, itself stacked on `999456d`). Nothing is pushed.
- **Commits:** `fef718d` (code, lint data, fixture, harness, tests, README, floor, integrity manifest), then
  this record.
- **Status:** a draft, written and measured by the Author's subagent. It is not reviewed, not tested by an
  independent role and not approved. The manifest's branch slot and rationale, the branch-identity slot, the
  handoff and the blocker texts are untouched, as instructed (F12).
- **Brief:** the phase plan `phase-plan-141-170.md`, "Batch 150 — Can do now": (a) close weak-assertion
  survey §6 items 5-7 as `run.mjs` probes; (b) an index-coverage probe for RLS-predicate and keyset cursor
  columns; (c) a WS:905 fixture generator and an EXPLAIN harness that is not in CI.

**No migration.** Q150-a, Q150-b, Q150-c and Q150-d are left undecided (§7).

## 1. Item → file → rule and test

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

## 2. How the data was measured

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

## 3. Commands and exit codes

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

## 4. Drifts as later migrations, per layer

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

## 5. The EXPLAIN plans at a moderate scale

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

## 6. Gaps and findings

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

## 7. Decisions not taken (the plan's Q-ids)

- **Q150-a (Owner):** change `performance_snapshots`' primary key to `(id, metric_time)` now, without declaring
  partitioning. Not taken. The pinned shape probe holds today's `PRIMARY KEY (id)` by text, so the change, if
  made, rewrites `pinned-shapes.json` in the same diff.
- **Q150-b (Owner):** defer `partition by` and all production index work until a production-like fixture and an
  SLO exist. Not taken. No index is added; the content first-page gap is a finding (F3).
- **Q150-c (Owner/A0):** who owns 150, and in which range. Not taken.
- **Q150-d (Product/Ops):** the p95 DB-time SLO per query class. Not taken. The harness asserts no timing; §5 is
  a plan summary, not a budget.

## 8. Cleanup

The cluster on 127.0.0.1:5509 was stopped and its data directory removed after each use, and at the end.
Port 5509 is free, and no other port was touched. The private exports (`base`, `wt`) were removed. In every
round's tree, `140_audit.sql` is byte-identical to its saved copy.
