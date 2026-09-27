do $$
declare
  offending text;
  count_of  integer;
  narrowing text;
  probe     record;
begin
  -- SUPERSEDED BY 042, 102. Batch 040 wrote one restrictive narrowing per table. The later files
  -- added restrictive policies to the same tables: knowledge_item_versions_service_path_closed (042), knowledge_items_service_path_closed (042), knowledge_items_updated_by_is_caller (102).
  -- Each of those is asserted by its own batch's block, which this pass also re-runs. The final-state
  -- form below pins every table's restrictive set by name, then excludes the later names from the 2
  -- restrictive predicates of 040's original assertions, which are otherwise kept word for word.
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.knowledge_item_versions'::regclass and not pol.polpermissive)
     is distinct from array['knowledge_item_versions_scope_narrows_member', 'knowledge_item_versions_service_path_closed'] then
    raise exception 'app.knowledge_item_versions restrictive policies are not exactly batch 040''s narrowing and the ones 042 added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.knowledge_items'::regclass and not pol.polpermissive)
     is distinct from array['knowledge_items_scope_narrows_member', 'knowledge_items_service_path_closed', 'knowledge_items_updated_by_is_caller'] then
    raise exception 'app.knowledge_items restrictive policies are not exactly batch 040''s narrowing and the ones 042, 102 added';
  end if;
  -- ENABLE and FORCE on both tables. The two are different catalog columns and the data package's
  -- own lint rule reads only the first (RFC-2026-016).
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('knowledge_items', 'knowledge_item_versions')
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending;
  end if;

  -- The immutability of the version table, as the privilege system holds it. §8.2's "Knowledge
  -- version UPDATE/DELETE" is `N N N N N N`, asserted against the live ACLs rather than against the
  -- text of the grants above, because a grant made by a LATER batch would not appear in this file.
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
         and c.relname = 'knowledge_item_versions'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'an immutable knowledge version can be updated or deleted: %', offending
      using hint = '§8.2 marks "Knowledge version UPDATE/DELETE" N for every role including the '
                   'service. The absence of the grant is what makes the refusal a privilege-layer '
                   'denial rather than a policy a later edit can widen.';
  end if;

  -- And the same claim as the policy catalog holds it. Both halves, because either alone can be
  -- satisfied while the other is wrong: a policy with no grant is inert, and a grant with no policy
  -- is denied by RLS instead of by privilege, which is a weaker refusal than immutability asks for.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'knowledge_item_versions'
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'the knowledge version table carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- §8.5, per column, against the live ACL: a knowledge item may not be moved across tenant or
  -- scope by an update, and its type may not be changed at all. The grant above names three columns
  -- and this is what says so about the four it withholds.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['workspace_id', 'business_profile_id',
                                'page_context_profile_id', 'kind']) as col
       where n.nspname = 'app'
         and c.relname = 'knowledge_items'
         and r.rolname in ('authenticated', 'anon', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a scope or type column of app.knowledge_items is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant OR scope with an update, and the '
                   'privilege system is where that is enforced rather than a WITH CHECK a later '
                   'edit could weaken. page_context_profile_id is in that list because it carries '
                   'the second half of the scope. app_worker is excluded on purpose: it holds a '
                   'table-wide grant and no policy, so row level security refuses it entirely.';
  end if;

  -- No role holds DELETE on either table. §8.5 has no broad user delete; the item has archived_at
  -- and a version has no lifecycle at all.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname in ('knowledge_items', 'knowledge_item_versions')
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a knowledge row can be deleted through a granted path: %', offending
      using hint = '§8.5 requires a soft delete through a typed lifecycle field. The item has one — '
                   'archived_at, which §8.2 names in the operation itself — and a version has none, '
                   'because nothing about an immutable row has a lifecycle.';
  end if;

  -- Exactly one RESTRICTIVE policy per table. A permissive policy with the same name and the same
  -- predicate would WIDEN each table instead of narrowing it — every member would see every item
  -- their scope admits OR their membership admits, which is what the SELECT policy already does —
  -- and §12.6/2 would silently stop being implemented here. polpermissive is the one catalog column
  -- that tells the two apart.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('knowledge_items', 'knowledge_item_versions')
     and not pol.polpermissive
     and pol.polname::text <> all (array['knowledge_item_versions_service_path_closed', 'knowledge_items_service_path_closed', 'knowledge_items_updated_by_is_caller']);
  if count_of <> 2 then
    raise exception 'batch 040 wrote % restrictive policies and it creates two tables to narrow', count_of
      using hint = 'One per table. A version row holds what a knowledge item used to say, so a '
                   'narrowing that skipped it would leave the history readable to a member the '
                   'current row is hidden from.';
  end if;

  -- THE ASSERTION THIS BATCH OWES MOST, and it is about the two predicates rather than their count.
  --
  -- The whole design of the scope column is that it is TWO columns, so the item's narrowing must
  -- ask BOTH questions and the version's must resolve them through the item. A narrowing that asked
  -- only `member_scope_admits_business` would leak page-restricted knowledge to every member scoped
  -- to a sibling Page, and it would look exactly like a working policy from the outside.
  --
  -- BOTH CATALOG COLUMNS, AND THAT IS A PROBE'S DOING RATHER THAN CAUTION. `polqual` is USING and
  -- `polwithcheck` is WITH CHECK; they are two predicates, and a reversal that gutted one while
  -- leaving the other intact went UNNOTICED by the first version of this block and by the static
  -- test beside it. A restrictive policy whose USING lost the Page branch filters nothing on read
  -- for a page-scoped member while still refusing their writes — the leak, without the symptom.
  -- Both halves are deparsed as two named columns of one row rather than unpivoted into two rows.
  -- `pg_node_tree` is a system type whose input function refuses a literal, and a VALUES list is
  -- the one construct that might have to prove it can accept one; a plain projection cannot. The
  -- shape below is dull on purpose — this block runs on every apply, and a clever query that fails
  -- to PARSE fails the migration rather than the rule it was checking.
  count_of := 0;
  for probe in
    select c.relname as target,
           pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)      as using_half,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname in ('knowledge_items', 'knowledge_item_versions')
       and not pol.polpermissive
       and pol.polname::text <> all (array['knowledge_item_versions_service_path_closed', 'knowledge_items_service_path_closed', 'knowledge_items_updated_by_is_caller'])
  loop
    count_of := count_of + 1;
    foreach narrowing in array array[probe.using_half, probe.check_half] loop
      if probe.target = 'knowledge_items' then
        if narrowing is null
           or position('member_scope_admits_business' in narrowing) = 0
           or position('member_scope_admits_page' in narrowing) = 0 then
          raise exception 'the knowledge item narrowing does not ask both the Business and the Page question: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = '§4 invariant 3 makes the Page scope a nullable override on a row that '
                         'always carries a Business scope, so the narrowing decides per row which '
                         'question to ask. Dropping the Page branch admits every member scoped to a '
                         'sibling Page — and dropping it from ONE of USING and WITH CHECK hides '
                         'that on the half a test is not looking at.';
        end if;
      else
        if narrowing is null or position('knowledge_items' in narrowing) = 0 then
          raise exception 'the knowledge version narrowing does not resolve through the item: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'The version carries no page column, so its reach is the item''s reach. A '
                         'narrowing that asked about the version''s own columns would ask the '
                         'Business question about the history of a page-restricted item.';
        end if;
      end if;
    end loop;
  end loop;
  if count_of <> 2 then
    raise exception 'batch 040 found % restrictive policies to inspect and there must be two', count_of
      using hint = 'One per table. A table with no narrowing is a table where every active member '
                   'reaches every row their membership admits, which is what batch 020 already '
                   'does and is exactly what this batch exists to narrow.';
  end if;

  -- No policy this batch writes may name a service or anonymous role. §8.2 gives the service `P` on
  -- knowledge operations and anonymous nothing anywhere; a `TO app_worker` policy here would add a
  -- permission the matrix does not grant and would make the service denial unfalsifiable.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('knowledge_items', 'knowledge_item_versions')
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('app_worker', 'app_command', 'app_maintenance', 'anon'));
  if offending is not null then
    raise exception 'batch 040 wrote a policy for a service or anonymous role: %', offending;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 040 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  -- The POLICY COUNT is deliberately not re-asserted here: 021 owns that assertion on the far side
  -- of the batch that could have moved it, and repeating it would be a second home for a number.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('knowledge_items', 'knowledge_item_versions')
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020, 021 and 030 ask
  -- them: scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('knowledge_items', 'knowledge_item_versions')
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 040 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
