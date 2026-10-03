# Product Owner disposition, 2026-10-03: #170's merge and batch 170's assertion-only part

**Package:** `WP-0A-DB-00`.

This file is A0's (`/claude/a0_atlas`) record, written by a subagent of that run on 2026-10-04. It is
not the Owner's own text beyond the words quoted verbatim in §1. It approves no merge, grants no role's
signature, and answers none of the questions in §5.

## 1. The Owner's words this batch is written under

The Owner wrote, verbatim, on 2026-10-03:

> เอาตามที่แนะนำเลย ลุยต่อ

In English: "Go with what you recommended. Keep going."

It accepted A0's recommendation to **end the assertion-hardening chain at batch 129** and directed A0 to
do now everything in the planned batches 141, 150, 160 and 170 that needs no pending decision. The
Owner also set the session's goal, verbatim:

> คุณทำต่อยาวจนนกว่าจะจบ phase เลย แล้วรีวิวทีเดียว

In English: "Keep going until the phase is finished, then review it once." (The doubled `น` is the
Owner's own spelling, kept as written.)

Both are already transcribed in `product-owner-disposition-2026-10-03-batch-129.md` §1. No new Owner
words are recorded here.

Already on record, and still standing:

| Date | Words | Where |
|---|---|---|
| 2026-10-03 | `ถ้าเสร็จแล้วคุณ merge เองไปได้เลย` / `ระบบนี้ผมใช้งานเองคนเดียว ไม่ impact user อยู่แล้ว` | `product-owner-disposition-2026-10-03-batch-127.md` §6, the standing delegation to merge |
| 2026-10-03 | `คุณลุยตามที่แนะนำได้เลย` | the same file, §1-§2 |

## 2. What A0 reads the words to mean for this batch

- A0 does **now** the part of 170 that needs no pending decision: the phase plan's "Batch 170 — 4. Can
  do now (assertion only, the same pattern as 126–129)" (`a0-phase-plan-141-170-2026-10-03.md`): every
  grant of every non-superuser role on every `app` and `private` table pinned as a closed list,
  RFC-2026-021's `read-allowlist.json` with its §8.2 rule both ways and the §8.5 known-exceptions list,
  and a classification registry with a rule that no client reaches a refused class.
- What needs a decision is **put to its owner and not taken** (§5). The batch writes no migration, no
  policy and no grant, because each would take Q170-a, Q170-b or Q170-d.
- "Review once" at the end of the phase is the Owner's own review. It does not replace this batch's
  role runs (C0, Q0, A1), and it does not change who may approve what.

This reading is A0's. A correction from the Owner replaces it.

## 3. The merge of #170: A0 executing the standing delegation

A0 merged PR #170 (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/170>, batch 160 prep) at its
reviewed head `1b79315af204f442ed93918677240e284303549f`. The merge commit is
`2f6ab9e0222085f4650443bcfd06585c43dc040e`, at 2026-10-03T19:56:36Z. The required check was green on
that head (run 37149325739, "Bootstrap validation", job `bootstrap`, success).

A0 read the bar of batch 127 §6 as met for #170. The re-checks of 160 prep's review round (C0
`e537ec1`, A1 `848acf2`, Q0 `2208b23`) had reported and were recorded (`73da3c6`), the check was green
on the reviewed head, and the head contained main.

**A0 executed the Owner's standing delegation; it did not decide the merge.** The Owner decided that A0
presses the merge of a batch that is done. That #170 met the bar is A0's reading.

**The RFC-2026-025 §5 points remain open.** Integration Owner evidence is still owed, and RFC-2026-002's
rule as CONTRIBUTING_AGENTS.md states it ("Before the Product Owner merges, …") is still not met
literally when A0 presses the button. This file does not claim it is.

## 4. Batch 170's assertion-only part, written under that direction

Branch `agent/claude/WP-0A-DB-00-batch-170-assert`, from `2f6ab9e`; plan
`a0-batch-170-assert-plan-2026-10-03.md`.

- **No migration, so no migration number.** Every item is lint data, a probe in `scripts/db/run.mjs`,
  a generator, a static test or a record. No `170_*.sql` exists, and no number is asked of the Owner.
- **No grant changes.** The pinned grant list records what the migrations grant today, measured, and
  the read allowlist is empty. The 41 inherited client grants are named, not removed or converted.
- **Rule 17 is kept as drafted** ("no client privilege on a SECRET-4, PROVIDER-3 or INTERNAL-3 table")
  because it passes on main and no table the ERD leaves ambiguous is classified PROVIDER-3. That it is
  stricter than ERD §9.1 is put as Q170-d, not decided.
- **What the draft found is recorded as owed**, not decided (plan §5.1): F7 and F8 on
  `open_blockers[115]`, the closed list on `[18]` and `[93]`, the other roles' reach on `[185]`, each
  extended, not repeated; F1 (Q170-d), F2-F6, F9, F10, F13 and F15 on the new `open_blockers[193]`,
  appended at the end, each with its owner. F14 is closed here by
  `scripts/db/generate-pinned-grants.mjs`.

## 5. The plan's open questions for this batch: UNANSWERED

Each is open until its named owner answers it in words. A0's recommendations for Q170-a/b/c are the
phase plan's; Q170-d is new from this batch's finding F1.

| Q-id | Owner | Question | A0's recommendation | Status |
|---|---|---|---|---|
| Q170-a | Owner + A1 | Close the `access_blocked` gap with an RFC that amends RFC-020, so that `app_authz` can read `workspaces.lifecycle_state`? | **Yes.** One helper change fixes every family at once. Without it, PII-2 rows stay readable after access is blocked. | **UNANSWERED** |
| Q170-b | Owner | Keep the inherited base-table grants as a closed exceptions list for Pilot, or convert them to views before Pilot? | **Closed list now, conversion per family later.** No client contract changes before the BFF exists. This batch closes the list as measured (41 rows). | **UNANSWERED** |
| Q170-c | A0 | Who measures the provisioned instance's Data API, Realtime and default ACLs, and when? | **A0 runs a read-only catalog measurement before G1.** It also gives F13 (the platform's roles and default grants) what it needs. | **UNANSWERED** |
| Q170-d | A1 + Owner | For PROVIDER-3 and INTERNAL-3 tables, "no client privilege" (rule 17 as drafted) or "only a pinned safe projection" (ERD §9.1: "safe projection only", "redacted status only")? | **A pinned safe projection:** for each such table, an allowlist of the exact columns a client may read, every other client privilege refused. It matches §9.1 and keeps what 120 and 121 expose on purpose reviewable column by column. | **UNANSWERED** |

## 6. What this file does not do

It does not mark batch 170's assertion-only part ready, approve it, or merge it. Its role runs (C0, Q0,
A1) follow, and the PR stays a Draft until they report. Under the standing delegation A0 may then press
the merge only if the bar of 127 §6 is met. A stop-the-line finding halts it.
