# RFC-2026-027 — Lifecycle visibility: the authorization helper refuses a member of a workspace whose access is blocked

Status: Proposed — answered in principle by the Owner on 2026-10-04 (Q170-a = yes); NOT approved; amends RFC-2026-020 only when approved. The Owner's `เิาตามแนะนำ` of 2026-10-04 (transcribed in `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-150.md` §1 and §5) answered Q170-a as A0 recommended — close the `access_blocked` gap with an RFC that amends `RFC-2026-020` so that `app_authz` can read `workspaces.lifecycle_state` — and directed that this RFC be written. It did not approve this text. A1's acceptance as Q170-a's co-owner is owed; `RFC-2026-020`'s Status line, §5/3, §6.1/5, §6.1/6 and §6.3/14 — every place §3.4 amends — read as they do today until this file carries an approval, and no migration, policy, grant or pin changes before then. The six questions of §10 were answered on 2026-10-04 as A0 recommended (the Owner's `ลุยต่อเลย เอาตามแนะนำ`, transcribed with A0's reading of it in `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-rfc-026-027.md` §8) and are recorded in §10.1; **they are not an approval of this text**, which stays the Owner's explicit act and A1's review.
Date: 2026-10-04
Revised: 2026-10-04, in the batch's review round, on the findings of C0 (`c0-batch-rfc-026-027-contract-review-2026-10-03.md`), A1 (`a1-batch-rfc-026-027-security-review-2026-10-03.md`) and Q0 (`q0-batch-rfc-026-027-test-review-2026-10-03.md`); the change list is in `a0-batch-rfc-026-027-plan-2026-10-03.md` §7. Still Proposed; the revision approves nothing and answers no question.
Revised: 2026-10-04, in batch rfc-text (`a0-batch-rfc-text-plan-2026-10-03.md`): the Status line names every `RFC-2026-020` section §3.4 amends (C0-10); Q-027-5's column-free forms include `returning 1`, and its targeted-form sentence is true for blocked targets only (A1 C2, Q0R-F3); §6/6's census scoped to workspace-scoped tables, 89/8 (Q0R-F4); batch 170's revoke recorded, so §4's migration does not carry it; the Owner's answers to Q-027-1..6 recorded (§10.1). Still Proposed; the revision approves nothing.
Author: `/claude/a0_atlas` (A0 Integration / DB-00), owner of batch `170` (grants/RLS/exposed surface hardening) in the migration registry and reviewer of `RFC-2026-020`; drafted by a subagent of that run
Reviewer sought: `/claude/a1_bastion` (A1 Security), co-owner of Q170-a and the Security review the registry names for `011`; `/claude/a1_identity` (A1 Identity), author of `RFC-2026-020` and of `010_identity.sql`
Amends (when approved): `RFC-2026-020`'s Status line (a sentence appended), §5/3 (one policy becomes two), §6.1/5 (a second pinned expression), §6.1/6 (two columns of `app.workspaces` join the pinned grant), §6.3/14 (the negative control names its policy) — the exact text is §3.4
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

§11.4's diagram is the authority for which of them a member may still use. Quoted whole
(`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md`, §11.4):

```
[*] --> Active
Active --> Closing: owner confirms + step-up
Closing --> Active: cancel within recovery window
Closing --> AccessBlocked: revoke sessions/connectors/jobs
AccessBlocked --> PurgeQueued: recovery window elapsed
PurgeQueued --> Held: legal/finance/rights hold
Held --> PurgeQueued: hold released
PurgeQueued --> Purging: dependency-ordered workers
Purging --> Verify: objects + rows + secrets
Verify --> Deleted: signed report complete
Verify --> PurgeQueued: partial failure retry
Deleted --> [*]
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
the caller could not; the helper's own predicate is what stops it *answering* for one. Both are pinned
(§6/4), and §5's cases hold each separately: case 10 holds the policy's conjunct (a direct read as
`app_authz`) and case 11 the helper's (case 1 with the policy's conjunct removed). Without those two,
either conjunct could be removed alone and every other case would stay green — Q0 measured exactly
that on a prototype (mutants M3 and M4).

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
  calling `app.workspace_member_role` or by repeating §3.2's join. Q-027-4 was answered *yes*: the
  requirement is to be written into `RFC-2026-023`'s own text now, so whichever RFC's batch lands first
  carries it. That edit is `RFC-2026-023`'s, not this file's, and is owed to A0 at that RFC's next
  revision (`open_blockers[195]`).

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
| `130` | billing (owner read) | refused (Q-027-3, answered: refused through the client; the owner's invoices reach them through batch `160`'s export job) |

**Not reached, because they read membership without the helper** — all in `010`, and listed so the
residual is a list rather than a surprise:

| `010` policy | today | proposed |
|---|---|---|
| `workspace_settings_select_active_member`, `workspace_settings_update_owner` (`:522`, `:534`) | no lifecycle gate | rewritten in the forward migration to call the helper (no cycle: a different relation) |
| `workspace_invitations_select_owner`, `_insert_owner`, `_update_owner` (`:581`, `:597`, `:613`) | no lifecycle gate | rewritten likewise — an owner of a blocked workspace must not issue invitations into it |
| `workspace_members_select_own_active` (`:565`) | the caller's own active row, any state | **kept as is** (Q-027-1, answered: kept) |
| `workspaces_select_active_member`, `workspaces_update_owner` (`:481`, `:497`) | already gated | unchanged |
| `user_profiles_*` | not workspace-scoped | unchanged |

Migration invariant 1 forbids editing `010`; the rewrites are `drop policy` / `create policy` in the
forward migration of §4, as later batches have done for earlier policies, with `superseded.json`
entries where an earlier apply-time block says otherwise.

**Not in scope:** the service and maintenance paths. `app_worker` and `app_maintenance` do not go
through these helpers, and stopping jobs at `access_blocked` is §11.4 step 2's act, performed by the
command that implements the transition — not by row level security.

### 3.4 What changes in `RFC-2026-020`, as text the Owner can accept or refuse

Each changed sentence of `RFC-2026-020` is quoted as it stands (line numbers at `e64e1f5`), with its
exact replacement. **Every sentence of `RFC-2026-020` not quoted here is unchanged**, including both
code blocks of §5/3, §5/1-2, §5/4-6, §6.1/1-4, §6.1/7, §6.2 and §6.3/10-13.

1. **Status line** (`:3`). The approval's words are the Owner's record of what was approved on
   2026-09-06 and are **not rewritten**. One sentence is appended at the end of the line:
   > Amended by `RFC-2026-027` (approved <date>): `app_authz` holds exactly two policies — the one above
   > and `FOR SELECT` on `app.workspaces`, no wider than `authenticated`'s
   > `workspaces_select_active_member` — and column-scoped `SELECT` on `app.workspaces (id,
   > lifecycle_state)`; the helpers refuse a member of a workspace whose `lifecycle_state` is not
   > `active` or `closing`.
2. **§5/3, first paragraph** (`:393-395`). Now:
   > `app_authz` holds exactly one policy in the schema: `FOR SELECT` on `app.workspace_members`, whose
   > `USING` expression is `workspace_members_select_own_active`'s predicate — own row, `status =
   > 'active'` — with the identity expression inlined. Semantically:

   Becomes:
   > `app_authz` holds exactly two policies in the schema. The first is `FOR SELECT` on
   > `app.workspace_members`, whose `USING` expression is `workspace_members_select_own_active`'s
   > predicate — own row, `status = 'active'` — with the identity expression inlined. Semantically:

   The two code blocks and the sentence between them (`:397-405`) are unchanged.
3. **§5/3, a new paragraph inserted after the second code block** (after `:405`, before `:407`):
   > The second is `FOR SELECT` on `app.workspaces`, `workspaces_select_authz_own_open`
   > (`RFC-2026-027` §3.1): the workspace's `lifecycle_state` is `active` or `closing` and the caller
   > holds an active membership in it, the identity read through `app.jwt_subject()`. It is `010`'s
   > `workspaces_select_active_member` restricted to the columns `id` and `lifecycle_state`, and it
   > calls neither membership helper.
4. **§5/3, last paragraph, first two sentences** (`:407-410`). Now:
   > **The helper sees no row the caller could not already select for itself.** It is not given
   > cross-tenant reach and it is not given the member list — it is given the caller's own membership
   > row, which the caller already has, in a context where the rewriter is not in the middle of
   > expanding `workspace_members`.

   Becomes:
   > **The helper sees no row the caller could not already select for itself, on either table.** It is
   > not given cross-tenant reach and it is not given the member list — it is given the caller's own
   > membership row, which the caller already has, and the lifecycle state of the workspaces the caller
   > can already select, in a context where the rewriter is not in the middle of expanding
   > `workspace_members`.

   The rest of the paragraph — "The exemption buys the boundary and nothing else. `010` called this
   an exemption; §7 records why the word was imprecise." — is unchanged.
5. **§6.1/5** (`:444-447`). Now:
   > **`app_authz` holds exactly one policy in schema `app`**, on `app.workspace_members`, `FOR
   > SELECT`, and `pg_get_expr(polqual, polrelid)` equals a pinned literal. The pinned string is the
   > whole control: any widening — `using (true)`, dropping `status = 'active'`, adding a function
   > call — fails the build with a diff that shows exactly what changed.

   Becomes:
   > **`app_authz` holds exactly two policies in schema `app`**, one on `app.workspace_members` and
   > one on `app.workspaces`, both `FOR SELECT`, and for each `pg_get_expr(polqual, polrelid)` equals
   > its pinned literal. The pinned strings are the whole control: any widening — `using (true)`,
   > dropping `status = 'active'` or the lifecycle term, adding a function call — fails the build with
   > a diff that shows exactly what changed.
6. **§6.1/6** (`:448-449`). Now:
   > **`app_authz`'s grants are exactly `USAGE` on schema `app` and column-scoped `SELECT` on
   > `app.workspace_members`.** Column-scoped, so it cannot read `token_hash` or any other table.

   Becomes:
   > **`app_authz`'s grants are exactly `USAGE` on schema `app`, column-scoped `SELECT` on
   > `app.workspace_members (workspace_id, user_id, role, status)`, and column-scoped `SELECT` on
   > `app.workspaces (id, lifecycle_state)`.** Column-scoped, so it cannot read `token_hash`, a
   > workspace's `name`, or any other table.

   The second sentence is **restated, not dropped**: `token_hash` stays named, and the "any other
   table" clause now excludes the two named tables. `RFC-2026-023` §5 proposes a third table for the
   same pin; the two amendments are independent and compose.
7. **§6.3/14, first sentence** (`:476`). Now:
   > **A negative control**: with `app_authz`'s single policy dropped, the member-list cases fail.

   Becomes:
   > **A negative control**: with `app_authz`'s policy on `app.workspace_members` dropped, the
   > member-list cases fail; with its policy on `app.workspaces` dropped, `RFC-2026-027` §5's positive
   > controls (case 2) fail.

   The rest of §6.3/14 is unchanged.

§6.3/11 ("a suspended member of A sees zero rows") is unchanged in `RFC-2026-020`; its lifecycle twin
is case 1 of §5 below, owed by the batch that lands §4, not text added to `RFC-2026-020`.

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
- `scripts/db/run.mjs`'s two **policy pinned lists**, each of which refuses the new policy until it is
  named: `PERMISSIVE_POLICIES` (`run.mjs:305`, read by the permissive policy probe — "unlisted or
  changed: app.workspaces.workspaces_select_authz_own_open") gains the new policy, and the pinned
  deparses of the five `010` rewrites of §3.3, already listed there, change with them; and the policy set (`POLICY_SET`,
  `db/foundation/lint/policy-set.json`, read by the policy set probe through `PINNED_POLICY_KEYS`,
  `run.mjs:1671-1677` — "policy(ies) no pinned list names: …") gains whatever the pinned key list does
  not already cover. Q0 measured both probes refusing §3.1 and §3.2 appended as a drift (round r3,
  migrate-clean exit 2), before the post-migrate pass could run;
- `db/foundation/lint/pinned-grants.json`: `app_authz` on `app.workspaces`. **Not** `authenticated`'s
  `UPDATE` on `app.workspaces`: Q-027-5 was answered *revoke*, and batch 170's
  `170_workspace_lifecycle_not_client_writable.sql` (merged) already revoked the client `UPDATE` of
  `lifecycle_state` and moved that pin (`authenticated` keeps `UPDATE (name, updated_by)`). This
  migration carries no revoke and must not re-grant the column;
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
   (`open_blockers[53]`) by name. **No family may pass vacuously:** the case moves one *populated*
   workspace — one with at least one row in every family of §3.3's table — into each blocked state
   inside the case's own transaction, and asserts, in the same transaction before the move, that the
   same read returns at least one row for every family. A family with no rows in the fixture fails
   the case rather than passing it (Q0's F4; case 8 sees only the aggregate).
2. **Positive controls for the two admitted states.** The same owner in an `active` and in a `closing`
   workspace reads the same rows. Without them, a helper that refused everything would pass case 1.
3. **Writes refused, not only reads.** In an `access_blocked` workspace, an owner's `INSERT` of a
   Business and `UPDATE` of a page are refused by row level security (`42501`, `deniedBy: 'rls'`),
   with the mutation absent afterwards (`§8.6`: an empty result does not prove a mutation denial).
4. **The `010` residual.** In an `access_blocked` workspace the owner cannot read or update
   `workspace_settings` and cannot read, issue or revoke invitations.
5. **No membership oracle.** Calling the helpers as `authenticated` for a blocked workspace the caller
   is *not* in returns false/null, as `RFC-2026-020` §6.3/12 already requires for an active one.
6. **The member's own row** (Q-027-1, answered: kept). In each blocked state, the member still reads
   their own membership row through `workspace_members_select_own_active`, and reads no other member's
   row (the roster policy goes through the helper and is refused, §3.3) — both directions asserted.
7. **Negative control, policy:** with `workspaces_select_authz_own_open` dropped, case 2 fails in both
   admitted states (in the six blocked states the read is refused either way, so case 1 stays green —
   measured by Q0, mutant M1). That proves the policy is what admits the helper's read; a helper that
   read `app.workspaces` through some bypass would otherwise be indistinguishable (`RFC-2026-016` §5).
8. **Negative control, helper:** with `011`'s original helper body restored, case 1 goes red. A gate
   that passes with the gate removed is not a gate.
9. **Fixture symbols.** Six blocked-state workspaces join the fixture catalog by name
   (`db/foundation/seeds/fixture-catalog.json`), through the list a batch edits explicitly, as batch
   `020` did for `business_a3_archived`.
10. **The policy's conjunct, alone.** As `app_authz`, with the claims of the active owner of a
    workspace in each blocked state, `select id from app.workspaces where id = <that workspace>`
    returns zero rows; in `active` and `closing` it returns one. This is the only case that reads
    through the policy without the helper, so it is what fails when the policy's
    `lifecycle_state in ('active', 'closing')` is removed and the helper's is kept (Q0's mutant M4).
11. **The helper's conjunct, alone.** With the policy's lifecycle conjunct removed inside the case's
    transaction (the policy re-created without it, as owner), case 1 still refuses in every blocked
    state. That proves the helper's own conjunct answers by itself, and fails when the helper's is
    removed and the policy's kept (Q0's mutant M3).

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
6. **No family escapes the helper.** The rule's scope, defined so its exemption list is unambiguous
   (Q0R-F4): every permissive policy `TO authenticated` on a **workspace-scoped table** — a table in
   `app` that has a `workspace_id` column, plus `app.workspaces` itself — other than the pinned list of
   `010`'s policies in §3.3's residual table, calls `app.is_active_member` or
   `app.workspace_member_role`. Tables without a `workspace_id` column (`app.user_profiles`, which §3.3
   calls "not workspace-scoped") are outside it. Census on the tree as it is: A1 counted 91 permissive
   `authenticated` policies in `app` and exactly 10 calling neither helper, all `010`'s and all in
   §3.3's residual table; Q0 reproduced that and, **in the rule's scope, measured 89 and 8** — the two
   `user_profiles` policies are the difference. Nothing holds it for the next family, so a policy that
   joins `app.workspace_members` directly would be silently ungated. Owed to A0, owner of
   `scripts/db/run.mjs`, in the batch that lands §4 (A1's F3-a). After the five `010` rewrites of §3.3,
   the pinned exemption list is three: `workspace_members_select_own_active`,
   `workspaces_select_active_member` and `workspaces_update_owner`.

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
  visibility a property of one command's correctness: a state change by any other path — a
  service-side write, or the direct client `UPDATE` of `lifecycle_state` that `010:403` granted until
  batch 170 revoked it — leaves access open. It may still be
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

## 10. Questions this RFC raised, and the Owner's answers

The table keeps each question as it was asked, with Q-027-5's two wording corrections of batch rfc-text.
All six were answered on 2026-10-04 as A0 recommended (§10.1); where a question names a role other than
the Owner, that role's own acceptance is still owed (`open_blockers[195]`).

| id | for | question |
|---|---|---|
| Q-027-1 | Owner, A1 | Should a member of a blocked workspace still see **their own** membership row (`010`'s `workspace_members_select_own_active`)? Kept, the client can tell "you belong to a workspace that is closed" from "you belong to nothing"; gated, the membership disappears with everything else. Proposed: kept. |
| Q-027-2 | A1 | Is `closing` admitted for **writes** as well as reads? §11.4 stops new jobs and publishing only at the transition out of `closing` (step 2). Proposed: admitted for both, as `010`'s workspace policies already do; a narrower `closing` is a command-side rule. |
| Q-027-3 | Owner, A1 | Billing: should an owner still read invoices and payments of a workspace in `access_blocked` or later (§11.1 lists "Usage/billing invoices/read model" among the export domains)? Under this RFC they cannot through the client; export is the background job batch `160` owns. |
| Q-027-4 | A1 | `RFC-2026-023`'s acting-user helpers must carry the gate (§3.2). Which RFC's batch carries it depends on landing order; does A1 want the requirement written into `RFC-2026-023` now? |
| Q-027-5 | Owner, A1 | Today an owner can `UPDATE` `lifecycle_state` directly (`010:403`, `workspaces_update_owner` has no state constraint in `WITH CHECK`). Measured by C0, A1 and Q0 on `e64e1f5`: an `UPDATE` that reads a column is refused (`42501`) for the six blocked states, and one that reads none (no `WHERE`, or `where true`, and no `RETURNING` of a column — `returning 1` reads none and moves them too, A1's C2) moves every active or closing workspace the caller owns to any of the eight states. After this RFC, an owner who does that with `access_blocked` locks every member, including themselves, out — irreversibly **by any client** (a service-side write restores the value), unaudited, without the step-up §11.4 requires. Revoke the client `UPDATE` of `lifecycle_state`, or leave it to the §11.4 command (`RFC-2026-026` Q-026-5)? Proposed: revoke, in the **first** of batch 170's migrations, any job that selects workspaces by `lifecycle_state` (batch 160), or this RFC's migration — whichever lands first; the revoke needs nothing this RFC decides. Its isolation case must use the form that reads no column: a case asserting only that `… where id = …` is refused, **to a blocked state**, passed with the gap open (to `closing` the targeted form succeeded, `UPDATE 1`; Q0R-F3). **Answered *revoke*, and done:** batch 170's `170_workspace_lifecycle_not_client_writable.sql` (merged) revokes it, and its rls-smoke cases include the column-free forms, `returning 1` among them (`tests/db/identity/isolation-cases.mjs:17674`). |
| Q-027-6 | Integration Owner | Migration number in batch `170`'s range, and whether it may land before `170`'s other parts. |

### 10.1 Decisions taken by the Owner's answers

The Owner's words, verbatim: `ลุยต่อเลย เอาตามแนะนำ` ("Carry on, take the recommendations"), 2026-10-04,
read by A0 as accepting the recommendation current at the merge of batch rfc-026-027
(`product-owner-disposition-2026-10-03-batch-rfc-026-027.md` §5, §7 and §8). The Owner had not seen
the per-question text when writing; that reading is A0's and the Owner may correct it. **None of this
approves the RFC.**

| id | answer, as A0 recommended | where it is now the design | acceptance still owed |
|---|---|---|---|
| Q-027-1 | **Kept:** a member of a blocked workspace still sees their own membership row, so the client can tell "your workspace is closed" from "you belong to nothing" | §3.3's residual table, §5/6 | A1 |
| Q-027-2 | **`closing` admitted for writes as well as reads**, as `010`'s workspace policies already do; a narrower `closing` is a command-side rule | §2, §3.3 | A1 |
| Q-027-3 | **Billing reads of a blocked workspace refused through the client**; the owner's invoices reach them through the export job batch `160` owns | §3.3's table | A1 |
| Q-027-4 | **Yes:** write the admitted-state gate into `RFC-2026-023` now, so whichever RFC's batch lands first carries it | §3.2; the edit to `RFC-2026-023` is owed to A0 at its next revision (`open_blockers[195]`) | A1 |
| Q-027-5 | **Revoke** the client `UPDATE` of `lifecycle_state`, in whichever lands first — **done**, by batch 170's first migration, before this RFC's | §4 (this migration carries no revoke), §8 | A1 |
| Q-027-6 | **The next free number in batch `170`'s range** (on A0's reading, the next after `170`), landing after this RFC's approval and before any batch that relies on the gate | §4 | the Integration Owner, who assigns it |

## 11. Provenance, and what a reviewer should discount

- **Drafted by a subagent of A0's run.** A0 owns batch `170`, which this RFC hands work to, and reviewed
  `RFC-2026-020`, which this RFC amends. A1 Identity, who wrote `RFC-2026-020`, is the reviewer whose
  agreement matters most, and none has been sought yet.
- **Nothing was executed.** No database was started or queried for this draft. The state list, the
  policies and the helper bodies are read from `010` and `011` at `5c406de`; §7.2 lists what reading
  cannot settle.
- **In the review round, C0, A1 and Q0 each executed §3.1 and §3.2 on a scratch cluster** (C0 port
  5505, A1 5501 round r3, Q0 5503): no `42P17` and no runtime recursion; the eight-state matrix as §2
  predicts; the policy negative control bites; the two single-conjunct mutants survive the cases as
  first written (now cases 10 and 11). That is evidence for this text; it discharges none of §7.2 for
  the batch that lands §4, and the cases added in review have not been executed.
- **Batch rfc-text (2026-10-04) changed wording, scope and recorded answers only.** §3.1's and §3.2's
  SQL, the state sets and the cases' design are unchanged; nothing was executed for it. The 89/8 census
  of §6/6 is Q0's measurement on its review cluster, cited, not re-run.
- No migration, policy, grant, pin, lint file or test was changed to write this file; the only other
  change in its batch is the writable-path entry that lets it exist.
