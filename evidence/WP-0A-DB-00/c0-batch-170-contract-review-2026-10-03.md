# C0 contract review: batch 170 (first migration), no client moves a workspace's lifecycle state

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00` |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-170` (PR #175, Draft) |
| Subject head | `ff13fafe0714699da3eb2b173b89a0ce4480e6e3` (handoff refresh, alone), over code `03dbd30` and evidence `e7f9c2c` |
| Base | `9a07459` (`main`, the merge of #174) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (file name carries the phase date, 2026-10-03) |
| Reviewed in | local branch `review/c0-batch-170`, created at `ff13faf` in a worktree. The guards that read the branch name were run with the subject branch NAME checked out (`git checkout --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-170`, same SHA, nothing written), then I switched back to `review/c0-batch-170` before writing this file. |
| Scope | `git diff 9a07459..ff13faf` whole; the plan `a0-batch-170-plan-2026-10-03.md`; the disposition `product-owner-disposition-2026-10-03-batch-170.md`; the RFC batch's disposition §5, §7 and §8 (the Owner's answers); `open_blockers[195]` before and after; ERD §11.4 (`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:571-600`); `010_identity.sql` where cited; the handoff. |

This document records review findings. It advances no status, approves nothing, and signs nothing on
anyone's behalf.

## §0 What I am, before anything else

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**, in a git worktree A0's workflow
  created, under a brief A0's workflow wrote. A0 chose the questions I answer.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the
  cross-vendor condition, so that is not by itself a bar; it is still a real limit on independence.
- Whether this file counts as the Reviewer signature RFC-2026-002 requires is for the **Integration
  Owner and the Product Owner** to decide. I do not decide it. I do not accept Q-026-5, Q-027-5 or
  Q-027-6 for A1 or the Integration Owner.

## §1 Verdict in one paragraph

Migration 170 is a correct forward change. It revokes exactly one column (`lifecycle_state`) from one
role's (`authenticated`) UPDATE grant on `app.workspaces`, replaces the column comment with a superset of
010's text, and adds an apply-time block. No integrated migration is edited (`010` and `140` are
byte-identical to `9a07459`; the only file under `db/foundation/migrations/` in the diff is the new `170`).
Every pin, case and declared list moved for a stated reason, and each one I re-derived holds. The change
matches Q-026-5 / Q-027-5 as the Owner answered them (revoke, in the first of batch 170's migrations; RFC
batch disposition §7 and §8) and is the only §11.4-consistent reading available today: a client UPDATE is
neither "owner confirms + step-up" nor "write audit event". The record is honest that nothing on a request
path writes `lifecycle_state` until the §11.4 command: I measured no function in `app` or `private` that
writes `app.workspaces`, no client or service role with UPDATE/INSERT on the column, and `app_worker`'s
only member is `postgres`. Every claim I checked in the commit messages, plan, disposition, blocker edit
and handoff is true. Four findings, all INFO. **No stop-the-line. Nothing I found blocks the merge.**

## §2 Measured vs read

### 2.1 Measured (by me, this run)

Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`, checked before every run; the PATH Node 26 was not
used). PostgreSQL 17.11 (`/opt/homebrew/bin`), port **5505** on 127.0.0.1 only, TCP only
(`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, shim
`db/foundation/ci/supabase-shim.sql` first, re-initdb every round. Private directory `c0-170/` in the
session scratchpad. Cluster stopped and its data directory removed at the end; 5505 not listening after.

| # | command / round | head, branch | exit | result |
|---|---|---|---|---|
| M1 | `node scripts/verify-branch-scope.mjs 9a07459 WP-0A-DB-00` | `ff13faf` on `agent/claude/WP-0A-DB-00-batch-170` | 0 | "all 14 changed path(s) are declared, and every amendment explains one" |
| M2 | `npm run check:handoff` | same | 0 | "describes the branch: nothing substantive after its cited head" |
| M3 | `npm run verify` | same | 0 | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |
| M4 | r1: shim, `make db-migrate-clean`, `make db-rls-smoke` | `ff13faf` | 0, 0, 0 | `applied 170_workspace_lifecycle_not_client_writable.sql`; "post-migrate pass: 51 apply-time blocks, 39 re-run as written, 12 superseded and replaced"; **1087** isolation cases passed |
| M5 | r1's database, `grant update (lifecycle_state) on app.workspaces to authenticated` by hand (the pre-170 privilege), then `make db-rls-smoke` | `ff13faf` | 2 | "FAILED — 7 of 1087": exactly the seven new refusals; the rename positive passed. Messages as plan §4 states: closing-by-id, returning-a-constant and PostgREST-shape "1 row(s) came back"; access-blocked-by-id "refused it at the policy layer"; no-where, where-true and purge "returned zero rows rather than refusing" |
| M6 | `forms.sql` (my own probe; synthetic ids, one transaction rolled back) on M5's database (pre-170 privilege) | — | — | targeted to `closing`: UPDATE 1; targeted to `held`: 42501 "new row violates row-level security policy"; **`set lifecycle_state = 'purge_queued'` with no WHERE: UPDATE 2, both owned workspaces moved to `purge_queued`, the other owner's untouched**; every later owner UPDATE then UPDATE 0 (cannot move back); client INSERT: 42501 privilege |
| M7 | r2: fresh cluster, migrate-clean, rls-smoke, then `forms.sql` | `ff13faf` | 0, 0 | 1087 cases; all seven lifecycle forms (targeted closing, targeted held, column alone no WHERE, `where true`, PostgREST CTE no filter, `set lifecycle_state = lifecycle_state`, INSERT with a state) **42501 "permission denied for table workspaces"**; states unchanged; owner rename `returning name` UPDATE 1 |
| M8 | catalog read on r1 (`privs.sql`) | `ff13faf` | — | `has_column_privilege(…, 'lifecycle_state', UPDATE / INSERT / UPDATE WITH GRANT OPTION)`: false for anon, authenticated, public, service_role, app_command, app_authz, app_maintenance; true (UPDATE, INSERT) for app_worker only. Column privileges: authenticated UPDATE = `name, updated_by`; relacl `{postgres=arwdDxtm/postgres,app_worker=arw/postgres}` (no table-level client grant). Policies unchanged: `workspaces_select_active_member` (r, permissive), `workspaces_update_owner` (w, permissive), `workspaces_updated_by_on_update_is_caller` (w, restrictive). Only trigger: `set_updated_at`. No function in `app`/`private` whose source contains `update app.workspaces` or `insert into app.workspaces`. `app_worker`'s only member: `postgres`. Column comment = 010's text plus the batch 170 sentence. |
| M9 | drift d1, `grant update on app.workspaces to authenticated;` appended to `140_audit.sql` | — | 2 | 170's block: "a client role can write app.workspaces.lifecycle_state: authenticated UPDATE (P0001)" |
| M10 | drift d2, `grant app_worker to authenticated;` | — | 2 | **170's block did NOT fire** (170 applied); migrate-clean refused at the client membership probe and the pinned grant probe: "client role(s) members of a role not pinned … authenticated -> app_worker" (C0-170-1) |
| M11 | drift d3, `grant app_worker to authenticated with inherit false;` | — | 2 | same as d2 |
| M12 | drift d4, `grant update (lifecycle_state) on app.workspaces to anon with grant option;` | — | 2 | 170's block: "anon UPDATE, anon UPDATE WITH GRANT OPTION (P0001)" |
| M13 | `140_audit.sql` restore after each drift | — | — | sha256 prefix `2ac596bb950e8dfb` before and after every drift; `git status` clean |
| M14 | r3: fresh cluster, migrate-clean, rls-smoke; then `DB_TEST_URL=… node scripts/db/generate-pinned-grants.mjs --check` | `ff13faf` | 0, 0, 0 | 1087 cases; "pinned-grants.json: matches the catalog", "read-allowlist-known-exceptions.json: matches the catalog", 66 tables |
| M15 | `rolinherit` on d2's/d4's database | — | — | anon, authenticated, service_role, app_worker: `rolinherit = f` |
| M16 | static: `git diff --name-status 9a07459 HEAD -- db/foundation/migrations` | — | — | `A 170_…` only; `010` and `140` unchanged |
| M17 | static: line pins | — | — | `audit-coverage-map.json` 33 changed lines, `retention-map.json` 19 (52 total); `open_blockers` opens at manifest line 254, `open_blockers[0]` is on line 255 and `[195]` on line 450, so 255+i holds |
| M18 | static: `open_blockers` before/after | — | — | 196 entries both sides; only `[195]` changed, and only by appending (8) and (9) after the old text, which is byte-identical as a prefix |

The rls-smoke ran three times green on the subject head (r1, r2, r3) and once red on the pre-170 privilege.
I did not check out `main` and re-run its forms; M5/M6 restore the one privilege 170 removes on an otherwise
170-migrated database, which differs from `9a07459` only by that grant and the column comment.

### 2.2 Read, not measured

- The Owner's words and their transcription (RFC batch disposition §5 rows Q-026-5, Q-027-5, Q-027-6; §7 the
  re-recommendation "revoke … in the first of batch 170's migrations … whichever lands first"; §8 the answer
  `ลุยต่อเลย เอาตามแนะนำ` and "What these answers unblock now"). I did not see the Owner say them.
- A0's own rounds on port 5507 (before1 1079 cases, draft1/draft2, d1-d5) and its 72-attempt
  `lifecycle-forms.sql` (read in `a0-170r/`; its shape matches plan §2). My M6/M7 reproduce its direction on
  a subset of forms, not the 72-cell table.
- The CI run on the head: not looked at; PR #175's required check is the Integration Owner's to read.
- #174's merge record (`9a07459`, 2026-10-04T04:35:58Z, run 37177130592): read in the disposition, not
  re-checked against GitHub.

## §3 The questions

### 3.1 Is 170 a correct forward change?

Yes.

- **No integrated migration edited** (M16). 010's grant at `010_identity.sql:403` stays in its text; the
  static test asserts it (`foundation-contract.test.mjs`, the batch 170 block). 010 has no apply-time
  block, so no `superseded.json` entry is owed; the post-migrate count (51 = 39 + 12) is consistent with 170
  adding one block re-run as written.
- **Only the column grant revoked.** The file has one `revoke` and no `grant`/DDL (static test, and my
  read of `170_…sql:69-75`); M8 shows every other privilege and every policy on the table as before.
- **Every pin, case and list moved legitimately:**
  - `pinned-grants.json`: a one-line diff (`"UPDATE": ["name", "updated_by"]`), and the generator in
    `--check` mode agrees with the live catalog (M14).
  - pinned grant probe digest `baa6379790cb8733` → `eb5ecbffb7f4f3cf`: follows from the embedded list;
    `npm run verify` green (M3).
  - `catalog-snapshot.json` and the test's `NOT_ON_THE_INSTANCE`: 170 appended after 150, so the declaration
    stays a tail.
  - assertion floor 932 → 942: the new static block has ten assertion call sites (three `deepEqual`, one
    `ok`, one `equal`, one `doesNotMatch`, four `match`), which is the guard's own count; no test is added
    or renamed, so 684 holds and `evidence/VERIFICATION.md` is rightly not declared.
  - manifest: branch slot, three amendment paths each explained (M1 green), 52 line pins re-derived (M17).
  - eight rls-smoke cases: each refusal discriminates the gap (M5), including the three column-free forms
    `open_blockers[195]` (4) requires (A1 F1-a on the RFC batch); the positive keeps the refusals honest.

### 3.2 Does it match Q-026-5 / Q-027-5 as answered, and ERD §11.4?

Yes, with the INFO note C0-170-2 on Q-027-6.

- Q-026-5 / Q-027-5: the answer as transcribed (RFC batch disposition §7, carried by §8) is "revoke … in the
  first of batch 170's migrations, any job that selects workspaces by lifecycle_state, or RFC-027's
  migration — whichever lands first". 170 is the first file in 170's range and lands before either other
  vehicle; it depends on neither RFC (C0-8 on the RFC batch, still true: the file reads nothing RFC-026 or
  RFC-027 defines).
- ERD §11.4 (`sprint-0a-core-erd-rls-retention-th.md:571-600`): Active → Closing is "owner confirms +
  step-up" and step 1 is "Mark Workspace `closing`; write audit event". Before 170 a client UPDATE performed
  that transition with neither (M6: targeted `closing` admitted), and the column-free forms jumped straight
  to `purge_queued` past the recovery window. After 170 no client performs any transition (M7). The cost —
  Active → Closing and Closing → Active have no path at all until the command exists — is stated in the
  migration header, the plan §5, the disposition §5 and `open_blockers[195]` (9). That cost is the Owner's
  accepted consequence ("no workspace can then be closed until the §11.4 command exists, which is acceptable
  for a single-user Pilot", RFC batch disposition §5 row Q-026-5).

### 3.3 Is the record honest that no writer exists until the §11.4 command?

Yes. M8 shows no client or service role (other than `app_worker`) holding UPDATE or INSERT on the column, no
function in `app`/`private` that writes `app.workspaces`, and `postgres` as `app_worker`'s only member. "No
workspace changes state except by a superuser's hand" is therefore accurate on the clean set. `[195]` (9)
cross-references `[21]` and `[113]` rather than copying them, and names the owner (A0 author, A1 review,
after RFC-2026-023's approval).

### 3.4 Are the claims true?

Every claim I checked holds:

- Commit `03dbd30`: one revoke, comment replaced, block's three checks, 010 unedited, pin one line, digest
  pair, 1079 → 1087 cases (1087 measured; 1079 read), floor 932 → 942, 52 pins, 256+i → 255+i. True.
- Commit `e7f9c2c` and the plan: 48/72 before (read), 0/72 after (direction reproduced, M7), drifts appended
  to 140 and restored byte for byte (A0's sha prefix `2ac596bb950e8dfb` equals mine), seven cases fail on the
  pre-170 privilege (M5, same messages). Plan §2's "who can write the column after" list matches M8 exactly.
  Plan §0.1's scope check says "11 changed paths" on `03dbd30`; on the head it is 14 (M1), the three
  evidence/handoff files added after — consistent.
- Disposition: "No new words since the last batch", the merge of #174 "executed, not decided", and the
  RFC-2026-025 §5 / RFC-2026-002 literal-rule caveat are stated without overclaiming.
- `open_blockers[195]`: appended only (M18); (8) and (9) say what I measured.
- Handoff: `head_revision_or_patch_checksum` = `e7f9c2c`, committed last and alone (M2 green);
  `known_limitations` names the hand-restored pre-170 leg, which is the same limit I state in §2.1.

## §4 Findings

| ID | Grade | Where | Finding | Remedy |
|---|---|---|---|---|
| C0-170-1 | INFO | `db/foundation/migrations/170_workspace_lifecycle_not_client_writable.sql:81-93` | Check 1 reads `has_column_privilege`, which for the NOINHERIT client roles (M15) does not see a role membership: drifts d2/d3 (`grant app_worker to authenticated`, with or without `inherit false`) pass 170's block, although `SET ROLE app_worker` would then reach the column. The header's "a later file that grants the column back to a client fails migrate-clean here" holds for direct grants only. **Not a gap in the aggregate**: the client membership probe and the pinned grant probe refuse both drifts in the same migrate-clean (M10, M11). | None required. On the next touch of this file, one comment line saying membership is held by the client membership probe, not by this block. |
| C0-170-2 | INFO | `170_…sql:3`; `product-owner-disposition-2026-10-03-batch-170.md:46`; manifest rationale (`work-packages/WP-0A-DB-00.json:120`) | Q-027-6 as answered was about RFC-027's migration, "landing after approval and before any batch that relies on the gate" (RFC batch disposition line 105). The revoke's number rests more directly on §7's "the **first** of batch 170's migrations". Citing Q-027-6 for 170 is a stretch, not an error: the number is the same, and the disposition already says the Integration Owner's acceptance of Q-027-6 is owed (`:48-49`). | None for this merge. The Integration Owner's acceptance of Q-027-6 should say whether it covers the revoke's number as well as RFC-027's. |
| C0-170-3 | INFO | `db/foundation/lint/pinned-grants.json:3` | `_how_measured` still says the list was generated "through 140" (A0's F4). It was regenerated through 170 (M14 agrees with the catalog). Prose only. Its effect on the probe digest is not something I measured. | Rewrite the header when the generator is next touched, or have the generator write the last migration's name. |
| C0-170-4 | INFO | `open_blockers[195]` (9); plan §5; disposition §5 | Not a defect, a consequence held in view: until the §11.4 command lands, an owner can neither request closing nor cancel it, and the workspace's state is moved only by a superuser. The record says so plainly and assigns it. `app_worker` keeps table-level INSERT/UPDATE on the table with no worker policy (A0's F2, held on `[113]`). | None here. Whoever writes RFC-2026-023's first command function owes the §11.4 transition with step-up and its audit row. |

No CRITICAL, HIGH, MEDIUM or LOW finding.

## §5 Stop-the-line

**No stop-the-line.** No secret, tenant leakage, duplicate external side effect, lost job, migration
divergence (170 is declared not applied, the tail lint is green), irreversible deletion or contract mismatch
is introduced. The batch removes the precondition of both stop-the-line conditions `open_blockers[195]` (4)
named. **Nothing I found blocks the merge.** Whether the RFC-2026-002 / RFC-2026-025 merge bar is met
(green required CI on the head, A1 and Q0 evidence, Integration Owner evidence) is not mine to judge.

## §6 Limits

- Same vendor and model family as the Author, spawned by the Author's workflow (§0).
- I did not run the large harness, did not look at CI, and did not re-run A0's 72-cell table on `main`; my
  before-side is the pre-170 privilege restored by hand on a 170-migrated database (§2.1).
- Drifts were appended to `140_audit.sql` only; a drift in a file sorting after 170 (re-run of 170's block
  by the post-migrate pass) was not exercised, because only 140 is the agreed drift site.
- I measured on the clean set with the CI shim, not on the provisioned instance, where 170 is not applied.
- The subject branch name was checked out in this worktree with `--ignore-other-worktrees` for M1-M3 only,
  at the same SHA, nothing written; this file is committed on `review/c0-batch-170`.
