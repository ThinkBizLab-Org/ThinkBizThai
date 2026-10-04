# C0 contract review: the try-it batch

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00` |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-try-it` (PR #178, Draft, open) |
| Subject head | `cee158583ea3e99c20767aa309d0e5508791f635` (the handoff, alone and last), over evidence `6e1e43a` and code `1298dbea003219603fa2fdb7368b2760d2ebcb41` |
| Base | `b0a3809` (`main`, the merge of #177) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (the file name carries the phase date, 2026-10-03) |
| Reviewed in | local branch `review/c0-batch-try-it`, created at `cee1585` in my own worktree (`wf_ef45afb0-347-2`). For the branch-NAME guards I checked the subject branch name out in this same worktree with `git checkout --ignore-other-worktrees` (the name is checked out in the main working copy; the ref already pointed at `cee1585`). I committed nothing on it, then switched back to `review/c0-batch-try-it`. Nothing was pushed. |
| Scope | `git diff b0a3809..cee1585` (13 paths); the plan `a0-batch-try-it-plan-2026-10-03.md`; the disposition `product-owner-disposition-2026-10-03-batch-try-it.md`; the draft record `a0-try-it-draft-2026-10-04.md`; the five commit messages; `open_blockers[196]`; the handoff; CONTRIBUTING_AGENTS.md; `.github/workflows/ci.yml` and `Makefile` (read only) |

This document records review findings. It advances no status, approves nothing, and signs nothing on
anyone's behalf.

## §0 What I am, before anything else

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**. I run in a git worktree that A0's
  workflow created, under a brief that A0's workflow wrote, and A0 chose the questions I answer.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the
  cross-vendor condition, so that alone does not bar me. It is still a real limit on my independence.
- Whether this file counts as the Reviewer signature that RFC-2026-002 requires is for the **Integration
  Owner and the Product Owner** to decide. I do not decide that.

## §1 Verdict in one paragraph

try-it reuses the repository's real machinery. It does not copy it, and it does not weaken it.
- The migrations go through `node scripts/db/run.mjs migrate-clean` as a child process.
- The helpers and fixtures go through rls-smoke's own loader. That loader was lifted out of `main()` unchanged:
  `git diff -w` shows only the function boundary moving.
- Every refusal in the demo is a suite case, run through `runCases`.
- The host guard calls `testHostRefusal` and only narrows it.

All three guards exit 0 on the branch NAME. `npm run verify` is clean at 685/685. The live rounds, the 13 demo
steps run through the suite's runner on my own cluster, and the refusals each matched what A0 recorded.
Root configuration is untouched, and every changed path is declared.

**Four claims are broader than what was measured.** All are LOW or INFO:
- `up` trusts migrate-clean's exit code alone. In a clone whose path holds a space, migrate-clean exits 0
  having run nothing. I measured that, so blocker [196] (5) is no longer only "read" (C0-TI-1).
- TRY-IT.md says a second `make db-rls-smoke` would fail on the second load. Measured, it passes (C0-TI-2).
- TRY-IT.md calls the suite "several hundred cases". I measured 1087 (C0-TI-3).
- The demo's settled-approval witness reads a value the statement itself writes (C0-TI-4, a pre-existing
  suite shape; today a trigger and the RETURNING half still catch the drift).

**No stop-the-line.** Nothing I found blocks the merge. The required check `bootstrap` on `cee1585` is
green (run 37209722885, success; §5).

## §2 Measured vs read

### Measured (by me, this run)

Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`, checked before each measured run), psql 17.11
(Homebrew), macOS. Private directory `<scratch>/c0-try-it/`.

| # | What | Where | Result |
|---|---|---|---|
| M1 | `node scripts/verify-branch-scope.mjs b0a3809 WP-0A-DB-00` | branch NAME at `cee1585` | exit 0: "all 13 changed path(s) are declared, and every amendment explains one" |
| M2 | `npm run check:handoff` | branch NAME | exit 0: "describes the branch: nothing substantive after its cited head" |
| M3 | `npm run verify` | branch NAME | exit 0: "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| M4 | `node scripts/verify-test-coverage-floor.mjs` | branch NAME | exit 0 |
| M5 | foundation-contract assertions by the guard's own rule (`stripNonCode`, then `\bassert\.\w+\(`) | base `b0a3809` vs head | **1054 -> 1074** (+20). Matches the floor 1074, the "main counted 1054" claim and the "20 added" claim |
| M6 | `audit-coverage-map.json`: each of its 33 `{index, line, quote}` refs against the head manifest | head | 33/33: every quote sits on its `line` (the one at 422 is JSON-escaped `\"CANCEL PENDING\"`) and in `open_blockers[index]`. The diff touches only `line` fields, each -1 |
| M7 | manifest structural diff, base vs head | | branch slot; `amends_without_owning.rationale`; `paths` 4 -> 3 (`evidence/VERIFICATION.md` removed); `open_blockers` 196 -> 197 (pure append at [196]). Nothing else changed |
| M8 | Live round 1: fresh `initdb --locale=C -A trust -U postgres`, 127.0.0.1:**5505**, `unix_socket_directories=''`, LC_ALL=C, shim, `make db-migrate-clean`, `make db-rls-smoke` | branch NAME, clean tree | shim 0; migrate-clean 0 (`ok in 5633ms`); rls-smoke 0 (**1087** isolation cases passed, 6 authz claims discharged, `ok in 1301ms`) |
| M9 | The 13 `DEMO_STEPS`, imported from `try-it.mjs` and run as `demo()` runs them (`sessionDriver` + `runCases`, same counts check), on M8's cluster | 5505 | `demoPlanProblems` = []; totals as postgres 2 workspaces / 5 businesses / 5 content items; **13 of 13 as expected**. Every outcome is identical to the plan §2 transcript: the counts 1/4/4, 1/1/3, 1/4/4, 1/1/1; 42501 RLS on steps 8 and 11; 42501 `permission denied for table workspaces` on step 9; witness `approved` on steps 12-13 |
| M10 | Drift on that cluster only: `approval_requests_settled_is_immutable USING (true)` and `approval_requests_update_decide_approver` without `status = 'pending'`, then M9 again | 5505 | **11 of 13**, exit 1. Steps 12 and 13 fail with `23514: a settled approval request keeps its status, decided_by and decided_at` (a trigger). The demo fails closed |
| M11 | Live round 2: re-initdb, the same as M8 (also discards M10's drift) | 5505 | 0 (`ok in 5142ms`); 0 (1087, 6, `ok in 1251ms`) |
| M12 | A second `make db-rls-smoke`, then a second `make db-migrate-clean`, on M11's already-loaded database | 5505 | rls-smoke **exit 0** (1087 passed); migrate-clean exit 2 (`001_service_roles.sql: role "app_worker" already exists (42710)`) |
| M13 | rls-smoke's loader failure path through `main()`: `make db-rls-smoke` against an empty database on the same cluster | 5505 | exit non-zero: `the auth-context helpers did not install: schema "private" does not exist`, then `db-rls-smoke: FAILED` |
| M14 | try-it refusals with no cluster made: `up --port 5505`; `up --dir` inside the worktree; `up` into a non-empty directory; `down` on a forged marker naming another dir; `down` with a file `up` did not make; `demo` / `psql` on a marker naming port 5505; `up --port 80`; an unknown subcommand | | each exit 1 (usage: 2) with a `try-it:` line. Nothing was created or deleted (`ls` after each). No port was bound |
| M15 | Entry check with a space in the path: `git archive` of `cee1585` extracted into `clone_nospace/` and into `clone with space/`, no `DB_TEST_URL` | no database | no space: `run.mjs migrate-clean` exit 1, `rls-smoke.mjs` exit 1 (each refuses, no DB). **With a space: both exit 0 with no output.** `try-it.mjs demo` runs its `main()` in both (exit 1, "no try-it cluster") |
| M16 | PR and CI facts via `gh` | | #176 merged 2026-10-04T09:07:34Z at head `84ed650`, merge `5bde893`, run 37190663121 success on `84ed650`. #177 merged 2026-10-04T14:02:54Z at head `941e718`, merge `b0a3809`, run 37206998439 success on `941e718`. Both merged by `workstationgroup`. #178 Draft, open, head `cee1585`, 13 files. Its run 37209722885 (`pull_request`, head `cee1585`) was `in_progress` at 14:45:54Z. When I re-read it after first committing this file, it was `completed`, `success` |
| M17 | The draft record is cherry-picked unchanged | | `git diff c90ac1f:… HEAD:…evidence/WP-0A-DB-00/a0-try-it-draft-2026-10-04.md` is empty |
| M18 | Handoff file lists vs `git diff --name-status b0a3809 6e1e43a` | | identical: 5 added, 7 modified. `cee1585` touches only the handoff |

The cluster was stopped and removed. Nothing listens on 5505 (`/usr/sbin/lsof` finds no listener), and the
cluster directory and both tree copies are gone. `140_audit.sql` was not touched. M10's drift was applied
to the live cluster and never to a file.

### Read (not measured by me)

- **`try-it up`, `demo`, `psql` and `down` as a CLI against a live cluster.** try-it refuses 5505 by design,
  since it is one of its `RESERVED_PORTS`. My brief allows no other port. So I measured the demo's steps
  (M9, M10) and the refusals (M14), not `up`'s six stages or `down`'s deletion of a live cluster. Those rest
  on A0's transcript (plan §2-§4).
- A0's negative control (RLS off on `app.content_items` -> 6 of 13). I ran a different drift (M10) instead.
- The Owner's words in the disposition §1. I cannot see the chat. The disposition says they are verbatim.
- The `exit 74` claim for declaring `evidence/VERIFICATION.md`.
- The `up`-with-no-initdb half-made path, and the Node 26.7.0 note (plan §3).

## §3 Answers to the questions put

**Does try-it reuse the repo's real migration, fixture and case machinery?** Yes (M9, M13, plus reading):
- Migrations: `try-it.mjs:318` spawns `scripts/db/run.mjs migrate-clean`, so the prerequisite, the batches
  and the probes are the target's own.
- Helpers and fixtures: `try-it.mjs:326-328` calls `loadHelpersAndFixtures()`. Its body is byte-identical to
  the old `main()` prefix (`git diff -w`), and `main()` still calls it (M8, M11, M13).
- Cases: a case step runs `buildCases(...)`'s own object through `runCases` (`try-it.mjs:425`). The plan
  check (`demoPlanProblems`, `:172-199`) refuses a step whose expectation differs from the suite's, a missing
  case, a `denied` with no `deniedBy`, a `no-effect` with no witness, and a plan with no row-seeing step. The
  contract test exercises each with a mutation.
- Host guard: `tryItRefusal` calls `testHostRefusal` first and only narrows it (`:59-67`).

What is try-it's own:
- `COUNTS_SQL` and the four pinned counts. This is declared, and `open_blockers[196]` (4) holds it.
- How the shim is fed. try-it scans it with `psqlLex`, then feeds it on stdin. CI runs `psql -f`. The content
  is the same and the route is stricter.

I found no duplicated or weakened logic.

**Is TRY-IT.md accurate, copy-pasteable and honest about what it does not show?**
- **Copy-pasteable:** yes. The Quick start's `cd` and four full-path lines match the paths on this Mac (Node
  24.20.0 at that path; `initdb`, `pg_ctl` and `psql` linked in `/opt/homebrew/bin` from `postgresql@17/17.11`).
- **Honest about limits:** yes. "What this does NOT show" names no app, no worker path, no provisioned
  instance, and not the whole suite. "Safety" states the trust-on-loopback consequence plainly. The
  `app_worker` sentence ("the full suite does") is true: the suite's service cases are in M8's output.
- **Accurate:** two sentences are not (C0-TI-2, C0-TI-3), and one generic prerequisite is thin (C0-TI-5).

**Ownership.** Every path is declared:
- Inside `writable_paths`: `scripts/db/try-it.mjs` and `scripts/db/rls-smoke.mjs` (`scripts/db/**`),
  `db/foundation/TRY-IT.md` and the coverage map (`db/foundation/**`), the evidence, the handoff, and the
  manifest.
- Outside ownership, each declared in `amends_without_owning` with one reason: `scripts/test-suite-contract.mjs`,
  `test-kits/branch-identity.test.mjs`, `test-kits/integrity-manifest.json`.
- `test-kits/db/foundation-contract.test.mjs` is inside `test-kits/db/**`.

**Root config is untouched.** `Makefile`, `package.json`, `package-lock.json`, `.node-version` and `.github/**`
are not in the diff. Note: `Makefile` is in this package's `writable_paths`, and the batch chose not to use that.

**Are the claims true?** Mostly, as follows:
- **Commits:** see C0-TI-6 for two small wording points. The stale floor in `4539d92` is already disclosed.
- **Plan and handoff:** true where I measured (M1-M9, M11, M16-M18). One exception is the space-in-path claim,
  which holds for try-it's own `main()` and not for `up` (C0-TI-1).
- **Disposition:** the PR, head, merge, time and run facts are all true (M16). Its wording on authority is
  careful: "executed the delegation, did not decide either merge", the RFC-2026-002 rule "not met literally",
  "[188] still owed".
- **Blocker edits:** a pure append at [196]. The cross-references [113] (no worker identity) and [188] (no
  Integration Owner evidence) are correct. Item (5) can now cite a measurement (M15).

## §4 Findings

Grades: HIGH (would block), MEDIUM (should be fixed before the merge or explicitly carried), LOW (fix or
carry on a blocker), INFO (record only).

### C0-TI-1 (LOW): `up` takes migrate-clean's exit 0 as success. In a path with a space, that exit 0 means nothing ran.

- **Where:** `scripts/db/try-it.mjs:318-323`; plan §1 row 4 (line 36); commit `1298dbe` ("a clone whose path
  holds a space still runs it"); `open_blockers[196]` (5) (`work-packages/WP-0A-DB-00.json:451`, "read and not
  measured").
- **Measured (M15):** in an extracted copy at `clone with space/`, `node scripts/db/run.mjs migrate-clean` and
  `node scripts/db/rls-smoke.mjs` both exit 0 silently, because `import.meta.url !== file://${argv[1]}`. The
  same commands in a copy with no space exit 1. try-it's own `main()` does run in the space path.
- **Consequence (read):** in such a clone, `up` step 4 would print `0 scripts applied; (no summary line)` and
  carry on. It would then fail at step 5, with "the helpers or a fixture did not load". It fails closed, but
  the message points at the wrong stage. The claim that a space-holding clone "still runs" is true of
  try-it's `main()` and not of the tool as a whole. The Owner's path `/Users/bank/ThinkBizThai` holds no space,
  so today's Quick start is not affected. I did not run `up` live in that path, because no permitted port
  exists for it.
- **Remedy (A0):**
  - In `up`, fail half-made unless migrate-clean printed its `db-migrate-clean: ok` line and `applied > 0`.
  - Update `open_blockers[196]` (5) to "measured by C0 (M15)".
  - Optionally, move the four runners to `pathToFileURL(argv[1]).href`.

### C0-TI-2 (LOW): TRY-IT.md says `make db-rls-smoke` would fail on an already-loaded database. It passes.

- **Where:** `db/foundation/TRY-IT.md:74-75` ("both expect an empty database and would fail on the second load,
  not on a policy").
- **Measured (M12):** a second `make db-rls-smoke` on a loaded database exits 0 with 1087 cases passed. Only
  `make db-migrate-clean` fails (exit 2, `role "app_worker" already exists`).
- **Remedy (A0):** say that `db-migrate-clean` fails on an already-migrated database, and that `db-rls-smoke`
  re-loads idempotently and passes. Or keep the advice and drop the false reason.

### C0-TI-3 (LOW): TRY-IT.md understates the suite as "several hundred cases"

- **Where:** `db/foundation/TRY-IT.md:166-167`.
- **Measured (M8, M11):** 1087 isolation cases and 6 authorization claims.
- **Remedy (A0):** "over a thousand cases (1087 on 2026-10-04)", or no number.

### C0-TI-4 (INFO): the settled-approval witness reads a value the statement itself writes

- **Where:** steps 12-13 (`try-it.mjs:158-167`) show the suite's cases
  `approver-a-` and `owner-a-cannot-redecide-a-settled-approval-request`
  (`tests/db/identity/isolation-cases.mjs:13822-13847`).
- **The issue:** the statement sets `status = 'approved'`. The witness reads `status` only, and expects
  `approved`. So the witness cannot tell a filtered write from a landed re-decision, although that is what
  the first case's `why` says it is for. The demo's step-12 `proves` text leans on the witness: "a second
  read shows it still says approved".
- **Measured (M10):** with both policy clauses relaxed, a trigger refuses (`23514`) and the demo fails 2
  steps. With only the policies gone, the RETURNING half ("the write must affect no row") would still fail
  it. **Not vacuous today**, and pre-existing in the suite rather than introduced here.
- **Remedy (A0, optional):** the witness reads `decided_by` and `decided_at` as well; or the `proves` text
  rests on the 0-row update.

### C0-TI-5 (INFO): the generic Homebrew prerequisite does not say how to get `initdb` on `PATH`

- **Where:** `db/foundation/TRY-IT.md:39-40`.
- **Read:** Homebrew's versioned formulae such as `postgresql@17` are keg-only by convention. I did not
  measure this. A fresh `brew install postgresql@17` may leave `which initdb` empty. The guide says to check
  `which initdb` but not what to do if it prints nothing.
- **On the Owner's Mac (measured):** the three tools are linked into `/opt/homebrew/bin`. The Quick start is
  unaffected.
- **Remedy (A0, optional):** one line: `brew link postgresql@17`, or add `$(brew --prefix postgresql@17)/bin` to
  `PATH`.

### C0-TI-6 (INFO): two commit-message wordings are broader than the code

- `1298dbe` says every next command is printed "in each refusal". Only the "no cluster" and "already holds"
  refusals carry one (`try-it.mjs:273, 360`). The plan's row 3 says this correctly.
- `cee1585` says `npm run refresh:handoff`. A0's own report says the script was invoked directly with Node
  24.20.0, which is the same command.
- No rewrite is wanted (no force-push). This record is enough.

### C0-TI-7 (INFO): "built exactly as CI builds its test database" is close, not exact

- **Where:** `try-it.mjs:340`; `TRY-IT.md:7`.
- **The differences:**
  - CI's service container keeps its image's own locale, and `try-it` uses `--locale=C`.
  - `try-it` turns off `fsync`, `full_page_writes` and `synchronous_commit`.
  - The shim is fed on stdin after a `psqlLex` scan, where CI uses `psql -f`.
  - CI also runs `make db-schema-lint`.
- None of these changes a policy outcome I can see.
- **Remedy (A0, optional):** "the same shim, migrations and fixtures CI uses".

## §5 Stop-the-line and merge

- **Stop-the-line: none.** No secret, no real data, no tenant-leak path, no migration, no irreversible
  deletion outside a marker-guarded directory (M14), and no contract change.
- **Trust auth on 127.0.0.1** while a cluster is up is a stated, owned risk (`[196]` (2), A1's call). It is not
  a C0 finding.
- **Does anything block the merge? Nothing from this review.** C0-TI-1 to C0-TI-3 are LOW: fix them, or
  carry them on `[196]`.
- **What the merge still depends on, outside this review:**
  - Q0's and A1's reports on this batch.
  - `open_blockers[188]` (Integration Owner evidence), which stays owed as the disposition says.
- **CI is not in the way:** the required check `bootstrap` on `cee1585` passed (run 37209722885, success).

## §6 Limits

- I am A0's subagent, same model family (§0).
- The tool was not run as a CLI against a live cluster by me (§2 "Read").
- I measured macOS with Homebrew PostgreSQL 17.11 only.
- M10 is one drift. It is not A0's negative control, and not every way the demo could drift.
- I did not run the CI workflow. I only read its result through `gh`.
- I read the shim, the cases and `run.mjs` only as far as the questions needed.
