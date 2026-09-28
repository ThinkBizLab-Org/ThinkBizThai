# Q0 re-test: batch 123's corrections (who decided is the caller, and every probe rule can fail)

Run: `/claude/q0_sentinel`
Role: independent Tester. `work-packages/WP-0A-DB-00.json` `role_assignments.tester_agent_run_id`
names `/claude/q0_sentinel`. This file comes from a distinct run of it.
Subject: the corrections on branch `agent/claude/WP-0A-DB-00-batch-123`: `f429fe6` (the fix) and
`f2c1a54` (the handoff, alone), on top of `8ba29d0`. I read `git diff 8ba29d0 f2c1a54` in full.
Author: `/claude/a0_atlas`.
Why this run exists: RFC-2026-025 §5 item 2 (approved 2026-09-28). A fix commit is re-verified before
merge. My test of `5856f0b` (`q0-batch-123-test-review-2026-09-28.md`, F1–F8) does not cover it.
Local test branch: `test/q0-batch-123-fix`, created at `f2c1a54`.
Date: 2026-09-28.

**This document RECORDS TEST RESULTS.** It advances no package status. It writes `test_verified`
nowhere, signs nothing on anyone's behalf, and repairs nothing it found. Every defect named below
is left as it is on the subject branch.

My harness edited nine files during mutations:

- `140_audit.sql` (drifts are appended to it);
- `123_attribution_closures_everywhere.sql`;
- `scripts/db/run.mjs`;
- `foundation-contract.test.mjs`;
- `integrity-manifest.json`;
- `isolation-cases.mjs`;
- `run-isolation.mjs`;
- `identity-isolation.test.mjs`;
- `scripts/test-suite-contract.mjs`.

After every mutation it copied each file back from a saved original, compared SHA-256, and required
an empty `git status --porcelain` before the next one. Before the first run and after the last, the
hashes matched:

| file | SHA-256 |
|---|---|
| `140_audit.sql` | `2ac596bb…` |
| `123_…` | `2ff65b5a…` |
| `run.mjs` | `232ab5be…` |
| `foundation-contract.test.mjs` | `86cdf2cf…` |
| `integrity-manifest.json` | `3f5b34c7…` |
| `isolation-cases.mjs` | `8ec4d84b…` |
| `run-isolation.mjs` | `a1b93361…` |
| `identity-isolation.test.mjs` | `6cacfbcf…` |
| `test-suite-contract.mjs` | `4239f23a…` |

`git diff f2c1a54` shows nothing but this file, which is the only one this run adds.

---

## 0. What I am, before anything else

**I am a SUBAGENT spawned by the Author run `/claude/a0_atlas`.** I ran in a git worktree A0
created, under a brief A0 wrote. A0 chose all of the following:

- the subject;
- the port and the cluster recipe;
- the output filename;
- the five starting classes I had to cover "at minimum":
  1. my survivors re-run against the head;
  2. A0's negative controls reproduced;
  3. mutations to the new probe machinery;
  4. residue from the new self-test drifts;
  5. the nine new cases and the one changed case.

A0 also wrote the change under test. That change answers findings of mine (Q0-123 F1–F5), and A0's
integration record says what each became.

**I am the same vendor as the Author (Anthropic), and the same model family.** RFC-2026-024 is
approved and withdrew the cross-vendor condition. What remains is CONTRIBUTING_AGENTS.md's
separation of duties: four distinct `agent_run_id`s, and no run approves, test-verifies, integrates
or gate-approves its own work.

**Whether this file is accepted as the Tester signature is the Integration Owner's and the Product
Owner's decision.** It is not mine.

---

## 1. How I measured

PostgreSQL 17.11 from `/opt/homebrew/bin`. Node `v24.20.0` and npm `11.19.0`, the declared
toolchain. I checked `node -v` before the baseline, before the resumed session, and in every
cluster run's log, and all 93 mutation runs used it. The cluster lived in my private directory
`…/scratchpad/q0-123f/`. I wrote nothing elsewhere in the shared scratchpad.

The recipe:

- `initdb --locale=C -A trust -U postgres`, **fresh before every run**;
- TCP only on `127.0.0.1:5503`, with `-c unix_socket_directories=''`;
- `LC_ALL=C`;
- `db/foundation/ci/supabase-shim.sql` applied first;
- then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean`, and
  `make db-rls-smoke` with the same URL.

**Ports 5432 and 5499 were never contacted.** The cluster is stopped and its data directory is
removed.

The run was cut once by a session limit, after the survivor pass. Nothing was written to the
repository before the cut. On resuming I confirmed four things: the tree was clean at `f2c1a54`; all
nine originals matched; nothing was listening on 5503; and `node -v` printed 24.20.0.

Layers per mutation:

| col | layer |
|---|---|
| A | Static suite. A fast proxy on every run: `foundation-contract`, `identity-isolation` and `ctr-job-001`, 379 tests. Every row that passed the proxy was re-run with the full `npm run verify`, 672 tests |
| S | `make db-schema-lint` |
| B | `make db-migrate-clean`: the apply-time blocks, the nine catalog probes with their self-tests, and the post-migrate pass |
| C | `make db-rls-smoke`: 986 cases |
| L | A live probe on the same database after C: 34 statements, each in its own transaction and rolled back |
| R | Residue after C: rows in `pg_db_role_setting`, relations named `probe_child_of_security_events`, rows in `pg_inherits` |

A **survivor** is a mutation that leaves A, S, B and C green. An **exposure** is a survivor whose
live probe forges something.

Two static rules read `140_audit.sql` alone, so a drift written in any other file would not meet
them. Where they are the only thing that catches a drift, the A column marks it:

- **`A*`:** "batch 140 adds to the merged batches and rewrites none of them" refuses `drop policy`
  in 140.
- **`A‡`:** "the service holds grants and no policy" refuses a policy `TO app_worker` in 140.

### Baseline on `f2c1a54`: reproduced

| layer | result |
|---|---|
| A | `npm run verify`: `clean: exit 0 — tests 672, pass 672, fail 0` |
| S | ok |
| B | Nine probes, each with its claim and `(self-test: refused its drift)`. The security definer probe says `each of its 2 drifts`, and the trigger probe `each of its 4 drifts`. The post-migrate pass: `44 apply-time blocks, 34 re-run as written, 10 superseded and replaced`. ok |
| C | `986 isolation case(s) passed` |
| R | 0 role settings, no probe child, 0 `pg_inherits` rows |

I also ran every probe job on its own and read what it raised (§4.0). All 13 drifts are refused by
their own rule's raise: 1+1+1+1+1+1+1+2+4, as A0 claims.

On the clean set, 34 forging and deciding statements behave as follows:

- every `updated_by` forgery on nine tables is refused, for another member and for NULL;
- a cancellation naming another decider is refused by
  `approval_requests_decided_by_on_update_is_caller`;
- a cancellation naming itself, or carrying `decided_at` alone, is refused by
  `approval_requests_decider_is_a_pair`;
- a cancellation carrying a whole decision stamp in the caller's name is refused by
  `approval_requests_decision_has_a_decider`;
- an honest approval lands (1 row).

---

## 2. My survivors from `5856f0b`, re-run against `f2c1a54`

| id | on `5856f0b` | A | S | B | C | L on `f2c1a54` | now |
|---|---|---|---|---|---|---|---|
| **E14** | survivor, exposure | **G (full 672/672)** | G | G | G | **owner rewrote `public.q0_pub`, 1 row** | **still a survivor with exposure**. Recorded by A0, not fixed |
| **E16** | `A‡` only, exposure | `A‡` only | G | G | G | **the service rewrote both tenants' `workspaces`, 2 rows** | unchanged. Recorded, and RFC-2026-023's question |
| E19b | survivor, exposure (L4) | G (full 672/672) | G | G | G | L4 refused **by name** by the decider closure | **survivor without exposure**: the database holds it |
| E20 | survivor, exposure | G | G | **C** (pinned check probe) | **C** (`…-with-a-whole-decision-stamp`) | a caller-named whole stamp lands (D2s, D2se); a stamp naming another decider is refused by the decider closure | caught twice |
| E20b | survivor, exposure | G | G | **C** (pinned check probe) | **C** (the same case) | as E20 | caught twice |
| G06b+E08 | survivor, exposure | G | G | **C** (pinned check probe) | **C** (`…-with-only-a-decided-at`) | D3 lands | caught twice |
| R05m+G03+E12c | survivor, exposure | G (full 672/672) | G | **C** (the coverage probe's self-test: "passed") | G | X3: owner forged 1 row | caught by B alone. §4.1 J2c removes that too |
| E02c | caught by B only, exposure | `A*` | G | C (updated_by update closure probe) | **G** | **owner forged 4 `content_items` rows** | unchanged: B only (F4) |
| D08, D08b, D09, D09b, D09c | survivors, no exposure | G (full 672/672 each) | G | G | G | each forgery refused by name by its table's 123 closure | unchanged, and the right answer |
| G01 | survivor | G (full 672/672) | G | G | G | — | unchanged |
| G02, G04, G06 | A (silenced-block test) | C | G | G | G | — | unchanged |
| G02b, G03, G07 | survivors | G (full 672/672 each) | G | G | G | — | unchanged |
| G05 | survivor | — | — | — | — | — | **N/A**: the fixed count is gone from 123 (A1 F7) |
| R04m | survivor | **C** (the drifts-equal-raises test: 0 raises, 1 drift) | G | **C** (self-test passed) | G | — | caught twice |
| R05m | survivor | G (full 672/672) | G | **C** (self-test passed) | G | — | caught by B |

**The corrections close the rows they were written for.** E19b is harmless now. E20, E20b and
G06b+E08 are caught by a probe and by a case. R04m and R05m can no longer silence the coverage rule
unnoticed.

G01, G02b, G03 and G07 (edits to 123's own general rule) still pass every layer. On the clean set
there is nothing for the rule to refuse. When the class returns, B catches it: R05m+G03+E12c.

**Two rows still pass every layer with a live forgery: E14 and E16.** Both are outside the claim;
A0 recorded both and did not fix them.

---

## 3. A0's negative controls, reproduced independently

Each control ran on a fresh cluster, with its drift appended to 140.

| control | A0 says | measured C | measured B |
|---|---|---|---|
| the pair dropped | exactly `…-naming-a-decider` and `…-with-only-a-decided-at` fail | **exactly those two**, "accepted the row (1 returned)". Live: D1s and D3 land | pinned check probe |
| 090's equivalence dropped | exactly `…-with-a-whole-decision-stamp` | **exactly that one** | pinned check probe. Its self-test then fails with 42704, because the drift's target is already gone |
| the decide binding removed (E19b) | 0 fail: the closure holds | **986/986**; L4 refused by name | green |
| the binding removed and the decider closure dropped | the two naming-another-decider cases | **exactly** `editor-a-cannot-cancel-…-naming-another-decider` ("raised 23514, which is not an RLS refusal") and `approver-a-cannot-decide-…-naming-another-decider` ("1 row(s) came back"). Live: L4 lands | decider closure probe (`A*` too) |
| the decider closure dropped alone | `…-naming-another-decider` fails: the pair refuses with 23514, not 42501 | **exactly that one** | decider closure probe |
| per table, the closure dropped beside an open permissive policy `USING (true) WITH CHECK (true)` | that table's new case fails | content_items 3 cases, approval_policies 4, approval_requests 9, asset_rights 3 and publish_intents 2. **Each set includes that table's new case.** The rest are role cases the open policy admits | updated_by update closure probe |
| per table, the closure dropped beside a role-preserving sibling (the table's own permissive UPDATE policy without its `updated_by` conjunct) | — | **exactly that table's new case**, on all five | the same |

**Every control A0 names reproduces.** "That table's new case fails" is true. It is exact only when
the looser policy keeps the table's role gating.

---

## 4. Mutations to the new machinery

### 4.0 The shipped self-tests, one job at a time

A script ran each of `catalogProbeJobs(CATALOG_RULE_PROBES)`'s 22 jobs through the driver's own
`feed('begin; … rollback;')` and printed the raise. All 9 as-built jobs passed. Each of the 13 drift
jobs failed with P0001 and its own rule's prefix: the security definer drift 2 by the pinned-list
rule, and the trigger drifts 2, 3 and 4 by the definitions rule, the role-default rule and the
inheritance rule. **No shipped drift is answered by an earlier rule.**

### 4.1 Mutation table

Where a row says "+ d+m", the probe digests in `foundation-contract.test.mjs` were recomputed and
`npm run regenerate:manifest` was run in the same change. "full" = the full `npm run verify`.

| id | mutation | A | S | B | C | L / R |
|---|---|---|---|---|---|---|
| **J1** | `catalogProbeJobs`: only the first three drifts of any probe are run (`if (i < 3)`) | **G (full 672/672)** | G | **G**, and still prints `trigger probe … (self-test: refused each of its 4 drifts)` | G | — |
| **J2** | `catalogProbeJobs`: the closure coverage probe's drifts are skipped by label | **G (full 672/672)** | G | **G**, and still prints `(self-test: refused its drift)` | G | — |
| **J2c** | **J2 + R05 (coverage `and false`) + d+m + G03 + E12c** | **G (full 672/672)** | **G** | **G** | **G** | **X3: the owner rewrote the new table's `updated_by`, 1 row** |
| **J3** | `decideCatalogProbes`: any P0001 accepted for drift 3 and later | **G (full 672/672)** | G | G | G | — |
| **J3c** | J3 + trigger drift 3 replaced by drift 1's text + d+m | **G (full 672/672)** | G | **G**: the role-default rule is no longer shown able to fire | G | — |
| J4 | `decideCatalogProbes`: a probe with no self-test is no longer failed | C (the synthetic verdict test) | G | G | G | — |
| X1 | trigger drift 3 replaced by drift 1's text (trips rule 1) + d+m | G | G | **C**: "after drift 3 failed with P0001: trigger(s) not enabled … must refuse it with … session_replication_role" | G | — |
| X2 | trigger drift 3 trips rule 1 and rule 3 + d+m | G | G | **C** (the same) | G | — |
| X3 | trigger drifts 3 and 4 swapped together with their raises + d+m | **C** (drift i answers rule i) | G | G | G | — |
| C1 | pinned check probe: a second rule, `raise exception '…'`, no drift + d+m | **C** (drifts-equal-raises: 2 and 1) | G | G | G | — |
| **C2** | the same rule written `raise '…'` (no level; PL/pgSQL's default is EXCEPTION) + d+m | **G (full 672/672)** | G | G | G | — |
| **C3** | the same rule written `raise exception using message = '…'` + d+m | **G (full 672/672)** | G | G | G | — |
| C4 | a tenth probe with `selfTests: []` | C ("all nine, in order") | G | **C** ("carries no self-test drift") | G | — |
| V1 | `…-naming-a-decider` names a prefix: `violates: 'approval_requests_decider'` | C (no migration creates it: `\b`) | G | G | **C** ("refused with 23514 … but not by approval_requests_decider") | — |
| V2 | the same case names 090's CHECK instead | G | G | G | **C** ("but not by approval_requests_decision_has_a_decider") | — |
| V3 | the runner matches the name without its quotes | C (the longer-name test) | G | G | G | — |
| **V4** | `runOne` stops passing `testCase.violates` to `assertRejectedWith` | **G (full 672/672)** | G | G | G | — |
| V0c | 090 replaced by `q0_cancel_is_bare CHECK (status <> 'cancelled' or decided_at is null)` | G | G | C (pinned check probe) | **C**: the whole-stamp case, "not by approval_requests_decision_has_a_decider" | whole stamps refused by `q0_cancel_is_bare` |
| **V4c** | **V4 + the V0c drift** | G | G | C (pinned check probe) | **G**: the case passes while the constraint it names is gone | — |
| P1 | `PINNED_CHECKS`' pair text set to E08's + d+m + G06b + E08 | **C** (123 and the probe pin one text) | G | G | **C** (`…-with-only-a-decided-at`) | D3 lands |
| **P2** | the pinned check probe narrowed: the pair checked by name only (its drift still reaches 090's pin) + d+m | **G (full 672/672)** | G | G | G | — |
| P2c | P2 + G06b + E08 | G | G | G | **C** (`…-with-only-a-decided-at`) | D3 lands |
| P2d | P2 + G06b + E08b (the pair weakened the other way) | G | G | G | **C** (`…-naming-a-decider`) | D1s lands |
| P3c | the probe narrowed on 090 + d+m + 123's 090 check `raise notice` + E20b | G | G | G | **C** (`…-with-a-whole-decision-stamp`) | D2s lands |
| F1 | an FK action exemption for a real key (`app.assets.assets_current_version_scope_fk`) + d+m | G (full 672/672) | G | G: the generated drift 2 is refused by the stale-exemption rule | G | — (as designed: an exemption costs a digest) |
| F2 | an exemption for drift 1's own key + d+m | G | G | **C** ("after drift 1 passed") | G | — |
| F3 | F1 + the stale-exemption rule never written + d+m | C (2 drifts, 1 raise) | G | **C** ("after drift 2 passed") | G | — |
| F4 | F1 + its drift never generated + d+m | C (1 drift, 2 raises) | G | G | G | — |
| F6 | the conditional forced off with no exemption | G | G | G | G | no-op: identical SQL, digests unchanged |
| **R1** | **trigger drift 4 ends with `commit; begin;` + d+m** | **G (full 672/672)** | **G** | **G** | **G** | **R: `app.probe_child_of_security_events` exists, 1 `pg_inherits` row** |
| R2 | trigger drift 3 ends with `commit; begin;` + d+m | G | G | C, **by order only**: drift 4's job trips rule 3 first | G | **R: `authenticated`'s `session_replication_role=replica` committed, cluster-wide** |
| K-E08b | the pair weakened to admit `decided_by` alone | G | G | C (pinned check probe) | **C** (`…-naming-a-decider`, exactly) | D1s lands |

### 4.2 What the table says

Each of the new guards does what its commit message says:

- a drift answered by the wrong rule fails B (X1, X2);
- drifts out of order fail A (X3);
- a rule written `raise exception '…'` without its drift fails A (C1);
- a probe with no drift fails A and B (C4);
- a wrong or prefix constraint name fails C (V1, V2);
- the quotes are held (V3);
- the pinned check text is tied to 123's own text (P1);
- the FK conditional fails closed in every shape I tried (F2, F3, F4).

Wherever a pinned CHECK is weakened, the new cases catch it even with the probe narrowed (P2c, P2d,
P3c).

What passes every layer, full verify included:

- **the loop that runs the self-tests (J1, J2, J3), with no digest and no manifest change**, while
  migrate-clean still prints that every drift was refused (F1);
- a rule spelled in either of two other ways, with no drift (C2, C3; F2);
- a drift that commits (R1; F3);
- the runner no longer reading `violates` (V4; F5);
- a pin narrowed to name only (P2; INFO).

---

## 5. Residue from the new self-test drifts

**Interrupted runs leave nothing.** I blocked each of the two new catalog-persistent drifts with a
competing uncommitted transaction, then SIGKILLed the real `migrate-clean` node process and its
psql child by PID while the drift waited:

- Drift 3 was blocked by `alter role authenticated set work_mem = '1MB'`.
- Drift 4 was blocked by `create table app.probe_child_of_security_events (x int)`, taken once 140
  had committed `app.security_events`.

In both cases the orphaned backend stayed `active / Lock` until the blocker rolled back. It then
finished its statement, found its client gone and aborted. Afterwards:

- no drift backend was left;
- `pg_db_role_setting` held 0 rows;
- there was no `probe_child_of_security_events`;
- `pg_inherits` held 0 rows.

Inside a transaction, `ALTER ROLE … SET` shows its row (1) and after `ROLLBACK` it is gone (0).

**Failed runs leave nothing.** All 69 cluster runs recorded residue after C, including every run
where migrate-clean failed at a probe or in the post-migrate pass. Only R1 and R2 left anything,
and both had edited drifts.

**What can leave residue is a drift that ends the executor's transaction** (R1, R2; F3). No shipped
drift does. Nothing refuses one that does, and a run with such a drift reports green.

One environment note (INFO): drift 3 needs superuser. As a CREATEROLE role with ADMIN on
`authenticated`, it fails `42501 permission denied to set parameter "session_replication_role"`.
migrate-clean now fails outright wherever the role applying the set is not a superuser. CI's
container and this recipe are superuser, so today this is only a portability note.

---

## 6. The nine new cases and the one changed case

Each case below passes on the clean set, refused by the refuser it names. The live probe shows each
refusal by its constraint or policy name.

| case | the refuser on the clean set | what fails it (measured) | why it fails |
|---|---|---|---|
| `editor-a-cannot-cancel-…-naming-a-decider` (**changed**) | `approval_requests_decider_is_a_pair` (`violates`) | pair dropped; E08b; P2d | "accepted the row (1 returned)" |
| `editor-a-cannot-cancel-…-naming-another-decider` | the decider closure (42501) | the closure dropped, with or without E19b | "raised 23514, which is not an RLS refusal": the pair refuses in the closure's place |
| `editor-a-cannot-cancel-…-with-only-a-decided-at` | the pair (`violates`) | pair dropped; E08; P2c | accepted |
| `editor-a-cannot-cancel-…-with-a-whole-decision-stamp` | 090's equivalence (`violates`) | 090 dropped; E20b; P3c; V0c | accepted, or "not by approval_requests_decision_has_a_decider" |
| `approver-a-cannot-decide-…-naming-another-decider` | the decide policy, then the closure | only both removed | "1 row(s) came back" |
| the five `…-naming-another-updater` cases | the table's permissive policy, then its 123 closure | that table's closure dropped beside a looser sibling | "1 row(s) came back", exactly that case with a role-preserving sibling |

Each of the five `updated_by` cases is its named positive with only the `updated_by` value changed.
The helper and the identity are the same, as the `why` says.

**The changed case is honest.** A0 says row level security's WITH CHECK runs before CHECK
constraints, and the live probe agrees:

- the original statement (a cancellation naming the approver) is refused by the closure, with 42501;
- the same cancellation naming the caller is refused by the pair, with 23514.

So the case had to name the caller to stay the pair's. Its original purpose moved to the new
`…-naming-another-decider` case, which fails the moment the closure goes. Neither layer is left
untested.

**The one gap is the content_items case's actor (F4).**

---

## 7. Findings

### F1 — LOW. The self-tests are counted from their declaration, not from what ran. The loop that runs them can be edited with every layer green, and this reopens my 5856f0b chain with one more line.

`catalogProbeJobs` and `decideCatalogProbes` are tested only on a synthetic probe labelled `p`
with two drifts. `scripts/db/run.mjs` is in no digest and not in the integrity manifest. The claim
line is `p.selfTests.length`. Measured, full verify 672/672 each:

- J1: only the first three drifts of any probe run. migrate-clean prints "refused each of its 4
  drifts" for the trigger probe, which ran three.
- J2: the coverage probe's drift is skipped by label. The output still says "refused its drift".
- J3: from drift 3 on, any P0001 is accepted. J3c then answers the role-default rule's self-test
  with rule 1's raise, and the rule is no longer shown able to fire.
- **J2c** combines J2 with my `5856f0b` chain R05m+G03+E12c: every layer green, and **the owner
  rewrote the new table's `updated_by`**. On `5856f0b` that chain took four files. It still takes
  the same files, plus one line in `run.mjs`, which the chain already edits.

Q0-123 F3 is closed as built. Its guarantee still rests on a loop that nothing pins.

**Remedy:**

- In the static test, derive the expected job list from `CATALOG_RULE_PROBES` independently and
  compare it whole to `catalogProbeJobs(CATALOG_RULE_PROBES)`: 22 jobs, each with its label, kind,
  exact SQL and raises.
- Drive `decideCatalogProbes` with outcomes built from the real probes, so a wrong prefix on each
  real drift must fail.
- Print each claim from the outcomes counted, not from the declaration.

### F2 — LOW. The drifts-equal-raises guard counts one spelling of a rule.

The static test counts `raise exception '`.

- C1 (that spelling) is caught.
- C2 writes the rule `raise '…'`. PL/pgSQL's default level is EXCEPTION, so this raises P0001 all
  the same.
- C3 writes it `raise exception using message = '…'`.

With digests and the manifest refreshed, C2 and C3 each add a rule with no drift, and every layer
is green (full verify 672/672). The README's "a rule added without its drift fails the suite"
holds for one spelling of three.

**Remedy:** count every RAISE whose level is EXCEPTION or omitted, including the `USING MESSAGE`
form. Or refuse any other raise form inside probe SQL.

### F3 — LOW. A drift that ends the executor's transaction commits itself, and the run reports green.

The executor wraps each job in `begin; … rollback;`, and checks neither that the job's transaction
reached its rollback nor that the probes still pass once the drifts are done.

- **R1**: trigger drift 4 with `commit; begin;` appended, digests and manifest refreshed. Every
  layer is green (full verify 672/672). After the run, **`app.probe_child_of_security_events` is a
  committed child of `app.security_events`**. That is the shape A1's F2 measured deleting rows
  through the parent without its row trigger.
- **R2**, the same on drift 3: `authenticated`'s role default `session_replication_role=replica` is
  committed, cluster-wide. B failed only because drift 4 happens to run after it and trips rule 3
  first.

No shipped drift carries transaction control, and interrupted or failing runs leave nothing (§5).
This is forward-looking.

**Remedy:**

- Re-run every probe as built after all its self-tests, or once at the end. R1 then fails the
  trigger probe as built.
- Statically refuse transaction-control statements (`commit`, `rollback`, `begin`, `end`,
  `savepoint`, `release`) in any drift.

### F4 — LOW. Q0-123 F5's new content_items case cannot see E02c, the drift that motivated it.

E02c recreates content_items' closure as permissive, beside a sibling that admits owner and admin.
The owner forged 4 rows, and C passes 986/986.

The new case runs as the editor, because its positive `editor-a-can-rename-the-content-item-of-a1`
does. The sibling does not admit the editor, so the case's statement is still refused. B catches
E02c through the updated_by update closure probe, and `A*` does too. C does not, which was the point
of the remedy.

**Remedy:** an owner-actor forging case on content_items. In general, a forging case for each role
that holds UPDATE on the table, or at least the owner beside the positive's identity.

### F5 — LOW. Q0-123 F4's constraint-name check is not wired into any test.

- V4: `runOne` stops passing `testCase.violates`. Every layer is green (full verify 672/672).
- V4c: V4, with 090's equivalence replaced by another CHECK that also refuses the whole stamp. The
  whole-stamp case passes while the constraint it exists to prove is gone. B still catches it, by
  the pinned check probe.
- Without V4 (V0c), C fails the case by name, as designed.

The static test exercises `assertRejectedWith` directly and never through `runOne`.

**Remedy:** a static test that runs `runOne` or `runCases` with a fake driver, on a case that names
a constraint, against a message naming another one, and expects the case to fail.

### INFO

- **I1.** P2: the pinned check probe narrowed to check the pair by name only passes every layer.
  Its one drift reaches 090's pin, not the pair's text. One drift per rule proves a rule fires on
  one input, not that it is general. There is no exposure: every weakening I combined with it is
  caught by a new case (P2c, P2d, P3c).
- **I2.** Drift 3 needs superuser (§5). migrate-clean cannot run where the role applying the set is
  not a superuser.
- **I3.** When a pinned object is already gone, its probe's drift fails with 42704 (the object does
  not exist), so B prints two failures for one cause. It fails closed.
- **Carried, recorded by A0, not re-graded:**
  - E14 (a client-updatable `public` table) passes every layer with a live forgery;
  - E16 (a policy `TO app_worker`) is caught only by `A‡`;
  - `decided_at` is the client's choice (Q0-123 F7, A1 F4);
  - there is no recovery path for a CHECK added over bad rows (Q0-123 F8).

---

## 8. Stop-the-line verdict

**No stop-the-line condition found in the corrections.**

- No tenant leakage, no secret exposure, no migration divergence. The nine touched files were
  restored byte for byte after every run, and the cluster is removed.
- On `f2c1a54` as built, no live probe forged `updated_by` or `decided_by`. No path wrote a decider
  onto a cancellation. Every self-test drift is refused by its own rule. Interrupted runs leave no
  residue.
- Every negative control A0 names reproduces, independently and exactly as stated.
- My `5856f0b` MEDIUMs are closed as built:
  - **F1**: dropping or weakening 090's equivalence is caught by B and by C.
  - **F2**: removing the decide binding is harmless; with the closure also gone, two cases fail.
- My LOWs:
  - F3 (self-tests), F4 (one-direction pair) and F5 (cases on five tables) are closed as built;
  - F1–F5 above record where those closures can still be bypassed by further edits.

**Survivors:**

- **With a live exposure:**
  - **E14**, carried and recorded by A0;
  - **J2c**, new: a one-line edit to the self-test loop plus my `5856f0b` chain.
- **Without an exposure:**
  - carried: D08, D08b, D09, D09b, D09c, G01, G02b, G03 and G07;
  - new: J1, J2, J3, J3c, C2, C3, V4, P2, and F1 (as designed);
  - **R1**, which also leaves a committed child of `app.security_events`.
- **E16** survives every layer except `A‡`.

Every new survivor needs an edit to `run.mjs`, to a case file or to the runner. Each edit shows in
the diff, and each one reached below is LOW. **Nothing I found needs to block the Owner's merge as a
stop-the-line.** Whether F1–F5 are fixed before or after merge is the Owner's decision. A1 and C0
may grade them differently.

---

## 9. Limits

- A0 named the starting classes, and I share A0's model family. F1 came from asking where the claim
  line gets its number. F3 came from asking what a drift may contain. F4 came from reading which
  identity the new case runs as. Anything neither of us thought of is not here.
- I did not observe CI. The static suite judged the branch name `test/q0-batch-123-fix`, not the
  subject's, so `handoff-conformance` found no package claiming the branch and skipped. The subject
  branch is checked out in the main checkout, which I did not touch.
- §5's interruption used SIGKILL on the executor and its psql child, at two drifts, with a blocker
  holding each in place. I did not power-cut the server.
- The drift method appends to 140. The `A*` and `A‡` catches are confounds: the same drift in any
  other file would not meet them.
- 93 mutation runs on Node 24.20.0: 69 with every layer and 24 full-verify re-runs. Plus the
  baseline, a 22-job probe read, two interruption runs, the superuser check and a 34-statement live
  probe after each drift. They are a sample, not a proof.
