# C0 contract review: batch rfc-026-027 (RFC-2026-026 audit row producer, RFC-2026-027 lifecycle visibility)

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00` |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-rfc-026-027` (PR #174, Draft) |
| Subject head | `e64e1f5459a94d21dc3b090afcd3c924018eaf05` (handoff refresh, alone), over code `31ffab4` and evidence `4916579` |
| Base | `f3e6fbc` (`main`, the merge of #173) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (file name carries the phase date, 2026-10-03) |
| Reviewed in | local branch `review/c0-batch-rfc-026-027`, created at `e64e1f5` in a worktree. The guards that read the branch name were run with the subject branch NAME checked out (`git checkout --ignore-other-worktrees`), then I switched back (§2). |
| Scope | `git diff f3e6fbc..e64e1f5` whole; both RFCs whole; the plan, the disposition and the drafting record; RFC-2026-020/021/022/023/025; ERD §8.4, §8.5, §11.4; `010`, `011`, `105`, `140` where cited. |

This document records review findings. It advances no status, approves nothing, and signs nothing on
anyone's behalf.

## §0 What I am, before anything else

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**, in a git worktree A0's workflow
  created, under a brief A0's workflow wrote. A0 chose the questions I answer.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the
  cross-vendor condition, so that is not by itself a bar; it is still a real limit on independence,
  and both RFCs say so of themselves (RFC-026 §11, RFC-027 §11).
- Whether this file counts as the Reviewer signature RFC-2026-002 requires is for the **Integration
  Owner and the Product Owner** to decide. I do not decide it, and I approve neither RFC: approval is
  the Owner's and A1's act.

## §1 Verdict in one paragraph

The batch is what it says it is: two Proposed decision records, byte-identical to the draft, a
two-path writable amendment, two registrations on the `5856f0b` precedent, +3 line pins, two
appended blocker sentences and one new blocker. Every guard is green on the branch NAME (scope 0,
`check:handoff` 0, `verify` 0 with 684/684), and CI is green on `e64e1f5`. Every commit, plan,
disposition and handoff claim I re-measured is true. **I measured the `lifecycle_state` finding's open
qualification on a fresh cluster and A0's expectation is right**: a targeted `UPDATE ... WHERE id = ...`
to `access_blocked` or `deleted` is refused (`42501`, by the SELECT policy on the new row), and an
`UPDATE` that reads no column moves the owner's workspace to `access_blocked` or `deleted`; the owner
then cannot move it back. MEDIUM is the right grade and it is **not stop-the-line**. I also executed
RFC-2026-027's §3.1/§3.2 in one rolled-back transaction: it works, with no recursion, and its negative
control bites. Against the governing texts the RFCs are consistent in direction, and I found two
MEDIUM text defects that must be fixed **before either RFC is approved**, not before merge: RFC-026's
"twin" policy on `app.security_events` names columns that table does not have (C0-1), and RFC-027's
amendment text to RFC-2026-020 is not exact and would leave RFC-020 contradicting itself (C0-2). Two
LOW and four INFO. **Nothing blocks the merge of this Draft once its role runs report**; nothing is
stop-the-line.

## §2 Measured (re-run by me, Node `v24.20.0` checked before each run)

| What | Command | Exit | Result |
|---|---|---|---|
| review branch | `git checkout -b review/c0-batch-rfc-026-027 e64e1f5` | 0 | created; clean |
| cherry-picks | `git range-diff 5c406de..56ad4bf f3e6fbc..6326183` | 0 | `2917c5c = 7479107`, `56ad4bf = 6326183` (identical patches) |
| RFC bytes | `git rev-parse 2917c5c:<rfc> e64e1f5:<rfc>` | 0 | RFC-026 `43b2037…` both; RFC-027 `ab8e39a…` both: byte for byte |
| scope (review branch) | `node scripts/verify-branch-scope.mjs f3e6fbc WP-0A-DB-00` | 0 | "all 13 changed path(s) are declared, and every amendment explains one" |
| `check:handoff` on the review branch | `npm run check:handoff` | 75 | "no work package declares ownership.branch review/c0-…" — expected: hence the run below on the NAME |
| `check:handoff` on the NAME | `npm run check:handoff` (HEAD `agent/claude/WP-0A-DB-00-batch-rfc-026-027` = `e64e1f5`) | 0 | "describes the branch: nothing substantive after its cited head" |
| scope on the NAME | the same scope command | 0 | 13 paths declared |
| verify on the NAME | `npm run verify` | 0 | "clean: exit 0 — tests 684, pass 684, fail 0" |
| paths at the code commit | `git diff --name-only f3e6fbc 31ffab4` | 0 | 10 (the plan's "all 10" is true) |
| line pins | node: `open_blockers[i]` on line `256+i` for all 196 | 0 | 0 mismatches; 33 `line` pins in the coverage map; every lint change is +3 (word-diff); `(line 412)` = `[156]`, `(line 446)` = `[190]` |
| blocker diff | node: main vs head `open_blockers` | 0 | 195 → 196; `[21]` and `[95]` are **pure appends**; `[195]` is new and last; no other entry changes |
| evidence-commit edit | `git diff --word-diff 31ffab4 4916579 -- work-packages/` | 0 | one phrase of `[195]` ("Read, not executed:" → the qualification), 4 diff lines, no pin moves |
| D1 re-run | every `WP:N` in `retention-map.json` +1, `node --test test-kits/db/foundation-contract.test.mjs` | 1 | 79/80, the retention-map test fails; restored with `git checkout --`, clean |
| D3 re-run | `(line 412)`/`(line 446)` +1, same test | **0** | 80/80: the prose numbers are pinned by no test (A0's INFO is true) |
| D7 re-run | RFC-027 removed from `writable_paths`, scope command | 73 | names `RFC-2026-027-lifecycle-visibility.md`; restored, clean |
| precedent | `git show --stat 5856f0b` | 0 | it touched `scripts/verify-test-coverage-floor.mjs` (+1) and `test-kits/repository-json.test.mjs` (+1) for RFC-025: the precedent is real |
| integrity manifest | node count; diff | 0 | 90 files; two added, three re-digested, nothing else |
| #173 | `gh pr view 173`; `git log -1 f3e6fbc` | 0 | merged 2026-10-04T03:20:26Z, head `04c2a6c`, merge commit `f3e6fbc` (parents `1930f41`, `04c2a6c`) |
| run 37173407430 | `gh run view` | 0 | "Bootstrap validation", success, headSha `04c2a6c` |
| PR #174 | `gh pr view 174` | 0 | Draft, OPEN, base `main`, head `e64e1f5`, check `bootstrap` SUCCESS, body ends with the Generated-with line |
| live DB | 5505, see §2.1 | 0 | migrate-clean 0, rls-smoke 0, two probes |

### 2.1 Live database (one round; justified below)

Nothing the DB layer reads changed in this batch, and I agree with A0 that `make db-migrate-clean` and
`make db-rls-smoke` were not owed **for the diff**. I started a cluster anyway because the handoff's
`reviewer_instructions` and the blocker itself ask the reviewers to measure `[195]`'s qualification
first, and I rely on that measurement for my grading. No migration file was drifted; the probes ran in
transactions that were rolled back.

`/opt/homebrew/bin`, PostgreSQL 17.11; `LC_ALL=C initdb --locale=C -A trust -U postgres`;
`127.0.0.1:5505` only, `-c unix_socket_directories=''`; shim
`db/foundation/ci/supabase-shim.sql` first (0); then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres make db-migrate-clean` → **0** ("post-migrate
pass: 50 apply-time blocks, 38 re-run as written, 12 superseded and replaced"), `make db-rls-smoke` →
**0** ("db-authz-proofs: ok — 6 claim(s) discharged by execution"). Cluster stopped and its directory
removed; 5505 not listening afterwards.

**Probe A, `[195]` (1)** (`probe-lifecycle.sql`, private). Identities via `private.as_user`; every
case one transaction, rolled back; `updated_by` set to the caller so `105`'s restrictive closure is
satisfied and only the lifecycle question is asked.

| case | statement (as the active owner of `workspace_a` unless noted) | result |
|---|---|---|
| P1 | `update … set lifecycle_state='access_blocked' … where id = <a>` | `ERROR 42501 new row violates row-level security policy for table "workspaces"` |
| P2 | the same to `closing` | `UPDATE 1` (so P1's refusal is the SELECT policy's lifecycle term on the new row, not the owner test) |
| P3 | the same to `deleted` | `42501` |
| P4 | `update … set lifecycle_state='access_blocked'` — no WHERE, no RETURNING | `UPDATE 1`; as `postgres`: `a` = `access_blocked`, `b` = `active` |
| P4b | then, as the owner, the same back to `active` | `UPDATE 0` (USING admits only active/closing) |
| P4c | then the owner selects `app.workspaces` | 0 rows |
| P4d | then the owner selects `app.business_profiles` of `a` | **4 rows** (`open_blockers[53]`, live) |
| P5 | no WHERE, to `deleted` | `UPDATE 1`; `a` = `deleted` |
| P6 | no WHERE but `RETURNING id`, to `access_blocked` | `42501` |
| P7 | no WHERE, as `a`'s active admin | `UPDATE 0` |
| P8 | owner of `a`, `where id = <b>`, to `closing` | `UPDATE 0` |

**Probe B, RFC-2026-027 §3.1 + §3.2 executed** (`probe-rfc027.sql`, private; one transaction, rolled
back). The grant, the policy and the helper body exactly as the RFC writes them; the helper stays owned
by `app_authz`. As `a`'s owner: `active` → businesses 4, roster 7, `is_active_member` t (no recursion,
no `42P17`, no stack overflow); `closing` → businesses 4; `access_blocked` → businesses **0**, roster 1
(the owner's own row through `010`'s `workspace_members_select_own_active`, which is Q-027-1's "kept"),
`is_active_member` **f**. Negative control: back to `active` with `workspaces_select_authz_own_open`
dropped → businesses **0**, so the policy is what admits the helper's read (RFC-027 §5/7 holds in this
shape). This discharges nothing for the batch that lands it (RFC-020 §6.2's rule applies to that
batch); it tells this review the RFC is not incoherent.

## §3 Read, not measured

- RFC-2026-022 §5/2 (the confinement spelling), §5/3 (cell predicate AND term, never alone), §5/4, §5/7,
  §5/8 (only `postgres` is in `app_worker`), §7.1/8 (`roleScopedCompleteness`), §7.3 (a), §8 (140's
  cases flip; `private.as_service()` gains a workspace) — each as RFC-026 cites it.
- RFC-2026-019 §4/2 (definer function owned by `app_command` is the only way to be it), §4/3 (worker
  connection open; `SET LOCAL ROLE`); RFC-2026-021 §10 ("no command function exists"); RFC-2026-017 §3
  ("Every use of `app_maintenance` carries a recorded reason"); RFC-2026-016 §5.
- RFC-2026-023 §3.1 (no second identity channel), §3.2 (`acting_user_admits_business/page`, owned by
  `app_authz`, EXECUTE to `app_command` only, membership asked inside), §3.3 (page form), §3.4 ("writes
  its audit row"), §4, §5 (widens the same `app_authz` pin by a third table), §6.
- RFC-2026-020 §5/3, §5/5, §6.1/1-7, §6.2, §6.3/10-14, option D; RFC-2026-025 (merge delegation; neither
  RFC touches it).
- ERD §8.4 `| Audit/security INSERT | N | N | N | N | N | S |` (line 401), §8.5 "lifecycle visibility"
  (line 408), §11.4 diagram and the ten steps (lines 571-600).
- `010_identity.sql` :156-157, :165-167, :403, :481-491 (`:484`), :497-517 (`:500`, `:509-517`), :522,
  :534, :565, :581, :597, :613; `011` :188-189, :211-216, :233-247, :252-256, :257-290, :306-317, :410;
  `021`:757; `105`:49-51; `140`:262, :740-741, :491, `ZZ140`; `scripts/db/run.mjs` :951-953,
  `AUTHZ_TABLE`/`AUTHZ_POLICY`/`AUTHZ_POLICY_QUAL`/`AUTHZ_COLUMN_GRANTS` (2758-2785),
  `identityExpressionLint`; `service-policy-map.json` :135, :138, :143 and their quoted phrases;
  `pinned-grants.json`:221. **All true.**
- RFC-027 §3.3's census: 16 migration files call either helper outside comments and they create 123
  policies (counted) — the "sixteen files … 123 policies" of §8 is true.
- Owner's words: the four quotations in the disposition §1 appear verbatim in the cited dispositions;
  `product-owner-disposition-2026-10-03-batch-150.md` §5 rows Q141-a ("(B) command or worker only, for
  G1 … No audit migration lands before the worker RFC"), Q141-c ("Resistance only until G1; the gap is an
  accepted risk"; A1's acceptance owed) and Q170-a ("Yes"; A1's acceptance owed).

## §4 Answers to the brief's questions

**Consistent with RFC-020/021/022/023/025, ERD §8.4/§11.4 and the Owner's answers?** In direction, yes.
RFC-026 implements Q141-a = B as recorded (command or worker only, no trigger, nothing before the worker
RFC, with Q-026-6 asking rather than inferring whether that binds the command half) and records Q141-c
as a constraint without changing either half (§7). It keeps §8.4's `S` cell a service cell (§4; no
client grant) and RFC-022's CARRIED shape for the worker unchanged. Its command shape depends on
RFC-023, which is in review, and it says so. RFC-027 implements Q170-a (amend RFC-020 so `app_authz` reads
`lifecycle_state`) using §11.4's states with `010`'s own admitted set, as an allowlist. RFC-021 is not
touched (no client grant either way); RFC-025 is not touched. The defects are in text, C0-1 and C0-2.

**Is every citation true?** Every file:line, section and quotation in §3 is true. One reasoning step is
not (C0-4), one count is low (C0-3), and one diagram is condensed (C0-6).

**Is the RFC-020 amendment text in RFC-027 exact?** **No** (C0-2).

**Is the writable-path amendment justified?** Yes. Both Owner answers named it as owed ("the RFC is to be
written in the next batch, after a writable-path amendment"); it adds exactly the two files beside
021-025 (D7 shows the guard refuses without it); the two registrations follow `5856f0b`; the dropped
`test-suite-contract.mjs` declaration is correct (D6 per the plan). That the Author amends its own
manifest without an Integration Owner act is the package's standing pattern and is already held by
`open_blockers[188]`.

**Is the `lifecycle_state` finding correctly graded and owed?** Graded: **yes, MEDIUM**, now measured
(§2.1 P1-P8). Reachable states: every one of the eight by the no-column-read form, only
`active`/`closing` by the targeted form. Effect today: the owner hides their own workspace from every
member and cannot undo it; members' family reads still work (`[53]`); nothing is deleted. It is not a
tenant leak (P8: another tenant's row is not reached), not an irreversible deletion (no purge job;
`postgres` restores the value), not a secret exposure. Owed: **yes**, to Q-026-5/Q-027-5 and to batch
170 — see C0-8 for one refinement. Whether a real client can issue the no-WHERE form through the API
tier (PostgREST's PATCH shape, Supabase's safeupdate) is not measured here (§7).

**Claims in commit messages, plan, disposition, blocker edits and handoff: true?** Yes, for every claim
I re-measured or re-read (§2, §3): cherry-picks clean and identical, bytes identical, 10 paths at
`31ffab4`, +3 pins, 33/19 citations, the four amended files and the `5856f0b` precedent, 684 tests, the
#173 merge facts and run, `[21]`/`[95]` appends, `[195]`'s content and its one-phrase evidence-commit
change, the handoff's head `4916579` and base `f3e6fbc`, Draft PR with the trailer.

## §5 Findings

| ID | Grade | Where | Finding | Remedy | Owner |
|---|---|---|---|---|---|
| C0-1 | MEDIUM | `architecture/decisions/RFC-2026-026-audit-row-producer.md:87-96`, `:111-122`, `:168-186`, `:339-341`; `db/foundation/migrations/140_audit.sql:583-606` | §3.2 proposes "its twin on `app.security_events`" with `causation_id is not null`, and §3.3 a policy "on each audit table" reading `actor_kind`, `actor_id`, `outcome` and `business_profile_id`. `app.security_events` has **no** `causation_id`, `outcome`, `business_profile_id` or `page_context_profile_id`, and its `actor_kind`/`actor_id` are nullable (an unattributed event has no actor). As written, `create policy` on that table fails with an undefined column, and §3.5's field table and §8.2's cases are written for `audit_logs` only. An approval of this text approves an unspecified policy for one of the two tables. | Before approval: state `security_events`' two predicates on its own columns (or scope the RFC to `audit_logs` and hold `security_events` as a question, beside Q-026-4 and `[191]` (7)), and make §8.1/2 and §8.2 name the table each case is for. | A0 (author), A1 (review) |
| C0-2 | MEDIUM | `architecture/decisions/RFC-2026-027-lifecycle-visibility.md:171-185`; `RFC-2026-020-authorization-helper-role.md:3`, `:393`, `:407-411`, `:444-449`, `:476` | The amendment "as text the Owner can accept or refuse" is not exact. (a) It rewrites §5/3's "last paragraph", but the "exactly one policy" sentence it replaces is §5/3's **first** paragraph (`:393`); the last (`:407`) begins "The helper sees no row …". Applied as written, §5/3 would say "exactly one" and "exactly two". (b) "becomes" would delete the rest of the last paragraph (the cross-tenant sentence and "`010` called this an exemption; §7 records why the word was imprecise"). (c) RFC-020's Status line (`:3`, "holds exactly one policy") and §6.3/14 ("`app_authz`'s single policy dropped", `:476`) are not amended, though §3.4 says §6.3 is unchanged. (d) §6.1/5 gets a description, not text. (e) The new §6.1/6 drops "Column-scoped, so it cannot read `token_hash` or any other table." without saying whether the sentence goes or is restated. | Before approval: quote each RFC-020 sentence that changes (Status line, §5/3 paragraph 1 and its last paragraph, §6.1/5, §6.1/6, §6.3/14) with its exact replacement, and say what happens to the sentences not reproduced. | A0 (author); A1 Identity (RFC-020's author) |
| C0-3 | LOW | `RFC-2026-026-audit-row-producer.md:54-60`, `:280-281` | §5.5: "today three audited actions are client writes (§2/5)". The coverage map's `admin.workspace_update` (tables `app.workspaces`, `app.workspace_settings`) is also a client write today (`010_identity.sql:403` grants `name`; `workspace_settings_update_owner` at `:534`), as is `role.membership_or_scope_change` through invitations. The count understates the §5.5 revocations owed. | Replace the count with the coverage-map rows that are client writes today, by id. | A0 |
| C0-4 | LOW | `RFC-2026-026-audit-row-producer.md:98-102` | "`CTR-JOB-001` carries a full `CTR-TEN-001` `tenant_context` on every job (required), so the worker always has a causation id to give." `causation_id` is **optional** in `CTR-TEN-001` (required: `workspace_id, actor, request_id, correlation_id, locale, timezone`). The conclusion holds through `job_id` (required in `CTR-JOB-001`), which §3.5 already names. | Ground the sentence on `job_id`, not on `tenant_context`. | A0 |
| C0-5 | INFO | `RFC-2026-026-audit-row-producer.md:401`; `RFC-2026-027-lifecycle-visibility.md:317`; `work-packages/WP-0A-DB-00.json:451` | `[195]`'s qualification is now measured and A0's expectation is right (§2.1). The RFC questions still read unqualified, and Q-027-5's "out irreversibly" overstates it: the lock-out is not reversible **by the client**, today (P4b) as after RFC-027, but a service-side write restores it. | In the RFC review round, qualify Q-026-5/Q-027-5 with the measured forms and replace "irreversibly" with "irreversibly by any client". Record this measurement on `[195]` by appending, not rewriting. | A0 |
| C0-6 | INFO | `RFC-2026-027-lifecycle-visibility.md:44-49`; ERD line 585 | The diagram shown as §11.4's is condensed and omits `Verify --> PurgeQueued: partial failure retry`. The conclusion (no edge from a blocked state back to `closing`/`active`) still holds. | Quote the diagram whole, or say it is condensed. | A0 |
| C0-7 | INFO | `evidence/WP-0A-DB-00/a0-batch-rfc-026-027-plan-2026-10-03.md` §2 D3 | D3 (prose `(line N)` in two `source` texts pinned by no test) is true; it is held in the plan and the handoff's limitations, not in a blocker. | Either pin it (A0 tooling) or append it to `[195]` so it outlives the handoff. | A0 |
| C0-8 | INFO | `work-packages/WP-0A-DB-00.json:451` | `[195]` owes the revoke to "RFC-2026-027's forward migration". The revoke needs nothing RFC-027 decides, and the hole is live on `main` now (P4/P5). Binding it to RFC-027 makes the fix wait for an approval of an unrelated design. | When Q-026-5 is answered "revoke", let the revoke land in the first batch-170 migration whether or not RFC-027 is approved by then; keep it in the same migration only if both arrive together. | Owner + A1 (Q-026-5), A0 |

## §6 Stop-the-line verdict

**No stop-the-line.** No secret exposure, tenant leakage, duplicate external side effect, lost job,
migration divergence, irreversible deletion or contract mismatch is introduced: the batch changes no
migration, policy, grant or pin, and nothing the DB layer reads. The pre-existing `lifecycle_state`
hole (`[195]` (1)) is measured as own-tenant, owner-only, value-restorable by a service-side write, with
no deletion path; I agree with A0's reading that it is MEDIUM and not stop-the-line.

**Does anything block the merge?** Not from this review. C0-1 and C0-2 block **approval** of the RFCs,
not the merge of Proposed records (RFC-2026-023 is on `main` in review on the same footing). The merge
still needs the other role runs (A1, Q0), and Integration Owner evidence remains owed (`[188]`); this
file does not decide whether A0 may press the merge under the standing delegation.

## §7 Limits

- One live round, not two; no migration drift was appended to `140_audit.sql` because none was owed.
- The probes ran as `authenticated` through `private.as_user` in `psql`, not through PostgREST. Whether
  the API tier can issue the no-WHERE, no-RETURNING `UPDATE` (PostgREST's PATCH shape; Supabase's
  `safeupdate`) is not measured, so the finding's reachability through the real client path may be
  narrower than "an owner can".
- Probe B executes RFC-027's text once, on the fixture; it is not RFC-020 §6.2's execution for the
  batch that lands §4 (no `EXPLAIN`, no six-state matrix, no write cases).
- I did not re-run D2, D4, D5, D6 or D8; I re-ran D1, D3 and D7.
- I read the drafting record for the claims the plan relies on, not line by line.
- Private artefacts (not in the repository), under the scratchpad's `c0-rfc-026-027/`: both probe files
  and logs (`probe-lifecycle.log` sha256 prefix `b6dcc3e4da202863`, `probe-rfc027.log`
  `2819aed1de4be45e`), the migrate, smoke, verify, check:handoff and drift logs, and `main`'s manifest
  copy. The cluster directory was removed.
