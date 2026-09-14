-- Batch 082 — the content service path is closed, by a policy that names every role.
--
-- Owner: A0 Integration / DB-00. Corrects batch 080 (`080_content.sql`), which is integrated and
-- which migration invariant 1 forbids rewriting. Product Owner decision Q3 of
-- evidence/WP-0A-DB-00/product-owner-disposition-2026-09-15-six-questions.md: "C แล้วค่อย B" —
-- shape C now, shape B afterwards as an RFC.
--
-- ============================================================================================
-- WHAT 080 BELIEVES, AND WHAT IS TRUE
-- ============================================================================================
--
-- 080 writes five RESTRICTIVE scope narrowings, one per table, both halves each, and says at
-- :621-629 why both halves are there: "If a later batch grants a write here — a command path taking
-- a shortcut, a `P` cell somebody decides to implement — a narrowing with no WITH CHECK would admit
-- that write for every active member of the workspace". At :1063-1065 it says the same thing from
-- the other side: app_command is kept off the owner seat so that the narrowings DO bound what the
-- command function does.
--
-- All five narrowings are written `for all to authenticated` (:590-591, :606-607, :635-636,
-- :665-666, :703-704). A policy applies to the roles its TO clause names and to no other. So when
-- the SECURITY DEFINER writer 080 is waiting for arrives, running as app_command with the permissive
-- INSERT policy RFC-2026-017 §6 requires, NONE OF THE FIVE NARROWINGS APPLIES TO IT. The defensive
-- measure written for "a command path taking a shortcut" does not cover a command path. This is
-- A1's finding S8 (evidence/WP-0A-DB-00/a1-security-batch-080-2026-09-13.md §2A), stop-the-line:
-- a control the repository states it has, in a migration it cannot rewrite, that does not exist.
--
-- The exposure is latent — app_command holds no grant, no policy and no function on these tables
-- today, which 080 asserts at apply time — and its trigger is the next step the design calls for.
--
-- ============================================================================================
-- THE REPAIRS THAT WERE REFUSED, AND WHY
-- ============================================================================================
--
-- First the sentence that made them look principled. 080:114 and :897 say the command function
-- is "exempt from these policies by being the owner". That is false, and C0 and A1 found it so by
-- different routes: 001_service_roles.sql:41-42 creates app_command NOBYPASSRLS and never the table
-- owner so that the policies APPLY to it, and RFC-2026-017 §3 keeps app_command off the owner seat so
-- that the policies APPLY to it -- such a function "is subject to RLS and needs policies that name
-- it, which is the intended behaviour". 080 cannot be edited; this header is where the correction
-- lives, and the editable copies (tests/db/identity/identity-isolation.test.mjs, scripts/db/run.mjs,
-- the manifest blocker) are corrected in the same change.
--
-- Three are named by A1 and RFC-2026-017 §4 as the cheap repairs the false sentence makes look
-- principled: grant app_command BYPASSRLS, drop FORCE, or make app_command the table owner. Each
-- destroys a real control to close a paper one. None is taken and this batch asserts that none is.
--
-- A fourth looked right and was measured wrong: re-create the narrowings naming app_command beside
-- authenticated. The predicate is app.member_scope_admits_business, which resolves through
-- app.member_scope_is_narrowed — a SECURITY INVOKER function reading app.workspace_member_scopes
-- (021_member_scope.sql:389-400). Run as app_command that is three refusals in a row: EXECUTE is
-- revoked from PUBLIC and granted to authenticated alone (:505-507); app_command holds no SELECT on
-- the table; and workspace_member_scopes_select_own names authenticated only. Grant all three and
-- the helper sees zero rows, reports "not narrowed", and admits everything. A narrowing that binds
-- app_command with 080's predicate is a control that reads as present and always passes — the same
-- defect S8 names, one policy over.
--
-- The right shape — shape B — is a narrowing that asks the question about the ACTING USER the
-- command function serves, read from a session setting through a helper that takes the user as a
-- parameter, failing closed when the setting is absent. That changes the RLS semantics of a service
-- path and needs a contract for how the command path carries the acting user. Neither exists.
-- CONTRIBUTING_AGENTS.md requires an RFC before either, and the Owner decided B follows C. It is
-- recorded in the work package's open_blockers as owed to the first content command-function batch.
--
-- ============================================================================================
-- WHAT THIS BATCH DOES: SHAPE C
-- ============================================================================================
--
-- One RESTRICTIVE policy per table, FOR ALL, with NO `TO` clause — which is TO PUBLIC, every role
-- there is and every role not yet created — whose predicate is `current_user = 'authenticated'` on
-- both halves. Restrictive policies AND together, so:
--
--   * for `authenticated` the predicate is true and 080's narrowings decide, exactly as before;
--   * for every other role — app_command, app_worker, app_maintenance, app_authz, anon, and any role
--     a later batch invents — the predicate is false and every row is refused, on read and on write,
--     WHATEVER PERMISSIVE POLICY THAT ROLE MAY LATER BE GIVEN;
--   * for postgres and service_role, which BYPASSRLS, nothing changes, as nothing ever did.
--
-- Today this changes nothing observable: no role but authenticated holds a privilege on any of the
-- five tables, so no other role reaches the point where a policy is consulted. The isolation suite's
-- seven service cases stay grant-layer refusals. What changes is tomorrow: the batch that writes the
-- first content command function will find its permissive policy refused by THIS one, and will have
-- to amend it — in a diff a reviewer reads, beside the shape-B narrowing it must bring. That is the
-- direction 080 said a mistake should travel, made true for the case 080 did not cover.
--
-- It also refuses a future app_maintenance sweep on content. Deliberately: RFC-2026-017 gives that
-- role explicit USING (true) policies on named tables and named operations, each with a recorded
-- reason. A sweep on content is a decision, and this policy makes it one rather than an omission.
--
-- The policy is written against `current_user` rather than a session setting for the reason
-- RFC-2026-022 §5/4 measured: a service role can set the setting a policy reads, so a GUC bounds
-- nothing on the service path. `current_user` is what SET ROLE made it and nothing else.

-- ============================================================================================
-- FIVE POLICIES, ONE PER TABLE, NAMING NOBODY AND THEREFORE EVERYBODY
-- ============================================================================================

create policy content_ideas_service_path_closed on app.content_ideas
  as restrictive
  for all
  using (current_user = 'authenticated')
  with check (current_user = 'authenticated');

create policy content_items_service_path_closed on app.content_items
  as restrictive
  for all
  using (current_user = 'authenticated')
  with check (current_user = 'authenticated');

create policy content_versions_service_path_closed on app.content_versions
  as restrictive
  for all
  using (current_user = 'authenticated')
  with check (current_user = 'authenticated');

create policy content_variants_service_path_closed on app.content_variants
  as restrictive
  for all
  using (current_user = 'authenticated')
  with check (current_user = 'authenticated');

create policy quality_reviews_service_path_closed on app.quality_reviews
  as restrictive
  for all
  using (current_user = 'authenticated')
  with check (current_user = 'authenticated');

comment on policy content_ideas_service_path_closed on app.content_ideas is
  'Batch 082, shape C for A1 finding S8: every role that is not authenticated is refused every row '
  'until a batch amends this policy beside a narrowing that binds the acting user (shape B, RFC owed).';
comment on policy content_items_service_path_closed on app.content_items is
  'Batch 082, shape C for A1 finding S8: see content_ideas_service_path_closed.';
comment on policy content_versions_service_path_closed on app.content_versions is
  'Batch 082, shape C for A1 finding S8: see content_ideas_service_path_closed.';
comment on policy content_variants_service_path_closed on app.content_variants is
  'Batch 082, shape C for A1 finding S8: see content_ideas_service_path_closed.';
comment on policy quality_reviews_service_path_closed on app.quality_reviews is
  'Batch 082, shape C for A1 finding S8: see content_ideas_service_path_closed.';

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED
-- ============================================================================================
--
-- Four claims, each about the live catalog and none checkable by reading this file. `pg_roles` and
-- never `pg_authid`, for batch 020's reason.
do $$
declare
  offending  text;
  count_of   integer;
  probe      record;
  content_tables constant text[] :=
    array['content_ideas', 'content_items', 'content_versions', 'content_variants',
          'quality_reviews'];
  service_roles constant text[] :=
    array['anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz'];
begin
  -- 1. FIVE CLOSURES, RESTRICTIVE, FOR ALL, TO PUBLIC, BOTH HALVES, BOTH READING current_user.
  --    `polroles = '{0}'` is how the catalog spells PUBLIC; a policy that named a list of roles
  --    instead would bind that list and miss the next role, which is S8 again. `polcmd = '*'` is
  --    FOR ALL; a closure FOR SELECT would leave every write open.
  count_of := 0;
  for probe in
    select c.relname as target,
           pol.polname,
           pol.polpermissive,
           pol.polcmd,
           pol.polroles,
           lower(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid))      as using_half,
           lower(pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname::text = any (content_tables)
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
      raise exception '% on app.% names a list of roles rather than PUBLIC, and binds only that list', probe.polname, probe.target
        using hint = 'A closure that names roles misses the next role, which is finding S8 with a different spelling.';
    end if;
    if probe.using_half is null or probe.check_half is null then
      raise exception '% on app.% is missing a half', probe.polname, probe.target;
    end if;
    if probe.using_half <> probe.check_half then
      raise exception '% on app.% has halves that differ: USING % / WITH CHECK %', probe.polname, probe.target, probe.using_half, probe.check_half;
    end if;
    if position('current_user' in probe.using_half) = 0
       or position('authenticated' in probe.using_half) = 0 then
      raise exception '% on app.% does not compare current_user with authenticated: %', probe.polname, probe.target, probe.using_half
        using hint = 'The predicate must read the role SET ROLE produced and nothing a service role can set for itself (RFC-2026-022 §5/4).';
    end if;
  end loop;
  if count_of <> 5 then
    raise exception 'batch 082 finds % service-path closures and there must be one per content table, five', count_of;
  end if;

  -- 2. THE GENERAL RULE S8 IS A VIOLATION OF, asserted so the next family can copy it rather than
  --    the defect: on every content table, every role a PERMISSIVE policy admits must be bound by at
  --    least one RESTRICTIVE policy. A permissive policy TO PUBLIC admits every role and must meet a
  --    restrictive policy TO PUBLIC; a permissive policy TO x must meet a restrictive TO x or TO
  --    PUBLIC. With 080 alone the rule holds only for `authenticated`, by accident of TO; with this
  --    batch it holds for every role, by construction.
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
         and c.relname::text = any (content_tables)
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

  -- 3. NOTHING CHANGED TODAY. No service role and no anon holds any privilege on the five tables —
  --    080 asserted this at its own apply time and this batch asserts it again at its own, because
  --    the claim that the closure is inert today rests on it. The seven service cases in the
  --    isolation suite stay grant-layer refusals.
  select string_agg(format('%s to %s', c.relname, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and r.rolname::text = any (service_roles)
     and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'a role this batch closes the path for already holds a privilege on content: %', offending
      using hint = 'Batch 082 is written on the premise that it changes nothing today. If a grant was made, the closure is no longer inert and the batch that made the grant owes the shape-B narrowing first.';
  end if;

  -- 4. THE THREE REFUSED REPAIRS WERE NOT TAKEN. FORCE still on all five; app_command not the owner
  --    of any; app_command still NOBYPASSRLS. Each is asserted in 080 or 001 already; they are asked
  --    again here because this is the batch a reader will open when tempted.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % lost ENABLE or FORCE ROW LEVEL SECURITY', offending;
  end if;
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a content table is owned by a role that must not own one: %', offending;
  end if;
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'app_command' and rolbypassrls) then
    raise exception 'app_command has BYPASSRLS, which is the first of the three repairs RFC-2026-017 §4 forbids';
  end if;
end $$;
