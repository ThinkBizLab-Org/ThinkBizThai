-- Batch 071 — the research service path is closed, by a policy that names every role.
--
-- Owner: A0 Integration / DB-00. Closes the S8 shape in batch 070: narrowings `for all to
-- authenticated` that claim to bound every writer and bind no service role. Found not by a role run
-- on 070 but by READING, after 082/083/092/101 and then 022/031/042 had closed the same shape in
-- seven families: the S8 map of the families merged before 080
-- (evidence/WP-0A-DB-00/a0-pre-080-families-s8-map-2026-09-15.md §2 row 5, §3 second bullet) put the research family
-- among the two that need the Owner, because the family holds an S cell in RFC-2026-022 §3 that a
-- closure would pre-empt. THE OWNER CHOSE ROW (b) ON 2026-09-15 -- close only the narrowed tables
-- that are not S cells -- and this file is that choice for research: one table, the S-cell tables
-- left open by name below, their closures owed to the batch that lands RFC-2026-023's amendment
-- beside them.
--
-- READ 082_content_service_path_closed.sql FIRST. Everything it says holds here unchanged: the
-- three repairs RFC-2026-017 §4 forbids are not taken; naming app_command in a narrowing that uses
-- the member-scope helpers is vacuous (021_member_scope.sql:389-400); shape B is the acting-user
-- narrowing, RFC-2026-023, in review and not written here. This file is deliberately a copy of
-- 082's shape rather than a variation, and a static rule holds every *_service_path_closed.sql to it.
--
-- WHY A SEPARATE FILE AND NOT AN EDIT TO 070: the batch counts its own restrictive policies at
-- apply time and its static rules read its own text; a closure written into it would trip both and
-- rewrite what its reviewers signed. A forward file after it is the shape 082 set. It is numbered
-- 071: §6's registry does not reserve it, as it did not reserve 082, 083, 092 or 101.
--
-- Today this changes nothing observable, for 101's reason rather than 082's: batch 070 grants app_worker SELECT and INSERT (column-scoped) on app.research_suggestions
-- (the "grants and no policy" shape batch 010 introduced and 070_research.sql:1064-1070 states for this family), so a service role does reach the point
-- where policies are consulted. It is refused there today because no permissive policy admits it,
-- and refused tomorrow by this closure whatever permissive policy it is later given. The refusal is
-- the same; what changes is that it no longer depends on nobody ever writing the policy. Assertion 3
-- below asks the question that is true here.
--
-- LEFT OPEN ON PURPOSE: app.research_snapshots carries no narrowing at all (app_worker holds SELECT, INSERT and
-- a column-scoped UPDATE there, 070_research.sql:1214, and no policy admits it) -- not the S8 shape, since no
-- narrowing claims to bound a writer; it is named here so the omission reads as a reading, not an oversight.
-- app.research_runs, app.research_sources and app.research_evidence are narrowed too, and each is an S cell (RFC-2026-022 §3: run/source/evidence INSERT, CARRIED) -- the Owner's row (b) closes only the narrowed table RFC-2026-022 does not name; their closures come with the shape-B amendment (RFC-2026-023 §3.3) in the same file, when that RFC is in effect.

create policy research_suggestions_service_path_closed on app.research_suggestions
  as restrictive
  for all
  using (current_user = 'authenticated')
  with check (current_user = 'authenticated');

comment on policy research_suggestions_service_path_closed on app.research_suggestions is
  'Batch 071, shape C (batch 082) for the S8 shape in batch 070: every role that is not authenticated is '
  'refused every row until a batch amends this policy beside a narrowing that binds the acting user (shape B, RFC-2026-023).';

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED — 082's four claims
-- ============================================================================================
do $$
declare
  offending  text;
  count_of   integer;
  probe      record;
  closed_tables constant text[] := array['research_suggestions'];
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
  if count_of <> 1 then
    raise exception 'batch 071 finds % service-path closures and there must be one per table, 1', count_of;
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
  --    batch 070 grants app_worker SELECT and INSERT (column-scoped) on app.research_suggestions, so a service role does reach the point where policies are consulted here. The
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
      using hint = 'Batch 071 is written on the premise that today only authenticated is admitted anywhere in this family; a service policy here needs the shape-B narrowing first, and RFC-2026-022 is not in effect.';
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
