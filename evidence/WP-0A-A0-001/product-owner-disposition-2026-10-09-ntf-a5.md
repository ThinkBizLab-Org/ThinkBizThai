# Product Owner disposition — a Claude run as A5 for CTR-NTF-001 (2026-10-09)

Asked by A0 (`/claude/a0_atlas`) on 2026-10-09 at 16:50:32Z, in session `3ecec68b`, through the session's question tool.
Answered by the Product Owner at 16:55:57Z (A0's clock read 16:56:01Z when recording it). Main was at `a4eed0e8` (PR #235). PRs #236 and #237 were open and not merged.

## Context put to the Owner

CTR-NTF-001 is the last Draft contract of the First Slice. RFC-2026-031 §4.1(1) needs an A5 assessment and ratification,
then a disposition naming CTR-NTF-001 for Candidate. No run declared on main can sign as A5 (RFC-2026-013: a signature
counts only for a role its capability profile declares). On 2026-09-28 the Owner chose option (ค) for batch 091
(`evidence/WP-0A-DB-00/product-owner-disposition-2026-09-28-batch-091.md`); option (ข), a Claude run as A5 through a
capability profile, was not taken then. This question is new and outside the approved plan, so it was asked first.

## Questions and answers (verbatim)

1. Q: "ให้ Claude run `/claude/a5_loom` รับบท A5 เพื่อประเมินและรับรอง CTR-NTF-001 ไหม? ต้องเพิ่ม capability profile `cc-a5-loom.json` ผ่าน WP-0A-A0-001 ก่อน (เมื่อ 2026-09-28 Owner เลือกข้อ ค สำหรับ batch 091)"
   A: "อนุมัติ Claude A5 (Recommended)" — option (ข): add `cc-a5-loom.json`; A5 assesses blockers [1], [2], [19], [22]; NTF then goes to Candidate.
2. Q: "ก่อนให้ A5 ลงนาม ต้องให้ profile ใหม่ผ่าน benchmark แบบมองไปข้างหน้า (Q0) เหมือนที่ทำกับ A6 ไหม?"
   A: "ทำ benchmark สั้น ๆ (Recommended)" — Q0 runs a short, conditioned, forward-scoped benchmark before A5 signs.
3. Q: "ให้ A0 กด merge PR ชุด NTF เองได้ไหม (profile → การประเมินของ A5 → NTF Draft→Candidate → บรรทัดสถานะ RFC-010)? A0 จะกดเมื่อทั้ง 4 บทบาทผ่านและ CI เขียว ส่วนการเลื่อนสถานะ Candidate จะทำเมื่อ A1 ยืนยันว่า SC-2 ครบแล้ว"
   A: "ให้ A0 กดทั้งชุด (Recommended)" — includes approval of CTR-NTF-001 for Candidate under RFC-2026-031 §4.1(1), once A5 has signed and A1 confirms SC-2.
   Option description shown with that answer (verbatim): "รวมการอนุมัติ CTR-NTF-001 เป็น Candidate ตาม RFC-031 §4.1(1) เมื่อ A5 ลงนามแล้ว"
4. Q: "A5 ถูก spawn จาก lineage เดียวกับ A0 (ข้อ [1] เรียกว่าเป็น 'weaker and different control') ยอมรับการรับรองแบบนี้ไหม?"
   A: "ยอมรับ + เปิดเผย §0 (Recommended)" — same-lineage ratification is accepted, with the §0 disclosure in every A5 file, and A1, C0 and Q0 re-reading the result.

## What this directs

The NTF sequence, each PR pressed by A0 only after C0, Q0, A1 and R0 have passed on its final head and CI is green:

1. WP-0A-A0-001: `.agents/capability-profiles/cc-a5-loom.json` (`/claude/a5_loom`), with this file.
2. WP-0A-CON-006: Q0's forward-scoped benchmark, then A5's assessment of CTR-NTF-001.
3. WP-0A-CON-006: CTR-NTF-001 Draft → Candidate, conditional on A5's signature and A1's confirmation that SC-2 is met.
4. WP-0A-CON-008: the RFC-2026-010 status line in A5's words (a governance PR the Owner has named here).

Nothing here moves any package to `done`, and nothing here freezes CTR-NTF-001.

The step-3 PR (CTR-NTF-001 Draft → Candidate) will quote Q3's option description verbatim from the source, not the English gloss after the dash above.

A0's correction of 2026-10-09 (R0-238-1): the answer time first read 16:56:01Z, A0's clock when recording it; the question tool's result in the session transcript is stamped 16:55:57Z, and the line above now gives that time. Q3's option description is added verbatim under answer 3 (R0-238-2).
