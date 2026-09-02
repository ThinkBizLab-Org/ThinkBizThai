# G0 Evidence Tracker — ThinkBizThai

สถานะ ณ วันที่ 2026-09-02: **Specification Baseline Complete / External
Verification Pending**

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
| Canonical guide, thin Codex/Claude adapters, protected CI | `2 of 3 complete; the third is blocked by plan, not by work` — ตรวจสดเมื่อ 2026-09-02 ไม่ใช่จากบันทึกเก่า: `branches/main/protection` และ `rulesets` ตอบ **403 Upgrade to GitHub Pro or make this repository public** ทั้งคู่; org อยู่แผน free, repo private. ทางออกมีสองทาง คือจ่ายค่าแผน หรือเปิด public — และถ้าเปิด public: secret scan ทั้งต้นไม้ exit 0, ทุกแพ็กเกจประกาศ `data_classification: synthetic-only`, อีเมลของ Product Owner ไม่ปรากฏในไฟล์ใด, 972 ไฟล์เป็น spec กับข้อมูลสังเคราะห์ทั้งหมด. **เป็นการตัดสินใจทางธุรกิจ ไม่ใช่ทางเทคนิค** | [RFC-2026-002 manual merge control](../architecture/decisions/RFC-2026-002-manual-merge-control.md), [Product Owner RFC approval](WP-0A-A0-001/rfc-002-product-owner-approval.md), and [exact-commit verification](WP-0A-A0-001/rfc-002-exact-commit-verification.md) record the owner-directed branch/PR/CI/evidence process while the repository stays private with no paid GitHub plan. This is an approved provisional procedure only, not integrated/native protected CI; every merge still needs fresh exact-head evidence and the protected-CI G0 requirement remains unresolved. GitHub branch protection still requires a supported plan for this private repository; do not change visibility or billing automatically. |
| Capability benchmark และ agent IDs ทุก Ready package | `partial — และช่องว่างมีรูปแบบเดียว` | A0 + role owners; **product_reviewer คือ Product Owner** | นับจาก manifest จริงเมื่อ 2026-09-02: `product_reviewer_agent_run_id` เป็น null ใน **13 จาก 14 แพ็กเกจ** — เป็นบทบาทเดียวที่ว่างเป็นระบบ และเป็นบทบาทเดียวที่ไม่ใช่เอเจนต์. อีก 6 ช่องที่ว่างอยู่ใน `WP-0A-A6-001` แพ็กเกจเดียว ซึ่งยังเป็น `backlog` จึงยังไม่เข้าเงื่อนไข 'ทุก Ready package'. ผลคือ 11 แพ็กเกจค้างที่ `in_review` ซึ่งเป็นสถานะสุดท้ายที่ Author เลื่อนเองได้ตามโปรโตคอล | `.agents/capability-profiles/` มี declaration สำหรับ role run ปัจจุบัน และ CI validator ปฏิเสธ Ready-or-later manifest ที่อ้าง run โดยไม่มี declaration หรืออนุญาต external secret; ยังต้องมี benchmark/reference ที่ตรวจทักษะและ vendor diversity ก่อนใช้เป็น G0 evidence |
| Meta app/pages/IG permissions ทดสอบด้วย credentials จริง | `open` | A6 + Security + Product | ต้องใช้ test app/accounts, redacted capability matrix และ external operation evidence; ห้ามเก็บ credentials ใน repository |
| Stripe Thailand sandbox, products/prices, signed webhook และ Portal | `open` | A6 + Finance + Security | ต้องมี Stripe sandbox evidence: raw-body signature verification, duplicate/replay/out-of-order tests และ entitlement จาก verified webhook เท่านั้น |
| Legal/PDPA/accounting: retention, VAT, invoice, refund, grace | `open` | Legal/PDPA specialist + accountant + Product Owner | ต้องเป็น approval จากผู้เชี่ยวชาญ ไม่รับการอนุมานจาก agent |
| Thai SME non-tech usability อย่างน้อย 5 คน | `open` | Product Owner + A5 | A5 dry run ระบุว่าไม่มี UI/usability evidence ใน REP-00; ต้องมี consent-safe, moderated evidence ของ UX package |
| Qualified skincare review สำหรับ claim rules/cases | `open` | Qualified skincare reviewer + Product/Brand | ต้องมีผู้เชี่ยวชาญจริงและ evidence ที่ redacted/permissioned ตาม policy |
| Storage pricing/config, export/purge, restore drill | `open` | A4 + Security + Data/Operations owner | A4 review ยืนยันเฉพาะ guardrail; ต้องมี provider decision, exact-key purge/restore evidence และ lifecycle drill |

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
| Protected branch / required CI | `manual_fallback_approved_provisional; G0 blocker remains` | RFC-2026-002 requires branch + Draft PR, green CI, independent evidence, owner merge, and reviewed revert only. Follow it for each proposed merge with fresh exact-head evidence; GitHub Actions runs are available, but this is not native enforcement and GitHub API still requires a supported plan for protected branches on this private repository. |

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

**กองที่ 1 — Product Owner คนเดียวปลดได้ (เป็นตัวขวางเชิงโครงสร้าง)**
`product_reviewer_agent_run_id` ว่างใน 13 จาก 14 แพ็กเกจ ทำให้ 11 แพ็กเกจค้างที่ `in_review`
ซึ่งเป็นสถานะสุดท้ายที่ Author เลื่อนเองได้ ไม่ใช่งานที่ค้าง แต่เป็นบทบาทที่ยังไม่มีคนถือ
รวมถึงคำตัดสินว่าการประเมินโดย agent run นับเป็นลายเซ็นผู้ร่วมเป็นเจ้าของหรือไม่

**กองที่ 2 — ติดที่แผนบัญชี ไม่ใช่ที่งาน**
protected CI ต้องการ GitHub Pro หรือเปิด repository เป็น public ตรวจสดแล้วได้ 403 ทั้งสองกลไก
เนื้อในรีโปปลอดภัยพอจะเปิด public (secret scan exit 0, ทุกแพ็กเกจ synthetic-only, ไม่มีอีเมลของ
Product Owner ในไฟล์ใด) แต่การเลือกเป็นเรื่องธุรกิจ

**กองที่ 3 — ต้องมีบุคคลหรือบัญชีภายนอก เจ็ดรายการ**
Meta credentials, Stripe Thailand sandbox, ผู้เชี่ยวชาญกฎหมาย/PDPA และนักบัญชี,
ผู้ใช้ทดสอบชาวไทยที่ไม่ใช่สายเทคนิคอย่างน้อยห้าคน, ผู้เชี่ยวชาญสกินแคร์ที่มีคุณสมบัติ,
storage provider pricing/config และ restore drill

**สิ่งที่ไม่มีเอเจนต์คนใดทำให้เสร็จได้** คือกองที่ 1 และ 3 ทั้งหมด นี่ไม่ใช่ข้อจำกัดของเครื่องมือ
แต่เป็นสิ่งที่ G0 ตั้งใจให้เป็น: gate นี้กันการอ้างว่าพร้อม โดยเรียกหลักฐานจากคนที่รับผลจริง

---

## Safe next sequence

1. Follow the approved provisional RFC-2026-002 process for every proposed merge with fresh exact-head review/test/integration/CI evidence; obtain native branch-protection evidence only when a supported plan/authorized configuration becomes available.
2. Run a genuine second-vendor protocol dry run and preserve its independent
   agent-run/capability evidence.
3. Assign agents only to packages whose capability declarations, dependencies and
   reviewers meet the existing readiness report; keep all other packages in
   `backlog`.
4. Execute the declared Meta, Stripe, legal/PDPA/accounting, usability, skincare,
   and storage evidence paths without inserting real secrets or customer data into
   this repository.
