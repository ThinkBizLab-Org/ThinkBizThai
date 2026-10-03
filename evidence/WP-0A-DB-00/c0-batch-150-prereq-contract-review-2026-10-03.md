# C0 contract review: batch 150's prerequisites

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00` |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-150-prereq` (PR #172, Draft) |
| Subject head | `782df87` (handoff refresh), over code `9d57cda` and records `00505b1` |
| Base | `b5f53c3` (`main`, PR #171's merge) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (file named for the batch date, 2026-10-03) |
| Reviewed in | local branch `review/c0-batch-150-prereq` at `782df87`, in a worktree. The guards that read the branch name were run with the subject branch name checked out (§2). |

This document records review findings. It advances no status, approves nothing, and signs nothing on
anyone's behalf.

## §0 What I am, before anything else

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**. I run in a git worktree that A0's
  workflow created, under a brief that A0's workflow wrote. A0 chose the questions I was asked. I went
  beyond them where I judged it necessary, but the framing is A0's.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the
  cross-vendor condition, so that is not by itself a bar. It is still a real limit on independence, and a
  reader should weigh it.
- Whether this file counts as the Reviewer signature that RFC-2026-002 requires is for the **Integration
  Owner and the Product Owner** to decide. I do not decide it.

## §1 Verdict in one paragraph

The batch does what the phase plan's "Batch 150 -- 3. Can do now" asks. It adds no migration, policy,
index or grant. The new pins match survey §6 items 5-7. Item 5: 121's constraints, indexes and both
policies are pinned by definition text, plus `relforcerowsecurity`. Item 6: 60 vocabulary CHECKs are
pinned by fixed text, and `usage_events_dedupe_key_unique` gets its key. Item 7: the 33 narrowings were
already in `PINNED_POLICIES` by text, and I checked that content_ideas, research_evidence and
research_suggestions are among them. The new policy set closes the other 44.

Results on a fresh cluster on this head:

- The guards pass: `verify-branch-scope` 0, `npm run verify` 0 (684/684) and `check:handoff` 0, all on
  the branch name.
- `migrate-clean` reproduces every count. `rls-smoke` passes twice on one database (1079 cases, 6 claims).
- The harness at 0.2 scale gives the plan's §5 plans.
- The draft's D5 and D7, which this branch had not re-run, fail `migrate-clean` by the new probes' names.

I found **nothing stop-the-line and nothing I would call a merge blocker**. I graded nine findings: one
MEDIUM, five LOW and three INFO.

- **The MEDIUM is measured.** The index coverage probe calls an index "served" without checking its access
  method or its NULLS order. A worker-claim index rebuilt as HASH, an audit keyset rebuilt
  `DESC NULLS LAST`, and the workspace-switch index rebuilt as BRIN all pass every layer. At 0.2 scale the
  plans then seq-scan `jobs` and sort the audit page, at 24× the cost.
- **Three LOWs are about records:**
  - every WS citation in the diff is off by the six lines that main's phase plan had already corrected;
  - one count is wrong ("13 tables" where the file has 16);
  - the Q150 questions are put as single proposals, with no alternatives written.
- **One LOW is about operation:** the harness fails on a database that `rls-smoke` has already used,
  which is CI's order.

## §2 Measured vs read

Setup for every live round:

- Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`), checked with `node -v` in each script.
- PostgreSQL 17.11 from `/opt/homebrew/bin`, with a fresh `initdb --locale=C -A trust -U postgres` per
  round.
- 127.0.0.1:5505 only, TCP only (`-c unix_socket_directories=''`), with `LC_ALL=C`.
- The shim `db/foundation/ci/supabase-shim.sql` applied first, then
  `DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres`.
- Private directory `scratchpad/c0-150-prereq/`.

`140_audit.sql` (sha256 `2ac596bb950e8dfb…`) was saved before each drift and restored byte for byte after
it. The hash matched after every round, and `git status` was clean at the end.

**The guards on the branch name.** The subject branch is also checked out in the author's worktree
(`wf_6dce59ae-fd8-1`). I checked it out here with `git checkout --ignore-other-worktrees`, made no commit
on it, and switched back to `review/c0-batch-150-prereq` before committing this file.

| What | Command | Exit | Output |
|---|---|---|---|
| scope | `node scripts/verify-branch-scope.mjs b5f53c3 WP-0A-DB-00` | 0 | "all 16 changed path(s) are declared, and every amendment explains one" |
| suite | `npm run verify` | 0 | "clean: exit 0 -- tests 684, pass 684, fail 0" |
| handoff | `npm run check:handoff` (and `node scripts/refresh-author-handoff.mjs --check`) | 0 | "describes the branch: nothing substantive after its cited head" |
| clean | `make db-schema-lint` / `db-migrate-clean` / `db-rls-smoke` | 0 / 0 / 0 | the four probes' claims read 32 / 18 / 4, 60, 209 and 44, and 4 and 28, each "refused each of its N drifts; clean again"; post-migrate 49 / 37 / 12; 5.0 s |
| clean | `make db-rls-smoke`, second run, same database | 0 | 1079 isolation cases; `db-authz-proofs: ok — 6 claim(s)` |
| catalog | psql on the clean database | 0 | 209 policies in app, 0 elsewhere; 269 CHECKs in app/private; 0 non-btree indexes in app/private; 0 app tables without RLS enabled and forced; **0 non-internal triggers** on the three shape tables |
| harness | `explain-harness.mjs --scale small` on the database `rls-smoke` had used | **1** | `ws905 fixture: app.workspaces holds 6 row(s), not 4` (C0-4) |
| harness | the same at `--scale 0.2` | **1** | `holds 102 row(s), not 100` |
| harness | fresh round (`migrate-clean` only), `--scale small` | 0 | both membership-class queries seq-scan their tiny tables |
| harness | `--scale 0.2` | 0 | rolled back in 10 s; the same scans, indexes and sorts as plan §5; flagged: workspace list on `workspaces` |
| harness | `--scale 0.2 --fail-on-seq-scan` | 3 | the workspace list |
| harness | row counts after the runs | 0 | workspaces 0, usage_events 0, performance_snapshots 0 (rolled back) |
| D5 (draft's) | every home of `dimension` widened alike | sl 0, **mc 2**, rs 0 | vocabulary check probe: quota_buckets, usage_events and usage_reservations; pinned shape: `usage_events_dimension_known` |
| D7 (draft's) | `research_sources_select_active_member` narrowed with `and source_uri <> ''` | sl 0, **mc 2**, rs 0 | policy set (row changed); index coverage (`app.research_sources.source_uri`) |
| dA (mine) | `jobs_available_at_idx` rebuilt `using hash`; `audit_logs_workspace_keyset_idx` rebuilt `DESC NULLS LAST` | 0 / **0** / 0 | survives every layer (C0-1) |
| dB (mine) | `workspace_members_user_id_status_idx` rebuilt `using brin (user_id, status)` | 0 / **0** / 0 | survives every layer (C0-1) |
| dA+dB | the same, `migrate-clean` only, then the harness at 0.2 | mc 0, harness 0 | worker claim: **SEQ SCAN on jobs; sort on available_at**, cost 2.15 → 49.46; audit first page: Bitmap Index Scan + **sort**, cost 177.13 → 4278.72; workspace list no longer uses `workspace_members_user_id_status_idx` |
| regex | `HOST_ALLOWLIST.test(...)` in node | -- | `...@127.0.0.1:5505/postgres?host=db.example.com` → true; `...@db.example.com/x?u=@localhost/` → true (C0-9) |

**Read, not measured:**

- the plan, the disposition and the whole diff `b5f53c3..782df87`;
- the phase plan's "Batch 150" section and its citation-correction table (lines 13-24);
- survey §6 (`weak-assertion-survey-2026-09-27.md`:317-335);
- WS §9.5 (`docs/plans/core-database-and-rls-workstream-th.md`:909-917) and ERD:109;
- the four lint files, the four probes' SQL, the fixture and harness sources, and the new static blocks;
- the blocker edits (179 and 185 are extended as prefixes of main's text; 194 is new at WP:447 = 253+194);
- the handoff's fields and the five commit messages;
- the line citations in plan §0.1, checked: `run.mjs`:1491/1561/1602/1654/2109, `run.mjs`:1116 and :837
  (F11), and README:614 and :696.

## §3 The questions, answered

**Do the pins match survey items 5-7 exactly? Are the remaining gaps recorded?** Yes.

- **Item 5.** `pinned-shapes.json` pins every constraint of `performance_snapshots` (10), its four indexes
  and its two policies by `pg_get_constraintdef` / `pg_get_indexdef` / `pg_get_expr` of both halves. The
  probe's rule 1 reads `relrowsecurity and relforcerowsecurity`. That is exactly what survey item 5 listed:
  the keys, index and 4 CHECKs held by name, the three metric CHECKs held by token set, the policy held by
  `LIKE`, and FORCE held nowhere.
- **Item 6.** The four shared vocabularies (channel, provider, dimension, quantity_unit) are in the 60.
  `usage_events_dedupe_key_unique` (item 6's second half) is in `pinned-shapes.json`.
- **Item 7.** `PINNED_POLICIES` holds 36 rows, among them the three narrowings the survey said behavioural
  cases miss. The policy set probe's rule 1 is the "rule binding the permissive policy set per table" the
  survey asked for. Rule 1 also covers every non-system schema.
- **Gaps.** The recorded ones are F5-F8 and F10 on blocker 194. One gap is unrecorded: triggers (C0-8).

**Is the index-coverage probe's scope honest, and its exemption list?** The exemption list is honest. The
scope is honest on its own terms but **over-claims "served"**.

- **The four exemptions are honest.** Each is a state filter. Each is applied with scope columns that are
  covered. Each has a reason, and the reason for `calendar_items.deleted_at` says plainly that rule 1 does
  not count partial indexes. Rule 3 is measured to refuse a stale exemption (the self-test).
- **The stated limits are honest.** These are IC-2 and IC-3 (helper internals; parent lookups inside
  EXISTS) and USING-only. The 21 `*_keyset_idx` lookups equal the 21 a migration creates (grep).
- **But "served" over-claims (C0-1).** README rule 21 and the probe's claim say the lookup is "served by a
  valid index whose key columns begin with its columns, in order and direction". Rule 2 never reads the
  access method or the NULLS order. Rule 1's `runs` CTE does not read the access method either.

**Does the fixture follow the documented shape? Is the harness honest about p95 and CI?**

- **The fixture's shape: yes.** `WS905_FULL` is WS:911's 100 / 10 / 20 / 100k / 1M / 1M / 1M, and the
  static test reads that sentence from the doc. The extras (4 members per workspace, posts, assets, jobs)
  are stated.
- **But the citation is wrong (C0-2).** The shape is cited as "WS:905" throughout. WS:905-908 is §9.4's
  migration-test list. The fixture is WS:911 and the budgets are WS:913-917. Main's phase plan already
  carries that correction.
- **The harness on p95: honest.** It asserts no timing. The static test greps the script for p95,
  `statement_timeout` and `ms`. It prints wall time but asserts nothing on it.
- **The harness on CI: honest.** The static test checks that it is absent from the Makefile and from every
  workflow file. Blocker 194 (9) records it as the Integration Owner's to add.
- **One unstated precondition (C0-4).** It runs only on a database that nothing has written to since
  `migrate-clean`.

**Are Q150-a..d framed with real alternatives?** Only partly (C0-3). Each one is posed as a single proposal,
with the consequence of saying yes. None names the other options, and the phase plan itself states some of
them: ERD:280's "DB performance owner" and DR:163's MOD-140/A6 range for Q150-c. F2's real question has no
Q of its own. That question is whether 100 workspaces is a "growing table" under WS:913, or whether the
list query should start from `workspace_members`. F2 is routed to Q150-d, which is about p95 SLOs.

**Are the claims in the commits, plan, disposition, blockers and handoff true?** Yes, with these exceptions:

- the WS citations (C0-2);
- "the 13 tables a client only reads" (C0-5);
- F11's sentence that the WS citations "read as the plan says" (C0-2);
- blocker 194's pointer to "plan §5" and to a draft file that no longer exists (C0-6).

Everything below I checked and found true:

- the counts: 32 / 18 / 4, 60 of 269, 209 / 44, 112 → 4 exemptions, 28 lookups;
- 684 tests, the floor 793 → 878 (the guard passes) and 88 digests (`npm run verify` passes);
- the empty diff of migrations between `1319042` and `b5f53c3`, which is consistent with every count
  reproducing;
- that blockers 179 and 185 are extended as prefixes, not rewritten, and that 194 is appended at WP:447;
- the merge timeline in the disposition (read, not re-measured on GitHub);
- the D1/D4/D6/D9 claims (the self-tests reproduce them, and D5 and D7 are measured above).

## §4 Findings

Grades: STOP-THE-LINE / HIGH / MEDIUM / LOW / INFO. A remedy is a recommendation, not a decision.

### C0-1 MEDIUM: index coverage calls a HASH, BRIN or NULLS-LAST index "served" (measured)

`scripts/db/run.mjs`:1691-1705 (rule 2's `idx` CTE) and :1671-1677 (rule 1's `runs`). Rule 2 compares
`attname` plus ` DESC` (`indoption & 1`) and the predicate. It never reads `pg_class.relam`, and it never
reads the NULLS-FIRST bit (`indoption & 2`). Rule 1 counts any valid whole index.

Measured, with `migrate-clean` 0, schema-lint 0 and rls-smoke 0:

- `jobs_available_at_idx` rebuilt `using hash (available_at)`;
- `audit_logs_workspace_keyset_idx` rebuilt `(workspace_id, occurred_at desc nulls last, id desc nulls last)`;
- `workspace_members_user_id_status_idx` rebuilt `using brin (user_id, status)`.

On the drifted database the harness at 0.2 scale gave these plans:

- the worker claim seq-scans `jobs` and sorts, cost 2.15 → 49.46;
- the audit first page sorts, cost 177.13 → 4278.72;
- the workspace list stops using the switch index.

So README rule 21 (`db/foundation/README.md`:640) and the probe's claim say more than rule 2 checks. These
are exactly the regressions a batch-150 index rebuild could make. The pinned shapes catch them only on the
three shape tables, because `pg_get_indexdef` carries `USING btree`.

Not stop-the-line: performance only, no tenant boundary.

**Remedy.**

1. Restrict both rules to btree (`join pg_am ... amname = 'btree'`), or compare the leading columns of
   `pg_get_indexdef`.
2. Add `NULLS FIRST`/`NULLS LAST` to the column token when it differs from the direction's default.
3. Add dA and dB as self-test drifts.

If this is not done in this batch, name it on blocker 194 rather than leave rule 21's wording as it is.

### C0-2 LOW: every WS citation in the diff is six lines early; F11 says the opposite

The diff adds about 50 citations: "WS:905" (27), "WS:905-910" (6), "WS:907" (8), "WS:908" (6), "WS:910" (2)
and `workstream-th.md:905` / `:905-910`. They appear in `run.mjs`, the four lint files, the fixture, the
harness, README rule 21 and :698, the static test messages, the plan, blocker 194 and the handoff.

In the doc, WS:905-908 is §9.4's migration-test list. The fixture sentence is WS:911, and the budgets are
WS:913 (seq scan), :914 (p95), :915 (worker claim) and :917 (top-20 snapshot). Main's phase plan corrects
exactly this in its own header (`a0-phase-plan-141-170-2026-10-03.md`:20 and :24, "the fixture is WS:911
and the budgets WS:913-917"). The draft was written from the uncorrected text.

Plan F11 (`a0-batch-150-prereq-plan-2026-10-03.md`:250-252) then says "These citations read as the plan
says: WS:575, 905-910". That is false. The phase plan says 909-917 and 911.

The static test passes because it searches the doc for the sentence and does not check the line. The name
`ws905` in identifiers is harmless as a label.

**Remedy.** Correct the line citations to WS:911 and WS:913-917, or record the drift as F11 does for the
`run.mjs` citations, and strike F11's false sentence.

### C0-3 LOW: Q150-a..d are put as single proposals; F2's question has no owner-question of its own

Plan §7 (`:300-305`) and disposition §5 (`:96-101`) each give one option and the consequence of "yes". Two
alternatives are missing that the record itself supports:

- **Q150-a:** keep `(id)` and take the rebuild when partitioning is declared, or change the key now.
- **Q150-c:** A0, the ERD:280 "DB performance owner", or the DR:163 MOD-140/A6 range. The phase plan's
  §2 names that conflict.

F2 is routed to "Q150-d" (plan :223-224, blocker 194 (1)), but Q150-d asks for p95 values. WS:913's
no-seq-scan rule is not an SLO. Whether 100 workspaces is a "growing table", and whether the list query
should start from `workspace_members`, is not posed to anyone.

**Remedy.** Add the alternatives and the "no" consequence to each Q. Pose F2's question explicitly, inside
Q150-d's text or as its own id.

### C0-4 LOW: the harness fails on a database that `rls-smoke` has used (measured)

`scripts/db/explain-harness.mjs`:105-106 compare absolute row counts, so residue from `rls-smoke` breaks
the run. Measured exit 1, `app.workspaces holds 6 row(s), not 4` at small scale, and `102 … not 100` at 0.2.

The header (:10-11) and README:702-703 say "a database `make db-migrate-clean` built". Neither says that
nothing else may have written to it. CI runs `migrate-clean` and then `rls-smoke` on one service database,
so the Integration Owner's job under blocker 194 (9) would fail as written.

**Remedy.** Count before the load and check the deltas, or state the precondition in the README and in
blocker 194 (9).

### C0-5 LOW: "17 permissive SELECT policies of the 13 tables a client only reads" (measured: 16 tables)

`scripts/db/run.mjs`:1595 and plan :123. The 17 `r`/`authenticated` rows of `policy-set.json` sit on 16
tables. They include `workspace_members` (2 rows), `quota_buckets` and `billing_subscriptions`, and none of
those has a row in `PERMISSIVE_POLICIES`. The set the probe pins is right; only the sentence's count and
classification are wrong. README rule 20 says "tables no client writes", which has the same issue.

**Remedy.** Correct the number, or say what "client only reads" counts.

### C0-6 INFO: blocker 194's pointers

WP:447 cites "plan … §5" for the findings, which are in §6; §5 is the EXPLAIN plans. It also names
`a0-batch-150-prereq-draft-2026-10-03.md`, a file this branch moved away (`git mv`), so the name no longer
resolves. Blocker 185's addition cites "draft record §4", which is now the plan's §4.

**Remedy.** Point blocker 194 at plan §6/§6.1, and at the plan's filename.

### C0-7 INFO: plan §0.1's "fixture and harness … :3253"

The block's comment opens at `test-kits/db/foundation-contract.test.mjs`:3247 and the block at :3251. Line
3253 is the harness import inside it. The other cited lines are exact.

### C0-8 INFO: the pinned shapes pin no trigger, and that is not recorded

`pinned-shapes.json` / rules 1-4 (`run.mjs`:1491-1548). Today the three tables carry **no** non-internal
trigger (measured). A rebuild that added one passes the probe. For example, a BEFORE trigger rewriting
`workspace_id` or `metrics`. F7 records the missing columns. Triggers are absent from F7 and from blocker
194 (4).

**Remedy.** Add a rule-5 "no non-internal trigger unless pinned" on the three tables, or add triggers to
blocker 194 (4)'s text.

### C0-9 INFO (inherited): the host allowlist is unanchored

`scripts/db/explain-harness.mjs`:32 copies `run.mjs`:3563's
`/@(localhost|127\.0\.0\.1|postgres)[:/]/`. Measured with node:
`postgresql://postgres@127.0.0.1:5505/postgres?host=db.example.com` tests true, and libpq honours
`?host=`. So does `postgresql://u@db.example.com/x?u=@localhost/`.

The variable is set by the operator, so this is not a vulnerability in the review's threat model. It is
older than this batch, and the harness only copies it. I did not connect to any such host.

**Remedy.** If anyone tightens it, parse the URL with `new URL()` and refuse a `host`/`hostaddr` query
parameter. Do it in both places. Owner: whoever owns the reset allowlist.

## §5 Stop-the-line verdict

**None.** No secret, no tenant leak, no duplicate side effect, no lost job and no migration divergence. No
migration, policy, index or grant is added. Every drift I appended was restored byte for byte. The harness
rolls back, and I measured that 0 rows remained.

**Merge.** No finding of mine blocks it. C0-1 is the one I would fix before merging, because rule 21
states a guarantee that the probe measurably does not give. Recording it by name on blocker 194 is the
minimum. Whether it blocks is for the Owner and the Integration Owner. The other preconditions stay as the
disposition (§6) and the handoff say:

- Q0's and A1's role runs;
- a green required CI run on the head;
- the RFC-2026-025 §5 Integration Owner evidence.

## §6 Limits

- **Same vendor, same family, spawned by the Author, with the brief written by the Author's workflow (§0).**
- **No full scale.** I ran the harness at small and 0.2 scale only, on 8.4-10 GiB free. The full WS:911
  scale is unmeasured here too.
- **One server build.** I measured PostgreSQL 17.11 only. That CI's `postgres:17` deparses identically is
  inferred (F9).
- **Lint files cross-checked, not regenerated.** I did not regenerate the four lint files from the catalog
  with my own generator. I relied on the probes passing both ways on a clean set, together with the counts
  and the spot reads above. A both-ways probe that passes means the file equals the catalog for what the
  selector reads. It does not mean the selector is complete. That gap is F6, F8 and C0-8.
- **No GitHub verification.** I did not check on GitHub that CI is green on `782df87`, and I did not check
  the #171 merge timestamps there.
- **No exhaustive drift search.** dA and dB are the only drifts I tried beyond the draft's. Other survivors
  may exist.
- **Cleanup.** The cluster on 127.0.0.1:5505 was stopped and its data directory removed after every round
  and at the end. Port 5505 is free. Ports 5432, 5499 and 5507, and every other run's port, were not
  touched. `140_audit.sql` is byte-identical to the head (`2ac596bb950e8dfb…`). My scratch files stay in
  `scratchpad/c0-150-prereq/` and are not in the repository.
