# RFC-2026-020 — The authorization helper is owned by a role that is not a path

Status: Proposed
Date: 2026-09-06
Author: /claude/a1_identity (A1 Identity), author of migration batch `010_identity.sql`
Reviewer sought: /claude/a0_atlas (A0), who owns `RFC-2026-017`, plus the Security review the
migration registry names as `011`'s co-owner
Closes: the question `010_identity.sql:55-80` declared open — which role owns the authorization
helper — and therefore unblocks batch `011`, on which the registry makes batch `020` depend
Depends on: `RFC-2026-017` (approved) §3 for the role purposes and §7 for the assertion still owed;
`RFC-2026-019` (approved) for how the request path reaches a privileged function; `RFC-2026-016`
(approved) §4 for force-unconditionally and the exemption register; `RFC-2026-012` (approved) for
which tier issues the statement
Measurements: `evidence/WP-0A-DB-00/a1-rfc-020-measurements-2026-09-06.md`

## 1. What is open, and why it is mine to propose

Batch `010` created `app.workspace_members` with one policy, and recorded in its own header the two
`§8.1` matrix cells it could not implement and why. This is that record, quoted rather than
summarised, from `db/foundation/migrations/010_identity.sql:66-76`:

> A policy on app.workspace_members that lets a member read ANOTHER member's row must ask whether
> the reader is a member — which queries app.workspace_members from a policy on
> app.workspace_members. Postgres raises 42P17, infinite recursion detected in policy. Breaking the
> cycle requires a helper that is exempt from workspace_members' own policies, and under FORCE ROW
> LEVEL SECURITY a SECURITY DEFINER function owned by the table owner is NOT exempt
> (RFC-2026-017 §3 makes exactly this point). The exemption has to be a policy naming the helper's
> owner role — and **RFC-2026-017 names no role for an authorization helper.** app_worker is
> background work, app_command owns user-initiated command functions, app_maintenance is the
> recorded cross-tenant path. Choosing one here would be inventing the security boundary of every
> later policy in the schema. It is declared open and left to 011 + Security review.

I wrote that. This RFC proposes the answer, and it is reviewed by A0 rather than written by A0 —
the reverse of the order that produced `RFC-2026-018`, whose own successor states why:

> An approved decision resting on a misread of another approved decision is the failure mode this
> repository has the conflict order for, and the conflict order did not catch it either — a person
> reading the two documents together did.
> — `RFC-2026-019` §8

**Two of the four sentences I wrote in `010` are wrong, and the measurements below are how I know.**
They are corrected in §2, not quietly. That is the same defect class `RFC-2026-019` §1 records, in
the same file family, one batch later; it is recorded here rather than left for a reviewer to find.

## 2. What was measured

Instance `xtvtflkntpqfvflvdbwk`, 2026-09-06, read-only through the Supabase MCP tool. No DDL, no
writes, no `CREATE`/`ALTER`/`GRANT` on any role. Several probes assume a role with `SET LOCAL ROLE`
inside the statement's own transaction; that changes `current_user` for the duration of one
statement and reverts, and it is the only instrument that can observe RLS at all, because every
identity the tool would otherwise use bypasses it. The full transcript, including the queries that
returned nothing, is in the evidence file.

### 2.1 The same table, at the same moment, seen by four identities

This is the measurement the decision turns on. `app.workspace_members` holds **6** rows; the fixture
workspace `c4840acc-0323-5e13-b1d3-c18d7eb615cb` holds **5** of them (4 active, 1 suspended), and
`5c460eb8-0710-557a-b423-f9b12c76834f` is its `owner`.

```sql
-- as postgres, the owner of every table in app
select current_user::text as running_as,
       (select rolbypassrls from pg_authid where rolname = current_user) as bypassrls,
       (select relforcerowsecurity from pg_class where oid='app.workspace_members'::regclass) as table_is_forced,
       (select count(*) from app.workspace_members) as rows_visible;
```
```
 running_as | bypassrls | table_is_forced | rows_visible
 postgres   | true      | true            | 6
```

```sql
set local role app_worker;
select current_user::text as running_as,
       has_table_privilege(current_user,'app.workspace_members','SELECT') as has_select_grant,
       (select count(*) from app.workspace_members) as rows_visible;
```
```
 running_as | has_select_grant | rows_visible
 app_worker | true             | 0
```

```sql
set local role app_command;
select current_user::text, (select count(*) from app.workspace_members);
```
```
ERROR:  42501: permission denied for schema app
```

```sql
set local role authenticated;
select current_user::text as running_as,
       (select count(*) from app.workspace_members m
         where m.workspace_id = 'c4840acc-0323-5e13-b1d3-c18d7eb615cb') as members_visible,
       (select count(*) from app.workspaces w) as workspaces_visible
  from (select set_config('request.jwt.claims',
        '{"sub":"5c460eb8-0710-557a-b423-f9b12c76834f","role":"authenticated"}', true)) s;
```
```
 running_as    | members_visible | workspaces_visible
 authenticated | 1               | 1
```

Four facts follow, and the first two correct what `010` said:

1. **`FORCE` does not constrain the owner of these tables.** `relforcerowsecurity` is true and
   `postgres` still reads every row — because `postgres` holds `rolbypassrls`, and a bypass makes
   the forced-owner rule moot. `010:70-71` says a `SECURITY DEFINER` function owned by the table
   owner "is NOT exempt" under `FORCE`. On this platform it **is** exempt, for a reason `FORCE` has
   no bearing on. The conclusion `010` drew survives; the mechanism it named is wrong, and the wrong
   mechanism is the more dangerous half, because it suggests that forcing a table is what protects
   it from its owner.
2. **A non-owner, non-bypassing role does not escape a forced table — it is filtered to zero,
   silently.** `app_worker` holds the `SELECT` grant `010` gave it and sees 0 of 6, with no error.
   That is exactly what a `SECURITY DEFINER` helper owned by such a role does, since `SECURITY
   DEFINER` sets `current_user` to the owner and changes nothing else about RLS. So the failure mode
   of forgetting the helper's policy is **deny**, not allow. Good news, and measured rather than
   assumed. It is also the second sentence of mine that is wrong: `010:69-70` says breaking the
   cycle "requires a helper that is **exempt from** workspace_members' own policies". It requires
   the opposite. A helper that were exempt in that sense would be `postgres` — 6 of 6, every
   authorization question answered yes. What it requires is a helper that is *policed*, at the same
   width as the caller, in a different execution context.
3. **The privilege layer and the policy layer refuse differently, and the difference is legible.**
   `app_command` cannot reach the schema at all (`42501`); `app_worker` reaches it and is emptied by
   RLS. This is the distinction `010:44-52` built the grant-without-policy shape to preserve, and it
   holds.
4. **`§8.1`'s "Member list SELECT: Owner Y" is unimplemented, measurably, right now.** The owner of
   a five-member workspace sees one membership row. `workspaces_visible = 1` in the same statement
   shows the non-recursive nested read working; the recursive one is what is missing.

### 2.2 `auth.uid()` is a function of session state, not of `current_user`

```sql
select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname='auth' and p.proname='uid';
```
```
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $function$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$
```
`prosecdef` is false, `proowner` is `supabase_auth_admin`. It reads two GUCs and nothing else. And
behaviourally:

```sql
select current_user::text as current_user_before, u.uid as auth_uid
  from (select set_config('request.jwt.claims',
        '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true) as c) s,
       lateral (select auth.uid() as uid) u;
```
```
 current_user_before | auth_uid
 postgres            | 11111111-1111-1111-1111-111111111111
```

`current_user` is `postgres`, a role that appears nowhere in the token, and `auth.uid()` returns the
token's subject anyway. **`SECURITY DEFINER` changes `current_user`. It does not change the GUC.**
Therefore a helper running as some other role still knows exactly who the caller is — which is the
premise the whole decision rests on, because it means the helper never needs to see a row the caller
could not see for itself.

### 2.3 The helper cannot call `auth.uid()`, and the platform will not let us fix that with a grant

```sql
set local role app_worker;
select ... auth.uid() ...;
```
```
ERROR:  42501: permission denied for schema auth
```
```sql
select nspname, nspacl::text, has_schema_privilege('postgres', oid, 'USAGE') as postgres_usage,
       has_schema_privilege('postgres', oid, 'USAGE WITH GRANT OPTION') as postgres_can_grant
  from pg_namespace where nspname in ('auth','app');
```
```
 nspname | nspacl                                                                | postgres_usage | postgres_can_grant
 app     | {postgres=UC/postgres,authenticated=U/postgres,app_worker=U/postgres}  | true           | true
 auth    | {supabase_admin=UC/supabase_admin,anon=U/…,authenticated=U/…,
           service_role=U/…,supabase_auth_admin=UC/…,dashboard_user=UC/…,
           postgres=U/supabase_admin}                                            | true           | false
```

`auth` is owned by `supabase_admin`; `postgres` holds `U` on it **without grant option**. Our
migrations run as `postgres`. So no migration can give any role we create the ability to call
`auth.uid()`. A helper owned by such a role must read the JWT the way `auth.uid()` does — through
`current_setting`, which is in `pg_catalog` and needs no schema privilege at all. Confirmed:

```sql
set local role app_worker;
select current_user::text as running_as,
       (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid as uid_from_guc
  from (select set_config('request.jwt.claims','{"sub":"1111…1111"}', true)) s;
```
```
 running_as | uid_from_guc
 app_worker | 11111111-1111-1111-1111-111111111111
```

Rejected on the spot, and recorded because it is the obvious way round: granting the helper's owner
membership in `authenticated` would supply the missing `auth` privilege — and would also hand it
`authenticated`'s policies, which is the one thing the owner must not have (§5/3, option D).

### 2.4 A `sql` `SECURITY INVOKER` function is inlined into the caller's plan

```sql
explain (verbose, costs off) select auth.uid() as uid;
```
```
Result
  Output: (COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text),
          ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid
```
The plan contains the body, not a function call. This is why a `SECURITY INVOKER` SQL helper offers
no boundary at all — see option D.

### 2.5 What could NOT be measured, and why

```sql
select n.nspname, c.relname, p.polname from pg_policy p
  join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
 where coalesce(pg_get_expr(p.polqual,p.polrelid),'') || ' ' || coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'')
       ~ ('(^|[^._[:alnum:]])' || n.nspname || '\.' || c.relname || '($|[^._[:alnum:]])');
```
```
(0 rows)
```
**No policy anywhere on this instance references its own relation**, so `42P17` cannot be observed
here. Producing it requires creating a recursive policy, which is DDL, which this run is not
permitted and should not want. A companion query for `sql`-language `SECURITY DEFINER` functions
returned no rows either, so the non-inlining of `SECURITY DEFINER` — the property option G depends
on — could not be demonstrated on this instance.

Both are named in §6.2 as conditions that must be *executed*, not cited, before this closes. I am
not going to summarise the PostgreSQL rewriter here; `RFC-2026-019` §8 records what happens when a
decision rests on a summary. What I will state as reasoning rather than measurement, flagged as
such: the recursion is detected structurally, on the relation being expanded, not on the data — so
it fires whether or not any row would have terminated the loop, and a cycle of length two
(`workspace_members` → `workspaces` → `workspace_members`) is the same cycle. **`§6.2` requires
`011` to measure both claims before this decision closes.**

## 3. Where the problem actually is, which is smaller than `010` implied

`010`'s header reads as though the schema needs an exempt helper. Measured, it does not:

- Every policy in `010` that reads `app.workspace_members` from a **different** relation works
  today, with no helper and no exemption — `workspaces_visible = 1` in §2.1 is that, executed.
- The self-reference exists on exactly one relation: `app.workspace_members`. It affects the two
  cells `010` listed, plus the member INSERT/UPDATE/DELETE cells (`§8.1` "Transfer/remove owner").
- **Batch `020`'s policies therefore need nothing this RFC grants.** Business and page tables carry
  `workspace_id` and read membership from another relation, which is the shape already proven. The
  registry's `020 → 011` dependency is `§7`'s "role should not be hard-coded as a policy on every
  table directly" — a uniformity requirement — not a capability `020` would otherwise lack. That
  distinction is offered to the Product Owner as an observation, not as a decision; see §8.

So the question is not "which role gets to see membership rows". It is: **what breaks a rewrite
cycle on one relation, without creating an identity that can see more than the caller can.**

## 4. Options

For each: what it makes true, what it costs, and what it makes unfalsifiable if chosen badly.

### A. `app_command`

*True:* no new role; `RFC-2026-017` §3's enumeration untouched; `app_command` already "owns the
`SECURITY DEFINER` command functions" and a helper is such a function.

*Costs:* §3's clause is about **user-initiated writes**. The helper is neither user-initiated nor a
write — the policy machinery calls it on reads no user asked for. Measured, `app_command` has no
`USAGE` on `app` at all (§2.1's `42501`), so this begins by widening a role the catalog currently
pins at "reaches nothing".

*Unfalsifiable:* the policy attaches to the **role**, and every command function every later batch
owner writes runs as that role. The authorization boundary would widen silently, with no diff saying
so, every time someone writes a command. Worse, "may act" and "may read the data that decides who
may act" collapse into one identity: a command that authorises itself by reading `workspace_members`
directly is indistinguishable, in `pg_policy` and in any test, from one that asked the helper.
`RFC-2026-019` §5 asserts *"No table in `app` is owned by `app_command`"* precisely to keep that
role's reach visible; this would spend the reach it was keeping.

### B. `app_worker`

*True:* cheapest by a distance — measured, it already holds `USAGE` on `app` and `SELECT` on
`app.workspace_members`.

*Costs:* those grants exist for the opposite reason. `010:44-52` gave `app_worker` privileges and no
policy so that a refusal could only have come from RLS, making `RFC-2026-017` §7's owed negative
assertion non-vacuous. §2.1 measures that construction working: 0 of 6, with the grant present.

*Unfalsifiable:* granting `app_worker` a policy on this table retires the only assertion that would
detect a service role acquiring `BYPASSRLS`, on the table where it matters most. It trades a working
control for a convenience. Separately, a worker path carries no JWT, so the helper's identity
expression is null there — the role would own a helper that always answers "no" when the role itself
runs it, which is a shape nobody can test meaningfully.

### C. `app_maintenance`

*True:* it is the declared cross-tenant path, and "read another member's row" sounds cross-tenant.

*Costs:* it is not cross-tenant. §2.2 shows the caller's identity survives into the helper, so the
helper only ever needs the caller's **own** row. Choosing the cross-tenant role for a question that
is not cross-tenant is a widening bought for nothing.

*Unfalsifiable:* `RFC-2026-017` §3 requires *"Every use of `app_maintenance` carries a recorded
reason."* This helper runs on the request path, so that record would receive one entry per read,
forever. A control whose output is entirely request-path noise cannot be read, and a genuine
cross-tenant maintenance access becomes unfindable inside it. This is the worst option available: it
does not merely fail to add a control, it destroys one that already exists.

### D. A helper owned by the table owner, or a `SECURITY INVOKER` helper

*Costs, measured:* owned by `postgres`, the helper sees all 6 rows (§2.1) — every authorization
question answers "yes" for reasons unrelated to the caller. `SECURITY INVOKER` is worse than it
looks: §2.4 shows a `sql` invoker function is **inlined into the caller's plan**, so it is not a
boundary; and if written so it cannot be inlined, it runs as `authenticated`, whose policy set on
`workspace_members` would by then contain the very policy that calls it.

*Unfalsifiable:* the non-inlinable invoker form converts a deterministic, always-raised, plan-time
`42P17` into a runtime recursion that appears only for some rows under some plans and dies at
`max_stack_depth`. PostgreSQL's recursion detector is itself a control; this defeats the detector
without removing the recursion. **A decision that makes a database error stop appearing is not the
same as one that makes the error stop being true.**

### E. Restructure so the recursive read is unnecessary — a maintained projection

The strongest alternative, and the one this RFC came closest to proposing. Shape: a second relation,
say `app.workspace_member_directory`, projecting `(workspace_id, user_id, role, status)`, maintained
by trigger. The member list is read from **it**, under a policy that reads `app.workspace_members` —
a different relation, no cycle, the exact shape §2.1 measured working.

*True:* no new role, no `SECURITY DEFINER`, no exemption of any kind, nothing for a register to
carry. The failure mode is also better than it first appears: because the *predicate* still reads
the live membership table, a stale projection row yields stale **content**, not wrong
**authorization**.

*Costs:* a second table carrying PII-2/AUTH-3 columns needs its own classification, retention class,
dictionary fragment, indexes and closure behaviour under `§11.4`. `§5` names no such table, so this
is a data-model change, not a helper — a larger change than the one it avoids. And it does not
generalise: `§7` asks for one helper resolving capability plus tenant context plus member scope, and
this answers one cell of one table.

*Unfalsifiable — and this is why it loses:* "the projection equals the table" is a runtime invariant
with no artefact that can hold it. No cross-table constraint expresses it. A test that seeds through
the trigger can never observe drift; drift arrives only through paths that bypass triggers — `COPY`,
`session_replication_role = replica`, a batch-160 retention sweep, a chunked backfill,
`ALTER TABLE … DISABLE TRIGGER` — and those are exactly the paths no isolation test runs. Option G's
central claim, by contrast, is a string comparison against `pg_get_expr`, which a lint performs on
every build. **Between an option that needs no exemption but whose correctness cannot be checked,
and one that takes a narrow exemption whose exact width a build re-checks every time, this
repository has already chosen — that is what `RFC-2026-016` §4 did when it retired "force where
compatible" for being unfalsifiable and replaced it with a register.** Choosing E here would be
retiring that reasoning a few batches after adopting it.

### F. A server-set GUC naming the caller's workspaces

*True:* no role, no function, no exemption. `RFC-2026-016` §2 already contemplates *"the service
policy scoped by a server-set workspace GUC"*.

*Costs:* §2 contemplates it for **service** policies, where there is no `auth.uid()` at all. On the
request path there is one — measured. Using a GUC here would mean the policy asserts only that the
server said so.

*Unfalsifiable:* "the GUC was derived from a verified membership" is a property of application code,
which no schema test can falsify. `RFC-2026-012`'s finding was exactly that a server-side convention
is not a control. Applying a convention to `app.workspace_members` — the relation every other policy
in the schema joins through — would make the root of the authorization graph the one node the
database does not check.

### G. A fourth role that is not a path — **proposed**

See §5.

## 5. Decision proposed

**1. `RFC-2026-017` §3 names no role for the authorization helper because §3 enumerates the roles a
*path* runs under, and an authorization helper is not a path.** That is a category difference, not an
omission to be filled by picking whichever of the three fits least badly. §3's own sentence is *"The
service path runs under roles created for it"*; each of the three answers "how does a session become
this". The helper owner answers no such question: nothing connects as it, nothing assumes it, it is
never a session identity. It exists only as the owner of functions.

**2. Create a fourth role — proposed name `app_authz`; the name is not load-bearing — that owns the
`011` authorization helpers and nothing else.** `NOLOGIN NOBYPASSRLS NOINHERIT`, no password, no
membership granted to `authenticator` or to anything else, owning no table. `RFC-2026-019` §4/1's
negative extends to it unchanged.

**3. The exemption it takes is structural, not scopal — and that is the whole of the proposal.**
`app_authz` holds exactly one policy in the schema: `FOR SELECT` on `app.workspace_members`, whose
`USING` expression is `workspace_members_select_own_active`'s predicate — own row, `status =
'active'` — with the identity expression inlined. Semantically:

```
    user_id = <caller's subject, read from request.jwt.claims> and status = 'active'
```

against what the catalog holds today for `authenticated`:

```
    ((user_id = ( SELECT auth.uid() AS uid)) AND (status = 'active'::text))
```

**The helper sees no row the caller could not already select for itself.** It is not given
cross-tenant reach and it is not given the member list — it is given the caller's own membership row,
which the caller already has, in a context where the rewriter is not in the middle of expanding
`workspace_members`. The exemption buys the boundary and nothing else. `010` called this an
exemption; §7 records why the word was imprecise.

**4. The identity expression is read from `current_setting('request.jwt.claims')`, not by calling
`auth.uid()`.** Not a style choice: §2.3 measures that `postgres` cannot grant `USAGE` on schema
`auth`, so no role our migrations create can call it. Both the helper body and `app_authz`'s own
policy are subject to this. The cost is a two-line copy of a platform function's body, and §6 turns
that cost into a lint rather than a comment.

**5. Every helper that reads `app.workspace_members` is `SECURITY DEFINER` owned by `app_authz`** —
uniformly, including helpers called from policies on other tables where no cycle exists. Once the
member-list policy for `authenticated` contains a function call, any *invoker*-mode helper reading
that table as `authenticated` re-enters that policy at runtime (option D). Uniformity is not
tidiness here; it is what keeps `authenticated`'s policy set out of the helper's execution context.

**6. Nothing about `app_worker`, `app_command`, `app_maintenance` or `service_role` changes.**
`app_worker` keeps its grants and its zero policies, so `RFC-2026-017` §7's owed assertion stays
writable on this table.

## 6. What must be true before this closes

### 6.1 Assertable against the catalog, by the lint that already exists

Each is a rule `scripts/db/run.mjs` can carry and a field `catalog-snapshot.json` can hold. **This
RFC writes none of them** — a Proposed decision that has already changed the tree is not a proposal.

1. `app_authz` exists with `rolcanlogin`, `rolbypassrls`, `rolsuper`, `rolinherit` all false and no
   password, and joins the `SERVICE_ROLES` list `run.mjs:360` already checks. `KNOWN_BYPASS` is
   unchanged, so a fourth bypassing role is still a finding.
2. `authenticator` is a member of `app_authz`: **no**. `RFC-2026-019` §5's negative, extended by one
   name.
3. No table in `app` is owned by `app_authz`. Same rule as `app_command`, same reason.
4. **Every function owned by `app_authz` is `prosecdef = true` with `search_path = ""`.** The role's
   entire purpose; an invoker-mode function owned by it is the option-D failure arriving unremarked.
5. **`app_authz` holds exactly one policy in schema `app`**, on `app.workspace_members`, `FOR
   SELECT`, and `pg_get_expr(polqual, polrelid)` equals a pinned literal. The pinned string is the
   whole control: any widening — `using (true)`, dropping `status = 'active'`, adding a function
   call — fails the build with a diff that shows exactly what changed.
6. **`app_authz`'s grants are exactly `USAGE` on schema `app` and column-scoped `SELECT` on
   `app.workspace_members`.** Column-scoped, so it cannot read `token_hash` or any other table.
7. **The inlined identity expression still matches the platform's.** A rule comparing the pinned
   expression against `pg_get_functiondef('auth.uid()')`'s body, so that a Supabase change to
   `auth.uid()` fails the build instead of silently diverging. This is the cost of decision 4, made
   falsifiable.

### 6.2 Executable only, not citable — the two claims this run could not measure

`011` must produce both as tests with recorded exit codes. Neither may be discharged by quoting
documentation, this RFC included.

8. **That the cycle exists.** Create the naive recursive member-list policy in a disposable
   database, run the select, and record `42P17` and its message verbatim. §2.5 shows why it could
   not be observed here.
9. **That `SECURITY DEFINER` breaks it.** The same policy expressed through the `app_authz` helper,
   with `EXPLAIN (VERBOSE)` recorded showing the helper **not** inlined. If it inlines, option G
   fails and this decision is wrong.

### 6.3 Isolation cases (`§8.6` shape), owed by `011`

10. An active member of workspace A sees all of A's members; sees none of workspace B's.
11. A **suspended** member of A sees zero rows — including through the helper. `§12.6` assertion 5,
    now reachable through a widened policy that must not widen this.
12. Calling the helper directly as `authenticated` for a workspace the caller is not in returns
    false. The helper is `EXECUTE`-granted to `authenticated`, so it is callable, and it must not be
    a membership oracle for third parties.
13. `EXECUTE` on every helper is revoked from `PUBLIC` and granted explicitly (`§8.5`).
14. **A negative control**: with `app_authz`'s single policy dropped, the member-list cases fail.
    Without it, a helper that silently bypasses is indistinguishable from one that is correctly
    policed — the same defect `RFC-2026-016` §5 found in the data package's own smoke set.

## 7. Consequences, including one this RFC does not fix

- **`RFC-2026-017` §3's table gains a fourth row, and A0 owns that edit.** `RFC-2026-019` §4/5
  established that §3 is corrected by its owner, not by the RFC that finds the problem. This RFC
  proposes the amendment; it does not make it.
- **The exemption register cannot carry this, and that is a real gap in `RFC-2026-016` §4.** §4 says
  *"A bypass is a policy on a named role, never a role attribute"* — and the register the same
  section created can only corroborate role **attributes**. `run.mjs:277-282` rejects a row naming a
  role that holds neither `rolbypassrls` nor `rolsuper`, which `app_authz` must not hold. So a row
  for it would *fail* the lint. The sanctioned form of exemption has no home in the register built
  for exemptions. This RFC adds no row and changes no lint; the gap belongs to `RFC-2026-016`'s
  owner, and it is recorded so it is not discovered a third time.
- `010`'s header is wrong in the two places §2.1 identifies. Migration invariant 1 forbids rewriting
  it; the correction lives here and in whatever `011` writes.
- One more role in every role-topology assertion, one more owner to check, one more pinned string.

## 8. What this does not decide

- **The helper API.** Names, signatures, return types, whether capability resolution is one function
  or several. That is `011`'s, with the Security review the registry names. This decides the owner
  and the width of its policy, nothing else.
- **The `P` cells.** `§8.1` marks Workspace UPDATE `P` for admin and Member list SELECT `P` for
  editor. `P` is "passes per policy/explicit capability" and no document defines the capability set.
  A helper can resolve a capability only once someone has decided what capabilities exist. Still
  open, still not an agent's to choose (`§15`).
- **Batch `021`'s scope tables.** `workspace_member_scopes` will need `app_authz` to have a policy on
  it too, by the same reasoning and with the same width test. That is `021`'s to propose.
- **Whether `020` may start before `011` merges.** §3 records the measurement — `020`'s policies need
  no exemption — but the registry's dependency is A0's and the Product Owner's to read, not mine to
  waive. I am the author of the batch `020` depends on, which is precisely the position from which
  one should not be relaxing `020`'s dependencies.
- **The invitation token digest algorithm**, still open from `010`. Unrelated, still unowned.
- **Anything about `app_worker`'s connection method.** `RFC-2026-019` §4/3 left it open and this
  changes nothing about it.

## 9. Provenance, and why I am not a disinterested party

- **I authored `010_identity.sql`**, whose two unimplemented `§8.1` cells this decision unblocks. I
  have an interest in this being resolved and in the resolution making my file look considered. The
  correction in §2.1 — that two sentences of my own header state the wrong mechanism — is offered as
  the counterweight, and a reviewer should weigh whether it is enough.
- **I am a subagent run in the same vendor and model family as A0**, the run that will review this
  and that owns `RFC-2026-017`. `prefer_cross_vendor_review` is not satisfied. This is the identical
  defect `RFC-2026-016` §7 recorded about the A1 analysis behind it — *"that run was spawned from
  the A0 session, so it is not independent of the author in the sense `independence.no_self_approval`
  intends"* — and recording it a second time does not cure it. A cross-vendor reviewer would be worth
  more than this paragraph.
- **The measurements are this run's**, taken 2026-09-06 against `xtvtflkntpqfvflvdbwk`, read-only,
  and reproducible from the queries printed above and in the evidence file. Where I reasoned instead
  of measuring — the rewriter's cycle detection, and `SECURITY DEFINER`'s exclusion from inlining —
  §2.5 says so and §6.2 makes those blocking rather than assumed.
- **I ran no ratchet, no manifest regeneration and no `npm run check`**, and I wrote no migration,
  policy, lint rule or test. The working tree carries this file and the evidence file, and nothing
  else.
