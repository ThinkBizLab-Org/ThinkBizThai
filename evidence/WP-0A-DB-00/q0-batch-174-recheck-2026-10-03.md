# Q0 independent test re-check of batch 174's review round (PR #185)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Date:** 2026-10-06. The file name
carries the phase's date, 2026-10-03, as every record of this phase does.
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-174`, head `3ab9ab5` (the handoff, last and alone) over the review
round's code commit `fb62e17`. The head I reviewed before was `d111326`, and the base is `600b48b`. Current `main` is
`e1fa28e`. **Author:** `/claude/a0_atlas`. **PR:** <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/185> (Draft).
**Re-checking:** my review `q0-batch-174-test-review-2026-10-03.md` (F1 to F5 and its §3 mutation table), against plan
§7 and disposition §6 (D11 to D14) as `fb62e17` wrote them.
**Recorded on:** my own branch `recheck/q0-batch-174`, created at `3ab9ab5`, in worktree `wf_f7b078b4-0cd-8`.

This file records findings. It advances no status, approves nothing, and fixes nothing.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, from the same vendor and model family as the Author. A0's
workflow wrote my brief and chose the questions, the port and the output file. A0 also wrote the change under test. My
independence is the independence RFC-2026-024 describes, and no more: separate run, worktree, branch, cluster and
evidence, not a separate mind. The Integration Owner and the Product Owner decide whether this record counts as the
Tester role's signature. I do not.

A previous Q0 re-check run was cut off before it wrote its evidence. Its logs remain in `scratchpad/q0-174r2/`. Below,
a claim is labelled **measured** (this run executed it), **carried** (the previous run measured it and its log is on
disk, but I did not re-execute it), or **read** (taken from the tree, not executed).

## 1. Measured vs carried

**Setup (measured, this run):** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`), printed before every round.
PostgreSQL 17.11 (Homebrew, `/opt/homebrew/bin`). Every round got a fresh `initdb --locale=C -A trust -U postgres` in
`scratchpad/q0-174r2/pgdata` on 127.0.0.1:**5503** only, TCP only (`unix_socket_directories=''`), with `LC_ALL=C`, and
the shim `db/foundation/ci/supabase-shim.sql` loaded first. Then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`
was set for `make db-migrate-clean` and `make db-rls-smoke`. I touched no other port.

A cluster that the cut-off run had left listening on 5503 (same data directory) was re-initdb'd by my first round. At
the end I stopped the cluster and removed its data directory. `lsof -iTCP:5503` then exited 1.

After every mutation the later file `175_q0_mutation.sql` was removed, and the code edits were reverted with
`git checkout`. `140_audit.sql` was compared with `cmp` against a copy taken before the run, and `cmp` exited 0 every
time. `git status --porcelain` was empty after every restore and before this file was written.

| what | label | result |
|---|---|---|
| `verify-branch-scope 600b48b` on the branch name | carried | exit 0 |
| `npm run check:handoff` on the branch name | carried | exit 0 |
| `npm run verify` on the branch name | carried (`verify.log`) | "clean: exit 0 — tests 692, pass 692" |
| throwaway merge with `main` `e1fa28e` | carried (`verify-merged.log`) | clean, 692 / 692 |
| base round migrate-clean | carried (`base1.migrate.log`) | post-migrate pass 55 / 39 / 16; pinned grant probe refuses its 12 drifts, pinned check probe its 2 |
| base round rls-smoke | carried (`base1.smoke.log`) | 1200 cases; 14 proofs discharged, 1 not run (`worker-login-authentication`) |
| D13 (`search_path = app,public`) | carried (`d13-without.out`) | silent with the executor's `search_path` line; without it, exit 3 with 31 missing and 31 unlisted |
| D12 (comment and plan wording on F1) | carried, and read by me | the isolation enqueue's comment (`tests/db/identity/isolation-cases.mjs:2710-2715`) now says no live target tells the two inserts apart, and that the static writer test holds the four columns |
| Q0 F3: pinned check digest `3ba8cd283ac50444` to `792a2204f6d7a5da` | carried, and read by me | the self-test drift now re-bounds to `{1,255}`; the digest comment records the reason |
| `open_blockers[202]` append-only; cherry-picked reviews byte-identical; 174 changed in comments only | carried | true |
| per layer (`layers.mjs`, all 12 drifts) | carried (`layers.out`) | matches my earlier round row for row (§2) |
| NC-base: app.jobs RLS off | carried (`mut.out`) | rls-smoke exit 2; `service-cannot-enqueue-a-job-row`: "The operation was permitted" |
| L-dropnotnull | carried (`mut.out`) | migrate-clean exit 2, pinned check probe (`app.jobs.actor_id`); rls-smoke exit 0 |
| the five remaining mutation rows | **measured** | §2 |

## 2. Mutation table (the remaining rows, on `3ab9ab5`)

**Method.** I used the earlier review's forms. An **L** mutation is a later file, `db/foundation/migrations/175_q0_mutation.sql`.
A **C** mutation edits code in place. For each one I ran a static `node --test test-kits/db/foundation-contract.test.mjs`,
then a fresh round (migrate-clean and rls-smoke), and then restored. For the C rows I also ran the explain harness or
the app.jobs negative control, as noted. migrate-clean stops at its first refusing target, so the per-layer column is
`layers.mjs`, carried from the previous run. That script runs every SQL catalog-rule probe and 174's apply-time block,
each on its own, on a migrate-clean base.

A later file always fails the same 19 static tests, because it moves the snapshot digest, the tail declaration and
`_how_measured`. I count those as generic. The table gives only the static failures beyond them.

| # | mutation | form | refused by (measured) | passed by (measured) | per layer (carried, `layers.out`) |
|---|---|---|---|---|---|
| 2 | **widen the CHECK**: `jobs_request_id_bounded` to `^.{1,255}$` | L | migrate-clean exit 2: pinned check probe, as built (`jobs.jobs_request_id_bounded`, P0001). rls-smoke exit 2: proof `job-names-its-tenant-context`, "request_id with a space: \"ok 1\", should be \"raised 23514\"" | static: generic 19 only | pinned check probe; 174's block ("jobs_request_id_bounded") |
| 3 | **revert a writer**: the isolation enqueue as main holds it (no four columns) | C | static exit 1, one test: "batch 174: … every writer names them". Negative control (app.jobs RLS off) exit 2, but the enqueue case now fails with **23502** ("null value in column \"actor_kind\""), not "permitted" | migrate-clean 0; **rls-smoke 0**; CI's app.jobs control would still be satisfied (`service-sees-zero-job-rows` fails either way) | n/a (no SQL drift) |
| 3b | **revert a writer**: the WS:905 fixture as main holds it | C | static exit 1, the same writer test; explain harness exit 1 (23502 on `actor_kind`) | migrate-clean 0, rls-smoke 0 (the harness is not run by CI) | n/a |
| 4 | **grant create on database** to `app_worker` (a `do` block, `format('… %I', current_database())`) | L | migrate-clean exit 2: pinned grant probe rule 10 ("app_worker CREATE on the current database"). Static: generic 19 **plus 2** ("a do-block the pass cannot extract is refused…", "the post-migrate plan covers every do-block…"), because the drift is an unregistered `do` block | rls-smoke 0 | rule 10 alone |
| 5 | **a stray EXECUTE**: `app.close_workspace(uuid,text,text)` to `app_worker` | L | migrate-clean exit 2: rule 11 ("unlisted: app_worker EXECUTE on app.close_workspace(uuid,text,text)"). rls-smoke exit 2, 1 of 1200: `the-worker-cannot-execute-the-closing-command` (it reached the function body and got a 42501 the suite attributes to no layer) | static: generic 19 only | rule 11 alone |
| 6 | **a policy TO a group role**: `q0_group`, `authenticated` a member WITH INHERIT, a SELECT policy `using (true)` on `app.content_ideas` | L | migrate-clean exit 2: permissive policy probe, client membership probe, pinned grant probe (membership). rls-smoke exit 2, 10 of 1200 (the policy leaks rows: `owner-a-cannot-see-the-content-idea-of-tenant-b`, `suspended-a-sees-zero-content-ideas`, eight `*-reads-no-row-of-any-family-*`) | static: generic 19 only | those three, plus the policy set probe and 174's block ("content_ideas.q0_group_reads (TO q0_group)") |

**Reading.** Every row matches the earlier review's table for the same row: the same layers refuse, and the same
layers pass. The review round changed only comments, a self-test's text and one static regex (§3), so nothing here was
expected to move, and nothing did. Every mutation that arrives as SQL is refused live, by migrate-clean and in three of
four cases also by rls-smoke. The two reverted writers are refused by the static writer test alone among the CI
targets. That is now what the code comment and plan §3 say (D12), so F1's overclaim is closed.

Two side observations, neither a finding:

- When a probe refuses the base state, its self-tests report "declares N drift(s) and N-1 were refused". This happened
  for L-widen, L-createdb and L-group. The self-test whose expected message differs is pre-empted by the as-built
  refusal. migrate-clean still exits 2 and names the drift, so this is noise, not a gap.
- C3's negative control tells the two writers apart in its message ("permitted" against 23502), but the CI control's
  pass condition does not read that message. This is F1's remedy (b), which was offered to the Integration Owner, and
  it is unchanged.

## 3. Findings

All three are info, carried from the previous run and re-read by me against the tree. None needs a code change before
merge.

### Q0R-174-1 (info): the static writer regex still misses some spellings of a write to app.jobs

`JOBS_INSERT` (`test-kits/db/foundation-contract.test.mjs:6054`) is
`/\binsert\s+into\s+(?:"app"|app)\s*\.\s*(?:"jobs"|jobs\b)/i`. C0-174-4 widened it to quoted, mixed-case and spaced
spellings. It does not see:

- `MERGE INTO app.jobs`;
- `COPY app.jobs`;
- an unqualified `insert into jobs` under a `search_path`;
- `insert/**/into`.

So a new writer spelled that way would not be required to name the four columns. At runtime the four NOT NULL columns
with no default still refuse such a writer with 23502 (C3 and C3b show the 23502 path), so it fails closed. The remedy
is optional: widen the regex, or state the limit next to it.

### Q0R-174-2 (info): plan §7 says VERIFICATION.md was re-recorded, but `fb62e17` did not touch it

`git show --stat fb62e17` lists eight files, and `evidence/VERIFICATION.md` is not among them. Its content (692 / 692)
is still true (carried, `verify.log`). Only the sentence's sequence is inaccurate. This is the same kind of item as my
earlier F5.

### Q0R-174-3 (info): the handoff's `known_limitations` omits A1-174-3 and A1-174-4

Those two items are stated as limits on `open_blockers[202]` (5), but not in the handoff's `known_limitations`. The
remedy is to add them on the next handoff refresh.

### Earlier findings, re-checked

| earlier | status on `3ab9ab5` |
|---|---|
| F1 (low): plan §3 overclaims what holds the enqueue's four columns | **closed** by D12's wording (read). Measured in row 3: the static test is the only CI layer that refuses it, as the comment now says |
| F2 (info): the proof executes one column's NOT NULL | accepted as a limit on `[202]` (5) (read); unchanged by measurement |
| F3 (info): `{1,256}` drift | **closed** (read; digest `792a2204f6d7a5da` carried) |
| F4 (info): the WS:905 writer is held by the static test and a harness CI does not run | unchanged, re-measured in row 3b; no remedy was asked for |
| F5 (info): VERIFICATION.md sequence | recurs as Q0R-174-2 |

## 4. Verdict

**Test re-check: the review round behaves as plan §7 and disposition §6 state it.** Every remaining mutation row is
refused by the same layers as in the earlier round. Findings: Q0R-174-1, Q0R-174-2 and Q0R-174-3, all info.

**Stop-the-line: no.** I found no secret exposure, tenant leakage, lost job, migration divergence or contract mismatch.
Every SQL mutation is refused live, and a writer that omits the four columns fails closed with 23502.

**Blocks merge: no.** Under the standing bar, Q0R-174-1 to Q0R-174-3 need a disposition by name, either a corrected
sentence or an accepted limit. None is a defect in the shipped behaviour. What remains owed is owed whatever this record
says: A1's explicit acceptance of `[202]` (2)'s narrowing at its re-check, the Integration Owner's call on the CI
negative-control change (F1 remedy (b)), and Integration Owner evidence.

## 5. Limits

- The guard commands, the merged-tree run, D12, D13, the base round, `layers.mjs` and the NC-base and L-dropnotnull
  rows are **carried** from the cut-off run's logs, not re-executed by me.
- The per-layer verdicts cover the SQL probes and 174's block only, not the JS-side layers (§2's method).
- C1 (drop NOT NULL in 174 itself) was started by the previous run and cut off. I did not repeat it. The earlier
  review's 1c row stands as that round measured it.
- The variant rows (2c, 4c, 5a, 5p, 5g, 5c, 6a to 6c, x) were not re-run. The review round touched none of the code
  they mutate, apart from F3's self-test text.
- Mutations were measured on migrate-clean clusters only, not on a provisioned instance.
- I am the Author's subagent (§0).
