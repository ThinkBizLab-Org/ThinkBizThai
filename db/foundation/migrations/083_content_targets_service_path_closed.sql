-- Batch 083 — the content_targets service path is closed, by a policy that names every role.
--
-- Owner: A0 Integration / DB-00. Closes the S8 shape in batch 081 (081_*.sql), found by the
-- independent role runs of 2026-09-15 (A1 S1, C0 H1, Q0 inherited S8) after batch 082 had closed the same shape on
-- batch 080's tables, and integrated in the same pull request as 081 so that 081 never sits
-- on main with the finding open. Product Owner decision Q3 of
-- evidence/WP-0A-DB-00/product-owner-disposition-2026-09-15-six-questions.md — shape C now, shape B
-- afterwards as an RFC — applied to the same shape one family over.
--
-- READ 082_content_service_path_closed.sql FIRST. Everything it says holds here unchanged: the
-- narrowings in batch 081 are `for all to authenticated` and bind no service role; the three
-- repairs RFC-2026-017 §4 forbids are not taken; naming app_command in a narrowing that uses the
-- member-scope helpers is vacuous (021_member_scope.sql:389-400); shape B is the acting-user
-- narrowing and is owed as an RFC, not written here. This file is deliberately a copy of 082's
-- shape rather than a variation, and a static rule holds every *_service_path_closed.sql to it.
--
-- WHY A SEPARATE FILE AND NOT AN EDIT TO 081: batch 081 counts its own restrictive policies at
-- apply time and its static rules read its own text; a closure written into it would trip both and
-- rewrite what three role runs reviewed. A forward file after 081 leaves 081 as reviewed and
-- is the shape 082 set. It is numbered 083: §6's registry does not reserve it, as it did not
-- reserve 082.
--
-- Today this changes nothing observable: no role but authenticated holds a privilege on these
-- tables, asserted below rather than assumed.

create policy content_targets_service_path_closed on app.content_targets
  as restrictive
  for all
  using (current_user = 'authenticated')
  with check (current_user = 'authenticated');

comment on policy content_targets_service_path_closed on app.content_targets is
  'Batch 083, shape C (batch 082) for the S8 shape in batch 081: every role that is not authenticated is '
  'refused every row until a batch amends this policy beside a narrowing that binds the acting user (shape B, RFC owed).';

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED — 082's four claims
-- ============================================================================================
do $$
declare
  offending  text;
  count_of   integer;
  probe      record;
  closed_tables constant text[] := array['content_targets'];
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
  if count_of <> 1 then
    raise exception 'batch 083 finds % service-path closures and there must be one per table, 1', count_of;
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

  -- 3. NOTHING CHANGED TODAY: no service role and no anon holds a privilege on the closed tables.
  select string_agg(format('%s to %s', c.relname, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname::text = any (closed_tables)
     and r.rolname::text = any (service_roles)
     and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'a role this batch closes the path for already holds a privilege: %', offending
      using hint = 'Batch 083 is written on the premise that it changes nothing today. If a grant was made, the batch that made it owes the shape-B narrowing first.';
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
