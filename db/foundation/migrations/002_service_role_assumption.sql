-- Batch 002 — make the service roles assumable by the administrative role.
--
-- Batch 001 created app_worker, app_command and app_maintenance with no memberships, deliberately:
-- granting one picks the connection method, and RFC-2026-017 did not settle that.
--
-- What that missed, and what A1 caught while writing the first isolation tests: PostgreSQL 16
-- separates ADMIN from SET. Creating a role gives the creator ADMIN OPTION, which permits granting
-- the role onward -- and NOT set_option, which is what `SET ROLE` requires. Measured on this
-- instance before writing this file:
--
--   pg_auth_members: postgres -> app_worker      admin_option t, set_option f, inherit_option f
--   SET ROLE app_worker       -> permission denied to set role "app_worker" (SQLSTATE 42501)
--   SET ROLE authenticated    -> ok                      (the control: the probe itself works)
--
-- So every service-path assertion would have failed at the assume-identity step, before testing
-- anything. And it would have failed with **42501** -- the same SQLSTATE an RLS refusal raises.
-- A suite that checked only the code would have read "RLS denied it" from "could not become the
-- role at all", and reported isolation it never tested.
--
-- What this grants, and what it deliberately does not:
--   * SET to `postgres`, the administrative and migration role, so tests and maintenance can
--     assume these identities explicitly. `postgres` already bypasses RLS, so this widens nothing:
--     it can already do everything these roles can, and more.
--   * INHERIT was INTENDED to stay false — the privileges taken by an explicit SET ROLE, never
--     acquired ambiently, because ambient authority is how a service path ends up running with
--     more than it declared. **The statements below do not achieve that**, and batch 003 corrects
--     it: `alter role r noinherit` controls whether r inherits from roles it belongs to, not
--     whether the grantee inherits from r. Left uncorrected, postgres held these privileges
--     ambiently. Kept here as applied rather than rewritten, per migration invariant 1.
--   * NOTHING to `authenticator`. That is the API path's connection role, and granting it
--     membership is what picks PostgREST-versus-driver -- the question RFC-2026-017 left open.
--     It stays open here.

grant app_worker     to postgres with set true;
grant app_command    to postgres with set true;
grant app_maintenance to postgres with set true;

-- INHERIT off is the default for these grants under `noinherit` roles, but the property is
-- load-bearing, so it is stated rather than assumed -- the same reason batch 001 spells out
-- NOBYPASSRLS instead of relying on the default.
alter role app_worker      noinherit;
alter role app_command     noinherit;
alter role app_maintenance noinherit;
