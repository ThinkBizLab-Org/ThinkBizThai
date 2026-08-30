# Gap Audit — AI Content OS แผนก่อนกระจายงานให้ Sub-agents

**สถานะ:** Audited Baseline v1.0  
**วันที่ตรวจ:** 30 สิงหาคม 2026  
**เอกสารที่ตรวจ:** Master Plan v1.0, Technical Architecture v0.7, Modular Rules v1.0, Asset Library Detailed Design v0.1 และ wireframe ที่มีอยู่  
**ข้อสรุป:** รายการที่กล่าวถึงก่อนหน้านี้ **อยู่ในแผนระดับ Phase/Backlog ส่วนใหญ่แล้ว** แต่ยังไม่ละเอียดถึงระดับที่หลาย Agent สามารถเริ่มเขียนงานพร้อมกันได้อย่างปลอดภัย เอกสารปัจจุบันบอกว่า “ต้องสร้างอะไร” ได้ดี แต่ยังขาด **dependency graph, contract จริง, schema นอก Asset, work package, test fixture และ owner ต่อไฟล์/ตาราง/contract**

## 1. Gap Register

| ID | Sev | Gap / ความเสี่ยง | หลักฐานหรือจุดชน | สิ่งที่ต้องตัดสิน/ส่งมอบก่อน Parallel Dev | Owner แนะนำ |
|---|---|---|---|---|---|
| G-01 | Blocker | Core Database ยังเป็นเพียงรายชื่อตาราง | Technical Architecture §6 ระบุชื่อ แต่มี field/FK/state/index/RLS จริงเฉพาะ Asset | Core ERD, table blueprint, ownership, migration order และ RLS matrix สำหรับ Identity, Business, Knowledge, Research, Content, Approval, Calendar, Jobs, Meta, Usage/Billing | Data/Kernel |
| G-02 | Blocker | Module contract เป็นแนวทาง ยังไม่ใช่ schema ที่ implement ได้ | Modular Rules §3, §6, §7 มีรายการ field/port แต่ไม่มี TypeScript interface, JSON Schema, error code และ example payload | Contract Pack v0.1: TenantContext, CommandResult, Job/Event envelope, UsageEvent, stable errors และ port schemas | Integrator/Architecture |
| G-03 | Blocker | ไม่มี dependency DAG/agent-ready work packages | Phase 1A–1E เป็นผลลัพธ์ระดับใหญ่ และ Immediate Queue เป็นลำดับเส้นเดียว | Epic → Slice → Task → dependency → input/output → acceptance → test fixture → file/table owner → estimate | Delivery/Integrator |
| G-04 | Blocker | State ownership ชนกันระหว่าง Content, Approval, Calendar และ Publishing | `CAL-005` รวม draft ถึง failed ใน state เดียว แต่ Modular Rules บอก aggregate มี owner เดียว; มีทั้ง `calendar_items`, `publish_intents`, `publish_jobs` | แยก state machine: Content lifecycle, Approval decision, Schedule lifecycle, Delivery lifecycle และนิยาม composed status สำหรับ UI | Content + Approval + Publishing |
| G-05 | Blocker | Shared primitives ยังไม่ถูกสร้างและ freeze | ทุก Module ต้องใช้ tenant, authz, outbox, job, idempotency, audit, usage, clock; หาก Agent สร้างเองจะเกิดหลาย implementation | Kernel contract + test harness + fake adapters + migration namespace ต้อง merge ก่อนเริ่ม Domain agents | Kernel/Integrator |
| G-06 | Critical | Ownership ของ table ซ้ำ/กำกวม | `usage_events` อยู่ Identity list แต่มี Usage module; `performance_snapshots` อยู่ Meta แต่มี Metrics; `generation_runs/ai_jobs/job_attempts` ทับ Job module; `content_asset_links` อยู่ Asset และ Content | Table ownership registry 1 table = 1 owner; association table owner; public read model/command ที่อีก Module ใช้ | Architecture/Data |
| G-07 | Critical | Cross-module FK ขัดกับกฎแยก Module และเสี่ยง migration cycle | Asset spec อ้าง `content_versions`, `auth.users`; `assets.current_version_id` กับ `asset_versions.asset_id` เป็นวงจร; rules อนุญาต FK เฉพาะ stable root | FK policy, composite FK, deferrable/creation order, association ownership และวิธีรองรับ extraction ภายหลัง | Data/Asset/Content |
| G-08 | Critical | Asset sharing มี 3 ความหมายปะปน | Asset ระบุ owner Business เดียว, มี `workspace_shared`, `asset_business_shares`; link บอก shared แล้วอาจ “link/clone” | เลือกให้ชัด: reference shared version หรือ clone immutable copy; rights/quota/delete/used-by คิดที่ใคร | Asset/Product |
| G-09 | Critical | P0 ใหญ่เกิน Production Beta และระยะเวลา 15–20 สัปดาห์มีความเสี่ยง | P0 รวม BYOK 4 ค่าย, import หลาย source, rights/backup, billing, metrics, full Media, Meta image/video/carousel, multi-page | ตัด Beta Minimum: Platform AI + BYOK 1 provider, image + short video subset, manual billing หรือ payment provider เดียว, Industry Pack เดียว; feature flag ส่วนอื่น | Product/Integrator |
| G-10 | Critical | Research source/policy ยังไม่ตัดสิน | มี Research Port/Evidence แต่ไม่มี provider, allowlist, robots/terms, source quality, copyright/snippet limit, cache/retention | Research Source ADR, evidence schema, citation/expiry policy, legal/source policy และ fixture set | Research |
| G-11 | Critical | Content Quality ยังไม่มี executable benchmark | Phase 0 กล่าว rubric/good-bad examples แต่ไม่มีจำนวน, pass threshold, reviewer agreement, regression process | Thai Golden Set v1, อย่างน้อย 50–100 cases/Industry, deterministic rules, scoring thresholds, human review rubric, CI eval budget | Quality/Product |
| G-12 | Critical | Industry Pack แรกยังไม่ถูกล็อกเป็น artifact | แผนบอก Beachhead 1–2 Industry แต่ไม่มี pack schema/content/owner/acceptance | ล็อก Built-in เป็น Pack v1; Skin-care เป็น risk-validation pack ถัดไป; license/source/restricted-claim rules | Industry/Research |
| G-13 | Critical | Meta integration ยังขาด spike deliverable ที่ใช้สร้างจริง | มี permission list และ flow แต่ไม่มี API version pin, app review matrix, test Page/IG, supported media matrix, rate limit fixture, webhook policy | Meta Spike Report + sandbox adapter + capability matrix + token lifecycle + idempotency reconciliation tests | Meta |
| G-14 | Critical | Social account uniqueness/ownership ยังไม่ชัด | หนึ่ง Workspace เชื่อมหลาย Page แต่ยังไม่ตัดสิน Page เดียวเชื่อมได้หลาย Workspace/Business หรือไม่ | External identity uniqueness, transfer/reconnect rules, owner permissions และ deauthorization behavior | Meta/Kernel |
| G-15 | Critical | Worker runtime ไม่เหมาะกับงาน Media บางชนิดและยังไม่มี runtime budget | Stackใช้ Next.js Route Handler; Asset ต้อง scan/FFmpeg/thumbnail/video; Vercel function limits/CPU/temp disk อาจชน | Job class → runtime mapping, timeout/memory/concurrency, dedicated media worker/managed processor decision, queue lease/heartbeat | Jobs/Asset/Ops |
| G-16 | Critical | Queue source of truth ซ้ำ | ใช้ Supabase Queues แต่มี `media_processing_jobs`, `ai_jobs`, `publish_jobs`, `job_attempts`, dead letters อีกชุด | นิยามว่า queue message vs domain job record ใครถือ status/retry/lease; ห้ามแต่ละ Moduleสร้าง queue framework เอง | Jobs/Architecture |
| G-17 | Critical | Billing/Payment/Tax ก่อน Paid Beta ยังไม่ตัดสิน | มีราคาและ Stripe reserve แต่ไม่มี provider, invoice/VAT, failed payment, refund, proration; self-serviceอยู่ 1.5 | เลือก manual invoice สำหรับ Closed Beta หรือ PaymentAdapter/provider เดียว; entitlement state machine และ webhook reconciliation | Billing/Product |
| G-18 | Critical | PDPA/Security ยังเป็น checklist ไม่ใช่ threat model | มี RLS/retention แต่ไม่มี data inventory, controller/processor roles, lawful basis, DPA/subprocessors, SSRF จาก website import, session/MFA/CSRF | Data inventory/retention matrix, threat model, admin MFA decision, SSRF/file scanning/webhook replay controls, breach/deletion runbook | Security/Ops |
| G-19 | High | Notification promise เกิน Phase 1 capability | Requirement บอกปิดแท็บแล้ว “ได้รับ Notification”; P0 มี in-app เท่านั้น ส่วน email/LINE เป็น P1 | ระบุว่า Phase 1 แจ้งเมื่อกลับเข้าแอป หรือย้าย email/web-push ขั้นต่ำเข้า P0; permission/fallback UX | Notification/Product |
| G-20 | High | Mobile upload acceptance อาจเกิน browser reality | Asset test คาด lock screen/network reconnect แล้วไม่หายทุกกรณี โดยเฉพาะ iOS background restrictions | Capability matrix iOS Safari/Android Chrome; define resume-on-return ไม่ promise background upload; real-device spike | Asset/UX |
| G-21 | High | Backup strategy ขัด/กำกวม | ADR บอกไม่ทำ hybrid วันแรก แต่ AST-012 backup original เป็น P0 และ Asset spec บอก R2 เป็น backup ได้ | ชี้ชัด “ไม่ hybrid serving” แต่ cross-provider backup ได้หรือไม่; RPO/RTO, encryption, checksum, restore owner และ cost | Ops/Asset |
| G-22 | High | UX ยังมี wireframe ละเอียดเฉพาะ Asset | Definition of Ready ต้องมี mobile wireframe แต่ Onboarding, Research, Generate, Approval, Calendar, Meta reconnect, Billing ยังไม่มีครบ state | Wireframe + state matrix: empty/loading/success/error/offline/permission denied/partial success ทุก Core Flow | UX/Product |
| G-23 | High | Accessibility ถูกเลื่อนไป P1 ทั้งที่บางข้อควรเป็น P0 | UX-011 อยู่ 1.5 แต่ Asset acceptance มี screen reader; non-tech/mobile ต้องรองรับพื้นฐานตั้งแต่ component แรก | P0 baseline: semantic labels, focus, contrast, keyboard, reduced motion; audit เชิงลึกไว้ 1.5 | UX |
| G-24 | High | API surface, BFF และ authorization boundary ยังไม่กำหนด | Next.js Route Handlers + Supabase direct/realtime แต่ไม่บอก clientเข้าตารางใดตรง, service role use, rate limits | Endpoint inventory, direct-client allowlist, server-only commands, authz mapping, pagination/error conventions | API/Kernel |
| G-25 | High | Environment/IaC/migration/release procedure ยังไม่ agent-ready | มี dev/staging/prod/CI กว้างๆ แต่ไม่มี seed, preview DB, secrets per env, migration lock, rollback/forward-fix | Repo convention, env contract, migration allocator, seed fixtures, feature-flag rollout, deploy/rollback checklist | Platform/Ops |
| G-26 | High | Observability/SLO ไม่มี owner/threshold ครบ | เอกสารขอ SLI/SLO แต่ตัวเลขมีเฉพาะ aggregate บางรายการ | SLO catalog per job/publish/upload, alert routing, trace/redaction schema, dashboards และ runbooks | Ops |
| G-27 | High | Usage/quota concurrency/settlement ยังไม่ละเอียด | มี reservation และ ledger แต่ไม่มี atomic reserve/release, retry payer, BYOK search payer, late provider cost reconciliation | Usage transaction contract, reservation state machine, reconciliation job, immutable ledger/adjustment model | Usage/Billing |
| G-28 | Medium | Metrics scopeยังไม่ชัดตาม Meta permission และ retention | `MET-001` ระบุ “เท่าที่ permission รองรับ” ซึ่งทดสอบ/estimateไม่ได้ | Metric catalog ต่อ FB/IG, sync cadence, backfill, unavailable mapping, retention และ UI disclaimer | Metrics/Meta |
| G-29 | Medium | Product analytics/experimentation events ยังไม่เป็น taxonomy | DoD บังคับ analytics event แต่ไม่มี naming/version/privacy/owner | Event taxonomy + schema registry + consent/retention + funnel dashboard | Product Analytics |
| G-30 | Medium | Onboarding/import อาจสร้าง dependency และความเสี่ยงสูงเกิน 1A/1B | import website/FB/IG/doc เป็น P0 แต่ involves crawler, parser, consent, file formats, SSRF, copyright | แบ่ง manual chips/cards P0; import Facebook profile/content subset P0 เมื่อ Meta spikeผ่าน; website/docs P1 หลัง security spike | Product/Knowledge |
| G-31 | Medium | Auth/Workspace edge casesยังไม่อยู่ Backlog | ownership transfer, last owner, invite expiry/revoke, email change, account deletion, workspace deletion/export | Identity state machine + edge-case acceptance + audit/retention | Kernel |
| G-32 | Medium | เอกสารมี drift/คุณภาพเล็กน้อย | Technical Architecture มีหัวข้อ `## 20` ซ้ำ; Asset วันที่ v0.1 เก่ากว่า master; version linksไม่มี change log | Documentation lint, decision log, traceability matrix Requirement → Task → Test → Release | Integrator |

## 2. Contradictions และ Decisions ที่ต้องล็อก

1. **One-person WIP vs Multi-agent parallelism** — Master §9 จำกัด WIP หนึ่ง Vertical Slice แต่ผู้ใช้ต้องการกระจายหลาย Agent พร้อมกัน แนะนำคง WIP ระดับ “หนึ่ง Integrated Release Train” และให้ Agent ทำงานขนานเฉพาะ package ที่ contract freeze แล้ว ไม่ใช่เปิดหลาย Product Slice ที่พึ่งกันเองพร้อมกัน
2. **BYOK สี่ Providerเป็น P0 vs ลด operational risk** — Architecture รองรับทุก Provider ได้ แต่ Production Beta ควรเปิด Platform AI + BYOK หนึ่ง Provider; Adapter อื่นทำ contract stub/feature flag และทยอยเปิดหลัง eval
3. **Modular ownership vs cross-module relational schema** — ยอมให้ FK ไป stable aggregate root เท่านั้น; association table ต้องมี ownerชัด และ write ผ่าน command ของ owner
4. **In-app notification vs “ปิดแท็บแล้วได้รับแจ้ง”** — ปิดแท็บแล้วงานยังทำต่อได้แน่นอน แต่จะรู้ทันทีต้องมี email/web push; ถ้าไม่ทำ P0 ต้องปรับคำสัญญา UX
5. **No hybrid storage vs backup originals** — แยกคำว่า serving path กับ backup target; ห้าม dual serving แต่สามารถ cross-provider backup หาก RPO/RTO ต้องการ
6. **Responsive Web vs mobile background behavior** — upload resume เมื่อกลับเข้าแอปทำได้ แต่ห้ามรับประกัน browser ทำงานต่อขณะ iOS suspend

## 3. Recommended Agent Ownership Boundaries

โครงสร้างด้านล่างเหมาะกับ Agent พร้อมกันสูงสุด 6–7 ตัว โดยมี Integrator หนึ่งตัวและห้ามแก้ shared filesนอก owner

| Agent | ขอบเขตเป็นเจ้าของ | เขียนได้ | ห้ามแก้โดยตรง | Contract ที่ต้องรับ/ส่ง |
|---|---|---|---|---|
| A0 Integrator/Architecture | Source of Truth, ADR, shared contracts, dependency DAG, merge/release | `contracts/`, architecture docs, shared config โดย approval | Domain implementation | TenantContext, Event/Job/Usage envelopes, version policy |
| A1 Kernel/Data/Security | Auth, Workspace, Membership, Business/Page context, RLS, audit, secrets handles | `modules/identity`, `modules/business`, kernel migrations/tests | Content/AI/Meta tables | Authz query, tenant resolver, scoped credential handle |
| A2 Knowledge/Research/Industry | Knowledge versions, Industry Pack, source/evidence, suggestions, research adapter | `modules/knowledge`, `industry`, `research` | AI router/content tables | KnowledgeSnapshot, ResearchBrief, EvidenceBundle, Suggestion |
| A3 AI/Content/Quality | Content brief/version/variants, AI router, provider adapter, quality rules/eval | `modules/ai`, `content`, `quality` | Knowledge/Asset/Approval state | consumes KnowledgeSnapshot/Evidence; emits ContentVersion/QualityResult |
| A4 Asset/Media | Asset DB/RLS, upload, processing, rights, storage/media adapters | `modules/assets`, asset migrations/worker | Content lifecycle/publish tables | AssetSelection/Ready/Blocked events; content link command |
| A5 Approval/Calendar/UX | Approval, schedule intent, mobile Design System/Core flows, notification view models | `modules/approval`, `calendar`, feature UI | Publish delivery/Meta token state | consumes immutable ContentSnapshot; emits Approved/ScheduleRequested |
| A6 Meta/Publishing/Ops/Billing | OAuth, FB/IG capability, publish/metrics workers, billing/usage reconciliation, observability | `modules/meta`, `publishing`, `metrics`, `billing`, deployment/runbooks | Content/Approval tables | consumes ScheduleSnapshot; emits DeliveryResult/MetricSnapshot/UsageAdjustment |

**ถ้างาน A6 ใหญ่เกินไป:** แยก Ops/Billing เป็นรอบถัดไป ไม่ควรเพิ่ม Agent ให้แก้ kernel/migrationsพร้อมกัน การมี Agent เยอะกว่านี้ก่อน contracts freeze จะเพิ่ม merge conflict มากกว่าความเร็ว

## 4. งานที่ไม่ปลอดภัยให้ทำขนานทันที

ต้องทำตามลำดับก่อนเปิด Domain agents เขียน implementation:

1. Repo/bootstrap, package manager lockfile, TypeScript/ESLint/test config และ folder convention
2. Tenant/Authz model, ID types, clock/timezone, error model
3. Migration 000–00x สำหรับ Workspace/Business/Page + RLS test harness
4. Event/Job/Outbox/Idempotency/Usage envelopes และ schema registry
5. Table ownership registry + migration number allocator
6. Design System shell, route/navigation convention และ Thai message catalog
7. Fake Adapter harness และ contract-test runner

งานที่ห้าม Agent consumer implement จากการเดา:

- Asset ↔ Content link และ approval invalidation
- Content/Approval/Calendar/Publishing status
- Research Evidence → AI input snapshot
- Usage reservation/reconciliation
- Meta target snapshot และ publish idempotency
- Secret handle/BYOK decryption boundary

## 5. Merge Rules สำหรับหลาย Agent

1. ใช้ branch/worktree แยกต่อ Agent; ห้ามหลาย Agent แก้ working tree เดียวโดยไม่มี file ownership
2. A0 เป็นเจ้าของ shared files: root configs, lockfile, contract schemas, migration registry, main docs และ CI workflow
3. หนึ่ง table/migration/route/event type มี ownerเดียว; registry ต้องระบุ owner ก่อนเริ่มงาน
4. Migration เป็น append-only; จอง prefix/range ต่อ Agent เช่น Kernel `01xx`, Research `02xx`, Content `03xx`, Asset `04xx`, Workflow `05xx`, Meta/Ops `06xx`; ห้ามแก้ migration ที่ merge แล้ว ให้ forward-fix เท่านั้น
5. Contract change ใช้ RFC/ADR สั้นและเพิ่ม version; ห้ามแก้ schema กลางเงียบๆใน PR ของ Domain
6. Producer merge contract + fixture ก่อน Consumer; Consumer พัฒนากับ fixture/fake ไม่ import private implementation
7. Cross-module write ต้องผ่าน public command/event; query ต้องผ่าน declared read model ห้าม join private columnเพื่อความเร็วชั่วคราว
8. PR หนึ่งรายการต้องเป็น vertical-safe increment, มี feature flag และไม่ทำให้ historical data อ่านไม่ได้
9. CI บังคับ lint/type/unit/contract/RLS/migration-from-clean/migration-from-previous/idempotency และ mobile smoke testตาม scope
10. ห้าม merge provider SDK response, raw secret, signed URL ระยะยาว หรือ tenant identifiersที่ไม่ redact ลง log/fixture
11. Definition of Done ต้อง trace `Requirement ID → Contract → Code owner → Tests → Release gate`
12. หาก shared contract เปลี่ยน major ให้หยุด merge consumer จน compatibility window/dual-read ถูกออกแบบ

## 6. Integration Cadence

| Cadence | กิจกรรม | Output |
|---|---|---|
| ก่อนเริ่ม 2–4 วัน | Readiness/Contract Sprint | G-01–G-08 ปิด, contract v0.1, schema ownership, fixtures, DAG |
| ทุกวัน | 15 นาที integration check แบบ async | blocker, contract change, migration collision, environment health |
| วันละ 1–2 รอบ | Merge train โดย A0 | PR เล็กที่ CI เขียว; shared changes mergeก่อน consumers |
| ทุก 48 ชั่วโมง | Full integration build | clean DB migration, contract suite, RLS isolation, queue replay, app smoke |
| ทุกสัปดาห์ | Vertical Slice demo บน staging | 1 flowครบ UI→API→DB→Job→Noti→Observability; pilot acceptance |
| สิ้น Phase | Release Gate review | evidence against exit criteria, cost/security/restore, backlog re-baseline |

**Stop-the-line conditions:** tenant leakage, duplicate publish, lost job/result, migration divergence, secret exposure, irreversible data loss หรือ consumer/producer contract mismatch ให้หยุด feature merge ทั้ง train จนแก้และเพิ่ม regression test

## 7. Recommended First Parallel Wave

หลัง Readiness/Contract Sprint เท่านั้น:

- **A1:** Workspace/Business/Page + RLS + authz fixture
- **A2:** Industry Pack v1 + Evidence/Suggestion schema + fake Research adapter
- **A3:** Content Brief/Version + fake AI adapter + Quality Golden Set runner
- **A4:** Asset Slice 1–2 + fake Storage/Media adapter
- **A5:** Design System + Mobile flows โดยใช้ fixture contracts; Approval state machine ยังไม่เขียน DB จน Content contract freeze
- **A6:** Meta technical spike + fake Publisher; ยังไม่ผูก production token/billing

Integration Slice แรกควรเป็น: **เลือก Business → เลือก Suggestion fixture → สร้าง Content ด้วย fake AI → แนบ Asset fixture → ส่งตรวจ → ตั้งเวลาแบบ fake → เห็น Notification** เพื่อพิสูจน์ boundary ทุก Moduleก่อนเพิ่ม provider จริง

## 8. คำตัดสินสุดท้าย

แผนเดิมไม่ได้ขาดหัวข้อหลัก แต่ยังขาด “ชั้น Execution Specification” สำหรับการกระจายงานพร้อมกัน ควรเพิ่มเอกสารกลางอย่างน้อย 5 ชุดก่อนเริ่ม Dev หลาย Agent:

1. Core Database + RLS Specification
2. API/Event/Module Contract Pack v0.1
3. Dependency DAG + Agent Work Packages พร้อม acceptance/test fixture
4. Mobile Core Flow Wireframes + State Matrix
5. Quality Golden Set + Industry Pack v1 + Meta Spike Report

เมื่อห้าชุดนี้พร้อม จึงเริ่ม Agent Wave แรกได้โดยมีโอกาสรื้อ/ชนกันต่ำลงอย่างมาก
