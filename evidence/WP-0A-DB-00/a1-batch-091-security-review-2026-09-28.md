# A1 Security/Privacy review: batch 091 (`0a4d485`, handoff `49cec53`)

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer for `WP-0A-DB-00`
Subject: branch `agent/claude/WP-0A-DB-00-batch-091` (Draft PR ThinkBizLab-Org/ThinkBizThai#164):
`0a4d485` (batch 091, with 124) and `49cec53` (the handoff, alone), on top of `86f55d2` (`main`, #163
merged). The Author's branch is checked out in the main checkout, so I checked `49cec53` out in my own
worktree as the local branch `review/a1-batch-091`. `git merge-base --is-ancestor 86f55d2 49cec53`
holds, so the head contains the current `main`.
Author: `/claude/a0_atlas`
Date: 2026-09-28
Standing-in note: by the Owner's choice (ค), C0, Q0 and A1 review this batch in place of A5
(Calendar's owner, `/root/a5_loom`). **I do not approve the schedule state machine on A5's behalf.**
§5 says what I measured about it and what I would want A5 to decide.

**This document records review findings. It advances no package status, signs nothing on anyone's
behalf, writes `security_approved` nowhere, and repairs nothing it found.** It is one input to the
Product Owner's disposition. It is not the disposition.

---

## 0. What I am, before anything else

I am a subagent spawned by `/claude/a0_atlas`, the Author of the change under review. I ran in a
worktree of A0's repository, under a brief A0's workflow wrote, and I am the same vendor and model
family as A0. RFC-2026-024 withdrew the cross-vendor condition, so that fact does not by itself
disqualify this review. It does mean the Author chose what to point me at. **Whether this review counts
as the Security/Privacy signature on batch 091 is the Integration Owner's (`/claude/r0_steward`) and
the Product Owner's act.** It is not for me or for A0 to decide.

I also do not hold A5's role, and this review is not A5's review of the schedule states. Blocker
191(a) records that review as owed, and nothing below discharges it.

Every claim below either names the file and line it rests on or was measured on a live cluster. §2
separates what I measured from what I only read or inferred.

## 1. What was reviewed

Read in full: `git show 0a4d485` (16 files, +1072/-74) and `git show 49cec53` (the handoff alone). The
parts that carry security weight:

- `db/foundation/migrations/091_calendar.sql` (new, 383 lines):
  - the two tables (:46-74, :90-117) and their indexes (:78-83, :121-126);
  - column grants (:147-170);
  - permissive policies (:173-201);
  - the restrictive narrowings (:205-250) and closures (:255-266);
  - the apply-time block, assertions 1-9 (:271-383).
- `db/foundation/migrations/124_calendar_publish_intent_fk.sql` (new): the scope foreign key and its
  index (:11-19) and its block (:25-35).
- `tests/db/identity/fixtures/091-calendar-fixture.sql` and its entry in
  `tests/db/identity/run-isolation.mjs:135-137`.
- The 33 cases after `BATCH 091 -- calendar.core` in `tests/db/identity/isolation-cases.mjs`
  (:16800-17150), and the six new symbols in `db/foundation/seeds/fixture-catalog.json`.
- The probe list in `scripts/db/run.mjs:163-171` (`UPDATED_BY_ON_UPDATE_CLOSURES`, 17 -> 19). Also
  `PINNED_POLICIES` (:271-272), which 091 does not touch.
- The count and digest changes in `test-kits/db/foundation-contract.test.mjs`.
- The two control entries in `.github/workflows/ci.yml:781-790`, and the `control()` function they
  call (:176-198).
- The new blocker 191 (`work-packages/WP-0A-DB-00.json:443`), and blocker 186 (:438), whose
  created_by class 091 joins.
- `evidence/WP-0A-DB-00/a0-batch-091-plan-2026-09-28.md` and
  `product-owner-disposition-2026-09-28-batch-091.md`.
- Governing text:
  - `docs/plans/core-database-and-rls-workstream-th.md`: §3 (calendar.core "must not own publish
    state"), §4.7, §6 row 091, DB-08 acceptance, and §9.3 ("schedule cancellation ขณะ dispatch");
  - `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md`: §7, §8.3, §8.5, §8.6, §9.1, §10
    (SCHEDULE-HISTORY) and §11.3.

## 2. How I measured, and what is measured versus read

**Environment (measured).**
- `node -v` = `v24.20.0`, checked by every script before any measured run.
- PostgreSQL 17.11 (Homebrew, `/opt/homebrew/bin`) on `127.0.0.1:5501` only, TCP only
  (`-c unix_socket_directories=''`).
- `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, `TZ=UTC`. Shim
  `db/foundation/ci/supabase-shim.sql` first, then `make db-migrate-clean` and `make db-rls-smoke`
  with `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres`.
- A fresh `initdb` for every round, 11 rounds in all.
- Each drift was appended to `db/foundation/migrations/140_audit.sql` and 140 was restored after each
  round. Its sha256 `2ac596bb…d37149` was checked after every round and matches `git`'s blob
  `fa7f3cd`.
- Ports 5432 and 5499 were never touched, and nothing was written to `/tmp`.
- My scripts and logs are in my private directory `…/scratchpad/a1-091/`. They are not committed; the
  exact SQL of every drift is quoted in §4.
- The cluster is stopped and removed, and 5501 is free.

**Baseline (measured).** On `49cec53`:
- `db-migrate-clean` ok: 47 apply-time blocks (37 re-run as written, 10 superseded and replaced) and
  every catalog-rule probe clean after its self-tests. The updated_by UPDATE closure probe reports 19,
  and the pinned policy probe reports 1.
- `db-rls-smoke` ok: 1023 cases.

**Tags used below.**
- **[M]** measured on the live cluster, with the probe id from my scripts.
- **[R]** read from the file and line named.
- **[I]** inferred from reading, not executed.

## 3. The seven questions, answered

### (1) Tenant isolation: holds on every path I tried [M]

Owner B reads only B's rows in both tables (I01). Owner A holds B's exact ids and gets nothing back:
- UPDATE by id returns `UPDATE 0` on the schedule and the placement (I02, I03);
- `MERGE … WHEN MATCHED` returns `MERGE 0` on both (I13);
- a CTE `UPDATE … RETURNING` counts 0 (I16).

Forged scope is refused by row level security before any foreign key runs, so no key-existence oracle
arises (I04-I07):
- A's workspace and business with B's target, B's workspace with B's target, A's workspace with B's
  business and item, and A1's business with A2's item are all refused.
- The first, third and fourth name the restrictive narrowing in the error. The second is refused by
  the permissive role check.

Scope columns and `content_target_id` / `content_item_id` are outside the UPDATE grants, so a row
cannot be moved across tenant or scope (`permission denied`, I08).

INSERT … ON CONFLICT:
- `id` is not insertable, so `ON CONFLICT (id)` against B's id is refused at the grant (I09).
- `ON CONFLICT (content_target_id) WHERE status IN (draft, armed)` with B's target is refused by the
  INSERT WITH CHECK before any conflict is tested. This holds for both DO UPDATE and DO NOTHING, so a
  silent `INSERT 0 0` oracle does not exist (I10). The editor gets the same refusal on an occupied
  target (I22).
- On a caller's own target, `DO UPDATE SET publish_intent_id` is refused at the grant (I11), and
  `DO UPDATE SET status = 'armed'` is refused by the WITH CHECK (I12).

MERGE:
- `MERGE … WHEN NOT MATCHED THEN INSERT` on B's target is refused (I15).
- A MERGE that arms one's own draft is refused (I14).

Member scope:
- `user_admin_a` is scoped to business_a1. It reads no business_a2 placement or schedule, updates
  none (`UPDATE 0`), and creates none (the narrowing error) (I17).
- `user_page_editor_a` is scoped to page_a1. I promoted it to admin inside the transaction (I18). It
  does not see a sibling-page schedule, cannot cancel it (`UPDATE 0`), and cannot schedule or place on
  the sibling page. It can schedule on its own page.
- The page-scoped editor reads the business-level placement (021's "a page covers its parent
  Business") and not a sibling-page one (I19).
- The suspended viewer sees zero rows (I20). An owner suspended inside the transaction sees zero,
  cancels nothing and inserts nothing (I21).

**Answer: no identity of tenant A reached tenant B's rows by any of these paths.** A page-scoped
member did not reach outside its scope through the content-item narrowing.

The narrowing asks the scope of the ITEM. A destination (social account) carries no page scope in
this schema: no channel-binding table exists yet [M]. So a page-scoped owner or admin can schedule a
business-level item to any of the workspace's accounts. That is 081's model, inherited [R]
`081_content_targets.sql:126-139`, and not new here.

**What the suite does not prove about scope is F2.** The schedule narrowing has no case at all, and
gutting it passes every layer.

### (2) Attribution: updated_by holds; created_by does not survive a looser sibling [M]

At INSERT:
- `created_by` naming another member is refused on both tables, and so is a NULL (A01, A02).
- `updated_by` is outside both INSERT grants (A03).

At UPDATE:
- `created_by` is outside both UPDATE grants (A04).
- `updated_by` NULL, another member's id, or left unchanged by a different updater is refused (A05,
  A06).
- A client-supplied `updated_at` is overwritten by the trigger (A07).

Under a later loose permissive UPDATE sibling that binds neither updated_by nor status (DU1, quoted in
§4), batch 105/123's restrictive closure still refuses an update naming the editor on both tables. The
error names `calendar_items_updated_by_on_update_is_caller` and
`content_schedules_updated_by_on_update_is_caller`. So updated_by is closed at UPDATE in the class
105/123 closed.

At INSERT, **created_by is not**. Under a later permissive INSERT sibling (DC1), migrate-clean and
rls-smoke stay green, and the owner inserts a placement and a schedule naming the editor as
created_by. That is blocker 186's recorded class (F3).

### (3) The state machine: shut today, held by one permissive policy [M]

As shipped, no client can do any of the following (measured refusals):
- arm, complete, fail or dispatch a schedule (S01; the arm and dispatched cases);
- edit an armed schedule in place (S02);
- set `status`, `publish_intent_id` or `version` at INSERT, or `publish_intent_id` or `version` at
  UPDATE (grant layer, S11);
- revive a cancelled schedule (`UPDATE 0`, S04);
- touch a dispatched or completed one (`UPDATE 0`, S05).

Two concurrent sessions creating a draft for one free target leave one row, and the second session
gets `23505` (race 1). Two concurrent "cancel the live one, then re-schedule" sequences also leave
exactly one live schedule: the second session's UPDATE re-evaluates to 0 after the row lock, and its
INSERT gets `23505` (race 2).

Disarm (armed -> draft) is admitted and works (S03). §5 discusses whether it is safe.

What is not shut:
- **The whole state machine rests on the one permissive UPDATE policy and on regressions no layer
  pins.** A later sibling or a widened USING lets a client reopen cancelled, completed and dispatched
  schedules with every layer green (F1).
- A target whose schedule is `dispatched` (in flight) or `completed` can be given a new draft (S06,
  S07), because the live-per-target index covers only draft and armed (F5).

### (4) The service path holds nothing, and the closure binds [M]

`has_table_privilege` for SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER, and
`has_any_column_privilege`, are all false on both tables for `anon`, `app_worker`, `app_command`,
`app_maintenance`, `app_authz` and `service_role` (R02). `authenticated` holds only the column grants
listed in §1, with no DELETE, TRUNCATE, REFERENCES or TRIGGER.

Owner and flags: both tables are owned by `postgres`, with ENABLE and FORCE. No role is a member of
`authenticated`. `postgres` holds SET on the four app_* roles, and none of them is BYPASSRLS or
SUPERUSER.

As the service, SELECT, UPDATE and INSERT get `permission denied` (R03).

The closure binds against a grant that later reaches a service role:
- Inside a transaction I granted `app_worker` SELECT and UPDATE and added a permissive
  `FOR ALL TO app_worker USING (true)` policy on each table. The worker saw 0 rows and its arming
  UPDATE touched 0 rows (R04).
- A SECURITY DEFINER function owned by `app_authz`, with a grant and a permissive policy for
  `app_authz`, counted 0 schedules. With `content_schedules_service_path_closed` dropped inside the
  same transaction as a control, it counted 3 (R04b).

**Answer: confirmed.**

### (5) Data class and retention: no leak through errors; four integrity gaps [M]

Errors disclose nothing a client could not already read:
- A CHECK violation carries no failing-row detail, and a unique violation carries no key detail. PG
  suppresses both under RLS; verbose output shows only the constraint name (D02).
- A foreign-key violation is reached only after the RLS WITH CHECK, and every cross-scope attempt I
  made stopped there (I04-I07).

The integrity gaps:
- free text with no bound: `display_status` of 1,120,000 characters containing a phone-number-like
  string, `timezone = 'Not/AZone'`, a 100,000-character `timezone_snapshot`, and `scheduled_for` in
  1900 (D01; F8);
- `calendar_items.deleted_at` is client-supplied: backdated to 2001, postdated to 2999, and undeleted
  (S14; F9);
- nothing records transitions: the only triggers are `set_updated_at` (D04; F10);
- creation is not closed under an archived Business or Page (R01; F4).

Every active member, the viewer included, reads `created_by` and `updated_by` (D03). That is the same
projection as the rest of the schema [R].

### (6) 124's key cannot be used to learn or reference another tenant's intent [M]

No client can write `publish_intent_id`. It is outside both grants, so INSERT and UPDATE, including
through ON CONFLICT DO UPDATE, are refused at the grant before any key check runs (S11, I11). There is
therefore no client-side existence oracle.

As `postgres`, I linked schedule a1_fb to four intents (K01):
- an intent in its own scope: admitted;
- an intent of business_a2 in the same workspace: refused by `content_schedules_intent_scope_fk`;
- an intent of tenant B: refused by the same key;
- a random uuid: refused by the same key.

The key is MATCH SIMPLE, NO ACTION, validated, and indexed. A client holds no DELETE on
`publish_intents`, and its UPDATE grant there (`cancelled_at, updated_at, updated_by`) cannot re-key
an intent.

What the key does not say is F7: it admits an intent of a different item, and of a different page, in
the same business, and it admits one intent shared by two schedules (K01).

### (7) Stop-the-line risks: none found. §6 gives the verdict

## 4. Findings

Grades are A1's. The Owner may read any of them higher, and where I think that reading is reasonable
I say so.

### F1: MEDIUM. The schedule state machine has no closure a sibling policy cannot widen, so a client can reopen cancelled, completed and dispatched schedules with every layer green (batch 125's class)

- **Where [R].**
  - `091_calendar.sql:196-201`: `content_schedules_update_scheduler` is the only thing bounding which
    rows a client may update (`USING … status in ('draft','armed')`) and what it may write
    (`WITH CHECK … status in ('draft','cancelled')`).
  - Nothing restrictive repeats either bound. The restrictive set is exactly the narrowing and two
    closures (:286-298).
  - `status` is in the UPDATE grant (:169), so unlike `publish_intent_id` and `version` it is held by
    policy alone.
  - Assertion 5 (:321-332) reads only the WITH CHECK half of that one named policy, with an unanchored
    regex. The USING half is asserted nowhere.
  - `scripts/db/run.mjs:271-272` pins exactly one row-bounding restrictive policy, 125's, on
    approval_requests.
- **Measured [M].** Each drift below was appended to 140 on a fresh cluster.
  - DS2: `alter policy content_schedules_update_scheduler on app.content_schedules using
    (app.workspace_member_role(workspace_id) in ('owner','admin'));`
    - migrate-clean 0, rls-smoke 0 (1023 cases);
    - then as owner_a: cancelled -> draft `UPDATE 1`, completed -> draft `UPDATE 1`,
      dispatched -> cancelled `UPDATE 1`.
  - DS1b: a later sibling, "the owner may reopen a schedule": `create policy
    content_schedules_update_owner_reopen … for update to authenticated using
    (app.workspace_member_role(workspace_id) = 'owner' and status in ('cancelled','failed','completed'))
    with check (updated_by = (select auth.uid()) and app.workspace_member_role(workspace_id) in
    ('owner','admin') and status = 'draft');`
    - migrate-clean 0, rls-smoke 0;
    - cancelled -> draft `UPDATE 1`, completed -> draft `UPDATE 1`.
  - DS3: the WITH CHECK widened with an `OR … status = 'armed'` branch.
    - migrate-clean 0, so assertion 5's regex still matched;
    - caught only by the one case `owner-a-cannot-arm-a-draft` (rls-smoke 1 failure).
  - DS1 and DU1: broad siblings that also admit arming.
    - caught by the two cases `owner-a-cannot-arm-a-draft` and
      `owner-a-cannot-mark-a-schedule-dispatched`, and by nothing else.
- **Why it matters.** It is the shape A1 N1 measured on approvals, which batch 125 closed with a
  restrictive row-bounding policy pinned by text. §4 invariant 8's counterpart here is SCHEDULE-HISTORY
  "calendar/schedule state". A completed schedule reopened to draft is, once a writer that arms exists,
  a second publication of a target that already succeeded. That is CONTRIBUTING_AGENTS' "duplicate
  external side effects" class.
- **Why MEDIUM, not HIGH.** Nothing admits it today. Reaching it needs a later policy edit, and, for
  the duplicate publish, a writer that does not exist (blocker 191(b)). The Owner may reasonably read
  it as HIGH, because it is the publish gate.
- **Remedy (inside this package's writable paths; 091 is not integrated, so it can be amended in place
  before merge).**
  1. Add a restrictive policy `content_schedules_client_transition_is_bounded`: `as restrictive for
     update to authenticated using (status in ('draft','armed')) with check (status in
     ('draft','cancelled'))`. It refuses nothing that works today.
  2. Add it to `PINNED_POLICIES`, with a self-test drift.
  3. Replace assertion 5 with exact deparse equality on both halves of both policies.
  4. Add cases: owner cannot reopen a cancelled, a completed or a failed schedule; owner cannot cancel
     a dispatched one. The fixture sets the state as `postgres`, as it already does for `armed`.
  5. Optionally, a restrictive INSERT twin (`status = 'draft' and publish_intent_id is null and
     version = 1`). The INSERT grant already holds it at the privilege layer (S11).

### F2: MEDIUM. The schedule narrowing has no case and no text pin; gutting it passes every layer, and a Business-scoped admin then reads, cancels and creates schedules outside its scope

- **Where [R].**
  - `091_calendar.sql:225-250` (schedules) and `:205-224` (calendar).
  - Assertion 2 (:286-298) checks the restrictive policies' NAMES only.
  - 081's block asserts that both halves of its narrowing resolve through `content_items`, and checks
    both branches (`081_content_targets.sql:657-690`). The 091 header claims "Both halves, as 040's
    probe taught" (:203-204), but no line of 091 checks it.
  - §8.6 cases 3 and 4 have no case on `content_schedules`, and case 4 has none on `calendar_items`
    (`isolation-cases.mjs:16800-17150`; the only scope case is
    `editor-a-cannot-see-the-placement-outside-their-scope`, :16854).
- **Measured [M].**
  - DN1: `alter policy content_schedules_scope_narrowing on app.content_schedules using (true) with
    check (true);`
    - migrate-clean 0, rls-smoke 0;
    - then `user_admin_a` (scoped business_a1) sees a business_a2 schedule (count 1), cancels it
      (`UPDATE 1`), and creates one on content_target_a2 (`INSERT 0 1`).
  - DN2: calendar narrowing WITH CHECK set to `true`, and the USING's page branch replaced by the
    Business question.
    - migrate-clean 0, rls-smoke 0;
    - with the a2 placement soft-deleted inside the transaction, `user_admin_a` creates a business_a2
      placement (`INSERT 0 1`), a write it then cannot read back.
    - The USING half of DN2 changed nothing: the subquery reads `app.content_items` under the caller's
      own RLS, so the item's narrowing still hid the sibling-page item. That is defence in depth for
      reads, not for writes whose WITH CHECK is gutted.
  - Negative control: replaying `ci.yml`'s `control()` for each table gave exactly seven failures, as
    the commit says. The seven on `content_schedules` contain no scope case, so the control cannot tell
    whether the schedule narrowing is there.
- **Why MEDIUM.** It is intra-tenant scope, not cross-tenant, and the policy is correct today. But it
  is the one control between a narrowed member and the rest of the workspace's schedules, and nothing
  would notice it gone.
- **Remedy.**
  1. Assert both halves of both narrowings by exact deparse text, or at least 081's shape: both halves
     name the parent table and both `member_scope_admits_*` branches.
  2. Add cases on the 091 fixture:
     - `admin-a-cannot-see-a-schedule-outside-their-scope`, which needs a schedule on
       content_target_a2 in the 091 fixture;
     - `admin-a-cannot-cancel-…` of the same row, `no-effect` with an owner witness;
     - `admin-a-cannot-schedule-a-target-outside-their-scope`, on content_target_a2, expecting
       `denied/policy`;
     - `page-editor-a-cannot-see-a-sibling-page-schedule`, which needs a schedule on
       content_target_a1_sibling_page;
     - `admin-a-cannot-place-an-item-outside-their-scope`, on content_item_a2, expecting
       `denied/policy`. Under DN2 this case gets 23505 and fails, which is the point.
  3. These also give the schedules control a scope case.

### F3: LOW. created_by at INSERT is bound only inside the permissive INSERT policies, and blocker 186's count is now stale

- **Where [R].**
  - `091_calendar.sql:176-179` and `:189-193`.
  - The header (:37-41) explains why 102's updated_by INSERT closure does not apply. It says nothing
    about created_by.
  - Blocker 186 (`WP-0A-DB-00.json:438`) records "on seventeen tables created_by is bound only inside
    the permissive INSERT policy … Owed: 102's shape for created_by". 091 adds two tables to that class
    and leaves the count at seventeen.
  - No §8.6 case-8 case forges created_by at INSERT on either table.
- **Measured [M].** DC1:
  - on each table, `create policy <t>_insert_import … for insert to authenticated with check
    (app.workspace_member_role(workspace_id) in ('owner','admin') [and status = 'draft'])`;
  - migrate-clean 0, rls-smoke 0;
  - the owner inserts a placement and a schedule naming `user_editor_a` as created_by (`INSERT 0 1`
    each).
- **Remedy.**
  - Cheapest: two cases (`owner-a-cannot-place-…-naming-another-creator`,
    `owner-a-cannot-schedule-…-naming-another-creator`). A sibling that admits the forged row fails
    them, which is exactly what would have caught DC1.
  - Structural, and what blocker 186 asks: `<t>_created_by_is_caller`, restrictive for insert,
    `with check (created_by = (select auth.uid()))`, on both tables from birth. That is the same "from
    birth" reasoning 091 applied to updated_by.
  - Either way, update blocker 186 to name the two new tables.

### F4: LOW. §11.3 "archive closes new creation" is not enforced: schedules and placements are created under an archived Business or Page

- **Where [R].**
  - The INSERT policies (`091_calendar.sql:176-179`, `:189-193`) and both narrowings carry no
    `archived_at` clause.
  - 040 does: `040_knowledge.sql:560-590` refuses creation under an archived Business or Page.
  - Blocker 191(f) records only the other half of §11.3, "existing schedules must be cancelled or moved
    by an explicit command".
- **Measured [M].**
  - With business_a1 archived inside the transaction, the owner creates a schedule on
    content_target_a1_page and a placement for content_item_a1_page (`INSERT 0 1` each).
  - With page_a1 archived, the owner creates a schedule on that page's target (`INSERT 0 1`).
  - Control: a knowledge item under the same archived business is refused (R01).
- **Context [R].** 080, 081 and 120 carry no archive clause either (`grep archived_at`), so this may be
  a content-side gap across the schema. For 091 it matters more than for a draft item, because a
  schedule is the object that becomes a publish.
- **Remedy.** Either add the archive clause to both INSERT policies, reached through the content item's
  Business and Page as 040 does, or extend blocker 191(f) to record that half as owed, with the
  upstream families named.

### F5: LOW (A5's to decide). `dispatched` is outside the one-live-per-target rule, and a completed target can be scheduled again

- **Where [R].**
  - `091_calendar.sql:119-122`: the unique index covers `status in ('draft','armed')`.
  - The comment calls cancelled, completed and failed "history" and says nothing about dispatched,
    which is in flight, not final (SCHEDULE-HISTORY runs "12 months after final state").
- **Measured [M].**
  - With a1_ig set to dispatched as `postgres`, the owner creates a second schedule on the same target
    (`INSERT 0 1`). The target then carries one dispatched and one draft (S06).
  - With a1_ig completed, the owner creates a new draft on the already-published target (S07).
- **Why it matters.** Latent today, because no writer arms. Once one exists, it is the
  duplicate-publish class, and the publisher's idempotency keys (120) are per intent, not per target
  [R, §4.8].
- **Remedy.** For A5: add `dispatched` to the live predicate now, while no row can be dispatched, so
  no data needs cleaning. Decide explicitly whether a completed target may be scheduled again; if
  republishing is a feature, make it its own command.

### F6: LOW (A5's to decide). A disarm keeps a dispatcher's intent link and moves no version; and "RLS cannot see the old value" understates what RLS can bound

- **Where [R].**
  - `091_calendar.sql:27-29` ("Disarming … is admitted because RLS cannot see the old value") and
    blocker 191(a).
  - `version` is never moved by any write (:103-104). `publish_intent_id` survives every client
    transition.
- **Measured [M].**
  - With a1_ig linked to publish_intent_a1 as `postgres`, the owner disarms it and moves its time by 30
    days. It is then a `draft`, still linked, at version 1, and can be re-timed again while still
    linked (S09).
  - Two client edits leave version 1 (S10).
- **Why it matters.** A dispatcher that claims with `… where id = $1 and version = $v` would not see a
  client's disarm or re-time. A linked-then-disarmed draft names an intent pinned to a time it no
  longer has.
- **On the header sentence.** USING is evaluated on the old row, so RLS can bound which armed rows a
  client may disarm, for example only unlinked ones, or only outside a lead window before
  `scheduled_for`. What RLS cannot do is relate the old value to the new one. The sentence frames A5's
  options as narrower than they are.
- **Remedy.** For A5, see §5, items 1-3.

### F7: LOW. 124's key is tenant-safe, but it does not tie a schedule to its own target's intent, nor one intent to one schedule

- **Where [R].** `124_calendar_publish_intent_fk.sql:14-18`: the key covers (workspace, business,
  intent) only.
- **Measured [M] as `postgres`.**
  - schedule a1_fb (content_item_a1, business-level) links to `publish_intent_a1_sibling_page`, an
    intent for a different item on a sibling page: `UPDATE 1`;
  - two schedules link to one intent: `UPDATE 2` (K01).
- **Why LOW.** No client can write the column, so this matters only for the future writer.
- **Remedy.** For the writer's owner (A5/A0): when the dispatcher is designed, bind the intent to the
  schedule's target. Either a trigger comparing `publish_intents.content_item_id` and the pinned
  version with the target's, or carry `content_item_id` so a composite key can say it. Consider
  `unique (publish_intent_id) where publish_intent_id is not null`.

### F8: LOW. Free-text columns are unbounded and the zones are unvalidated

- **Where [R].** `091_calendar.sql:56` (`timezone`), `:59` (`display_status`), `:99`
  (`timezone_snapshot`). The only checks are "not blank" (:67-69, :111).
- **Measured [M].** D01, as listed in §3(5). Every active member, the viewer included, reads the
  result.
- **Why it matters.** §6's deliverable for 091 is "timezone-safe scheduling". An invalid zone is
  stored now and fails later, in the conversion path. An unbounded label in CONTENT-2 is also a place
  for data nobody classified.
- **Remedy.**
  - Length bounds on all three.
  - A zone check against `pg_timezone_names`. It has to be a trigger, since a CHECK cannot read a
    catalog.
  - A `display_status` vocabulary once A5 or Product names one (blocker 191(e)).
  - Whether `scheduled_for` may be in the past is A5's call.

### F9: LOW. `calendar_items.deleted_at` is the client's value, and the retention sweep will read it

- **Where [R].** `091_calendar.sql:156-157` (`deleted_at` in the UPDATE grant) and :85-88
  (SCHEDULE-HISTORY, "12 months after final state", enforced by batch 160).
- **Measured [M].** The owner soft-deletes a placement dated 2001, undeletes it, then dates it 2999
  (S14). An undelete that collides with a newer live placement is refused by the unique index (S15).
- **Context [R].** 125 made `decided_at` the database's for this reason: A1 F4 and Q0 F7 on 123, "batch
  160's retention sweep will read the value".
- **Remedy.** Either a trigger that sets `deleted_at` to `now()` on NULL -> value and refuses any other
  change except a command-path undelete, or a line in the batch 160 blocker saying the sweep must not
  trust this column.

### F10: INFO. No transition history exists for "calendar/schedule state"

- **What.** `updated_by` is the only actor record, and the next edit overwrites it: the member who
  disarmed a schedule is lost at the next re-time (S09, D04).
- **Where [R].** §10 names the class "calendar/schedule state". §5's module table says "mutable state +
  history". Batch 141 owns audit hooks.
- **Remedy.** Record it where 141's owed coverage is listed, if it is not already there.

### F11: INFO. Schedules and placements are created on soft-deleted targets and items (S12 [M])

A5 should decide whether that is intended. RLS can refuse it through the same subquery the narrowing
already runs.

### F12: INFO. Claims I checked that hold

- The commit's negative-control claim: exactly seven cases of each family fail with RLS off, and no
  others [M]. The claim "no other case id contains `calendar` or `schedule`" also holds [R]: 25 ids
  match, all in 091's block.
- "33 cases" [R].
- "1023 cases" and "19 closures" [M].
- On the claim "migrate-clean 47 blocks": the self-test counts I saw match the commit [M].

## 5. The schedule states: what I measured, and what I would want A5 to decide

I do not approve these states. On the measurements above, this is what I would put to A5, in order of
how much a wrong answer costs:

1. **Disarm (armed -> draft).**
   - What I measured: as shipped it is the safe direction. It moves away from publishing, and getting
     back needs the gates that no client can pass (S03, S02, S01).
   - What is not settled: a disarm after the dispatcher has linked an intent keeps the link (F6); a
     disarm close to `scheduled_for` races the dispatcher (§9.3's "schedule cancellation ขณะ
     dispatch", which only the dispatcher's claim can settle); and a client can disarm and re-time in
     one statement.
   - My recommendation: admit disarm only while `publish_intent_id is null`, and possibly only outside
     a lead window before `scheduled_for`. That is a USING bound on the old row, which RLS can express.
     Otherwise leave only cancel.
2. **The dispatcher's claim.** Whether `version` is bumped on every write (a trigger) and what the
   claim compares. At minimum it should be `status = 'armed'` plus the version, or `updated_at`, never
   the version alone (F6).
3. **Cancel of an armed schedule.** It is admitted at any time before dispatch. Whether a cancel that
   loses the race to the dispatcher is an error, or a "too late" the client sees.
4. **The live set.** Whether `dispatched` blocks a new schedule. I would say yes (F5).
5. **Scheduling a completed target again.** Refuse it, or make it an explicit republish command (F5).
6. **DB-08's acceptance line.** It reads "with approval enabled, an unapproved version cannot be
   schedule/publish". 091 admits a draft schedule for any target and gates only `armed`. A5 should say
   whether "schedule" there means the draft or the arming.
7. **Archive (§11.3).** Refuse new schedules under an archived Business or Page (F4). Decide what the
   cancel-or-move command does with existing armed schedules.
8. **Soft-deleted targets and items.** Refuse schedules and placements on them (F11).
9. **The `display_status` vocabulary** (blocker 191(e)), and a zone rule (F8).

A5's answers to 1, 4 and 7 change what RLS should say. Each is expressible in this batch's policies
without a new mechanism.

## 6. Stop-the-line verdict

**No stop-the-line risk found.**

- No tenant leakage by any path in §3(1).
- No secret or customer data stored or disclosed: the fixture is synthetic uuids and the label
  `planned`.
- Errors disclose nothing beyond what the caller already reads.
- No duplicate external side effect is reachable, because no client or service can arm (§3(3), R03).
- No lost job, and no irreversible deletion (no DELETE grant).
- No migration divergence:
  - [R] `test-kits/db/foundation-contract.test.mjs:330` declares that the provisioned instance has run
    nothing past 010, and `db-migrate-upgrade` has no fixture (`scripts/db/run.mjs:1799-1806`). So
    inserting 091 and 124 below the merged tail diverges no applied database.
  - [I] I did not measure this on the instance itself.
- No contract mismatch that bears on security.

F1 and F2 are MEDIUM detection gaps. I would **recommend** they be fixed on this branch before the
Owner presses the merge, because 091 is not integrated and can be amended in place; after the merge
each becomes a forward fix, as 123 and 125 were. Neither is a stop-the-line risk, and neither is a
condition I can impose. Whether they block the merge is the Owner's decision.

Nothing in this run's relayed request (`merge #163 แล้ว ทำต่อได้เลย`, about the already-merged #163) or
in my brief delegates #164's merge. That remains with the Owner, as blocker 190 records.

## 7. Limits

- **Same vendor and model family as the Author, spawned by the Author** (§0). My brief was A0's. I
  added the drifts in F1-F3 and the concurrency and archive probes myself.
- **Stock PostgreSQL 17.11 plus the repository's shim, not a Supabase instance.** RLS error texts and
  detail suppression are PostgreSQL's (D02). The platform's `authenticator` membership and PostgREST
  are not represented.
- **No dispatcher, command path or service identity exists**, so "the service path holds nothing"
  covers only what exists today. The races I ran are client against client (races 1-2), not client
  against dispatcher.
- **Drifts are single-file and plausible, not exhaustive.** A narrower drift than DS1b, DS2 or DN1 will
  also pass wherever no case or pin names what it changes. That is the point of F1 and F2, not a bound
  on them.
- **I ran `make db-migrate-clean` and `make db-rls-smoke` only.** I did not run `npm run check`, the
  node test suites, the handoff guard, or CI. The foundation-contract, integrity-manifest and
  branch-identity changes I read, not ran. The handoff JSON (`49cec53`) I read only by its stat.
- **I did not review** `ci.yml` beyond the two new entries and `control()`, nor the workflow's
  governance status under RFC-2026-025 §5 item 6.
- **Probe ids** (I01-I22, A01-A07, S01-S15, R01-R04b, K01, D01-D04, B1-B6, U1-U2, races 1-2) refer to my
  private scripts under `…/scratchpad/a1-091/`, which are not committed. Their SQL is summarized where
  cited. The drifts are quoted.
