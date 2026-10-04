# C0 contract review re-check: batch 150's review round

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00` |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-150` (PR #173, Draft) |
| Subject head | `218f91fea707cda869f7ceceb47a85aa8a737afb` (handoff refresh), over code `2492ae98916b12bc98ede97bcf0c1535777cebd0` |
| Previous reviewed head | `c0fa18e80c0f7b84ea5a059e171a1c2502b64e95` (my review: `c0-batch-150-contract-review-2026-10-03.md`, cherry-picked here as `b073813`) |
| Base | `1930f41` (`main`) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (file named for the batch date, 2026-10-03) |
| Reviewed in | local branch `recheck/c0-batch-150`, created at `218f91f` in a worktree. The guards that read the branch name were run with the subject branch NAME checked out (§2). |
| Scope | NARROW: the review-round diff `c0fa18e..218f91f` against my nine findings, plus what that diff newly claims. |

This document records review findings. It advances no status, approves nothing, and signs nothing on
anyone's behalf.

## §0 What I am, before anything else

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**, in a git worktree A0's workflow
  created, under a brief A0's workflow wrote. A0 chose the questions and the narrow scope.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the
  cross-vendor condition, so that is not by itself a bar; it is still a real limit on independence.
- Whether this file counts as the Reviewer signature that RFC-2026-002 requires is for the **Integration
  Owner and the Product Owner** to decide. I do not decide it.

## §1 Verdict in one paragraph

The review round answers all nine of my findings, and every correction I could measure holds. The
partition path 150 now records is the one PostgreSQL 17.11 accepts, and its end state is as stated (the
attached partition reads `attidentity = 'a'`, 4 rows through the parent). Check 2 now refuses a bare
unique index, an expression unique index, an `INCLUDE (metric_time)` index and a `unique (id)` constraint,
each by name. Q0's mutant M5ab now fails both migrate-clean and the static suite. The guards pass on the
branch name: scope 0, verify 0 (684/684), check:handoff 0. Blocker edits are pure appends. Migration 150 is
still a correct forward change of 121's table, and it is not integrated, so editing it in place is
legitimate. I found **nothing stop-the-line**. Two new findings: **one LOW** (the accepted-property
sentence overstates who can write `id`, and it sits in a catalog comment) and **one INFO** (a stale line
count in the plan). The LOW is cheap to fix before the merge and becomes a forward migration after it,
like C0-1 was.

## §2 Measured vs read

Setup for every live round:

- Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`), `node -v` printed before each measured run. A
  PATH Node 26 exists and was not used.
- PostgreSQL 17.11 from `/opt/homebrew/bin`; a fresh `initdb --locale=C -A trust -U postgres` per round;
  127.0.0.1:5505 only, TCP only (`-c unix_socket_directories=''`); `LC_ALL=C`; the shim
  `db/foundation/ci/supabase-shim.sql` first; `DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres`.
- Private directory `scratchpad/c0-150r2/`.
- `140_audit.sql` (sha256 `2ac596bb950e8dfb…`) saved before every round, drifts appended, restored byte for
  byte; the hash matched after every round.

**Guards on the branch name.** The subject branch is also checked out in other worktrees (`-6e3-1`,
`-6e3-5`, `-6e3-8`). I checked it out here with `git checkout --ignore-other-worktrees` at `218f91f`, made
no change and no commit on it, then switched back to `recheck/c0-batch-150` before writing this file.

| What | Command | Exit | Output |
|---|---|---|---|
| cherry-picks | `git diff 607cf5d~1 607cf5d` vs `b073813~1 b073813`; tree diffs `4a08b8a..9c6da72`, `63d4d5f..c2e713c` | -- | C0 patch byte-identical; A1 and Q0 files identical (the tree diffs differ only by the files stacked above). Each carries `(cherry picked from commit …)`. |
| scope | `node scripts/verify-branch-scope.mjs 1930f41 WP-0A-DB-00` | 0 | "all 19 changed path(s) are declared, and every amendment explains one" (the handoff's recorded 19 matches) |
| handoff | `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| suite | `npm run verify` | 0 | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |
| floor | `stripNonCode` + `/\bassert\.\w+\(/g` on foundation-contract, at `c0fa18e` and at head | -- | 929 → **932**; 80 tests at both. Exact. |
| manifest | `test-kits/integrity-manifest.json` `files` | -- | 88 digests, as plan §11.3 says |
| blockers | node: `open_blockers` at `c0fa18e` vs head (and vs `1930f41`) | -- | 195 = 195; only [179], [193], [194] change, **each a pure append** over both bases. The only other WP field changed is `ownership.amends_without_owning.rationale` (17 → 16, a rationale, as A0 declares). `"open_blockers"` opens at WP:252, so `[i]` is at 253+i, as §11.3 says. |
| r1 clean | `make db-migrate-clean`; `make db-rls-smoke` twice | 0 / 0 / 0 | "applied 150_performance_snapshots_key.sql"; data classification "… exactly the 71 column reads … (self-test: refused each of its 4 drifts …)"; pinned shape 32 / 18 / 4 / 0, 5 drifts; post-migrate **50 / 38 / 12**; "1079 isolation case(s) passed" and "6 claim(s)" twice |
| catalog | psql on r1 | 0 | key `PRIMARY KEY (id, metric_time)`; 4 fixture rows; the table comment holds the new "It is not an attach alone" and not the old "attached, not a rebuild"; the key comment holds "id ALONE IS NOT UNIQUE" |
| attach A | parent `like … partition by range (metric_time)`, `id` ALWAYS identity, key `(id, metric_time)`; attach the table; rolled back | **ERROR** | `table "performance_snapshots" being attached contains an identity column "id"` / `The new partition may not contain an identity column.` |
| attach B | `alter column id drop identity` on the table; the same parent; attach; `setval` to `max(id)`; rolled back | 0 | attached; child `attidentity = 'a'`, parent `'a'`; **4 rows through the parent**; `setval` 4; child `relkind 'r'`. 150:19-27's path and its end state hold. |
| id writers | `has_column_privilege(role, 'app.performance_snapshots', 'id', 'INSERT'/'UPDATE')` over `pg_roles` | 0 | true for **`postgres`** (owner, superuser) **and `pg_write_all_data`** (predefined, 0 members on this cluster); no other role (C0-R1) |
| id writes | as owner: copy a row with `metric_time + 1s`, `insert … overriding system value`; rolled back | 0 | accepted; `id 1` now on 2 rows (C0-5's accepted property, as 150:32 says) |
| id writes | as owner: `update … set id = 999`; rolled back | **ERROR** | `column "id" can only be updated to DEFAULT` (ALWAYS identity) |
| id writes | `set role app_worker; insert … (id) overriding system value`; rolled back | **ERROR** | `permission denied for table performance_snapshots` |
| E1 (mine) | `create unique index probe_ps_id_uq on app.performance_snapshots (id);` appended to 140 | sl -- / **mc 2** | "150_performance_snapshots_key.sql: a unique key on app.performance_snapshots does not carry metric_time: index probe_ps_id_uq (P0001)" (at `c0fa18e`, 150 passed it) |
| E5+E6+M2 (mine, one round) | unique index `((id))` (expression), unique index `(id) include (metric_time)`, constraint `unique (id)` | **mc 2** | "… does not carry metric_time: index probe_ps_expr_uq, index probe_ps_incl_uq, probe_ps_id_ukey (P0001)": all three named by check 2 |
| M5ab (Q0's mutant) | `run.mjs` `projectionFound`: column list to `['SELECT', 'REFERENCES']`, table list to `['DELETE']` (both interpolations); restored from a saved copy, `cmp` equal | **mc 2** | "its self-test after drift 3 was refused without naming authenticated UPDATE (progress_stage) on app.jobs, anon INSERT (id) on app.outbox_events, authenticated TRUNCATE on app.consumer_ledger, authenticated TRIGGER on app.billing_webhook_receipts" |
| M5ab static | `node --test test-kits/db/foundation-contract.test.mjs` on the mutant, then again with the data classification digest set to the mutant's (`07bf97b8c5fd9efa`, the "digests refreshed" form); test file restored, `cmp` equal | 1 / 1 | first: the digest assertion; second: "rule 3 reads SELECT, INSERT, UPDATE and REFERENCES per column of a projection table, both ways". The mutant is killed by the regex, not only by the digest. |
| r2 clean | fresh cluster after both restores: `db-migrate-clean`; `db-rls-smoke` twice | 0 / 0 / 0 | post-migrate 50 / 38 / 12; `git status` clean |
| Q-ids | `grep -rhoE "Q1(4…7)[0-9]-[a-z]"` over `evidence/WP-0A-DB-00/` | -- | exactly 16 distinct ids, as disposition §7 says |
| quote | disposition §5 Q150-b vs `…-batch-150-prereq.md`:103 | -- | "**Yes.** The 150 migration waits; the fixture, harness and probes land now." verbatim |

**Read, not measured:** CONTRIBUTING_AGENTS.md; the commit messages of `2492ae9` and `218f91f`; the whole
diff `c0fa18e..218f91f` (code, README, lint files, plan §0.2, §1, §2, §3, §7, §8 and the new §11,
disposition §1-§2, §5 and the new §7, the three appended blockers, the handoff's changed fields).

**Not re-run:** A0's Q3 drift as a later file (the widen drift in the self-test makes the same four grants,
and r1/r2 show it refused); the harness (only comments and a `source` string changed, as A0 says; the query
text is unchanged, and C0-3's measurement is mine from the first review).

## §3 The questions, answered

**Is 150 a correct forward change of 121's table?** Yes, unchanged from my first review. The round edits
150 in place, which is legitimate: 150 is not on `main` (`1930f41`) and is declared on the not-applied tail,
so CONTRIBUTING_AGENTS.md:39 ("never rewrite an integrated migration") does not apply. No other migration is
touched; `pinned-shapes.json` and the pinned shape digest do not move (no pinned text moved). The new
check 2 is strictly stronger (§2 E1, E5, E6, M2), and post-migrate stays 50 / 38 / 12.

**Does it match §4.8 partition readiness and Q150-a as answered?** Yes, and now in mechanism too. The
recorded path (drop identity, parent with identity, attach, restart above `max(id)`) is the one the server
accepts, and its end state is right (B). One correction to **my own** C0-1: I wrote that the working path
"contradicts 150 check 4 and 121 block 10". That is true only between the DROP IDENTITY and the ATTACH. At
the end state the partition reads `attidentity = 'a'` again, so those two checks would hold; what a
partitioning batch must supersede is 150's check 3 (no partition) and whatever of 121's block reads the
table as unpartitioned. A0's wording ("supersedes this file's block … and whichever of 121's block it no
longer satisfies") is more accurate than my remedy was.

**Is the disposition a faithful verbatim transcription with all the answers, and are the other roles'
acceptances honestly recorded as owed?** Yes. The count is now 16 in the title, :7, :19, :35 and §5's
heading; the Owner's words are untouched; the new §7 states what changed and what cannot be checked (A0's
phase-end summary). Q150-b is now quoted in full and the deferred migration's missing number is recorded as
owed to A1 and the Integration Owner. Every "remains owed" row is unchanged. The pushed messages of
`2318c72`/`4b252d4` still say 17; the correction is in `2492ae9`'s body, which is the right way.

**Is the Q170-d projection allowlist faithful to ERD §9.1?** Yes. The 71 reads are unchanged. SP-4 is an
honest reading of `deep_link_target_ref` (A1's measurement; I did not re-measure the pattern), and the old
review sentence that said the column "cannot carry … a provider identifier" is corrected. The stated limit
(rule 17 is about table and column privileges only) is now in README rule 17 and the `run.mjs` comment.

**Are the claims TRUE?** Every number I re-ran reproduced: 932, 88, 19, 684, 50 / 38 / 12, 1079 twice,
E1 and M2 (named), M5ab (mc 2 and static), the attach refusal and path. Exceptions: C0-R1 and C0-R2 below.

**Status of my first-review findings**

| Finding | Grade | Status | Evidence |
|---|---|---|---|
| C0-1 partition path | MEDIUM | **Resolved** | 150:19-27 (header), :99-104 (catalog comment), :125 hint; `[179]` appended, its identity/attach half OPEN; README rule 18. Measured (attach A, B; catalog). |
| C0-2 "17" | LOW | **Resolved** | disposition, plan :11 and §8, WP rationale, handoff; 16 ids measured |
| C0-3 binding claim | LOW | **Resolved** | plan §3, `explain-harness.mjs`:83-89 (the binding note at :84), `[194]` (1), handoff `known_limitations` |
| C0-4 Q150-b shortened | LOW | **Resolved** | disposition §5 Q150-b verbatim; `[194]` (2) |
| C0-5 `id` alone not unique | INFO | **Resolved as an accepted property**, see C0-R1 for its wording | 150:29-34, :84-86; README rule 18; `[194]` (14) |
| C0-6 check 2 constraints only | INFO | **Resolved** | 150:128-147; static regex; E1, E5, E6, M2 measured |
| C0-7 wording | INFO | **Resolved** | 150:46-50, :55-59; plan §2 |
| C0-8 stale "rebuild" | INFO | **Resolved** | `explain-harness.mjs`:100, `index-coverage.json`:180; no stale string left (grep) |
| C0-9 handoff promise | INFO | **Resolved** | plan §0.2 |

## §4 New findings

### C0-R1 (LOW, measured): "no role but the owner holds INSERT or UPDATE on `id`" is not true as written, and it is in a catalog comment

- **Where.** `150_performance_snapshots_key.sql`:84-86 (the **catalog** comment on
  `performance_snapshots_pkey`: "only the identity and the fact that no role but the owner holds INSERT or
  UPDATE on id keep it unique"); the header :30-31; `db/foundation/README.md`:642-643; the handoff's
  `security_privacy_cost_impact` (:167). `[194]` (14) and the handoff's `known_limitations` (:177) already
  name `pg_write_all_data` as unmeasured, so they are consistent with the measurement; the comment is not.
- **Measured.** On the fixture, `has_column_privilege(…, 'id', 'INSERT')` and `'UPDATE'` are true for the
  owner `postgres` **and for the predefined role `pg_write_all_data`** (0 members here). A superuser
  bypasses grants anyway. On the other side, UPDATE of `id` is refused **even for the owner** ("column "id"
  can only be updated to DEFAULT"), so the real duplicate route is INSERT … OVERRIDING SYSTEM VALUE by the
  owner, a superuser or a `pg_write_all_data` member.
- **Why it matters.** Nothing leaks and no role on the fixture can use the route except the owner. But the
  sentence is a stated guarantee about roles, written into the catalog, and A0's own not-done item says the
  platform's roles (Supabase's, `pg_write_all_data` members) are exactly what Q170-c has not measured. Once
  150 is integrated, correcting the comment needs a forward migration (the same reason C0-1 was fixed
  before the merge).
- **Remedy (before merge, while 150 is not integrated).** Reword the key comment, the header and README
  rule 18 to what was measured, for example: "kept unique only by its ALWAYS identity: UPDATE of id is
  refused to every role, and INSERT with OVERRIDING SYSTEM VALUE is open only to the owner, a superuser or a
  member of pg_write_all_data (none on the fixture; the provisioned instance is Q170-c's)". Mirror it in the
  handoff's `security_privacy_cost_impact`.

### C0-R2 (INFO, read): plan §1 still says 150 is "139 lines"

- **Where.** `a0-batch-150-plan-2026-10-03.md`:120 ("`150_performance_snapshots_key.sql` (new, 139
  lines)").
- **Measured.** `wc -l` at head: 177 lines.
- **Remedy.** "(new; 177 lines after the review round)", or drop the count. Can ride with C0-R1.

## §5 Stop-the-line verdict

**None.** No secret, tenant data or client reach changes; no integrated migration is edited (150 is not
integrated and is declared not applied); no migration divergence, contract mismatch, lost job or
irreversible deletion. The guards pass on the branch name.

**Does anything block the merge?** Nothing stop-the-line. I recommend fixing C0-R1's wording **before** the
merge, for the cost reason above; it is a record correction, not an incident. C0-R2 can ride along. The
merge decision itself, and whether the role acceptances the disposition records as owed are met, are the
Integration Owner's and the Product Owner's, not mine.

## §6 Limits

- One PostgreSQL version (17.11). Before 17 a partition could carry its own identity column, so the attach
  refusal, and the recorded path's end state, are 17 behaviour; the provisioned instance's version is still
  Q170-c's to measure. The comments say "PostgreSQL 17.11", which is accurate.
- The attach experiment built the parent with `like … including defaults`, not from a migration the later
  batch will write. It shows the path and its end state; it does not design policies, grants or comments
  on a parent.
- I did not re-measure A1's SP-4 pattern, Q0's M2d, A0's Q3 as a later file, or the harness.
- `pg_write_all_data`'s membership was read on the fixture only (0 members).
- Narrow scope: I read the review-round diff, not the whole batch again; my first review covers the rest.
- Everything in §0 applies.

## §7 Cleanup

- Every round used a fresh `initdb` under `scratchpad/c0-150r2/pgdata`, removed before the next round and
  after the last (`cluster.sh down`). After the last round `lsof -iTCP:5505 -sTCP:LISTEN` returned nothing.
  Ports 5432, 5499 and 5507 were not touched.
- `140_audit.sql` was restored byte for byte after every round (sha256 `2ac596bb950e8dfb…` each time).
  `scripts/db/run.mjs` and `test-kits/db/foundation-contract.test.mjs` were restored from saved copies
  after M5ab (`cmp` equal; `git status` clean).
- The subject branch was checked out by name only to run the three guards and was left as found. This file
  is the only change, committed on `recheck/c0-batch-150` and not pushed.
