# A1 re-verification: batch 125's text corrections (`155d906`, handoff `5d4969e`)

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer for `WP-0A-DB-00`
Subject: `155d906` (the text corrections) and `5d4969e` (the handoff, alone) on branch
`agent/claude/WP-0A-DB-00-batch-125` (Draft PR ThinkBizLab-Org/ThinkBizThai#163), over `56b10e0`.
Routed here under RFC-2026-025 §5 item 2, as a commit that answers my findings. I checked `5d4969e`
out in my own worktree as the local branch `review/a1-batch-125-wording`.
Author: `/claude/a0_atlas`
Date: 2026-09-28
My review being answered: `a1-batch-125-security-review-2026-09-28.md` (V1-V8). In the branch it is
byte-identical to my original commit `e4d0985`.

**This document records findings. It advances no package status, signs nothing on anyone's behalf,
writes `security_approved` nowhere, and repairs nothing it found.**

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author. I ran in A0's worktree under a brief A0's workflow
wrote, and I am the same vendor and model family as A0. RFC-2026-024 withdrew the cross-vendor
condition, so that fact does not by itself disqualify this run. The Author still chose what to point
me at. **Acceptance is the Integration Owner's (`/claude/r0_steward`) and the Product Owner's act**,
not mine and not A0's.

## 1. What I checked, and how

All of this was read, not measured. I started no cluster (§5).

- **Scope.** `git diff --stat 56b10e0 5d4969e` touches five files: `db/foundation/README.md`, A0's
  record, the Owner disposition, the handoff and the manifest. **None of them is code, a migration, a
  test, a case, a fixture or a probe.**
  - A structural comparison of the manifest's JSON shows exactly two changed values:
    `open_blockers[185]` and `[189]`, which are blocker 186 and blocker 190. The count stays 190.
  - `git diff --stat d85a643 5d4969e` over `db/foundation/{migrations,invariants,ci,fixtures}`,
    `scripts`, `tests` and `test-kits` is empty. The code is the code I measured, so my measurements
    on `d85a643` still apply.
  - `5d4969e` changes one line of the handoff and nothing else.
- **What I read.** `git diff 56b10e0 5d4969e` in full, and my own review. I checked the corrected
  text against:
  - `125_approval_settled_is_immutable.sql:40-43, 57-63, 75-76`;
  - `090_approval.sql:474-482` (the grants);
  - `scripts/db/run.mjs:222-238, 481, 493-521`.

## 2. Verdicts on the findings the commit answers in text

**V1 (LOW): now TRUE.**
- **Blocker 186** says the trigger refuses a change to a recorded decision's `decided_by` or
  `decided_at` "by any writer that fires triggers". It says the OUTCOME is frozen "for clients only,
  by the settled-row closure". Both match the code:
  - the function reads only `decided_by` and `decided_at`, never `status` (`125:57-63`);
  - the trigger is BEFORE UPDATE only (`:75-76`);
  - the closure is `TO authenticated` (`:40-43`);
  - "that fires triggers" matches my N6 and N7 (replica mode, the trigger disabled).
- **README heading.** "A settled request cannot be touched by a client" holds. `status`,
  `decided_by` and `decided_at` are outside the client INSERT grant (`090:478-480`), and no migration
  grants DELETE on the table.
- **Handoff.** The criterion and evidence are exact.
- **Recording and remedies.** Item 15 records the rest at LOW, and my remedy 4 is done. Two wording
  residues remain (W1).

**V4 (LOW): now TRUE.**
- Item 4's "(the keyword half only: a psql meta-command in a drift still gets through)" matches the
  code. `TRANSACTION_CONTROL` is a keyword regex (`run.mjs:481`), applied to drifts at `:498`, and no
  rule scans drifts for a backslash.
- Item 12 records the class at LOW, with my M2.

**V6 (NOTE): TRUE, but incomplete.** Item 8's "(UPDATE only: a client-INSERTable attribution column
with no closure still passes)" matches `run.mjs:231-232`. The name-based half of V6 is not recorded
(W4): an updatable column not named `*_by`, such as `approver`, passes. V6's grade is not stated
anywhere either.

**V7 (NOTE): all three gaps closed.**
1. Blocker 190 (d) now carries my N6.g ("the head must contain the current main" has no named
   mechanical check). In (a), F9(g) is now followed directly by its own explanation, with the README
   clause after it. That pairing matches my N6.f.
2. Item 4 is corrected (V4 above).
3. Blocker 186's "every writer" sentence is corrected (V1 above).

## 3. The findings recorded on blocker 186, and closure claims

| Mine | Grade I gave | Where | Grade recorded |
|---|---|---|---|
| V1 | LOW | item 15 | LOW |
| V2 | LOW | item 16 | LOW (location: W4) |
| V3 | LOW | item 14 | LOW |
| V4 | LOW | item 12 | LOW |
| V5 | NOTE | item 17 | NOTE |
| V8 | NOTE | item 20 | NOTE |

**Nothing of mine is recorded as closed that is not.** Each closure is now bounded exactly:

- item 1 is closed for clients, and item 15 carries the rest;
- item 4 is closed for its keyword half, and item 12 carries the rest;
- item 8 is closed for UPDATE only;
- F4 (`decided_at`) is closed for clients at UPDATE; item 15 carries INSERT, and item 17 carries the
  transaction time;
- N2, N4, F5 and F6 are still listed as owed.

## 4. New findings (all NOTE; none live, none a condition on the merge)

**W1: V1's wording has two residues.**
- `README.md:363` says: "For a writer that is not a client, the trigger does not freeze the request's
  OUTCOME". Read literally, that implies the trigger does freeze it for a client. It does not: the
  trigger never reads `status` (`125:57-63`). For a client, the closure is what holds.
  - My X control shows this. With the closure dropped, the recorded decider changed the settled
    row in 5 of its attempts, including overturning its own `approved` (T5).
  - A reader could therefore believe clients stay covered without the closure.
  - Suggested wording: "The trigger never reads `status`. For a client the settled-row closure
    freezes the outcome; for any other writer nothing does, and the trigger does not cover INSERT."
- A0's record §2 (`:25`, not edited) still says the trigger "refuses any change to a recorded
  decision for every writer". §5 corrects that sentence only where blocker 186 said it.

**W2: "None of these is live on the clean set, and each needs a later edit" is false for item 17.**
- The sentence appears in blocker 186 and in the record (`:108`).
- I measured V5 on the clean head with no drift. A decider's open transaction recorded a decision
  1.03 s before the request's `created_at`.
- The reach is bounded: through PostgREST a transaction lasts one request. I read that and did not
  measure it.
- The sentence needs "item 17 excepted: live, bounded by the transaction's length".

**W3: A0's record says "each reproduced §2's negative controls independently" (`:64`). A1 did not
reproduce all of them.**
- My round did not run E02c, the `content_items` sibling control.
- C0 (its D6) and Q0 (its §3) did run it. So "every negative control reproduced", as blocker 186 and
  the handoff put it, is true of the three runs together.
- "each" is not true of A1.

**W4: gaps in the recording.**
- **V2's location.** My remedy asked for V2 on the batch 160 blocker. Blocker 149, the
  APPROVAL-HISTORY anonymisation path for batch 160, is unchanged. Only item 16 carries V2.
- **The hardening-batch list.** The handoff says "items 11-19", but its list of them skips 16.
- **Two sub-points left out.**
  - V6's name-based half (§2).
  - V4's second remedy: `TRANSACTION_CONTROL` refuses every `DO` block, so a drift can never replace
    a function body.
- **An overclaim that follows.** Because of these gaps, the record's "Everything else the round found
  is recorded" (`:95`) says slightly more than is recorded.

## 5. Stop-the-line verdict

**None.** The commit is text only.

- No code, migration, test, case, fixture or probe changed.
- No tenant path changed.
- The added prose carries no credential or customer data (§6 records the scan).

W1-W4 are NOTE-grade recording edits. I place none of them as a condition on the Owner's merge.
Whether they should be corrected before the merge, or carried with the next batch's text, is the
Owner's reading.

## 6. Limits

- I measured nothing and started no cluster. Every verdict rests on reading the code at `5d4969e`,
  which is identical to `d85a643` in every code path (§1), and on my measurements there. W2 cites
  one of those measurements.
- I checked C0's and Q0's findings only where they touch mine (E02c, C0 F2 and C0 F6). Their other
  findings are for their own runs.
- I did not run `npm run check`, the handoff guard, the branch-scope guard or the role-separation
  validator.
  - `node scripts/scan-repository-secrets.mjs` (Node `v24.20.0`, on the branch name
    `review/a1-batch-125-wording`, with this file present) exited 0.
- This file's name does not match RFC-2026-024's `^a1-security-` pattern. The brief named the path.
- The Author wrote the brief, and I am the same model family (§0).
- This file is the only change in my worktree.
