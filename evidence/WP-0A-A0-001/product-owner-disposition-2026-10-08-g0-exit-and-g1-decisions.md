# Product Owner disposition, 2026-10-08, in session: G0 conditional exit and the G1/G2 decisions D0–D14

Transcribed by `/claude/a0_atlas` (A0). The Owner's words are verbatim, and so is A0's message that he answered (§1.1).
This file records the Owner's decision; it is not a role signature and it moves no package's status by itself. It is
filed under `WP-0A-A0-001` because that package owns `evidence/g0-tracker-th.md` and the G0 records
(`work-packages/WP-0A-A0-001.json` `writable_paths`). The register is `docs/**`, which is read-only to every package, so
§6 lists what its owner still has to transcribe. The package that the plan names for this record, `WP-0A-A0-010`, is
registered in the same PR (`work-packages/WP-0A-A0-010.json`). Why it is registered there, and why its files sit here,
is explained in §8.

## 1. What the Owner had in front of him

The Owner had two things: the plan file and A0's chat message.

- **The plan file.** A0 sent it with `SendUserFile` at `2026-10-08T06:17:54Z` (session `27edf3de`, display `render`,
  caption `แผน G1 ส่วนที่เหลือ + G2 (ร่างสำหรับให้คุณตัดสิน)`). The file is
  `/Users/bank/ThinkBizThai/.claude/g1-g2-plan-2026-10-08.md`. It is **outside the repository** and is not committed.
  Its last modification was `2026-10-08T06:17:51Z`, three seconds before the send, and its sha256 when this record was
  written was `7cabce388122f4d0497698b87df6c60686d244d88e2eb3d10f33afb1206e73e2` (43,098 bytes). So the file read here
  is the file the Owner was sent. §2 copies its decision table, its §2 table and its §6 table verbatim.
- **A0's chat message.** A0 sent it at `2026-10-08T06:18:11Z`. It summarised the plan and asked one question. It is
  quoted in full in §1.1.

### 1.1 A0's message as sent (verbatim, Thai)

> ร่างแผน G1 ส่วนที่เหลือและ G2 เสร็จแล้ว ส่งไฟล์เต็มให้ด้านบน ไฟล์อยู่ที่ [.claude/g1-g2-plan-2026-10-08.md](.claude/g1-g2-plan-2026-10-08.md)
>
> ## สรุปสั้น ๆ
>
> **ข้อเท็จจริงที่ควรรู้ก่อน:**
> - ฐานข้อมูลผ่าน test แค่บน Postgres ใน CI ยังไม่เคยรันบน Supabase จริง
> - กติกาตอนนี้ยังห้ามเขียนโค้ดแอปก่อนผ่าน G0
> - จะเขียนโค้ดได้ contract ต้องถึงสถานะ Frozen ก่อน ตอนนี้ยังไม่มีสักฉบับ
>
> **งานแต่ละช่วง:**
>
> | ช่วง | งานหลัก | ขนาด | คนเดียว | 5 lane คู่ขนาน |
> |---|---|---|---|---|
> | ปิด G0 | บันทึกทางออกจาก G0 แบบมี fallback, freeze contract ที่ G1 ใช้, คัด blocker ของ DB-00 | ~5–9 PD | 1–2 สัปดาห์ | — |
> | G1 | 12 work package: stack RFC → app skeleton → env/secret → migration บน Supabase จริง → tenant runtime → job worker → design system → app shell → observability → test foundation → integration slice | ~60–64 PD | ~12–13 สัปดาห์ | 3–4 สัปดาห์ |
> | G2 | 15 work package แบ่งสองสายคู่ขนาน: (1) สมัคร/ทีม/ธุรกิจ/onboarding (2) เชื่อม Meta: OAuth, เลือกเพจ, reconnect, App Review | ~69–70 PD | ~14 สัปดาห์ | 3–4 สัปดาห์ |
>
> **สิ่งที่ต้องให้คุณตัดสินก่อนเริ่มโค้ด G1 (ตัวสำคัญ):**
> - **D0 ออกจาก G0:** แนะนำให้ผ่านแบบมี fallback ที่อนุมัติแล้ว และห้ามใช้ข้อมูลลูกค้าจริงจนกว่าเรื่อง PDPA จะผ่าน
> - **D1 stack ของแอป:** แนะนำ Next.js + TypeScript แบบ strict
> - **D2–D3 hosting:** แนะนำ Vercel region Singapore และ Supabase แยกสอง project คือ staging กับ prod
> - **D4 login:** แนะนำ Email OTP ก่อน
> - **D5 วิธีต่อฐานข้อมูลฝั่ง server:** แนะนำไม่ใช้ service-role key ใช้ JWT ของผู้ใช้กับ command function แทน
> - **D8 ผู้ให้บริการอีเมล:** ต้องเลือกใน G1 เพราะ G2 ต้องส่ง OTP และคำเชิญจริง
>
> **สิ่งที่คุณควรเริ่มวันนี้ เพราะผมทำแทนไม่ได้และใช้เวลารอนาน:**
> 1. นิติบุคคลกับโดเมน
> 2. บัญชี Supabase Pro และ Vercel Pro
> 3. Meta Business Verification พร้อม test app, test Page และ IG ข้อนี้อยู่บนเส้นทางวิกฤตของ G2
> 4. ที่ปรึกษา PDPA สำหรับ privacy notice และนโยบายลบข้อมูล
> 5. นัด SME 5 รายทดสอบ prototype
>
> **เรื่องลดภาระ review:** แผนเสนอ RFC-2026-030 แบ่งความลึกของการตรวจตามความเสี่ยง
> - **H:** migration, auth, secret และ CI ยังตรวจ 4 role เต็ม
> - **M:** logic ภายใน module ตรวจโดย Reviewer + Tester
> - **L:** UI และ copy ใช้ Reviewer หนึ่งคน + ผลจาก CI
>
> ถ้าไม่ทำข้อนี้ ค่าตรวจจะสูงกว่าค่าเขียนโค้ดหลายเท่า ข้อนี้แตะกติกาแยกบทบาทใน `CONTRIBUTING_AGENTS.md` จึงต้องให้คุณตัดสิน
>
> **ตอนนี้กำลังทำ:** PR ใส่ตัวตรวจ "PR บันทึกล้วน" ลง CI ผ่านแล้วผมกด merge เองตามที่คุณสั่ง
>
> อ่านแผนแล้วบอกได้เลยว่าจะรับ D0–D14 ตามที่แนะนำทั้งหมด หรือจะปรับข้อไหน รวมถึงจะเอา RFC-030 ด้วยไหม

The message names D0–D5 and D8 in its own text. D6, D7 and D9–D14 appear only in the plan file. The message's last
sentence asks about "D0–D14 ตามที่แนะนำทั้งหมด" ("all of D0–D14 as recommended") and RFC-030.

## 2. The Owner's words (verbatim)

> รับตามแนะนำทั้งหมด รวม RFC-030 ด้วย ลุยเลย

Session `27edf3de`, `2026-10-08T06:31:21Z`. Translation: "Accept everything as recommended, including RFC-030. Go."

A0 reads this as accepting **each of D0–D14 exactly as its "คำแนะนำ" (recommendation) cell in the plan's §1.3 table
words it**, together with the RFC-2026-030 proposal as plan §7.2 item 7 words it. The message asked for exactly that,
and the Owner named no exception. Where a recommendation is marked **[อนุมาน]** (an inference of A0's, not supported
by a repository document), it is now the Owner's decision, but the inference itself remains A0's. Where a
recommendation leaves a choice for later (for example D8's provider brand, or D7's measurement condition), that later
choice is **not** decided by these words. §3 lists every such case.

**Earlier words that this record does not stretch.** At `06:11:04Z` the Owner wrote `ให้ A0 กดเอง ลุยตามแนะนำเลย`
("let A0 press it; go ahead as recommended"). That message answered A0's question of `05:32:06Z`, which was about one
PR: the governance PR that puts the records-only classifier into CI. It was sent before this plan existed. It does not
name this PR. See §7 for who merges this PR.

### 2.1 The plan's decision table, §1.3, copied verbatim

| # | คำถาม | ที่มา | คำแนะนำ |
|---|---|---|---|
| **D0** | จะออกจาก G0 ทางไหน | pass rule ให้ "external blocker ที่กระทบ P0 มีหลักฐานหรือ approved fallback" (`sprint-0a-g0-readiness-report-th.md:190`) | **ผ่าน G0 แบบมี approved fallback** โดยผูกรายการภายนอกแต่ละข้อเข้ากับ gate ที่มันขวางจริง (ตาราง §6) และห้าม production customer data จนกว่าข้อ legal/PDPA จะผ่าน ต้องเขียนเป็น gate-record PR ที่ Owner merge เอง |
| **D1** | Stack ของ application tier | OPEN-018 (`register:127`), RFC-011 `:73-74` | **รับ Next.js App Router + TypeScript `strict` ตรวจด้วย `tsc --noEmit` ใน CI** ออก RFC-2026-029 ที่ระบุ dependency allowlist, lockfile policy และ `npm ci --ignore-scripts` |
| **D2** | Hosting | arch `:208` | **Vercel Pro, region `sin1`** ห้าม Preview ต่อ production DB (arch `:941`) **[อนุมาน]** ต้องวัด function duration ให้ตรงกับงาน worker ก่อน (ดู D6) |
| **D3** | Environment / Supabase project | arch `:994`, INF-004 | **[อนุมาน]** สอง project คือ `staging` และ `prod` ทั้งคู่ใน `ap-southeast-1` ส่วน Preview ใช้ Postgres container กับ fake adapters ตามที่ CI ทำอยู่ ยังไม่เปิด Supabase branching ใน G1 เพื่อคุมค่าใช้จ่าย |
| **D4** | วิธี login | arch `:194` | **Email OTP ก่อน** Google login เป็น P1 ไม่มีเอกสารไหนพูดถึง LINE Login จึงไม่ทำ |
| **D5** | Service path (ค้างใน `WP-0A-DB-00.required_human_authorities`: "supabase-js with the service-role key, or a direct driver with per-request SET LOCAL role") | RFC-017/019/028 | **ตัดตัวเลือก service-role key ทิ้ง** เพราะขัด RFC-017 ที่สงวน `service_role` ไว้ให้ migration/admin request path ใช้ supabase-js กับ JWT ของ user (`authenticated`) และเรียก command function ส่วน worker ใช้ direct Postgres driver ด้วย login role ของ RFC-028 ผ่าน direct หรือ session-mode connection จนกว่า Q-028-12 (pooler) จะวัดเสร็จ ต้องปิดข้อความใน authority นี้ด้วย |
| **D6** | Queue/dispatcher (OPEN-019 ครบกำหนด G1, `register:128`) | arch `:201-202` กับ migration `050` | **[อนุมาน]** ใช้ `app.jobs`/`app.outbox_events` ที่สร้างไว้แล้วเป็น queue โดยไม่เพิ่ม pgmq ให้ Cron ระดับนาทีเรียก dispatcher route ซึ่ง claim ด้วย lease และจำกัดเวลาต่อรอบ การแยก worker process ไปไว้นอก Vercel ค่อยพิจารณาเมื่อมี media/AI job ยาว |
| **D7** | ที่เก็บ secret ของ Meta token (`private.meta_credential_references` เก็บแค่ locator ชี้ไป "vault", `110_meta_connector.sql:204-235`) | CTR-SEC-001 (Draft) | **[อนุมาน]** ใช้ Supabase Vault เพราะ vendor เดียวและข้อมูลอยู่ Singapore โดยมีเงื่อนไขว่า A1 ต้องวัดได้ว่ามีแค่ command function หรือ `app_worker` ที่ถอดรหัสได้ ถ้าวัดไม่ผ่านให้ใช้ envelope encryption กับ KEK ใน cloud KMS เรื่องนี้ต้องตัดสินก่อน MCN-001 (G2) ไม่ใช่ก่อน G1 |
| **D8** | Email provider และ sender domain (OPEN-010 ครบกำหนด G1, `register:119`) | | **ต้องเลือกใน G1** เพราะ OTP และ invitation ของ G2 ต้องใช้ SMTP จริง SMTP ที่มากับ Supabase ไม่พอสำหรับ production **[อนุมาน]** ยี่ห้อใดก็ได้ที่รองรับ SPF/DKIM/DMARC และมี data processing terms |
| **D9** | Error tracking | arch `:209` | รับ Sentry โดยปิด default PII และ scrub ฝั่ง server ต้องลง subprocessor map (PRV-001) ด้วย |
| **D10** | Storage provider (OPEN-020 ครบกำหนด G1) | arch `:691` | รับ Supabase Storage ตาม ADR-013 เพื่อปิดข้อใน G0 tracker ยังไม่ต้องลงมือจนถึง G5 |
| **D11** | Realtime | RFC-012 `:166` (ยังไม่ตอบ) | **ใช้ polling ใน G1/G2** ไม่ใช้ `postgres_changes` จนกว่าจะมี RFC |
| **D12** | ฟอนต์ไทยและ component library | arch `:190` | รับ Tailwind + shadcn/ui ให้ A5 เสนอฟอนต์ไทย (ต้องผ่านเกณฑ์ DS-002 ที่วรรณยุกต์ไม่ชน) **[อนุมาน]** |
| **D13** | ชื่อ WP สำหรับ wave ใหม่ | | ตาราง §3 ใช้ `WP-1A-*` สำหรับ W1/G1 และ `WP-1B-*` สำหรับ W2/G2 ตามที่ขอ **หมายเหตุ:** WBS เรียก W2 ว่า "Phase 1A" (`execution-wbs...:225`) จึงอาจสับสน อีกทางคือ `WP-W1-*`/`WP-W2-*` ขอให้ Owner ยืนยัน schema รับทั้งสองแบบ (`^WP-[A-Za-z0-9-]+$`) |
| **D14** | ชื่อนิติบุคคล โดเมน และอีเมล | meta-security `:592` ข้อ 1 | ต้องมีก่อนสร้าง Meta app, email sender และ privacy URL |

In the "ที่มา" column, "register" is `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md` and "arch" is
`docs/plans/technical-architecture-meta-content-os-th.md`. The plan's line numbers were taken at `origin/main @ bd019c9c`
(plan header).

### 2.2 The plan's §2 "ต้องปิดก่อน G1 (G0 exit)", copied verbatim

| ID | งาน | Owner | ขนาด |
|---|---|---|---|
| `WP-0A-A0-010` | **G0 conditional exit record:** บันทึก D0 และผูกรายการภายนอกทุกข้อเข้ากับ due gate ปรับ tracker และปิด OPEN-010/018/019/020 ตาม D1–D10 เป็น governance PR ที่ Owner merge เอง | A0 / Owner | 1–2 PD |
| `WP-0A-CON-008` (มีอยู่แล้ว) | **ดัน contract ที่ G1 ใช้ให้ถึง Frozen v1** ได้แก่ CTR-TEN/ERR/API/IDM/EVT/JOB/MOD/FLG และดัน CTR-OBS/AUD/SEC/NTF จาก Draft ไป Candidate แล้วต่อไป Frozen | A0 + co-owner A1/A6 | 3–5 PD |
| `WP-0A-DB-00` (close-out) | **คัด `open_blockers` 204 ข้อเป็นสามกอง** (ต้องใช้ใน G1 / ไปผูก gate หลัง / ปิด) ไม่ต้องแก้ทั้งหมด ข้อที่ปิดแค่ด้วยข้อความใช้ light path ของ RFC-025 §6 ได้ | A0, อ่านโดย R0 | 1–2 PD |

### 2.3 The plan's §6 "เรื่องภายนอก", copied verbatim (the gate each external item binds to)

| เรื่อง | ขวาง gate ไหนจริง | ทำไมต้องเริ่มตอนนี้ |
|---|---|---|
| นิติบุคคล โดเมน และ DNS (D14) | G1 (email), G2 (Meta, privacy URL) | ทุกอย่างข้างล่างต้องใช้ |
| บัญชี Supabase Pro (Singapore, 2 projects), Vercel Pro, เปิด 2FA และใส่ secret ใน GitHub | G1 | agent สร้างบัญชีหรือใส่ credential แทนไม่ได้ |
| Meta: Business Verification, developer app (dev mode), test Page และ IG Professional, **รัน MTA-002/003 ด้วย credential จริง** | G2 (MCN-002 ขึ้นกับ MTA-002) และ G6 (App Review) | business verification มักใช้เวลาเป็นสัปดาห์ **[อนุมาน]** และอยู่บน critical path ของ G2 |
| ที่ปรึกษากฎหมาย/PDPA: privacy notice, terms, data-deletion policy, DPA | **G2** เพราะ pilot user จะสมัครด้วยข้อมูลจริง และต้องใช้ privacy URL กับ App Review | register OPEN-002 ห้ามใช้ production customer data ก่อน notice พร้อม (`:111`) |
| Email provider และ SPF/DKIM/DMARC (D8) | G2 (OTP/invite) | DNS ใช้เวลา propagate และต้องผ่าน deliverability test |
| Usability กับ SME 5 ราย บน prototype | ก่อน freeze ของ 1A-A5-002/003 (UIF-001 ขึ้นกับ UXD-010) | token และ component ทำแบบแก้กลับได้ไปก่อน แต่ freeze ควรรอผล |
| Consent ของ 5 pilot workspace (OPEN-011) | G2 pilot | |
| นักบัญชี | G6 | เริ่มแบบไม่เร่ง |
| ผู้ตรวจด้านสกินแคร์ | ก่อน Pack 2 pilot (G3/G4) | ไม่ขวาง G1 หรือ G2 |
| ราคา storage และ restore drill | G5/G6 | D10 ปิดได้แค่ส่วนการเลือก provider |

## 3. What each decision now says, and what it does not decide

"Decided as" restates the recommendation in English. The decision text that binds is the Thai text in §2.1.
"Not decided / still owed" lists what the recommendation leaves for later and the owner of that later step. **No
external item is done.** Every account, provider, adviser and credential named below is still owed by a person.

| # | Decided as (2026-10-08) | Not decided by these words / still owed |
|---|---|---|
| D0 | G0 is exited by **approved fallback** under the readiness report's pass rule (`docs/sprint-0a/sprint-0a-g0-readiness-report-th.md:190`). Each external item is bound to the gate it actually blocks (§2.3). **Constraint: no production customer data until legal/PDPA passes.** The exit is written as a gate-record PR that the Owner merges himself. | Every external item in §2.3 remains open. The register's own pass rule (§7.2, register lines 360-372) is stricter than the readiness report's, and D0 did not address it; see §4.2. The plan's §2 items `WP-0A-CON-008` (Frozen v1) and `WP-0A-DB-00` (blocker triage) are still owed. |
| D1 | Application tier: **Next.js App Router + TypeScript `strict`, checked by `tsc --noEmit` in CI.** RFC-2026-029 is to be written, covering the dependency allowlist, the lockfile policy and `npm ci --ignore-scripts`. | RFC-2026-029 does not exist yet. Until it is approved, no dependency may be added (`CONTRIBUTING_AGENTS.md`, Verification: "introduce dependencies without a new approved RFC"). A CI change is governance (RFC-2026-025 §5 item 6). |
| D2 | Hosting: **Vercel Pro, region `sin1`**. Preview must not connect to the production DB (arch `:941`). Function duration must be measured against the worker workload first (with D6). [inference] | The account (an external act, §2.3 row 2). The function-duration measurement. |
| D3 | Two Supabase projects, `staging` and `prod`, both in `ap-southeast-1`. Preview uses the Postgres container and fake adapters, as CI does today. No Supabase branching in G1, to control cost. [inference] | The projects themselves (an external act, the Owner's account). |
| D4 | Login: **Email OTP first.** Google login is P1. No LINE Login, because no document asks for it. | SMTP for OTP depends on D8 and D14. |
| D5 | The service-role-key option is **removed**: it conflicts with RFC-2026-017, which reserves `service_role` for migration/admin. The request path uses supabase-js with the user's JWT (`authenticated`) and calls command functions. The worker uses a direct Postgres driver with RFC-2026-028's login role, over a direct or session-mode connection, until Q-028-12 (the pooler) is measured. The text of that authority is to be closed as well. | `WP-0A-DB-00.required_human_authorities[0]` still reads as an open choice between the two options. Updating it is DB-00's manifest edit (§6), not this package's. Q-028-12 is unmeasured. |
| D6 | Queue: the existing `app.jobs`/`app.outbox_events` (migration `050`) **are** the queue. No pgmq. A minute-level Cron calls a dispatcher route that claims by lease and limits time per round. A worker process outside Vercel is deferred until long media/AI jobs exist. [inference] | Operational limits (lease length, per-round budget, retry/backoff numbers) are not set. They belong to `WP-1A-A0-004`. Whether minute-level Cron and function duration are enough is the risk the plan §8 names. |
| D7 | Meta token secrets: **Supabase Vault**, on condition that A1 measures that only a command function or `app_worker` can decrypt. If the measurement fails, envelope encryption with a KEK in a cloud KMS. To be decided before MCN-001 (G2), not before G1. [inference] | The A1 measurement. The choice is conditional until it exists. CTR-SEC-001 is still Draft. |
| D8 | Email provider: **to be chosen in G1**, because G2's OTP and invitations need real SMTP. Supabase's bundled SMTP is not enough for production. Any brand that supports SPF/DKIM/DMARC and has data processing terms. [inference] | **The provider brand and the sender domain are not chosen.** The words set the criteria and the timing. The sender domain depends on D14. |
| D9 | Error tracking: **Sentry**, with default PII off and server-side scrubbing. It must be entered in the subprocessor map (PRV-001). | The account; the PRV-001 entry. |
| D10 | Storage: **Supabase Storage**, per ADR-013 (`docs/plans/technical-architecture-meta-content-os-th.md:134`), to close the G0 tracker item. No implementation until G5. | Storage pricing, export/purge and the restore drill (G5/G6, §2.3 last row). D10 closes only the provider choice. |
| D11 | Realtime: **polling in G1/G2**. No `postgres_changes` until an RFC exists. | The RFC-2026-012 `:166` question stays open for later gates. |
| D12 | UI: **Tailwind + shadcn/ui**. A5 proposes a Thai font, which must pass DS-002's criterion that tone marks do not collide. [inference] | The font. These are dependencies, so they also need D1's RFC-2026-029 allowlist. |
| D13 | New-wave WP ids: **`WP-1A-*` for W1/G1 and `WP-1B-*` for W2/G2**, as in plan §3. | The plan's note stands: the WBS calls W2 "Phase 1A" (`execution-wbs...:225`). The Owner accepted the recommendation, so `WP-1A`/`WP-1B` is used. The `WP-W1-*` alternative was not chosen. |
| D14 | The legal entity name, domain and email are **required before** creating the Meta app, the email sender and the privacy URL. | All three are external acts by the Owner. None exists in the record. |

## 4. The G0 conditional exit

### 4.1 What passes, and on what rule

Under D0, the Owner's decision is that **G0 passes by approved fallback**. The pass rule invoked is the readiness
report's (`docs/sprint-0a/sprint-0a-g0-readiness-report-th.md:190`): internal specification items do not regress, the
Product Owner approves scope/contracts, every external blocker that affects P0 has evidence **or an approved
fallback**, and no Critical risk lacks an owner and a due gate. The approved fallback for each external item is
that it is bound to the gate it actually blocks (§2.3). That gate is the item's due gate and its stop condition. Until
an item passes, the work its gate needs may not proceed past that gate.

**The binding constraint:** **no production customer data until legal/PDPA passes.** This is the register's OPEN-002
stop condition (register line 111), restated by D0 for the whole of the post-G0 period. Synthetic data only, as the
2026-10-05 step 2 item 14 already decided.

### 4.2 What D0 did not address, recorded so no later reader assumes it did

- **The register's own G0 pass rule is stricter.** Register §7.2 (lines 360-372) requires, among other things:
  - item 2: "Contract ที่ First Slice ใช้ต้อง `Frozen v1`". No contract in `contract-catalog/shared-kernel/index.json` is
    Frozen.
  - item 6: a wireframe for every core flow with all states. G0-004 is partial.
  - item 8: "Product Owner และ A0 ลงสถานะ `Approved`".

  `CONTRIBUTING_AGENTS.md:10-17` ranks the register above the readiness report. D0 cites only the readiness report.
  The plan's §2 handles item 2 as owed **before G1 implementation** (`WP-0A-CON-008`), and register line 190 independently
  forbids implementation against a contract below Frozen v1. A0 reads D0 as a conditional exit: G0 is exited, and the
  register's items 2 and 6 become conditions on the G1 work that consumes them. **That reading is A0's**, and the
  register's owner must transcribe it or the Owner must correct it (§6).
- **`CONTRIBUTING_AGENTS.md` "Current gate constraint"** still says "Sprint 0A is Specification Baseline Complete /
  External Verification Pending. Until G0 passes, agents may work only on spikes…". It now contradicts D0. It is
  governance text and is not edited here (§6).
- **G0-024** (risk acceptance / signed checklist) is not made by A0. The Owner's words are the decision. The tracker
  records the exit as **decided, conditional**, and the Owner's merge of this PR is the act D0 itself names.

### 4.3 Each external item, bound to the gate it blocks

| External item (tracker row) | Gate it blocks (plan §6) | Stop condition until it passes | Done? |
|---|---|---|---|
| Legal entity, domain, DNS (D14) | G1 (email), G2 (Meta, privacy URL) | No email sender, Meta app or privacy URL | **No** |
| Supabase Pro (Singapore, 2 projects), Vercel Pro, 2FA, GitHub secrets | G1 | No provisioning; agents cannot create accounts or enter credentials | **No** |
| Meta: Business Verification, developer app, test Page + IG Professional, MTA-002/003 with real credentials | G2 (MCN-002 depends on MTA-002) and G6 (App Review) | No real publishing (readiness report §10); fake adapter only | **No** |
| Legal/PDPA adviser: privacy notice, terms, data-deletion policy, DPA | **G2** | **No production customer data** (D0; register OPEN-002 line 111) | **No** |
| Email provider and SPF/DKIM/DMARC (D8) | G2 (OTP/invite) | No production email (register OPEN-010 line 119) | **No** |
| Usability with 5 SMEs on the prototype | Before freezing `WP-1A-A5-002`/`003` | Tokens/components only as reversible work | **No** |
| Consent of 5 pilot workspaces (OPEN-011) | G2 pilot | Synthetic fixtures only (step 2 item 14) | **No** |
| Accountant | G6 | No final tax/refund/retention claim (readiness report §10) | **No** |
| Qualified skincare reviewer | Before the Pack 2 pilot (G3/G4) | No claim rules treated as reviewed | **No** |
| Storage pricing and restore drill | G5/G6 (D10 closes only the provider choice) | No storage SLA claim | **No** |
| Stripe Thailand | Deferred after G0 by the 2026-10-05 decision (step 2 item 4); Beta is manual invoice | No paid Beta via Stripe | **No** (deferred) |

## 5. OPEN-010, OPEN-018, OPEN-019, OPEN-020

Each is decided **only as far as its D-item's words go**. The register (`docs/**`) is read-only to this package, so
the register entries are **not edited here**. Their owner must transcribe them (§6).

| OPEN | Register line, due | Decided by | Now decided | Still open |
|---|---|---|---|---|
| OPEN-010 Email provider and sender domain | 119, G1 | D8 | The criteria (SPF/DKIM/DMARC, data processing terms), that Supabase's bundled SMTP is not the production path, and that the choice is made in G1 | **The provider and the sender domain.** The sender domain waits on D14. The stop condition stands: no production email before SPF/DKIM/DMARC and a test. |
| OPEN-018 Repository language/runtime/package manager | 127, before G1 | D1 | The application tier: Next.js App Router + TypeScript `strict` with `tsc --noEmit` in CI. Runtime/package manager were already closed by RFC-2026-001, and tooling language by RFC-2026-011. | RFC-2026-029 (dependency allowlist, lockfile policy, `npm ci --ignore-scripts`) must be written and approved before any dependency or lockfile change. |
| OPEN-019 Queue implementation and operational limits | 128, G1 | D6 | The implementation: `app.jobs`/`app.outbox_events` as the queue, no pgmq, minute-level Cron calling a lease-claiming dispatcher with a per-round time limit | **Operational limits** (lease, budget, retry/backoff, concurrency) and the Vercel-duration measurement. The stop condition stands: no Domain import of a queue SDK. |
| OPEN-020 Supabase Storage vs R2 | 129, G1 | D10 | Supabase Storage, behind the Storage Port, per ADR-013 | Pricing, export/purge, restore drill (G5/G6). The stop condition stands: no Domain binding to a bucket URL or provider SDK. |

## 6. What other owners still have to write

| File | Needs | Owner |
|---|---|---|
| `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md` §3 | Disposition notes citing this file: OPEN-010 (criteria + timing only), OPEN-018 (application tier), OPEN-019 (implementation only, limits open), OPEN-020 (provider only). §7.1 G0-024 and the status column. §7.2: how D0's conditional exit reads against items 2, 6 and 8 (§4.2). | Register owner (A0/Product), by RFC or an Owner-approved edit |
| `docs/sprint-0a/sprint-0a-g0-readiness-report-th.md` §9 checklist, §10 | The G0 result (conditional exit, D0) and the gate binding of §4.3 | Readiness report owner |
| `CONTRIBUTING_AGENTS.md` "Current gate constraint" | No longer true after D0. Replace it with the conditional-exit wording, the no-production-customer-data constraint, and the register-line-190 Frozen-v1 rule. Governance: the Owner merges it. | Owner, by a governance PR |
| `architecture/decisions/RFC-2026-029-*.md` | To be written (D1) | A0 author, governance |
| `architecture/decisions/RFC-2026-030-*.md` | To be written (plan §7.2 item 7, accepted). See §6.1. | A0 author, governance |
| `work-packages/WP-0A-DB-00.json` `required_human_authorities[0]` | Close the service-path choice per D5 | WP-0A-DB-00's author |
| `work-packages/WP-0A-A6-001.json` decisions it tracks (OPEN-010/019/020) | Cite this file where it records them as open | WP-0A-A6-001's owner |

### 6.1 RFC-2026-030 ("risk-tiered review"), as accepted

The Owner's "รวม RFC-030 ด้วย" accepts the proposal that plan §7.2 item 7 describes. The proposal keeps separation of
duties: the Author never approves its own work. It scales the review depth by tier: **H** (migration/RLS, auth,
secret/OAuth, publish, billing, CI/gate) gets four full roles with A1 security and a re-check. **M** (logic inside one
module with tests, touching no schema or secret) gets Reviewer + Tester, with R0 at the end of the WP rather than on
every PR. **L** (UI component, copy and style behind a feature flag, with no data path) gets one independent Reviewer
plus CI/Playwright, and the Tester reads the artifacts. A classifier decides the tier and fails closed. **The RFC file does
not exist yet, and this PR does not write it.** The proposal changes the rule in `CONTRIBUTING_AGENTS.md` § Separation
of duties, so the RFC is a governance PR, and the Owner merges it personally (RFC-2026-025 §5 item 6). Until that RFC
is merged, the current four-role rule applies unchanged.

## 7. Who merges this PR

This PR records a gate decision, so it is a **governance** PR (RFC-2026-025 §5 item 6: "A PR that changes governance (an
RFC, `CONTRIBUTING_AGENTS.md`, CI or a gate) is merged by the Owner personally, never by delegation").

D0 itself, as accepted, says the gate record is "gate-record PR ที่ Owner merge เอง" ("a gate-record PR that the Owner
merges himself"). Plan §2 says the same of `WP-0A-A0-010`. The Owner's `ให้ A0 กดเอง` of `06:11:04Z` named a different PR
(§2). RFC-2026-025 §5 item 6 also requires that a delegation be "given after the PR it names exists, or must name its
sequence explicitly". **On the record as it stands, the Owner merges this PR himself.** If he instead directs A0 to
press it, that direction must name this PR, and it should be quoted as PR #211's exception was (RFC-2026-025 §6).

## 8. Where `WP-0A-A0-010` sits

Plan §2 names `WP-0A-A0-010` as the package for this record. `CONTRIBUTING_AGENTS.md` gives no package the right to
create another package's manifest. Every earlier package created its own manifest on its own branch, for example
`WP-0A-A0-009` (commit `53d7d2e9`). The record's files are A0-001's: the tracker (`evidence/g0-tracker-th.md`) and the G0
evidence directory are in A0-001's `writable_paths`. Moving them would need an `amended_by` transfer, which this PR does
not make. So:

- The record is written under `WP-0A-A0-001`, on the branch that package names.
- `work-packages/WP-0A-A0-010.json` is created in the same PR as the registered package for the gate record, at
  `in_review`. It owns only itself and `evidence/WP-0A-A0-010/**`. Its scope says where its record lives.
- `WP-0A-A0-001` declares the new manifest under `ownership.amends_without_owning`, with this reason.

A reviewer who reads the guide as requiring A0-010 to be created on its own branch should say so. The manifest can then
move in a follow-up without touching the record.

## 9. What this file is not

- Not evidence that any external item is done. None is (§4.3).
- Not an edit of the register, the readiness report, `CONTRIBUTING_AGENTS.md`, or any RFC. Each is listed in §6.
- Not RFC-2026-029 or RFC-2026-030. Both are owed.
- Not record-only under RFC-2026-025 §5/§6. It is an Owner disposition and a gate record, and it needs the role runs
  its package gates require.
