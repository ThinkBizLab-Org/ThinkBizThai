# A1 Security/Privacy review — batch 081 (`app.content_targets`), Draft PR #117, not merged

Run: `/claude/a1_bastion_081`
Role: independent Security/Privacy reviewer for batch 081, one of the nine role runs the Product
Owner ordered on 2026-09-15 (Q6, option a) before batches 081/090/100 merge. The manifest names
`/claude/a1_bastion` as `security_reviewer_agent_run_id`; this is a distinct run in that role.
Subject: `origin/agent/claude/WP-0A-DB-00-batch-081`, head `822501c`, commits `8d54718`, `7a1fa05`,
`b206690`, `822501c`, branched from `c5eb1b9`. Read from the remote-tracking ref with
`git show origin/agent/claude/WP-0A-DB-00-batch-081:<path>`; the branch was not checked out.
Base of this review: `main` = `0dc640f` (merge of PR #128, batch 082).
Date: 2026-09-15.

**This document records findings. It advances no package status, signs nothing on any author's
behalf, writes `security_approved` nowhere, and repairs nothing it found.** Nothing but this file
changes on this branch.

---

## 0. What I am, before anything else

**I am a subagent spawned by `/claude/a0_atlas`, the Author of the package whose batch I am
reviewing, and I run in the same vendor and model family.** A0 wrote the brief I was handed, chose
the batch, chose the base, and told me which finding was the most likely one — whether 081 has the
same shape as finding S8 on 080. It did not write the batch: `8d54718` is `/claude/a3_content`'s,
writing under the Author role (`a3-batch-081-probes-2026-09-13.md:3`).

What that does **not** weaken:

- Everything below that is a *measurement against the tree* or *against a database* stands on its
  own. Each carries the command, the `file:line`, or the probe output so a reader can re-run it. A
  shared model does not change what `pg_policy.polroles` contains.
- Under Q1 of `product-owner-disposition-2026-09-15-six-questions.md` the cross-vendor condition is
  withdrawn and a distinct same-vendor run in a named role counts as that role's signature. That
  makes this file *eligible* to be the Security/Privacy signature RFC-2026-002 requires. It does
  not make it one: the verdict in §11 is stop-the-line, and a stop-the-line finding is not a
  signature on the merge.
- The brief told me what to look for first. §1 is what I found there, and it contradicts the batch's
  own header, the batch's manifest text and — once 081 merges — the title of migration 082 on
  `main`. Findings S3 and S5 came from outside the brief.

What it **does** weaken, and I cannot fix from inside:

- **Framing.** I pressed hardest on the thread A0 named and worked outward. §10 lists what I did not
  review; it cannot list what neither of us thought of.
- **Shared blind spots.** Where the batch's reasoning about PostgreSQL is wrong in a way
  characteristic of this model, I am the least likely reader to catch it. The one protection I had
  this time is the one the previous A1 run did not: a database. Every claim in §1 and §4 that could
  be executed was executed rather than reasoned (see the next item), so the class of error the
  batch-080 review warned about in its §8 — a confident, repeated sentence about Postgres semantics
  that no file happens to contradict — had somewhere to fail.

**Two corrections to the brief, because it said to follow the tree and not the brief.**

1. **The brief says no PostgreSQL is available on this machine. That is false.** `postgres --version`
   prints `postgres (PostgreSQL) 17.11 (Homebrew)`; `psql`, `pg_ctl` and `postgres` are all at
   `/opt/homebrew/bin/`; and `pg_isready` reports a server on `/tmp:5432` accepting connections.
   **I did not touch that server.** I ran `initdb` into my scratchpad and started a second, isolated
   instance on port 54329 with no Unix socket (`LC_ALL=C pg_ctl -D <scratchpad>/pg/data
   -o "-p 54329 -c listen_addresses=localhost -c unix_socket_directories=''" start`), created
   `thinkbizthai_test`, applied `db/foundation/ci/supabase-shim.sql` exactly as
   `.github/workflows/ci.yml:134` does, extracted the branch's tree with `git archive` into the
   scratchpad, copied `main`'s `082_content_service_path_closed.sql` beside its migrations (so the
   database is what `main` + 081 would produce), and ran the repository's own declared commands:

   ```
   DB_TEST_URL=postgresql://postgres@localhost:54329/thinkbizthai_test LC_ALL=C TZ=UTC make db-migrate-clean
     ... applied 081_content_targets.sql / applied 082_content_service_path_closed.sql ... db-migrate-clean: ok in 1255ms
   DB_TEST_URL=postgresql://postgres@localhost:54329/thinkbizthai_test LC_ALL=C TZ=UTC make db-rls-smoke
     db-rls-smoke: 665 isolation case(s) passed.   db-rls-smoke: ok in 2386ms
   ```

   Every probe below labelled **P1–P13** was then run with `psql` against that database, each write
   inside a transaction that was rolled back, and the fixture re-counted afterwards (six rows, no
   probe policy left behind — P7e). The instance was stopped when this review ended. The CI runs the
   brief told me to cite are cited as well (§9); they agree with the local run.
   What the local database is **not**: Supabase. The shim's `service_role` has no `BYPASSRLS` and
   `postgres` here is a superuser, the same two differences CI carries and states
   (`supabase-shim.sql:11-18`).
2. **The brief says the batch's base is `c5eb1b9` and that nothing on `main` since touches its
   tables.** Both true. But `main` has moved in a way that *does* touch the batch: PR #128 corrected
   a sentence the batch repeats, and PR #117 is now `mergeable: CONFLICTING` on ten files
   (`gh pr view 117 --json mergeable`; `git merge-tree --write-tree main origin/agent/claude/WP-0A-DB-00-batch-081`).
   That is finding S2.

---

## 1. Verdict on the primary thread, in one sentence

> **Batch 081 has exactly the S8 shape: its one RESTRICTIVE narrowing is `for all to authenticated`
> (`081_content_targets.sql:316-318`), it writes no closure of the kind 082 wrote, and 082's closure
> does not reach it — so on the day 081 merges, `app.content_targets` is the one content table on
> which a future `app_command` writer is bounded by nothing, and I measured that writer landing rows
> under another tenant's item (P7b) and under a page-restricted item (P7c) on the same database
> where 082 refused it on `app.content_items` (P7a).**

---

## 2. FINDING S1 — HIGH, **STOP-THE-LINE**. The same shape as S8, on a sixth table, after the repair for the first five has landed

### 2.1 The shape, measured

`081_content_targets.sql:316-318`:

```sql
create policy content_targets_scope_narrowing on app.content_targets
  as restrictive
  for all to authenticated
```

Both halves are present (`:319-331` USING, `:332-344` WITH CHECK) and I compared them line by line:
they are textually identical. The narrowing is correct for the role it names. It names one role.

The catalog, with 081 and 082 both applied (P2):

```
               polname                | polpermissive | polcmd |   to_roles
--------------------------------------+---------------+--------+---------------
 content_targets_insert_writer        | t             | a      | authenticated
 content_targets_scope_narrowing      | f             | *      | authenticated
 content_targets_select_active_member | t             | r      | authenticated
 content_targets_update_writer        | t             | w      | authenticated
```

No policy on this table has `polroles = '{0}'` (PUBLIC). Compare the six content tables (P3):

```
     relname      | closures | restrictive_total
------------------+----------+-------------------
 content_ideas    |        1 |                 2
 content_items    |        1 |                 2
 content_targets  |        0 |                 1
 content_variants |        1 |                 2
 content_versions |        1 |                 2
 quality_reviews  |        1 |                 2
```

### 2.2 Why 082 does not cover it

082 is written against a fixed list. `082_content_service_path_closed.sql:150-152` declares
`content_tables := array['content_ideas','content_items','content_versions','content_variants','quality_reviews']`;
its five policies are `:97-125`; its claim 1 requires **exactly five** closures (`:199-201`); its
claim 2 — the general rule "every role a PERMISSIVE policy admits must be bound by a RESTRICTIVE
policy on the same table" (`:203-235`) — iterates `content_tables`; its claim 3 sweeps service-role
privileges over `content_tables` (`:237-255`). The word `content_targets` does not occur in 082
(`grep -c content_targets db/foundation/migrations/082_content_service_path_closed.sql` → `0`). The
five catalog cases 082 added to the isolation suite enumerate the five tables by name
(`tests/db/identity/isolation-cases.mjs:11927-11968` on `main`). None of this is a defect in 082 —
`content_targets` did not exist on `main` when 082 was written, and 082 says its list is what "the
next family can copy" (`:203-204`). The defect is that 081 is that next family and did not copy it,
because 081 was branched from `c5eb1b9`, four days before 082 existed.

Migration order makes the gap permanent rather than transient: 081 sorts before 082, so on every
clean apply 082 runs *after* `content_targets` exists and still closes only the five it names.

### 2.3 What the batch believes, in its own words

The belief S8 named on 080 is repeated on 081:

- `081_content_targets.sql:304-305` — "A PERMISSIVE policy above says the caller is a member of the
  workspace. This says the caller's scope admits the row, **and both must hold**." True for
  `authenticated`; for no other role.
- `:309-311` — "BOTH HALVES, and on this table both are live rather than one being a guard for
  later: … the WITH CHECK half bounds the INSERT". It bounds an `authenticated` INSERT.
- `:700-701`, in the ownership assertion — "If app_command owned the table, the command function
  this family is waiting for would be exempt from the policies above BY OWNERSHIP and the narrowing
  would bound nothing it does." The contrapositive the reader is meant to draw — *because
  `app_command` is not the owner, the narrowing does bound it* — is false: the narrowing does not
  name `app_command` and binds nothing it does, owner or not. (The premise is also the false
  "exempt by ownership" mechanism; that is S2.)
- `:541-542` and `:110-112` — the writer this table waits for is "a SECURITY DEFINER function owned
  by app_command", and re-pinning "is a domain command's act". So the design contemplates exactly
  one writer for the three fixed columns, and it is the writer nothing on this table bounds.

And what `main` will believe once 081 merges: `082:1` — "the content service path is closed, by a
policy that names every role" — and the manifest blocker at `work-packages/WP-0A-DB-00.json:335`,
"BATCH 082 ONLY CLOSES THE PATH". Both are statements about *content*. After 081 they are true of
five content tables and false of the sixth.

### 2.4 The measurement that settles it — P7

Inside one transaction, rolled back at the end, as the migration role: grant `app_command` `USAGE`
on `app` and column-scoped `INSERT` on `content_items` and `content_targets`; create on each a
permissive INSERT policy `to app_command with check (true)` — the minimal shape RFC-2026-017 §6
requires ("policies that name it") with no scope predicate, which is precisely what an implementer
who trusts `:304-311` would write; `set local role app_command`; no JWT, no acting user.

```
--- P7a content_items, tenant B, as app_command with no acting user
ERROR:  new row violates row-level security policy "content_items_service_path_closed" for table "content_items"
--- P7b content_targets, tenant B item content_item_b1, as app_command with no acting user
INSERT 0 1
--- P7c content_targets under the PAGE-RESTRICTED item content_item_a1_sibling_page, as app_command
INSERT 0 1
--- P7d read back as postgres inside the same transaction
 43fd5c24-… (workspace_b) | 306426ca-… (content_item_b1)            | 11111111-… | created_by NULL
 c4840acc-… (workspace_a) | f4d8fb50-… (content_item_a1_sibling_page) | 22222222-… | created_by NULL
```

082's closure refused the command role on `content_items`; nothing refused it on
`content_targets`. P7c is the row the fixture exists to protect — the sibling-page item that
`pinned-editor-a-cannot-see-the-content-target-of-a-sibling-target-item` proves a page-scoped
*editor* cannot reach — and the command role wrote a target under it with no scope question asked.
(One probe note for whoever re-runs this: an `INSERT … RETURNING` as `app_command` is refused with a
nameless RLS error, because RETURNING also applies SELECT policies and `app_command` has none. The
first two runs of P7 tripped on that; the third, above, has no RETURNING and reads back as
`postgres`. The refusal in the earlier runs was the SELECT half, not the narrowing.)

### 2.5 The shape-A repair is refused here for the same reason as on 080 — measured

`product-owner-disposition-2026-09-15-six-questions.md` Q3 records why re-creating the narrowing
"naming `app_command` beside `authenticated`" was rejected for 080: the predicate resolves through
`security invoker` helpers `app_command` cannot execute and tables it cannot read, and if it could it
would see zero rows and admit everything. 081's narrowing uses the same helpers (`:326-328`), and P6
measures the same three refusals:

```
 app.member_scope_admits_business(uuid,uuid)  | app_command_execute f | authenticated_execute t | security_definer f
 app.member_scope_admits_page(uuid,uuid,uuid) | f | t | f
 app.member_scope_is_narrowed(uuid)           | f | t | f
```

So the repair for 081 is shape C, not shape A — and shape B remains owed as 082's header and the
manifest record it.

### 2.6 What today's exposure is, honestly

Nil at the grant layer: P4 shows `app_command` and `app_maintenance` with no `USAGE` on schema
`app` and no privilege of any kind on `content_targets`; `app_worker` and `app_authz` have `USAGE`
and nothing else. P12 re-runs 082's general rule with `content_targets` added to the list and finds
nothing offending today, because the only permissive policies are `TO authenticated` and the
narrowing binds `authenticated`. **The defect is prospective, exactly as S8 was**, and its trigger
is the same: the batch that writes the first content command function reads `:304-311`, concludes
the scope bound already holds, adds the permissive policy §6 requires, and ships a writer that P7
shows landing rows in any tenant. 082's whole purpose is that this batch "will find its permissive
policy refused by THIS one, and will have to amend it — in a diff a reviewer reads"
(`082:80-82`). On `content_targets` it will find nothing in its way.

### 2.7 Why this is stop-the-line, in those words

My test, from the brief and from `CONTRIBUTING_AGENTS.md`: *does a control the repository believes
it has fail to exist?* Three beliefs, one absence:

- 081 believes its narrowing bounds every writer on the table (`:304-311`, `:700-701`). It bounds
  `authenticated`.
- `main` believes the content service path is closed (`082:1`, manifest `:335`). After 081, a
  content table is open.
- The Owner's Q5 decision made new batches wait for 082 precisely so that they would land on a
  `main` where S8 is closed. 081 lands on that `main` and reopens S8 on the table it adds.

**Stop-the-line: yes, on this finding.** It is the same finding as S8, with the same tense, and the
previous A1 run called S8 stop-the-line with that tense; calling the same thing something smaller
because it is one table instead of five would be grading by size rather than by kind.

**The repair is cheaper here than it was on 080, and that is worth saying so nobody reaches for a
worse one.** 081 is **not integrated**. Migration invariant 1 does not yet protect it. The closure
can be written *into 081 itself* before it merges — a sixth `content_targets_service_path_closed`
policy in 082's exact shape (`as restrictive for all using (current_user = 'authenticated') with
check (current_user = 'authenticated')`, no `TO` clause), plus 082's claim-2 general rule over this
table in 081's own `do $$` block — and the batch's `:640-652` assertion that there is exactly ONE
restrictive policy would move to two. Alternatively an 083 after the merge, with 081 merged open in
between; that is the worse order and I would not choose it. **I repaired neither**; this is a
review.

**What the next reviewer should refuse** (the list the batch-080 review gave, plus one):

1. Merging 081 with no closure on `content_targets` while `082:1` stands on `main` saying the
   content path is closed.
2. A permissive policy naming `app_command` on `content_targets` that carries no scope predicate of
   its own — the shape P7 exercised.
3. Any of RFC-2026-017 §4's three cheap repairs: `BYPASSRLS` on `app_command`, dropping `FORCE`, or
   making `app_command` the owner. 081 takes none of them today (§7).
4. Re-creating the narrowing naming `app_command` (shape A). P6 is the measurement; §2.5 is why.

---

## 3. FINDING S2 — MEDIUM. The false "exempt by ownership" sentence is written into a **new** migration, and PR #117 conflicts with the commit that corrected it

Batch 082 corrected the sentence C0 and A1 both found false — that a SECURITY DEFINER function
owned by `app_command` is "exempt by ownership rather than by privilege" — everywhere it could be
edited: `scripts/db/run.mjs:626-634` (diff `c5eb1b9..main`), the manifest blocker
(`work-packages/WP-0A-DB-00.json:332`, "[CORRECTED 2026-09-15 by batch 082 …]"), the static suite's
message (`tests/db/identity/identity-isolation.test.mjs:8995`, "this message read 'exempt by
ownership' until batch 082"), and a test that pins the correction
(`identity-isolation.test.mjs:9229-9241`). The uneditable copies at `080_content.sql:114` and `:897`
are named as such in 082's header (`:34-41`).

Batch 081, branched before any of that, carries the sentence in four more places:

| where | text |
|---|---|
| `081_content_targets.sql:541-542` — **a new migration** | "The writer this family needs is a SECURITY DEFINER function owned by app_command, **exempt by OWNERSHIP rather than by privilege** (RFC-2026-017 §3)" |
| `081_content_targets.sql:700-701` | "would be exempt from the policies above BY OWNERSHIP" |
| `tests/db/identity/identity-isolation.test.mjs:9005` on the branch | "exempt by ownership rather than by grant" — the pre-082 text of the line `main` corrected at `:8995` |
| `work-packages/WP-0A-DB-00.json:336` on the branch | the pre-082 blocker text, without the `[CORRECTED …]` bracket |

`git grep -n "exempt by" origin/agent/claude/WP-0A-DB-00-batch-081 -- db scripts tests test-kits work-packages`
is the command; the four lines above are its content-family hits beyond 080.

**Two consequences, one of each kind.**

*Record.* The day 081 merges, `:541-542` becomes a sentence in an integrated migration that cannot
be rewritten, stating as the mechanism of the content writer the thing 082's header exists to say is
false — in the file a reader of `content_targets` opens first. 082's correction test on `main`
checks `run.mjs` and 082's own header (`:9236-9241`) and would not notice a new migration carrying
the old sentence. The correct statement is the one `001_service_roles.sql:41-42` and
RFC-2026-017 §3 make and 082 quotes: the role is `NOBYPASSRLS` and never the owner *so that the
policies apply to it*. 081 is not integrated, so this sentence can still be corrected in place;
after the merge it can only be contradicted from a later header.

*Merge.* `git merge-tree --write-tree main origin/agent/claude/WP-0A-DB-00-batch-081` reports
conflicts in ten files: `db/foundation/lint/catalog-snapshot.json`, `evidence/VERIFICATION.md`,
`handoffs/WP-0A-DB-00-author-handoff.json`, `scripts/test-suite-contract.mjs`,
`test-kits/branch-identity.test.mjs`, `test-kits/db/foundation-contract.test.mjs`,
`test-kits/integrity-manifest.json`, `tests/db/identity/identity-isolation.test.mjs`,
`tests/db/identity/isolation-cases.mjs`, `work-packages/WP-0A-DB-00.json`; `ci.yml` auto-merges.
Two of the ten — the manifest and the static suite — are where 082's correction and 081's copy of
the old text collide, so **the rebase that resolves PR #117 is also the act that decides whether
082's correction survives**. A resolution that keeps 081's side reverts the correction on `main`
silently and the correction test (`:9229`) would still pass, because it does not read those lines.
Whoever performs the rebase should read both sides of those two hunks, not pick one.

Severity MEDIUM rather than HIGH because the sentence errs conservative on its own (the batch-080
review's §2.7 argument) and what it licenses is already counted in S1.

---

## 4. Tenant isolation and deny-by-default for `authenticated` — reviewed, no open path found

The condition in the heading is finding S1; within it, positively:

- **Grant layer.** Every grant is column-scoped and enumerated: SELECT `:251-254` (all twelve
  columns), INSERT `:259-261` (eight, no `id`, no timestamps, no `deleted_at`), UPDATE `:266-267`
  (`status`, `updated_at`, `updated_by`, `deleted_at` — the identity, the item, the destination and
  the pin are outside it). No DELETE to any role, asserted `:525-538`. `anon` nothing, asserted
  `:562-573` and measured P4. No `GRANT … TO PUBLIC`, no `GRANT ALL`, no `ALTER DEFAULT PRIVILEGES`
  (grepped).
- **ENABLE + FORCE**, `:239-240`, asserted on both catalog columns `:385-393`, measured P1
  (`relrowsecurity t`, `relforcerowsecurity t`, owner `postgres`).
- **Permissive policies all `TO authenticated`** (P2), one SELECT, one INSERT, one UPDATE, no DELETE
  policy; asserted `:612-638`.
- **The narrowing resolves through the parent** over the full scope path — `i.workspace_id`,
  `i.business_profile_id`, `i.id` — and asks both branches of §4 invariant 3's question
  (`:325-329`), identically in both halves; asserted against `polqual` and `polwithcheck` `:658-695`.
  Belt and braces with `content_targets_item_scope_fk` (`:185-187`), a three-column key, so a target
  naming a parent in another Business cannot be created either. Both layers agree.
- **The pin** reaches `app.content_variants` over the scope path (`:191-193`); `MATCH SIMPLE` makes
  the null pin legal. Not held to the target's own item — recorded by the batch as a blocker and a
  "wrong post rather than a leak" (manifest `:347` on the branch). I agree with that classification.
- **The writer names itself** on INSERT (`created_by = (select auth.uid())`, `:287`) and on UPDATE
  (`updated_by`, `:296`). See S4 for the half that is missing.
- **The suite.** 665 cases pass locally (§0) and in CI (§9); the 36 new ones include the cross-tenant
  read holding both of B's ids, the cross-tenant write holding B's workspace, business and item,
  the sibling-page refusal, the forged-actor refusal, and three service refusals at the grant layer
  (`service-cannot-read/aim/restate-a-content-target`, `isolation-cases.mjs:12082,12192,12411` on
  the branch, all `deniedBy: 'grant'`, correctly labelled as not RFC-2026-017 §7).
- **The partial unique index** (`:209-211`) raises `23505` to a caller who already holds the item
  and the destination; the item is reachable only inside the caller's tenant by FK and policy, so
  the index is not a cross-tenant existence oracle.

One documented-behaviour note carried over from the 080 review: the narrowing's `exists (select 1
from app.content_items i …)` is itself subject to `content_items`' RLS. For `authenticated` that is
additive. For any other role it now also meets 082's closure on `content_items`, so even a future
permissive SELECT policy naming a service role on `content_targets` would read zero rows through the
narrowing — *if* the narrowing applied to that role, which is S1's point: it does not.

---

## 5. FINDING S3 — MEDIUM. The withheld social FK is a cross-tenant **reference** the database accepts, and the batch that would turn it into an external side effect is not told to wait

`081_content_targets.sql:25-29` says it plainly: "A caller holding another tenant's social account
id can write it into its own target and the database will accept it." P11 confirms: as owner A,
`insert into app.content_targets (…, social_account_id, …) values (…, '5ef9c641-…' /* tenant B's
destination symbol */, …)` → `INSERT 0 1`. The batch records this as an open blocker owed to A0
Integration for batch 111 (manifest `:348` on the branch) and asserts the key's absence at apply
time (`:395-422`).

**My classification, which the batch does not make.** Today this is not tenant leakage: nothing
reads `social_account_id` to do anything, and the value is a bare uuid. The day something does, it
is the worst class in `CONTRIBUTING_AGENTS.md`'s stop-the-line list — an **external side effect on
another tenant's channel**: a publisher that takes "the delivery is against a known target"
(RFC-2026-022 §3's table, batches `120`/`121`) and posts tenant A's content to the social account
tenant A named, which is tenant B's. `app.social_accounts` carries its own RLS, but a publisher
running as a service role resolving a target's destination is exactly the path RFC-2026-022 §5/4
says no GUC bounds.

**The gap in the record**: 081's blocker says 111 owes the key. It does not say that **no publisher
may read `content_targets.social_account_id` before 111 lands**, and §6's registry orders 111 after
110, 020 and 081 — not before 120. Owed to A0 Integration (111) and to A6 Publisher (120), as one
sentence in the blocker: the FK is a precondition of the first delivery, not a follow-up to it.

The batch's own fixture keeps the gap visible rather than hiding it (three destination symbols that
name no row; `fixture-catalog.json` `content_target_destination_a1/_a2/_b1`), and the apply-time
assertion makes the deferral a catalog fact. Both are the right choices and I record them as such.

---

## 6. FINDING S4 — LOW-MEDIUM. `updated_by` unchecked on INSERT; `updated_at` client-settable — the batch-080 finding S4, repeated on a new table two days after it was recorded

`:295` — "The writer names itself and the policy checks the claim rather than trusting it." Checked
on UPDATE (`:296`), not on INSERT: the INSERT grant includes `updated_by` (`:259-260`) and the INSERT
policy's WITH CHECK constrains `created_by` alone (`:285-289`).

P8, as owner A, inserting a target with `updated_by` = editor A's uuid:

```
              created_by              |              updated_by
--------------------------------------+--------------------------------------
 5c460eb8-… (user_owner_a)            | a324d4a6-… (user_editor_a)
INSERT 0 1
```

P9, as owner A: `update … set updated_at = '2000-01-01 00:00:00+00'` → `UPDATE 1`, value taken.
P13: no trigger on the table. Same-tenant only; audit attribution, not isolation. It is the exact
shape `a1-security-batch-080-2026-09-13.md` §6 recorded on `content_ideas` and `content_items` on
2026-09-13; 081's fixture and witnesses read `updated_by` as the column "a landed write would have
replaced with the attacker's" (fixture `:84-86`), which is true for UPDATE and is the column an
INSERT can set to anyone. Owed to A3 Content, with 080's S4, as one forward change.

---

## 7. RFC-2026-017 §4's three refused repairs — none taken; and what 081 asserts about service roles is narrower than 082

- **`BYPASSRLS`**: the word does not occur in `081_content_targets.sql` (grep, 0). P5:
  `app_command rolbypassrls f`, `app_worker f`, `app_maintenance f`, `app_authz f`.
- **`FORCE`**: `:240`, asserted `:385-393`, measured P1.
- **Ownership**: P1 owner `postgres`; `:702-711` raises if `app_command` or `app_authz` owns it.

**S5 — LOW-MEDIUM (assertion coverage).** 081's apply-time block sweeps privileges for `app_worker`
(`:547-558`), `anon` (`:562-573`) and `app_authz` SELECT (`:577-585`). For `app_command` and
`app_maintenance` it asserts only the fixed-column UPDATE sweep (`:483-503`, over `every_role`) and
DELETE (`:525-538`). SELECT and INSERT for those two roles, and UPDATE on the four client-writable
columns, are asserted by nothing at 081's apply time — and 082's claim 3, which does assert all five
service roles hold nothing, is scoped to the five tables (§2.2). P4 shows the claim is *true* today
for `content_targets`; the batch's sentence "every service case in the isolation suite for this
table is a PRIVILEGE refusal" (`:544-546`) rests on it and nothing asserts it. A closure written per
S1 in 082's shape brings 082's claim 3 with it if the author copies the block rather than the policy
alone.

---

## 8. RFC-2026-021 and RFC-2026-022 obligations

- **Read allowlist.** 081 creates no view and adds no entry. It grants `authenticated` a
  column-scoped SELECT on a base table (`:251-254`), which is the inherited shape of `010`/`020`/`021`
  and `080` that RFC-2026-021 §8.5 says must be enumerated in a *closed* known-exceptions list —
  still unlanded: `db/foundation/lint/read-allowlist.json` does not exist on `main` (`ls`), and the
  RFC records the list as "a forward fix owed to `170`". So 081 adds one more base-table grant that
  list will have to name; that is a debt of `170`'s, not a defect of 081's, and I record it so `170`
  is not surprised. §7/4 (`anon` nothing): asserted `:560-573`, measured P4 (`schema_usage f`).
- **Service-policy map.** 081 classifies nothing and says why (`:273-277`, `:587-592`): §8.2's content
  rows are `P` for Service (`sprint-0a-core-erd-rls-retention-th.md:361-362`), no document defines
  the capability, "a `P` with no capability defined is not an `S`". `db/foundation/lint/service-policy-map.json`
  is not in the diff. Correct, and the same reading 080 made. Under RFC-2026-022 §5/4 nothing in the
  batch cites the confinement term as a boundary (grepped `app.workspace_id`: absent).
- **Which §8 row governs.** 081 reads §8.2 (editor `Y`) rather than §8.3 "Schedule/unschedule"
  (editor `P`), on the ground that scheduling is batch 091's table (`:39-57`), and records the
  reading as a blocker. That is the Reviewer's question; the security consequence is only this: the
  reading 081 chose is the *wider* one for editors, and if it is wrong the editor INSERT policy at
  `:283-289` grants a role a write the matrix marks `P`. Named so it is priced, not decided here.

---

## 9. Secrets, PII, fixtures, and the CI runs

- `node scripts/scan-repository-secrets.mjs` on the extracted branch tree: exit 0.
- Fixture `tests/db/identity/fixtures/081-content-targets-fixture.sql`: every uuid is a
  `fixture-catalog.json` symbol (uuid5 of `thinkbizthai.fixture.<symbol>`, `:9-10`); the three
  destination uuids resolve to no row by design and the file says so (`:13-33`); `status` NULL
  throughout so no vocabulary is smuggled in (`:80-89`); no email, URL, token, phone or name in the
  migration or the fixture (grepped). The fixture loads administratively as the connection role
  (`:104-109`), which on Supabase is `postgres` with `BYPASSRLS` — the batch-080 review's S9
  observation applies unchanged and the fixture states it rather than hides it.
- **CI.** Two runs on the branch, both `success`: `34752666478` (head `7a1fa05`, the one the batch's
  evidence cites at `a3-batch-081-probes-2026-09-13.md:157-167`) and `34752998819` (head `822501c`,
  the current head). From the latter's log: `applied 081_content_targets.sql`,
  `db-migrate-clean: ok in 1357ms`, `db-rls-smoke: 665 isolation case(s) passed.`,
  `app.content_targets (081): 14 case(s) noticed`. **Both runs predate PR #122's `ci.yml` fix and
  ran as a detached HEAD** — the log reads `You are in 'detached HEAD' state` and then
  `✔ the handoff for this branch describes this branch (14.567319ms)`, which is the guard returning
  early with nothing to compare, the mechanism Q4 recorded. So the branch's green covers the
  database and the static suite and does not cover the handoff guard; after the rebase S2 requires,
  CI will measure it on the branch name for the first time.

---

## 10. What I did NOT review

- **I did not hand-simulate the 36 cases.** That is the Tester's brief. I ran them (665 pass) and
  read the three service cases and the sibling-page case in full; a case that passes for the wrong
  reason is a class the suite's own probe record says CI cannot see.
- **The CHECK on `status`, the partial index's stricter-than-§4.6 substitution, the §8-row
  reading, and the pin-not-held-to-item gap** — read, priced in §8 and §4 where they touch security,
  not judged. They are the Reviewer's.
- **The ten-file merge conflict** beyond the two hunks S2 names. I did not resolve it or read the
  other eight.
- **The static suite's fourteen new rules and thirty-one probes** — I read the grep of them
  (`identity-isolation.test.mjs` diff) and the probe record's §3; I did not re-run the probes.
- **Batches 090 and 100**, which the session record says share seven files with 081. If either has
  S1's shape I did not look; the previous A1 run said a sweep for the false sentence across every
  batch was owed, and after S2 I say it again.
- **The platform.** Everything measured here was on a shim'd PostgreSQL 17.11 where `postgres` is a
  bypassing superuser and `service_role` is not; RFC-2026-017 §2's measurements of the real instance
  are not re-taken.

---

## 11. Summary

| # | Severity | Finding |
|---|---|---|
| **S1** | **HIGH — STOP-THE-LINE** | 081's one narrowing is `for all to authenticated` (`:316-318`); no closure on the table; 082 closes five tables by name and not this one. Measured: a permissive policy naming `app_command` lands rows under tenant B's item and under a page-restricted item (P7b, P7c) where 082 refuses the same on `content_items` (P7a). Latent today (P4, P12); trigger is the next design step. Repairable inside 081 before merge. |
| S2 | MEDIUM | The false "exempt by ownership" sentence is written into a new migration (`:541-542`, `:700-701`), the branch's test (`:9005`) and manifest (`:336`); PR #117 is `CONFLICTING` on ten files including the two 082 corrected; the rebase decides whether the correction survives. |
| S3 | MEDIUM | The withheld social FK admits a cross-tenant destination reference (P11). Not a leak today; an external side effect on another tenant's channel the day a publisher reads it. The blocker names 111 and does not say 120 must wait for it. |
| S4 | LOW-MED | `updated_by` unchecked on INSERT (P8), `updated_at` client-settable, no trigger (P9, P13). 080's S4, repeated. |
| S5 | LOW-MED | 081 asserts nothing about `app_command`/`app_maintenance` SELECT/INSERT/mutable-UPDATE on its table; true today (P4), unasserted; 082's claim 3 does not reach it. |

**Stop-the-line: YES, on S1.** The batch has the same S8 shape, and the repair `main` just landed
for that shape stops one table short of it. **What this file does and does not sign:** it finds no
open tenant-isolation path for `authenticated` on `app.content_targets` (§4), it finds the three
forbidden repairs untaken (§7), it finds fixtures and evidence clean (§9) — and it does not sign the
merge, because a merge with S1 open puts a control `main` states it has (`082:1`) back into the
state the Owner's Q5 decision made new batches wait to avoid.

**`npm run verify` on this branch** (`agent/claude/WP-0A-DB-00-a1-security-081`, made from `main`
at `0dc640f`, this file the only change): `clean: exit 0 — tests 590, pass 590, fail 0, skipped 0, todo 0`.
