# Batch 141 preparation: plan, item to change to test, measured

**Package:** `WP-0A-DB-00`. **Branch:** `agent/claude/WP-0A-DB-00-batch-141-prep`, cut from main
`c5a648e` (PR #168, batch 129, merged by A0 at its reviewed head `999456d` under the Owner's standing
delegation, `product-owner-disposition-2026-10-03-batch-127.md` §6).

Written 2026-10-03 by a subagent of the Author run `/claude/a0_atlas`. It is the Author's record. It
approves nothing, decides none of the plan's Q-ids, and adds **no migration, no policy and no grant**.
Its disposition is `product-owner-disposition-2026-10-03-batch-141-prep.md` in this directory.

This file began as the draft record `a0-batch-141-prep-draft-2026-10-03.md` (`c65bca7` on the local
branch `draft/wp-db00-141-prep`, cut at `75c9274`) and was moved here with `git mv`. Everything below
is re-measured on this branch unless it says otherwise.

The source of the work is the phase plan `a0-phase-plan-141-170-2026-10-03.md` (committed by this
batch), "Batch 141 -- 3. Can do now", items (a) to (e). The reason is the Owner's direction of
2026-10-03, transcribed in the disposition: the assertion-hardening chain ended at 129, and A0 does now
the 141/150/160/170 work that needs no pending decision.

## 1. Commits on this branch

| commit | what |
|---|---|
| `3d9ede0` | the draft's `e99757a`, cherry-picked. Two conflicts: `scripts/test-suite-contract.mjs` (batch 129 had moved the same floor) and `test-kits/integrity-manifest.json`. Resolved by keeping 129's comment and taking the guard's own count (§3). |
| `b6c0206` | the draft's `c65bca7` (the draft record and the map note's measured dates), cherry-picked without conflict. |
| `b99218e` | packaging: branch slot, increment rationale, blockers 33 and 191, the coverage map's support row, the pinned blocker lines, the integrity manifest. |
| next | this plan (moved from the draft record) and the disposition. |
| last, alone | `npm run refresh:handoff`, then the handoff's text fields. |

## 2. Item, change, and the test that holds it

| item | change | held by |
|---|---|---|
| (a) §8.4 "Audit/security INSERT" classified `carried` on `app.audit_logs` and `app.security_events`. No policy is written. | `db/foundation/lint/service-policy-map.json`: two `cells` rows, `batch: 140_audit.sql`, and the note `_what_batch_140_classified_in_141_prep` (line 153) | `foundation-contract.test.mjs:3314` (new), and `servicePolicyMapLint` / `servicePolicyMapCheck` (`scripts/db/run.mjs:2608`, `:2680`) through `make db-schema-lint` (`run.mjs:3202-3203`) and the existing map tests from `foundation-contract.test.mjs:1656` |
| (b) Audit coverage map: 9 rows, one or more per SEC-009 class plus the two owed actions | `db/foundation/lint/audit-coverage-map.json` | `foundation-contract.test.mjs:3340` (new) |
| (c) Static conformance between `app.audit_logs` and CTR-AUD-001, in both directions, the four declared divergences and four undeclared ones pinned as a closed list | `test-kits/db/fixtures/ctr-aud-001/store-conformance.json` | `foundation-contract.test.mjs:3437` (new) |
| (d) CTR-AUD-001 fixtures: 4 valid (each storable) and 8 invalid (each fails for exactly one stated reason), validated with `test-kits/contracts/json-schema-subset.mjs`. No new dependency. | `test-kits/db/fixtures/ctr-aud-001/{valid,invalid}-*.json` | `foundation-contract.test.mjs:3515` (new) |
| (e) The phase plan, committed with a provenance header; nine file:line citations corrected in place (its header lists them) | `evidence/WP-0A-DB-00/a0-phase-plan-141-170-2026-10-03.md` | none: a record, not a rule |
| (f) Packaging: the branch slot and the increment rationale naming every file amended outside ownership | `work-packages/WP-0A-DB-00.json` (`ownership.branch`, `amends_without_owning`), `test-kits/branch-identity.test.mjs` | `npm run check:handoff`, `node scripts/verify-branch-scope.mjs`, `branch-identity.test.mjs` |
| (g) Every draft finding owed with a named owner or cross-referenced (§5) | `open_blockers[33]` extended; `open_blockers[191]` new; the coverage map's support row cites 191 | the coverage-map test reads each cited blocker's index, line and quote (`foundation-contract.test.mjs:3387-3394`) |

How (a) follows RFC-2026-022 §7.2. §3's table classes this cell CARRIED (RFC-022:175), and §7.2 uses
it as its example (RFC-022:504-514). The example's fields are `statement`, `class`, `tables`, `role`
and `rfc`. The register's lint has a closed field set,
`CELL_FIELDS = ['cell', 'table', 'operation', 'shape', 'why', 'batch']` (`scripts/db/run.mjs:2606`),
and keys rows on `(table, operation)`. So the example is written in the register's shape: one row per
table, `class` as `shape`, `statement` as `operation`, and no `role`. A row naming `app_worker` would
read as the authorisation RFC-022 §5/8 withholds. That mismatch is F9 below.

## 3. Floors, digests, manifest, verification record

- `scripts/test-suite-contract.mjs`: foundation-contract tests 73 -> 77 and the name digest
  `c125bbd792fa8a92` -> `a91ced9f62276ebe`, both from the draft and unchanged by the cherry-pick (129
  added and renamed no test). The **assertion floor 525 -> 613**. The draft had 500 -> 564 on its base.
  On this branch the guard, with the floor set out of reach, printed
  `test-kits/db/foundation-contract.test.mjs makes 613 assertion(s)`. Main `c5a648e` makes 549 by the
  same count: batch 129 moved the floor to 525 and its review round added 24 more without moving it.
  So 613 is 549 plus this batch's 64.
- `test-kits/integrity-manifest.json`: regenerated, 88 digests.
- `evidence/VERIFICATION.md`: re-recorded by `npm run record:verification`, 677 -> 681. It is declared
  in `amends_without_owning` (draft finding F10).

## 4. Measured on this branch

Node `v24.20.0` (`node -v` before every measured run; `/Users/bank/.local/node-v24.20.0/bin/node` is
first on PATH, and `/opt/homebrew/bin/node` was not used).

| command | at | exit | result |
|---|---|---|---|
| `npm run check` | `b99218e`'s tree, before the handoff refresh | 1 | tests 681, pass 679, fail 2. The two failures are both the handoff guard: `the handoff for this branch describes this branch` ("cites head 6ea446c, after which 17 substantive path(s) changed") and the ratchet test that runs the same suite on an unmodified copy. Expected until the last commit refreshes the handoff. |
| `node scripts/commit-when-clean.mjs` (packaging commit) | `b99218e` | 1 | refused, `NOT clean: exit 1 -- tests 681, pass 679, fail 2`, the same two handoff tests. `b99218e` was therefore a plain commit, because the sole red was the not-yet-refreshed handoff guard. `3d9ede0` and `b6c0206` are cherry-picks. |
| `node scripts/verify-branch-scope.mjs c5a648e WP-0A-DB-00` | `b99218e` | 0 | `all 23 changed path(s) are declared, and every amendment explains one`. Before the branch-identity edit was committed it exited 74 (`declares 1 amendment(s) that explain nothing this branch changed: test-kits/branch-identity.test.mjs`), which is the guard working. |
| `make db-schema-lint` | static, no database | 0 | `db-schema-lint: ok`. This is the only target that reads the service-policy map (`run.mjs:3202-3203`). |
| `make db-contract-check` | static | 0 | ok |
| reversal probes (`a0-141-prepr/probes.mjs`, private scratchpad; the draft's 25 plus 3) | each a one-file mutation, restored byte for byte | 0 | **28 of 28 bite.** The draft's P10 (blocker line set to 275) now sets 276, because 275 is the correct line on this branch. New: P26, the support row citing blocker 191 on the old line 444; P27, blocker 191 losing its support sentence; P28, blocker 33 losing "four divergences are declared in the migration header". `git status` was empty afterwards. |
| `make db-migrate-clean`, `make db-rls-smoke` | not run | n/a | No input of the live layers changed: no migration, invariant, fixture SQL, isolation case or CI file. The only DB-layer file touched is the service-policy map, which only the static `schema-lint` target reads. No cluster was started, so none was left to remove. |
| `npm run check`, `npm run check:handoff`, `npm run verify` | after the handoff refresh, on the branch name | | recorded in the handoff and the PR, not here, because this file is committed before that commit. |

## 5. Findings and where each is owed

| # | finding | where it is owed |
|---|---|---|
| F1 | `audit_id` (contract: string, minLength 1, `ctr-aud-001/schema.json:22`) is stored as `id uuid primary key default gen_random_uuid()` (`140_audit.sql:418`): a rename and a narrowing, undeclared. Pin: `store-conformance.json:52`. | `open_blockers[33]`, owed to **Q141-b (A0+A6)** |
| F2 | CTR-TEN-001's scope ids are strings; the store's are uuid (`140_audit.sql:419-421`). 140 declares the flattening, not the narrowing. Pin: `store-conformance.json:53`. | `open_blockers[33]`, Q141-b (A0+A6) |
| F3 | `actor`, `correlation_id`, `causation_id` are carried twice in the contract (and `correlation_id` a third time in `error`), with nothing checking the copies agree (`ctr-aud-001/manifest.json:92`, item 3); the store has one column each (`140_audit.sql:423-424`, `:429-431`). Pin: `store-conformance.json:54`. | `open_blockers[33]`, Q141-b (A0+A6) |
| F4 | `created_at` has no contract property; explained in a comment (`140_audit.sql:439`), not declared. Pin: `store-conformance.json:55`. | `open_blockers[33]`, Q141-b (A0+A6) |
| F5 | No contract governs `app.security_events` (`140_audit.sql:572`); the conformance covers `app.audit_logs` only. Pin: `store-conformance.json:58`. | `open_blockers[33]`, A0+A6 with Q141-b |
| F6 | A rights change and a schedule transition fit none of SEC-009's six categories, which the contract's enum and `audit_logs_action_category_known` (`140_audit.sql:447-448`) close. Rows: `audit-coverage-map.json:122`, `:136`. | `open_blockers[33]`, A0+A6 with Q141-b; cross-referenced to `open_blockers[156]` and `[190]` (f) |
| F7 | Support/break-glass has no table, and until this batch no blocker named it. Row: `audit-coverage-map.json:106`. | `open_blockers[191]` (1), owed to **A1** (SEC-016) and to batch 141 under Q141-a; the no-writer state is `open_blockers[21]` |
| F8 | `catalog-snapshot.json` (2026-09-06) declares 140 not applied, so the coverage map's tables are checked against the migrations; the test fails the day the snapshot says otherwise. | `open_blockers[191]` (4), owed to **A0** when 140 is applied |
| F9 | RFC-2026-022 §7.2's sketch does not fit the register's closed shape (`run.mjs:2606`). | `open_blockers[191]` (2), owed to **A1** (RFC-2026-022's author) with A0 |
| F10 | `evidence/VERIFICATION.md` was outside `writable_paths` and `amends_without_owning`; the draft's branch-scope run exited 73. | **Closed here**: declared in the rationale; `verify-branch-scope` exits 0 |
| F11 | The draft's branch was not the manifest's branch slot; `check:handoff` exited 75. | **Closed here**: the slot is `agent/claude/WP-0A-DB-00-batch-141-prep` |
| F12 | Nine citations in the phase plan were wrong. | **Closed by the draft**: corrected in place; the plan's header lists them |
| F13 | §8.4 "Security event details" SELECT (RFC-022:180, CARRIED "with a caveat") is not classified. | `open_blockers[191]` (3), owed to **A1** |
| F14 (new) | Declaring `evidence/VERIFICATION.md` added one line above `open_blockers`, so every blocker moved down one line; the coverage map's pinned lines caught it, and all were moved +1. `open_blockers[i]` is now on line **254+i** (the phase plan's "253+i" describes `75c9274`). A future change to the ownership block will move them again; the pins are meant to fail then. | recorded here; no owner needed |

## 6. Decisions this batch does not take

From the phase plan's "Batch 141 -- 4. Decisions needed", each **UNANSWERED**:

- **Q141-a (Owner + A1): how is an audit row produced?** (A) a database trigger, (B) application
  command or worker only, (C) a hybrid. *A0 recommends B for G1, with an RFC written now.* Every
  coverage-map row says `producer_path: "UNDECIDED"`, and the test refuses any other value.
- **Q141-b (A0+A6): freeze CTR-AUD-001 as batch 140 reads it, or move it first?** *A0 recommends
  countersigning 140's reading.* F1-F6 are new input: countersigning now countersigns F1-F4 by name.
- **Q141-c (A1): is tamper resistance (the trigger) enough before Paid Beta, or is tamper evidence
  required?** *A0 recommends resistance only until G1, recording the gap as an accepted risk.*

Not done, and why:

- **The producer-architecture RFC.** It needs a writable-path amendment first; the only writable RFC
  paths are 021-025.
- **Policies, migrations, grants.** RFC-2026-022 is approved and not in effect
  (`service-policy-map.json:15`), and RFC-2026-023 is in review.
