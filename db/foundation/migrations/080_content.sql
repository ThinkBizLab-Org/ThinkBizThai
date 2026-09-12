-- ============================================================================================
-- Batch 080 — content.core: the idea, the item, and the three things that may never change
-- ============================================================================================
--
-- Owner: A3 Content. Depends on 040 (knowledge), 050 (jobs), 060 (AI gateway), 070 (research).
-- §6's migration ownership registry gives this batch five words — "content
-- ideas/items/versions/variants/quality" — and a Deliverable reading "immutable content lineage".
--
-- FIVE TABLES, NOT SIX, AND THE DIFFERENCE IS THE REGISTRY RATHER THAN THE INVENTORY. §5 lists the
-- family as "ideas/items/versions/variants/quality/targets"; §6's registry splits it and gives
-- `content_targets` to batch 081 ("content target placeholder/reference contract … deferred Social
-- FK prepared"). Batch 021 refused to create `workspace_member_scope_versions` because "creating
-- one would be reserving a table no registry row gives this batch", and batch 060 refused
-- `generation_runs` on the same ground. This batch creates no target table for the same reason, and
-- says so here rather than leaving a reader to wonder whether it was forgotten.
--
-- ============================================================================================
-- §8.2 GIVES CONTENT THREE ROWS AND THE THIRD IS THE HARDEST IN THE MATRIX
-- ============================================================================================
--
--   | Content SELECT                             | Y | Y | Y | Y | Y | P |
--   | Content create/edit/version                | Y | Y | Y | N | N | P |
--   | Approved/published version UPDATE/DELETE   | N | N | N | N | N | N |
--
-- The third row is `N` in EVERY column including Service, which no other row in §8 is. Compare
-- §8.2's own research rows, where "Research run/source/evidence INSERT" is `S` — service only. A
-- row that is `N` for the service too cannot be performed by any identity this repository has or
-- plans, and the way to implement it is not a policy that refuses but the ABSENCE of a grant and
-- the absence of a policy, asserted both ways. That is what batch 070 did for
-- `app.research_evidence` and it is what the three immutable tables here do.
--
-- CONTENT HAS NO `S` CELL AT ALL, so this batch classifies NOTHING in
-- db/foundation/lint/service-policy-map.json. Batch 132 reached the same conclusion for a different
-- reason (§8 has no row for an entitlement resolution) and declined a service policy batch 130
-- expected of it. Service is `P` here — "ผ่านตาม policy/explicit capability" — and a `P` with no
-- capability defined is not an `S`: inventing a service policy for it would be a claim about the
-- access matrix made in a migration.
--
-- ============================================================================================
-- WHAT THIS BATCH REFUSES TO INVENT, AND WHAT IT IS ENTITLED TO STATE
-- ============================================================================================
--
-- §4.6 names three status-like columns and supplies a vocabulary for exactly one:
--
--   * `content_items.status` — "draft|in_review|approved|scheduled|publishing|published|archived".
--     Seven values, given. It gets a CHECK.
--   * `content_items.content_type` — "post|carousel|reel". Given. It gets a CHECK.
--   * `content_versions.source` — "generated|manual|revision". Given. It gets a CHECK.
--   * `content_variants.platform` — "facebook|instagram". Given. It gets a CHECK.
--   * `quality_reviews.status` — "pass|warn|block|error". Given. It gets a CHECK.
--   * `quality_reviews.reviewer_type` — "ai|human|system". Given. It gets a CHECK.
--
--   * `content_ideas.status` — NO VOCABULARY ANYWHERE. Named as a column and never enumerated.
--   * `content_items.approval_state` — NO VOCABULARY. §4.7 gives `approval_requests.status` a
--     vocabulary, and that is a different column on a table batch 090 owns.
--   * `content_variants.variant_type` — NO VOCABULARY.
--
-- Batch 070 refused to encode a status vocabulary nobody had decided and used timestamps where the
-- lifecycle followed from the columns instead. This batch takes the narrower route available to it:
-- the three unenumerated columns EXIST, because §4.6 names them and a later batch adding a column
-- to an immutable table is worse than a column with no CHECK, and each is left free-form with the
-- gap recorded in the work package's open blockers. A CHECK invented here would be this batch
-- choosing a vocabulary for Product, which is the ownership irregularity WP-0A-CON-006 records as
-- High against CTR-NTF-001.
--
-- ============================================================================================
-- THREE REFERENCES THIS BATCH CANNOT ENFORCE, EACH FOR A DIFFERENT REASON
-- ============================================================================================
--
-- 1. `content_versions.generation_run_id` and `quality_reviews.generation_run_id` carry NO foreign
--    key. `app.generation_runs` does not exist and is assigned to no batch in §6's 000..180
--    registry — batch 060 records that in its own header. The Product Owner disposed the question
--    on 2026-09-10: keep the columns as references with no foreign key
--    (evidence/WP-0A-DB-00/product-owner-disposition-generation-run.md, option ก). What that costs
--    is written there and not smoothed over here: nothing enforces the reference until a command
--    function exists, and `content_versions` is immutable, so the column cannot be tightened later
--    without a forward migration.
--
-- 2. `content_ideas.research_suggestion_id` carries a foreign key on `id` ALONE, not over the scope
--    path, and that is weaker than every other cross-family reference in this schema. Every child
--    in batch 070 reaches its parent with a composite key — `foreign key (workspace_id,
--    business_profile_id, research_run_id) references app.research_runs (workspace_id,
--    business_profile_id, id)` — which is what makes a child's own Workspace and Business the ones
--    its parent actually has (§4 invariant 10). `app.research_suggestions` exposes no such key:
--    measured on the provisioned schema, its only unique constraint is `PRIMARY KEY (id)`. A
--    scope-path foreign key into it is therefore impossible, and adding the composite unique it
--    would need is a change to a table batch 070 owns, which ownership forbids this batch from
--    making. So the reference guarantees the suggestion EXISTS and does not guarantee it belongs to
--    the citing tenant. Row level security still prevents reading it; what is unprotected is a
--    dangling cross-tenant citation, and the fix is a unique constraint owed to 070's owner. In the
--    work package's open blockers.
--
-- 3. `content_items.current_version_id` DOES carry a scope-path foreign key, and the cycle people
--    expect here is not one. `content_versions` references `content_items`, so a key in the other
--    direction looks circular — but the column is NULLABLE, so the insert order is item (null),
--    then version, then update the item. No deferral is needed and none is used; this repository has
--    no deferrable constraint anywhere and this batch does not introduce the first one.
--
-- ============================================================================================
-- IMMUTABILITY, AS ABSENT GRANTS AND ABSENT POLICIES RATHER THAN AS A REFUSING POLICY
-- ============================================================================================
--
-- `content_versions`, `content_variants` and `quality_reviews` are the "current + immutable
-- versions" half of §5's mutability column and the subject of §8.2's third row. They receive:
--
--   * a SELECT grant, column-scoped, and a SELECT policy — §8.2 row 1 is `Y` for all five roles;
--   * NO update grant, NO delete grant, NO update policy, NO delete policy, NO insert policy.
--
-- The absence of the INSERT policy is deliberate and is the same shape batch 070 gave
-- `app.research_evidence`: §8.2 row 2 ("create/edit/version") is `Y` for owner, admin and editor,
-- and a version is created by the act that generates it rather than by a client typing one. With
-- forced row level security and no INSERT policy, no client can write a row here at all. When a
-- command function exists — RFC-2026-021 §10 records that none does — it will insert as its owner
-- and be exempt from these policies, which is what RFC-2026-017 §3 arranges by keeping
-- `app_command` off the table-owner role.
--
-- A grant that was never made has to be written to be undone; a policy predicate can be widened by
-- an edit. That asymmetry is why immutability here is a missing grant and not a `using (false)`.
--
-- ============================================================================================
-- `content_items.status` IS A `Y` CELL THIS BATCH IMPLEMENTS IN HALF, AND THE HALF IS NAMED
-- ============================================================================================
--
-- §4.6 says of `content_items`: "state change ผ่าน domain command; ห้าม client update status
-- อิสระ". §8.2 marks "Content create/edit/version" `Y` for owner, admin and editor. Both are true
-- and they do not describe the same act: editing a title is a client UPDATE, moving `draft` to
-- `approved` is a command's act. This batch grants UPDATE on the editable columns and NOT on
-- `status`, so a client can rename a draft and cannot approve one. The `Y` cell is therefore half
-- implemented, and the missing half needs a command function that does not exist.
--
-- That is the same shape §8.2's "Start/cancel Research" had in batch 070, which the Product Owner
-- accepted on 2026-09-10 (evidence/WP-0A-DB-00/product-owner-disposition-batch-070.md, question 1).
-- This batch cites that disposition rather than re-asking it.
--
-- ============================================================================================
-- RETENTION AND SENSITIVITY
-- ============================================================================================
--
-- §5 gives the family CONTENT-2 and CONTENT-HISTORY. No number appears in this file: §10 owns the
-- window, batch 160 owns the sweep, and §15 requires Product, Security and Legal approval before
-- Paid Beta. What this batch provides is the columns a sweep would read — `created_at` on every
-- table, `deleted_at` on `content_items` — and an index over each, so the breach is DETECTABLE by a
-- query anyone can run even though preventing it is not this batch's job. That is batch 061's
-- watermark pattern in a different family.

-- ============================================================================================
-- app.content_ideas — MUTABLE. §8.2 row 2's client-writable end of the family.
-- ============================================================================================
create table if not exists app.content_ideas (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  -- §4 invariant 3's nullable Page override, over the whole scope path. Identical in shape to
  -- batch 070's runs, because §3.3 defines the override once for Knowledge, Research and Content.
  page_context_profile_id  uuid,
  -- The reference §4.6 names. Foreign key on `id` alone; see "THREE REFERENCES" above for why a
  -- scope-path key is impossible and what is owed to 070's owner.
  research_suggestion_id   uuid,
  goal                     text        not null,
  topic                    text        not null,
  brief                    jsonb       not null default '{}'::jsonb,
  -- No CHECK. §4.6 names the column and enumerates nothing; see "WHAT THIS BATCH REFUSES TO
  -- INVENT" above.
  status                   text,
  -- §4.6: "unique idempotency ต่อ workspace". The client's own request id, so a retried create
  -- does not produce a second idea.
  client_request_id        text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  updated_by               uuid,
  constraint content_ideas_goal_not_blank check (length(btrim(goal)) > 0),
  constraint content_ideas_topic_not_blank check (length(btrim(topic)) > 0),
  constraint content_ideas_brief_is_object check (jsonb_typeof(brief) = 'object'),
  constraint content_ideas_client_request_id_not_blank
    check (client_request_id is null or length(btrim(client_request_id)) > 0),
  constraint content_ideas_business_scope_fk
    foreign key (workspace_id, business_profile_id)
    references app.business_profiles (workspace_id, id),
  constraint content_ideas_page_scope_fk
    foreign key (workspace_id, business_profile_id, page_context_profile_id)
    references app.page_context_profiles (workspace_id, business_profile_id, id),
  constraint content_ideas_research_suggestion_fk
    foreign key (research_suggestion_id) references app.research_suggestions (id),
  constraint content_ideas_scope_key unique (workspace_id, business_profile_id, id)
);

-- §4.6's "unique idempotency ต่อ workspace", as a partial index so that a null request id is not a
-- collision. A unique CONSTRAINT cannot be partial, which is why this is an index.
create unique index if not exists content_ideas_client_request_idempotency
  on app.content_ideas (workspace_id, client_request_id)
  where client_request_id is not null;

create index if not exists content_ideas_created_at_idx on app.content_ideas (created_at);

comment on table app.content_ideas is
  'Owner: A3 Content (content.core, batch 080). Scope workspace_id and business_profile_id with '
  'page_context_profile_id as §4 invariant 3''s nullable override. Sensitivity CONTENT-2; retention '
  'CONTENT-HISTORY, whose window is NOT encoded here (§10 owns the number, batch 160 the sweep). '
  'research_suggestion_id references app.research_suggestions on id ALONE because that table '
  'exposes no composite scope key; a dangling cross-tenant citation is possible and the unique '
  'constraint that would prevent it is owed to batch 070''s owner. status carries no CHECK because '
  '§4.6 enumerates no vocabulary for it.';

-- ============================================================================================
-- app.content_items — MUTABLE, and the one table whose status a client may not move.
-- ============================================================================================
create table if not exists app.content_items (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  page_context_profile_id  uuid,
  title                    text        not null,
  -- §4.6 enumerates these three.
  content_type             text        not null,
  -- §4.6 enumerates these seven. The column is client-READABLE and not client-WRITABLE: see the
  -- grants below and the header section on the half-implemented `Y` cell.
  status                   text        not null default 'draft',
  -- Nullable, and the foreign key runs the "wrong" way on purpose. See "THREE REFERENCES" above:
  -- the cycle is avoided by the column being nullable rather than by deferring the constraint.
  current_version_id       uuid,
  -- No CHECK. §4.6 names the column and enumerates nothing.
  approval_state           text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  updated_by               uuid,
  -- §5's mutability for this table is "current + immutable versions": the ITEM is mutable and
  -- soft-deletable; its versions are not. batch 160's sweep reads this column.
  deleted_at               timestamptz,
  constraint content_items_title_not_blank check (length(btrim(title)) > 0),
  constraint content_items_content_type_known
    check (content_type in ('post', 'carousel', 'reel')),
  constraint content_items_status_known
    check (status in ('draft', 'in_review', 'approved', 'scheduled', 'publishing', 'published',
                      'archived')),
  constraint content_items_business_scope_fk
    foreign key (workspace_id, business_profile_id)
    references app.business_profiles (workspace_id, id),
  constraint content_items_page_scope_fk
    foreign key (workspace_id, business_profile_id, page_context_profile_id)
    references app.page_context_profiles (workspace_id, business_profile_id, id),
  constraint content_items_scope_key unique (workspace_id, business_profile_id, id)
);

create index if not exists content_items_created_at_idx on app.content_items (created_at);
-- The column batch 160's retention sweep reads, indexed so that "this repository is holding
-- soft-deleted content past its own stated limit" is a query anyone can run.
create index if not exists content_items_deleted_at_idx on app.content_items (deleted_at)
  where deleted_at is not null;

comment on table app.content_items is
  'Owner: A3 Content (content.core, batch 080). status carries §4.6''s seven values as a CHECK and '
  'is deliberately OUTSIDE every client UPDATE grant: §4.6 requires state change through a domain '
  'command and §8.2 marks create/edit/version Y for owner/admin/editor, which are different acts. '
  'The Y cell is half implemented and the missing half needs a command function that does not '
  'exist (RFC-2026-021 §10). approval_state carries no CHECK because §4.6 enumerates no vocabulary. '
  'current_version_id is nullable and carries a scope-path foreign key into content_versions; the '
  'apparent cycle is resolved by insert order rather than by a deferrable constraint.';

-- ============================================================================================
-- app.content_versions — IMMUTABLE. §8.2 row 3 is `N` for every column including Service.
-- ============================================================================================
create table if not exists app.content_versions (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  content_item_id          uuid        not null,
  version_no               integer     not null,
  body                     text        not null,
  structured_content       jsonb       not null default '{}'::jsonb,
  -- §4.6 enumerates these three.
  source                   text        not null,
  parent_version_id        uuid,
  -- NO foreign key. app.generation_runs does not exist and no batch in §6's registry owns it;
  -- disposed 2026-09-10 as option ก. See "THREE REFERENCES" above.
  generation_run_id        uuid,
  brief_snapshot           jsonb       not null default '{}'::jsonb,
  knowledge_snapshot_refs  jsonb       not null default '[]'::jsonb,
  created_at               timestamptz not null default now(),
  created_by               uuid,
  constraint content_versions_body_not_blank check (length(btrim(body)) > 0),
  constraint content_versions_version_no_positive check (version_no >= 1),
  constraint content_versions_source_known
    check (source in ('generated', 'manual', 'revision')),
  constraint content_versions_structured_is_object
    check (jsonb_typeof(structured_content) = 'object'),
  constraint content_versions_brief_snapshot_is_object
    check (jsonb_typeof(brief_snapshot) = 'object'),
  constraint content_versions_knowledge_refs_is_array
    check (jsonb_typeof(knowledge_snapshot_refs) = 'array'),
  -- A revision has a parent and a first version does not. This follows from the two columns rather
  -- than from a vocabulary somebody would have to choose, which is the only kind of lifecycle rule
  -- batch 070 held itself entitled to state.
  constraint content_versions_revision_has_parent
    check ((source = 'revision') = (parent_version_id is not null)),
  constraint content_versions_item_scope_fk
    foreign key (workspace_id, business_profile_id, content_item_id)
    references app.content_items (workspace_id, business_profile_id, id),
  -- A parent version is a version of the SAME item in the same tenant. The scope path here carries
  -- the item as well, which is what stops a revision claiming a parent from another item.
  constraint content_versions_parent_scope_fk
    foreign key (workspace_id, business_profile_id, content_item_id, parent_version_id)
    references app.content_versions
      (workspace_id, business_profile_id, content_item_id, id),
  -- §4.6: "unique item/version".
  constraint content_versions_item_version_key
    unique (workspace_id, business_profile_id, content_item_id, version_no),
  -- The target of the parent key above, and of every child's scope path.
  constraint content_versions_item_scope_id_key
    unique (workspace_id, business_profile_id, content_item_id, id),
  constraint content_versions_scope_key unique (workspace_id, business_profile_id, id)
);

create index if not exists content_versions_created_at_idx on app.content_versions (created_at);

comment on table app.content_versions is
  'Owner: A3 Content (content.core, batch 080). IMMUTABLE: §8.2''s "Approved/published version '
  'UPDATE/DELETE" is N for owner, admin, editor, approver, viewer AND service, which no other row '
  'in §8 is. Implemented as absent grants and absent policies for insert, update and delete rather '
  'than as a refusing predicate, because a grant never made must be written to be undone while a '
  'policy can be widened by an edit. generation_run_id carries NO foreign key: app.generation_runs '
  'is unassigned in §6''s registry and the Product Owner disposed the question as option ก on '
  '2026-09-10.';

-- ============================================================================================
-- app.content_variants — IMMUTABLE, one per platform per version.
-- ============================================================================================
create table if not exists app.content_variants (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  content_version_id       uuid        not null,
  -- §4.6 enumerates these two. Batch 110 owns the Meta side; this is the platform LABEL and not a
  -- connection, so no reference into that family is created or implied here.
  platform                 text        not null,
  -- No CHECK. §4.6 names the column and enumerates nothing.
  variant_type             text,
  body                     text        not null,
  metadata                 jsonb       not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  created_by               uuid,
  constraint content_variants_body_not_blank check (length(btrim(body)) > 0),
  constraint content_variants_platform_known
    check (platform in ('facebook', 'instagram')),
  constraint content_variants_metadata_is_object
    check (jsonb_typeof(metadata) = 'object'),
  constraint content_variants_version_scope_fk
    foreign key (workspace_id, business_profile_id, content_version_id)
    references app.content_versions (workspace_id, business_profile_id, id),
  -- §4.6: "unique logical variant key ต่อ content version/platform". `variant_type` is part of the
  -- key because §4.6 names it beside the platform, and it is NULLABLE, which is the whole reason
  -- this constraint carries two words no other unique constraint in this schema carries.
  --
  -- `NULLS NOT DISTINCT` IS THE DIFFERENCE BETWEEN THE RULE AND A COMMENT ABOUT IT. Postgres
  -- defaults to NULLS DISTINCT: under the default, two rows whose `variant_type` is null do NOT
  -- collide, so "one untyped variant per platform" would be a sentence in a header while the
  -- table accepted a hundred. Declared this way the null participates in the key, one untyped
  -- variant per (version, platform) is legal and a second is refused by the database. The
  -- apply-time block below asserts the flag from `pg_index`, because the two spellings differ by
  -- three words and produce tables that behave differently.
  constraint content_variants_logical_key
    unique nulls not distinct
      (workspace_id, business_profile_id, content_version_id, platform, variant_type),
  constraint content_variants_scope_key unique (workspace_id, business_profile_id, id)
);

create index if not exists content_variants_created_at_idx on app.content_variants (created_at);

comment on table app.content_variants is
  'Owner: A3 Content (content.core, batch 080). IMMUTABLE for the same §8.2 row 3 reason as '
  'content_versions, and implemented the same way. platform carries §4.6''s two values as a CHECK; '
  'variant_type carries no CHECK because §4.6 enumerates none. The unique logical key spans '
  '(version, platform, variant_type) and is declared NULLS NOT DISTINCT, so exactly one untyped '
  'variant per platform is legal; under the Postgres default the null would not participate in '
  'the key and the rule would hold for nobody. The apply-time block asserts the flag.';

-- ============================================================================================
-- app.quality_reviews — IMMUTABLE. §4.6 requires a stable rule code and a Thai message per finding.
-- ============================================================================================
create table if not exists app.quality_reviews (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  content_version_id       uuid        not null,
  rule_set_version         text        not null,
  -- §4.6 enumerates these four.
  status                   text        not null,
  score_dimensions         jsonb       not null default '{}'::jsonb,
  findings                 jsonb       not null default '[]'::jsonb,
  -- §4.6 enumerates these three.
  reviewer_type            text        not null,
  -- NO foreign key, for the same reason as content_versions.
  generation_run_id        uuid,
  created_at               timestamptz not null default now(),
  constraint quality_reviews_rule_set_version_not_blank
    check (length(btrim(rule_set_version)) > 0),
  constraint quality_reviews_status_known
    check (status in ('pass', 'warn', 'block', 'error')),
  constraint quality_reviews_reviewer_type_known
    check (reviewer_type in ('ai', 'human', 'system')),
  constraint quality_reviews_score_dimensions_is_object
    check (jsonb_typeof(score_dimensions) = 'object'),
  constraint quality_reviews_findings_is_array
    check (jsonb_typeof(findings) = 'array'),
  -- §4.6: "finding ต้องมี stable rule code และ user-facing Thai message". What a CHECK can hold is
  -- the SHAPE — every element an object carrying a non-empty string `rule_code` and a non-empty
  -- string `message_th`. Written as jsonpath rather than as `not exists (select ...)`, which
  -- Postgres refuses in a CHECK with 0A000; the first version of this file tried it and the
  -- migration would not apply.
  --
  -- WHAT IT DOES NOT HOLD, and a reader should not be left to assume otherwise: that `message_th`
  -- is in Thai, that `rule_code` is STABLE across rule-set versions, and that a
  -- whitespace-only string is rejected — jsonpath has no trim. The first two are owed to whoever
  -- owns the rule set; the third is a real gap in this constraint and is named in the work
  -- package's open blockers rather than papered over.
  constraint quality_reviews_findings_carry_code_and_message
    check (
      not (findings @? '$[*] ? (@.type() != "object")')
      and not (findings @? '$[*] ? (!exists(@.rule_code) || @.rule_code.type() != "string" || @.rule_code == "")')
      and not (findings @? '$[*] ? (!exists(@.message_th) || @.message_th.type() != "string" || @.message_th == "")')
    ),
  constraint quality_reviews_version_scope_fk
    foreign key (workspace_id, business_profile_id, content_version_id)
    references app.content_versions (workspace_id, business_profile_id, id),
  constraint quality_reviews_scope_key unique (workspace_id, business_profile_id, id)
);

create index if not exists quality_reviews_created_at_idx on app.quality_reviews (created_at);

comment on table app.quality_reviews is
  'Owner: A3 Content (content.core, batch 080). IMMUTABLE for the same §8.2 row 3 reason as '
  'content_versions. The findings CHECK holds the SHAPE §4.6 asks for — every element an object '
  'with a non-empty string rule_code and message_th — and cannot hold that the message is '
  'Thai, that the code is stable across rule-set versions, or that a whitespace-only string is '
  'rejected (jsonpath has no trim); all three are owed elsewhere and are in the open blockers. '
  'owner. generation_run_id carries no foreign key for the same reason as content_versions.';

-- ============================================================================================
-- ROW LEVEL SECURITY — ENABLE and FORCE on all five, per RFC-2026-016 §2 as amended
-- ============================================================================================
--
-- FORCE as well as ENABLE, because ENABLE alone exempts the table OWNER and the owner is the role
-- migrations run as. The schema lint refuses ENABLE without FORCE and that rule exists because the
-- specified lint would have passed it.
alter table app.content_ideas    enable row level security;
alter table app.content_ideas    force  row level security;

alter table app.content_items    enable row level security;
alter table app.content_items    force  row level security;

alter table app.content_versions enable row level security;
alter table app.content_versions force  row level security;

alter table app.content_variants enable row level security;
alter table app.content_variants force  row level security;

alter table app.quality_reviews  enable row level security;
alter table app.quality_reviews  force  row level security;

-- ============================================================================================
-- GRANTS — column-scoped, and the columns that are ABSENT are the control
-- ============================================================================================
--
-- RFC-2026-021 M3's measurement is why these are column-scoped rather than table-wide: a
-- column-scoped grant makes column drift loud, because a new column is not granted until somebody
-- writes it into a diff.
--
-- `anon` is granted nothing anywhere in `app` (RFC-2026-021, decided rather than deferred), so it
-- appears nowhere below.

-- content_ideas: readable and writable by the client. `created_by` is set on insert and is not in
-- the UPDATE list, so an idea cannot change hands.
grant select (id, workspace_id, business_profile_id, page_context_profile_id,
              research_suggestion_id, goal, topic, brief, status, client_request_id,
              created_at, updated_at, created_by, updated_by)
  on app.content_ideas to authenticated;
grant insert (workspace_id, business_profile_id, page_context_profile_id,
              research_suggestion_id, goal, topic, brief, status, client_request_id, created_by,
              updated_by)
  on app.content_ideas to authenticated;
grant update (goal, topic, brief, status, updated_at, updated_by)
  on app.content_ideas to authenticated;

-- content_items: readable in full, writable in part. `status` IS ABSENT FROM THE UPDATE GRANT and
-- that absence is §4.6's "ห้าม client update status อิสระ" expressed as a missing privilege rather
-- than as a policy predicate. `current_version_id` is absent for the same reason: which version is
-- current is the act of publishing one, not a field a client edits.
grant select (id, workspace_id, business_profile_id, page_context_profile_id, title, content_type,
              status, current_version_id, approval_state, created_at, updated_at, created_by,
              updated_by, deleted_at)
  on app.content_items to authenticated;
grant insert (workspace_id, business_profile_id, page_context_profile_id, title, content_type,
              created_by, updated_by)
  on app.content_items to authenticated;
grant update (title, updated_at, updated_by, deleted_at)
  on app.content_items to authenticated;

-- The three immutable tables: SELECT only. No insert, no update, no delete, to any role. §8.2 row
-- 3 is `N` for every column including Service, and a grant never made must be written to be
-- undone.
grant select (id, workspace_id, business_profile_id, content_item_id, version_no, body,
              structured_content, source, parent_version_id, generation_run_id, brief_snapshot,
              knowledge_snapshot_refs, created_at, created_by)
  on app.content_versions to authenticated;

grant select (id, workspace_id, business_profile_id, content_version_id, platform, variant_type,
              body, metadata, created_at, created_by)
  on app.content_variants to authenticated;

grant select (id, workspace_id, business_profile_id, content_version_id, rule_set_version, status,
              score_dimensions, findings, reviewer_type, generation_run_id, created_at)
  on app.quality_reviews to authenticated;

-- ============================================================================================
-- POLICIES — §8.2 row 1 as five SELECTs, row 2 as two write paths, row 3 as nothing at all
-- ============================================================================================
--
-- Every policy is `TO authenticated`. RFC-2026-016 §2 as amended on RFC-2026-022 carries service
-- policies only for cells the §8 matrix marks `S`, and content has none.

create policy content_ideas_select_active_member on app.content_ideas
  for select to authenticated
  using (app.is_active_member(workspace_id));

create policy content_ideas_insert_writer on app.content_ideas
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
  );

create policy content_ideas_update_writer on app.content_ideas
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor'))
  with check (
    -- §8.5: the writer names itself, and the policy checks the claim rather than trusting it.
    updated_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
  );

create policy content_items_select_active_member on app.content_items
  for select to authenticated
  using (app.is_active_member(workspace_id));

create policy content_items_insert_writer on app.content_items
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
  );

create policy content_items_update_writer on app.content_items
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor'))
  with check (
    updated_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
  );

-- The three immutable tables get a SELECT policy and NOTHING ELSE. With force row level security
-- and no INSERT, UPDATE or DELETE policy, no client can write here whatever it is granted — and it
-- is granted nothing either, which is the second half asserted below.
create policy content_versions_select_active_member on app.content_versions
  for select to authenticated
  using (app.is_active_member(workspace_id));

create policy content_variants_select_active_member on app.content_variants
  for select to authenticated
  using (app.is_active_member(workspace_id));

create policy quality_reviews_select_active_member on app.quality_reviews
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- ============================================================================================
-- RESTRICTIVE NARROWINGS — the member scope, asked once per row
-- ============================================================================================
--
-- A PERMISSIVE policy above says the caller is a member of the workspace. A RESTRICTIVE policy
-- here says the caller's SCOPE admits this row, and both must hold. Batch 021 created the scope
-- table and its helpers; batch 070 established this shape for a family with a nullable page.
--
-- The parents ask the question about their own two columns. The children ask whether their PARENT
-- is reachable, because a nullable copy of the parent's page could not be held equal to it under
-- MATCH SIMPLE, and an unenforceable copy of the column a narrowing turns on is worse than no copy
-- — which is the reasoning batch 070 recorded for research_sources and research_evidence.

create policy content_ideas_scope_narrowing on app.content_ideas
  as restrictive
  for all to authenticated
  using (
    case when page_context_profile_id is null
      then app.member_scope_admits_business(workspace_id, business_profile_id)
      else app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)
    end
  )
  with check (
    case when page_context_profile_id is null
      then app.member_scope_admits_business(workspace_id, business_profile_id)
      else app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)
    end
  );

create policy content_items_scope_narrowing on app.content_items
  as restrictive
  for all to authenticated
  using (
    case when page_context_profile_id is null
      then app.member_scope_admits_business(workspace_id, business_profile_id)
      else app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)
    end
  )
  with check (
    case when page_context_profile_id is null
      then app.member_scope_admits_business(workspace_id, business_profile_id)
      else app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)
    end
  );

-- BOTH HALVES ON ALL FIVE, INCLUDING THE THREE TABLES NO CLIENT MAY WRITE. A restrictive policy
-- has a USING half that filters reads and a WITH CHECK half that bounds writes, and on an immutable
-- table the second is inert today: there is no INSERT or UPDATE grant for it to bound. It is
-- written anyway, and the reason is the direction a mistake travels. If a later batch grants a
-- write here — a command path taking a shortcut, a `P` cell somebody decides to implement — a
-- narrowing with no WITH CHECK would admit that write for every active member of the workspace,
-- including one the ROW's own item is hidden from. Batch 070 wrote both halves on all four of its
-- narrowings for the same reason, and 040's probe is why this is stated rather than assumed: a
-- reversal that gutted one half while leaving the other intact went unnoticed by a test that
-- looked at one of them.
--
-- A version is reachable when its ITEM is. The item carries the page override; the version does
-- not copy it.
create policy content_versions_scope_narrowing on app.content_versions
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.content_items i
      where i.workspace_id = content_versions.workspace_id
        and i.business_profile_id = content_versions.business_profile_id
        and i.id = content_versions.content_item_id
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
      where i.workspace_id = content_versions.workspace_id
        and i.business_profile_id = content_versions.business_profile_id
        and i.id = content_versions.content_item_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  );

create policy content_variants_scope_narrowing on app.content_variants
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.content_versions v
      join app.content_items i
        on i.workspace_id = v.workspace_id
       and i.business_profile_id = v.business_profile_id
       and i.id = v.content_item_id
      where v.workspace_id = content_variants.workspace_id
        and v.business_profile_id = content_variants.business_profile_id
        and v.id = content_variants.content_version_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  )
  with check (
    exists (
      select 1 from app.content_versions v
      join app.content_items i
        on i.workspace_id = v.workspace_id
       and i.business_profile_id = v.business_profile_id
       and i.id = v.content_item_id
      where v.workspace_id = content_variants.workspace_id
        and v.business_profile_id = content_variants.business_profile_id
        and v.id = content_variants.content_version_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  );

create policy quality_reviews_scope_narrowing on app.quality_reviews
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.content_versions v
      join app.content_items i
        on i.workspace_id = v.workspace_id
       and i.business_profile_id = v.business_profile_id
       and i.id = v.content_item_id
      where v.workspace_id = quality_reviews.workspace_id
        and v.business_profile_id = quality_reviews.business_profile_id
        and v.id = quality_reviews.content_version_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  )
  with check (
    exists (
      select 1 from app.content_versions v
      join app.content_items i
        on i.workspace_id = v.workspace_id
       and i.business_profile_id = v.business_profile_id
       and i.id = v.content_item_id
      where v.workspace_id = quality_reviews.workspace_id
        and v.business_profile_id = quality_reviews.business_profile_id
        and v.id = quality_reviews.content_version_id
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
-- Two claims made above are claims about a live catalog and cannot be checked by reading this file:
-- that the three immutable tables are immutable as the PRIVILEGE SYSTEM holds them and not merely
-- as this file's grant list reads, and that one untyped variant per platform is legal where two are
-- not. Both are asserted here, because a header that says "asserted" and asserts nothing is the
-- overclaim this repository keeps removing from its own evidence.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only
-- by a superuser, and a migration needing one is a migration that cannot apply on the platform it
-- targets, where `postgres` is not a superuser.
do $$
declare
  offending text;
  count_of  integer;
  narrowing text;
  probe     record;
  every_role constant text[] :=
    array['authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz'];
  content_tables constant text[] :=
    array['content_ideas', 'content_items', 'content_versions', 'content_variants',
          'quality_reviews'];
  -- §8.2 row 3 — "Approved/published version UPDATE/DELETE | N N N N N | N" — the one row in §8
  -- that is `N` in every column including Service.
  immutable_tables constant text[] :=
    array['content_versions', 'content_variants', 'quality_reviews'];
begin
  -- ENABLE AND FORCE ON ALL FIVE. They are DIFFERENT CATALOG COLUMNS and the data package's own
  -- lint rule reads only the first (RFC-2026-016 §4). Without FORCE the table owner is exempt from
  -- every policy, and the owner is the role migrations run as.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending;
  end if;

  -- IMMUTABILITY AS THE PRIVILEGE SYSTEM HOLDS IT, which is the first half of the claim the header
  -- makes. Asserted against the live ACLs rather than against the grant list above, because a grant
  -- made by a LATER batch would not appear in this file at all — and because the control here is an
  -- ABSENCE, which is exactly the kind of thing a file cannot show about itself.
  --
  -- `has_any_column_privilege` for INSERT and UPDATE so a column-scoped grant is caught as well as a
  -- table-wide one (070's measured trap: a full set of column grants leaves `has_table_privilege`
  -- false); DELETE has no column-level form and is asked of the table.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname::text = any (immutable_tables)
         and r.rolname::text = any (every_role)
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
              or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'a version, variant or quality review can be written through a granted path: %', offending
      using hint = '§8.2 row 3 is `N` for owner, admin, editor, approver, viewer AND service, which '
                   'no other row in §8 is. The refusal is a grant that was never made rather than a '
                   'policy that says no, because a grant has to be WRITTEN to be undone while a '
                   'policy predicate can be widened by an edit.';
  end if;

  -- AND THE SAME CLAIM AS THE POLICY CATALOG HOLDS IT, which is the "both ways" the header promises.
  -- Either half alone can be satisfied while the other is wrong: a policy with no grant is inert,
  -- and a grant with no policy is refused by row level security rather than by privilege — a weaker
  -- refusal than immutability asks for. `a` is INSERT, `w` is UPDATE, `d` is DELETE; `*` is the
  -- restrictive FOR ALL narrowing and is deliberately not in this list.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (immutable_tables)
     and pol.polcmd in ('a', 'w', 'd');
  if offending is not null then
    raise exception 'an immutable content table carries an INSERT, UPDATE or DELETE policy: %', offending
      using hint = 'A write policy on one of these three would be this batch deciding that §8.2 row '
                   '3 has an exception. It does not: the version a client sees is the one the '
                   'generation produced, and the act that produces it is a command function that '
                   'does not exist yet (RFC-2026-021 §10).';
  end if;

  -- §4.6's "ห้าม client update status อิสระ" AND §8.5's rule against moving a row across tenant or
  -- scope with an update, PER COLUMN, against the live ACL. The two client UPDATE grants above name
  -- ten columns between them and this is what says so about the rest.
  --
  -- `status` is the column this batch is most often going to be read wrong on: §8.2 marks "Content
  -- create/edit/version" `Y` for three roles, so a reader expects a client to be able to move a
  -- draft to approved. It cannot, and the refusal is a missing privilege rather than a policy
  -- clause. `current_version_id` is beside it for the same reason: which version is CURRENT is the
  -- act of publishing one.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id',
                                'page_context_profile_id', 'content_type', 'status',
                                'current_version_id', 'created_by', 'created_at']) as col
       where n.nspname = 'app'
         and c.relname = 'content_items'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id',
                                'page_context_profile_id', 'research_suggestion_id',
                                'client_request_id', 'created_by', 'created_at']) as col
       where n.nspname = 'app'
         and c.relname = 'content_ideas'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity, scope, state or provenance column of a batch 080 table is updatable: %', offending
      using hint = '§4.6: "state change ผ่าน domain command; ห้าม client update status อิสระ". §8.5: '
                   'a row may not be moved across tenant OR scope by an update. '
                   '`client_request_id` is in this list because it is the idempotency key §4.6 asks '
                   'for, and a key a client can rewrite after the fact identifies nothing.';
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE FIVE. §8.5 has no broad user delete; `content_items` carries
  -- `deleted_at` for the soft delete it does have, and hard removal in this family is batch 160's
  -- retention sweep through app_maintenance, which this batch grants nothing.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname::text = any (content_tables)
         and r.rolname::text = any (every_role)
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a content row can be deleted through a granted path: %', offending;
  end if;

  -- app_worker HOLDS NOTHING HERE, AND THAT IS THIS BATCH'S ONE DEPARTURE FROM 070's SHAPE.
  -- Batch 070 grants its worker select, insert and update and lets row level security refuse it,
  -- which is the "grants and no policy" shape batch 010 introduced. Content does not, because the
  -- writer this family needs is not a worker with grants: §8.2 row 3 forbids a version being
  -- updated by anyone at all, and the act that CREATES one is a SECURITY DEFINER command function
  -- owned by `app_command`, which is exempt from these policies by being the owner rather than by
  -- holding a privilege (RFC-2026-017 §3). Granting app_worker a write here would be building the
  -- second path to the same act — the shape RFC-2026-018 was superseded for proposing.
  --
  -- The cost is stated rather than discovered: while no such function exists, NOTHING in this
  -- repository can write a content row, and the isolation suite's service cases are refused at the
  -- PRIVILEGE layer rather than by row level security, which is a different claim from batch 070's
  -- and is labelled as one in tests/db/identity/isolation-cases.mjs.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and (pg_catalog.has_any_column_privilege('app_worker', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('app_worker', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'app_worker holds a privilege on app.%, and batch 080 grants it none', offending;
  end if;

  -- `anon` holds nothing on anything this batch creates. RFC-2026-021 §7/4 decided that as a
  -- NEGATIVE, and it is the one client-role property no approved decision is expected to move.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on app.%, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- NO POLICY ON THESE FIVE NAMES ANY ROLE BUT `authenticated`, AND THE SERVICE HALF OF THAT IS A
  -- DECISION RATHER THAN AN OMISSION. RFC-2026-022 §3 carries a service policy for a cell the §8
  -- matrix marks `S`. Content has no `S` cell anywhere — its Service column is `P`, and a `P` with
  -- no capability defined is not an `S` — so db/foundation/lint/service-policy-map.json gets no
  -- entry from this batch and no policy here may name a service role. Batch 070 deliberately left
  -- app_worker OUT of its equivalent assertion because it expects a policy once RFC-2026-022 is in
  -- effect; this batch expects none, so the assertion is wider here for a stated reason.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('anon', 'app_worker', 'app_command', 'app_maintenance',
                                      'app_authz'));
  if offending is not null then
    raise exception 'batch 080 left a policy for a role that is not authenticated: %', offending;
  end if;

  -- ONE UNTYPED VARIANT PER PLATFORM IS LEGAL AND TWO ARE NOT, which is the second claim the header
  -- makes about a live catalog. `indnullsnotdistinct` is the flag that decides it, and the two
  -- spellings differ by three words: under the Postgres DEFAULT the null does not participate in
  -- the key and an unbounded number of untyped variants per platform is accepted, which is
  -- precisely the rule §4.6 asks for not holding.
  select count(*) into count_of
    from pg_catalog.pg_index ix
    join pg_catalog.pg_class ic on ic.oid = ix.indexrelid
    join pg_catalog.pg_class c  on c.oid = ix.indrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_variants'
     and ic.relname = 'content_variants_logical_key'
     and ix.indisunique
     and ix.indnullsnotdistinct;
  if count_of <> 1 then
    raise exception 'the content variant logical key does not treat a null variant_type as part of the key'
      using hint = '§4.6 asks for a "unique logical variant key ต่อ content version/platform". With '
                   'NULLS DISTINCT — the default — two untyped variants of one version on one '
                   'platform are both accepted and the key bounds nothing where it matters most.';
  end if;

  -- FIVE RESTRICTIVE NARROWINGS, ONE PER TABLE. `polpermissive` is the one catalog column that
  -- tells a narrowing from a widening: a PERMISSIVE policy with the same name and the same
  -- predicate would WIDEN each table instead of narrowing it, and §12.6/2 would silently stop being
  -- implemented here.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and not pol.polpermissive;
  if count_of <> 5 then
    raise exception 'batch 080 wrote % restrictive policies and it creates five tables to narrow', count_of;
  end if;

  -- AND THE ASSERTION THIS BATCH OWES MOST, which is about the five PREDICATES rather than their
  -- count, and about BOTH CATALOG COLUMNS rather than one. `polqual` is USING and `polwithcheck` is
  -- WITH CHECK; 040's probe found that a reversal gutting one while leaving the other intact goes
  -- unnoticed by a test that looks at one of them — a narrowing whose USING lost the Page branch
  -- filters nothing on read for a page-scoped member while still refusing their writes: the leak
  -- without the symptom.
  count_of := 0;
  for probe in
    select c.relname as target,
           pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)      as using_half,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname::text = any (content_tables)
       and not pol.polpermissive
  loop
    count_of := count_of + 1;
    foreach narrowing in array array[probe.using_half, probe.check_half] loop
      if probe.target in ('content_ideas', 'content_items') then
        if narrowing is null
           or position('member_scope_admits_business' in narrowing) = 0
           or position('member_scope_admits_page' in narrowing) = 0 then
          raise exception 'the % narrowing does not ask both the Business and the Page question: %',
            probe.target, coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = '§4 invariant 3 makes the Page scope a nullable override on a row that '
                         'always carries a Business scope, so the narrowing decides per row which '
                         'question to ask. Dropping the Page branch admits every member scoped to a '
                         'sibling Page.';
        end if;
      elsif probe.target = 'content_versions' then
        if narrowing is null or position('content_items' in narrowing) = 0 then
          raise exception 'the content version narrowing does not resolve through its item: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'A version carries no page column, so its reach is its item''s reach. A '
                         'narrowing that asked about the version''s own columns would ask the '
                         'Business question about the history of a page-restricted item.';
        end if;
      else
        if narrowing is null or position('content_versions' in narrowing) = 0 then
          raise exception 'the % narrowing does not resolve through its version: %', probe.target,
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'A variant and a quality review each hang off a version, which hangs off '
                         'the item that carries the page. The chain is asserted rather than copied, '
                         'because a nullable copy of the item''s page could not be held equal to it '
                         'by any foreign key — MATCH SIMPLE skips a null.';
        end if;
      end if;
    end loop;
  end loop;
  if count_of <> 5 then
    raise exception 'batch 080 found % restrictive policies to inspect and there must be five', count_of;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 080 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason every batch since 020 asks
  -- them: scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  -- It matters more here than in most batches, because the writer this family is waiting for is a
  -- SECURITY DEFINER function owned by app_command: if app_command also owned the table, that
  -- function would be exempt from the policies above by ownership and the narrowings would bound
  -- nothing it does.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (content_tables)
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 080 creates is owned by a role that must not own one: %', offending;
  end if;
end $$;
