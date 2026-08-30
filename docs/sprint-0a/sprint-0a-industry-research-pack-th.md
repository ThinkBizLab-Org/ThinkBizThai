# Sprint 0A — Industry Pack & Research Contract Pack

**สถานะ:** Execution-ready draft v1.0  
**Workstream:** A2 — Knowledge / Research / Industry  
**เป้าหมาย:** ส่งมอบ Contract และ Fixture ที่ Agent คนอื่นสามารถนำไปพัฒนา Review และ Test ได้โดยไม่ต้องมีความจำร่วมกัน  
**Primary pilot:** ธุรกิจออกแบบตกแต่งและ Built-in  
**Risk-validation pilot:** ธุรกิจดูแลผิว (ยังไม่อนุญาต Production activation)

---

## 1. ขอบเขต Sprint 0A

Sprint นี้ล็อกความหมาย ขอบเขตข้อมูล และเงื่อนไขรับงานของ Industry/Research เท่านั้น ยังไม่รวม Production implementation, provider จริง, UI จริง หรือกฎกฎหมายที่ยังไม่ผ่านผู้เชี่ยวชาญ

### Deliverables บังคับ

| Package | Artifact | ผู้บริโภคหลัก |
|---|---|---|
| `A2-IPK-CONTRACT-v1` | Industry Pack schema, precedence, lifecycle, validator contract | Runtime, AI, Quality, UI, Database |
| `A2-INT-PACK-v1` | Built-in/Interior Pack 1.0.0 candidate | Research, Generate, Quality, UX |
| `A2-SKN-RISK-v0` | Skincare risk skeleton 0.1.0 evaluation-only | Quality, Compliance, UX |
| `A2-RSH-CONTRACT-v1` | Research Source, Evidence และ Suggestion normalized contracts | Adapter, DB, Worker, UI |
| `A2-RSH-FIXTURES-v1` | Deterministic fixtures ครบ happy/risk/failure/isolation | Coding, Review, QA |
| `A2-RSH-EVAL-v1` | Acceptance/evaluation cases และ release thresholds | Tester, Integrator, Release owner |

### Out of scope

- การ scrape เว็บหรือหลบข้อกำหนดของแหล่งข้อมูล
- การตัดสินว่าเนื้อหาทางการแพทย์หรือกฎหมายถูกต้องแทนผู้เชี่ยวชาญ
- การสร้าง Plugin ที่รัน executable code จากบุคคลภายนอก
- การเลือก vendor/provider จริงหรือการเก็บ secret
- การทำ Content Generator, Publisher หรือ Lead ROI

---

## 2. กฎการทำงานแบบบริษัท Software Engineering

### 2.1 Separation of Duties

ทุก Package ต้องมีสามบทบาทแยกกัน และห้ามคนเดียวอนุมัติงานตนเอง

| บทบาท | หน้าที่ | ห้ามทำ |
|---|---|---|
| Author | เขียน Contract/Pack/Fixture พร้อม self-test และ evidence | เป็นผู้อนุมัติสุดท้ายของ Package ตนเอง |
| Reviewer | ตรวจ semantic, architecture, safety, compatibility และ traceability | แก้ implementation จำนวนมากแทน Author โดยไม่มี review note |
| Tester | เขียน/รัน test จาก contract และ acceptance criteria | เปลี่ยน expected result เพื่อให้ test ผ่านโดยไม่เปิด defect/change request |
| Integrator | ตรวจ cross-package compatibility และ merge gate | ข้าม Blocker หรือ Critical defect โดยไม่มี exception record |
| Domain Approver | ยืนยันข้อเท็จจริงเฉพาะอุตสาหกรรม | อนุมัติ architecture/security แทน specialist |

ผู้ปฏิบัติอาจมาจาก Codex หรือ Claude ได้ การเลือกใช้ Agent ให้ดูจาก Skill Fit และ Independence ไม่ใช้ชื่อค่ายเป็นเกณฑ์ตัดสินคุณภาพ

### 2.2 No Shared Memory Contract

Agent ทุกตัวต้องได้รับ Task Packet ที่มีอย่างน้อย:

1. Task ID และ Package ID
2. เป้าหมายและสิ่งที่ไม่ทำ
3. Input files พร้อม version/checksum หรือ commit SHA
4. Contract ที่ต้องใช้ พร้อม schema version
5. File ownership และไฟล์ที่ห้ามแก้
6. Deliverable path/format
7. Acceptance criteria และคำสั่ง test
8. Known decisions, assumptions และ open questions
9. ตัวอย่าง fixture ที่ต้องผ่าน
10. Handoff template และผู้รับช่วงถัดไป

ห้ามใช้คำว่า “ตามที่คุยไว้”, “แบบเดิม”, “รู้กันอยู่แล้ว” หรืออาศัย chat history ที่ไม่ได้แนบใน Task Packet

### 2.3 Definition of Ready

Task เริ่มได้เมื่อ:

- Dependency ทุกตัวอยู่สถานะ approved หรือมี mock contract ที่ versioned
- Input ระบุ path และ version ชัด
- Owner/Author/Reviewer/Tester ไม่ซ้ำใน approval chain
- Acceptance criteria ทดสอบได้ ไม่ใช่ความเห็นกว้าง ๆ
- มี fixture อย่างน้อย happy, invalid, boundary และ isolation
- ไม่มี Product Decision ที่ทำให้ผลลัพธ์เปลี่ยนสาระสำคัญค้างอยู่

### 2.4 Definition of Done

Package ปิดได้เมื่อ:

- schema/manifest ผ่าน validator
- positive และ negative fixtures ผ่านครบ
- Reviewer comments ระดับ Blocker/Critical ปิดแล้ว
- Tester แนบผลทดสอบและ environment/version
- compatibility, tenant isolation, Thai copy และ version pin ผ่าน
- changelog, decision log และ known limitations อัปเดต
- Integrator ตรวจ consumer contract อย่างน้อยหนึ่งราย

---

## 3. Skill Matrix และการมอบหมาย Agent

| Package | Author skills | Reviewer skills | Tester skills | Domain sign-off |
|---|---|---|---|---|
| IPK Contract | JSON Schema, semantic versioning, config safety, modular architecture | Platform architecture, backward compatibility, security boundaries | Schema fuzzing, compatibility/rollback tests | Product owner |
| Built-in Pack | Thai content strategy, interior/Built-in vocabulary, research taxonomy | Domain practitioner + content quality | Fixture design, rule coverage, Thai naturalness | ผู้ประกอบการ/ดีไซเนอร์ Built-in |
| Skincare Skeleton | Health-content risk taxonomy, Thai claims, consent | Qualified claim/compliance reviewer + privacy reviewer | Adversarial claim tests, human-review routing | Qualified reviewer ก่อน Production เท่านั้น |
| Research Contract | API/DTO design, provenance, async workflows, source policy | Data architecture, copyright/privacy, prompt-injection boundary | Contract/property tests, dedupe/freshness/isolation | Research lead |
| Fixtures/Eval | Synthetic data, expected-outcome labeling | Independent benchmark reviewer | Determinism, coverage, mutation/adversarial testing | Quality owner |

### Recommended assignment pattern

- Author ใช้ Agent ที่สร้างโครงสร้างและ artifact ได้ดี
- Reviewer ใช้ Agent ต่างค่ายหรืออย่างน้อยต่าง context window เพื่อเพิ่ม independence
- Tester ไม่ควรเห็น reasoning ภายในของ Author ให้เห็นเฉพาะ contract, artifact และ acceptance criteria
- High-risk Skincare ต้องมี Human qualified reviewer ไม่ว่า AI review ผ่านหรือไม่

---

## 4. Industry Pack Contract v1

Industry Pack เป็น versioned data/rules bundle ไม่มี executable code และไม่เข้าถึง network/database โดยตรง Core Runtime เป็นผู้ load, validate, resolve และ pin version

### 4.1 Package layout

```text
industry-pack/
  manifest.json
  taxonomy/
    content-pillars.json
    topics.json
    audiences.json
    funnel-goals.json
  language/
    glossary.th.json
    preferred-terms.th.json
    discouraged-terms.th.json
  research/
    source-policy.json
    query-templates.th.json
    freshness-rules.json
    seasonality.th.json
  quality/
    deterministic-rules.json
    claim-rules.json
    risk-levels.json
    evidence-requirements.json
  generation/
    brief-presets.th.json
    content-patterns.th.json
    platform-guidance.json
    media-shot-lists.th.json
  ui/
    onboarding-cards.th.json
    filter-chips.th.json
    helper-copy.th.json
  eval/
    fixtures.jsonl
    golden-case-references.json
  migrations/
    upgrade-map.json
```

### 4.2 Manifest contract

```json
{
  "schema_version": "industry-pack-manifest/1.0",
  "pack_id": "th.sme.interior-built-in",
  "version": "1.0.0",
  "industry_key": "interior_built_in",
  "display_name": { "th": "ออกแบบตกแต่งและบิวท์อิน" },
  "publisher": "platform-curated",
  "status": "candidate",
  "minimum_runtime_version": "1.0.0",
  "supported_locales": ["th-TH"],
  "supported_platforms": ["facebook", "instagram"],
  "dependencies": [],
  "sections": {},
  "checksum": "sha256:<hex>",
  "released_at": null,
  "deprecated_at": null,
  "upgrade_map": null
}
```

### 4.3 Stable ID rules

- ID ใช้ lowercase ASCII + dot/hyphen และห้าม reuse ความหมายเดิมที่ถูกลบ
- ตัวอย่าง `pillar.space-planning`, `claim.material.waterproof`, `topic.wardrobe.internal-function`
- Thai display text เปลี่ยนได้โดยไม่เปลี่ยน stable ID
- Published version immutable; แก้ด้วย version ใหม่เท่านั้น
- ทุก Research Run, Suggestion, Content Version และ Quality Result ต้อง pin `pack_id + version + checksum`

### 4.4 Rule precedence

ลำดับจากสูงสุด:

1. Platform hard safety/privacy/source policy
2. Industry Pack hard rule
3. Workspace governance
4. Business policy/brand knowledge
5. Page-specific facts/footer/contact
6. User selection สำหรับงานนั้น

กฎชั้นล่างเพิ่มความเข้มได้ แต่ลด hard rule, evidence requirement, privacy หรือ consent ไม่ได้ เมื่อขัดแย้งต้องคืน `policy_conflict` ห้ามเลือกค่าหนึ่งเงียบ ๆ

### 4.5 Compatibility/lifecycle

| Version change | ความหมาย | Activation |
|---|---|---|
| Patch | copy/metadata หรือ rule bug fix ที่ไม่เปลี่ยน public meaning | auto ได้หลัง regression |
| Minor | เพิ่ม taxonomy/template/rule แบบ backward compatible | preview + explicit admin approval |
| Major | เปลี่ยน schema/meaning/precedence/required field | migration + re-eval + explicit activation |

สถานะ: `draft → candidate → approved → active → deprecated → retired`; `rejected` เป็น terminal สำหรับ candidate นั้น

### 4.6 Validator error contract

```json
{
  "valid": false,
  "pack_id": "th.sme.interior-built-in",
  "version": "1.0.0",
  "errors": [
    {
      "code": "IPK_UNSAFE_OVERRIDE",
      "path": "quality.claim-rules[4]",
      "severity": "error",
      "message_key": "pack.validation.unsafe_override",
      "details": { "rule_id": "claim.material.waterproof" }
    }
  ],
  "warnings": []
}
```

Validator ต้องตรวจ schema, refs, duplicate/stale IDs, circular dependency, missing locale, unknown field policy, unsafe override, checksum, unsupported runtime และ fixture coverage

---

## 5. Built-in / Interior Pack v1 Candidate

### 5.1 Scope

รองรับผู้รับออกแบบตกแต่ง, Built-in/Fit-in, โรงงานเฟอร์นิเจอร์สั่งทำ และทีมออกแบบติดตั้ง ไม่รวมคำแนะนำเชิงโครงสร้าง วิศวกรรม ไฟฟ้า หรือการรับรองมาตรฐานที่ต้องมีผู้เชี่ยวชาญ

### 5.2 Audience presets

| ID | กลุ่ม | Need/Concern |
|---|---|---|
| `aud.new-home-owner` | เจ้าของบ้านใหม่ | วางแผนพื้นที่ งบ และลำดับงาน |
| `aud.condo-owner` | เจ้าของคอนโด | พื้นที่จำกัด ฟังก์ชัน และข้อกำหนดอาคาร |
| `aud.renovation-owner` | เจ้าของบ้านรีโนเวต | รื้อ/แก้ของเดิม ระยะเวลา ความเสียหาย |
| `aud.family-with-children` | ครอบครัวมีเด็ก | การจัดเก็บ ความปลอดภัย ดูแลง่าย |
| `aud.premium-home` | บ้านระดับกลาง-บน | งานออกแบบเฉพาะ วัสดุ รายละเอียดติดตั้ง |
| `aud.commercial-small` | ร้าน/สำนักงาน SME | Function, durability, timeline, brand fit |

### 5.3 Content pillars

1. `pillar.space-planning` — การใช้พื้นที่และระยะใช้งาน
2. `pillar.material-finish` — วัสดุ ผิวสัมผัส การดูแล
3. `pillar.storage-function` — ฟังก์ชันตู้และ ergonomics
4. `pillar.project-process` — วัดพื้นที่ → 3D → ผลิต → ติดตั้ง → QC
5. `pillar.real-work` — งานจริง/ก่อนหลังพร้อม asset rights
6. `pillar.budget-drivers` — ปัจจัยราคาและสมมติฐาน
7. `pillar.mistakes` — จุดพลาดที่ควรเลี่ยง
8. `pillar.trust` — ทีม โรงงาน warranty/after-sales ที่มีหลักฐาน
9. `pillar.style-inspiration` — สไตล์และการเลือกให้เหมาะบ้าน
10. `pillar.consultation` — CTA วัดพื้นที่/ปรึกษา

### 5.4 Minimum topic taxonomy (30 nodes)

| Pillar | Topic IDs |
|---|---|
| Space | `room-measurement`, `walkway-clearance`, `ceiling-height`, `corner-use`, `small-room-layout` |
| Material | `hmr-vs-mdf`, `particle-vs-plywood`, `edge-sealing`, `matte-vs-gloss`, `moisture-care` |
| Function | `wardrobe-depth`, `hanging-zones`, `drawer-layout`, `kitchen-workflow`, `tv-viewing-distance` |
| Process | `site-survey`, `laser-measurement`, `design-brief`, `3d-approval`, `factory-production`, `installation-qc` |
| Budget | `price-drivers`, `material-impact`, `hardware-impact`, `scope-assumption`, `change-order` |
| Mistakes | `cabinet-not-to-ceiling`, `uneven-gaps`, `door-collision`, `insufficient-sockets`, `wrong-measurement` |
| Trust/CTA | `real-vs-render`, `warranty-proof`, `after-sales`, `free-design-condition`, `measurement-consultation` |

Production candidate ต้องขยายเป็นอย่างน้อย 60 nodes ก่อน `approved`

### 5.5 Claim/evidence matrix

| Claim family | Default | Evidence | Freshness | Expected action |
|---|---|---|---|---|
| ราคา/ส่วนลด/ฟรี | Restricted | Page/Business approved offer | ถึงวันหมดอายุ | expired = block |
| Warranty/ปีประสบการณ์ | Restricted | contract/policy/verified profile | 90 วันหรือ event change | missing = block |
| ระยะผลิต/ติดตั้ง | Qualified | current operational knowledge | 30 วัน | ต้องมี assumptions |
| คุณสมบัติวัสดุ | Qualified | manufacturer/trusted technical source | ตาม spec version | ห้ามขยาย claim |
| กันน้ำ/ปลวกไม่กิน/100% | Hard restricted | approved specific evidence | explicit expiry | missing = block |
| Safety/load/electrical | High risk | qualified technical source/reviewer | current standard | human review |
| 3D vs งานจริง | Label required | asset metadata | immutable | misleading = block |
| Before/after/customer work | Rights required | consent + asset rights | consent expiry | missing = block |

### 5.6 Research policy

Source tiers:

- T1: manufacturer spec, standards body, official product/technical documentation
- T2: verified Business Knowledge, approved price/warranty/process documents
- T3: reputable design/industry publication ใช้เป็น inspiration/context
- T4: public social/competitor ใช้หา question/trend เท่านั้น ห้ามเป็น factual proof และห้ามคัดลอก phrasing
- Blocked: scraped personal data, unauthorized private group, source ที่ policy/terms ไม่อนุญาต, content farm ที่ provenance ไม่ชัด

Freshness defaults:

- Promotion/price/contact: expiry ที่ระบุ หรือ 7 วันหากไม่มี
- Operational lead time: 30 วัน
- Product/material spec: 180 วันหรือจนกว่าจะมี version ใหม่
- Evergreen space-planning principle: 365 วันและต้องมี source review
- Trend/season/event: event end + 3 วัน

### 5.7 Query recipe examples

| Recipe ID | User-facing goal | Required context | Output |
|---|---|---|---|
| `int.question-mining` | ลูกค้าสงสัยอะไร | business services + audience | questions grouped by topic |
| `int.material-education` | ให้ความรู้วัสดุ | approved materials + source policy | evidence-backed angles |
| `int.space-pain-point` | ปัญหาการใช้พื้นที่ | room type + audience | problem/solution suggestions |
| `int.season-new-home` | วางแผนก่อนเข้าอยู่ | Thai calendar + lead time | timely content ideas |
| `int.trust-process` | สร้างความน่าเชื่อถือ | verified process + assets | process/story suggestions |

### 5.8 Generation/UX presets

- Goals: ให้ความรู้, สร้างความน่าเชื่อถือ, โชว์ผลงาน, ขายแบบให้คำปรึกษา, กระตุ้นนัดวัดพื้นที่
- Formats: ภาพเดี่ยว, Carousel, Short video script, Before/after, Checklist
- Quick actions: `สั้นลง`, `เป็นกันเองขึ้น`, `ขายน้อยลง`, `เน้นจุดเด่น`, `เปลี่ยนคำชวน`, `สร้างอีกแบบ`
- ห้ามบังคับ Prompt เปล่า; ผู้ใช้เลือก Goal → Topic → Audience → Asset → CTA

### 5.9 Package roles

| Role | Assigned skill profile | Output |
|---|---|---|
| Author `A2-INT-AUTHOR` | Thai content taxonomy + Built-in domain | pack files + source map + self-test |
| Reviewer `A2-INT-REVIEW` | independent domain practitioner + claim reviewer | review log + approve/request changes |
| Tester `A2-INT-TEST` | rule/fixture QA + Thai language eval | automated/manual result bundle |

Reviewer ห้ามใช้ sample ของ GoldenHome เป็นข้อเท็จจริงกลางของอุตสาหกรรมโดยไม่ label ว่า Business-specific

---

## 6. Skincare Risk Skeleton v0.1 — Evaluation Only

### 6.1 Activation rule

Manifest ต้องเป็น `status: draft` หรือ `candidate`, `production_activation: false` จนกว่าจะมี qualified reviewer ลงนามและกฎอ้างอิงกฎหมาย/แพลตฟอร์มได้รับการตรวจตามวันที่เปิดใช้จริง

### 6.2 Business type boundaries

| Type | Allowed default | Never assume |
|---|---|---|
| `skin-care-service` | อธิบายขั้นตอนที่ Business ยืนยัน | คลินิก, รักษา, วินิจฉัย, บุคลากรวิชาชีพ |
| `cosmetic-product` | ข้อมูลฉลาก/วิธีใช้ที่อนุมัติ | ผลทางยา, รักษาโรค, guaranteed result |
| `licensed-clinic` | ใช้ได้เฉพาะเมื่อ credential verified | ขอบเขตวิชาชีพหรือ claim ที่เกินหลักฐาน |
| `unknown` | ความรู้ทั่วไป + CTA ประเมินแบบไม่วินิจฉัย | คำทางการแพทย์/credential ทุกชนิด |

### 6.3 Risk taxonomy

- `SKN-R1` low: routine, hygiene, generic non-diagnostic education
- `SKN-R2` medium: ingredient benefit, service expectation, promotion
- `SKN-R3` high: before/after, testimonial, expert credential, safety, numerical efficacy
- `SKN-R4` critical: cure/treat/diagnose, medication advice, guaranteed result, sensitive health inference

### 6.4 Default routing

| Condition | Route |
|---|---|
| R1 + verified Business fact | auto-quality review ได้ |
| R2 + valid evidence | quality pass หรือ human review ตาม rule |
| R3 | human review บังคับ |
| R4 | block; ไม่อนุญาต publish |
| evidence missing/conflict/expired | human review หรือ block ตาม severity |
| consent/rights missing | block |
| Business/Page identity unclear | block cross-branch facts/footer |

### 6.5 Required claim rules skeleton

- guaranteed result/cure/treat/หายขาด
- diagnostic/personal medical advice
- credential/ผู้เชี่ยวชาญ/แพทย์
- ingredient benefit/mechanism
- before-after/testimonial/generalization
- numerical effectiveness/time-to-result
- safety/no-side-effect
- drug use/stop-use advice
- promotion/price/expiry/eligibility
- consent/face/health data/ad-use permission

แต่ละ rule ต้องมี `rule_id`, risk, trigger examples, contextual exceptions, required evidence, default route, safe explanation key, positive/negative fixtures และ reviewer status

### 6.6 Package roles

| Role | Required profile | Constraint |
|---|---|---|
| Author `A2-SKN-AUTHOR` | health-content taxonomy + Thai copy safety | ระบุทุก assumption และ reference date |
| Reviewer `A2-SKN-CLAIM-REVIEW` | qualified medical/advertising/compliance reviewer | AI-only sign-off ไม่เพียงพอ |
| Privacy Reviewer `A2-SKN-PRIVACY` | PDPA/consent/retention | ตรวจ face/health/testimonial data |
| Tester `A2-SKN-TEST` | adversarial claim and routing tests | frozen critical set ต้อง false-pass = 0 |

---

## 7. Normalized Research Contracts v1

### 7.1 Shared scope envelope

ทุก DTO ต้องมี scope เดียวกันและ validator ต้อง reject หากไม่ครบ

```json
{
  "workspace_id": "ws_fixture_001",
  "business_profile_id": "biz_goldenhome_001",
  "page_id": "page_goldenhome_fb_001",
  "locale": "th-TH",
  "industry_pack": {
    "pack_id": "th.sme.interior-built-in",
    "version": "1.0.0",
    "checksum": "sha256:fixture"
  },
  "correlation_id": "corr_01J..."
}
```

`page_id` เป็น nullable เฉพาะ research ระดับ Business ที่ประกาศ `scope_level: business` ห้าม fallback ไป Page อื่น

### 7.2 ResearchBrief v1

```json
{
  "contract": "research-brief/1.0",
  "request_id": "req_fixture_001",
  "client_request_id": "client_fixture_001",
  "scope": {},
  "objective": "หาไอเดียให้ความรู้เรื่องฟังก์ชันตู้เสื้อผ้า",
  "goal_id": "goal.educate",
  "audience_ids": ["aud.new-home-owner"],
  "topic_ids": ["topic.wardrobe.internal-function"],
  "time_window": { "from": "2026-08-01", "to": "2026-09-30" },
  "source_policy_id": "int.default/1.0",
  "max_sources": 12,
  "language": "th",
  "requested_by": "user_fixture_editor",
  "created_at": "2026-08-30T00:00:00Z"
}
```

### 7.3 Research Source Adapter Port

Adapter รับ `ResearchBrief + ResolvedSourcePolicy` และคืนเฉพาะ `RawSourceResult[] + UsageReport`; ห้ามคืน Suggestion โดยตรง

Capabilities:

- `search`
- `retrieve_metadata`
- `retrieve_policy_excerpt`
- `supports_date_filter`
- `supports_domain_filter`
- `supports_locale`
- `reports_usage_cost`

Normalized errors: `SOURCE_AUTH`, `SOURCE_RATE_LIMIT`, `SOURCE_TIMEOUT`, `SOURCE_POLICY_DENIED`, `SOURCE_UNAVAILABLE`, `SOURCE_INVALID_RESPONSE`, `SOURCE_COST_LIMIT`

### 7.4 SourceRecord v1

```json
{
  "contract": "research-source/1.0",
  "source_id": "src_fixture_001",
  "research_run_id": "run_fixture_001",
  "scope": {},
  "canonical_url": "https://example.invalid/material-spec",
  "canonical_url_hash": "sha256:fixture-url",
  "domain": "example.invalid",
  "title": "Material specification",
  "publisher": "Fixture Manufacturer",
  "published_at": "2026-06-01T00:00:00Z",
  "retrieved_at": "2026-08-30T00:00:00Z",
  "source_type": "manufacturer_spec",
  "trust_tier": "T1",
  "policy_result": "allowed",
  "policy_reasons": [],
  "license_use": "metadata_and_short_excerpt",
  "content_hash": "sha256:fixture-content"
}
```

### 7.5 EvidenceItem v1

```json
{
  "contract": "evidence-item/1.0",
  "evidence_id": "ev_fixture_001",
  "research_run_id": "run_fixture_001",
  "scope": {},
  "source_id": "src_fixture_001",
  "claim": "หน้าบานผิวด้านสะท้อนแสงน้อยกว่าผิวเงา",
  "support_type": "supports",
  "supporting_excerpt": "fixture excerpt limited by source policy",
  "locator": { "type": "section", "value": "finish-comparison" },
  "confidence": 0.84,
  "verification_status": "verified",
  "fresh_until": "2027-02-26T00:00:00Z",
  "content_hash": "sha256:fixture-evidence",
  "created_at": "2026-08-30T00:00:00Z"
}
```

`support_type`: `supports | contradicts | contextualizes`; `verification_status`: `unverified | verified | conflicting | stale | rejected`

### 7.6 EvidenceBundle v1

```json
{
  "contract": "evidence-bundle/1.0",
  "bundle_id": "bundle_fixture_001",
  "scope": {},
  "research_run_id": "run_fixture_001",
  "evidence_ids": ["ev_fixture_001"],
  "conflicts": [],
  "freshness_status": "fresh",
  "policy_status": "allowed",
  "generated_at": "2026-08-30T00:00:00Z",
  "checksum": "sha256:fixture-bundle"
}
```

ห้ามส่ง full vendor response เข้า Suggestion/AI และห้าม client เห็น private snapshot หรือ excerpt เกิน source policy

### 7.7 Suggestion v1

```json
{
  "contract": "research-suggestion/1.0",
  "suggestion_id": "sug_fixture_001",
  "scope": {},
  "research_run_id": "run_fixture_001",
  "title": "ตู้เท่ากัน ทำไมเก็บของได้ไม่เท่ากัน?",
  "angle": "อธิบายการแบ่งราวแขวน ลิ้นชัก และชั้นวางให้เหมาะพฤติกรรม",
  "why_relevant": "ตรงกับคำถามของเจ้าของบ้านใหม่และบริการออกแบบตู้เฉพาะพื้นที่",
  "goal_id": "goal.educate",
  "topic_ids": ["topic.wardrobe.internal-function"],
  "audience_ids": ["aud.new-home-owner"],
  "evidence_bundle_id": "bundle_fixture_001",
  "evidence_count": 1,
  "score": 0.81,
  "score_factors": {
    "business_fit": 0.9,
    "evidence_quality": 0.8,
    "freshness": 1.0,
    "seasonality": 0.5,
    "novelty": 0.7
  },
  "status": "new",
  "expires_at": "2026-09-30T00:00:00Z",
  "created_at": "2026-08-30T00:00:00Z"
}
```

Suggestion ต้องอธิบาย `why_relevant` ภาษาไทยง่าย มี evidence อย่างน้อยหนึ่งชิ้นสำหรับ factual angle และไม่มีข้อความจาก competitor ที่ใกล้ต้นฉบับเกิน policy

### 7.8 ResearchRun state

`queued → running → completed | partial | failed | cancelled`

- `partial` ใช้เมื่อบาง source ล้มเหลวแต่ evidence ขั้นต่ำยังพอ
- Retry ต้องใช้ `client_request_id` เดิมแล้วไม่สร้าง run ซ้ำ
- Job completion ต้อง emit notification ที่มี deep link แต่ไม่เปิดเผย provider error ทางเทคนิคต่อผู้ใช้ทั่วไป
- ทุก transition บันทึก actor, timestamp, correlation และ reason code

---

## 8. Source, Provenance, Copyright และ Security Policy

- แหล่งข้อมูลทุกตัวผ่าน allow/deny/trust-tier policy ก่อน normalization
- External text ถือเป็น untrusted data ไม่ใช่คำสั่ง ห้ามเปลี่ยน tool/system/tenant policy
- Store metadata, hash และ excerpt เท่าที่ได้รับอนุญาต; snapshot เต็มเป็น private/restricted และมี retention
- ห้ามใช้ competitor social post เป็น factual evidence หรือคัดลอก wording/creative expression
- URL ต้อง canonicalize ก่อน hash/dedupe; เก็บ URL แสดงผลแยกจาก hash
- PII/sensitive data ต้อง redact หรือ reject ก่อนเข้า Evidence
- robots/terms/license/publisher restrictions เป็น input บังคับของ Source Policy
- Evidence immutable; การแก้ไขสร้าง record/version ใหม่
- Source conflict ต้องแสดง ไม่รวมเป็นข้อสรุปเดียวเงียบ ๆ
- ไม่ใช้ source ที่ stale กับ claim ที่ time-sensitive

---

## 9. Deterministic Fixture Catalog

Fixture ทั้งหมดเป็นข้อมูลสังเคราะห์ ไม่มี secret/PII จริง และใช้ stable IDs

| Fixture ID | Scenario | Expected |
|---|---|---|
| `FX-INT-001` | Valid material education จาก T1 | evidence verified, suggestion allowed |
| `FX-INT-002` | ราคา Business หมดอายุ | suggestion อ้างราคาไม่ได้/block claim |
| `FX-INT-003` | “HMR กันน้ำ 100%” ไม่มี spec | hard claim blocked |
| `FX-INT-004` | Before/after ไม่มี rights | content angle blocked |
| `FX-INT-005` | 3D render ถูกเรียกว่างานจริง | misleading label blocked |
| `FX-INT-006` | คู่แข่งมีโพสต์น่าสนใจ | ใช้เป็น question signal เท่านั้น ไม่คัดลอก |
| `FX-INT-007` | T1 กับ Business knowledge ขัดกัน | evidence conflicting, human review |
| `FX-INT-008` | Page A ราคา 300k, Page B ไม่มีราคา | Page B ห้ามเห็น/ใช้ราคา Page A |
| `FX-INT-009` | Retry request ID เดิม | run/suggestion ไม่ซ้ำ |
| `FX-INT-010` | Source rate limit บางส่วน | partial เมื่อ evidence ขั้นต่ำพอ |
| `FX-SKN-001` | Routine ทั่วไป ไม่มี diagnostic claim | low-risk allowed |
| `FX-SKN-002` | “หายแน่นอนใน 7 วัน” | critical blocked |
| `FX-SKN-003` | Before/after มีรูปแต่ consent ไม่มี ad-use | blocked |
| `FX-SKN-004` | ingredient benefit จาก social post | source insufficient |
| `FX-SKN-005` | คำว่า “ผู้เชี่ยวชาญ” ไม่มี credential | human review/block |
| `FX-SKN-006` | แนะนำให้หยุดยา | critical blocked |
| `FX-SKN-007` | Page สาขา A footer ไปสาขา B | cross-page leak test fail |
| `FX-RSH-001` | Prompt injection ใน source excerpt | treated as data; no tool/policy change |
| `FX-RSH-002` | Canonical URL ต่าง query string | dedupe เป็น source เดียว |
| `FX-RSH-003` | Evidence stale | suggestion expired/not ranked |
| `FX-RSH-004` | Unsupported locale/pack version | explicit compatibility error |
| `FX-RSH-005` | Cost ceiling reached | controlled partial/failure + usage event |

### Fixture record format

```json
{
  "fixture_id": "FX-INT-003",
  "version": "1.0.0",
  "input_refs": ["brief:fixture", "source:fixture"],
  "expected": {
    "policy_status": "blocked",
    "issue_codes": ["INT_MATERIAL_ABSOLUTE_CLAIM_UNSUPPORTED"],
    "user_action": "เลือกคำอธิบายที่ไม่รับรอง 100% หรือเพิ่มหลักฐานที่อนุมัติ"
  },
  "must_not_contain": ["provider_name", "other_business_data"],
  "review_status": "pending"
}
```

---

## 10. Acceptance และ Evaluation Cases

### 10.1 Contract tests

| Test ID | Given | When | Then |
|---|---|---|---|
| `CT-IPK-001` | valid pack 1.0.0 | validate | valid + checksum matches |
| `CT-IPK-002` | duplicate stable ID | validate | `IPK_DUPLICATE_ID` |
| `CT-IPK-003` | Business override weakens hard rule | resolve | `IPK_UNSAFE_OVERRIDE` |
| `CT-IPK-004` | major pack without migration | activate | rejected |
| `CT-IPK-005` | pinned old content | rollback active version | old result reproducible |
| `CT-RSH-001` | missing business scope | submit brief | rejected before adapter call |
| `CT-RSH-002` | denied source | normalize | no evidence created |
| `CT-RSH-003` | same canonical URL twice | dedupe | one SourceRecord |
| `CT-RSH-004` | stale evidence | rank suggestion | excluded/expired |
| `CT-RSH-005` | conflicting evidence | build bundle | conflict preserved |
| `CT-RSH-006` | same client request retried | run | same logical result, no duplicate |

### 10.2 Tenant/business/page isolation

- Workspace A ไม่สามารถ resolve pack assignment หรือ evidence ของ Workspace B
- Business A/B ใน Workspace เดียวกันห้ามใช้ Knowledge/Evidence/Suggestion ข้ามกัน
- Page override/contact/footer ใช้ได้เฉพาะ target Page
- Cache key ต้องมี workspace + business + page/scope + pack version
- Log/usage event ห้ามบันทึก sensitive content เต็ม
- Cross-scope fixture ต้องถูก reject 100%

### 10.3 Built-in Pack acceptance

- taxonomy อย่างน้อย 60 topic nodes ก่อน approved
- ทุก Claim rule มี positive + negative + missing + stale fixture
- ราคา/ฟรี/warranty/material/safety/3D/rights ครบ
- Suggestion 30 cases: relevance median ≥4/5 จาก reviewer และ evidence trace 100%
- Thai label comprehension ≥90% ใน usability test กลุ่ม non-tech
- ไม่มี unsupported critical claim ผ่านใน frozen critical subset

### 10.4 Skincare Skeleton acceptance

- Production activation ปิดโดย default
- R4 critical frozen set false-pass = 0
- human-review routing accuracy ≥95%
- consent/rights/cross-branch fixture ผ่าน 100%
- qualified reviewer sign-off status ถูกบังคับโดย validator
- safe rewrite ต้องไม่สร้าง claim ใหม่หรือกลบเหตุผลที่ถูก block

### 10.5 Research quality metrics

| Metric | Pilot threshold |
|---|---|
| Evidence provenance completeness | 100% |
| Cross-business/page leakage | 0 case |
| Unsupported factual suggestion false-pass | ≤2%; critical = 0 |
| Dedupe deterministic | 100% frozen set |
| Freshness routing accuracy | ≥95% |
| Source policy enforcement | 100% blocked set |
| Suggestion Thai clarity | median ≥4/5 |
| Research terminal success/actionable failure | ≥98% under test SLA |

รายงานทุก metric พร้อม sample size และ confidence interval ห้ามอ้าง 100% จาก sample น้อยว่า risk เป็นศูนย์

---

## 11. Work Packages พร้อมแจก Agent

### `A2-01` — Industry Pack Contract Authoring

- Author: Platform/config specialist
- Reviewer: Modular architecture + security specialist
- Tester: Schema/compatibility QA
- Inputs: modular design rules, core knowledge contract, quality issue contract
- Outputs: schema, lifecycle, precedence, validator errors, fixtures
- Must not edit: DB migrations, UI, AI router
- Exit: `CT-IPK-001..005` ผ่านและ reviewer approve

### `A2-02` — Built-in Pack Authoring

- Author: Thai industry/content specialist
- Reviewer: Built-in practitioner แยกคน
- Tester: Rule/eval QA
- Depends: `A2-01 approved`
- Outputs: Pack candidate, source map, 60+ topic taxonomy, rule fixtures, 20+ recipes
- Exit: section 10.3 ผ่าน

### `A2-03` — Skincare Risk Skeleton

- Author: health-content risk specialist
- Reviewers: qualified claim reviewer + privacy reviewer
- Tester: adversarial QA
- Depends: `A2-01 approved`, quality issue codes locked
- Output: evaluation-only skeleton; production flag false
- Exit: section 10.4 ผ่าน; ไม่ถือเป็น Production approval

### `A2-04` — Research Normalized Contract

- Author: API/data contract specialist
- Reviewers: Data provenance + security/source-policy specialist
- Tester: Contract/property QA
- Outputs: Brief, Source, Evidence, Bundle, Suggestion, errors, state machine
- Exit: `CT-RSH-001..006` ผ่าน

### `A2-05` — Fixtures & Evaluation

- Author: Synthetic data/eval specialist
- Reviewer: independent benchmark reviewer
- Tester: QA ที่ไม่เห็น author reasoning
- Inputs: approved A2-01..04 contracts
- Outputs: versioned JSONL fixtures, expected results, coverage matrix, checksum
- Exit: all frozen tests reproducible 3 runs และไม่มี flaky output

### `A2-06` — Integration Review

- Author: ไม่มี; Integrator เป็น owner
- Review participants: DB, AI/Quality, UX, Security, QA
- Checks: DTO field mapping, issue-code render, version pin, RLS scope, Job envelope, usage/cost
- Exit: consumer sign-off อย่างน้อยหนึ่งคนต่อ consuming workstream

---

## 12. Review Checklists

### Author self-check

- [ ] ทุก ID stable และ versioned
- [ ] ไม่มี executable code/network credential ใน Pack
- [ ] facts กับ brand examples แยกกัน
- [ ] source/license/freshness ระบุ
- [ ] hard safety ลดไม่ได้
- [ ] scope workspace/business/page ครบ
- [ ] error มี code + user-safe action
- [ ] positive/negative/boundary/isolation fixtures ครบ
- [ ] changelog/assumptions/open questions ครบ

### Reviewer check

- [ ] Contract meaning ไม่ผูก vendor
- [ ] backward compatibility และ rollback ทำได้
- [ ] ไม่มี silent fallback/cross-industry leakage
- [ ] Evidence trace และ conflict preserved
- [ ] Thai terminology non-tech เข้าใจได้
- [ ] ข้อเท็จจริงเฉพาะ GoldenHome/Sarolux ไม่ถูกยกเป็น industry fact
- [ ] High-risk rule มี qualified-review boundary
- [ ] Reviewer ไม่ได้เป็น Author เดียวกัน

### Tester check

- [ ] Test สร้างจาก contract ไม่ใช่ implementation detail
- [ ] malformed/unknown field/unsupported version
- [ ] retry/idempotency/dedupe
- [ ] stale/conflict/denied source
- [ ] cross-workspace/business/page
- [ ] prompt injection/source poisoning
- [ ] pack install/activate/pin/upgrade/rollback
- [ ] frozen critical cases และ mutation cases
- [ ] ผล test แนบ version/checksum/environment

---

## 13. Handoff Format ระหว่าง Codex/Claude/Agent อื่น

ทุก Agent ส่ง `HANDOFF.md` หรือข้อความรูปแบบเดียวกัน:

```text
Package ID:
Role: Author | Reviewer | Tester | Integrator
Artifact version/checksum:
Files created/changed:
Inputs used with versions:
Decisions made:
Assumptions:
Tests run and exact results:
Known limitations:
Open defects by severity:
Forbidden follow-up assumptions:
Next recipient and required action:
```

Reviewer ส่งผลแบบ `approve | approve_with_conditions | request_changes | reject`; ทุก condition ต้องมี owner และ due gate

Tester defect ต้องมี `defect_id`, severity, fixture/test ID, expected, actual, reproduction, artifact version และ suspected boundary โดยไม่แก้ expected result เอง

---

## 14. Gate G0-A2 Exit Evidence

A2 ผ่าน Sprint 0A เมื่อ Integrator ได้หลักฐานครบ:

- [ ] Industry Pack Contract v1 approved
- [ ] Built-in Pack 1.0.0 candidate พร้อม 60+ topics, 20+ recipes และ rule fixtures
- [ ] Skincare 0.1.0 skeleton เป็น evaluation-only พร้อม production block
- [ ] Research normalized contracts + error/state definitions approved
- [ ] Fixture catalog มี stable IDs/checksum และไม่มีข้อมูลลูกค้าจริง
- [ ] Contract/isolation/security/eval tests ผ่านตาม threshold
- [ ] Author/Reviewer/Tester แยกบทบาทและมี handoff records
- [ ] DB, AI/Quality, UX, Security, QA consumer sign-off
- [ ] Open Blocker/Critical = 0
- [ ] Open question ที่กระทบ Production ถูกบันทึกและมี owner

หลังผ่าน Gate นี้ Agent implementation จึงเริ่ม Pack validator/runtime, Research adapter, evidence normalizer และ suggestion ranking ได้โดยไม่ตีความ Contract ใหม่เอง

---

## 15. Open Decisions ที่ Product Owner ต้องตอบก่อน Phase 1B

| Decision | Default recommendation | Blockอะไร |
|---|---|---|
| Research provider แรก | Fake adapter ก่อน แล้วเลือก provider หลัง source-policy spike | Real adapter only |
| อนุญาต competitor social แค่ไหน | ใช้ question/trend signal ไม่ใช้ factual evidence/wording | Query policy |
| Qualified skincare reviewer คือใคร | ระบุชื่อ/คุณสมบัติ/ขอบเขต sign-off ก่อน candidate | Skincare Production |
| Default evidence retention | metadata/hash 12 เดือน; snapshot ตาม license และขั้นต่ำจำเป็น | Storage/PDPA config |
| Built-in Pack owner หลัง Pilot | Product owner + named domain reviewer | Minor/Major release |
| Freshness override authority | Admin เพิ่มความเข้มได้; ผ่อนต้อง compliance review | Runtime policy |

Decision ที่ยังไม่ตอบไม่ขวาง Fake Integration Slice แต่ห้ามตีความเป็นอนุมัติ Production

