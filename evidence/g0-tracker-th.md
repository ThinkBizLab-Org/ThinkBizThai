# G0 Evidence Tracker — ThinkBizThai

สถานะ ณ วันที่ 2026-08-31: **Specification Baseline Complete / External
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
| Product Owner อนุมัติ DEC-01..16 | `open` | Product Owner | ต้องมี approval record ที่ผู้มีอำนาจลงนาม; การมอบหมายให้ทำงานไม่ใช่ approval ของ DEC ทั้งชุด |
| Canonical guide, thin Codex/Claude adapters, protected CI | `blocked_external` | A0, repository administrator, Product Owner | [CONTRIBUTING_AGENTS.md](../CONTRIBUTING_AGENTS.md), `AGENTS.md`, `CLAUDE.md`, PR #1 CI ผ่าน; GitHub branch-protection API query เมื่อ 2026-08-31 ตอบ HTTP 403: ต้อง Upgrade เป็น GitHub Pro หรือทำ repository เป็น public. Owner ต้องเลือกทางที่อนุญาตและบันทึก required-CI/branch-protection evidence; ห้ามเปลี่ยน visibility หรือ billing plan โดยอัตโนมัติ |
| Capability benchmark และ agent IDs ทุก Ready package | `partial` | A0 + role owners | `.agents/capability-profiles/` เริ่มมี declaration สำหรับ run ที่เข้าถึงได้; ยังต้องมี benchmark/reference ที่ตรวจทักษะ และต้อง declare ก่อน package ใดเปลี่ยนเป็น `ready` |
| Meta app/pages/IG permissions ทดสอบด้วย credentials จริง | `open` | A6 + Security + Product | ต้องใช้ test app/accounts, redacted capability matrix และ external operation evidence; ห้ามเก็บ credentials ใน repository |
| Stripe Thailand sandbox, products/prices, signed webhook และ Portal | `open` | A6 + Finance + Security | ต้องมี Stripe sandbox evidence: raw-body signature verification, duplicate/replay/out-of-order tests และ entitlement จาก verified webhook เท่านั้น |
| Legal/PDPA/accounting: retention, VAT, invoice, refund, grace | `open` | Legal/PDPA specialist + accountant + Product Owner | ต้องเป็น approval จากผู้เชี่ยวชาญ ไม่รับการอนุมานจาก agent |
| Thai SME non-tech usability อย่างน้อย 5 คน | `open` | Product Owner + A5 | A5 dry run ระบุว่าไม่มี UI/usability evidence ใน REP-00; ต้องมี consent-safe, moderated evidence ของ UX package |
| Qualified skincare review สำหรับ claim rules/cases | `open` | Qualified skincare reviewer + Product/Brand | ต้องมีผู้เชี่ยวชาญจริงและ evidence ที่ redacted/permissioned ตาม policy |
| Storage pricing/config, export/purge, restore drill | `open` | A4 + Security + Data/Operations owner | A4 review ยืนยันเฉพาะ guardrail; ต้องมี provider decision, exact-key purge/restore evidence และ lifecycle drill |

## REP-00 / WP-0A-A0-001 evidence status

| Acceptance requirement | Current state | Evidence / blocker |
|---|---|---|
| Canonical protocol bootstrap และ deterministic CI | `complete for committed bootstrap` | Commit `3c8e025`, `899c2bb`; [Draft PR #1](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/1); CI passes at runs `33335381144` and `33335718109` |
| A1–A6 representative review | `partial` | A1 review/security evidence exists; A2 asks for capability-routing remediation; A3/A4/A6 approve within narrow scope; A5 requests a real Product/UX approval assignment. These reviews are not PO approval. |
| Capability declaration routing | `partial` | See `.agents/capability-profiles/`; declarations are conservative and not a cross-vendor benchmark. A2/A3/A4 capability declarations remain unrecorded by their own runs. |
| Cross-vendor manifest-to-handoff dry run | `open` | All recorded reviews are same-vendor environment. A distinct vendor execution (for example, Claude) with real run evidence is required; do not simulate it. |
| Product Owner approval | `open` | `product_reviewer_agent_run_id` remains `null`; A5 cannot substitute for Product Owner approval. |
| Protected branch / required CI | `blocked_external` | GitHub Actions runs `33335381144`, `33335718109`, และ `33347324705` ผ่าน แต่ GitHub API ปฏิเสธ branch protection (HTTP 403: Upgrade to GitHub Pro or make the repository public). Owner/admin ต้องตัดสินใจเรื่อง plan/visibility และบันทึก configuration evidence. |

## Known non-blocking maintenance annotation

GitHub Actions reported that the pinned `actions/checkout` and `actions/setup-node`
revisions target deprecated internal Node 20 and were forced by GitHub to Node 24.
Both Bootstrap validation runs passed on project Node `24.20.0` / npm `11.19.0`.
This is a tracked maintenance item for a reviewed action-pin/RFC update; it is not
a bypass, an approval, or proof that protected CI is configured.

## Safe next sequence

1. Obtain and record the Product Owner decision and branch-protection evidence.
2. Run a genuine second-vendor protocol dry run and preserve its independent
   agent-run/capability evidence.
3. Assign agents only to packages whose capability declarations, dependencies and
   reviewers meet the existing readiness report; keep all other packages in
   `backlog`.
4. Execute the declared Meta, Stripe, legal/PDPA/accounting, usability, skincare,
   and storage evidence paths without inserting real secrets or customer data into
   this repository.
