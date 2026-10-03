# C0 contract review re-check: batch 150-prereq's review round

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00`; narrow re-check |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-150-prereq` (PR #172, Draft) |
| Subject head | `00284c0` (handoff refresh, last and alone), over code `7717c81` |
| Previously reviewed head | `782df87` (my review: `c0-batch-150-prereq-contract-review-2026-10-03.md`, cherry-picked as `9aec4f8`) |
| Base | `b5f53c3` (`main`) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (file named for the batch date, 2026-10-03) |
| Reviewed in | my own branch `recheck/c0-batch-150-prereq`, created at `00284c0` in worktree `wf_6dce59ae-fd8-6`. The guards that read the branch name were run with the subject branch name checked out (§2), then I switched back. |

This document records findings. It advances no status, approves nothing, and signs nothing on anyone's
behalf.

## §0 What I am

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**, in a worktree its workflow created,
  under a brief its workflow wrote. A0 chose the questions. Where I went beyond them, I say so.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the
  cross-vendor condition, so that is not by itself a bar. It is still a real limit on independence.
- Whether this file counts as the Reviewer signature RFC-2026-002 requires is the **Integration Owner's
  and the Product Owner's** act. I do not decide it.

## §1 Verdict

My nine findings on `782df87` are closed by the round, eight fully. I re-measured each one I had measured
and read the rest:

- **C0-1 (MEDIUM) is closed.** The btree and NULLS readings work. My dA (HASH worker claim plus
  `DESC NULLS LAST` audit keyset) and dB (BRIN workspace switch) now fail `migrate-clean` by name, where
  before they passed every layer. I also tried a new drift, dN: the worker-claim index rebuilt
  `ASC NULLS FIRST`. It exercises the other NULLS token, and it fails by name too.
- **C0-8 is closed.** A BEFORE INSERT trigger on `performance_snapshots` (dT) fails rule 5 by name.
- **C0-4 is closed.** On a database that `rls-smoke` has used, the harness exits 2 before its first write.
  The sequence and the database size did not change.
- **C0-2, C0-3, C0-5, C0-6 and C0-7 are closed in the text.** No `WS:905-908` or `WS:910` citation is left
  outside the review records that quote them. Q150-a..e each have real alternatives and a "no" consequence,
  and the new ERD and DR citations are exact.

**C0-9 is closed only in part, and that is my one new finding of weight (R-1, MEDIUM, measured).** The new
parsed guard `testHostRefusal` reads the query string through WHATWG `URL`, which treats `#` as the start of
a fragment. libpq has no fragments. So `postgresql://postgres@127.0.0.1:5505/postgres#?host=/elsewhere`
passes the guard, and libpq then connects by the `host` parameter. I measured this with the harness and with
`db-reset-test`; both went to the other socket. The README, the plan §10.2 and the handoff say the URL "may
carry no `host` … parameter", which this URL measurably does.

The defect is not a regression. Main's text match admits the same URL. It is not stop-the-line: the variable
is the operator's, and nothing reached any host but a missing local socket. But it is a closure claim that is
false. The fix is one line plus one test URL, so I recommend fixing it before the merge.

Two INFO findings concern records.

The guards pass on the branch name: scope 0, `npm run verify` 0 (684/684) and `check:handoff` 0.
`migrate-clean` reports every probe "refused each of its N drifts" (5, 2, 2, 3). `rls-smoke` gives 1079
cases and 6 claims, twice on one database.

## §2 Measured vs read

Setup:

- Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin` first on the PATH), with `node -v` printed in
  every script before every measured run.
- PostgreSQL 17.11 from `/opt/homebrew/bin`, with a fresh `initdb --locale=C -A trust -U postgres` every
  round.
- 127.0.0.1:5505 only, TCP only (`-c unix_socket_directories=''`), with `LC_ALL=C`.
- `PGHOST`, `PGHOSTADDR`, `PGSERVICE` and `PGSERVICEFILE` unset.
- The shim `db/foundation/ci/supabase-shim.sql` applied first, then
  `DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres`.
- Private directory `scratchpad/c0-150-prereqr2/`.
- Each drift was appended to `db/foundation/migrations/140_audit.sql` and restored byte for byte. sha256
  `2ac596bb950e8dfb…` before and after every round.

**The guards on the branch name.** The subject branch is checked out in other worktrees (`wf_6dce59ae-fd8-1`,
`-5`, `-8`). I checked it out here with `git checkout --ignore-other-worktrees`, confirmed
`git branch --show-current` = `agent/claude/WP-0A-DB-00-batch-150-prereq` at `00284c0`, made no commit on it,
and switched back to `recheck/c0-batch-150-prereq` before committing this file.

| What | Command | Exit | Output |
|---|---|---|---|
| scope | `node scripts/verify-branch-scope.mjs b5f53c3 WP-0A-DB-00` | 0 | "all 20 changed path(s) are declared, and every amendment explains one" |
| suite | `npm run verify` | 0 | "clean: exit 0 -- tests 684, pass 684, fail 0" |
| handoff | `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| floor | the guard's own `stripNonCode` and `\bassert\.\w+\(` over `foundation-contract.test.mjs` | -- | 898 assertions, 80 tests (the floor 878 → 898 is the guard's count; no test added) |
| manifest | `test-kits/integrity-manifest.json` | -- | 88 digests; the three probe digests in the static test are `b54ae8e9c8c7f6ce`, `3c643bfe1fcfb040` and `ae187b635c0ae0f4`, as the commit says |
| remote | `origin/agent/claude/WP-0A-DB-00-batch-150-prereq` | -- | `00284c0` (the push landed; whether it was a fast-forward I read from the ancestry: `782df87` is an ancestor) |
| clean | `make db-schema-lint` / `db-migrate-clean` | 0 / 0 | pinned shape "32 constraints, 18 indexes, 4 policies and 0 non-internal triggers … (no column is pinned) (refused each of its 5 drifts)"; vocabulary 60 (2); policy set 209 / 44 (2); index coverage "valid whole btree index … 4 exempt … 28 declared lookups … in order, direction and NULLS order (refused each of its 3 drifts)"; post-migrate 49 / 37 / 12; 5.1 s |
| harness | `--scale small`, fresh migrate-clean, before rls-smoke | 0 | the plans as plan §5's shapes at this scale; rolled back |
| clean | `make db-rls-smoke`, twice on the same database | 0 / 0 | 1079 isolation cases; 6 claims |
| harness | `--scale 0.2` on that used database | **2** | "ws905 harness refuses a database that is not empty (run it on a fresh migrate-clean, before rls-smoke): app.assets, app.audit_logs, …"; `usage_events_id_seq` 2003 and `pg_database_size` 21034675 before and after the refusal, `workspaces` 2 rows (nothing written) |
| guard | harness and `make db-reset-test` with `…/postgres?host=/nonexistent-c0-dir` | **2** / **2** (make) | "refuses this host: it carries a host parameter …" (C0-9's `?host=` case, closed) |
| guard | the same with `…/postgres#?host=/nonexistent-c0-dir` | **1** / **2** (make) | **not refused**: `psql: error: connection to server on socket "/nonexistent-c0-dir/.s.PGSQL.[redacted]" failed` from both tools (R-1); `app` and `private` still present afterwards |
| guard | `psql "postgresql://postgres@127.0.0.1:5505/postgres#?host=/nonexistent-c0-dir"`, no server running | 2 | the same socket error: libpq takes `?host=` after a `#` (R-1) |
| guard | `testHostRefusal` in node | -- | `…#?host=…` → null; `…#x?hostaddr=10.0.0.1` → null; `…?ho%73t=/x` → refused; `127.1` → refused; `[::1]` → null |
| dA | HASH `jobs_available_at_idx` + `DESC NULLS LAST` `audit_logs_workspace_keyset_idx` | sl 0, **mc 2**, rs 0 | "declared lookup(s) or keyset cursor(s) no valid index begins with: audit_logs keyset (…) on app.audit_logs (…); worker claim on app.jobs (available_at)". It was 0 / 0 / 0 at `782df87`. |
| dB | BRIN `workspace_members_user_id_status_idx` | sl 0, **mc 2**, rs 0 | "RLS predicate column(s) with no supporting index …: app.workspace_members.status". It was 0 / 0 / 0. |
| dN (new) | `jobs_available_at_idx` rebuilt `(available_at nulls first)` | sl 0, **mc 2**, rs 0 | "… worker claim on app.jobs (available_at)": the ` NULLS FIRST` token works |
| dT | a BEFORE INSERT trigger on `app.performance_snapshots` | sl 0, **mc 2**, rs 0 | "trigger(s) on a pinned shape table not exactly its pinned definition: unlisted or changed: app.performance_snapshots.c0_shape_trg" |

**Read, not measured:**

- the diff `782df87..00284c0` in full, and the code part of `b5f53c3..00284c0` again where the round touched
  it (`run.mjs` 6g and rule 5, `psql-driver.mjs`, the harness, the fixture header, the static blocks around
  `foundation-contract.test.mjs`:114-153 and :2707-2739);
- plan §6, §6.1, §7 and §10, and disposition §5;
- blockers 179, 185 and 194, compared to main and to `782df87` in node. 179 and 185 are still prefix
  extensions of main's text, and 194 is changed in place, which is allowed because it is new on this branch;
- the handoff's `known_limitations`, `tests` and `security_privacy_cost_impact`;
- the two commit messages;
- WS:905-917, ERD:278-282 and DR:160-164 (the new Q150-c citations are exact: ERD:280 is the unassigned
  "DB performance owner", DR:161 is MOD-120's 115-129, and DR:163 is MOD-140's 140-180, "A6 with A0
  contract");
- the phase plan's correction table (`a0-phase-plan-141-170-2026-10-03.md`:20).

Not re-done: C0-5's 16-table count is read from the static test, which passes. I measured it myself at
`782df87`.

## §3 The questions, answered

**Do the new pins match survey items 5-7 exactly? Are the remaining gaps recorded?** Yes.

- Items 5-7 are as I found them at `782df87`. Nothing in the round loosened a pin.
- The round adds rule 5: every non-internal trigger, by `pg_get_triggerdef` and `tgenabled = 'O'`, both
  ways, with an empty set today. That closes my C0-8, and dT measures it.
- The remaining gaps are recorded: columns (F7, blocker 194 (4), now saying that triggers are pinned and
  columns are not), the selector's limits (F6), the policy set reading policies only (F8), and the generators
  (F10).
- One thing I noticed in passing: the older trigger probe already refuses a disabled trigger, internal ones
  included. So rule 5's `tgenabled` check overlaps with it rather than leaving a gap.

**Is the index-coverage probe's scope honest, and its exemption list?** Yes, now.

- Rule 1's `runs` and rule 2's `idx` both join `pg_am` and read `amname = 'btree'`.
- Rule 2's token carries ` NULLS FIRST` / ` NULLS LAST` exactly when `indoption & 3` is 2 or 1. Those are the
  two non-default combinations, and I checked the bit logic against the PostgreSQL encoding.
- dA, dB and dN measure it.
- README rule 21 now says what "served" means and does not mean: an index of that shape exists, not that the
  query plans through it. It cites F2, which is A1's S5.
- The exemption list is unchanged and was honest before.
- Mutant C10 (rule 2 counting invalid indexes) is held only by a static regex. That is stated in plan §10.2
  and in `known_limitations`.

**Does the fixture follow the documented shape, and is the harness honest about p95 and CI?** Yes.

- The citations are now WS:911 for the fixture and WS:913-915 for the budgets, which matches the doc.
- The harness header and the README now state the precondition (a fresh migrate-clean, before rls-smoke),
  which the measured exit 2 enforces.
- They also state the traces a rollback leaves (sequences, `reltuples`, dead tuples and WAL), and I saw the
  sequence advance by 2000 across a small run.
- No timing is asserted, and it is not in the Makefile or CI (static, unchanged).

**Are Q150-a..d framed with real alternatives?** Yes, and so is the new Q150-e.

- Each has "Other options" and "If the answer is no" (disposition §5).
- Q150-c names the three rival owners with exact citations.
- F2 is its own question, not routed to the SLO question.
- Every Q is UNANSWERED.

**Are the claims in commits, plan, disposition, blockers and handoff true?** Yes, except for two things:

- **The closure claim for the host guard (R-1).** README:738, the plan's §10.2 row "S1, Q-4, C0-9" and the
  handoff's `security_privacy_cost_impact` each say the URL may carry no `host` parameter. A `#?host=` URL
  does carry one, and libpq honours it.
- **Blocker 194 (1)'s opening clause (R-2).**

What I re-measured or read and found true:

- the 684 tests, the floor 898, the 88 digests and the three probe digests;
- the drift counts 5 / 2 / 2 / 3;
- "0 non-btree indexes" (nothing that passed is refused: the clean set exits 0);
- the measured exits A0 reports for dA, dB and dT (I re-ran these as my own rounds);
- the harness refusal, with the sequence and size unchanged;
- the cherry-pick map (`9aec4f8`, `0805728` and `af4bb79` each add one file);
- that the handoff commit `00284c0` is last and alone, and cites `7717c81` as `head_revision_or_patch_checksum`;
- the not-done list's reasons (they match blocker 194 (12) and (13)).

## §4 Findings

Grades: STOP-THE-LINE / HIGH / MEDIUM / LOW / INFO. A remedy is a recommendation, not a decision.

### Status of my findings on `782df87`

| Finding | Status | How I know |
|---|---|---|
| C0-1 MEDIUM, HASH / BRIN / NULLS LAST "served" | **closed** | measured: dA, dB, and the new dN, all mc 2 by name |
| C0-2 LOW, WS citations six lines early; F11 | **closed** | read and grep: none left outside the quoting review records; F11's sentence struck in place |
| C0-3 LOW, Q150 single proposals; F2 without a Q | **closed** | read: alternatives and "no" for each Q; Q150-e; citations checked |
| C0-4 LOW, the harness fails on a used database | **closed** | measured: exit 2 before the first write, sequence and size unchanged |
| C0-5 LOW, "13 tables" | **closed** | read; the static test that counts 17 rows on 16 tables passes |
| C0-6 INFO, blocker 194's pointers | **closed** | read: §6 and §6.1, the `git mv`, and §10; 185 cites plan §4 |
| C0-7 INFO, §0.1's line | **closed** | read: §10.2 records the current lines (`run.mjs`:1494 checked) |
| C0-8 INFO, no trigger pinned | **closed** | measured: dT, mc 2 by name |
| C0-9 INFO, unanchored host allowlist | **partly closed**: R-1 | measured: `?host=` refused; `#?host=` admitted |

### R-1 MEDIUM: `testHostRefusal` misses a query string after `#`, which libpq honours (measured)

**Where.** `scripts/db/psql-driver.mjs`:37-49. Line 46 reads `parsed.searchParams`. The guard is used at
`scripts/db/run.mjs`:3602 (`db-reset-test`, which drops `app` and `private`) and at
`scripts/db/explain-harness.mjs`:174.

**What happens.** WHATWG `URL` treats everything after the first `#` as a fragment, so `searchParams` is
empty for `postgresql://postgres@127.0.0.1:5505/postgres#?host=/elsewhere`. The authority regex stops at `#`,
so the authority check passes as well. libpq's URI parser has no fragment. It reads the dbname as
`postgres#` and then takes `host=/elsewhere` from the query.

**Measured.**

- `testHostRefusal` returns `null` for `…#?host=…` and for `…#x?hostaddr=10.0.0.1`.
- psql 17.11 tried `/nonexistent-c0-dir/.s.PGSQL.5505`.
- With that URL in `DB_TEST_URL`, the harness exited 1 and `make db-reset-test` exited 2. Both failed
  connecting to the other socket, not on the guard. `app` and `private` were still present afterwards.
- The value `/nonexistent-c0-dir` was printed unredacted. A1's S6 redaction reads `searchParams` too, so it
  misses this value for the same reason.

**Grade.** MEDIUM, as A1 graded S1. This is the same class, and it is the claim the round made about closing
it.

**Not stop-the-line.** `DB_TEST_URL` is set by the operator. Main's text match admits the same URL, so this
is no regression. Nothing reached any host but a missing local socket.

**Records it falsifies.** README:738 ("it may carry no `host` … parameter"), plan §10.2's S1 row, and the
handoff's `security_privacy_cost_impact`.

**Remedy.**

1. Refuse any URL that contains `#`. libpq gives it no meaning, so a test URL never needs it. Alternatively,
   read the query from the raw text after the first `?`, split on `&`, and percent-decode the keys, which is
   what libpq does.
2. Add `…/postgres#?host=…` and `…#x?hostaddr=…` to the crafted list in `foundation-contract.test.mjs`:119-134.
3. Make the redaction read the same parsed parameters.

### R-2 INFO: blocker 194 (1) still opens "owner … under Q150-d (Product/Ops)"

`work-packages/WP-0A-DB-00.json`:447, item (1). The clause starts "F2, owner batch 150's author under Q150-d
(Product/Ops)" and only later says that F2 is Q150-e (Owner). Plan §6.1 and disposition §5 say Q150-e (Owner)
only. Someone who reads only the opening clause gets the wrong owner and question.

**Remedy.** Make the opening clause read "under Q150-e (Owner)". Blocker 194 is new on this branch, so
editing it in place is allowed.

### R-3 INFO: the shared guard also widens `db-reset-test` to `[::1]`

`TEST_HOSTS` (`psql-driver.mjs`:35) admits `[::1]`. Main's text match never admitted it. It is loopback, so
it is harmless. Blocker 194 (13) puts the reset-test change to the Integration Owner but does not name this
widening; only the README lists the host.

**Remedy.** Name it in (13), so that the Integration Owner accepts it knowingly.

## §5 Stop-the-line verdict

**None.**

- No secret, no tenant leak, no duplicate side effect, no lost job and no migration divergence.
- No migration, policy, index or grant is added.
- R-1 reached only a missing local socket.
- Every drift I appended was restored byte for byte.

**Merge.** Nothing I found is a regression against main, so nothing of mine blocks the merge as such.
R-1 is a false closure claim on a guard for a target that drops schemas, and the fix is small. I recommend
fixing it before the merge, or at least correcting the three records and naming it on blocker 194. Whether it
blocks is for the Owner and the Integration Owner to decide. The other preconditions stay as the disposition
and the handoff say:

- A1's and Q0's re-checks;
- a green required CI run on the head;
- the RFC-2026-025 §5 Integration Owner evidence.

## §6 Limits

- **Same vendor, same family, spawned by the Author, with a brief from the Author's workflow (§0).**
- **Narrow.** I re-measured my own findings, plus one new drift (dN) and the guard's URL handling. I did not
  re-run A1's or Q0's drifts beyond the ones that overlap mine (dA = Q0's L2-L4 class, dT = A1's T2 shape). I
  did not search exhaustively for other URL forms libpq accepts and WHATWG reads differently. `#` is the one I
  found.
- **Harness scale.** I ran the harness at small scale only (fresh database) and at 0.2 against a used database
  (refused before any write). The full WS:911 scale is unmeasured here, as before.
- **One server build.** PostgreSQL 17.11. CI's `postgres:17` is inferred.
- **No GitHub verification.** I did not check CI's status on `00284c0` or the PR body on GitHub. The remote
  ref was read from the local `origin/` ref after a fetch.
- **Cleanup.** The cluster on 127.0.0.1:5505 was stopped and its data directory removed after every round and
  at the end. Port 5505 is free. Ports 5432 and 5499, and every other run's port, were not touched.
  `140_audit.sql` is byte-identical to the head (`2ac596bb950e8dfb…`). Scratch files stay in
  `scratchpad/c0-150-prereqr2/` and are not in the repository.
