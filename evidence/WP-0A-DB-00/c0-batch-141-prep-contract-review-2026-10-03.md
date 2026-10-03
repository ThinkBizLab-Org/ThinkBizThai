# C0 contract review: batch 141's preparation

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-141-prep`, head
  `047a0e25acc1da54c14ef17aab17f6a124e8dfe7` over code `b99218e597d568f788a89ea2754b332ba39ca232`, base
  `c5a648e` (main). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/169>.
- **Review branch:** `review/c0-batch-141-prep`, checked out at the subject head `047a0e2`. This file is its
  only commit.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-141-prep-plan-2026-10-03.md`; the disposition
  `product-owner-disposition-2026-10-03-batch-141-prep.md`; the phase plan
  `a0-phase-plan-141-170-2026-10-03.md`; `git diff c5a648e..047a0e2` (25 files) and the five commit
  messages; RFC-2026-022 §3 (lines 165-185) and §7.2 (504-515); `scripts/db/run.mjs` 2590-2700 and
  3198-3206; `db/foundation/migrations/140_audit.sql` 105-135, 410-520, 725-745; CTR-AUD-001, CTR-TEN-001
  and CTR-ERR-001 schemas and the CTR-AUD-001 manifest; ERD §8 (the four matrices); SEC-009, SEC-016
  (`meta-security-production-ops-workstream-th.md:164`, `:171`) and OB-005
  (`module-contracts-events-jobs-workstream-th.md:337`); `open_blockers[6, 21, 33, 80, 150, 156, 167, 190,
  191]`; the handoff; the dispositions of batches 127 and 129 for the transcribed Owner words.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024 that makes this an independent-role run by configuration, not by provenance: I share the
Author's training and blind spots. Acceptance of this file as the C0 role's signature is the Integration
Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** The branch adds no migration, no policy, no grant and no role change (no path under
  `db/foundation/migrations/` changes against `c5a648e`). I ran the live layers anyway, on a fresh cluster,
  and both are green (§2). Nothing I found reaches a tenant boundary, a secret, a migration or a contract
  file.
- **Blocks the merge: no**, on the findings below, which are one MEDIUM and three LOW, plus two notes. None
  makes a statement in the batch false in a way that would mislead a decision. G1 (MEDIUM) and G2 (LOW)
  should be fixed or recorded as owed before merge, because the questions this review was asked are
  about completeness and about divergences being hidden. The RFC-2026-025 §5 points and the missing
  Integration Owner evidence are pre-existing and the disposition already says so; I do not count them
  again.
- **Answers to the four questions:**
  1. *The §8.4 classification* is **correct** under RFC-2026-022 §3 (line 175: CARRIED, "the row being
     written names its workspace") and fits the lint's closed schema (`CELL_FIELDS`, `run.mjs:2606`).
     One field reads against the register's own `_shape` (G4).
  2. *The coverage map* is **complete at the level of SEC-009's six classes** and the two owed actions,
     and **every blocker citation is true** (index, quote and line all measured, §3.2). It is **not**
     complete at the level its own `_what` claims, "one row per action SEC-009 and OB-005 name" (G1).
  3. *The CTR-AUD-001 conformance* is **faithful** to the contract (read-only: no file under
     `contract-catalog/` changes) and to `140_audit.sql` on columns, types, requiredness, enums, patterns,
     lengths and the redaction CHECK. **One divergence is not listed**: the store's not-blank CHECKs narrow
     the contract's `minLength: 1` (G2, measured live). F3's citation of the manifest overreaches (G3).
  4. *The phase plan's correction table* is **correct**: all nine corrections, measured against `75c9274`.

## 2. Measured, and how

Node `v24.20.0` (`node -v` before every measured run; `/Users/bank/.local/node-v24.20.0/bin/node` first
on PATH, the Homebrew Node not used). Measured on the branch NAME: the agent branch is checked out in
another worktree, so I checked it out here with `git checkout --ignore-other-worktrees` at the unchanged
ref `047a0e2`, measured, and returned to `review/c0-batch-141-prep`. The branch ref and
`origin/agent/claude/WP-0A-DB-00-batch-141-prep` were both still `047a0e2` afterwards, and `git status` was
empty throughout.

| command | exit | result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs c5a648e WP-0A-DB-00` | 0 | `all 25 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` | 0 | `describes the branch: nothing substantive after its cited head` |
| `npm run verify` | 0 | `clean: exit 0 — tests 681, pass 681, fail 0, skipped 0, todo 0` |
| `make db-schema-lint` | 0 | `db-schema-lint: ok` |
| `make db-contract-check` | 0 | `db-contract-check: ok` |
| assertion count, `foundation-contract.test.mjs`, by `\bassert\.\w+\(` on each tree | n/a | `75c9274` 502, `c5a648e` 551, `e99757a` 566, `047a0e2` 615. The guard's own figures are 2 lower on every tree (500, 549, 564, 613), so the deltas the Author states hold: main is 24 over its floor of 525, and this batch adds 64 to reach 613. |
| `git range-diff e99757a~1..c65bca7 c5a648e..b6c0206` | n/a | the two cherry-picks differ from the draft only in the floor comment and value (500->564 became 525->613), the two integrity digests that follow from it, and the added commit-message paragraph. `c65bca7 = b6c0206`. |
| PR #168 / run 37134594625 (`gh`, read-only) | n/a | merged at head `999456d`, merge commit `c5a648e`, `2026-10-03T15:55:36Z`; the run is "Bootstrap validation", `success`, on `999456d`. As the disposition says. |
| PR #169 (`gh`, read-only) | n/a | Draft, open, head `047a0e2`, base `main`; `bootstrap` check pass (run 37135988441). |
| live round, port 5505 (below) | 0, 0 | `db-migrate-clean: ok`; `db-rls-smoke: 1079 isolation case(s) passed`, `db-authz-proofs: ok` |
| live store insert (below) | n/a | the four `valid-*` fixtures each `INSERT 0 1`; a whitespace actor id refused by `audit_logs_actor_id_not_blank`; all five contract `valid-*` examples refused, `invalid input syntax for type uuid: "aud_synthetic_000N"` |
| my reversal probes, 16 (below) | n/a | 13 bite the four new tests; C13 and C14 survive them but bite the full suite; **C9 survives the full suite** |

**Live layers.** Nothing a live DB layer reads changed, so the Author's reason for not running them is sound
(see N1 for one imprecision in how it is worded). I ran one round anyway, to measure the claim "every valid
fixture is storable" against the real table rather than against the test's model of it. Private cluster
under `scratchpad/c0-141-prep/`: `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, TCP only on
127.0.0.1:5505 (`-c unix_socket_directories=''`), `db/foundation/ci/supabase-shim.sql` first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres make db-migrate-clean`. On that cluster, as
`postgres` in one transaction with a savepoint per document, all rolled back, I inserted each document into
`app.audit_logs` through `store-conformance.json`'s column-to-path reading. Then I stopped the cluster,
deleted it, re-ran `initdb`, loaded the shim, and ran `make db-migrate-clean` and `make db-rls-smoke` as one
clean round. The cluster is stopped and removed, and nothing listens on 5505. No migration was edited, so
no drift needed restoring.

**Reversal probes** (`scratchpad/c0-141-prep/probes.mjs`). Each mutates one file, runs the four
`batch 141 prep` tests (`--test-name-pattern`) and restores the file from the bytes read before the
mutation, checked with `Buffer.equals`. All 16 were restored.

| probe | outcome |
|---|---|
| C1 the `security_events` row reclassified `discovered` | bites (3314) |
| C2 the `audit_logs` row removed | bites (3314) |
| C3 a producer named on one coverage row | bites (3340) |
| C4 blocker 191 pinned one line low | bites (3340) |
| C5 the support row removed | bites (3340) |
| C6 `created_at` dropped from the reading | bites (3437) |
| C7 an undeclared divergence relabelled declared | bites (3437) |
| C8 a column added to `app.audit_logs` | bites (3437) |
| C9 `audit_logs_actor_id_not_blank` changed to `length(actor_id) > 5` | **survives, and survives the full `run-test-suite.mjs`** (G2) |
| C10 a property added to CTR-AUD-001 | bites (3437) |
| C11 a valid fixture given a non-uuid workspace | bites (3515) |
| C12 `reason_key` length 96 -> 97 in the store | bites (3437) |
| C13 the outcome/error biconditional weakened to one direction | survives the four tests; bites the full suite |
| C14 `audit_logs_delete_names_what_it_deleted` replaced by `check (true)` | survives the four tests; bites the full suite |
| C15 a coverage-map §8 cell renamed | bites (3340) |
| C16 `open_blockers[33]` loses "four divergences are declared in the migration header" | bites (3437) |

C13 and C14 are not a gap: earlier tests hold those CHECKs. I did not re-run A0's 28 probes. They are in
A0's scratchpad (`a0-141-prepr/`), and the plan's count of them is read, not measured.

## 3. Read and checked, not executed

### 3.1 The §8.4 rows (`service-policy-map.json:133-148`, note at `:153`)

- The `cell` text quotes ERD:401 exactly ("Audit/security INSERT | N | N | N | N | N | S"). There is one row
  per table, keyed `(table, operation)`, as the lint requires (`run.mjs:2659-2663`). The rows carry no key
  outside `CELL_FIELDS`, so none reads as an authorisation (`run.mjs:2654-2658`). Batch 100 had to correct
  exactly that risk.
- CARRIED is §3's own verdict (RFC-022:175). The `why` texts apply §3's operational test to the statement,
  not to the caller, and reject the one case that would be DISCOVERED: a security event whose workspace is
  only known after reading. They reject it correctly, because `security_events.workspace_id` is NOT NULL,
  so such an event is not this statement (140_audit.sql:290, "NO PLATFORM-SCOPE RECORD").
- What the rows state about the code is true: `app_worker` holds SELECT and INSERT and no policy
  (140_audit.sql:740-741), and RFC-022 is NOT IN EFFECT (`service-policy-map.json:15`, RFC-022:412-420).
  The note is also true: the map had zero `audit` hits at `75c9274`, `b0267f5` (140) is dated 2026-09-07 and
  `2e08e57` (the map) 2026-09-08, and the CTR-TEN-001 trust-boundary quotation is verbatim.
- The test (3314) asserts that no migration after 140 writes a policy on either table. It reads comment-stripped SQL.

### 3.2 The coverage map (`audit-coverage-map.json`)

- I recomputed every `{index, line, quote}`: all 13 hold. The quote is in the blocker, and the blocker's
  JSON opening is on that line. `open_blockers` opens at line 253, so `open_blockers[i]` is on 254+i (F14).
  The free-text line numbers (`(line 410)`, `(line 444)`) hold too.
- Every `section8_cell` is a first-column string of an ERD §8 table. Every table exists in a migration (the
  test checks). SEC-009:164 and OB-005:337 are quoted verbatim, and DB-12's deliverable is WS:795.
- The citations make sense as well as matching text. Blocker 6 holds "Connect/disconnect/re-auth Meta"
  as owed to the command surface. Blocker 167 holds "cancel pending". Blocker 80 holds the billing write
  path. Blocker 150 holds the deletion manifest. Blocker 21 holds the no-writer state and §11.4 step 1.
  Blockers 156 and 190 (f) each say "batch 141" in so many words.
- F7's premise is measured: no `open_blockers` entry on `c5a648e` mentions break-glass or SEC-016.
- Completeness: see G1.

### 3.3 The conformance (`store-conformance.json`) and fixtures

- The column set equals 140's `audit_logs` body. Every leaf of CTR-AUD-001 with `$ref`s resolved is mapped
  or pinned, and never both. The leaves include CTR-ERR-001's `message_key`, `category`, `retryable`,
  `retry_after_seconds`, `field_errors` and `details`, and CTR-TEN-001's `locale` and `timezone`. NOT NULL
  follows requiredness at every step from the root, which is why `error_code` and the `change_*` columns
  are nullable. Enums, patterns (with `(?:` mapped to `(`) and maxLengths are compared to the CHECK text,
  and the redaction CHECK asserts all three flags.
- The four declared divergences are exactly 140's header list (140_audit.sql:109-131). F1, F2 and F4 are
  true as stated. F1 is measured live: none of the contract's five valid examples can be stored. On F3,
  see G3.
- The eight invalid fixtures each fail with exactly one validator error, at the stated path. The four valid
  fixtures span four categories (delete, billing, publish, role). Each is storable, measured live.
- No file under `contract-catalog/` changes, so the reading is read-only.

### 3.4 The phase plan's correction table (`a0-phase-plan-141-170-2026-10-03.md:14-24`)

Each "corrected to" line, printed at `75c9274`:

- WP:79-83 is the five RFC paths 021-025. WP:96 is `"docs/**"`, and WP:56 is `"exclude": [`.
- RFC-022:504 is the §7.2 heading. Its example is 508-515 (the closing fence is at 515; the table's
  "508-514" counts the JSON lines and is fine).
- WP:382 is `open_blockers[129]`, the generation_runs entry, and WP:282 is 140's guarantee statement.
- WS:909 is the §9.5 heading, WS:911 the fixture, WS:913-917 the budgets, WS:914 the SLO sentence, and WS:905-907 migration tests.
- ERD:852 is the retention disposition item and ERD:850 the RLS-matrix item. ERD:440 is the §9.1 table header.

I also printed the other 70-odd file:line citations in the body at `75c9274` (script
`scratchpad/c0-141-prep/cite.mjs`). Every one lands on the line it describes. That includes
`run.mjs:883-893` (the partition refusal), `psql-driver.mjs:152` (`ON_ERROR_STOP=1`), RFC-022:411-421 (§5/8)
and WP:442 (RFC-025 §5). The body's `253+i` rule is the base's, and the header says so; on this branch it
is 254+i (F14).

### 3.5 Claims in commits, plan, disposition, blockers and handoff

Every claim I checked is true, with the exceptions recorded as G3, N1 and N2. I checked:

- the cherry-pick provenance;
- the conflict resolution and the 549 + 64 = 613 arithmetic;
- 677 -> 681;
- the four amended-without-owning paths, which are exactly the manifest diff;
- `open_blockers[0..190]` unchanged except `[33]`, which is append-only, and `[191]` new;
- the Owner's words, verbatim in the batch 127 and 129 dispositions where this disposition says they are;
- #168's merge facts;
- the Draft state of PR #169;
- "no migration, no policy, no grant";
- RFC-022's author being A1 (`/claude/a1_bastion`, RFC-022:5), as blocker 191 (2) says.

The disposition keeps the decision boundary: Q141-a, Q141-b and Q141-c are UNANSWERED, and the merge of #168
is recorded as executed, not decided.

## 4. Findings

### G1 (MEDIUM): the coverage map is not "one row per action SEC-009 and OB-005 name". OB-005's security and admin actions, and the contract's own delete example, have no row.

- **Where:** `db/foundation/lint/audit-coverage-map.json:2` (`_what`), `:5-6` (`_sources`), `:21-148`;
  `test-kits/db/foundation-contract.test.mjs:3397-3408`.
- **What:** `_what` claims "one row per action SEC-009 and OB-005 name". The rows cover SEC-009's six
  classes and the two owed actions. OB-005 (`module-contracts-events-jobs-workstream-th.md:337`) scopes the
  audit event to "security/admin/external actions", and the map uses OB-005 only as the source of the
  delete row's before-after reference. Three things are missing:
  1. **Business/Page archive or delete.** CTR-AUD-001's own example `valid-business-profile-deleted.json`
     is `{category: delete, name: business_profile.record.deleted}`, and §8.1 has "Business/Page
     INSERT/UPDATE/archive". The delete class maps only workspace closing and asset purge.
  2. **The security half of the §8.4 cell.** This batch classifies the `app.security_events` INSERT in the
     same register, but no coverage row names `app.security_events` or any security action that writes to
     it.
  3. **OB-005's admin actions.** "Approval policy manage" and "Workspace UPDATE", for example, fit none of
     the six categories. They are neither mapped nor recorded as no-category findings the way F6 records
     the rights change and the schedule transition.
- **Why the test cannot see it:** the test enforces one row per SEC-009 class plus the two owed blocker
  rows. A missing action passes.
- **Consequence:** low today, because no producer exists. But the map is the artefact DB-12 names
  (WS:795), and Q141-a will be answered against it. An action missing from the map is an action nobody
  owes.
- **Remedy (either is enough):**
  - (a) Add rows `delete.business_or_page_archive` (`app.business_profiles`, `app.page_context_profiles`;
    §8 "Business/Page INSERT/UPDATE/archive") and a security-event row on `app.security_events`. Record
    OB-005's admin actions either as rows with `category: null` and a `category_note`, folded into F6 on
    `open_blockers[33]`, or as one explicit scoping note.
  - (b) Narrow `_what` to "one or more rows per SEC-009 class plus the owed actions". Record the omitted
    OB-005 actions as owed on `open_blockers[191]`.

### G2 (LOW): one divergence is not listed. The store's not-blank CHECKs narrow `minLength: 1`, and no test holds them.

- **Where:** `db/foundation/migrations/140_audit.sql` (`audit_logs_actor_id_not_blank`,
  `_request_id_not_blank`, `_correlation_id_not_blank`, `_causation_id_not_blank`,
  `_error_code_not_blank`, all `length(btrim(x)) > 0`); `test-kits/db/fixtures/ctr-aud-001/store-conformance.json:47-56`;
  `foundation-contract.test.mjs:3437-3513`.
- **What:** CTR-TEN-001 and CTR-ERR-001 type these fields `{"type": "string", "minLength": 1}`, so `" "`
  is contract-valid. The store refuses it. Measured live: the valid fixture with `actor.id = " "` (and
  the same in `tenant_context.actor.id`) failed with `new row for relation "audit_logs" violates check
  constraint "audit_logs_actor_id_not_blank"`. It is a narrowing of the same kind as F2. It is in neither
  the four declared divergences nor the four undeclared ones. So the "closed list" is not closed, and
  countersigning 140's reading under Q141-b would countersign it without naming it.
- **Why the test cannot see it:** probe C9 shows the conformance test does not read these CHECKs. Changing
  one to `length(actor_id) > 5` survives the whole static suite.
- **Remedy:** add a fifth undeclared divergence, for example `ids_not_blank_narrows_min_length`, mapped
  from the five columns. Assert the `length(btrim(<col>)) > 0` text per column in 3437, so it is pinned the
  way the patterns are. Add it to F1-F4's list on `open_blockers[33]`, owed to Q141-b.

### G3 (LOW): F3 cites the manifest's note (3) for more than it says.

- **Where:** `store-conformance.json:54`; `open_blockers[33]` (F3); plan §5 F3; handoff `known_limitations[0]`.
- **What:** CTR-AUD-001's `untestable_by_schema` (3) (`manifest.json:92`) names one copy: `correlation_id`
  against `tenant_context.correlation_id`, plus `action.name` against `action.category`. It says nothing
  about `actor` or `causation_id`. The finding itself is true, because the subset validator cannot compare
  any of the copies. What overreaches is the attribution: "its untestable_by_schema note (3) says nothing
  checks they agree" covers all three, and the note covers one.
- **Remedy:** reword to "the manifest's note (3) names the correlation_id copy; the same holds, unstated,
  for actor and causation_id".

### G4 (LOW): the new rows' `batch` field contradicts the register's own definition of `batch`.

- **Where:** `service-policy-map.json:7-14` (`_shape.batch`: "the migration batch that classified it"),
  `:139`, `:147` (`"batch": "140_audit.sql"`); `foundation-contract.test.mjs:3324`.
- **What:** batch 140 did not classify the cell. The batch 141 preparation did, with no migration. Every
  earlier row's `batch` is the migration that both owns the table and classified the cell, so the two
  meanings never diverged before. The value follows RFC-2026-022 §7.2's example and §3's registry column,
  and the note at `:153` explains it. But the field definition a reader or a later lint relies on now
  says something false of two rows.
- **Remedy:** state the reading where the definition is. Either amend `_shape.batch` in a reviewed diff
  to "the §6 registry batch that owns the cell", or add this to `open_blockers[191]` (2) as a second point
  where §7.2 and the register disagree.

### N1 (note): schema-lint is not "the only target that reads the service-policy map".

- **Where:** plan §2 (a) and §4; handoff `tests[3]`.
- **What:** `make db-test-foundation` and `npm test` also run `tests/db/identity/identity-isolation.test.mjs`,
  whose test at `:10697-10698` reads the map, filtered to `batch === '100_asset.sql'`. That reading is
  static, though. No live layer (`migrate-clean`, `rls-smoke`) reads the map. So the conclusion that no
  cluster was needed stands, and I measured the round green anyway.
- **Remedy:** say "the only live-DB target is none; schema-lint and the static suites read it".

### N2 (note): the handoff states "23 paths" without its commit.

- **Where:** handoff `acceptance_results[5]`, `tests[2]`.
- **What:** 23 is the count at `b99218e`, as the plan says. On the head it is 25.
- **Remedy:** qualify the figure with "at b99218e".

## 5. Limits

- One model family. I share the Author's blind spots (RFC-2026-024).
- I did not re-run A0's 28 probes, and I did not re-measure the pre-refresh `npm run check` and
  `commit-when-clean` refusals at `b99218e` and `f3814e8`. Those are read from the plan and handoff. The
  branch name is checked out in another worktree, and moving its ref to an older commit to measure them
  would have touched the Author's branch.
- The live insert ran as `postgres`, who bypasses row level security. It measures that the table and its
  CHECKs hold each document. It does not measure any role's path to the table, and no such path exists
  today (`open_blockers[21]`).
- I checked completeness of the coverage map against SEC-009, OB-005, the ERD §8 first columns and the
  contract's own examples. I did not walk every domain document for audit obligations beyond
  `open_blockers[156]` and `[190]` (f).
- The phase plan's citations were checked against `75c9274`, which is what it cites. Its body's 253+i is
  that base's rule, not this branch's.
