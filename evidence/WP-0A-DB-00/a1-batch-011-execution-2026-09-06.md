# Batch 011 — RFC-2026-020 §6.2 discharged by execution

Run: `/claude/a1_identity` (A1 Identity), author of `010_identity.sql`, of `tests/db/identity/**`,
and of `RFC-2026-020`.
Date: 2026-09-06.
Branch: `agent/claude/WP-0A-DB-00-batch-011`. Pull request: #77.

This file records what was EXECUTED. RFC-2026-020's approval is conditional —

> The decision is NOT IN EFFECT until §6 holds — including §6.2's two claims, which must be
> discharged by EXECUTION in batch 011 and never by citation: if the helper inlines, this decision
> is wrong.

— so the transcripts below are the substance of this batch, not an appendix to it. They are copied
verbatim from the CI log, which prints them on success as well as on failure.

**Both §6.2 claims hold. RFC-2026-020 option G is not falsified.**

## 0. What this evidence is not

This run is the AUTHOR. Nothing here is a review, a test verification or an integration
verification, and this package's `cross_vendor_exception` is not lifted by it. The proofs run in
CI, which is a control; this file is a record of what that control printed.

The proofs ran against the `postgres:17` service container, whose platform roles come from
`db/foundation/ci/supabase-shim.sql` and were created by us. Read them as the shim's own header
asks: they prove the POLICIES behave as written, never that this holds on Supabase. The one claim
that would need a provisioned instance — that `service_role` ships with `BYPASSRLS` — is not in
scope here and is unchanged.

## 1. §6.2/8 — that the cycle exists

RFC-2026-020 §2.5 recorded why this could not be measured when the decision was written: no policy
on the provisioned instance references its own relation, and producing `42P17` requires creating a
recursive policy, which is DDL that a read-only run must not want. Batch `010`'s header nevertheless
justified leaving two access-matrix cells unimplemented on the strength of it.

Built in a transaction, with batch 011's own roster policy dropped first so the error is
attributable to the naive policy alone, and rolled back:

```sql
drop policy workspace_members_select_workspace_roster on app.workspace_members;
create policy __proof_naive_roster on app.workspace_members
  for select to authenticated
  using (exists (
    select 1 from app.workspace_members m
     where m.workspace_id = workspace_members.workspace_id
       and m.user_id = (select auth.uid())
       and m.status = 'active'));
set local role authenticated;
select count(*) from app.workspace_members where workspace_id = '<workspace_a>';
```

Recorded verbatim:

```
ok   42p17-the-cycle-exists [RFC-2026-020 §6.2/8]
     | SQLSTATE 42P17: infinite recursion detected in policy for relation "workspace_members"
     the naive recursive member-list policy raises 42P17, verbatim above.
```

The proof fails on a quiet database as well as on the wrong SQLSTATE: `42501` is a different
failure and is refused rather than laundered into this one. Both directions are executed locally
against a fake runner in `test-kits/db/foundation-contract.test.mjs`.

## 2. §6.2/9 — that `SECURITY DEFINER` breaks it

**This is the claim the decision dies on**, and the control is the part worth reviewing.

The obvious control — copy the shipped helper, flip `security definer` to `security invoker`, show
that one inlines — **passes while proving nothing**, for two independent reasons, either of which
alone is enough to make both sides read "not inlined":

* PostgreSQL will not inline a SQL function carrying a `SET` clause, and the shipped helper carries
  `set search_path = ''`; and
* scalar-function inlining rewrites the body into an expression in the calling query, so it applies
  only where the body IS an expression. The shipped helper reads a table, and a body with a `FROM`
  clause is not inlined in any security mode.

So the pair differs in `prosecdef` and nothing else — same body, no `SET` clause, no `FROM` — and
its body is the shape RFC-2026-020 §2.4 already measured being inlined on the provisioned instance.

Recorded verbatim:

```
ok   security-definer-is-not-inlined [RFC-2026-020 §6.2/9]
     | --- control: SECURITY INVOKER, no SET clause — must be INLINED ---
     | Result
     |   Output: (((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text))::uuid
     | --- control: SECURITY DEFINER, no SET clause — must NOT be inlined ---
     | Result
     |   Output: app.__proof_definer()
     | --- the helper batch 011 ships — must NOT be inlined ---
     | Result
     |   Output: app.workspace_member_role('c4840acc-0323-5e13-b1d3-c18d7eb615cb'::uuid)
```

The invoker control's plan contains its BODY and no call: it was inlined, so the instrument can see
inlining. The definer control's plan contains a CALL and no body, on the same body with the same
absent `SET` clause: `SECURITY DEFINER` is what the difference measures. The shipped helper
survives as a call with no scan of `app.workspace_members` anywhere in its plan.

If the definer half ever inlines, the proof reports that the decision is wrong and must be reverted
rather than worked around. That branch is executed locally, against a fake runner, and asserts on
the words `THE DECISION IS WRONG`.

## 3. §6.3 — the isolation obligations

```
ok   app-authz-policy-is-load-bearing [RFC-2026-020 §6.3/14]
     | with workspace_members_select_authz_own_active:    5 row(s)
     | with it dropped:                                   1 row(s)

ok   helper-is-not-a-membership-oracle [RFC-2026-020 §6.3/11, §6.3/12]
     | active owner of A, asking about A:      {"role":"owner","member":"t"}
     | SUSPENDED member of A, asking about A:  {"role":"<null>","member":"f"}
     | owner of B, asking about A:             {"role":"<null>","member":"f"}

ok   execute-is-explicit [RFC-2026-020 §6.3/13, §8.5]
     | is_active_member: app_authz=X/app_authz authenticated=X/app_authz
     | jwt_subject: app_authz=X/app_authz
     | workspace_member_role: app_authz=X/app_authz authenticated=X/app_authz
```

The negative control (§6.3/14) is the whole security argument made falsifiable. `app_authz` holds
no bypass, so what the helper can read is exactly what its one policy admits — and if that policy
were doing nothing, the roster would still come back complete and every isolation case would still
pass. It collapses from 5 rows to 1, which is the owner's own row through batch 010's own policy.

The suspended row in the second block is §12.6 assertion 5 asked THROUGH the helper: a path that
did not exist before this batch, where `current_user` is `app_authz` rather than the caller.

## 4. The pinned policy expression

`pg_get_expr(polqual, polrelid)` for `app_authz`'s single policy, measured on the container and
compared against the literal pinned in `scripts/db/run.mjs`:

```
((user_id = (((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text))::uuid) AND (status = 'active'::text))
```

It matched on the first CI round that reached it. The constant was derived before that round from
PostgreSQL 17.6's own deparser, read-only on the provisioned instance:

```sql
explain (verbose, costs off)
select 1 from app.workspace_members
 where user_id = (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
   and status = 'active';
--  Index Cond: ((workspace_members.user_id = (((NULLIF(current_setting('request.jwt.claims'::text, true),
--              ''::text))::jsonb ->> 'sub'::text))::uuid) AND (workspace_members.status = 'active'::text))
```

`pg_get_expr` omits the relation qualification that `EXPLAIN (VERBOSE)` adds; the expressions are
otherwise identical, which is why the pin was right first time.

## 5. Two instrument defects, both found by CI reporting a finding on a correct database

Recorded because in both cases the convenient catalog function answered a slightly different
question than the rule asked, and in both cases a green run would have been the worse outcome.

1. **`proconfig` stores the empty search path quoted.** Batch 011's own apply-time assertion looked
   for the element `search_path=` where `set search_path = ''` is stored as `search_path=""`. It
   fired at `db-migrate-clean` before any proof ran. The evidence for the right spelling was already
   in the tree — `catalog-snapshot.json` has recorded the quoted form for `private.set_updated_at`
   since batch 000, and `run.mjs` matches `/^search_path=""$/` — and this run did not read it.

2. **`has_schema_privilege` answers reachability, not grants.** It includes privileges held through
   PUBLIC, and PUBLIC holds `USAGE` on schema `public` by default, so rule 6 reported `app_authz`
   holding a grant nobody made it and that every role in the database holds equally. The measurement
   now reads the schema's own ACL for an entry naming the role. The PUBLIC-derived reach is not
   hidden by that change — it is measured into `schemas_reachable_via_public` and printed in the
   transcript, unchecked by rule 6 because it is not this batch's doing, confers no read on any
   table, and is kept off the helpers' resolution path by their empty `search_path`.

   The same rule already carried a note that `has_any_column_privilege` is the wrong instrument for
   the table half, for the mirror-image reason: it would report the deliberately column-scoped
   SELECT as the whole-table grant rule 6 exists to forbid.

## 6. Read-only measurements taken against the provisioned instance

`xtvtflkntpqfvflvdbwk`, 2026-09-06, through the Supabase MCP tool. No DDL, no writes, no
`CREATE`/`ALTER`/`GRANT`. **Batch 011 is not applied there and must not be.** Four queries, each
taken because it decided something:

1. `pg_db_role_setting` for every role — **no role carries `pgrst.db_schemas`.** The PostgREST
   exposed-schema list is platform configuration living outside the database, so the catalog holds
   no evidence either way and no lint in this repository can check it. This decided the schema
   question: see §7.
2. `pg_get_functiondef` of `auth.uid()` — recorded verbatim into the snapshot as
   `platform_auth_uid`, which is what turns RFC-2026-020 §5/4's inlined copy into a build failure if
   Supabase moves the original. It is deliberately not the CI shim's version, which differs (the
   shim reads only `request.jwt.claims` and uses `::json` rather than `::jsonb`), so comparing
   against the container would pin the wrong function.
3. Every `(policy, table, role)` in schema `app` — recorded as `role_scoped_policies`. All ten name
   `authenticated`.
4. `app_authz` does not exist on the instance, and schema `app` holds no function there. This is
   what makes the snapshot's `not_applied_to_this_instance` declaration a measured fact rather than
   an assurance.

## 7. The helpers' schema, decided rather than inherited

They are in `app`. The data package — an input this manifest declares — says otherwise at
`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:71`, which gives `private` the row
"authorization helpers, secret references, raw webhook, worker payload, reconciliation |
ไม่มี direct grant | Server/worker ผ่าน typed service เท่านั้น".

Two thirds of that row cannot hold at once for this helper, for a mechanical reason. A policy
written `TO authenticated` that calls a function is evaluated as the CALLER, so `authenticated` must
hold `EXECUTE` on the function and `USAGE` on its schema. Putting the helpers in `private` therefore
requires granting `authenticated` `USAGE` on `private` — which is the "ไม่มี direct grant" column of
the same row, and which would put `private.as_user`, `private.as_suspended_user` and
`private.set_updated_at` inside the reach of every end user. That is a WIDER exposure than the one
it avoids, bought to satisfy half a row while breaking its other half.

The row is not wrong; it did not anticipate this shape. Its model is a helper called by a server or
worker through a typed service — a command path, where `private` is exactly right. RFC-2026-020 is
Approved, is newer than that baseline, sits at position 1 of the conflict order where the data
package sits at 4, and §6.3/12-13 contemplate the helper being `EXECUTE`-granted to `authenticated`
in terms. §8 leaves the API, and with it the schema, to this batch.

**A third schema is NOT created here.** `authz` would be narrower than `app` without touching
`private`, but batch 000 created `app` and `private` under DATA-DEC-01, the schema lint pins
`our_schemas`, and adding a third is a data-foundation decision belonging in an RFC rather than in
the batch that happens to want it. It is carried open.

Because exposure cannot be checked from the catalog, the helpers are built to be SAFE WHEN EXPOSED
rather than safe because they are hidden: `app.workspace_member_role` and `app.is_active_member`
answer only about the caller, which §3's oracle proof and the isolation case
`helper-is-not-an-oracle-for-third-parties` assert rather than assume. `app.jwt_subject()` is
granted to nobody — it is called only from inside helpers that run as its owner, and no policy names
it, so a grant would be a callable surface, and an RPC endpoint wherever `app` is the exposed
schema, with no caller. Reachability is not a control; the assertion is.

## 8. Access-matrix cells

`010`'s header (lines 55-80) named two cells it left denied by default.

* **"Member list SELECT: Owner Y, Admin Y, Editor P" — the two `Y` cells are IMPLEMENTED.** Through
  `workspace_members_select_workspace_roster`, which is permissive and therefore ORs with
  `workspace_members_select_own_active` rather than replacing it. Batch 010 is untouched, which is
  what its own header said its predicates were written for. Editor's `P` is not implemented.
* **"Workspace UPDATE: Admin P" — REFUSED, not omitted.** `P` is "passes per policy/explicit
  capability" and no document defines the capability set. RFC-2026-020 §8 says so in terms and says
  the scope table that would carry it is batch 021's. Writing `role in ('owner','admin')` into the
  workspace UPDATE policy would not resolve a capability; it would DELETE the distinction between
  `Y` and `P` and ship admin an unconditional grant nobody reviewed.

## 9. The exemption register's gap, closed

`RFC-2026-016` §4 says *"A bypass is a policy on a named role, never a role attribute"*, and the
corroboration rule in `scripts/db/run.mjs` recognised only the role ATTRIBUTE — the form §4 was
replacing. A row for `app_authz`, whose entire exemption is one policy on one named role and which
must hold neither attribute, would have FAILED the lint.

Widened, and falsifiable in both directions:

* a row naming a role is corroborated by a role attribute OR by a policy in schema `app` naming it,
  and a row claiming a policy the catalog does not show is still refused;
* for the policy form the row's `table` is corroborable — unlike an attribute, which is
  database-wide — so a row claiming `app.X` while the catalog shows the policy on `app.Y` is refused;
* and the completeness pass reads it the other way: a policy naming a role OUTSIDE the request path
  with no register row is refused. Request-path roles are excluded, because a policy naming `anon`,
  `authenticated` or `service_role` is §8.1 being implemented, not an exemption, and demanding a row
  for each would fill the register with the access matrix.

**No row is added for `app_authz`, and that is the rule working rather than an omission.** The
snapshot describes the instance, which does not have batch 011, so the policy is not in the catalog
and a row for it would be refused — correctly. The completeness pass is what will force that row in
the day 011 reaches the instance and the snapshot records its policy. Six cases in
`test-kits/db/foundation-contract.test.mjs` construct both directions.

## 10. The catalog snapshot, and the fields that were not invented

Adding a migration changes the migration-set digest, so the snapshot goes stale and the lint refuses
it before reading it. The instance cannot be re-measured, because batch 011 is not applied there and
must not be.

The gap is DECLARED rather than absorbed. `not_applied_to_this_instance` names batch 011 by
filename with a stated reason; `taken_against_migrations` is the digest of the set WITHOUT it. The
declaration is itself checked: it must name files that exist, and it must name a TAIL of the ordered
set — a database missing a middle batch while holding later ones is DIVERGENT rather than behind,
which is a different finding with a different fix.

**There is no `authz` block, and no field describing an object that does not exist on that
instance.** Rules §6.1/1-6 are asked of the CI container, where the objects do exist, through the
same `authzLint` the snapshot path would call rather than a second copy that could drift. The
absence is checked in both directions:

* while 011 is declared pending, an `authz` block MUST NOT be present — a block describing objects
  the declaration says are not there is a measurement of nothing; and
* the moment 011 stops being declared pending, the block becomes REQUIRED.

Two fields that ARE measurable on the instance were measured and added rather than assumed:
`platform_auth_uid` and `role_scoped_policies` (§6).

## 11. Commands and outcomes

| Command | Where | Outcome |
| --- | --- | --- |
| `npm run check` | this host | exit 0, 355 tests, 0 failed, 0 skipped, 0 todo |
| `node scripts/verify-branch-scope.mjs <merge-base> WP-0A-DB-00` | this host | all changed paths declared, every amendment explains one |
| `node scripts/db/run.mjs schema-lint` | this host | ok — the static half, including the seven §6.1 rules decidable without a database |
| `LC_ALL=C TZ=UTC make db-verify` | this host | FAILED — 6 of 9 targets need `DB_TEST_URL`, which is unset. Correct: no target reports a pass it cannot earn |
| `make db-migrate-clean` | CI container | `ok in 294ms` — all seven batches apply, 011 included |
| `make db-schema-lint` | CI container | `ok in 8ms` |
| `make db-rls-smoke` | CI container | `35 isolation case(s) passed`, then `db-authz-proofs: ok — 6 claim(s) discharged by execution`, then `db-rls-smoke: ok` |
| negative control (RLS off on `app.workspaces`) | CI container | `db-rls-smoke: FAILED — 10 of 35 case(s)` — the suite is still not blind |

The proofs were first green on CI run `34017080120`, head `68d1432`. Two earlier rounds failed, and
both are §5: `34016457795` at `db-migrate-clean` on the `search_path` spelling, `34016757932` at
rule 6 on the schema-grant instrument. Recorded because a green run reached on the third attempt is
worth less than the two findings that got it there, and both were the batch's own assertions firing
on a correct database rather than the database being wrong.

Every commit after `68d1432` re-ran the whole thing and stayed green; the last of them added tests
and changed no migration, no policy and no proof. **A run id is a citation into something that
moves, which is the defect this repository has already found twice in its own records, so the head
under review is named rather than left implicit: `3cfae09`, CI run `34018402362`, conclusion
success, `npm run check` 355 tests.** If the head has moved past that, this line is the thing to
re-check first.

The negative control's count is unchanged at 10 of 35 — the seven new cases are not among the ones
it turns red, because it disables row level security on `app.workspaces` and the new cases read
`app.workspace_members`. That is the control behaving as written, not the new cases escaping it:
they are held instead by §3's negative control, which drops `app_authz`'s own policy and requires
the roster to collapse.

This host has no `psql`, no `pg_ctl` and no `docker`, so nothing live was executed here. The part of
the proofs that decides what a transcript MEANS is executed here, through a fake runner, including
the vacuous-control case and the "decision is wrong" branch.

## 12. What is still open

* **A third schema for the helpers** (§7). Needs an RFC; not this batch's to create.
* **The `P` cells** — Workspace UPDATE for admin, Member list SELECT for editor. No document defines
  the capability set (RFC-2026-020 §8, §15).
* **`app_authz`'s register row**, due when batch 011 reaches the provisioned instance (§9).
* **`RFC-2026-017` §3's table gains a fourth row**, and A0 owns that edit. RFC-2026-020 §7 proposes
  the amendment and does not make it; this batch does not make it either.
* **Batch 021's `workspace_member_scopes`** will need `app_authz` to have a policy on it too, by the
  same reasoning and with the same width test. That is 021's to propose.
* **The invitation token digest algorithm**, still open from `010`. Unrelated, still unowned.
* **`prefer_cross_vendor_review` is still not satisfied.** This run is Anthropic `claude-opus-5`, as
  is every assigned role on this package. The exception this manifest carries is not lifted.
