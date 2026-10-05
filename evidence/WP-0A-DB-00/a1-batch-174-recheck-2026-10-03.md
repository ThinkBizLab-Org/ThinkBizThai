# A1 security re-check: batch 174's review round (D11-D14, A1-174-1..5)

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-174` (PR #185, Draft, OPEN, not merged), head `3ab9ab5`
  (`3ab9ab5ba685af37eb155f4f86492932686cb85c`) over code `fb62e17` (`fb62e177db32ba0231b8f37163daedb3dd8ce884`), base
  `600b48b` (main). Previous reviewed head `d111326`. Author `/claude/a0_atlas`.
- **Scope:** NARROW. The review round `d111326..3ab9ab5` (the three cherry-picked reviews, `fb62e17`, the handoff refresh
  `3ab9ab5`), read against my own review (`a1-batch-174-security-review-2026-10-03.md`), the plan §1, §3 and §7, the
  disposition §6 (D11-D14) and `open_blockers[202]`; the questions put to this run re-measured on the whole branch.
- **Checked out as:** local branch `recheck/a1-batch-174` at `3ab9ab5`, in this run's own worktree (`wf_f7b078b4-0cd-7`).
  For `check:handoff`, `verify` and the clusters I cloned this worktree into my private directory (`a1-174r2/clone`),
  created the branch NAME there at `3ab9ab5` (`git rev-parse --abbrev-ref HEAD` printed it) and pointed the clone's
  `origin/HEAD` at `main` (`600b48b`). Nothing was committed in the clone.
- **Status:** this file records findings. It advances no status and approves nothing: not batch 174, not D11-D14, not
  the number 174. It fixes nothing.
- **File name:** carries the phase's date (2026-10-03), as every record of this phase does; written 2026-10-06.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, of the same vendor and model
family as the Author. Under RFC-2026-024 that is the stated independence limit of this role run. Accepting this re-check
as the A1 role's signature is the Integration Owner's and the Product Owner's act, not mine. That includes what §3
(A1-174R-1) says about CTR-TEN-001's narrowing, which `open_blockers[202]` (2) asks of A1 "explicitly at its re-check".

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; my review of `d111326`; `git diff d111326..fb62e17` for the code paths (174's header,
`scripts/db/run.mjs`, `test-kits/db/foundation-contract.test.mjs`, `test-kits/integrity-manifest.json`,
`tests/db/identity/isolation-cases.mjs`, `work-packages/WP-0A-DB-00.json`); plan §7 and the changed sentences of §1 and
§3; disposition §6; `git diff d111326..3ab9ab5` of the handoff, every changed field; every executor of the catalog rule
probes (`grep` over `scripts/`, `test-kits/`, `tests/`, `Makefile`, `.github/`: `PINNED_GRANT_PROBE_SQL` is fed only
through `CATALOG_RULE_PROBES` -> `catalogProbeJobs` -> `probeJobScript`, `scripts/db/run.mjs:4313`); the
foundation-contract pin of `probeJobScript`'s `set local search_path = pg_catalog` line (`:3128-3131`).

**Measured** (Node `v24.20.0`, checked before every run, first on PATH at `/Users/bank/.local/node-v24.20.0/bin`;
PostgreSQL 17.11 from `/opt/homebrew/bin` on `127.0.0.1:5501`, TCP only, `-c unix_socket_directories=''`,
`initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the shim first, re-initdb every round; private directory
`a1-174r2/`; the cluster stopped and removed at the end, port 5501 free after):

| # | What | Result |
|---|---|---|
| R1 | `node scripts/verify-branch-scope.mjs 600b48b WP-0A-DB-00` (worktree, `recheck/a1-batch-174` at `3ab9ab5`) | exit 0: "all 23 changed path(s) are declared, and every amendment explains one" (20 before + the three review files) |
| R2 | `npm run check:handoff` on the branch NAME (clone) | exit 0: "describes the branch: nothing substantive after its cited head" |
| R3 | `npm run verify` on the branch NAME (clone) | exit 0: `clean: exit 0 — tests 692, pass 692, fail 0, skipped 0, todo 0` |
| R4 | two clean rounds r1, r2: `make db-migrate-clean`, then `make db-rls-smoke` | all four exit 0. Post-migrate pass 55 / 39 / 16; pinned grant probe "refused each of its 12 drifts"; pinned check probe "refused each of its 2 drifts" (the `{1,255}` drift, Q0 F3); 1200 isolation cases; `job-names-its-tenant-context` ok; `db-authz-proofs: ok — 14 claim(s) discharged by execution; 1 not run on this cluster (worker-login-authentication)` |
| R5 | live catalog after r1: client privilege on any column of `app.jobs`; grantees of the four columns; policies, rule dependants, function bodies naming `app.jobs` | 0 client column privileges; on the four, `app_worker` SELECT and INSERT only (plus the superuser owner); 0 policies; 0 dependants; 0 function bodies |
| R6 | client read of `actor_id` | `authenticated`: `42501 permission denied for table jobs`; `anon`: `42501 permission denied for schema app` |
| R7 | `app_worker` inserts a job with a forged actor (`'user'`, the nil uuid) and an explicit workspace id | `42501 new row violates row-level security policy for table "jobs"`. (A first form, `insert ... select ... from app.workspaces`, completed silently because `app_worker` sees 0 workspaces under RLS, so it inserted 0 rows; a measurement artefact, not an admission) |
| R8 | the shape on the live CHECK text (`^[A-Za-z0-9._:-]{1,128}$`, the same on all three ids) | admits a ten-digit mobile shape, a 13-digit citizen-ID shape, a dotted personal name, 128 characters; refuses `@`, a leading `+`, spaces, a newline, 129 characters. Unchanged from M6, as the round says (comment only) |
| R9 | D13: `PINNED_GRANT_PROBE_SQL` (imported from the clone's `run.mjs`) run under a session default `search_path = app, public` on r1's cluster | with `set local search_path = pg_catalog` before it, as `probeJobScript` sets it: silent, exit 0. Without that line: exit 3, 31 `missing` and 31 `unlisted`, which is C0-174-2's scenario. `PINNED_FUNCTION_EXECUTE` has 31 rows |
| R10 | drift d1, `grant create on database postgres to app_worker;`, appended to `140_audit.sql` | `migrate-clean` exit 2; pinned grant probe: `app_worker CREATE on the current database (P0001)` |
| R11 | drift d2, `grant execute on function app.jwt_subject() to app_maintenance;` (140) | exit 2; `unlisted: app_maintenance EXECUTE on app.jwt_subject() (P0001)` |
| R12 | drift d3, `create role a1_probe_group nologin; grant a1_probe_group to authenticated; create policy a1_probe_group_reads on app.content_ideas for select to a1_probe_group using (true);` (140) | exit 2 at apply: `174_job_tenant_context.sql: batch 174: a policy TO a role a client role is a member of reads membership without the helper ...: content_ideas.a1_probe_group_reads (TO a1_probe_group) (P0001)` |
| R13 | `open_blockers` in `d111326` vs `3ab9ab5` (a script comparing every array entry) | only `[202]` changed, and the old string is a strict prefix of the new; no other entry or field moved |
| R14 | `gh`: PR #185; runs on the branch | #185 Draft, OPEN, head `3ab9ab5`, not merged. Run 37327469747 on `d111326`: `success`; its log carries the pinned grant probe claim with "no non-superuser role holds CREATE on any database" and "exactly the 31 pinned", "refused each of its 12 drifts", post-migrate 55 / 39 / 16, `db-authz-proofs: ok — 15 claim(s) discharged by execution`. Run 37344835530 on `3ab9ab5`: **in progress** when this file was written |

Every drift was appended to the clone's `140_audit.sql`, on a fresh cluster each round, and the file was restored byte
for byte after each (`cmp` silent; `git hash-object` `fa7f3cd0...` equal to the committed blob; the clone's
`git status --porcelain` empty). `174_job_tenant_context.sql`'s blob `a1a3f0d8...` equals `HEAD`'s. The worktree was
clean before this file was written.

**Not measured by me** (read only): `npm run check` on the uncommitted round tree and `commit-when-clean` at `fb62e17`
(the handoff records both); CI on `3ab9ab5`; the CI negative control change offered on `[202]` (4); try-it.

## 2. The questions asked

**Can a client or the worker write a job with a forged actor, or an unbounded or PII-shaped id?** A client: no, no
privilege on any column (R5, R6). The worker: not today, because no policy admits `app_worker` (R7); the round changed
no statement (174's diff is comment lines only, the blob re-measured in R4). When an enqueue path lands, the actor is
bound by shape alone; that is A1-174-1, now owed by name to the first enqueue path (D14) with both of my remedies.
Unbounded: no (1-128, R8). PII-shaped: digits-only numbers, a citizen-ID shape and dotted names still fit (R8); the round
now says so in 174's header (`:37`), the handoff's impact field and `[202]` (5), which is what A1-174-2 asked.

**Does the new column leak to any client read path?** No (R5, R6): no client grant, view, rule, function or policy.

**Do the new pins catch** CREATE on the database to `app_worker` (yes, R10), a stray EXECUTE (yes, R11), a policy TO a
group role `authenticated` inherits (yes, at apply, R12)? Yes, unchanged by the round. Rule 11's names are stable
because the probe's only executor pins `search_path` (R9 and the grep in §1), so D13 is TRUE.

**Anything newly opened?** No. The round changed a migration comment, a probe comment, one self-test drift (now a
bound PostgreSQL can run, so the pinned check probe's second drift is a real refusal rather than a text no row could
pass), a static test's regex (wider), a test comment, and records. None adds a grant, role, policy, function or path.

## 3. Findings

Grades: HIGH (stop-the-line or blocks merge), MEDIUM (owed before the dependent batch lands), LOW (owed, recorded),
INFO (no remedy required here).

### My earlier findings

| finding | asked | done in the round | verdict |
|---|---|---|---|
| A1-174-1 (LOW) | owe the actor's binding to the first enqueue path: actor from `app.jwt_subject()` in a definer command, never a parameter; a CHECK that a `user` actor is a uuid; recorded on `[202]` | D14; `[202]` (5) and the handoff's `known_limitations` and impact field name both remedies and the owner | **closed as recorded**; the obligation stays open on `[202]` (5) with A1 to review that batch |
| A1-174-2 (LOW) | state that the shape is not a PII control on `[202]` (5) and in the handoff; do not edit 174's statements | 174 `:37-38` (comment only), `[202]` (5), the handoff's impact field and `known_limitations` | **closed**; the texts are now true and complete (R8) |
| A1-174-3, A1-174-4 (INFO) | none | stated as limits on `[202]` (5) and in the handoff | as recorded |
| A1-174-5 (INFO) | none | none | as recorded |

### A1-174R-1 (INFO). CTR-TEN-001's narrowing: no security objection; the acceptance is not this run's to give

- **Where:** `work-packages/WP-0A-DB-00.json` `open_blockers[202]` (2) and its REVIEW ROUND tail; disposition §6 D11.
- **What:** `[202]` asks A1, as CTR-TEN-001's co-owner, to accept or reject the narrowing explicitly at this re-check.
  On security and privacy grounds this run does **not** reject it: the store refuses strictly more than the contract
  (length over 128, any character outside `[A-Za-z0-9._:-]`), which removes injection, log-forging (newline) and
  free-text shapes and opens nothing (R8); D11's ordering, that the contract restatement lands before any producer
  enqueues into `app.jobs`, is the right ordering, because until then no value the contract emits can reach the table
  (R7). Whether this statement is the A1 role's acceptance is the Integration Owner's and Product Owner's act (§0).
- **Remedy:** none for the Author. If the Integration Owner and Product Owner accept this record as the role's, `[202]`
  (2)'s A1 item can be read as answered; otherwise it stays owed.

### A1-174R-2 (INFO). The wider writer regex still reads only qualified INSERT spellings

- **Where:** `test-kits/db/foundation-contract.test.mjs:6054`.
- **What:** C0-174-4's regex now reads quoted, spaced, newline and any-case spellings of `app.jobs`. It does not read an
  unqualified `insert into jobs` under a `search_path` naming `app`, or a `COPY app.jobs`. This is not a security gap:
  the four columns are NOT NULL with no default, so any writer that omits them fails at run time (23502), and the store's
  CHECKs hold whatever writes. The static test is a fixture-hygiene check.
- **Remedy:** none required.

## 4. Claims checked

| Claim (where) | Verdict |
|---|---|
| Cherry-picks with `-x`, each touching only its review file (plan §7, A0's report) | TRUE: `d111326..fc98353` adds exactly the three review files (`git diff --stat`) |
| 174's statements unchanged; only the header comment moved (plan §7 A1-174-2, A0's report) | TRUE: the diff is two comment lines; r1, r2 green with the same 1200 cases and the same proof summary |
| D13: the probe is silent under `search_path = app, public` with the executor's line, 31 missing / 31 unlisted (exit 3) without it; `probeJobScript` is the only executor; foundation-contract pins the line | TRUE (R9; §1 grep; `foundation-contract.test.mjs:3128-3131`) |
| Q0 F3: the pinned check probe's drift is `{1,255}`; digest `3ba8cd283ac50444` -> `792a2204f6d7a5da` with its reason | TRUE (`run.mjs:2337-2338`; the digest and its comment in foundation-contract; R3 green; R4 "refused each of its 2 drifts") |
| C0-174-4: the writer regex reads every listed spelling and not `app.jobs_archive` | TRUE as read (the test's own cases; R3 green); limit A1-174R-2 |
| Q0 F1 / D12: plan §1, §3 and `isolation-cases.mjs:2710-2715` now say the static writer test holds the four columns | TRUE as read |
| `open_blockers[202]` only appended (a strict append) | TRUE (R13) |
| The handoff cites `600b48b..fb62e17` and `3ab9ab5` changes only the handoff | TRUE (R2; `3ab9ab5` touches one file) |
| Handoff: scope verifier 23 paths, exit 0 | TRUE (R1) |
| Handoff: r1 and r2 green, 55 / 39 / 16, 12 and 2 drifts refused, 1200 cases, 14 proofs + 1 NOT RUN | TRUE on my own two rounds (R4) |
| Handoff: `npm run check` 692/692 on the uncommitted tree; `commit-when-clean` exit 0 at `fb62e17` | NOT MEASURED; `verify` on `3ab9ab5` is 692/692 (R3) |
| Handoff impact field and `known_limitations` on A1-174-1 and A1-174-2 | TRUE (R7, R8) |
| PR #185 Draft, OPEN, not merged; pushed without force (A0's report) | TRUE for state and head (R14); "without force" NOT VERIFIED by this run (`3ab9ab5` descends from `d111326`, which is consistent with it) |
| Rules 10 and 11 read off this branch's first CI run (`[202]` (4)) | TRUE for run 37327469747 on `d111326` (R14); the Integration Owner's recording of it is its own |

## 5. Stop-the-line verdict

**No stop-the-line.** No tenant leakage, secret exposure, lost job, migration divergence or contract mismatch is
introduced by the round. The narrowing is stated and ordered (D11), not hidden.

**Does anything block the merge?** No A1 finding does. Every A1 item on `d111326` is closed as recorded or stated as a
limit; the two new items are INFO. The merge still waits on what is not A1's: a green `bootstrap` on `3ab9ab5` (run
37344835530 was in progress), the Integration Owner's acceptance of the number 174 (`[202]` (1)), the C0 and Q0
re-checks, and the Integration Owner's and Product Owner's reading of A1-174R-1 for `[202]` (2).

## 6. Limits

- Same vendor and model family as the Author (§0). Not the A1 role's signature, and not CTR-TEN-001's co-owner
  acceptance unless the Integration Owner and Product Owner make it so.
- Narrow: the drifts re-run were d1, d2 and d3 of my review; d4-d10 were not re-run, because the round changed no
  statement any of them reads (re-measured: 174's blob, the probe SQL as executed in R4, R9).
- PostgreSQL 17.11 migrate-clean clusters only; nothing on the provisioned instance.
- `check:handoff`, `verify` and the clusters ran in a local clone on the branch name, with `origin/HEAD` set to `main` by
  me; CI for `3ab9ab5` had not finished.
