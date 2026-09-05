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
-- a warning, so each helper reads its setting back and raises rather than letting a test silently
-- assume nothing and run as whatever identity the connection already had.

-- What matters is not "are we in a transaction" — that is a proxy. What matters is whether
-- SET LOCAL will actually stick, because a helper that silently sets nothing leaves the test
-- running as whatever identity the connection already had.
--
-- So the property is tested DIRECTLY: set the value, read it back, and raise if it did not take.
-- Outside a transaction block SET LOCAL is a no-op with a warning, so the read-back returns the
-- previous value and this raises. Inside one it takes, and this passes.
--
-- Two earlier versions were proxies and both were wrong in their own way. The first required a
-- transaction id, which a read-only transaction never has, so it refused inside a legitimate read
-- block and had to be worked around with a GUC — A1 found that. The second compared
-- transaction_timestamp() with statement_timestamp(), which are equal on the FIRST statement after
-- BEGIN, so it refused the very call pattern the helpers are used with and forced every caller to
-- insert a dummy statement first. A guard that has to be worked around is a guard on its way to
-- being deleted, and that is A1's line, earned twice.
create or replace function private.assert_local_setting_took(setting text, expected text)
returns void
language plpgsql
as $$
declare actual text;
begin
  actual := current_setting(setting, true);
  if actual is distinct from expected then
    raise exception 'SET LOCAL % did not take effect', setting
      using hint = 'SET LOCAL outside a transaction block is a no-op, so the identity was never assumed and '
                   'the test would have run as whatever identity the connection already had. Wrap the case in '
                   'BEGIN ... ROLLBACK.';
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
  perform private.assert_local_setting_took('role', 'anon');
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
  perform private.assert_local_setting_took('role', 'authenticated');
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
  perform private.assert_local_setting_took('role', 'app_worker');
end;
$$;

revoke all on function private.assert_local_setting_took(text, text) from public;
revoke all on function private.as_anonymous() from public;
revoke all on function private.as_user(uuid) from public;
revoke all on function private.as_suspended_user(uuid) from public;
revoke all on function private.as_service() from public;
