-- Batch 173: the worker's login identity (RFC-2026-028 §3.1, §4/1), inert until an operator gives it a credential.
--
-- A0 author (the role topology, 001-004, is A0's foundation work); A1 review as DATA-DEC-03's co-owner. The decision
-- is RFC-2026-028, APPROVED 2026-10-05 through the Owner's delegation of A0's recommendation (the identity and its
-- pins, §3.1-§3.3, §3.6, §4/1; Q-028-1..13 answered as A0 recommended). Plan
-- evidence/WP-0A-DB-00/a0-batch-173-worker-plan-2026-10-03.md; disposition
-- evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-173-worker.md.
--
-- THE NUMBER (Q-028-9, answered as A0 recommended: "the next free number above the highest merged migration"). 172
-- is the highest merged migration; 173 is the next free number and sorts after it, so on an instance that holds the
-- later set this file never runs out of order. It sits outside A0's foundation range (001-004) as a one-time
-- exception to the registry's ranges, the way Q150-c's was; the Integration Owner's acceptance is owed
-- (open_blockers[201] (1)).
--
-- WHAT IT CREATES, AND NOTHING ELSE:
--   * one role, app_worker_login: LOGIN, and every other attribute a role can hold stated false -- NOSUPERUSER
--     NOBYPASSRLS NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION -- with NO credential (the clause below sets
--     none, so the role cannot authenticate on any instance whose every pg_hba line reaching it asks for one);
--   * one membership: app_worker_login in app_worker, WITH INHERIT FALSE, SET TRUE, ADMIN FALSE. Both switches
--     (003's lesson): NOINHERIT on the role AND inherit_option false on the grant, so neither a later
--     `alter role ... inherit` nor a re-grant with the default option alone hands it the worker's reach. It holds
--     app_worker's privileges only after `set local role app_worker`, never ambiently; a statement issued before
--     that fails closed, 42501 "permission denied for schema app" (it holds no USAGE on app).
-- It owns nothing, holds no privilege of its own, has no default setting and no connection limit (Q-028-11's
-- limit is the worker pool's size, which no decision has fixed yet; owed, open_blockers[201] (4)). It is not
-- app_command's or app_maintenance's: one credential that could become the cross-tenant role would make every
-- confinement a choice of the process (RFC-2026-028 §3.1, §6 D).
--
-- THE CREDENTIAL (RFC-2026-028 §3.3). No migration, fixture, test, evidence file, handoff, CI log or URL in this
-- repository carries one. On the provisioned instance the provisioning runbook sets a SCRAM-SHA-256 verifier out of
-- band, computed client-side (Q-028-3, the Integration Owner's with operations, conditions on open_blockers[199]
-- (8)(c)). Locally and in CI the rls-smoke harness (scripts/db/authz-proofs.mjs, the worker login proofs) sets a
-- per-run generated test credential after migrate-clean has finished, and removes it when it is done; no
-- apply-time block is ever re-run while it is set. The static rule in scripts/db/run.mjs (workerCredentialLint)
-- refuses any credential clause but the null one in every SQL source migrate-clean or rls-smoke feeds, and the
-- pinned grant probe's ninth rule reads, as the superuser that runs it, that no role but a superuser holds one on
-- a migrate-clean cluster. This file does not read the stored credential: only a superuser can, and a migration
-- that needs a superuser cannot apply where `postgres` is not one (020's rule).
--
-- createrole_self_grant (A1R-1 on RFC-2026-028's re-check). On PostgreSQL 16+, a non-superuser CREATEROLE role that
-- creates a role is granted ADMIN on it (admin t, inherit f, set f), and when createrole_self_grant is set it is
-- granted a SECOND row as well (A1 measured: admin f, inherit t, set t, grantor itself) -- with which the
-- migration owner could `set role app_worker_login` and act as the worker outside any custody. The setting is
-- user-settable, so it is emptied for this transaction before the role is created, and the block below reads
-- pg_auth_members PER ROW, never per member: exactly one row for the applier, with exactly those three options,
-- when the applier is not a superuser, and no row at all when it is (every migrate-clean cluster).
--
-- WHAT THIS DOES NOT DO. It writes no policy: every service cell's policy is its own batch's (RFC-2026-028 §3.5),
-- and until one lands app_worker reads and writes no row of any forced table, through this role or any other. It
-- grants nothing to authenticator (RFC-2026-019 §5's negative, extended by one name). It does not touch app.jobs:
-- Q-028-5's tenant-context columns are the next batch's (plan §4, D4). It is NOT applied to the provisioned
-- instance (catalog-snapshot.json declares it pending) until Q-028-13's measurement and Q170-c say how a
-- non-superuser CREATEROLE applier and the platform's createrole_self_grant behave there.
--
-- PINNED IN THE SAME DIFF (RFC-2026-028 §3.6), scripts/db/run.mjs: PINNED_ROLE_MEMBERSHIPS gains exactly
-- 'app_worker_login -> app_worker', and the fourth rule reads a pinned membership's three options per row
-- (Q-028-10); the eighth rule admits exactly one attribute, 'app_worker_login rolcanlogin'; the settings rule of the
-- client membership probe reads app_worker_login too, pinned empty. Unchanged and still holding it: the client
-- membership probe (nothing is a member of anon or authenticated), the seventh rule (no USAGE on app for the login
-- role), every grant rule (it holds nothing).
--
-- ROLLBACK / FORWARD FIX (RFC-2026-028 §7). A later forward migration revokes the membership and drops the role
-- (after its sessions are ended on any instance it reached), with the pins above reverted in the same diff; every
-- service cell returns to unreachable, which is the state before this file. The credential, where one was set, is
-- revoked in the secret store by the Integration Owner. Never an edit of this file once integrated.

set local createrole_self_grant = '';

create role app_worker_login with login nosuperuser nobypassrls noinherit nocreatedb nocreaterole noreplication password null;

grant app_worker to app_worker_login with inherit false, set true, admin false;

comment on role app_worker_login is
  'The worker''s login identity (RFC-2026-028, DATA-DEC-03). It can only become app_worker, and only by '
  'SET LOCAL ROLE per transaction (membership INHERIT FALSE, SET TRUE, ADMIN FALSE; the role NOINHERIT). '
  'Holds nothing of its own. Created with no credential: inert until an operator sets a verifier out of band.';

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED (RFC-2026-028 §4/1)
-- ============================================================================================
-- Re-run by the post-migrate pass after the last migration. It reads pg_roles, pg_auth_members, pg_shdepend (which
-- records default ACLs naming the role, so pg_default_acl is covered through it, not queried) and
-- pg_db_role_setting, every one readable without superuser, and never the stored credential.
do $$
declare
  offending text;
  login_oid pg_catalog.oid;
  applier_is_superuser boolean;
begin
  select r.oid into login_oid from pg_catalog.pg_roles r where r.rolname = 'app_worker_login';
  if login_oid is null then
    raise exception 'batch 173: the role app_worker_login does not exist'
      using hint = 'RFC-2026-028 §3.1: the worker''s login identity is created by 173 and dropped only by a forward migration.';
  end if;
  select r.rolsuper into applier_is_superuser from pg_catalog.pg_roles r where r.rolname = current_user;

  -- 1. Its attributes: LOGIN, and every other attribute false; no connection limit; no expiry.
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s = %s', a.k, a.v::text) as x
      from pg_catalog.pg_roles r
      cross join lateral (values ('rolcanlogin', r.rolcanlogin, true), ('rolsuper', r.rolsuper, false),
                                 ('rolinherit', r.rolinherit, false), ('rolbypassrls', r.rolbypassrls, false),
                                 ('rolcreatedb', r.rolcreatedb, false), ('rolcreaterole', r.rolcreaterole, false),
                                 ('rolreplication', r.rolreplication, false)) as a(k, v, want)
     where r.oid = login_oid and a.v is distinct from a.want
    union all
    select format('rolconnlimit = %s', r.rolconnlimit) from pg_catalog.pg_roles r where r.oid = login_oid and r.rolconnlimit <> -1
    union all
    select format('rolvaliduntil = %s', r.rolvaliduntil) from pg_catalog.pg_roles r where r.oid = login_oid and r.rolvaliduntil is not null
  ) f;
  if offending is not null then
    raise exception 'batch 173: app_worker_login''s attributes are not exactly LOGIN and nothing else: %', offending
      using hint = 'RFC-2026-028 §3.1: LOGIN NOSUPERUSER NOINHERIT NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION.';
  end if;

  -- 2. Its memberships, PER ROW (a second row with another grantor is a second membership): exactly one, in
  --    app_worker, with inherit false, set true, admin false.
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s (admin %s, inherit %s, set %s)', pg_catalog.pg_get_userbyid(m.roleid), m.admin_option::text, m.inherit_option::text, m.set_option::text) as x
      from pg_catalog.pg_auth_members m where m.member = login_oid
  ) f;
  if offending is distinct from 'app_worker (admin false, inherit false, set true)' then
    raise exception 'batch 173: app_worker_login''s memberships are not exactly app_worker (admin false, inherit false, set true): %', coalesce(offending, '(none)')
      using hint = 'RFC-2026-028 §3.1: it can become app_worker and nothing else, and only by SET LOCAL ROLE.';
  end if;

  -- 3. Its members, PER ROW (A1R-1). On a cluster whose applier is a superuser, none. Otherwise exactly one row,
  --    the applier's own CREATE ROLE admin row: admin true, inherit false, set false. createrole_self_grant's
  --    second row (admin false, inherit true, set true) is a second row and is refused here by name.
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s (admin %s, inherit %s, set %s)', pg_catalog.pg_get_userbyid(m.member), m.admin_option::text, m.inherit_option::text, m.set_option::text) as x
      from pg_catalog.pg_auth_members m where m.roleid = login_oid
  ) f;
  if offending is distinct from (case when applier_is_superuser then null
                                       else format('%s (admin true, inherit false, set false)', current_user) end) then
    raise exception 'batch 173: app_worker_login''s members are not exactly %: %',
      case when applier_is_superuser then 'none (the applier is a superuser)' else 'the applier''s CREATE ROLE admin row' end, coalesce(offending, '(none)')
      using hint = 'RFC-2026-028 §3.1, A1R-1: no member besides the applier''s admin row (admin t, inherit f, set f), read per pg_auth_members row.';
  end if;

  -- 4. It owns nothing and is named in no ACL, policy, initial privilege or default privilege, in this database or
  --    any other: no shared dependency on the role of any kind. (pg_shdepend is read by its class's name, which is
  --    a name lookup, not a read of the credential table.)
  select string_agg(format('%s %s', d.deptype, d.classid::pg_catalog.regclass), ', ' order by d.deptype, d.classid::pg_catalog.regclass::text) into offending
    from pg_catalog.pg_shdepend d
   where d.refclassid = 'pg_catalog.pg_authid'::pg_catalog.regclass and d.refobjid = login_oid;
  if offending is not null then
    raise exception 'batch 173: app_worker_login owns or is granted something of its own: %', offending
      using hint = 'RFC-2026-028 §3.1: it owns nothing and holds no privilege beyond what PUBLIC holds.';
  end if;

  -- 5. No effective privilege on app or private (under NOINHERIT and inherit false, app_worker's USAGE on app does
  --    not reach it), and no default setting for it in any database.
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s on %s', p.p, s.s) as x
      from unnest(array['app', 'private']) as s(s), unnest(array['USAGE', 'CREATE', 'USAGE WITH GRANT OPTION', 'CREATE WITH GRANT OPTION']) as p(p)
     where pg_catalog.has_schema_privilege('app_worker_login', s.s, p.p)
    union all
    select format('setting %s in %s', g.setting, coalesce('database ' || d.datname::text, 'every database'))
      from pg_catalog.pg_db_role_setting rs
      left join pg_catalog.pg_database d on d.oid = rs.setdatabase
      cross join lateral unnest(rs.setconfig) as g(setting)
     where rs.setrole = login_oid
  ) f;
  if offending is not null then
    raise exception 'batch 173: app_worker_login holds a schema privilege or a default setting: %', offending
      using hint = 'RFC-2026-028 §3.1, §3.6: a session-level role or search_path at login would defeat SET LOCAL ROLE.';
  end if;
end $$;
