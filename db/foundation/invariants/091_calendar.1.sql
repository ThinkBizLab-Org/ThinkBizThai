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
  -- SUPERSEDED BY 127. Batch 127 added `<table>_created_by_is_caller`, restrictive, INSERT, TO
  -- authenticated, to both tables (A1's review of 091, F3: created_by was bound only inside the
  -- permissive INSERT policy). It is asserted by 127's own block, which this pass also re-runs, and
  -- pinned by exact text in the created_by closure probe. The final-state set is asserted FIRST and
  -- whole, so a sixth restrictive policy fails here exactly as a fifth failed 091's original; then
  -- 091's own two assertions, word for word, with 127's (table, name) pair excluded by a join.
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.calendar_items'::regclass and not pol.polpermissive)
     is distinct from array['calendar_items_created_by_is_caller', 'calendar_items_deleted_is_final', 'calendar_items_scope_narrowing',
                            'calendar_items_service_path_closed', 'calendar_items_updated_by_on_update_is_caller'] then
    raise exception 'app.calendar_items restrictive policies are not exactly batch 091''s four and 127''s created_by closure';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.content_schedules'::regclass and not pol.polpermissive)
     is distinct from array['content_schedules_client_transition_is_bounded', 'content_schedules_created_by_is_caller', 'content_schedules_scope_narrowing',
                            'content_schedules_service_path_closed', 'content_schedules_updated_by_on_update_is_caller'] then
    raise exception 'app.content_schedules restrictive policies are not exactly batch 091''s four and 127''s created_by closure';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       join pg_catalog.pg_class c127 on c127.oid = pol.polrelid and (c127.relname::text, pol.polname::text) not in (('calendar_items', 'calendar_items_created_by_is_caller'))  -- SUPERSEDED BY 127: names another file wrote, see above
       where pol.polrelid = 'app.calendar_items'::regclass and not pol.polpermissive)
     is distinct from array['calendar_items_deleted_is_final', 'calendar_items_scope_narrowing',
                            'calendar_items_service_path_closed', 'calendar_items_updated_by_on_update_is_caller'] then
    raise exception 'app.calendar_items restrictive policies are not exactly batch 091''s four';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       join pg_catalog.pg_class c127 on c127.oid = pol.polrelid and (c127.relname::text, pol.polname::text) not in (('content_schedules', 'content_schedules_created_by_is_caller'))  -- SUPERSEDED BY 127: names another file wrote, see above
       where pol.polrelid = 'app.content_schedules'::regclass and not pol.polpermissive)
     is distinct from array['content_schedules_client_transition_is_bounded', 'content_schedules_scope_narrowing',
                            'content_schedules_service_path_closed', 'content_schedules_updated_by_on_update_is_caller'] then
    raise exception 'app.content_schedules restrictive policies are not exactly batch 091''s four';
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
   where n.nspname = 'app' and c.relname = any (cal_tables) and pol.polpermissive and pol.polcmd in ('a', 'w', '*')
     and position('ARRAY[''owner''::text, ''admin''::text]' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) = 0;
  if offending is not null then
    raise exception 'a batch 091 write policy does not name exactly owner and admin: %', offending
      using hint = '§8.3 Schedule/unschedule is Y for owner and admin, P for editor (undefined, refused), N for approver and viewer.';
  end if;

  -- 5. ALL SIX PERMISSIVE POLICIES, BY COMMAND AND EXACT TEXT, BOTH HALVES (C0 F1/F2 and A1 F1/F2 on 091's
  --    first head: a regex over one half let a widened USING through). The INSERT policies admit a draft,
  --    unlinked, at version 1; the UPDATE policies touch only owner/admin rows, and a schedule only while
  --    draft or armed, writing only draft or cancelled. The two READ policies are pinned too, as FOR
  --    SELECT with no WITH CHECK (Q0 F1 on 091's corrections, MEDIUM: a read policy recreated FOR ALL
  --    under its own name, with the owner/admin token in its WITH CHECK, passed items 3 and 4 and the count
  --    of six, and let an approver place an item and a viewer create a schedule).
  select string_agg(pin.name, ', ' order by pin.name) into offending
    from (values
      ('calendar_items_select_active_member', 'r', 'app.is_active_member(workspace_id)', null),
      ('content_schedules_select_active_member', 'r', 'app.is_active_member(workspace_id)', null),
      ('calendar_items_insert_scheduler', 'a', null,
       '((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY[''owner''::text, ''admin''::text])))'),
      ('calendar_items_update_scheduler', 'w',
       '(app.workspace_member_role(workspace_id) = ANY (ARRAY[''owner''::text, ''admin''::text]))',
       '((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY[''owner''::text, ''admin''::text])))'),
      ('content_schedules_insert_scheduler', 'a', null,
       '((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY[''owner''::text, ''admin''::text])) AND (status = ''draft''::text) AND (publish_intent_id IS NULL) AND (version = 1))'),
      ('content_schedules_update_scheduler', 'w',
       '((app.workspace_member_role(workspace_id) = ANY (ARRAY[''owner''::text, ''admin''::text])) AND (status = ANY (ARRAY[''draft''::text, ''armed''::text])))',
       '((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY[''owner''::text, ''admin''::text])) AND (status = ANY (ARRAY[''draft''::text, ''cancelled''::text])))')
    ) as pin(name, cmd, using_text, check_text)
   where not exists (
     select 1 from pg_catalog.pg_policy pol
      where pol.polname = pin.name and pol.polpermissive and pol.polcmd = pin.cmd
        and pol.polrelid in ('app.calendar_items'::regclass, 'app.content_schedules'::regclass)
        and pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) is not distinct from pin.using_text
        and pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) is not distinct from pin.check_text);
  if offending is not null then
    raise exception 'batch 091 permissive policy(ies) not in their command and exact text: %', offending;
  end if;
  -- Exactly one permissive policy per table per command, SELECT, INSERT and UPDATE, and none FOR ALL or
  -- FOR DELETE: a total of six could hide a retyped policy beside a missing one.
  if (select array_agg(format('%s:%s', c.relname, pol.polcmd) order by c.relname, pol.polcmd)
        from pg_catalog.pg_policy pol join pg_catalog.pg_class c on c.oid = pol.polrelid
       where pol.polrelid in ('app.calendar_items'::regclass, 'app.content_schedules'::regclass) and pol.polpermissive)
     is distinct from array['calendar_items:a', 'calendar_items:r', 'calendar_items:w',
                            'content_schedules:a', 'content_schedules:r', 'content_schedules:w'] then
    raise exception 'batch 091 has other permissive policies than one SELECT, one INSERT and one UPDATE on each table';
  end if;

  -- 6. The client grants: status, publish_intent_id and version are not insertable; publish_intent_id
  --    and version are not updatable; neither is the id, the scope (workspace, Business and the item or
  --    target) or created_by on either table (Q0 F6 on 091's corrections: an UPDATE grant on the scope
  --    columns passed every layer, and only the composite key then stood between a client and a move
  --    across scope); app_worker and anon hold nothing.
  select string_agg(format('%s.%s %s', t, col, priv), ', ') into offending
    from (values ('content_schedules', 'status', 'INSERT'), ('content_schedules', 'publish_intent_id', 'INSERT'),
                 ('content_schedules', 'version', 'INSERT'), ('content_schedules', 'publish_intent_id', 'UPDATE'),
                 ('content_schedules', 'version', 'UPDATE'), ('content_schedules', 'content_target_id', 'UPDATE'),
                 ('calendar_items', 'content_item_id', 'UPDATE'), ('calendar_items', 'updated_by', 'INSERT'),
                 ('content_schedules', 'updated_by', 'INSERT'),
                 ('calendar_items', 'id', 'UPDATE'), ('calendar_items', 'workspace_id', 'UPDATE'),
                 ('calendar_items', 'business_profile_id', 'UPDATE'), ('calendar_items', 'created_by', 'UPDATE'),
                 ('content_schedules', 'id', 'UPDATE'), ('content_schedules', 'workspace_id', 'UPDATE'),
                 ('content_schedules', 'business_profile_id', 'UPDATE'), ('content_schedules', 'created_by', 'UPDATE'))
         as g(t, col, priv)
   where pg_catalog.has_column_privilege('authenticated', ('app.' || t)::regclass, col, priv);
  if offending is not null then
    raise exception 'authenticated holds a batch 091 column privilege it must not: %', offending;
  end if;
  -- Every table privilege, and every column privilege on any column (Q0 F2 on 091's corrections: a
  -- column-level UPDATE or SELECT, or TRIGGER or REFERENCES, reached app_worker with this check green,
  -- because has_table_privilege is false for a column-only grant and the list named five of seven).
  -- MAINTAIN exists from PostgreSQL 17 and is asked only there.
  select string_agg(format('%s on %s', r, t), ', ') into offending
    from unnest(cal_tables) t, unnest(array['anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz']) r
   where pg_catalog.has_table_privilege(r, ('app.' || t)::regclass,
           'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'
           || case when pg_catalog.current_setting('server_version_num')::integer >= 170000 then ', MAINTAIN' else '' end)
      or pg_catalog.has_any_column_privilege(r, ('app.' || t)::regclass, 'SELECT, INSERT, UPDATE, REFERENCES');
  if offending is not null then
    raise exception 'a non-client role holds a privilege on a batch 091 table: %', offending;
  end if;
  select string_agg(t, ', ') into offending from unnest(cal_tables) t
   where pg_catalog.has_table_privilege('authenticated', ('app.' || t)::regclass, 'DELETE');
  if offending is not null then
    raise exception 'authenticated may DELETE from %; §8.5 gives no broad user delete', offending;
  end if;

  -- 7. The status vocabulary, the zone and value CHECKs and the two scope keys, by definition text, and
  --    every NOT NULL. The zone pins hold the DateStyle-independent literal (C0 G2). The deferred
  --    intent key is 124's to assert (C0 F4 on 091's first head: this comment used to claim the key's
  --    absence was checked, and it was not).
  if (select pg_catalog.pg_get_constraintdef(con.oid) from pg_catalog.pg_constraint con
       where con.conrelid = 'app.content_schedules'::regclass and con.conname = 'content_schedules_status_known')
     is distinct from 'CHECK ((status = ANY (ARRAY[''draft''::text, ''armed''::text, ''dispatched''::text, ''cancelled''::text, ''completed''::text, ''failed''::text])))' then
    raise exception 'content_schedules_status_known is missing or not §4.7''s six values';
  end if;
  select string_agg(pin.name, ', ' order by pin.name) into offending
    from (values
      ('calendar_items_item_scope_fk', 'FOREIGN KEY (workspace_id, business_profile_id, content_item_id) REFERENCES app.content_items(workspace_id, business_profile_id, id)'),
      ('content_schedules_target_scope_fk', 'FOREIGN KEY (workspace_id, business_profile_id, content_target_id) REFERENCES app.content_targets(workspace_id, business_profile_id, id)'),
      ('calendar_items_timezone_known', 'CHECK (((length(timezone) <= 64) AND (timezone(timezone, make_timestamp(2000, 1, 1, 0, 0, (0)::double precision)) IS NOT NULL)))'),
      ('content_schedules_timezone_known', 'CHECK (((length(timezone_snapshot) <= 64) AND (timezone(timezone_snapshot, make_timestamp(2000, 1, 1, 0, 0, (0)::double precision)) IS NOT NULL)))'),
      ('calendar_items_timezone_is_iana', 'CHECK (((timezone = ''UTC''::text) OR (timezone ~ ''^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific)(/[A-Za-z_]+(-[A-Za-z_]+)*)+$''::text)))'),
      ('content_schedules_timezone_is_iana', 'CHECK (((timezone_snapshot = ''UTC''::text) OR (timezone_snapshot ~ ''^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific)(/[A-Za-z_]+(-[A-Za-z_]+)*)+$''::text)))'),
      ('calendar_items_display_status_bounded', 'CHECK (((display_status IS NULL) OR (length(display_status) <= 64)))'),
      -- Q0 F5 on 091's corrections: these two were asserted by nothing, and each could be dropped with
      -- every layer green.
      ('calendar_items_display_status_not_blank', 'CHECK (((display_status IS NULL) OR (length(btrim(display_status)) > 0)))'),
      ('content_schedules_version_positive', 'CHECK ((version >= 1))')
    ) as pin(name, def)
   where not exists (
     select 1 from pg_catalog.pg_constraint con
      where con.conname = pin.name and con.convalidated
        and con.conrelid in ('app.calendar_items'::regclass, 'app.content_schedules'::regclass)
        and pg_catalog.pg_get_constraintdef(con.oid) = pin.def);
  if offending is not null then
    raise exception 'batch 091 constraint(s) missing, unvalidated or not in their required text: %', offending;
  end if;
  -- Every NOT NULL column of both tables (Q0 F5 on 091's corrections: dropping NOT NULL on the scope, the
  -- item, the date or the status passed every layer; a null workspace_id lets the composite scope key
  -- skip the row, and a null status escapes status_known and both partial indexes).
  select string_agg(format('%s.%s', req.t, req.col), ', ' order by req.t, req.col) into offending
    from (values ('calendar_items', 'id'), ('calendar_items', 'workspace_id'), ('calendar_items', 'business_profile_id'),
                 ('calendar_items', 'content_item_id'), ('calendar_items', 'scheduled_local_date'),
                 ('calendar_items', 'timezone'), ('calendar_items', 'created_at'), ('calendar_items', 'updated_at'),
                 ('content_schedules', 'id'), ('content_schedules', 'workspace_id'),
                 ('content_schedules', 'business_profile_id'), ('content_schedules', 'content_target_id'),
                 ('content_schedules', 'scheduled_for'), ('content_schedules', 'timezone_snapshot'),
                 ('content_schedules', 'status'), ('content_schedules', 'version'), ('content_schedules', 'created_at'),
                 ('content_schedules', 'updated_at')) as req(t, col)
   where not exists (
     select 1 from pg_catalog.pg_attribute a
      where a.attrelid = ('app.' || req.t)::regclass and a.attname = req.col and not a.attisdropped and a.attnotnull);
  if offending is not null then
    raise exception 'batch 091 column(s) no longer NOT NULL: %', offending;
  end if;

  -- 8. The two unique-active rules, by definition text.
  select count(*) into count_of from pg_catalog.pg_indexes
   where schemaname = 'app'
     and ((indexname = 'calendar_items_one_active_per_item'
           and indexdef = 'CREATE UNIQUE INDEX calendar_items_one_active_per_item ON app.calendar_items USING btree (content_item_id) WHERE (deleted_at IS NULL)')
       or (indexname = 'content_schedules_one_live_per_target'
           and indexdef = 'CREATE UNIQUE INDEX content_schedules_one_live_per_target ON app.content_schedules USING btree (content_target_id) WHERE (status = ANY (ARRAY[''draft''::text, ''armed''::text, ''dispatched''::text]))'));
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

  -- 10. THE ROWS A CLIENT MAY UPDATE, and the database-owned deletion time, by exact text. The two
  --     restrictive closures are pinned by the catalog-rule probe as well (PINNED_POLICIES).
  if not exists (
       select 1 from pg_catalog.pg_policy pol
        where pol.polrelid = 'app.content_schedules'::regclass and pol.polname = 'content_schedules_client_transition_is_bounded'
          and not pol.polpermissive and pol.polcmd = 'w'
          and pol.polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]::oid[]
          and pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) = '(status = ANY (ARRAY[''draft''::text, ''armed''::text]))'
          and pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) = '(status = ANY (ARRAY[''draft''::text, ''cancelled''::text]))') then
    raise exception 'content_schedules_client_transition_is_bounded is missing or not in its required shape';
  end if;
  if not exists (
       select 1 from pg_catalog.pg_policy pol
        where pol.polrelid = 'app.calendar_items'::regclass and pol.polname = 'calendar_items_deleted_is_final'
          and not pol.polpermissive and pol.polcmd = 'w'
          and pol.polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]::oid[]
          and pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) = '(deleted_at IS NULL)'
          and pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) = 'true') then
    raise exception 'calendar_items_deleted_is_final is missing or not in its required shape';
  end if;
  if not exists (
       select 1 from pg_catalog.pg_trigger t
        where t.tgrelid = 'app.calendar_items'::regclass and t.tgname = 'set_deleted_at' and not t.tgisinternal and t.tgenabled = 'O'
          and pg_catalog.pg_get_triggerdef(t.oid) = 'CREATE TRIGGER set_deleted_at BEFORE UPDATE ON app.calendar_items FOR EACH ROW EXECUTE FUNCTION private.set_deleted_at()')
     or not exists (
       select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'private' and p.proname = 'set_deleted_at' and not p.prosecdef
          and p.proconfig = array['search_path=""'] and md5(p.prosrc) = '3b153bd25169c0cee4476163fa2db757'
          and not pg_catalog.has_function_privilege('public', p.oid, 'EXECUTE')) then
    raise exception 'batch 091''s set_deleted_at trigger or function is missing, disabled, rewritten, or not SECURITY INVOKER with an empty search_path and no EXECUTE for PUBLIC';
  end if;
end $$;
