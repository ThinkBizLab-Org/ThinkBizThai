# A1 security re-check: batch 150-prereq's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-150-prereq` (PR #172, Draft, not merged), head
  `00284c0` (`00284c0e0973e3454ff4a0ece23f4bc68baa3bc5`) over code `7717c81`, base `b5f53c3` (main).
  Previous reviewed head `782df87`. Author `/claude/a0_atlas`. Narrow re-check of the corrections to my
  own findings S1-S7 (`a1-batch-150-prereq-security-review-2026-10-03.md`), plus what they newly open.
- **Checked out as:** local branch `recheck/a1-batch-150-prereq` at `00284c0`, in this run's own worktree.
  The branch name is checked out elsewhere, so for the guards I cloned this worktree into my private
  directory (`a1-150-prereqr2/repo`), created `agent/claude/WP-0A-DB-00-batch-150-prereq` there at
  `00284c0`, set `main`, `origin/main` and `origin/HEAD` to `b5f53c3`, and measured on that name
  (`git rev-parse --abbrev-ref HEAD` printed it), never detached. Nothing was committed in the clone.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, and the same vendor
and model family as the Author. Under RFC-2026-024 that is the stated independence limit of this role run.
Accepting this re-check as the A1 role's signature is the Integration Owner's and the Product Owner's act,
not mine.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; my own review; commit messages `7717c81` and `00284c0`;
`git diff 782df87..7717c81` for `scripts/db/psql-driver.mjs`, `scripts/db/explain-harness.mjs`, the
`scripts/db/run.mjs` hunks (pinned shape rule 5, index coverage btree / NULLS, reset-test guard), the
refusal block of `foundation-contract.test.mjs` (`:102-153`), `pinned-shapes.json`, the floor in
`scripts/test-suite-contract.mjs`; plan §10 in full; disposition §5 (Q150-a..e); blocker 194 (9), (12), (13);
the handoff's `security_privacy_cost_impact` and `known_limitations`; README harness section (`:705-725`).

**Measured** (Node `v24.20.0` printed before every run; PostgreSQL 17.11 from `/opt/homebrew/bin`;
127.0.0.1:5501 only, TCP only, `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, shim first, a fresh
initdb every round; private directory `a1-150-prereqr2/`):

| Command | Where | Exit | Output |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs b5f53c3 WP-0A-DB-00` | clone, branch name | **0** | "all 20 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | clone, branch name | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | clone, branch name | **0** | "clean: exit 0 — tests 684, pass 684, fail 0" |
| `testHostRefusal` on 13 further URLs (node, static) | worktree | — | admitted: `...5501/postgres#?host=/x`, `...5501#?host=/x`, `?dbname=postgresql://x@db.example.invalid/db`, `?dbname=host%3D/x`, `?port=5432`, `?;host=`, `?host+=`; refused: `?h%6Fst=`, `?a=1&&host=` |
| `psql` with each admitted URL, nothing listening on 5501, PG* unset | static | — | **`...5501/postgres#?host=/nonexistent-a1r2` connects by the socket `/nonexistent-a1r2/.s.PGSQL.5501`** (R1); `5501#?host=` fails "invalid integer value 5501#"; both `dbname=` forms, `#&host=` stay on 127.0.0.1:5501 (not expanded); `;host` and `host+` "invalid URI query parameter" |
| harness / `run.mjs reset-test` with `DB_TEST_URL=...5501/postgres#?host=/nonexistent-a1r2`, no server | branch name | **1 / 1** | both pass the guard and fail on the socket `/nonexistent-a1r2/.s.PGSQL.[redacted]`; control `?host=/nonexistent-a1r2`: harness **2**, reset-test **1**, each "refuses this host: it carries a host parameter" |
| r1: `make db-migrate-clean` | fresh cluster | **0** | pinned shape "32 constraints, 18 indexes, 4 policies and 0 non-internal triggers ... (no column is pinned) (refused each of its 5 drifts)"; policy set 209 / 44 rows (2 drifts); index coverage "valid whole btree ... direction and NULLS order", 4 exempt, 28 lookups (3 drifts) |
| r1: harness `--scale small` twice | same cluster, fresh | **0, 0** | sequences null → 4000; reltuples -1 → set; 14 → 21 MB; no row left |
| r1: `make db-rls-smoke`, then harness `--scale 0.2` | same cluster | **0**, then **2** | "ws905 harness refuses a database that is not empty (run it on a fresh migrate-clean, before rls-smoke): app.assets, ..." ; catalog snapshot (roles, sequences, row counts, reltuples, temp tables, size) **identical** before and after the refusal |
| r2: drift T2 (my S4 shape: plpgsql function + BEFORE INSERT trigger on `app.performance_snapshots`) appended to the clone's `140_audit.sql` | fresh cluster | sl **0** / mc **2** | "pinned shape probe: as built: trigger(s) on a pinned shape table not exactly its pinned definition: unlisted or changed: app.performance_snapshots.probe_a1_shape_trg"; was 0 / 0 / 0 at `782df87` |

`140_audit.sql` sha256 `2ac596bb950e8dfb…` before the drift and after the restore; the clone's
`git status --short` was empty afterwards. The worktree's `140_audit.sql` was never edited.

## 2. My findings, re-checked

| Finding | Was | Now | Verdict |
|---|---|---|---|
| S1 host allowlist a text match | MEDIUM | parsed guard shared by both tools; the five URLs I listed, Q0's and C0's are refused (static test and my control); PG* host/service scrubbed | **Fixed for every form named, one residual form: R1** |
| S2 "left as it was" false | LOW | header (`explain-harness.mjs:20-25`), README, test message, handoff and blocker 194 (12) state sequences, reltuples, dead tuples, WAL; my r1 reproduces the sequence and reltuples traces | **Fixed (text true as measured).** Free-space guard owed with a stated reason; accepted as owed |
| S3 writes before noticing a used database | LOW | DO block right after `begin;` (`explain-harness.mjs:113-121`), exit 2 (`:186`) | **Fixed, measured**: refusal after rls-smoke, nothing advanced |
| S4 no trigger pinned | LOW | rule 5 (`run.mjs:1551-1559`), `triggers: {}` per table, drift 5 | **Fixed, measured** with my own drift T2 |
| S5 workspace list "served" | INFO | lookup `why`, `_what`, README rule 21, known_limitations cite F2 / Q150-e | Fixed (read) |
| S6 query-value redaction | INFO | values of query parameters redacted (`psql-driver.mjs:79`) | Fixed for the query; the fragment is not (part of R1) |
| S7 blocker 194 cites §5 | INFO | cites §6 / §6.1 / §10 | Fixed (read) |

## 3. Questions

**Real database risk.** The fixture generator is unchanged in substance (citations only) and only returns a
string. The harness still writes no file and creates no role; it now refuses a database whose fixture
tables hold any row before its first write (measured), which also refuses every live application
database that has data in those tables. It still admits one URL form that connects somewhere other than
the host it names (R1), and so does `db-reset-test`, which drops `app` and `private`. A local
non-throwaway database (a developer's own 5432, `?port=` included) still passes by design; the emptiness
refusal is now the second line there.

**False coverage.** The pins now say what they do not pin ("no column is pinned" is in the claim, the
comment and `_what`). Rule 5 pins the trigger definition, not the trigger function's body (R2). The
"one run per fresh cluster" is advice, not enforced (R3). Nothing else found.

**Newly opened.** Nothing in privilege, policy, grant, role or migration. The guard now also governs
`db-reset-test`; that is a tightening, with two loopback widenings the old regex refused (`[::1]` and an
upper-case `LOCALHOST`, both loopback and harmless), and R1 the one redirecting form both old and new admit.

## 4. Findings

### R1 — MEDIUM (residual of S1). A `#` before the query hides `?host=` from the guard; libpq still connects by it.

- **Where:** `scripts/db/psql-driver.mjs:37-50` (`testHostRefusal`): the authority regex stops at `#`,
  `new URL` treats `#?host=...` as a fragment so `searchParams` is empty, but libpq's URI parser has no
  fragment and reads `postgres#` as the database and `host=` as a parameter. Used by the harness
  (`explain-harness.mjs:174`) and `db-reset-test` (`run.mjs:3602`). `redactConnection` (`:69-81`) also does
  not redact the fragment. The refusal test (`foundation-contract.test.mjs:119-135`) has no `#` case.
- **Measured:** `testHostRefusal('postgresql://postgres@127.0.0.1:5501/postgres#?host=/nonexistent-a1r2')`
  returns `null`; `psql` with it, `harness` with it, and `run.mjs reset-test` with it each tried the socket
  `/nonexistent-a1r2/.s.PGSQL.5501` (nothing listening, no remote contacted). The path was printed
  unredacted.
- **Failure scenario:** a URL of that shape (pasted, templated, or produced by appending a parameter to a
  URL that already carried a `#`) points `db-reset-test` at another server or socket, which then drops
  `app` and `private`. It is not a regression: main's regex admits it too. It is accidental-misuse
  protection, not an attacker boundary, and the tools are not run by CI against anything but the service
  container; hence MEDIUM, not stop-the-line. But the round's claim ("each refuses every one before
  connecting"; plan §10.2 S1 row; handoff security impact) reads as the class closed, and it is not.
- **Remedy:** in `testHostRefusal`, refuse any URL containing `#` (no legitimate test URL needs one), or
  parse the query as libpq does (everything after the first `?`, split on `&`, percent-decoded) instead of
  through `URL.searchParams`; redact the fragment too; add the `#?host=` URL to `crafted`. Owner: A0; the
  Integration Owner accepts it with the rest of the reset-test guard (blocker 194 (13)).

### R2 — INFO. Rule 5 pins `pg_get_triggerdef`, not the function a trigger executes.

- **Where:** `scripts/db/run.mjs:1551-1559`. No trigger exists on the three tables today, so a new one is
  refused (measured). Once batch 150 pins one, `create or replace function` on its body (or `security
  definer`) changes nothing rule 5 reads.
- **Remedy:** when a trigger is first pinned, pin its function by `pg_get_functiondef` (or `prosecdef` and
  owner) in the same set, or say in `_what` that function bodies are not pinned.

### R3 — INFO. "One run per fresh cluster" is not enforced.

- **Where:** `explain-harness.mjs:24-25`; README harness section. **Measured:** a second `--scale small`
  run on the same cluster exited 0 (the first rolled back, so the tables were empty); sequences advanced to
  4000. Documented as advice, which is honest; no remedy required beyond keeping the wording as advice.

### R4 — INFO (read, not measured). The emptiness refusal sees every row only under a role that bypasses RLS.

- **Where:** `explain-harness.mjs:113-121` runs `exists (select 1 from app.<t>)` as the connecting role.
  The tables are FORCE RLS; the documented URL uses `postgres` (superuser), which bypasses it. Under a
  non-bypassing role the check could read empty on a populated database; the fixture inserts would then
  most likely fail their WITH CHECK and roll back, with sequences advanced. Remedy: refuse unless
  `current_setting('is_superuser') = 'on'` or the role has `rolbypassrls`, or state the requirement.

## 5. Claims checked

True as measured or read: the cherry-pick map (`9aec4f8`, `0805728`, `af4bb79`, each `-x`, one file each);
`7717c81` is code and `00284c0` the handoff refresh, last and alone (the handoff cites `7717c81`, which is
correct for a refresh committed last); `check:handoff`, branch scope (20 paths) and `verify` (684/684) green
on the branch name; the floor 878 → 898 with no test added (suite 684); the pinned shape, policy set and
index coverage counts and drift counts in the migrate-clean output; rule 5 refusing a trigger; the
emptiness refusal with exit 2 and nothing advanced; the traces now stated; blocker 194 (9), (12), (13) and
Q150-e present, every Q150 UNANSWERED; `140_audit.sql` unchanged versus main. **Not true as written:** the
S1 closure, in the sense that one URL form still connects elsewhere (R1). Digests and the integrity
manifest were not recomputed by me beyond `npm run verify` passing, which checks the manifest.

## 6. Stop-the-line verdict

**No stop-the-line.** No secret, tenant leak, privilege change or migration divergence. **Nothing blocks the
merge from the security side:** R1 is a residual of a pre-existing guard pattern (main admits it too) and is
strictly narrower than before; it should be fixed before the Integration Owner accepts the shared guard for
`db-reset-test` (blocker 194 (13)) or wires the harness into CI. R2-R4 are INFO.

## 7. Limits

- R1 was proved against a socket directory that does not exist; no remote host was contacted. Other
  parser differentials between WHATWG `URL` and libpq (tab/newline stripping, IPv6 zone ids) were probed
  only as far as the table in §1; none other was found to redirect.
- The harness was run at small and 0.2 only; full scale not run (disk). R4 is read, not measured.
- I did not re-run A0's dA / dB / dL4 index drifts as later files; I relied on the self-test lines
  ("refused each of its 3 drifts") from my own migrate-clean.
- Cleanup: the cluster on 5501 was stopped and its data directory removed after each round; 5501 is free
  (`lsof` empty). Ports 5432, 5499 and every other run's port were not touched. The clone and logs remain in
  `a1-150-prereqr2/` for re-checking.
