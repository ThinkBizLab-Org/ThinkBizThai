# AI Content OS สำหรับ SME ไทย

## Master Product Plan, Development Phases และ Feature Backlog

**สถานะ:** Living Plan v1.1  
**วันที่:** 30 สิงหาคม 2026  
**เจ้าของผลิตภัณฑ์:** One-person business  
**ผู้ใช้หลัก:** เจ้าของธุรกิจและทีมการตลาด SME ไทยที่ไม่ใช่สายเทคนิค  
**ช่องทางแรก:** Facebook Page + Instagram Professional  
**เป้าหมาย Release แรก:** Research → วิเคราะห์ → สร้าง → จัดการสื่อ → อนุมัติ/ปฏิทิน → โพสต์

เอกสารนี้เป็น Source of Truth ระดับ Product และ Delivery ใช้เก็บขอบเขต, ลำดับการพัฒนา, Feature Backlog, เกณฑ์ออก Production และรายการที่เลื่อนไปภายหลัง รายละเอียดโครงสร้างระบบอยู่ใน `technical-architecture-meta-content-os-th.md` และรายละเอียด Asset Library อยู่ใน `asset-library-database-ux-spec-th.md`

---

## 1. Product Thesis

สร้าง Marketing PaaS ภาษาไทยสำหรับ SME ที่ไม่ได้เป็นเพียง Social Scheduler แต่ช่วยให้ธุรกิจคิดและผลิตคอนเทนต์ที่เหมาะกับธุรกิจของตนเอง โดยใช้ Business Knowledge, Research ที่มีหลักฐาน และ Quality Gate ก่อนโพสต์จริง

คุณค่าหลักที่ต้องพิสูจน์:

1. ลดเวลาจาก “ไม่รู้จะโพสต์อะไร” ไปสู่โพสต์ที่พร้อมเผยแพร่
2. ทำให้คุณภาพคอนเทนต์สม่ำเสมอ แม้ผู้ใช้ไม่เก่งการเขียน Prompt
3. แยกความรู้และคำแนะนำตามแต่ละธุรกิจ, Page และ Industry
4. ให้ทีมเล็กทำงานแบบผู้สร้างส่งให้หัวหน้าอนุมัติได้
5. ทำทุก Core Flow ผ่านมือถือด้วยการแตะและเลือกเป็นหลัก
6. ควบคุมต้นทุน AI, Research, Storage และ Support ให้คนเดียวดูแลธุรกิจได้

### North-star outcome

“จำนวน Content ที่ผ่าน Quality Gate และ Publish สำเร็จต่อ Active Workspace ต่อเดือน”

Metric ประกอบ:

- Time to First Scheduled Post ไม่เกิน 30 นาที
- Publish success rate อย่างน้อย 99% หลัง retry โดยไม่นับ Meta policy rejection
- AI/Research job completion อย่างน้อย 98% ภายใน SLA ที่กำหนด
- ผู้ใช้ Pilot อย่างน้อย 80% ทำ Core Flow บนมือถือได้โดยไม่ต้องมีคนสอน
- Content approval median turnaround ต่ำกว่า 24 ชั่วโมงใน Workspace ที่เปิด Approval
- Fully loaded gross margin เป้าหมายอย่างน้อย 70%

---

## 2. Locked Product Decisions

| เรื่อง | คำตัดสิน |
|---|---|
| ตลาดเริ่มต้น | SME ไทยและทีมการตลาดขนาดเล็ก |
| Social channel | Facebook Page + Instagram Professional เท่านั้นใน Release แรก |
| LinkedIn | ไม่ทำใน Roadmap ระยะใกล้ เพราะไม่ใช่ช่องทางหลักของกลุ่มเป้าหมาย |
| Release แรก | Research, Analyze, Generate, Asset Library, Approval, Calendar และ Meta Publishing |
| Lead/ROI/Inbox | เลื่อนไป Phase 2; Phase 1 วัด Content delivery/engagement ก่อน |
| Workspace | มีหลาย User, หลาย Business และหลาย Page/IG account ได้ |
| Knowledge | แยก Workspace → Business → Page; ห้ามใช้ข้อมูลข้ามธุรกิจโดยไม่ตั้งใจ |
| Approval | Admin เปิด/ปิดได้; เมื่อเปิดใช้ “ผู้สร้างส่งตรวจ → ผู้อนุมัติอนุมัติ” |
| AI | Provider-neutral; Platform AI และ BYOK; เลือก Provider/Model จากรายการที่คัดแล้ว |
| OpenRouter | Optional adapter หลังมี demand; ไม่เป็น Critical Path ของ Release แรก |
| งาน AI/Media | Background ทุกงาน; ผู้ใช้ออกจากหน้าได้และได้รับ Notification |
| Asset Storage | Supabase Storage private bucket ใน Production Beta; ซ่อนหลัง Storage Port; R2 เหมาะเป็น backup/ทางเลือกภายหลัง |
| UX | Thai-first, non-tech, click/select-first, mobile-first; ไม่บังคับเขียน Prompt |
| Business model | Paid Beta, quota ชัด, setup/onboarding แบบมาตรฐาน, Support แบบ async |
| Modularity | ทุก capability เป็น Kernel/Domain Module/Adapter ที่มี versioned contract; เริ่ม deploy แบบ Modular Monolith และแยกเมื่อมี scale trigger |

---

## 3. Primary Users และ Core Jobs

### 3.1 เจ้าของธุรกิจ / Admin

- เชื่อม Page และ IG ของหลายธุรกิจ
- กำหนดข้อมูลธุรกิจ, กลุ่มลูกค้า, สินค้า, น้ำเสียง และข้อห้าม
- เลือกแพ็กเกจ/AI mode และดูการใช้งานแบบภาษาคนทั่วไป
- เปิดหรือปิดขั้นตอนอนุมัติ
- เชิญทีมและกำหนดสิทธิ์

### 3.2 ผู้สร้าง Content / Editor

- เลือกไอเดียที่ระบบ Research มาให้
- สร้างและปรับ Content โดยแตะตัวเลือกแทนการเขียน Prompt
- เลือกรูป/วิดีโอจากคลังหรืออัปโหลดจากมือถือ
- ส่งให้หัวหน้าตรวจหรือตั้งเวลาได้ตาม Policy

### 3.3 ผู้อนุมัติ / Approver

- เห็นเฉพาะรายการที่ต้องตัดสินใจ
- ดูตัวอย่าง Facebook และ Instagram
- อนุมัติ, ขอแก้ หรือแสดงความคิดเห็นผ่านมือถือ
- ได้รับแจ้งเตือนเมื่อมีงานรอและเมื่อฉบับที่แก้กลับมา

### 3.4 ผู้ดูอย่างเดียว / Viewer

- ดูปฏิทิน, สถานะ, ผลการโพสต์ และคลังสื่อที่ได้รับสิทธิ์
- แก้ไขหรือ Publish ไม่ได้

---

## 4. End-to-end Core Flow

1. Onboarding เลือกประเภทธุรกิจ, เป้าหมาย, กลุ่มลูกค้า, น้ำเสียง และเชื่อม Meta
2. ระบบสร้าง Business Knowledge เริ่มต้นและเสนอสิ่งที่ควรเติม
3. Background Research หาเทรนด์, คำถามลูกค้า, คู่แข่งและโอกาสตามธุรกิจ
4. ผู้ใช้เลือก Suggestion และเป้าหมายของโพสต์
5. ระบบสร้าง Facebook/Instagram variants และตรวจคุณภาพ
6. ผู้ใช้แตะปรับ เช่น “สั้นลง”, “เป็นกันเองขึ้น”, “ขายน้อยลง”
7. เลือกหรือเพิ่มรูป/วิดีโอจาก Asset Library
8. ถ้าเปิด Approval ให้ส่งตรวจ; ถ้าปิด Approval ไปขั้นตั้งเวลาได้เลย
9. ตั้งเวลาใน Content Calendar และสร้าง Publish Job แยกต่อ channel
10. ระบบ Publish แบบ background, retry อย่างปลอดภัยและแจ้งผล
11. ระบบเก็บ Content Metrics พื้นฐานเพื่อใช้ปรับ Suggestion รอบถัดไป

---

## 5. Development Phases

ช่วงเวลาเป็นกรอบสำหรับผู้พัฒนาหลักหนึ่งคน รวมเวลาทดสอบ แต่ไม่รวมเวลารอ Meta App Review ซึ่งต้องเริ่มตั้งแต่ Phase 0

### Phase 0 — Validation และ Delivery Foundation (2–3 สัปดาห์)

**เป้าหมาย:** ลดความเสี่ยงก่อนสร้างระบบเต็ม และเตรียมทางออก Production ที่ปลอดภัย

ส่งมอบ:

- สัมภาษณ์ SME เป้าหมายอย่างน้อย 8–12 รายจาก 2–3 Industry
- เลือก Beachhead Industry 1–2 กลุ่มสำหรับ Pilot
- ทดสอบ Prototype บนมือถือ: Onboarding, Suggestion, Create, Approval, Calendar, Asset Library
- นิยาม Content Quality Rubric ภาษาไทยและชุดตัวอย่างดี/ไม่ดี
- สร้าง Meta Developer App, Permissions plan และเริ่ม App Review preparation
- ตั้ง repository, environments, CI, migration workflow, logging และ secrets policy
- นิยาม pricing hypothesis, quota และ cost ledger

**Exit criteria:** มี Pilot ที่ยืนยันเข้าร่วมอย่างน้อย 5 Workspace, Prototype ผ่าน usability test และ Meta permission path ชัดเจน

### Phase 1A — Tenant, Business และ Meta Foundation (3–4 สัปดาห์)

**เป้าหมาย:** ผู้ใช้เข้าใช้ระบบและแยกข้อมูลหลาย Workspace/Business/Page ได้ถูกต้อง

ส่งมอบ:

- Authentication, Workspace, Membership และ Role
- Business Profile, Page Context และ Knowledge isolation
- Admin เปิด/ปิด Approval
- เชื่อม Facebook Page + Instagram Professional หลายบัญชี
- Mobile navigation, Thai localization และ onboarding แบบเลือก
- RLS, audit log และ credential vault

**Exit criteria:** Automated isolation tests ผ่านทุก Role และผู้ใช้ Pilot เชื่อมบัญชี Meta ได้โดยไม่เห็นศัพท์เทคนิค

### Phase 1B — Research, Suggestion และ Content Analysis (3–4 สัปดาห์)

**เป้าหมาย:** ทุกธุรกิจได้รับไอเดียที่อ้างอิงข้อมูลของตนเองและมีหลักฐานตรวจสอบได้

ส่งมอบ:

- Business Knowledge setup/import และ completeness check
- Industry Pack v1 สำหรับ Beachhead Industry
- Research jobs, evidence capture, freshness และ source trace
- Suggestion feed แยกตาม Business/Page
- วิเคราะห์ Content เดิมและ Quality Rubric
- Background job center และ in-app notification

**Exit criteria:** Suggestion ทุกใบมีเหตุผล, เป้าหมาย, evidence/freshness และไม่เกิด cross-business leakage ใน eval

### Phase 1C — Generate, Quality Gate และ BYOK (3–4 สัปดาห์)

**เป้าหมาย:** สร้าง Content ภาษาไทยที่พร้อมแก้และพร้อมตรวจโดยไม่บังคับเขียน Prompt

ส่งมอบ:

- Facebook/Instagram content variants จาก Content Brief เดียว
- Click-to-refine actions และ regenerate alternative
- Quality Gate: ความชัดเจน, brand fit, factual support, platform fit, CTA และ risk
- Provider-neutral AI router, curated model registry และ Platform AI
- BYOK OpenAI, Anthropic, Gemini และ xAI พร้อม secret validation
- Usage event, quota, cost ceiling, retry/fallback และ error ภาษาไทย

**Exit criteria:** Golden-set eval ผ่านเกณฑ์ที่กำหนด, key ไม่รั่วใน log/browser และงาน AI ทุกงานกลับมาทำต่อได้หลังปิดหน้า

### Phase 1D — Asset Library, Calendar และ Approval (3–4 สัปดาห์)

**เป้าหมาย:** ทีมเตรียมโพสต์พร้อมสื่อและอนุมัติบนมือถือได้ครบ

ส่งมอบ:

- Private Asset Library สำหรับรูป/วิดีโอ, resumable upload และ background processing
- Collection, Tag, Search, duplicate detection, rights และ version pinning
- Content Calendar รายเดือน/สัปดาห์/รายการ โดยไม่พึ่ง drag-and-drop อย่างเดียว
- Draft → Review → Approved workflow และ approval invalidation เมื่อแก้ไข
- Preview ต่อ platform และ platform validation
- Notification สำหรับ upload, generate, review และ schedule

**Exit criteria:** Pilot ทำ flow “เลือกไอเดีย → สร้าง → เพิ่มสื่อ → ส่งตรวจ → ตั้งเวลา” บนจอ 360 px ได้สำเร็จ

### Phase 1E — Meta Publishing และ Production Hardening (3–4 สัปดาห์)

**เป้าหมาย:** Publish Facebook + Instagram ได้เชื่อถือได้และพร้อมเก็บเงินจริง

ส่งมอบ:

- Scheduled publisher แยก job ต่อ social account/platform
- Media/container polling, retry, idempotency, token expiry/reconnect
- Publish status และ actionable notification ภาษาไทย
- Basic content metrics sync
- Billing/subscription, quota notice, usage page และ admin support tools
- Backup/restore drill, incident runbook, PDPA, retention และ deletion flow
- Performance, load, security, mobile และ pilot regression test

**Exit criteria:** Paid Production Beta 5–10 Workspace, publish success/SLA ผ่าน guardrail, restore drill ผ่าน และต้นทุนต่อ Workspaceวัดได้จริง

### Phase 1.5 — Activation, Retention และ Scale for One-person Ops (4–6 สัปดาห์หลัง Beta)

**เป้าหมาย:** ลดงาน Support และเพิ่มอัตราใช้งานซ้ำโดยไม่ขยายทีมเร็วเกินไป

ส่งมอบตามข้อมูลจริง:

- Onboarding checklist และ guided setup ที่ดีขึ้น
- Saved content recipes/industry templates
- Bulk approve/schedule สำหรับมือถือ
- Better content performance feedback loop
- Self-service billing, quota top-up และ credential diagnostics
- Cost anomaly alerts, support diagnostics และ admin impersonation แบบ audited/read-only-first
- R2 backup หรือ storage migration tooling หาก cost/egress แตะ trigger

**Exit criteria:** Active Workspace ใช้ซ้ำต่อเนื่อง, Support time เฉลี่ยอยู่ใน reserve และ gross margin อย่างน้อย 70%

### Phase 2 — Inbox, Lead Attribution และ ROI (6–10 สัปดาห์ หลังพิสูจน์ Phase 1)

**เป้าหมาย:** เชื่อม Content กับบทสนทนาและผลทางธุรกิจสำหรับลูกค้าที่ปิดการขายใน Inbox

Candidate scope:

- Meta webhook ingestion สำหรับ comment/message events ตาม permission ที่ได้รับ
- Conversation/lead inbox แบบ lightweight หรือเชื่อม CRM ที่ลูกค้าใช้อยู่
- Link/UTM/campaign attribution และ manual conversion mark
- Content-assisted conversation และ lead-quality report
- Revenue/Order capture แบบ manual/import ก่อนทำ CRM เต็มรูปแบบ
- ROI report ที่แสดงระดับความมั่นใจ ไม่อ้าง causal attribution เกินหลักฐาน

**Gate ก่อนเริ่ม:** ลูกค้าอย่างน้อย 30% ระบุว่าการพิสูจน์ Inbox/Revenue เป็นเหตุผลสำคัญในการต่ออายุ และ permission/PDPA/support cost ยอมรับได้

### Phase 3 — Expansion หลัง Product-market Signal

- เพิ่ม Industry Pack และ Workflow เฉพาะ vertical
- Agency workflow, client approval portal และ white-label บางส่วน
- Optional OpenRouter adapter และ advanced routing หลังมี demand จริง
- Advanced experiments, content repurposing และ paid campaign readiness
- Storage multi-provider/serving migration เมื่อ economics รองรับ
- เพิ่ม Social channel เฉพาะเมื่อข้อมูลลูกค้าชี้ชัด; LinkedIn ไม่อยู่ใน default roadmap

---

## 6. Release Gates

| Gate | ต้องผ่านก่อน |
|---|---|
| Internal Alpha | Tenant isolation, audit, background job recovery, Thai UI และ core happy path |
| Closed Pilot | Business Knowledge/Research quality eval, mobile usability, Meta sandbox publish และ asset rights gate |
| Paid Beta | Meta permissions, billing/quota, backup restore, PDPA deletion, monitoring และ support runbook |
| General Availability | 30 วัน production data, publish reliability, churn/support/cost อยู่ใน guardrail และไม่มี critical isolation incident |

Feature จะถือว่า “Done” เมื่อมี Product acceptance, authorization test, error state, analytics event, mobile test และ operational visibility ไม่ใช่เพียงหน้า UI ใช้งานได้

---

## 7. Prioritized Feature Backlog

คำย่อ:

- **P0** ต้องมีเพื่อออก Production Beta
- **P1** ควรทำหลัง core เสถียรหรือเมื่อข้อมูล Pilot ยืนยัน
- **P2** Candidate/optimization ไม่ทำก่อนมีสัญญาณชัด
- **Future** เลื่อนไป Phase 2–3

สถานะเริ่มต้นของรายการด้านล่างคือ `Planned` เว้นแต่ระบุเป็น Decision/Out of scope

### A. Account, Workspace และ Team

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| ACC-001 | P0 | 1A | สมัคร/เข้าสู่ระบบ/ออกจากระบบและ recovery แบบภาษาไทย |
| ACC-002 | P0 | 1A | หนึ่ง User อยู่หลาย Workspace และสลับ Workspace ได้ |
| ACC-003 | P0 | 1A | เชิญสมาชิก, ยอมรับคำเชิญ, ถอนสมาชิก |
| ACC-004 | P0 | 1A | Role: owner, admin, editor, approver, viewer |
| ACC-005 | P0 | 1A | Permission enforcement ทั้ง UI, API, Job และ Storage |
| ACC-006 | P0 | 1A | Admin เปิด/ปิด Approval โดยไม่ต้องตั้งค่าทางเทคนิค |
| ACC-007 | P0 | 1A | ห้ามผู้สร้างอนุมัติงานตัวเองโดยค่าเริ่มต้นเมื่อเปิด Approval |
| ACC-008 | P0 | 1A | Audit log สำหรับ role, policy, credential, publish และ delete |
| ACC-009 | P1 | 1.5 | Team activity digest และงานที่ต้องทำวันนี้ |
| ACC-010 | P1 | 1.5 | Bulk member/role management สำหรับ Agency |

### B. Business, Page และ Meta Connection

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| BUS-001 | P0 | 1A | หนึ่ง Workspace มีหลาย Business Profile |
| BUS-002 | P0 | 1A | หนึ่ง Business เชื่อมหลาย Facebook Page/IG account |
| BUS-003 | P0 | 1A | Pair Facebook Page กับ Instagram Professional อย่างถูกต้อง |
| BUS-004 | P0 | 1A | Business/Page switcher แสดงชื่อและรูปที่คนเข้าใจ ไม่แสดง ID |
| BUS-005 | P0 | 1A | Page context override สาขา, กลุ่มลูกค้า, ที่ตั้ง, offer และข้อห้าม |
| BUS-006 | P0 | 1A | OAuth connect/reconnect/disconnect และ permission health |
| BUS-007 | P0 | 1A | Token encryption, rotation และ expiry notification |
| BUS-008 | P0 | 1A | Cross-business/page isolation test ทุก data path |
| BUS-009 | P1 | 1.5 | Import profile/content metadata จาก Page/IG เพื่อลดการพิมพ์ |
| BUS-010 | P2 | 3 | Agency client grouping และ client-facing portal |

### C. Business Knowledge และ Industry Intelligence

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| KNW-001 | P0 | 1A | Business Knowledge: สินค้า, กลุ่มลูกค้า, จุดเด่น, ราคา, tone, claims, CTA |
| KNW-002 | P0 | 1A | Page-level Knowledge override และ inheritance ที่อธิบายได้ |
| KNW-003 | P0 | 1B | Knowledge setup แบบ cards/chips พร้อมค่าแนะนำ |
| KNW-004 | P0 | 1B | Import จากเว็บไซต์, Facebook/IG และเอกสารที่รองรับ |
| KNW-005 | P0 | 1B | Completeness check: บอกเฉพาะข้อมูลที่ควรเติมต่อ |
| KNW-006 | P0 | 1B | Version + approval/audit ของ knowledge สำคัญ |
| KNW-007 | P0 | 1B | Industry Pack v1: topic taxonomy, seasonality, claims/risk, content patterns |
| KNW-008 | P0 | 1B | Evidence/knowledge retrieval filter ด้วย workspace+business+page เสมอ |
| KNW-009 | P1 | 1.5 | Knowledge conflict/freshness warning |
| KNW-010 | P1 | 1.5 | สร้าง Industry Pack ใหม่จาก template โดยไม่แก้ code |
| KNW-011 | P2 | 3 | Industry expert review workflow และ pack marketplace |

### D. Research และ Suggestion

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| RSH-001 | P0 | 1B | Background research แยกตาม Business/Page/Industry |
| RSH-002 | P0 | 1B | Research brief: objective, audience, time window และ source policy |
| RSH-003 | P0 | 1B | Evidence capture: URL/source, snippet/summary, retrieved_at และ freshness |
| RSH-004 | P0 | 1B | Suggestion feed ชื่อไทยง่าย พร้อม “ทำไมจึงแนะนำ” |
| RSH-005 | P0 | 1B | Suggestion filters แบบเลือก: เป้าหมาย, สินค้า, กลุ่มลูกค้า, ช่วงเวลา |
| RSH-006 | P0 | 1B | Reject/save/use suggestion และเก็บ feedback ปรับลำดับ |
| RSH-007 | P0 | 1B | ห้าม suggestion อ้างข้อเท็จจริงที่ไม่มี evidence หรือ knowledge รองรับ |
| RSH-008 | P0 | 1B | Freshness/expiry และ re-research job |
| RSH-009 | P1 | 1.5 | Competitor/content gap overview ที่ไม่คัดลอกเนื้อหา |
| RSH-010 | P1 | 1.5 | Seasonal Thai calendar และ local-event suggestions |
| RSH-011 | P2 | 3 | Scheduled recurring research ต่อธุรกิจและ digest |

### E. Content Analysis และ Quality

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| QLT-001 | P0 | 1B | วิเคราะห์ Content เดิมตาม Thai quality rubric |
| QLT-002 | P0 | 1C | Quality dimensions: clarity, audience fit, brand fit, evidence, platform fit, CTA, risk |
| QLT-003 | P0 | 1C | แสดง “จุดที่ควรปรับก่อนโพสต์” พร้อม action ไม่แสดงคะแนนลอยๆ อย่างเดียว |
| QLT-004 | P0 | 1C | Fact/claim trace กลับไปยัง knowledge/evidence |
| QLT-005 | P0 | 1C | Restricted claims และ risky phrase rules ต่อ Industry |
| QLT-006 | P0 | 1C | Facebook/Instagram media/caption validation |
| QLT-007 | P0 | 1C | Quality gate ก่อนส่งอนุมัติและก่อน schedule |
| QLT-008 | P1 | 1.5 | Learn from user edits/approvals แบบไม่ปะปนข้าม Business |
| QLT-009 | P1 | 1.5 | Compare versions และอธิบายสิ่งที่เปลี่ยน |
| QLT-010 | P2 | 3 | Industry-specific human benchmark/eval expansion |

### F. Content Generation และ Editing

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| GEN-001 | P0 | 1C | สร้างจาก Suggestion/Brief/Knowledge ไม่ใช้ Prompt เปล่าเป็น default |
| GEN-002 | P0 | 1C | Shared source content + Facebook/Instagram variants |
| GEN-003 | P0 | 1C | Caption, CTA, hashtag และ media brief ตาม platform |
| GEN-004 | P0 | 1C | Quick actions: สั้นลง, เป็นกันเองขึ้น, ขายน้อยลง, เน้นจุดเด่น, เปลี่ยนคำชวน |
| GEN-005 | P0 | 1C | “สร้างอีกแบบ” โดยเก็บ version และไม่ทับฉบับเดิม |
| GEN-006 | P0 | 1C | Optional details สำหรับผู้ใช้ที่ต้องการพิมพ์เพิ่ม แต่ไม่บังคับ |
| GEN-007 | P0 | 1C | Draft autosave, version history และ restore |
| GEN-008 | P0 | 1C | Generation result เปิดดูภายหลังได้และมี cost/job trace ภายใน |
| GEN-009 | P1 | 1.5 | Saved recipe เช่น โปรโมชัน, ให้ความรู้, รีวิว, behind the scenes |
| GEN-010 | P1 | 1.5 | Repurpose post ที่ดีเป็นหลาย format |
| GEN-011 | P2 | 3 | AI-assisted creative brief สำหรับภาพ/วิดีโอ |

### G. AI Provider, BYOK และ Cost Control

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| AI-001 | P0 | 1C | Provider-neutral orchestration contract |
| AI-002 | P0 | 1C | Platform AI แบบ Auto (แนะนำ) |
| AI-003 | P0 | 1C | BYOK: OpenAI API, Anthropic Claude, Google Gemini, xAI Grok |
| AI-004 | P0 | 1C | Model registry เฉพาะ model ที่ผ่าน capability/cost/Thai eval |
| AI-005 | P0 | 1C | Admin เลือก model ต่อ Research/Analyze/Generate/Review ได้ใน Advanced settings |
| AI-006 | P0 | 1C | Key encryption, masked display, validation, revoke และไม่ส่งกลับ browser |
| AI-007 | P0 | 1C | Retry/fallback/circuit breaker พร้อม idempotency |
| AI-008 | P0 | 1C | Per-job cost ceiling, workspace quota และ usage ledger |
| AI-009 | P0 | 1C | ระบุชัดว่า Platform หรือลูกค้าเป็นผู้จ่ายค่า AI |
| AI-010 | P1 | 1.5 | Provider/model health dashboard สำหรับ Admin |
| AI-011 | P2 | 3 | OpenRouter adapter เมื่อมีลูกค้าต้องการหรือ routing benefit ชัด |

### H. Background Jobs และ Notification

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| JOB-001 | P0 | 1B | Research/Analyze/Generate/Review เป็น background |
| JOB-002 | P0 | 1D | Upload/media processing เป็น background |
| JOB-003 | P0 | 1E | Schedule/publish/metrics sync เป็น durable background jobs |
| JOB-004 | P0 | 1B | ผู้ใช้ออกจากหน้า/ปิด browser แล้วงานทำต่อ |
| JOB-005 | P0 | 1B | Job Center ใช้คำว่า “กำลังเตรียม/พร้อมแล้ว/ต้องทำอีกนิด” |
| JOB-006 | P0 | 1B | In-app notification + unread state + deep link ไปยังสิ่งที่เสร็จ |
| JOB-007 | P0 | 1B | Retry, timeout, lease, dead-letter และ recovery tools |
| JOB-008 | P0 | 1B | Cancel/retry เฉพาะงานที่ปลอดภัยและไม่สร้างผลซ้ำ |
| JOB-009 | P1 | 1.5 | Email/LINE notification preference หลัง Pilot ยืนยันช่องทาง |
| JOB-010 | P1 | 1.5 | Batch generation/schedule progress |

### I. Asset Library

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| AST-001 | P0 | 1D | Private image/video library แยก Business; Page restriction optional |
| AST-002 | P0 | 1D | ถ่าย/เลือกจากมือถือและ resumable direct upload |
| AST-003 | P0 | 1D | Validate signature/MIME/size/duration/dimensions จาก bytes จริง |
| AST-004 | P0 | 1D | Background thumbnail, poster, metadata และ platform derivatives |
| AST-005 | P0 | 1D | Grid/search/filter แบบ chips และ collection/tag |
| AST-006 | P0 | 1D | Immutable asset versions; Content pin เวอร์ชันที่ใช้จริง |
| AST-007 | P0 | 1D | Duplicate detection ด้วย hash และตัวเลือกใช้ของเดิม |
| AST-008 | P0 | 1D | Rights/license/consent/paid-ads/expiry และ proof attachment |
| AST-009 | P0 | 1D | Used-by references ก่อนลบ; trash/restore/purge |
| AST-010 | P0 | 1D | Signed read URL; ห้าม public bucket/direct listing |
| AST-011 | P0 | 1E | Storage bytes/egress/operation/processing cost ledger |
| AST-012 | P0 | 1E | Original backup + checksum + restore drill |
| AST-013 | P1 | 1.5 | Smart tags/caption suggestions หลัง quality/privacy eval |
| AST-014 | P1 | 1.5 | Bulk select/move/tag/delete บนมือถือ |
| AST-015 | P2 | 3 | R2 serving/migration เมื่อ cost trigger ผ่าน |

### J. Content Calendar และ Approval

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| CAL-001 | P0 | 1D | Month/week/list calendar พร้อม timezone Asia/Bangkok |
| CAL-002 | P0 | 1D | Filter Business/Page/channel/status |
| CAL-003 | P0 | 1D | สร้าง/ย้ายเวลาโดยใช้ date-time picker; drag เป็นทางเสริมเท่านั้น |
| CAL-004 | P0 | 1D | Duplicate/reschedule/cancel และ conflict warning |
| CAL-005 | P0 | 1D | Content status: draft, in_review, changes_requested, approved, scheduled, publishing, published, failed |
| APR-001 | P0 | 1D | ส่งตรวจ, อนุมัติ, ขอแก้ พร้อม comment |
| APR-002 | P0 | 1D | Approval policy เปิด/ปิดใน Admin UI |
| APR-003 | P0 | 1D | แก้ content/media หลังอนุมัติแล้ว invalidates approval |
| APR-004 | P0 | 1D | Preview แยก Facebook/Instagram ก่อนตัดสินใจ |
| APR-005 | P1 | 1.5 | Bulk approve/schedule และ reminder |
| APR-006 | P2 | 3 | External client approval link/portal |

### K. Meta Publishing และ Metrics

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| PUB-001 | P0 | 1E | Publish job แยกต่อ Facebook Page/Instagram account |
| PUB-002 | P0 | 1E | Immediate และ scheduled publish |
| PUB-003 | P0 | 1E | Image/video/carousel ที่ Meta API และ app permissions รองรับ |
| PUB-004 | P0 | 1E | Idempotency ป้องกันโพสต์ซ้ำจาก retry |
| PUB-005 | P0 | 1E | Container/media readiness polling และ timeout handling |
| PUB-006 | P0 | 1E | Token/permission failure มี reconnect action ภาษาไทย |
| PUB-007 | P0 | 1E | Partial success: Facebook สำเร็จแม้ Instagram ล้มเหลว |
| PUB-008 | P0 | 1E | Published URL/remote ID เก็บภายในและลิงก์ “ดูโพสต์จริง” |
| MET-001 | P0 | 1E | Basic delivery/content metrics sync เท่าที่ permission รองรับ |
| MET-002 | P1 | 1.5 | Performance feedback กลับเข้า Suggestion โดยแยก Business |
| MET-003 | P1 | 1.5 | Content/format comparison โดยไม่สรุป causal ROI เกินข้อมูล |
| MET-004 | Future | 2 | Inbox/conversation/lead/revenue attribution |

### L. Non-tech Thai UX และ Mobile

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| UX-001 | P0 | ทุก Phase 1 | Default language th-TH และ timezone Asia/Bangkok |
| UX-002 | P0 | ทุก Phase 1 | ไม่แสดง code, JSON, provider error, token, queue, model ID ใน Core UI |
| UX-003 | P0 | 1A | Mobile bottom nav ไม่เกิน 5 รายการ |
| UX-004 | P0 | ทุก Phase 1 | Core action touch target ประมาณ 44 px และรองรับ 360 px |
| UX-005 | P0 | ทุก Phase 1 | ไม่มี Core Flow ที่ต้อง hover, drag หรือ desktop เท่านั้น |
| UX-006 | P0 | 1A–1D | คลิก/เลือกก่อน; ไม่มี required prompt หลัง onboarding |
| UX-007 | P0 | ทุก Phase 1 | Empty/loading/success/error มี next action ชัดเจน |
| UX-008 | P0 | 1A | Progressive disclosure: BYOK/model/quota อยู่ Admin > ขั้นสูง |
| UX-009 | P0 | 1D | Preview และ approval ใช้งานมือเดียวบนมือถือได้ |
| UX-010 | P0 | 1E | Responsive Web เป็นช่องทางแรก; installable/PWA เป็น optional |
| UX-011 | P1 | 1.5 | Accessibility audit และ assistive-tech fixes |
| UX-012 | P1 | 1.5 | Contextual help/video ภาษาไทยแบบสั้น |

### M. Billing, Admin, Security และ Operations

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| BIL-001 | P0 | 1E | Plan/subscription/payment status และ grace period |
| BIL-002 | P0 | 1E | Quota สำหรับ AI/Research/Storage/Business/Social account/User ตามแพ็กเกจ |
| BIL-003 | P0 | 1E | Usage 80% warning และ hard-stop ที่ไม่ทำให้ข้อมูลหาย |
| BIL-004 | P1 | 1.5 | Top-up/upgrade/downgrade/cancel self-service |
| OPS-001 | P0 | 1E | Admin workspace health, failed jobs และ Meta credential health |
| OPS-002 | P0 | 1E | Usage/cost ledger ต่อ Workspace/Business/Job/Provider |
| OPS-003 | P0 | 1E | Monthly Storage Cost Review และ anomaly alert |
| OPS-004 | P0 | 1E | Structured logs, traces, error tracking และ audit |
| OPS-005 | P0 | 1E | Backup/restore, incident runbook และ status communication |
| SEC-001 | P0 | 1A–1E | RLS, least privilege, secret vault, signed URLs และ rate limit |
| SEC-002 | P0 | 1E | PDPA consent/privacy/export/delete/retention flow |
| SEC-003 | P0 | 1E | Upload security, malware/content checks ตาม risk level |
| SEC-004 | P1 | 1.5 | Admin support access แบบ audited และ time-limited |
| OPS-006 | P1 | 1.5 | Automated support diagnostic bundle ที่ไม่มี secret |

### N. Future Lead/ROI และ Expansion

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| ROI-001 | Future | 2 | Meta message/comment webhook ingestion ตาม permission |
| ROI-002 | Future | 2 | Conversation-to-content association ด้วย attribution window |
| ROI-003 | Future | 2 | Manual mark: lead qualified / won / revenue |
| ROI-004 | Future | 2 | Link/UTM/campaign tracking |
| ROI-005 | Future | 2 | CRM/export integration ก่อนสร้าง CRM เต็ม |
| ROI-006 | Future | 2 | Assisted ROI report พร้อม confidence/unknown bucket |
| EXP-001 | P2 | 3 | Agency workspace/client approval/white-label |
| EXP-002 | P2 | 3 | Additional industry packs |
| EXP-003 | P2 | 3 | New social channel เมื่อมี demand evidence |
| EXP-004 | Out | — | LinkedIn ไม่อยู่ในแผนเริ่มต้น |

### O. Modular Platform และ Plug-and-Play

| ID | Pri | Phase | Feature / Acceptance |
|---|---:|---|---|
| MOD-001 | P0 | 1A | Module registry + versioned manifest/capability contract |
| MOD-002 | P0 | 1A | Tenant Context envelope สำหรับ command/query/job/event ทุก Module |
| MOD-003 | P0 | 1A | Table/migration owner และกฎห้าม direct cross-module write |
| MOD-004 | P0 | 1B | Versioned event envelope, outbox, idempotent consumer และ correlation |
| MOD-005 | P0 | 1C | AI/Research adapters ผ่าน shared contract test |
| MOD-006 | P0 | 1D | Storage/Media adapters ผ่าน shared contract test |
| MOD-007 | P0 | 1E | Social Publisher adapter และ capability validation |
| MOD-008 | P0 | 1E | Module-level usage/cost/health/kill switch/feature policy |
| MOD-009 | P1 | 1.5 | Module diagnostic dashboard และ safe rollout per Workspace |
| MOD-010 | P2 | 3 | Runtime third-party plugin sandbox เฉพาะเมื่อมี business case/security model ชัด |

---

## 8. Backlog ที่ต้องไม่แอบขยายเข้า Phase 1

- Unified social inbox หรือ CRM เต็มรูปแบบ
- Lead scoring, order management และ revenue attribution
- Ad campaign buying/optimization
- LinkedIn และช่องทาง social อื่น
- Full graphic/video editor แบบ Canva/CapCut
- Public asset CDN หรือ multi-cloud active-active
- Open model marketplace ที่ให้เลือกทุก model โดยไม่คัดกรอง
- Workflow builder แบบเขียน code หรือ node graph สำหรับผู้ใช้ปลายทาง
- Desktop-only power features ที่ทำลาย Mobile Core Flow

การเพิ่มรายการข้างต้นเข้า Phase 1 ต้องตัด P0 เดิมออกในขนาดใกล้เคียงและผ่าน Product/Cost/Support review

---

## 9. One-person Delivery Rules

1. WIP ไม่เกินหนึ่ง Vertical Slice หลักและหนึ่งงาน maintenance พร้อมกัน
2. ทุก Slice ต้องเดินครบ UI → API → Data → Job → Notification → Observability → Test
3. ใช้ Modular Monolith และ shared contracts; ยังไม่แยก Microservice โดยไม่มีเหตุผลด้าน scale/failure
4. ใช้ managed service ในส่วนที่ไม่สร้างความแตกต่างทางธุรกิจ
5. Pilot จำกัด Industry, Workspace, Page และ quota เพื่อลด support variance
6. Feature flag ทุก capability ที่มี risk สูง เช่น BYOK provider ใหม่, video format และ research source ใหม่
7. Support เป็น async พร้อม diagnostic ที่ผู้ใช้กดส่งได้; ไม่มี SLA แบบ enterprise ใน Beta
8. Bug isolation/security/data-loss/publish-duplicate มาก่อน feature ใหม่เสมอ

### Capacity allocation หลังเปิด Beta

- 50% Reliability, bug และ support reduction
- 30% Activation/retention ที่วัดจากข้อมูลจริง
- 20% Backlog experiment

---

## 10. Definition of Ready / Done

### Definition of Ready

- ระบุ User, pain, expected behavior และ non-goal
- มี acceptance criteria ภาษาไทยที่ Product ตรวจได้
- ระบุ Business/Page scope และ Role ที่ใช้ได้
- ระบุ async/error/notification state ถ้ามีงาน background
- มี cost, quota, privacy และ support impact
- มี mobile wireframe สำหรับ core interaction

### Definition of Done

- Happy path และ recoverable failure path ทำงานจริง
- RLS/authorization และ cross-business tests ผ่าน
- Mobile 360/390/430 px และ desktop responsive ผ่าน
- ผู้ใช้ไม่เห็นศัพท์เทคนิคหรือ raw provider error
- Analytics/usage/cost/audit events ถูกบันทึก
- Retry/idempotency/backfill/runbook พร้อมเมื่อเกี่ยวข้อง
- Migration rollback/forward-fix และ backup impact ถูกตรวจ
- Documentation และ backlog status อัปเดตใน PR/Release เดียวกัน

---

## 11. Backlog Operating Process

- Product backlog นี้เป็นรายการกลาง; ห้ามเก็บ requirement สำคัญไว้เฉพาะแชตหรือ issue ที่ไม่มีลิงก์กลับ
- ทุกสัปดาห์: triage bug, support, cost anomaly และ dependency
- ทุกสองสัปดาห์: เลือก Slice ถัดไปจาก P0/P1 โดยใช้ Pilot evidence
- ทุกเดือน: ตรวจ Storage/AI/Search/Support cost และปรับ quota/priority
- เมื่อจบ Phase: ทำ release review เทียบ Exit criteria ไม่ใช่เทียบจำนวน feature
- Feature ใหม่ต้องมี ID, priority, phase, acceptance และเหตุผลก่อนเข้าคิว
- รายการที่ไม่มี evidence หลังสอง review cycles ย้ายไป Icebox ไม่ปล่อยให้แย่ง WIP

---

## 12. Immediate Next Build Queue

ลำดับลงมือที่แนะนำหลังยืนยันเอกสารนี้:

1. Migration 001: Workspace, Membership, Business, Page Context และ RLS test harness
2. Meta connection spike และ permission/app-review checklist
3. Background job/outbox/notification skeleton
4. Business Knowledge schema + onboarding แบบเลือก
5. Research Evidence + Suggestion vertical slice
6. Content Brief + Generation + Quality Gate vertical slice
7. Asset schema/upload/processing + mobile library
8. Approval + Calendar + platform preview
9. Meta publish + retry/idempotency + reconnect
10. Billing/quota/cost ledger + production hardening

---

## 13. Linked Detailed Plans

- `ai-content-os-execution-master-plan-th.md` — Execution Source of Truth สำหรับ Agent ownership, Dependency, Gates, dispatch waves และ merge protocol
- `execution-wbs-and-parallel-delivery-th.md` — WBS W0–W7, Task ID, estimate, critical path และ agent assignment
- `core-database-and-rls-workstream-th.md` — Canonical core schema, migration 000–180 และ RLS/test matrix
- `module-contracts-events-jobs-workstream-th.md` — Tenant/API/Event/Job/Adapter contracts, outbox/idempotency และ contract kits
- `ux-quality-industry-workstream-th.md` — Mobile UX, design system, screen states, Golden Set และ Industry Packs
- `meta-security-production-ops-workstream-th.md` — Meta, PDPA, Billing/Tax, Infra, SLO, DR, incident และ Production readiness
- `gap-register-and-agent-governance-th.md` — Gap register, unsafe parallel work, ownership และ merge cadence
- `technical-architecture-meta-content-os-th.md` — Technical architecture, stack, security, AI routing, publishing, cost และ pricing
- `asset-library-database-ux-spec-th.md` — Asset database schema, mobile wireframe contract และ upload/processing state machine
- `modular-plug-and-play-design-rules-th.md` — Architecture Constitution สำหรับ module/adapter contract, ownership, event และ scale path

เมื่อมีการเปลี่ยน Locked Product Decision, Phase boundary หรือ P0 backlog ต้องอัปเดตเอกสารนี้พร้อมเอกสารรายละเอียดที่ได้รับผลกระทบในรอบเดียวกัน
