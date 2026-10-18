# Product Owner disposition — the guards stop naming the platform-kernel files (2026-10-19, session `325454ab`)

Recorded for A0 (`/claude/a0_atlas`, the Author), drafted by an author subagent of that run, on `WP-0A-DB-00`, the
package that owns `scripts/db/classify-review-tier.mjs` and `test-kits/db/foundation-contract.test.mjs`
(`ownership.writable_paths`: `scripts/db/**`, `test-kits/db/**`). The question, the options and the answer below are
copied by script from the raw transcript of session `325454ab`
(`~/.claude/projects/-Users-bank-ThinkBizThai/325454ab-eb14-4597-afd3-75b6b8c78ee8.jsonl`, lines 9933 and 9946) and
checked byte for byte against them by script. Times are the transcript's stamps (UTC), not a clock read. Everything
marked "A0's reading" is A0's, not the Owner's. This is a record of the Owner's words and of A0's reading of them: it is
not a role verdict, approves nothing, and moves no status on A0's behalf.

## 1. Why it was asked

On `main` (`f3353301`), four guards and guard tests (`scripts/verify-app-boundaries.mjs`,
`test-kits/app-boundaries.test.mjs`, `test-kits/app-stack.test.mjs`, `test-kits/db/foundation-contract.test.mjs`) and
the classifier's `STRING_NAME_EXCEPTIONS` named the platform-kernel module's `index.ts`, `application/run.ts` and
`adapters/job-store.ts` by strings. RFC-2026-007 Amendment 2026-10-13 §B item 1 keeps every such file in the lane's
closure, so every pull request touching one of them printed `lane: governance` and took the four roles, although no
guard reads what any of them holds. A0 asked in a three-question AskUserQuestion, before any pull request existed.

## 2. The question and the answer (verbatim)

A0's question at 2026-10-18T15:29:17.333Z (transcript line 9933), header `ลด gov`:

```text
ทุกครั้งที่แตะไฟล์ platform-kernel 3 ไฟล์ (index.ts, run.ts, job-store.ts) จะกลายเป็น governance เพราะ guard test อ้างชื่อไฟล์จริง — จะแก้ครั้งเดียวให้จบไหม?
```

Option 1, label and description:

```text
แก้ 1 PR governance + A0 กดเมื่อ 4 role ผ่าน (Recommended)
```

```text
เปลี่ยน guard fixture เป็นชื่อสมมติ จะได้ไม่ต้องส่ง governance ทุกครั้งที่แตะ kernel — ประหยัดเวลาระยะยาว
```

Option 2, label and description:

```text
ไม่ต้อง — หลบไม่แตะ 3 ไฟล์นั้นแทน
```

```text
รวบ export เข้า index.ts ทีเดียวตอนท้าย
```

The Owner's answer at 2026-10-18T15:36:54.968Z (transcript line 9946), the part of the tool result that answers this question:

```text
"ทุกครั้งที่แตะไฟล์ platform-kernel 3 ไฟล์ (index.ts, run.ts, job-store.ts) จะกลายเป็น governance เพราะ guard test อ้างชื่อไฟล์จริง — จะแก้ครั้งเดียวให้จบไหม?"="แก้ 1 PR governance + A0 กดเมื่อ 4 role ผ่าน (Recommended)"
```

A0's translation of the question: "Every time one of the three platform-kernel files (index.ts, run.ts, job-store.ts)
is touched, the pull request becomes governance because a guard test names the real file — fix it once and for all?"
Of option 1: "Fix in one governance PR + A0 presses when the 4 roles pass (Recommended)"; "change the guard fixtures to
fictitious names, so kernel work need not go through governance every time — saves time in the long run". The Owner
chose option 1.

## 3. What it directs (A0's reading, marked; a role may disagree)

1. **One governance pull request** that changes the guard fixtures to fictitious names, so that a pull request touching
   the platform-kernel files is no longer governance through the lane's walk. This pull request, on `WP-0A-DB-00`'s
   branch `agent/claude/WP-0A-DB-00-batch-rfc-030-risk-tiered-review`, is it. A0 reads "the guard fixtures" as every
   place a guard or guard test names those files: the fixtures themselves; the twelve `STRING_NAME_EXCEPTIONS` pairs
   that excused those mentions (they would be stale with the mentions gone); and the foundation contract test's pins of
   them, the #281 pin of created files kept but written so that it names no repository path (RFC-2026-007 §G item 4).
   A dated note in RFC-2026-007 (§G) records it; the tests that changed keep their names.
2. **A0 presses once the four roles pass**: C0, A1, Q0 and R0 on the final head, with CI green on both jobs
   (`bootstrap`, `application`) on that head and no security finding of any grade open against it, as in every earlier
   governance press; the words waive none of these.
3. **Not weaker.** Each fixture keeps the rule it exercised (the rules read a path's shape only), the classifier's code
   is unchanged, R0-259-1 is still proven on synthetic heads, and deleting a created kernel file still fails the suite.

It is not a standing delegation: it names this one change by its content and no other governance pull request.
A0's reading.

## 4. RFC-2026-025 §5 item 6

1. **An exception to the last bullet, for this pull request only.** This pull request changes a classifier, guards and
   their tests, so the rule would have the Owner merge it personally; the chosen option names A0 as the presser, an
   Owner-directed exception of the kind PR #270, #279, #280 and #281 received. It changes no rule.
2. **The third bullet, by naming the change before the pull request existed.** The answer was given at
   2026-10-18T15:36:54.968Z, before this pull request existed, and the option names the change by its content (the guard
   fixtures, fictitious names, the platform-kernel files) and its shape (one governance PR, A0's press after four roles).
3. **The other conditions are kept:** the head contains current `main` when pressed; no security finding of any grade
   is open against it; R0's verdict is one of the four; CI is green on both jobs on the final head.

## 5. What it does not decide

- Whether the change is right or sufficient: that is C0's, A1's, Q0's and R0's reading of this pull request.
- When WP-1A-A0-003 or another package creates `adapters/job-store.ts`; only that the pull request that does adds it to
  `KERNEL_CREATED` in the foundation contract test (a governance edit), as the Note 2026-10-17 item 3 already owed.
- The other two answers of the same AskUserQuestion (`A0-003`, `A0-004 open`), recorded elsewhere.
- `WP-0A-DB-00`'s status, which stays `in_review`; the Author moves it no further.
