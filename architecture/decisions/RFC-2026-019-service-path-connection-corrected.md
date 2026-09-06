# RFC-2026-019 — The service path needs components, not a grant

Status: Proposed
Date: 2026-09-06
Author: /claude/a0_atlas (A0)
Supersedes: `RFC-2026-018` (approved 2026-09-06, never in effect — its §5 conditions were never met
and nothing in the tree implements it)
Depends on: `RFC-2026-017` (approved) for the role purposes, `RFC-2026-012` (approved) for which
tier issues the statement

## 1. Why this exists: what RFC-2026-018 got wrong

`RFC-2026-018` proposed granting `app_command` to `authenticator` so that the request path could
assume it. **That proposal was incoherent with the design it claimed to complete**, and the error
was caught while writing the migration to implement it, after the Product Owner had already approved
it.

`RFC-2026-017` §3 defines the role:

> `app_command` — **owns the `SECURITY DEFINER` command functions** that perform user-initiated
> writes

A function owner is not a role the caller switches to. The request path calls the function as
whatever it already is, and the function executes as its owner. **Nothing needs membership in
`app_command` for that to work**, and granting it would create a second way to *be* `app_command`
that skips the function entirely — which is the indirection the role exists to provide.

`RFC-2026-018` §3A argued the grant was a narrowing, comparing it to `service_role`. **That is the
wrong pair.** The comparison that decides it is:

| | reachable how | what it can do |
|---|---|---|
| `app_command` today | only as the owner of a command function | exactly what that function does |
| `app_command` under RFC-2026-018 | by a `role` claim in any JWT signed with the project secret | anything `app_command` is granted, in any statement |

Against `service_role` the grant looks like a narrowing. Against the design it replaces, it is a
widening. Both readings are true of different comparisons, and `RFC-2026-018` picked the flattering
one — not deliberately, but that is not a distinction the record should have to make.

**The root error is smaller and more general than either.** `RFC-2026-018` read a *missing component*
as a *missing grant*. Nothing can be `app_command` because no command function has been written, and
nothing runs as `app_worker` because no worker exists. Neither absence is closed by a `GRANT`.

## 2. What was measured

Instance `xtvtflkntpqfvflvdbwk`, 2026-09-06, from `pg_authid`, `pg_auth_members`, `pg_proc`,
`pg_class` and `information_schema`.

| fact | value |
|---|---|
| memberships `authenticator` holds in the three service roles | **0** |
| `SECURITY DEFINER` functions in `app` or `private` | 1 — `private.set_updated_at`, owned by `postgres` |
| functions owned by `app_command` | **0** |
| tables in `app` owned by `app_command` | **0** (all owned by `postgres`, which §3 requires) |
| views exposed to clients | **0** |
| grants `app_command` holds in `app` | **none**; it has no `USAGE` on the schema |

So the state is consistent with `RFC-2026-017` §3 in every respect except one: §3 is written in the
present tense about paths that do not exist yet.

## 3. What the design already says, read properly this time

**`RFC-2026-012`** decided which *tier* issues the statement, and its "crux" section anticipates
exactly the misreading that produced `RFC-2026-018`:

> A server request handler that opens its Postgres session with the end user's access token executes
> as `authenticated` with the identical `auth.uid()`. The policy constrains the **content of the
> row** and the **identity of the session**; it says nothing about the **tier**, and RLS has no
> predicate that could.

So `authenticated` is *already* the server path for user-scoped work. Its grants in batch 010 are
column-scoped for exactly that reason — it may write `token_hash` and may not read it (§9.2/§9.3).
There is no gap here to fill.

**`RFC-2026-017` §3** covers the rest with three roles and three different answers:

| role | how a path becomes it | what is missing today |
|---|---|---|
| `app_command` | by being the owner of a `SECURITY DEFINER` function the caller invokes | no command function has been written |
| `app_worker` | a login role that issues `SET LOCAL ROLE` per transaction | no background worker exists |
| `app_maintenance` | operator-initiated, through a recorded reason | no maintenance path exists |

## 4. Decision proposed

1. **`authenticator` is granted membership in none of the three service roles.** The omission
   `001_service_roles.sql` made deliberately stands, for the reason it gave. This is now a decision
   rather than a deferral, so it can be asserted — see §5.
2. **The request path runs as `authenticated`**, per `RFC-2026-012`. Work that needs more than a
   user's own policies allow goes through a `SECURITY DEFINER` function owned by `app_command`,
   invoked by that session. That is the only way to be `app_command`.
3. **`app_worker`'s connection method is not decided here, and saying so is the decision.** No
   background worker exists. When one does, its shape is a dedicated login role issuing
   `SET LOCAL ROLE app_worker` per transaction — never `SET`, which outlives the transaction under a
   transaction-mode pooler and hands the next request another tenant's identity — and the credential
   that requires is a cost belonging to the decision that creates the worker. Choosing it now would
   be choosing a credential for a component nobody has written.
4. **`service_role` is used by no application or worker path**, unchanged from `RFC-2026-017`.
5. **`RFC-2026-017` §3's present tense is wrong and stays wrong** until the components exist. It is
   corrected when they do, by its own owner, not here.

## 5. What this makes checkable, now rather than later

`RFC-2026-018` deferred everything to a future migration. This decision is assertable against the
database as it stands today, and every clause below is a rule the schema lint can carry:

- **`authenticator` holds no membership in `app_worker`, `app_command` or `app_maintenance`.** This
  is the decision as a negative, and a negative is the strongest thing a lint can hold: if anyone
  grants it later, the build fails until an RFC changes the decision. `RFC-2026-018` would have made
  this rule impossible to write.
- **No table in `app` is owned by `app_command`.** §3 requires it not be the table owner, because a
  `SECURITY DEFINER` function owned by the table owner would be exempt from the policies on a forced
  table. Measured true today; unasserted until now.
- **Every `SECURITY DEFINER` function in `app` or `private` has an empty `search_path`** — already
  asserted — **and its owner is recorded**, so the first function owned by `app_command` appears in a
  diff rather than arriving unremarked.

When the first command function is written, one more rule joins them: it is owned by `app_command`,
and an isolation case calls it as `authenticated` and is refused where the policies say it should be.
That case cannot be written before the function exists, and this RFC does not pretend otherwise.

## 6. Consequences

- Three lint rules and the snapshot fields they read. No grant, no role change, no migration.
- `RFC-2026-018` is superseded. Its status line records that it was approved and never in effect,
  because a record that quietly loses a decision is worse than one that carries a corrected mistake.

## 7. What this does not decide

- **When the first command function is written, or what it does.** That is batch work, not a
  decision.
- **Whether the API stays PostgREST.** A different API process with its own login role is §4/3's
  shape under another name and needs its own RFC.
- **JWT custody.** Unchanged and not improved by this RFC. The signing secret can still claim
  `service_role`, which bypasses RLS; that is the boundary, and it is a `RFC-2026-016`/`017` matter.

## 8. Provenance, and how the error was caught

The measurements are this run's, taken on 2026-09-06 and reproducible from the queries named.

The error in `RFC-2026-018` was found by this run while writing the migration to implement it — by
reading `RFC-2026-017` §3's role table properly, which the RFC it was implementing had summarised and
not quoted. It was not found by the review that read `RFC-2026-018`, and it was not found before the
Product Owner approved it. **An approved decision resting on a misread of another approved decision
is the failure mode this repository has the conflict order for, and the conflict order did not catch
it either — a person reading the two documents together did.**

A1 has not seen this RFC. `DATA-DEC-03` is co-owned, and its co-owner's countersignature identified
the gap that `RFC-2026-018` mis-diagnosed; that is not agreement with this diagnosis either.
