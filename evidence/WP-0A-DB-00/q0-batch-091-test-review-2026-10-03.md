# Q0 independent test: batch 091 as corrected (`calendar.core`), PR #164

- **Run:** `/claude/q0_sentinel` (this run: Q0 r2 on the corrected head, private dir `q0-091c`, port 5503)
- **Role:** independent Tester. `work-packages/WP-0A-DB-00.json` names `/claude/q0_sentinel` as tester.
- **Subject:** `agent/claude/WP-0A-DB-00-batch-091`, head `604e804` (handoff alone) over `7fde2ef`
  (A0's corrections), `e8abe33`/`fca5674` (A1 and C0 reviews), `49cec53`, `0a4d485` (batch 091), base
  `86f55d2` (`main`). The branch is checked out in the main checkout, so I checked `604e804` out into
  my own branch, `test/q0-batch-091-r2`, in my own worktree.
- **Date:** 2026-10-03.

**This document RECORDS TEST RESULTS AND FINDINGS.** It advances no package status, writes
`test_verified` nowhere, repairs nothing it found, and approves nothing. The Owner chose (ค): C0, Q0
and A1 review in place of A5 (Calendar's owner). **Nothing here approves the schedule states on A5's
behalf**; where a finding is A5's to decide, it says so.

---

## 0. What I am

**I am a subagent of `/claude/a0_atlas`**, the Author of batch 091, spawned by a workflow script A0's
session runs, in a worktree that harness created, under a brief A0's script wrote. A0 chose the
branch, the port, the cluster recipe and the minimum list of mutations. **I am the same vendor
(Anthropic) and the same model family as the Author.** RFC-2026-024 is approved and withdrew the
cross-vendor condition; what remains is CONTRIBUTING_AGENTS.md's separation of duties. I record that
as the rule I ran under. **Whether this file is accepted as the Tester's signature is the Integration
Owner's and the Product Owner's act, not mine.**

A shared model is a shared blind spot. The survivors that matter most here (F1, and F5's NOT NULL rows) come from
classes the brief did not name (retyping a policy's command rather than adding one; NOT NULL), which
is the best evidence I have that I did not only test A0's list; it is not evidence that nothing
else is missing.

Two earlier Q0 runs on `49cec53` were cut off before writing anything. I read their scripts
(read-only) for the method; **I rely on none of their results** and re-measured everything below.

---

## 1. How I measured

**[M] = measured by me on this head; [R] = read, not executed.**

- PostgreSQL 17.11 (`/opt/homebrew/bin`), private cluster on `127.0.0.1:5503` only, TCP only
  (`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, `TZ=UTC`,
  **re-initdb every round**; `db/foundation/ci/supabase-shim.sql` first, then
  `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean` and
  `make db-rls-smoke`. Node `v24.20.0` checked by the round script before every measured run.
- **Each mutation is APPENDED to `db/foundation/migrations/140_audit.sql`** (the last file) for
  migrate-clean only, and the file is restored byte for byte (`cmp` against a copy saved first) before
  rls-smoke and on exit. `140_audit.sql` matched `main` byte for byte before I started and after I
  finished [M].
- The four layers are reported separately: **static** (`npm run check`), **migrate-clean** (its
  apply-time blocks, catalog-rule probes and post-migrate pass), **rls-smoke** (the 1047 cases), and
  **the CI negative control** (RLS disabled on one table, rls-smoke re-run, `control()`'s three greps).

### Baseline at `604e804` [M]

| Check | Result |
|---|---|
| `make db-migrate-clean` | exit 0; "post-migrate pass: 47 apply-time blocks, 37 re-run as written, 10 superseded and replaced" |
| `make db-rls-smoke` | exit 0; 1047 cases, 0 failed |
| `make db-rls-smoke` again on the same database | exit 0; every one of 67 tables' row counts identical before and after |
| `npm run check` | exit 0, 675 tests, 675 pass (§6) |

---

## 2. The CI negative control, reproduced (brief item 1) [M]

RLS disabled on one table on a freshly migrated, smoke-tested database; rls-smoke re-run.

| Table | Exit | Failed cases | Matching its own pattern | Matching the other 091 pattern |
|---|---|---|---|---|
| `app.calendar_items` | 2 (`db-rls-smoke: FAILED — 12 of 1047`) | 12 | **12** | 0 |
| `app.content_schedules` | 2 (`FAILED — 18 of 1047`) | 18 | **17** | 0 |

- **calendar_items, 12:** `owner-b-cannot-see-the-calendar-of-tenant-a`,
  `editor-a-cannot-see-the-placement-outside-their-remit`, `editor-a-` and `viewer-a-cannot-place-an-item-on-the-calendar`,
  `owner-a-cannot-place-an-item-of-tenant-b` (23505), `editor-a-cannot-move-a-placement`,
  `owner-a-cannot-move-a-placement-naming-another-updater`, `owner-a-cannot-undelete-a-placement`
  (23505), `admin-a-cannot-place-an-item-outside-their-remit` (23505),
  `narrow-editor-a-cannot-see-the-placement-on-the-sibling-item`, `suspended-a-cannot-see-the-calendar`,
  `owner-a-cannot-place-an-item-naming-another-creator`.
- **content_schedules, 18:** the cross-tenant, editor/approver create, arm, dispatched, editor cancel,
  forged updater, reopen/revive/rewrite/cancel-dispatched, the four Business-scope cases, the sibling
  Page read, the suspended read and the forged creator.
- **The "12 and 18" vs "23 and 32" question.** Both are right about different things: 23 and 32 are
  the number of 091 case ids each pattern *matches* (the static test, which I reproduced by loading
  `buildCases`: 23 + 32 = 55); 12 and 18 are the number that *fail* when RLS is off. Of 091's **57**
  cases, **two match neither pattern**: `owner-a-cannot-arm-a-draft` and
  `owner-a-cannot-backdate-a-deletion`. The first is one of the 18 failures under the schedules control,
  so **the CI comment's "eighteen fail and every one is a schedule" is true of the table and false of
  the pattern: 17 of 18 match `[a-z0-9-]*schedule`** (F3).
- No failure under either control matched another 091 family's pattern, and no line of the logs
  other than a case line matches either pattern (checked on the green log and both control logs).

---

## 3. The mutation table (brief items 2, 4, 7) [M]

Every row is its own re-initdb'd round. "GREEN" means that layer passed with the mutation in place.
Static (`npm run check`) was not re-run for these appended drifts (§11); §6 has the static rows.

| # | Mutation (appended after 140) | migrate-clean | rls-smoke (cases failed) | Verdict |
|---|---|---|---|---|
| M01 | calendar INSERT loses its role test | RED (block 4) | RED (2: editor, viewer place) | caught |
| M02 | calendar INSERT `or true` beside the token | RED (block 5 exact text) | RED (2) | caught |
| M03 | calendar UPDATE `using (true)` | RED (block 5) | RED (1: editor move) | caught |
| M04 | schedule UPDATE loses its status test, both halves | RED (block 5) | GREEN (closure holds) | caught by mc only |
| M05 | schedule INSERT loses `status = 'draft'` | RED (block 5) | GREEN (the INSERT grant refuses `status`) | caught by mc only |
| M06 | 7th permissive policy "owner may reopen" | RED (block 4/count) | GREEN (closure holds) | caught by mc only |
| M07 | SELECT policy retyped FOR ALL on schedules (owner/admin check) | **GREEN** | RED (2: editor cancel errors; owner forges creator) | caught by cases only |
| M08 | same on placements, admitting the approver | **GREEN** | RED (2: editor move; forged creator) | caught by cases only |
| **M08b** | **placements' SELECT policy retyped FOR ALL: editor left out of USING, `created_by` bound, approver admitted** | **GREEN** | **GREEN** | **SURVIVES (F1)** |
| **M07b** | **same on schedules, admitting the viewer** | **GREEN** | **GREEN** | **SURVIVES (F1)** |
| M36 | M08b with the editor's reads kept | GREEN | RED (1: editor move) | caught by cases only |
| M09 | schedules SELECT widened to any member row (suspended included) | GREEN | GREEN | survives, **no guarantee lost**: the restrictive narrowing also refuses a suspended member (`suspended-a-cannot-see-the-schedules` passes) |
| M10 | `content_schedules_client_transition_is_bounded` dropped | RED (pinned policy probe) | GREEN | caught by mc only |
| M11 | transition closure's WITH CHECK admits `armed` | RED (pinned policy probe) | GREEN | caught by mc only |
| M12 | `calendar_items_deleted_is_final` dropped | RED (pinned policy probe) | RED (1: undelete) | caught |
| M13 | deleted_is_final `using (true)` | RED | RED (1: undelete) | caught |
| M14 | schedules service-path closure `using (true) with check (true)` | **GREEN** | RED (1: `batch-091-closes-the-service-path-on-schedules`) | caught by its catalog case only |
| M15 | placements service-path closure recreated TO authenticated | **GREEN** | RED (1: the placements catalog case) | caught by its catalog case only |
| M16 | schedules narrowing USING gutted | RED | RED (4) | caught |
| M17 | placements narrowing WITH CHECK gutted | RED | RED (1, **by 23505**, see §4) | caught |
| R2 | schedules narrowing WITH CHECK gutted | RED | RED (1, **by 23505**) | caught |
| R3 | placements narrowing USING gutted | RED | RED (2) | caught |
| M18 | one-live index without `dispatched` | RED (block 8) | RED (1: already-dispatched) | caught |
| M19 | one-active placement index dropped | RED (block 8) | RED (1: place twice) | caught |
| M20 | schedules zone CHECK dropped | RED (block 7) | RED (1) | caught |
| R4 | both zone CHECKs dropped | RED (block 7) | RED (2: both zone cases) | caught |
| M21 | display_status bound dropped | RED (block 7) | RED (1) | caught |
| M22 | `set_deleted_at` trigger dropped | RED (block 10) | RED (1: backdate) | caught |
| M23 | `set_deleted_at` body made a no-op | RED (block 10 md5) | RED (1: backdate) | caught |
| M34 | `set_updated_at` disabled on schedules | RED (trigger probe) | GREEN | caught by mc only |
| M24 | 124's key dropped | RED (124's block, post-migrate) | GREEN | caught by mc only |
| M25 | 124's key on `publish_intent_id` alone | RED (FK-support probe) | GREEN | caught by mc only |
| M25b | M25 plus a supporting index | RED (124's block, post-migrate) | GREEN | caught by mc only |
| M26 | `grant select on content_schedules to app_worker` | RED (block 6) | RED (1: service read) | caught |
| **M27** | **`grant update (status) on content_schedules to app_worker`** | **GREEN** | **GREEN** | **SURVIVES (F2)** |
| **M28** | **`grant select (id, workspace_id, content_item_id) on calendar_items to app_worker`** | **GREEN** | **GREEN** | **SURVIVES (F2)** |
| **M35** | **`grant trigger, references on content_schedules to app_worker`** | **GREEN** | **GREEN** | **SURVIVES (F2)** |
| M31 | `grant update (version)` to authenticated | RED (block 6) | GREEN | caught by mc only |
| **M32** | **`grant update (workspace_id, business_profile_id) on content_schedules` to authenticated** | **GREEN** | **GREEN** | survives; no move possible today (F6) |
| **M29** | **`calendar_items_display_status_not_blank` dropped** | **GREEN** | **GREEN** | **SURVIVES (F5)** |
| **M30** | **`content_schedules_version_positive` dropped** | **GREEN** | **GREEN** | survives; nobody writes `version` (F5) |
| M37 | both `*_timezone_not_blank` dropped | GREEN | GREEN | survives; **no guarantee lost** (`timezone()` refuses `''` and blanks) |
| M33 | `content_schedules_due_idx` dropped | GREEN | GREEN | not a guarantee (control row) |

### The guarantee is gone in M08b and M07b, measured on the database [M]

On a database migrated with M08b, M07b, M27 and M28 together (migrate-clean exit 0, rls-smoke exit 0,
0 cases failed), as the identities the fixture defines, in rolled-back transactions:

- `user_approver_a` **inserted a placement** of `content_item_a1_page` (returned its id, `created_by` =
  the approver). §8.3 "Schedule/unschedule": approver **N**.
- `user_viewer_a` **created a schedule** (`status` draft) on `content_target_a1_page`. §8.3: viewer **N**.
- `app_worker` (`private.as_service()`) read **0** placements and was refused the UPDATE: the
  service-path closure and the absence of a permissive policy still hold at run time; only the
  claim "app_worker holds nothing" is gone (F2).

---

## 4. Do the cases fail for the right reason? (brief item 5) [M]

Every 091 refusal case was run on the clean database as its identity, in a rolled-back transaction,
and the exact error read:

- **RLS refusals** (`new row violates row-level security policy`): editor/viewer place, place of tenant
  B, forged updater/creator on both tables, editor/approver schedule, arm, mark dispatched. The two
  no-RETURNING inserts are refused **by name**: `new row violates row-level security policy
  "content_schedules_scope_narrowing"` and `"calendar_items_scope_narrowing"`.
- **Privilege refusals** (`permission denied`, also 42501): `owner-a-cannot-create-a-schedule-already-armed`
  (`status` outside the INSERT grant), `owner-a-cannot-link-a-schedule-to-an-intent` (outside the
  UPDATE grant), both deletes, `service-cannot-read-the-schedules` (no grant). Both anonymous cases
  stop at `permission denied for schema app`. The `denied` kind accepts any 42501, so these cases
  cannot tell a grant from a policy; each rests on a grant that block item 6 pins (M31 measured).
- **Zone cases:** `time zone "Not/AZone" not recognized` (22023), raised inside the CHECK's
  `timezone()` call; dropping the CHECK makes the case fail (M20, R4), so they rest on the CHECK.
- **The no-RETURNING inserts rest partly on the unique index.** Both target an item/target that
  already carries a live fixture row (`calendar_item_a2`, `content_schedule_a2`). With the narrowing's
  WITH CHECK half gutted (M17, R2) the insert is **not** admitted silently: it reaches the unique index
  and raises **23505**, and the case fails as "not an RLS refusal". So detection holds, but by
  collision, not by the write being observed as permitted (F7). `owner-a-cannot-place-an-item-of-tenant-b`
  collides the same way under the RLS-off control.
- **`no-effect` cases** read back a witness column the statement sets; under the controls they failed
  as "1 row(s) were visible" or by 23505, never by passing.
- **`owner-a-cannot-backdate-a-deletion`** (`rows`) compares `deleted_at = now()` inside the case's own
  transaction; dropping or hollowing the trigger fails it (M22, M23).

## 5. The fixture (brief item 6) [M]

- **Idempotent:** rls-smoke twice on one database, both exit 0, all 67 tables' row counts identical.
  The fixture applied a second time by itself: `INSERT 0 0` four times.
- **Confined to 091's tables:** with 091's rows deleted, re-applying `091-calendar-fixture.sql` alone
  inserted 4 + 1 + 3 + 5 rows into `calendar_items` (5) and `content_schedules` (8), and **no other
  table's row count changed** (66 tables compared before and after).

---

## 6. Static suite and in-file mutations (brief item 3) [M]

`npm run check` on the clean head: **exit 0, 675 tests, 675 pass** (Node 24.20.0). Each row below
edits the files in the worktree, runs `npm run check`, then a full round, then restores the files
with `git checkout --` (`git status` clean after each).

| # | In-file mutation | static | migrate-clean | rls-smoke | Verdict |
|---|---|---|---|---|---|
| S1 | **In 091 itself:** `calendar_items_insert_scheduler` admits the approver, and block item 5's pinned text is updated to match | **GREEN (exit 0)** | **GREEN** | **GREEN** | **SURVIVES**: nothing holds 091's text, and no case asks whether an approver may place an item (F1) |
| S2 | Transition closure removed from 091 (policy, block items 2 and 10) and from `PINNED_POLICIES`, digest **not** refreshed | RED: the probe-digest test (`'pinned policy probe'` `ac16fa955db04fc1` → `36c576ac1fd242dd`) | GREEN | GREEN (the permissive policy still says the same) | caught by static only |
| S3 | S2 with the digest refreshed | RED, **exit 86**: the integrity-manifest tripwire (`foundation-contract.test.mjs` is in `test-kits/integrity-manifest.json`) | GREEN | GREEN | caught by the tripwire only; the guard itself says a commit updating both passes, so the anchor is review |
| S4 | Block item 6's non-client-role check and block item 5's count of six removed from 091, plus M06 (7th permissive policy) | GREEN | RED (block item 4 still names the sibling) | GREEN | caught by mc |
| S4+M27 | the same, plus the app_worker column grant | GREEN | GREEN | GREEN | survives (F2's class; nothing holds the block's own text) |
| S5 | Both narrowing entries removed from `PINNED_POLICIES`, digest not refreshed | RED (digest `e587daf1be395775`) | GREEN | GREEN | caught by static only |

The `if false` / `false and` silencer rule fired on my first attempt at S2 (`no apply-time block in
any migration is silenced from inside its own predicate`), so I removed the assertions instead of
silencing them. **What holds 091's own apply-time block is review, not a test**: removing an assertion
from it (S4) or widening a policy together with its pin (S1) passes static. The PINNED_POLICIES pins
are tripwired twice (digest, then manifest), which makes such an edit visible; it cannot make it fail.

## 7. The record's §2 "Measured" column, re-measured (brief item 4) [M]

| A0's claim | Mine | Reproduced? |
|---|---|---|
| "Owner may reopen" sibling alone: 0 cases fail | M06: rls-smoke 0 failed (migrate-clean RED on the count) | **yes** |
| Sibling with the closure dropped: 6 fail, the four new ones plus arm and dispatch | R1: exactly `arm`, `mark-dispatched`, `reopen`, `revive`, `rewrite`, `cancel-dispatched` | **yes** |
| Deleted-final dropped: exactly the undelete case | M12: exactly `owner-a-cannot-undelete-a-placement` | **yes** |
| Narrowing halves: schedules USING 4, WITH CHECK 1; calendar USING 2, WITH CHECK 1 | M16: 4; R2: 1; R3: 2; M17: 1 | **yes** (both WITH CHECK ones by 23505, §4) |
| Index without dispatched: exactly that case | M18: exactly `owner-a-cannot-schedule-a-target-already-dispatched` | **yes** |
| Zone checks dropped: both zone cases fail; bound dropped: its case | R4: both; M21: its case | **yes** |
| Trigger dropped: exactly the backdate case | M22: exactly that | **yes** |
| RLS off: 12 on calendar_items, 18 on content_schedules, "each of its own family" | 12 and 18; by pattern 12/12 and **17/18** | **counts yes; "each of its own family" by pattern no** (F3) |
| migrate-clean 0, 47 blocks (37 + 10), rls-smoke 0, re-run 0 | same | **yes** |

---

Also reproduced: the `*_timezone_known` deparse is identical under `TimeZone` UTC and Asia/Bangkok
(md5 of both definitions `848fe75d14aeba83dcf4a7a0bf9e56ac` in each) [M].

### NOT NULL and defaults (a class the brief did not name) [M]

| # | Mutation | migrate-clean | rls-smoke | Verdict |
|---|---|---|---|---|
| **N1** | `content_schedules.workspace_id` drop not null | **GREEN** | **GREEN** | **SURVIVES (F5)** |
| **N2** | `content_schedules.status` drop not null | **GREEN** | **GREEN** | **SURVIVES (F5)** |
| **N3** | `calendar_items.content_item_id`, `scheduled_local_date` drop not null | **GREEN** | **GREEN** | **SURVIVES (F5)** |
| N4 | `content_schedules.status` default `'armed'` | GREEN | RED (5: both positive creates, the two uniqueness cases, the zone case) | caught by cases only |

---

## 8. Findings

Graded by what is lost and how far it is from being reachable. **None is reachable by a client on
this head**; each is a guarantee that a later migration (or a same-change edit) can remove with the
named layers green.

### F1: MEDIUM. A read policy retyped FOR ALL widens who may write, past every layer [M]

- **Where:** `db/foundation/migrations/091_calendar.sql:222-224` and `:235-237` (the two SELECT policies,
  pinned nowhere by text or command); `:375-384` (block item 4 accepts any permissive `a`/`w`/`*` policy
  whose WITH CHECK *contains* the owner/admin token); `:412-415` (the only count is "six permissive
  policies across both tables"); `tests/db/identity/isolation-cases.mjs` (no case asks an approver to
  place an item or a viewer to create a schedule).
- **Failure:** M08b replaces `calendar_items_select_active_member` by a FOR ALL policy of the same name,
  `using (is_active_member(ws) and role is distinct from 'editor') with check (created_by = uid and
  (role in ('owner','admin') or role = 'approver'))`. The count stays six, the roles stay
  `authenticated`, the token is present. **static, migrate-clean, rls-smoke and the negative control
  are green**, and on that database `user_approver_a` inserted a placement. M07b does the same on
  schedules and `user_viewer_a` created one. §8.3 marks both N. This is the same class as C0 F2/A1 F1
  (a looser permissive sibling), reached by retyping instead of adding, which the count does not see.
  S1 shows the case gap alone: widening the INSERT policy to the approver inside 091 with its pin
  updated passes every layer.
- **Remedy:** pin both read policies in block item 5 by name, `polcmd = 'r'`, roles and exact USING text
  (WITH CHECK null); count permissive policies **per table and per command** (`r`=1, `a`=1, `w`=1, none
  `*`/`d`); add `approver-a-cannot-place-an-item-on-the-calendar`, `viewer-a-cannot-schedule-a-target`
  and the matching move/cancel cases for approver and viewer, with witnesses.

### F2: LOW. Block item 6 cannot see a column-level or TRIGGER/REFERENCES grant to a non-client role [M]

- **Where:** `091_calendar.sql:429-434` uses `has_table_privilege(r, t, 'SELECT, INSERT, UPDATE, DELETE,
  TRUNCATE')`, which is false for a column-only grant and does not list TRIGGER or REFERENCES.
- **Failure:** M27 (`grant update (status) … to app_worker`), M28 (column SELECT on placements) and M35
  (`grant trigger, references`) pass every layer. Measured: `has_any_column_privilege('app_worker',
  'app.content_schedules', …)` is true while the block's test is false. At run time the service still
  reads 0 rows and is refused the update (closure plus no permissive policy), so the **claim** "app_worker
  holds nothing" is what is lost, and the closure becomes the only layer.
- **Remedy:** test `has_any_column_privilege` as well, and list all seven table privileges; or select from
  `information_schema.table_privileges`/`column_privileges` for the five roles.

### F3: LOW. "Each of its own family" is true by table, not by pattern; two 091 ids escape both patterns [M]

- **Where:** `.github/workflows/ci.yml:781-790` (the comment: "eighteen fail and every one is a
  schedule"); `evidence/WP-0A-DB-00/a0-batch-091-integration-2026-09-28.md` §2, row C0 F11;
  `tests/db/identity/identity-isolation.test.mjs:11430-11450` (holds that every id a pattern matches
  is 091's, not that every 091 id is matched).
- **Failure:** with RLS off on `content_schedules`, 18 cases fail and 17 match `[a-z0-9-]*schedule`;
  `owner-a-cannot-arm-a-draft` matches neither 091 pattern. `owner-a-cannot-backdate-a-deletion` matches
  neither either. The control still bites (17 matches), so nothing is undetected today; the record's
  sentence is wrong, and a rename could move a failing case out of every family silently.
- **Remedy:** rename the two ids (e.g. `…-arm-a-draft-schedule`, `…-backdate-a-placement-deletion`),
  re-pin 23/32 to the new counts, assert every `BATCH 091` case matches exactly one of the two
  patterns, and correct the comment and the record.

### F4: LOW (A5's to decide). The zone CHECK admits spellings that mean the opposite offset [M]

- **Where:** `091_calendar.sql:63-70`, `:82-83`, `:130-132`.
- **Failure:** `timezone()` accepts `UTC+7` and `+07` and reads them POSIX-style as **UTC−7**: noon UTC
  is 05:00 in both, 19:00 in `Asia/Bangkok` (measured). `ICT`, `asia/bangkok`, `Factory`, `EST5EDT` are
  accepted too. A Thai user's natural "UTC+7" moves a placement's local day. Abbreviations are resolved
  through the `timezone_abbreviations` setting, so the "IMMUTABLE" CHECK's verdict on them depends on
  configuration [R]. The comment names "POSIX spellings such as 'UTC+7'" as admitted without saying they
  invert.
- **Remedy:** for A5: refuse offset and abbreviation forms (for example require `~ '^[A-Za-z]+(/[A-Za-z0-9_+-]+)+$'`
  besides `timezone()`), or a pinned IANA allowlist; and add a case for `UTC+7`.

### F5: LOW. NOT NULL and two CHECKs are asserted by nothing [M]

- **Where:** `091_calendar.sql:55-92`, `:108-138`; block item 7 (`:441-464`) pins five constraints, not
  `calendar_items_display_status_not_blank`, `content_schedules_version_positive` or any NOT NULL.
- **Failure:** N1-N3, M29, M30 pass every layer. A null `workspace_id` makes the composite scope key
  MATCH SIMPLE-skip; a null `status` escapes `status_known` and both partial indexes. No client can write
  either today (grants and policies refuse), so this is latent, batch 120's Q0 F1 class repeated.
- **Remedy:** pin `attnotnull` for every NOT NULL column of both tables, and the two CHECKs by text, in
  block item 7.

### F6: INFO. Block item 6 omits the scope columns on UPDATE [M]

- **Where:** `091_calendar.sql:419-425`. M32 (`grant update (workspace_id, business_profile_id)` on
  schedules) passes every layer. The composite key and unique ids still make a move impossible, so §8.5
  "no move across tenant/scope by update" rests on the key alone. **Remedy:** add `workspace_id`,
  `business_profile_id` and `created_by` (UPDATE) for both tables to the list.

### F7: INFO. The two no-RETURNING inserts detect a gutted WITH CHECK by collision [M]

- **Where:** `admin-a-cannot-place-an-item-outside-their-remit`, `admin-a-cannot-schedule-a-target-outside-their-remit`
  (and, under the control, `owner-a-cannot-place-an-item-of-tenant-b`); fixture rows `calendar_item_a2`,
  `content_schedule_a2`, `calendar_item_b1`.
- **Failure:** with the narrowing's WITH CHECK gutted (M17, R2) the insert reaches the unique index and
  raises 23505; the case fails as "not an RLS refusal", not as "permitted". Detection holds, by a second
  guarantee. **Remedy:** aim them at an item/target with no live row, so the regression reads as what it is.

## 9. Brief item 7: what reports green while a guarantee is gone

M08b/M07b (F1: who may write), M27/M28/M35 (F2: the service's grants, run time still closed), N1-N3,
M29, M30 (F5), S1 and S4 (same-change edits of 091, held only by review). Not lost despite green: M09
(the narrowing also refuses a suspended member), M37 (`timezone()` refuses blanks), M33 (an index).

## 10. Stop-the-line verdict

**No stop-the-line.** I found no tenant leak, no secret exposure, no duplicate side effect, no lost job,
no migration divergence and no client path to a forbidden write **on this head**: every 091 refusal
case refuses, for the reason it names, and the corrections hold under every mutation of the classes
C0 and A1 named. F1 is MEDIUM because it is that same class (a sibling that widens who may write),
reached by retyping a read policy rather than adding one, with every layer green. A0 fixed the two
earlier MEDIUMs before merge; whether F1 is fixed before merge or recorded as a blocker is the
Owner's call. I do not record it as blocking the Owner's merge.

## 11. Limits

- I did not re-measure ON CONFLICT, MERGE or CTE paths, concurrency on the unique indexes, or
  `pg_dump`/restore of the zone CHECK; C0 and A1 reported the first three.
- The M, R and N rows ran migrate-clean and rls-smoke, not `npm run check`: an appended drift changes no
  file the static suite pins except `140_audit.sql`, which I restored before each rls-smoke. The CI
  negative control was run for the two 091 tables on the clean head only, not under each mutation.
- S3 stopped at the manifest tripwire; I did not regenerate the manifest, so "a commit updating both
  passes" is the guard's own statement [R], not my measurement.
- The abbreviation/GUC dependence in F4 is read, not measured under another `timezone_abbreviations` set.
- I did not run CI, push, or open a PR. I cannot judge §8.3's `P` for the editor or the schedule states;
  those are A5's.

## 12. Reproducing this

Scripts (private, not committed) under the session scratchpad's `q0-091c/`: `round.sh <label> <drift|-> [rerun|control:<table>|keep]`
(re-initdb, shim, migrate-clean with the drift appended to `140_audit.sql`, restore, rls-smoke),
`batch.sh`, `summ.mjs`, `controls.sh`, `runS.sh`/`applyS.mjs` (in-file mutations, restored with
`git checkout --`), `reasons.mjs` (each refusal case's exact error), `idem.sh` (idempotence and
confinement), and the drift texts `drifts1.txt`-`drifts4.txt`. Each drift's SQL is quoted in its row above.
