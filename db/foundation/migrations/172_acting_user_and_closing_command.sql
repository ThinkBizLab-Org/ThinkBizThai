-- Batch 141: the acting-user narrowing (RFC-2026-023), the §11.4 closing command, and the audit
-- producer's command half (RFC-2026-026).
--
-- A0 author (owner of batch 141, "audit consumers/hooks", in the migration registry), A1 review. This file
-- implements two APPROVED decision records as written:
--   * architecture/decisions/RFC-2026-023-acting-user-narrowing.md (approved 2026-10-05 through the Owner's
--     delegation of A0's recommendations; Q-023-1..8 answered as A0 recommended): shape B's two acting-user
--     helpers, the app_authz grant and policy they read through (§3.2), and the first command function, the
--     §11.4 closing command (§8; Q-023-4, Q-023-7: the real command, not a stub);
--   * architecture/decisions/RFC-2026-026-audit-row-producer.md (approved 2026-10-05): its COMMAND HALF only
--     (§3.3, §3.4, §3.6, §9/1; Q-026-6 answered "yes": the command half lands with RFC-2026-023's first
--     command function, before the worker RFC). The worker half waits on DATA-DEC-03 (RFC-2026-028).
-- RFC-2026-027 (in effect with 171) is honoured, not restated: every membership question below is asked
-- through app.is_active_member / app.workspace_member_role, which carry 171's admitted-state gate.
-- Plan: evidence/WP-0A-DB-00/a0-batch-141-plan-2026-10-03.md. Disposition:
-- evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-141.md.
--
-- WHY THIS FILE IS 172 AND NOT 141. The batch is 141's -- the registry row A0 holds for "audit consumers/hooks",
-- and RFC-2026-023's plan §6, "in batch 141's range" -- but the runner applies migration FILES in name order, so a
-- 141_* file runs before 170 and 171. 171 is integrated, and its apply-time block holds app_authz to exactly two
-- policies AT 171'S OWN APPLY TIME; a 141_* file that gives app_authz its third made migrate-clean fail inside 171
-- (measured on the private cluster, exit 2, "after batch 171, app_authz holds 3 policies"). An integrated migration
-- is never edited (migration invariant 1), so the file takes the next free number after 171. That is A0's
-- recommendation under the Owner's delegation, recorded in the disposition; the Integration Owner's and A1's
-- (range 170's owner) acceptance of the number is owed (open_blockers[200] (1)).
--
-- WHAT THIS FILE DOES, IN ORDER:
--   1. RFC-2026-023 §3.2. app_authz gains column SELECT on exactly five columns of
--      app.workspace_member_scopes (workspace_id, user_id, scope_type, business_profile_id,
--      page_context_profile_id) and ONE policy there, workspace_member_scopes_select_authz_own:
--      `user_id = app.jwt_subject()` (Q-023-8: the acting user's own rows alone). The table is forced and
--      app_authz holds no BYPASSRLS, so without the policy the grant reads zero rows and every helper would
--      answer "not narrowed" -- the vacuous shape §2 rejects (§0/7(b)).
--   2. RFC-2026-023 §3.2. app.acting_user_admits_business and app.acting_user_admits_page, SECURITY DEFINER,
--      STABLE, language sql, search_path '', owned by app_authz, EXECUTE to app_command alone. The membership
--      conjunct is app.is_active_member(workspace), CALLED, never re-derived (Q-023-2), so 171's gate is
--      inherited. The scope half is batch 021's reading of §7, asked about the acting user instead of the
--      caller: a member with no scope row is not narrowed.
--   3. RFC-2026-023 Q-023-5. app.jwt_aal(): the `aal` claim, read through a helper app_authz owns beside
--      app.jwt_subject(), EXECUTE to app_command alone. Fail closed: the closing command refuses unless it is
--      'aal2'. MEASURED ON THE PLATFORM: NOTHING -- that Supabase's server tier sets aal = 'aal2' after a
--      step-up is RFC-2026-023 §9's reading, owed to the platform measurement (RFC-2026-020 §6.2's rule); here
--      it is asserted locally from the claims shape alone.
--   4. app_command's reach, each grant named by the RFC that needs it: USAGE on schema app (RFC-2026-023 §5,
--      A1 F5); EXECUTE on app.jwt_subject() (RFC-2026-026 §3.3: the policy's first real caller),
--      app.is_active_member(uuid) (RFC-2026-026 §3.3) and app.workspace_member_role(uuid) (RFC-2026-023 §8/2:
--      the owner test of the closing policy); SELECT (id, lifecycle_state) and UPDATE (lifecycle_state,
--      updated_by) on app.workspaces (§8/2); INSERT on app.audit_logs (RFC-2026-026 §9/1).
--   5. RFC-2026-023 §8/2 and Q0-RC1. Two policies on app.workspaces for app_command:
--      workspaces_select_command_owner (FOR SELECT, the owner's own workspace: without a SELECT path the
--      UPDATE's WHERE sees no row and the command would update 0 rows silently, Q0-RC1, measured) and
--      workspaces_update_command_owner (FOR UPDATE: USING the owner test, no lifecycle literal -- the gate is
--      inherited; WITH CHECK the admitted literal on the TARGET state, the owner test, and updated_by bound to
--      the acting user, because 105's updated_by closure is TO authenticated and does not bind app_command).
--   6. RFC-2026-026 §3.3. audit_logs_insert_command, FOR INSERT TO app_command, its literal as the RFC writes it.
--   7. The closing command, two functions (RFC-2026-023 §8/1): app.close_workspace (active -> closing; owner;
--      step-up) and app.cancel_workspace_closing (closing -> active; owner; within the recovery window, which
--      DATA-DEC-04 has not fixed, so any closing workspace is admitted and no number is encoded). Each is
--      SECURITY DEFINER owned by app_command, language plpgsql, search_path '', no EXECUTE statement, EXECUTE
--      to authenticated alone (RFC-2026-026 §8.1/6). Each writes its `succeeded` row in the action's own
--      transaction, OUTSIDE the exception block (§3.4), so an audit refusal raises and nothing commits; and a
--      `denied` or `failed` row, with no business and no page (§3.3/4), only in a workspace the acting user is
--      an active member of (§3.3/2; a refusal about any other workspace is Q-026-10's accepted gap, (iii)).
--   8. An apply-time block (below).
--
-- NOT IN THIS FILE, EACH OWED BY NAME (open_blockers[199], [195]): RFC-2026-026 §3.7's command policy on
-- app.security_events (no command writes a security event yet; a grant with no caller is not made, 011's
-- reason for jwt_subject); the worker half (DATA-DEC-03, RFC-2026-028); shape B's closure amendments on the
-- content tables (RFC-2026-023 §3.3: "a closure is amended table by table, in the batch whose command needs
-- that table" -- this command needs app.workspaces, which carries no shape-C closure); the platform
-- measurements (Q-023-5's aal claim, Q170-c's function ownership under a non-superuser applier).
--
-- MIGRATION INVARIANT 1. Nothing integrated is edited. The apply-time blocks this file makes false -- 011#2
-- and 021#1 (exactly two app_authz policies; no app_authz SELECT on workspace_member_scopes), 140#1 (no policy
-- for a service role on an audit table) and 171#1 (two app_authz policies, six columns, three functions) --
-- are listed in db/foundation/invariants/superseded.json with final-state replacements, in this diff.
--
-- PINNED IN THE SAME DIFF: scripts/db/run.mjs (AUTHZ_POLICIES gains the third pair, AUTHZ_COLUMN_GRANTS_BY_TABLE
-- the five columns, SECURITY_DEFINER_FUNCTIONS the five new functions with their owners and body digests,
-- PINNED_SCHEMA_PRIVILEGES 'app_command USAGE on app', PERMISSIVE_POLICIES the three policies on client-writable
-- tables, the audit producer rule of RFC-2026-026 §8.1/1 with its pinned producer set);
-- db/foundation/lint/policy-set.json (the audit_logs policy, which sits on no client-writable table);
-- db/foundation/lint/pinned-grants.json (regenerated by scripts/db/generate-pinned-grants.mjs);
-- catalog-snapshot.json (172 declared not applied); audit-coverage-map.json and service-policy-map.json (the
-- producer named, Q-026-7).
--
-- MIGRATION INVARIANT 3 (ERD:289-290). A policy change takes ACCESS EXCLUSIVE on its table, so the DDL runs
-- under lock and statement timeouts, set immediately before and reset immediately after.
--
-- ROLLBACK / FORWARD FIX (RFC-2026-023 §10, RFC-2026-026's Rollback). A forward migration that drops the two
-- command functions, the three app_command policies and audit_logs_insert_command, revokes every grant step 4
-- makes, drops the three app_authz helpers, workspace_member_scopes_select_authz_own and app_authz's five
-- columns, with the run.mjs pins, pinned-grants.json and superseded.json reverted in the same diff.
-- lifecycle_state then returns to having no request-path writer (open_blockers[195] (9)); audit rows already
-- written stay (app.audit_logs refuses UPDATE and DELETE to every role, 140).

set lock_timeout = '5s';
set statement_timeout = '60s';

-- 1. RFC-2026-023 §3.2: what app_authz reads. ----------------------------------------------------
grant select (workspace_id, user_id, scope_type, business_profile_id, page_context_profile_id)
  on app.workspace_member_scopes to app_authz;

drop policy if exists workspace_member_scopes_select_authz_own on app.workspace_member_scopes;
create policy workspace_member_scopes_select_authz_own on app.workspace_member_scopes
  for select to app_authz
  using (user_id = app.jwt_subject());

-- 2. RFC-2026-023 §3.2: the two acting-user helpers. ---------------------------------------------
create or replace function app.acting_user_admits_business(workspace uuid, business uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_active_member(workspace)
     and (not exists (select 1 from app.workspace_member_scopes s
                       where s.workspace_id = workspace and s.user_id = app.jwt_subject())
          or exists (select 1 from app.workspace_member_scopes s
                      where s.workspace_id = workspace and s.user_id = app.jwt_subject()
                        and (s.scope_type = 'all_businesses' or s.business_profile_id = business)))
$$;

create or replace function app.acting_user_admits_page(workspace uuid, business uuid, page_context uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_active_member(workspace)
     and (not exists (select 1 from app.workspace_member_scopes s
                       where s.workspace_id = workspace and s.user_id = app.jwt_subject())
          or exists (select 1 from app.workspace_member_scopes s
                      where s.workspace_id = workspace and s.user_id = app.jwt_subject()
                        and (s.scope_type = 'all_businesses'
                             or (s.scope_type = 'business' and s.business_profile_id = business)
                             or (s.scope_type = 'page' and s.page_context_profile_id = page_context))))
$$;

-- 3. RFC-2026-023 Q-023-5: the authentication level, read where the subject is read. ---------------
create or replace function app.jwt_aal()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal'
$$;

alter function app.acting_user_admits_business(uuid, uuid) owner to app_authz;
alter function app.acting_user_admits_page(uuid, uuid, uuid) owner to app_authz;
alter function app.jwt_aal() owner to app_authz;

comment on function app.acting_user_admits_business(uuid, uuid) is
  'RFC-2026-023 §3.2 (batch 141). True when the ACTING USER -- the sub of request.jwt.claims, read through '
  'app.jwt_subject() -- is an active member of the workspace (app.is_active_member, so 171''s admitted-state '
  'gate is inherited) and either holds no scope row there or holds one covering the business. Answers about '
  'the claims, never about the caller: inside a SECURITY DEFINER command the caller is app_command. Owned by '
  'app_authz; EXECUTE to app_command alone.';
comment on function app.acting_user_admits_page(uuid, uuid, uuid) is
  'RFC-2026-023 §3.2 (batch 141). The page form of app.acting_user_admits_business: all_businesses, a business '
  'row naming the business, or a page row naming the page. Owned by app_authz; EXECUTE to app_command alone.';
comment on function app.jwt_aal() is
  'RFC-2026-023 Q-023-5 (batch 141). The aal claim of request.jwt.claims, or NULL. The closing command refuses '
  'unless it is aal2. That the platform''s server tier sets aal2 after a step-up is NOT measured here; it is '
  'owed to the platform measurement before it is relied on (RFC-2026-020 §6.2).';

revoke all on function app.acting_user_admits_business(uuid, uuid) from public;
revoke all on function app.acting_user_admits_page(uuid, uuid, uuid) from public;
revoke all on function app.jwt_aal() from public;
grant execute on function app.acting_user_admits_business(uuid, uuid) to app_command;
grant execute on function app.acting_user_admits_page(uuid, uuid, uuid) to app_command;
grant execute on function app.jwt_aal() to app_command;

-- 4. app_command's reach. -----------------------------------------------------------------------
grant usage on schema app to app_command;
grant execute on function app.jwt_subject() to app_command;
grant execute on function app.is_active_member(uuid) to app_command;
grant execute on function app.workspace_member_role(uuid) to app_command;
grant select (id, lifecycle_state) on app.workspaces to app_command;
grant update (lifecycle_state, updated_by) on app.workspaces to app_command;
grant insert on app.audit_logs to app_command;

-- 5. RFC-2026-023 §8/2 and Q0-RC1: the closing command's rows. -------------------------------------
drop policy if exists workspaces_select_command_owner on app.workspaces;
create policy workspaces_select_command_owner on app.workspaces
  for select to app_command
  using (app.workspace_member_role(id) = 'owner');

drop policy if exists workspaces_update_command_owner on app.workspaces;
create policy workspaces_update_command_owner on app.workspaces
  for update to app_command
  using (app.workspace_member_role(id) = 'owner')
  with check (
    lifecycle_state in ('active', 'closing')
    and app.workspace_member_role(id) = 'owner'
    and updated_by = app.jwt_subject()
  );

-- 6. RFC-2026-026 §3.3: the command producer's policy, as the RFC writes it. -----------------------
create policy audit_logs_insert_command on app.audit_logs
  for insert to app_command
  with check (
    actor_kind = 'user'
    and actor_id = (app.jwt_subject())::text
    and app.is_active_member(workspace_id)
    and case
          when outcome = 'succeeded' then
            (business_profile_id is null
               or app.acting_user_admits_business(workspace_id, business_profile_id))
            and (page_context_profile_id is null
               or (business_profile_id is not null
                   and app.acting_user_admits_page(workspace_id, business_profile_id,
                                                   page_context_profile_id)))
          else business_profile_id is null and page_context_profile_id is null
        end
  );

set lock_timeout = default;
set statement_timeout = default;

-- 7. The §11.4 closing command (RFC-2026-023 §8, RFC-2026-026 §3.4). ------------------------------
--
-- The shape of both, read once by a reviewer (Q-023-7):
--   * arguments the record needs are checked first; a missing one is the CALLER's defect and raises 22023;
--   * no acting user (no `sub` in the claims) raises 42501: nothing can be recorded under nobody's name;
--   * the decision is taken by READS only -- the owner test, the step-up test, the current state;
--   * the one write runs in an exception block (a subtransaction): if it fails, its effect is gone and the
--     outcome is `failed`; an UPDATE that touched no row raises inside the block (Q0-RC1), never reports success;
--   * the `succeeded` row is inserted AFTER the block, outside any handler (§3.4): its refusal raises, the
--     call fails and the transaction keeps nothing -- an audited action that cannot be audited does not happen;
--   * a `denied` or `failed` row names the workspace and no business or page, and is written only when the
--     acting user is an active member of it (the policy refuses any other); either way the call RETURNS.
-- The scope of a `succeeded` row is the changed row's own id, read back with RETURNING (§3.6): a workspace
-- carries no business or page, so both stay null.
create or replace function app.close_workspace(
  workspace uuid, request_id text, correlation_id text,
  out outcome text, out error_code text, out lifecycle_state text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  acting  uuid := app.jwt_subject();
  current text;
  changed uuid;
  refusal text;
  verdict text;
begin
  if workspace is null or request_id is null or length(btrim(request_id)) = 0
     or correlation_id is null or length(btrim(correlation_id)) = 0 then
    raise exception 'the closing command needs a workspace, a request_id and a correlation_id'
      using errcode = '22023';
  end if;
  if acting is null then
    raise exception 'the closing command has no acting user: request.jwt.claims carries no sub'
      using errcode = '42501';
  end if;

  if app.workspace_member_role(workspace) is distinct from 'owner' then
    refusal := 'workspace.lifecycle.not_permitted';
  elsif app.jwt_aal() is distinct from 'aal2' then
    refusal := 'workspace.lifecycle.step_up_required';
  else
    select w.lifecycle_state into current from app.workspaces w where w.id = workspace;
    if current is distinct from 'active' then
      refusal := 'workspace.lifecycle.not_active';
    end if;
  end if;
  verdict := case when refusal is null then null else 'denied' end;

  if refusal is null then
    begin
      update app.workspaces as w
         set lifecycle_state = 'closing', updated_by = acting
       where w.id = workspace and w.lifecycle_state = 'active'
      returning w.id into changed;
      if changed is null then
        raise exception 'the closing command changed no row' using errcode = 'P0002';
      end if;
    exception when others then
      changed := null;
      refusal := 'workspace.lifecycle.write_failed';
      verdict := 'failed';
    end;
  end if;

  if refusal is null then
    insert into app.audit_logs
      (workspace_id, business_profile_id, page_context_profile_id, occurred_at, actor_kind, actor_id,
       action_category, action_name, outcome, reason_key, request_id, correlation_id, causation_id,
       change_before_ref, change_after_ref, error_code,
       secret_redacted, content_redacted, pii_redacted, retention_policy_ref)
    values
      (changed, null, null, now(), 'user', acting::text,
       'delete', 'workspace.lifecycle.close', 'succeeded', 'audit.workspace.closing_started',
       request_id, correlation_id, null,
       'record:app.workspaces/' || changed::text || '/active',
       'record:app.workspaces/' || changed::text || '/closing', null,
       true, true, true, 'retention.audit');
    outcome := 'succeeded';
    error_code := null;
    lifecycle_state := 'closing';
    return;
  end if;

  if app.is_active_member(workspace) then
    insert into app.audit_logs
      (workspace_id, business_profile_id, page_context_profile_id, occurred_at, actor_kind, actor_id,
       action_category, action_name, outcome, reason_key, request_id, correlation_id, causation_id,
       change_before_ref, change_after_ref, error_code,
       secret_redacted, content_redacted, pii_redacted, retention_policy_ref)
    values
      (workspace, null, null, now(), 'user', acting::text,
       'delete', 'workspace.lifecycle.close', verdict, 'audit.workspace.close_refused',
       request_id, correlation_id, null,
       'record:app.workspaces/' || workspace::text, null, refusal,
       true, true, true, 'retention.audit');
  end if;
  outcome := verdict;
  error_code := refusal;
  lifecycle_state := null;
end
$$;

create or replace function app.cancel_workspace_closing(
  workspace uuid, request_id text, correlation_id text,
  out outcome text, out error_code text, out lifecycle_state text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  acting  uuid := app.jwt_subject();
  current text;
  changed uuid;
  refusal text;
  verdict text;
begin
  if workspace is null or request_id is null or length(btrim(request_id)) = 0
     or correlation_id is null or length(btrim(correlation_id)) = 0 then
    raise exception 'the cancel command needs a workspace, a request_id and a correlation_id'
      using errcode = '22023';
  end if;
  if acting is null then
    raise exception 'the cancel command has no acting user: request.jwt.claims carries no sub'
      using errcode = '42501';
  end if;

  if app.workspace_member_role(workspace) is distinct from 'owner' then
    refusal := 'workspace.lifecycle.not_permitted';
  else
    select w.lifecycle_state into current from app.workspaces w where w.id = workspace;
    if current is distinct from 'closing' then
      refusal := 'workspace.lifecycle.not_closing';
    end if;
  end if;
  verdict := case when refusal is null then null else 'denied' end;

  if refusal is null then
    begin
      update app.workspaces as w
         set lifecycle_state = 'active', updated_by = acting
       where w.id = workspace and w.lifecycle_state = 'closing'
      returning w.id into changed;
      if changed is null then
        raise exception 'the cancel command changed no row' using errcode = 'P0002';
      end if;
    exception when others then
      changed := null;
      refusal := 'workspace.lifecycle.write_failed';
      verdict := 'failed';
    end;
  end if;

  if refusal is null then
    insert into app.audit_logs
      (workspace_id, business_profile_id, page_context_profile_id, occurred_at, actor_kind, actor_id,
       action_category, action_name, outcome, reason_key, request_id, correlation_id, causation_id,
       change_before_ref, change_after_ref, error_code,
       secret_redacted, content_redacted, pii_redacted, retention_policy_ref)
    values
      (changed, null, null, now(), 'user', acting::text,
       'delete', 'workspace.lifecycle.cancel_closing', 'succeeded', 'audit.workspace.closing_cancelled',
       request_id, correlation_id, null,
       'record:app.workspaces/' || changed::text || '/closing',
       'record:app.workspaces/' || changed::text || '/active', null,
       true, true, true, 'retention.audit');
    outcome := 'succeeded';
    error_code := null;
    lifecycle_state := 'active';
    return;
  end if;

  if app.is_active_member(workspace) then
    insert into app.audit_logs
      (workspace_id, business_profile_id, page_context_profile_id, occurred_at, actor_kind, actor_id,
       action_category, action_name, outcome, reason_key, request_id, correlation_id, causation_id,
       change_before_ref, change_after_ref, error_code,
       secret_redacted, content_redacted, pii_redacted, retention_policy_ref)
    values
      (workspace, null, null, now(), 'user', acting::text,
       'delete', 'workspace.lifecycle.cancel_closing', verdict, 'audit.workspace.cancel_refused',
       request_id, correlation_id, null,
       'record:app.workspaces/' || workspace::text, null, refusal,
       true, true, true, 'retention.audit');
  end if;
  outcome := verdict;
  error_code := refusal;
  lifecycle_state := null;
end
$$;

alter function app.close_workspace(uuid, text, text) owner to app_command;
alter function app.cancel_workspace_closing(uuid, text, text) owner to app_command;

comment on function app.close_workspace(uuid, text, text) is
  'The §11.4 closing command (batch 141; RFC-2026-023 §8, RFC-2026-026 §3.3-§3.6): active -> closing, by the '
  'workspace''s active owner, after step-up (aal2 in the claims). Writes its audit row in the same transaction: '
  'succeeded outside the exception block, so an audit refusal raises and nothing commits; denied or failed, with '
  'no business or page, only in a workspace the acting user is an active member of. Returns '
  '(outcome, error_code, lifecycle_state); never raises for a user''s denial. SECURITY DEFINER owned by '
  'app_command; EXECUTE to authenticated alone.';
comment on function app.cancel_workspace_closing(uuid, text, text) is
  'The §11.4 recovery-window cancel (batch 141; RFC-2026-023 §8): closing -> active, by the workspace''s active '
  'owner. The window itself is DATA-DEC-04 and is not encoded: any closing workspace is admitted until it is '
  'approved. Audited as app.close_workspace is. SECURITY DEFINER owned by app_command; EXECUTE to authenticated '
  'alone.';

-- RFC-2026-026 §8.1/6: EXECUTE on a command function is held by authenticated ALONE, so the owner's implicit
-- grant is revoked too. A SECURITY DEFINER function checks the CALLER's EXECUTE, never the owner's, so this costs
-- the command nothing; it means app_command, reached by SET ROLE, cannot call its own commands.
revoke all on function app.close_workspace(uuid, text, text) from public;
revoke all on function app.cancel_workspace_closing(uuid, text, text) from public;
revoke all on function app.close_workspace(uuid, text, text) from app_command;
revoke all on function app.cancel_workspace_closing(uuid, text, text) from app_command;
grant execute on function app.close_workspace(uuid, text, text) to authenticated;
grant execute on function app.cancel_workspace_closing(uuid, text, text) to authenticated;

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED
-- ============================================================================================
-- Re-run by the post-migrate pass after the last migration. The string pins (each policy's deparse, each
-- function's body digest) live in scripts/db/run.mjs, once; this block holds the structure: who owns what,
-- who may execute what, and what app_command may reach. pg_roles, never pg_authid (batch 020's reason).
do $$
declare
  offending text;
  count_of  integer;
begin
  -- 1. The five functions this file creates: SECURITY DEFINER, search_path '', owned as RFC-2026-023 §3.2 and
  --    §8/1 say, and no EXECUTE for PUBLIC.
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s owned by %s%s%s', p.oid::regprocedure, pg_catalog.pg_get_userbyid(p.proowner),
                  case when not p.prosecdef then ' [not SECURITY DEFINER]' else '' end,
                  case when p.proconfig is distinct from array['search_path=""'] then ' [search_path]' else '' end) as x,
           p.oid, p.proowner, p.prosecdef, p.proconfig
      from pg_catalog.pg_proc p
     where p.oid in ('app.acting_user_admits_business(uuid, uuid)'::regprocedure,
                     'app.acting_user_admits_page(uuid, uuid, uuid)'::regprocedure,
                     'app.jwt_aal()'::regprocedure,
                     'app.close_workspace(uuid, text, text)'::regprocedure,
                     'app.cancel_workspace_closing(uuid, text, text)'::regprocedure)
  ) f
   where not f.prosecdef or f.proconfig is distinct from array['search_path=""']
      or pg_catalog.pg_get_userbyid(f.proowner)
         <> case when f.oid in ('app.close_workspace(uuid, text, text)'::regprocedure,
                                'app.cancel_workspace_closing(uuid, text, text)'::regprocedure)
                 then 'app_command' else 'app_authz' end;
  if offending is not null then
    raise exception 'a batch 141 function is not in the shape RFC-2026-023 gives it: %', offending;
  end if;

  -- 2. Who may execute them (RFC-2026-023 §3.2: the helpers to app_command alone; RFC-2026-026 §8.1/6: a
  --    command function to authenticated alone). Asked of every role a session could be.
  select string_agg(format('%s by %s', f.fn, r.rolname), ', ' order by f.fn, r.rolname) into offending
    from (values ('app.acting_user_admits_business(uuid, uuid)', 'app_command'),
                 ('app.acting_user_admits_page(uuid, uuid, uuid)', 'app_command'),
                 ('app.jwt_aal()', 'app_command'),
                 ('app.close_workspace(uuid, text, text)', 'authenticated'),
                 ('app.cancel_workspace_closing(uuid, text, text)', 'authenticated')) as f(fn, allowed)
    cross join pg_catalog.pg_roles r
   where r.rolname in ('anon', 'authenticated', 'service_role', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
     and r.rolname <> f.allowed
     and not (r.rolname = 'app_authz' and f.allowed = 'app_command')  -- app_authz OWNS the three helpers (011's shape)
     and pg_catalog.has_function_privilege(r.rolname, f.fn::regprocedure, 'EXECUTE');
  if offending is not null then
    raise exception 'a batch 141 function is executable by a role its RFC does not name: %', offending;
  end if;
  if pg_catalog.has_function_privilege('public', 'app.close_workspace(uuid, text, text)'::regprocedure, 'EXECUTE')
     or pg_catalog.has_function_privilege('public', 'app.cancel_workspace_closing(uuid, text, text)'::regprocedure, 'EXECUTE') then
    raise exception 'PUBLIC can execute a command function; RFC-2026-026 §8.1/6 gives EXECUTE to authenticated alone';
  end if;

  -- 3. app_command's table privileges are exactly the four the closing command and the producer need: SELECT
  --    (id, lifecycle_state) and UPDATE (lifecycle_state, updated_by) on app.workspaces, INSERT on
  --    app.audit_logs, and nothing anywhere else in app or private.
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s.%s %s', n.nspname, c.relname, pv.p) as x
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace,
           unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) as pv(p)
     where n.nspname in ('app', 'private') and c.relkind in ('r', 'p', 'v', 'm', 'f')
       and pg_catalog.has_table_privilege('app_command', c.oid, pv.p)
       and not (c.oid = 'app.audit_logs'::regclass and pv.p = 'INSERT')
    union all
    select format('%s.%s.%s %s', n.nspname, c.relname, a.attname, pv.p)
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped,
           unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) as pv(p)
     where n.nspname in ('app', 'private') and c.relkind in ('r', 'p', 'v', 'm', 'f')
       and pg_catalog.has_column_privilege('app_command', c.oid, a.attnum, pv.p)
       and not (c.oid = 'app.audit_logs'::regclass and pv.p = 'INSERT')
       and not (c.oid = 'app.workspaces'::regclass and pv.p = 'SELECT' and a.attname in ('id', 'lifecycle_state'))
       and not (c.oid = 'app.workspaces'::regclass and pv.p = 'UPDATE' and a.attname in ('lifecycle_state', 'updated_by'))
  ) f;
  if offending is not null then
    raise exception 'app_command holds a privilege the closing command and the audit producer do not need: %', offending;
  end if;

  -- 4. The policies naming app_command are exactly the three this file writes, under their names and commands
  --    (RFC-2026-023 §8/2, Q0-RC1; RFC-2026-026 §3.3), each for app_command alone and permissive.
  select string_agg(format('%s.%s', c.relname, p.polname), ', ' order by c.relname, p.polname) into offending
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
   where exists (select 1 from pg_catalog.pg_roles r where r.oid = any (p.polroles) and r.rolname = 'app_command')
     and not (p.polpermissive and cardinality(p.polroles) = 1
              and ((c.oid = 'app.workspaces'::regclass and p.polname = 'workspaces_select_command_owner' and p.polcmd = 'r')
                or (c.oid = 'app.workspaces'::regclass and p.polname = 'workspaces_update_command_owner' and p.polcmd = 'w')
                or (c.oid = 'app.audit_logs'::regclass and p.polname = 'audit_logs_insert_command' and p.polcmd = 'a')));
  select count(*) into count_of
    from pg_catalog.pg_policy p
   where exists (select 1 from pg_catalog.pg_roles r where r.oid = any (p.polroles) and r.rolname = 'app_command');
  if offending is not null or count_of <> 3 then
    raise exception 'the policies naming app_command are not exactly batch 141''s three (% found; unexpected: %)', count_of, coalesce(offending, '(none)');
  end if;

  -- 5. The admitted literal bounds the closing command's TARGET state (RFC-2026-023 §8/2, C0-3): it is 171's.
  if coalesce(pg_catalog.strpos((select pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid) from pg_catalog.pg_policy p
                                  where p.polrelid = 'app.workspaces'::regclass and p.polname = 'workspaces_update_command_owner'),
                                '(lifecycle_state = ANY (ARRAY[''active''::text, ''closing''::text]))'), 0) = 0 then
    raise exception 'workspaces_update_command_owner does not bound the target state by 171''s admitted literal';
  end if;

  -- 6. app_command is still what RFC-2026-017 §3 made it: no BYPASSRLS, and owner of no table.
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'app_command' and (rolbypassrls or rolsuper or rolcanlogin)) then
    raise exception 'app_command bypasses row level security, is a superuser or can log in';
  end if;
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('app', 'private') and pg_catalog.pg_get_userbyid(c.relowner) = 'app_command';
  if offending is not null then
    raise exception 'app_command owns a table (%); a SECURITY DEFINER function owned by a table''s owner is exempt from its policies', offending;
  end if;
end $$;
