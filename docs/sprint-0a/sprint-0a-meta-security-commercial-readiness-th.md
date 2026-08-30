# Sprint 0A — Meta, Security, Commercial & Production Readiness

สถานะ: **Execution Baseline v1.0 — Proposed / Awaiting Evidence**  
วันที่จัดทำ: 30 สิงหาคม 2026  
ขอบเขตผลิตภัณฑ์: Thai SME AI Content PaaS — Facebook + Instagram, Multi-workspace, Multi-business, Multi-page  
เจ้าของเอกสาร: Product/Architecture Integrator  
ผู้อนุมัติ Gate: Product Owner + Architecture Lead + Security Reviewer + QA Lead

> เอกสารนี้เป็นแผน Sprint 0A และแบบฟอร์มหลักฐาน ไม่ใช่รายงานผลการทดสอบ Meta จริง ณ วันที่จัดทำยังไม่มีหลักฐานว่าได้ใช้ Meta App, Test Business, Test Page/Instagram Professional Account หรือ Production credentials ทดสอบแล้ว ทุกช่องที่ระบุ `UNVERIFIED` ต้องมีผู้รับผิดชอบและหลักฐานก่อนเปลี่ยนสถานะ

---

## 1. เป้าหมายและ Definition of Done

Sprint 0A มีเป้าหมายปิดความไม่แน่นอนที่อาจทำให้ Production Beta ใช้งานจริงไม่ได้ ได้แก่ Meta permission/App Review, การปกป้องข้อมูลและ secret, PDPA, Billing แบบ manual, Environment/CI/CD, Observability/DR และ Release Evidence

Sprint นี้ถือว่าเสร็จเมื่อ:

1. มี Meta capability matrix ที่ pin Graph API version และแนบผลทดลองจาก Test App/asset จริง
2. มีรายการ permission เท่าที่จำเป็น พร้อม use case, screencast script และ App Review owner
3. มี Threat Model ที่ระบุ control, test case และ residual risk owner
4. มี Data Inventory/Retention Matrix และกระบวนการ export/delete ที่ Product Owner และผู้ให้คำปรึกษากฎหมายตรวจแล้ว
5. ล็อก Manual Billing Baseline สำหรับ Closed/Paid Beta พร้อม reconciliation และ entitlement rules
6. ล็อก Environment, CI/CD, secret, promotion และ rollback contract
7. มี SLI/SLO, RPO/RTO, alert routing และ runbook draft ที่ทดสอบได้
8. มี Release Evidence Pack และหลักฐานการ review/test แบบแยกหน้าที่
9. External blocker ทุกข้อมี owner, due date, fallback และ stop condition

สิ่งที่ **ไม่ถือเป็น Done**:

- เขียน adapter โดยใช้ mock แล้วสรุปว่า Meta integration ผ่าน
- มี unit test แต่ไม่มี Test Page/IG evidence
- มี privacy policy แต่ไม่มี data inventory/delete workflow
- มี backup configuration แต่ไม่เคย restore
- Author review หรือ approve งานตัวเอง
- ใช้ Production token ในเครื่องนักพัฒนาหรือ CI log

---

## 2. สถานะหลักฐานมาตรฐาน

ใช้สถานะเดียวกันทุก Track:

| สถานะ | ความหมาย | ใช้ตอนไหน |
|---|---|---|
| `PROPOSED` | ข้อเสนอที่ยังไม่อนุมัติ | Design/decision draft |
| `APPROVED` | ผู้มีอำนาจอนุมัติแนวทางแล้ว | Decision/contract |
| `IMPLEMENTED` | มี code/config แล้ว | ยังไม่แปลว่าผ่าน test |
| `VERIFIED-TEST` | ผ่าน test environment พร้อมหลักฐาน | ห้ามเรียก production-ready |
| `VERIFIED-PROD` | ตรวจใน production ด้วยวิธีปลอดภัย | ใช้หลัง release/canary |
| `BLOCKED-EXTERNAL` | รอ provider/legal/accounting | ต้องมี fallback และ owner |
| `FAILED` | ไม่ผ่าน acceptance criteria | ต้องมี defect/owner |

หลักฐานทุกชิ้นต้องมี `evidence_id`, วันที่, environment, commit SHA, ผู้ทำ, ผู้ตรวจ, test data classification และ link ไปยัง artifact ที่ไม่เปิดเผย secret

---

## 3. รูปแบบทีม Software Engineering สำหรับ Codex + Claude

### 3.1 แบ่งตามหน้าที่และความถนัด ไม่แบ่งตามชื่อโมเดลอย่างเดียว

Codex และ Claude สามารถสลับบทบาทได้ตามผล benchmark ของ repository แต่ในหนึ่ง Work Item ต้องแยกผู้เขียนกับผู้อนุมัติ การกำหนดค่าเริ่มต้นคือ:

| บทบาท | งานหลัก | หลักฐานส่งมอบ | ห้ามทำ |
|---|---|---|---|
| Author / Builder | เขียน implementation, migration, adapter, config, unit/component test | PR, design note, local test result, rollback note | approve PR ตัวเอง |
| Independent Reviewer | ตรวจ contract, correctness, maintainability, failure paths และ backward compatibility | review checklist + blocking/non-blocking comments | แก้ใหญ่เองแล้ว approve เอง |
| Independent Tester / QA | เขียน test จาก acceptance criteria, exploratory/E2E/chaos/retry test | test plan, run, screenshots/log references, defect IDs | เชื่อเฉพาะ test ที่ Author ให้มา |
| Security Reviewer | threat model, authz, secrets, SSRF, webhook replay, dependency/security scan และ abuse cases | security review + residual risk decision | approve code ที่ตนเป็น Author |
| Product/UX Acceptor | ตรวจภาษาไทย non-tech, mobile flow, error recovery และ commercial rules | UAT evidence + accepted/rejected decision | เปลี่ยน technical contract โดยไม่แจ้ง Integrator |
| Integrator / Release Captain | คุม contract, dependency, merge order, environment promotion, evidence completeness | release manifest + go/no-go record | override failed security/QA gate คนเดียว |
| Ops/Incident Owner | SLO, dashboards, alert, runbook, backup/restore, incident drill | operational evidence | ซ่อน incident หรือปิด alert เพื่อให้ gate ผ่าน |

### 3.2 Suggested skill allocation

| ประเภทงาน | Primary profile | Independent counter-role |
|---|---|---|
| OAuth/Meta adapter, idempotency, queue worker | Coding agent ที่เก่ง integration/concurrency | Reviewer คนละ family + QA ที่ออกแบบ timeout/retry cases |
| Threat model, permission minimization, privacy | Agent ที่เก่ง security/system reasoning | Security human/agent คนละ session + legal/accounting signoff |
| CI/CD/IaC/observability | Coding agent ที่เก่ง platform automation | Ops tester ทำ deploy/rollback/restore drill |
| Contract/spec/schema review | Agent ที่เก่ง long-context/consistency checking | Builder ทำ proof-of-contract + contract tests |
| Mobile Thai UAT | Product/UX agent + ผู้ใช้จริง | QA บันทึก task completion/error recovery |

ห้ามใช้คำว่า “Codex เป็น Writer เสมอ” หรือ “Claude เป็น Reviewer เสมอ” ให้ทำ benchmark ด้วย task ตัวอย่าง 3–5 ชิ้น แล้วบันทึก defect escape rate, review precision, test coverage gap และ turnaround time เพื่อจัด Skill Matrix ตามความสามารถจริง

### 3.3 Four-eyes rule และ minimum assignment

งาน P0 แต่ละรายการต้องมีอย่างน้อย:

- Author 1 ราย
- Independent Reviewer 1 ราย ซึ่งไม่ใช่ agent/session เดียวกัน
- Independent Tester 1 ราย ซึ่งสร้าง test จาก contract ไม่ใช่จาก implementation
- Security Reviewer เพิ่มสำหรับ OAuth, secret, webhook, RLS, billing, export/delete และ deployment

ตัวอย่าง Assignment ID:

| Work item | Author | Reviewer | Tester | Security | Gate owner |
|---|---|---|---|---|---|
| META-OAUTH-01 | Codex-Integration-01 | Claude-Architecture-01 | Codex-QA-02 | Claude-Security-01 | A0 Integrator |
| META-PUB-01 | Claude-Backend-02 | Codex-Concurrency-01 | Claude-QA-02 | Codex-Security-02 | A0 Integrator |
| OPS-CICD-01 | Codex-Platform-01 | Claude-Platform-01 | Codex-OpsTest-01 | Claude-Security-01 | Release Captain |

ชื่อด้านบนเป็น template ไม่ใช่การจอง agent จริง

---

## 4. Work Packages และ Dependency

| Package | Owner skill | Dependency | Deliverable | Gate |
|---|---|---|---|---|
| `M0` Meta inventory | Meta Integration | Scope lock | app/permission/asset inventory | G0-META-A |
| `M1` Meta technical spike | Meta Backend | M0 + Test assets | capability evidence | G0-META-B |
| `M2` App Review pack | Product + Meta | M1 + privacy URLs | submission-ready pack | G0-META-C |
| `S0` Threat model | Security Architecture | Data/module map | threats/controls/tests | G0-SEC-A |
| `P0` PDPA/retention | Privacy/Product | Data inventory | ROPA/retention/DSR baseline | G0-PRIV-A |
| `C0` Manual billing | Commercial/Ops | Pricing scope | invoice/reconcile/entitlement baseline | G0-COM-A |
| `O0` Env/CI/secrets | Platform | repo/module contract | delivery contract | G0-OPS-A |
| `O1` SLO/DR | SRE/Ops | O0 + system topology | SLO/RPO/RTO/runbooks | G0-OPS-B |
| `Q0` Release evidence | QA/Release | all above | test/evidence/go-no-go pack | G0-REL |

งานที่ทำขนานได้: `M0`, `S0`, `P0`, `C0`, `O0`, `Q0 draft`  
งานที่ห้ามอ้างว่าจบก่อน dependency: `M1` ต้องรอ Test assets/credentials, `M2` ต้องรอ M1 evidence และ public privacy/data deletion endpoints, `G0-REL` ต้องรอ independent reviews

---

## 5. Meta Feasibility และ App Review Spike Plan

### 5.1 ขอบเขต Meta สำหรับ Lean Beta

P0 target:

- เชื่อม Facebook Page หลาย Page ต่อ Workspace
- เชื่อม Instagram Professional account ที่ระบบค้นพบและผู้ใช้มีสิทธิ์
- map แต่ละ channel เข้ากับ Business Profile/Page Context
- publish ภาพเดี่ยวและข้อความที่ capability รองรับ
- carousel เฉพาะเมื่อ spike ผ่านจริง
- video/Reel อยู่หลัง feature flag จน media matrix, processing/status และ App Review ผ่าน
- schedule ภายในระบบด้วย background job; ณ เวลาส่งให้ revalidate token/capability/media
- แสดง partial success แยก Facebook/Instagram
- reconnect/revoke/deauthorization และลบ token

Out of scope Sprint 0A:

- Inbox/DM, lead ROI, comment management
- Ads/Marketing API
- LinkedIn/TikTok
- การรับรองว่าทุกรูปแบบ media ใช้ได้โดยยังไม่ทดลอง

### 5.2 Meta assets ที่ต้องเตรียมโดยมนุษย์/บัญชีเจ้าของ

| Asset | Requirement | Owner | Evidence | Current status |
|---|---|---|---|---|
| Meta Developer App | แยก Development/Test และ Live ตาม policy | Business Admin | app ID redacted screenshot | `UNVERIFIED` |
| Verified business/Tech Provider path | ประเมินตาม business type/use case ปัจจุบัน | Founder/Legal | dashboard status | `UNVERIFIED` |
| Test Facebook Page | มีผู้ใช้/role ที่ทดสอบได้ | Meta Owner | page ID hashed | `UNVERIFIED` |
| Test IG Professional account | เชื่อม/มองเห็นตาม flow ที่เลือก | Meta Owner | account type + mapping evidence | `UNVERIFIED` |
| App roles/test users | least privilege | Meta Owner | role list redacted | `UNVERIFIED` |
| Public privacy URL | ภาษาไทย + อังกฤษถ้าจำเป็น | Product/Legal | reachable URL | `UNVERIFIED` |
| Data deletion instructions/callback | ทำงานจริงและ trace request ได้ | Backend/Privacy | request/result evidence | `UNVERIFIED` |
| Terms/support/contact URLs | public/reachable | Product | HTTP evidence | `UNVERIFIED` |

ห้ามส่ง token, app secret, signed request หรือข้อมูลผู้ใช้จริงลง issue/PR/evidence bundle

### 5.3 Permission inventory — candidate, not approved fact

รายการ permission ต้อง derive จาก endpoint จริงและตรวจ Meta Permissions Reference ณ วันที่ implement/submission ไม่ควร request แบบเผื่ออนาคต

| Use case | Candidate permission/feature | Need decision | Spike evidence | Status |
|---|---|---|---|---|
| แสดง Page ที่ผู้ใช้จัดการ | `pages_show_list` | endpoint/role/access level | sanitized request/response | `UNVERIFIED` |
| อ่านข้อมูลพื้นฐาน/ตรวจสิทธิ์ Page | `pages_read_engagement` | fields ที่จำเป็นจริง | field-level evidence | `UNVERIFIED` |
| publish Facebook Page | `pages_manage_posts` | create/edit/delete subset | created post ID + cleanup | `UNVERIFIED` |
| ค้นหา/จัดการ business assets | `business_management` เฉพาะถ้าจำเป็น | หลีกเลี่ยงถ้า discovery flow ไม่ต้องใช้ | negative/positive test | `UNVERIFIED` |
| IG account identity/basic profile | ตรวจตาม Instagram API flow ปัจจุบัน | login product และ account type | discovery evidence | `UNVERIFIED` |
| publish IG Professional content | ตรวจ permission ปัจจุบันตาม Content Publishing docs | image/carousel/reel subset | container/status/media ID | `UNVERIFIED` |
| metrics | แยก permission ต่อ metric catalog | P0 หรือ defer | unavailable mapping | `UNVERIFIED` |

หลักฐานเชิงนโยบายจาก Meta ที่ใช้เป็น starting point ได้แก่ [Permissions Reference](https://developers.facebook.com/docs/permissions/), [Access Levels](https://developers.facebook.com/docs/graph-api/overview/access-levels/), [App Review FAQ](https://developers.facebook.com/docs/apps/review/faqs/) และ [Screen Recordings](https://developers.facebook.com/docs/app-review/submission-guide/screen-recordings/) แต่รายการสุดท้ายต้องยืนยันอีกครั้งเมื่อ pin API version และยื่น review

### 5.4 Graph API version pinning contract

- ห้ามใช้ implicit/default version
- config `META_GRAPH_API_VERSION` ต้องกำหนดแยก environment และอยู่ใน approved compatibility matrix
- SDK/API adapter ต้อง log version, operation name, request correlation ID และ Meta trace/header ที่ไม่ใช่ secret
- upgrade version เป็น change request แยก มี contract tests, regression, changelog review และ rollback window
- ห้าม hard-code version กระจายใน business logic; มี Meta adapter หนึ่งจุด
- ทุก capability result ระบุ `observed_at`, API version และ account/page type

Template:

| API version | First tested | Last tested | Supported operations | Known gaps | Sunset/review date | Evidence |
|---|---|---|---|---|---|---|
| `TBD` | — | — | — | — | — | `UNVERIFIED` |

### 5.5 Capability Matrix template

บันทึกผลแยกตาม Facebook Page และ Instagram account เพราะ capability อาจไม่เหมือนกัน ห้าม infer จาก channel อื่น

| Capability ID | Channel | Operation | Media | Account/Page precondition | Permission | API endpoint/version | Async status | Limit observed | Expected UX | Result | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-FB-001 | FB Page | text post | none | eligible Page + user role | TBD | TBD | TBD | TBD | โพสต์ได้/บอกวิธีแก้ | `UNVERIFIED` | — |
| CAP-FB-002 | FB Page | image post | jpg/png subset | TBD | TBD | TBD | TBD | TBD | validate ก่อนส่ง | `UNVERIFIED` | — |
| CAP-FB-003 | FB Page | carousel | image set | TBD | TBD | TBD | TBD | TBD | partial not allowed/defined | `UNVERIFIED` | — |
| CAP-FB-004 | FB Page | video/Reel | video subset | TBD | TBD | TBD | yes/TBD | TBD | ออกหน้ารอได้ | `UNVERIFIED` | — |
| CAP-IG-001 | IG Professional | image | jpg subset | supported professional account | TBD | TBD | container | TBD | container status | `UNVERIFIED` | — |
| CAP-IG-002 | IG Professional | carousel | media set | TBD | TBD | TBD | container | TBD | validate set | `UNVERIFIED` | — |
| CAP-IG-003 | IG Professional | Reel | video subset | TBD | TBD | TBD | container | TBD | processing notification | `UNVERIFIED` | — |
| CAP-X-001 | FB+IG | same content fan-out | compatible variants | both connected | combined | adapter | per delivery | n/a | partial success shown | `UNVERIFIED` | — |

ต้องเพิ่ม negative cases:

- token expired/revoked
- user no longer has Page permission
- IG account disconnected/changed type
- unsupported dimensions/codec/file size/duration
- rate limited
- temporary provider error
- timeout before response
- timeout after provider may have succeeded
- duplicate click/replayed job
- scheduled content edited after approval
- one channel succeeds, another fails

### 5.6 Technical Spike Cases

| Test ID | Scenario | Required setup | Expected evidence | Acceptance |
|---|---|---|---|---|
| META-T01 | OAuth/login success | Test App + role | callback audit without token | CSRF state/nonce validated; account consent captured |
| META-T02 | Page/IG discovery | multiple test assets | sanitized IDs/mapping | no duplicate; only authorized assets |
| META-T03 | reconnect/idempotent sync | same assets twice | DB diff | no duplicate social account |
| META-T04 | revoke/deauthorize | revoke action | token unusable + local state | state becomes action-required; secret removed/disabled |
| META-T05 | FB image publish | compliant test image | provider post ID + visible result | exactly one post effect |
| META-T06 | IG image publish | compliant image | container/status/media ID | status polled safely; one media effect |
| META-T07 | partial fan-out | force one channel fail | two delivery records | success retained; failed retry isolated |
| META-T08 | ambiguous timeout | proxy/test adapter fault | reconciliation trace | retry does not create duplicate |
| META-T09 | rate limit | simulator or allowed test | normalized error | backoff/jitter; user action only if needed |
| META-T10 | media invalid | fixture matrix | validation report | rejected before provider call where predictable |
| META-T11 | schedule revalidation | expire token after schedule | delivery state | no silent loss; notification/reconnect |
| META-T12 | delete data request | test user request | deletion audit | tokens/personal data handled by policy |

ทุก test แยก 3 ชั้น:

1. Contract test กับ Fake Meta Adapter — ทำได้ใน CI
2. Integration test กับ Meta Test assets — ต้องมี credential และเก็บ evidence
3. Safe production smoke — ทำหลัง approval เท่านั้น ใช้ dedicated internal asset และ cleanup plan

### 5.7 App Review package checklist

- app use case อธิบายด้วยภาษาธุรกิจ ไม่ใช่ technical jargon
- ขอ permission เท่าที่ demo ใน flow จริง
- screencast แยกทุก permission/feature ตามข้อกำหนดปัจจุบันของ Meta
- reviewer credentials/test path ไม่ติด MFA ที่ reviewer เข้าไม่ได้
- test Page/IG มีข้อมูลตัวอย่างและล้างข้อมูลส่วนบุคคลจริง
- privacy policy, terms, support, data deletion URL เปิดจาก public internet
- step-by-step reviewer notes มี expected result และจุดที่ permission ถูกใช้
- UI ชื่อ/ข้อความตรงกับวิดีโอ ณ commit ที่ submit
- เจ้าของ submission, resubmission SLA, rejection taxonomy และ decision log
- lock release branch ระหว่าง record กับ submission หรือทำ versioned reviewer environment

Submission Tracker:

| Permission/feature | Business reason | UI path | Screencast | Test credential | Submitted | Result | Rejection/action | Owner |
|---|---|---|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | secure channel | — | `NOT SUBMITTED` | — | Meta Lead |

### 5.8 Meta data/token lifecycle

States:

`not_connected → connecting → active → action_required → revoked/deauthorized → disconnected`

Rules:

- token ciphertext อยู่ใน secret store ไม่อยู่ใน UI/log/event payload
- DB domain recordเก็บเฉพาะ credential handle, scopes, expiry/last validated, account IDs ที่จำเป็น
- refresh/extend/token inspection ใช้ adapter และ audit
- revoke/deauthorize ทำให้ scheduled jobs หยุดด้วย actionable state ไม่ retry รัว
- permission reduction ต้อง re-discover capability
- disconnect ไม่ลบ publish/audit history ที่ต้องใช้ตาม retention ทันที แต่ต้องตัด access secret
- Page/account transfer ระหว่าง Workspace ต้องมี explicit owner confirmation และ uniqueness decision

---

## 6. Threat Model

### 6.1 Assets และ trust boundaries

Assets สำคัญ:

- Workspace/business/page data
- Business Knowledge และ research evidence
- Draft/approved/scheduled content
- Asset originals/versions/rights evidence
- Meta access tokens, AI BYOK keys, webhook secrets
- user identity/session/MFA state
- billing/invoice/payment evidence
- usage/cost ledger
- audit/security logs และ backup

Trust boundaries:

1. Mobile/browser ↔ Web/API
2. Web/API ↔ Auth/Database/Storage
3. API ↔ Queue/Worker
4. Worker ↔ AI/Search/Meta/Email providers
5. Admin UI ↔ privileged operations
6. CI/CD ↔ cloud environments
7. Production ↔ backup/observability systems

### 6.2 Threat register

| ID | Threat/abuse case | Impact | Required controls | Verification | Owner |
|---|---|---|---|---|---|
| SEC-01 | Cross-workspace IDOR/RLS bypass | data breach | tenant context, RLS, authz query, deny-by-default | negative RLS/API matrix | Data/Security |
| SEC-02 | Page mapped to wrong Business | publish wrong brand | immutable target snapshot, owner confirmation, capability display | E2E wrong-target cases | Meta/QA |
| SEC-03 | Stolen Meta/BYOK secret | account/cost compromise | envelope encryption, secret handle, no read-back, rotation/revoke | log scan + secret tests | Security |
| SEC-04 | OAuth CSRF/account linking attack | attacker links account | state/nonce/PKCE where supported, session bind, one-time callback | security integration test | Meta/Security |
| SEC-05 | Webhook spoof/replay | fake state/cost/event | signature verify, raw body, timestamp/replay cache, idempotency | replay/tamper fixtures | Backend/Security |
| SEC-06 | Queue replay/duplicate publish | duplicate public posts | idempotency key, external operation ledger, reconcile ambiguous success | chaos/retry test | Publishing |
| SEC-07 | SSRF via website import/media URL | internal network/metadata access | URL allow rules, DNS/IP validation per redirect, egress proxy, size/time limit | SSRF suite | Knowledge/Security |
| SEC-08 | Malicious upload/polyglot/archive | malware/resource exhaustion | MIME sniff, limits, quarantine, scan, safe processors, no active content | malicious fixture test | Asset/Security |
| SEC-09 | Prompt injection from research/import | data exfiltration/bad content | source trust labels, tool allowlist, no secret in prompt, output schema, human gate | injection Golden Set | AI/Security |
| SEC-10 | Stored XSS in content/research | account compromise | output encoding, sanitization, CSP, no raw HTML | browser security tests | Frontend |
| SEC-11 | Privilege escalation through Admin | tenant takeover | role matrix, step-up auth for owner/security actions, audit | authz/E2E test | Identity |
| SEC-12 | Secret in log/trace/error | credential exposure | structured redaction schema, deny fields, sampling controls | automated log scanner | Platform |
| SEC-13 | CI dependency/supply-chain attack | build compromise | lockfile, provenance, review, SAST/SCA, protected branches, least-privilege OIDC | pipeline evidence | Platform/Security |
| SEC-14 | Production data copied to staging | privacy breach | synthetic/test data only; export control | environment data audit | Ops/Privacy |
| SEC-15 | Asset signed URL leakage | content exposure | short TTL, scoped route, revocation strategy, no public bucket | access test | Asset |
| SEC-16 | Approval bypass after edit | unapproved post | approval pins immutable content+asset version; edit invalidates approval | state machine test | Workflow |
| SEC-17 | Cost/usage race or tamper | financial loss | atomic reservation, immutable ledger, signed provider reconciliation | concurrency/property test | Billing |
| SEC-18 | Account enumeration/login abuse | takeover/privacy | generic errors, rate limit, monitoring, optional MFA | abuse test | Identity |
| SEC-19 | Backup unavailable/corrupt | permanent loss | encrypted backup, checksum, restore drill | measured restore | Ops |
| SEC-20 | Insider misuse/support overreach | privacy/publish damage | least privilege, JIT support access, reason code, immutable audit | access review | Security/Ops |

### 6.3 Mandatory security gates

ห้ามผ่าน G0/G6 ถ้า:

- ยังไม่มี cross-tenant negative test
- secret สามารถ read-back จาก client/API/log
- webhook ไม่มี signature/replay control
- publish retry ไม่มี idempotency/reconciliation
- website import เปิดโดยไม่มี SSRF control
- upload processing ไม่แยก quarantine
- approval ไม่ pin version
- Admin critical action ไม่มี audit
- ยังไม่มี restore drill ก่อน Paid Beta

Residual risk ต้องมี `risk_owner`, `business_impact`, `temporary_control`, `expiry_date` และ written acceptance; ห้ามใช้ “รับทราบ” โดยไม่มีวันหมดอายุ

---

## 7. PDPA และ Data Retention Requirements

> ส่วนนี้เป็น engineering baseline ไม่ใช่คำแนะนำทางกฎหมาย ต้องให้ที่ปรึกษากฎหมายไทยตรวจบทบาทผู้ควบคุม/ผู้ประมวลผล, ฐานกฎหมาย, privacy notice, DPA, cross-border transfer, breach process และระยะเก็บก่อน Paid Beta อ้างอิงหลักจาก [พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562](https://www.ratchakitcha.soc.go.th/DATA/PDF/2562/A/069/T_0052.PDF), [ประกาศมาตรการรักษาความมั่นคงปลอดภัย พ.ศ. 2565](https://www.ratchakitcha.soc.go.th/DATA/PDF/2565/E/140/T_0028.PDF) และ [ประกาศบันทึกรายการกิจกรรมการประมวลผล](https://www.ratchakitcha.soc.go.th/DATA/PDF/2565/E/140/T_0026.PDF)

### 7.1 Data role decision worksheet

| Processing activity | Data subject | Customer role | Platform role | Subprocessor | Lawful basis | Notice/DPA | Decision |
|---|---|---|---|---|---|---|---|
| Workspace member account | customer staff | TBD | likely controller for service account/TBD | Auth/email | TBD | platform privacy | Legal review |
| Page/IG connection | page admin/staff | TBD | processor/controller by purpose/TBD | Meta | TBD | privacy + DPA | Legal review |
| Imported business knowledge | customer/end customer may appear | controller/TBD | processor/TBD | AI/search/storage | TBD | customer instruction | Legal review |
| Generated content | may include personal data | controller/TBD | processor/TBD | AI provider | TBD | usage notice | Legal review |
| Analytics/telemetry | users/device | TBD | controller/TBD | observability provider | TBD | privacy/cookie | Legal review |
| Billing/invoice contact | payer/contact | TBD | controller/TBD | accounting/email/payment | TBD | contract/legal | Legal review |

### 7.2 Data inventory and draft retention matrix

ระยะด้านล่างเป็น **ค่าตั้งต้นเพื่อออกแบบระบบ ไม่ใช่ระยะกฎหมายที่อนุมัติแล้ว**

| Data class | Examples | Classification | Draft active retention | Draft post-closure | Delete/anonymize action | Exception/legal hold |
|---|---|---|---|---|---|---|
| Identity/profile | name, email, membership | Personal/Confidential | account active | 30–90 days/TBD | delete/anonymize | fraud/legal/TBD |
| OAuth/token secret | Meta token, BYOK | Restricted secret | while connected | immediate revoke/delete target | destroy ciphertext/key handle | none unless legal requirement |
| Social identifiers | Page/IG IDs, admin mapping | Personal/Confidential possible | connected + audit need | 90–180 days/TBD | unlink/hash/delete | publish audit/TBD |
| Business Knowledge | products, brand rules, docs | Customer confidential | subscription active | 30–90 days/TBD | delete objects/index/vectors | legal hold |
| Research evidence | URLs, excerpts, source metadata | Customer/possibly public | 12 months/TBD | 90 days/TBD | delete/anonymize personal fields | provenance dispute |
| Draft/content/version | caption, approval, target | Customer confidential | active | 12–24 months/TBD | delete/anonymize actor | contractual/audit |
| Asset original/version | images/videos/rights proof | Customer confidential/personal possible | active | 30–90 days/TBD | object purge + derivative purge | rights dispute/legal hold |
| Publish/delivery/audit | Meta IDs, states, actor | Confidential | active | 12–24 months/TBD | minimize/anonymize | accounting/dispute |
| Usage/cost/billing | quota, invoice, adjustments | Financial/confidential | contract + statutory/TBD | statutory period by accountant | restrict/anonymize where allowed | tax/legal |
| Application logs | IP, user ID, error | Confidential | 30 days target | n/a | rotate/delete | security incident |
| Security audit logs | privileged action, auth event | Restricted | 12 months target | n/a | immutable then expire | investigation/legal |
| Backups | encrypted DB/assets | inherits source | rolling 7–35 days/TBD | natural expiry | crypto erase/expiry | incident/legal |

### 7.3 Privacy requirements by design

- data minimization: เก็บ fields/permission เท่าที่ใช้จริง
- purpose limitation: ห้ามนำ customer content ไป train model โดย default โดยไม่มี contract/notice/choice ที่ชัด
- provider contract: บันทึก retention/training/data location ของ AI/search/storage/observability provider
- separate tenant: RLS + application authorization + storage access control
- data subject request: access/correct/export/delete/restrict/objection ตาม legal decision
- deletion orchestration ครบ DB, storage, vector/search index, queue payload, secret, cache และ subprocessors
- backup caveat ใน privacy notice: deleted data อาจคงใน encrypted backupจนหมดรอบและไม่ restore กลับสู่ active systemโดยไม่ re-delete
- record of processing activities และ subprocessor register
- consent ไม่ใช้เป็นคำตอบทุกกรณี; lawful basis ต้องตัดสินตามกิจกรรม
- breach workflow ต้องให้ Privacy/Legal ยืนยันเกณฑ์และระยะเวลาแจ้ง; engineering ต้อง detect, preserve evidence, scope affected tenant และ contact owner
- cross-border/data location assessment สำหรับ Singapore region และ provider ต่างประเทศ

### 7.4 DSR workflow acceptance

`request received → identity/authority verified → scope resolved → hold conflicts checked → export/delete jobs → subprocessor actions → verification → response/audit → closure`

Test cases:

- member ขอข้อมูลตัวเอง
- Workspace Owner ขอ export ธุรกิจ
- ผู้ไม่มีสิทธิ์ขอข้อมูล Workspace
- delete ขณะมี scheduled publish
- delete ขณะ job retry
- delete asset ที่ถูก pin ใน published audit
- delete แล้ว restore backupเข้า isolated environment
- account disconnect แต่ยังรักษา invoice/legal recordอย่างจำกัด

---

## 8. Commercial Baseline — Manual Invoice for Beta

### 8.1 Decision proposal

สำหรับ Closed/Paid Beta 5–10 Workspace:

- ใช้ Manual invoice/payment confirmation/reconciliation ก่อน
- ยังไม่สร้าง self-service card checkout, proration, coupon, automated dunning หรือ refund engine
- entitlement เป็นระบบใน product ไม่ผูกกับการส่ง invoice ด้วยมือ
- ผู้ดูแลการเงินยืนยันสถานะรับชำระผ่าน Admin action ที่มี reason/evidence/audit
- usage quota/cost ledger ทำตั้งแต่ Beta แม้ invoice manual
- เอกสารภาษี/VAT/ใบเสร็จ/หัก ณ ที่จ่ายและ retention ให้ accountant/legal ไทยกำหนดก่อนเก็บเงินจริง

สถานะ: `PROPOSED — Product Owner and Accountant approval required`

### 8.2 Billing state model

Account state:

`trial → pending_invoice → active → payment_due → grace → suspended → cancelled`

Invoice state:

`draft → issued → payment_reported → verified_paid → void/credit_adjusted`

Rules:

- only authorized Billing Admin changes financial state
- `verified_paid` ต้องมี actor, timestamp, reference/evidence hash
- ห้ามแก้ ledger entry; ใช้ adjustment entry
- suspension หยุด generate/publish ใหม่ตาม policy แต่ยังให้ export/delete/account access ที่จำเป็น
- scheduled content ก่อน suspension ต้องตัดสิน explicit: stop by default และแจ้งผู้ใช้
- grace period/notification cadence ต้องอนุมัติ product
- BYOK ไม่ลด platform subscription อัตโนมัติ; AI cost allocation แยก platform-paid/customer-paid
- quota reserve/release เป็น atomic และ retry-safe

### 8.3 Manual reconciliation checklist

| Step | Owner | Evidence | Separation |
|---|---|---|---|
| create customer/plan quote | Sales/Product | approved offer | not payment verifier |
| issue invoice | Finance | invoice ID | not developer |
| receive payment evidence | Finance | bank/reference | restricted |
| verify settlement | Finance Reviewer | bank statement match | second person when feasible |
| activate entitlement | system/Admin command | audit event | command idempotent |
| monthly reconcile | Finance + Ops | invoice vs ledger vs entitlement | exception list |
| tax/receipt action | Accountant | compliant document | external/legal rule |

### 8.4 Commercial decisions still required

- legal entity/seller name and invoicing system
- VAT registration/status and document wording
- payment channels and proof standard
- refund/cancellation/effective date
- grace period and data retention after cancellation
- plan upgrade/downgrade handling during Beta
- overage blocked vs manually approved add-on
- trial limits and support SLA
- who can view financial evidence

ห้าม Paid Beta ก่อน accountant/legal signoff และ invoice rehearsal หนึ่งรอบด้วยข้อมูลทดสอบ

---

## 9. Environment, CI/CD และ Secrets Contract

### 9.1 Environment contract

| Environment | Purpose | Data | Meta | Secrets | Deployment |
|---|---|---|---|---|---|
| Local | developer/unit/contract | fixtures only | Fake adapter default | local dev secret manager; no prod | developer |
| Preview/PR | UI/API review | synthetic isolated | Fake adapter | ephemeral/scoped | automatic per PR |
| Test | integration/E2E | synthetic seeded | Test Meta App/assets | test-only | main/controlled |
| Staging | release candidate/ops drill | synthetic; no production clone | Test Meta App/assets | staging-only | promoted artifact |
| Production | customer workload | real tenant data | approved Live App | prod-only/JIT | approval gate/canary |

Rules:

- environment มี project/account/bucket/queue/database แยก logical boundary ชัดเจน
- production data ห้าม copy ลง non-production
- same build artifact promote ข้าม environment; config แยกจาก artifact
- migrations append-only, expand/contract, forward-fix; backup/checkก่อน destructive change
- Feature Flag แยก Facebook, Instagram, carousel, video/Reel, BYOK provider และ self-service billing
- worker และ web version compatibility ต้องรองรับ rolling deploy

### 9.2 Secret contract

- secret ไม่อยู่ใน git, markdown, screenshots, test fixtures, client bundle, error, analytics หรือ agent prompt
- CI ใช้ short-lived identity/OIDC ถ้า platform รองรับ ลด long-lived deploy keys
- runtime secret อ่านเฉพาะ service/operation ที่ต้องใช้
- BYOK/Meta token encrypted at rest ด้วย managed key; domain DB เก็บ handle
- ห้าม UI/API ส่ง secret เดิมกลับ; แสดง provider/last four or fingerprint/status เท่านั้น
- rotation/revoke, last-used, scope และ owner audit
- secret scan pre-commit/CI + periodic repository/history scan
- agent ต้องได้รับ redacted fixtures; ห้าม paste credentials ให้ Codex/Claude

### 9.3 CI pipeline contract

Required checks:

1. format/lint/typecheck
2. unit tests + coverage trend
3. contract tests for module ports/adapters
4. migration validation + schema/RLS tests
5. SAST, dependency/SCA, secret scan, license policy
6. build reproducibility/artifact checksum/SBOM
7. integration/E2E with fake providers
8. selected Meta Test integration in protected scheduled/manual job—not on untrusted PR
9. mobile 360px accessibility/critical flow test
10. deployment smoke + rollback readiness

Branch/release controls:

- protected main; required independent review
- CODEOWNERS by module/contract/security areas
- no direct production deploy from agent workspace
- release manifest pins commit, migrations, flag state, API version, evidence IDs
- emergency hotfix still requires retrospective reviewer/test within defined SLA

### 9.4 Deployment and rollback

- canary/internal Workspace ก่อน pilot cohort
- DB change backward compatibleก่อน code switch
- worker drain/lease behavior documented
- kill switch per Meta channel/capability/provider
- rollback code ไม่ rollback data blindly
- failed publish jobs quarantine ไม่ replayทั้งหมด
- post-deploy verify auth, queue, generation fake/safe, asset, notification และ Meta safe smokeตาม approval

---

## 10. Observability, SLO, RPO และ RTO Draft

### 10.1 Telemetry contract

ทุก request/job/delivery มี correlation IDs:

- `request_id`
- `workspace_id` แบบ internal pseudonymous ID
- `job_id`
- `content_id/version_id`
- `delivery_id`
- `provider_operation_id` เมื่อปลอดภัย
- `module`, `operation`, `attempt`, `result_code`, `latency_ms`

ห้าม log prompt เต็ม, caption/customer contentเต็ม, access token, BYOK key, signed URL, invoice evidence หรือข้อมูลส่วนบุคคลเกินจำเป็น

### 10.2 Draft SLI/SLO catalog

เป้าหมายด้านล่างเป็น initial proposal สำหรับ Beta ต้องปรับหลัง load/spike และ cost review

| Service journey | SLI | Draft SLO | Window | Alert proposal |
|---|---|---|---|---|
| App/API | successful eligible requests | 99.5% | rolling 30d | burn rate fast/slow |
| Auth/tenant access | valid login+authorized request success | 99.5% | 30d | security/error split |
| Background jobs | eligible jobs terminal within target | 95% within 5 min for text | 7d | queue age p95 > target |
| Asset upload | valid uploads reach ready/clear failure | 98% | 7d | stuck processing count |
| AI generation | provider-eligible jobs reach result/actionable fail | 95% within 3 min | 7d | provider error/rate spike |
| Scheduled publish dispatch | jobs attempted near scheduled time | 99% within ±5 min | 30d | late queue >2 min |
| Meta delivery | eligible provider calls terminal/actionable | 98% excluding user permission/provider outage, reported separately | 30d | failure/ambiguous/duplicate |
| Notification | critical action notification queued | 99% within 2 min | 7d | backlog/failure |
| DSR jobs | request processed within approved policy SLA | 100% | monthly | any breach of internal target |

SLO exclusions ต้องกำหนดล่วงหน้าและ report แยก ห้ามตัด provider failureออกจน SLO ดูดีโดยไม่แสดง user impact

### 10.3 Draft RPO/RTO

| Data/service | Draft RPO | Draft RTO | Method | Verification |
|---|---|---|---|---|
| Core Postgres | ≤ 24h Beta target; aim lower per backup capability/cost | ≤ 8h | managed backup/PITR decision | isolated restore drill |
| Asset originals | ≤ 24h | ≤ 24h | object version/backup decision + checksum | sampled/full restore |
| Secrets/credentials | no backup export in plain; recover by reauth/rotation | ≤ 4h for service config; customer reconnect may vary | managed secret store/reauth | rotation drill |
| Queue jobs | ≤ 15 min/TBD | ≤ 2h | durable queue + outbox/replay | outage/replay drill |
| Audit/billing ledger | ≤ 24h target; stricter if manual reconciliation depends | ≤ 8h | DB backup + immutable export/TBD | reconcile after restore |
| App deployment | artifact loss near zero | ≤ 2h | immutable artifact/IaC | rollback/redeploy drill |

ห้ามประกาศ RPO/RTO เป็น commitment จน provider configuration และ measured restore evidence ยืนยันแล้ว

### 10.4 Alerts และ runbooks P0

- auth/RLS anomaly
- secret/decryption error
- queue age/dead-letter growth
- AI provider error/rate/cost spike
- upload/processing stuck
- Meta token invalidation/permission loss
- publish failure/ambiguous/duplicate indicator
- schedule late/missed
- DB/storage capacity and error
- billing entitlement reconciliation mismatch
- backup failed/restore evidence expired
- suspicious Admin action

Alert ทุกตัวต้องมี severity, owner, user impact, immediate mitigation, dashboard link, runbook, escalation และ noise review date

### 10.5 Incident severity draft

| Severity | Example | Response target draft | Required action |
|---|---|---|---|
| SEV-1 | cross-tenant data exposure, mass wrong publish, secret compromise | acknowledge ≤15 min | stop/kill switch, incident commander, preserve evidence, privacy/legal |
| SEV-2 | publishing unavailable/missed schedules for cohort | ≤30 min | mitigate, status/support, backlog recovery |
| SEV-3 | degraded provider/isolated Workspace issue | business hours ≤4h | workaround/fix backlog |
| SEV-4 | cosmetic/non-critical | planned | normal backlog |

Targets must match actual one-person/on-call capacity before contractual publication

---

## 11. Test Strategy และ Release Evidence Plan

### 11.1 Test pyramid by responsibility

| Layer | Primary author | Independent owner | Scope |
|---|---|---|---|
| Unit/property | Feature Author | Reviewer checks quality | state/validation/idempotency primitives |
| Contract | Module Author | Integrator/consumer author | ports/events/errors/provider fixtures |
| Integration | Backend/Platform | QA | DB/RLS/queue/storage/test provider |
| E2E | QA | Product acceptor | Thai mobile user journey |
| Security | Security tester | Security reviewer | authz, SSRF, replay, secret, upload, supply chain |
| Resilience | QA/Ops | Release Captain | retry, timeout, queue outage, restore, rollback |
| UAT | Product/user pilot | QA records evidence | non-tech/mobile/business correctness |

### 11.2 Mandatory test suites

1. Tenant isolation matrix: every role × every tenant-owned resource × read/write/delete
2. Meta contract fixture suite: success/invalid/rate/revoked/timeout-before/timeout-after/partial
3. Exactly-once-effect publishing test
4. Approval/version pinning and schedule revalidation
5. Asset quarantine/rights/expiry/unsupported media
6. PDPA export/delete and backup re-delete behavior
7. Billing entitlement/ledger concurrency/reconciliation
8. Secret/log redaction automated scan
9. Deployment migration compatibility and rollback drill
10. Mobile 360px/offline/background completion/notification/recovery
11. Thai non-tech UAT: no code/model/token/queue jargon in normal screens
12. Load test for queue/schedule burst and media upload limits

### 11.3 Release Evidence Pack

Directory/artifact structure proposal:

```text
release-evidence/<release-id>/
  manifest.md
  decisions.md
  approvals.md
  tests/
    unit-contract-summary.md
    integration-summary.md
    e2e-uat-summary.md
    security-summary.md
    resilience-summary.md
  meta/
    capability-matrix.md
    app-review-status.md
    sanitized-test-evidence.md
  privacy/
    data-inventory-version.md
    dsr-test-summary.md
  operations/
    dashboards-alerts.md
    backup-restore-drill.md
    rollback-drill.md
  commercial/
    entitlement-reconciliation.md
```

`manifest.md` ต้องมี:

- release ID, commit SHA, build checksum/SBOM
- migration listและ rollback/forward-fix note
- environment/config/feature flag snapshot โดยไม่มี secret
- Graph API version และ supported capability set
- known limitations/residual risks
- test evidence IDs and failure waivers
- Author/Reviewer/Tester/Security signoffs
- go/no-go decision และเวลา

### 11.4 Go/No-Go criteria

No-Go เมื่อ:

- P0 test failed หรือ evidence หาย
- Author เป็นผู้เดียวที่ review/test
- Meta permission/capability ที่ release ใช้ยัง `UNVERIFIED`
- App Review/Live access ยังไม่พร้อมแต่จะเปิดลูกค้านอก app role
- cross-tenant/security/secret/duplicate publish defectยังเปิด
- data deletion/privacy URLs ไม่ทำงาน
- invoice/entitlement reconciliation rehearsal ไม่ผ่าน
- backup restore ไม่เคยวัด
- alert ไม่มี owner/runbook

Conditional Go อนุญาตเฉพาะ feature ที่ปิดด้วย flagและไม่กระทบ P0; waiver ต้องมี expiry และ owner

---

## 12. External Blockers and Dependency Register

| ID | External dependency | Why blocker | Owner | Fallback | Stop condition | Status |
|---|---|---|---|---|---|---|
| EXT-01 | Meta Developer App/business access | ทดสอบ OAuth/API จริงไม่ได้ | Founder/Meta Admin | Fake adapter only | ห้าม claim integration passed | OPEN |
| EXT-02 | Test Page + IG Professional | capability/media testไม่ได้ | Meta Admin | contract fixtures | ห้าม enable channel | OPEN |
| EXT-03 | Business/Tech Provider verification decision | อาจกระทบ permissions/live access | Founder/Legal | assisted/internal pilot | ห้าม Paid Betaถ้าจำเป็นแต่ยังไม่ผ่าน | OPEN |
| EXT-04 | Meta App Review | ลูกค้าทั่วไปใช้งาน permissionไม่ได้ | Meta Lead | internal app-role pilot | ห้าม public/paid production scopeนั้น | OPEN |
| EXT-05 | Meta policy/API/version change | permission/media behaviorเปลี่ยน | Meta Lead | version pin/feature flag | freeze affected capability | MONITOR |
| EXT-06 | Privacy/DPA/legal review | PDPA role/basis/retentionยังไม่อนุมัติ | Legal/Product | synthetic closed test | ห้าม real customer data/Paid Beta | OPEN |
| EXT-07 | Accountant/tax invoice decision | เอกสารรับเงินจริงไม่ชัด | Founder/Accountant | free pilot | ห้ามรับ payment | OPEN |
| EXT-08 | Cloud/provider account+region | environment/backup configไม่ได้ | Platform Owner | local/test only | ห้าม production data | OPEN |
| EXT-09 | Email/domain/public URLs | App Review/data deletion/support path | Product/Platform | temporary verified domain | ห้าม submitถ้า URL unstable | OPEN |
| EXT-10 | On-call/support capacity | SLO/incident responseอาจทำไม่ได้จริง | Founder/Ops | narrow beta hours/cohort | ห้ามสัญญา SLAเกิน capacity | OPEN |

External blocker tracker ต้องมี `next_action`, `requested_at`, `expected_date`, `last_followup`, `evidence_link` และ `escalation_date`

---

## 13. Sprint 0A Agent-ready Task Board

### META Track

| Task | Author skill | Reviewer | Tester | Output | Acceptance |
|---|---|---|---|---|---|
| META-0A-01 App/asset inventory | Meta Integrator | Architect | QA | inventory + redacted evidence | all required assets/status known |
| META-0A-02 Permission minimization | Meta Integrator | Security | QA | endpoint→permission map | no permission without P0 flow |
| META-0A-03 API version/capability contract | Backend | Architect | Contract QA | version+matrix schema | fake tests pass; real pending marked |
| META-0A-04 Test adapter/spike harness | Backend | Independent Backend | QA | harness + fixtures | all failure cases reproducible |
| META-0A-05 Real capability run | Backend | Meta Reviewer | QA | sanitized evidence | only with Test credentials/assets |
| META-0A-06 App Review pack | Product/Meta | Security/Legal | QA walkthrough | video/script/URLs | reviewer flow reproducible |

### SECURITY/PRIVACY Track

| Task | Author skill | Reviewer | Tester | Output | Acceptance |
|---|---|---|---|---|---|
| SEC-0A-01 Threat model | Security Architect | Independent Security | Security QA | threat/control matrix | P0 threats have control/test |
| SEC-0A-02 Secret architecture | Platform Security | Architect | Security QA | secret contract | no read-back/log/client exposure |
| SEC-0A-03 Data inventory/ROPA draft | Privacy Engineer | Legal/Product | QA | inventory/roles | every data store/provider mapped |
| SEC-0A-04 Retention/DSR design | Privacy Engineer | Legal/Security | QA | retention+state flow | delete/export testable end-to-end |
| SEC-0A-05 Incident/breach draft | Security/Ops | Legal/Privacy | Tabletop QA | runbook | detection→scope→decision owners clear |

### COMMERCIAL/OPS/QA Track

| Task | Author skill | Reviewer | Tester | Output | Acceptance |
|---|---|---|---|---|---|
| COM-0A-01 Manual billing baseline | Product/Ops | Accountant | QA | states/reconcile SOP | rehearsal trace balances |
| OPS-0A-01 Environment contract | Platform | Architect | Ops QA | env/data/config matrix | production isolation clear |
| OPS-0A-02 CI/CD contract | Platform | Security | QA | pipeline gates | protected promotion/scan/evidence |
| OPS-0A-03 SLO/alert catalog | SRE | Product/Ops | Incident QA | SLI/SLO/runbooks | every P0 journey observable |
| OPS-0A-04 RPO/RTO/restore plan | SRE/Data | Security | Ops QA | DR plan | drill scheduled; targets costed |
| QA-0A-01 Release evidence template | QA Lead | Integrator | Release Captain | evidence pack | trace task→test→decision |

---

## 14. Gate Checklist

### G0-META-A — Inventory Ready

- [ ] Test App/role/Page/IG owners identified
- [ ] permission candidates mapped to endpoint/use case
- [ ] Graph API version decision owner/date defined
- [ ] real-test fields remain `UNVERIFIED` until evidence

### G0-META-B — Feasibility Verified

- [ ] OAuth/discovery/reconnect/revoke tested with Test assets
- [ ] FB/IG P0 media operations tested individually
- [ ] partial success/rate/timeout/duplicate cases pass
- [ ] sanitized evidence reviewed independently

### G0-META-C — App Review Ready

- [ ] privacy/terms/support/data deletion URLs reachable
- [ ] screencast matches exact UI/release
- [ ] reviewer credentials/path verified
- [ ] business verification/access-level requirements confirmed current

### G0-SEC/PRIV

- [ ] threat model controls assigned
- [ ] tenant/secret/webhook/SSRF/upload risks have tests
- [ ] legal review open items documented
- [ ] retention/export/delete architecture approved for implementation

### G0-COM/OPS

- [ ] manual invoice baseline approved by Product + Accountant
- [ ] environments isolated and secret contract approved
- [ ] CI required checks/branch protections defined
- [ ] SLO/RPO/RTO are explicitly draft or measured
- [ ] release evidence template ready

### G0-REL — Sprint 0A exit

- [ ] every P0 deliverable has Author + independent Reviewer + Tester
- [ ] security-sensitive deliverables have Security Reviewer
- [ ] no external blocker is hidden
- [ ] Product Owner signs scope/fallback/stop conditions
- [ ] Integrator publishes next-wave assignments and contract versions

---

## 15. Decisions Required from Product Owner

| Decision | Recommended baseline | Deadline | Consequence if delayed |
|---|---|---|---|
| Meta pilot mode | assisted setup, internal/test assetก่อน | before M1 | no real integration evidence |
| P0 media | image first; carousel only after verified; video/Reel flagged off | before capability freeze | test explosion/App Review risk |
| Metrics | defer non-essential metrics until permission catalog verified | before App Review | permission over-request |
| Page uniqueness | one external channel active in one Workspace at a time; transfer workflow | before schema freeze | wrong tenant/publish risk |
| Billing | manual invoice for 5–10 Beta Workspaces | before Paid Beta | payment/entitlement mismatch |
| Retention | approve draft after legal/accounting review | before real data | PDPA/operational ambiguity |
| On-call/SLO | narrow Beta cohort/support hours; internal SLO not customer SLA | before pilot | unfulfillable promise |
| Backup | decide DB/PITR and asset original backup based on measured RPO/cost | before G6 | unknown recoverability |

---

## 16. Definition of Ready for Implementation Wave

Feature implementation รับงานได้เมื่อ:

- contract/version/state/owner ถูก freeze
- acceptance criteria และ negative cases พร้อม
- fake adapter/fixture พร้อมสำหรับ agent ที่ไม่มี credential
- external credential test แยก job/environment
- data classification/retention fieldsระบุ
- observability events/error codesระบุ
- feature flag/kill switch/rollbackระบุ
- Author, Reviewer, Tester และ Security Reviewer ถูก assign ก่อนเริ่ม
- file/module ownership ไม่ชน agent อื่น

งานที่ไม่ผ่าน Definition of Ready ให้ agent ทำได้เฉพาะ spike/prototype ห้าม merge เป็น production path

---

## 17. Official References and Revalidation Rule

Meta policies, permissions, access levels, Graph API versions และ media constraints เปลี่ยนได้ จึงต้อง revalidate ณ วัน implement, record screencast และ submit App Review โดยอ้างอิงแหล่งทางการ:

- [Meta Permissions Reference](https://developers.facebook.com/docs/permissions/)
- [Meta Graph API Access Levels](https://developers.facebook.com/docs/graph-api/overview/access-levels/)
- [Meta App Review FAQ](https://developers.facebook.com/docs/apps/review/faqs/)
- [Meta App Review Screen Recordings](https://developers.facebook.com/docs/app-review/submission-guide/screen-recordings/)
- [Meta Webhooks](https://developers.facebook.com/docs/graph-api/webhooks/)
- [Meta Tech Providers](https://developers.facebook.com/docs/development/release/tech-providers/)
- [พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562](https://www.ratchakitcha.soc.go.th/DATA/PDF/2562/A/069/T_0052.PDF)
- [ประกาศมาตรการรักษาความมั่นคงปลอดภัย พ.ศ. 2565](https://www.ratchakitcha.soc.go.th/DATA/PDF/2565/E/140/T_0028.PDF)
- [ประกาศการจัดทำและเก็บรักษาบันทึกรายการกิจกรรมการประมวลผล](https://www.ratchakitcha.soc.go.th/DATA/PDF/2565/E/140/T_0026.PDF)

กฎ: เอกสารนี้ไม่แทน current-provider check, legal opinion, accounting advice หรือผล test จริง ทุก Release Manifest ต้องบันทึกวันที่ revalidate และลิงก์ official source version/current page

---

## 18. Immediate Next Actions

1. Founder/Meta Admin สร้างหรือยืนยัน Test App, Test Page, IG Professional account และ app roles โดยส่ง credential ผ่าน secret managerเท่านั้น
2. Integrator assign META-0A-01..06 แยก Author/Reviewer/Tester/Security
3. Security/Privacy ทำ Data Inventory workshop กับ Product/Database/Asset/AI/Meta owners
4. Product Owner และ Accountant ล็อก Manual Billing decision รวม tax/document flow
5. Platform สร้าง environment/CI evidence path โดยยังใช้ synthetic dataและ fake provider
6. QA สร้าง Release Evidence Pack skeleton และ traceability matrix
7. เมื่อ credentials พร้อม จึงทำ real Meta spike; ก่อนหน้านั้นรายงานได้เพียง `IMPLEMENTED` หรือ `VERIFIED-TEST` กับ fake adapter ไม่ใช่ Meta Verified

