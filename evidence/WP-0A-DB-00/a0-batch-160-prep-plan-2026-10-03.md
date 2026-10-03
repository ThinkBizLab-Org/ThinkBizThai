# Batch 160 preparation: plan, item to change to test, measured

**Package:** `WP-0A-DB-00`. **Branch:** `agent/claude/WP-0A-DB-00-batch-160-prep`, cut from main
`c7fe264` (PR #169, batch 141 prep, merged by A0 at its reviewed head `4d1f10c` under the Owner's
standing delegation, `product-owner-disposition-2026-10-03-batch-127.md` §6).

Written 2026-10-03 by a subagent of the Author run `/claude/a0_atlas`. It is the Author's record. It
approves nothing, decides none of the plan's Q-ids, and adds **no migration, no policy, no grant and no
retention number**. Gate: pre-G0 (CONTRIBUTING_AGENTS.md:23). Its disposition is
`product-owner-disposition-2026-10-03-batch-160-prep.md` in this directory.

This file began as the draft record `a0-batch-160-prep-draft-2026-10-03.md` (`1eb29fc` on the local
branch `draft/wp-db00-160-prep`, cut at `75c9274`) and was moved here with `git mv`. Sections 0, 0.1,
4 (the owner column) and 7 are new; §1, §2, §3 and §6 are the draft's, kept as measured at `75c9274`,
with what this branch re-measured stated in §0.1. Source: the phase plan for 141–170
(`a0-phase-plan-141-170-2026-10-03.md`), "Batch 160 — 3. Can do now" (its lines 156-167 on this
tree; the draft cited 129-140, which were the lines of the scratchpad copy). The Owner ended the
hardening chain at 129 and told A0 to do everything that needs no pending decision.

## 0. Commits on this branch

| commit | what |
|---|---|
| `60105df` | the draft's `9dd168e`, cherry-picked. Four conflicts, each because main had moved since `75c9274` (batch 129 and 141 prep): `scripts/test-suite-contract.mjs` (141 prep had moved the same test floor, assertion floor and name digest), `test-kits/db/foundation-contract.test.mjs` (141 prep's four tests and the draft's three were both appended at the end; kept side by side, 141 prep's first, no helper name collides), `evidence/VERIFICATION.md` and `test-kits/integrity-manifest.json`. Resolved by keeping main's text and taking the guard's own count (§0.1), then `npm run record:verification` and `npm run regenerate:manifest`. |
| `8f935a5` | the draft's `1eb29fc` (its post-commit measurements), cherry-picked without conflict. |
| `159d43b` | packaging: branch slot, increment rationale, blockers 4, 77, 91, 105, 148, 150, 190 extended and 192 new, the retention map's `WP:` citations moved to this tree's lines, the integrity manifest. |
| next | this plan (moved from the draft record) and the disposition. |
| last, alone | `npm run refresh:handoff`, then the handoff's text fields. |
| review round (§8) | the three reviews cherry-picked (`1c8b0e4`, `886b1a4`, `6e41fc8`); the fixes (tests, data, blockers, floor 720 → 747, integrity manifest); this record and the disposition; then the handoff, last and alone. |

### 0.1 Floors, digests, manifest, verification record, and what was measured here

- `scripts/test-suite-contract.mjs`, read through the guard's own `stripNonCode` and
  `countDeclaredTests` (scratch `a0-160-prepr/count160.mjs`): main `c7fe264` declares **77** tests
  and makes **633** assertions in `foundation-contract.test.mjs`; this branch declares **80** and makes
  **720**. So the test floor moves 77 -> 80, the assertion floor 633 -> 720 (+87, the same 87 the draft
  added on its base, 500 -> 587), and the name digest `a91ced9f62276ebe` -> `8c35e631c28c0574`. The
  draft's 76 / 587 / `5f91e64b5e43af7d` were its base's and are not used.
- `evidence/VERIFICATION.md`: 681 -> **684**, written by `npm run record:verification`. Declared in
  `amends_without_owning` (the draft's P3).
- `test-kits/integrity-manifest.json`: regenerated, 88 digests.
- No migration, CI file, isolation case or fixture SQL changed between `75c9274` and `c7fe264`
  (`git diff --stat 75c9274 c7fe264 -- db docs contract-catalog` touches only `db/foundation/README.md`,
  `audit-coverage-map.json` and `service-policy-map.json`), so the three new tests' re-derivation from
  the migration text reads the same 66 tables, 90 keys, 216 UPDATE pairs and 269 indexes the draft
  measured live; `node --test test-kits/db/foundation-contract.test.mjs` on this branch: 80 pass.
- The retention map's six `WP:<line>` citations were measured at `75c9274`. 141 prep declared
  `evidence/VERIFICATION.md`, which added a line above `open_blockers`, so each moved +1
  (`open_blockers[i]` is on line 254+i). They now read `WP:258 (open_blockers[4])`, `WP:331 ([77])`,
  `WP:345 ([91])`, `WP:359 ([105])`, `WP:374 ([120])` and `WP:404 ([150])`, and each finding's
  `source` also names the blocker that owes it (§4). This packaging leaves the path list unchanged, so
  no line above `open_blockers` moves and 141 prep's pinned blocker lines hold.

## 1. Item → file → test that holds it

All three tests are in `test-kits/db/foundation-contract.test.mjs`, an existing suite file, at lines
3791, 3918 and 3970 on this branch (after 141 prep's four). The suite list is unchanged.

| Plan item | File | Test (name) |
|---|---|---|
| (a) Retention map, one row per table | `db/foundation/lint/retention-map.json` | `the retention map has one row per table, every class is one §10 defines and §5 reaches or a finding, and every blocking control it names holds in the migrations` |
| (b) §11.1 export manifest fixture | `test-kits/db/export-manifest.fixture.json` | `the §11.1 export manifest fixture never carries an excluded class, every table is in the retention map, and its checksums recompute` |
| (c) §11.4 purge order from the FKs | `db/foundation/lint/purge-order.json` | `the §11.4 purge order is a topological order of the foreign keys the migrations create, children first, covering every table` |
| (d) Anonymisation route design note | this file, §6 | none; it is a note, not a rule |
| (e) Packaging: the branch slot and the increment rationale naming every file amended outside ownership | `work-packages/WP-0A-DB-00.json` (`ownership.branch`, `amends_without_owning`), `test-kits/branch-identity.test.mjs` | `npm run check:handoff`, `node scripts/verify-branch-scope.mjs`, `branch-identity.test.mjs` |
| (f) Every finding owed with a named owner or cross-referenced to the blocker that already holds it (§4) | `open_blockers[4]`, `[77]`, `[91]`, `[105]`, `[148]`, `[150]`, `[190]` extended; `open_blockers[192]` new, appended at the end; each map finding's `source` names its blocker | the retention-map test (each finding is recorded; no row carries a number); 141 prep's pinned-line test still passes, because nothing above `open_blockers` moved |

What each test holds:

- **(a)** Each check below runs against data the test re-derives from the migration text on every run.
  - The rows are exactly the tables `tablesCreatedByMigrations()` returns (66), with no duplicate and
    no unknown table.
  - `section10_classes` is §10's 27 classes, parsed from ERD:488-514, in §10's order. Each class
    carries its row number, its line, and its final behaviour verbatim.
  - Each row's `section5` cells are verbatim from the §5 line it names (ERD:198-219).
  - Each `section9_classes` entry is picked from §5's sensitivity cell for that row.
  - A `defined` class must be one §10 defines **and one §5's retention cell reaches**, either equal to
    a token or matched by a `X-*` glob. Anything else must be a `finding` row: no class, no row
    number, no behaviour, and a finding whose `class_as_written` is §5's cell.
  - **No row may contain a retention number**: a digit followed by day, month or year, in English or
    Thai. *As first committed this held for English only: `\b` after a Thai unit never matches (C0 G1,
    A1 S1, Q0-F1). Since the review round (§8) the guard reads hour, day, week, month and year in
    English and ชั่วโมง, วัน, สัปดาห์, เดือน and ปี in Thai, with or without a space or hyphen, tests
    itself on §10's own forms, and refuses any numeric field of a row except its §5 line.*
  - Sweep columns exist. `covered_by` equals the indexes, re-derived from the text, whose leading
    columns cover the key.
  - Every anonymise column exists, and is held by exactly one named control.
  - Each control kind is checked against the text:
    - `no-delete-grant`: no DELETE, TRUNCATE or ALL grant on the table.
    - `no-update-grant`: no role holds UPDATE on the column.
    - `client-only-update`: only `authenticated` holds it.
    - `grant-without-policy`: the role holds it and no policy admits that role.
    - `trigger`: `create trigger <name> … on <table> … execute function <fn>(`, and `<fn>` is created.
    - `no-schema-usage`: no USAGE grant on `private`.
  - Every `refuse_mutation` trigger in the text must be named on its row.
  - `controls_on_every_row` holds:
    - no policy names `app_worker`, `app_maintenance`, `app_command` or `service_role`;
    - nothing is granted to `app_maintenance`;
    - no hold table exists.
  - The §10 classes no row uses equal `section10_classes_without_a_row`, and each has a reason.
- **(b)** The manifest fields from §11.1/6 and the requested-scope snapshot from §11.1/3 are present,
  with the fixture catalog's `workspace_a` and `user_owner_a` uuid5 ids.
  - Each file checksum is recomputed from the stated synthetic recipe, and so is the package checksum.
  - Each table, included or omitted, is a retention-map row, and the two lists partition the map
    exactly.
  - The five §11.1/5 exclusions are found by a property of the **map**, not by the fixture's own lists
    (*that property is a per-row pick; since the review round, §8, a class §5's cell carries and the row
    does not pick carries a reason, and an exported table with one is exported only by a recorded
    `export_allowed` judgement*):
    - SECRET-4 and SECURITY-4 by `section9_classes`;
    - INTERNAL-3 for internal job;
    - `/webhook/` in the table name for raw webhook;
    - class `RESEARCH-SNAPSHOT` for research snapshot.
  - Each exclusion must match at least one table, and no table it matches is included.
  - Ten tables are also named outright, and nothing in `private` is exported.
- **(c)** The declared edges, as a multiset, equal the FK edges parsed from the migration text.
  - The order covers every table exactly once, with `app.workspaces` last.
  - In every edge, the child comes before the parent. The two exceptions are self-references and the
    one declared cycle break. That break must be a declared key whose reverse key exists.
  - The self-references are exactly the self-edges.
  - The `retention_conflicts` recompute from the map: a child §10 keeps (retain, no purge) under a
    parent §10 purges.

**Mutation check (scratch `a0-160p/mutate.mjs`)**: 27 mutations in total, each applied, run against the
three tests, then restored. Every one turned the run red. Baseline after the restore: green. The
mutations:

- PUSH-SECRET given to push refs as `defined`;
- a number in a finding row;
- a row removed, duplicated, or added for an unknown table;
- a false or missing `covered_by`;
- a missing function;
- an unnamed refusal trigger;
- a wrong control kind;
- an anonymise column with no control;
- a paraphrased §10 cell;
- an invented decision id;
- appended to `140_audit.sql`: a DELETE grant, a policy for `app_worker`, a new FK, a new index;
- in the purge order: parent before child, a missing table, a dropped edge, a hidden conflict, a fake
  cycle break;
- in the export: a credential table included, security events included, an altered checksum, an
  unknown table, a table missing from both lists.

## 2. Measured, and how the static tests know they still hold

A private PostgreSQL 17.11 (Homebrew) instance ran on `127.0.0.1:5511`:

- set up with `initdb --locale=C -A trust -U postgres` and `LC_ALL=C`;
- TCP only (`-c unix_socket_directories=''`);
- `db/foundation/ci/supabase-shim.sql` applied first;
- a fresh initdb for every round;
- Node `v24.20.0`, checked before every measured command.

The database layers ran on a `git archive` export of the tree, kept in the private directory. A
read-only catalog query (`a0-160p/catalog.sql`) measured:

- **66 tables** in `app` and `private`, no views; RLS enabled and forced on all 66.
- **90 foreign keys** over **87 distinct edges**. All 90 are NO ACTION, none is deferrable, and none
  points outside `app` or `private`.
  - Two keys are self-references: `asset_versions_parent_scope_fk` and `content_versions_parent_scope_fk`.
  - There is one cycle: `app.assets` ↔ `app.asset_versions`, through `assets_current_version_scope_fk`.
- **No role other than the superuser owner holds DELETE or TRUNCATE on any of the 66 tables.**
- **216 role:column UPDATE privileges.** Only `authenticated` and `app_worker` hold any.
- **No policy names `app_worker`, `app_maintenance`, `app_command` or `service_role`.** The 26
  `*_service_path_closed` policies are RESTRICTIVE, and the only non-`authenticated` permissive policy
  is `app_authz`'s SELECT. No service role has USAGE on `private`.
- **269 indexes.** 126 of them come from `create index`; the other 143 are constraint-backed.
- **51 non-internal triggers.** `refuse_mutation` and `refuse_truncate` sit on `audit_logs` and
  `security_events`, and `set_decided_at` sits on `approval_requests`.

The text parsers that the tests use were compared against that read, using the scratch scripts
`fktext.mjs`, `granttext.mjs` and `idxtext.mjs`. They agree exactly:

- FK edges: 87 distinct edges and 90 keys, with identical per-edge counts.
- UPDATE pairs: 216 = 216, with nothing only in one side. No DELETE or TRUNCATE grant appears in the
  text.
- Indexes: all 269 by name and leading column.

The static tests therefore read the same thing the catalog showed, without a database.

## 3. Commands and exit codes (the draft, at `75c9274`)

This section is the draft's, kept as measured. What this branch measured is §3.2.

| Command | Exit | Output |
|---|---|---|
| `make db-migrate-clean` (round 1, export of `75c9274`, used for the measurement) | **0** | "db-migrate-clean: ok"; post-migrate pass 49 apply-time blocks, 37 re-run as written, 12 superseded and replaced |
| `node --test --test-name-pattern=… test-kits/db/foundation-contract.test.mjs` (the three new tests) | **0** | 3 pass |
| `node a0-160p/mutate.mjs` | **0** | 27 of 27 mutations red; baseline green after restore |
| `node scripts/verify-test-coverage-floor.mjs` (after the floors and the manifest) | **0** | silent |
| `npm run check` (first) | **89** | tests 680, pass 680, fail 0; refused only because `evidence/VERIFICATION.md` was 677's record |
| `npm run record:verification` | **0** | "recorded 680 passing, 0 skipped, 0 todo" |
| `npm run check` (after) | see §3.1 | |
| `make db-migrate-clean` and `make db-rls-smoke` (round 2, on an export of this branch's commit) | see §3.1 | |

The floors moved to the guard's own count, read through the guard's `stripNonCode` and
`countDeclaredTests`:

- `foundation-contract` test floor: 73 → **76**.
- Assertion floor: 500 → **587**.
- Name digest: `c125bbd792fa8a92` → `5f91e64b5e43af7d`.
- `test-kits/integrity-manifest.json` is regenerated (88 digests).

### 3.1 After the commit

These were measured on the local branch `draft/wp-db00-160-prep` at `9dd168e`, by name, not on a
detached HEAD.

| Command | Exit | Output |
|---|---|---|
| `node scripts/commit-when-clean.mjs` (`9dd168e`) | **0** | "clean: exit 0 — tests 680, pass 680, fail 0". The first attempt exited **86**: `evidence/VERIFICATION.md` had changed after the manifest was regenerated. The manifest was regenerated again before the commit. |
| `npm run check` | **0** | tests 680, pass 680, fail 0 |
| `npm run verify` | **0** | "clean: exit 0 — tests 680, pass 680, fail 0, skipped 0, todo 0" |
| `node scripts/verify-branch-scope.mjs 75c9274 WP-0A-DB-00` | **73** | "changed 1 path(s) it neither owns nor records as an amendment: evidence/VERIFICATION.md". This is expected (P3): the manifest is not edited in this draft. |
| `npm run check:handoff` | **75** | "no work package declares ownership.branch \"draft/wp-db00-160-prep\"". This is expected: the branch slot and the handoff are not edited in this draft. |
| `make db-migrate-clean` (round 2, fresh initdb, export of `9dd168e`) | **0** | "db-migrate-clean: ok"; post-migrate pass 49 / 37 / 12 |
| `make db-rls-smoke`, then again on the same database | **0**, **0** | "1079 isolation case(s) passed", both times; "db-authz-proofs: ok — 6 claim(s) discharged by execution" |

After the round, the cluster on 5511 was stopped and its data directory removed. Nothing is listening
on 5511 (`lsof` exit 1). Ports 5432 and 5499 were not touched.

Two layers did not read this draft's files: the database layers and `db-schema-lint`. Both read their
lint inputs by name, and the catalog snapshot digests only `migrations/*.sql`. Round 2 was run anyway,
to show that nothing they read changed.

### 3.2 On this branch

Node `v24.20.0` (`node -v` before every measured run; `/Users/bank/.local/node-v24.20.0/bin/node` is
first on PATH, and the Homebrew Node was not used).

| command | at | exit | result |
|---|---|---|---|
| `node --test test-kits/db/foundation-contract.test.mjs` | the resolved cherry-pick | **0** | tests 80, pass 80 |
| `npm run record:verification` | the resolved cherry-pick | **0** | "recorded 684 passing, 0 skipped, 0 todo" |
| `npm run check` | `159d43b`'s tree, before the handoff refresh | **1** | tests 684, pass 682, fail 2. Both failures are the handoff guard: `the handoff for this branch describes this branch` and the ratchet test that runs the same suite on an unmodified copy (`ratchets-bite.test.mjs:393`). Expected until the last commit refreshes the handoff. |
| `node scripts/commit-when-clean.mjs` (packaging commit) | `159d43b` | **1** | refused, `NOT clean: exit 1 — tests 684, pass 682, fail 2`, the same two handoff tests. `159d43b` was therefore a plain commit, because the sole red was the not-yet-refreshed handoff guard. `60105df` and `8f935a5` are cherry-picks. |
| `node scripts/verify-branch-scope.mjs c7fe264 WP-0A-DB-00` | `159d43b` | **0** | `all 10 changed path(s) are declared, and every amendment explains one`. Before the branch-identity edit was committed it exited **74** (`declares 1 amendment(s) that explain nothing this branch changed: test-kits/branch-identity.test.mjs`), which is the guard working. |
| `make db-schema-lint` | static, no database | **0** | `db-schema-lint: ok` |
| `make db-contract-check` | static | **0** | `db-contract-check: ok` |
| `make db-migrate-clean`, `make db-rls-smoke` | not run | n/a | No input any database layer reads changed between the draft's round 2 (`9dd168e`: migrate-clean 0, rls-smoke 0 twice, 1079 cases) and this branch: no migration, invariant, fixture SQL, isolation case or CI file, and `scripts/db/run.mjs` reads its lint inputs by name (`catalog-snapshot.json`, `rls-exemption-register.json`, `service-policy-map.json`), never the three new files. No cluster was started on 5507, so none was left to remove. |
| `npm run check`, `npm run check:handoff`, `npm run verify` | after the handoff refresh, on the branch name | | recorded in the handoff and the PR, not here, because this file is committed before that commit. |

## 4. Findings (each one recorded, none resolved), and where each is owed

The map carries F160-01 to F160-16 as data (`findings`). Each finding's source line is in the file and
was verified by reading it.

Line citations in the "Where" column are the draft's, at `75c9274`; on this tree each `WP:` line is one
higher (§0.1). The owner column is new: each finding is owed on the blocker named, by name.

| Id | Finding | Where | Owed to |
|---|---|---|---|
| F160-01 | §5 gives connector.meta `CONNECTION-HISTORY`, and §10 does not define it. This covers 3 tables: `meta_connections`, `social_accounts` and `private.meta_credential_references`. | ERD:211; WP:257 | `open_blockers[4]` (extended): **Q160-c** (A1 Data), then Q160-a |
| F160-02 | §5 gives industry.core `CATALOG/HISTORY`. §10 does not define `CATALOG`. `HISTORY` cannot describe global catalog rows, nor a mutable business assignment. 3 tables. | ERD:204, :490; WP:330 | `open_blockers[77]` (extended): **Q160-c** (A1 Data), then Q160-a |
| F160-03 | §5's glob `NOTIFICATION-*` does not reach `PUSH-SECRET`. **PUSH-SECRET is defined** (§10 row 21); the gap is in the assignment. | ERD:215, :508; WP:344 | `open_blockers[91]` (extended): **Q160-c** (A1 Data) |
| F160-04 | The glob reaches only `NOTIFICATION-INBOX` ("user notifications"). No class describes a preference row. | ERD:215, :507 | `open_blockers[192]` (1): **A1 Data**, under Q160-c widened (P2) |
| F160-05 | `LEDGER` is undefined. §10 has `OUTBOX-SHORT` and `CONSUMER-LEDGER`, and §5 names neither (`outbox_events`, `consumer_ledger`). | ERD:214, :505-506; 050_async_kernel.sql:373-379 | `open_blockers[192]` (2): **A1 Data**, under Q160-c widened; A0 Kernel (050) consumes; 050's LEDGER report is in `[4]` |
| F160-06 | The glob `AI-RUN-*` matches no §10 class literally. No generation-run table exists, and nothing covers the model registry, the policy or the credential ref. | ERD:216, :509-510; 060_ai_gateway.sql:162-170 | `open_blockers[192]` (3): **A1 Data**, under Q160-c widened; A3 (060) consumes |
| F160-07 | The glob `ASSET-*` does not reach `RIGHTS-PROOF`, although batch 100 reads it as doing so. No class describes `content_asset_links`. | ERD:210, :498-501; 100_asset.sql:421-423 | `open_blockers[192]` (4): **A1 Data**, under Q160-c widened; A4 (100) consumes; the sweep writer is `[155]` |
| F160-08 | The two sections disagree about `billing_webhook_receipts`. §5 says FINANCE-HISTORY, while §10's `WEBHOOK-SHORT` data column names the "payment webhook inbox" (batch 131 used WEBHOOK-SHORT). | ERD:218, :502; WP:358 | `open_blockers[105]` (extended): **A1 Data** (Q160-c widened) with BILL-OQ-10's owner |
| F160-09 | `app.workspaces` has no timestamp for entering a lifecycle state, so DATA-DEC-04's 30-day window has nothing to be measured from. | 010_identity.sql:156-157 | `open_blockers[192]` (6): **DATA-DEC-04** (Product+Security) for the window, **A1 Identity** for the column |
| F160-10 | `app.jobs` has no terminal-state column or time, so JOB-SHORT's success/failure split is unsweepable. No attempts or DLQ table exists. | ERD:504 | `open_blockers[192]` (7): **A0 Kernel** (050), then Q160-a |
| F160-11 | SCHEDULE-HISTORY runs "after final state", and neither schedule table records when that state was reached. | ERD:497; 091_calendar.sql:59 | `open_blockers[190]` (extended): **A5** with A1 (batch 160), then Q160-a |
| F160-12 | RESEARCH-RUN runs "after last use", and the run has no last-use column. | ERD:493; 070_research.sql:478 | `open_blockers[192]` (8): **A2 Research** with A1, then Q160-a |
| F160-13 | **13 sweep keys have no covering index.** See the list below the table. | measured | `open_blockers[192]` (9): **A1** (batch 160), each index a forward migration in its family's range |
| F160-14 | **12 retention conflicts.** A kept child holds a NO ACTION key to a purged parent. See the list below the table. | measured; ERD:589-600 | `open_blockers[192]` (10): **Q160-a** with **DATA-DEC-04/05** (A1 + Owner) |
| F160-15 | The `assets` ↔ `asset_versions` cycle can only be broken by nulling `assets.current_version_id`. Only `app_worker` holds that grant, and no policy admits it. | measured | `open_blockers[192]` (11): **DATA-DEC-03** (A0+A1) and **Q160-d**; the actor gap is `[2]` |
| F160-16 | §10 `HISTORY`'s data column names knowledge and content versions, which §5 files under `CONTENT-HISTORY`. Both purge, so no behaviour changes today. | ERD:490, :495, :205, :207 | `open_blockers[192]` (5): **A1 Data**, under Q160-c widened |
| F160-17 (review round, C0 G2) | §5 gives `workspace_invitations` `TOKEN-SHORT` (purge), while §10 `AUTH-HISTORY`'s data column names "invitations history" (anonymise and retain). **The two disagree on the final behaviour.** The row keeps TOKEN-SHORT with an `also_claimed_by` pair. | ERD:201, :491, :492 | `open_blockers[192]` (13): **A1 Data**, under Q160-c widened |

F160-13 and F160-14 as the review round left them: F160-13 has two more keys, covered only by a partial
index whose predicate excludes the rows the sweep reads (`workspace_invitations.expires_at`, pending only;
`billing_webhook_receipts.received_at`, unprocessed only; C0 G6), so fifteen in all. F160-14's twelve is a
lower bound, because finding rows carry no behaviour and 21 non-self keys touch one (C0 N1).

The 13 uncovered sweep keys (F160-13):

- `audit_logs.occurred_at`
- `security_events.occurred_at`
- `usage_events.occurred_at`
- `quota_buckets.period_end`
- `billing_invoices.issued_at`
- `billing_payments.occurred_at`
- `billing_subscriptions.current_period_end`
- `billing_webhook_receipts.processed_at` and `.dead_lettered_at`
- `outbox_events.dispatched_at`
- `performance_snapshots.metric_time`
- `research_runs.completed_at`
- `user_profiles.deleted_at`

The 12 retention conflicts (F160-14):

- `billing_subscriptions`, `quota_buckets`, `usage_reservations` and `workspace_members` → `workspaces`.
  **The tenant root cannot be hard-deleted while FINANCE-HISTORY or AUTH-HISTORY rows exist.**
- `approval_requests` → `content_items` and `content_versions`.
- `approval_policies` → business and page.
- `workspace_member_scopes` → business and page.
- `quota_buckets` and `usage_reservations` → `business_profiles`.

Findings about the plan and the process:

- **P1. The plan's citations drift, and its list of undefined classes names two defined ones.**
  - "ERD:850 checklist" is ERD:852. ERD:850 is the RLS-matrix item.
  - `WEBHOOK-SHORT` and `PUSH-SECRET` are **defined** in §10 (ERD:502, :508; WP:257 says so in terms).
    For PUSH-SECRET the gap is §5's assignment, and for WEBHOOK-SHORT it is the billing receipt. The
    phase plan's list is headed "Undefined **or mismatched**" (its line 149), and both are mismatches,
    so the listing is not wrong; this item first said it was (C0 G9).
  - All other cited lines checked (ERD:279-282, 484, 526, 532-555, 571-600, 867-873; WS:576; DR:111,
    353; WP:255, 257, 266, 267, 274, 284, 330, 344, 358, 373, 401, 403; 010_identity.sql:156-157)
    were read and match.
- **P2. Q160-c is narrower than the findings.** It names CONNECTION-HISTORY, CATALOG and the
  NOTIFICATION-*/PUSH-SECRET glob. F160-04 to F160-08 and F160-16 have no Q-id in the plan, so their
  rows carry no decision id rather than one stretched to fit. A1 Data needs them added to Q160-c, or
  needs a new id. **Packaged:** held in `open_blockers[192]` (1)-(5) and `[105]`, owed to A1 Data;
  A0 recommends widening Q160-c (disposition §5).
- **P3. Scope declaration.** The draft amends three paths that need a rationale for this branch:
  - `scripts/test-suite-contract.mjs` (floors and digest) and `test-kits/integrity-manifest.json`
    (regenerated) are listed in `amends_without_owning`, but the rationale there describes batch 128.
  - `evidence/VERIFICATION.md` (680) is not declared at all. Batch 128 dropped it because it added
    no test.
  - By instruction, the manifest's branch slot and rationale are **not** edited, so
    `verify-branch-scope` is expected to refuse until the packaging step writes them.
  - It was measured in §3.1. `verify-branch-scope` exits **73**, naming `evidence/VERIFICATION.md`.
    It does not object to the other two paths, because they are listed, even though the rationale
    under them is batch 128's. A reviewer should read that as a gap in the guard: it checks that a
    path is listed, not that the rationale describes this branch.
  - **Packaged:** the slot and the rationale are written (`159d43b`), `evidence/VERIFICATION.md` is
    declared, and `verify-branch-scope` exits 0 (§3.2). The guard gap is owed to A0 (tooling) in
    `open_blockers[192]` (12).
- **P4. The export fixture makes two judgements** and labels them as judgements:
  - `workspace_invitations` is omitted as token material. §11.1/5 says "secret", and the token hash
    is a stored bearer-token form (§9.3, ERD:473).
  - Nine tables outside §11.1's minimum domains (ERD:546-555) are listed as
    `outside-minimum-domains`, "NOT decided here". *Four of the nine are inside them (C0 G3):
    `publish_jobs` and `performance_snapshots` (publish history, ERD:552), `quota_buckets` and
    `usage_reservations` (usage, ERD:554). Since the review round they are in
    `in-minimum-domain-projection-undecided`, five remain outside, `user_profiles` has its own
    judgement (`user-scoped-profile`, C0 G4), and `security_events`' omission is labelled a judgement
    (C0 N3).*

## 5. What this batch does NOT decide

Each item below is quoted from the plan and left open. Each is **UNANSWERED** in the disposition, with
A0's recommendation from the phase plan: Q160-a, approve §10's numbers as Pilot defaults behind a
policy-version gate and keep DATA-DEC-05/06/10 open until Paid Beta; Q160-b, Route B; Q160-c, A1
amends ERD §5/§10 (and, new from this batch, widen it to F160-04..08 and F160-16); Q160-d, A4, in the
100–109 range, with 160 consuming the tables.

- **Q160-a** (Product/Security/Legal), from the plan: "approve, change or defer §10's numbers, with a
  named owner and date for each". No number is encoded; every defined row carries `Q160-a`.
- **Q160-b** (A1 + Owner), from the plan: "how is the 'N for every role' audit/approval/ledger rule
  reconciled with anonymisation?". §6 below gives a recommendation and no choice.
- **Q160-c** (A1 Data), from the plan: "define `CONNECTION-HISTORY` and `CATALOG`, and fix the
  `NOTIFICATION-*` / `PUSH-SECRET` glob mismatch". These stay finding rows.
- **Q160-d** (A4 + A1), from the plan: "who owns the deletion-manifest tables, and which batch creates
  them?". This is recorded as `no-deletion-manifest`.
- **DATA-DEC-04 to DATA-DEC-10** (ERD:867-873) stay open. **DATA-DEC-03** (the executor) stays open
  too, which is why `no-executor` is on every row.
- The draft also does not decide:
  - which tables outside the minimum domains are exported;
  - field projection inside an exported table;
  - the encryption, expiry and download behaviour of §11.1;
  - how each F160-14 conflict is resolved (anonymise-and-keep the parent, or detach the child).

## 6. Design note: anonymising approval history (WP:401 at `75c9274`, WP:402 here, `open_blockers[148]`; blocker 186 item 16)

**What must change.** APPROVAL-HISTORY ends in "anonymize actor after minimum retention; preserve
decision integrity" (ERD:496). Three tables are involved:

- `app.approval_events`: `actor` and `comment`. No role holds UPDATE on either.
- `app.approval_requests`:
  - `requested_by` and `created_by`: no UPDATE grant.
  - `decided_by` and `updated_by`: client-only UPDATE.
  - `private.set_decided_at` (125/126) refuses any change to a recorded `decided_by`, and 090's
    equivalence refuses NULL.
- `app.approval_policies`: `created_by` and `updated_by`.

The same refusal shape applies to audit (`refuse_mutation`) and to the ledger (absent grants). All of
it is measured above.

**Route A: sentinel.** A documented constant actor id is written over the actor columns, by
`app_maintenance` only, in a forward migration. That migration would:

1. grant `app_maintenance` UPDATE on the actor columns, with a policy;
2. narrow `private.set_decided_at` (and, for audit, `private.refuse_mutation`) so that it accepts a
   change only to the sentinel and only when `current_user = 'app_maintenance'`, pinned by digest in
   `PINNED_TRIGGER_FUNCTIONS`;
3. add cases showing that `authenticated` cannot write the sentinel. The closures
   `decided_by = auth.uid()` and `updated_by = auth.uid()` already refuse it.

- *Cost:*
  - It opens a reviewed, role-specific hole in three rules that today read "every writer": 126's
    frozen decision, 140's refusal, and §8.3's `N` for every role.
  - It rewrites the decision trail in place, so any later tamper evidence over these rows
    (Q141-c, WP:282 at `75c9274`, `open_blockers[29]`) has to treat anonymisation as an authorised mutation.
  - It needs `app_maintenance` to exist as a working path, which waits on DATA-DEC-03. *Route B needs
    the same executor (review round, C0 G5); this cost is shared, not Route A's alone.*
- *Benefit* (added in the review round, C0 G5; each is the mirror of a Route B cost):
  - The 175 `auth.uid()` closures and the five pinned closure families are untouched.
  - No new SECURITY DEFINER helper, so no new entry in the pinned definer list or its probe.
  - No alias writer, so nothing waits on RFC-2026-023.
  - No comment side table: free text (`comment`) is anonymised by overwriting it in place.
  - One family's migration (approval, plus audit's trigger), not a cross-family one.
  - The cross-workspace link survives until the minimum retention ends, which a SECURITY investigation
    under active investigation or legal hold (ERD:513) may need while the person is still identifiable.

**Route B: mapping.** The actor columns stop holding the auth user id. They hold a **per-workspace
actor alias** from a private mapping table (`alias → user_id`). Anonymisation is one UPDATE that nulls
`user_id` in the mapping, and the approval rows are never rewritten. Free text moves out of the
append-only row: `approval_events.comment` becomes a reference to a purgeable side row, because a
mapping cannot anonymise prose.

- *Cost:*
  - Every actor closure compares against `auth.uid()` today. That is 175 mentions across the
    migrations, and the pinned closure families in `scripts/db/run.mjs`: `UPDATED_BY_CLOSURES` (14
    tables), `UPDATED_BY_ON_UPDATE_CLOSURES` (19), `CREATED_BY_CLOSURES` (19), `REQUESTER_CLOSURES`
    (2) and `DECIDER_CLOSURES` (1). Each would compare against an alias resolver instead.
  - The resolver is a new SECURITY DEFINER helper, so it joins the pinned definer list and its probe.
  - It needs a writer that creates the alias on first use, which is command-path work that waits on
    RFC-2026-023.
  - It needs a side table for comments.
  - It is one cross-family forward migration, and it gets more expensive with every family that adds
    an `= auth.uid()` closure.
  - *(review round, C0 G5)* Its "one UPDATE that nulls `user_id` in the mapping" needs a role with
    UPDATE on the mapping and a policy that admits it. No service role has either today (measured: no
    policy names one), so it waits on the same executor, DATA-DEC-03, as Route A.
  - *(review round, C0 G5)* Per-workspace aliases also cut the cross-workspace link in security and
    audit rows. §10 SECURITY keeps records for "active investigation/legal hold" (ERD:513), and an
    investigator may need that link while the person is still identifiable. The benefit below is
    also a cost.
- *Benefit:*
  - No refusal trigger is weakened, and no "N for every role" cell gains an exception.
  - The decision row's bytes never change.
  - Per-workspace aliases also stop the same person being linked across workspaces through approval,
    audit or membership rows. Route A cannot do that, because it only removes the link after the
    minimum retention.

**A cheaper third reading, rejected.** Leave the user id in place and delete the identity anchors
(`auth.users`, `app.user_profiles`). Nothing has a foreign key to `user_profiles` (measured), so the
uuid would resolve to nothing. It is still the same uuid in every table, in audit and in backups.
That is pseudonymisation, not anonymisation, and `workspace_members.user_id` would itself need a
rewrite under AUTH-HISTORY.

**Recommendation: Route B**, as in the plan, with the comment moved to a purgeable reference. The
main cost is the closure migration across about 19 tables plus one definer helper, a comment side
table and an alias writer that waits on RFC-2026-023; the executor (DATA-DEC-03) is needed by either
route, and the investigation trade-off above is the Owner's to weigh. It should be decided
**before** any further family adds an `auth.uid()` actor closure, and before G1 data exists, while every
table is still empty and applied nowhere. This is a recommendation for Q160-b; it is not taken here.

## 7. Files (this branch against main `c7fe264`)

- `db/foundation/lint/retention-map.json` (new; packaging moved its six `WP:` citations +1 and named each finding's blocker)
- `db/foundation/lint/purge-order.json` (new)
- `test-kits/db/export-manifest.fixture.json` (new)
- `test-kits/db/foundation-contract.test.mjs` (three tests and their helpers, appended after 141 prep's)
- `scripts/test-suite-contract.mjs` (floors 77 → 80 and 633 → 720, and the name digest) — amended outside ownership
- `evidence/VERIFICATION.md` (681 → 684, written by `npm run record:verification`) — amended outside ownership
- `test-kits/branch-identity.test.mjs` (the branch slot) — amended outside ownership
- `test-kits/integrity-manifest.json` (regenerated) — amended outside ownership
- `work-packages/WP-0A-DB-00.json` (branch slot, rationale, blockers 4, 77, 91, 105, 148, 150, 190 extended, 192 new)
- this plan, and `product-owner-disposition-2026-10-03-batch-160-prep.md`
- `handoffs/WP-0A-DB-00-author-handoff.json` (last, alone)

Scratch only, not committed: the draft's `a0-160p/` (`gen.mjs`, the generator, holding the judgement half;
`catalog.sql` and `catalog.json`; `fktext.mjs`, `granttext.mjs`, `idxtext.mjs`; `mutate.mjs`; `round.sh`) and this
branch's `a0-160-prepr/` (`count160.mjs`, the guard's own count; the manifest and plan edit scripts).

Review round (§8): the same files again, plus the three review records; the assertion floor 720 → 747; scratch
`a0-160-prepr2/` (`edit-data.mjs`, `edit-manifest.mjs`, `fk.mjs`, `mutate.mjs` and its log, `count.mjs`).

Not touched: any migration; `docs/**` and `contract-catalog/**`; CI.

## 8. Review round (2026-10-04)

Written by a subagent of `/claude/a0_atlas`, on the branch name, from head `1706111`. It fixes and
records; it approves nothing, decides none of Q160-a..d or DATA-DEC-03..10, and adds no migration, no
policy, no grant and no retention number.

### 8.1 Cherry-pick map

| review | source commit (branch) | here |
|---|---|---|
| C0 contract review | `89d0994` (`review/c0-batch-160-prep`) | `1c8b0e4` (`-x`) |
| A1 security review | `ddd9879` (`review/a1-batch-160-prep`) | `886b1a4` (`-x`) |
| Q0 independent test | `b10e5f8` (`review/q0-batch-160-prep`) | `6e41fc8` (`-x`) |

All three are clean picks (one new file each). The branch name is checked out in the Author's other
worktree (`wf_5b1db44b-fe1-1`); its files were compared with head `1706111` by `diff -rq` (no
difference, nothing uncommitted or untracked) before this worktree took the name with
`--ignore-other-worktrees`.

### 8.2 Finding → change → measured

Every change is inside the three batch-160 tests (no test added or renamed), the three data files, the
blockers and the records. "Probe" is the reviewer's surviving mutation, re-run by
`a0-160-prepr2/mutate.mjs` (§8.3).

| finding | change | measured |
|---|---|---|
| C0 G1, A1 S1, Q0-F1 (MEDIUM): the window guard missed Thai, hyphenated and numeric windows | `WINDOW160`: English units with `(?![A-Za-z])`, Thai units with no `\b`, `\s*-?\s*` between digit and unit, hour/week/ชั่วโมง/สัปดาห์ added; a self-test on §10's own forms and on four non-windows; every numeric leaf of a row other than `section5.line` refused; plan §1(a) and disposition §4 corrected | P1, P2, P3, A1's three Thai probes, "30วัน", "24 ชั่วโมง", RM-13 (`retention_days: 30`): all red; P4 control red. No row matches today. Five *finding* texts (F160-04, -09..-12) quote §10's windows as prose; the guard is per row by design and they are not values |
| C0 G2 (MEDIUM): invitations TOKEN-SHORT vs AUTH-HISTORY unrecorded | F160-17 in `findings`; the row carries `also_claimed_by: AUTH-HISTORY` / `also_claimed_finding: F160-17`; `open_blockers[192]` (13), owed to A1 Data under Q160-c widened; plan §4 and disposition Q160-c row | the pairing removed: red. Nothing decided |
| C0 G3 (MEDIUM): four export tables mislabelled outside the minimum domains | `publish_jobs`, `performance_snapshots`, `quota_buckets`, `usage_reservations` moved to `in-minimum-domain-projection-undecided` (ERD:552/:554); the test refuses a PUBLISH-HISTORY or FINANCE-HISTORY table in `outside-minimum-domains`; plan P4 corrected; handoff corrected in its refresh | publish_jobs put back: red |
| C0 G4, A1 S5 (LOW/INFO): `user_profiles` called a global catalog row | own bucket `user-scoped-profile`, labelled a judgement (ERD:198, :549 undecided) | P8 (export it) stays **green, by design**: whether member profile fields are exported is undecided, not excluded; the reason, not the outcome, was the finding |
| C0 G5 (MEDIUM): the design note unbalanced | §6: the executor (DATA-DEC-03) booked to both routes; a Benefit list for Route A; the investigation trade-off (ERD:513) as a Route B cost; disposition Q160-b row and `open_blockers[148]` list B's costs as §6 does. The recommendation stands | text, read against §6 |
| C0 G6 (LOW): partial covering indexes counted | `indexes160` reads each partial predicate; each sweep carries `partial_predicates`; where every covering index is partial a `partial_cover` verdict is required (`serves-the-sweep` for `assets`, `research_snapshots`; `F160-13` for `workspace_invitations.expires_at`, `billing_webhook_receipts.received_at`); F160-13 is fifteen keys; `[192]` | predicate dropped: red; verdict dropped: red |
| C0 G7, A1 S3, A1 S7 (LOW/MEDIUM): phases not §11.4, audit in 7, global tables in a workspace purge | `audit_logs` moved to phase 8 (no FK, placed before `security_events`); `audit_logs` and `security_events` carry `refused_by`; the six global catalogs and `user_profiles` are `outside_workspace_purge` with a reason (no `workspace_id`, no key to the root); `phase_inversions` names the four tables out of phase order and the conflicts that place them; `_phases._rule` and `_not_monotone`. The test holds root=9 alone, step-8 classes and kept rows = 8, other defined classes 6/7 one per class, findings 6-8, the inversions two-way, the outside mark two-way and `refused_by` against the map | P5, `security_events`→6, PO-08: red; outside mark dropped or added: red; `refused_by` dropped: red; an undeclared inversion: red |
| C0 G8, Q0-F4 (LOW): fk names and conflict fields not held | `fkEdges160` reads each key's name (named constraint or PostgreSQL's `<table>_<cols>_fkey`) and compares `fk|child|parent`; conflicts' child, parent and behaviours checked against the edges and the map | text parse equals all 90 declared names (`fk.mjs`); P6/PO-09, P7, behaviour altered: red |
| C0 G9, A1 S6 (LOW/INFO): small untruths | `[190]` `app.content_schedules`; `[105]` "batch 131 used WEBHOOK-SHORT for it"; `[91]` and P1 say "Undefined or mismatched"; every `WP:<n> (open_blockers[i])` in the map is checked against line n of the manifest | P10 and an off-by-one citation: red |
| A1 S2 (LOW): `set_decided_at` not held both ways | the two-way trigger rule covers `private.refuse_mutation` and `private.set_decided_at`; on a table with anonymise columns, a trigger whose function is neither refusing nor a read stamping one (`set_updated_at`, `set_deleted_at`, read: they only stamp) fails | control dropped: red; an unnamed refusal trigger and an unread trigger function appended to 140: red |
| A1 S4, Q0-F3, C0 N2 (LOW/note): exclusions rest on unjustified picks | `section9_not_picked: [{class, why}]` required, two-way, for every SECRET-4/SECURITY-4/INTERNAL-3 in a row's §5 cell that it does not pick (seven rows); an exported table with one is allowed only by `export_allowed: true` (audit_logs alone, ERD:555) | EX-07, EX-08 and A1's notifications/meta/ai_model_policies exports: red; a reason removed or emptied: red; P9: red |
| Q0-F2 (LOW): schema-wide grants and later drop/disable trigger | `grants160` expands `on all tables in schema`; a trigger control fails if a `drop trigger` or `disable trigger` follows its last create | MD-02, MD-11, MD-06, MD-07: red in the static layer (live probes already held them, Q0 §2.5) |
| C0 N1 | F160-14 and `_retention_conflicts` say twelve is a lower bound (21 non-self keys touch a finding row) | recomputed |
| C0 N3 | `security_events`' omission labelled a judgement | text |
| C0 N4 | `[150]` says `controls_on_every_row` names `no-deletion-manifest` | text |
| Q0-F5 (INFO): an exit code recorded before it was observed | this round's handoff records the post-commit `check`/`check:handoff`/`verify` entry as pending and the PR body carries the observed exits | handoff |
| Q0-F6 (INFO): cited scratch gone | stated here: the draft's `a0-160p/` (§1's 27 mutations, §2's `catalog.sql`, `fktext.mjs`, `granttext.mjs`, `idxtext.mjs`) **no longer exists**; Q0 re-measured the catalog-versus-text equality and C0 the FK names live at `1706111`. This round's scripts are kept in `a0-160-prepr2/` | `find` by Q0 |

Nothing is owed from this round beyond what `[192]` (9), (10) and (13) record: no item needed more than a
bounded change.

### 8.3 Measured (Node `v24.20.0`, checked before each run; on the branch name)

| command | exit | result |
|---|---|---|
| `node --test test-kits/db/foundation-contract.test.mjs` | 0 | tests 80, pass 80 |
| `a0-160-prepr2/mutate.mjs`: 39 one-file edits (every surviving probe of C0, A1 and Q0, plus new ones), each restored and its sha256 compared | n/a | 37 red; 2 green: P8 (by design, above) and the control (an adjacent swap with no key between). Baseline green before and after |
| the guard's own count (`a0-160-prepr2/count.mjs`) | n/a | 80 tests, **747** assertions (720 → 747), digest `8c35e631c28c0574` unchanged |
| `make db-schema-lint`; `make db-contract-check` | 0; 0 | ok; ok |
| `npm run regenerate:manifest` | 0 | 88 digests |
| `npm run check` (before the commit) | 0 | tests 684, pass 684 |
| `node scripts/verify-branch-scope.mjs c7fe264 WP-0A-DB-00` | 0 | all 15 changed paths declared |
| live DB | not run | no input a database layer reads changed: no migration, and only `foundation-contract.test.mjs` names the three data files (grep over `scripts db Makefile .github test-kits tests`). No cluster was started on 5507 |

`npm run check`, `npm run check:handoff` and `npm run verify` after the handoff refresh are recorded in
the PR body, not here.

## 9. Re-checks of the review round (2026-10-04)

C0, A1 and Q0 re-checked `8af817f` (code `b06b4e0`). Their files are cherry-picked with `-x`:

- C0: `7980c85` → `e537ec1`
- A1: `7a55142` → `848acf2`
- Q0: `16d522c` → `2208b23`. This is Q0's final file.

**None of the three reports a stop-the-line, and none reports anything that blocks the merge.** CI is
green on `8af817f` (run 37147066016). Q0 measured its F1–F6 closed. A0 changes no code in this round.
No export path exists, so every gap below is in a test or a fixture, not in a running control. These
items stay owed on open_blockers[192]:

| Finding | Grade | Owed |
|---|---|---|
| `export_allowed` is pinned by no test. One data edit exports app.meta_connections (SECRET-4 in its §5 cell), and app.workspace_invitations' `token_hash` is excluded only by the fixture's own omitted list, with every test still green (A1 R1, R2; Q0 R-3) | LOW | A0: derive `export_allowed=false` from any SECRET-4 or token/credential column in the §5 cell, and pin it in the test |
| Nothing holds F160-17's record. Removing `also_claimed_by` or the finding leaves every test green (C0 R1) | LOW | A0: a static pin |
| The new guards hold today's cases, not the declared rules. The export label forbids only PUBLISH/FINANCE-HISTORY, and the minimum-domain guard reads only one label (C0 R2; Q0 R-5) | LOW | A0: assert the rule over every §11.1 domain |
| The static read of grants and triggers misses six spellings: `alter table if exists … disable trigger`, `drop function … cascade`, a no-op `create or replace`, and quoted or schema-qualified names (Q0 R-2) | LOW | A0, with the 141-prep tripwire widening on [191] |
| The window guard does not read `30d`, `12mo`, `P30D`, string numbers, spelled-out numbers or Thai digits. §10 and DATA-DEC use none of these, and every phrase they do use is caught (C0 R-N1; A1 R3; Q0 R-1). `partial_cover`'s verdict and F160-13's count are not cross-checked (Q0 R-4). The b06b4e0 body says "numeric windows" where it means number-typed fields (C0 R-N2) | INFO | recorded |
