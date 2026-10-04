# A1 Security/Privacy re-check — the try-it auth/entry fix (WP-0A-DB-00)

- **Reviewer role:** independent Security/Privacy, run `/claude/a1_bastion`. Narrow re-check of the fix to my
  re-check finding R-F1 (MEDIUM) and R1 (LOW, shared with C0-TIR-1); my earlier files are
  `a1-batch-try-it-security-review-2026-10-03.md` and `a1-batch-try-it-recheck-2026-10-03.md`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-try-it`, head `45937c1e08182220e7ce3a4fc036929c96ba86e6`
  over code `3b64fd3` (evidence `1c7d638`, handoff `45937c1`), base `b0a3809` (main). Author `/claude/a0_atlas`.
  PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/178> (Draft). Local and `origin` branch heads both
  `45937c1` (measured).
- **Checked out** into my own branch `recheck2/a1-batch-try-it` at `45937c1`. The repository guards were run on
  the branch **name** (`git checkout --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-try-it`;
  `git branch --show-current` printed the name, `git rev-parse HEAD` printed `45937c1…`, not detached); I then
  returned to `recheck2/a1-batch-try-it` for this file's commit.
- **Date:** 2026-10-04.

## §0 What I am

I am a subagent of `/claude/a0_atlas`, the same run that authored this batch, and the same vendor and model
family. RFC-2026-024 records that shared origin, so this re-check is **not** the independent human sign-off a gate
requires. This file **records findings and advances no status**: it does not mark the package reviewed, approved,
tested or ready, and it does not merge. Each item is marked **measured** (I ran it) or **read** (I read it in the
tree or in a cited document).

## §1 Scope and method

**Read:** `CONTRIBUTING_AGENTS.md`; `git diff e71308f..3b64fd3` for `scripts/db/try-it.mjs`, `run.mjs`,
`rls-smoke.mjs`; the entry lines of `authz-proofs.mjs`, `generate-pinned-grants.mjs`,
`tests/db/identity/run-isolation.mjs`; `scripts/db/try-it.mjs` `up`, `attached`, `demo`, `psqlHelp`,
`downRefusal`, `down` in full; `scripts/db/psql-driver.mjs` `scrubbedEnv`, `runWithInput`, `invoke`;
`db/foundation/TRY-IT.md` lines 60-190.

**Measured** with Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`, `node -v` checked), PostgreSQL
17.11 (Homebrew, `/opt/homebrew/bin`), macOS Darwin 25.6. Every try-it directory, symlink and log was under my
private directory `<scratch>/a1-tryit2/` (`<scratch>` = this session's scratchpad under `/private/tmp/claude-501/…`);
the clusters used the ports try-it chose itself (55420, 55421). No `--port` was passed and 5432 was not touched.
Before the run `~/.pgpass` did not exist and no `PG*` variable was set, so nothing outside the tool could supply a
password. The password was read into a shell variable only to compare against outputs; it was never echoed, and
it appears nowhere in this file. Every cluster was removed with try-it's own `down`; afterwards nothing listened
on either port and `<scratch>/a1-tryit2/` was deleted.

## §2 Repository guards on the branch name (measured)

| Command | Result |
|---|---|
| `npm run verify` | exit 0, `clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0` |
| `npm run check:handoff` | exit 0, "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs b0a3809 WP-0A-DB-00` | exit 0, "all 23 changed path(s) are declared, and every amendment explains one" |
| `npm run verify:coverage-floor` | exit 0 |

## §3 Measured probes

All try-it invocations named the script through a symlink `<scratch>/a1-tryit2/links/try-it.mjs` →
`scripts/db/try-it.mjs` in this worktree (two also through the `/tmp/…` spelling of the scratch path, which is a
second symlink layer on macOS).

### Entry through a symlink (R1)

| # | Probe | Result |
|---|---|---|
| E1 | `node links/run.mjs verify`, no `DB_TEST_URL` | exit 1, prints its own refusal ("db-reset-test needs a Postgres test instance…", 2615 bytes) |
| E2 | `node links/rls-smoke.mjs`, no `DB_TEST_URL` | exit 1, "db-rls-smoke: DB_TEST_URL is not set…" |
| E3 | `node links/authz-proofs.mjs`, no `DB_TEST_URL` | exit 1, "db-authz-proofs: DB_TEST_URL is not set…" |
| E4 | `node links/run-isolation.mjs` | exit 1, "…run-isolation.mjs is a library, not a command." |
| E5 | `node links/generate-pinned-grants.mjs`, no `DB_TEST_URL` | exit 2, "generate-pinned-grants: DB_TEST_URL is not set…" (nothing written) |
| E6 | `node links/try-it.mjs` (no subcommand) | exit 2, usage line |
| E7 | `node /tmp/…/links/try-it.mjs` and `node /tmp/…/links/run.mjs` | exit 2, usage lines |
| E8 | `node links/try-it.mjs up/demo/psql/down` (below) | every subcommand ran `main()` and did its work |

Before the fix, every one of these exited 0 with no output (my R1, C0-TIR-1). Each runner now enters `main()`.

### The cluster and its password file (R-F1)

`up --dir <scratch>/a1-tryit2/c1`, through the symlink, with a decoy value (a fixed non-secret string) set in `PGPASSWORD` in the
environment: exit 0, `[6/6] ready`, 53 migrations, 66 tables, 209 policies, 2 workspaces; stderr empty.

| # | Check | Result |
|---|---|---|
| F1 | cluster directory mode | `drwx------` (700) |
| F2 | `pgpass` mode | `-rw-------` (600) |
| F3 | `initdb.pwfile` after `up` | absent |
| F4 | `pgpass` shape | one line, `127.0.0.1:55420:*:postgres:<43 chars>`, password matches `^[A-Za-z0-9_-]{43}$` |
| F5 | marker present, names this dir and port | yes (`thinkbizthai-try-it.json`, mode 644, holds no password) |
| F6 | `data/pg_hba.conf`, non-comment lines | six lines, all `scram-sha-256` (local, 127.0.0.1/32, ::1/128, and the three replication lines); `trust` appears 0 times |
| F7 | stored verifier | `pg_authid.rolpassword` for `postgres` starts `SCRAM-SHA-256$`; `password_encryption` = `scram-sha-256` |
| F8 | login roles with no password | none (empty result) |
| F9 | unix socket for the port in `/tmp` | none |
| F10 | files in the cluster dir that hold the password | `pgpass` only (`postgres.log`, `migrate-clean.log`, the marker: 0 hits) |

### Connections without the password (R-F1)

| # | Probe (`psql -X -w -h 127.0.0.1 -p 55420`) | Result |
|---|---|---|
| A1 | no `PGPASSWORD`, no `PGPASSFILE` | exit 2, `fe_sendauth: no password supplied` |
| A2 | `PGPASSFILE=/dev/null` | exit 2, refused (libpq: not a plain file; then no password) |
| A3 | a wrong value in `PGPASSWORD`, user `postgres` | exit 2, `FATAL:  password authentication failed for user "postgres"` |
| A4 | wrong password, user `authenticated` | exit 2, `FATAL:  password authentication failed for user "authenticated"` |
| A5 | `PGPASSFILE=<c1>/pgpass` | exit 0, `postgres` over `127.0.0.1` |
| P2 | the URL `psql` printed, without the file | exit 2, `fe_sendauth: no password supplied` |
| X1 | a second cluster `c2` (port 55421): c1's password against c2 | exit 2, `FATAL:  password authentication failed`; the two passwords differ |
| X2 | c1's `pgpass` against c2's port | exit 2, `fe_sendauth: no password supplied` (the line names port 55420 only) |

X1 measures what A0 recorded as read for C0-TIR-3: another try-it cluster refuses this directory's password.

### The printed lines (R-F1)

| # | Probe | Result |
|---|---|---|
| P0 | `up`'s line | `PGPASSFILE=<c1>/pgpass DB_TEST_URL=postgresql://postgres@127.0.0.1:55420/thinkbizthai_try` |
| P1 | `psql`'s line, run exactly as printed | exit 0, `thinkbizthai_try`; the line holds no password |
| P3 | `up`'s line, used as printed | exit 0, `thinkbizthai_try` |
| D1 | `demo`, decoy `PGPASSWORD` inherited | exit 0, "All 13 steps behaved as expected." (the inherited decoy was dropped: had it been used, every connection would have failed) |

### Error paths (R-F1, "errors included")

| # | Probe | Result |
|---|---|---|
| R1 | `up` on c1 again | exit 1, "already holds a try-it cluster on port 55420…" |
| R2 | `demo` with `pgpass` chmod 0644 | **did not refuse on its own**: a `psql` the driver started sat waiting (no tty, state `S`) for ~10 minutes until I killed it; then exit 1 with "does not answer … (WARNING: password file "<c1>/pgpass" has group or world access…)". See A1-TIF-1 |
| R3 | `down` with `pgpass` chmod 0644 | same: the `data_directory` query's `psql` waited ≥ 27 s until I killed it; then exit 1, "could not be asked which data directory it serves …; nothing is stopped and nothing is deleted." The cluster kept running (correct) |
| R4 | `psql` with a wrong password in `pgpass` (0600) | exit 1 promptly, "does not answer … FATAL:  password authentication failed for user "[redacted]"" |
| R5 | `down` with a wrong password in `pgpass` | exit 1 promptly, "could not be asked …; nothing is stopped and nothing is deleted." |
| R6 | `demo --dir <none>` | exit 1, "no try-it cluster in …" |
| G1 | every captured stdout/stderr of `up` ×2, `demo`, `psql`, `down` ×2, A/P/X/R probes, scanned for **either** cluster's password | 0 hits in every file |
| K1 | `down` c1 (decoy `PGPASSWORD`) and `down` c2 (through the `/tmp/…` spelling) | both exit 0, "stopping the cluster on port …", "deleted …"; both dirs gone; nothing listening on 55420 or 55421 |

## §4 Findings

**R-F1 (MEDIUM, mine) — CLOSED (measured).** The cluster no longer trusts local connections: `pg_hba.conf` is
`scram-sha-256` throughout (F6), the password is random and per cluster (F4, X1), it lives only in a 0600 file inside
the 0700, marker-guarded directory (F1-F3, F10), connections without it are refused (A1-A4, P2, X2), an inherited
`PGPASSWORD` is dropped (the `up` run, D1, K1), and no printed line, error included, carries it (G1). The process-argument
side (initdb gets `--pwfile=<path>`, not the password) is **read** (`try-it.mjs:358`).

**R1 / C0-TIR-1 (LOW) — CLOSED (measured).** All six runners enter `main()` when named through a symlink
(E1-E8).

**A1-TIF-1 (LOW, new, robustness; not a confidentiality or isolation defect).** When the password file is
present but unusable (mode loosened, as in R2/R3; by reading, also a deleted file or an unreadable `PGPASSFILE`),
libpq has no password, and the driver's `psql` is started without `-w`/`--no-password`, so it asks for one
instead of failing. Measured: with no terminal it waits indefinitely on its open stdin pipe (R2 ~10 min, R3 ≥ 27 s,
both ended only by my `kill`). Read (psql's documented behaviour, not measured on a terminal): on a terminal the
user sees `Password for user postgres:` in the middle of `demo`, `psql` or `down`. Nothing is leaked and nothing is
bypassed: whatever is typed is checked by scram, and `down` still stops and deletes nothing it cannot confirm.
It contradicts TRY-IT.md's "a connection without it is refused" for the tool's *own* connections only. The fix is
small (pass `--no-password` in try-it's connections, or check `pgpass` exists and is 0600 in `attached()`/`down`
and refuse in plain words); `psql-driver.mjs` is shared, so the place to fix it is the Author's to choose.
**Not a merge blocker.**

**A1-TIF-2 (INFO).** TRY-IT.md:182-183 says a program that cannot read the file is refused with
`password authentication failed for user "postgres"`. That is the message for a **wrong** password (A3); a client
with **no** password is refused client-side with `fe_sendauth: no password supplied` (A1). A0 already records
this under "not done"; the wording could name both.

**A1-TIF-3 (INFO, read).** `mkdir(dir, { recursive: true, mode: 0o700 })` sets 0700 only when `up` creates the
directory; an existing empty `--dir` keeps its own mode (`try-it.mjs:344`). The marker and `migrate-clean.log`
are 0644 (F5, measured). Neither holds the password, and `pgpass` is 0600 with `flag: 'wx'` regardless, so this
does not weaken R-F1.

**Carried, unchanged (read):** the dangling-symlink `ENOTDIR` (C0-TIR-2) and `attached()` not comparing
`data_directory` (C0-TIR-3) are recorded as limits in `open_blockers[196]`; X1 above gives C0-TIR-3's mitigation
a measurement. The two Integration-Owner files still comparing `file://${argv[1]}` are outside this package.

## §5 Stop-the-line verdict

**No stop-the-line.** No secret is exposed (G1, F10), no tenant isolation path changed, `down` still stops and
deletes nothing it cannot confirm (R3, R5), and the throwaway clusters now refuse password-less connections. From
the security/privacy side **nothing I found blocks the merge**; A1-TIF-1 is a LOW robustness item the Author may
fix now or record. This does not approve the PR: the Product Owner's merge still needs the other roles' re-checks,
CI green on `45937c1`, and the Owner's words in the disposition.

## §6 Limits

- One machine (macOS Darwin 25.6, Apple silicon), PostgreSQL 17.11, Node v24.20.0. No Linux run.
- The terminal prompt in A1-TIF-1 is read, not measured: I have no interactive terminal. The deleted-file and
  unreadable-`PGPASSFILE` variants are read, not measured.
- I did not watch process arguments while `initdb` ran; that it receives only the pwfile path is read.
- `make db-rls-smoke` with `up`'s printed `PGPASSFILE=… DB_TEST_URL=…` prefix (TRY-IT.md:86) was not run; that
  `scrubbedEnv` keeps `PGPASSFILE` is shown indirectly by `up` step 4/5 and `demo` connecting (measured).
- Another local account was not simulated; "another account is refused" rests on A1-A4 (same account, no or wrong
  password) plus the file being 0600 in a 0700 directory.
- Same-origin limit of §0 applies to every verdict here.
