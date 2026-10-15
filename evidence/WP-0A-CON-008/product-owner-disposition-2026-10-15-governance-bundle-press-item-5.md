# Product Owner disposition — who presses the governance bundle's item (5) on WP-0A-CON-008, the status-line note on RFC-2026-031 (2026-10-15 UTC, session `325454ab`)

Recorded by A0 (`/claude/a0_atlas`), drafted by an author subagent of that run. The question, its header, every option
shown with its description, and the answer below are copied by script from the question-tool record of session
`325454ab` (transcript lines 1631 and 1632); the times are the transcript's stamps (UTC), not a clock read. This is a
record of the Owner's words and of A0's reading of them. It is not a role verdict, approves nothing, and moves no status
on A0's behalf.

The same answer's item (2), the audit lane made passable in CI, is recorded for this package in
`product-owner-disposition-2026-10-15-governance-bundle-press.md` beside this file; that pull request (#266) merged, and
its record is left as it was merged. This file records item (5) for the pull request that carries it on this package's
branch.

## 1. Where things stood

- `main` is at `9b3ffbd5` (PR #266).
- RFC-2026-034 (fast lane) merged as PR #251 on 2026-10-11. Its §8 item 3 owes "Status-line notes that RFC-2026-034
  amends them: RFC-2026-002, RFC-2026-025, RFC-2026-030, RFC-2026-031, each by its owner". `WP-0A-CON-008` owns
  `architecture/decisions/RFC-2026-031-first-slice-contract-freeze.md` (its `ownership.writable_paths`), so the note on
  RFC-2026-031 is this package's.
- The notes on RFC-2026-002 (`WP-0A-A0-001`, PR #269) and on RFC-2026-025 and RFC-2026-030 (`WP-0A-DB-00`, PR #268) are
  in their owners' own pull requests, not this one.

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

**(b) This pull request is item (5) only, and only the part this package owns.** The question's item (5) is
"status-line RFC-034 §8 item 3"; this pull request is the note on RFC-2026-031, on `WP-0A-CON-008`'s branch
`agent/claude/WP-0A-CON-008-merge-parent-order`. It carries nothing of items (1) to (4), and none of item (5)'s other
notes (RFC-2026-002, RFC-2026-025, RFC-2026-030, the Decision Register, `WP-0A-A0-010` and G0-024), which their owners
carry. A pull request that carried another item, or a change outside what item (5) needs here, is outside this direction
for that part and goes back to the Owner.

**(c) What it does not reach.** Anything outside the five items; a new dependency (`package.json`, any lockfile,
`scripts/app-dependency-allowlist.json`); and, on A0's reading, any change to RFC-2026-031's rule text: the note quotes
RFC-2026-034 §3 and changes no rule.

## 4. RFC-2026-025 §5 item 6

Its third bullet reads: "The delegation must be given after the PR it names exists, or must name its sequence
explicitly." Its last bullet reads: "**A PR that changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or a gate) is
merged by the Owner personally**, never by delegation."

- **Last bullet.** This pull request changes an RFC, so the rule would have the Owner merge it personally. The answer
  above is the Owner's own direction that A0 presses it on the stated conditions: an Owner-directed exception to the last
  bullet for this pull request only, of the same kind as PR #211's, the 2026-10-08 direction §10.2 and this package's
  item (2) record, given in the Owner's words. It changes no rule.
- **Third bullet.** The answer was given before this pull request existed. A0 reads the bullet's second branch as met:
  the question named the item ("(5) status-line RFC-034 §8 item 3") and its sequence ("ทีละ PR", one pull request per
  item) before the pull request was opened.
- **The other conditions are kept.** The head contains current `main`; no unresolved security finding of any grade is
  open against it; the Integration Owner's verdict (R0) is required, and is one of the four role passes in (a).

## 5. What these words do not do

- They do not move `WP-0A-CON-008`'s status. The Author moves it to `in_review` and no further.
- They do not amend RFC-2026-025, RFC-2026-031, RFC-2026-034 or `CONTRIBUTING_AGENTS.md`. The note on RFC-2026-031
  records an amendment RFC-2026-034 already made; it makes none.
- They do not decide items (1) to (4), or item (5)'s notes owned by other packages, beyond who presses each one's own
  pull request, and they do not decide PR #265 (question 1).
