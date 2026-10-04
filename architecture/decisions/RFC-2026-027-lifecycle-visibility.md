# RFC-2026-027 — Lifecycle visibility: the authorization helper refuses a member of a workspace whose access is blocked

Status: Proposed — answered in principle by the Owner on 2026-10-04 (Q170-a = yes); NOT approved; amends RFC-2026-020 only when approved. The Owner's `เิาตามแนะนำ` of 2026-10-04 (transcribed in `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-150.md` §1 and §5) answered Q170-a as A0 recommended — close the `access_blocked` gap with an RFC that amends `RFC-2026-020` so that `app_authz` can read `workspaces.lifecycle_state` — and directed that this RFC be written. It did not approve this text. A1's acceptance as Q170-a's co-owner is owed; `RFC-2026-020`'s §5/3 and §6.1/5-6 read as they do today until this file carries an approval, and no migration, policy, grant or pin changes before then.
Date: 2026-10-04
Author: `/claude/a0_atlas` (A0 Integration / DB-00), owner of batch `170` (grants/RLS/exposed surface hardening) in the migration registry and reviewer of `RFC-2026-020`; drafted by a subagent of that run
Reviewer sought: `/claude/a1_bastion` (A1 Security), co-owner of Q170-a and the Security review the registry names for `011`; `/claude/a1_identity` (A1 Identity), author of `RFC-2026-020` and of `010_identity.sql`
Amends (when approved): `RFC-2026-020` §5/3 (one policy becomes two), §6.1/5 (a second pinned expression), §6.1/6 (two columns of `app.workspaces` join the pinned grant)
Depends on: `RFC-2026-020` (approved) §2, §5, §6; `RFC-2026-023` (in review) §3.2 and §5, which widens the same pinned grant; `RFC-2026-016` (approved) §5 for negative controls
Answers: Q170-a (`evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-170-assert.md` §5, answered in `product-owner-disposition-2026-10-03-batch-150.md` §5)
Holds: `work-packages/WP-0A-DB-00.json` `open_blockers[53]` and `[95]`

---

## 1. What is open

§8.5's mandatory `SELECT` pattern is "active membership + capability + Workspace/Business/Page scope +
**lifecycle visibility**" (`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md` §8.5). Batch `010`
implemented lifecycle visibility on exactly one table: `workspaces_select_active_member` and
`workspaces_update_owner` require `lifecycle_state in ('active', 'closing')`
(`010_identity.sql:484`, `:500`), and the column comment gives the reason — "Read access stops at
access_blocked: the transition out of closing is defined as revoking sessions, connectors and jobs, so
a workspace past it is not readable by members" (`010_identity.sql:165-167`).

Every other family reads membership through `app.is_active_member` or `app.workspace_member_role`, the
helpers `RFC-2026-020` §5/5 made the uniform route, and **neither helper reads `lifecycle_state`**
(`011_authorization_helpers.sql:257-290`). So a member of a workspace in `access_blocked` cannot see
the workspace row and can still read its businesses, pages, content, assets — and its notifications,
which are PII-2 (`open_blockers[95]`). Batch `020` named the gap first and refused both fixes open to
it (`open_blockers[53]`): a join to `app.workspaces` from each family's policies, or a lifecycle-aware
helper — the second needing `app_authz` to read a table `RFC-2026-020` §6.1/6 does not let it read.

That pin is the whole obstacle. `app_authz` holds exactly one policy (on `app.workspace_members`) and
exactly four columns of one table (`011:188-189`, `scripts/db/run.mjs` `AUTHZ_COLUMN_GRANTS`), and the
lint and `011`'s own apply-time block refuse anything more. Widening a pin is an RFC's act. This is
that RFC.

## 2. Which states block access

Batch `010`'s CHECK enumerates §11.4's state machine (`010_identity.sql:156-157`):
`active`, `closing`, `access_blocked`, `purge_queued`, `held`, `purging`, `verify`, `deleted`.

§11.4's diagram is the authority for which of them a member may still use:

```
Active --> Closing: owner confirms + step-up
Closing --> Active: cancel within recovery window
Closing --> AccessBlocked: revoke sessions/connectors/jobs
AccessBlocked --> PurgeQueued --> (Held <-> PurgeQueued) --> Purging --> Verify --> Deleted
```

- **Admitted: `active`, `closing`.** `closing` must stay usable: it is the recovery window, and the
  only way back to `active` is a member (the owner) cancelling from inside it.
- **Blocked: `access_blocked`, `purge_queued`, `held`, `purging`, `verify`, `deleted`** — six states.
  Every one of them is reached only through `access_blocked`, and no edge leads from any of them back
  to `closing` or `active`. A member has no act to perform in any of them, so a member's authorization
  is refused in all six.

This is the set `010` already uses for the workspace row (`in ('active', 'closing')`), so the
amendment adds no new reading of §11.4 — it extends the existing one from one table to all of them.
The helper is written as an **allowlist of admitted states**, never a denylist of blocked ones: a ninth
state added to the CHECK later is refused by default until someone admits it (§6.1/4).

## 3. Decision proposed

### 3.1 `app_authz` gains one column-scoped grant and one policy on `app.workspaces`

```sql
grant select (id, lifecycle_state) on app.workspaces to app_authz;

create policy workspaces_select_authz_own_open on app.workspaces
  for select to app_authz
  using (
    lifecycle_state in ('active', 'closing')
    and exists (
      select 1 from app.workspace_members m
       where m.workspace_id = app.workspaces.id
         and m.user_id = app.jwt_subject()
         and m.status = 'active'
    )
  );
```

**No wider than the caller.** This is `010`'s `workspaces_select_active_member` — the policy
`authenticated` already holds on this table — with the identity read through `app.jwt_subject()`, and
restricted to two columns. `RFC-2026-020` §5/3's test was that "the helper sees no row the caller could
not already select for itself"; this policy passes the same test on the second table. The subquery is
evaluated as `app_authz`, so it is filtered by `app_authz`'s existing pinned policy on
`app.workspace_members` (own active row), and that policy contains no function call — so there is no
cycle (§7.2 makes this an executed claim).

**What it must never be:** a policy that calls `app.workspace_member_role` or `app.is_active_member`.
After §3.2 those helpers read `app.workspaces`, so such a policy would recurse through a non-inlined
function — not a plan-time `42P17` but a runtime recursion that dies at `max_stack_depth`, which
`RFC-2026-020` option D describes as the worst failure available. The pinned expression (§6.1/2) is
what forbids it.

The policy states the lifecycle gate itself, rather than leaving it to the helper, for the reason `011`
gives about `status = 'active'` (`011:252-256`): the policy is what stops the helper *reading* a row
the caller could not; the helper's own predicate is what stops it *answering* for one. Both are pinned,
and §5's cases hold each separately.

### 3.2 `app.workspace_member_role` refuses a blocked workspace; its siblings inherit

`app.workspace_member_role(workspace uuid)` keeps its signature, owner, `SECURITY DEFINER`,
`STABLE` and empty `search_path`, and gains one conjunct:

```sql
select m.role
  from app.workspace_members m
  join app.workspaces w on w.id = m.workspace_id
 where m.workspace_id = workspace
   and m.user_id = app.jwt_subject()
   and m.status = 'active'
   and w.lifecycle_state in ('active', 'closing')
 limit 1
```

`app.is_active_member` is defined as `app.workspace_member_role(workspace) is not null`
(`011:282-290`), so it inherits the gate unchanged. `app.jwt_subject()` reads no table and is
unaffected. The three helpers remain the only functions `app_authz` owns.

**Siblings outside `011`:**

- Batch `021`'s `member_scope_*` helpers are `SECURITY INVOKER`, answer only the scope question, and
  are ANDed with `is_active_member` in every policy that uses them — they inherit through that
  conjunct and need no change.
- `RFC-2026-023`'s acting-user helpers (`app.acting_user_admits_business`, `..._page`), if approved,
  ask membership themselves (§3.2 there). **They must apply the same admitted-state gate**, either by
  calling `app.workspace_member_role` or by repeating §3.2's join. This RFC states the requirement;
  whichever of the two RFCs lands second carries it into the other's batch.

### 3.3 The effect on every family's policies

No family's policy text changes. Every policy that calls either helper starts refusing members of a
blocked workspace on the day the helper changes, for reads and writes alike. Read from the migrations
at `5c406de` (non-comment calls to `app.is_active_member(` or `app.workspace_member_role(`):

| batch | family | effect |
|---|---|---|
| `011` | member roster (`workspace_members_select_workspace_roster`) | an owner or admin of a blocked workspace sees no roster |
| `020`, `021` | business, page, versions; member scope | refused (closes `open_blockers[53]`) |
| `030`, `040` | industry (workspace-scoped rows), knowledge | refused |
| `051` | notifications | refused (closes `open_blockers[95]`; PII-2) |
| `061` | metering summaries | refused |
| `070` | research | refused |
| `080`, `081` | content, content targets | refused |
| `090`, `091` | approval, calendar | refused |
| `100` | assets | refused |
| `120`, `121` | publisher, metrics | refused |
| `130` | billing (owner read) | refused — see Q-027-3 |

**Not reached, because they read membership without the helper** — all in `010`, and listed so the
residual is a list rather than a surprise:

| `010` policy | today | proposed |
|---|---|---|
| `workspace_settings_select_active_member`, `workspace_settings_update_owner` (`:522`, `:534`) | no lifecycle gate | rewritten in the forward migration to call the helper (no cycle: a different relation) |
| `workspace_invitations_select_owner`, `_insert_owner`, `_update_owner` (`:581`, `:597`, `:613`) | no lifecycle gate | rewritten likewise — an owner of a blocked workspace must not issue invitations into it |
| `workspace_members_select_own_active` (`:565`) | the caller's own active row, any state | **kept as is** — see Q-027-1 |
| `workspaces_select_active_member`, `workspaces_update_owner` (`:481`, `:497`) | already gated | unchanged |
| `user_profiles_*` | not workspace-scoped | unchanged |

Migration invariant 1 forbids editing `010`; the rewrites are `drop policy` / `create policy` in the
forward migration of §4, as later batches have done for earlier policies, with `superseded.json`
entries where an earlier apply-time block says otherwise.

**Not in scope:** the service and maintenance paths. `app_worker` and `app_maintenance` do not go
through these helpers, and stopping jobs at `access_blocked` is §11.4 step 2's act, performed by the
command that implements the transition — not by row level security.

### 3.4 What changes in `RFC-2026-020`, as text the Owner can accept or refuse

- **§5/3**, last paragraph, becomes: "`app_authz` holds exactly **two** policies in the schema: `FOR
  SELECT` on `app.workspace_members` (the caller's own active row) and `FOR SELECT` on
  `app.workspaces` (the workspaces in which the caller holds an active membership, in an admitted
  lifecycle state — `RFC-2026-027` §3.1). The helper sees no row the caller could not already select
  for itself, on either table."
- **§6.1/5** gains a second pinned expression, for `workspaces_select_authz_own_open`, and the count in
  the rule becomes two.
- **§6.1/6** becomes: "`app_authz`'s grants are exactly `USAGE` on schema `app`, column-scoped `SELECT`
  on `app.workspace_members (workspace_id, user_id, role, status)`, and column-scoped `SELECT` on
  `app.workspaces (id, lifecycle_state)`." `RFC-2026-023` §5 proposes a third table for the same pin;
  the two amendments are independent and compose.
- §5/5, §6.1/1-4, §6.1/7, §6.2 and §6.3 are unchanged. §6.3/11 ("a suspended member of A sees zero
  rows") gains a lifecycle twin in §5 below.

## 4. The migration this implies (not written here)

One forward migration, in batch `170`'s range per the registry and `open_blockers[53]`/`[95]` ("owed
to an RFC plus batch 170"); the exact number is the Integration Owner's to assign. It contains, in this
order, under lock and statement timeouts:

1. the grant and the policy of §3.1;
2. `create or replace function app.workspace_member_role` with §3.2's body, then
   `alter function ... owner to app_authz` restated;
3. the five `010` policy rewrites of §3.3;
4. an apply-time block: `app_authz` holds exactly two policies in `app`, on the two named tables, both
   `FOR SELECT`; its column grants are exactly the six columns; every function it owns is still
   `SECURITY DEFINER` with `search_path=""`; and the admitted-state literal in the policy equals the one
   in the helper.

And, in the same diff, the artefacts that pin the old state:

- `scripts/db/run.mjs`: `AUTHZ_POLICY`/`AUTHZ_TABLE` become a pinned pair list, a second
  `AUTHZ_POLICY_QUAL` deparsed by PostgreSQL 17 (never hand-written), `AUTHZ_COLUMN_GRANTS` keyed by
  table, the count rule at two, and the `SECURITY_DEFINER_FUNCTIONS` digest of
  `app.workspace_member_role(workspace uuid)` moved (`run.mjs:951-953`);
- `db/foundation/lint/pinned-grants.json`: `app_authz` on `app.workspaces`;
- `db/foundation/lint/catalog-snapshot.json`: the `app_authz` block, when the instance receives it;
- `db/foundation/invariants/superseded.json`: entries for every earlier apply-time block the new state
  makes false — at least `011`'s "exactly one policy" block (`011:410`) and `021`'s restatement of
  it ("after batch 021, app_authz holds % policies"); the post-migrate pass names any other;
- `scripts/db/authz-proofs.mjs`: the proofs of §7.2.

## 5. Test obligations

Isolation cases, `§8.6` shape, in the batch that lands §4:

1. **One case per blocked state, six in all.** For a fixture workspace in each of `access_blocked`,
   `purge_queued`, `held`, `purging`, `verify` and `deleted`, its active owner: `is_active_member`
   returns false, `workspace_member_role` returns null, and a representative read on each family in
   §3.3's table returns zero rows — `notifications` (`open_blockers[95]`) and `business_profiles`
   (`open_blockers[53]`) by name.
2. **Positive controls for the two admitted states.** The same owner in an `active` and in a `closing`
   workspace reads the same rows. Without them, a helper that refused everything would pass case 1.
3. **Writes refused, not only reads.** In an `access_blocked` workspace, an owner's `INSERT` of a
   Business and `UPDATE` of a page are refused by row level security (`42501`, `deniedBy: 'rls'`),
   with the mutation absent afterwards (`§8.6`: an empty result does not prove a mutation denial).
4. **The `010` residual.** In an `access_blocked` workspace the owner cannot read or update
   `workspace_settings` and cannot read, issue or revoke invitations.
5. **No membership oracle.** Calling the helpers as `authenticated` for a blocked workspace the caller
   is *not* in returns false/null, as `RFC-2026-020` §6.3/12 already requires for an active one.
6. **The member's own row** — asserted to whatever Q-027-1 decides, in both directions.
7. **Negative control, policy:** with `workspaces_select_authz_own_open` dropped, case 2 fails for
   every member in every state. That proves the policy is what admits the helper's read; a helper that
   read `app.workspaces` through some bypass would otherwise be indistinguishable (`RFC-2026-016` §5).
8. **Negative control, helper:** with `011`'s original helper body restored, case 1 goes red. A gate
   that passes with the gate removed is not a gate.
9. **Fixture symbols.** Six blocked-state workspaces join the fixture catalog by name
   (`db/foundation/seeds/fixture-catalog.json`), through the list a batch edits explicitly, as batch
   `020` did for `business_a3_archived`.

## 6. Static obligations

1. `app_authz`'s policies are exactly the two pinned pairs; the count is two (§3.4).
2. The new policy's `pg_get_expr` equals its pinned literal, which contains no call to
   `workspace_member_role` or `is_active_member` (§3.1's recursion).
3. `app_authz`'s grants are exactly the six columns of §3.4.
4. **The admitted states are a subset of `workspaces_lifecycle_state_known`'s CHECK, and every CHECK
   value is classified** — admitted (`active`, `closing`) or blocked (the six) — in one lint data
   entry. A ninth state fails the build until it is classified, and the admitted literal is the same
   in `010`'s workspace policies, the `app_authz` policy and the helper.
5. `identityExpressionLint` is unchanged: the new policy calls `app.jwt_subject()` and copies no
   identity expression.

## 7. What must be executed, never cited

### 7.1 Measured before it is relied on

The explain harness (`scripts/db/explain-harness.mjs`, Q150-e) is re-run after §4: every policy now
pays a join to `app.workspaces` per helper call. The join is on the primary key and the helper is
`STABLE`, so the cost should be small; "should" is the word this repository does not ship, so the
re-measurement is an obligation, with `--fail-on-seq-scan`.

### 7.2 Claims this draft could not measure

`RFC-2026-020` §6.2's rule, applied: each is executed in CI by `scripts/db/authz-proofs.mjs` in the
batch that lands §4.

- **(a)** The helper is still not inlined after it reads a second table (`EXPLAIN (VERBOSE)` shows the
  call), so §6.2/9's property holds for the new body.
- **(b)** `workspaces_select_authz_own_open`, evaluated as `app_authz`, reaches `app.workspace_members`
  only through `app_authz`'s own policy, and raises neither `42P17` nor a runtime recursion.
- **(c)** A policy on a third table that calls the helper (`business_profiles`) evaluates the helper's
  read of `app.workspaces` under `app_authz`'s new policy, not under `authenticated`'s — so the answer
  does not depend on whether `authenticated`'s own `workspaces` policy admits the row.
- **(d)** Whether a column referenced only inside `app_authz`'s policy needs the column grant at all.
  The helper's body needs `id` and `lifecycle_state` regardless, so the grant is the same; the claim
  matters only to how narrow §6.1/6's pin could be.

## 8. Alternatives

- **Join `app.workspaces` in each family's policies.** Needs no change to `app_authz` — the join runs
  as `authenticated`, whose own `workspaces` policy already applies the gate. Rejected for the reason
  `open_blockers[53]` gave and `RFC-2026-020` §5/5 made a rule: membership width becomes a property of
  another module's policy set, re-stated policy by policy across the sixteen files of §3.3 (which create 123 policies), each a place to
  forget it. One helper is one place.
- **Mirror the state into `app.workspace_members`** (for example `status = 'blocked'` set by trigger).
  `RFC-2026-020` option E's defect: "the projection equals the table" is a runtime invariant no
  artefact holds, and it overwrites membership rows §11.2 treats as history.
- **Suspend every member at the transition** (§11.4 step 2, in the command). Cheap, and it uses the
  `status = 'active'` gate that already exists. Rejected as the control because it makes lifecycle
  visibility a property of one command's correctness: a state change by any other path — including
  today's direct client `UPDATE` of `lifecycle_state` (`010:403`) — leaves access open. It may still be
  worth doing in the command, as defence in depth.
- **A separate `app.workspace_is_open(workspace)` helper** that families add beside
  `is_active_member`. Rejected: it reintroduces the per-family edit the first alternative has, and a
  family that forgets it is silently open.

## 9. Rollback

A forward migration that restores `011`'s helper body, rewrites the five `010` policies back, drops
`workspaces_select_authz_own_open` and revokes `app_authz`'s two columns on `app.workspaces`, with the
`run.mjs` pins, `pinned-grants.json` and `superseded.json` reverted in the same diff. No data changes in
either direction. Rolling back re-opens `open_blockers[53]` and `[95]` — members of blocked workspaces
read their data again — which is strictly wider than the amended state and is the state of `main`
today, so it passes every existing test.

## 10. Questions this RFC raises

| id | for | question |
|---|---|---|
| Q-027-1 | Owner, A1 | Should a member of a blocked workspace still see **their own** membership row (`010`'s `workspace_members_select_own_active`)? Kept, the client can tell "you belong to a workspace that is closed" from "you belong to nothing"; gated, the membership disappears with everything else. Proposed: kept. |
| Q-027-2 | A1 | Is `closing` admitted for **writes** as well as reads? §11.4 stops new jobs and publishing only at the transition out of `closing` (step 2). Proposed: admitted for both, as `010`'s workspace policies already do; a narrower `closing` is a command-side rule. |
| Q-027-3 | Owner, A1 | Billing: should an owner still read invoices and payments of a workspace in `access_blocked` or later (§11.1 lists "Usage/billing invoices/read model" among the export domains)? Under this RFC they cannot through the client; export is the background job batch `160` owns. |
| Q-027-4 | A1 | `RFC-2026-023`'s acting-user helpers must carry the gate (§3.2). Which RFC's batch carries it depends on landing order; does A1 want the requirement written into `RFC-2026-023` now? |
| Q-027-5 | Owner, A1 | Today an owner can `UPDATE` `lifecycle_state` directly (`010:403`, `workspaces_update_owner` has no state constraint in `WITH CHECK`). After this RFC, an owner who writes `access_blocked` locks every member, including themselves, out irreversibly, unaudited, without the step-up §11.4 requires. Revoke the client `UPDATE` of `lifecycle_state` in the same migration, or leave it to the §11.4 command (`RFC-2026-026` Q-026-5)? Proposed: revoke in the same migration. |
| Q-027-6 | Integration Owner | Migration number in batch `170`'s range, and whether it may land before `170`'s other parts. |

## 11. Provenance, and what a reviewer should discount

- **Drafted by a subagent of A0's run.** A0 owns batch `170`, which this RFC hands work to, and reviewed
  `RFC-2026-020`, which this RFC amends. A1 Identity, who wrote `RFC-2026-020`, is the reviewer whose
  agreement matters most, and none has been sought yet.
- **Nothing was executed.** No database was started or queried for this draft. The state list, the
  policies and the helper bodies are read from `010` and `011` at `5c406de`; §7.2 lists what reading
  cannot settle.
- No migration, policy, grant, pin, lint file or test was changed to write this file; the only other
  change in its batch is the writable-path entry that lets it exist.
