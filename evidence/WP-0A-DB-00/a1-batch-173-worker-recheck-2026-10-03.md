# A1 security re-check: batch 173-worker's review round (migration 173, the worker's login identity, RFC-2026-028)

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-173-worker` (PR #184, Draft, OPEN, not merged), head `f1f006a`
  (`f1f006a874ff88311465f1cea75ff83509d9a392`) over code `631512b` (`631512bb5b4c1f305ad436f6101a733ec20debab`), base
  `aa0e89f` (main). Author `/claude/a0_atlas`. Previous reviewed head `b001495`; my review of it is
  `a1-batch-173-worker-security-review-2026-10-03.md` (A1-173-1..6), cherry-picked here as `869217c`.
- **Scope:** NARROW. The review round's corrections (`git diff b001495..f1f006a`: 11 paths, of which code is
  `scripts/db/authz-proofs.mjs`, `test-kits/db/foundation-contract.test.mjs` and a comment-only hunk of
  `173_worker_login_identity.sql`) and my own six findings first; nothing outside that was re-reviewed.
- **Checked out as:** local branch `recheck/a1-batch-173-worker` at `f1f006a`, in this run's own worktree
  (`wf_5ea6382b-87d-7`). For `verify-branch-scope`, `check:handoff` and `verify` I checked out the branch NAME
  `agent/claude/WP-0A-DB-00-batch-173-worker` in the same worktree (`--ignore-other-worktrees`; `git rev-parse
  --abbrev-ref HEAD` printed that name at `f1f006a`), committed nothing there, and switched back to
  `recheck/a1-batch-173-worker` before writing this file.
- **Status:** this file records findings. It advances no status and approves nothing: not batch 173, not its review
  round, not RFC-2026-028, not D12-D14, not the number 173. It fixes nothing.
- **File name:** carries the phase's date (2026-10-03), as every record of this phase does; written 2026-10-05.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, of the same vendor and model
family as the Author. Under RFC-2026-024 that is the stated independence limit of this role run. Accepting this
re-check as the A1 role's signature is the Integration Owner's and the Product Owner's act, not mine; where the RFC or
`open_blockers[199]` name "A1's acceptance as DATA-DEC-03's co-owner", this file is a findings record, not that
acceptance.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-173-worker-plan-2026-10-03.md` (§2 row 10, §4 D12, §7 whole); the
disposition `product-owner-disposition-2026-10-03-batch-173-worker.md` (unchanged since `b001495`); both commit
messages (`631512b`, `f1f006a`); `git diff b001495..f1f006a` for code in full, and for the RFC, manifest and handoff
the changed text; RFC-2026-028's line 6 (the only line the round changed in it); my own review.

**Read and not measured:** the C0 and Q0 review files, beyond the rows of plan §7 that name my findings.

**Repository checks, on the branch NAME** (Node `v24.20.0`, checked first):

| Command | Exit | Result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs aa0e89f WP-0A-DB-00` | 0 | "all 20 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 691, pass 691, fail 0, skipped 0, todo 0" |

**Live measurements.** Node `v24.20.0` printed before every run; PostgreSQL 17.11 (`/opt/homebrew/bin`) on
`127.0.0.1:5501` only, TCP only (`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`,
`LC_ALL=C`, the shim first, then `make db-migrate-clean` and `make db-rls-smoke`; re-initdb every round; private
directory `scratchpad/a1-173-workerr2/` with `TMPDIR` pointed inside it. Drifts appended to `140_audit.sql` and restored
byte for byte (`cmp` after each; at the end the blob is `fa7f3cd0…`, equal to `aa0e89f`'s; `git status` clean). The
cluster was stopped and its directory removed at the end; port 5501 free (`lsof` exit 1); the `tmp` and `runner_temp`
directories empty, and no `SCRAM-SHA-256$` string in any log of the private directory.

| Round | What | Result |
|---|---|---|
| r1 | clean, `-A trust` | migrate-clean 0, rls-smoke 0; 1200 isolation cases; `db-authz-proofs: ok — 13 … 1 not run (worker-login-authentication)`; §5/10 "51 of 51 … hold rows", "every one of the 51 reads zero rows", control on `app.jobs` red; session start `{"cu":"app_worker_login","su":"app_worker_login","settings":"0"} -> starts`, both controls red; stored credential null after |
| r1 catalog | as superuser on r1 | in `app`: 22 tables by table grant, 51 by any column grant, 0 of the 51 without RLS enabled and forced; `private` and `catalog_baseline`: 0, no USAGE; no view, matview, foreign table or sequence readable; `app_worker` and `app_worker_login` both NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB NOREPLICATION NOBYPASSRLS, no credential; members of `app_worker`: `postgres` and `app_worker_login` (inherit f, set t, admin f); 0 `pg_db_role_setting` rows for the role or for all roles; the only function `app_worker` can execute outside system schemas is `app.knowledge_scope_applies` (invoker), which the login role cannot; `has_table_privilege('app_worker','app.jobs','SELECT')` false, `has_any_column_privilege` true |
| r1a | on r1, AS `app_worker_login`: `alter role app_worker_login set role = 'app_worker'` | succeeds; next session `current_user=app_worker`, `select count(*) from app.workspaces` returns 0 (not 42501); `authz-proofs.mjs` exit 1: `FAIL worker-login-no-workspace-lingers` "current_user app_worker and session_user app_worker_login are not both app_worker_login; 1 pg_db_role_setting row(s)", and `FAIL worker-login-can-only-become-app-worker`; reset as superuser |
| r1b | same, `… set search_path = app` | succeeds; session still `app_worker_login`, `42501` on `app`; `authz-proofs.mjs` exit 1, `FAIL worker-login-no-workspace-lingers` "1 pg_db_role_setting row(s) set defaults for app_worker_login" |
| r1c | same, `… in database postgres set role = 'app_worker'` | succeeds; session `app_worker`; exit 1, both arms named; reset with `in database postgres reset all` (a bare `reset all` left the row: "settings left: 1") |
| r2 | `pg_hba`: `postgres` trust by name, every other role `scram-sha-256`; `RUNNER_TEMP` set to a private directory | migrate-clean 0, rls-smoke 0, `db-authz-proofs: ok — 14`; `worker-login-authentication` RUN, ok; the transcript names the password file under `…/runner_temp/tbt-worker-login-…/` (D13 measured); afterwards stored credential null, guessed, empty and no password refused (`password authentication failed`, `fe_sendauth: no password supplied` ×2); `runner_temp` and `tmp` empty; no `SCRAM-SHA-256$` in smoke, migrate or server log |
| h1-h8 | on r2's cluster, a first `pg_hba` line then the r2 lines, reloaded, `authz-proofs.mjs` | `+app_worker trust`: connects with no credential, exit 1 `FAIL` "(+app_worker)"; `postgres,all trust`: FAIL; `/^app_worker trust`: FAIL; `@workers.list trust` with the file holding `+app_worker`: FAIL (the view shows the file's content, `+app_worker`); `@workers.list` holding a non-role name: does not admit the role, RUN ok, 14; `+app_command trust` (not a member): RUN ok, 14; `host postgres all … trust` (user `all`, database-scoped): connects, NOT RUN, 13 + 1 — the stated cluster-trusts-everyone case |
| r3 | 140 + `create policy … on app.jobs for select to app_worker using (true)` (RFC §5/10's drift) | migrate-clean 2 (policy set probe: "policy(ies) no pinned list names: app.jobs.a1_recheck_worker_reads"); rls-smoke 2, `FAIL worker-login-reads-nothing-by-default` "app_worker sees rows … app.jobs (2)" |
| r4 | 140 + `grant create on database postgres to app_worker` (A1-173-3's r14 drift) | **migrate-clean 0**: still unpinned, as `[201]` (10) records |

Static (no database): `fedSqlSources()` returns 96 sources and `workerCredentialLint` returns `[]`; the migration's
only credential clause is `password null` (`173_worker_login_identity.sql:69`), unchanged by the round.

## 2. The questions

**Can `app_worker_login` log in without the harness's test password?** On a cluster that asks it (r2): no; guessed,
empty and absent passwords are refused with the stored credential null after the run. On a `trust`-for-`all` cluster
it logs in with nothing, as every role does (r1; RFC §3.3/1's scope). A `trust` line that admits it other than through
`all` — by name, `+group` it belongs to, a list holding `all`, a regex, or a file whose content does — is now a FAIL,
not NOT RUN (h1-h3, h7). **In CI** (required check `bootstrap`, run `37298454559`, head `f1f006a`, completed
**success** 2026-10-05T11:08:59Z; read from its log): `ok worker-login-authentication`, RUN — the container's
`pg_hba` has six `trust` lines for user `all` then `128 host all scram-sha-256`, membership read `app_worker,
app_worker_login`, wrong credential `password authentication failed`, none `fe_sendauth: no password supplied`, the
generated one connects; the password file under `/home/runner/work/_temp/` (D13: `RUNNER_TEMP`); `db-authz-proofs: ok —
14`; §5/10 "every one of the 51 reads zero rows"; session start `settings 0 -> starts`; no `SCRAM-SHA-256$<n>` string
anywhere in the log.

**Can it act with `app_worker`'s privileges without SET ROLE (INHERIT FALSE)?** As migrated: no (r1: membership
inherit f; `42501 permission denied for schema app` before `set local role`). PostgreSQL still lets the role give
itself a `role` default (r1a, r1c), after which every new session starts as `app_worker`. That is A1-173-1; the round
did not and could not close it in the database, but the harness now detects it on every rls-smoke run (r1a-r1c red),
and the runner's copy is owed.

**Can it bypass RLS?** No: `rolbypassrls` false for both roles; all 51 tables `app_worker` can read by any grant have
RLS enabled and forced, and none in another schema is reachable (r1 catalog); under `app_worker` every one reads zero
rows (r1), and a permissive policy on `app.jobs` turns that red (r3).

**Can it reach any client path?** No: the only non-system function `app_worker` can execute is
`app.knowledge_scope_applies` (invoker), and the r1 proof transcript shows `set local role` to `app_command`,
`app_maintenance`, `authenticated`, `anon`, `app_authz` and `postgres` each `42501`, and `app.close_workspace` `42501`.

**Can it be granted a privilege directly without a probe naming it?** For the login role itself: the round changed
no probe and no statement of 173 (its hunk is a comment); my `b001495` measurements (r8-r12) stand. For `app_worker`:
yes, still (r4) — A1-173-3, owed on `[201]` (10).

**Does any fed source set a password?** No (96 sources, lint `[]`). The harness sets a per-run client-computed
verifier and removes it (r2: null after, no file left, no verifier in any log).

**Is the session-GUC obligation testable?** Yes, now on two axes. `workerTransactionStartProblem` holds A1R-2 (r1, its
control red), and `workerSessionStartProblem` over `WORKER_SESSION_READ` holds A1-173-1's widening: measured red
against three REAL self-set defaults made as the login role (r1a-r1c), not only against its controls. It is a test of
the property at rls-smoke time; the production runner's copy and a static test that the runner calls it are owed
(`[201]` (5), A1-173-6).

**Anything newly opened?** Nothing that widens reach. The round adds a read of `pg_hba_file_rules`, of role membership
and of `pg_db_role_setting`, all as the connection role or the login role; `RUNNER_TEMP` decides only where a 0700
`mkdtemp` directory goes (an unusable value makes the credential step fail, and every worker proof fails with it).
Three INFO notes (§3).

## 3. Findings

Earlier findings, re-checked:

| Finding | Was | Now | Evidence |
|---|---|---|---|
| A1-173-1 | MEDIUM | **PARTLY RESOLVED.** (b) harness copy: resolved (r1a-r1c red; r1 green). (a) recorded as D14 in RFC-2026-028's Implemented line (line 6, the round's only RFC change), not in §3.3/2 or §3.6 — acceptable as a record; the approved sections still read as before. **Open, MEDIUM, owed before any instance holds a credential, not before this merge:** the runner's copy (`[201]` (5)) and the custody runbook's detection of a worker-side `ALTER ROLE` (`[201]` (7)) | `authz-proofs.mjs:1010-1018`, `:1252-1267` |
| A1-173-2 | LOW | **RESOLVED** | `authz-proofs.mjs:1028-1036`; h1-h3, h7 FAIL; h5, h6 RUN ok; h8 NOT RUN as stated |
| A1-173-3 | LOW | **OPEN, unchanged, owed** on `[201]` (10) with owner A0 and the condition "before any credential exists outside a test run"; still reproduces (r4) | `scripts/db/run.mjs` unchanged by the round |
| A1-173-4 | INFO | **RESOLVED**: plan D12, `[201]` (8), the RFC's line 6 and the handoff's limitations attribute §5/1's `inherit`, `createrole`, `superuser` drifts to C0 (and A1), not the Author | plan :116, :164 |
| A1-173-5 | INFO | **RESOLVED**: 173's comment now says `pg_shdepend` covers default ACLs (`:81-83`); D13 puts the password file under `RUNNER_TEMP` when set (r2 measured), and the killed-run limit is stated on `[201]` (8). The transcript still prints the file's path (not its content), which was stated | `authz-proofs.mjs:1063-1065` |
| A1-173-6 | INFO | **OPEN, recorded** on `[201]` (5) for the runner batch | — |

Q0 F1 (not mine; it touches my question on RLS): resolved as claimed — 51 tables by any column grant, `app.jobs` read
and asserted, RFC §5/10's drift on `app.jobs` red at rls-smoke and at the policy set probe (r3); under the
`b001495` code the proof read 22 tables by table grant and `has_table_privilege('app_worker','app.jobs','SELECT')` is
false (r1 catalog), so the "stayed ok before" statement is consistent with what I measured (I did not re-run the old
code).

New, from this round's code:

**A1R2-1 — INFO (the runner's copy should count database-wide defaults too).** `WORKER_SESSION_READ`
(`scripts/db/authz-proofs.mjs:1010-1011`) counts `pg_db_role_setting` rows whose `setrole` is the login role (in any
database; r1c caught the in-database form). A database-wide default (`ALTER DATABASE … SET`, `setrole = 0`) such as
`search_path` is not counted; a database-wide `role` default would still be caught by the `current_user` arm. Only the
database owner or a superuser can set one, not the worker, so this is outside A1-173-1's threat; it matters for the
runner's copy, which also guards against operator drift. **Remedy:** when the runner's copy is written (`[201]` (5)),
also count rows with `setrole = 0` for the current database, or state the limit.

**A1R2-2 — INFO (accuracy of a comment).** `authz-proofs.mjs:1024-1025` says an `@file` entry "cannot be ruled out from
here". On PostgreSQL 17.11 `pg_hba_file_rules.user_name` shows the included file's content, not `@file` (h5, h7: the
view printed `workers` and `+app_worker`), so the expanded names are judged by the other arms and the `@` arm is a
fail-closed fallback that does not fire there. Also, the view reflects the file on disk, not necessarily the rules
loaded; a file edited and not reloaded is judged as written, while the wrong-credential login is judged as loaded.
Neither weakens the proof (it fails closed or reports NOT RUN). **Remedy:** wording, or none.

**A1R2-3 — INFO (accuracy of a failure message).** `WORKER_CASES.readsNothing` (`authz-proofs.mjs:1054`) says
"app_worker sees rows with no policy naming it"; under RFC §5/10's drift (r3) a policy does name it, so the message
misstates the cause it reports. Pre-existing text, newly reachable by the drift the round wired. **Remedy:** "app_worker
sees rows: …".

## 4. Claims checked

| Claim (where) | Verdict |
|---|---|
| Q0 F1: `has_any_column_privilege`, 51 tables, `app.jobs` asserted with a fixture row, control on `app.jobs`; RFC's drift turns the proof red, migrate-clean 2 at the policy set probe (commit `631512b`, plan §7) | TRUE (r1, r1 catalog, r3) |
| A1-173-2 / Q0 F2: trust via `+group`, `@file`, `/regex`, `samerole`/`samegroup`, `all` in a longer list is FAIL; membership by `pg_has_role … MEMBER`, unread fails closed (commit, plan §7, `[201]` (9), RFC line 6) | TRUE as code (`:1028-1036`); measured for `+group`, list-with-`all`, regex, file holding `+group` (h1-h3, h7); unread membership and `samerole` read in the fake-driver test only |
| A1-173-1: `workerSessionStartProblem`, two controls, measured red (commit, plan §7) | TRUE (r1 controls red; and against real self-set defaults, r1a-r1c) |
| D13: `RUNNER_TEMP` when set, else `os.tmpdir()` (commit, plan §7, `[201]` (8), handoff) | TRUE (r2 path under `runner_temp`; r1 under `TMPDIR`) |
| D14: A1-173-1 (a) recorded in the RFC's Implemented line, no approved section edited | TRUE (`git diff -U0 aa0e89f..f1f006a` on the RFC: one hunk, line 6) |
| C0-2 / A1-173-4: D12, `[201]` (8), RFC, handoff corrected | TRUE (text) |
| 173: comment-only change (INFO) | TRUE (one hunk, lines 81-83, comment) |
| A1-173-3, Q0 F3, 050 via login, runner, custody: owed on `[201]` (10), (11), (12), (5), (7) with owners and reasons | TRUE (text); A1-173-3 still reproduces (r4) |
| Blocker edits: `[113]`, `[193]`, `[196]`, `[198]`, `[199]`, `[200]` append to main's text; `[201]` new; 201 → 202 entries | TRUE: each of main's entries is a prefix of the head's. Against `b001495`, `[113]`'s batch 173 sentence and `[201]` were edited in place — text this unmerged batch itself added, so main's history is untouched |
| `f1f006a` changes only the handoff; handoff cites `631512b` | TRUE (one file; `head_revision_or_patch_checksum` `631512b…`; `check:handoff` 0) |
| Cherry-pick map 796bd67 / 869217c / b2ed62f, each the review file its only change | TRUE for mine (`869217c` adds only `a1-batch-173-worker-security-review-2026-10-03.md`, as in the diff stat) |
| Tests 691/691, `verify` green | TRUE (691 pass) |
| PR #184 Draft, not merged | TRUE (`gh`: Draft, OPEN, head `f1f006a`, `mergedAt` null) |
| "Measured on 127.0.0.1:5507 …" (commit, plan §7) | Not re-read; reproduced on 5501 (r1, r2, r3, h1) |

## 5. Stop-the-line verdict

**No stop-the-line.** No secret, credential or customer data in the round's diff (the fake-driver fixtures hold role
names and a placeholder path; `npm run verify` includes the secret scan, exit 0); no fed source sets a credential; the
harness leaves none behind (r2); the new identity reads and writes zero rows (r1, r1 catalog); no integrated migration
is rewritten (173 is unmerged and only its comment changed).

**Does anything block the merge, in security?** No finding of mine. Open and owed, none before this merge: A1-173-1's
runner and custody halves (MEDIUM, before any instance holds a credential), A1-173-3 (LOW, before any credential
outside a test run), A1-173-6 and A1R2-1..3 (INFO). The required check is green on `f1f006a` (run `37298454559`) and
ran §5/12 (RUN, ok). Process conditions, not findings: C0's and Q0's re-checks of this round; the Integration Owner's
acceptance of the number 173 (`[201]` (1)) and recording of the CI reading of §5/12 (`[201]` (6)).

## 6. Limits

- Same vendor and model family as the Author (§0).
- Local clusters only, PostgreSQL 17.11; nothing on the provisioned instance, the platform pooler or CI's container was
  measured. CI (run `37298454559`) was read from its log only.
- I did not re-run the `b001495` code; "stayed ok before" (Q0 F1) is inferred from the old query and r1's catalog.
- `samerole`/`samegroup` in a user list, an unreadable membership and `@file` as a literal entry were read in the
  fake-driver test, not measured; my `h4` attempt put `samerole` in the database column, which does not test the user
  arm, and is not reported.
- D1-D11 and my `b001495` drifts r5-r14 were not re-appended except r14's class (r4); the round changed no probe.
