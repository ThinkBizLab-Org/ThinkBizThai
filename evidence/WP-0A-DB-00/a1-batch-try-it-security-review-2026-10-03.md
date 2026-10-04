# A1 Security/Privacy review — the try-it batch (WP-0A-DB-00)

- **Reviewer role:** independent Security/Privacy, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-try-it`, head `cee158583ea3e99c20767aa309d0e5508791f635`
  over code `1298dbea003219603fa2fdb7368b2760d2ebcb41` (evidence `6e1e43a`, handoff `cee1585`), base `b0a3809`
  (main). Author `/claude/a0_atlas`. PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/178> (Draft).
- **Checked out** into my own branch `review/a1-batch-try-it` at `cee1585`. I measured `npm run verify`,
  `npm run check:handoff` and `scripts/verify-branch-scope.mjs` on the branch **name**
  `agent/claude/WP-0A-DB-00-batch-try-it` (checked out with `--ignore-other-worktrees`, `git branch --show-current`
  confirmed, not detached), then returned to `review/a1-batch-try-it` for this file's commit.
- **Date:** 2026-10-04 (the filename keeps the date the task set).

## §0 What I am

I am a subagent of `/claude/a0_atlas`, the same run that authored this batch — the same vendor and the same model
family. Under RFC-2026-024 that shared origin is on record; this review is **not** the independent human sign-off a
gate requires. This file **records findings and advances no status**. It does not mark the package reviewed,
approved, tested or ready, and it does not merge. Acceptance of a role run as the role's signature is the
Integration Owner's and the Product Owner's act, not mine. Every item below says whether it was **measured** (I ran
it) or **read** (I read it in the tree or a cited document).

## §1 Scope and method

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-try-it-plan-2026-10-03.md`; the disposition
`product-owner-disposition-2026-10-03-batch-try-it.md`; `git diff b0a3809..cee1585` (13 paths); `scripts/db/try-it.mjs`
in full; the `rls-smoke.mjs` lift; `db/foundation/TRY-IT.md`; `open_blockers[196]`; the handoff; the five commit
messages.

**Measured** (Node `v24.20.0` at `/Users/bank/.local/node-v24.20.0/bin` before every run — a PATH Node 26 exists and
was not used; PostgreSQL 17.11 from `/opt/homebrew/bin`; macOS Darwin 25.6):

- every `up` / `down` / `demo` / `psql` refusal path I could reach **without starting a try-it cluster**, on throwaway
  directories under my private dir `<scratch>/a1-try-it/` (`<scratch>` = this session's scratchpad);
- try-it's exact `initdb` arguments and `postgresql.conf` lines (`try-it.mjs:292-300`) replayed **on my assigned
  port 5501** in my private dir, to measure what the cluster binds and what trust gives a local process;
- `make db-migrate-clean` + `make db-rls-smoke` twice, re-initdb each round, 127.0.0.1:5501, TCP only
  (`unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, shim first.

**Why I did not run `try-it up` end to end myself.** try-it refuses 5501 by design (`RESERVED_PORTS`,
`try-it.mjs:49`; measured, U4 below), and my instructions allow only 5501. Picking a port in try-it's own range
55420-55479 would have meant touching a port that other role runs on this batch may be using. So `up`'s full path is
**read** plus the replay above; its refusals are **measured**. This is a limit (§6), not a finding.

## §2 Claims checked

| Claim (commits / plan / disposition / handoff / blocker) | Verdict | How |
|---|---|---|
| `npm run verify` clean at 685/685 on the branch name | **TRUE** — `clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0` | measured |
| `npm run check:handoff` clean on the branch name | **TRUE** — exit 0, "describes the branch: nothing substantive after its cited head" | measured |
| `node scripts/verify-branch-scope.mjs b0a3809 WP-0A-DB-00` exit 0 | **TRUE** — exit 0, "all 13 changed path(s) are declared, and every amendment explains one" (the plan's "10 paths" was at `1298dbe`; the evidence and handoff commits add 3) | measured |
| `verify-test-coverage-floor` exit 0 | **TRUE** — exit 0 | measured |
| foundation-contract assertions: main 1054 under a floor of 1044; draft +16; +4 → 1074 | **TRUE** — counted with the guard's own `stripNonCode` + `\bassert\.\w+\(` rule: `b0a3809` 1054, `4539d92` 1070, `1298dbe` 1074, head 1074 | measured |
| 33 blocker `line` fields in `audit-coverage-map.json` moved by one, nothing else changed | **TRUE** — 33 `"line"` changes, no other line in that file changed | measured (diff) |
| `rls-smoke.mjs`: loading sequence moved "unchanged" into `loadHelpersAndFixtures()` | **TRUE** — the diff changes only the function header, adds `return 0`, and a new `main()` that calls it | read (diff) |
| migrate-clean and rls-smoke pass twice on fresh clusters (1087 cases, 6 claims) | **TRUE** — both rounds: migrate-clean exit 0 (`ok in 5269ms`, `5516ms`); rls-smoke exit 0, "1087 isolation case(s) passed", "6 claim(s) discharged by execution" | measured, port 5501 |
| `up` refuses a dir inside the repository, a non-empty dir, an existing try-it dir, port 5432 | **TRUE** for the paths as given — U1, U2, U4, U9 below; **overstated** for a not-yet-existing path under a symlink into the repo (F3) | measured |
| "listens on 127.0.0.1 only, over TCP, with no unix socket" | **TRUE** — F1 replay: one LISTEN socket `127.0.0.1:5501`, no PGSQL unix socket, `/tmp/.s.PGSQL.5501` absent, connection to the Mac's LAN address `192.168.86.29:5501` refused | measured (replay of `try-it.mjs:292-300`) |
| "`down` deletes only a directory holding the marker `up` wrote, and only when nothing but what `up` made is in it" (`try-it.mjs:17-19`, commit `4539d92`) | **TRUE for deletion** — D1-D5: no marker, wrong `dir` field or an extra entry → nothing deleted; a symlinked `--dir` or a symlinked `data` → only the link is removed, the target survives. **Not true of "stop"**: see F2 | measured |
| "Port 5432 is never used" (`try-it.mjs:19`) | **TRUE for `up`, `demo`, `psql`** (they apply `tryItRefusal`, U4/U10); **not for `down`**, which never checks the marker's port (F2) | measured |
| No credentials or PII printed | **TRUE** — no password exists to print (trust auth); URLs are `postgresql://postgres@127.0.0.1:<port>/…`; the identities printed are the synthetic fixture UUIDs from `db/foundation/seeds/fixture-catalog.json`; a grep of the new files for e-mail addresses, `password=`, `user:pass@`, tokens and keys finds only the prose word "login token" | read + grep |
| `1298dbe` and `6e1e43a` plain commits because only the handoff guard was red (683/685) | **PLAUSIBLE** — consistent with the tree; the head now passes 685/685 and the handoff is last and alone | read |
| Message of `4539d92` "assertion floor 1014 -> 1030" stale on main, disclosed | **TRUE** — disclosed in the plan header, `1298dbe`'s message and the handoff; history not rewritten (correctly) | read |
| Disposition: Owner's words verbatim, A0 executed #176/#177 under the standing delegation and decided nothing, RFC-2026-025 §5 points still open | **TRUE as a record** — it quotes, reads, and disclaims as stated; it approves no RFC and no merge | read |
| `open_blockers[196]` cites "plan … §5" for the owed findings | **INACCURATE reference** — the plan's owed list is §6 ("Owed, and limits"); §5 is "Checks" (F5) | read |

## §3 Measured probes

### `up` (no cluster started; directories under `<scratch>/a1-try-it/`)

| # | Probe | Result |
|---|---|---|
| U1 | `up --dir <worktree>/a1probe` | exit 1, "is inside the repository"; nothing created |
| U2 | `up --dir <non-empty dir holding precious.txt>` | exit 1, "Nothing was touched"; the file's sha1 identical before and after |
| U3 | `up --dir <a regular file>` | exit 1 with an **uncaught** `ENOTDIR … scandir` stack trace (`try-it.mjs:275`); the file untouched (F4) |
| U4 | `up --port 5432`, `up --port 5501` | exit 1, "one this tool never touches"; no directory created |
| U5 | `up --dir <scratch>/x/../..` (traversal) | resolved to the scratchpad parent, exit 1 "exists and is not empty" |
| U6 | `up --dir ""` | exit 2, usage |
| U7 | `up --dir <symlink-to-worktree>/a1probe --port 5501` | **passed the repository check** and stopped only at the port check ("port 5501 is one this tool never touches"); with any free unreserved port it would go on to `mkdir` and `initdb` inside the worktree (F3) |
| U8 | `up --dir <symlink-to-worktree>` (exists) | exit 1, "inside the repository" (realpath works when the path exists) |
| U9 | `up --dir <dir with a forged valid marker naming port 5432>` | exit 1, "already holds a try-it cluster on port 5432", nothing touched |
| U10 | `demo` / `psql` on that forged marker | exit 1, "its port 5432 is one this tool never touches" |

### `down` (forged directories; the cluster in D7 is my own on 5501)

| # | Probe | Result |
|---|---|---|
| D1 | no marker | exit 1, nothing stopped or deleted |
| D2 | marker whose `dir` field names another path | exit 1, nothing deleted |
| D3 | valid marker + `notes.txt` | exit 1, "holds things `up` did not make (notes.txt)" |
| D4 | `--dir` is a symlink to a directory with a forged marker (dir = the link path) | exit 0, "deleted <link>": **only the symlink** removed; target and `data/canary` intact |
| D5 | valid marker, `data` → symlink to a canary directory outside | exit 0, the forged dir removed; **the canary directory and file intact** (Node's `rm` does not follow the link) |
| D6 | forged marker naming **port 5432**, `data/PG_VERSION` + a forged `data/postmaster.pid` holding the PID of an unrelated Node process | `down` printed "stopping the cluster on port 5432", ran `pg_ctl stop`, which **sent SIGINT to the unrelated process** (it recorded "got SIGINT" and exited); `down` then failed, nothing deleted (F2) |
| D7 | forged marker naming **port 5432**, `data` → symlink to **my running 5501 cluster** | exit 0: `down` **stopped my 5501 cluster** (port no longer listening, `pg_ctl status` 3) and removed the forged dir; the cluster's own data directory was left on disk (F2) |

### Trust on loopback (replay of `try-it.mjs:292-300` on 127.0.0.1:5501)

`pg_hba.conf` as `initdb --auth=trust` writes it: `local`, `host 127.0.0.1/32`, `host ::1/128` — all `trust`, for
`all` and for `replication`. Effective reach is the single TCP socket `127.0.0.1:5501` (no unix socket, no `::1`
listener, LAN address refused). A TCP connection with no password got `current_user = postgres`, `rolsuper = t`.
`copy (select …) to program 'id -un > <scratch>/…'` returned `COPY 1` and the file said `bank`: **any local process
that can open a loopback socket gets an OS command as the cluster's owner** while a cluster is up (F1).

## §4 Findings

**No stop-the-line finding. No finding that blocks the merge.** Grades: MEDIUM / LOW / INFO.

### F1 — MEDIUM — trust on loopback is a superuser, so it is OS command execution as the Owner, and TRY-IT.md undersells it
`scripts/db/try-it.mjs:292` (`--auth=trust`), `:297` (`listen_addresses = '127.0.0.1'`);
`db/foundation/TRY-IT.md:154-156`. **Measured** (§3, trust replay): no password, superuser, `COPY … TO PROGRAM`
ran `id -un` as `bank`. Reach is loopback only (measured), so nothing off the Mac can use it; on the Mac, it is
every process that can open a TCP socket to 127.0.0.1 — other macOS user accounts, and sandboxed apps that hold
only a network-client entitlement — which is a privilege boundary they do not otherwise cross. The data is
synthetic and the window is the time between `up` and `down`, which is why this is not stop-the-line. TRY-IT.md
says "any program on this Mac can connect to it without a password"; it does not say that the connection is the
superuser and can run commands as the Owner. **This answers `open_blockers[196]` (2): yes, a per-cluster
credential is wanted** before the tool becomes a make/npm target or something run routinely.
**Remedy (owner A0):** (a) now, in TRY-IT.md's Safety section: "as the database superuser, which can run commands as
you", and "run `down` when you are done"; (b) before a make/npm entry point: `initdb --auth=scram-sha-256
--pwfile=<0600 file in the cluster dir>` with a random password, children given `PGPASSFILE` (or the password via
the driver's env, never printed or put in a URL), and `psql` printing `PGPASSFILE=<dir>/… psql …` instead of a
trust URL. (A unix socket in the 0700 directory with `local … trust` and no TCP listener would also close it, but
macOS's 104-byte socket path limit under `$TMPDIR` makes it fragile.)

### F2 — LOW — `down` acts on a forged marker: it stops a cluster `up` did not make and signals an arbitrary PID, ignoring the reserved ports
`scripts/db/try-it.mjs:486-497` (no `tryItRefusal(urlFor(marker.port))`, no type check of `data`, no check that
`data/postmaster.pid` belongs to the marker's cluster); `readMarker` `:259-266` checks only `tool`, `dir`, an integer
`port`. **Measured:** D6 — a marker naming port 5432 plus a forged `postmaster.pid` made `down` SIGINT an unrelated
process; D7 — a marker naming port 5432 with `data` symlinked to a live cluster (mine, on 5501, itself a reserved
port) made `down` stop that cluster and report success. Deletion stayed inside the given directory in every probe
(D4, D5: links removed, targets intact), so this is not an irreversible-deletion incident. Precondition: someone
able to write the try-it directory; the default (`$TMPDIR/thinkbizthai-try-it`, per-user 0700 on macOS) limits that
to the Owner's own processes, but on Linux `os.tmpdir()` is a shared `/tmp`, where another account could pre-plant
the directory (`open_blockers[196]` (3) leaves Linux unmeasured). **Remedy (owner A0):** in `down`, refuse unless
`tryItRefusal(urlFor(marker.port))` is null; `lstat` every owned entry and refuse a symlink; before `pg_ctl stop`,
require `data/postmaster.pid` line 2 to realpath to `<dir>/data` and line 4 to equal `marker.port`; optionally record
the data directory's inode or the postmaster PID in the marker at `up`. A static test can hold each refusal.

### F3 — LOW — the repository check is bypassed by a not-yet-existing path under a symlink into the repository
`scripts/db/try-it.mjs:252-257` (`insideRepo` falls back to the path "as given" when `realpathSync` fails) and `:270`;
`db/foundation/TRY-IT.md:152` ("never creates its directory inside the repository"). **Measured:** U7 passed the
check and stopped only at my reserved port; nothing was created. With a free port, `up` would `mkdir -p` and
`initdb` inside the worktree; `down` would then refuse to delete it (it realpaths an existing path, `:489`),
leaving a running cluster in the tree. Self-inflicted (the person must pass such a path), hence LOW.
**Remedy (owner A0):** realpath the nearest existing ancestor and append the remainder, or `mkdir` first and
re-check `realpathSync(dir)` before writing the marker; add the symlinked-parent case to the static refusals.

### F4 — INFO — `up` onto a regular file crashes with an uncaught stack trace
`scripts/db/try-it.mjs:275` (`readdirSync` on a non-directory). **Measured** U3: exit 1, `ENOTDIR` trace, file
untouched. Safe, but not the plain-English refusal the tool gives elsewhere. **Remedy:** `statSync(dir).isDirectory()`
before `readdirSync`, with a `try-it:` message.

### F5 — INFO — `open_blockers[196]` cites the wrong plan section
`work-packages/WP-0A-DB-00.json:451` says "(plan a0-batch-try-it-plan-2026-10-03.md §5; …)"; the owed list is the
plan's §6. **Remedy:** §5 → §6 at the next touch of the manifest (it moves the audit-coverage line map only if a line
count changes; this edit does not).

### Observations (not findings)
- `up` writes the marker before `initdb` (`:288`), so a half-made cluster is removable, and the printed `down` is
  the right one (read; A0 measured it, plan §3).
- `runTool` passes the whole environment to `initdb`, `pg_ctl` and `run.mjs`; the postmaster's port and
  listen address come from `postgresql.conf`, which outranks `PGPORT`, so an inherited `PGPORT`/`PGHOST` does not
  move the server (read). `PATH` decides which `initdb`/`pg_ctl` run, as TRY-IT.md says.
- `demo` runs every step in a rolled-back transaction through the suite's own `runCases`; its output is synthetic
  fixture data only (read; the plan's transcript agrees).

## §5 Verdict

**Stop-the-line: NO. Blocks merge: NO** (on the Security/Privacy dimension). `up` never touched an existing
non-empty directory, a non-loopback address, port 5432 or the repository by any path I could give it except F3's
symlinked parent; the cluster it configures binds 127.0.0.1 only, over TCP, with no unix socket (measured on the
replay); `down` never deleted outside the directory it was given, symlinks included. What is wrong is narrower: trust
auth makes a running cluster a local superuser-to-shell bridge (F1, MEDIUM — fix the guide's wording now and add a
per-cluster credential before the tool becomes routine), and `down` believes a forged marker enough to stop or
signal something it did not start (F2, LOW). The packaging, test-count, floor, branch-scope and handoff claims are
true as measured, and the disposition is an accurate record that decides nothing. The merge still needs the C0
and Q0 role runs and the Integration Owner / Product Owner acts per batch 127 §6 and RFC-2026-002; this review
grants none of them.

## §6 Limits of this review

- I did not run `try-it up`/`demo`/`down` against a cluster `up` made: try-it refuses my only permitted port (5501),
  and I did not take a port from its 55420-55479 range. The bind/trust properties are measured on a replay of the
  exact `initdb` arguments and `postgresql.conf` lines; `up`'s shim, migrate and fixture steps are covered by the
  equivalent `make` rounds and by A0's transcript (read), not by my run of `up`.
- macOS only. On Linux (`os.tmpdir()` = shared `/tmp`) F2's precondition is weaker; unmeasured.
- I did not measure the other runners' `file://${argv[1]}` entry check (`open_blockers[196]` (5)); read only.
- No drift was appended to `db/foundation/migrations/140_audit.sql` (no migration text or migration-reading rule
  changed); it was never touched.
- Same-family subagent of the Author (RFC-2026-024): a recorded review, not the independent human sign-off a gate
  needs.

## §7 Cleanup

Every cluster I started (the 5501 replay, rounds 1 and 2) was stopped (`pg_ctl stop` exit 0, or stopped by `down`
in D7); 5501 is not listening at the end. Their data directories and the forged probe directories under
`<scratch>/a1-try-it/` were removed. The unrelated process D6 signalled was my own probe process. Port 5432, 5499 and
every other run's port were never connected to or bound.
