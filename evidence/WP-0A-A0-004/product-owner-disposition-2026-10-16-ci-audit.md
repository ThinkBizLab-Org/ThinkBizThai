# Product Owner disposition — who presses the CI audit pull request (A1-270-1, A1-270-2) (2026-10-16, session `325454ab`)

Recorded for A0 (`/claude/a0_atlas`, the Author) on WP-0A-A0-004, the package that owns `.github/workflows/ci.yml`.
Times are the session transcript's stamps (UTC), not a clock read. The questions, headers, options, descriptions and
answers below are copied by script from the raw transcript records of the call and its result (the session's question
tool, tool use `toolu_01MCuSRP4eCMi8N2RCrbg4ak`, transcript lines 4341 and 4342), and checked byte for byte against them by
script. Everything marked "A0's reading" is A0's, not the Owner's.

## Why it was asked

A1's review of PR #270 (`evidence/WP-0A-A0-004/a1-review-2026-10-15-pr270.md` §6) raised two findings against `main`'s
workflow as it stood, not introduced by #270, each recommended for a later governance item: A1-270-1 (Low), the
`application` job's `npm audit --omit=dev --audit-level=high` leaves out every dev dependency, while typescript, vitest
and the Tailwind/PostCSS toolchain, the package code that job runs first, are dev dependencies; and A1-270-2 (Info), no
test refuses a step-level `if:` such as `always()`, `!cancelled()` or `success() || failure()` on a step that runs
package code. A1's review of PR #276 (`a1-review-2026-10-16-pr276.md`), the records of #270, closes neither. Their fix changes CI,
so it is a governance pull request, which RFC-2026-025 §5 item 6's last bullet has the Owner merge personally, and no
earlier direction covered it. A0 asked, before the pull request existed.

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

Question 2 concerns another pull request (the wording of RFC-2026-007 Amendment 2026-10-13 §B item 5 and §C after
#265), not this one. It is recorded here only because it was asked in the same call.

### Question 3 — header "CI audit"

**Q:** "(3) CI: npm audit --omit=dev ข้าม dev dependency ที่ CI รันจริง (typescript, vitest, tailwind) + ยังไม่มี test กัน if: บน step ที่รันโค้ด package (A1-270-1/-2) — ทำอย่างไร?"

- **Options shown:**
  - "แก้ + A0 กดเมื่อ 4 role ผ่าน (Recommended)" — "PR เดียว: audit รวม dev dependency + test ยึด + test กัน if: ใน job application · ไม่เพิ่ม dependency · 4 role + CI"
  - "แก้, ผมกดเอง" — "A0 เตรียม + 4 role แล้วส่งคำสั่ง merge ให้คุณ"
  - "ยังไม่ทำ" — "บันทึกเป็นงานค้าง"
- **A:** "แก้ + A0 กดเมื่อ 4 role ผ่าน (Recommended)"

A0's translation of question 3: "CI: npm audit --omit=dev skips the dev dependencies CI actually runs (typescript,
vitest, tailwind), and there is no test yet that refuses `if:` on a step that runs package code (A1-270-1/-2) — what to
do?" Of the chosen option: "fix + A0 presses once the 4 roles pass" — "one PR: the audit includes dev dependencies + a
test that pins it + a test that refuses `if:` in the application job · no dependency added · 4 roles + CI".

## What it directs

A0's reading of the answer to question 3, bounded to the chosen option's description:

1. One pull request, carrying three things and no others: (a) the vulnerability audit in the `application` job of
   `.github/workflows/ci.yml` includes the dev dependencies; (b) a test pins that it does; (c) a test refuses `if:` on
   the steps of the `application` job. This branch, `agent/claude/WP-0A-A0-004-ci-independent-guard-step`, is that pull
   request. A0 reads (c) as allowing the release age's existing `if: github.event_name == 'pull_request'`, which is not
   a condition that runs a step after a failure, and as refusing `continue-on-error` beside `if:`, since either lets
   package code run after a failed check, the harm A1-270-2 names.
2. It adds no dependency ("ไม่เพิ่ม dependency").
3. A0 presses it only after C0, A1, Q0 and R0 pass on its final head and CI is green there ("4 role + CI"), which A0
   reads, as in every earlier governance press, as green on both jobs (`bootstrap`, `application`). The words waive
   none of these.

It is not a standing delegation: it names this one pull request by its content and no other governance pull request.
A0's reading.

## RFC-2026-025 §5 item 6

RFC-2026-025 §5 item 6 reads, in its third bullet, "The delegation must be given after the PR it names exists, or must
name its sequence explicitly.", and in its last, "**A PR that changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or
a gate) is merged by the Owner personally**, never by delegation". This pull request changes CI, so it is governance by
that bullet. A0's reading of the Owner's answer against both bullets:

1. **An exception to the last bullet, for this pull request only.** The Owner was shown `แก้, ผมกดเอง` ("fix, I press
   myself") and `ยังไม่ทำ` ("not now"), and chose the option in which A0 presses. That is an Owner-directed exception
   to the last bullet of the kind PR #211 and PR #212 received (this package's `required_human_authorities`, the
   INCREMENT 2026-10-08 entry), the lane-walk fix received (`product-owner-disposition-2026-10-13-lane-walk-ts.md`) and
   PR #270 received (`product-owner-disposition-2026-10-15-governance-bundle-press.md`), not a standing delegation.
2. **The third bullet, by naming the change before the pull request existed.** The answer was given at
   2026-10-16T02:40:07Z, before this pull request existed. The question names the change by its content and by the
   findings it closes ("npm audit --omit=dev ข้าม dev dependency ... + ยังไม่มี test กัน if: บน step ที่รันโค้ด package
   (A1-270-1/-2)"), and the chosen option names its shape ("PR เดียว"). A0 reads that as naming the sequence explicitly:
   one pull request for those two findings, of that shape.
3. **The other conditions are kept:** the head contains current `main` when pressed (the first bullet), no security
   finding of any grade is open against it (the second), the Integration Owner's verdict where the package's gates
   require it (the fourth, R0 among the four roles), C0, A1, Q0 and R0 pass on the final head, and CI is green on both
   jobs on that head.

## What it does not decide

- Whether the change is right: that is C0's, A1's, Q0's and R0's reading of this pull request.
- What to do if the audit, once it includes the dev dependencies, reports a vulnerability: the answer directs no
  suppression, exception or allowlist. (Measured at the time of this record: none at any level; see the handoff.)
- Questions 1 and 2: each concerns its own pull request, recorded where it is opened.
- RFC-2026-029 §4.6's wording, which proposes `npm audit --omit=dev --audit-level=high`; this pull request amends no
  RFC, and the answer amends none.
- The disposition of RFC-2026-007 Amendment 2026-10-06, which stays OWED (WP-0A-A0-004 `required_human_authorities`).
