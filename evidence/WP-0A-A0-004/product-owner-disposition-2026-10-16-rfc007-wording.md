# Product Owner disposition — the wording of RFC-2026-007 Amendment 2026-10-13 after PR #265 (2026-10-16, session `325454ab`)

Recorded for A0 (`/claude/a0_atlas`, the Author) on WP-0A-A0-004, the package that owns
`architecture/decisions/RFC-2026-007-ci-independent-guard-step.md`. Times are the session transcript's stamps (UTC), not
a clock read. The questions, headers, options, descriptions and answers below are copied by script from the raw
transcript records of the call and its result (the session's question tool, tool use `toolu_01MCuSRP4eCMi8N2RCrbg4ak`,
transcript lines 4341 and 4342), and checked byte for byte against them by script. Everything marked "A0's reading" is
A0's, not the Owner's. The same call is recorded for question 3 in
`product-owner-disposition-2026-10-16-ci-audit.md` (PR #279).

## Why it was asked

RFC-2026-007 Amendment 2026-10-13 §B item 5 says WP-1A-A0-003's PR-1 "creates `src/modules/platform-kernel/index.ts`"
and "prints governance", and names three platform-kernel files "not yet in the repository"; its §C items 2 and 3
describe the two string-name exception tests as they stood before PR #265 changed them. PR-1 (#261) created none of
those files and printed risk; PR-2 (#265) created `index.ts` and `application/run.ts` and printed governance. Three
findings say so: R0-265-1 (`evidence/WP-1A-A0-003/r0-review-2026-10-15-pr265.md`), R0-AUD1015-9
(`evidence/audits/2026-10-15/r0-audit.md`) and C0-AUD1015-2 (`evidence/audits/2026-10-15/c0-audit.md`). R0-265-1 notes
that the Owner's answer for #265 barred an RFC edit there and that no earlier answer reaches the fix, "so it is asked
again". An edit to an RFC is a governance pull request, which RFC-2026-025 §5 item 6's last bullet has the Owner merge
personally. A0 asked, before the pull request existed.

## Questions, options shown and answers (verbatim)

Asked 2026-10-16T02:26:00Z (`2026-10-16T02:26:00.370Z`), answered 2026-10-16T02:40:07Z (`2026-10-16T02:40:07.764Z`), through
the session's question tool. Three questions in one call.

### Question 1 — header "commit gate"

**Q:** "(1) commit-when-clean ให้ stage ก่อน verify + test Q0-266-1 ใน guard handoff (ทำเสร็จแล้ว 838/838 บน branch ในเครื่อง) — ทำอย่างไร?"

- **Options shown:**
  - "เปิด PR + A0 กดเมื่อ 4 role ผ่าน (Recommended)" — "เฉพาะ 2 เรื่องนี้ใน PR เดียว · CI เขียว 2 job + ไม่มี security finding ค้าง"
  - "เปิด PR, ผมกดเอง" — "A0 เตรียม + 4 role แล้วส่งคำสั่ง merge ให้คุณ"
  - "ยังไม่ทำ" — "เก็บ branch ไว้ก่อน"
- **A:** "เปิด PR + A0 กดเมื่อ 4 role ผ่าน (Recommended)"

Question 1 concerns another pull request (the commit gate, `scripts/commit-when-clean.mjs`, and Q0-266-1's test), not
this one. It is recorded here only because it was asked in the same call.

### Question 2 — header "RFC-007"

**Q:** "(2) ถ้อยคำ RFC-2026-007 Amendment 2026-10-13 §B item 5 / §C ไม่ตรงกับโค้ดหลัง #265 (ยังเขียนว่าไฟล์ platform-kernel 'ยังไม่มี' / PR-1 สร้าง index.ts) — ทำอย่างไร?"

- **Options shown:**
  - "แก้ถ้อยคำ + A0 กดเมื่อ 4 role ผ่าน (Recommended)" — "PR เดียว: เพิ่มหมายเหตุ/แก้ถ้อยคำให้ตรงกับ test และสิ่งที่เกิดจริง · ไม่แตะ classifier/guard · 4 role + CI"
  - "แก้ถ้อยคำ, ผมกดเอง" — "A0 เตรียม + 4 role แล้วส่งคำสั่ง merge ให้คุณ"
  - "ยังไม่ทำ" — "บันทึกเป็นงานค้าง"
- **A:** "แก้ถ้อยคำ + A0 กดเมื่อ 4 role ผ่าน (Recommended)"

A0's translation of question 2: "The wording of RFC-2026-007 Amendment 2026-10-13 §B item 5 / §C does not match the
code after #265 (it still says the platform-kernel files 'do not exist yet' / PR-1 creates index.ts) — what to do?" Of
the chosen option: "fix the wording + A0 presses once the 4 roles pass" — "one PR: add a note / fix the wording to
match the tests and what actually happened · do not touch the classifier/guard · 4 roles + CI".

### Question 3 — header "CI audit"

**Q:** "(3) CI: npm audit --omit=dev ข้าม dev dependency ที่ CI รันจริง (typescript, vitest, tailwind) + ยังไม่มี test กัน if: บน step ที่รันโค้ด package (A1-270-1/-2) — ทำอย่างไร?"

- **Options shown:**
  - "แก้ + A0 กดเมื่อ 4 role ผ่าน (Recommended)" — "PR เดียว: audit รวม dev dependency + test ยึด + test กัน if: ใน job application · ไม่เพิ่ม dependency · 4 role + CI"
  - "แก้, ผมกดเอง" — "A0 เตรียม + 4 role แล้วส่งคำสั่ง merge ให้คุณ"
  - "ยังไม่ทำ" — "บันทึกเป็นงานค้าง"
- **A:** "แก้ + A0 กดเมื่อ 4 role ผ่าน (Recommended)"

Question 3 concerns another pull request (PR #279, the CI audit, recorded in
`product-owner-disposition-2026-10-16-ci-audit.md`), not this one. It is recorded here only because it was asked in the
same call.

## What it directs

A0's reading of the answer to question 2, bounded to the chosen option's description:

1. One pull request ("PR เดียว") that adds a note to, or fixes the wording of, RFC-2026-007 Amendment 2026-10-13 so
   that it matches the tests and what happened ("เพิ่มหมายเหตุ/แก้ถ้อยคำให้ตรงกับ test และสิ่งที่เกิดจริง"). This
   branch, `agent/claude/WP-0A-A0-004-ci-independent-guard-step`, is that pull request. A0 chose the note: a dated
   record appended to the amendment as its §F, the text of §A to §E kept whole, as the RFC's earlier dated records do
   (the Record 2026-10-08 under the Amendment 2026-10-06, the Correction 2026-10-11 under the Amendment 2026-10-08).
   It states what changed (PR-1 #261 created no listed file and printed risk; PR-2 #265 created `index.ts` and
   `application/run.ts` and printed governance; §C tests 2 and 3 now hold before and after creation, their names quoted
   verbatim; `adapters/job-store.ts` still absent), and what those facts mean for the sentences they overtake.
2. It touches no classifier and no guard ("ไม่แตะ classifier/guard"). A0 reads "guard" as including the guard tests,
   so no test changes either; the pull request changes the RFC and this package's records (this file, the manifest's
   `required_human_authorities` entry, the handoff) only.
3. A0 presses it only after C0, A1, Q0 and R0 pass on its final head and CI is green there ("4 role + CI"), which A0
   reads, as in every earlier governance press, as green on both jobs (`bootstrap`, `application`). The words waive
   none of these.

It is not a standing delegation: it names this one pull request by its content and no other governance pull request.
A0's reading.

## RFC-2026-025 §5 item 6

RFC-2026-025 §5 item 6 reads, in its third bullet, "The delegation must be given after the PR it names exists, or must
name its sequence explicitly.", and in its last, "**A PR that changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or
a gate) is merged by the Owner personally**, never by delegation". This pull request changes an RFC, so it is
governance by that bullet (and `architecture/decisions/**` is a governance path of RFC-2026-034 §2.2). A0's reading of
the Owner's answer against both bullets:

1. **An exception to the last bullet, for this pull request only.** The Owner was shown `แก้ถ้อยคำ, ผมกดเอง` ("fix the
   wording, I press myself") and `ยังไม่ทำ` ("not now"), and chose the option in which A0 presses. That is an
   Owner-directed exception to the last bullet of the kind PR #211 and PR #212 received (this package's
   `required_human_authorities`, the INCREMENT 2026-10-08 entry), the lane-walk fix received
   (`product-owner-disposition-2026-10-13-lane-walk-ts.md`), PR #270 received
   (`product-owner-disposition-2026-10-15-governance-bundle-press.md`) and PR #279 received
   (`product-owner-disposition-2026-10-16-ci-audit.md`), not a standing delegation.
2. **The third bullet, by naming the change before the pull request existed.** The answer was given at
   2026-10-16T02:40:07Z, before this pull request existed. The question names the change by its content: the
   amendment, its sections, and the two stale statements ("§B item 5 / §C ไม่ตรงกับโค้ดหลัง #265 (ยังเขียนว่าไฟล์
   platform-kernel 'ยังไม่มี' / PR-1 สร้าง index.ts)"), and the chosen option names its shape ("PR เดียว"). A0 reads
   that as naming the sequence explicitly: one pull request for that wording, of that shape.
3. **The other conditions are kept:** the head contains current `main` when pressed (the first bullet), no security
   finding of any grade is open against it (the second), the Integration Owner's verdict where the package's gates
   require it (the fourth, R0 among the four roles), C0, A1, Q0 and R0 pass on the final head, and CI is green on both
   jobs on that head.

## What it does not decide

- Whether the note is right: that is C0's, A1's, Q0's and R0's reading of this pull request.
- Any change to the classifier, `STRING_NAME_EXCEPTIONS`, any guard or any test; the answer bars them. The note records
  one consequence of #265's test change (a platform-kernel file that leaves after it was created no longer fails §C
  test 2); whether that wants a check is not decided here and needs its own question.
- Any rule of RFC-2026-007 or its amendments: the note changes none, and the Status lines stand as they are.
- Questions 1 and 3: each concerns its own pull request, recorded where it is opened.
- The disposition of RFC-2026-007 Amendment 2026-10-06, which stays OWED (WP-0A-A0-004 `required_human_authorities`).
- When WP-1A-A0-003 creates `adapters/job-store.ts`, or how.
