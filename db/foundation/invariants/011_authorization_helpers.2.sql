do $$
declare
  attributes record;
  offending  text;
  count_of   integer;
begin
  select rolcanlogin, rolsuper, rolbypassrls, rolinherit, (rolpassword is not null) as has_password
    into attributes
    from pg_catalog.pg_authid where rolname = 'app_authz';

  if attributes.rolcanlogin or attributes.rolsuper or attributes.rolbypassrls
     or attributes.rolinherit or attributes.has_password then
    raise exception 'app_authz does not hold the attributes RFC-2026-020 §5/2 requires'
      using detail = format('canlogin=%s super=%s bypassrls=%s inherit=%s has_password=%s',
                            attributes.rolcanlogin, attributes.rolsuper, attributes.rolbypassrls,
                            attributes.rolinherit, attributes.has_password),
            hint = 'NOBYPASSRLS is the load-bearing one: a bypassing helper owner reads every '
                   'membership row in the database and answers every authorization question yes.';
  end if;

  -- §6.1/3. Same rule as app_command, same reason: a SECURITY DEFINER function owned by the table
  -- owner is not subject to the policies on that table.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('app', 'private') and c.relkind in ('r', 'p')
     and pg_catalog.pg_get_userbyid(c.relowner) = 'app_authz';
  if offending is not null then
    raise exception 'app_authz owns table(s) %, and RFC-2026-020 §5/2 says it owns none', offending;
  end if;

  -- §6.1/4. An invoker-mode function owned by this role is option D arriving unremarked.
  --
  -- `set search_path = ''` is STORED as the proconfig element `search_path=""`, not
  -- `search_path=`: an empty GUC value is serialised quoted. The first version of this assertion
  -- looked for the unquoted form and fired on a correct database, which CI caught on the batch's
  -- first application. The committed catalog snapshot has recorded the quoted form for
  -- private.set_updated_at since batch 000, and scripts/db/run.mjs matches /^search_path=""$/ —
  -- so the evidence for the right spelling was already in the tree, and this now agrees with it.
  select string_agg(p.proname, ', ') into offending
    from pg_catalog.pg_proc p
   where pg_catalog.pg_get_userbyid(p.proowner) = 'app_authz'
     and (not p.prosecdef or p.proconfig is null or not (p.proconfig @> array['search_path=""']));
  if offending is not null then
    raise exception 'function(s) % owned by app_authz are not SECURITY DEFINER with an empty search_path', offending;
  end if;

  -- SUPERSEDED BY 171. RFC-2026-027 (approved 2026-10-05) amends RFC-2026-020 §5/3 and §6.1/5: app_authz holds
  -- exactly TWO policies in app -- the one on app.workspace_members and workspaces_select_authz_own_open on app.workspaces. The final-state
  -- count is asserted FIRST and whole, so a third policy fails here exactly as a second failed the original; then
  -- the original assertion, word for word, with 171's (table, name) pair excluded.
  select count(*) into count_of
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and exists (select 1 from pg_catalog.pg_authid r
                  where r.oid = any (p.polroles) and r.rolname = 'app_authz');
  if count_of <> 2 then
    raise exception 'app_authz holds % policies in schema app; RFC-2026-020 §5/3 as RFC-2026-027 amends it gives it exactly two', count_of;
  end if;

  -- §6.1/5, structural half. The string itself is pinned in scripts/db/run.mjs and executed
  -- against this catalog by scripts/db/authz-proofs.mjs.
  select count(*) into count_of
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and exists (select 1 from pg_catalog.pg_authid r
                  where r.oid = any (p.polroles) and r.rolname = 'app_authz')
     and (c.relname::text, p.polname::text) not in (('workspaces', 'workspaces_select_authz_own_open'));  -- SUPERSEDED BY 171: the second policy RFC-2026-027 gives app_authz, counted whole above
  if count_of <> 1 then
    raise exception 'app_authz holds % policies in schema app; RFC-2026-020 §5/3 gives it exactly one', count_of
      using hint = 'The exemption this role takes is structural, not scopal. A second policy is a '
                   'second decision and needs its own RFC.';
  end if;
end $$;
