# C0 contract review: batch 091 (`0a4d485`, handoff `49cec53`)

| | |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), WP-0A-DB-00, one of the three reviews the Owner's `ค` puts in place of A5's |
| Subject | branch `agent/claude/WP-0A-DB-00-batch-091` (Draft PR #164): batch 091 `0a4d485` and the handoff commit `49cec53`; base `86f55d2` (main, the merge of PR #163); Author `/claude/a0_atlas` |
| Records under review | A0's plan `a0-batch-091-plan-2026-09-28.md`; the disposition `product-owner-disposition-2026-09-28-batch-091.md` (A0's transcription); the new blocker (#191) |
| Governing text | `docs/plans/core-database-and-rls-workstream-th.md` §4.7, §5, §6, DB-08; `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md` §3.2, §4 (invariants), §6, §8.3, §8.5, §8.6, §10, §11.3 |
| Date | 2026-09-28 |

This file records findings. It advances no status, approves nothing, and signs nothing on anyone's
behalf. In particular it does not approve the schedule state machine on A5's behalf: §5 says what I
measured and what I would want A5 to decide. Whether this file counts as the Reviewer's review of
batch 091 is for the Integration Owner and the Product Owner to decide.

## §0 What I am

- I am a subagent spawned by `/claude/a0_atlas`, the Author of the work under review.
- I ran in A0's worktree, under A0's brief. The brief said what to read and what to ask. I checked
  each claim it pointed at against the diff and the database, not against the brief.
- I am the same vendor and model family as the Author.
- RFC-2026-024 withdrew the cross-vendor condition. That removes one objection. It does not make me
  independent of the brief I was given, and it does not make me A5.
- Accepting this file as the Reviewer's signature is an act of the Integration Owner and the Product
  Owner, not mine.

## §1 How I measured

"**Measured**" means I ran it and saw the result. "**Read**" means I read the file or record and
executed nothing. Every row below says which.

- **Checkout (measured).** The subject branch is checked out in the main checkout, so I created
  `review/c0-batch-091` at `49cec53` in my own worktree. This file is committed there, and nothing
  else is. `git merge-base 49cec53 86f55d2` is `86f55d2`, and `origin/main` is `86f55d2`. (The local
  `main` ref is stale at `5922684`; I did not use it.)
- **Diff (read).** `git show 0a4d485` in full: 16 files, +1072/−74. `49cec53` changes only the
  handoff. Its `files_added` and `files_modified` equal `git diff --name-status 86f55d2 0a4d485`
  (measured).
- **GitHub, through `gh`, read-only (measured).** #163 is `MERGED` at 2026-09-28T10:22:07Z by
  `workstationgroup`, head `ab430fb`, merge commit `86f55d2` (parents `7f6cefb`, `ab430fb`). The
  `bootstrap` check on `ab430fb` completed `success` at 10:18:15Z. #164 is Draft, `OPEN`, head
  `49cec53`. Its run 36410220756 (`pull_request`) completed `success`. That run's log shows "47
  apply-time blocks, 37 re-run as written, 10 superseded and replaced", "1023 isolation case(s)
  passed", and the two new control lines: "app.calendar_items (091): 7 case(s) noticed" and
  "app.content_schedules (091): 7 case(s) noticed".
- **Toolchain (measured).** `node -v` is v24.20.0 before every measured run (the round script
  refuses anything else). PostgreSQL 17.11 (Homebrew).
- **The relayed request.** The harness relayed one user request to this run, `merge #163 แล้ว
  ทำต่อได้เลย`. That is the wording the disposition's §3 transcribes.

**Static checks (measured).**

| Command | Where | Result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 86f55d2 WP-0A-DB-00` | `review/c0-batch-091` | exit 0, "all 16 changed path(s) are declared, and every amendment explains one" |
| `npm run verify` | `review/c0-batch-091` | exit 0, tests 674, pass 674, fail 0 |
| the body of "the handoff for this branch describes this branch", with the branch name `agent/claude/WP-0A-DB-00-batch-091` passed explicitly (`reportFor`, `claimantsOf`, `branchTipBefore`, `driftBetween`, imported from the guard's own modules; HEAD `49cec53`) | my worktree | `reportFor` code 0 (WP-0A-DB-00), tip before `0a4d485`, cited head `0a4d485`, drift `clean`, no substantive paths |
| the same body with the name `review/c0-batch-091` | my worktree | returns early: "no work package declares ownership.branch" (the known false-green on an unclaimed name) |
| `node scripts/verify-test-coverage-floor.mjs` | `review/c0-batch-091` | exit 0 |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-DB-00.json` | same | exit 0 |
| `npm run scan:secrets` | same | exit 0 |
| `node --test test-kits/db/foundation-contract.test.mjs` | same | 72 of 72 |
| `node --test test-kits/handoff-conformance.test.mjs` | same | 19 of 19 |

I could not clone the worktree: the sandbox refuses git operations outside it. So instead of running
`npm run verify` on a clone under the subject name, I ran the guard's body with that name, as above.
The only code under `test-kits/` and `scripts/` that reads the branch name is that guard
(`handoff-conformance.test.mjs:233`) and `refresh-author-handoff.mjs:300` (grep, measured), so the
rest of `npm run verify` does not depend on the name.

**Live database (measured).**

- **Setup.** A private cluster in `scratchpad/c0-091/`, on `127.0.0.1:5505`, TCP only
  (`unix_socket_directories=''`). Created with `initdb --locale=C -A trust -U postgres`, run with
  `LC_ALL=C`. The shim went first, then `make db-migrate-clean`, then `make db-rls-smoke` unless a row
  says otherwise. Every round started from a fresh initdb.
- **Drifts.** Each was APPENDED to `db/foundation/migrations/140_audit.sql` and restored after every
  round. It was checked each time against `git show HEAD:…` (`cmp`). At the end its sha256 is
  `2ac596bb950e8dfb…`, equal to HEAD's.
- **End state.** The cluster is stopped and its data directory removed. Nothing listens on `:5505`.
  `:5432` and `:5499` were not touched. `git status` is clean apart from this file.

**Round 0, the clean head.** `make db-migrate-clean` exit 0: "47 apply-time blocks, 37 re-run as
written, 10 superseded and replaced". Eleven catalog-rule probes each end "(self-test: refused …;
clean again after every drift)". The UPDATE closure probe reads "19 updated_by UPDATE closures", and
the coverage probe reads "among the 20 with a pinned closure". `make db-rls-smoke` exit 0: "1023
isolation case(s) passed". These are the Author's numbers.

**Negative controls on the round-0 database (measured, CI's procedure).** RLS was switched off on one
table, rls-smoke re-run on the same database, and RLS switched back on.

| Table | Failed case lines | 091 cases among them |
|---|---|---|
| `app.calendar_items` | 7 | all 7: `owner-b-cannot-see-the-calendar-of-workspace-a`, `editor-a-cannot-see-the-placement-outside-their-scope`, `editor-a-cannot-place-an-item-on-the-calendar`, `viewer-a-cannot-place-an-item-on-the-calendar`, `owner-a-cannot-place-an-item-of-workspace-b`, `editor-a-cannot-move-a-placement`, `owner-a-cannot-move-a-placement-naming-another-updater` |
| `app.content_schedules` | 7 | all 7: `owner-b-cannot-see-the-schedules-of-workspace-a`, `editor-a-cannot-schedule-a-target`, `approver-a-cannot-schedule-a-target`, `owner-a-cannot-arm-a-draft`, `owner-a-cannot-mark-a-schedule-dispatched`, `editor-a-cannot-cancel-a-schedule`, `owner-a-cannot-cancel-a-schedule-naming-another-updater` |
| `app.workspaces` (010) | 12 | none |
| `app.workspace_member_scopes` (021) | 73 | **one**: `editor-a-cannot-see-the-placement-outside-their-scope` (F11) |
| `app.content_targets` (081) | 15 | none |
| `app.content_items` (080) | 15 | none |

**Static overlap (measured; `overlap.mjs` over `buildCases` and the 56 `control` lines).** No case id
outside 091 matches `[a-z0-9-]*calendar` or `[a-z0-9-]*schedule`. Seven 091 ids match another
family's pattern: six match 010's `workspace`, and one matches 021's `scope`. Of the 7 calendar
failures, 3 ids contain `calendar`. Of the 7 schedule failures, 6 contain `schedule`. There are no
duplicate ids.

**Database drifts (measured).** Each was appended to 140. "Survives" means every live layer stayed
green: migrate-clean with its post-migrate pass and eleven probes, and all 1023 cases.

| Round | Drift | migrate-clean | rls-smoke | Verdict |
|---|---|---|---|---|
| d1 | `alter policy content_schedules_scope_narrowing … using (true) with check (true)` | exit 0 | exit 0 | **survives** (F1) |
| d2 | the same on `calendar_items_scope_narrowing` | exit 0 | exit 2, exactly `editor-a-cannot-see-the-placement-outside-their-scope` | caught by one case |
| d3 | both `*_service_path_closed` policies rewritten `using (true) with check (true)` | exit 0 | exit 0 | **survives** (F4) |
| d4 | `content_schedules_update_scheduler` USING rewritten to the role test alone, with no status bound | exit 0 | exit 0 | **survives** (F2) |
| d5 | both composite scope keys dropped and replaced by single-column keys on `content_target_id` / `content_item_id`, each with an index | exit 0 | exit 0 | **survives** (F4) |
| d6 | `alter table app.calendar_items no force row level security` | exit 2: post-migrate `091_calendar.sql#1` "without ENABLE and FORCE", plus 105#1 and 123#1 | not run | caught |
| d7 | `content_schedules_intent_scope_fk` dropped | exit 2: post-migrate `124_calendar_publish_intent_fk.sql#1` | not run | caught |
| d8 | `grant update (publish_intent_id, version) on app.content_schedules to authenticated` | exit 2: 091#1 "authenticated holds a batch 091 column privilege it must not" | not run | caught |
| d9 | `grant update (workspace_id, business_profile_id)` on both tables | exit 0 | exit 0 | survives. This is the known D47 class. Read: it stays inert while the composite key holds and `content_target_id` / `content_item_id` are not updatable |
| d10 | a new permissive FOR ALL policy for owner/admin, with a WITH CHECK that has no status term | exit 0 | exit 2: `owner-a-cannot-arm-a-draft`, `owner-a-cannot-mark-a-schedule-dispatched` | caught by cases, not by the block (F12) |
| r1 | none; then the 091 fixture loaded a second time | exit 0 | exit 0 | both tables' row digests and the app+private row total (218) unchanged |

**Rolled-back statements on the round-0 database (measured).** Each probe ran in its own transaction,
which was rolled back. Setup rows were written as `postgres` before the identity was assumed with
`private.as_user` or `private.as_suspended_user`.

| # | Statement | Result |
|---|---|---|
| P1 | `user_editor_a` (business scope, business_a1) reads a schedule on `content_target_a2` (business_a2); `owner_a` reads the same | 0; owner 1 |
| P2 | `user_page_editor_a` (page_a1) reads a schedule on `content_target_a1_sibling_page`, then one on `content_target_a1_page` | 0; 1 |
| P3 | the same identity reads placements of `content_item_a1_sibling_page` and `content_item_a1_page` | 0; 1 |
| P4 | `user_suspended_a` reads workspace A's placements and schedules | 0; 0 |
| P5 | `owner_a` updates a schedule set (as postgres) to cancelled, completed or dispatched | 0 rows each |
| P6 | `owner_a` disarms the armed `content_schedule_a1_ig` (armed → draft) | 1 row |
| P7 | `owner_a` moves the armed schedule's time and leaves it armed | ERROR, row-level security |
| P8 | `version` after a client reschedule and a client disarm | 1 and 1 |
| P9 | `owner_a` soft-deletes `calendar_item_a1`, edits the deleted row, undeletes it, and sets `deleted_at = '2000-01-01'` | 1 row each |
| P10 | `owner_a` inserts a schedule with `timezone_snapshot = 'Not/AZone'`, then `'   '` | 1 row; the second refused by `content_schedules_timezone_not_blank` |
| P11 | as postgres, `content_schedule_a1_fb` (its target's item is `content_item_a1`, business-level) is linked to `publish_intent_a1_page` (item `content_item_a1_page`, under page_a1, same business), then to `publish_intent_a2` and `publish_intent_b1` | **1 row**; the other two refused by `content_schedules_intent_scope_fk` |
| P12 | anonymous reads the schedules; the service reads the placements | "permission denied for schema app"; "permission denied for table calendar_items" |
| P13 | with business_a1 archived (as postgres), `owner_a` inserts a placement and a schedule under it, then a knowledge item | **1 row; 1 row**; the knowledge item is refused by RLS (040's archived clause) |
| P14 | `owner_a` inserts a schedule naming workspace A, business_a1 and business_a2's target; postgres the same row | refused by `content_schedules_scope_narrowing`; refused by `content_schedules_target_scope_fk` |
| P15 | `owner_a` inserts a placement and a schedule naming `user_editor_a` as `created_by` | refused, row-level security, both |
| P16 | `owner_a` cancels the draft on `content_target_a1_fb`, then creates a new draft for that target | 1 row |
| Q1 | with business_a1 archived, `owner_a` inserts a content item (080) | 1 row |
| Q2 | `has_column_privilege('authenticated', …, 'deleted_at', 'UPDATE')` on content_items, content_targets, calendar_items | t, t, t |
| Q3 | `timezone(text, timestamptz)`: `provolatile`; `timezone('Not/AZone', …)` | `i` (immutable); ERROR "time zone "Not/AZone" not recognized" |
| E1 | inside a transaction with d1 applied: P1 and P2's negatives | **1 and 1**: both scoped editors read out-of-scope schedules |
| E2 | inside a transaction with d4 applied: `owner_a` sets a completed schedule to draft; a failed one to cancelled with `scheduled_for = '2020-01-01'` | **1 row; 1 row** |

## §2 Answers to the brief's questions

### Q1. Does 091 implement §4.7's two tables and §8.3's two rows as the documents say, and is every departure disclosed?

**The tables (read, and measured in the catalog).** `calendar_items` carries §4.7's `id`, scope,
`content_item_id`, `scheduled_local_date`, `timezone` and `display_status`, with `deleted_at` added
for §8.5 and the unique-active rule. `content_schedules` carries `content_target_id`, `scheduled_for
timestamptz`, `timezone_snapshot`, a six-value `status` CHECK, `publish_intent_id` and `version`. The
catalog agrees (Q6c in the log): both composite scope keys, `*_scope_key`, the two partial unique
indexes, and the status CHECK in §4.7's order.

**The two §8.3 rows (measured).**

- **Calendar SELECT, `Y` for all five roles, `P` for the service.** Every active member reads, and the
  scope narrows the read (P1–P4). The service holds no grant (P12, `service-cannot-read-the-schedules`).
- **Schedule/unschedule, `Y Y P N N | P`.** Owner and admin write. Editor, approver and viewer are
  refused, and so is the service (cases). Anonymous is refused at the schema.

**The plan's rows A–K (read, against the blocker).**

- A, C, G, I and J are implementations, not departures.
- B, D, E, F and K are on blocker #191 as (e), (a)+(b), (c), (d) and (f).
- Row H's open question, what "ตาม policy" means, is not on the blocker, though 091:76-77 says A5 will
  answer it (F15).

**Departures that are NOT disclosed** (each measured or read below):

- §11.3's first bullet, that archiving closes new creation, is not enforced (F7).
- The timezone is not checked against IANA, and the migration says it cannot be (F8).
- The editor's `P` refusal claims no document defines the capability, but §5.1, §7 and DB-08's first
  acceptance criterion describe it (F9).
- Calendar placement writes are mapped to the Schedule/unschedule row (F9).
- `content_schedules` has no soft-lifecycle column (§3.2). `cancelled` stands in for one, and
  blocker 170 records the same question for 120's sends. Nothing records it for 091 (read; INFO in F15).
- Four earlier blockers owed to 091 are neither updated nor cross-referenced (F6).

### Q2. Is the disposition an honest transcription, including §3?

**As far as a record can be checked, yes.** I cannot hear the session. What I could check, I checked:

- **Every GitHub fact in §3 matches** (measured): #163 `OPEN` → `MERGED` at 10:22:07Z by the
  account `workstationgroup`, head `ab430fb`, merge commit `86f55d2`, and `bootstrap` green on
  `ab430fb` at 10:18:15Z.
- **The Owner's words** in §3 are the words the harness relayed to this run. The `ค` answer and its
  time, 05:14 UTC, are read only.
- **The caveat is plain.** "A0 EXECUTED the Owner's decision; A0 did not make it" is there. So are
  "that was not what happened here" and "Nor was RFC-2026-002's literal sentence satisfied". The
  RFC-2026-025 blocker carries the same account (read, manifest line 442).
- **§1's quotation of the one-page summary** matches the source except one word ("plans" for "will
  plan").
- **Four wording points** are in F14. The most substantive is that §3 presents A0's reading of the
  #162 words as their meaning, where the #162 record shows A0 read them two ways and the Owner never
  confirmed either. None changes a decision.

### Q3. Scope pinning (§4 invariant 10), and 124 against the 081 → 111 precedent

**What the keys tie (read and measured).**

- **Correctly shaped:**
  - `calendar_items_item_scope_fk`: (workspace, business, item) → `content_items`.
  - `content_schedules_target_scope_fk`: (workspace, business, target) → `content_targets`.
  - 124's `content_schedules_intent_scope_fk`: (workspace, business, intent) → `publish_intents`.
- **What refuses a mismatched schedule.** A client's mismatched schedule is refused by the narrowing.
  The same row written as postgres is refused by the key (P14).
- **The Page.** Neither table carries a page column. Both narrowings resolve the Page through the
  content item, which is 080's child rule and is measured to work (P2, P3).

**124's key does not tie the parent row** (P11). A schedule can name an intent of another content
item in the same business, including a page-level item under a business-level target. 090 refused
exactly this shape for approval requests (`090_approval.sql:1099-1118`). It is latent, because no
grant and no writer touches the column (F5).

**124 follows 081 → 111 in shape:**

- the key is deferred to an A0 Integration file that sorts after the parent's batch;
- it is added `not valid` and then validated;
- it is NO ACTION (the FK-action probe is green);
- its supporting index is written with it (the FK-support probe is green);
- its own block asserts the key by exact definition text and is in the post-migrate pass (d7).

**It departs from the precedent in one visible way.** 081's block asserted the key's absence and was
registered as superseded when 111 added it (`superseded.json`, the 081 entry). 091's block asserts
nothing about the key. Its comment at `091:358` says it does (F4). Operationally that is harmless,
because 091 and 124 land together.

**Numbering (read).** 124 is not in §6's registry. Its number was reserved in
`a0-batch-125-record-2026-09-28.md:95-96`, the way 122, 123 and 125 were numbered.

### Q4. Do the apply-time block and the post-migrate pass assert what the migration claims, by text where it matters?

**The pass is sound.** It re-runs 091's block and 124's block (d6, d7, d8 measured).

**What the block asserts by exact text:**

- the status CHECK (item 7);
- the two unique-active indexes (item 8);
- the grant list (item 6), which is a fixed forbidden list;
- ENABLE and FORCE (item 1);
- that permissive policies are `TO authenticated` (item 3).

**What it asserts by name or token only:**

- **The restrictive set, item 2, by name.** The narrowing and closure predicates are unread: d1 and d3
  survive every layer, and d2 is caught by one case.
- **The write authority, item 4, by token position.** It skips FOR ALL policies (d10).
- **The status confinement, item 5, by regex over WITH CHECK.** The USING bound that makes settled
  schedules history is unread: d4 survives every layer (F2).

**What it does not assert at all:**

- the two composite scope keys (d5 survives; 090 and 120 assert theirs);
- the "deferred key is absent" that its comment claims.

**The weak-assertion survey's lesson is applied** to the things 091 inherited probes for: the
updated_by closures, which are exact text in the probe with the list at 19, and the trigger probe. It
is not applied to the three controls 091 wrote itself: the two narrowings, the USING bound and the
service closures.

### Q5. Fixture, catalog, cases, and the two CI entries

**The fixture (measured).**

- It writes only 091's two tables. Read: two INSERT statements, both into those tables.
- It is idempotent. Reloading it left both tables' row digests and the app+private row total
  unchanged (r1). My six control runs (§1) reloaded it on the round-0 database. Each failed only its
  expected cases, which is the reload CI's control depends on.
- The six catalog symbols resolve to the fixture's literals (`foundation-contract.test.mjs` 72/72,
  which checks `ADDED_SYMBOLS`).
- The `armed` row is written as postgres, as the header says. No case treats its existence as
  evidence that a client could write it.

**The cases (read, with the outcomes measured).**

- **33 cases, each run in its own rolled-back transaction** (`run-isolation.mjs:349-431`).
- **Each `why` matches the layer that refuses:**
  - grant: status and intent not insertable or updatable; no DELETE; no anon or app_worker grant;
  - policy: role, closure, and the WITH CHECK status set;
  - index: the two 23505 cases.
- **The two 23505 cases name no `violates`.** The fresh `id` means only the partial index can fire, so
  they fail for the stated reason, but they would also pass on any unique violation (INFO, F15).
- **Coverage is below §8.6's ten per family** (F1, F3).
  - No case on either table: §8.6/6 (suspended), §8.6/8 on `created_by`.
  - No case on `content_schedules`: §8.6/3, §8.6/4 and §8.6/7.
  - No case on `calendar_items`: §8.6/4.
  - The behaviour behind each missing case is correct today (P1–P4, P12, P15).

**The CI entries (measured).**

- **Each is correct.** Seven own-family failures, and no other family's case matches either pattern.
  CI run 36410220756 reproduces both.
- **The calendar entry's basis is 3 ids,** not 7, because four of its failures carry no `calendar`.
- **One 091 id is counted by 021's control.**
- **The comment calls the Business narrowing "page-scoped".**
- **No static test holds the two entries,** where every table-creating batch from 021 to 121 has one
  (F11).

### Q6. Ownership and floors; `ci.yml` under amends

**Measured:**

- `verify-branch-scope` exit 0 (16 paths).
- `npm run verify` 674 of 674.
- The guard's body under the subject name is clean.
- Floor, role separation and secret scan are exit 0.
- No test was added (674 before and after, as in 125's review), so no floor moved, and
  `evidence/VERIFICATION.md` is unchanged. This is consistent with the rationale's "091 adds cases,
  not tests".

**The `ci.yml` amendment is justified by precedent (read).**

- Batch 120's `058548f` declared `.github/workflows/ci.yml` under `amends_without_owning` for five
  per-family entries, and batch 121's `426c294` did the same.
- `ci.yml` is in neither package's `writable_paths` (measured on `058548f`'s manifest).
- 091's two entries and a comment are the same kind of change.
- Because it changes CI, RFC-2026-025 §5 item 6 (`:112-113`) makes the merge the Owner's personally.
  The handoff says "FOR THE OWNER: the merge (a governance change: it touches CI)".

### Q7. Are the claims in the commit message, plan, record and blocker true?

**The commit message: true (measured).**

- 47 blocks and eleven self-tested probes; 1023 cases; seven and seven; 33 cases; 17 → 19; 191
  blockers.
- Draft / edit / disarm / cancel, and no client arm, dispatch or intent link (cases, P5–P7).
- Forced RLS (d6).
- The narrowing through the item (P1–P3).
- Closures from birth (the probe lists at 19).
- The idempotent, confined fixture (r1).

**Two claims need qualifying (F15).** "display_status carries no CHECK": it carries a not-blank CHECK,
and no vocabulary CHECK. The handoff's first criterion cites the block and the pass for "scope
pinning", which neither asserts (d5).

**The plan: true where checkable (read).**

- 123's first draft counted seventeen: `5856f0b` has `count_of <> 17`, and `f429fe6` removes it.
- 124 was reserved in 125's record.
- The renamed case: 120's pattern is `publish-intent`, and no 091 id contains it.
- A5 is `/root/a5_loom`, vendor OpenAI (`.agents/capability-profiles/a5-loom.json`).
- "Committed now as it was drafted" is about §1–§4. §5 is explicitly the later part.

**Two plan statements are contestable (read).** Row E's "`P` is defined nowhere" (F9). The migration's
"a non-blank shape is all the database can check" (F8, measured false).

**The blocker: true as far as it goes.** It omits what F5, F6 and F7 name.

### Q8. Stop-the-line?

**None.** §4 gives the reasoning.

## §3 Findings

Ranked most severe first. Where a remedy edits 091 or 124 themselves, it can: neither is merged, so
migration invariant 1 does not yet apply.

### F1: MEDIUM (measured). `content_schedules`' scope narrowing is asserted by nothing, and its §8.6 cases 3 and 4 are missing

- **What survives (d1).** With `content_schedules_scope_narrowing` rewritten `using (true) with check
  (true)` in a later file, every layer stays green: migrate-clean, the post-migrate pass, eleven
  probes, and 1023 cases.
- **The effect (E1).** `user_editor_a`, scoped to business_a1, reads business_a2's schedule.
  `user_page_editor_a`, scoped to page_a1, reads the sibling page's schedule. This is a within-tenant
  scope leak (§8.6/3, §8.6/4), and nothing would notice it arriving.
- **It works today (P1, P2).**
- **Why nothing notices.**
  - The fixture schedules only business_a1's two business-level targets and tenant B's
    (`091-calendar-fixture.sql:13-15`).
  - No case reads a schedule as a scoped member.
  - The block names the policy and never reads its predicate (`091_calendar.sql:293-298`).
- **Precedent.**
  - 090's and 120's blocks read both halves of every narrowing for `member_scope_admits_business` and
    `member_scope_admits_page` (`090_approval.sql:1061-1065`, `120_publisher.sql:1264-1268`).
  - 080's fixture header explains why a business-level parent alone cannot falsify the Page half
    (`080-content-fixture.sql:31-37`).
  - Every family from 040 to 121 carries a business and a page case.
- **The calendar half.** It has one business case (`isolation-cases.mjs:16854`), which d2 shows
  catches the gutting, and no page case.
- **Remedy.**
  - Load schedules on `content_target_a2` and `content_target_a1_sibling_page`, and a placement on
    `content_item_a1_sibling_page`.
  - Add `editor-a` (business) and `page-editor-a` (page) no-rows cases on both tables, each with its
    positive.
  - Add the narrowing check to 091's block. Better, pin both narrowings' exact deparse, as batch 125
    pinned its settled-row closure (`run.mjs` `PINNED_POLICIES`).

### F2: MEDIUM (measured). Nothing asserts the rule that settled schedules are history

- **The rule.** `content_schedules_update_scheduler`'s USING, `status in ('draft', 'armed')`
  (`091_calendar.sql:196-198`), is the only thing that makes a cancelled, dispatched, completed or
  failed schedule untouchable by a client.
- **It holds today (P5).**
- **What survives (d4).** With the status term dropped, every layer stays green.
- **The effect (E2).** The owner turns a completed schedule back into a draft, and rewrites a failed
  one to cancelled with a new time. That is SCHEDULE-HISTORY (§10) rewritten by a client, and §3.2
  says publish history is not updated.
- **Why nothing notices.**
  - The migration claims the bound in its comment (`:194-195`).
  - Block item 5 reads WITH CHECK only (`:321-332`).
  - The fixture has no settled schedule, and no case updates one.
- **Precedent.** This is the class batch 125 closed for approval requests
  (`approval_requests_settled_is_immutable`, pinned in the pinned policy probe).
- **Remedy.**
  - Pin the USING text: in the block by exact deparse, or better as a restrictive
    `content_schedules_settled_is_immutable` (`using (status in ('draft','armed')) with check (true)`)
    added to `PINNED_POLICIES`.
  - Load one settled schedule. It must not collide with the draft-or-armed index, for example a
    cancelled one on `content_target_a1_fb`.
  - Add a no-effect case with a witness, `owner-a-cannot-revive-a-cancelled-schedule`.

### F3: LOW (measured). §8.6 coverage is below the ten-case minimum beyond F1, and two labels are wrong

- **No suspended-member case (§8.6/6) on either table.** `user_suspended_a` exists, and every family
  from 010 to 121 carries one. The behaviour is correct (P4).
- **No anonymous case on `content_schedules`.** The behaviour is correct (P12).
- **No forged `created_by` case (§8.6/8) on either table.** The policy refuses it (P15).
- **Mislabels.**
  - `anonymous-cannot-read-the-calendar` is labelled `§8.6/9`, the immutable-row case
    (`isolation-cases.mjs:16864`). It is the only one of the suite's 50 anonymous cases not labelled
    `§8.6/7`.
  - The two cross-tenant reads are labelled `§8.6/1`, where 13 of the suite's `owner-b-cannot-*` cases
    use `§8.6/5`.
- **Remedy.** Add the cases and correct the labels.

### F4: LOW (measured). Three more controls are pinned by name or not at all, and one comment claims an assertion that is not made

- **The service-path closures (d3 survives).**
  - Every other closure has a catalog case (`SERVICE_PATH_CLOSURE_ON`, 24 cases), and a static rule
    holds every `*_service_path_closed.sql` file to 082's shape
    (`identity-isolation.test.mjs:9722-9798`).
  - 091 writes its two closures inline in `091_calendar.sql:261-266`, so neither the rule nor any case
    reads them.
- **The composite scope keys (d5 survives).** 090 counts its key's columns
  (`090_approval.sql:1103-1118`) and 120 pins its keys by `conkey` (`120_publisher.sql:1008-1033`).
  091 asserts neither of its two.
- **Impact is bounded today.**
  - Block item 6 refuses any grant to a non-client role (d8).
  - The narrowing's WITH CHECK refuses a mismatched client row (P14).
- **The comment.** `091_calendar.sql:358` says item 7 checks "the deferred key is absent". The code
  checks only the status CHECK.
- **Remedy.**
  - Add two catalog cases, `batch-091-closes-the-service-path-on-…`. Their ids should carry no family
    word, as 082's and 122's do, so the control does not count them.
  - Check both keys by `conkey`/`confkey` in the block.
  - Correct the comment.

### F5: LOW (measured). 124's key ties workspace and business, not the content item, and this is not disclosed

- **The measurement (P11).** As postgres, the key accepts `content_schedule_a1_fb` (a target of
  business-level `content_item_a1`) linked to `publish_intent_a1_page` (page-level
  `content_item_a1_page`).
- **It is latent.** The column is in no grant, and no writer exists.
- **But the dispatcher would lean on it.** A schedule naming another item's intent is a post of the
  wrong content at the scheduled time.
- **The precedent is against it.** 090 refused exactly this shape ("a key that named only the
  workspace and the version id would let a request pin a version of another item",
  `090_approval.sql:1113-1117`).
- **Nothing discloses the limit.** 124's header says only "its own workspace and business" (`124:5-6`),
  and the blocker does not mention it.
- **Remedy.** Record it on #191 as owed to the dispatcher (and to A5): a schedule's intent must be for
  its target's item, and presumably `request_kind = 'scheduled'`. Or add a forward key through the item.

### F6: LOW (read). Four blockers that name 091 are left as they were

- **#173** (`WP-0A-DB-00.json:425`) opens "BATCH 091 DOES NOT EXIST", which is now false. Its open item
  is 120's question 12, answered (a) by the Owner: "`request_kind = 'scheduled'` without a schedule row
  is a blocker to A5". It is restated at `120_publisher.sql:215-216`. It is neither closed nor carried
  into #191.
- **#139** (`:391`, the editor on a content target versus Schedule/unschedule).
- **#148** (`:400`, `approval_state` "before batch 091 pins a schedule").
- **#168** (`:420`, a cancelled intent over a published send, "to batch 091 … from the other side").

None is cross-referenced by #191.

**Remedy.** Add an item (g) on #191 naming the four, and correct #173's first sentence.

### F7: LOW (measured). §11.3's "archive closes new creation" is neither enforced nor disclosed

- **The measurement (P13).** With business_a1 archived, the owner still inserts a placement and a
  draft schedule under it.
- **Precedent is split.**
  - 020, 030 and 040 carry the archived clause in their INSERT policies (`030_industry.sql:514-529`,
    `040_knowledge.sql:570-590`). P13 measured 040 refusing.
  - The content family does not (Q1), so 091 follows 080's gap.
- **Nothing discloses it.** The plan's §1 and blocker (f) cite only §11.3's second bullet, that
  existing schedules must be cancelled or moved.
- **Remedy.** Add the archived clause to both INSERT WITH CHECKs. The business is on the row, and the
  page is reached through the item. Or record the gap on (f).

### F8: LOW (measured). The timezone columns accept any non-blank string, and the stated reason is not true

- **The measurement (P10).** `'Not/AZone'` is accepted.
- **The stated reason.** `091_calendar.sql:54-55` says "a non-blank shape is all the database can
  check". But `timezone(text, timestamptz)` is IMMUTABLE on 17.11 and raises on an unknown zone (Q3).
- **Why it matters.** §3.2 requires an IANA `timezone_snapshot`, and DB-08's acceptance ("เวลาไทยที่
  เลือกแปลง UTC ถูกต้องและแสดง timezone snapshot ย้อนหลังได้") needs one.
- **Remedy.** Add `check (timezone(timezone_snapshot, '2000-01-01 00:00:00+00'::timestamptz) is not
  null)` and the same on `calendar_items.timezone`. A tzdata update that retires a zone would then
  fail a restore, which is a trade-off for A5. Otherwise correct the comment and record the choice.

### F9: LOW (read). The editor's `P` is described in the documents, and 091 misses DB-08's first acceptance criterion without saying so

- **The claim.** `091_calendar.sql:18-21`, plan row E and blocker (c) say no document defines the
  capability `P` names.
- **Three passages describe the condition:**
  - §5.1: "Schedule/publish | … | Editor: เมื่อ policy อนุญาตและ approved";
  - §7: "editor: … schedule เมื่อ policy อนุญาต";
  - DB-08 (`core-database-and-rls-workstream-th.md:734`): "Workspace ปิด approval แล้ว authorized
    Editor schedule ได้ตาม policy".
- **The precedent covers publishing only.** The Owner's question 2 on batch 120 was about "Publish
  now". Extending it to Schedule/unschedule is A0's analogy.
- **An unlisted reading.** The mapping of calendar placement writes to the Schedule/unschedule row
  means an editor cannot plan. The plan's §3 does not list that reading.
- **Remedy.** Cite §5.1, §7 and DB-08 in (c) as the partial definition A5 has to turn into a
  capability. List the placement mapping as a reading for A5.

### F10: LOW (measured). `version` does not move on client writes

- **The measurement (P8).** After a client reschedule and a client disarm, both rows still read
  version 1.
- **Why it matters.** The column exists for the dispatcher's optimistic concurrency
  (`091_calendar.sql:103-104`). With the disarm admitted (plan row D), a dispatcher comparing `version`
  would not see a client's disarm or edit.
- **Remedy.** A trigger that bumps `version` on every UPDATE, or the question added to (a).

### F11: LOW (measured). The CI entries are right, but their comment and basis are not quite as described, and nothing holds them

- **(i) A wrong word.** `ci.yml:784` calls `editor-a-cannot-see-the-placement-outside-their-scope` "the
  page-scoped narrowing". `user_editor_a` is business-scoped, and the case covers §8.6/3.
- **(ii) A thin basis.** Only 3 of the 7 calendar failures contain `calendar`. The four others say
  "placement" or "item", so the entry rests on 3 cases.
- **(iii) An overlap.** That same case matches 021's `[a-z0-9-]*scope` and fails under 021's control
  (measured). 090's rule forbids this overlap for its own family
  (`identity-isolation.test.mjs:10237-10269`). Here it is harmless, because the failure is a genuine
  scope failure.
- **(iv) No static test.** Every table-creating batch from 021 to 121 has a static test "the tables
  batch N adds have their own entries in the CI negative control". 091 has none.
- **Remedy.**
  - Correct the comment.
  - Rename the four ids so they carry `calendar`, and the scope case so it does not say `scope`.
  - Add the static test with the basis and overlap checks. The floor then moves, so
    `scripts/test-suite-contract.mjs` and `evidence/VERIFICATION.md` join the amends, as they did for 125.

### F12: INFO (measured). Block item 4 does not see a FOR ALL policy

- **The filter.** `091_calendar.sql:314` filters `polcmd in ('a', 'w')`, so a permissive FOR ALL write
  policy escapes it.
- **Only cases catch it.** d10 was caught by two cases.
- **Tokens survive `or true`.** Both item 4 and item 5 keep their tokens under an appended `… or true`.
- **Remedy.** Include `'*'`, and pin exact text.

### F13: INFO (read). The fixture entry is inserted, not appended

- **What changed.** `run-isolation.mjs:135-137` puts 091 between 081 and 090. It is the first entry
  since 130 that was not appended.
- **Stale comments.** Every later comment repeats "appending is the change that cannot reorder
  anything else". 090's comment, "DEPENDENCY ON THE ENTRY DIRECTLY ABOVE IT" (`:138`), is now two
  entries away from 080.
- **Harmless.** Nothing after 091 reads its rows (grep), and the suite is green.
- **Remedy.** Append the entry, or amend the comments.

### F14: INFO (read). Four wording points in the disposition

- **(i)** §3 says "For #162 the same words had meant 'merge it, then carry on'". The #162 disposition
  §2 records that A0 first read them as "#162 is merged; go ahead", and later as an instruction. The
  Owner never said which. Suggested: "A0 had read the same words, on their third use for #162, as …".
- **(ii)** "It did not ask a third time" implies two asks for #163, where §3 records one.
- **(iii)** "Every review run on #163 had found nothing blocking the merge" is true of the heads
  reviewed. But #163's final text commit `b2b032e` was re-checked by no role, which 125's handoff
  itself said.
- **(iv)** §1's table quotes the one-page summary's outcome as "A0 plans it after 123", where the
  source reads "A0 will plan it after 123".

### F15: INFO (read). Smaller accuracy points

- **The commit message and blocker (e)** say `display_status` "carries no CHECK". It carries
  `calendar_items_display_status_not_blank` (`091_calendar.sql:68-69`), and no vocabulary CHECK.
- **The handoff's first criterion** cites the block and the pass for "scope pinning". Neither asserts
  the keys (d5).
- **Plan row H's open question** is not on the blocker: what "unique active … ตาม policy" is.
- **The two 23505 cases** name no `violates`.
- **`content_schedules` has no soft-lifecycle column (§3.2),** and this is not recorded.
  Blocker 170 records the same question for 120.
- **A soft-deleted placement** stays visible to every member. It can be edited and undeleted, and its
  `deleted_at` can be set to 2000-01-01 (P9). `content_items` and `content_targets` have the same
  grant (Q2). If batch 160 keys SCHEDULE-HISTORY on `deleted_at`, a client could shorten its own
  retention.

## §4 Stop-the-line verdict

**No stop-the-line condition found in `0a4d485` / `49cec53`.**

| Stop-the-line class | What I found | How I know |
|---|---|---|
| Secret exposure | none; the fixture ids come from the catalog; secret scan exit 0 | measured |
| Tenant leakage | none. Cross-tenant reads and writes are refused. The Business and Page narrowings hold on both tables. A suspended member sees nothing. F1 is about asserting this, not a leak today | measured: P1–P4, P14, and the cases |
| Duplicate external side effects | none possible: nothing can arm, dispatch or link a schedule | measured: P5–P7, the cases, and the grants |
| Lost jobs | none | – |
| Migration divergence | none. The set migrates clean with the pass. 091 and 124 are new files, and no earlier file is edited | measured: r0, r1, CI |
| Irreversible deletion | none; no DELETE grant on either table | measured: the cases |
| Contract mismatch | none against §4.7's columns or §8.3's cells. F9 is a documented reading that misses DB-08's first criterion, recorded as owed rather than contradicted silently | read |

**Nothing I found blocks the Owner's merge.**

- The merge is a governance change, so it is the Owner's personally.
- F1 and F2 are MEDIUM. Both controls work today, but nothing would notice either one being lost. I
  recommend fixing both in this PR, because each is a few fixture rows, two or three cases and a block
  line or a pinned policy. Batch 125 set the precedent of closing this class before merge.
- A5's review of the schedule states stays owed by the Owner's choice `ค`. This file is not a
  substitute for it.

## §5 What I measured about the state machine, and what I would want A5 to decide

**Measured, not approved:**

- The client paths are exactly these: insert a draft; edit a draft; armed → draft (disarm);
  draft → cancelled; armed → cancelled.
- A client cannot insert any other status, reach armed, dispatched, completed or failed, or edit an
  armed schedule without disarming it (P7).
- A client cannot touch cancelled, dispatched, completed or failed schedules (P5). F2: that bound is
  unasserted.
- No writer exists for the other transitions or for `publish_intent_id`.

**For A5:**

1. Whether a client may disarm, or only cancel. If a client may disarm, whether `version` must move
   (F10), so that a dispatcher that has already read an armed row cannot act on a stale one.
2. Whether cancelled, dispatched, completed and failed are terminal for every writer or for clients
   only, and whether failed may be re-armed.
3. The editor's `P` on Schedule/unschedule, given §5.1, §7 and DB-08's first criterion (F9). Also
   whether a calendar placement is a Schedule/unschedule write or a Content create/edit write.
4. `display_status`'s vocabulary, and what "unique active calendar placement ตาม policy" is.
5. Whether a draft may be created under an archived Business or Page (F7, §11.3 bullet 1), and the
   explicit cancel-or-move command bullet 2 requires.
6. The link invariants: a schedule's intent must be of its target's content item (F5). An intent with
   `request_kind = 'scheduled'` must have a schedule, and the reverse (#173).
7. Whether the timezone is validated in the database (F8).

## §6 Limits

- **Who I am.** I am the Author's subagent, of the same vendor and model family, under the Author's
  brief (§0). I am not A5, and nothing here stands in for A5's review.
- **No clone.** The sandbox refused a clone and any git operation outside my worktree. So the
  branch-name run is the guard's body with the name passed in, not `npm run verify` on a clone. The
  drifts were appended to `140_audit.sql` in my worktree itself, and restored and checked against HEAD
  after every round.
- **The session.** I cannot hear it. The Owner's `ค`, its time, A0's question and the session order
  around #163 are read from A0's records only.
- **Where I measured.** Homebrew PostgreSQL 17.11 on macOS with the shim, not CI's container and not
  Supabase. CI's run is cited, and I read only its summary lines. I did not run migrate-upgrade,
  seed-replay or any performance budget.
- **What I read and what I sampled.** I read 091's 33 cases in full and sampled the rest of the suite
  only through `buildCases` counts and labels. I read `ci.yml`'s control function and 091's entries,
  not the whole workflow.
- **Latent findings.** F5, F10 and part of F2 describe a dispatcher that does not exist. Their weight
  depends on how it will be written.
