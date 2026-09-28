-- Batch 125: a settled approval request cannot be updated by a client, whichever permissive policy
-- would admit it; and the database, not the decider, records when a decision was taken.
--
-- TWO FORWARD FIXES, both the Product Owner's (2026-09-28, `เอาตามแนะนำทุกข้อ` on A0's recommendation
-- after #162: this batch first, then 091, and the database sets decided_at). Disposition in
-- evidence/WP-0A-DB-00/.
--
-- 1. THE SETTLED-ROW CLOSURE.
-- A0 forward fix, from the re-verification of batch 123's corrections (A1 N1, LOW, which the Owner
-- may read as MEDIUM because it is the approval gate; C0 F2, LOW, measured independently). §4
-- invariant 8 makes approval history immutable. Until this file that rested on two clauses,
-- `status = 'pending'` in the USING halves of 090's cancel and decide policies, which no layer pinned
-- against a narrower widening. A1 measured one plausible later edit -- "the owner may correct a
-- decision", widening the decide policy's USING for the owner only -- passing migrate-clean and
-- rls-smoke, after which the owner turned the approver's approval into the owner's own, or overturned
-- it backdated to 2001. 123's decider closure binds WHO decides on the new row; it says nothing about
-- WHICH row may be updated.
--
-- A RESTRICTIVE UPDATE policy whose USING is `status = 'pending'` ANDs with whatever admits the row,
-- so only a pending request can be updated by a client at all. Its WITH CHECK is `true` on purpose:
-- a restrictive policy with USING alone applies USING to the new row as well, which would refuse
-- every cancel and decide (C0 measured seven legitimate cases failing without it). The new row is
-- bounded by 090's two WITH CHECK halves, 123's two closures and the CHECKs. It refuses nothing that
-- works today: both of 090's USING halves already require a pending row.
--
-- 2. decided_at IS THE DATABASE'S (A1 F4 and Q0 F7 on batch 123, both LOW: 2000-01-01, 2001-01-01 and
--    2999-01-01 were each accepted from a decider, and batch 160's retention sweep will read the value).
--    A BEFORE UPDATE trigger sets decided_at to the transaction's time when a decision is recorded --
--    decided_by going from NULL to a value -- whatever the client sent, and refuses any change to
--    decided_by or decided_at once a decision is recorded, for every writer. A client cannot reach a
--    settled row at all (item 1); the refusal binds the writers item 1 does not. decided_at stays in
--    090's UPDATE grant, so no client statement changes shape: a value the decider sends is ignored
--    at a decision and refused by 123's pair on anything else. SECURITY INVOKER with an empty
--    search_path: it touches only NEW, so it needs no privilege of its own, and EXECUTE is revoked
--    from PUBLIC (a trigger function's EXECUTE is checked when the trigger is created, not when it
--    fires).
--
-- Numbered 125 so it sorts after 123, whose closures it sits beside, and after 124, batch 091's.

create policy approval_requests_settled_is_immutable on app.approval_requests
  as restrictive for update to authenticated
  using (status = 'pending')
  with check (true);

comment on policy approval_requests_settled_is_immutable on app.approval_requests is
  'Batch 125: a client updates only a pending request, whichever permissive policy admits the row, '
  'so a settled decision cannot be re-decided, reverted or taken over (A1 N1, C0 F2 on batch 123''s '
  'corrections). WITH CHECK true: USING alone would bind the new row too and refuse every transition.';

create function private.set_decided_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.decided_by is null and new.decided_by is not null then
    new.decided_at := pg_catalog.now();
  elsif old.decided_by is not null
        and (new.decided_by is distinct from old.decided_by or new.decided_at is distinct from old.decided_at) then
    raise exception 'an approval request that records its decision keeps its decided_by and decided_at'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function private.set_decided_at() from public;

comment on function private.set_decided_at() is
  'Batch 125: the database records when a decision was taken (decided_by NULL to a value sets '
  'decided_at to now(), whatever was sent) and a recorded decision keeps its decider and time, for '
  'every writer. A1 F4 and Q0 F7 on batch 123 measured decided_at accepted from the decider.';

create trigger set_decided_at before update on app.approval_requests
  for each row execute function private.set_decided_at();

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
  if not exists (
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
          and md5(p.prosrc) = 'c1564fa491fde66f5bf2e21b7c1efbfa'
          and not pg_catalog.has_function_privilege('public', p.oid, 'EXECUTE')) then
    raise exception 'batch 125''s private.set_decided_at() is missing, rewritten, or not SECURITY INVOKER with an empty search_path and no EXECUTE for PUBLIC';
  end if;
end $$;
