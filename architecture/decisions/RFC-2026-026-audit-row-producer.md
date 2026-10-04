# RFC-2026-026 — Who writes an audit row: the command that performed the action, or the worker that did, in the same transaction

Status: Proposed — answered in principle by the Owner on 2026-10-04 (Q141-a = B); NOT approved; NOT in effect. The Owner's `เิาตามแนะนำ` of 2026-10-04 (transcribed in `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-150.md` §1 and §5) chose option B of Q141-a — an audit row is produced by an application command or the worker only, for G1, with no database trigger producing it — and directed that this RFC be written. It did not approve this text: the producer architecture below is A0's proposal, A1's acceptance as Q141-a's co-owner is owed (§5 of that disposition), and no migration, policy or grant changes until this file carries an approval and the dependencies in §9 hold. The nine questions of §10 were answered on 2026-10-04 as A0 recommended (the Owner's `ลุยต่อเลย เอาตามแนะนำ`, transcribed with A0's reading of it in `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-rfc-026-027.md` §8); those answers are folded into this text as its design (§3.3, §3.7, §10.1), except the second half of Q-026-1's recommendation, which conflicts with Q-026-9's and is re-opened as Q-026-10, unanswered (batch rfc-text's review round; A0's recommendation for it is recorded beside it in §10 and is not an answer). **They are not an approval of this text**: approval is the Owner's explicit act and A1's review, and each named role's own acceptance of its answer is still owed.
Date: 2026-10-04
Revised: 2026-10-04, in the batch's review round, on the findings of C0 (`c0-batch-rfc-026-027-contract-review-2026-10-03.md`), A1 (`a1-batch-rfc-026-027-security-review-2026-10-03.md`) and Q0 (`q0-batch-rfc-026-027-test-review-2026-10-03.md`); the change list is in `a0-batch-rfc-026-027-plan-2026-10-03.md` §7. Still Proposed; the revision approves nothing and answers no question.
Revised: 2026-10-04, in batch rfc-text (`a0-batch-rfc-text-plan-2026-10-03.md`): the Owner's answers to Q-026-1..9 folded in as the design (Q-026-1 superseded: active membership for every command row; Q-026-9: the producers of `app.security_events`); §3.3's literal calls the page form (C0-9, A1 F4-a); §8.1/1 and §8.2/16 rewritten as executable obligations (Q0R-F2, Q0R-F1); the facts batch 170 changed restated. Still Proposed; the revision approves nothing.
Revised: 2026-10-05, in batch rfc-text's review round, on the findings of C0 (`c0-batch-rfc-text-contract-review-2026-10-03.md`), A1 (`a1-batch-rfc-text-security-review-2026-10-03.md`) and Q0 (`q0-batch-rfc-text-test-review-2026-10-03.md`); the change list is in `a0-batch-rfc-text-plan-2026-10-03.md` §6. §10.1 no longer records "not recorded" as the Owner's answer for a refusal about an unreachable workspace: the two accepted recommendations conflict, and that half is re-opened as Q-026-10 (C0-RT-1, A1 F1); §8.1/1 reads every non-system function's full definition, matches bare names, defines its `EXECUTE` token and adds (e) (C0-RT-2/3, A1 F2, Q0 F1-F4); §3.3/2-3, §8.2/17 and /21 corrected (A1 F3/F4, C0-RT-4, Q0 F6). Still Proposed; the revision approves nothing and answers no question.
Revised: 2026-10-05, in batch rfc-026-static-rule (`a0-batch-rfc-026-static-rule-plan-2026-10-03.md`), on the re-checks of batch rfc-text's review round (`c0-`, `a1-`, `q0-batch-rfc-text-recheck-2026-10-03.md`), under the Owner's `เอาตามแนะนำ` of 2026-10-05, which A0 reads as authorising these §8.1/1 text fixes only (`product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md`): §8.1/1 reads extension members (A1 N1) and every rewrite rule in a non-system schema, as (f) (A1 N2, Q0 R2); (b) skips a function's own header name, so it no longer selects every producer (C0-RR-1, Q0 R1); what a lexer refusal means is stated (C0-RR-3, Q0 R5); drift 1's SECURITY DEFINER form reshaped (Q0 R3); the reader list held to `STABLE`/`IMMUTABLE` (Q0 R6); A0 adds (g), stored expressions; the "18 functions" corrected to 14 after `migrate-clean` (C0-RR-4, A1 N4, Q0 R4); Q-026-10's option (i) states its cost (C0-RR-2, A1 N3) and the question carries A0's recommendation, (iii), marked as a recommendation. Still Proposed; the revision approves nothing, and Q-026-10 stays unanswered.
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
   answer for; §5.5 does. **Changed since this RFC was first written:** Q-026-5 was answered *revoke*,
   and `170_workspace_lifecycle_not_client_writable.sql` (batch 170, merged) revokes `authenticated`'s
   `UPDATE (lifecycle_state)` on `app.workspaces`; the client keeps `UPDATE (name, updated_by)`. So
   §11.4 step 1 is no longer a client write — it has no writer at all until its command lands
   (`open_blockers[195]` (9)). The other client writes named here are unchanged.
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
transfers to it. Its producers are §3.7's, written on its own columns as Q-026-9 was answered; the
no-trigger rule above holds for both tables either way.

No new role is created. Option A needed one (`app_audit` or similar), with an exemption-register row;
B does not, which is one of the reasons it was recommended.

### 3.2 The worker producer: `RFC-2026-022`'s CARRIED shape, unchanged

A policy `FOR INSERT TO app_worker` on `app.audit_logs` (its counterpart on `app.security_events`,
which has no `causation_id`, is §3.7's worker policy, not this text), whose `WITH CHECK` is **the cell's own predicate AND the pinned confinement term**, exactly as
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
is bounded instead by the acting user read from `request.jwt.claims`. The literal, as the Owner's
answers to Q-026-1 (superseded: membership for every command row) and Q-026-2 shape it, and with the
page form C0-9 and A1's F4-a found missing:

```
with check (
  actor_kind = 'user'
  and actor_id = (app.jwt_subject())::text
  and app.is_active_member(workspace_id)
  and case
        when outcome = 'succeeded' then
          (business_profile_id is null
             or app.acting_user_admits_business(workspace_id, business_profile_id))
          and (page_context_profile_id is null
             or (business_profile_id is not null
                 and app.acting_user_admits_page(workspace_id, business_profile_id,
                                                 page_context_profile_id)))
        else business_profile_id is null and page_context_profile_id is null
      end
)
```

`outcome` is `not null` (`140`'s `audit_logs_outcome_known`), so the `case` has no third branch; a helper
that answers null leaves the check null, which refuses. No scope helper is ever called with a null
scope id: the business form only when a business is named, the page form only when both a business and
a page are named. So what `RFC-2026-023`'s helpers answer for a null id is not something this policy
depends on, and a row naming a page without a business is refused.

Four things this does, each a separate claim a test must hold (§8.2):

1. **The actor cannot be forged by the command's inputs.** A command function that passes a different
   user id as the actor is refused by the policy. What remains is wider than one function: the binding
   reads `request.jwt.claims`, a setting any session can set, so **any session that can both set it
   and execute a command function writes as any user it names**. `RFC-2026-023` §4's residual — a
   function that rewrites the claims before it writes — is one case of that; the other is a role other
   than the request path holding `EXECUTE` on a command function. §8.1/6 makes the second a static
   rule; the first stays a review question, the same residual every `SECURITY DEFINER` function
   carries (§11).
2. **Every command row lands only in a workspace the acting user is an active member of** — succeeded,
   denied and failed alike (Q-026-1, answered: option (a)). The membership term is `011`'s
   `app.is_active_member`, which reads the same claims and, once `RFC-2026-027` lands, refuses a
   workspace whose access is blocked. So no client, through any command, writes into another tenant's
   log or into a `workspace_id` that does not exist — while the request tier alone sets
   `request.jwt.claims` (§3.3/1's assumption; a session that sets the claims writes as the user it
   names, member of whatever that user is a member of). The cross-tenant append the review round
   measured on the earlier text (A1, round r4) is refused by this literal as written; A1 executed it
   on a prototype with stand-in helpers in batch rfc-text's review (P1-P4 refused, P5 admitted, the
   negative control N1 refused), which is evidence for this text and not the execution §11 requires;
   §8.2/19 is the case that must show it. **A consequence for a later command** (C0-RT-4): a command
   that moves its own workspace into a blocked state cannot write its `succeeded` row after the move in
   the same transaction — the `INSERT` sees the `UPDATE`, and the membership term refuses — so the
   action could never commit. That fails closed, and §11.4 gives such a transition to no command
   today; whichever batch first gives one to a command decides, with an §8.2 case, whether it writes
   its row before the move or leaves the transition to the worker. This RFC decides neither.
3. **A succeeded record names a business or page only where the acting user's narrowing admits it.**
   The business form is `RFC-2026-023` §3.2's `acting_user_admits_business`; the page form is its
   `acting_user_admits_page`, called whenever `page_context_profile_id` is not null (C0-9, A1 F4-a: the
   earlier literal called the business form alone, so it admitted any page id). **What the policy does
   not hold:** those helpers answer "is this user narrowed away from this scope?", not "does this
   business belong to this workspace, and this page to this business?". For an unnarrowed member — the
   usual case for an owner — they are true for any id. For a member narrowed by an `all_businesses`
   or a `business` scope, the page form is true for **any page id** under a business the scope covers,
   another tenant's page included: batch 021's coverage admits a page by its business alone
   (`021_member_scope.sql:448-450`), and A1 measured it on a prototype (batch rfc-text review, G7: a
   `business`-scoped member's `succeeded` row naming its business and another tenant's page was
   admitted). So **the policy refuses another tenant's page only for a member narrowed by a `page`
   scope** (§8.2/20); for every other member the relation between the scope columns is held only by
   the producer copying them from the changed row (§3.6) and tested by §8.2/17, which covers that case.
   A policy-side check of it stays owed with `open_blockers[32]`'s missing foreign key (Q-026-2,
   answered). In every case the row stays in the caller's own workspace, under the caller's own actor.
4. **A denied or failed record names no business and no page.** Where no row changed there is no row
   to copy a checked scope from, and the helpers cannot check the relation, so a refusal row carries its
   `workspace_id` only (A1's F4-a, option (i)). A denial is often a denial *because* the user is not a
   member (`service-policy-map.json:138`: "for a denial, the workspace the actor asked to act in, even
   when the actor's membership in it is what failed"). Under this literal a member's denial — a missing
   capability or scope — is recorded at workspace level, and a non-member's denial is not recorded in
   `app.audit_logs` at all. It is not recorded in `app.security_events` either, since §3.7 holds the
   command there to the same membership term. **That is A0's reconciliation, not the Owner's answer**
   (C0-RT-1, A1 F1 of batch rfc-text's review): the recommendation the Owner accepted for Q-026-1
   routes such a refusal to `app.security_events` once Q-026-9 gives that table a producer, and the
   recommendation the Owner accepted for Q-026-9 gives the command a producer there only in a workspace
   the actor is an active member of — so the two accepted recommendations conflict, and the earlier
   text resolved the conflict silently toward less recording. Until **Q-026-10** (§10) is answered by
   A1 and the Owner, the text holds this refusal as unrecorded; it is **not** part of Q-026-4's
   accepted answer, which named refusals that never reach a producer, and these reach one.
   `service-policy-map.json:138`'s denial wording is re-confirmed against whichever answer Q-026-10
   gets when the command half lands (§9/4).

`app.jwt_subject()` is granted to nobody today (`011_authorization_helpers.sql:306-317`, "the narrowest
grant that leaves every real caller working is none"). This policy is the first real caller, so the
batch that lands it grants `EXECUTE` on `app.jwt_subject()` to `app_command` — and to nobody else — in a
diff a reviewer reads, rather than copying the identity expression into a third place, which
`scripts/db/run.mjs`'s identity-expression rule refuses outside `011`. The same diff grants `EXECUTE` on
`app.is_active_member(uuid)` to `app_command`, beside `authenticated`, which holds it today
(`011_authorization_helpers.sql:320`); `RFC-2026-023`'s two helpers are granted to `app_command` by
that RFC's own batch (§3.2 there).

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
before any database session — is not recorded by this design (§5.5); that is accepted until G1 as a
recorded gap (Q-026-4, answered), with SEC-014's producer for it owed before Paid Beta. A refusal about
a workspace the acting user is not an active member of reaches a producer but has no row it may write
under this text (§3.3/4); that is A0's reconciliation of two accepted recommendations that conflict,
held open as Q-026-10, not part of Q-026-4's answer. Nor is a recorded
denial durable if the client controls the end of the transaction (a direct connection, or a request
tier that lets the client ask for a rollback): the `denied` row is lost with it. No action commits that
way, so only refusal records are lost; it is part of Q-026-4's accepted gap (A1's F2-f, reasoned, not
measured).

### 3.5 Where each `CTR-AUD-001` field comes from

The producer fills every column `140` stores in `app.audit_logs` (`app.security_events`' columns are
§3.7's). Nothing is client-supplied; everything listed as "from the
server tier" is untrusted by the database and checked only for shape.

| `CTR-AUD-001` field | store column(s) | command producer | worker producer |
|---|---|---|---|
| `audit_id` | `id` (default `gen_random_uuid()`) | the default | the default |
| `occurred_at` | `occurred_at` | `now()` of the action's transaction | `now()` of the worker's transaction, always — for the projection of an external event too: `occurred_at` is a time this system witnessed, and the provider's own time stays in the event's payload where the projection stored it (Q-026-3, answered) |
| `actor` | `actor_kind`, `actor_id` | `user`, the acting user — held by the policy | the job's `tenant_context.actor` (`CTR-JOB-001`), the user who started it; `system_actor` only for a sweep no user started (Q-026-8, answered) |
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
Workspace→Business→Page either: `app_worker` reads no business row (grants without policies), step 8 of
§11.4 writes records about rows step 7 has already purged, and the command policy's scope helpers answer
narrowing, not the relation (§3.3/3).

So the rule is on the producer: **a `succeeded` row copies its scope columns from the row the action
changed**, read back with `RETURNING` in the same statement. That row's own composite foreign keys
(`§3.3`, every tenant table since `020`) already guarantee the relation, so the audit row inherits a
checked scope instead of re-checking an unchecked one. A `denied` or `failed` row, where no row
changed, carries the `workspace_id` it was about — one the acting user is an active member of (§3.3/2)
— and **always leaves `business_profile_id` and `page_context_profile_id` null**; the policy of §3.3
refuses a refusal row that names either (§3.3/4, §8.2/18). The earlier text let a refusal row name a
scope "the acting-user helper admits"; A1 measured that to admit another tenant's business for an
unnarrowed member (F4-a, cases D-H), so that clause is gone.

This discharges `open_blockers[191]` (6) and `[32]` **on the producer side** (Q-026-2, answered: yes on
the producer side, no on the policy side). The policy side — a check of the relation between the scope
columns — stays owed with `[32]`'s missing foreign key; A1's acceptance of the answer is owed. The
copy-from-the-row half for `succeeded` rows is a property of each command's body; §8.2/17 is the case
that tells it apart from copying the inputs.

### 3.7 `app.security_events`: the producers Q-026-9's answer gives it

`140` built `app.security_events` with `workspace_id`, `occurred_at`, `event_type`, a nullable
`actor_kind`/`actor_id` pair, two digests and `created_at` (`140_audit.sql:583-606`). Neither §3.2's
predicate (`causation_id`) nor §3.3's (`outcome`, `business_profile_id`, `page_context_profile_id`)
can be written on it; a `create policy` copying either would fail on an undefined column.

Q-026-9 was answered as A0 recommended (A1's acceptance, as the owner of batch `140`, is owed): **no
store change before G1** — no cause column is added — and two producers, each with a predicate on the
table's own columns:

| producer | policy | `WITH CHECK` | what it admits |
|---|---|---|---|
| **Worker** | `FOR INSERT TO app_worker` | `workspace_id = (select nullif(current_setting('app.workspace_id', true), '')::uuid) and (actor_kind is null or actor_kind = 'system_actor')` | an unattributed event (a pattern nobody performed, the "replay anomaly" of the ERD's §9.1, `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:455`, `SECURITY-4`) or one a `system_actor` raised, confined to the job's workspace; never an event attributed to a user |
| **Command** | `FOR INSERT TO app_command` | `actor_kind = 'user' and actor_id = (app.jwt_subject())::text and app.is_active_member(workspace_id)` | an event attributed to the acting user itself, in a workspace it is an active member of; never another actor, never an unattributed one, never a workspace it cannot reach |

The worker's predicate is the cell's own predicate AND the pinned confinement term, as `RFC-2026-022`
§5/3 requires; the confinement term is containment, not isolation (§3.2). The command's is §3.3/1-2's
binding on this table's columns. A refusal about a workspace the acting
user cannot reach therefore has no producer in either table under this text (§3.3/4). That is not what
the recommendation the Owner accepted for Q-026-1 said — it routed that refusal here — and it is not
part of Q-026-4's accepted answer; it is A0's reconciliation of the conflict between the two accepted
recommendations, held open as **Q-026-10** (§10) for A1 and the Owner. One option there is a command
event in a workspace the actor *can* reach. The command policy above admits such a row, but **the
table has no column that can name the attempted workspace** (C0-RR-2, A1 N3 of batch rfc-text's
re-check): its columns are those listed at the head of this section. Naming it takes either a forward
migration adding a column — a store change in batch `140`'s range, A1's, with its classification under
ERD §9.1, which Q-026-9's accepted answer ("no store change before G1") excluded — or the id written
into `event_type` as 32 hex digits without hyphens, which the CHECK's grammar admits and does not mean
(it is the kind of event, "A GRAMMAR and not a vocabulary" as `140_audit.sql:594` says of it, not
a place for an identifier). Without either, the row says
that an attempt happened, not where; and an actor who is an active member of no workspace has no row
at all. Another option is a platform-scope store (`open_blockers[191]` (7)), also a store change; the
third is to accept the gap explicitly. A0 recommends the third (§10, Q-026-10); this RFC chooses none
of them, and the recommendation is not an answer. Until the halves of §9 land, `140`'s state holds for this table:
`app_worker`'s grants, no policy, no writer. §3.1's no-trigger rule binds it already.

## 4. What this decides about the §8.4 `S` cell

§8.4 gives the cell to "Service". Under this RFC, "Service" means **two named service roles, each
admitted by its own policy, and nothing else**: `app_worker` in `RFC-2026-022`'s CARRIED shape, and
`app_command` in the acting-user shape above — on `app.audit_logs`, and on `app.security_events` with
the predicates §3.7 gives as Q-026-9 was answered. Both are service roles in `RFC-2026-017` §3's sense; no
client column changes (`N` stays `N`, with no grant). `app_maintenance`, `service_role`, `app_authz`,
`anon` and `authenticated` hold no `INSERT` and no policy.

Two consequences for the register, owed and not taken here:

- `service-policy-map.json` keys a row on `(table, operation)` and has no role field
  (`open_blockers[191]` (2)). This cell now has two producers on one key. **The map gains a producer
  field** (Q-026-7, answered), so the register stays the one place every write path is listed: the
  CARRIED worker row as it stands, and the command row in `RFC-2026-023`'s shape beside it. The field
  lands with the first of §9's halves; owed to A0 and A1 with `[191]` (2).
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

Until those commands exist the gap is real and is recorded on `open_blockers[21]`. Its sharpest case is
closed: Q-026-5 was answered *revoke*, and batch 170's
`170_workspace_lifecycle_not_client_writable.sql` revoked the client `UPDATE` of
`app.workspaces.lifecycle_state`, before `RFC-2026-027`'s gate could turn it into a lock-out of every
member. That is §5.5's rule applied ahead of its command: the change now has no client path and no
producer, and waits for the §11.4 command (`open_blockers[195]` (9)).

## 6. What happens before `DATA-DEC-03`'s worker identity exists

The Owner's answer says "No audit migration lands before the worker RFC". Q-026-6's answer reads that
sentence as binding the worker half; for that half it is read literally:

1. **No producer is in effect, and none is written.** The state of `open_blockers[21]` holds: nothing
   writes an audit row. The coverage map's `producer_path` moves from `UNDECIDED` to the producer this
   RFC assigns each row when this RFC is approved — that is lint data, not a migration — and nothing
   else changes.
2. **The worker half waits for two things:** the worker identity (`DATA-DEC-03`, `open_blockers[113]`)
   and `RFC-2026-022` §7 holding. A policy `TO app_worker` written before then is moot (§2/3).
3. **The command half waits for two:** `RFC-2026-023`'s approval and the first command function (which
   `RFC-2026-023` §6 lands together with its closure amendment). It does **not** wait for the worker
   RFC: Q-026-6 was answered *yes*, so the Owner's "no audit migration lands before the worker RFC" is
   read as binding the worker half only, and §11.4 step 1 can be audited as soon as its command exists.
   That reading is A0's recommendation as the Owner accepted it (disposition §8); a correction from the
   Owner replaces it.
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

1. **Only the pinned producer set inserts an audit row, and nothing else reaches one: no trigger, no
   rewrite rule, no stored expression** — answer B as a negative, stated over the catalog so a lint can
   decide it (Q0R-F2: the earlier "no function reachable from one" needed a call graph through PL/pgSQL
   bodies and had no decidable form). Read after `migrate-clean` from `pg_proc`, `pg_trigger`,
   `pg_rewrite`, `pg_attrdef`, `pg_constraint`, `pg_policy`, `pg_index`, `pg_namespace` and
   `pg_depend`. The labels "the review round" and "the re-check" below are batch rfc-text's review
   round and the C0, A1 and Q0 re-checks of it (`c0-`, `a1-`, `q0-batch-rfc-text-recheck-2026-10-03.md`);
   "measured" without a source is A0's prototype in batch rfc-026-static-rule (last paragraph).
   - **Which functions it reads** (C0-RT-2, A1 F2, Q0 F3 of the review round; A1 N1 of the re-check):
     **every** function or procedure in a non-system schema or with an OID at or above 16384 — the
     repository's `userObject` reading (`scripts/db/run.mjs`, `NON_SYSTEM_SCHEMA` and
     `FIRST_NORMAL_OID`), so `public`, `auth`, `extensions` and any schema a later migration creates
     are read, not `app` and `private` alone — **extension members included**. The review round's text
     excepted the members of an extension (`pg_depend.deptype = 'e'`) as written by no migration body.
     A1 measured the opposite: one `ALTER EXTENSION … ADD` makes any function a member, and a
     `SECURITY INVOKER` function in `public` inserting into `app.audit_logs`, added to pgcrypto,
     migrated clean with every layer green and was read by no part of the rule. `run.mjs` records the
     same bypass for `SECURITY DEFINER` functions (A1 V06b), which batch 128's third rule closed by
     reading exactly those members; this rule reads them for the same reason, whatever `prosecdef`
     says. Measured on a clean `migrate-clean`: the 36 members (pgcrypto's, all in language `c`) name
     no audit table and no producer, so reading them selects nothing; a member that does match goes to
     the pinned lists below like any other function. A function in language `c` or `internal` is opaque
     to this rule — its `AS` strings name a library file and a symbol, not SQL — and the rule does not
     claim to read one; making one needs a superuser and a library on the server.
   - **What text it reads** (Q0 F1 of the review round): each function's **full definition**,
     `pg_get_functiondef(oid)`, not `prosrc`. An SQL-standard (`BEGIN ATOMIC`) body has an empty
     `prosrc` and keeps its body in `prosqlbody`; Q0 measured one created through `EXECUTE` inside a
     `DO` block migrating clean (`psql-driver.mjs` refuses `BEGIN ATOMIC` at the top level only), where
     a rule reading `prosrc` saw nothing. The definition is tokenised by the repository's one SQL lexer
     (`scripts/db/sql-lexer.mjs`: comments dropped, string and dollar-quoted bodies read at every
     nesting level by `walkLevels`, identifiers folded). Only (b) leaves one part of it unread: the
     function's own name in its header (below).
   - **What a lexer refusal means** (C0-RR-3, Q0 R5 of the re-check). `walkLevels` lexes every
     literal's value as SQL, so ordinary prose yields refusals at an inner level: measured, a message
     `'the caller can''t do this'` and a JSON literal holding an apostrophe gave three in one function,
     `rls-smoke`'s `private.as_*` helpers give one or two each, and each of pgcrypto's 36 members gives
     one, in its `AS '$libdir/pgcrypto'` file string. The rule: tokens are collected at every level
     whatever the refusals. **A refusal in the text the server compiles as the function fails the
     function closed** — the definition itself (level 0) and, where `pg_get_functiondef` prints the
     body as a dollar-quoted `AS` string, that body (the level that string opens): the function is red,
     and only a pinned exemption in a diff a reviewer reads clears it. PostgreSQL stores such a body
     when `check_function_bodies` is off, so the case is not hypothetical. **A refusal at a deeper
     level, inside a literal of the body, does not fail the function**: that text reaches the server
     as SQL only through `EXECUTE`, which (c) refuses, or as the literal body of static DDL in the
     body, which is itself a level read here; and a text that does not lex is a syntax error when the
     server reads it, so it runs nothing (`sql-lexer.mjs`, the header of `walkLevels`). A refusal in a
     file string of a `c` function is of that kind. **Every level past `NESTED_DEPTH`**, which
     `walkLevels` reports through `beyond`, **fails the function closed.** Measured on a clean
     `migrate-clean` and after `rls-smoke`: no function has a refusal at level 0 or in its body, and none
     reaches `beyond`.
   - **What counts as naming** (C0-RT-2, Q0 F2 of the review round): an identifier token equal to
     `audit_logs` or `security_events` — or to a producer function's name — **whatever qualifies it or
     does not**. A bare `audit_logs` resolved through a function's own `set search_path = app` names
     the table (Q0 measured that form migrating clean). Matching the bare name over-selects a function
     that merely has a column or variable of that name; that fails closed, and such a function goes to
     the pinned lists below.
   - **(a) the producer set is exact.** The functions read whose definition names `audit_logs` or
     `security_events` are exactly the pinned producer set — the function names the coverage map gives
     in rows with `producer_path: "command"` — plus a **pinned reader list**, empty today, for a
     function or a view that reads an audit table and writes none (for example the ERD §9.1
     "security/admin safe view" when one is built; Q0 F7), added in a diff a reviewer reads. **Each
     function on the reader list is `STABLE` or `IMMUTABLE`** (`pg_proc.provolatile`), so "writes none"
     is held by PostgreSQL and not by review alone (Q0 R6 of the re-check): PostgreSQL refuses a write
     in a non-volatile function when it runs. Measured: a `STABLE` PL/pgSQL function inserting into
     `app.audit_logs` was created and, called, failed with "INSERT is not allowed in a non-volatile
     function"; a `STABLE` SQL-language one was created as well, so the refusal is at run time and the
     rule reads `provolatile`, not the body. A volatile function a reader calls is read by (a) on its
     own and is selected if it names an audit table; a view on the list is read by (f). Each producer is
     `SECURITY DEFINER`, owned by `app_command`, with `search_path=""` (`RFC-2026-019` §4/2), and none
     returns `trigger`; it is pinned in `SECURITY_DEFINER_FUNCTIONS` (`scripts/db/run.mjs`) in the same
     diff, so the SECURITY DEFINER probe and (a) agree. `140`'s apply-time probe that inserts into
     `app.audit_logs` from a `DO` block (`140_audit.sql:895`) is not in `pg_proc`, so it is not matched,
     which is why the rule reads the catalog and not migration text.
   - **(b) a producer is an entry point, never a callee.** No function read names a producer function
     **other than in its own header** (C0-RR-1, Q0 R1 of the re-check). `pg_get_functiondef` always
     begins `CREATE OR REPLACE FUNCTION <schema>.<name>(` (or `PROCEDURE`), so every producer's full
     definition names that producer; (b) as the review round worded it selected every producer by its
     own header, and the rule would have refused its first producer (measured by C0 and Q0, and here
     with a stand-in producer). (b) therefore skips the name tokens between the first `FUNCTION` or
     `PROCEDURE` keyword of level 0 and the `(` after them, and reads every other token: argument
     defaults, `SET` clauses, the body and every literal level. Reading `prosrc` instead was the other
     remedy offered; it would miss a producer called from an argument default and the whole of an
     SQL-standard body (empty `prosrc`), so the header is stripped instead. A producer that calls itself
     or another producer is still selected. No view names a producer ((f)) and no stored expression
     does ((g)). So no trigger, rule or expression reaches a producer, directly or through another
     function. The server tier reaches a producer by RPC (`RFC-2026-019` §4/2), and §8.1/6 holds who
     may.
   - **(c) no dynamic SQL** (C0-RT-3). No function read has an unquoted identifier token `execute` at
     any level of its definition as the lexer reads it. That is the token, not a statement: `RETURN
     QUERY EXECUTE` and `OPEN … FOR EXECUTE` do not start with it and are caught, and because
     `walkLevels` reads string literals as SQL, the word inside a message such as `raise exception
     '… execute …'` is caught too. Every such false positive goes to a pinned exemption list (fail
     closed), empty today, in a diff a reviewer reads, and each exemption is held to naming no audit
     table and no producer in what it executes. The lexer cannot see text computed at run time (its
     own header says so), so a name built in a string would pass (a) and (b); this rule is what keeps
     them decidable.
   - **(d) the triggers on the two audit tables are exactly `140`'s refusal triggers**, by name and
     function. This is already held by the pinned trigger probe (`scripts/db/run.mjs`,
     `PINNED_TABLE_TRIGGERS` and `PINNED_TRIGGER_PROBE_SQL`, since batch 126), which refuses any
     unpinned trigger on a table in `app` or `private` at `migrate-clean` (Q0 F4: a fourth trigger on
     `app.audit_logs` exits 2 there whatever this rule does). (d) restates it for these two tables and
     adds nothing the probe does not hold; its self-test asserts the probe's own message.
   - **(e) no trigger on any table, in any schema, runs a function that (a) or (b) selects** (A1 F2).
     The pinned trigger probe reads tables in `app` and `private` only; (e) reads `pg_trigger` whole.
   - **(f) no rewrite rule but a view's, and no view that names a producer** (A1 N2, Q0 R2 of the
     re-check). The rule reads `pg_rewrite` for every relation in the same `userObject` scope,
     extension members included. The only rule allowed is a view's or materialized view's `_RETURN`;
     every other rule, in any schema, is refused whatever its action names. A rule's action runs as its
     table's owner and rewrites a write before any trigger or policy sees it: A1 measured a `do also
     insert into app.audit_logs` rule on a table in `public` migrating clean and, when `app_command`
     inserted one row into that table, writing a `succeeded` audit row with a forged `actor_id` past
     the forced RLS — a database-side producer, which §3.1 says never exists, and which nothing in
     (a)-(e) read. The existing rewrite-rule probe (`scripts/db/run.mjs`, `REWRITE_RULE_PROBE_SQL`,
     since batch 126) refuses the same shape for relations in `app` and `private` only; the batch that
     lands this rule may widen that probe to `userObject` and cite it, as (d) cites the trigger probe.
     A view's `_RETURN` is read too, through `pg_get_ruledef`: one that names a producer is refused,
     because selecting from the view calls the producer; one that names an audit table is a reader and
     must be on (a)'s pinned reader list.
   - **(g) no stored expression names a producer.** A0 added this while writing (f); no reviewer raised
     it. A column default, a `CHECK` constraint, a policy expression, and an index expression or
     predicate run on a write or a read with no trigger, so one that calls a producer makes the
     producer a callee as surely as a trigger function does. The rule reads `pg_attrdef`,
     `pg_constraint` (`contype = 'c'`), `pg_policy` and `pg_index` in the same scope, tokenises each
     deparsed expression, and refuses any that names a producer. Measured: a column default calling a
     stand-in producer, on a table in `public`, migrated clean. A policy calling it was refused first at
     `migrate-clean` by the existing policy helper probe and policy set probe; (g)'s policy arm restates
     them, and its self-test asserts their message, as (d)'s does.

   **Drifts, each owed as a self-test of the rule, in the batch that lands the command half.** Each is
   applied to the working tree, measured red, and restored, and each self-test asserts **the rule's own
   refusal text**, not only a red exit (Q0 F4). The drifts for (a), (b), (c), (e), (f) and (g)'s
   non-policy arms are written **without a `create trigger` on a table in `app` or `private`**, because
   the pinned trigger probe refuses any such trigger first and a red exit would then show the probe,
   not the rule. They are:
   1. a `SECURITY INVOKER` trigger function in `app` inserting into `app.audit_logs` — (a), by name,
      asserting (a)'s own text (measured: `migrate-clean` exit 0, (a) selects it). **1b**, the same body
      made `SECURITY DEFINER`, is refused first at `migrate-clean` by the SECURITY DEFINER probe, "not a
      pinned SECURITY DEFINER function" (Q0 R3 of the re-check; measured again here, exit 2), so the
      self-test's drift also pins that function in `SECURITY_DEFINER_FUNCTIONS`; the probe then passes
      it and (a) is what refuses, by its own text. (That pinned form is not measured: it edits
      `run.mjs`, which this batch does not.) Without the pin, 1b asserts the probe's message, as drift
      8 does;
   2. the same function in `public`, and in a schema the drift creates — (a) (A1's prototype, Q0 X1);
   3. a function with `set search_path = app` naming `audit_logs` unqualified — (a) (Q0 X3);
   4. an SQL-standard (`BEGIN ATOMIC`) function inserting into `app.audit_logs`, created through
      `EXECUTE` in a `DO` block — (a), through the full definition (Q0 X2);
   5. a trigger function that calls a producer — (b). **5b, a control:** a catalog holding exactly one
      pinned producer and no caller is green under (a)-(g) — (b)'s header skip (C0-RR-1, Q0 R1;
      measured for (b) only, with a stand-in producer: the unstripped reading selects it, the stripped
      one does not. The stand-in was `SECURITY INVOKER`, since an unpinned `SECURITY DEFINER` one fails
      the SECURITY DEFINER probe first, so (a) refused its attributes, as it must);
   6. a producer that runs `execute 'insert into app.' || ...`, and a function with `return query
      execute` — (c);
   7. a trigger on a table in a schema the drift creates, running the function of drift 2 — (e);
   8. a fourth trigger on `app.audit_logs` — (d), asserting the pinned trigger probe's message;
   9. an invoker writer in `public` made a pgcrypto member by `ALTER EXTENSION … ADD FUNCTION` — (a),
      because members are read (A1 N1; measured: `migrate-clean` exit 0, selected);
   10. a `do also insert into app.audit_logs` rule on a table in `public` — (f); and a view in
       `public` selecting a producer — (f) (A1 N2, Q0 R2; measured: `migrate-clean` exit 0, both
       selected);
   11. a column default calling a producer — (g) (measured: exit 0, selected); a policy calling one —
       (g)'s policy arm, asserting the policy helper probe's message (measured: exit 2 there);
   12. a function on the pinned reader list made `VOLATILE` — (a)'s reader rule (Q0 R6; measured:
       selected);
   13. a function whose body has a literal that does not lex (an apostrophe in a message, a JSON
       literal) — a **control**, green (measured: three inner refusals, not refused); and a function
       stored with `check_function_bodies` off whose body itself does not lex — refused, fail closed
       (not measured).

   (The earliest wording — "no function body in migrations inserts into an audit table" — would have
   refused this RFC's own command producer; Q0's F1.) **What was run, and what it is not.** In batch
   rfc-text's review round A0 approximated (a)-(c) as then revised with a regular expression over
   `pg_get_functiondef` on a scratch cluster: on a clean `migrate-clean` it selected nothing, out of
   **14** functions in scope after `migrate-clean` (`app` 9, `private` 4, `auth` 1; the 36 in
   `extensions` are extension members, which that text did not read). The earlier text said 18, which
   is the count after `rls-smoke` adds its four `private.as_*` helpers (C0-RR-4, A1 N4, Q0 R4 of the
   re-check). With drifts 2 (`public`), 3 and 4 and a `return query execute` function appended to
   `140`, it selected all three under (a) and the fourth under (c), where (a) as merged selected none
   of the three. In batch rfc-026-static-rule A0 applied the rule as revised here to a scratch
   cluster's catalog with the repository's lexer (`walkLevels` over `pg_get_functiondef`,
   `pg_get_ruledef` and the deparsed expressions; a private script, not the rule and not its
   self-test). On a clean `migrate-clean` it read 50 functions (the 14, plus the 36 extension
   members), no rule and 715 stored expressions, and selected nothing under (a)-(g); after `rls-smoke`
   it read 54 and selected nothing. With drifts 1, 5 and its control, 9, 10, 11 (the default), 12 and
   13's control appended to `140`, plus an unpinned `STABLE` function that inserts, `migrate-clean`
   exited 0 and each part selected its drift and no other object: (a) the invoker writer, the extension
   member and the unpinned `STABLE` writer, and the stand-in producer's attributes; the reader rule the
   volatile reader; (b) the caller only; (f) the rule and the producer view; (g) the default; drift 13's
   control nothing. The review round's reading would have selected none of drifts 9, 10 and 11, by its
   scope, and would have selected the stand-in producer under (b), measured.
2. **Exactly two policies on each audit table**, one `TO app_worker`, one `TO app_command`, all
   `FOR INSERT`, each `WITH CHECK` pinned as a literal the way `RFC-2026-020` §6.1/5 pins `app_authz`'s:
   §3.2's and §3.3's on `app.audit_logs`, §3.7's two on `app.security_events`. Each lands with its half
   (§9).
3. **Grants:** `app_command` holds `INSERT` on each audit table and nothing else on either;
   `app_worker`'s existing `SELECT` is reviewed (the producer needs none) and either justified or
   revoked; no other role gains anything. `EXECUTE` on `app.jwt_subject()` is held by `app_command`
   alone; `EXECUTE` on `app.is_active_member(uuid)` by `authenticated` and `app_command` and nobody
   else.
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

Cases 6-20 are on `app.audit_logs`; case 21 holds §3.7's two policies on `app.security_events`. Each
case is owed by the batch that lands the half it exercises.

6. Command, succeeded: as an acting user who can reach the target, the command changes the row and
   exactly one audit row exists with that actor, that scope (copied, §3.6) and `succeeded`.
7. **Atomicity, on every landed command:** for each command function the batch lands, the test (as
   owner, inside the case's transaction) makes the audit `INSERT` fail at the table — an added CHECK
   or restrictive policy the `succeeded` row violates — then calls the command. The action's change is
   absent afterwards, and the caller receives an error, not a typed `denied` result. A test stub is not
   enough: it proves PostgreSQL's transaction semantics, not that the landed producer writes in the
   action's transaction (Q0's F6). Without this case §3.4's central claim is a sentence. This injection
   refuses every row, `denied` included, so it does **not** stand in for case 16 (Q0R-F1).
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
16. **An audit-write refusal is not a user denial** (§3.4), with the refusal injected so that a
    function recording denials wrongly fails the case (Q0R-F1). For each landed command function, as
    owner inside the case's transaction, add a restrictive policy on `app.audit_logs`,
    `for insert to app_command with check (outcome <> 'succeeded')`: it refuses the `succeeded` row
    with `42501`, the SQLSTATE a handler catching `insufficient_privilege` would swallow, and admits a
    `denied` row. Then call the command on an action the acting user may perform, and assert: the call
    **raises** `42501` (it does not return a typed `denied` result), the action's change is absent, and
    **no** audit row exists for the call's `request_id`. **Control, same injection:** call the command
    on an action it refuses; it returns its typed `denied` result and exactly one `denied` row exists —
    so the injection is shown to admit the row a wrong function would write. **Self-test, in the batch
    that lands the first command:** a copy of the command with the `succeeded` `INSERT` moved inside the
    exception block and a handler catching `insufficient_privilege` fails this case (Q0 measured that
    shape returning `denied` with one `denied` row under this injection). Two injections are named as
    **not** acceptable, because the wrong function passes them: `with check (false)` (it refuses the
    handler's `denied` row too, so both functions raise) and case 7's CHECK (`23514`, which the handler
    does not catch).
17. **Scope is copied from the row, not taken from the inputs** (§3.6): where a command's signature
    admits a business or page argument, a call whose argument names a business or page different from
    the changed row's records the row's scope; where no signature admits one, a static rule on the
    function body (scope columns sourced from `RETURNING`) stands in for it (Q0's F7). Where a page
    argument is admitted, the case includes a member narrowed by a `business` scope calling with its
    covered business and **another tenant's page**: the policy admits that row (§3.3/3, A1's G7), so
    only the copy holds it, and the case asserts the recorded page is the changed row's (A1 F3).
18. **A refusal row names no scope:** with the acting user an active, unnarrowed member of its own
    workspace W, a command writing `denied` in W with `business_profile_id` set — to a business of W,
    and to another tenant's — is refused by the policy (`deniedBy: 'rls'`); the same with only
    `page_context_profile_id` set is refused; the same row with both null is admitted (A1's F4-a, case
    D-H, inverted; the earlier wording of this case, with another tenant's `workspace_id`, would have
    passed with the gap open).
19. **Every command row needs membership** (Q-026-1): as an authenticated user, a `denied` row and a
    `failed` row with `workspace_id` set to another tenant's workspace, and to a `uuid` no workspace
    has, are each refused by the policy (`deniedBy: 'rls'`); the same rows in a workspace the user is
    an active member of are admitted. A suspended member's own workspace is refused. Once
    `RFC-2026-027` lands, a workspace of the user's in each blocked state is refused too.
20. **The page form is called** (C0-9, A1 F4-a): with the acting user narrowed by a scope row to one
    page of business B in its own workspace, a `succeeded` row naming B and a page of B outside that
    scope is refused by the policy; naming B and the page in scope is admitted; naming a page with
    `business_profile_id` null is refused. Under the earlier literal, which called the business form
    alone, the first row was admitted.
21. **`app.security_events`** (§3.7): as `app_worker` with `app.workspace_id` set, an unattributed
    event and a `system_actor` event in that workspace are admitted, a `user`-attributed event is
    refused, an event naming another workspace is refused, and with `app.workspace_id` unset the event
    is refused, and not by `42704` or `22P02` (case 12's arm, for this table's confinement term; Q0
    F6); as `app_command`, an event attributed to
    the acting user in a workspace it is an active member of is admitted, and one naming another actor,
    no actor, or another tenant's workspace is refused. With either policy dropped its admitted half
    fails (the negative control of case 14, for this table).

## 9. Migrations this implies later (none in this batch)

In batch `141`'s range, A0's per the registry, each a forward migration and never an edit to `140`:

1. **Command half** (after `RFC-2026-023` is approved, with or after its first command function; not
   after the worker RFC, as Q-026-6 was answered): `grant insert on app.audit_logs to app_command` and
   the `TO app_command` policy of §3.3; `grant insert on app.security_events to app_command` and §3.7's
   command policy; `grant execute on function app.jwt_subject() to app_command` and on
   `app.is_active_member(uuid)`; an apply-time block asserting §8.1/2-3 and §8.1/6 for the command
   half.
2. **Worker half** (after `DATA-DEC-03` and `RFC-2026-022` §7): the `TO app_worker` policies of §3.2 on
   `app.audit_logs` and §3.7 on `app.security_events`; `private.as_service()` gains its workspace
   argument (`RFC-2026-022` §8); the review of `app_worker`'s `SELECT`.
3. **Per audited action**, in the batch that lands its command or job: the revocation §5.5 requires.
   The first one is already done ahead of its command: batch 170's
   `170_workspace_lifecycle_not_client_writable.sql` revoked the client `UPDATE` of
   `app.workspaces.lifecycle_state` (Q-026-5, answered *revoke*); the §11.4 closing command lands with
   nothing to revoke for that column.
4. **Lint, in the same diffs:** `audit-coverage-map.json`'s `producer_path`; the two
   `service-policy-map.json` rows re-confirmed, the map's producer field added (§4, Q-026-7) and its
   denial wording at `:138` re-confirmed against §3.3/4; the `roleScopedCompleteness` question of §4;
   §8.1/1's catalog rule and its drifts, and `scripts/db/psql-driver.mjs` refusing `BEGIN ATOMIC` at
   every nesting level it reads, not the top level only (Q0 F1 of batch rfc-text's review; §8.1/1
   reads the full definition either way); `REWRITE_RULE_PROBE_SQL` widened to `userObject` if §8.1/1
   (f) is held through it rather than by the rule's own read; `superseded.json` entries for any earlier apply-time block the
   new policies make false (`140`'s blocks assert "no service policy"; the post-migrate pass will say
   which).

## 10. Questions this RFC raised, and the Owner's answers

The table keeps each question as it was asked. Q-026-1..9 were answered on 2026-10-04 as A0 recommended
(§10.1); each answer is folded into the text above, except the second half of Q-026-1's recommendation,
which conflicts with Q-026-9's and is re-opened as **Q-026-10**, raised in batch rfc-text's review round
(C0-RT-1, A1 F1) and **unanswered**; its row carries A0's recommendation (batch rfc-026-static-rule),
marked as a recommendation and not an answer. Where a question names a role other than the Owner,
that role's own acceptance of the answer is still owed (`open_blockers[195]`).

| id | for | question |
|---|---|---|
| Q-026-1 | A1 | **To be answered before approval** (answered: §10.1). Under the earlier §3.3/3 any authenticated client, through a command written correctly to §3.4, can append undeletable `denied`/`failed` rows attributed to itself into any `workspace_id` — another tenant's, or one that does not exist (measured on A1's prototype). Either (a) every `app.audit_logs` row from a command requires the acting user's active membership (or the workspace's existence through a definer helper), and a refusal about a workspace the user cannot reach is recorded elsewhere — a `security_events` row in a scope the actor can reach, which depends on Q-026-9 — or not recorded, beside Q-026-4; or (b) the arm stays, and this RFC states the cross-tenant append and the volume bound (a server-tier rate limit) that makes it acceptable. `service-policy-map.json:138`'s denial wording is re-confirmed either way. |
| Q-026-2 | A1 | Does §3.6 (scope copied from the changed row; denial rows carry no business or page unless validated) discharge `open_blockers[191]` (6) and `[32]`, or is a policy-side check still owed? |
| Q-026-3 | A1, A6 | `occurred_at` for a worker projecting an external event (a provider's publish confirmation, a payment webhook): the projection's time or the provider's? `CTR-AUD-001` does not say. |
| Q-026-4 | A1 | Refusals that never reach a producer — RLS refusals of direct client statements, authentication failures, platform-scope events (`open_blockers[191]` (7)) — are unrecorded under B. Is that accepted until G1, or does SEC-014 need a producer before then? The same question covers a recorded denial lost because the client controls the transaction's end (§3.4); if accepted, the deployment pins the request tier so a client cannot ask for a rollback, when that configuration exists. |
| Q-026-5 | Owner, A1 | Until the §11.4 closing command exists, an owner can change `lifecycle_state` directly and unaudited, and under `RFC-2026-027` that includes setting `access_blocked`. Measured by C0, A1 and Q0 on `e64e1f5`: an `UPDATE` that reads a column (`WHERE id = …`, `RETURNING id`, a `CASE` in `SET`, the PostgREST-shaped CTE) is refused (`42501`) for the six blocked states, and an `UPDATE` that reads none (no `WHERE`, or `where true`, and no `RETURNING` of a column — `returning 1` reads none) moves **every** active or closing workspace the caller owns to any of the eight states, and nothing the caller does not own; the owner cannot move it back. Revoke the client `UPDATE` of `lifecycle_state` now (no command yet, so nobody can close a workspace), or accept the gap until the command lands? The revoke needs nothing either RFC decides (`open_blockers[195]`). |
| Q-026-6 | Owner | May the command half land with `RFC-2026-023`'s first command function, before the worker RFC? The Owner's words say no audit migration lands before the worker RFC; this asks whether that was meant for both halves. |
| Q-026-7 | A0, A1 | `service-policy-map.json` cannot key two producers on one `(table, operation)` (§4). Add a producer field, or keep command-path policies out of the map? |
| Q-026-8 | A6 | `actor` for a worker acting on a user's job: the job's `tenant_context.actor` (the user) or a `system_actor`? The contract permits both and SEC-009's "names its actor" reads either way. |
| Q-026-9 | A1 (owner of batch `140`), A0 | `app.security_events` (§3.7): which producers write it, and under which predicates written on its own columns? It has no `causation_id`, so the worker's cell predicate is open — a forward migration adding a cause column, a rule such as `actor_kind is null or actor_kind = 'system_actor'`, or no worker writer; and whether a command writes there, under which workspace term (Q-026-1 (a) depends on it). Until answered, it has no writer. |
| Q-026-10 | A1 (owner of Q-026-4 and of batch `140`), Owner | **UNANSWERED; raised 2026-10-05 in batch rfc-text's review round** (C0-RT-1, A1 F1). The recommendation accepted for Q-026-1 routes a refusal about a workspace the acting user cannot reach (another tenant's, or a `workspace_id` no workspace has) to `app.security_events` once Q-026-9 gives it a producer; the recommendation accepted for Q-026-9 gives the command a producer there only in a workspace the actor is an active member of. The two conflict, and the text now holds that refusal as unrecorded — A0's reconciliation, not an answer. Which: (i) the command writes a `security_events` row in a workspace the actor *can* reach, with an §8.2 case — §3.7's command policy admits the row, but **`app.security_events` has no column for the attempted workspace id** (C0-RR-2, A1 N3 of batch rfc-text's re-check; `140_audit.sql:583-617`), so naming it costs a forward migration adding one (a store change in batch `140`'s range, A1's, classified under ERD §9.1, against Q-026-9's accepted "no store change before G1") or the id written into `event_type` as 32 hex digits (admitted by its CHECK, a misuse of its grammar); without either the row records that an attempt happened, not where, and an actor who is an active member of no workspace gets no row; (ii) a platform-scope store (`open_blockers[191]` (7)), also a store change; or (iii) accept the gap explicitly, as a class beside Q-026-4's, with SEC-014's producer owed before Paid Beta? **A0's recommendation — a recommendation, NOT an answer; added 2026-10-05 in batch rfc-026-static-rule — is (iii):** it needs no store change before G1, which matches Q-026-9's accepted "no store change before G1"; (i) needs a store change or a misuse of `event_type` and still leaves an actor with no reachable workspace unrecorded, and (ii) is a store change too. What (iii) costs: an acting user who names another tenant's workspace, or one that does not exist, is refused by the membership term and changes nothing, but the attempt leaves no row in this database until SEC-014's producer exists — a loss of detection, not of isolation. **Q-026-10 stays UNANSWERED** until A1 and the Owner answer it. |

### 10.1 Decisions taken by the Owner's answers

The Owner's words, verbatim: `ลุยต่อเลย เอาตามแนะนำ` ("Carry on, take the recommendations"), 2026-10-04,
read by A0 as accepting the recommendation current at the merge of batch rfc-026-027
(`product-owner-disposition-2026-10-03-batch-rfc-026-027.md` §5, §7 and §8). The Owner had not seen
the per-question text when writing; that reading is A0's and the Owner may correct it. **None of this
approves the RFC.**

| id | answer, as A0 recommended | where it is now the design | acceptance still owed |
|---|---|---|---|
| Q-026-1 | **Superseded recommendation, option (a), first half:** the acting user's active membership is required for every command row in `app.audit_logs`, so no client writes into another tenant's log. **Second half not taken:** the recommendation routed a refusal about a workspace the user cannot reach to `app.security_events` once Q-026-9 gave it a producer; Q-026-9's accepted predicate admits no such row, so the two conflict. The earlier text of this row recorded "not recorded, beside Q-026-4" as the Owner's answer; that was A0's reconciliation, not the Owner's, and it is re-opened as Q-026-10 (C0-RT-1, A1 F1) | §3.3's literal (`app.is_active_member(workspace_id)`), §3.3/2 and /4, §8.2/19; the second half: §3.3/4, §3.7, Q-026-10 | A1; Q-026-10: A1 and the Owner |
| Q-026-2 | **Yes on the producer side, no on the policy side:** copying scope from the changed row discharges `open_blockers[191]` (6) and `[32]` for the producer; a policy-side check of the scope relation stays owed with `[32]`'s missing foreign key | §3.6, §3.3/3 | A1 |
| Q-026-3 | **Projection time** in `occurred_at`; the provider's time stays in the event's own payload | §3.5 | A1, A6 |
| Q-026-4 | **Accepted until G1 as a recorded gap:** refusals that never reach a producer and denial rows lost to a client-controlled rollback; SEC-014's producer for them is owed before Paid Beta. The earlier text of this row added "refusals about a workspace the user cannot reach", a class the accepted answer did not name (they reach a producer); that class is Q-026-10's, not this answer's (A1 F1) | §3.4 | A1 |
| Q-026-5 | **Revoke** the client `UPDATE` of `workspaces.lifecycle_state` — **done**, by batch 170's `170_workspace_lifecycle_not_client_writable.sql` (merged) | §2/5, §5.5, §9/3 | A1 |
| Q-026-6 | **Yes:** the command half may land with `RFC-2026-023`'s first command function, before the worker RFC; the Owner's "no audit migration before the worker RFC" binds the worker half only | §6/3, §9/1 | (the Owner's own question) |
| Q-026-7 | **Add a producer field** to `service-policy-map.json` | §4, §9/4 | A0, A1 (with `open_blockers[191]` (2)) |
| Q-026-8 | **The job's `tenant_context.actor`** (the user who started it); `system_actor` only for a sweep no user started | §3.5 | A6 |
| Q-026-9 | **No store change before G1.** The worker writes only unattributed or `system_actor` events (`actor_kind is null or actor_kind = 'system_actor'`, plus the confinement term); the command writes only for its own actor, in a workspace it is an active member of | §3.7, §8.1/2-3, §8.2/21, §9/1-2 | A1 (owner of batch `140`), A0 |

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
  the refusal-row scope gap (now closed by §3.3/4: a refusal row names no scope), the SQLSTATE overlap (§3.4) and fail-closed
  atomicity. It is evidence for this text, not the execution `RFC-2026-020` §6.2 requires of the batch
  that lands it, and the revised policy of §3.3 has not been executed.
- **The actor binding's residual** (§3.3/1): a session that can set `request.jwt.claims` and execute a
  command function writes as any user. §8.1/6 confines `EXECUTE` to `authenticated`; what remains is
  a `SECURITY DEFINER` function that rewrites the claims before it writes, which only review catches.
- **Batch rfc-text (2026-10-04) changed the text, and executed nothing.** The literal of §3.3, the two
  policies of §3.7, the catalog rule of §8.1/1 and cases 16 and 18-21 are written from the review
  rounds' measurements and the Owner's answers; none has run on a cluster. The membership term reuses
  `011`'s `app.is_active_member`, which exists; `RFC-2026-023`'s two helpers do not exist yet.
- **Batch rfc-text's review round (2026-10-05) corrected the text** on C0's, A1's and Q0's findings and
  executed none of its SQL. A1 had prototyped §3.3's literal and §3.7's command policy with stand-in
  helpers (rolled back); Q0 had measured §8.1/1's reach with drifts appended to `140`; A0 re-ran four of
  those drift shapes and approximated §8.1/1 as revised with a regular expression, not the lexer
  (§8.1/1, last paragraph). The rule itself does not exist, and its approximation is not its
  self-test.
- **Batch rfc-026-static-rule (2026-10-05) corrected §8.1/1 and Q-026-10's text** on the re-checks of
  batch rfc-text's review round (C0-RR-1..5, A1 N1..N5, Q0 R1..R6) and executed none of the RFC's SQL.
  A0 applied §8.1/1 as revised to a scratch cluster's catalog with the repository's lexer and appended
  its drifts to `140` (§8.1/1, last paragraph): that is a prototype in a private script, not the rule,
  and not the self-tests the landing batch owes. Part (g) is A0's own addition, not a reviewer's
  finding, and is the part a reviewer should read first. The recommendation on Q-026-10 is A0's and is
  the option that asks the least of the proposer's own batch (no store change), which should be
  weighed as such.
- No migration, policy, grant, lint file, test or work-package field other than the writable path that
  lets this file exist was changed to write it.

## Rollback

Delete this file and its writable-path entry. Nothing depends on it: no migration, policy or lint file
cites it, and the coverage map still says `UNDECIDED`. If its §9 migrations have landed, each is
reverted by a forward migration that drops the two producers' policies and grants, which returns the
store to `140`'s state — no writer, every role refused — strictly narrower and still passing.
