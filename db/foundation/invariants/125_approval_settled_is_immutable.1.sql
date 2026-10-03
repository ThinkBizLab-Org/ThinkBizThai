do $$
begin
  if not exists (
       select 1 from pg_catalog.pg_policy pol
        where pol.polrelid = 'app.approval_requests'::regclass
          and pol.polname = 'approval_requests_settled_is_immutable'
          and not pol.polpermissive and pol.polcmd = 'w'
          and pol.polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]::oid[]
          and pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) = '(status = ''pending''::text)'
          and pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) = 'true') then
    raise exception 'batch 125''s approval_requests_settled_is_immutable is missing or not in its required shape';
  end if;
  -- SUPERSEDED BY 126. Batch 126 recreated the trigger BEFORE INSERT OR UPDATE (blocker 186 item 15) and
  -- replaced the function's body (items 15 and 17). The final state is asserted FIRST and strictly: the
  -- trigger as 126 wrote it, and 126's body. 125's own two assertions follow word for word, each widened
  -- only to admit 126's shape beside 125's, because the replacement may add and may not remove; the
  -- strict pair above, 126's own block and the pinned trigger probe are what refuse 125's shape now.
  if not exists (
       select 1 from pg_catalog.pg_trigger t
        where t.tgrelid = 'app.approval_requests'::regclass and t.tgname = 'set_decided_at'
          and not t.tgisinternal and t.tgenabled = 'O'
          and pg_catalog.pg_get_triggerdef(t.oid) = 'CREATE TRIGGER set_decided_at BEFORE INSERT OR UPDATE ON app.approval_requests FOR EACH ROW EXECUTE FUNCTION private.set_decided_at()') then
    raise exception 'batch 125''s set_decided_at trigger is not the one batch 126 recreated BEFORE INSERT OR UPDATE';
  end if;
  if not exists (
       select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'private' and p.proname = 'set_decided_at' and not p.prosecdef
          and p.proconfig = array['search_path=""']
          and md5(p.prosrc) = 'bc70360c6b8d2df4ce7af11b03c8500c'
          and not pg_catalog.has_function_privilege('public', p.oid, 'EXECUTE')) then
    raise exception 'batch 125''s private.set_decided_at() does not carry the body batch 126 wrote, or is not SECURITY INVOKER with an empty search_path and no EXECUTE for PUBLIC';
  end if;
  if not exists (
       select 1 from pg_catalog.pg_trigger t
        where t.tgrelid = 'app.approval_requests'::regclass and t.tgname = 'set_decided_at'
          and not t.tgisinternal and t.tgenabled = 'O'
          and pg_catalog.pg_get_triggerdef(t.oid) = 'CREATE TRIGGER set_decided_at BEFORE INSERT OR UPDATE ON app.approval_requests FOR EACH ROW EXECUTE FUNCTION private.set_decided_at()')
     and not exists (
       select 1 from pg_catalog.pg_trigger t
        where t.tgrelid = 'app.approval_requests'::regclass and t.tgname = 'set_decided_at'
          and not t.tgisinternal and t.tgenabled = 'O'
          and pg_catalog.pg_get_triggerdef(t.oid) = 'CREATE TRIGGER set_decided_at BEFORE UPDATE ON app.approval_requests FOR EACH ROW EXECUTE FUNCTION private.set_decided_at()') then
    raise exception 'batch 125''s set_decided_at trigger is missing, disabled or not in its required shape';
  end if;
  if not exists (
       select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'private' and p.proname = 'set_decided_at' and not p.prosecdef
          and p.proconfig = array['search_path=""']
          and md5(p.prosrc) = 'bc70360c6b8d2df4ce7af11b03c8500c'
          and not pg_catalog.has_function_privilege('public', p.oid, 'EXECUTE'))
     and not exists (
       select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'private' and p.proname = 'set_decided_at' and not p.prosecdef
          and p.proconfig = array['search_path=""']
          and md5(p.prosrc) = 'c1564fa491fde66f5bf2e21b7c1efbfa'
          and not pg_catalog.has_function_privilege('public', p.oid, 'EXECUTE')) then
    raise exception 'batch 125''s private.set_decided_at() is missing, rewritten, or not SECURITY INVOKER with an empty search_path and no EXECUTE for PUBLIC';
  end if;
end $$;
