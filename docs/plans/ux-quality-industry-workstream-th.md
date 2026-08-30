# Execution Workstream: Thai Mobile UX, Content Quality และ Industry Packs

เอกสารนี้แตกงานระดับพร้อมมอบหมายให้ Sub-agent สำหรับ AI Content OS ของ SME ไทย โดยครอบคลุม UX สำหรับผู้ใช้ Non-tech บนมือถือ, Design System, Screen/State Inventory, Usability Testing, Content Quality Evaluation, Golden Set และ Industry Pack สองกลุ่มแรก

> สถานะเอกสาร: Execution Baseline v1.0
>
> วันที่: 30 สิงหาคม 2026
>
> ขอบเขต Phase 0–1E: Facebook + Instagram, Responsive Web, ภาษาไทย, หลาย Workspace/Business/Page, Approval เปิด/ปิดได้

---

## 1. ผลลัพธ์ที่ Workstream นี้ต้องสร้าง

เมื่อจบ Phase 1E ต้องพิสูจน์ได้ว่า:

1. ผู้ใช้ SME ไทยที่ไม่ถนัดเทคนิคทำ Core Flow บนจอ 360 px ได้โดยไม่ต้องเขียน Prompt
2. ทุกหน้ามีสถานะ Empty, Loading/Background, Ready, Partial, Error และ Recovery ที่เข้าใจได้
3. นักพัฒนาหลายคนสร้างหน้าจอพร้อมกันได้จาก Design Token, Component Contract และ Interaction Pattern ชุดเดียว
4. Content Quality ไม่ได้อาศัยความรู้สึกหรือ AI Judge ตัวเดียว แต่มี Rubric, deterministic rules, evidence checks และ Golden Set ที่คนไทยตรวจแล้ว
5. ความรู้เฉพาะอุตสาหกรรมติดตั้ง/อัปเดต/ปิดใช้งานได้เป็น Versioned Industry Pack โดยไม่แก้ Core Business Logic
6. Interior/Built-in Pack พร้อมใช้กับ Pilot หลัก และ Skincare Pack พร้อมทดสอบระบบ Claim/Risk ที่เข้มกว่า
7. Requirement, Design, Copy, Test Case และ Eval ทุกชิ้นมี ID และ Trace กลับไปยัง Release Gate ได้

## 2. กฎที่ล็อกแล้ว

- UI เริ่มต้นเป็น `th-TH`; วันเวลาใช้ `Asia/Bangkok`
- Bottom navigation ไม่เกิน 5 รายการ: หน้าแรก, สร้าง, ปฏิทิน, คลังรูปและวิดีโอ, เพิ่มเติม
- Core UI ห้ามแสดง Prompt, JSON, API, Token, Queue, Model ID, Provider Error หรือศัพท์ระบบภายใน
- Core Flow ต้องทำได้ที่ 360 px, ไม่มี horizontal overflow, touch target สำคัญอย่างน้อย 44×44 px
- ห้ามบังคับ Hover, Drag-and-drop, Desktop หรือการพิมพ์ข้อความยาว; Drag เป็นทางเสริมเท่านั้น
- ทุก Background Job ต้องออกจากหน้าได้ ทำงานต่อ และแจ้งเมื่อเสร็จ
- Workspace มีหลาย User; Approval เปิด/ปิดได้โดย Admin
- Business Knowledge แยกตาม Business และมี Page override ที่จำกัดขอบเขต
- Facebook และ Instagram เป็นช่องทาง Production Beta; LinkedIn ไม่อยู่ใน Phase 1
- คำแนะนำต้องมาจาก Business/Page Knowledge + Industry Pack + Evidence ที่ตรวจสอบได้
- Industry Pack ชั้นล่างห้ามลดความเข้มของ Hard Safety Rule ชั้นบน
- Pack และ Rubric ทุกเวอร์ชันต้อง Pin ลง Content/Research/Review เพื่อ Reproduce ผลเดิมได้

---

## 3. Dependency Contract กับ Workstream อื่น

งานกลุ่มนี้ทำคู่ขนานได้ แต่ต้องรับ Contract ต่อไปนี้ก่อนเริ่ม Implementation จริง:

| Contract ID | เจ้าของหลัก | สิ่งที่ต้องส่งให้ Workstream นี้ | ใช้โดย |
|---|---|---|---|
| CORE-TENANT-v1 | Core Database | Workspace, membership, role, business, page context และ permission matrix | ทุก Flow |
| CORE-CONTENT-v1 | Content Domain | Content item/version/variant/status และ approval invalidation | Create, Quality, Approval, Calendar |
| CORE-JOB-v1 | Job Platform | Job status, progress, retryability, user-safe error code และ deep link | Research, Generate, Upload, Publish |
| CORE-EVENT-v1 | Platform Kernel | Event envelope, version, tenant context, idempotency key | Notification และ Analytics |
| CORE-KNOWLEDGE-v1 | Knowledge Domain | Industry/Business/Page inheritance, version pin และ evidence reference | Research, Generate, Quality |
| CORE-PACK-v1 | Industry Runtime | Pack registry, install, activate, upgrade, rollback และ validation result | Industry Pack UI/Eval |
| CORE-META-v1 | Meta Adapter | Account capability, media validation, publish state และ reconnect action | Onboarding, Preview, Publish |
| CORE-ASSET-v1 | Asset Domain | Asset state, rights state, processing state และ selectable derivative | Asset Picker/Create/Publish |

**กฎป้องกัน Sub-agent ชนกัน:** Agent ฝั่ง UX ห้ามสร้าง enum/domain status ใหม่ในหน้าจอเอง ถ้า Contract ยังไม่ล็อก ให้ใช้ `TBD-CONTRACT` ใน Spec และแจ้งเจ้าของ Contract; ห้ามฝังค่าเฉพาะหน้าแล้วปล่อยให้ Backend ไล่ตาม

---

## 4. Phase และ Release Gate ของ Workstream

| Phase | เป้าหมาย | Exit Gate |
|---|---|---|
| Phase 0 | ล็อกภาษา, Information Architecture, Rubric v1, Pack Schema v1 และ Prototype เสี่ยงสูง | ผู้ใช้เป้าหมาย 5 คนทำ Prototype Core Flow สำเร็จ ≥80%; Critical terminology confusion = 0 |
| Phase 1A | Shell, Navigation, Onboarding, Workspace/Business/Page/Team | ผู้ใช้เชื่อม Business/Page และชวนทีมได้โดยไม่เห็นศัพท์เทคนิค; 360 px test ผ่าน |
| Phase 1B | Knowledge, Research/Suggestion, Analysis, Job Center | Suggestion มีเหตุผล/หลักฐาน; Job ทำต่อหลังปิดหน้า; no cross-business context leak |
| Phase 1C | Create, Quick Refine, Quality Gate, Advanced AI/BYOK | Golden Set ผ่าน threshold; Core Create ไม่ต้องพิมพ์; Advanced setting ไม่รบกวน Core UI |
| Phase 1D | Asset, Calendar, Approval และ Preview | Flow เลือกไอเดีย→สร้าง→สื่อ→ส่งตรวจ→ตั้งเวลา สำเร็จบน 360 px ≥85% |
| Phase 1E | Publish, Recovery, Usage/Billing และ Production UX Hardening | Pilot publish/recovery ได้; Sev-1 usability/accessibility = 0; regression/eval gate ผ่าน |

---

## 5. Parallel Execution Map

### Wave 0 — ล็อก Contract ร่วมกัน

ทำพร้อมกันได้ 4 Agent:

- Agent UX-A: UX principles, persona/JTBD, terminology และ Information Architecture (`UXF-*`)
- Agent DS-A: Design tokens, components, responsive/accessibility contract (`DS-*`)
- Agent QLT-A: Quality rubric, taxonomy, annotation guide (`QLT-*`)
- Agent IPK-A: Industry Pack schema, validator, lifecycle contract (`IPK-*`)

Merge Gate W0: `UXF-004`, `DS-003`, `QLT-004`, `IPK-004` approved ก่อนแตก Screen/Golden Set จำนวนมาก

### Wave 1 — แตกงานตาม Domain

ทำพร้อมกันได้ 6 Agent โดยไม่แก้ไฟล์เดียวกัน:

- Agent UX-B1: Auth/Onboarding/Home/Business/Team
- Agent UX-B2: Knowledge/Research/Suggestion/Job Center
- Agent UX-B3: Create/Quality/Approval
- Agent UX-B4: Asset/Calendar/Publish/Recovery
- Agent QLT-B: Golden Set + Eval Harness specification
- Agent IPK-B: Interior/Built-in Pack v1

Skincare Pack เริ่มหลัง `IPK-004` และ `QLT-004`; ทำขนานกับ Interior ได้ แต่ต้องมี Reviewer ด้าน Claim/Risk แยก

### Wave 2 — Prototype, Test และ Implementation Handoff

- UX Prototype Agent รวม Screen Spec ผ่าน Component Contract เท่านั้น
- Research Agent เตรียม Screener/Task Script/Test Data
- QA Agent แปลง Acceptance Criteria เป็น Component, Integration และ E2E Test
- Quality QA รัน Golden Set แบบ Blind และสร้าง Baseline Report
- Industry QA ตรวจ Pack Compatibility/Upgrade/Rollback และ Cross-pack leakage

Merge Gate W2: ห้ามเริ่มทำ Production UI ของ Flow ที่ยังไม่มี Screen ID, State Matrix, Analytics Event, Error Recovery และ Accessibility Acceptance

---

# PART A — NON-TECH THAI MOBILE UX

## 6. UX Foundation Tasks

| ID | Phase | งาน | Dependencies | Deliverable | Acceptance Criteria | Parallel |
|---|---|---|---|---|---|---|
| UXF-001 | 0 | สรุป Primary Persona และ JTBD: เจ้าของ, ผู้ทำ Content, ผู้อนุมัติ, Viewer | — | Persona card + top tasks + anxiety points | ทุก Persona มี goal, trigger, success, failure fear, device/context; ผ่านสัมภาษณ์ ≥5 ราย | ได้ |
| UXF-002 | 0 | สร้าง Thai Terminology Dictionary | UXF-001 | Source-of-truth glossary | มี user term, internal term, คำห้าม, helper copy; Reviewer ไทย 2 คนเห็นตรงกัน ≥90% | ได้ |
| UXF-003 | 0 | สร้าง Navigation/Information Architecture | UXF-001, UXF-002 | Sitemap desktop/mobile + object map | Core Task เข้าถึงภายใน ≤3 decision steps; Bottom nav ≤5; Business/Page context มองเห็นชัด | ได้ |
| UXF-004 | 0 | ล็อก UX Product Contract | UXF-002, UXF-003 | Versioned UX contract v1 | ครอบคลุม click-first, mobile, job continuation, error recovery, progressive disclosure และ no-jargon | ไม่ได้; เป็น Merge Gate |
| UXF-005 | 0 | กำหนด Business/Page Context Switcher | CORE-TENANT-v1, UXF-003 | Context behavior spec | เปลี่ยน Business แล้ว content/asset/suggestion ไม่ค้างจาก Business เดิม; ผู้ใช้รู้เสมอว่ากำลังทำให้เพจใด | ได้ |
| UXF-006 | 0 | กำหนด Global Status/Notification Language | CORE-JOB-v1, UXF-002 | Status copy matrix | ทุก Job state map เป็นข้อความไทย+next action; raw error ไม่ปรากฏ; partial success มีรายละเอียดต่อช่องทาง | ได้ |
| UXF-007 | 0 | กำหนด Form Minimization Rules | UXF-004 | Field decision checklist | ทุก required field มีเหตุผล; ใช้ chip/card/default/import ก่อน text; optional detail พับไว้ | ได้ |
| UXF-008 | 0 | กำหนด Mobile Interaction Rules | UXF-004, DS-003 | Gesture/touch/keyboard spec | ทำทุก action ได้ด้วย tap; รองรับ one-handed; keyboard ไม่บัง primary action; no drag-only | ได้ |
| UXF-009 | 1A | Instrumentation Plan ฝั่ง UX | UXF-003, CORE-EVENT-v1 | Event dictionary | Event มี screen, action, outcome, duration, context IDs แบบไม่เก็บ content sensitive เกินจำเป็น | ได้ |
| UXF-010 | 1E | UX Regression Gate | UXF-004, UXT-008 | CI/manual checklist | Core Flow 360/390/768/desktop, light/dark, Thai long text, slow network ผ่านก่อน release | ไม่ได้; Release Gate |

## 7. Design System Tasks

| ID | Phase | งาน | Dependencies | Deliverable | Acceptance Criteria | Parallel |
|---|---|---|---|---|---|---|
| DS-001 | 0 | Token taxonomy | UXF-004 | Color, type, space, radius, elevation, motion, breakpoint tokens | ไม่มี feature ใช้ hard-coded visual value นอก exception; contrast target ระบุครบ | ได้ |
| DS-002 | 0 | Thai typography scale | DS-001 | Font/line-height/truncation rules | อ่านไทยบน 360 px ได้; วรรณยุกต์ไม่ชน; Dynamic text 200% ไม่ทำ Core action หาย | ได้ |
| DS-003 | 0 | Responsive layout contract | DS-001, UXF-008 | Grid/container/safe-area/sticky action spec | ไม่มี overflow ที่ 320–360 px; bottom action ไม่ชน iOS safe area; desktop ไม่ยืดบรรทัดเกินอ่านง่าย | ไม่ได้; Merge Gate |
| DS-004 | 0 | Action components | DS-001 | Button, icon button, FAB, segmented action, menu | ทุก variant มี default/pressed/focus/disabled/loading; touch ≥44 px; label ไม่ใช้ icon อย่างเดียวเมื่อคลุมเครือ | ได้ |
| DS-005 | 0 | Input/selection components | DS-002 | Chip, card select, radio, checkbox, picker, search, optional text | Core selection ใช้ tap; validation ภาษาไทย; ไม่บังคับ placeholder เป็น label | ได้ |
| DS-006 | 0 | Feedback components | UXF-006, DS-001 | Toast, banner, inline error, progress, skeleton, empty state | ทุกสถานะบอก “เกิดอะไร/ต้องทำอะไร”; background progress ออกจากหน้าได้; error มี retry เมื่อปลอดภัย | ได้ |
| DS-007 | 1A | Navigation/context components | UXF-003, UXF-005, DS-003 | Bottom nav, app bar, business/page switcher, breadcrumbs desktop | Context ไม่ถูกซ่อนหลัง icon; จำนวน nav ถูก contract; keyboard/screen reader ใช้ได้ | ได้ |
| DS-008 | 1B | Content/research cards | DS-004, DS-005 | Suggestion, evidence, content, job cards | Card action priority ชัด; evidence/freshness อ่านได้; ไม่ทำทั้ง card clickable ซ้อน button ผิด semantics | ได้ |
| DS-009 | 1C | Editor/quality components | DS-004, DS-006 | Platform tabs, quick-refine chips, issue card, version switcher | แยก FB/IG ชัด; issue ทุกใบมี action; autosave/status ไม่รบกวนการอ่าน | ได้ |
| DS-010 | 1D | Media/calendar/approval components | DS-005, DS-006 | Asset tile/picker, date-time picker, calendar item, approval bar | เลือกสื่อ/วันเวลา/อนุมัติได้มือเดียว; มี list alternative ต่อ calendar drag | ได้ |
| DS-011 | 1E | Component documentation | DS-004–010 | Storybook-equivalent docs + do/don't | ทุก component มี API, states, copy example, a11y note, visual regression case | ทำคู่ implementation |
| DS-012 | 1E | Accessibility audit | DS-011 | Issue report + fixes | WCAG 2.2 AA สำหรับ Core Flow; keyboard/focus/label/error/contrast ผ่าน; Sev-1/2 = 0 | หลังรวม Flow |

## 8. Screen และ State Inventory

ทุก Screen Spec ต้องมี: Screen ID, user goal, roles, entry/exit, required context, primary/secondary action, components, data contract, state matrix, validation, recovery, analytics, accessibility, responsive behavior และ copy key

### 8.1 Global State Matrix บังคับทุกหน้าที่ดึงข้อมูล

| State | สิ่งที่ UI ต้องแสดง | ห้ามทำ |
|---|---|---|
| First-use empty | ประโยชน์ของหน้า + action แรกเพียงหนึ่ง action เด่น | แสดงตารางว่างหรือศัพท์ระบบ |
| User-filtered empty | บอกว่าไม่พบตามตัวเลือก + ล้างตัวกรอง | ทำให้เข้าใจว่าข้อมูลหาย |
| Initial loading | Skeleton ที่คง layout + label เมื่อเกิน 2 วินาที | Spinner เปล่าเต็มหน้าเป็นเวลานาน |
| Background working | สถานะเป็นมิตร, ทำอย่างอื่นได้, ดูในศูนย์งาน | ล็อกหน้าหรือบังคับรอ |
| Ready | ผลลัพธ์ + next best action | กระจาย CTA เท่ากันหลายปุ่ม |
| Partial success | สิ่งที่สำเร็จ/ไม่สำเร็จแยก item/channel + retry เฉพาะส่วน | Rollback สิ่งที่สำเร็จโดยไม่บอก |
| Recoverable error | เหตุผลแบบผู้ใช้เข้าใจ + action แก้/ลองใหม่ | raw provider/API error |
| Permission blocked | บอกผู้ที่ทำได้ + ขอสิทธิ์/กลับ | ปุ่ม disabled โดยไม่มีเหตุผล |
| Offline/slow | ข้อมูลล่าสุดที่ปลอดภัย + reconnect state | บอกว่าสำเร็จก่อน server ยืนยัน |
| Stale/conflict | บอกว่ามีเวอร์ชันใหม่ + compare/reload | ทับข้อมูลเงียบๆ |

### 8.2 Screen Inventory และงานส่งมอบ

| Epic ID | Phase | Screen IDs | หน้าจอ/Flow | Dependencies | Acceptance หลัก | Parallel Group |
|---|---|---|---|---|---|---|
| SCR-001 | 1A | AUTH-01–05 | สมัคร, เข้าใช้, magic/OTP, accept invite, recover session | CORE-TENANT-v1, DS-004–006 | เข้าใช้ด้วยมือถือได้; error ไม่เปิดเผย account; กลับ flow เดิมหลัง login | UX-B1 |
| SCR-002 | 1A | ONB-01–07 | สร้าง Workspace, เลือกประเภทธุรกิจ, เพิ่ม Business, เป้าหมาย, Brand starter, finish | UXF-007, CORE-TENANT-v1 | หลัง onboarding ไม่มี required prompt; ข้าม optional ได้; progress ≤7 steps | UX-B1 |
| SCR-003 | 1A | META-01–08 | เชื่อม Meta, เลือก Page/IG, mapping กับ Business, capability, reconnect | CORE-META-v1, UXF-005 | หลาย Page/IG; อธิบาย permission แบบภาษาคน; partial connection แก้เป็น account | UX-B1 |
| SCR-004 | 1A | HOME-01–04 | หน้าแรก, งานวันนี้, ต้องตรวจ, งานกำลังเตรียม | CORE-JOB-v1, DS-006–008 | ผู้ใช้เห็น next action แรกใน 5 วินาที; context Business/Page ชัด | UX-B1 |
| SCR-005 | 1A | TEAM-01–07 | สมาชิก, เชิญ, role, approval toggle, pending/revoke | CORE-TENANT-v1 | Admin เปิด/ปิด approval; role explanation เป็น task-based; permission blocked มี owner action | UX-B1 |
| SCR-006 | 1A | BIZ-01–08 | ธุรกิจ/เพจ, แก้ข้อมูล, page override, archive/switch | CORE-KNOWLEDGE-v1, UXF-005 | Preview inheritance; ห้ามย้าย Page ข้าม Business โดยไม่ยืนยัน; no leakage | UX-B1 |
| SCR-007 | 1B | KNW-01–10 | ตั้งข้อมูลธุรกิจด้วย cards, import, completeness, source, version/conflict | CORE-KNOWLEDGE-v1, DS-005–008 | พิมพ์ขั้นต่ำ; import preview ก่อนบันทึก; บอกข้อมูลที่ควรเติมไม่ใช้คะแนนลอยๆ | UX-B2 |
| SCR-008 | 1B | IDEA-01–09 | ไอเดียที่เหมาะกับธุรกิจ, filter, detail, เหตุผล, evidence, save/reject/use | IPK-010, QLT-004, CORE-KNOWLEDGE-v1 | ทุก idea มี goal/audience/reason/freshness; use เปิด Create พร้อม context pin | UX-B2 |
| SCR-009 | 1B | ANALYZE-01–06 | เลือกโพสต์เดิม, กำลังวิเคราะห์, ผล, จุดปรับ, นำไปสร้างใหม่ | QLT-004, DS-009 | ปัญหามีเหตุผล+action; ไม่กล่าวอ้าง certainty เกิน evidence | UX-B2 |
| SCR-010 | 1B | JOB-01–06 | ศูนย์งาน, filter, job detail, cancel, retry, finished deep link | CORE-JOB-v1, UXF-006 | ปิดหน้าแล้วงานต่อ; retry ไม่ทำซ้ำ; user-safe status ครบทุก code | UX-B2 |
| SCR-011 | 1B | NOTI-01–04 | กล่องแจ้งเตือน, unread, grouped, preference | CORE-EVENT-v1 | Deep link ถูก Business/Item; mark read sync; ไม่ส่งข้อมูลลับในข้อความ | UX-B2 |
| SCR-012 | 1C | CREATE-01–09 | เลือก Business/Page, เป้าหมาย/ไอเดีย, content type, media intent, generate | SCR-008, CORE-CONTENT-v1 | Core Create ≤3 decision stages; optional detail เท่านั้น; background generate | UX-B3 |
| SCR-013 | 1C | EDIT-01–10 | Editor, FB/IG variants, quick refine, regenerate, autosave, versions | CORE-CONTENT-v1, DS-009 | ไม่ทับ version เดิม; platform difference ชัด; quick action กดย้อนกลับได้ | UX-B3 |
| SCR-014 | 1C | QUALITY-01–08 | จุดที่ควรปรับ, claim trace, hard block, fix, recheck, passed | QLT-010, CORE-KNOWLEDGE-v1 | Hard block ระบุสิ่งต้องแก้; fact ย้อน evidence; no unexplained score | UX-B3 |
| SCR-015 | 1C | AISET-01–08 | Auto mode, BYOK provider/model, validate/revoke, usage | AI Contract, UXF-004 | อยู่ Admin>ขั้นสูง; key ไม่แสดงเต็ม/ไม่กลับ browser; Core User ไม่ต้องเข้า | UX-B3 |
| SCR-016 | 1D | ASSET-01–13 | Library, upload, processing, picker, detail, rights, used-by, trash | CORE-ASSET-v1, DS-010 | ถ่าย/เลือกจากมือถือ; background; rights expiry block; picker คืน version ที่ pin แล้ว | UX-B4 |
| SCR-017 | 1D | APPROVE-01–09 | ส่งตรวจ, inbox, preview FB/IG, comment, approve/request changes | CORE-CONTENT-v1, DS-010 | มือเดียว; เห็น target accounts; แก้หลัง approve ทำ approval หมดผลและอธิบายได้ | UX-B3 |
| SCR-018 | 1D | CAL-01–10 | Agenda/week/month, filter, choose time, move, conflict, cancel | CORE-CONTENT-v1, DS-010 | Mobile default agenda; date-time picker ไม่ต้อง drag; Asia/Bangkok ชัด | UX-B4 |
| SCR-019 | 1E | PUB-01–10 | Schedule confirmation, publishing, per-channel result, retry/reconnect, live URL | CORE-META-v1, CORE-JOB-v1 | FB สำเร็จ/IG fail แสดง partial; retry เฉพาะ failed; ป้องกัน user กดซ้ำ | UX-B4 |
| SCR-020 | 1E | USAGE-01–07 | สิทธิ์เดือนนี้, nearing limit, exhausted, storage, AI payer mode | Entitlement Contract | ใช้หน่วยภาษาคน; บอกผลกระทบและทางเลือก; ไม่เปิด token/infra cost ใน Core UI | UX-B4 |
| SCR-021 | 1E | BILL-01–09 | Plan, subscribe, payment state, invoice/receipt data, grace period | Billing Contract | ราคา/ภาษี/รอบบิลชัด; failed payment recovery; ห้ามปิดข้อมูลก่อน grace notice | UX-B4 |
| SCR-022 | 1E | SUPPORT-01–06 | Help, report problem, diagnostic consent, incident banner | Ops Contract | ส่ง context ที่จำเป็นโดยไม่ส่ง secret/content โดยไม่ยินยอม; ticket ref ภาษาคน | UX-B4 |

### 8.3 Screen Spec Completion Checklist

แต่ละ `SCR-*` ถือว่า Done เมื่อ:

- มี Wireframe 360 px และ Desktop reference
- ครบ Global State Matrix เฉพาะ state ที่เป็นไปได้ พร้อมระบุ N/A พร้อมเหตุผล
- มี Copy Key ภาษาไทย ไม่ฝังข้อความกระจัดกระจาย
- มี Permission matrix ต่อ Role
- มี API/query/command contract reference โดยไม่ออกแบบ Domain ใหม่เอง
- มี Analytics events: view, primary action, success, failure, abandon
- มี keyboard/focus/screen-reader acceptance
- มี Test Data อย่างน้อย happy, empty, slow, recoverable error, permission blocked และ long Thai text
- Product, Design, Engineering และ QA sign-off

---

## 9. Usability Research และ Test Tasks

### 9.1 กลุ่มทดสอบขั้นต่ำ

- เจ้าของ SME 5–7 คนที่ทำการตลาดเอง
- ผู้ทำ Content/Admin 4–6 คน
- หัวหน้า/Approver 3–4 คน
- อย่างน้อย 70% ใช้มือถือเป็นอุปกรณ์หลัก
- อย่างน้อยครึ่งหนึ่งไม่เคยใช้เครื่องมือ AI/Publisher เชิงเทคนิค
- กระจาย Interior/Built-in และ Skincare อย่างน้อยกลุ่มละ 4 คนตลอด Phase 0–1D

### 9.2 Task Backlog

| ID | Phase | งาน | Dependencies | Deliverable | Acceptance Criteria | Parallel |
|---|---|---|---|---|---|---|
| UXT-001 | 0 | Recruitment screener + consent | UXF-001 | Screener, consent, privacy script | ไม่รับเฉพาะ power user; บันทึก device/role/industry โดยไม่เก็บข้อมูลเกินจำเป็น | ได้ |
| UXT-002 | 0 | Baseline workflow interview | UXT-001 | Findings + current journey | ≥8 คน; แยก pain point, workaround, vocabulary, willingness to delegate/approve | ได้ |
| UXT-003 | 0 | Terminology comprehension test | UXF-002, UXT-001 | Comprehension score | คำ Core เข้าใจถูก ≥90%; คำ critical เช่น “ส่งตรวจ/พร้อมโพสต์/โพสต์ไม่สำเร็จ” ผิด = 0 ก่อน lock | ได้ |
| UXT-004 | 0 | Prototype test: onboarding→idea→create | SCR-002, SCR-008, SCR-012 | Video/notes, task metrics, severity log | Success ≥80%, median critical misclick ≤1, no prompt dependency | หลัง prototype |
| UXT-005 | 1B | Prototype test: background job/research recovery | SCR-008–011 | Findings + revisions | ≥80% เข้าใจว่าออกจากหน้าได้; ≥80% กลับมาผลลัพธ์ได้เอง; false “งานหาย” = 0 | ได้ |
| UXT-006 | 1D | Prototype test: asset→approval→calendar | SCR-016–018 | Findings + revisions | Success ≥85%; median completion ≤8 นาทีจาก draft พร้อม; approval intent error = 0 | ได้ |
| UXT-007 | 1E | Prototype test: publish partial failure/reconnect | SCR-019 | Findings + recovery revision | ≥90% ระบุช่องทางที่สำเร็จ/ล้มเหลวถูก; accidental republish = 0 | ได้ |
| UXT-008 | 1E | Pilot usability benchmark | ทุก Core Screen | Benchmark report | Core E2E success ≥85%; SUS เป้าหมาย ≥75; Sev-1 = 0, Sev-2 มี owner+deadline | หลัง build |
| UXT-009 | 1E | Accessibility test with assistive use | DS-012 | Audit evidence | Keyboard/screen reader Core tasks สำเร็จ; 200% zoom ไม่สูญเสีย action/data | ได้ |
| UXT-010 | 1.5 | Post-launch continuous discovery | Analytics + support | Monthly top friction report | รวม funnel, support theme และ session consent; top 3 issues เข้าสู่ backlog ทุกเดือน | หลัง launch |

### 9.3 Severity และ Decision Rule

| Severity | นิยาม | Release rule |
|---|---|---|
| Sev-1 | ทำ Core Task ไม่ได้, โพสต์ผิดบัญชี, อนุมัติ/เผยแพร่ผิดเจตนา, ข้อมูลข้ามธุรกิจ | Block release |
| Sev-2 | ทำสำเร็จยากมาก/ต้องช่วย, เข้าใจสถานะผิด, recovery หาไม่เจอ | ต้องแก้ก่อน Phase gate หรือมี Product exception ลงนาม |
| Sev-3 | ช้า/สับสนแต่ทำสำเร็จเอง | เข้า Sprint ถัดไปตาม frequency |
| Sev-4 | ความสวย/ความชอบ ไม่มีผลต่อ task | Design backlog |

# PART B — CONTENT QUALITY SYSTEM

## 10. Quality Model และ Rubric

Quality Gate เป็น Hybrid 3 ชั้น:

1. Deterministic rules: รูปแบบ, คำห้าม, footer, contact, expired offer, platform constraints
2. Evidence/rights validation: claim support, source freshness, asset permission/expiry
3. AI rubric review: ความชัด, audience fit, brand fit, natural Thai, usefulness, platform fit, CTA, redundancy และ risk

### 10.1 Rubric Dimensions v1

| Dimension | Weight แนะนำ | ตัวอย่างสิ่งที่ตรวจ | Gate |
|---|---:|---|---|
| Factual/Evidence Support | 20 | ราคา, โปรโมชั่น, guarantee, material/benefit, source freshness | Hard fail เมื่อ claim สำคัญไม่มีหลักฐาน |
| Safety/Compliance | 20 | medical/health claim, misleading certainty, prohibited phrase, rights | Hard fail ตาม Industry rule |
| Business/Brand Fit | 15 | tone, positioning, approved CTA/contact, forbidden promise | Warn/Hard ตาม rule |
| Audience/Intent Fit | 10 | ตรงกลุ่ม/เป้าหมาย/ขั้น funnel | Warn |
| Thai Naturalness/Clarity | 10 | อ่านเป็นไทยธรรมชาติ, ไม่แปลตรง, ไม่กำกวม | Warn |
| Usefulness/Specificity | 10 | มีสาระเฉพาะธุรกิจ ไม่ใช่ generic filler | Warn |
| Platform Fit | 5 | FB/IG variant, length, hashtag, media/caption compatibility | Block เฉพาะ technical constraint |
| CTA Fit | 5 | CTA สอดคล้อง goal และไม่ hard-sell เกิน choice | Warn |
| Originality/Non-copying | 5 | ไม่คัดลอก source/คู่แข่ง, ไม่ใกล้ source เกิน threshold | Hard fail เมื่อเสี่ยงละเมิด |

คะแนนรวมใช้จัดลำดับและอธิบายเท่านั้น; Hard rule มีอำนาจ Block แยกจากคะแนนรวม ห้ามให้คะแนนสูงกลบ Claim ที่ผิด

### 10.2 Execution Tasks

| ID | Phase | งาน | Dependencies | Deliverable | Acceptance Criteria | Parallel |
|---|---|---|---|---|---|---|
| QLT-001 | 0 | นิยาม Quality taxonomy และ severity | UXF-002 | Taxonomy v1 | Issue ทุกชนิดมี code, user message, severity, auto-fixability, evidence requirement | ได้ |
| QLT-002 | 0 | สร้าง Rubric v1 | QLT-001 | Rubric + score anchors 1–5 | ทุก dimension มี positive/negative examples ภาษาไทยและ edge cases | ได้ |
| QLT-003 | 0 | สร้าง Annotation Guide | QLT-002 | Guide + adjudication form | Annotator สองคนทดลอง 30 cases; weighted kappa ≥0.70 หรือปรับ guide | ได้ |
| QLT-004 | 0 | ล็อก Quality Contract v1 | QLT-001–003, CORE-KNOWLEDGE-v1 | Input/output schema + gate policy | Result มี issue, location, explanation, suggested action, evidence refs, rule/rubric version; deterministic | ไม่ได้; Merge Gate |
| QLT-005 | 1B | Deterministic rule engine spec | QLT-004, IPK-004 | Rule schema + precedence | Hard/warn/info; pack override จำกัด; rule test fixtures 100% pass | ได้ |
| QLT-006 | 1B | Evidence validation spec | QLT-004, CORE-KNOWLEDGE-v1 | Claim-evidence graph rules | Claim สำคัญ trace source/version/freshness; missing/expired/conflict result แยกกัน | ได้ |
| QLT-007 | 1C | AI judge prompt/structured output spec | QLT-004 | Versioned evaluator spec | Output validate schema; no unsupported free-form gate; judge failure ไม่ auto-pass | ได้ |
| QLT-008 | 1C | Combined gate decision table | QLT-005–007 | Precedence matrix | Hard fail ชนะคะแนน; timeout/unknown เข้าสถานะต้องตรวจ ไม่ถือว่าผ่าน | ไม่ได้ |
| QLT-009 | 1C | User-facing issue/action mapping | QLT-001, UXF-002, SCR-014 | Copy/action catalog | ทุก issue code มีข้อความไทยและ action; ไม่แสดง rule/model ID | ได้ |
| QLT-010 | 1C | Eval harness + initial baseline | QLT-008, GST-006 | Reproducible evaluation harness/report | รันแบบ pinned provider/model/prompt/pack; per-industry/per-dimension/confusion matrix/cost/latency | หลัง Golden Set freeze |
| QLT-011 | 1E | Regression gate in CI/release | QLT-010 | Threshold config + report artifact | Critical false pass = 0 ใน frozen critical set; threshold อื่นผ่าน; change มี diff approval | หลัง baseline |
| QLT-012 | 1E | Production feedback capture | CORE-EVENT-v1 | approve/edit/reject feedback schema | แยก Business; opt-out/retention; ไม่ใช้ content ข้ามลูกค้าเพื่อ train โดยไม่มีฐานสิทธิ์ | ได้ |
| QLT-013 | 1.5 | Drift and judge calibration | QLT-012 | Monthly calibration report | Sampling stratified; model/prompt/pack version comparison; rollback criteria ชัด | หลัง launch |

## 11. Golden Set Plan

Golden Set ไม่ใช่ชุด Prompt ตัวอย่างอย่างเดียว แต่เป็น Versioned Dataset ที่มีต้นทาง, Content/Context, Human Label และ Expected Gate Result

### 11.1 Dataset Record ขั้นต่ำ

- `case_id`, `dataset_version`, `industry_pack_id/version`, language/platform/content format
- Business fixture แบบสังเคราะห์: offer, audience, tone, approved facts, forbidden claims, CTA
- Page fixture และ Campaign/Content Brief
- Evidence fixture: source, freshness, supported claim, conflict state
- Asset rights fixture เมื่อเกี่ยวข้อง
- Input content และ expected platform variant
- Issue labels, severity, expected hard/warn/pass, rationale, evidence reference
- Dimension score โดย Annotator A/B, adjudicated score, reviewer role และ timestamp
- `critical_case`, `frozen_regression`, `synthetic_or_permissioned`, privacy/license note

### 11.2 Composition ต่อ Industry v1

เป้าหมาย **120 cases ต่อ Industry** รวม 240 cases:

| Case family | ต่อ Industry | ตัวอย่าง |
|---|---:|---|
| Strong/ready content | 20 | ดีครบแต่ tone/format หลากหลาย ป้องกัน false rejection |
| Brand/audience mismatch | 15 | แบรนด์พรีเมียมแต่ขายเร่ง, ผิดกลุ่ม, CTA ไม่ตรง |
| Unsupported/expired fact | 20 | ราคา/โปร/วัสดุ/ผลลัพธ์ไม่มีหลักฐานหรือหมดอายุ |
| Safety/restricted claim | 20 | คำรับประกัน, health/medical claim, certainty, before-after risk |
| Thai naturalness/clarity | 15 | ภาษา AI, แปลตรง, วนซ้ำ, คำกำกวม, วรรณยุกต์/emoji |
| Platform/media fit | 10 | FB/IG variant, caption/media/rights mismatch |
| Research/source copying | 10 | ใกล้ต้นฉบับ, competitor phrasing, attribution issue |
| Edge/adversarial | 10 | contradictory knowledge, page override, mixed language, prompt injection in source |

แบ่งเป็น Calibration 30, Development 50 และ Frozen Regression 40 ต่อ Industry; ห้ามใช้ Frozen Regression ปรับ Prompt โดยดูเฉลยทีละ case

### 11.3 Golden Set Tasks

| ID | Phase | งาน | Dependencies | Deliverable | Acceptance Criteria | Parallel |
|---|---|---|---|---|---|---|
| GST-001 | 0 | Dataset schema + provenance policy | QLT-003, IPK-004 | JSON/DB schema + license/privacy rule | Validator ปฏิเสธ record ขาด expected result/provenance; ไม่มีข้อมูลลูกค้าจริงที่ไม่ได้อนุญาต | ได้ |
| GST-002 | 0 | Sampling matrix | QLT-002 | Matrix per industry/dimension/severity | จำนวนครบ composition; ครอบคลุม FB/IG, short/long, image/video brief | ได้ |
| GST-003 | 0–1B | Interior case authoring | GST-001–002, INT-006 | 120 raw cases | ทุก family ครบ; Business/Page/Evidence fixture สมจริง; duplicate semantic sample ต่ำ | ได้ |
| GST-004 | 0–1B | Skincare case authoring | GST-001–002, SKN-006 | 120 raw cases | ครอบคลุม claim/risk มากพอ; Reviewer claim/compliance sign-off | ได้ |
| GST-005 | 1B | Double annotation | GST-003–004, QLT-003 | Labels A/B | 100% cases มี 2 labels; annotator ไม่เห็น model output | แยก 2 Agents |
| GST-006 | 1B | Adjudication + freeze | GST-005 | Golden Set v1 | Disagreement มีเหตุผล; kappa ≥0.70; 40 cases/industry freeze พร้อม checksum | หลัง annotation |
| GST-007 | 1C | Model/prompt baseline comparison | GST-006, QLT-010, AI Contract | Benchmark table | เทียบ quality/cost/latency; ไม่เลือกจากคะแนนรวมอย่างเดียว; critical false-pass แยก | ได้ |
| GST-008 | 1C | Threshold approval | GST-007, QLT-010 | Approved threshold v1 | Hard critical recall 100% ใน frozen critical subset; dangerous false pass ≤2% overall; accept/reject accuracy ≥85%; Thai naturalness median ≥4/5 | ไม่ได้; Release Gate |
| GST-009 | 1E | Regression versioning process | GST-008 | Dataset changelog/promotion rule | เพิ่ม case จาก incident ได้แต่ห้ามแก้ expected แบบเงียบ; version+review+checksum ทุก release | ได้ |

> Threshold เป็นค่าเริ่มต้นสำหรับ Pilot ต้องรายงาน Confidence interval และจำนวนตัวอย่างเสมอ หาก 100% มาจากจำนวน case น้อย ห้ามตีความว่า Production risk เป็นศูนย์

# PART C — INDUSTRY PACK PLATFORM

## 12. Industry Pack Contract และ Lifecycle

Industry Pack เป็น Data/Rules Bundle ไม่ใช่ Source Code Plugin จากบุคคลภายนอกใน Phase 1 การติดตั้งต้องผ่าน Registry + Validator ภายในระบบ

### 12.1 Pack Structure v1

```text
industry-pack/
  manifest
  taxonomy/
    content-pillars
    topics
    audience-segments
    funnel-goals
  language/
    glossary
    preferred-terms
    discouraged-terms
    thai-examples
  research/
    source-policy
    query-templates
    freshness-rules
    seasonality
  quality/
    deterministic-rules
    claim-rules
    risk-levels
    evidence-requirements
  generation/
    brief-presets
    content-patterns
    platform-guidance
    media-shot-lists
  ui/
    onboarding-cards
    filter-chips
    helper-copy
  eval/
    fixtures
    golden-case-references
  migrations/
    version-upgrade-map
```

### 12.2 Manifest และ Compatibility

Manifest ต้องมี `pack_id`, semver, industry key, Thai display name, publisher, status, minimum runtime version, supported locales/platforms, dependencies, checksum, released_at, deprecation date และ migration reference

- Patch: แก้ copy/rule ที่ไม่เปลี่ยน meaning; auto-upgrade ได้หลัง regression
- Minor: เพิ่ม taxonomy/template/rule แบบ backward compatible; Admin preview ก่อน activate
- Major: เปลี่ยน meaning/schema/precedence; ต้อง migration, re-eval และ explicit activation
- Research/Content/Quality record pin Pack Version ที่ใช้จริง
- Rollback เปลี่ยน Active Version สำหรับงานใหม่; งานเก่ายัง reproduce ด้วย version ที่ pin
- Hard platform safety policy อยู่เหนือ Pack; Business/Page override ลดความเข้มไม่ได้

### 12.3 Platform Tasks

| ID | Phase | งาน | Dependencies | Deliverable | Acceptance Criteria | Parallel |
|---|---|---|---|---|---|---|
| IPK-001 | 0 | Pack schema v1 | CORE-KNOWLEDGE-v1 | Manifest + section schemas | Versioned, locale-aware, no executable code, unknown field policy ชัด | ได้ |
| IPK-002 | 0 | Rule precedence/inheritance | QLT-004, IPK-001 | Platform→Industry→Business→Page matrix | Lower scope เพิ่มความเข้ม/ปรับ brand ได้ แต่ลด hard safety ไม่ได้; conflict deterministic | ได้ |
| IPK-003 | 0 | Validator and lint contract | IPK-001–002 | Validation rule list + test fixtures | ตรวจ schema, refs, duplicate IDs, circular dependency, unsafe override, missing Thai copy, checksum | ได้ |
| IPK-004 | 0 | Lock Pack Contract v1 | IPK-001–003 | Approved contract | Quality/Research/Generate/UI ใช้ stable IDs; compatibility and error format ชัด | ไม่ได้; Merge Gate |
| IPK-005 | 1B | Registry/runtime interface | IPK-004, CORE-PACK-v1 | List/install/activate/pin/resolve API contract | Cache invalidation/version pin; pack unavailable ไม่ fallback ข้าม industry แบบเงียบ | ได้ |
| IPK-006 | 1B | Upgrade/rollback workflow | IPK-005 | Admin flow + migration plan | Preview diff/affected rules; rollback tested; content history reproduce ได้ | ได้ |
| IPK-007 | 1B | Pack sandbox/preview | IPK-005, QLT-010 | Test business preview | Compare old/new suggestions/quality without affecting production Business | ได้ |
| IPK-008 | 1E | Pack observability | CORE-EVENT-v1 | Metrics/log contract | Usage/error/false-positive feedback แยก pack/version โดยไม่เปิด content sensitive | ได้ |
| IPK-009 | 1E | Compatibility test suite | IPK-006–007 | Automated suite | Install/upgrade/rollback/pin/cross-business/cross-pack leakage tests ผ่าน | ไม่ได้; Release Gate |
| IPK-010 | 1B | Pack UI presets integration | IPK-004, DS-008 | Onboarding cards/filter chips/helper copy mapping | เพิ่ม Pack ใหม่แล้ว UI แสดง taxonomy ผ่าน schema ไม่ต้องแก้ component | ได้ |

---

## 13. Interior / Built-in Industry Pack v1 — Primary Pilot

### 13.1 Pack Scope

กลุ่มเป้าหมาย: ผู้รับออกแบบตกแต่ง, Built-in/Fit-in, โรงงานเฟอร์นิเจอร์สั่งทำ และทีมออกแบบติดตั้ง ไม่รวมคำแนะนำวิศวกรรม/โครงสร้างที่ต้องมีผู้เชี่ยวชาญรับรอง

Content pillars เริ่มต้น:

1. Space planning และการใช้พื้นที่
2. Material/finish/maintenance
3. Function ภายในตู้และ ergonomics
4. Process: วัดพื้นที่→3D→ผลิต→ติดตั้ง→QC
5. Before/after และผลงานจริงพร้อมสิทธิ์
6. Budget/range และสิ่งที่กระทบราคา
7. Pain point/ข้อผิดพลาดที่ควรเลี่ยง
8. Trust: ทีม, โรงงาน, warranty/after-sales ที่มีหลักฐาน
9. Style inspiration
10. Consultation/measurement CTA

### 13.2 Claim/Evidence Rules สำคัญ

- ราคา, ส่วนลด, ระยะผลิต/ติดตั้ง, warranty, “ฟรี”, จำนวนปีประสบการณ์ ต้องมาจาก Business Knowledge ที่ยังไม่หมดอายุ
- คำว่า “กันน้ำ/ปลวกไม่กิน/ทนตลอดชีวิต/ดีที่สุด/ถูกที่สุด/100%” เป็น restricted claim ต้องมี approved evidence หรือ Block
- คุณสมบัติวัสดุต้องแยก moisture-resistant ออกจาก waterproof และไม่สรุปเกิน manufacturer spec
- Safety/load-bearing/electrical/structural claim ต้องมี trusted technical source และข้อความจำกัดขอบเขต
- ภาพ 3D ต้องไม่ถูกสื่อเป็นงานจริง; Before/after ต้องมี label และ asset rights
- งานลูกค้า/ที่อยู่/ใบหน้า/แบบบ้านต้องผ่าน asset consent/privacy rule
- ราคา range ต้องบอก assumptions หลัก ไม่สื่อเป็นใบเสนอราคาสุดท้าย

### 13.3 Tasks

| ID | Phase | งาน | Dependencies | Deliverable | Acceptance Criteria | Parallel |
|---|---|---|---|---|---|---|
| INT-001 | 0 | Domain interview/source map | UXT-002, IPK-004 | Interview notes + trusted source policy | ≥3 practitioners + ≥2 customer perspectives; source tier/freshness ระบุ | ได้ |
| INT-002 | 0 | Taxonomy/content pillar | INT-001 | Topics, intents, audiences, funnel mapping | ≥60 topic nodes; stable IDs; duplicate/overlap reviewed | ได้ |
| INT-003 | 0 | Thai glossary/voice patterns | INT-001, UXF-002 | Preferred/discouraged terms + examples | แยก Built-in/Fit-in/material/style terms; ไม่สร้าง fact จาก glossary | ได้ |
| INT-004 | 0 | Claim/risk/evidence rules | INT-001, QLT-005–006 | Rule bundle | ราคา/ฟรี/รับประกัน/material/safety/3D-real/rights ครบ; positive/negative fixture ต่อ rule | ได้ |
| INT-005 | 1B | Research policy/seasonality | INT-002, IPK-004 | Sources, query templates, freshness, Thai calendar | Source allow/deny tier; ไม่คัดลอก competitor; event/season expiry ชัด | ได้ |
| INT-006 | 1B | Generation recipes | INT-002–004 | ≥20 brief presets + FB/IG guidance + media shot lists | ครอบคลุม educate/trust/sell/review/process; output อ้าง Business facts เท่านั้น | ได้ |
| INT-007 | 1B | UI presets | INT-002–003, IPK-010 | Onboarding cards/chips/helper copy | Owner เลือกข้อมูลเริ่มต้นได้โดยไม่พิมพ์ยาว; terminology comprehension ≥90% | ได้ |
| INT-008 | 1B | Pack assembly/validation | INT-002–007 | Interior Pack 1.0.0 | Validator ผ่าน; checksum; manifest; no unresolved refs | หลัง tasks |
| INT-009 | 1C | Golden/Eval certification | INT-008, GST-008, QLT-010 | Certification report | Threshold GST-008 ผ่านแยก Interior; risky false pass reviewed 100% | หลัง Golden Set |
| INT-010 | 1E | Pilot calibration | INT-009 | Revision 1.0.x + changelog | Pilot ≥3 Businesses; false positive/negative top issues adjudicated; no silent rule weakening | หลัง pilot |

---

## 14. Skincare Industry Pack v1 — Secondary / High-risk Pilot

### 14.1 Pack Scope

กลุ่มเป้าหมาย: ธุรกิจดูแลผิว/ความงามและผลิตภัณฑ์ที่ต้องสื่อสารอย่างรับผิดชอบ Pack ต้องตั้งค่า `business_type` เพื่อแยกสถานประกอบการ/ผู้ให้บริการ/ผลิตภัณฑ์ที่มีข้อกำกับต่างกัน และไม่ใช้คำว่า “คลินิก”, “รักษา” หรือบทบาทวิชาชีพโดยอัตโนมัติหาก Business Knowledge ไม่ได้ยืนยันสิทธิ์

Content pillars เริ่มต้น:

1. ความรู้ทั่วไปเรื่องผิวแบบไม่วินิจฉัย
2. Routine/ขั้นตอนการดูแลที่ธุรกิจยืนยัน
3. Ingredient/product information จากฉลากหรือแหล่งอนุมัติ
4. Consultation/assessment CTA ที่ไม่รับประกันผล
5. Service process และ hygiene/trust
6. รีวิว/ประสบการณ์ลูกค้าโดยมี consent และไม่สรุปผลทั่วไป
7. Expectation setting และ individual variation
8. Promotion ที่มีราคา/ช่วงเวลา/เงื่อนไขชัด
9. Team/expert role ตาม credential ที่ยืนยัน
10. Myth/risk education พร้อม trusted source

### 14.2 Claim/Risk Rules สำคัญ

- Block คำรับประกันผล, cure/treat/หายขาด/เห็นผลแน่นอน, ระยะเวลาผลลัพธ์ตายตัว หรือการวินิจฉัยเฉพาะบุคคล เว้นแต่ policy/credential/evidence ที่กำหนดรองรับและ Human Review บังคับ
- ผลลัพธ์, before/after, testimonial, “ผู้เชี่ยวชาญ”, credential, ingredient benefit, procedure safety และตัวเลขประสิทธิภาพต้องมี evidence/consent ที่เหมาะสม
- ห้ามสร้างคำแนะนำหยุดยา/ใช้ยา/วินิจฉัยโรค หรือแทนคำแนะนำผู้ประกอบวิชาชีพ
- Sensitive personal/health data และภาพใบหน้าต้องมี consent, purpose, retention, ad-use permission และ expiry
- Promotion ต้องมีราคา, เงื่อนไข, eligibility, expiry และสาขา/ช่องทางที่ใช้
- ถ้า evidence ขัดแย้ง/หมดอายุหรือ Business type ไม่ชัด ให้สถานะ “ต้องตรวจโดยคน” ไม่ auto-pass
- Page-specific footer/contact/time ต้องมาจาก Page Knowledge; ห้ามดึงข้ามสาขา
- Rule ทางกฎหมาย/แพลตฟอร์มเป็น Versioned Reference ที่ต้องให้ผู้เชี่ยวชาญตรวจ ณ เวลาจะเปิดใช้จริง; Pack ไม่ถือเป็นคำปรึกษากฎหมายหรือแพทย์

### 14.3 Tasks

| ID | Phase | งาน | Dependencies | Deliverable | Acceptance Criteria | Parallel |
|---|---|---|---|---|---|---|
| SKN-001 | 0 | Business type/risk boundary | IPK-004, QLT-004 | Type matrix + prohibited auto-assumptions | แยก service/product/professional claim; unknown type defaults high caution | ได้ |
| SKN-002 | 0 | Expert/legal/compliance review plan | SKN-001 | Reviewer criteria + sign-off checklist | Claim rules ไม่มีสถานะ Production-ready จน qualified reviewer sign-off | ได้ |
| SKN-003 | 0 | Taxonomy/content pillars | SKN-001 | Topics, intents, audiences, risk tags | ≥60 topic nodes; ทุก high-risk topic tag review/evidence level | ได้ |
| SKN-004 | 0 | Thai glossary and restricted phrases | SKN-001, UXF-002 | Term bundle + context exceptions | คำเกี่ยวกับรักษา/ผลลัพธ์/credential มี rule ไม่ใช่ blacklist ตายตัวอย่างเดียว | ได้ |
| SKN-005 | 1B | Claim/evidence/consent rules | SKN-002–004, QLT-005–006 | Rule bundle | Critical rules มี fixtures; unknown/conflict/expired = human review/block ตาม matrix | ได้ |
| SKN-006 | 1B | Research policy/trusted source tiers | SKN-002–003 | Source/freshness/query policy | Health claim ใช้ authoritative tier; social/competitor ไม่เป็น fact source; provenance ครบ | ได้ |
| SKN-007 | 1B | Generation recipes + safe alternatives | SKN-004–006 | ≥20 presets + rewrite actions | เมื่อ block เสนอ safer wording โดยไม่เปลี่ยนเป็น claim ใหม่; CTA ไม่วินิจฉัย | ได้ |
| SKN-008 | 1B | UI presets + consent prompts | SKN-003–005, IPK-010 | Cards/chips/helper copy | Non-tech user เข้าใจ why blocked/need review; consent/right fields ไม่ถูกซ่อน | ได้ |
| SKN-009 | 1B | Pack assembly/validation | SKN-003–008 | Skincare Pack 1.0.0-rc | Validator ผ่าน; expert sign-off status machine; unresolved legal reference block activation | หลัง tasks |
| SKN-010 | 1C | Golden/Eval certification | SKN-009, GST-008, QLT-010 | Certification report | Frozen critical false pass = 0; threshold GST-008 ผ่าน; human-review routing accuracy ≥95% | หลัง Golden Set |
| SKN-011 | 1E | Limited pilot calibration | SKN-010 | Revision + risk report | Pilot แบบ allowlist; ทุก publish hard-risk sample reviewed; no cross-branch footer/claim leak | หลัง pilot |

---

# PART D — INTEGRATION, HANDOFF และ GOVERNANCE

## 15. Cross-workstream Integration Tasks

| ID | Phase | งาน | Dependencies | Deliverable | Acceptance Criteria | Parallel |
|---|---|---|---|---|---|---|
| INTG-001 | 0 | Requirement traceability matrix | ทุก contract v1 | Requirement→Task→Screen→Test→Release Gate map | P0 requirement ไม่มี orphan; duplicate owner ถูก resolve | ไม่ได้ |
| INTG-002 | 0 | Shared fixtures repository plan | CORE contracts, GST-001 | Tenant/business/page/content/evidence/job fixtures | ทุก Agent ใช้ stable fixture IDs; no real secret/customer PII | ได้ |
| INTG-003 | 1A | Copy key registry/i18n governance | UXF-002, Screens | Copy catalog | ไม่มี hard-coded core copy; fallback test; Thai long text test | ได้ |
| INTG-004 | 1B | Analytics + usability funnel mapping | UXF-009, Screens | Funnel dashboard spec | Funnel แยก step/outcome/device/role โดย privacy-safe; abandon จุดไหนตอบได้ | ได้ |
| INTG-005 | 1C | Quality/Pack/UI contract test | QLT-009, IPK-005, SCR-014 | Contract tests | Issue code ทุกตัว render ได้; unknown code มี safe fallback; version pinned แสดง internal audit ได้ | ได้ |
| INTG-006 | 1D | E2E fixture journeys | Screens, packs | Playwright/manual journey specs | Interior and Skincare: happy, hard block, approval on/off, multi-page, partial failure | ได้ |
| INTG-007 | 1E | Pilot readiness review | UXT-008, QLT-011, IPK-009, DS-012 | Go/no-go report | Release Gates มี evidence; exception มี risk/owner/expiry; Sev-1 = 0 | ไม่ได้ |
| INTG-008 | ทุก Phase | Decision/change log | — | ADR/change record | เปลี่ยน terminology/rubric/pack rule/status ต้องระบุ affected Screen/Test/Dataset/Version | ต่อเนื่อง |

## 16. Agent Work Package Template

ทุก Task ที่ส่งให้ Sub-agent ต้องมีข้อความต่อไปนี้ เพื่อให้ Merge ได้โดยไม่ตีความใหม่:

```text
Task ID:
Goal / User outcome:
In scope:
Out of scope:
Locked decisions:
Input contracts + versions:
Files owned by this task:
Dependencies:
Deliverables:
Acceptance criteria:
Required states / edge cases:
Test fixtures:
Reviewers:
Merge gate:
Risks / open questions:
```

### File Ownership Rule

- Agent หนึ่ง Task แก้เฉพาะ directory/file ownership ที่มอบหมาย
- Shared schema/enum/copy key เปลี่ยนผ่านเจ้าของ Contract เท่านั้น
- Generated artifact ห้ามทับ source definition
- Pack, Dataset, Rubric และ Screen Spec ต้องมี version/changelog
- Merge ทีละ Contract ก่อน Merge consumers; ห้ามรวม PR ใหญ่หลาย Domain โดยไม่มี feature flag

## 17. Recommended Repository Boundaries

```text
product/
  ux-contract/
  terminology/
  screen-specs/
  usability/
design-system/
  tokens/
  components/
  patterns/
quality/
  taxonomy/
  rubric/
  rules/
  eval-harness/
datasets/
  golden/interior/
  golden/skincare/
industry-packs/
  schema/
  interior-built-in/
  skincare/
contracts/
  tenant/
  content/
  jobs/
  knowledge/
  industry-pack/
tests/
  contract/
  e2e/
  accessibility/
```

## 18. Definition of Ready สำหรับ Implementation Task

งาน UI/Quality/Pack เริ่มเขียน Production code ได้เมื่อ:

- Task ID, Scope และ Owner ชัด
- Input contract version ถูกระบุและไม่มี TBD ที่เปลี่ยน Domain behavior
- Wireframe/State Matrix/Copy/Acceptance พร้อมสำหรับหน้าจอ
- Rule/Rubric มี positive/negative fixture สำหรับ Quality
- Pack section ผ่าน schema/lint และมี stable IDs
- Privacy/security/rights impact ถูกระบุ
- Dependency ไม่มีงาน Blocked ที่ซ่อนอยู่
- Test plan ระบุ Component/Contract/E2E/Eval ที่ต้องเพิ่ม

## 19. Definition of Done

- Deliverable และ Acceptance Criteria ผ่านครบ
- Unit/Component/Contract/E2E หรือ Eval test ตามชนิดงานผ่าน
- 360 px + Thai long text + slow/error state ตรวจแล้ว
- Accessibility acceptance ผ่าน
- ไม่มี raw technical error/secret/tenant leak ใน UI/log fixture
- Analytics event และ support diagnostic พร้อม
- Docs, version, changelog และ traceability matrix อัปเดต
- Reviewer ที่กำหนด sign-off; High-risk Skincare rule ต้องมี qualified reviewer
- Feature flag/rollback path พร้อมสำหรับ behavior ใหม่ที่เสี่ยง

## 20. Critical Path และงานที่เริ่มได้ทันที

Critical Path:

```text
UXF-001→004 → DS-003 → SCR specs → Prototype → UXT gates
QLT-001→004 → GST schema/cases → annotation/freeze → QLT baseline → release gate
IPK-001→004 → Interior/Skincare packs → Golden certification → pack release
CORE contracts → Screen implementation/contract tests → E2E/Pilot readiness
```

เริ่มพร้อมกันได้ทันที:

1. `UXF-001`, `UXF-002`, `UXF-003`
2. `DS-001`, `DS-002`
3. `QLT-001`, `QLT-002`
4. `IPK-001`, `IPK-002`
5. `UXT-001`, `UXT-002`
6. `INT-001` และ `SKN-001` โดยใช้ผลสัมภาษณ์/ข้อกำกับเป็น Draft จน Contract v1 lock

ห้ามเริ่มจำนวนมากก่อน Merge Gate:

- ห้ามทำ Screen production หลายสิบหน้า ก่อน `UXF-004` และ `DS-003`
- ห้ามเขียน Golden Set 240 cases ก่อน Pilot Annotation Guide 30 cases ผ่าน `QLT-003`
- ห้ามสร้าง Pack content จำนวนมากก่อน `IPK-004`
- ห้ามเลือก AI Model จาก demo สวยไม่กี่ตัว ก่อน Frozen Golden Set และ cost/latency baseline
- ห้ามเปิด Skincare Pack Production ก่อน Qualified reviewer sign-off และ `SKN-010`

## 21. Open Decisions ที่ Product Owner ต้องล็อก

| Decision ID | ต้องตอบก่อน | ตัวเลือก/ข้อเสนอแนะ |
|---|---|---|
| DEC-UX-01 | Phase 0 test | กลุ่ม Pilot และผู้ติดต่อ 8–12 ราย; แนะนำ GoldenHome เป็น Primary Pilot |
| DEC-UX-02 | Phase 1A | Login method เริ่มต้น; แนะนำ Email OTP/magic link + invite ที่ง่ายบนมือถือ |
| DEC-UX-03 | Phase 1A | Meta onboarding support level; self-serve เทียบ assisted setup |
| DEC-QLT-01 | Annotation | ผู้ตรวจคนที่สองและผู้ adjudicate สำหรับภาษา/Brand |
| DEC-QLT-02 | Skincare activation | คุณสมบัติ Qualified reviewer ด้าน claim/compliance |
| DEC-IPK-01 | Pack ownership | ใครอนุมัติ version/change: Product Owner + Domain Reviewer |
| DEC-IPK-02 | Pack update | Auto patch หรือ Admin-confirm ทุก version; แนะนำ auto เฉพาะ non-semantic copy fix หลัง regression |
| DEC-UX-04 | Notification | Phase 1 ใช้ in-app บังคับ; Email/LINE ขึ้นกับ Pilot validation |
| DEC-DATA-01 | Golden data | ใช้ synthetic/permissioned examples และ retention policy |

## 22. สรุปจำนวนงานใน Workstream

| กลุ่ม | จำนวน Task/Epic |
|---|---:|
| UX Foundation | 10 |
| Design System | 12 |
| Screen Epics | 22 |
| Usability Research/Test | 10 |
| Content Quality | 13 |
| Golden Set | 9 |
| Industry Pack Platform | 10 |
| Interior Pack | 10 |
| Skincare Pack | 11 |
| Integration/Governance | 8 |
| **รวม** | **115** |

งาน 115 รายการนี้เป็น Workstream ที่สามารถแตกต่อเป็น Implementation Ticket ราย Component/API/Test ได้ หลัง Contract v1 ของแต่ละ Wave ผ่าน Merge Gate แล้ว
