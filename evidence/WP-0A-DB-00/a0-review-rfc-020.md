# A0 review of RFC-2026-020

Reviewer: `/claude/a0_atlas` (A0). Author under review: `/claude/a1_identity` (A1).
Date: 2026-09-06.
Subject: `architecture/decisions/RFC-2026-020-authorization-helper-role.md` and its measurements at
`evidence/WP-0A-DB-00/a1-rfc-020-measurements-2026-09-06.md`.

## 0. Why this review exists in this direction

`RFC-2026-018` was written by A0, approved by the Product Owner, and found to rest on a misreading of
`RFC-2026-017` §3 only when A0 sat down to write the migration implementing it. The order was:
author, approve, discover. This time the order is: author (A1, whose decision it is by the migration
registry), review (A0), then dispose.

That is a better order and it is not a control. A1 is a subagent run in A0's vendor and model family,
and it says so in its own provenance section. Two runs sharing a model family share blind spots, and
this review does not make the pair independent.

## 1. Verdict

**Recommend disposition as proposed**, with one gap recorded below that belongs to A0, not to this
RFC.

The decision rests on one structural claim, and the claim holds: a `SECURITY DEFINER` function owned
by `app_authz` executes with `current_user = app_authz`, so the policies that apply inside it are
`app_authz`'s — one narrow `SELECT` policy — and not `authenticated`'s. The rewrite cycle on
`app.workspace_members` is broken by the change of `current_user`, not by any widening of what is
visible.

## 2. What A0 re-measured rather than accepted

Two of A1's findings decide the shape of `011`, so they were measured again, independently, against
the same instance on 2026-09-06.

**`postgres` cannot grant `USAGE` on schema `auth`.**

```sql
select has_schema_privilege('postgres','auth','usage'),
       (select array_agg(privilege_type||':'||is_grantable) from information_schema.usage_privileges
          where object_schema='auth' and grantee='postgres');
-- true | {USAGE:NO}
```

Confirmed: `postgres` holds the privilege and **not** the grant option, so no migration this
repository writes can give any role it creates the ability to call `auth.uid()`. A1's decision 4 —
read the subject from `request.jwt.claims` instead — is forced by the platform rather than chosen,
and §6/7's rule comparing the inlined expression against `pg_get_functiondef('auth.uid()')` is the
right way to carry the cost.

**`postgres` holds `rolbypassrls`, so `FORCE` is moot for these tables' owner.**

```sql
select rolbypassrls from pg_authid where rolname='postgres';  -- true
```

Confirmed, and it makes A1 right that two sentences in its own `010` header are wrong. It also
narrows something A0 wrote repeatedly this session: *"`FORCE` changes exactly one thing — whether the
table owner is subject to RLS"* is true of the mechanism and misleading here, because the owner
bypasses anyway. `FORCE` is insurance against a future ownership change, not a live constraint on
`postgres` today. That correction belongs in the record with the others.

## 3. Where A0 pushed and the RFC held

**The category argument (§5/1).** A1 claims `RFC-2026-017` §3 names no helper role because §3
enumerates roles a *path* runs under, and a helper owner is never a session identity. Read against
§3's own sentence — *"The service path runs under roles created for it"* — this is right, and it is
the reason the choice is not "pick the least-bad of three". A fourth role is not scope creep; the
three were answering a different question.

**Sufficiency of the narrow policy (§5/3).** The obvious objection is that a helper which can see
only the caller's own membership row cannot answer "may this caller see the member list". It can: the
policy on `app.workspace_members` for `authenticated` becomes a predicate over the workspaces the
caller is an active member of, and that set is derivable from the caller's own rows alone. The helper
never needs another member's row, which is why the exemption buys a boundary and no visibility. This
is the strongest part of the proposal.

**Option E, the maintained projection.** A1 came closest to choosing it and rejected it on
falsifiability: "the projection equals the table" is a runtime invariant no artefact can hold, and
drift arrives through trigger-bypassing paths no isolation test runs. A0 agrees, and adds that
`RFC-2026-016` §4 retired "force where compatible" for exactly that property four days ago. Adopting
E would retire that reasoning immediately after adopting it.

## 4. The gap this review found, and it is A0's

A1 reports that the exemption register cannot carry `app_authz`'s policy: `scripts/db/run.mjs`
rejects a role-scoped register row unless that role holds `rolbypassrls` or `rolsuper`, and
`app_authz` must hold neither, so a row for it would **fail** the lint.

That rule is A0's, written earlier today, and A1 is right about it. `RFC-2026-016` §4 says *"a bypass
is a policy on a named role, never a role attribute"* — so a policy naming a non-bypassing role is
precisely the form §4 asks for, and the corroboration rule recognises only the form §4 was trying to
replace. The register can describe an unforced table and a bypassing role, and cannot describe the
thing the RFC it implements says to prefer.

**Not fixed here.** It is recorded as an open blocker on `WP-0A-DB-00`, because widening a
corroboration rule in the same change that lands a decision needing it wider is how a rule stops
being a check. It is due with `011`, which is the first change that will need it.

## 5. What A0 does not endorse

**§3's observation that `020` needs nothing this RFC grants.** The measurement behind it is sound —
business and page tables carry `workspace_id` and read membership from another relation, the shape
`010` already proves working. But whether `020` may therefore start before `011` is a question about
the migration registry's `020 → 011` dependency, and that dependency is `§7`'s uniformity requirement
("role checks should not be hard-coded per table"). Waiving it is the Product Owner's call, not a
consequence of this RFC, and A1 was right to offer it as an observation and stop there. A0 stops
there too.

**§6.2's two claims stay unmeasured.** That `42P17` fires, and that `SECURITY DEFINER` is not
inlined, cannot be settled read-only and are correctly made blocking conditions on `011` rather than
cited. They are executable in the CI container — the same Postgres service that runs the isolation
suite — and that is where they should be discharged, with recorded exit codes.
