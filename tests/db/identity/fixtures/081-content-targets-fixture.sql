-- Tenant fixture for the batch 081 isolation cases.
--
-- Owner: A3 Content. It loads AFTER 010-identity-fixture.sql (the Workspaces and the memberships),
-- 020-business-fixture.sql (business_a1, business_a2 and business_b1), 021-member-scope-fixture.sql
-- (page_a1_sibling, and the member scope that makes user_page_editor_a a single-Page identity) and
-- 080-content-fixture.sql (every content item these targets hang off, and the three variants two of
-- them pin). The runner applies the whole list in order.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
--
-- THE THREE DESTINATION SYMBOLS NAME NO ROW IN THIS REPOSITORY, AND THAT IS THE POINT
--
-- `content_targets.social_account_id` carries NO FOREIGN KEY: §6's migration ownership registry
-- gives "business-channel/social FK" to batch 111 and 081 is the "target placeholder contract"
-- that withholds it. app.social_accounts exists on disk in 110_meta_connector.sql and its rows fix
-- no id -- 110's fixture addresses them by (workspace_id, external_account_hash) and lets `id`
-- default -- so there is no social account uuid in this repository for these rows to point at.
--
-- TWO WAYS TO WRITE THIS FIXTURE, AND THE ONE NOT TAKEN. A subselect against app.social_accounts
-- would make every destination here resolve to a real row, and batch 111 could then add its foreign
-- key without touching this file. It would also make the missing key INVISIBLE: every target would
-- look correctly bound, and the one property this batch most needs a reader to see -- that nothing
-- checks a destination -- would be hidden behind a join that happens to succeed. Batch 080 met the
-- same choice on `generation_run_id` and wrote NULL rather than a plausible uuid, "so nothing in
-- this repository makes the unenforced reference look like a working one". `social_account_id` is
-- NOT NULL, so the equivalent move here is a symbol that resolves to nothing.
--
-- WHAT THAT COSTS, SAID HERE AND IN THE OPEN BLOCKERS SO BATCH 111's AUTHOR MEETS IT TWICE: the day
-- batch 111 adds the foreign key, THIS FIXTURE STOPS LOADING until these three symbols are
-- repointed at social accounts that exist. That is the intended failure. A fixture that kept
-- loading through the addition of the key would be one whose rows never depended on it.
--
--
-- WHAT THIS FIXTURE HAS TO CARRY
--
-- SIX TARGETS OVER FIVE ITEMS. A target carries no page column -- it is a child of
-- app.content_items, which is where §4 invariant 3's nullable override lives -- so its reach is its
-- item's reach and the outcomes a case can exercise are the outcomes of its PARENT's narrowing.
-- One row per outcome, and one extra that is about this table alone:
--
--   (content_item_a1, destination_a1)              business-level. The `then` branch of the
--                                                  parent's narrowing, the row every positive
--                                                  addresses, and the one PINNED target on the A
--                                                  side.
--   (content_item_a1, destination_a2)              THE SECOND DESTINATION ON THE SAME ITEM, and the
--                                                  only row here that is not about scope. §4.6's
--                                                  rule is "unique active target ต่อ content
--                                                  item/social account" -- a PAIR -- and a fixture
--                                                  with one target per item would load identically
--                                                  against an index keyed on the item alone. This
--                                                  row is what makes that substitution fail. It is
--                                                  also the UNPINNED row, so the nullable pin and
--                                                  the MATCH SIMPLE skip in
--                                                  content_targets_variant_scope_fk are exercised
--                                                  by something rather than argued in a comment.
--   (content_item_a1_page, destination_a1)         page-level under page_a1. The POSITIVE half of
--                                                  §8.6 case 4 -- user_page_editor_a is scoped
--                                                  there.
--   (content_item_a1_sibling_page, destination_a1) the NEGATIVE half of case 4, and the row this
--                                                  fixture would be worthless without: a refusal
--                                                  here is refusal by PAGE scope INSIDE a Business
--                                                  the member is otherwise admitted to, which
--                                                  (content_item_a2, …) cannot show. A narrowing
--                                                  that resolved through app.content_items and then
--                                                  asked only the Business question would pass
--                                                  every other case in this suite and leak this one.
--   (content_item_a2, destination_a1)              under business_a2, outside user_editor_a's
--                                                  scope. §8.6 case 3.
--   (content_item_b1, destination_b1)              under workspace_b. §8.6 case 5, held by its exact
--                                                  id by every A-side identity and reached by none.
--
-- EACH ROW CARRIES EXACTLY ONE CONTROL, which is 020's fixture rule: a row carrying two unrelated
-- controls is how a case starts failing for the other one's reason. The one exception is stated
-- rather than hidden -- (content_item_a1, destination_a1) is both the business-level positive and
-- the pinned row -- and it is safe because no case asserts the pin and the scope in the same
-- statement.
--
-- `status` IS NULL ON EVERY ROW, AND NOT FOR WANT OF A PLAUSIBLE VALUE. §4.6 names the column and
-- enumerates NO vocabulary for it; 081_content_targets.sql therefore writes no CHECK, for the
-- reason batch 080 left three of its own columns unchecked. A fixture is the last place a
-- vocabulary nobody decided should first appear: `active`, `pending` or `scheduled` written here
-- would be read as the value the product uses within one batch of somebody needing one. The
-- consequence is that the witnesses in tests/db/identity/isolation-cases.mjs read `updated_by`
-- rather than `status` -- a column the fixture fills with a known uuid, which a landed write would
-- have replaced with the attacker's. §6.4 of evidence/WP-0A-DB-00/parallel-integration-2026-09-07.md
-- records why a witness must read a NOT NULL value: the driver reads psql's CSV, CSV has no NULL,
-- and a witness comparing against `null` holds against every correct database.
--
-- TWO ROWS ARE PINNED AND EACH PINS A VARIANT OF ITS OWN ITEM. The pin is resolved by the natural
-- key batch 080's catalog note fixes for a variant -- (content_version_id, platform) -- rather than
-- by a new symbol, because 080 already addresses variants that way and a second address for one row
-- is a second thing to keep true. The variants chosen belong to the target's OWN content item in
-- both cases, deliberately: content_targets_variant_scope_fk holds the pin to the tenant and the
-- Business and NOT to the item -- app.content_variants carries no item column to key against -- and
-- a fixture row that pinned a variant of a DIFFERENT item would be this file demonstrating the gap
-- as though it were a feature. The gap is in the work package's open blockers, owed to A3 Content
-- as a forward migration, and is not modelled here.
--
-- `deleted_at` IS NULL ON EVERY ROW, so all six occupy their slot in
-- content_targets_active_destination and the soft-delete case has a live row to soft-delete.
--
-- This file loads ADMINISTRATIVELY, as the connection role, before any identity is assumed. That is
-- not a shortcut around the policies: app.content_targets is FORCE ROW LEVEL SECURITY, so the table
-- owner is bound by them too, and only a BYPASSRLS role can write these rows -- which is what the
-- connection role is and what every identity in the suite deliberately is not. It is also 020's
-- rule: "a fixture that depends on the policies under test cannot distinguish 'the policy works'
-- from 'the fixture happened to load'".
--
-- Idempotent, so a suite can be re-run without a reset. The conflict target is the PARTIAL unique
-- index, spelled with its own predicate, because an inference that omitted `where deleted_at is
-- null` names no index this table has.

begin;

-- ---------------------------------------------------------------------------------------------
-- The six targets.
-- ---------------------------------------------------------------------------------------------
--
-- The pins are subselects on (content_version_id, platform), which is the address 080's catalog
-- note fixes for a variant. Each returns exactly one row: 080's fixture loads one `facebook`
-- variant per version and its logical key is unique on (…, content_version_id, platform,
-- variant_type). If 080's fixture ever stops loading one of them the subselect yields NULL, the pin
-- silently becomes unset, and nothing here would notice -- so the two pinned rows are re-read at the
-- end of this file and the load fails if either pin is null.
insert into app.content_targets
  (workspace_id, business_profile_id, content_item_id, social_account_id, content_variant_id,
   status, created_by, updated_by) values
  -- content_item_a1, destination a1: business-level, PINNED to the facebook variant of
  -- content_version_a1.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   '963952b8-b41d-58cd-b10f-ca3a3557fe65', '3e4c57c4-25c0-5d00-b57c-bc50841b9b33',
   (select id from app.content_variants
     where content_version_id = '0516429c-c4af-5c3c-93fa-69844a240195' and platform = 'facebook'),
   null, '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- content_item_a1, destination a2: the SECOND destination on the same item, UNPINNED.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   '963952b8-b41d-58cd-b10f-ca3a3557fe65', '7d07fdd8-4acb-5aa9-a3f5-f7e10ab9c3bb',
   null, null, '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- content_item_a1_page, destination a1: page-level under page_a1, unpinned.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   'ddefe11d-220d-5945-b6bf-af36693fc0a9', '3e4c57c4-25c0-5d00-b57c-bc50841b9b33',
   null, null, '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- content_item_a1_sibling_page, destination a1: page-level under page_a1_sibling, PINNED to the
  -- facebook variant of its own version. The negative half of §8.6 case 4 on this table.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   'f4d8fb50-98fb-5745-8c4f-fab6a0e8f910', '3e4c57c4-25c0-5d00-b57c-bc50841b9b33',
   (select id from app.content_variants
     where content_version_id = '25501c36-a088-5897-9166-f2913f7c6649' and platform = 'facebook'),
   null, '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- content_item_a2, destination a1: under business_a2, outside user_editor_a's member scope.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '0a5bed73-2981-5699-b2a1-e1c1663127f4',
   '5ddfe1bf-ca6e-5077-9a9e-84ad3399b82d', '3e4c57c4-25c0-5d00-b57c-bc50841b9b33',
   null, null, '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- content_item_b1, destination b1: workspace_b. A DISTINCT destination symbol rather than
  -- destination_a1, deliberately. Nothing in this schema would refuse two tenants targeting one
  -- social account -- the column is resolved against nothing at all -- and a fixture that showed
  -- that would be modelling the gap as though it were a design. The gap is in the open blockers.
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3',
   '306426ca-a54a-5e3d-90ec-1feff18372ca', '5ef9c641-9d44-5362-826d-6430f480ec90',
   (select id from app.content_variants
     where content_version_id = '2478a854-613b-5250-b797-eb6d6b347aca' and platform = 'facebook'),
   null, '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (content_item_id, social_account_id) where deleted_at is null do nothing;

-- THE TWO PINS ARE RE-READ, because a subselect that found nothing writes NULL rather than raising
-- and a silently unpinned fixture would make `owner-a-cannot-repin-a-content-target` pass against a
-- row that was never pinned -- a refusal observed on a column whose value nobody set.
do $$
declare
  unpinned integer;
begin
  select count(*) into unpinned
    from app.content_targets t
   where t.content_variant_id is null
     and (t.content_item_id, t.social_account_id) in (
           ('963952b8-b41d-58cd-b10f-ca3a3557fe65'::uuid, '3e4c57c4-25c0-5d00-b57c-bc50841b9b33'::uuid),
           ('f4d8fb50-98fb-5745-8c4f-fab6a0e8f910'::uuid, '3e4c57c4-25c0-5d00-b57c-bc50841b9b33'::uuid),
           ('306426ca-a54a-5e3d-90ec-1feff18372ca'::uuid, '5ef9c641-9d44-5362-826d-6430f480ec90'::uuid));
  if unpinned <> 0 then
    raise exception 'the batch 081 fixture loaded % target(s) whose pin resolved to nothing', unpinned
      using hint = 'The pins are subselects on (content_version_id, platform), the natural key batch '
                   '080''s catalog note fixes for a variant. A subselect that matches no row writes '
                   'NULL instead of failing, so this check is the difference between a pinned fixture '
                   'and one that only looks pinned.';
  end if;
end $$;

commit;
