# Product Owner disposition, 2026-10-09: who presses three named governance PRs

Scribe: `/claude/a0_atlas`. This file transcribes the Owner's chat answer verbatim. A0 decides nothing in it.

Asked and answered on 2026-10-09, in session `3ecec68b`, after PR #235 merged (`a4eed0e8`, 2026-10-09T13:13:11Z).
One question, single choice. The question, the options and the answer below are A0's relay of that chat, copied into
this file as A0 gave them. The session transcript is a file outside the repository; a reader on `main` sees the
quotes, not the transcript.

## A0's question (multiple choice), verbatim

> ให้ A0 กด merge PR governance ต่อไปนี้เมื่อ 4 role ผ่านและ CI เขียวได้ไหม: (1) แก้บรรทัดสถานะ RFC-2026-010 (WP-0A-CON-008) ให้ตรงกับ SEC/AUD/OBS/USG ที่เป็น Candidate (2) RFC §4c ทำให้ SEC เป็นเจ้าของรูปแบบ secret handle (3) RFC จำกัด cardinality ของ OBS (error_code/outcome เป็นรายการปิด + budget ต่อ label) — สอง RFC หลังจะมีคำถามให้คุณตอบก่อน merge เหมือน RFC-031

Options:
- `ให้ A0 กดทั้ง 3 (Recommended)`: "A0 กดทั้ง 3 PR เมื่อ 4 role ผ่าน CI เขียว และ (สำหรับ RFC) คุณตอบคำถามใน RFC แล้ว"
- `กดเฉพาะ RFC-010`: "A0 กดเฉพาะ PR แก้บรรทัดสถานะ RFC-010 ส่วน RFC ใหม่สองตัวคุณกดเอง"
- `ผมกดเองทั้งหมด`: "A0 เตรียมให้พร้อม แล้วคุณกดเอง"

## The Owner's answer, verbatim

`ให้ A0 กดทั้ง 3 (Recommended)`

## What it means, and what it does not

- **It names three governance PRs, by content.** None had a number when the question was put.
  1. The RFC-2026-010 status-line update of `WP-0A-CON-008`, which makes the line agree with CTR-SEC-001,
     CTR-AUD-001, CTR-OBS-001 and CTR-USG-001 being Candidate. This is the step R0 described in
     `evidence/WP-0A-CON-006/r0-review-2026-10-09-pr235.md` §6 and `evidence/WP-0A-CON-004/r0-review-2026-10-09-pr233.md`
     §5 (R-233-4), whose item 2 says the Owner merges it personally unless he names that PR, or "the RFC-2026-010
     status-line update", in a press direction given after the question is put to him.
  2. The RFC §4c PR that makes CTR-SEC-001 the owner of the secret-handle format.
  3. The RFC that bounds CTR-OBS-001's cardinality (`error_code` and `outcome` as closed lists, and a budget per
     label).
- **When A0 may press one of them.**
  - C0, A1, Q0 and R0 have passed on its final head.
  - CI is green.
  - For PRs (2) and (3) also: the Owner has answered the questions in that RFC. PR (1) asks him no question.
- **It is an exception to RFC-2026-025 §5 item 6 for those three PRs only.** It does not amend that rule, and it does
  not reach any other governance PR.
- **It supplies no signature and no disposition.** It does not stand in for A1's, A5's or A6's words, for the Owner's
  approval of any contract's promotion or freeze, or for his answers to the questions in RFCs (2) and (3).
- **It does not move CTR-NTF-001.** The RFC-2026-010 line keeps "CTR-NTF-001 is A5's and remains unassessed" until
  NTF's own Candidate step.
