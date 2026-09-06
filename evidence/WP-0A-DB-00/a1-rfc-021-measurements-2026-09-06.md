# Measurements for RFC-2026-021 — the client read allowlist

Run: `/claude/a1_bastion` (A1 Security), 2026-09-06.
Instance: `xtvtflkntpqfvflvdbwk`, PostgreSQL 17.6, session user `postgres`, `is_superuser = off`.
Method: read-only SQL through the Supabase MCP `execute_sql` tool. **No DDL and no writes were issued.**
`SET LOCAL ROLE` was used to observe refusals from the client roles; it changes no object and
survives no transaction.

## 0. The limit that shapes every measurement below

`db/foundation/lint/catalog-snapshot.json` declares `011`, `020`, `021` and `030` as
`not_applied_to_this_instance`. **`app.industry_packs`, `app.industry_pack_versions` and
`app.industry_assignments` do not exist on this database.** Nothing below was measured on them.
Every probe is constructed from the objects that *are* here — batch `010`'s five tables, the platform
roles, the three views the platform itself ships, and the catalog.

The consequence is stated rather than absorbed: **a probe that would need to create a
`security_invoker` view is DDL, and this run may not issue it.** The two claims that would need such
a probe are listed in §7 as owed to execution, and this RFC does not let them decide anything. That
is `RFC-2026-020` §6.2's rule applied to a different question.

---

## M1 — The allowlist is empty in the live catalog, not only in the committed snapshot

```sql
select n.nspname as schema, c.relname as view, pg_get_userbyid(c.relowner) as owner,
       c.reloptions,
       (select a.rolbypassrls from pg_authid a where a.oid = c.relowner) as owner_bypasses_rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where c.relkind in ('v','m')
   and n.nspname not in ('pg_catalog','information_schema')
 order by 1,2;
```

| schema | view | owner | reloptions | owner_bypasses_rls |
|---|---|---|---|---|
| extensions | pg_stat_statements | postgres | NULL | true |
| extensions | pg_stat_statements_info | postgres | NULL | true |
| vault | decrypted_secrets | supabase_admin | NULL | true |

Three views in the whole database, none in `app`, none carrying `security_invoker`, every one owned
by a role that bypasses RLS. Confirmed separately: `views_in_app = 0`.

`db/foundation/lint/catalog-snapshot.json` records `exposed_views: []`. That agrees.

---

## M2 — Every `app` table is owned by a role that bypasses RLS

```sql
select (select string_agg(distinct pg_get_userbyid(c.relowner), ',')
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'app' and c.relkind = 'r')                as app_table_owners,
       (select rolbypassrls from pg_authid where rolname = 'postgres') as postgres_bypasses_rls;
```

```
app_table_owners = "postgres"     postgres_bypasses_rls = true
```

Read with M1: a view our migrations create in `app` is created by `postgres` and is therefore owned
by `postgres`. A view that is **not** `security_invoker` has its base-table access checked as its
owner, and this owner bypasses row level security entirely.

So `§8.5`'s one-line rule — *"Exposed view: `security_invoker = true`"* — is not a style preference
on this platform. On a `FORCE ROW LEVEL SECURITY` table with no policy, a non-invoker view owned by
`postgres` is the difference between zero rows and every row. The behavioural half of that claim is
in §7, owed to execution.

---

## M3 — A column-scoped grant covering every current column is **not** a table-wide grant

This is the measurement that decides the RFC.

```sql
select has_table_privilege('authenticated','app.workspaces','SELECT')       as table_wide_select,
       (select bool_and(has_column_privilege('authenticated','app.workspaces',a.attname,'SELECT'))
          from pg_attribute a
         where a.attrelid = 'app.workspaces'::regclass and a.attnum > 0 and not a.attisdropped)
                                                                            as holds_every_column;
```

```
table_wide_select = false        holds_every_column = true
```

And the contrast pair, on the same table, from the per-role sweep:

| table | grantee | privilege | columns_granted | columns_total | table_wide |
|---|---|---|---|---|---|
| workspaces | authenticated | SELECT | 7 | 7 | **false** |
| workspaces | app_worker | SELECT | 7 | 7 | **true** |
| workspace_invitations | authenticated | SELECT | 11 | 12 | false |
| workspace_invitations | authenticated | UPDATE | 6 | 12 | false |
| user_profiles | authenticated | UPDATE | 3 | 7 | false |
| workspace_settings | authenticated | UPDATE | 3 | 7 | false |

(sweep query: `has_column_privilege` over every column × `SELECT|INSERT|UPDATE`, joined against
`has_table_privilege` for the same verb; `anon` appears in **no** row of the full result.)

Two roles reach every column of `app.workspaces` today. One holds the table-level bit and one does
not. They are different privileges, so **a column added to `app.workspaces` tomorrow is readable by
`app_worker` and is not readable by `authenticated`** until somebody writes a new `GRANT`.

`RFC-2026-012` §2 justifies "never a base table" with *"Column drift is silent, and RLS filters
rows, not columns."* The second clause is true. **The first is false in the grant shape batch `010`
already writes**: a column-scoped grant is a fail-closed column-drift control, and it is the only
one either a view or a base table has, because it is the same mechanism in both cases.

---

## M4 — The grant layer and the policy layer are distinguishable, observed live

Same table, same role, same shape of statement, one transaction each.

```sql
set local role authenticated;
select count(*) from app.workspace_invitations;
```
```
rows_via_granted_column = 0            -- succeeded; refused by row level security
```

```sql
set local role authenticated;
select token_hash from app.workspace_invitations limit 1;
```
```
ERROR: 42501: permission denied for table workspace_invitations
HINT:  Grant the required privileges to the current role with:
       GRANT SELECT ON app.workspace_invitations TO authenticated;
```

`token_hash` is the one column of twelve that `authenticated` does not hold (M3). The privilege
system refuses before RLS is consulted, and the difference is observable from outside — which is
what `tests/db/identity/isolation-cases.mjs` asserts with `deniedBy: 'grant'` versus a row count.

---

## M5 — A view fixes, at CREATE time, the base-table columns its caller must hold — including columns it never projects

No `app` view exists to probe, so this is read from a view the platform ships, through the stored
rewrite rule, which is PostgreSQL answering rather than PostgreSQL being summarised.

```sql
select (regexp_matches(r.ev_action,
          ':relid (\d+) :inh \w+ :requiredPerms \d+ :checkAsUser \d+ :selectedCols \(b([^)]*)\)',
          'g'))[1]::oid::regclass::text as base_rel,
       (regexp_matches(r.ev_action,
          ':relid (\d+) :inh \w+ :requiredPerms \d+ :checkAsUser \d+ :selectedCols \(b([^)]*)\)',
          'g'))[2] as selected_bitmapset
  from pg_rewrite r
  join pg_class c on c.oid = r.ev_class
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'information_schema' and c.relname = 'schemata';
```

| base_rel | selected_bitmapset |
|---|---|
| pg_namespace | ` 8 9 10` |
| pg_authid | ` 8 9` |

The view's definition, read back with `pg_get_viewdef`:

```
 SELECT current_database()::information_schema.sql_identifier AS catalog_name,
    n.nspname::information_schema.sql_identifier AS schema_name,
    u.rolname::information_schema.sql_identifier AS schema_owner,
    ... NULLs ...
   FROM pg_namespace n, pg_authid u
  WHERE n.nspowner = u.oid
    AND (pg_has_role(n.nspowner, 'USAGE'::text) OR has_schema_privilege(n.oid, 'CREATE, USAGE'::text));
```

Column numbers: `pg_namespace` is `1=oid, 2=nspname, 3=nspowner, 4=nspacl`; `pg_authid` is
`1=oid, 2=rolname, 3=rolsuper`.

The view references `nspname`, `nspowner` and `oid` of `pg_namespace` — attnums `{1,2,3}` — and
`rolname` and `oid` of `pg_authid` — attnums `{1,2}`. The recorded bitmapsets are `{8,9,10}` and
`{8,9}`. **Both fit one offset and only one: member = attnum + 7**, which is
`-FirstLowInvalidHeapAttributeNumber` in PostgreSQL 12 and later. Two independent relations in one
rule agree on it, so the reading is not a coincidence of arithmetic.

The load-bearing part: **`nspowner` and both `oid` columns are recorded even though no caller can
select them.** They appear only in the join condition and inside `pg_has_role`. The privilege
requirement a view places on its base table is *every column the view definition touches*, fixed
when the view is created, not the columns the client's query asks for.

Two consequences, and they point in opposite directions:

* Widening a `security_invoker` view to a column outside the client's column-scoped base grant makes
  **every** query through that view fail with 42501 — for every client, at once, immediately. Column
  drift through a view is loud, not silent, provided the base grant is column-scoped (M3).
* A `security_invoker` view that *filters* on a column must have the client hold that column too. So
  a view cannot hide a column by filtering on it. Row filtering has to be a **policy**, or the view
  has to be `security_definer` — which M2 says would bypass RLS as `postgres`.

---

## M6 — `anon` holds nothing, and its refusal is at the schema, not the object

```sql
select has_schema_privilege('anon','app','USAGE') as anon_usage_app,
       (select count(*) from pg_namespace n
          cross join lateral (values('USAGE'),('CREATE')) p(pr)
         where n.nspname='app' and has_schema_privilege('anon', n.oid, p.pr))  as anon_schema_privs,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname in ('app','private') and has_function_privilege('anon', p.oid,'EXECUTE'))
                                                                               as anon_exec_funcs;
```

```
anon_usage_app = false     anon_schema_privs = 0     anon_exec_funcs = 0
```

`anon` also appears in no row of the M3 column sweep, on any table, for any verb.

Observed live:

```sql
set local role anon;
select count(*) from app.workspaces;
```
```
ERROR: 42501: permission denied for schema app
LINE 2: select count(*) from app.workspaces;
                             ^
```

**The refusal is on the SCHEMA.** Name resolution stops before any table is considered. This is the
cost of an `anon` entry stated as a measurement: opening one requires
`grant usage on schema app to anon`, which is not scoped to the entry — it moves every object in
`app`, present and future, from *"the name does not resolve"* to *"the name resolves and is refused
per object"*, and every anonymous isolation case asserting
`deniedOn: { kind: 'schema', name: 'app' }` changes layer on that day.

---

## M7 — Default privileges: the same `CREATE VIEW` is inert in `app` and self-granting in `public`

```sql
select coalesce(n.nspname,'(all schemas)') as schema, pg_get_userbyid(d.defaclrole) as for_role,
       d.defaclobjtype as objtype, d.defaclacl::text as default_acl
  from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
 order by 1,2,3;
```

Relevant rows (`objtype = 'r'` covers tables **and** views):

| schema | for_role | default_acl |
|---|---|---|
| `app` | — | **no row** |
| public | postgres | `{postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres, authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres}` |
| public | supabase_admin | `{... anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm ...}` |
| storage | postgres | `{... anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm ...}` |
| graphql, graphql_public | supabase_admin | `{... anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm ...}` |

Confirmed separately: `default_acls_in_app = 0`.

A view created in `app` by `postgres` arrives with an empty ACL — nothing reaches it until a `GRANT`
is written. **The identical statement in `public` arrives already granted `arwdDxtm` — all
privileges — to `anon`, `authenticated` and `service_role`, and no `GRANT` appears in the migration
text.**

`tests/db/identity/identity-isolation.test.mjs` guards the allowlist by scanning migration text for
`grant ... on app.<table> ... to authenticated|anon`. **That rule cannot see this path.** A guard
over text is a guard over what somebody wrote, and the ACL is what the database did.

---

## M8 — What the last hop is, and that it is not measurable from here

```sql
select coalesce(d.datname,'(all databases)') as db, coalesce(r.rolname,'(all roles)') as role, s.setconfig
  from pg_db_role_setting s
  left join pg_database d on d.oid = s.setdatabase
  left join pg_roles   r on r.oid = s.setrole
 where array_to_string(s.setconfig,',') ilike '%pgrst%'
    or array_to_string(s.setconfig,',') ilike '%schema%';
```

```
(0 rows)
```

Whether schema `app` is exposed to the Data API (PostgREST's `db-schemas`) is **not readable from
SQL on this instance.** It is project configuration, outside the database and outside this
repository. It cuts both ways and both are worth recording: we cannot assert it as a control, and we
may not rely on it as one. A granted view is one config change away from reachable, and a lint that
counted on `app` being unexposed would be asserting something it cannot see.

---

## M9 — Miscellany, measured because it is cited

```sql
select pg_has_role('postgres','authenticated','MEMBER') as postgres_in_authenticated,
       pg_has_role('postgres','anon','MEMBER')          as postgres_in_anon,
       (select count(*) from app.workspaces)            as workspaces_rows,
       (select count(*) from app.user_profiles)         as user_profiles_rows;
```

```
postgres_in_authenticated = true   postgres_in_anon = true
workspaces_rows = 2                user_profiles_rows = 6
```

`postgres` is a member of both client roles, which is what makes `SET LOCAL ROLE` a legitimate
read-only probe here rather than a privilege change. The fixture rows are batch `010`'s.

`vault.decrypted_secrets` was checked as a possible live demonstration of the view-owner
indirection and is **not** one: `postgres` and `service_role` hold identical ACLs on the view and on
`vault.secrets` (`{supabase_admin=arwdDxtm/…, postgres=r*d*D*x*/…, service_role=rd/…}`), so no role
reaches the view without also reaching the base table. Recorded so the next run does not re-derive
the dead end.

---

## §7. What could NOT be measured, and is therefore not permitted to decide anything

`RFC-2026-020` §6.2 established the shape: a claim that must be discharged by **execution** is not
discharged by **citation**, however confident the citation. Two claims about the mechanism this RFC
designs are in that class, because settling them needs `CREATE VIEW`, which is DDL, which this run
may not issue on this instance.

**(a)** A view `with (security_invoker = true)` over a base table that is `ENABLE` + `FORCE ROW
LEVEL SECURITY` with **no policy** returns **zero rows** to `authenticated` even when
`authenticated` holds the column grant on the base table — and returns rows only once a `SELECT`
policy admits them.

**(b)** The **same** view **without** `security_invoker` returns **every** row to the same caller,
because its owner is `postgres` and `postgres` bypasses row level security (M2).

If **(b)** is false, M2's reasoning is wrong and the shape of an allowlist entry has to be
re-derived. If **(a)** is false, an entry needs a fourth object nobody has named.

Both are to be proven by execution in the CI container that `make db-migrate-clean` builds, in the
batch that lands the **first** allowlist entry — not in this RFC, and not by anybody quoting the
PostgreSQL manual at a reviewer.

---

## Reproduction

Every query above is stated in full and is read-only. They were issued against
`xtvtflkntpqfvflvdbwk` on 2026-09-06 with the Supabase MCP `execute_sql` tool as `postgres`
(`is_superuser = off`). No `CREATE`, `ALTER`, `DROP`, `GRANT`, `REVOKE`, `INSERT`, `UPDATE` or
`DELETE` was issued. `SET LOCAL ROLE` was the only session change and it is discarded with the
transaction.
