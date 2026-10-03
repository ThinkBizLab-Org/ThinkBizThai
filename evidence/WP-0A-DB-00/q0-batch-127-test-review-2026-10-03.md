# Q0 independent test: batch 127 (PR #166)

- **Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-127` (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/166>),
  head `75dae71` (handoff alone) over code `4fef70a`, plan and disposition `554a9c3`, base `3f80599` (main).
  Author `/claude/a0_atlas`.
- **Reviewed on:** my own branch `review/q0-batch-127`, checked out at `75dae71`. Every command that reads the
  branch name ran in a private clone at `75dae71` on a local branch named `agent/claude/WP-0A-DB-00-batch-127`
  (that name is checked out in another worktree, so it could not be checked out here).
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own workflow, and the same vendor and model family as the
Author (RFC-2026-024). I am independent of the Author's run, but not of its vendor or its orchestration. So this
record is evidence for the Tester role, not that role's signature. Accepting it as the signature is the act of
the Integration Owner and the Product Owner.

## 1. Measured vs read

**Measured** (PostgreSQL 17 at /opt/homebrew/bin; `initdb --locale=C -A trust -U postgres`; 127.0.0.1:5503,
TCP only, `-c unix_socket_directories=''`; `LC_ALL=C`; `db/foundation/ci/supabase-shim.sql` first; Node 24.20.0;
a fresh initdb for every round, 120+ rounds in all; each drift appended to `db/foundation/migrations/140_audit.sql`
in the private clone, which was restored and compared byte for byte (`cmp`) after every round, every time `ok`):

| Command (on the branch name, at `75dae71`) | Exit | Output |
|---|---|---|
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs 3f80599 WP-0A-DB-00` | 0 | "all 25 changed path(s) are declared, and every amendment explains one" (24 at `4fef70a`, as the plan says) |
| `npm run verify` | 0 | "clean: exit 0 -- tests 677, pass 677, fail 0, skipped 0, todo 0" |
| `make db-migrate-clean` (baseline) | 0 | 19 catalog probes, each refusing its drift and clean again; post-migrate pass 49 blocks, 37 as written, 12 replaced |
| `make db-rls-smoke` (baseline) | 0 | 1077 isolation cases passed |
| `gh pr view 166` | -- | Draft, head `75dae71`, required check "Bootstrap validation" SUCCESS (run 37116932386) |
| `gh pr view 165`, `gh run view 37111859581` | -- | merged 2026-10-03T10:08:51Z as `3f80599` at head `84df4d4`; run 37111859581 success on `84df4d4` |
| `git range-diff` draft vs cherry-picks | -- | `ef37f48 = e5104bf`, `e729a57 = fb39bb4`: cherry-picked unchanged |

**Catalog, measured on the clean set:** authenticated may INSERT `created_by` on 19 tables, all in `app`, all
RLS enabled and forced. The client-insertable `*_by` columns are created_by 19, updated_by 14, requested_by 2
(35 in all). There are 25 client-writable app tables. Their permissive policies are 24 INSERT, 25 SELECT and 25
UPDATE (74), with no ALL or DELETE. `anon` can write no app table. authenticated has USAGE but not CREATE on
`public`. No view, materialized view or foreign table exists in `app`, `public` or `private`. Every number in
plan §1 matches.

**Read, not measured:** the plan's L1+M1 shell-file result (I did not build or run any lexer-bypass payload in
this run; the lexer layers were tested only by narrowing the rules and running the static shapes and benign
drifts); twins.mjs (I measured twins by my own method, M-T below); the README wording; the handoff's text fields
beyond the claims checked in section 4.

## 2. Mutation table, with a verdict per layer

static = `node --test test-kits/db/foundation-contract.test.mjs` (and identity-isolation) with the mutation in
place; mc = migrate-clean; rs = rls-smoke (run after mc whatever mc did); CI = the ci.yml negative control,
reproduced locally (section 3). Exit codes as `make` returned them (2 = failed).

### 2a. The nineteen closures (57 rounds, one per closure per drift)

| Id | Drift (appended to 140) | static | mc | rs | Verdict |
|---|---|---|---|---|---|
| DROP x19 | `drop policy <t>_created_by_is_caller` | 0 | **2** on all 19: "app.<t> has no <t>_created_by_is_caller" | 0, 1077 pass | Held by mc, by name, for each table alone. rs stays green because the 24 permissive INSERT policies still bind created_by, so the closure is the second lock and mc is the layer that notices it missing. |
| GUT x19 | `alter policy ... with check (true)` | 0 | **2** on all 19, named `<t>.<t>_created_by_is_caller` | 0 | Held by mc on every table. |
| RECAST x19 | 7 styles rotated over the 19: re-created PERMISSIVE (3), restrictive TO PUBLIC (3), roles widened to `authenticated, anon` (3), `auth.uid()` unwrapped (3), `or created_by is null` (3), renamed `_v2` (2), FOR ALL (2) | 0 | **2** on all 19, named by the closure probe (the permissive recasts also by the permissive probe) | 0 on 16; 2 on 3 (the permissive recast on approval_policies and content_ideas, and FOR ALL USING (true) on knowledge_items, broke other cases) | Held by mc on every table and every style. |
| FORGE x19 | the closure dropped **and** a looser permissive INSERT sibling `<t>_q0_loose` (any member) on the same table | 0 | **2** on all 19: closure probe + permissive probe | **2** on all 19: each round's failures include **exactly one** created-by-alone case, and it is that table's own | Each of the 19 cases fails exactly when its own table's created_by is forgeable. |
| Q-D1 | a looser permissive INSERT sibling beside each of the 24 (the check with its created_by clause removed), closures intact | 0 | **2**: the permissive probe names all 24 siblings on all 19 tables | 0 | Plan D1 reproduced: closures hold rs, and the permissive probe holds mc everywhere. |
| Q-D2 | Q-D1 plus all 19 closures dropped | 0 | **2**: closure probe and permissive probe | **2**: 22 of 1077 | Plan D2 reproduced exactly. |
| Q-D6 | `workspaces_select_any_member ... using (true)` | 0 | **2**, named | **2**: 2 of 1077 (`owner-a-cannot-see-workspace-b`, `suspended-a-sees-zero-tenant-rows`) | Plan D6 reproduced. |

**M-T (twins).** In `isolation-cases.mjs` I changed `FORGED` to `__SELF__` (created_by = the caller, everything
else unchanged). rs failed **19 of 1077**, exactly the 19 created-by-alone cases, each with "1 row(s) came back".
On baseline the same 19 statements are refused. So each statement is admitted by every policy when created_by
names the caller, and each refusal belongs to created_by alone. Restored byte for byte.

### 2b. The permissive-set pin, the INSERT coverage probe, the lexer

| Id | Mutation (code; digests refreshed where noted) + drift | static | mc | rs | Verdict |
|---|---|---|---|---|---|
| P1 | `PERMISSIVE_POLICIES['user_profiles.user_profiles_update_own']` set to `using true, check true`, **digests refreshed**; no drift | **0** | **2**: missing or changed, and unlisted or changed, `user_profiles_update_own` | 0 | The live catalog still disagrees with the edited pin, so mc holds it. |
| P1 + later file | P1 plus `alter policy user_profiles_update_own ... using (true) with check (true)` in 140 | **0** | **0** | **0** | **Passes every automated layer: F2.** The only remaining signal is the digest change and the one-line list diff for a reviewer to read, which is the design the plan states in §5 item 4. |
| P2 | `content_ideas_insert_writer`'s pinned check without its created_by clause, digests refreshed (+ a matching later-file `alter policy`) | **1**: "the nineteen created_by tables are exactly the tables whose permissive INSERT policies bind created_by" | 2 | 0 | A pin weakened on a created_by table's sole INSERT policy is held statically. On the five tables with two INSERT policies, weakening one of the two would pass that derivation; the 127 closure still holds created_by there. |
| P3 | permissive probe narrowed to `polcmd = 'a'`, digests refreshed | **1** ("every permissive policy on those tables, of every command") | 2 (pinned non-INSERT policies reported missing) | 0 | Held statically and by mc. |
| P4 | client-writable set narrowed: the `UPDATE` privilege disjunct removed, digests refreshed | **1** ("client-writable means INSERT or UPDATE on any column, or DELETE") | 2 | 0 | Held statically and by mc. |
| C1 | INSERT coverage probe narrowed to `a.attname = 'created_by'`, digests refreshed; drift: a new RLS-forced `app.q0_cov` granting INSERT on `reviewed_by` | **1** (whole-statement pin) | **0** with the drift (baseline: **2**, "app.q0_cov.reviewed_by") | 0 | **Held by static alone.** With static held, the probe names the column at mc. |
| C1' | as C1, drift `grant insert (decided_by) on app.approval_requests` | 1 | 2, but by 090's own apply-time block, not the probe | 0 | Plan D5's object is also held by 090's block. Baseline mc names it through the INSERT coverage probe, as blocker 186 says. |
| C2 | the probe's INSERT half removed (`'INSERT'` changed to `'UPDATE'`), digests refreshed | **1** | 2 (it now names UPDATE-only columns) | 0 | Held statically. |
| C3 | the INSERT coverage probe's SQL replaced by `select 1;` in `CATALOG_RULE_PROBES` | **1** (probe list) | **2**: its self-test drift "passed", so the executor refuses it | 0 | Held by static and mc. |
| L1 | odd-run rule narrowed to `run === 1` | **1** (the run-of-3 shape) | 0 (no drift) | 0 | Held statically, which is what 127 added (Q0 F1 on 126). |
| L2 | `client_encoding` mention rule removed; drift `set client_encoding = 'UTF8';` | **1** | **0** with the drift (unmutated: **2**, refused at 140 line 1019 before applying) | 0 | Static is the only layer once the rule is gone; with the rule present mc refuses before anything is fed. |
| L3 | `set names` rule narrowed to bare `set names` | **1** (`set session names 'UHC'`) | 0 | 0 | Held statically. |
| L4 | `set names` rule removed; drift `set names 'UTF8';` | **1** | **0** with the drift (unmutated: **2**, refused at line 1019) | 0 | As L2. |
| L5 | `standard_conforming_strings` mention rule removed | **1** | 0 | 0 | Held statically. |

All code mutations ran against saved copies of `run.mjs`, `psql-driver.mjs` and `foundation-contract.test.mjs`.
Each was restored and compared byte for byte (see section 6 for a harness slip that was caught and re-run).

## 3. CI negative control, reproduced

On one migrated cluster, for each of the 19 tables: `alter table ... disable row level security`, `make
db-rls-smoke`, then RLS enabled again. All 19 runs failed (rc 2). In every one the table's own
created-by-alone case was among the failures. For the 16 tables with a ci.yml entry, the case matches that
entry's pattern. Three tables (`business_profile_versions`, `page_context_profile_versions`,
`workspace_invitations`) have **no ci.yml control entry of their own**. Their cases match the parent family's
pattern (business, page, workspace), as `identity-isolation.test.mjs` states. Disabling RLS on each of the three
still fails its own case (F3). CI itself is unchanged by 127 and green on `75dae71`.

## 4. Are the claims true?

- **Commit messages (`e5104bf`, `fb39bb4`, `4fef70a`, `554a9c3`, `75dae71`):** true where measured. Cherry-picks
  are unchanged. The handoff commit touches the handoff alone and cites `3f80599..554a9c3`.
- **Plan:** §1's numbers, D1, D2, D6 and the 19-case family are all reproduced. Scope is 24 paths at `4fef70a`
  and 25 at the head. The wording in §2 "each id matches its table's CI negative-control pattern" is true for 16
  tables; for the other 3 it holds through the parent's pattern (F3).
- **Disposition:** the #165 facts are verified with gh: merge `3f80599` at head `84df4d4`, run 37111859581
  success, 10:08:51Z. It says correctly that A0 executed the merge and did not decide it, and that RFC-2026-025
  §5 stays open. That the Owner's words answered all four points is A0's reading, labelled as such. I cannot
  verify it and do not.
- **Blocker 186 edits:** each measured claim reproduced: D1 on 19 tables; D2 22 of 1077; D6 2 of 1077; D7-like
  rs green; `grant insert (decided_by)` named by the INSERT coverage probe; M3/M4-style removal held statically.
  The "STILL OWED" list is accurate, and F1 adds one item to it.
- **Handoff:** `check:handoff` exit 0 on the branch name. Its known limitations and open risks match the plan.
  Its sentence "no permissive policy, however loose, can admit a row naming another creator" is true of the
  table path. A non-table relation bypasses it without any policy (F1).
- **A0's "not done" item 3 (CI not yet checked):** now checked: SUCCESS on `75dae71`, run 37116932386.

## 5. Findings

| Id | Grade | Finding | Remedy |
|---|---|---|---|
| F1 | LOW (later-edit hazard; nothing live; same class as A1 F6 on 123) | **A client-writable VIEW is outside every probe, 127's block and the permissive probe** (`scripts/db/run.mjs:280` and `:387`, `c.relkind in ('r', 'p')`; `127_created_by_on_insert_is_caller.sql:107`). Drift: `create view app.q0_ideas_v as select * from app.content_ideas; grant select, insert on app.q0_ideas_v to authenticated;` gives mc 0 and rs 0 (1077 pass). On that cluster, a caller who is a member of no workspace inserted through the view a row in another workspace with `created_by` set to a third uuid, and the row persisted (measured, then rolled back). The view runs as its superuser owner, so no policy, closure or grant check on the base table applies. No view exists on the clean set. | One probe rule, with its own drift: no relation of relkind `v`, `m` or `f` in any schema `anon` or `authenticated` can use grants either role INSERT, UPDATE or DELETE, unless it is `security_invoker` and pinned. Fold it with A1 F6's schema-`public` reach. |
| F2 | LOW (pre-existing coverage gap that 127's design makes visible) | **The permissive pin can be weakened in code and in a later file together, with every automated layer green** (`scripts/db/run.mjs:368`, `user_profiles.user_profiles_update_own`). P1 + later file: static 0, mc 0, rs 0. With that policy at `using (true)`, a bare `update app.user_profiles set display_name = ...` by user A rewrote user B's profile (measured, rolled back). No rls-smoke case notices. The digest and the one-line list diff are the only signal, as plan §5 item 4 intends. | An rls-smoke case per user-scoped UPDATE policy without one: a bare UPDATE by A leaves B's row unchanged. Starting with `user_profiles`, so a widened pin fails a live layer too. |
| F3 | INFO | The plan §2 wording "each id matches its table's CI negative-control pattern" is imprecise for the 3 tables with no ci.yml entry; their cases sit in the parent's family. Measured: disabling RLS on each of the 3 still fails its own case. | Wording only, in the next record. |
| F4 | INFO | P2 shows that the static derivation "19 created_by tables = tables whose INSERT policies bind created_by" holds only when a table has one INSERT policy. On the five tables with two, weakening one passes that line and is held by mc (live mismatch) or by the digest. The 127 closure keeps created_by safe either way. | None needed now. An optional static check that every pinned INSERT policy on a CREATED_BY_CLOSURES table keeps the created_by prefix. |

No finding is in 127's migration, its closures or its 19 cases. Every closure drop, gut and recast is named by
mc. Every forging case fails exactly when its own table's created_by becomes forgeable, and only then. Every
narrowing of the new probes and lexer rules fails static.

## 6. Stop-the-line verdict, and the Owner's merge

**No stop-the-line.** Nothing is reachable by a client on the clean set. F1 and F2 each need a later migration,
and F2 also needs an edit to the pin. **Nothing in this file blocks the Owner's merge of #166.** The required
check is green on `75dae71`. The C0 and A1 role runs and the Integration Owner evidence (RFC-2026-025 §5) are
outside this file.

## 7. Limits

- I did not build, run or re-run any lexer-bypass or shell-escape payload. The lexer was tested by narrowing
  its rules and running the repository's own static shapes and two benign drifts (`set client_encoding`,
  `set names`). The plan's L1 + M1 "file was created" result is therefore read, not reproduced.
- **Harness slip, caught:** four mutation runs were first piped into `head`. That cut the script short before
  its restore step, and one mutation was left in place for the next run. I found it with `cmp`, restored all
  files from the saved copies and re-ran L1 through L5 without pipes. The table reports only the clean re-runs.
  Every file is byte-identical to its saved copy at the end.
- The CI negative control was reproduced locally against the 19 tables, not all ci.yml entries, and not on
  GitHub's runner.
- `check:handoff` in a fresh clone exits 91 until `origin/HEAD` points at main. In the clone I set the symbolic
  ref (local clone metadata only). The measurement above is after that.
- Leftover `PWNED_*` files from an earlier run (`scratchpad/q0-126r2/pwned-r1/`) exist in the shared parent
  directory. None exist under A0's 127 directories. They are not this run's to remove.
- My cluster (port 5503) was stopped and its data directory removed. No other port was touched.
