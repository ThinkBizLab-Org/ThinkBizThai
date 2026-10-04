-- Batch 170 (first migration): no client moves a workspace's lifecycle state.
--
-- A0 author, A1 review; number 170, the next free number in batch 170's range (Q-027-6, answered
-- 2026-10-04 as A0 recommended: `ลุยต่อเลย เอาตามแนะนำ`, transcribed in
-- evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-rfc-026-027.md §8). The change is
-- Q-026-5 / Q-027-5's, answered "revoke" in the same words: the client UPDATE of
-- app.workspaces.lifecycle_state is revoked in the FIRST of batch 170's migrations. Disposition
-- evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-170.md; plan
-- evidence/WP-0A-DB-00/a0-batch-170-plan-2026-10-03.md. Neither RFC-2026-026 nor RFC-2026-027 is
-- approved, and this file depends on neither (C0-8 on the RFC batch: the revoke needs nothing either
-- RFC decides).
--
-- THE FINDING (open_blockers[195] (1), measured by C0, A1 and Q0 on the RFC batch and again by A0 on
-- main 9a07459 before this file was written). 010_identity.sql:403 grants authenticated
-- `UPDATE (name, lifecycle_state, updated_by)` on app.workspaces, and workspaces_update_owner's WITH
-- CHECK (010_identity.sql:509-517) tests only that the caller is the row's active owner; it does not
-- bound the NEW lifecycle_state. PostgreSQL checks the table's SELECT policies against the new row only
-- when the statement reads a column (in WHERE, RETURNING or a SET expression), so:
--   * an UPDATE that reads a column (`where id = ...`, `returning id`, a CASE on id in SET, the
--     PostgREST-shaped CTE with `where id = ...`) was admitted to 'active' and 'closing' and refused
--     42501 by workspaces_select_active_member for the six other states;
--   * an UPDATE that reads NO column (no WHERE; `where true`; `returning 1`; the PostgREST-shaped CTE
--     with no filter and `returning 1`; lifecycle_state alone with no WHERE) was admitted to ALL EIGHT
--     states and moved EVERY workspace the caller owns at once -- to access_blocked, purge_queued, held,
--     purging, verify or deleted -- with no step-up, no recovery window (ERD §11.4, DATA-DEC-04) and no
--     audit row, and the owner could not move it back (workspaces_update_owner's USING admits only
--     active and closing). A1 named two conditions under which that becomes stop-the-line ([195] (4)):
--     RFC-2026-027's gate landing without this revoke, and any job selecting workspaces by
--     lifecycle_state. This file is the precondition of both.
--
-- THE CHANGE, AND NOTHING ELSE. One column leaves one role's UPDATE grant:
--
--   revoke update (lifecycle_state) on app.workspaces from authenticated;
--
-- The owner still updates `name` and `updated_by` exactly as before; workspaces_update_owner,
-- workspaces_select_active_member and 105's workspaces_updated_by_on_update_is_caller are untouched, and
-- so is every other grant on the table: authenticated's SELECT of all seven columns (members still READ
-- the state), and app_worker's table-level SELECT, INSERT and UPDATE. anon and PUBLIC held no privilege
-- on the column before this file (measured: has_column_privilege false for UPDATE and INSERT), so there
-- is nothing to revoke from them; the block below asserts they still hold none. Every form the finding
-- recorded now fails at the privilege layer, 42501 "permission denied for table workspaces", before any
-- policy is read -- whether or not the statement reads a column, and for 'active' and 'closing' as well
-- as for the six blocked states.
--
-- WHAT WRITES lifecycle_state NOW: NOTHING ON A REQUEST PATH. The writer §11.4 needs is a step-up command
-- (RFC-2026-023's command functions, RFC-2026-026's command producer for its audit row) or the worker the
-- RFC that creates it names (DATA-DEC-03, open_blockers[113]). Neither exists. app_worker keeps 010's
-- table-level UPDATE, and its only member is `postgres`, which bypasses row level security; no login
-- role holds it (RFC-2026-022 §5/8, NOT IN EFFECT). So until that command lands, no workspace changes
-- state except by a superuser's hand, and §11.4's first transition -- Active to Closing, "owner confirms +
-- step-up", step 1 "Mark Workspace `closing`; write audit event" -- has no client path at all, and neither
-- has Closing to Active ("cancel within recovery window"), which the targeted form admitted before this
-- file. That is the cost of the Owner's answer, stated rather than hidden: a closing nobody can request
-- yet is recoverable; a move past the recovery window that skips step-up and audit is not.
--
-- MIGRATION INVARIANT 1. 010 is integrated and is not edited; its grant at line 403 stays in its text and
-- this forward migration narrows it. 010 has no apply-time block, so no superseded.json entry is needed.
-- The column comment 010 applied is replaced below, because "Read access stops at access_blocked" is
-- still true and "who moves it" was unstated.
--
-- PINNED IN THE SAME DIFF: db/foundation/lint/pinned-grants.json (authenticated's UPDATE on app.workspaces
-- is ["name", "updated_by"]), regenerated by scripts/db/generate-pinned-grants.mjs on the clean set and
-- reviewed; the pinned grant probe in migrate-clean holds it.
--
-- ROLLBACK / FORWARD FIX. `grant update (lifecycle_state) on app.workspaces to authenticated` in a later
-- forward migration restores the old privilege exactly (and reopens the finding). Nothing else in the
-- schema depends on the client holding it: no policy, trigger or function reads the column privilege.

revoke update (lifecycle_state) on app.workspaces from authenticated;

comment on column app.workspaces.lifecycle_state is
  'TENANT-1. §11.4. Read access stops at access_blocked: the transition out of closing is defined '
  'as revoking sessions, connectors and jobs, so a workspace past it is not readable by members. '
  'NO CLIENT ROLE WRITES IT (batch 170, Q-026-5 / Q-027-5 answered "revoke"): every §11.4 transition '
  'belongs to a step-up command (RFC-2026-023 / RFC-2026-026) or the worker (DATA-DEC-03), and until '
  'one exists nothing on a request path moves it.';

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED
-- ============================================================================================
-- Re-run by the post-migrate pass after the last migration, so a later file that grants the column back
-- to a client fails migrate-clean here as well as in the pinned grant probe.
do $$
declare
  offending text;
begin
  -- 1. No client role holds UPDATE or INSERT on lifecycle_state, by column or by table, with or without
  --    grant option. has_column_privilege is true when the table-level privilege holds, so one reading
  --    covers both levels; PUBLIC is read by its pseudo-role name.
  select string_agg(format('%s %s', cr.r, p.p), ', ' order by cr.r, p.p) into offending
    from unnest(array['anon', 'authenticated', 'public']) as cr(r),
         unnest(array['UPDATE', 'INSERT', 'UPDATE WITH GRANT OPTION', 'INSERT WITH GRANT OPTION']) as p(p)
   where pg_catalog.has_column_privilege(cr.r, 'app.workspaces', 'lifecycle_state', p.p);
  if offending is not null then
    raise exception 'a client role can write app.workspaces.lifecycle_state: %', offending
      using hint = 'Batch 170 (Q-026-5 / Q-027-5, revoke): a §11.4 transition belongs to a step-up command or the worker, never to a client UPDATE.';
  end if;

  -- 2. The owner's other UPDATE columns are unchanged: authenticated updates exactly name and updated_by,
  --    by column grant, and holds no table-level UPDATE.
  select string_agg(a.attname, ', ' order by a.attnum) into offending
    from pg_catalog.pg_attribute a
   where a.attrelid = 'app.workspaces'::regclass and a.attnum > 0 and not a.attisdropped
     and pg_catalog.has_column_privilege('authenticated', 'app.workspaces', a.attname, 'UPDATE');
  if offending is distinct from 'name, updated_by'
     or pg_catalog.has_table_privilege('authenticated', 'app.workspaces', 'UPDATE') then
    raise exception 'authenticated''s UPDATE on app.workspaces is not exactly (name, updated_by): %', coalesce(offending, '(none)')
      using hint = 'Batch 170 revoked lifecycle_state alone; the owner still renames the workspace and names itself as its updater.';
  end if;

  -- 3. Members still READ the state: authenticated's SELECT projection is 010's seven columns, unchanged.
  select string_agg(a.attname, ', ' order by a.attnum) into offending
    from pg_catalog.pg_attribute a
   where a.attrelid = 'app.workspaces'::regclass and a.attnum > 0 and not a.attisdropped
     and pg_catalog.has_column_privilege('authenticated', 'app.workspaces', a.attname, 'SELECT');
  if offending is distinct from 'id, name, lifecycle_state, created_at, updated_at, created_by, updated_by' then
    raise exception 'authenticated''s SELECT on app.workspaces changed: %', coalesce(offending, '(none)')
      using hint = 'Batch 170 changes the client UPDATE of one column and no read.';
  end if;
end $$;
