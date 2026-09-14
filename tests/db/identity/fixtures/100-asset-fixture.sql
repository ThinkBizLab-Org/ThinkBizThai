-- Tenant fixture for the batch 100 isolation cases.
--
-- Owner: A4 Asset. It loads AFTER 010-identity-fixture.sql (the Workspaces and the memberships),
-- 020-business-fixture.sql (business_a1, business_a2, business_b1 and page_a1, which every asset
-- names by composite foreign key), 021-member-scope-fixture.sql (page_a1_sibling, and the member
-- scope that makes user_page_editor_a a single-Page identity) AND 080-content-fixture.sql, which is
-- the first time this list's newest entry depends on the one immediately before it: every content
-- asset link below names a content_version_id over a composite foreign key into
-- app.content_versions, and those rows are batch 080's. The runner applies the whole list in order.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
--
-- §9.1 CLASSES THIS FAMILY `MEDIA-2` AND ITS STORAGE RULE IS "private bucket", SO THERE IS NO MEDIA
-- IN THIS FILE AT ALL. Not a byte, not a base64 string, not a thumbnail. Every version below holds
-- a LOCATOR — a synthetic provider, a synthetic bucket and a synthetic object key — and a DIGEST
-- taken over a string this repository owns. The migration's apply-time allowlist makes a column for
-- the bytes impossible; this file is the other half of the same discipline, because a fixture is
-- where a prohibition is most often broken for convenience and §9.2 names `fixture` in its own list
-- of surfaces.
--
-- THE OBJECT KEYS ARE IN §4.1's CANONICAL SHAPE AND NONE OF THEM IS A PREFIX. Each one is written
-- out in the form §4.1 of the object storage lifecycle contract gives —
-- `v1/tenants/{…}/workspaces/{…}/pages/{…}/assets/{…}/versions/{…}/{state}/{variant}/{object}.{ext}`
-- — with the workspace, asset and version UUIDs being the real fixture ids, so the key is a pure
-- function of the symbols like everything else here. None ends in `/`, none contains `%`, `*`, `?`
-- or `..`, and the `unassigned` segment §4.1 gives for an asset not bound to a Page is used where
-- the asset is business-level. A key that WAS a prefix would satisfy
-- `asset_versions_object_key_names_one_object` nowhere, which is the constraint this file is the
-- positive evidence for.
--
-- THE BUCKET AND THE PROVIDER ARE SYNTHETIC. `thinkbizthai-fixture-private-media` is not a bucket
-- anybody has provisioned, and saying so here matters more than usual: §6.3 makes a real bucket name
-- half of a signed-URL request, and a fixture that named one would be a private URL in a test file.
--
-- NO RETENTION VALUE HERE IS THIRTY DAYS OR TWO YEARS, AND THE ABSENCE IS DELIBERATE. §10 gives
-- ASSET-ORIGINAL "Trash 30 วัน" and RIGHTS-PROOF "อายุ Asset use + 2 ปี default", and §10's own
-- header makes every number in that table an engineering default requiring Product/Security/Legal
-- approval before Paid Beta. A fixture whose trashed asset was purgeable in exactly thirty days
-- would read as the default having been chosen. `asset_a2` is trashed and its `purge_after` is NINE
-- days later — a number no document states, which is the point: it is an approved policy's number
-- standing in for one, and it can be read as nothing else. This is 070's treatment of a snapshot's
-- seven-day retention, in a family with four retention classes instead of one.
--
-- THE FOUR VERSIONS ARE IN TWO STATES, WHICH IS WHAT MAKES THE PURGE COLUMNS LEGIBLE AS DATA. Three
-- are live: each names an object, `purged_at` is null and `status` is `ready`. The A2 version is
-- PURGED — `object_key` is null, `purged_at` is stamped and `status` is `purged`, with the digest
-- and the byte size intact — which is §10's "purge object, versions, signed access" and §11.5's
-- "visible to support as REDACTED STATUS" as an existing row rather than as a sentence. Without the
-- second, `asset_versions_purged_row_names_no_object` and `asset_versions_purged_status_agrees` are
-- constraints no row satisfies in the interesting direction, and `purged_at` is a column nothing
-- exercises.
--
-- `current_version_id` IS SET BY AN UPDATE AFTER THE VERSIONS EXIST, and that statement IS the
-- demonstration that the apparent cycle is not one. `app.asset_versions` references `app.assets`, so
-- `assets_current_version_scope_fk` looks circular; the column is nullable, so the order is asset
-- (null), then version, then this update. No deferral is needed and this batch introduces none
-- (080's fixture does the same for a content item, and a static test asserts both).
--
-- EVERY TIMESTAMP IS A FIXED `timestamptz` RATHER THAN `now()`, for the reason batch 030's fixture
-- gives and 061's and 070's repeat: every other value here is a pure function of its symbol, and a
-- fixture whose content depends on when it ran is one whose failures depend on when they ran. It
-- matters twice over here, because `purge_after >= deleted_at` is a constraint and
-- `purge_after <= now()` is the query batch 160's sweep will ask.
--
-- THE RIGHTS ROWS DIFFER IN THE COLUMNS §9.1 WITHHOLDS. The A-side record is `owned`/`valid` and
-- carries no `owner_name`, no proof and no note; the B-side record is `licensed`/`valid` and carries
-- ALL FOUR of the columns the client SELECT grant excludes. That asymmetry is what makes the
-- RIGHTS-3 projection falsifiable: a case asserting that a member cannot read a proof would pass
-- against a database where no proof was ever stored.
--
-- THIS FILE LOADS ADMINISTRATIVELY, as the table owner, before any identity is assumed. On
-- app.asset_versions and app.content_asset_links that is the only way: batch 100 writes NO INSERT
-- policy on either, because §5 makes a version immutable and a link is refused a client INSERT for
-- the two reasons the migration's header gives. On app.assets and app.asset_rights an INSERT policy
-- DOES exist and the fixture still does not use it, for the reason every fixture in this repository
-- gives: "a fixture that depends on the policies under test cannot distinguish 'the policy works'
-- from 'the fixture happened to load'".
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- ---------------------------------------------------------------------------------------------
-- The assets. Five, because the asset is the one table here with §4 invariant 3's two-column scope.
-- ---------------------------------------------------------------------------------------------
--
-- Each carries exactly one control, which is this fixture's rule and 020's before it: one row
-- carrying two unrelated controls is how a case starts failing for the other one's reason.
--
--   asset_a1               business-level. The `then` branch of the narrowing, and the parent of the
--                          A-side version, rights record and link.
--   asset_a1_page          page-level under page_a1. The `else` branch, and the POSITIVE half of
--                          §8.6 case 4 — user_page_editor_a is scoped to page_a1.
--   asset_a1_sibling_page  page-level under page_a1_sibling. The NEGATIVE half of case 4: a refusal
--                          here is refusal by PAGE scope inside a Business the member is otherwise
--                          admitted to, which asset_a2 cannot show.
--   asset_a2               under business_a2, outside user_editor_a's scope. §8.6 case 3. It is also
--                          the TRASHED asset, so `deleted_at`, `purge_after` and the purged version
--                          below all have a row.
--   asset_b1               under workspace_b. §8.6 case 5.
--
-- `created_by` is the workspace OWNER on each side, which is a real identity and not a placeholder:
-- §8.6 case 8 is asserted on the INSERT policy's `created_by = (select auth.uid())` and on the
-- UPDATE policy's `updated_by`, and both need a row whose actor is somebody other than the caller.
insert into app.assets
  (id, workspace_id, business_profile_id, page_context_profile_id, kind, title, source,
   deleted_at, purge_after, created_by, updated_by) values
  ('61748f20-e42b-575e-a4a3-dcc3474200ef', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', null,
   'image', 'fixture asset a1 business', 'upload',
   null, null, '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('89bb118e-f3a4-5ca3-ac1d-b1644c50a40a', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'da6409df-9541-5346-9d2e-447be2a649af',
   'image', 'fixture asset a1 page', 'upload',
   null, null, '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('e57b1566-203f-5e5b-adc1-5b951f7b8c80', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'b45dc73c-00e3-5e14-91ef-026dcbc29a7f',
   'video', 'fixture asset a1 sibling page', 'upload',
   null, null, '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- THE TRASHED ASSET. §11.5's "User delete = move to Trash", as a row. Its purge window is nine
  -- days, which is not §10's thirty; see the header.
  ('9ffb84fd-72ae-5774-b0b0-206d404ac66a', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', null,
   'image', 'fixture asset a2 business', 'ai_generated',
   timestamptz '2026-09-01 10:00:00+00', timestamptz '2026-09-10 10:00:00+00',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('10b4861c-ecac-5c71-90bb-315844298122', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', null,
   'image', 'fixture asset b1 business', 'upload',
   null, null, '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------------------------
-- The versions. Four, in two states, with §4.1's canonical key shape and no media.
-- ---------------------------------------------------------------------------------------------
--
-- asset_version_a1_sibling_page is not a spare. A version carries no page column of its own, so
-- batch 100's whole child design is that its restrictive policy resolves through app.assets — and
-- asserted only against a BUSINESS-level parent, that claim would still hold if somebody replaced
-- the `exists()` with `member_scope_admits_business(workspace_id, business_profile_id)`. This row is
-- what makes the page half of it falsifiable: user_page_editor_a is admitted to business_a1 and must
-- still be refused a version whose asset is restricted to a sibling Page.
--
-- The digests are over strings this repository owns and are DIFFERENT on every row, so a version is
-- distinguishable from a copy of itself. `sha256()` from `pg_catalog` rather than pgcrypto's
-- `digest()`, for batch 010's measured reason: `public.digest` does not exist on the provisioned
-- instance, where pgcrypto lives in `extensions`.
insert into app.asset_versions
  (id, workspace_id, business_profile_id, asset_id, version_no, purpose, storage_provider, bucket,
   object_key, original_filename, detected_mime, byte_size, width, height, sha256, status,
   purged_at, created_by) values
  ('6bb3f989-3ba7-55d2-bd87-d0185b65bc88', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '61748f20-e42b-575e-a4a3-dcc3474200ef', 1,
   'original', 'supabase', 'thinkbizthai-fixture-private-media',
   'v1/tenants/fixture/workspaces/c4840acc-0323-5e13-b1d3-c18d7eb615cb/pages/unassigned/assets/61748f20-e42b-575e-a4a3-dcc3474200ef/versions/6bb3f989-3ba7-55d2-bd87-d0185b65bc88/ready/original/object.jpg',
   'fixture-a1.jpg', 'image/jpeg', 128000, 1080, 1080,
   sha256(convert_to('fixture asset object a1', 'utf8')), 'ready',
   null, '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('f46c51f4-d530-5a75-97c9-c4a98a9e7c73', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'e57b1566-203f-5e5b-adc1-5b951f7b8c80', 1,
   'original', 'supabase', 'thinkbizthai-fixture-private-media',
   'v1/tenants/fixture/workspaces/c4840acc-0323-5e13-b1d3-c18d7eb615cb/pages/b45dc73c-00e3-5e14-91ef-026dcbc29a7f/assets/e57b1566-203f-5e5b-adc1-5b951f7b8c80/versions/f46c51f4-d530-5a75-97c9-c4a98a9e7c73/ready/original/object.mp4',
   'fixture-a1-sibling.mp4', 'video/mp4', 4096000, 1080, 1920,
   sha256(convert_to('fixture asset object a1 sibling page', 'utf8')), 'ready',
   null, '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- THE PURGED VERSION. §10's "purge object, versions, signed access" and §9.3/11's "อัปเดต
  -- deleted_at/purged_at แบบ idempotent" as a row: the locator is gone, the digest and the byte size
  -- remain, and the status says so. It belongs to the trashed asset, which is the only combination
  -- §7.4's state machine reaches.
  ('186d2d8f-1c09-5eb9-9cc6-cd3b5b24b49f', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', '9ffb84fd-72ae-5774-b0b0-206d404ac66a', 1,
   'original', 'supabase', 'thinkbizthai-fixture-private-media',
   null,
   'fixture-a2.jpg', 'image/jpeg', 64000, 720, 720,
   sha256(convert_to('fixture asset object a2', 'utf8')), 'purged',
   timestamptz '2026-09-11 10:00:00+00', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('a23ae773-6056-5fc9-9ca2-e520526c7db0', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '10b4861c-ecac-5c71-90bb-315844298122', 1,
   'original', 'supabase', 'thinkbizthai-fixture-private-media',
   'v1/tenants/fixture/workspaces/43fd5c24-ebea-528f-9ce9-eedf1f8f9765/pages/unassigned/assets/10b4861c-ecac-5c71-90bb-315844298122/versions/a23ae773-6056-5fc9-9ca2-e520526c7db0/ready/original/object.jpg',
   'fixture-b1.jpg', 'image/jpeg', 256000, 1200, 900,
   sha256(convert_to('fixture asset object b1', 'utf8')), 'ready',
   null, '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------------------------
-- The pointer, and the statement that shows the apparent cycle is not one.
-- ---------------------------------------------------------------------------------------------
--
-- `assets_current_version_scope_fk` points app.assets at app.asset_versions while
-- `asset_versions_asset_scope_fk` points back; the column is nullable, so the order is asset, then
-- version, then this. NOTHING IN THE RUNNING SYSTEM CAN ISSUE THIS STATEMENT: `current_version_id`
-- is outside every INSERT grant and every UPDATE grant to every client role, and app_worker holds it
-- with no policy. This fixture runs as the table owner before any identity is assumed, which is why
-- it can — and the gap that makes that the only writer is an open blocker rather than a property.
update app.assets a
   set current_version_id = v.id
  from app.asset_versions v
 where v.workspace_id = a.workspace_id
   and v.business_profile_id = a.business_profile_id
   and v.asset_id = a.id
   and v.version_no = 1
   and a.current_version_id is null;


-- ---------------------------------------------------------------------------------------------
-- The rights. Three, and the two sides differ in exactly the columns §9.1 withholds.
-- ---------------------------------------------------------------------------------------------
--
-- §9.1's RIGHTS-3 client projection is "status/expiry, PROOF BY PERMISSION", so `owner_name`,
-- `proof_asset_id`, `proof_url` and `note` are outside the authenticated SELECT grant. The B-side
-- record carries all four; the A-side record carries none. A case asserting that a member cannot
-- read a proof would otherwise pass against a database where no proof was ever stored.
--
-- `expires_at` is set on the sibling-page record and null on the other two: §5.1's "Rights expiry
-- notification" index is partial on `rights_status in ('valid','expiring')`, and a fixture in which
-- no row was ever `expiring` would leave that branch unexercised. No expiry here is two years out;
-- see the header.
insert into app.asset_rights
  (id, workspace_id, business_profile_id, asset_id, rights_type, rights_status, owner_name,
   allowed_channels, paid_ads_allowed, ai_edit_allowed, starts_at, expires_at, proof_asset_id,
   proof_url, note, created_by, updated_by) values
  ('b3f5d2d0-2342-5f66-8059-e36fcd228329', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '61748f20-e42b-575e-a4a3-dcc3474200ef',
   'owned', 'valid', null,
   array['facebook', 'instagram']::text[], false, false,
   timestamptz '2026-09-01 00:00:00+00', null, null,
   null, null, '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('2fc1efad-314b-505b-bfcb-56240ef870b6', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'e57b1566-203f-5e5b-adc1-5b951f7b8c80',
   'consent', 'expiring', null,
   array['facebook']::text[], false, false,
   timestamptz '2026-09-01 00:00:00+00', timestamptz '2026-09-20 00:00:00+00', null,
   null, null, '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- THE RECORD THAT CARRIES A PROOF. Every column §9.1 withholds from a client is populated here,
  -- and the proof is itself an asset of the same Business — asset_b1, which is what
  -- `asset_rights_proof_asset_scope_fk` holds it to.
  ('f578ab21-7884-5457-8cde-a3396fd30ddd', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '10b4861c-ecac-5c71-90bb-315844298122',
   'licensed', 'valid', 'fixture rights holder b1',
   array['facebook', 'instagram', 'paid_ads']::text[], true, false,
   timestamptz '2026-09-01 00:00:00+00', null, '10b4861c-ecac-5c71-90bb-315844298122',
   'https://example.com/fixture/licence-b1', 'fixture rights note b1',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------------------------
-- The links. No symbol: §4.7's own logical key addresses them.
-- ---------------------------------------------------------------------------------------------
--
-- A link is addressed by (workspace_id, business_profile_id, content_version_id, content_variant_id,
-- role, sort_order), which `content_asset_links_logical_key` makes unique — and makes unique for a
-- null variant too, because it is declared NULLS NOT DISTINCT. Every row below leaves
-- `content_variant_id` null, which is what puts that declaration under test: under Postgres's
-- default these three rows could each be inserted a second time, and the `on conflict` clause would
-- silently stop protecting anything.
--
-- `on conflict on constraint content_asset_links_logical_key` names the CONSTRAINT rather than
-- inferring an index from a column list, which is 021's rule: inference over a column list is
-- exactly where a re-run quietly inserts a second copy.
--
-- THE A-SIDE LINK PINS A `ready` VERSION AND THE SIBLING-PAGE LINK PINS ANOTHER, so the two-parent
-- narrowing has a positive on both branches. There is no link on the trashed asset: §7.4 blocks a
-- hard purge on a referenced asset, and a fixture that referenced the purged version would be
-- asserting a state §11.5 forbids the system to reach.
-- NO `id` COLUMN IN THIS INSERT, and that is the catalog's rule rather than an omission: a link has
-- a natural key, so it carries no symbol, and a uuid written here that no symbol generates would be
-- an unverifiable constant — which is the one thing db/foundation/seeds/fixture-catalog.json exists
-- to prevent, and which a static test refuses by name. The default supplies the id.
insert into app.content_asset_links
  (workspace_id, business_profile_id, content_version_id, content_variant_id, asset_id,
   asset_version_id, role, sort_order, platform, created_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '0516429c-c4af-5c3c-93fa-69844a240195', null,
   '61748f20-e42b-575e-a4a3-dcc3474200ef', '6bb3f989-3ba7-55d2-bd87-d0185b65bc88',
   'cover', 0, null, '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '25501c36-a088-5897-9166-f2913f7c6649', null,
   'e57b1566-203f-5e5b-adc1-5b951f7b8c80', 'f46c51f4-d530-5a75-97c9-c4a98a9e7c73',
   'cover', 0, null, '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '2478a854-613b-5250-b797-eb6d6b347aca', null,
   '10b4861c-ecac-5c71-90bb-315844298122', 'a23ae773-6056-5fc9-9ca2-e520526c7db0',
   'cover', 0, null, '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict on constraint content_asset_links_logical_key do nothing;

commit;
