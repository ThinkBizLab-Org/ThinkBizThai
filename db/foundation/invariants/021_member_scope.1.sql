do $$
declare
  offending text;
  count_of  integer;
begin
  -- SUPERSEDED BY 171. RFC-2026-027 (approved 2026-10-05) amends RFC-2026-020 §5/3 and §6.1/5: app_authz holds
  -- exactly TWO policies in app -- the one 011 wrote and workspaces_select_authz_own_open on app.workspaces. The final-state
  -- count is asserted FIRST and whole, so a third policy fails here exactly as a second failed the original; then
  -- the original assertion, word for word, with 171's (table, name) pair excluded.
  select count(*) into count_of
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (p.polroles) and r.rolname = 'app_authz');
  if count_of <> 2 then
    raise exception 'app_authz holds % policies in schema app; RFC-2026-020 §5/3 as RFC-2026-027 amends it gives it exactly two', count_of;
  end if;

  -- THE ASSERTION THIS FILE OWES MOST. RFC-2026-020 §5/3 gives app_authz exactly one policy, and
  -- the header's argument for SECURITY INVOKER scope helpers is worth nothing unless that is still
  -- true AFTER this batch has run. 011's own block asserts it at 011's apply time, which is before
  -- this file exists; this asks the same question on the other side.
  select count(*) into count_of
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (p.polroles) and r.rolname = 'app_authz')
     and (c.relname::text, p.polname::text) not in (('workspaces', 'workspaces_select_authz_own_open'));  -- SUPERSEDED BY 171: the second policy RFC-2026-027 gives app_authz, counted whole above
  if count_of <> 1 then
    raise exception 'after batch 021, app_authz holds % policies in schema app; RFC-2026-020 §5/3 gives it exactly one', count_of
      using hint = 'Batch 021 reads member scope through SECURITY INVOKER helpers precisely so that '
                   'this number does not move. If it has moved, the decision was amended by a '
                   'migration rather than by an RFC.';
  end if;

  -- And the grant half of the same claim: app_authz reaches nothing this batch created.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'workspace_member_scopes'
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- ENABLE and FORCE on the table this batch creates. The two are different catalog columns and the
  -- data package's own lint rule reads only the first (RFC-2026-016).
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'workspace_member_scopes'
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table % does not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending;
  end if;

  -- No role holds UPDATE or DELETE on the scope table. This is the header's "a scope can be added
  -- and not removed" as the privilege system holds it, asserted against the live ACLs rather than
  -- against the text of the grants above — because a grant made by a LATER batch would not appear
  -- in this file at all. `has_any_column_privilege` for UPDATE, so a column-scoped grant is caught
  -- as well as a table-wide one; DELETE has no column form.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'workspace_member_scopes'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'a member scope row can be updated or deleted through the request path: %', offending
      using hint = '§8.5 has no broad user delete and requires a soft delete through a typed lifecycle '
                   'field. No document names one for this row, so batch 021 grants neither verb rather '
                   'than inventing the field. Adding one is a decision, not a grant.';
  end if;

  -- Batch 020's version-table immutability, re-asserted after this batch has added policies to
  -- those two tables. 021 adds an INSERT policy to each and a restrictive FOR ALL; neither is an
  -- UPDATE or a DELETE policy, and this is what says so against the catalog rather than the text.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('business_profile_versions', 'page_context_profile_versions')
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'batch 021 left an UPDATE or DELETE policy on an immutable version table: %', offending;
  end if;

  -- The four narrowing policies are RESTRICTIVE. A permissive policy with the same name and the
  -- same predicate would WIDEN each table instead of narrowing it — every member would see every
  -- Business their scope admits OR their membership admits, which is what batch 020 already does —
  -- and the whole of §12.6/2's second half would silently stop being implemented. polpermissive is
  -- the one catalog column that tells the two apart.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and pol.polname in ('business_profiles_scope_narrows_member',
                         'business_profile_versions_scope_narrows_member',
                         'page_context_profiles_scope_narrows_member',
                         'page_context_profile_versions_scope_narrows_member')
     and pol.polpermissive;
  if offending is not null then
    raise exception 'a scope-narrowing policy is PERMISSIVE and must be RESTRICTIVE: %', offending;
  end if;

  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and pol.polname in ('business_profiles_scope_narrows_member',
                         'business_profile_versions_scope_narrows_member',
                         'page_context_profiles_scope_narrows_member',
                         'page_context_profile_versions_scope_narrows_member');
  if count_of <> 4 then
    raise exception 'batch 021 wrote % scope-narrowing policies and batch 020 created four tables to narrow', count_of
      using hint = 'business_profiles, business_profile_versions, page_context_profiles and '
                   'page_context_profile_versions. A version row holds what a Business or Page used '
                   'to say, so a narrowing that skipped one would leave the history readable to a '
                   'member the current row is hidden from.';
  end if;

  -- No policy this batch writes may name a service or anonymous role. §8.1 gives the service `P` on
  -- identity operations and anonymous nothing anywhere; a `TO app_worker` policy here would add a
  -- permission the matrix does not grant and would make the service denial unfalsifiable.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'workspace_member_scopes'
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('app_worker', 'app_command', 'app_maintenance', 'anon'));
  if offending is not null then
    raise exception 'batch 021 wrote a policy for a service or anonymous role: %', offending;
  end if;

  -- RFC-2026-017 §3, asked here for the same reason batch 020 asks it: scripts/db/run.mjs holds
  -- every tenant table to this rule against the COMMITTED SNAPSHOT, and this batch is deliberately
  -- not applied to the instance that snapshot describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'workspace_member_scopes'
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'app.workspace_member_scopes is owned by a role that must not own a table: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
