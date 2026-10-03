# A0 integration record: batch 091, what the role runs found, and what changed

- **Author run:** `/claude/a0_atlas`
- **Package:** `WP-0A-DB-00`
- **Branch:** `agent/claude/WP-0A-DB-00-batch-091` (PR #164)
- **Reviewed head:** `49cec53` (batch 091 is `0a4d485`), over `main` `86f55d2`

C0 and A1 reviewed that head in place of A5, by the Owner's choice (ค). Their files are
cherry-picked with `-x` (C0 `a6f30ef` → `fca5674`, A1 `2246716` → `e8abe33`). Q0 has not yet
returned a result; §3 says why. The corrections are the commit that follows. This file approves nothing,
and it does not approve the schedule states on A5's behalf.

## 1. The headline

**C0 and A1 both report no stop-the-line and nothing blocking the Owner's merge**, and each
reproduced the author's claims. They measured the following on the database as built:

- Cross-tenant access is refused on every path, including UPDATE, ON CONFLICT, MERGE and CTE.
- Business and Page scoping holds, and a suspended member sees nothing.
- No client can arm, dispatch, complete or fail a schedule, or link one to an intent.
- The service roles hold nothing, and the service-path closures bind.
- The fixture is idempotent and confined to 091's tables.
- The per-table negative control fails exactly seven cases, each of its own family.

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
| C0 F2, A1 F1 (MEDIUM): the state machine | Restrictive `content_schedules_client_transition_is_bounded` (`USING status in (draft, armed) WITH CHECK status in (draft, cancelled)`) and `calendar_items_deleted_is_final` (`USING deleted_at is null WITH CHECK true`). Both are pinned by exact text in the block and in `PINNED_POLICIES`. The fixture adds cancelled, completed, failed and dispatched schedules and a deleted placement. New cases: reopen, revive, rewrite, cancel-dispatched, undelete. | "Owner may reopen" sibling alone: 0 cases fail (the closure holds). Sibling with the closure dropped: 6 fail, the four new ones plus arm and dispatch. Deleted-final dropped: exactly the undelete case. |
| C0 F1, A1 F2 (MEDIUM): the narrowings | Both narrowings are pinned by exact deparse in `PINNED_POLICIES`, both halves. Fixture rows outside the Business (`content_schedule_a2`) and on the sibling Page (`calendar_item_a1_sibling_page`, `content_schedule_a1_sibling_page`). Seven cases: Business-scoped editor and admin reads, the admin's cancel, schedule and placement, and the Page editor's reads. The two insert cases carry **no RETURNING**, so the USING half cannot stand in for the WITH CHECK half. | Each half gutted separately, on each table: schedules USING → 4 cases fail, WITH CHECK → 1; calendar USING → 2, WITH CHECK → 1. With RETURNING, the calendar WITH CHECK half was not detected (measured). |
| A1 F5: `dispatched` not live | The one-live-schedule index now covers draft, armed and dispatched. New case: scheduling a target whose send is in flight. | Index without dispatched: exactly that case fails |
| C0 F8, A1 F8: zones and lengths unchecked | `*_timezone_known`: at most 64 characters, and `timezone(text, timestamp)` must read the zone. That function is IMMUTABLE and raises 22023 on an unknown name. The literal is a timestamp WITHOUT a zone, so the deparsed text does not depend on the session's TimeZone. `calendar_items_display_status_bounded`: 64. The first draft's comment claiming this could not be checked is corrected. | Zone checks dropped: both zone cases fail. Bound dropped: its case fails. The deparse is identical under UTC and Asia/Bangkok. |
| A1 F9: `deleted_at` client-chosen | `private.set_deleted_at()` (SECURITY INVOKER, `search_path=""`, no PUBLIC EXECUTE) records `now()` when `deleted_at` goes from NULL to a value. 125's pattern; its definition and body md5 are pinned in the block. | Trigger dropped: exactly the backdate case fails |
| A1 F3, C0 F3: §8.6 coverage | Cases added: forged `created_by` on both tables, suspended reads on both, the anonymous read on schedules. Labels corrected (cross-tenant §8.6/5, anonymous §8.6/7). | Pass |
| C0 F4: closures and keys by name only | Two catalog cases read back the service-path closures. The block checks both composite scope keys by definition text. Its comment claiming the deferred key's absence was checked is corrected. Block item 4 now includes FOR ALL, and item 5 pins all four write policies, both halves, by exact text, plus the count of permissive policies. | migrate-clean |
| C0 F11: CI entries | The comment's counts were re-measured (12 and 18). The calendar pattern is `(calendar\|placement\|place-an-item)`, so all 23 placement ids fall under it. Fourteen ids were renamed off other families' patterns (`workspace`, `business`, `page`, `scope`) to `tenant`, `remit` and `sibling-item`, as batch 120 did. A static test holds both patterns to 091's cases, disjoint and pinned at 23 and 32. | With RLS off, calendar_items fails 12 cases and content_schedules 18, each of its own family |
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

To be filled in when Q0's run returns.

## 5. The corrections, measured by A0 before commit (2026-10-03)

The measurements ran on a private PostgreSQL 17.11 on 127.0.0.1:5499, from a fresh `initdb`, with the shim first and Node 24.20.0.
They were taken on the working tree that the corrections commit records:

- `make db-migrate-clean`: exit 0. The post-migrate pass reports 47 apply-time blocks: 37 re-run as written, 10 superseded and replaced.
- `make db-rls-smoke`: exit 0. Re-run on the same database (the fixture's idempotence): exit 0.
- `npm run check`: exit 0.

These are the Author's measurements. They verify nothing on a role's behalf.
