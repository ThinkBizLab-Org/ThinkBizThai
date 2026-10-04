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

## Review round (2026-10-04)

Written by a subagent of `/claude/a0_atlas` (the Author). It fixes what the three role runs found and approves
nothing; the PR stays a Draft. No migration, no dependency, no decision, no new test. Nothing above this heading is
rewritten: where it is wrong, the correction is here.

### Cherry-pick map

| Role run | Review branch, commit | Here, `cherry-pick -x` |
|---|---|---|
| C0 `/claude/c0_contract_reviewer` | `review/c0-batch-try-it` `cdafe99` | `849890f` |
| A1 `/claude/a1_bastion` | `review/a1-batch-try-it` `a7f6c97` | `739ea82` |
| Q0 `/claude/q0_sentinel` | `review/q0-batch-try-it` `4350d39` | `dfb524a` |

All three: no stop-the-line, nothing blocks the merge in their reading. The code of this round is `dd11a35`.

### Finding -> change -> measured

| Finding | Change (`dd11a35`) | Measured |
|---|---|---|
| **Q0-TI-1** (MEDIUM) = **C0-TI-1** (LOW): in a clone path with a space, migrate-clean exits 0 having run nothing, and `up` took that exit 0 as success | (a) `migrateCleanProblem({ code, out })`, exported: `up` goes on only when the output holds a `db-migrate-clean: ok` line AND at least one `  applied ` line; otherwise the half-made refusal names why. (b) `run.mjs`, `rls-smoke.mjs`, `authz-proofs.mjs` and `run-isolation.mjs` enter `main()` by `pathToFileURL(argv[1]).href` (one line and one import each). (c) the wording: plan §1 row 4 and `1298dbe`'s "a path with a space still runs" were true of try-it's own `main()` only; `open_blockers[196]` (5) now says so, measured | Fed the real make output of round r1: `{ applied: 54, summary: 'db-migrate-clean: ok in 5038ms', problem: null }`; an empty exit 0: "printed no `db-migrate-clean: ok` line, so it did not run". A copy of the tree under `clone with space/`, no `DB_TEST_URL`: each of the four runners now exits **1** with its own refusal; the same four at `cee1585`, same path: exit **0**, 0 bytes (the control). Static: M-mig, M-applied, M-runner red |
| **A1 F1** (MEDIUM): trust on loopback is the superuser, so OS command execution as the Owner; TRY-IT.md undersold it | (a) now: TRY-IT.md Safety says "as the database superuser", that the superuser can run operating-system commands as you (`COPY ... TO PROGRAM`), that any program or account that can reach `127.0.0.1` can do so while it is up, "Run `down` as soon as you are done", and that a per-cluster password is owed before a make/npm command. (b) scram-sha-256 with a random per-cluster password in a 0600 file and `PGPASSFILE`: **owed**, recorded on `[196]` (2) as A1's answer. Bounded, but it changes every connection try-it and its children make (`initdb`, the shim feed, `run.mjs`, rls-smoke's loader, the demo session, the printed `psql`) and wants its own live `up`, which this round cannot run (below) | read (A1's measurement stands) |
| **A1 F2** (LOW): `down` acted on a forged marker -- stopped a cluster it did not make, signalled an arbitrary PID, ignored the reserved ports | `downRefusal(dir, marker)`, exported, before anything is stopped: the marker's URL must pass `tryItRefusal`; `dir` and every owned entry (and `data/postmaster.pid`) must not be a symlink; `pidFileProblem`: line 2 must realpath to `<dir>/data`, line 4 must equal the marker's port, line 1 must be a number. Then, before `pg_ctl stop`, the server answering on the marker's port is asked `current_setting('data_directory')`, and it must realpath to `<dir>/data`. If the connection is refused, nothing is signalled (the file is stale, as after a restart); any other connection error refuses | Live on a 5507 cluster of mine: its real `postmaster.pid` (lines `10808 / <P>/pg-r1 / 1791125951 / 5507`) gives `pidFileProblem(...)` = `null` for port 5507 and "names port 5507, and the marker port 55478" for 55478; its `data_directory` realpaths equal. Forged dirs, `down` each: D7 again (marker 5432, `data` -> my 5507 cluster) exit 1 "port 5432 is one this tool never touches"; marker 55478 with `data` -> my cluster: exit 1 "data ... is a symlink"; a copied live `postmaster.pid` in a real `data`: exit 1 "names another data directory"; D6 again (a live unrelated Node process's PID, line 2 my cluster): exit 1, the same; that PID with line 2 its own `data` and line 4 5507: exit 1 "names port 5507". After all five: `pg_ctl status` 0 (my cluster untouched), the unrelated process got **no** SIGINT, every forged dir still there. A real refused connection reads `... failed: Connection refused` (the text the stale-file branch keys on). Static: M-pid, M-pidport, M-downport, M-links red |
| **A1 F3** (LOW): the repository check was bypassed by a not-yet-existing path under a symlink into the repository | `realpathThroughAncestor(path)`: the real path of the nearest existing ancestor plus the rest; `insideRepo` uses it. `up` also refuses a `--dir` that is a symlink, and reads the check again after `mkdir`, before the marker is written. TRY-IT.md:152 is now true as written, and says how | Static: a not-yet-made path under a link to the repository is inside it; `up --dir <link>/not-yet --port 55478` exits 1 "is inside the repository" (U7's shape; it stopped at the port before). M-ancestor red |
| **Q0-TI-2** (LOW): the printed "next" commands only ran from the repository root | `SCRIPT = join(REPO, 'scripts', 'db', 'try-it.mjs')`, shell-quoted, in every printed command; TRY-IT.md says the printed ones run from anywhere | Static: the three `nextCommand` assertions now expect the full script path; `shellQuote('/a b/c')`. M-script red |
| **Q0-TI-3** (LOW): a stopped cluster read as `DEMO FAILED: 13 of 13` | `attached()` (demo, psql): no `data/postmaster.pid` -> "is not running (it has stopped, after a restart for example). Run `down`, then `up`"; a pid file but no answer to `select 1` -> "does not answer on 127.0.0.1:N (...)", the same advice. `up`'s "already holds" says `down` then `up` is the way back if it has stopped | Static: `demo` and `psql` on a marker with no `postmaster.pid` exit 1 with that text, and no connection is tried. The probe branch (a stale pid file after a restart) is read, not measured live (limit below) |
| **Q0-TI-4** (LOW, read): `down` refused over a foreign entry before stopping, leaving the trust cluster running | `down` stops first (after every check above), then refuses the delete: "holds things `up` did not make (notes.txt). The cluster is stopped; nothing is deleted. Move those out and run `<down>` again." | Static: the message, the foreign file kept; and the control: the same forged dir without it is deleted (no server, nothing signalled) |
| **C0-TI-2** (LOW): TRY-IT.md said `db-rls-smoke` would fail on a loaded database | Says `db-migrate-clean` fails on a migrated database (`role "app_worker" already exists`) and `db-rls-smoke` loads again and passes | read (C0 M12) |
| **C0-TI-3** (LOW) = Q0-TI-7 (INFO): "several hundred cases" | "over a thousand cases (1087 on 2026-10-04) plus the authorization proofs (6 claims)" | rounds r1, r2 below: 1087, 6 |
| A1 F4 (INFO): `up` onto a regular file crashed with a stack trace | `up` refuses a non-directory with a `try-it:` line | Static: exit 1, `^try-it: .* is not a directory`. M-notdir red |
| A1 F5 (INFO) = Q0-TI-5 (INFO): `[196]` cites the plan's §5; the owed list is §6 | Corrected by an append to `[196]` (its text above is not rewritten) | read |
| C0-TI-4 (INFO): the settled-approval witness reads a value the statement writes | Step 12's `proves` and TRY-IT.md part 6 now rest on the 0-row update ("which is the proof"); the suite's witness is the suite's, unchanged here | read |
| C0-TI-5 (INFO): no way given to get `initdb` on PATH | `brew link postgresql@17`, or `$(brew --prefix postgresql@17)/bin` first on `PATH` | read |
| C0-TI-7 (INFO): "built exactly as CI builds" | "built from what CI builds its test database from" (TRY-IT.md, and `up`'s closing paragraph), with the differences named (locale C, durability off); the demo's last line likewise | read |
| C0-TI-6 (INFO), Q0-TI-6 (INFO) | No rewrite (no force-push). For Q0-TI-6: the cherry-pick's conflict resolution in `4539d92` set the floor to an intermediate 1060, recorded nowhere until now; `1298dbe` set 1074 and this round 1101 | -- |

Every mutation above (private `mutate.mjs`) weakens one fix in place, runs the one test, and restores the file
(sha256 compared): M-mig, M-applied, M-ancestor, M-pid, M-pidport, M-downport, M-links, M-notdir, M-script,
M-runner, each **red** with the assertion that names it, each restored. A mutation of the `attached()` pid-file check
was not run: with it, the test's `demo` would try a connection to a port in try-it's range that another run may hold.

### Measured on this round (Node `v24.20.0`, checked before every run; PostgreSQL 17.11, 127.0.0.1:5507, TCP only, `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the CI shim first, re-initdb every round)

| Command | Where | Exit | Output |
|---|---|---|---|
| `node --test --test-name-pattern='a target needing a database refuses' test-kits/db/foundation-contract.test.mjs` | working tree | 0 | 1/1 |
| `npm run check` | working tree, branch name | 0 | tests 685, pass 685 |
| `node scripts/verify-branch-scope.mjs b0a3809 WP-0A-DB-00` | working tree, branch name | 0 | "all 16 changed path(s) are declared, and every amendment explains one" |
| `node scripts/commit-when-clean.mjs` -> `dd11a35` | branch name | 0 | "clean: exit 0 — tests 685, pass 685" |
| round r1: shim, `make db-migrate-clean`, `make db-rls-smoke` | working tree that became `dd11a35` | 0, 0, 0 | `ok in 5038ms`, 54 scripts applied; 1087 isolation cases passed, 6 claims discharged, `ok in 1236ms` |
| the probes above (private `probes.mjs`, `space.sh`) | r1's cluster, then stopped | -- | as in the table |
| round r2, re-initdb | `dd11a35` committed | 0, 0, 0 | `ok in 5180ms`; 1087, 6, `ok in 1271ms` |
| foundation-contract assertions, the guard's own rule | `dd11a35` | -- | 1101 (1074 + 27); the floor in `scripts/test-suite-contract.mjs` moves 1074 -> 1101 |

`run.mjs` and `rls-smoke.mjs` changed only in how `main()` is entered, so the rounds were the check that matters:
both targets printed their own summaries, which a skipped `main()` would not. No migration text or migration-reading
rule changed, so no drift was appended and `140_audit.sql` was not touched. The cluster is stopped and removed;
nothing listens on 5507.

### Still owed (recorded on `open_blockers[196]`)

- **`up`, `demo`, `psql`, `down` end to end on this round's code**, and a stopped cluster and a stale
  `postmaster.pid` live: try-it refuses 5507 (a reserved port), and this round was allowed no other. The changed
  parts are measured piecewise above and held statically. Owner A0, the next run with a port in 55420-55479.
- **A per-cluster scram-sha-256 password** (A1 F1 (b)), before a make/npm entry point. Owner A0.
- `scripts/verify-clean-run.mjs:75` and `scripts/refresh-author-handoff.mjs:373` keep `file://${process.argv[1]}`:
  outside this package's ownership; the Integration Owner.
- A residual: when nothing answers on the marker's port, `down` signals nothing and deletes the directory, so a
  postmaster alive but not listening on its port would not be stopped by `down`.

Private artefacts: `a0-try-itr2/` in the run's scratchpad (`round.sh`, `probes.mjs`, `space.sh`, `mutate.mjs`, each
log).

## Fix after the re-checks (2026-10-04)

Written by a subagent of `/claude/a0_atlas` (the Author). It fixes what the three re-checks asked for before the
merge, because try-it runs on the Owner's own Mac, and approves nothing; the PR stays a Draft. No migration, no
dependency, no decision, no new test. Nothing above this heading is rewritten: where it is wrong, the correction is
here and on `open_blockers[196]`.

### Cherry-pick map

| Re-check | Branch, commit | Here, `cherry-pick -x` |
|---|---|---|
| C0 `/claude/c0_contract_reviewer` | `recheck/c0-batch-try-it` `be76256` | `b0dc60f` |
| A1 `/claude/a1_bastion` | `recheck/a1-batch-try-it` `e77da51` | `60e77eb` |
| Q0 `/claude/q0_sentinel` | `recheck/q0-batch-try-it` `33214e2` | `e71308f` |

All three: no stop-the-line, nothing blocks the merge in their reading. The code of this fix is `3b64fd3`.

### Finding -> change -> measured

| Finding | Change (`3b64fd3`) | Measured |
|---|---|---|
| **A1 R-F1** (MEDIUM, carried from F1 (b)): trust on loopback is the superuser while a cluster is up | `up` draws `newPassword()` (32 random bytes, base64url, 43 characters), writes `<dir>/pgpass` (`127.0.0.1:<port>:*:postgres:<password>`, libpq's password file) and `<dir>/initdb.pwfile`, both `{ mode: 0o600, flag: 'wx' }` (no link followed, no file reused), runs `initdb --auth=scram-sha-256 --pwfile=<that file>`, then removes the pwfile. `useClusterPassword(dir)` sets `PGPASSFILE` and drops an inherited `PGPASSWORD` before every connection (`up`, `attached()` for demo and psql, `down`), so the children (`run.mjs migrate-clean`, the fixture loader, the demo session, `down`'s `data_directory` question) read it from the file. The URL carries no password. `up` prints `PGPASSFILE=<dir>/pgpass DB_TEST_URL=<url>`; `psql` prints `PGPASSFILE=<dir>/pgpass psql "<url>"`. Both names are in `OWNED_ENTRIES`, so `down` refuses a link there and deletes them. TRY-IT.md steps 1 and 6, the db-rls-smoke sentence, "Poking at it yourself" and Safety say so; Safety keeps what the password does not cover | Live, try-it's own port 55420: `pg_hba.conf` is `scram-sha-256` on every line; psql with no password: exit 2, `fe_sendauth: no password supplied`; with a wrong `PGPASSWORD`: exit 2, `FATAL:  password authentication failed for user "postgres"`; with the cluster's `pgpass`: `postgres`, verifier `SCRAM-SHA-256`. `demo` with a wrong `PGPASSWORD` value inherited: exit 0, 13 of 13. The printed psql line, run as printed (plus `-Atc`): `postgres thinkbizthai_try`. `make db-rls-smoke` with the printed settings in front: exit 0, 1087 cases, 6 claims. The password (43 characters) is in `pgpass` alone: 0 hits in the `up`, `demo`, `psql` and that rls-smoke output, in `migrate-clean.log` and in `postgres.log`. Half-made (initdb not on `PATH`): `pgpass` and the marker left, the pwfile already gone, the printed `down` deletes them. Static: M-trust, M-mode, M-pgpassword, M-psql-line red |
| **C0-TIR-1** (LOW) = **A1 R1** (INFO): `pathToFileURL(argv[1])` skips `main()` for a script named through a symlink | `run.mjs`, `rls-smoke.mjs`, `authz-proofs.mjs`, `run-isolation.mjs`, `try-it.mjs` and `generate-pinned-grants.mjs` (the sixth used the same line) compare `realpathSync(argv[1])` with `realpathSync(fileURLToPath(import.meta.url))`, the repository's idiom. The contract test asserts the idiom in all six, asserts that no `.mjs`/`.js` under `scripts/` or `tests/` compares the bare URL except the Integration Owner's `verify-clean-run.mjs` and `refresh-author-handoff.mjs`, and runs `try-it.mjs`, `run.mjs migrate-clean` and `rls-smoke.mjs` through a symlink to the repository | Through `<P>/repolink` (a link to the worktree), no `DB_TEST_URL`: `try-it psql` on the live cluster exit 0, 1773 bytes; `try-it down --dir <none>` named through `/tmp/...` and the link: exit 1, "holds no marker"; `run.mjs migrate-clean` 1, `rls-smoke.mjs` 1, `authz-proofs.mjs` 1, `generate-pinned-grants.mjs --check` 2, `run-isolation.mjs` 1, each with its own refusal (C0 R9 and A1 E2/E4 measured exit 0, 0 bytes before). Static: M-entry-tryit, M-entry-runner red |
| **C0-TIR-2** (INFO): a dangling link into the repository passes `insideRepo`; TRY-IT.md's sentence was broader than the check | TRY-IT.md now says "a symlink that resolves into the repository", and that `mkdir` through a dangling one fails before anything is written. The uncaught `ENOTDIR` stays: a stated limit on `[196]` | read (C0 R14) |
| **C0-TIR-3** (INFO): `attached()` checks that something answers, not that it serves this directory | Not changed. With the password per cluster, another try-it cluster on the marker's port refuses this directory's password, so `demo` cannot run against it; recorded on `[196]` as a stated limit | read, not measured |
| **Q0-TIR-1** (INFO): the review round's scope row said "all 16 changed path(s)" on the "working tree" | The scope guard reads `base..HEAD` (commits only), so that count was of the commits up to `dfb524a`. At `20623f2` it is 19, and after this fix 23, all declared (below) | measured |
| **Q0-TIR-2** (INFO): `[196]` (7) still read "owed" after Q0 measured it | Appended to `[196]`: (7) was measured by Q0 on `dd11a35` (55477 and 55420), and again here on `3b64fd3`; closed | measured (below) |

Every mutation (private `mutate.mjs`) weakens one fix in place, runs the one test, and restores the file (sha256
compared): M-trust (`--auth=trust` back), M-mode (`0o644`, no `wx`), M-pgpassword (the `delete` removed),
M-psql-line (the bare `psql "<url>"` line back), M-entry-tryit and M-entry-runner (a `file://` comparison back in
`try-it.mjs` and `rls-smoke.mjs`): each **red** with the assertion that names it, each restored, `git status` clean.

The 0600 file options are named `PRIVATE_FILE_OPTIONS`: the first name, `SECRET_FILE`, assigned an `Object.freeze` call and matched the secret scan's
`secret-named-assignment` rule (measured, `npm run check` exit 70), which is right to look at that shape.

### Measured on this fix (Node `v24.20.0`, `node -v` checked; PostgreSQL 17.11 Homebrew; macOS Darwin 25.6; branch name `agent/claude/WP-0A-DB-00-batch-try-it`; private dir `<scratch>/a0-tryit-fix/`)

| Command | Where | Exit | Output |
|---|---|---|---|
| `npm run check` | working tree that became `3b64fd3` | 0 | tests 685, pass 685, fail 0 |
| `node scripts/commit-when-clean.mjs` -> `3b64fd3` | branch name | 0 | "clean: exit 0 — tests 685, pass 685, fail 0" |
| `node scripts/verify-branch-scope.mjs b0a3809 WP-0A-DB-00` | `3b64fd3` | 0 | "all 23 changed path(s) are declared, and every amendment explains one" |
| foundation-contract assertions, the guard's own rule (`stripNonCode`, `\bassert\.\w+\(`) | `3b64fd3` | -- | 1119 (1101 + 18); the floor moves 1101 -> 1119; 81 tests, unchanged |
| `try-it up` (no `--port`: it chose 55420), `demo`, `psql`, `down`, `--dir <P>/cluster` (the probes in the A1 R-F1 row ran on this one) | the working tree before the constant's rename and the test edits (try-it's behaviour as `3b64fd3`) | 0, 0, 0, 0 | 54 scripts applied, `db-migrate-clean: ok in 5646ms`, 21 fixture files, `[6/6] ready`; 13 of 13; the PGPASSFILE-prefixed line; "stopping the cluster on port 55420", "deleted"; nothing listens on 55420 |
| the same end to end again, `--dir <P>/cluster3`, with the three authentication probes and the password grep | `3b64fd3` committed, clean tree | 0, 0, 0, 0 | `ok in 5666ms`, 54; `pgpass` mode 600, 43 characters, no pwfile left; demo 13 of 13 with a wrong `PGPASSWORD` value inherited; no password exit 2, wrong one exit 2 `FATAL`, the file `SCRAM-SHA-256`; 0 hits for the password in the up, demo, psql and down output, `migrate-clean.log`, `postgres.log`; "deleted"; nothing listens on 55420 |
| a second cluster on 55420: `up`, `pg_ctl stop`, `demo`; the saved `postmaster.pid` put back, `demo`, `down` | `3b64fd3` committed | 0, 0, 1, 1, 0 | "is not running"; "does not answer on 127.0.0.1:55420"; "nothing answers ... nothing is signalled", "deleted" |
| round 1 on 127.0.0.1:5507 (fresh `initdb --locale=C -A trust -U postgres`, TCP only, `LC_ALL=C`, the CI shim first): `make db-migrate-clean`, `make db-rls-smoke` | the working tree before the rename (runners as `3b64fd3`) | 0, 0 | 54 applied, `ok in 4980ms`; 1087 isolation cases passed, 6 claims discharged, `ok in 1210ms` |
| round 2, re-initdb | same | 0, 0 | 54, `ok in 5026ms`; 1087, 6, `ok in 1223ms` |
| rounds 3 and 4, re-initdb each | `3b64fd3` committed | 0, 0; 0, 0 | 54, `ok in 5123ms`; 1087, 6, `ok in 1248ms`; then 54, `ok in 5148ms`; 1087, 6, `ok in 1244ms` |

The 5507 rounds use trust because they are the repository's measurement clusters, not try-it's (try-it refuses
5507). `run.mjs` and `rls-smoke.mjs` changed only in how `main()` is entered; both printed their own summaries.
No migration text or migration-reading rule changed, so no drift was appended and `140_audit.sql` was not touched.
Every cluster is stopped and removed; nothing listens on 5507 or 55420 (`lsof` exit 1 for each).

### Still owed (recorded on `open_blockers[196]`)

- `scripts/verify-clean-run.mjs:75` and `scripts/refresh-author-handoff.mjs:373` keep `file://${process.argv[1]}`:
  outside this package's ownership; the Integration Owner. The contract test names them as the only two left.
- (1) a make/npm entry point, a request to the Integration Owner; the password it waited on is done.
- C0-TIR-2's uncaught `ENOTDIR` and C0-TIR-3's `attached()` check: stated limits, owner A0.
- (3) Linux unmeasured; (8) the residual for a postmaster alive but not listening. Unchanged.

Private artefacts: `a0-tryit-fix/` in the run's scratchpad (`auth-probe.sh`, `printed-probe.sh`, `link-probe.sh`,
`stale-probe.sh`, `e2e.sh`, `live5507.sh`, `mutate.mjs`, each log).
