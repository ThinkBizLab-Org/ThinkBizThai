# Q0 independent test of the try-it batch (PR #178)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-try-it`, head `cee158583ea3e99c20767aa309d0e5508791f635` (the handoff, alone and
last) over the plan and disposition `6e1e43a` and the code `1298dbea003219603fa2fdb7368b2760d2ebcb41`, base
`b0a3809` (main). Author `/claude/a0_atlas`. PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/178>: Draft,
OPEN, MERGEABLE, head `cee1585`. The required check `bootstrap` (run 37209722885) was in progress while I measured.
Read with `gh` just before this commit, it was SUCCESS on `cee158583ea3e99c20767aa309d0e5508791f635`
(updated 2026-10-04T14:47:22Z).
**Tested on:** my own branch `review/q0-batch-try-it`, created at `cee1585`. The branch-name checks and every live
run used the branch NAME `agent/claude/WP-0A-DB-00-batch-try-it`, checked out in this worktree with
`git checkout --ignore-other-worktrees`, because A0's worktree also holds that name. I wrote nothing while on it, and
I returned to `review/q0-batch-try-it` for this commit. **Date:** 2026-10-04. The file name carries the phase's date,
as the batch's plan and disposition do.

This record holds findings and advances no status. It approves nothing, test-verifies nothing on anyone's behalf,
and decides nothing that the Integration Owner or the Product Owner holds.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and I am the same vendor and model family. My
independence from the Author is the independence RFC-2026-024 describes, and no more. Accepting this record as
the Tester role's signature is an act for the Integration Owner and the Product Owner, not for me.

I fixed nothing. Two demo mutations (to `scripts/db/try-it.mjs`) and one drift (appended to `140_audit.sql`) were
applied, run, and restored. The sha256 matched before and after each one: try-it `b40286222999eb64...`,
140 `2ac596bb950e8dfb...`. `git diff --quiet` was clean after each. My scripts and every log are outside the
repository, in `q0-try-it/` in the run's scratchpad: `e2e.sh`, `cmp.sh`, `negctl.sh`, `refusals.sh`, `quoting.sh`,
`stopped.sh`, `claims.sh`, `livedb.sh`, `count.mjs`, with one directory per round. Every cluster I made is
stopped and its directory removed (§7).

**One deviation from my instructions, stated plainly.** I was assigned port 5503 only. `try-it` refuses 5503 by
design: 5503 is in `RESERVED_PORTS` (`scripts/db/try-it.mjs:49`). I measured that refusal: exit 1, and nothing was
created. I did not weaken the refusal to obey the port assignment. The try-it clusters therefore ran on ports in
try-it's own range: 55463 and 55473 (passed with `--port`) and 55420 (try-it's free-port search). Before each run
I checked with `lsof` that nothing listened on that port, and after each run that nothing still listened.
`make db-migrate-clean` and `make db-rls-smoke` ran on 127.0.0.1:5503, as assigned. A0 made the same choice for the
same reason (plan §2).

## 1. Measured vs read

**Measured.** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`), checked at the start of every measured
script. The PATH Node 26.7.0 was used only for the Node-note check. PostgreSQL 17.11 (Homebrew) from
`/opt/homebrew/bin`. Every run was on head `cee1585` with a clean tree.

| Command | Where | Exit | Output |
|---|---|---|---|
| `npm run verify` | branch name | 0 | `clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0` |
| `npm run check:handoff` | branch name | 0 | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs b0a3809 WP-0A-DB-00` | branch name | 0 | "all 13 changed path(s) are declared, and every amendment explains one" (A0's 10 was on `1298dbe`; plan, disposition and handoff add 3) |
| `node scripts/verify-test-coverage-floor.mjs` | branch name | 0 | silent pass |
| assertion count of `test-kits/db/foundation-contract.test.mjs`, by the guard's own rule (`stripNonCode`, `\bassert\.\w+\(`) | `b0a3809` / `4539d92` / `cee1585` | -- | 1054 / 1070 / 1074 |
| counterfactual: `evidence/VERIFICATION.md` put back in `amends_without_owning.paths`, then `verify-branch-scope` | branch name, restored with `git checkout --` | 74 | "declares 1 amendment(s) that explain nothing this branch changed" |
| `db/foundation/lint/audit-coverage-map.json` against `b0a3809` | -- | -- | 33 blocker refs; every `line` delta is -1; every `index` and `quote` is unchanged |
| `git range-diff cf47b11~1..c90ac1f b0a3809..99fd697` | -- | -- | `c90ac1f` = `99fd697`. `cf47b11` differs from `4539d92` only in the assertion-floor line of `scripts/test-suite-contract.mjs` and two integrity digests |
| `gh pr view 176/177`, `gh run view 37190663121/37206998439` | -- | -- | #176: head `84ed650`, merge `5bde893`, 2026-10-04T09:07:34Z, run SUCCESS on `84ed650`. #177: head `941e718`, merge `b0a3809`, 2026-10-04T14:02:54Z, run SUCCESS on `941e718`. Both match the disposition §3 |
| try-it end to end, round 1 (port 55463 via `--port`) and round 2 (port 55420 from the search), fresh dirs | §2 | see §2 | 13 of 13 in both rounds; every idempotent failure exits 1 |
| negative controls (3) and demo mutations (2) | §3 | see §3 | demo red each time; the static test is red for M2 only |
| refusals, half-made cluster, Node note, quoting, a clone path with a space, a stopped cluster | §4 | see §4 | findings Q0-TI-1, -2, -3 |
| `make db-migrate-clean`, `make db-rls-smoke`, round 1 | 127.0.0.1:5503, fresh initdb, shim first | 0, 0 | `ok in 5569ms`; 1087 isolation cases passed, 6 authz claims discharged, `ok in 1346ms` |
| the same, round 2 | re-initdb | 0, 0 | `ok in 5287ms`; 1087, 6, `ok in 1267ms` |
| drift D1: `alter table app.content_items disable row level security;` APPENDED to `140_audit.sql` | re-initdb | 2, 2 | migrate-clean FAILED: "content_items lost ENABLE or FORCE ROW LEVEL SECURITY" (the 080 and 082 post-migrate passes). rls-smoke FAILED: "16 of 1087 case(s)", e.g. `viewer-a-cannot-create-a-content-item ... The operation was permitted.` Restored byte for byte |

**Read, not measured.** The governing text in `CONTRIBUTING_AGENTS.md` (separation of duties, change control,
RFC-2026-002 manual merge). The disposition's quotations of the Owner (I have no independent record of the Owner's
words). The handoff's text fields. `TRY-IT.md` as prose. Q0-TI-4 is read from code only (`try-it.mjs:490-496`).

## 2. End to end, twice (fresh directories)

Each round ran in its own new directory under `q0-try-it/roundN/cluster`. All commands below were run with the
`--dir` of that round.

| Step | Round 1 | Round 2 |
|---|---|---|
| `demo` before `up` | 1, "no try-it cluster in ... Run `<node full path> scripts/db/try-it.mjs up --dir ...` first." Nothing created | same |
| `up` | 0; `54 scripts applied; db-migrate-clean: ok in 5382ms`; port 55463 | 0; `ok in 5384ms`; port 55420 |
| `up` again | 1, "already holds a try-it cluster on port 55463. Run `... demo --dir ...` to use it, or `... down --dir ...`" | 1, same text with 55420 |
| `demo` | 0, 13 of 13 `as expected`, "All 13 steps behaved as expected." | 0, same |
| `demo` again | 0; output byte-identical to the first `demo` (the rename in step 4 is rolled back) | 0; byte-identical |
| `psql` | 0; `psql "postgresql://postgres@127.0.0.1:55463/thinkbizthai_try"` | 0 |
| the cheat-sheet run through that URL (`begin; select private.as_user(<user_owner_a>); select current_user; select count(*) from app.workspaces; rollback;`) | `authenticated`, `1` | same |
| entries in the dir before `down` | `data`, `migrate-clean.log`, `postgres.log`, `thinkbizthai-try-it.json`: exactly `OWNED_ENTRIES` | same |
| `down` | 0; "stopping the cluster on port 55463", "deleted ..."; the dir is gone; nothing listens on the port | 0; the same for 55420 |
| `down` again | 1, "holds no marker written by `up`, so nothing is stopped and nothing is deleted." | same |
| `demo` after `down` | 1, "no try-it cluster ..." | same |

**The plan's transcript holds.** I replaced my scratch path with `<scratch>/cluster` and my port with 55420. After
that, both rounds' `demo` output is byte-identical to the plan's §2 transcript (plan lines 78-205; `diff` was
empty). The plan's numbers are confirmed, not taken: 54 scripts (53 migrations and the prerequisite), and the
13 steps with their `as / runs / expected / got / proves / result` lines.

## 3. Negative controls and mutations (one fresh cluster, port 55463)

| Run | What was changed | demo exit | What went red |
|---|---|---|---|
| C1 (A0's) | `alter table app.content_items disable row level security` | 1 | 6 of 13: the four counts steps (`content_items is 5, expected 4/3/4/1`), viewer insert and forged `created_by` ("The operation was permitted."). Identical to plan §4 |
| re-enable | `enable row level security` | 0 | 13 of 13 |
| C2 (mine) | RLS off on `app.workspaces` | 1 | 5 of 13: the four counts steps (`workspaces is 2, expected 1`) and `owner-a-cannot-see-workspace-b` ("1 row(s) were visible and none should have been") |
| C3 (mine) | RLS off on `app.approval_requests` | 1 | 2 of 13: both re-decide steps, which hit `errored (23514)`, a CHECK constraint. The demo reads this correctly as not the expected `no-effect` |
| re-enable all | -- | 0 | 13 of 13 |
| **M1** | `try-it.mjs:95`, step 1 expects `content_items: '5'` (the truth is 4) | 1 | the run: "1 of 13 ... content_items is 4, expected 5". **The plan check and the static test stay GREEN** (`node --test --test-name-pattern='a target needing a database refuses' test-kits/db/foundation-contract.test.mjs`: exit 0) |
| **M2** | `try-it.mjs:126`, step 6 expects `rows` (the suite's case expects `no-rows`) | 1 | the plan check, before anything ran: "step 6 (Owner A asks for workspace B by its exact id): expects rows and the suite's case expects no-rows", then "the demo plan is not sound, so nothing was run." The static test is RED too: exit 1, `AssertionError: the demo plan is sound` |
| restored | sha256 `b40286222999eb64...` before and after; `git diff --quiet` clean | 0 | 13 of 13, static test exit 0 |

Both mutations go red when the demo runs. M1 shows what open_blockers[196] (4) already records: CI does not check
the counts against a live database. A counts expectation can be wrong in the tree and pass `npm run check`, and only
`try-it demo` catches it. This is a limit A0 already recorded, so I do not raise it as a new finding.

## 4. Refusals and edge cases

| Case | Exit | Result |
|---|---|---|
| `up --port 5503` (my assigned port) | 1 | "port 5503 is one this tool never touches."; nothing created |
| `up --port 5432` | 1 | the same for 5432; nothing created |
| `up --port 80` | 2 | "not understood: --port" + usage (ports below 1024 are rejected by the parser) |
| `up --dir <worktree>/tmp-q0-try-it` | 1 | "is inside the repository"; nothing created |
| `up --dir` into a non-empty directory with no marker | 1 | "exists and is not empty ... Nothing was touched."; `mine.txt` still there |
| `down` on that directory | 1 | "holds no marker"; `mine.txt` still there |
| a marker copied in, whose `dir` names another directory | 1 | `down`: "holds no marker" (the marker's `dir` must equal the directory); the files are intact |
| a marker naming its own directory, with `port: 5432` | 1, 1 | `demo` and `psql`: "refusing postgresql://postgres@127.0.0.1:5432/...: its port 5432 is one this tool never touches" |
| a valid marker plus `notes.txt` | 1 | `down`: "holds things `up` did not make (notes.txt); nothing is deleted."; both files still there |
| unknown subcommand / unknown flag | 2, 2 | usage |
| `/opt/homebrew/bin/node` (v26.7.0), `demo` with no cluster | 1 | "note: this is Node v26.7.0; the repository pins v24.20.0 ... Carrying on.", and the next command is spelled `/opt/homebrew/Cellar/node/26.7.0/bin/node ...` |
| `up` with `PATH=/usr/bin:/bin` (no initdb) | 1 | "initdb failed (is PostgreSQL installed ...)", then "to remove what was made so far: `<node> scripts/db/try-it.mjs down --dir ...`". Only the marker was left. The printed `down`, pasted through `bash -c` at the repository root: exit 0, the directory gone |
| `--dir` holding a space and a `'` (`cluster it's here`), from the repository | 0 | `up` printed `--dir '/.../cluster it'\''s here'`. That `demo`, pasted at the repository root: exit 0, 13 of 13. That `down`, pasted: exit 0, the directory gone |
| the same printed `demo`, pasted from another directory | 1 | `Error: Cannot find module '<cwd>/scripts/db/try-it.mjs'` (Q0-TI-2) |
| **a copy of the tree under a path holding a space** (`refusals/clone with space/`), `up` there | **1** | `[4/6] ... 0 scripts applied; (no summary line)`, then `[5/6]` failed: "the auth-context helpers did not install: schema \"private\" does not exist". The printed `down` worked (pasted at the repository root: the cluster stopped, the dir gone, 55473 free) (Q0-TI-1) |
| `node "<clone with space>/scripts/db/rls-smoke.mjs"` with no `DB_TEST_URL` | **0** | 0 bytes of output. From the worktree (no space) the same command exits 1 with "DB_TEST_URL is not set". This MEASURES open_blockers[196] (5), which A0 recorded as read and not measured |
| a cluster stopped behind try-it's back (`pg_ctl stop`, as a reboot would), then `demo` | 1 | "DEMO FAILED: 13 of 13", each step `assume-identity: psql exited (code 2, signal null) with the session still open`. `up` then says "already holds ... Run `demo`". `down`: 0, the dir deleted (Q0-TI-3) |

## 5. Claims checked

| Claim (where) | Verdict |
|---|---|
| 13 of 13; 54 scripts, 53 migrations; the full transcript (plan §2, handoff tests) | TRUE: re-measured twice, byte-identical after normalisation |
| RLS off on `content_items` -> exit 1, the same six steps (plan §4, disposition §2, 6e1e43a) | TRUE |
| the refusals; the half-made `down`; the Node 26.7.0 note; 5507 refused (plan §3) | TRUE for every equivalent I ran (5503 in place of 5507) |
| every "next" command uses the running Node's full path and `--dir`, shell-quoted (1298dbe, plan row 3) | TRUE, including a `'` in the path. It is not runnable from another directory (Q0-TI-2) |
| "main() is entered by pathToFileURL, so a clone whose path holds a space still runs it" (1298dbe), "a path with a space still runs" (plan row 4) | TRUE of `try-it.mjs`'s own `main()`, MISLEADING for the tool: in such a clone `up` cannot finish (Q0-TI-1) |
| floor 1044 -> 1074; main counted 1054; +20 = draft 16 + 4 (1298dbe, plan row 8, `scripts/test-suite-contract.mjs` comment) | TRUE (1054 / 1070 / 1074) |
| 685 tests, `evidence/VERIFICATION.md` not amended; declaring it gives 74 (1298dbe, plan row 8, rationale) | TRUE (685/685; the counterfactual exits 74) |
| the 33 audit-map `line` fields each move back by one; indexes and quotes unchanged | TRUE |
| conflicts were the floor and two digests only (1298dbe, plan header, handoff) | TRUE by range-diff. The cherry-picked `4539d92` set the floor to 1060, an intermediate value that neither the plan nor the handoff states (Q0-TI-6) |
| the rationale names THREE files amended outside ownership | TRUE (`amends_without_owning.paths` has exactly those 3) |
| open_blockers[196] added at index 196, with owners and cross-references [113], [188] | TRUE (197 entries; main had 196). It cites "plan ... §5"; the owed list is the plan's §6 (Q0-TI-5) |
| #176 and #177 merge facts (disposition §3, handoff decisions_consumed) | TRUE (gh) |
| "No migration"; `rls-smoke.mjs` loading moved unchanged; 1087 cases twice | TRUE: no migration file is in the diff; 1087 cases and 6 claims passed in both rounds; D1 still makes both targets red |
| handoff cites `6e1e43a`, is last and alone; `check:handoff` 0; verify 685/685 | TRUE |
| TRY-IT.md: "the full isolation suite, several hundred cases" (`TRY-IT.md:167`) | IMPRECISE: 1087 measured (Q0-TI-7) |
| TRY-IT.md: the service-worker path is exercised by `make db-rls-smoke` (`:161-162`) | consistent with what I read: `run-isolation.mjs:275` assumes `app_worker` for `as_service` cases |

## 6. Findings (graded)

| ID | Grade | Where | Finding | Remedy |
|---|---|---|---|---|
| Q0-TI-1 | MEDIUM | `scripts/db/try-it.mjs:318-323`; `scripts/db/run.mjs:4007`; plan :36; commit `1298dbe`; `work-packages/WP-0A-DB-00.json:451` item (5) | In a clone whose path holds a space, `up` spawns `run.mjs migrate-clean`. That process's `main()` is skipped by the `file://${argv[1]}` check, so it exits 0 having done nothing. try-it accepts exit 0 alone and prints `0 scripts applied; (no summary line)` as success. It then fails at step 5 with a misleading cause ("schema private does not exist"). The pathToFileURL claim is true of try-it's own `main()`, but the tool does not work in such a path. Blocker (5) calls the other runners' exit 0 "read and not measured"; it is now measured (rls-smoke: exit 0, no output), and it breaks try-it `up` itself, which the blocker does not say. Not on the Owner's path (`/Users/bank/ThinkBizThai` has no space). | (a) try-it: treat migrate-clean as failed unless its `db-migrate-clean: ok` summary line is present and `applied > 0`. (b) Move the four runners to `pathToFileURL(argv[1]).href`, or state in [196] (5) and TRY-IT.md that a clone path must not hold a space. (c) Correct the wording in plan row 4 and blocker (5) |
| Q0-TI-2 | LOW | `scripts/db/try-it.mjs:207-210` | The "next" commands are spelled `<node> scripts/db/try-it.mjs ...` with a relative script path, so they work only from the repository root. Pasted from any other directory they fail with `Cannot find module`. TRY-IT.md says to run from the root, so the Owner's Quick start is not affected. A person who `cd`s away between commands is. | Print the script path as `join(REPO, 'scripts/db/try-it.mjs')`, quoted, or prefix `cd <repo> &&` |
| Q0-TI-3 | LOW | `scripts/db/try-it.mjs:358-365`, `:271-274` | If the cluster has stopped (a reboot), `demo` reports "DEMO FAILED: 13 of 13" with `assume-identity: psql exited (code 2 ...)`. That reads as a broken database rather than "not running". `up` then refuses and points back to `demo`. Only `down` then `up` recovers, and neither message says so. For a non-specialist Owner this looks like an RLS failure. | In `attached()`, check `data/postmaster.pid` or a connect probe, and say "the cluster is not running; run down, then up" |
| Q0-TI-4 | LOW (read, not measured) | `scripts/db/try-it.mjs:490-496` | `down` checks for foreign entries BEFORE stopping. With a running cluster and one stray file, it refuses and the trust-auth cluster keeps running. The message says "nothing is deleted" but not that the cluster is still up, nor how to continue. | Stop first and then refuse the delete, or say "the cluster on port N is still running; remove <names> and run down again" |
| Q0-TI-5 | INFO | `work-packages/WP-0A-DB-00.json:451` | open_blockers[196] cites "plan a0-batch-try-it-plan-2026-10-03.md §5" for the owed findings. §5 is Checks; the owed list is §6. | Fix the citation in the same commit as any edit to [196] (append-only rules permitting) |
| Q0-TI-6 | INFO | commit `4539d92`; plan header :9-11 | The cherry-pick's conflict resolution set the floor to 1060 (range-diff). The message of `4539d92` says 1014 -> 1030, and the plan explains only that. The intermediate 1060 is recorded nowhere. It does no harm (1070 >= 1060, and `1298dbe` sets 1074). | None required; one clause in the plan if it is touched |
| Q0-TI-7 | INFO | `db/foundation/TRY-IT.md:166-167` | "several hundred cases": the suite is 1087 isolation cases plus 6 authz claims. | "over a thousand cases" |

## 7. Stop-the-line verdict

**No stop-the-line.** No secret is exposed and no tenant leaks. The demo is a read-mostly tour, rolled back each
step; running it twice gave byte-identical output. I found no migration divergence: there is no migration in the
diff, and migrate-clean and rls-smoke passed twice with 1087 cases. I found no irreversible deletion: `down` deleted
only marker-guarded directories holding `OWNED_ENTRIES`, and refused every foreign, forged or extra-entry case I
gave it. I found no contract mismatch. Trust auth on loopback is a known, documented limit held as
open_blockers[196] (2) for A1.

**Does anything in this record block the merge?** No Q0 finding does. Q0-TI-1 is MEDIUM and should be fixed or
stated before the tool is offered beyond the Owner's machine, but the Owner's quick-start path holds no space and
measured clean. The required check `bootstrap` is green on `cee1585` (run 37209722885). What still stands between
this head and a merge is not mine to clear: the C0 and A1 role runs have to report; Integration
Owner evidence is owed (open_blockers[188]); and the merge needs the Owner's standing delegation as the disposition
describes it.

## 8. Limits

- macOS (Darwin 25.6), PostgreSQL 17.11 (Homebrew), Node 24.20.0 only. One Node-note check ran with 26.7.0.
- I did not run try-it from the default `--dir` (`os.tmpdir()/thinkbizthai-try-it`): my instructions confine me to
  my private directory. The default-dir branch of `nextCommand` is held only by the static assertion.
- try-it ran on ports 55420, 55463, 55472 (only a marker was ever written for that one) and 55473, not on my assigned
  5503 (§0).
- The spaced-path case used a `cp -R` of `scripts`, `tests`, `db` and `.node-version`, not a full clone. That is
  enough for `up` (step 4 is where it fails), and the copy was deleted afterwards.
- Q0-TI-4 is read from code, not measured with a running cluster.
- I read the Owner's words only as the disposition quotes them.
- CI: I read only the conclusion of run 37209722885 (SUCCESS on `cee1585`), not its logs.
- `scripts/scan-repository-secrets.mjs` exited 0 on the tree with this file added.
- Cleanup: every try-it cluster was stopped and deleted by `down`. The 5503 cluster was stopped and its data
  directory removed after each of the three rounds. At the end nothing listened on 5503, 55420, 55463 or 55473.
  The small refusal fixtures (`nonempty`, `forged`, `forged5432`, `extra`, which hold no cluster) and the logs stay
  in `q0-try-it/`.
