-- Tenant fixture for the batch 021 isolation cases.
--
-- Owner: A1 Identity/Business. It loads AFTER 010-identity-fixture.sql and 020-business-fixture.sql,
-- which create the workspaces, memberships, Businesses and Pages every row here references by
-- composite foreign key; the runner applies all three in order, and a scope row cannot exist
-- without the member and the target it names.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
-- The SCOPE ROWS below write no id at all, and that is the same rule rather than an exception to
-- it. 021_member_scope.sql makes (workspace_id, user_id, scope_type, business_profile_id,
-- page_context_profile_id) unique with NULLS NOT DISTINCT, so a member and a target name at most
-- one row and every case that addresses an existing scope addresses it through columns this
-- catalog already fixes.
--
-- This file loads ADMINISTRATIVELY, as the table owner, before any identity is assumed. Batch 021
-- writes an INSERT policy for the workspace owner, so most of what is below COULD be loaded through
-- it; it is not, for the reason 010's and 020's fixtures give — a fixture that depends on the
-- policies under test cannot distinguish "the policy works" from "the fixture happened to load".
--
-- WHO IS SCOPED HERE AND WHO IS DELIBERATELY NOT. Batch 021 reads §7 as "a member with no scope row
-- is not narrowed", so the fixture has to carry BOTH states or the reading is untested:
--
--   user_owner_a          NO SCOPE ROW. The control for absence. Every case batch 020 wrote for
--                         this identity must keep passing, and `owner-a-is-unscoped-and-sees-
--                         business-a2` asserts it directly.
--   user_editor_a         business → business_a1. §12.6 calls this identity "editor scoped
--                         business_a1/page_a1"; §7 defines a `business` scope as one Business
--                         INCLUDING the Pages under it, so page_a1 is inside this single row and a
--                         second row naming it would assert nothing the first does not.
--   user_approver_a       business → business_a1, which is what §12.6 calls it.
--   user_viewer_a         all_businesses. The only live row of §7's third scope type, and the case
--                         that keeps `member_scope_is_narrowed` honest: this identity IS narrowed
--                         and still sees business_a2, so a helper that answered "narrowed therefore
--                         excluded" would fail here rather than passing everywhere.
--   user_suspended_a      business → business_a1. Suspended members are given a scope row ON
--                         PURPOSE: without one, `suspended-a-sees-zero-scope-rows` would pass
--                         against a table that simply has no row for them, which is the vacuous
--                         shape every negative in this suite is written to avoid.
--   user_page_editor_a    page → page_a1. The identity §8.6 case 4 is about.
--   user_owner_b          business → business_b1. So the cross-tenant scope read has a row on the
--                         far side to fail to reach, and so `owner-b-sees-their-own-scope-row` is a
--                         positive on the B side rather than an assertion about an empty table.
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- The member §8.6 case 4 needs. An EDITOR, because case 4 is about a member whose write and read
-- surface is narrowed to a Page, and because the editor is the role §8.1 marks `P` — so this
-- identity also exercises the editor's conditional grant at Page granularity.
insert into app.user_profiles (user_id, display_name, locale, timezone) values
  ('c31e3c84-009e-5a2e-8680-a6622f8c848e', 'fixture page editor a', 'th-TH', 'Asia/Bangkok')
on conflict (user_id) do nothing;

insert into app.workspace_members (workspace_id, user_id, role, status, created_by, updated_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'c31e3c84-009e-5a2e-8680-a6622f8c848e', 'editor', 'active',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f')
on conflict (workspace_id, user_id) do nothing;

-- The second Page under business_a1. page_a2 cannot serve: it is under business_a2, so a member
-- refused it has been refused by BUSINESS scope, and §8.6 case 4 is the level below that.
insert into app.page_context_profiles
  (id, workspace_id, business_profile_id, name, created_by, updated_by) values
  ('b45dc73c-00e3-5e14-91ef-026dcbc29a7f', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'fixture page a1 sibling',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f')
on conflict (id) do nothing;

-- Its version 1, so the sibling Page has history for the narrowing to be asserted against. Keyed on
-- the natural key, as batch 020's fixture is: `on conflict (id)` on a row with no id would be a
-- no-op that silently inserted a second version 1 on every re-run.
insert into app.page_context_profile_versions
  (workspace_id, business_profile_id, page_context_profile_id, version_number, name, created_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'b45dc73c-00e3-5e14-91ef-026dcbc29a7f', 1,
   'fixture page a1 sibling v1', '5c460eb8-0710-557a-b423-f9b12c76834f')
on conflict (page_context_profile_id, version_number) do nothing;

-- The scope rows. `created_by` is the WORKSPACE OWNER on every one of them and `user_id` is the
-- member receiving the scope: the two are different people, which is exactly what 021's INSERT
-- policy asserts about a request-path write and what a fixture writing both as the same id would
-- make impossible to see.
insert into app.workspace_member_scopes
  (workspace_id, user_id, scope_type, business_profile_id, page_context_profile_id, created_by, updated_by) values
  -- editor: one Business, and every Page under it (§7).
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'a324d4a6-15a3-5e15-9193-eed9d50b5d91',
   'business', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', null,
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- approver: the same Business, which is what §12.6 calls this identity.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'fecceb8f-d60b-54bc-97cd-fccee216e34b',
   'business', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', null,
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- viewer: §7's third scope type, live rather than merely permitted by a CHECK constraint.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'd884d3c1-89a0-5600-ae81-c368f6574821',
   'all_businesses', null, null,
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- suspended: a row that EXISTS and must be invisible, so §12.6/5 has something to hide.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '9b10ac91-406b-5322-9755-bfb16b0b4aa3',
   'business', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', null,
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- page editor: one Page. §8.6 case 4.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'c31e3c84-009e-5a2e-8680-a6622f8c848e',
   'page', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'da6409df-9541-5346-9d2e-447be2a649af',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- the far side of the tenant boundary, so the cross-tenant scope read has a row to fail to reach.
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '297ad853-58a6-5e83-87e1-f936f9c3ddff',
   'business', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', null,
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
-- ON CONFLICT names the CONSTRAINT rather than inferring an index from a column list. The unique
-- index is NULLS NOT DISTINCT, and inference over five columns three of which are null on some rows
-- is exactly the place a re-run would quietly insert a second copy instead of doing nothing.
on conflict on constraint workspace_member_scopes_one_per_target do nothing;

commit;
