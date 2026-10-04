# A1 Security/Privacy re-check — the try-it batch's review round (WP-0A-DB-00)

- **Reviewer role:** independent Security/Privacy, run `/claude/a1_bastion`. Narrow re-check of the review-round
  corrections; my earlier report is `a1-batch-try-it-security-review-2026-10-03.md` (reviewed head `cee1585`).
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-try-it`, head `20623f230524a6a58fec473d291a6fad1ac166dd`
  over code `dd11a35` (evidence `952095f`, handoff `20623f2`), base `b0a3809` (main). Author `/claude/a0_atlas`.
  PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/178> (Draft). Local and `origin` branch heads both
  `20623f2` (measured).
- **Checked out** into my own branch `recheck/a1-batch-try-it` at `20623f2`. `npm run verify`,
  `npm run check:handoff` and `scripts/verify-branch-scope.mjs` were run on the branch **name**
  `agent/claude/WP-0A-DB-00-batch-try-it` (checked out with `--ignore-other-worktrees`; `git branch --show-current`
  printed the name and `git rev-parse HEAD` printed `20623f2`, not detached), then I returned to
  `recheck/a1-batch-try-it` for this file's commit.
- **Date:** 2026-10-04 (the filename keeps the date the task set).

## §0 What I am

I am a subagent of `/claude/a0_atlas`, the same run that authored this batch, and the same vendor and model
family. RFC-2026-024 records that shared origin, so this re-check is **not** the independent human sign-off a gate
requires. This file **records findings and advances no status**. It does not mark the package reviewed, approved,
tested or ready, and it does not merge. Accepting a role run as the role's signature is the Integration Owner's
and the Product Owner's act, not mine. Each item below is marked **measured** (I ran it) or **read** (I read it
in the tree or a cited document).

## §1 Scope and method

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-try-it-plan-2026-10-03.md` (the new "Review round
(2026-10-04)" section in full); the disposition `product-owner-disposition-2026-10-03-batch-try-it.md` (it is
unchanged since `cee1585`); `git diff b0a3809..20623f2`, with the round itself read as `git diff cee1585..20623f2`
(15 paths); `scripts/db/try-it.mjs` changes in full; the four runners' entry lines; `db/foundation/TRY-IT.md`
changes; the text appended to `open_blockers[196]` and to the `amends_without_owning` rationale; the handoff's
fields; and the six commit messages since `cee1585`.

**Measured** (Node `v24.20.0` at `/Users/bank/.local/node-v24.20.0/bin`, checked with `node -v` before every
measured run (a PATH Node 26 exists and was not used); PostgreSQL 17.11 from `/opt/homebrew/bin`; macOS Darwin
25.6; everything under my private directory `<scratch>/a1-try-itr2/`):

- the guards on the branch name (§2);
- every `up` refusal I had found or could add, **without starting a try-it cluster** (§3 U-rows);
- `down` on 15 forged directories, with a live sacrificial process whose PID the forged `postmaster.pid` files
  name, and three more probes against my own live cluster on 5501 (§3 D-rows);
- `make db-migrate-clean` + `make db-rls-smoke` twice on 127.0.0.1:5501, re-initdb each round, TCP only
  (`unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, shim first. The entry
  line of `run.mjs` and `rls-smoke.mjs` changed, and the DB layer runs both, so these rounds are the check that
  `main()` is still entered;
- the runners' new `pathToFileURL` entry check, called through a symlinked path (§3 E-rows);
- the foundation-contract assertion count, using the guard's own `stripNonCode` and the `\bassert\.\w+\(` rule.

**Why I did not run `try-it up` end to end.** try-it refuses 5501 (`RESERVED_PORTS`, `try-it.mjs:53`; D6b and
D22 below), and my brief allows only 5501. I did not take a port from try-it's 55420-55479 range. The data
directory comparison in `down` (`try-it.mjs:566-579`) needs a server on a port try-it accepts, so its "match →
stop" and "mismatch → refuse" branches are **read**. Its "connection refused → signal nothing" branch is
**measured** (D16, D21).

## §2 Claims checked

| Claim (commits / plan / blocker / handoff) | Verdict | How |
|---|---|---|
| `npm run verify` clean at 685/685 on the branch name | **TRUE**: `clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0` | measured |
| `npm run check:handoff` clean | **TRUE**: exit 0, "describes the branch: nothing substantive after its cited head" (cited head `952095f`; `20623f2` is the handoff alone) | measured |
| `node scripts/verify-branch-scope.mjs b0a3809 WP-0A-DB-00` exit 0 | **TRUE**: exit 0, "all 19 changed path(s) are declared, and every amendment explains one" (the plan's "16" was counted before the evidence and handoff commits) | measured |
| `verify-test-coverage-floor` exit 0 | **TRUE**: exit 0 | measured |
| 27 assertions added to the existing test, still 81 tests in the file, floor 1074 → 1101 | **TRUE**: the guard's rule gives 1074 at `cee1585` and 1101 at head; the file declares 81 tests at both | measured |
| The three reviews cherry-picked with `-x`, unchanged (C0 `cdafe99`→`849890f`, A1 `a7f6c97`→`739ea82`, Q0 `4350d39`→`dfb524a`) | **TRUE**: `git diff` between each pair, on the review file, is empty; each message carries `(cherry picked from commit …)` | measured |
| A1 F1 (a): TRY-IT.md Safety now says that trust means the superuser, that the superuser can run OS commands as you, "run `down` as soon as you are done", and that a password is owed | **TRUE**: `db/foundation/TRY-IT.md:174-178` | read |
| A1 F1 (b): scram-sha-256 is recorded as owed and has not been done | **TRUE as a record**: `open_blockers[196]` (2) appended text and the plan's "Still owed". `initdb --auth=trust` is unchanged (`try-it.mjs:329`) | read |
| A1 F2: `down` refuses a reserved marker port, any symlinked entry, and a `postmaster.pid` naming another data directory or port, and signals nothing on "connection refused" | **TRUE**: D6, D6b, D8-D11, D13, D14, D16, D20-D22; the sacrificial process got **no** signal, and my live 5501 cluster was still running at the end | measured |
| A1 F2: before `pg_ctl stop`, the server on the port must report this data directory | **TRUE as written** (`try-it.mjs:566-579`); not reachable on my only port | read |
| A1 F3: the repository check resolves a not-yet-existing path through its nearest existing ancestor; `up` refuses a symlinked `--dir` and checks again after `mkdir` | **TRUE**: U7a, U7b (one and three missing levels under a link into the worktree) now "is inside the repository", nothing created; U11, U12 (link to an empty dir, dangling link) refused. The re-check after `mkdir` (`:323`) is read | measured / read |
| A1 F4: `up` onto a regular file gives a plain refusal | **TRUE**: U3, exit 1, "exists and is not a directory", file intact | measured |
| A1 F5: the §5 → §6 citation is corrected by appending to `[196]` | **TRUE**: the appended text says so; the original text is not rewritten | read |
| The four runners now exit 1 with their own refusal in a path with a space (the `[196]` (5) fix) | **Not re-measured** (the plan records it, and C0/Q0 measured the cause). Their entry line is now `pathToFileURL(argv[1]).href` (read), and `main()` ran in both of my live rounds (each target printed its own `ok` summary). For a **symlinked** script path the fix does not hold: see R1 | read / measured |
| migrate-clean and rls-smoke pass twice on fresh clusters (54 scripts, 1087 cases, 6 claims) | **TRUE**: round 1: migrate-clean exit 0, 54 `applied` lines, `ok in 5131ms`; rls-smoke exit 0, "1087 isolation case(s) passed", "6 claim(s) discharged by execution", `ok in 1252ms`. Round 2: `ok in 5426ms`, 54, 1087, 6, `ok in 1292ms` | measured, port 5501 |
| Plan "Review round" finding → change → measured table | **TRUE** for every row I could check; its D-probe results agree with mine | read + measured |
| `[196]` (7) and (8) appended as stated limits; (2) recorded as answered; (5) as fixed for the four runners | **TRUE as a record** (the rule against rewriting is respected) | read |
| No credentials or PII printed | **TRUE**: no password exists (trust). Messages print paths and `postgresql://postgres@127.0.0.1:<port>/…`. The default-dir message prints the per-user `$TMPDIR` path (`/var/folders/…/T/…`), which names no person | measured (probe output) + read |
| Handoff: head `952095f`, handoff last and alone | **TRUE**: `head_revision_or_patch_checksum` `952095f…`; `20623f2` changes only the handoff | measured |

## §3 Measured probes

### `up`. No cluster was started, and every probe that could otherwise reach `mkdir` also passed `--port 5501`, which try-it refuses after the directory checks and before `mkdir`.

| # | Probe | Result |
|---|---|---|
| U7a | `up --dir <link-to-worktree>/a1probe --port 5501` | exit 1, "is inside the repository"; `<worktree>/a1probe` does not exist (at `cee1585` this passed the check, F3) |
| U7b | `up --dir <link-to-worktree>/x/y/z --port 5501` | exit 1, "is inside the repository"; `<worktree>/x` does not exist |
| U7c | `up --dir <dir>/outer/deep/../repolink/q`, where `deep` is a link to the worktree | resolved lexically (as `parseArgs` does, `:227`) to a path outside the worktree; it reached the port check. `mkdir` and every later step use the same lexical path, so the check and the write agree |
| U3 | `up --dir <regular file>` | exit 1, "exists and is not a directory. Nothing was touched."; file intact (was an uncaught `ENOTDIR`) |
| U11 | `up --dir <link to an empty dir>` | exit 1, "is a symlink … Nothing was touched."; target still empty |
| U12 | `up --dir <dangling link>` | exit 1, "is a symlink"; the link target was not created |
| U1 | `up --dir <worktree>/a1probe` | exit 1, "inside the repository" |
| U4 | `up --port 5432` | exit 1, "never touches"; no directory created |
| U2 | `up --dir <non-empty dir>` | exit 1, "Nothing was touched"; `precious.txt` intact |

### `down`. Forged directories under `<scratch>/a1-try-itr2/down/`. A sacrificial Node process traps SIGINT, SIGTERM and SIGQUIT into a log, and every forged `postmaster.pid` line 1 holds its PID. Port 61501 had no listener (checked with `lsof`) and is used only as a refused connection.

| # | Probe | Result |
|---|---|---|
| D1 | no marker | exit 1, nothing stopped or deleted |
| D6 | marker port **5432** + forged pid (the victim) | exit 1, "its port 5432 is one this tool never touches; nothing is stopped and nothing is deleted" (at `cee1585` this SIGINTed the victim) |
| D6b | marker port **5501** + forged pid | exit 1, the same refusal |
| D8 | pid line 2 names another existing data dir | exit 1, "names another data directory" |
| D9 | pid line 4 names 61502, marker 61501 | exit 1, "names port 61502, and the marker port 61501" |
| D10 | `data` → link to a canary dir | exit 1, "data … is a symlink"; canary intact |
| D11 | `data/postmaster.pid` is a link | exit 1, "is a symlink" |
| D13 | `--dir` is a link to a forged dir | exit 1, "is a symlink"; the link and the target both remain |
| D14 | `postgres.log` → link to a canary file | exit 1, "is a symlink"; canary intact |
| D12 | valid marker + `notes.txt`, no pid file | exit 1, "holds things `up` did not make (notes.txt) … nothing is deleted"; all kept |
| D15 | consistent forged pid (victim), port 61501, + `notes.txt` | "nothing answers on 127.0.0.1:61501 … nothing is signalled", then exit 1 over `notes.txt`; all kept |
| D16 | consistent forged pid (victim), port 61501, only owned names | "nothing is signalled", exit 0, the forged dir deleted (only that dir; see the observations) |
| — | `--dir <d12>/../d9` | resolved to `d9`, exit 1, its own refusal |
| — | after all of the above | the victim was still alive, and its signal log **does not exist** (no signal received) |

### `down` against my live 5501 cluster (postmaster PID 85185, its `postmaster.pid` naming `<P>/pg1` and 5501)

| # | Probe | Result |
|---|---|---|
| D20 | the live cluster's own `postmaster.pid` copied into a forged dir with marker 61501 | exit 1, "names another data directory (<P>/pg1)" |
| D21 | forged dir, consistent pid file whose line 1 is the **live postmaster's PID 85185**, port 61501 | "nothing answers … nothing is signalled", exit 0, forged dir deleted |
| D22 | marker naming 5501 + the live pid file | exit 1, "its port 5501 is one this tool never touches" |
| — | afterwards | `pg_ctl status`: "server is running (PID: 85185)"; `select` answered (this was D7's shape at `cee1585`, where `down` stopped my cluster) |

### The runners' entry check (no `DB_TEST_URL`)

| # | Probe | Result |
|---|---|---|
| E1 | `node scripts/db/rls-smoke.mjs` and `node scripts/db/run.mjs migrate-clean` from the worktree | exit 1, each with its own "needs a test instance" refusal (`main()` ran) |
| E2 | the same two scripts via `node <scratch>/…/repolink/scripts/db/<script>` (an absolute path through a symlink to the worktree) | **exit 0, 0 bytes**: `main()` skipped |
| E3 | `cd <link-to-worktree>` then `node scripts/db/rls-smoke.mjs`, and `make db-rls-smoke` | exit 1 / exit 2 with the refusal: `getcwd` gives the physical path, so a relative path matches |
| E4 | `node <link-to-worktree>/scripts/db/try-it.mjs down --dir <no marker>` | **exit 0, 0 bytes**; the same through the real path: exit 1, "holds no marker" |

## §4 Disposition of my earlier findings

| Earlier finding | Now |
|---|---|
| F1 MEDIUM: trust on loopback is a superuser, so OS command execution as the Owner | **(a) closed**: the guide now says so (read). **(b) open, owed and recorded**: still `--auth=trust` (`try-it.mjs:329`); `[196]` (2) names scram-sha-256, a 0600 file and PGPASSFILE before any make/npm entry point. Carried as R-F1 below |
| F2 LOW: `down` acts on a forged marker | **closed**: measured (D6, D6b, D8-D11, D13-D16, D20-D22) |
| F3 LOW: repository check bypassed by a symlinked parent | **closed**: measured (U7a, U7b) |
| F4 INFO: stack trace on a regular file | **closed**: measured (U3) |
| F5 INFO: `[196]` cites §5 for §6 | **closed by append**: read |

## §5 Findings (this round)

**No stop-the-line finding. No finding that blocks the merge.** Grades: MEDIUM / LOW / INFO.

### R-F1: MEDIUM, carried, not new: the per-cluster credential is still owed
`scripts/db/try-it.mjs:329` (`--auth=trust`); `db/foundation/TRY-IT.md:174-178`; `open_blockers[196]` (2).
While a cluster is up, any local process that can reach 127.0.0.1 still gets superuser and, through
`COPY … TO PROGRAM`, OS commands as the Owner (I measured this in the earlier round; the `initdb` arguments and
`postgresql.conf` lines have not changed since, read). The guide now states this risk accurately and tells the
reader to run `down` promptly. The data is synthetic, the listener is loopback only, and the exposure lasts only
while a cluster is up. That is why this is neither stop-the-line nor a merge blocker. **Remedy (owner A0):** as
recorded: `initdb --auth=scram-sha-256 --pwfile=<0600 file in the cluster dir>`, children given `PGPASSFILE`,
`psql` printing a `PGPASSFILE=…`-prefixed line. Do this **before** any make/npm entry point or routine use, and
measure it with a live `up` on a port in 55420-55479.

### R1: INFO, new: the `pathToFileURL(argv[1])` entry check still skips `main()` when the script is named through a symlink
`scripts/db/run.mjs:4010`, `scripts/db/rls-smoke.mjs:295`, `scripts/db/authz-proofs.mjs:572`,
`tests/db/identity/run-isolation.mjs:455`, `scripts/db/try-it.mjs:610` (and `generate-pinned-grants.mjs:176`, not
changed here). **Measured** (E2, E4): `import.meta.url` is the module's real path, but `argv[1]` is the path as
typed. Through a symlinked absolute path (on macOS that includes any `/tmp/...` clone, since `/tmp` →
`/private/tmp`), the runner and try-it itself **exit 0 having run nothing**, which is the same silent false green
that `[196]` (5) fixed for spaces. `make` and relative invocations are not affected (E3), and try-it's own `up` is
protected by `migrateCleanProblem` (it checks for the `ok` line and applied scripts, read), so this is INFO.
`[196]` (5) is accurate as worded ("a space or a percent sign"), but "fixed" does not cover this case.
**Remedy (owner A0 for the five in the package; the Integration Owner for `verify-clean-run.mjs:75` and
`refresh-author-handoff.mjs:373`, already listed):** compare real paths, e.g.
`argv[1] && realpathSync(argv[1]) === fileURLToPath(import.meta.url)`. Optionally add a static assertion and one
measured symlink case. Record it on `[196]` (5) at the next touch.

### Observations (not findings)
- **The stale-pid branch deletes without a live answer.** When nothing answers on the marker's port, `down`
  signals nothing and then deletes the directory if it holds only owned names (D16, D21). This includes whatever
  is inside `data/`, because `down` checks only the top-level names and the links among them. Node's `rm` does not
  follow a link nested inside `data/`, and deletion never left the given directory in any probe. The precondition
  is that someone forged a marker in the directory the person names. `[196]` (8) records the related residual
  (a live postmaster not listening is not stopped). This round does not make it worse.
- **Line 1 of `postmaster.pid` (the PID that `pg_ctl` signals) is not tied to the server that answered.** To
  exploit that, an attacker must rewrite the `postmaster.pid` of a live cluster in a 0700 directory owned by the
  person, which already gives them that person's ability to signal processes. No privilege is gained.
- The stale-file branch matches `/connection refused/i` on psql's message (`try-it.mjs:568`). A localized or
  different message makes `down` **refuse** rather than delete, so it fails safe (read).
- D12's message says "The cluster is stopped" when there was no `postmaster.pid`. That is true, since nothing was
  running, but it could say "no cluster was running". Wording only.

## §6 Verdict

**Stop-the-line: NO. Blocks merge: NO** (on the Security/Privacy dimension). The answers below are measured on my
throwaway directories unless marked read.

- `up` touched no existing data directory, non-loopback host, port 5432 or the repository. The symlinked-parent
  bypass is closed (U7a, U7b). Symlinked or dangling `--dir` and a regular file are refused (U3, U11, U12).
  Lexical `..` is consistent between the check and the write (U7c).
- `down` deleted nothing outside the directory it was given. It stopped or signalled nothing for a forged marker,
  a reserved port, a symlinked entry, or a pid file naming another data directory or port. My live cluster and
  the sacrificial process were untouched (D6-D22).
- Trust is still loopback-only. The bind lines are unchanged (read) and were measured in the earlier round.
- Neither credentials nor PII are printed.

Every claim I checked in the commits, plan, blocker appends and handoff is true, with one narrowing (R1: the entry
fix covers spaces, not symlinked paths). F2-F5 are closed. F1 is half closed: the wording is fixed, and the
credential is owed and recorded (R-F1). The merge still needs the C0 and Q0 re-checks and the Integration Owner /
Product Owner acts under RFC-2026-002. This re-check grants none of them.

## §7 Limits of this re-check

- `try-it up`/`demo`/`psql`/`down` were not run end to end on `dd11a35`: try-it refuses my only port (5501). The
  "server answers and matches → stop" and "answers and differs → refuse" branches of `down` (`:566-579`), the
  post-`mkdir` re-check (`:323`) and `attached()`'s stopped-cluster messages (`:402-404`) are **read**. The same
  limit is recorded by the Author on `[196]` (7).
- I did not re-measure the space-in-path case for the four runners. The plan records it and C0/Q0 measured the
  cause. My E-rows cover the symlink case only.
- No drift was appended to `db/foundation/migrations/140_audit.sql`. No migration text and no rule that reads
  migrations changed, the runners changed only their entry line, and both live rounds printed their own `ok`
  summaries. The file was never touched.
- macOS only; Linux (`os.tmpdir()` = shared `/tmp`) is unmeasured, as `[196]` (3) states.
- I am a same-family subagent of the Author (RFC-2026-024), so this is a recorded review, not the independent
  human sign-off a gate needs.

## §8 Cleanup

Both 5501 clusters (rounds 1 and 2) were stopped (`pg_ctl stop` exit 0) and their data directories removed.
`lsof` shows nothing listening on 5501 at the end. The sacrificial process was killed by me. The forged
directories, links and logs under `<scratch>/a1-try-itr2/` were removed; only my seven probe scripts
(`up-probes.sh`, `down-probes.sh`, `down-live.sh`, `entry-probe.sh`, `entry-probe2.sh`, `live.sh`, `stop.sh`) remain
there. Port 5432,
5499 and every other run's port were never connected to or bound. Port 61501 was used only as a refused
connection target and had no listener.
