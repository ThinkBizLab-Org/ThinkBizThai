# C0 contract review: batch 171

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-171`, head
  `d3ffe6aa0a35d871281e6ca4bf7b31f63ec1c506` over code `d6fbf5fae38bfbc349961090f3d045f50dc29709`, base
  `700715e` (main). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/181>.
- **Review branch:** `review/c0-batch-171`, checked out at the subject head `d3ffe6a`. This file is its only
  commit.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-171-plan-2026-10-03.md`; the disposition
  `product-owner-disposition-2026-10-03-batch-171.md`; the appended section of
  `product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md` (108-125, and 37-44); `git diff
  700715e..d3ffe6a` (27 files) and both commit messages; `RFC-2026-027` whole; `RFC-2026-026`'s Status line
  and §9; `RFC-2026-020` lines 3, 393, 444, 476; `010_identity.sql:474-625`; `011_authorization_helpers.sql:240-320`
  and its block at 353-414; `021_member_scope.sql:740-892`; the two replacement files; `a0-batch-150-plan`
  §5 (243-275); ERD registry rows (262-282) and DR:163; `open_blockers[53, 95, 194, 195, 198]` against their
  base text at `700715e`; the manifest's `ownership` against base; the handoff.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024 that makes this an independent-role run by configuration, not by provenance: I share the
Author's training and blind spots. Acceptance of this file as the C0 role's signature is the Integration
Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** 171 narrows client reach and widens `app_authz` by exactly what RFC-2026-027 §3.1
  states. I measured it on two fresh clusters, and every live layer is green (§2). Members of a blocked
  workspace (owner, admin) read nothing of it. Nothing I found reaches a secret, a tenant boundary in the
  widening direction, an applied migration (171 is declared not applied to the instance), an irreversible
  deletion or a contract-catalog file.
- **Blocks the merge: no**, on my reading. There are two MEDIUM and six LOW findings, plus five notes.
  - M1 is a statement on which the reach of the delegation rests, and nothing in the repository supports
    it. It should be transcribed, or re-worded as A0's reading, before the merge.
  - M2 cites a role run as review before that run exists.
  - The LOW findings are text fixes, or limits that should be recorded by name.
  - Whether any of them blocks is the Integration Owner's call, not mine.
- **CI:** at the time of writing, run 37240428675 ("Bootstrap validation", on `d3ffe6a`) was `in_progress`.
  I did not see it finish.

### Answers to the questions

1. **Is migration 171 exactly RFC-2026-027 as written?** **Yes for the code; no for the RFC-020 text.**
   - **§3.1, the single `app_authz` policy:** 171:75-88 is the RFC's §3.1 block token for token (one added
     `drop policy if exists`, which is idempotent). Its deparse is pinned in `run.mjs`
     (`AUTHZ_WORKSPACES_POLICY_QUAL`), and I read it back live (P4). `app_authz` holds exactly the two
     permissive FOR SELECT policies, for itself alone.
   - **§3.2, the helper:** 171:91-108 is §3.2's body verbatim. Signature, `stable`, `security definer`,
     `search_path = ''` and the owner are restated. `is_active_member` is unchanged and inherits the gate.
   - **§3.3, the five 010 rewrites:** I diffed each against `010_identity.sql:520-625`. Each keeps its name,
     command, role and the role it admits. The insert keeps `created_by = (select auth.uid())`. The only
     change in meaning is the gate. The three policies the RFC keeps are untouched.
   - **The state sets:** the admitted set is `active`, `closing`; the blocked set is the other six. The
     block's step 5 holds the CHECK to admitted ∪ blocked, and the helper is an allowlist. I measured all
     eight states live (P3).
   - **§4:** the order matches and both timeouts are set. §4/4's block is there, plus §6/4 and §6/6.
     §6/4's "one lint data entry" is replaced by the apply-time block. That substitution is recorded
     (`[198]` (3)).
   - **The RFC-020 amendment (§3.4):** not made in RFC-2026-020's text, which is outside `writable_paths`.
     It applies by reference, and the edit is owed (`[195]` (b)). That is legitimate under
     CONTRIBUTING_AGENTS.md's precedence rule 1 (a newer approved RFC wins), but see N1.
   - **Where the tests narrow the RFC:** three places, L2, L3 and L4.
2. **Are the approvals and the SLO ratification recorded honestly, as the Owner's decisions taken through
   delegation, with the named-role acceptances owed?** **Yes in form, everywhere I read.**
   - Every record says the same thing: the two RFC Status lines, the README, the harness header, the
     disposition §3, `[194]`, `[195]`, the commit and the handoff. Each decision is the Owner's, taken
     through the delegation; A0 executes it and does not decide it.
   - The owed acceptances are named: A1, A1 Identity, A6, Product/Ops and the Integration Owner.
   - The SLO values in `db/foundation/README.md` equal `a0-batch-150-plan` §5's nine values exactly.
   - **Exceptions:** M1 (the claim that the recommendation came before the words), M2 (batch 171's role run
     is cited as A1's review before it exists), and L6 (A1 Security, the registry owner of range 170, is not
     named for the number 171).
3. **Are ownership and supersession legitimate?** **Yes.**
   - `verify-branch-scope` passes: all 27 paths are declared, and every amendment explains one (measured).
   - The three paths amended outside ownership are each explained.
   - RFC-2026-020 is not touched.
   - Both `superseded.json` entries are faithful. I diffed `011:353-414` and `021:740-892` against their
     replacements: the only change is the count-at-two asserted first, plus the `(table, name)` exclusion,
     each marked `SUPERSEDED BY 171`. The post-migrate pass re-runs 52 blocks: 38 as written, 14 superseded
     and replaced (measured).
4. **Are the claims in the commit messages, plan, disposition, blocker edits and handoff true?** **True
   where I measured them** (§2), with the exceptions in M1, M2 and L5.
   - The blocker edits are append-only on `[53]`, `[95]`, `[194]` and `[195]`; `[198]` is new and last
     (198 → 199 entries, measured).
   - The 33 line pins in `audit-coverage-map.json` all match their manifest lines (measured).
   - Two counts in the handoff are consistent with the commits:
     - "5 added, 21 modified, 0 deleted" is `700715e..d6fbf5f` (measured).
     - "26 changed paths" is the count at the code commit; the handoff commit makes it 27.

## 2. Measured, and how

**Node and branch.** Node `v24.20.0` (`node -v` before every measured run; `/Users/bank/.local/node-v24.20.0/bin`
first on PATH, the Homebrew Node 26 not used). The commands below were measured **on the branch NAME**. The
agent branch is checked out in another worktree, so I checked it out here with `git checkout
--ignore-other-worktrees` at the unchanged ref `d3ffe6a`, measured, and returned to `review/c0-batch-171`.
Afterwards the branch ref and `origin/agent/claude/WP-0A-DB-00-batch-171` were both still `d3ffe6a`, and
`git status` was empty.

| command | exit | result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 700715e WP-0A-DB-00` | 0 | `all 27 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` | 0 | `describes the branch: nothing substantive after its cited head` |
| `npm run verify` | 0 | `clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0` |
| `make db-schema-lint` / `make db-contract-check` | 0 / 0 | `ok` / `ok` |
| live round r1, port 5505 | 0, 0 | migrate-clean: 52 apply-time blocks, 38 as written, 14 superseded and replaced; rls-smoke: `1129 isolation case(s) passed`, `db-authz-proofs: ok — 7 claim(s)` |
| live round r2, a fresh cluster | 0, 0 | the same |
| drifts d1, d2, d3 (below) | 2, 2, 2 | d1, d2 refused by the permissive policy probe, **not by 171's block**; d3 refused by 171 (6) |
| `140_audit.sql` after every drift and at the end | n/a | `cmp` identical to the saved original (sha256 `2ac596bb…c1ad37149`) |
| probes P1-P5 on r2's cluster (below) | n/a | below |
| editor/viewer non-vacuity (below) | n/a | L4 |
| a script of my own over `audit-coverage-map.json` | n/a | 33 pins, 0 not on their manifest line |
| `gh pr view 180`, `gh run view 37235924563` (read-only) | n/a | merged 2026-10-04T21:37:21Z at head `61a01f6`, merge commit `700715e`; the run is `success` on `61a01f6`. As the disposition says. |
| `gh pr view 181` (read-only) | n/a | Draft, open, head `d3ffe6a`, base `main`, MERGEABLE; check `bootstrap` IN_PROGRESS (run 37240428675); the body ends with the Generated-with line |

**The cluster.**

- Private cluster under `scratchpad/c0-171/`.
- `initdb --locale=C -A trust -U postgres`, with `LC_ALL=C`.
- TCP only on `127.0.0.1:5505` (`-c unix_socket_directories=''`).
- `db/foundation/ci/supabase-shim.sql` applied first, then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres
  make db-migrate-clean` and `make db-rls-smoke`.
- Re-initdb for every round and every drift. At the end the cluster was stopped and its data directory
  removed, and nothing listens on 5505.

**Drifts**, each appended to `140_audit.sql` (which applies before 171) on a fresh cluster:

| drift | migrate-clean | 171 applied? | refused by |
|---|---|---|---|
| d1: a permissive SELECT policy with **no `TO` clause** (TO PUBLIC) on `workspace_settings` that joins `workspace_members` directly | 2 | yes, its block passed | the permissive policy probe: `unlisted or changed: app.workspace_settings.c0_probe_public` |
| d2: a policy **named `workspaces_update_owner`** on `workspace_settings`, TO authenticated, joining membership directly | 2 | yes, its block passed | the permissive policy probe: `unlisted or changed: app.workspace_settings.workspaces_update_owner` |
| d3: the Author's first drift reproduced (`probe_ungated`, TO authenticated) | 2 | refused | 171 (6): `a client policy on a workspace-scoped table reads membership without the helper, so the lifecycle gate does not reach it: workspace_settings.probe_ungated` |

**Probes**, on r2's cluster after rls-smoke, each in a rolled-back transaction:

- **P1. Shipped 171, the admin of A (`user 8912a12d`), not swept by the batch, A in `held`.** The admin reads
  0 rows of business, notifications, settings, invitations, content and assets. It reads 1 membership row,
  its own.
- **P2. The same, with 011's helper body restored.** Business 1, settings 1, membership rows 7, content 3,
  assets 3. The gate is the helper's, and it covers an identity the cases do not use.
- **P3. The owner of A in all eight states.**
  - In `active` and `closing`, `workspace_member_role` answers `owner` and the owner reads 4 businesses.
  - In each of the six blocked states it answers `NULL` and the owner reads 0 businesses.
  - In every state the owner still reads its own membership row (1).
- **P4. The catalog.** `app_authz`'s policies are exactly `workspace_members_select_authz_own_active` and
  `workspaces_select_authz_own_open`, both `r`, permissive, `{app_authz}`. The five rewrites read as §3.3
  says. The other policies on those tables are the 102/105/127 closures.
- **P5. §6/6's census.** 91 permissive `authenticated` policies in `app`, 89 in scope, 3 without a helper,
  as the RFC predicts. 0 permissive policies TO PUBLIC in `app`.

**Read, not re-measured:**

- 171 reverted in place, "30 of the 42 cases fail".
- CI's 56 negative-control entries replayed.
- The Author's other three drifts.
- The EXPLAIN harness's 0.066 ms sample.
- The try-it demo run (its steps go through `runCases`, `try-it.mjs:476-510`, so the new case fields are
  supported).
- The non-superuser apply (`[198]` (2)).

## 3. Findings

Grades: MEDIUM = a claim or control the batch relies on is not what it says; LOW = a text fix or an unrecorded
narrowing; NOTE = no remedy required.

### M1 (MEDIUM). The delegation's reach rests on a recommendation the repository does not record

`product-owner-disposition-2026-10-03-batch-171.md:21-24` makes three claims:

- "A0 had told the Owner its plan before the words were written".
- The plan was: approve RFC-2026-026 and RFC-2026-027, ratify batch 150's PROPOSED SLO values, and implement
  171.
- "This batch does exactly those three things".

The words themselves are `เอาตามที่คุณแนะนำทุกอย่าง`, "take everything you recommend". They reach only
what A0 had recommended when they were written. So this sentence is what turns the words into D1-D3.

Nothing in the repository supports it:

- The only earlier record is the section appended to `product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md`
  (112-125). It was written *after* the words, and it speaks only of "A0's standing recommendations"
  without quoting any.
- The same file (:44) records that the summary the Owner answered earlier that day had **no**
  recommendation on the SLO.

A reader cannot tell from the repository whether the Owner saw "approve both RFCs, ratify the SLO" before
writing the words.

**Remedy:** transcribe A0's message that preceded the words, verbatim and with its time, in disposition §1.
Failing that, re-word the sentence as A0's reading and record the Owner's confirmation as owed, as
RFC-2026-027 §10.1 already does for the 2026-10-04 words ("The Owner had not seen the per-question
text…; that reading is A0's and the Owner may correct it").

### M2 (MEDIUM). Both Status lines cite batch 171's role runs as A1's review of the approval, before they exist

`RFC-2026-027-lifecycle-visibility.md:3` and `RFC-2026-026-audit-row-producer.md`'s Status line both say:
"A1's review is the role runs of batches rfc-026-027, rfc-text, rfc-026-static-rule and 171".

The approval is recorded at `d6fbf5f`. Batch 171's A1 run had not reported at that time, and has not reported
at the time of this file. A Status line records what was true when it was written, and this sentence
counts a review that does not yet exist toward an approval taken without it.

**Remedy:** drop "and 171", or say "A1's review of batch 171 follows".

### L1 (LOW). 171's §6/6 block misses policies TO PUBLIC and exempts by name alone

`171_workspace_lifecycle_visibility.sql` has two gaps here:

- **TO PUBLIC.** At 308-309 the scope is "a policy whose `polroles` contains `authenticated`". A permissive
  policy with no `TO` clause (`polroles = {0}`) applies to `authenticated` too, and escapes the rule.
- **Name only.** At 313 the exemption is by `polname` only, so the exempt names `workspaces_update_owner`,
  `workspaces_select_active_member` and `workspace_members_select_own_active` exempt a policy of that name on
  **any** table.

Measured: d1 and d2 pass 171's block and are refused only by the permissive policy probe (§2). Defence in
depth holds today, and the RFC's own wording ("TO authenticated") is followed literally. But the block's
hint presents it as the rule for the next family, and as written it is narrower.

**Remedy:** before the merge, while 171 is not integrated:

- add `or 0 = any (p.polroles)` to the role test;
- exempt by `(c.relname, p.polname)` pairs.

### L2 (LOW). Cases 8 and 11 are executed in one state on one table, and the RFC asks for case 1

`scripts/db/authz-proofs.mjs:584` runs case 8 (011's body restored) and case 11 (the policy's conjunct
removed) only in `access_blocked`, and only on `business_profiles`. RFC-2026-027 §5/8 says "case 1 goes red".
§5/11 says "case 1 still refuses **in every blocked state**". Plan §4.2 presents both as discharged.

**Remedy:** loop both over the six blocked states (the read is cheap), or record the narrowing in `[198]`.

### L3 (LOW). §5/3's UPDATE is asserted as no-effect, not 42501, and the deviation is not recorded

RFC-2026-027 §5/3 (:327-330) says that the owner's `INSERT` of a business and `UPDATE` of a page are refused
"(`42501`, `deniedBy: 'rls'`)". `isolation-cases.mjs:19788` asserts the page `UPDATE` as `no-effect`, with a
connection-role witness. The implementation is correct: an `UPDATE` whose `USING` admits no row matches
nothing and raises nothing. That makes the RFC's text wrong. Plan §4.1 states the no-effect form, but
neither it nor `[198]` records that it departs from the RFC as written. The batch claims "RFC-2026-027 §5 as
written".

**Remedy:** one line in `[198]` or the plan. The RFC text can follow at its next revision.

### L4 (LOW). The editor's and viewer's sweeps can pass vacuously on four or five families

The before-read of `editor-a-…` and `viewer-a-…-in-access-blocked` (`isolation-cases.mjs:19764`) is
`lifecycleFamilySql(…, '>')` expecting `rows`. That demands that **one** family be non-empty, not each.

Measured on r2's cluster, in `active`:

| member of A | families of the 40 that are empty | which |
|---|---|---|
| editor `a324d4a6` | 4 | `workspace_invitations`, `workspace_members`, `quota_buckets`, `billing_subscriptions` |
| viewer `d884d3c1` | 5 | the editor's four, and `notifications` |

Those families pass for those identities whatever the gate does. Plan §4.1 (:111) says "no family passes
vacuously, RFC §5/1". That is true of the owner's sweeps (39 of 39 populated, measured: 1 empty of the 40,
`workspace_member_scopes`, which the owner sweep excludes). It is not true of these two.

**Remedy:** give each sweep its identity's own populated list and a per-family before-read, or state the
limit in `[198]` (5).

### L5 (LOW). Two statements name files the batch does not change

- **`171_workspace_lifecycle_visibility.sql:59-60`** lists `db/foundation/lint/policy-set.json` among the
  artefacts "pinned in the same diff". The file is unchanged (measured: `git diff --stat` is empty). The new
  policy is covered through `PERMISSIVE_POLICIES` instead.
- **`work-packages/WP-0A-DB-00.json:120`** (the `amends_without_owning` rationale) says "audit-coverage-map.json
  and retention-map.json (every open_blockers line pin +1 …)". `retention-map.json` is unchanged and has no
  line pins; it cites blockers by quotation (measured). Plan §0.1 says so correctly.

**Remedy:** text, in both places.

### L6 (LOW). A1 Security, the registry owner of range 170, is not named for the number 171

ERD:282 gives `170` ("grants/RLS/exposed surface hardening") to **A1 Security**, with A0 "manifest only".
The phase plan (`a0-phase-plan-141-170-2026-10-03.md:42`) records this. Two records leave A1 Security out:

- Disposition D4 (:71) owes the number's acceptance to the Integration Owner and A6 only.
- `[195]` (a) owes A1's acceptance of the approvals and of Q-027-1..5. That list excludes Q-027-6, the
  number.

RFC-2026-027's Author line (:9, from before this batch) calls A0 "owner of batch 170 … in the migration
registry". ERD:282 does not say that.

**Remedy:** add A1 Security to D4 and to `[195]` (a) for the number. Correct the Author line at the RFC's
next revision.

### Notes

- **N1. RFC-2026-020 still says "exactly one policy", and nothing in it points to RFC-2026-027.** It says so
  at :3, :393, :444 and :476. Applying the amendment by reference is legitimate (precedence rule 1), and
  the edit is owed (`[195]` (b)). But anyone who reads RFC-2026-020 alone is told something the code no
  longer does. I recommend that the Integration Owner make §3.4's edit, or at least a one-line pointer,
  close to the merge.
- **N2. Stale wording.**
  - `scripts/db/run.mjs:2931` still says "app_authz's single policy".
  - `scripts/db/authz-proofs.mjs:638` ends the §6.1 claim with "including the pinned policy expression" and
    prints only the first of the two (seen in both smoke logs).
- **N3. `[198]` (2).** I agree with the Author's reading: a `create or replace` of an `app_authz`-owned
  function under a non-superuser, non-inheriting migration owner needs care. I did not measure it either.
  011 and 171 are declared not applied to the instance, so nothing has diverged.
- **N4. 171's header (:30) lists "130/131" among the families.** RFC §3.3's table says `130`. This is
  harmless; the block's §6/6 census is what holds the families.
- **N5. The RFC does not order the gate against `workspace_members_select_own_active`.** Q-027-1 keeps the
  member's own row visible in every blocked state. P3 measured it as 1 in all eight states. That is as
  answered; I record it only because it is the one row of a blocked workspace a client still reads.

## 4. Limits

- I am the Author's vendor and model family (§0), and I wrote no code and fixed nothing.
- **Measured:** everything in §2's table and the drifts and probes. **Read:** the items listed at the end of
  §2.
- CI on `d3ffe6a` had not finished when this file was written.
- I did not run the try-it demo, the EXPLAIN harness or the CI negative-control replay.
- Nothing was written outside this worktree and `scratchpad/c0-171/`.
- `140_audit.sql` was restored byte for byte after every drift.
- The cluster on 5505 is stopped and its data directory removed.
- This file is the review branch's only commit. It is not pushed.
