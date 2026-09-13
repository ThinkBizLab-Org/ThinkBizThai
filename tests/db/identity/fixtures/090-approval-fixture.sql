-- Tenant fixture for the batch 090 isolation cases.
--
-- Owner: A5 Approval. It loads AFTER 010-identity-fixture.sql (the Workspaces and the memberships),
-- 020-business-fixture.sql (business_a1, business_a2, business_b1 and page_a1, which every policy
-- row names by composite foreign key), 021-member-scope-fixture.sql (page_a1_sibling, and the member
-- scope that makes user_page_editor_a a single-Page identity) and 080-content-fixture.sql (the five
-- content items and their five versions, which every request pins). The runner applies the whole
-- list in order.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
--
-- WHAT THIS FIXTURE HAS TO CARRY, AND WHY IT IS SHAPED THIS WAY
--
-- FIVE POLICIES, because app.approval_policies is the table in this family that carries §4
-- invariant 3's two-column scope itself -- a mandatory Business and a nullable Page override -- so
-- its restrictive narrowing has two branches and four outcomes to exercise, plus the tenant
-- boundary. Each row carries exactly ONE control, which is 020's fixture rule: one row carrying two
-- unrelated controls is how a case starts failing for the other one's reason.
--
--   business-level under business_a1        the `then` branch, app.member_scope_admits_business.
--   page-level under page_a1                the `else` branch, and the POSITIVE half of §8.6 case 4.
--   page-level under page_a1_sibling        the NEGATIVE half of case 4: a refusal by PAGE inside a
--                                           Business the caller is otherwise admitted to.
--   business-level under business_a2        outside user_editor_a's scope. §8.6 case 3.
--   business-level under business_b1        under workspace_b. §8.6 case 5.
--
-- NO POLICY ROW CARRIES A SYMBOL. §5's "policy versioned" is
-- (workspace_id, business_profile_id, policy_key, version) in 090_approval.sql, so a case addresses
-- a policy by ids this catalog already fixes plus a literal key -- batch 020's rule for a version
-- row, applied to a table whose rows ARE versions.
--
-- TWO VERSIONS OF ONE POLICY KEY ON THE A SIDE, and that pair is not decoration. §4.7 says
-- "published policy version immutable" and 090 implements it as a COLUMN ALLOWLIST: `enabled`,
-- `updated_at` and `updated_by` are the whole client UPDATE grant. A single-version fixture would
-- let this suite assert that the decision columns are unwritable and could not show what the
-- versioning is FOR. Version 2 carries a different `minimum_approvers` from version 1, so "a new
-- decision is a new row" is visible as two rows that disagree rather than as a sentence in a header.
--
-- THE TWO VERSIONS DIFFER IN `enabled` AS WELL, and only one of them is true. `enabled` is the one
-- column a client may move, so both of its values must be present or a case that toggles it cannot
-- tell a refusal from a write that changed nothing -- 030's fixture rule, which batch 080 restated
-- for `status`.
--
-- SIX REQUESTS, AND THE SIXTH IS THE ONE THAT IS NOT ABOUT SCOPE. Five of them are the four
-- outcomes of the chain plus the tenant boundary, resolved ONE TABLE AWAY: app.approval_requests
-- deliberately carries no page column, so a request's reach is its content item's reach and each of
-- these exercises a branch of app.content_items' narrowing through its own restrictive policy. The
-- sixth, approval_request_a1_decided, is loaded `approved` with a decider already stamped, because
-- both UPDATE policies are `USING (... and status = 'pending')` and that clause cannot be tested
-- against a pending row: without it, a reversal deleting the clause would leave every case passing.
--
-- IT IS A SECOND REQUEST ON A VERSION THAT ALREADY HAS ONE, and that is deliberate rather than
-- convenient. Nothing in §4.7, §5 or §8.3 says a content version is requested once, 090 writes no
-- uniqueness that would forbid it, and a fixture that quietly avoided the case would make the
-- absent constraint look like a decision nobody took.
--
-- EVERY REQUEST PINS ITS ITEM'S OWN VERSION, over the four-column key
-- approval_requests_pinned_version_fk. Two of the five versions have no symbol, so those rows
-- resolve them with a subselect on (content_item_id, version_no) -- the natural key batch 080
-- records, used here as an address exactly as that batch's own note says it may be.
--
-- NO REQUEST NAMES A POLICY, AND THE NULL IS THE POINT. `policy_version_id` is nullable in 090
-- because §4.7 lists the column and does not say a request must name a policy, and making it NOT
-- NULL would have been this batch deciding that an approval gate exists. A fixture that populated
-- it everywhere would make that nullability untested; a fixture that populated it nowhere would
-- leave approval_requests_policy_scope_fk unexercised. So the A-side business request names the
-- A-side business policy and every other row leaves it null.
--
-- THE B-SIDE REQUEST IS `changes_requested` WHERE THE A SIDE'S IS `pending`, so the pair is two
-- distinguishable rows: a cross-tenant read that returned the wrong tenant's request would be
-- visible as a different status rather than as an identical copy. It carries a decider, because
-- approval_requests_decision_has_a_decider requires one of exactly that value -- which is also the
-- only demonstration in this repository that the constraint admits a real row rather than refusing
-- everything.
--
-- NO REQUEST IS LOADED `expired`. That value is in §4.7's vocabulary, no row of §8.3 produces it,
-- and 090 asserts at apply time that no policy admits a write of it. A fixture row in that state
-- would be this file supplying, administratively, the one state the migration spends an assertion
-- proving nobody can reach.
--
-- THREE EVENTS, ONE PER SIDE OF EACH CONTROL THE CHAIN NEEDS. An event resolves its reach TWO
-- levels up -- through its request and then through that request's content item -- so a fixture
-- carrying only the A-side and B-side rows would let this suite assert the chain in the positive
-- direction and across the tenant boundary, and would leave the SECOND LINK untested: a narrowing
-- that resolved an event through its request and then asked the Business question about the
-- request's own columns would pass every such case while leaking a page-restricted item's approval
-- trail to a member scoped to a sibling Page. The event under approval_request_a1_sibling_page is
-- the row that fails when that link is cut.
--
-- NO EVENT CARRIES A SYMBOL EITHER. §4.7 asks for a "unique idempotency key ต่อ action" and 090
-- makes it (workspace_id, approval_request_id, action, idempotency_key), so a case addresses an
-- event by the key whose entire purpose is to identify an action -- which is worth more than a
-- symbol rather than less, in the way batch 070 said of addressing a snapshot by its content hash.
--
-- EVERY `step` IS NULL, AND THE ABSENCE IS THE GAP RATHER THAN AN OVERSIGHT. §4.7 names a step and
-- names `approval_policy_steps` as the table it would belong to; §6's registry gives that table to
-- no batch, so 090 carries the column with no foreign key and no referent. An integer here would be
-- an ordinal pointing at a step that never existed, which is exactly the weakness the open blocker
-- records. A fixture is the last place to make that weakness look like a working reference -- which
-- is batch 080's sentence about `generation_run_id`, and it is the same sentence because it is the
-- same defect one family over.
--
-- EVERY `action` IS A SYNTHETIC STRING THIS FIXTURE CHOOSES AND NO DOCUMENT FIXES. §4.7 names the
-- column and enumerates nothing, so 090 gives it no CHECK; the values below are `fixture-action-*`
-- rather than `approve` or `reject`, so that nobody reading this file mistakes them for the
-- vocabulary the open blocker says is missing.
--
-- THE `comment` COLUMN IS NULL ON EVERY ROW. It is the one column in this batch that would hold
-- free text a person typed about another person's work, under a family §5 classes AUTH-3. No case
-- needs a value in it, and §9.2 lists `fixture` among the surfaces its prohibitions cover, so this
-- file supplies none.
--
-- THIS FILE LOADS ADMINISTRATIVELY, as the table owner, before any identity is assumed, and on
-- app.approval_events that is the only way there is: batch 090 writes no INSERT policy on it and
-- grants no role any INSERT privilege, because §8.3's fourth row is `N` for every role including the
-- service. On the two client-writable tables it is a choice, and it is 020's: "a fixture that
-- depends on the policies under test cannot distinguish 'the policy works' from 'the fixture
-- happened to load'".
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- ---------------------------------------------------------------------------------------------
-- The policies. Five scopes, and two versions of one key so that "versioned" is visible.
-- ---------------------------------------------------------------------------------------------
--
-- `created_by` is the workspace OWNER on each side. There IS a client INSERT on this table --
-- §8.3's "Approval policy manage" is `Y` for owner and admin -- so the column is a forgery surface
-- at insert time as well as at update time, and the cases assert both halves against the policy
-- rather than against these rows.
--
-- `minimum_approvers` is stated on every row and inherited by none: 090 gives the column NO
-- DEFAULT, because a default would be a quorum the migration chose for every policy that omits one.
--
-- The conflict target NAMES THE CONSTRAINT (021's rule): inference over a column list is exactly
-- where a re-run quietly inserts a second copy.
insert into app.approval_policies
  (workspace_id, business_profile_id, page_context_profile_id, policy_key, version, enabled,
   minimum_approvers, required_role, required_scope_type, created_by, updated_by) values
  -- Version 1 of the A-side business key: DISABLED, quorum 1. The older decision.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', null,
   'fixture-a1-business', 1, false, 1, 'approver', 'business',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- Version 2 of the SAME key: ENABLED, quorum 2. The two rows disagree in the two ways that
  -- matter -- the column a client may move and a column no client may move -- so "a new decision is
  -- a new row" is a pair a case can read rather than a sentence in a header.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', null,
   'fixture-a1-business', 2, true, 2, 'approver', 'business',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- Page-level under page_a1: the `else` branch, and the positive half of §8.6 case 4.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   'da6409df-9541-5346-9d2e-447be2a649af',
   'fixture-a1-pinned', 1, true, 1, 'approver', 'page',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- Page-level under page_a1_sibling: the negative half of case 4.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   'b45dc73c-00e3-5e14-91ef-026dcbc29a7f',
   'fixture-a1-sibling', 1, true, 1, 'approver', 'page',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- business_a2: outside user_editor_a's member scope. §8.6 case 3.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '0a5bed73-2981-5699-b2a1-e1c1663127f4', null,
   'fixture-a2-business', 1, true, 1, null, null,
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- workspace_b. §8.6 case 5. `required_role` and `required_scope_type` are null here and on a2,
  -- because both columns are nullable in 090 and a fixture in which every row populated them would
  -- leave the nullable branch of both CHECKs unexercised.
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', null,
   'fixture-b1-business', 1, true, 1, null, null,
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict on constraint approval_policies_version_key do nothing;


-- ---------------------------------------------------------------------------------------------
-- The requests. Five for the chain and the boundary, one for the terminal state.
-- ---------------------------------------------------------------------------------------------
--
-- `status` is `pending` on the five that are about scope, and that is load-bearing: both UPDATE
-- policies carry `status = 'pending'` in their USING half, so a row in any other state would make
-- every refusal below indistinguishable from a row the USING half did not select.
--
-- The two rows whose content version has no symbol resolve it by (content_item_id, version_no),
-- which is the natural key batch 080 records. A subselect rather than a constant, because the
-- alternative is a seventh derived uuid for a row that already has an address.
insert into app.approval_requests
  (id, workspace_id, business_profile_id, content_item_id, content_version_id, policy_version_id,
   status, requested_by, decided_at, decided_by, created_by, updated_by) values
  -- The business-level A-side request. The only row that names a policy, so
  -- approval_requests_policy_scope_fk is exercised by a real row while the nullable branch stays
  -- exercised by the other five.
  ('7dc995ee-d568-5d97-8afd-bd3f57608b11', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '963952b8-b41d-58cd-b10f-ca3a3557fe65',
   '0516429c-c4af-5c3c-93fa-69844a240195',
   (select p.id from app.approval_policies p
     where p.workspace_id = 'c4840acc-0323-5e13-b1d3-c18d7eb615cb'
       and p.business_profile_id = 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a'
       and p.policy_key = 'fixture-a1-business' and p.version = 2),
   'pending', '5c460eb8-0710-557a-b423-f9b12c76834f', null, null,
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- The page-level A-side request, on the item pinned to page_a1. The `else` branch of the chain.
  ('7cab7920-ebc8-5757-8c09-9f68d8885bbd', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'ddefe11d-220d-5945-b6bf-af36693fc0a9',
   (select v.id from app.content_versions v
     where v.content_item_id = 'ddefe11d-220d-5945-b6bf-af36693fc0a9' and v.version_no = 1),
   null, 'pending', '5c460eb8-0710-557a-b423-f9b12c76834f', null, null,
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- The sibling-page request. The negative half of §8.6 case 4 and the parent of the event that
  -- makes the SECOND link of the chain falsifiable.
  ('d97bc8d6-7473-569c-b448-786d88e882e7', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'f4d8fb50-98fb-5745-8c4f-fab6a0e8f910',
   '25501c36-a088-5897-9166-f2913f7c6649',
   null, 'pending', '5c460eb8-0710-557a-b423-f9b12c76834f', null, null,
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- business_a2: §8.6 case 3.
  ('507a558e-810b-5322-89b9-db70a9bad87b', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', '5ddfe1bf-ca6e-5077-9a9e-84ad3399b82d',
   (select v.id from app.content_versions v
     where v.content_item_id = '5ddfe1bf-ca6e-5077-9a9e-84ad3399b82d' and v.version_no = 1),
   null, 'pending', '5c460eb8-0710-557a-b423-f9b12c76834f', null, null,
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- THE TERMINAL ROW. A second request on the version approval_request_a1 already pins, loaded
  -- `approved`. Both UPDATE policies' `status = 'pending'` clause is untestable without it, and it
  -- is also the only row that demonstrates approval_requests_decision_has_a_decider admitting a
  -- decision rather than refusing one.
  ('87f78e21-66e3-5ceb-ba08-68f2cef543a6', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '963952b8-b41d-58cd-b10f-ca3a3557fe65',
   '0516429c-c4af-5c3c-93fa-69844a240195',
   null, 'approved', '5c460eb8-0710-557a-b423-f9b12c76834f',
   '2026-09-11 04:00:00+00', 'fecceb8f-d60b-54bc-97cd-fccee216e34b',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- workspace_b. §8.6 case 5, and `changes_requested` where the A side's is `pending` so the two
  -- are distinguishable rows rather than copies.
  ('5e21cefe-72d1-5d06-b9ec-fac821aaf57f', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '306426ca-a54a-5e3d-90ec-1feff18372ca',
   '2478a854-613b-5250-b797-eb6d6b347aca',
   null, 'changes_requested', '297ad853-58a6-5e83-87e1-f936f9c3ddff',
   '2026-09-11 05:00:00+00', '297ad853-58a6-5e83-87e1-f936f9c3ddff',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------------------------
-- The events. One per side of the boundary, plus the sibling-page row that tests the second link.
-- ---------------------------------------------------------------------------------------------
--
-- THIS IS THE ONLY WAY THESE ROWS CAN EXIST. Batch 090 writes no INSERT policy on
-- app.approval_events and grants no role any INSERT privilege, because §8.3's fourth row is `N` for
-- every role including the service. The fixture loads them as the table owner before any identity
-- is assumed, which is what makes the refusals below about an empty grant rather than about an
-- empty table.
--
-- `request_id` and `correlation_id` follow app.audit_logs' spelling from batch 140, which is what
-- §4.7's "request/correlation id" names. Both are NOT NULL there and here.
--
-- The conflict target names the constraint §4.7 asks for by name: the idempotency key, per action.
insert into app.approval_events
  (workspace_id, business_profile_id, approval_request_id, step, action, actor, comment,
   request_id, correlation_id, idempotency_key) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   '7dc995ee-d568-5d97-8afd-bd3f57608b11', null, 'fixture-action-a1',
   '5c460eb8-0710-557a-b423-f9b12c76834f', null,
   'fixture-request-a1', 'fixture-correlation-a1', 'fixture-idempotency-a1'),
  -- The row that fails when the second link of the chain is cut: its request hangs off an item
  -- pinned to page_a1_sibling, and user_page_editor_a must be refused it while being admitted to
  -- business_a1 and to the A-side event above.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   'd97bc8d6-7473-569c-b448-786d88e882e7', null, 'fixture-action-a1-sibling',
   '5c460eb8-0710-557a-b423-f9b12c76834f', null,
   'fixture-request-a1-sibling', 'fixture-correlation-a1-sibling',
   'fixture-idempotency-a1-sibling'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3',
   '5e21cefe-72d1-5d06-b9ec-fac821aaf57f', null, 'fixture-action-b1',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', null,
   'fixture-request-b1', 'fixture-correlation-b1', 'fixture-idempotency-b1')
on conflict on constraint approval_events_action_idempotency_key do nothing;

commit;
