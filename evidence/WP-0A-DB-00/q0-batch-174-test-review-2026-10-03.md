# Q0 independent test of batch 174: a job names its actor and request (Q-028-5), and the worker's remaining reach pinned

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Date:** 2026-10-05. The file name
carries the phase's date, 2026-10-03, as every record of this phase does.
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-174`, head `d111326` over code commit `6bc9fc2`, base `600b48b`
(main, PR #184 merged). Author `/claude/a0_atlas`. PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/185> (Draft).
**Reviewed on:** my own branch `review/q0-batch-174`, checked out at `d111326`. The branch name is checked out in another
worktree, so the guard commands were run on the branch **name** in a private local clone
(`scratchpad/q0-174/clone`). There, `agent/claude/WP-0A-DB-00-batch-174` was checked out at `d111326`, `origin` pointed
at GitHub and fetched, and local `main` was set to `origin/main` = `600b48b`. Nothing was committed or pushed from it.

This file records findings. It advances no status, approves nothing, and fixes nothing.

## 0. What I am

I am a subagent of `/claude/a0_atlas`'s orchestration, the same vendor and model family as the Author. RFC-2026-024
states what that independence is worth and what it is not. The separation is of run, worktree, branch, cluster and
evidence, not of mind. Whether this record counts as the Q0 role's signature is for the Integration Owner and the
Product Owner to decide, not me. Each claim below is labelled **measured** (I ran it in this run) or **read** (taken from
the tree, a document or a log, not executed by me).

## 1. Verdict

- **Stop-the-line: none.** Batch 174 behaves as RFC-2026-028 §3.4 and the plan say on every path I executed. Each
  of the six mutations asked for is refused by at least one live layer when it arrives in a later file. Each one,
  written coherently into the code with the probe digests refreshed, is refused by a specific static assertion.
  I found no secret exposure, tenant leakage, lost job, migration divergence or contract mismatch.
- **Merge: not blocked by a defect.** CI is green on `d111326` (run 37327469747). The guards are green on the branch
  name. Every claim I checked in the commit messages, plan, disposition, blocker edits and handoff is true as worded,
  with one exception: plan §3's inference about the isolation enqueue overclaims what the measurement shows (F1, low).
  F1 to F4 are low or info and need a disposition by name under the standing bar ("the role runs' findings cleared").
  None needs a code change before merge.
- **try-it demo still passes (measured).** `try-it up --port 5503` exits 1 by design ("port 5503 is one this tool never
  touches"). The demo loop (`DEMO_STEPS`, `demoPlanProblems`, `runCases`, `sessionDriver`) was replicated against
  5503 after base round 1: "All 17 steps behaved as expected."

## 2. Measured vs read: guards, rounds, CI

Before every measured run I checked Node: `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`). The PATH Node 26 was
never used. The database was PostgreSQL 17.11 on `127.0.0.1:5503` only, TCP only (`-c unix_socket_directories=''`),
created with `initdb --locale=C -A trust -U postgres` under `LC_ALL=C`. The shim
`db/foundation/ci/supabase-shim.sql` was loaded first, and the cluster was re-initdb'd every round. `TMPDIR` and all
files stayed in `scratchpad/q0-174/`. Every drift appended to `140_audit.sql` was restored byte for byte (`cmp` exit
0 after each). At the end the cluster was stopped and its directory removed, and port 5503 is free (`lsof` exit 1).
`git status --porcelain` is empty after every restore.

| what | result |
|---|---|
| `node scripts/verify-branch-scope.mjs 600b48b WP-0A-DB-00` on the branch name | **measured** exit 0, "all 20 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` on the branch name | **measured** exit 0, "describes the branch: nothing substantive after its cited head" |
| `npm run verify` on the branch name | **measured** exit 0, "clean: exit 0 — tests 692, pass 692, fail 0, skipped 0, todo 0" (matches `evidence/VERIFICATION.md`) |
| base round (fresh cluster) | **measured** migrate-clean exit 0: post-migrate pass 55 / 39 / 16; pinned grant probe "refused each of its 12 drifts"; pinned check probe "each of its 2"; vocabulary check probe 61. rls-smoke exit 0: 1200 cases; `db-authz-proofs: ok — 14 claim(s) discharged by execution; 1 not run on this cluster (worker-login-authentication)`; the 15-line transcript of `job-names-its-tenant-context` exactly as plan §3 states it |
| base: `node --test test-kits/db/foundation-contract.test.mjs` | **measured** exit 0, 86 / 86 |
| base: `scripts/db/explain-harness.mjs --scale small` on a fresh migrate-only cluster | **measured** exit 0 (the WS:905 writer loads) |
| CI's app.jobs negative control, locally (`alter table app.jobs disable row level security`, rls-smoke) | **measured** exit 2, `db-rls-smoke: FAILED — 2 of 1200`: `service-sees-zero-job-rows` ("1 row(s) were visible") and `service-cannot-enqueue-a-job-row` ("1 row(s) came back. The operation was permitted"); `job-names-its-tenant-context` also FAIL |
| populated table, rolled back (cluster after rls-smoke, fixture jobs plus one more): drop the four columns, re-run 174's `ADD` | **measured** `ERROR: column "actor_kind" of relation "jobs" contains null values` (fails closed, as D4 says) |
| the bound's edges | **measured** `^[A-Za-z0-9._:-]{1,128}$` refuses a trailing newline, an inner newline, `é` and an id holding an `@` |
| CHECK count | **measured** 273 CHECKs in app and private (259 / 14), as `vocabulary-checks.json` and plan §1 state |
| CI run 37327469747 on `d111326` | **read** (`gh run view`, log): success; post-migrate pass 55 / 39 / 16; pinned grant probe "refused each of its 12 drifts" with CI's second database `thinkbizthai_test` present (rule 10 reads every database), so `open_blockers[202]` (4) can be read off this run; 1200 cases; `db-authz-proofs: ok — 15 claim(s) discharged` (§5/12 runs there); negative control `app.jobs (050): 2 case(s) noticed, including service-sees-zero-job-rows` |
| PR #184 merge and run 37309049441 (disposition §2) | **read** (`gh`): merged 2026-10-05T12:40:13Z at head `1ae007f`, merge commit `600b48b`; run success on `1ae007f` |

## 3. Mutation table

**Method.** Each mutation is applied to my worktree, measured, and restored (`git checkout`, 140 by `cmp`).

- **L, a later file:** `db/foundation/migrations/175_q0_mutation.sql`.
- **A, appended to 140:** the brief's LIVE DB form.
- **C, in code:** 174, `run.mjs` or a writer, edited coherently. The Author's own pins move with the edit, and the probe
  digests in foundation-contract are recomputed with the test's own formula (`refresh.mjs`). This leaves only the
  assertions that are not digests to catch it.

Each mutation then gets a static foundation-contract run, a fresh round, and the explain harness where a writer is
involved. migrate-clean stops at its first refusing layer, so later layers in that target are not reached. To give
each layer a verdict on its own, I also ran `layers.mjs`. On a fresh migrate-clean base cluster it applies the drift in
one transaction, then runs every SQL catalog-rule probe of `run.mjs` (as of `d111326`) and 174's apply-time block,
each under psql's `ON_ERROR_ROLLBACK`, and rolls back. With no drift, no layer refused.

For any L mutation, the static run fails 19 tests **generically**: a new migration file moves the snapshot digest, the
tail declaration and `_how_measured`. That is a refusal of "a new file", not of the drift. I record it once here and
give no static verdict for L below.

| # | mutation | form | layers that refused (measured) | layers that passed it (measured) |
|---|---|---|---|---|
| 1 | **drop NOT NULL** (`actor_id`) | L | migrate-clean: pinned check probe ("app.jobs.actor_id", P0001). Per layer: pinned check probe and 174's block ("actor_id nullable") | rls-smoke green: the proof tests NULL on `correlation_id` only (F2); every other SQL probe |
| 1c | drop NOT NULL on `actor_id` in 174 itself, block (1), `PINNED_NOT_NULL` and its self-test moved, digest refreshed | C | static: the batch 174 test ("one ALTER: four text columns, NOT NULL…") and the `PINNED_NOT_NULL` deep-equal | migrate-clean 0, rls-smoke 0 (expected: the coherent edit moves every live pin) |
| 2 | **widen the CHECK** (`request_id` to `^.{1,255}$`) | L | migrate-clean: pinned check probe (`jobs.jobs_request_id_bounded`). rls-smoke: the proof, "request_id with a space: ok 1, should be raised 23514". Per layer: pinned check probe and 174's block | every other SQL probe |
| 2c | correlation bound to `{1,255}` in 174, block (2) and `PINNED_CHECKS`; self-test to `{1,254}`; digest refreshed | C | static: "correlation_id: 172's bound". rls-smoke: the proof, "correlation_id of 129 characters: ok 1, should be raised 23514" | migrate-clean 0 |
| 3 | **revert a writer**: the isolation enqueue as main holds it | C | static: "isolation-cases.mjs: its insert names actor_kind" | migrate-clean 0; **rls-smoke 0** (RLS refuses before NOT NULL); **CI's negative control still satisfied** (both `*job-row` cases fail, the enqueue now with 23502) (F1) |
| 3b | revert a writer: the WS:905 fixture | C | static: "ws905-fixture.mjs: its insert names actor_kind"; explain harness exit 1 (23502) | migrate-clean 0, rls-smoke 0; the harness is not run by CI (F4) |
| 3L | a later file that mints a default on all four (what a reverted writer would need) | L | migrate-clean: post-migrate pass, 174's block (1) ("actor_id has a default, …"). rls-smoke: the proof, "no tenant context: the database mints none: ok 1". Per layer, with one default: **174's block alone** | pinned default probe; every other SQL probe (F2); explain harness exit 0 |
| 4 | **grant create on database** to app_worker | L, A | migrate-clean: pinned grant probe rule 10 ("app_worker CREATE on the current database") and its self-test. Per layer: **rule 10 alone** | rls-smoke 0; client schema probe (client roles only) |
| 4c | rule 10's CREATE arm removed, its self-test's CREATE drift and name dropped, digest refreshed; later file `grant create on database postgres to app_worker` | C | static: rule 10's regex assertion | **migrate-clean 0 and rls-smoke 0**: no live layer is left. Expected for a coherent code edit; the regex is the guard |
| 5 | **a stray EXECUTE**: `app.close_workspace` to app_worker | L | migrate-clean: rule 11 ("unlisted: app_worker EXECUTE on app.close_workspace(uuid,text,text)"). rls-smoke: `the-worker-cannot-execute-the-closing-command` | every other SQL probe |
| 5a | `app.jwt_subject()` to anon | L, A | migrate-clean: rule 11. Per layer: **rule 11 alone** | rls-smoke 0 and every other SQL probe. This confirms `open_blockers[201]`'s "the anon one passed every other layer" |
| 5p | a new function in `private`, PUBLIC executes it by default | L | rule 11's PUBLIC arm ("unlisted: public EXECUTE on private.q0_probe()") | rls-smoke 0 |
| 5g | `pg_catalog.pg_read_file(text)` to app_worker | A | system object fingerprint ("function pg_catalog.pg_read_file(text) [changed]"), as plan §3 D2 states | rls-smoke 0 |
| 5c | the stray grant written in 174 and pinned in `PINNED_FUNCTION_EXECUTE`, digest refreshed | C | static: "31 rows" and the batch 174 test's statement list. migrate-clean: rule 11's own self-test drift no longer names it. rls-smoke: `the-worker-cannot-execute-the-closing-command` | none |
| 6 | **a policy TO a group role**: `q0_group`, `authenticated` a member (INHERIT), policy on `app.content_ideas` | L | migrate-clean: permissive policy probe, client membership probe, pinned grant probe (membership). rls-smoke: 10 cases fail (the group's policy leaks rows). Per layer: those three, policy set probe and 174's block ("content_ideas.q0_group_reads (TO q0_group)") | — |
| 6b | two SET-only memberships above `anon` (`anon → q0_mid → q0_top`), policy TO `q0_top` | L | as 6; per layer also 174's block ("(TO q0_top)") | rls-smoke 0 (SET-only, so nothing leaks until SET ROLE) |
| 6a | 6b appended to 140 | A | migrate-clean: **174's block at apply time** ("content_ideas.q0_top_reads (TO q0_top)"), as `open_blockers[198]` says | — |
| 6c | 174's block (4) made non-recursive (direct memberships only), plus 6b in a later file | C | static: "the client roles' memberships, recursively…". migrate-clean: permissive policy probe, client membership probe, pinned grant probe | — (block (4) is a fourth, redundant layer on a migrate-clean cluster) |
| x | `grant create on schema public` to app_worker; `usage, create` to anon | L | system object fingerprint ("schema public [changed]") | — (the worker's reach outside app and private is held there) |

**Reading.** Every mutation that arrives as SQL is refused live. Rule 10 alone holds the database CREATE (4). Rule 11
alone holds an anon EXECUTE (5a). 174's block alone holds a default on the job columns (3L). The remaining mutations
are held by two to five layers.

For the coherent code mutations, a static assertion is the only guard in 1c, 3, 3b and 4c. That is what the design
intends: the assertions pin the text the digests no longer can. Three of those cases have a weaker live layer than the
plan's wording suggests (F1, F2, F4).

## 4. Findings

### F1 (low): the isolation enqueue's four columns are held by the static test alone; plan §3's inference overclaims

`tests/db/identity/isolation-cases.mjs:2710-2712` says naming the four makes the service's insert "still SUCCEED" with
RLS disabled, "(the CI negative control)". Plan §3 (`a0-batch-174-plan-2026-10-03.md:83`) concludes from the local
negative control: "So the enqueue still reaches row level security once it names the four columns."

**Measured (3):** with the enqueue reverted to main's text, rls-smoke is green. PostgreSQL evaluates the RLS WITH CHECK
before NOT NULL, so `service-cannot-enqueue-a-job-row` is still an RLS refusal. With app.jobs' RLS off, CI's control
for app.jobs (`.github/workflows/ci.yml:316`) is still satisfied, for two reasons: `service-sees-zero-job-rows` fails
anyway, and the enqueue case now fails with 23502 instead of "permitted". The control requires only that some
`*job-row` case fails. CI's own run also reads "including service-sees-zero-job-rows".

So the measurement cannot tell a writer that names the four from one that does not. The conclusion's "once it names
the four" is not shown by it. The property the comment states holds (measured: NC-base, "The operation was
permitted"), but no live layer checks it. Only foundation-contract's writer test (`test-kits/db/foundation-contract.test.mjs:6050`)
holds it.

**Remedy (either one):**

- Correct plan §3's sentence and the comment's parenthetical to say the static writer test holds this.
- Or make the app.jobs negative-control entry require the enqueue case's "The operation was permitted" message, which
  is CI policy and the Integration Owner's call.

### F2 (info): the proof executes one column's NOT NULL, and nothing but 174's block reads a default

`scripts/db/authz-proofs.mjs:992` sets only `correlation_id` to null. The all-omitted case is refused by whichever
column PostgreSQL reads first. So dropping NOT NULL on `actor_id` passes rls-smoke (1) and is refused by the pinned
check probe and 174's block. A default on a single column (3L) is refused by 174's block alone. The pinned default
probe pins one default, `calendar_items.timezone`, and does not pin the absence of others.

These are held, but by one or two layers. The plan's "PINNED_NOT_NULL … drift D4 (a default on request_id: the
post-migrate pass, measured)" is accurate.

**Remedy (optional):** a NULL attempt per column, and an "omit one, default none" attempt in the proof.

### F3 (info): the pinned check probe's new self-test drift is a regular expression PostgreSQL cannot run

`scripts/db/run.mjs:2335` re-bounds `jobs_correlation_id_bounded` to `{1,256}`. PostgreSQL's regex repetition maximum is
255. ADD CONSTRAINT on the empty table accepts it, but any row then fails with "invalid repetition count(s)". I measured
this with my first L-widen at `{1,256}`, where the 050 fixture "did not load".

As a catalog drift it serves its purpose: the probe compares text. It is not a widening, though, and a reader could copy
it as one.

**Remedy (optional):** use `{1,255}`, or say "a different text" in its comment.

### F4 (info): the WS:905 writer is held by the static test and by a harness CI does not run

**Measured (3b):** with the WS:905 fixture reverted, migrate-clean and rls-smoke are green. Only the static writer
test and `scripts/db/explain-harness.mjs`, which prints "Not run by CI", refuse it. Plan §2 row 4 states the harness
run as measured, and it is. This records where the guard lives.

**Remedy:** none needed. Keep the writer test.

### F5 (info): smaller accuracies

- The code commit's message says `evidence/VERIFICATION.md` was "re-recorded by `npm run record:verification` after the
  refresh". The handoff refresh is the later commit `d111326`, which does not touch VERIFICATION.md. The file's
  content (692 / 692) is true (measured), but the sequence in the sentence cannot be checked from the tree.
- The proof's UPDATE control returns `ok 0`, not a moved row. This is honestly stated in `open_blockers[202]` (5) and in
  the handoff's limits. Recorded only so it is not read as a gap.

## 5. Claims checked

| claim (where) | verdict |
|---|---|
| post-migrate 55/39/16; 12 and 2 drifts refused; 1200 cases; 14 discharged, 1 NOT RUN (plan §3, handoff tests, commit) | **true**, measured |
| proof transcript, 15 attempts with controls (plan §3) | **true**, measured line for line |
| 61 of 273 CHECKs (259 app, 14 private) (plan §1, lint data) | **true**, measured |
| `PINNED_FUNCTION_EXECUTE` 31 rows hold both ways (plan §1) | **true**: rule 11 is clean on base, and its self-test refuses all five drifts (measured) |
| a populated table refuses the ADD with 23502 (174 header, D4, `[201]`, `[202]` (3)) | **true**, measured |
| D2c: the anon EXECUTE passed every other layer (`[201]`, handoff impact) | **true**, measured (5a): only rule 11 refuses |
| D2: a pg_catalog grant is refused first by the system object fingerprint | **true**, measured (5g) |
| D3/D3b: a group policy is refused by 174's block by name (`[198]`, plan §3) | **true**, measured (6a, and per layer for 6 and 6b) |
| D9: main's 050 fixture fails rls-smoke (plan §3) | **read**, not re-run; consistent with 3L (the fixture needs the four columns) |
| CI's negative control still finds its `*job-row` cases (plan §3, commit) | **true**, measured. The inference drawn from it overclaims (F1) |
| try-it demo, 17 steps (acceptance (6)) | **true**, measured on 5503 by the replicated loop (§1) |
| no other fed source writes `app.jobs` (new test) | **true**, read: grep finds the three writers and the proof only |
| blocker edits: `[113]`, `[198]`-`[201]` appended with every earlier text kept as a prefix, `[202]` added at the end | **true**, measured by a prefix comparison against `600b48b`'s manifest |
| `[202]` (2)'s narrowing against `ctr-ten-001/schema.json` (`minLength: 1` only) and CTR-JOB-001's `$ref` | **true**, read |
| RFC-2026-028: one line added, "No other sentence of this file changed" | **true** (diff: 1 insertion) |
| disposition §2: #184 merged at `1ae007f`, `600b48b`, 12:40:13Z, run 37309049441 green | **true**, read via `gh` |
| the Owner's words of 2026-10-05 (disposition §1) | **not checkable by me**. They are marked as relayed, and the Owner may correct them |
| handoff: cites `6bc9fc2`, base `600b48b`, 16 modified and 3 added files | **true**; `check:handoff` exit 0 on the branch name |

## 6. Stop-the-line and merge

**Stop-the-line: no.** No defect I found lets a tenant read, a job be lost, a migration diverge, or the contract be
contradicted without its narrowing being stated. The narrowing (`[202]` (2)) and the number (`[202]` (1)) are open
decisions owned by others and stated as such. They are not defects.

**Merge:** nothing found blocks it on substance. Under the standing bar, F1 (low) and F2 to F5 (info) need a
disposition by name: a corrected sentence, or an accepted limit. The other open items are owed whatever this record
says: the Integration Owner's acceptance of the number, C0's and A1's records, and Integration Owner evidence
(`open_blockers[188]`).

## 7. Limits

- The try-it tool itself was not run end to end. It refuses 5503 by design, and the brief allows me that port only.
  Its demo loop was replicated with its own exported steps, plan check and runner.
- migrate-clean stops at its first refusal, so the per-layer verdicts come from `layers.mjs`. That script runs the SQL
  probes and 174's block, not the JS-side layers: the system object fingerprint's in-memory comparison, self-tests and
  the audit producer rule.
- Static verdicts for later files are generic (§3). Static runs for the A rows were not made.
- D9 (main's 050 fixture) was not re-run. CI was read, not re-run.
- Mutations were measured on migrate-clean clusters only, not on a provisioned instance. 174 is declared not applied
  there.
- I am the same model family as the Author (§0).
