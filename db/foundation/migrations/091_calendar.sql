-- Batch 091: calendar.core -- app.calendar_items and app.content_schedules.
--
-- §6's registry gives 091 to A5 Calendar, "calendar/schedule", depending on 080 and 090. The Product
-- Owner decided on 2026-09-28 that A0 writes it, and that C0, Q0 and A1 review it, with A5's review of
-- the schedule states recorded as owed: A5 is /root/a5_loom, a Codex run this package cannot run.
-- Plan and disposition are in evidence/WP-0A-DB-00/.
--
-- THE TWO TABLES (core-database-and-rls-workstream-th.md §4.7):
--   * calendar_items -- planning placement of a content item on a local date, "ใช้เพื่อ planning แม้ยังไม่
--     publish; unique active calendar placement ตาม policy".
--   * content_schedules -- a timed schedule for one content TARGET, status(draft|armed|dispatched|
--     cancelled|completed|failed), publish_intent_id, version; "approval gate + asset/rights/quality gate
--     ต้องผ่านก่อน armed".
--
-- WHO MAY DO WHAT (sprint-0a-core-erd-rls-retention-th.md §8.3):
--   Calendar SELECT       | owner Y | admin Y | editor Y | approver Y | viewer Y | service P
--   Schedule/unschedule   | owner Y | admin Y | editor P | approver N | viewer N | service P
-- `P` is "ผ่านตาม policy/explicit capability" and no document defines that capability, so an editor
-- is REFUSED the write here, as batch 120 refused the editor's publish on the Owner's answer to its Q2.
-- The service's `P` gets nothing: a `P` with no capability defined is not an `S`, which is batch 080's
-- reasoning, so app_worker is granted nothing and no service policy exists. Both are blockers.
--
-- WHAT A CLIENT MAY WRITE, AND WHAT IT MAY NOT. A client creates a schedule as a `draft` (the column
-- default; `status` is outside the INSERT grant) and may edit a draft or cancel a draft or an armed
-- schedule. It may never move a schedule to `armed`, `dispatched`, `completed` or `failed`. Arming
-- needs the approval, asset/rights and quality gates, which the database cannot check. The other
-- three are the dispatcher's. So those transitions belong to a command or service path that does not
-- exist yet -- the "no writer" class, recorded as a blocker. Disarming (armed -> draft) is admitted
-- because RLS cannot see the old value and disarming is the safe direction; A5 may narrow it.
--
-- THE ORDERING, and why one column has no foreign key. content_schedules.publish_intent_id names
-- batch 120's app.publish_intents, and this file sorts before 120. So the column is created here and
-- its foreign key is added by 124_calendar_publish_intent_fk.sql, after 120 and 122. This is the
-- 081 -> 111 precedent for content_targets.social_account_id. Until 124, nothing checks the column,
-- and a client cannot write it: it is in no grant.
--
-- updated_by, AND WHY NOTHING HERE IS NAMED `*_updated_by_is_caller`. Both tables grant UPDATE on
-- updated_by, so both carry batch 105/123's RESTRICTIVE UPDATE closure,
-- `<table>_updated_by_on_update_is_caller`, from birth. Neither grants INSERT on updated_by, so batch
-- 102's INSERT closure does not apply. 102's apply-time block, which this file precedes, counts
-- policies by that name and would fail if one appeared before it.
--
-- RETENTION: data class CONTENT-2 and retention class SCHEDULE-HISTORY, "12 เดือนหลัง final state".
-- Commented, enforced nowhere: batch 160 owns retention, as 121 recorded.

create table if not exists app.calendar_items (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid        not null,
  business_profile_id   uuid        not null,
  content_item_id       uuid        not null,
  -- A LOCAL date, deliberately not a timestamp: a planning placement is "on the 3rd" in the business's
  -- calendar, and the timestamp belongs to the schedule.
  scheduled_local_date  date        not null,
  -- The IANA zone the date is read in. Asia/Bangkok is the product default (DEC-UX-06, fixed in
  -- CTR-TEN-001 and 010's workspace_settings); a non-blank shape is all the database can check.
  timezone              text        not null default 'Asia/Bangkok',
  -- No vocabulary: §4.7 names display_status and enumerates nothing. Batch 080 left approval_state
  -- the same way. A blank value is refused; which values are legal is a blocker for A5.
  display_status        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid,
  updated_by            uuid,
  -- §8.5: no broad user delete, a soft-delete lifecycle field instead. The unique-active rule turns
  -- on it.
  deleted_at            timestamptz,
  constraint calendar_items_timezone_not_blank check (length(btrim(timezone)) > 0),
  constraint calendar_items_display_status_not_blank
    check (display_status is null or length(btrim(display_status)) > 0),
  constraint calendar_items_item_scope_fk
    foreign key (workspace_id, business_profile_id, content_item_id)
    references app.content_items (workspace_id, business_profile_id, id),
  constraint calendar_items_scope_key unique (workspace_id, business_profile_id, id)
);

-- "unique active calendar placement ตาม policy": the least that can mean. One live placement per
-- content item. Widening it later, once A5 says what the policy is, is safe; narrowing it would not be.
create unique index if not exists calendar_items_one_active_per_item
  on app.calendar_items (content_item_id) where deleted_at is null;
create index if not exists calendar_items_item_scope_idx
  on app.calendar_items (workspace_id, business_profile_id, content_item_id);
create index if not exists calendar_items_date_idx
  on app.calendar_items (workspace_id, scheduled_local_date) where deleted_at is null;

comment on table app.calendar_items is
  'Batch 091 (calendar.core, A5 Workflow; written by A0 on the Owner''s decision of 2026-09-28). A planning '
  'placement of a content item on a local date. Data class CONTENT-2; retention SCHEDULE-HISTORY (§10), '
  'enforced by batch 160, not here.';

create table if not exists app.content_schedules (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid        not null,
  business_profile_id   uuid        not null,
  -- A schedule times ONE target: one destination, one pinned variant (081). §4.6 pins the version
  -- before approve/schedule, and that pin is the target's.
  content_target_id     uuid        not null,
  scheduled_for         timestamptz not null,
  -- The zone the owner scheduled in, kept so a later zone change in settings does not move a post.
  timezone_snapshot     text        not null,
  status                text        not null default 'draft',
  -- THE DEFERRED REFERENCE: no foreign key here (see the header); 124 adds it.
  publish_intent_id     uuid,
  -- Optimistic concurrency for the dispatcher, which does not exist yet. Nobody writes it today.
  version               integer     not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid,
  updated_by            uuid,
  constraint content_schedules_status_known
    check (status in ('draft', 'armed', 'dispatched', 'cancelled', 'completed', 'failed')),
  constraint content_schedules_timezone_not_blank check (length(btrim(timezone_snapshot)) > 0),
  constraint content_schedules_version_positive check (version >= 1),
  constraint content_schedules_target_scope_fk
    foreign key (workspace_id, business_profile_id, content_target_id)
    references app.content_targets (workspace_id, business_profile_id, id),
  constraint content_schedules_scope_key unique (workspace_id, business_profile_id, id)
);

-- One live schedule per target. A cancelled, completed or failed schedule is history and does not
-- block a new one; a draft or an armed one does, so a target cannot be timed twice.
create unique index if not exists content_schedules_one_live_per_target
  on app.content_schedules (content_target_id) where status in ('draft', 'armed');
create index if not exists content_schedules_target_scope_idx
  on app.content_schedules (workspace_id, business_profile_id, content_target_id);
create index if not exists content_schedules_due_idx
  on app.content_schedules (scheduled_for) where status = 'armed';
-- The deferred key's supporting index is written with it, in 124, because 104's rule reads the key.

comment on table app.content_schedules is
  'Batch 091 (calendar.core, A5 Workflow; written by A0 on the Owner''s decision of 2026-09-28). A timed '
  'schedule for one content target. A client creates a draft and may edit it, or cancel a draft or an '
  'armed schedule; arming and dispatch belong to a command or service path that does not exist yet. '
  'publish_intent_id''s foreign key is added by batch 124. Data class CONTENT-2; retention '
  'SCHEDULE-HISTORY (§10), enforced by batch 160.';

-- The database keeps updated_at (093's rule, which runs after this file and reads every table).
create trigger set_updated_at before update on app.calendar_items
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on app.content_schedules
  for each row execute function private.set_updated_at();

alter table app.calendar_items    enable row level security;
alter table app.calendar_items    force  row level security;
alter table app.content_schedules enable row level security;
alter table app.content_schedules force  row level security;

-- GRANTS -- column-scoped; the absent columns are the control. anon and app_worker get nothing.
grant select (id, workspace_id, business_profile_id, content_item_id, scheduled_local_date, timezone,
              display_status, created_at, updated_at, created_by, updated_by, deleted_at)
  on app.calendar_items to authenticated;
grant insert (workspace_id, business_profile_id, content_item_id, scheduled_local_date, timezone,
              display_status, created_by)
  on app.calendar_items to authenticated;
-- Re-placing a placement on another item is creating a different placement, so content_item_id and
-- the scope are not updatable.
grant update (scheduled_local_date, timezone, display_status, updated_at, updated_by, deleted_at)
  on app.calendar_items to authenticated;

grant select (id, workspace_id, business_profile_id, content_target_id, scheduled_for, timezone_snapshot,
              status, publish_intent_id, version, created_at, updated_at, created_by, updated_by)
  on app.content_schedules to authenticated;
-- status, publish_intent_id and version are NOT insertable: a client's schedule is born a draft,
-- unlinked, at version 1.
grant insert (workspace_id, business_profile_id, content_target_id, scheduled_for, timezone_snapshot,
              created_by)
  on app.content_schedules to authenticated;
-- status is updatable so a client can cancel; the policy below bounds which values it may write.
-- publish_intent_id and version are not: the link and the counter are the dispatcher's.
grant update (scheduled_for, timezone_snapshot, status, updated_at, updated_by)
  on app.content_schedules to authenticated;

-- POLICIES -- Calendar SELECT for every active member; Schedule/unschedule for owner and admin only.
create policy calendar_items_select_active_member on app.calendar_items
  for select to authenticated
  using (app.is_active_member(workspace_id));
create policy calendar_items_insert_scheduler on app.calendar_items
  for insert to authenticated
  with check (created_by = (select auth.uid())
              and app.workspace_member_role(workspace_id) in ('owner', 'admin'));
create policy calendar_items_update_scheduler on app.calendar_items
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin'))
  with check (updated_by = (select auth.uid())
              and app.workspace_member_role(workspace_id) in ('owner', 'admin'));

create policy content_schedules_select_active_member on app.content_schedules
  for select to authenticated
  using (app.is_active_member(workspace_id));
create policy content_schedules_insert_scheduler on app.content_schedules
  for insert to authenticated
  with check (created_by = (select auth.uid())
              and app.workspace_member_role(workspace_id) in ('owner', 'admin')
              and status = 'draft' and publish_intent_id is null and version = 1);
-- USING: only a draft or an armed schedule can be touched. WITH CHECK: the result is a draft (an edit,
-- or a disarm) or cancelled. armed, dispatched, completed and failed are never a client's to write.
create policy content_schedules_update_scheduler on app.content_schedules
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin') and status in ('draft', 'armed'))
  with check (updated_by = (select auth.uid())
              and app.workspace_member_role(workspace_id) in ('owner', 'admin')
              and status in ('draft', 'cancelled'));

-- THE RESTRICTIVE NARROWINGS -- the member scope, asked of the content item: directly for a
-- placement, through the target for a schedule. Both halves, as 040's probe taught.
create policy calendar_items_scope_narrowing on app.calendar_items
  as restrictive for all to authenticated
  using (exists (
    select 1 from app.content_items i
     where i.workspace_id = calendar_items.workspace_id
       and i.business_profile_id = calendar_items.business_profile_id
       and i.id = calendar_items.content_item_id
       and case when i.page_context_profile_id is null
             then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
             else app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)
           end))
  with check (exists (
    select 1 from app.content_items i
     where i.workspace_id = calendar_items.workspace_id
       and i.business_profile_id = calendar_items.business_profile_id
       and i.id = calendar_items.content_item_id
       and case when i.page_context_profile_id is null
             then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
             else app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)
           end));
create policy content_schedules_scope_narrowing on app.content_schedules
  as restrictive for all to authenticated
  using (exists (
    select 1 from app.content_targets t
      join app.content_items i
        on i.workspace_id = t.workspace_id and i.business_profile_id = t.business_profile_id
       and i.id = t.content_item_id
     where t.workspace_id = content_schedules.workspace_id
       and t.business_profile_id = content_schedules.business_profile_id
       and t.id = content_schedules.content_target_id
       and case when i.page_context_profile_id is null
             then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
             else app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)
           end))
  with check (exists (
    select 1 from app.content_targets t
      join app.content_items i
        on i.workspace_id = t.workspace_id and i.business_profile_id = t.business_profile_id
       and i.id = t.content_item_id
     where t.workspace_id = content_schedules.workspace_id
       and t.business_profile_id = content_schedules.business_profile_id
       and t.id = content_schedules.content_target_id
       and case when i.page_context_profile_id is null
             then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
             else app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)
           end));

-- THE CLOSURES the rest of the schema carries, from birth: 105/123's updated_by UPDATE closure, and
-- the service-path closure (082's shape: restrictive, FOR ALL, TO PUBLIC, the current_user test), so
-- a grant that later reaches a service role still meets no policy that admits it.
create policy calendar_items_updated_by_on_update_is_caller on app.calendar_items
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy content_schedules_updated_by_on_update_is_caller on app.content_schedules
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy calendar_items_service_path_closed on app.calendar_items
  as restrictive for all to public
  using (current_user = 'authenticated') with check (current_user = 'authenticated');
create policy content_schedules_service_path_closed on app.content_schedules
  as restrictive for all to public
  using (current_user = 'authenticated') with check (current_user = 'authenticated');

-- ============================================================================================
-- THE APPLY-TIME ASSERTIONS (re-run after the whole set by the post-migrate pass)
-- ============================================================================================
do $$
declare
  offending text;
  count_of  integer;
  cal_tables constant text[] := array['calendar_items', 'content_schedules'];
begin
  -- 1. ENABLE and FORCE.
  select string_agg(c.relname, ', ' order by c.relname) into offending
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = any (cal_tables)
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'batch 091 table(s) without ENABLE and FORCE ROW LEVEL SECURITY: %', offending;
  end if;

  -- 2. The restrictive set on each table, exactly, by name.
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.calendar_items'::regclass and not pol.polpermissive)
     is distinct from array['calendar_items_scope_narrowing', 'calendar_items_service_path_closed',
                            'calendar_items_updated_by_on_update_is_caller'] then
    raise exception 'app.calendar_items restrictive policies are not exactly batch 091''s three';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.content_schedules'::regclass and not pol.polpermissive)
     is distinct from array['content_schedules_scope_narrowing', 'content_schedules_service_path_closed',
                            'content_schedules_updated_by_on_update_is_caller'] then
    raise exception 'app.content_schedules restrictive policies are not exactly batch 091''s three';
  end if;

  -- 3. Every PERMISSIVE policy is TO authenticated alone. No service, anon or PUBLIC permissive policy.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ' order by pol.polname) into offending
    from pg_catalog.pg_policy pol join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = any (cal_tables) and pol.polpermissive
     and pol.polroles <> array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]::oid[];
  if offending is not null then
    raise exception 'a batch 091 permissive policy is not TO authenticated alone: %', offending;
  end if;

  -- 4. The write authority: owner and admin, and nobody else, in every permissive write policy.
  select string_agg(pol.polname, ', ' order by pol.polname) into offending
    from pg_catalog.pg_policy pol join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = any (cal_tables) and pol.polpermissive and pol.polcmd in ('a', 'w')
     and position('ARRAY[''owner''::text, ''admin''::text]' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) = 0;
  if offending is not null then
    raise exception 'a batch 091 write policy does not name exactly owner and admin: %', offending
      using hint = '§8.3 Schedule/unschedule is Y for owner and admin, P for editor (undefined, refused), N for approver and viewer.';
  end if;

  -- 5. No policy writes a status a client may not: the INSERT policy says draft; the UPDATE policy's
  --    WITH CHECK admits draft and cancelled and nothing else.
  if (select pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.content_schedules'::regclass and pol.polname = 'content_schedules_update_scheduler')
     !~ 'status = ANY \(ARRAY\[''draft''::text, ''cancelled''::text\]\)' then
    raise exception 'content_schedules_update_scheduler no longer confines a client''s status to draft or cancelled';
  end if;
  if (select pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.content_schedules'::regclass and pol.polname = 'content_schedules_insert_scheduler')
     !~ 'status = ''draft''::text' then
    raise exception 'content_schedules_insert_scheduler no longer confines a new schedule to draft';
  end if;

  -- 6. The client grants: status, publish_intent_id and version are not insertable; publish_intent_id
  --    and version are not updatable; app_worker and anon hold nothing.
  select string_agg(format('%s.%s %s', t, col, priv), ', ') into offending
    from (values ('content_schedules', 'status', 'INSERT'), ('content_schedules', 'publish_intent_id', 'INSERT'),
                 ('content_schedules', 'version', 'INSERT'), ('content_schedules', 'publish_intent_id', 'UPDATE'),
                 ('content_schedules', 'version', 'UPDATE'), ('content_schedules', 'content_target_id', 'UPDATE'),
                 ('calendar_items', 'content_item_id', 'UPDATE'), ('calendar_items', 'updated_by', 'INSERT'),
                 ('content_schedules', 'updated_by', 'INSERT')) as g(t, col, priv)
   where pg_catalog.has_column_privilege('authenticated', ('app.' || t)::regclass, col, priv);
  if offending is not null then
    raise exception 'authenticated holds a batch 091 column privilege it must not: %', offending;
  end if;
  select string_agg(format('%s on %s', r, t), ', ') into offending
    from unnest(cal_tables) t, unnest(array['anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz']) r
   where pg_catalog.has_table_privilege(r, ('app.' || t)::regclass, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE');
  if offending is not null then
    raise exception 'a non-client role holds a privilege on a batch 091 table: %', offending;
  end if;
  select string_agg(t, ', ') into offending from unnest(cal_tables) t
   where pg_catalog.has_table_privilege('authenticated', ('app.' || t)::regclass, 'DELETE');
  if offending is not null then
    raise exception 'authenticated may DELETE from %; §8.5 gives no broad user delete', offending;
  end if;

  -- 7. The status vocabulary, by definition text; the deferred key is absent.
  if (select pg_catalog.pg_get_constraintdef(con.oid) from pg_catalog.pg_constraint con
       where con.conrelid = 'app.content_schedules'::regclass and con.conname = 'content_schedules_status_known')
     is distinct from 'CHECK ((status = ANY (ARRAY[''draft''::text, ''armed''::text, ''dispatched''::text, ''cancelled''::text, ''completed''::text, ''failed''::text])))' then
    raise exception 'content_schedules_status_known is missing or not §4.7''s six values';
  end if;

  -- 8. The two unique-active rules, by definition text.
  select count(*) into count_of from pg_catalog.pg_indexes
   where schemaname = 'app'
     and ((indexname = 'calendar_items_one_active_per_item'
           and indexdef = 'CREATE UNIQUE INDEX calendar_items_one_active_per_item ON app.calendar_items USING btree (content_item_id) WHERE (deleted_at IS NULL)')
       or (indexname = 'content_schedules_one_live_per_target'
           and indexdef = 'CREATE UNIQUE INDEX content_schedules_one_live_per_target ON app.content_schedules USING btree (content_target_id) WHERE (status = ANY (ARRAY[''draft''::text, ''armed''::text]))'));
  if count_of <> 2 then
    raise exception 'batch 091 finds % of its two unique-active indexes in their required shape', count_of;
  end if;

  -- 9. The set_updated_at trigger on both tables.
  select count(*) into count_of from pg_catalog.pg_trigger t join pg_catalog.pg_proc p on p.oid = t.tgfoid
   where t.tgrelid in ('app.calendar_items'::regclass, 'app.content_schedules'::regclass)
     and not t.tgisinternal and t.tgname = 'set_updated_at' and p.proname = 'set_updated_at';
  if count_of <> 2 then
    raise exception 'batch 091 finds % set_updated_at trigger(s) on its two tables', count_of;
  end if;
end $$;
