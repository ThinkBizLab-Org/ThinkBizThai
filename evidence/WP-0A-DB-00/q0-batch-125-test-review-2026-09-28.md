# Q0 independent test: batch 125 (a settled approval is immutable, its time is the database's, the probe executor is pinned)

Run: `/claude/q0_sentinel`
Role: independent Tester. `work-packages/WP-0A-DB-00.json` `role_assignments.tester_agent_run_id`
names `/claude/q0_sentinel`. This file comes from a distinct run of it.
Subject: branch `agent/claude/WP-0A-DB-00-batch-125`, Draft PR ThinkBizLab-Org/ThinkBizThai#163, head
`d85a643` (the handoff, alone) over `43f4d96` (batch 125), base `7f6cefb` (`main`, #162 merged). I read
`git show 43f4d96` in full.
Author: `/claude/a0_atlas`.
Local test branch: `test/q0-batch-125`, created at `d85a643`. The subject branch is checked out in the
main checkout, which I did not touch.
Date: 2026-09-28.

**This document RECORDS TEST RESULTS.** It advances no package status. It writes `test_verified`
nowhere, signs nothing on anyone's behalf, and repairs nothing it found. Every defect named below is
left as it is on the subject branch.

**Measured and read are marked.** "(measured)" means I ran it on the declared toolchain and a private
cluster and the numbers are the run's. "(read)" means I read it in the code or a record and did not run
it.

My harness edited up to nine of these twelve files during mutations. After every mutation it copied
each file back from a saved original, compared SHA-256, and required an empty `git status --porcelain`
before the next one. Before the first run and after the last, the hashes matched (measured):

| file | SHA-256 |
|---|---|
| `db/foundation/migrations/140_audit.sql` | `2ac596bb...` |
| `db/foundation/migrations/125_approval_settled_is_immutable.sql` | `ed09f1e5...` |
| `db/foundation/migrations/123_attribution_closures_everywhere.sql` | `2ff65b5a...` |
| `scripts/db/run.mjs` | `f501e3ab...` |
| `test-kits/db/foundation-contract.test.mjs` | `04d36aea...` |
| `test-kits/integrity-manifest.json` | `ac9ca852...` |
| `tests/db/identity/isolation-cases.mjs` | `07b3949a...` |
| `tests/db/identity/run-isolation.mjs` | `a1b93361...` |
| `tests/db/identity/identity-isolation.test.mjs` | `d2e64af3...` |
| `scripts/test-suite-contract.mjs` | `2e62649e...` |
| `db/foundation/invariants/superseded.json` | `445ea7ce...` |
| `db/foundation/invariants/090_approval.1.sql` | `3265d31d...` |

`git diff d85a643` shows nothing but this file, which is the only one this run adds.

---

## 0. What I am, before anything else

**I am a SUBAGENT spawned by the Author run `/claude/a0_atlas`.** I ran in a git worktree A0's
workflow created, under a brief A0 wrote. A0 chose the subject, the port and the cluster recipe, the
output filename, and the five classes I had to cover "at minimum": my survivors re-run against the
head; A0's negative controls reproduced; mutations to the new machinery; the four new cases and the
changed case; and anything that reports green while a guarantee is gone.

A0 also wrote the change under test, and that change answers findings of mine (Q0's re-test of 123's
corrections, F1-F5).

**I am the same vendor as the Author (Anthropic), and the same model family.** RFC-2026-024 is approved
and withdrew the cross-vendor condition. What remains is CONTRIBUTING_AGENTS.md's separation of duties:
four distinct `agent_run_id`s, and no run approves, test-verifies, integrates or gate-approves its own
work.

**Whether this file is accepted as the Tester signature is the Integration Owner's and the Product
Owner's act.** It is not mine.

---

## 1. How I measured (measured)

PostgreSQL 17.11 from `/opt/homebrew/bin`. Node `v24.20.0` and npm `11.19.0`, the declared toolchain:
`node -v` printed 24.20.0 before the baseline, and every one of the 62 cluster runs logged it. The
cluster and every script lived in my private directory `.../scratchpad/q0-125/`; I wrote nothing
elsewhere in the shared scratchpad and nothing in `/tmp`.

The recipe, **fresh before every run**: `initdb --locale=C -A trust -U postgres`; TCP only on
`127.0.0.1:5503` with `-c unix_socket_directories=''`; `LC_ALL=C`; `db/foundation/ci/supabase-shim.sql`
first; then `make db-migrate-clean` and `make db-rls-smoke` with `DB_TEST_URL` naming that port.
Drifts were APPENDED to `140_audit.sql` and the file restored byte for byte. **Ports 5432 and 5499 were
never contacted.** The cluster is stopped and its data directory removed; nothing listens on 5503.

Layers per mutation:

| col | layer |
|---|---|
| A | **Static suite.** A proxy on every run (`foundation-contract`, `identity-isolation`, `ctr-job-001`: 381 tests). Every row that passed the proxy was re-run with the full `npm run verify` (674 tests); "full" marks those |
| S | `make db-schema-lint` |
| B | **migrate-clean**: the 45 apply-time blocks as applied, the eleven catalog-rule probes (38 jobs: as built, each drift, clean again), and the post-migrate pass |
| C | **rls-smoke**: 990 cases |
| L | A live probe on the same database after C: 46 statements, each its own transaction, rolled back (owner, admin, approver, editor, the service and the superuser; `updated_by` on 17 tables; every decision and cancellation shape; the settled request; the drift-made tables) |
| R | Residue after C: role settings, probe children, `pg_inherits`, `q0*` relations and policies, disabled triggers, and whether 125's trigger and closure exist |

A **survivor** passes A (full), S, B and C. An **exposure** is a survivor whose live probe forges.
As in my last two runs, two static rules read `140_audit.sql` alone: **A\*** ("batch 140 adds to the
merged batches and rewrites none of them", which refuses `drop policy`) and **A-double-dagger** ("the
service holds grants and no policy"). A catch marked with either is a confound of the drift method.

### Baseline on `d85a643`: reproduced (measured)

| layer | result |
|---|---|
| A | `npm run verify`: `clean: exit 0 -- tests 674, pass 674, fail 0` |
| S | `db-schema-lint: ok` |
| B | Eleven probes, each ending `(self-test: refused ...; clean again after every drift)`: fk support 2 drifts, security definer 2, trigger 4, the other eight 1 each. `post-migrate pass: 45 apply-time blocks, 35 re-run as written, 10 superseded and replaced` |
| C | `990 isolation case(s) passed` |
| R | nothing: 0 role settings, no probe child, 0 `pg_inherits`, trigger and closure present |

Each of the 38 jobs, run on its own through the driver's `feed` exactly as `run.mjs:1774` runs it:
11 as built pass; each of the 16 drifts fails with P0001 and its own rule's prefix; 11 clean-again
runs pass; `decideCatalogProbes` returns ok. That matches A0's "11 probes; 38 jobs pass".

The live probe on the clean set (measured):

- every `updated_by` forgery on the 17 tables is refused;
- an approver's decision sending `decided_at` 2001, 2999, nothing, or `now()` is recorded as `now()`;
- a cancellation naming itself as decider is refused by 090's `approval_requests_decision_has_a_decider`
  (the trigger fills `decided_at`, so the pair is satisfied); naming another, by the decider closure;
  carrying `decided_at` alone, by 123's pair; a plain cancel lands (UPDATE 1);
- on the settled request, the owner taking it over, overturning it backdated, reverting it, touching
  only `updated_by`, and the approver flipping or re-approving its own decision: **UPDATE 0 each**;
- the superuser reverting or backdating a recorded decision is refused by `set_decided_at`; a
  non-decision update of a settled row lands.

---

## 2. My survivors from the re-test of 123's corrections, against `d85a643`

| id | on `f2c1a54` | A | S | B | C | L / R on `d85a643` | now |
|---|---|---|---|---|---|---|---|
| J1 | survivor | **C** (the derived job list) | G | G, and the claim now reads `refused each of its 3 drifts` | G | -- | caught by A; the claim is honest |
| J2 | survivor | **C** (the same) | G | G, the claim reads `refused each of its 0 drifts` | G | -- | caught by A |
| J2c | survivor, exposure | **C** (the same) | G | G | G | the owner forged `app.q0_scratch`, 1 row | caught by A alone |
| J3 | survivor | **C** (a drift answered by another rule's raise) | G | G | G | -- | caught by A |
| J3c | survivor | **C** (the same) | G | G | G | -- | caught by A |
| C2 | survivor | **C** (every raise spelling) | G | G | G | -- | caught by A |
| C3 | survivor | **C** (the same) | G | G | G | -- | caught by A |
| V4 | survivor | **C** (the runCases test) | G | G | G | -- | caught by A |
| V4c | survivor for C | **C** (the same) | G | **C** (pinned check probe) | G | -- | caught twice |
| P2 | survivor (INFO) | **G (full 674/674)** | G | G | G | -- | **still a survivor**, no exposure (F9) |
| R1 | survivor, residue | **C** (no transaction control) | G | **C** (transaction control; clean-again finds the child) | G | **R: the probe child is committed, 1 `pg_inherits` row** | caught twice; residue remains (F2) |
| R2 | residue | **C** (the same) | G | **C** (the same) | G | **R: `authenticated`'s `session_replication_role` default is committed** | caught twice; residue remains (F2) |
| E02c | B only, exposure | C (A\*) | G | **C** (update closure probe) | **C**: exactly `owner-a-cannot-rename-the-content-item-of-a1-naming-another-updater`, "1 row(s) came back" | the owner forged 4 `content_items` rows | **caught by C now**, as the remedy intended |
| E14 | survivor, exposure | **G (full 674/674)** | G | G | G | **the owner rewrote `public.q0_pub`, 1 row** | **still a survivor with exposure** (carried) |
| E16 | A-double-dagger only, exposure | that rule only | G | G | G | **the service rewrote both tenants' `workspaces`, UPDATE 2** | unchanged (carried) |

**Every row batch 125 was written for is closed as built** (measured): J1-J3c, C2, C3, V4 and V4c by
the static suite, R1 and R2 by the static suite and migrate-clean, E02c by rls-smoke. P2 remains an
INFO survivor; E14 and E16 remain outside the rules' reach, recorded by A0 and not claimed.

---

## 3. A0's negative controls, reproduced independently (measured)

Each control ran on a fresh cluster with its drift appended to 140, with my own SQL.

| control | the record says | measured C | measured B | live |
|---|---|---|---|---|
| R3c alone (the decide policy's USING admits a settled row for the owner) | all cases pass: the closure holds | **990/990** | green | the owner's takeover, overturn and revert: UPDATE 0 |
| R3c + the settled closure dropped | exactly the owner redecide case fails | **exactly** `owner-a-cannot-redecide-a-settled-approval-request`, **"expected an empty read, got errored (23514)"** | pinned policy probe, as built and clean again (A\* too) | takeover, overturn, revert: each refused by `set_decided_at`. **The takeover does not land** |
| R3c + closure dropped + trigger dropped (mine) | -- | 4: the owner redecide case, now "1 row(s) were visible"; backdate; postdate; naming-a-decider | the same | **the owner took the decision (UPDATE 1), and overturned it dated 2001 (UPDATE 1)** |
| the settled closure dropped alone | the probe refuses it | 990/990 | pinned policy probe (A\* too) | nothing lands |
| the trigger dropped | backdate, postdate and naming-a-decider fail | **exactly those three**: backdate and postdate "nothing was visible"; naming-a-decider "refused with 23514 ... but not by approval_requests_decision_has_a_decider" | 125's block in the post-migrate pass | decisions keep 2001 and 2999; the superuser reverts and backdates a recorded decision |
| the trigger function made a no-op | the same three | **exactly those three**, same texts | 125's block (the md5 pin) | the same |
| content_items' closure dropped beside an owner/admin sibling | exactly the owner content_items case fails | **exactly** `owner-a-cannot-rename-the-content-item-of-a1-naming-another-updater`, "1 row(s) came back" | update closure probe (A\* too) | the owner forged 4 rows |
| (mine) 090's equivalence dropped | -- | the changed case and `...-with-a-whole-decision-stamp`, each "accepted the row" | pinned check probe | a cancellation carries the caller as decider, UPDATE 1 |
| (mine) 123's pair dropped | -- | **only** `...-with-only-a-decided-at` (it failed two cases before 125) | pinned check probe | a cancellation with `decided_at` alone lands |

**Every control A0 names reproduces exactly as stated.** One precision: under R3c with the closure
dropped, the owner redecide case fails because `set_decided_at` refuses the takeover with 23514, not
because the takeover lands. The closure and the trigger each stop it alone; the case fails if either
is missing under the widening, and it reports a landed write only when both are.

---

## 4. Mutations to the new machinery (measured)

The columns are the per-layer verdicts the brief asks for: **static suite (A)**, **schema-lint (S)**,
**migrate-clean (B)**, **rls-smoke (C)**. "+ d+m" = the probe digests in `foundation-contract.test.mjs`
recomputed and `npm run regenerate:manifest` run in the same change. Every G in A for a survivor is the
full `npm run verify`, 674/674.

| id | mutation | static (A) | S | migrate-clean (B) | rls-smoke (C) | L / R |
|---|---|---|---|---|---|---|
| K1 | `catalogProbeJobs`: the clean-again loop removed | **C** (derived list; verdict test) | G | G | G | -- |
| K2 | `decideCatalogProbes`: a failing clean-again run ignored | **C** (verdict test's residue case) | G | G | G | -- |
| K5 | `TRANSACTION_CONTROL` matches nothing | **C** (verdict test's six controls) | G | G | G | -- |
| K5c | K5 + the static control list emptied + regen + R1 + d+m | G | G | **C**: `as built, after every drift: append-only ... inheriting` | G | R: the probe child committed |
| K6 | `TRANSACTION_CONTROL` loses `abort`, `release`, `prepare transaction` | **G (full)** | -- | -- | -- | none of the three commits (F9) |
| **TG1** | **trigger drift 4 = a permissive UPDATE policy TO app_worker on `workspaces`, then COMMIT and BEGIN built by `\gexec`, then the drift + d+m** | **G (full)** | G | **G**: `refused each of its 4 drifts; clean again after every drift` | **G** | **the service rewrote both tenants' `workspaces` (UPDATE 2); R: the policy is committed** |
| **TG2** | **the same with `\c`, the policy autocommitted, `\set AUTOCOMMIT off`, then the drift + d+m** | **G (full)** | G | **G** | **G** | **the same** |
| CL1 | claims count declared drifts again, not refused ones | **G (full)** | G | G | G | harmless alone (F9) |
| DJ1 | J1 + the same filter in the static derivation and its length formula + regen | **C**: the claim assertion (`3 drifts` is not 4) | G | G, claim `3 drifts` | G | -- |
| DJ1+CL1 | DJ1 + CL1 + regen | **G (full)** | G | **G**, claim `refused each of its 4 drifts` over 3 run | G | -- (F9) |
| C5 | pinned check probe gains a rule written `assert ...` (P0004), no drift + d+m | **G (full)** | G | G | G | -- (F7) |
| C6 | the same written as a division by zero + d+m | **G (full)** | G | G | G | -- (F7) |
| C7 | the same written `RAISE EXCEPTION '...'` in capitals + d+m | **C** (every raise spelling) | G | G | G | -- |
| PU1 | trigger rule 2's raise begins with rule 1's prefix, its drift prefix following + d+m | **C** (a prefix matches another rule) | G | G | G | -- |
| PL1 | trigger drift 1's prefix shortened to `trigger(s)` + d+m | **C** (at least 12 characters) | G | G | G | -- |
| PP1 | pinned policy probe stops comparing USING and WITH CHECK + d+m | G | G | **C**: its drift passed | G | -- |
| PP2 | pinned policy probe stops comparing WITH CHECK + d+m | **G (full)** | G | G | G | no exposure (F9) |
| PP3 | the probe stops comparing roles + d+m, and the closure re-pointed `TO anon` | C (a 140 confound) | G | **C**: 090's replacement and 125's block | G | -- |
| PP4 | `PINNED_POLICIES` and the closure both widened to pending-or-approved + d+m | **C** (125's pin test) | G | **C** (125's block) | G | -- |
| **CV1** | **coverage probe reads `updated_by` alone again (A1 N3 reverted) + d+m** | **G (full)** | G | **G** | **G** | -- |
| **CV1c** | **CV1 + a new table with a client-updatable `decided_by` and no closure** | **G (full)** | G | **G** | **G** | **the owner forged `decided_by`, UPDATE 1** |
| CV1n | control: that table on the clean set | G | G | **C**: `... no pinned UPDATE closure: app.q0_decisions.decided_by` | G | -- |
| CV2 | coverage pattern broken (`%\_byx`) + d+m | G | G | **C**: its drift passed | G | -- |
| FS1 | FK-support rule 1 silenced + d+m | G | G | **C**: drift 1 passed | G | -- |
| FS2 | FK-support rule 2 silenced + d+m | G | G | **C**: drift 2 passed | G | -- |
| FS3 | FK-support drift 1 replaced by drift 2's text + d+m | G | G | **C**: drift 1 answered by rule 2 | G | -- |
| FS4 | a new unindexed FK named `billing_invoices_subscription_scope_fk` | G | G | **C** by accident: drift 2 "passed" (a key of that name still exists) | G | -- |
| **FS4b** | **the same named `billing_payments_invoice_mode_fk`** | **G (full)** | G | **G** | **G** | an unindexed key (F6) |
| FS4n | control: the same key under its own name | G | G | **C**, by name | G | -- |
| M2 | a later file recreates the trigger `BEFORE UPDATE OF status` | G | G | **C** (125's block) | G | the superuser's backdate lands |
| M3 | a later file sets the trigger `ENABLE ALWAYS` | G | G | **C** (trigger probe `tgenabled A`; 125's block) | G | -- |
| M6 | 125's own body gains a session-setting override after the `now()` line; 125's md5 recomputed + regen | **G (full)** | G | **G** | **G** | **an approver backdated a decision to 2001 through a session setting** (F3) |
| **M7** | **a later file adds `set_decided_at_backfill`, BEFORE UPDATE, sorting after `set_decided_at`, taking `decided_at` from a session setting** | **G (full)** | G | **G** | **G** | **an approver backdated a decision to 2001, UPDATE 1** (F3) |
| V5 | `assertRejectedWith` stops reading `violates` | **C** (two tests) | G | G | G | -- |
| **Q1** | **coverage rule silenced (`and false`); its drift replaced by a `pg_temp` PL/pgSQL function, body a `U&'...'` literal, that raises the rule's prefix itself + d+m** | **G (full)** | G | **G**: `(self-test: refused its drift; clean again after every drift)` | **G** | -- |
| **Q1c** | **Q1 + the `decided_by` table** | **G (full)** | G | **G** | **G** | **the owner forged `decided_by`, UPDATE 1** |
| **MC1** | **`select 1; \! touch <private dir>/q0-meta-ran` appended to 140 (a mid-line meta-command)** | **G (full)** | G | **G** | **G** | **the file was created by migrate-clean: psql ran a shell command from a migration** (F4) |

### 4.2 Live, with no repository edit (measured)

On a clean cluster, a script ran five drifts exactly as the executor runs a job
(`begin; <drift> <probe> rollback;` through `feed`). Recorded: whether `TRANSACTION_CONTROL` matches
the text, what the job returned, whether the verdict's test (P0001 + prefix) reads it as refused, and
the residue:

| drift | matches | job returned | read as refused | committed |
|---|---|---|---|---|
| G1: a policy, then COMMIT and BEGIN built by `\gexec`, then trigger drift 4 | no | P0001, the trigger probe's rule 4 | yes | **the policy** |
| G2: `\c`, the policy, `\set AUTOCOMMIT off`, then trigger drift 4 | no | the same | yes | **the policy** |
| S1: a function whose body is a `U&` literal raising the coverage prefix | no | P0001, the prefix, **raised by the drift** | yes | nothing |
| S2: `\gexec` building a DO block that raises the prefix | no | the same | yes | nothing |
| S3: `\warn 'ERROR:  P0001: <prefix>: q0'`, then a division by zero | no | **P0001 and the prefix, parsed from the drift's own text** (the real error was 22012) | yes | nothing |

### 4.3 What the table says

Batch 125's guards do what the commit says, each on the edit it was written for: a skipped or filtered
drift fails A (J1, J2, K1); a drift answered by another rule fails A (J3, J3c, PU1); every raise
spelling is counted (C2, C3, C7) and prefixes are long and distinct (PU1, PL1); the verdict fails on
residue and on a skipped clean-again round (K2, K1), and with the static half removed too the
clean-again round alone still fails migrate-clean (K5c); the pinned policy probe, 125's block and 090's
replacement catch every change to the settled-row closure (PP1, PP3, PP4); the FK-support probe's two
rules each fail when silenced (FS1-FS3); 125's block catches a later rewrite, rename, disable or
narrowing of the trigger (NC-noop, M2, M3).

What passes every layer, full verify included: the drift answering its own self-test (Q1; F1), and the
drift committing a change no probe reads (TG1, TG2; F1), each with a live exposure when combined; a
later trigger overriding `decided_at` (M7; F3), one file, a live backdate; the coverage probe's `*_by`
generality reverted (CV1; F5), with a live forgery (CV1c); a migration running a shell command through
a mid-line meta-command (MC1; F4, pre-existing); an unindexed FK named like an exempted one (FS4b; F6);
rules written without `raise` (C5, C6; F7); and PP2, P2, K6, CL1 and DJ1+CL1 (F9).

---

## 5. The four new cases and the changed case (measured)

Each passes on the clean set, refused by what it names, and each fails when that refusal is removed:

| case | refuser on the clean set | what fails it | failure text | right reason? |
|---|---|---|---|---|
| `owner-a-cannot-redecide-a-settled-approval-request` | `approval_requests_settled_is_immutable` filters the row (no-effect) | the closure dropped under a widening (R3c) | "expected an empty read, got errored (23514)": the trigger refused in its place | **yes, fails closed.** It reads "1 row(s) were visible" only with the trigger also gone |
| `owner-a-cannot-rename-the-content-item-of-a1-naming-another-updater` | the permissive WITH CHECK, then 123's closure (42501, `deniedOn content_items`) | the closure dropped or made permissive beside an owner/admin sibling | "1 row(s) came back. The operation was permitted." | **yes**; it is the case E02c needed |
| `approver-a-cannot-backdate-a-decision` | `set_decided_at` records `now()` | the trigger dropped, or its body a no-op | "nothing was visible ..." | **verdict yes; text no**: the generic `rows` message, not one that says `decided_at` kept 2001 (F9) |
| `approver-a-cannot-postdate-a-decision` | the same | the same | the same | the same |
| `editor-a-cannot-cancel-an-approval-request-naming-a-decider` (changed) | 090's `approval_requests_decision_has_a_decider` (`violates`) | 090 dropped: "accepted the row"; the trigger dropped: "refused with 23514 ... but not by approval_requests_decision_has_a_decider" (the pair refuses instead) | as quoted | **yes** |

**The change is honest** (measured): since the trigger fills `decided_at` the moment `decided_by` is
set, the pair can no longer refuse a cancellation that names a decider, and 090's equivalence does.
Dropping the pair now fails only `...-with-only-a-decided-at`. The pair's other direction is still
pinned by text in the pinned check probe. None of the new cases sends `decided_at` any way but through
the column, so none can see M7 or M6.

---

## 6. Findings

Grades are mine, as a Tester. Every finding is drift-only or a later-edit reopening except where it
says otherwise; none is live on `d85a643` as built. A1 and C0 may grade differently.

### F1 -- LOW. The verdict cannot tell the probe's refusal from the drift's own, and a drift can commit through psql without a `TRANSACTION_CONTROL` word. Both reopen my self-test chain with a green run (measured)

**Where.** `run.mjs:481` `TRANSACTION_CONTROL` is a word list over the drift text; `run.mjs:493-514`
`decideCatalogProbes` counts a drift refused when the job's error is P0001 and starts with the prefix,
whoever raised it; `run.mjs:1774` jobs go to psql through `feed`, on stdin, where a backslash is a
meta-command; `psql-driver.mjs:60` `parseError` reads the first `ERROR:` line of stderr. The
meta-command static rule (`foundation-contract.test.mjs:2101, 2276`) holds migrations, replacements,
fixtures and the helper -- **not the drifts or the probe SQL.**

**Measured, every layer green (full verify 674/674):**

- **Q1.** The coverage rule gets `and false`. Its drift is replaced by a `pg_temp` PL/pgSQL function
  whose body is a `U&'...'` (Unicode-escape) literal spelling `BEGIN RAISE EXCEPTION '<the rule's
  prefix>: q0'; END`, called by the drift. The drift raises the prefix itself, so the verdict reads
  the rule as "refused its drift" (migrate-clean prints exactly that), and the rule is silenced. **Q1c**
  adds a table with a client-updatable `decided_by` and no closure: the owner forged `decided_by`
  (UPDATE 1), every layer green.
- **TG1 / TG2.** Trigger drift 4 is prefixed with a `create policy ... TO app_worker using (true)` and
  a committed transaction boundary built without a bare keyword: `select 'COM'||'MIT' \gexec` then
  `select 'BEG'||'IN' \gexec` (TG1), or `\c` + `\set AUTOCOMMIT off` (TG2). The reconnect/`\gexec`
  ends the executor's `begin`, the policy commits, a fresh transaction opens, and the drift then fails
  rule 4 as expected -- so the verdict is green and the claim still prints `refused each of its 4
  drifts; clean again after every drift`. **The service then rewrote both tenants' `workspaces`
  (UPDATE 2), and the policy survived the run.** These forgeries need an edit to `run.mjs`, a digest and
  the manifest -- but so did the whole chain my re-test of 123 found, and A0's own remedy for that
  chain (the transaction-control regex, the clean-again round, the derived job list) does not close
  these two routes.

**Why the guards miss it.** The clean-again round catches residue only from a drift that leaves a
catalog object a probe reads (a child table, a role default); it does not read arbitrary policies, and
S1/S2/S3 leave nothing at all. The transaction-control regex matches keywords, so `'COM'||'MIT'`,
`\gexec`, `\c` and `\set AUTOCOMMIT` all pass it. And `decideCatalogProbes` trusts the P0001 message
without checking which object the probe named, so a drift that raises the prefix by any means (a
function body, a `\gexec`'d DO block, even a `\warn` line `parseError` mistakes for the error) reads as
a refusal.

**Remedy.** Run each drift with `ON_ERROR_STOP` and refuse a job whose transaction did not reach its
rollback (compare a sentinel `txid_current()` before and after, or assert the pre-drift catalog
snapshot is restored -- broader than the child/role checks); refuse a drift or probe SQL that carries a
meta-command, as migrations already are; and have each probe raise a value the verdict can tie to the
object it was asked about, so a message the drift forged does not satisfy it.

### F2 -- LOW. A drift that ends the executor's transaction still commits, and only a probe that reads the leftover object catches it (measured)

`run.mjs:490` re-runs every probe as built after all drifts, and `decideCatalogProbes` fails on residue
a probe reads. But the executor still wraps each job in `begin; ... rollback;` and checks neither that
the job reached its rollback nor that the catalog is unchanged.

- **R1** (trigger drift 4 + `commit; begin;`): every layer red -- static (transaction control),
  migrate-clean (the clean-again round finds the committed child). **But R: `app.probe_child_of_
  security_events` is a committed child of `app.security_events`, 1 `pg_inherits` row, after the run.**
- **R2** (trigger drift 3 + `commit; begin;`): the same, and **`authenticated`'s
  `session_replication_role=replica` default is committed cluster-wide.**
- **K5c** (the regex and the static list both emptied, R1's commit): migrate-clean red only by the
  clean-again round; the child is committed.

So the two defences A0 added catch the *test's verdict*, but the side effect on the cluster is real: a
CI job that hit this would leave a poisoned instance. TG1/TG2 (F1) are the version that also stays
green. No shipped drift carries transaction control; this is forward-looking.

**Remedy.** As F1: verify the transaction was rolled back (a sentinel), and abort the run if the
post-job catalog differs from the pre-job snapshot, rather than re-reading only the objects the probes
happen to name.

### F3 -- LOW. `decided_at` is the database's only for the trigger that sets it. A second BEFORE UPDATE trigger, or a later edit to 125's own body, backdates a decision with every layer green (measured)

125 makes `set_decided_at` overwrite `decided_at` with `now()` when `decided_by` is first set, and
freezes it after. But nothing pins that no *other* trigger touches `decided_at`, and PostgreSQL fires
BEFORE ROW triggers in name order, so a later trigger sorting after `set_decided_at` gets the last word.

- **M7** (a later file adds `set_decided_at_backfill`, BEFORE UPDATE, name after `set_decided_at`, that
  reads `decided_at` from a session GUC): every layer green (full verify 674/674). **An approver
  approved with the session GUC set to 2001, and the row was recorded dated 2001-01-01.** batch 160's
  retention sweep -- the reason A0 gave for the fix -- would read that value. The trigger probe pins
  only the four `refuse_mutation` triggers; nothing enumerates the triggers on `approval_requests`.
- **M6** (125's own body gains the same override line after `new.decided_at := now()`, with the md5 pin
  recomputed): every layer green, same backdate. The md5 pin makes the edit visible in the diff (as
  A0's N4 note says), but the suite passes.

The behaviour A0 measured for a superuser -- "a superuser's attempt to backdate is refused" -- holds
against `UPDATE`, because `set_decided_at` fires on update. It does not hold against another trigger or
against the function being extended, which is where a real backdating change would live. This is a
narrowing of what "the database records the time" guarantees, not a live hole.

**Remedy.** Pin the triggers on `approval_requests` by `pg_get_triggerdef` (as the four append-only
triggers are), so a second `decided_at`-writing trigger fails the target; and if it matters, assert in
125's block that no other BEFORE UPDATE trigger on the table sorts after `set_decided_at`.

### F4 -- LOW (pre-existing, not batch 125's). A migration still runs a shell command through a mid-line psql meta-command (measured)

`MC1` appended `select 1; \! touch <private dir>/q0-meta-ran` to `140_audit.sql`. **Every layer green,
and migrate-clean created the file: psql executed a shell command out of a migration.** The
meta-command static rule (`foundation-contract.test.mjs:2124`) only refuses a line that *begins* with a
backslash (`/^\s*\\/`), so a backslash after a statement on the same line is not caught, and no live
layer parses migrations for meta-commands. This is the same class A1 measured on the post-migrate
replacements before, pre-existing and untouched by 125; I record it because it is the sharpest "green
while something ran that should not" I found, and because 125 adds drift and probe SQL that the same
rule does not cover at all (F1).

**Remedy.** Match a backslash meta-command anywhere a statement can begin (after `;` or a newline), not
only at column zero, across migrations, replacements, drifts and probe SQL.

### F5 -- LOW. The coverage probe's `*_by` generality (A1 N3) rests on one line and one digest; reverting it hides a client-writable `decided_by` with a green run (measured)

`CV1` changed the coverage probe's `a.attname like '%\_by'` back to `a.attname = 'updated_by'` (the
pre-correction form), refreshed the digest and manifest: every layer green (full verify). **CV1c** then
added a table with a client-updatable `decided_by` and no closure, and the owner forged it (UPDATE 1),
every layer green -- exactly the case A1 N3 asked the generality to cover. `CV1n` confirms the shipped
probe catches that table by name (`app.q0_decisions.decided_by`) on the clean set. So the guarantee is
real today and rests on one predicate that a later edit plus a digest bump removes. This is the same
"one drift proves a rule fires on one input, not that it is general" shape as P2/F9; the digest makes
the edit visible.

**Remedy.** Assert in the static test that the coverage probe's column filter is `like '%\_by'` (not a
single column), the way the closure probes' intent lines are pinned beside their digests.

### F6 -- LOW (pre-existing, batch 104). An unindexed foreign key named like an exempted one passes the FK-support probe (measured)

`FS4b` created a new table with an unindexed FK named `billing_payments_invoice_mode_fk` -- one of the
four `FK_SUPPORT_EXEMPTIONS` keys. Every layer green (full verify). The probe exempts by `conname`
alone (`run.mjs:100`: `not (fk.conname = any (exempt))`), and the stale-exemption check
(`run.mjs:108`) is satisfied as long as *some* key of that name exists, so a second key sharing the
name inherits the exemption on another table. `FS4n` (the same key under its own name) fails by name,
so the probe works for an honestly named key. batch 125 moved this probe into the self-tested list
(closing C0 F6's "no self-test"), which is what the record claims; the key-by-name exemption is older
and unaddressed.

**Remedy.** Key `FK_SUPPORT_EXEMPTIONS` by `table.constraint` (as `FK_ACTION_EXEMPTIONS` already is per
Q0 F6 on 123), so an exemption names one key on one table.

### F7 -- INFO. The "every raise spelling" count (Q0 F2 on 123's corrections) covers raises, not every way a probe can fail (measured)

The static test now counts every `raise` that is not notice/warning/info/debug/log and requires each to
be `raise exception '<literal>'` (C2, C3 and C7 are all caught -- C7, capitals, by the case-sensitive
literal match). But a probe can still fail by other means with no drift: **C5** adds an `assert` (P0004)
and **C6** a division by zero, each in a dead branch, digests refreshed -- both pass every layer. These
are not raises, so the drifts-equal-raises count does not see them, and each is a rule with no
self-test. Lower than F1 because neither is a plausible smuggling route for a real weakening; recorded
for completeness of the "a rule added without its drift fails the suite" claim.

**Remedy.** Refuse `assert`, and any raise-shaped control flow, inside probe SQL; or count "ways this
block can raise" rather than "raise statements".

### F8 -- INFO. `set_decided_at` is SECURITY INVOKER and not in the SECURITY DEFINER probe, so its `search_path`, EXECUTE and body are pinned only by 125's own block (read + measured)

125's block pins the trigger definition, the empty `search_path`, no EXECUTE for PUBLIC, and the body
md5 (measured: the block fails when the trigger is dropped, disabled, recreated `OF status`, made a
no-op, or `ENABLE ALWAYS`). Because the function is INVOKER it is outside `SECURITY_DEFINER_FUNCTIONS`,
so the catalog-rule probe that guards every other pinned function's shape does not cover it -- only the
post-migrate re-run of 125's block does. That is a single point, adequate today (the md5 pin is exact),
but it means `set_decided_at`'s privilege shape is guarded differently from the five definer functions.
Recorded, not graded higher: the block does hold.

### F9 -- INFO. One drift proves one input; several narrowings pass every layer with no exposure (measured)

Carried and new, each a place a guard is thinner than its intent, none with a live forgery I found:
P2 (the pinned check probe narrowed to name-only for the pair -- its one drift reaches 090's pin, not
the pair's text); PP2 (the pinned policy probe without its WITH CHECK compare -- the shipped drift
widens USING, which is still caught); K6 (`TRANSACTION_CONTROL` without `abort`/`release`/`prepare
transaction`); CL1 (claims count declared drifts, harmless alone); DJ1+CL1 (a test-side filter plus
CL1, so the claim reads 4 over 3 run); and the backdate/postdate cases' generic failure text (§5). Each
needs an edit the diff shows, and each weakening I combined with a real drift was caught by another
layer.

---

## 7. Stop-the-line verdict

**No stop-the-line condition found in batch 125.**

- No tenant leakage, no secret exposure, no migration divergence, no irreversible deletion. The twelve
  touched files were restored byte for byte after every run (SHA-256 in the header), the cluster is
  removed, and 5432/5499 were never contacted.
- On `d85a643` as built, the settled-row closure filters every settle-over attempt (owner takeover,
  overturn, revert; approver re-decide): UPDATE 0. `set_decided_at` records `now()` for 2001, 2999 and
  a session-GUC attempt, and refuses a superuser's revert or backdate of a recorded decision. Every
  self-test drift is refused by its own rule; every probe runs clean again after all drifts.
- Every negative control A0 names reproduces, independently and exactly (§3).
- My re-test survivors that batch 125 was written for are closed as built (§2): J1-J3c, C2, C3, V4,
  V4c, R1, R2 by the static suite or migrate-clean, E02c by rls-smoke. My re-test MEDIUMs (F1, F2 on
  123's corrections) stay closed.

**Survivors that pass every layer, full verify included:**

- **With a live exposure, each needing a `run.mjs` edit + digest + manifest:** Q1c and J2c (the
  self-test loop answered by the drift itself), TG1 and TG2 (a drift that commits a policy through
  `\gexec`/`\c`), CV1c (the coverage generality reverted). These are F1 and F5.
- **With a live exposure, needing one migration file:** M7 (a second trigger backdates a decision),
  and M6 (125's body extended). F3.
- **Without a live exposure I found:** P2, PP2, K6, CL1, DJ1+CL1, C5, C6 (F7, F9); FS4b (F6); MC1 (F4,
  pre-existing); E14 and E16 (carried by A0).

Every new survivor needs an edit that shows in the diff, and each finding is LOW or INFO. **Nothing I
found blocks the Owner's merge as a stop-the-line.** Whether F1-F6 are fixed before or after merge is
the Owner's decision; F1 (the executor still trusts a P0001 message and a keyword regex) and F3 (a
later trigger backdates a decision) are the two I would fix first, because each keeps a green run over a
real forgery with a single further edit.

---

## 8. Limits

- A0 named the five starting classes and I share A0's model family. F1's `\gexec`/`\c` routes came from
  asking what a drift can do that is not a keyword; F3 from asking what else writes `decided_at`; F5
  from reading which predicate carries A1 N3. Anything neither of us thought of is not here.
- I did not observe CI. The static suite judged the branch name `test/q0-batch-125`, not the subject's,
  so `handoff-conformance` found no package claiming the branch and skipped. The subject branch is in
  the main checkout, which I did not touch.
- The drift method appends to `140_audit.sql`. The `A*` and `A-double-dagger` catches are confounds:
  the same drift in another file would not meet them.
- The live probe and the residue read run once per cluster, after rls-smoke. F2's residue is what the
  cluster held at that point; I did not power-cut the server.
- Counts: 62 measured cluster runs on Node 24.20.0 (spec0 baseline; spec1 15 + E16; spec2 9; spec3 32;
  spec4 3; spec5 2), plus 20 full `npm run verify` re-runs, a 38-job probe read, and a 5-drift live
  bypass script. They are a sample, not a proof.
