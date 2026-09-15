-- Batch 122 — the publisher family's service path is closed on its two tables that have no S cell,
-- by a policy that names every role.
--
-- Owner: A0 Integration / DB-00. The Product Owner's decision of 2026-09-15 on batch 120's question 11
-- (evidence/WP-0A-DB-00/product-owner-disposition-2026-09-15-batch-120.md): a NEW decision for this
-- family, not an application of the row (b) the Owner gave metering and research on the same day --
-- that answer named quota_buckets and research_suggestions and no other table, and its record says
-- so. The LOGIC is the one 062 and 071 applied: close the narrowed tables that are not S-cell tables,
-- and leave the S-cell tables open so that the CARRIED policy RFC-2026-022 §7 will one day put beside
-- their narrowings is not pre-empted by a closure that would have to be amended first.
--
-- READ 082_content_service_path_closed.sql FIRST. Everything it says holds here unchanged: the five
-- narrowings batch 120 writes are `for all to authenticated` and bind no service role; the three
-- repairs RFC-2026-017 §4 forbids are not taken; naming app_command in a narrowing that uses the
-- member-scope helpers is vacuous (021_member_scope.sql:389-400); shape B is the acting-user
-- narrowing (RFC-2026-023, In review) and is not written here. This file is deliberately a copy of
-- 082's shape rather than a variation, and a static rule holds every *_service_path_closed.sql to it.
--
-- TWO TABLES AND NOT FIVE. app.publish_intents has no S cell: its Service column is `P`, the worker
-- holds SELECT and no policy, and nothing in RFC-2026-022 §3 expects a service policy there.
-- app.publish_target_assets has no §8 cell at all -- the matrix's S cell names the delivery, the post
-- and the metric -- so it has no service-policy-map row and no expected policy either; the worker
-- holds SELECT and INSERT there with no policy, which is exactly research_suggestions' shape on the
-- day 071 closed it. app.publish_targets, app.publish_jobs and app.published_posts ARE the S cell,
-- classified CARRIED in db/foundation/lint/service-policy-map.json, and stay open by name: their
-- closure lands beside the amendment that admits the worker, when RFC-2026-022 §7 holds.
--
-- WHY A SEPARATE FILE: the suite keys closures on the file name (`NNN_*_service_path_closed.sql`) and
-- batch 120's own apply-time block asserts that every policy it wrote is TO authenticated alone; a
-- closure written into 120 would trip both. 122 is the next free number after 121 (metrics).
--
-- WHAT THIS CHANGES TODAY, STATED EXACTLY RATHER THAN AS "NOTHING". On neither table is the
-- observable outcome different, because no permissive policy on either names a role other than
-- `authenticated` -- but "no role but authenticated holds a privilege here" is FALSE of both, and
-- saying it would have been the sentence a later reader reasoned from. Batch 120 grants app_worker
-- SELECT on app.publish_intents (it has to read an intent to fan it out) and SELECT and INSERT on
-- app.publish_target_assets. Those grants stand; this closure is what refuses them, where before an
-- empty policy set did. The assertions below therefore check that each role holds EXACTLY what
-- batch 120 gave it and nothing more, rather than that it holds nothing.
--
-- AND THE CONSEQUENCE IS NAMED BECAUSE IT IS NOT SMALL. Closing app.publish_intents makes the
-- worker's READ of an intent a PERMANENT refusal rather than a pending one -- and that read is the
-- first step of the fan-out §8.3 marks `S` on app.publish_targets, which this file deliberately
-- leaves open. So the day RFC-2026-022 §7 holds and a CARRIED policy lands on the send, the worker
-- will still not be able to reach the intent the send belongs to unless a batch amends THIS policy
-- beside it. That is the same amendment shape B already owes every closure, it is what a closure is
-- FOR -- the first service reader arrives in a diff a reviewer reads rather than silently -- and it
-- is recorded in the work package's open blockers rather than discovered by whoever writes the
-- worker. It compounds a finding batch 120 measured and recorded: app_worker cannot read
-- app.content_targets or app.content_variants either, so the statement that cell classifies CARRIED
-- cannot be composed by the service as this schema stands, closure or no closure.

create policy publish_intents_service_path_closed on app.publish_intents
  as restrictive
  for all
  using (current_user = 'authenticated')
  with check (current_user = 'authenticated');

comment on policy publish_intents_service_path_closed on app.publish_intents is
  'Batch 122, shape C (batch 082) for the S8 shape in batch 120: every role that is not authenticated is '
  'refused every row until a batch amends this policy beside a narrowing that binds the acting user (shape B, RFC owed).';

create policy publish_target_assets_service_path_closed on app.publish_target_assets
  as restrictive
  for all
  using (current_user = 'authenticated')
  with check (current_user = 'authenticated');

comment on policy publish_target_assets_service_path_closed on app.publish_target_assets is
  'Batch 122, shape C (batch 082) on a table with no §8 cell: every role that is not authenticated is '
  'refused every row, permanently unless a later RFC gives the pin a service cell; app_worker''s INSERT grant stands and is refused here.';

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED — 082's four claims
-- ============================================================================================
do $$
declare
  offending  text;
  count_of   integer;
  probe      record;
  closed_tables constant text[] := array['publish_intents', 'publish_target_assets'];
  service_roles constant text[] :=
    array['anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz'];
begin
  -- 1. ONE CLOSURE PER TABLE, RESTRICTIVE, FOR ALL, TO PUBLIC, BOTH HALVES, BOTH READING current_user.
  count_of := 0;
  for probe in
    select c.relname as target, pol.polname, pol.polpermissive, pol.polcmd, pol.polroles,
           lower(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid))      as using_half,
           lower(pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname::text = any (closed_tables)
       and pol.polname like '%\_service\_path\_closed' escape '\'
  loop
    count_of := count_of + 1;
    if probe.polpermissive then
      raise exception '% on app.% is PERMISSIVE, and a permissive closure widens instead of closing', probe.polname, probe.target;
    end if;
    if probe.polcmd <> '*' then
      raise exception '% on app.% is not FOR ALL (polcmd = %)', probe.polname, probe.target, probe.polcmd;
    end if;
    if probe.polroles <> '{0}'::oid[] then
      raise exception '% on app.% names a list of roles rather than PUBLIC, and binds only that list', probe.polname, probe.target;
    end if;
    if probe.using_half is null or probe.check_half is null or probe.using_half <> probe.check_half then
      raise exception '% on app.% is missing a half or its halves differ', probe.polname, probe.target;
    end if;
    if position('current_user' in probe.using_half) = 0
       or position('authenticated' in probe.using_half) = 0 then
      raise exception '% on app.% does not compare current_user with authenticated: %', probe.polname, probe.target, probe.using_half;
    end if;
  end loop;
  if count_of <> 2 then
    raise exception 'batch 122 finds % service-path closures and there must be one per table, 2', count_of;
  end if;

  -- 2. THE GENERAL RULE S8 VIOLATES: every role a PERMISSIVE policy admits is bound by a RESTRICTIVE one.
  select string_agg(format('%s on app.%s admits %s', p.polname, p.target, p.rolname), ', ')
    into offending
    from (
      select pol.polname, c.relname as target,
             case when pol.polroles = '{0}'::oid[] then 'PUBLIC' else r.rolname::text end as rolname,
             pol.polroles
        from pg_catalog.pg_policy pol
        join pg_catalog.pg_class c on c.oid = pol.polrelid
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        left join pg_catalog.pg_roles r on r.oid = any (pol.polroles)
       where n.nspname = 'app'
         and c.relname::text = any (closed_tables)
         and pol.polpermissive
    ) as p
   where not exists (
     select 1
       from pg_catalog.pg_policy res
       join pg_catalog.pg_class rc on rc.oid = res.polrelid
      where rc.relname = p.target
        and not res.polpermissive
        and (res.polroles = '{0}'::oid[]
             or (p.rolname <> 'PUBLIC' and res.polroles && p.polroles))
   );
  if offending is not null then
    raise exception 'a permissive policy admits a role no restrictive policy on the same table binds: %', offending
      using hint = 'This is finding S8: the narrowing exists, and does not apply to the role being admitted.';
  end if;

  -- 3. WHAT EACH ROLE HOLDS ON THE CLOSED TABLES, EXACTLY -- not "nothing", which would be false of
  --    both. On publish_intents app_worker holds SELECT and no other verb; on
  --    publish_target_assets it holds SELECT and INSERT and no other verb; and no OTHER service role
  --    and no anon holds anything on either. SELECT is TESTED rather than omitted: a closure whose
  --    own assertion skipped the one verb the worker actually has would be checking the verbs nobody
  --    granted.
  select string_agg(format('%s to %s', c.relname, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname = 'publish_intents'
     and r.rolname::text = any (service_roles)
     and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
          or (r.rolname <> 'app_worker'
              and pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'SELECT')));
  if offending is not null then
    raise exception 'a role this batch closes the path for holds an unexpected privilege on the intent: %', offending
      using hint = 'Batch 122 is written on the premise that app_worker READS the intent and writes nothing, and that no other service role reaches it at all. If another grant was made, the batch that made it owes the shape-B narrowing first.';
  end if;
  if not pg_catalog.has_any_column_privilege('app_worker', 'app.publish_intents'::regclass, 'SELECT') then
    raise exception 'app_worker has lost its SELECT on app.publish_intents'
      using hint = 'That grant is the first step of the fan-out and batch 120 made it deliberately. This closure refuses the read; it does not remove the grant, and a refusal attributable to a missing GRANT is weaker than one attributable to a policy (batch 010''s rule).';
  end if;
  select string_agg(format('%s to %s', c.relname, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname = 'publish_target_assets'
     and r.rolname::text = any (service_roles)
     and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
          or (r.rolname <> 'app_worker'
              and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'SELECT')
                   or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT'))));
  if offending is not null then
    raise exception 'a role this batch closes the path for holds an unexpected privilege on the pin: %', offending
      using hint = 'Only app_worker holds SELECT and INSERT on app.publish_target_assets (batch 120), and this closure refuses both. Any other grant is a batch that owes its own reasoning.';
  end if;

  -- 4. THE THREE REFUSED REPAIRS WERE NOT TAKEN.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (closed_tables)
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % lost ENABLE or FORCE ROW LEVEL SECURITY', offending;
  end if;
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (closed_tables)
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a closed table is owned by a role that must not own one: %', offending;
  end if;
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'app_command' and rolbypassrls) then
    raise exception 'app_command has BYPASSRLS, which is the first of the three repairs RFC-2026-017 §4 forbids';
  end if;
end $$;
