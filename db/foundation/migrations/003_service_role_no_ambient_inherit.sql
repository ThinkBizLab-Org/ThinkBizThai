-- Batch 003 — corrects batch 002.
--
-- Batch 002's comment claimed: "INHERIT stays FALSE. The privileges must be taken by an explicit
-- SET ROLE, never acquired ambiently." It then used `alter role app_worker noinherit` to achieve
-- it, which is the wrong instrument entirely:
--
--   * `alter role r noinherit`     controls whether r inherits from roles R IS A MEMBER OF.
--   * the grant's `inherit_option` controls whether the MEMBER inherits from r.
--
-- They are different switches. `grant app_worker to postgres with set true` left inherit_option at
-- its default of TRUE, so postgres held app_worker's privileges ambiently — the exact property the
-- comment said was being avoided. Measured after applying 002:
--
--   app_worker -> postgres   admin_option t, set_option f, inherit_option f   (from CREATE ROLE)
--   app_worker -> postgres   admin_option f, set_option t, inherit_option t   (from the grant)
--
-- This is a forward fix, not a rewrite: batch 002 is already applied and migration invariant 1
-- forbids rewriting an applied migration. Re-granting with both options stated explicitly is
-- idempotent and leaves the membership in the intended state.
--
-- Does it matter in practice? `postgres` bypasses RLS, so inheriting app_worker grants it nothing
-- it did not already have. It matters because the RECORD said one thing and the database did
-- another, and a record that does not describe the database is the defect this repository exists
-- to remove — including when the wrong record is one I wrote an hour earlier.

grant app_worker      to postgres with inherit false, set true;
grant app_command     to postgres with inherit false, set true;
grant app_maintenance to postgres with inherit false, set true;
