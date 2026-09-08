# A1 Security — measurements behind `RFC-2026-022`

Run: `/claude/a1_bastion` (A1 Security)
Date: 2026-09-08
Instance: `xtvtflkntpqfvflvdbwk`, read-only, through the Supabase MCP SQL tool
Subject: `RFC-2026-016` §2's service-policy shape, against the two `S` cells the schema has reached

**No DDL and no writes were issued.** Every probe is a `SELECT`, an `EXPLAIN` without `ANALYZE`, or a
transaction-local `SET LOCAL` / `set_config(…, true)`. No `SELECT … FOR UPDATE` was ever *executed* —
the locking probes are `EXPLAIN` only, which produces a plan and takes no row lock. The session's
`transaction_read_only` was measured `off`, so the discipline is this run's and not the tool's; it is
stated here so a reviewer can hold it against the transcript rather than take it on trust.

**What is NOT on this instance.** `db/foundation/lint/catalog-snapshot.json` declares ten batches
`not_applied_to_this_instance`: `011`, `020`, `021`, `030`, `040`, `041`, `050`, `060`, `130`, `140`.
So **`app.jobs`, `app.outbox_events`, `app.consumer_ledger`, `app.audit_logs` and
`app.security_events` do not exist here**, `app_authz` does not exist here, and **no policy anywhere
on this instance names any service role** (M10). Every mechanism claim below is therefore built from
batch `010`'s five tables, the platform's roles, and the catalog. Claims that would have needed a
service policy or a queue table are in the RFC's §7.3 as execution-discharged, never citable.

---

## M1 — Platform, connection and the owner's attributes

```sql
select version() as pg_version, current_user::text as who;
```
```
 pg_version                                                                        | who
 PostgreSQL 17.6 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit      | postgres
```

```sql
select current_setting('transaction_read_only') as txn_read_only,
       current_setting('transaction_isolation') as iso;
```
```
 txn_read_only | iso
 off           | read committed
```

```sql
select pg_backend_pid() as pid, inet_server_port() as port,
       (select count(*) from pg_parameter_acl) as parameter_acl_rows;
```
```
 pid    | port | parameter_acl_rows
 346521 | 5432 | 1
```

`inet_server_port() = 5432` is the direct Postgres port, **not** a transaction-mode pooler port. So
nothing here measures pooler behaviour, and the RFC's §7.3(d) says so rather than inferring it.

Role attributes (extract of M9's query): `postgres` — `rolsuper = false`, `rolbypassrls = true`.
`RFC-2026-016`'s constraint that the table owner bypasses RLS is measured true today; and because
`postgres` is **not** a superuser here, it cannot `GRANT SET ON PARAMETER` either (see M2).

---

## M2 — THE MEASUREMENT THAT DECIDES THE RFC: `app_worker` can set the workspace GUC itself, twice, to two different tenants

```sql
set local role app_worker;
select current_user::text as running_as,
       has_parameter_privilege(current_user, 'app.workspace_id', 'SET') as catalog_says_may_set,
       set_config('app.workspace_id','22222222-2222-2222-2222-222222222222', true) as set_succeeded,
       current_setting('app.workspace_id', true) as now_reads,
       set_config('app.workspace_id','33333333-3333-3333-3333-333333333333', true) as reset_to_another_tenant;
```
```
 running_as | catalog_says_may_set | set_succeeded                        | now_reads                            | reset_to_another_tenant
 app_worker | false                | 22222222-2222-2222-2222-222222222222 | 22222222-2222-2222-2222-222222222222 | 33333333-3333-3333-3333-333333333333
```

Two facts, and both matter.

1. **The role the policy would name sets the value the policy would read, and can change it
   mid-transaction.** A policy `using (workspace_id = current_setting('app.workspace_id')…)` therefore
   does not *constrain* `app_worker`; it *confines* a session that cooperates. Against the role
   itself it is worth nothing.
2. **The catalog's own privilege function disagrees with the operation.**
   `has_parameter_privilege` returns `false` while the `SET` succeeds — because a custom placeholder
   is not a registered parameter and the ACL system does not govern it. So *"only the server may set
   this"* is not assertable through `pg_parameter_acl` / `has_parameter_privilege`, which is the only
   privilege machinery Postgres has for settings.

```sql
select parname, paracl::text from pg_parameter_acl;
```
```
 parname          | paracl
 log_min_messages | {supabase_admin=sA/supabase_admin,supabase_realtime_admin=s/supabase_admin}
```

One row, a real GUC, granted to platform roles by `supabase_admin`. Our migrations run as `postgres`,
which M1 measures is not a superuser, so nothing this repository can execute adds a row here.

---

## M3 — The identity GUC is forgeable in exactly the same way; it is a control only because the client cannot issue SQL

```sql
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"297ad853-…-f936f9c3ddff"}', true),
       (select count(*) from app.workspace_members) as rows_as_first_subject;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"5c460eb8-…-f9b12c76834f"}', true),
       (select count(*) from app.workspace_members) as rows_as_second_subject,
       current_user::text as still_running_as;
```
```
 rows_as_second_subject | still_running_as
 1                      | authenticated
```

(The two subjects are synthetic fixture uuids already present in this repository's seed catalog; they
are truncated above and no row content was read.)

A session running as `authenticated` chose a subject and saw that subject's membership row. The
request path is nonetheless safe, because **PostgREST issues the statement and the client does not**.
`RFC-2026-012`'s crux says the same thing about tiers. The worker path has no equivalent gap-closer:
the worker *is* the statement issuer. That asymmetry — not the mechanism — is why the same GUC
technique is a control on one path and a convention on the other.

---

## M4 — An unset custom GUC has two different absences, and only one spelling denies

```sql
select current_setting('app.never_set_anywhere');
```
```
ERROR:  42704: unrecognized configuration parameter "app.never_set_anywhere"
```

```sql
select current_setting('app.never_set_anywhere', true) is null as two_arg_is_null,
       (current_setting('app.never_set_anywhere', true) = 'anything') is null as comparison_is_null;
```
```
 two_arg_is_null | comparison_is_null
 t               | t
```

```sql
select set_config('app.probe_guc','v1',true) as first_set,
       set_config('app.probe_guc', null, true) as reset_returns,
       current_setting('app.probe_guc', true) as after_reset,
       (current_setting('app.probe_guc', true) is null) as after_reset_is_null,
       length(coalesce(current_setting('app.probe_guc', true),'X')) as after_reset_len;
```
```
 first_set | reset_returns | after_reset | after_reset_is_null | after_reset_len
 v1        |               |             | f                   | 0
```

```sql
select (''::text)::uuid as empty_cast;
```
```
ERROR:  22P02: invalid input syntax for type uuid: ""
```

So a policy predicate has three possible behaviours where a reviewer would expect one:

| spelling | GUC never defined | GUC defined then reset |
|---|---|---|
| `current_setting('app.workspace_id')::uuid` | **raises 42704** | `''` → **raises 22P02** |
| `current_setting('app.workspace_id', true)::uuid` | NULL → denies | `''` → **raises 22P02** |
| `nullif(current_setting('app.workspace_id', true), '')::uuid` | NULL → denies | NULL → **denies** |

**Only the third denies in both states.** A deny-by-default policy written in either of the first two
spellings fails open into an error, which a caller retries and an operator reads as an outage rather
than as a refusal.

Corroboration from the platform itself, read out of a plan in M7: Supabase's `auth.uid()` body is

```
(COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), ''),
          (NULLIF(current_setting('request.jwt.claims', true), ''))::jsonb ->> 'sub'))::uuid
```

— `NULLIF(…, '')` twice. The platform treats the empty string as necessary to handle; this repository
has to as well.

---

## M5 — The pinned form is evaluated once and drives an index

```sql
select set_config('app.workspace_id','44444444-4444-4444-4444-444444444444',true);
explain (verbose, costs off)
  select id from app.workspace_members
   where workspace_id = (select nullif(current_setting('app.workspace_id', true), '')::uuid);
```
```
Bitmap Heap Scan on app.workspace_members
  Recheck Cond: (workspace_members.workspace_id = (InitPlan 1).col1)
  InitPlan 1
    ->  Result
          Output: (NULLIF(current_setting('app.workspace_id'::text, true), ''::text))::uuid
  ->  Bitmap Index Scan on workspace_members_workspace_keyset_idx
        Index Cond: (workspace_members.workspace_id = (InitPlan 1).col1)
```

The `(select …)` wrapper makes it an `InitPlan` — evaluated once per statement, not once per row —
and the comparison reaches the index. This is the same wrapper batch `010` already uses for
`(select auth.uid())`, so it is one habit rather than two.

---

## M6 — With no policy, a claim query returns zero rows silently rather than erroring

`app_worker` holds `SELECT` and `UPDATE` on `app.workspace_members`, the table is `ENABLE` + `FORCE
ROW LEVEL SECURITY`, and no policy names `app_worker` (M10). That is exactly batch `050`'s
construction, on a table that exists here.

```sql
set local role app_worker;
explain (verbose, costs off) select id, workspace_id from app.workspace_members for update skip locked;
```
```
LockRows
  Output: id, workspace_id, ctid
  ->  Result
        Output: id, workspace_id, ctid
        One-Time Filter: false
```

and without the locking clause:

```
Result
  Output: id, workspace_id
  One-Time Filter: false
```

Batch `050`'s *"a policy scoped by a single workspace GUC therefore either refuses every claim"* —
executed, in its no-policy limit. Note also **the RLS qualifier is applied beneath the `LockRows`
node**, so row security decides the claim before any row is locked.

---

## M7 — `SELECT … FOR UPDATE` applies the UPDATE policy's `USING` **in addition to** the SELECT policy's

`app.workspaces` carries two policies for `authenticated`: `workspaces_select_active_member` (active
member) and `workspaces_update_owner` (active member **and** `role = 'owner'`).

Plain select:

```sql
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"5c460eb8-…"}', true);
explain (verbose, costs off) select id from app.workspaces;
```
```
Seq Scan on app.workspaces
  Filter: ((lifecycle_state = ANY ('{active,closing}')) AND (ANY (id = (hashed SubPlan 6).col1)))
  SubPlan 6 …  Index Cond: ((m.user_id = …) AND (m.status = 'active'))        -- no role filter
```

Same statement with the locking clause:

```sql
explain (verbose, costs off) select id from app.workspaces for update skip locked;
```
```
LockRows
  ->  Seq Scan on app.workspaces
        Filter: ((lifecycle_state = ANY ('{active,closing}'))
             AND (lifecycle_state = ANY ('{active,closing}'))
             AND (ANY (id = (hashed SubPlan 6).col1))
             AND (ANY (id = (hashed SubPlan 12).col1)))
        SubPlan 6  …  Index Cond: ((m.user_id = …) AND (m.status = 'active'))
                      Filter: (m.role = 'owner'::text)      -- workspaces_update_owner
        SubPlan 12 …  Index Cond: ((m.user_id = …) AND (m.status = 'active'))
                                                            -- workspaces_select_active_member
```

**Two policies, ANDed, one of them the UPDATE policy.** A lease claim written `for update skip
locked` therefore needs a `SELECT` policy *and* an `UPDATE` policy admitting the row; a table with
only a SELECT policy silently returns fewer rows — the claim finds nothing and looks like an empty
queue. This doubles the predicate surface of any queue policy and gives it two places to drift.

---

## M8 — `FOR UPDATE` needs an UPDATE privilege, and a **column-scoped** one is enough

Without any UPDATE privilege on the relation:

```sql
set local role authenticated;
explain (verbose, costs off) select id from app.workspace_members for update skip locked;
```
```
ERROR:  42501: permission denied for table workspace_members
HINT:  Grant the required privileges to the current role with: GRANT UPDATE ON app.workspace_members TO authenticated;
```

With a column-scoped one — `authenticated` holds `UPDATE (name, lifecycle_state, updated_by)` on
`app.workspaces` and **no** table-level bit:

```sql
select has_table_privilege('authenticated','app.workspaces','UPDATE')  as table_level,   -- f
       has_column_privilege('authenticated','app.workspaces','name','UPDATE') as column_level; -- t
```

…and M7's locking `EXPLAIN` on `app.workspaces` planned without error.

So batch `050`'s `grant update (…columns…) on app.jobs to app_worker` does **not** block a lease
claim at the grant layer. The refusal on the queue is row security, which is what `050` intended and
what its negative control rests on.

---

## M9 — `app_worker` is reachable today only from a role that bypasses RLS

```sql
select r.rolname, r.rolcanlogin, r.rolinherit, r.rolbypassrls, r.rolsuper,
       (select string_agg(g.rolname,',') from pg_auth_members m join pg_roles g on g.oid=m.roleid where m.member=r.oid) as member_of,
       (select string_agg(g.rolname,',') from pg_auth_members m join pg_roles g on g.oid=m.member  where m.roleid=r.oid) as granted_to
  from pg_roles r where r.rolname in (…) order by 1;
```
```
 rolname         | login | inherit | bypassrls | super | member_of                        | granted_to
 anon            | f     | t       | f         | f     | (none)                           | postgres,authenticator,supabase_realtime_admin
 app_command     | f     | f       | f         | f     | (none)                           | postgres,postgres
 app_maintenance | f     | f       | f         | f     | (none)                           | postgres,postgres
 app_worker      | f     | f       | f         | f     | (none)                           | postgres,postgres
 authenticated   | f     | t       | f         | f     | (none)                           | postgres,authenticator,supabase_realtime_admin
 authenticator   | t     | f       | f         | f     | anon,authenticated,service_role  | postgres,supabase_storage_admin
 postgres        | t     | t       | t         | f     | …,app_worker,app_command,app_maintenance | (none)
 service_role    | f     | t       | t         | f     | (none)                           | postgres,authenticator,supabase_realtime_admin
```

Three readings:

* **`RFC-2026-019` §4/1 holds today, measured.** `authenticator` is a member of `anon`,
  `authenticated` and `service_role` and of none of the three service roles.
* **The only member of `app_worker` is `postgres`, which bypasses RLS.** So a policy written
  `TO app_worker` today is reachable only through an identity for which it is moot. A service policy
  written before the worker's login role exists cannot be exercised by anything, in either direction.
* `app_authz` does not appear: batch `011` is declared not applied, and the snapshot's declaration is
  doing its job rather than the role being missing.

---

## M10 — Every policy on this instance names `authenticated`; none names a service role

```sql
select n.nspname, c.relname, p.polname, p.polcmd,
       (select string_agg(r.rolname,',') from pg_roles r where r.oid = any(p.polroles)) as roles
  from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='app' order by 2,3;
```

Ten rows: `user_profiles` (r, w), `workspace_invitations` (a, r, w), `workspace_members` (r),
`workspace_settings` (r, w), `workspaces` (r, w) — **`roles = authenticated` on all ten**.

Consequences the RFC uses:

* `scripts/db/run.mjs`'s `roleScopedCompleteness` passes vacuously today, and **the first policy
  naming `app_worker` will require a row in `db/foundation/lint/rls-exemption-register.json`** with a
  reason, an owner and a review date, because `app_worker` is not in `REQUEST_PATH_ROLES`.
* No probe in this file could exercise a *policy* predicate that reads a workspace setting, because no
  such policy exists anywhere. M4 and M5 measure the expression as a **query** predicate. The
  corresponding claim about a **policy** predicate is in `RFC-2026-022` §7.3 and is not cited here.

---

## What this file does not establish

* Nothing about `app.jobs`, `app.outbox_events`, `app.consumer_ledger`, `app.audit_logs` or
  `app.security_events`. They are not on this instance.
* Nothing about a `SECURITY DEFINER` broker's inlining behaviour, for the same reason
  `RFC-2026-020` §2.5 gave: there is no `sql`-language `SECURITY DEFINER` function here to plan.
* Nothing about a transaction-mode pooler. M1 measures a direct `5432` connection.
* Nothing about whether a custom placeholder's `SET` can be restricted by `GRANT`/`REVOKE ON
  PARAMETER`. M2 measures that the privilege function reports `false` while the `SET` succeeds and
  that `postgres` is not a superuser; whether an ACL row could be created and would bite requires
  DDL and a superuser, and neither was available or wanted here.
