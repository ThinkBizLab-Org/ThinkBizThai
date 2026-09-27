# A1 Security/Privacy review: batch 105 (updated_by, written at UPDATE, is the caller)

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer for `WP-0A-DB-00`
Subject: branch `agent/claude/WP-0A-DB-00-batch-105`, head `4eb118e`, base `5922684` (`main`).
I checked the head out as the local branch `review/a1-batch-105`. To measure the base I checked it
out as a temporary local branch `review/a1-105-base`, which I deleted afterwards.
Author: `/claude/a0_atlas`
Date: 2026-09-27

**This document records review findings. It advances no package status, signs nothing on anyone's
behalf, writes `security_approved` nowhere, and repairs nothing it found.** It is one input to the
Product Owner's disposition. It is not the disposition.

---

## 0. What I am, before anything else

I am a subagent spawned by `/claude/a0_atlas`, the Author of the change under review. I ran in A0's
worktree, under a brief A0 wrote, and I am the same vendor and model family as A0. RFC-2026-024
withdrew the cross-vendor condition, so that fact does not by itself disqualify this review. It does
mean the Author chose what to point me at. Whether this review counts as the Security signature is
for the Integration Owner and the Product Owner to decide. It is not for me or for A0 to decide.

Batch 105 is the forward fix for my own finding: F1 in
`a1-catalog-rule-probes-security-review-2026-09-27.md`. So I am reviewing a remedy to a problem I
described, and I have a stake in calling it closed. To offset that, I measured the base and the head
the same way, with the same identities and the same statements. I also went past the seven tables
and past plain UPDATE (§3 F1, F2).

Every claim below either names the file and line it rests on or was measured on a live cluster.
§2 separates what I measured from what I only inferred.

## 1. What was reviewed

- `git show 4eb118e`: 17 files. The only migration change is the new file
  `db/foundation/migrations/105_updated_by_on_update_is_caller.sql`, 96 lines:
  - seven policies at :31-51;
  - an apply-time block at :55-96, which checks the seven by exact text at :62-75 and a
    schema-wide general rule at :77-95.

  I confirmed that no integrated migration was edited: `git diff --stat 5922684 4eb118e -- db/foundation/migrations`
  lists that one file and nothing else.
- Also in the commit:
  - `scripts/db/run.mjs:163-196`: the closure-text probe extended with
    `UPDATED_BY_ON_UPDATE_CLOSURES`, `cmd = 'w'`;
  - the 030 and 040 final-state replacements and `superseded.json`;
  - the four editor positives, the service case and seven forging cases in
    `tests/db/identity/isolation-cases.mjs`;
  - blocker 189 removed from `work-packages/WP-0A-DB-00.json`, and the post-migrate-pass blocker's
    text edited.
- `a0-batch-105-plan-2026-09-27.md` and `product-owner-disposition-2026-09-27-batch-105.md`.
- The handoff delta in `handoffs/WP-0A-DB-00-author-handoff.json`.
- `db/foundation/migrations/090_approval.sql:325-332, 560-595`, read for F2.

## 2. Method: measured vs inferred

### 2.1 Setup

**Measured** on a private cluster: PostgreSQL 17.11 (`/opt/homebrew/bin`),
`initdb --locale=C -A trust -U postgres`, `127.0.0.1:5501`, TCP only
(`unix_socket_directories=''`), `LC_ALL=C TZ=UTC`. It lived in my own subdirectory
`…/scratchpad/a1-105/pgdata` and was re-initdb'd for every round. Each round did the following:

1. Copied the pristine `140_audit.sql` back.
2. Appended the round's drift, if it had one.
3. Applied `db/foundation/ci/supabase-shim.sql`.
4. Ran `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres make db-migrate-clean`, then
   `make db-rls-smoke`.
5. Restored `140_audit.sql`.

Behavioural scripts then ran against the migrated and fixture-loaded database. They impersonated
identities with `set_config('request.jwt.claims', …)` and `set local role`, the same way
`db/foundation/test-helpers/auth-context.sql` does, and every one of them was rolled back.

Before the first round and after the last, `140_audit.sql` hashes to `2ac596bb…c1ad37149`. The
cluster is stopped and its directory deleted. Ports 5432 (pid 750) and 5499 (pid 66437, not mine)
were never touched and are still listening under the same pids.

`node --test test-kits/db/foundation-contract.test.mjs` on the head (Node 24.20.0): 70 of 70 pass.

### 2.2 Rounds

| Round | Tree | Drift appended to 140 | migrate-clean | rls-smoke | What caught it |
|---|---|---|---|---|---|
| R0base | `5922684` | none | ok (42 blocks) | ok (965) | none needed |
| R0head (×3) | `4eb118e` | none | ok (43 blocks; probe prints "14 updated_by INSERT, 7 updated_by UPDATE and 2 requester closures") | ok (972) | none needed |
| D3 | head | `drop policy workspaces_updated_by_on_update_is_caller` | **FAIL** (closure text probe, by name) | **FAIL** (1: `owner-a-cannot-update-workspace-a-naming-another-updater`) | probe and rls-smoke |
| D4 | head | `grant update (updated_by) on app.workspace_member_scopes to authenticated` | **FAIL** (post-migrate pass: 021#1, and **105#1's general rule**, which names `app.workspace_member_scopes`) | ok | the general rule works on a table that has no binding at all |
| D5 | head | `alter policy workspaces_updated_by_on_update_is_caller … to authenticated, anon` | **FAIL** (closure text probe) | ok | probe |
| D6 | head | a second PERMISSIVE `for update to authenticated` policy on `publish_intents`, role check only, no `updated_by` | **ok** | **ok** | **none** (F1) |
| D7 | head | `publish_intents_update_owner_admin` recreated with `((updated_by = (select auth.uid())) or true) and <role>` | **ok** | **ok** | **none** (F1) |
| D8 | head | a permissive `for update to authenticated using (true) with check (true)` on `workspaces` | ok | FAIL (3 cases, from the widening itself) | rls-smoke. 105's restrictive policy still refuses the forgery (below) |

### 2.3 Behavioural measurements

**F1 of the probes review, reproduced on the base and re-run on the head.** Each identity ran
`update app.<t> set updated_by = <another active member of workspace A>` on one workspace-A row of
each of the seven tables.

| Identity | Base `5922684` | Head `4eb118e` |
|---|---|---|
| owner_a | **UPDATE 1 on all 7** | refused on all 7, by `<t>_updated_by_on_update_is_caller` (42501) |
| admin_a | **UPDATE 1** on business_profiles, page_context_profiles, industry_assignments, knowledge_items; UPDATE 0 on the three owner-only tables | refused on the 4; UPDATE 0 on the 3 |
| editor_a (business scope) | **UPDATE 1** on the same 4; UPDATE 0 on 3 | refused on the 4; UPDATE 0 on 3 |
| page_editor_a (one page scope) | **UPDATE 1** on the same 4; UPDATE 0 on 3 | refused on the 4; UPDATE 0 on 3 |
| approver_a, viewer_a, suspended viewer, authenticated with no `sub` | UPDATE 0 on all 7 | UPDATE 0 on all 7 |
| owner_b (other tenant) | UPDATE 0 on all 7 | UPDATE 0 on all 7 |
| anon, service_role, app_command | `permission denied for schema app` | same |
| app_worker | UPDATE 0 on 6, `permission denied for table workspace_invitations` | same |

So the forgery reached four client roles on the base, not only the owner I reported. On the head it
is closed for all of them, on all seven tables.

**Other paths, owner_a unless stated otherwise (head, base in brackets):**

- `set updated_by = null`: refused [base: UPDATE 1].
- **INSERT … ON CONFLICT DO UPDATE SET updated_by = <approver>** on `business_profiles` and
  `knowledge_items`: refused by the 105 policy [**base: accepted, the forged value returned**]. This
  is a second forging path that my original F1 did not list, and 105 closes it too. With
  `excluded.updated_by` carrying the forged value, the INSERT closure refuses the statement first,
  on both trees.
- `with v as (…) update … from v`: refused [base: UPDATE 1]. The row constructor
  `set (name, updated_by) = (name, <approver>)`: refused [base: UPDATE 1].
- Honest updates that name the caller: UPDATE 1 on all seven.
- `set name = name` where the stored `updated_by` is already the caller: UPDATE 1.
- `select … for update` returns the same rows on the head as on the base: 1 workspace and 4
  businesses for owner_a.
- **Client-contract change (F3):** admin_a renaming a business whose stored `updated_by` is the
  owner, without naming themself, is **refused** on the head [base: UPDATE 1]. The same statement
  with `updated_by = <admin>` gives UPDATE 1. The same holds for a no-op update of a knowledge item.
- **Q3, restrictive AND FOR ALL:** inside a rolled-back transaction I added a permissive
  `for all to authenticated using (true) with check (true)` on `workspaces`. As approver_a, forging
  `updated_by` was still refused by the 105 policy, and naming self gave UPDATE 1.

**Other attribution columns.** A catalog query over every `app` column named `*_by` (plus
`actor*` and `*user_id`), for `authenticated`, `service_role` and `app_worker`, found:

- Client UPDATE on a `*_by` column exists only for `updated_by`, on the seventeen tables, and for
  `approval_requests.decided_by`.
- `created_by` and `requested_by` are INSERT-only for clients, and each is bound in an INSERT
  policy for `authenticated`.
- `approval_events.actor`, `audit_logs.actor_*` and `security_events.actor_*`: no client write at
  all.

**`decided_by` (F2), measured on both trees:**

- editor_a ran `update app.approval_requests set status='cancelled', updated_by=<self>, decided_by=<approver>`
  on workspace A's pending requests: **UPDATE 3**, each row now `cancelled` with
  `decided_by = <approver>` and `decided_at` NULL.
- owner_a did the same: **UPDATE 1**.
- Adding `decided_at = now()` makes the CHECK refuse it, which gives UPDATE 0.

**No view, no definer writer.** `app` and every other non-system schema contain 0 views. The five
SECURITY DEFINER functions are `app.jwt_subject`, `app.workspace_member_role`,
`app.is_active_member`, `private.set_updated_at` and `private.refuse_mutation`. None of them writes
`updated_by`.

**Out-of-order application.** On a head cluster I dropped the seven policies, which restores the
base's policy catalog, and then applied `105_…sql` last with `\i`.

- The policy catalog for `app` (164 policies) came out identical to the numerically ordered result:
  0 rows differ in either direction.
- Applying the file a second time fails loudly: `policy … already exists`.

### 2.4 Inferred from reading, not measured

- That the platform's PostgREST path adds no UPDATE route the shim lacks. The shim is not Supabase
  (`supabase-shim.sql:1-18`).
- That a future view owned by the table owner without `security_invoker`, or a future SECURITY
  DEFINER writer, would bypass 105 as it bypasses every other RLS policy. Neither exists today. The
  definer probe pins the definer set, but no probe pins "no views".
- That `'__SELF__'` in the four edited positives resolves to the caller's id. I read the pattern in
  `isolation-cases.mjs:2515, 2600, 3384`. I did not trace the resolver.

## 3. Findings

### F1: LOW (introduced by 105 as a claim, not as a weakness). The general rule checks for a substring in any UPDATE policy, so "a later table cannot reopen the class" is stronger than what it enforces

**What.** `105_updated_by_on_update_is_caller.sql:77-79` says the general rule exists "so a later
table cannot reopen the class". `db/foundation/README.md:335-337` (the batch 105 sentence in the probes
section) says the block "refuses any table that lets authenticated UPDATE `updated_by` without an
UPDATE policy binding it to the caller".

The rule at :86-90 is satisfied when **any** UPDATE or ALL policy for `authenticated`, permissive or
restrictive, contains the text `(updated_by = ( SELECT auth.uid() AS uid))` **anywhere** in its
WITH CHECK (`position(...) > 0`). That is not binding in two cases:

- **Permissive policies are ORed.** One binding policy does not bind the column while a second
  permissive UPDATE policy lacks the binding. Measured in D6: `publish_intents` got a second
  permissive policy. migrate-clean passed, rls-smoke passed, and owner_a forged `updated_by` on
  **4 rows** (`UPDATE 4`).
- **A substring survives `or true`.** Measured in D7: `publish_intents_update_owner_admin` was
  recreated with `((updated_by = (select auth.uid())) or true) and <role>`. Both layers passed, and
  owner_a again forged with `UPDATE 4`.

**What this is not.**

- The seven tables 105 fixes are robust. Their closure is RESTRICTIVE, so extra permissive policies
  cannot widen it (D8). It is also pinned by exact text on exact tables (D3 and D5 fail by name).
- The general rule does catch the plain case: a client-updatable `updated_by` with no binding
  anywhere (D4).
- The residual sits on the ten tables whose binding is a conjunct of a permissive policy.
  - Their state is unchanged by 105.
  - It is the same drift class as my F3 of the post-migrate pass and F4 of the probes review.
  - It is caught only where rls-smoke has an UPDATE-forging case for that table.
  - `publish_intents` has none; D6 and D7 prove it.
- No drift, no exploit: nothing here is reachable on the clean set.

**Why LOW, when I graded comparable drift classes MEDIUM.** Those grades rested on a closed premise
that was written down and was false *today*. Here the false part is a forward-looking claim, and
105 weakens nothing. The Owner may reasonably read it as MEDIUM by the rule I applied before.

**Remedies. These are recommendations; the decision is the Owner's.**

1. Make the rule require what it means. For every table where `authenticated` holds UPDATE on
   `updated_by`, there must be a RESTRICTIVE `w` or `*` policy for `authenticated` whose WITH CHECK
   deparses exactly to the pinned text. The simplest way to satisfy that is to apply 105's
   restrictive closure to all seventeen tables and pin all seventeen in
   `UPDATED_BY_ON_UPDATE_CLOSURES` (`run.mjs:164`). The permissive conjuncts on the ten would then
   become redundant rather than load-bearing.
2. Alternatively, keep the ten permissive and require **every** permissive `w`/`*` policy for
   `authenticated` on such a table to contain the text as a top-level conjunct. That is harder to
   state in SQL, and still text-matching.
3. Either way, add an rls-smoke UPDATE-forging case for `publish_intents`. That overlaps the
   "eleven forging cases" still owed in the post-migrate-pass blocker.
4. Soften the sentence at 105:77-79 in the next forward change, or make it true.

### F2: MEDIUM (pre-existing, not introduced by 105, not a condition on it). `decided_by` can be forged through the cancel path: "a decider stamped on a cancellation" is not refused

**What.** `approval_requests.decided_by` is client-updatable. Only
`approval_requests_update_decide_approver` binds it (`090_approval.sql:584-595`,
`decided_by = (select auth.uid())`). `approval_requests_update_cancel_writer`
(`090_approval.sql:563-573`) binds `updated_by` and `status = 'cancelled'`, and leaves `decided_by`
free.

The CHECK `approval_requests_decision_has_a_decider` (`090_approval.sql:330-332`) is
`(status in ('approved','changes_requested')) = (decided_at is not null and decided_by is not null)`.
On a cancellation the left side is false, so the check only requires that decided_at and decided_by
are *not both* set. `decided_by` alone passes.

The comment directly above it (`090_approval.sql:328-329`) says the equivalence refuses "a decider
stamped on a cancellation". That is false.

**Evidence (measured, §2.3, both trees).** editor_a cancelled three pending requests stamping the
approver as `decided_by`: `UPDATE 3`. owner_a did the same: `UPDATE 1`.

**Impact.** Attribution forgery inside one workspace:

- A member who may cancel (owner, admin or editor) can make a cancelled request name an approver who
  did nothing as its decider.
- No tenant boundary is crossed.
- `decided_at` stays NULL, so a reader that checks both columns is not misled; a reader of
  `decided_by` alone is.

I grade it MEDIUM for the same reason I graded F1 of the probes review MEDIUM: the repository's own
written premise says it is closed, and it is not. The Owner may reasonably read it as LOW. **105's
general rule does not cover it**, because the rule looks only at `updated_by`. The brief's "any
`*_by`" question lands here.

**Remedies (the Owner's choice):**

1. Split the CHECK so that each column is tied to the status on its own:
   `(status in (…)) = (decided_at is not null)` and `(status in (…)) = (decided_by is not null)`.
2. Or add `decided_by is null` to the cancel policy's WITH CHECK.
3. In either case, add an rls-smoke case, `editor-a-cannot-stamp-a-decider-on-a-cancellation`.
4. Optionally, generalise 105's rule from `updated_by` to every client-updatable `*_by` column.

### F3: NOTE. Every client UPDATE on the seven tables must now name its caller: a fail-closed contract change

**What.**

- On the head, an honest UPDATE that does not set `updated_by` is refused whenever the stored value
  is not the caller. Measured: admin_a renaming a business last touched by the owner.
- That includes rows created unattributed under 102's `is null or =` INSERT rule
  (`105_…sql:20-22` states this on purpose).
- The four positives were edited to send `updated_by = '__SELF__'`, and the plan (§1) records that
  they failed without the edit.

This is not a security weakness. It fails closed, and it matches what the other ten tables already
required. It is a client-contract change that a caller who does not read the migration will meet as
a 42501. I found no API-facing note of it outside the migration header and the handoff.

**Remedy (optional).** State it wherever client write contracts are documented. The alternative
remedy (b), letting the database maintain `updated_by`, would remove the burden. The plan records
(b) as a possible later change covering all seventeen tables.

### F4: NOTE. The service path is outside 105 by construction, and is inert today

The 105 policies are `TO authenticated`. `app_worker` holds UPDATE on `updated_by` on nine tables
(§2.3 catalog): `ai_model_policies`, `business_profiles`, `industry_assignments`, `knowledge_items`,
`meta_connections`, `page_context_profiles`, `workspace_members`, `workspace_settings` and
`workspaces`. None of these nine has an UPDATE or ALL policy that admits `app_worker`, so every
worker UPDATE I ran affected 0 rows or was refused by privilege. `service_role` and `app_command` are
refused at the schema.

If a later batch writes a worker UPDATE policy on one of these nine, `updated_by` will be whatever
the worker sends. Nothing in 105 and nothing in the general rule would notice. That is a trust
boundary (the worker is server code), not a client forgery. It should be decided when that batch is
written.

## 4. The brief's questions, answered

1. **Is F1 reproduced on the base and closed on the head, for all seven tables and every client
   role?** Yes (§2.3 table).
   - On the base the forgery reached owner (7/7), admin, editor and page-scoped editor (4/4 each
     reachable).
   - On the head it is refused on all seven for all four. Every other client identity, the other
     tenant, anon and the service roles get 0 rows or a privilege refusal on both trees.
   - rls-smoke goes from 965 to 972. The seven new cases fail when 105's policy is dropped, which I
     re-measured for `workspaces` in D3.
2. **Is the fix complete for the threat?**
   - For `updated_by` on the seven: yes, including upsert (closed, and not previously reported),
     NULL, CTE and row-constructor forms.
   - Views: none exist.
   - SECURITY DEFINER: none writes these tables.
   - Service role: outside the policy by construction and inert today (F4).
   - `created_by` and `requested_by`: INSERT-only and bound.
   - **Not complete for the class:** `decided_by` is forgeable (F2, pre-existing). The general rule
     is weaker than its sentence, on the ten permissive-bound tables (F1).
3. **Does restrictive-with-no-USING have a security side effect?**
   - None harmful, as measured. `polqual` is null (asserted at :70), so it does not change which
     rows are visible, lockable (`for update` counts unchanged) or reachable for UPDATE.
   - Restrictive policies AND with every applicable permissive policy, FOR ALL included. My FOR ALL
     `using (true)` test still refused the forgery.
   - It narrows only the row as written.
   - The one behavioural effect is F3.
4. **Is removing blocker 189 justified, and is the grade's authority stated honestly?**
   - The removal is justified on the evidence. The blocker's text owed three things: a per-table
     UPDATE binding, the probe extended to pin it, and a forging case per table. All three are
     present and measured.
   - The grade does not bear on the discharge.
   - On authority, the record is honest. The disposition (§2) says the Owner answered `ก` to a
     message that held both the remedy recommendation and the grade recommendation, and that the
     grade "was not stated separately". The handoff's rationale says the same.
   - The commit message and the 105 header call the finding "MEDIUM", attributed to my review, which
     is accurate: that was my grade.
   - Nothing I read claims that the Owner independently graded it MEDIUM.
5. **Stop-the-line risks?** None found; see §5.

## 5. Stop-the-line verdict

**No stop-the-line condition found in `4eb118e`.**

- **Tenant leakage:** none. The new policies have no USING and can only narrow. The other-tenant
  owner gets 0 rows on all seven tables on both trees. rls-smoke's cross-tenant cases pass (972/972).
- **Secret exposure:** none. The diff's added lines carry no credential, connection string or
  private URL (grep of `git diff 5922684 4eb118e`). The new probe text prints only policy names.
- **Migration divergence:** none.
  - No integrated migration was edited.
  - 105 is order-independent: applied last it gives an identical policy catalog.
  - Its number inside the 1xx range follows the 102-104 precedent the plan cites.
  - It is not idempotent, and it fails loudly on a re-apply, like the other batches.
- **Contract mismatch:** F3 is a client-contract change, fail-closed, and documented in the
  migration and the handoff.

F1 (LOW) and F2 (MEDIUM, pre-existing) are for the Owner to schedule. Neither is a condition I
place on batch 105.

## 6. Limits of this run

- The shim is not Supabase. I measured policies and grants, not the platform (§2.4).
- My drift rounds sampled the general rule's gap on one table (`publish_intents`). I did not
  enumerate which of the other nine permissive-bound tables have an rls-smoke UPDATE-forging case.
- I did not run `npm run check`, the handoff guard or the role-separation validator. Those belong to
  C0, Q0 and the Integration Owner.
- The base measurement used a temporary local branch, not a detached HEAD. I measured the database,
  not the handoff guard.
- The Author wrote this brief, and I am the same model family (§0).
