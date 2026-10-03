# Batch 141 preparation: draft record

Drafted 2026-10-03 by a drafting subagent of the Author run `/claude/a0_atlas`, WP-0A-DB-00, on the
local branch `draft/wp-db00-141-prep` cut at main `75c9274`. It is the Author's draft and nothing
more. It approves nothing, decides none of the plan's Q-ids, adds **no migration**, and is not
pushed. It does not edit the handoff, the manifest's branch slot or rationale, or any blocker text.

The plan is `a0-phase-plan-141-170-2026-10-03.md` in this directory, "Batch 141 -- 3. Can do now".
Its five items (a) to (e) are below. The reason for this work is the Owner's direction, relayed by the
Author run: the assertion-hardening chain ends at 129, and A0 does now the 141/150/160/170 work that
needs no pending decision. No new Owner words are transcribed here.

## 1. Item, file, and the test that holds it

| item | file(s) | held by |
|---|---|---|
| (a) §8.4 "Audit/security INSERT" classified `carried` on `app.audit_logs` and `app.security_events`. No policy is written. | `db/foundation/lint/service-policy-map.json` (two `cells` rows, `batch: 140_audit.sql`; note `_what_batch_140_classified_in_141_prep`) | `foundation-contract.test.mjs:3193` (new); also `servicePolicyMapLint` / `servicePolicyMapCheck` (`scripts/db/run.mjs:2330`, `:2402`) via `make db-schema-lint` and the existing map tests at `foundation-contract.test.mjs:1655-1890` |
| (b) Audit coverage map: 9 rows, one or more per SEC-009 class plus the two owed actions. | `db/foundation/lint/audit-coverage-map.json` | `foundation-contract.test.mjs:3219` (new) |
| (c) Static conformance between `app.audit_logs` and CTR-AUD-001, in both directions, with the four declared divergences and four undeclared ones pinned as a closed list | `test-kits/db/fixtures/ctr-aud-001/store-conformance.json` | `foundation-contract.test.mjs:3316` (new) |
| (d) CTR-AUD-001 fixtures: 4 valid (each one storable) and 8 invalid (each fails for exactly one stated reason). Validated with the repository's own `test-kits/contracts/json-schema-subset.mjs`. No new dependency. | `test-kits/db/fixtures/ctr-aud-001/{valid,invalid}-*.json` | `foundation-contract.test.mjs:3394` (new) |
| (e) The phase plan, committed with a provenance header. Every file:line citation was verified and nine were corrected in place (the header lists them). | `evidence/WP-0A-DB-00/a0-phase-plan-141-170-2026-10-03.md` | none. It is a record, not a rule. |

How (a) follows RFC-2026-022 §7.2. §3's table classes this cell CARRIED (RFC-022:175), and §7.2
uses it as its own example (RFC-022:508-511). The example's fields are `statement`, `class`,
`tables`, `role` and `rfc`. The register's lint has a closed field set,
`CELL_FIELDS = ['cell', 'table', 'operation', 'shape', 'why', 'batch']` (`scripts/db/run.mjs:2328`),
and refuses every other key. It also keys rows on `(table, operation)`. So the example is written in
the register's shape: one row per table, `class` becomes `shape`, `statement` becomes `operation`,
and there is no `role`. The lint and its tests decided this, not the draft. A row naming `app_worker`
would read as the authorisation RFC-022 §5/8 withholds.

Floors moved only to what the guard reported. `scripts/test-suite-contract.mjs:87`: foundation-contract
tests 73 -> 77. `:177`: assertions 500 -> 564, read by setting the floor out of reach and taking the
guard's printed count. `:217`: name digest `c125bbd792fa8a92` -> `a91ced9f62276ebe`.
`test-kits/integrity-manifest.json` was regenerated (88 digests). `evidence/VERIFICATION.md` went from
677 to 681, written by `npm run record:verification`.

## 2. Measured

Node `v24.20.0`, by `node -v` in the worktree. The PATH also has `/opt/homebrew/bin/node`, which was
not used.

| command | where | exit | result |
|---|---|---|---|
| `npm run check` | base `75c9274`, on this branch name, before any edit | 0 | tests 677, pass 677 |
| `npm run check` | working tree before the manifest regeneration | 86 | `evidence/VERIFICATION.md — content does not match its recorded digest` (expected, fixed by regenerating) |
| `npm run check` | final tree | 0 | tests 681, pass 681, fail 0, skipped 0, todo 0 |
| `node scripts/commit-when-clean.mjs` (commit 1) | `e99757a` | 0 | `clean: exit 0 — tests 681, pass 681, fail 0, skipped 0, todo 0` |
| `make db-schema-lint` | static, no database | 0 | `db-schema-lint: ok`. This target reads the service-policy map. |
| `make db-contract-check` | static | 0 | ok |
| reversal probes (`a0-141p/probes.mjs`, private scratchpad) | 25 one-file mutations, each restored byte-for-byte | 0 | **25 of 25 bite.** They cover: map row removed or flipped; coverage table, producer, blocker, index, line, id, §8 cell, or support row broken; conformance un-pinned or re-declared; CTR-AUD-001 adding a property, widening the category enum, requiring `causation_id`, or changing `reason_key.maxLength`; CTR-TEN-001 dropping `locale`; 140 adding a column, changing a length, or growing a service policy; fixtures made disagreeing, non-uuid, valid, or doubly invalid. The contract-catalog and migration mutations were reverted. `git status` showed only this draft's files afterwards. |
| `node scripts/verify-branch-scope.mjs 75c9274 WP-0A-DB-00` | after `e99757a` | **73** | `changed 1 path(s) it neither owns nor records as an amendment: evidence/VERIFICATION.md`. See F10. |
| `npm run check:handoff` | this branch | **75** | `no work package declares ownership.branch "draft/wp-db00-141-prep"`. See F11. |
| `make db-migrate-clean`, `make db-rls-smoke` | not run | n/a | Not required. No input of the live layers changed: no migration, invariant, fixture SQL or isolation case. The only DB-layer file touched is the service-policy map, which only the static `schema-lint` target reads (`run.mjs:2884-2885`), and that target is measured above. |

## 3. Findings (gaps found, recorded, not papered over)

- **F1. `audit_id` is stored as `id uuid`, which is undeclared.** CTR-AUD-001 declares `audit_id`
  as a string with minLength 1 (`contract-catalog/shared-kernel/ctr-aud-001/schema.json:22`). The
  store has `id uuid primary key default gen_random_uuid()` (`140_audit.sql:418`). Neither the
  rename nor the type narrowing is one of 140's four declared divergences (WP:286). Every contract
  example (`aud_synthetic_0001` and the rest) uses an id the store cannot hold. The pin is
  `store-conformance.json:52`.
- **F2. The scope ids are narrowed from string to uuid, which is undeclared.** CTR-TEN-001 types
  `workspace_id`, `business_profile_id` and `page_context_profile_id` as strings
  (`ctr-ten-001/schema.json:1`). The store types them `uuid` (`140_audit.sql:419-421`). 140 declares
  the flattening, but not this narrowing. The pin is `store-conformance.json:53`.
- **F3. Two contract values go into one column, which is undeclared.** The contract carries `actor`,
  `correlation_id` and `causation_id` both at the root and inside `tenant_context`, and
  `correlation_id` a third time inside `error`. Its own note says nothing checks that the copies
  agree (`ctr-aud-001/manifest.json:92`, item 3). The store has one column for each
  (`140_audit.sql:423-424`, `:429-431`), so it cannot hold a contract-valid record whose copies
  differ, and no source says which copy a producer writes. The pin is `store-conformance.json:54`.
  The valid fixtures are held to agreeing copies.
- **F4. `created_at` has no contract property.** It is explained in a comment, not declared as a
  divergence (`140_audit.sql:439`). The pin is `store-conformance.json:55`.
- **F5. No contract governs `app.security_events`.** 140 builds it from §5 and §9.1 alone
  (`140_audit.sql:572`), and no shared-kernel schema names `event_type`, `source_ip_hash` or
  `user_agent_hash`. So item (c) covers only `app.audit_logs`. The gap is pinned at
  `store-conformance.json:58`, and the test fails if a contract later names those columns.
- **F6. Two owed actions fit no SEC-009 category.** These are a rights change
  (`audit-coverage-map.json:121`, open_blockers[156]) and a schedule transition
  (`audit-coverage-map.json:135`, open_blockers[190] (f)). CTR-AUD-001's enum
  (`schema.json:61`) and 140's `audit_logs_action_category_known` (`140_audit.sql:447-448`) admit
  only the six categories, so neither action can be recorded until someone maps it to a category or
  widens the enum. The rows carry `category: null` with the reason. `invalid-category-rights.json`
  and `invalid-category-schedule.json` show the refusal. This draft does not choose: CTR-AUD-001
  belongs to A0+A6, and the question sits beside Q141-b.
- **F7. Support/break-glass has no table and no blocker of its own.** SEC-016 is undelivered
  (`docs/plans/meta-security-production-ops-workstream-th.md:171`), and CTR-AUD-001 carries it as an
  accepted gap. No open blocker in WP-0A-DB-00 names support or break-glass. The row
  (`audit-coverage-map.json:106`) cites only the general no-writer blocker (open_blockers[21], WP:274)
  and says so.
- **F8. The catalog snapshot cannot check the coverage map.** `catalog-snapshot.json` was taken on
  2026-09-06 and declares 140 and every batch after 010 not applied (`catalog-snapshot.json:54`).
  The map's tables are therefore checked against `tablesCreatedByMigrations()`, the set
  `servicePolicyMapLint` itself uses. The test asserts the snapshot still declares 140 not applied,
  so the day 140 is applied it fails and asks for the snapshot check
  (`foundation-contract.test.mjs:3219`).
- **F9. RFC-2026-022 §7.2's sketch does not fit the register's declared shape.** The sketch
  (RFC-022:508-514) carries `statement`, `class`, `tables`, `role` and `rfc`. The register refuses
  all five (`run.mjs:2328`). Item (a) follows the register, as described in §1. If §7.2 is meant to
  be literal, the RFC or the `_shape` has to change in a reviewed diff. This draft changes neither.
- **F10. `evidence/VERIFICATION.md` is outside `writable_paths` and `amends_without_owning`.**
  Adding a test forces it to change, because `npm run check` asserts it byte-for-byte. The branch
  scope guard exits 73 on it. Batches 123, 125, 091 and 127 changed it too (`git log` shows
  `e5104bf`, `7fde2ef`, `43f4d96`, `f429fe6`). Declaring it is a manifest-rationale edit, which this
  draft may not make.
- **F11. This branch is not the manifest's branch slot.** `ownership.branch` is
  `agent/claude/WP-0A-DB-00-batch-128` (WP:76), so `check:handoff` exits 75. `npm run check` passes,
  because it does not run the handoff guard. A PR from this work needs the slot and rationale edit,
  which is the Author's to make on the real branch.
- **F12. Nine citations in the phase plan were wrong.** All are corrected in the committed copy, and
  its header lists them.
- **F13. One related cell is left unclassified.** §8.4 "Security event details" SELECT
  (RFC-022:180, CARRIED "with a caveat") is not classified, because the caveat is a decision this
  draft does not take.

## 4. Decisions this draft does not take

From the plan's "Batch 141 -- 4. Decisions needed", quoted:

- **Q141-a (Owner + A1): "how is an audit row produced?"** The options are (A) a database trigger,
  (B) application command or worker only, or (C) a hybrid. Every coverage-map row says
  `producer_path: "UNDECIDED"` and `producer_decision: "Q141-a"`, and the test refuses any other
  value. The service-map rows classify the statement, not its caller, and say so.
- **Q141-b (A0+A6): "freeze CTR-AUD-001 as batch 140 reads it, or move it first?"** The
  conformance file records 140's reading and the four undeclared divergences found in it (F1-F4).
  It countersigns nothing. F6 (no category for a rights change or a schedule transition) is new
  input for that question.
- **Q141-c (A1): "is tamper resistance (the trigger) enough before Paid Beta, or is tamper evidence
  required?"** Not touched.
- **Not done: the producer-architecture RFC.** The plan says it "needs a writable-path amendment
  first". The only writable RFC paths are 021-025 (WP:79-83).
- **Not done: policies, migrations, grants.** RFC-2026-022 is approved and not in effect
  (`service-policy-map.json:15`), and RFC-2026-023 is in review (RFC-023:3).

## 5. Commits

- `e99757a` contains items (a)-(e), the floors, the manifest and the verification record.
- The next commit contains this record and a one-sentence correction to the map note. The note
  first said 140 merged before the map existed without measuring it. `git log` shows
  `b0267f5` (140, 2026-09-07) before `2e08e57` (the map, 2026-09-08). The note now cites both.
