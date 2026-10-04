# A0 plan and record: the try-it batch -- a throwaway local cluster and a guided RLS tour for the Owner

- **Package:** `WP-0A-DB-00`. **Author:** `/claude/a0_atlas` (written by a subagent of that run).
- **Branch:** `agent/claude/WP-0A-DB-00-batch-try-it`, from `main` at `b0a3809` (PR #177, the sql-lexer batch, merged
  2026-10-04T14:02:54Z by A0 at its reviewed head `941e718`, required check `bootstrap` green on that head, run
  37206998439, under the Owner's standing delegation; see the disposition).
- **Commits:** `4539d92` and `99fd697` are the local draft (`cf47b11`, `c90ac1f` on `draft/wp-db00-try-it`, drafted on
  `5bde893`), cherry-picked; the first one's conflicts with #177 (the assertion floor in
  `scripts/test-suite-contract.mjs` and two digests in the integrity manifest) were resolved against main. The
  first one's message still says "assertion floor 1014 -> 1030", which was true on `5bde893`; on main the floor
  is set by `1298dbe` (row 8). `1298dbe` is the code change on top of the draft and its packaging (the manifest's
  branch slot, rationale, amendment list and open_blockers[196]; the branch-identity slot; the floor; the
  integrity manifest; the audit-coverage map's line fields). This plan and the disposition are the commit after
  it; the handoff is last and alone.
- **Status:** written and measured by the Author. Not reviewed, not tested by an independent role, not approved.
  C0, Q0 and A1 role runs follow. The PR is a Draft.
- **The Owner's words:** `คุณไม่ต้องรอ confirm กับผม  คุณลุยไปยาวๆ จนถึงจุดที่ให้ผม test แล้วค่อยถาม`, then `ลุยๆ`
  (2026-10-04, set as the session goal). This batch is that point: a tool the Owner runs on their own Mac. See
  `product-owner-disposition-2026-10-03-batch-try-it.md`.
- **Inputs:** the draft and its record `a0-try-it-draft-2026-10-04.md` (kept, unchanged); `scripts/db/psql-driver.mjs`
  as #177 left it (`testHostRefusal`, `psqlLex` on the one lexer); `scripts/db/rls-smoke.mjs`;
  `tests/db/identity/isolation-cases.mjs` and `run-isolation.mjs`; the phase plan `a0-phase-plan-141-170-2026-10-03.md`.

**No migration, no dependency, no root configuration.** No migration file is added or edited, so no number is
asked of anyone. `try-it.mjs` is Node built-ins only (RFC-2026-001 holds). `Makefile`, `package.json` and CI are not
touched; a make target or npm script is owed as a request to the Integration Owner (open_blockers[196] (1)).
**This batch decides nothing and approves no RFC.**

## 1. Item -> change -> what proves it

| # | Item | Change | Proof (measured; §2-§5) |
|---|---|---|---|
| 1 | The draft, on main as it now stands | cherry-pick `cf47b11`, `c90ac1f` onto `b0a3809`; conflicts resolved: foundation-contract's assertion floor (main's sql-lexer line kept, this batch's line after it) and the two digests (regenerated) | `npm run check` 685/685 on the cherry-picked tree (before any edit); §2 run end to end |
| 2 | try-it uses main's guards and lexer | nothing to change: try-it imports `testHostRefusal` and `psqlLex` from `./psql-driver.mjs`, and on main `psqlLex` reads through `scripts/db/sql-lexer.mjs`; the shim passes it (no finding) | static: the import from `./psql-driver.mjs` is asserted; live: `up` step 3 scans and feeds the shim (§2) |
| 3 | Copy-paste commands with the full Node path | `nextCommand(sub, dir, node = process.execPath)`: every "next" command try-it prints (after `up`, after `demo`, in the "no cluster" and "already holds" refusals) is the running Node's full path + `scripts/db/try-it.mjs <sub>` + `--dir` when not the default, shell-quoted when needed | §2 transcript (`Next (copy and paste):` lines); static: 3 assertions (default dir, other dir, a `'` in the path) |
| 4 | Simple and safe for one non-specialist | a Node other than `.node-version` gets a non-fatal note; a failure after the marker is written prints the `down` that removes the half-made cluster; `main()` entered via `pathToFileURL(argv[1]).href` (a path with a space still runs) | §3 (the Node 26.7.0 note; `up` with no initdb on PATH, then the printed `down`: directory gone); static: `PINNED_NODE` equals `.node-version` |
| 5 | TRY-IT.md | a "Quick start (copy and paste)" section first: `cd /Users/bank/ThinkBizThai` and the four commands with `/Users/bank/.local/node-v24.20.0/bin/node`, what each ends with, why the full path (a Node 26 is on PATH); no make/npm entry yet, said plainly; Safety: any local process can connect while it is up | read |
| 6 | Readable demo output | unchanged from the draft: plain-English section headings (`== 1. What each person can see ==` to `== 6. A settled approval cannot be changed ==`), each step `as / runs / expected / got / proves / result`; a closing line with the `down` command | §2 |
| 7 | The negative control | none (re-measured on `1298dbe`) | §4: RLS off on `app.content_items` -> `demo` exit 1, 6 of 13 named; RLS on -> exit 0 |
| 8 | Packaging | branch slot (manifest + `test-kits/branch-identity.test.mjs`, replacing the merged `batch-sql-lexer`); rationale rewritten, naming the THREE files amended outside ownership; `evidence/VERIFICATION.md` removed from the list (no test added, suite count stays 685; declaring it would fail `verify-branch-scope`, measured: exit 74); foundation-contract assertion floor 1044 -> 1074 (main counted 1054: the sql-lexer review round added ten without moving the floor; this batch adds 20, the draft's 16 and rows 3-4's 4); the 33 blocker `line` fields of `db/foundation/lint/audit-coverage-map.json` each move back by one (the amendment list shrank by one line; indexes and quotes unchanged); integrity manifest regenerated | `verify-branch-scope b0a3809`: exit 0, 10 paths; `npm run check` (§5) |
| 9 | Blockers | open_blockers[196] added: the draft's §6 findings, each with its owner; cross-references [113] (no worker path) and [188] (Integration Owner evidence) instead of restating them | read; §6 |

**Not changed, and why.** The other DB entry points (`rls-smoke.mjs`, `run.mjs`, `authz-proofs.mjs`,
`run-isolation.mjs`) still enter `main()` by comparing with `file://${argv[1]}`; changing four runners is outside
this batch, so it is held as open_blockers[196] (5), read and not measured.

## 2. Measured end to end: `up`, `demo`, `psql`, `down` on `1298dbe`

Node `v24.20.0`, psql 17.11 (Homebrew), macOS (Darwin 25.6), clean tree at `1298dbe`. The cluster directory is this
run's private scratch directory (`<scratch>` below, under the session's scratchpad) rather than the default
`<os.tmpdir()>/thinkbizthai-try-it`, as this run's instructions require. The port is the one `up` picked, 55420:
the run was assigned 5507 for its own clusters, and try-it refuses 5507 by design (one of its reserved measurement
ports, §3), so the tool's own free-port search was used and recorded rather than weakening the refusal. Nothing
else listened on 55420. The full output, unedited except the scratch path:

```
node v24.20.0; psql (PostgreSQL) 17.11 (Homebrew); 2026-10-04T14:19:15Z; head 1298dbe, tree clean
$ node scripts/db/try-it.mjs up --dir <scratch>/cluster
[1/6] initdb: a new, empty cluster in <scratch>/cluster/data (locale C, superuser postgres)
[2/6] pg_ctl start: listening on 127.0.0.1:55420 (TCP only, no unix socket)
[3/6] the Supabase shim (db/foundation/ci/supabase-shim.sql), as CI applies it before migrating
[4/6] node scripts/db/run.mjs migrate-clean: the prerequisite, every migration in order, and every probe
      54 scripts applied; db-migrate-clean: ok in 5173ms
[5/6] the auth-context helpers and the identity fixtures, loaded exactly as `make db-rls-smoke` loads them
      21 fixture files loaded
[6/6] ready

DB_TEST_URL=postgresql://postgres@127.0.0.1:55420/thinkbizthai_try

What you have now: a private PostgreSQL 17.11 (Homebrew) cluster in <scratch>/cluster, listening only on 127.0.0.1:55420, with the database "thinkbizthai_try" built exactly as CI builds its test database: the shim, then all 53 migrations (66 tables in app and private, 209 row level security policies), then the synthetic fixtures (2 workspaces: tenant A and tenant B, which the tests set against each other). Nothing here is real data and nothing is connected to any other service.

Next (copy and paste):
  /Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs demo --dir <scratch>/cluster    # the guided tour
  /Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs psql --dir <scratch>/cluster    # how to connect and look around yourself
  /Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs down --dir <scratch>/cluster    # stop it and delete it when you are done
[exit 0]
$ node scripts/db/try-it.mjs demo --dir <scratch>/cluster
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
When you are done: /Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs down --dir <scratch>/cluster
[exit 0]
$ node scripts/db/try-it.mjs psql --dir <scratch>/cluster
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
 58M	<scratch>/cluster
$ node scripts/db/try-it.mjs down --dir <scratch>/cluster
stopping the cluster on port 55420
deleted <scratch>/cluster
[exit 0]
cluster dir gone
```

`up` took about 6 s (migrate-clean 5.2 s of it); the cluster peaked at 58 MB and is gone. The five cheat-sheet lines
are unchanged from the draft, which ran them by hand (draft record §2).

## 3. The refusals and the new behaviour, measured

```
== the PATH node: /Users/bank/.local/node-v24.20.0/bin/node v24.20.0
$ node scripts/db/try-it.mjs demo --dir <scratch>/nowhere   (PATH node)
try-it: no try-it cluster in <scratch>/nowhere. Run `/Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs up --dir <scratch>/nowhere` first.
[exit 1]
== up with no initdb on PATH (a half-made cluster), then the printed down
$ PATH=/usr/bin:/bin node24 scripts/db/try-it.mjs up --dir <scratch>/half
[1/6] initdb: a new, empty cluster in <scratch>/half/data (locale C, superuser postgres)
try-it: initdb failed (is PostgreSQL installed and initdb on PATH?):
initdb: spawn initdb ENOENT
try-it: to remove what was made so far: /Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs down --dir <scratch>/half
[exit 1]
thinkbizthai-try-it.json
deleted <scratch>/half
[exit 0]
half gone
== a reserved port (this run's own 5507)
try-it: port 5507 is one this tool never touches.
[exit 1]
nothing created
```

And with Node 26.7.0 (`/opt/homebrew/bin/node`, the one on this Mac's PATH outside this run):

```
$ /opt/homebrew/bin/node scripts/db/try-it.mjs demo --dir <scratch>/nowhere
try-it: note: this is Node v26.7.0; the repository pins v24.20.0 (see db/foundation/TRY-IT.md for the full path to use). Carrying on.
try-it: no try-it cluster in <scratch>/nowhere. Run `/opt/homebrew/Cellar/node/26.7.0/bin/node scripts/db/try-it.mjs up --dir <scratch>/nowhere` first.
[exit 1]
```

The draft's other refusals (an existing try-it cluster, a directory inside the repository, port 5432, a non-empty
directory not made by `up`, `down` with no marker, usage errors) are unchanged in code; the static test still holds
`demo`, `psql`, `down` without a cluster, `up` into the repository and `up --port 5432` at exit 1 with a `try-it:` line.

## 4. The demo cannot pass on a broken database (negative control), on `1298dbe`

```
up exit 0
disable exit 0          (alter table app.content_items disable row level security)
demo (RLS off) exit 1
   result:   NOT AS EXPECTED -- content_items is 5, expected 4
   result:   NOT AS EXPECTED -- content_items is 5, expected 3
   result:   NOT AS EXPECTED -- content_items is 5, expected 4
   result:   NOT AS EXPECTED -- content_items is 5, expected 1
   result:   NOT AS EXPECTED -- assert: viewer-a-cannot-create-a-content-item: 1 row(s) came back. The operation was permitted.
   result:   NOT AS EXPECTED -- assert: owner-a-cannot-forge-created-by-alone-on-a-content-item: 1 row(s) came back. The operation was permitted.
DEMO FAILED: 6 of 13 steps did not behave as expected:
enable exit 0           (alter table app.content_items enable row level security)
demo (RLS on) exit 0
All 13 steps behaved as expected.
down exit 0, dir gone
```

The same six as the draft measured on `cf47b11`.

## 5. Checks

| command | where | result |
|---|---|---|
| `npm run check` | the cherry-picked tree, before any edit (branch name) | exit 0; tests 685, pass 685 |
| `npm run check` | the tree that became `1298dbe` (branch name) | exit 1; 683/685. The two reds are the handoff guard (`the handoff for this branch describes this branch`, and the ratchet that runs that suite on a copy), which cites `fb6c720` until `npm run refresh:handoff`, last and alone. So `1298dbe` was a plain commit, not `commit-when-clean`; nothing else was red |
| `node scripts/verify-branch-scope.mjs b0a3809 WP-0A-DB-00` | `1298dbe` | exit 0: all 10 changed paths declared, every amendment explains one |
| `node scripts/verify-test-coverage-floor.mjs` | the tree of `1298dbe` | exit 0 (foundation-contract counts 1074 by the guard's own rule) |
| `make db-migrate-clean`, `make db-rls-smoke`, round 1 | fresh cluster, 127.0.0.1:5507, TCP only, shim first, `1298dbe` | 0 (`ok in 5118ms`); 0 (1087 isolation cases passed, 6 authz claims discharged, `ok in 1236ms`) |
| the same, round 2 | re-initdb | 0 (`ok in 5256ms`); 0 (1087, 6, `ok in 1437ms`) |
| `try-it up`, `demo`, `psql`, `down` | §2 | 0, 0 (13 of 13), 0, 0 |
| negative control | §4 | demo 1 with RLS off (6 named), 0 with it on |

`rls-smoke.mjs` is the only DB-layer input this batch changes (the draft's lift of the helper and fixture loading
into `loadHelpersAndFixtures()`), so migrate-clean and rls-smoke were run twice on fresh clusters; no drift was
needed (no migration text or migration-reading rule changed), and `140_audit.sql` was not touched. Clusters stopped
and removed.

## 6. Owed, and limits

All held in open_blockers[196], each with its owner, and cross-referenced rather than restated where another
blocker already holds the subject:

1. **A `make db-try-it` / `npm run try-it` entry point**, if wanted: a request to the Integration Owner
   (`/claude/r0_steward`). Root configuration is untouched.
2. **Trust auth on loopback** while a cluster is up: A1 to say whether a generated per-cluster password is wanted.
3. **Platforms**: macOS with Homebrew PostgreSQL 17.11 and Node 24.20.0 only. A0, a stated limit.
4. **The demo's counts are pinned to today's fixture**; CI holds the plan statically, not the counts live. A0.
5. **The other runners' `file://${argv[1]}` entry check** (a path with a space). A0, read and not measured.
6. **Independent review and test**: C0, Q0, A1. Nothing here is reviewed.

Cross-referenced: no worker path in the demo -> open_blockers[113] (DATA-DEC-03); Integration Owner evidence ->
open_blockers[188].

## 7. For the Owner (the point where you can test)

After this branch is merged (or with it checked out), in Terminal:

```sh
cd /Users/bank/ThinkBizThai
/Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs up
/Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs demo
/Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs psql
/Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs down
```

The guide is `db/foundation/TRY-IT.md`.
