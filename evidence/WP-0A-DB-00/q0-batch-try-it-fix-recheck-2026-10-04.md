# Q0 independent test re-check of the try-it auth/entry fix (PR #178)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-try-it`, head `45937c1e08182220e7ce3a4fc036929c96ba86e6` (the handoff, last and
alone) over the plan section `1c7d638` and the code `3b64fd3`, base `b0a3809` (main). Previously re-checked head
`20623f2` (my record `q0-batch-try-it-recheck-2026-10-03.md`). Author `/claude/a0_atlas`.
PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/178>: Draft, OPEN, MERGEABLE, head `45937c1` (also the
remote branch head, `git ls-remote`). The required check `bootstrap` is SUCCESS on `45937c1` (run 37215068623,
completed 2026-10-04T16:08:54Z), read with `gh` before this commit.
**Tested on:** my own branch `recheck2/q0-batch-try-it`, created at `45937c1`. The gates and both live rounds ran
on the branch NAME `agent/claude/WP-0A-DB-00-batch-try-it`, checked out in this worktree with
`git checkout --ignore-other-worktrees` (A0's worktree also holds that name); I wrote nothing while on it and
returned to `recheck2/q0-batch-try-it` for the mutations and this commit. **Date:** 2026-10-04.
**Scope:** NARROW. The fix in `3b64fd3` (A1 R-F1, C0-TIR-1 / A1 R1, C0-TIR-2) and the claims A0 makes about it.

This record holds findings and advances no status. It approves nothing, test-verifies nothing on anyone's behalf,
and decides nothing that the Integration Owner or the Product Owner holds.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and I am the same vendor and model family. My
independence from the Author is the independence RFC-2026-024 describes, and no more. Accepting this record as
the Tester role's signature is an act for the Integration Owner and the Product Owner, not for me.

I fixed nothing. Four entry-check mutations were applied to my own branch, run and restored; the sha256 matched
before and after each (`authz-proofs.mjs` `20029a30655a9ebb`, `run.mjs` `f84844bab0e2757e`, `rls-smoke.mjs`
`cd29a9f07ce6cb33`, `try-it.mjs` `ccb60ee6ffc16fcc`) and `git status --porcelain` was empty after each. My scripts
and logs were kept in `q0-tryit2/` in the run's scratchpad (`e2e.sh`, `smoke.sh`, `tail.sh`, `gates.sh`,
`mut.sh`) and deleted with it at the end. Ports: try-it's own choice (55420 both rounds, no `--port`); after each
`down`, `lsof` showed nothing listening on it. The one other PostgreSQL on this Mac (Homebrew's, on its own data
directory) was neither used nor touched.

## 1. Measured vs read

**Measured.** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`), npm 11.19.0, printed at the start of
every script. PostgreSQL 17.11 (Homebrew), `/opt/homebrew/bin`. Head `45937c1`, clean tree.

| Command | Where | Exit | Output |
|---|---|---|---|
| `npm run check` | branch name | 0 | `pass 685`, `fail 0` |
| `npm run verify` | branch name | 0 | `clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0` |
| `npm run check:handoff` | branch name | 0 | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs b0a3809 WP-0A-DB-00` | branch name | 0 | "all 23 changed path(s) are declared, and every amendment explains one" |
| try-it end to end, two rounds on fresh dirs | §2 | see §2 | 13 of 13 each round; negative control red each round |
| `make db-rls-smoke` with the settings `up` printed (round 1) | §2 | 0 | 1087 isolation cases passed, 6 authz claims discharged, `ok in 1403ms` |
| `node --test test-kits/db/foundation-contract.test.mjs`, baseline and four mutations | §3 | 0, then 1 x4 | 81/81; each mutation 80 pass, 1 fail |

**Read, not measured.** `CONTRIBUTING_AGENTS.md`. The diff `20623f2..45937c1`, in full for `try-it.mjs`,
`run.mjs` and the contract test. TRY-IT.md's changed paragraphs (steps 1 and 6, the db-rls-smoke sentence,
"Poking at it yourself", Safety). The handoff and plan prose. A0's own six mutations (M-trust, M-mode,
M-pgpassword, M-psql-line, M-entry-tryit, M-entry-runner), which I did not repeat; my §3 is the entry check only.

## 2. End to end, twice (fresh directories, on the branch name)

Each round in a new `q0-tryit2/roundN/cluster`, no `--port`. `up` was started with `PGPASSWORD=wrong` in its
environment, to test that an inherited one is dropped.

| Step | Round 1 (55420) | Round 2 (55420) |
|---|---|---|
| `demo` before `up` | 1, "no try-it cluster in ... Run `<up>` first."; nothing created | same |
| `up` (PGPASSWORD=wrong inherited) | 0; `[6/6] ready`; `PGPASSFILE=<dir>/pgpass DB_TEST_URL=postgresql://postgres@127.0.0.1:55420/thinkbizthai_try`; 53 migrations, 66 tables, 209 policies, 2 workspaces | 0, same |
| pgpass | 43-character password; fields `127.0.0.1:55420:*:postgres`; file `-rw-------`, dir `drwx------` | same |
| `initdb.pwfile` after `up` | absent | absent |
| `pg_hba.conf` (non-comment) | six lines, every one `scram-sha-256`; no `trust` | same |
| entries | `data`, `migrate-clean.log`, `pgpass`, `postgres.log`, marker: all in `OWNED_ENTRIES` | same |
| `up` again | 1, "already holds a try-it cluster on port 55420 ..." | same |
| `demo` (PGPASSWORD=wrong inherited) | 0, "All 13 steps behaved as expected." | same |
| `demo` again | 0, byte-identical output | same |
| printed `demo` line pasted from `/` | 0, 13 of 13 | same |
| `psql` | 0; prints `PGPASSFILE=<dir>/pgpass psql "postgresql://postgres@127.0.0.1:55420/thinkbizthai_try"`; no password | same |
| that line, as printed, from `/`, PGPASSWORD unset | 0, `postgres` | same |
| that line with `PGPASSWORD=wrong` exported | 2, `FATAL:  password authentication failed for user "postgres"` (see Q0-TIF-1) | same |
| no password (`PGPASSFILE=/dev/null`, `-w`) | 2, `fe_sendauth: no password supplied` | same |
| wrong password | 2, `FATAL:  password authentication failed for user "postgres"` | same |
| another role (`authenticator`), any password | 2, `FATAL:  password authentication failed for user "authenticator"` | same |
| login roles in the cluster (round 1) | `postgres` only (super, has a password); every other role is NOLOGIN | -- |
| password searched in `up`/`demo`/`psql`/rls-smoke output, `postgres.log`, `migrate-clean.log`, marker | not found | not found |
| control: `alter table app.content_items disable row level security` | demo 1, "DEMO FAILED: 6 of 13": steps 1-4 (`content_items is 5, expected 4/3/4/1`), 8 and 11 ("The operation was permitted.") | same 6 steps |
| re-enable | demo 0, 13 of 13 | same |
| `down` | 0, "stopping the cluster on port 55420", "deleted ..."; dir gone; nothing listens | same |
| `down` again | 1, "holds no marker written by `up`, so nothing is stopped and nothing is deleted." | same |
| `demo` / `psql` after `down` | 1 / 1, "no try-it cluster ..." | same |

## 3. The static entry assertion, one runner reverted at a time (my branch)

| Run | Change | Contract test | Assertion that went red |
|---|---|---|---|
| baseline | none | 0 (81/81) | -- |
| MS1 | `authz-proofs.mjs`: `git diff 3b64fd3 20623f2 -- <file>` applied (back to `pathToFileURL`) | 1 (80/1) | `scripts/db/authz-proofs.mjs: nor by pathToFileURL alone` |
| MS2 | `run.mjs`: the same method | 1 (80/1) | `scripts/db/run.mjs: nor by pathToFileURL alone` |
| MS3 | `rls-smoke.mjs`: entry line set to `` import.meta.url === `file://${argv[1]}` `` | 1 (80/1) | `scripts/db/rls-smoke.mjs: main() is not entered by a hand-built file:// URL` |
| MS4 | `try-it.mjs`: entry line and import back to `pathToFileURL` | 1 (80/1) | `scripts/db/try-it.mjs: nor by pathToFileURL alone` |
| restored | each file by `git checkout --`, sha256 equal before and after | 0 tree dirt | -- |

## 4. Findings

| ID | Grade | Finding |
|---|---|---|
| Q0-TIF-1 | INFO | Measured, both rounds: the `psql` line try-it prints connects only if the user's shell does not export `PGPASSWORD`; with one exported, libpq uses it before `PGPASSFILE` and the connection is refused (`FATAL: password authentication failed`). The tool's own connections are immune (`useClusterPassword` drops it; demo 13/13 with `PGPASSWORD=wrong`). TRY-IT.md Safety says "The tool and the commands it prints find it through `PGPASSFILE`", which is true only when `PGPASSWORD` is unset. It fails closed (no leak, no wrong cluster), so it does not block; a sentence in TRY-IT.md, or `env -u PGPASSWORD` in the printed line, would close it. |
| Q0-TIF-2 | INFO | Read: the bare-entry scan is a regex over `scripts/` and `tests/` for two literal shapes (`import.meta.url === pathToFileURL(` and `` import.meta.url === `file://${ ``). A new runner entered some other non-resolving way (for example `fileURLToPath(import.meta.url) === argv[1]`), or one under `test-kits/` or `db/`, is not caught. The three runners exercised through a symlink are caught dynamically. Recorded as the scan's reach, not a defect of this fix. |

No finding of mine from the previous re-check is reopened by this fix. Every claim of A0's that I measured held:
trust is gone (`pg_hba` all `scram-sha-256`); a 43-character password per cluster in a 0600 `pgpass` inside a
0700 directory; the pwfile removed; an inherited `PGPASSWORD` dropped for the tool; no password in a URL, a printed
line or a log; `up` and `psql` print exactly the stated lines; `down` deletes `pgpass`; the no-password case is a
client-side `fe_sendauth` and the wrong-password case a server FATAL, both exit 2 (as A0 recorded); the six runners
use the real-path idiom; the contract test goes red when one is reverted; 685/685.

## 5. Stop-the-line verdict

**No stop-the-line.** No secret is exposed (the password is in `pgpass` alone, 0600), no tenant data leaks (the
negative control turns the demo red and the full smoke suite passes on the cluster), nothing external is touched,
and nothing is deleted that `up` did not make. **Nothing I measured blocks the merge**: CI `bootstrap` is green on
`45937c1`, and both findings are INFO. What remains for the merge is outside the Tester's role: the A1 and C0
re-checks of this fix and the Integration Owner's acceptance, under the Owner's standing delegation.

## 6. Limits

- Two rounds on one Mac, one PostgreSQL (17.11), one port (55420); try-it chose it both times. No `--port`, no
  stopped-cluster or stale-pid case this time (measured in my previous record, and the fix changes neither path
  except to add `useClusterPassword` before `down`'s probe, which both `down`s here exercised).
- The password search covered outputs and logs, not the data directory (which holds the scram verifier by design).
- I did not test another OS account reading `pgpass` (no second account used); the 0600/0700 modes are measured,
  the refusal to another user is inferred from them.
- C0-TIR-3 (`attached()` not comparing `data_directory`) was not measured; A0 records it as read.
- I am not independent of the Author beyond RFC-2026-024 (§0).
