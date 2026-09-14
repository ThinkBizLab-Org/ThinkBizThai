-- Batch 094 — an approval request names its requester, and the requester is the caller.
--
-- Owner: A0 Integration / DB-00. A forward fix for A1-090 finding S13 (MEDIUM), on a batch that is
-- integrated and may not be rewritten. app.approval_requests.requested_by is in the INSERT grant
-- (090:474-476), is deliberately outside the UPDATE grant so a request cannot change hands after
-- the fact (090:477-478, asserted at :831-833), and is checked by no policy: the INSERT policy
-- (090:530-535) checks created_by = auth.uid() and the role, and nothing else. So a caller who
-- writes created_by = self, requested_by = someone else is admitted by every policy, and the value
-- can never be corrected. Same tenant, same Business -- attribution, not isolation -- but §4.7 names
-- this column as WHO REQUESTED, an approver reads it to know whose work they are deciding, and an
-- editor could make a request appear to come from the owner. The suite never issued that statement:
-- the raise builder writes requested_by, created_by and updated_by from one argument.
--
-- WHAT THIS BATCH DOES: one RESTRICTIVE policy, FOR INSERT, TO authenticated, whose single term is
-- requested_by = (select auth.uid()). Restrictive, so it ANDs with 090's permissive INSERT policy and
-- widens nothing; INSERT only, because the column is not updatable and a FOR ALL policy would put
-- a term on reads that reads do not need; TO authenticated, because that is the only role 090
-- admits and batch 092 closes every other. The acting-user shape RFC-2026-023 proposes for the
-- command path will have to name this policy beside 092's closure, and the RFC's §3.3 is where.
--
-- A NULL requested_by is refused by this predicate, and that is a decision stated rather than a
-- side effect: the column is nullable in 090 (:313) and no row in this repository leaves it null.
-- A request whose requester is unknown is a request an approver cannot attribute, which is the
-- defect this batch exists to close.

create policy approval_requests_requester_is_caller on app.approval_requests
  as restrictive
  for insert to authenticated
  with check (requested_by = (select auth.uid()));

comment on policy approval_requests_requester_is_caller on app.approval_requests is
  'Batch 094 (A1-090 S13): requested_by is the caller. Restrictive, INSERT only; ANDs with 090''s '
  'permissive INSERT policy and widens nothing.';

do $$
declare
  found text;
begin
  select pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) into found
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
   where c.relname = 'approval_requests' and pol.polname = 'approval_requests_requester_is_caller'
     and not pol.polpermissive and pol.polcmd = 'a';
  if found is null then
    raise exception 'batch 094 did not write approval_requests_requester_is_caller as a RESTRICTIVE INSERT policy';
  end if;
  if position('requested_by' in found) = 0 or position('auth.uid' in found) = 0 then
    raise exception 'approval_requests_requester_is_caller does not compare requested_by with auth.uid(): %', found;
  end if;
  -- requested_by stays outside the UPDATE grant: the policy above binds the write that creates
  -- the value, and 090's assertion binds the one that could change it. Both are needed.
  if pg_catalog.has_column_privilege('authenticated', 'app.approval_requests', 'requested_by', 'UPDATE') then
    raise exception 'requested_by became updatable by authenticated, so the value this batch pins at INSERT could be rewritten later';
  end if;
end $$;
