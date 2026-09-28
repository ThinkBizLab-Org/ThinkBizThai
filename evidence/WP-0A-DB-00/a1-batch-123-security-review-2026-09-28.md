# A1 Security/Privacy review: batch 123 (updated_by UPDATE closure on seventeen tables, decided_by as a pair) and RFC-2026-025

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer for `WP-0A-DB-00`
Subject: branch `agent/claude/WP-0A-DB-00-batch-123`, head `5856f0b`, base `e276c9a` (`main`).
I checked the head out as the local branch `review/a1-batch-123`. To measure the base I checked it
out as a temporary local branch `review/a1-123-base`, which I deleted afterwards.
Author: `/claude/a0_atlas`
Date: 2026-09-28

**This document records review findings. It advances no package status, signs nothing on anyone's
behalf, writes `security_approved` nowhere, and repairs nothing it found.** It is one input to the
Product Owner's disposition. It is not the disposition.

---

## 0. What I am, before anything else

I am a subagent spawned by `/claude/a0_atlas`, the Author of the change under review. I ran in A0's
worktree, under a brief A0 wrote, and I am the same vendor and model family as A0. RFC-2026-024
withdrew the cross-vendor condition, so that fact does not by itself disqualify this review. It does
mean the Author chose what to point me at. Whether this review counts as the Security signature is
for the Integration Owner (`/claude/r0_steward`) and the Product Owner to decide. It is not for me or
for A0 to decide.

Batch 123 is the forward fix for two of my own findings on batch 105 (F1 and F2 in
`a1-batch-105-security-review-2026-09-27.md`). So I am again reviewing a remedy to problems I
described, and I have a stake in calling them closed. To offset that, I measured the base and the
head with the same identities and the same statements, and I went past the two findings: every
client-writable attribution column, every write path I could name, and the RFC's rules.

Every claim below either names the file and line it rests on or was measured on a live cluster.
§2 separates what I measured from what I only read or inferred.

## 1. What was reviewed

- `git show 5856f0b`: 24 files. The only migration change is the new file
  `db/foundation/migrations/123_attribution_closures_everywhere.sql`, 119 lines:
  - ten RESTRICTIVE UPDATE policies at :33-62;
  - the CHECK `approval_requests_decider_is_a_pair` at :64-66;
  - an apply-time block at :73-119: the exact general rule (:78-101), the count of seventeen
    (:103-109) and the pair by definition text (:111-118).

  No integrated migration was edited: `git diff --stat e276c9a 5856f0b -- db/foundation/migrations`
  lists that one file and nothing else.
- `scripts/db/run.mjs:163-210`: `UPDATED_BY_ON_UPDATE_CLOSURES` grown to seventeen, and the new live
  coverage rule in the closure-text probe (:199-210).
- The six post-migrate replacements under `db/foundation/invariants/` and `superseded.json`.
- The one new case in `tests/db/identity/isolation-cases.mjs`
  (`editor-a-cannot-cancel-an-approval-request-naming-a-decider`) and the new pin test in
  `test-kits/db/foundation-contract.test.mjs`.
- The manifest's blocker changes (189 to 188: the decided_by blocker removed, the survey blocker
  appended, two stale-status annotations) and the handoff's security, limitation and blocker fields.
- `architecture/decisions/RFC-2026-025-owner-delegated-merge.md` (65 lines, Proposed), read against
  `RFC-2026-002-manual-merge-control.md`, `.github/workflows/ci.yml`,
  `scripts/verify-branch-scope.mjs`, `scripts/scan-repository-secrets.mjs` and the diffs of the three
  record-only merges the RFC cites (#154 `b07a8d9`, #158 `9039738`, #160 `5922684`).
- `product-owner-disposition-2026-09-28-one-page-summary.md` and `session-2026-09-28-ninth-pass.md`.
- `db/foundation/migrations/090_approval.sql:300-349, 470-595`, read for the decider findings.

## 2. Method: measured vs inferred

### 2.1 Setup

**Measured** on a private cluster: PostgreSQL 17.11 (`/opt/homebrew/bin`),
`initdb --locale=C -A trust -U postgres`, `127.0.0.1:5501`, TCP only
(`unix_socket_directories=''`), `LC_ALL=C TZ=UTC`, `TMPDIR` inside my private scratch directory
`…/scratchpad/a1-123/`. The cluster was re-initdb'd for every round. Each round did the following:

1. Copied the pristine `140_audit.sql` back.
2. Appended the round's drift, if it had one.
3. Applied `db/foundation/ci/supabase-shim.sql`.
4. Ran `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres make db-migrate-clean`, then
   `make db-rls-smoke`.
5. Restored `140_audit.sql`.

Behavioural scripts then ran against the migrated, fixture-loaded database. They impersonated
identities with `set_config('request.jwt.claims', …)` and `set_config('role', …)`, the way
`db/foundation/test-helpers/auth-context.sql` does, and every attempt was rolled back. Where a
script needed a drift for one attempt only (a looser permissive policy, an `or true` rewrite), it
created it as `postgres` inside that attempt's transaction, so it vanished with the rollback.

Before the first round and after the last, `140_audit.sql` hashes to `2ac596bb…c1ad37149`. The
cluster is stopped and its data directory deleted. Port 5432 was not listening at any point.
Port 5499 belongs to another run: it was pid 23284 when I started and pid 49737 when I finished,
so someone else restarted it; I never connected to it.

`node --test test-kits/db/foundation-contract.test.mjs` on the head (Node 24.20.0): 71 of 71 pass.

### 2.2 Rounds

| Round | Tree | Drift appended to 140 | migrate-clean | rls-smoke | What caught it |
|---|---|---|---|---|---|
| R0base | `e276c9a` | none | ok (43 blocks; probe "14 / 7 / 2") | ok (976) | none needed |
| R0head (×2) | `5856f0b` | none | ok (44 blocks; probe "14 / 17 / 2") | ok (977) | none needed |
| B-D1 | base | a second PERMISSIVE UPDATE policy on `publish_intents`, role check only | ok | ok | **none**; owner forges `updated_by` (UPDATE 4), admin (UPDATE 3) |
| B-D2 | base | `publish_intents_update_owner_admin` with `((updated_by = uid) or true) and <role>` | ok | ok | **none**; owner UPDATE 4, admin UPDATE 3 |
| H-D1 | head | as B-D1 | ok | ok | nothing needs to: the forgery is refused by `publish_intents_updated_by_on_update_is_caller` |
| H-D2 | head | as B-D2 | ok | ok | same: refused by the 123 closure |
| H-D3 | head | `drop policy publish_intents_updated_by_on_update_is_caller` | **FAIL** (probe, by name) | ok | probe; 123's block by hand also refuses it (§2.3) |
| H-D4 | head | `content_items_updated_by_on_update_is_caller` gutted with `or true` | **FAIL** (probe, by name) | ok | probe; 123's block by hand also refuses it |
| H-D5 | head | `grant update (updated_by) on app.workspace_member_scopes to authenticated` | **FAIL** (probe coverage rule names the table) | ok | probe; 123's general rule by hand names it too |
| H-D12 | head | a new `app` table granting UPDATE on `updated_by`, with a correctly shaped closure | **FAIL** (probe: closure on an unpinned table) | ok | probe; 123's block by hand: "there are 18 … closures" |
| H-D6 | head | `drop constraint approval_requests_decider_is_a_pair` | **FAIL** (post-migrate pass, 123#1) | **FAIL** (1: the new case) | both |
| H-D7 | head | the pair replaced by a weaker CHECK of the same name | **FAIL** (123#1, definition text) | **FAIL** (1) | both |
| H-D13 | head | the pair re-added `NOT VALID` | **FAIL** (123#1, `convalidated`) | ok | post-migrate pass |
| H-D17 | head | `revoke update (updated_by) on app.research_suggestions`, closure kept | ok | **FAIL** (5 positives) | rls-smoke only (F7) |
| H-D16 | head | a table in `public` granting UPDATE on `updated_by`, `for all … using (true) with check (true)` | ok | ok | **none**; `db-schema-lint` also ok; owner UPDATE 1 (F6) |
| B-D8 / H-D8 | both | `decided_by = auth.uid()` removed from `approval_requests_update_decide_approver` | ok | ok (976 / 977) | **none**; approver approves naming the owner as decider (UPDATE 3), owner naming the approver (UPDATE 4) (F3) |
| H-D9 | head | that conjunct gutted with `or true` instead | ok | ok | **none**; same outcome (F3) |
| H-D10 | head | `content_ideas_insert_writer` with `((created_by = uid) or true) and <role>` | ok | ok | **none**; owner inserts naming another creator (INSERT 0 1) (F5) |
| H-D11b | head | the same rewrite on all 22 permissive INSERT policies of the 17 `created_by` tables | ok | FAIL (**1** of 977: `owner-a-cannot-forge-created-by`, invitations) | one case, one table; 15 of 15 measurable tables forged (F5) |

A first form of H-D11 used a `do $a1$` block and failed the post-migrate pass on its own syntax
("a do-block the pass cannot extract"). That failure was about my drift's shape, not its content,
so I re-ran it as H-D11b with plain `alter policy` statements.

### 2.3 Behavioural measurements

**F1 of my 105 review, base against head, on all seventeen tables.** Identities: owner, admin,
business-scoped editor, page-scoped editor, approver, viewer, suspended member, the other tenant's
owner, `authenticated` with no `sub`, `anon`, `service_role`, `app_worker`, `app_command`. Paths:
plain UPDATE naming another active member, `set updated_by = null`, `MERGE … WHEN MATCHED THEN
UPDATE`, and, each with an in-transaction drift, a looser permissive sibling (`using (true) with
check (true)`), `or true` inside every permissive UPDATE policy's binding, a CTE `update … from`
and a row constructor `set (updated_by) = row(…)`.

| | Base `e276c9a` | Head `5856f0b` |
|---|---|---|
| Forging attempts | 593 | 593 |
| Attempts that changed rows | **99**, all on the ten tables, all through a drift path | **0** |
| Of those, on a clean path (plain UPDATE, NULL, MERGE) | 0 | 0 |
| Refusal when a drift admitted the row | none | `<table>_updated_by_on_update_is_caller` (42501), on all ten |

- So the forgery on the ten was reachable only through a drift on the base, as my 105 F1 said ("no
  drift, no exploit"), and on the head it is refused even with the drift present.
- **INSERT … ON CONFLICT DO UPDATE.** Of the ten, only `approval_policies` (its version key) and
  `publish_intents` (its idempotency key) have a unique key made entirely of client-insertable
  columns, so only they have an upsert path. As owner and admin, `do update set updated_by =
  <another member>` and `= null`:
  - base, clean: refused by the permissive policy; base with either drift: **INSERT 0 1**, the
    forged value returned;
  - head, clean or with either drift: refused, by `…_updated_by_on_update_is_caller` whenever the
    drift admitted the row.
  - With `excluded.updated_by` carrying the forged value, 102's INSERT closure refuses the
    statement first, on both trees. Upsert naming self: INSERT 0 1 on both trees.
- `anon`, `service_role`, `app_command`: `permission denied for schema app` on all seventeen, both
  trees. `app_worker`: `permission denied for table` on the ten and on `workspace_invitations`,
  UPDATE 0 on the six where it holds the column but no policy admits it (unchanged from my 105 F4).
  Other tenant, viewer, suspended, no-`sub`: UPDATE 0 everywhere.

**F2 of my 105 review (decided_by at cancellation), base against head.** On workspace A's pending
requests, with `status = 'cancelled'` and `updated_by` = the caller:

| Statement | owner | admin | editor | page editor | superuser (`postgres`) |
|---|---|---|---|---|---|
| `decided_by = <approver>` | base UPDATE 4, head **23514** | 3, **23514** | 3, **23514** | 2, **23514** | 4, **23514** |
| `decided_by = <self>` | base 4, head **23514** | 3, **23514** | 3, **23514** | 2, **23514** | 4, **23514** |
| `decided_at = now()` alone | base 4, head **23514** | 3, **23514** | 3, **23514** | 2, **23514** | 4, **23514** |
| the same through `MERGE` | base MERGE 4, head **23514** | 3, **23514** | 3, **23514** | 2, **23514** | 4, **23514** |
| plain cancel | UPDATE 4 both | 3 both | 3 both | 2 both | 4 both |

Every head refusal names `approval_requests_decider_is_a_pair`. The approver, viewer, other tenant,
`app_worker` and `service_role` are refused or reach nothing on both trees, as before.

**Legitimate flows, base against head.** Across the seventeen tables, the thirteen identities and
the four clean paths, the outcome class (rows, or which SQLSTATE) is identical on both trees in
every cell, and the 85 "name yourself" cells return the same row counts. For `approval_requests`,
the only outcomes that change are the twenty forgeries above; plain cancel, approve naming self and
`changes_requested` are unchanged.

**What else the decider columns allow, on both trees (not changed by 123):**

- The approver (UPDATE 3) and the owner (UPDATE 4) can approve with `decided_at = '2001-01-01'` or
  record `changes_requested` with `decided_at = '2999-01-01'` (F4).
- With a looser permissive UPDATE sibling in the transaction, approving while naming another
  member as decider succeeds (owner UPDATE 4, approver UPDATE 3), and so does rewriting the decider
  of an already-decided request (UPDATE 1). 123's pair constrains only whether the columns are
  null (F3).

**Error text a client sees.** For the CHECK, a client gets the message, SQLSTATE 23514, schema,
table and constraint name, and **no `Failing row contains` DETAIL**: PostgreSQL withholds the row
because row level security applies to the caller. Only the superuser saw the row values. For a
refusal by a 123 policy, the message names the policy, but on the clean set the permissive policy
refuses first and its message names none, so client-visible messages are unchanged on every clean
path I ran.

**123's block, run by hand** (in a rolled-back transaction, on a head cluster, after each drift):
passes after H-D1 and H-D2; refuses after H-D3 (`app.publish_intents`), H-D4 (`app.content_items`),
H-D5 (`app.workspace_member_scopes`), `no force row level security` on `content_items`, and the
closure widened to `to authenticated, anon`; H-D12 passes the general rule and fails the count
("there are 18"). In `migrate-clean` the probe runs first and stops the run, so the README's "fails
twice" is true of the two checks independently, not of one run.

**Upgrade path.** On a base cluster I committed one forged cancellation (`decided_by` alone), then
applied `123_…sql` in one transaction: `check constraint "approval_requests_decider_is_a_pair" … is
violated by some row`, and the file rolled back. The runner applies each migration file in one
transaction (`scripts/db/psql-driver.mjs:266-270`).

**Attribution columns, head.** Client-writable `*_by` columns: `created_by` INSERT on 17 tables,
`updated_by` INSERT on 14 and UPDATE on 17, `requested_by` INSERT on 2, `decided_by` UPDATE on 1.
Bound by a RESTRICTIVE policy: `updated_by` (both verbs) and `requested_by`. Bound only inside
permissive policies: `created_by` (22 permissive INSERT policies, each with the binding as a
top-level conjunct) and `decided_by` at decision (one permissive UPDATE policy). No views; the five
SECURITY DEFINER functions are the pinned ones.

### 2.4 Read or inferred, not measured

- That the platform's PostgREST path adds no write route the shim lacks. The shim is not Supabase
  (`supabase-shim.sql:1-18`).
- Everything in §4 F8 and F9 about RFC-2026-025. I read the RFC, the code of the guards it relies on
  and the diffs of the merges it cites; I executed none of the scenarios.
  `scripts/verify-branch-scope.mjs:120` reads the manifest from the checked-out head: I read that
  line, I did not run the guard against a widened manifest.
- That `content_targets` and `workspace_member_scopes` behave for `created_by` like the other
  fifteen. My copy-a-row insert could not build a valid row for either (a narrowing and a policy
  predicate refused my control insert too), so for those two the claim rests on the catalog.

## 3. The brief's questions, answered

1. **Are F1 and F2 reproduced on the base and closed on the head, for every client role and path?**
   Yes, both (§2.3).
   - F1: on the base, 99 forging attempts through a looser sibling or `or true` changed rows on all
     ten tables (owner on all ten; admin, editor and page editor wherever their role reaches), and
     the rounds B-D1 and B-D2 show both layers green while the owner forges on `publish_intents`.
     On the head: 0 of 593, for every identity and path listed, upsert included.
   - F2: on the base, owner, admin, editor and page editor stamped a decider (the approver or
     themselves), or `decided_at` alone, on a cancellation, through UPDATE and MERGE. On the head
     every one is refused with 23514, and so is the superuser, because it is a CHECK.
   - Service role: `service_role` and `app_command` never reach the schema; `app_worker` holds no
     UPDATE on the ten and no grant on `approval_requests`.
2. **Security side effects of ten more restrictive policies and the new CHECK?** None harmful, as
   measured.
   - No legitimate flow is refused: identical outcome classes on every clean cell (§2.3), because
     every permissive UPDATE policy on the ten already carried `updated_by = auth.uid()` as a
     top-level conjunct (catalog read on the head), so the closure is implied by what admits the row.
   - No USING clause, so visibility and row reach are unchanged.
   - Error messages leak no row data to a client. They disclose a constraint or policy name, which
     is schema, not data, and the schema is in the repository (F7, NOTE).
   - One operational edge: 123 cannot be applied over a database that already holds a forged
     cancellation. It fails loudly and rolls back, which is the safe direction, and it is inert
     today: 123 is declared not applied to the provisioned instance (F7).
3. **RFC-2026-025.** Delegating the button is acceptable from a security standpoint **if** its
   conditions are made checkable and three exclusions are added (F9, LOW if approved as written).
   The record-only rule, as written, is **not safe**: a security-relevant change can be dressed as
   record-only through the manifest's blocker text, its ownership and gate fields, evidence files
   that are signatures or Owner dispositions, and state records that tell the next run what is
   owed, and no independent reader would see it (F8, MEDIUM if approved as written). §4 lists
   tightenings. The decision is the Owner's.
4. **created_by at INSERT: is it bound only inside permissive policies?** Confirmed on all
   seventeen tables (22 policies), measured end to end on fifteen. Graded LOW, the grade I gave the
   same class for `updated_by` on 105. One thing the record does not say: the rls-smoke cases named
   for this forgery mostly cannot see it (F5).
5. **Stop-the-line risks?** None found (§5).

## 4. Findings

### F1: CLOSED (my 105 F1). The updated_by drift route on the ten tables

**Measured closed** (§2.2 H-D1 to H-D5 and H-D12, §2.3). The ten policies are RESTRICTIVE, UPDATE,
`TO authenticated`, with no USING and WITH CHECK exactly the caller
(`123_attribution_closures_everywhere.sql:33-62`). A looser permissive sibling or `or true` no
longer reopens the forgery, and removing, gutting or widening a closure, or granting the column
without one, fails `migrate-clean` by name. My 105 remedies 1 and 4 are done.

Remedy 3, an rls-smoke UPDATE-forging case per table, is done for five of the ten
(`assets`, `content_ideas`, `content_targets`, `research_runs`, `research_suggestions` have an
`owner-a-cannot-forge-the-actor-on-…` case) and not for `approval_policies`, `approval_requests`
(`updated_by`), `asset_rights`, `content_items` or `publish_intents`. Drift on those five closures is
still caught by exact text (H-D3, H-D4), so this is depth, not a gap in the control. It is recorded
as owed on the survey blocker ("the eleven forging cases").

### F2: CLOSED (my 105 F2). decided_by at cancellation

**Measured closed** (§2.3), for every writer and path, by
`check ((decided_at is null) = (decided_by is null))` (`123_…sql:64-66`). Together with 090's
equivalence (`090_approval.sql:330-332`), it is logically the per-column split I suggested:
- when the status is a decision, both columns are set;
- otherwise both are null.

The disposition records the change of mechanism from A0's summary line, a restrictive policy, to
this CHECK. The new case fails without the constraint (H-D6, H-D7), and 123's block pins the
definition text and `convalidated` (H-D13).

### F3: LOW (pre-existing, not introduced by 123; the class 123 closed, on the column next to it). decided_by at DECISION is bound only inside the permissive decide policy, and no layer notices if the binding goes

**What.** `approval_requests.decided_by` is client-updatable (`090_approval.sql:481-482`). The
only thing tying its value to the caller when a request is approved or sent back is one conjunct of
the permissive `approval_requests_update_decide_approver` (`090_approval.sql:584-595`,
`decided_by = (select auth.uid())`).
- 123's pair constrains only nullness.
- 090's equivalence only requires a decider to be present.
- No closure pins it and no probe reads it.
- No rls-smoke case tries to decide while naming someone else: the decide cases at
  `isolation-cases.mjs:13603-13750` test who may decide, not whom the row names.

The coverage note at `isolation-cases.mjs:1009-1012` says the column "is held equal to
auth.uid() by the decide policy's WITH CHECK half". That is true on the clean set, and nothing
tests it.

**Evidence (measured, §2.2 B-D8, H-D8, H-D9).** On both trees, removing the conjunct, or gutting it
with `or true`, leaves `migrate-clean` and rls-smoke green (976 of 976 and 977 of 977). The approver
then approves three pending requests naming the owner as decider (UPDATE 3), and the owner four
naming the approver (UPDATE 4). With a looser permissive sibling instead, the decider of an
already-decided request can be rewritten (UPDATE 1).

**Why it matters more than `updated_by`.** `decided_by` records who passed the approval gate.
§8.3's `P` cells ("Admin and editor are `P`"; `090_approval.sql:574-577` and the open blocker that
owes them to Product) will be implemented by adding exactly this: a second permissive decide policy
for a capability. If that policy omits the binding, the gate records a decider who did nothing and
every layer stays green.

**Why LOW.** It is drift-only: nothing reaches it on the clean set, and no tenant boundary is
crossed. I graded the same class LOW for `updated_by` on 105. The Owner may reasonably read it as
MEDIUM because it concerns the approval gate. It is not in the handoff's `known_limitations`, which
names `created_by` only, and the survey 123's blocker text records does not cover it.

**Remedies (the Owner's choice):**

1. A restrictive closure in 105's shape, `approval_requests_decided_by_is_caller`: `as restrictive
   for update to authenticated with check (decided_by is null or decided_by = (select auth.uid()))`.
   It refuses nothing that works today: cancellations carry no decider under 123, decisions name the
   caller, and no permissive policy admits an update of a decided row.
2. Pin it in the closure-text probe and extend the live coverage rule to every client-updatable
   `*_by` column, not only `updated_by`. That is the generalisation my 105 F2 remedy 4 suggested.
3. Add an rls-smoke case, `approver-a-cannot-decide-naming-another-decider`.
4. Record it with the `created_by` item until it is fixed.

### F4: LOW (pre-existing, not introduced by 123). decided_at is whatever the decider sends

**What.** `decided_at` is in the client UPDATE grant (`090_approval.sql:481`). No trigger sets it
(the only trigger on the table is `set_updated_at`), and no policy or CHECK bounds its value; 123's
pair requires only that it be present with `decided_by`. `090_approval.sql:346` says it is "the
column batch 160's APPROVAL-HISTORY sweep reads, and the one an anonymiser would filter on."

**Evidence (measured, both trees).** The approver approved with `decided_at = '2001-01-01'` (UPDATE
3) and recorded `changes_requested` with `decided_at = '2999-01-01'` (UPDATE 3). The owner did the
same (UPDATE 4).

**Impact.** A decider can misstate when a decision was taken, and so move a decision into or out of
a retention or anonymisation window the day batch 160 exists. It is not a forgery of another
person's identity, it stays inside one workspace, and only a caller already entitled to decide can
do it.

**Remedy (the Owner's choice).** Let the database maintain it, as `updated_at` is maintained: a
BEFORE UPDATE trigger that sets `decided_at = now()` when `status` enters a decision and refuses any
other change. Then remove `decided_at` from the client UPDATE grant. A restrictive
`decided_at is null or decided_at = now()` is the smaller alternative.

### F5: LOW (confirmed as recorded; the brief's Q4). created_by at INSERT is bound only inside permissive policies, and most cases named for its forgery cannot see it

**What (measured, §2.3 catalog).** Seventeen tables grant `authenticated` INSERT on `created_by`.
Their 22 permissive INSERT policies each carry `created_by = (select auth.uid())` as a top-level
conjunct, and no RESTRICTIVE policy binds the column. A0's record says the same
(`WP-0A-DB-00.json`, survey blocker; `README.md` probes section; handoff `known_limitations`).

**Evidence.**
- H-D10: `or true` on `content_ideas_insert_writer`. Both layers green, and the owner inserts a
  content idea naming another member as creator (INSERT 0 1).
- H-D11b: the same rewrite on all 22 policies. `migrate-clean` green, rls-smoke **1 of 977** failed,
  and every one of the fifteen tables I could insert into accepted a forged `created_by`.

**What the record does not say.** The cases named for this forgery mostly do not test it:
- `owner-a-cannot-forge-created-by-on-a-business`, `…-on-a-knowledge-item`, `…-on-a-member-scope`,
  `owner-a-cannot-forge-the-actor-on-a-content-item` and their siblings set `updated_by` to the
  same forged id as `created_by`.
- Since batch 102, the restrictive `<t>_updated_by_is_caller` refuses them whatever the
  `created_by` binding does, so they pass for a reason other than their name.
- The one that caught H-D11b, `owner-a-cannot-forge-created-by` on `workspace_invitations`, is the
  one that leaves `updated_by` unset.

So "would reopen created_by forgery with every layer green" is measured true on sixteen of the
seventeen tables.

**Why LOW.** Drift-only, one workspace, the grade I gave the same class on 105.

**Remedies (the Owner's choice):**

1. 102's shape for `created_by`: `<t>_created_by_is_caller`, restrictive, INSERT, `TO authenticated`,
   `with check (created_by = (select auth.uid()))`. It refuses nothing that works today, because
   every permissive INSERT policy already requires equality.
2. Pin the seventeen in the probe with a live coverage rule on `has_column_privilege(…, 'INSERT')`.
3. Make the existing forging cases send `updated_by` = the caller, or leave it null, so each one
   isolates the column it is named for.

### F6: NOTE (pre-existing, not introduced by 123). The general rule and the probe's coverage read schema `app` only

**What.** `123_…sql:83-88` and `run.mjs:199-210` select tables `where n.nspname = 'app'`.
`authenticated` holds USAGE on `public` on this shim (measured: `has_schema_privilege` true, CREATE
false).

**Evidence (H-D16).** A table in `public` granting UPDATE on `updated_by`, with a `for all … using
(true) with check (true)` policy, passed `migrate-clean`, `db-schema-lint` and rls-smoke, and the
owner updated it (UPDATE 1). The observation is broader than attribution: nothing I ran refuses a
client-reachable table outside `app` at all.

**Remedy.** Scope both rules to every non-system schema where `authenticated` holds USAGE, or add
one assertion that no client role holds a table privilege outside `app`. Until then, the README
sentence "a table that grants UPDATE on `updated_by` without the closure fails twice" should say
"an `app` table".

### F7: NOTE. Side effects and wording, none of them a weakness

- **The count's stated purpose.** `123_…sql:103` says the count exists "so a table that silently
  stops granting the column is noticed too". It counts policies by name, not grants. H-D17 revoked
  the grant and kept the policy, and `migrate-clean` stayed green; rls-smoke noticed through five
  positive cases. That is the safe direction, so only the sentence is wrong.
- **Upgrade over real data.** 123 validates the pair at `add constraint`, so on a database that
  already holds a forged cancellation it fails and rolls back (measured). If 123 is ever applied
  where approvals exist, a reviewed remediation (null the decider on cancelled rows, and record
  which rows) must run first. It is inert today: 123 is declared not applied to the instance.
- **Names in errors.** A client refused by the CHECK learns the constraint name. When a permissive
  policy has admitted the row, a client refused by a restrictive closure learns the policy name.
  Neither carries row data.

### F8: MEDIUM if RFC-2026-025 is approved as written (governance; not in effect). The record-only rule lets a security-relevant change merge with no independent reading

**What.** Rule 3 (`RFC-2026-025…md:45-49`) exempts from role runs any PR whose diff touches only
`evidence/**`, the handoff, the branch-slot lines, and "open-blocker text in the package's own
manifest". §2.4 (:50-51) says the RFC "moves the button, not the judgement". For this class of PR
rule 3 removes the judgement: RFC-2026-002 clause 2 (:23-26) requires, per merge, the Reviewer,
Tester, conditional reviewer and **Integration Owner** verdicts. The RFC's `Amends:` line (:9)
names only clause 3's sentence.

**How a security-relevant change dresses as record-only** (read, not executed):

1. **Blocker text is the risk register.** Deleting, rewording or re-grading an open blocker says a
   known weakness is closed. The decided_by blocker was removed in this very commit, correctly,
   because 123 is the fix under review here. A record-only PR could remove the `created_by` item,
   or F3 once recorded, with nobody reading it.
2. **The manifest is more than blocker text, and every record-only PR changes more.** #154, #158 and
   #160 each changed `ownership.branch`, and #154 and #160 also changed
   `ownership.amends_without_owning` (`git diff` of `b07a8d9` and `5922684`). None of these fields
   is in rule 3's list, so either every past record-only PR falls outside the rule, or the rule will
   be read as "the manifest". Read that way, it admits:
   - `writable_paths` and `amends_without_owning`, which the CI branch-scope guard reads **from the
     PR's own head** (`scripts/verify-branch-scope.mjs:120`). A widening merged record-only becomes
     the scope the next PR is judged against, and that PR's reviewers never see it.
   - `review_and_test_gates` and `role_assignments`, which decide which role runs rule 1 requires.
     That is circular.
   - `security_privacy` and `status`.
3. **Some evidence files are signatures or authority.** RFC-2026-013 made an agent run's assessment
   that role's signature (`test-kits/authority-dispositions.test.mjs:8-10`), and the
   `product-owner-disposition-*` files are the Author's transcription of the Owner's words, which
   later merges cite as authority. Under rule 3 the Author could add or edit a role verdict or a
   disposition record with no role run. `git log` shows every commit authored under the Owner's
   own account (three name and address variants of it), whether an agent or the Owner made it, so
   nothing else distinguishes who wrote a file.
4. **State records steer the next run.** A "read this first" record that drops an owed security item
   (the ninth-pass §4 lists `created_by`) removes it from the next run's plan. The weak-assertion
   survey, 345 lines, merged record-only in #158, and it then drove batches 105 and 123.
5. **`evidence/**` is where the privacy scanner is weakest.** `scan-repository-secrets.mjs:24`
   relaxes the EMAIL rule for `evidence/` and `handoffs/`, which are exactly the record-only paths,
   and session transcriptions are the files most likely to carry a personal address.
6. **A test file is in the list.** `test-kits/branch-identity.test.mjs` is executable test code. A
   line-based carve-out in it is only as good as whoever checks that the diff is the slot string and
   nothing else. `evidence/VERIFICATION.md` is under `evidence/**` but is digested in
   `integrity-manifest.json` by a line that is not a branch-slot line, so rule 3 contradicts itself
   on that file.

**Tightening (recommendations; the decision is the Owner's):**

- (a) Define record-only by a **mechanical** check whose output is quoted before the merge, owned
  by the Integration Owner (for example a `scripts/verify-record-only.mjs` beside
  `verify-disposition-branch.mjs`). It should accept only:
  - added files under `evidence/<own package>/`, and no modified or deleted evidence;
  - the handoff;
  - the exact slot-string replacement in `branch-identity.test.mjs` and its one hash line;
  - in the manifest, `ownership.branch`, `amends_without_owning` equal to exactly those two files,
    and `open_blockers` entries **appended or annotated**, where each old entry survives as a
    substring of its new text.
- (b) Any blocker removal, re-grade or "closed" annotation is not record-only unless it cites the
  merged PR and the role run that discharged it.
- (c) Role-verdict files (`a1-*`, `c0-*`, `q0-*`, `r0-*`) and `product-owner-disposition-*` files
  are never record-only. A role run commits its own verdict on the branch it reviewed, as this one
  does.
- (d) Record-only PRs still need one light reading for privacy (the scanner does not cover
  addresses in evidence), by any independent run or by the Owner.

### F9: LOW if RFC-2026-025 is approved as written (governance; not in effect). Delegated merge: the conditions are sound in kind, but the Author checks every one of them

**What.** Rule 1's conditions (`RFC-2026-025…md:34-43`) are the right ones: green CI on the head,
a merge pinned to that head, role runs present, the handoff last, the Owner's words quoted. But:

1. **"Or on a head whose later commits are that role run's own findings"** (:40-41) lets the
   Author's fix commits merge unread. The Author also decides that a later commit is only a fix. On
   105, the fix commit `f82a70d` changed the general rule itself.
2. **"No stop-the-line finding is unresolved"** (:41) is narrower than RFC-2026-002 clause 4 (:31-34),
   which blocks on any "unresolved security finding". The RFC says it does not change the
   stop-the-line requirement, and says nothing about clause 4's wider one.
3. **Green on the head is not green on the merge.** CI checks out the branch, not the merge result.
   `ci.yml:52` justifies that with "branch protection is strict, so a head must already contain
   main". Branch protection is exactly what this repository lacks (RFC-2026-002). The live coverage
   rule and the closure count are cross-PR invariants of the kind a stale base breaks.
4. **The delegation is the Author's reading of the Owner's words, recorded afterwards** (:43). The
   words that carried #161 ("คุณลุยงานทั้งหมด ตามที่คุณแนะนำ เลยได้ไหม") predate the PR that carries
   this RFC. Under rule 1's "stated sequence of PRs", this RFC's own PR could be merged on words
   spoken before its text existed. The RFC says, to its credit, that "the Owner has not seen this
   text" (:5).
5. **The Integration Owner's verdict**, required per merge by RFC-2026-002 clause 2, is not among
   rule 1's conditions unless "role run" is read to include `/claude/r0_steward`.

**Tightening (recommendations):**

- (a) Fix commits after a role run need that role's delta confirmation on the final head. For a
  Security finding, that means re-running its exploit, which is cheap.
- (b) State how clause 4 applies: a Security finding its reviewer names as a condition blocks the
  merge; findings named as not conditions are recorded as blockers **before** the merge.
- (c) Require the head to contain the current `main` tip at the moment of the merge
  (`git merge-base --is-ancestor origin/main <head>`), or re-run CI.
- (d) Put the delegation in the PR, before the merge, naming PR numbers or head SHAs. Words spoken
  before a PR existed delegate nothing for it.
- (e) Name the Integration Owner verdict as a condition.
- (f) Exclude governance changes from delegation. A PR that adds or changes an RFC's text or status,
  CI, or the merge rules is merged by the Owner's own hand. RFC-2026-025's own disposition should
  cite its digest (`integrity-manifest.json`: `6f15c351…`), so the approved text is the reviewed
  text.
- (g) A stop-the-line finding should revoke the delegation for the rest of a stated sequence, not
  only for that PR (:44).

## 5. Stop-the-line verdict

**No stop-the-line condition found in `5856f0b`.**

- **Tenant leakage:** none. The new policies have no USING and can only narrow. The other tenant's
  owner reaches 0 rows on all seventeen tables on both trees, and rls-smoke's cross-tenant cases pass
  (977 of 977).
- **Secret exposure:** none. The diff's added lines carry no credential shape, connection string
  with a password, private URL or personal address (grep of `git diff e276c9a 5856f0b`). Client
  errors from the new CHECK carry no row data.
- **Migration divergence:** none. No integrated migration was edited. 123 applies in its numeric
  place, fails loudly on a re-apply or over forged data, and rolls back as one file.
- **Contract mismatch:** none new. The only behaviour change is that the forgeries of §2.3 are
  refused.

F3, F4 and F5 (LOW) and F6 and F7 (NOTE) are for the Owner to schedule. None of them is a condition
I place on batch 123. F8 and F9 are about an RFC that is Proposed and in effect nowhere. They are
recommendations for its disposition, not conditions on this PR, and they grade what the rules would
permit if approved as written.

## 6. Limits of this run

- The shim is not Supabase. I measured policies, grants and constraints, not the platform (§2.4).
- My identities were the fixture's. I did not create members with other roles or scopes.
- The upsert path was measured on the two of the ten tables that have one, plus two of 105's seven.
  `created_by` was measured on fifteen of seventeen tables; for the other two I rely on the catalog.
- The RFC findings rest on reading and on the git history, not on executing a delegated or
  record-only merge.
- I did not run `npm run check`, the handoff guard, the branch-scope guard or the role-separation
  validator. Those belong to C0, Q0 and the Integration Owner.
- The base measurement used a temporary local branch, not a detached HEAD. I measured the database,
  not the handoff guard.
- The Author wrote this brief, and I am the same model family (§0).
