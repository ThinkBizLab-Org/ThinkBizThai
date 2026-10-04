# Q0 independent test re-check of the try-it batch's review round (PR #178)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-try-it`, head `20623f230524a6a58fec473d291a6fad1ac166dd` (the handoff, last and
alone) over the plan's review-round section `952095f` and the code `dd11a35`, base `b0a3809` (main). Previously
reviewed head `cee158583ea3e99c20767aa309d0e5508791f635` (my record `q0-batch-try-it-test-review-2026-10-03.md`).
Author `/claude/a0_atlas`. PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/178>: Draft, OPEN, MERGEABLE,
head `20623f2` (also the remote branch head, `git ls-remote`). The required check `bootstrap` is SUCCESS on
`20623f2` (run 37212471558), read with `gh` before this commit.
**Tested on:** my own branch `recheck/q0-batch-try-it`, created at `20623f2`. The branch-name checks and every live
run used the branch NAME `agent/claude/WP-0A-DB-00-batch-try-it`, checked out in this worktree with
`git checkout --ignore-other-worktrees` (A0's worktree also holds that name). I wrote nothing while on it, and I
returned to `recheck/q0-batch-try-it` for this commit. **Date:** 2026-10-04; the file name carries the phase's date.
**Scope:** NARROW. My own seven findings first, then the round's changes (`git diff cee1585..20623f2`) and the
claims made about them.

This record holds findings and advances no status. It approves nothing, test-verifies nothing on anyone's behalf,
and decides nothing that the Integration Owner or the Product Owner holds.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and I am the same vendor and model family. My
independence from the Author is the independence RFC-2026-024 describes, and no more. Accepting this record as
the Tester role's signature is an act for the Integration Owner and the Product Owner, not for me.

I fixed nothing. Two demo mutations (to `scripts/db/try-it.mjs`) and one drift (appended to `140_audit.sql`) were
applied, run and restored; the sha256 matched before and after (try-it `c8ab0fd1045fa9c0...`, 140
`2ac596bb950e8dfb...`) and `git diff --quiet` was clean after each. My scripts and logs are outside the
repository, in `q0-try-itr2/` in the run's scratchpad (`e2e.sh`, `negctl.sh`, `negctl2.sh`, `space.sh`,
`refusals.sh`, `livedb.sh`, `count.mjs`, one directory and one log per round).

**The same deviation as my first record, stated plainly.** I was assigned port 5503. `try-it` refuses 5503 by
design (`RESERVED_PORTS`, `scripts/db/try-it.mjs:53`); I measured that refusal again (exit 1, nothing created). I
did not weaken it. The try-it clusters therefore ran on ports in try-it's own range: 55477 and 55476 and 55475
(passed with `--port`) and 55420 (try-it's own search). Before each run my script checked with `lsof` that nothing
listened on the port, and after each that nothing still did. `make db-migrate-clean` and `make db-rls-smoke` ran on
127.0.0.1:5503 only, as assigned. This is what the plan's "Still owed" asks of "the next run with a port in
55420-55479" (open_blockers[196] (7)).

## 1. Measured vs read

**Measured.** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`), printed at the start of every
measured script; npm 11.19.0. PostgreSQL 17.11 (Homebrew) from `/opt/homebrew/bin`. Every run on head `20623f2`
with a clean tree, on the branch name.

| Command | Where | Exit | Output |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs b0a3809 WP-0A-DB-00` | branch name | 0 | "all 19 changed path(s) are declared, and every amendment explains one" |
| `npm run verify` | branch name | 0 | `clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0` |
| `npm run check:handoff` | branch name | 0 | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-test-coverage-floor.mjs` | branch name | 0 | silent pass |
| foundation-contract assertions, the guard's own rule (`stripNonCode`, `\bassert\.\w+\(`) | `b0a3809` / `cee1585` / `dd11a35` / `20623f2` | -- | 1054 / 1074 / 1101 / 1101 |
| the three cherry-picked review files against their originals (`git rev-parse <commit>:<path>`) | `4350d39`, `cdafe99`, `a7f6c97` vs `20623f2` | -- | identical blobs (`9c851c9`, `93b8c32`, `bbe7bb7`); each commit carries its `cherry picked from commit` trailer |
| open_blockers[196], `cee1585` vs `20623f2`, parsed | -- | -- | 197 entries both; only [196] changed, and its old text is an exact prefix of the new one (append-only) |
| `grep -rnF 'file://${' scripts tests db` | -- | -- | only `scripts/verify-clean-run.mjs:75` and `scripts/refresh-author-handoff.mjs:373` still compare that way (as A0 states) |
| try-it end to end, round 1 (55477, `--port`) and round 2 (55420, try-it's search), fresh dirs | §3 | see §3 | 13 of 13 both rounds; every idempotent failure exits 1 |
| negative controls (2) and demo mutations (2) | §4 | see §4 | demo red each time |
| my earlier findings, live: spaced path, paste from `/`, stopped cluster, stale `postmaster.pid`, foreign entry | §2 | see §2 | all seven closed |
| refusals with no cluster (reserved port marker, forged `postmaster.pid`, symlinks, a file as `--dir`, a link into the repository) | §5 | 1 each | each refused, nothing stopped, signalled, created or deleted |
| `make db-migrate-clean`, `make db-rls-smoke`, round 1 | 127.0.0.1:5503, fresh initdb, shim first | 0, 0 | `ok in 5484ms`, 54 `applied` lines; 1087 isolation cases passed, 6 authz claims discharged, `ok in 1265ms` |
| the same, round 2 | re-initdb | 0, 0 | `ok in 5202ms`; 1087, 6, `ok in 1285ms` |
| drift D1: `alter table app.content_items disable row level security;` APPENDED to `140_audit.sql` | re-initdb | 2, 2 | migrate-clean "FAILED in 5340ms" (080's post-migrate pass: "content_items do not carry both ENABLE and FORCE ROW LEVEL SECURITY"); rls-smoke "FAILED — 16 of 1087 case(s)". Restored byte for byte |

The live rounds were warranted: `run.mjs` and `rls-smoke.mjs` (which the DB layer runs) changed how `main()` is
entered. Both rounds printed each runner's own summary, and the drift turned both red, so each `main()` ran and
still fails on a broken migration.

**Read, not measured.** `CONTRIBUTING_AGENTS.md` (separation of duties, change control, RFC-2026-002). The
disposition (unchanged since `cee1585`; I checked its merge facts in my first record) and its quotations of the
Owner. The handoff's prose fields. A1's own measurements (F1 `COPY ... TO PROGRAM`, the live forged-PID cases on a
5507 cluster), which I did not repeat beyond §5. TRY-IT.md as prose, compared line by line with what §2-§5 measured.

## 2. My earlier findings, re-measured

| ID (grade then) | Change in `dd11a35` | Re-measured here | Status |
|---|---|---|---|
| Q0-TI-1 (MEDIUM) | `migrateCleanProblem` (`try-it.mjs:282-289`); the four runners enter `main()` by `pathToFileURL` | A `cp -R` of `scripts tests db .node-version package.json` under `space/clone with space/`. Each runner with no `DB_TEST_URL`: `run.mjs` exit 2 (usage), `rls-smoke.mjs` 1, `authz-proofs.mjs` 1, `run-isolation.mjs` 1, each with its own refusal (at `cee1585` the first three gave exit 0, 0 bytes). Then from the copy, `up --port 55475`: exit 0, "54 scripts applied; db-migrate-clean: ok in 5155ms", `[6/6] ready`; `demo`: exit 0, 13 of 13; the printed `down` (script path single-quoted) pasted from `/`: exit 0, dir gone, 55475 free | **CLOSED** |
| Q0-TI-2 (LOW) | `SCRIPT`, `shellQuote` (`try-it.mjs:213-217`) | Both rounds: the printed `demo` line pasted from `/` with `bash -c`: exit 0, "All 13 steps behaved as expected." | **CLOSED** |
| Q0-TI-3 (LOW) | `attached()` checks `postmaster.pid`, then `select 1` (`try-it.mjs:400-404`); `up`'s "already holds" names `down` then `up` | Live, cluster stopped by `down` (no pid file): `demo` 1 and `psql` 1, "is not running (it has stopped, after a restart for example). Run `<down>`, then `<up>`"; `up` 1 with the new clause. A stale `postmaster.pid` written back (pid 99999, not alive; this dir's data; the marker port): `demo` 1, "does not answer on 127.0.0.1:55476 (... Connection refused)", same advice. No `DEMO FAILED: 13 of 13` | **CLOSED** |
| Q0-TI-4 (LOW, read) | `down` stops, then refuses the delete (`try-it.mjs:581-585`) | Live, running cluster plus `notes.txt`: `down` 1, "stopping the cluster on port 55476", then "holds things `up` did not make (notes.txt). The cluster is stopped; nothing is deleted. Move those out and run `<down>` again."; nothing listens on 55476; every entry kept. On the stale pid with `notes.txt` still there: 1, "nothing answers ... nothing is signalled", same refusal. `notes.txt` removed, `down`: 0, the dir deleted | **CLOSED**, now measured |
| Q0-TI-5 (INFO) | appended to [196] | read: the append says §5 should read §6 | **CLOSED** (append-only, as the rules require) |
| Q0-TI-6 (INFO) | plan, Review round, last row | read: the intermediate 1060 is now recorded | **CLOSED** |
| Q0-TI-7 (INFO) | `TRY-IT.md:189` | "over a thousand cases (1087 on 2026-10-04) plus ... (6 claims)": 1087 and 6 measured twice here | **CLOSED** |

## 3. End to end, twice (fresh directories)

Each round in a new `q0-try-itr2/roundN/cluster`. All commands with that `--dir`.

| Step | Round 1 (55477) | Round 2 (55420) |
|---|---|---|
| `demo` before `up` | 1, "no try-it cluster in ... Run `<node> <repo>/scripts/db/try-it.mjs up --dir ...` first."; nothing created | same |
| `up` | 0; "54 scripts applied; db-migrate-clean: ok in 5463ms" | 0; "ok in 5311ms" |
| `up` again | 1, "already holds a try-it cluster on port 55477 ... (and if it has stopped, ... `down` then `up` is the way back)." | 1, same with 55420 |
| `demo` | 0, 13 `as expected`, "All 13 steps behaved as expected." | 0, same |
| `demo` again | 0, byte-identical output | 0, byte-identical |
| printed `demo` pasted from `/` | 0, 13 of 13 | 0, 13 of 13 |
| `psql`, then its cheat-sheet query through the URL | 0; `authenticated`, `1` | 0; same |
| entries before `down` | exactly `OWNED_ENTRIES` | same |
| `down` | 0, "stopping the cluster on port 55477", "deleted ..."; dir gone; nothing listens | 0, same for 55420 |
| `down` again | 1, "holds no marker written by `up`, so nothing is stopped and nothing is deleted." | same |
| `demo` / `psql` after `down` | 1 / 1, "no try-it cluster ..." | same |

## 4. Negative controls and mutations

| Run | Change | demo exit | What went red |
|---|---|---|---|
| C1 (A0's) | RLS off on `app.content_items` | 1 | 6 of 13: the four counts steps (`content_items is 5, expected 4/3/4/1`), viewer insert and forged `created_by` ("The operation was permitted.") |
| re-enable | -- | 0 | 13 of 13 |
| C2 (mine, own fresh cluster on 55476) | RLS off on `app.business_profiles` | 1 | 5 of 13: the four counts steps (`businesses is 5, expected 4/1/4/1`) and `owner-a-cannot-see-business-b1` ("1 row(s) were visible and none should have been") |
| re-enable | -- | 0 | 13 of 13 |
| **M1** | `try-it.mjs:99`, step 1 expects `content_items: '5'` (the truth is 4) | 1 | the run: "1 of 13 ... content_items is 4, expected 5". The static test stays green (exit 0): the known limit held as [196] (4), unchanged |
| **M2** | `try-it.mjs:130`, `owner-a-cannot-see-workspace-b` expects `rows` (the suite's case expects `no-rows`) | 1 | the plan check, before anything ran: "step 6 ... expects rows and the suite's case expects no-rows", "the demo plan is not sound, so nothing was run." Static test: exit 1, `AssertionError: the demo plan is sound` |
| restored | sha256 `c8ab0fd1045fa9c0` before and after, `git diff --quiet` clean | 0 | 13 of 13; static test exit 0 |

(A first attempt at C2 named `app.businesses`, which does not exist; the `alter` exited 1 and the demo stayed
green, as it should with nothing changed. The control was re-run on `app.business_profiles`, the table
`COUNTS_SQL` reads.)

## 5. Refusals with no cluster (the Tester's side of A1 F2-F4)

| Case | Exit | Result |
|---|---|---|
| marker naming port 5503, `down` | 1 | "its marker names postgresql://postgres@127.0.0.1:5503/...: its port 5503 is one this tool never touches; nothing is stopped and nothing is deleted."; files kept |
| `data/postmaster.pid` line 2 naming another existing data dir (line 1 the live test shell's PID), `down` | 1 | "names another data directory (...)"; the shell was alive afterwards: nothing signalled it |
| the same file naming this data, port 55473 against marker 55474 | 1 | "names port 55473, and the marker port 55474" |
| `data` a symlink to another dir, `down` | 1 | "data in ... is a symlink, which `up` never makes"; the target intact |
| `up --dir <a symlink>` | 1 | "is a symlink; pass --dir <a new path>, not a link. Nothing was touched." |
| `up --dir <a regular file>` | 1 | "exists and is not a directory. Nothing was touched." (no stack trace) |
| `up --dir <link to the worktree>/not-yet` | 1 | "is inside the repository"; nothing made in the repository |
| `up --port 5503` | 1 | "port 5503 is one this tool never touches."; nothing created |

## 6. Claims checked

| Claim (where) | Verdict |
|---|---|
| cherry-picks C0 `cdafe99`->`849890f`, A1 `a7f6c97`->`739ea82`, Q0 `4350d39`->`dfb524a`, with `-x` (A0's report, plan map) | TRUE (identical blobs, trailers present) |
| `up` goes on only on `db-migrate-clean: ok` with scripts applied; the four runners use `pathToFileURL` (dd11a35, plan, [196] (5)) | TRUE, and now measured end to end in a spaced path (§2) |
| `down`'s checks: reserved port, symlinks, pid-file directory and port, the server's `data_directory`; "connection refused" signals nothing (dd11a35, plan, TRY-IT.md:154-159) | TRUE for every case I ran (§2, §5); the `data_directory` comparison held on four live clusters (each `down` stopped its own) |
| repository check through the nearest ancestor; symlinked and file `--dir` refused (dd11a35, TRY-IT.md:170-172) | TRUE (§5) |
| printed commands run "from any directory" (TRY-IT.md:33) | TRUE (§2, §3) |
| stopped cluster and `down` then `up` (TRY-IT.md:163-164, `up`'s message) | TRUE, live (§2) |
| foreign entry: stop, keep, say so (TRY-IT.md:160-161) | TRUE, live (§2) |
| 27 assertions, floor 1074 -> 1101, no new test, still 685 (dd11a35, plan, test-suite-contract comment) | TRUE (1074 -> 1101; 685/685). The floor comment says "the five runners entered by pathToFileURL"; the test loop holds five files, the four runners and try-it itself. Consistent |
| [196] extended by appending (2), (5), (7), (8); the rationale extended likewise (A0's report) | TRUE (prefix-preserving; one entry changed) |
| "the manifest's line count did not change, so audit-coverage-map is untouched" | TRUE (`audit-coverage-map.json` not in `cee1585..20623f2`) |
| "1087 cases, 6 claims"; two fresh rounds (plan, 952095f) | TRUE (re-measured twice here) |
| plan table: `verify-branch-scope` "all 16 changed path(s)" on the "working tree" | TRUE as measured then, but see Q0-TIR-1 |
| handoff cites the branch, last and alone; `check:handoff` 0 (20623f2) | TRUE |
| [196] (7): `up`/`demo`/`psql`/`down` end to end, a stopped cluster and a stale pid file "owed" | Was true of A0's round. Now MEASURED by this re-check (§2, §3); see Q0-TIR-2 |

## 7. Findings (graded)

| ID | Grade | Where | Finding | Remedy |
|---|---|---|---|---|
| Q0-TIR-1 | INFO | `evidence/WP-0A-DB-00/a0-batch-try-it-plan-2026-10-03.md`, Review round, "Measured on this round", the `verify-branch-scope` row | The row reports "all 16 changed path(s)" on the "working tree". `verify-branch-scope.mjs:127` diffs `base..HEAD` only, so that run saw `dfb524a` and did not cover the three files the round added (`run.mjs`, `authz-proofs.mjs`, `run-isolation.mjs`). At the head it is 19 of 19, declared (re-measured here), so nothing is wrong in the tree. | None required. If the plan is touched again, note that the scope guard reads commits, and cite the head count |
| Q0-TIR-2 | INFO | `work-packages/WP-0A-DB-00.json` open_blockers[196] (7) | (7) asks the next run with a port in 55420-55479 for `up`, `demo`, `psql`, `down` end to end, a stopped cluster and a stale `postmaster.pid`, live. This record measured all of them on `dd11a35`'s code (head `20623f2`), and they passed. The blocker still reads owed. | At the next append to [196], cite this record for (7). (8), the residual, and (2)'s scram-sha-256 password are not touched by this and stay owed |

No new defect was found in the round's code. The residual [196] (8) (a postmaster that is alive but not listening
is not stopped by `down`) and A1 F1 (b) (the per-cluster password) stay as A0 records them; I did not measure (8).

## 8. Stop-the-line verdict

**No stop-the-line.** No secret is exposed and no tenant leaks. Both demo rounds and every control behaved as
expected, and the demo went red on both controls and both mutations. There is no migration divergence: no
migration file is in the diff, migrate-clean and rls-smoke passed twice with 1087 cases and 6 claims, and the
appended drift turned both red. There is no irreversible deletion: `down` deleted only marker-guarded
directories holding `OWNED_ENTRIES`, and it refused every forged, symlinked, reserved-port and foreign-entry case
I gave it, without signalling anything. There is no contract mismatch.

**Does anything block the merge?** No Q0 finding does: my seven earlier findings are closed, and both new ones are
INFO. The required check is green on `20623f2` (run 37212471558). What still stands between this head and a merge
is not mine to clear: the C0 and A1 re-checks have to report, the Integration Owner evidence is owed
(open_blockers[188]), and the merge needs the Owner's standing delegation as the disposition describes it. The
trust-auth limit (A1 F1 (b)) is recorded as owed before any make or npm entry point; that is a condition on later
work, not on this Draft.

## 9. Limits

- macOS (Darwin 25.6), PostgreSQL 17.11 (Homebrew), Node 24.20.0 only. I did not repeat the Node 26 note.
- try-it ran on 55420, 55475, 55476 and 55477, not on my assigned 5503 (§0). `make` targets ran on 5503 only.
- The spaced-path case used a `cp -R` of `scripts`, `tests`, `db`, `.node-version` and `package.json`, not a full
  clone; that copy ran `up`, `demo` and `down` through, and it was deleted afterwards.
- The stale `postmaster.pid` was written by hand (pid 99999, checked not alive), not left by a real crash or
  restart. I did not kill a postmaster.
- I did not run the default `--dir` (`os.tmpdir()/thinkbizthai-try-it`); my instructions confine me to my private
  directory.
- I did not measure [196] (8) (a postmaster alive and not listening) or A1's `COPY ... TO PROGRAM`.
- I read the Owner's words only as the disposition quotes them. CI: I read only the conclusion of run
  37212471558, not its logs.
- Cleanup: every try-it cluster was stopped and deleted by `down`. The 5503 cluster was stopped and its data
  directory removed after each of the three rounds. At the end nothing listened on 5503, 55420 or 55475-55477. The
  small refusal fixtures (which hold no cluster) and the logs stay in `q0-try-itr2/`.
