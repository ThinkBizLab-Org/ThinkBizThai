-- Tenant AND GLOBAL fixture for the batch 030 isolation cases.
--
-- Owner: A2 Industry. It loads AFTER 010-identity-fixture.sql, 020-business-fixture.sql and
-- 021-member-scope-fixture.sql; the runner applies all four in order, and an industry assignment
-- cannot exist without the Workspace, the Business and the published pack version it names.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
-- THIS IS THE FIRST FIXTURE THAT LOADS A ROW BELONGING TO NO TENANT, and the three pack rows below
-- are it. They carry no workspace_id because the tables have none: §5 scopes this family
-- "global/business" and §3.3 requires the canonical scope field on tenant-owned rows only. Their
-- catalog symbols carry no `_a` or `_b` suffix for the same reason — every other symbol names the
-- workspace its row lives in, and one on these would assert a boundary the row does not have.
--
-- THE CHECKSUM IS COMPUTED, NOT PASTED. The industry pack contract requires every consumer to pin
-- `pack_id + version + checksum`, and 030_industry.sql constrains the column to `sha256:<64 hex>`.
-- A hex string typed into this file would be exactly the unverifiable constant the fixture catalog
-- exists to refuse, so each one is sha256 of the version's own catalog SYMBOL — a pure function of
-- the symbol, recomputable by anyone, and different for the two versions because the symbols differ.
-- sha256() is in pg_catalog and needs no extension; a schema-qualified pgcrypto call would run in
-- one environment and not the other, which is the failure batch 020's fixture records.
--
-- WHO IS PINNED AND WHO IS DELIBERATELY NOT. Batch 030's cases need three states to exist at once,
-- and each one is a case that would otherwise be vacuous:
--
--   business_a1   pinned to v1. The row the scoped editor may re-pin, and the A-side half of the
--                 pair that proves the catalog is GLOBAL.
--   business_a2   pinned to v2. Outside user_editor_a's member scope, so
--                 `editor-a-scope-does-not-reach-the-industry-assignment-of-business-a2` is a
--                 negative about the restrictive policy rather than about a row that is not there —
--                 and `owner-a-is-unscoped-and-sees-the-industry-assignment-of-business-a2` is what
--                 stops it from being satisfied by the row being hidden from everybody. It is
--                 pinned to a DIFFERENT version from business_a1 so a `no-effect` witness reads back
--                 a value that would visibly change if the write had gone through.
--   business_a3   ARCHIVED and unassigned. §11.3 closes new creation under an archived Business and
--                 030's INSERT policies refuse one; that case needs a free slot under an archived
--                 parent, and a pre-pinned row would have made the refusal ambiguous between the
--                 policy and the zero-or-one unique constraint.
--   business_a4   live and unassigned. The only target the permitted INSERT can use, because every
--                 other live Business in workspace A must already carry an assignment.
--   business_b1   pinned to v1 — THE SAME GLOBAL ROW business_a1 names. Two tenants, one catalog
--                 row, and neither owner can see the other's assignment. That pair is what "global"
--                 means, asserted as data rather than as a comment.
--
-- This file loads ADMINISTRATIVELY, as the table owner, before any identity is assumed. Batch 030
-- writes INSERT policies for the owner and for a scoped editor, so the assignment rows COULD be
-- loaded through them; they are not, for the reason every fixture before this one gives — a fixture
-- that depends on the policies under test cannot distinguish "the policy works" from "the fixture
-- happened to load". The pack rows could not be loaded through a policy at all: there is none.
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- The fourth Business in workspace A. Live, so §11.3 has nothing to say about it, and unassigned,
-- so batch 030's permitted INSERT has a target. It is a new Business rather than a reuse of
-- business_a2 for the reason business_a3_archived and page_a1_sibling were new: one fixture row
-- carrying two unrelated controls is how a case starts failing for the other one's reason.
insert into app.business_profiles (id, workspace_id, name, archived_at, created_by, updated_by) values
  ('2ffb7f0e-f5f3-5763-a3d4-16dd4c4fae30', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'fixture business a4 unassigned', null,
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f')
on conflict (id) do nothing;

-- Its version 1, so the new Business has history like every other one. Keyed on the natural key, as
-- batch 020's fixture is: `on conflict (id)` on a row with no id would be a no-op that silently
-- inserted a second version 1 on every re-run.
insert into app.business_profile_versions
  (workspace_id, business_profile_id, version_number, name, created_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '2ffb7f0e-f5f3-5763-a3d4-16dd4c4fae30', 1, 'fixture business a4 v1',
   '5c460eb8-0710-557a-b423-f9b12c76834f')
on conflict (business_profile_id, version_number) do nothing;

-- The global catalog row. No workspace_id, no created_by, no updated_by: §3.2 asks for the actor
-- columns on a row a USER mutates, and no user mutates this one. `pack_id` is the stable key §6
-- invariant 5 requires of a global seed, and it is what makes this insert re-runnable.
insert into app.industry_packs (id, pack_id, industry_key, publisher) values
  ('e19d29b8-7c06-542c-8ea3-4919cf7e0ab6', 'th.sme.interior-built-in',
   'interior_built_in', 'platform-curated')
on conflict (pack_id) do nothing;

-- Two published versions of it. `released_at` is a FIXED timestamptz rather than now(): every other
-- value in this fixture is a pure function of its symbol, and a fixture whose content depends on
-- when it ran is one whose failures depend on when they ran (batch 020's sentence about
-- business_a3_archived, one table over).
--
-- ON CONFLICT names the natural key (industry_pack_id, version) rather than the primary key, so a
-- re-run cannot produce a second publication of the same version even if the id were regenerated.
insert into app.industry_pack_versions
  (id, industry_pack_id, version, display_name_th, checksum, released_at) values
  ('ff1faf5e-a13e-56d9-a18b-eaa824d67074', 'e19d29b8-7c06-542c-8ea3-4919cf7e0ab6',
   '1.0.0', 'ออกแบบตกแต่งและบิวท์อิน',
   'sha256:' || encode(sha256(convert_to('thinkbizthai.fixture.industry_pack_interior_v1', 'utf8')), 'hex'),
   timestamptz '2026-06-01 00:00:00+00'),
  ('28075fbf-06f2-5f98-9557-02bbc04822ec', 'e19d29b8-7c06-542c-8ea3-4919cf7e0ab6',
   '1.1.0', 'ออกแบบตกแต่งและบิวท์อิน',
   'sha256:' || encode(sha256(convert_to('thinkbizthai.fixture.industry_pack_interior_v2', 'utf8')), 'hex'),
   timestamptz '2026-08-01 00:00:00+00')
on conflict (industry_pack_id, version) do nothing;

-- The assignments. `created_by` and `updated_by` are the WORKSPACE OWNER on each side of the
-- boundary, which is who §8.1 gives the Business write to and who 030's INSERT policy asserts the
-- JWT subject equals.
--
-- business_a1 and business_b1 name the SAME global version id, across the tenant boundary, on
-- purpose. No case asserts that by reading both rows — no identity can — so it is asserted by two
-- positives, one per owner, each naming that id in its own WHERE clause.
insert into app.industry_assignments
  (workspace_id, business_profile_id, industry_pack_version_id, created_by, updated_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   'ff1faf5e-a13e-56d9-a18b-eaa824d67074',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '0a5bed73-2981-5699-b2a1-e1c1663127f4',
   '28075fbf-06f2-5f98-9557-02bbc04822ec',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3',
   'ff1faf5e-a13e-56d9-a18b-eaa824d67074',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
-- Keyed on the zero-or-one constraint §4's ERD requires, which is also the pair every case
-- addresses an assignment through.
on conflict (workspace_id, business_profile_id) do nothing;

commit;
