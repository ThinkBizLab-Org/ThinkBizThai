# C0 contract review: batch 174

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-174`, head
  `d11132609bbbcc47d29fbbd2ef7bc465d3e51f27` over code `6bc9fc2b03a6ad1627704a581dae21053e2947cc`, base `600b48b`
  (main, the merge of PR #184). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/185>.
- **Review branch:** `review/c0-batch-174`, checked out at the subject head `d111326`. This file is its only commit.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-174-plan-2026-10-03.md`; the disposition
  `product-owner-disposition-2026-10-03-batch-174.md`; `git diff 600b48b..d111326` (20 files) and both commit
  messages; RFC-2026-028 §2/6, §3.4, the §4 follow-up list, Q-028-5 and Q-028-6, and the line this batch adds;
  RFC-2026-026 §3.5 and Q-026-8; `contract-catalog/shared-kernel/ctr-ten-001/schema.json` and `manifest.json`;
  `ctr-job-001/schema.json` and `manifest.json`; 171's §6/6 block (`171_workspace_lifecycle_visibility.sql:299-331`);
  172's identifier bound (`172_acting_user_and_closing_command.sql:255-260`); the handoff; `open_blockers` at base
  and head, compared entry by entry.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under RFC-2026-024
that makes this an independent-role run by configuration, not by provenance: I share the Author's training and blind
spots. Acceptance of this file as the C0 role's signature is the Integration Owner's and the Product Owner's act, not
mine.

## 1. Verdict

- **Stop-the-line: no.** I found no secret, tenant leak, lost job, duplicate side effect or migration divergence.
  The one contract difference, the identifier bound, is declared, stated exactly and owed to the contract's owners.
  It fails closed: a value outside the bound is refused with 23514 and never stored. No producer of `app.jobs`
  exists yet, so nothing is refused today (§4, C0-174-1).
- **Blocks the merge: nothing in this review.** The findings are one Medium, one Low and Info items. None needs
  fixing before the merge. The merge still waits on what RFC-2026-002/025 require:
  - a green required CI run on `d111326`. Run 37327469747 was `in_progress` when I last read it (§5);
  - the A1 and Q0 runs;
  - the Integration Owner's acceptance of the number 174 (`open_blockers[202]` (1)).
- **Q1, are migration 174's columns exactly the ones RFC-028 Q-028-5 and RFC-026 §3.5 name? Yes.**
  - `actor_kind`, `actor_id`, `request_id` and `correlation_id` are §3.4's list word for word
    (`174_job_tenant_context.sql:72-76`). They are `text not null` with no default, which matches "the database
    mints none of them".
  - RFC-026 §3.5 / Q-026-8 read the actor, `request_id` and `correlation_id` from "the job's `tenant_context`". All
    three now have a column.
  - Leaving out `causation_id`, `locale`, `timezone`, `business_profile_id` and `page_context_profile_id` (D2) is
    consistent with the inputs. CTR-TEN-001 declares `locale` and `timezone` `const`. `causation_id` is the job id
    (RFC-026 §3.2). The two profile ids are optional in the contract.
  - `actor_kind` is CTR-TEN-001's enum `["user","system_actor"]` exactly (`:77`).
- **Q1b, are the ids bounded as 172 bounds an identifier? Yes.**
  - `^[A-Za-z0-9._:-]{1,128}$` (`:78-80`) is byte-identical to 172's (`172:259`, `:354`).
  - The block, `PINNED_CHECKS` and the static test all pin the same text, and the test asserts that.
- **Q1c, is every writer of `app.jobs` consistent? Yes, as far as the repository holds writers.**
  - `git grep` over tracked files outside `evidence/` finds three `insert into app.jobs` writers: the 050 fixture,
    the isolation enqueue and the WS:905 fixture. It also finds the proof's own builder. Each names all four columns
    with values inside the bound.
  - The live run agrees. Two fresh rounds of rls-smoke loaded the 050 fixture and ran 1200 cases green.
  - Every `tenant_context` in a `valid*` example of the contract catalog fits the bound: 18 of 18, measured by
    script.
- **Q2, is the contract narrowing stated and owed to CTR-JOB-001's owner? Yes.**
  - `open_blockers[202]` (2) states it exactly: what is refused (more than 128 characters, or any character outside
    the class), the 23514 refusal, and what the contract accepts instead.
  - It names CTR-JOB-001's owner as A0, which matches `ctr-job-001/manifest.json` `"owner":"A0"`. It names A1 as
    CTR-TEN-001's co-owner, which matches `"owner":"A0+A1"`.
  - The migration header (`:33-40`), the column comment (`:85`) and the RFC's Implemented line say the same.
  - One gap is graded below: the item carries no ordering constraint (C0-174-1).
- **Q3, are the new pins correct and legitimate? Yes.**
  - **Rule 10 (database `CREATE`, grant options).** `run.mjs:1609-1618` reads every database for every non-superuser,
    non-`pg_*` role, through `has_database_privilege`, so membership is included. My own drift C1 moved the current
    database's ownership to `app_maintenance`, a route the Author's drifts did not take. Rule 10 refused it by name:
    CREATE plus CONNECT, CREATE and TEMPORARY WITH GRANT OPTION, on "the current database".
  - **Rule 11 (`EXECUTE` beyond `PUBLIC`).** `PINNED_FUNCTION_EXECUTE` (31 rows, `run.mjs:1433`) held both ways on
    two fresh clusters, since migrate-clean was green twice. Its self-test refused all five of its drifts, part of
    the 12 the pinned grant probe reported. One robustness point is graded below (C0-174-2).
  - **171 (6) by inheritance (block 4, `174:163-187`).** The predicate is 171 (6)'s, character for character, apart
    from the role set: the schema, `polpermissive`, the workspace-scoped test and the helper regex all match. The role
    set is every role `anon`/`authenticated` reaches through `pg_auth_members` by a recursive `union` CTE, so a cycle
    terminates. The direction is right: the CTE follows `member -> roleid`, the roles whose policies a client meets.
    My own drift C2 used an ADMIN-only membership of `anon` with a policy on `app.workspaces`, which tests the
    relname arm, not the `workspace_id` arm the Author's D3/D3b used. Block 4 refused it at 174's apply by name:
    `workspaces.probe_c0_ws (TO probe_c0_g)`. The block does not carry 171's three exemptions to group roles. That is
    stricter, not looser, and correct.
  - **Legitimacy.** Each pin answers a recorded finding: A1-173-3 on `[201]` (10), and C0 R3 / A1 R1 / Q0-171R-1 on
    `[198]`. None widens a grant. `contract-catalog/` is untouched.

## 2. Measured vs read

**Measured by me** (Node `v24.20.0` checked before each run; PostgreSQL 17.11 from `/opt/homebrew/bin`;
127.0.0.1:5505 only, TCP only with `unix_socket_directories=''`; `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`;
the shim first; re-initdb every round; private directory `.../scratchpad/c0-174/`):

| run | result |
|---|---|
| `node scripts/verify-branch-scope.mjs 600b48b WP-0A-DB-00` on branch NAME `agent/claude/WP-0A-DB-00-batch-174` | exit 0, "all 20 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` on the branch NAME | exit 0, "describes the branch: nothing substantive after its cited head" |
| `npm run verify` on the branch NAME | exit 0, "tests 692, pass 692, fail 0" |
| (control) `npm run check:handoff` on `review/c0-batch-174` | exit 75, no package declares that branch, as designed |
| round r1: `make db-migrate-clean`, `make db-rls-smoke` | 0, 0. Post-migrate pass 55 / 39 / 16. Pinned grant probe refused its 12 drifts, pinned check probe its 2, vocabulary probe "the 61 vocabulary CHECKs". 1200 isolation cases. "14 claim(s) discharged by execution; 1 not run on this cluster (worker-login-authentication)". The `job-names-its-tenant-context` transcript is the plan §3's line for line (15 attempts) |
| round r2, the same | 0, 0, with the same counts |
| drift C1, appended to `140_audit.sql`: `alter database <current> owner to app_maintenance` | migrate-clean exit 2, refused by rule 10 by name, and the self-test arm reports it too |
| drift C2, appended to 140: `create role probe_c0_g; grant probe_c0_g to anon with inherit false, set false, admin true; create policy probe_c0_ws on app.workspaces for select to probe_c0_g using (true)` | exit 2, refused at `174_job_tenant_context.sql` by block 4 by name |
| drift C3, appended to 140: a `SECURITY DEFINER` function in `public`, executable by PUBLIC, outside rule 11's app/private arm | exit 2, refused by the security definer probe (`[PUBLIC can execute] [not a pinned SECURITY DEFINER function]`), so the arm rule 11 leaves out is held elsewhere |
| restoration | 140 restored from a copy after each drift. `cmp` was silent, and `git diff --quiet d111326 -- 140_audit.sql` passed at the end |
| `open_blockers` base vs head | 202 to 203 entries. [113], [198], [199], [200] and [201] are strict appends (`startsWith` the base text). Only `ownership` and `open_blockers` changed in the manifest |
| `gh pr view 184` / `gh run view 37309049441` | merged 2026-10-05T12:40:13Z at head `1ae007f`, merge commit `600b48b`, run `success` on `1ae007f`, as the disposition §2 says |
| `gh pr view 185` | OPEN, Draft, base `main`, head `d111326`. Not merged, as A0 says |
| valid contract examples vs the bound | 18 `tenant_context` objects, 0 outside `^[A-Za-z0-9._:-]{1,128}$` |

**Read, not measured:** the Author's drifts D1-D9 (except the ground my C1-C3 cover); CI's negative control for
`app.jobs`; the populated-table refusal (23502); the WS:905 load; try-it on 55479; the "D2 refused first by the
fingerprint" claim. These are Q0's to re-run. I also did not see the Owner's words `พร้อมแล้วลุยเลยนะ ไม่ต้องรอผม` at
their source. The disposition §1 says honestly that they were relayed, and I can confirm nothing more.

## 3. Claims checked

- **Commit messages.** True as far as I measured. That covers 692/692, the four amended-outside-ownership files
  (the scope check is green), the blocker appends, the 55/39/16 count, the 1200 cases and the 14 proofs discharged.
  - 6bc9fc2's sentence that VERIFICATION.md was "re-recorded ... after the refresh" reads as if VERIFICATION.md
    moved after the handoff refresh. In fact d111326 touches only the handoff.
  - The file at head says 692/692, which matches my `npm run verify`. That is a wording ambiguity, not a false
    count (Info, no remedy needed).
- **Plan.** The §1 table, §2 rows 1-8 and §3's counts all match what I measured where I measured them. The §4 reasons
  for D1-D10 are consistent with the RFC text I read.
- **Disposition.** §2's merge facts are verified (above). §3 and §4 restate the plan. §1 is honest about relayed words.
- **Handoff.** `head_revision_or_patch_checksum` is `6bc9fc2`, the code commit. The guard is green on the branch
  name. Its acceptance criterion "(6) try-it" is read, not measured, by me.
- **RFC-2026-028.** The diff adds exactly one line, line 7, the Implemented line for Q-028-5, and removes none. Its
  "No other sentence of this file changed" is true.

## 4. Findings

| id | grade | where | finding | remedy |
|---|---|---|---|---|
| C0-174-1 | MEDIUM (contract) | `174_job_tenant_context.sql:78-80`; `work-packages/WP-0A-DB-00.json:459` (`open_blockers[202]` (2)) | Q-028-5's approved answer says "`not null` with `CTR-TEN-001`'s bounds". The batch applies a stricter bound (172's shape) than the contract states (`minLength: 1` only). This is answered as D3 under the delegation and stated exactly, so it is not hidden. But until CTR-JOB-001/CTR-TEN-001 are restated, the contract accepts what the store refuses. [202] (2) records the restatement with no ordering: nothing says it must land before the first producer of `app.jobs` (RFC-2026-026's worker half or any enqueuing service). No producer exists today, and 18/18 valid catalog examples fit, so nothing fails now. | Append to [202] (2): "before any producer enqueues into `app.jobs` (RFC-2026-026's worker half or earlier)". Ask A1, CTR-TEN-001's co-owner, to accept or reject the narrowing explicitly in its role run, or record the Owner's acceptance. Not merge-blocking. |
| C0-174-2 | LOW | `scripts/db/run.mjs:1620` | Rule 11 names each function by `oid::regprocedure::text`, which qualifies the schema only when it is not on `search_path`. The 31 pinned rows assume `app.` is qualified and `pg_catalog` is not. A probe connection whose `search_path` includes `app`, or a pooler or provisioned role with a different default, would report all 31 as `missing` and their bare forms as `unlisted`. That fails closed and loud, never silent, so LOW. | Render the name independently of `search_path`, for example `format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))`, or `set local search_path` in the probe, with the pin moved in the same diff. Can wait for a later batch. |
| C0-174-3 | INFO | `scripts/db/authz-proofs.mjs:969` | The proof compares SQLSTATE only. Of the five `23514` refusals, only `request_id`'s carries a control naming its constraint. The others are attributed because the baseline passes with every other field valid, which is sufficient but indirect. | Optional: also match `constraint_name` (via `get stacked diagnostics`) per refusal. |
| C0-174-4 | INFO | `test-kits/db/foundation-contract.test.mjs:6058` | The static "no other fed source writes `app.jobs`" check matches `insert into app\.jobs` with single spaces and no quoting. `insert into "app"."jobs"` or extra whitespace would pass it. The live 23502 refusal is the backstop, so a missed writer still fails rls-smoke or migrate-clean. | Optional: match `insert\s+into\s+"?app"?\s*\.\s*"?jobs"?`. |
| C0-174-5 | INFO | `174_job_tenant_context.sql:9-13`; [202] (1) | The number 174, outside A0's kernel range `050`. The reason (sort order before 051-173) is correct, and 172 and 173 set the precedent. | The Integration Owner records acceptance at or before the merge, as [202] (1) says. |

## 5. CI

PR #185's required check `bootstrap`, run 37327469747 on `d111326`, was `in_progress` at my last read. It is not
read here. Rules 10 and 11 on CI's service container (two databases, CI's `search_path`) are owed on [202] (4). They
are the CI-side half of C0-174-2.

## 6. Limits

- Same vendor and model family as the Author (§0).
- I re-ran the targets twice and three drifts of my own. I did not repeat the Author's nine drifts or the negative
  control (Q0's role).
- I did not read every hunk of `pinned-grants.json`, `read-allowlist-known-exceptions.json` and
  `catalog-snapshot.json` line by line. Green migrate-clean and the generator's check stand in for them.
- The Owner's relayed words are unverified by me.
- My cluster on 5505 was stopped and its data directory removed. The temporary worktree I used to measure on the
  branch name was removed. `140_audit.sql` is identical to `d111326`'s.
