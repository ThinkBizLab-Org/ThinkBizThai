-- Batch 105: updated_by, when a client writes it at UPDATE, is the caller, on the seven tables where it was not.
--
-- A FORWARD FIX (blocker 189; A1's security review of the catalog-rule probes, 2026-09-27, F1,
-- MEDIUM, pre-existing). Seventeen app tables grant `authenticated` UPDATE on `updated_by`. Ten of
-- them bind it in their permissive UPDATE policy, `updated_by = (select auth.uid()) and ...`. The
-- seven below bind it nowhere. So an owner could UPDATE a row naming ANOTHER member as its last
-- updater, and A1 measured `UPDATE 1` on all seven on the clean migration set. No tenant boundary is
-- crossed. What is forged is the attribution an audit reads.
--
-- 102_updated_by_is_caller.sql line 6 says the column "is checked on UPDATE everywhere". That was
-- false for these seven, and migration invariant 1 forbids correcting the sentence in place. This
-- batch makes it true instead.
--
-- THE SHAPE, AND WHY IT IS THIS ONE (the Owner chose remedy (a) on 2026-09-27; plan and disposition
-- in evidence/WP-0A-DB-00/). A RESTRICTIVE UPDATE policy per table, TO authenticated, WITH CHECK
-- `updated_by = (select auth.uid())`, and no USING:
--   * Restrictive, so it ANDs with whatever permissive UPDATE policy already admits the caller and
--     narrows nothing else. Rewriting the permissive policies would have meant dropping and
--     recreating them, which touches seven batches' policies to change one clause.
--   * Equality, not `is null or =`. On UPDATE the ten bound tables already require equality, so
--     every client UPDATE on every one of the seventeen now names its caller. 102 admits NULL at
--     INSERT because a row may be created unattributed; an UPDATE is always somebody's.
--   * No USING. Which rows a caller may reach stays the business of the policies that already
--     decide it. This policy judges only the row as written.
--
-- The alternative, remedy (b), was to remove updated_by from the client UPDATE grant and have the
-- database maintain it, as 093 does for updated_at. It would leave these seven tables with a
-- different rule from the other ten. It is recorded as a possible later change covering all
-- seventeen, not done here.

create policy business_profiles_updated_by_on_update_is_caller on app.business_profiles
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy industry_assignments_updated_by_on_update_is_caller on app.industry_assignments
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy knowledge_items_updated_by_on_update_is_caller on app.knowledge_items
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy page_context_profiles_updated_by_on_update_is_caller on app.page_context_profiles
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy workspace_invitations_updated_by_on_update_is_caller on app.workspace_invitations
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy workspace_settings_updated_by_on_update_is_caller on app.workspace_settings
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy workspaces_updated_by_on_update_is_caller on app.workspaces
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));

-- THE APPLY-TIME ASSERTIONS. The post-migrate pass re-runs this block after the whole set, and the
-- closure-text probe in migrate-clean pins the seven policies' exact text on their exact tables.
do $$
declare
  offending text;
  count_of  integer;
begin
  -- The seven, each RESTRICTIVE, UPDATE, TO authenticated alone, no USING, and WITH CHECK exactly
  -- the caller.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and pol.polname = c.relname || '_updated_by_on_update_is_caller'
     and c.relname = any (array['business_profiles', 'industry_assignments', 'knowledge_items', 'page_context_profiles',
                                'workspace_invitations', 'workspace_settings', 'workspaces'])
     and not pol.polpermissive and pol.polcmd = 'w' and pol.polqual is null
     and pol.polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]::oid[]
     and pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) = '(updated_by = ( SELECT auth.uid() AS uid))';
  if count_of <> 7 then
    raise exception 'batch 105 finds % of its seven updated_by UPDATE closures in their required shape', count_of;
  end if;

  -- THE GENERAL RULE, over the whole schema: no app table lets authenticated UPDATE updated_by unless
  -- some UPDATE policy for authenticated (FOR UPDATE or FOR ALL, permissive or restrictive) has a WITH
  -- CHECK CONTAINING `updated_by = auth.uid()`. WHAT IT DOES NOT PROVE, measured by C0's review of this
  -- batch: that the clause BINDS. A later second, looser permissive UPDATE policy, or `... or true`
  -- added to a permissive one, keeps the text and reopens the forgery on the ten tables whose binding
  -- is permissive. It catches a NEW table granted the column with no binding at all. The seven tables
  -- above are held by exact text, restrictive, in the closure-text probe; the ten are an open item on
  -- the name-or-token blocker.
  select string_agg(format('app.%s', c.relname), ', ' order by c.relname) into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attname = 'updated_by' and not a.attisdropped
   where n.nspname = 'app' and c.relkind in ('r', 'p')
     and pg_catalog.has_column_privilege('authenticated', c.oid, a.attnum, 'UPDATE')
     -- A policy binds nothing on a table whose row level security is off or unforced, and a
     -- partitioned table is still a table (Q0's test of this batch measured both passing).
     and (not (c.relrowsecurity and c.relforcerowsecurity)
          or not exists (
       select 1 from pg_catalog.pg_policy pol
        where pol.polrelid = c.oid and pol.polcmd in ('w', '*')
          and (select oid from pg_catalog.pg_roles where rolname = 'authenticated') = any (pol.polroles)
          and position('(updated_by = ( SELECT auth.uid() AS uid))' in coalesce(pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid), '')) > 0));
  if offending is not null then
    raise exception 'updated_by is client-updatable and no UPDATE policy for authenticated even names updated_by = auth.uid(), or row level security is not enabled and forced: %', offending
      using hint = 'Bind it in the batch that grants the column, in batch 105''s shape, or keep updated_by out of '
                   'the UPDATE grant. A1 measured this class forgeable on seven tables before 105.';
  end if;
end $$;
