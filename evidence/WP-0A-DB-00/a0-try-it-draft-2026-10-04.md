# Try it: draft record

**Package:** `WP-0A-DB-00`. **Branch:** `draft/wp-db00-try-it`, local, cut at `5bde893` (main, the merge of
PR #176). Code commit `cf47b11`; this record is the commit after it. Nothing is pushed.

Written 2026-10-04 by a drafting subagent of the Author run `/claude/a0_atlas`. It is the Author's draft
record. It approves nothing, decides nothing and changes no migration, policy, grant, pin or lint rule.
Packaging (branch slot, increment rationale, handoff) is A0's and is not done here.

The work comes from the Owner's direction of 2026-10-04, as relayed to this run: "don't wait for my
confirmation; go long until the point where I can test, then ask". The deliverable is something the Owner, a
single developer on macOS with Homebrew PostgreSQL 17 and Node 24.20.0, can run and see working.

## 1. What changed

| file | change | why |
|---|---|---|
| `scripts/db/try-it.mjs` | new; Node built-ins only | `up`, `demo`, `psql`, `down` (section 2) |
| `scripts/db/rls-smoke.mjs` | the helper and fixture loading moved, statement for statement, out of `main()` into the exported `loadHelpersAndFixtures()`; `main()` calls it | so try-it loads fixtures exactly as `make db-rls-smoke` does, from one copy of the sequence; the text pins in foundation-contract over that block (`const installed = await feed(helpers);`, the meta-command scan before it, `const loaded = await feed(...)`) still match |
| `db/foundation/TRY-IT.md` | new | the guide: prerequisites, the four commands, how to read the demo, clean-up, what it does not show |
| `test-kits/db/foundation-contract.test.mjs` | 16 assertions added to the existing test `a target needing a database refuses without one, rather than reporting a pass` | section 4 |
| `scripts/test-suite-contract.mjs` | foundation-contract assertion floor 1014 -> 1030, with its line | the guard's own count |
| `test-kits/integrity-manifest.json` | regenerated (90 digests) | it digests the two files above |

**Why no new test was added.** A new `test()` moves the suite count, so `evidence/VERIFICATION.md` would have to
be re-recorded, and that file is neither in `ownership.writable_paths` nor in `amends_without_owning.paths`.
The assertions therefore went into the existing live-target refusal test, whose subject (a target must not
report a pass it did not earn) they share. The test floor (80) and the name digest stay; the assertion floor
moves. `scripts/test-suite-contract.mjs` and the integrity manifest are both on the current
`amends_without_owning.paths` list, but that list's rationale describes the owed-tooling increment; rewriting it
for this one is packaging and is left to A0.

**No Makefile target or npm script was added.** Both are protected root configuration. If the Owner or the
Integration Owner wants `make db-try-it` or `npm run try-it`, that is owed as a request through the
Integration Owner; the node script is the whole of the tool today.

## 2. What the tool does

- `up [--dir <path>] [--port <n>]`: refuses a directory inside the repository, a directory that exists and is
  not empty without its marker, and the ports 5432, 5499, 5501, 5503, 5505, 5507, 5509, 5511. Writes the marker
  `thinkbizthai-try-it.json` first, then `initdb --locale=C -E UTF8 -U postgres --auth=trust --no-sync`; appends
  `listen_addresses = '127.0.0.1'`, the port, `unix_socket_directories = ''` and small non-durable settings to
  `postgresql.conf`; `pg_ctl start`; creates `thinkbizthai_try`; feeds `db/foundation/ci/supabase-shim.sql`
  (scanned by psqlLex first); runs `node scripts/db/run.mjs migrate-clean` with `DB_TEST_URL` set (its whole
  output goes to `migrate-clean.log`); then `loadHelpersAndFixtures()`. Default directory:
  `<os.tmpdir()>/thinkbizthai-try-it`; default port: the first free one in 55420-55479.
- `demo [--dir]`: 13 steps. Four `counts` steps assume a fixture user and count workspaces, businesses and
  content items, expecting exact numbers. Nine `case` steps name a case in `tests/db/identity/isolation-cases.mjs`
  and run it through `runCases` over `sessionDriver`, so each verdict is the suite's verdict on that case; the
  driver is wrapped only to record each statement's outcome so the real rows or error can be printed. Before
  anything runs, `demoPlanProblems` refuses a plan with a step that expects nothing, a case the suite lacks, an
  expectation different from the case's, or no step expecting rows. Exit 1 if any step differs.
- `psql [--dir]`: prints the `psql "<url>"` line, the five-line impersonation cheat-sheet and the fixture ids.
  Runs nothing.
- `down [--dir]`: requires the marker (tool name, the same directory, an integer port) and nothing in the
  directory but `thinkbizthai-try-it.json`, `data`, `postgres.log`, `migrate-clean.log`; `pg_ctl stop -m fast`
  if a `postmaster.pid` is present, then removes the directory.
- Every URL it builds passes `tryItRefusal`: the repository's `testHostRefusal` (imported from
  `psql-driver.mjs`, not restated), then only `localhost`, `127.0.0.1`, `[::1]` (CI's `postgres` host refused),
  then not a reserved port.

**Two measured corrections during the draft.** (1) The first `up` failed at `pg_ctl start`:
`FATAL: postmaster became multithreaded during startup`, `HINT: Set the LC_ALL environment variable to a valid
locale.` initdb and pg_ctl now run with `LC_ALL=C`. `down` then cleaned the half-made directory, which
exercised the marker-first order. (2) The cheat-sheet's third line was `select current_user, auth.uid();`, which
fails as `authenticated` with `ERROR: permission denied for schema auth` in this shim; it now reads
`current_setting('request.jwt.claims', true)`, and the five lines were run by hand against the cluster:
`authenticated`, the owner-A claims, one row `fixture workspace a`, then `postgres` after `rollback`.

**Where the counts come from.** Read as `postgres` on the loaded fixture: workspace A holds businesses A1 (3
content items), A2 (1), A3 archived (0), A4 unassigned (0); workspace B holds B1 (1). `user_editor_a` has one
`business` scope (A1); `user_viewer_a` has `all_businesses`. A fixture or policy change that moves a count makes
that step fail, which is the intent.

## 3. Measured end to end

Node `v24.20.0`, psql 17.11 (Homebrew), macOS, on `cf47b11` with a clean tree, default directory, port 55420
picked by `up` (5432 is in use on this machine by another Postgres, which was not touched). The full transcript of
`up`, `demo`, `psql`, a `du -sh` of the cluster directory, and `down`:

```
node v24.20.0; psql (PostgreSQL) 17.11 (Homebrew); 2026-10-04T09:24:50Z; head cf47b11 + working tree
$ node scripts/db/try-it.mjs up
[1/6] initdb: a new, empty cluster in /var/folders/fd/9fynj49s0ddbgkkrv1hssj3m0000gn/T/thinkbizthai-try-it/data (locale C, superuser postgres)
[2/6] pg_ctl start: listening on 127.0.0.1:55420 (TCP only, no unix socket)
[3/6] the Supabase shim (db/foundation/ci/supabase-shim.sql), as CI applies it before migrating
[4/6] node scripts/db/run.mjs migrate-clean: the prerequisite, every migration in order, and every probe
      54 scripts applied; db-migrate-clean: ok in 5559ms
[5/6] the auth-context helpers and the identity fixtures, loaded exactly as `make db-rls-smoke` loads them
      21 fixture files loaded
[6/6] ready

DB_TEST_URL=postgresql://postgres@127.0.0.1:55420/thinkbizthai_try

What you have now: a private PostgreSQL 17.11 (Homebrew) cluster in /var/folders/fd/9fynj49s0ddbgkkrv1hssj3m0000gn/T/thinkbizthai-try-it, listening only on 127.0.0.1:55420, with the database "thinkbizthai_try" built exactly as CI builds its test database: the shim, then all 53 migrations (66 tables in app and private, 209 row level security policies), then the synthetic fixtures (2 workspaces: tenant A and tenant B, which the tests set against each other). Nothing here is real data and nothing is connected to any other service. Next: `node scripts/db/try-it.mjs demo` for the guided tour, `node scripts/db/try-it.mjs psql` to poke at it yourself, and `node scripts/db/try-it.mjs down` to stop it and delete it.
[exit 0]
$ node scripts/db/try-it.mjs demo
ThinkBizThai database foundation: a guided tour of row level security
Database: postgresql://postgres@127.0.0.1:55420/thinkbizthai_try
Every step runs inside its own transaction and is rolled back, so the tour changes nothing and can be run again.

== 1. What each person can see ==

-- The owner of workspace A
   as:       user_owner_a (the owner of workspace A) id 5c460eb8-0710-557a-b423-f9b12c76834f
   runs:     select (select count(*) from app.workspaces)::text as workspaces, (select count(*) from app.business_profiles)::text as businesses, (select count(*) from app.content_items)::text as content_items
   expected: workspaces 1, businesses 4, content items 4
   got:      1 row: {"workspaces":"1","businesses":"4","content_items":"4"}
   proves:   The database holds 2 workspaces, 5 businesses and 5 content items in all. The owner of A sees all of A (1 workspace, businesses A1-A4, the 4 content items under them) and nothing of B.
   result:   as expected

-- An editor in workspace A
   as:       user_editor_a (an editor in workspace A, scoped to business A1) id a324d4a6-15a3-5e15-9193-eed9d50b5d91
   runs:     select (select count(*) from app.workspaces)::text as workspaces, (select count(*) from app.business_profiles)::text as businesses, (select count(*) from app.content_items)::text as content_items
   expected: workspaces 1, businesses 1, content items 3
   got:      1 row: {"workspaces":"1","businesses":"1","content_items":"3"}
   proves:   The editor's membership is scoped to business A1, so they see that one business and its 3 content items, not businesses A2-A4 and not the item under A2.
   result:   as expected

-- A viewer in workspace A
   as:       user_viewer_a (a viewer in workspace A) id d884d3c1-89a0-5600-ae81-c368f6574821
   runs:     select (select count(*) from app.workspaces)::text as workspaces, (select count(*) from app.business_profiles)::text as businesses, (select count(*) from app.content_items)::text as content_items
   expected: workspaces 1, businesses 4, content items 4
   got:      1 row: {"workspaces":"1","businesses":"4","content_items":"4"}
   proves:   The viewer's membership covers all businesses, so they may read everything in A (writing is step 3).
   result:   as expected

-- The owner of workspace B
   as:       user_owner_b (the owner of workspace B, the other tenant) id 297ad853-58a6-5e83-87e1-f936f9c3ddff
   runs:     select (select count(*) from app.workspaces)::text as workspaces, (select count(*) from app.business_profiles)::text as businesses, (select count(*) from app.content_items)::text as content_items
   expected: workspaces 1, businesses 1, content items 1
   got:      1 row: {"workspaces":"1","businesses":"1","content_items":"1"}
   proves:   The other tenant sees only its own: workspace B, business B1 and its one content item, none of A's.
   result:   as expected

== 2. One tenant cannot read the other ==

-- Owner A reads its own workspace by id (the control)
   as:       user_owner_a (the owner of workspace A) id 5c460eb8-0710-557a-b423-f9b12c76834f
   runs:     select id from app.workspaces where id = 'c4840acc-0323-5e13-b1d3-c18d7eb615cb'
   expected: at least one row comes back
   got:      1 row: {"id":"c4840acc-0323-5e13-b1d3-c18d7eb615cb"}
   proves:   The read below is not empty merely because the table is empty.
   result:   as expected

-- Owner A asks for workspace B by its exact id
   as:       user_owner_a (the owner of workspace A) id 5c460eb8-0710-557a-b423-f9b12c76834f
   runs:     select id from app.workspaces where id = '43fd5c24-ebea-528f-9ce9-eedf1f8f9765'
   expected: 0 rows (filtered out, not an error)
   got:      0 rows
   proves:   Holding the other tenant's real id is not enough: the row is filtered out, 0 rows.
   result:   as expected

-- Owner A asks for business B1 by its exact id
   as:       user_owner_a (the owner of workspace A) id 5c460eb8-0710-557a-b423-f9b12c76834f
   runs:     select id from app.business_profiles where id = '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3'
   expected: 0 rows (filtered out, not an error)
   got:      0 rows
   proves:   The same holds one level down, for a business of tenant B.
   result:   as expected

== 3. A viewer cannot write ==

-- The viewer tries to create a content item
   as:       user_viewer_a (a viewer in workspace A) id d884d3c1-89a0-5600-ae81-c368f6574821
   runs:     insert into app.content_items (workspace_id, business_profile_id, title, content_type, created_by, updated_by) values ('c4840acc-0323-5e13-b1d3-c18d7eb615cb'::uuid, 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a'::uuid, 'attempted content item', 'post', 'd884d3c1-89a0-5600-ae81-c368f6574821'::uuid, 'd884d3c1-89a0-5600-ae81-c368f6574821'::uuid) returning id
   expected: refused with ERROR 42501
   got:      refused: ERROR 42501: new row violates row-level security policy for table "content_items"
   proves:   A viewer may read content (step 1) but an INSERT is refused by the row level security policy, error 42501.
   result:   as expected

== 4. Nobody moves a workspace through its lifecycle by hand (batch 170) ==

-- Owner A tries to set its own workspace's lifecycle_state to 'closing'
   as:       user_owner_a (the owner of workspace A) id 5c460eb8-0710-557a-b423-f9b12c76834f
   runs:     update app.workspaces set lifecycle_state = 'closing', updated_by = '5c460eb8-0710-557a-b423-f9b12c76834f' where id = 'c4840acc-0323-5e13-b1d3-c18d7eb615cb' returning id
   expected: refused with ERROR 42501
   got:      refused: ERROR 42501: permission denied for table workspaces
   proves:   Closing a workspace needs confirmation and an audit event, so no client role holds the column: refused by the privilege system, error 42501.
   result:   as expected

-- The same owner can still rename the workspace (the control)
   as:       user_owner_a (the owner of workspace A) id 5c460eb8-0710-557a-b423-f9b12c76834f
   runs:     update app.workspaces set name = 'renamed by its owner after batch 170', updated_by = '5c460eb8-0710-557a-b423-f9b12c76834f' where id = 'c4840acc-0323-5e13-b1d3-c18d7eb615cb' returning name
   expected: at least one row comes back
   got:      1 row: {"name":"renamed by its owner after batch 170"}
   proves:   The refusal above is about lifecycle_state only, not about every change to the table.
   result:   as expected

== 5. Nobody writes a row in someone else's name (batch 127) ==

-- Owner A creates a content item but puts the editor in created_by
   as:       user_owner_a (the owner of workspace A) id 5c460eb8-0710-557a-b423-f9b12c76834f
   runs:     insert into app.content_items (workspace_id, business_profile_id, title, content_type, created_by, updated_by) values ('c4840acc-0323-5e13-b1d3-c18d7eb615cb'::uuid, 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a'::uuid, 'attempted content item', 'post', 'a324d4a6-15a3-5e15-9193-eed9d50b5d91'::uuid, '5c460eb8-0710-557a-b423-f9b12c76834f'::uuid) returning id
   expected: refused with ERROR 42501
   got:      refused: ERROR 42501: new row violates row-level security policy for table "content_items"
   proves:   created_by must be the person actually writing; a forged author is refused, error 42501.
   result:   as expected

== 6. A settled approval cannot be changed (batches 125 and 126) ==

-- The approver tries to decide an already-approved request again
   as:       user_approver_a (an approver in workspace A, scoped to business A1) id fecceb8f-d60b-54bc-97cd-fccee216e34b
   runs:     update app.approval_requests set status = 'approved', decided_at = now(), decided_by = 'fecceb8f-d60b-54bc-97cd-fccee216e34b'::uuid, updated_by = 'fecceb8f-d60b-54bc-97cd-fccee216e34b'::uuid where id = '87f78e21-66e3-5ceb-ba08-68f2cef543a6'::uuid returning id
   expected: 0 rows changed, and a second read shows the row unchanged
   got:      0 rows
   then, as user_owner_a: select status from app.approval_requests where id = '87f78e21-66e3-5ceb-ba08-68f2cef543a6'
             1 row: {"status":"approved"}
   proves:   Once decided, a request is out of reach: the update touches 0 rows, and a second read shows it still says approved.
   result:   as expected

-- The workspace owner tries the same
   as:       user_owner_a (the owner of workspace A) id 5c460eb8-0710-557a-b423-f9b12c76834f
   runs:     update app.approval_requests set status = 'approved', decided_at = now(), decided_by = '5c460eb8-0710-557a-b423-f9b12c76834f'::uuid, updated_by = '5c460eb8-0710-557a-b423-f9b12c76834f'::uuid where id = '87f78e21-66e3-5ceb-ba08-68f2cef543a6'::uuid returning id
   expected: 0 rows changed, and a second read shows the row unchanged
   got:      0 rows
   then, as user_owner_a: select status from app.approval_requests where id = '87f78e21-66e3-5ceb-ba08-68f2cef543a6'
             1 row: {"status":"approved"}
   proves:   Not even the owner can overwrite the approver's decision.
   result:   as expected

All 13 steps behaved as expected.
What this does NOT show: any app or screen, the service worker path, or a real Supabase project. It shows the
database rules on a local copy built the way CI builds one.
[exit 0]
$ node scripts/db/try-it.mjs psql
Connect (copy and paste; this script does not run it):

  psql "postgresql://postgres@127.0.0.1:55420/thinkbizthai_try"

You connect as the superuser "postgres", which row level security does NOT apply to: as yourself you see every
row of both tenants. To see what one fixture user sees, become them inside a transaction. Five lines:

  begin;
  select private.as_user('5c460eb8-0710-557a-b423-f9b12c76834f');  -- user_owner_a; any id below works
  select current_user, current_setting('request.jwt.claims', true);  -- authenticated, and that id
  select id, name from app.workspaces;                               -- only what that user may see
  rollback;                                                          -- back to being postgres, nothing kept

Fixture users you can put in place of that id:
  user_owner_a     5c460eb8-0710-557a-b423-f9b12c76834f   the owner of workspace A
  user_editor_a    a324d4a6-15a3-5e15-9193-eed9d50b5d91   an editor in workspace A, scoped to business A1
  user_viewer_a    d884d3c1-89a0-5600-ae81-c368f6574821   a viewer in workspace A
  user_approver_a  fecceb8f-d60b-54bc-97cd-fccee216e34b   an approver in workspace A, scoped to business A1
  user_owner_b     297ad853-58a6-5e83-87e1-f936f9c3ddff   the owner of workspace B, the other tenant

Without the helper, the same identity is two settings (what Supabase sets from a login token):
  select set_config('request.jwt.claims', '{"role":"authenticated","sub":"<id>"}', true), set_config('role', 'authenticated', true);
[exit 0]
$ du -sh <cluster dir>
 59M	/var/folders/fd/9fynj49s0ddbgkkrv1hssj3m0000gn/T/thinkbizthai-try-it
$ node scripts/db/try-it.mjs down
stopping the cluster on port 55420
deleted /var/folders/fd/9fynj49s0ddbgkkrv1hssj3m0000gn/T/thinkbizthai-try-it
[exit 0]
cluster dir gone
```

(The first line's "+ working tree" is the script's fixed wording: `commit-when-clean` had just committed every
change with `git add -A`, and nothing was edited before this run.) Wall time
for `up` was about 6 seconds, `migrate-clean` 5.6 s of it. The cluster directory peaked at 59 MB and is gone.

### 3.1 The demo cannot pass on a broken database (negative control)

On `cf47b11`, a cluster in a scratch directory, `alter table app.content_items disable row level security`, then
`demo`: **exit 1**, `DEMO FAILED: 6 of 13 steps did not behave as expected`. The six:

```
   result:   NOT AS EXPECTED -- content_items is 5, expected 4
   result:   NOT AS EXPECTED -- content_items is 5, expected 3
   result:   NOT AS EXPECTED -- content_items is 5, expected 4
   result:   NOT AS EXPECTED -- content_items is 5, expected 1
   result:   NOT AS EXPECTED -- assert: viewer-a-cannot-create-a-content-item: 1 row(s) came back. The operation was permitted.
   result:   NOT AS EXPECTED -- assert: owner-a-cannot-forge-created-by-alone-on-a-content-item: 1 row(s) came back. The operation was permitted.
```

Row level security enabled again, `demo`: exit 0. `down`: exit 0, directory gone. An earlier run of the same
control, before the commit, gave the same six.

### 3.2 The refusals, measured

With a cluster up on the default directory:

| command | exit | message (abridged) |
|---|---|---|
| `up` | 1 | `... already holds a try-it cluster on port 55420` |
| `up --dir <worktree>/tmp-tryit` | 1 | `... is inside the repository` (nothing created) |
| `up --dir <scratch>/fresh --port 5432` | 1 | `port 5432 is one this tool never touches.` (nothing created) |
| `up --dir <scratch>/not-ours` (holds `keep.txt`) | 1 | `exists and is not empty, and it was not made by up. Nothing was touched.` (`keep.txt` still there) |
| `down --dir <scratch>/not-ours` | 1 | `holds no marker written by up, so nothing is stopped and nothing is deleted.` |
| `demo --dir <scratch>/nowhere` | 1 | `no try-it cluster in ...` |
| `frobnicate`, `up --port abc`, `up --dir` (no value) | 2 | usage |

## 4. The static test

Added to `a target needing a database refuses without one, rather than reporting a pass` in
`test-kits/db/foundation-contract.test.mjs`, no database needed:

- `tryItRefusal` refuses every URL in the shared guard's crafted list, CI's `postgres` host, port 5432 (explicit
  and default), an off-list name and a private address, and every reserved port; it admits its own loopback URL;
  the search range holds no reserved port.
- The source imports `testHostRefusal` from `psql-driver.mjs` and writes the loopback-only, no-socket settings.
- `demo`, `psql`, `down` against a missing directory, `up` into the repository and `up --port 5432` each exit 1
  with a `try-it:` message.
- `demoPlanProblems(DEMO_STEPS, buildCases(...), catalog)` is empty; every step says what it proves; every counts
  step expects all three exact counts; every case step expects what the suite's case expects; the tour shows each
  of `rows`, `no-rows`, `denied`, `no-effect` and the five headline cases.
- And the plan check bites, one mutation each: an expectation removed, a case id misspelled, a mismatched
  expectation, a partial count, a non-numeric count, an empty `proves`, an unknown user, a plan with no step
  expecting rows, an empty plan.

`node --test --test-name-pattern="a target needing a database refuses" test-kits/db/foundation-contract.test.mjs`:
1 test, pass.

## 5. Checks

| command | result |
|---|---|
| `npm run check` (Node 24.20.0, on the tree that became `cf47b11`) | exit 0; tests 684, pass 684, fail 0 |
| `node scripts/commit-when-clean.mjs` for `cf47b11` | `clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0` |
| `node scripts/verify-test-coverage-floor.mjs` | exit 0 (foundation-contract makes 1030 assertions by the guard's count) |

Nothing was red on this branch name, the branch-slot and handoff guards included, so the commit went through
`commit-when-clean` rather than plainly. Not run here:
`make db-rls-smoke` and `make db-migrate-clean` against a fresh cluster (try-it's `up` runs `migrate-clean` itself,
and the `rls-smoke.mjs` change is a move of code `make db-rls-smoke` still calls through `main()`; CI will run both).

## 6. Owed, and limits

- **Independent review and test** of all of the above (Reviewer, Tester, and Security for a tool that starts a
  server with `trust` auth on loopback and deletes a directory). Nothing here is reviewed.
- **Packaging** by A0: branch slot, increment rationale, handoff, and whether `amends_without_owning` needs a line
  for this increment.
- **A `make db-try-it` / `npm run try-it` wish**, if wanted, through the Integration Owner (root config is protected).
- **Platforms.** Measured on macOS 26 (Darwin 25.6) with Homebrew PostgreSQL 17.11 only. Linux should work (same
  binaries); Windows is untested and not claimed.
- **Trust auth on loopback.** Any local process on the machine can connect to the cluster while it is up. It holds
  synthetic fixtures only and is deleted by `down`; the guide says so.
- **The counts are pinned to today's fixtures.** A later batch that adds a content item to workspace A will fail
  step 1 to 3 of the demo until the expected numbers are moved, deliberately.
- The demo shows the database rules only: no app, no service-worker path (`app_worker` is not exercised), no
  provisioned Supabase instance.

## 7. For the Owner (the point where you can test)

```sh
cd <your clone of ThinkBizThai, on this branch>
export PATH=/Users/bank/.local/node-v24.20.0/bin:$PATH
node scripts/db/try-it.mjs up
node scripts/db/try-it.mjs demo
node scripts/db/try-it.mjs psql      # then paste the psql line it prints, and the five lines
node scripts/db/try-it.mjs down
```

The guide is `db/foundation/TRY-IT.md`.
