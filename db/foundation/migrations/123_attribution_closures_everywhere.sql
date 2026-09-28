-- Batch 123: the updated_by UPDATE closure on all seventeen tables, and decided_by as a pair with decided_at.
--
-- NUMBERED 123 BECAUSE IT MUST SORT AFTER THE NEWEST TABLE IT TOUCHES (app.publish_intents, batch 120)
-- and its closure file 122; a first draft numbered 106 failed on exactly that. A forward fix numbered
-- inside the range it fixes is the 102-105 precedent.
--
-- TWO FORWARD FIXES, one batch, both the Product Owner's (2026-09-28, the one-page decision summary
-- items 2 and 3, "ลุยงานทั้งหมด ตามที่คุณแนะนำ"; disposition in evidence/WP-0A-DB-00/).
--
-- 1. THE TEN TABLES BATCH 105 LEFT TO THEIR PERMISSIVE POLICIES. Seventeen app tables grant
--    `authenticated` UPDATE on updated_by. Batch 105 bound seven of them with a RESTRICTIVE UPDATE
--    closure pinned by exact text. The other ten bind it inside their permissive UPDATE policy,
--    `updated_by = (select auth.uid()) and ...`. All three role runs on 105 (C0 F1, A1 F1, Q0 F2)
--    measured what that leaves open: a later second, looser permissive UPDATE policy, or `or true`
--    added to the permissive one, reopens the forgery while every layer stays green. 105's general
--    rule checks only that the text is present. This batch puts 105's closure on the ten, so no
--    permissive policy can widen the column: a restrictive policy ANDs with whatever admits the row.
--    Nothing that works today is refused, because the ten already require equality. The general
--    rule below now requires the closure itself, restrictive and exact, on every table that grants
--    the column.
--
-- 2. decided_by AT CANCELLATION (A1's review of 105, F2, and Q0's, F1: MEDIUM, predating 105).
--    `approval_requests_decision_has_a_decider` says decisions and deciders go together, as an
--    equivalence: status in (approved, changes_requested) = (decided_at AND decided_by both set).
--    For a cancellation the left side is false, so the right side need only be false: decided_by
--    ALONE passes. A1 measured an editor stamping an approver as the decider while cancelling
--    (`UPDATE 3`). 090's own comment says a decider on a cancellation is refused, which was false,
--    and migration invariant 1 forbids correcting it in place. A second CHECK makes decided_at and
--    decided_by a PAIR, so with the first a cancelled, pending or expired row carries neither. It
--    refuses the forgery at the database for every writer and path, whichever policy admitted the
--    row.

create policy approval_policies_updated_by_on_update_is_caller on app.approval_policies
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy approval_requests_updated_by_on_update_is_caller on app.approval_requests
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy asset_rights_updated_by_on_update_is_caller on app.asset_rights
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy assets_updated_by_on_update_is_caller on app.assets
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy content_ideas_updated_by_on_update_is_caller on app.content_ideas
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy content_items_updated_by_on_update_is_caller on app.content_items
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy content_targets_updated_by_on_update_is_caller on app.content_targets
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy publish_intents_updated_by_on_update_is_caller on app.publish_intents
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy research_runs_updated_by_on_update_is_caller on app.research_runs
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));
create policy research_suggestions_updated_by_on_update_is_caller on app.research_suggestions
  as restrictive for update to authenticated
  with check (updated_by = (select auth.uid()));

alter table app.approval_requests
  add constraint approval_requests_decider_is_a_pair
    check ((decided_at is null) = (decided_by is null));

comment on constraint approval_requests_decider_is_a_pair on app.approval_requests is
  'Batch 123: decided_at and decided_by are set together or not at all. With '
  'approval_requests_decision_has_a_decider, a cancelled, pending or expired request names no '
  'decider. A1 and Q0 measured decided_by forgeable at cancellation before this constraint.';

do $$
declare
  offending text;
  count_of  integer;
begin
  -- THE GENERAL RULE, NOW EXACT. Every app table where authenticated holds UPDATE on updated_by must
  -- carry `<table>_updated_by_on_update_is_caller`: RESTRICTIVE, UPDATE, TO authenticated alone, no
  -- USING, WITH CHECK exactly the caller, with row level security enabled and forced. 105's rule
  -- accepted any UPDATE policy whose text CONTAINED the binding, which is what let a looser
  -- permissive policy reopen the class. This one names the closure that cannot be widened.
  select string_agg(format('app.%s', c.relname), ', ' order by c.relname) into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attname = 'updated_by' and not a.attisdropped
   where n.nspname = 'app' and c.relkind in ('r', 'p')
     and pg_catalog.has_column_privilege('authenticated', c.oid, a.attnum, 'UPDATE')
     and (not (c.relrowsecurity and c.relforcerowsecurity)
          or not exists (
            select 1 from pg_catalog.pg_policy pol
             where pol.polrelid = c.oid
               and pol.polname = c.relname || '_updated_by_on_update_is_caller'
               and not pol.polpermissive and pol.polcmd = 'w' and pol.polqual is null
               and pol.polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]::oid[]
               and pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) = '(updated_by = ( SELECT auth.uid() AS uid))'));
  if offending is not null then
    raise exception 'updated_by is client-updatable without batch 105''s exact restrictive UPDATE closure, or with row level security not enabled and forced: %', offending
      using hint = 'Add <table>_updated_by_on_update_is_caller in batch 105''s shape in the batch that grants the column, '
                   'or keep updated_by out of the UPDATE grant.';
  end if;

  -- The seventeen, counted, so a table that silently stops granting the column is noticed too.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
   where pol.polname like '%\_updated\_by\_on\_update\_is\_caller' escape '\';
  if count_of <> 17 then
    raise exception 'there are % updated_by UPDATE closures by name; 105 wrote seven and 123 ten', count_of;
  end if;

  -- THE PAIR, by definition text.
  if not exists (
       select 1 from pg_catalog.pg_constraint con
        where con.conrelid = 'app.approval_requests'::regclass and con.contype = 'c'
          and con.conname = 'approval_requests_decider_is_a_pair' and con.convalidated
          and pg_catalog.pg_get_constraintdef(con.oid) = 'CHECK (((decided_at IS NULL) = (decided_by IS NULL)))') then
    raise exception 'batch 123''s approval_requests_decider_is_a_pair is missing, unvalidated or not in its required shape';
  end if;
end $$;
