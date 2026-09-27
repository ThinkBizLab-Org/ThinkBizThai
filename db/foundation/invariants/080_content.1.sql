do $$
declare
  offending text;
  count_of  integer;
  narrowing text;
  probe     record;
  every_role constant text[] :=
    array['authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz'];
  content_tables constant text[] :=
    array['content_ideas', 'content_items', 'content_versions', 'content_variants',
          'quality_reviews'];
  -- §8.2 row 3 — "Approved/published version UPDATE/DELETE | N N N N N | N" — the one row in §8
  -- that is `N` in every column including Service.
  immutable_tables constant text[] :=
    array['content_versions', 'content_variants', 'quality_reviews'];
begin
  -- SUPERSEDED BY 082, 102. Batch 080 wrote one restrictive narrowing per table. The later files
  -- added restrictive policies to the same tables: content_ideas_service_path_closed (082), content_ideas_updated_by_is_caller (102), content_items_service_path_closed (082), content_items_updated_by_is_caller (102), content_variants_service_path_closed (082), content_versions_service_path_closed (082), quality_reviews_service_path_closed (082).
  -- Each of those is asserted by its own batch's block, which this pass also re-runs. The final-state
  -- form below pins every table's restrictive set by name, then excludes the later names from the 2
  -- restrictive predicates of 080's original assertions, which are otherwise kept word for word.
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.content_ideas'::regclass and not pol.polpermissive)
     is distinct from array['content_ideas_scope_narrowing', 'content_ideas_service_path_closed', 'content_ideas_updated_by_is_caller'] then
    raise exception 'app.content_ideas restrictive policies are not exactly batch 080''s narrowing and the ones 082, 102 added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.content_items'::regclass and not pol.polpermissive)
     is distinct from array['content_items_scope_narrowing', 'content_items_service_path_closed', 'content_items_updated_by_is_caller'] then
    raise exception 'app.content_items restrictive policies are not exactly batch 080''s narrowing and the ones 082, 102 added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.content_variants'::regclass and not pol.polpermissive)
     is distinct from array['content_variants_scope_narrowing', 'content_variants_service_path_closed'] then
    raise exception 'app.content_variants restrictive policies are not exactly batch 080''s narrowing and the ones 082 added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.content_versions'::regclass and not pol.polpermissive)
     is distinct from array['content_versions_scope_narrowing', 'content_versions_service_path_closed'] then
    raise exception 'app.content_versions restrictive policies are not exactly batch 080''s narrowing and the ones 082 added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.quality_reviews'::regclass and not pol.polpermissive)
     is distinct from array['quality_reviews_scope_narrowing', 'quality_reviews_service_path_closed'] then
    raise exception 'app.quality_reviews restrictive policies are not exactly batch 080''s narrowing and the ones 082 added';
  end if;
  -- ENABLE AND FORCE ON ALL FIVE. They are DIFFERENT CATALOG COLUMNS and the data package's own
  -- lint rule reads only the first (RFC-2026-016 §4). Without FORCE the table owner is exempt from
  -- every policy, and the owner is the role migrations run as.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending;
  end if;

  -- IMMUTABILITY AS THE PRIVILEGE SYSTEM HOLDS IT, which is the first half of the claim the header
  -- makes. Asserted against the live ACLs rather than against the grant list above, because a grant
  -- made by a LATER batch would not appear in this file at all — and because the control here is an
  -- ABSENCE, which is exactly the kind of thing a file cannot show about itself.
  --
  -- `has_any_column_privilege` for INSERT and UPDATE so a column-scoped grant is caught as well as a
  -- table-wide one (070's measured trap: a full set of column grants leaves `has_table_privilege`
  -- false); DELETE has no column-level form and is asked of the table.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname::text = any (immutable_tables)
         and r.rolname::text = any (every_role)
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
              or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'a version, variant or quality review can be written through a granted path: %', offending
      using hint = '§8.2 row 3 is `N` for owner, admin, editor, approver, viewer AND service, which '
                   'no other row in §8 is. The refusal is a grant that was never made rather than a '
                   'policy that says no, because a grant has to be WRITTEN to be undone while a '
                   'policy predicate can be widened by an edit.';
  end if;

  -- AND THE SAME CLAIM AS THE POLICY CATALOG HOLDS IT, which is the "both ways" the header promises.
  -- Either half alone can be satisfied while the other is wrong: a policy with no grant is inert,
  -- and a grant with no policy is refused by row level security rather than by privilege — a weaker
  -- refusal than immutability asks for. `a` is INSERT, `w` is UPDATE, `d` is DELETE; `*` is the
  -- restrictive FOR ALL narrowing and is deliberately not in this list.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (immutable_tables)
     and pol.polcmd in ('a', 'w', 'd');
  if offending is not null then
    raise exception 'an immutable content table carries an INSERT, UPDATE or DELETE policy: %', offending
      using hint = 'A write policy on one of these three would be this batch deciding that §8.2 row '
                   '3 has an exception. It does not: the version a client sees is the one the '
                   'generation produced, and the act that produces it is a command function that '
                   'does not exist yet (RFC-2026-021 §10).';
  end if;

  -- §4.6's "ห้าม client update status อิสระ" AND §8.5's rule against moving a row across tenant or
  -- scope with an update, PER COLUMN, against the live ACL. The two client UPDATE grants above name
  -- ten columns between them and this is what says so about the rest.
  --
  -- `status` is the column this batch is most often going to be read wrong on: §8.2 marks "Content
  -- create/edit/version" `Y` for three roles, so a reader expects a client to be able to move a
  -- draft to approved. It cannot, and the refusal is a missing privilege rather than a policy
  -- clause. `current_version_id` is beside it for the same reason: which version is CURRENT is the
  -- act of publishing one.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id',
                                'page_context_profile_id', 'content_type', 'status',
                                'current_version_id', 'created_by', 'created_at']) as col
       where n.nspname = 'app'
         and c.relname = 'content_items'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id',
                                'page_context_profile_id', 'research_suggestion_id',
                                'client_request_id', 'created_by', 'created_at']) as col
       where n.nspname = 'app'
         and c.relname = 'content_ideas'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity, scope, state or provenance column of a batch 080 table is updatable: %', offending
      using hint = '§4.6: "state change ผ่าน domain command; ห้าม client update status อิสระ". §8.5: '
                   'a row may not be moved across tenant OR scope by an update. '
                   '`client_request_id` is in this list because it is the idempotency key §4.6 asks '
                   'for, and a key a client can rewrite after the fact identifies nothing.';
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE FIVE. §8.5 has no broad user delete; `content_items` carries
  -- `deleted_at` for the soft delete it does have, and hard removal in this family is batch 160's
  -- retention sweep through app_maintenance, which this batch grants nothing.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname::text = any (content_tables)
         and r.rolname::text = any (every_role)
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a content row can be deleted through a granted path: %', offending;
  end if;

  -- app_worker HOLDS NOTHING HERE, AND THAT IS THIS BATCH'S ONE DEPARTURE FROM 070's SHAPE.
  -- Batch 070 grants its worker select, insert and update and lets row level security refuse it,
  -- which is the "grants and no policy" shape batch 010 introduced. Content does not, because the
  -- writer this family needs is not a worker with grants: §8.2 row 3 forbids a version being
  -- updated by anyone at all, and the act that CREATES one is a SECURITY DEFINER command function
  -- owned by `app_command`, which is exempt from these policies by being the owner rather than by
  -- holding a privilege (RFC-2026-017 §3). Granting app_worker a write here would be building the
  -- second path to the same act — the shape RFC-2026-018 was superseded for proposing.
  --
  -- The cost is stated rather than discovered: while no such function exists, NOTHING in this
  -- repository can write a content row, and the isolation suite's service cases are refused at the
  -- PRIVILEGE layer rather than by row level security, which is a different claim from batch 070's
  -- and is labelled as one in tests/db/identity/isolation-cases.mjs.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and (pg_catalog.has_any_column_privilege('app_worker', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('app_worker', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'app_worker holds a privilege on app.%, and batch 080 grants it none', offending;
  end if;

  -- `anon` holds nothing on anything this batch creates. RFC-2026-021 §7/4 decided that as a
  -- NEGATIVE, and it is the one client-role property no approved decision is expected to move.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on app.%, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- NO POLICY ON THESE FIVE NAMES ANY ROLE BUT `authenticated`, AND THE SERVICE HALF OF THAT IS A
  -- DECISION RATHER THAN AN OMISSION. RFC-2026-022 §3 carries a service policy for a cell the §8
  -- matrix marks `S`. Content has no `S` cell anywhere — its Service column is `P`, and a `P` with
  -- no capability defined is not an `S` — so db/foundation/lint/service-policy-map.json gets no
  -- entry from this batch and no policy here may name a service role. Batch 070 deliberately left
  -- app_worker OUT of its equivalent assertion because it expects a policy once RFC-2026-022 is in
  -- effect; this batch expects none, so the assertion is wider here for a stated reason.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('anon', 'app_worker', 'app_command', 'app_maintenance',
                                      'app_authz'));
  if offending is not null then
    raise exception 'batch 080 left a policy for a role that is not authenticated: %', offending;
  end if;

  -- ONE UNTYPED VARIANT PER PLATFORM IS LEGAL AND TWO ARE NOT, which is the second claim the header
  -- makes about a live catalog. `indnullsnotdistinct` is the flag that decides it, and the two
  -- spellings differ by three words: under the Postgres DEFAULT the null does not participate in
  -- the key and an unbounded number of untyped variants per platform is accepted, which is
  -- precisely the rule §4.6 asks for not holding.
  select count(*) into count_of
    from pg_catalog.pg_index ix
    join pg_catalog.pg_class ic on ic.oid = ix.indexrelid
    join pg_catalog.pg_class c  on c.oid = ix.indrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_variants'
     and ic.relname = 'content_variants_logical_key'
     and ix.indisunique
     and ix.indnullsnotdistinct;
  if count_of <> 1 then
    raise exception 'the content variant logical key does not treat a null variant_type as part of the key'
      using hint = '§4.6 asks for a "unique logical variant key ต่อ content version/platform". With '
                   'NULLS DISTINCT — the default — two untyped variants of one version on one '
                   'platform are both accepted and the key bounds nothing where it matters most.';
  end if;

  -- FIVE RESTRICTIVE NARROWINGS, ONE PER TABLE. `polpermissive` is the one catalog column that
  -- tells a narrowing from a widening: a PERMISSIVE policy with the same name and the same
  -- predicate would WIDEN each table instead of narrowing it, and §12.6/2 would silently stop being
  -- implemented here.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and not pol.polpermissive
     and pol.polname::text <> all (array['content_ideas_service_path_closed', 'content_ideas_updated_by_is_caller', 'content_items_service_path_closed', 'content_items_updated_by_is_caller', 'content_variants_service_path_closed', 'content_versions_service_path_closed', 'quality_reviews_service_path_closed']);
  if count_of <> 5 then
    raise exception 'batch 080 wrote % restrictive policies and it creates five tables to narrow', count_of;
  end if;

  -- AND THE ASSERTION THIS BATCH OWES MOST, which is about the five PREDICATES rather than their
  -- count, and about BOTH CATALOG COLUMNS rather than one. `polqual` is USING and `polwithcheck` is
  -- WITH CHECK; 040's probe found that a reversal gutting one while leaving the other intact goes
  -- unnoticed by a test that looks at one of them — a narrowing whose USING lost the Page branch
  -- filters nothing on read for a page-scoped member while still refusing their writes: the leak
  -- without the symptom.
  count_of := 0;
  for probe in
    select c.relname as target,
           pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)      as using_half,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname::text = any (content_tables)
       and not pol.polpermissive
       and pol.polname::text <> all (array['content_ideas_service_path_closed', 'content_ideas_updated_by_is_caller', 'content_items_service_path_closed', 'content_items_updated_by_is_caller', 'content_variants_service_path_closed', 'content_versions_service_path_closed', 'quality_reviews_service_path_closed'])
  loop
    count_of := count_of + 1;
    foreach narrowing in array array[probe.using_half, probe.check_half] loop
      if probe.target in ('content_ideas', 'content_items') then
        if narrowing is null
           or position('member_scope_admits_business' in narrowing) = 0
           or position('member_scope_admits_page' in narrowing) = 0 then
          raise exception 'the % narrowing does not ask both the Business and the Page question: %',
            probe.target, coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = '§4 invariant 3 makes the Page scope a nullable override on a row that '
                         'always carries a Business scope, so the narrowing decides per row which '
                         'question to ask. Dropping the Page branch admits every member scoped to a '
                         'sibling Page.';
        end if;
      elsif probe.target = 'content_versions' then
        if narrowing is null or position('content_items' in narrowing) = 0 then
          raise exception 'the content version narrowing does not resolve through its item: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'A version carries no page column, so its reach is its item''s reach. A '
                         'narrowing that asked about the version''s own columns would ask the '
                         'Business question about the history of a page-restricted item.';
        end if;
      else
        if narrowing is null or position('content_versions' in narrowing) = 0 then
          raise exception 'the % narrowing does not resolve through its version: %', probe.target,
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'A variant and a quality review each hang off a version, which hangs off '
                         'the item that carries the page. The chain is asserted rather than copied, '
                         'because a nullable copy of the item''s page could not be held equal to it '
                         'by any foreign key — MATCH SIMPLE skips a null.';
        end if;
      end if;
    end loop;
  end loop;
  if count_of <> 5 then
    raise exception 'batch 080 found % restrictive policies to inspect and there must be five', count_of;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 080 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason every batch since 020 asks
  -- them: scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  -- It matters more here than in most batches, because the writer this family is waiting for is a
  -- SECURITY DEFINER function owned by app_command: if app_command also owned the table, that
  -- function would be exempt from the policies above by ownership and the narrowings would bound
  -- nothing it does.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 080 creates is owned by a role that must not own one: %', offending;
  end if;
end $$;
