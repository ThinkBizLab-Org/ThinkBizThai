# Q0 independent test re-check of batch rfc-023-028's review round (PR #182)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Scope:** NARROW — the
review-round corrections, starting from my own findings Q0-R1..R8
(`evidence/WP-0A-DB-00/q0-batch-rfc-023-028-test-review-2026-10-03.md`).
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-023-028`, head `498a7ee282a652bc8589789ca69f4515e2ed28ed`
(the handoff, last and alone) over the code commit `abd48b384a4dad62e8f71589b9cca1db3a94508c`, base `921efb5`
(`main`); previous reviewed head `b0adf6b`. **Author:** `/claude/a0_atlas`.
**Tested on:** my own branch `recheck/q0-batch-rfc-023-028`, created at `498a7ee`. The repository commands ran on
the branch NAME (§1.1).
**Date:** 2026-10-05. The file name carries the phase's date (2026-10-03), as the batch's other records do.

This file records findings. It advances no status, approves nothing, test-verifies nothing on anyone's behalf, and
decides nothing that the Integration Owner, A1, A1 Identity or the Product Owner holds. It repairs nothing. It approves
neither RFC and answers none of Q-023-1..8 or Q-028-1..13.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and the same vendor and model family as the Author. A0's
workflow wrote my brief, chose the questions, the port and the output file, and A0 wrote the change under test. My
independence is the independence `RFC-2026-024` describes, and no more. Whether this record counts as the Tester role's
signature is for the Integration Owner and the Product Owner to decide, not me.

## 1. Measured versus read

**Setup for every measured run:** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`), printed before each run;
the PATH Node 26 was not used. PostgreSQL 17.11 from `/opt/homebrew/bin`. A fresh `initdb --locale=C -A trust -U
postgres` for every round, on 127.0.0.1:**5503** only, TCP only (`-c unix_socket_directories=''`), `LC_ALL=C`; the
shim `db/foundation/ci/supabase-shim.sql` first (exit 0 every round);
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`. Private directory `scratchpad/q0-rfc-023-028r2/`. I
touched no other port. The one migration drift (round r2) was appended to `db/foundation/migrations/140_audit.sql` and
restored from a private copy, checked with `cmp`; sha256 `2ac596bb950e8dfb…` before and after. `pg_hba.conf` edits
(§3.3) were restored and checked with `cmp`. The cluster was stopped and its data directory removed; at the end
`pg_isready -h 127.0.0.1 -p 5503` printed "no response". No secret file remains (0 `*.secret`). `git status
--porcelain` was empty before I wrote this file. Nothing was pushed.

**Measured:** the four repository commands on the branch name (§1.1); three database rounds (§2); every revised or new
RFC-2026-028 §5 drift that can run today (§3); RFC-2026-028 §3.1/§3.3/2's non-superuser-applier claims (§3.4);
RFC-2026-023 shape B applied with no pin moved, to read which guards fail (§4.1); RFC-2026-023 §8/2's revised closing
policy (§4.2); the citations and claims in §5.

**Read, not executed:** RFC-2026-028 §5/5 (the static `PASSWORD` rule), §5/13's harness check (the premise is
measured, §3.2), §5/14 (the snapshot rule over the login role) — none exists yet, each owed on `open_blockers[199]`
(8)(b); RFC-2026-023 §6's `scope_type` case (unchanged since I measured it at `b0adf6b`, Q0-R7); the platform half of
Q-028-13 and Q0-R1's ownership sentence (no platform access); C0's and A1's findings beyond whether the text now says
what the plan §7.2 row says it says.

### 1.1 Repository commands, on the branch NAME

The branch is checked out in A0's worktree. I ran `git checkout --ignore-other-worktrees
agent/claude/WP-0A-DB-00-batch-rfc-023-028` in my own worktree; `git branch --show-current` printed that name and HEAD
was `498a7ee282a652bc8589789ca69f4515e2ed28ed`. I committed nothing there and switched back to
`recheck/q0-batch-rfc-023-028` before any database round and before writing this file.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 921efb5 WP-0A-DB-00` | 0 | "all 14 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| `npm run check` | 0 | tests 685, pass 685, fail 0 |

## 2. Database rounds

Nothing a DB layer reads changed in the round (two RFC texts, the plan, one blocker string, the integrity manifest,
the handoff); the rounds exist to run drifts.

| round | `migrate-clean` | `rls-smoke` |
|---|---|---|
| r1, untouched | 0, "52 apply-time blocks, 38 re-run as written, 14 superseded and replaced" | 0, "1129 isolation case(s) passed"; "7 claim(s) discharged by execution" |
| r2, RFC-2026-023 shape B (§3.2's grant, policy, two helpers owned by `app_authz`, `EXECUTE` to `app_command`, and §5's `USAGE` on `app` to `app_command`) appended to `140_audit.sql`, no pin moved | **2**: "171_workspace_lifecycle_visibility.sql: after batch 171, app_authz holds 3 policies in schema app; RFC-2026-027 gives it exactly two (P0001)" — `171`'s own apply-time block refuses it at apply, since `140` runs first | 2 (not meaningful) |
| r3, untouched after restore | 0, the same as r1 | 0, the same as r1 |

## 3. RFC-2026-028 as revised: do the obligations execute, and does each drift fail?

"sim" is `PINNED_GRANT_PROBE_SQL` exported from today's `scripts/db/run.mjs` with §3.6's two pins simulated by text
substitution (as at `b0adf6b`). Static drifts each ran in their own rolled-back transaction on r1's cluster; live
cases connected as `app_worker_login` (created as §3.1 writes it, committed on the throwaway cluster).

### 3.1 Static (§5/2, §5/3)

| § | drift | probe | result |
|---|---|---|---|
| 3.1 | none | sim; client membership | pass, both |
| 5/2 | `grant app_command …`, `grant app_maintenance …` | sim | refused, fourth rule ✔ |
| 5/2 | `… with inherit true` | sim | **refused today**, table-level grant rule — as the revised text now says (Q0-R5) ✔ |
| 5/2 | `… with admin option` | sim | passes today; needs Q-028-10, as stated ✔ |
| 5/3 | **new**: `grant app_worker_login to app_maintenance` | sim | refused, fourth rule ("role membership(s) of a non-superuser role not pinned") ✔ |
| 5/3 | `grant app_worker_login to authenticated` | client membership | refused ✔ |
| 5/3 | `grant app_worker_login to authenticator` | — | `role "authenticator" does not exist` — the text now marks it snapshot-only (Q0-R6) ✔ |

### 3.2 Live (§5/7, §5/8, §5/10, §5/13, §4/1)

| § | measured |
|---|---|
| 4/1 | `pg_roles.rolpassword` for a role with **no** password: `********` — the revised block's reason for not reading it holds (Q0-R3) ✔ |
| 5/7 case | `42501: permission denied for schema app` (SQLSTATE and message, as now pinned) ✔ |
| 5/7 control (a) | membership re-granted `with inherit true`: `rows=0`, **no error** — the case goes red ✔ |
| 5/7 control (b) | `grant usage on schema app`: `42501: permission denied for table workspaces` — same SQLSTATE, **message changes**, so the pinned message goes red ✔ (Q0-R2 closed) |
| 5/7 restored | `permission denied for schema app` again ✔ |
| 5/8 drift (new) | before: `set local role app_command` → `permission denied to set role "app_command"`; with `grant app_command to app_worker_login`: `current_user = app_command` (red); after revoke: refused again ✔ |
| 5/10 drift (new) | case: `app.jobs` through the login role under `set local role app_worker` = **0**, through `postgres` = **2**; with `create policy … for select to app_worker using (true)`: **2** (red); after drop: 0 ✔ |
| 5/13 premise | on one connection as the login role: never set → null; after `set_config(…, true)` in a committed transaction → `''` (empty); after `set_config(…, false)` → the **next** transaction, after `set local role app_worker`, still reads the value. So the hazard is real and the revised check ("neither null nor empty") is the right shape. The harness does not exist; the case and its control are not executable yet (owed, `[199]` (8)(b)) |

### 3.3 Authentication (§5/12's new drift)

First line of `pg_hba.conf` `host all app_worker_login 127.0.0.1/32 scram-sha-256` (reloaded; `pg_hba_file_rules`
line 1 confirmed): no password with `-w` → `fe_sendauth: no password supplied` ✔. With `host all app_worker_login
127.0.0.1/32 trust` placed before it (lines 1-2 confirmed): no password → `connected as app_worker_login` (red) ✔.
Restored, `cmp` equal. No password was generated or used for this step.

### 3.4 The non-superuser applier (§3.1, §3.3/2, Q-028-13 — local half only)

In one rolled-back transaction, a role `q0_applier` (`nosuperuser createrole noinherit`, holding `app_worker` `with
admin true`) created the role as §3.1 writes it. `createrole_self_grant` = `''` (default). Result:

- member of `app_worker_login`: `q0_applier`, **admin=true inherit=false set=false, grantor=postgres** (the bootstrap
  superuser) — exactly §3.1's revised sentence ✔;
- the role's own membership: `app_worker`, admin=false inherit=false set=true ✔;
- `q0_applier` can `alter role app_worker_login password …` (random 32-byte throwaway, never printed, rolled back):
  **succeeded** — §3.3/2's "whoever holds `postgres`'s credential can set the worker's" holds on PostgreSQL 17 ✔;
- `revoke app_worker_login from q0_applier`, run as `q0_applier`: `WARNING: role "q0_applier" has not been granted
  membership in role "app_worker_login" by role "q0_applier"`, and the member count stays **1**. So locally the
  applier cannot drop its own admin row with a plain `REVOKE`. This is evidence for Q-028-13, not an answer: the
  platform's `createrole_self_grant` and its grantor are still unmeasured (finding Q0-RC3, INFO).

## 4. RFC-2026-023 as revised

### 4.1 Q0-R4: which guards shape B falsifies

On r3's migrated cluster I applied the same shape B as r2 by hand (exit 0) and ran each guard alone:

| guard | result |
|---|---|
| `invariants/011_authorization_helpers.2.sql` | exit 3, "app_authz holds 3 policies in schema app; … gives it exactly two" ✔ |
| `invariants/021_member_scope.1.sql` | exit 3, the same ✔ (its `:40-49` no-`SELECT` arm is not reached; read) |
| `171` rule 4 (`171:248-255`) | its query now reads five functions where it requires exactly the three helpers ✔ |
| `171` column check | 11 `app_authz` `SELECT` columns where it requires six ✔ |
| pinned grant probe (shipped) | exit 3, "unlisted: app_authz SELECT (business_profile_id) on app.workspace_member_scopes; …" ✔ |

Every guard RFC-2026-023 §5 now names fails closed; I found no other `app_authz` guard in `db/foundation/migrations`
or `invariants` that shape B falsifies (grep for the function-owner and policy-count checks). Q0-R4 closed.

### 4.2 §8/2's revised closing policy

Rolled-back prototype: `app_command` given `USAGE` on `app`, `SELECT (id, lifecycle_state)` and `UPDATE
(lifecycle_state, updated_by)` on `app.workspaces`, `EXECUTE` on `app.workspace_member_role` and `app.jwt_subject`,
and **exactly** §8/2's one policy (`FOR UPDATE TO app_command USING (app.workspace_member_role(id) = 'owner') WITH
CHECK (lifecycle_state in ('active', 'closing') and app.workspace_member_role(id) = 'owner')`). As `app_command` with
the owner's claims (`5c460eb8…`, workspace `c4840acc…`), `update app.workspaces set lifecycle_state = 'closing',
updated_by = app.jwt_subject() where id = …`:

- **as written: 0 rows, no error**; the state stays `active`. `app.workspaces` is forced and its only `SELECT`
  policies are `TO authenticated` and `TO app_authz`; an `UPDATE` whose `WHERE` reads a column also applies `SELECT`
  policies, so the row is invisible to `app_command` (finding Q0-RC1);
- with one `FOR SELECT TO app_command USING (app.workspace_member_role(id) is not null)` added: owner `active→closing`
  1 row; `closing→active` 1 row; `→access_blocked` refused `42501` "new row violates row-level security policy" (the
  `WITH CHECK` literal); a page-scoped non-owner 0 rows; the owner of a workspace already `access_blocked` 0 rows (the
  `USING` with no literal inherits the gate, as §8/2 says) ✔;
- the policy's `WITH CHECK` carries `171`'s literal and its `USING` carries none; `171`'s literal check
  (`171:278-296`) reads `polqual` (the `USING`) of three named policies and the helper body only, so the revised
  sentence that the implementing batch must extend that check to this `WITH CHECK` is accurate ✔ (C0-3).

## 5. Claims checked

**True, re-measured or read at the cited line:**

- Commits: `c008820`, `ceca0b6`, `9fa8f84` each carry `(cherry picked from commit …)` naming `bc0cb19`, `c7fb1cf`,
  `c4692ad`, and each review file's blob is identical to its source commit's (`f5a8675d…`, `ac03a551…`, `0476ec2f…`).
  `abd48b3` touches the two RFCs, the plan, `[199]` and the integrity manifest (as its message says); `498a7ee` touches
  the handoff only (last and alone).
- `[199]`: the only changed `open_blockers` entry; its `b0adf6b` text is a prefix of the new text (append-only, 5010 →
  8212 chars); the manifest still has 466 lines and only line 456 differs, so no line pin moved; no other manifest key
  changed. Questions: Q-023-1..8 and Q-028-1..13, twenty-one, as the handoff and plan say.
- Integrity manifest: only the two RFC digests changed (plan §7.3).
- Handoff: `base_revision` `921efb5`, head `abd48b3`, `final_status` `author_complete`; six files added and eight
  modified (14 = `verify-branch-scope`'s count); the DB commands carry **no** `exit_code`, result "NOT RUN" (Q0-R8's
  handoff half closed); the impact sentence states the `app_authz` policy omits `select_own`'s conjunct (A1 F6).
- Citations: `001:12` "holding no grant and no membership"; `001:44` "chunked backfills"; `RFC-2026-017:50`
  "backfills"; `RFC-2026-022:418-420` inside §5/8; `RFC-2026-027:12` names §5/3, §6.1/5, §6.1/6, §6.3/14;
  `021_member_scope.sql:534-539` (`select_own` with `is_active_member`); `020_business.sql:652-655`; `run.mjs:1354`
  (`PINNED_SCHEMA_PRIVILEGES`, no `app_command`), `:3821` (`KNOWN_SUPERUSERS = ['supabase_admin']`);
  `catalog-snapshot.json` `members_besides_admin: 0` (×3) and `_membership_note`; the CI workflow's `postgres:17`
  with `POSTGRES_PASSWORD` and `PGPASSWORD` (C0-2's reading).
- Plan §7.2: every Q0 row says what the RFC text now says (Q0-R1..R8), and §7.3's "not run (no exit code)" is
  consistent with the handoff. The disposition did not change in the round; my earlier reading of it stands.

**Incomplete:** RFC-2026-023 §6's list of RFC-2026-026 §8.2 command cases (Q0-RC2). Nothing I checked is false.

## 6. My earlier findings

| id | status | how I know |
|---|---|---|
| Q0-R1 | **closed in text**; owed to the implementing batch (`[199]` (8)(d), (e)) | §0/6 and §5 name the grant and the pin; r2/§4.1 applied them |
| Q0-R2 | **closed** | §3.2: both controls go red against the pinned message |
| Q0-R3 | **closed** | §4/1 no longer reads `pg_authid`; `********` re-measured |
| Q0-R4 | **closed** | §4.1: every guard named fails; none unnamed found |
| Q0-R5 | **closed** | §3.1 |
| Q0-R6 | **closed** | §3.1: snapshot-only; the new live drift fails |
| Q0-R7 | **closed in text** | §6 now says first call and makes it a case (measured at `b0adf6b`) |
| Q0-R8 | **closed** | §3.2, §3.3: the three named drifts go red; the handoff carries no exit code |

## 7. Findings (new in this re-check)

| id | grade | where | finding | remedy |
|---|---|---|---|---|
| Q0-RC1 | LOW | `architecture/decisions/RFC-2026-023-acting-user-narrowing.md:165` (§8/2) | **Measured:** with §8/2's grants and its one `FOR UPDATE TO app_command` policy, the owner's `update app.workspaces set lifecycle_state = 'closing' … where id = …` as `app_command` moves **0 rows with no error** — `app.workspaces` is forced and no `SELECT` policy reaches `app_command`, and an `UPDATE` that reads a column applies `SELECT` policies. The same holds for §8/1's body, which must read the old state to validate the transition. Fails closed (nothing moves), and `RFC-2026-026` §8.2/6 ("the command changes the row") would catch it; but the text as written cannot work, and a body that ignores `row_count` could report success. | Add to §8/2 one `FOR SELECT TO app_command` policy on `app.workspaces` (e.g. `USING (app.workspace_member_role(id) is not null)`, measured working above), with its policy-set pin; or state that the body reads and writes only through a helper. Require the body to refuse when `row_count <> 1`. |
| Q0-RC2 | INFO | `RFC-2026-023-acting-user-narrowing.md:147` (§6) | The corrected list of `RFC-2026-026` §8.2's command-producer cases (`/6`-`/11`, `/14`, `/16`-`/20`) omits `/13` ("`UPDATE`, `DELETE`, `TRUNCATE` by **either** producer") and `/15` (`140`'s cases that flip when a producer lands). Read. | Add `/13`'s command half and `/15`, or say why they are excluded. |
| Q0-RC3 | INFO | `RFC-2026-028-worker-identity.md:177-181` (§3.3/2), `:432` (Q-028-13) | Not a defect: §3.3/2 says whether the applier can revoke its admin row is "read, not measured". **Measured locally** (PostgreSQL 17.11, `createrole_self_grant = ''`): the row is `admin t, inherit f, set f, grantor postgres`; the applier can set the role's password; a plain `revoke … from` by the applier is a no-op with a `WARNING` (it is not the grantor), leaving the member count at 1. The platform half stays owed. | Cite this as the local half of Q-028-13's measurement if useful; keep the platform half owed with Q170-c. |

None of these is live: no role, helper, grant or policy is created by this batch, and every guard I exercised fails
closed.

## 8. Answers to the brief

- **Are RFC-2026-023's and RFC-2026-028's test obligations executable as written, each with a drift that would fail if
  the mechanism were missing?** RFC-2026-028: yes for every obligation that can run today — §5/1-§5/4 and §5/6 fail by
  name against today's probes once §3.6's pins move (re-measured where revised: §5/2, §5/3's new drift), and the live
  §5/7, §5/8, §5/9, §5/10 and §5/12 each have a drift that goes red (measured: §5/7's two controls, §5/8, §5/10, §5/12).
  §5/5, §5/13 and §5/14 need a rule, a harness or a snapshot rule that does not exist yet; each is owed on `[199]`
  (8)(b), and §5/13's premise is measured. RFC-2026-023: §6's cases and controls execute (as at `b0adf6b`), shape B's
  guard list is complete (§4.1); §8's closing command does not work as §8/2 writes its policies (Q0-RC1).
- **Plan, disposition and blocker claims:** true where checked (§5); `[199]` (8) is append-only and moves no pin.
  `npm run check` passes, 685/685.
- **Commit messages, plan, disposition, blocker edits and handoff:** true (§5), with one incomplete list (Q0-RC2).
- **`verify-branch-scope`, `npm run verify`, `npm run check:handoff` on the branch name:** 0, 0, 0.
- **Stop-the-line:** **none.** No secret, tenant leak, lost job, migration divergence or contract mismatch is live; the
  batch is text, and the one new defect fails closed in a Proposed design.
- **Does anything block the merge?** Nothing from this role. Q0-RC1 should be folded into RFC-2026-023 §8/2 (or
  recorded on `open_blockers[199]`) before Q-023-4 is answered, since §8 is the proposed first command function.

## 9. Limits

- One vendor and model family as the Author (§0).
- PostgreSQL 17.11 only; the platform's version, pooler (Q-028-12), non-superuser migration owner and `md5` were not
  measured. §3.4's applier is a local simulation.
- §3.6's pins were simulated by text substitution into the exported probe SQL, not by editing `run.mjs`.
- The shape B and §8/2 prototypes are my own writing of the RFC text; no command function body, audit row or step-up
  check was built.
- C0's and A1's findings were checked only as far as the plan §7.2 rows and the cited lines; their own re-checks are
  theirs.
- Private scripts and logs (`round.sh`, `static.sh`, `live.sh`, `hba.sh`, `applier.sql`, `closing.sql`,
  `drift-shapeb.sql`, `guards.sh` and their logs) stay in the private directory and are not evidence by themselves;
  this file is.
