# C0 — contract and document review, batch 121 (metric snapshots)

Run `/claude/c0_contract_reviewer`. Package `WP-0A-DB-00`. Head reviewed: **426c294** on
`agent/claude/WP-0A-DB-00-batch-121`, open as Draft PR #153. Written 2026-09-16.

## 0. Disclosure (RFC-2026-024)

I was spawned by the Author's own session — the `/claude/a0_atlas` run that wrote batch 121 — as one
of its three role runs. **I am a subagent of the Author's session and not an independent human
reviewer.** My findings are the Author's process examining itself. Nothing here is one of the four
role signatures RFC-2026-002 requires, and I approve nothing.

**I measured nothing live, by design.** My mandate is the documents and the contracts. I did not
build a cluster, did not initdb, did not connect to any PostgreSQL server on any port — my assigned
port 5502 was never opened — and did not run `migrate-clean`, `schema-lint`, `rls-smoke`,
`npm run verify`, or the CI negative control. I did not run `verify-branch-scope.mjs` either: this
worktree's branch is `worktree-agent-a824b7d156e9760d2` and not the declared
`agent/claude/WP-0A-DB-00-batch-121`, so the script would have read a false result, and a false green
measured off the wrong branch name is the failure this package already has a memo about.

**What my run therefore cannot be evidence of.** Not that the migration applies. Not that any
SQLSTATE named in any probe is the SQLSTATE PostgreSQL actually raises. Not that the seven cases the
CI entry rests on flip, nor that the row counts beside them (1, 1, 2, 1, 4, 4, and "the write
LANDED") are what a live run returns. Not that the suite is 663 tests or the isolation suite 965
cases. Not that the five migration probes and the two fixture probes pass. Where I say a constraint
does what its comment says, I mean **I read it and reasoned about PostgreSQL semantics** — I did not
execute it. Q0's run, not mine, is the evidence for all of that.

What I did: read the migration, the fixture, the 24 cases, the 5 static tests, the lint and seed
files, the manifest, the handoff and the CI entry at 426c294, and opened every document each one
cites and checked the cited text against the source.

**Stop-the-line: YES.** Findings 1 and 2.

---

## 1. Findings

### F1 — HIGH — **stop-the-line.** Seven statements say a reading is "in the work package's open blockers". Not one blocker was opened. Two of the seven are frozen by migration invariant 1.

**What I did.** Parsed `work-packages/WP-0A-DB-00.json` at 426c294 and at `0f3a08b`, compared every
top-level field, and searched all 175 blocker entries for `performance_snapshots`, `121`, `metric`,
`cadence`, `partition` and `METRIC_SNAPSHOT`.

**What I found.** The only top-level field batch 121 changes in the manifest is `ownership`.
`open_blockers` is **unchanged at 175** — the same 175 that stood when batch 120 merged at `b61c634`
and through the fifth-pass record at `0f3a08b`. Zero entries mention the metric table, batch 121, the
cadence, partitioning, or the ERD naming. The three `metric` substring hits are batch 061's ledger
columns and two batch 120 entries about §8.3's publishing rows.

Against that, the batch asserts:

| Where | The claim |
|---|---|
| `121_publisher_metrics.sql` header, partition section | the identity-PK cost to batch 150 "is recorded in the work package's open blockers as such" |
| header, "what this batch does not enforce" 1 | the un-enforced collection cadence — "Blocker." |
| header, same list 2 | that a snapshot is not older than its post — "Blocker." |
| **`comment on table app.performance_snapshots`** | "...nothing holds a snapshot to be no older than its post **(both in the work package's open blockers)**" |
| **`comment on policy performance_snapshots_select_active_member`** | "The reading **is recorded in the work package's open blockers** rather than presented as a citation." |
| `121-publisher-metrics-fixture.sql` | the un-writable page-scope case "is in the work package's open blockers against the batch that gives the family a second page-level post" |
| `121-publisher-metrics-fixture.sql` | "the absence of a constraint that would require it **is the blocker**" |

And the Product Owner disposition records three of these as consequences the Owner was answering
for: question A ("the ERD's `METRIC_SNAPSHOT` mismatch is a blocker"), question E ("the missing §8.3
SELECT row is a blocker in 090's shape") and question F ("The un-enforced cadence is a blocker").
None exists.

**Why HIGH and why stop-the-line.** Two of the seven are inside `comment on table` and
`comment on policy`. Migration invariant 1 forbids rewriting a merged migration, so after merge those
two sentences are **permanently frozen false** and the only correction available is a forward
migration whose purpose is to fix a sentence. A later reader meets the table comment first — it is
what `\d+` prints — and is told that two named gaps are tracked. They are not tracked anywhere.

This is the same class of error batch 120 was caught on twice, by two reviewers independently. The
repository's own author handoff carries the warning in its `reviewer_instructions` today: *"The batch
already corrected one found this way (ADR-010 -> ADR-012) and one claim that named a blocker before
the blocker existed."* Batch 121 repeated it at seven sites.

**Actionable.** Either open the blockers before merge — at minimum: the identity-PK vs partition cost
to 150, the un-enforced cadence, the snapshot-age rule, §8.3's missing SELECT row for the metric, the
ERD `METRIC_SNAPSHOT` vs §4.8 `performance_snapshots` mismatch, and the un-writable page-scope case
(F4) — or change the sentences before the text is frozen. The two inside SQL comments must be settled
in this batch; there is no later cheap fix.

### F2 — HIGH — **stop-the-line.** The fixture states the opposite of what the suite measures, and cites a case id that does not exist. A second artifact claims the fixture was corrected; it was not.

**What I did.** Extracted all 24 case ids added to `tests/db/identity/isolation-cases.mjs`, then
searched the whole repository for the id the fixture names.

**What I found.** The fixture's §8.6-case-4 section says, over seven lines:

> the page-pinned member is admitted to NOTHING in this family, because every post that exists hangs
> off a business-level item, and `pinned-editor-a-sees-zero-metric-snapshot-rows` is that measurement.

`pinned-editor-a-sees-zero-metric-snapshot-rows` **exists nowhere in the repository** except in that
sentence. It is not a case. The case that does exist is
`pinned-editor-a-sees-the-metric-snapshots-of-the-fb-send`, and its `expect` is **`'rows'`** — the
page-pinned member sees the series, which is the opposite of "admitted to NOTHING".

The implemented case knows this. Its own `why` reads: *"MEASURED, AND IT CONTRADICTED THE PLAN. Batch
121's plan asserted that the page-pinned member would be admitted to nothing in this family; the live
run returned 2... the plan's sentence is corrected in the fixture that made the claim."*

**That correction was never made.** The fixture at 426c294 still carries the claim verbatim. So the
batch contains one artifact asserting a fix landed in a named file, and that named file still
carrying the thing it was supposed to fix.

**Why HIGH.** A reader of the fixture — which is where the tenant shape of this family is explained —
is told that page-pinned members reach nothing in the publishing family. The suite measures that they
reach two rows. The measurement is the correct one and the reasoning behind it (an item with a NULL
`page_context_profile_id` is tested by `app.member_scope_admits_business`, and a single-Page scope is
a scope *within* a business) is right and worth keeping. It is the surviving fixture prose that is
false.

**Actionable.** Correct the fixture's §8.6-case-4 section to match the measurement, and remove or
rename the non-existent case id. Then re-check the case `why` that claims the correction was made.

### F3 — MEDIUM. §3.3 names `social_account_id` as required for metrics. The table has no such column and the batch never mentions it.

**What I did.** Read §3.3's canonical tenant-boundary table and grepped the migration for the column.

**What I found.** §3.3 ("Canonical field names เท่านั้น") gives a Required-when column:

> `| Connected destination | social_account_id | target/publish/metrics |`

"metrics" is named explicitly. `app.performance_snapshots` has no `social_account_id`; the only
occurrence of the string in the migration is the header's recital of batch 120's
`published_posts_external_hash_unique`. Batch 120's own `publish_targets` and `published_posts` both
carry the column `not null`.

§4.8's bullet for this table does not list it, so this is a genuine tension between §4.8 and §3.3 —
resolvable (the account is reachable through the post) but a decision either way. The batch does not
implement it, does not defer it with a reason, and does not contradict it knowingly. It is the one
document tension in this batch that goes unmentioned, in a batch whose whole method is to surface
them: it surfaces the ERD naming mismatch, the identity-PK/partition tension, the missing §8.3 SELECT
row, the cadence, and the cross-table age rule.

**Actionable.** Say which reading governs and record it. If the account is deliberately reached
through the post rather than denormalised, that is a defensible answer and belongs in the header
beside the other four.

### F4 — MEDIUM. A case tagged `covers: ['§8.6/4']` measures the opposite of §8.6 case 4, and §8.6 case 4 is then covered nowhere for this table.

§8.6 case 4 is *"Same Business + allowed Page A แต่ row Page B → deny"*. The only case carrying that
tag is `pinned-editor-a-sees-the-metric-snapshots-of-the-fb-send`, which expects `'rows'` and
demonstrates no denial at all. Its `why` is honest about what it measures; the `covers` tag is not.

The fixture explains why the deny case cannot be written yet — no page-pinned send produces a post —
and that explanation is sound. But the consequence is that one of §8.6's ten mandatory authorization
cases is unsatisfied for `app.performance_snapshots` while a tag claims it is satisfied, and the
blocker the fixture says records the gap does not exist (F1).

Separately: §8.6 case 10 ("Authorized server command → pass + expected audit/outbox") is covered by no
case for this table. That is correct behaviour — RFC-2026-022 is approved and not in effect, so the
service INSERT is refused — but the plan's §6 assigned cases 17 through 20 to "§8.6 case 10" and the
implementation quietly drops that claim rather than recording the gap. Dropping it was right; not
recording it is the same silence as F1.

**Actionable.** Drop or re-tag the `§8.6/4` claim, and record both uncovered mandatory cases.

### F5 — MEDIUM. The manifest says the assertion count moves. It did not, and the assertion floor is now slack.

`amends_without_owning.rationale` states: *"evidence/VERIFICATION.md and scripts/test-suite-contract.mjs
carry the test and assertion counts, which move because this batch adds cases. The floors are the
numbers `node scripts/verify-test-coverage-floor.mjs` prints, never a count taken by hand."*

In the diff: `DECLARED_TEST_FLOOR_BY_FILE` for `identity-isolation.test.mjs` moves 296 to 301, the
name digest changes, and `evidence/VERIFICATION.md` moves 658 to 663. **`DECLARED_ASSERTION_FLOOR_BY_FILE`
for the same file stays at 2101**, while five new tests carrying roughly thirty new `assert` calls
were added. Batch 120 raised both numbers and its handoff says so ("2026 -> 2101 assertions").

So the rationale's claim is false for half of what it claims, and the effect is a weakened control:
the declared assertion floor now sits below the actual count, and assertions could be deleted without
the floor objecting. That is the same failure mode Q0's F2 against batch 120 closed for probes.

**Actionable.** Run the floor script and raise the assertion floor, or state why it stays.

### F6 — LOW. `§9.2's "never a provider's message"` is a quotation of a phrase §9.2 does not contain.

§9.2's prohibitions list reads *"provider stack trace หรือ full SDK error"*. It nowhere says "never a
provider's message". The phrase is established shorthand — batch 120 and A1's batch-120 review both
use it — but 120 wrote it as "never a provider's message **or stack trace** (§9.2)", keeping the half
that is actually in the source. Batch 121 drops that half and quotes the remainder against §9.2
twice, once inside `comment on column app.performance_snapshots.metrics`, which invariant 1 freezes.

The underlying control is real and correct; only the quotation marks overreach. Recorded rather than
graded higher because it is inherited, but the frozen instance is worth fixing while it is cheap.

### F7 — LOW. Migration probe 3 violates two constraints and passes only by PostgreSQL's constraint-name ordering.

Probe 3 inserts `'[]'::jsonb` and demands `performance_snapshots_metrics_is_an_object` by name. That
payload also violates `performance_snapshots_metrics_keys_are_known`: for a JSON array,
`jsonb - text[]` deletes matching *elements* and returns `'[]'`, which is not `'{}'`. Two checks are
violated; the probe asserts which one fires.

It will fire correctly — PostgreSQL sorts a relation's check constraints by name before evaluating
them, and `..._metrics_is_an_object` sorts ahead of `..._metrics_keys_are_known` — but that is an
implementation detail no comment acknowledges, and renaming either constraint would silently flip
which SQLSTATE message the probe sees. The other four probes each violate exactly one constraint.

### F8 — LOW. "§4.8's bullet, in full" is two bullets.

§4.8 gives `performance_snapshots` two bullets (plans document lines 375 and 376). The migration
header, the plan and the manifest all quote them joined by a semicolon and call it "§4.8's bullet, in
full". **The quoted text is verbatim accurate** — I compared it character by character — so this is a
description error, not a misquotation.

### F9 — LOW, recorded and not actionable. An empty `metrics` object satisfies all four shape constraints.

`'{}'::jsonb` passes `is_an_object`, `keys_are_known` (nothing to delete, result is `'{}'`),
`values_are_numbers` (every key absent, `coalesce` admits each) and `is_bounded`. A snapshot that
measured nothing is insertable. No comment claims otherwise, so nothing here is false; noting it
because the table comment describes "what a published post measured at an instant" and a vacuous
measurement is admitted.

### F10 — LOW. Three `§12.6` coverage tags name the wrong smoke assertion.

§12.6/1 is *"user_owner_a sees Workspace A, never Workspace B"*; §12.6/2 is *"user_editor_a sees
Business A1/Page A1, never A2/Page A2"*. But `editor-a-sees-the-metric-snapshots-inside-their-narrowing`
and `pinned-editor-a-sees-the-metric-snapshots-of-the-fb-send` are tagged §12.6/1 (an owner
assertion), and `owner-b-cannot-read-a-metric-snapshot-of-tenant-a` is tagged §12.6/2 (an editor
assertion). `owner-b-sees-the-metric-snapshot-of-their-own-send` tags §12.6/1, which is about
`user_owner_a`, as a mirror. Cosmetic, but these are citations and the batch is graded on citations.

### F11 — LOW, recorded and not actionable. "no role — the service included — holds UPDATE or DELETE" is literally false of the owner.

`postgres` owns the table and holds every privilege, and the migration's own header says the only
member of `app_worker` is `postgres`. The apply-time assertion is written honestly — it filters
`grantee <> 'postgres'` — but the `comment on table` sentence is unqualified. The phrasing is
**verbatim inherited** from batch 120's `published_posts` comment, which is merged and reviewed, so
grading it against 121 would re-litigate 120. Recorded so it is not discovered a third time.

### F12 — LOW. The partition cost is stated slightly too strongly, and one consequence is unstated.

The batch's account of the identity-PK vs partition-ready tension is **substantially correct**: a
PostgreSQL partitioned table does require every unique constraint including the primary key to
contain the partition key; `unique (published_post_id, metric_time)` does contain it; `primary key
(id)` does not. The migration explicitly disclaims the error that would matter most — *"nothing in
this file claims the table can be partitioned by an `alter` alone"* — and asserts only what is true.

Two refinements. First, PostgreSQL has no `ALTER TABLE ... PARTITION BY` at all, so batch 150 must
rebuild the table whatever the primary key is; the identity PK adds a key change to a rebuild that
was already unavoidable, rather than causing one. Calling it "a real cost of reading §4.8's two
clauses in the order the Owner chose" overstates the marginal cost. Second, unstated: once the key
becomes `(id, metric_time)`, the database no longer enforces uniqueness of `id` alone.

---

## 2. The author handoff — not yet refreshed for this batch

`handoffs/WP-0A-DB-00-author-handoff.json` at 426c294 **has not been refreshed for batch 121 at
all**, and I grade it as the brief directs rather than as if it were final. Its mechanical fields
still describe the fifth-pass record: `base_revision` `b61c634`, `head_revision_or_patch_checksum`
`3bf8584`, `files_added` listing only `evidence/WP-0A-DB-00/session-2026-09-15-fifth-pass.md`. Every
narrative field describes batch 120. The plan's §10 puts the handoff last and alone, so this is on
schedule, not a defect.

What it must contain when written, given what C0-120's H1 finding established — that
`refresh-author-handoff.mjs` regenerates only the mechanical fields and leaves every narrative field
describing the previous pass:

- **Mechanical**: base `0f3a08b`; head the final batch-121 head; `files_added` the migration, the
  fixture and this batch's evidence files; `files_modified` the other sixteen paths.
- **`tests`**: 663, not 658 — and it must agree with `evidence/VERIFICATION.md`, which is the exact
  contradiction C0-120 graded stop-the-line. The isolation figure must be the batch-121 number, not
  941.
- **`migration_and_data_impact`**: currently describes batch 120's five tables and the forward key
  `content_targets_destination_key` on batch 081's table. For 121 it must describe **one new table**
  and the forward key **`published_posts_scope_unique`** on batch 120's merged `app.published_posts`.
  "None." for migration impact against a new table was C0-120's specific finding.
- **`open_risks_or_blockers`**: currently says "164 -> 174", while the manifest holds 175. Whatever
  F1 resolves to must be stated here as an actual count against the actual file.
- **A PR and a CI run on the final head**, which RFC-2026-002 requires and which the current file has
  neither of.
- **`recommended_next_work_packages`**: currently recommends batch 121, which is this batch.

## 3. What I checked and found correct

Said explicitly, because a review that lists only faults misreports the batch.

**Every citation resolved except as noted in F6.** No ADR is cited anywhere in the migration or the
fixture, so the `ADR-010`/`ADR-012` class of error found against batch 120 cannot recur here.

| Cited | Source | Verdict |
|---|---|---|
| §4.8's bullet text | plans doc, two bullets | verbatim (F8 on "one bullet") |
| §8.3 row `Publish delivery/post/metric INSERT \| N \| N \| N \| N \| N \| S` | ERD doc §8.3 | verbatim |
| §8.3 gives publishing no read row at all | §8.3 | true |
| §10 `PUBLISH-HISTORY`, "metrics detail 24 เดือน default" | §10 | verbatim |
| §11.1 puts publish history in the export minimum | §11.1 | true |
| §3.2 "publish history ห้าม update" | §3.2 | true |
| §3.2 identity PK for high-volume append-only | §3.2 | true |
| §6 gives 121 "metric snapshots", depends it on 120 alone | ERD §6 registry | verbatim |
| §6 gives 150 "indexes/partition readiness" | ERD §6 registry | verbatim |
| §8.5 `TO authenticated`, no anon policy, FORCE RLS | §8.5 | true |
| RFC-2026-022 §3 table: `120`, `121` \| CARRIED \| "the delivery is against a known target" | RFC §3 | verbatim |
| RFC-2026-022 §5/4 "the confinement term is NOT a boundary" | RFC §5 item 4 | true |
| RFC-2026-022 §5/8 approved and NOT IN EFFECT | RFC §5 item 8 | true |
| 111 added `social_accounts_scope_key` to 110's table | `111_social_fk.sql` | true |
| 120 added `content_targets_destination_key` to 081's table | `120_publisher.sql` | true |
| `published_posts` carries exactly three keys, named | `120_publisher.sql` | true |
| 050 is the precedent for an identity PK | `050_async_kernel.sql` | true |
| 093 set_updated_at, 104 FK indexes, 140 subtransaction shape | those files exist and match | true |

**The §4.8 bullet against the table, clause by clause.** "High-volume identity PK" — implemented.
"scope" — `workspace_id`, `business_profile_id`, both `not null`. "published_post_id" — implemented.
"metric_time" — implemented. "metric values/JSON with schema version" — `metrics jsonb` +
`metrics_schema_version`. "unique `(published_post_id,metric_time)`" — implemented exactly.
"Partition-ready by month" — **deferred with a stated reason** (question B; §6 gives partition
readiness to 150), partly delivered (the unique carries the partition column, the month-sliceable
index exists), and the shortfall named rather than hidden. "No destructive overwrite" — implemented
three ways: the unique makes a re-collection a collision, no UPDATE or DELETE is granted, and no
`updated_at` or trigger exists. Nothing in the bullet is silently contradicted. **The batch's account
of the identity-PK/partition tension is correct** and its consequence for batch 150 is stated in the
right direction, with the two refinements at F12.

**The ERD naming reading is correct.** §4 draws `PUBLISHED_POST ||--o{ METRIC_SNAPSHOT : measures`;
§4.8's heading is `performance_snapshots`. The mismatch is real. Taking §4.8 is defensible on the
batch's own stated ground — §4.8 is the column-level blueprint and names a table, §4 names an entity
— and §6's registry calls the work "metric snapshots" without naming a table either way. The reading
is sound; only the blocker it promises is missing (F1).

**`service-policy-map.json`.** The new cell's `why` **is** a real application of RFC-2026-022 §3's
operational test to this statement and not 120's reasoning restated: it forms the collector's insert,
argues the workspace is an input because resolving a post resolves its workspace through a NOT NULL
column, applies the §3 operational form by adding the confinement term and observing the work is
unchanged, contrasts 050's queue claim and 110's webhook inbox as DISCOVERED, and adds a schema-side
argument (the NOT NULL plus `performance_snapshots_post_scope_fk`) that 120's post entry does not
make. It **does not contradict** §3's own table at line ~177 — it agrees with the row that names
`120` and `121` together and calls the cell CARRIED. The §5/4 disclaimer is present and correctly
scoped, and no comment, case or assertion in the batch cites the confinement term as isolation.

The claim that this table has **one entry and not three** is correct in its conclusion: §8.3 carries
no metric UPDATE, DELETE or SELECT row, so there is nothing else to classify. Its reasoning is
slightly loose — it calls UPDATE and DELETE "`N` for every role" and SELECT "does not exist", when in
the matrix all three are equally absent — but the parenthetical correctly attributes the `N` to
§4.8's "no destructive overwrite" rather than to §8.3, so the sentence does not misdescribe the
matrix. The `_what_batch_121_classified` note is accurate, and batch 120's entry was not edited (only
a trailing comma).

**Comment accuracy as a control — the four `metrics` constraints do what their comments say.** Read,
not run. `metrics_is_an_object`: `jsonb_typeof(metrics) = 'object'`, as stated.
`metrics_keys_are_known`: `metrics - array[...ten keys...] = '{}'::jsonb` — for an object this
deletes the known keys and any unknown key survives, so `error`, `message` and `id` fail exactly as
the comment says. `metrics_values_are_numbers`: `coalesce(jsonb_typeof(metrics -> key), 'number') =
'number'` over all ten keys — an absent key yields SQL NULL and `coalesce` admits it, while a string,
object, array, boolean **and an explicit JSON `null`** all fail, which is what the comment claims and
slightly more. `metrics_is_bounded`: `octet_length(metrics::text) <= 2048`, and ten numbers do not
approach it. Taken together the pair of key and value constraints does enforce the claim in the
column comment — a closed set of ten keys, every value a number — so the A1 `failure_class` lesson
is genuinely applied rather than asserted. The grant arithmetic is right too: eight SELECT columns,
six INSERT columns (identity and defaulted `collected_at` excluded), zero for `anon`.

**The negative-control disjointness claim is true, and I verified it statically.** All 24 case ids
contain `metric-snapshot` and so match `[a-z0-9-]*metric-snapshot`; none contains `publish-intent`,
`publish-target`, `publish-pin`, `publish-job` or `published-post`; no case id from any other batch
matches the 121 pattern; and 070's `research-snapshot` pattern matches nothing here in either
direction. The static test asserts this both ways rather than leaving it to be read, and asserts the
basis is exactly seven cases with the service INSERT denied at the policy layer and the four others
at the grant layer. Whether those seven actually flip live is Q0's to measure, not mine.

**The manifest.** `ownership.branch` is `agent/claude/WP-0A-DB-00-batch-121`, matching the branch
under review and pinned consistently in both places in `test-kits/branch-identity.test.mjs`. All five
`amends_without_owning` paths correspond to real changes in the diff and each rationale explains its
own change — `.github/workflows/ci.yml` one control line, `evidence/VERIFICATION.md` 658 to 663,
`scripts/test-suite-contract.mjs` the floor and digest (**with F5's false half**),
`branch-identity.test.mjs` the two pinned lines, `integrity-manifest.json` regenerated. Every other
changed path falls inside declared `writable_paths` (`db/foundation/**`, `tests/db/identity/**`,
`evidence/WP-0A-DB-00/**`, `work-packages/WP-0A-DB-00.json`), including the amendment to batch 120's
own fixture, which fixes three post ids and changes no row's content — the same move batch 120 made
to batch 081's six target ids. The `fixture-catalog.json` note that previously declared a post needs
no symbol is **corrected in place rather than left to contradict the three new symbols**, which is
the right handling and the opposite of F2's failure.

---

## 4. Limits of this run, in my own words

I read; I did not measure. Every SQLSTATE in this batch, every row count beside the seven
negative-control cases, the test and isolation totals, the assertion counts, and the pass of all
seven probes are unverified by me and must come from Q0's live run. My reading of the four shape
constraints is reasoning about PostgreSQL semantics from the text, and F7 is precisely a place where
that reasoning depends on behaviour no document in this repository pins. I did not check whether the
narrowing's four joins return what they should for any identity — that is a measurement. I did not
run `verify-branch-scope.mjs`, so I cannot say the branch scope check passes; I can only say that
every changed path is declared somewhere I could find it by reading. And I am the Author's own
subagent: a second reader who shares the first reader's blind spots is not an independent review, and
F1 is exactly the kind of error that survived two passes of this process once already.

I approve nothing. Findings 1 and 2 are stop-the-line and halt the merge until the Owner disposes of
them.
