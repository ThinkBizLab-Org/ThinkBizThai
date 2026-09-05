-- Batch 000 — schemas, extensions, conventions, helpers.
--
-- Owner: A0 Integration / DB-00. The migration registry reserves 000 to this package alone.
--
-- DATA-DEC-01 is Approved (RFC-2026-015): the exposed application schema is `app`.
-- DATA-DEC-02 is Approved: tooling is a wrapper command contract; no runner is named here, so this
-- file is plain SQL any runner can apply.
--
-- What this batch deliberately does NOT do:
--   * It creates no tenant table, so it enables no row level security and writes no policy.
--     RFC-2026-016 is Proposed and would change the policy SHAPE every later batch inherits: the
--     baseline writes policies `TO authenticated` only, while the same document marks a long list
--     of operations service-only, so under FORCE ROW LEVEL SECURITY every service operation is
--     denied. Migration invariant 1 forbids rewriting a merged migration, so writing the shape now
--     would commit batches 010..180 to the wrong one. The helper below is written so the correct
--     shape drops in without touching this file.
--   * It grants nothing to `authenticated`. There is nothing yet to grant on, and a grant issued
--     ahead of its table is a grant nobody reviews against a schema.

-- Extensions. Approved set only, and each with a reason it is needed at foundation level.
-- `pgcrypto` is required for gen_random_uuid(); §3.2 makes uuid the domain identifier and allows
-- the application to generate the ID before the transaction, so the default is a fallback rather
-- than the normal path.
create extension if not exists pgcrypto with schema public;

-- Schemas. §3.1 fixes the set and their access rules.
--   app      exposed application schema, tenant-facing, reached only through RLS  (DATA-DEC-01)
--   private  authorization helpers, secret references, raw webhook and worker payload; NO direct grant
-- `auth`, `storage` and `realtime` are Supabase-managed. This migration must never create or alter
-- an object in them, and the schema lint asserts that it does not.
create schema if not exists app;
create schema if not exists private;

comment on schema app is
  'Exposed application schema (DATA-DEC-01, RFC-2026-015). Tenant-facing. Every table carries RLS; '
  'every view is security invoker. Reached by client roles only through RLS.';
comment on schema private is
  'Authorization helpers, secret references, raw webhook payloads, worker payloads, reconciliation. '
  'No direct grant to any client role. Server and worker paths reach it through typed functions only.';

-- No client role may reach `private`, and none may create objects in `app`.
revoke all on schema private from public;
revoke create on schema app from public;

-- Convention helpers.
--
-- `private.set_updated_at()` backs §3.2's rule that every mutable row carries created_at and
-- updated_at. It is written the way §8.5 requires of every security definer function: an empty
-- search_path, so no caller-controlled schema can shadow an unqualified name.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function private.set_updated_at() is
  'Trigger helper: maintains updated_at on mutable rows (§3.2). SECURITY DEFINER with an empty '
  'search_path so an unqualified name cannot be shadowed by a caller-controlled schema.';

revoke all on function private.set_updated_at() from public;
