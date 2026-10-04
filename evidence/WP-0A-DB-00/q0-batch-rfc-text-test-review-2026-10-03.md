# Q0 independent test of batch rfc-text (PR #179)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-text`, head `54f5dd0` (the handoff refresh, alone and last), over the
evidence commit `6489596` and the code commit `cdf6774`, base `88a6670` (`main`). **Author:** `/claude/a0_atlas`.
**PR:** https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/179 (Draft).
**Tested on:** my own branch `review/q0-batch-rfc-text`, created at `54f5dd0`. The repository commands ran on the branch
NAME (§1.1).
**Date:** 2026-10-05. The file name carries the phase's date (2026-10-03), as the batch's plan and disposition do.

This record holds findings. It advances no status, approves nothing, test-verifies nothing on anyone's behalf, and decides
nothing that the Integration Owner, A1 or the Product Owner holds. It repairs nothing it found.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run. I am the same vendor and model family as the Author. A0's
workflow wrote my brief, chose the questions, the port and the output file, and A0 wrote the change under test. My
independence is the independence `RFC-2026-024` describes, and no more. Whether this record counts as the Tester role's
signature is for the Integration Owner and the Product Owner to decide, not me.

Every drift was appended to `db/foundation/migrations/140_audit.sql` in my own worktree and restored from a private copy.
I checked each restore by sha256: `2ac596bb950e8dfb…` before and after every round. `git status --porcelain` was empty
before I wrote this file. Nothing was pushed.

## 1. Measured versus read

**Setup for every measured run:**

- Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`), checked with `node -v` before each run. The PATH Node 26 was
  not used.
- PostgreSQL 17.11 from `/opt/homebrew/bin`.
- A fresh `initdb --locale=C -A trust -U postgres` for every round (r1-r8), on 127.0.0.1:**5503** only, TCP only
  (`-c unix_socket_directories=''`), `LC_ALL=C`. The shim `db/foundation/ci/supabase-shim.sql` ran first (exit 0 each time).
- `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`.
- Private directory `scratchpad/q0-rfc-text/`. I did not touch 5432, 5499 or any other run's port. Each cluster was
  stopped and its data directory removed. At the end, `pg_isready -h 127.0.0.1 -p 5503` printed "no response".

**Measured:** the four repository commands on the branch name (§1.1); both database layers on an untouched tree (§1.2);
the catalog facts §8.1/1 relies on (§1.2); RFC-2026-027 §6/6's census (§3.2); five drifts against §8.1/1 (§2.1); one
probe of RFC-2026-027 §5/6 with the gate absent (§3.1); the manifest, blocker and line-pin claims (§4).

**Read, not executed:** the rest of RFC-2026-026's revised policy (§3.3, §3.7) and cases (§8.2/16-21). There is no command
function, no `RFC-2026-023` helper and no worker identity to run them against. I checked them against `140_audit.sql`,
`011_authorization_helpers.sql`, `RFC-2026-023` §3.2 and my predecessor's injection table
(`q0-batch-rfc-026-027-recheck-2026-10-03.md` §3.1).

### 1.1 Repository commands, on the branch NAME

The branch is checked out in two other worktrees (`wf_bb3eb819-b4c-1` and `-2`). So I checked out the name in my own worktree
with `git checkout --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-rfc-text`. `git branch --show-current` printed
that name, and HEAD was `54f5dd023f455c0f33f3cf20b53ce7cbbfb2b324`. I committed nothing there. I switched back to
`review/q0-batch-rfc-text` before writing this file.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 88a6670 WP-0A-DB-00` | 0 | "all 9 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| `npm run check` | 0 | tests 685, pass 685, fail 0 |

### 1.2 Database layers and catalog facts

Nothing a database layer reads changed. The diff touches no migration, invariant, fixture, isolation case, `scripts/db/**`,
`Makefile` or CI file. The coverage map changes only in its 33 `line` fields, which the static suite reads. I ran the
layers once anyway, because I needed the cluster.

| Round | What | Exit | Output |
|---|---|---|---|
| r1 | `make db-migrate-clean` | 0 | "post-migrate pass: 51 apply-time blocks, 39 re-run as written, 12 superseded and replaced" |
| r1 | `make db-rls-smoke` | 0 | "1087 isolation case(s) passed"; "db-authz-proofs: ok — 6 claim(s) discharged by execution" |
| r1 | catalog census (`census.sql`) | — | see below |

On r1's catalog:

- No function in `app` or `private` has a `prosrc` that mentions `audit_logs` or `security_events`.
- No `app`/`private` PL/pgSQL function contains the word `execute`. No `app`/`private` function has a `prosqlbody`.
- The audit tables carry exactly four non-internal triggers: `refuse_mutation` and `refuse_truncate` on each, all calling
  `private.refuse_mutation()`. Neither audit table has a policy.
- `app_command`, `app_worker` and `app_authz` are neither `BYPASSRLS` nor superuser.
- `EXECUTE` on `app.is_active_member(uuid)` is held by `app_authz` and `authenticated`. `EXECUTE` on `app.jwt_subject()` is
  held by `app_authz` only.
- Functions outside `app` and `private`: `extensions` 36 and `auth` 1.

So §8.1/1 (a)-(d) would be green on today's catalog with an empty producer set. That is consistent with the plan's
"no migration function uses a dynamic `EXECUTE` (grep, not a catalog)". The catalog now confirms it.

## 2. RFC-2026-026: are the revised obligations executable, and would each fail without its mechanism?

### 2.1 §8.1/1, the catalog rule (Q0R-F2's remedy), under drift

The batch restates §8.1/1 as four parts:

- (a) the functions in `app`/`private` whose code names an audit table are exactly the pinned producer set;
- (b) no function names a producer;
- (c) no PL/pgSQL `EXECUTE`;
- (d) the audit tables' triggers are `140`'s.

Each function's `prosrc` is tokenised by `scripts/db/sql-lexer.mjs`. This is now a form a lint can decide, and Q0R-F2's
remedy is taken. Five drifts were appended to `140_audit.sql`, each in a fresh round (scripts in `drifts/`):

| Round | Drift | `migrate-clean` | Catalog afterwards | What (a)-(d), as written, would do |
|---|---|---|---|---|
| r2 | X1: a `SECURITY INVOKER` PL/pgSQL trigger function in schema **`public`** inserting into `app.audit_logs`, plus `create trigger … on app.workspaces` | **2**, refused by the existing **pinned trigger probe**: "unpinned: CREATE TRIGGER q0_x1 AFTER UPDATE ON app.workspaces …" | function present in `public`, `prosrc` names the table | (a)-(c) do not read `public` |
| r3, r4 | X2's first two spellings (`do $do$`, then a non-idempotent `create`) | 2, 2 | — | refused by the post-migrate pass's DO-block shape and re-run rules; not the drift's subject |
| r5 | **X2:** `create or replace function app.q0_x2_write(uuid) language sql … begin atomic insert into app.audit_logs … end`, issued by `EXECUTE` inside a `do $$ … end $$;` block, plus a PL/pgSQL `app.q0_x2_on_workspace()` returning `trigger` that `perform`s it (no `create trigger`) | **0**: "post-migrate pass: 52 apply-time blocks, 40 re-run as written, 12 superseded and replaced" | `q0_x2_write`: `prosrc` length **0**, does not name the table, `prosqlbody` not null; only `pg_get_functiondef` names `audit_logs` | **all four pass**: (a) sees no audit-table name in `prosrc`; (b) sees no producer called; (c) sees no `EXECUTE` in `pg_proc` (the DO block is not a function); (d) is untouched |
| r6 | **X3:** `app.q0_x3_on_workspace()` returning `trigger`, `set search_path = app, pg_catalog`, body `insert into audit_logs …` (unqualified; no `create trigger`) | **0** | `prosrc` names `audit_logs` **unqualified** | (a) catches it only if "names `app.audit_logs`" matches the bare identifier; the text does not say so |
| r7 | X4: X2's function at the top level of the migration (no DO block) | **2**: "a BEGIN ATOMIC body, which psql keeps whole where this splitter would not" (`psql-driver.mjs:563`) | nothing created | the driver refuses `BEGIN ATOMIC` at depth 0 only |

Four findings follow: F1-F4 in §5.

### 2.2 §8.2/16, the injection (Q0R-F1's remedy)

The text now names injection A, `with check (outcome <> 'succeeded')`, as a restrictive policy `for insert to
app_command`. It asserts a raise of `42501`, the absent change, and no row for the `request_id`. It adds the control (the
same injection admits a `denied` row) and a self-test with the wrong function. It names injections B (`with check
(false)`) and C (case 7's CHECK, `23514`) as not acceptable. This matches my predecessor's measured table exactly.

The injection is reachable as written:

- the producer is `SECURITY DEFINER` owned by `app_command` (§8.1/1 (a));
- `app_command` is not `BYPASSRLS` (r1);
- `app_command` is not the audit tables' owner (`140`'s owner probe).

So the restrictive policy applies to the producer's `INSERT`. **Executable and discriminating (read). Q0R-F1 is closed.**

### 2.3 §8.2/18-21 and §3.3's literal

| Case | Executable when | Fails without its mechanism? (read) |
|---|---|---|
| /18 (refusal row names no scope, the caller's own W) | command half lands | yes. The earlier literal's refusal arm admitted any scope an unnarrowed member's helper admits, so the "business of W" row would be admitted. The rewrite removes the old wording, which would have passed with the gap open. |
| /19 (membership for denied/failed) | command half lands | yes. Under the earlier literal a `denied` row into another tenant's or a non-existent `workspace_id` was admitted (A1 r4). `app.is_active_member` returns false for both (`011:282-290`). |
| /20 (page form) | command half **and** `RFC-2026-023`'s batch (`acting_user_admits_page` does not exist yet) | yes. Under a business-only literal, the out-of-scope page of B is admitted. The signature matches `RFC-2026-023` §3.2 (`:46`). |
| /21 (`app.security_events`) | worker half and command half | yes for the admitted halves, through its negative control. The CHECKs it relies on exist (`140_audit.sql:601-606`: `actor_kind in ('user','system_actor')`, and kind and id null together). Case 12's "unset confinement refused, not by `42704`/`22P02`" is not repeated for this table (F6). |

§3.3's literal is consistent with `140`:

- `outcome` is `not null` (`audit_logs_outcome_known`, `140_audit.sql:455`).
- No helper is called with a null scope id.
- `app.jwt_subject()` and `app.is_active_member(uuid)` both need `EXECUTE` for `app_command`. The text grants it, and
  `[195]`'s append holds the second.

`app.is_active_member` is `SECURITY DEFINER`, owned by `app_authz` (`011:282-300`). So `app_command` needs no table grant
to evaluate it. I read that, and it is consistent with §8.1/3's "no other role gains anything".

## 3. RFC-2026-027 §5 and §6

### 3.1 §5/6, the member's own row (rewritten for Q-027-1)

On today's tree the gate is absent, which stands in for the mechanism missing. Round r8 (`case6.sql`, `case6.log`) used a
synthetic workspace W, with owner O, editor E and viewer V all active, moved to `access_blocked` as superuser. Each read ran
as `authenticated`, in one transaction, rolled back.

| State | O: own / others | E: own / others |
|---|---|---|
| `active` | 1 / 2 | 1 / 0 |
| `access_blocked`, gate absent | 1 / **2** | 1 / **0** |

The roster policy is `workspace_members_select_workspace_roster`, which admits only owner and admin
(`011_authorization_helpers.sql:339-341`). So for an editor or a viewer, "reads no other member's row" holds with the gate
missing. Case 6's second direction is discriminating only when asserted as an owner or admin, with another active member,
and pre-asserted in `active`. The text says "the member" (F5).

### 3.2 §6/6, the census (Q0R-F4)

I re-measured the census on r1. Over every permissive `TO authenticated` policy in `app`:

- **91** in all, **10** calling neither helper;
- in the rule's scope (tables with a `workspace_id` column, plus `app.workspaces`): **89** and **8**.

The 8 are the three `workspace_invitations` policies, the two `workspace_settings` policies,
`workspace_members_select_own_active`, `workspaces_select_active_member` and `workspaces_update_owner`. After §3.3's five
rewrites (settings ×2, invitations ×3), the exemption list is the **three** the text names. The tables in `app` without a
`workspace_id` column are `ai_models`, `billing_plan_versions`, `billing_plans`, `billing_webhook_receipts`,
`industry_pack_versions`, `industry_packs`, `plan_entitlements` and `user_profiles`. Only `user_profiles` has
`authenticated` policies (2). **The text's 89/8 and three are true (measured).** The plan's "Q0's count cited, not re-run"
is now re-run.

The other revised RFC-027 citations, read:

- `tests/db/identity/isolation-cases.mjs:17674` is the `returning 1` case: `deniedBy: 'grant'`.
- The Status line's five `RFC-2026-020` sections equal the header's Amends line.
- §4's `pinned-grants.json` bullet agrees with batch 170 having revoked the column.

## 4. Are the claims in the commits, plan, disposition, blocker edit and handoff true?

| Claim | Where | Verdict |
|---|---|---|
| The diff is 9 paths. The manifest changes only `ownership.branch`, `amends_without_owning` and `open_blockers`. | plan §1 | **true** (measured, `claims.mjs`) |
| `open_blockers[195]` appended. The other 196 entries are byte-equal. The old text is a strict prefix. | plan §1/15, commit `cdf6774` | **true**: 197 entries; only index 195 differs; prefix true; 3,640 characters appended |
| The append's content: the done items, the owed approval, roles' acceptance, Q-027-4's edit (A0), `EXECUTE` on `is_active_member` (command half), §8.1/1 (a)-(d) and §8.2/19-21 added to (7); no new blocker | plan §1/15, handoff | **true** (read) |
| `open_blockers[i]` is at line 254+i. The 33 coverage-map `line` pins each moved back by one. Indices and quotes are unchanged. Blocker 21's quote is on line 275. | plan §1/14, `migration_and_data_impact` | **true**: `"open_blockers"` is on line 253; 33 pins, 0 not −1; `{"index":21,"line":275,"quote":"nothing can write an audit row today"}` |
| The branch slot moved in the manifest and in both rows of `branch-identity.test.mjs` | plan §1/12 | **true** (diff) |
| `scripts/test-suite-contract.mjs` dropped. The rationale names two out-of-ownership files. `VERIFICATION.md` is not declared. 685 tests. | plan §1/13 | **true**: scope exit 0 with 9 paths; check 685/685 |
| The integrity manifest was regenerated, with 3 records changed (two RFCs, `branch-identity.test.mjs`) | plan §1/16 | **true** (diff); `npm run check` green includes the floor's digest check |
| No migration; nothing a database layer reads changed | plan, disposition, handoff | **true**; r1 green on both layers |
| Both Status lines still say Proposed; §10.1 in each says not an approval | disposition §2, §5 | **true** (read) |
| The Owner's words are quoted verbatim, and the merge of #178 is recorded as the standing delegation | disposition §1, §3 | consistent with the try-it disposition and with `88a6670`'s parent `a0965f7` (read; I did not re-check the CI run) |
| `6489596`: "Committed through commit-when-clean (exit 0: tests 685, pass 685)" | commit message | **true in substance**. A0's private log shows commit-when-clean exit 0 creating `f0cdb4f`. `6489596` is that commit with its message amended 21 s later, and its tree is identical (`3196ab0…`). See F8. |
| `cdf6774`: a plain commit, because commit-when-clean refused on the sole red, the not-yet-refreshed handoff guard | commit message, plan §3 | consistent with A0's logs (read) |
| `54f5dd0`: the handoff refresh, "last and alone" | commit message | **true**: 1 file; `check:handoff` exit 0; the handoff cites `6489596`, and its file lists equal the diff |

The Author's run summary in my brief says the handoff's old `head_revision` `b7dc53f` "was already on the path, so no
repoint". The committed handoff cites `6489596` (refresh repointed it), and `check:handoff` is green on that. The repository
is consistent; the summary is not (F8).

## 5. Findings

| ID | Grade | Where | Finding | Remedy |
|---|---|---|---|---|
| F1 | **MEDIUM** (measured, r5/r7) | `architecture/decisions/RFC-2026-026-audit-row-producer.md:459-464` (`prosrc` tokenised), `:465-480` (a)-(c) | §8.1/1 reads `prosrc`. An SQL-standard (`BEGIN ATOMIC`) body has an **empty** `prosrc` and keeps its body in `prosqlbody`. The driver refuses `BEGIN ATOMIC` only at the top level (r7, exit 2). Issued through `EXECUTE` in a DO block, it migrates clean (r5, exit 0). There, a non-producer function inserting into `app.audit_logs`, and a trigger function calling it, pass (a), (b), (c) and (d) as written. (c)'s claim that refusing `EXECUTE` "keeps them decidable" therefore does not hold. | Tokenise `pg_get_functiondef(oid)` (or `pg_get_function_sqlbody`), not `prosrc`. Or add a part refusing any function in scope with `prosqlbody is not null`. Have the driver refuse `BEGIN ATOMIC` at every nested level, as it already reads them. Add X2 as a sixth self-test. |
| F2 | LOW (measured, r6) | `RFC-2026-026…:465-467` | "whose code names `app.audit_logs` or `app.security_events`" does not say whether a bare `audit_logs` counts. A function with `set search_path = app` and an unqualified `insert into audit_logs` migrates clean (r6, exit 0). | Say that (a) and (b) match the bare relation and function names whatever the qualifier, or require `search_path=""` on every function in scope. The second holds today only for SECURITY DEFINER and pinned trigger functions. Add X3 as a self-test. |
| F3 | LOW (r2 partly measured; read) | `RFC-2026-026…:465`, `:472`, `:475` | (a)-(c) read schemas `app` and `private` only. A function in `public` naming an audit table was created by the migration (r2). It went red only because of its unpinned trigger, and `extensions`/`auth` already hold 37 functions. A pinned trigger function could call such a function, and no part of the rule would see it. | Scope (a)-(c) to every schema except `pg_catalog`, `information_schema` and extension-owned objects (`pg_depend.deptype = 'e'`), or add a rule that no function outside `app`/`private` is created by a migration. |
| F4 | LOW (measured, r2) | `RFC-2026-026…:481-492` | The existing **pinned trigger probe** (`scripts/db/run.mjs:1206-1245`, since batch 126) already refuses any unpinned trigger on a table in `app` or `private` (r2: exit 2, "unpinned: CREATE TRIGGER q0_x1 …"). (1) Drift (d), "a fourth trigger on `app.audit_logs`", is refused by that probe whatever (d) does, so its self-test cannot show (d) bites. (2) A self-test of (a) or (b) written with a `create trigger` goes red for the probe, not the rule. The text's "Q0's round r3 drift — … which `make db-migrate-clean` passed at exit 0" holds only for a trigger function with no trigger (as r5/r6 here). | State that (d) is held by `PINNED_TABLE_TRIGGERS` (or keep (d) and assert its own message in the self-test). Write the (a)/(b)/(c) drifts as functions without a trigger, and require each self-test to assert the rule's own refusal text, not just a red exit. |
| F5 | LOW (measured, r8) | `architecture/decisions/RFC-2026-027-lifecycle-visibility.md:332-334` | §5/6's "reads no other member's row" passes with the gate absent for any member who is not owner or admin. In `access_blocked` with the gate absent, the editor reads 0 others and the owner reads 2. The roster policy admits only owner and admin (`011:339-341`). | Assert the second direction as the owner (or an admin) of a workspace with at least one other active member, pre-asserted in `active` (≥1 other row), as case 1 does. |
| F6 | INFO (read) | `RFC-2026-026…:578-584` | §8.2/21 does not repeat case 12's "`app.workspace_id` unset — refused, and not by `42704` or `22P02`" for `app.security_events`' worker policy. That policy has the same confinement term. | Add the unset arm to /21. |
| F7 | INFO (read) | `RFC-2026-026…:465-470` | (a) refuses any function that names an audit table, not only one that inserts. A future reader, such as §9.1's "security/admin safe view", would be refused. This fails closed, but the text does not say where such a function goes. | Name a pinned reader list beside (c)'s exemption list, or restrict (a) to an `INSERT` target position. |
| F8 | INFO (measured on A0's private log; read) | commit `6489596`; the run summary | `6489596` is `f0cdb4f` (made by commit-when-clean, exit 0) with an amended message and an identical tree. The message's "Committed through commit-when-clean" is true in substance. The run summary's "head_revision b7dc53f … no repoint" is not what the committed handoff says (`6489596`). The committed state is consistent. | None needed in the repository. Describe the amend in the PR body if it is recorded. |
| F9 | INFO (read) | `work-packages/WP-0A-DB-00.json` `open_blockers[195]` head | The pre-existing head of `[195]` says "FOURTEEN QUESTIONS" (twice). The RFCs have fifteen (9 + 6), and this batch's append says fifteen. The head is append-protected and was not changed by this batch. | Leave the head as it is; the append is right. Optionally note the count in the next append. |

None of F1-F9 is in effect anywhere. Each is a defect in a Proposed text's test obligations, or a wording point. No
migration, policy or grant changed.

## 6. Stop-the-line verdict

**No stop-the-line.** The batch changes the text of two Proposed decision records, the manifest, line pins, a test slot and
digests. Nothing is applied to any instance. There is no secret exposure, tenant leakage, duplicate side effect, lost job,
migration divergence, irreversible deletion or contract mismatch. Both database layers are green on the head, and the
repository commands are green on the branch name.

**Does anything block the merge?** Nothing I found blocks merging this Proposed text under the standing delegation, from the
Tester's side. F1-F5 are owed to the text before either RFC is **approved**. F1 is the one I would not let an approval pass
over: as written, the rule it calls decidable is not. They can be corrected in this PR or held on `open_blockers[195]` by name.
That choice is the Author's and the Integration Owner's. The C0 and A1 role runs, and the Integration Owner evidence
`[188]` holds, are not mine to waive.

## 7. Limits

- Same vendor and model family as the Author, and a subagent of its run (§0).
- §8.2/16-21 and §3.3/§3.7's policies were read, not executed. Nothing exists to run them against. My "would fail without
  its mechanism" for them is reasoning from the literal, `140`'s columns and my predecessor's measured injections.
- The drifts test what the migration driver and probes accept, and what the catalog then holds. §8.1/1's lint does not
  exist, so "would pass (a)-(d)" in §2.1 is the rule as written applied by hand to the measured catalog.
- I did not re-check CI run 37217282992 or #178's merge metadata beyond the local commits.
- A0's private logs (`a0-rfc-textr/`) were read for F8 and for the plan's pre-commit claims. I did not re-measure those
  pre-commit states.
- Private artefacts (not in the repository), under `scratchpad/q0-rfc-text/`: `cluster.sh`, `round.sh`, `migrate.sh`,
  `census.sql`, `case6.sql`, `claims.mjs`, `drifts/X1-X4.sql`, and the logs `r1-*` to `r8-*`, `check.log`, `verify.log`,
  `scope.log`, `handoff.log`, `case6.log`.
