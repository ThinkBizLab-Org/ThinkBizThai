-- Batch 126 (the hardening batch owed on blocker 186): a settled approval request keeps its
-- outcome for every writer that fires triggers, a decision INSERTed by a non-client writer is timed by
-- the database, the time is the statement's, and a decision cannot predate its request.
--
-- A FORWARD FIX to 125, which is integrated and is not edited (migration invariant 1). The review
-- round on batch 125 (C0, A1, Q0, 2026-09-28) graded each of these LOW, NOTE or INFO and none of them
-- reachable by a client on the clean set; A0 recommended taking them in one batch after 091, and the
-- items are numbered as blocker 186 numbers them.
--
-- (15) THE OUTCOME, FOR NON-CLIENT WRITERS, AND INSERT (A1 V1 LOW, C0 F6 INFO). 125's trigger froze a
--      recorded decision's decided_by and decided_at and never read `status`. For a client the
--      settled-row closure bounds the row; for every other writer the trigger was the whole guard, and
--      A1 measured a superuser and a sketched command role each overturning a settled request under its
--      original decider's name (N4, K4), turning a cancelled request into a decision (N11, K7), and
--      inserting an already-decided request dated 2001 (N8, K6). Now:
--        * once a request is not `pending` its status, decided_by and decided_at are refused any change
--          by any writer that fires triggers. All four non-pending values are terminal: 090's two client
--          paths already require a pending row, and no documented flow moves a request out of a
--          terminal state;
--        * and once it is not pending, every OTHER column but updated_at and updated_by is refused any
--          change too (Q0 F2 on this batch, before it was integrated: the superuser re-pointed an
--          approved request's content_item_id and content_version_id to another item, still approved
--          under the original decider's name and time -- a version nobody decided). Read as the row
--          minus those two columns, so a column added later is frozen without editing this body;
--          batch 160's anonymisation route (blocker 186 item 16) must account for this as for status;
--        * a BEFORE INSERT branch records decided_at as the statement's time whenever an INSERT names a
--          decider, whatever it sent. No client role holds INSERT on the decision columns, so this binds
--          the loader, the superuser and a future command role.
--      NOT DONE HERE, AND WHY: the settled-row closure for the command role. RFC-2026-023 has not said
--      which role that is or whether it reaches this table, and a policy written for a role that does
--      not exist is a grant reviewed against no caller (010's rule). Recorded on blocker 186 for when
--      RFC-2026-023 is disposed. NOR, FOR THE SAME REASON, DELETE: the freeze binds UPDATE, upsert and
--      MERGE; a writer holding DELETE can delete a settled request and insert it again as anything
--      (C0 F2, A1 F2 on this batch). Today only the owner and a superuser hold DELETE, and either can
--      switch triggers off. A BEFORE DELETE refusal would pre-empt batch 160's erasure route (item
--      16), so it is owed with RFC-2026-023's role: give that role no DELETE, or add the refusal then.
-- (17) decided_at IS THE STATEMENT'S TIME, NOT THE TRANSACTION'S (A1 V5 NOTE: a decision recorded 1.03 s
--      before its request's created_at, because now() is when the decider's transaction began). And
--      approval_requests_decided_after_created: CHECK (decided_at >= created_at), which A1 named as
--      optional. Harmless to every row that exists: no environment holds approval data before G0
--      (Q0 F8, A1 F7 on batch 123: a CHECK added over violating rows fails its migration with no
--      recovery path, and there are none to violate), and the fixture's two decided rows are now
--      timed by the INSERT branch at load, after their created_at. It is an Owner/C0 choice and is
--      flagged as one for the Owner (O2 in the batch 126 disposition).
--
-- The function keeps its name, its SECURITY INVOKER, its empty search_path and its revoked EXECUTE;
-- only its body and its trigger's events change. 125's apply-time block pinned both, so it is
-- superseded and replaced in db/foundation/invariants/, and the pinned trigger probe in
-- scripts/db/run.mjs pins every trigger on the table and this body by digest (item 13).
--
-- Numbered 126: it must sort after 125, whose function it replaces. 124 is batch 091's; 126 is the next
-- free number and nothing reserves it. It sits inside MOD-120's 115-129 range for the reason 123 and
-- 125 do (a forward fix that must sort after the table it touches); whether A0 may keep numbering
-- these forward fixes there is recorded as a question for the Owner.

create or replace function private.set_decided_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.decided_by is not null then
      new.decided_at := pg_catalog.statement_timestamp();
    end if;
  elsif old.status <> 'pending'
        and (new.status is distinct from old.status
             or new.decided_by is distinct from old.decided_by
             or new.decided_at is distinct from old.decided_at) then
    raise exception 'a settled approval request keeps its status, decided_by and decided_at'
      using errcode = 'check_violation';
  elsif old.status <> 'pending'
        and (pg_catalog.to_jsonb(new) - array['updated_at', 'updated_by'])
            is distinct from (pg_catalog.to_jsonb(old) - array['updated_at', 'updated_by']) then
    raise exception 'a settled approval request keeps what it decided: every column but updated_at and updated_by'
      using errcode = 'check_violation';
  elsif old.decided_by is not null
        and (new.decided_by is distinct from old.decided_by or new.decided_at is distinct from old.decided_at) then
    raise exception 'an approval request that records its decision keeps its decided_by and decided_at'
      using errcode = 'check_violation';
  elsif old.decided_by is null and new.decided_by is not null then
    new.decided_at := pg_catalog.statement_timestamp();
  end if;
  return new;
end;
$$;

revoke all on function private.set_decided_at() from public;

comment on function private.set_decided_at() is
  'Batches 125 and 126: the database records when a decision was taken -- the statement''s time, when '
  'an UPDATE sets decided_by from NULL or an INSERT names a decider, whatever was sent -- and once a '
  'request is not pending its status, decided_by and decided_at -- and every other column but updated_at '
  'and updated_by -- are refused any change by every writer that fires triggers. For clients the '
  'settled-row closure refuses the row first.';

drop trigger set_decided_at on app.approval_requests;
create trigger set_decided_at before insert or update on app.approval_requests
  for each row execute function private.set_decided_at();

alter table app.approval_requests
  add constraint approval_requests_decided_after_created check (decided_at >= created_at);

comment on constraint approval_requests_decided_after_created on app.approval_requests is
  'Batch 126: a decision cannot predate its request (A1 V5 on batch 125). NULL while pending.';

do $$
begin
  if not exists (
       select 1 from pg_catalog.pg_trigger t
        where t.tgrelid = 'app.approval_requests'::regclass and t.tgname = 'set_decided_at'
          and not t.tgisinternal and t.tgenabled = 'O'
          and pg_catalog.pg_get_triggerdef(t.oid) = 'CREATE TRIGGER set_decided_at BEFORE INSERT OR UPDATE ON app.approval_requests FOR EACH ROW EXECUTE FUNCTION private.set_decided_at()') then
    raise exception 'batch 126''s set_decided_at trigger is missing, disabled or not BEFORE INSERT OR UPDATE';
  end if;
  if not exists (
       select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'private' and p.proname = 'set_decided_at' and not p.prosecdef
          and p.proconfig = array['search_path=""']
          and md5(p.prosrc) = '48bcd0d03295b86120ea89fa4dec7adf'
          and not pg_catalog.has_function_privilege('public', p.oid, 'EXECUTE')) then
    raise exception 'batch 126''s private.set_decided_at() is missing, rewritten, or not SECURITY INVOKER with an empty search_path and no EXECUTE for PUBLIC';
  end if;
  if not exists (
       select 1 from pg_catalog.pg_constraint con
        where con.conrelid = 'app.approval_requests'::regclass and con.contype = 'c'
          and con.conname = 'approval_requests_decided_after_created' and con.convalidated
          and pg_catalog.pg_get_constraintdef(con.oid) = 'CHECK ((decided_at >= created_at))') then
    raise exception 'batch 126''s approval_requests_decided_after_created is missing, unvalidated or not in its required text';
  end if;
end $$;
