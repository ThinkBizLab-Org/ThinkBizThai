# C0 contract review re-check: the try-it batch's review round

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00`, narrow re-check |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-try-it` (PR #178, Draft, open) |
| Subject head | `20623f230524a6a58fec473d291a6fad1ac166dd` (the handoff, last and alone), over evidence `952095f` and code `dd11a35` |
| Previous reviewed head | `cee158583ea3e99c20767aa309d0e5508791f635` (my record: `c0-batch-try-it-contract-review-2026-10-03.md`) |
| Base | `b0a3809` (`main`) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (the file name carries the phase date, 2026-10-03) |
| Reviewed in | local branch `recheck/c0-batch-try-it`, created at `20623f2` in my own worktree (`wf_ef45afb0-347-6`). For the branch-NAME guards I checked out `agent/claude/WP-0A-DB-00-batch-try-it` by name in this worktree (`--ignore-other-worktrees`; the ref already pointed at `20623f2`), committed nothing on it, and switched back. Nothing was pushed. |
| Scope | `git diff cee1585..20623f2` (code `dd11a35`, evidence `952095f`, handoff `20623f2`, three cherry-picked reviews); my own seven findings first; the plan's `Review round (2026-10-04)` section; `open_blockers[196]` and `amends_without_owning` as appended; the four commit messages; the handoff; CONTRIBUTING_AGENTS.md |

This document records review findings. It advances no status, approves nothing, and signs nothing on
anyone's behalf.

## §0 What I am

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**, in a worktree and under a brief its workflow
  wrote; A0 chose the questions.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the cross-vendor
  condition, so that does not bar me; it is still a real limit on my independence.
- Whether this file counts as the Reviewer signature RFC-2026-002 requires is the **Integration Owner's and the
  Product Owner's** act, not mine.

## §1 Verdict

All seven of my findings on `cee1585` are dealt with: C0-TI-1, -2, -3 are fixed and re-measured; C0-TI-4, -5, -7
are fixed in wording; C0-TI-6 is recorded without a rewrite, as I asked. try-it still reuses the repository's own
migration, fixture and case machinery; the round changed only how four runners enter `main()`, not what they do.
TRY-IT.md's new sentences are true where I measured them. Every changed path is declared; root configuration is
untouched. The three guards exit 0 on the branch NAME, `npm run verify` is 685/685.

One new **LOW** (C0-TIR-1): the runners were moved to the `pathToFileURL(argv[1]).href` idiom, which fixes a space
in the path but not a symlink in it. The repository's majority idiom (realpath of both sides, 13 scripts including
`scripts/db/explain-harness.mjs`) fixes both. Measured: invoked through `/tmp/...` (a symlink to `/private/tmp` on
macOS), `run.mjs migrate-clean` and `try-it.mjs` itself still exit 0 with no output. Two INFO notes.

**No stop-the-line. Nothing in this re-check blocks the merge.**

## §2 Measured vs read

### Measured (by me, this run)

Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`, `node -v` checked before every measured run), psql
17.11 (Homebrew), macOS. Private directory `<scratch>/c0-try-itr2/`, port **5505** on 127.0.0.1 only.

| # | What | Where | Result |
|---|---|---|---|
| R1 | `node scripts/verify-branch-scope.mjs b0a3809 WP-0A-DB-00` | branch NAME at `20623f2` | exit 0: "all 19 changed path(s) are declared, and every amendment explains one" |
| R2 | `npm run check:handoff` | branch NAME | exit 0: "describes the branch: nothing substantive after its cited head" |
| R3 | `npm run verify` | branch NAME | exit 0: "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| R4 | foundation-contract assertions by the floor guard's own rule (`stripNonCode`, `\bassert\.\w+\(`), and declared tests | `b0a3809` / `cee1585` / `20623f2` | 1054 / 1074 / **1101**; tests 81 / 81 / 81. Matches the floor 1101, "+27" and "no new test" |
| R5 | The cherry-picks | `cdafe99` vs `849890f`, `a7f6c97` vs `739ea82`, `4350d39` vs `dfb524a` (each on its review file) | each diff empty; `cee1585..dfb524a` touches only the three review files |
| R6 | Manifest, `cee1585` vs `20623f2`, structurally | | 461 lines both (so the coverage map is rightly untouched); only `open_blockers[196]` and `ownership.amends_without_owning.rationale` change, both **pure appends** (old text is a prefix); `paths` unchanged; 197 blockers both |
| R7 | Handoff file lists vs `git diff --name-status b0a3809 952095f` | | 8 added + 11 modified = the 19 paths; `base_revision` `b0a3809`, head `952095f` |
| R8 | The four runners and try-it in a `git archive` copy under `clone with space/`, no `DB_TEST_URL` | head `20623f2` vs `cee1585` | head: `run.mjs migrate-clean`, `rls-smoke.mjs`, `authz-proofs.mjs`, `run-isolation.mjs` each **exit 1** with their own refusal; at `cee1585` each **exit 0, 0 bytes** (the control). A0's claim holds |
| R9 | The same head copy, invoked by an absolute path through `/tmp` (a symlink to `/private/tmp`) | head | `run.mjs migrate-clean`: **exit 0, no output**; `try-it.mjs demo --dir <none>`: **exit 0, no output** (C0-TIR-1). Run with the copy as cwd via `/tmp`, all refuse correctly (the cwd is resolved) |
| R10 | `migrateCleanProblem` on round 1's real `make db-migrate-clean` output; on `''`; on an ok line with no `applied`; on exit 2; on a `FAILED` summary with exit 0 | | `{applied: 54, summary: 'db-migrate-clean: ok in 5190ms', problem: null}`; the other four each return a problem. C0-TI-1's remedy is in place |
| R11 | `pidFileProblem` on my live cluster's own `postmaster.pid` (lines `<pid> / <P>/pg1 / <start> / 5505`) | 5505 | `null` for port 5505; "names port 5505, and the marker port 55421" for 55421; "names another data directory" for another dir; "holds no process id" for an empty line 1 |
| R12 | `downRefusal` on forged directories (files only) | `<P>/f-*` | marker port 5505: refused (reserved); a copy of the live `postmaster.pid` in a real `data`: refused (another data directory); `postgres.log` a symlink: refused; `data/postmaster.pid` a symlink to the live one: refused; `data` a symlink to the live cluster: refused; the directory itself a symlink: refused; a clean forged dir with no pid file: `null` |
| R13 | The stale-file branch: my round-1 cluster stopped, its saved `postmaster.pid` put back | 5505 | `pidFileProblem` = `null`; `down`'s own query (`current_setting('data_directory')`, via `psql-driver`'s `query`) errors with `... failed: Connection refused`, which `/connection refused/i` matches, so `down` would signal nothing |
| R14 | `realpathThroughAncestor` / `insideRepo` | `<P>` | a not-yet-made path under an existing link to the repository: inside (A1 F3 fixed). Under a **dangling** link whose target is a not-yet-made path in the repository: **not** inside (`realpathSync` of the link fails, so it climbs past it). Node's `mkdir(..., {recursive: true})` through a dangling intermediate link throws `ENOTDIR` (measured with a target in `<P>`), so `up` would stop with an uncaught error and create nothing (C0-TIR-2) |
| R15 | `nextCommand` | | full Node path + full script path; a `--dir` holding `'` is quoted `'…'\''…'`; the default dir prints no `--dir`. Q0-TI-2 fixed |
| R16 | Live round 1: fresh `initdb --locale=C -A trust -U postgres`, 127.0.0.1:5505, `unix_socket_directories=''`, LC_ALL=C, shim, `make db-migrate-clean`, `make db-rls-smoke` | branch NAME, clean tree | 0, 0 (`ok in 5190ms`), 0 (**1087** isolation cases passed, 6 claims discharged, `ok in 1231ms`) |
| R17 | On round 1's loaded database: `make db-rls-smoke` again, then `make db-migrate-clean` again | 5505 | rls-smoke **0** (1087); migrate-clean **2** (`001_service_roles.sql: role "app_worker" already exists (42710)`). TRY-IT.md:80-83 is now true as written (C0-TI-2) |
| R18 | Live round 2: re-initdb, the same as R16 | 5505 | 0, 0 (`ok in 5433ms`), 0 (1087, 6, `ok in 1265ms`) |
| R19 | `make db-rls-smoke` against an empty database (`c0empty`) on round 2's cluster | 5505 | exit 2: "the auth-context helpers did not install: schema "private" does not exist", `FAILED`. The new entry still reaches `main()`'s failure path |
| R20 | PR #178 via `gh` | | OPEN, Draft, head `20623f2`, not merged. Check `bootstrap` (run 37212471558) was **IN_PROGRESS** when I read it |

Both clusters were stopped and removed; the private directory (clones, forged dirs, logs) is deleted; nothing
listens on 5505 (`lsof` exit 1). `140_audit.sql` was not touched: no migration text and no migration-reading rule
changed, so no drift was owed; R19 is the fail-path check instead.

### Read (not measured by me)

- **`try-it up`, `demo`, `psql`, `down` as a CLI against a live cluster.** try-it refuses 5505 (a reserved port)
  and my brief allows no other, so `up`'s re-check after `mkdir`, `attached()`'s new messages, and `down`'s
  `data_directory` comparison and stop-then-refuse order are read from the code and the contract test, with their
  inputs measured piecewise (R11-R13). A0 records the same limit at `[196]` (7).
- The demo's 13 steps live: unchanged in this round except the step-12 `proves` text (diff read); I ran them on
  `cee1585` (my M9).
- A0's ten mutations (`mutate.mjs`) and its 5507 probes. I re-measured the inputs, not the mutations.
- CI's result on `20623f2` (in progress at R20).

## §3 My findings on `cee1585`, one by one

| Finding | Remedy asked | Now | How I know |
|---|---|---|---|
| C0-TI-1 (LOW) `up` took migrate-clean's exit 0 alone | `ok` line and `applied > 0`; update [196] (5); optionally the four runners | done, all three parts | R8, R10; `[196]` appended (R6); plan row and `1298dbe` wording corrected by append. Residual: C0-TIR-1 |
| C0-TI-2 (LOW) "`db-rls-smoke` would fail on the second load" | correct the sentence | done, `TRY-IT.md:80-83` | R17 |
| C0-TI-3 (LOW) "several hundred cases" | the number | done, `TRY-IT.md:189` "over a thousand cases (1087 on 2026-10-04) ... (6 claims)" | R16, R18 |
| C0-TI-4 (INFO) witness reads its own written value | witness, or `proves` on the 0-row update | `proves` (`try-it.mjs` step 12) and `TRY-IT.md` part 6 rest on the 0-row update; the suite's witness is untouched, correctly (not this package's to weaken) | diff read |
| C0-TI-5 (INFO) no way to put `initdb` on PATH | one line | `TRY-IT.md:42-44`: `brew link postgresql@17`, or `$(brew --prefix postgresql@17)/bin` | read; not measured on a fresh Homebrew |
| C0-TI-6 (INFO) two commit wordings | no rewrite | none rewritten; recorded here and in the plan table | `git log` |
| C0-TI-7 (INFO) "exactly as CI builds" | "the same shim, migrations and fixtures CI uses" | `TRY-IT.md:7-10`, `up`'s closing paragraph and the demo's last line; the locale and durability differences are named | diff read |

## §4 Answers to the questions put

**Does try-it reuse the repo's real machinery (no duplicated or weakened logic)?** Yes, unchanged from my first
review. The round's own logic is new guard code only (`migrateCleanProblem`, `realpathThroughAncestor`,
`pidFileProblem`, `downRefusal`, `attached()`'s two refusals). None of it re-implements a migration, fixture or
case. `migrateCleanProblem` makes `up` *stricter* than migrate-clean's exit code, and it keys on lines `run.mjs`
itself prints (R10). The runners' change is the `main()` entry line plus one import each (diff read; R16-R19 show
`main()` still runs and still fails closed).

**Is TRY-IT.md accurate, copy-pasteable and honest?** Yes, where measured:
- The Quick start is unchanged. "The commands the tool prints ... run from anywhere" holds: `main()` does
  `process.chdir(REPO)` (`try-it.mjs:600`), `--dir` is resolved before that, and `SCRIPT` is absolute (R15).
- The `down` bullets match `downRefusal` and `down` (R12, R13, and reading). The stale-file sentence ("If nothing
  answers ... nothing is signalled") is right, and `[196]` (8) states its residual honestly.
- The Safety section now states the superuser consequence and that a password is owed. That is A1's ground; I
  check only that it is not overstated. It is not.
- One sentence is broader than the code: "so a symlink into the repository does not get round it"
  (`TRY-IT.md:170-172`). A dangling link does get round the check, though `mkdir` then fails (C0-TIR-2).

**Ownership; is root config untouched?** Yes (R1, R6). In this round, `scripts/db/run.mjs`, `rls-smoke.mjs`,
`authz-proofs.mjs`, `try-it.mjs` and `db/foundation/TRY-IT.md` are inside `writable_paths` (`scripts/db/**`,
`db/foundation/**`). So are `tests/db/identity/run-isolation.mjs` and `test-kits/db/foundation-contract.test.mjs`.
`scripts/test-suite-contract.mjs` and `test-kits/integrity-manifest.json` are amended outside ownership, and the
appended rationale explains both. `Makefile`, `package.json`, `package-lock.json`, `.node-version` and
`.github/**` are not in the diff. `verify-clean-run.mjs` and `refresh-author-handoff.mjs` are rightly left to the
Integration Owner.

**Are the claims true?**
- **A0's done list:** true where I measured it: cherry-pick map (R5), runners (R8), migrateCleanProblem (R10),
  pid/down checks (R11-R13), ancestor check (R14, first half), 27 assertions and floor 1101 with no new test (R4),
  blocker and rationale appends (R6), handoff (R2, R7). The "five runners" in the floor comment is try-it plus the
  four, which is consistent.
- **Commit messages:** `dd11a35`'s bullets match the diff. `952095f`'s "two fresh 5507 rounds, 1087 cases each"
  is A0's own and not re-measured; my R16/R18 give the same counts. `20623f2` touches the handoff alone.
- **Plan's Review round:** true as far as I measured, with one gap. Row A1 F3 says "TRY-IT.md:152 is now true as
  written". That is true for links that resolve, and not for dangling ones (C0-TIR-2).
- **The comment on the four runners:** it says a space or a percent sign broke the old check. That is accurate,
  and it makes no claim about symlinks.

## §5 Findings (this round)

Grades: HIGH (would block), MEDIUM (fix before merge or explicitly carry), LOW (fix or carry on a blocker), INFO
(record only).

### C0-TIR-1 (LOW): the new entry idiom fixes a space in the path but not a symlink in it; the repository already has the idiom that fixes both

- **Where:** `scripts/db/try-it.mjs:610`, `scripts/db/run.mjs:4010`, `scripts/db/rls-smoke.mjs:295`,
  `scripts/db/authz-proofs.mjs:572` and `tests/db/identity/run-isolation.mjs:455` all use
  `import.meta.url === pathToFileURL(argv[1]).href`. The repository's established idiom,
  `realpathSync(argv[1]) === realpathSync(fileURLToPath(import.meta.url))`, is used in 13 scripts. They include
  `scripts/db/explain-harness.mjs` and `scripts/verify-branch-identity.mjs:79`, whose comment calls it "the same
  idiom as the other twelve scripts".
- **Measured (R9):** Node resolves the main module's `import.meta.url` through symlinks, but `argv[1]` is not
  resolved. I invoked the head copy by an absolute path through `/tmp`, which is a symlink to `/private/tmp` on
  macOS. Both `run.mjs migrate-clean` and `try-it.mjs` itself exit 0 with no output. That is the C0-TI-1 failure
  shape, by a different route.
- **Consequence:** bounded. `up`'s `migrateCleanProblem` now catches a hollow migrate-clean whatever the cause.
  try-it spawns `run.mjs` by a relative path under `cwd: REPO`, where `REPO` comes from the realpath'd module URL,
  so the child is entered correctly. The Owner's path `/Users/bank/ThinkBizThai` holds no symlink. What remains:
  a person who runs `node <symlinked path>/scripts/db/try-it.mjs up` gets nothing at all and exit 0, and so does
  any runner invoked that way.
- **Remedy (A0):** use the realpath idiom in the five, `try-it.mjs` included, so that both a space and a symlink
  work. Its own mutation goes in the contract test. Or append the symlink case to `[196]` (5) as a stated limit.

### C0-TIR-2 (INFO): a dangling symlink into the repository passes `insideRepo`; `mkdir` then throws, so nothing is made, but the refusal is a stack trace and TRY-IT.md's sentence is broader than the check

- **Where:** `scripts/db/try-it.mjs:261-272` (`realpathThroughAncestor` climbs past a link whose `realpathSync`
  fails); `try-it.mjs:321` (`await mkdir` not caught); `db/foundation/TRY-IT.md:170-172`.
- **Measured (R14):** `insideRepo(<dangling link to REPO/not-yet>/sub)` is `false`. `mkdir -p` through a dangling
  intermediate link throws `ENOTDIR`. I measured that last part with a target in my private directory, never the
  repository.
- **Remedy (A0, optional):** in `realpathThroughAncestor`, treat an ancestor that `lstat` shows to be a link,
  but that `realpath` cannot resolve, as a refusal. Or catch `mkdir`'s error into a `try-it:` line. Or say
  "a symlink that resolves".

### C0-TIR-3 (INFO): `attached()` checks that something answers, not that it is this directory's server

- **Where:** `scripts/db/try-it.mjs:394-405`. `demo` and `psql` check that `data/postmaster.pid` exists and that
  `select 1` answers on the marker's port. `down` additionally compares `data_directory`; `attached()` does not.
- **Consequence (read):** after a restart, a stale pid file plus another try-it cluster now on that port, from
  another `--dir`, would let `demo` run its rolled-back cases against that cluster. The data is synthetic and the
  cluster is this tool's own, so there is no data-safety effect. A0 declined a mutation here, for a stated reason.
- **Remedy (A0, optional):** reuse `down`'s `data_directory` comparison in `attached()`.

## §6 Stop-the-line and merge

- **Stop-the-line: none.** There is no secret, no real data, no tenant-leak path, no migration, no contract change.
  Deletion stays marker-guarded and is stricter than before (R12).
- **Does anything block the merge? Nothing from this re-check.** C0-TIR-1 is LOW: fix it, or carry it on `[196]`
  (5). C0-TIR-2 and C0-TIR-3 are INFO.
- **What the merge still depends on, outside this review:**
  - A1's and Q0's re-checks of this round.
  - `open_blockers[188]` (Integration Owner evidence).
  - A green `bootstrap` on `20623f2`, which was in progress when I read it (R20).
  - Still owed by A0 on `[196]`: (2) the per-cluster scram password before any make/npm entry point, and (7)
    `up`/`demo`/`psql`/`down` end to end on this round's code.

## §7 Limits

- I am A0's subagent, same model family (§0).
- I did not run the tool as a CLI against a live cluster (port 5505 is reserved by the tool). The new `down` and
  `attached()` paths are measured by their inputs, not end to end.
- macOS with Homebrew PostgreSQL 17.11 only. I appended no drift (none was owed); R19 is the fail-path check.
- I did not read CI's result on `20623f2`; it was in progress.
- C0-TIR-2's `mkdir` behaviour was measured with a target in my private directory, not the repository.
