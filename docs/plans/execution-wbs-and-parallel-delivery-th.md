# AI Content OS — Execution-ready WBS และ Parallel Delivery Plan

## สำหรับ SME ไทย — Facebook + Instagram, Mobile-first, Modular Plug-and-Play

สถานะเอกสาร: Execution Baseline v1.0  
วันที่จัดทำ: 30 สิงหาคม 2026  
ขอบเขต Release แรก: Research → Analyze → Generate → Asset → Approve → Calendar → Publish Facebook/Instagram → Basic Metrics

เอกสารนี้แปลง Product Backlog และ Technical Architecture เดิมให้เป็นงานที่มอบหมายได้จริง โดยเพิ่มงาน Pre-development ที่ยังเป็นเพียงหัวข้อในแผนเดิม ได้แก่ Core Database Schema, Module/API/Event Contracts, Wireframe ครบทุก Flow, Content-quality Golden Set, Industry Pack, Meta Spike, PDPA และ Production Test Plan

---

## 1. วิธีอ่านและกฎการใช้งาน WBS

### 1.1 หน่วยประเมิน

- `PD` = Person-day ของผู้พัฒนาที่คุ้นเคยกับ stack แล้ว รวม implementation และ test ใน task แต่ไม่รวมเวลารอ Meta App Review
- Estimate เป็นกรอบวางแผน ไม่ใช่คำรับประกันความเร็วของ AI Agent
- งาน `Spike` ต้อง time-box และจบด้วยผลตัดสินใจ/หลักฐาน ไม่ใช่โค้ดทดลองที่ถูกยกเป็น Production โดยอัตโนมัติ
- งาน `Contract` ต้อง merge ก่อนงาน consumer ที่พึ่ง contract นั้น
- งานข้าม Module ห้ามเริ่มจากการแก้ table/API ของ Module อื่นเอง ให้เปิด change request ต่อเจ้าของ contract

### 1.2 บทบาทสำหรับการกระจาย Agent

| Lane | ความรับผิดชอบหลัก |
|---|---|
| `INT` Integration/Architecture | Contracts, dependency, merge order, integration gate, ADR, release branch |
| `DATA` Data/Security | Schema, migration, RLS, audit, retention, database test |
| `PLAT` Platform/Async | Job, outbox, notification, observability, quota/cost |
| `FE` Product UI | Thai mobile UX, design system, onboarding, flow/error/accessibility |
| `AI` AI/Research/Quality | Knowledge, research, generation, evaluation, provider adapters |
| `MEDIA` Asset/Calendar/Approval | Storage, upload, processing, asset rights, workflow/calendar |
| `META` Meta/Publishing | OAuth, capability, publishing, metrics, reconnect |
| `QA` Quality/Release | Test automation, security, load, recovery, usability, release evidence |

ทีมขนาดเล็กสามารถรวม Lane ได้ แต่ต้องรักษา ownership ของ contract และ integration gate เหมือนเดิม

### 1.3 สถานะงานบังคับ

`Backlog → Ready → In progress → In review → Integrated → Verified → Done`

- `Implemented` ไม่เท่ากับ `Done`
- งานที่ยังไม่ผ่าน contract/integration/security/mobile test คงสถานะ `In review` หรือ `Integrated`
- Agent ปิด task เองได้ถึง `In review`; `Verified/Done` ต้องมี evidence จาก Integration หรือ QA lane

---

## 2. Scope Baseline และ Non-goals

### 2.1 Production Beta P0

- Multi-user Workspace, multi-Business และ multi-Page/IG
- Business Knowledge แยกตาม Business และ Page override
- Research พร้อม evidence/freshness และ suggestion เฉพาะธุรกิจ
- Analyze/Generate/Quality Gate ภาษาไทย แบบ click-first
- Background jobs และ in-app notification
- Private Asset Library รูป/วิดีโอ พร้อม processing/rights/version
- Optional approval, content calendar และ platform preview
- Facebook + Instagram publish, scheduled publish, retry/idempotency/reconnect
- Basic metrics, billing/quota/cost ledger, support/operations/security/PDPA

### 2.2 ไม่อยู่ Critical Path ของ Phase 1

- Inbox, CRM, lead/revenue/ROI attribution
- LinkedIn และ social channel อื่น
- Canva/CapCut-like editor
- Runtime third-party plugin marketplace
- OpenRouter เป็น default critical provider
- Agency white-label, external client portal
- Public asset bucket หรือ active-active multi-cloud

---

## 3. Delivery Strategy: Vertical Slices + Contract-first

แต่ละ Slice ต้องเดินครบเส้นทาง `Mobile UI → Application Command/Query → Domain → Database/RLS → Job/Event → Notification → Observability → Test` ห้ามแยก Agent ทำเฉพาะ UI หรือเฉพาะ API โดยไม่มี integration owner

### 3.1 Parallel Wave Map

| Wave | เป้าหมาย | งานที่ทำคู่ขนานได้ | Gate ที่ต้องผ่าน |
|---|---|---|---|
| W0 | Pre-dev readiness | Validation, UX flows, schema design, contracts, Meta spike, golden set, PDPA | G0 Scope & Contract Ready |
| W1 | Platform foundation | Repo/CI, tenancy schema, RLS harness, job/outbox, design system, observability | G1 Foundation Integrated |
| W2 | Identity/Business/Meta connect | Workspace/team, Business/Page, Knowledge shell, OAuth connection | G2 Tenant & Connection Alpha |
| W3 | Research/Analysis | Knowledge import, Industry Pack, evidence, suggestion, analysis, notifications | G3 Research Closed Pilot |
| W4 | Generate/Quality | AI router, provider adapters, BYOK, content/version, quality gate | G4 AI Content Alpha |
| W5 | Production workflow | Asset, approval, calendar, preview ทำคู่ขนานหลัง contract freeze | G5 Mobile End-to-end Pilot |
| W6 | Publish/Commercial hardening | Meta publish, metrics, billing/quota, backup/PDPA/security/load | G6 Paid Beta |
| W7 | Beta stabilization | Reliability, support, activation, cost optimization ตาม production data | G7 GA Decision |

### 3.2 Critical Path

`Scope lock → Tenant/Data contract → RLS foundation → Job/Event foundation → Business/Page isolation → Knowledge → Research evidence → Content brief/version → Generation → Quality gate → Asset/version → Approval/Calendar → Meta capability/publish → Billing/Quota → Restore/Security/PDPA → Paid Beta`

Meta App Review เดินคู่ขนานตั้งแต่ W0 แต่เป็น external dependency ของ G6 ถ้าช้าให้ Pilot ผ่าน development/test account เท่านั้น ห้ามเรียก Paid Beta ว่าพร้อม Production

---

## 4. Phase 0 / Wave 0 — Pre-development Readiness

เป้าหมาย: ปิดคำถามที่ทำให้หลาย Agent ตัดสินใจคนละแบบก่อนเริ่มเขียน Production code

### 4.1 Product Validation และ Scope

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| RDY-001 | INT | สร้าง decision register: locked scope, assumptions, non-goals, unresolved decisions | — | 1 | ทุก decision มี owner, due date, affected modules |
| RDY-002 | INT | ระบุ Pilot profile และ Beachhead: Built-in/Interior เป็น Pack 1, Skin-care เป็น risk Pack 2 | RDY-001 | 1 | กำหนด user, content types, risky claims, success signal |
| RDY-003 | INT | สัมภาษณ์ 8–12 SME จาก 2–3 industry | RDY-002 | 5 | Transcript/summary, top jobs, objection, willingness-to-pay |
| RDY-004 | INT | ยืนยัน Pilot อย่างน้อย 5 Workspace และข้อมูลทดสอบที่อนุญาตใช้ | RDY-003 | 2 | Pilot consent, channel/account type, owner/contact |
| RDY-005 | INT | ล็อก P0/P1/Future และ change-control rule | RDY-003 | 1 | P0 มี release gate; scope เพิ่มต้องตัด effort เท่ากัน |
| RDY-006 | INT | นิยาม Product KPIs: activation, time-to-first-draft, publish success, weekly active workspace, support time, gross margin | RDY-003 | 2 | มี formula, event source, owner และ target beta |

### 4.2 UX Specification ครบ Core Flow

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| UXD-001 | FE | Information architecture และ bottom nav ไม่เกิน 5 รายการ | RDY-005 | 1 | รองรับหลาย Workspace/Business/Page โดยไม่แสดง ID |
| UXD-002 | FE | Wireframe สมัคร/เข้าใช้/สร้าง Workspace/เชิญทีม | UXD-001 | 2 | Happy/empty/loading/error/recovery ที่ 360 px |
| UXD-003 | FE | Wireframe เชื่อม Facebook Page + IG และ reconnect | UXD-001,MTA-001 | 2 | ใช้ชื่อ/รูป account, อธิบาย permission ภาษาคน |
| UXD-004 | FE | Wireframe Business Knowledge onboarding แบบ card/chip/import | UXD-001 | 2 | หลัง onboarding ไม่มี required prompt |
| UXD-005 | FE | Wireframe Research/Suggestion/Analysis | UXD-004 | 2 | แสดงเหตุผลและ evidence แบบเข้าใจง่าย |
| UXD-006 | FE | Wireframe Generate/quick refine/version/quality issues | UXD-005 | 3 | สร้างและแก้ได้ด้วยการคลิกเป็นหลัก |
| UXD-007 | FE | Wireframe Asset upload/library/detail/rights/select mode | UXD-001 | 2 | ครบ upload background และ recoverable failure |
| UXD-008 | FE | Wireframe Approval/Calendar/Preview/Schedule | UXD-006,UXD-007 | 3 | ไม่บังคับ drag; approver ทำงานมือเดียวได้ |
| UXD-009 | FE | Wireframe Job Center/Notification/Usage/Admin advanced | UXD-001 | 2 | ซ่อน provider/model/token/queue จาก core user |
| UXD-010 | FE | Usability test prototype กับ non-tech Thai users 5–8 คน | UXD-002..009 | 4 | ≥80% ทำ core flow สำเร็จโดยไม่ช่วย; findings ถูก triage |
| UXD-011 | FE | UX copy glossary และ error/action catalog ภาษาไทย | UXD-010 | 2 | คำเดียวกันใช้ความหมายเดียว, raw error มี mapped action |

### 4.3 Core Data, Contract และ Architecture Design

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| ARC-001 | INT | Context map และ ownership ของ Platform Kernel/Modules/Adapters | RDY-005 | 2 | ไม่มี circular domain dependency/direct cross-module write |
| DAT-001 | DATA | Core ERD: auth reference, workspace, membership, role, invitation, audit | ARC-001 | 2 | PK/FK/cardinality/retention/owner ครบ |
| DAT-002 | DATA | ERD: business, page context, channel connection, knowledge/version | ARC-001 | 2 | inheritance/override/isolation ชัดเจน |
| DAT-003 | DATA | ERD: research run/evidence/suggestion/feedback | ARC-001 | 2 | source/freshness/lineage และ business/page keys ครบ |
| DAT-004 | DATA | ERD: content/brief/platform variant/version/quality/approval/calendar | ARC-001 | 3 | version pin, state transition, approval invalidation ชัด |
| DAT-005 | DATA | ERD: jobs/outbox/notification/AI credential/model/usage/quota/subscription/audit | ARC-001 | 3 | idempotency/lease/cost attribution/secret boundary ชัด |
| DAT-006 | DATA | รวม Asset schema เดิมเข้ากับ Core ERD และ naming conventions | DAT-001..005 | 1 | ไม่มี duplicate concept, FK boundary ตรง module owner |
| DAT-007 | DATA | Data dictionary + enum/state owner + deletion/retention class | DAT-001..006 | 3 | ทุก field sensitive ระบุ classification และ retention |
| SEC-001 | DATA | Authorization/RLS matrix ทุก table, role และ operation | DAT-001..007 | 3 | deny-by-default; cross-workspace/business/page cases ครบ |
| CTR-001 | INT | Tenant Context contract สำหรับ command/query/job/event | ARC-001,DAT-001 | 1 | versioned schema, required IDs, actor/correlation present |
| CTR-002 | INT | API conventions: version, idempotency key, pagination, error envelope, auth | CTR-001 | 2 | OpenAPI baseline + Thai user-error mapping rule |
| CTR-003 | INT | Event envelope/outbox/consumer contract | CTR-001 | 2 | version, producer, aggregate, causation, correlation, occurred_at |
| CTR-004 | INT | Background Job contract: state, lease, retry, cancel, DLQ, result pointer | CTR-003 | 2 | state machine และ idempotency acceptance cases |
| CTR-005 | INT | Adapter contracts: AI, Research, Storage, Media, Meta Publisher, Notification | CTR-001..004 | 4 | capability discovery + normalized error + contract test vectors |
| CTR-006 | INT | Usage/Cost/Entitlement event contracts | CTR-003,DAT-005 | 2 | unit, payer, provider, workspace/business/job attribution |
| CTR-007 | INT | Module manifest/registry/version compatibility/kill-switch contract | CTR-005 | 2 | incompatible module fails fast; feature policy specified |
| ARC-002 | INT | ADR review: boundaries, storage choice, queue, secrets, AI routing, timezone | ARC-001,CTR-001..007 | 2 | accepted ADRs linked to affected tasks |

### 4.4 Meta, Quality, Industry, Security และ Commercial Spikes

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| MTA-001 | META | สร้าง Meta Developer App/test business/test Page/IG และ permission inventory | RDY-002 | 2 | app roles/test assets พร้อม, no production secret in repo |
| MTA-002 | META | Spike OAuth + enumerate Pages + pair IG Professional | MTA-001 | 3 | หลาย Page, missing permission, reconnect cases บันทึกผล |
| MTA-003 | META | Spike publish รูป/วิดีโอ/carousel และ polling | MTA-001 | 4 | capability matrix ตาม API version/app mode พร้อม evidence |
| MTA-004 | META | App Review checklist, screencast/script, privacy/data deletion URLs | MTA-002,MTA-003,PRV-003 | 2 | submission package owner/deadline/status tracker |
| QLT-001 | AI | Content Quality Rubric ภาษาไทย + platform/industry dimensions | RDY-002 | 3 | clarity, fit, evidence, CTA, risk มี anchor examples |
| QLT-002 | AI | Golden Set Pack 1 อย่างน้อย 100 cases | QLT-001 | 5 | good/bad/edge/risky และ expected finding/decision |
| QLT-003 | AI | Human review protocol + inter-rater sample + pass threshold | QLT-002 | 2 | disagreement rule, false block/false allow target |
| IND-001 | AI | Industry Pack schema/manifest/validation contract | CTR-005,QLT-001 | 2 | taxonomy, seasonality, claims, templates, research policy |
| IND-002 | AI | Built-in/Interior Pack v1 จากข้อมูลจริง | IND-001 | 4 | knowledge template, 30+ topics, risk/claim examples, eval cases |
| IND-003 | AI | Skin-care risk pack skeleton เพื่อพิสูจน์ extensibility | IND-001 | 3 | restricted claims/wording/evidence policy แยกจาก Pack 1 |
| PRV-001 | DATA | Data inventory/classification/processor/subprocessor map | DAT-007 | 2 | personal, credential, content, media, telemetry แยกชั้น |
| PRV-002 | DATA | Retention/export/delete/legal-basis/consent matrix | PRV-001 | 2 | owner + SLA + exception + backup behavior ครบ |
| PRV-003 | DATA | Privacy notice/terms/DPA/support access policy requirement | PRV-001,PRV-002 | 2 | legal review placeholder ชัด; product behavior traceable |
| TST-001 | QA | Test strategy + pyramid + environment/test-data plan | CTR-001..007,DAT-007 | 3 | unit/contract/integration/E2E/security/load/recovery/usability |
| TST-002 | QA | Release evidence template และ traceability matrix Feature→Test→Gate | TST-001 | 2 | P0 ทุก feature มี planned evidence owner |
| COM-001 | PLAT | Pricing/quota hypothesis + unit economics worksheet | RDY-003,CTR-006 | 3 | platform/BYOK cost, storage, support reserve, gross margin scenarios |
| COM-002 | PLAT | Billing/payment/VAT/receipt/refund/grace-period product flow decision | COM-001 | 2 | Beta manual/automated boundary และ reconciliation owner |

### Gate G0 — Scope & Contract Ready

ต้องมีครบก่อนแจก implementation task จำนวนมาก:

- Locked scope/decision register และ 5 Pilot Workspace
- Wireframe ทุก Core Flow ผ่าน usability รอบแรก
- Core ERD/Data dictionary/RLS matrix v1
- API/Event/Job/Adapter/Usage contracts v1
- Meta capability matrix + App Review path
- Quality rubric + Golden Set v1 + Industry Pack v1
- PDPA/retention matrix + test/release strategy

ถ้า G0 ไม่ผ่าน ให้แจกได้เฉพาะ Spike/Prototype/Foundation ที่ไม่ผูก schema เท่านั้น

---

## 5. Wave 1 — Engineering Foundation

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| FND-001 | INT | Repository/monorepo structure ตาม module ownership | G0 | 2 | dependency rules enforce ใน lint/build |
| FND-002 | INT | Local/dev/staging/prod environment model + secrets policy | G0 | 2 | no shared prod credentials; rotation procedure |
| FND-003 | INT | CI: lint, type, unit, contract, migration, build, dependency scan | FND-001 | 3 | protected merge checks ผ่านบน sample change |
| FND-004 | INT | CD/release/feature-flag/rollback skeleton | FND-002,FND-003 | 3 | staging deploy + rollback drill |
| DBF-001 | DATA | Migration framework + schema ownership + seed/factory | DAT-001..007,FND-001 | 3 | clean up/down or forward-fix path; deterministic test seed |
| DBF-002 | DATA | Workspace/membership/role/invitation/audit migrations | DBF-001 | 4 | constraints/index/FK และ audit trigger/application events |
| DBF-003 | DATA | Business/Page/connection/knowledge shell migrations | DBF-001 | 4 | tenant/business/page keys และ unique constraints ครบ |
| DBF-004 | DATA | RLS helper functions/policies/test harness | DBF-002,SEC-001 | 5 | allow/deny/cross-tenant matrix automated |
| PLF-001 | PLAT | Tenant Context middleware และ propagation | CTR-001,FND-001 | 3 | API→job→event preserves actor/scope/correlation |
| PLF-002 | PLAT | Durable job repository/worker/lease/retry/DLQ skeleton | CTR-004,DBF-001 | 5 | crash/restart/duplicate/timeout tests ผ่าน |
| PLF-003 | PLAT | Transactional outbox + idempotent consumer | CTR-003,PLF-002 | 4 | no lost event on transaction boundary; replay safe |
| PLF-004 | PLAT | In-app notification store/query/read/deep-link skeleton | PLF-003 | 3 | event creates one deduplicated notification |
| PLF-005 | PLAT | Usage/cost ledger primitives + quota check port | CTR-006,DBF-001 | 4 | append-only usage; reconcile by job/provider/workspace |
| OBS-001 | PLAT | Structured log/error tracking/trace/correlation baseline | FND-002,PLF-001 | 3 | secrets redacted; trace across HTTP/job/event |
| OBS-002 | PLAT | Health/readiness + module/provider status + kill switch | CTR-007,OBS-001 | 3 | degraded adapter does not take whole app down |
| UIF-001 | FE | Thai mobile design tokens/components/form/chip/card/sheet/dialog/toast | UXD-001..011,FND-001 | 5 | 360/390/430 responsive, 44px targets, dark/light if supported |
| UIF-002 | FE | App shell, bottom nav, workspace/business/page switcher | UIF-001 | 4 | accessible keyboard/focus and one-hand mobile flow |
| UIF-003 | FE | Standard async/empty/error/success components + copy mapping | UIF-001,CTR-002 | 3 | no raw provider/technical error leaks |
| QAF-001 | QA | Contract-test runner + test data builder + fake adapters | CTR-005,TST-001,FND-003 | 5 | every adapter runs shared success/failure/idempotency vectors |
| QAF-002 | QA | Mobile browser matrix/E2E harness/accessibility baseline | UIF-001,FND-003 | 4 | tests at 360/390/430 + desktop, screenshot artifacts |

### Gate G1 — Foundation Integrated

- Clean environment deploys from CI
- Tenant context, RLS test harness, job/outbox/notification work end-to-end
- Logging/correlation/redaction and adapter contract test are operational
- Mobile app shell renders at target widths
- Migration/release rollback drill passes

---

## 6. Wave 2 / Phase 1A — Tenant, Business และ Meta Connection

### 6.1 Account, Team, Business และ Knowledge Shell

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| IAM-001 | DATA/FE | Auth signup/login/logout/recovery ภาษาไทย | G1 | 4 | session/recovery/rate-limit/error E2E |
| IAM-002 | DATA/FE | Workspace create/switch + membership list | IAM-001,DBF-002 | 4 | user หลาย workspace; isolation tests |
| IAM-003 | DATA/FE | Invitation accept/revoke/remove member | IAM-002 | 4 | expired/reused/wrong-recipient cases |
| IAM-004 | DATA/FE | Role enforcement owner/admin/editor/approver/viewer | IAM-002,DBF-004 | 5 | UI/API/job/storage checks; privilege escalation denied |
| IAM-005 | DATA/FE | Approval policy toggle + self-approval default rule | IAM-004 | 2 | audited policy change; effective immediately |
| BUS-001 | DATA/FE | Business Profile create/edit/archive/switch | IAM-002,DBF-003 | 4 | multiple business; archive preserves references |
| BUS-002 | DATA/FE | Page Context create/inherit/override | BUS-001 | 4 | effective knowledge explainable and isolated |
| BUS-003 | FE | Click-first onboarding + completeness shell | BUS-001,BUS-002,UIF-002 | 4 | no required prompt; save/resume works |
| BUS-004 | DATA | Cross-business/page security regression pack | BUS-001,BUS-002,IAM-004 | 4 | read/write/job/search/storage negative cases |
| AUD-001 | DATA/PLAT | Audit events role/policy/credential/connect/delete | IAM-004,PLF-003 | 3 | actor/scope/before-after/reason/query access controlled |

### 6.2 Meta Connection Vertical Slice

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| MCN-001 | META | Encrypted Meta credential store + token metadata | G1,PRV-001 | 3 | secret never returned/logged; rotation/revoke supported |
| MCN-002 | META | OAuth start/callback/state/PKCE-CSRF controls | MCN-001,MTA-002 | 4 | replay/mismatch/denial/expired flow tested |
| MCN-003 | META | Enumerate eligible Pages/IG + capability snapshot | MCN-002 | 4 | multiple assets, missing role/IG pairing handled |
| MCN-004 | META/FE | Connection selection/health/reconnect/disconnect UI | MCN-003,UXD-003 | 4 | non-tech copy and actionable recovery |
| MCN-005 | META | Token refresh/expiry/permission-health background check | MCN-001,PLF-002 | 4 | notification before/after invalidation, retry bounded |
| MCN-006 | DATA | Connection isolation/audit/rate-limit/security tests | MCN-002..005,AUD-001 | 3 | no cross-business connection use |

### Gate G2 — Tenant & Connection Alpha

- Pilot user สมัคร สร้าง Workspace เพิ่ม Business เชิญทีมและสลับ Page ได้
- ทุก Role/Business/Page isolation test ผ่าน
- เชื่อมหลาย Facebook Page/IG Professional และ reconnect ได้โดยไม่เห็นศัพท์เทคนิค
- Meta App Review package ส่งหรือพร้อมส่งตาม environment

---

## 7. Wave 3 / Phase 1B — Knowledge, Research, Suggestion และ Analysis

### 7.1 Business Knowledge และ Industry Pack Runtime

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| KNW-001 | DATA | Knowledge item/version/source/approval schema migration | G2,DAT-002 | 4 | immutable versions, effective snapshot, audit |
| KNW-002 | AI | Knowledge effective-resolution service Business→Page override | KNW-001,CTR-001 | 4 | deterministic resolution + explain output |
| KNW-003 | FE/AI | Knowledge cards/chips setup + completeness | KNW-002,BUS-003 | 5 | save/resume, recommended choices, no required free text |
| KNW-004 | AI | Import pipeline contract + website/document/Meta metadata initial adapters | KNW-001,PLF-002,CTR-005 | 6 | provenance, dedupe, preview/confirm, unsupported file error |
| KNW-005 | AI | Knowledge conflict/freshness/unsafe-claim validation P0 minimum | KNW-002,IND-002 | 4 | block/warn behavior tied to source and user action |
| KNW-006 | AI | Industry Pack loader/registry/version/policy | IND-001,CTR-007 | 4 | change pack without core code; incompatible version rejected |
| KNW-007 | QA | Knowledge leakage/inheritance/import regression | KNW-002..006 | 4 | cross-business prompt/retrieval negative suite |

### 7.2 Research, Evidence และ Suggestion

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| RSH-001 | DATA | Research brief/run/evidence/suggestion/feedback migrations | G2,DAT-003 | 4 | lineage, freshness, status, tenant indexes |
| RSH-002 | AI | Research adapter implementation + source policy enforcement | RSH-001,CTR-005,KNW-006 | 5 | allow/deny sources, timeout/rate/error normalized |
| RSH-003 | AI/PLAT | Background research orchestration + retry/cancel/result | RSH-002,PLF-002 | 5 | close browser/restart worker/retry safe |
| RSH-004 | AI | Evidence normalization, dedupe, freshness/expiry | RSH-002,RSH-003 | 4 | every factual suggestion traceable or rejected |
| RSH-005 | AI | Suggestion ranking by business/page/goal/audience/season | RSH-004,KNW-002 | 5 | deterministic inputs logged, no cross-business context |
| RSH-006 | FE | Suggestion feed/filter/save/reject/use + why/evidence sheet | RSH-005,UXD-005 | 5 | mobile click-first; empty/error/re-research actions |
| RSH-007 | PLAT/FE | Job Center + notification for research/analyze | RSH-003,PLF-004,UIF-003 | 3 | deep-link/result/unread/dedupe works |
| RSH-008 | QA | Research evidence, freshness, leakage and source-policy eval | RSH-002..007 | 5 | 0 cross-tenant leak; unsupported fact is blocked |

### 7.3 Content Analysis

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| ANL-001 | DATA | Analysis request/result/finding/evidence-link schema | RSH-001 | 3 | rubric/version/model/job trace preserved |
| ANL-002 | AI | Thai rubric evaluator structured output | QLT-001,ANL-001,KNW-002 | 5 | schema validation, actionable finding, evidence trace |
| ANL-003 | FE | Analysis UI “จุดที่ควรปรับก่อนโพสต์” | ANL-002,UXD-005 | 4 | no unexplained score; next action visible |
| ANL-004 | QA | Golden Set baseline run + error analysis | ANL-002,QLT-002,QLT-003 | 5 | threshold report, false allow/block catalog, version recorded |

### Gate G3 — Research Closed Pilot

- Pilot สร้าง/นำเข้า Knowledge และรู้ว่าข้อมูลใดควรเติม
- Suggestion ทุกใบมี business/page scope, reason, evidence และ freshness
- Background work recoverable และแจ้งเสร็จพร้อม deep link
- Golden Set Analysis ผ่าน threshold ที่ G0 กำหนด
- ไม่มี cross-business leakage จาก automated adversarial suite

---

## 8. Wave 4 / Phase 1C — Generate, Quality Gate, AI Router และ BYOK

### 8.1 Content Domain และ Editor

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| CNT-001 | DATA | Content brief/content/platform variant/version/state migrations | G3,DAT-004 | 5 | immutable versions, shared brief, platform variants |
| CNT-002 | AI | Brief builder จาก suggestion/knowledge/user selections | CNT-001,RSH-006 | 4 | source refs pinned, optional detail only |
| CNT-003 | FE | Create flow: business/page→goal/idea→media placeholder→result | CNT-002,UXD-006 | 5 | complete at 360 px with clicks; resume state |
| CNT-004 | FE/DATA | Autosave/version history/restore/concurrent edit guard | CNT-001,CNT-003 | 5 | no silent overwrite; restored version creates new revision |
| CNT-005 | FE | Facebook/Instagram variant editor + preview shell | CNT-003,CNT-004 | 5 | source vs variant clear; platform fields validated |

### 8.2 Provider-neutral AI และ Generation

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| AIR-001 | AI | Model registry/capability/cost/Thai-eval schema/service | CTR-005,CTR-006 | 4 | only curated enabled models selectable |
| AIR-002 | AI | AI router Auto mode + policy + cost ceiling | AIR-001,PLF-005 | 5 | selects capable model, logs reason/cost without prompt secret |
| AIR-003 | AI | Platform provider adapter 1 + contract tests | AIR-001,QAF-001 | 4 | success/timeout/rate/schema/safety cases pass |
| AIR-004 | AI | Provider adapters OpenAI/Anthropic/Gemini/xAI behind flags | AIR-003 | 8 | each passes same contract suite; disabled by default until eval |
| AIR-005 | DATA/AI | BYOK vault/validate/mask/revoke/provider-model binding | AIR-001,PRV-001 | 5 | server-only decrypt, rotation, invalid/limited key handling |
| AIR-006 | FE | Admin advanced AI settings + Auto default + BYOK flow | AIR-005,UXD-009 | 4 | hidden from non-admin/core flow; no raw model ID by default |
| AIR-007 | PLAT | AI retry/fallback/circuit breaker/idempotency/cancel | AIR-002,AIR-003,PLF-002 | 5 | no duplicate version/cost charge on retry |
| AIR-008 | QA | Provider capability/cost/security/redaction test matrix | AIR-003..007 | 5 | provider outage/fallback/key leak/cost cap evidence |

### 8.3 Generate และ Quality Gate

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| GEN-001 | AI/PLAT | Background generation orchestrator + structured result | CNT-002,AIR-002,AIR-007 | 5 | close page/restart/retry safe, result addressable |
| GEN-002 | AI | FB/IG caption/CTA/hashtag/media brief variants | GEN-001,CNT-001 | 5 | platform distinction and knowledge trace |
| GEN-003 | FE/AI | Quick refine actions + alternative generation | GEN-002,CNT-004 | 5 | new version, never overwrite approved/source version |
| GEN-004 | AI | Quality Gate service: clarity/fit/evidence/platform/CTA/risk | ANL-002,GEN-002 | 6 | block/warn/pass and actionable fixes |
| GEN-005 | AI | Restricted claim/risky phrase rules from Industry Pack | GEN-004,KNW-006 | 4 | Pack 1/Pack 2 produce different policies without core change |
| GEN-006 | FE | Quality issue UI + one-tap fix/review | GEN-004,UXD-006 | 4 | user sees what/why/action, not raw score |
| GEN-007 | PLAT/FE | Notification/job status/usage display for AI work | GEN-001,PLF-004,PLF-005 | 3 | payer/quota internally traceable; friendly user status |
| GEN-008 | QA | Generation Golden Set + human review + regression baseline | GEN-002..006,QLT-002 | 6 | threshold per dimension/provider/model/version |

### Gate G4 — AI Content Alpha

- Suggestion → Brief → Background Generate → FB/IG variants → refine → Quality Gate ครบ
- Provider outage/retry/fallback ไม่สร้าง version หรือ cost ซ้ำ
- BYOK secret ไม่ปรากฏ browser/log/error/analytics
- Golden Set ผ่าน threshold; risky claim policy พิสูจน์ได้มากกว่า 1 Industry
- User ปิดหน้าแล้วกลับมาเปิดผลพร้อม notification ได้

---

## 9. Wave 5 / Phase 1D — Asset Library, Approval, Calendar และ Preview

Asset และ Approval/Calendar เริ่มคู่ขนานได้หลัง `CNT-001` และ contract ที่เกี่ยวข้อง freeze แต่ Integration ต้องรวมที่ `WF-001`

### 9.1 Asset Library

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| AST-001 | DATA | Asset/version/upload-session/job/rights/tag/collection migrations | G4,DAT-006 | 5 | constraints/index/RLS/state ownership ตาม detailed spec |
| AST-002 | MEDIA | Storage adapter + private bucket/object-key policy/signed read | AST-001,CTR-005 | 5 | no public/list access; path scope not sole authorization |
| AST-003 | MEDIA | Quota reservation + resumable direct upload | AST-002,PLF-005 | 6 | resume/mobile network failure/over-quota/orphan cleanup |
| AST-004 | MEDIA | Byte-level validate MIME/signature/size/duration/dimension | AST-003 | 4 | spoofed extension, corrupt/unsupported files rejected safely |
| AST-005 | MEDIA/PLAT | Processing worker metadata/thumbnail/poster/derivatives | AST-004,PLF-002 | 6 | retry/idempotency/checksum/status/notification |
| AST-006 | MEDIA | Duplicate hash detection + use-existing flow | AST-004 | 3 | same business scope only; choice does not double charge storage |
| AST-007 | MEDIA/FE | Mobile library grid/search/filter/tag/collection/detail | AST-001,AST-005,UXD-007 | 7 | 360 px, keyset pagination, empty/loading/error |
| AST-008 | MEDIA/FE | Rights/license/consent/paid-ad/expiry/proof flow | AST-001,AST-007 | 5 | expired/missing right blocks relevant use with action |
| AST-009 | MEDIA/DATA | Content-asset link with immutable version pin | AST-001,CNT-001 | 4 | published/scheduled content resolves exact version |
| AST-010 | MEDIA | Used-by, trash/restore/purge and retention job | AST-009,PRV-002 | 5 | cannot silently break references; purge audited |
| AST-011 | QA | Upload/security/isolation/resume/processing/delete test pack | AST-002..010 | 6 | malicious/corrupt/duplicate/retry/cross-business cases |

### 9.2 Approval, Calendar และ Platform Preview

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| APR-001 | DATA | Approval request/decision/comment/state transition migrations | CNT-001,IAM-005 | 4 | allowed transitions, actor, version reviewed pinned |
| APR-002 | MEDIA/FE | Submit/review/approve/request-change/comment mobile flow | APR-001,UXD-008 | 6 | role/self-approval rules, notification/deep link |
| APR-003 | DATA | Approval invalidation on content/media/material change | APR-001,AST-009,CNT-004 | 4 | all material change vectors tested |
| CAL-001 | DATA | Schedule/calendar entry/channel-target/conflict migrations | CNT-001 | 4 | Asia/Bangkok input, UTC storage, DST-safe convention |
| CAL-002 | FE | Month/week/list/filter mobile calendar | CAL-001,UXD-008 | 6 | no drag dependency; 360 px usable |
| CAL-003 | FE/DATA | Date-time picker/create/move/duplicate/reschedule/cancel/conflict | CAL-001,CAL-002 | 5 | permission/state/notification rules |
| PRV-001A | FE/META | Facebook/Instagram preview + capability/media validation | CNT-005,AST-009,MTA-003 | 6 | warnings/errors match actual supported capabilities |
| WF-001 | INT/QA | Integrated flow Idea→Generate→Asset→Review→Approve→Schedule | AST-009,APR-002,APR-003,CAL-003,PRV-001A | 6 | E2E happy and recoverable failures on mobile |

### Gate G5 — Mobile End-to-end Pilot

- ผู้ใช้ non-tech ทำ `เลือกไอเดีย → สร้าง → เลือกสื่อ → ส่งตรวจ → อนุมัติ → ตั้งเวลา` ที่ 360 px ได้
- Approval เปิด/ปิด, self-approval policy และ invalidation ถูกต้อง
- Asset private/signed/version/rights/delete lifecycle ผ่าน security tests
- Calendar ใช้ Asia/Bangkok โดย DB/job ใช้ UTC อย่างถูกต้อง
- Platform preview/capability validation ตรงกับ Meta spike

---

## 10. Wave 6 / Phase 1E — Publishing, Metrics, Billing และ Production Hardening

### 10.1 Meta Publisher

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| PUB-001 | META/DATA | Publish target/job/attempt/remote-object/status migrations | G5 | 4 | one job per account/platform, state history immutable |
| PUB-002 | META | Publisher adapter for Facebook supported media | PUB-001,CTR-005,MTA-003 | 5 | contract/capability/error normalization tests |
| PUB-003 | META | Publisher adapter for Instagram supported media/container | PUB-001,CTR-005,MTA-003 | 6 | container readiness polling/timeout/recovery |
| PUB-004 | META/PLAT | Scheduler claim/lease/idempotency/late-job policy | PUB-001,PLF-002 | 5 | concurrent workers/restart do not duplicate posts |
| PUB-005 | META | Partial success per channel + retry only failed target | PUB-002..004 | 4 | FB success remains success when IG fails |
| PUB-006 | META/FE | Publish status, remote URL, reconnect/actionable failure | PUB-002..005,MCN-005 | 4 | Thai copy, deep link, safe retry |
| PUB-007 | META | Token/permission/capability drift handling | PUB-002,MCN-005 | 4 | preflight and runtime change both recoverable |
| PUB-008 | QA | Duplicate/race/late/timezone/outage/reconnect publishing suite | PUB-002..007 | 7 | zero duplicate in fault injection suite |

### 10.2 Metrics และ Feedback Baseline

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| MET-001 | META/DATA | Metric definition/source/granularity/schema | MTA-003,PUB-001 | 3 | metric semantics/permission/missing-data rule documented |
| MET-002 | META/PLAT | Background basic metrics sync/backfill/rate-limit | MET-001,PLF-002 | 5 | idempotent upsert, partial unavailable handled |
| MET-003 | FE | Basic content result view without causal ROI claim | MET-002 | 3 | unknown/missing displayed honestly |

### 10.3 Billing, Quota, Cost และ Admin Ops

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| BIL-001 | DATA/PLAT | Plan/subscription/entitlement/quota-period migrations | COM-001,PLF-005 | 4 | plan version pinned, grace/cancel states |
| BIL-002 | PLAT | Entitlement checks AI/research/storage/business/account/user | BIL-001 | 5 | server-side deny; no data loss at hard stop |
| BIL-003 | FE | Usage/quota/80%-warning/limit/upgrade contact flow | BIL-002 | 4 | non-tech units and next action |
| BIL-004 | PLAT | Payment/reconciliation/webhook or Beta manual billing adapter | COM-002,BIL-001 | 5 | idempotent payment event/refund/grace test |
| CST-001 | PLAT | Cost ledger AI/search/storage/egress/processing/support allocation | PLF-005,AST-005,MET-002 | 5 | reconcile provider invoice/sample within tolerance |
| CST-002 | PLAT | Cost anomaly alert + monthly storage review report | CST-001 | 3 | threshold, owner, notification, investigation link |
| ADM-001 | FE/PLAT | Admin health: workspace/jobs/connection/quota/module flags | OBS-002,BIL-002,PUB-006 | 5 | least privilege, audit, no secret display |
| ADM-002 | PLAT | Safe retry/replay/reconcile/support diagnostic tools | ADM-001,PLF-002 | 5 | dry-run/confirmation/audit/idempotency |

### 10.4 Production Security, Privacy, Reliability และ Release

| ID | Lane | Task/Deliverable | Depends | PD | Acceptance / Evidence |
|---|---|---|---|---:|---|
| SEC-101 | DATA/QA | Full RLS/API/job/storage authorization regression | G5,PUB-001,BIL-001 | 6 | every P0 data path allow/deny matrix passes |
| SEC-102 | QA | Threat model + dependency/secret/upload/rate-limit security test | G5,PUB-007 | 5 | critical/high resolved or risk formally accepted |
| PRD-001 | DATA/FE | PDPA consent/privacy/export/delete UI + orchestrated jobs | PRV-002,G5 | 6 | SLA/status/audit/backup caveat and cross-module delete |
| PRD-002 | DATA | Retention/purge schedule + legal hold/backup expiry behavior | PRV-002,PRD-001 | 4 | dry-run/report/recovery from failed purge |
| REL-001 | PLAT/QA | Backup configuration + checksum + restore drill | DBF-001,AST-005 | 5 | RPO/RTO measured; restore to isolated environment |
| REL-002 | QA | Load/capacity test HTTP/job/DB/storage/publish schedule bursts | G5,PUB-004 | 6 | targets met or scaling/limit decision documented |
| REL-003 | QA | Failure injection provider/queue/DB/network/worker restart | PUB-008,GEN-008,AST-011 | 6 | no loss/duplicate/cross-tenant; alerts fire |
| REL-004 | PLAT | SLO/dashboard/alerts/on-call severity/escalation | OBS-001,REL-002 | 4 | alert actionable, runbook linked, noise reviewed |
| REL-005 | INT | Incident, rollback, status communication, credential compromise runbooks | REL-001,REL-004 | 4 | tabletop exercise passed |
| QA-101 | QA | Full P0 traceability regression + mobile/browser/accessibility | SEC-101,PRD-001,PUB-008 | 7 | all release evidence attached; no critical failure |
| QA-102 | QA/FE | Pilot usability round 2 + Thai copy/support test | QA-101 | 4 | core task ≥90% without assisted technical explanation |
| RLS-001 | INT | Staging release candidate, migration rehearsal, go/no-go review | QA-101,QA-102,REL-005 | 4 | checklist sign-off, rollback point, support coverage |
| RLS-002 | INT | Paid Beta rollout 5–10 workspaces by cohort/feature flag | RLS-001,MTA-004,BIL-004 | 5 | monitored cohort, stop conditions, daily review first week |

### Gate G6 — Paid Production Beta

- Meta required permissions approved and production tokens work
- Publish fault tests show no duplicate; partial success/reconnect are actionable
- Billing/quota/cost ledger and 80% warning work
- RLS/security/PDPA export-delete/retention pass
- Database + original asset restore drill passes with measured RPO/RTO
- Mobile E2E/Pilot regression passes; monitoring/runbook/support ready
- Cost per active Workspace measurable and plan gross-margin hypothesis remains acceptable

---

## 11. Wave 7 / Phase 1.5 — Stabilization และ One-person Operations

รายการนี้เริ่มจาก production evidence ไม่ใช่ทำทุกข้อโดยอัตโนมัติ

| ID | Lane | Task/Deliverable | Trigger | PD | Exit Evidence |
|---|---|---|---|---:|---|
| STB-001 | PLAT/QA | 30-day reliability/cost/support baseline | หลัง G6 | 5 | cohort dashboard + top failure/cost drivers |
| STB-002 | FE | Guided onboarding/checklist/help clips | activation ต่ำกว่า target | 5 | time-to-first-value ดีขึ้นในการทดลอง |
| STB-003 | AI | Saved recipes/templates | repeated manual setup | 5 | adoption and output-quality comparison |
| STB-004 | MEDIA/FE | Bulk approve/schedule/tag | repeated batch pain | 6 | mobile batch safety/undo/permission |
| STB-005 | PLAT | Self-service billing/top-up/change plan | billing support สูง | 6 | reconciliation/refund/grace tests |
| STB-006 | PLAT | Provider/module diagnostic + safe rollout per workspace | provider variance | 5 | time-to-diagnose ลดลง |
| STB-007 | MEDIA | R2 backup/serving migration tooling | storage cost trigger | 8 | checksum/rollback/no broken URL rehearsal |
| STB-008 | AI | Performance feedback to suggestion | sufficient metric volume | 8 | offline evaluation; no cross-business learning |
| STB-009 | INT | GA readiness review | 30 days data | 3 | reliability/churn/support/cost/security gates pass |

### Gate G7 — General Availability Decision

- อย่างน้อย 30 วัน production evidence
- ไม่มี Critical tenant-isolation/data-loss/publish-duplicate incident ที่ยังไม่ปิด
- Publish reliability, support hours, activation/retention และ gross margin อยู่ใน guardrail
- Operational burden รองรับได้โดย one-person business หรือมีแผนเพิ่ม capacity ที่ชัดเจน

---

## 12. Phase 2–3 Backlog Packages หลัง Product-market Signal

| Package | Scope | Entry Gate | Estimate |
|---|---|---|---:|
| P2-INBOX | Meta comment/message webhook, lightweight conversation view | permission + ≥30% renewal demand | 20–30 PD |
| P2-ATTR | content/conversation link, UTM, attribution window, unknown bucket | P2-INBOX stable | 15–25 PD |
| P2-REV | manual/import qualified/won/revenue + confidence report | customer process defined | 15–25 PD |
| P3-IND | Additional Industry Pack tooling/expert review | ≥2 paying customers per candidate industry | 8–15 PD/pack |
| P3-AGY | Agency grouping, external approval portal, selected white-label | agency demand + support model | 30–45 PD |
| P3-AIR | OpenRouter adapter/advanced routing | clear cost/reliability benefit | 8–12 PD |
| P3-CHN | Additional social channel adapter | demand, API permission, economics | 20–35 PD/channel |
| P3-PLG | Third-party runtime plugin sandbox/marketplace | business case + security model | 60+ PD |

LinkedIn ยังคง Out of Scope จนกว่าจะมี decision เปลี่ยนอย่างเป็นทางการ

---

## 13. Integration Gates และ Merge Policy สำหรับหลาย Agent

### 13.1 Contract Freeze Levels

| Level | ความหมาย | เปลี่ยนได้อย่างไร |
|---|---|---|
| C0 Draft | สำรวจ/เสนอได้ | comment ใน contract PR |
| C1 Implementable | Agent downstream เริ่มใช้ได้ | backward-compatible change หรือ Integration approval |
| C2 Pilot Freeze | ใช้ใน E2E/Pilot | version bump + migration + consumer impact list |
| C3 Production | external/production persisted | additive-first, deprecation window, rollback/forward-fix |

### 13.2 Merge Order ต่อ Vertical Slice

1. Contract/schema proposal และ test vectors
2. Migration + repository/domain primitives
3. Fake adapter/contract test
4. Application service/API/job
5. UI states และ analytics
6. Real adapter/provider integration
7. Security/error/fault/E2E tests
8. Observability/runbook/docs
9. Integration owner verifies gate evidence

### 13.3 Agent Handoff Packet บังคับ

ทุก task ที่มอบ Agent ต้องมี:

- Task ID และ linked feature IDs เดิม
- Goal, non-goal และ user/role/business/page scope
- Input contracts/version และ files/modules ที่ Agent เป็นเจ้าของ
- Files/modules ที่ห้ามแก้
- Acceptance examples: happy, empty, unauthorized, retry/failure
- Test commands และ evidence path
- Dependency/consumer list
- Migration/feature flag/rollback requirement
- Cost/privacy/observability impact
- Completion summary: changed contract, assumptions, risks, follow-up

### 13.4 ป้องกัน Agent ชนกัน

- หนึ่ง Module/schema migration range มี owner เดียวต่อ Wave
- แยก branch/worktree ต่อ task; ห้ามแชร์ working branch
- Shared contract change merge ก่อน consumer; consumer pin contract version
- ห้าม Agent สองตัวสร้าง migration timestamp/sequence เดียวกัน
- Integration branch รับเฉพาะ PR ที่ CI/contract test ผ่าน
- Agent ที่ทำ provider adapter ใช้ fake contract ก่อน และไม่แก้ core orchestration เพื่อให้ adapter ตนผ่าน
- UI Agent ไม่ hardcode provider/status/state ที่ไม่มีใน public view model contract
- ทุก background consumer ต้องมี idempotency test ก่อน merge

---

## 14. Definition of Ready ระดับ Task

Task เป็น `Ready` เมื่อครบทุกข้อ:

1. มี Task ID, owner lane, estimate, dependency และ feature/release gate ที่รองรับ
2. User/role/workspace/business/page scope ชัด
3. Expected behavior, non-goal และ acceptance examples ชัด
4. Input/output API/event/job/module contract อยู่ระดับ C1
5. Schema owner, migration strategy และ data lifecycle ระบุแล้ว
6. Happy/empty/loading/error/unauthorized/retry state ระบุเมื่อเกี่ยวข้อง
7. Mobile wireframe พร้อมสำหรับ core interaction
8. Cost/quota/PDPA/security/support impact ถูกประเมิน
9. Test level/command/fixture/evidence owner ระบุ
10. Feature flag, rollout, rollback/forward-fix ระบุเมื่อมีความเสี่ยง

งานที่ไม่ครบ DoR ให้คงเป็น `Backlog/Needs clarification`; ห้ามให้ Agent เติม requirement สำคัญเอง

---

## 15. Definition of Done ระดับ Task/Slice/Release

### 15.1 Task Done

- Code/schema/UI ตรง C1+ contract และไม่มี direct cross-module write
- Unit/contract/integration tests ที่กำหนดผ่าน
- Authorization/RLS negative case ผ่านเมื่อแตะข้อมูล tenant
- Async task มี idempotency/retry/timeout/cancel/recovery ตามประเภทงาน
- Error ถูก normalize และ core user ไม่เห็นศัพท์เทคนิค/secret
- Log/trace/audit/usage/cost/analytics event ครบตาม impact
- Mobile 360/390/430 และ accessibility basic checks ผ่านเมื่อมี UI
- Migration deploy/rollback หรือ forward-fix ถูกทดสอบ
- Documentation, task status, assumptions และ known limitations อัปเดต

### 15.2 Vertical Slice Done

- เดิน E2E ตั้งแต่ UI ถึง database/job/provider และกลับมา notification/result ได้
- Happy path + recoverable provider/network failure + unauthorized + duplicate/retry ผ่าน
- Feature flag/kill switch และ operational dashboard พร้อม
- QA/Integration lane ลง evidence และยืนยัน consumer ทั้งหมด

### 15.3 Release Done

- Traceability matrix P0 ไม่มีช่องว่าง
- Security/PDPA/backup/restore/load/mobile/usability gates ผ่าน
- Runbook/alert/support/rollback พร้อมและ tabletop/rehearsal ผ่าน
- Cost/quota/reconciliation และ go/no-go sign-off พร้อม
- Rollout cohort และ stop condition ระบุชัด

---

## 16. Estimate และ Capacity Plan

### 16.1 Rough-order Estimate

| Phase/Wave | Effort Range | One-person Elapsed* | Parallel 6-lane Elapsed** |
|---|---:|---:|---:|
| W0 Readiness | 75–90 PD | 15–18 สัปดาห์ | 3–5 สัปดาห์ |
| W1 Foundation | 60–75 PD | 12–15 สัปดาห์ | 3–4 สัปดาห์ |
| W2 Tenant/Meta Connect | 50–65 PD | 10–13 สัปดาห์ | 3–4 สัปดาห์ |
| W3 Knowledge/Research/Analysis | 65–80 PD | 13–16 สัปดาห์ | 4–5 สัปดาห์ |
| W4 Generate/Quality/BYOK | 80–100 PD | 16–20 สัปดาห์ | 4–6 สัปดาห์ |
| W5 Asset/Approval/Calendar | 85–105 PD | 17–21 สัปดาห์ | 5–6 สัปดาห์ |
| W6 Publish/Commercial/Hardening | 120–150 PD | 24–30 สัปดาห์ | 6–8 สัปดาห์ |
| รวมถึง Paid Beta | **535–665 PD** | **ประมาณ 24–30 เดือนที่ 5 productive PD/สัปดาห์** | **ประมาณ 28–38 สัปดาห์ รวม integration/rework buffer** |

\* One-person elapsed แบบทำครบ production-grade ตาม WBS นี้ ไม่ใช่ prototype และยังต้องเผื่อ support/administration/learning  
\** สมมติ 5 implementation lanes + 1 Integration/QA lane, contract ไม่เปลี่ยนบ่อย, Agent work ผ่าน human review; ไม่ใช่เอา PD หาร 6 ตรง ๆ

ตัวเลขนี้สูงกว่า phase estimate เดิม เพราะแผนเดิมสรุปเป็น capability ระดับใหญ่ ส่วน WBS นี้รวม schema/contracts, UX ทุก state, security, evaluation, fault testing, operations, billing และ release evidence ที่จำเป็นต่อ Production

### 16.2 Lean Beta Cut หากต้องลดเวลา

ตัด/เลื่อนโดยไม่ทำลาย architecture:

- เปิด BYOK จริง 1 provider ก่อน; adapter อื่นคง fake/feature flag
- รองรับ media format ชุดจำกัดตาม Meta capability ที่พิสูจน์แล้ว
- Website import ก่อน document/Meta historical import
- Calendar month + list ก่อน week view
- Billing แบบ manual invoice/reconciliation ก่อน self-service payment
- Pack 1 Production; Pack 2 ใช้เฉพาะ evaluation ไม่เปิดลูกค้า
- Basic tag/collection ก่อน smart tag/bulk operations

ห้ามตัด: RLS/isolation, idempotent publish, secret protection, quality/risk gate, asset rights/version, backup restore, PDPA delete, monitoring และ mobile recoverable errors

---

## 17. Recommended Parallel Agent Assignment

### 17.1 รอบแรกหลัง G0

| Agent | Packet | Primary Tasks | ห้ามแก้โดยตรง |
|---|---|---|---|
| A1 Integration | Foundation/contracts | FND-001..004, contract versioning | domain tables ของ lane อื่น |
| A2 Data/Security | Tenant DB/RLS | DBF-001..004 | UI/provider adapters |
| A3 Platform | Job/outbox/notification | PLF-001..005, OBS-001 | business rules/content prompt |
| A4 Frontend | Design system/app shell | UIF-001..003 | DB schema/provider SDK |
| A5 Meta | Connection adapter | MCN-001..006 โดยเริ่ม fake/contract | core job implementation |
| A6 QA | Harness/fakes/evidence | QAF-001..002 | production business logic |

### 17.2 รอบ Research/AI

- A1 Integration ดู contract/merge/release gate
- A2 Data ทำ KNW/RSH/ANL migrations + RLS
- A3 Platform ทำ orchestration/job/notification/usage
- A4 Frontend ทำ Knowledge/Suggestion/Analysis/Create UI
- A5 AI ทำ pack/research/analysis/generation adapter
- A6 QA ทำ leakage/golden-set/provider failure regression

### 17.3 รอบ Asset/Workflow/Publish

- A1 Integration ทำ WF-001 และ state/contract review
- A2 Media ทำ upload/processing/rights/version
- A3 Workflow ทำ approval/calendar/state transition
- A4 Frontend ทำ library/approval/calendar/status
- A5 Meta ทำ publisher/metrics/reconnect
- A6 QA ทำ fault/security/mobile/E2E/release evidence

อย่าแจกทุก Feature ตั้งแต่วันแรก งานควรถูกปล่อยเป็น Wave หลัง dependency contract ผ่าน Gate มิฉะนั้น Agent จะผลิตโค้ดจำนวนมากที่เชื่อมกันไม่ได้

---

## 18. Milestone Calendar แบบ Parallel Team

เป็น target relative week หลัง G0; Meta Review เป็น external track

| Target | Milestone | Evidence |
|---:|---|---|
| Week 0 | G0 Scope & Contract Ready | ERD/contracts/wireframes/golden set/spikes approved |
| Week 4 | G1 Foundation Integrated | deploy + RLS/job/outbox/mobile shell/recovery |
| Week 8 | G2 Tenant & Connection Alpha | team/business/page/Meta connect E2E |
| Week 13 | G3 Research Closed Pilot | knowledge/evidence/suggestion/analysis + eval |
| Week 19 | G4 AI Content Alpha | generate/refine/quality/BYOK + golden set |
| Week 25 | G5 Mobile End-to-end Pilot | asset/approval/calendar/preview E2E |
| Week 33 | G6 Paid Beta | publish/billing/security/PDPA/restore/ops |
| Week 37–41 | Beta stabilization review | 30-day data and GA recommendation |

เพิ่ม contingency 15–25% ถ้า Meta permission, provider policy, video processing หรือ schema contract เปลี่ยนหลัง C2

---

## 19. Risks, Stop Conditions และ Owner

| Risk | Early Signal | Mitigation/Stop Condition | Owner |
|---|---|---|---|
| Meta App Review ช้า/permission ไม่ผ่าน | request rejected/unclear use case | ส่งตั้งแต่ W0, screencast/privacy/delete พร้อม; ห้าม Paid Beta ก่อน approval | META/INT |
| Cross-business data leak | negative test fail | stop release, revoke affected path, security review ทุก consumer | DATA/INT |
| Publish duplicate | remote ID mismatch/retry creates post | stop publisher, kill switch, reconcile, fix idempotency before resume | META/PLAT |
| AI claim ไม่ปลอดภัย | Golden Set false allow สูง | restrict industry/feature, human approval mandatory, adjust gate | AI/QA |
| BYOK support explosion | invalid key/model/provider errors สูง | default Auto, enable providers by cohort, diagnostics before expansion | AI/PLAT |
| Storage/video cost สูง | cost/active workspace exceeds guardrail | quota/format limits, derivative policy, R2 trigger review | MEDIA/PLAT |
| Agent merge conflict/rework | contract churn/direct cross-module edits | freeze C1, owner review, smaller vertical packets | INT |
| UX ยากสำหรับ non-tech | assisted completion/abandonment สูง | stop feature expansion, usability/copy iteration | FE/INT |
| One-person operational overload | support hours exceed reserve | limit cohort, pause sales, automate top diagnostics | INT/PLAT |

---

## 20. Backlog Traceability Checklist

ก่อน G6 ให้ตรวจว่า Feature group ใน Master Backlog ถูก trace อย่างน้อยหนึ่ง Task/Test/Gate:

- Account/Workspace/Team → IAM/AUD/SEC
- Business/Page/Meta Connection → BUS/MCN
- Business Knowledge/Industry → KNW/IND
- Research/Suggestion → RSH
- Content Analysis/Quality → ANL/QLT/GEN
- Generation/Editing → CNT/GEN
- AI/BYOK/Cost → AIR/PLF/CST
- Background Jobs/Notification → PLF/RSH/GEN/AST/PUB
- Asset Library → AST
- Calendar/Approval → CAL/APR/WF
- Publishing/Metrics → PUB/MET
- Thai Mobile UX → UXD/UIF และทุก E2E gate
- Billing/Admin/Security/Ops → BIL/ADM/SEC/PRD/REL
- Modular Platform → ARC/CTR/FND/QAF
- Lead/ROI/Expansion → Phase 2–3 package; ไม่อยู่ G6

---

## 21. เอกสารที่แต่ละ Agent ต้องอ่านก่อนรับ Task

1. `ai-content-os-master-plan-and-backlog-th.md` — Product scope/feature IDs/release gates
2. `technical-architecture-meta-content-os-th.md` — Stack/ADR/data/security/cost
3. `modular-plug-and-play-design-rules-th.md` — Module constitution/contracts/ownership
4. `asset-library-database-ux-spec-th.md` — Asset schema/state/security/mobile contract
5. เอกสาร WBS นี้ — dependencies/waves/gates/DoR/DoD

ถ้า requirement ในเอกสารขัดกัน ให้หยุด task และส่ง Decision Request ต่อ Integration owner ห้ามเลือกคำตอบเองโดยไม่มีบันทึก
