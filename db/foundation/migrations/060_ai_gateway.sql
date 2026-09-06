-- Batch 060 — AI gateway: the curated model registry, the workspace's model policy, and the
-- provider credential REFERENCE.
--
-- Owner: A3 AI Gateway. The migration ownership registry (§6) reserves 060 to this package and
-- describes it as "model/policy/credential reference", depending on 011 and 020.
--
-- Depends on: 000 (schemas `app` and `private`, private.set_updated_at), 001 (app_worker),
-- 010 (app.workspaces). All three are merged; migration invariant 1 forbids rewriting any of them
-- and NOTHING BELOW DOES — every statement here creates a new object, and this file writes no
-- `drop policy` at all, because it writes no policy at all. A test asserts that pairing rather than
-- trusting this sentence.
--
-- 020 IS A DEPENDENCY IN THE REGISTRY AND NOT A DEPENDENCY IN THIS FILE, and 021 is neither.
-- Batch 040 recorded the same shape about 030 and the reason here is stronger than a merge order.
-- §5 scopes this family `global/workspace`. §7's three member-scope types are `all_businesses`,
-- `business` and `page`, and 021's own header says what follows: "every one of them names a
-- Business or a Page — and a WORKSPACE row is not inside any of them". So there is no Business
-- column for a composite foreign key into 020's tables to compare, and no narrowing for 021's
-- helpers to express. Neither batch is referenced below, and inventing a Business scope so that
-- they could be would be adding a scope level two source documents decline to give this family.
--
--
-- THE FIRST BATCH IN THIS REPOSITORY THAT WRITES NO POLICY, AND THAT IS THE WHOLE OF WHAT IS NEW
--
-- Every batch from 010 to 040 implemented §8 cells. This one implements none, because §8 HAS NO
-- ROW FOR A MODEL REGISTRY AND NO ROW FOR A MODEL POLICY — not in §8.1, not in §8.2, not in §8.3,
-- not in §8.4. Batch 030 met that silence first and read it the only way it can be read: "there is
-- no cell to implement and every operation is denied by default". The two rows §8.3 does carry are
-- about the third table and are answered below, one granted and one refused.
--
-- The consequence runs through every decision here: NOTHING IN THIS BATCH IS REACHABLE FROM THE
-- REQUEST PATH. What refuses a caller is the privilege system, and — on the two `app` tables, for
-- the one role holding a grant — row level security with no policy at all. The isolation cases
-- assert exactly which of those two layers refused, on which object, for every identity.
--
--
-- WHY NO CLIENT GRANT, WHEN §9.1 CLASSIFIES A MODEL LABEL `PUBLIC-0`
--
-- §9.1's `PUBLIC-0` row reads "published industry catalog, PUBLIC MODEL LABEL" with "Client
-- projection: allowed". That is the same sentence batch 030 had to weigh, naming this family in
-- the same breath as the one it was about, and the answer is 030's answer:
--
--   * §9.1 licenses the CONTENT. It names no object, no tier and no mechanism.
--   * RFC-2026-012 §2 licenses the OBJECT: "Direct client reads only through named
--     `security_invoker` views, never a base table". §3: "The read allowlist starts empty. Each
--     entry is added by RFC, not by a pull request."
--   * RFC-2026-021 (approved 2026-09-06) then decides what an entry IS — five objects and a
--     registry row — and what a candidate must satisfy, and its C1 is 010's own rule: "a named
--     caller exists, and it is a client". There is no client that reads a model label. There is no
--     `src/`. So this family is an allowlist CANDIDATE and this batch may not make it an entry.
--
-- RFC-2026-012's own inventory says the same thing in its own words, and it is the strictest
-- classification any AI row gets there:
--
--   | ai model registry/policies/generation runs | view only                              |
--   | ai credential refs                         | no read by anyone, including service   |
--
-- "View only" plus an empty allowlist is "no client read". So `authenticated` is granted nothing on
-- any table in this batch, and no view is created. Writing the view here would BE the allowlist
-- entry, and §3 gives that act to an RFC and takes it away from a pull request.
--
-- WHY THE PRECEDENT OF 010, 020, 021, 030 AND 040 DOES NOT REACH THESE TABLES. Those five batches
-- grant `authenticated` column-scoped SELECT on base tables, which RFC-2026-012 §2 also names, and
-- RFC-2026-021 §8.5 requires the list enumerating them to be CLOSED — "any new one fails". 040 was
-- the last to add to it and recorded the debt rather than absorbing it. This batch adds NOTHING to
-- that list, and the reason is not restraint: every grant in those five batches is bounded by a
-- predicate row level security can express — `app.is_active_member(workspace_id)` — so a column
-- drift reaches one workspace and the isolation suite proves the boundary. Here there is no §8 cell
-- to write a policy from, so a client grant would be bounded by the column list and nothing else,
-- on a table whose neighbour is `SECRET-4`. That is RFC-2026-021's C7 exactly, and the answer to it
-- is that the sixth entry on a closed list is not added casually and is not added here.
--
-- `anon` IS GRANTED NOTHING, and since 2026-09-06 that is an approved decision rather than an
-- inherited convention: RFC-2026-021 §7/4 decides it in terms and gives the structural reason —
-- the first `anon` grant is not one grant, it is `grant usage on schema app`, and it changes the
-- DENIAL LAYER of every object in `app` at once. Every anonymous case below declares
-- `deniedOn: { kind: 'schema', name: 'app' }` for that reason.
--
--
-- WHERE THE CREDENTIAL REFERENCE LIVES, WHICH IS THE ONE DECISION IN THIS BATCH WITH A NAME ON IT
--
-- `private`, not `app`. §3.1's own table says so, by name, in the row that defines the schema:
--
--   | `private` | authorization helpers, SECRET REFERENCES, raw webhook, worker payload,
--                 reconciliation | ไม่มี direct grant | Server/worker ผ่าน typed service เท่านั้น |
--
-- "Secret references", with NO DIRECT GRANT, reachable by server or worker through a typed service
-- only. §14's G0 gate checklist repeats it as a box somebody has to tick: "Secret/raw webhook/
-- internal job tables ไม่ exposed". `app` is the exposed schema (DATA-DEC-01, RFC-2026-015). A
-- `SECRET-4` table in it would fail that box on the day it is read.
--
-- BATCH 011 PUT ITS HELPERS IN `app` AND SAID WHY, AND THAT REASON DOES NOT REACH THIS TABLE.
-- 011's argument is mechanical: a policy written `TO authenticated` that CALLS a function is
-- evaluated as the caller, so `authenticated` must hold USAGE on the schema containing it, and
-- putting the helpers in `private` would have required granting `authenticated` USAGE on `private`
-- — which is the "ไม่มี direct grant" column of the same row, and which would have put
-- `private.as_user` and `private.set_updated_at` inside the reach of every end user. No policy
-- calls this table and no client role may read it, so none of that applies. The row's model — "a
-- helper called by a server or worker through a typed service" — is exactly what a credential
-- reference is, and 011 said so while explaining why its own case was the exception.
--
-- THE CONSEQUENCE, STATED RATHER THAN DISCOVERED. §8.3 marks "BYOK credential manage" `Y` for the
-- owner and `P` for the admin. THIS BATCH IMPLEMENTS NEITHER, and that is a refusal with a reason:
-- a client grant on a table in `private` is not one grant either. It is `grant usage on schema
-- private to authenticated` first, which opens `private.as_user`, `private.as_suspended_user`,
-- `private.as_service` and every worker payload table a later batch puts there — to every end user,
-- at once. That is RFC-2026-021 §7/4's structural argument about `anon` and schema `app`, one
-- schema over, and it is why the owner's `Y` is reached the way §3.1 says it is reached: through a
-- typed service. RFC-2026-012 §4 names what that is — a `SECURITY DEFINER` command function owned
-- by `app_command` — and RFC-2026-021 §10 records that no command function exists. 010's sentence
-- decides the rest: "a grant issued ahead of the thing that needs it is a grant nobody reviews
-- against a caller." The cell is owed to the batch that brings the command surface and to
-- DATA-DEC-03, and it is recorded in the work package's open blockers rather than half-built here.
--
-- AND §8.3's OTHER ROW IS IMPLEMENTED IN FULL, BY CONSTRUCTION. "Plain credential SELECT" is
-- `N N N N N N` — every role, the service included. It is satisfied here in the strongest form
-- available: THE PLAIN CREDENTIAL IS NOT A COLUMN. §9.1 puts a `SECRET-4` value in a "vault/
-- encrypted secret store; never plaintext DB/log", and §9.2 says what the database may hold
-- instead, exhaustively:
--
--   "Secret table เก็บได้เพียง `credential_reference`, provider, fingerprint/last-four-like
--    identifier, status, created/rotated/expired timestamps และ audit reference"
--
-- The apply-time block at the foot of this file holds the table to that list, COLUMN BY COLUMN,
-- against the live catalog. A later batch that adds `api_key text` or `ciphertext bytea` to it
-- fails the migration rather than the code review, which is the difference between a prohibition
-- and a control. RFC-2026-012's inventory row — no read by anyone, INCLUDING SERVICE — is then
-- true of a table that has nothing to read, and true again because no role holds a privilege on it.
--
--
-- WHAT §5 SAYS ABOUT THIS FAMILY THAT THIS BATCH CANNOT PAY, NAMED RATHER THAN LEFT
--
-- §5's inventory row reads:
--
--   | `ai.gateway` | model registry/policies/credential refs/GENERATION RUNS | global/workspace |
--   | catalog + run history | CONTENT-2/SECRET-4 | AI-RUN-* | A3 AI |
--
--   * GENERATION RUNS ARE NOT CREATED HERE. §6's registry gives batch 060 "model/policy/credential
--     reference" and stops there; no batch in the whole 000-180 registry is given a generation-run
--     table, and 061 (A0/A6 Metering, depends on 050 and 060) is "quota/reservation/usage ledger",
--     which is metering rather than run history. Batch 021 refused to create
--     `workspace_member_scope_versions` because "creating one would be reserving a table no
--     registry row gives this batch"; this is the same refusal, and the gap is in the REGISTRY
--     rather than in this file. It is recorded here and in the work package's open blockers, owed
--     to A0 and to whichever batch the registry is amended to name.
--
--   * THE SENSITIVITY CLASSES DO NOT COVER THE TWO TABLES THIS BATCH PUTS IN `app`. `CONTENT-2` is
--     "knowledge, caption, research brief, generated copy" — the generation runs. `SECRET-4` is the
--     credential reference. Neither describes a curated model label or a workspace's choice of
--     model. §9.1 does: it names "public model label" as its own example of `PUBLIC-0`, and it
--     classes "settings" as `TENANT-1`. So `app.ai_models` is `PUBLIC-0` and `app.ai_model_policies`
--     is `TENANT-1` by §9.1's own examples, and §5's row is short by two classes. The narrower,
--     more specific statement wins; the gap is named here rather than smoothed over, because a
--     column classified by nothing is a column nobody has to think about.
--
--   * THE RETENTION CLASS DOES NOT COVER THEM EITHER, AND THAT IS 030's FINDING IN A SECOND FAMILY.
--     §5 assigns `AI-RUN-*`. §10 defines `AI-RUN` ("generation metadata/cost/lineage", 12 months)
--     and `AI-RAW` ("raw prompt/response debug", off by default, max 30 days opt-in) — both about
--     runs. Neither can describe a global model catalog that outlives every workspace, and neither
--     describes a workspace's model policy or a credential reference, whose retention §11.4 step 2
--     touches from the other direction ("Revoke ... API/connector credentials"). Nothing here
--     encodes a retention window: batch 160 owns the retention job and §10's own approval owns the
--     numbers, and a window written into a constraint would read as ratified (§15). DATA-DEC-08 —
--     "AI raw prompt/response logging: off; max 30 วัน opt-in" — is OPEN, and this batch creates no
--     table it could be about.
--
--
-- THE PROVIDER VOCABULARY IS DEC-014's AND THE MODEL LIST IS DATA, WHICH IS NOT THE SAME CHOICE
--
-- §3.2: "Phase 1 state: `text` + named `CHECK`; เปลี่ยนค่าได้ผ่าน migration เท่านั้น". Applied to
-- this batch it separates two things a reader will otherwise run together:
--
--   * THE PROVIDER SET IS DECIDED. `DEC-014` in the Sprint 0A decision register is Approved —
--     "Platform AI + BYOK OpenAI 1 Provider ใน Production; Claude/Gemini/Grok/OpenRouter เป็น
--     Adapter/flag จนผ่าน eval" — and CONTRIBUTING_AGENTS.md puts the decision register at position
--     2 of the conflict order, above this repository's data package at 4. Five names, so a named
--     CHECK, so adding a sixth provider is a migration a reviewer reads. The spellings are
--     DEC-014's own, lowercased; the Product Master Plan spells three of them by vendor instead
--     (`Anthropic`, `Gemini`, `xAI`) and sits at position 5, so it loses, and reconciling the two
--     is a documentation question rather than a migration.
--
--   * THE MODEL SET IS NOT DECIDED. `OPEN-004` — "BYOK OpenAI model allowlist และ max budget",
--     owner Product + A3, due G0 — is OPEN, and §15 forbids an agent choosing an open decision. So
--     the models are ROWS in a table an administrative seed fills, never values in a CHECK this
--     batch writes. That is also the shape OPEN-004's own stop condition asks for: "ห้ามให้ user
--     ใส่ model ID อิสระ" — a user may not type a free model id — and a policy row that references
--     a curated catalog row by foreign key is that sentence expressed as a constraint. The budget
--     half of OPEN-004 is a `max budget`, which is money (§3.2: `numeric(18,6)` + ISO-4217) and a
--     quota, which §6's registry gives to 061. No cost column is invented here.
--
--
-- WHAT ELSE IS NOT HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO FIND
--
--   * NO LINK FROM THE MODEL POLICY TO A CREDENTIAL REFERENCE. A workspace on BYOK uses its own
--     credential; a workspace on Platform AI uses the platform's. Nothing in §4, §5 or §8 says how
--     a policy row selects between them, and the column that would say it — a foreign key from
--     `app.ai_model_policies` into `private.ai_credential_references` — would put the identity of a
--     secret reference on the EXPOSED side of the boundary §3.1 draws, in the schema this batch
--     exists to keep it out of. It is not created. Owed to the batch that brings the AI router and
--     the command surface, with the trust-zone question stated rather than inherited.
--
--   * NO MODEL VERSION TABLE. §5 calls this family "catalog + run history", not "published
--     immutable" as it calls `industry.core`, and §4's ERD names no AI entity at all — so there is
--     no `INDUSTRY_PACK ||--o{ INDUSTRY_PACK_VERSION` analogue to copy. A version table would be
--     two entities the ERD does not have, which is 040's refusal of four typed profile tables in
--     fewer words.
--
--   * NO LIFECYCLE FIELD ON A MODEL, SO NO WAY TO WITHDRAW ONE. §3.2 offers `archived_at` or
--     `deleted_at` and no document names either for a model row; §8.5 forbids a broad user delete;
--     no role holds DELETE here. So a curated model can be corrected and not retired through any
--     granted path. 010 refused to invent a status vocabulary for an invitation, 021 for a member
--     scope and 030 for an industry assignment; this is the same refusal, and it is owed to
--     whichever batch names the field. DEC-014's "Adapter/flag จนผ่าน eval" is a FEATURE FLAG,
--     which is application configuration rather than a column, and reading it as a lifecycle
--     vocabulary would be inventing four words nobody wrote.
--
--   * NO `status` COLUMN ON THE CREDENTIAL REFERENCE, THOUGH §9.2 PERMITS ONE. Permitting is not
--     requiring, and §3.2 makes a Phase 1 state `text` + a named CHECK whose values change only by
--     migration — which requires knowing the values. No document enumerates them. 010 met this
--     exactly: "Lifecycle is timestamps, not an invented status vocabulary ... A four-value status
--     enum would have been four words this repository's source of truth never wrote." The
--     timestamps §9.2 and §11.4 do name are here instead.
--
--   * NO `audit reference` COLUMN, THOUGH §9.2 PERMITS ONE. Audit is batch 140 (A1 Security/Audit)
--     and its consumers are 141. A uuid pointing at a table that does not exist is a dangling
--     column, which is what 020 refused when it declined to create a channel binding carrying a
--     `social_account_id` whose table belongs to 110. Owed to 140.
--
--   * NO COMMAND FUNCTION, AND NO `app_command` GRANT ANYWHERE IN THIS BATCH. The consequence is
--     larger here than in any batch before it and is stated rather than absorbed: §8.3's owner `Y`
--     on "BYOK credential manage" has no path at all until that surface exists. This is not a gap
--     RLS can close — it is a property of a write path rather than of a row — and RFC-2026-012 §4
--     names the mechanism while RFC-2026-021 §10 records that it does not exist.
--
--   * NOTHING ABOUT WORKSPACE LIFECYCLE VISIBILITY, and here for once it costs nothing: no client
--     role can read `app.ai_model_policies` at all, so the gap 020, 030 and 040 record — a member
--     of an `access_blocked` workspace still reading tenant rows — has no surface on this batch's
--     tables. It is unchanged elsewhere and still owed to an RFC plus batch 170.


-- ---------------------------------------------------------------------------------------------
-- app.ai_models — the curated model registry. GLOBAL.
-- ---------------------------------------------------------------------------------------------
--
-- GLOBAL: no workspace_id, because §3.3 requires the canonical scope field on "ทุก tenant-owned
-- row" and a platform catalog is not one. 030 wrote that sentence first and the second half of it
-- applies here word for word: a workspace_id on a global row would be a scope column with nothing
-- to scope, and the first policy that read it would be narrowing a catalog by a tenant that does
-- not own it.
--
-- MUTABLE, which is where this table parts company with `app.industry_pack_versions`. §5 calls this
-- family "catalog + run history" and calls `industry.core` "published immutable"; a curated label
-- corrected in place is not a rewritten history. So it carries `updated_at` and the §3.2 trigger,
-- and the reader who expects an immutable-version shape here should read §5's two rows side by side.
--
-- NO `created_by` AND NO `updated_by`. §3.2: "ทุก mutable row: created_at, updated_at; USER
-- MUTATION เพิ่ม created_by, updated_by". No user mutates this row — it is platform-curated and
-- written by an administrative seed — which is 030's reading of the same sentence for the same
-- kind of row.
create table if not exists app.ai_models (
  id          uuid primary key default gen_random_uuid(),
  provider    text        not null,
  model_key   text        not null,
  label       text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- DEC-014's five, lowercased, as text + a named CHECK (§3.2). The same list appears once more in
  -- this file, on the credential reference, and the apply-time block requires the two deparsed
  -- constraint definitions to be IDENTICAL — so the vocabulary has two homes that cannot drift.
  constraint ai_models_provider_known
    check (provider in ('openai', 'claude', 'gemini', 'grok', 'openrouter')),
  -- The provider's own identifier for the model. It is NOT constrained to a value set: OPEN-004
  -- owns the model allowlist, it is open, and §15 forbids an agent closing it. What IS constrained
  -- is the FORM, for 030's reason about `pack_id` — a rule stated in a document and not in a
  -- constraint is a rule the database does not have — and because this is the value every consumer
  -- pins beside a provider.
  constraint ai_models_model_key_form check (model_key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
  constraint ai_models_label_not_blank check (length(btrim(label)) > 0),
  -- The stable key §6 invariant 5 requires of a global seed, and the reason the seed can be re-run.
  -- It is the PAIR: two providers may offer a model of the same name, and collapsing them would
  -- make the catalog's identity a function of a string somebody else owns.
  constraint ai_models_provider_model_unique unique (provider, model_key)
);

comment on table app.ai_models is
  'Owner: A3 AI Gateway (ai.gateway, batch 060). GLOBAL — it carries no workspace_id because §3.3 '
  'requires the canonical scope field on tenant-owned rows and a curated platform catalog is not '
  'one. Sensitivity PUBLIC-0 by §9.1''s own example, "public model label"; §5 classes this family '
  'CONTENT-2/SECRET-4 and names no class for the catalog half, which is recorded in the header. '
  'Retention: §5 says AI-RUN-*, which §10 defines only for run history — the same shape of gap 030 '
  'recorded for CATALOG, owed to §10 and batch 160. NO client role holds any privilege here: §9.1 '
  'permits a client PROJECTION of PUBLIC-0 content and RFC-2026-012 §2/3 with RFC-2026-021 puts '
  'that projection behind a named security_invoker view on an allowlist that is empty and grows '
  'only by RFC. Written by an administrative seed on the stable key (provider, model_key).';
comment on column app.ai_models.provider is
  'PUBLIC-0. DEC-014''s five providers as text + a named CHECK (§3.2); values change by migration '
  'only. The same vocabulary constrains private.ai_credential_references.provider and the '
  'apply-time block requires the two constraint definitions to be identical.';
comment on column app.ai_models.model_key is
  'PUBLIC-0. The provider''s own model identifier, and half of the seed''s stable key. Constrained '
  'in FORM and never in VALUE: OPEN-004 owns the BYOK model allowlist, it is open, and §15 forbids '
  'an agent choosing it — so the allowlist is rows in this table rather than an enum in a CHECK.';
comment on column app.ai_models.label is
  'PUBLIC-0, and the one column of this batch a document names by name: §9.1 gives "public model '
  'label" as its example of the class. It is display text, so it lives beside the identity rather '
  'than inside it — a label may be corrected without the model becoming a different model.';


-- ---------------------------------------------------------------------------------------------
-- app.ai_model_policies — which curated model a Workspace is pinned to. One row per Workspace.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` (§3.3), and it is the PRIMARY KEY. That is 010's shape for
-- `app.workspace_settings` — "Canonical scope workspace_id, which is also the primary key and
-- therefore the supporting index for its own foreign key" — chosen rather than a surrogate id plus
-- a unique constraint because §4's ERD names no AI entity at all and therefore states no
-- cardinality for one. 030 could write `unique (workspace_id, business_profile_id)` because §4 gave
-- it `BUSINESS_PROFILE ||--o| INDUSTRY_ASSIGNMENT`; there is no such line here, so the shape is
-- taken from the one table in this schema that is already a per-workspace settings row rather than
-- invented from nothing. A workspace holding two contradictory model policies distinguished by no
-- column is a state nothing could resolve.
--
-- Sensitivity TENANT-1 by §9.1's "settings" example; §5's classes are CONTENT-2/SECRET-4 and cover
-- neither this table nor the one above (header).
create table if not exists app.ai_model_policies (
  workspace_id  uuid        primary key references app.workspaces (id),
  -- A single-column foreign key into a GLOBAL parent, which is a different shape from every child
  -- of a tenant parent in this schema and is 030's reason unchanged: there is no shared scope
  -- column for a composite key to compare, because the parent has no tenant to agree with.
  --
  -- The pinned row is the CATALOG row and not a copy of its provider and model_key. A copy would be
  -- a second source of truth for a fact the foreign key already fixes — 021 refusing
  -- `current_version_id`, 030 refusing `industry_pack_id` and 040 refusing `kind`, in the same
  -- words — and it is what makes OPEN-004's "ห้ามให้ user ใส่ model ID อิสระ" a constraint rather
  -- than a convention: a policy can only ever name a model the catalog holds.
  ai_model_id   uuid        not null references app.ai_models (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid
);

comment on table app.ai_model_policies is
  'Owner: A3 AI Gateway (ai.gateway, batch 060). Canonical scope workspace_id (§3.3), which is also '
  'the primary key — 010''s shape for app.workspace_settings, taken because §4''s ERD names no AI '
  'entity and therefore states no cardinality to encode. Sensitivity TENANT-1 by §9.1''s "settings" '
  'example; §5''s CONTENT-2/SECRET-4 describe the run history and the credential reference and not '
  'this row (header). NO client role holds any privilege here and NO policy is written: §8 has no '
  'row for a model policy in any of its four matrices, so there is no cell to implement and every '
  'operation is denied by default (030''s reading of the same silence). It pins a GLOBAL curated '
  'model by single-column foreign key, which is what stops a workspace naming a model the catalog '
  'does not hold (OPEN-004''s stop condition, as a constraint).';
comment on column app.ai_model_policies.workspace_id is
  'TENANT-1. The canonical tenant scope, the primary key, and the supporting index for its own '
  'foreign key into app.workspaces. There is no UPDATE grant on this table at all, so §8.5''s '
  '"ห้ามย้าย row ข้าม tenant ด้วย update" holds by the absence of the verb rather than by a '
  'column list.';
comment on column app.ai_model_policies.ai_model_id is
  'TENANT-1 pointing at a PUBLIC-0 row. The pinned curated model, which reaches provider, model_key '
  'and label through the catalog row rather than copying them.';
comment on column app.ai_model_policies.created_by is
  'AUTH-3. The acting user. §3.2 requires the actor columns of a row a USER mutation creates, and '
  '§8.3 marks "BYOK credential manage" `Y` for the owner, so this family is user-originated even '
  'though this batch grants no write path to reach it. Not FK-constrained: §11.2 forbids '
  'cascade-deleting history when a member is removed and requires the actor field be anonymized.';
comment on column app.ai_model_policies.updated_by is 'AUTH-3. See created_by.';


-- ---------------------------------------------------------------------------------------------
-- private.ai_credential_references — a REFERENCE to a BYOK credential. Never the credential.
-- ---------------------------------------------------------------------------------------------
--
-- THE SCHEMA IS THE DECISION AND THE HEADER ARGUES IT. §3.1 puts "secret references" in `private`
-- by name, with no direct grant, reachable by server or worker through a typed service only; §14's
-- gate checklist requires secret tables not be exposed; `app` is the exposed schema. This is the
-- first table this repository has created in `private`, and `scripts/db/run.mjs`'s schema lint is
-- extended in the same change so that a table there is held to the same rules as a table in `app` —
-- otherwise a `SECRET-4` table would be the one table in the schema exempt from the owner-comment,
-- primary-key, ENABLE and FORCE rules, by virtue of its prefix.
--
-- THE COLUMN LIST IS §9.2's, EXHAUSTIVELY, AND THE APPLY-TIME BLOCK HOLDS IT THERE. §9.2:
--
--   "Secret table เก็บได้เพียง `credential_reference`, provider, fingerprint/last-four-like
--    identifier, status, created/rotated/expired timestamps และ audit reference"
--
-- Every column below is either one of those, one of §3.3's canonical scope fields, one of §3.2's
-- convention columns, or `revoked_at`, which §11.4 step 2 names in terms ("Revoke browser sessions,
-- push tokens, invitations, API/CONNECTOR CREDENTIALS"). Two of §9.2's permissions are declined and
-- the header says why: `status`, because its values are unwritten, and `audit reference`, because
-- audit is batch 140.
--
-- WHAT NO CHECK CONSTRAINT CAN DO, SAID PLAINLY RATHER THAN IMPLIED BY ITS ABSENCE. There is no
-- constraint that distinguishes a vault handle from an API key, because both are opaque strings and
-- a rule that recognised today's key formats would be a rule a new provider defeats. The controls
-- are the ones that do not depend on recognising a secret: the plaintext column DOES NOT EXIST, the
-- apply-time block refuses any column outside the list above, no role holds any privilege on the
-- table, and the repository's own secret scan runs over every file including this batch's fixture.
-- `fingerprint` is the one place a shape helps, and it is used: 010 put a FLOOR on `token_hash`
-- (`octet_length >= 32`) so a plaintext token could not fit a digest column, and this is the mirror
-- image — a CEILING, so a whole API key cannot fit a column §9.2 describes as "last-four-like".
create table if not exists private.ai_credential_references (
  id                    uuid        primary key default gen_random_uuid(),
  -- §3.3, "ทุก tenant-owned row". A BYOK credential belongs to one Workspace: §8.3 marks its
  -- management a workspace-role operation, and §11.4 step 2 revokes API credentials as part of that
  -- Workspace's closure.
  workspace_id          uuid        not null references app.workspaces (id),
  provider              text        not null,
  -- §9.2's first permitted column, spelled the way §9.2 spells it. It is a LOCATOR in the vault or
  -- encrypted secret store §9.1 requires of a SECRET-4 value — never the value, never a ciphertext
  -- of the value, never a wrapped key.
  credential_reference  text        not null,
  fingerprint           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  rotated_at            timestamptz,
  expires_at            timestamptz,
  revoked_at            timestamptz,
  created_by            uuid,
  updated_by            uuid,
  -- The same five names as app.ai_models.provider, and the apply-time block requires the two
  -- deparsed definitions to be identical so the vocabulary cannot drift between its two homes.
  constraint ai_credential_references_provider_known
    check (provider in ('openai', 'claude', 'gemini', 'grok', 'openrouter')),
  constraint ai_credential_references_reference_not_blank
    check (length(btrim(credential_reference)) > 0),
  -- The ceiling, and the reason is in the header: §9.2 calls this a "fingerprint/last-four-like
  -- identifier", and a whole API key does not fit in sixteen characters.
  constraint ai_credential_references_fingerprint_is_short
    check (fingerprint is null or (length(btrim(fingerprint)) between 1 and 16)),
  constraint ai_credential_references_expiry_after_creation
    check (expires_at is null or expires_at > created_at),
  -- A handle names one credential. This is deliberately NOT `unique (workspace_id, provider)`: no
  -- document says how many credentials a Workspace may hold for one provider, and a rotation window
  -- in which two exist is a state nothing here forbids. Inventing the cardinality would be the
  -- decision 021 declined to make about member scopes.
  constraint ai_credential_references_reference_unique unique (credential_reference)
);

comment on table private.ai_credential_references is
  'Owner: A3 AI Gateway (ai.gateway, batch 060). In `private` because §3.1 puts "secret references" '
  'there by name, with no direct grant, reachable by server or worker through a typed service only, '
  'and because §14''s gate checklist requires a secret table not be exposed. Canonical scope '
  'workspace_id (§3.3). Sensitivity SECRET-4; retention is §11.4 step 2 ("revoke API/connector '
  'credentials") plus whatever §10 eventually says, which today is nothing for this row. IT HOLDS '
  'NO CREDENTIAL: §9.2 fixes the permitted column list exhaustively and this migration''s '
  'apply-time block refuses any column outside it, so a later batch adding a plaintext or ciphertext '
  'column fails the migration. NO ROLE HOLDS ANY PRIVILEGE HERE — client or service — which is '
  'RFC-2026-012''s inventory row for ai credential refs ("no read by anyone, including service") and '
  '§8.3''s "Plain credential SELECT | N N N N N N". §8.3''s "BYOK credential manage" is NOT '
  'implemented: the owner''s Y is reached through the typed service §3.1 names and RFC-2026-012 §4 '
  'defines, and no command function exists (header).';
comment on column private.ai_credential_references.workspace_id is
  'SECRET-4 context. The Workspace whose credential this references. §11.4 step 2 revokes API and '
  'connector credentials during closure, which is the only lifecycle any document gives this row.';
comment on column private.ai_credential_references.provider is
  'SECRET-4 context. DEC-014''s five providers, as text + a named CHECK (§3.2), identical to '
  'app.ai_models.provider by an assertion rather than by care.';
comment on column private.ai_credential_references.credential_reference is
  'SECRET-4. A LOCATOR in the vault or encrypted secret store §9.1 requires — never the credential, '
  'never a ciphertext of it. §9.2 names this column and permits it; §9.2''s absolute prohibitions '
  'forbid the value it points at ever appearing in this database, a log, an event, a job payload or '
  'a fixture. No CHECK can tell a handle from a key, so the control is that the key has no column '
  'to be in and no role can read this one.';
comment on column private.ai_credential_references.fingerprint is
  'SECRET-4, and the one column here with a shape control. §9.2 permits a "fingerprint/last-four-'
  'like identifier"; the CHECK caps it at sixteen characters so a whole API key does not fit. It is '
  'the mirror of 010''s 32-byte FLOOR on token_hash, which stopped a plaintext token fitting a '
  'digest column.';
comment on column private.ai_credential_references.rotated_at is
  'SECRET-4. §9.2 names "created/rotated/expired timestamps"; this is the second. Rotation is an '
  'UPDATE no role holds, so nothing can set it through a granted path today.';
comment on column private.ai_credential_references.expires_at is
  'SECRET-4. §9.2''s third timestamp. Spelled expires_at rather than expired_at for 010''s reason: '
  'it is a deadline, and the invitation table already spells the same idea that way.';
comment on column private.ai_credential_references.revoked_at is
  'SECRET-4. Not one of §9.2''s three, and named instead by §11.4 step 2 — "Revoke browser sessions, '
  'push tokens, invitations, API/connector credentials" — which is exactly how 010 justified '
  'revoked_at on an invitation. There is no status column: §9.2 permits one and its values are '
  'unwritten, so the lifecycle is timestamps (010''s refusal, unchanged).';
comment on column private.ai_credential_references.created_by is
  'AUTH-3. The acting user, for a row §8.3 makes user-originated. Not FK-constrained: §11.2 '
  'requires the actor field be anonymized rather than cascade-deleted.';
comment on column private.ai_credential_references.updated_by is 'AUTH-3. See created_by.';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- Already covered by a constraint's own index, and therefore NOT repeated below:
--
--   app.ai_models (provider, model_key)      — the unique constraint and the seed's lookup key.
--   app.ai_model_policies.workspace_id       — the primary key, which is also the supporting index
--                                              for its own foreign key into app.workspaces.
--   private.ai_credential_references.credential_reference
--                                            — the unique constraint.
--   created_by / updated_by                  — not FK-constrained (see the column comments) and
--                                              named in no predicate, because there is no predicate.
--
-- NO RLS-PREDICATE INDEX IS OWED BY THIS BATCH, and the reason is the batch rather than an
-- oversight: not one table here carries a policy, so no column is an RLS predicate. The day an
-- allowlist entry or a command surface adds one, the index is part of that change (§6 invariant 8).

-- The foreign key from app.ai_model_policies into the global catalog. Without it, examining or
-- correcting a curated model scans every workspace's policy — the one join in this batch that
-- crosses from a tenant table to a global one, which is 030's sentence about its own pack version.
create index if not exists ai_model_policies_model_idx
  on app.ai_model_policies (ai_model_id);

-- The foreign key from private.ai_credential_references into app.workspaces, and the column
-- §11.4's revocation sweep will filter on when batch 160 writes it.
create index if not exists ai_credential_references_workspace_idx
  on private.ai_credential_references (workspace_id);

-- No keyset index anywhere in this batch. §3.3 asks for `(created_at desc, id desc)` on "List ที่โต
-- ต่อเนื่อง" — a list that grows continuously. A workspace holds ONE model policy (the primary key
-- says so) and a small, bounded number of credential references; the catalog grows with curation
-- decisions rather than with tenant activity. An index nobody paginates is an index nobody
-- maintains, and 020's own comment about which indexes a constraint already covers is the same
-- discipline pointed the other way.


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every MUTABLE row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
--
-- All three, and two of the three are INERT TODAY — said rather than hidden, which is 021's
-- treatment of the same situation. No role holds UPDATE on app.ai_model_policies or on
-- private.ai_credential_references, so nothing can fire their triggers through a granted path; the
-- trigger on app.ai_models is not inert, because the administrative seed that curates the catalog
-- re-runs and corrects rows (§6 invariant 5), which is exactly the update it stamps.
--
-- They are here because §3.2 requires updated_at of a MUTABLE row, and all three rows are mutable:
-- §5 calls the catalog half of this family "catalog" rather than "published immutable", and §9.2's
-- own permitted column list contains a "rotated" timestamp, which is a row that changes. Omitting
-- updated_at would be declaring these rows IMMUTABLE, which §3.2 says of versions, evidence,
-- decisions, usage, audit and publish history and does not say of any of them.
drop trigger if exists set_updated_at on app.ai_models;
create trigger set_updated_at before update on app.ai_models
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.ai_model_policies;
create trigger set_updated_at before update on app.ai_model_policies
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on private.ai_credential_references;
create trigger set_updated_at before update on private.ai_credential_references
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on every table, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
--
-- On all three this is doing more work than usual rather than less, because none of them carries a
-- policy: ENABLE plus FORCE is what makes every non-bypassing role — INCLUDING THE TABLE OWNER —
-- read zero rows and write nothing. 030 wrote that about two global tables; here it is true of the
-- whole batch.
--
-- On private.ai_credential_references it is defence in depth and is worth naming as such: no role
-- holds a privilege on it, so the privilege system refuses everything before RLS is consulted, and
-- these two statements are what still refuses on the day somebody grants USAGE on `private` without
-- reading this file.
alter table app.ai_models enable row level security;
alter table app.ai_models force row level security;

alter table app.ai_model_policies enable row level security;
alter table app.ai_model_policies force row level security;

alter table private.ai_credential_references enable row level security;
alter table private.ai_credential_references force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges. Deny-by-default needs a grant before RLS is even reached.
-- ---------------------------------------------------------------------------------------------
--
-- §6 invariant 8 puts migration, constraints, indexes, RLS AND grants in one change set.
--
-- `authenticated` AND `anon` ARE GRANTED NOTHING, ANYWHERE IN THIS BATCH. The header argues it at
-- length: §8 has no row for a model registry or a model policy, RFC-2026-012's inventory marks this
-- family "view only", the read allowlist is empty and RFC-2026-021 fixes what an entry is and who
-- may add one. This batch therefore adds no sixth row to RFC-2026-021 §8.5's closed list of
-- inherited base-table grants.
--
-- `app_worker` HOLDS GRANTS ON THE TWO `app` TABLES AND NO POLICY, which is the shape batch 010
-- introduced and every batch since has kept, for the reason 010 gives: without a grant, a service
-- refusal is 42501 either way and proves only that somebody forgot a GRANT; with the grant and no
-- policy, an empty read can only have come from row level security, and a service role that had
-- quietly acquired BYPASSRLS would SUCCEED where the suite demands zero rows. On this batch that is
-- the ONLY thing row level security decides, and it is what the CI negative control for these two
-- tables rests on.
--
-- The verbs follow §8's silence read conservatively rather than generously:
--
--   * app.ai_models: SELECT only. The catalog is written by an administrative seed (§6 invariant 5)
--     and §8 has no row granting anyone a write. A verb issued ahead of a caller is a verb nobody
--     reviews against one.
--   * app.ai_model_policies: SELECT, INSERT and UPDATE. §8 has no row here either, so this is the
--     service half of the same silence — but the AI gateway is a service that will have to resolve
--     a workspace's model, and the isolation suite needs at least one grant on this table for the
--     denial to be attributable to RLS rather than to an absent grant. DELETE is not granted: §8.5
--     has no broad delete and no document names a typed lifecycle field for this row, which is the
--     refusal 021, 030 and 040 each made about their own tables.
grant select on app.ai_models to app_worker;
grant select, insert, update on app.ai_model_policies to app_worker;

-- private.ai_credential_references IS GRANTED TO NOBODY. Not `authenticated`, not `anon`, not
-- `app_worker`, not `app_command`, not `app_maintenance`, not `app_authz`. And no role is granted
-- USAGE on schema `private` either, which is the grant that would come first.
--
-- THAT IS A DELIBERATE DEPARTURE FROM THE app_worker SHAPE ABOVE, AND IT COSTS SOMETHING THIS FILE
-- PAYS RATHER THAN HIDES. Everywhere else in this schema the service holds a grant precisely so a
-- denial is attributable to RLS. Here it holds none, so every refusal on this table is a
-- privilege-layer refusal ON THE SCHEMA, for every identity alike — which is what RFC-2026-012's
-- inventory row asks for in the words "no read by anyone, INCLUDING SERVICE", and what §8.3's
-- "Plain credential SELECT | N N N N N N" asks for in the service column.
--
-- The price is that the CI negative control cannot have an entry for this table: disabling row
-- level security on it restores no grant, so nothing would fail and the entry would report a pass
-- it did not earn — which the control step's own failure message calls out by name. That absence is
-- asserted in tests/db/identity/identity-isolation.test.mjs IN BOTH DIRECTIONS: no entry while no
-- role holds a grant, and an entry REQUIRED the moment any migration grants one. The isolation
-- cases carry the refusal instead, declaring the layer and the object, so the day somebody grants
-- USAGE on `private` the refusal moves from the schema to the table and four cases fail.
--
-- app_command and app_maintenance are granted nothing by this batch, here or on the two `app`
-- tables. There is no specified command surface for ai.gateway — which is the whole reason §8.3's
-- owner cell is unimplemented — and the retention path is batch 160.


-- ---------------------------------------------------------------------------------------------
-- Policies. There are none, and that is a decision rather than an omission.
-- ---------------------------------------------------------------------------------------------
--
-- §8's four matrices contain NO ROW for a model registry and NO ROW for a model policy, so there is
-- no cell to implement; RFC-2026-012 §3 and RFC-2026-021 give the client read to an RFC; and a
-- policy written for a caller that does not exist is a permission nobody reviewed. §8.3's two
-- credential rows are answered by the table's shape and by the absence of every grant, which the
-- header argues and the block below asserts.
--
-- All three tables are FORCE ROW LEVEL SECURITY with an empty policy set, which denies every
-- non-bypassing role including the one role holding a grant. 030 established that a forced table's
-- empty policy set has to be a decision written in the file rather than an omission a reader infers;
-- this paragraph is that decision, and tests/db/identity/identity-isolation.test.mjs holds it in
-- both directions — no policy here today, and a policy appearing without the §8 row or the RFC that
-- would justify it fails the build.


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004, 011, 020, 021, 030 and 040 use: a claim that is only a comment is a claim
-- nobody checks. These are the properties of THIS batch answerable from the catalog of the database
-- being migrated, without a committed snapshot and without a test harness. The text half lives in
-- tests/db/identity/identity-isolation.test.mjs and the live behavioural half is `make
-- db-rls-smoke`.
--
-- NOTHING BELOW ASSERTS A PROPERTY AN APPROVED DECISION IS EXPECTED TO CHANGE, which is 030's rule
-- and 021's scar: 011's apply-time policy count is an APPLIED migration's self-assertion that 021
-- had to route around rather than amend. So the absence of a client grant, the absence of a policy
-- and the absence of a grant on the credential reference are asserted in the STATIC suite, where
-- the batch that lands an allowlist entry or a command surface edits a line a reviewer reads. What
-- is asserted here is what an RFC would not change: that the tables are forced, that the credential
-- reference table's COLUMNS are §9.2's and nothing else, that the provider vocabulary has not
-- drifted between its two homes, and that nothing in this batch is owned by a role that must own no
-- table.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only
-- by a superuser, and a migration that needs one to apply is a migration that cannot be applied on
-- the platform it targets, where `postgres` is not a superuser.
do $$
declare
  offending text;
  count_of  integer;
begin
  -- ENABLE and FORCE on all three. The two are different catalog columns and the data package's own
  -- lint rule reads only the first (RFC-2026-016). On a table with no policy, FORCE is the whole of
  -- what refuses the owner.
  select string_agg(n.nspname || '.' || c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('ai_models', 'ai_model_policies'))
          or (n.nspname = 'private' and c.relname = 'ai_credential_references'))
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'Batch 060 writes no policy at all, so FORCE is the only thing that refuses the '
                   'table owner. Without it the isolation suite cannot tell a working schema from '
                   'one where every row is readable by whoever owns the table.';
  end if;

  -- THE ASSERTION THIS BATCH OWES MOST. §9.2 is an ABSOLUTE PROHIBITION and it fixes the permitted
  -- column list of a secret table exhaustively. Everything else in this file argues that a
  -- credential cannot be read; this is what stops one being STORED.
  --
  -- The permitted set, with the clause that permits each:
  --   credential_reference, provider, fingerprint, rotated_at, expires_at   §9.2, by name
  --   revoked_at                                                           §11.4 step 2
  --   workspace_id                                                         §3.3, tenant-owned row
  --   id, created_at, updated_at, created_by, updated_by                   §3.2 / §12.3 conventions
  --
  -- A later batch adding `api_key`, `secret`, `ciphertext`, `access_token` or anything else to this
  -- table fails the migration rather than the code review. That is the difference between a
  -- prohibition and a control, and it is why the check is written as an ALLOWLIST rather than as a
  -- list of forbidden names: a denylist of column names somebody thought of is defeated by the one
  -- they did not.
  select string_agg(a.attname, ', ' order by a.attnum) into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'private' and c.relname = 'ai_credential_references'
     and a.attnum > 0 and not a.attisdropped
     and a.attname <> all (array['id', 'workspace_id', 'provider', 'credential_reference',
                                 'fingerprint', 'created_at', 'updated_at', 'rotated_at',
                                 'expires_at', 'revoked_at', 'created_by', 'updated_by']);
  if offending is not null then
    raise exception 'private.ai_credential_references carries column(s) §9.2 does not permit: %', offending
      using hint = '§9.2: "Secret table เก็บได้เพียง credential_reference, provider, fingerprint/'
                   'last-four-like identifier, status, created/rotated/expired timestamps และ audit '
                   'reference". A column outside that list plus §3.2/§3.3''s conventions is either a '
                   'credential, a ciphertext of one, or a field nobody classified. All three are '
                   'stop-the-line under CONTRIBUTING_AGENTS.md.';
  end if;

  -- And the column that must be there, because an allowlist alone is satisfied by a table with no
  -- columns at all. §9.2 permits a reference; the whole design is that the reference is what the
  -- database holds INSTEAD of the credential, so its absence would not be a narrower schema.
  select count(*) into count_of
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'private' and c.relname = 'ai_credential_references'
     and a.attnum > 0 and not a.attisdropped
     and a.attname = 'credential_reference';
  if count_of <> 1 then
    raise exception 'private.ai_credential_references has no credential_reference column';
  end if;

  -- The provider vocabulary has two homes and they may not drift. Both constraints name a column
  -- called `provider` and neither deparsed definition mentions its table, so a correct pair is
  -- BYTE-IDENTICAL — which makes this the dullest form of the assertion, and dull is the property
  -- batch 040 learned to want here: this block runs on every apply, and a clever query that fails
  -- to PARSE fails the migration rather than the rule it was checking.
  select string_agg(distinct pg_catalog.pg_get_constraintdef(t.oid), ' <> ') into offending
    from pg_catalog.pg_constraint t
   where t.conname in ('ai_models_provider_known', 'ai_credential_references_provider_known');
  if offending is null or position(' <> ' in offending) > 0 then
    raise exception 'the provider vocabulary differs between its two homes: %',
      coalesce(offending, '<one of the two constraints is missing>')
      using hint = 'DEC-014 fixes the provider set and §3.2 says the values change by migration '
                   'only. Two CHECKs holding different lists is one of them having been changed '
                   'without the other, which is how a credential row for a provider the catalog '
                   'cannot name gets written.';
  end if;

  -- The two constraints exist AND there are exactly two of them, because `string_agg(distinct ...)`
  -- over a single row is also what a database with one of them looks like.
  select count(*) into count_of
    from pg_catalog.pg_constraint t
   where t.conname in ('ai_models_provider_known', 'ai_credential_references_provider_known');
  if count_of <> 2 then
    raise exception 'batch 060 expects two provider CHECK constraints and the catalog holds %', count_of;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020, 021, 030 and 040
  -- ask them: scripts/db/run.mjs holds every tenant table to the ownership rule against the
  -- COMMITTED SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot
  -- describes.
  select string_agg(format('%s.%s owned by %s', n.nspname, c.relname,
                           pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('ai_models', 'ai_model_policies'))
          or (n.nspname = 'private' and c.relname = 'ai_credential_references'))
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 060 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all. On a table with an '
                   'empty policy set that exemption is the difference between reading nothing and '
                   'reading everything.';
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 060 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  -- The POLICY COUNT is deliberately not re-asserted: 021 owns that assertion on the far side of the
  -- batch that could have moved it, and repeating it would be a second home for a number.
  select string_agg(n.nspname || '.' || c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('ai_models', 'ai_model_policies'))
          or (n.nspname = 'private' and c.relname = 'ai_credential_references'))
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on %, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;
end $$;
