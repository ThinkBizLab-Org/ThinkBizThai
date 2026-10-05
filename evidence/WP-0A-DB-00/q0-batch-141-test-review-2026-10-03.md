# Q0 independent test of batch 141: the acting-user narrowing, the §11.4 closing command, the audit producer's command half

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Date:** 2026-10-05 (the file name
carries the phase's date, 2026-10-03, as every record of this phase does).
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-141`, head `ad97cde` over code commit `76a26e0`, base `e92b896`
(main, PR #182 merged). Author `/claude/a0_atlas`. PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/183> (Draft).
**Reviewed on:** my own branch `review/q0-batch-141`, checked out at `ad97cde`; the guard commands were run with
`agent/claude/WP-0A-DB-00-batch-141` itself checked out (`git checkout --ignore-other-worktrees`, read-only, no commit
made on it), then switched back.

This file records findings. It advances no status, approves nothing, and fixes nothing.

## 0. What I am

A subagent of `/claude/a0_atlas`'s orchestration, the same vendor and model family as the Author (RFC-2026-024 states
what that independence is worth and what it is not). Separation here is of run, worktree, branch and evidence, not of
mind. Whether this record is accepted as the Q0 role's signature is the Integration Owner's and the Product Owner's act,
not mine. Every claim below is labelled **measured** (I ran it, this run, on the stated cluster) or **read** (from the
tree or a document, not executed).

## 1. Verdict

- **Stop-the-line: none.** The shipped objects behave as the RFCs say on every path I executed, including the paths
  the suite does not cover (an editor's cancel of a closing workspace is refused and recorded, measured; §3 F1).
  No tenant leakage, secret exposure, migration divergence or contract mismatch was found.
- **Merge: blocked on the findings, not on a defect.** F1 and F2 are test gaps against obligations an approved RFC
  states and the batch's RFC-2026-026 status line claims as implemented. The standing merge bar (CI green, role runs'
  findings cleared, no stop-the-line) is not met while they are open. Remedy them, or have the Owner dispose of them by
  name.
- The guard commands are green on the branch **name**: `verify-branch-scope` exit 0, `npm run check:handoff` exit 0,
  `npm run verify` exit 0 (688/688).

## 2. Measured

Node `v24.20.0` (checked before every measured run, printed by the round script), PostgreSQL 17.11 (Homebrew),
`127.0.0.1:5503` only, TCP only (`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`,
the shim first, then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean` and
`make db-rls-smoke`. **Re-initdb every round** (61 rounds). Private directory `q0-141/` under the session scratchpad.
Cluster stopped and its data directory removed at the end; nothing listens on 5503 (measured, `lsof`). Ports 5432,
5499 and every other run's port untouched.

| what | result |
|---|---|
| baseline, two rounds (`base`, `base2`) | migrate-clean exit 0, post-migrate pass 53 / 37 as written / 16 superseded; audit producer rule "decided each of its 19 drifts and controls; clean again after every drift"; rls-smoke exit 0, **1187** cases, `db-authz-proofs` **9** claims |
| D1, the file renamed to `141_*` (round `d1-as-141`) | migrate-clean exit 2 inside `171`: "after batch 171, app_authz holds 3 policies in schema app; RFC-2026-027 gives it exactly two (P0001)". The reason for 172 holds. File renamed back; tree clean |
| try-it demo, part 8 | `try-it up --port 5503` exit 1, "port 5503 is one this tool never touches", directory not created. The demo's own loop (`DEMO_STEPS`, `demoPlanProblems`, `runCases`, `sessionDriver`, the `after` reads) replicated against 5503: **All 17 steps behaved as expected**; step 16 read back `closing` and one audit row, step 17 `active` and one row |
| try-it demo, negative control | same loop on a cluster with the cancel's succeeded INSERT removed (C10 below): **DEMO FAILED: 1 of 17 steps (17)**, "after 2: n is "0" and the case demands "1"" |
| `node scripts/verify-branch-scope.mjs e92b896 WP-0A-DB-00` on the branch name | exit 0, "all 34 changed path(s) are declared" (34 at `ad97cde`; the handoff's 33 was measured at `76a26e0`, before the handoff itself changed — consistent) |
| `npm run check:handoff` on the branch name | exit 0, "describes the branch: nothing substantive after its cited head" |
| `npm run verify` on the branch name | exit 0, "clean: exit 0 — tests 688, pass 688, fail 0, skipped 0, todo 0" |
| live probe, shipped code: editor A cancels closing workspace A | `denied` `workspace.lifecycle.not_permitted`, state stays `closing`, one `denied` row by the editor |

Each mutation below was restored before the next round (a later file deleted; an in-code edit undone by
`git checkout`); `git status` was clean after every round (measured). The drift-append route into `140_audit.sql` was
not needed: the producer rule's 19 drifts ran as built in every baseline round.

## 3. Mutation table (measured)

"Later file" = `db/foundation/migrations/173_q0_mutation.sql`. "In code" = the same change made in
`172_acting_user_and_closing_command.sql` itself, then every string pin it trips **refreshed** to the live catalog
(body digests in `SECURITY_DEFINER_FUNCTIONS`, deparses in `PERMISSIVE_POLICIES`, `AUTHZ_SCOPES_POLICY_QUAL`,
`policy-set.json`) and the round re-run, so what remains red is what the pins do not hold. Layers: **pin** (a catalog
probe in migrate-clean), **block** (an apply-time block or its superseded replacement), **case** (rls-smoke isolation
case), **proof** (`db-authz-proofs`).

| # | mutation | later file | in code, pins refreshed |
|---|---|---|---|
| M1 | widen the close's transitions: `active` or `closing` → `closing` | pin (security definer probe, body digest); case `owner-a-cannot-close-a-workspace-that-is-already-closing`; proof Q0-RC1 arm | pin cleared; **case + proof red** — HELD |
| M1b | widen the UPDATE policy's target states (literal dropped from WITH CHECK) | pin (permissive policy probe); cases green | block: 172's own check 5 refuses at apply time; with it removed too, 171's replacement check ("not the one the closing command's policy bounds its target state by"); cases green — HELD by block and pin; no behavioural case (by design: the body is the transition rule) |
| M2a | drop the owner test from the close's body | pin; 8 cases (editor, cross-tenant, six blocked states) | pin cleared; **same 8 cases red** — HELD |
| M2b | drop the owner test from the **cancel's** body | pin; **cases green, proofs green** | pin cleared; **all 1187 cases and 9 proofs green** — HELD BY PIN ONLY (F1) |
| M2c | drop the owner test from the UPDATE policy (USING true) | pin; cases green | pin cleared; **all green** — HELD BY PIN ONLY (F3) |
| M2d | close body + UPDATE policy owner tests both dropped | pin; 8 cases | 8 cases red (by error code: the SELECT path still refuses) — HELD |
| M2e | cancel body + UPDATE policy owner tests dropped | pin; green | pin cleared; **all green** (F1) |
| M2f | every owner layer of the cancel dropped (body, UPDATE policy, SELECT path → `is_active_member`) | pins; **cases green** | pins cleared; **all 1187 cases and 9 proofs green**. Live on that cluster: **editor A reopened closing workspace A**, `succeeded`, state `active`, a `succeeded` row under the editor's id (F1) |
| M3a | drop the close's succeeded audit INSERT | pin; case `owner-a-closes-…` (after 2: n is "0"); proof (baseline, /14, /7, /16 arms) | pin cleared; same case + proof red — HELD |
| M3b | drop the close's denied/failed INSERT | pin; 3 denial cases (after 2: n "0"); proof | pin cleared; same — HELD |
| M3c | the cancel's succeeded INSERT moved **inside** the exception block (§8.2/16's wrong shape) | pin; **green** | pin cleared; **all green** — HELD BY PIN ONLY (F2) |
| M3d | drop the cancel's succeeded INSERT (C10) | pin; case `owner-a-cancels-…` (after 2: n "0"); demo step 17 | — (later file sufficed) |
| M4a | loosen the producer policy: `actor_id = jwt_subject()` dropped | pin (policy set probe); case `refuses-a-forged-actor` | pin cleared; same case red ("returned zero rows rather than refusing") — HELD |
| M4b | loosen the producer policy: `is_active_member(workspace_id)` dropped | pin; 10 cases (another tenant ×2, nonexistent workspace, suspended, six blocked states) | pin cleared; same 10 red — HELD |
| M4c | `actor_kind = 'user'` dropped (C11) | pin; `refuses-a-system-actor-…` | — |
| M4d | refusal branch `else true` (C7) | pin; 3 refusal-scope cases | — |
| M4e | page form not called (C8) | pin; 3 page cases | — |
| M4f | producer policy dropped (C13, /14 as a later file) | pin; 8 cases (every command call, both admitted controls); proof | — |
| M5 | widen app_authz's new policy: `USING (true)` | pin (permissive probe); proof `catalog-satisfies-rfc-2026-020-6.1` ("not the pinned one") | pins cleared (incl. `AUTHZ_SCOPES_POLICY_QUAL`); **all green** — HELD BY PIN ONLY (F5; by design) |

Targeted later-file mutations, to see each family of new case go red for its own reason (rls-smoke layer):

| # | mutation | red, and why |
|---|---|---|
| C1 | both helpers reduced to `is_active_member` | 5: sibling page, other business (rows visible); producer page-editor sibling, page-editor another tenant's page, business-editor other business (zero rows rather than refusing); proof scope arm |
| C2 | page helper reads the business, not the page | 3: the page cases |
| C3 | membership conjunct dropped from both helpers | 9: six blocked states, owner B, no subject, suspended (1 row visible) |
| C4 | EXECUTE widened (helpers to authenticated; command to worker, app_command, anon + USAGE) | the 5 EXECUTE cases, each by its own message: helpers "1 row(s) came back"; worker and anon "refused with 42501 … no layer this suite recognises" (the body's no-subject raise, not the grant); app_command "zero rows rather than refusing" |
| C5 | `jwt_aal()` always `aal2` | `owner-a-cannot-close-…-without-step-up`; proof baseline arm |
| C6 | the close's no-subject guard dropped | `a-request-with-no-subject-cannot-close-anything` |
| C9 | helpers refuse `closing` | `…-admit-the-owner-of-workspace-a-in-closing` |
| C14 | helpers answer false | 13: every positive helper case, each blocked-state case at its **before** read, the page editor's admitted producer row |
| C15 | cancel admits `active` | `owner-a-cannot-cancel-an-active-workspace` |

**Coverage of the 58 new cases (measured, `cover.mjs` over every round's log):** 57 go red under at least one
mutation, each with a message naming the property the case exists for. One —
`the-producer-policy-refuses-a-row-with-no-acting-user` — is held jointly by the actor term and the membership term,
so no single-term mutation turns it red (F7, by design).

## 4. Findings

**F1 — Major (test coverage; not a live defect). The cancel's authorization has no behavioural case.**
`tests/db/identity/isolation-cases.mjs:20047` and `:20098` are the only two cancel cases (owner succeeds; owner
cancels an active workspace). There is no non-owner cancel, no cross-tenant cancel, no cancel in a blocked state —
RFC-2026-023 §6 asks the cross-tenant and blocked-state refusals of "the command", and §8/1 gives the cancel the same
owner bound as the close. Measured: M2b, M2e and M2f all pass 1187/1187 and 9/9 once the digest and deparse pins are
refreshed, and on M2f's cluster an editor reopens a closing workspace with a `succeeded` row. On the shipped code
the editor is refused (`not_permitted`, measured), so today the property is held by the body, the SELECT path and the
UPDATE policy, but nothing executes it. **Remedy:** add `editor-a-cannot-cancel-the-closing-of-workspace-a`
(denied/not_permitted, state stays `closing`, one denied row), `owner-b-cannot-cancel-…-and-leaves-no-row`, and the
six blocked-state cancels (no move, no row), each with `after` reads; re-run M2b/M2f to see them red.

**F2 — Major (RFC obligation partly met; status line overclaims). §8.2/7 and /16 run on the close only.**
RFC-2026-026 §8.2/7 ("for each command function the batch lands") and /16 ("For each landed command function")
are executed by `proveTheClosingCommand` (`scripts/db/authz-proofs.mjs:776`), whose `commandProbe` defaults to
`fn = 'close_workspace'` (`:660`) and is never called with another (`:795`). Measured: M3c — the cancel's succeeded
INSERT inside the exception block, so an audit refusal is swallowed as `failed` — passes everything once its digest is
refreshed. `architecture/decisions/RFC-2026-026-audit-row-producer.md:12` says /7 and /16 are implemented without
that limit. **Remedy:** run the /7, /14, /16 (with control and self-test) probes for `cancel_workspace_closing` too
(setup moves A to `closing`); or state the limit in the RFC line, the plan §2 row 9, the handoff and
`open_blockers[200]`.

**F3 — Minor (containment unexecuted). The UPDATE policy's owner test is held by its pin alone.**
`172_acting_user_and_closing_command.sql:194-201`. RFC-2026-023 §4 sells shape B as containment against defects in
command code, but with the body intact the policy's owner test is never what refuses: M2c passes everything with
pins refreshed. The `arm` proof drops the whole policy, which shows the policy is needed for the success path, not that
it refuses a non-owner. **Remedy:** a proof that installs a close without the body's owner test (as /16's self-test
installs a wrong function) and asserts the editor's call returns `failed`, state unchanged, with a self-test where the
policy's USING is `true` and the call succeeds.

**F4 — Note. The target-state literal is held by blocks and a pin, not by a case** (M1b). Acceptable: the body is the
transition rule (RFC-2026-023 §8/1); the literal bounds target states as a second line and is held by 172's check 5,
171's replacement, and the permissive policy probe — three static layers, measured in that order.

**F5 — Note. Widening `workspace_member_scopes_select_authz_own` is behaviourally invisible** (M5): the helpers filter
`s.user_id = app.jwt_subject()` themselves (`172:118-122`, `:133-139`), so `USING (true)` changes no answer.
RFC-2026-020 designates the policy string as the control; the permissive probe and the authz proof hold it. No remedy
asked; recorded so nobody reads the policy as load-bearing for the helpers' answers.

**F6 — Minor (handoff text).** `handoffs/WP-0A-DB-00-author-handoff.json:142` says app_command gains "EXECUTE on four
app_authz helpers". `172:174-182` grants six functions owned by `app_authz` to `app_command`: `jwt_subject`,
`is_active_member`, `workspace_member_role`, `acting_user_admits_business`, `acting_user_admits_page`, `jwt_aal`.
**Remedy:** correct the count at the next handoff refresh.

**F7 — Note.** `the-producer-policy-refuses-a-row-with-no-acting-user` survives every single-term mutation (actor
binding and membership each refuse a null subject). Redundancy, not a gap; a reviewer asking "does this case go red?"
needs both terms removed.

**F8 — Note (plan wording).** `evidence/WP-0A-DB-00/a0-batch-141-plan-2026-10-03.md:58` says `npm run check` exit 0.
At `76a26e0`, the commit that adds the plan, it was exit 1 (the handoff guard; the handoff and commit message say
so); at `ad97cde` it is 0 (measured, 688/688). True of the head, not of the commit it sits in.

## 5. Claims checked

| claim (where) | verdict |
|---|---|
| 1187 cases (1129 + 58), 9 proofs, 19 drifts and controls, 53/37/16 (plan §3, handoff, commit) | TRUE, measured twice |
| a `141_*` file fails migrate-clean inside 171, exit 2 (D1) | TRUE, measured |
| 688 tests; check:handoff green; verify-branch-scope exit 0 (handoff, plan) | TRUE at `ad97cde`, measured on the branch name |
| policy literal "as the RFC writes it" (RFC-2026-026 §3.3) | TRUE, read: `172:204-220` matches §3.3 term for term; the pinned deparse in `policy-set.json` is what the live catalog holds (measured: the pin refreshes only under a mutation) |
| open_blockers [21], [29], [32], [191], [195], [199] appended, [200] added at the end, no line moved (manifest, handoff) | TRUE, measured: each changed entry starts with its base text verbatim; 200 → 201 entries; only `ownership` and `open_blockers` changed |
| `refresh:handoff` "7 added, 26 modified" for `e92b896..76a26e0` (ad97cde message) | TRUE, measured |
| the four out-of-ownership files named in the rationale | TRUE, read; verify-branch-scope accepts every amendment |
| RFC-2026-026 "Implemented in part … §8.2/6-11 and /14 and /16-/20" | PARTLY: /7 and /16 for the close only (F2) |
| "EXECUTE on four app_authz helpers" (handoff) | FALSE: six (F6) |
| "the two steps run through sessionDriver on 5507 … both as expected" (handoff) | Not re-measured on 5507; the equivalent on 5503 is TRUE, measured, with a negative control |
| Owner's words quoted verbatim, "no new words" (disposition §1) | Read only. The quoted strings match the dispositions they cite in this tree; I cannot check them against the Owner's chat |
| A0 merged #182 at `d756052`, merge `e92b896` (disposition §2) | TRUE as to the tree (`git log`); the CI run number is read, not checked |

## 6. Limits

- Not measured: the platform's `aal` claim after step-up (Q-023-5) and function ownership under a non-superuser
  applier (Q170-c); CI on PR #183; the full `try-it demo` (the tool refuses every reserved port, 5503 included — the
  loop was replicated, `scratchpad/q0-141/demo5503.mjs`, with `demoPlanProblems` run first).
- Not re-run: the 19 producer-rule drifts beyond running them as built in every baseline round; drifts 12 and 16
  (not built by the Author, `open_blockers[195]`).
- The mutation set is mine; a mutation I did not think of is not covered by this record.
- "In code" rounds refreshed the string pins by script from the live catalog; where a mutation broke the migration
  at apply time (M1b), the block was the layer recorded and the deeper layers were taken one at a time.
- Scratch scripts (`round.sh`, `mutate.py`, `cases.py`, `refresh.py`, `crun.sh`, `casrun.sh`, `demo5503.mjs`,
  `cover.mjs`) and every round's log stay in the session scratchpad; they are not committed.
