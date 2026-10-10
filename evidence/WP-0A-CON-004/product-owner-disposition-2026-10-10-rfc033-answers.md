# Product Owner disposition — RFC-2026-033 questions Q-033-1 to Q-033-4 (2026-10-10)

A0 (`/claude/a0_atlas`) asked these in session `3ecec68b` through the session's question tool, at 2026-10-10T03:14:07Z.
The Product Owner answered at 03:21:40Z. Main was at `5e444c53` (PR #236), and PR #239 was at head `a77b8a66`.

The Owner had spoken first at 03:12:46Z ("ต่อ"). Under its own terms, that ended the night delegation of 2026-10-09
(`product-owner-disposition-2026-10-09-night-delegation.md`). These are the Owner's own answers. Item 3 of
`evidence/WP-0A-CON-008/product-owner-disposition-2026-10-09-three-governance-prs.md` requires them before the press
(C0-239-2, A1-239-1 C-1′, R0 P1).

Each question was put as RFC-2026-033 reads at `a77b8a66`. In particular, Q-033-2 stated the four `outcome` values,
`error` among them. Q-033-3 was put as the cost question: per metric name, `error_code` enforced at 8 with a cap of
64, and the number of metric names unbounded by the RFC (A1 R-1, R0 R-239-8, C0 R-1).

## Questions, options shown and answers (verbatim)

1. **Q:** "Q-033-1: `error_code` ใน label ของ OBS ควรเก็บอะไร?"
   - **Options shown:**
     - "(a) category ของ ERR 8 ค่า (Recommended)" — "validation, auth, permission, conflict, rate_limit, provider, temporary, internal — code ละเอียดอยู่ใน log · เป็นทางที่ A6 เลือกเอง"
     - "(b) ทำ registry ใหม่ < 64" — "สร้างทะเบียน code ใหม่ใน ERR — freeze ต้องรองานที่ยังไม่มี"
     - "(c) ตัด label ทิ้ง" — "เสียมิติ failure ที่ SLO alert ต้องใช้"
   - **A:** "(a) category ของ ERR 8 ค่า (Recommended)"
2. **Q:** "Q-033-2: ปิดรายการ `outcome` อย่างไร? (ตอนนี้มี 4 ค่า: success, provider_unavailable, down จาก fixture + error ที่ A6 เพิ่ม · budget 4 เต็มแล้ว เพิ่มอีกต้องกลับมาถาม Owner)"
   - **Options shown:**
     - "(a) ปิดที่ 4 ค่านี้ (Recommended)" — "ไม่ประดิษฐ์ค่าเอง ไม่ทำให้ fixture ที่ถูกต้องล้ม คำศัพท์เป็นของ A6 และ A6 ลงนามแล้ว"
     - "(b) ปล่อยเปิดไว้ก่อน" — "รอ A6 เสนอคำศัพท์เต็มชุด — OBS freeze ยังติดอยู่"
   - **A:** "(a) ปิดที่ 4 ค่านี้ (Recommended)"
3. **Q:** "Q-033-3 (เรื่องต้นทุน): รับ budget ต่อ label ของ A6 ไหม? environment 4, module_key 32, capability_key 16/module, outcome 4, error_code 8 (เพดาน 64) → สูงสุด 24,480 series ต่อชื่อ metric ต่อ environment · จำนวนชื่อ metric ยังไม่จำกัดใน RFC นี้ (A6 ต้องกำหนดก่อนต่อ backend จริง และกลับมาถาม Owner) · การเพิ่ม budget ทุกครั้งกลับมาถาม Owner"
   - **Options shown:**
     - "รับ (Recommended)" — "ตัวเลขของ A6 ไม่เปลี่ยนตั้งแต่ 2026-09-02 เพดานสูงกว่าที่ First Slice คาดไว้มาก"
     - "ไม่รับ — จะกำหนดเอง" — "ระบุตัวเลขในช่อง Other"
   - **A:** "รับ (Recommended)"
4. **Q:** "Q-033-4: ให้งาน §8 (enum + test + แก้ fixture) ลงตอน OBS ยังเป็น Candidate ก่อน freeze ไหม? ระหว่างนั้นห้ามส่ง sli_tags ไป metric backend จริง"
   - **Options shown:**
     - "ใช่ (Recommended)" — "'bounded cardinality' ประกาศเป็น gap ไม่ได้ (RFC-031 §5.5) และทำตอน Candidate เลี่ยง version 2.0.0"
     - "ไม่ — หลัง freeze" — "ต้องออก version 2.0.0 ภายหลัง"
   - **A:** "ใช่ (Recommended)"

## What this settles

- **Q-033-1:** (a). **Q-033-2:** (a), closing `outcome` at the four values. **Q-033-3:** accept. **Q-033-4:** yes.
- Each answer is A0's recommended option, so the body of RFC-2026-033 does not change (R0 P3).
- This file meets item 3's condition. Together with the four role verdicts and A6's signature on §2–§4, it lets A0 set
  RFC-2026-033 to Accepted in a later commit on PR #239 (R0 S1–S6), and then press PR #239 under item 3 once the
  roles' delta re-reads and CI are green on the exact head.
- It does not freeze CTR-OBS-001. It does not lift the rule that no consumer may emit `sli_tags` to a real metric
  backend before the §8 increment merges. Any later budget increase, and any bound on the number of metric names,
  comes back to the Owner.
