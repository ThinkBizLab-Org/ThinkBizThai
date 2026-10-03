-- Batch 127: created_by, when a client writes it at INSERT, is the caller, by a closure no permissive
-- policy can widen.
--
-- A FORWARD FIX (blocker 186, "THE SAME CLASS REMAINS AT INSERT FOR created_by" and "BATCH 091 ADDS TWO
-- TABLES TO THE created_by CLASS"; A1's review of batch 123, F5; A1's review of batch 091, F3). Nineteen
-- app tables grant `authenticated` INSERT on created_by, measured from the catalog on 2026-10-03 on the
-- clean migration set through 126: approval_policies, approval_requests, asset_rights, assets,
-- business_profile_versions, business_profiles, calendar_items, content_ideas, content_items,
-- content_schedules, content_targets, industry_assignments, knowledge_item_versions, knowledge_items,
-- page_context_profile_versions, page_context_profiles, publish_intents, workspace_invitations and
-- workspace_member_scopes. On every one of them created_by is bound ONLY inside a permissive INSERT
-- policy -- twenty-four of them, each opening `created_by = (select auth.uid()) and ...`. So a later
-- second, looser permissive INSERT policy, or `or true` added to one of the twenty-four, reopens
-- created_by forgery while every layer stays green: the text is still there, and nothing restrictive
-- holds the column. updated_by and requested_by at INSERT are already held by restrictive closures
-- pinned by text (102, 094/120); created_by was the one attribution column at INSERT that was not.
--
-- THE SHAPE IS 102's, and the predicate is 105's. One RESTRICTIVE, INSERT-only, TO authenticated
-- policy per table, no USING (an INSERT policy has none), WITH CHECK `created_by = (select auth.uid())`.
--   * Restrictive, so it ANDs with whatever permissive INSERT policy admits the row and narrows
--     nothing else.
--   * Equality, not 102's `is null or =`. Every one of the twenty-four permissive policies already
--     requires equality, so a NULL created_by is refused today and this refuses nothing that works.
--     102 admits a NULL updated_by because a row that was never updated has no updater; a row that
--     was created always has a creator.
--   * Named `<table>_created_by_is_caller`, as 102 names `<table>_updated_by_is_caller`: the INSERT
--     closure carries the column's name alone, the UPDATE closure carries `_on_update_`.
--
-- NUMBERED 127 because it must sort after the newest table it touches (app.publish_intents, 120) and
-- after 126. 127 is inside MOD-120's reserved 115-129 range, as 126 is; the Owner answered that
-- question (O1) for 126 only.

create policy approval_policies_created_by_is_caller on app.approval_policies
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy approval_requests_created_by_is_caller on app.approval_requests
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy asset_rights_created_by_is_caller on app.asset_rights
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy assets_created_by_is_caller on app.assets
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy business_profile_versions_created_by_is_caller on app.business_profile_versions
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy business_profiles_created_by_is_caller on app.business_profiles
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy calendar_items_created_by_is_caller on app.calendar_items
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy content_ideas_created_by_is_caller on app.content_ideas
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy content_items_created_by_is_caller on app.content_items
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy content_schedules_created_by_is_caller on app.content_schedules
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy content_targets_created_by_is_caller on app.content_targets
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy industry_assignments_created_by_is_caller on app.industry_assignments
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy knowledge_item_versions_created_by_is_caller on app.knowledge_item_versions
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy knowledge_items_created_by_is_caller on app.knowledge_items
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy page_context_profile_versions_created_by_is_caller on app.page_context_profile_versions
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy page_context_profiles_created_by_is_caller on app.page_context_profiles
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy publish_intents_created_by_is_caller on app.publish_intents
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy workspace_invitations_created_by_is_caller on app.workspace_invitations
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy workspace_member_scopes_created_by_is_caller on app.workspace_member_scopes
  as restrictive for insert to authenticated
  with check (created_by = (select auth.uid()));

-- THE APPLY-TIME ASSERTION. The post-migrate pass re-runs this block after the whole set, and the
-- closure-text probe in migrate-clean pins the nineteen policies' exact text on their exact tables.
do $$
declare
  offending text;
begin
  -- THE GENERAL RULE, EXACT FROM BIRTH (123's lesson): every app table where authenticated holds INSERT
  -- on created_by must carry `<table>_created_by_is_caller`: RESTRICTIVE, INSERT, TO authenticated
  -- alone, no USING, WITH CHECK exactly the caller, with row level security enabled and forced. A rule
  -- that accepted any INSERT policy CONTAINING the binding is what let a looser permissive policy
  -- reopen the class on UPDATE. No fixed count: a later table that grants created_by fails here by
  -- name until it carries the closure, and the probe's pinned list is where the count is kept.
  select string_agg(format('app.%s', c.relname), ', ' order by c.relname) into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attname = 'created_by' and not a.attisdropped
   where n.nspname = 'app' and c.relkind in ('r', 'p')
     and pg_catalog.has_column_privilege('authenticated', c.oid, a.attnum, 'INSERT')
     and (not (c.relrowsecurity and c.relforcerowsecurity)
          or not exists (
            select 1 from pg_catalog.pg_policy pol
             where pol.polrelid = c.oid
               and pol.polname = c.relname || '_created_by_is_caller'
               and not pol.polpermissive and pol.polcmd = 'a' and pol.polqual is null
               and pol.polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]::oid[]
               and pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) = '(created_by = ( SELECT auth.uid() AS uid))'));
  if offending is not null then
    raise exception 'created_by is client-insertable without batch 127''s exact restrictive INSERT closure, or with row level security not enabled and forced: %', offending
      using hint = 'Add <table>_created_by_is_caller in batch 127''s shape in the batch that grants the column, '
                   'or keep created_by out of the INSERT grant.';
  end if;
end $$;
