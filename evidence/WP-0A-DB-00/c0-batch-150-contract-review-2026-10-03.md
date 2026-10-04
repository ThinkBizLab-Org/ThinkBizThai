# C0 contract review: batch 150

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00` |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-150` (PR #173, Draft) |
| Subject head | `c0fa18e` (handoff refresh), over code `2318c72` and records `4b252d4` |
| Base | `1930f41` (`main`, PR #172's merge) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (file named for the batch date, 2026-10-03) |
| Reviewed in | local branch `review/c0-batch-150` at `c0fa18e`, in a worktree. The guards that read the branch name were run with the subject branch name checked out (§2). |

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

Migration 150 is a correct forward change of 121's table. It edits no integrated migration, needs no
`superseded.json` entry, and the one pin that held the old key (`pinned-shapes.json`) moved in the same
diff. Every count the plan gives reproduces on a fresh cluster: post-migrate 50 / 38 / 12, rls-smoke 1079
twice, harness workspace list cost 27.30 with nothing flagged, and D1 refused with 2BP01. The 71-row
projection is exactly `pinned-grants.json`'s client SELECT columns. Its four classed tables hold the
narrowest projection §9.1 allows. The guards pass on the branch name: scope 0, verify 0 (684/684),
check:handoff 0. The 11 blocker edits are pure appends. I found **nothing stop-the-line**. I graded nine
findings: one MEDIUM, three LOW and five INFO.

- **The MEDIUM is measured, and it goes to the reason for the change.** Q150-a's recommendation, 150's own
  comments, the catalog comment 150 writes on the table, and the CLOSED text of `open_blockers[179]` all say
  the same thing: later partitioning is "create a partitioned parent and ATTACH this table". PostgreSQL
  17.11 refuses exactly that: `table "performance_snapshots" being attached contains an identity column
  "id"`. Readiness without a rewrite still holds, and the key change is still a necessary step. But the
  recorded path is not the one the server takes. The path that works also needs `DROP IDENTITY` on `id`,
  which 150's own block (check 4) and 121's block 10 would then refuse.
- **One LOW is a count.** The Owner's answer is recorded as covering "17" Q-ids. The enumeration, the
  four source dispositions and §5's table all hold 16.
- **Two LOWs are about records.** First, plan §3 says the membership policy "still binds `user_id` to the
  session". That is false for an owner or admin, and I measured it. Second, Q150-b's recommendation
  ("The 150 migration waits") is shortened to "Yes." even though this batch takes number 150.

**Does anything block the merge?** Not stop-the-line. I do recommend correcting C0-1's text **before**
the merge. While 150 is not integrated, its comments can still be edited. After the merge, correcting the
catalog comment takes a forward migration (CONTRIBUTING_AGENTS.md:39).

## §2 Measured vs read

Setup for every live round:

- Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`), checked with `node -v` in each script. A PATH
  Node 26 exists and was not used.
- PostgreSQL 17.11 from `/opt/homebrew/bin`, with a fresh `initdb --locale=C -A trust -U postgres` per
  round.
- 127.0.0.1:5505 only, TCP only (`-c unix_socket_directories=''`), with `LC_ALL=C`.
- The shim `db/foundation/ci/supabase-shim.sql` applied first, then
  `DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres`.
- Private directory `scratchpad/c0-150/`.

`140_audit.sql` (sha256 `2ac596bb950e8dfb…`) was saved before each drift and restored byte for byte after
it. The hash matched after every round.

**The guards on the branch name.** The subject branch is also checked out in the author's worktree
(`wf_647fa4a7-6e3-1`). I checked it out here with `git checkout --ignore-other-worktrees`, at `c0fa18e`.
I made no commit on it, and I switched back to `review/c0-batch-150` before committing this file.

| What | Command | Exit | Output |
|---|---|---|---|
| scope | `node scripts/verify-branch-scope.mjs 1930f41 WP-0A-DB-00` | 0 | "all 15 changed path(s) are declared, and every amendment explains one" |
| suite | `npm run verify` | 0 | "clean: exit 0 — tests 684, pass 684, fail 0" |
| handoff | `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| floor | `stripNonCode` + `/\bassert\.\w+\(/g` on foundation-contract, at `1930f41` and at head | -- | 898 → **929**; 80 tests at both. The floor move is exact. |
| clean | `make db-schema-lint` / `db-migrate-clean` / `db-rls-smoke` | 0 / 0 / 0 | "applied 150_performance_snapshots_key.sql"; pinned shape 32 / 18 / 4 / 0 (5 drifts); data classification "4 SECRET-4 tables … 4 PROVIDER-3 or INTERNAL-3 tables and the 12 open ones … exactly the 71 column reads"; post-migrate **50 / 38 / 12**; 6.8 s |
| clean | `make db-rls-smoke`, second run, same database | 0 | 1079 isolation cases; `db-authz-proofs: ok — 6 claim(s)` |
| catalog | psql on the clean database | 0 | key `PRIMARY KEY (id, metric_time)`; 0 FKs reference the table; 10 constraints, 4 indexes; `id` NOT NULL, `attidentity = 'a'`; `metric_time` NOT NULL; `relkind = 'r'`; pkey comment present; 4 fixture rows; 0 views and 0 functions name the table. **No constraint or index on `id` alone** (C0-5). |
| roster | owner of a fixture workspace, as `authenticated`, the harness text with **another member's** id | 0 | `own_literal_rows 1`, **`other_literal_rows 1`**; 6 membership rows of other users visible (`workspace_members_select_workspace_roster`) (C0-3) |
| auth | `set role authenticated; select auth.uid()` | 3 | "permission denied for schema auth", as plan §3 says |
| **attach** | partitioned parent with `id` ALWAYS identity, key `(id, metric_time)`, `partition by range (metric_time)`, then `attach partition app.performance_snapshots for values from (minvalue) to ('2026-11-01')`, rolled back | **ERROR** | `table "performance_snapshots" being attached contains an identity column "id"` / `The new partition may not contain an identity column.` (C0-1) |
| attach | the same, but the parent's `id` is a plain `bigint not null` | **ERROR** | the same message: it is the CHILD's identity that is refused |
| attach | `alter table app.performance_snapshots alter column id drop identity` first, then attach to the identity parent, rolled back | 0 | attached; 4 rows read through the parent. This path works, and it contradicts 150 check 4 and 121 block 10. |
| D1 (A0's) | `create table app.probe_ps_ref (ps_id bigint references app.performance_snapshots (id));` | sl 2, **mc 2**, rs 0 | "150_performance_snapshots_key.sql: cannot drop constraint performance_snapshots_pkey … (2BP01)", as plan §6 says (schema-lint also refuses the probe table's own shape) |
| D3+D4 (A0's, one round) | widen `jobs.progress_stage` and `social_accounts.id`; narrow `publish_targets.failure_class` | 0 / **2** / 0 | data classification "outside the pinned safe projection … authenticated SELECT (id) on app.social_accounts, authenticated SELECT (progress_stage) on app.jobs"; pinned grant "missing: … failure_class …; unlisted: …" |
| E1 (mine) | `create unique index probe_ps_id_uq on app.performance_snapshots (id);` (a unique INDEX, not a constraint, without `metric_time`) | 0 / **2** / 0 | **150's check 2 passes it**. The pinned shape probe refuses it ("unlisted or changed: app.performance_snapshots.probe_ps_id_uq") (C0-6) |
| E2 (mine) | `grant select on app.published_posts to authenticated; grant insert (status) on app.publish_jobs to authenticated;` | 0 / **2** / 2 | rule 17 rule 3 names the table-level grant by column: "authenticated SELECT (external_post_hash) on app.published_posts", the withheld PROVIDER-3 hash. Pinned grant, read allowlist and permissive policy probes also refuse. |
| harness | fresh round (migrate-clean only), `explain-harness.mjs --scale 0.2 --json --fail-on-seq-scan` | 0 | `flagged []`; workspace list: Bitmap Index Scan `workspace_members_user_id_status_idx` → Index Scan `workspaces_pkey`, **total cost 27.30**; 18 s |
| lint data | node: `NO_PRIVILEGE_TABLES`, `PROJECTION_TABLES`, `OPEN_CLASS_TABLES`, overlap, `SAFE_PROJECTION_ROWS` | -- | 4 private / 4 app / 12, **no overlap**, 71 rows; each projection equals `pinned-grants.json`'s client SELECT list, column for column and in order |
| blockers | node: base vs head `open_blockers` | -- | 195 = 195; changed [18], [21], [29], [33], [93], [95], [148], [150], [179], [192], [193], [194], **each a pure append** (old text a prefix of the new); 179 at WP:432, 193 at :446, 194 at :447 |
| Q-ids | `grep -oE "Q1[4-7][0-9]-[a-z]"` over the four source dispositions | -- | 141-prep 3, 150-prereq 5, 160-prep 4, 170-assert 4: **16** distinct (C0-2) |
| cites | node: the plan's §0.1 line citations | -- | `run.mjs`:1423/1445/1479/2166, `explain-harness.mjs`:84, test :430/2718/3185/3201/3269/3427, README :602/624/661/729, 121 :414-682: all correct |

**Read, not measured:**

- the plan, the disposition, the three commit messages, and the whole diff `1930f41..c0fa18e`;
- CONTRIBUTING_AGENTS.md;
- ERD §6 (registry, migration invariants, `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md`:247-295)
  and §9.1-§9.3 (:436-480);
- WS §4.8 `performance_snapshots` (`docs/plans/core-database-and-rls-workstream-th.md`:373-376);
- the §5 rows of the four source dispositions (141-prep :85-87, 150-prereq :102-106, 160-prep :94-97,
  170-assert :93-96);
- 121's table, its comment and its apply-time block (`121_publisher_metrics.sql`:146-263, :414-682);
- the handoff's fields.

I did not re-run the base round (main's text, cost 865.54, exit 3). C0's prerequisite review measured that
exit 3 on the same text, and I rely on it. I did not re-run A0's D2 or the `--analyze` round.

## §3 The questions, answered

**Is 150 a correct forward change of 121's table?** Yes.

- `git diff 1930f41..c0fa18e -- db/foundation/migrations` adds one file and edits none. `superseded.json`
  is untouched. 121's line `id bigint generated always as identity primary key,` is unchanged, and a static
  test holds it.
- 121's block re-runs as written, 38 = 37 + 150's own. It holds `id`'s identity and `metric_time`'s NOT NULL,
  and 150 changes neither (C0-7 on the wording).
- I searched every repo file for anything that references the old key. Only `pinned-shapes.json` held it,
  by text, and it moved (two lines). `index-coverage.json`, `purge-order.json`, `service-policy-map.json`,
  `pinned-grants.json`, `policy-set.json` and `retention-map.json` name the table, but none names the key.
  Two stale strings remain (C0-8).
- The FK check (D1, re-measured) is the stop the Owner asked for.
- The timeouts follow migration invariant 3 (ERD:289), in the same form as `131_billing_projection.sql`:520-538.
- The table comment is replaced, not left false.
- 150 is declared on the not-applied tail (catalog snapshot and `NOT_ON_THE_INSTANCE`), so no migration
  divergence is introduced.

**Does it match §4.8 partition readiness and Q150-a as answered?** In shape, yes. In mechanism, not as
recorded.

- §4.8 asks for "partition-ready by month". Every unique now carries `metric_time` (block check 2, the
  pinned text, and a static test). There is no `partition by` and no index, as Q150-b asked. `id` is still
  the ALWAYS identity.
- Q150-a's recommendation (`…-batch-150-prereq.md`:102) gave the payoff as "Later partitioning becomes
  'create a parent and ATTACH this table' with no rewrite". On 17.11 that ATTACH fails because of `id`'s
  identity (C0-1).
- The route without a rewrite exists: `DROP IDENTITY` (catalog only), then ATTACH, then restart the parent's
  identity above `max(id)`. That route breaks 150's check 4 and 121's block 10. So "ATTACH, not a rebuild"
  is not the whole path, and the batch that partitions will have to supersede both blocks.

**Is the disposition a faithful verbatim transcription with all 17 answers, and are the other roles'
acceptances honestly recorded as owed?**

- The Owner's words are transcribed exactly, typo included, and they match the relayed request. §2 states
  that the reading is A0's.
- Each §5 row matches its source recommendation in substance. One omission: Q150-b drops "The 150 migration
  waits" (C0-4).
- Every row where another role is the named owner says that role's acceptance "remains owed": A1, A6, A4,
  Product/Ops and Product/Security/Legal. Each blocker edit repeats it. Nothing claims a role's signature.
- §3 keeps the RFC-2026-025 §5 and RFC-2026-002 limits open, and does not claim them met.
- **But there are 16 answers, not 17** (C0-2).

**Is the Q170-d projection allowlist faithful to ERD §9.1?** Yes, with the findings A0 recorded.

- **The four classed tables** (PROVIDER-3 `billing_webhook_receipts`; INTERNAL-3 `jobs`, `outbox_events`,
  `consumer_ledger`) pin an empty projection. That is narrower than or equal to "safe projection only" and
  "redacted status only", and it is equivalent to the old rule for these tables.
- **SECRET-4** keeps "no client privilege" (§9.1 "never returned after write"). `meta_webhook_inbox` is held
  there by its PROVIDER-3/SECRET-4 row (ERD:212).
- **The twelve open tables** pin today's grants: 71 reads, derived and not designed. That is what A1 R5
  asked for, and the file says so.
- **The column reviews hold up.** The external post id and its hash are withheld (E2 shows rule 3 catches a
  table-level grant that would expose `external_post_hash`). `provider_request_key` is withheld. The push
  token is not in `notifications`.
- **SP-1..SP-3 are honest readings.** `metrics` is the provider payload held by shape. `failure_class` has
  an open vocabulary. `attempt_count` is bookkeeping. All three are kept, with owners, on `[193]`.
- **One extension beyond the question:** rule 3 covers only SELECT on the open tables. The plan (§7) and
  the README state this limit.

**Are the claims in commits, plan, disposition, blockers and handoff true?** Mostly, and every number I
re-ran reproduced. The exceptions:

- the "17" (C0-2);
- the ATTACH mechanism (C0-1);
- plan §3's binding claim (C0-3);
- three wording points (C0-7);
- the plan's statement that the post-handoff runs "are recorded in the handoff" (C0-9).

## §4 Findings

### C0-1 (MEDIUM, measured): the recorded partition path, "a parent created and this table attached", is refused by PostgreSQL 17.11

- **Where.** `150_performance_snapshots_key.sql`:16-17 (header), :76-79 (the **catalog** table comment:
  "a later monthly partition is a parent created and this table attached, not a rebuild") and :100 (block
  hint "an ATTACH, not a rebuild"); `work-packages/WP-0A-DB-00.json`:432 (`open_blockers[179]`, CLOSED:
  "a monthly partition becomes a parent plus ATTACH, not a rebuild"); the Q150-a recommendation the Owner
  answered (`product-owner-disposition-2026-10-03-batch-150-prereq.md`:102).
- **Measured.** I attached `app.performance_snapshots` to a range-partitioned parent with the same columns
  and key. It fails with "table "performance_snapshots" being attached contains an identity column "id" —
  The new partition may not contain an identity column". It fails the same way when the parent's `id` has
  no identity. It succeeds only after `alter column id drop identity` on the table.
- **Why it matters.** The re-key's stated payoff is a partition without a rewrite. That payoff is still
  reachable, because DROP IDENTITY is catalog-only and the re-key is still a necessary step. But the
  mechanism the batch writes into the catalog and into a CLOSED blocker is not the one the server accepts.
  The step that is needed also contradicts this batch's own check 4 (`attidentity = 'a'` on `id`) and
  121's block 10. A future partitioning batch that trusts the record meets a refusal plus two apply-time
  blocks it has to supersede.
- **Remedy.**
  - **Before merge**, while 150 is not integrated: reword :16-17, :76-79 and :100 to the measured path.
    That path is: drop the identity on this table, create the parent with an identity restarted above
    `max(id)`, attach, and supersede 121 block 10 and 150 check 4.
  - Reword `[179]`'s CLOSED text the same way, or keep `[179]` open for the identity half.
  - Add a plan note.
  - After merge, the catalog comment needs a forward migration (CONTRIBUTING_AGENTS.md:39).

### C0-2 (LOW, measured): "17" Q-ids, but 16 are enumerated, sourced and answered

- **Where.** Disposition :1, :7, :19, :35 and :98 ("one row each" over 16 rows); plan :11 and :319;
  handoff :35; `WP-0A-DB-00.json`:118; commit messages `2318c72` and `4b252d4`.
- **Measured.** The parenthetical in each place, (Q141-a/b/c, Q150-a..e, Q160-a..d, Q170-a..d), lists
  3 + 5 + 4 + 4 = 16. The four source dispositions hold exactly these 16 ids, and §5 has 16 rows.
- **Why it matters.** A reader of "all 17 answered" looks for a 17th answer that is not recorded. If A0's
  phase-end summary did list a 17th item (it is not in the repository, so I cannot check), that answer is
  missing from §5.
- **Remedy.** Correct the count to 16 in the disposition, plan, handoff and rationale. Alternatively, name
  the 17th item and give it a row. The commit messages stay as they are; the correction lands in a later
  commit's body.

### C0-3 (LOW, measured): plan §3's "the membership row's own policy still binds `user_id` to the session" is false for an owner or admin

- **Where.** Plan :195-196. Also `scripts/db/explain-harness.mjs`:83 and `[194]` (1) ("which is how a
  client issues it").
- **Measured.** As a fixture owner, the harness text with another active member's id returned 1 row.
  Six other users' membership rows are visible through `workspace_members_select_workspace_roster`.
- **Why it matters.** Nothing leaks, because the join through `workspaces_select_active_member` still
  limits the result to the caller's own workspaces. But the query's meaning now depends on a literal that
  nothing binds to the session. The BFF that will issue it must bind `user_id` to the authenticated
  subject, and the record says the policy does that for it.
- **Remedy.** Correct the sentence in the plan and on `[194]` (1). Record the binding as a requirement on
  the BFF query that is owed.

### C0-4 (LOW, read): Q150-b's recommendation is shortened, and its "150 migration" now has no number

- **Where.** Disposition :110 ("**Yes.**"), against `…-batch-150-prereq.md`:103 ("**Yes.** The 150 migration
  waits; the fixture, harness and probes land now.").
- **Why it matters.** Q150-a explicitly asked for a small forward migration now, so the two answers do not
  conflict. But the shortened row hides that number 150 (ERD:280, "indexes/partition readiness") is now
  used by the re-key under Q150-c's one-time exception. The deferred partition/index migration of "batch
  150's later part" (`[179]`, `[194]` (2)) has no number recorded.
- **Remedy.** Quote the sentence in §5 and say which number the later part will take, or that A1 and the
  Integration Owner must assign one.

### C0-5 (INFO, measured): `id` alone is no longer unique by any constraint

- **Where.** `150_performance_snapshots_key.sql`:61-65 and :67-82; plan §2.
- **Measured.** The table's only uniques are `(id, metric_time)` and `(published_post_id, metric_time)`.
- **Why it matters.** `id` stays unique in practice only because it is an ALWAYS identity and no role holds
  INSERT on `id`. That is a property of the sequence and the grants, not of a key. Nothing references
  `id`, so nothing breaks today. The comments still call `id` "the high-volume identity" without saying
  this.
- **Remedy.** Add one sentence to the comment (before merge) and to the plan.

### C0-6 (INFO, measured): 150's check 2 reads constraints only

- **Where.** `150_performance_snapshots_key.sql`:103-113.
- **Measured.** A unique index on `(id)` created as an index, not as a constraint, passes check 2 (E1).
  The pinned shape probe refuses it, so migrate-clean still fails.
- **Why it matters.** Partitioning requires every unique index to carry the partition key, not only every
  unique constraint. The defence holds, but in a different layer from the one whose comment claims it.
- **Remedy.** Optional. Extend check 2 to `pg_index.indisunique`, or say in the comment that the pinned
  shape probe holds the index half.

### C0-7 (INFO, read): wording that is not literally true

- **"Never names the key's columns."** 150:29-32, plan :148-149 and `[179]` (WP:432) say 121's block
  "never names the primary key's columns", and "no … apply-time block names the key's columns". But 121's
  block holds `id`'s identity (block 10) and `metric_time`'s NOT NULL (`required_not_null`), and 150:31
  itself says so. The conclusion, no `superseded.json` entry, is right because 150 changes neither
  property.
- **"The same text with that sentence corrected."** 150:37-39 says the new table comment is exactly that.
  It also adds "by the migrations' reading" and drops "shorter than the family it belongs to".
- **Remedy.** Say "names no property 150 changes", and list the comment's two other edits.

### C0-8 (INFO, read): stale "rebuild" strings

- **Where.** `scripts/db/explain-harness.mjs`:94 (`source: 'performance_snapshots, the table Q150-a would
  rebuild'`) and `db/foundation/lint/index-coverage.json`:180 ("the read batch 150's rebuild of
  performance_snapshots must keep serving").
- **Why it matters.** 150 re-keys the table in place. It does not rebuild it.
- **Remedy.** Update both strings with the next change to these files.

### C0-9 (INFO, read): the plan promises handoff records that cannot exist

- **Where.** Plan :110-112.
- **What.** It says `npm run check:handoff` and `npm run verify` on the branch name "are recorded in the
  handoff, which is committed last and alone". The handoff's `tests` has no such entry. A run made after
  the handoff commit cannot be recorded in it. I measured both at exit 0 (§2).
- **Remedy.** Word it as "recorded by the role runs", or record the runs made before the handoff commit.

## §5 Stop-the-line verdict

**None.**

- No secret, no tenant data and no client reach changes. E2 shows rule 17 refusing a widening.
- No integrated migration is edited, and 150 is declared not applied to the instance, so there is no
  migration divergence.
- There is no contract mismatch and no irreversible deletion.

C0-1 is a false mechanism in a record and a catalog comment. It is not an incident. I recommend fixing its
text before the merge, because the cost of fixing it rises from an edit to a migration once 150 is
integrated. C0-2 to C0-4 are record corrections that can ride along.

## §6 Limits

- I measured one PostgreSQL version (17.11). The identity restriction on ATTACH is PostgreSQL behaviour as
  of 17. I did not test 15/16, which the provisioned instance might run. Q170-c's measurement of the
  instance is still owed.
- The C0-1 experiments built a parent from my own column list, not from a migration a future batch will
  write. They show the refusal and one working route. They do not design the route.
- I did not re-run A0's base round, D2 or the `--analyze` round, and I did not check the PROPOSED p95
  values (plan §5). Those values are explicitly unratified and asserted nowhere.
- I cannot see A0's phase-end summary, so for C0-2 I cannot tell whether a 17th item existed.
- The workspace-list "same rows" claim (plan :189) is A0's measurement. Mine (C0-3) covers only the
  binding.
- Everything in §0 applies.

## §7 Cleanup

- Every round used a fresh `initdb` under `scratchpad/c0-150/pgdata`, removed at the next round and after
  the last. After the last round, `lsof -iTCP:5505 -sTCP:LISTEN` returned nothing. Ports 5432, 5499 and
  5507 were not touched.
- `140_audit.sql` was restored byte for byte after each drift. Its sha256 matched every time.
- The subject branch was checked out only to run the three guards, and was left as found. This file is the
  only change, committed on `review/c0-batch-150` and not pushed.
