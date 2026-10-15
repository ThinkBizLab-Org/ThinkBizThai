# Product Owner disposition — who presses the governance bundle's item (2), the audit lane passable in CI (2026-10-15 UTC, session `325454ab`)

Recorded by A0 (`/claude/a0_atlas`), drafted by an author subagent of that run. The question, its header, every option
shown with its description, and the answer below are copied by script from the question-tool record of session
`325454ab` (transcript lines 1631 and 1632); the times are the transcript's stamps (UTC), not a clock read. This is a
record of the Owner's words and of A0's reading of them. It is not a role verdict, approves nothing, and moves no status
on A0's behalf.

## 1. Where things stood

- `main` is at `94c858f0` (PR #264). PR #262 (`WP-0A-A0-001`, the first round audit under RFC-2026-034 §2.3) merged on
  the risk lane, not the audit lane: an audit-files-only head failed CI's handoff guard
  (`test-kits/handoff-conformance.test.mjs`, "the handoff for this branch describes this branch", through
  `scripts/refresh-author-handoff.mjs`'s drift check), because `WP-0A-A0-001`'s handoff cited a head that `main` had
  since moved past, and refreshing the handoff took the pull request out of the audit lane (§2.3: "An audit pull request
  that changes anything else takes that change's lane").
- All four roles on PR #262 named this as a finding for a governance pull request, each with a fix:
  C0-262-2 (`c0-review-2026-10-15-pr262.md`), A1-262-2 (`a1-review-2026-10-15-pr262.md`), Q0-262-1
  (`q0-review-2026-10-15-pr262.md`) and R0-262-2 (`r0-review-2026-10-15-pr262.md`), all under `evidence/WP-0A-A0-001/`.
- The fix edits `scripts/refresh-author-handoff.mjs` and `test-kits/handoff-conformance.test.mjs`, which RFC-2026-034
  §2.2 names as governance paths. `WP-0A-CON-008` owns both.

## 2. Question, options shown and answer (verbatim)

Asked 2026-10-15T02:09:48.811Z, answered 2026-10-15T02:13:35.293Z, through the session's question tool, as one call of two
questions. **Question 1** (header "guard test") concerns PR #265 (`WP-1A-A0-003`'s PR-2) and is not this pull
request's authority; it is not transcribed here. **Question 2** is.

### 2.1 Question 2

**Header:** "ชุด governance"

**Q:** "งาน governance ที่คำสั่งเดิมไม่ครอบคลุม (ชุดข้อ 4): (1) A1-AUD1015-1 ย้าย npm audit/verify-release-age ใน CI ไปก่อนรันโค้ด package (2) แก้ audit lane ให้ผ่าน guard handoff ได้ (3) Q0-259-1 pin src/** ใน app-stack.test (4) Q0-257r6-1 test 3 จุด (5) status-line RFC-034 §8 item 3 — ใครกด?"

- **Options shown** (single choice):
  - "A0 กดเมื่อ 4 role ผ่าน ทีละ PR (Recommended)" — "เฉพาะ 5 เรื่องนี้ · แต่ละ PR 4 role + CI เขียว 2 job + ไม่มี security finding ค้าง · ไม่รวม dependency ใหม่"
  - "A0 เตรียม, ผมกดเอง" — "A0 เปิด PR + 4 role แล้วส่งคำสั่ง merge ให้คุณทีละ PR"
  - "ยังไม่ทำตอนนี้" — "บันทึกไว้เป็นงานค้าง ทำหลัง PR-2"
- **A:** "A0 กดเมื่อ 4 role ผ่าน ทีละ PR (Recommended)"

## 3. What the answer directs (A0's reading, marked; a role may disagree)

**(a) Who presses.** For each of the five items the question lists, one pull request at a time, A0 may press the merge
once C0, A1, Q0 and R0 have passed on its final head, CI is green on it on both jobs (`bootstrap` and `application`),
and no security finding of any grade is open against it; and the pull request adds no dependency. The Owner may still
press it himself.

**(b) This pull request is item (2) only.** The question's item (2) is "แก้ audit lane ให้ผ่าน guard handoff ได้"; this
pull request is that item on `WP-0A-CON-008`'s branch `agent/claude/WP-0A-CON-008-merge-parent-order`. It carries
nothing of items (1), (3), (4) or (5). A pull request that carried another item, or a change outside what item (2)
needs, is outside this direction for that part and goes back to the Owner.

**(c) What it does not reach.** Anything outside the five items; a new dependency (`package.json`, any lockfile,
`scripts/app-dependency-allowlist.json`); and, on A0's reading, an RFC text change, a CI change (`.github/**`) or a
classifier change for item (2), since none is needed for it: this pull request changes neither RFC-2026-034, nor
`.github/**`, nor `scripts/db/classify-review-tier.mjs`, which it imports and does not edit.

## 4. RFC-2026-025 §5 item 6

Its third bullet reads: "The delegation must be given after the PR it names exists, or must name its sequence
explicitly." Its last bullet reads: "**A PR that changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or a gate) is
merged by the Owner personally**, never by delegation."

- **Last bullet.** This pull request changes a gate (the handoff guard CI runs), so the rule would have the Owner merge
  it personally. The answer above is the Owner's own direction that A0 presses it on the stated conditions: an
  Owner-directed exception to the last bullet for this pull request, of the same kind as PR #211's and the 2026-10-08
  direction §10.2, given in the Owner's words. It changes no rule.
- **Third bullet.** The answer was given before this pull request existed. A0 reads the bullet's second branch as met:
  the question named the item ("(2) แก้ audit lane ให้ผ่าน guard handoff ได้") and its sequence ("ทีละ PR", one pull request
  per item) before the pull request was opened.
- **The other conditions are kept.** The head contains current `main`; no unresolved security finding of any grade is
  open against it; the Integration Owner's verdict (R0) is required, and is one of the four role passes in (a).

## 5. What these words do not do

- They do not move `WP-0A-CON-008`'s status. The Author moves it to `in_review` and no further.
- They do not amend RFC-2026-025, RFC-2026-034 or `CONTRIBUTING_AGENTS.md`.
- They do not decide items (1), (3), (4) or (5) beyond who presses each one's own pull request, and they do not decide
  PR #265 (question 1).
- They do not change the audit lane's readers or its definition in RFC-2026-034 §2.2 and §2.3: an audit pull request
  still holds only the round audit's files, and the classifier still decides its lane.
