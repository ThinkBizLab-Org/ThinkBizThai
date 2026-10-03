# Batch 160 preparation: retention map, export manifest fixture, purge order (DRAFT)

Author run `/claude/a0_atlas`, drafting subagent. Local branch `draft/wp-db00-160-prep`, cut from main
`75c9274`. **This is a draft. It approves nothing, and nothing in it has been pushed.** Gate: pre-G0
(CONTRIBUTING_AGENTS.md:23). The draft contains data, fixtures and static contract tests only. It adds
**no migration**, takes **no decision**, and **encodes no retention number**. Source: the phase plan for
141–170, "Batch 160 — 3. Can do now" (plan:129-140). The Owner ended the hardening chain at 129 and told
A0 to do everything that needs no pending decision.

## 1. Item → file → test that holds it

All three tests are in `test-kits/db/foundation-contract.test.mjs`, an existing suite file. The suite
list is unchanged.

| Plan item | File | Test (name) |
|---|---|---|
| (a) Retention map, one row per table | `db/foundation/lint/retention-map.json` | `the retention map has one row per table, every class is one §10 defines and §5 reaches or a finding, and every blocking control it names holds in the migrations` |
| (b) §11.1 export manifest fixture | `test-kits/db/export-manifest.fixture.json` | `the §11.1 export manifest fixture never carries an excluded class, every table is in the retention map, and its checksums recompute` |
| (c) §11.4 purge order from the FKs | `db/foundation/lint/purge-order.json` | `the §11.4 purge order is a topological order of the foreign keys the migrations create, children first, covering every table` |
| (d) Anonymisation route design note | this file, §6 | none; it is a note, not a rule |

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
    Thai.
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
  - The five §11.1/5 exclusions are found by a property of the **map**, not by the fixture's own lists:
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

## 3. Commands and exit codes

| Command | Exit | Output |
|---|---|---|
| `make db-migrate-clean` (round 1, export of `75c9274`, used for the measurement) | **0** | "db-migrate-clean: ok"; post-migrate pass 49 apply-time blocks, 37 re-run as written, 12 superseded and replaced |
| `node --test --test-name-pattern=… test-kits/db/foundation-contract.test.mjs` (the three new tests) | **0** | 3 pass |
| `node a0-160p/mutate.mjs` | **0** | 27 of 27 mutations red; baseline green after restore |
| `node scripts/verify-test-coverage-floor.mjs` (after the floors and the manifest) | **0** | silent |
| `npm run check` (first) | **89** | tests 680, pass 680, fail 0; refused only because `evidence/VERIFICATION.md` was 677's record |
| `npm run record:verification` | **0** | "recorded 680 passing, 0 skipped, 0 todo" |
| `npm run check` (after) | see §3.1 | |
| `make db-migrate-clean`, `make db-rls-smoke` (round 2, export of this branch's commit) | see §3.1 | |

The floors moved to the guard's own count, read through the guard's `stripNonCode` and
`countDeclaredTests`:

- `foundation-contract` test floor: 73 → **76**.
- Assertion floor: 500 → **587**.
- Name digest: `c125bbd792fa8a92` → `5f91e64b5e43af7d`.
- `test-kits/integrity-manifest.json` is regenerated (88 digests).

### 3.1 After the commit

This section is filled in by the run that commits this file. See the final structured result of the
drafting run, which records every exit code taken after the commit.

## 4. Findings (each one recorded, none resolved)

The map carries F160-01 to F160-16 as data (`findings`). Each finding's source line is in the file and
was verified by reading it.

| Id | Finding | Where |
|---|---|---|
| F160-01 | §5 gives connector.meta `CONNECTION-HISTORY`, and §10 does not define it. This covers 3 tables: `meta_connections`, `social_accounts` and `private.meta_credential_references`. | ERD:211; WP:257 |
| F160-02 | §5 gives industry.core `CATALOG/HISTORY`. §10 does not define `CATALOG`. `HISTORY` cannot describe global catalog rows, nor a mutable business assignment. 3 tables. | ERD:204, :490; WP:330 |
| F160-03 | §5's glob `NOTIFICATION-*` does not reach `PUSH-SECRET`. **PUSH-SECRET is defined** (§10 row 21); the gap is in the assignment. | ERD:215, :508; WP:344 |
| F160-04 | The glob reaches only `NOTIFICATION-INBOX` ("user notifications"). No class describes a preference row. | ERD:215, :507 |
| F160-05 | `LEDGER` is undefined. §10 has `OUTBOX-SHORT` and `CONSUMER-LEDGER`, and §5 names neither (`outbox_events`, `consumer_ledger`). | ERD:214, :505-506; 050_async_kernel.sql:373-379 |
| F160-06 | The glob `AI-RUN-*` matches no §10 class literally. No generation-run table exists, and nothing covers the model registry, the policy or the credential ref. | ERD:216, :509-510; 060_ai_gateway.sql:162-170 |
| F160-07 | The glob `ASSET-*` does not reach `RIGHTS-PROOF`, although batch 100 reads it as doing so. No class describes `content_asset_links`. | ERD:210, :498-501; 100_asset.sql:421-423 |
| F160-08 | The two sections disagree about `billing_webhook_receipts`. §5 says FINANCE-HISTORY, while §10's `WEBHOOK-SHORT` data column names the "payment webhook inbox" (batch 131 used WEBHOOK-SHORT). | ERD:218, :502; WP:358 |
| F160-09 | `app.workspaces` has no timestamp for entering a lifecycle state, so DATA-DEC-04's 30-day window has nothing to be measured from. | 010_identity.sql:156-157 |
| F160-10 | `app.jobs` has no terminal-state column or time, so JOB-SHORT's success/failure split is unsweepable. No attempts or DLQ table exists. | ERD:504 |
| F160-11 | SCHEDULE-HISTORY runs "after final state", and neither schedule table records when that state was reached. | ERD:497; 091_calendar.sql:59 |
| F160-12 | RESEARCH-RUN runs "after last use", and the run has no last-use column. | ERD:493; 070_research.sql:478 |
| F160-13 | **13 sweep keys have no covering index.** See the list below the table. | measured |
| F160-14 | **12 retention conflicts.** A kept child holds a NO ACTION key to a purged parent. See the list below the table. | measured; ERD:589-600 |
| F160-15 | The `assets` ↔ `asset_versions` cycle can only be broken by nulling `assets.current_version_id`. Only `app_worker` holds that grant, and no policy admits it. | measured |
| F160-16 | §10 `HISTORY`'s data column names knowledge and content versions, which §5 files under `CONTENT-HISTORY`. Both purge, so no behaviour changes today. | ERD:490, :495, :205, :207 |

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

- **P1. The plan's citations drift, and its list of undefined classes is wrong in two places.**
  - "ERD:850 checklist" is ERD:852. ERD:850 is the RLS-matrix item.
  - `WEBHOOK-SHORT` and `PUSH-SECRET` are **defined** in §10 (ERD:502, :508; WP:257 says so in terms).
    For PUSH-SECRET the gap is §5's assignment, and for WEBHOOK-SHORT it is the billing receipt.
  - All other cited lines checked (ERD:279-282, 484, 526, 532-555, 571-600, 867-873; WS:576; DR:111,
    353; WP:255, 257, 266, 267, 274, 284, 330, 344, 358, 373, 401, 403; 010_identity.sql:156-157)
    were read and match.
- **P2. Q160-c is narrower than the findings.** It names CONNECTION-HISTORY, CATALOG and the
  NOTIFICATION-*/PUSH-SECRET glob. F160-04 to F160-08 and F160-16 have no Q-id in the plan, so their
  rows carry no decision id rather than one stretched to fit. A1 Data needs them added to Q160-c, or
  needs a new id.
- **P3. Scope declaration.** The draft amends three paths that need a rationale for this branch:
  - `scripts/test-suite-contract.mjs` (floors and digest) and `test-kits/integrity-manifest.json`
    (regenerated) are listed in `amends_without_owning`, but the rationale there describes batch 128.
  - `evidence/VERIFICATION.md` (680) is not declared at all. Batch 128 dropped it because it added
    no test.
  - By instruction, the manifest's branch slot and rationale are **not** edited, so
    `verify-branch-scope` is expected to refuse until the packaging step writes them.
  - The measurement is in the structured result.
- **P4. The export fixture makes two judgements** and labels them as judgements:
  - `workspace_invitations` is omitted as token material. §11.1/5 says "secret", and the token hash
    is a stored bearer-token form (§9.3, ERD:473).
  - Nine tables outside §11.1's minimum domains (ERD:546-555) are listed as
    `outside-minimum-domains`, "NOT decided here".

## 5. What this draft does NOT decide

Each item below is quoted from the plan and left open.

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

## 6. Design note: anonymising approval history (WP:401; blocker 186 item 16)

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
    (Q141-c, WP:282) has to treat anonymisation as an authorised mutation.
  - It needs `app_maintenance` to exist as a working path, which waits on DATA-DEC-03.
  - It anonymises free text (`comment`) by overwriting it, which is the one part that does work.

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
main cost is the closure migration across about 19 tables plus one definer helper. It should be decided
**before** any further family adds an `auth.uid()` actor closure, and before G1 data exists, while every
table is still empty and applied nowhere. This is a recommendation for Q160-b; it is not taken here.

## 7. Files

- `db/foundation/lint/retention-map.json` (new)
- `db/foundation/lint/purge-order.json` (new)
- `test-kits/db/export-manifest.fixture.json` (new)
- `test-kits/db/foundation-contract.test.mjs` (three tests and their helpers, appended)
- `scripts/test-suite-contract.mjs` (floors 73 → 76 and 500 → 587, and the name digest)
- `test-kits/integrity-manifest.json` (regenerated)
- `evidence/VERIFICATION.md` (677 → 680, written by `npm run record:verification`)
- this record

Scratch only, not committed, in the private directory `a0-160p/`:

- `gen.mjs`: the generator. It holds the judgement half; the measured half comes from `catalog.json`.
- `catalog.sql` and `catalog.json`
- `fktext.mjs`, `granttext.mjs`, `idxtext.mjs`
- `mutate.mjs`
- `round.sh`

Not touched:

- the handoff;
- the manifest's branch slot and rationale;
- every blocker text;
- any migration;
- `docs/**` and `contract-catalog/**`.
