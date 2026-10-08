# G0 Evidence Tracker — ThinkBizThai

สถานะ ณ วันที่ 2026-10-08 (ตรวจกับ `main @ bd019c9c`): **G0 ผ่านแบบมีเงื่อนไขด้วย approved fallback
(Product Owner ตัดสิน D0, 2026-10-08)** — รายการภายนอกทุกข้อยัง **ไม่เสร็จ** และผูกกับ gate ที่มันขวางจริงแล้ว
ข้อจำกัดบังคับ: **ห้าม production customer data จนกว่า legal/PDPA จะผ่าน** รายละเอียดอยู่ในหัวข้อ
"G0 ทางออกแบบมีเงื่อนไข (D0)" ด้านล่าง และ [disposition 2026-10-08](WP-0A-A0-001/product-owner-disposition-2026-10-08-g0-exit-and-g1-decisions.md).
สถานะเดิม (2026-10-05, `main @ 600b48b`): Specification Baseline Complete / External Verification Pending —
การตัดสินใจขั้น 2 และตาราง G0-001..024 อยู่ในหัวข้อ "G0 ขั้น 2"

Tracker นี้ทำหน้าที่เป็น index ของหลักฐานตาม
`docs/sprint-0a/sprint-0a-g0-readiness-report-th.md` เท่านั้น ไม่ใช่แผนใหม่,
ไม่แก้ Decision Register และไม่ใช่การอนุมัติ G0. สถานะ `partial` หมายถึงมี
หลักฐานบางส่วนใน repository แต่ยังไม่ผ่านเงื่อนไข G0.

## Cadence และกติกาการอัปเดต

- A0 อัปเดตเมื่อมี commit หลักฐาน, external verification, หรือ owner decision
  ใหม่; ไม่ปรับสถานะโดยอาศัย chat เพียงอย่างเดียว
- Owner ที่ระบุเป็นผู้ให้หลักฐานหรืออนุมัติในขอบเขตของตน; Reviewer ไม่แทน
  Product Owner, ผู้เชี่ยวชาญกฎหมาย/ภาษี/PDPA หรือ repository administrator
- หลักฐานต้องไม่มี secret, customer data หรือ provider credential. ใช้ลิงก์,
  redacted evidence หรือ reference ภายนอกที่อนุญาตเท่านั้น
- G0 ผ่านได้ตาม pass rule ใน readiness report เท่านั้น: ไม่มี P0 blocker ที่
  ไม่มี evidence หรือ approved fallback และไม่มี critical risk ที่ไร้ owner/due gate

## Checklist

| G0 requirement from readiness report | Current state | Owner / required reviewer | Evidence / exact next evidence |
|---|---|---|---|
| Product Owner อนุมัติ DEC-01..16 | `complete for Sprint 0A baseline` | Product Owner | [Product Owner baseline approval](WP-0A-A0-001/product-owner-baseline-approval.md) บันทึกคำยืนยันของ Product Owner เมื่อ 2026-08-31; ไม่ใช่การอนุมัติ G0, production credential, legal/PDPA/accounting หรือ provider readiness |
| Canonical guide, thin Codex/Claude adapters, protected CI | `complete` — ทั้งสามส่วนมีจริงและตรวจแล้ว | A0 + repository administrator | Product Owner เลือกเปิด repository เป็น **public** เมื่อ 2026-09-02 โดยรับผลที่แก้กลับไม่ได้ว่าอีเมลใน metadata ของคอมมิตทั้ง 301 รายการจะเป็นสาธารณะ. branch protection บน `main` ตั้งแล้ว: required status check `bootstrap` แบบ strict, `enforce_admins: true`, ห้าม force push, ห้ามลบ branch, ต้องปิด conversation ก่อน merge. **ทดสอบว่ากัดจริง ไม่ใช่แค่ตั้งค่า**: push ตรงเข้า `main` ถูกปฏิเสธด้วย `GH006: Protected branch update failed` / `Required status check "bootstrap" is expected` ทั้งที่ผู้ push เป็น admin. ไม่ได้ตั้ง required pull request review เพราะ Product Owner เป็นผู้สร้าง PR เอง GitHub ไม่อนุญาตให้ approve PR ของตนเอง การบังคับจะทำให้ทุก PR ตัน — บันทึกเป็นข้อจำกัดที่รู้ตัว ไม่ใช่การมองข้าม |
| Capability benchmark และ agent IDs ทุก Ready package | `partial — สิ่งที่ขาดคือ role verdict ไม่ใช่ช่อง product reviewer` | A0 + role owners (C0/A1/Q0/R0) | **แก้ไข 2026-10-05.** ข้อความเดิม (2026-09-02) บอกว่า `product_reviewer_agent_run_id` ที่เป็น null ทำให้ 11 แพ็กเกจค้างที่ `in_review` — กลไกนั้นไม่จริง: `scripts/validate-work-package-role-separation.mjs:16-21,40-44` ตรวจเฉพาะ role id หลักสี่ตัว, `review_and_test_gates` ของ 15 แพ็กเกจไม่มีขั้น product (เช่น `work-packages/WP-0A-A0-002.json:242-248`) และ `WP-0A-A6-001` ถึง `integration_verified` ทั้งที่ช่องนี้เป็น null. Product Owner ยืนยันเมื่อ 2026-10-05 ว่า Product reviewer ไม่ใช้กับแพ็กเกจ tooling/contract ([disposition](WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md) ข้อ 3). **ที่ค้างจริงคือ role verdicts missing**: verdict ของ Reviewer/Tester/Security/Integration ที่หัวปัจจุบันยังไม่มี หรือเป็นลบ (ดูตารางรายแพ็กเกจใน "G0 ขั้น 2"). `.agents/capability-profiles/` มี declaration สำหรับ role run ปัจจุบัน และ CI validator ปฏิเสธ Ready-or-later manifest ที่อ้าง run โดยไม่มี declaration หรืออนุญาต external secret; ยังต้องมี benchmark/reference ที่ตรวจทักษะก่อนใช้เป็น G0 evidence (เงื่อนไข vendor diversity ถูกถอนโดย RFC-2026-024 และขยายไป 15 แพ็กเกจโดย disposition 2026-10-05 ข้อ 1) |
| Meta app/pages/IG permissions ทดสอบด้วย credentials จริง | `open — ผูกกับ G2 (MCN-002 ขึ้นกับ MTA-002) และ G6 (App Review) ตาม D0` | A6 + Security + Product | ต้องใช้ test app/accounts, redacted capability matrix และ external operation evidence; ห้ามเก็บ credentials ใน repository |
| Stripe Thailand sandbox, products/prices, signed webhook และ Portal | `deferred after G0 by Product Owner decision 2026-10-05` | A6 + Finance + Security | Beta ใช้ manual invoice ตาม DEC-020 ของ register; Stripe หลัง G0 ([disposition](WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md) ข้อ 4). การนับข้อนี้เป็น "approved fallback" ตาม pass rule เป็นการอ่านของ A0 ที่ต้องยืนยันใน G0-024. **คำถามเปิด:** `CONTRIBUTING_AGENTS.md:45` ให้ entitlement มาจาก verified Stripe webhook เท่านั้น — แหล่ง entitlement ของ Beta ที่ใช้ manual invoice ยังไม่มีใครกำหนด (Owner + security owner ผ่าน RFC). เมื่อเปิด Stripe: raw-body signature verification, duplicate/replay/out-of-order tests และ entitlement จาก verified webhook เท่านั้น |
| Legal/PDPA/accounting: retention, VAT, invoice, refund, grace | `open — legal/PDPA ผูกกับ G2; นักบัญชีผูกกับ G6 ตาม D0; ห้าม production customer data จนกว่า legal/PDPA ผ่าน` | Legal/PDPA specialist + accountant + Product Owner | ต้องเป็น approval จากผู้เชี่ยวชาญ ไม่รับการอนุมานจาก agent |
| Thai SME non-tech usability อย่างน้อย 5 คน | `open — ผูกกับก่อน freeze ของ WP-1A-A5-002/003 ตาม D0` | Product Owner + A5 | A5 dry run ระบุว่าไม่มี UI/usability evidence ใน REP-00; ต้องมี consent-safe, moderated evidence ของ UX package |
| Qualified skincare review สำหรับ claim rules/cases | `open — ผูกกับก่อน Pack 2 pilot (G3/G4) ตาม D0` | Qualified skincare reviewer + Product/Brand | ต้องมีผู้เชี่ยวชาญจริงและ evidence ที่ redacted/permissioned ตาม policy |
| Storage pricing/config, export/purge, restore drill | `open — เลือก provider แล้ว (D10: Supabase Storage); pricing/purge/restore drill ผูกกับ G5/G6 ตาม D0` | A4 + Security + Data/Operations owner | A4 review ยืนยันเฉพาะ guardrail; ต้องมี provider decision, exact-key purge/restore evidence และ lifecycle drill |

## Co-owner review of the four jointly-owned contracts — 2026-09-02

`CTR-SEC-001`, `CTR-AUD-001`, `CTR-OBS-001` และ `CTR-USG-001` เป็นสี่ฉบับที่ A0 เลื่อนขั้นเองไม่ได้
A1 และ A6 ประเมินจาก agent run ที่แยกจากผู้เขียนและแยกจากกันเอง ผู้เขียนตรวจซ้ำทุกข้ออ้างก่อนนำไปใช้

| Contract | Co-owner | Verdict | สถานะหลังแก้ |
|---|---|---|---|
| `CTR-SEC-001` | A1 | เซ็นโดยมีเงื่อนไขบังคับ | เงื่อนไขบังคับสามข้อปิดครบใน [PR #20](../architecture/decisions/RFC-2026-010-shared-kernel-freeze-readiness.md) |
| `CTR-AUD-001` | A6 | เซ็นโดยมีเงื่อนไขบันทึก | ปิดแล้ว |
| `CTR-OBS-001` | A6 | เซ็นโดยมีเงื่อนไขบันทึก | ปิดหนึ่ง อีกหนึ่งข้อเสนอถูกตีกลับพร้อมเหตุผล |
| `CTR-USG-001` | A6 | **ปฏิเสธ** | สามข้อที่ระบุชื่อปิดครบแล้ว ยังไม่ได้ขอลายเซ็นรอบสอง |

หลักฐานเต็ม: [co-owner review](WP-0A-CON-004/co-owner-review-sec-aud-obs-usg.md)

**สิ่งที่การรีวิวนี้ยังไม่ตอบ:** การประเมินโดย agent run นับเป็น *ลายเซ็น* ของผู้ร่วมเป็นเจ้าของหรือไม่
เป็นการตัดสินใจของ Product Owner รายการ sign-off ของ G0 จึงยังเปิดอยู่จนกว่าจะมีคำตอบนั้น
สิ่งที่การรีวิวนี้ตอบแล้วคือเรื่องแคบกว่าและยังมีประโยชน์: สัญญาสี่ฉบับถูกอ่านโดย run ที่ไม่ได้เขียนมัน
พบข้อบกพร่องห้าข้อที่ guard ทุกตัวในรีโปปล่อยผ่าน และข้อเสนอของผู้ตรวจหนึ่งข้อผิดและไม่ถูกนำไปใช้

---

## REP-00 / WP-0A-A0-001 evidence status

| Acceptance requirement | Current state | Evidence / blocker |
|---|---|---|
| Canonical protocol bootstrap และ deterministic CI | `complete for committed bootstrap` | Commit `3c8e025`, `899c2bb`; Draft PR #1 (URL available only to an authorized operator); CI passes at runs `33335381144` and `33335718109` |
| A1–A6 representative review | `partial` | A1 review/security evidence exists; A3/A4/A6 approve within narrow scope; [A5 independent Product/UX bootstrap review](WP-0A-A0-001/review-product-ux-A5-assigned.md) is now assigned and approved. A2 capability-routing remediation and cross-vendor evidence remain open. These reviews are not PO approval. |
| Capability declaration routing | `partial` | See `.agents/capability-profiles/`; declarations are conservative and not a cross-vendor benchmark. A2/A3/A4 capability declarations remain unrecorded by their own runs. |
| Cross-vendor manifest-to-handoff dry run | `complete for protocol dry run; G0 overall pending` | [Audited Claude Code dry-run evidence](WP-0A-A0-001/cross-vendor-claude-code-audited-dry-run.md) records a genuine Anthropic read-only run against base `3ecfdcd`: its stream contains exactly the twelve allowlisted protocol reads/checks, `npm run check` passed on Node `v24.20.0` and npm `11.19.0`, and its extracted handoff passes the repository schema. [Independent disposition](WP-0A-A0-001/cross-vendor-claude-code-audited-disposition.md) records Reviewer, Security, Tester, and Integration approval for this tracker item only; it is not G0/merge/role/native-protection evidence. |
| Product Owner approval | `complete for Sprint 0A baseline` | Product Owner baseline approval is recorded at `evidence/WP-0A-A0-001/product-owner-baseline-approval.md`; the distinct A5 Product/UX review is recorded at `evidence/WP-0A-A0-001/review-product-ux-A5-assigned.md`. The two approvals remain distinct. |
| Protected branch / required CI | `complete — native protection on main` (corrected 2026-10-05) | Read live, read-only, 2026-10-05: `gh api repos/ThinkBizLab-Org/ThinkBizThai/branches/main/protection` returns required check `bootstrap`, strict, `enforce_admins: true`, force push and deletion disallowed, conversation resolution required, no required pull-request review; the repository is public. This matches the checklist row above (set 2026-09-02). The earlier text here ("GitHub API still requires a supported plan ... on this private repository") was stale. RFC-2026-002 remains the separation-of-duties control, amended by RFC-2026-025; its status line and `CONTRIBUTING_AGENTS.md:61-79` still describe protection as unavailable and need the Owner (governance), see the [disposition](WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md) §5. |

## Known non-blocking maintenance annotation

GitHub Actions reported that the pinned `actions/checkout` and `actions/setup-node`
revisions target deprecated internal Node 20 and were forced by GitHub to Node 24.
Both Bootstrap validation runs passed on project Node `24.20.0` / npm `11.19.0`.
This is a tracked maintenance item for a reviewed action-pin/RFC update; it is not
a bypass, an approval, or proof that protected CI is configured.

## สรุปสิ่งที่เหลือจริงของ G0 — ตรวจเมื่อ 2026-09-02

รายการ **internal specification** ทั้งเก้าข้อในเช็กลิสต์ของ readiness report ยังติ๊กครบตามเดิม
และไม่มีข้อใดถอยหลัง สิ่งที่เหลือทั้งหมดอยู่ในหมวด **approval and external evidence**
และแยกได้เป็นสามกอง

> **แก้ไข 2026-10-05:** กองที่ 1 และ 2 ด้านล่างเป็นข้อความของ 2026-09-02 ที่ล้าสมัยแล้ว และคงไว้ในรูปขีดฆ่าเพื่อให้เห็นประวัติ
> สถานะปัจจุบันอยู่ในหัวข้อ "G0 ขั้น 2"

**กองที่ 1 — ~~Product Owner คนเดียวปลดได้~~ แก้ไข: role verdicts missing**
~~`product_reviewer_agent_run_id` ว่างใน 13 จาก 14 แพ็กเกจ ทำให้ 11 แพ็กเกจค้างที่ `in_review`~~
ช่อง product reviewer ที่ว่างไม่ได้ขวางแพ็กเกจใด (ดูแถว Capability benchmark ด้านบน) สิ่งที่ขวางคือ role verdict
ที่ยังไม่มีหรือเป็นลบที่หัวปัจจุบัน ซึ่ง agent run (C0/A1/Q0/R0) ทำได้. คำตัดสินว่าการประเมินโดย agent run
นับเป็นลายเซ็นหรือไม่ ปิดแล้วโดย RFC-2026-013 (Approved 2026-09-02)

**กองที่ 2 — ~~ติดที่แผนบัญชี~~ ปิดแล้ว**
~~protected CI ต้องการ GitHub Pro หรือเปิด repository เป็น public ตรวจสดแล้วได้ 403 ทั้งสองกลไก~~
repository เป็น public และ branch protection บน `main` ทำงานตั้งแต่ 2026-09-02 (ตรวจสดซ้ำ 2026-10-05)

**กองที่ 3 — ต้องมีบุคคลหรือบัญชีภายนอก เจ็ดรายการ**
Meta credentials, Stripe Thailand sandbox, ผู้เชี่ยวชาญกฎหมาย/PDPA และนักบัญชี,
ผู้ใช้ทดสอบชาวไทยที่ไม่ใช่สายเทคนิคอย่างน้อยห้าคน, ผู้เชี่ยวชาญสกินแคร์ที่มีคุณสมบัติ,
storage provider pricing/config และ restore drill

**สิ่งที่ไม่มีเอเจนต์คนใดทำให้เสร็จได้** คือกองที่ 1 และ 3 ทั้งหมด นี่ไม่ใช่ข้อจำกัดของเครื่องมือ
แต่เป็นสิ่งที่ G0 ตั้งใจให้เป็น: gate นี้กันการอ้างว่าพร้อม โดยเรียกหลักฐานจากคนที่รับผลจริง

---

## Safe next sequence

1. Follow RFC-2026-002 as amended by RFC-2026-025 for every proposed merge with fresh exact-head review/test/integration/CI evidence. Native branch protection on `main` exists (corrected 2026-10-05); it does not replace the role evidence.
2. Run a genuine second-vendor protocol dry run and preserve its independent
   agent-run/capability evidence.
3. Assign agents only to packages whose capability declarations, dependencies and
   reviewers meet the existing readiness report; keep all other packages in
   `backlog`.
4. Execute the declared Meta, Stripe, legal/PDPA/accounting, usability, skincare,
   and storage evidence paths without inserting real secrets or customer data into
   this repository.

---

## G0 ขั้น 2 — การตัดสินใจของ Product Owner และสถานะ G0 ณ 2026-10-05

บันทึกโดย `/claude/a0_atlas` (A0) ไม่ใช่ลายเซ็นของบทบาทใด และไม่ใช่การผ่าน G0

### การตัดสินใจ (2026-10-05)

Product Owner ตอบ `บืนยันขั้น 2` (พิมพ์ผิดจาก "ยืนยันขั้น 2") ต่อข้อความของ A0 ที่เสนอ 14 ข้อ (bullet ไม่มีเลขข้อ และไม่มี OPEN-id)
A0 อ่านว่ายืนยันทั้ง 14 ข้อตามถ้อยคำในข้อความ ไม่เกินนั้น ข้อความที่ส่งจริง (ภาษาไทย verbatim + คำแปล) คำตอบ และสิ่งที่แต่ละข้อปิด/ไม่ปิด อยู่ใน
[product-owner-disposition-2026-10-05-g0-step2.md](WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md) §1-§3

**แก้ไข (C0 F1):** ร่างก่อนหน้าของ A0 บันทึกไว้ 15 ข้อ ซึ่งเกินกว่าที่ส่งให้ Owner จริง — มีข้อ OPEN-001 "draft pricing" ที่ไม่เคยเสนอ และคำว่า feature flag, minimum-retention และ "Thai" ที่ไม่อยู่ในข้อความ
prompt ของ A0 เองที่ส่งให้ author run เป็นต้นเหตุ C0 ตรวจพบ ([c0-g0-records-review-2026-10-05.md](WP-0A-A0-001/c0-g0-records-review-2026-10-05.md) F1) เลขข้อด้านล่างเป็นเลขที่บันทึกนี้ใส่ตามลำดับข้อความ

| ข้อ | ตัดสิน | ผลต่อ register |
|---|---|---|
| 1 | ขยาย RFC-2026-024 (ถอนเงื่อนไข cross-vendor) ไป 15 แพ็กเกจ A0-002..009, CON-002..008 | ยังไม่ได้แก้ field `independence` ใน 15 manifest — ค้างเป็นงานของแต่ละแพ็กเกจ |
| 2 | `/claude/r0_steward` เป็นผู้สืบทอด `/root/r0_steward` สำหรับ acknowledgement ที่ค้าง | acknowledgement ทุกรายการยัง `pending` จนกว่า `/claude/r0_steward` จะตรวจและบันทึกเอง |
| 3 | Product reviewer ไม่ใช้กับแพ็กเกจ tooling/contract | แก้คำอธิบายในแถว Capability benchmark แล้ว |
| 4 | Beta: ออก invoice เอง ไม่ตัดเงินอัตโนมัติ, Stripe หลัง G0 | ข้อขัดแย้ง DEC-020 กับ DEC-07 ของ master plan ตัดสินตาม register; OPEN-001 ได้แค่แนวทางชั่วคราว (manual invoice, no auto-charge) — **ราคาไม่เคยเสนอ** OPEN-001 ยังเปิดรวมทั้ง pricing draft ก่อน G0; แหล่ง entitlement ของ Beta ยังเปิด |
| 5–14 | OPEN-004 (5), 006 (6), 007 = P1 (7), 009 (8), 014 (9), 017 (10), 002 เฉพาะ region (11), 003 (12), 016 (13), 011/012 synthetic (14) — การ map เป็นของ A0 | ปิดเท่าที่ถ้อยคำของแต่ละข้อไปถึง; ตัวเลข (model id, cost ceiling, size cap) และ C-01 ของ A6 ยังค้าง. **Owner ไม่ได้ตัดสิน:** retention ของ OPEN-002, feature flag ของ OPEN-007 |

ยังเปิด: OPEN-001 (ราคา, VAT, refund, grace; pricing draft ก่อน G0), OPEN-002 (retention, legal basis, DPA), OPEN-008 (Meta App Review; ไม่อยู่ในรายการ), OPEN-013 และ OPEN ที่ครบกำหนดหลัง G0.
ข้อความใน `docs/**`, `CONTRIBUTING_AGENTS.md:45,61-79` และสถานะของ RFC-2026-002 ต้องให้เจ้าของเอกสารแก้ (disposition §5)

### Blocker ที่ปิดแล้วแต่ยังค้างในบันทึก — ปิดในที่เดิม 2026-10-05

[blocker-re-audit.md](WP-0A-A0-006/blocker-re-audit.md) (ตรวจที่ `963990f`) พบ 9 จาก 36 ข้อปิดแล้ว ทุกข้อตรวจซ้ำที่
`600b48b` และปิดในที่เดิมด้วยคำนำหน้า `CLOSED 2026-10-05` โดยเก็บข้อความเดิมไว้ ไม่มี index เลื่อน:
`WP-0A-CON-002` #01, #11, #12, #13 · `WP-0A-CON-003` #01, #04 · `WP-0A-CON-006` #01, #06, #11.
**แก้ไขตาม C0 F2/F3:** สามข้อปิดได้เพียงบางส่วน จึงใช้คำนำหน้า `PARTLY CLOSED 2026-10-05` และคงส่วนที่ re-audit ไม่ได้ปิดไว้เป็น `OPEN REMAINDER`:
CON-002 #01 (ยังไม่มี required pull-request review; การปลด RFC-2026-002 ต้องผ่าน RFC), CON-002 #13 (scanner จับ JWT ได้แล้ว แต่ `actor.id` ใน schema ของ CTR-TEN-001 ยังรับค่ารูป JWT — ค้างกับเจ้าของ contract `WP-0A-CON-001`),
CON-003 #04 (required list ที่ซ้อนใน subschema ยังไม่ได้วัดทั้ง catalog). อีกหกข้อปิดเต็ม
และ `WP-0A-A0-001` open_blockers[1] (branch protection "unavailable") ปิดด้วยการอ่านสด

### สถานะ G0-001..024 (การอ่านของ A0 ที่ `main @ 600b48b`)

คอลัมน์สถานะใน register (§7.1, ลงวันที่ 2026-08-30) ล้าสมัย ตารางนี้ไม่แก้ register

| G0 | สถานะ | หลักฐาน | ที่ขาด | ใครทำ |
|---|---|---|---|---|
| 001 Decision register | partial | DEC-001..025 Approved; PO baseline approval; การตัดสินใจขั้น 2 | OPEN-008; ราคาของ OPEN-001 และ retention ของ OPEN-002 (ไม่ได้เสนอใน ขั้น 2); register ยังไม่บันทึก disposition ขั้น 2 | PO + เจ้าของ register |
| 002 Pilot 5 workspace + consent | not started | — (ใช้ synthetic-only เป็น fallback ตามข้อ 14) | consent register | PO + ภายนอก |
| 003 KPI catalog | partial | `WP-0A-A6-001` integration_verified; สูตรอนุมัติแล้ว (ข้อ 13) | C-01 มีสองสูตร (`WP-0A-A6-001.json:191`) | A6 แล้ว PO |
| 004 IA + 22 wireframes | partial (spec) | `sprint-0a-mobile-core-flow-spec-th.md` | prototype 360px + UX review; ไม่มี package | agents (A4/A5) |
| 005 Usability round 1 | not started | protocol เท่านั้น | 5–8 sessions | ภายนอก + PO |
| 006 ERD/data dictionary/migration registry | partial | `db/foundation/migrations` | `WP-0A-DB-00` ยัง `in_progress` | agents (DB-00) |
| 007 RLS/authorization matrix | partial | `test-kits/db/rls-assertions.test.mjs`; RFC-012/016/017/019/020/022 | DB-00 integration; service path บน platform จริง | agents; PO + A0 |
| 008 Tenant/API/Error contracts | partial | CTR-TEN/API/ERR/PAG/IDM = Candidate | Frozen v1 สำหรับ first slice; การตัดสินใจ cursor/page-size/hash ของเจ้าของ contract | A0/A1 แล้ว PO |
| 009 Event/Job/Usage contracts | partial | EVT/JOB Candidate; USG Draft | ลายเซ็น A6 รอบสองบน USG; AUD/OBS; freeze | agents (A6) แล้ว PO |
| 010 Module/port catalog | partial | CTR-MOD-001 Candidate | review ของเจ้าของ module; ความขัดแย้ง secret-handle (`WP-0A-CON-004.json`) | agents |
| 011 Fake adapters + first fixture | partial | `test-kits/first-integration-slice-fixture-plan.md` | fake adapters และ domain contracts ที่ขาด | agents |
| 012 Industry Pack v1 | partial (spec) | `sprint-0a-industry-research-pack-th.md` | review + แหล่งจริง | agents แล้ว PO |
| 013 Research/evidence contract + fixtures | partial (spec) | เช่นเดียวกัน | fixtures ใน catalog + review | agents |
| 014 Rubric + 30-case pilot | partial | `sprint-0a-quality-rubric-golden-set-th.md` | annotation จริง; licence (OPEN-012 ใช้ synthetic ระหว่างรอ) | ภายนอก + PO |
| 015 AI/BYOK policy | partial | นโยบาย OPEN-004 ตัดสินแล้ว (ข้อ 5) | model id + ตัวเลข ceiling ใน allowlist proposal | agents (A3) แล้ว PO |
| 016 Meta capability/App Review | not started | แผนเท่านั้น | test app, pages, IG Professional, permissions | ภายนอก (PO สร้าง asset) + agents |
| 017 Media limits/video | partial (decision) | OPEN-006 ตัดสินแล้ว (ข้อ 6); OPEN-007 = P1 (ข้อ 7) | size cap จาก matrix ของ G0-016; feature flag ของ video ไม่ได้ตัดสิน | PO + ภายนอก |
| 018 Threat model + secret boundary | partial | `sprint-0a-meta-security-commercial-readiness-th.md` (Proposed) | security review อิสระ + test owners | agents (A1 + C0) |
| 019 Retention/delete/export | partial | OPEN-002 เฉพาะ region สิงคโปร์ (ข้อ 11); OPEN-003 target (ข้อ 12) | retention ต่อ data class (OPEN-002 G0 policy draft — Owner ไม่ได้ตัดสิน); PDPA review; storage purge/restore drill (ก่อน G6) | ภายนอก + PO; agents |
| 020 Billing/manual invoice | partial | DEC-020 ยืนยัน (ข้อ 4: manual invoice, ไม่ตัดเงินอัตโนมัติ) | pricing draft (OPEN-001 — ไม่เคยเสนอต่อ Owner); accountant review; แหล่ง entitlement ของ Beta | PO + ภายนอก |
| 021 Environment/CI/test strategy | partial (mostly) | `.github/workflows/ci.yml`; branch protection ตรวจสด 2026-10-05 | review env contract + evidence template | agents แล้ว PO |
| 022 Vendor-neutral protocol | **done** | `WP-0A-A0-001` integration_verified; `CONTRIBUTING_AGENTS.md` | ข้อความล้าสมัย `CONTRIBUTING_AGENTS.md:61-79` (governance) | PO |
| 023 Cross-agent dry run | **done** (protocol) | แถว Cross-vendor dry run ด้านบน | — | — |
| 024 Risk acceptance/sign-off | **decided, conditional** (2026-10-08) | Owner ตัดสิน D0: ผ่านแบบ approved fallback ([disposition](WP-0A-A0-001/product-owner-disposition-2026-10-08-g0-exit-and-g1-decisions.md) §4) | Owner merge PR นี้เอง (D0); register §7.2 ข้อ 2/6/8 กลายเป็นเงื่อนไขของงาน G1 (การอ่านของ A0, disposition §4.2); รายการภายนอกทั้งหมดยังค้าง | PO; เจ้าของ register ถอดความ |

นับแบบ done = 1, partial = 0.5: 2 done + 18 partial + 3 not started (002, 005, 016) + 1 decided, conditional (024) = 11/24 ≈ 46%.
แถว 024 "decided, conditional" นับเป็น 0 (การนับของ A0): D0 เป็นคำตัดสินของ Owner แต่ checklist ที่ลงนามและเจ้าของ deferred risk ตาม acceptance ของแถวนี้ยังไม่มี (แก้ 2026-10-08 ตาม C0 F3, Q0 F3, R0 R-3)
ตามมาตรฐานหลักฐานเข้ม (acceptance ครบพร้อมหลักฐานอิสระ) = 2/24.

### 15 แพ็กเกจ: role verdict ล่าสุด

ทั้ง 15 แพ็กเกจต้องการ re-verification ที่หัวปัจจุบัน เพราะงานถูก merge หลัง verdict เดิม

| WP | verdict ล่าสุดที่มี | ที่ขาด |
|---|---|---|
| A0-002 | C0 `changes_requested` (`review-contract-round7.md:491`); A1 with conditions; Q0 `test_failed`; R0 ที่หัวเก่า `4e1d6e5` | C0/Q0 ใหม่, R0 ใหม่ |
| A0-003 | C0 `changes_required` (`review-contract-c0.md:18`); A1 with conditions; Q0 `test-verdict-q0.md` | author fix แล้ว recheck + R0 |
| A0-004, A0-005 | author self-check เท่านั้น | ครบสี่บทบาท |
| A0-006..009 | ไม่มี role verdict (A0-006 มีเพียง blocker re-audit) | `in_review` + handoff แล้วครบสี่บทบาท |
| CON-002 | C0 `changes_requested`; A1 `security_changes_requested`; Q0 with conditions | author fix, recheck, R0 |
| CON-003 | C0 `changes_requested`; A1, Q0 with conditions | fix, recheck, R0 |
| CON-004 | C0 `changes_requested`; A1 disposition บางส่วน; **ไม่มี Q0** | Q0; การตัดสินใจของ A1 บน CTR-SEC-001 |
| CON-005 | C0 `review_approved_with_conditions`; A1, Q0 with conditions | ปิดเงื่อนไข + R0 (ใกล้ที่สุด) |
| CON-006 | C0 `changes_requested`; Q0 with conditions; **ไม่มี A1** | A1; A5 ratify NTF; A6 บน USG |
| CON-007 | C0 `changes_required`; A1, Q0 with conditions | fix, recheck, R0 |
| CON-008 | คำตอบ author ต่อ review 22 รอบ; ไม่มีไฟล์ verdict แยก | ครบบทบาทที่หัวปัจจุบัน; A1/A6/A5 sign-off |

---

## G0 ทางออกแบบมีเงื่อนไข (D0) — การตัดสินใจของ Product Owner 2026-10-08

บันทึกโดย `/claude/a0_atlas` (A0) ไม่ใช่ลายเซ็นของบทบาทใด. Product Owner ตอบ `รับตามแนะนำทั้งหมด รวม RFC-030 ด้วย ลุยเลย`
(2026-10-08T06:31:21Z) ต่อข้อความของ A0 ที่ถามว่าจะรับ D0–D14 ตามคำแนะนำในแผน G1/G2 และ RFC-030 หรือไม่.
ข้อความที่ส่งจริง ตารางตัดสินใจ D0–D14 แบบคำต่อคำ และสิ่งที่แต่ละข้อไม่ได้ตัดสิน อยู่ใน [disposition 2026-10-08](WP-0A-A0-001/product-owner-disposition-2026-10-08-g0-exit-and-g1-decisions.md).
แพ็กเกจที่แผนตั้งชื่อไว้สำหรับบันทึกนี้คือ `WP-0A-A0-010` (`work-packages/WP-0A-A0-010.json`)

### ผลของ D0

- **G0 ผ่านด้วย approved fallback** ตาม pass rule ของ readiness report
  (`docs/sprint-0a/sprint-0a-g0-readiness-report-th.md:190`: "external blocker ที่กระทบ P0 มีหลักฐานหรือ approved fallback").
  fallback ของแต่ละรายการภายนอกคือการผูกกับ gate ที่มันขวางจริง (ตารางด้านล่าง) — gate นั้นคือ due gate.
  stop condition ระหว่างรอคือของเอกสารต้นทาง (readiness report §10 และ register §3) ตามคำต่อคำ D0 ไม่ได้เปลี่ยนข้อใด
- **ข้อจำกัดบังคับ: ห้าม production customer data จนกว่า legal/PDPA จะผ่าน** (stop condition ของ OPEN-002, register บรรทัด 111) ใช้ synthetic data เท่านั้น
- **ไม่มีรายการภายนอกใดเสร็จ** บันทึกนี้ไม่อ้างว่าเสร็จ
- **ที่ D0 ไม่ได้พูดถึง:** pass rule ของ register §7.2 (บรรทัด 360-372) เข้มกว่า — ข้อ 2 (contract ที่ First Slice ใช้ต้อง Frozen v1; ยังไม่มีฉบับใด Frozen),
  ข้อ 6 (wireframe ทุก core flow; G0-004 partial), ข้อ 8 (PO และ A0 ลง Approved). A0 อ่านว่าข้อ 2 และ 6 กลายเป็นเงื่อนไขของงาน G1 ที่ใช้มัน
  (`WP-0A-CON-008` ต้อง freeze ก่อน implementation ตาม register บรรทัด 190) — **การอ่านนี้เป็นของ A0** เจ้าของ register ต้องถอดความ หรือ Owner แก้.
  บันทึกนี้ไม่ได้ตรวจข้อ 1, 3, 4, 5, 7 และวรรคท้ายของข้อ 8 ("Security/QA ไม่มี stop-the-line issue ค้าง") (disposition §4.2)
- **ที่ D0 ไม่ได้พูดถึงใน pass rule ของ readiness report เอง (`:190`):** D0 ตอบเฉพาะเงื่อนไข approved fallback.
  อีกสามเงื่อนไข — internal specification ไม่ถอยหลัง, PO อนุมัติ scope/contracts (CTR-* ทุกฉบับยังเป็น Candidate/Draft),
  และไม่มี Critical risk ที่ไม่มี owner/due gate — บันทึกนี้ไม่ได้ตรวจและไม่อ้างว่าผ่าน (disposition §4.2)
- **OPEN-002:** register บรรทัด 111 กำหนด due "G0 policy draft; final ก่อน G6" แต่ D0 ผูก legal/PDPA กับ G2 — A0 อ่านว่าเลื่อน
  policy draft ไป G2; D0 ไม่ได้เอ่ยถึง OPEN-002 และ stop condition ของมันยังอยู่ครบ เจ้าของ register ต้องถอดความ
- `CONTRIBUTING_AGENTS.md` หัวข้อ "Current gate constraint" ยังเขียนว่า G0 ยังไม่ผ่าน — เป็น governance ต้องแก้ผ่าน PR ที่ Owner merge เอง ไม่แก้ในที่นี้
- **กติกาช่วงระหว่างนี้ (การอ่านของ A0 รอ Owner ยืนยันหรือแก้):** "Current gate constraint" ของ `CONTRIBUTING_AGENTS.md` และบรรทัด 373
  ของ register ("ถ้าไม่ผ่าน G0 อนุญาตเฉพาะ Spike, …") **ยังผูกพัน agent ทุกตัวเหมือนเดิม** จนกว่า governance PR ที่แก้ข้อความนั้นจะถูก Owner merge —
  งาน G1 ที่ผูก production schema หรือ external provider ยังไม่เริ่มก่อนนั้น (A1-1, R0 R-4)

### รายการภายนอก ผูกกับ gate ที่ขวางจริง (แผน §6)

คอลัมน์ stop condition **ไม่ใช่ถ้อยคำของ Owner**: แต่ละช่องคัดคำต่อคำจากเอกสารต้นทางพร้อมบรรทัด — "R§10" คือ
`docs/sprint-0a/sprint-0a-g0-readiness-report-th.md` §10, "register" คือ `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md`.
ช่องที่ติด **[A0 อนุมาน, Owner ไม่เคยเห็น]** ไม่มีเอกสารต้นทางรองรับ (เขียนใหม่ 2026-10-08 ตาม C0 F1: คอลัมน์เดิมเป็นข้อความของ A0 ที่ไม่ได้ติดป้าย และสี่แถวอ่อนกว่า R§10)

| รายการภายนอก | ขวาง gate (แผน §6) | stop condition ระหว่างรอ (คำต่อคำ พร้อมที่มา) | เสร็จ? |
|---|---|---|---|
| นิติบุคคล โดเมน DNS (D14) | G1 (email), G2 (Meta, privacy URL) | D14: "ต้องมีก่อนสร้าง Meta app, email sender และ privacy URL" | ไม่ |
| Supabase Pro (สิงคโปร์ 2 project), Vercel Pro, 2FA, secret ใน GitHub | G1 | ไม่มีเอกสารต้นทาง **[A0 อนุมาน, Owner ไม่เคยเห็น]** ไม่ provision environment ของ G1 ก่อนมีบัญชี; แผน §6: "agent สร้างบัญชีหรือใส่ credential แทนไม่ได้" | ไม่ |
| Meta: Business Verification, developer app, test Page + IG Professional, MTA-002/003 ด้วย credential จริง | G2 (MCN-002 ขึ้นกับ MTA-002), G6 (App Review) | R§10 บรรทัด 198: "ห้ามเปิด publishing จริง" (safe work: "Fake adapter, fixtures, contract tests") | ไม่ |
| ที่ปรึกษากฎหมาย/PDPA: privacy notice, terms, data-deletion, DPA | **G2** | D0: "ห้าม production customer data จนกว่าข้อ legal/PDPA จะผ่าน"; register บรรทัด 111 (OPEN-002): "ห้าม Production customer data ถ้า legal/retention noticeไม่พร้อม"; R§10 บรรทัด 200: "ห้ามสรุป tax/refund/retention เป็น final" | ไม่ |
| Email provider + SPF/DKIM/DMARC (D8) | G2 (OTP/invite) | register บรรทัด 119 (OPEN-010): "ห้าม Production email ก่อน SPF/DKIM/DMARC/testพร้อม" | ไม่ |
| Usability SME 5 ราย บน prototype | ก่อน freeze ของ WP-1A-A5-002/003 | R§10 บรรทัด 201: "ห้ามอ้างว่า onboarding ผ่านผู้ใช้จริง"; แผน §6: "token และ component ทำแบบแก้กลับได้ไปก่อน แต่ freeze ควรรอผล" | ไม่ |
| Consent ของ 5 pilot workspace (OPEN-011) | G2 pilot | register บรรทัด 120 (OPEN-011): "ห้ามนำ content ลูกค้ามา train/eval โดยไม่มี permission" (safe default: "Synthetic fixtures") | ไม่ |
| นักบัญชี | G6 | R§10 บรรทัด 200: "ห้ามสรุป tax/refund/retention เป็น final" | ไม่ |
| ผู้ตรวจด้านสกินแคร์ | ก่อน Pack 2 pilot (G3/G4) | R§10 บรรทัด 202: "ห้ามเปิด autonomous skincare publishing" | ไม่ |
| ราคา storage และ restore drill | G5/G6 (D10 ปิดแค่การเลือก provider) | R§10 บรรทัด 203: "ห้ามเปิด self-service permanent deletion"; register บรรทัด 129 (OPEN-020): "ห้าม Domain ผูก bucket URL/provider SDK" | ไม่ |
| Stripe Thailand | ไม่อยู่ในแผน §6; เลื่อนหลัง G0 ตามขั้น 2 ข้อ 4; Beta ใช้ manual invoice | R§10 บรรทัด 199: "ห้ามขาย Paid Beta จริง" **[A0 อนุมาน, Owner ไม่เคยเห็น]** การนับ manual invoice เป็น approved fallback ของข้อนี้เป็นการอ่านของ A0 — D0 ไม่ได้เอ่ยถึง Stripe จึง **ยังไม่ได้รับการยืนยัน** | ไม่ (deferred) |

### OPEN-010/018/019/020 — ตัดสินเท่าที่ถ้อยคำของ D ไปถึง (register ยังไม่ได้แก้; `docs/**` read-only)

| OPEN | ตัดสินโดย | ตัดสินแล้ว | ยังเปิด |
|---|---|---|---|
| OPEN-010 email provider/sender domain | D8 | เกณฑ์ (SPF/DKIM/DMARC + data processing terms), ไม่ใช้ SMTP ที่มากับ Supabase ใน production, เลือกใน G1 | **ยี่ห้อ provider และ sender domain** (รอ D14) |
| OPEN-018 language/runtime/package manager | D1 | application tier: Next.js App Router + TypeScript strict + `tsc --noEmit` ใน CI | RFC-2026-029 (dependency allowlist, lockfile, `npm ci --ignore-scripts`) ยังไม่ได้เขียน — ห้ามเพิ่ม dependency จนกว่าจะอนุมัติ |
| OPEN-019 queue/operational limits | D6 | `app.jobs`/`app.outbox_events` เป็น queue, ไม่ใช้ pgmq, Cron รายนาทีเรียก dispatcher ที่ claim ด้วย lease | **operational limits** (lease, budget, retry/backoff) และการวัด function duration |
| OPEN-020 Supabase Storage vs R2 | D10 | Supabase Storage หลัง Storage Port ตาม ADR-013 | pricing, export/purge, restore drill (G5/G6) |

เจ้าของ register ต้องถอดความทั้งสี่ข้อลง register §3 (disposition §6)

### การตัดสินใจอื่นของ 2026-10-08 (สรุป; ข้อความที่ผูกพันอยู่ใน disposition §2.1)

D2 Vercel Pro `sin1` · D3 Supabase `staging` + `prod` ใน `ap-southeast-1` ไม่เปิด branching ใน G1 · D4 Email OTP ก่อน, Google เป็น P1 ·
D5 ตัดตัวเลือก service-role key (request path ใช้ JWT ของ user + command function; worker ใช้ login role ของ RFC-028) — ข้อความใน
`WP-0A-DB-00.required_human_authorities[0]` ยังต้องให้เจ้าของแพ็กเกจปิด · D7 Supabase Vault แบบมีเงื่อนไขการวัดของ A1 ก่อน MCN-001 ·
D9 Sentry ปิด default PII, scrub ฝั่ง server และต้องลง subprocessor map (PRV-001) · D11 polling ใน G1/G2 · D12 Tailwind + shadcn/ui, A5 เสนอฟอนต์ไทย · D13 ชื่อ WP `WP-1A-*` (G1) และ `WP-1B-*` (G2) ·
D14 นิติบุคคล/โดเมน/อีเมลต้องมีก่อน Meta app, email sender, privacy URL · **RFC-2026-030** (risk-tiered review) รับข้อเสนอแล้ว แต่ไฟล์ RFC ยังไม่มี
และเป็น governance ที่ Owner merge เอง — จนกว่าจะ merge กติกาสี่บทบาทเดิมใช้ต่อ

### ผู้ merge

PR ที่บันทึกนี้เป็น governance (แก้ gate) — RFC-2026-025 §5 item 6 และถ้อยคำของ D0 เอง ("gate-record PR ที่ Owner merge เอง")
ให้ **Owner merge เอง** คำว่า `ให้ A0 กดเอง` (2026-10-08T06:11:04Z) ตอบคำถามเรื่อง PR อื่น (disposition §7)

หลัง Owner รับ D0 มีอีกสาม turn ในเซสชันเดียวกันที่พูดตรงข้าม (บันทึกคำต่อคำใน disposition §7.1, เพิ่มตาม Q0 F1):
A0 (06:31:57Z) "ทุกตัวผ่านการตรวจ 4 role แล้วผมกด merge เองตามที่คุณสั่ง" โดยข้อ 2 ของรายการคือบันทึกนี้;
Owner (06:32:20Z) "ลุยต่อเลย"; A0 (06:32:49Z) "ทุกตัวผ่าน 4 role แล้วผมจะ merge ทีละตัว".
ทั้งสามไม่เปลี่ยนผู้ merge: `ลุยต่อเลย` ไม่ได้ระบุ PR ใด, governance PR "never by delegation" (RFC-2026-025 §5 item 6) และ D0 เองกำหนดให้ Owner merge.
A0 และ orchestrator ห้ามกด merge PR นี้ จนกว่า Owner จะกดเองหรือสั่งโดยระบุ PR #214. **A0 ค้างการแก้ข้อความทั้งสองในแชตกับ Owner**
