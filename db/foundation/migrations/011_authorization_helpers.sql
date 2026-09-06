-- Batch 011 — authorization helpers v1.
--
-- Owner: A1 Identity, with the Security review the migration ownership registry names as this
-- batch's co-owner. The registry reserves 011 to "authorization helpers v1" and makes it depend
-- on 010, which is applied.
--
-- Implements RFC-2026-020 (approved 2026-09-06 by the Product Owner). That decision closes the
-- question 010's header declared open — which role owns the authorization helper — and its
-- approval carries a condition: it is NOT IN EFFECT until §6 holds, including §6.2's two claims,
-- which must be discharged by EXECUTION and never by citation. Those two are executed by
-- scripts/db/authz-proofs.mjs against the CI Postgres container, on every pull request, and
-- `make db-rls-smoke` fails the build if either does not hold. If the SECURITY DEFINER helper is
-- ever inlined, RFC-2026-020 is wrong and this file must be reverted rather than patched.
--
-- Nothing here rewrites 010. Migration invariant 1 forbids it, 010 is applied, and 010's own
-- header says its predicates were written to be WIDENED rather than corrected: RLS policies are
-- permissive and OR together, so the roster policy below ADDS to
-- `workspace_members_select_own_active` without touching it.
--
--
-- WHAT THIS BATCH CREATES
--
--   * `app_authz` — a fourth role that is not a path (RFC-2026-020 §5/1-2). NOLOGIN NOBYPASSRLS
--     NOINHERIT, no password, owning no table, granted membership in nothing and to nobody except
--     the administrative role that must be able to own functions on its behalf.
--   * Exactly ONE policy for it: `FOR SELECT` on `app.workspace_members`, own active row, with the
--     identity expression inlined (§5/3-4).
--   * Three helpers, every one `SECURITY DEFINER` owned by `app_authz` with `set search_path = ''`
--     (§5/5, §6.1/4).
--
--
-- WHY THE IDENTITY IS READ FROM A GUC AND NOT FROM auth.uid()
--
-- Measured 2026-09-06 on `xtvtflkntpqfvflvdbwk`, recorded in
-- evidence/WP-0A-DB-00/a1-rfc-020-measurements-2026-09-06.md Q8-Q10: schema `auth` is owned by
-- `supabase_admin` and `postgres` holds USAGE on it WITHOUT grant option. Our migrations run as
-- `postgres`. So no migration can give any role we create the ability to call `auth.uid()`, and
-- `set local role app_worker; select auth.uid()` fails with `42501: permission denied for schema
-- auth` — the SCHEMA, not the function.
--
-- `current_setting`, `nullif`, `jsonb ->>` and the uuid cast are all in `pg_catalog`, which is
-- always on the search path, so the expression below resolves under `set search_path = ''` and
-- needs no schema grant at all. It is `auth.uid()`'s second COALESCE branch and nothing else.
--
-- The cost of that copy is drift: Supabase can change `auth.uid()` and this file would not notice.
-- RFC-2026-020 §6.1/7 turns the cost into a lint — `scripts/db/run.mjs` compares the expression
-- written here, character for character, against the platform's own recorded function body, and
-- fails the build if either moves. The expression appears in EXACTLY TWO places in this file, and
-- a test asserts that count: `app.jwt_subject()`'s body, and `app_authz`'s own policy, which
-- cannot call a function without re-entering the thing it exists to break out of.
--
--
-- WHICH SCHEMA THE HELPERS LIVE IN, WHICH IS A DECISION AND NOT AN INHERITANCE
--
-- They are in `app`. The data package this work package declares as its own input says otherwise,
-- and the disagreement is recorded here rather than resolved silently.
-- `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:71` gives `private` this row:
--
--   | `private` | authorization helpers, secret references, raw webhook, worker payload,
--                 reconciliation | ไม่มี direct grant | Server/worker ผ่าน typed service เท่านั้น |
--
-- "authorization helpers" by name, in `private`, with NO DIRECT GRANT, reachable by server/worker
-- through a typed service only. Two of those three cannot hold at once for THIS helper, and the
-- reason is mechanical rather than a matter of taste.
--
-- A policy written `TO authenticated` that calls a function is evaluated as the CALLER. So
-- `authenticated` must hold EXECUTE on the function and USAGE on the schema that contains it, or
-- the roster policy below cannot be evaluated by the identity it is written for. Putting the
-- helpers in `private` therefore requires granting `authenticated` USAGE on `private` — which is
-- the "ไม่มี direct grant" column of the same row, and which would also put the test-identity
-- helpers (`private.as_user`, `private.as_suspended_user`) and `private.set_updated_at` inside the
-- reach of every end user, since USAGE on the schema plus PUBLIC's default EXECUTE is all it takes
-- for a function nobody thought to revoke. That is a WIDER exposure than the one it avoids, bought
-- to satisfy half of a row while breaking its other half.
--
-- The row is not wrong; it did not anticipate this shape. Its model is a helper called by a server
-- or worker through a typed service — a command path, where `private` is exactly right and no
-- client role needs to reach it. This helper is called by the POLICY MACHINERY on the request path,
-- which RFC-2026-020 §6.3/12-13 contemplates in terms: the helper "is `EXECUTE`-granted to
-- `authenticated`, so it is callable". RFC-2026-020 is Approved, is newer than that baseline, and
-- sits at position 1 of the conflict order where the data package sits at 4. It decides the OWNER
-- and the width of its policy; §8 leaves the API — and with it the schema — to this batch.
--
-- THE PART THIS BATCH REFUSES TO DECIDE ON REACHABILITY. A third schema (`authz`, say) would give a
-- narrower home than `app` without touching `private`. It is not created here: batch 000 created
-- `app` and `private` under DATA-DEC-01, the schema lint pins `our_schemas`, and adding a third is
-- a data-foundation decision that belongs in an RFC rather than in the batch that happens to want
-- it. It is recorded as open in the handoff.
--
-- WHAT ABOUT PostgREST EXPOSING THESE AS RPC. Measured, read-only, 2026-09-06: no role on the
-- provisioned instance carries a `pgrst.db_schemas` setting in `pg_db_role_setting`. The exposed
-- schema list is platform configuration that lives OUTSIDE the database, so the catalog holds no
-- evidence either way and no lint in this repository can check it. A decision resting on it would
-- be unfalsifiable here — the shape RFC-2026-016 §4 retired "force where compatible" for being. So
-- these helpers are built to be SAFE WHEN EXPOSED rather than safe because they are hidden:
-- `app.workspace_member_role` and `app.is_active_member` answer only about the CALLER, so an RPC
-- call teaches the caller nothing it did not already know, and `app.jwt_subject` is granted to
-- nobody. Isolation case `authz-helper-is-not-an-oracle-for-third-parties` asserts that rather than
-- assuming it. Reachability is not a control; the assertion is.
--
--
-- WHICH §8.1 CELLS THIS IMPLEMENTS, AND THE ONE IT DOES NOT
--
-- 010's header (lines 55-80) named two cells it left denied by default:
--
--   * "Member list SELECT: Owner Y, Admin Y, Editor P". IMPLEMENTED HERE for the two `Y` cells,
--     through the helper: an active owner or admin of a workspace reads that workspace's whole
--     member list. Editor's `P` is not implemented — see below.
--
--   * "Workspace UPDATE: Admin P". NOT IMPLEMENTED HERE, and this is a refusal rather than an
--     omission. `P` is "ผ่านตาม policy/explicit capability" (§8 legend) and RFC-2026-020 §8 —
--     approved, and newer than 010's header — says in terms: "§8.1 marks Workspace UPDATE `P` for
--     admin and Member list SELECT `P` for editor. `P` is 'passes per policy/explicit capability'
--     and no document defines the capability set. A helper can resolve a capability only once
--     someone has decided what capabilities exist. Still open, still not an agent's to choose
--     (§15)."
--
--     §7 of the data package names the capability machinery — `capability + tenant context +
--     member scope`, over the scope types `all_businesses` / `business` / `page` — and the scope
--     table that carries it (`workspace_member_scopes`) is batch 021's, which RFC-2026-020 §8 also
--     says. Writing `role in ('owner','admin')` into the workspace UPDATE policy would not resolve
--     that capability; it would DELETE the distinction between `Y` and `P` and ship admin an
--     unconditional grant nobody reviewed — the precise thing 010 said it was avoiding when it
--     wrote the narrower policy. The two cells are therefore one implemented and one refused, and
--     the refusal is recorded here, in the manifest's open blockers, and in the handoff.
--
--
-- WHAT THE HELPER CAN SEE, WHICH IS THE WHOLE OF THE SECURITY ARGUMENT
--
-- `SECURITY DEFINER` changes `current_user` and changes nothing else about RLS. It does not confer
-- a bypass, and `app_authz` holds none. So inside every helper below, `app.workspace_members` is
-- still policed — by the single policy this file writes for `app_authz`, whose USING clause is the
-- caller's OWN ACTIVE ROW and nothing wider. The helper sees no row the caller could not select for
-- itself; what it has that the caller does not is an execution context in which the rewriter is not
-- already expanding `workspace_members`.
--
-- The failure mode of forgetting that policy is DENY, measured rather than assumed: a non-owner,
-- non-bypassing role on a forced table is filtered to zero rows, silently (RFC-2026-020 §2.1, where
-- `app_worker` sees 0 of 6 while holding the SELECT grant). scripts/db/authz-proofs.mjs constructs
-- exactly that state in CI — it drops this policy inside a transaction and requires the member list
-- to collapse — because a helper that silently bypassed would be indistinguishable from one that is
-- correctly policed.


-- ---------------------------------------------------------------------------------------------
-- The role.
-- ---------------------------------------------------------------------------------------------
--
-- Idempotent, unlike batch 001's bare `create role`. `db-reset-test` drops the `app` and `private`
-- schemas and cannot drop a role — roles are cluster-wide — so a reset-then-migrate cycle re-runs
-- this file against a database where the role already exists. Batch 001 would fail there; this
-- does not, and the ALTER below re-asserts every attribute unconditionally so that the state is
-- the file's doing on both paths rather than the CREATE's on one of them.
do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'app_authz') then
    create role app_authz;
  end if;
end $$;

-- Every attribute is STATED, not inherited from a default. The default is correct today; a default
-- is not a decision, and NOBYPASSRLS here is the load-bearing one — a bypassing helper owner would
-- answer every authorization question "yes" for reasons unrelated to the caller.
alter role app_authz with nologin nosuperuser nobypassrls noinherit nocreatedb nocreaterole noreplication password null;

comment on role app_authz is
  'Owns the authorization helpers (RFC-2026-020). NOT a path: nothing connects as it, nothing '
  'assumes it, it is never a session identity — it exists only as the owner of SECURITY DEFINER '
  'functions. NOBYPASSRLS and never a table owner, so the single policy written for it below is '
  'the exact and only width of its reach.';

-- The administrative role must be a member to own functions on this role's behalf, and the two
-- switches are stated explicitly for the reason batch 003 records: `inherit` and `set` are
-- different options and batch 002 confused them. INHERIT FALSE keeps `postgres` from holding
-- app_authz's privileges ambiently; SET TRUE lets a test or a proof deliberately become it.
grant app_authz to postgres with inherit false, set true;


-- ---------------------------------------------------------------------------------------------
-- Privileges. Exactly USAGE on app and a column-scoped SELECT on one table (RFC-2026-020 §6.1/6).
-- ---------------------------------------------------------------------------------------------
--
-- Column-scoped, so it cannot read `token_hash` on the invitation table or anything else in the
-- schema: `has_table_privilege` is answered per column, and the four named below are exactly what
-- the helpers read. `created_by`, `updated_by` and the timestamps are deliberately absent — a
-- helper that can read who created a membership row is a helper that can answer a question nobody
-- asked it.
grant usage on schema app to app_authz;
grant select (workspace_id, user_id, role, status) on app.workspace_members to app_authz;


-- ---------------------------------------------------------------------------------------------
-- The one policy. RFC-2026-020 §5/3.
-- ---------------------------------------------------------------------------------------------
--
-- Semantically identical to `workspace_members_select_own_active`, which the catalog holds as
--
--     ((user_id = ( SELECT auth.uid() AS uid)) AND (status = 'active'::text))
--
-- with the identity expression inlined per §5/4. It is NO WIDER: `auth.uid()` COALESCEs the legacy
-- singular GUC `request.jwt.claim.sub` before reading `request.jwt.claims`, and this reads only the
-- second, so where the two differ this one denies. Narrower in the safe direction, and the
-- difference is asserted rather than glossed — scripts/db/run.mjs rule 7 requires this expression
-- to be exactly the second COALESCE branch of the platform's recorded body.
--
-- `pg_get_expr(polqual, polrelid)` for this policy is pinned against a literal in
-- scripts/db/run.mjs. That pinned string is the whole control: `using (true)`, a dropped
-- `status = 'active'`, or an added function call all fail the build with a diff showing exactly
-- what changed.
drop policy if exists workspace_members_select_authz_own_active on app.workspace_members;
create policy workspace_members_select_authz_own_active on app.workspace_members
  for select to app_authz
  using (
    user_id = (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
    and status = 'active'
  );


-- ---------------------------------------------------------------------------------------------
-- The helpers. Every one SECURITY DEFINER, owned by app_authz, with an empty search_path.
-- ---------------------------------------------------------------------------------------------
--
-- `language sql` and `security definer` together are what breaks the cycle: PostgreSQL declines to
-- inline a SECURITY DEFINER function, so the policy that calls one gets a function CALL in its
-- plan rather than the function's body spliced into the query that is already expanding
-- `workspace_members`. That property is the one RFC-2026-020 §6.2/9 makes blocking, and
-- scripts/db/authz-proofs.mjs records `EXPLAIN (VERBOSE)` for it on every CI run — alongside a
-- control showing that a SECURITY INVOKER function IS inlined, so a green proof cannot mean the
-- instrument was reading nothing.

-- The caller's subject, read the way `auth.uid()` reads it and by the only route a role we create
-- can take. This is one of the TWO places the identity expression appears in this file.
create or replace function app.jwt_subject()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

comment on function app.jwt_subject() is
  'The caller''s subject, from request.jwt.claims. Owned by app_authz (RFC-2026-020 §5/2) and '
  'SECURITY DEFINER because §6.1/4 requires it of everything that role owns. It reads no table, so '
  'its definer context confers nothing; it exists so the identity expression has ONE named home in '
  'SQL besides app_authz''s own policy, which cannot call it without re-entering the cycle.';

-- The caller's role in one workspace, or NULL. This is the helper the policies read, and it is the
-- only one that touches a table.
--
-- `status = 'active'` is asserted here AND in app_authz's policy. That is not redundancy for its
-- own sake: the policy is what stops the helper reading a row the caller could not, and this
-- predicate is what stops the helper ANSWERING for a membership that is not active. §12.6
-- assertion 5 — a suspended member sees zero rows — has to survive both, and the isolation suite
-- asserts it through this helper as well as through 010's own policy.
create or replace function app.workspace_member_role(workspace uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
    from app.workspace_members m
   where m.workspace_id = workspace
     and m.user_id = app.jwt_subject()
     and m.status = 'active'
   limit 1
$$;

comment on function app.workspace_member_role(uuid) is
  'The calling subject''s role in one workspace, or NULL when they hold no ACTIVE membership in '
  'it. SECURITY DEFINER owned by app_authz, whose single policy restricts what this can read to '
  'the caller''s own active row — so it is a membership oracle about the CALLER and about nobody '
  'else. Returns NULL for a workspace the caller is not in, including one that does not exist.';

-- The capability every later batch needs and the one §5/5 says must be uniform: policies on other
-- tables read membership through this rather than joining `app.workspace_members` themselves, so
-- `authenticated`'s policy set stays out of the helper's execution context even where no cycle
-- exists.
create or replace function app.is_active_member(workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.workspace_member_role(workspace) is not null
$$;

comment on function app.is_active_member(uuid) is
  'True when the calling subject holds an ACTIVE membership in this workspace. SECURITY DEFINER '
  'owned by app_authz. Callable by authenticated on purpose, and it must not be a membership '
  'oracle for third parties: it answers only about the caller, which the isolation suite asserts '
  'by calling it as one identity for a workspace that identity is not in.';

alter function app.jwt_subject() owner to app_authz;
alter function app.workspace_member_role(uuid) owner to app_authz;
alter function app.is_active_member(uuid) owner to app_authz;

-- §8.5: EXECUTE is revoked from PUBLIC and granted explicitly. A helper reachable by PUBLIC is
-- reachable by `anon`, which batch 010 grants nothing anywhere; the grants below name the roles
-- that have a reason to call one.
--
-- `app.jwt_subject()` is granted to NOBODY, and that is a deliberate narrowing of the draft this
-- batch grew from, not an omission. It is called only from inside the two SECURITY DEFINER helpers
-- below, which run as `app_authz`, which OWNS it and therefore needs no grant. No policy names it:
-- `app_authz`'s own policy inlines the expression rather than calling it, because a function call
-- there would re-enter the recursion this batch exists to break. So a grant to `authenticated`
-- would add a callable surface with no caller — and, if schema `app` is or becomes the API's
-- exposed schema, an RPC endpoint with no caller. §8.5 asks for EXECUTE to be granted explicitly;
-- explicitly is not the same as widely, and the narrowest grant that leaves every real caller
-- working is none.
revoke all on function app.jwt_subject() from public;
revoke all on function app.workspace_member_role(uuid) from public;
revoke all on function app.is_active_member(uuid) from public;

grant execute on function app.workspace_member_role(uuid) to authenticated;
grant execute on function app.is_active_member(uuid) to authenticated;


-- ---------------------------------------------------------------------------------------------
-- The §8.1 cell this batch implements: "Member list SELECT — Owner Y, Admin Y".
-- ---------------------------------------------------------------------------------------------
--
-- Permissive, so it ORs with `workspace_members_select_own_active` rather than replacing it: a
-- member who is neither owner nor admin keeps seeing their own active row and gains nothing, and
-- 010 is untouched.
--
-- The predicate is a function call and not an `exists (select ... from app.workspace_members ...)`
-- because the second is the 42P17 this batch exists to break. scripts/db/authz-proofs.mjs builds
-- that naive policy in a disposable transaction on every CI run and records the error verbatim, so
-- the reason this file is shaped the way it is stays executed rather than remembered.
--
-- Editor's `P` is absent for the reason the header gives: no document defines the capability set,
-- and inventing one here would be inventing the security boundary of every later policy.
drop policy if exists workspace_members_select_workspace_roster on app.workspace_members;
create policy workspace_members_select_workspace_roster on app.workspace_members
  for select to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin'));


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The same shape batch 004 uses: a correction that is only a comment is a correction nobody
-- checks. These are the structural halves of RFC-2026-020 §6.1 — the ones that can be answered
-- from the catalog of the database being migrated, without a committed snapshot. The string pin
-- (§6.1/5) and the platform comparison (§6.1/7) live in scripts/db/run.mjs, once, so that the
-- literal has one home rather than two that can drift.
do $$
declare
  attributes record;
  offending  text;
  count_of   integer;
begin
  select rolcanlogin, rolsuper, rolbypassrls, rolinherit, (rolpassword is not null) as has_password
    into attributes
    from pg_catalog.pg_authid where rolname = 'app_authz';

  if attributes.rolcanlogin or attributes.rolsuper or attributes.rolbypassrls
     or attributes.rolinherit or attributes.has_password then
    raise exception 'app_authz does not hold the attributes RFC-2026-020 §5/2 requires'
      using detail = format('canlogin=%s super=%s bypassrls=%s inherit=%s has_password=%s',
                            attributes.rolcanlogin, attributes.rolsuper, attributes.rolbypassrls,
                            attributes.rolinherit, attributes.has_password),
            hint = 'NOBYPASSRLS is the load-bearing one: a bypassing helper owner reads every '
                   'membership row in the database and answers every authorization question yes.';
  end if;

  -- §6.1/3. Same rule as app_command, same reason: a SECURITY DEFINER function owned by the table
  -- owner is not subject to the policies on that table.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('app', 'private') and c.relkind in ('r', 'p')
     and pg_catalog.pg_get_userbyid(c.relowner) = 'app_authz';
  if offending is not null then
    raise exception 'app_authz owns table(s) %, and RFC-2026-020 §5/2 says it owns none', offending;
  end if;

  -- §6.1/4. An invoker-mode function owned by this role is option D arriving unremarked.
  select string_agg(p.proname, ', ') into offending
    from pg_catalog.pg_proc p
   where pg_catalog.pg_get_userbyid(p.proowner) = 'app_authz'
     and (not p.prosecdef or p.proconfig is null or not (p.proconfig @> array['search_path=']));
  if offending is not null then
    raise exception 'function(s) % owned by app_authz are not SECURITY DEFINER with an empty search_path', offending;
  end if;

  -- §6.1/5, structural half. The string itself is pinned in scripts/db/run.mjs and executed
  -- against this catalog by scripts/db/authz-proofs.mjs.
  select count(*) into count_of
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and exists (select 1 from pg_catalog.pg_authid r
                  where r.oid = any (p.polroles) and r.rolname = 'app_authz');
  if count_of <> 1 then
    raise exception 'app_authz holds % policies in schema app; RFC-2026-020 §5/3 gives it exactly one', count_of
      using hint = 'The exemption this role takes is structural, not scopal. A second policy is a '
                   'second decision and needs its own RFC.';
  end if;
end $$;
