-- Batch 102 — updated_by, when a client writes it at INSERT, is the caller.
--
-- Owner: A0 Integration / DB-00. A forward fix for the LOW siblings of A1-090 S13: on thirteen
-- client-writable tables `updated_by` sits in the INSERT grant to `authenticated`, every one of
-- their INSERT policies checks `created_by = auth.uid()` and the role, and none checks
-- `updated_by`. It is checked on UPDATE everywhere (§8.5's user-action rule), so the one statement
-- that could write somebody else's name into the column was the INSERT -- and a row's first
-- updated_by is the value an audit reads until the first real update overwrites it.
--
-- The tables, measured on 2026-09-15 by reading every `grant insert (...)` in the migration set
-- against every INSERT policy's WITH CHECK: workspace_invitations (010), business_profiles and
-- page_context_profiles (020), workspace_member_scopes (021), industry_assignments (030),
-- knowledge_items (040), content_ideas and content_items (080), content_targets (081),
-- approval_policies and approval_requests (090), assets and asset_rights (100). Batch 094 closed
-- the same shape for requested_by on one table; this batch closes updated_by on all thirteen with
-- the same instrument: one RESTRICTIVE, INSERT-only, TO authenticated policy per table, ANDed with
-- the table's permissive INSERT policy, widening nothing.
--
-- NULL IS ADMITTED, AND THAT IS THE ONE PLACE THIS BATCH DIFFERS FROM 094. updated_by is nullable
-- on all thirteen tables, and a row that has never been updated has no updater: created_by carries
-- the attribution at INSERT. So the predicate is `updated_by is null or updated_by = auth.uid()` --
-- a client may leave it empty, or name itself, and may not name anybody else. 094 refused a NULL
-- requested_by because a request with no requester is a request nobody can attribute; a row with
-- no updater is a row that was never updated, which is true.
--
-- WHAT IT ASSERTS, AND THE ASSERTION IS GENERAL: after this batch, every table in `app` on which
-- `authenticated` holds INSERT on a column named updated_by carries at least one INSERT policy for
-- `authenticated` whose WITH CHECK names updated_by beside auth.uid(). Asked of pg_policy and the
-- live ACL over the whole schema, not of the thirteen names, so the next batch that repeats the
-- shape fails here at apply time, by name.

create policy workspace_invitations_updated_by_is_caller on app.workspace_invitations
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));
create policy business_profiles_updated_by_is_caller on app.business_profiles
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));
create policy page_context_profiles_updated_by_is_caller on app.page_context_profiles
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));
create policy workspace_member_scopes_updated_by_is_caller on app.workspace_member_scopes
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));
create policy industry_assignments_updated_by_is_caller on app.industry_assignments
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));
create policy knowledge_items_updated_by_is_caller on app.knowledge_items
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));
create policy content_ideas_updated_by_is_caller on app.content_ideas
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));
create policy content_items_updated_by_is_caller on app.content_items
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));
create policy content_targets_updated_by_is_caller on app.content_targets
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));
create policy approval_policies_updated_by_is_caller on app.approval_policies
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));
create policy approval_requests_updated_by_is_caller on app.approval_requests
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));
create policy assets_updated_by_is_caller on app.assets
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));
create policy asset_rights_updated_by_is_caller on app.asset_rights
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));

do $$
declare
  offending text;
  count_of  integer;
begin
  -- The thirteen this batch names, each a RESTRICTIVE INSERT policy whose WITH CHECK names
  -- updated_by beside auth.uid().
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and pol.polname like '%\_updated\_by\_is\_caller' escape '\'
     and not pol.polpermissive and pol.polcmd = 'a'
     and position('updated_by' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) > 0
     and position('auth.uid' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) > 0;
  if count_of <> 13 then
    raise exception 'batch 102 finds % updated_by closures with the required shape and there must be thirteen', count_of;
  end if;

  -- THE GENERAL RULE, over the whole schema: no app table lets authenticated INSERT updated_by
  -- without an INSERT policy for authenticated that names the column beside auth.uid().
  select string_agg(format('app.%s', c.relname), ', ' order by c.relname) into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attname = 'updated_by' and not a.attisdropped
   where n.nspname = 'app' and c.relkind = 'r'
     and pg_catalog.has_column_privilege('authenticated', c.oid, a.attnum, 'INSERT')
     and not exists (
       select 1 from pg_catalog.pg_policy pol
        where pol.polrelid = c.oid and pol.polcmd = 'a'
          and (select oid from pg_catalog.pg_roles where rolname = 'authenticated') = any (pol.polroles)
          and position('updated_by' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) > 0
          and position('auth.uid' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) > 0);
  if offending is not null then
    raise exception 'updated_by is client-insertable and no INSERT policy binds it to the caller: %', offending
      using hint = 'Add the restrictive INSERT policy in the batch that grants the column, in batch 095''s '
                   'shape, or keep updated_by out of the INSERT grant. A1-090 S13 found requested_by this way; '
                   'its LOW siblings were this column on thirteen tables.';
  end if;
end $$;
