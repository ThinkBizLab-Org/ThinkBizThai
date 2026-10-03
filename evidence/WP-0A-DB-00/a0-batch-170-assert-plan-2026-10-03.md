# Batch 170, the assertion-only part: plan, item to change to test, measured

**Package:** `WP-0A-DB-00`. **Branch:** `agent/claude/WP-0A-DB-00-batch-170-assert`, cut from main
`2f6ab9e` (PR #170, batch 160 prep, merged by A0 at its reviewed head `1b79315` under the Owner's
standing delegation, `product-owner-disposition-2026-10-03-batch-127.md` §6).

Written 2026-10-04 by a subagent of the Author run `/claude/a0_atlas`. It is the Author's record. It
approves nothing, decides none of the plan's Q-ids, and adds **no migration, no policy and no grant**.
Gate: pre-G0 (CONTRIBUTING_AGENTS.md:23). Its disposition is
`product-owner-disposition-2026-10-03-batch-170-assert.md` in this directory.

This file began as the draft record `a0-batch-170-assert-draft-2026-10-03.md` (`1319042` on the local
branch `draft/wp-db00-170-assert`, cut at `999456d`) and was moved here with `git mv`. Sections 0, 0.1,
5.1 (owners), 6, 7 and 8 are new or rewritten; §1 to §5 are the draft's, kept as measured at `999456d`,
with what this branch re-measured stated in §0.1. Source: the phase plan for 141–170
(`a0-phase-plan-141-170-2026-10-03.md`), "Batch 170 — 4. Can do now (assertion only, the same pattern as
126–129)", its lines 218-221 on this tree. The Owner ended the hardening chain at 129 and told A0 to do
everything that needs no pending decision.

**No migration.** Every item is an assertion, lint data, a generator or a test. Q170-a, Q170-b, Q170-c
and the new Q170-d (from F1) are left undecided (§7).

## 0. Commits on this branch

| commit | what |
|---|---|
| `4d9c9ac` | the draft's `3b04a7b`, cherry-picked. Two conflicts, each because main had moved since `999456d` (141 prep, 160 prep): `scripts/test-suite-contract.mjs` (main had moved foundation-contract's assertion floor 525 → 747; the draft's 525 → 590 was its base's) and `test-kits/integrity-manifest.json`. Resolved by keeping main's text and taking the guard's own count (§0.1), then `npm run regenerate:manifest`. `foundation-contract.test.mjs` merged without conflict (main's 141/160 blocks and the draft's 170 edits touch different lines). |
| `e3f1db7` | the draft's `1319042` (the draft record), cherry-picked without conflict. |
| `dee6561` | packaging: `scripts/db/generate-pinned-grants.mjs` (F14); branch slot and increment rationale; `evidence/VERIFICATION.md` out of `amends_without_owning`, and the WP line citations that moved with it; blockers 18, 93, 115, 185 extended and 193 new; the branch-identity slot; the integrity manifest. Committed plainly: `commit-when-clean` refused with exit 1 and the only two failures were the handoff guard (§0.1). |
| next | this plan (moved from the draft record) and the disposition. |
| last, alone | `npm run refresh:handoff`, then the handoff's text fields. |

### 0.1 Floors, digests, manifest, verification record, and what was measured here

- `scripts/test-suite-contract.mjs`, read through the guard's own `stripNonCode` (scratch
  `a0-170-assertr/count.mjs`): main `2f6ab9e` makes **747** assertions in `foundation-contract.test.mjs`
  and declares 80 tests; this branch makes **788** and declares 80. So the assertion floor moves
  747 → 788 (+41, the same 41 the draft added on its base, 549 → 590). `identity-isolation.test.mjs`
  2166 → **2167**. No test is added or renamed, so the test floors and name digests stay. The draft's
  525 → 590 is not used.
- `evidence/VERIFICATION.md`: **not amended**. The suite stays **684** tests, so the record holds byte
  for byte; leaving it declared would make `verify-branch-scope` exit 74 ("declares 1 amendment(s) that
  explain nothing"), which this branch measured before the packaging commit.
- Dropping that path from `amends_without_owning` moves every manifest line below it up by one. No
  blocker INDEX moves (the new blocker is appended at the end, `open_blockers[193]`), but the
  line-number citations do, so they were recomputed against the blocker each names: 19 `WP:<line>`
  citations in `db/foundation/lint/retention-map.json`, 33 `{ index, line }` pairs and 2
  `(line N)` mentions in `db/foundation/lint/audit-coverage-map.json`, and 1 in
  `test-kits/db/fixtures/ctr-aud-001/store-conformance.json`. Every one moved by -1; the
  foundation-contract tests that read them pass (80 of 80).
- The draft's prose cites WP:271, :289, :346, :348, :368 and :438, measured at `999456d`. On main
  `2f6ab9e` each of those blockers sits one line lower (141 prep added a line above `open_blockers`);
  after this branch's packaging commit each is back on the line the draft cited (measured line by line,
  scratch `a0-170-assertr/lines.mjs`), so the draft's citations are true on this branch as written.
- `test-kits/integrity-manifest.json`: regenerated (`npm run regenerate:manifest`, 88 digests).
- `scripts/db/generate-pinned-grants.mjs` (F14) is 132 lines, reads one catalog SELECT through `psql`
  on `DB_TEST_URL` and renders both files with sorted tables, roles and privileges and columns in
  attnum order, so it is deterministic. It is the draft's private generator (`a0-170a/gen.mjs` and
  `measure.sql`), with the SQL embedded and a `--check` mode added; it refuses without `DB_TEST_URL`
  (exit 2).

Measured on this branch (Node `v24.20.0`, checked with `node -v` before every run; PostgreSQL 17.11 from
`/opt/homebrew/bin`; a fresh `initdb --locale=C -A trust -U postgres` every round; 127.0.0.1:5507 only,
TCP only, `-c unix_socket_directories=''`; `LC_ALL=C`; the shim first;
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5507/postgres`):

| Command | Tree | Exit | Output |
|---|---|---|---|
| `npm run check` | after the cherry-picks | **0** | tests 684, pass 684 |
| `node scripts/verify-branch-scope.mjs 2f6ab9e WP-0A-DB-00` | after the cherry-picks, manifest unchanged | **74** | declares `evidence/VERIFICATION.md` and `test-kits/branch-identity.test.mjs`, which explain nothing yet |
| `make db-migrate-clean` (round r1) | the packaging tree, uncommitted | **0** | pinned grant: 66 tables, 43 table-level and 1328 column-level grants; read allowlist: 0 entries, 41 known exceptions; data classification: 66 tables, 8 refused tables, 0 columns; each refused its drifts; post-migrate pass 49 / 37 / 12 |
| `make db-rls-smoke` × 2, the same database (r1) | the same | **0**, **0** | 1079 isolation cases each; 6 authz claims |
| `node scripts/db/generate-pinned-grants.mjs --check` (r1) | the same | **0** | both files match the catalog; 66 tables |
| drift round d1: `grant select (input_ref) on app.jobs to app_command;` appended to `140_audit.sql` | the same | migrate-clean **2**, rls-smoke **0**/**0**, generator `--check` **1** | "unlisted: app_command SELECT (input_ref) on app.jobs"; `pinned-grants.json: DIFFERS from the catalog`. `140_audit.sql` restored from a saved copy; sha256 `2ac596bb…49` before and after |
| `npm run check` | the packaging tree | **1** | tests 684, pass 682, fail 2: "the handoff for this branch describes this branch" and the ratchet test that runs it; nothing else |
| `node scripts/commit-when-clean.mjs` | the same | **1** | "refusing to commit: the tree is not clean", the same two |
| `node scripts/verify-branch-scope.mjs 2f6ab9e WP-0A-DB-00` | `dee6561` | **0** | "all 17 changed path(s) are declared, and every amendment explains one" |
| `make db-migrate-clean` (round r2) | `dee6561` | **0** | as r1; 4640 ms |
| `make db-rls-smoke` × 2, the same database (r2) | `dee6561` | **0**, **0** | 1079 isolation cases each |
| `node scripts/db/generate-pinned-grants.mjs --check` (r2) | `dee6561` | **0** | both files match the catalog |

F1's condition, measured: rule 17 passes on main's migrations (r1, r2), and **no table the ERD leaves
ambiguous is classified PROVIDER-3**: the eight refused tables are `app.jobs`, `app.outbox_events`,
`app.consumer_ledger` (INTERNAL-3 by a one-class §5 row), `private.meta_webhook_inbox` (PROVIDER-3/SECRET-4,
both refused), `private.ai_credential_references`, `private.meta_credential_references`,
`private.push_subscription_references` (SECRET-4 by §9.1/§9.2's own examples) and
`app.billing_webhook_receipts` (PROVIDER-3, F4: named by no §5 row, resolved by §9.1's "webhook"; no
client holds anything on it). The twelve ambiguous tables keep `class: null` and a `finding`. So rule
17 is kept as drafted, and F1 is put as Q170-d (§7).

## 1. Item → file → rule and test (the draft's, measured at `999456d`)

| Plan item | File(s) | Rule (probe in `scripts/db/run.mjs`) | Self-test drift(s) | Static test |
|---|---|---|---|---|
| (a) Pinned grants on EVERY table in `app` and `private` and EVERY non-superuser role, table and column level, with grant option, as a closed list | `db/foundation/lint/pinned-grants.json` (new: 66 tables, one entry per table, one line per role); `scripts/db/run.mjs:1221-1321` | **pinned grant probe** (`run.mjs:1760`), now 4 rules: (1, new) the table list is exactly the catalog's, both ways; (2) every pinned table is owned by a superuser; (3) table-level privileges exactly; (4) column-level privileges exactly, a column privilege that a table-level one implies being read at table level (`run.mjs:1316`) | 4 (one per raise): unpinned tables in `app` and `private` plus one renamed away; the owner; TRUNCATE for `authenticated` with grant option, DELETE for `app_maintenance`, SELECT revoked from `app_worker`; the 091 column drifts plus SELECT for `app_command` and UPDATE revoked from `app_worker` | `foundation-contract.test.mjs`: the file is what the probe reads; its tables are exactly the `create table` set of the migrations (66); shape, ordering, no repeat, no grant option; only `app_worker`, `authenticated` and `app_authz` hold anything; 091's two tables still equal 091's grant text; the new reading predicates; digest `2e3ef3743a2ca6ad` → `7a8fe3e222e6827f` |
| (b) `read-allowlist.json` as an empty list (RFC-2026-021 §8.1), the §8.2 two-way rule, and the §8.5 known-exceptions block listing exactly today's inherited grants | `db/foundation/lint/read-allowlist.json` (`[]`); `db/foundation/lint/read-allowlist-known-exceptions.json` (41 rows); `run.mjs:1323-1376` | **read allowlist probe** (`run.mjs:1788`, new). Rule 1: every relation a client role (anon, authenticated, PUBLIC) can SELECT from, in any non-system schema or made after initdb, read as `<role> SELECT (<columns\|table\|view>) on <relation>`, is an exception or an allowlist entry. Rule 2: every exception or entry row matches a real client grant | 2: a column grant on `app.jobs` (authenticated) and on `app.user_profiles` (anon), a table-wide SELECT on an excepted table, and a view; an excepted grant revoked | the allowlist is `[]` and any future entry carries exactly §8.1's fields (`caller` required, no `anon`); the exceptions are authenticated, by column, sorted, without repeat, each granted by the migration it names, and exactly the client SELECTs the pinned list holds; reading predicates; digest `a97a58b338e52627`. `identity-isolation.test.mjs:8040`: batch 132's absence assertion now asserts presence and emptiness, the line 132 said the landing batch would edit |
| (c) A classification registry (table → §9.1 class, from ERD §5/§9.1) with a rule: no client privilege on SECRET-4, PROVIDER-3 or INTERNAL-3; unclassifiable tables are findings | `db/foundation/lint/data-classification.json` (66 tables); `run.mjs:1378-1431` | **data classification probe** (`run.mjs:1802`, new). Rule 1: the registry's tables are exactly the catalog's, both ways. Rule 2: no client role holds any privilege, table or column level, on a refused table (8) or a refused column (0) | 2: an unclassified table and one renamed away; the plan's drift (`grant select (input_ref) on app.jobs to authenticated`), INSERT for anon on `outbox_events`, SELECT for PUBLIC on `private.ai_credential_references` | every §5 class cited is on the cited ERD line; one-class rows take that class; a multi-class row is resolved only INTO a refused class by §9.1/§9.2 text; a table left between a refused class and another carries a `finding` and has no class; the 8 refused and 12 open tables are pinned by name; no column is classed; reading predicates; digest `42c77e0015f12eaf` |

Also changed: `db/foundation/README.md` (rule 7 rewritten; rules 16 and 17 new; the count is eighteen
families in twenty-six probes); `scripts/test-suite-contract.mjs` (assertion floors
`foundation-contract` 525 → 590 and `identity-isolation` 2166 → 2167, each the guard's own count, read
by `stripNonCode` as the guard reads it; no test added or renamed, so the test floors, the name digests
and the suite count, 677, stay); `test-kits/integrity-manifest.json` (regenerated, `npm run
regenerate:manifest`, 88 digests).

## 2. How the data was generated

On a fresh cluster (§3's setup) after `make db-migrate-clean` at `999456d`, one catalog read
(`has_table_privilege` and `has_column_privilege` for every non-superuser, non-`pg_*` role, every
table in `app` and `private`, all eight table privileges and all four column privileges, each with
and without grant option; a column row dropped when the table-level privilege with the same option
already holds) gave: 66 tables; 43 table-level rows, all `app_worker`; 1328 column-level rows
(`authenticated` 675, `app_worker` 649, `app_authz` 4); **no grant option anywhere**; nothing for
`anon`, `service_role`, `app_command` or `app_maintenance`. The JSON was generated from that read and
committed as reviewed data. The exceptions' `granted_by` is read from the migration text and is
documentation only; the probe reads `role`, `relation` and `level`. The classification registry was
written by hand from ERD §5 (`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:192-219`), §6
(`:247-283`, for the three tables §5 does not name) and §9.1/§9.2 (`:436-469`). The generator scripts
live in the subagent's private directory, not in the repository (F16).

## 3. Commands and exit codes

Setup for every live round: PostgreSQL 17.11 from `/opt/homebrew/bin`; `initdb --locale=C -A trust -U
postgres` afresh each round; 127.0.0.1:5507 only, TCP only (`-c unix_socket_directories=''`); `LC_ALL=C`;
the shim `db/foundation/ci/supabase-shim.sql` first; `DB_TEST_URL=postgresql://postgres@127.0.0.1:5507/postgres`.
Node `v24.20.0` (checked with `node -v` before each run; a PATH Node 26 exists and was not used).

| Command | Exit | Output |
|---|---|---|
| `make db-migrate-clean`, fresh cluster, at `999456d` (baseline) | **0** | 24 probes, each refusing every drift; post-migrate pass 49 blocks, 37 as written, 12 replaced |
| `make db-migrate-clean`, fresh cluster, this tree | **0** | 26 probes, each refusing every drift and clean again. Pinned grant: "the 66 tables in app and private are exactly the pinned list ... exactly the 43 table-level and 1328 column-level grants pinned ... (self-test: refused each of its 4 drifts)". Read allowlist: "0 read allowlist entries ... 41 known exceptions ... (refused each of its 2 drifts)". Data classification: "66 tables ... 8 tables or 0 columns classed SECRET-4, PROVIDER-3, INTERNAL-3 (refused each of its 2 drifts)". Post-migrate pass 49 / 37 / 12 |
| `make db-rls-smoke`, the same database, first run | **0** | 1079 isolation case(s) passed; `db-authz-proofs: ok — 6 claim(s)` |
| `make db-rls-smoke`, the same database, second run | **0** | 1079 isolation case(s) passed; 6 claims |
| `npm run check` (node 24.20.0) | **0** | tests 677, pass 677, fail 0 |
| `node scripts/commit-when-clean.mjs` for `3b04a7b` | **0** | "clean: exit 0 — tests 677, pass 677, fail 0, skipped 0, todo 0" |
| `node scripts/verify-branch-scope.mjs 999456d WP-0A-DB-00` | **74** | "declares 1 amendment(s) that explain nothing this branch changed: test-kits/branch-identity.test.mjs" (F11) |
| `node scripts/refresh-author-handoff.mjs --check` | **75** | "no work package declares ownership.branch \"draft/wp-db00-170-assert\"" (F11) |

The first `npm run check` on this tree exited 1: `identity-isolation.test.mjs` asserted that
`read-allowlist.json` does NOT exist, as a finding batch 132 wrote down to be edited when the file
landed. It was edited (§1) and the second run exited 0.

## 4. Drifts as later migrations, per layer

Each drift was APPENDED to `db/foundation/migrations/140_audit.sql` from a saved copy (sha256
`2ac596bb950e8dfb11d9e45172f24305698ecddb4d3e8380114e2bfc1ad37149`) and restored byte for byte after
every round; the sha256 was checked after each round and is the saved one at the end. Each round ran
`make db-schema-lint` (sl), then a fresh cluster with the shim, `make db-migrate-clean` (mc) and `make
db-rls-smoke` (rs). "Before" is the tree at `999456d`, extracted with `git archive` into the private
directory; "after" is this tree. Exit codes:

| Id | Drift appended to 140 | Before sl / mc / rs | After sl / mc / rs | Named by (after) |
|---|---|---|---|---|
| clean | nothing | 0 / 0 / 0 | 0 / 0 / 0 | — |
| A1 | `grant select (input_ref) on app.jobs to app_command;` | 0 / **0** / 0 | 0 / **2** / 0 | pinned grant: "unlisted: app_command SELECT (input_ref) on app.jobs" |
| A2 | `revoke update (lease_owner) on app.jobs from app_worker;` | 0 / **0** / 0 | 0 / **2** / 0 | pinned grant: "missing: app_worker UPDATE (lease_owner) on app.jobs" |
| A3 | `grant select on private.meta_webhook_inbox to app_worker;` | 0 / **0** / 0 | 0 / **2** / 0 | pinned grant: "unlisted: app_worker SELECT on private.meta_webhook_inbox" |
| A4 | a new table `app.probe_d_unpinned`, RLS enabled and forced, no grant | 2 / 0 / 0 | 2 / **2** / 0 | pinned grant: "unpinned: app.probe_d_unpinned"; data classification: "unclassified: app.probe_d_unpinned" |
| B1 | `grant select (id) on app.audit_logs to authenticated;` | 0 / 0 / 2 | 0 / **2** / 2 | pinned grant (column, unlisted); read allowlist: "authenticated SELECT (columns) on app.audit_logs" |
| B2 | `grant select on app.workspaces to authenticated;` (table-wide, over an excepted table) | 0 / **0** / **0** | 0 / **2** / 0 | pinned grant: "unlisted: authenticated SELECT on app.workspaces"; read allowlist: "authenticated SELECT (table) on app.workspaces" |
| B3 | `revoke select on app.notifications from authenticated;` | 0 / 0 / 2 | 0 / **2** / 2 | pinned grant (each column, missing); read allowlist rule 2: "authenticated SELECT (columns) on app.notifications" |
| C1 | `grant select (input_ref) on app.jobs to authenticated;` (the plan's drift) | 0 / **0** / **0** | 0 / **2** / 0 | pinned grant; read allowlist; data classification: "authenticated SELECT on app.jobs" |
| C2 | `grant select (id) on private.push_subscription_references to authenticated;` | 0 / 2 / 0 | 0 / 2 / 0 | before and after, the client privilege probe's rule 3 (outside `app`); after, also pinned grant, read allowlist and data classification ("authenticated SELECT on private.push_subscription_references") |

Per-layer verdict: **B2 and C1 passed every layer before** (a table-wide client SELECT on
`workspaces`, and a client SELECT on an INTERNAL-3 job payload reference), and A1, A2 and A3 (a
non-client role's reach) passed migrate-clean before; each now fails migrate-clean by name. Schema lint
and rls-smoke are unchanged by this draft; A4's schema-lint failure is the existing lint's, not this
draft's. B1 and B3 were held by rls-smoke alone before.

## 5. Gaps and findings

- **F1 (MEDIUM, a decision).** The plan's rule "no client privilege on PROVIDER-3" is stricter than
  §9.1, which gives PROVIDER-3 the client projection "safe projection only" and INTERNAL-3 "redacted
  status only" (`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:448`, `:453`). Batches 120 and 121
  put PROVIDER-3 columns inside the client SELECT on purpose (`db/foundation/migrations/120_publisher.sql:330`,
  `121_publisher_metrics.sql:297-298`) and record two client-readable TABLES as PROVIDER-3
  (`120_publisher.sql:563` `published_posts`, `121_publisher_metrics.sql:261` `performance_snapshots`;
  `authenticated` reads 8 columns of each). The registry follows the ERD and leaves these open
  (`db/foundation/lint/data-classification.json:447`, `:380`). If the ERD owner adopts the migrations'
  table classes, rule 17 fails today. Whether rule 17 should read "no privilege" or "only a pinned safe
  projection" for PROVIDER-3 and INTERNAL-3 is for A1 and the Owner. No Q-id in the plan covers it.
- **F2 (finding, as asked).** Twelve tables are left between a refused class and another by ERD §5 and
  are not classified: `ai_model_policies`, `ai_models`, `meta_connections`, `social_accounts`,
  `notifications`, `notification_preferences`, `publish_intents`, `publish_targets`,
  `publish_target_assets`, `publish_jobs`, `published_posts`, `performance_snapshots` (each a `finding`
  in `db/foundation/lint/data-classification.json`). Seven are read by `authenticated` today. Each
  finding cites the migration's own recorded reading, which is not adopted, since it would lift the
  table out of a refused class.
- **F3.** The ERD classes no column. The registry's `columns` map is empty, so rule 17's column half
  asserts nothing today (`data-classification.json`, `_columns`).
- **F4.** `app.billing_webhook_receipts`: §5's billing family (PII-2/FIN-3,
  `sprint-0a-core-erd-rls-retention-th.md:218`) does not name it, and §9.1 lists "webhook" as
  PROVIDER-3 (`:448`). It is resolved INTO PROVIDER-3, which only adds a refusal (no client holds
  anything). The family row is for the ERD owner (`data-classification.json:150`).
- **F5.** `app.plan_entitlements` and `app.publish_target_assets` are named by no §5 family. Their
  families are inferred from §6's batch owner (`family_inferred_from`).
- **F6.** SECURITY-4 (`audit_logs`, `security_events`; §9.1 "security/admin safe view only") is not in
  the plan's refused set, so rule 17 does not hold it. No client holds anything there today: rule 7
  and the read allowlist probe would name a grant.
- **F7.** The read allowlist probe reads SELECT only. RFC-021 §8.2's second bullet says "every
  client-role grant". Client INSERT, UPDATE and DELETE are held by rule 7 (exactly) and the permissive
  policy probe, not by the allowlist rule (`scripts/db/run.mjs:1323-1342`, stated in the comment).
- **F8.** RFC-021 §8.2's migration-text half (every `create view` in `app` corresponds to an entry) is
  not written as its own rule. `identity-isolation.test.mjs` still asserts that no migration creates a
  view. §8.2 also says the existing industry-catalog test "is replaced"; it was not replaced. §8.3's
  widening of `exposed_views` in `catalog-snapshot.json` is not done.
- **F9.** `tests/db/identity/identity-isolation.test.mjs:8029`: the test's NAME still says "the
  registry RFC-2026-021 asks for is not in the tree". Renaming it moves that file's name digest, which
  is the Integration Owner's to accept, so only the assertion was changed.
- **F10 (stated limit).** Rule 7 no longer reads a column privilege that a table-level privilege
  already implies (`run.mjs:1316`). A redundant column GRANT beside a table grant changes no effective
  privilege and is not named until the table grant is revoked; then it is named as unlisted.
- **F11 (packaging, not done by instruction).** The manifest's `ownership.branch` is
  `agent/claude/WP-0A-DB-00-batch-129` and its rationale describes batch 129. On this branch
  `check:scope` exits 74 (the `test-kits/branch-identity.test.mjs` amendment explains nothing in this
  diff) and `check:handoff` exits 75 (no package declares the draft branch). Whoever packages the
  batch updates the slot, the rationale and the branch-identity slot, and writes the handoff.
- **F12 (citation drift in the plan).** The plan cites `run.mjs:990-1029` for `PINNED_GRANTS`; at
  `999456d` it is `run.mjs:1231-1253`. It cites `run.mjs:607-611` for `PINNED_CHECKS`; that is
  `run.mjs:836`. It cites `run.mjs:425-605` for the client probes; they run to about `:682`. The WP and
  RFC-021 citations I relied on (WP:271, :346, :348, :368, :438; RFC-021:371-373, :461-467, :512) read
  as the plan says.
- **F13 (platform).** Rule 7 reads every non-superuser role. On a provisioned Supabase instance the
  platform's own roles and default grants would read as unlisted. Pinning them needs the measurement
  in Q170-c. CI and this run use the shim's roles only.
- **F14.** The generator that turned the catalog read into `pinned-grants.json` and
  `read-allowlist-known-exceptions.json` is not in the repository. A later batch edits the JSON by hand
  or regenerates it with a script of its own. A repository-declared generator under `scripts/db/` is
  owed.
- **F15 (cost).** The pinned grant probe is now about 94 KB of SQL and runs six times per
  migrate-clean. Measured migrate-clean wall time: 4.8 s on this tree against 5.0 s at baseline, on
  this machine.

### 5.1 Each finding's owner and where it is held

Every finding above is either owed with a named owner or cross-referenced to the blocker that already
holds it. Blocker numbers are 0-based indices into `open_blockers` of `work-packages/WP-0A-DB-00.json`.

| Finding | Severity | Owner | Held by |
|---|---|---|---|
| F1 (rule 17 stricter than §9.1's projections) | MEDIUM, a decision | A1 + Owner: **Q170-d** | `open_blockers[193]` (1); §7 below |
| F2 (twelve ERD-ambiguous tables) | finding | ERD owner (A1 Data) | `[193]` (2) |
| F3 (no column classes) | finding | ERD owner (A1 Data) | `[193]` (3) |
| F4 (`billing_webhook_receipts` family) | finding | ERD owner (A1 Data) | `[193]` (4) |
| F5 (two tables named by no §5 family) | finding | ERD owner (A1 Data) | `[193]` (5) |
| F6 (SECURITY-4 outside rule 17) | finding | A1 | `[193]` (6) |
| F7 (the read allowlist reads SELECT only) | stated limit | A0 (`scripts/db/run.mjs`) | `[115]`, extended |
| F8 (§8.2's migration-text half, §8.3's `exposed_views`, the industry-catalog test) | owed | A0 under RFC-2026-021 §8 | `[115]`, extended |
| F9 (a test name still says the file is absent) | finding | Integration Owner (the name digest) | `[193]` (7) |
| F10 (a redundant column grant beside a table grant) | stated limit | A0 | `[193]` (8) |
| F11 (packaging) | — | — | **done here** (§0) |
| F12 (the phase plan's `run.mjs` citations) | record | — | corrected in this plan (§5; `PINNED_GRANTS` is `run.mjs:1248` on this tree) |
| F13 (platform roles on a provisioned instance) | finding | A0, with **Q170-c** | `[193]` (9); `[185]`, extended |
| F14 (the generator is not in the repository) | — | — | **closed here**: `scripts/db/generate-pinned-grants.mjs` (§0.1) |
| F15 (probe cost) | INFO | A0 | `[193]` (10); 4.6–4.7 s per migrate-clean measured here |
| the §8.5 list itself | — | — | `[18]`, `[93]`, extended: the list exists and is closed; keep or convert is Q170-b |
| the other roles' reach (blocker 185's item) | — | — | `[185]`, extended: pinned as grants; RFC-2026-023's command roles and the platform stay owed |
| the lifecycle-visibility gap | — | Owner + A1: **Q170-a** | `[53]`, `[95]` (unchanged; this batch does not touch it) |

None is stop-the-line. No blocker's text is repeated in another: `[193]` names the others by index.

## 6. What is not done

- RFC-2026-021 §8.2's migration-text rule, §8.3's `exposed_views` widening, and the replacement of the
  industry-catalog test (F8, `[115]`).
- Column-level classification (F3), the twelve open tables (F2) and the F1 decision (Q170-d).
- The lifecycle helper (Q170-a), any conversion of the inherited grants to views (Q170-b), and any
  reading of the provisioned instance (Q170-c).
- The role runs: C0, Q0 and A1 review this branch after it is pushed. Nothing here is reviewed, tested by
  an independent role or approved.

## 7. Decisions not taken (the plan's Q-ids, and one new)

Each is UNANSWERED. A0's recommendation is the phase plan's (lines 224-226) for Q170-a/b/c, and A0's own
for Q170-d.

| Q-id | Owner | Question | A0's recommendation |
|---|---|---|---|
| Q170-a | Owner + A1 | Close the `access_blocked` gap with an RFC amending RFC-020, so that `app_authz` can read `workspaces.lifecycle_state`? | **Yes.** One helper change fixes every family at once; without it PII-2 rows stay readable after access is blocked. Nothing here touches `app_authz`'s grants, which rule 7 now pins as measured (`app_authz` SELECT on 4 columns of `workspace_members`), so the RFC's grant change will show as a one-line diff in `pinned-grants.json`. |
| Q170-b | Owner | Keep the inherited base-table grants as a closed exceptions list for Pilot, or convert them to views before Pilot? | **Closed list now, conversion per family later.** No client contract changes before the BFF exists. The list is closed as measured (41 rows) and nothing is converted. *Review round (C0 F1, A1 R4):* "inherited" is a reading. RFC-021 §8.5 names the grants of `010`, `020` and `021`; only 10 of the 41 rows come from them (010 ×5, 020 ×4, 021 ×1), and the other 31 come from 13 later migrations (030, 040, 051, 061, 070, 080, 081, 090, 091, 100, 120, 121, 130). **Closing at 41 accepts those 31 as §8.5 exceptions.** So the question also asks A1 (RFC-021's owner) and the Owner which grants count as inherited. |
| Q170-c | A0 | Who measures the provisioned instance's Data API, Realtime and default ACLs, and when? | **A0 runs a read-only catalog measurement before G1.** It is also what F13 needs before rule 7 can be read on that instance. |
| Q170-d (new, from F1) | A1 + Owner | For PROVIDER-3 and INTERNAL-3 tables, does rule 17 read "no client privilege", as drafted, or "only a pinned safe projection", as ERD §9.1 says ("safe projection only", "redacted status only", `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:448`, `:453`)? | **A pinned safe projection:** for each such table, an allowlist of the exact columns a client may read, and every other client privilege refused. It matches §9.1, keeps what 120 and 121 expose on purpose reviewable column by column, and lets the ERD owner classify `published_posts` and `performance_snapshots` without rule 17 failing. Until it is answered, rule 17 stays as drafted, which passes only because those tables are unclassified (F2). *Review round (C0 F2): the two answers above are not the only ones.* (c) **Column classification as the vehicle:** the ERD owner classes the 120/121 tables CONTENT-2 and their provider columns PROVIDER-3, and rule 17's column half does the work with its wording unchanged. (d) **Separate answers per class:** §9.1 gives INTERNAL-3 "redacted status only" and PROVIDER-3 "safe projection only", so the two need not share one answer. **Coupled with Q170-b and RFC-021 §3:** in RFC-021's vocabulary a client projection is an allowlist ENTRY (a `security_invoker` view, column grants, a policy, a row carrying `sensitivity`), so a "pinned safe projection" on the base table may contradict a Q170-b answer of "convert to views". **What exists already:** `pinned-grants.json` pins every table's exact client columns, so the recommendation's real change is a class-aware rule, not a new list. The recommendation stands. |

## 8. Cleanup

The draft's cluster was stopped and removed at the end of the draft run. This branch's cluster on
127.0.0.1:5507 was created afresh for each round (r1, d1, r2), stopped and its data directory removed
after each; port 5507 is free at the end. No other port was touched. `140_audit.sql` is byte-identical
to its saved copy (sha256 `2ac596bb950e8dfb11d9e45172f24305698ecddb4d3e8380114e2bfc1ad37149`).

## 9. Review round (2026-10-04)

A subagent of `/claude/a0_atlas` wrote this section on the branch name, starting from head `db995b6`. It
fixes and records. It approves nothing and decides none of Q170-a..d. It adds no migration, no policy, no
grant and no role. Every change makes a rule stricter or corrects text, and no rule is weakened. One check
in the generator was relaxed, as C0 F7(b) asked: a migration-text grant that the catalog no longer holds is
now reported instead of refused. The generator is a reviewer's tool, not a gate, and both probes still read
the catalog against the committed files.

### 9.1 Cherry-pick map

| review | source commit (branch) | here |
|---|---|---|
| C0 contract review | `5a97b45` (`review/c0-batch-170-assert`) | `6012674` (`-x`) |
| A1 security review | `401c0d3` (`review/a1-batch-170-assert`) | `a4e798d` (`-x`) |
| Q0 independent test | `75d2e3a` (`review/q0-batch-170-assert`) | `ede313c` (`-x`) |

Each pick added one new file and applied cleanly. The branch name was checked out in the Author's other
worktree (`wf_92f29736-8c0-1`). Before this worktree took the name with `--ignore-other-worktrees`, that
worktree's files were compared with `db995b6` using `diff -rq`. There was no difference, so it held nothing
uncommitted or untracked.

### 9.2 Finding → change → measured

"Round" means a fresh-cluster round from §9.3. In each one the drift is appended to `140_audit.sql` and then
restored.

| finding | change | measured |
|---|---|---|
| A1 R1, Q0 Q-1 (MEDIUM): a non-client role's SET ROLE reach was read by no layer (d03, d02b, G17); blocker 185 said that reach "is now pinned" | Rule 4 of the pinned grant probe (`scripts/db/run.mjs`, `PINNED_ROLE_MEMBERSHIPS = []`) now reads every non-superuser, non-`pg_*` role's memberships from `pg_auth_members`. It reads them recursively and whatever the INHERIT, SET or ADMIN option, as `<member> -> <role>`, with a self-test drift: a role granted to a NOINHERIT role, a membership two roles deep, and `pg_monitor` granted to `service_role`. Static: the recursive CTE, and the empty pin. Blocker 185's claim is narrowed to "table and column grants" | d03 and d04b: migrate-clean **2**, "role membership(s) of a non-superuser role not pinned … app_command -> app_worker" (d04b: "app_command -> pg_monitor", and the three roles it reaches). On the clean set none is pinned and none exists (r1, r2: mc 0) |
| A1 R1 (d01, d02b), Q0 Q-5 (G18): a new superuser, or a role made one, read as nothing | Rule 3: the superuser set is `session_user` (the migration owner) alone, with a drift for a new superuser and for `alter role app_command superuser`. Static regex | d01, d02b, G18: mc **2**, "superuser role(s) other than the migration owner …: probe_su" (`probe_su2`, `app_command`) |
| A1 R2, Q0 Q-2 (MEDIUM): a definer view (d05b, `alter view … reset (security_invoker)`) and a matview (d06, T07) over SECRET-4 passed every layer | Rule 1 also names `not a table: <rel> (relkind v\|m\|f)` for anything in `app`/`private`. Its drift adds a matview in `app` over `private.meta_credential_references` and a view in `private`, each granted to a non-client role. The static "no migration creates a view" regex in `identity-isolation.test.mjs` now reads `(?:materialized\s+)?view`. The batch that writes RFC-021's first allowlist view must admit it in this rule (owed on `[115]`) | d05b: mc **2**, "not a table: app.probe_v2 (relkind v)". d06: mc **2**, "not a table: app.probe_mv (relkind m)" |
| A1 R3 (LOW): a grant to a predefined `pg_*` role is not read; the handoff said "any non-superuser role" | The handoff says "non-superuser, non-`pg_*`". The d04b path is now named where a role BECOMES `pg_monitor` (rule 4). A grant TO a `pg_*` role on an app/private relation is still not read, and is owed on `[185]`. README rule 7 states this | d04b: mc **2** by rule 4, as above |
| A1 R4, C0 F1 (LOW): "inherited" in §8.5 is 10 rows from 010/020/021 plus 31 from 13 later migrations | The 10/31 split, and the fact that closing at 41 accepts the 31, are now stated in: the exceptions file's `_what` (and the generator's copy, so `--check` still matches); §7 Q170-b; the disposition's Q170-b row; `[18]` (which no longer says "as §8.5 asks" as a fact); `[93]`; and README rule 16. Which grants count as inherited is put to A1 and the Owner. No data changed | Split counted from `granted_by`: 010 ×5, 020 ×4, 021 ×1; 31 rows from 030 … 130. Generator `--check` 0 (r1) |
| C0 F2 (LOW): Q170-d offered two answers | §7 Q170-d and the disposition row add: column classification as the vehicle; separate answers for INTERNAL-3 and PROVIDER-3; the coupling with Q170-b and RFC-021 §3; and the fact that `pinned-grants.json` already pins client columns. The recommendation stands | text |
| C0 F3 (LOW): the entry side of rule 2 checks two of §3's five objects | Recorded on `[115]` and in README rule 16, owed before the first entry lands. Inert while `[]` | text |
| C0 F5 (LOW): `performance_snapshots.payload`; `_rule` missed the single-table resolution | `_columns` now names `metrics` ("the column 121 calls 'the payload'", `121_publisher_metrics.sql:297-298`). `_rule` adds the case of a table named by no §5 row that is resolved INTO a refused class by §9.1's own example (`billing_webhook_receipts`) | `metrics jsonb not null` at `121_publisher_metrics.sql:161` |
| C0 F6, A1 R7 (LOW/INFO): `4d9c9ac`'s message says floors 525 → 590 | None: pushed history is not rewritten. Plan §0 already discloses this | — |
| C0 F7, Q0 Q-6 (LOW): the generator is narrow and unexercised | `generate-pinned-grants.mjs` now reads `anon` as well as `authenticated` (a PUBLIC grant reads as both). A migration-text grant the catalog no longer holds (a later REVOKE) is reported on stderr instead of refused. MAINTAIN is read only on 17+. A refusal exits **3** with no stack trace, where `--check` differences exit 1. The header and README rule 7 say it is a reviewer's tool, not a gate; `[193]` (11) records that a contract test running `--check` needs a database and is owed if the Integration Owner wants one | clean r1: `--check` **0**. G11 (table-wide SELECT): exit **3**, "REFUSED, nothing written: a table-wide client SELECT for authenticated on app.user_profiles". G13 (anon column SELECT): exit **1**, both files "DIFFERS" (the anon row is now rendered; before, the exceptions file "matched") |
| A1 R5 (LOW): README rule 17's heading claimed "or column" | The heading now reads "a TABLE …; the column half is empty until the ERD classes columns". `[193]` (13) records A1's projection remedy as tied to Q170-d | text |
| Q0 Q-3 (LOW): a new non-client schema escapes | Recorded on `[185]` as STILL OWED (a closed list of non-system schemas). It is not done here: doing it means deciding what the platform's schemas are, which is Q170-c's measurement | T02: mc **0**, rs 0, gen 0. **Still passes every layer, as recorded** |
| Q0 Q-4 (LOW): the comment's counts | `run.mjs` now says `app_worker` holds privileges on 51 tables, `authenticated` on 41 and `app_authz` on 1 | counted from `pinned-grants.json` |
| Q0 Q-5 (LOW): weakenings invisible once the digest is refreshed | The role CTE assertion is now anchored to the end of the line and counted (2). A new assertion requires the classification SQL to hold the exact refused-table array. An `anon` column grant is added to the pinned grant column drift. `rolsuper` is held by rule 3 | W1b (`and rolname <> 'anon'` on one role CTE) makes the count 1: red. W2b (`billing_webhook_receipts` dropped from the SQL) makes the array check false: red. Both were measured in memory against the module |
| C0 INFO-1 | None needed: commit titles overstate, but README rule 17 is exact. Not rewritten | — |
| Small items (C0 §4 end, Q0 Q-8) | The handoff's reviewer citation is now `run.mjs:1221` (the section) and `:1287` (the SQL). `e3f1db7`'s "ten drifts" is nine drifts plus the clean row. It is recorded here and not rewritten | — |

**Owed from this round (nothing else).** On `[185]`: a grant TO a `pg_*` role (A1 R3), and relations
outside `app`/`private` (Q0 Q-3, A1 d13). On `[115]`: C0 F3, and admitting the first allowlist view in rule
1. On `[193]`: (11) a `--check` contract test if wanted, (12) Q170-d widened, and (13) A1 R5's projection,
which waits for Q170-d. Each needs either a decision or the provisioned-instance measurement, so none is a
bounded change here.

### 9.3 Measured (Node `v24.20.0`, checked before each run; on the branch name)

Cluster: 127.0.0.1:5507 only, TCP only, `initdb --locale=C -A trust -U postgres` afresh every round,
`LC_ALL=C`, and the shim first. Scripts are in `a0-170-assertr2/` (`round.sh`, `drive.sh`,
`drifts/*.sql`). `140_audit.sql`'s sha256 began `2ac596bb950e8dfb` after every round.

| command | exit | result |
|---|---|---|
| `node --test test-kits/db/foundation-contract.test.mjs tests/db/identity/identity-isolation.test.mjs` | 0 | 385 / 385 |
| the guard's own count (`a0-170-assertr2/count.mjs`) | n/a | foundation-contract **793** (788 → 793), 80 tests; identity-isolation 2167, 305 tests. Name digests unchanged |
| pinned grant probe digest | n/a | `7a8fe3e222e6827f` → `baa6379790cb8733`; read allowlist and data classification digests unchanged |
| `npm run regenerate:manifest` | 0 | 88 digests |
| `npm run check` (before the commit) | 0 | tests 684, pass 684 |
| `node scripts/verify-branch-scope.mjs 2f6ab9e WP-0A-DB-00` | 0 | "all 22 changed path(s) are declared" |
| r1 (clean): shim / `make db-migrate-clean` / `make db-rls-smoke` ×2 / generator `--check` | 0 / **0** / **0**, **0** / **0** | pinned grant: "… no other relation is there, each owned by a superuser, no superuser but the migration owner exists, every non-superuser role is a member of exactly the 0 pinned role(s) … 43 table-level and 1328 column-level … (self-test: refused each of its 6 drifts)"; read allowlist 0 + 41; classification 66 / 8 / 0; post-migrate 49 / 37 / 12; 1079 isolation cases each run; 6 authz claims |
| drift rounds d01, d02b, d03, d04b, d05b, d06, G18 (mc / rs) | **2** / 0 each | named as in §9.2 |
| T02 (mc / rs / gen) | 0 / 0 / 0 | still passes, owed on `[185]` |
| G11, G13 (mc / gen) | **2** / **3**; **2** / **1** | as in §9.2 |
| r2 (clean, on the committed tree) | see the PR body | recorded after the commit |

`npm run check`, `npm run check:handoff` and `npm run verify` after the handoff refresh are recorded in the
PR body, not here. Port 5507's cluster was stopped and its data directory removed after every round.
