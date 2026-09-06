-- Tenant fixture for the batch 040 isolation cases.
--
-- Owner: A2 Knowledge. It loads AFTER 010-identity-fixture.sql, 020-business-fixture.sql,
-- 021-member-scope-fixture.sql and 030-industry-fixture.sql; the runner applies all five in order,
-- and a knowledge item cannot exist without the Workspace, the Business and — for the two rows that
-- carry one — the Page it names by composite foreign key. page_a1_sibling in particular is created
-- by the 021 fixture, so the ordering is load-bearing rather than conventional.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
-- THIS IS THE FIRST FIXTURE WHOSE ROWS DIFFER IN THEIR SCOPE SHAPE RATHER THAN ONLY IN THEIR SCOPE
-- VALUES, and that is the whole reason it needed five rows. §4 invariant 3 gives every knowledge row
-- a Business scope and makes the Page scope a NULLABLE OVERRIDE, so a fixture carrying only one of
-- the two states would leave half of batch 040's narrowing untested and looking green:
--
--   knowledge_a1_business       business_a1, page NULL. `voice`.
--                               The un-overridden state. Every A-side positive reads it, the
--                               approver's refused UPDATE is witnessed against its name, and it is
--                               the row a business-scoped editor may write.
--   knowledge_a1_page           business_a1, page_a1. `audience`.
--                               The overridden state, inside user_page_editor_a's single-Page scope
--                               as well as inside user_editor_a's Business scope.
--   knowledge_a1_sibling_page   business_a1, page_a1_sibling. `offers`.
--                               THE ROW §8.6 CASE 4 IS ABOUT at this granularity. It is under the
--                               SAME Business as knowledge_a1_page, so a member refused it has been
--                               refused by PAGE scope and not by Business scope — which is what
--                               distinguishes case 4 from case 3.
--   knowledge_a2_business       business_a2, page NULL. `restrictions`.
--                               §8.6 case 3: same Workspace, Business outside the editor's scope.
--   knowledge_b1_business       business_b1, page NULL. `voice`.
--                               §8.6 case 5 and §12.6/1: the far side of the tenant boundary, held
--                               by its exact id by every A-side attacker and read by its own owner.
--
-- IT ALSO LOADS ONE ROW THAT IS NOT KNOWLEDGE — page_a1_archived, an ARCHIVED Page under a LIVE
-- Business — and the reason is below, beside the insert. In short: 040's INSERT policy carries
-- §11.3's archive clause twice, and the Page half had no row to be about.
--
-- ALL FOUR KIND VALUES ARE LOADED. §5 names voice, audience, offers and restrictions and
-- 040_knowledge.sql constrains the column to exactly those four words; a vocabulary that only ever
-- appears in a CHECK is a vocabulary no row has ever had to satisfy. This is 021's reason for
-- loading the `all_businesses` scope type it could have left theoretical.
--
-- NO ROW IS LOADED UNDER business_a3_archived, deliberately. §11.3 closes NEW CREATION under an
-- archived Business and 040's INSERT policy refuses it; that case needs a Business with no knowledge
-- under it, and a pre-loaded row would make the refusal ambiguous between the policy and whatever
-- else the statement touched. It is the same reasoning 030's fixture gives for leaving that Business
-- unassigned.
--
-- This file loads ADMINISTRATIVELY, as the table owner, before any identity is assumed. Batch 040
-- writes INSERT policies for the owner, the admin and the editor, so every row below COULD be loaded
-- through them; it is not, for the reason every fixture before this one gives — a fixture that
-- depends on the policies under test cannot distinguish "the policy works" from "the fixture
-- happened to load".
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- An ARCHIVED Page under a LIVE Business, which no earlier fixture has and which 040's INSERT
-- policy needs. §11.3's archive clause appears TWICE in that policy — once for the Business and
-- once for the Page — and until this row the Page half had nothing to be about: business_a3_archived
-- is archived at the BUSINESS level, so a refusal there is the first clause firing and says nothing
-- about the second. This is the only row in the fixture where the two parents disagree.
--
-- It carries no knowledge of its own, deliberately: the case it exists for is a refused CREATION
-- under it, and a pre-loaded row would say nothing about that while making the archived Page look
-- like a normal one to every read case.
insert into app.page_context_profiles
  (id, workspace_id, business_profile_id, name, archived_at, created_by, updated_by) values
  ('1e03159a-85fa-59e7-a57b-acc008ba9cf0', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'fixture page a1 archived',
   -- A FIXED timestamptz rather than now(), for the reason batch 030's fixture gives about
   -- released_at: a fixture whose content depends on when it ran is one whose failures depend on
   -- when they ran.
   timestamptz '2026-07-01 00:00:00+00',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f')
on conflict (id) do nothing;

-- Its version 1, so the archived Page has history like every other one and §11.3's "history stays
-- readable" is true of it rather than merely said about it.
insert into app.page_context_profile_versions
  (workspace_id, business_profile_id, page_context_profile_id, version_number, name, created_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '1e03159a-85fa-59e7-a57b-acc008ba9cf0', 1,
   'fixture page a1 archived v1', '5c460eb8-0710-557a-b423-f9b12c76834f')
on conflict (page_context_profile_id, version_number) do nothing;

-- The knowledge items. `created_by` and `updated_by` are the WORKSPACE OWNER on each side of the
-- boundary, which is who §8.2 gives the knowledge write to and who 040's INSERT policy asserts the
-- JWT subject equals.
--
-- The two page-level rows carry their Business as well as their Page, because the override narrows
-- the Business scope and never replaces it — 040's composite foreign key names all three columns, so
-- a Page from another Business would fail here at the database rather than at a policy.
insert into app.knowledge_items
  (id, workspace_id, business_profile_id, page_context_profile_id, kind, name, created_by, updated_by) values
  ('3d465a92-5b43-5ba4-aa9d-baffa30d6532', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', null,
   'voice', 'fixture knowledge a1 business',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('5a7556c9-2be0-5e74-968e-7386c016c9ca', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'da6409df-9541-5346-9d2e-447be2a649af',
   'audience', 'fixture knowledge a1 page',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('3cffa5e5-41bc-553f-b998-480f0bb1d206', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'b45dc73c-00e3-5e14-91ef-026dcbc29a7f',
   'offers', 'fixture knowledge a1 sibling page',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('0ea0109e-d1ea-571e-a01f-4f3fd1bfb418', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', null,
   'restrictions', 'fixture knowledge a2 business',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('f93702e9-19de-5a57-a7ec-f0d57b2cec45', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', null,
   'voice', 'fixture knowledge b1 business',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (id) do nothing;

-- Version 1 of each item. These rows carry no updated_at and no updated_by, because the table has
-- neither: an immutable row has no update to stamp (§3.2).
--
-- No `id` column, and `on conflict` on the NATURAL key rather than on the primary key — batch 020's
-- shape, and its reason unchanged: `on conflict (id)` on a row with no id would be a no-op that
-- silently inserted a second version 1 on every re-run.
--
-- NO PAGE COLUMN, because the table has none. A version records what the item SAID; the Page
-- restriction is part of what the item IS, and 040_knowledge.sql explains at length why a nullable
-- copy of it could not be held equal to the item's by any foreign key. The consequence for this
-- fixture is that the two page-level items and the three business-level ones produce version rows of
-- exactly the same shape, and the difference between them is asserted through the item.
--
-- Their `name` is what the version immutability witnesses read. A case that attempts to UPDATE a
-- version and is refused is only half an assertion; the other half is a witness proving the row
-- still says what it said, and that witness needs a value fixed here.
insert into app.knowledge_item_versions
  (workspace_id, business_profile_id, knowledge_item_id, version_number, name, created_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   '3d465a92-5b43-5ba4-aa9d-baffa30d6532', 1, 'fixture knowledge a1 business v1',
   '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   '5a7556c9-2be0-5e74-968e-7386c016c9ca', 1, 'fixture knowledge a1 page v1',
   '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   '3cffa5e5-41bc-553f-b998-480f0bb1d206', 1, 'fixture knowledge a1 sibling page v1',
   '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '0a5bed73-2981-5699-b2a1-e1c1663127f4',
   '0ea0109e-d1ea-571e-a01f-4f3fd1bfb418', 1, 'fixture knowledge a2 business v1',
   '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3',
   'f93702e9-19de-5a57-a7ec-f0d57b2cec45', 1, 'fixture knowledge b1 business v1',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (knowledge_item_id, version_number) do nothing;

commit;
