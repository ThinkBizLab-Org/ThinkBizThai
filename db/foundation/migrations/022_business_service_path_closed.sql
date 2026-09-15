-- Batch 022 — the business and page service path is closed, by a policy that names every role.
--
-- Owner: A0 Integration / DB-00. Closes the S8 shape in batch 020 and 021: narrowings `for all to
-- authenticated` that claim to bound every writer and bind no service role. Found not by a role run
-- on 020 and 021 but by READING, after the 2026-09-15 role runs had found the shape in 081, 090 and 100
-- and closures 083, 092 and 101 had followed 082: the S8 map of the families merged before 080
-- (evidence/WP-0A-DB-00/a0-pre-080-families-s8-map-2026-09-15.md §3, row 1) puts this family among
-- the three that can take 082's shape with no decision beyond the Owner's Q3 -- no `S` cell in
-- RFC-2026-022 §3, so no service policy this closure would pre-empt. The map's other rows (metering,
-- research) are NOT closed by this batch or its siblings, because a closure there would refuse the
-- worker policy RFC-2026-022 expects; that is the Owner's, and it is written there.
--
-- READ 082_content_service_path_closed.sql FIRST. Everything it says holds here unchanged: the
-- three repairs RFC-2026-017 §4 forbids are not taken; naming app_command in a narrowing that uses
-- the member-scope helpers is vacuous (021_member_scope.sql:389-400); shape B is the acting-user
-- narrowing, RFC-2026-023, in review and not written here. This file is deliberately a copy of
-- 082's shape rather than a variation, and a static rule holds every *_service_path_closed.sql to it.
--
-- WHY A SEPARATE FILE AND NOT AN EDIT TO 020 and 021: the batch counts its own restrictive policies at
-- apply time and its static rules read its own text; a closure written into it would trip both and
-- rewrite what its reviewers signed. A forward file after it is the shape 082 set. It is numbered
-- 022: §6's registry does not reserve it, as it did not reserve 082, 083, 092 or 101.
--
-- Today this changes nothing observable, for 101's reason rather than 082's: batches 020 and 021 grant app_worker SELECT, INSERT and UPDATE on the two profile tables and SELECT and INSERT on their version tables
-- (the "grants and no policy" shape batch 010 introduced), so a service role does reach the point
-- where policies are consulted. It is refused there today because no permissive policy admits it,
-- and refused tomorrow by this closure whatever permissive policy it is later given. The refusal is
-- the same; what changes is that it no longer depends on nobody ever writing the policy. Assertion 3
-- below asks the question that is true here.
--
-- LEFT OPEN ON PURPOSE: app.workspace_member_scopes is 021's helper table, not a narrowed one, and is not closed here; a closure there is a question about app_authz, which the map does not ask.

create policy business_profiles_service_path_closed on app.business_profiles
  as restrictive
  for all
  using (current_user = 'authenticated')
  with check (current_user = 'authenticated');

create policy business_profile_versions_service_path_closed on app.business_profile_versions
  as restrictive
  for all
  using (current_user = 'authenticated')
  with check (current_user = 'authenticated');

create policy page_context_profiles_service_path_closed on app.page_context_profiles
  as restrictive
  for all
  using (current_user = 'authenticated')
  with check (current_user = 'authenticated');

create policy page_context_profile_versions_service_path_closed on app.page_context_profile_versions
  as restrictive
  for all
  using (current_user = 'authenticated')
  with check (current_user = 'authenticated');

comment on policy business_profiles_service_path_closed on app.business_profiles is
  'Batch 022, shape C (batch 082) for the S8 shape in batch 020 and 021: every role that is not authenticated is '
  'refused every row until a batch amends this policy beside a narrowing that binds the acting user (shape B, RFC-2026-023).';
comment on policy business_profile_versions_service_path_closed on app.business_profile_versions is
  'Batch 022, shape C (batch 082) for the S8 shape in batch 020 and 021: every role that is not authenticated is '
  'refused every row until a batch amends this policy beside a narrowing that binds the acting user (shape B, RFC-2026-023).';
comment on policy page_context_profiles_service_path_closed on app.page_context_profiles is
  'Batch 022, shape C (batch 082) for the S8 shape in batch 020 and 021: every role that is not authenticated is '
  'refused every row until a batch amends this policy beside a narrowing that binds the acting user (shape B, RFC-2026-023).';
comment on policy page_context_profile_versions_service_path_closed on app.page_context_profile_versions is
  'Batch 022, shape C (batch 082) for the S8 shape in batch 020 and 021: every role that is not authenticated is '
  'refused every row until a batch amends this policy beside a narrowing that binds the acting user (shape B, RFC-2026-023).';

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED — 082's four claims
-- ============================================================================================
do $$
declare
  offending  text;
  count_of   integer;
  probe      record;
  closed_tables constant text[] := array['business_profiles', 'business_profile_versions', 'page_context_profiles', 'page_context_profile_versions'];
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
  if count_of <> 4 then
    raise exception 'batch 022 finds % service-path closures and there must be one per table, 4', count_of;
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

  -- 3. NOTHING CHANGED TODAY, in the form that is true for this family (101's form, not 082's):
  --    batches 020 and 021 grant app_worker SELECT, INSERT and UPDATE on the two profile tables and SELECT and INSERT on their version tables, so a service role does reach the point where policies are consulted here. The
  --    premise is therefore not "no grant" but "no permissive policy admits any role but
  --    authenticated" -- a grant with no policy is refused by row level security before this closure
  --    exactly as after it.
  select string_agg(format('%s on app.%s admits %s', pol.polname, c.relname,
                           case when pol.polroles = '{0}'::oid[] then 'PUBLIC' else r.rolname::text end), ', ')
    into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    left join pg_catalog.pg_roles r on r.oid = any (pol.polroles)
   where n.nspname = 'app'
     and c.relname::text = any (closed_tables)
     and pol.polpermissive
     and (pol.polroles = '{0}'::oid[] or r.rolname <> 'authenticated');
  if offending is not null then
    raise exception 'a permissive policy on a closed table admits a role other than authenticated: %', offending
      using hint = 'Batch 022 is written on the premise that today only authenticated is admitted anywhere in this family; a service policy here needs the shape-B narrowing first, and RFC-2026-022 is not in effect.';
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
