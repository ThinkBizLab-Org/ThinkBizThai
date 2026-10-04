# A1 security review: batch 170, no client moves a workspace's lifecycle state

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-170` (PR #175, Draft, open, not merged), head
  `ff13faf` (`ff13fafe0714699da3eb2b173b89a0ce4480e6e3`) over code `03dbd30`
  (`03dbd30888aef53fe15402ccfa79c51b7068a2aa`), base `9a07459` (main). Author `/claude/a0_atlas`.
- **Checked out as:** local branch `review/a1-batch-170` at `ff13faf`, in this run's own worktree. For
  `verify`, `check:handoff` and branch scope I checked out the branch NAME `agent/claude/WP-0A-DB-00-batch-170`
  in the same worktree (`git checkout --ignore-other-worktrees`; the ref already pointed at `ff13faf`
  locally and on origin, and was not moved; `git rev-parse --abbrev-ref HEAD` printed the name), ran the
  three commands, and switched back to `review/a1-batch-170` before writing this file. Nothing was
  committed on the branch name.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch. I am the same vendor
and model family as the Author. Under RFC-2026-024 that is the stated independence limit of this role run.
Accepting this review as the A1 role's signature -- including A1's acceptance owed on Q-026-5 / Q-027-5 --
is the Integration Owner's and the Product Owner's act, not mine. This file is input to that acceptance.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-170-plan-2026-10-03.md` and the disposition
`product-owner-disposition-2026-10-03-batch-170.md`, in full; the three commit messages `9a07459..ff13faf`;
`git diff 9a07459..ff13faf` (the migration in full; the eight cases; the static block in
`foundation-contract.test.mjs:3303-3327`; the floor, digest, snapshot, pin, branch-slot and
integrity-manifest hunks; the manifest's rationale and `open_blockers[195]` (8)-(9) by script; the
handoff's tests and limitations by script); `010_identity.sql:150-170, 395-405, 475-520`; `pinned-grants.json:1-5,
219-222`; `scripts/db/run.mjs:478` (`CLIENT_ROLES`).

**Measured.** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`; `node -v` checked inside every
round script and before every npm run; the PATH Node 26 was never used). PostgreSQL 17.11 from
`/opt/homebrew/bin`, port **5501** on `127.0.0.1` only, `unix_socket_directories=''`,
`initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the shim first, re-initdb every round. Private
directory `a1-170/` in the run's scratchpad. The cluster was stopped and its data directory removed at the
end; nothing listens on 5501. No other port was touched.

| # | command | head / state | exit | result |
|---|---|---|---|---|
| r1 | shim, `make db-migrate-clean`, `make db-rls-smoke` | `ff13faf`, fresh cluster | 0, 0 | post-migrate pass 51 blocks, 39 as written, 12 replaced; smoke ok |
| C | `catalog.sql` (§2.1) as postgres on r1's database | r1 | 0 | §2.1 |
| P-after | `paths.sql` (§2.2): 25 forms x {authenticated as the owner of two workspaces, anon}, 7 positives | r1 | 0 | 0 of 48 real client attempts admitted (2 SET ROLE rows are a harness artefact, §2.2); 7 of 7 positives admitted |
| S | login role `a1_login` (member of authenticated only), `set role app_worker / postgres / service_role`, then UPDATE and MERGE of the column | r1 | -- | every SET ROLE but `authenticated` refused "permission denied to set role"; UPDATE and MERGE refused 42501 "permission denied for table workspaces" (role dropped afterwards) |
| P-pre | r1's database + `grant update (lifecycle_state) on app.workspaces to authenticated` (the pre-170 privilege) by hand, `paths.sql` | r1+grant | 0 | 12 real forms admitted (§2.2) |
| smoke-pre | `make db-rls-smoke` on that database | r1+grant | 2 | "FAILED -- 7 of 1087": exactly the seven new refusal cases; the rename positive passes |
| dA | append `grant update (lifecycle_state) on app.workspaces to authenticated with grant option;` to `140_audit.sql` | `ff13faf`+drift | 0 | 170's revoke removes privilege and grant option; column ACL after: `{authenticated=r/postgres}` |
| dB | append `grant app_worker to authenticated with inherit false;` | +drift | 2 | refused by the **client membership probe** and the **pinned grant probe** ("authenticated -> app_worker"), not by 170's block (F170-1) |
| dC | append a `security definer` `app.a1_close_workspace(uuid)` that sets `lifecycle_state = 'closing'`, EXECUTE to authenticated | +drift | 2 | refused by the **security definer probe** ("not a pinned SECURITY DEFINER function") |
| dD | append `create view app.a1_workspaces_v as select id, lifecycle_state from app.workspaces; grant select, update ... to authenticated;` | +drift | 2 | refused by the **client privilege probe** ("not pinned or not security_invoker"), the pinned grant probe and the read allowlist probe |
| dE | append `grant update on app.workspaces to authenticated;` (table level; A0's d1, re-run) | +drift | 2 | refused by **170's block**: "a client role can write app.workspaces.lifecycle_state: authenticated UPDATE" |
| -- | `140_audit.sql` sha256 prefix before / after each drift | -- | -- | `2ac596bb950e8dfb` / `2ac596bb950e8dfb` every time; `git status` clean |
| r2 | shim, migrate-clean, rls-smoke | `ff13faf`, fresh cluster | 0, 0 | same counts as r1 |
| F-after | A0's `lifecycle-forms.sql` (copied into `a1-170/`, unedited) | r2 | 0 | 9 forms x 8 states: **0 of 72 admitted**, 72 refused 42501; both rename positives admitted |
| F-pre | same, after `grant update (lifecycle_state) ... to authenticated` by hand | r2+grant | 0 | **48 of 72 admitted** (4 column-reading forms x active/closing = 8; 5 column-free forms x 8 states = 40) |
| V1 | `node scripts/verify-branch-scope.mjs 9a07459 WP-0A-DB-00` | branch name, `ff13faf` | 0 | "all 14 changed path(s) are declared, and every amendment explains one" |
| V2 | `npm run check:handoff` | branch name | 0 | "describes the branch: nothing substantive after its cited head" |
| V3 | `npm run verify` | branch name | 0 | "clean: exit 0 -- tests 684, pass 684, fail 0, skipped 0, todo 0"; tree clean after |
| V4 | blocker line-pin re-derivation (script): every `WP:N (open_blockers[i])` in `retention-map.json` and every manifest `line` in `audit-coverage-map.json` | `ff13faf` | -- | 52 of 52 equal `255+i` and land on the blocker's own line |

## 2. The questions

### 2.1 Can any client role still move `lifecycle_state` by any path? **No (measured).**

Catalog, on the migrated clean set (`catalog.r1.log`):

- **Privileges.** Column ACL of `lifecycle_state` is `{authenticated=r/postgres}`; table ACL
  `{postgres=arwdDxtm/postgres,app_worker=arw/postgres}`. `has_column_privilege` UPDATE and INSERT on the
  column: false for anon, authenticated, PUBLIC, service_role, app_authz, app_command, app_maintenance; true
  for app_worker and postgres only. No client role holds table-level UPDATE, INSERT, TRIGGER, TRUNCATE or
  DELETE on `app.workspaces`.
- **Role reach.** anon and authenticated are members of no role (`pg_has_role` MEMBER: zero rows); a login
  role holding only `authenticated` cannot `SET ROLE` to app_worker, postgres or service_role (run S).
  app_worker's only member is `postgres` (inherit false, set true).
- **Views / rules.** No relation depends on `app.workspaces` through a rewrite rule (no view, matview); no
  non-`_RETURN` rule exists in any user schema.
- **Triggers.** The only user trigger on `app.workspaces` is `set_updated_at` (`private.set_updated_at()`);
  no trigger function anywhere mentions `workspaces` or `lifecycle_state`.
- **Functions.** No user function's body writes `app.workspaces` (`update|insert into|merge into`). Five
  SECURITY DEFINER functions exist; two are client-executable, `app.is_active_member(uuid)` and
  `app.workspace_member_role(uuid)`, both `sql`, read-only, neither mentioning the column.
- **Foreign keys.** Eighteen reference `app.workspaces(id)`, all NO ACTION on update and delete; none
  touches the column (attnum 3).
- **Schemas / defaults / event triggers.** No client role has CREATE on any schema; no default ACL; no event
  trigger. RLS on `app.workspaces` is enabled and forced; the three policies are 010's two and 105's
  restrictive closure, all `{authenticated}`, unchanged.

Behaviour (`paths.after.log`, as authenticated with the owner's claims and as anon): every form below was
refused, authenticated by 42501 "permission denied for table workspaces" (or "must be owner" for ALTER),
anon by 42501 "permission denied for schema app":

UPDATE targeted to `closing` and to `active`; no WHERE to `purge_queued`; `where true`; `returning 1`;
`set lifecycle_state = default`; `set lifecycle_state = lifecycle_state`; row constructor
`set (name, lifecycle_state) = (...)`; sub-select SET; `UPDATE ... FROM`; the PostgREST CTE with no filter;
**INSERT ... ON CONFLICT (id) DO UPDATE SET lifecycle_state**; INSERT naming the column; INSERT ... ON
CONFLICT with the column in VALUES; **MERGE ... WHEN MATCHED THEN UPDATE SET lifecycle_state** (targeted
and `on true`); MERGE ... WHEN NOT MATCHED INSERT with the column; COPY; a client-created **temporary
view** updated; a client-created **`pg_temp` SECURITY DEFINER function** (it runs as its creator, the
client); **CREATE TRIGGER** on the table; ALTER TABLE ... SET DEFAULT; TRUNCATE; DELETE.

The two `set_role_worker` rows reading "ADMITTED rows=0" are an artefact of the probe, not a path: the
DO block's session user is the superuser, and `SET ROLE` checks the session user. Run S measures the
client's own reach and refuses it.

Discrimination (`paths.pre170grant.log`): with the pre-170 privilege restored, 12 of the same forms are
admitted and move the state (targeted, no WHERE, `where true`, `returning 1`, `= default`, self-assign, row
constructor, sub-select SET, PostgREST CTE, temporary view, `pg_temp` definer function; MERGE and `UPDATE
... FROM` were refused there by the SELECT policy on the new row). So the after-result is the revoke's,
not the probe's. A0's own 72-attempt matrix reproduces exactly: 48 admitted before, 0 after (F-pre,
F-after).

Regressions on the other paths are held by probes other than 170's block (dB, dC, dD), and a table-level
grant by 170's block (dE). A column grant issued before 170 is removed by it, grant option included (dA).

### 2.2 Did the revoke remove anything a client legitimately needs? **Nothing in this repository; one
§11.4 capability, stated.**

- authenticated keeps UPDATE `(name, updated_by)` and its seven-column SELECT (catalog C13). The owner's
  targeted rename, rename alone, `updated_by` alone, unfiltered rename, `SELECT lifecycle_state`,
  `SELECT ... FOR UPDATE` and the PostgREST PATCH of `name` are all admitted (P-after positives, 7 of 7).
- No other code path in the repository writes the column as a client: `git grep lifecycle_state` outside
  evidence and docs finds only migrations, lint data, the fixture (inserted as postgres) and the new cases.
  The rls-smoke suite (1087 cases, both rounds) passes, so no pre-existing case depended on it.
- What is lost is §11.4's owner-initiated Active -> Closing and Closing -> Active (cancel). Before 170
  those were reachable only through the same unbounded grant that was the finding; after 170 they have
  no client path. That is the Owner's answer to Q-026-5 / Q-027-5, and A0 records it plainly on
  `open_blockers[195]` (9), owed to the batch that writes RFC-2026-023's first command function. I agree
  it is the right side of the trade: a closing nobody can request is recoverable; an unaudited move past
  the recovery window is not. Pre-G0, with no production data, there is no workspace stranded in
  `closing` by the change.

### 2.3 Is `open_blockers[195]`'s finding closed? **Yes (measured).**

(8) is true as written: one statement, nothing else changed, anon and PUBLIC held nothing, the block holds
all three client roles, the pin moved, 48/72 -> 0/72, seven grant-layer refusals that fail on the pre-170
privilege and a positive that passes on both. Both conditions of (4) now have their precondition. (9)
cross-references `[21]` and `[113]` without copying them. The rest of [195] ((6), (7), the roles'
acceptance, RFC approval) stays open, as A0 says.

## 3. Claims checked

| claim (where) | verdict |
|---|---|
| 170 contains one `revoke` and nothing else but a comment and a block (commit `03dbd30`, plan §1) | TRUE (read; static test; catalog ACL) |
| anon and PUBLIC held no privilege on the column before 170 (migration :38-40, plan §1) | TRUE (pre-170 ACL measured as `{authenticated=rw/postgres}` plus table ACL without anon/PUBLIC; has_column_privilege false) |
| every recorded form fails 42501 "permission denied for table workspaces" before any policy is read (migration :40-42) | TRUE (F-after; P-after) |
| 48 of 72 admitted on main, 0 of 72 on the branch (plan §2, commit, [195] (8), handoff) | TRUE for the pre-170 privilege on the branch's schema (F-pre); I did not re-run on a `9a07459` checkout -- A0's own handoff limitation says the same of its case leg |
| the seven new cases fail on the pre-170 grant, the positive passes; 1079 -> 1087 cases (plan §0.2/§4, commit) | TRUE ("FAILED -- 7 of 1087", each of the seven by id; the positive not among them) |
| block check 1/2/3 and drifts d1, d4, d5 (plan §3) | d1 re-measured as dE: TRUE; d2-d5 not re-run (read) |
| pinned grant digest `baa6379790cb8733` -> `eb5ecbffb7f4f3cf`, every other digest unchanged | TRUE (the suite asserts the digests and passes, V3) |
| assertion floor 932 -> 942, "ten assertions" (plan §0.1) | TRUE (counted ten `assert.*` calls in the new block; V3 passes) |
| 52 blocker pins moved 256+i -> 255+i (plan §0.1) | TRUE (V4) |
| 010 not edited, no `superseded.json` entry needed (migration :53-55) | TRUE (`010_identity.sql:403` intact; 010 has no block) |
| app_worker's only member is `postgres` (migration :47-48, [195] (9)) | TRUE (catalog C12) |
| "Q-027-6: no 17x file existed" (disposition §2) | TRUE (`git ls-tree 9a07459` has no 17x migration) |
| verify-branch-scope exit 0 on `03dbd30` with 11 paths (plan §0.1) | consistent: 14 on the head (three later files: plan, disposition, handoff) |
| `npm run verify` / `check:handoff` green on the branch name | TRUE (V2, V3) |
| disposition §3: #174 merged by A0 at `c307d1d`, CI green; RFC-2026-002's literal rule still not met | read, not re-measured; the disposition does not overclaim it |

No claim I checked is false.

## 4. Findings

| id | grade | file:line | finding | remedy |
|---|---|---|---|---|
| F170-1 | INFO | `db/foundation/migrations/170_workspace_lifecycle_not_client_writable.sql:87-97` | Block check 1 reads `has_column_privilege`, which counts only privileges a role holds or INHERITS. A non-inheriting membership (`grant app_worker to authenticated with inherit false`) gives a client the column through `SET ROLE` and is invisible to the block. Measured dB: the client membership probe and the pinned grant probe refuse it, so the suite holds; 170's block alone does not. | None required. Optionally say in 170's comment that SET ROLE reach is the membership probe's, so nobody later relies on the block alone. |
| F170-2 | LOW | `test-kits/db/foundation-contract.test.mjs:3321` | The static "170 grants nothing and creates no DDL" check matches `(create\|alter\|drop)\s+(policy\|table\|function\|trigger\|index)`: it does not see `create or replace function`, `create view`, `create rule`, or `alter default privileges`. A later edit of 170 adding any of these passes this assertion. The runtime probes catch a definer function (dC) and a view (dD); a rule was not measured. | Assert instead that 170's code, comments stripped, is exactly the revoke, the `comment on column`, and one `do $$ ... $$` block (for example: no statement keyword other than `revoke`, `comment`, `do`). |
| F170-3 | INFO | `db/foundation/lint/pinned-grants.json:3` | `_how_measured` still says the list was generated "through 140"; it is now generated through 170 (A0's F4). | Update the generator's header text in the next batch that touches the pin. |
| F170-4 | INFO | `work-packages/WP-0A-DB-00.json` `open_blockers[195]` (9) | No writer of §11.4 transitions exists (A0's F1); owner-initiated closing and its cancel are unavailable until RFC-2026-023's step-up command. Recorded and owed correctly. | None in this batch. |
| F170-5 | INFO | `010_identity.sql` grant to app_worker (unchanged) | app_worker keeps table-level SELECT/INSERT/UPDATE on `app.workspaces` with no policy for it under FORCE RLS (A0's F2). From the catalog, a statement under `app_worker` would match no permissive policy, so only a superuser acting as itself moves the state today. Read from the catalog, not executed. Held on `open_blockers[113]`. | None in this batch; DATA-DEC-03's worker identity decides it. |

## 5. Stop-the-line

**None.** No secret, tenant leak, lost job, divergent migration, irreversible deletion or contract mismatch
was found. The change removes a privilege; its only rollback is a forward `grant`, which reopens the
finding and is refused by 170's block and the pinned grant probe.

**Does anything block the merge from A1's side?** No. F170-2 is a test-precision gap that the runtime
probes cover for the paths I measured; it can be fixed in this batch's review round or a later one.
Whether the merge bar of RFC-2026-002 and `open_blockers[188]` (Integration Owner evidence) is met is the
Integration Owner's and Product Owner's reading, not mine.

## 6. Limits

- Same vendor and model family as the Author (RFC-2026-024).
- The shim, not a hosted Supabase project: on a hosted project `authenticator`, default privileges in
  `public` and `service_role`'s BYPASSRLS differ. `app` is not `public`, and `service_role` is not a client;
  I did not measure a hosted instance.
- "Before" was measured by restoring the pre-170 grant on the branch's schema, not by checking out
  `9a07459`; on `app.workspaces` the two differ only by that grant and the column comment (read from the
  diff).
- A0's drifts d2-d5 were read, not re-run. Rules (`create rule`) on `app.workspaces` were not drifted.
- The large harness was not run. PostgREST itself was not run; its request shapes were sent as SQL.
