# A1 measurement transcript — RFC-2026-020, the authorization helper role

Run: `/claude/a1_identity` (A1 Identity), author of `010_identity.sql`
Date: 2026-09-06
Instance: `xtvtflkntpqfvflvdbwk` (ThinkBizThai, ap-southeast-2, PostgreSQL 17.6), via the Supabase
MCP tool
Supports: `architecture/decisions/RFC-2026-020-authorization-helper-role.md`

## What was and was not permitted

Read-only. **No DDL, no `INSERT`/`UPDATE`/`DELETE`, no `CREATE`/`ALTER`/`DROP ROLE`, no `GRANT` or
`REVOKE`.** Nothing in this transcript changes any catalog row.

Two instruments need stating, because a reviewer should be able to object to them:

- **`set local role <role>`** appears in four probes. It changes `current_user` for the duration of
  the statement's own implicit transaction and reverts with it. It grants nothing and changes no
  role. It is used because it is the only way to observe row level security at all: every identity
  the tool would otherwise present (`postgres`) holds `rolbypassrls`, and a probe run as a bypassing
  role measures nothing about RLS. It is also the exact thing `SECURITY DEFINER` does — set
  `current_user` to another role — which is why it can stand in for a function this run may not
  create.
- **`set_config('request.jwt.claims', …, true)`** appears in four probes, always with
  `is_local = true`, so it is transaction-scoped and cannot persist onto a pooled connection. It
  writes no table. It is how the platform's own `auth.uid()` is fed; see Q5.

Every result below is pasted from the tool's output, reformatted from JSON into columns and
otherwise unedited.

---

## Q1 — role attributes

```sql
select rolname, rolsuper, rolbypassrls, rolcanlogin, rolinherit,
       (rolpassword is not null) as has_password
  from pg_authid
 where rolname in ('postgres','service_role','authenticator','authenticated','anon',
                   'app_worker','app_command','app_maintenance','supabase_admin')
 order by rolname;
```

```
 rolname          | rolsuper | rolbypassrls | rolcanlogin | rolinherit | has_password
 anon             | f        | f            | f           | t          | f
 app_command      | f        | f            | f           | f          | f
 app_maintenance  | f        | f            | f           | f          | f
 app_worker       | f        | f            | f           | f          | f
 authenticated    | f        | f            | f           | t          | f
 authenticator    | f        | f            | t           | f          | t
 postgres         | f        | t            | t           | t          | t
 service_role     | f        | t            | f           | t          | f
 supabase_admin   | t        | t            | t           | t          | t
```

Reproduces `RFC-2026-017` §2 and the countersignature's Q1 independently. The three service roles
are still `nologin nobypassrls noinherit` with no password.

## Q2 — the tables, their owner, and their RLS state

```sql
select c.relname, pg_get_userbyid(c.relowner) as owner, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced,
       (select count(*) from pg_policy p where p.polrelid = c.oid) as policies,
       (select n_live_tup from pg_stat_user_tables t where t.relid = c.oid) as approx_rows
  from pg_class c
 where c.relnamespace = 'app'::regnamespace and c.relkind = 'r'
 order by 1;
```

```
 relname               | owner    | rls_enabled | rls_forced | policies | approx_rows
 user_profiles         | postgres | t           | t          | 2        | 6
 workspace_invitations | postgres | t           | t          | 3        | 2
 workspace_members     | postgres | t           | t          | 1        | 6
 workspace_settings    | postgres | t           | t          | 2        | 2
 workspaces            | postgres | t           | t          | 2        | 2
```

`workspace_members` carries **one** policy — the non-recursive anchor `010` wrote — and the table is
owned by `postgres`, which Q1 shows holds `rolbypassrls`.

## Q3 — the one policy on `app.workspace_members`

```sql
select n.nspname, c.relname, p.polname, p.polcmd,
       (select array_agg(r.rolname order by r.rolname) from pg_authid r where r.oid = any(p.polroles)) as roles,
       pg_get_expr(p.polqual, p.polrelid) as qual
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'app' and c.relname = 'workspace_members'
 order by p.polname;
```

```
 nspname | relname           | polname                             | polcmd | roles           | qual
 app     | workspace_members | workspace_members_select_own_active | r      | {authenticated} | ((user_id = ( SELECT auth.uid() AS uid)) AND (status = 'active'::text))
```

This qual is the string `RFC-2026-020` §5/3 proposes `app_authz`'s policy be pinned against, with
the identity expression inlined per §5/4.

## Q4 — the fixture membership rows (as `postgres`, which bypasses RLS)

```sql
select workspace_id, user_id, role, status from app.workspace_members
 order by workspace_id, role, user_id;
```

```
 workspace_id                         | user_id                              | role     | status
 43fd5c24-ebea-528f-9ce9-eedf1f8f9765 | 297ad853-58a6-5e83-87e1-f936f9c3ddff | owner    | active
 c4840acc-0323-5e13-b1d3-c18d7eb615cb | fecceb8f-d60b-54bc-97cd-fccee216e34b | approver | active
 c4840acc-0323-5e13-b1d3-c18d7eb615cb | a324d4a6-15a3-5e15-9193-eed9d50b5d91 | editor   | active
 c4840acc-0323-5e13-b1d3-c18d7eb615cb | 5c460eb8-0710-557a-b423-f9b12c76834f | owner    | active
 c4840acc-0323-5e13-b1d3-c18d7eb615cb | 9b10ac91-406b-5322-9755-bfb16b0b4aa3 | viewer   | suspended
 c4840acc-0323-5e13-b1d3-c18d7eb615cb | d884d3c1-89a0-5600-ae81-c368f6574821 | viewer   | active
```

Six rows total. Workspace `c4840acc…` holds five of them, four active. Its `owner` is
`5c460eb8-0710-557a-b423-f9b12c76834f`. These are the deterministic `uuid5` fixture identities
`tests/db/identity/fixtures/010-identity-fixture.sql` loads; they are synthetic and correspond to no
real person.

## Q5 — `auth.uid()`, `auth.role()`, `auth.jwt()`

```sql
select p.proname, l.lanname, p.prosecdef, p.provolatile, p.proconfig,
       pg_get_userbyid(p.proowner) as owner, pg_get_functiondef(p.oid) as def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
 where n.nspname = 'auth' and p.proname in ('uid','role','jwt')
 order by p.proname;
```

`uid`: `lanname = sql`, `prosecdef = f`, `provolatile = s`, `proconfig = null`,
`owner = supabase_auth_admin`.

```sql
CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$
```

`role` and `jwt` are the same shape over `request.jwt.claim.role` and `request.jwt.claim` /
`request.jwt.claims`, both `sql STABLE`, neither `SECURITY DEFINER`, both owned by
`supabase_auth_admin`.

**None of the three reads `current_user`.**

## Q6 — `auth.uid()` is independent of `current_user`

```sql
select current_user::text as current_user_before, u.uid as auth_uid, s.c as guc_set
  from (select set_config('request.jwt.claims',
        '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true) as c) s,
       lateral (select auth.uid() as uid) u;
```

```
 current_user_before | auth_uid                             | guc_set
 postgres            | 11111111-1111-1111-1111-111111111111 | {"sub":"1111…1111","role":"authenticated"}
```

`LATERAL` is used to force evaluation order: the GUC is set in `s` before `u` reads it. The result is
the point of the RFC's §5/3 — the caller's identity is carried by session state, so changing
`current_user` (which is all `SECURITY DEFINER` does) does not change who the helper thinks is
asking.

## Q7 — the same table seen by four identities

### Q7a — as `postgres`, the table owner

```sql
select current_user::text as running_as,
       (select rolbypassrls from pg_authid where rolname = current_user) as bypassrls,
       (select relforcerowsecurity from pg_class where oid='app.workspace_members'::regclass) as table_is_forced,
       (select count(*) from app.workspace_members) as rows_visible;
```

```
 running_as | bypassrls | table_is_forced | rows_visible
 postgres   | t         | t               | 6
```

Six of six, with `relforcerowsecurity = true`. `FORCE` does not constrain this owner, because the
owner holds `rolbypassrls`.

### Q7b — as `app_worker`: granted, unpoliced, forced

```sql
set local role app_worker;
select current_user::text as running_as,
       has_table_privilege(current_user,'app.workspace_members','SELECT') as has_select_grant,
       (select count(*) from app.workspace_members) as rows_visible,
       (select count(*) from app.workspaces) as workspaces_visible;
```

```
 running_as | has_select_grant | rows_visible | workspaces_visible
 app_worker | t                | 0            | 0
```

Zero of six, **with no error**. This is the answer to "does a `SECURITY DEFINER` function owned by a
non-owner role escape a forced table's policies": it does not, and the refusal is silent.

### Q7c — as `app_command`: the privilege layer refuses first

```sql
set local role app_command;
select current_user::text as running_as, (select count(*) from app.workspace_members) as rows_visible;
```

```
ERROR:  42501: permission denied for schema app
```

### Q7d — as `authenticated`, holding the workspace owner's token

```sql
set local role authenticated;
select current_user::text as running_as,
       (select count(*) from app.workspace_members m
         where m.workspace_id = 'c4840acc-0323-5e13-b1d3-c18d7eb615cb') as members_visible,
       (select count(*) from app.workspaces w)          as workspaces_visible,
       (select count(*) from app.workspace_settings s)  as settings_visible,
       (select count(*) from app.workspace_invitations i) as invitations_visible
  from (select set_config('request.jwt.claims',
        '{"sub":"5c460eb8-0710-557a-b423-f9b12c76834f","role":"authenticated"}', true)) s;
```

```
 running_as    | members_visible | workspaces_visible | settings_visible | invitations_visible
 authenticated | 1               | 1                  | 1                | 1
```

The **owner** of a five-member workspace sees one membership row: `§8.1`'s "Member list SELECT:
Owner Y" is unimplemented, measured rather than asserted. The other three counts are the
non-recursive policies of `010` working — each reads `workspace_members` from a different relation.

## Q8 — schema privileges, and the grant that cannot be made

```sql
select nspname, nspacl::text as nspacl,
       has_schema_privilege('postgres', oid, 'USAGE') as postgres_usage,
       has_schema_privilege('postgres', oid, 'USAGE WITH GRANT OPTION') as postgres_can_grant
  from pg_namespace where nspname in ('app','auth') order by nspname;
```

```
 nspname | nspacl                                                                        | postgres_usage | postgres_can_grant
 app     | {postgres=UC/postgres,authenticated=U/postgres,app_worker=U/postgres}          | t              | t
 auth    | {supabase_admin=UC/supabase_admin,anon=U/supabase_admin,                       | t              | f
          |  authenticated=U/supabase_admin,service_role=U/supabase_admin,
          |  supabase_auth_admin=UC/supabase_admin,dashboard_user=UC/supabase_admin,
          |  postgres=U/supabase_admin}
```

A wider read of the same catalog, taken first:

```sql
select nspname, coalesce(nspacl::text,'(null = owner only)') as nspacl,
       pg_get_userbyid(nspowner) as owner,
       has_schema_privilege('authenticated', oid, 'USAGE')   as authenticated_usage,
       has_schema_privilege('app_worker', oid, 'USAGE')      as app_worker_usage,
       has_schema_privilege('app_command', oid, 'USAGE')     as app_command_usage,
       has_schema_privilege('app_maintenance', oid, 'USAGE') as app_maintenance_usage
  from pg_namespace where nspname in ('auth','app','private','public','extensions') order by nspname;
```

```
 nspname    | owner             | authenticated | app_worker | app_command | app_maintenance
 app        | postgres          | t             | t          | f           | f
 auth       | supabase_admin    | t             | f          | f           | f
 extensions | postgres          | t             | f          | f           | f
 private    | postgres          | f             | f          | f           | f
 public     | pg_database_owner | t             | t          | t           | t
```

`private` remains `{postgres=UC/postgres}` — no `anon`, no `PUBLIC` — as the countersignature's Q6
found.

Our migrations run as `postgres`. `postgres` holds `U` on `auth` **without grant option**, so no
migration can grant any role we create the privilege needed to call `auth.uid()`.

## Q9 — the 42501 that established Q8's consequence

```sql
set local role app_worker;
select current_user::text, session_user::text, u.uid
  from (select set_config('request.jwt.claims','{"sub":"1111…1111"}', true) as c) s,
       lateral (select auth.uid() as uid) u;
```

```
ERROR:  42501: permission denied for schema auth
```

Note the failure is the **schema**, not the function: `has_function_privilege('app_worker',
'auth.uid()','EXECUTE')` is `true`. Reaching the function still requires `USAGE` on `auth`.

## Q10 — the same identity, read the way the helper would have to read it

```sql
set local role app_worker;
select current_user::text as running_as,
       (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid as uid_from_guc
  from (select set_config('request.jwt.claims',
        '{"sub":"11111111-1111-1111-1111-111111111111"}', true)) s;
```

```
 running_as | uid_from_guc
 app_worker | 11111111-1111-1111-1111-111111111111
```

`current_setting`, `nullif`, `jsonb ->>` and the `uuid` cast are all `pg_catalog`, so this works
under `set search_path = ''` and needs no schema grant. It is `auth.uid()`'s body without
`auth.uid()`.

## Q11 — a `sql` `SECURITY INVOKER` function is inlined into the caller's plan

```sql
explain (verbose, costs off) select auth.uid() as uid;
```

```
Result
  Output: (COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text),
          ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid
Query Identifier: -9082714800181533730
```

The plan carries the body, not a call. `EXPLAIN` without `ANALYZE` does not execute the function.

---

## The two probes that could not be constructed read-only, and the queries that establish why

### No policy on this instance references its own relation

```sql
select n.nspname, c.relname, p.polname
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
 where coalesce(pg_get_expr(p.polqual, p.polrelid),'') || ' '
       || coalesce(pg_get_expr(p.polwithcheck, p.polrelid),'')
       ~ ('(^|[^._[:alnum:]])' || n.nspname || '\.' || c.relname || '($|[^._[:alnum:]])');
```

```
(0 rows)
```

So `42P17` cannot be observed on this instance without creating a recursive policy, which is DDL.
An earlier, cruder version of this query matched on the bare table name and returned the six `app`
policies whose quals mention their own table only as a column qualifier (`workspaces.id`,
`workspace_settings.workspace_id`, …) while joining to `app.workspace_members`; each was inspected
and none is a self-reference. The stricter regexp above is the one whose result is quoted.

### No `sql`-language `SECURITY DEFINER` function exists to `EXPLAIN`

```sql
select n.nspname, p.proname, p.pronargs, p.provolatile, pg_get_userbyid(p.proowner) as owner
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
 where l.lanname = 'sql' and p.prosecdef and not p.proretset
   and p.pronargs = 0 and p.provolatile <> 'i'
 order by 1,2 limit 20;
```

```
(0 rows)
```

So the counterpart to Q11 — that a `SECURITY DEFINER` function is **not** inlined — could not be
demonstrated here. `RFC-2026-020` §6.2 makes both of these blocking conditions on batch `011`,
to be discharged by execution in a disposable database rather than by citation.

## What this transcript does not establish

- **That the instance state is what `000`–`010` produced.** Same limitation the countersignature
  recorded at §3.3: nothing in the repository holds an apply transcript to reconcile against.
- **Anything about CI.** No CI round was run and this host has no `psql`, `pg_ctl`, `docker` or
  `podman` (checked).
- **Anything about behaviour under concurrency, under a transaction-mode pooler, or at scale.**
  Every probe is a single statement against a five-table fixture.
- **Independence.** This run authored `010` and is in A0's vendor and model family. See
  `RFC-2026-020` §9.
