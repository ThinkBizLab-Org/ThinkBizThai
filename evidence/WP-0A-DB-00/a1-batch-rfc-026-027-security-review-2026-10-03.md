# A1 security review: batch rfc-026-027, the audit row producer and lifecycle visibility, Proposed

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-026-027` (PR #174, Draft, open, not merged),
  head `e64e1f5` (`e64e1f5459a94d21dc3b090afcd3c924018eaf05`) over code `31ffab4`
  (`31ffab43ae7bed54878706655a840b50edffdad9`), base `f3e6fbc` (main). Author `/claude/a0_atlas`.
- **Checked out as:** local branch `review/a1-batch-rfc-026-027` at `e64e1f5`, in this run's own worktree.
  The branch name itself is checked out in other worktrees, so for `verify`, `check:handoff` and branch
  scope I made a local clone in my private directory (`a1-rfc-026-027/repo`), created
  `agent/claude/WP-0A-DB-00-batch-rfc-026-027` there at `e64e1f5` (`git rev-parse --abbrev-ref HEAD`
  printed that name) and measured on that name, not detached. I committed nothing in the clone.
- **Status:** this file records findings. It advances no status, approves nothing (neither RFC, nor any
  question of RFC-026 §10 or RFC-027 §10), and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch. I am the same
vendor and model family as the Author and as the drafter of both RFCs. Under RFC-2026-024 that is the
stated independence limit of this role run. Accepting this review as the A1 role's signature is the
Integration Owner's and the Product Owner's act, not mine. RFC-026 and RFC-027 both name A1 as the
reviewer whose acceptance is owed; this file is input to that acceptance, not the acceptance.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-rfc-026-027-plan-2026-10-03.md` and the disposition
`product-owner-disposition-2026-10-03-batch-rfc-026-027.md`, both in full; both RFCs in full; all five
commit messages `f3e6fbc..e64e1f5`; `git diff f3e6fbc..e64e1f5` (manifest: branch slot, writable paths,
amendments, rationale, blockers 21, 95 and 195 in full; the two lint files by script; the three test-kit
and script hunks; the handoff in full); and the code the RFCs cite: `010_identity.sql` (`:150-170`,
`:395-430`, `:475-620`), `011_authorization_helpers.sql` (`:175-320`), `105_updated_by_on_update_is_caller.sql`
(the closure and its block), `140_audit.sql`'s table, grants and triggers (through the catalog),
`pinned-grants.json:219-222`.

**Measured.** Node `v24.20.0` (`node -v` printed before every measured run; the PATH default is a
different Node and was never used). PostgreSQL 17.11 from `/opt/homebrew/bin`, port **5501** on
`127.0.0.1` only, `unix_socket_directories=''`, `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`,
re-initdb before every round, shim first. The cluster was stopped and its data directory removed at the
end; nothing listens on 5501. No other port was touched.

| command | where | exit | result |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs f3e6fbc WP-0A-DB-00` | clone, on the branch name | **0** | "all 13 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | clone, on the branch name | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | clone, on the branch name | **0** | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |
| round r1: shim, `make db-migrate-clean`, `make db-rls-smoke` | worktree at `e64e1f5`, 5501 | 0, **0**, **0** | "post-migrate pass: 50 apply-time blocks, 38 re-run as written, 12 superseded"; "db-authz-proofs: ok — 6 claim(s) discharged by execution" |
| round r2: shim, `make db-migrate-clean`; then `lifecycle-probe.sql`, `lifecycle-probe-2.sql`, `rfc027-probe.sql` (baseline) | 5501 | 0, 0 | §2, §4.1 |
| round r3: shim, `make db-migrate-clean`; then `rfc027-apply.sql`, `rfc027-probe.sql`, `rfc027-negctl.sql` | 5501 | 0, 0 | §4 |
| round r4: shim, `make db-migrate-clean`; then `rfc026-proto.sql` | 5501 | 0, 0 | §3 |
| drifts D1, D2, D3 re-run (`node --test test-kits/db/foundation-contract.test.mjs`) | clone | 1, 1, **0**; undrifted 0 | D1 "the retention map has one row per table …" 79/80; D2 "batch 141 prep: the audit coverage map …" 79/80; D3 80/80 (A0's result reproduced) |
| line pins, by script | worktree | — | main: every `open_blockers[i]` on line 253+i (195 entries, 0 misses); head: 256+i (196, 0 misses); 33 `line` pins each exactly +3 from main; 19 retention citations all `256+i`; both `source` texts `(line 412)`/`(line 446)` = 256+156 / 256+190 |
| RFC bytes | worktree | — | `git rev-parse` of both RFC blobs at `2917c5c` and `e64e1f5` identical (`43b2037…`, `ab8e39a…`) |
| PR and CI facts | `gh` | — | #173 merged 2026-10-04T03:20:26Z, merge commit `f3e6fbc` (parents `1930f41`, `04c2a6c`); run 37173407430 "Bootstrap validation" success on `04c2a6c`; #174 Draft, open, head `e64e1f5`, check `bootstrap` SUCCESS, body ends with the Generated-with line |

**How the designs were measured, and one deviation from the brief.** The brief's drift method is to
append a drift to `140_audit.sql`, re-run `make db-migrate-clean`, and restore the file. I did **not**
do that for the two RFC prototypes: RFC-027's policy makes `011`'s apply-time "exactly one policy" block
false in the post-migrate pass, so migrate-clean would have refused before any probe ran, measuring the
pin rather than the design. Instead each prototype was applied by `psql` to a freshly migrated scratch
cluster, after `make db-migrate-clean` exited 0, inside a transaction that was rolled back (RFC-026) or
on a cluster that was then destroyed (RFC-027). No repository file was edited for any measurement; `git
status` of this worktree was clean until this file was written. The SQL files and their logs are in the
private directory (§7). RFC-2026-023's `app.acting_user_admits_business` does not exist; the RFC-026
prototype used `app.is_active_member(workspace_id)` in its place in the `succeeded` arm (the membership
half of the same question, without the scope half).

## 2. The `lifecycle_state` finding (`open_blockers[195]` (1)): measured

`lifecycle-probe.sql`, round r2. Synthetic owner O owns W1 and W2, is an editor of W3; P owns W4 (another
tenant); M is an editor of W1. As `authenticated` with O's claims, each form was tried for each of the
eight states and rolled back to a savepoint after each attempt.

| form | `active`, `closing` | the six other states |
|---|---|---|
| `update … set lifecycle_state = s, updated_by = O where id = W1` | admitted, 1 row | **42501** "new row violates row-level security policy for table \"workspaces\"" |
| `… returning id` (no `WHERE`) | admitted | **42501** |
| `set lifecycle_state = case when id = W1 then s else lifecycle_state end` (no `WHERE`) | admitted | **42501** |
| PostgREST-shaped `with pgrst_source as (update … where id = W1 returning 1) select count(*)` | admitted | **42501** |
| `update … set lifecycle_state = s, updated_by = O` (no `WHERE`, no `RETURNING`) | admitted, 2 rows | **admitted, 2 rows: W1 and W2 both move; W3 (editor) and W4 (other tenant) untouched** |
| `with … (update … returning 1) select count(*)`, no filter (`lifecycle-probe-2.sql`) | — | **admitted**: W1 (`active`) and W2 (`closing`) both moved to `deleted` |

So A0's unmeasured expectation is **true**, and its conclusion "either way the state is reachable" is
**true**: PostgreSQL applies `workspaces_select_active_member` to the new row whenever the statement reads
any column of the table (in `WHERE`, `RETURNING` or a `SET` expression), which refuses a blocked new
state; an `UPDATE` that reads no column is not checked against the SELECT policy and moves every
workspace the caller owns. `RETURNING` a constant reads no column.

After the unfiltered form moved W1 and W2 to `access_blocked`: O's `UPDATE … set lifecycle_state =
'active'` changed **0** rows (O cannot undo it); O sees 1 workspace (W3); M sees no W1 row. **But
`app.is_active_member(W1)` was still true for O and for M, and in the baseline run of
`rfc027-probe.sql` (r2) the owner still read W1's businesses and still INSERTed a Business into W1 in
every one of the six blocked states.** Today, then, the effect is that the workspace row disappears from its
members and its owner; the families stay readable and writable through the helper (and `010`'s settings
and invitation policies carry no lifecycle term at all).
That is `open_blockers[53]`/`[95]`, unchanged, and it confirms the blocker's "Effect TODAY" sentence.
`active` → `closing` → `active` by a targeted update is admitted, with no step-up.

**Grade: MEDIUM, confirmed.** It is pre-existing on main since batch 010; this batch records it and
introduces none of it.

**Stop-the-line: NO, for this batch and today.** Measured: the actor is only the workspace's own active
owner; no other tenant's workspace moved (W4 untouched, W3 untouched although O is a member of it); no
row is deleted, because no job reads `lifecycle_state` (grep: no non-comment reference outside `010` in
any migration; no worker or purge code exists in the tree). A0's reading is right.

**Two conditions under which it becomes stop-the-line, which the blocker should say (finding F1-b
below):** (a) RFC-2026-027's gate landing without the revoke (an unrecoverable lock-out of every member,
measured in §4: after the gate, every family refuses every member in all six states); and (b) **any
purge, retention or deletion job that selects workspaces by `lifecycle_state`** (batch 160's work). With
(b), an owner's one unfiltered `UPDATE … set lifecycle_state = 'purge_queued'` skips step-up and the
`DATA-DEC-04` recovery window and leads to irreversible deletion, which `CONTRIBUTING_AGENTS.md` names
as a stop-the-line incident. `open_blockers[195]` names (a) and owes the fix to RFC-027's migration; it
does not name (b).

## 3. RFC-2026-026: can a client forge, suppress or misattribute an audit row?

Prototype `rfc026-proto.sql`, round r4: `grant insert on app.audit_logs to app_command`, `EXECUTE` on
`app.jwt_subject()` to `app_command`, the §3.3 `FOR INSERT TO app_command` policy, and a command
function owned by `app_command` written to §3.4's shape (the action and its `succeeded` audit row in a
`BEGIN … EXCEPTION WHEN insufficient_privilege` block; the handler inserts a `denied` row and
**returns**). Results:

| case | result |
|---|---|
| 1 own workspace, owner | `succeeded`; one action row and one audit row, actor = the claims' subject |
| 2 another tenant's workspace W4 | **`denied` returned, and a `denied` row with `workspace_id = W4` and O's actor id is in W4's log** |
| 3 a workspace id that does not exist | **`denied` row with `workspace_id = deadbeef-…` stored** (no foreign key, `open_blockers[32]`) |
| 4 client-chosen ids | **`request_id = 'forged-request-id'`, `correlation_id = 'someone-elses-correlation'` stored as given** |
| 5 `succeeded` audit row violates a CHECK (`audit_logs_reason_key_form`) | the call raises (23514), and the action row is absent afterwards: **fail-closed holds** |
| 6 a command inserting another user as actor | **refused**, "new row violates row-level security policy for table \"audit_logs\"" |
| 7 no claims | **refused** by the same policy |
| 8 a command writing `succeeded` into W4 | **refused** by the policy |
| 9 a command writing `denied` with a business id from another tenant, never validated | **admitted** |
| 10 `EXECUTE` on `app.jwt_subject()` revoked from `app_command` | "permission denied for function jwt_subject" (the function body calls it too, so this does not isolate the policy's own need; RFC-026 §11's claim stays partly reasoned) |

**Forgery of the actor: bounded as claimed** (cases 6, 7, 8): a command cannot name another user, cannot
write without claims, cannot write `succeeded` where the caller is not a member. The residual is wider
than §3.3/1 states (F2-e): the binding reads a session setting, so any session that can both set
`request.jwt.claims` and execute a command function writes as any user.

**Misattribution of scope: not bounded on refusal rows** (cases 2, 3, 9): F2-a and F2-b.

**Suppression: fail-closed for actions, measured** (case 5). Two narrower routes remain (F2-c, F2-f):
an audit-write refusal can be recorded as a user denial, and a denial row is lost if the client controls
the transaction's end.

**No trigger, no third role:** `app.audit_logs` has only `140`'s refusal triggers and no policy today
(`\d app.audit_logs`, r4); the design adds none. Agreed.

## 4. RFC-2026-027: is the set complete, can the new read recurse or widen, does any family escape?

`rfc027-apply.sql` (§3.1's grant and policy, §3.2's helper body, owner restated) applied to round r3;
probes `rfc027-probe.sql` and `rfc027-negctl.sql`.

1. **The blocked-state set is complete, measured.** The CHECK has eight values; for an owner and an
   editor of W1 in each of the eight: `active` and `closing` — `is_active_member` true, role returned,
   businesses 1, owner's INSERT admitted; each of `access_blocked`, `purge_queued`, `held`, `purging`,
   `verify`, `deleted` — `is_active_member` false, role null, businesses 0, INSERT refused 42501, roster
   0 except the member's own row (`workspace_members_select_own_active`, Q-027-1's "kept"). The helper is
   an allowlist, so a ninth state is refused until admitted. Complete.
2. **No recursion, measured.** Every query above, the roster (whose policy calls the helper on the table
   the helper reads), and `EXPLAIN (VERBOSE)` of `business_profiles` ran without `42P17` or a stack
   error; the plan keeps `app.is_active_member(business_profiles.workspace_id)` as a call, so §6.2/9's
   not-inlined property holds for the new body. RFC-027 §7.2 (a) and (b): discharged here once, on a
   scratch cluster; still owed to `authz-proofs.mjs` in the batch that lands §4.
3. **No widening, measured.** As `app_authz` with O's claims, `count(*)` on `app.workspaces` is 1 (O's
   one open workspace); `select name` is refused, "permission denied for table workspaces" (column-
   scoped). The only functions `authenticated` can execute that are `SECURITY DEFINER` are the two
   helpers; neither returns a lifecycle value. **Negative control:** with
   `workspaces_select_authz_own_open` dropped, the owner of an `active` W1 gets `is_active_member` false,
   roster 1, businesses 0, so the policy is what admits the helper's read (RFC-027 §5/7 bites).
4. **No family escapes the helper, measured on the head's migrated catalog (rounds r2 and r4, before
   any prototype was applied or after it was rolled back).** `app` holds 91 permissive
   policies for `authenticated`; exactly 10 call neither helper, all in `010`:
   `user_profiles_select_own`, `_update_own`, `workspace_invitations_select_owner`, `_insert_owner`,
   `_update_owner`, `workspace_members_select_own_active`, `workspace_settings_select_active_member`,
   `_update_owner`, `workspaces_select_active_member`, `_update_owner`. That is RFC-027 §3.3's residual
   table exactly. Every other non-helper policy is RESTRICTIVE (it can only narrow). No table or view in
   `app`, `private` or `public` that `authenticated` can read or write has row security off. RFC-027's
   claim holds for the tree as it is; it is not held by any rule for the next family (F3-a).
5. **One accepted disclosure, INFO:** after the gate, `is_active_member` tells a member whether *their
   own* workspace is blocked (with their own membership row still visible, Q-027-1). That is the intent
   of Q-027-1 and reveals nothing about another tenant (`other_ws_member` false in every row).

## 5. Findings

Grades: CRITICAL / HIGH / MEDIUM / LOW / INFO. None is stop-the-line. None is in the diff's code: the
diff changes no migration, policy, grant or lint rule. F1 is pre-existing on main; F2 and F3 are about
Proposed text and must be settled before either RFC is approved, not before this PR merges.

| id | grade | finding | where | remedy, and owner |
|---|---|---|---|---|
| F1-a | **MEDIUM** (confirmed) | An owner moves every workspace they own into any of the eight states with one unfiltered `UPDATE`; the targeted forms are refused for the six blocked states; the owner cannot undo it; active ↔ closing needs no step-up (§2) | `010_identity.sql:403`, `:509-517`; `pinned-grants.json:221` | Revoke `UPDATE (lifecycle_state)` from `authenticated` (Q-026-5/Q-027-5) and move the pin in the same diff. **The isolation case must use the unfiltered form**: a case asserting only that `… where id = …` is refused passes today, with the gap open. Owner + A1 decide; A0 writes |
| F1-b | **MEDIUM** | `open_blockers[195]` names RFC-027's gate as the point where the finding becomes irreversible, but not a purge or retention job that reads `lifecycle_state`, which would turn it into irreversible deletion skipping the recovery window | `open_blockers[195]` (1) | Add to the entry: the revoke is a **precondition of any job that selects by `lifecycle_state`** (batch 160) as well as of RFC-027's gate; whichever lands first carries it. A0 |
| F2-a | **MEDIUM** (design, measured on a prototype) | §3.3/3's refusal arm lets **any authenticated client, through a command written correctly to §3.4**, append `denied` rows into any `workspace_id`: another tenant's, or one that does not exist. The store is append-only and `refuse_mutation` makes the rows undeletable. Q-026-1 frames this as the cost of a *defective* command; measured, it is the designed path for client input | RFC-026 §3.3 (3), §3.4, §10 Q-026-1; prototype cases 2, 3 | Before approval: either require `app.is_active_member(workspace_id)` (or the workspace's existence through a definer helper) for every `audit_logs` row, and record a refusal against a workspace the actor cannot reach as a `security_events` row in the actor's own scope; or keep the arm and state the cross-tenant append and its volume bound (rate limit at the server tier) in the RFC. Re-word Q-026-1. A1 (owner of the question), A0 (the RFC) |
| F2-b | **LOW** | The policy does not hold §3.6's rule for refusal rows: a `denied` row with an unvalidated business id from another tenant is admitted | RFC-026 §3.3 policy, §3.6; prototype case 9 | Add to the `WITH CHECK`: `outcome = 'succeeded' or (business_profile_id is null and page_context_profile_id is null) or <acting-user helper admits the scope>`. A0 |
| F2-c | **LOW** | A policy refusal of the `succeeded` audit row raises 42501 (`insufficient_privilege`, the SQLSTATE every RLS `WITH CHECK` refusal in §2 and §3 carried). A handler that catches `insufficient_privilege` to record the command's own denials records an *audit-write failure* as a *user denial*. The action still rolls back (fail-closed holds), but the outcome is misattributed | RFC-026 §3.4 | §3.4 should require the `succeeded` audit `INSERT` outside the exception block, or the command's own refusals to raise a dedicated SQLSTATE the handler catches by name; add an §8.2 case: the audit row refused by policy → the call raises and no `denied` row exists. A0 |
| F2-d | **INFO** | The command's `request_id` and `correlation_id` are client-chosen when the command function is reachable by RPC (case 4). §3.5 already calls them untrusted; §5.1 uses the same property as a reason against option A | RFC-026 §3.5, §5.1 | Say in §5.1 that B has the same property for these ids unless command functions are called only by the server tier. A0 |
| F2-e | **INFO** | The actor binding reads `request.jwt.claims`, a setting any session can set. Any role that can set it and execute a command function writes as any user. §3.3/1 names only "a function that rewrites the claims" | RFC-026 §3.3 (1), §8.1 | Add a static obligation: `EXECUTE` on every command function is held by `authenticated` alone, never `app_worker`, `app_maintenance` or `service_role`; record the residual in §11. A0, A1 |
| F2-f | **INFO**, not measured | A denial row is lost if the client controls the end of the transaction (a direct connection, or PostgREST with `db-tx-end = commit-allow-override` and `Prefer: tx=rollback`). Only refusal records are lost; no action commits | RFC-026 §3.4, Q-026-4 | Record under Q-026-4; pin `db-tx-end = commit` in the deployment's configuration when it exists. A1 |
| F2-g | **INFO** | The worker's `causation_id is not null` proves presence, not that the id names a real job; the worker's actor is free (Q-026-8). RFC-026 §3.2 already says this is containment, not isolation | RFC-026 §3.2 | None beyond Q-026-8; keep the sentence. — |
| F3-a | **LOW** | "No family escapes the helper" holds on the tree today (§4.4) but no rule holds it for the next family: a new permissive `authenticated` policy that joins `workspace_members` directly would be silently ungated | RFC-027 §6 | Add a static obligation to §6: every permissive `authenticated` policy on a workspace-scoped table outside `010`'s pinned list calls `app.is_active_member` or `app.workspace_member_role`. A0 (owner of `scripts/db/run.mjs`) |
| C1 | **INFO** | `31ffab4`'s message says the 33 pins "and two source texts" are "checked by the static suite"; D3 (A0's, and mine) shows the two `source` texts are checked by no test. The plan §2 and the handoff say it correctly | commit `31ffab4` message | None needed in history; the plan and handoff are the record. — |

## 6. Are the claims true?

Checked against the tree, the catalog, git and GitHub:

- **TRUE:** branch from `f3e6fbc`; `7479107`, `6326183` cherry-picked; RFC texts byte-identical to the
  draft (blob ids equal); `31ffab4` moves the branch slot in the manifest and both rows of
  `branch-identity.test.mjs`; the rationale names the four amended files and why, drops
  `test-suite-contract.mjs`, keeps and re-explains `branch-identity`; `VERIFICATION.md` untouched and
  the suite is 684; line pins at 256+i (+3 from main, −1 from the draft), 33 + 2 + 19 re-derived; blocker
  21 and 95 each gain one paragraph saying the RFC is written, Proposed, not approved; `open_blockers[195]`
  appended at the end with the finding (MEDIUM, file:line, A0's not-stop-the-line reading put to the
  reviewers, fix owed to RFC-027's migration under Q-026-5/Q-027-5) and all fourteen questions with owners
  and the cross-references `[21] [29] [32] [33] [95] [113] [150] [191]` (2)(6) without copying text; plan
  and disposition contents as reported; the disposition records #173's merge (`f3e6fbc`, head `04c2a6c`,
  run 37173407430 green) as A0 executing the delegation; no new Owner words; the fourteen questions
  UNANSWERED with a recommendation each; the handoff is last and alone, cites `4916579`, base `f3e6fbc`,
  and `check:handoff` exits 0 on the branch name; push was not forced (PR head equals the branch); Draft
  PR #174 open with the Generated-with line; not merged.
- **TRUE, and now measured:** `open_blockers[195]`'s qualification (§2). A0 expected it unmeasured; it holds.
- **TRUE:** "nothing the DB layer reads changed" (only `foundation-contract.test.mjs` reads the two lint
  files; round r1's migrate-clean and rls-smoke both exit 0 at `e64e1f5`).
- **Wording only:** C1.

## 7. Verdict

- **Stop-the-line: NO.** The diff adds two Proposed decision records, registrations, line pins and
  blocker text; no migration, policy, grant or role changes. The one live security defect it records
  (F1-a) is pre-existing, confined to an owner's own workspaces, deletes nothing today, and was measured
  so. I agree with A0's reading, with the two conditions of §2 (F1-b).
- **Nothing in this diff blocks the merge** from the Security/Privacy side.
- **What blocks approval of the RFCs** (not this merge): F2-a must be decided before RFC-026 is approved;
  F2-b and F2-c should be written into RFC-026 before its command half lands; F3-a into RFC-027 before
  its migration; F1-a's revoke before RFC-027's gate or any job reading `lifecycle_state`, whichever is
  first (F1-b).
- My answers to the questions A1 owns are not given here; this file supplies the measurements.

## 8. Limits

- Same vendor and model family as the Author (§0).
- The RFC prototypes are my code on a scratch cluster, not the batches that will land. RFC-023's helper
  was substituted (§1). PostgREST was not run: the PostgREST-shaped statements in §2 are SQL I wrote in
  its shape, and F2-f is reasoned.
- Supabase's `storage` schema and Realtime are not in the shim; §4.4's census covers `app`, `private` and
  `public` only.
- I did not re-run A0's drifts D4–D8; I relied on `verify-branch-scope` and `npm run verify` at the head.
- Private artefacts (not in the repository), under the scratchpad directory `a1-rfc-026-027/`:
  `round.sh`, `drift.sh`, `lifecycle-probe.sql`, `lifecycle-probe-2.sql`, `rfc027-apply.sql`,
  `rfc027-probe.sql`, `rfc027-negctl.sql`, `rfc026-proto.sql`, every round's logs (`r1`–`r4`), the drift
  logs `D0`–`D3`, `verify.log`, `handoff.log`, and the clone `repo/`.
