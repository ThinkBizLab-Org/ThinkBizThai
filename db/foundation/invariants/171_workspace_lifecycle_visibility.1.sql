do $$
declare
  offending text;
  count_of  integer;
  admitted  constant text[] := array['active', 'closing'];
  blocked   constant text[] := array['access_blocked', 'purge_queued', 'held', 'purging', 'verify', 'deleted'];
  check_def text;
  states    text[];
begin
  -- SUPERSEDED BY 172. RFC-2026-023 §3.2 (approved 2026-10-05; migration 172, batch 141) gives app_authz a THIRD
  -- policy, workspace_member_scopes_select_authz_own on app.workspace_member_scopes (permissive FOR SELECT for
  -- app_authz alone, `user_id = app.jwt_subject()`), five more columns and three more functions. The final state is
  -- asserted FIRST and whole -- three policies, the third in its shape, eleven columns, six functions -- so a fourth
  -- policy, a sixth table's column or a seventh function fails here; then 171's checks, word for word, with 172's
  -- additions excluded where they are counted; then check 5 gains the fifth place the admitted literal is stated.
  select count(*) into count_of
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (p.polroles) and r.rolname = 'app_authz');
  if count_of <> 3 then
    raise exception 'after batch 172, app_authz holds % policies in schema app; RFC-2026-027 and RFC-2026-023 give it exactly three', count_of;
  end if;
  if not exists (select 1 from pg_catalog.pg_policy p
                  where p.polrelid = 'app.workspace_member_scopes'::regclass and p.polname = 'workspace_member_scopes_select_authz_own'
                    and p.polcmd = 'r' and p.polpermissive
                    and p.polroles = array[(select r.oid from pg_catalog.pg_roles r where r.rolname = 'app_authz')]::oid[]) then
    raise exception 'workspace_member_scopes_select_authz_own is missing or not a permissive FOR SELECT for app_authz alone';
  end if;
  select string_agg(format('%s.%s.%s', n.nspname, c.relname, a.attname), ', '
                    order by n.nspname, c.relname, a.attname) into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
   where n.nspname in ('app', 'private') and c.relkind in ('r', 'p', 'v', 'm', 'f')
     and pg_catalog.has_column_privilege('app_authz', c.oid, a.attnum, 'SELECT');
  if offending is distinct from
     'app.workspace_member_scopes.business_profile_id, app.workspace_member_scopes.page_context_profile_id, '
     || 'app.workspace_member_scopes.scope_type, app.workspace_member_scopes.user_id, app.workspace_member_scopes.workspace_id, '
     || 'app.workspace_members.role, app.workspace_members.status, app.workspace_members.user_id, '
     || 'app.workspace_members.workspace_id, app.workspaces.id, app.workspaces.lifecycle_state' then
    raise exception 'app_authz''s column SELECT is not exactly the eleven columns RFC-2026-027 and RFC-2026-023 name: %', coalesce(offending, '(none)');
  end if;
  select string_agg(p.oid::regprocedure::text, ', ' order by p.oid::regprocedure::text) into offending
    from pg_catalog.pg_proc p
   where pg_catalog.pg_get_userbyid(p.proowner) = 'app_authz';
  if offending is distinct from 'app.acting_user_admits_business(uuid,uuid), app.acting_user_admits_page(uuid,uuid,uuid), '
                               || 'app.is_active_member(uuid), app.jwt_aal(), app.jwt_subject(), app.workspace_member_role(uuid)' then
    raise exception 'app_authz owns functions other than the six helpers: %', coalesce(offending, '(none)');
  end if;

  -- 1. app_authz holds exactly two policies in app, both permissive FOR SELECT, on the two named tables
  --    under the two named names (RFC-2026-020 §5/3 and §6.1/5 as RFC-2026-027 §3.4 amends them).
  select count(*) into count_of
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (p.polroles) and r.rolname = 'app_authz')
     and (c.relname::text, p.polname::text) <> ('workspace_member_scopes', 'workspace_member_scopes_select_authz_own');  -- SUPERSEDED BY 172: the third policy, counted whole above
  if count_of <> 2 then
    raise exception 'after batch 171, app_authz holds % policies in schema app; RFC-2026-027 gives it exactly two', count_of
      using hint = 'A third policy is a third decision and needs its own RFC.';
  end if;
  select string_agg(format('%s.%s', c.relname, p.polname), ', ' order by c.relname) into offending
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (p.polroles) and r.rolname = 'app_authz')
     and (c.relname::text, p.polname::text) <> ('workspace_member_scopes', 'workspace_member_scopes_select_authz_own')  -- SUPERSEDED BY 172: its shape is asserted above
     and not (p.polcmd = 'r' and p.polpermissive and cardinality(p.polroles) = 1
              and ((c.relname = 'workspace_members' and p.polname = 'workspace_members_select_authz_own_active')
                or (c.relname = 'workspaces' and p.polname = 'workspaces_select_authz_own_open')));
  if offending is not null then
    raise exception 'an app_authz policy is not one of the two RFC-2026-027 names, or is not a permissive FOR SELECT for app_authz alone: %', offending;
  end if;

  -- 2. Neither app_authz policy calls a membership helper: after this batch the helpers read
  --    app.workspaces, so such a call recurses at run time (RFC-2026-027 §3.1, §6/2).
  select string_agg(p.polname, ', ') into offending
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (p.polroles) and r.rolname = 'app_authz')
     and (pg_catalog.pg_get_expr(p.polqual, p.polrelid) ~ '(workspace_member_role|is_active_member)\('
          or coalesce(pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid), '') ~ '(workspace_member_role|is_active_member)\(');
  if offending is not null then
    raise exception 'app_authz policy % calls a membership helper; the helpers read app.workspaces, so the call recurses', offending;
  end if;

  -- 3. app_authz's privileges on every relation in app and private are exactly the six columns of
  --    RFC-2026-020 §6.1/6 as amended: SELECT on workspace_members (workspace_id, user_id, role, status)
  --    and on workspaces (id, lifecycle_state), and no table-level privilege anywhere.
  select string_agg(format('%s.%s.%s', n.nspname, c.relname, a.attname), ', '
                    order by n.nspname, c.relname, a.attname) into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
   where n.nspname in ('app', 'private') and c.relkind in ('r', 'p', 'v', 'm', 'f')
     and pg_catalog.has_column_privilege('app_authz', c.oid, a.attnum, 'SELECT')
     and c.oid <> 'app.workspace_member_scopes'::regclass;  -- SUPERSEDED BY 172: its five columns are asserted above
  if offending is distinct from
     'app.workspace_members.role, app.workspace_members.status, app.workspace_members.user_id, '
     || 'app.workspace_members.workspace_id, app.workspaces.id, app.workspaces.lifecycle_state' then
    raise exception 'app_authz''s column SELECT is not exactly the six columns RFC-2026-027 names: %', coalesce(offending, '(none)');
  end if;
  select string_agg(format('%s.%s %s', n.nspname, c.relname, pv.p), ', ' order by n.nspname, c.relname, pv.p) into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace,
         unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) as pv(p)
   where n.nspname in ('app', 'private') and c.relkind in ('r', 'p', 'v', 'm', 'f')
     and pg_catalog.has_table_privilege('app_authz', c.oid, pv.p);
  if offending is not null then
    raise exception 'app_authz holds table-level privilege(s): %', offending;
  end if;
  select string_agg(format('%s.%s.%s %s', n.nspname, c.relname, a.attname, pv.p), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped,
         unnest(array['INSERT', 'UPDATE', 'REFERENCES']) as pv(p)
   where n.nspname in ('app', 'private') and c.relkind in ('r', 'p', 'v', 'm', 'f')
     and pg_catalog.has_column_privilege('app_authz', c.oid, a.attnum, pv.p);
  if offending is not null then
    raise exception 'app_authz holds a column privilege other than SELECT: %', offending;
  end if;

  -- 4. Every function app_authz owns is still SECURITY DEFINER with an empty search_path, and they are
  --    exactly the three helpers (RFC-2026-020 §6.1/4).
  select string_agg(p.oid::regprocedure::text, ', ' order by p.oid::regprocedure::text) into offending
    from pg_catalog.pg_proc p
   where pg_catalog.pg_get_userbyid(p.proowner) = 'app_authz'
     and p.oid not in ('app.acting_user_admits_business(uuid, uuid)'::regprocedure,  -- SUPERSEDED BY 172: the three it
                       'app.acting_user_admits_page(uuid, uuid, uuid)'::regprocedure,  -- adds are named above
                       'app.jwt_aal()'::regprocedure);
  if offending is distinct from 'app.is_active_member(uuid), app.jwt_subject(), app.workspace_member_role(uuid)' then
    raise exception 'app_authz owns functions other than the three helpers: %', coalesce(offending, '(none)');
  end if;
  select string_agg(p.proname, ', ') into offending
    from pg_catalog.pg_proc p
   where pg_catalog.pg_get_userbyid(p.proowner) = 'app_authz'
     and (not p.prosecdef or p.proconfig is null or not (p.proconfig @> array['search_path=""']));
  if offending is not null then
    raise exception 'function(s) % owned by app_authz are not SECURITY DEFINER with an empty search_path', offending;
  end if;

  -- 5. Every lifecycle state is classified, and the admitted literal is the same in the four places that
  --    state it (RFC-2026-027 §6/4). The CHECK's values must be exactly admitted ∪ blocked: a ninth
  --    state fails here until somebody classifies it.
  select pg_catalog.pg_get_constraintdef(con.oid) into check_def
    from pg_catalog.pg_constraint con
   where con.conrelid = 'app.workspaces'::regclass and con.conname = 'workspaces_lifecycle_state_known';
  if check_def is null then
    raise exception 'app.workspaces carries no workspaces_lifecycle_state_known; the lifecycle states cannot be classified';
  end if;
  select array_agg(m[1] order by m[1]) into states
    from regexp_matches(check_def, '''([a-z_]+)''::text', 'g') as m;
  if states is distinct from (select array_agg(s order by s) from unnest(admitted || blocked) as s) then
    raise exception 'the lifecycle states in workspaces_lifecycle_state_known are not exactly the classified ones: %', check_def
      using hint = 'RFC-2026-027 §2 and §6/4: every state is admitted (active, closing) or blocked (the six); a new one is classified in this block and in the helper before it may exist.';
  end if;
  select string_agg(format('%s.%s', c.relname, p.polname), ', ' order by p.polname) into offending
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
   where c.oid = 'app.workspaces'::regclass
     and p.polname in ('workspaces_select_authz_own_open', 'workspaces_select_active_member', 'workspaces_update_owner')
     and pg_catalog.strpos(pg_catalog.pg_get_expr(p.polqual, p.polrelid),
                           '(lifecycle_state = ANY (ARRAY[''active''::text, ''closing''::text]))') = 0;
  select count(*) into count_of
    from pg_catalog.pg_policy p
   where p.polrelid = 'app.workspaces'::regclass
     and p.polname in ('workspaces_select_authz_own_open', 'workspaces_select_active_member', 'workspaces_update_owner');
  if offending is not null or count_of <> 3 then
    raise exception 'the admitted lifecycle literal is not the same in app.workspaces'' three gated policies (% of 3 present; differing: %)', count_of, coalesce(offending, '(none)');
  end if;
  if pg_catalog.strpos((select p.prosrc from pg_catalog.pg_proc p
                         where p.oid = 'app.workspace_member_role(uuid)'::regprocedure),
                       'w.lifecycle_state in (''active'', ''closing'')') = 0 then
    raise exception 'app.workspace_member_role does not apply the admitted-state gate RFC-2026-027 §3.2 writes';
  end if;
  -- SUPERSEDED BY 172 (RFC-2026-023 §8/2, C0-3). A FIFTH place states the admitted literal: the WITH CHECK of
  -- workspaces_update_command_owner, where it bounds the closing command's TARGET state. It is held to the same
  -- literal here, so a later reclassification that changes the four places above and not this one is refused.
  if coalesce(pg_catalog.strpos((select pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid) from pg_catalog.pg_policy p
                                  where p.polrelid = 'app.workspaces'::regclass and p.polname = 'workspaces_update_command_owner'),
                                '(lifecycle_state = ANY (ARRAY[''active''::text, ''closing''::text]))'), 0) = 0 then
    raise exception 'the admitted lifecycle literal is not the one the closing command''s policy bounds its target state by (workspaces_update_command_owner)';
  end if;

  -- 6. No family escapes the helper (RFC-2026-027 §6/6, A1's F3-a). Every permissive policy a client
  --    role reaches -- TO authenticated, TO anon, or with no TO clause (TO PUBLIC, polroles = {0}) -- on a
  --    workspace-scoped table -- a table in app with a workspace_id column, plus app.workspaces -- calls
  --    app.is_active_member or app.workspace_member_role in USING or WITH CHECK, except the three policies
  --    of 010 the RFC keeps, each exempt ON ITS OWN TABLE ONLY: workspace_members.
  --    workspace_members_select_own_active (Q-027-1) and the two app.workspaces policies that state the gate
  --    themselves. Batch 171's review round (C0 L1, A1 F2, Q0-171-1) widened the role test from
  --    authenticated alone and keyed the exemption on (table, name), not name alone. What this block still
  --    does not see -- a workspace-scoped table keyed through another foreign key, or a helper call that
  --    does not bind (`... or true`) -- is held by the permissive-policy pins (open_blockers[198] (6)).
  select string_agg(format('%s.%s', c.relname, p.polname), ', ' order by c.relname, p.polname) into offending
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and p.polpermissive
     and (0::oid = any (p.polroles)
          or exists (select 1 from pg_catalog.pg_roles r
                      where r.oid = any (p.polroles) and r.rolname in ('authenticated', 'anon')))
     and (c.relname = 'workspaces'
          or exists (select 1 from pg_catalog.pg_attribute a
                      where a.attrelid = c.oid and a.attname = 'workspace_id' and not a.attisdropped))
     and (c.relname::text, p.polname::text) not in (('workspace_members', 'workspace_members_select_own_active'),
                                                     ('workspaces', 'workspaces_select_active_member'),
                                                     ('workspaces', 'workspaces_update_owner'))
     and coalesce(pg_catalog.pg_get_expr(p.polqual, p.polrelid), '')
         || ' ' || coalesce(pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid), '')
         !~ 'app\.(is_active_member|workspace_member_role)\(';
  if offending is not null then
    raise exception 'a client policy on a workspace-scoped table reads membership without the helper, so the lifecycle gate does not reach it: %', offending
      using hint = 'RFC-2026-027 §6/6: call app.is_active_member or app.workspace_member_role, or the policy admits members of a blocked workspace.';
  end if;
end $$;
