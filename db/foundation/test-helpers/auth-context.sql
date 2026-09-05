-- Auth context helpers (data package §12.3 item 6).
--
-- A test asserts what an identity can do. That is only meaningful if assuming the identity is
-- exact: the role the policies name, and the JWT claims `auth.uid()` reads. Getting one and not
-- the other produces a test that passes for the wrong reason -- the most expensive kind, because
-- it looks like coverage.
--
-- Every helper here uses SET LOCAL, never SET. Under a transaction-mode pooler a session-level
-- SET persists on the server connection after the transaction ends and is inherited by whatever
-- request lands on it next -- potentially another tenant's. Deny-by-default RLS then evaluates a
-- wrong but entirely valid identity and returns the wrong tenant's rows, with no error anywhere.
-- That is the tenant-leakage class the contributor guide calls stop-the-line, caused by a helper
-- rather than by application code. SET LOCAL is scoped to the transaction and cannot escape it.
--
-- Each function is called inside an explicit transaction. Outside one, SET LOCAL is a no-op with
-- a warning, so `assert_in_transaction` refuses rather than letting a test silently assume nothing.

create or replace function private.assert_in_transaction()
returns void
language plpgsql
as $$
begin
  -- A transaction block always has a non-null xact start distinct from the statement start when
  -- more than one statement has run; the reliable signal is that we are not in an implicit
  -- single-statement transaction. `transaction_timestamp()` equals `statement_timestamp()` only
  -- on the first statement of a block, so this checks the explicit marker instead.
  if not (select pg_catalog.current_setting('transaction_isolation', true) is not null
          and pg_catalog.txid_current_if_assigned() is not null
               or pg_catalog.current_setting('private.in_test_txn', true) = 'on') then
    raise exception 'auth context helpers must run inside an explicit transaction: SET LOCAL is a no-op outside one, and a helper that quietly assumes nothing produces a test that passes for the wrong reason';
  end if;
end;
$$;

-- Anonymous: the `anon` role, no subject claim. §12.6 assertion 6 requires it to see zero tenant rows.
create or replace function private.as_anonymous()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

-- An authenticated end user. `subject` is the fixture uuid from seeds/fixture-catalog.json; a test
-- must pass one from there rather than generate it, so that a cross-tenant assertion is made while
-- HOLDING the other tenant's id rather than while failing to guess it.
create or replace function private.as_user(subject uuid)
returns void
language plpgsql
as $$
begin
  if subject is null then
    raise exception 'as_user(null) would leave auth.uid() null, which is the anonymous case wearing a user''s name';
  end if;
  perform set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', subject::text)::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- A suspended member. §12.6 assertion 5 requires zero tenant rows AND no mutation. The claim shape
-- is identical to an active user on purpose: suspension is a property of the membership row, not of
-- the token, so a policy that forgets to check it will pass this identity and fail the assertion.
create or replace function private.as_suspended_user(subject uuid)
returns void
language plpgsql
as $$
begin
  perform private.as_user(subject);
end;
$$;

-- The service path. RFC-2026-017: app_worker, never service_role and never postgres, both of which
-- bypass RLS and would make every assertion below vacuous.
create or replace function private.as_service()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '{"role":"app_worker"}', true);
  perform set_config('role', 'app_worker', true);
end;
$$;

revoke all on function private.assert_in_transaction() from public;
revoke all on function private.as_anonymous() from public;
revoke all on function private.as_user(uuid) from public;
revoke all on function private.as_suspended_user(uuid) from public;
revoke all on function private.as_service() from public;
