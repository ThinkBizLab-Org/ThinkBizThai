# Q0 independent test of batch 173-worker: the worker's login identity (RFC-2026-028)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Date:** 2026-10-05 (the file name
carries the phase's date, 2026-10-03, as every record of this phase does).
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-173-worker`, head `b001495` over code commit `eb413e9`, base `aa0e89f`
(main, PR #183 merged). Author `/claude/a0_atlas`. PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/184> (Draft).
**Reviewed on:** my own branch `review/q0-batch-173-worker`, checked out at `b001495`; the guard commands were run with
`agent/claude/WP-0A-DB-00-batch-173-worker` itself checked out (`git checkout --ignore-other-worktrees`, read-only, no
commit made on it), then switched back.

This file records findings. It advances no status, approves nothing, and fixes nothing.

## 0. What I am

A subagent of `/claude/a0_atlas`'s orchestration, the same vendor and model family as the Author (RFC-2026-024 states
what that independence is worth and what it is not). Separation here is of run, worktree, branch and evidence, not of
mind. Whether this record is accepted as the Q0 role's signature is the Integration Owner's and the Product Owner's act,
not mine. Every claim below is labelled **measured** (I ran it, this run) or **read** (from the tree, a document or a
log, not executed by me).

## 1. Verdict

- **Stop-the-line: none.** The shipped role behaves as RFC-2026-028 §3.1 says on every path I executed. In particular,
  through the login role under `set local role app_worker`, **all 51** app tables `app_worker` may read (by table or by
  column grant) return zero rows while the connection role reads fixture rows in each of them (measured). No secret
  exposure, tenant leakage, migration divergence or contract mismatch was found.
- **Merge: blocked on F1 (medium), not on a defect.** The §5/10 proof enumerates only tables with a TABLE-level SELECT
  grant (22), so it never reads `app.jobs` — the very table RFC-2026-028 §5/10 names, with the very drift it names —
  nor 28 other tables `app_worker` reads by column grant. The claims "every table app_worker may SELECT" and "§5/10
  executed" in the commit message, plan §2 row 10, the handoff, `open_blockers[113]` and RFC-2026-028's Implemented
  line are therefore false as worded. Under the standing merge bar (CI green, the role runs' findings cleared, no
  stop-the-line) this must be remedied or disposed of by name.
- Guard commands green on the branch **name** (measured): `verify-branch-scope` exit 0, `check:handoff` exit 0,
  `npm run verify` exit 0 with 691/691. CI run 37285050018 on `b001495`: **success**, and §5/12 **RUN and ok** there
  (read from the log), which answers `open_blockers[201]` (6) / C0-2.

## 2. Measured vs read: the guards, the rounds, CI

Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`, checked before every measured run; the PATH Node 26 never
used). PostgreSQL 17.11, `127.0.0.1:5503`, TCP only (`unix_socket_directories=''`), `initdb --locale=C -A trust -U
postgres`, `LC_ALL=C`, shim first, re-initdb every round, private directory `scratchpad/q0-173-worker/`; `TMPDIR` pointed
into that directory so the harness's password file never landed elsewhere. Cluster stopped and its directory removed at
the end; port 5503 free (`lsof` exit 1).

| what | result |
|---|---|
| `node scripts/verify-branch-scope.mjs aa0e89f WP-0A-DB-00` on the branch name | **measured** exit 0, "all 17 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` on the branch name | **measured** exit 0, "describes the branch: nothing substantive after its cited head" |
| `npm run verify` on the branch name | **measured** exit 0, "clean: exit 0 — tests 691, pass 691, fail 0" |
| base round 1 and 2 (fresh clusters) | **measured** migrate-clean exit 0 (post-migrate pass 54 / 38 / 16; pinned grant probe "refused each of its 10 drifts", client membership probe "each of its 3"); rls-smoke exit 0, 1200 cases, `db-authz-proofs: ok — 13 claim(s) discharged by execution; 1 not run on this cluster (worker-login-authentication)` |
| after each run | **measured** `pg_authid.rolpassword` of `app_worker_login` null again; the harness's temporary directory empty |
| §5/12 with `host all app_worker_login 127.0.0.1/32 scram-sha-256` first | **measured** RUN, ok: wrong credential "password authentication failed", none "fe_sendauth: no password supplied", generated one connects; 14 discharged. `pg_hba.conf` restored (cmp) |
| §5/12 with a `trust` line for the role by name before it | **measured** FAIL, "pg_hba line(s) 1 trust app_worker_login by name"; rls-smoke exit 2 |
| §5/12 with `host all +app_worker 127.0.0.1/32 trust` before the scram line | **measured** NOT RUN, exit 0 (F2) |
| A1R-1, non-superuser CREATEROLE applier with `createrole_self_grant = 'set, inherit'` preset, rolled back | **measured**: 173 as shipped → one member row `q0_applier (admin t, inherit f, set f, grantor postgres)`; 173 without its `SET LOCAL` → block refuses naming both rows; 173 without `SET LOCAL` and with block §3 dropped (mutation C6) → applies, two rows, the second `admin f, inherit t, set t` |
| try-it demo | `try-it up --port 5503` exit 1, "port 5503 is one this tool never touches" (**measured**). The demo loop (`DEMO_STEPS`, `demoPlanProblems`, `runCases`, `sessionDriver`) replicated against 5503 after base round 2 (`demo5503.mjs`, copied from q0-141): **All 17 steps behaved as expected** (**measured**) |
| `workerCredentialLint` over `fedSqlSources()` | **measured** 96 sources (shim 1, prerequisite 1, invariants 16, helpers 1, fixtures 21, migrations 56), no finding |
| CI run 37285050018 on `b001495` | **read** (log): success; migrate-clean ok; 1200 cases; `worker-login-authentication` ok, "RUN"; pg_hba read as six trust lines then `128 host all scram-sha-256`, and the wrong credential was refused "password authentication failed" (which line matched is not printed; I do not infer it); `db-authz-proofs: ok — 14 claim(s) discharged`; no `SCRAM-SHA-256$` string anywhere in the log |

## 3. Mutation table

Each mutation applied alone to this branch's tree, then: the static file `node --test
test-kits/db/foundation-contract.test.mjs` (S), a fresh-cluster `make db-migrate-clean` (M), `make db-rls-smoke` on the
same cluster (R); restored with `git checkout` and checked clean (`git status --porcelain` empty) after every one.
**Later** = the drift in a new file `174_q0_mutation.sql`. **Code** = 173 (and `run.mjs` / `pinned-grants.json`) edited
in place coherently, the author's own option/attribute pins moved with it, and the catalog-rule probe digests in
foundation-contract **refreshed** to the mutated probes (`refresh.mjs`, the test's own sha256 recipe), so S fails only
on a real assertion. A later file alone makes S fail 19 tests for one reason unrelated to the mutation (174 is not in
the snapshot's pending tail); that set is the noise floor and is excluded below. M stops at its first refusing rule, so
only that rule is named.

| id | mutation | S | M | R | verdict |
|---|---|---|---|---|---|
| L1 | `grant app_worker to app_worker_login with inherit true` | noise only | **red**, rule 4b: "missing: … (admin false, inherit false, set true), unlisted: … inherit true" | **red**, §5/7 "expected 42501 … saw 0 row(s) and no error" | right reason, two layers |
| C1 | 173's grant `with inherit true`, block §2 and `PINNED_ROLE_MEMBERSHIP_OPTIONS` moved | **red**: options deepEqual; statements list | **red**, 173's block §5 "holds a schema privilege …: USAGE on app" | moot (173 rolled back; proofs "credential could not be set") | right reason |
| L2 | `alter role app_worker_login bypassrls` | noise only | **red**, rule 8 "app_worker_login rolbypassrls" | green (inert: RLS is checked against `app_worker` after SET LOCAL ROLE) | right reason, one layer |
| C2 | 173 `bypassrls`, block §1 and `PINNED_ROLE_ATTRIBUTES` moved | **red**: attribute deepEqual; statements list | green | green | **static only** (F5) |
| L3 | `grant app_command to app_worker_login with inherit false, set true` | noise only | **red**, rule 4 "app_worker_login -> app_command" | **red**, §5/8 "app_command … saw the role taken" | right reason, two layers |
| C3 | 173 grants app_command too; block §2, both membership pins moved | **red**: statements list | **red**, rule 4's own self-test: drift 4 "refused without naming app_worker_login -> app_command" | **red**, §5/8 as L3 | right reason, three layers |
| L4 | `grant select on app.jobs to app_worker_login` | noise only | **red**, "unlisted: app_worker_login SELECT on app.jobs" | green (inert: no USAGE on app) | right reason |
| C4 | 173 grants it; `pinned-grants.json` given the row; block §4 silenced | **red**: statements length 6 ≠ 5; the `if false` silencing guard | green | green | **static only** (F5) |
| L5 | `alter role app_worker_login password '…'` | **red**: "no fed source carries a credential" | **red before any script**: "174_q0_mutation.sql line 2: a PASSWORD clause that is not PASSWORD NULL" | moot (nothing applied) | right reason |
| L5b | the same, computed: `execute format('alter role … %s %L', 'pass' \|\| 'word', '…')` | noise (+ the post-migrate plan's DO-block test) — **static misses it, as documented** | **red**, rule 9 "holds a stored credential …: app_worker_login" | green (the harness's `finally` resets the credential to null) | right reason, live layer holds the documented gap |
| C5 | 173's own `password '…'` | **red**: statements list; credential rule | **red before any script**, "173 … line 69: a PASSWORD clause" | moot | right reason |
| C5b | migrate-clean's and schema-lint's credential pre-checks removed, plus L5 | **red**: the runner wiring regex; credential test | **red**, rule 9 | green | right reason: rule 9 backs the static rule |
| L6 | a second row for the pinned pair (`… granted by app_command`, after giving app_command admin on app_worker) | noise only | **red**, rule 4 "app_command -> app_worker" | green | right layer; a second row cannot be made on a superuser cluster without another membership |
| C6b | rule 4b's "more than one row" arm dropped (digest refreshed), plus L6 | **red**: "rule 4b names … a second row" | **red**, rule 4 as L6 | green | right reason; the arm is belt-and-braces on migrate-clean |
| C6 | **the two-row assertion dropped**: 173's `SET LOCAL createrole_self_grant` removed and block §3 silenced | **red**: statements list; the `if false` silencing guard | green (superuser applier: no member row either way) | green | static only on migrate-clean; under a non-superuser applier the second row applies silently (§2), held only by the snapshot lint once 173 is declared applied |
| C7 | rule 9 removed (digest refreshed) | **red**: "rule 9: every non-superuser … stored credential null" | **red**, rule 9's self-test "after drift 10 passed … a rule that cannot fail asserts nothing" | green | right reason |
| L7 | `create policy … on app.jobs for select to app_worker using (true)` — **RFC §5/10's own drift** | noise (+ the retention map test) | **red**, policy set probe "policy(ies) no pinned list names: app.jobs.q0_jobs_worker_reads" | **red only by the old case** `service-sees-zero-job-rows` (via `as_service()`); **`worker-login-reads-nothing-by-default` stays ok** ("every one of the 22 reads zero rows") | **F1** |

Every new case and proof that went red went red for its own reason (named row, named attribute, named rule, the 42501
message, the role taken). The new self-tests are honest: removing rule 9 fails its self-test (C7), and a coherent
second pinned membership fails rule 4's self-test (C3).

## 4. Findings

### F1 (medium) — §5/10's proof never reads `app.jobs`, and the "every table" claim is false

`scripts/db/authz-proofs.mjs:1151` lists the tables to read with `has_table_privilege('app_worker', c.oid, 'SELECT')`,
which is false for a table read only through column grants. Measured on base round 1: 22 tables qualify, but
`has_any_column_privilege` qualifies **51**; the other 29 include `app.jobs`, `app.outbox_events` and
`app.consumer_ledger` (batch 050's kernel). RFC-2026-028 §5/10 (`architecture/decisions/RFC-2026-028-worker-identity.md:352`)
names a read of **`app.jobs`** through the login role, 050's `service-sees-zero-*` cases re-run through it, and the
drift "a permissive `for select to app_worker using (true)` policy on `app.jobs`". That drift (L7) leaves the proof
green; its control uses `app.workspaces` instead. 050's cases are not re-run through the login role (they run through
`as_service()` only). Claims false as worded: commit `eb413e9` ("zero rows in each of the 22 tables app_worker may
read"), plan §2 row 10 ("every table app_worker may SELECT (22)"), the handoff's `security_privacy_cost_impact` ("zero
rows of every table app_worker may SELECT") and `decisions_consumed` ("§5/1-10 … executed"), `open_blockers[113]`'s
append, and RFC-2026-028's Implemented line ("§5/… /6-10 … executed"). The property itself holds (51/51 zero,
measured), so this is a test gap and a wording defect, not a leak.
**Remedy:** enumerate with `has_any_column_privilege(…, 'SELECT')` (the `count(*)` read works under a column grant —
measured), assert `app.jobs` is in the list, put the control's policy on `app.jobs` as §5/10 says, and either re-run
050's `service-sees-zero-*` cases through the login role or record that as owed on `open_blockers[201]`; correct the
claims in the same diff.

### F2 (low) — a `trust` line that reaches the role through a group is read NOT RUN, not FAIL

`scripts/db/authz-proofs.mjs:1067` flags only a `pg_hba` line whose user list contains `app_worker_login` literally.
Measured: `host all +app_worker 127.0.0.1/32 trust` before a scram line for the role makes the wrong credential
connect and the proof print NOT RUN, rls-smoke exit 0. NOT RUN is never counted as passed, so nothing is falsely
discharged, but a line aimed at the worker identities is graded like an all-trust cluster. **Remedy:** treat a `+role`
entry the login role is a member of (and `samerole`/`@file`, or anything not `all`) as trusting it by name, or record
the limit.

### F3 (low) — RFC §5/5's "the secret scan names the literal" does not hold

Measured on an exported copy of `b001495`: a migration carrying `password 'q0-not-a-credential'` and a SCRAM-SHA-256
verifier literal passes `scripts/scan-repository-secrets.mjs` (exit 0, no finding). `workerCredentialLint` covers fed
SQL sources only, so a verifier pasted into evidence, a handoff or a doc is caught by no layer. RFC-2026-028:329
promises the scan's half. **Remedy:** a scan pattern for `SCRAM-SHA-256$<n>:` and `md5[0-9a-f]{32}` (protected file:
the Integration Owner's path), or record the half as owed on `open_blockers[201]`.

### F4 (info) — two coherent code mutations are held by static assertions alone

C2 (BYPASSRLS in 173 with its pins moved) and C4 (a direct grant with `pinned-grants.json` and block §4 moved) pass
migrate-clean and rls-smoke; only foundation-contract's exact-statement and pin assertions refuse them. Both are inert
today (measured: RLS reads `app_worker` after SET LOCAL ROLE; no USAGE on `app`), and moving a pin is a reviewed
change, so this is a record of where the weight sits, not a defect. C6 (the two-row assertion dropped) is the same on
migrate-clean; the snapshot lint is its only other holder, and only once 173 is declared applied.

### F5 (info) — smaller accuracies

- `173_worker_login_identity.sql:82` says the block reads `pg_default_acl`; it reads `pg_shdepend` (which carries
  default-ACL references), not `pg_default_acl`.
- RFC §3.3/3 places the test password file "inside the cluster's own directory or the job's temporary directory";
  the harness uses `os.tmpdir()` (`authz-proofs.mjs:1022`), `/tmp` on CI (read: CI log prints
  `/tmp/tbt-worker-login-…/wrong.pgpass` via libpq's own message — a path, no secret). Deleted in `finally` either way.
- `workerCredentialLint` (`run.mjs:2977`) also refuses a COLUMN named `password` (measured: `create table t (password
  text)` and `comment on column … password` flagged). Fail-closed and harmless today; the stated limit mentions only
  literals.
- At code commit `eb413e9`, `evidence/VERIFICATION.md` records 691/691 while the suite there was 689/691 (the two
  handoff-guard tests); disclosed in the commit message, and true at `b001495` (measured: 691/691).

## 5. Claims checked

| claim (where) | status |
|---|---|
| 173's statements, attributes, membership options, `SET LOCAL` first, block per row (commit, plan §1, disposition §3) | TRUE, read and measured (A1R-1 run above) |
| drifts D1-D11 refused by name (plan §3, handoff) | TRUE for the five I reproduced in a later file (D1 = L4, D3 = L1, D4 = L2, D5's class = L3, D6 = L5); the rest read |
| pinned grant probe 10 self-tests, client membership 3; post-migrate 54/38/16; 13 discharged + 1 NOT RUN | TRUE, measured |
| 96 fed sources, none with a credential | TRUE, measured |
| §5/12 RUN on scram, FAIL on trust-by-name; NOT RUN on trust | TRUE, measured; CI RUN (read) |
| verifier computed client-side; plaintext only in a 0600 PGPASSFILE; removed in `finally` | TRUE, read; null after every run and the temp dir empty, measured; no verifier in the CI log (read) |
| "every table app_worker may SELECT (22)" / "§5/10 executed" (commit, plan, handoff, `[113]`, RFC Implemented line) | **FALSE as worded** (F1) |
| tests 688 → 691, floor 82 → 85, two probe digests moved with reasons | TRUE, measured (verify) and read |
| manifest: only `[113]`, `[193]`, `[196]`, `[198]`, `[199]`, `[200]` appended (no text above rewritten), `[201]` new and last, branch slot, rationale | TRUE, compared structurally against `aa0e89f` |
| `#183` merged by A0 under the standing delegation; Owner's words verbatim (disposition §1-§2) | read, consistent with the cited dispositions; not re-verified against the Owner's chat |
| handoff cites `aa0e89f..eb413e9`, 3 added / 13 modified; `b001495` changes only the handoff | TRUE (`git diff --stat`) |
| Q-028-5 deferred (D4), 173 declared not applied (D5) | TRUE, read (`catalog-snapshot.json`, `[201]` (2)-(3)) |
| the secret scan names a migration password (RFC §5/5) | **FALSE** (F3) — not claimed by the batch, but it is the RFC's text |

## 6. Stop-the-line and merge

No stop-the-line. Merge is blocked on F1 under the standing bar until it is remedied or disposed of by name; F2 and F3
can be remedied or recorded as owed on `open_blockers[201]`; F4 and F5 need no action to merge.

## 7. Limits

- One cluster, PostgreSQL 17.11 on macOS, trust auth except where `pg_hba` was edited; the platform's
  `createrole_self_grant`, grantor and pooler are not measured (Q-028-13, Q170-c, Q-028-12).
- The demo was replicated, not run through `try-it` (it refuses 5503 by design).
- M stops at the first refusing rule, so a later layer that would also refuse is not shown for each mutation.
- I did not run `npm run record:verification` (it rewrites a tracked file); the byte-for-byte claim is read.
- Scratch scripts (`round.sh`, `hba.sh`, `mutate.py`, `mrun.sh`, `refresh.mjs`, `applier.py`, `colread.sh`,
  `demo5503.mjs`) and every log are in `scratchpad/q0-173-worker/`; nothing there holds a credential.
