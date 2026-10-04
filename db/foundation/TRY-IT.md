# Try it: the database foundation on your own machine

This guide gets you from a clone of the repository to a running database you can poke at, in about a
minute, and shows you the row level security rules working. It is for one person on a laptop. It changes
nothing outside one temporary directory, and `down` deletes that directory.

Everything here is a **local, throwaway copy built from what CI builds its test database from**: the same
shim, the same migrations, the same synthetic fixtures. (Not byte for byte the same server: this one runs with
locale C and with durability settings off, since it is thrown away.) Nothing is real data, and nothing connects
to Supabase or any other service.

## Quick start (copy and paste)

On the Owner's Mac (Node 24.20.0 at `/Users/bank/.local/node-v24.20.0/bin`, Homebrew PostgreSQL 17), paste these
one at a time into Terminal. The first line goes to the repository; the rest are the whole tour.

```sh
cd /Users/bank/ThinkBizThai
/Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs up
/Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs demo
/Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs psql
/Users/bank/.local/node-v24.20.0/bin/node scripts/db/try-it.mjs down
```

- `up` takes about ten seconds and ends with `[6/6] ready` and the next commands to paste.
- `demo` ends with `All 13 steps behaved as expected.` when everything held.
- `psql` only prints a line to paste (and five lines to paste after it); it runs nothing itself.
- `down` stops the database and deletes its directory. Run it when you are done.

The full path to `node` matters: this Mac also has a newer Node on its `PATH` (`node -v` may print `v26...`).
The tool still runs on it, but prints a note, and the repository's measurements are on 24.20.0. Every
"next" command the tool prints is spelled with the full path of the Node that is running it, so you can
paste those too, from any directory. If `up` stops part way, it prints the `down` command that removes what it
made.

On another machine, replace `/Users/bank/ThinkBizThai` with your clone and the Node path with your own
Node 24.20.0; the rest of this guide explains each step.

## Prerequisites

- **PostgreSQL 17** with `initdb`, `pg_ctl` and `psql` on your `PATH`. On macOS with Homebrew:
  `brew install postgresql@17`, then make sure `which initdb` prints a path. If it prints nothing (Homebrew's
  versioned formulae are usually not linked), run `brew link postgresql@17`, or put
  `$(brew --prefix postgresql@17)/bin` first on your `PATH`. Your own Postgres does not need to be running,
  and if it is, it is not touched: this tool never uses port 5432.
- **Node.js 24.20.0** (the repository's pinned version). If you keep it outside your `PATH`, put it first
  for this shell, for example `export PATH=/Users/<you>/.local/node-v24.20.0/bin:$PATH`.
- Run the four commands below from the repository root (the commands the tool prints name the script by its
  full path, so those run from anywhere). No `npm install` is needed: the tool uses Node built-ins only.
- There is no `make` target or `npm run` script for this yet: both live in protected root configuration, and
  adding one is owed as a request to the Integration Owner. The `node scripts/db/try-it.mjs` lines are the tool.

## The four commands

```sh
node scripts/db/try-it.mjs up      # make the cluster, migrate it, load the fixtures (about 10 seconds)
node scripts/db/try-it.mjs demo    # the guided tour; exits non-zero if anything is not as expected
node scripts/db/try-it.mjs psql    # prints the command to connect yourself, and a cheat-sheet
node scripts/db/try-it.mjs down    # stop the cluster and delete its directory
```

`up` creates the cluster in a directory under your OS temp directory (it prints the path) and picks a free
port between 55420 and 55479. To choose yourself, pass `--dir <path>` (a new or empty directory outside the
repository) and/or `--port <n>`; pass the same `--dir` to `demo`, `psql` and `down` afterwards.

What `up` does, in order:

1. Draw a random password for this cluster and write it to `pgpass` in the cluster directory (readable by you
   alone, mode 0600), then `initdb` a new empty cluster (locale C, superuser `postgres`) that asks for that
   password on every connection (`scram-sha-256`; nothing is trusted).
2. Start it listening on `127.0.0.1` only, over TCP, with no unix socket.
3. Create the database `thinkbizthai_try` and apply `db/foundation/ci/supabase-shim.sql`, the stand-in
   for the `auth` schema and roles Supabase would provide, exactly as CI does.
4. Run `node scripts/db/run.mjs migrate-clean`, the repository's own target: the prerequisite, every
   migration in order, and every check that target makes after migrating. Its full output is kept in
   `migrate-clean.log` in the cluster directory. `up` goes on only when that target printed
   `db-migrate-clean: ok` and applied its scripts; an exit code of 0 alone is not taken as success.
5. Load the test-identity helpers and the fixture files exactly as `make db-rls-smoke` does.
6. Print the connection settings (`PGPASSFILE=<dir>/pgpass DB_TEST_URL=...`: the file that holds the password,
   and a URL that holds none), a short paragraph on what you now have, and the next three commands, ready to
   paste. The password itself is never printed.

The database is already migrated and loaded, so do not point `make db-migrate-clean` at it: it expects an
empty database and fails on an already-migrated one (`role "app_worker" already exists`), not on a policy.
`make db-rls-smoke` loads its helpers and fixtures again and passes on it, so that one is safe to run against
it, with both settings `up` printed in front of it (`PGPASSFILE=... DB_TEST_URL=... make db-rls-smoke`).

## What the demo shows, and how to read it

The fixtures hold two tenants: **workspace A** (with businesses A1 to A4, an owner, an editor scoped to
business A1, an approver, a viewer, and more) and **workspace B** (one business, one owner). The demo becomes
some of these people in turn and runs one statement as each, the way the app would on their behalf.

Every step prints the same lines:

```
-- <what is being tried>
   as:       <which fixture user, in plain words, and their id>
   runs:     <the exact SQL>
   expected: <what should happen>
   got:      <what the database actually returned: rows, 0 rows, or the error with its code>
   proves:   <why this matters>
   result:   as expected | NOT AS EXPECTED -- <what differed>
```

The six parts of the tour:

1. **What each person can see.** Counts of workspaces, businesses and content items as the owner of A, the
   editor, the viewer and the owner of B. The database holds 2 workspaces, 5 businesses and 5 content
   items in all; nobody sees all of them. The editor, scoped to one business, sees only that one.
2. **One tenant cannot read the other.** Owner A asks for workspace B and business B1 *by their exact ids*
   and gets 0 rows. A control step first shows owner A *can* read its own workspace, so the 0 is not
   just an empty table.
3. **A viewer cannot write.** The viewer's attempt to create a content item is refused with
   `ERROR 42501: new row violates row-level security policy`.
4. **Nobody moves a workspace through its lifecycle by hand** (batch 170). Even the owner's
   `lifecycle_state = 'closing'` is refused (`permission denied for table workspaces`), while renaming the
   workspace still works.
5. **Nobody writes a row in someone else's name** (batch 127). Owner A creating a content item with the
   editor's id in `created_by` is refused.
6. **A settled approval cannot be changed** (batches 125 and 126). The approver, and then the owner, try
   to decide an already-approved request again: the update changes 0 rows, which is the proof, and a second
   read shows the request as it stands (it says `approved`, the value the refused update would also have
   written, so the 0 rows is what tells the two apart).

The refusals are cases taken from the isolation suite CI runs (`tests/db/identity/isolation-cases.mjs`),
run through the same runner, so the demo can never disagree with the suite about what they mean. Every step
runs in its own transaction and is rolled back, so you can run the demo as often as you like.

If the last line reads `All 13 steps behaved as expected.`, everything held and the command exits 0. If any
step prints `NOT AS EXPECTED`, the command ends with `DEMO FAILED`, lists the steps, and exits 1.

## Poking at it yourself

`node scripts/db/try-it.mjs psql` prints a
`PGPASSFILE=<dir>/pgpass psql "postgresql://postgres@127.0.0.1:<port>/thinkbizthai_try"` line to copy (psql reads
the password from that file; the line does not contain it), and a cheat-sheet. Connected that way you are the superuser, which row level security does not
apply to, so you see every row of both tenants. To see what one person sees, become them inside a
transaction:

```sql
begin;
select private.as_user('<a fixture user id from the cheat-sheet>');
select current_user, current_setting('request.jwt.claims', true);
select id, name from app.workspaces;
rollback;
```

After `rollback;` you are the superuser again and nothing you did is kept.

## Cleaning up

```sh
node scripts/db/try-it.mjs down
```

This stops the cluster and deletes its directory. If you passed `--dir` to `up`, pass the same `--dir` here.

- It does nothing at all to a directory that has no marker written by `up`, or whose marker names a port this
  tool never uses, or that holds a symlink where `up` made a file or a directory.
- It stops a server only when the server's own `postmaster.pid` names this directory's data and the marker's
  port, and the server answering on that port says it serves this directory. If nothing answers (the machine
  restarted, say), nothing is signalled.
- If the directory holds something `up` did not put there, it stops the cluster, deletes nothing, and says
  which names to move out before running `down` again.

If the machine restarted while a cluster was up, `demo` and `psql` say the cluster is not running; run `down`,
then `up`.

## Safety

- The tool only ever connects to `127.0.0.1` on the port it chose; every URL passes the repository's
  test-host guard (`testHostRefusal` in `scripts/db/psql-driver.mjs`), narrowed further to loopback names.
- It never uses port 5432, never uses an existing data directory, and never creates its directory inside the
  repository (a path that does not exist yet is checked through its nearest existing parent, so a symlink
  that resolves into the repository does not get round it; a dangling one is not resolved by the check, and
  creating the directory through it then fails before anything is written).
- **Every connection needs the cluster's password.** `up` draws a new random one (32 random bytes) for each
  cluster, and `initdb` stores only its `scram-sha-256` verifier; nothing is trusted. The password itself is kept
  in one file, `pgpass` in the cluster directory, readable by you alone (mode 0600). The tool and the commands it
  prints find it through `PGPASSFILE`; it is never printed, never put in a URL or on a command line, and `down`
  deletes it with the cluster. A program or another account on this Mac that cannot read that file is refused
  (`password authentication failed for user "postgres"`). Nothing outside the Mac can reach the cluster at all
  (it listens on `127.0.0.1` only).
- What the password does not cover: a program running **as you** can read your files, that one included, and the
  database superuser can run operating-system commands as you (for example through `COPY ... TO PROGRAM`). So
  the data being synthetic does not make the cluster harmless to leave about: **run `down` as soon as you are
  done**.

## What this does NOT show

- **No app or user interface.** There is no screen to click; this is the database alone.
- **No service worker path.** Background jobs run as a separate `app_worker` role, which the demo does not
  exercise; the full suite (`make db-rls-smoke`) does.
- **No provisioned instance.** This is a bare PostgreSQL with a shim standing in for Supabase's `auth` schema
  and roles. It shows that *our* policies behave as written; it says nothing about how a real Supabase
  project is configured (see the header of `db/foundation/ci/supabase-shim.sql`).
- **Not the whole suite.** The demo is a tour of 13 representative checks over the synthetic fixtures. The
  full isolation suite, over a thousand cases (1087 on 2026-10-04) plus the authorization proofs (6 claims),
  is `make db-rls-smoke`, which CI runs on every pull request against a fresh database.
