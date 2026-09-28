# Q0 independent test: batch 123 (the updated_by UPDATE closure on all seventeen tables, and decided_by as a pair)

Run: `/claude/q0_sentinel`
Role: independent Tester. `work-packages/WP-0A-DB-00.json` `role_assignments.tester_agent_run_id`
names `/claude/q0_sentinel`. This file comes from a distinct run of it.
Subject: branch `agent/claude/WP-0A-DB-00-batch-123`, head `5856f0b`, base `e276c9a` (`main`).
Author: `/claude/a0_atlas`.
Local test branch: `test/q0-batch-123`, created at `5856f0b`.
Date: 2026-09-28.

**This document RECORDS TEST RESULTS.** It advances no package status. It writes `test_verified`
nowhere, signs nothing on anyone's behalf, and repairs nothing it found. Every defect named below
is left as it is on the subject branch.

During each mutation my harness edited `123_attribution_closures_everywhere.sql`,
`scripts/db/run.mjs`, `test-kits/db/foundation-contract.test.mjs`,
`test-kits/integrity-manifest.json` or `140_audit.sql` (drifts are appended to 140). After every
mutation it copied each file back from a saved original, compared SHA-256 and required an empty
`git status --porcelain` before the next one. Before the first run and after the last:
`140_audit.sql` `2ac596bb…`, `123_…` `8881a056…`, `run.mjs` `d2f5d8e3…`,
`foundation-contract.test.mjs` `d2754b8c…`, `integrity-manifest.json` `1f1e77af…`; `git diff
5856f0b` is empty. The only file this run adds to the repository is this one.

---

## 0. What I am, before anything else

**I am a SUBAGENT spawned by the Author run `/claude/a0_atlas`.** I ran in a git worktree A0
created, under a brief A0 wrote. A0 chose all of the following:

- the subject;
- the port and the cluster recipe;
- the output filename;
- the starting classes I had to cover "at minimum": my batch-105 survivors D08/D09/D09b and
  G01–G04 re-run against 123; `updated_by` forgery on all 17 tables by every role through UPDATE,
  ON CONFLICT DO UPDATE and NULL; `decided_by`/`decided_at` on cancelled, pending and expired rows
  by every path including INSERT and the service role; legitimate decide/cancel/expire flows;
  mutations to 123 and to the probe's coverage rule; whether that rule is self-tested; whether the
  new case fails for the right reason.

A0 also wrote the change under test, and the findings it closes include three of mine (Q0-105 F1,
F2 and F3).

**I am the same vendor as the Author (Anthropic), and the same model family.** RFC-2026-024 is
approved and withdrew the cross-vendor condition. What remains is CONTRIBUTING_AGENTS.md's
separation of duties: four distinct `agent_run_id`s, and no run approves, test-verifies,
integrates or gate-approves its own work.

**Whether this file is accepted as the Tester signature is the Integration Owner's and the Product
Owner's decision.** It is not mine.

---

## 1. How I measured

PostgreSQL 17.11 from `/opt/homebrew/bin`. Node `v24.20.0` and npm `11.19.0`, the declared
toolchain. The cluster lived in my private directory `…/scratchpad/q0-123/`, and I wrote nothing
elsewhere in the shared scratchpad. The recipe:

- `initdb --locale=C -A trust -U postgres`;
- TCP only on `127.0.0.1:5503`, with `-c unix_socket_directories=''`;
- `LC_ALL=C`;
- **a fresh initdb before every run**;
- `db/foundation/ci/supabase-shim.sql` applied first;
- then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean` and
  `make db-rls-smoke` with the same URL.

**Ports 5432 and 5499 were never contacted.** The cluster is stopped and its data directory is
removed.

**A discarded pass.** My first mutation pass put `/opt/homebrew/bin` ahead of the declared Node on
PATH, so it ran under Node 26.7.0. The full `npm run verify` refused that toolchain (exit 68), which
is how I noticed. I discarded the whole pass and re-ran every mutation under Node 24.20.0. All 66
proxy-level A, S, B and C verdicts of the re-run matched the discarded ones; the discarded pass's
full-verify column was void and was re-measured. The clean-set live matrices of §2 were re-run on a
cluster built under Node 24 and parsed identical. Only the re-run is reported here.

Layers per mutation:

| col | layer |
|---|---|
| A | Static suite. A fast proxy per run (`foundation-contract`, `identity-isolation`, `ctr-job-001`, 378 tests). Every row that survived the proxy was re-run with the full `npm run verify`. |
| S | `make db-schema-lint` |
| B | `make db-migrate-clean`: the apply-time blocks, the four catalog-rule probes (the closure-text probe among them) and the post-migrate pass |
| C | `make db-rls-smoke`: 977 cases |
| L | a live probe on the same database after C: 33 forging and deciding statements, each in its own transaction, rolled back |

A **survivor** is a mutation that leaves every layer green. An **exposure** is a survivor whose live
probe forges something.

Confounds in column A, marked where they apply. Each is a rule that reads `140_audit.sql` only, so
the same drift written in any other file would not meet it:

- **`A*`:** "batch 140 adds to the merged batches and rewrites none of them" refuses `drop policy`
  in 140.
- **`A‡`:** "the service holds grants and no policy" refuses a policy `TO app_worker` in 140;
  "no client role is granted anything on either audit table" refuses a grant to `anon` in 140.

### Baseline on `5856f0b`: reproduced

| layer | result |
|---|---|
| A | `npm run verify`: `clean: exit 0 — tests 671, pass 671, fail 0` |
| S | ok |
| B | the closure-text probe prints `14 updated_by INSERT, 17 updated_by UPDATE and 2 requester closures in their exact text on their pinned tables (self-test: refused its drift)`; `post-migrate pass: 44 apply-time blocks, 34 re-run as written, 10 superseded and replaced`; ok |
| C | `977 isolation case(s) passed` |

The static suite judged the branch name `test/q0-batch-123`, not the subject's, so the handoff
guard did not run against it (§9).

### Catalog survey on the clean set

- **17** app tables grant `authenticated` UPDATE on `updated_by`, and each carries
  `<table>_updated_by_on_update_is_caller`: restrictive, `w`, TO `{authenticated}`, `polqual` null,
  WITH CHECK `(updated_by = ( SELECT auth.uid() AS uid))`.
- `authenticated` holds no DELETE and no TRUNCATE on any app table, so no row can be re-created to
  shed its `updated_by`.
- `authenticated` has no USAGE on `auth`, holds INSERT on `updated_by` on 14 tables (the 102
  closures), and holds no INSERT at all on `research_runs`, `research_suggestions`, `workspaces` or
  `workspace_settings`.
- **`approval_requests.decided_by` and `decided_at`** are UPDATE-granted to `authenticated` and
  INSERT-granted to nobody. `app_worker` holds no grant on `approval_requests`.
- `app_worker` holds UPDATE on `updated_by` on 9 tables and INSERT on 11, and **no policy anywhere**,
  so row level security refuses every such write today.
- `anon` has no USAGE on `app`. No role is a member of `authenticated`.
- The only schemas `authenticated` can use are `app` and `public`. `public` holds no table.
- The three CHECKs on `approval_requests`: `status_known`; `decision_has_a_decider` (090),
  `(status in (approved, changes_requested)) = (decided_at is not null and decided_by is not null)`;
  and 123's `decider_is_a_pair`, `(decided_at is null) = (decided_by is null)`.

---

## 2. Live probes on the clean set

### 2.1 `updated_by`, all seventeen tables

Eight identities: owner, admin, editor, page editor, approver and viewer of workspace A, the
suspended member of A, and the owner of B. Three values: another member, NULL, and the caller
(control).

| probe | statements | forged |
|---|---|---|
| UPDATE, as built | 17 × 8 × 3 = 408 | **0**. Every `other` and `NULL` write was refused or reached no row. Every table but `approval_requests` admitted the control for at least two identities; `approval_requests` admits none without a status change, as designed |
| UPDATE, with a looser permissive sibling `USING (true) WITH CHECK (true)` created inside the transaction | 408 | **0**. Every refusal, on all 17 tables and all 8 identities, names that table's own `<table>_updated_by_on_update_is_caller` |
| `INSERT … ON CONFLICT DO UPDATE SET updated_by = other / NULL`, and a proposed row carrying `excluded.updated_by = other` (approval_policies, business_profiles, content_ideas, content_targets, industry_assignments, knowledge_items, page_context_profiles, publish_intents; owner, admin, editor, page editor) | 128, twice (as built and with the sibling) | **0**. With the sibling, every DO UPDATE forgery that reaches the update arm is refused by name by the UPDATE closure; the rest are refused earlier by the INSERT policy (roles that may not insert). Every `excluded` forgery is refused by 102's INSERT closure before the update arm is reached |
| `MERGE … WHEN MATCHED THEN UPDATE SET updated_by = other / NULL`, same eight tables, owner and editor | 48, twice | **0**. With the sibling, each is refused by name by the UPDATE closure |

**Verdict on the brief's first class:** I found no way for any client identity to forge
`updated_by` on any of the 17 tables, through UPDATE, upsert, MERGE or NULL, even with a later
looser permissive policy in place. That last part is what 123 adds: on 105 the same sibling forged
on the ten.

### 2.2 `decided_by` and `decided_at`

Each on `approval_request_a1` (pending) unless stated.

| # | who, what | result |
|---|---|---|
| D1 | editor cancels, `decided_by` = approver (the new case) | refused, `decider_is_a_pair` |
| D1b | editor cancels, `decided_by` = approver, `decided_at` = now() | refused, `decision_has_a_decider` |
| D2 | owner cancels naming itself decider, with `decided_at` | refused, `decision_has_a_decider` |
| D3 | editor cancels, `decided_at` alone | refused, `decider_is_a_pair` |
| D4 | admin cancels, `decided_by` = a UUID of nobody | refused, `decider_is_a_pair` |
| D4b–d | admin/owner stamp `decided_by` or `decided_at` on a row kept pending, or set `expired` | refused by row level security: no policy writes those |
| D5 | approver approves, `decided_at` null | refused, `decider_is_a_pair` |
| D6 | approver approves naming the owner as decider | refused by the decide policy |
| **D7** | **approver approves with `decided_at = '2000-01-01'`, and with `'2999-01-01'`** | **ACCEPTED, 1 row each** (F7) |
| D8 | approver re-stamps, or owner cancels, an already-decided row | 0 rows |
| S1 | `app_worker` cancels naming a decider | `permission denied for table approval_requests` |
| S2, S3 | superuser `postgres` cancels naming a decider; expires with `decided_at` alone | refused, `decider_is_a_pair` |
| S5 | S2 under `session_replication_role = replica` | refused, `decider_is_a_pair` |
| I1 | editor INSERTs a request carrying `decided_by` | `permission denied` (no INSERT grant on the column) |
| I2 | superuser INSERTs a `cancelled` request carrying `decided_by` | refused, `decider_is_a_pair` |

**Verdict on the brief's second class:** on the clean set, no path writes `decided_by` or
`decided_at` onto a cancelled, pending or expired row: not UPDATE, not INSERT, not the service,
not the superuser, not replica mode. Q0-105 F1 is closed **as built**. Two things remain, both
below: that closure depends on a CHECK nothing pins (F1), and the decider's identity on a decision
still rests on one permissive policy (F2).

The same probes with a looser permissive sibling on `approval_requests` inside the transaction:

| # | result |
|---|---|
| L1, L2 | cancelling or expiring with a decider or `decided_at` alone: refused by `decider_is_a_pair` |
| **L3** | **an editor approves naming the approver as decider: ACCEPTED** |
| **L4** | **an approver approves naming the owner as decider: ACCEPTED** |
| **L5** | **an approver re-stamps an already-approved row with the owner as decider: ACCEPTED** |
| **L6** | **with `or true` appended to the decide policy instead: an approver approves naming the owner: ACCEPTED** |

The pair constrains **presence**, not **identity**. That is F2.

---

## 3. My 105 survivors, re-run against 123

| id | drift (appended to 140) | A (full) | S | B | C | L |
|---|---|---|---|---|---|---|
| D08 | a second permissive UPDATE policy on content_items, role-gated, `updated_by` unbound | G | G | G | G | owner forging `other` and `NULL` refused by `content_items_updated_by_on_update_is_caller` |
| D08b | the same sibling on content_ideas | G | G | G | G | refused by `content_ideas_updated_by_on_update_is_caller` |
| D09 | content_items writer CHECK `(updated_by = uid or updated_by is not null) and role` | G | G | G | G | `other` refused by 123's policy by name |
| D09b | a workspaces permissive sibling `WITH CHECK ((updated_by = uid) or true)` | G | G | G | G | refused by 105's workspaces closure (as on 105) |
| D09c | publish_intents' permissive policy rewritten `WITH CHECK (true)` | G | G | G | G | refused by `publish_intents_updated_by_on_update_is_caller` |

**Each still leaves every layer green, and none is an exposure any more.** Which layer catches
each: none of A, S, B or C; **the database does**, through 123's restrictive policy, by name. That
is the right answer for this class: a permissive policy is allowed to exist, and the restrictive
closure makes it harmless.

G01–G04 are in §4.2.

---

## 4. Mutation table

Verdicts: `G` = green (missed), `C` = caught. `SKIP` = C could not run because the set did not
build; where a mutation to 123's own file stops the build, the `E`-row of §4.3 measures C.

### 4.1 Mutations to 123's statements

| id | mutation | A | S | B | C | E-row for C |
|---|---|---|---|---|---|---|
| M01 | content_items closure removed | C (123's pin test) | G | C (123's block, apply time) | SKIP | E01: **G** |
| M02 | content_items closure AS PERMISSIVE | C | G | C | SKIP | E02b: **G** |
| M03 | publish_intents closure `or updated_by is null` | C | G | C | SKIP | E03: **G** |
| M04 | research_runs closure TO authenticated, anon | C | G | C | SKIP | E04: **G** |
| M05 | approval_requests closure FOR ALL | C | G | C | SKIP | E05b: **G** |
| M06 | the pair removed | C | G | C (123's block) | SKIP | E07: **C** (the new case) |
| M07 | the pair one-directional: `decided_by is null or decided_at is not null` | C | G | C | SKIP | E08: **G** |
| M08 | the pair NOT VALID | C | G | C | SKIP | E08b: **G** |

### 4.2 Mutations to 123's general rule (105's G01–G04, re-targeted)

| id | mutation | A (full) | S | B | C |
|---|---|---|---|---|---|
| G01 | `relkind in ('r','p')` → `('x')` | G (full: 671/671) | G | G | G |
| G02 | the exact-text test wrapped in `(true or …)` | C (the proxy: "no apply-time block … is silenced from inside its own predicate") | G | G | G |
| G02b | `not pol.polpermissive and … polqual is null` removed | G (full: 671/671) | G | G | G |
| G03 | `raise exception` → `raise notice` | G (full: 671/671) | G | G | G |
| G04 | `has_column_privilege(…) and false` | C (the same silenced-block test) | G | G | G |
| G05 | the count of 17 → `count_of < 0` | G (full: 671/671) | G | G | G |
| G06 | the pair check `if false and not exists` | C (the same) | G | G | G |
| G07 | the RLS enabled-and-forced test removed | G (full: 671/671) | G | G | G |

On the clean set these are invisible to B and C by construction: the rule has nothing to refuse.
What matters is whether anything else holds the line when the rule is silenced **and** the class
reappears. §4.5 measures that. Short answer: for `updated_by`, yes, until three rules are silenced
at once; for the pair, no.

### 4.3 Drifts appended to 140

| id | drift | A | S | B | C | L |
|---|---|---|---|---|---|---|
| E01 | content_items closure dropped | A* | G | C (the probe: "has no …") | G | refused by the permissive policy |
| E01b | E01 + a permissive sibling `USING (true) WITH CHECK (true)` | A* | G | C (the probe) | C, incidentally (approver and viewer rename cases see a row) | **owner forged 5 rows, `other` and `NULL`** |
| E02 | content_items closure `WITH CHECK (true)` | G | G | C (the probe, exact text) | G | refused by the permissive policy |
| E02b | content_items closure recreated AS PERMISSIVE | A* | G | C (the probe) | G | refused |
| E02c | E02b + D08's role-gated sibling | A* | G | C (the probe) | **G** | **owner forged 4 rows** |
| E03 | publish_intents closure `or updated_by is null` | G | G | C | G | — |
| E04 | research_runs closure TO authenticated, anon | G | G | C | G | — |
| E05 | assets closure `USING (true)` | G | G | C | G | — |
| E05b | approval_requests closure recreated FOR ALL | A* | G | C | G | — |
| E06 | content_targets closure renamed | G | G | C ("has no …") | G | — |
| E07 | the pair dropped | G | G | C (123's block in the post-migrate pass) | **C**: exactly `editor-a-cannot-cancel-an-approval-request-naming-a-decider`, "the database accepted the row (1 returned)" | D1 accepted |
| E08 | the pair replaced one-directional | G (full: 671/671) | G | C (123's block, by definition text) | **G** | **D3: editor cancels with `decided_at` alone, 1 row** |
| E08b | the pair re-added NOT VALID | G | G | C (123's block: `convalidated`) | G | refusals unchanged |
| E09 | content_items NO FORCE row level security | G | G | C (080's replacement, and further blocks) | G | — |
| E10 | content_items RLS disabled | G | G | C | C (13 of 977) | — |
| E11 | `grant update (updated_by) on app.workspace_member_scopes to authenticated` | G (full: 671/671) | G | C (the probe's coverage rule, by name) | G | owner: 0 rows (no UPDATE policy on member scopes admits one) |
| E12 | a new app table granting `updated_by`, RLS forced, permissive `WITH CHECK (true)`, no closure | C (via schema-lint) | C (no owner comment) | C (the coverage rule, by name) | G | — |
| E13 | the same, PARTITIONED | C (via schema-lint) | C | C (the coverage rule names the parent) | G | — |
| **E14** | **the same table in schema `public`** | **G (full: 671/671)** | **G** | **G** | **G** | **owner forged 1 row** |
| E15 | an app VIEW over content_items, owner's rights, UPDATE granted to authenticated | C (via schema-lint) | C ("view … is not security_invoker — §8.5") | G | G | owner of A rewrote all 5 content_items rows through it, tenant B's included |
| **E16** | **a permissive UPDATE policy TO app_worker on workspaces** | **A‡ only** | **G** | **G** | **G** | **the service rewrote `updated_by` on both tenants' workspaces (2 rows)** |
| E17 | anon granted UPDATE (updated_by) on content_items + an anon policy | A‡ | G | C (080's replacement: "anon holds a privilege") | G | anon: no USAGE on `app` |
| E17b | E17 + USAGE on `app` for anon | A‡ | G | C | C (55 of 977) | — |
| E18 | approval_requests: a looser permissive UPDATE sibling for writers | G | G | C (090's replacement: "does not bound the status it writes") | C (4 of 977) | — |
| E19 | the decide policy's WITH CHECK `… or true` | G | G | G | C (4 of 977: role gating) | L3, L4 accepted |
| **E19b** | **the decide policy's `decided_by = auth.uid()` conjunct removed, role and status bounds kept** | **G (full: 671/671)** | **G** | **G** | **G** | **L4: an approver approves naming the owner as decider, 1 row** |
| **E20** | **090's `decision_has_a_decider` dropped** | **G (full: 671/671)** | **G** | **G** | **G** | **D2, D2b: owner and editor cancel with `decided_by` = approver and `decided_at` set, 1 row each** |
| **E20b** | **`decision_has_a_decider` weakened to one direction (a decision needs both; nothing said of the rest)** | **G (full: 671/671)** | **G** | **G** | **G** | **D2, D2b accepted** |
| E21 | a status-bounded permissive policy letting owner/admin EXPIRE pending requests | G | G | C (090's replacement: "the one status value nothing may produce") | C (1) | — |

### 4.4 The probe's coverage rule (scripts/db/run.mjs)

| id | mutation | A | S | B | C |
|---|---|---|---|---|---|
| R01 | coverage `raise exception` → `raise notice` | C (probe digest pin) | G | **G** | G |
| R02 | coverage `and false` in its WHERE | C (probe digest pin) | G | **G** | G |
| R03 | content_items removed from `UPDATED_BY_ON_UPDATE_CLOSURES` | C (123's pin test, digest) | G | C (the UPDATE rule sees an unpinned closure) | G |
| R04 | R01 + the probe digest updated to match | C (full only: the coverage-floor tripwire, exit 86, over the edited test file) | G | G | G |
| R05 | R02 + the probe digest updated to match | C (the same tripwire) | G | G | G |
| **R04m** | **R04 + `npm run regenerate:manifest`** | **G (full: 671/671)** | **G** | **G** | **G** |
| **R05m** | **R05 + `npm run regenerate:manifest`** | **G (full: 671/671)** | **G** | **G** | **G** |
| R06 | the UPDATE closureRule's `'w'` → `'a'`, digest updated | G | G | C (the rule fails as built) | G |

**Is the coverage rule self-tested? No.** R01 and R02 leave B green, and migrate-clean still prints
`(self-test: refused its drift)` for the closure-text probe. The probe's one drift is
`alter policy knowledge_items_updated_by_is_caller … with check (true)`, which the FIRST rule (the
INSERT closures) refuses; plpgsql stops at the first raise, so the UPDATE rule and the coverage rule
are never shown to fire. Only static pins see an edit to them (F3).

### 4.5 Combinations: what holds when a rule is silenced and its class returns

| id | combination | A | S | B | C |
|---|---|---|---|---|---|
| G03+E12 | 123's rule `raise notice` + a new unclosed table | C (via lint) | C | C (the coverage rule) | G |
| G07+E09 | 123's RLS test removed + content_items NO FORCE | G | G | C (080's replacement) | G |
| R04+E12 | coverage silenced (digest updated) + a new unclosed table | C (via lint) | C | C (105's weak rule: "no UPDATE policy … even names updated_by = auth.uid()") | G |
| R05+E11 | coverage `and false` (digest updated) + the member-scope grant | G | G | C (021's block, then 105's) | G |
| R05+G03+E12 | both exact live rules silenced + a new unclosed table | C (via lint) | C | C (105's weak rule) | G |
| E12b | a new app table whose permissive policy is `WITH CHECK ((updated_by = uid) or true)`, no closure: 105's substring rule accepts it | C (via lint: no owner comment) | C | C (the coverage rule) | G |
| G03+E12b | 123's rule `raise notice` + E12b | C (via lint) | C | C (the coverage rule) | G |
| R05+E12b | coverage `and false` + E12b | C (tripwire) | C | C (123's block in the post-migrate pass) | G |
| R05+G03+E12b | coverage `and false` + 123's rule `raise notice` + E12b | C (tripwire, lint) | C | **G** | G |
| E12c | E12b with an owner comment: a well-formed new table, no closure | G (full: 671/671) | **G** | C (the coverage rule), the only layer | G |
| **R05m+G03+E12c** | **coverage `and false`, probe digest and manifest refreshed, 123's rule `raise notice`, and E12c** | **G (full: 671/671)** | **G** | **G** | **G**: the owner forged the new table's `updated_by` (1 row) |
| G06+E08 | 123's pair check `if false` + the pair one-directional | C (silenced-block test) | G | G | G |
| **G06b+E08** | **123's pair check `raise notice` + the pair one-directional** | **G (full: 671/671)** | **G** | **G** | **G** |

For `updated_by` the defence is three live rules deep (105's block, 123's block, the probe).
Schema-lint's table rules are generic and a well-formed table passes them (E12c). For the pair it is
one live rule (123's block) and one case, and the case covers one direction.

---

## 5. Negative controls

- **The Author's:** "with a looser permissive UPDATE policy on content_items, an owner forges
  `updated_by` without 123 and is refused by 123's policy with it." **Reproduced.** E01b (123's
  content_items closure dropped, sibling added) forged 5 rows for `other` and for `NULL`; with the
  closure, the same sibling (D08, §2.1) is refused by `content_items_updated_by_on_update_is_caller`.
- **The new case fails for the right reason.** With the pair dropped (E07), exactly one of 977
  fails: `editor-a-cannot-cancel-an-approval-request-naming-a-decider`, "the database accepted the
  row (1 returned) and had to refuse it with 23514". With the pair present the live refusal names
  `approval_requests_decider_is_a_pair`. The case names the caller as `updated_by`, so neither the
  permissive policy nor 123's closure can refuse it in the pair's place.
  **Two limits:** the runner checks the SQLSTATE and not the constraint name, so any other 23514 on
  that row would satisfy it; and the case sets `decided_by` alone, so it proves one direction of
  the pair (E08, F4).

---

## 6. Legitimate flows

Live, on the clean set, each in a rolled-back transaction:

| flow | result |
|---|---|
| editor cancels a pending request | 1 row |
| owner cancels | passes as the isolation case `owner-a-can-cancel-an-approval-request` |
| approver approves; approver requests changes; owner approves (each naming itself, `decided_at = now()`) | 1 row each |
| an `expired` transition (superuser; no client policy writes `expired`) | 1 row |
| the same under E21, a hypothetical status-bounded expire policy for owner/admin | an honest expire: 1 row; expiring with a decider and `decided_at`, or `decided_at` alone: refused by the two CHECKs. (090's replacement refuses the policy itself.) |
| fixture load: approved and changes_requested rows carry both columns | loads; 977 pass |
| every honest UPDATE on all 17 tables naming the caller | admitted wherever a permissive policy admits the row (§2.1) |

**The pair breaks no legitimate flow that exists in the repository.** It forbids a two-step decide
(stamp the decider, then the status); no such flow exists, and 090's first CHECK already forbade it.

On a populated database the forward fix could not apply as written: `add constraint … check`
validates existing rows, and a row forged under Q0-105 F1 (a cancellation carrying `decided_by`)
would abort 123. No database is deployed and `db-migrate-upgrade` has no fixture, so this is
recorded, not graded above INFO (F8).

---

## 7. Findings

### F1 — MEDIUM. The cancellation closure rests on two CHECKs; only 123's is pinned, and dropping 090's reopens Q0-105 F1 with every layer green.

123's comment states the guarantee as a conjunction: "so **with the first** a cancelled, pending or
expired row carries neither." Measured:

- E20 (a later migration drops `approval_requests_decision_has_a_decider`) and E20b (weakens it to
  "a decision needs both"): an owner and an editor each cancel a pending request with
  `decided_by` = the approver **and** `decided_at` set, 1 row each.
- Every layer stays green, full `npm run verify` included (671/671). No apply-time block, no
  replacement invariant, no probe and no case asserts `decision_has_a_decider` on the final database (`grep` finds it only in 090's DDL and
  in 123's comments). 123's block asserts the pair by definition text; the new case sets
  `decided_by` alone, which the pair refuses by itself.

This is Q0-105 F1's forgery, in the paired form, one statement away and invisible, on the claim
123 makes "for every writer and path". Not live today.

**Remedy:** assert `approval_requests_decision_has_a_decider` by definition text beside the pair
(in 123's block, or in the closure-text probe); add a case cancelling with both `decided_by` and
`decided_at` (expects 23514).

### F2 — MEDIUM. The decider's identity on a decision is still bound only inside a permissive policy: Q0-105 F2's class, on `decided_by`.

123 applies the restrictive-closure lesson to `updated_by` and not to `decided_by`. The pair
constrains presence; `decided_by = auth.uid()` lives only in the permissive
`approval_requests_update_decide_approver`. Measured:

- E19b (that conjunct removed, role and status bounds kept): an approver approves naming the owner
  as decider, 1 row; **every layer green**, full `npm run verify` included (671/671).
- In-transaction (§2.2 L3–L6): with a looser sibling, an editor records an approval in the
  approver's name and an approver re-stamps an already-approved row; with `or true`, an approver
  approves in the owner's name.
- No case names another decider on the decide path; every decide case passes the caller.

`decided_by` is the approval's attribution, the record a publish decision rests on. Not live today
(D6 refused).

**Remedy:** a restrictive `approval_requests_decided_by_on_update_is_caller`, `for update to
authenticated with check (decided_by is null or decided_by = (select auth.uid()))`, pinned in the
closure-text probe; and a case "approver cannot decide naming another decider". It is compatible
with every current flow: cancel and expire carry no decider, and no policy admits an update to a
decided row.

### F3 — LOW. Q0-105 F3 is half closed: the coverage rule is live but, like the UPDATE closure rule, not self-tested.

R01 and R02 disable the coverage rule and leave B and C green; migrate-clean still prints
`(self-test: refused its drift)`. The probe's only drift exercises the INSERT rule (§4.4). With the
probe digest updated in the same edit (R04, R05), only the coverage-floor tripwire sees it. With
`npm run regenerate:manifest` in the same change as well (R04m, R05m), every layer is green, full
verify included. The tripwire says as much of itself: "A commit that updates both still passes".
G01, G02b, G03, G05 and G07 disable parts of 123's own general rule; each passes every layer, full
verify included.

**Nothing is exposed by this for `updated_by`:** §4.5 shows 105's block, 123's block, the probe
catch a returning class while any one of them is live. The first combination that passes every
layer with a live forgery is R05m+G03+E12c: the coverage rule silenced with its digest and the
manifest refreshed, 123's rule downgraded to a notice, and a well-formed new table whose policy
105's substring rule accepts. That takes four edited files, each visible in a diff.

**Remedy:** one drift per rule. For example
`grant update (updated_by) on app.workspace_member_scopes to authenticated` expecting the coverage
raise, and `alter policy content_items_updated_by_on_update_is_caller … with check (true)` expecting
the UPDATE rule's raise. `catalogProbeJobs` takes one drift per probe, so either let it take a list
or split the closure-text probe into three.

### F4 — LOW. The pair is proven in one direction only.

No case writes `decided_at` alone. E08 (the pair replaced by `decided_by is null or decided_at is
not null`) lets an editor cancel with `decided_at` alone (1 row), and only 123's block (B) sees it.
With that block's raise downgraded to a notice (G06b+E08), nothing does, full verify included. The
static silenced-block test catches `if false and` (G06) but not `raise notice`. The runner's `rejected`
check compares SQLSTATE only, so the new case would also pass on any other 23514 (Q0-105 F4's shape).

**Remedy:** a case "editor cannot cancel an approval request with decided_at alone" (23514).
Optionally, let `rejected` cases name the constraint and assert it.

### F5 — LOW. Five of the ten tables still have no UPDATE forging case (carried from Q0-105 F2's remedy).

content_items, asset_rights, approval_policies, approval_requests and publish_intents. On all ten
the permissive policy refuses a forgery before 123's closure is consulted, so rls-smoke cannot see a
missing 123 closure (E01–E06 C green). That is expected for a defence in depth. But E02c, a live
forgery on content_items (123's closure made permissive plus D08's sibling, 4 rows), is caught only
by the probe (B) and the 140-only `A*`; a content_items forging case would catch it in C too.

**Remedy:** add the five cases, each naming another member as `updated_by`.

### F6 — LOW. The rules read schema `app` and role `authenticated` only.

- E14: a table in `public` (where `authenticated` has USAGE) granting UPDATE on `updated_by`, RLS
  forced, permissive `WITH CHECK (true)`: the owner forged 1 row; every layer green, full verify
  included.
  123's rule and the coverage rule both filter `n.nspname = 'app'`, and the coverage rule's comment
  ("A table that grants authenticated UPDATE on updated_by and is not in the pinned list fails
  here") does not say so.
- E16: a permissive UPDATE policy `TO app_worker` on `workspaces`, where the worker already holds
  UPDATE on `updated_by`: the worker rewrote `updated_by` on both tenants' workspaces. Only a rule
  that reads 140 alone refuses it (`A‡`); B, C and S are green. Whether a service write must name an
  acting user is RFC-2026-023's question, not 123's, so this half is for the Owner.

**Remedy:** read every non-system schema in both rules. Decide, under RFC-2026-023, whether the
closures should bind `app_worker` too.

### F7 — LOW, pre-existing (090), outside 123's claim. `decided_at`'s value is the client's choice.

D7: an approver approved with `decided_at` `2000-01-01` and `2999-01-01`, 1 row each. The pair and
the decide policy check presence only. Recorded because the brief asked about `decided_at`.

**Remedy:** set `decided_at` in a BEFORE UPDATE trigger when the status becomes a decision (as
`set_updated_at` does for `updated_at`), or bind it in a restrictive policy; add a case.

### F8 — INFO. No recovery path for rows the pair would reject.

See §6. Pre-G0 there is nothing to recover. If a deployed database ever precedes 123, the recovery
the contributor guide asks of a forward fix (clear `decided_by`/`decided_at` on non-decisions
first, or add NOT VALID and validate after) is unwritten.

---

## 8. Stop-the-line verdict

**No stop-the-line condition found in batch 123.**

- No tenant leakage, no secret exposure, no migration divergence. The worktree and the five touched
  files were restored byte for byte after every run.
- On the clean set, no client identity forged `updated_by` on any of the 17 tables through UPDATE,
  upsert, MERGE or NULL, even with a looser permissive sibling present (1,168 statements, §2.1).
- On the clean set, no path wrote `decided_by` or `decided_at` onto a cancelled, pending or
  expired row, including the service, the superuser and replica mode (§2.2).
- My 105 survivors D08, D08b, D09, D09b and D09c are harmless now: 123's policy refuses each by name.
- The Author's negative control reproduces, and the new case fails for the right reason.

**Survivors.** With a live exposure: E14, E19b, E20, E20b, G06b+E08 and R05m+G03+E12c. Without
one: D08, D08b, D09, D09b, D09c, G01, G02b, G03, G05, G07, R04m and R05m. E16 survives everything
but a rule that reads 140 alone.

F1 and F2 are forward-looking: each is one later migration away from a live attribution forgery,
and each such migration is measured to pass every layer. Neither is live on `5856f0b`. Whether
either must be fixed before merge is the Owner's decision; A1's and C0's runs may grade them
differently.

---

## 9. Limits

- A0 named the starting classes and I share A0's model family. F1 came from asking what 123's
  comment assumes ("with the first"); F2 from asking whether the pair constrains identity or only
  presence. What neither of us thought of is not here.
- I did not observe CI. The static suite judged the branch name `test/q0-batch-123`, not the
  subject's, so `handoff-conformance` found no package claiming the branch and skipped.
- `auth.uid()` in the shim reads a USERSET GUC, so a session with raw SQL can choose its own `sub`.
  That trust belongs to the platform, not to 123. It is untested and out of scope.
- The drift method appends to 140. The `A*` and `A‡` catches are confounds: the same drift in any
  other file would not meet them.
- The upsert and MERGE probes covered the eight of the 17 tables whose unique keys are
  client-insertable; the other nine have no client-reachable conflict target.
- 95 mutation runs under Node 24 (after the discarded Node 26 pass), 1,168 `updated_by` statements
  and 31 `decided_by` statements on the clean set, and a 33-statement live probe after each drift.
  They are a sample, not a proof.
