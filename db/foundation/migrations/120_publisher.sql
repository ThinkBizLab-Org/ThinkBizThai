-- ============================================================================================
-- Batch 120 — publisher.meta: the intent, the fan-out, the delivery, the post — and the one
-- service cell RFC-2026-022 names for this family, classified and not enforced.
-- ============================================================================================
--
-- Owner: A6 Publisher, written by the A0 run under the Product Owner's disposition of 2026-09-15
-- (evidence/WP-0A-DB-00/product-owner-disposition-2026-09-15-batch-120.md: fourteen questions,
-- every one answered with the recommended option; the plan those questions came from is
-- evidence/WP-0A-DB-00/a0-batch-120-plan-2026-09-15.md). Depends on: 080 (app.content_items,
-- app.content_versions and the four-column key content_versions_item_scope_id_key,
-- app.content_variants), 081 (app.content_targets, which this batch gives one forward key),
-- 100 (app.asset_versions over its four-column scope key), 110 (app.social_accounts), 111
-- (social_accounts_scope_key and the shape of content_targets_social_scope_fk, copied here), 011
-- and 021 (the helpers every policy calls), 000 (private.set_updated_at). §6's registry gives 120
-- "intent/target/job/post" and depends it on 091 as well; 091 does not exist, and the reference
-- runs the other way (§4.7 gives content_schedules a publish_intent_id), so this batch names no
-- table 091 will create and records the gap in the work package (question 12).
--
-- FIVE TABLES. §5's inventory row reads "intents/targets/jobs/posts/metrics"; metrics are batch
-- 121 (question 1) and the fifth table here is the asset pin a target carries, which §4.8 of the
-- workstream document names in the same breath as the target ("pinned content variant + asset
-- version refs") and which the technical architecture makes a rule of its own: "Publish Target
-- ต้อง pin asset_version_id ที่ใช้จริง ห้ามอ้างคำว่า latest" (question 8).
--
-- ============================================================================================
-- THE TWO ROWS OF §8.3 THIS FAMILY LIVES ON, AND WHAT EACH ONE DECIDES
-- ============================================================================================
--
--   | Publish now/cancel pending                | Y | Y | P | N | N | P |
--   | Publish delivery/post/metric INSERT       | N | N | N | N | N | S |
--
-- THE FIRST ROW IS THE INTENT. The owner and the admin write it (`Y`); the editor is `P` -- "ผ่านตาม
-- policy/explicit capability" -- and no document in this repository defines that capability. The
-- repository holds two shapes for a client `P`: refused where nothing defines it (070's approver,
-- 090's admin and editor on approve/reject, 110's owner cells) and implemented as an explicit-scope
-- conditional grant where scope IS the capability (021's `*_scoped_editor` policies, 030's
-- assignment). §5.1 of the workstream document ties the editor's publishing to "เมื่อ policy อนุญาตและ
-- approved" -- an approval condition, not a scope condition -- so the 021 shape would implement half
-- of that sentence and be read as the whole of it. The Owner chose the refusal (question 2): the
-- editor is refused at the policy layer, the case that says so is named in the suite, and the
-- capability is in the work package's open blockers. The Service column of this row is `P` too,
-- and app_worker holds SELECT here and no policy, read narrower than 110 read its own `P` cells
-- (110 granted the worker all three verbs, column-scoped): the intent's writer is the user and the
-- worker only reads it to fan out. That is A0's reading and is recorded as one.
--
-- THE SECOND ROW IS EVERYTHING ELSE. `N` for every client role, `S` for the service. This batch reads
-- "delivery" as the target AND the job -- the technical architecture's "แต่ละการส่งไปหนึ่ง Social
-- Account สร้าง publish_target และ publish_job แยกกัน" -- and "post" as app.published_posts. The Owner
-- confirmed that reading (question 3). It could be read the other way (RFC-2026-022 §3's own reason
-- for the cell, "the delivery is against a known target", is consistent with the target existing
-- before the delivery and being the user's act), and the work package records the alternative so a
-- later reader meets it as a decision rather than as an assumption.
--
-- NEITHER ROW HAS A SELECT. §8.3 gives publishing no read row at all, as it gives approval none
-- (blocker 146 of the work package). RFC-2026-012's inventory line for this family reads "view
-- only | INSERT service-only; PROVIDER-3", and the repository has done "view only" two ways:
-- column-scoped SELECT on the base table (070, 090, 100) and no client read at all (050, 110). The
-- Owner chose the first (question 4) -- §11.1 puts "publish history" in the PDPA export minimum
-- and DB-10's acceptance requires partial success to be SHOWN -- so every active member reads,
-- narrowed through the item, and the reading is a blocker in 090's shape. The same RFC-2026-012
-- line classifies the intent's INSERT service-only; the client INSERT below rests on §8.3's `Y`
-- and on the precedent of 081 and 090, which read `authenticated` as the user's server session,
-- and the conflict with an approved RFC's inventory line is the Owner's decision (question 14)
-- and a blocker to that RFC's owners.
--
-- ============================================================================================
-- THE `S` CELL: CLASSIFIED CARRIED, NO POLICY WRITTEN, AND THE REFUSAL IS ROW LEVEL SECURITY
-- ============================================================================================
--
-- RFC-2026-022's status line: "Approved 2026-09-08 ... NOT IN EFFECT until §7 holds: the only member
-- of app_worker today is postgres, which bypasses RLS." §5/8 says a policy TO app_worker written
-- today "is unreachable except from an identity for which it is moot", and the service-policy map's
-- `_not_in_effect` note says what a batch does instead: it classifies its cells and writes no policy.
-- This batch adds three rows to db/foundation/lint/service-policy-map.json -- the target, the job
-- and the post, each `insert`, each CARRIED -- and the rows are RFC §3's own verdict CHECKED AGAINST
-- THE STATEMENT (051's and 061's shape for a cell the RFC names), not derived as 070 had to derive a
-- cell the RFC omitted. The `why` of each row applies §3's operational form: add the confinement
-- term to the statement's WITH CHECK and the work does not change, because the workspace is in the
-- VALUES list and is held there by composite foreign keys to rows the worker already holds.
--
-- app_worker therefore HOLDS GRANTS AND NO POLICY on the target, the pin, the job and the post --
-- 010's shape, kept by every batch since, for 010's reason: without a grant a service refusal is
-- 42501 either way and proves only that somebody forgot a GRANT; with the grant and no policy, an
-- empty read can only have come from row level security, and a service role that had quietly
-- acquired BYPASSRLS would SUCCEED where the suite demands a refusal. The suite's service INSERT
-- cases are `deniedBy: policy` and are the second half of each table's CI negative-control basis:
-- the row each one attempts is well formed and lands when the control disables row level security.
--
-- THE WORKER'S UPDATE IS A DECISION AND NOT THE MATRIX. §8.3's `S` is INSERT. 070 granted the worker
-- two progress timestamps on a run and purge columns on a snapshot, and 071 left those grants
-- standing when it closed the family's no-cell table; 062 and 071 ended the worker's verbs on the
-- two tables that had no cell at all. The Owner chose the first precedent (question 10): the worker
-- moves a target's `status`, its three progress timestamps and its failure class, and a job's
-- `status`, attempt scalars and error code -- and NEVER a cancellation, which is a person's verb and
-- lives on the intent's `cancelled_at`, outside every grant the worker holds (070 withheld
-- `cancel_requested_at` for exactly this reason). The map records that the UPDATE has no cell and no
-- row, as 061's row records its own UPDATE/DELETE half.
--
-- NOTHING HERE IS A CLAIM ABOUT TENANT ISOLATION OF THE SERVICE PATH. RFC-2026-022 §5/4 measured that
-- the role a service policy names can set the setting the policy reads, and forbids any document,
-- test or assertion citing the confinement term as a boundary. No comment, case or assertion in this
-- batch cites the term at all.
--
-- ============================================================================================
-- WHAT §9.1 KEEPS OUT OF THIS SCHEMA, AND THE DEBT 110 ASSIGNED TO THIS BATCH BY NAME
-- ============================================================================================
--
-- §9.1 classes "provider payload, external post ID, webhook" PROVIDER-3 -- "private, redact/log hash;
-- safe projection only". app.published_posts therefore carries `external_post_hash`, exactly 32
-- octets of sha256, unique per social account, and NO raw identifier and NO permalink (a permalink
-- embeds the identifier). That is 110's treatment of the external ACCOUNT identifier applied one
-- table over, and 110:365 and blocker 5 of the work package assign the raw identifier's home to
-- "the batch that brings the typed service and to 120, which is the first batch with a caller that
-- has to address a Page at the provider". This batch does not pay that debt (question 6): the
-- private tables of 060 and 110 hold LOCATORS -- "never the value, never a ciphertext of the value"
-- -- and 110 refused both a private and an encrypted home for the raw value because the mechanism
-- has no decision behind it and the typed service does not exist. Both are still true. THE
-- CONSEQUENCE IS STATED RATHER THAN LEFT: until the identifiers have a home, no worker can address a
-- Page at the provider and no app.published_posts row can be produced by anything but a fixture --
-- which is the state every `S` cell in this schema is already in, for RFC-2026-022 §5/8's reason.
-- The debt stays open in the work package with this batch named as the one that met it and
-- deferred it, in writing.
--
-- PROVIDER-3 also decides two columns the client does not read: app.publish_jobs.provider_request_key
-- and app.publish_jobs.last_error_code (a provider's code, never its stack trace -- §9.2), and
-- app.publish_jobs.kernel_job_id, which is the internal job's identity. The client SELECT on the
-- job is the REDACTED set -- id, scope, target, status, attempt count, timestamps -- which is also
-- what §8.4's "Job redacted status SELECT" row would give a job-shaped table, so the question of
-- whether that row governs a publisher job does not have to be answered here; it is a blocker.
--
-- ============================================================================================
-- THE KEYS, AND THE ONE THIS BATCH ADDS TO A MERGED TABLE
-- ============================================================================================
--
-- A target names the destination the user aimed at (app.content_targets, 081) AND the account it
-- resolves to (app.social_accounts, 110). Nothing in 081 keys a target's id together with its
-- account, so a publish target could name a content target and a DIFFERENT account and every key
-- would accept it. This batch adds `content_targets_destination_key unique (workspace_id,
-- business_profile_id, id, social_account_id)` to 081's table -- a forward change to a merged table
-- in 111's shape (111 added social_accounts_scope_key to 110's) -- and references it from
-- publish_targets over all four columns, so the pair (content target, account) is held to the aim.
-- The social account is ALSO referenced directly over (workspace_id, social_account_id) ->
-- app.social_accounts (workspace_id, id): 111's key, column for column, so a destination in another
-- tenant is refused at the database (§4 invariant 10) by the same shape 111 measured. The second key
-- is implied by the first once 111's own key holds on content_targets; it is written anyway, because
-- a reader looking for "the social key" on this table should find it rather than derive it.
--
-- EVERY FOREIGN KEY IN THIS BATCH IS NO ACTION, BY THIS BATCH'S OWN REASON. The Owner's decision (a)
-- of 2026-09-15 (blocker 161) was about content_targets_social_scope_fk alone and is not cited for
-- these; the reason here is that publish history outlives its parents -- §10's PUBLISH-HISTORY is
-- "อายุ Workspace", and hard deletion is batch 160's at workspace closure under §11.4's order -- so
-- a purge that reached a content item, a variant or an asset version while a target still names it
-- is expected to FAIL against the history rather than cascade through it. README's sentence about
-- CASCADE ("would delete the publishing history 081 preserved on purpose") applies unchanged.
--
-- THE PINNED VERSION IS HELD TO ITS ITEM. publish_intents references app.content_versions over
-- (workspace_id, business_profile_id, content_item_id, id) -- content_versions_item_scope_id_key,
-- which 080 created as "the target of every child's scope path" -- so an intent cannot pin one
-- item's version to another item's row. The variant a target pins is held to the tenant and the
-- Business and NOT to the item (app.content_variants has no item column to key against -- 100:854
-- records the gap on 080's table), exactly as 081's pin is; the gap is 080's and stays in its
-- blocker.
--
-- `kernel_job_id` CARRIES NO FOREIGN KEY, for 061's reason on `job_id` (061:344-356): JOB-SHORT
-- gives a job thirty days for a success and ninety for a failure while this family has the life of
-- the Workspace, and "a foreign key would make the ledger row die with the event it dedupes"
-- (question 9). ONE JOB PER TARGET is A0's reading of §4.8 ("provider request key unique ต่อ target;
-- attempt summary") against the technical architecture's "สร้าง publish_target และ publish_job
-- แยกกัน" per send and 050's scalar attempt on one row; §4.8 does not state 1:1 and the reading
-- is recorded. `provider_request_key` is unique per WORKSPACE rather than per target -- broader than
-- §4.8 in the safe direction: two targets sharing a key would have the provider fold two posts into
-- one, which is the double-post's mirror image -- and that departure is recorded too.
--
-- ============================================================================================
-- WHAT §4.8 NAMES THAT THIS BATCH DOES NOT WRITE, AND WHY
-- ============================================================================================
--
-- 1. `publish_intents.status`. §4.8 lists it. Under the reading above no role in this batch can move
--    it -- the client's UPDATE is the cancellation, the worker holds SELECT only -- so a column would
--    be a value set at INSERT and never again. The Owner chose no column (question 5b): an intent's
--    state is what its targets say, and the cost is stated rather than absorbed: "cancel PENDING"
--    cannot be checked in the database, because there is no `pending` to check. In the open blockers.
--
-- 2. `status` ON THE TARGET AND THE JOB CARRIES A VOCABULARY, and it is the Owner's (question 5a):
--    a target is `pending`, `publishing`, `published`, `failed` or `skipped`; a job is `queued`,
--    `running`, `succeeded` or `failed`. §3.2's Phase 1 rule -- text plus a named CHECK whose values
--    change by migration only -- applied. `cancelled` is deliberately NOT a target state: cancellation
--    is the intent's and the person's, and a worker that could stamp it could cancel a tenant's
--    publishing (070's sentence about cancel_requested_at).
--
-- 3. A soft lifecycle column. §3.2 asks every mutable row for `archived_at` or `deleted_at`; none of
--    the three mutable tables here carries one. Publish history is kept -- the whole family is
--    PUBLISH-HISTORY -- and its hard deletion is 160's at closure. A `deleted_at` a client could set
--    would be a way to hide a delivery from the export §11.1 requires. Recorded as a reading.
--
-- 4. `created_by` / `updated_by` on the target, the pin, the job and the post. §3.2 attaches the actor
--    columns to a USER mutation; these rows are the service's act (§4's ERD verbs: the target
--    "publishes", the post is "produced"), which is 070's split -- the run a person requested carries
--    created_by, the sources and evidence the worker writes do not -- and 110's for social_accounts.
--    The intent carries all four and `requested_by` beside them.
--
-- 5. `platform` is `facebook` / `instagram`, the values 080 and 100 already use on content_variants
--    and content_asset_links; 110 spells the account's kind `fb` / `ig`. Two vocabularies for one
--    distinction is a finding about the schema, recorded as a blocker rather than resolved here by
--    a third spelling (question 13). Whether a target's variant platform, its account kind and its
--    post's platform agree is a cross-table rule and belongs to the command surface.
--
-- 6. §4 invariant 5 -- a pinned asset version must be `ready` with rights valid -- is enforced by
--    NOTHING on app.publish_target_assets, for the reason blocker 153 gives about
--    app.content_asset_links, word for word: `ready` is a lifecycle state on another table a CHECK
--    cannot read, and rights are a state with nothing binding it to the instant of the pin. The key
--    holds the version to the asset named beside it and to the tenant; it does not hold the version
--    ready. Recorded again rather than left to look closed.
--
-- 7. `request_kind = 'scheduled'` with no schedule row is a state batch 091 must close (question 12);
--    a fixture intent carries it so the CHECK is exercised, and the blocker names A5.
--
-- ============================================================================================
-- THE FORWARD KEY ON BATCH 081's TABLE
-- ============================================================================================
--
-- Added rather than rewritten (migration invariant 1): 081 is merged and its own apply-time block
-- asserted the absence of a FOREIGN key on social_account_id, which this UNIQUE key is not. The
-- supporting index is the key's own.
alter table app.content_targets
  add constraint content_targets_destination_key unique (workspace_id, business_profile_id, id, social_account_id);

comment on constraint content_targets_destination_key on app.content_targets is
  'Batch 120 (publisher): the target of publish_targets_content_target_fk, so a publish target names '
  'the aim AND the account the aim resolves to in one key. A forward change to batch 081''s table in '
  'batch 111''s shape (111 added social_accounts_scope_key to 110''s); 081 is not rewritten.';

-- ============================================================================================
-- app.publish_intents — the user's act: "publish this version of this item", once per key
-- ============================================================================================
create table if not exists app.publish_intents (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid        not null,
  business_profile_id  uuid        not null,
  -- The parent that carries §4 invariant 3's Page override. Not copied here: the narrowing below
  -- resolves through app.content_items, which is 070's, 080's and 081's child rule.
  content_item_id      uuid        not null,
  -- §4 invariant 4: "Content ที่ approve/schedule/publish ต้อง pin content_version_id". Held to the
  -- item's own versions by the four-column key, and outside every UPDATE grant.
  content_version_id   uuid        not null,
  -- §4.8. Bound to the caller by a restrictive INSERT policy in 094's shape.
  requested_by         uuid        not null,
  -- §4.8 gives the two values in terms: "request_kind(now|scheduled)".
  request_kind         text        not null,
  -- §4.8: "unique (workspace_id, idempotency_key)". CTR-PUB-001's "idempotency ledger" on the client
  -- side of the line, and ID-001's "key scope includes workspace+operation". A mobile retry that
  -- re-sends the same key is refused with 23505 and creates nothing twice.
  idempotency_key      text        not null,
  -- "cancel pending" as a timestamp, because the vocabulary the word `pending` would need does not
  -- exist on this row (header, item 1). In the client UPDATE grant and outside the worker's.
  cancelled_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid,
  updated_by           uuid,
  constraint publish_intents_request_kind_known
    check (request_kind in ('now', 'scheduled')),
  constraint publish_intents_idempotency_key_bounded
    check (length(idempotency_key) between 1 and 128 and length(btrim(idempotency_key)) > 0),
  constraint publish_intents_item_scope_fk
    foreign key (workspace_id, business_profile_id, content_item_id)
    references app.content_items (workspace_id, business_profile_id, id),
  constraint publish_intents_pinned_version_fk
    foreign key (workspace_id, business_profile_id, content_item_id, content_version_id)
    references app.content_versions (workspace_id, business_profile_id, content_item_id, id),
  constraint publish_intents_idempotency_key_unique unique (workspace_id, idempotency_key),
  constraint publish_intents_scope_key unique (workspace_id, business_profile_id, id)
);

-- One index supports both keys by prefix: its leading three columns are publish_intents_item_scope_fk
-- and its leading four are publish_intents_pinned_version_fk (batch 104's rule).
create index if not exists publish_intents_item_version_scope_idx
  on app.publish_intents (workspace_id, business_profile_id, content_item_id, content_version_id);
-- The column a retention sweep reads (061's watermark pattern; §10 owns the number, 160 the sweep).
create index if not exists publish_intents_created_at_idx on app.publish_intents (created_at);

comment on table app.publish_intents is
  'Owner: A6 Publisher (publisher.meta, batch 120). The user''s act on §8.3''s "Publish now/cancel '
  'pending" row: owner and admin create it (Y), the editor is refused (P with no capability defined, '
  'question 2 of the 2026-09-15 disposition), and the service reads it and writes nothing. Scope '
  'workspace_id and business_profile_id; the Page override is NOT copied and the restrictive narrowing '
  'resolves it through app.content_items. content_version_id is §4 invariant 4''s pin, held to the '
  'item by a four-column key and outside every UPDATE grant. idempotency_key is unique per workspace '
  'and is CTR-PUB-001''s client-side ledger. No status column: an intent''s state is what its targets '
  'say (question 5b); cancellation is cancelled_at, a person''s verb the worker cannot touch. '
  'Sensitivity CONTENT-2; retention PUBLISH-HISTORY, whose window is not encoded here.';
comment on column app.publish_intents.content_version_id is
  'CONTENT-2. §4 invariant 4''s pin. Outside every UPDATE grant: a pin the pinner can move is not a '
  'pin. Held to this intent''s own item by publish_intents_pinned_version_fk over four columns.';
comment on column app.publish_intents.requested_by is
  'PII-2 (actor identity). Who asked for the publication; §8.3''s "Publish now" verb. Bound to the '
  'caller at INSERT by publish_intents_requester_is_caller (094''s shape) and never updatable.';
comment on column app.publish_intents.request_kind is
  'CONTENT-2. `now` or `scheduled`, §4.8''s two values as text + a named CHECK (§3.2). A `scheduled` '
  'intent with no schedule row is a state batch 091 owes; recorded in the work package.';
comment on column app.publish_intents.idempotency_key is
  'CONTENT-2. The client''s idempotency key, unique per workspace (§4.8). A retry carrying the same '
  'key is refused with 23505 and repeats nothing; ID-001''s key scope is workspace + operation.';
comment on column app.publish_intents.cancelled_at is
  'CONTENT-2. "cancel pending" as a timestamp. In the client UPDATE grant for owner and admin only; '
  'outside the worker''s grants, because cancellation is a person''s verb (070''s reason).';

-- ============================================================================================
-- app.publish_targets — one row per send: the aim, the account, the pinned variant, the outcome
-- ============================================================================================
create table if not exists app.publish_targets (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid        not null,
  business_profile_id  uuid        not null,
  publish_intent_id    uuid        not null,
  -- The destination the user aimed at in batch 081, held together with its account by the
  -- four-column key this batch adds to that table.
  content_target_id    uuid        not null,
  -- §3.3's canonical "Connected destination" field. Referenced over (workspace_id, social_account_id)
  -- in 111's exact shape as well as through the content target.
  social_account_id    uuid        not null,
  -- §4.8: "pinned content variant". NOT NULL: a send that has not chosen what to send is not a send.
  -- Outside every UPDATE grant.
  content_variant_id   uuid        not null,
  -- The Owner's vocabulary (question 5a). The worker's outcomes only; no `cancelled`.
  status               text        not null default 'pending',
  dispatched_at        timestamptz,
  completed_at         timestamptz,
  failed_at            timestamptz,
  -- PROVIDER-3, "safe projection only": a code, never a provider's message or stack trace (§9.2).
  failure_class        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint publish_targets_status_known
    check (status in ('pending', 'publishing', 'published', 'failed', 'skipped')),
  -- A CODE, HELD TO BEING ONE. Not-blank alone would have left this the only PROVIDER-3 column in
  -- the batch inside the client SELECT with neither a bound nor a shape -- so §9.2's "never a
  -- provider's message or stack trace" would have been a comment ON the column rather than a control
  -- OVER it, and the raw external identifier this batch deliberately refuses a home would have had
  -- one path left into `app` where every active member could read it (A1-120 F1). Batch 131 bounds
  -- its client-facing failure code at 1..128 and batch 140 holds `reason_key` to a regex; this is
  -- 140's shape, tightened, because a code that must fit 64 characters of lower-case, digits, dot
  -- and underscore cannot carry a sentence, a URL or an external post id.
  constraint publish_targets_failure_class_is_a_code
    check (failure_class is null or failure_class ~ '^[a-z][a-z0-9_.]{0,63}$'),
  -- A failure class without a failure time is not a failure record.
  constraint publish_targets_failure_is_dated
    check (failure_class is null or failed_at is not null),
  constraint publish_targets_intent_scope_fk
    foreign key (workspace_id, business_profile_id, publish_intent_id)
    references app.publish_intents (workspace_id, business_profile_id, id),
  constraint publish_targets_content_target_fk
    foreign key (workspace_id, business_profile_id, content_target_id, social_account_id)
    references app.content_targets (workspace_id, business_profile_id, id, social_account_id),
  -- 111's key, column for column: a destination in another tenant is refused at the database.
  constraint publish_targets_social_scope_fk
    foreign key (workspace_id, social_account_id)
    references app.social_accounts (workspace_id, id),
  constraint publish_targets_variant_scope_fk
    foreign key (workspace_id, business_profile_id, content_variant_id)
    references app.content_variants (workspace_id, business_profile_id, id),
  -- One target per (intent, destination). Not §4.6's "unique ACTIVE target", which is 081's rule
  -- over a lifecycle column this table does not carry.
  constraint publish_targets_one_per_destination unique (publish_intent_id, social_account_id),
  constraint publish_targets_scope_key unique (workspace_id, business_profile_id, id),
  -- The target of published_posts_target_destination_fk, so a post''s account is the target''s.
  constraint publish_targets_destination_key unique (workspace_id, id, social_account_id)
);

create index if not exists publish_targets_intent_scope_idx
  on app.publish_targets (workspace_id, business_profile_id, publish_intent_id);
create index if not exists publish_targets_content_target_idx
  on app.publish_targets (workspace_id, business_profile_id, content_target_id, social_account_id);
create index if not exists publish_targets_social_scope_idx
  on app.publish_targets (workspace_id, social_account_id);
create index if not exists publish_targets_variant_scope_idx
  on app.publish_targets (workspace_id, business_profile_id, content_variant_id);
create index if not exists publish_targets_created_at_idx on app.publish_targets (created_at);

comment on table app.publish_targets is
  'Owner: A6 Publisher (publisher.meta, batch 120). One row per send to one social account: the '
  'first half of §8.3''s "Publish delivery" S cell, written by the service and by no client role '
  '(question 3), classified CARRIED in db/foundation/lint/service-policy-map.json and NOT enforced '
  'by any policy because RFC-2026-022 is approved and NOT IN EFFECT (§5/8). app_worker holds '
  'column-scoped grants and no policy, so its refusal is row level security. Scope workspace_id and '
  'business_profile_id; the Page override resolves through the intent''s item. content_target_id '
  'and social_account_id are held together by content_targets_destination_key (this batch''s forward '
  'key on 081) and the account by 111''s composite key as well. content_variant_id is the pinned '
  'variant, outside every UPDATE grant. status carries the Owner''s vocabulary; a failed send keeps '
  'its row and its failure class so partial success is a row and not a sentence (§4 invariant 7). '
  'Sensitivity CONTENT-2/PROVIDER-3; retention PUBLISH-HISTORY.';
comment on column app.publish_targets.social_account_id is
  'INTEGRATION-2 reference. §3.3''s canonical destination field, referenced over (workspace_id, '
  'social_account_id) -> app.social_accounts (workspace_id, id) in batch 111''s shape. Outside every '
  'UPDATE grant: re-aiming a send is a different send (§8.5).';
comment on column app.publish_targets.content_variant_id is
  'CONTENT-2. The variant actually sent (§4.8 "pinned content variant"), held to the tenant and the '
  'Business by publish_targets_variant_scope_fk and NOT to the item (080''s gap, blocker on 080). '
  'Outside every UPDATE grant.';
comment on column app.publish_targets.status is
  'CONTENT-2. pending | publishing | published | failed | skipped -- the Product Owner''s vocabulary '
  '(2026-09-15, question 5a), text + a named CHECK (§3.2). The worker''s outcomes only: `cancelled` '
  'is not a state here because cancellation is the intent''s cancelled_at, a person''s verb.';
comment on column app.publish_targets.failure_class is
  'PROVIDER-3, safe projection only. A short code naming why a send failed; never a provider''s '
  'message, payload or stack trace (§9.2). Readable by the client so partial success can be shown, '
  'which is why the shape is a CONSTRAINT rather than a comment: at most 64 characters of lower-case, '
  'digits, dot and underscore, which cannot hold a sentence, a URL or an external post id. NO '
  'VOCABULARY, for the reason §4.6''s status columns carry none -- no document enumerates the failure '
  'classes and inventing them here would be this batch choosing them for Product.';

-- ============================================================================================
-- app.publish_target_assets — the asset versions a send carries, pinned to the version and not to
-- "latest"
-- ============================================================================================
create table if not exists app.publish_target_assets (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid        not null,
  business_profile_id  uuid        not null,
  publish_target_id    uuid        not null,
  asset_id             uuid        not null,
  asset_version_id     uuid        not null,
  sort_order           integer     not null,
  -- 100's vocabulary for the role a media plays in a post, kept rather than re-decided.
  role                 text        not null,
  created_at           timestamptz not null default now(),
  constraint publish_target_assets_role_known
    check (role in ('cover', 'feed', 'story', 'reel', 'carousel_item', 'thumbnail')),
  constraint publish_target_assets_sort_order_not_negative check (sort_order >= 0),
  constraint publish_target_assets_target_scope_fk
    foreign key (workspace_id, business_profile_id, publish_target_id)
    references app.publish_targets (workspace_id, business_profile_id, id),
  -- content_asset_links'' key, column for column: the version is held to the asset named beside it
  -- and to the tenant and Business. It is NOT held `ready` (header, item 6; blocker 153).
  constraint publish_target_assets_asset_version_scope_fk
    foreign key (workspace_id, business_profile_id, asset_id, asset_version_id)
    references app.asset_versions (workspace_id, business_profile_id, asset_id, id),
  constraint publish_target_assets_one_per_slot unique (publish_target_id, sort_order)
);

create index if not exists publish_target_assets_target_scope_idx
  on app.publish_target_assets (workspace_id, business_profile_id, publish_target_id);
create index if not exists publish_target_assets_asset_version_idx
  on app.publish_target_assets (workspace_id, business_profile_id, asset_id, asset_version_id);

comment on table app.publish_target_assets is
  'Owner: A6 Publisher (publisher.meta, batch 120). The asset versions one send carries, pinned by '
  'id (ADR-012: "ห้ามอ้างคำว่า latest") over content_asset_links'' four-column key into '
  'app.asset_versions. APPEND-ONLY: no role holds UPDATE or DELETE, and the row has no updated_at. '
  'This table has NO §8 cell -- the matrix''s S cell names the delivery, the post and the metric -- '
  'so it has no service-policy-map row, no service policy is ever expected here, and it is one of '
  'the two tables batch 122 closes (question 11). app_worker holds SELECT and INSERT and no policy. '
  '§4 invariant 5 (`ready`, rights valid) is enforced by nothing here, as blocker 153 records for '
  'app.content_asset_links. Sensitivity MEDIA-2 by reference; retention PUBLISH-HISTORY.';

-- ============================================================================================
-- app.publish_jobs — the second half of the delivery: one job per target, retries as attempts
-- ============================================================================================
create table if not exists app.publish_jobs (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid        not null,
  business_profile_id   uuid        not null,
  publish_target_id     uuid        not null,
  -- No foreign key, for 061's reason on job_id: JOB-SHORT is shorter than PUBLISH-HISTORY and a key
  -- would make the history die with the job it records (question 9). Not in the client SELECT.
  kernel_job_id         uuid,
  -- The key sent to the provider so a retry after an ambiguous timeout cannot create a second post
  -- (ID-004, META-017). Unique per workspace; PROVIDER-3, outside the client SELECT.
  provider_request_key  text        not null,
  status                text        not null default 'queued',
  -- §4.8's "attempt summary" as scalars, 050's shape.
  attempt_count         integer     not null default 0,
  last_attempt_at       timestamptz,
  -- PROVIDER-3: a code, never a message (§9.2). Outside the client SELECT.
  last_error_code       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint publish_jobs_status_known
    check (status in ('queued', 'running', 'succeeded', 'failed')),
  constraint publish_jobs_attempt_count_not_negative check (attempt_count >= 0),
  constraint publish_jobs_provider_request_key_bounded
    check (length(provider_request_key) between 1 and 128 and length(btrim(provider_request_key)) > 0),
  constraint publish_jobs_last_error_code_not_blank
    check (last_error_code is null or length(btrim(last_error_code)) > 0),
  constraint publish_jobs_target_scope_fk
    foreign key (workspace_id, business_profile_id, publish_target_id)
    references app.publish_targets (workspace_id, business_profile_id, id),
  constraint publish_jobs_one_per_target unique (publish_target_id),
  constraint publish_jobs_provider_request_key_unique unique (workspace_id, provider_request_key)
);

create index if not exists publish_jobs_target_scope_idx
  on app.publish_jobs (workspace_id, business_profile_id, publish_target_id);
create index if not exists publish_jobs_created_at_idx on app.publish_jobs (created_at);

comment on table app.publish_jobs is
  'Owner: A6 Publisher (publisher.meta, batch 120). The second half of §8.3''s "Publish delivery" S '
  'cell: one job per target (A0''s reading of §4.8, recorded), its retries as attempt scalars, and '
  'the provider request key that keeps a retry from posting twice -- unique per workspace, which is '
  'broader than §4.8''s "ต่อ target" in the safe direction. Written and advanced by the service only '
  '(questions 3 and 10); classified CARRIED and not enforced (RFC-2026-022 §5/8); app_worker holds '
  'column-scoped grants and no policy. kernel_job_id carries no foreign key (061''s retention reason). '
  'The client SELECT is the REDACTED set: no kernel job id, no provider key, no error code '
  '(PROVIDER-3, and what §8.4''s job row would give a job-shaped table). Sensitivity '
  'CONTENT-2/PROVIDER-3; retention PUBLISH-HISTORY.';
comment on column app.publish_jobs.provider_request_key is
  'PROVIDER-3. The idempotency key sent to the provider (ID-004, META-017). Unique per workspace so '
  'two sends can never share one and be folded into one post. Outside the client SELECT and every '
  'UPDATE grant.';
comment on column app.publish_jobs.kernel_job_id is
  'INTERNAL-3 reference to app.jobs, deliberately unconstrained: JOB-SHORT purges the job long before '
  'PUBLISH-HISTORY purges this row (061''s reason for job_id). Outside the client SELECT.';
comment on column app.publish_jobs.last_error_code is
  'PROVIDER-3. A code naming the last failure; never a provider message or stack trace (§9.2). '
  'Outside the client SELECT; the target''s failure_class is the client-facing summary.';

-- ============================================================================================
-- app.published_posts — the immutable result of a successful send
-- ============================================================================================
create table if not exists app.published_posts (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid        not null,
  business_profile_id  uuid        not null,
  publish_target_id    uuid        not null,
  -- Copied from the target and held to it by published_posts_target_destination_fk.
  social_account_id    uuid        not null,
  -- 080's and 100's values. 110 spells the account kind fb/ig; recorded as a finding, not resolved.
  platform             text        not null,
  -- §9.1 PROVIDER-3: "external post ID ... private, redact/log hash". The hash, and only the hash;
  -- the raw identifier has no home in this schema yet (header).
  external_post_hash   bytea       not null,
  published_at         timestamptz not null,
  created_at           timestamptz not null default now(),
  constraint published_posts_platform_known check (platform in ('facebook', 'instagram')),
  constraint published_posts_external_hash_is_sha256 check (octet_length(external_post_hash) = 32),
  constraint published_posts_target_scope_fk
    foreign key (workspace_id, business_profile_id, publish_target_id)
    references app.publish_targets (workspace_id, business_profile_id, id),
  constraint published_posts_target_destination_fk
    foreign key (workspace_id, publish_target_id, social_account_id)
    references app.publish_targets (workspace_id, id, social_account_id),
  -- §4.8: "unique successful target".
  constraint published_posts_one_per_target unique (publish_target_id),
  -- §4.8: "unique platform/external post id", per account, over the hash.
  constraint published_posts_external_hash_unique unique (social_account_id, external_post_hash)
);

create index if not exists published_posts_target_scope_idx
  on app.published_posts (workspace_id, business_profile_id, publish_target_id);
create index if not exists published_posts_destination_idx
  on app.published_posts (workspace_id, publish_target_id, social_account_id);
create index if not exists published_posts_published_at_idx on app.published_posts (published_at);

comment on table app.published_posts is
  'Owner: A6 Publisher (publisher.meta, batch 120). The immutable record that a send succeeded: '
  '§8.3''s "post" in the S cell, written by the service and by nobody else, classified CARRIED and not '
  'enforced (RFC-2026-022 §5/8). IMMUTABLE: no updated_at, and no role -- the service included -- '
  'holds UPDATE or DELETE (§3.2 "publish history ห้าม update"). external_post_hash is sha256 of the '
  'provider''s post identifier and the identifier itself is stored NOWHERE: §9.1 makes it PROVIDER-3, '
  '110 refused a raw home for the account identifier for reasons that still hold, and 110:365 named '
  'this batch as the one that would have to answer -- it defers, in writing (question 6). No '
  'permalink for the same reason (question 7). social_account_id is held to the target''s by '
  'published_posts_target_destination_fk. Sensitivity PROVIDER-3; retention PUBLISH-HISTORY.';
comment on column app.published_posts.external_post_hash is
  'PROVIDER-3, standing in for a value §9.1 tells this schema to redact: exactly 32 octets of sha256 '
  'of the provider''s post identifier, unique per social account. The raw identifier is stored nowhere '
  'in this schema (header) and this column is outside the client SELECT ("safe projection only").';
comment on column app.published_posts.platform is
  'PROVIDER-3. facebook | instagram, the values app.content_variants and app.content_asset_links '
  'carry. app.social_accounts.account_kind spells the same pair fb | ig; recorded in the work package.';

-- ============================================================================================
-- updated_at is the database''s on every table that grants it (batch 093''s general rule)
-- ============================================================================================
drop trigger if exists set_updated_at on app.publish_intents;
create trigger set_updated_at before update on app.publish_intents
  for each row execute function private.set_updated_at();
drop trigger if exists set_updated_at on app.publish_targets;
create trigger set_updated_at before update on app.publish_targets
  for each row execute function private.set_updated_at();
drop trigger if exists set_updated_at on app.publish_jobs;
create trigger set_updated_at before update on app.publish_jobs
  for each row execute function private.set_updated_at();

-- ============================================================================================
-- ROW LEVEL SECURITY — ENABLE and FORCE on all five, per RFC-2026-016 §2 as amended
-- ============================================================================================
alter table app.publish_intents        enable row level security;
alter table app.publish_intents        force  row level security;
alter table app.publish_targets        enable row level security;
alter table app.publish_targets        force  row level security;
alter table app.publish_target_assets  enable row level security;
alter table app.publish_target_assets  force  row level security;
alter table app.publish_jobs           enable row level security;
alter table app.publish_jobs           force  row level security;
alter table app.published_posts        enable row level security;
alter table app.published_posts        force  row level security;

-- ============================================================================================
-- GRANTS — column-scoped, and the columns that are ABSENT are the control
-- ============================================================================================
--
-- `anon` is granted nothing anywhere in `app` (RFC-2026-021 §7/4). `app_command` and
-- `app_maintenance` are granted nothing by this batch: no command surface exists for
-- publisher.meta (RFC-2026-021 §10) and the retention path is batch 160. `app_authz` holds its
-- pinned four columns of app.workspace_members and nothing else (RFC-2026-020 §6.1/6).

-- THE INTENT. The client reads every column and writes the act and its cancellation; the worker
-- reads it to fan out and writes nothing (header: a reading, narrower than 110's).
grant select (id, workspace_id, business_profile_id, content_item_id, content_version_id,
              requested_by, request_kind, idempotency_key, cancelled_at, created_at, updated_at,
              created_by, updated_by)
  on app.publish_intents to authenticated;
grant insert (workspace_id, business_profile_id, content_item_id, content_version_id, requested_by,
              request_kind, idempotency_key, created_by, updated_by)
  on app.publish_intents to authenticated;
-- Three columns. The pin, the item, the requester, the kind and the key are outside: re-pinning,
-- re-homing or re-keying an intent is a different intent (§8.5).
grant update (cancelled_at, updated_at, updated_by) on app.publish_intents to authenticated;
grant select (id, workspace_id, business_profile_id, content_item_id, content_version_id,
              requested_by, request_kind, idempotency_key, cancelled_at, created_at, updated_at,
              created_by, updated_by)
  on app.publish_intents to app_worker;

-- THE TARGET. The client reads every column -- failure_class included, because partial success must
-- be shown -- and writes none. The worker fans out (INSERT) and advances the outcome (UPDATE on the
-- Owner's six columns, question 10); the intent, the aim, the account and the pin are outside.
grant select (id, workspace_id, business_profile_id, publish_intent_id, content_target_id,
              social_account_id, content_variant_id, status, dispatched_at, completed_at, failed_at,
              failure_class, created_at, updated_at)
  on app.publish_targets to authenticated;
grant select (id, workspace_id, business_profile_id, publish_intent_id, content_target_id,
              social_account_id, content_variant_id, status, dispatched_at, completed_at, failed_at,
              failure_class, created_at, updated_at)
  on app.publish_targets to app_worker;
grant insert (id, workspace_id, business_profile_id, publish_intent_id, content_target_id,
              social_account_id, content_variant_id, status)
  on app.publish_targets to app_worker;
grant update (status, dispatched_at, completed_at, failed_at, failure_class, updated_at)
  on app.publish_targets to app_worker;

-- THE PIN. Append-only for everybody: the client reads, the worker reads and inserts, nobody updates
-- or deletes.
grant select (id, workspace_id, business_profile_id, publish_target_id, asset_id, asset_version_id,
              sort_order, role, created_at)
  on app.publish_target_assets to authenticated;
grant select (id, workspace_id, business_profile_id, publish_target_id, asset_id, asset_version_id,
              sort_order, role, created_at)
  on app.publish_target_assets to app_worker;
grant insert (id, workspace_id, business_profile_id, publish_target_id, asset_id, asset_version_id,
              sort_order, role)
  on app.publish_target_assets to app_worker;

-- THE JOB. The client reads the REDACTED set (header): no kernel job id, no provider key, no error
-- code. The worker reads everything, opens the job and advances it.
grant select (id, workspace_id, business_profile_id, publish_target_id, status, attempt_count,
              last_attempt_at, created_at, updated_at)
  on app.publish_jobs to authenticated;
grant select (id, workspace_id, business_profile_id, publish_target_id, kernel_job_id,
              provider_request_key, status, attempt_count, last_attempt_at, last_error_code,
              created_at, updated_at)
  on app.publish_jobs to app_worker;
grant insert (id, workspace_id, business_profile_id, publish_target_id, kernel_job_id,
              provider_request_key, status)
  on app.publish_jobs to app_worker;
grant update (status, attempt_count, last_attempt_at, last_error_code, updated_at)
  on app.publish_jobs to app_worker;

-- THE POST. The client reads every column but the hash (PROVIDER-3, "safe projection only"); the
-- worker reads and records. NO UPDATE AND NO DELETE FOR ANY ROLE: the row is immutable.
grant select (id, workspace_id, business_profile_id, publish_target_id, social_account_id, platform,
              published_at, created_at)
  on app.published_posts to authenticated;
grant select (id, workspace_id, business_profile_id, publish_target_id, social_account_id, platform,
              external_post_hash, published_at, created_at)
  on app.published_posts to app_worker;
grant insert (id, workspace_id, business_profile_id, publish_target_id, social_account_id, platform,
              external_post_hash, published_at)
  on app.published_posts to app_worker;

-- ============================================================================================
-- POLICIES — every one `TO authenticated`; the service has none (header)
-- ============================================================================================
--
-- Reads: active membership, as every table in this schema since 010; the restrictive narrowing
-- below is what subtracts by scope. The intent's narrowing resolves through app.content_items, in
-- 081's exact shape; each child's resolves through the intent AND the item, two steps, both through
-- helpers that answer about the caller and never by naming a membership table (RFC-2026-020 §5/5).
-- The subqueries run as the caller, so the policies of app.publish_intents and app.content_items
-- apply inside them -- which is 081's measured note: the parent's policy answers first.

create policy publish_intents_select_active_member on app.publish_intents
  for select to authenticated
  using (app.is_active_member(workspace_id));

create policy publish_intents_insert_owner_admin on app.publish_intents
  for insert to authenticated
  with check (
    -- §8.5: "user action ตรวจ created_by = (select auth.uid())"; §8.3 row 1: Y for owner and admin,
    -- the editor's P refused (question 2), approver and viewer N.
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin')
  );

-- 094's shape: the requester is the caller, at INSERT, and the column is never updatable.
create policy publish_intents_requester_is_caller on app.publish_intents
  as restrictive for insert to authenticated
  with check (requested_by = (select auth.uid()));

-- 102's shape: a client may leave updated_by empty or name itself, never anybody else.
create policy publish_intents_updated_by_is_caller on app.publish_intents
  as restrictive for insert to authenticated
  with check (updated_by is null or updated_by = (select auth.uid()));

create policy publish_intents_update_owner_admin on app.publish_intents
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin'))
  with check (
    updated_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin')
  );

create policy publish_intents_scope_narrowing on app.publish_intents
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.content_items i
      where i.workspace_id = publish_intents.workspace_id
        and i.business_profile_id = publish_intents.business_profile_id
        and i.id = publish_intents.content_item_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  )
  with check (
    exists (
      select 1 from app.content_items i
      where i.workspace_id = publish_intents.workspace_id
        and i.business_profile_id = publish_intents.business_profile_id
        and i.id = publish_intents.content_item_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  );

create policy publish_targets_select_active_member on app.publish_targets
  for select to authenticated
  using (app.is_active_member(workspace_id));

create policy publish_targets_scope_narrowing on app.publish_targets
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.publish_intents pi
      join app.content_items i
        on i.workspace_id = pi.workspace_id
       and i.business_profile_id = pi.business_profile_id
       and i.id = pi.content_item_id
      where pi.workspace_id = publish_targets.workspace_id
        and pi.business_profile_id = publish_targets.business_profile_id
        and pi.id = publish_targets.publish_intent_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  )
  with check (
    exists (
      select 1 from app.publish_intents pi
      join app.content_items i
        on i.workspace_id = pi.workspace_id
       and i.business_profile_id = pi.business_profile_id
       and i.id = pi.content_item_id
      where pi.workspace_id = publish_targets.workspace_id
        and pi.business_profile_id = publish_targets.business_profile_id
        and pi.id = publish_targets.publish_intent_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  );

create policy publish_target_assets_select_active_member on app.publish_target_assets
  for select to authenticated
  using (app.is_active_member(workspace_id));

create policy publish_target_assets_scope_narrowing on app.publish_target_assets
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.publish_targets t
      join app.publish_intents pi
        on pi.workspace_id = t.workspace_id
       and pi.business_profile_id = t.business_profile_id
       and pi.id = t.publish_intent_id
      join app.content_items i
        on i.workspace_id = pi.workspace_id
       and i.business_profile_id = pi.business_profile_id
       and i.id = pi.content_item_id
      where t.workspace_id = publish_target_assets.workspace_id
        and t.business_profile_id = publish_target_assets.business_profile_id
        and t.id = publish_target_assets.publish_target_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  )
  with check (
    exists (
      select 1 from app.publish_targets t
      join app.publish_intents pi
        on pi.workspace_id = t.workspace_id
       and pi.business_profile_id = t.business_profile_id
       and pi.id = t.publish_intent_id
      join app.content_items i
        on i.workspace_id = pi.workspace_id
       and i.business_profile_id = pi.business_profile_id
       and i.id = pi.content_item_id
      where t.workspace_id = publish_target_assets.workspace_id
        and t.business_profile_id = publish_target_assets.business_profile_id
        and t.id = publish_target_assets.publish_target_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  );

create policy publish_jobs_select_active_member on app.publish_jobs
  for select to authenticated
  using (app.is_active_member(workspace_id));

create policy publish_jobs_scope_narrowing on app.publish_jobs
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.publish_targets t
      join app.publish_intents pi
        on pi.workspace_id = t.workspace_id
       and pi.business_profile_id = t.business_profile_id
       and pi.id = t.publish_intent_id
      join app.content_items i
        on i.workspace_id = pi.workspace_id
       and i.business_profile_id = pi.business_profile_id
       and i.id = pi.content_item_id
      where t.workspace_id = publish_jobs.workspace_id
        and t.business_profile_id = publish_jobs.business_profile_id
        and t.id = publish_jobs.publish_target_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  )
  with check (
    exists (
      select 1 from app.publish_targets t
      join app.publish_intents pi
        on pi.workspace_id = t.workspace_id
       and pi.business_profile_id = t.business_profile_id
       and pi.id = t.publish_intent_id
      join app.content_items i
        on i.workspace_id = pi.workspace_id
       and i.business_profile_id = pi.business_profile_id
       and i.id = pi.content_item_id
      where t.workspace_id = publish_jobs.workspace_id
        and t.business_profile_id = publish_jobs.business_profile_id
        and t.id = publish_jobs.publish_target_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  );

create policy published_posts_select_active_member on app.published_posts
  for select to authenticated
  using (app.is_active_member(workspace_id));

create policy published_posts_scope_narrowing on app.published_posts
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.publish_targets t
      join app.publish_intents pi
        on pi.workspace_id = t.workspace_id
       and pi.business_profile_id = t.business_profile_id
       and pi.id = t.publish_intent_id
      join app.content_items i
        on i.workspace_id = pi.workspace_id
       and i.business_profile_id = pi.business_profile_id
       and i.id = pi.content_item_id
      where t.workspace_id = published_posts.workspace_id
        and t.business_profile_id = published_posts.business_profile_id
        and t.id = published_posts.publish_target_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  )
  with check (
    exists (
      select 1 from app.publish_targets t
      join app.publish_intents pi
        on pi.workspace_id = t.workspace_id
       and pi.business_profile_id = t.business_profile_id
       and pi.id = t.publish_intent_id
      join app.content_items i
        on i.workspace_id = pi.workspace_id
       and i.business_profile_id = pi.business_profile_id
       and i.id = pi.content_item_id
      where t.workspace_id = published_posts.workspace_id
        and t.business_profile_id = published_posts.business_profile_id
        and t.id = published_posts.publish_target_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  );

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED
-- ============================================================================================
--
-- Against the LIVE catalog and the LIVE ACL, asked of every role rather than of the roles named
-- above, because a grant made by a later batch would not appear in this file at all (100's rule).
-- The probes at the end run in a subtransaction that always aborts (140's shape) and need no fixture
-- row: every one of them is refused by a CHECK, which PostgreSQL evaluates before any foreign key
-- trigger fires, so the SQLSTATE they demand is the constraint's own. The probes that need parent
-- rows -- a destination in another tenant, a second target on one destination, a second job or post
-- on one target, a reused provider key, a pin in another tenant -- run in the batch 120 fixture's
-- own block, after the rows they need exist, and demand the same SQLSTATEs by constraint name.
do $$
declare
  offending        text;
  count_of         integer;
  narrowing        text;
  probe            record;
  probe_sqlstate   text;
  probe_seen       text[] := array[]::text[];
  every_role constant text[] :=
    array['authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz'];
  client_roles constant text[] := array['authenticated', 'anon'];
  publisher_tables constant text[] :=
    array['publish_intents', 'publish_targets', 'publish_target_assets', 'publish_jobs', 'published_posts'];
  service_written constant text[] :=
    array['publish_targets', 'publish_target_assets', 'publish_jobs', 'published_posts'];
  -- Columns no role may ever UPDATE, per table: identity, scope, the aim, the account, the pins,
  -- the requester, the key (§8.5, §4 invariant 4, §4.8).
  intent_fixed constant text[] :=
    array['id', 'workspace_id', 'business_profile_id', 'content_item_id', 'content_version_id',
          'requested_by', 'request_kind', 'idempotency_key', 'created_by', 'created_at'];
  target_fixed constant text[] :=
    array['id', 'workspace_id', 'business_profile_id', 'publish_intent_id', 'content_target_id',
          'social_account_id', 'content_variant_id', 'created_at'];
  job_fixed constant text[] :=
    array['id', 'workspace_id', 'business_profile_id', 'publish_target_id', 'kernel_job_id',
          'provider_request_key', 'created_at'];
begin
  -- 1. ENABLE and FORCE on all five. Different catalog columns; the data package's lint reads one.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (publisher_tables)
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'batch 120 table(s) without ENABLE and FORCE ROW LEVEL SECURITY: %', offending;
  end if;

  -- 2. THE FORWARD KEY ON 081's TABLE EXISTS OVER EXACTLY THESE FOUR COLUMNS, and the publish target
  --    references it and 111's key both, validated.
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'content_targets'
     and con.conname = 'content_targets_destination_key' and con.contype = 'u'
     and con.conkey = (select array_agg(a.attnum order by array_position(
                          array['workspace_id', 'business_profile_id', 'id', 'social_account_id'], a.attname::text))
                         from pg_catalog.pg_attribute a
                        where a.attrelid = c.oid
                          and a.attname in ('workspace_id', 'business_profile_id', 'id', 'social_account_id'));
  if count_of <> 1 then
    raise exception 'batch 120 did not leave content_targets_destination_key as a unique key over (workspace_id, business_profile_id, id, social_account_id)';
  end if;
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_class r on r.oid = con.confrelid
   where c.relname = 'publish_targets' and con.contype = 'f' and con.convalidated
     and ((con.conname = 'publish_targets_content_target_fk' and r.relname = 'content_targets')
          or (con.conname = 'publish_targets_social_scope_fk' and r.relname = 'social_accounts'));
  if count_of <> 2 then
    raise exception 'batch 120 finds % of the two keys a publish target must carry to the aim and to the account', count_of;
  end if;
  -- And the social key is 111's, column for column: (workspace_id, social_account_id) -> (workspace_id, id).
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_class r on r.oid = con.confrelid
   where c.relname = 'publish_targets' and con.conname = 'publish_targets_social_scope_fk'
     and con.conkey = (select array_agg(a.attnum order by array_position(array['workspace_id', 'social_account_id'], a.attname::text))
                         from pg_catalog.pg_attribute a where a.attrelid = c.oid and a.attname in ('workspace_id', 'social_account_id'))
     and con.confkey = (select array_agg(a.attnum order by array_position(array['workspace_id', 'id'], a.attname::text))
                          from pg_catalog.pg_attribute a where a.attrelid = r.oid and a.attname in ('workspace_id', 'id'));
  if count_of <> 1 then
    raise exception 'publish_targets_social_scope_fk is not (workspace_id, social_account_id) -> app.social_accounts (workspace_id, id), which is batch 111''s shape';
  end if;

  -- 3. NO FOREIGN KEY IN THIS BATCH CARRIES AN ON DELETE ACTION (header: NO ACTION by this batch's
  --    own reason), and kernel_job_id carries no key at all.
  select string_agg(format('%s.%s', c.relname, con.conname), ', ') into offending
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname::text = any (publisher_tables)
     and con.contype = 'f' and con.confdeltype <> 'a';
  if offending is not null then
    raise exception 'a batch 120 foreign key carries an ON DELETE action: %', offending
      using hint = 'Publish history outlives its parents (PUBLISH-HISTORY is the life of the Workspace; 160 purges at closure). A purge that reaches a parent while a target names it fails against the history rather than cascading through it.';
  end if;
  if exists (select 1 from pg_catalog.pg_constraint con
              join pg_catalog.pg_class c on c.oid = con.conrelid
             where c.relname = 'publish_jobs' and con.contype = 'f'
               and exists (select 1 from pg_catalog.pg_attribute a
                            where a.attrelid = c.oid and a.attname = 'kernel_job_id' and a.attnum = any (con.conkey))) then
    raise exception 'publish_jobs.kernel_job_id carries a foreign key, which 061''s retention reason refuses';
  end if;

  -- 4. THE VOCABULARIES ARE THE OWNER'S, AS CHECKS. A vocabulary that quietly gained `cancelled` on
  --    the target would hand the worker a person's verb.
  if not exists (select 1 from pg_catalog.pg_constraint con join pg_catalog.pg_class c on c.oid = con.conrelid
                  where c.relname = 'publish_targets' and con.conname = 'publish_targets_status_known'
                    and pg_catalog.pg_get_constraintdef(con.oid) ~ 'pending' and pg_catalog.pg_get_constraintdef(con.oid) ~ 'published'
                    and pg_catalog.pg_get_constraintdef(con.oid) ~ 'skipped' and pg_catalog.pg_get_constraintdef(con.oid) !~ 'cancelled') then
    raise exception 'publish_targets_status_known does not carry the Owner''s vocabulary, or carries cancelled';
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint con join pg_catalog.pg_class c on c.oid = con.conrelid
                  where c.relname = 'publish_jobs' and con.conname = 'publish_jobs_status_known'
                    and pg_catalog.pg_get_constraintdef(con.oid) ~ 'queued' and pg_catalog.pg_get_constraintdef(con.oid) ~ 'succeeded') then
    raise exception 'publish_jobs_status_known does not carry the Owner''s vocabulary';
  end if;
  if exists (select 1 from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid = a.attrelid
              where c.relname = 'publish_intents' and a.attname = 'status' and not a.attisdropped) then
    raise exception 'app.publish_intents carries a status column; the Owner chose none (question 5b) and a later batch that adds one owes a mover and a vocabulary';
  end if;

  -- 5. NO CLIENT ROLE HOLDS INSERT OR UPDATE ON THE FOUR SERVICE-WRITTEN TABLES (§8.3 row 2, N for
  --    every client role), and NO ROLE HOLDS DELETE ON ANY OF THE FIVE (§8.5).
  select string_agg(format('%s to %s', c.relname, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname::text = any (service_written)
     and r.rolname::text = any (client_roles)
     and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE'));
  if offending is not null then
    raise exception 'a client role can write a delivery, a pin, a job or a post: %', offending
      using hint = '§8.3: "Publish delivery/post/metric INSERT | N | N | N | N | N | S".';
  end if;
  select string_agg(format('%s to %s', c.relname, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname::text = any (publisher_tables)
     and r.rolname::text = any (every_role)
     and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE');
  if offending is not null then
    raise exception 'a batch 120 row can be deleted through a granted path: %', offending
      using hint = '§8.5 has no broad delete; hard removal is batch 160''s at workspace closure through app_maintenance, which this batch grants nothing.';
  end if;

  -- 6. THE POST AND THE PIN ARE IMMUTABLE AS THE PRIVILEGE SYSTEM HOLDS THEM: no role holds UPDATE on
  --    any column of either, and neither carries an UPDATE or DELETE policy.
  select string_agg(format('%s to %s', c.relname, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname in ('published_posts', 'publish_target_assets')
     and r.rolname::text = any (every_role)
     and pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE');
  if offending is not null then
    raise exception 'an immutable batch 120 table can be updated: %', offending
      using hint = '§3.2: "Immutable ... publish history: ห้าม update เนื้อหาเดิม"; the pin is append-only for ADR-012''s reason (a pin that can move is not a pin).';
  end if;
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('published_posts', 'publish_target_assets')
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'an immutable batch 120 table carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- 7. §8.5 AND §4 INVARIANT 4, PER COLUMN, AGAINST THE LIVE ACL: no role may re-identify, re-home,
  --    re-aim, re-pin or re-key a row.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(intent_fixed) as col
       where n.nspname = 'app' and c.relname = 'publish_intents'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(target_fixed) as col
       where n.nspname = 'app' and c.relname = 'publish_targets'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(job_fixed) as col
       where n.nspname = 'app' and c.relname = 'publish_jobs'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity, scope, aim, account, pin or key column of a batch 120 table is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant or scope with an update; §4 invariant 4 pins the version; re-aiming a send is a different send.';
  end if;

  -- 8. CANCELLATION IS THE PERSON'S. The worker holds no INSERT and no UPDATE on the intent at all,
  --    and in particular not cancelled_at (070's cancel_requested_at, kept).
  if exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'app' and c.relname = 'publish_intents'
                and (pg_catalog.has_any_column_privilege('app_worker', c.oid, 'INSERT')
                     or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'UPDATE'))) then
    raise exception 'app_worker can write app.publish_intents; the intent is the user''s act and its cancellation is a person''s verb';
  end if;

  -- 9. THE WORKER HOLDS GRANTS AND NO POLICY, on all five (010's shape, RFC-2026-022 §5/8), and no
  --    policy names anon, app_command, app_maintenance or app_authz. Every policy this batch writes is
  --    TO authenticated; batch 122's closures are TO PUBLIC and are asserted by 122.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (publisher_tables)
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('app_worker', 'anon', 'app_command', 'app_maintenance', 'app_authz'));
  if offending is not null then
    raise exception 'a batch 120 policy names a role that must hold none here: %', offending
      using hint = 'RFC-2026-022 is approved and NOT IN EFFECT (§5/8): a service policy is not written until §7 holds. anon holds nothing (RFC-2026-021 §7/4); app_authz is pinned (RFC-2026-020 §6.1/6).';
  end if;
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (publisher_tables)
     and pol.polroles <> array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]::oid[];
  if offending is not null then
    raise exception 'a batch 120 policy is not TO authenticated alone: %', offending
      using hint = '§8.5: "Policy ระบุ TO authenticated". A closure TO PUBLIC belongs to batch 122, which applies after this block has run.';
  end if;
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (service_written)
     and not (pg_catalog.has_any_column_privilege('app_worker', c.oid, 'SELECT')
              and pg_catalog.has_any_column_privilege('app_worker', c.oid, 'INSERT'));
  if offending is not null then
    raise exception 'app_worker lacks the SELECT or INSERT grant on %, so its refusal there would be a missing GRANT rather than row level security (010''s reason)', offending;
  end if;

  -- 10. anon, app_command, app_maintenance and app_authz hold nothing on any of the five.
  select string_agg(format('%s to %s', c.relname, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname::text = any (publisher_tables)
     and r.rolname in ('anon', 'app_command', 'app_maintenance', 'app_authz')
     and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'a role batch 120 grants nothing holds a privilege: %', offending;
  end if;

  -- 11. THE CLIENT DOES NOT READ WHAT §9.1 WITHHOLDS: the post's hash, the job's provider key, error
  --     code and kernel job id.
  select string_agg(format('%s.%s to %s', c.relname, col, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
    cross join unnest(array['external_post_hash', 'provider_request_key', 'last_error_code', 'kernel_job_id']) as col
   where n.nspname = 'app'
     and ((c.relname = 'published_posts' and col = 'external_post_hash')
          or (c.relname = 'publish_jobs' and col in ('provider_request_key', 'last_error_code', 'kernel_job_id')))
     and r.rolname::text = any (client_roles)
     and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'SELECT');
  if offending is not null then
    raise exception 'a client role can read a PROVIDER-3 column §9.1 keeps to a safe projection: %', offending;
  end if;

  -- 12. FIVE RESTRICTIVE NARROWINGS, one per table, each half resolving through app.content_items --
  --     and, on the four children, through app.publish_intents -- so a child's reach is its intent's
  --     item's reach (070's, 080's and 081's child rule).
  count_of := 0;
  for probe in
    select c.relname as target,
           pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)      as using_half,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname::text = any (publisher_tables)
       and not pol.polpermissive
       -- FOR ALL ONLY, and the qualifier is a measurement rather than a precaution: this batch writes
       -- THREE restrictive policies on app.publish_intents, and two of them are batch 094's and 102's
       -- shape -- RESTRICTIVE FOR INSERT, which has no USING half at all, so pg_get_expr(polqual) is
       -- NULL for them. Without this term the first live apply reported "the publish_intents
       -- narrowing does not resolve through the intent's item" against a policy that is not the
       -- narrowing, which is a guard failing for the wrong reason.
       and pol.polcmd = '*'
  loop
    count_of := count_of + 1;
    foreach narrowing in array array[probe.using_half, probe.check_half] loop
      if narrowing is null
         or position('content_items' in narrowing) = 0
         or position('member_scope_admits_business' in narrowing) = 0
         or position('member_scope_admits_page' in narrowing) = 0
         or (probe.target <> 'publish_intents' and position('publish_intents' in narrowing) = 0) then
        raise exception 'the % narrowing does not resolve through the intent''s item and ask both scope questions: %',
          probe.target, coalesce(narrowing, '<an empty half of the restrictive policy>');
      end if;
    end loop;
  end loop;
  if count_of <> 5 then
    raise exception 'batch 120 finds % restrictive policies and writes five, one narrowing per table', count_of;
  end if;

  -- 13. THE TRIGGER, on the three tables that grant updated_at (093's general rule).
  select count(*) into count_of
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_proc p on p.oid = t.tgfoid
    join pg_catalog.pg_namespace fn on fn.oid = p.pronamespace
   where n.nspname = 'app'
     and c.relname in ('publish_intents', 'publish_targets', 'publish_jobs')
     and not t.tgisinternal and t.tgname = 'set_updated_at'
     and fn.nspname = 'private' and p.proname = 'set_updated_at';
  if count_of <> 3 then
    raise exception 'batch 120 finds % set_updated_at trigger(s) on its three mutable tables and attaches three', count_of;
  end if;

  -- 14. OWNERSHIP. RFC-2026-017 §3 keeps app_command off the owner seat so a policy can name it and
  --     bind it; RFC-2026-020 §5/2 says app_authz owns no table.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (publisher_tables)
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 120 creates is owned by a role that must not own one: %', offending;
  end if;

  -- 15. THE CHECK PROBES. Four inserts a CHECK refuses before any key is consulted, in a
  --     subtransaction that always aborts (140's shape). Each demands its own SQLSTATE and its own
  --     constraint name; a probe that was refused for another reason is a failure, never a skip.
  begin
    begin
      insert into app.publish_intents (workspace_id, business_profile_id, content_item_id, content_version_id,
                                       requested_by, request_kind, idempotency_key)
      values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
              gen_random_uuid(), 'later', 'batch-120-probe');
      probe_seen := probe_seen || 'intent kind: accepted';
    exception when others then
      get stacked diagnostics probe_sqlstate = returned_sqlstate, offending = constraint_name;
      probe_seen := probe_seen || format('intent kind: %s %s', probe_sqlstate, offending);
    end;
    begin
      insert into app.publish_intents (workspace_id, business_profile_id, content_item_id, content_version_id,
                                       requested_by, request_kind, idempotency_key)
      values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
              gen_random_uuid(), 'now', '   ');
      probe_seen := probe_seen || 'intent key: accepted';
    exception when others then
      get stacked diagnostics probe_sqlstate = returned_sqlstate, offending = constraint_name;
      probe_seen := probe_seen || format('intent key: %s %s', probe_sqlstate, offending);
    end;
    begin
      insert into app.publish_targets (workspace_id, business_profile_id, publish_intent_id, content_target_id,
                                       social_account_id, content_variant_id, status)
      values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
              gen_random_uuid(), gen_random_uuid(), 'cancelled');
      probe_seen := probe_seen || 'target status: accepted';
    exception when others then
      get stacked diagnostics probe_sqlstate = returned_sqlstate, offending = constraint_name;
      probe_seen := probe_seen || format('target status: %s %s', probe_sqlstate, offending);
    end;
    begin
      insert into app.published_posts (workspace_id, business_profile_id, publish_target_id, social_account_id,
                                       platform, external_post_hash, published_at)
      values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
              'facebook', '\x00'::bytea, now());
      probe_seen := probe_seen || 'post hash: accepted';
    exception when others then
      get stacked diagnostics probe_sqlstate = returned_sqlstate, offending = constraint_name;
      probe_seen := probe_seen || format('post hash: %s %s', probe_sqlstate, offending);
    end;
    -- A1-120 F1: the one PROVIDER-3 column a client reads. The value probed is what a careless
    -- worker would actually write -- a provider's sentence with an external id inside it -- and the
    -- point of the probe is that the CONSTRAINT refuses it rather than a comment asking nobody to.
    begin
      insert into app.publish_targets (workspace_id, business_profile_id, publish_intent_id, content_target_id,
                                       social_account_id, content_variant_id, status, failed_at, failure_class)
      values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
              gen_random_uuid(), gen_random_uuid(), 'failed', now(),
              'Graph API error: (#100) the post 17841400000000000 could not be created');
      probe_seen := probe_seen || 'failure class: accepted';
    exception when others then
      get stacked diagnostics probe_sqlstate = returned_sqlstate, offending = constraint_name;
      probe_seen := probe_seen || format('failure class: %s %s', probe_sqlstate, offending);
    end;
    raise exception 'batch 120 check probes complete' using errcode = 'ZZ121';
  exception when sqlstate 'ZZ121' then
    -- The subtransaction is rolled back with everything the probes did. PL/pgSQL variables are not
    -- rolled back with it, which is what carries the findings out.
    null;
  end;
  if not ('intent kind: 23514 publish_intents_request_kind_known' = any (probe_seen)) then
    raise exception 'the request_kind probe was not refused by publish_intents_request_kind_known with 23514: %', array_to_string(probe_seen, '; ');
  end if;
  if not ('intent key: 23514 publish_intents_idempotency_key_bounded' = any (probe_seen)) then
    raise exception 'the blank idempotency key probe was not refused by publish_intents_idempotency_key_bounded with 23514: %', array_to_string(probe_seen, '; ');
  end if;
  if not ('target status: 23514 publish_targets_status_known' = any (probe_seen)) then
    raise exception 'the target status probe was not refused by publish_targets_status_known with 23514 -- `cancelled` must not be a target state: %', array_to_string(probe_seen, '; ');
  end if;
  if not ('post hash: 23514 published_posts_external_hash_is_sha256' = any (probe_seen)) then
    raise exception 'the post hash probe was not refused by published_posts_external_hash_is_sha256 with 23514: %', array_to_string(probe_seen, '; ');
  end if;
  if not ('failure class: 23514 publish_targets_failure_class_is_a_code' = any (probe_seen)) then
    raise exception 'a provider message carrying an external post id was not refused by publish_targets_failure_class_is_a_code with 23514: %', array_to_string(probe_seen, '; ')
      using hint = 'This column is PROVIDER-3 and is the only one of its class a client may read. A not-blank check admits the sentence this probe writes, and §9.2 forbids a provider message reaching a client surface at all.';
  end if;
end $$;
