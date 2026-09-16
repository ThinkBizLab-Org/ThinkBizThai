# Product Owner disposition — 2026-09-16, in session: batch 121 (metric snapshots), the thirteen questions

Transcribed by `/claude/a0_atlas` (Author) from the ThinkBizThai project conversation of 2026-09-16, after
[`a0-batch-121-plan-2026-09-16.md`](a0-batch-121-plan-2026-09-16.md) was put to the Owner in session with its
§11 table — thirteen lettered questions, options on each, and A0's recommendation named ON each as a
recommendation. The Owner's words are verbatim. This file is none of the four role signatures RFC-2026-002
requires and decides nothing itself.

## 1. What A0 put to the Owner

The plan's §11, reproduced in the session message as a thirteen-row table: each row a question, its options,
and a column headed "ผมแนะนำ" naming one of them. Above it, §2 gave the reason for choosing batch 121 over
batch 091 and §4 reported the thing A0 had measured and could not work around — that `app.published_posts`
carries no unique on `(workspace_id, business_profile_id, id)`. Below it, §6 gave the twenty-one case ids and
§7 the seven apply-time probes, so the Owner was answering against a case list and not against a promise of one.

## 2. The Owner's answer (verbatim)

> เอาตามคุณแนะนำ

## 3. How A0 read it, and what it does

Read: **every question takes A0's recommended option.** No question was answered differently, no option was
added, and no correction was made to the readings the plan labels as A0's. This is the same form of answer the
Owner gave on 2026-09-15 for batch 120 ("ไล่ทำทุกอย่างตามที่คุณแนะนำเลยได้ไหม") and it is read the same way.

| # | Question | Taken as | Consequence in batch 121 |
|---|---|---|---|
| A | table name | recommended | `app.performance_snapshots`, §4.8's own heading; the ERD's `METRIC_SNAPSHOT` mismatch is a blocker |
| B | partitioning | recommended | partition-READY and not partitioned; the `partition by range` is batch 150's, per §6 |
| C | primary key | recommended | `id bigint generated always as identity primary key`, §4.8 read literally |
| D | `metrics` PROVIDER-3 | recommended | inside the client SELECT WITH a shape CHECK — bounded keys, numeric values, bounded size (A1 F1's lesson) |
| E | client SELECT authority | recommended | column-scoped SELECT to active members, narrowed post → target → intent → item; the missing §8.3 SELECT row is a blocker in 090's shape |
| F | `metric_time` and cadence | recommended | the provider's measurement instant; the database enforces uniqueness and not cadence; a repeat is `23505`, never an overwrite. The un-enforced cadence is a blocker |
| G | metric schema version | recommended | `metrics_schema_version integer not null check (>= 1)` |
| H | the scope FK | recommended | 121 adds `published_posts_scope_unique` to 120's table as a forward fix in its own file, and carries the composite scope FK; disclosed in the header |
| I | immutability | recommended | no `updated_at`, no trigger, no UPDATE and no DELETE for any role including `app_worker` |
| J | service policy | recommended | classified CARRIED in `service-policy-map.json`; `app_worker` holds SELECT and INSERT and NO policy — approved and NOT IN EFFECT (RFC-2026-022 §5/8) |
| K | closure file | recommended | none; an `S`-cell table stays open so §7's CARRIED policy is not pre-empted, which is 122's own reason |
| L | retention | recommended | commented `PUBLISH-HISTORY` naming §10's "metrics detail 24 เดือน default"; enforced nowhere, because 160 owns retention |
| M | PR scope | recommended | 121 alone: one migration, one pull request, three role runs, merge after CI is green on that head |

The answer is also read as the Owner's instruction to carry the batch through the path the plan's §10
describes — branch → migration and cases → three role runs → cherry-pick → handoff last and alone → Draft PR →
CI green on the head → the Owner merges — in the same delegated form the Owner gave on 2026-09-15
("ทยอย commit -> PR -> merge เป็นชุดๆไป"). Every clause of RFC-2026-002 still applies. **A stop-the-line finding
by any role run halts the merge and is put back to the Owner.**

## 4. What this file is not

Not an approval of the one line this batch proposes for `.github/workflows/ci.yml`, which is the Integration
Owner's file. Not a definition of who reads a metric, of the collection cadence, or of the raw provider
identifiers batch 120 deferred. Not an amendment to §4.8, to §6's assignment of partition readiness to batch
150, or to §8.3's access matrix. Not a disposition of RFC-2026-023, which stays In review at the Owner's own
request.
