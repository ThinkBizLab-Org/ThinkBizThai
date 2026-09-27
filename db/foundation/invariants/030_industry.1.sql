do $$
declare
  offending text;
  count_of  integer;
begin
  -- ENABLE and FORCE on all three. The two are different catalog columns and the data package's own
  -- lint rule reads only the first (RFC-2026-016). On the two global tables this is the ONLY thing
  -- refusing a role that holds a grant, because neither has a policy.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('industry_packs', 'industry_pack_versions', 'industry_assignments')
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'On a global table with no policy, FORCE is the whole control: without it the '
                   'table owner reads every row and the isolation suite cannot tell that from a '
                   'working catalog.';
  end if;

  -- The immutability of the published version table, as the privilege system holds it. This is
  -- §3.2, §4 invariant 8 and §5's "published immutable" in one query, asserted against the live
  -- ACLs rather than against the text of the grants above, because a grant made by a LATER batch
  -- would not appear in this file at all.
  --
  -- `has_any_column_privilege` for UPDATE so a column-scoped grant is caught as well as a
  -- table-wide one; DELETE has no column-level form and is asked of the table.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'industry_pack_versions'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'a published pack version can be updated or deleted: %', offending
      using hint = 'The industry pack contract says a published version is immutable and is changed '
                   'only by publishing a new one. The absence of the grant is what makes the refusal '
                   'a privilege-layer denial rather than a policy a later edit can widen.';
  end if;

  -- And the same claim as the policy catalog holds it. Both halves, because either alone can be
  -- satisfied while the other is wrong: a policy with no grant is inert, and a grant with no policy
  -- is denied by RLS instead of by privilege, which is a weaker refusal than immutability asks for.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'industry_pack_versions'
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'the published version table carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- §8.5, per column, against the live ACL: an assignment may not be moved across tenant or scope
  -- by an update. The grant above names two columns and this is what says so about the other two.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['workspace_id', 'business_profile_id']) as col
       where n.nspname = 'app'
         and c.relname = 'industry_assignments'
         and r.rolname in ('authenticated', 'anon', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a scope column of app.industry_assignments is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant OR scope with an update, and the '
                   'privilege system is where that is enforced rather than a WITH CHECK a later '
                   'edit could weaken. app_worker is excluded from this list on purpose: it holds a '
                   'table-wide grant and no policy, so row level security refuses it entirely.';
  end if;

  -- No role holds DELETE on the assignment, which is the header's "a Business can be re-pinned and
  -- not un-pinned" as the privilege system holds it.
  select string_agg(r.rolname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname = 'industry_assignments'
     and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
     and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE');
  if offending is not null then
    raise exception 'an industry assignment can be deleted through a granted path: %', offending
      using hint = '§8.5 has no broad user delete and requires a soft delete through a typed '
                   'lifecycle field. No document names one for this row, so batch 030 grants the '
                   'verb to nobody rather than inventing the field.';
  end if;

  -- The narrowing is RESTRICTIVE. A permissive policy with the same name and the same predicate
  -- would WIDEN this table instead of narrowing it — a member would see every assignment their
  -- scope admits OR their membership admits, which is what the SELECT policy already does — and
  -- §12.6/2 would silently stop being implemented on this table. polpermissive is the one catalog
  -- column that tells the two apart.
  -- SUPERSEDED BY 031, 102 AND 105. Batch 030 wrote one restrictive policy here; 031 added
  -- `industry_assignments_service_path_closed`, 102 added `industry_assignments_updated_by_is_caller`
  -- and 105 added `industry_assignments_updated_by_on_update_is_caller`,
  -- all three restrictive and each asserted by its own batch's block, which this pass also re-runs.
  -- The final-state form pins the whole set by name, so a fifth restrictive policy still fails here
  -- exactly as a second one failed 030's original, and 030's own policy is still counted as one.
  if (select array_agg(pol.polname::text order by pol.polname)
        from pg_catalog.pg_policy pol
        join pg_catalog.pg_class c on c.oid = pol.polrelid
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'app' and c.relname = 'industry_assignments' and not pol.polpermissive)
     is distinct from array['industry_assignments_scope_narrows_member',
                            'industry_assignments_service_path_closed',
                            'industry_assignments_updated_by_is_caller',
                            'industry_assignments_updated_by_on_update_is_caller'] then  -- SUPERSEDED BY 105: its UPDATE closure
    raise exception 'app.industry_assignments restrictive policies are not exactly 030''s narrowing, 031''s closure and 102''s and 105''s updated_by closures';
  end if;
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'industry_assignments'
     and not pol.polpermissive
     and pol.polname not in ('industry_assignments_service_path_closed', 'industry_assignments_updated_by_is_caller',
                             'industry_assignments_updated_by_on_update_is_caller');  -- SUPERSEDED BY 105: its UPDATE closure
  if count_of <> 1 then
    raise exception 'app.industry_assignments carries % restrictive policies and batch 030 writes exactly one', count_of
      using hint = 'The member-scope narrowing is the only thing on this table that must AND rather '
                   'than OR. If it is gone, a scoped editor reaches every Business in their '
                   'workspace; if there are two, one of them is a decision nobody recorded.';
  end if;

  -- No policy this batch writes may name a service or anonymous role. §8.1 gives the service `P` on
  -- Business operations and anonymous nothing anywhere; a `TO app_worker` policy here would add a
  -- permission the matrix does not grant and would make the service denial unfalsifiable.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'industry_assignments'
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('app_worker', 'app_command', 'app_maintenance', 'anon'));
  if offending is not null then
    raise exception 'batch 030 wrote a policy for a service or anonymous role: %', offending;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members, and 030 creates no helper and needs no
  -- exemption — so this is the whole of what 030 owes that decision, asserted rather than promised.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('industry_packs', 'industry_pack_versions', 'industry_assignments')
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020 and 021 ask them:
  -- scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('industry_packs', 'industry_pack_versions', 'industry_assignments')
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 030 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
