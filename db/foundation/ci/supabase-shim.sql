-- A SHIM, not Supabase.
--
-- CI runs against a bare `postgres:17` service container. Our migrations reference things the
-- managed platform provides and a bare Postgres does not: the `auth` schema, `auth.uid()`, and the
-- roles `anon`, `authenticated` and `service_role`. This file creates enough of them for the
-- policies to be exercised.
--
-- **What this proves and what it cannot.**
--   It proves OUR policies behave as written: which identity sees which row, which write is
--   refused, which is filtered. That is a regression suite, and it runs on every pull request.
--
--   It proves NOTHING about the platform. `service_role` here is a role this file created; on
--   Supabase it is a role that ships with BYPASSRLS, which is the single measurement that decided
--   DATA-DEC-03. A shim cannot tell you what the vendor does — only a query against a provisioned
--   instance can, and that stays a separate, occasional check.
--
-- So: read a green CI run as "the policies still do what they did", never as "this works on
-- Supabase". The two claims are different sizes and the smaller one is the one CI makes.

create schema if not exists auth;

-- The platform roles our grants and policies name. NOLOGIN: the harness assumes them with SET ROLE
-- exactly as the auth-context helpers do, never by connecting as them.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  -- service_role is created WITHOUT bypassrls here, and that is a deliberate difference from the
  -- platform, stated rather than hidden: on Supabase it HAS bypassrls. Giving it bypassrls here
  -- would make every policy inert and the suite would pass while testing nothing. Giving it none
  -- makes the shim stricter than production, which is the safe direction for a regression suite —
  -- and the reason the real check still has to happen against a real instance.
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit;
  end if;
end $$;

-- `auth.uid()` reads the JWT subject the request set. The platform reads the same GUC; this is the
-- one piece of the shim that behaves identically, because the contract is the GUC, not the vendor.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    current_setting('request.jwt.claims', true)::json ->> 'sub',
    ''
  )::uuid;
$$;

comment on function auth.uid() is
  'CI SHIM. Reads request.jwt.claims->>sub, which is the same contract the platform uses. Present '
  'so policies written against auth.uid() can be exercised without Supabase. It is not Supabase.';
