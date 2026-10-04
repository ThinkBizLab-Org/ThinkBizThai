# RFC-2026-026 — Who writes an audit row: the command that performed the action, or the worker that did, in the same transaction

Status: Proposed — answered in principle by the Owner on 2026-10-04 (Q141-a = B); NOT approved; NOT in effect. The Owner's `เิาตามแนะนำ` of 2026-10-04 (transcribed in `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-150.md` §1 and §5) chose option B of Q141-a — an audit row is produced by an application command or the worker only, for G1, with no database trigger producing it — and directed that this RFC be written. It did not approve this text: the producer architecture below is A0's proposal, A1's acceptance as Q141-a's co-owner is owed (§5 of that disposition), and no migration, policy or grant changes until this file carries an approval and the dependencies in §9 hold.
Date: 2026-10-04
Revised: 2026-10-04, in the batch's review round, on the findings of C0 (`c0-batch-rfc-026-027-contract-review-2026-10-03.md`), A1 (`a1-batch-rfc-026-027-security-review-2026-10-03.md`) and Q0 (`q0-batch-rfc-026-027-test-review-2026-10-03.md`); the change list is in `a0-batch-rfc-026-027-plan-2026-10-03.md` §7. Still Proposed; the revision approves nothing and answers no question.
Author: `/claude/a0_atlas` (A0 Integration / DB-00), owner of batch `141` ("audit consumers/hooks") in the migration registry; drafted by a subagent of that run
Reviewer sought: `/claude/a1_bastion` (A1 Security), co-owner of Q141-a and Q141-c, author of `RFC-2026-022` and owner of batch `140`
Depends on: `RFC-2026-022` (approved 2026-09-08, not in effect) §3, §5/3, §5/4, §5/7, §5/8 and §8 for the CARRIED service shape; `RFC-2026-023` (in review) §3 and §4 for the acting-user bound on the command path; `RFC-2026-019` (approved) §4/2 and §4/3 for how the command and worker paths are reached; `RFC-2026-017` (approved) §3 for the service roles; `RFC-2026-016` (approved) §2 and §4; `RFC-2026-020` (approved) §5 and §6.2; `RFC-2026-012` (approved) for which tier issues a statement
Answers: Q141-a (`evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-141-prep.md` §5, answered in `product-owner-disposition-2026-10-03-batch-150.md` §5); records Q141-c's answer as a constraint (§7)
Holds: `work-packages/WP-0A-DB-00.json` `open_blockers[21]`, `[29]`, `[32]`, `[33]`, `[191]`

---

## 1. What is open

Batch `140` built the store — `app.audit_logs` and `app.security_events` — and wrote no writer. Its
header says so in capitals: "NOTHING CAN WRITE AN AUDIT ROW TODAY" (`140_audit.sql`, the section "THE
SECOND `S` CELL"). `app_worker` holds `SELECT` and `INSERT` on both tables and no policy
(`140_audit.sql:740-741`); no client role holds anything; `private.refuse_mutation()` refuses
`UPDATE`, `DELETE` and `TRUNCATE` for every role including the owner. `open_blockers[21]` carries the
consequence: §11.4 step 1, "Mark Workspace `closing`; write audit event", has a store and no writer.

Batch 141's preparation mapped what must be audited — `db/foundation/lint/audit-coverage-map.json`,
20 rows, every one with `producer_path: "UNDECIDED"` and `producer_decision: "Q141-a"` — and put the
producer to the Owner as three options:

- **(A)** a database trigger whose `SECURITY DEFINER` function is owned by a role that is not a path;
- **(B)** application command or worker only;
- **(C)** a hybrid.

The Owner chose B for G1 and directed that the RFC be written now. **B names a category, not an
architecture.** It does not say which role issues the `INSERT`, what policy admits it, where the
request and correlation ids come from, what happens when the action fails, or what the store looks
like before a worker identity exists. This RFC proposes those answers. It changes no file but itself.

## 2. What the tree says today, read rather than assumed

Measured on `5c406de` by reading files; no database was queried for this draft.

1. **The §8.4 cell.** `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md` §8.4:
   `| Audit/security INSERT | N | N | N | N | N | S |` — service only, every client role `N`.
2. **Its classification.** `RFC-2026-022` §3 classes it CARRIED ("the row being written names its
   workspace"), and `db/foundation/lint/service-policy-map.json:135` and `:143` hold the two rows, one
   per table, each saying "HOW the row is produced ... is NOT decided by this row: it is Q141-a" and
   "THIS ROW IS RE-CONFIRMED WHEN Q141-a IS ANSWERED".
3. **The service path is not in effect.** `RFC-2026-022` §5/8: the only member of `app_worker` is
   `postgres`, which bypasses row security, so a policy `TO app_worker` is "unreachable except from an
   identity for which it is moot". `open_blockers[113]` and `DATA-DEC-03` (due before G1) own the
   worker identity.
4. **The command path does not exist.** `RFC-2026-019` §4/2 makes a `SECURITY DEFINER` function owned
   by `app_command` the only way to be `app_command`; `RFC-2026-021` §10 records that none exists;
   `RFC-2026-023` (in review) proposes how such a function is bounded by the user it serves, and its
   §3.4 already says the function "validates its inputs, performs one command, and writes its audit
   row".
5. **Clients can perform audited actions directly.** Batch `010` grants
   `update (name, lifecycle_state, updated_by) on app.workspaces to authenticated`
   (`010_identity.sql:403`), and `workspaces_update_owner` admits the owner. So the
   `delete.workspace_closing` row of the coverage map — §11.4 step 1 — is a client `UPDATE` today,
   and no producer of any kind sees it. The same holds for invitations (`010:597`, `:613`) and for
   Business and Page archive (batch `020`'s owner/admin `UPDATE` policies). This is the fact B has to
   answer for; §5.5 does.
6. **No foreign key holds an audit row's scope** (`open_blockers[32]`): "What refuses it is the
   producer". `open_blockers[191]` (6) adds that any service `INSERT` policy owes the
   Workspace→Business→Page check beside the workspace term.

## 3. Decision proposed

### 3.1 Two producers, one store, no trigger

An audit or security-event row is written by exactly one of two producers, **in the same transaction
as the action it records**:

| producer | role that issues the `INSERT` | when | admitted by |
|---|---|---|---|
| **Command** | `app_command`, inside the `SECURITY DEFINER` command function that performs a user-initiated action (`RFC-2026-019` §4/2) | the action is requested by a user through the server tier (`RFC-2026-012`) | the acting-user policy of §3.3 |
| **Worker** | `app_worker`, inside the worker transaction that performs a background action (`RFC-2026-019` §4/3) | the action is performed by a job: publish delivery, purge, retention, billing projection, replay | the CARRIED policy of §3.2 |

**No trigger on any table writes an audit row**, and no function owned by a role other than these two
inserts into either audit table. That is the content of answer B, stated as a negative a lint can
hold (§8.1/1). `app_maintenance` writes no audit row: its own `RFC-2026-017` §3 obligation ("every use
carries a recorded reason") is a separate record and is not merged into the tenant audit log here.

The two policies §3.2 and §3.3 propose are written for **`app.audit_logs`**, whose columns they read.
`app.security_events` has a different shape — no `causation_id`, no `outcome`, no `business_profile_id`
or `page_context_profile_id`, and a nullable actor (`140_audit.sql:583-606`) — so neither predicate
transfers to it. Its producers are held by §3.7 and Q-026-9; the no-trigger rule above holds for both
tables either way.

No new role is created. Option A needed one (`app_audit` or similar), with an exemption-register row;
B does not, which is one of the reasons it was recommended.

### 3.2 The worker producer: `RFC-2026-022`'s CARRIED shape, unchanged

A policy `FOR INSERT TO app_worker` on `app.audit_logs` (its counterpart on `app.security_events`,
which has no `causation_id`, is §3.7's question, not this text), whose `WITH CHECK` is **the cell's own predicate AND the pinned confinement term**, exactly as
`RFC-2026-022` §5/3 requires — never the confinement term alone:

```
with check (
  workspace_id = (select nullif(current_setting('app.workspace_id', true), '')::uuid)
  and causation_id is not null
)
```

The cell's own predicate proposed for the worker is `causation_id is not null`: **a worker never acts
on its own initiative**, it acts in consequence of a job, and the job (or the event that enqueued it)
is the cause. `CTR-JOB-001` requires `job_id` on every job
(`contract-catalog/shared-kernel/ctr-job-001/schema.json`, `required`), so the worker always has a
causation id to give: the job id, as §3.5 says. (The job's `tenant_context` does not supply one:
`causation_id` is optional in `CTR-TEN-001`, whose required fields are `workspace_id`, `actor`,
`request_id`, `correlation_id`, `locale` and `timezone`.) A worker row with no cause is a defect this
refuses.

The confinement term is set by the worker's transaction preamble from the job's tenant context, with
`SET LOCAL`, per `RFC-2026-022` §5/7. It is **containment against defects in the worker's own code and
never tenant isolation of the worker path** (`RFC-2026-022` §5/4); this RFC repeats the sentence
because an audit table is where a reader is most tempted to read it the other way.

### 3.3 The command producer: bound to the acting user, through `RFC-2026-023`'s family

A policy `FOR INSERT TO app_command` on `app.audit_logs` (for `app.security_events`, see §3.7). The
command path has no confinement setting — `RFC-2026-023` §3.1 refuses a second identity channel — and
is bounded instead by the acting user read from `request.jwt.claims`:

```
with check (
  actor_kind = 'user'
  and actor_id = (app.jwt_subject())::text
  and (app.acting_user_admits_business(workspace_id, business_profile_id)
       or (outcome <> 'succeeded'
           and business_profile_id is null
           and page_context_profile_id is null))
)
```

Three things this does, each a separate claim a test must hold (§8.2):

1. **The actor cannot be forged by the command's inputs.** A command function that passes a different
   user id as the actor is refused by the policy. What remains is wider than one function: the binding
   reads `request.jwt.claims`, a setting any session can set, so **any session that can both set it
   and execute a command function writes as any user it names**. `RFC-2026-023` §4's residual — a
   function that rewrites the claims before it writes — is one case of that; the other is a role other
   than the request path holding `EXECUTE` on a command function. §8.1/6 makes the second a static
   rule; the first stays a review question, the same residual every `SECURITY DEFINER` function
   carries (§11).
2. **A succeeded record lands only where the acting user could have acted.** The `succeeded` arm reuses
   `RFC-2026-023` §3.2's acting-user helper, which asks membership and scope together. Its page form
   applies where `page_context_profile_id` is not null, as `RFC-2026-023` §3.3 already specifies.
3. **A denied or failed record is admitted for the acting user in any `workspace_id`, but names a
   business or page only when the acting-user helper admits that scope** (§3.6's rule, held by the
   policy rather than left to the producer). A denial is often a denial *because* the user is not a
   member (`service-policy-map.json:138`: "for a denial, the workspace the actor asked to act in, even
   when the actor's membership in it is what failed"). **The cost, as measured on a prototype in this
   RFC's review (A1, round r4):** it is not the cost of a *defective* command. A command written
   correctly to §3.4 records a denial for whatever `workspace_id` it was asked about, so **any
   authenticated client can, through a correct command, append `denied` rows attributed to itself into
   any `workspace_id`** — another tenant's, or one that does not exist (no foreign key,
   `open_blockers[32]`) — and `private.refuse_mutation()` makes them undeletable. Such a row cannot be
   `succeeded`, cannot name another actor, cannot name another tenant's business or page, and cannot
   alter or remove anything. It does write the caller's user id into another tenant's log and lets a
   caller fill that log. **Whether the arm stays, and if so with what volume bound, is Q-026-1 (§10),
   which must be answered before this RFC is approved.**

`app.jwt_subject()` is granted to nobody today (`011_authorization_helpers.sql:306-317`, "the narrowest
grant that leaves every real caller working is none"). This policy is the first real caller, so the
batch that lands it grants `EXECUTE` on `app.jwt_subject()` to `app_command` — and to nobody else — in a
diff a reviewer reads, rather than copying the identity expression into a third place, which
`scripts/db/run.mjs`'s identity-expression rule refuses outside `011`.

### 3.4 Same transaction, and what each outcome looks like

**Succeeded.** The audit `INSERT` is a statement in the action's own transaction. Commit writes both;
rollback writes neither. There is no outbox, no retry and no deduplication key for the audit row,
because there is nothing to retry: the row is local and atomic with what it records. A worker job that
is retried after a rollback writes its row on the attempt that commits, once.

**Audit write fails.** If the audit `INSERT` is refused — a CHECK constraint, the policy, a missing
grant — the action's transaction aborts with it. **An audited action that cannot be audited does not
happen.** That is fail-closed by construction and it is the property B buys over any asynchronous
producer.

**The `succeeded` audit `INSERT` is outside the exception block below.** A policy refusal of it raises
`42501` (`insufficient_privilege`), the same SQLSTATE a command's own refusals commonly carry; inside a
handler that catches `insufficient_privilege` it would be recorded as the user's denial, and the
action would still roll back but under the wrong outcome (A1's prototype, round r4). Outside the block,
the refusal is never caught: the call raises and no `denied` row is written (§8.2/16).

**Denied or failed.** A command that raises rolls back everything, its audit row included, so a raised
error is an unrecorded denial. The command function therefore records a denial or a failure inside
its own body: the action's writes run in a PL/pgSQL `BEGIN ... EXCEPTION` block (a subtransaction),
the handler lets their effects roll back to that savepoint, inserts the `denied` or `failed` row in the
outer transaction with its `error_code` (`CTR-ERR-001`'s stable code, as `140`'s
`audit_logs_outcome_matches_error` requires), and **returns** a typed error to the caller instead of
raising. The worker does the same in the transaction that records the failed attempt. A refusal that
never reaches a producer — a client statement refused by row level security, an authentication failure
before any database session — is not recorded by this design (§5.5, §10 Q-026-4). Nor is a recorded
denial durable if the client controls the end of the transaction (a direct connection, or a request
tier that lets the client ask for a rollback): the `denied` row is lost with it. No action commits that
way, so only refusal records are lost; it is held under Q-026-4 (A1's F2-f, reasoned, not measured).

### 3.5 Where each `CTR-AUD-001` field comes from

The producer fills every column `140` stores in `app.audit_logs` (`app.security_events`' columns are
§3.7's). Nothing is client-supplied; everything listed as "from the
server tier" is untrusted by the database and checked only for shape.

| `CTR-AUD-001` field | store column(s) | command producer | worker producer |
|---|---|---|---|
| `audit_id` | `id` (default `gen_random_uuid()`) | the default | the default |
| `occurred_at` | `occurred_at` | `now()` of the action's transaction | `now()`, unless the action is the projection of an external event with its own time (Q-026-3) |
| `actor` | `actor_kind`, `actor_id` | `user`, the acting user — held by the policy | the job's `tenant_context.actor` (`CTR-JOB-001`), or `system_actor` for a sweep no user started |
| `action` | `action_category`, `action_name` | a constant of the command function, one per coverage-map row | a constant of the job type |
| `tenant_context` scope | `workspace_id`, `business_profile_id`, `page_context_profile_id` | **read back from the row the action changed** (`RETURNING`), never from the inputs (§3.6) | the job's tenant context, confined by `app.workspace_id` |
| `request_id`, `correlation_id`, `causation_id` | the three columns | arguments of the command function, passed by the server tier from the resolved `CTR-TEN-001` context | the job's `tenant_context`; `causation_id` is the job id or the enqueuing event and is required (§3.2) |
| `outcome`, `reason_key` | the two columns | the function's own result | the attempt's result |
| `change.before_ref` / `after_ref` | `change_before_ref`, `change_after_ref` | references to the versions before and after, from `RETURNING` | the same |
| `error` | `error_code` | `CTR-ERR-001`'s code on `failed`/`denied` | the same |
| `redaction` | three booleans | always `true`, `true`, `true` | the same |
| `retention.policy_ref` | `retention_policy_ref` | the AUDIT or SECURITY class's current policy reference (`DATA-DEC-06` open; a versioned reference, never a duration) | the same |
| `details` | none | none — `140` holds it absent and this RFC does not open it | none |

The divergences batch 141's preparation found between `CTR-AUD-001` and the store (F1–F4, F15 on
`open_blockers[33]`) are **not** decided here: Q141-b's answer is to countersign `140`'s reading, which
is A6's act on `contract-catalog/**`. This table is written against the store as `140` built it, so it
holds whichever way A6 signs.

### 3.6 The scope path is checked by the producer, by copying, not by a policy

Neither audit table has a foreign key, and cannot (`open_blockers[32]`). A policy cannot check
Workspace→Business→Page either: `app_worker` reads no business row (grants without policies), and step
8 of §11.4 writes records about rows step 7 has already purged.

So the rule is on the producer: **a `succeeded` row copies its scope columns from the row the action
changed**, read back with `RETURNING` in the same statement. That row's own composite foreign keys
(`§3.3`, every tenant table since `020`) already guarantee the relation, so the audit row inherits a
checked scope instead of re-checking an unchecked one. A `denied` or `failed` row, where no row
changed, carries `workspace_id` as requested and **leaves `business_profile_id` and
`page_context_profile_id` null** unless the acting-user helper admits that scope — the policy of §3.3
holds this for refusal rows, so a refusal row cannot carry another tenant's business id (A1's
prototype case 9 admitted one under the earlier text). This discharges `open_blockers[191]` (6) on the
producer side; whether A1 accepts it there is Q-026-2. The copy-from-the-row half for `succeeded` rows
is a property of each command's body; §8.2/17 is the case that tells it apart from copying the inputs.

### 3.7 `app.security_events`: held, not proposed

`140` built `app.security_events` with `workspace_id`, `occurred_at`, `event_type`, a nullable
`actor_kind`/`actor_id` pair, two digests and `created_at` (`140_audit.sql:583-606`). Neither §3.2's
predicate (`causation_id`) nor §3.3's (`outcome`, `business_profile_id`, `page_context_profile_id`,
and an actor that is always present) can be written on it; a `create policy` copying either would fail
on an undefined column. This RFC therefore proposes **no policy and no grant on `app.security_events`**,
and holds its producers as Q-026-9: what a worker's cell predicate is on a table with no cause column
(a store change adding one, an `actor_kind is null or actor_kind = 'system_actor'` rule, or no worker
writer), and whether a command writes there at all and under which workspace term. Until Q-026-9 is
answered, `140`'s state holds for that table: `app_worker`'s grants, no policy, no writer. §3.1's
no-trigger rule binds it already.

## 4. What this decides about the §8.4 `S` cell

§8.4 gives the cell to "Service". Under this RFC, "Service" means **two named service roles, each
admitted by its own policy, and nothing else**: `app_worker` in `RFC-2026-022`'s CARRIED shape, and
`app_command` in the acting-user shape above — both on `app.audit_logs`; the same cell on
`app.security_events` waits for Q-026-9 (§3.7) and has no writer until then. Both are service roles in `RFC-2026-017` §3's sense; no
client column changes (`N` stays `N`, with no grant). `app_maintenance`, `service_role`, `app_authz`,
`anon` and `authenticated` hold no `INSERT` and no policy.

Two consequences for the register, owed and not taken here:

- `service-policy-map.json` keys a row on `(table, operation)` and has no role field
  (`open_blockers[191]` (2)). This cell now has two producers on one key. The map can hold the
  CARRIED worker row as it stands; the command row is `RFC-2026-023`'s shape, not a CARRIED one, and
  either the map gains a producer field or the command policy is recorded elsewhere. Owed to A1 with
  (2).
- `roleScopedCompleteness` (`RFC-2026-022` §7.1/8) asks an exemption-register row of every policy on a
  non-request-path role that is not the pinned CARRIED shape. The command policy is such a policy.
  Either it takes a register row, or the rule learns `RFC-2026-023`'s shape. Owed to A0 (the owner of
  `scripts/db/run.mjs`) when `RFC-2026-023` is disposed.

## 5. Options, and why B in this shape

### 5.1 A — a trigger owned by a not-a-path role

*True:* it sees every write to an audited table, whoever issues it, including the direct client
`UPDATE` of §2/5. Coverage would be a property of the schema rather than of application code.

*Why not:*

- **It cannot fill the record.** `request_id`, `correlation_id`, `causation_id`, `reason_key` and the
  action's name are not in the row a trigger sees. Putting them in a setting for the trigger to read is
  the GUC `RFC-2026-022` §5/4 measured the writing role can set — and on the request path PostgREST
  derives `request.*` settings from HTTP headers the client controls, so a trigger-read correlation id
  is a client-chosen one. (B has the same property for `request_id` and `correlation_id` whenever a
  command function is reachable by RPC: they are the function's arguments, and A1's prototype stored
  client-chosen values as given. §3.5 already treats them as untrusted; they are trustworthy only if
  command functions are called by the server tier alone. The argument against A is the next three
  points, not this one.)
- **It cannot record a refusal.** A trigger fires on a row change that happened. A `denied` record —
  SEC-009's support and role classes are mostly about refusals — has no row to fire on.
- **It needs a new role with a genuine exemption.** The trigger's owner must insert under a policy, and
  the trigger decides what to insert, so the policy is `WITH CHECK (true)` for that role: an
  exemption-register row, and a sixth not-a-path role beside `app_authz` and `app_queue`.
- **It records rows, not actions.** A purge in §11.4 step 7 changes many rows and is one act. A trigger
  writes one record per row, and step 8 then has to retain all of them.

### 5.2 C — a hybrid, a trigger as backstop and the command for the rich record

*True:* the backstop would catch the direct client writes of §2/5 while the command writes the full
record.

*Why not, for G1:* it pays every cost of A and of B, and adds a third: two records for one action
whose agreement nothing checks, and a reader who must decide which is authoritative. It is the right
answer only if §5.5's coverage rule cannot be held. That is a finding to be made, not assumed, and C
remains the amendment to propose if it is made.

### 5.3 B through a `SECURITY DEFINER` audit-writer function

*True:* one function `app.write_audit(...)`, owned by a not-a-path role, called by both producers,
would centralise the shape.

*Why not:* the function's owner needs the policy, so it is option A's role and exemption without the
trigger. And it would erase the distinction §3.2 and §3.3 rely on: the policy would see the function's
owner, not the producer, so neither the worker's causation rule nor the command's actor binding could
be expressed. Two direct `INSERT`s under two policies keep the producer visible to the database.

### 5.4 B with the worker as the only producer

*True:* one policy, one shape, the one `RFC-2026-022` already approved.

*Why not:* the command would have to enqueue its audit record as a job, which makes the audit write
asynchronous to the action: an action could commit and its record be lost or late, which is exactly
the atomicity §3.4 buys. It also makes the record's actor a claim carried in a job payload rather than
one the database can read from the session.

### 5.5 What B costs, and the rule that pays for it

**Under B, coverage is a property of application code.** An action performed through any path that is
not a producer is not audited, and today the client performs writes on the tables of most coverage-map
rows (§2/5). Read from `db/foundation/lint/pinned-grants.json` and the migrations' permissive policies
on the review-round branch (not measured on a catalog): `authenticated` holds an `INSERT` or `UPDATE`
grant that a permissive policy admits on a table of each of these rows —
`role.membership_or_scope_change` and `role.member_remove_or_suspend` (`workspace_member_scopes`,
`workspace_invitations`), `publish.now_or_cancel` (`publish_intents`), `delete.workspace_closing` and
`admin.workspace_update` (`workspaces`; `workspace_settings`), `delete.asset_hard_purge` (`assets`,
its soft-delete column), `owed.asset_rights_change` (`asset_rights`), `owed.schedule_transition_history`
(`content_schedules`, `calendar_items`), `delete.business_or_page` (`business_profiles`,
`page_context_profiles`), `delete.account` (`user_profiles`, profile fields only) and
`admin.approval_policy_manage` (`approval_policies`). Whether each of those client writes *is* the
row's audited action, or only touches its table (the asset hard purge and account deletion are not
client acts), is settled row by row by the batch that lands that row's producer; the list is the set
§5.5's rule must be checked against, not a finding that each is unaudited today. B is therefore only
honest with a rule beside it:

> **An action the audit coverage map lists is performed only by a producer.** When the command or job
> that performs a row's action lands, the same batch removes every client grant and policy that lets a
> client perform the same change directly, and a static rule holds the pair: a coverage-map row with
> `producer_path` set to `command` names its function, and no client role holds the privilege that
> would let it bypass that function.

Until those commands exist the gap is real and is recorded on `open_blockers[21]`: the owner can set
`app.workspaces.lifecycle_state` directly, unaudited. `RFC-2026-027` makes the consequence of that
sharper (an owner who sets `access_blocked` locks every member out), which is Q-026-5.

## 6. What happens before `DATA-DEC-03`'s worker identity exists

The Owner's answer says "No audit migration lands before the worker RFC". Read literally, and this RFC
proposes reading it literally:

1. **No producer is in effect, and none is written.** The state of `open_blockers[21]` holds: nothing
   writes an audit row. The coverage map's `producer_path` moves from `UNDECIDED` to the producer this
   RFC assigns each row when this RFC is approved — that is lint data, not a migration — and nothing
   else changes.
2. **The worker half waits for two things:** the worker identity (`DATA-DEC-03`, `open_blockers[113]`)
   and `RFC-2026-022` §7 holding. A policy `TO app_worker` written before then is moot (§2/3).
3. **The command half waits for three:** `RFC-2026-023`'s approval, the first command function (which
   `RFC-2026-023` §6 lands together with its closure amendment), and the worker RFC, per the Owner's
   sentence. Whether the command half may land with `RFC-2026-023`'s first command function, before the
   worker RFC, is Q-026-6 — it would let §11.4 step 1 be audited sooner, and it is the Owner's to say,
   not this RFC's to infer.
4. **No interim producer.** In particular no `postgres`-run script, no `app_maintenance` writer and no
   temporary trigger. A record written by a bypassing role proves nothing about the policy that will
   admit the real producer (`RFC-2026-016` §5) and would be the first rows of a log whose provenance
   later rows cannot match.

## 7. Tamper resistance until G1 (Q141-c)

Q141-c is answered: tamper **resistance** is enough until G1, and the missing tamper **evidence** is an
accepted risk until then (`open_blockers[29]`; A1's acceptance owed). This RFC changes neither half:

- Both producers receive `INSERT` only. No producer, and no role, receives `UPDATE`, `DELETE` or
  `TRUNCATE`; `private.refuse_mutation()` stays as `140` wrote it.
- What B adds to the threat picture is **forgery, not alteration**: a defective or compromised producer
  can append a false row. §3.2's confinement and causation rule and §3.3's actor binding are what bound
  it; neither is tamper evidence.
- Tamper evidence (a hash chain, an external append-only store, WORM) remains owed before G1 closes. If
  a hash chain is chosen, B is the shape that can carry it — the producer computes the link in the
  same transaction — where A's per-row trigger would order links by row rather than by act. That is an
  observation for whoever decides it, not a decision.

## 8. Acceptance criteria and test obligations

None of these is written by this RFC; each is owed by the batch that lands the half it names.

### 8.1 Static, by the lint that exists

1. **No trigger function writes an audit row.** No function that returns `trigger`, and no function
   reachable from one, contains an `INSERT` into `app.audit_logs` or `app.security_events`; the
   functions whose bodies do insert into them are exactly the names the coverage map gives in rows with
   `producer_path: "command"` (and their worker counterparts, which are not migration functions); and
   no trigger is created on either table except `140`'s refusal triggers. **Drift:** a trigger function
   inserting an audit row, appended to a migration, is refused by name. (The earlier wording — "no
   function body in migrations inserts into an audit table" — would have refused this RFC's own command
   producer, which is a migration-created function; Q0's F1.) This is answer B as a negative.
2. **Exactly two policies on `app.audit_logs`**, one `TO app_worker`, one `TO app_command`, both
   `FOR INSERT`, each `WITH CHECK` pinned as a literal the way `RFC-2026-020` §6.1/5 pins
   `app_authz`'s. On `app.security_events`, none until Q-026-9 is answered (§3.7).
3. **Grants:** `app_command` holds `INSERT` on `app.audit_logs` and nothing else on it, and nothing on
   `app.security_events` until Q-026-9; `app_worker`'s existing `SELECT` is reviewed (the producer
   needs none) and either justified or revoked; no other role gains anything. `EXECUTE` on
   `app.jwt_subject()` is held by `app_command` alone.
4. **Every coverage-map row names a producer** — `command` with a function name, or `worker` with a
   job type — and `producer_decision` cites this RFC. The coverage-map test that today refuses any
   value but `UNDECIDED` is changed in the same diff.
5. **§5.5's pair:** for every row with `producer_path: "command"` whose command has landed, no client
   role holds the privilege the command performs.
6. **`EXECUTE` on every command function is held by `authenticated` alone** — never by `app_worker`,
   `app_maintenance`, `service_role` or `PUBLIC` — so the only sessions that can both set
   `request.jwt.claims` and reach a command producer are request-path sessions (§3.3/1). The residual
   it does not close is recorded in §11.

### 8.2 Isolation cases (§8.6 shape)

Every case below is on `app.audit_logs`; `app.security_events` has no producer until Q-026-9 (§3.7).

6. Command, succeeded: as an acting user who can reach the target, the command changes the row and
   exactly one audit row exists with that actor, that scope (copied, §3.6) and `succeeded`.
7. **Atomicity, on every landed command:** for each command function the batch lands, the test (as
   owner, inside the case's transaction) makes the audit `INSERT` fail at the table — an added CHECK
   or restrictive policy the `succeeded` row violates — then calls the command. The action's change is
   absent afterwards, and the caller receives an error, not a typed `denied` result. A test stub is not
   enough: it proves PostgreSQL's transaction semantics, not that the landed producer writes in the
   action's transaction (Q0's F6). Without this case §3.4's central claim is a sentence.
8. Command, denied: the action's change is absent, one `denied` row exists with an `error_code`, and
   the function returned rather than raised.
9. Forged actor: a stub command inserting `actor_id` other than the claims' subject is refused by the
   policy by name (`deniedBy: 'rls'`).
10. No claims: refused by the policy, `42501` (`deniedBy: 'rls'`) — not by a cast error or a missing
    function.
11. `succeeded` for a workspace the acting user is not an active member of: refused.
12. Worker: `app.workspace_id` matching the row — admitted; naming another workspace — refused; unset —
    refused, and not by `42704` or `22P02` (`RFC-2026-022` §7.3 (a)); `causation_id` null — refused.
13. `UPDATE`, `DELETE`, `TRUNCATE` by either producer: refused, by the privilege layer (`42501`) and,
    for the owner, by `ZZ140`.
14. **Negative controls:** with the `app_command` policy dropped, cases 6 and 8 fail; with the
    `app_worker` policy dropped, case 12's admitted half fails. A producer that succeeds because
    something bypassed row security is indistinguishable otherwise (`RFC-2026-016` §5).
15. `140`'s two cases that assert today's refusal at the policy layer flip, as `RFC-2026-022` §8
    predicts, and are rewritten in the same diff — never left green by accident.
16. **An audit-write refusal is not a user denial** (§3.4): with the `succeeded` audit row refused by
    the policy, the call raises, the action's change is absent, and **no** `denied` row exists.
17. **Scope is copied from the row, not taken from the inputs** (§3.6): where a command's signature
    admits a business or page argument, a call whose argument names a business or page different from
    the changed row's records the row's scope; where no signature admits one, a static rule on the
    function body (scope columns sourced from `RETURNING`) stands in for it (Q0's F7).
18. **A refusal row names no unadmitted scope:** a command writing `denied` with a business id the
    acting user cannot reach — another tenant's — is refused by the policy (`deniedBy: 'rls'`); the
    same row with `business_profile_id` and `page_context_profile_id` null is admitted (A1's prototype
    case 9, inverted).

## 9. Migrations this implies later (none in this batch)

In batch `141`'s range, A0's per the registry, each a forward migration and never an edit to `140`:

1. **Command half** (after `RFC-2026-023` is approved and the worker RFC exists, or earlier if Q-026-6
   says so): `grant insert on app.audit_logs to app_command`; the `TO app_command` policy on
   `app.audit_logs`; `grant execute on function app.jwt_subject() to app_command`; an apply-time block
   asserting §8.1/2-3 and §8.1/6. Lands with, or after, the first command function.
   `app.security_events` gains a grant and a policy only as Q-026-9 decides.
2. **Worker half** (after `DATA-DEC-03` and `RFC-2026-022` §7): the `TO app_worker` policy on
   `app.audit_logs` (and on `app.security_events` only as Q-026-9 decides);
   `private.as_service()` gains its workspace argument (`RFC-2026-022` §8); the review of
   `app_worker`'s `SELECT`.
3. **Per audited action**, in the batch that lands its command or job: the revocation §5.5 requires.
   The first is the owner's `UPDATE` of `app.workspaces.lifecycle_state`, which the §11.4 closing
   command replaces.
4. **Lint, in the same diffs:** `audit-coverage-map.json`'s `producer_path`; the two
   `service-policy-map.json` rows re-confirmed (and the map's producer question of §4 settled); the
   `roleScopedCompleteness` question of §4; `superseded.json` entries for any earlier apply-time block
   the new policies make false (`140`'s blocks assert "no service policy"; the post-migrate pass will
   say which).

## 10. Questions this RFC raises

| id | for | question |
|---|---|---|
| Q-026-1 | A1 | **To be answered before approval.** Under §3.3/3 any authenticated client, through a command written correctly to §3.4, can append undeletable `denied`/`failed` rows attributed to itself into any `workspace_id` — another tenant's, or one that does not exist (measured on A1's prototype). Either (a) every `app.audit_logs` row from a command requires the acting user's active membership (or the workspace's existence through a definer helper), and a refusal about a workspace the user cannot reach is recorded elsewhere — a `security_events` row in a scope the actor can reach, which depends on Q-026-9 — or not recorded, beside Q-026-4; or (b) the arm stays, and this RFC states the cross-tenant append and the volume bound (a server-tier rate limit) that makes it acceptable. `service-policy-map.json:138`'s denial wording is re-confirmed either way. |
| Q-026-2 | A1 | Does §3.6 (scope copied from the changed row; denial rows carry no business or page unless validated) discharge `open_blockers[191]` (6) and `[32]`, or is a policy-side check still owed? |
| Q-026-3 | A1, A6 | `occurred_at` for a worker projecting an external event (a provider's publish confirmation, a payment webhook): the projection's time or the provider's? `CTR-AUD-001` does not say. |
| Q-026-4 | A1 | Refusals that never reach a producer — RLS refusals of direct client statements, authentication failures, platform-scope events (`open_blockers[191]` (7)) — are unrecorded under B. Is that accepted until G1, or does SEC-014 need a producer before then? The same question covers a recorded denial lost because the client controls the transaction's end (§3.4); if accepted, the deployment pins the request tier so a client cannot ask for a rollback, when that configuration exists. |
| Q-026-5 | Owner, A1 | Until the §11.4 closing command exists, an owner can change `lifecycle_state` directly and unaudited, and under `RFC-2026-027` that includes setting `access_blocked`. Measured by C0, A1 and Q0 on `e64e1f5`: an `UPDATE` that reads a column (`WHERE id = …`, `RETURNING id`, a `CASE` in `SET`, the PostgREST-shaped CTE) is refused (`42501`) for the six blocked states, and an `UPDATE` that reads none (no `WHERE`, or `where true`, no `RETURNING`) moves **every** active or closing workspace the caller owns to any of the eight states, and nothing the caller does not own; the owner cannot move it back. Revoke the client `UPDATE` of `lifecycle_state` now (no command yet, so nobody can close a workspace), or accept the gap until the command lands? The revoke needs nothing either RFC decides (`open_blockers[195]`). |
| Q-026-6 | Owner | May the command half land with `RFC-2026-023`'s first command function, before the worker RFC? The Owner's words say no audit migration lands before the worker RFC; this asks whether that was meant for both halves. |
| Q-026-7 | A0, A1 | `service-policy-map.json` cannot key two producers on one `(table, operation)` (§4). Add a producer field, or keep command-path policies out of the map? |
| Q-026-8 | A6 | `actor` for a worker acting on a user's job: the job's `tenant_context.actor` (the user) or a `system_actor`? The contract permits both and SEC-009's "names its actor" reads either way. |
| Q-026-9 | A1 (owner of batch `140`), A0 | `app.security_events` (§3.7): which producers write it, and under which predicates written on its own columns? It has no `causation_id`, so the worker's cell predicate is open — a forward migration adding a cause column, a rule such as `actor_kind is null or actor_kind = 'system_actor'`, or no worker writer; and whether a command writes there, under which workspace term (Q-026-1 (a) depends on it). Until answered, it has no writer. |

## 11. Provenance, and what a reviewer should discount

- **I am A0, the owner of batch 141, proposing the architecture of batch 141.** The proposal makes
  141 smaller than A or C would (no role, no trigger, no exemption). That is the direction that costs
  the proposer least, and it should be weighed as such.
- **Drafted by a subagent of the Author run**, in the same vendor and model family as every reviewer
  this package has. `RFC-2026-024` withdrew the cross-vendor condition; it did not make the defect go
  away.
- **Nothing here was executed.** Every mechanism claim — that a PL/pgSQL exception block rolls back to
  its savepoint and lets the handler's insert commit with the outer transaction; that a policy calling
  `app.jwt_subject()` needs `EXECUTE` for the querying role; that `RETURNING` reads the post-change row
  under the function's privileges — is reasoning, and `RFC-2026-020` §6.2's rule applies: each is
  discharged by execution in the batch that relies on it, never by citing this file.
- **In the review round, A1 prototyped §3.3 and §3.4 on a scratch cluster** (round r4: the grant, the
  policy as then written, and a command function in §3.4's shape, with `app.is_active_member` standing
  in for `RFC-2026-023`'s helper, which does not exist). That measured the cross-tenant append (§3.3/3),
  the refusal-row scope gap (now held by the policy), the SQLSTATE overlap (§3.4) and fail-closed
  atomicity. It is evidence for this text, not the execution `RFC-2026-020` §6.2 requires of the batch
  that lands it, and the revised policy of §3.3 has not been executed.
- **The actor binding's residual** (§3.3/1): a session that can set `request.jwt.claims` and execute a
  command function writes as any user. §8.1/6 confines `EXECUTE` to `authenticated`; what remains is
  a `SECURITY DEFINER` function that rewrites the claims before it writes, which only review catches.
- No migration, policy, grant, lint file, test or work-package field other than the writable path that
  lets this file exist was changed to write it.

## Rollback

Delete this file and its writable-path entry. Nothing depends on it: no migration, policy or lint file
cites it, and the coverage map still says `UNDECIDED`. If its §9 migrations have landed, each is
reverted by a forward migration that drops the two producers' policies and grants, which returns the
store to `140`'s state — no writer, every role refused — strictly narrower and still passing.
