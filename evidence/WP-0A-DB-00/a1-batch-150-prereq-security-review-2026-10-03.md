# A1 security review: batch 150's prerequisites

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-150-prereq` (PR #172, Draft, open, not merged),
  head `782df87` (`782df876b6ec0cb39b895fc99c62b78589ac564f`) over code `9d57cda`, base `b5f53c3`
  (`b5f53c3c3a45f199afb35d0fecb2e7542bca2641`, main). Author `/claude/a0_atlas`.
- **Checked out as:** local branch `review/a1-batch-150-prereq` at `782df87`, in this run's own worktree.
  The branch name itself is checked out elsewhere, so for `verify`, `check:handoff` and branch scope I
  made a local clone in my private directory (`a1-150-prereq/repo`), created
  `agent/claude/WP-0A-DB-00-batch-150-prereq` there at `782df87` (`git rev-parse --abbrev-ref HEAD`
  printed that name; `main`, `origin/main` and `origin/HEAD` there are `b5f53c3`) and measured on that
  name, not detached. I committed nothing in the clone.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch. I am the same
vendor and model family as the Author. Under RFC-2026-024 that is the stated independence limit of this
role run. Accepting this review as the A1 role's signature is the Integration Owner's and the Product
Owner's act, not mine.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-150-prereq-plan-2026-10-03.md` and the
disposition `product-owner-disposition-2026-10-03-batch-150-prereq.md`, both in full; the five commit
messages `b5f53c3..782df87`; `git diff b5f53c3..782df87`: `scripts/db/explain-harness.mjs` and
`test-kits/db/ws905-fixture.mjs` in full, the `scripts/db/run.mjs` hunk (probes 6d-6g and their four
`CATALOG_RULE_PROBES` entries) in full, `scripts/db/psql-driver.mjs` (the driver the harness feeds), the
reset-test allowlist it reuses (`run.mjs:3555-3572`), the new tests in `foundation-contract.test.mjs`
(`:89-116`, `:3253-3290`), the four lint files' headers, exemptions, lookups and findings, the README
harness section (`db/foundation/README.md:696-716`), the manifest's changed blockers 179, 185 and 194
(each checked to be a pure append) and the branch slot, and the handoff's tests and impact fields.
The Owner's quoted words were checked present in the batch 127 and 129 dispositions.

**Measured** (Node `v24.20.0` checked before every run; PostgreSQL 17.11 from `/opt/homebrew/bin`;
127.0.0.1:5501 only, TCP only, `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, shim first, a fresh
initdb every round; private directory `a1-150-prereq/`):

| Command | Where | Exit | Output |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs b5f53c3 WP-0A-DB-00` | clone, branch name | **0** | "all 16 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | clone, branch name | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | clone, branch name | **0** | "clean: exit 0 — tests 684, pass 684, fail 0" |
| `npm run check` at `9d57cda` (same branch name, moved back afterwards) | clone | **1** | tests 684, pass 682, fail 2: "the handoff for this branch describes this branch" and the handoff ratchet only. A0's claim holds. |
| foundation-contract assertions through the guard's `stripNonCode` | head / base | — | 878 / 793; 80 tests both. The floor 793 → 878 is the guard's own count. |
| PR #171 | `gh` | — | merged 2026-10-03T21:52:26Z, merge commit `b5f53c3`, head `e182b0f`, `bootstrap` success on `e182b0f`. PR #172: Draft, open, `bootstrap` success on `782df87`. |
| round r2: `make db-migrate-clean` | fresh cluster | **0** | the four new probes as claimed: 32 constraints, 18 indexes, 4 policies; 60 vocabulary CHECKs; 209 policies, 44 rows; 4 exempt, 28 lookups; each refused its drifts; post-migrate 49 / 37 / 12 |
| round r1: `make db-migrate-clean`, `make db-rls-smoke` | fresh cluster | **0**, **0** | 1079 isolation cases; 6 authz claims |
| harness `--scale small` / `0.2` / `0.2 --fail-on-seq-scan` after r2 | r2 cluster | **0 / 0 / 3** | the plan's §5 table reproduced, query for query (index names, the workspace list's seq scan on `workspaces`, the content first page's sort); 10-12 s per 0.2 run |
| catalog snapshot before / after those three runs | r2 cluster | — | rows in every fixture table 0 → 0; roles unchanged; `pg_statistic` rows in app 0 → 0; no temp table left; **but** `performance_snapshots_id_seq` and `usage_events_id_seq` null → 402000; `reltuples` -1 → 100 / 20000 / 200000; database 14 MB → 592 MB; free disk 10.89 → 9.26 GB (S2) |
| the same three harness runs after rls-smoke | r1 cluster | **1, 1, 1** | "ws905 fixture: app.workspaces holds 6 row(s), not 4" / "102 ..., not 100" — the load ran in full first; sequences advanced 15 → 402015 and 3 → 402003, database 17 → 594 MB (S3) |
| allowlist regex on crafted URLs, then `psql` and the harness with them, no server listening | static, then live with nothing on 5501 | harness **1** (not 2) | S1: `?host=/nonexistent-a1-dir` passes the allowlist and libpq connects to the query parameter's host |
| drift T1 `alter table app.performance_snapshots alter column workspace_id drop not null;` appended to 140 | fresh cluster | sl 0 / mc **2** | held, by post-migrate `121_publisher_metrics.sql#1`, not by the shape probe |
| drift T2 a plpgsql trigger function and `create trigger ... before insert on app.performance_snapshots` | fresh cluster | sl 0 / mc **0** / rs **0** | passes every layer (S4) |
| drift T3 `create rule ... on insert to app.usage_events do also notify ...` | fresh cluster | sl 0 / mc **2** / rs 2 | held by the rewrite rule probe |

`140_audit.sql` was copied before the drift rounds (sha256 `2ac596bb950e8dfb…`, the same as A0's), each
drift was appended to the clone's copy only, the file was restored after every round and its sha256
matched each time. The worktree's `140_audit.sql` was never edited.

## 2. The questions asked

### Does the fixture generator or EXPLAIN harness risk anything on a real database?

- **The fixture generator** (`test-kits/db/ws905-fixture.mjs`) only returns a string. Every parameter is
  checked a positive safe integer and unknown keys are refused (`:41-49`); no value from outside reaches
  the SQL as text; ids are `md5('ws905:…')`; external hashes are `sha256` of synthetic strings; no address,
  person or secret is in it. It cannot write anywhere. No finding.
- **The harness writes no file.** It prints to stdout/stderr only; psql runs `--no-psqlrc` with the script
  on stdin. Nothing is written outside its process except to the database server. No finding.
- **It creates no role** and changes no grant; `set_config('role', …, true)` is transaction-local and is
  reset after each plan. Measured: roles identical before and after. No finding.
- **It does not refuse "anything but a throwaway DB_TEST_URL".** It refuses a missing URL and a URL whose
  text does not contain `@localhost`, `@127.0.0.1` or `@postgres` followed by `:` or `/`. That is a text
  match, not a host check, and it can be passed by a URL that connects elsewhere (S1). A local but
  non-throwaway database (a developer's own 5432) passes it by design.
- **It leaves traces** beyond the one its comment admits (S2), and on a non-empty database it writes the
  whole fixture before it notices (S3).

### Do the new pins introduce a false sense of coverage?

Mostly no: each probe states its selector, and A0's F5-F8 record the limits. Two are not stated: the
pinned shape is described as "read whole" and pins no trigger (S4, measured), and the index coverage file
lists "workspace switch / list" as a served lookup while the harness shows the WS:907 query for it
seq-scanning (S5). The harness's own exit is 0 on every scale unless `--fail-on-seq-scan` is passed, and
at small scale it flags the membership check itself; that is documented and is no finding.

### Anything newly opened?

No new privilege, policy, role, grant or migration. What is new is a second tool that trusts the
reset-test allowlist (S1) and writes large volumes (S2, F1).

## 3. Findings

### S1 — MEDIUM. The harness's host allowlist is a substring match on the URL text; a URL that names an allowlisted host can connect to any other.

- **Where:** `scripts/db/explain-harness.mjs:32` (`HOST_ALLOWLIST = /@(localhost|127\.0\.0\.1|postgres)[:/]/`,
  unanchored) and `:152`; the same regex guards `db-reset-test`, which drops schemas
  (`scripts/db/run.mjs:3563`). README `:712` and the handoff's security impact ("runs only where
  DB_TEST_URL names an allowlisted host") rely on it.
- **Measured:** the regex accepts `postgresql://postgres@127.0.0.1:5501/postgres?host=db.prod.example.com`,
  `postgresql://postgres@localhost:5432,db.prod.example.com:5432/app` (multi-host),
  `…/postgres?service=prod`, `…?hostaddr=10.0.0.5` and `postgresql://app:secret@db.prod.example.com:5432/app?options=@localhost/`.
  With no server on 5501, `psql 'postgresql://postgres@127.0.0.1:5501/postgres?host=/nonexistent-a1-dir'`
  failed on socket `/nonexistent-a1-dir/.s.PGSQL.5501` (the query parameter won); the multi-host form tried
  127.0.0.1 then the second host; the harness with the `?host=` URL **passed its refusal** and exited 1 on
  the connection (control: `@db.example.invalid` exits 2 "refuses this host").
- **Failure scenario:** a DB_TEST_URL copied from a connection string with a `host=`/`hostaddr=`/`service=`
  parameter or a host list reaches a shared or production database; the harness writes up to 3.1M rows
  (rolled back, but with S2's traces, lock and disk load), and `make db-reset-test` drops `app` and
  `private`. The guard is accidental-misuse protection, not an attacker boundary, and the harness is not in
  CI; hence Medium, not stop-the-line. The reset-test half is pre-existing; this batch extends the reach.
- **Remedy:** one shared function in `run.mjs`: parse with `new URL`, refuse any query parameter among
  `host`, `hostaddr`, `service`, `servicefile` (or any query string at all), refuse a comma in the
  authority, require `hostname` to equal exactly `localhost`, `127.0.0.1`, `[::1]` or the CI service name;
  ignore inherited `PGHOST`/`PGSERVICE` by clearing them in the driver's env; add the five URLs above to the
  refusal test (`foundation-contract.test.mjs:103-115`). Owner: A0, for the Integration Owner to accept for
  `reset-test`.

### S2 — LOW. "Rolls back, so the database is left as it was" is not true; the comment says reltuples is the one trace.

- **Where:** `scripts/db/explain-harness.mjs:15-16`; the test message at
  `test-kits/db/foundation-contract.test.mjs:3278`; README `:706` and `:713-714` ("about 2 GB of free disk
  ... while the transaction is open"); the handoff's `security_privacy_cost_impact`.
- **Measured** (three runs, small + 0.2 + 0.2): two identity sequences advanced null → 402000 (not
  transactional); `reltuples` set; the database grew 14 → 592 MB of dead tuples and free disk fell by
  1.6 GB, none of it returned at rollback. `pg_statistic` did roll back.
- **Failure scenario:** a reader trusts "left as it was" and points it at a database whose disk or ids
  matter; repeated runs accumulate bloat until VACUUM (A0's own F1 shows the volume filling after three 0.2
  runs on one cluster).
- **Remedy:** state the traces (sequences, reltuples, dead tuples, WAL), say the disk is not returned until
  VACUUM/cluster removal, and correct the test's message; add the free-space preflight F1 already owes.

### S3 — LOW. On a non-empty database the harness writes the whole fixture before it notices.

- **Where:** `scripts/db/explain-harness.mjs:99-107` (load first, count check after).
- **Measured:** after `make db-rls-smoke` (which leaves 2 workspaces), each run loaded everything and then
  failed with exit 1 "app.workspaces holds 102 row(s), not 100"; sequences and bloat advanced anyway.
- **Remedy:** before the load, refuse (exit 2) unless every fixture table is empty. That is also the
  cheapest real "throwaway" signal the harness can read, and would have refused every non-test database in
  S1's scenario before the first write.

### S4 — LOW (false coverage). The pinned shape is "read whole" but pins no trigger; a trigger on `performance_snapshots` passes every layer.

- **Where:** `scripts/db/run.mjs:1483-1484` ("is read whole and both ways"); `pinned-shapes.json` `_what`;
  F7 / blocker 194 (4) name columns only.
- **Measured:** drift T2 (a plpgsql function and a BEFORE INSERT trigger on `app.performance_snapshots`)
  appended to 140: schema-lint 0, migrate-clean 0, rls-smoke 0. (Rules are held: T3 failed by the rewrite
  rule probe; NOT NULL on `workspace_id` is held: T1 failed by post-migrate 121#1.)
- **Failure scenario:** batch 150's rebuild adds or changes a trigger (for example one that writes another
  table, or a SECURITY DEFINER function) and the reviewer reads "the shape is pinned whole" as covering it.
  RLS WITH CHECK still runs after BEFORE triggers, so this is a review-coverage gap, not a leak today.
- **Remedy:** add `pg_get_triggerdef` of every non-internal trigger on the three tables as a fifth set, or
  write "triggers and columns are not pinned" into the comment, the file's `_what` and blocker 194 (4).

### S5 — INFO. The index coverage file calls "workspace switch / list" served while the harness shows WS:907 failing for it.

- **Where:** `db/foundation/lint/index-coverage.json:275` (the lookup on `workspace_members (user_id,
  status)`); F2 / blocker 194 (1).
- **Measured:** at 0.2 the workspace list plans a Seq Scan on `app.workspaces` (as A0 reports). The
  lookup is green because it names the membership side, not the query.
- **Remedy:** the lookup's `why` cites F2 so a green probe is not read as WS:907 met.

### S6 — INFO (pre-existing). Connection redaction misses query-parameter hosts.

- **Where:** `scripts/db/psql-driver.mjs:35-49` redacts the URL's hostname, user, password, port and path,
  not query parameters.
- **Measured:** the harness printed `socket "/nonexistent-a1-dir/.s.PGSQL.[redacted]"` — the port redacted,
  the `?host=` value not. A real `?host=db.internal` would be printed.
- **Remedy:** also redact every query parameter value (or refuse query strings, S1).

### S7 — INFO. Citation: blocker 194 cites "plan … §5" for the findings; they are §6 (§5 is the plans).

- **Where:** `work-packages/WP-0A-DB-00.json:447`, blocker 194's first sentence.

## 4. Claims checked

True as measured: the cherry-pick lineage (6a7bf73, 305935c, 9d57cda, 00505b1, 782df87, in that order,
782df87 last and alone); the floor 793 → 878 with no test added (80 tests, suite 684); the four probe counts
and drift refusals; the harness's §5 plans; `commit-when-clean`'s exit 1 for 9d57cda being the handoff
guard only; the integrity manifest's 88 digests; blockers 179, 185 and 194 pure appends and 194 appended
last (195 entries); the branch slot moved; the 140 sha256; #171's merge time, head and green check; the
Owner's words present in the cited dispositions; Q150-a..d UNANSWERED everywhere. The handoff's head is
`00505b1`, which is correct for a refresh that is committed last. Not true as written: S2's "left as it was"
and S7's section number.

## 5. Stop-the-line verdict

**No stop-the-line.** Nothing here exposes a secret, leaks a tenant, changes a privilege, or diverges a
migration; the harness is not in CI and every write it makes is rolled back. **Nothing blocks the merge**
from the security side: S1 is a pre-existing guard pattern this batch reuses, and it should be fixed (with
S3) before anyone runs the harness at full scale or batch 150 relies on it, and before the Integration
Owner wires it into CI. S2, S4, S5 and S7 are text; S6 is pre-existing.

## 6. Limits

- I ran the harness at small and 0.2 only; the full WS:905 scale was not run (disk safety; F1).
- S1 was proved with a socket path that does not exist and a multi-host list whose hosts were not
  listening; no remote host was contacted. The `service=` and `hostaddr=` forms were shown to pass the regex
  only, not connected.
- `npm run check` at `9d57cda` was run by moving the clone's branch name to that commit and back; the
  clone's branch is `782df87` again.
- My own incident: in drift round T1 my cluster script removed the data directory of a still-running
  postmaster on 5501 before re-initdb; the second start failed on the busy port. I stopped that postmaster
  (pid verified as mine, data directory under `a1-150-prereq/`), fixed the script to stop first, and re-ran
  nothing on it. 140 was restored (sha256 matched). No other port was touched.
- Cleanup: the cluster on 5501 is stopped and its data directory removed; 5501 is free. Ports 5432 and 5499
  were not touched. The clone and logs remain in `a1-150-prereq/` for re-checking.
