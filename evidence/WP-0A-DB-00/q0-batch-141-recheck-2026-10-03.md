# Q0 independent test re-check of batch 141's review round

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Date:** 2026-10-05 (the file name
carries the phase's date, 2026-10-03, as every record of this phase does).
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-141`, head `8fe0c31` (`8fe0c3137f4d793e64c1e0181d8d623b4878967d`)
over code commit `3c50ba8`, base `e92b896` (main). Author `/claude/a0_atlas`. PR
<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/183> (Draft, open; head `8fe0c31`; check `bootstrap` SUCCESS,
read with `gh pr view`, not re-run). Previous reviewed head `ad97cde`; my earlier record is
`q0-batch-141-test-review-2026-10-03.md`.
**Re-checked on:** my own branch `recheck/q0-batch-141`, created at `8fe0c31`. The guard commands were run with the
branch NAME `agent/claude/WP-0A-DB-00-batch-141` checked out (`git checkout --ignore-other-worktrees`, read-only, no
commit on it), then switched back.

This file records findings. It advances no status, approves nothing, and fixes nothing. Scope is NARROW: my own
findings first, then the review round's corrections that a test layer reads.

## 0. What I am

A subagent of `/claude/a0_atlas`'s orchestration, the same vendor and model family as the Author (RFC-2026-024 states
what that independence is worth and what it is not). Separation here is of run, worktree, branch and evidence, not of
mind. Whether this record is accepted as the Q0 role's signature is the Integration Owner's and the Product Owner's act,
not mine. Every claim below is **measured** (I ran it, this run) or **read** (from the tree, a document or a tool's
report, not executed).

## 1. Verdict

- **Stop-the-line: none.** No tenant leakage, secret exposure, migration divergence or contract mismatch found.
- **My earlier Major and Minor findings are closed, measured:** F1 (cancel's authorization unexecuted), F2 (§8.2/7,
  /16 for the close only), F3 (UPDATE policy's owner test held by a pin alone), F6 (handoff "four"), F8 (plan wording).
  F4, F5, F7 were notes and stand as written.
- **Q0 does not block the merge.** Nothing new above Note. What the merge still waits on is not Q0's: the C0 and A1
  re-checks of this round, and the acceptances `open_blockers[200]` (9)-(14) assign to other owners — (13), the
  number 172, "at or before the merge".
- Guards on the branch **name**: `verify-branch-scope` exit 0 (37 paths), `npm run check:handoff` exit 0,
  `npm run verify` exit 0 (688/688).

## 2. Measured

Node `v24.20.0` (printed by every round; the PATH Node 26 never used for a measured run), PostgreSQL 17.11
(Homebrew), `127.0.0.1:5503` only, TCP only (`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U
postgres`, `LC_ALL=C`, the shim first, then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make
db-migrate-clean` and `make db-rls-smoke`. **Re-initdb every round: 48 rounds.** Private directory `q0-141r2/` under the
session scratchpad. Cluster stopped and its data directory removed at the end; nothing listens on 5503 (`lsof` exit
1). Ports 5432, 5499 and every other run's port untouched. `git status` clean after every round.

| what | result |
|---|---|
| baseline (`base`) | migrate-clean exit 0; post-migrate pass 53 / 37 / 16; audit producer rule "decided each of its **23** drifts and controls; clean again after every drift", "the **1** pinned reader(s) … and no view does"; rls-smoke exit 0, **1200** cases; `db-authz-proofs` **10** claims |
| try-it, the tool itself | `try-it up --port 5503` exit 1, "port 5503 is one this tool never touches"; its directory not created |
| try-it demo (replica of the tool's loop on 5503: `DEMO_STEPS`, `demoPlanProblems` first, `runCases`, `sessionDriver`, the `after` reads) | **All 17 steps behaved as expected**; step 16 read back `closing`, one audit row; step 17 `active`, one row |
| demo, negative control 1: the cancel's succeeded INSERT dropped (later file) | **DEMO FAILED: 1 of 17 steps (17)**, "after 2: n is "0" and the case demands "1"" |
| demo, negative control 2: the close's succeeded INSERT dropped (later file) | **DEMO FAILED: 1 of 17 steps (16)**, same message |
| `node scripts/verify-branch-scope.mjs e92b896 WP-0A-DB-00`, branch name | exit 0, "all 37 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff`, branch name | exit 0, "describes the branch: nothing substantive after its cited head" |
| `npm run verify`, branch name | exit 0, "clean: exit 0 — tests 688, pass 688, fail 0, skipped 0, todo 0" |
| `140_audit.sql` after every append | `cmp` identical to the saved original; sha256 `2ac596bb…c1ad37149`, as the plan §7.3 states |

## 3. Mutation table (measured)

"Later file" = `db/foundation/migrations/173_q0_mutation.sql`, deleted after the round. "In code" = the same change
made in `172_acting_user_and_closing_command.sql`, then every string pin it trips **refreshed** to the live catalog
(body digests in `SECURITY_DEFINER_FUNCTIONS`, deparses in `PERMISSIVE_POLICIES`, `AUTHZ_SCOPES_POLICY_QUAL`,
`policy-set.json`) and the round re-run, so what remains red is what the pins do not hold; restored by `git checkout`.
Layers: **pin** (catalog probe in migrate-clean), **case** (rls-smoke isolation case), **proof** (`db-authz-proofs`).
In every later-file round the pin was red as well (security definer, permissive policy or policy set probe).

| # | mutation | later file | in code, pins refreshed | was (ad97cde) | now |
|---|---|---|---|---|---|
| M1 | widen the close's transitions: `active` or `closing` → `closing` | pin; case `owner-a-cannot-close-a-workspace-that-is-already-closing`; proof (Q0-RC1 arm) | same case + proof red | HELD | HELD |
| M2a | drop the owner test from the close's body | pin; 8 cases (editor, owner B, six blocked states) | same 8 red | HELD | HELD |
| M2b | drop the owner test from the **cancel's** body | pin; **8 new cases** (editor, owner B, six blocked states) | **same 8 red** | pin only (F1) | **HELD** |
| M2c | UPDATE policy's owner test dropped (USING and WITH CHECK) | pin; cases green; **proof `closing-command-policies-contain-…` red** ("SELECT path widened": succeeded, state closing) | **proof red** | pin only (F3) | **HELD** |
| M2c′ | A0's form: `USING (true)` alone | pin; proof red: "call is "returned failed write_failed:42501" and should be "… P0002"" | — | — | HELD |
| M2f | every owner layer of the cancel dropped (body, UPDATE policy, SELECT path → `is_active_member`) | pins; 8 new cases red; containment proof red | 8 cases + proof red | pin only (F1) | **HELD** |
| M3a | drop the close's succeeded audit INSERT | pin; case `owner-a-closes-…` ("after 2: n is "0""); proof | same | HELD | HELD |
| M3c | the cancel's succeeded INSERT moved **inside** its exception block (§8.2/16's wrong shape) | pin; cases green; **proof red** at "cancel /7" and "cancel /16" (returned `failed workspace.lifecycle.write_failed` where it must raise) | **proof red**, same arms | pin only (F2) | **HELD** |
| M3d | drop the cancel's succeeded INSERT | pin; case `owner-a-cancels-…` ("after 2: n is "0""); proof | same | case | HELD |
| M4a | loosen the producer policy: `actor_id = jwt_subject()` dropped | pin; case `the-producer-policy-refuses-a-forged-actor` | same case red | HELD | HELD |
| M4b | loosen the producer policy: `is_active_member(workspace_id)` dropped | pin; 10 cases (another tenant ×2, nonexistent workspace, suspended, six blocked states) | same 10 red | HELD | HELD |
| M5 | widen app_authz's new policy: `USING (true)` | pin; proof `catalog-satisfies-rfc-2026-020-6.1` | **all green** (`AUTHZ_SCOPES_POLICY_QUAL` refreshed too) | pin only (F5, by design) | unchanged, by design |

Targeted later-file mutations for the review round's other new cases, each red for its own reason:

| # | mutation | red, and why |
|---|---|---|
| C16 | both bodies' identifier test back to "non-blank" | `the-closing-command-refuses-an-overlong-request-id` ("accepted the row (0 returned) and had to refuse it with 22023"); `the-cancel-command-refuses-a-correlation-id-that-is-free-text` ("accepted the row (1 returned)") |
| C17 | `grant update, delete, truncate on app.audit_logs to app_command` | pinned grant probe names all three; cases: update and delete "returned zero rows rather than refusing" (no policy, so RLS filters), truncate "raised ZZ140, which is not an RLS refusal" — each case exists for the grant layer and goes red when the grant is there |
| C18 | the cancel's body owner test only | the 8 new cancel cases red. Live on that cluster, editor A's cancel of closing workspace A: `denied workspace.lifecycle.not_closing` (the SELECT path hides the row), state stays `closing`, one `denied` row under the editor — the case is red because the body's `not_permitted` is gone, and the policies still contain the move |
| M2f live | every owner layer of the cancel dropped (later file) | editor A **reopens** closing workspace A: `succeeded`, state `active`, a `succeeded` row under the editor's id — the defect the 8 cases now catch |

**Coverage of the 13 new cases (1187 → 1200):** all 13 go red under at least one mutation above, each through the
property it exists for. The 2 new proof arms (cancel /14, /7, /16 with control and self-test; the containment proof)
each go red under M3c and M2c / M2c′ / M2f respectively.

Drifts appended to `140_audit.sql` (re-initdb each, restored byte for byte, `cmp` identical):

| drift | result |
|---|---|
| C2: a view in `public` over `app.workspaces`, SELECT and UPDATE to `app_command` | exit 2 at `172`'s apply time: "app_command holds a privilege … public.q0_ws SELECT, public.q0_ws UPDATE, …" (172's widened check 3) |
| B: a subscription (never connected) | exit 2: "(h) subscription probe_sub: a logical-replication apply worker writes audit rows past every policy and trigger" |
| `grant pg_create_subscription to app_worker` | exit 2: pinned grant probe "role membership(s) … not pinned … app_worker -> pg_create_subscription" |
| `grant update (lifecycle_state) … to public` | exit 2 inside `170`: "anon UPDATE, authenticated UPDATE, public UPDATE" |
| same grant to `anon` | exit 2 inside `170`: "anon UPDATE" |
| same grant to `authenticated` | exit 0: `170` revokes it. So no drift appended to `140` reaches 172's check 7 — as the plan and handoff state |

Part (i) over synthetic catalog rows (read through `decideAuditProducerRule`, not live): an invoker function writing
`app."workspaces"`, a procedure, a `U&"workspace\0073"` identifier and a `BEGIN ATOMIC` body are each refused by (i)
naming the object. The rule's own drifts `i`, `i2`, `i3`, `i4`, `B` ran as built in every baseline round.

## 4. Findings

Earlier findings, re-checked:

| id | was | now |
|---|---|---|
| F1 | Major: no cancel refusal case | **Closed, measured.** `tests/db/identity/isolation-cases.mjs:20161` onward: editor, owner B (no row), six blocked states (no move, no row), each with `after` reads; M2b, M2f, C18 turn all 8 red |
| F2 | Major: /7, /16 for the close only | **Closed, measured.** `scripts/db/authz-proofs.mjs:860` onward runs /14 ×2, /7, /16, control, self-test (`WRONG_CANCEL_WORKSPACE_CLOSING`) for the cancel; M3c red at cancel /7 and /16; RFC-2026-026's review-round line (1) states the earlier overclaim |
| F3 | Minor: UPDATE policy owner test held by a pin alone | **Closed, measured.** `scripts/db/authz-proofs.mjs:900`; M2c and A0's M2c′ both turn it red, its self-test succeeds |
| F4 | Note: target-state literal held by blocks and a pin | stands, by design |
| F5 | Note: widening `workspace_member_scopes_select_authz_own` is behaviourally invisible | stands (M5 re-measured, all green with the pin refreshed) |
| F6 | Minor: handoff "four app_authz helpers" | **Closed, read**: the handoff now says six functions owned by `app_authz`, naming them; "four app_authz" no longer occurs |
| F7 | Note: the no-acting-user producer case is held jointly | stands |
| F8 | Note: plan §3 `npm run check` wording | **Closed, read**: plan §3 now distinguishes `ad97cde` (0) from `76a26e0` (1) |

New, this round (all Notes; no remedy required for the merge):

**N1 — Note (diagnostics).** The command refusal cases (close and cancel) fail with the generic "nothing was visible"
(`tests/db/identity/isolation-cases.mjs:19980-19981`: the SQL filters on the expected outcome and error code), so a red
case does not print what the call returned. Each is red for the right property (measured live under C18 and M2f), but
a reader has to probe to learn which verdict came back. Remedy, optional: return the call's row unfiltered and assert
outcome and error code in the case.

**N2 — Note (containment proof's reach).** The containment proof installs a defective **close** only. The cancel
shares the same two policies, and with its body's owner test removed the SELECT path still refuses (C18, measured:
`not_closing`, state unchanged). So the property holds for the cancel today, executed through the cases' change of
verdict rather than through a dedicated proof. No remedy asked.

**N3 — Note (count).** The plan §7.2 reports 9 cases red under M2f; I measure 8. The plan says why: its M2f body was
the `ad97cde` body without the identifier bound, so the free-text case went red too. Both are consistent.

## 5. Claims checked

| claim (where) | verdict |
|---|---|
| 1200 cases (1187 + 13), 10 proofs, 23 drifts and controls, 53/37/16 (plan §7.3, handoff, `8fe0c31` message) | TRUE, measured |
| 688 tests; check:handoff and verify green; verify-branch-scope exit 0, 37 paths (plan, handoff, `3c50ba8` message) | TRUE, measured on the branch name |
| Q0's M2f, M3c, M2c re-run red (plan §7.2, `3c50ba8` message) | TRUE, measured (M2c in both my form and A0's: "42501 where P0002 is required") |
| C2 exits 2 at 172's apply time; drift B and the `pg_create_subscription` membership exit 2 when appended to 140 (plan §7.2) | TRUE, measured |
| check 7 held first by 170: PUBLIC fails in 170, authenticated alone is revoked and exits 0; no 140 drift reaches check 7 (plan, handoff, A0's not-done list) | TRUE, measured (anon added: also fails in 170) |
| `140_audit.sql` sha256 `2ac596bb…c1ad37149` (plan §7.3) | TRUE, measured |
| the two body digests moved for the identifier bound; the trigger probe digest moved for a comment only (`foundation-contract.test.mjs`) | TRUE, read (the run.mjs diff adds only comment lines in that probe) and measured (688/688) |
| D11 "stricter than before, never looser" (disposition §4) | TRUE, read: the old app_command-owner branch is kept verbatim; the new branches only add refusals |
| `open_blockers[200]` (3) and (8) corrected, (9)-(15) appended; only `ownership` and `open_blockers` changed (manifest, plan) | TRUE, measured: those two keys only; 201 entries; the ownership rationale keeps its base text as a prefix; [200] (added by this batch) differs only in (3), (8) and the new (9)-(15) |
| "app_command holds EXECUTE on six functions owned by app_authz" (handoff) | TRUE, read against `172:174-182` |
| try-it tour not re-run on 5507 (plan §7.3, A0's not-done list) | TRUE as stated; I ran the tool's loop on 5503 with two negative controls (§2) |
| CI green on the head | read only: `bootstrap` SUCCESS on `8fe0c31` (`gh pr view`); CI skips the handoff guard, which I ran myself |

## 6. Limits

- Not measured: the platform's `aal` claim after step-up (Q-023-5); function ownership under a non-superuser
  applier (Q170-c); CI beyond reading its conclusion; the RFC-2026-023 §5.1 quotations and the RFC texts generally
  (C0's ground, read only where a test claim rested on them).
- The full `try-it demo` was not run through the tool: it refuses every reserved port, 5503 included; the loop was
  replicated (`scratchpad/q0-141r2/demo5503.mjs`), plan problems checked first.
- Part (i)'s extra drifts were decided over synthetic rows, not a live catalog; the rule's own live drifts ran.
- The mutation set is mine; a mutation I did not think of is not covered by this record.
- Scratch scripts (`round.sh`, `mrun.sh`, `crun.sh`, `casrun.sh`, `mutate.py`, `cases.py`, `refresh.py`, `probe.sh`,
  `demo.sh`, `drift140.sh`, `rule-probe.mjs`, `wpcmp.mjs`) and every round's log stay in the session scratchpad; they
  are not committed.
