# Product Owner disposition — who presses the governance bundle, item (1): A1-AUD1015-1 (2026-10-15, session `325454ab`)

Recorded for A0 (`/claude/a0_atlas`, the Author) on WP-0A-A0-004, the package that owns `.github/workflows/ci.yml`.
Times are the session transcript's stamps (UTC), not a clock read. The question, header, options, descriptions and
answers below are copied by script from the raw transcript records of the call and its result (the session's question
tool, tool use `toolu_01NAEu1mQvAiKQ36d3yJDP5k`, transcript lines 1631 and 1632), and checked byte for byte against them by
script. Everything marked "A0's reading" is A0's, not the Owner's.

## Why it was asked

The round audit of 2026-10-15 (`evidence/audits/2026-10-15/a1-audit.md`) raised A1-AUD1015-1 (Low): in the `application`
job of `.github/workflows/ci.yml`, `npm audit` and `node scripts/verify-release-age.mjs` ran last, after every step that
executes installed package code. Its fix is a governance pull request (CI), which RFC-2026-025 §5 item 6's last bullet
has the Owner merge personally. The Owner's earlier direction of that session (13:01:02Z) did not cover it, so A0 asked
who presses it, with four other governance items, before any of their pull requests existed.

## Question, options shown and answers (verbatim)

Asked 2026-10-15T02:09:48Z (`2026-10-15T02:09:48.811Z`), answered 2026-10-15T02:13:35Z (`2026-10-15T02:13:35.293Z`),
through the session's question tool. Two questions in one call.

### Question 1 — header "guard test"

**Q:** "PR-2 (index.ts + runner) ต้องแก้ guard test 2 ตัวใน test-kits/db/foundation-contract.test.mjs ที่ #260 เขียนไว้ว่า 'ไฟล์ platform-kernel 3 ไฟล์ยังไม่มี' (ไม่ได้คาดว่าจะมีการสร้าง) — ถ้าไม่แก้ CI ตก · การแก้แตะ guard ซึ่งคำสั่งเดิม (13:01:02Z) ไม่รวม จะให้ทำอย่างไร?"

- **Options shown:**
  - "รวมใน PR-2 + A0 กดเมื่อ 4 role ผ่าน (Recommended)" — "แก้เฉพาะ 2 test นั้นให้ยอมรับไฟล์ที่ถูกสร้าง (ยังตรวจคู่ยกเว้นครบ) ใน PR-2 เดียว · ไม่แตะ guard อื่น, CI, RFC · 4 role อ่าน + CI เขียว"
  - "แยก PR governance แก้ test ก่อน, A0 กด" — "PR เล็กแก้ 2 test ก่อน (4 role) แล้ว PR-2 ค่อยตาม · ช้ากว่า 1 รอบ"
  - "ผมกดเอง" — "A0 เตรียม PR + 4 role แล้วส่งคำสั่ง merge ให้คุณ"
- **A:** "รวมใน PR-2 + A0 กดเมื่อ 4 role ผ่าน (Recommended)"

Question 1 concerns PR #265 (PR-2 of WP-1A-A0-003, the guard tests in `test-kits/db/foundation-contract.test.mjs`), not
this pull request. It is recorded here only because it was asked in the same call.

### Question 2 — header "ชุด governance"

**Q:** "งาน governance ที่คำสั่งเดิมไม่ครอบคลุม (ชุดข้อ 4): (1) A1-AUD1015-1 ย้าย npm audit/verify-release-age ใน CI ไปก่อนรันโค้ด package (2) แก้ audit lane ให้ผ่าน guard handoff ได้ (3) Q0-259-1 pin src/** ใน app-stack.test (4) Q0-257r6-1 test 3 จุด (5) status-line RFC-034 §8 item 3 — ใครกด?"

- **Options shown:**
  - "A0 กดเมื่อ 4 role ผ่าน ทีละ PR (Recommended)" — "เฉพาะ 5 เรื่องนี้ · แต่ละ PR 4 role + CI เขียว 2 job + ไม่มี security finding ค้าง · ไม่รวม dependency ใหม่"
  - "A0 เตรียม, ผมกดเอง" — "A0 เปิด PR + 4 role แล้วส่งคำสั่ง merge ให้คุณทีละ PR"
  - "ยังไม่ทำตอนนี้" — "บันทึกไว้เป็นงานค้าง ทำหลัง PR-2"
- **A:** "A0 กดเมื่อ 4 role ผ่าน ทีละ PR (Recommended)"

A0's translation of question 2: "Governance work the earlier direction does not cover (set item 4): (1) A1-AUD1015-1,
move npm audit/verify-release-age in CI to before package code runs; (2) fix the audit lane so it can pass the handoff
guard; (3) Q0-259-1, pin src/** in app-stack.test; (4) Q0-257r6-1, three test points; (5) the status line of RFC-034 §8
item 3 — who presses?" Of the chosen option: "A0 presses once the 4 roles pass, one PR at a time" — "these 5 matters only
· each PR 4 roles + CI green on 2 jobs + no security finding left open · no new dependency included".

## What it directs

A0's reading of the answer to question 2, for item (1) only on this pull request:

1. A0 opens one pull request for item (1), A1-AUD1015-1: in the `application` job, `npm audit --omit=dev
   --audit-level=high` and `node scripts/verify-release-age.mjs "$BASE_SHA"` move to run straight after
   `npm ci --ignore-scripts`, before any step that executes installed package code, and a test pins that order. This
   branch, `agent/claude/WP-0A-A0-004-ci-independent-guard-step`, is that pull request.
2. A0 presses it only after C0, A1, Q0 and R0 pass on its final head, CI is green on both jobs (`bootstrap`,
   `application`) on that head, no security finding of any grade is open against it, and it adds no dependency. The words
   waive none of these.
3. "ทีละ PR" ("one PR at a time"): items (2) to (5) are their own pull requests, each under the same conditions. This
   pull request carries item (1) and nothing of items (2) to (5).

It is not a standing delegation: it is bounded to the five listed items ("เฉพาะ 5 เรื่องนี้"), and no other governance pull
request. A0's reading.

## RFC-2026-025 §5 item 6

RFC-2026-025 §5 item 6 reads, in its third bullet, "The delegation must be given after the PR it names exists, or must
name its sequence explicitly.", and in its last, "**A PR that changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or
a gate) is merged by the Owner personally**, never by delegation". This pull request changes CI, so it is governance by
that bullet (and the base's classifier prints `lane: governance` for it). A0's reading of the Owner's answer against both
bullets:

1. **An exception to the last bullet, for this pull request only (as item (1) of the five).** The Owner was shown
   `A0 เตรียม, ผมกดเอง` ("A0 prepares, I press myself") and `ยังไม่ทำตอนนี้` ("not now"), and chose the option in which A0
   presses. That is an Owner-directed exception to the last bullet of the kind PR #211 and PR #212 received
   (this package's `required_human_authorities`, the INCREMENT 2026-10-08 entry) and the lane-walk fix received
   (`product-owner-disposition-2026-10-13-lane-walk-ts.md`), not a standing delegation.
2. **The third bullet, by naming the item before the pull request existed.** The answer was given at
   2026-10-15T02:13:35Z, before this pull request existed. The question names the item by its content: "(1) A1-AUD1015-1
   ย้าย npm audit/verify-release-age ใน CI ไปก่อนรันโค้ด package". A0 reads that as naming the sequence explicitly: one pull
   request for that finding, of that shape.
3. **The other conditions are kept:** the head contains current `main` when pressed (the first bullet), no security
   finding of any grade is open against it (the second), the Integration Owner's verdict where the package's gates require
   it (the fourth, R0 among the four roles), C0, A1, Q0 and R0 pass on the final head, and CI is green on both jobs on
   that head.

## What it does not decide

- Whether the change is right: that is C0's, A1's, Q0's and R0's reading of this pull request.
- Items (2) to (5) of question 2: each is its own pull request, recorded in its own package when it is opened.
- Question 1 (PR #265).
- The disposition of RFC-2026-007 Amendment 2026-10-06, which stays OWED (WP-0A-A0-004 `required_human_authorities`).
- Any RFC: this pull request touches none, and the answer amends none.
