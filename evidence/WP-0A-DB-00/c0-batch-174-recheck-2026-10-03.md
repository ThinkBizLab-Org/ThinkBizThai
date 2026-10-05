# C0 contract review re-check: batch 174's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-174`, head `3ab9ab5ba685af37eb155f4f86492932686cb85c` over code
  `fb62e177db32ba0231b8f37163daedb3dd8ce884`, base `600b48b` (main). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/185>. Previous reviewed head `d111326`; my review of it is
  `c0-batch-174-contract-review-2026-10-03.md` (cherry-picked here as `dc0cd19`).
- **Re-check branch:** `recheck/c0-batch-174`, checked out at the subject head `3ab9ab5`. This file is its only commit.
- **Scope:** narrow. My own findings C0-174-1 to C0-174-5 first, then the rest of the round's changes
  (`git diff d111326..3ab9ab5`, 12 files) and the claims about them.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; plan §1, §3 and §7 (`a0-batch-174-plan-2026-10-03.md:140-180`);
  disposition §6 D11-D14 (`product-owner-disposition-2026-10-03-batch-174.md:129-153`); `git diff 600b48b..3ab9ab5`
  for the round's hunks; the messages of `fb62e17` and `3ab9ab5`; `open_blockers` at `d111326` and `3ab9ab5`, compared
  by script; the handoff; my earlier review and the governing texts it cites (RFC-2026-028 §3.4 / Q-028-5,
  RFC-2026-026 §3.5, `ctr-ten-001` and `ctr-job-001` schema and manifest), unchanged since base.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under RFC-2026-024 this is
an independent-role run by configuration, not by provenance: I share the Author's training and blind spots. Acceptance
of this file as the C0 role's signature is the Integration Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** The round changed one migration comment, one probe self-test drift, one static test, one
  isolation-suite comment, one `run.mjs` comment and the records. No statement of 174 changed. Nothing a
  database layer runs changed apart from the self-test drift, and that drift is still refused (§2).
- **Blocks the merge: nothing in this re-check.** The merge still waits on what RFC-2026-002/025 require:
  - a green required CI run on `3ab9ab5`. Run 37344835530 was `in_progress` at my last read;
  - the A1 and Q0 re-checks. A1's must include its explicit acceptance or rejection of the narrowing (D11);
  - the Integration Owner's acceptance of the number 174 (`open_blockers[202]` (1)).
- **My findings on `d111326`:**

| id | was | now | how I checked |
|---|---|---|---|
| C0-174-1 | MEDIUM | **Remedied as far as the Author can.** `[202]` (2) now says the restatement lands "BEFORE ANY PRODUCER ENQUEUES INTO app.jobs (RFC-2026-026's worker half or earlier)" (D11). A1's explicit acceptance or rejection is recorded as owed at its re-check, and A0's recommendation is said not to be that acceptance. That half is A1's, so it stays open but is correctly placed. | `open_blockers` compared by script: only `[202]` changed, a strict append (`startsWith`). Text quoted from `work-packages/WP-0A-DB-00.json:459` |
| C0-174-2 | LOW | **Closed by D13; I accept the reading.** The probe has one executor. `probeJobScript` (`scripts/db/run.mjs:2712-2722`) emits `set local search_path = pg_catalog;` before the probe, and `foundation-contract.test.mjs:3128-3130` pins that sequence. `git grep` finds `PINNED_GRANT_PROBE_SQL` reached only through `CATALOG_RULE_PROBES` → `probeJobScript` (`run.mjs:4313`). The comment at `run.mjs:1431-1434` and `[202]` (5) say that a second executor would have to pin `search_path` too. | Measured (§2, D13 row): under a connection default of `app, public`, the probe as the executor runs it is silent (exit 0). Without the executor's line, it raises with 31 `missing` and 31 `unlisted` (exit 3). This matches the plan §7 and the handoff exactly |
| C0-174-3 | INFO | Stated as a limit on `[202]` (5). That was the optional remedy's alternative. | read |
| C0-174-4 | INFO | **Done.** `JOBS_INSERT` (`foundation-contract.test.mjs:6054`) reads quoted, spaced and multi-line spellings in any case, and its own cases assert that `app.jobs_archive` is not matched. Both the three-writer loop and the "no other fed source" check use it. One residual spelling is graded below (C0-174R-1). | Measured: drift W1 (`INSERT  INTO "app" .\n  "jobs"` appended to 140) made the test fail with `no other fed source writes app.jobs`, naming `140_audit.sql` |
| C0-174-5 | INFO | Unchanged, as expected. The number's acceptance is the Integration Owner's (`[202]` (1)). | read |
| C0 §3 (6bc9fc2's wording) | INFO | Corrected in plan §7 (last row), since commits are not rewritten. | read; `git log -- evidence/VERIFICATION.md` shows 6bc9fc2 as the last commit to touch it, and `d111326` touches only the handoff |

- **Q1, are 174's columns and bounds unchanged and still right? Yes.** The only hunk in `174_job_tenant_context.sql`
  adds two comment lines (`:37-38`). The columns, `NOT NULL`, no default, the enum and the
  `^[A-Za-z0-9._:-]{1,128}$` bound are as I reviewed them on `d111326`. migrate-clean green twice confirms the
  block and the pins still agree.
- **Q1c, is every writer of `app.jobs` consistent? Yes.** The same three writers as before, and the widened static test
  is green on the branch (verify 692/692).
- **Q2, is the narrowing stated and owed to CTR-JOB-001's owner? Yes, now with an ordering.** See C0-174-1 above.
- **Q3, are the new pins still correct? Yes.** Rule 10 and rule 11 are unchanged in the round, apart from the
  comment. The pinned check probe's self-test drift now uses `{1,255}` (`run.mjs:2337-2338`). PostgreSQL's
  repetition maximum is 255, so the drifted CHECK is one a row can pass, and the probe refuses it by its text, not by
  accident. The digest move `3ba8cd283ac50444` → `792a2204f6d7a5da` is recorded with that reason
  (`foundation-contract.test.mjs:3267-3269`). Both rounds report the pinned check probe "refused each of its 2 drifts".

## 2. Measured vs read

**Measured by me.** I checked Node `v24.20.0` before each run. PostgreSQL 17.11 from `/opt/homebrew/bin`, on
127.0.0.1:5505 only, TCP only with `unix_socket_directories=''`. Each cluster was `initdb --locale=C -A trust -U postgres`
with `LC_ALL=C`, the shim loaded first, and re-initdb'd every round. Private directory `.../scratchpad/c0-174r2/`.

| run | result |
|---|---|
| `node scripts/verify-branch-scope.mjs 600b48b WP-0A-DB-00` on branch NAME `agent/claude/WP-0A-DB-00-batch-174` (checked out by name in this worktree with `--ignore-other-worktrees`, then back to `recheck/c0-batch-174`) | exit 0, "all 23 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` on the branch NAME | exit 0, "describes the branch: nothing substantive after its cited head" |
| `npm run verify` on the branch NAME | exit 0, "clean: exit 0 — tests 692, pass 692, fail 0, skipped 0, todo 0" |
| (control) `npm run check:handoff` on `recheck/c0-batch-174` | exit 75, as designed |
| round r1: `make db-migrate-clean`, `make db-rls-smoke` | 0, 0. Post-migrate pass 55 / 39 / 16. The pinned grant probe refused its 12 drifts, the pinned check probe its 2 and the vocabulary probe "the 61 vocabulary CHECKs". 1200 isolation cases. `job-names-its-tenant-context` ok. "14 claim(s) discharged by execution; 1 not run on this cluster (worker-login-authentication)" |
| round r2, a fresh cluster, the same targets | 0, 0, with the same counts |
| D13, on r1's migrated cluster: the pinned grant probe exactly as `probeJobScript` emits it (built from `run.mjs` itself), after `set search_path = app, public` | exit 0, silent |
| D13, the same script with only the `set local search_path = pg_catalog;` line removed | exit 3, "function EXECUTE ... not exactly its pin": 31 `missing:` and 31 `unlisted:` |
| drift W1, appended to `140_audit.sql`: `INSERT  INTO "app" .` newline `"jobs" (workspace_id) select null where false;`, then the batch 174 foundation-contract test alone | exit 1, `no other fed source writes app.jobs`, actual `['db/foundation/migrations/140_audit.sql']` |
| drift W2, appended to 140 instead: `merge into app.jobs j using (...) on false when not matched then insert (workspace_id) values (null);` | exit 0: the static test does not read a `MERGE` writer (C0-174R-1) |
| restoration | 140 restored from a copy after each drift. `cmp` was silent, and `git diff --quiet 3ab9ab5 -- 140_audit.sql` passed |
| `open_blockers` `d111326` vs `3ab9ab5` | 203 and 203 entries. Only `[202]` differs, a strict append. No other manifest key changed |
| cherry-pick map | `dc0cd19`, `ac3b684` and `fc98353` each carry "cherry picked from commit" `c98a3c8`, `3f0674f` and `5d20380`, and each touches one file. Each file at `3ab9ab5` is byte-identical to its review branch's |
| handoff counts | `files_added` 6 and `files_modified` 17. `git diff --name-status 600b48b fb62e17` gives 6 A and 17 M |
| `gh pr view 185` | OPEN, Draft, base `main`, head `3ab9ab5`, not merged, as A0 says |
| `gh run list` on the branch | 37327469747 on `d111326`: `success`. 37344835530 on `3ab9ab5`: `in_progress` |

**Read, not measured.** These are read from CI's log, not run by me:

- run 37327469747 on `d111326` printed the pinned grant probe's claim, "refused each of its 12 drifts", 1200 isolation
  cases, and "15 claim(s) discharged". So rules 10 and 11 held on CI's service container at the previous head.
- Recording that against `[202]` (4) is the Integration Owner's act.

The following are also read, not measured:

- the Author's r1 and r2 on 5507;
- A1's PII-shape measurements (A1-174-2). The regex makes them true by inspection;
- Q0 F1's revert measurement, which the corrected texts now rest on. PostgreSQL's `ExecInsert` checks RLS WITH CHECK
  before `ExecConstraints`, which agrees with it;
- that `evidence/VERIFICATION.md` was "re-recorded" in `fb62e17`. Its values are unchanged (692), so a re-record
  leaves no diff, and `npm run verify` asserts it against a live run.

## 3. Claims checked

- **`fb62e17`'s message.** True where I measured: the cherry-pick ids, D11-D14 as described, 692/692, 23 paths, the D13
  measurement, the digest move and 55/39/16 / 12 / 2 / 1200 / 14+1. "No code change" for C0-174-2 is true. The
  `run.mjs` hunk at `:1431-1434` is a comment.
- **`3ab9ab5`'s message.** "This commit changes only the handoff" is true, and so is "600b48b..fb62e17 (6 added, 17
  modified)".
- **Plan §1, §3 and §7.** The corrected sentences in §1 and §3 now say what Q0 measured: the control bites, and the
  enqueue's columns are held statically. §7's cherry-pick map and the finding → change → measured rows are true where
  I measured them (C0-174-2, C0-174-4, Q0 F3, the rounds).
- **Disposition §6.** D11-D14 match the blocker text and the code. D11 is honest that A0's recommendation is not A1's
  acceptance.
- **`open_blockers[202]`.** This is a strict append. Every finding of the three reviews is named, with an owner where
  something is owed.
- **Handoff.** `head_revision_or_patch_checksum` is `fb62e17`, and the guard is green on the branch name. Criterion (8)
  is "met" as worded ("acted on, owed with an owner, or answered by name"). It does not claim A1's acceptance.
  `security_privacy_cost_impact` now states both A1 limits.

## 4. Findings (this round)

| id | grade | where | finding | remedy |
|---|---|---|---|---|
| C0-174R-1 | INFO | `test-kits/db/foundation-contract.test.mjs:6054` | `JOBS_INSERT` reads `insert into` spellings only. A `MERGE ... WHEN NOT MATCHED THEN INSERT` into `app.jobs`, or a `COPY app.jobs FROM`, in a fed source passes the static test (drift W2, measured). The live backstop stands: any row such a writer inserts after 174 without the four columns is refused with 23502 and fails migrate-clean or rls-smoke. No such writer exists. | Optional, later: also match `merge\s+into` and `copy` for the same target, or state the limit on `[202]` (5). Not merge-blocking |
| C0-174R-2 | INFO (owed, not a defect) | `open_blockers[202]` (2); disposition D11 | C0-174-1's second half, the explicit acceptance or rejection of CTR-TEN-001's narrowing by A1 as co-owner, is still outstanding at this head. It is correctly recorded as A1's act at its re-check. Until it is recorded, the narrowing rests on A0's recommendation under the Owner's delegation. | A1 records it in its re-check. If A1 rejects it, the D3 bound goes back to the Owner before the merge. |

No finding of this round is MEDIUM or above.

## 5. Stop-the-line

None. I found no secret, tenant leak, lost job, duplicate side effect, migration divergence or contract mismatch that
is hidden or unowed. The contract difference is the same declared narrowing as before. It now has an ordering
constraint and an owner for the acceptance.

## 6. Limits

- Same vendor and model family as the Author (§0).
- Narrow re-check: I did not repeat my C1-C3 drifts of the first review, the Author's D1-D9, CI's negative control or
  try-it. Nothing a database layer reads changed apart from the self-test drift, and two fresh rounds were green.
- CI on `3ab9ab5` was not finished at my last read. I did not read its result.
- A1's and Q0's re-checks were running in parallel. I saw neither.
- My cluster on 5505 was stopped and its data directory removed. `140_audit.sql` is identical to `3ab9ab5`'s. The
  subject branch was checked out here only to run the three guards, then this worktree went back to
  `recheck/c0-batch-174`.
