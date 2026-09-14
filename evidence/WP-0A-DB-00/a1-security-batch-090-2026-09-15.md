# A1 Security/Privacy review — batch 090 (`approval.core`), Draft PR #119, not merged

Run: `/claude/a1_bastion_090`
Role: independent Security/Privacy reviewer for batch 090, one of the nine role runs the Product
Owner ordered under Q6 of
`evidence/WP-0A-DB-00/product-owner-disposition-2026-09-15-six-questions.md`, working in the role
`work-packages/WP-0A-DB-00.json` `role_assignments.security_reviewer_agent_run_id` names.
Subject: `origin/agent/claude/WP-0A-DB-00-batch-090` at `6c113ae` (= the head of Draft PR #119,
`gh pr view 119 --json headRefOid`), five commits `3d00c00`, `7feb7d3`, `9275c83`, `496f43a`,
`6c113ae` over base `c5eb1b9` (`git merge-base main origin/agent/claude/WP-0A-DB-00-batch-090`).
Read from the remote-tracking ref only; the branch was never checked out.
Base of this review: `main` = `0dc640f` (merge of PR #128, batch 082).
Date: 2026-09-15.

**This document records findings. It advances no package status, writes `security_approved`
nowhere, and repairs nothing it found.** One file is added by this run and nothing else changes:
no migration, no test, no case, no manifest, no handoff.

---

## 0. What I am, before anything else

**I am a subagent spawned by `/claude/a0_atlas`, the run the manifest names as Author of this
package, and I run in the same vendor and model family.** A0 wrote the two briefs I was given,
chose what to point me at — the S8 shape above everything else — and chose the base and the
subject. The batch itself was written by `/claude/a5_loom` "as the run the manifest names as
Author", per `a5-batch-090-probes-2026-09-13.md:3`, so the work under review and the brief that
directs the review both come from the same lineage as this reviewer.

What that does **not** weaken:

- Every claim below that is a *measurement against the tree* carries the command or the
  `file:line` a reader needs to repeat it. A `grep -n` over `090_approval.sql` returns the same
  three `for all to authenticated` lines on any machine, whoever asks for them.
- The stop-the-line finding is one A0's brief predicted. That is not confirmation of the brief; the
  brief said "determine whether this batch has the SAME shape and say so explicitly either way", and
  I measured both directions (§2.2) before saying which. Where the brief is wrong I say so:
  brief-common says main received PRs #121–#128 "none of which touches the batch's tables"; that is
  true, and it is also the problem — 082 touches five tables and not these three (§2.3).
- Findings S13, S15, S19 and S20 are ones the brief did not point me at.

What it **does** weaken, and I cannot fix from inside:

- **Framing.** I pressed hardest where the brief pointed and worked outward. A defect neither A0 nor
  A5 nor I thought of is one I probably did not find. §12 lists what I did not check.
- **Shared blind spots.** The class of error this whole package keeps finding in itself — a
  confident sentence about PostgreSQL internals that reads as correct and is inverted — is exactly
  the class a same-family reviewer is worst placed to catch. I caught the instances here (§3)
  only because `main` already carries the correction in `082_content_service_path_closed.sql:34-41`
  and I could compare text to text. A new claim of the same shape with no corrected sibling on
  `main` is one I would likely have passed.
- **Independence in the protocol's sense, as the Owner has now defined it.** Under Q1 the
  cross-vendor condition is withdrawn and "a same-vendor run in a distinct role now counts as that
  role's signature". This run is distinct from `/claude/a0_atlas` and from `/claude/a5_loom` and
  it is in the named role. **What it signs is stated in §14 and it is not an approval**: a
  Security/Privacy signature on a batch with an open stop-the-line is a signature that says
  *do not merge this yet*, and that is the one this file gives.
- **No database.** This machine has no PostgreSQL. Every runtime statement below is reasoning from
  documented PostgreSQL 17 semantics plus the batch's own CI runs, which I read and did not
  produce: run `34754270555` at `496f43a` and run `34754553767` at `6c113ae`, both `success`
  (`gh run list --branch agent/claude/WP-0A-DB-00-batch-090`). **Both ran against base `c5eb1b9`,
  before 082 existed** — see S17.

---

## 1. Verdict in one sentence

> **Batch 090 has exactly the shape finding S8 named on batch 080 — every narrowing is `for all
> to authenticated` and binds no service role, the migration states twice that the narrowings will
> bound the `app_command` writer it is waiting for, and batch 082's closure reaches five content
> tables and none of these three — and unlike 080 it is not yet integrated, so this is the last
> moment the defect can be closed inside the migration that creates it rather than by a forward
> fix that cannot rewrite it.**

Stop-the-line: **yes**, on S11.

---

## 2. FINDING S11 — HIGH, **STOP-THE-LINE**. Batch 090 is the S8 shape, and 082 does not reach it

### 2.1 The belief

Stated twice in `090_approval.sql`, in the same two places 080 stated it:

1. `:611-616`, on why the narrowings carry a WITH CHECK half on a table no client may write:
   > "It is written anyway, for the direction a mistake travels — if a later batch grants a write
   > here, a narrowing with no WITH CHECK would admit that write for every active member of the
   > workspace, including one the row's own content item is hidden from."

2. `:1128-1135`, in the ownership assertion:
   > "the writer app.approval_events is waiting for is a SECURITY DEFINER function owned by
   > app_command: if app_command also owned the table, that function would be exempt from the
   > policies above by ownership and **the narrowings would bound nothing it does** — and this is
   > the one table in the schema whose entire integrity claim rests on who may write it."

The contrapositive is the control the repository believes it has: because `app_command` is kept
off the owner seat, **the narrowings bound what the command function does.**

### 2.2 The measurement, in both directions

Every policy the batch writes names one role:

```
$ grep -n -E '^\s*(for (select|insert|update|all) to|as restrictive)' 090_approval.sql
496:  for select to authenticated
500:  for select to authenticated
504:  for select to authenticated
511:  for insert to authenticated
518:  for update to authenticated
531:  for insert to authenticated
560:  for update to authenticated
581:  for update to authenticated
619:  as restrictive
620:  for all to authenticated
640:  as restrictive
641:  for all to authenticated
670:  as restrictive
671:  for all to authenticated
```

Three restrictive narrowings, `:620`, `:641`, `:671`, all `for all to authenticated`. The batch
asserts at apply time that no policy on the three tables names any of `anon`, `app_worker`,
`app_command`, `app_maintenance`, `app_authz` (`:940-952`), and CI confirms the assertion held
(`applied 090_approval.sql`, run 34754270555). So the narrowings apply to `authenticated` and to
its members — and `app_command` is not a member of it: the only role-membership grant in the
foundation is `grant app_authz to postgres` (`011_authorization_helpers.sql:176`), and
`app_command` is created `nologin nobypassrls noinherit` with no membership
(`001_service_roles.sql:39`).

**Documented behaviour:** a policy applies to the roles its `TO` clause names and their members,
and to no other role. A RESTRICTIVE policy `TO authenticated` does not apply to `app_command`,
whatever permissive policy `app_command` is later given.

The other direction, so "same shape" is a finding and not an echo: I looked for anything in the
batch that closes the path 082 closes. There is none. `grep -c` over the batch's added lines for
`S8`, `082_content`, `batch 082` and `a1-security-batch-080` returns **0**. The batch was cut at
`c5eb1b9` and contains no knowledge that S8 was found, that 082 exists, or that the Owner chose
shape C for this defect class (disposition Q3).

### 2.3 Why 082 does not cover it

`082_content_service_path_closed.sql:150-152` declares
`content_tables := array['content_ideas','content_items','content_versions','content_variants','quality_reviews']`,
writes its five closures on those five tables (`:97-125`), and scopes all four of its apply-time
assertions to that array — including assertion 2 (`:203-235`), which states "the general rule S8
is a violation of" and checks it **on content tables only** (`:219-220`). The rule is general; the
assertion is not. `app.approval_policies`, `app.approval_requests` and `app.approval_events` are
outside every array in 082.

So after 082 merged, `main` holds five tables where the rule holds by construction and, the moment
090 merges as it stands, three tables where it holds "by accident of TO" (082's own phrase,
`:207`) — the precise state 082 was written to end.

### 2.4 Therefore, and what is different from 080

When the writer 090 waits for arrives — a `SECURITY DEFINER` function running as `app_command`,
carrying the permissive INSERT policy on `app.approval_events` that RFC-2026-017 §3 requires
(`RFC-2026-017-service-path-identity.md:55-58`, "needs policies that name it") — **the narrowing at
`:669-705` does not apply to it.** Its only bound is whatever its own permissive policy says. The
two-link chain through request and item that the fixture was shaped to falsify
(`090-approval-fixture.sql:83-90`) and that the apply-time block checks half by half (`:1043-1090`)
bounds `authenticated` and nobody else.

**Exposure, honestly tensed.** Nothing is reachable today: `app_command` holds no grant, no policy
and no function on any of the three tables, and 090 asserts the first two at apply time
(`:757-778`, `:785-798`, `:940-952`). The defect is latent with a live trigger, and the trigger is
sharper here than on content: `app.approval_events` is the audit trail of the approval gate, the
one table 090 says "whose entire integrity claim rests on who may write it" (`:1134-1135`), and
the only writer the design contemplates is the one the narrowing does not name. An implementer who
reads `:611-616` and `:1128-1135`, believes them, and adds the permissive policy §3 requires ships
a trail writer that can record a decision under any request in any workspace.

**What is different from 080, and it is the reason this is the moment to stop:** 080 was integrated
before S8 was found, so the only remedy was a forward migration (082) that could not touch the
text that licensed the defect. **090 is a Draft PR.** Migration invariant 1 ("never rewrite an
integrated migration") does not bind it yet. The closure — or a recorded Owner decision that
approval's closure is a separate `09x` — can go into the file that creates the tables, beside the
sentences that need correcting, before anything is unrewritable. Merge it as it stands and the
repository integrates the S8 shape a second time, three days after paying a migration to close it
the first time.

**What the forward path must do** (recorded so it is not rediscovered; I repair nothing): under
Q3 the Owner chose shape C — one RESTRICTIVE policy per table, `for all`, no `TO` clause,
`using (current_user = 'authenticated')` on both halves — with shape B (an acting-user narrowing
through a fail-closed helper) owed as an RFC to the first command-function batch. Whether approval
takes shape C inside 090 or in its own migration is the Author's and the Owner's to decide; that it
is decided *before* 090 merges is what this finding asks. 082's own hint applies unchanged: a
closure that names a list of roles instead of PUBLIC "misses the next role, which is finding S8
with a different spelling" (`082:185`).

### 2.5 An interaction with 082 that the forward path must know about — INFO

090's two chain narrowings resolve through `app.content_items` inside a subquery (`:644-653`,
`:674-687`). PostgreSQL applies row security to tables referenced inside policy expressions, so
those subqueries run under `content_items`' own policies — which, since 082, include
`content_items_service_path_closed` (`082:103-107`). For `authenticated` the closure is true and
nothing changes; CI on `main` at `0dc640f` (run 34886116217, success) is the measurement. For any
role that is not `authenticated`, the subquery sees zero rows, `exists` is false, and the request or
event is refused. **Fail-closed, and worth writing down:** a future shape-B narrowing on
`app.approval_requests` or `app.approval_events` that names `app_command` will be refused by 082's
closure on `content_items` until content's own shape B lands. The two families' service paths are
coupled through this chain, and the coupling runs in the safe direction.

---

## 3. FINDING S12 — HIGH. The sentence `main` just corrected is written three times into a migration that will become unrewritable

`082:34-41` records that "exempt from these policies by being the owner" is false, found so
independently by C0 and A1, and corrects every editable copy: the test message
(`identity-isolation.test.mjs:8995` on `main` now reads *"this message read 'exempt by ownership'
until batch 082"*), `scripts/db/run.mjs`, and the manifest blocker
(`work-packages/WP-0A-DB-00.json:332` on `main` carries a bracketed `[CORRECTED 2026-09-15 by batch
082 …]`). A static test on `main` pins the correction
(`identity-isolation.test.mjs:9229-9242`).

Batch 090 writes the false form three times into `090_approval.sql`:

```
$ grep -n -i 'exempt' 090_approval.sql   (comment lines about FORCE and app_authz omitted)
93:  -- command function owned by `app_command`, which is exempt from these policies by being the owner
895: -- SECURITY DEFINER command function owned by `app_command`, exempt from these policies by being
1133:-- function would be exempt from the policies above by ownership and the narrowings would bound
```

`:92-94`, `:894-896`, `:1131-1134` — the same three positions 080 used (header, `app_worker`
rationale, ownership assertion). The weaker true form ("a SECURITY DEFINER command function owned
by app_command (RFC-2026-017 §3) and none exists (RFC-2026-021 §10)") is what the table comment
(`:417-418`), the hint (`:795-797`) and the batch's new manifest blocker use — **those are correct
and I record them as correct.** The three header instances are the ones that will be read by
whoever opens the migration to write the command function, and they are the ones that make S11
look principled: "exempt by ownership" is what makes "the narrowings bound it because it is not the
owner" sound like a mechanism.

**Why HIGH rather than MEDIUM:** the sentence is not merely false, it is *known* false on the
branch's own target, with the correction and the reason in a file the batch will sort beside
(`082` precedes `090`). Nothing on `main` catches a fourth copy arriving — `:9229-9242` reads
082's header and `run.mjs`, not new migrations — and once 090 merges the three copies are
uneditable for the same reason 080's are. The window to fix a migration header is before it is
integrated, and that window is open now.

**Also on `main`, outside 090's diff — S20, INFO:** 082 said it corrected "the editable copies" and
missed one. `tests/db/identity/isolation-cases.mjs:11682` on `main` still reads *"exempt by
ownership rather than by privilege"*, in a file 082 could have edited and 090 edits. The static test
at `:9229` does not read that file. Owed to whoever next touches `isolation-cases.mjs`; recorded
here because 090's diff to that file is the natural place and it does not do it.

---

## 4. Tenant isolation and deny-by-default — reviewed per table, per role, both layers

**For `authenticated`, I found no tenant-isolation hole on any of the three tables.** Everything
in this section is conditioned on that role, which is the only role any policy names — and that
condition is S11. What I checked, positively:

### 4.1 Grant layer

| grantee | `approval_policies` | `approval_requests` | `approval_events` | asserted where |
|---|---|---|---|---|
| `authenticated` | SELECT 14 cols; INSERT 11 cols; UPDATE `enabled, updated_at, updated_by` (`:453-462`) | SELECT 14; INSERT 8; UPDATE `status, decided_at, decided_by, updated_at, updated_by` (`:470-478`) | SELECT 12 cols only (`:482-484`) | decision/pin columns not updatable `:812-845`; `status`/`decided_*` not insertable `:851-869`; no DELETE for any role `:875-888` |
| `anon` | nothing | nothing | nothing | `:917-930`, all four privileges |
| `app_worker` | nothing | nothing | nothing | `:904-915`, all four privileges |
| `app_authz` | nothing | nothing | nothing | `:1118-1126`, **SELECT only** — see S19 |
| `app_command` | nothing | nothing | nothing | INSERT/UPDATE/DELETE on `approval_events` `:757-778`; decision columns `:812-845`; DELETE `:875-888`; **no general sweep** — see S19 |
| `app_maintenance` | nothing | nothing | nothing | same three as `app_command` — see S19 |

No `GRANT … TO PUBLIC`, no `GRANT ALL`, no `ALTER DEFAULT PRIVILEGES`, no schema `USAGE` grant, no
`BYPASSRLS`, no `CREATE TRIGGER` anywhere in the file (`grep -c -i` for each: 0). Every grant is
column-scoped and enumerated (RFC-2026-021 M3's reason, `:441-444`).

### 4.2 Policy layer

- **ENABLE + FORCE on all three** (`:429-436`), asserted against `relrowsecurity AND
  relforcerowsecurity` — two catalog columns — at `:739-747`. Correct, and the assertion that makes
  the rest of the model true.
- **SELECT** is `app.is_active_member(workspace_id)` on all three (`:495-505`); a suspended member
  is refused (cases `suspended-a-cannot-see-*`, three of them). After A5's probe 18 the static
  rule at `identity-isolation.test.mjs:9396-9404` (batch) pins the predicate on every SELECT
  policy, and the count of permissive policies is pinned at **8** (`:9390`).
- **INSERT** on the two writable tables checks `created_by = (select auth.uid())` and the role
  §8.3 names (`:510-515`, `:530-535`); `app.workspace_member_role(workspace_id)` resolves the
  caller's role *in the named workspace*, so a non-member gets no role and the predicate is false.
  Composite FKs pin `business_profile_id` to the workspace (`:252-254`, `:330-332`) and the page
  override to the business (`:255-257`); `content_version_id` is pinned over **four** columns
  (`:333-336`), asserted by `conkey` degree (`:1098-1113`), so a request cannot pin another item's
  version in the same tenant. `policy_version_id` is a scope-path FK (`:337-339`). **No id-alone
  cross-tenant FK exists in this batch** — the S3 shape 080 carried is absent here, and I checked
  every `references` clause.
- **UPDATE** is two permissive policies whose WITH CHECK halves each carry their own role test and
  their own admitted values (`:559-591`); the reasoning at `:548-554` about OR-ed permissive
  policies is correct, and the two crossed cases (`editor-a-cannot-decide-…`,
  `approver-a-cannot-cancel-…`) executed as `denied` in CI, which is the only reading under which
  the WITH CHECK halves were reached. `USING … status = 'pending'` on both means a decided row is
  matched by no UPDATE policy and is immutable at the policy layer; the fixture's `approved` row
  (`090-approval-fixture.sql:223-232`) is what makes that testable.
- **The decider names itself**: `decided_by = (select auth.uid())` (`:588`), and
  `approval_requests_decision_has_a_decider` (`:327-329`) is an *equivalence*, so a cancellation
  cannot carry a decider and a decision cannot omit one. Good.
- **RESTRICTIVE narrowings**, both halves on all three (`:618-705`); the three child WITH CHECK
  bodies are textually identical to their USING bodies — compared line by line. The page override
  falls to the business question on NULL rather than to `true` (`:622-625`), in all six halves.
  The event narrowing reaches the item through the request (`:673-687`), which is the link the
  sibling-page rows exist to falsify, and CI's negative control noticed exactly that case
  (`pinned-editor-a-cannot-see-the-approval-event-of-a-sibling-target-item`, run 34754270555).
- **`app.approval_events` has no write policy and no write grant, asserted both ways**
  (`:757-798`). A grant with no policy is refused by RLS; a policy with no grant is inert; the
  batch asserts neither exists, which is 080's §8.2-row-3 shape done correctly.

**Documented-behaviour note, not a defect:** the narrowings' subqueries into `app.content_items`
and `app.approval_requests` are themselves under those tables' RLS. Additive only — it can narrow,
never widen — and it means the approval chain depends on `content_items` keeping a SELECT policy
for `authenticated`. If a future batch removed it the approval family would become unreadable
rather than over-readable. Fail-safe, and §2.5 is the same property seen from 082's side.

---

## 5. FINDING S13 — MEDIUM. `requested_by` is a client-chosen column that no policy checks and no case exercises alone

`:474-476` grants `requested_by` in the INSERT column list. The INSERT policy `:530-535` checks
`created_by = (select auth.uid())` and the role, and **nothing else**. `requested_by` is deliberately
outside the UPDATE grant (`:477-478`; asserted non-updatable at `:831-833`, "a request cannot
change hands after the fact") — so a forged value cannot be corrected later either.

The suite does not exercise it. The builder `approvalRaiseRequest`
(`isolation-cases.mjs:13854-13861`, batch) writes `requested_by`, `created_by` and `updated_by`
from **one parameter** (`$5` three times); the forge case
`owner-a-cannot-forge-the-actor-on-an-approval-request` (`:12572-12584`) changes that one
argument, so the refusal is attributable to `created_by` and the case's own `why` says so. A
statement with `created_by = self, requested_by = someone else` is issued nowhere and is admitted
by every policy. The new static rule (`identity-isolation.test.mjs:9405-9413`, batch) requires
`created_by` on INSERT policies and does not mention `requested_by`.

**Same-tenant only** — the narrowing and the membership predicate hold — so this is attribution,
not isolation. Why MEDIUM rather than LOW: §4.7 names this column as *who requested*, an approver
reads it to know whose work they are deciding, and an editor can make a request appear to come
from the owner. On the family whose whole purpose is a decision about somebody's work, the
column that says whose is the one that should not be free.

**Related, LOW, the S4 siblings:**
- `updated_by` is in both INSERT grants (`:457-459`, `:474-476`) and checked on UPDATE only
  (`:522`, `:566`, `:587`) — 080's S4 exactly, on two more tables.
- `decided_at` is in the UPDATE grant (`:477`) and the decide policy constrains `decided_by` but
  not `decided_at` (`:586-591`), so a decider sets the decision timestamp to anything; the
  constraint only requires it non-null. Audit ordering on a trail with retention keyed on it
  (`:344-346`, "the column batch 160's sweep reads").
- `updated_at` is in both UPDATE grants (`:461`, `:477`) and there is no trigger in the batch.
  `created_at` and `occurred_at` are correctly absent from every client write grant.

---

## 6. FINDING S14 — MEDIUM. The read surface exposes `approval_events.comment` to every active member, and the projection the classification asks for cannot yet be built

The batch records this as a blocker "owed to A1 Security/Privacy and to Product"
(`work-packages/WP-0A-DB-00.json`, batch diff, the `§8.3 HAS NO SELECT ROW …` entry). This is that
role answering.

**What is granted.** SELECT on all twelve columns of `app.approval_events` to `authenticated`
(`:482-484`), including `comment` — which `:378-384` names as "the one column in this batch that
holds free text a person typed about another person's work, under a family §5 classes AUTH-3" —
and `actor`. The SELECT policy is `is_active_member` (`:503-505`), so a **viewer** reads the
decision trail, with reasons, on every item their scope admits. §8.3 has no SELECT row for the
family; the batch derives the read from three sentences and says so (`:122-146`).

**My reading.** The read is within-tenant, bounded by membership and by the scope narrowing, and I
verified both (§4). It is the same base-table-SELECT shape every family since 010 has used, which
RFC-2026-021 §8.5 names as the inherited exception class rather than as an allowlist entry. So it is
not a tenant leak and it is not stop-the-line. Three things are true beside that:

1. **AUTH-3's stated projection is "minimum role projection" and none exists.** A column grant is
   per-role at the PostgreSQL level and every client is `authenticated`, so the only lever that
   can show a viewer less than an approver is a view — RFC-2026-021 §3's five objects and one
   registry row (`RFC-2026-021-client-read-allowlist.md:142-173`), authored by the family owner in a
   new batch, **countersigned by A1 Security**, approved by RFC (§7/1, `:369-372`).
2. **The registry that would hold it does not exist.** `ls db/foundation/lint/read-allowlist.json`
   on `main`: `No such file or directory`. RFC-2026-021 §8.1 (`:408-419`) makes it "an empty array
   on approval"; it was never created. **RFC-2026-021 §8 is unimplemented on `main`**, which is a
   finding about the repository and not about 090, and it means 090 *could not* register a
   projection even if it had written one — the batch's sentence at `:143-145` is correct.
3. **This is the first column of its kind.** Every earlier free-text column exposed to a viewer is
   the tenant's own content; `comment` is one member's words about another member's work. §15
   requires Product, Security and Legal approval before Paid Beta; **the projection, or an explicit
   Owner decision that viewers read reviewer comments, is owed before that gate**, and this file
   records the Security half of that as owed rather than as given.

**What I do not ask for:** widening nothing, narrowing nothing in 090 itself. A view with a
registry row is the right object and 090 is not the batch that can create it.

---

## 7. RFC-2026-022 — what the batch classifies, and declines to

`db/foundation/lint/service-policy-map.json` gains one prose note, `_what_batch_090_classified`,
and no `cells` row (batch diff, `service-policy-map.json:30`). The note's ground: RFC-2026-022 §3
classifies §8 **`S`** cells (`RFC-2026-022-service-policy-shape.md:148-200`), §8.3's Service column
is `P` on three approval rows and `N` on the fourth, and "a `P` with no capability defined is not an
`S`". I checked the four rows the migration quotes (`:76-79`) and the reasoning follows 080's and
132's precedent exactly. **Agreed**, with two notes:

- §7.1/6's both-directions rule ("a policy with no row is a finding, a row with no policy is a
  finding") is satisfied by there being neither — the note says so and it is right.
- The note ends by naming the cost: "the natural producer of an approval event is a worker, §8.3
  row 4 refuses it, and the SECURITY DEFINER command function that row points to does not exist —
  so nothing in this repository records a decision, while the requests beside it can be decided
  freely." That sentence is true and is the product consequence of §8.3 row 4; it is not a
  security defect and I do not file it as one. The security defect is what happens when the
  function *does* arrive — S11.

Nothing in the batch cites the `app.workspace_id` confinement term as tenant isolation (§5/4's
prohibition); I grepped the migration, fixture and cases for `current_setting` and `workspace_id',
true` and found nothing.

---

## 8. The three repairs RFC-2026-017 §4 forbids — none taken, and one assertion is narrower than 082's

RFC-2026-017 §4 (`:64-67`): the temptation is "to silence it by widening a grant". A1's 080 review
named the three cheap forms and 082 asserts against all three (`082:257-281`). On 090:

| repair | taken? | evidence |
|---|---|---|
| grant `app_command` `BYPASSRLS` | **no** | `grep -c -i bypassrls 090_approval.sql` → 0 |
| drop FORCE | **no** | `:429-436`; asserted `:739-747` |
| make `app_command` (or `app_authz`) the table owner | **no** | asserted `:1136-1145` |

**S19 — LOW.** 090's service-role privilege sweep is uneven. `app_worker` and `anon` are swept for
all four privileges (`:904-930`); `app_authz` for SELECT only (`:1118-1126`); `app_command` and
`app_maintenance` only through the append-only, decision-column and DELETE assertions
(`:757-778`, `:812-845`, `:875-888`). A later `grant insert on app.approval_policies to
app_maintenance` would pass 090's block — `:940-952` catches a *policy* naming a service role, not
a *grant* to one. 082 widened the equivalent sweep on content to all five roles and all four
privileges (`082:237-255`, "the claim that the closure is inert today rests on it"). The same
widening belongs beside whatever closes S11 on approval; recorded so the forward path carries both.

---

## 9. Secrets, PII, fixtures — clean

- **Scanner.** The batch's eighteen files, extracted from the remote ref into a scratch tree
  (`git archive origin/agent/claude/WP-0A-DB-00-batch-090 <paths> | tar -x`), run through
  `node scripts/scan-repository-secrets.mjs <tree>`: **exit 0**. `npm run scan:secrets` on this
  review branch: exit 0.
- **Identities.** All six new `fixture-catalog.json` symbols recompute as
  `uuid5(6ba7b810-9dad-11d1-80b4-00c04fd430c8, 'thinkbizthai.fixture.' || symbol)` — `approval_request_a1`,
  `_a1_page`, `_a1_sibling_page`, `_a1_decided`, `_a2`, `_b1`: 6/6 match; the 75 pre-existing
  identities: 75/75. Nothing is invented.
- **Fixture content.** `comment` is `NULL` on every event (`090-approval-fixture.sql:261-276`;
  `:110-113` says why); `action`, `request_id`, `correlation_id`, `idempotency_key` are
  `fixture-*` strings; timestamps are `2026-09-11 04:00`/`05:00+00`; `step` is `NULL` throughout.
  No email, phone, national id, token, key or credentialed URL in any of the eighteen files. The
  one email-shaped and one credentialed-URL-shaped string the regex sweep found
  (`test-kits/db/foundation-contract.test.mjs:135`, `postgresql://user:hunter2@db.example.invalid`)
  is pre-existing on `main`, synthetic, and is the redaction test's own input.
- **`.env`, `*.pem`, `*.key`, `*.p12`, `*.pfx`** — none tracked, none added on any ref.

**S16 — INFO, the S9 sentence again.** "NOTHING IN THIS REPOSITORY CAN WRITE AN APPROVAL EVENT"
(`:97-98`, `:418-419`, and the new manifest blocker) is literally false in the way S9 found on
080: `090-approval-fixture.sql:258-277` inserts three events on every CI run, as the migration
connection — `postgres` in the CI container, superuser, owner, `BYPASSRLS`. **The fixture itself is
honest about this** (`:115-120`, `:248-252`: "THIS IS THE ONLY WAY THESE ROWS CAN EXIST … loads as
the table owner"), which 080's fixture was not; the migration and manifest sentences are the ones
that still say "nothing". The true sentence: *no identity the access matrix describes can write an
approval event; only the migration superuser can, and it does on every CI run.*

---

## 10. FINDING S15 — LOW. The runtime suite exercises one service role; the apply-time block covers five

`private.as_service()` sets `role` to `app_worker` and nothing else
(`db/foundation/test-helpers/auth-context.sql:95-103`). All seven `service-cannot-*` cases in the
batch run as that role and are `deniedBy: 'grant'`; no case runs as `app_command`,
`app_maintenance` or `app_authz`. That is the repository's standing shape and 140 recorded why
changing the helper would change every existing service case (`140_audit.sql:249-256`). The
apply-time block does assert the grant and policy layers for all five service roles on the cells it
names (§4.1), so the gap is between what CI *executes* and what it *asserts*, not a hole in either
layer — but a reader of the 712-case pass count should know that `app_command` was never a
session in any of them.

---

## 11. FINDING S17 — INFO. The CI evidence predates 082, and the batch's CI amendment predates the Q4 fix

- Both green runs on the branch — `34754270555` (`496f43a`, the one the batch's evidence cites) and
  `34754553767` (`6c113ae`, the PR head) — built from base `c5eb1b9`. **No run has applied 082 and
  090 to one database.** I expect none of 090's assertions to trip on 082's objects (082's policies
  are on content tables; 090's block reads only approval tables), and §2.5 says the coupling runs
  fail-closed — but "expect" is not a run id, and the Integration Owner's merge under RFC-2026-002
  needs green on the rebased head, not on this one. `gh pr view 119` reports
  `mergeable: UNKNOWN`.
- The batch amends `.github/workflows/ci.yml` (+37 lines, the three `control` entries), from the
  pre-Q4 file. `main`'s `ci.yml:36-54` now checks out `ref: ${{ github.head_ref }}`. A rebase will
  meet a textual conflict in a protected file; that is the Integration Owner's to resolve and is
  recorded so it is not a surprise.

---

## 12. What I did NOT review

Read this before relying on the rest.

- **I ran no database.** Every runtime claim is documented PostgreSQL 17 semantics plus the two
  branch runs and one `main` run I cite, none of which I produced.
- **I did not hand-simulate the 83 cases.** That is the independent Tester's brief for this batch.
  I read the two forge cases, the two crossed cases, the sibling-page event case and the seven
  service cases, and no others in depth.
- **The CHECK constraints' contents** beyond `decision_has_a_decider` and the status vocabulary — I
  read, did not test.
- **Whether `approval_policies.required_role`, `minimum_approvers` and `required_scope_type`
  should be read by any predicate**, and what the two `P` cells on the decide row should mean.
  Product and architecture; the batch's refusal to invent them is sound and I say nothing more.
- **Separation of duties inside the workflow.** An owner may raise and decide the same request
  (`requested_by = decided_by` is admitted; both policies name `owner`). §8.3 permits it as
  written. Product's question; noted so it is asked.
- **`policy_version_id`'s page scope.** The FK binds the policy to the request's business
  (`:337-339`) and not to the item's page, so a business-level item may name a page-scoped policy.
  Integrity, not isolation; the request's reach is still the item's.
- **Batches other than 001, 011, 080, 082** and the parts of 021 the chain depends on. If the
  false sentence of §3 has siblings in batches I did not open, I did not find them. The sweep the
  080 review said was owed is still owed, and 090 is evidence it is needed: the sentence
  propagated from 080 to 090 by copy.
- **The Q4 `ci.yml` fix itself**, beyond confirming it is on `main`.

---

## 13. What the next reviewer should refuse

1. **A merge of 090 that carries the S8 shape with neither a closure nor a recorded Owner decision
   about where approval's closure lives.** The disposition's Q5 answer — "batch ใหม่รอ 082" — was
   about 082 being on `main`; it did not say a batch with 080's defect may merge because 080's
   defect was closed.
2. **A closure that names a role list rather than PUBLIC** (082's own hint, `:185`).
3. **Any of the three repairs in §8** — `BYPASSRLS` on `app_command`, dropping FORCE, or making
   `app_command` an owner — offered as the way to give the trail its writer.
4. **A permissive policy on `app.approval_events` naming `app_command` that carries no scope
   predicate of its own** and relies on `:669-705`. That is S11's trigger, by name.
5. **Reading the batch's two green runs as evidence about 082 + 090 together.** They are not.
6. **Any consumer that branches on `requested_by`, `decided_at` or `updated_by`** as trusted
   attribution until S13 is closed.
7. **A header that still says "exempt by ownership"** — once merged it is permanent.

---

## 14. Summary and verdict

| # | Severity | Finding |
|---|---|---|
| **S11** | **HIGH — STOP-THE-LINE** | **Batch 090 is the S8 shape.** All three narrowings `for all to authenticated` (`:620`, `:641`, `:671`); the belief that they bound the `app_command` writer is stated at `:611-616` and `:1128-1135`; 082 closes content tables only (`082:150-152`) and its general-rule assertion reads content tables only (`:219-220`). Not yet integrated — the last moment to close it in the file that creates it. |
| **S12** | **HIGH** | "Exempt … by being the owner" — corrected on `main` by 082 in every editable copy — is written three times into 090 (`:92-94`, `:894-896`, `:1131-1134`), where it becomes unrewritable on merge and is what makes S11 look principled. |
| S13 | MEDIUM | `requested_by` is client-chosen on INSERT, checked by no policy, outside the UPDATE grant, and never forged alone by any case (builder writes it from `created_by`'s parameter). `updated_by` unchecked on INSERT; `decided_at` and `updated_at` client-set; no trigger. |
| S14 | MEDIUM | Every active member, viewers included, reads `approval_events.comment` and `actor`. AUTH-3's "minimum role projection" needs a view + registry row (RFC-021 §3), and `read-allowlist.json` does not exist on `main` — RFC-021 §8 is unimplemented. Not a leak; owed before §15's gate. |
| S19 | LOW | The service-role privilege sweep covers `app_worker`/`anon` fully, `app_authz` for SELECT, and `app_command`/`app_maintenance` only on named cells; a later grant to `app_maintenance` on a non-immutable column passes 090's block. 082 widened the content equivalent. |
| S15 | LOW | The runtime suite's only service identity is `app_worker`; `app_command` was never a session in any of the 712 cases. The apply-time block covers what the suite does not execute. |
| S16 | INFO | "Nothing in this repository can write an approval event" is S9's sentence again; the fixture writes three per CI run as `postgres`, and — unlike 080 — the fixture says so. |
| S17 | INFO | Both green runs predate 082; no run has applied 082 and 090 together. The batch's `ci.yml` amendment predates the Q4 `ref:` fix and will conflict on rebase. |
| S20 | INFO | On `main`, `isolation-cases.mjs:11682` still carries the sentence 082 corrected elsewhere; the pinning test does not read that file. |
| — | clean | Secrets and PII: scanner exit 0 over the batch's files; 6/6 new and 75/75 existing fixture ids uuid5-verified; `comment` NULL throughout; no id-alone cross-tenant FK; FORCE on all three; none of the three forbidden repairs. |

**Stop-the-line: YES, on S11.** In the brief's words — *does a control the repository believes it
has fail to exist?* — it does: `090_approval.sql` says the narrowings bound the command writer,
and they bind `authenticated` alone. This is the finding the Owner already paid a migration to
close on five tables, arriving on three more in a branch that was cut before the closure existed.
It is not a merge blocker because the defect is exotic; it is one because the fix is cheap today
and expensive tomorrow.

**Tenant isolation and deny-by-default on all three tables, for `authenticated`: no open path
found** — grant layer and policy layer, both halves of all three narrowings, the two-link chain,
every FK scope-pathed. **That qualifier is S11.**

**What this file signs and does not.** Under Q1 a distinct same-vendor run in the named role counts
as that role's signature. This run is distinct and in the role, and its signature on batch 090 at
`6c113ae` reads: **not as it stands.** It becomes the Security/Privacy signature RFC-2026-002 needs
for a merge when S11 and S12 are closed in the branch and the closure has a green run on a head
that contains 082 — at which point a short addendum to this file, by this role, measuring the
closure, is what is owed. It does not sign the Reviewer's or Tester's work, does not move the
package, and does not touch the Q6 count of nine.

---

## Verify

`npm run verify` on this branch (`agent/claude/WP-0A-DB-00-a1-security-090`, made from `main` at
`0dc640f`, one file added under `evidence/`, which `scripts/refresh-author-handoff.mjs:36-41` lists
as written-afterwards and so outside the handoff guard's substantive set):

```
clean: exit 0 — tests 590, pass 590, fail 0, skipped 0, todo 0
```

The same line, 590/590, was printed on this branch before the file existed (the baseline run on
`0dc640f`), so the file changes no count and trips no guard.

`npm run scan:secrets` on the same tree: exit 0. No PostgreSQL on this machine; no run id of my
own. `npm run check:scope` is not cited, per the brief.
