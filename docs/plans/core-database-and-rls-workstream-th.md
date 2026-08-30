# Core Database Schema + RLS Workstream

## Execution-ready plan สำหรับกระจายให้ Sub-agents พัฒนาแบบขนาน

สถานะ: Execution Baseline v1.0  
วันที่: 30 สิงหาคม 2026  
ขอบเขต: Core schema ทั้งหมดนอกเหนือจาก Asset Library schema ที่ออกแบบไว้แล้ว  
เป้าหมาย: ทำให้หลาย Agent สร้าง migration, policy, repository และ test พร้อมกันได้ โดยไม่ชน ownership และไม่ทำให้ tenant isolation หลุด

---

## 1. ผลลัพธ์ที่ Workstream นี้ต้องส่งมอบ

เมื่อจบ Workstream ต้องมี:

1. PostgreSQL migrations ที่ deploy จากฐานข้อมูลว่างจนถึง schema ล่าสุดได้แบบ deterministic
2. Core tables, constraints, indexes, RLS policies และ grants ครบทุก Module
3. Seed เฉพาะ global catalog เช่น role, plan, model และ industry pack ตัวอย่าง โดยไม่ปนข้อมูลลูกค้า
4. Typed database types/schema สำหรับ Application
5. Repository/Query service ของแต่ละ Module โดยไม่ query table ข้าม Module โดยตรง
6. Authorization test matrix ครบทุก Role, Workspace, Business และ Page boundary
7. Migration smoke test, schema lint, query plan test และ rollback/forward-fix runbook
8. ERD และ Data Dictionary ที่สร้างจาก schema จริง ไม่วาดแยกจนไม่ตรง migration
9. Fixture สำหรับ GoldenHome pilot และ Sarolux compliance pilot แยกจาก production seed
10. Sign-off ว่าไม่มี client ใดอ่าน credential, raw webhook, provider payload หรือ internal job data ได้

### Out of scope ของ Workstream นี้

- Asset tables และ processing state machine ซึ่งอยู่ใน `asset-library-database-ux-spec-th.md`
- UI implementation
- Logic ของ AI prompt, research crawler และ Meta publisher ตัวจริง
- Lead/Inbox/ROI schema ซึ่งเป็น Phase 2
- ระบบให้ลูกค้าติดตั้ง third-party plugin เอง; Phase 1 เป็น internal adapter registry

---

## 2. Architecture Constitution ที่ทุก Agent ต้องทำตาม

### 2.1 Database shape

- Phase 1 ใช้ PostgreSQL เดียวแบบ Modular Monolith
- Tenant-facing tables อยู่ใน exposed application schema และเปิด RLS เสมอ
- Authorization helpers, secret references, webhook payload และ billing reconciliation อยู่ใน `private` schema
- ห้ามสร้าง/แก้ custom object ใน schema ที่ Supabase จัดการ เช่น `auth`, `storage`, `realtime`
- `auth.users` เป็น identity source; application ใช้ `user_profiles.id = auth.users.id` ห้าม duplicate password/email credential
- ทุก table/function/view ต้องมี comment ระบุ `owner_module`
- Module อื่นห้าม query private table โดยตรง; ใช้ stable view, query service หรือ domain event

### 2.2 Identifier, time และ deletion

- Aggregate/domain entity ใช้ UUID ที่ Application สร้างก่อน transaction ได้
- Event, attempt, snapshot และ append-only ledger ปริมาณสูงใช้ `bigint generated always as identity`
- เวลาใช้ `timestamptz` และเก็บ UTC; workspace เก็บ IANA timezone เช่น `Asia/Bangkok`
- จำนวน token/operation/byte ใช้ `bigint`; เงินใช้ `numeric(18,6)` + ISO currency
- สถานะใช้ text + CHECK constraint ใน Phase 1 เพื่อเพิ่มค่าได้ด้วย migration ที่ชัดเจน
- ข้อมูลที่มีประวัติ/อ้างอิงใช้ `archived_at` หรือ `deleted_at`; hard delete ตาม retention job เท่านั้น
- Immutable version, evidence, usage, audit และ publish history ห้าม update เนื้อหาเดิม

### 2.3 Tenant scope

ทุก tenant-owned row ต้องมีอย่างน้อย:

- `workspace_id`
- `business_profile_id` เมื่อเป็นข้อมูลธุรกิจ/Content/Research/Knowledge
- `page_context_profile_id` หรือ `social_account_id` เมื่อเป็น Page-specific
- `created_at`, `created_by`; row ที่แก้ไขได้เพิ่ม `updated_at`, `updated_by`

กฎสำคัญ:

- FK ภายใน tenant ใช้ composite relationship หรือ constraint/trigger ที่ยืนยันว่า parent-child อยู่ Workspace/Business เดียวกัน
- ห้ามเชื่อใจ `workspace_id` ที่ส่งจาก client โดยไม่ตรวจ membership
- ห้ามอนุมาน Business จาก Content/Asset/Page แล้วข้าม permission check
- ทุก list ใช้ keyset pagination; ห้ามใช้ offset ในรายการที่โตต่อเนื่อง
- ทุก FK column และทุก column ที่ใช้ใน RLS/filter/order ต้องมี index ที่เหมาะสม

### 2.4 Transaction และ async

- Domain state + outbox event ต้องเขียนใน transaction เดียว
- ทุก create/retry จากมือถือมี client idempotency key
- Research, AI, media, publish, metrics และ notification ทำ background เท่านั้น
- Worker claim งานด้วย lease + `FOR UPDATE SKIP LOCKED` หรือ queue adapter ที่ให้ semantics เทียบเท่า
- Transaction ต้องสั้น; ห้ามเรียก external API ขณะถือ database transaction
- Consumer deduplicate ด้วย `(consumer_key, event_id)` หรือ domain idempotency key

---

## 3. Ownership Map และขอบเขต Agent

| Module owner | Tables หลัก | อ่านข้าม Module ผ่าน | ห้ามทำ |
|---|---|---|---|
| `identity.core` | profiles, workspaces, memberships, roles, scopes, invitations, settings | `workspace_access_v1` | แทรกสิทธิ์ Business ผ่าน JSON ที่ตรวจไม่ได้ |
| `business.core` | businesses, page contexts, channel bindings | `business_context_v1` | เก็บ Meta token |
| `knowledge.core` | knowledge items/versions, voice, audience, offer, restriction, source policy | `resolved_business_knowledge_v1` | แก้ Industry version ที่ publish แล้ว |
| `industry.core` | pack catalog/versions/components/assignments | `resolved_industry_pack_v1` | ผูกกับ Workspace โดยไม่มี assignment version |
| `research.core` | runs, sources, snapshots, evidence, suggestions | query service + events | เก็บ content generation output |
| `content.core` | ideas, items, versions, variants, quality reviews, targets | content read model | แก้ version ที่ถูก publish |
| `approval.core` | policies, steps, requests, events | approval status view | update ประวัติ decision |
| `calendar.core` | calendar items, schedules | calendar query service | เป็น owner ของ publish state |
| `connector.meta` | connections, accounts, bindings, webhook inbox | redacted connection health view | expose token/raw webhook สู่ client |
| `publisher.meta` | intents, targets, jobs, posts, metrics | publish status view | retry โดยไม่มี idempotency |
| `jobs.kernel` | jobs, attempts, dead letters, outbox, consumed events | job status projection | ใส่ domain payload/secret ขนาดใหญ่ |
| `notification.core` | outbox, notifications, preferences, push subscriptions | notification API | ส่ง notification ใน domain transaction |
| `ai.gateway` | model registry, policies, credential references, generation runs | redacted model/policy view | เก็บ plain API key |
| `metering.core` | usage events, reservations, quota buckets | entitlement service | ให้ client insert ledger |
| `billing.core` | plans, prices, subscriptions, invoices/payment refs | entitlement view | ให้ payment webhook bypass inbox/dedupe |
| `audit.core` | audit logs, security events | admin query service | เก็บ secret/full provider payload |

แต่ละ Agent แก้เฉพาะ migration folder, repository และ test folder ของ Module ตนเอง การเปลี่ยน shared convention หรือ cross-module FK ต้องผ่าน Integration Owner ก่อน merge

---

## 4. Canonical Core Table Blueprint

ส่วนนี้เป็น minimum contract ที่ migration ต้องทำให้ได้ ชื่อ field เพิ่มได้เมื่อมี ADR แต่ห้ามตัด tenant/version/audit field ที่กำหนด

### 4.1 Identity และ Workspace — `identity.core`

#### `user_profiles`

- `id uuid PK/FK auth.users(id) on delete cascade`
- `display_name`, `avatar_path`, `locale default 'th-TH'`, `timezone default 'Asia/Bangkok'`
- `onboarding_state`, `created_at`, `updated_at`, `deleted_at`
- RLS: user อ่าน/แก้ profile ตนเอง; workspace peers เห็นเฉพาะ public projection ที่จำเป็น

#### `workspaces`

- `id`, `name`, `slug`, `status(active|suspended|closing|deleted)`, `timezone`, `locale`
- `owner_user_id`, `created_at`, `updated_at`, `deleted_at`
- unique active `slug`; owner ต้องมี active Owner membership ใน transaction เดียว

#### `workspace_roles`

- global built-in role catalog: `owner`, `admin`, `editor`, `approver`, `viewer`
- `role_key PK`, `display_name_th`, `capabilities jsonb`, `is_system`, `version`
- capability JSON ผ่าน schema validation และไม่รับจาก client โดยตรง

#### `workspace_members`

- `id`, `workspace_id`, `user_id`, `role_key`, `status(invited|active|suspended|left)`
- `joined_at`, `suspended_at`, `created_at`, `updated_at`
- unique `(workspace_id,user_id)`; index `(user_id,status,workspace_id)` และ `(workspace_id,status)`
- Owner คนสุดท้ายห้าม leave/delete; transfer ownership เป็น command transaction เฉพาะ

#### `workspace_member_scopes`

- `id`, `workspace_id`, `workspace_member_id`, `scope_type(all_businesses|business|page)`, `business_profile_id`, `page_context_profile_id`
- CHECK ให้ field สอดคล้อง scope type; unique scope ต่อ member
- Business/Page FK จะเพิ่มหลัง business migration ผ่าน deferred migration เพื่อไม่สร้างวงจร

#### `workspace_invitations`

- `id`, `workspace_id`, `email_normalized`, `role_key`, `token_hash`, `expires_at`, `status`
- `invited_by`, `accepted_by`, `accepted_at`, `created_at`
- เก็บ hash ไม่เก็บ raw token; unique pending invitation ต่อ email/workspace

#### `workspace_settings`

- `workspace_id PK`, `approval_enabled`, `default_locale`, `default_timezone`
- `default_business_id`, `notification_defaults jsonb`, `advanced_settings jsonb`, `version`
- settings ที่มีผล permission/quota ต้องเป็น typed column ไม่ฝัง JSON

### 4.2 Business, Page และ Channel — `business.core`

#### `business_profiles`

- `id`, `workspace_id`, `name`, `business_type`, `industry_pack_assignment_id`
- `status(draft|active|archived)`, `default_locale`, `timezone`, `created_by`, timestamps
- unique active normalized name ต่อ workspace; composite unique `(id,workspace_id)`

#### `business_profile_versions`

- immutable snapshot: `id`, `workspace_id`, `business_profile_id`, `version_no`, `snapshot jsonb`
- `change_summary`, `created_by`, `created_at`; unique `(business_profile_id,version_no)`
- snapshot ผ่าน JSON schema version; ใช้ audit/rollback ไม่ใช้แทน typed current fields ทั้งหมด

#### `page_context_profiles`

- `id`, `workspace_id`, `business_profile_id`, `name`, `page_type(main|branch|campaign)`
- `locale`, `timezone`, `location`, `contact_profile jsonb`, `cta_defaults jsonb`, `status`
- composite FK ไป Business; unique active name ต่อ Business

#### `page_context_versions`

- immutable snapshot + `version_no`, `schema_version`, `created_by`, `created_at`

#### `business_channel_bindings`

- `id`, `workspace_id`, `business_profile_id`, `page_context_profile_id`, `social_account_id`
- `status`, `is_default`, timestamps
- unique active `social_account_id`; social account หนึ่งบัญชีผูก Business เดียวในเวลาเดียวกัน
- สร้างใน deferred integration migration หลัง Meta tables พร้อม

### 4.3 Business Knowledge — `knowledge.core`

#### `business_knowledge_items`

- `id`, tenant/business/page scope, `knowledge_type(fact|proof|service|product|faq|contact|policy|other)`
- `title`, `current_version_id`, `status(draft|active|archived)`, `importance`, timestamps
- partial indexes สำหรับ active items ต่อ Business/Page/type

#### `business_knowledge_versions`

- immutable: `id`, scope, `knowledge_item_id`, `version_no`, `content`, `structured_data jsonb`
- `source_kind(user|import|research|system)`, `evidence_item_id nullable`, `verified_by`, `verified_at`
- `valid_from`, `valid_until`, `created_by`, `created_at`
- unique `(knowledge_item_id,version_no)`; current pointer ต้องชี้ version ของ item เดียวกัน

#### Typed knowledge tables

- `brand_voice_profiles`: tone chips, words to use/avoid, sample text, current version
- `audience_segments`: needs, pains, objections, locale, priority
- `offers`: name, details, validity, CTA, conditions, active state
- `content_restrictions`: level(hard|soft), category, rule, replacement guidance, jurisdiction
- `business_source_policies`: allow/deny/prefer source rules, freshness SLA, verification requirement
- ทุก table มี Workspace/Business/Page scope, version/history หรือ immutable version child

กฎ resolution: Industry base → Business override → Page override → Content brief; hard restriction override ไม่ได้

### 4.4 Industry Pack — `industry.core`

#### `industry_packs`

- global catalog: `id`, `pack_key`, `name_th`, `status(draft|published|retired)`, `current_version_id`
- read-only สำหรับ tenant; write เฉพาะ platform admin service

#### `industry_pack_versions`

- immutable: `id`, `industry_pack_id`, semantic `version`, `schema_version`, `published_at`
- `quality_rules`, `research_recipes`, `source_policy`, `content_templates`, `restricted_claims` เป็น validated JSON documents
- checksum + unique `(industry_pack_id,version)`; published row ห้าม update

#### `business_industry_assignments`

- `id`, `workspace_id`, `business_profile_id`, `industry_pack_id`, `pinned_version_id`
- `overrides jsonb`, `status`, `assigned_by`, timestamps
- unique active assignment ต่อ Business; override ห้ามลด hard safety rule

### 4.5 Research, Evidence และ Suggestion — `research.core`

#### `research_runs`

- `id`, scope, `run_type(onboarding|topic|refresh|competitor)`, `query_brief jsonb`
- `status(queued|running|completed|partial|failed|cancelled)`, `job_id`, `industry_pack_version_id`
- `started_at`, `completed_at`, `fresh_until`, `created_by`, timestamps
- unique `(workspace_id,client_request_id)` ป้องกันสั่งซ้ำ

#### `research_sources`

- source registry/reference ต่อ run: `id`, scope, `research_run_id`, `canonical_url_hash`, `domain`
- `title`, `publisher`, `published_at`, `retrieved_at`, `source_type`, `trust_tier`, `policy_result`
- unique `(research_run_id,canonical_url_hash)`; URL ที่แสดงได้แยกจาก normalized/hash

#### `source_snapshots`

- immutable/private or restricted: `id`, source_id, `storage_reference`, `content_hash`, `mime_type`, `captured_at`, `retention_until`
- ไม่คืน full copyrighted snapshot ให้ client; query service คืน excerpt ที่ policy อนุญาต

#### `evidence_items`

- `id`, scope, `research_run_id`, `research_source_id`, `claim`, `supporting_excerpt`, `locator jsonb`
- `confidence`, `verification_status`, `fresh_until`, `content_hash`, timestamps
- immutable; index scope + freshness; dedupe ด้วย content hash ใน Business

#### `research_suggestions`

- `id`, scope, `research_run_id`, `title`, `angle`, `why_relevant`, `content_goal`
- `evidence_count`, `status(new|saved|dismissed|used|expired)`, `score`, `expires_at`
- `saved_by`, `used_content_idea_id`; user status update optimistic lock ด้วย `version`

### 4.6 Content, Version และ Platform Variant — `content.core`

#### `content_ideas`

- `id`, scope, `research_suggestion_id`, `goal`, `topic`, `brief jsonb`, `status`
- `client_request_id`, `created_by`, timestamps; unique idempotency ต่อ workspace

#### `content_items`

- `id`, scope, `title`, `content_type(post|carousel|reel)`, `status(draft|in_review|approved|scheduled|publishing|published|archived)`
- `current_version_id`, `approval_state`, `created_by`, timestamps, `deleted_at`
- state change ผ่าน domain command; ห้าม client update status อิสระ

#### `content_versions`

- immutable: `id`, scope, `content_item_id`, `version_no`, `body`, `structured_content jsonb`
- `source(generated|manual|revision)`, `parent_version_id`, `generation_run_id`, `brief_snapshot jsonb`
- `knowledge_snapshot_refs jsonb`, `created_by`, `created_at`; unique item/version

#### `content_variants`

- `id`, scope, `content_version_id`, `platform(facebook|instagram)`, `variant_type`, `body`, `metadata jsonb`
- immutable; unique logical variant key ต่อ content version/platform

#### `quality_reviews`

- `id`, scope, `content_version_id`, `rule_set_version`, `status(pass|warn|block|error)`
- `score_dimensions jsonb`, `findings jsonb`, `reviewer_type(ai|human|system)`, `generation_run_id`, `created_at`
- immutable; finding ต้องมี stable rule code และ user-facing Thai message

#### `content_targets`

- `id`, scope, `content_item_id`, `social_account_id`, `content_variant_id`, `status`
- unique active target ต่อ content item/social account; target pin immutable version ก่อน approve/schedule

### 4.7 Approval และ Calendar — `approval.core`, `calendar.core`

#### `approval_policies` / `approval_policy_steps`

- Policy อยู่ Workspace หรือ Business scope; `enabled`, `version`, minimum approvers, role/scope requirement
- steps มีลำดับ, action type, required role; published policy version immutable

#### `approval_requests`

- `id`, scope, `content_item_id`, `content_version_id`, `policy_version_id`
- `status(pending|approved|changes_requested|cancelled|expired)`, `requested_by`, timestamps
- request pin content version; การแก้ content หลัง request ต้องสร้าง request/revision ใหม่

#### `approval_events`

- append-only: request_id, step, action, actor, comment, occurred_at, request/correlation id
- unique idempotency key ต่อ action; decision ห้าม update/delete

#### `calendar_items`

- `id`, scope, `content_item_id`, `scheduled_local_date`, `timezone`, `display_status`
- ใช้เพื่อ planning แม้ยังไม่ publish; unique active calendar placement ตาม policy

#### `content_schedules`

- `id`, scope, `content_target_id`, `scheduled_for timestamptz`, `timezone_snapshot`
- `status(draft|armed|dispatched|cancelled|completed|failed)`, `publish_intent_id`, `version`
- approval gate + asset/rights/quality gate ต้องผ่านก่อน `armed`

### 4.8 Meta Connection, Publishing และ Metrics — `connector.meta`, `publisher.meta`

#### `meta_connections`

- `id`, `workspace_id`, `connected_by`, `credential_reference`, `status`, `granted_scopes`
- `token_expires_at`, `last_validated_at`, `reauth_reason_code`, timestamps
- credential reference อยู่ private/vault; tenant client อ่านเฉพาะ redacted health view

#### `social_accounts`

- `id`, `workspace_id`, `meta_connection_id`, `platform`, `external_account_id_hash`, encrypted/raw reference private
- `display_name`, `account_type`, `status`, `capabilities jsonb`, `last_synced_at`
- unique provider/external id; ห้ามย้ายเข้า Workspace ใหม่แบบ update—ต้อง reconnect/audit

#### `meta_webhook_events`

- private inbox: `id bigint`, provider event id/hash, headers/payload encrypted or redacted, received_at, processed_at, status
- unique provider event key; retention + replay policy; client ไม่มี grant

#### `publish_intents`

- `id`, scope, `content_item_id`, `content_version_id`, `requested_by`, `request_kind(now|scheduled)`
- `status`, `idempotency_key`, `created_at`; unique `(workspace_id,idempotency_key)`

#### `publish_targets`

- intent fan-out ต่อ social account: pinned content variant + asset version refs, target status
- Facebook สำเร็จ/Instagram ล้มเหลวต้องแสดง partial success โดยไม่ rollback post ที่สำเร็จ

#### `publish_jobs`

- `id`, scope, target_id, kernel_job_id, status, attempt summary, provider_request_key, timestamps
- provider request key unique ต่อ target; retry ห้ามสร้าง post ซ้ำ

#### `published_posts`

- immutable publication record: target_id, platform, external_post_id/reference, published_at, permalink, snapshot refs
- unique platform/external post id และ unique successful target

#### `performance_snapshots`

- high-volume identity PK, scope, published_post_id, metric_time, metric values/JSON with schema version
- unique `(published_post_id,metric_time)`; partition-ready by month; no destructive overwrite

### 4.9 Jobs, Outbox และ Notification — `jobs.kernel`, `notification.core`

#### `background_jobs`

- `id uuid`, tenant context, `job_type`, `owner_module`, `payload_ref`, `status`
- `priority`, `available_at`, `lease_owner`, `lease_expires_at`, `attempt_count`, `max_attempts`
- `idempotency_key`, request/correlation/causation ids, timestamps
- partial claim index on queued/retryable + available time; payload ไม่มี secret/full media/content

#### `job_attempts`

- append-only identity PK, job_id, attempt_no, worker, started/finished, result, stable error code, redacted diagnostic
- unique `(job_id,attempt_no)`

#### `dead_letter_jobs`

- job ref, reason, replay policy/status, first/last failed, resolved_by; Admin/service only

#### `domain_outbox`

- identity PK, event UUID unique, owner module, type/version, tenant context, payload/reference, occurred/published time
- partial index สำหรับรายการที่ยังไม่ publish; cleanup หลัง retention/consumer guarantees เท่านั้น

#### `consumed_events`

- `(consumer_key,event_id) PK`, consumed_at; TTL only when replay horizon expired

#### `notification_outbox`

- domain request to notify, channel candidates, template key/version, recipient reference, status, idempotency key

#### `user_notifications`

- user-visible durable inbox: user/workspace, type, title/body Thai, action route/reference, read_at, created_at, expires_at
- RLS recipient only; service creates; list keyset by created_at/id

#### `notification_preferences`, `push_subscriptions`

- preferences ต่อ user/workspace/event category; mandatory security events opt-out ไม่ได้
- push endpoint/key encrypted; user จัดการของตนเอง; revoke/delete audit ได้

### 4.10 AI Credential, Model Registry และ Usage — `ai.gateway`, `metering.core`

#### `model_registry` / `model_capabilities`

- curated global catalog: provider, model key, display name, status, capability, context/output limits, price version
- tenant read active projection; platform service write only

#### `provider_credentials`

- private table: id, workspace_id, provider, secret_reference, key fingerprint, status, created_by, validated_at
- unique active provider/fingerprint per workspace; never store/return plaintext; log ใช้ fingerprint 4–8 ตัวเท่านั้น

#### `workspace_ai_policies`

- workspace/business optional scope, mode(platform|byok), allowed model ids, default model, fallback policy
- per-job ceiling, monthly budget, data handling flags, version/timestamps
- policy resolver ต้องตรวจ entitlement ก่อน dispatch

#### `generation_runs`

- immutable logical run: scope, operation(research_assist|analyze|generate|quality), input/output refs
- model/provider snapshot, credential payer(platform|customer), status, job id, latency, stable error, timestamps
- raw prompt/response retention แยก policy และต้อง redact personal/secret data

#### `usage_reservations`

- id, workspace, quota dimension, reserved amount/cost, status(active|committed|released|expired), expires_at
- atomic reserve ก่อนสร้าง job; unique idempotency; expiry reconciliation job

#### `usage_events`

- append-only identity PK, workspace/business, source module/run, dimension, quantity, unit
- provider/model, payer, estimated/actual cost, currency, price version, occurred_at
- unique source idempotency; service insert only; monthly partition-ready

#### `quota_buckets`

- workspace + period + dimension, limit, used, reserved, version; atomic CHECK `used+reserved <= limit` เมื่อ hard limit
- ledger เป็น truth สำหรับ reconcile; bucket เป็น projection/fast guard

### 4.11 Billing, Entitlement และ Audit — `billing.core`, `audit.core`

#### `plans`, `plan_prices`, `plan_entitlements`

- global versioned catalog; price มี currency, billing interval, valid range
- entitlement เป็น typed feature/dimension/limit; published version immutable

#### `workspace_subscriptions`

- workspace, plan/price version, provider customer/subscription reference, status
- trial/current period/grace/cancel timestamps; unique active subscription ต่อ workspace

#### `billing_webhook_events`

- private deduplicated inbox; raw payload protected, signature check status, processing/replay status

#### `billing_invoices` / `billing_payments`

- provider reference, workspace, amount/currency/tax/status/dates; ไม่เก็บ card data
- Phase 1 อาจเป็น read model จาก payment provider แต่ต้องรองรับใบเสร็จ/VAT flow

#### `audit_logs`

- append-only identity PK, workspace/business/page scope, actor type/id, action, target type/id
- before/after summary แบบ redacted, IP/user-agent hash ตาม retention, request/correlation ids, occurred_at
- tenant Owner/Admin อ่าน event ที่อนุญาต; security/provider details platform admin only

#### `security_events`

- auth/permission/credential/replay anomaly ที่ต้อง alert; severity, stable code, scope, resolution state
- append-only + restricted view

---

## 5. RLS และ Authorization Contract

### 5.1 Role baseline

| Capability | Owner | Admin | Editor | Approver | Viewer |
|---|---:|---:|---:|---:|---:|
| Workspace settings/billing | ✓ | เฉพาะ setting ที่มอบหมาย | – | – | – |
| Manage member/scope | ✓ | ✓ ยกเว้น Owner | – | – | – |
| Business/Page setup | ✓ | ✓ | ตาม scope ที่อนุญาต | ดู | ดู |
| Knowledge/Research | ✓ | ✓ | สร้าง/แก้ตาม scope | ดู | ดู |
| Content create/edit | ✓ | ✓ | ✓ ตาม scope | ดู/เสนอแก้ | ดู |
| Approve/reject | ✓ | ตาม policy | เมื่อมี Approver role/scope | ✓ ตาม scope | – |
| Schedule/publish | ✓ | ✓ | เมื่อ policy อนุญาตและ approved | – | – |
| Credential/BYOK | ✓ | optional explicit capability | – | – | – |
| Audit | ✓ | limited | own actions | approval trail | – |

Role เป็น baseline; `workspace_member_scopes` ต้องตัดให้แคบลงอีก ไม่เคยขยายเกิน Role

### 5.2 Policy pattern บังคับ

- ทุก exposed table: `enable row level security` และ production ใช้ `force row level security` เมื่อไม่กระทบ service path
- Policy ระบุ `to authenticated`; anonymous ไม่มี tenant access
- SELECT ตรวจ active membership + role capability + Business/Page scope + row not deleted ตาม contract
- INSERT ใช้ `with check` ทั้ง Workspace/Business/Page; `created_by = (select auth.uid())` เมื่อเป็น user action
- UPDATE มีทั้ง `using` และ `with check`; immutable/append-only tables ไม่มี user update policy
- DELETE เปิดเฉพาะ soft-delete command; ห้าม broad direct delete policy
- Service role ไม่ถูกใช้จาก browser/mobile; server/worker ยังต้องเรียก authorization/domain service ก่อน mutation
- Views ที่ exposed ใช้ `security_invoker = true`; function security definer ต้อง `set search_path = ''` และ qualify object เต็ม
- Authorization helper ใช้ `(select auth.uid())` เพื่อลด per-row re-evaluation และต้อง index membership/scope columns

### 5.3 RLS test matrix ขั้นต่ำ

ทุก tenant table ต้องทดสอบอย่างน้อย:

1. same Workspace + allowed Role = ผ่าน
2. same Workspace + wrong Role = ไม่ผ่าน
3. same Workspace + allowed Business แต่ wrong Business = ไม่เห็น/เขียนไม่ได้
4. same Business + allowed Page แต่ wrong Page = ไม่เห็น/เขียนไม่ได้
5. different Workspace แต่รู้ UUID = ไม่เห็น/เขียนไม่ได้
6. suspended/left member = ไม่เห็น/เขียนไม่ได้
7. anonymous = ไม่เห็น
8. forged `created_by`, `workspace_id`, `business_profile_id` = insert/update fail
9. immutable history/ledger = update/delete fail
10. service command ที่ถูกต้อง = ผ่านและสร้าง audit/outbox ตาม contract

RLS test ต้อง assert ทั้ง row count และ error behavior เพื่อแยก “ไม่มีข้อมูล” จาก “mutation ถูกปฏิเสธ”

---

## 6. Migration Sequence และ Dependency Gate

ใช้เลขช่วงกลางกำกับ; Agent ทำไฟล์ในช่วงตนเองได้ แต่ Integration Owner เป็นคน assign timestamp/ordinal จริงก่อน merge

| ลำดับ | Migration batch | Owner | Dependency | Deliverable / Gate |
|---:|---|---|---|---|
| 000 | extensions + private schema + conventions | Integration | none | UUID/search extension ที่ใช้จริง, schemas, updated_at helper, comments |
| 010 | profiles/workspaces/roles/members/invitations/settings | Identity | 000 | Workspace lifecycle + basic RLS |
| 011 | authorization helpers v1 | Identity/Security | 010 | membership/capability checks + tests |
| 020 | businesses/page contexts + versions | Business | 011 | tenant/business/page lineage |
| 021 | member Business/Page scopes | Identity + Business | 020 | deferred FK + scope policies |
| 030 | industry pack catalog/versions/assignments | Industry | 020 | immutable version + seed Pack v0 |
| 040 | knowledge core + typed profiles | Knowledge | 020,030 | resolution-ready schema |
| 041 | resolved knowledge views/functions | Knowledge | 040 | stable query contract + tests |
| 050 | jobs/outbox/consumer ledger | Jobs Kernel | 011 | async skeleton before AI/research |
| 051 | notifications/preferences/push | Notification | 050 | durable inbox + recipient RLS |
| 060 | AI model catalog/credential refs/policies | AI Gateway | 011,020 | redacted config surface |
| 061 | metering reservations/events/quota | Metering | 050,060 | atomic reserve/commit/release |
| 070 | research sources/evidence/suggestions | Research | 030,040,050,061 | evidence lineage + async run |
| 080 | content ideas/items/versions/variants/quality | Content | 040,050,060,070 | immutable content lineage |
| 081 | content target placeholder/reference contract | Content | 080 | deferred Social FK prepared |
| 090 | approval policies/requests/events | Approval | 080 | optional approval with immutable decision |
| 091 | calendar/schedules | Calendar | 080,090 | timezone-safe scheduling |
| 100 | Asset Library migrations | Asset owner | 020,050,061,080 | existing detailed spec; coordinated only |
| 110 | Meta connection/accounts/webhook inbox | Meta Connector | 020,050 | private credentials/webhooks |
| 111 | Business-channel bindings + target Social FK | Integration | 110,020,081 | cross-module relations |
| 120 | publish intents/targets/jobs/posts | Meta Publisher | 080,091,100,110,050 | pin versions + idempotent target fan-out |
| 121 | metrics snapshots | Meta Publisher | 120 | append-only/partition-ready metrics |
| 130 | plans/prices/entitlements/subscription | Billing | 010 | entitlement contract |
| 131 | billing webhook/invoice/payment read model | Billing | 130,050 | dedupe/reconciliation |
| 132 | quota entitlement integration | Billing+Metering | 061,130 | effective limit resolver |
| 140 | audit/security event core | Audit | 011 | restricted append-only log |
| 141 | audit hooks/domain event consumers | Integration | all domain batches | important actions covered |
| 150 | performance indexes + partition readiness | DB performance | production-like fixture | EXPLAIN budget passes |
| 160 | retention/PDPA/anonymization functions | Security/Data | all | deletion/export map + tests |
| 170 | grants hardening + exposed view review | Security | all | no secret/internal table exposure |
| 180 | ERD/data dictionary/type generation | Integration | all | artifacts generated from final schema |

### Migration rules

- Migration ที่ merge แล้วห้ามแก้ย้อนหลัง; ใช้ forward-fix migration
- DDL ที่เสี่ยง lock ต้องมี production-safe plan, timeout และ backfill แยก batch
- Add column แบบ nullable → backfill chunked → validate → set constraint เป็นขั้น
- Index ตารางใหญ่ใช้ concurrent strategy ใน production migration runner ที่รองรับ
- Seed global catalog ต้อง idempotent ด้วย stable keys; ห้าม seed pilot customer ใน production
- CI ต้องสร้างฐานใหม่และ migrate upgrade จาก release ก่อนหน้าได้ทั้งคู่

---

## 7. Execution Packages สำหรับแจก Agent

### DB-00 — Schema Foundation และ Test Harness

**Owner:** Integration/Database Agent  
**Depends on:** none  
**Blocks:** ทุก package

Deliverables:

- conventions, schema/comment helper และ migration runner
- factories สำหรับ User/Workspace/Business/Role
- test helper สลับ JWT user/anonymous/service context
- schema lint: table ไม่มี PK, FK ไม่มี index, tenant table ไม่มี RLS, view ไม่ security-invoker
- CI jobs: clean migrate, upgrade migrate, RLS suite, generated type drift

Acceptance:

- clean DB deploy ผ่านซ้ำได้
- test สร้าง User A/B, Workspace A/B และ assert cross-tenant denial ได้
- CI fail เมื่อเพิ่ม tenant table ที่ไม่มี RLS/policy/index/comment owner

### DB-01 — Identity, Workspace และ Authorization

**Owner:** Identity Agent  
**Depends on:** DB-00  
**Blocks:** ทุก tenant Module

Deliverables: migrations 010–011, workspace command transaction, membership/scope RLS, invite token hashing, role seeds, tests

Acceptance:

- create workspace สร้าง Owner active คนเดียวกันแบบ atomic
- Owner คนสุดท้ายออกไม่ได้; transfer แล้วจึงออกได้
- suspended member access หายทันที
- invitation expired/reused/wrong email ใช้ไม่ได้
- helper query p95 ตาม fixture อยู่ใน budget และไม่ per-row full scan

### DB-02 — Business, Page และ Scope Binding

**Owner:** Business Agent  
**Depends on:** DB-01  
**Blocks:** Knowledge, Research, Content, Asset, Meta binding

Deliverables: migrations 020–021, version snapshots, composite tenant constraints, member Business/Page scope tests

Acceptance:

- Workspace หนึ่งมีหลาย Business/Page ได้
- Page ผูก Business เดียว; cross-business FK fail ที่ DB
- Editor จำกัด Business A มอง Business B ไม่เห็น แม้อยู่ Workspace เดียวกัน
- Page scope ไม่เห็น Page อื่น; Owner/Admin ตาม role เห็นได้

### DB-03 — Industry Pack และ Knowledge

**Owner:** Knowledge/Industry Agent  
**Depends on:** DB-02  
**Can parallel with:** DB-04 หลัง contract lock

Deliverables: migrations 030–041, Pack schema validation, GoldenHome pack fixture, Sarolux restricted-rule fixture, resolution query/service tests

Acceptance:

- published Pack version update/delete ไม่ได้
- Business pin version ได้และไม่เปลี่ยนเองเมื่อ current Pack เปลี่ยน
- hard restriction ถูก Page override ไม่ได้
- resolved context คืนเฉพาะ Workspace/Business/Page ที่ร้องขอและมีสิทธิ์
- Knowledge version ที่ถูก Content อ้างยังอ่านย้อนหลังได้

### DB-04 — Job Kernel และ Notification

**Owner:** Platform Async Agent  
**Depends on:** DB-01  
**Can parallel with:** DB-02/03

Deliverables: migrations 050–051, enqueue/claim/lease/retry/DLQ functions or repositories, transactional outbox, durable notification inbox

Acceptance:

- enqueue idempotency key เดิมได้ job เดิม
- worker สองตัว claim job เดียวกันไม่ได้
- worker ตายแล้ว lease หมดอายุและ reclaim ได้
- state + outbox atomic; notification ส่งพลาดไม่ rollback domain state
- user เห็น notification เฉพาะของตนและกลับมาอ่านหลัง reconnect ได้

### DB-05 — AI Gateway, Credential และ Metering

**Owner:** AI Platform Agent  
**Depends on:** DB-01, DB-02, DB-04  
**Blocks:** Research/Content generation, Paid Beta

Deliverables: migrations 060–061, credential vault adapter contract, redacted views, model seed, quota reserve/commit/release/reconcile

Acceptance:

- plaintext API key ไม่อยู่ table/log/API response
- Editor/Viewer อ่าน fingerprint/config ลับไม่ได้
- concurrent reservations เกิน quota ไม่สำเร็จ
- job success commit actual usage; fail/cancel release; expired reservation reconcile ได้
- usage event duplicate ไม่เพิ่มยอดซ้ำ

### DB-06 — Research และ Evidence

**Owner:** Research Agent  
**Depends on:** DB-03, DB-04, DB-05  
**Blocks:** Content suggestion/generation

Deliverables: migration 070, source canonicalization contract, snapshot retention refs, evidence lineage, suggestion state machine, fixtures/tests

Acceptance:

- run ทุกตัวมี Business และ Pack version
- evidence trace กลับ source/snapshot/retrieval time ได้
- source ที่ policy deny ไม่กลายเป็น approved evidence
- expired suggestion/evidence ถูก mark และ trigger refresh ได้
- Business A retrieval ไม่มี evidence ของ Business B แม้ vector/text ใกล้กัน

### DB-07 — Content, Version, Variant และ Quality

**Owner:** Content Agent  
**Depends on:** DB-03, DB-04, DB-05, DB-06  
**Blocks:** Approval, Asset link, Publish

Deliverables: migrations 080–081, version command, platform variants, quality result schema, content state machine, tests

Acceptance:

- content version ที่ approve/publish แล้วแก้ไม่ได้; edit สร้าง version ใหม่
- Facebook/Instagram variant pin source version ชัดเจน
- quality block ทำให้ schedule/publish ไม่ผ่าน
- content ทุกชิ้น trace brief, knowledge refs, evidence, generation และ quality review ได้
- concurrent edit ใช้ version conflict ไม่ silent overwrite

### DB-08 — Approval และ Calendar

**Owner:** Workflow Agent  
**Depends on:** DB-07  
**Can parallel with:** DB-09 Meta connector

Deliverables: migrations 090–091, optional approval policy, request/decision command, timezone schedule conversion, tests

Acceptance:

- Workspace ปิด approval แล้ว authorized Editor schedule ได้ตาม policy
- เปิด approval แล้ว unapproved version schedule/publish ไม่ได้
- approve Version 2 ไม่อนุมัติ Version 3 โดยอัตโนมัติ
- Approver จำกัด Business/Page ตัดสินนอก scope ไม่ได้
- เวลาไทยที่เลือกแปลง UTC ถูกต้องและแสดง timezone snapshot ย้อนหลังได้

### DB-09 — Meta Connection และ Social Account

**Owner:** Meta Connector Agent  
**Depends on:** DB-02, DB-04  
**Can parallel with:** DB-06–08

Deliverables: migrations 110–111, credential reference, webhook inbox/dedupe, social account capability sync, health view, binding tests

Acceptance:

- Workspace เชื่อมหลาย Facebook Page/IG account ได้
- Social account ผูก Business/Page ถูกต้องและ cross-tenant binding fail
- raw token/webhook client อ่านไม่ได้
- duplicate webhook process ครั้งเดียว
- disconnect/expiry เก็บ history และแสดง reconnect state ได้

### DB-10 — Publishing และ Metrics

**Owner:** Meta Publisher Agent  
**Depends on:** DB-07, DB-08, DB-09, Asset schema, DB-04  
**Blocks:** Production Phase 1

Deliverables: migrations 120–121, fan-out target, pinned payload refs, publish idempotency, partial success, metrics snapshots

Acceptance:

- FB+IG สร้าง target/job แยกกันและติดตามแยกได้
- retry target ไม่สร้าง external post ซ้ำเมื่อ provider response timeout
- FB success + IG fail แสดง partial โดยไม่ลบ FB
- publish ใช้ approved pinned content/asset versions เท่านั้น
- metrics duplicate snapshot ไม่เพิ่ม row ซ้ำและ cross-business read ไม่ได้

### DB-11 — Billing, Subscription และ Entitlement

**Owner:** Billing Agent  
**Depends on:** DB-01, DB-04, DB-05  
**Can parallel with:** Product Modules  
**Blocks:** Paid Beta

Deliverables: migrations 130–132, plan/version seeds, subscription/grace state, webhook inbox, entitlement resolver, tests

Acceptance:

- plan change มี effective period ไม่ rewrite history
- webhook duplicate/out-of-order reconcile ถูกต้อง
- expired/grace/cancel status ให้ capability ตาม policy
- payment dataไม่มี card secret; invoice/payment trace provider reference ได้
- effective quota เข้า metering แบบ versioned และ audit ได้

### DB-12 — Audit, Security, Retention และ Hardening

**Owner:** Security/Data Agent  
**Depends on:** ทุก Module schema stable  
**Blocks:** Pilot/Production gates

Deliverables: migrations 140–170, audit coverage map, security event rules, retention matrix, PDPA export/delete job contract, grants/RLS review, EXPLAIN report

Acceptance:

- critical actions มี actor/request/target/outcome โดยไม่ log secret
- tenant export ครบตาม Data Inventory
- deletion ปิด access ทันทีและ hard-delete/anonymize ตาม retention
- restore fixture แล้ว RLS/lineage ยังถูกต้อง
- exposed schema audit ไม่พบ credential, raw webhook, DLQ payload หรือ internal billing payload

### DB-13 — Integration Artifacts และ Sign-off

**Owner:** Integration Agent  
**Depends on:** DB-00–12  
**Blocks:** Feature freeze

Deliverables: migration graph, generated ERD, data dictionary, typed client types, schema checksum, final test report, known limitations

Acceptance:

- clean migrate + previous-release upgrade ผ่าน
- generated types ไม่มี drift
- cross-module contract test ผ่าน
- Master backlog ทุก P0 database item link ไป migration/test owner
- Architecture/Security/Product sign-off ครบ

---

## 8. Parallelization Plan ที่ไม่ทำให้ Agent ชนกัน

### Wave A — Serial foundation

1. DB-00 Foundation
2. DB-01 Identity/RLS
3. DB-02 Business/Page scope

สาม package นี้ต้อง merge ตามลำดับ เพราะเป็น FK และ policy base ของทุก Module

### Wave B — Parallel platform/domain base

หลัง DB-02 contract freeze ให้ทำพร้อมกัน:

- Agent A: DB-03 Industry + Knowledge
- Agent B: DB-04 Jobs + Notification
- Agent C: DB-09 Meta Connector spike/schema
- Agent D: DB-11 Billing catalog/subscription base
- Agent E: Asset schema ตาม detailed spec

Integration Owner merge migration ตามเลข batch ห้าม Agent เปลี่ยน shared helper เอง

### Wave C — Parallel product engines

เมื่อ DB-03/04/05 พร้อม:

- Research Agent: DB-06
- Content Agent: DB-07 เริ่ม scaffold/contract test แล้วต่อ migrationหลัง Research contract lock
- Workflow Agent: DB-08 scaffold จาก Content contract
- Meta Agent: ทำ connection test และ webhook replay
- Security Agent: เริ่ม Data Inventory/RLS static audit ตั้งแต่ยังพัฒนา

### Wave D — Integration

- DB-10 Publishing + Asset + Approval + Schedule integration
- DB-11 entitlement ↔ metering integration
- DB-12 audit/retention/performance/grants
- DB-13 final artifact and release gate

### File ownership rule สำหรับ Git

- แต่ละ Agentมี folder `db/modules/<module>/migrations`, `src/modules/<module>`, `tests/db/<module>`
- shared files เช่น migration manifest, generated DB types, ERD แก้โดย Integration Agent เท่านั้น
- Agent ส่ง contract proposal ก่อนสร้าง cross-module FK
- PR หนึ่งรายการต้องมี migration + repository/query service + tests + data dictionary fragment พร้อมกัน
- ห้ามหลาย Agent regenerate shared types พร้อมกัน; ทำครั้งเดียวหลัง merge wave

---

## 9. Test Plan แบบบังคับ

### 9.1 Schema tests

- PK/unique/check/FK/composite tenant constraints
- FK delete behavior ทุก relation: restrict, cascade หรือ set null ต้องอธิบาย
- immutable table update/delete rejection
- invalid state transition rejection ผ่าน domain command
- idempotency unique constraint ทุก async/create path

### 9.2 Authorization tests

- RLS 10 cases ใน Section 5.3 ทุก table
- role × action × resource matrix
- Business/Page scope nesting
- invitation/suspension/ownership transfer
- service-only table grants
- view/function privilege escalation tests

### 9.3 Concurrency tests

- quota reservation พร้อมกัน
- job claim/lease/reclaim
- duplicate webhook/event/publish request
- content concurrent edit/approval race
- schedule cancellation ขณะ dispatch
- last-owner transfer/leave race

### 9.4 Migration tests

- migrate blank DB
- upgrade from latest production snapshot
- seed rerun
- partial/backfill resume
- downgrade ใช้เฉพาะ local reversible migration; production ใช้ forward-fix runbook
- backup/restore แล้ว checksum, RLS และ immutable lineage ตรง

### 9.5 Performance budgets

ใช้ production-like fixture ขั้นต่ำ: 100 Workspaces, 10 Businesses/workspace, 20 Pages/workspace, 100k Content, 1M Usage/Audit/Metric rows

- workspace switch/list และ membership check: index scan ไม่มี sequential scan ตารางโต
- content/calendar/library page แรก p95 DB time ตาม SLO ที่ทีมกำหนดก่อน implementation
- worker claim batch ไม่ block writer และไม่ claim ซ้ำ
- quota reservation เป็น bounded lock ต่อ workspace/period
- EXPLAIN plan snapshot สำหรับ top 20 queries เก็บใน CI artifact

### 9.6 Security/Privacy tests

- secret scanning ทั้ง DB fixture/log/API snapshot
- raw provider error ถูก redact
- signed/private access ไม่ bypass RLS
- PDPA export มีเฉพาะ tenant ตนเอง
- delete/anonymize ครบ child data ตาม retention map
- audit log ไม่เก็บ prompt/token/webhook payload ที่มีข้อมูลลับเกินจำเป็น

---

## 10. Deliverable Checklist ต่อ Module

Agent จะถือว่างานเสร็จเมื่อส่งครบ:

- [ ] Migration up + production forward-fix note
- [ ] Owner comment ของ table/view/function
- [ ] PK, FK, CHECK, unique และ indexes
- [ ] RLS SELECT/INSERT/UPDATE/DELETE ตามจริง
- [ ] Explicit grants/revokes
- [ ] Typed repository/query service; ไม่มี raw query ข้าม Module
- [ ] Domain event/outbox contract เมื่อ state เปลี่ยนข้าม Module
- [ ] Unit + integration + RLS + concurrency tests
- [ ] Fixture/seed แยก production กับ pilot
- [ ] Data dictionary: ความหมาย, sensitivity, retention, source of truth
- [ ] Observability: stable error code, metric และ audit action
- [ ] Cost/quota dimension ถ้ามี
- [ ] Mobile/API error mapping เป็นข้อความไทย ไม่คืน SQL/provider error
- [ ] PR ระบุ dependency, migration order และ rollout risk

---

## 11. Global Acceptance Criteria ก่อนเริ่ม Feature Dev เต็มรูปแบบ

### Gate G1 — Tenant Foundation Ready

- DB-00–02 ผ่าน
- Workspace/Business/Page isolation suite ผ่าน 100%
- Agent ทุกตัวใช้ Tenant Context contract เดียวกัน
- ไม่มี Module สร้าง tenant table เองนอก migration ownership

### Gate G2 — Async + Cost Foundation Ready

- DB-04–05 ผ่าน
- background job, notification, quota reservation และ usage ledger ทำงาน end-to-end
- kill/retry/duplicate simulation ไม่ทำ state หรือ cost ซ้ำ

### Gate G3 — Content Lineage Ready

- DB-03, DB-06, DB-07, DB-08 ผ่าน
- Suggestion → Evidence → Content Version → Quality → Approval → Schedule trace ได้ครบ
- Business/Page Knowledge ไม่ปะปน

### Gate G4 — Meta Publish Ready

- DB-09–10 + Asset integration ผ่าน
- multi-page, FB+IG fan-out, partial success, reconnect, retry และ no-duplicate publish ผ่าน

### Gate G5 — Paid Beta Ready

- DB-11–13 ผ่าน
- billing/quota/audit/PDPA/backup/restore/monitoring/runbook พร้อม
- Security review ไม่พบ Critical/High และ Product sign-off non-tech/mobile flow

---

## 12. Definition of Ready สำหรับแจก Task ให้ Sub-agent

Task ห้ามเริ่มจนมี:

1. Task ID และ Module owner
2. input/output contract และตารางที่เป็นเจ้าของ
3. dependency migration ที่ merge แล้วหรือ stable interface mock
4. exact acceptance tests รวม negative/cross-tenant case
5. event/API version และ idempotency rule
6. data classification/retention/cost impact
7. file/folder ownership เพื่อไม่ชน Agent อื่น
8. reviewer: Domain owner + Integration + Security เมื่อแตะ RLS/secret

## 13. Definition of Done สำหรับ Database Task

Task ยังไม่ Done หากมีเพียง table หรือ migration ต้องครบ:

- schema + constraint + index + RLS + grants
- repository/query interface + event/outbox เมื่อเกี่ยวข้อง
- happy, negative, cross-tenant, retry/concurrency tests
- clean/upgrade migration verification
- generated docs/types updated โดย Integration Agent
- no secret/raw error exposure
- acceptance evidence แนบใน PR
- backlog item และ dependency graph อัปเดต

---

## 14. ความเสี่ยงที่ Integration Owner ต้องเฝ้า

| ความเสี่ยง | Early warning | Prevention |
|---|---|---|
| Agent สร้างชื่อ/field tenant ไม่เหมือนกัน | มี `tenant_id`, `brand_id`, `page_id` หลายแบบ | canonical naming + migration review |
| RLS ดู Workspace แต่ลืม Business/Page | test same-workspace cross-business fail | mandatory scope matrix |
| Cross-module FK เป็นวงจร | migration ต้องสลับแก้หลายรอบ | deferred integration batch |
| JSON กลายเป็นที่เก็บ critical state | query permission/quota ผ่าน JSON path | typed columns สำหรับ security/cost/state |
| Worker ทำงานซ้ำ | duplicate content/cost/post | DB idempotency + outbox + consumed ledger |
| Token/Key หลุด | fixture/log มี credential | vault reference + redaction tests |
| Immutable history ถูกแก้ | update version/approval/usage ได้ | no update grants/policies + trigger/command |
| Migration lock production | DDL timeout/long transaction | expand-backfill-contract + query budget |
| Schema กับ generated type drift | app compile ผ่านแต่ runtime fail | Integration-only generation + CI checksum |
| Sub-agent merge พร้อมกันชน manifest | frequent conflicts/order ambiguity | wave merge + Integration Owner assigns ordinals |

---

## 15. First Dispatch Queue

ลำดับ Task ที่สามารถเปิดให้ Agent ทำทันทีหลังอนุมัติเอกสาร:

1. `DB-00.1` สร้าง migration/test folder convention และ CI clean-migrate
2. `DB-00.2` สร้าง RLS/JWT test harness + cross-tenant fixtures
3. `DB-00.3` schema lint สำหรับ PK/FK index/RLS/owner comment
4. `DB-01.1` user profile/workspace/role/member schema
5. `DB-01.2` authorization helper + role/capability tests
6. `DB-01.3` invitation/ownership transfer lifecycle
7. `DB-02.1` Business/Page schema + immutable versions
8. `DB-02.2` member Business/Page scope + RLS matrix
9. `DB-02.3` composite tenant FK utilities/tests

หลัง `DB-02` merge จึง dispatch Wave B แบบพร้อมกันตาม Section 8 เพื่อลดการ rebase และแก้ schema ซ้ำ
