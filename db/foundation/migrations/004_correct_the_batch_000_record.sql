-- Batch 004 — corrects batch 000's record, and turns the correction into a check.
--
-- Batch 010's header has cited "batch 004 corrects the record" since the day it was written, and
-- until now there was no batch 004. A1's countersignature (§5.3/§5.4,
-- evidence/WP-0A-DB-00/a1-countersignature-role-topology.md) found the dangling citation by reading
-- the tree, and the record it points at is still wrong on both of its claims:
--
--   000_foundation.sql:21  "`pgcrypto` is required for gen_random_uuid()"
--     Not since PostgreSQL 13, which moved gen_random_uuid() into pg_catalog. Nothing in this
--     database needs pgcrypto to make an id.
--
--   000_foundation.sql:24  `create extension if not exists pgcrypto with schema public;`
--     On the provisioned instance this was a NO-OP: pgcrypto already existed, in `extensions`
--     (measured 2026-09-06, pg_extension.extnamespace). The statement did not fail and did not do
--     what its own comment says it did.
--
-- Migration invariant 1 forbids rewriting an applied batch, so 000 keeps its text and this batch
-- carries the correction forward -- the same shape as 003 correcting 002.
--
-- What makes this more than a comment: the second claim COST something. Because the statement
-- succeeds on a bare container, `public.digest` existed in CI and nowhere else, and the isolation
-- fixture called it. The suite was green on every run and could not execute against the platform at
-- all. So the correction is written as an assertion, and the assertion is the part that stops it
-- happening again: if anyone reintroduces pgcrypto into `public` -- or removes the CI shim line that
-- puts it where the platform has it -- this batch fails, loudly, with the reason.
do $$
declare
  pgcrypto_schema text;
begin
  -- The property batch 010's `default gen_random_uuid()` actually depends on.
  if to_regproc('pg_catalog.gen_random_uuid') is null then
    raise exception 'gen_random_uuid() is not in pg_catalog on this server'
      using hint = 'Batch 010 defaults resolve it unqualified. PostgreSQL 13 and later carry it; '
                   'an older server needs pgcrypto AND a qualified default, and neither is written here.';
  end if;

  select extnamespace::regnamespace::text into pgcrypto_schema
  from pg_extension where extname = 'pgcrypto';

  -- Absent is fine: nothing in this database requires it. In `public` is not fine, because that is
  -- the arrangement under which CI and the platform disagree about what exists.
  if pgcrypto_schema = 'public' then
    raise exception 'pgcrypto is installed in public on this server, and it is in extensions on the platform'
      using hint = 'That difference is not cosmetic: it makes public.digest() exist here and not there, '
                   'so a test can pass in CI and be unable to run against the instance. Install it where '
                   'the platform has it (db/foundation/ci/supabase-shim.sql does this) rather than '
                   'writing code that depends on which schema it landed in.';
  end if;
end $$;
