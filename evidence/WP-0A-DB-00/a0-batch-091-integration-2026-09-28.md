# A0 integration record: batch 091, what the role runs found, and what changed

- **Author run:** `/claude/a0_atlas`
- **Package:** `WP-0A-DB-00`
- **Branch:** `agent/claude/WP-0A-DB-00-batch-091` (PR #164)
- **Reviewed head:** `49cec53` (batch 091 is `0a4d485`), over `main` `86f55d2`

C0 and A1 reviewed that head in place of A5, by the Owner's choice (ค). Their files are
cherry-picked with `-x` (C0 `a6f30ef` → `fca5674`, A1 `2246716` → `e8abe33`). The corrections are
`7fde2ef`. Q0 then tested the corrected head, and C0 and A1 re-verified it (§4, §6); the second
round's changes are the commit that follows those three files. This file approves nothing, and it
does not approve the schedule states on A5's behalf.

## 1. The headline

**C0 and A1 both report no stop-the-line and nothing blocking the Owner's merge**, and each
reproduced the author's claims. They measured the following on the database as built:

- Cross-tenant access is refused on every path, including UPDATE, ON CONFLICT, MERGE and CTE.
- Business and Page scoping holds, and a suspended member sees nothing.
- No client can arm, dispatch, complete or fail a schedule, or link one to an intent.
- The service roles hold nothing, and the service-path closures bind.
- The fixture is idempotent and confined to 091's tables.
- The per-table negative control fails cases of its own table on each table. (This line said "exactly
  seven, each of its own family", which was the first head; on the corrections it was 12 and 18, and
  on the second round's head it is 15 and 21, every one matched by its own pattern: §6.)

**The same two MEDIUM findings from both.** Each is a guarantee that holds today but that nothing
asserts, so a later migration could remove it with every layer green:

1. **The state machine rests on one permissive policy** (C0 F2, A1 F1). This is batch 125's class.
   A later "owner may reopen" sibling let a client move a schedule cancelled → draft,
   completed → draft and dispatched → cancelled.
2. **The member-scope narrowings are asserted by nothing and exercised by no case** (C0 F1, A1 F2).
   With them gutted, a Business-scoped admin read, cancelled and created schedules of another
   Business, and wrote an out-of-scope placement.

Both recommended fixing these before merge, because 091 is not yet integrated.

## 2. Acted on in the corrections

| Finding | Change | Measured (private PostgreSQL 17.11) |
|---|---|---|
| C0 F2, A1 F1 (MEDIUM): the state machine | Restrictive `content_schedules_client_transition_is_bounded` (`USING status in (draft, armed) WITH CHECK status in (draft, cancelled)`) and `calendar_items_deleted_is_final` (`USING deleted_at is null WITH CHECK true`). Both are pinned by exact text in the block and in `PINNED_POLICIES`. The fixture adds cancelled, completed, failed and dispatched schedules and a deleted placement. New cases: reopen, revive, rewrite, cancel-dispatched, undelete. | "Owner may reopen" sibling alone: rls-smoke 0 cases fail (the closure holds), and migrate-clean fails as well, on block item 5's count of permissive policies (A1 N2 on the corrections: this row reported only the rls-smoke half). Sibling with the closure dropped: 6 fail, the four new ones plus arm and dispatch. Deleted-final dropped: exactly the undelete case. |
| C0 F1, A1 F2 (MEDIUM): the narrowings | Both narrowings are pinned by exact deparse in `PINNED_POLICIES`, both halves. Fixture rows outside the Business (`content_schedule_a2`) and on the sibling Page (`calendar_item_a1_sibling_page`, `content_schedule_a1_sibling_page`). Seven cases: Business-scoped editor and admin reads, the admin's cancel, schedule and placement, and the Page editor's reads. The two insert cases carry **no RETURNING**, so the USING half cannot stand in for the WITH CHECK half. | Each half gutted separately, on each table: schedules USING → 4 cases fail, WITH CHECK → 1; calendar USING → 2, WITH CHECK → 1. With RETURNING, the calendar WITH CHECK half was not detected (measured). |
| A1 F5: `dispatched` not live | The one-live-schedule index now covers draft, armed and dispatched. New case: scheduling a target whose send is in flight. | Index without dispatched: exactly that case fails |
| C0 F8, A1 F8: zones and lengths unchecked | `*_timezone_known`: at most 64 characters, and `timezone(text, timestamp)` must read the zone. That function is IMMUTABLE and raises 22023 on an unknown name. The literal is a timestamp WITHOUT a zone, so the deparsed text does not depend on the session's TimeZone. `calendar_items_display_status_bounded`: 64. The first draft's comment claiming this could not be checked is corrected. | Zone checks dropped: both zone cases fail. Bound dropped: its case fails. The deparse was identical under UTC and Asia/Bangkok, but NOT under DateStyle 'SQL, DMY' or German, where the quoted literal deparsed as '01/01/2000' and 091 failed to apply (C0 G2, measured; this cell said only "identical under UTC and Asia/Bangkok"). The second round's literal is make_timestamp(...), §6. |
| A1 F9: `deleted_at` client-chosen | `private.set_deleted_at()` (SECURITY INVOKER, `search_path=""`, no PUBLIC EXECUTE) records `now()` when `deleted_at` goes from NULL to a value. 125's pattern; its definition and body md5 are pinned in the block. | Trigger dropped: exactly the backdate case fails |
| A1 F3, C0 F3: §8.6 coverage | Cases added: forged `created_by` on both tables, suspended reads on both, the anonymous read on schedules. Labels corrected (cross-tenant §8.6/5, anonymous §8.6/7). | Pass |
| C0 F4: closures and keys by name only | Two catalog cases read back the service-path closures. The block checks both composite scope keys by definition text. Its comment claiming the deferred key's absence was checked is corrected. Block item 4 now includes FOR ALL, and item 5 pins all four write policies, both halves, by exact text, plus the count of permissive policies. | migrate-clean |
| C0 F11: CI entries | The comment's counts were re-measured (12 and 18). The calendar pattern is `(calendar\|placement\|place-an-item)`, so all 23 placement ids fall under it. Seven ids were renamed off other families' patterns (six `workspace` → `tenant`, one `scope` → `remit`), and the new ids use `tenant`, `remit` and `sibling-item`, as batch 120 did (this said "fourteen", the number of diff lines; C0 G4). A static test holds both patterns to 091's cases, disjoint and pinned at 23 and 32. | With RLS off, calendar_items fails 12 cases and content_schedules 18, each failing on its own table. By PATTERN it was 12 of 12 and 17 of 18: `owner-a-cannot-arm-a-draft` matched neither pattern (Q0 F3, C0 G7); the second round renames it and holds every 091 id to exactly one pattern (§6) |
| C0 F5, F6, F7, F9, F10, F15; A1 F4, F6, F7, F10, F11 | Recorded on the batch 091 blocker, items (a) to (h): the questions for A5, 124's item binding, §11.3's archive-closes-creation half, the editor's `P` against §5.1, §7 and DB-08, `version`, transition history, soft-deleted parents, and `unique active`. Blocker 173's opening is corrected. Blockers 139, 148 and 168 are cross-referenced. Blocker 186 names the two new `created_by` tables. | — |
| C0 F13, F14, F15 (wording) | The fixture-order comment, the disposition's four points, the plan's row B and the `violates` names on the two 23505 cases. | — |

## 3. Q0

Q0's first run stopped at a session limit before it wrote anything. Its re-run, on the same head in
a fresh directory, was also cut off before it committed anything. It left a mutation appended to
`140_audit.sql` in its worktree and its cluster on port 5503 running. On 2026-10-03, A0 stopped that
cluster and restored the file. The restored file matches Q0's own saved copy and `main` byte for byte.

So Q0 will test the corrected head, not `49cec53`. That run covers the corrections in §2 as well as
batch 091. In the same round, C0 and A1 re-verify the corrections.

## 4. Q0's findings

Q0 (`/claude/q0_sentinel`, a subagent of this run, same vendor and model family) tested the corrected
head `604e804` on 2026-10-03: `q0-batch-091-test-review-2026-10-03.md`. In summary:

- **No stop-the-line**, and nothing blocking the Owner's merge. Every 091 refusal case refuses, and for
  the reason it names (RLS, a grant, a CHECK or an index, each read back as its exact error).
- **Reproduced**: migrate-clean (47 blocks), rls-smoke (1047 cases) and its re-run, `npm run check`
  (675 tests), the fixture's idempotence and confinement, and every "Measured" claim in §2 -- except
  "each of its own family", which held by table and not by pattern (17 of 18; F3).
- **Mutations**: drifts appended after 140 (Q0's §3 and §7) and in-file edits of 091 (Q0's §6), each its own round. Every drift of the classes C0 and A1
  named was caught. What survived every layer: a read policy retyped FOR ALL under its own name, which
  let an approver place an item and a viewer create a schedule (**F1, MEDIUM**); a column-level,
  TRIGGER or REFERENCES grant to app_worker (F2, LOW); NOT NULL and two CHECKs asserted by nothing
  (F5, LOW); the scope columns missing from block item 6 (F6, INFO).
- **Also**: zones such as 'UTC+7' and '+07' read as UTC-7 (F4, LOW, A5's); the two no-RETURNING
  inserts detected a gutted WITH CHECK by 23505, not by the write (F7, INFO); and what holds 091's own
  apply-time block is review, not a test (S1, S4).

What changed for each finding, and what was measured after, is §6.

## 5. The corrections, measured by A0 before commit (2026-10-03)

The measurements ran on a private PostgreSQL 17.11 on 127.0.0.1:5499, from a fresh `initdb`, with the shim first and Node 24.20.0.
They were taken on the working tree that the corrections commit records:

- `make db-migrate-clean`: exit 0. The post-migrate pass reports 47 apply-time blocks: 37 re-run as written, 10 superseded and replaced.
- `make db-rls-smoke`: exit 0. Re-run on the same database (the fixture's idempotence): exit 0.
- `npm run check`: exit 0.

These are the Author's measurements. They verify nothing on a role's behalf.

## 6. Second round (2026-10-03)

Q0 tested the corrected head (`604e804`), and C0 and A1 re-verified the corrections. Their files are
cherry-picked with `-x`: Q0 `caed280` → `528bb18`, C0 `8b0c123` → `36ae3b4`, A1 `4a1bb65` → `2aee1a7`.
None reported a stop-the-line. The changes below are the commit that follows `2aee1a7`; 091 is not
integrated, so 091_calendar.sql is edited in place, as the first corrections did.

Measured by A0 on a private PostgreSQL 17.11 (127.0.0.1:5507, TCP only, a fresh `initdb --locale=C`
for every round, the shim first, Node 24.20.0). Each drift was appended to `140_audit.sql` for
migrate-clean only and the file restored byte for byte before rls-smoke; it matches `main`.

| Finding | Change | Measured |
|---|---|---|
| Q0 F1 (MEDIUM): a read policy retyped FOR ALL under its own name passed every layer | Block item 5 pins both read policies (`polcmd = 'r'`, exact USING, WITH CHECK null) beside the four write policies, and the count of six is replaced by exactly one permissive policy per table per command (r, a, w; none `*` or `d`). Six cases: `approver-a-cannot-place-an-item-on-the-calendar`, `approver-a-` and `viewer-a-cannot-move-a-placement`, `viewer-a-cannot-schedule-a-target`, `approver-a-` and `viewer-a-cannot-cancel-a-schedule` | Q0's M08b (placements, approver admitted): migrate-clean RED ("permissive policy(ies) not in their command and exact text: calendar_items_select_active_member"), rls-smoke RED, 3 cases (the approver's place, the approver's and viewer's move). M07b (schedules, viewer admitted): migrate-clean RED, rls-smoke RED, 3 (the viewer's schedule, both cancels). A new drift, the read policy retyped FOR ALL with its USING unchanged and no WITH CHECK (which block item 4 cannot see): migrate-clean RED, rls-smoke RED, 7 |
| Q0 F4, C0 G1, A1 N1 (LOW): zones such as 'UTC+7' read as UTC−7; abbreviations depend on the session; 'XYZ+3' passed | `*_timezone_is_iana` beside `*_timezone_known`: 'UTC' or an IANA Area/Location name in the ten geographic Areas, no offsets (Etc/GMT±N included), no abbreviations, no POSIX rules. Cases: `owner-a-cannot-place-an-item-in-utc-plus-7`, `owner-a-cannot-schedule-in-plus-07`, `owner-a-cannot-schedule-in-an-abbreviation` ('EST'), `owner-a-cannot-place-an-item-in-a-posix-rule` ('XYZ+3'), each 23514 naming the shape constraint, and the positive `owner-a-can-re-zone-a-placement-to-asia-bangkok`. The unknown-zone cases now use 'Asia/Not_A_Zone', which has the shape, so they still rest on `timezone()` (22023). The choice left to A5 (a pinned allowlist, and tzdata on restore) is on blocker 191 (h) | Both shape CHECKs dropped: migrate-clean RED (block item 7), rls-smoke RED, exactly the four shape cases. Both `*_timezone_known` dropped: RED, exactly the two unknown-zone cases. As postgres, 'WST' under `timezone_abbreviations = 'Australia'`, 'Asia/Bangkok-3' and 'Etc/GMT-7' are refused by the shape. The shape admits 490 of the server's 598 `pg_timezone_names`, and refuses none in the ten Areas |
| C0 G2 (LOW): the zone CHECKs' pinned text depended on DateStyle | The literal is `pg_catalog.make_timestamp(2000, 1, 1, 0, 0, 0)`; the pins are re-taken | A full round under `PGDATESTYLE='SQL, DMY'` and under `German`: migrate-clean exit 0 and rls-smoke exit 0 (three witnesses read a date through `::text`, and failed under DMY on the first try; they now use `to_char(…, 'YYYY-MM-DD')`). The md5 of all four zone constraints' deparse is identical under TimeZone UTC and Asia/Bangkok × DateStyle ISO, SQL DMY, German and Postgres DMY, and 091's apply-time block exits 0 in all eight sessions. `PGTZ=Asia/Bangkok` cannot be measured through `make`: `scripts/db/psql-driver.mjs` sets `PGTZ=UTC` on every session it opens, so the TimeZone half was measured by re-running the block in a session set to Asia/Bangkok |
| Q0 F2 (LOW): block item 6 used `has_table_privilege` only, over five privileges | Also `has_any_column_privilege` (SELECT, INSERT, UPDATE, REFERENCES), and all seven table privileges, plus MAINTAIN where the server is PostgreSQL 17 or later | Q0's M27 (`grant update (status)` to app_worker), M28 (column SELECT on placements), M35 (TRIGGER, REFERENCES), and `grant maintain`: each migrate-clean RED, "a non-client role holds a privilege on a batch 091 table" |
| Q0 F5 (LOW): NOT NULL and two CHECKs asserted by nothing | Block item 7 pins `attnotnull` for all eighteen NOT NULL columns of both tables, and `calendar_items_display_status_not_blank` and `content_schedules_version_positive` by text | Q0's N1, N2, N3: migrate-clean RED, "column(s) no longer NOT NULL", naming each column. M29, M30: RED, naming the constraint |
| Q0 F6 (INFO): block item 6 omitted the scope columns | UPDATE on `id`, `workspace_id`, `business_profile_id` and `created_by`, both tables, added to the list | Q0's M32: migrate-clean RED, naming both columns. `grant update (created_by)` on placements is RED too, at the closure coverage probe before block item 6 |
| Q0 F7 (INFO): the two no-RETURNING inserts detected a gutted WITH CHECK by 23505 | Placements: `calendar_item_a2` is now soft-deleted, so `content_item_a2` has no live placement and the out-of-remit insert aims at a free item. Schedules: `content_target_a2` is the only target under business_a2 and must keep the live `content_schedule_a2` for the out-of-remit cancel, and adding a second target would mean writing 081's table (whose own cases aim at the free pair); so the case carries `ON CONFLICT DO NOTHING`, and row level security still checks the row first | Narrowing WITH CHECK gutted on placements: rls-smoke fails exactly that case, as "returned zero rows rather than refusing", and as admin_a the placement is written (1 live row on content_item_a2, rolled back). On schedules: exactly that case, the same message; the statement is admitted and does nothing. Neither reads 23505 any more. Under the RLS-off controls both fail the same way |
| Q0 F3, C0 G7 (LOW/INFO): two 091 ids matched neither control pattern | Renamed: `owner-a-cannot-arm-a-draft-schedule`, `owner-a-cannot-backdate-a-placement-deletion`. The static test now also asserts that every one of 091's 68 cases matches exactly one of the two patterns, and pins 30 and 38. The ci.yml comment and this record carry the measured numbers | RLS off on calendar_items: 15 of 1058 fail, 15 match the placement pattern, 0 the schedule pattern. On content_schedules: 21 fail, 21 match the schedule pattern, 0 the placement pattern. No non-case line matches either |
| C0 G4, G5, G6; A1 N2, N3 (wording) | §2 corrected: seven ids renamed, not fourteen (G4); the DS1b row says migrate-clean fails as well (N2); the DateStyle sentence (G2). Blocker 191: (f) says deleted_at is trustworthy for client writes only (G5); (a) adds the visibility of soft-deleted placements (§8.5) and §10's 30-day recovery (G6), and whether `scheduled_for` may lie in the past (N3) | — |
| C0 G3 (LOW): the handoff described the first head | The handoff's text fields are refreshed to this head's figures, and its rollback sentence says what a revert of 091 removes; a commit of its own, last | `npm run check:handoff` |

Not changed: Q0's S1 and S4 (a same-change edit of 091 together with its own pin passes static) are
held by review, as Q0 says; `PINNED_POLICIES` (the catalog-rule probe) stays restrictive-only, and the
two read policies are pinned in block item 5, which the post-migrate pass re-runs after the whole
set, so a later file's retype is caught there (measured above).

### Measured on the committed tree (A0, before commit)

- `make db-migrate-clean`: exit 0; 47 apply-time blocks, 37 re-run as written, 10 superseded and replaced.
- `make db-rls-smoke`: exit 0, 1058 cases; again on the same database: exit 0, 1058.
- The two per-table negative controls: 15 and 21, each matched by its own pattern (above).
- `npm run check`: exit 0, 675 tests (the new cases are rls-smoke cases; the static test is the same
  test with two more assertions, floor 2150 → 2152).

These are the Author's measurements. They verify nothing on a role's behalf.

## 7. Third-round re-checks (2026-10-03), and what stays owed

Q0, C0 and A1 re-checked the second round's corrections, `bae8d91` (here `5523f6d`), on their own
branches and clusters. Their files are cherry-picked with `-x`: Q0 `82d5687` → `fa568a4`,
C0 `73dfbe1` → `51610c0`, A1 `d1de47f` → `9d6487c`. **None of the three reports a stop-the-line,
and none reports anything that blocks the Owner's merge.** Each reproduced the Author's mutation
results.

A0 did not change the code in this round. The remaining findings are LOW or INFO, and they are
recorded here and on the batch 091 blocker as owed:

| Finding | Grade | Owed to |
|---|---|---|
| Item 6 is a denylist. Grants it does not name pass every layer: INSERT on `deleted_at`, which allows a backdated deletion through INSERT because `set_deleted_at` fires on UPDATE only; INSERT on `created_at`; UPDATE on `created_at`; and TRUNCATE, TRIGGER, REFERENCES and MAINTAIN to `authenticated` (C0 H1, A1 R1, R3) | LOW | A0, hardening: assert the grant set by allowlist on both tables, at table and column level |
| The IANA shape admits wrong-case names (`Asia/BANGKOK`, `Asia/bangkok`) and stores them as typed. It refuses `Etc/UTC` (Q0 G1, C0 H2, A1 R2) | LOW | A5, on blocker item (h): canonicalise or refuse case variants, and decide on `Etc/UTC` |
| Nothing pins the default `calendar_items.timezone` = `Asia/Bangkok` (DEC-UX-06) (C0 H3) | INFO | A0, hardening |
| §6 says S1 is held by review only, but the six new approver and viewer cases now catch it at run time (C0 H4). Two calendar control cases still fail with 23505 (Q0 G3). After a read-policy recast, the move and cancel cases fail with 42501 (Q0 G2) | INFO | wording; recorded here |
| `service_role` is not in item 6's role list. This is the repo-wide convention (A1 R4). The custom abbreviation files on the server are unmeasured (A1 R5) | INFO | recorded |

The Owner's and A5's open questions from this round are on the blocker: (a) the visibility of
soft-deleted placements and the 30-day recovery, (a) a `scheduled_for` in the past, (h) the zone
allowlist and its case handling, and the use of `ON CONFLICT DO NOTHING` in
`admin-a-cannot-schedule-a-target-outside-their-remit`.
