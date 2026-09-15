# Product Owner disposition — 2026-09-15, in session: batch 120 (Publisher), the fourteen questions

Transcribed by `/claude/a0_atlas` (Author) from the ThinkBizThai project conversation of 2026-09-15, after
[`a0-batch-120-plan-2026-09-15.md`](a0-batch-120-plan-2026-09-15.md) was put to the Owner in session with its
§11 table (fourteen questions, lettered options, A0's recommendation named on each). The Owner's words are
verbatim; A0's question is summarised from the memo so the answer is read against what was asked. This file is
none of the four role signatures RFC-2026-002 requires and decides nothing itself.

## 1. What A0 put to the Owner

The memo's §11, reproduced in the session message as a fourteen-row table — each row a question, its lettered
options, and the sentence "ผมแนะนำ (a) ทุกข้อ" — followed by: "ถ้าคุณตอบมา ผมจะถอดคำตอบตรงตัวลง disposition file แล้ว
เริ่มเขียน 120 บน branch เดิม".

## 2. The Owner's answer (verbatim)

> ไล่ทำทุกอย่างตามที่คุณแนะนำเลยได้ไหม

## 3. How A0 read it, and what it does

Read: **every question takes A0's recommended option** — the first option of each row. No question was answered
differently, no option was added, and no correction was made to the readings the memo labels as A0's.

| # | Question | Taken as | Consequence in batch 120 |
|---|---|---|---|
| 1 | PR scope | (a) | 120 alone; 121 (metrics) is the next pull request |
| 2 | editor on "Publish now" (`P`, no capability) | (a) | owner/admin only; editor refused at the policy layer; blocker recorded (090's shape) |
| 3 | who creates `publish_targets` | (a) | the service — target + job are the "delivery"; the user writes only the intent |
| 4 | client SELECT | (a) | column-scoped SELECT to active members with the narrowing through `content_items`; blocker in 090's shape |
| 5a | `status` vocabulary (target / job) | (a) | target `pending, publishing, published, failed, skipped`; job `queued, running, succeeded, failed` — as CHECKs |
| 5b | `status` column on the intent | (a) | no column in 120; the intent's state is computed from its targets; the deviation from §4.8 is a blocker |
| 6 | raw external identifiers | (a) | `app` holds sha256 only; the raw account and post identifiers stay owed to the typed service (blocker 5 carried by 120, not closed) |
| 7 | `permalink` | (a) | not stored in 120 |
| 8 | asset pin | (a) | child table `publish_target_assets`, composite key into `asset_versions`; blocker 153 restated |
| 9 | `kernel_job_id` | (a) | no foreign key (061's reason) |
| 10 | worker UPDATE on target/job | (a) | column-scoped UPDATE on progress columns, `status`, attempt scalars and the error code; never cancellation |
| 11 | closure | (a) | `122_publisher_service_path_closed.sql` closes `publish_intents` and `publish_target_assets` (question 3 = (a), so `publish_targets` stays open as an S-cell table) |
| 12 | batch 091 absent | (a) | proceed; `request_kind = 'scheduled'` without a schedule row is a blocker to A5 |
| 13 | platform vocabulary | (a) | `facebook` / `instagram`; the `fb`/`ig` mismatch with 110 is a blocker |
| 14 | client INSERT on the intent vs RFC-2026-012 line 105 | (a) | the client writes the intent per §8.3 `Y`; the conflict with RFC-2026-012's inventory line is a blocker to that RFC's owners |

The sentence "ไล่ทำทุกอย่าง" is also read as the Owner's instruction to carry the batch through the path the memo's
§10 describes — commit → Draft PR → role runs → CI green on the head → merge — in the same delegated form the
Owner gave on 2026-09-15 for the overnight passes ("ทยอย commit -> PR -> merge เป็นชุดๆไป"). Every clause of
RFC-2026-002 still applies: a green required CI run on the head, three distinct role runs, and a handoff that
records PR, head SHA, CI run and rollback. A stop-the-line finding by any role run halts the merge and is put
back to the Owner.

## 4. What this file is not

Not a definition of the editor's publishing capability, of who reads a provider error code, or of how the raw
identifiers will eventually be stored; not an amendment to RFC-2026-012 or to §4.8 of the workstream document;
not a disposition of RFC-2026-023, which stays In review.
