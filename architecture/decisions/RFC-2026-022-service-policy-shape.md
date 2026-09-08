# RFC-2026-022 — What a service policy is, now that one `S` cell carries its tenant and another discovers it

Status: **Proposed** 2026-09-08 by `/claude/a1_bastion` (A1 Security) — `RFC-2026-016` §2's workspace-GUC scoping SURVIVES NARROWED for the `S` cells whose statement CARRIES its workspace, is DELETED for the cells whose statement DISCOVERS it, and is downgraded everywhere from a boundary to a defect-containment invariant, because the role the policy names can set the setting the policy reads; a queue claim is not an RLS-shaped problem and gets no policy at all, permanently rather than pending, and is performed instead through a `SECURITY DEFINER` broker owned by a fifth role that is not a path. The decision is **NOT IN EFFECT** until §7 holds — including §7.3's four claims, which must be discharged by EXECUTION and never by citation, and including a reachable service identity that `RFC-2026-019` §4/3 deliberately did not create.
Date: 2026-09-08
Author: `/claude/a1_bastion` (A1 Security), the security co-owner `RFC-2026-012` names and `DATA-DEC-03`'s co-owner
Reviewer sought: `/claude/a0_atlas` (A0), who owns `RFC-2026-016`, `RFC-2026-017` and `scripts/db/run.mjs`, and who owns batches `050` and `140` — both of which dispatched this question here
Depends on: `RFC-2026-016` (approved 2026-09-05) §2 for the shape under review and §4 for `FORCE`, the exemption register and *"a bypass is a policy on a named role, never a role attribute"*; `RFC-2026-017` (approved) §3 for the role purposes; `RFC-2026-019` (approved) §4/3 for `app_worker`'s connection method being open and §5 for a decision expressed as a negative; `RFC-2026-020` (approved) §5 for the not-a-path role pattern and §6.2 for the execute-don't-cite rule; `RFC-2026-021` (approved) §8 for a registry read in both directions; `RFC-2026-012` (approved) §4 for the command surface
Measurements: `evidence/WP-0A-DB-00/a1-rfc-022-measurements-2026-09-08.md`

---

## 1. What is open, and why it is being reopened now

`RFC-2026-016` §2, quoted rather than summarised:

> Amend §8.5: a policy is `TO authenticated` for user paths **and `TO <service role>` for each
> operation the matrix already marks `S`**, with the service policy scoped by a server-set workspace
> GUC derived from the server-resolved tenant context `CTR-TEN-001` already requires.
>
> **This introduces no new permission.** Every `S` cell already says the service may perform that
> operation. The amendment only makes it expressible without a bypass.

That shape has now met the schema twice, in two batches written in parallel, and the two reports do
not agree — which is the useful part.

**Batch `050` (merged), `db/foundation/migrations/050_async_kernel.sql`, on the queue:**

> §3.4 specifies how a worker takes work: "Worker claim ใช้ lease + `FOR UPDATE SKIP LOCKED` หรือ
> queue semantics ที่เทียบเท่า". A claim query asks for THE NEXT DUE JOB, and it cannot name a
> workspace, because which workspace the next job belongs to is what reading the row tells you. A
> policy scoped by a single workspace GUC therefore either refuses every claim, or forces a worker to
> poll workspace by workspace — which is not a queue.
>
> RFC-2026-016 §2 is not wrong; it was written about the OTHER `S` cells, where the worker already
> holds the tenant context because it is acting on a known row […] That is a finding about an
> approved decision, produced by trying to implement it, and it is A0's and A1's to dispose of.

**Batch `140` (merged), `db/foundation/migrations/140_audit.sql`, on the audit insert:**

> That GUC does not exist. It has no name, no setter and no contract […] There are exactly two ways
> to write the policy today and both are refused: NAME THE GUC HERE […] or WRITE `with check (true)`.
> That is a service policy with no scope at all […] **The finding generalises beyond this batch […]:
> until that GUC exists, NO `S` cell anywhere in §8.2–§8.4 can be implemented by any batch — 050,
> 061, 070 and 120 all inherit it.**

And the work package records the pairing:

> 050 found that RFC-2026-016 §2's service-policy shape (a server-set workspace GUC) CANNOT work for
> a queue, because a claim query cannot name the workspace it is about. An audit table is the case
> where that shape might work. **Two `S` cells are therefore two pieces of evidence about the same
> open decision rather than one cell counted twice.**

So this RFC has two witnesses, not one, and they point in different directions. §8.2–§8.4 contain
**nine** `S` cells; every one of them is denied today, and the denial is deliberate and asserted:
`app_worker` holds grants and no policy on every table in `050`, `060`, `130` and `140`, so a service
refusal is attributable to row level security rather than to a forgotten `GRANT`.

Five things are open and this RFC settles all five: whether §2's GUC scoping **survives**; what a
policy can constrain **on a claim**; how a session **becomes** a service role at all; what the GUC is
**called** and who may **set** it; and what §2's own text should **become**.

---

## 2. What was measured

Full queries and outputs are in the evidence file. All read-only, 2026-09-08, PostgreSQL 17.6,
instance `xtvtflkntpqfvflvdbwk`. **Ten batches are declared `not_applied_to_this_instance`** —
`011`, `020`, `021`, `030`, `040`, `041`, `050`, `060`, `130`, `140` — so **no probe touched
`app.jobs`, `app.audit_logs`, or any policy naming a service role, because none of those objects
exist here.** Every mechanism claim is built from batch `010`'s five tables and the platform catalog,
and the claims that would have needed an absent object are in §7.3 rather than in this argument.

**M2 — the measurement that decides this RFC. The role the policy would name sets the setting the
policy would read, and can change it mid-transaction.**

```
set local role app_worker;
 running_as | catalog_says_may_set | set_succeeded | now_reads     | reset_to_another_tenant
 app_worker | false                | 2222…-2222    | 2222…-2222    | 3333…-3333
```

`app_worker` set `app.workspace_id` to one tenant and then to another, in one transaction, while
`has_parameter_privilege(current_user,'app.workspace_id','SET')` reported **false**. A custom
placeholder is not a registered parameter, so the privilege system does not govern it: `SET`
succeeds and the catalog cannot be asked who may do it. `pg_parameter_acl` holds exactly one row
(`log_min_messages`, granted by `supabase_admin`), and `postgres` — the role our migrations run as —
is **not** a superuser here, so nothing this repository executes could add one.

**M3 — the identity GUC is forgeable the same way, and is a control only because the client cannot
issue SQL.** As `authenticated`, choosing a subject in `request.jwt.claims` returned that subject's
membership row. The request path is safe because *PostgREST* issues the statement. The worker path
has no equivalent gap-closer: **the worker is the statement issuer.** That asymmetry, not the
mechanism, is why the same technique is a control on one path and a convention on the other.

**M4 — an unset custom GUC has two different absences, and only one spelling denies in both.**
`current_setting('app.never_set')` raises `42704`; the two-argument form returns NULL; a
defined-then-reset placeholder returns `''` (length 0, not null); and `''::uuid` raises `22P02`.

| spelling | never defined | defined then reset |
|---|---|---|
| `current_setting('app.workspace_id')::uuid` | raises `42704` | raises `22P02` |
| `current_setting('app.workspace_id', true)::uuid` | denies | raises `22P02` |
| `nullif(current_setting('app.workspace_id', true), '')::uuid` | **denies** | **denies** |

A deny-by-default policy in either of the first two spellings **fails open into an error**, which a
caller retries and an operator reads as an outage rather than as a refusal. Corroboration from the
platform: Supabase's own `auth.uid()` body, read out of a plan, contains `NULLIF(…, '')` twice.

**M5 — the pinned form is evaluated once and reaches an index.**
`where workspace_id = (select nullif(current_setting('app.workspace_id', true), '')::uuid)` planned
as `InitPlan 1` feeding a `Bitmap Index Scan on workspace_members_workspace_keyset_idx`. The
`(select …)` wrapper is the same habit batch `010` already uses for `(select auth.uid())`.

**M6 — with no policy, a claim query returns zero rows silently, not an error.** As `app_worker` on
`app.workspace_members` (grants present, `FORCE` on, no policy naming it):
`select … for update skip locked` planned `LockRows → Result → One-Time Filter: false`. Batch `050`'s
*"refuses every claim"*, executed in its no-policy limit — and the RLS qualifier is applied **beneath**
the `LockRows` node, so row security decides the claim before any row is locked.

**M7 — `SELECT … FOR UPDATE` applies the UPDATE policy's `USING` in addition to the SELECT
policy's.** On `app.workspaces`, which carries both, the plain plan has one membership subplan and
the `for update skip locked` plan has **two, ANDed**, the extra one carrying
`Filter: (m.role = 'owner')` — the UPDATE policy. **A lease claim therefore needs two policies, not
one**, and a table with only a SELECT policy silently returns fewer rows: the claim finds nothing and
looks like an empty queue.

**M8 — `FOR UPDATE` needs an UPDATE privilege, and a column-scoped one is enough.** Without any:
`42501 permission denied for table workspace_members / HINT: GRANT UPDATE ON …`. With
`UPDATE (name, lifecycle_state, updated_by)` and no table-level bit, the same statement planned. So
batch `050`'s column-scoped update grant on `app.jobs` does **not** block a claim at the grant layer;
the refusal there is row security, which is what `050` built and what its negative control rests on.

**M9 — `app_worker` is reachable today only from a role that bypasses RLS.** `pg_auth_members`:
`app_worker`, `app_command` and `app_maintenance` are granted to `postgres` and to nothing else;
`authenticator` is a member of `anon`, `authenticated`, `service_role` and of none of the three
(`RFC-2026-019` §4/1, measured true today). `postgres` holds `rolbypassrls`. **A policy `TO
app_worker` written now is reachable only through an identity for which it is moot.**

**M10 — all ten policies on the instance name `authenticated`; none names a service role.** So
`roleScopedCompleteness` in `scripts/db/run.mjs` passes vacuously today, and **the first policy
naming `app_worker` will require a row in `db/foundation/lint/rls-exemption-register.json`** with a
reason, an owner and a review date. It also means no probe here could exercise a *policy* predicate
that reads a workspace setting; M4 and M5 measure it as a *query* predicate, and the policy-predicate
claim is in §7.3.

---

## 3. The test that sorts the cells, written so a later batch applies it without asking

`050` and `140` disagree because the cells differ in one respect, and it is a property of the
**statement**, not of the table, the family or the role.

> **Where does the statement get the workspace it acts on?**
>
> * **CARRIED** — the workspace is an **input**: it appears in the statement's `VALUES` or `SET`
>   list, or as a parameter in its `WHERE`, because the server resolved it before forming the
>   statement. A policy may compare it against the confinement setting.
> * **DISCOVERED** — the workspace is an **output**: the statement's row-selection predicate contains
>   no workspace term, because *which* workspace is what the statement returns.

**Operational form, so no reviewer has to read intent.** Write the statement. Then add
`and workspace_id = (select nullif(current_setting('app.workspace_id', true), '')::uuid)` to its
`WHERE` (or its `WITH CHECK`).

* If the statement still addresses **the same work**, the cell is **CARRIED**.
* If the added term **changes what the work is** — "the next due job" becomes "the next due job in
  one named workspace", "the unprocessed webhook" becomes "the unprocessed webhook of a tenant I
  already knew" — the cell is **DISCOVERED**.

That is decidable from statement text alone. Applying it to §8.2–§8.4's nine `S` cells, as a
proposal a reviewer can disagree with **before** it is a policy:

| §8 cell | batch (§6 registry) | class | why |
|---|---|---|---|
| Audit/security INSERT | `140` | CARRIED | the row being written names its workspace |
| Research run/source/evidence INSERT | `070` | CARRIED | the run is started for a known workspace |
| Publish delivery/post/metric INSERT | `120`, `121` | CARRIED | the delivery is against a known target |
| Notification insert/delivery state | `051` | CARRIED | recipient and workspace are inputs |
| Usage ledger INSERT (`S/N`) | `061` | CARRIED | a reservation is made against a known quota |
| Security event details SELECT | `140` | CARRIED, **with a caveat** — see below |
| Internal job/attempt/DLQ payload (**claim**) | `050` | **DISCOVERED** | `for update skip locked` on the next due row |
| Raw token/webhook SELECT | `110`, `131` | **DISCOVERED** | an inbox row arrives from the provider; the workspace is what reading it resolves |
| Asset hard purge | `100`, `160` | **BOTH** — see below |

**Two of these rows are the reason the register must be data rather than prose.**

*Asset hard purge is both.* Driven by §11.4's workspace closure it is CARRIED — the workspace is the
subject of the whole operation. Driven by a retention sweep it is DISCOVERED — the sweep selects by
age across tenants and learns the workspace from the row. **A cell may have both shapes**, because
the class attaches to the statement. So a table may need a CARRIED policy *and* a DISCOVERED broker,
and the register keys on `(cell, statement)`, never on the table alone.

*Security event details is CARRIED only for the reading §8.4 actually contains.* The matrix gives
that cell `P` to the owner and `S` to the service, both of which name a workspace. A platform-wide
investigation read would be DISCOVERED — and batch `140` already recorded that a platform-scope
record has no home in this schema, quoting `CTR-AUD-001`'s own boundary. So the classification is
honest for the cell as written and says nothing about a capability nobody has specified.

---

## 4. Options

For each: what it makes true, what it costs, and what it makes unfalsifiable if chosen badly.

### A. Keep §2 as written and apply it to all nine cells

*Makes true:* one rule, no new document, no new vocabulary. `140`'s cell becomes implementable the
day a GUC is named, and its blocker's expectation — that two isolation cases flip — is met exactly.

*Costs:* `050`'s finding stands unanswered. The queue either refuses every claim (M6, executed) or
becomes per-tenant polling, and eight batches — `051`, `061`, `070`, `080`, `100`, `110`, `120`,
`131` — inherit a shape that cannot be implemented for the family they depend on. M7 adds a cost §2
never contemplated: the claim needs **two** policies, so the tenant term would have to be wrong in
neither.

*Makes unfalsifiable:* the sentence *"the service path is tenant-scoped"*. M2 measures that the
service sets the scope itself, so any isolation case asserting service tenant-isolation on the
strength of the GUC asserts a control nobody has — and it would pass, because the test harness sets
the GUC honestly. That is precisely the defect `RFC-2026-016` §5 found in the data package's own
smoke set: *"a service path that succeeds because it holds `BYPASSRLS` is indistinguishable from one
that succeeds because a policy admitted it."* Here it would be a service path that is confined
because the test confined it.

### B. Drop the GUC; service policies are `TO app_worker USING (true) / WITH CHECK (true)`

*Makes true:* all nine cells implementable immediately, nothing invented, no name to review, no
dependency on a worker that does not exist. It is also, uncomfortably, no weaker than A against a
hostile worker — M2 says so.

*Costs:* it is the unscoped service permission §2's own *"introduces no new permission"* forbids, and
`140` refused it in those words. One `USING (true)` policy per table for one role is `BYPASSRLS`
written out longhand — the substance `RFC-2026-016` §4 rejected when it said a bypass must be *"a
policy on a named role"* precisely so it could be **narrowed**, and this narrows nothing.

*Makes unfalsifiable:* every isolation case about the service path at once. `service-sees-zero-*`
becomes `service-sees-everything`, and the negative control that would notice a service role
acquiring `BYPASSRLS` loses its subject: with `USING (true)` the two states are identical in every
observable. This is the option that destroys a control rather than failing to add one.

### C. GUC everywhere, and the queue polls workspace by workspace

*Makes true:* one rule, and the queue is technically implementable rather than refused.

*Costs:* a claim becomes N statements per poll; fair scheduling across tenants moves into the worker;
and **the workspace list itself is a DISCOVERED read** — the worker must learn which workspaces exist
before it can poll them, from a table it has no policy on. The problem recurses one level up and the
recursion has no base case.

*Makes unfalsifiable:* nothing structural, and it is worth saying so — C's failure is that it is a
throughput decision made silently. Queue latency becomes a function of tenant count, and no artefact
in this repository would record that anyone chose that.

### D. GUC for CARRIED cells; the queue gets a policy predicated on **claimability** rather than on tenant

Shape: `TO app_worker using (available_at <= now() and lease_expires_at is null and attempt <
max_attempts …)`. **The strongest alternative, and the one this RFC came closest to proposing**,
because it is the only option that keeps every `S` cell inside the policy system.

*Makes true:* the claim works at queue speed; `app_worker` keeps one policy per queue table and
nothing new is created — no role, no function, no schema. The predicate is data the lint can pin as a
literal exactly as `RFC-2026-020` §6.1/5 pins `app_authz`'s.

*Costs:* three, and the third decides. (i) That predicate **is** the lifecycle vocabulary
`CTR-JOB-001`'s freeze boundary reserves — *"lifecycle state names and transition policy remain
subject to source-defined owner review"* — which `050` refused twice over, once for a status enum and
once for a partial index, saying *"an index predicate is not a weaker place to put a decision than a
CHECK"*. A policy predicate is not a weaker place either. (ii) M7: it must be written twice, as a
`SELECT` policy and an `UPDATE` policy, and the two can drift in a direction whose only symptom is an
empty queue. (iii) It contains **no tenant term at all** — it is option B narrowed by a liveness
condition, not by a boundary.

*Makes unfalsifiable — and this is why it loses:* the claim's tenant boundary. An isolation case can
only assert *"the worker sees claimable rows"*, which is true across every tenant by construction, so
**no case can distinguish a correct claim from one that returned another tenant's job**. The
isolation question leaves the database with nothing recording that it left. `RFC-2026-016` §4 retired
"force where compatible" for being unfalsifiable and replaced it with a register the lint reads in
both directions; D would put the queue's whole tenant story back into that shape, a few batches after
adopting the reasoning against it.

### E. Take the queue out of RLS's reach: a queue table with no `workspace_id`

*Makes true:* no tenant question, therefore no policy and no exemption. The payload carries the
tenant by reference.

*Costs:* it contradicts three documents that agree — §5 scopes `jobs.kernel` to `workspace`, §4's ERD
reads `WORKSPACE ||--o{ JOB : queues`, and `CTR-JOB-001` requires `tenant_context`, which makes
`workspace_id` a required property. `050` is merged and migration invariant 1 forbids rewriting it,
so this is a *second* queue beside the one that exists.

*Makes unfalsifiable:* tenant isolation of job payloads, which would move entirely into `input_ref` —
a reference this schema cannot constrain and no policy can read.

### F. A lease broker — the claim is a `SECURITY DEFINER` function whose owner holds the only policy on the queue tables — **proposed for DISCOVERED cells**, together with the narrowed GUC for CARRIED ones

*Makes true:*

* The claim runs at queue speed, as one statement, with `FOR UPDATE SKIP LOCKED` intact.
* **`app_worker` keeps grants and no policy on the queue tables, permanently rather than pending.**
  So `050`'s construction — *"with the grant and no policy, an empty read can only have come from row
  level security, and a service role that had quietly acquired `BYPASSRLS` would SUCCEED where the
  suite demands a refusal"* — keeps working on exactly the tables where the queue lives, instead of
  being spent to make the queue run.
* The exemption is **a policy on a named role**, which `RFC-2026-016` §4 calls the sanctioned form,
  and which the register can now carry with a corroborable `table` because batch `011` widened
  `roleScopedCorroboration` to accept the policy form.
* The boundary is **one function body**, pinnable by `pg_get_functiondef` in the snapshot exactly as
  `RFC-2026-020` §6.1/7 pins the platform's `auth.uid()`, instead of N statements the worker composes
  at runtime.
* **It converts DISCOVERED into CARRIED inside the database.** The broker's contract includes setting
  `app.workspace_id` from the row it claimed, so every statement after the claim is a CARRIED cell
  operating under a setting the *broker* — not the worker — chose. The one place the worker cannot
  supply its own tenant context is the one place the tenant context is created.

*Costs:* a fifth role (`RFC-2026-020`'s pattern, one family over) and a function **nobody can write
yet**: its body contains the lifecycle predicate `CTR-JOB-001`'s freeze reserves, and there is no
identity to grant `EXECUTE` to (M9). So this is a shape decision that cannot be put into effect by
the RFC that makes it, and §5/8 says so rather than implying otherwise. It also concentrates: if the
broker is wrong it is wrong for every tenant at once — which is true of any chokepoint, and is the
reason §7 pins it rather than trusting it.

*Makes unfalsifiable if chosen badly:* the broker's width. `USING (true)` on the owner plus an
unpinned function body is option B wearing a function, and it would be **harder** to see than B
because the widening would live in a `create or replace` rather than in a policy diff. Every rule in
§7.1 exists for that failure and for no other.

### G. Do nothing — leave both cells denied and §2 unamended

*Makes true:* no new document; the tree unchanged; every `S` cell stays refused, which is a safe
state and is the state today.

*Costs:* `050` and `140` both recorded the finding and dispatched it here by name. The next batch to
reach an `S` cell — `051`, `061`, `070`, `110`, `120` — re-derives it or routes around it, and
routing around it is option B arriving in a batch instead of in a decision.

*Makes unfalsifiable:* §2 itself. A decision that cannot be applied to a third of its own subject is
falsified by no batch, because every batch has a reason not to try — which is how an approved
decision stays approved while nothing implements it. `RFC-2026-019` §8 recorded the near neighbour of
this: an approved decision resting on a misread, caught by a person reading two documents together
and not by the conflict order.

---

## 5. Decision proposed

**1. §2's GUC scoping survives NARROWED for CARRIED cells and is DELETED for DISCOVERED ones.**
Membership is decided by §3's test, applied to the statement, and recorded as data in
`db/foundation/lint/service-policy-map.json` (§7.2) so that batch `061` reads the answer rather than
re-deriving it. A cell may appear twice with two classes; the class attaches to the statement.

**2. The setting is named `app.workspace_id`, and a policy may spell it exactly one way:**

```sql
(select nullif(current_setting('app.workspace_id', true), '')::uuid)
```

M4 is why every part is load-bearing: the two-argument form because the one-argument form raises
`42704` on a session that never set it; the `nullif(…, '')` because a placeholder that was set and
reset reads back as `''` and `''::uuid` raises `22P02`; and the `(select …)` wrapper because M5 shows
it is what makes the expression an `InitPlan` that reaches an index instead of a per-row call. A
policy in any other spelling **fails open into an error**, and that is not a style finding.

The name `app.` rather than `request.`: `request.*` is PostgREST's namespace and its other members
are derived from the HTTP request. A security-relevant *server-set* value placed among them invites a
later reader to treat it as request-derived, and no comment survives that. `app.` matches the schema
and the `app_*` role prefix this repository already owns.

**3. A CARRIED service policy is `TO app_worker`, and its predicate is the cell's own predicate AND
the confinement term — never the confinement term alone.** A policy whose entire predicate is the
confinement term is `USING (true)` with a step, and it introduces the permission §2 says it does not.
For `140`'s cell that means the `WITH CHECK` carries the audit record's own constraints as well as
`workspace_id = <the expression above>`.

**4. The confinement term is NOT a boundary, and no artefact may describe it as one.** M2: the role
the policy names sets the setting the policy reads, twice in one transaction, and the catalog's own
privilege function cannot even be asked who may do it. What the term *is* worth is precise and worth
having: **it confines one transaction to one tenant**, so a worker processing tenant A's job that
computes tenant B's `workspace_id` for a row is refused, where today it would succeed. That is the
realistic service-path defect and this catches it. What it is not worth: anything at all against a
worker that chooses to set the setting differently. Any test named `service-cannot-cross-tenant` that
rests on it is asserting a control nobody has and must be renamed for what it checks.

**5. A queue claim is not an RLS-shaped problem, and that is the answer rather than a deferral.**
Row level security's unit is *"may this session see this row"*; the claim's question is *"may this
session take one row and thereby acquire that row's tenant"*, and no `USING` expression can express
it, because the tenant is the statement's output. So **`app_worker` holds no policy on `app.jobs`,
`app.outbox_events` or `app.consumer_ledger` — permanently, not pending** — and the claim is
performed through the broker in 6. The cost is stated in §8 rather than hidden: the queue stays
unrunnable until three separate things exist, and one of them is not this RFC's.

**6. The broker's owner is a fifth role that is not a path.** Proposed name `app_queue`; the name is
not load-bearing. `NOLOGIN NOBYPASSRLS NOINHERIT`, no password, owning no table, granted to nobody —
`RFC-2026-019` §4/1's negative and `RFC-2026-020` §5/2's extended by one more name. It owns the
broker function and nothing else, holds exactly the policies the broker needs on the queue tables and
nothing else, and **takes an exemption-register row**, because it is the genuine exemption here.

This does **not** widen `app_authz`. `RFC-2026-020` pins `app_authz` at exactly one policy and a
pinned grant set, and `011`'s apply-time block re-asserts that count on every apply; a fifth role with
its own count leaves that assertion true. Reusing `app_authz` for the queue would have made an
applied migration's own assertion false, which is why this proposes a role rather than a reuse.

**7. Who may set `app.workspace_id`: exactly two setters, and a third is a finding.**

* The worker's transaction preamble, immediately after `SET LOCAL ROLE app_worker`, from the
  server-resolved `CTR-TEN-001` context — for a CARRIED statement.
* The broker, from the row it just claimed — for everything after a DISCOVERED statement.

Both with `SET LOCAL` / `set_config(…, true)` and **never** `SET`. `RFC-2026-019` §4/3 gives the
reason and `db/foundation/test-helpers/auth-context.sql` already states it: a session-level `SET`
survives the transaction on a pooled connection and hands the next request another tenant's context,
with no error anywhere.

**8. This decision is NOT IN EFFECT until a service identity exists, and that dependency is named
rather than assumed.** `RFC-2026-019` §4/3 left `app_worker`'s connection method open *"until a
background worker exists"*, and M9 measures the consequence: the only member of `app_worker` is
`postgres`, which bypasses RLS. **A policy `TO app_worker` written today is unreachable except from
an identity for which it is moot**, and a broker function has nobody to grant `EXECUTE` to. The
shape `RFC-2026-019` §4/3 already stated — a dedicated login role, member of no request-path role,
issuing `SET LOCAL ROLE app_worker` per transaction — is the shape this RFC assumes; **choosing it,
and paying for its credential custody, belongs to the RFC that creates the worker** (`DATA-DEC-03`,
due before G1). This RFC decides what the policy set looks like and cannot put it in effect.

**9. `RFC-2026-016` §2's text should be amended.** §6 states exactly what should change. Amending an
approved RFC's decision is the Product Owner's act; stating precisely what should change and why is
this RFC's.

---

## 6. What `RFC-2026-016` §2's own text should become

Proposed replacement for the amendment sentence, for the Product Owner to accept, alter or refuse:

> Amend §8.5: a policy is `TO authenticated` for user paths, and for each operation the matrix marks
> `S`, **one of two shapes, decided by whether the statement carries or discovers its workspace**:
>
> * **CARRIED** — a policy `TO <service role>` whose `USING`/`WITH CHECK` is the cell's own predicate
>   **AND** the workspace confinement term
>   `(select nullif(current_setting('app.workspace_id', true), '')::uuid)`, set by the server from the
>   `CTR-TEN-001` context with `SET LOCAL`, never `SET`.
> * **DISCOVERED** — **no policy for the service role**, permanently. Such an operation is performed
>   through a `SECURITY DEFINER` function whose owner is a role that is not a path and that holds the
>   policy; the service role keeps its grants and no policy, so a service refusal remains attributable
>   to row level security.
>
> Which shape a cell takes is decided by the test in `RFC-2026-022` §3 and recorded in
> `db/foundation/lint/service-policy-map.json`, read by the schema lint in both directions.
>
> **The confinement term is a containment control against defects in the service's own code, not a
> boundary against the service role**, which can set the setting itself; no document, test or
> assertion may cite it as tenant isolation of the service path.
>
> This introduces no new permission **in the CARRIED shape**, because the cell's own predicate is
> retained; a policy whose whole predicate is the confinement term would introduce one, and is
> refused.

Two smaller corrections §2 also owes, both produced by trying to implement it:

* §2's *"scoped by a server-set workspace GUC"* names no GUC and no setter. §5/2 and §5/7 supply
  both, and §7.1 makes them assertable, which is `RFC-2026-021` §5's standard: a rule the lint can
  read in both directions.
* §6's *"it must land in batch `000`"* did not happen — `WP-0A-DB-00`'s scope excludes any RLS policy
  from `000`, and migration invariant 1 now forbids putting it there. The record should say so, so
  that a later reader does not go looking in `000` for a shape that lands in a forward batch.

---

## 7. What must be true before this closes, in artefacts a build can check

**This RFC writes none of them.** A Proposed decision that has already changed the tree is not a
proposal (`RFC-2026-020` §6.1's rule, applied to its author).

### 7.1 Assertable against the catalog, by the lint that already exists

1. `app_queue` exists with `rolcanlogin`, `rolbypassrls`, `rolsuper`, `rolinherit` all false and no
   password, and joins the `SERVICE_ROLES` list `scripts/db/run.mjs` already checks. `KNOWN_BYPASS`
   unchanged, so a bypassing fifth role is still a finding.
2. `authenticator` is a member of `app_queue`: **no**. `RFC-2026-019` §5's negative, extended by one
   name, as `RFC-2026-020` §6.1/2 extended it before.
3. No table in `app` is owned by `app_queue`. Same rule as `app_command` and `app_authz`, same reason:
   a `SECURITY DEFINER` function owned by the table owner is exempt from the policies on a forced
   table.
4. Every function owned by `app_queue` is `prosecdef = true` with `search_path = ''`, **and there is
   exactly one of them**, and its `pg_get_functiondef` is pinned in `catalog-snapshot.json`. Without
   the pin, F degenerates into B inside a `create or replace` (§4 F).
5. **`app_worker` holds no policy on any table the map classes DISCOVERED.** This is decision 5 as a
   negative, and `RFC-2026-019` §5 is right that a negative is the strongest thing a lint can hold: if
   anyone writes one later, the build fails until an RFC changes the decision.
6. **Every policy naming a service role either matches the pinned CARRIED shape and has a
   `service-policy-map.json` row, or has an exemption-register row.** Both directions: a policy with
   no row is a finding, and a row with no policy is a finding — `RFC-2026-021` §8.2's shape.
7. **The confinement expression appears in the tree exactly once as a literal**, in the lint, and
   every service policy's `pg_get_expr` contains that literal verbatim. A second spelling of the same
   idea is the failure M4 describes and must fail the build, not be tolerated as equivalent.
8. **`roleScopedCompleteness` needs one amendment, and it is A0's to make, not mine.** Today every
   policy naming a non-request-path role owes an exemption-register row. Under decision 3 that would
   put one row per CARRIED cell — up to six — into the register, and the same reasoning
   `scripts/db/run.mjs:479` already gives about request-path roles applies: *"Demanding a row for
   each would fill the register with the access matrix and make it unreadable."* The proposed
   amendment is narrow and keeps the register strictly meaningful: **a service policy that matches the
   pinned CARRIED shape exactly is the matrix being implemented and owes a map row instead; a service
   policy in any other shape — `app_queue`'s `USING (true)` included — is an exemption and owes a
   register row.** The register then contains precisely the genuinely unbounded policies, which is
   what it is for. I state it; the owner of `run.mjs` decides it.

### 7.2 The classification becomes data

`db/foundation/lint/service-policy-map.json`, with one row per `(cell, statement)` from §3's table:

```
{ "cell": "§8.4 Audit/security INSERT", "batch": "140_audit.sql", "statement": "insert",
  "class": "carried", "tables": ["app.audit_logs","app.security_events"], "role": "app_worker",
  "rfc": "RFC-2026-022" }
{ "cell": "§8.4 Internal job/attempt/DLQ payload", "batch": "050_async_kernel.sql",
  "statement": "claim (for update skip locked)", "class": "discovered",
  "tables": ["app.jobs"], "role": null, "broker_owner": "app_queue", "rfc": "RFC-2026-022" }
```

`class` is required and `role: null` is only valid with a `broker_owner`, so a DISCOVERED row cannot
quietly acquire a service policy. The file is **the answer to "which shape does this cell take"**, and
§7.1/6 makes it the only answer.

### 7.3 Executable only, never citable — four claims this run could not measure

`RFC-2026-020` §6.2's rule, applied. Ten batches are not on the provisioned instance and this run may
issue no DDL, so these are discharged **by execution in the CI container `make db-migrate-clean`
builds, in the batch that lands the first service policy or the broker** — and by nobody quoting the
PostgreSQL manual, this RFC included.

**(a) That a CARRIED policy in the pinned spelling DENIES rather than raises when the setting is
absent, in both of M4's absence states**, on a forced table with the policy present, as
`app_worker`. M4 and M5 measured the expression as a *query* predicate; **no policy on the
provisioned instance names any service role** (M10), so the policy-predicate behaviour is not
measured anywhere and must not be inferred from the query-predicate one.

**(b) That the broker is NOT inlined, and that its owner's policy is what admits the row.**
`RFC-2026-020` §6.2/9's claim, one family over, and it fails the same way: if a `SECURITY DEFINER`
function is inlined into the caller's plan, decisions 5 and 6 are wrong and F is D wearing a
function. Record `EXPLAIN (VERBOSE)` showing the call not expanded.

**(c) That the broker and the direct statement diverge.** One claim through the broker as
`app_worker` returns **at most one row** and leaves `app.workspace_id` set to that row's workspace;
**the same statement issued directly by `app_worker` still returns zero rows.** The *pair* is what
distinguishes a broker from a widening, and neither half alone proves anything.

**(d) That `SET LOCAL app.workspace_id` does not survive the transaction under the transaction-mode
pooler the platform puts in front.** M1 records `inet_server_port() = 5432` — a direct connection —
so **nothing here measures pooler behaviour**, and the reason `auth-context.sql` gives for preferring
`SET LOCAL` remains, on this instance, reasoning rather than measurement.

### 7.4 Isolation cases (§8.6 shape), owed by the batch that lands each half

9. A CARRIED insert with the setting matching the row's workspace succeeds; with the setting naming a
   different workspace it is refused by the policy, not by a grant.
10. The same insert with the setting **unset** is refused — not `42704`, not `22P02` (this is (a) as a
    case).
11. A DISCOVERED claim issued directly by `app_worker` returns zero rows, **and this case is
    permanent** — see §8, it is no longer a pending case waiting to flip.
12. `EXECUTE` on the broker is revoked from `PUBLIC` and granted only to `app_worker`
    (`§8.5`, and `RFC-2026-020` §6.3/13's rule).
13. **A negative control**: with `app_queue`'s policy dropped, the broker's cases fail. Without it, a
    broker that succeeds because its owner bypassed row security is indistinguishable from one a
    policy admitted — the defect `RFC-2026-016` §5 found in the data package's own smoke set.

---

## 8. Consequences

* **Batch `140`'s two isolation cases flip as its blocker predicts.** They assert the present refusal
  at the policy layer *"precisely so that they FLIP rather than staying green the day it is written"*,
  and under decision 3 that day comes.
* **Batch `050`'s do not, and whoever reads `050` next must know it.** Its `service-sees-zero-*` cases
  become **permanent assertions** rather than pending ones: under decision 5 no policy will ever
  admit `app_worker` to `app.jobs`. What flips instead is a *new pair* — the broker succeeds while
  the direct statement still returns zero (§7.3 c). A batch that reads `050`'s cases as pending will
  eventually "fix" them by writing option B.
* **The exemption register gains `app_queue`'s row and, under §7.1/8, does not gain one per CARRIED
  policy.** That amendment is the price of keeping the register readable, and it is a real widening
  of a rule batch `011` has just landed, so it belongs to `run.mjs`'s owner and is written here as a
  request rather than as a change.
* **`RFC-2026-017` §3's role table gains a fifth row, and A0 owns that edit.** `RFC-2026-019` §4/5
  established that §3 is corrected by its owner; `RFC-2026-020` §7 said the same about the fourth row.
  This is the third time and the pattern is now the rule.
* **`private.as_service()` must gain a workspace argument, or a second helper beside it.** Today it
  sets a role and a claim set with no workspace, which `140` already recorded. Every existing service
  isolation case's meaning changes the day it does, so it is a named forward change in the batch that
  lands the first CARRIED policy — never a quiet edit, for the reason `140` gave when it refused to
  make one.
* **Eight batches downstream of `050` are unblocked in shape and still blocked in fact.** `051`,
  `061`, `070`, `080`, `100`, `110`, `120` and `131` now have an answer to *"what does my `S` cell look
  like"* and still have no worker to run it. That is a smaller debt than the one they had — they can
  write the map row and the cases now — but it is not zero and §5/8 is why.
* **`110` and `131` learn something before they are written.** Both hold a DISCOVERED cell (raw
  token/webhook `SELECT`), so neither should expect a service policy, and both need a broker of their
  own shape. A webhook inbox is a queue with a different name.
* One more role in every role-topology assertion, one more owner to check, one more pinned string,
  one new lint data file.

---

## 9. What this does **not** decide

* **`app_worker`'s connection method and its credential custody.** `RFC-2026-019` §4/3 left it open,
  M9 measures why it matters, and §5/8 makes it this decision's blocking dependency rather than its
  content. It belongs to `DATA-DEC-03` and to the RFC that creates the worker.
* **`CTR-JOB-001`'s lifecycle vocabulary.** The broker's body needs to express *which jobs are
  claimable*, which is the *"lifecycle state names and transition policy"* its freeze boundary
  reserves. `050` refused to invent it twice; this RFC refuses a third time and does not pretend the
  broker can be written before it exists.
* **The broker's signature, its return type, whether one function serves all DISCOVERED cells or one
  per family, and which batch writes it.** A new batch in A0's kernel range — never an edit to `050`,
  which invariant 1 forbids.
* **The `P` cells.** The Service column of §8.1–§8.4 is mostly `P`, and `P` is *"passes per
  policy/explicit capability"* with no document defining the capability set. `RFC-2026-020` §8 says
  so and it is still true; nine `S` cells are this RFC's whole subject.
* **§8.4's `S/N` on the usage ledger, and the contradiction `140` recorded** between §8.4's `N` for
  audit `UPDATE`/`DELETE` and §10's *"anonymize actor where allowed; purge after policy"*. Owed to
  `DATA-DEC-06`, §10's own approval and batch `160`.
* **Whether any `S` table gets a client read.** `RFC-2026-021`'s criteria decide that, `050` recorded
  that `app.jobs` fails C1 today, and `140` recorded five §8.4 cells it refuses. Unchanged here.
* **Whether schema `app` is exposed to the Data API**, and **realtime**. Both outside the database;
  `RFC-2026-021` §10 records them and this RFC relies on neither.
* **`RFC-2026-016` §4's exemption-register gap for `app_authz`** — closed by batch `011` per the work
  package, and not reopened.

---

## 10. Provenance, and what a reviewer should discount

**The measurements are this run's**, taken read-only on 2026-09-08 against `xtvtflkntpqfvflvdbwk` and
reproducible from the queries printed in
`evidence/WP-0A-DB-00/a1-rfc-022-measurements-2026-09-08.md`. Ten batches are not on that instance,
so **no probe touched a queue table, an audit table, or any policy naming a service role**; every
mechanism claim is built from batch `010`'s tables and the platform catalog, and the four claims that
would have needed an absent object are in §7.3 rather than in §4's argument.

**I am a subagent run in A0's vendor and model family, proposing a decision A0 will review.**
`prefer_cross_vendor_review` is not satisfied, and `independence.no_self_approval` is not satisfied in
the sense `RFC-2026-016` §7 first recorded about the A1 analysis behind it. This is the third
consecutive RFC to record the same defect — §7 there, §9 in `RFC-2026-020`, §11 in `RFC-2026-021` —
and recording it a fourth time does not cure it. **A cross-vendor reviewer would be worth more than
this paragraph**, and the fact that the sentence is now boilerplate is itself the finding.

**My proposal is again the one that costs me nothing.** I am the security co-owner, and I am
proposing that the service path stay denied on the queue and stay unreachable everywhere. That is the
direction with no downside for the proposer and it should be weighed as such. The strongest argument
against §5/5 is in §4 D's own favour: D keeps every `S` cell inside the policy system, needs no fifth
role and no function, and can be pinned as a literal today — and I am rejecting it on a property
(unfalsifiability of the tenant boundary) that a reviewer who values uniformity more than
falsifiability would rank the other way. If A0 ranks it the other way, D is the decision and §7.1/4-5
are wasted rather than wrong.

**I corrected a premise of the decision I am extending, and kept its mechanism anyway.**
`RFC-2026-016` §2 presents the workspace GUC as *scoping* the service policy. M2 and M3 say it
**confines** rather than constrains: the role it names sets it, and the reason the same technique
works on the request path is that PostgREST issues the statement and the client does not. I have kept
the mechanism for CARRIED cells on an argument §2 does not make — per-transaction defect containment
— which is exactly the move `RFC-2026-021` §11 flagged about `RFC-2026-012` §2 and is worth flagging
again in the same words: **a reviewer who thinks defect containment is not worth a pinned expression
should say so, because in that case decision 1 should be B or G rather than "narrowed", and this RFC
is proposing the wrong thing rather than a weaker version of the right one.**

**I ran no ratchet, no manifest regeneration and no `npm run check`**, and I wrote no migration,
policy, lint rule or test, edited no work package, no other RFC, no registry and nothing under
`test-kits/`. I did not commit and did not push. The working tree carries this file and the
measurements file, and nothing else.

---

## Rollback

Delete this file, the measurements file, and the decision-register row that cites them. Nothing in
the database or in any migration depends on either. If §7's lint rules or `service-policy-map.json`
have already landed, reverting them restores the present state — every `S` cell denied, `app_worker`
holding grants and no policy — which is strictly narrower and still passes.
