# Q0 independent test re-check of batch rfc-026-027's review round (PR #174)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Kind:** a NARROW re-check of the
review-round corrections, starting from my own earlier findings
(`q0-batch-rfc-026-027-test-review-2026-10-03.md`, reviewed head `e64e1f5`).
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-026-027`, head `80c171f` (the handoff refresh, alone and last)
over the code commit `b6d65e1`, base `f3e6fbc` (`main`). Between `e64e1f5` and `b6d65e1` are the three cherry-picked role
records `b55f0e1` (C0), `b66a868` (A1) and `54ad956` (Q0). **Author:** `/claude/a0_atlas`.
**Tested on:** my own branch `recheck/q0-batch-rfc-026-027`, created at `80c171f`.
**Date:** 2026-10-04. The file name carries the phase's date (2026-10-03), as the batch's plan and disposition do.

This record holds findings. It advances no status, approves nothing, test-verifies nothing on anyone's behalf, and decides
nothing that the Integration Owner, A1 or the Product Owner holds. It repairs nothing it found.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run. I am the same vendor and model family as the Author. A0 wrote my
brief, chose the questions, the port and the output file, and wrote the change under test. My independence is the
independence `RFC-2026-024` describes, and no more. Whether this record counts as the Tester role's signature is for the
Integration Owner and the Product Owner to decide, not me.

I made every mutation in my own worktree. I saved each touched file to my private directory first and restored it from that
copy afterwards, and I checked each restore by sha256. `140_audit.sql` read `2ac596bb950e8dfb…` before and after each drift.
The two lint maps and the work-package file had the same combined digest before and after the citation mutations.
`git status --porcelain` was empty before I wrote this file. Nothing was pushed.

## 1. Measured versus read

**Setup for every measured run:**

- Node `v24.20.0`, from `/Users/bank/.local/node-v24.20.0/bin`, checked with `node -v` before each run. The PATH Node 26 was
  never used.
- PostgreSQL from `/opt/homebrew/bin`.
- A fresh `initdb --locale=C -A trust -U postgres` for every round, on 127.0.0.1:**5503** only, TCP only
  (`-c unix_socket_directories=''`), with `LC_ALL=C`. The shim `db/foundation/ci/supabase-shim.sql` ran first.
- `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`.
- Private directory `scratchpad/q0-rfc-026-027r2/`. I did not touch 5432, 5499 or any other run's port. The cluster was
  stopped and its data directory removed at the end (`pg_isready -h 127.0.0.1 -p 5503`: "no response").

**Measured:**

- the three repository commands on the branch name (§1.1);
- both database layers (§1.2);
- the `lifecycle_state` finding, on a fresh cluster, with the owed revoke simulated (§2);
- RFC-2026-027's revised §5 cases 1, 2, 10 and 11 under six mutants (§3.2);
- RFC-2026-027 §6/6's census and RFC-2026-026 §5.5's client-write list (C0-3), on the catalog (§3.3);
- RFC-2026-026 §8.2/7 and /16 under three failure injections, on a stand-in (§3.1);
- a drift for RFC-2026-026 §8.1/1 (§3.1);
- three citation mutations (§4);
- the append-only claim for `open_blockers[195]` and the manifest digests (§5).

**Read, not executed:** the rest of RFC-2026-026's revised policy and cases. There is no command function, no
`RFC-2026-023` helper and no worker identity to run them against. The RFC-020 quotations in RFC-027 §3.4 I compared by
reading. That is C0's question, and I checked only that the quoted lines match.

### 1.1 Repository commands, on the branch NAME

The branch is checked out in two other worktrees (`wf_7cebcadf-c19-1` and `-5`). So I checked out the name in my own worktree
with `git checkout --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-rfc-026-027`. `git branch --show-current` printed
that name, and HEAD was `80c171fc9bbd6051fb1e8b37c0b708dd3f4da50f`. I committed nothing there. `git status --porcelain` was
empty afterwards, and I switched back to `recheck/q0-batch-rfc-026-027`.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs f3e6fbc WP-0A-DB-00` | 0 | "all 16 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |

The 16 paths match the handoff's record at `b6d65e1`.

### 1.2 Database layers

Nothing a database layer reads changed in the review round. I confirmed A0's grep: in `scripts/db/`, `db/foundation/ci/` and
`Makefile`, the only mention of `work-packages/`, `architecture/decisions/` or `evidence/` is one comment in
`scripts/db/rls-smoke.mjs:28`. I ran the layers anyway, because I needed the cluster.

| Round | Command | Exit | Output |
|---|---|---|---|
| r1 | `make db-migrate-clean` | 0 | "post-migrate pass: 50 apply-time blocks, 38 re-run as written, 12 superseded and replaced" |
| r1 | `make db-rls-smoke`, twice on the same database | 0, 0 | "1079 isolation case(s) passed"; "db-authz-proofs: ok — 6 claim(s) discharged by execution" |
| r2 (fresh) | §3.1's drift, `SECURITY DEFINER` form, appended to `140_audit.sql` | 2 | refused by the SECURITY DEFINER probe ("not a pinned SECURITY DEFINER function"), not by any audit rule |
| r3 (fresh) | the same drift, `SECURITY INVOKER` form | **0** | nothing refuses it (§3.1) |
| r4 (fresh) | the injection stand-in, schema `q0`, no migrations | — | §3.1 |

The r1 database also carried §2, §3.2 and §3.3, each in its own transaction and rolled back.

## 2. The `lifecycle_state` finding, re-measured on a fresh cluster

The same synthetic setup as my first record: U1 owns W1 and W2, U2 owns W3 with U1 as an active editor, and U2 alone owns W4.
Each probe ran as `authenticated` with U1's claims, in its own transaction, rolled back. Script and log:
`lifecycle-probe.sql` and `lifecycle-probe.log`.

| # | Statement as U1 | Result |
|---|---|---|
| P1, P3, P11 | `… where id = W1` to `access_blocked`, `deleted`, `purge_queued` | ERROR "new row violates row-level security policy for table \"workspaces\"" |
| P2 | `… where id = W1` to `closing` | **UPDATE 1** |
| P4, P5 | no WHERE but `RETURNING id`; a `CASE` on `id` in SET | ERROR, the same message |
| P6 | `where true` | UPDATE 2 |
| P7 | no WHERE, no RETURNING, to `access_blocked` | UPDATE 2 (W1 and W2); going back gives UPDATE 0; U1 sees only W3; `is_active_member(W1)` is `t`, and the role is `owner` |
| P8, P12 | the same, to `deleted` and to `purge_queued` | UPDATE 2: W1 and W2 moved, W3 and W4 `active` |
| P9 | the same, to `held` | W3 (U1 is only an editor) untouched |
| P13 | **the owed revoke simulated** (as owner, in the transaction: `revoke update (lifecycle_state) on app.workspaces from authenticated`), then P7's form | **ERROR "permission denied for table workspaces"** |
| P14 | the revoke simulated, then a targeted rename | UPDATE 1: the owner's other updates keep working |

**Verdict.** The finding reproduces exactly as `[195]` (3) now states it. It is MEDIUM and not stop-the-line today. The two
stop-the-line conditions in `[195]` (4) are correct in kind. P12 shows the one-statement path to `purge_queued`, the state a
batch-160 selector would read.

P12 and P13 together show that the isolation case `[195]` (4) requires is discriminating. Without the revoke, the no-column
form moves both workspaces, so the case fails. With the revoke, the form is refused with `42501`. A targeted form would not
discriminate, because P1 is refused today.

## 3. Test obligations: sufficient, and would each fail if the mechanism were missing?

### 3.1 RFC-2026-026 (now 6 static, §8.1; 13 isolation, §8.2/6-18)

The revised text answers each of my earlier findings: Q0-F1 at `:404-412`, Q0-F6 at `:435-441`, Q0-F7 at `:459-462`, and
Q0-F8 at `:445-446`. On F8: `app.jwt_subject()` returns null when the claims are absent (`011:240`), so the `WITH CHECK`
evaluates to null and the policy refuses with `42501`. Case 10 is executable as written (read).

Two residuals remain:

- **Q0R-F1, LOW (measured on a stand-in): §8.2/16 does not say how the refusal is injected, and one natural injection makes
  it pass with F2-c's defect present.** `architecture/decisions/RFC-2026-026-audit-row-producer.md:457-458` reads "with the
  `succeeded` audit row refused by the policy". The RFC's own policy cannot refuse the succeeded row of an action the command
  admits, so the test must inject the refusal. In round r4 I built two command functions in §3.4's shape:
  - RIGHT, with the succeeded `INSERT` outside the exception block;
  - WRONG, with the `INSERT` inside the block and a handler catching `insufficient_privilege`.

  Script and log: `inject.sql`, `inject.log`.

  | Injection (as owner, in the transaction) | RIGHT | WRONG | Does /16 tell them apart? |
  |---|---|---|---|
  | A: restrictive policy `with check (outcome <> 'succeeded')` | raises `42501` | **returns `denied`**, change absent, **1 denied row** | **yes** |
  | B: restrictive policy `with check (false)` | raises | **raises** (the handler's own `denied` INSERT is refused too) | **no**: WRONG passes /16 |
  | C: `CHECK (outcome <> 'succeeded') NOT VALID` | (raises) | raises `23514`, which the handler does not catch | no, but C is §8.2/7's injection, for atomicity, not for F2-c |

  **Remedy:** /16 should name injection A: a refusal the `succeeded` row violates and the `denied` row satisfies, raised as
  `42501`. Add one control that the same injection admits a `denied` row. /7's CHECK option is right for /7's purpose (an
  asynchronous producer). It should say it does not stand in for /16.
- **Q0R-F2, LOW (read; the drift is measured): §8.1/1's "no function reachable from one" has no decidable form as written,
  and nothing holds any part of it today.** `:404-412`. Reachability through PL/pgSQL bodies needs a call graph, and
  `EXECUTE` of a built string defeats a text scan. In round r3, a `SECURITY INVOKER` trigger function on `app.workspaces` that
  inserts into `app.audit_logs`, appended to `140_audit.sql`, passed `make db-migrate-clean` (exit 0). In round r2, the
  `SECURITY DEFINER` form was refused only by the SECURITY DEFINER probe, which is unrelated. So the rule is wholly owed. That
  is consistent with the RFC's "owed", but the rule has to be written in a form a lint can hold. Also, `140_audit.sql:895`'s
  apply-time probe inserts into `app.audit_logs` in a `DO` block. A lint over migration text would match it, and a lint over
  `pg_proc` would not. **Remedy:** state the rule over the catalog, in three parts:
  - (a) the set of functions whose `prosrc` names either audit table equals the coverage map's `producer_path: "command"`
    names, and none of them returns `trigger`;
  - (b) no function returning `trigger` names any of those functions, and none of them uses `EXECUTE`;
  - (c) the triggers on the two audit tables are exactly `140`'s.

  Pair it with the r3 drift as the self-test.

### 3.2 RFC-2026-027 (§5: 11 cases; §6: 6 static), the revised cases under the mutants

I prototyped §3.1 and §3.2 as before (`gen-cases.cjs`, `cases.log`, `cases-verdict.log`; 192 measured rows). Each (mutant,
state) pair ran in its own transaction. Revised case 1 asserts in `active` that the family read (`business_profiles`) is
non-empty, moves the same workspace into the state, and reads again. Case 10 reads `app.workspaces` as `app_authz` with the
owner's claims. Case 11 re-creates the policy without its lifecycle conjunct and repeats case 1's read.

| Mutant | case 1 pre-assert | case 1 | case 2 | case 10 | case 11 |
|---|---|---|---|---|---|
| M0 as proposed | pass | pass | pass | pass | pass |
| M1 policy dropped | **FAIL** | pass | **FAIL** | **FAIL** | pass |
| M2 `011`'s helper restored | pass | **FAIL** | pass | pass | **FAIL** |
| M3 helper's conjunct removed | pass | pass | pass | pass | **FAIL** |
| M4 policy's conjunct removed | pass | pass | pass | **FAIL** | pass |
| M5 both removed | pass | **FAIL** | pass | **FAIL** | **FAIL** |

Every mutant is now killed. M3 is killed only by case 11, and M4 only by case 10. **Q0-F2 is closed by measurement**, and
§3.1's sentence (`:109-113`) is now true. **Q0-F3** is closed: M1 fails case 2 and leaves case 1 green, as the reworded case 7
says. **Q0-F4** is closed in shape: the pre-assertion is what makes case 1 non-vacuous, and it also kills M1. **Q0-F5** is
closed: `run.mjs:305` is `PERMISSIVE_POLICIES`, `PINNED_POLICY_KEYS` sits inside `:1671-1677`, and
`db/foundation/lint/policy-set.json` exists (read).

### 3.3 Two counts that were read, now measured on the r1 catalog (`census.sql`, `census.log`)

- **C0-3's list (RFC-2026-026 §5.5) is exact.** I counted a table as client-writable when `authenticated` holds `INSERT` or
  `UPDATE` (table or any column) **and** a permissive `authenticated` policy exists for that command. Of the 20 coverage-map
  rows, exactly the eleven §5.5 names have a client-writable table. `workspaces`, `workspace_settings` and `user_profiles` are
  writable by UPDATE only, and `workspace_member_scopes` by INSERT only. The other nine rows' tables, including the three
  `private.*` references, have none. The plan (§7.2) and the handoff say "read, not measured". That is accurate for them, and
  this measurement supports the text.
- **RFC-2026-027 §6/6's census reproduces:** 91 permissive `authenticated` policies in `app`, and exactly 10 that call neither
  helper. They are the ten in §3.3's residual table (two `user_profiles`, three invitations, two settings, one own-member row,
  two workspaces). **Q0R-F4, INFO:** the rule says "on a workspace-scoped table". The 91/10 counts every table, including
  `user_profiles`, which §3.3 calls "not workspace-scoped". Filtered to tables with a `workspace_id` column plus
  `app.workspaces`, the count is 89/8. **Remedy:** define the scope in the rule, by a column or by a list, so the lint's
  exemption list is unambiguous.

## 4. The line pins, after `[195]` grew

`[195]` grew from 5170 to 9046 characters on one physical line, so no line moved. I checked this by script
(`wpdiff.cjs`). There are 196 entries before and after, and only index 195 differs; its old text is a strict prefix of the
new. No other top-level key changed. Every `open_blockers[i]` is still on line 256+i, out of 461 lines.

**Citation mutations** (`pin-mutations.sh`; `node --test test-kits/db/foundation-contract.test.mjs`, 80 tests):

| id | Mutation | Exit | What failed |
|---|---|---|---|
| R0 | none | 0 | 80/80 |
| R1 | retention-map `WP:376 (open_blockers[120])` → `WP:377` | 1 | "the retention map has one row per table …" |
| R2 | coverage-map pin `{index 21, line 277}` → line 278 (all 14 occurrences, one per line) | 1 | "batch 141 prep: the audit coverage map names real tables …" |
| R3 | the **work-package side**: the words `[21]`'s pin quotes, altered in `open_blockers[21]` | 1 | the same |

The pins bind on both sides. Q0-F9 (a consistent line-and-index move on a quote-less retention citation stays green) is
unchanged and is recorded as owed in `[195]` (6), as A0 said.

## 5. Are the claims true?

| Claim (where) | Verdict | How |
|---|---|---|
| Three role records cherry-picked with `-x`, no conflict, each adding one file (plan §7.1, handoff) | TRUE | `git diff --stat e64e1f5..80c171f`: each adds exactly its file |
| `[195]` extended by appending only; 196 entries; `[0]`-`[194]` unchanged; no line pin moves (plan §7.3, `b6d65e1`'s message, handoff) | TRUE, measured | §4 |
| Integrity manifest: 90 digests, only the two RFCs' changed (plan §7.3) | TRUE | the manifest diff is exactly two lines |
| No migration, policy, grant, pin or lint rule changes; nothing a DB layer reads changes (plan §7, commit, handoff) | TRUE | `git diff --stat e64e1f5..80c171f` touches only `architecture/decisions/`, `evidence/`, `handoffs/`, `test-kits/integrity-manifest.json` and `work-packages/`; grep in §1.2 |
| Every C0, A1 and Q0 finding has a row in plan §7.2 | TRUE | the ids in the C0 and A1 records (C0-1..8, C1, F1-a/b, F2-a..g, F3-a) and mine (Q0-F1..F10) are all present |
| RFC-027 §3.4's quoted "now" texts match RFC-2026-020 at `:3`, `:393-395`, `:397-405`, `:407-411`, `:444-447`, `:448-449`, `:476` | TRUE as read | `awk` over those lines |
| RFC-027 §4's `run.mjs:305` and `:1671-1677`; RFC-026 §3.7's `140_audit.sql:583-606` columns (no `causation_id`, nullable actor pair) | TRUE as read | §3.2; `sed` of `140_audit.sql` |
| `[195]` (3): a column-reading UPDATE is refused for the six blocked states; a no-column UPDATE moves every owned workspace; the owner cannot move it back | TRUE, measured | §2 |
| `[195]` (4) and Q-027-5: "a case asserting only that `… where id = …` is refused passes today" | TRUE for a blocked target state; FALSE for `closing` (P2: UPDATE 1) | **Q0R-F3, INFO** |
| Fifteen questions, all UNANSWERED; disposition §7 appended, §5 not rewritten (plan §7.3, disposition) | TRUE | `git diff` of the disposition adds lines after §6 only; Q-026-1..9 and Q-027-1..6 in the two §10 tables |
| `b6d65e1` passed `commit-when-clean`; `80c171f` is the handoff alone and last; `check:handoff` exit 0 | TRUE | `git show --stat 80c171f` is one file; §1.1 |
| The C0-3 list "read, not measured on a catalog" | TRUE as a statement of method; the list is now measured exact | §3.3 |
| The new RFC cases are "not executed" (plan §7.2, both §11) | TRUE; RFC-027's cases 1, 2, 10 and 11 are now prototyped here (§3.2), which still discharges nothing for the batch that lands §4 | — |

I found no false claim. Q0R-F3 is an imprecision, not a falsehood: the surrounding text is about blocked states.

## 6. Stop-the-line and merge

**Stop-the-line: none.** The review round changes two Proposed decision records, evidence, the handoff, the manifest and one
appended blocker sentence. No migration, policy, grant or runtime path changes. The live defect it records (`[195]`) is
MEDIUM and not stop-the-line today (§2). Its two future stop-the-line conditions are correctly recorded.

**Does anything block the merge?** Nothing I found. Q0R-F1 and Q0R-F2 are corrections to Proposed RFC-2026-026 text, and
should be made before it is *approved*, not before this PR merges. Q0R-F3 and Q0R-F4 are wording. Whether the
standing-delegation bar of batch 127 §6 is met is A0's reading and the Owner's to correct. The handoff also says the role runs
reviewed `e64e1f5`, not `b6d65e1`; this record and the other re-checks are the review of `b6d65e1`.

## 7. My earlier findings, now

| id | Was | Now |
|---|---|---|
| Q0-F1 | MEDIUM | fixed in text (§8.1/1 no longer refuses its own producer); residual Q0R-F2 (LOW) |
| Q0-F2 | LOW | **closed, measured** (§3.2) |
| Q0-F3 | LOW | **closed, measured** |
| Q0-F4 | LOW | **closed, measured in shape** |
| Q0-F5 | LOW | closed (read) |
| Q0-F6 | LOW | fixed in text; the injection detail for /16 is Q0R-F1 |
| Q0-F7 | LOW | fixed in text (§8.2/17, with a static fallback); not executable before a command exists |
| Q0-F8 | LOW | closed (read: null subject gives `42501`) |
| Q0-F9 | INFO | unchanged, recorded as owed in `[195]` (6) |
| Q0-F10 | INFO | closed: `[195]` (3), Q-026-5 and Q-027-5 cite the measurement |

## 8. New findings, ranked

| id | Grade | File:line | Finding | Remedy |
|---|---|---|---|---|
| Q0R-F1 | LOW | `architecture/decisions/RFC-2026-026-audit-row-producer.md:457-458` | §8.2/16 names no injection; a refuse-every-row injection lets the F2-c defect pass (measured, injection B) | name a refusal the `succeeded` row violates and the `denied` row satisfies (`with check (outcome <> 'succeeded')`), plus a control that it admits `denied` |
| Q0R-F2 | LOW | `RFC-2026-026-audit-row-producer.md:404-412` | §8.1/1's "reachable from one" has no decidable form; nothing holds the rule today (r3 drift, exit 0) | restate over `pg_proc`/`pg_trigger` as (a)-(c) in §3.1; use the r3 drift as the self-test |
| Q0R-F3 | INFO | `work-packages/WP-0A-DB-00.json:451` (`[195]` (4)); `architecture/decisions/RFC-2026-027-lifecycle-visibility.md:428` (Q-027-5) | "a case asserting only that `… where id = …` is refused passes today" holds for blocked targets only (P2: `closing` succeeds) | add "to a blocked state" on the next touch |
| Q0R-F4 | INFO | `RFC-2026-027-lifecycle-visibility.md:359-365` (§6/6) | the 91/10 census counts non-workspace tables; the rule says "workspace-scoped" (89/8 by `workspace_id`) | define the rule's scope |

## 9. Limits

- Same vendor and model family as the Author. A0 framed my questions. My mutations and injections are a sample, chosen by a
  model that shares the Author's blind spots.
- RFC-2026-026 is still read, not executed. The r4 stand-in is a self-contained schema `q0`, not `app.audit_logs` with the
  revised policy and an `RFC-2026-023` helper. It shows only how /16's injection decides the outcome.
- The RFC-2026-027 prototype ran on one synthetic workspace and one family (`business_profiles`), with `postgres`-seeded
  rows. It does not discharge §7.2 or any case for the batch that lands §4.
- I compared RFC-027 §3.4's quotations by reading. Whether the amendment is complete as a contract is C0's question.
- I did not observe CI.
- Private artefacts (not in the repository) are under `scratchpad/q0-rfc-026-027r2/`: the probe, census, prototype,
  injection and drift scripts and logs; the pin-mutation script and logs; and the backups. No cluster remains.
