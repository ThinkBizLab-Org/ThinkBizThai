# Q0 independent test re-check of batch 173-worker's review round

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Date:** 2026-10-05 (the file name
carries the phase's date, 2026-10-03, as every record of this phase does).
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-173-worker`, head `f1f006a` over code commit `631512b`, base `aa0e89f`
(main). Previous reviewed head `b001495` (my record: `q0-batch-173-worker-test-review-2026-10-03.md`, cherry-picked as
`b2ed62f`). Author `/claude/a0_atlas`. PR #184 (Draft).
**Checked out:** my own branch `recheck/q0-batch-173-worker`, created at `f1f006a`. The guard commands were run with
`agent/claude/WP-0A-DB-00-batch-173-worker` itself checked out by NAME (`git checkout --ignore-other-worktrees`,
read-only, no commit made on it), then switched back.

This file records findings. It advances no status, approves nothing, and fixes nothing. It is a NARROW re-check: my
own findings F1-F5 first, then the review round's new code (`b001495..631512b`) and its records.

## 0. What I am

A subagent of `/claude/a0_atlas`'s orchestration, the same vendor and model family as the Author (RFC-2026-024 states
what that independence is worth and what it is not). Separation here is of run, worktree, branch and evidence, not of
mind. Whether this record is accepted as the Q0 role's signature is the Integration Owner's and the Product Owner's act,
not mine. Every claim below is labelled **measured** (I ran it, this run) or **read** (from the tree, a document or a
log, not executed by me).

## 1. Verdict

- **Stop-the-line: none.**
- **F1 (medium) is remedied** (measured): the §5/10 proof now reads all 51 tables `app_worker` may read by table or
  column grant, asserts `app.jobs`, and RFC §5/10's own drift (a permissive `for select to app_worker` policy on
  `app.jobs`) now turns `worker-login-reads-nothing-by-default` red, appended to `140_audit.sql` and in a later file
  alike. Reverting the enumeration to `has_table_privilege` turns it red too. **F2 (low) is remedied** (measured): a
  `trust` line reaching the role through `+app_worker`, a `/regex` or `all` inside a list is FAIL, not NOT RUN; a
  `+group` the role is not in stays RUN and ok. **F3** is disposed of by name (owed, `open_blockers[201]` (11); the
  RFC's Implemented line now says §5/5's scan half is not implemented). F4 and F5 are answered (§4).
- **Merge: nothing in Q0's scope blocks it.** One new LOW (R1, a record gap: D13 and D14 are not in the disposition)
  and four INFO. None needs to be fixed before the merge; R1 should be fixed or disposed of by name.
- Guards green on the branch **name** (measured): `verify-branch-scope` exit 0 (20 paths), `check:handoff` exit 0,
  `npm run verify` exit 0, 691/691.

## 2. Measured vs read: guards, rounds, demo

Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`, checked before every measured run; the PATH Node 26 never
used). PostgreSQL 17.11, `127.0.0.1:5503` only, TCP only (`unix_socket_directories=''`), `initdb --locale=C -A trust -U
postgres`, `LC_ALL=C`, shim first, re-initdb every round, private directory `scratchpad/q0-173-workerr2/` with `TMPDIR`
pointed into it. Cluster stopped and removed at the end; port 5503 free (`lsof` exit 1).

| what | result |
|---|---|
| `node scripts/verify-branch-scope.mjs aa0e89f WP-0A-DB-00`, branch name | **measured** exit 0, "all 20 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff`, branch name | **measured** exit 0, "describes the branch: nothing substantive after its cited head" |
| `npm run verify`, branch name | **measured** exit 0, "clean: exit 0 — tests 691, pass 691, fail 0" |
| base rounds 1, 2, 3 (fresh clusters) | **measured** migrate-clean exit 0 (post-migrate pass 54 / 38 / 16); rls-smoke exit 0, 1200 cases, `13 claim(s) discharged by execution; 1 not run (worker-login-authentication)` |
| §5/10 on base 1 | **measured** "51 of 51 table(s) app_worker may SELECT hold rows" (app.jobs 2, app.outbox_events 2, app.consumer_ledger 2 among them); "every one of the 51 reads zero rows"; control on `app.jobs` `[{"t":"app.jobs","n":"2"}] -> red` |
| A1-173-1 on base 1 | **measured** session start `{"cu":"app_worker_login","su":"app_worker_login","settings":"0"} -> starts`; self-set default control `settings 1 -> red`; after `set local role` `cu app_worker -> red` — each red for its own reason |
| after every run | **measured** `pg_authid.rolpassword` of `app_worker_login` null; the harness's temporary directory empty |
| cherry-picks `796bd67`, `869217c`, `b2ed62f` | **measured** one file each; `git diff` against `72808c7`, `dde46c0`, `faf6c60` over `evidence/` empty |
| try-it demo | `try-it up --port 5503` refuses ("port 5503 is one this tool never touches", **measured**, by design). The demo loop replicated against 5503 after base 3 (`demo5503.mjs`, as in my first record): **All 17 steps behaved as expected** (**measured**) |
| CI on `f1f006a` | not read (not needed for any finding here) |

### §5/12, pg_hba drifts on base 1 (each prepended, reloaded, rls-smoke, `pg_hba.conf` restored, `cmp` equal)

| id | lines first | result (**measured**) |
|---|---|---|
| H4 | `host all app_worker_login 127.0.0.1/32 scram-sha-256` | exit 0, RUN and ok, 14 discharged; "member of: app_worker, app_worker_login" |
| H1 | `host all +app_worker … trust`, then the scram line | exit 2, FAIL, "pg_hba line(s) 1 trust app_worker_login by name or by a user list other than all (+app_worker)" — **F2's own drift, now red** |
| H3 (control) | `host all +app_command … trust`, then the scram line | exit 0, RUN and ok (the role is not in that group: not over-refused) |
| H5 | `host all /^app_worker … trust`, then the scram line | exit 2, FAIL, "(/^app_worker)" |
| H2 | `host all postgres,all … trust`, then the scram line | exit 2, FAIL, "(postgres,all)" |

## 3. Mutation table

Each mutation applied alone to this branch's tree, then: the static file `node --test
test-kits/db/foundation-contract.test.mjs` (S), a fresh-cluster `make db-migrate-clean` (M), `make db-rls-smoke` on the
same cluster (R); restored with `git checkout` and checked clean after every one (`git status --porcelain` empty;
`140_audit.sql` sha256 `2ac596bb950e8dfb…` before and after each). **Later** = the drift in a new file
`174_q0_mutation.sql` (the drifts on `app_worker_login` cannot go in `140_audit.sql`: the role does not exist when 140
runs, as the plan's D11 says); `app.jobs`'s policy drift was run both in 174 and **appended to 140**. **Code** = 173,
`run.mjs`, `pinned-grants.json` or `authz-proofs.mjs` edited coherently, the Author's pins moved with it, and the
catalog-rule probe digests refreshed to the mutated probes with the test's own sha256 recipe, so S fails only on a real
assertion. A file 174 alone makes S fail 19 tests for one reason unrelated to the mutation (174 is not in the snapshot's
pending tail): that is the noise floor, excluded below. M stops at its first refusing rule. **Live** = the drift applied
with psql after a clean migrate-clean, before rls-smoke.

| id | mutation | S | M | R | verdict |
|---|---|---|---|---|---|
| L1 | later: `grant app_worker to app_worker_login with inherit true` | noise only (19) | **red**, rule 4b "missing … (admin false, inherit false, set true), unlisted … inherit true" | **red**, §5/7 "expected 42501 … saw 0 row(s) and no error" | right reason, two layers |
| C1 | code: 173's grant `with inherit true`, block and option pin moved | **red**: 173's statements test | **red**, 173 block "holds a schema privilege …: USAGE on app" | red, "credential could not be set" (173 rolled back) | right reason |
| L2 | later: `alter role app_worker_login bypassrls` | noise only | **red**, rule 8 "app_worker_login rolbypassrls" | green (inert after SET LOCAL ROLE) | right reason, one layer |
| C2 | code: 173 `bypassrls`, block and attribute pin moved | **red**: 173's statements test | green | green | static only (F4, unchanged) |
| L3 | later: `grant app_command to app_worker_login …` | noise only | **red**, rule 4 "app_worker_login -> app_command" | **red**, §5/8 "saw the role taken" | right reason, two layers |
| C3 | code: 173 grants app_command too, both pins moved | **red**: statements | **red**, rule 4's self-test "drift 4 was refused without naming app_worker_login -> app_command" | **red**, §5/8 | right reason, three layers |
| L4 | later: `grant select on app.jobs to app_worker_login` | noise only | **red**, "unlisted: app_worker_login SELECT on app.jobs" | green (inert: no USAGE on app) | right reason |
| C4 | code: 173 grants it, `pinned-grants.json` row added, block §4 silenced | **red**: statements; the silencing guard | green | green | static only (F4, unchanged) |
| L5 | later: `alter role app_worker_login password '…'` | **red**: 173's credential test (beyond the noise floor: 20) | **red before any script**, "174_q0_mutation.sql line 2: a PASSWORD clause that is not PASSWORD NULL" | red, nothing applied | right reason |
| C5 | code: 173's own `password '…'` | **red**: statements / credential | **red before any script**, "173 … line 69: a PASSWORD clause" | red, nothing applied | right reason |
| C6 | code: **the two-row assertion dropped** (173's `SET LOCAL createrole_self_grant` removed, block §3 silenced) | **red**: statements; the silencing guard | green (superuser applier) | green | static only on migrate-clean, as in my first record |
| L7 | later: **RFC §5/10's own drift**, `create policy … on app.jobs for select to app_worker using (true)` | noise | **red**, policy set probe "app.jobs.q0_jobs_worker_reads" | **red**: `FAIL worker-login-reads-nothing-by-default`, "§5/10: app_worker sees rows with no policy naming it: app.jobs (2)"; and `service-sees-zero-job-rows` | **F1 closed** (before the round this proof stayed ok) |
| L7-140 | the same policy **appended to `140_audit.sql`** | **red**: retention map, 141-prep §8.4, lexer corpus (140's text changed) | **red**, policy set probe | **red**, the same FAIL and the same message | **F1 closed**, right reason |
| N2 | code: §5/10's list back to `has_table_privilege` | **red**: the batch-173 harness test (fake driver) | green | **red**, "app.jobs, the table RFC-2026-028 §5/10 names, is not among the tables app_worker may read …" | right reason (see R3 for the message's second half) |
| N4 | code: the §5/10 control's policy back on `app.workspaces` | **red**: the fake-driven test | green | green | static only (R5) |
| L8 | later: `alter role app_worker_login set role = 'app_worker'` | noise only | **red**, client membership probe "client role setting default(s) not pinned … app_worker_login in every database: role=app_worker" | **red**: §5/7, §5/9 and A1-173-1 "current_user app_worker and session_user app_worker_login are not both …; 1 pg_db_role_setting row(s)" | right reason, two layers |
| P1 | live: the same default, after migrate-clean | (unchanged) | (clean) | **red**, the same two proofs, the same reasons | the harness check holds where the probes do not run |
| P2 | live: `alter role app_worker_login set search_path = 'app'` | (unchanged) | (clean) | **red**, only `worker-login-no-workspace-lingers`, "1 pg_db_role_setting row(s) set defaults for app_worker_login" | right reason: only A1-173-1's check sees it |
| N1 | code: `workerSessionStartProblem`'s settings arm made `if (false)` | **red**: the fake-driven test | green | **red**, "A1-173-1 control: a login default for the role was not refused, so the check cannot fail" | right reason: the control discriminates |
| N3 | code: `hbaRulesTrustingTheLogin`'s `+group` arm removed | **red**: the pure-function cases and the `+app_worker` fake fixture | green | green on trust; under H1's `+app_worker` line: **NOT RUN**, exit 0 | static only (R5) |

Every new case and proof that went red went red for its own reason. The two new controls of A1-173-1 discriminate (N1),
the `app.jobs` assertion discriminates (N2), and the group rule's live arm is held by the fake-driven static test (N3).

## 4. My earlier findings

| finding | status | evidence |
|---|---|---|
| F1 (medium) §5/10 never read `app.jobs` | **closed** | `authz-proofs.mjs:1206` `has_any_column_privilege`; `:1209` asserts `WORKER_NAMED_TABLE`; `:1220-1224` control on `app.jobs`; L7, L7-140, N2 above (measured). Claims corrected in plan §2 row 10, `open_blockers[113]`, the RFC's Implemented line, the handoff (read, compared). 050's cases through the login role owed on `[201]` (12): the three 050 tables (`jobs`, `outbox_events`, `consumer_ledger`) are among the 51 read zero (measured), so "the proof reads every one of their tables zero through it" is TRUE |
| F2 (low) group trust read NOT RUN | **closed** | `authz-proofs.mjs:1028-1038`; H1, H2, H5 FAIL, H3 RUN ok (measured) |
| F3 (low) the scan does not name a verifier | **disposed of by name** | `[201]` (11), owner the Integration Owner; RFC Implemented line says §5/5's scan half is not implemented (read). Not re-measured |
| F4 (info) C2/C4/C6 static-only | unchanged, as expected (re-measured, §3) | — |
| F5 (info) | answered: 173's comment now says `pg_shdepend` (read, statements unchanged; 173's statements test green on the branch); D13 `RUNNER_TEMP` (`workerCredentialBase`, `:1064`); column-name case stated on `[201]` (8); `VERIFICATION.md` 691/691 true (measured) | see R4 on the `VERIFICATION.md` wording |

## 5. New findings

### R1 (low) — D13 and D14 are answered "under the delegation" but are not in the disposition

The handoff's `assumptions` says "D13 … and D14 … answered as A0 recommends under the delegation", and plan §7
(`a0-batch-173-worker-plan-2026-10-03.md:160`, `:165`) labels them so. The disposition, whose §4 says each such answer
is "recorded here and in plan §4"
(`product-owner-disposition-2026-10-03-batch-173-worker.md:84-110`), lists D1-D12 only and was not touched in the review
round; plan §4 carries D1-D12 and corrects D12 in place. Its D10 and D12 also now read narrower than the round's
corrections (by-name only; "measured" without saying by whom). Nothing is false about what the code does; the record of
what was decided under the delegation is incomplete. **Remedy:** append D13 (credential directory) and D14 (A1-173-1 (a)
recorded in the Implemented line, not the approved sections' text) to disposition §4, with a pointer from D10 and D12 to
plan §7; or record in the disposition that plan §7 is their record.

### R2 (info) — on the failure path the server log carries the per-run verifier

Measured: in C1 (173 rolled back, so the role does not exist) the harness's `alter role app_worker_login password
'SCRAM-SHA-256$…'` failed and PostgreSQL logged it as `STATEMENT:` in the cluster's server log (`log_min_error_statement`
default `error`). The proof's own output is scrubbed ("the test credential could not be set"); the verifier is of a
random per-run password for a role that does not exist, on a throwaway cluster, so nothing can use it. A0's "no
`SCRAM-SHA-256$` in any smoke or server log" is true of its green runs. I redacted the line in my private log.
**Remedy (optional):** feed `set local log_min_error_statement = panic;` before the `alter role` in
`workerLoginCredential` (`authz-proofs.mjs:1067-1080`), or read that the role exists first; or state the limit on
`[201]` (8).

### R3 (info) — §5/10's second message is wrong when `app.jobs` is unlisted

N2 printed "… is not among the tables app_worker may read …; **app.jobs holds no fixture row as the connection role**".
`app.jobs` holds 2 fixture rows; `populated` is built from the listed tables only (`authz-proofs.mjs:1213-1222`), so the
second clause follows from the first, not from the fixture. Fail-closed, harmless. **Remedy:** test `populated` only when
the table is listed.

### R4 (info) — wording

- `hbaRulesTrustingTheLogin` counts `samerole`/`samegroup` in the user list (`authz-proofs.mjs:1030`); in pg_hba those
  are database-field keywords, and in the user field they would match only a role so named. A `/regex` that cannot match
  the role is counted too, and `@file` never reaches `pg_hba_file_rules` unexpanded. All fail-closed over-counts the
  comment half-states ("cannot be ruled out from here"); no action needed beyond the comment.
- Plan §7's C0-4 row says `evidence/VERIFICATION.md` "is re-recorded only after the refresh in this round"; the file did
  not change in `b001495..f1f006a`. Its values (691/691) are true at the head (measured), so this is wording only.

### R5 (info) — the round's two new live arms rest on the static test alone

N3 (the `+group` arm removed) and N4 (the control back on `app.workspaces`) pass migrate-clean and rls-smoke; N3 on a
`+app_worker` trust cluster reads NOT RUN again. Only foundation-contract's fake-driven test and pure-function cases
refuse them. That is the same shape as F4 and adequate for code changed only with a reviewed diff; recorded so the
weight is visible.

## 6. Claims checked

| claim (where) | status |
|---|---|
| cherry-picks -x: C0 72808c7→796bd67, A1 dde46c0→869217c, Q0 faf6c60→b2ed62f (A0 report, plan §7) | TRUE, measured |
| §5/10 lists 51 tables by table or column grant, asserts app.jobs with a fixture row, control on app.jobs (commit 631512b, plan §2/§7, `[113]`, RFC, handoff) | TRUE, measured |
| RFC §5/10's drift appended to 140 turns the proof red (commit, plan §7) | TRUE, measured (L7-140) |
| a trust line via +group / pattern / list-with-all is FAIL; membership via `pg_has_role … MEMBER`, fails closed (commit, plan, `[201]`) | TRUE, measured (H1, H2, H5, H3) and read; the fail-closed branch read and covered by the fake test |
| `workerSessionStartProblem` / `WORKER_SESSION_READ` and two controls (commit, plan, `[201]` (5), RFC) | TRUE, measured (base 1, N1, P1, P2) |
| D13: RUNNER_TEMP else `os.tmpdir()` | TRUE, read (`:1064`) and the fake test |
| C0-1 condition: migrate-clean wraps every file (`[201]` (2)) | TRUE, read (`scripts/db/psql-driver.mjs:364-366`) |
| D12 / `[201]` (8) / RFC / handoff: inherit, createrole, superuser measured by C0 and A1, not the Author | consistent with the C0 and A1 records (read) |
| `[113]` and `[201]` edits touch only batch 173's own, unmerged text; no other manifest key changes | TRUE, compared structurally `b001495` vs `f1f006a` |
| the RFC: only its Implemented line changes, integrity manifest regenerated | TRUE, read (`git diff`), verify green |
| tests 691 unchanged, no test added (handoff) | TRUE, measured |
| `f1f006a` changes only the handoff, last and alone | TRUE (`git show --stat`), `check:handoff` exit 0 |
| D13, D14 "answered under the delegation" (handoff, plan §7) | recorded in plan §7 only, **not in the disposition** (R1) |
| A1-173-3, 050's cases through the login role, the runner and runbook halves: owed with owners on `[201]` (5), (7), (10), (12) | TRUE, read; not re-measured |

## 7. Stop-the-line and merge

No stop-the-line. F1 and F2 are closed by measurement, F3 is disposed of by name, F4/F5 answered. Nothing in Q0's scope
blocks the merge; R1 (low) should be fixed or disposed of by name, R2-R5 need no action to merge. The C0 and A1
re-checks and CI on `f1f006a` are not mine to read here.

## 8. Limits

- One cluster, PostgreSQL 17.11 on macOS, trust auth except where `pg_hba` was edited; the platform half of Q-028-13,
  the pooler and CI's service container are not measured here.
- The demo was replicated, not run through `try-it` (it refuses 5503 by design).
- M stops at the first refusing rule, so a later layer that would also refuse is not shown for every mutation.
- CI on `f1f006a` not read; `npm run record:verification` not run (it rewrites a tracked file).
- Scratch scripts (`round.sh`, `hba.sh`, `mrun.sh`, `mutate.py`, `refresh.mjs`, `demo5503.mjs`, `presmoke.*`) and every
  log are in `scratchpad/q0-173-workerr2/`; the one verifier line in its server log is redacted (R2); nothing there holds
  a credential.
