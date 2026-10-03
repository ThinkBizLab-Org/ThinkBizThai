# A1 Security/Privacy re-verification: batch 091's corrections (`7fde2ef`, handoff `604e804`)

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer for `WP-0A-DB-00`
Subject: branch `agent/claude/WP-0A-DB-00-batch-091` (Draft PR ThinkBizLab-Org/ThinkBizThai#164), head
`604e804` (the handoff alone) over `7fde2ef` (A0's corrections), over `e8abe33` / `fca5674` (A1's and C0's
reviews, cherry-picked), `49cec53` (the first head), `0a4d485` (batch 091) and base `86f55d2` (`main`).
The Author's branch is checked out in the main checkout, so I checked `604e804` out in my own worktree as
the local branch `review/a1-batch-091-r2`. `git merge-base --is-ancestor 86f55d2 604e804` holds, and
`git diff 7fde2ef 604e804` touches only `handoffs/WP-0A-DB-00-author-handoff.json`.
Author: `/claude/a0_atlas`
Date: 2026-10-03
Scope: NARROW. It covers whether the corrections in `7fde2ef` close what my review of the first head
(`a1-batch-091-security-review-2026-09-28.md`, findings F1-F12) found, and whether they open anything
new. It is not a fresh review of batch 091.
Standing-in note: by the Owner's choice (ค), C0, Q0 and A1 review this batch in place of A5 (Calendar's
owner, `/root/a5_loom`). **I do not approve the schedule states on A5's behalf.** Blocker 191(a) still
records A5's review as owed, and nothing here discharges it.

**This document records findings. It advances no package status, signs nothing on anyone's behalf,
writes `security_approved` nowhere, and repairs nothing it found.** It is one input to the Product
Owner's disposition, not the disposition.

---

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author of the change under review. I ran in a worktree of
A0's repository, under a brief A0's workflow wrote, and I am the same vendor and model family as A0.
RFC-2026-024 withdrew the cross-vendor condition, so that fact does not by itself disqualify this
review. It does mean the Author chose what to point me at. **Whether this re-verification is accepted
as the Security/Privacy role's signature is for the Integration Owner (`/claude/r0_steward`) and the
Product Owner to decide.** Neither A0 nor I can decide it.

## 1. What I read

- `CONTRIBUTING_AGENTS.md`.
- `evidence/WP-0A-DB-00/a0-batch-091-integration-2026-09-28.md`, which maps each finding to a change and
  a measurement.
- My own first review, `a1-batch-091-security-review-2026-09-28.md`. I read C0's review only for its
  cross-references.
- `git show 7fde2ef` (16 files, +686/-70). In particular:
  - `db/foundation/migrations/091_calendar.sql`, all 516 lines, in full;
  - the `PINNED_POLICIES` additions in `scripts/db/run.mjs:271-279`;
  - the new fixture rows in `tests/db/identity/fixtures/091-calendar-fixture.sql`;
  - the new cases in `tests/db/identity/isolation-cases.mjs`, read selectively, including the two
    created_by cases at :17338-17360;
  - blockers 186 and 191 in `work-packages/WP-0A-DB-00.json`.
- The superseded-block mechanism in `scripts/db/run.mjs:542-662`, to establish that 091's apply-time
  block re-runs as written after the full set.

## 2. How I measured, and which claims are measured and which are read

**Environment [M].**
- `node -v` = `v24.20.0`, checked by the round script before every round.
- PostgreSQL 17.11 (Homebrew, `/opt/homebrew/bin`) on `127.0.0.1:5501` only, TCP only
  (`-c unix_socket_directories=''`).
- `initdb --locale=C -A trust -U postgres`, with `LC_ALL=C` and `TZ=UTC`. The shim
  `db/foundation/ci/supabase-shim.sql` ran first, then `make db-migrate-clean` and `make db-rls-smoke`
  with `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres`.
- A fresh `initdb` for every round: nine completed rounds (base, DS1b, DS2, DS3, DN1, DC1, DD1, DI1,
  final).
- Each drift was APPENDED to `db/foundation/migrations/140_audit.sql`. A trap restored 140 from a saved
  copy after every round. Its sha256 `2ac596bb…d37149` was checked after each round and matches `git`'s
  blob `fa7f3cd`.
- My scripts and logs are in my private directory `…/scratchpad/a1-091r2/` and are not committed. Each
  drift's SQL is quoted in §4.
- Ports 5432 and 5499 were never touched, and nothing was written to `/tmp`.
- At the end the cluster was stopped and its data directory removed. Port 5501 then had no listener,
  and the worktree was clean apart from this file.

**One environmental event.** The host's data volume ran out of space (`ENOSPC`, about 1 GB free, not
caused by this run, whose directory held under 50 MB). One round invocation failed in the tool harness
before it reported anything. I then checked 140's sha256, which was intact, and gave the round script
a free-space guard and an EXIT trap that restores 140. The next round re-ran `initdb` from scratch.

**Baseline on `604e804` [M].**
- `db-migrate-clean`: exit 0.
  - Post-migrate pass: 47 apply-time blocks, 37 re-run as written and 10 superseded and replaced.
  - The updated_by UPDATE closure probe reports 19 closures.
  - The pinned policy probe reports **5** restrictive policies: 125's and 091's four.
- `db-rls-smoke`: exit 0, **1047** cases.

**Tags.**
- **[M]**: measured on the live cluster.
- **[R]**: read from the file and line named.
- **[I]**: inferred, not executed.

## 3. The questions, answered

### Q1. Is each of F1-F11 disposed of accurately, and does each fix close what it claims?

| Finding (first head) | Disposition in `7fde2ef` | Re-verified |
|---|---|---|
| F1 MEDIUM: the state machine rested on one permissive policy | Restrictive `content_schedules_client_transition_is_bounded` (`091_calendar.sql:317-320`). It is pinned by exact text in block item 10 (:487-495) and in `PINNED_POLICIES`. Block item 5 pins both halves of the four permissive write policies by exact text and requires exactly six permissive policies (:390-415). | **Closed [M].** See R-F1 below. |
| F2 MEDIUM: the narrowings had no case and no pin | Both narrowings are pinned, both halves, in `PINNED_POLICIES`. There are out-of-scope fixture rows and seven scope cases. | **Closed [M].** See R-F2. |
| F3 LOW: created_by is bound only inside the permissive INSERT | Two forging cases. Blocker 186 names both tables. The closure in 102's shape is owed. | **The drift is now detected. The closure is still owed** (Q3). |
| F4 LOW: §11.3 archive does not close creation | Recorded on 191(f) with the upstream families named | **Accurate [R].** Still open, still LOW. |
| F5 LOW: `dispatched` was not live | Index now `status in (draft, armed, dispatched)` (:145-146) and pinned by text (:466-475). Whether a completed target may be scheduled again goes to A5 on 191(a). | **Closed for dispatched [M]. Accurate for completed [R].** See R-F5. |
| F6 LOW: disarm keeps the link; the header understated RLS | Header corrected (:28-31). The disarm bound, the link and `version` are on 191(a). | **Accurate [R].** |
| F7 LOW: 124's key does not bind the item | 191(g) | **Accurate [R].** |
| F8 LOW: free text unbounded, zones unvalidated | `*_timezone_known` (≤64 characters and `timezone()` must accept the zone), `display_status` ≤64, the vocabulary on 191(e) | **Closed for length and unknown names [M].** The zone check is weaker than its header says (**N1**), and the point about a `scheduled_for` in the past is not carried anywhere (**N3**). |
| F9 LOW: `deleted_at` was the client's value | `private.set_deleted_at()` plus the restrictive `calendar_items_deleted_is_final` | **Closed [M]**, including the ON CONFLICT and MERGE paths. See R-F9. |
| F10 INFO: no transition history | 191(f), owed with batch 141 | **Accurate [R].** |
| F11 INFO: rows created on soft-deleted parents | 191(a) | **Accurate [R].** |

**R-F1: the state machine with a looser sibling [M].**
- **DS1b** is my original "the owner may reopen" sibling, widened to include `dispatched`:

  ```sql
  create policy content_schedules_update_owner_reopen on app.content_schedules
    for update to authenticated
    using (app.workspace_member_role(workspace_id) = 'owner'
           and status in ('cancelled','failed','completed','dispatched'))
    with check (updated_by = (select auth.uid())
                and app.workspace_member_role(workspace_id) in ('owner','admin')
                and status in ('draft','cancelled'));
  ```

  - `db-migrate-clean` **fails** in the post-migrate pass: `091_calendar.sql#1 (line 336) no longer
    holds … batch 091 has other permissive policies than its two reads and four writes`.
  - `db-rls-smoke` passes 1047 of 1047, because the restrictive closure still refuses.
  - Live, under the sibling, as owner_a:
    - cancelled, completed and failed -> draft: `UPDATE 0` each;
    - dispatched -> cancelled: `UPDATE 0`;
    - through ON CONFLICT and MERGE, the error names `content_schedules_client_transition_is_bounded`.
  - **Two independent layers now refuse the reopening, and either one alone would fail CI.** The
    integration record's DS1b row reports only the rls-smoke half (0 cases fail). It does not say that
    migrate-clean fails as well (N2).
- **DS2**, the permissive USING widened to the role alone:
  - migrate-clean **fails**: `write policy(ies) not in their exact text: content_schedules_update_scheduler`;
  - rls-smoke passes, because the restrictive closure holds.
- **DS3**, the restrictive closure's USING set to `true`:
  - migrate-clean **fails** in the pinned policy probe:
    `content_schedules.content_schedules_client_transition_is_bounded`;
  - rls-smoke passes, because the permissive USING still bounds the rows.
  - So each half of the pair is guarded by a text pin, and the pair guards the rows.

**R-F2: the narrowings gutted [M].**
- **DN1** (`alter policy content_schedules_scope_narrowing … using (true) with check (true)`):
  - migrate-clean **fails** in the pinned policy probe;
  - rls-smoke **fails 5 of 1047**:
    - `editor-a-` and `admin-a-cannot-see-the-schedule-outside-their-remit`;
    - `admin-a-cannot-cancel-the-schedule-outside-their-remit`;
    - `admin-a-cannot-schedule-a-target-outside-their-remit` (23505 instead of the RLS refusal);
    - `narrow-editor-a-cannot-see-the-schedule-on-the-sibling-item`.
  - This matches A0's "USING → 4, WITH CHECK → 1".
- On the clean set, `user_admin_a` (scoped to business_a1) counts 0 business_a2 schedules, and its
  UPDATE and MERGE against `content_schedule_a2` give `UPDATE 0` and `MERGE 0`.
- I did not re-run the calendar half (DN2). A0's record measures it, and the pinned policy probe
  covers it by the same mechanism [R].

**R-F5: an in-flight duplicate [M].**
- As owner_a, a new schedule on `content_target_a1_sibling_page` while its schedule is `dispatched`:
  `23505 content_schedules_one_live_per_target`.
- "Cancel the in-flight one, then reschedule": the cancel touches `UPDATE 0` and the insert gets 23505.
- **DI1** (the index rebuilt without `dispatched`):
  - migrate-clean **fails**: `finds 1 of its two unique-active indexes in their required shape`;
  - rls-smoke **fails** exactly `owner-a-cannot-schedule-a-target-already-dispatched`.
- A completed target can still be scheduled again (`INSERT 0 1` on `content_target_a1_page`). That is
  recorded as A5's question, and the comment at :143-144 says so.

**R-F9: a client-chosen deleted_at [M].**
- The owner soft-deletes `calendar_item_a1` sending `deleted_at = '2001-01-01'`. The stored value is
  `now()` (`deleted_at = now()` returns `t`).
- In the same transaction:
  - undelete (`deleted_at = null`): `UPDATE 0`;
  - re-date to 2999: `UPDATE 0`;
  - edit `display_status`: `UPDATE 0`.
- The same three against the fixture's deleted placement: `UPDATE 0` each. A MERGE undelete raises
  `calendar_items_deleted_is_final (USING expression)`.
- A soft delete through `INSERT … ON CONFLICT … DO UPDATE SET deleted_at = '2001-01-01'` and through
  `MERGE … UPDATE SET deleted_at = '2001-01-01'` stores `now()` in both cases. The BEFORE UPDATE
  trigger fires on both paths.
- **DD1** (`drop trigger set_deleted_at`):
  - migrate-clean **fails** in the post-migrate pass (block item 10);
  - rls-smoke **fails** exactly `owner-a-cannot-backdate-a-deletion`.

### Q2. Do the corrections open anything new?

**The restrictive transition policy cannot be bypassed by any path I tried [M].** All of these were run
as owner_a on the clean set, and DS1b's sibling is defeated the same way:

- **INSERT … ON CONFLICT DO UPDATE** against the dispatched row:
  - `SET status = 'cancelled'` raises `new row violates row-level security policy (USING expression)`;
  - so does `SET scheduled_for = excluded.scheduled_for`.
  - The USING half is enforced as an error on the conflicting row and does not filter it silently.
  - `DO NOTHING` returns `INSERT 0 0`. The caller can already read that row, so this is not an oracle.
- **ON CONFLICT DO UPDATE arming a draft**: refused by WITH CHECK.
- **MERGE … WHEN MATCHED UPDATE**:
  - reopening the cancelled row, the completed row, and cancelling the dispatched row each raise
    `target row violates row-level security policy (USING expression)`;
  - so does a MERGE that changes only `scheduled_for` on the completed row.
- **CTE** `with u as (update … set status = 'draft' where id in (cancelled, completed, failed,
  dispatched) returning 1)` counts 0.
- **A non-status column of a settled or in-flight row** (`scheduled_for`, `timezone_snapshot` on
  cancelled, completed, failed or dispatched): `UPDATE 0`.
- **Two statements in one transaction**: cancelling the draft gives `UPDATE 1`, and reviving it in the
  next statement gives `UPDATE 0`.
- **What still works**: cancelling an armed schedule and disarming it each give `UPDATE 1`. Both are
  admitted by design.
- [R] A BEFORE trigger cannot help a bypass, because USING is evaluated on the OLD row. The only BEFORE
  UPDATE triggers are `set_updated_at` and `set_deleted_at`.

**`set_deleted_at` cannot be bypassed by any path I tried [M].**
- `deleted_at` at INSERT: `permission denied for table calendar_items`. The column is not in the
  INSERT grant (:200-202), so a row cannot be born deleted with a chosen date.
- Non-null to another non-null value, and non-null to NULL, are both refused by
  `calendar_items_deleted_is_final`'s USING on the old row (`UPDATE 0`, and an error under MERGE).
- NULL to a value always stores `now()`, through plain UPDATE, ON CONFLICT DO UPDATE and MERGE.
- [R] `session_replication_role`, which would skip the trigger, is a superuser setting (`pg_settings`
  context `superuser`), and 140's trigger probe already refuses a default for it.

**`set_deleted_at`'s privilege shape is as pinned [M].** `pg_proc` reads:
- owner `postgres`;
- `prosecdef = f` (SECURITY INVOKER);
- `proconfig = {search_path=""}`;
- `proacl = {postgres=X/postgres}`;
- body md5 `3b153bd25169c0cee4476163fa2db757`, equal to the pin at :512.

`has_function_privilege` for EXECUTE is false for `public`, `authenticated`, `anon` and `app_worker`.
`authenticated` holds no USAGE on schema `private`, and a direct call gets
`permission denied for schema private`. It is not SECURITY DEFINER, so the security definer probe still
counts 5 [M].

**The timezone CHECK leaks nothing [M].**
- An unknown zone raises `22023 time zone "Not/AZone" not recognized`. The message echoes only the
  caller's own value.
- Where the scope is another tenant's and the zone is invalid, RLS refuses first:
  `new row violates row-level security policy`, not 22023. So the CHECK is no existence oracle.
- An UPDATE of tenant B's rows by id with an invalid zone returns `UPDATE 0` with no zone error. The
  CHECK runs only on rows the caller may already write.
- A 100-character zone and a 65-character `display_status` are refused by name (23514).

**But the zone check is not session-independent (N1, new, LOW).** See §4.

### Q3. created_by on the two tables (my F3)

**The current state [M].**
- On the clean set, the owner inserting a placement or a schedule that names `user_editor_a` as
  created_by is refused by policy on both tables.
- **DC1** (`create policy <t>_insert_import … for insert to authenticated with check (role in
  owner/admin [and status = 'draft'])` on each table):
  - migrate-clean **fails**: `batch 091 has other permissive policies than its two reads and four
    writes`;
  - rls-smoke **fails exactly 2 of 1047**: `owner-a-cannot-place-an-item-naming-another-creator` and
    `owner-a-cannot-schedule-a-target-naming-another-creator`.
- On the first head, the same drift passed every layer.
- Unlike the created_by cases 123's review found wanting, these two do test created_by alone [R].
  `updated_by` is outside both INSERT grants, so 102's closure cannot refuse them first.
  (`isolation-cases.mjs:17338-17360`)

**What is still owed [R].** created_by is still bound only inside the permissive INSERT policies
(`091_calendar.sql:225-228`, :238-242). A later migration that legitimately supersedes 091's block
through `superseded.json` would drop the count and the text pin together. After that, only the two
cases would stand. Blocker 186 records, accurately, that "091's corrections add a forging case on each,
and the closure in 102's shape is owed with the other seventeen".

**Grade: LOW, residual and no longer silent.** The drift class I measured is now detected at two
layers. The structural closure stays owed on blocker 186, with the other seventeen tables, as the
record says.

### Q4. Cross-tenant and service-role: still nothing reachable [M]

**Cross-tenant.** owner_a holds B's exact ids and gets nothing:
- reads count 0 on both tables;
- UPDATE gives `UPDATE 0` on both tables;
- MERGE gives `MERGE 0` on both tables;
- a CTE UPDATE counts 0;
- INSERT into B's scope with ON CONFLICT (DO NOTHING on schedules, DO UPDATE on placements) is refused
  by the INSERT WITH CHECK before any conflict is tested.

**Service roles.**
- For `anon`, `app_worker`, `app_command`, `app_maintenance`, `app_authz` and `service_role`, every
  `has_table_privilege` and `has_any_column_privilege` check is false on both tables.
- As the service, SELECT and UPDATE get `permission denied`.
- With `app_worker` granted SELECT and UPDATE and given a permissive `FOR ALL … USING (true)` policy
  inside a transaction, the worker counts 0 schedules and 0 placements. Its arming UPDATE and its
  undelete each touch 0 rows.
- Control: with `content_schedules_service_path_closed` dropped in the same transaction, the worker
  counts 8.

**The new policies.** Both new restrictive policies are `TO authenticated`. The service-path closures
are unchanged (`TO public`, :326-331).

### Q5. Stop-the-line? See §5

## 4. Findings

Grades are A1's. Where I think the Owner could reasonably read a grade higher, I say so.

### N1: LOW (new). `*_timezone_known` depends on the session's `timezone_abbreviations`

- **Where [R].**
  - `091_calendar.sql:82-83` and :130-132, and the header's claim at :63-69: "timezone(text,
    timestamp) is IMMUTABLE … so the constraint's deparsed text does not depend on the session's
    TimeZone".
  - The deparse is indeed session-independent. **Acceptance and meaning are not.**
    `timezone(text, …)` tries the zone name as an abbreviation first, against the session's
    `timezone_abbreviations`. That setting has `pg_settings` context `user` [M], so any session may
    change it.
- **Measured [M].**
  - `WST` (present in the `Australia` set and absent from `Default`):
    - under `Default`: `22023 not recognized`;
    - under `set local timezone_abbreviations = 'Australia'`, owner_a stores it on
      `content_schedule_a1_fb` (`UPDATE 1`).
    - Back under `Default` in the same transaction, **any** later UPDATE of that row fails the CHECK,
      including one that only moves `scheduled_for`. A cancel is the same kind of UPDATE, so a row
      stored this way cannot be cancelled, edited or, later, armed from a default session.
  - `IST` is accepted under both sets and means a different instant in each: 12:00 is 10:00 UTC under
    `Default` (Israel) and 06:30 UTC under `India`. A stored abbreviation is a fixed offset whose
    meaning depends on the reader's session. That contradicts the column's stated purpose (:116), "kept
    so a later zone change in settings does not move a post".
  - `UTC+7` is accepted and is POSIX, so it means UTC-7: 12:00 local = 19:00 UTC. The header mentions
    POSIX spellings but not that their sign is inverted.
- **Inferred [I].** A `pg_dump` restore re-checks CHECK constraints as rows load, in a session using
  the restore's own abbreviation set. A row stored under another set would then refuse to restore.
- **Why LOW.**
  - Reaching the poisoned row needs a session that can `SET timezone_abbreviations`. PostgREST does not
    let a client do that [I]; a direct SQL client as `authenticated` can.
  - No tenant boundary is crossed. Only the caller's own workspace rows can be stuck.
  - The meaning drift (IST, UTC+7) is reachable from any session, but it is integrity, not access.
  - The Owner may read the meaning drift higher, since §6's deliverable for 091 is "timezone-safe
    scheduling".
- **Remedy.** Any one of these, 091 being still unintegrated:
  1. Refuse abbreviations and POSIX offsets in the CHECK, for example `timezone = 'UTC' or timezone ~
     '^[A-Za-z]+(/[A-Za-z0-9_+-]+)+$'`, alongside the existing `timezone()` call.
  2. Validate against `pg_timezone_names` in a BEFORE INSERT OR UPDATE trigger, which is the IANA-only
     rule the header says a CHECK cannot express.
  3. Record it on 191(h) as an accepted limitation, and correct the header's "IMMUTABLE" sentence to say
     what it does not cover.

  A case per spelling (`IST`, `UTC+7`) pins whichever choice is made.

### N2: INFO. The integration record understates the F1 defence

- **Where [R].** `a0-batch-091-integration-2026-09-28.md` §2, first row: "'Owner may reopen' sibling
  alone: 0 cases fail (the closure holds)".
- **Measured [M].** That is the rls-smoke half. On a fresh migrate-clean, the same sibling also fails
  the post-migrate pass, through block item 5's permissive count (R-F1).
- **Why it matters.** It is wording only, but a reader could take "0 cases fail" for "undetected".
- **Remedy.** Add "migrate-clean fails (block 5's count)" to the row.

### N3: INFO. F8's `scheduled_for` point is not carried anywhere

- **Where.** My F8 measured `scheduled_for` in 1900 and said whether a past time is admissible is A5's
  call. Blocker 191(a) and 191(h) do not mention it [R]. `includes('scheduled_for')` and
  `includes('past')` on 191 are both false [M].
- **Remedy.** One clause in 191(a).

### Residual from the first review, re-graded

- **F3: LOW, residual.** The drift is detected at two layers. The created_by closure in 102's shape is
  owed on blocker 186 (Q3).
- **F4: LOW, open.** It is recorded on 191(f), accurately.
- **F6, F7, F10 and F11: unchanged.** They are recorded on 191(a), (g) and (f), accurately. They are A5's
  or the dispatcher owner's to decide, and none of them is reachable by a client today.

## 5. Stop-the-line verdict

**No stop-the-line risk found.**

- **No tenant leakage** on any path in Q4, or by the scope paths in R-F2.
- **No duplicate external side effect is reachable.**
  - No client or service can arm, dispatch, complete or fail a schedule.
  - A target in flight can no longer be scheduled again (R-F5).
  - A settled schedule cannot be reopened, even under a looser sibling (R-F1).
- **No secret or customer data.** The fixture is synthetic, and errors disclose only the caller's own
  values (Q2).
- **No irreversible deletion.** There is no DELETE grant, and a soft delete is final for clients.
- **No migration divergence in what I measured.** `db-migrate-clean` and `db-rls-smoke` pass on
  `604e804` from a fresh cluster. N1's restore concern is inferred, and it is reachable only through a
  non-default session setting.

**Does anything block the Owner's merge?** In my view, no.
- Both MEDIUM findings of the first review (F1, F2) are closed, and each is now refused by two
  independent layers.
- N1 is LOW and could be fixed on this branch before the merge, or recorded on 191(h).
- That is a recommendation. Whether to merge is the Owner's decision.
- Q0's run on this head had not returned when I wrote this (integration record §3-§4).
- Under blocker 190, the Owner presses #164's merge. Nothing in this run's relayed request (`งานอะไร
  กระจายทำได้ทำเลยนะครับ …`) or in my brief delegates that merge to A0 or to me.

## 6. Limits

- **Same vendor and model family as the Author, and spawned by the Author** (§0). My brief was A0's. I
  chose the bypass paths in Q2 and the abbreviation probes behind N1 myself.
- **Stock PostgreSQL 17.11 plus the repository's shim, not a Supabase instance.** PostgREST, the
  platform's `authenticator` role and its GUC handling are not represented. N1's reachability through
  PostgREST is inferred, not measured.
- **Drifts are single-file and plausible, not exhaustive.** A later migration that legitimately
  supersedes 091's block through `superseded.json` changes what the post-migrate pass checks. That is
  by design and reviewed per entry, and none of my drifts exercised it.
- **I ran `make db-migrate-clean` and `make db-rls-smoke` only.** I did not run any of the following:
  - `npm run check`;
  - the node test suites, including the new static test holding the CI control patterns at 23 and 32;
  - the handoff guard;
  - CI.

  I did not verify the CI negative-control counts (12 and 18) or the renamed case ids. The handoff JSON
  in `604e804` I read only by its stat.
- **I did not re-run** DN2 (the calendar narrowing) or C0's findings. I re-ran only the attacks named
  in my brief and the paths in Q2-Q4.
- **No dispatcher, command path or service identity exists.** "Nothing reachable" covers what exists
  today. All races are client against client.
- **The probe SQL and logs are private and not committed** (`…/scratchpad/a1-091r2/`). The drifts are
  quoted above (DS1b in full; DS2, DS3, DN1, DC1, DD1 and DI1 as described in §3).
