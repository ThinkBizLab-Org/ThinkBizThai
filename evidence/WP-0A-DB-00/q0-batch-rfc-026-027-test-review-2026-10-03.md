# Q0 independent test of batch rfc-026-027 (PR #174)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-026-027`. The head is `e64e1f5`, the handoff refresh, alone. Below it are
the evidence commit `4916579` and the code commit `31ffab4`, over the cherry-picked draft `7479107` and `6326183`. The base is
`f3e6fbc` (`main`). **Author:** `/claude/a0_atlas`.
**PR:** <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/174>, Draft and OPEN, head `e64e1f5`. I read the PR with
`gh pr view 174`: the required check "bootstrap" (run 37174834595) is SUCCESS on `e64e1f5`.
**Tested on:** my own branch `review/q0-batch-rfc-026-027`, created at `e64e1f5`.
**Date:** 2026-10-04. The file name carries the phase's date (2026-10-03), as the batch's own plan and disposition do.

This record holds findings. It advances no status, approves nothing, test-verifies nothing on anyone's behalf, and decides
nothing that the Integration Owner, A1 or the Product Owner holds. It repairs nothing it found.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and I am the same vendor and model family as the Author.
A0 wrote my brief, chose the questions, the port and the output file, and wrote the change under test. My independence is
the independence `RFC-2026-024` describes, and no more. Whether this record counts as the Tester role's signature is for the
Integration Owner and the Product Owner to decide, not me.

I made every mutation in my own worktree. I saved each touched file to my private directory first and restored it from that
copy afterwards, and I checked each restore by sha256. `140_audit.sql` read `2ac596bb950e8dfb…` before and after its drift.
`git status --porcelain` was empty before I wrote this file. Nothing was pushed.

## 1. Measured versus read

**Setup for every measured run:**

- Node `v24.20.0`, from `/Users/bank/.local/node-v24.20.0/bin/node`, checked with `node -v` before each run. A Node 26 on PATH
  was never used.
- PostgreSQL 17.11 from `/opt/homebrew/bin`.
- A fresh `initdb --locale=C -A trust -U postgres` for every round, on 127.0.0.1:**5503** only, TCP only
  (`-c unix_socket_directories=''`), with `LC_ALL=C`. The shim `db/foundation/ci/supabase-shim.sql` ran first.
- `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`.
- Private directory `scratchpad/q0-rfc-026-027/`. I did not touch 5432, 5499 or any other run's port. The cluster was
  stopped and its data directory removed at the end (`pg_isready -p 5503`: no response).

**Measured:** the repository commands on the branch name (§1.1); the database layers (§1.2); the `lifecycle_state` finding
on a fresh cluster (§2); a prototype of RFC-2026-027 §3.1 and §3.2 under six mutations (§3.2); every moved line pin, plus six
citation mutations (§4); and A0's drifts D4 to D8 reproduced (§4).

**Read, not executed:** RFC-2026-026's mechanism claims (§3.1). They depend on a command function and a worker identity that
do not exist. I checked the claims in the commit messages, the plan, the disposition, the blocker edits and the handoff
against the tree and git (§5). I did not read the Thai source documents beyond the §11.4 lines the blocker cites.

### 1.1 Repository commands, on the branch NAME

The branch is checked out in A0's worktree. So I checked out the name `agent/claude/WP-0A-DB-00-batch-rfc-026-027` in my own
worktree with `git checkout --ignore-other-worktrees`. `git rev-parse --abbrev-ref HEAD` printed that name, and HEAD was
`e64e1f5`. I ran the three commands below and committed nothing. `git status` was clean afterwards, and I switched back to
`review/q0-batch-rfc-026-027` at the same commit.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs f3e6fbc WP-0A-DB-00` | 0 | "all 13 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |

The plan's "all 10 changed path(s)" was measured at `31ffab4`. The 13 here also count the three evidence files that came after
it, so the two numbers are consistent.

### 1.2 The database layers on the branch as built

A0 ran neither layer, because nothing the database reads changed. I ran both once as a baseline. I needed the cluster anyway.

| Round | Command | Exit | Output |
|---|---|---|---|
| r1 | `make db-migrate-clean` | 0 | "post-migrate pass: 50 apply-time blocks, 38 re-run as written, 12 superseded and replaced"; then the §2 probe on this database |
| r2 (fresh) | `make db-migrate-clean` | 0 | the same |
| r2 | `make db-rls-smoke`, run twice on the same database | 0, 0 | "1079 isolation case(s) passed"; "db-authz-proofs: ok — 6 claim(s) discharged by execution" |
| r3 (fresh) | RFC-2026-027 §3.1+§3.2 appended to `140_audit.sql` as a drift, then `make db-migrate-clean` | 2 | §3.2 below; `140_audit.sql` restored byte for byte |

## 2. The `lifecycle_state` finding (`open_blockers[195]` (1)), re-measured

**Setup.** On the r1 database, as `postgres`, I created four synthetic workspaces. U1 owns W1 and W2. U2 owns W3, and U1 is an
active editor of W3. U2 alone owns W4. Every probe ran as `set local role authenticated`, with `request.jwt.claims` set to
U1's `sub`, inside its own transaction, rolled back. Each UPDATE also set `updated_by` to U1, as 105's restrictive closure
requires. Script and log: `lifecycle-probe.sql` and `lifecycle-probe.log` in the private directory.

| # | Statement as U1 | Result |
|---|---|---|
| P1 | `update … set lifecycle_state = 'access_blocked' … where id = W1` | **ERROR 42501** "new row violates row-level security policy for table \"workspaces\"" |
| P2 | the same, but to `'closing'` | UPDATE 1 (the new row is still SELECT-visible) |
| P3 | the same, but to `'deleted'` | **ERROR**, the same message |
| P4 | no WHERE, with `returning id` | **ERROR**, the same message |
| P5 | no WHERE, `set lifecycle_state = case when id = W1 then … end` (reads a column in SET) | **ERROR**, the same message |
| P6 | `… where true` (a WHERE that reads no column) | **UPDATE 2** |
| P7 | no WHERE, no RETURNING, to `'access_blocked'` | **UPDATE 2**: W1 and W2 are `access_blocked`, and W3 (U1 is an editor) and W4 are `active`. U1 then tries to set them back: **UPDATE 0**. U1 sees only W3 in `app.workspaces`, but `app.is_active_member(W1)` is still **true** and `workspace_member_role(W1)` is still `owner` (the `[53]` gap). |
| P8 | no WHERE, to `'deleted'` | UPDATE 2: W1 and W2 are `deleted` |
| P9 | no WHERE, to `'held'` | W3 (where U1 is not the owner) is untouched |

**Verdict.** A0's unmeasured expectation is **correct**. The SELECT policy checks the new row whenever the UPDATE reads a
column of the table (a WHERE, a RETURNING, or a SET expression). So a targeted move to a blocked state is refused. An UPDATE
that reads no column moves **every** active or closing workspace the caller owns, to any of the eight states, and to nothing
the caller does not own. The owner cannot move a workspace back. The members lose the workspace row, but they still pass the
membership helper, so family rows stay readable today (`[53]`, `[95]`). In a single-user Pilot, where the owner owns one
workspace, the untargeted form *is* the targeted one.

**Grade.** I agree with MEDIUM. **Stop-the-line:** I agree with A0's reading that it is **not**. The finding involves no
other tenant: the actor can reach only workspaces they own as an active owner (P9). It deletes nothing: no purge job exists.
It exposes no secret. What it does is a self-inflicted, unaudited lock-out of the owner's own workspace row, recoverable by a
service-side write. That is a correctness and audit gap. It is not one of CONTRIBUTING_AGENTS.md's stop-the-line classes
today. The day RFC-2026-027's gate lands without the revoke, it becomes a lock-out of every family, and that is why the fix
belongs in the same migration.

**Remedy (Q0-F10, INFO).** `[195]`'s sentence "NOT EXECUTED … THE REVIEWERS MUST MEASURE FIRST", the handoff's
`known_limitations[1]`, and the unqualified wording of RFC-026 Q-026-5 and RFC-027 Q-027-5 can now cite this measurement.
`work-packages/WP-0A-DB-00.json:451`.

## 3. Test obligations: sufficient, and would each fail if the mechanism were missing?

### 3.1 RFC-2026-026 (5 static, §8.1; 10 isolation, §8.2), read

Most obligations hold. Each one negates a named mechanism. Case 14 is the negative control for the policies (drop the
`app_command` policy and cases 6 and 8 must fail; drop the `app_worker` policy and case 12's admitted half must fail). Case 15
refuses to leave 140's policy-layer cases green by accident. Cases 9, 11, 12 and 13 name the refusal layer. The exceptions:

- **Q0-F1, MEDIUM: §8.1/1 cannot be executed as written.**
  `architecture/decisions/RFC-2026-026-audit-row-producer.md:336-338` reads "No function body in `db/foundation/migrations/`
  inserts into `app.audit_logs` or `app.security_events`". But the command producer the RFC proposes is exactly such a function:
  - §3.3 and §3.4 make it a `SECURITY DEFINER` command function whose body inserts the audit row;
  - `RFC-2026-023` §6 and §9/1 land it by migration;
  - `RFC-2026-017` §3 gives it the role `app_command`.

  So the rule, taken literally, refuses the RFC's own design the day the command half lands. Narrowed ad hoc to "trigger
  functions", it must still say how a trigger function is recognised. A non-trigger function called from a trigger would evade
  a `RETURNS trigger` test. The heading ("No trigger function writes an audit row") and the body disagree.
  **Remedy:** restate the rule as: "no function returning `trigger`, and no trigger on any table, reaches an `INSERT` into
  either audit table; the functions that do are exactly the coverage map's `producer_path: command` names". Pair it with a
  drift: a trigger function inserting an audit row, appended as a drift, must be refused.
- **Q0-F6, LOW: §8.2/7 (atomicity) is written against "a test stub"** (`:355-356`). A stub that does the change and a failing
  insert in one call proves PostgreSQL's transaction semantics. It does not prove that any *landed* command writes its audit
  row in the action's transaction. An asynchronous producer is the missing mechanism this case exists to catch, and it would
  pass, because the stub is not the producer. **Remedy:** run the case against each landed command. Inject the failure at the
  audit table, for example with an in-transaction CHECK or restrictive policy added by the test as owner. Then assert the
  action is absent, and assert what the caller received.
- **Q0-F7, LOW: no case separates §3.6's "copied from the changed row" from "taken from the inputs".** Case 6 (`:353-354`)
  passes when the inputs equal the row's scope, which is the normal case. **Remedy:** add a case whose command input names
  a business or page that differs from the target row's, if the command's signature admits one. Or add a static rule on
  the function body (scope columns sourced from `RETURNING`).
- **Q0-F8, LOW: case 10, "No claims: refused." (`:361`), names no layer or SQLSTATE.** Case 12 takes care to name both.
  A refusal by a cast error would pass it. **Remedy:** require `42501` from the policy (`deniedBy: 'rls'`).

### 3.2 RFC-2026-027 (§5: 9 cases; §6: 5 static), prototyped and measured

**Prototype.** On the r1 database, as `postgres`, I applied §3.1 (the grant and `workspaces_select_authz_own_open`) and §3.2
(the gated `app.workspace_member_role`). I gave W1 one business profile. Then, for each of the eight states, I measured as U1:
the helpers, `business_profiles` rows, the workspace row, roster rows, a direct read of `app.workspaces` **as `app_authz`**,
and the oracle call as U2. Each mutation ran in one transaction, rolled back. Generator and log: `gen-rfc027.cjs` and
`rfc027-proto.log`.

| Mutation | active, closing | the six blocked states | Which §5 case kills it |
|---|---|---|---|
| M0 as proposed | member, owner, bp 1 | member false, role null, bp 0, ws 0; own roster row 1 (Q-027-1 "kept"); U2 oracle false | none needed. **No `42P17`, no recursion**, for the workspace, roster and business reads |
| M1 policy dropped (case 7) | member **false**, bp 0 | refused | **case 2** (positive control) |
| M2 011's helper body restored (case 8) | as M0 | member **true**, bp **1** | **case 1** |
| M3 helper joins `app.workspaces` but **its** lifecycle conjunct removed | as M0 | **identical to M0** | **none**: survives every §5 case |
| M4 **policy's** lifecycle conjunct removed | as M0 | identical to M0 for U1; only the direct `app_authz` read differs (1 row) | **none**: no §5 case reads as `app_authz` |
| M5 both conjuncts removed | as M0 | member true, bp 1 | case 1 |

- **Q0-F2, LOW (measured): §5 cannot detect either lifecycle conjunct removed on its own.**
  `architecture/decisions/RFC-2026-027-lifecycle-visibility.md:97-100` says the policy's gate and the helper's gate are each
  load-bearing: "Both are pinned, and §5's cases hold each separately". M3 and M4 show that §5's cases do **not** hold each
  separately. While either conjunct remains, the other is unobservable through every case as written. §6/4 (`:249-252`) can
  hold both statically, if it is implemented as "the literal is present in each place". As written, it says "the same".
  **Remedy:**
  - (a) add a case that reads `app.workspaces` directly as `app_authz`, with a blocked-workspace owner's claims, and expects
    zero rows (kills M4);
  - (b) add a paired negative control: with the policy's conjunct removed in the test transaction, case 1 must still refuse.
    That proves the helper's conjunct (kills M3);
  - or (c) correct the sentence and name §6/4 as the only holder.
- **Q0-F3, LOW (measured): case 7's wording.** `:234-236` says "case 2 fails for every member in every state". Measured
  (M1): it fails in the two *admitted* states. In the six blocked states the read is refused either way, so case 1 stays green.
  **Remedy:** "case 2 fails in both admitted states".
- **Q0-F4, LOW: case 1 can pass vacuously per family.** `:219-224` uses one fixture workspace per blocked state and a
  "representative read on each family". A family with no rows in those workspaces returns zero with or without the gate.
  Case 8's negative control turns red if *any* family leaks, so it does not catch a vacuous family. **Remedy:** for each family
  in §3.3's table, require the same read to be non-empty under case 8's control. Or flip the state of one populated workspace
  inside the case's transaction, rather than seeding six empty ones.
- **Q0-F5, LOW (measured): §4's "same diff" list misses two guards that fire.** I appended §3.1 and §3.2 to `140_audit.sql`
  as a drift (round r3). `make db-migrate-clean` exited 2. Four probes refused it:
  1. the **permissive policy probe** ("unlisted or changed: app.workspaces.workspaces_select_authz_own_open");
  2. the **policy set probe** ("policy(ies) no pinned list names: …");
  3. the **SECURITY DEFINER probe** ("body differs from the pinned digest");
  4. the **pinned grant probe** ("unlisted: app_authz SELECT (id) … (lifecycle_state) on app.workspaces").

  §4 (`:204-215`) names the third and fourth, plus the `AUTHZ_*` constants. It does not name the two policy pinned lists in
  `scripts/db/run.mjs` (for example `run.mjs:378-379`). The post-migrate pass never ran, because the probes failed first, so
  "the post-migrate pass names any other" is not how a reader would find these. **Remedy:** add the two policy pinned lists
  to §4's list.

**Sufficiency otherwise.** Case 7 is necessary and correct: M1 is killed, and only the policy admits the helper's read. Case 8
is correct: M2 is killed. Case 5 (no oracle) held under every mutation. Case 6 matched Q-027-1's proposal: own row kept.
§7.2 (b) held in the prototype: no `42P17` and no runtime recursion on `app.workspaces`, the roster, or `business_profiles`.
That is one data point on one fixture, not the CI proof §7.2 owes. §7.2 (a), (c) and (d) I did not measure.

## 4. The moved line pins

**Re-derived independently** (`pins.cjs`). It parses `work-packages/WP-0A-DB-00.json` and finds the physical line holding
each `open_blockers[i]`:

- all **33** `line` pins in `db/foundation/lint/audit-coverage-map.json` sit at 256+i, and each quote is contained in its
  entry;
- both `source` texts (`[156] (line 412)` and `[190] (line 446)`) match;
- all **19** `WP:N (open_blockers[i])` citations in `db/foundation/lint/retention-map.json` match;
- `[195]` is on line 451.

A word diff of `f3e6fbc..e64e1f5` over the two lint files shows that **only numbers changed, each by +3, and no index**.

**Citation mutations** (`pin-mutations.sh`; `node --test test-kits/db/foundation-contract.test.mjs`, 80 tests):

| id | Mutation | Exit | What failed |
|---|---|---|---|
| Q1 | retention-map `WP:376 (open_blockers[120])` → `WP:377` | 1 | "the retention map has one row per table …" |
| Q2 | the same citation moved *consistently* to the neighbour: `WP:377 (open_blockers[121])` | **0** | **nothing** |
| Q3 | audit-coverage-map pin `{index 6, line 262}` → line 263 | 1 | "batch 141 prep: the audit coverage map names real tables …" |
| Q4 | the same pin moved consistently: `{index 7, line 263}`, quote kept | 1 | the same (the quote check catches it) |
| Q5 | `source` text `(line 412)` → `(line 413)` (A0's D3) | **0** | nothing (confirms D3) |
| Q6 | one retention citation at the draft's offset, `WP:261 (open_blockers[4])` | 1 | the retention map test |

The pins bind. **Q0-F9, INFO (pre-existing, measured):** a retention-map citation carries no quote. So a consistent
off-by-one in both the line and the index points at the wrong blocker and stays green (Q2). The coverage map's quote catches
the same move (Q4). This batch did not introduce it: no index changed. Owed to A0 (tooling), beside D3.

**A0's drifts reproduced** (`drift-repro.sh`):

| Drift | Exit | Result |
|---|---|---|
| D4 | 1 | "the set of decision records is what it was, and each is digested" |
| D5 | 86 | the integrity tripwire |
| D6 | 74 | "declares 1 amendment(s) that explain nothing this branch changed" |
| D7 | 73 | "changed 1 path(s) it neither owns nor records as an amendment" |
| D8 | 73 | the same message |

D1, D2 and D3 are covered by Q1/Q6, Q3 and Q5. Every exit matches plan §2. All touched files were restored, and the
sha256 equality was checked.

## 5. Are the claims true?

| Claim (where) | Verdict | How |
|---|---|---|
| Cherry-picks without conflict; RFC text byte for byte the draft's (plan §0, commit `31ffab4`, handoff) | TRUE | `git diff --stat 2917c5c 7479107` and `56ad4bf 6326183` both show only main's three batch-150 record files; `git diff 7479107 e64e1f5 -- architecture/` is empty |
| Main differs from `5c406de` only in two evidence files and the handoff (plan §3) | TRUE | the same diff |
| Branch slot moved in the manifest and in both rows of `branch-identity.test.mjs` (item 6) | TRUE | diff |
| Four amendments outside ownership; `test-suite-contract.mjs` dropped; `VERIFICATION.md` untouched; tests stay 684 (item 7, rationale) | TRUE | manifest diff; `npm run verify` 684/684 |
| 33 + 2 + 19 pins at 256+i (item 8) | TRUE | §4 |
| Blockers 21 and 95: one sentence each, appended (item 9) | TRUE | each new text has the old one as a strict prefix (`wpdiff.cjs`) |
| `[195]` appended at the end; nothing else in `open_blockers` changed | TRUE | 195 → 196 entries; only 21, 95 and the new 195 differ |
| `[195]`'s code citations: `010:403`, `:497`, `:509-517`, `:156-157`; `pinned-grants.json:221`; 105 is the only other policy on the table | TRUE | read at `e64e1f5` |
| `[195]`'s effect today: the row disappears for members, and the owner cannot UPDATE it back | TRUE, measured | §2 P7 |
| `[195]`'s qualification | TRUE, now measured | §2 |
| Integrity manifest regenerated, 90 digests (item 11) | TRUE | 90 entries in `files` |
| D1-D8 exits (plan §2) | TRUE | §4 |
| `4916579` changes one sentence of `[195]`, and says so in its message | TRUE | `git show 4916579` |
| `e64e1f5` is the handoff alone and last; `check:handoff` exit 0 | TRUE | `git show --stat`; §1.1 |
| Disposition: no new Owner words; both RFCs Proposed, not approved; 14 questions UNANSWERED, each held in `[195]` by owner | TRUE as read | the disposition §5 table matches RFC-026 §10 and RFC-027 §10, owner for owner |
| Draft PR, not merged, Generated-with line (A0's report) | TRUE | `gh pr view 174`: isDraft true, OPEN |

I found no claim false. A0 reported two "not done" items: the commit-when-clean refusals for `31ffab4` and `4916579`, and the
DB layers not run. Both are recorded in the plan and the handoff as A0 describes them.

## 6. Stop-the-line and merge

**Stop-the-line: none.** The batch changes no migration, policy, grant or runtime path. The one live defect it records
(`[195]`) is MEDIUM and not stop-the-line by my measurement (§2).

**Does anything block the merge?** Nothing I found. The batch adds two *Proposed* decision records, which change nothing until
approved, plus manifest packaging that every guard accepts on the branch name. Findings Q0-F1 to Q0-F8 are corrections to
Proposed RFC text, and RFC review can make them. Q0-F9 is pre-existing tooling. Q0-F10 is a record update. Whether the
standing-delegation bar of batch 127 §6 is met is A0's reading and the Owner's to correct, not mine. Q0-F1 should be fixed
before RFC-2026-026 is *approved*, not before this PR merges.

## 7. Findings, ranked

| id | Grade | File:line | Finding | Remedy |
|---|---|---|---|---|
| Q0-F1 | MEDIUM | `architecture/decisions/RFC-2026-026-audit-row-producer.md:336-338` | §8.1/1's "no function body in migrations inserts into an audit table" refuses the RFC's own command producer | restate as "no trigger, and no function reachable from one"; the producers are named by the coverage map; add a drift |
| Q0-F2 | LOW | `RFC-2026-027-lifecycle-visibility.md:97-100`, `:219-238` | §5 cannot detect either lifecycle conjunct removed alone (M3, M4 survive) | add a direct read as `app_authz`, and the paired control; or correct the sentence |
| Q0-F3 | LOW | `RFC-2026-027…:234-236` | case 7 fails only in admitted states | reword |
| Q0-F4 | LOW | `RFC-2026-027…:219-224` | case 1 can be vacuous per family | require each family non-empty under case 8, or flip one populated workspace |
| Q0-F5 | LOW | `RFC-2026-027…:204-215` | the same-diff list misses the permissive-policy and policy-set pinned lists (measured, r3) | add them |
| Q0-F6 | LOW | `RFC-2026-026…:355-356` | the atomicity case runs on a stub, not on the producer | run it on each landed command with an injected audit failure |
| Q0-F7 | LOW | `RFC-2026-026…:353-354` | no case separates scope copied from the row from scope taken from the inputs | add a differing-input case or a body rule |
| Q0-F8 | LOW | `RFC-2026-026…:361` | "No claims: refused" names no layer | require `42501` / `deniedBy: 'rls'` |
| Q0-F9 | INFO | `db/foundation/lint/retention-map.json` (the citation format) | a consistent line+index move to the wrong blocker stays green (Q2); pre-existing | add a quote per citation, as the coverage map has (owed to A0 tooling, beside D3) |
| Q0-F10 | INFO | `work-packages/WP-0A-DB-00.json:451`; handoff `known_limitations[1]` | `[195]`'s qualification is now measured: A0's expectation holds | cite this record in the next touch of `[195]` and of Q-026-5 / Q-027-5 |

## 8. Limits

- Same vendor and model family as the Author. A0 framed my questions. My mutations are a sample, chosen by a model that
  shares the Author's blind spots.
- RFC-2026-026 is read, not executed. There is no command function and no worker identity to execute it against.
- The RFC-2026-027 prototype ran on one synthetic workspace and one family table (`business_profiles`), as `postgres`-seeded
  rows. It is not the batch-170 migration, its isolation cases, or `authz-proofs`, and it does not discharge §7.2.
- I did not observe CI beyond reading run 37174834595's conclusion through `gh`.
- I did not judge the Owner-facing recommendations in the disposition §5. They are A0's, for the Owner.
- Private artefacts (not in the repository) are under `scratchpad/q0-rfc-026-027/`: probe SQL and logs, the prototype
  generator and log, the pin and drift scripts, and the logs and backups. No cluster remains.
