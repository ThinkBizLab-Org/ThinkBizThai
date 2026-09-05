-- Batch 001 — the service-path roles.
--
-- Owner: A0 Integration / DB-00. RFC-2026-017 §6 places the role topology in a foundation batch A0
-- owns rather than as a side effect of A1 writing tables.
--
-- Why these exist at all, measured on this instance rather than read from documentation:
--   service_role  BYPASSRLS  -- the Supabase server-side default
--   postgres      BYPASSRLS  -- the role in every direct connection string
-- Both bypass. So neither "use the service key" nor "use a direct driver instead" gives a service
-- path that RLS applies to, and the only remaining option is a role created for the purpose.
--
-- Each role below is created NOLOGIN, with no password, holding no grant and no membership.
--   * NOLOGIN and no password: nothing to leak and nothing to authenticate as. A role becomes
--     reachable only when something is deliberately granted membership in it, in a later batch,
--     in a diff a reviewer reads.
--   * NOBYPASSRLS is stated explicitly rather than relied on as the default. The default is
--     correct today; a default is not a decision, and this one is load-bearing.
--   * No grants: a role that can reach nothing cannot leak anything while the tables it will
--     eventually work on do not exist yet.
--
-- What this batch deliberately does NOT do:
--   * It grants no membership to `authenticator`. Whether the API path assumes these roles through
--     PostgREST or a driver issues SET LOCAL ROLE is a connection-method question RFC-2026-017 did
--     not settle, and granting membership now would pick it silently.
--   * It writes no policy. There is no table to write one on; batch 010 is A1 Identity's, and
--     policies land in the same migration as the table they protect.

-- Background work: publish delivery, usage ledger writes, notification state, research rows,
-- job and attempt rows — every operation the access matrix marks service-only.
create role app_worker with nologin nobypassrls noinherit;
comment on role app_worker is
  'Service path for background work (RFC-2026-017). NOBYPASSRLS: RLS applies to it, which is the '
  'entire point. Reaches tenant rows only through policies that name it.';

-- Owns the SECURITY DEFINER command functions that perform user-initiated writes.
-- Deliberately NOT the table owner: a SECURITY DEFINER function executes as its owner, so a
-- function owned by the table owner is subject to RLS on a forced table only if that owner is a
-- role the policies can name.
create role app_command with nologin nobypassrls noinherit;
comment on role app_command is
  'Owns the SECURITY DEFINER command functions (RFC-2026-017). NOBYPASSRLS, and never the table '
  'owner, so the policies written for it actually apply to it.';

-- The only cross-tenant path: retention sweeps, purge verification, chunked backfills.
-- It crosses tenants through explicit USING (true) policies on named tables and named operations,
-- never through a role attribute — a policy can be enumerated, scoped and tested against;
-- BYPASSRLS is invisible to every RLS test ever written and cannot be narrowed.
create role app_maintenance with nologin nobypassrls noinherit;
comment on role app_maintenance is
  'The only cross-tenant path (RFC-2026-017). NOBYPASSRLS. Crosses tenants through explicit '
  'USING (true) policies on named tables and operations, each use carrying a recorded reason.';
