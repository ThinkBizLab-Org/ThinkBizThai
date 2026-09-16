-- Tenant fixture for the batch 120 isolation cases.
--
-- Owner: A6 Publisher. It loads LAST, after 010 (workspaces and memberships), 020 (the Businesses),
-- 021 (page_a1_sibling and the single-Page member scope), 080 (the content items, versions and
-- variants), 081 (the content targets these sends resolve), 110 (the social accounts they name) and
-- 100 (the asset versions they pin). The runner applies the whole list in order.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
--
-- THIS FIXTURE WRITES THREE ROWS INTO A TABLE ANOTHER BATCH OWNS, AND SAYS SO RATHER THAN LEAVING A
-- READER TO FIND THEM. app.publish_targets.content_variant_id is NOT NULL -- a send that has not
-- chosen what to send is not a send -- and batch 080's fixture loads exactly three variants, all
-- `facebook`, on the versions of content_item_a1, content_item_a1_sibling_page and content_item_b1.
-- Three sends here need a variant that does not exist, and one case needs an AIM that does not:
--
--   (content_version_a1, 'instagram')             the Instagram half of intent a1's fan-out
--   (version 1 of content_item_a2, 'facebook')     the send under business_a2, which §8.6 case 3 needs
--   (version 1 of content_item_a1_page, 'facebook')  NOT for a fixture row -- for the send the four
--                                                 fan-out cases attempt, which must be WELL FORMED so
--                                                 that it lands when the CI negative control disables
--                                                 row level security. `facebook` because the aim those
--                                                 cases name points at social_account_a1, whose kind
--                                                 is `fb`.
--
-- The AIM that send is against is batch 081's own (content_item_a1_page, social_account_a1), which no
-- send in this fixture uses. AN EARLIER DRAFT ADDED A SEVENTH AIM INSTEAD AND THE LIVE RUN REFUSED IT:
-- every free (item, destination) pair in workspace A is already the subject of one of batch 081's own
-- insert cases, whose `why` says in terms that the pair is one no fixture row holds so that the insert
-- LANDS with row level security disabled -- and loading a row on one of them turned two of 081's
-- positives into 23505. Batch 120 fixes ids instead, which takes nothing from anybody.
--
-- The alternative was to make the pin nullable, which would have deleted the one thing ADR-012 asks
-- of a publish target ("ต้อง pin asset_version_id ที่ใช้จริง ห้ามอ้างคำว่า latest", and the same for the
-- content variant). Writing the rows from here is the smaller cost and it is visible in a diff --
-- and it keeps batches 080's and 081's own merged fixtures untouched.
--
-- ONE OF THOSE THREE ROWS CARRIES A FIXED ID AND THE OTHER TWO DO NOT, and the split is the catalog's
-- rule with a clause batch 120 is the first to need (see
-- `_two_batch_120_symbols_for_rows_whose_owning_batches_give_none`). A case resolves a natural key
-- with a subselect, and a subselect runs AS THE CASE'S IDENTITY -- and batches 080 and 081 grant
-- app_worker NOTHING on app.content_variants or app.content_targets. So the four fan-out cases, one
-- of which is the service's, would have been refused on app.content_variants at the PRIVILEGE layer
-- instead of on app.publish_targets at the POLICY layer, and would have passed while proving nothing.
-- Their aim and their variant are therefore PARAMETERS, which makes both symbols -- the aim by batch
-- 120 fixing batch 081's six target ids, the variant by this row. The other two variants are reached
-- only by this fixture, which runs as a role that can read anything, so they keep 080's addressing.
--
--
-- WHAT THIS FIXTURE HAS TO CARRY
--
-- FIVE INTENTS OVER FIVE ITEMS, one per scope outcome, and FIVE SENDS beneath four of them:
--
--   publish_intent_a1               business-level, `now`. TWO targets: the Facebook send SUCCEEDS
--                                   with a job and a post, the Instagram send FAILS with a job, a
--                                   failure class and NO post. That pair is §4 invariant 7 -- "FB และ
--                                   IG เป็น Publish Target แยกกัน; partial success ไม่ rollback target ที่
--                                   สำเร็จ" -- as two rows rather than as a sentence, and it is what
--                                   `owner-a-sees-exactly-one-published-post-for-intent-a1` counts.
--   publish_intent_a1_page          page-level under page_a1, `now`, and NO TARGET AT ALL. The
--                                   absence is the point: publish_targets_one_per_destination is
--                                   unique over (publish_intent_id, social_account_id), so this is
--                                   the only intent against which the service's refused fan-out can
--                                   attempt a row that would LAND with row level security off.
--   publish_intent_a1_sibling_page  page-level under page_a1_sibling, `scheduled` -- the second value
--                                   of §4.8's vocabulary, exercised once. Its ONE target is `pending`
--                                   with NO job, NO post and NO asset pin, which is what the other
--                                   three policy-layer service cases insert against.
--   publish_intent_a2               under business_a2, outside user_editor_a's member scope, with a
--                                   target, a job and a post. §8.6 case 3, on four tables at once.
--   publish_intent_b1               workspace_b's own, with a target, a job and a post. §8.6 case 5.
--
-- EACH ROW CARRIES ONE CONTROL, which is 020's fixture rule, and the two exceptions are stated:
-- publish_intent_a1 is both the business-level positive and the partial-success pair, and
-- publish_target_a1_fb is both the successful send and the row the asset pin hangs off. Neither is
-- asserted in the same statement as the other.
--
-- `updated_by` IS FILLED ON EVERY INTENT even though the column is nullable, because it is the
-- witness for every `no-effect` case on that table: §6.4 of
-- evidence/WP-0A-DB-00/parallel-integration-2026-09-07.md records that the driver reads psql's CSV,
-- that CSV has no NULL, and that a witness comparing against `null` holds against every correct
-- database. On the target and the job the witness is `status`, which is NOT NULL, carries the
-- Product Owner's vocabulary, and is a column the refused write actually SETS.
--
-- THE FIVE SENDS RESOLVE THEIR AIM BY SUBSELECT even though every aim now has a fixed id, and the
-- reason is that a subselect here is SAFE in the way 081's variant pins are not: `content_target_id`
-- is NOT NULL, so one that matched nothing raises 23502 at load rather than writing a row that looks
-- bound. The address is (content_item_id, social_account_id), batch 081's own natural key, which is
-- what a reader checks these five rows against. Only the CASES need the id, and only for the sixth
-- aim -- the one no send uses.
--
-- This file loads ADMINISTRATIVELY, as the connection role, before any identity is assumed -- 020's
-- rule: "a fixture that depends on the policies under test cannot distinguish 'the policy works'
-- from 'the fixture happened to load'". Every table here is FORCE ROW LEVEL SECURITY, so only a
-- BYPASSRLS role can write these rows, which is what the connection role is and what every identity
-- in the suite deliberately is not.
--
-- Idempotent, so a suite can be re-run without a reset. Every conflict target names a CONSTRAINT
-- rather than an inferred column list.

begin;

-- ---------------------------------------------------------------------------------------------
-- The three variants batch 080's fixture had no occasion to load. See the header.
-- ---------------------------------------------------------------------------------------------
insert into app.content_variants
  (id, workspace_id, business_profile_id, content_version_id, platform, variant_type, body, created_by) values
  -- The Instagram half of intent a1's fan-out. 080's logical key is NULLS NOT DISTINCT over
  -- (workspace, business, version, platform, variant_type), so an untyped `instagram` variant sits
  -- beside the untyped `facebook` one without colliding. `default` for the id, because no case holds
  -- this row's id: the fixture reaches it by 080's own natural key, as 080's fixture does.
  (default, 'c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   '0516429c-c4af-5c3c-93fa-69844a240195', 'instagram', null,
   'fixture content variant a1 instagram', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- business_a2's send. Its version id is one 080's fixture let default, so it is addressed by
  -- (content_item_id, version_no) -- 090's fixture does the same for the same rows.
  (default, 'c4840acc-0323-5e13-b1d3-c18d7eb615cb', '0a5bed73-2981-5699-b2a1-e1c1663127f4',
   (select v.id from app.content_versions v
     where v.content_item_id = '5ddfe1bf-ca6e-5077-9a9e-84ad3399b82d' and v.version_no = 1),
   'facebook', null,
   'fixture content variant a2 facebook', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- The variant the REFUSED fan-out names. No publish target uses it; it exists so that the insert
  -- `service-cannot-fan-out-a-publish-target` attempts is well formed and lands with RLS off. IT IS
  -- THE ONE VARIANT IN THIS SUITE WITH A FIXED ID, because the case must hold that id as a PARAMETER
  -- -- see the catalog note `_two_batch_120_symbols_for_rows_whose_owning_batches_give_none`: a
  -- subselect would run as app_worker, which batch 080 grants nothing on app.content_variants, so the
  -- case would have been refused on the wrong table at the wrong layer and would have passed.
  -- `instagram` rather than `facebook`, so the send the case attempts agrees with the account it
  -- names: nothing holds a variant's platform to its destination's kind, and a case relying on that
  -- gap would be demonstrating it as though it were a feature.
  ('79e86282-47a4-530e-95c3-b81bc0d0b253',
   'c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   (select v.id from app.content_versions v
     where v.content_item_id = 'ddefe11d-220d-5945-b6bf-af36693fc0a9' and v.version_no = 1),
   'facebook', null,
   'fixture content variant a1 page facebook', '5c460eb8-0710-557a-b423-f9b12c76834f')
on conflict on constraint content_variants_logical_key do nothing;




-- ---------------------------------------------------------------------------------------------
-- The five intents.
-- ---------------------------------------------------------------------------------------------
-- The pinned version is a subselect on (content_item_id, version_no) for the two items whose
-- version id batch 080 let default, and the catalog id for the three it fixed. Either way the
-- four-column key publish_intents_pinned_version_fk resolves the pin through the ITEM, so a version
-- of another item cannot be pinned here even by accident.
insert into app.publish_intents
  (id, workspace_id, business_profile_id, content_item_id, content_version_id, requested_by,
   request_kind, idempotency_key, created_by, updated_by) values
  -- Business-level, `now`. The parent of the partial-success pair.
  ('26ffa0f3-5c74-5398-b5c1-2904e624d546', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '963952b8-b41d-58cd-b10f-ca3a3557fe65',
   '0516429c-c4af-5c3c-93fa-69844a240195', '5c460eb8-0710-557a-b423-f9b12c76834f',
   'now', 'fixture:publish:a1',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- Page-level under page_a1, `now`, NO TARGET (header).
  ('3f010bdd-9eaa-581a-a13f-66cbb208b810', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'ddefe11d-220d-5945-b6bf-af36693fc0a9',
   (select v.id from app.content_versions v
     where v.content_item_id = 'ddefe11d-220d-5945-b6bf-af36693fc0a9' and v.version_no = 1),
   '5c460eb8-0710-557a-b423-f9b12c76834f',
   'now', 'fixture:publish:a1-page',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- Page-level under page_a1_sibling, and the one `scheduled` row in the family.
  ('f8228579-33c7-57b0-8362-341536a9c683', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'f4d8fb50-98fb-5745-8c4f-fab6a0e8f910',
   '25501c36-a088-5897-9166-f2913f7c6649', '5c460eb8-0710-557a-b423-f9b12c76834f',
   'scheduled', 'fixture:publish:a1-sibling-page',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- Under business_a2: §8.6 case 3.
  ('d969e443-d8a9-572a-b3d9-8beb5e9b8469', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', '5ddfe1bf-ca6e-5077-9a9e-84ad3399b82d',
   (select v.id from app.content_versions v
     where v.content_item_id = '5ddfe1bf-ca6e-5077-9a9e-84ad3399b82d' and v.version_no = 1),
   '5c460eb8-0710-557a-b423-f9b12c76834f',
   'now', 'fixture:publish:a2',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  -- workspace_b's own: §8.6 case 5.
  ('30f45700-461f-5456-9bba-928b7f427b00', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '306426ca-a54a-5e3d-90ec-1feff18372ca',
   '2478a854-613b-5250-b797-eb6d6b347aca', '297ad853-58a6-5e83-87e1-f936f9c3ddff',
   'now', 'fixture:publish:b1',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict on constraint publish_intents_idempotency_key_unique do nothing;


-- ---------------------------------------------------------------------------------------------
-- The five sends. Two under one intent, which is the fan-out §4 invariant 7 is about.
-- ---------------------------------------------------------------------------------------------
-- `content_target_id` is a subselect on (content_item_id, social_account_id) -- batch 081 added no
-- symbol for a content target and this file invents none. The column is NOT NULL, so a subselect
-- that matched nothing raises 23502 here rather than writing an unbound row.
--
-- The timestamps are FIXED rather than now(), for the reason 030's and 060's fixtures fix theirs: a
-- fixture whose content depends on when it ran is a fixture whose failures depend on when they ran.
insert into app.publish_targets
  (id, workspace_id, business_profile_id, publish_intent_id, content_target_id, social_account_id,
   content_variant_id, status, dispatched_at, completed_at, failed_at, failure_class) values
  -- THE SEND THAT SUCCEEDED. Facebook, pinned to the facebook variant of content_version_a1.
  ('2caeb3c1-954f-5551-866c-c2181121b74c', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '26ffa0f3-5c74-5398-b5c1-2904e624d546',
   (select t.id from app.content_targets t
     where t.content_item_id = '963952b8-b41d-58cd-b10f-ca3a3557fe65'
       and t.social_account_id = '71b10fff-e2b6-5f9a-b869-ba8f3854329c' and t.deleted_at is null),
   '71b10fff-e2b6-5f9a-b869-ba8f3854329c',
   (select v.id from app.content_variants v
     where v.content_version_id = '0516429c-c4af-5c3c-93fa-69844a240195' and v.platform = 'facebook'),
   'published', timestamptz '2026-09-01 09:00:00+00', timestamptz '2026-09-01 09:00:20+00', null, null),
  -- THE SEND THAT FAILED, under the SAME intent. Instagram, pinned to the instagram variant this
  -- file loads above. No published_posts row: that is the half of partial success that must survive.
  ('d4fb32a5-2aa8-51ec-932e-14d4161ffd78', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '26ffa0f3-5c74-5398-b5c1-2904e624d546',
   (select t.id from app.content_targets t
     where t.content_item_id = '963952b8-b41d-58cd-b10f-ca3a3557fe65'
       and t.social_account_id = 'f8d7b988-35f7-5dad-a2d9-516a445cf830' and t.deleted_at is null),
   'f8d7b988-35f7-5dad-a2d9-516a445cf830',
   (select v.id from app.content_variants v
     where v.content_version_id = '0516429c-c4af-5c3c-93fa-69844a240195' and v.platform = 'instagram'),
   'failed', timestamptz '2026-09-01 09:00:00+00', null, timestamptz '2026-09-01 09:00:35+00',
   'provider_rejected_media'),
  -- The sibling-page send: `pending`, and the row three service cases insert against.
  ('25ec4a4f-160e-5803-94b8-6130757107d5', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'f8228579-33c7-57b0-8362-341536a9c683',
   (select t.id from app.content_targets t
     where t.content_item_id = 'f4d8fb50-98fb-5745-8c4f-fab6a0e8f910'
       and t.social_account_id = '71b10fff-e2b6-5f9a-b869-ba8f3854329c' and t.deleted_at is null),
   '71b10fff-e2b6-5f9a-b869-ba8f3854329c',
   (select v.id from app.content_variants v
     where v.content_version_id = '25501c36-a088-5897-9166-f2913f7c6649' and v.platform = 'facebook'),
   'pending', null, null, null, null),
  -- business_a2's send: §8.6 case 3.
  ('e0f72ca8-8b9d-5c21-8540-a6d1484f18c4', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', 'd969e443-d8a9-572a-b3d9-8beb5e9b8469',
   (select t.id from app.content_targets t
     where t.content_item_id = '5ddfe1bf-ca6e-5077-9a9e-84ad3399b82d'
       and t.social_account_id = '71b10fff-e2b6-5f9a-b869-ba8f3854329c' and t.deleted_at is null),
   '71b10fff-e2b6-5f9a-b869-ba8f3854329c',
   (select v.id from app.content_variants v
     where v.content_version_id = (select vv.id from app.content_versions vv
                                    where vv.content_item_id = '5ddfe1bf-ca6e-5077-9a9e-84ad3399b82d'
                                      and vv.version_no = 1)
       and v.platform = 'facebook'),
   'published', timestamptz '2026-09-01 10:00:00+00', timestamptz '2026-09-01 10:00:18+00', null, null),
  -- workspace_b's send: §8.6 case 5. Its destination is B's own account, which
  -- publish_targets_social_scope_fk would require even if this row tried otherwise.
  ('7298ada0-fb45-5196-9980-654f2ed3340d', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '30f45700-461f-5456-9bba-928b7f427b00',
   (select t.id from app.content_targets t
     where t.content_item_id = '306426ca-a54a-5e3d-90ec-1feff18372ca'
       and t.social_account_id = 'bf855f7a-bbae-595f-b095-85be153f1148' and t.deleted_at is null),
   'bf855f7a-bbae-595f-b095-85be153f1148',
   (select v.id from app.content_variants v
     where v.content_version_id = '2478a854-613b-5250-b797-eb6d6b347aca' and v.platform = 'facebook'),
   'published', timestamptz '2026-09-01 11:00:00+00', timestamptz '2026-09-01 11:00:22+00', null, null)
on conflict on constraint publish_targets_one_per_destination do nothing;


-- ---------------------------------------------------------------------------------------------
-- The asset pins. Two, one per side, and NOT on the sibling-page send.
-- ---------------------------------------------------------------------------------------------
-- The sibling-page target is deliberately left with no pin, because
-- `service-cannot-attach-a-publish-pin` inserts one there and must be able to succeed with row level
-- security off. §4 invariant 5 asks that a pinned version be `ready` with rights valid and NOTHING
-- here enforces it -- blocker 153's sentence about app.content_asset_links, word for word.
insert into app.publish_target_assets
  (workspace_id, business_profile_id, publish_target_id, asset_id, asset_version_id, sort_order, role) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   '2caeb3c1-954f-5551-866c-c2181121b74c',
   '61748f20-e42b-575e-a4a3-dcc3474200ef', '6bb3f989-3ba7-55d2-bd87-d0185b65bc88', 0, 'cover'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3',
   '7298ada0-fb45-5196-9980-654f2ed3340d',
   '10b4861c-ecac-5c71-90bb-315844298122', 'a23ae773-6056-5fc9-9ca2-e520526c7db0', 0, 'cover')
on conflict on constraint publish_target_assets_one_per_slot do nothing;


-- ---------------------------------------------------------------------------------------------
-- The jobs. Four -- one per send except the sibling-page one, which has none by design.
-- ---------------------------------------------------------------------------------------------
-- `kernel_job_id` is NULL on every row and that is not laziness: app.jobs rows exist in 050's
-- fixture and carry no catalog symbol, and the column has no foreign key (061's retention reason),
-- so a value here would be either an invented constant or a subselect asserting a relationship the
-- schema deliberately does not hold.
insert into app.publish_jobs
  (workspace_id, business_profile_id, publish_target_id, kernel_job_id, provider_request_key,
   status, attempt_count, last_attempt_at, last_error_code) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   '2caeb3c1-954f-5551-866c-c2181121b74c', null, 'fixture:publish:a1-fb',
   'succeeded', 1, timestamptz '2026-09-01 09:00:20+00', null),
  -- The failed send's job keeps its error CODE and nothing a provider said (§9.2, PROVIDER-3).
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   'd4fb32a5-2aa8-51ec-932e-14d4161ffd78', null, 'fixture:publish:a1-ig',
   'failed', 3, timestamptz '2026-09-01 09:00:35+00', 'media_rejected'),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '0a5bed73-2981-5699-b2a1-e1c1663127f4',
   'e0f72ca8-8b9d-5c21-8540-a6d1484f18c4', null, 'fixture:publish:a2',
   'succeeded', 1, timestamptz '2026-09-01 10:00:18+00', null),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3',
   '7298ada0-fb45-5196-9980-654f2ed3340d', null, 'fixture:publish:b1',
   'succeeded', 1, timestamptz '2026-09-01 11:00:22+00', null)
on conflict on constraint publish_jobs_one_per_target do nothing;


-- ---------------------------------------------------------------------------------------------
-- The posts. THREE, not four: the Instagram send failed and a failed send produces no post.
-- ---------------------------------------------------------------------------------------------
-- `external_post_hash` is sha256 over a string this repository owns, exactly as 110's fixture
-- composes an account hash and 010's an invitation token digest: sha256() from pg_catalog rather
-- than pgcrypto's digest(), for batch 010's measured reason that public.digest does not exist on the
-- provisioned instance. No raw provider identifier appears anywhere -- §9.1 makes it PROVIDER-3 and
-- this schema has no home for one (120's header).
--
-- The A-side posts share one social account (social_account_a1) and differ in their hash, which is
-- what published_posts_external_hash_unique is over.
--
-- THE THREE IDS ARE FIXED BY BATCH 121 AND WERE DEFAULTED HERE BEFORE IT. The note in
-- db/foundation/seeds/fixture-catalog.json that gave a post no symbol said "nothing is addressed
-- through them"; app.performance_snapshots is addressed through a post, so batch 121 gives each one
-- a symbol and fixes the id here -- which is exactly what batch 120 did to batch 081's six content
-- target ids on the day app.publish_targets started naming them, and what batch 111 did to batch
-- 110's social accounts before that. The hash argument was already each post's own symbol name.
insert into app.published_posts
  (id, workspace_id, business_profile_id, publish_target_id, social_account_id, platform,
   external_post_hash, published_at) values
  ('afd4dde9-c824-51b2-ab0b-d82f36131f5d',
   'c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   '2caeb3c1-954f-5551-866c-c2181121b74c', '71b10fff-e2b6-5f9a-b869-ba8f3854329c', 'facebook',
   sha256(convert_to('published_post_a1_fb', 'utf8')), timestamptz '2026-09-01 09:00:20+00'),
  ('7ff92ce8-686d-560d-a202-72e673d02ee5',
   'c4840acc-0323-5e13-b1d3-c18d7eb615cb', '0a5bed73-2981-5699-b2a1-e1c1663127f4',
   'e0f72ca8-8b9d-5c21-8540-a6d1484f18c4', '71b10fff-e2b6-5f9a-b869-ba8f3854329c', 'facebook',
   sha256(convert_to('published_post_a2', 'utf8')), timestamptz '2026-09-01 10:00:18+00'),
  ('cd8df3a5-9a3a-57ed-bb37-5d57dfba1265',
   '43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3',
   '7298ada0-fb45-5196-9980-654f2ed3340d', 'bf855f7a-bbae-595f-b095-85be153f1148', 'facebook',
   sha256(convert_to('published_post_b1', 'utf8')), timestamptz '2026-09-01 11:00:22+00')
on conflict on constraint published_posts_one_per_target do nothing;


-- ---------------------------------------------------------------------------------------------
-- WHAT THE FIXTURE RE-READS BEFORE IT COMMITS
-- ---------------------------------------------------------------------------------------------
-- Every subselect above writes NULL rather than raising when it matches nothing, and four of the
-- five columns they fill are NOT NULL -- so the load would fail loudly. `content_variant_id` and
-- `content_target_id` are both NOT NULL and so is the intent's `content_version_id`, which is why
-- this block asserts the SHAPE rather than the resolution: the counts, the absences the service
-- cases depend on, and the one pairing §4 invariant 7 is about. A fixture that silently loaded four
-- sends instead of five, or gave the sibling-page send a job, would leave three service cases
-- asserting a refusal of a row that could never have been written.
do $$
declare
  count_of integer;
begin
  select count(*) into count_of from app.publish_intents;
  if count_of <> 5 then
    raise exception 'the batch 120 fixture loaded % publish intent(s) and must load five', count_of;
  end if;
  select count(*) into count_of from app.publish_targets;
  if count_of <> 5 then
    raise exception 'the batch 120 fixture loaded % publish target(s) and must load five', count_of;
  end if;

  -- THE INTENT WITH NO TARGET. `service-cannot-fan-out-a-publish-target` inserts against it, and a
  -- fixture that gave it one would make that case assert a uniqueness violation instead of a policy.
  select count(*) into count_of from app.publish_targets
   where publish_intent_id = '3f010bdd-9eaa-581a-a13f-66cbb208b810';
  if count_of <> 0 then
    raise exception 'publish_intent_a1_page has % target(s) and must have none; the refused fan-out inserts there', count_of;
  end if;

  -- AND THE AIM AND THE VARIANT THAT FAN-OUT NAMES, both loaded with the fixed ids the cases carry as
  -- parameters. A fixture that let either default would leave four cases quoting an id of nothing,
  -- and the service one -- the second case the control for app.publish_targets rests on -- would be
  -- refused by a foreign key rather than by a policy.
  if not exists (select 1 from app.content_targets
                  where id = '987ee83a-8c82-5472-a2b9-c7fb42f03c39'
                    and content_item_id = 'ddefe11d-220d-5945-b6bf-af36693fc0a9'
                    and social_account_id = '71b10fff-e2b6-5f9a-b869-ba8f3854329c') then
    raise exception 'the aim the fan-out cases name is not loaded with the fixed id batch 081 now gives it';
  end if;
  if exists (select 1 from app.publish_targets
              where content_target_id = '987ee83a-8c82-5472-a2b9-c7fb42f03c39') then
    raise exception 'a send already uses the aim the fan-out cases attempt, so their insert would be refused by publish_targets_one_per_destination rather than by a policy';
  end if;
  if not exists (select 1 from app.content_variants
                  where id = '79e86282-47a4-530e-95c3-b81bc0d0b253' and platform = 'facebook') then
    raise exception 'the variant the fan-out cases pin is not loaded with its fixed id';
  end if;

  -- THE TARGET WITH NO JOB, NO POST AND NO PIN. Three service cases insert against it.
  select count(*) into count_of from app.publish_jobs
   where publish_target_id = '25ec4a4f-160e-5803-94b8-6130757107d5';
  if count_of <> 0 then
    raise exception 'the sibling-page send has a job and must have none; service-cannot-open-a-publish-job inserts there';
  end if;
  select count(*) into count_of from app.published_posts
   where publish_target_id = '25ec4a4f-160e-5803-94b8-6130757107d5';
  if count_of <> 0 then
    raise exception 'the sibling-page send has a post and must have none; service-cannot-record-a-published-post inserts there';
  end if;
  select count(*) into count_of from app.publish_target_assets
   where publish_target_id = '25ec4a4f-160e-5803-94b8-6130757107d5';
  if count_of <> 0 then
    raise exception 'the sibling-page send has an asset pin and must have none; service-cannot-attach-a-publish-pin inserts there';
  end if;

  -- §4 INVARIANT 7 AS DATA: one intent, two sends, one post. This is what
  -- `owner-a-sees-exactly-one-published-post-for-intent-a1` counts, and the assertion is here as
  -- well so that a fixture that quietly gave the failed send a post fails at LOAD rather than
  -- turning a case about partial success into a case that passes for the wrong reason.
  select count(*) into count_of from app.publish_targets
   where publish_intent_id = '26ffa0f3-5c74-5398-b5c1-2904e624d546';
  if count_of <> 2 then
    raise exception 'intent a1 fans out to % send(s) and must fan out to two, one per platform', count_of;
  end if;
  select count(*) into count_of from app.published_posts p
    join app.publish_targets t on t.id = p.publish_target_id
   where t.publish_intent_id = '26ffa0f3-5c74-5398-b5c1-2904e624d546';
  if count_of <> 1 then
    raise exception 'intent a1 has % published post(s) and must have exactly one -- the Facebook send succeeded and the Instagram send did not', count_of;
  end if;
  if not exists (select 1 from app.publish_targets
                  where id = 'd4fb32a5-2aa8-51ec-932e-14d4161ffd78'
                    and status = 'failed' and failed_at is not null and failure_class is not null) then
    raise exception 'the Instagram send is not loaded as a dated failure with a class, so partial success is not exercised';
  end if;
end $$;

commit;
