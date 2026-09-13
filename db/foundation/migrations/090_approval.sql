-- ============================================================================================
-- Batch 090 — approval.core: the policy that is a version, the request that has words for its
-- states, and the trail nobody may write
-- ============================================================================================
--
-- Owner: A5 Approval. Depends on 080 (content). §6's migration ownership registry gives this batch
-- three words — "policy/request/event" — and §5's inventory gives `approval.core` the same three
-- objects, "policies/requests/events", with one mutability sentence that names two of them:
-- "policy versioned; event append-only".
--
-- THREE TABLES, NOT FOUR, AND THE FOURTH IS A GAP RATHER THAN A DEFERRAL. §4.7 of
-- docs/plans/core-database-and-rls-workstream-th.md heads its first bullet
-- "`approval_policies` / `approval_policy_steps`" and says of the second half: "steps มีลำดับ,
-- action type, required role". No registry row in §6's 000..180 range names a step table, §5's
-- inventory does not list one, and batch 091 — the only later batch in this family — is
-- "calendar/schedule". Batch 021 refused to create `workspace_member_scope_versions` because
-- "creating one would be reserving a table no registry row gives this batch", and batches 060 and
-- 080 refused `generation_runs` and `content_targets` on the same ground. This batch refuses
-- `approval_policy_steps` for that reason and records the DIFFERENCE from 080's refusal rather than
-- copying its sentence: `content_targets` went to a named batch, 081, and this table goes nowhere.
-- `app.approval_events.step` therefore carries an ordinal with no referent, which is stated in the
-- column's own comment and is in the work package's open blockers. It is the same shape as
-- `app.generation_runs` — a table §4 names, §6 assigns to nobody, and two columns already point at.
--
-- ============================================================================================
-- THE SCOPE COLUMN IS A DOCUMENT CONFLICT, AND §2 DECIDES IT RATHER THAN THIS BATCH
-- ============================================================================================
--
-- §4.7 opens: "Policy อยู่ Workspace หรือ Business scope". §5 of
-- docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md gives `approval.core` the Scope
-- "business/page". Those are not the same table: the first makes `business_profile_id` nullable and
-- the second makes it mandatory with a Page override.
--
-- §2 of the sprint-0a document settles it in terms — "Approved ADR/Contract Registry ของ A0 ใหม่กว่า
-- > เอกสารนี้ > workstream เดิม" — and lists `core-database-and-rls-workstream-th.md` as item 5,
-- the "workstream เดิม" half of that ordering. So §5's "business/page" wins and every table here
-- carries §4 invariant 3's shape: a mandatory Business and a nullable Page override that must live
-- under the same Business. THE COST IS STATED RATHER THAN DISCOVERED: a workspace-wide approval
-- policy cannot be expressed by this schema, and a product that wants one needs a Business-scoped
-- row per Business. That is a consequence of a conflict this batch is not entitled to resolve the
-- other way, and it is in the open blockers with both sentences quoted so the owner can overrule it.
--
-- §4.7 IS NOT DISCARDED WHERE THE WINNING DOCUMENT IS SILENT. §2's rule is about conflict. The
-- sprint-0a document supplies no approval status vocabulary, no "minimum approvers" field and no
-- idempotency rule, so §4.7 is the only source for those and they are taken from it — which is the
-- same way batch 080 took §4.6's six vocabularies from the same workstream file.
--
-- ============================================================================================
-- §4.7 SUPPLIES ONE VOCABULARY AND WITHHOLDS TWO, AND NEITHER GAP IS FILLED HERE
-- ============================================================================================
--
--   * `approval_requests.status` — "pending|approved|changes_requested|cancelled|expired".
--     FIVE VALUES, GIVEN. It gets a CHECK, and those five words appear nowhere else in this file
--     except in the policies that decide which of them a caller may write.
--
--   * `approval_events.action` — §4.7 names "action" and enumerates NOTHING. No CHECK. §8.3's
--     third row is "Approve/reject/request changes", which is three verbs and not a vocabulary: it
--     says what an approver may do and not what string a row records. A CHECK invented from a
--     matrix row would be this batch choosing the event alphabet for Product.
--
--   * `approval_policy_steps.action type` — the column of a table this batch does not create.
--
-- Batch 080 left three columns free-form on exactly this reasoning and recorded three blockers.
-- This batch leaves one free-form and records it. The difference is worth naming rather than
-- leaving as a smaller number: 080's `content_items.approval_state` is the column §4.7's status
-- vocabulary is most likely to be mistaken for, and it is A DIFFERENT COLUMN ON A DIFFERENT TABLE.
-- 080's own header says so. Nothing here writes `content_items.approval_state`, nothing here reads
-- it, and the two are not kept in step by any constraint in this repository — which is also a
-- blocker, because a request that is `approved` beside an item whose `approval_state` says
-- otherwise is a disagreement no reader can resolve.
--
-- ============================================================================================
-- §8.3 GIVES APPROVAL FOUR ROWS AND THE FOURTH HAS THE SHAPE §8.2's THIRD ROW HAS
-- ============================================================================================
--
--   | Approval policy manage           | Y | Y | N | N | N | P |
--   | Approval request create/cancel   | Y | Y | Y | N | N | P |
--   | Approve/reject/request changes   | Y | P | P | Y | N | P |
--   | Approval event UPDATE/DELETE     | N | N | N | N | N | N |
--
-- The fourth row is `N` in every column including Service. Batch 080 met the only other row in §8
-- of that shape and implemented it as an ABSENCE — no write grant and no write policy, asserted
-- both ways against the live catalog — because "a grant that was never made has to be written to be
-- undone; a policy predicate can be widened by an edit". `app.approval_events` is implemented the
-- same way and the assertion below is that assertion with this batch's table in it.
--
-- INSERT IS ABSENT TOO, AND THAT IS A READING RATHER THAN A QUOTATION. §8.3's fourth row names
-- UPDATE and DELETE, exactly as §8.2's third row named them, and neither says who may insert. §4.7
-- says the trail is "append-only" and that "decision ห้าม update/delete"; §8.5 says an append-only
-- table has "ไม่มี user update/delete policy และมี command/trigger/privilege defense ตามความเหมาะสม".
-- A decision trail a client can author is a trail that proves nothing about the decision, so the row
-- that records an approval is written by the act that approves. That act is a `SECURITY DEFINER`
-- command function owned by `app_command`, which is exempt from these policies by being the owner
-- rather than by holding a privilege (RFC-2026-017 §3), and RFC-2026-021 §10 records that no command
-- function exists.
--
-- THE COST, STATED PLAINLY AND NOT SMOOTHED OVER: nothing in this repository can write an approval
-- event. A request can be raised, cancelled and decided by a client through the policies below, and
-- the trail that is supposed to record the decision stays empty. Batch 080 ended in the same place
-- for content versions and said so; this batch ends there for the audit half of its own family, and
-- that is worse rather than equivalent, because §4 invariant 8 makes "Approval/Usage/Audit history"
-- immutable and an empty history is immutable in a way that helps nobody. In the open blockers.
--
-- `P` IS NOT `Y`, AND THIS BATCH TREATS IT THE WAY BATCH 070 DID. The third row marks Admin and
-- Editor `P` — "ผ่านตาม policy/explicit capability" — on approve/reject/request changes. No
-- capability is defined anywhere in this repository, and `app.approval_policies.required_role` is a
-- column this batch creates and no policy predicate reads. So the decide path below names `owner`
-- and `approver`, the two `Y` cells, and Admin and Editor are refused. Batch 070 refused the
-- approver the `P` on "Suggestion save/dismiss/use" for the same reason. The two refused `P` cells
-- are in the open blockers; implementing one would be this batch deciding what "ตาม policy" means.
--
-- APPROVAL HAS NO `S` CELL ANYWHERE IN §8.3, so this batch classifies NOTHING in
-- db/foundation/lint/service-policy-map.json and writes no service policy. RFC-2026-022 §3 carries
-- a service policy only for a cell the §8 matrix marks `S`; approval's Service column is `P` on
-- three rows and `N` on the fourth, and a `P` with no capability defined is not an `S`. Batch 080
-- reached the same conclusion for the same family-shaped reason and batch 132 for a different one.
-- The file gets a prose note saying this batch classified nothing, which is the convention batches
-- 110 and 132 established, because a batch that is silent in that file and a batch that decided to
-- be silent are indistinguishable otherwise.
--
-- ============================================================================================
-- §8.3 HAS NO SELECT ROW FOR APPROVAL, AND THE READ SURFACE BELOW IS A READING
-- ============================================================================================
--
-- §8.3 gives Calendar a SELECT row and gives approval policy, request and event none. Every other
-- family in this schema took its client read straight from a matrix cell — §8.2's "Content SELECT |
-- Y | Y | Y | Y | Y" is the row batch 080 cites for all five of its tables. This batch has no such
-- row, so the SELECT below rests on three sentences rather than on one cell, and a reader is
-- entitled to know that before trusting it:
--
--   1. §8.3's own third row is `Y` for the approver. An approver who cannot READ a request cannot
--      approve one, so the decide row presupposes a read for at least that role.
--   2. §5 classes `approval.core` CONTENT-2/AUTH-3. CONTENT-2's client projection in §9.1 is
--      "through RLS", which is what §8.2 spends its SELECT row saying for the content family this
--      request pins.
--   3. §8.4's tenant audit row spells the approver's cell "approval trail" in words where every
--      other cell in §8 is a letter — the one place in the matrix that names this material as
--      something a role reads.
--
-- AUTH-3's projection is "minimum role projection", and this batch does not implement a projection:
-- it grants column-scoped SELECT on the base tables to `authenticated` and lets the policies decide
-- rows. The object AUTH-3 asks for is a `security_invoker` view with a registry row, which is
-- RFC-2026-021 §3's "five objects and one registry row" — and RFC-2026-021 §8.1's
-- db/foundation/lint/read-allowlist.json DOES NOT EXIST. So the narrower projection cannot be
-- registered even if it were written here. Recorded as a blocker, and the one column that carries
-- free text a person typed about another person's work is named in its own comment below.
--
-- ============================================================================================
-- WHAT THE THREE MUTABILITY STORIES ACTUALLY ARE
-- ============================================================================================
--
--   app.approval_policies   VERSIONED. §5: "policy versioned". A row IS a version — §4.7 gives the
--                           table a `version` column and names no separate version table — so a new
--                           decision is a new row and never an edit. "published policy version
--                           immutable" is implemented as a COLUMN ALLOWLIST: `enabled`, `updated_at`
--                           and `updated_by` are the whole of the client UPDATE grant, and every
--                           column that carries the decision is outside it, asserted per column
--                           against the live ACL. That is batch 070's research-snapshot shape —
--                           "mutable in exactly two columns" — applied to a different sentence.
--
--                           §4.7 GIVES NO `published` STATE AND THIS BATCH INVENTS NONE. So
--                           "published policy version immutable" is read as applying from the moment
--                           a row exists, which is STRONGER than the sentence requires and is the
--                           only reading that does not need a lifecycle word nobody has chosen.
--
--   app.approval_requests   MUTABLE IN ONE COLUMN, AND THE COLUMN IS A VOCABULARY. §4.7's five
--                           status values, as a CHECK, and §8.3's two write rows as TWO SEPARATE
--                           UPDATE POLICIES that differ in which values their WITH CHECK admits.
--                           That is the only place in this schema where a policy bounds a state
--                           TRANSITION rather than a row, and it is how the same granted column
--                           serves a cancel row that is `Y` for three roles and a decide row that is
--                           `Y` for two different ones.
--
--   app.approval_events     APPEND-ONLY, as §8.3's fourth row: no INSERT, UPDATE or DELETE grant to
--                           any role and no INSERT, UPDATE or DELETE policy, asserted both ways
--                           against the live catalog, with the refusal cases run FROM THE OWNER so
--                           they are about the operation rather than about the caller.
--
-- ============================================================================================
-- WHICH STATE NOBODY CAN REACH, AND WHY THAT IS A FINDING RATHER THAN AN OVERSIGHT
-- ============================================================================================
--
-- §4.7 gives `status` five values. The policies below let a client write four of them: `pending` on
-- insert by the column default, `cancelled` on the create/cancel row, `approved` and
-- `changes_requested` on the decide row. `expired` IS WRITTEN BY NOBODY. §8.3 has no row for
-- expiring a request; the service column on the three rows it does have is `P` with no capability;
-- and no document in this repository states how long a request stays open. A default interval
-- invented here would be this batch setting a product deadline, which is precisely what batch 070
-- refused to do for DATA-DEC-07's retention number. So the value is in the CHECK because §4.7 puts
-- it there, no path writes it, and the gap is in the open blockers. THE ABSENCE IS ASSERTED rather
-- than left to be noticed: the block at the end of this file fails if any policy on this table
-- mentions `expired`.
--
-- ============================================================================================
-- RETENTION AND SENSITIVITY
-- ============================================================================================
--
-- §5 gives the family CONTENT-2/AUTH-3 and APPROVAL-HISTORY. §10 gives APPROVAL-HISTORY "อายุ
-- Workspace + 1 ปี default" and "anonymize actor after minimum retention; preserve decision
-- integrity". NO NUMBER APPEARS IN THIS FILE. §10 owns the window, batch 160 owns the sweep and the
-- anonymisation, and §15 requires Product, Security and Legal approval before Paid Beta. What this
-- batch provides is what a sweep would read and what an anonymiser would have to rewrite:
-- `occurred_at` and `created_at` on every table, indexed, and the actor columns gathered into named
-- columns rather than into a jsonb blob. "Preserve decision integrity" and "anonymize actor" pull in
-- opposite directions on a table that holds both, and batch 160 will meet that on a table with no
-- UPDATE grant for any role — which is a real problem for it and is in the open blockers, because
-- discovering it in batch 160 would be discovering it after the migration that caused it merged.

-- ============================================================================================
-- app.approval_policies — VERSIONED. §8.3 row 1: manage is `Y` for owner and admin only.
-- ============================================================================================
create table if not exists app.approval_policies (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  -- §4 invariant 3's nullable Page override. See the header on why this column exists at all when
  -- §4.7 asks for a Workspace-or-Business scope: §2's precedence rule gives §5's "business/page".
  page_context_profile_id  uuid,
  -- The logical identity a version is a version OF. §4.7 gives the table a `version` and names no
  -- separate version table, so the pair (policy_key, version) is what makes "policy versioned" a
  -- schema rather than a word: a second decision is a second row and never an edit to the first.
  policy_key               text        not null,
  version                  integer     not null,
  -- Default FALSE, and the default is the decision. A policy row that arrived enabled would be an
  -- approval gate nobody turned on becoming active by being written, and `enabled` is the ONLY
  -- column a client may move after the fact.
  enabled                  boolean     not null default false,
  -- §4.7: "minimum approvers". NOT NULL with NO DEFAULT, which is batch 070's `retention_until`
  -- shape for a different reason: a default here would be a quorum this batch chose for every
  -- policy that omits one, and the number is Product's.
  minimum_approvers        integer     not null,
  -- §4.7: "role/scope requirement". Both vocabularies come from §7 of the WINNING document — its
  -- five built-in roles and its three scope types — so neither is invented here, and 021 already
  -- carries the identical scope CHECK on app.workspace_member_scopes.scope_type.
  required_role            text,
  required_scope_type      text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  updated_by               uuid,
  constraint approval_policies_policy_key_not_blank check (length(btrim(policy_key)) > 0),
  constraint approval_policies_version_positive check (version >= 1),
  -- A quorum of zero is a gate that is not a gate. This is a shape rule and not a vocabulary: it
  -- refuses a number no reading of "minimum approvers" admits, and chooses none.
  constraint approval_policies_minimum_approvers_positive check (minimum_approvers >= 1),
  constraint approval_policies_required_role_known
    check (required_role is null
           or required_role in ('owner', 'admin', 'editor', 'approver', 'viewer')),
  constraint approval_policies_required_scope_type_known
    check (required_scope_type is null
           or required_scope_type in ('all_businesses', 'business', 'page')),
  constraint approval_policies_business_scope_fk
    foreign key (workspace_id, business_profile_id)
    references app.business_profiles (workspace_id, id),
  constraint approval_policies_page_scope_fk
    foreign key (workspace_id, business_profile_id, page_context_profile_id)
    references app.page_context_profiles (workspace_id, business_profile_id, id),
  -- "policy versioned", as a constraint: one row per (scope, key, version).
  constraint approval_policies_version_key
    unique (workspace_id, business_profile_id, policy_key, version),
  constraint approval_policies_scope_key unique (workspace_id, business_profile_id, id)
);

create index if not exists approval_policies_created_at_idx on app.approval_policies (created_at);

comment on table app.approval_policies is
  'Owner: A5 Approval (approval.core, batch 090). VERSIONED: §5 says "policy versioned" and §4.7 '
  'gives the table a version column and names no separate version table, so a row IS a version and '
  'a new decision is a new row. §4.7''s "published policy version immutable" is implemented as a '
  'COLUMN ALLOWLIST -- enabled, updated_at and updated_by are the whole client UPDATE grant and '
  'every decision column is outside it, asserted per column at apply time -- and applies from the '
  'moment a row exists, because §4.7 names no published state and this batch invents none. '
  'business_profile_id is NOT NULL although §4.7 says "Workspace หรือ Business scope": §5 of the '
  'sprint-0a document says "business/page" and §2 of that document makes it the winner. A '
  'workspace-wide policy is therefore inexpressible here and that is in the open blockers.';

comment on column app.approval_policies.required_role is
  'The role §4.7''s "role/scope requirement" names, over §7''s five built-in roles. NO POLICY '
  'PREDICATE IN THIS FILE READS IT. §8.3 marks admin and editor `P` on approve/reject/request '
  'changes -- "ผ่านตาม policy/explicit capability" -- and this column is the nearest thing in the '
  'schema to that policy, but nothing defines what reading it would mean, so the decide policy '
  'names §8.3''s two `Y` cells instead and the two `P` cells are refused. In the open blockers.';

-- ============================================================================================
-- app.approval_requests — MUTABLE IN ONE COLUMN, AND THE COLUMN IS §4.7's FIVE-WORD VOCABULARY.
-- ============================================================================================
create table if not exists app.approval_requests (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  -- NO PAGE COLUMN, AND THE ABSENCE IS THE DESIGN. A request pins a content item and the ITEM
  -- carries §4 invariant 3's Page override. A nullable copy of it here could not be held equal to
  -- the item's by any foreign key -- MATCH SIMPLE skips a null -- and batch 070 recorded that an
  -- unenforceable copy of the column a narrowing turns on is worse than no copy. So the request's
  -- reach IS its item's reach, resolved by the restrictive policy below, which is exactly the shape
  -- batch 080 gave app.content_versions.
  content_item_id          uuid        not null,
  -- §4 invariant 6: "Approval Request pin Content Version". NOT NULL, and the foreign key runs over
  -- FOUR columns so the pinned version is a version OF the pinned item rather than of any item in
  -- the tenant -- app.content_versions exposes (workspace_id, business_profile_id, content_item_id,
  -- id) as a unique key and this is the first reference in the schema to use it.
  content_version_id       uuid        not null,
  -- NULLABLE, and the nullability is a refusal to decide. §4.7 lists the column and does not say a
  -- request must name a policy; making it NOT NULL would make "an approval gate exists" a schema
  -- rule, which is Product's to state. The foreign key runs over the scope path, so when it IS
  -- named the policy belongs to the same tenant and Business.
  policy_version_id        uuid,
  -- §4.7: "status(pending|approved|changes_requested|cancelled|expired)". FIVE VALUES, GIVEN.
  status                   text        not null default 'pending',
  requested_by             uuid,
  -- The stamp §8.3's third row leaves behind. See the CHECK below: it is what makes "a decision was
  -- taken" follow from the columns rather than from a vocabulary somebody would have to choose,
  -- which is the only kind of lifecycle rule batch 070 held itself entitled to state.
  decided_at               timestamptz,
  decided_by               uuid,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  updated_by               uuid,
  constraint approval_requests_status_known
    check (status in ('pending', 'approved', 'changes_requested', 'cancelled', 'expired')),
  -- §8.3 SPLITS THIS TABLE'S WRITES INTO TWO ROWS AND THIS CHECK IS WHERE THAT SPLIT BECOMES DATA.
  -- "Approval request create/cancel" and "Approve/reject/request changes" are different rows with
  -- different role cells, so `cancelled` is not a decision and neither is `expired`: only the two
  -- values the third row produces carry a decider. Stated as an equivalence so that BOTH errors are
  -- refused -- a decision with no decider, and a decider stamped on a cancellation.
  constraint approval_requests_decision_has_a_decider
    check ((status in ('approved', 'changes_requested'))
           = (decided_at is not null and decided_by is not null)),
  constraint approval_requests_item_scope_fk
    foreign key (workspace_id, business_profile_id, content_item_id)
    references app.content_items (workspace_id, business_profile_id, id),
  constraint approval_requests_pinned_version_fk
    foreign key (workspace_id, business_profile_id, content_item_id, content_version_id)
    references app.content_versions
      (workspace_id, business_profile_id, content_item_id, id),
  constraint approval_requests_policy_scope_fk
    foreign key (workspace_id, business_profile_id, policy_version_id)
    references app.approval_policies (workspace_id, business_profile_id, id),
  constraint approval_requests_scope_key unique (workspace_id, business_profile_id, id)
);

create index if not exists approval_requests_created_at_idx on app.approval_requests (created_at);
-- The column batch 160's APPROVAL-HISTORY sweep reads, and the one an anonymiser would filter on.
create index if not exists approval_requests_decided_at_idx on app.approval_requests (decided_at)
  where decided_at is not null;

comment on table app.approval_requests is
  'Owner: A5 Approval (approval.core, batch 090). status carries §4.7''s five values as a CHECK -- '
  'pending, approved, changes_requested, cancelled, expired -- and NO VALUE IS INVENTED. Four of '
  'the five are reachable: the insert writes pending by the column default, §8.3''s create/cancel '
  'row writes cancelled and its approve/reject row writes approved or changes_requested, each '
  'through a separate UPDATE policy whose WITH CHECK admits only its own values. `expired` IS '
  'WRITTEN BY NOBODY -- §8.3 has no row for it, the service column is P with no capability defined, '
  'and no document states how long a request stays open -- and the apply-time block asserts that no '
  'policy here mentions it. There is no page column: a request pins a content item and the item '
  'carries the Page override, so the request''s reach is resolved through it rather than copied '
  'into a nullable column no foreign key could hold equal. In the open blockers: `expired`, and the '
  'fact that nothing keeps this column in step with app.content_items.approval_state.';

-- ============================================================================================
-- app.approval_events — APPEND-ONLY. §8.3 row 4 is `N` in every column including Service.
-- ============================================================================================
create table if not exists app.approval_events (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  approval_request_id      uuid        not null,
  -- §4.7 names "step". NO FOREIGN KEY AND NO REFERENT: app.approval_policy_steps does not exist and
  -- no row in §6's 000..180 registry gives it to any batch. This is the shape batch 080 carried on
  -- `generation_run_id` and it is recorded here for the same reason -- a column that references
  -- something is worth more than a column that does not, and less than one a key enforces.
  step                     integer,
  -- NO CHECK. §4.7 names "action type" and enumerates nothing; §8.3's "Approve/reject/request
  -- changes" is a matrix row about who may act, not an alphabet of strings a row may hold.
  action                   text        not null,
  actor                    uuid,
  -- §4.7 names "comment". THE ONE COLUMN IN THIS BATCH THAT HOLDS FREE TEXT A PERSON TYPED ABOUT
  -- ANOTHER PERSON'S WORK, under a family §5 classes AUTH-3, whose client projection in §9.1 is
  -- "minimum role projection". It is in the SELECT grant, because a decision trail with the reason
  -- removed is a trail that does not say why; the narrower projection AUTH-3 asks for is a
  -- `security_invoker` view with a registry row, and RFC-2026-021 §8.1's read-allowlist.json does
  -- not exist for it to be registered in. In the open blockers.
  comment                  text,
  occurred_at              timestamptz not null default now(),
  -- §4.7: "request/correlation id", as the two columns app.audit_logs already spells them (140).
  request_id               text        not null,
  correlation_id           text        not null,
  -- §4.7: "unique idempotency key ต่อ action". PER ACTION, which is what the unique constraint
  -- below spells and what a key scoped to the request alone would not: one `approve` may be retried
  -- and must not produce a second decision, and that says nothing about a `comment` action beside
  -- it on the same request.
  idempotency_key          text        not null,
  constraint approval_events_step_positive check (step is null or step >= 1),
  constraint approval_events_action_not_blank check (length(btrim(action)) > 0),
  constraint approval_events_request_id_not_blank check (length(btrim(request_id)) > 0),
  constraint approval_events_correlation_id_not_blank check (length(btrim(correlation_id)) > 0),
  constraint approval_events_idempotency_key_not_blank check (length(btrim(idempotency_key)) > 0),
  constraint approval_events_request_scope_fk
    foreign key (workspace_id, business_profile_id, approval_request_id)
    references app.approval_requests (workspace_id, business_profile_id, id),
  constraint approval_events_action_idempotency_key
    unique (workspace_id, approval_request_id, action, idempotency_key),
  constraint approval_events_scope_key unique (workspace_id, business_profile_id, id)
);

create index if not exists approval_events_occurred_at_idx on app.approval_events (occurred_at);

comment on table app.approval_events is
  'Owner: A5 Approval (approval.core, batch 090). APPEND-ONLY: §5 says "event append-only", §4.7 '
  'says "decision ห้าม update/delete" and §8.3''s "Approval event UPDATE/DELETE" row is N for '
  'owner, admin, editor, approver, viewer AND service -- the same shape §8.2 row 3 has and the only '
  'other one in §8. Implemented as absent grants and absent policies for insert, update and delete '
  'rather than as a refusing predicate, because a grant never made must be written to be undone '
  'while a policy can be widened by an edit. INSERT is absent on a READING rather than a '
  'quotation: §8.3''s row names UPDATE and DELETE, and a decision trail a client can author proves '
  'nothing about the decision, so the writer is a SECURITY DEFINER command function owned by '
  'app_command (RFC-2026-017 §3) and none exists (RFC-2026-021 §10). NOTHING IN THIS REPOSITORY '
  'CAN WRITE AN APPROVAL EVENT, which is in the open blockers. step carries no foreign key because '
  'app.approval_policy_steps is named by §4.7 and given to no batch by §6.';

-- ============================================================================================
-- ROW LEVEL SECURITY — ENABLE and FORCE on all three, per RFC-2026-016 §2 as amended
-- ============================================================================================
--
-- FORCE as well as ENABLE, because ENABLE alone exempts the table OWNER and the owner is the role
-- migrations run as. The schema lint refuses ENABLE without FORCE and that rule exists because the
-- specified lint would have passed it.
alter table app.approval_policies enable row level security;
alter table app.approval_policies force  row level security;

alter table app.approval_requests enable row level security;
alter table app.approval_requests force  row level security;

alter table app.approval_events   enable row level security;
alter table app.approval_events   force  row level security;

-- ============================================================================================
-- GRANTS — column-scoped, and the columns that are ABSENT are the control
-- ============================================================================================
--
-- RFC-2026-021 M3's measurement is why these are column-scoped rather than table-wide: a
-- column-scoped grant makes column drift loud, because a new column is not granted until somebody
-- writes it into a diff.
--
-- `anon` is granted nothing anywhere in `app` (RFC-2026-021 §7/4, decided rather than deferred), so
-- it appears nowhere below.

-- approval_policies: readable in full, writable in ONE column. The UPDATE list is the whole of
-- §4.7's "published policy version immutable" -- `version`, `policy_key`, `minimum_approvers`,
-- `required_role` and `required_scope_type` are absent from it, so the decision a version encodes
-- cannot be rewritten by any granted path and a new decision is a new row.
grant select (id, workspace_id, business_profile_id, page_context_profile_id, policy_key, version,
              enabled, minimum_approvers, required_role, required_scope_type,
              created_at, updated_at, created_by, updated_by)
  on app.approval_policies to authenticated;
grant insert (workspace_id, business_profile_id, page_context_profile_id, policy_key, version,
              enabled, minimum_approvers, required_role, required_scope_type, created_by,
              updated_by)
  on app.approval_policies to authenticated;
grant update (enabled, updated_at, updated_by)
  on app.approval_policies to authenticated;

-- approval_requests: readable in full, writable in the columns the two §8.3 write rows move.
-- `content_item_id` and `content_version_id` are ABSENT from the UPDATE grant, which is §4
-- invariant 6's second half -- "Version ใหม่ไม่ inherit approval โดยอัตโนมัติ" -- as a missing
-- privilege: a request cannot be re-pointed at a newer version, so a new version needs a new
-- request. `requested_by` is absent for the reason `created_by` is absent everywhere: a request
-- cannot change hands after the fact.
grant select (id, workspace_id, business_profile_id, content_item_id, content_version_id,
              policy_version_id, status, requested_by, decided_at, decided_by,
              created_at, updated_at, created_by, updated_by)
  on app.approval_requests to authenticated;
grant insert (workspace_id, business_profile_id, content_item_id, content_version_id,
              policy_version_id, requested_by, created_by, updated_by)
  on app.approval_requests to authenticated;
grant update (status, decided_at, decided_by, updated_at, updated_by)
  on app.approval_requests to authenticated;

-- approval_events: SELECT only. No insert, no update, no delete, to any role. §8.3's fourth row is
-- `N` for every column including Service, and a grant never made must be written to be undone.
grant select (id, workspace_id, business_profile_id, approval_request_id, step, action, actor,
              comment, occurred_at, request_id, correlation_id, idempotency_key)
  on app.approval_events to authenticated;

-- ============================================================================================
-- POLICIES — §8.3's four rows as one read, three write paths and one absence
-- ============================================================================================
--
-- Every policy is `TO authenticated`. RFC-2026-016 §2 as amended on RFC-2026-022 carries service
-- policies only for cells the §8 matrix marks `S`, and approval has none.

-- THE READ. §8.3 has no SELECT row for this family; see the header for the three sentences this
-- rests on and for what it does not implement (AUTH-3's "minimum role projection").
create policy approval_policies_select_active_member on app.approval_policies
  for select to authenticated
  using (app.is_active_member(workspace_id));

create policy approval_requests_select_active_member on app.approval_requests
  for select to authenticated
  using (app.is_active_member(workspace_id));

create policy approval_events_select_active_member on app.approval_events
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- §8.3 ROW 1 — "Approval policy manage | Y | Y | N | N | N". Owner and admin, and the editor is
-- refused here where §8.2 row 2 gives them content: writing the gate is not the same act as
-- writing the thing the gate is for.
create policy approval_policies_insert_manager on app.approval_policies
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin')
  );

create policy approval_policies_update_manager on app.approval_policies
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin'))
  with check (
    -- §8.5: the writer names itself, and the policy checks the claim rather than trusting it.
    updated_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin')
  );

-- §8.3 ROW 2, FIRST HALF — "Approval request create/cancel | Y | Y | Y | N | N". The insert.
-- `status` is outside the INSERT grant, so a request arrives `pending` by the column default and a
-- caller cannot open one already approved. That is a missing privilege rather than a predicate, and
-- it is asserted per column at the end of this file.
create policy approval_requests_insert_writer on app.approval_requests
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
  );

-- ============================================================================================
-- TWO UPDATE POLICIES ON ONE TABLE, BECAUSE §8.3 GIVES IT TWO ROWS WITH DIFFERENT ROLE CELLS
-- ============================================================================================
--
--   | Approval request create/cancel | Y | Y | Y | N | N |   <- cancel: owner, admin, editor
--   | Approve/reject/request changes | Y | P | P | Y | N |   <- decide: owner, approver
--
-- The same column -- `status` -- serves both, so the rows cannot be told apart by a grant. They are
-- told apart by WHICH VALUE each policy's WITH CHECK admits, which makes these the only policies in
-- this schema that bound a state TRANSITION rather than a row.
--
-- PERMISSIVE POLICIES ARE OR-ED, AND THAT IS WHY EACH HALF CARRIES ITS OWN ROLE TEST. The USING
-- halves OR together and so do the WITH CHECK halves, so an editor writing `approved` must satisfy
-- the decide policy's WITH CHECK -- which names owner and approver -- and an approver writing
-- `cancelled` must satisfy the cancel policy's, which names owner, admin and editor. Dropping the
-- role test from either WITH CHECK on the grounds that the USING half already made it would let the
-- OTHER policy's USING half admit the row and this one's WITH CHECK accept the write. That is not a
-- hypothetical: it is the single most likely edit anybody will make to this file.
--
-- `expired` APPEARS IN NEITHER HALF. See the header: no row of §8.3 produces it, no document says
-- when a request expires, and the block at the end of this file fails if a policy here ever
-- mentions it.
create policy approval_requests_update_cancel_writer on app.approval_requests
  for update to authenticated
  using (
    app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
    and status = 'pending'
  )
  with check (
    updated_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
    and status = 'cancelled'
  );

-- §8.3 ROW 3 — "Approve/reject/request changes | Y | P | P | Y | N". Owner and approver: the two
-- `Y` cells. Admin and editor are `P` -- "ผ่านตาม policy/explicit capability" -- and no capability
-- is defined in this repository, so they are refused here and the two cells are in the open
-- blockers. Batch 070 refused the approver's `P` on "Suggestion save/dismiss/use" the same way.
--
-- `decided_by = (select auth.uid())` is §8.5's rule applied to the column that records WHO decided,
-- which matters more here than `updated_by` does: `approval_requests_decision_has_a_decider` makes
-- the stamp mandatory on exactly these two values, so the trail cannot record a decision without
-- naming a decider and cannot name one who is not the caller.
create policy approval_requests_update_decide_approver on app.approval_requests
  for update to authenticated
  using (
    app.workspace_member_role(workspace_id) in ('owner', 'approver')
    and status = 'pending'
  )
  with check (
    updated_by = (select auth.uid())
    and decided_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'approver')
    and status in ('approved', 'changes_requested')
  );

-- §8.3 ROW 4 — app.approval_events gets a SELECT policy and NOTHING ELSE. With force row level
-- security and no INSERT, UPDATE or DELETE policy, no client can write here whatever it is granted
-- -- and it is granted nothing either, which is the second half asserted below.

-- ============================================================================================
-- RESTRICTIVE NARROWINGS — the member scope, asked once per row
-- ============================================================================================
--
-- A PERMISSIVE policy above says the caller is a member of the workspace. A RESTRICTIVE policy here
-- says the caller's SCOPE admits this row, and both must hold. Batch 021 created the scope table and
-- its helpers; 070 established the shape for a family with a nullable page and 080 extended it to a
-- chain two links long.
--
-- THE POLICY ASKS THE TWO QUESTIONS ITSELF because it carries both scope columns. THE REQUEST ASKS
-- THROUGH ITS CONTENT ITEM, because it deliberately carries no page column of its own. THE EVENT
-- ASKS THROUGH THE REQUEST AND THEN THROUGH THE ITEM -- two links, the shape batch 080 gave its
-- variants and quality reviews.
--
-- BOTH HALVES ON ALL THREE, INCLUDING THE TABLE NO CLIENT MAY WRITE. On app.approval_events the
-- WITH CHECK half is inert today: there is no INSERT or UPDATE grant for it to bound. It is written
-- anyway, for the direction a mistake travels -- if a later batch grants a write here, a narrowing
-- with no WITH CHECK would admit that write for every active member of the workspace, including one
-- the row's own content item is hidden from. 040's probe is why this is stated rather than assumed:
-- a reversal that gutted one half while leaving the other intact went unnoticed by a test that
-- looked at one of them.
create policy approval_policies_scope_narrowing on app.approval_policies
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

-- A request is reachable when its ITEM is. The item carries the page override; the request does not
-- copy it. A narrowing that asked `member_scope_admits_business` over the request's own columns
-- would pass every business-level case in this suite while leaking the approval trail of a
-- page-restricted item to a member scoped to a sibling Page -- which is what the sibling-target rows
-- in the fixture exist to fail on.
create policy approval_requests_scope_narrowing on app.approval_requests
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.content_items i
      where i.workspace_id = approval_requests.workspace_id
        and i.business_profile_id = approval_requests.business_profile_id
        and i.id = approval_requests.content_item_id
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
      where i.workspace_id = approval_requests.workspace_id
        and i.business_profile_id = approval_requests.business_profile_id
        and i.id = approval_requests.content_item_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  );

create policy approval_events_scope_narrowing on app.approval_events
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.approval_requests r
      join app.content_items i
        on i.workspace_id = r.workspace_id
       and i.business_profile_id = r.business_profile_id
       and i.id = r.content_item_id
      where r.workspace_id = approval_events.workspace_id
        and r.business_profile_id = approval_events.business_profile_id
        and r.id = approval_events.approval_request_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  )
  with check (
    exists (
      select 1 from app.approval_requests r
      join app.content_items i
        on i.workspace_id = r.workspace_id
       and i.business_profile_id = r.business_profile_id
       and i.id = r.content_item_id
      where r.workspace_id = approval_events.workspace_id
        and r.business_profile_id = approval_events.business_profile_id
        and r.id = approval_events.approval_request_id
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
-- Four claims made above are claims about a live catalog and cannot be checked by reading this file:
-- that the trail is append-only as the PRIVILEGE SYSTEM holds it and not merely as this file's grant
-- list reads; that the decision a policy version encodes is outside every UPDATE grant; that no
-- granted path and no policy can put a request into `expired`; and that each of the three
-- narrowings resolves the way its comment says. All four are asserted here, because a header that
-- says "asserted" and asserts nothing is the overclaim this repository keeps removing from its own
-- evidence.
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
  approval_tables constant text[] :=
    array['approval_policies', 'approval_requests', 'approval_events'];
  -- §8.3 row 4 — "Approval event UPDATE/DELETE | N N N N N | N" — the second row in §8 that is `N`
  -- in every column including Service, and the only one outside §8.2.
  append_only_tables constant text[] := array['approval_events'];
begin
  -- ENABLE AND FORCE ON ALL THREE. They are DIFFERENT CATALOG COLUMNS and the data package's own
  -- lint rule reads only the first (RFC-2026-016 §4). Without FORCE the table owner is exempt from
  -- every policy, and the owner is the role migrations run as.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending;
  end if;

  -- APPEND-ONLY AS THE PRIVILEGE SYSTEM HOLDS IT, which is the first half of the claim the header
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
         and c.relname::text = any (append_only_tables)
         and r.rolname::text = any (every_role)
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
              or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'an approval event can be written through a granted path: %', offending
      using hint = '§8.3 row 4 is `N` for owner, admin, editor, approver, viewer AND service, which '
                   'only §8.2 row 3 is besides it. The refusal is a grant that was never made '
                   'rather than a policy that says no, because a grant has to be WRITTEN to be '
                   'undone while a policy predicate can be widened by an edit. INSERT is in this '
                   'list on a reading rather than a quotation: a decision trail a client can author '
                   'proves nothing about the decision.';
  end if;

  -- AND THE SAME CLAIM AS THE POLICY CATALOG HOLDS IT, which is the "both ways" the header promises.
  -- Either half alone can be satisfied while the other is wrong: a policy with no grant is inert,
  -- and a grant with no policy is refused by row level security rather than by privilege — a weaker
  -- refusal than append-only asks for. `a` is INSERT, `w` is UPDATE, `d` is DELETE; `*` is the
  -- restrictive FOR ALL narrowing and is deliberately not in this list.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (append_only_tables)
     and pol.polcmd in ('a', 'w', 'd');
  if offending is not null then
    raise exception 'app.approval_events carries an INSERT, UPDATE or DELETE policy: %', offending
      using hint = 'A write policy here would be this batch deciding that §8.3 row 4 has an '
                   'exception. It does not: the row that records a decision is written by the act '
                   'that takes it, which is a SECURITY DEFINER command function owned by '
                   'app_command (RFC-2026-017 §3) and does not exist yet (RFC-2026-021 §10).';
  end if;

  -- §4.7's "published policy version immutable" AND §4 invariant 6's "Version ใหม่ไม่ inherit
  -- approval" AND §8.5's rule against moving a row across tenant or scope with an update, PER
  -- COLUMN, against the live ACL. The three client UPDATE grants above name seven columns between
  -- them and this is what says so about the rest.
  --
  -- `version`, `policy_key` and `minimum_approvers` are the columns this batch is most likely to be
  -- read wrong on: a reader who has seen §8.3 mark "Approval policy manage" `Y` for two roles
  -- expects a manager to be able to edit a policy. They cannot edit the DECISION — they toggle
  -- `enabled` and they write a new version — and the refusal is a missing privilege rather than a
  -- policy clause. `content_version_id` is in the second list for the sharper reason: §4 invariant
  -- 6 says a new version does not inherit approval, and a request that could be re-pointed at one
  -- would inherit it by an UPDATE.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id',
                                'page_context_profile_id', 'policy_key', 'version',
                                'minimum_approvers', 'required_role', 'required_scope_type',
                                'created_by', 'created_at']) as col
       where n.nspname = 'app'
         and c.relname = 'approval_policies'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id', 'content_item_id',
                                'content_version_id', 'policy_version_id', 'requested_by',
                                'created_by', 'created_at']) as col
       where n.nspname = 'app'
         and c.relname = 'approval_requests'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity, scope, decision or pin column of a batch 090 table is updatable: %', offending
      using hint = '§4.7: "published policy version immutable". §4 invariant 6: "Approval Request '
                   'pin Content Version; Version ใหม่ไม่ inherit approval โดยอัตโนมัติ" — a request '
                   'that can be re-pointed at a new version inherits approval by an UPDATE. §8.5: a '
                   'row may not be moved across tenant OR scope by an update.';
  end if;

  -- `status` IS NOT IN THE INSERT GRANT, so a request arrives `pending` by the column default. A
  -- caller who could name the column on insert could open a request that is already `approved`,
  -- and the two UPDATE policies below would never see it — which is the whole state machine
  -- bypassed in one statement, and the one failure mode the transition policies cannot catch.
  select string_agg(format('%s to %s', column_name, grantee), ', ') into offending
    from (
      select col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['status', 'decided_at', 'decided_by']) as col
       where n.nspname = 'app'
         and c.relname = 'approval_requests'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'INSERT')
    ) as held;
  if offending is not null then
    raise exception 'a batch 090 request can be INSERTED with a state or a decision already on it: %', offending
      using hint = '§4.7 gives status five values and §8.3 gives the table two write rows. Both are '
                   'about moving an EXISTING request. A request that can be created `approved` — or '
                   'created with a decided_at — has skipped every policy that bounds the '
                   'transition, and no UPDATE policy can refuse a row that was never updated.';
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE THREE. §8.5 has no broad user delete; a request that is
  -- withdrawn becomes `cancelled`, which is why §4.7 gives the vocabulary that word; and hard
  -- removal in this family is batch 160's APPROVAL-HISTORY sweep through app_maintenance, which this
  -- batch grants nothing.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname::text = any (approval_tables)
         and r.rolname::text = any (every_role)
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'an approval row can be deleted through a granted path: %', offending;
  end if;

  -- app_worker HOLDS NOTHING HERE, AND THIS BATCH TAKES 080's SHAPE RATHER THAN 070's. Batch 070
  -- grants its worker select, insert and update and lets row level security refuse it, which is the
  -- "grants and no policy" shape batch 010 introduced. Approval does not, for the reason 080 gave
  -- and one of its own: §8.3 marks the Service column `P` on three rows and `N` on the fourth, so
  -- there is no `S` cell for a worker grant to anticipate, and the writer this family needs is a
  -- SECURITY DEFINER command function owned by `app_command`, exempt from these policies by being
  -- the owner rather than by holding a privilege (RFC-2026-017 §3). Granting app_worker a write
  -- here would be building the second path to the same act — the shape RFC-2026-018 was superseded
  -- for proposing.
  --
  -- The cost is stated rather than discovered: the isolation suite's service cases here are refused
  -- at the PRIVILEGE layer rather than by row level security, which is a different claim from batch
  -- 070's and is labelled as one in tests/db/identity/isolation-cases.mjs, and none of them is part
  -- of the CI negative control's basis.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and (pg_catalog.has_any_column_privilege('app_worker', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('app_worker', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'app_worker holds a privilege on app.%, and batch 090 grants it none', offending;
  end if;

  -- `anon` holds nothing on anything this batch creates. RFC-2026-021 §7/4 decided that as a
  -- NEGATIVE, and it is the one client-role property no approved decision is expected to move.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on app.%, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- NO POLICY ON THESE THREE NAMES ANY ROLE BUT `authenticated`, AND THE SERVICE HALF OF THAT IS A
  -- DECISION RATHER THAN AN OMISSION. RFC-2026-022 §3 carries a service policy for a cell the §8
  -- matrix marks `S`. Approval has no `S` cell anywhere in §8.3 — its Service column is `P` on three
  -- rows and `N` on the fourth, and a `P` with no capability defined is not an `S` — so
  -- db/foundation/lint/service-policy-map.json gets no entry from this batch and no policy here may
  -- name a service role. Batch 070 deliberately left app_worker OUT of its equivalent assertion
  -- because it expects a policy once RFC-2026-022 is in effect; this batch expects none, so the
  -- assertion is wider here for a stated reason, exactly as 080's is.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('anon', 'app_worker', 'app_command', 'app_maintenance',
                                      'app_authz'));
  if offending is not null then
    raise exception 'batch 090 left a policy for a role that is not authenticated: %', offending;
  end if;

  -- `expired` IS WRITTEN BY NOBODY, ASSERTED AGAINST THE POLICY CATALOG RATHER THAN PROMISED IN A
  -- COMMENT. §4.7 puts the word in the vocabulary and §8.3 gives no row that produces it, so the
  -- CHECK admits it and no granted path reaches it. The failure this catches is the plausible one: a
  -- later edit widening the cancel policy's WITH CHECK to `status in ('cancelled', 'expired')`,
  -- which would hand every editor in the workspace the power to expire somebody else's request
  -- while looking like a tidy-up. `polwithcheck` and not `polqual`, because a USING half that
  -- mentioned `expired` would only be selecting rows to act on.
  select string_agg(pol.polname, ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'approval_requests'
     and pol.polwithcheck is not null
     and position('expired' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) > 0;
  if offending is not null then
    raise exception 'a batch 090 policy admits a write of the one status value nothing may produce: %', offending
      using hint = '§4.7 lists `expired` among five status values and §8.3 has NO ROW that produces '
                   'it: the service column on the three write rows is `P` with no capability '
                   'defined, and no document in this repository says how long an approval request '
                   'stays open. Writing it here would be this batch setting a product deadline.';
  end if;

  -- THE TWO UPDATE POLICIES ON app.approval_requests ARE DISTINGUISHED BY THEIR WITH CHECK HALVES,
  -- AND EACH CARRIES ITS OWN ROLE TEST. Permissive policies OR together, so a WITH CHECK half that
  -- dropped its role test would let the OTHER policy's USING half admit the row: an approver would
  -- cancel, or an editor would approve. That is the single most likely edit to this file and it is
  -- invisible to a test that reads one policy at a time.
  count_of := 0;
  for probe in
    select pol.polname as polname,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname = 'approval_requests'
       and pol.polpermissive
       and pol.polcmd = 'w'
  loop
    count_of := count_of + 1;
    if probe.check_half is null then
      raise exception 'the % policy has no WITH CHECK half, and it is the half that bounds the transition', probe.polname;
    end if;
    if position('workspace_member_role' in probe.check_half) = 0 then
      raise exception 'the % policy does not test the caller''s role in its WITH CHECK half: %',
        probe.polname, probe.check_half
        using hint = 'Permissive UPDATE policies OR their USING halves AND OR their WITH CHECK '
                     'halves. §8.3 gives this table two rows whose role cells differ — '
                     'cancel is Y for owner/admin/editor, decide is Y for owner/approver — so a '
                     'WITH CHECK half that trusts the USING half to have tested the role lets the '
                     'OTHER policy''s USING half admit the row.';
    end if;
    if position('status' in probe.check_half) = 0 then
      raise exception 'the % policy does not bound the status it writes: %', probe.polname, probe.check_half
        using hint = 'The same granted column serves both of §8.3''s write rows, so the VALUE each '
                     'policy admits is the only thing that tells the rows apart.';
    end if;
  end loop;
  if count_of <> 2 then
    raise exception 'batch 090 wrote % permissive UPDATE policies on app.approval_requests and §8.3 gives it two write rows', count_of;
  end if;

  -- THREE RESTRICTIVE NARROWINGS, ONE PER TABLE. `polpermissive` is the one catalog column that
  -- tells a narrowing from a widening: a PERMISSIVE policy with the same name and the same
  -- predicate would WIDEN each table instead of narrowing it, and §12.6/2 would silently stop being
  -- implemented here.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and not pol.polpermissive;
  if count_of <> 3 then
    raise exception 'batch 090 wrote % restrictive policies and it creates three tables to narrow', count_of;
  end if;

  -- AND THE ASSERTION THIS BATCH OWES MOST, which is about the three PREDICATES rather than their
  -- count, and about BOTH CATALOG COLUMNS rather than one. `polqual` is USING and `polwithcheck` is
  -- WITH CHECK; 040's probe found that a reversal gutting one while leaving the other intact goes
  -- unnoticed by a test that looks at one of them — a narrowing whose USING lost the Page branch
  -- filters nothing on read for a page-scoped member while still refusing their writes: the leak
  -- without the symptom.
  --
  -- EACH TABLE IS CHECKED FOR WHAT ITS OWN COMMENT CLAIMS. The policy asks both questions itself;
  -- the request must reach `content_items`, because a narrowing over its own columns would ask the
  -- Business question about the approval trail of a page-restricted item; the event must reach
  -- `approval_requests`, which is the first link of the two its comment claims.
  count_of := 0;
  for probe in
    select c.relname as target,
           pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)      as using_half,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname::text = any (approval_tables)
       and not pol.polpermissive
  loop
    count_of := count_of + 1;
    foreach narrowing in array array[probe.using_half, probe.check_half] loop
      if probe.target = 'approval_policies' then
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
      elsif probe.target = 'approval_requests' then
        if narrowing is null or position('content_items' in narrowing) = 0 then
          raise exception 'the approval request narrowing does not resolve through its content item: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'A request carries no page column, so its reach is its item''s reach. A '
                         'narrowing that asked about the request''s own columns would ask the '
                         'Business question about the approval trail of a page-restricted item.';
        end if;
      else
        if narrowing is null or position('approval_requests' in narrowing) = 0 then
          raise exception 'the approval event narrowing does not resolve through its request: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'An event hangs off a request, which hangs off the content item that '
                         'carries the page. The chain is asserted rather than copied, because a '
                         'nullable copy of the item''s page could not be held equal to it by any '
                         'foreign key — MATCH SIMPLE skips a null.';
        end if;
      end if;
    end loop;
  end loop;
  if count_of <> 3 then
    raise exception 'batch 090 found % restrictive policies to inspect and there must be three', count_of;
  end if;

  -- THE PINNED VERSION IS A VERSION OF THE PINNED ITEM, asserted as the DEGREE of the foreign key
  -- rather than as its existence. §4 invariant 6 is "Approval Request pin Content Version", and a
  -- two-column key into app.content_versions (workspace_id, id) would satisfy every reading of that
  -- sentence while letting a request pin a version of ANOTHER ITEM in the same tenant — a content
  -- item approved by a decision taken about a different one. `confkey` is the array of referenced
  -- columns and its length is the whole of the claim.
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'approval_requests'
     and con.conname = 'approval_requests_pinned_version_fk'
     and con.contype = 'f'
     and array_length(con.conkey, 1) = 4;
  if count_of <> 1 then
    raise exception 'the approval request does not pin its content version over the item scope path'
      using hint = '§4 invariant 6: "Approval Request pin Content Version". A key that named only '
                   'the workspace and the version id would let a request pin a version of another '
                   'item in the same tenant, which is a decision taken about a different piece of '
                   'content.';
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 090 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason every batch since 020 asks
  -- them: scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  -- It matters more here than in most batches, because the writer app.approval_events is waiting for
  -- is a SECURITY DEFINER function owned by app_command: if app_command also owned the table, that
  -- function would be exempt from the policies above by ownership and the narrowings would bound
  -- nothing it does — and this is the one table in the schema whose entire integrity claim rests on
  -- who may write it.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 090 creates is owned by a role that must not own one: %', offending;
  end if;
end $$;
