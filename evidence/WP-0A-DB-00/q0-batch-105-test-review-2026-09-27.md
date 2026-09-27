# Q0 independent test: batch 105 (updated_by, written at UPDATE, is the caller)

Run: `/claude/q0_sentinel`
Role: independent Tester. `work-packages/WP-0A-DB-00.json` `role_assignments.tester_agent_run_id`
names `/claude/q0_sentinel`. This file comes from a distinct run of it.
Subject: branch `agent/claude/WP-0A-DB-00-batch-105`, head `4eb118e`, base `5922684` (`main`).
Author: `/claude/a0_atlas`.
Local test branch: `test/q0-batch-105`, created at `4eb118e`.
Date: 2026-09-27.

**This document RECORDS TEST RESULTS.** It advances no package status. It writes `test_verified`
nowhere, signs nothing on anyone's behalf, and repairs nothing it found. Every defect named below
is left as it is on the subject branch.

During each mutation my harness edited a migration, the runner or `140_audit.sql`. After every
mutation it wrote each touched file back byte for byte and checked `git status --porcelain`. No run
left the tree dirty. `140_audit.sql` was `2ac2fc2c…` before the first run and after the last, and
`cmp` against my saved copy found no difference. The only file this run adds to the repository is
this one.

---

## 0. What I am, before anything else

**I am a SUBAGENT spawned by the Author run `/claude/a0_atlas`.** I ran in a git worktree A0
created, under a brief A0 wrote. A0 chose all of the following:

- the subject;
- the port and the cluster recipe;
- the output filename;
- the starting classes I had to cover "at minimum": forgery by every client role through UPDATE,
  upsert and other `*_by` columns; mutations to 105; the negative control; the four changed
  positives; legitimate flows now broken; mutations to the general rule.

A0 also wrote the change under test.

**I am the same vendor as the Author (Anthropic), and the same model family.** RFC-2026-024 is
approved and withdrew the cross-vendor condition. What remains is CONTRIBUTING_AGENTS.md's
separation of duties: four distinct `agent_run_id`s, and no run approves, test-verifies,
integrates or gate-approves its own work.

**Whether this file is accepted as the Tester signature is the Integration Owner's and the Product
Owner's decision.** It is not mine.

---

## 1. How I measured

PostgreSQL 17 from `/opt/homebrew/bin`. The cluster lived in my private directory
`…/scratchpad/q0-105/`, and I wrote nothing elsewhere in the shared scratchpad. The recipe:

- `initdb --locale=C -A trust -U postgres`;
- TCP only on `127.0.0.1:5503`, with `-c unix_socket_directories=''`;
- `LC_ALL=C`;
- **a fresh initdb before every run**;
- `db/foundation/ci/supabase-shim.sql` applied first;
- then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean` and
  `make db-rls-smoke` with the same URL.

**Ports 5432 and 5499 were never contacted.** The cluster is stopped and its data directory is
removed.

Layers per mutation:

| col | layer |
|---|---|
| A | Static suite: a fast proxy per run (`foundation-contract`, `identity-isolation`, `ctr-job-001`). Every survivor was re-run with the full `npm run verify`. |
| S | `make db-schema-lint` |
| B | `make db-migrate-clean`: the apply-time blocks, the four catalog-rule probes including the closure-text probe, and the post-migrate pass |
| C | `make db-rls-smoke`: 972 cases. It runs whenever 140 applied, even if B failed later in the pass. |

A **survivor** is a mutation that leaves every layer green.

Two confounds hit column A, and I mark them where they apply:

- **`A*`:** the rule "batch 140 adds to the merged batches and rewrites none of them" refuses
  `drop policy` written in 140's text.
- **`A†`:** any `do` block appended to 140 fails the post-migrate plan's extraction tests.

Both rules guard 140 only. Where they are the only A catch, the B and C verdicts are what count.

### Baseline on `4eb118e`: reproduced

| layer | result |
|---|---|
| A | `npm run verify`: `clean: exit 0 — tests 670, pass 670, fail 0` |
| S | ok |
| B | the closure-text probe prints `14 updated_by INSERT, 7 updated_by UPDATE and 2 requester closures … (self-test: refused its drift)`; `post-migrate pass: 43 apply-time blocks, 33 re-run as written, 10 superseded and replaced`; ok |
| C | `972 isolation case(s) passed` |

### Catalog survey on the clean set

- **17** app tables grant `authenticated` UPDATE on `updated_by`, the same 17 the plan names.
  - 10 bind it in a permissive UPDATE policy.
  - The other 7 now carry 105's restrictive closure. Each deparses exactly as pinned:
    `polqual` null, TO `{authenticated}`.
- **The only other client-UPDATE-granted identity column is `approval_requests.decided_by`.**
  - `created_by` and `requested_by` are UPDATE-granted nowhere.
  - At INSERT, every permissive INSERT policy on every table that grants `created_by` binds it to
    the caller. `requested_by` is bound by the restrictive `*_requester_is_caller`.
  - `workspace_member_scopes.user_id` names the scoped member. It is not an attribution.
- **`app_worker` holds UPDATE on `updated_by` on 9 tables.** None of the 9 has a permissive policy
  for `app_worker`, so row-level security refuses every such write. W1 measured 0 rows on
  `workspaces`.

---

## 2. Forgery by any client role: live probes on the clean set

Each probe ran in its own transaction and was rolled back.

| # | probe | result |
|---|---|---|
| U1 | owner sets `updated_by = NULL`, on each of the 7 | **refused on all 7**, each by name: `…_updated_by_on_update_is_caller` |
| U2 | admin, editor and page editor each set another member, on business, page, industry and knowledge (11 probes) | **refused on all 11**, by 105's closure |
| U2 | approver on knowledge; viewer on workspaces | 0 rows, filtered by the permissive USING |
| U3 | owner names itself, on each of the 7 | **accepted on all 7** |
| C1 | `INSERT … ON CONFLICT DO UPDATE SET updated_by = <other>`: industry, business, page, knowledge; also `= NULL` | **refused**, by 105's closure |
| C1b | upsert with `excluded.updated_by = <other>` | refused by 102's INSERT closure, before the update arm is reached |
| C1 | invitation upsert on `token_hash` | refused by the privilege layer: `permission denied for table workspace_invitations` |
| T1 | owner forges at UPDATE on content_items, assets, research_runs, approval_policies (four of the ten) | refused |
| W1 | service (`app_worker`) updates `workspaces.updated_by` | 0 rows |
| **D1** | **owner, admin or editor cancels an approval request with `decided_by = <anyone>`** | **ACCEPTED**: see F1 |

**Verdict on the brief's first class:** I found no way for any client role to forge `updated_by`
on any of the 17 tables, through either UPDATE or upsert.

The one forgery I did find is on a different column, `decided_by`. It predates 105 and lies outside
105's reach (F1).

---

## 3. The Author's negative control: REPRODUCED

**N01:** I dropped the seven closures after the set, by drift in 140.

- **C:** `FAILED — 7 of 972`. The failures are exactly the seven `owner-a-cannot-update-…-naming-another-updater`
  cases, each with `1 row(s) came back. The operation was permitted.`
- **B:** the closure-text probe names all seven tables as missing their closure.

**The seven cases fail for the right reason when 105 is absent, and pass only with it.** Live, the
refusal message names 105's policy on every one of the seven.

**A limit on that proof:** the harness discards the policy name (`rls-assertions.mjs`
`DENIAL_OBJECT`). A future refusal by some other policy on the same table would satisfy these cases
just as well. See F4.

---

## 4. Mutation table

Verdicts: `G` = green (missed), `C` = caught, `SKIP` = C did not run because the schema did not
build. Where a mutation to 105's own file stops the build, its C column is measured by the `E`-row
drift equivalent.

### 4.1 Mutations to 105's file

| id | mutation | A | S | B | C (via E-row) |
|---|---|---|---|---|---|
| M01 | workspaces policy removed | C | G | C (apply-time: 6 of 7) | **C** (E01: 1 of 972) |
| M01b | knowledge policy removed and the block count set to 6 | C | G | C (the closure-text probe) | — |
| M01c | M01b, plus run.mjs drops knowledge from the list | C (pin test and probe digest) | G | C (040's replacement register) | — |
| M02 | workspaces policy made PERMISSIVE | C | G | C | **C** (E02) |
| M03 | business `or updated_by is null` | C | G | C | **G** (E03) |
| M03c | all seven `is null or =`, with the block text and run.mjs text changed to match | **C (A only)** | G | **G** | **G** |
| M04 | page `USING (true)` | C | G | C | G (D04) |
| M04b | knowledge `USING (updated_by = auth.uid())` | C | G | C | **C** (E04b) |
| M05 | settings `TO public` | C | G | C | G (E05) |
| M06 | invitations `TO authenticated, anon` | C | G | C | G (D03 analogue) |
| M07 | industry `FOR ALL` | C | G | C | G (E07) |
| M08 | `auth.uid()` unwrapped (semantically equivalent) | C | G | C | G (E08). Over-strict pinning, acceptable. |
| M09 | business `updated_by is not null` | C | G | C | **C** (E09) |
| M11 | every statement removed, comments kept | C | G | C | C (7 of 972) |

### 4.2 Drifts appended to 140

| id | drift | A | S | B | C |
|---|---|---|---|---|---|
| D01 | workspaces closure `WITH CHECK (true)` | G | G | C (the probe, and 105's block in the post-migrate pass) | C (1) |
| D02 / D02b | knowledge closure dropped | A* / A† | G | C | C (1) |
| D03 | business closure `TO authenticated, anon` | G | G | C | G |
| D04 | page closure `USING (true)` | G | G | C | G |
| D05 | industry closure `or updated_by is null` | G | G | C | G |
| D06 | workspaces closure renamed | G | G | C | G |
| D07 | `grant update (updated_by) on workspace_member_scopes` | G | G | C (021's block first; 105's general rule also fires, see G01+D07) | G |
| D10 | RLS disabled on workspaces | G | G | **G** | C (11 of 972) |

### 4.3 The four changed positives: they still prove their cells

| id | drift | C |
|---|---|---|
| P01 | `business_profiles_update_scoped_editor` dropped | `editor-a-can-update-business-a1-in-scope` fails: "nothing was visible" |
| P02 | `page_context_profiles_update_scoped_editor` dropped | `page-editor-a-can-update-page-a1-in-scope` fails |
| P03 | editor removed from `knowledge_items_update_writer` | both knowledge positives fail (2 of 972) |

Naming `__SELF__` in these positives, and in the `renameKnowledge` negatives, is what keeps 105 from
masking the permissive policies. With the caller named, the restrictive closure passes, so only the
permissive policy under test can refuse.

### 4.4 The runner (the closure-text probe)

| id | mutation | A | B | C |
|---|---|---|---|---|
| R01 | the third `closureRule` `'w'` changed to `'a'` | C (digest) | C | G |
| R02 | the third `closureRule` removed | C (digest) | **G** | G |

R02 shows the probe digest test is the only thing guarding the UPDATE rule's presence in the probe.
The probe's self-test drifts only an INSERT closure. The apply-time block still holds the seven, so
nothing is exposed.

### 4.5 The general rule in 105's block

| id | mutation | A (full verify) | S | B | C |
|---|---|---|---|---|---|
| G01 | `relkind = 'r'` changed to `'x'` | **G** | G | **G** | G |
| G02 | `position(...) > 0` changed to `>= 0` | **G** | G | **G** | G |
| G03 | `raise exception` changed to `raise notice` | **G** | G | **G** | G |
| G04 | `has_column_privilege(...) and (false)` | **G** | G | **G** | G |
| G01+D07 | G01, plus a violating grant | G | G | C, but only through 021's block. 105's message no longer appears. | G |

### 4.6 What the general rule admits, as written (measured in a rolled-back transaction on the clean set)

I ran 105's query, verbatim, against scratch tables. Every scratch table had
`grant update (updated_by) to authenticated`.

| scratch table | general rule | forging `updated_by` as owner |
|---|---|---|
| no policy (control) | **offending** | — |
| permissive policy `WITH CHECK ((updated_by = (select auth.uid())) or true)` | passes | **forged** |
| two permissive policies, one binding and one `WITH CHECK (true)` | passes | **forged** |
| `WITH CHECK (not (updated_by = (select auth.uid())))` | passes | not tried: this policy refuses the caller's own id, the inverse of the rule |
| a binding policy, RLS never enabled | passes | **forged** |
| a partitioned parent (`relkind 'p'`) | not examined | **forged** |

On two existing bound tables I ran the same shapes as drifts:

| id | drift | A | S | B | C |
|---|---|---|---|---|---|
| D08 | a second permissive UPDATE policy on content_items, role-gated, `updated_by` unbound | G (full) | G | **G** | **G**: **survivor** |
| D08b | the same sibling on content_ideas | G | G | G | C: its forging case |
| D09 | content_items writer CHECK `(updated_by = uid or updated_by is not null) and role` | G (full) | G | **G** | **G**: **survivor** |
| D09b | a workspaces permissive sibling `WITH CHECK ((updated_by = uid) or true)` | A* only | G | **G** | **G** |

**Survivors (every layer green):**

- G01, G02, G03, G04;
- D08, D09;
- D09b, apart from its A* confound.

M03c, R02 and D07-under-G01 are caught at one layer only.

---

## 5. Legitimate flows

- **Any client UPDATE on the seven tables must now write `updated_by = caller`.** Otherwise it is
  refused with 42501 (live):
  - U3b: an admin archiving a Business without naming itself is refused;
  - C2: an editor's upsert on industry_assignments that does not set `updated_by` in `DO UPDATE` is
    refused.

  This is the stated design, the same rule the other ten tables apply. It is not a defect. The
  repository has no application code that updates these tables, so nothing in the tree breaks.
- **No case exercises an honest UPDATE of `workspaces`, `workspace_settings` or
  `workspace_invitations` by their owner, or an honest archive on any of the seven.** Live, all of
  these work when the caller is named (U3, U3b). A mutation that refused them outright would be
  caught only by B's exact text, not by C (E05 and E07 show C is blind to shape changes that keep
  both the forging and the positives the same).

---

## 6. Findings

### F1 — MEDIUM, pre-existing (batch 090), outside 105's seven. `approval_requests.decided_by` is forgeable on the cancel path.

`approval_requests_update_cancel_writer` binds `updated_by` but not `decided_by`, and `decided_by` is
in the client UPDATE grant (090 line 481). The CHECK
`approval_requests_decision_has_a_decider` requires `decided_by` only for approved and
changes_requested rows. It does not forbid it on a cancelled one.

Measured live:

- an editor cancelled a pending request with `decided_by` = the approver, and the stored row reads
  `cancelled | <approver> | decided_at NULL`;
- an admin did the same naming the owner (3 rows);
- an editor did the same with a UUID of no member at all.

This is blocker 189's class (forged attribution, no tenant boundary crossed) on the column 090's own
comment says "cannot name one who is not the caller". 105's general rule covers only `updated_by`,
so it cannot see this.

**Remedy:** on the cancel path, either bind `decided_by is null` in the WITH CHECK, or tighten the
CHECK to `decided_by is null` whenever status is not a decision. Add a case: an owner cancelling
while naming a decider is refused.

It needs its own blocker and batch, not 105.

### F2 — MEDIUM (for 105's stated purpose). The general rule is a substring test for existence, so it certifies tables that remain forgeable.

105 says the rule exists "so a later table cannot reopen the class". Measured (§4.6), it passes all
of these, and each is forgeable:

- a binding clause ORed with anything (`… or true`, `… or updated_by is not null`);
- a second permissive UPDATE policy that does not bind (permissive policies OR, and the rule asks
  only "does SOME policy contain the text");
- a table with RLS disabled;
- a partitioned parent, which the rule never examines because it reads `relkind = 'r'` only.

D08 and D09 applied the first two shapes to content_items, one of the ten. They survived every layer
including rls-smoke, because content_items has no UPDATE forging case.

**Remedy (choose one, the Owner's call):**

- (a) Require every PERMISSIVE UPDATE or ALL policy for authenticated on such a table to have a
  WITH CHECK whose top-level conjunct is exactly the binding. Or require one RESTRICTIVE policy
  whose WITH CHECK is exactly the binding, the shape 105 used, and extend it to all 17.
- (b) Remedy (b) from the plan: take `updated_by` out of the client grant.

Include `relkind in ('r','p')`, and require `relrowsecurity` or lean on the existing RLS probe.
Either way, add UPDATE forging cases for the ten bound tables that lack one: content_items,
asset_rights, approval_policies, approval_requests, publish_intents.

### F3 — LOW. Nothing proves the general rule can fire.

G01 to G04 each disable it, and every layer stays green. The static pin test checks only that the
message text exists.

The four catalog-rule probes each carry a self-test drift ("self-test: refused its drift"). This
rule has none, and the closure-text probe's self-test drifts only an INSERT closure (R02).

**Remedy:** move the general rule into run.mjs as a catalog-rule probe with its own drift, for
example `grant update (updated_by) on app.workspace_member_scopes`. Give the UPDATE closure rule its
own drift too.

### F4 — LOW. The seven forging cases attribute the refusal to the table, not to 105's policy.

Live, the message names `…_updated_by_on_update_is_caller`. The harness drops the name, so any
policy refusal on that table satisfies the case. N01 shows they depend on 105 today. Nothing pins
that they keep doing so.

There is also no NULL-forging case: M03c/E03 (`is null or =`) is invisible to C and is caught only
by A's text pin and B's exact text.

**Remedy:**

- optionally capture and assert the restrictive policy name for cases that claim a restrictive
  refusal;
- add one `updated_by = NULL` UPDATE case;
- add owner positives for honest UPDATEs on workspaces, workspace_settings and
  workspace_invitations.

### F5 — INFO, pre-existing. migrate-clean and schema-lint pass with RLS disabled on `app.workspaces` (D10).

rls-smoke catches it (11 of 972). This is not 105's scope. It is recorded because F2's "RLS off"
case relies on this layer.

---

## 7. Stop-the-line verdict

**No stop-the-line condition found in batch 105.**

- No tenant leakage, no secret exposure, no migration divergence. The worktree and 140 were
  restored byte for byte.
- 105 does what it claims on the 17 tables: no client role could forge `updated_by` through UPDATE
  or upsert.
- The negative control reproduces exactly: 7 of 972.
- The four positives still prove their cells.

F1 is a live attribution forgery on another column. It predates 105 and is the same class and grade
as blocker 189, so it should be raised as a blocker. It does not stop 105. F2 means 105's
forward-looking guarantee is weaker than its comment states. Whether that must be fixed before merge
is the Owner's decision.

---

## 8. Limits

- A0 named the starting classes and I share A0's model family. F1 came from surveying other `*_by`
  columns, which the brief listed. F2 came from asking what the rule's substring test admits. What
  neither of us thought of is not here.
- I did not observe CI. The static suite judged the branch name `test/q0-batch-105`, not the
  subject's.
- `auth.uid()` in the shim reads a USERSET GUC, so a session with raw SQL can choose its own `sub`.
  That trust belongs to the platform, not to 105. It is untested and out of scope.
- The drift method appends to 140. For drifts in `do` blocks or using `drop policy`, A's catch is a
  confound (A†, A*).
- 52 mutation runs plus two batches of live probes. They are a sample, not a proof.
