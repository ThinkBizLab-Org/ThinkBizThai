-- Tenant fixture for the batch 080 isolation cases.
--
-- Owner: A3 Content. It loads AFTER 010-identity-fixture.sql (the Workspaces and the memberships),
-- 020-business-fixture.sql (business_a1, business_a2, business_b1 and page_a1, which every item
-- names by composite foreign key), 021-member-scope-fixture.sql (page_a1_sibling, and the member
-- scope that makes user_page_editor_a a single-Page identity) and 070-research-fixture.sql (the two
-- suggestions the two ideas cite). The runner applies the whole list in order.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
--
-- WHAT THIS FIXTURE HAS TO CARRY, AND WHY IT IS SHAPED THIS WAY
--
-- FIVE ITEMS, because app.content_items is the table in this family that carries §4 invariant 3's
-- two-column scope -- a mandatory Business and a nullable Page override -- so its restrictive
-- narrowing has two branches and four outcomes to exercise. Each row carries exactly ONE control,
-- which is 020's fixture rule: one row carrying two unrelated controls is how a case starts failing
-- for the other one's reason.
--
--   content_item_a1               business-level. The `then` branch, and the parent of the A-side
--                                 version, variant and quality review.
--   content_item_a1_page          page-level under page_a1. The `else` branch, and the POSITIVE half
--                                 of §8.6 case 4 -- user_page_editor_a is scoped to page_a1.
--   content_item_a1_sibling_page  page-level under page_a1_sibling. The NEGATIVE half of case 4: a
--                                 refusal here is refusal by PAGE scope inside a Business the member
--                                 is otherwise admitted to, which content_item_a2 cannot show.
--   content_item_a2               under business_a2, outside user_editor_a's scope. §8.6 case 3.
--   content_item_b1               under workspace_b. §8.6 case 5.
--
-- FIVE VERSIONS, ONE PER ITEM, AND THE SIBLING-PAGE ONE IS NOT A SPARE. A version carries no page
-- column of its own, so batch 080's whole child design is that a child's reach IS its parent's
-- reach, resolved by a restrictive policy through app.content_items. Asserted only against a
-- BUSINESS-level parent, that claim would still hold if somebody replaced the `exists()` with
-- `member_scope_admits_business(workspace_id, business_profile_id)` -- the substitution the design
-- exists to refuse. The version of content_item_a1_sibling_page is what makes the page half of it
-- falsifiable, and the version of content_item_a2 the business half.
--
-- EVERY `generation_run_id` IS NULL, AND THE ABSENCE IS THE DISPOSITION RATHER THAN AN OVERSIGHT.
-- The Product Owner settled on 2026-09-10 that batch 080 may carry the column as a reference with
-- no foreign key, because `app.generation_runs` exists nowhere and §6's registry assigns it to
-- nobody (evidence/WP-0A-DB-00/product-owner-disposition-generation-run.md, option ก). A uuid in
-- this column here would be a constant no catalog fixes, naming a run that never existed -- which
-- is exactly the provenance weakness that disposition records as its cost. A fixture is the last
-- place to make that weakness look like a working reference.
--
-- THE TWO IDEAS CITE THE TWO RESEARCH SUGGESTIONS, one per side of the tenant boundary, so
-- `content_ideas_research_suggestion_fk` is exercised by real rows. That key is on `id` ALONE --
-- app.research_suggestions exposes no composite scope key -- and this fixture deliberately does NOT
-- load the cross-tenant citation that the absent constraint would permit: a fixture row that cited
-- the other tenant's suggestion would make every A-side read of the idea table look correct while
-- the schema quietly allowed a dangling cross-tenant reference. The gap is recorded in the work
-- package's open blockers, where it is owed to batch 070's owner, and not demonstrated here.
--
-- THREE VARIANTS AND THREE REVIEWS, AND THE SIBLING-PAGE ONES ARE THE NEGATIVE HALF OF THE CHAIN.
-- A variant hangs off a version, which hangs off the item that carries the page, so its reach is
-- resolved TWO levels up. A fixture carrying only the A-side and B-side rows would let this suite
-- assert that chain in the positive direction and across the tenant boundary, and would leave the
-- SECOND LINK untested: a narrowing that resolved a variant through its version and then asked the
-- Business question about the version's own columns would pass every such case while leaking a
-- page-restricted item's variants to a member scoped to a sibling Page. The variant and the review
-- under content_version_a1_sibling_page are the rows that fail when that link is cut.
--
-- EVERY `variant_type` IS NULL, which is the value the logical key's NULLS NOT DISTINCT declaration
-- is about: under the Postgres default those rows would not participate in the key at all, and a
-- second untyped facebook variant of the same version would be accepted. The bodies differ per row,
-- so a read returning the wrong one is visible as different text rather than as an identical copy.
--
-- THE TWO QUALITY REVIEWS ARE IN DIFFERENT STATES -- `warn` on the A side and `block` on the B side
-- -- and both carry one finding with a `rule_code` and a `message_th`, so
-- quality_reviews_findings_carry_code_and_message is a constraint real rows satisfy rather than one
-- nothing exercises. The Thai messages are this repository's own synthetic strings.
--
-- THE ITEMS ARE LOADED `draft` AND ARE NOT PINNED TO A CURRENT VERSION UNTIL THE VERSIONS EXIST,
-- which is the insert order 080_content.sql's header names: item (current_version_id null), then
-- version, then update the item. The apparent cycle between app.content_items and
-- app.content_versions is resolved by that order rather than by a deferrable constraint, and this
-- file is the demonstration that it actually resolves -- there is no deferrable constraint anywhere
-- in this schema for it to lean on.
--
-- THIS FILE LOADS ADMINISTRATIVELY, as the table owner, before any identity is assumed, and on
-- three of these five tables that is the only way there is: batch 080 writes no INSERT policy on
-- app.content_versions, app.content_variants or app.quality_reviews and grants no role any INSERT
-- privilege on them, because §8.2's third row is `N` for every role including the service. On the
-- two client-writable tables it is a choice, and it is 020's: "a fixture that depends on the
-- policies under test cannot distinguish 'the policy works' from 'the fixture happened to load'".
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- ---------------------------------------------------------------------------------------------
-- The items. Five, one per outcome of the two-branch narrowing.
-- ---------------------------------------------------------------------------------------------
--
-- `status` is `draft` on every row. Every case in this suite that names a status is a REFUSAL --
-- §4.6 puts state change behind a domain command and the column is outside every UPDATE grant -- and
-- a row already in the state a case names would make that refusal indistinguishable from a write
-- that did nothing (030's fixture rule).
--
-- `created_by` is the workspace OWNER on each side. There IS a client INSERT on this table, so the
-- column is a forgery surface at insert time as well as at update time, and the cases assert both
-- halves against the policy rather than against these rows.
insert into app.content_items
  (id, workspace_id, business_profile_id, page_context_profile_id, title, content_type, status,
   created_by, updated_by) values
  ('963952b8-b41d-58cd-b10f-ca3a3557fe65', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', null,
   'fixture content item a1 business', 'post', 'draft',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('ddefe11d-220d-5945-b6bf-af36693fc0a9', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'da6409df-9541-5346-9d2e-447be2a649af',
   'fixture content item a1 page', 'reel', 'draft',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('f4d8fb50-98fb-5745-8c4f-fab6a0e8f910', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'b45dc73c-00e3-5e14-91ef-026dcbc29a7f',
   'fixture content item a1 sibling page', 'carousel', 'draft',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('5ddfe1bf-ca6e-5077-9a9e-84ad3399b82d', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', null,
   'fixture content item a2 business', 'post', 'draft',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('306426ca-a54a-5e3d-90ec-1feff18372ca', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', null,
   'fixture content item b1 business', 'post', 'draft',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------------------------
-- The ideas. One per side, each citing its own tenant's research suggestion.
-- ---------------------------------------------------------------------------------------------
--
-- Addressed by (workspace_id, client_request_id) rather than by a symbol: §4.6 asks for "unique
-- idempotency ต่อ workspace" and 080_content.sql makes that a PARTIAL unique index, so the idea is
-- named by the request that created it exactly as batch 050's job is named by its dedupe key.
--
-- The conflict target is INFERRED with its `where` clause rather than named, which is the one place
-- this fixture departs from 021's "name the constraint" rule -- and the reason is that there is no
-- constraint to name. A partial unique index cannot be a table constraint in Postgres, and
-- inference with the index's own predicate is the only spelling that reaches it.
--
-- `status` is NULL on both rows, and that is §4.6 being silent rather than this fixture choosing:
-- the column is named by the document and enumerated nowhere, so 080 gives it no CHECK and a
-- fixture value would be the first vocabulary anybody wrote down.
insert into app.content_ideas
  (workspace_id, business_profile_id, page_context_profile_id, research_suggestion_id,
   goal, topic, client_request_id, created_by, updated_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', null,
   'c6e9f603-3ad5-51f9-bba2-1e45f6d072b4',
   'fixture content goal a1', 'fixture content topic a1', 'fixture content idea a1',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', null,
   '57ef7696-aef6-5cd8-9b63-eeb7cc5eb67c',
   'fixture content goal b1', 'fixture content topic b1', 'fixture content idea b1',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (workspace_id, client_request_id) where client_request_id is not null do nothing;


-- ---------------------------------------------------------------------------------------------
-- The versions. One per item; two carry a symbol and three are addressed by item and ordinal.
-- ---------------------------------------------------------------------------------------------
--
-- `source` is `generated` and `parent_version_id` is null on every row, which
-- content_versions_revision_has_parent requires of anything that is not a revision: a first version
-- has no parent, and this fixture loads no revision because no case needs one and a revision whose
-- parent is a row nobody reads would be a second control on a row that already carries one.
--
-- The conflict target NAMES THE CONSTRAINT (021's rule): inference over a column list is exactly
-- where a re-run quietly inserts a second copy.
insert into app.content_versions
  (id, workspace_id, business_profile_id, content_item_id, version_no, body, source, created_by) values
  ('0516429c-c4af-5c3c-93fa-69844a240195', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '963952b8-b41d-58cd-b10f-ca3a3557fe65', 1,
   'fixture content body a1 v1', 'generated', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  (gen_random_uuid(), 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'ddefe11d-220d-5945-b6bf-af36693fc0a9', 1,
   'fixture content body a1 page v1', 'generated', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('25501c36-a088-5897-9166-f2913f7c6649', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'f4d8fb50-98fb-5745-8c4f-fab6a0e8f910', 1,
   'fixture content body a1 sibling page v1', 'generated', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  (gen_random_uuid(), 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', '5ddfe1bf-ca6e-5077-9a9e-84ad3399b82d', 1,
   'fixture content body a2 v1', 'generated', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('2478a854-613b-5250-b797-eb6d6b347aca', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '306426ca-a54a-5e3d-90ec-1feff18372ca', 1,
   'fixture content body b1 v1', 'generated', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict on constraint content_versions_item_version_key do nothing;


-- The other half of the insert order 080_content.sql's header describes. The item was written with
-- a null current_version_id because its version did not exist yet; the version references the item;
-- and the pointer back is set here. It is an UPDATE and therefore idempotent on a re-run, and it is
-- the demonstration that the cycle resolves without a deferrable constraint -- this schema has none.
update app.content_items
   set current_version_id = '0516429c-c4af-5c3c-93fa-69844a240195'
 where id = '963952b8-b41d-58cd-b10f-ca3a3557fe65'
   and current_version_id is distinct from '0516429c-c4af-5c3c-93fa-69844a240195';

update app.content_items
   set current_version_id = '2478a854-613b-5250-b797-eb6d6b347aca'
 where id = '306426ca-a54a-5e3d-90ec-1feff18372ca'
   and current_version_id is distinct from '2478a854-613b-5250-b797-eb6d6b347aca';


-- ---------------------------------------------------------------------------------------------
-- The variants. One per side, untyped, which is the value the logical key is declared for.
-- ---------------------------------------------------------------------------------------------
insert into app.content_variants
  (workspace_id, business_profile_id, content_version_id, platform, variant_type, body, created_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   '0516429c-c4af-5c3c-93fa-69844a240195', 'facebook', null,
   'fixture content variant a1 facebook', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   '25501c36-a088-5897-9166-f2913f7c6649', 'facebook', null,
   'fixture content variant a1 sibling page facebook', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3',
   '2478a854-613b-5250-b797-eb6d6b347aca', 'facebook', null,
   'fixture content variant b1 facebook', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict on constraint content_variants_logical_key do nothing;


-- ---------------------------------------------------------------------------------------------
-- The quality reviews. Two states, and one finding each with the two fields §4.6 requires.
-- ---------------------------------------------------------------------------------------------
--
-- `rule_set_version` is a synthetic string rather than a real rule-set identifier, because no rule
-- set exists and §4.6's "stable rule code" is owed to whoever owns one. The CHECK this exercises
-- holds the SHAPE of a finding and nothing about the language of the message or the stability of the
-- code, which the migration's own comment states and this fixture does not quietly improve on.
insert into app.quality_reviews
  (id, workspace_id, business_profile_id, content_version_id, rule_set_version, status,
   findings, reviewer_type) values
  ('d5f1cdb1-1653-515e-aa36-c6b93b537bc1', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '0516429c-c4af-5c3c-93fa-69844a240195',
   'fixture-rule-set-v1', 'warn',
   '[{"rule_code": "FIXTURE-TONE-001", "message_th": "ข้อความตัวอย่างสำหรับ fixture"}]'::jsonb, 'ai'),
  ('4fbd5a93-0803-5cf1-b9a3-9863d618e7ca', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '25501c36-a088-5897-9166-f2913f7c6649',
   'fixture-rule-set-v1', 'warn',
   '[{"rule_code": "FIXTURE-TONE-001", "message_th": "ข้อความตัวอย่างสำหรับ fixture หน้าพี่น้อง"}]'::jsonb, 'ai'),
  ('8d7899e1-dc56-5c1d-b14e-62c7a8fd2b9f', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '2478a854-613b-5250-b797-eb6d6b347aca',
   'fixture-rule-set-v1', 'block',
   '[{"rule_code": "FIXTURE-CLAIM-002", "message_th": "ข้อความตัวอย่างสำหรับ fixture ฝั่ง b"}]'::jsonb,
   'human')
on conflict (id) do nothing;

commit;
