-- Tenant fixture for the batch 020 isolation cases.
--
-- Owner: A1 Business. It loads AFTER tests/db/identity/fixtures/010-identity-fixture.sql, which
-- creates the workspaces and memberships every row here hangs from; the runner applies both, in
-- order, and a business row cannot exist without its workspace.
--
-- Every id WRITTEN here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented: the cross-tenant cases
-- need tenant A to hold tenant B's REAL id, because proving A cannot reach B by failing to guess
-- B's id proves nothing, and an id nobody can recompute is an unverifiable constant.
--
-- The version rows below write no id at all, and that is the same rule rather than an exception to
-- it. A version is identified by its parent and its ordinal — 020_business.sql makes
-- (business_profile_id, version_number) and (page_context_profile_id, version_number) unique — so
-- every case that addresses an EXISTING version row addresses it through those two columns, both of
-- which are fixed here. Six more catalog symbols would have bought no assertion that pair does not
-- already make, and would have been six more constants to keep in step with this file.
--
-- This file loads ADMINISTRATIVELY, as the table owner, before any identity is assumed. Batch 020
-- writes INSERT policies for owner and admin, so most of what is below COULD be loaded through
-- them; it is not, for the same reason 010's fixture is not — a fixture loader is not an
-- application path, and a fixture that depends on the policies under test cannot distinguish "the
-- policy works" from "the fixture happened to load".
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- Three businesses in workspace A and one in workspace B.
--
--   business_a1  the Business the editor and approver fixtures are scoped to (batch 021 makes
--                that scope real; until then §8.1 gives Business SELECT to every active member).
--   business_a2  the second Business in the same workspace, which batch 021's member scope will
--                exclude the editor from. Batch 020 asserts that it is VISIBLE today, so the day
--                021 narrows it, a test changes in a diff rather than silently.
--   business_a3_archived  archived, so §11.3's "archive closes new creation" has something to bite
--                on. archived_at is a fixed timestamptz rather than now() - interval: every other
--                value in this fixture is a pure function of its symbol, and a fixture whose
--                content depends on when it ran is one whose failures depend on when they ran.
--   business_b1  the far side of the tenant boundary.
insert into app.business_profiles (id, workspace_id, name, archived_at, created_by, updated_by) values
  ('dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'fixture business a1', null,
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('0a5bed73-2981-5699-b2a1-e1c1663127f4', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'fixture business a2', null,
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('de27d341-202e-5f39-813f-9ddf39e4f59b', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'fixture business a3 archived', timestamptz '2026-01-01 00:00:00+00',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   'fixture business b1', null,
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (id) do nothing;

-- One Page Context per live Business. §4 invariant 1: a Page is in one Business and in the same
-- Workspace as that Business, which the composite foreign key enforces — page_a1's workspace_id
-- below is workspace A's because business_a1 is in workspace A, and the database refuses any other
-- pairing.
--
-- No page under business_a3_archived. There is nothing to test with one, and creating it here
-- would put a Page under an archived Business administratively while the INSERT policy refuses
-- exactly that through the request path.
insert into app.page_context_profiles
  (id, workspace_id, business_profile_id, name, created_by, updated_by) values
  ('da6409df-9541-5346-9d2e-447be2a649af', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'fixture page a1',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('b96b06c3-e9b1-5133-b96e-08561e6f966f', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', 'fixture page a2',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('9f06926b-4de1-5bcb-9199-3206f7c3f2ad', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', 'fixture page b1',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (id) do nothing;

-- Version 1 of each live Business and Page. These rows carry no updated_at and no updated_by,
-- because the tables have neither: an immutable row has no update to stamp (§3.2).
--
-- No `id` column, and `on conflict` on the NATURAL key rather than on the primary key. The version
-- number is what every case addressing one of these rows uses, so the natural key is what has to be
-- stable — and idempotency is a property of the same constraint, which means a re-run cannot
-- produce a second version 1 of anything even by accident.
--
-- Their `name` is what the immutability witnesses read. A case that attempts to UPDATE a version
-- and is refused is only half an assertion; the other half is a witness proving the row still says
-- what it said, and that witness needs a value fixed here.
insert into app.business_profile_versions
  (workspace_id, business_profile_id, version_number, name, created_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 1, 'fixture business a1 v1',
   '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', 1, 'fixture business a2 v1',
   '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', 1, 'fixture business b1 v1',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (business_profile_id, version_number) do nothing;

insert into app.page_context_profile_versions
  (workspace_id, business_profile_id, page_context_profile_id, version_number, name, created_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'da6409df-9541-5346-9d2e-447be2a649af', 1,
   'fixture page a1 v1', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', 'b96b06c3-e9b1-5133-b96e-08561e6f966f', 1,
   'fixture page a2 v1', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '9f06926b-4de1-5bcb-9199-3206f7c3f2ad', 1,
   'fixture page b1 v1', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (page_context_profile_id, version_number) do nothing;

commit;
