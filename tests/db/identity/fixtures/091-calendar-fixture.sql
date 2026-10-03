-- Tenant fixture for the batch 091 isolation cases.
--
-- Owner: A5 Calendar, written by A0 on the Product Owner's decision of 2026-09-28. It loads after
-- 081, whose content targets the schedules below time. Every id is read from
-- db/foundation/seeds/fixture-catalog.json, where it is uuid5(namespace, 'thinkbizthai.fixture.' ||
-- symbol).
--
-- THIS FIXTURE WRITES INTO BATCH 091's TWO TABLES AND NO OTHER, which is batch 120's lesson. What it
-- adds:
--   calendar_item_a1        content_item_a1 (business_a1), inside user_editor_a's scope
--   calendar_item_a2        content_item_a2 (business_a2), OUTSIDE user_editor_a's scope -- §8.6 case 3
--   calendar_item_b1        content_item_b1, tenant B
--   content_schedule_a1_fb  content_target_a1_fb, a DRAFT
--   content_schedule_a1_ig  content_target_a1_ig, ARMED -- which no client can produce, so it is here
--   content_schedule_b1     content_target_b1, a draft, tenant B
--
-- ADDED BY 091's CORRECTIONS (C0 F1/F2 and A1 F1/F2 on 091's first head: no row outside a scope and no
-- settled row existed, so neither the narrowing nor the state machine had a case that could see them):
--   calendar_item_a1_sibling_page       content_item_a1_sibling_page -- §8.6 case 4 for the calendar
--   calendar_item_a1_deleted            content_item_a1, SOFT-DELETED -- beside the live a1 placement
--   content_schedule_a2                 content_target_a2 (business_a2), a DRAFT -- §8.6 case 3
--   content_schedule_a1_sibling_page    content_target_a1_sibling_page, DISPATCHED -- §8.6 case 4, and
--                                       the send a client may not cancel
--   content_schedule_a1_page_cancelled  content_target_a1_page, CANCELLED
--   content_schedule_a1_page_completed  content_target_a1_page, COMPLETED
--   content_schedule_a1_page_failed     content_target_a1_page, FAILED
--
-- WHAT IS DELIBERATELY LEFT FREE: content_item_a1_page has no placement, and content_target_a1_page has
-- no LIVE schedule (its three rows are history, which the partial unique index does not count). The
-- positive insert cases land on those, and the uniqueness cases collide on the rows above.
--
-- Rows are written as the connecting role, which bypasses row level security. That is how an `armed`
-- schedule exists at all, and it is why no case may read the fixture's existence as evidence that a
-- client could write it.

begin;

insert into app.calendar_items
  (id, workspace_id, business_profile_id, content_item_id, scheduled_local_date, timezone, display_status,
   created_by, updated_by) values
  ('462b7fa7-98ff-575b-85bb-a64a704e4fa9', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '963952b8-b41d-58cd-b10f-ca3a3557fe65', '2026-10-05',
   'Asia/Bangkok', 'planned', '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('e85d3696-ee89-5598-89c5-6b181cb86800', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', '5ddfe1bf-ca6e-5077-9a9e-84ad3399b82d', '2026-10-06',
   'Asia/Bangkok', 'planned', '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('89052307-19b9-57f0-9aa4-2aa8e31cdc6f', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '306426ca-a54a-5e3d-90ec-1feff18372ca', '2026-10-05',
   'Asia/Bangkok', 'planned', '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff'),
  ('c458cc6a-83b8-5bd0-97ac-3a51bc6915c8', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'f4d8fb50-98fb-5745-8c4f-fab6a0e8f910', '2026-10-07',
   'Asia/Bangkok', 'planned', '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f')
-- Idempotent, like every fixture: CI's negative control re-runs rls-smoke on the same database.
on conflict (id) do nothing;

-- The soft-deleted placement, with a fixed deletion time. Written as the connecting role, which is
-- how a deleted_at exists here at all: a client's deletion is timed by set_deleted_at.
insert into app.calendar_items
  (id, workspace_id, business_profile_id, content_item_id, scheduled_local_date, timezone, display_status,
   created_by, updated_by, deleted_at) values
  ('94d5ce3d-9507-51fd-9dfc-a09071c016d0', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '963952b8-b41d-58cd-b10f-ca3a3557fe65', '2026-10-01',
   'Asia/Bangkok', 'planned', '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f', timestamptz '2026-09-20 09:00:00+00')
on conflict (id) do nothing;

insert into app.content_schedules
  (id, workspace_id, business_profile_id, content_target_id, scheduled_for, timezone_snapshot, status,
   created_by, updated_by) values
  ('cd9ccadc-9021-5797-8683-d91786a6c44c', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'f21cae88-bf5f-5e7f-9447-bd497988f18d',
   '2026-10-05 10:00:00+07', 'Asia/Bangkok', 'draft',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('a7450cca-4283-5e1c-91e9-2fcb8a0ba1b7', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '948f1ccc-9ffa-5cd4-84d5-c2c04e21609f',
   '2026-10-05 12:00:00+07', 'Asia/Bangkok', 'armed',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('96ca8d53-c415-5ccb-9b62-307befbfcb93', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', 'c410fee4-f3ca-5bea-b954-9e986c71b8f0',
   '2026-10-05 10:00:00+07', 'Asia/Bangkok', 'draft',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (id) do nothing;

-- The corrections' schedules: one outside the Business scope, one on the sibling Page that is in
-- flight, and three settled rows of content_target_a1_page. Each state a client cannot produce is
-- written here as the connecting role.
insert into app.content_schedules
  (id, workspace_id, business_profile_id, content_target_id, scheduled_for, timezone_snapshot, status,
   created_by, updated_by) values
  ('8f91f07e-74c1-542e-92cb-d4ffbe0bfeaf', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', '1ae11822-2246-55a2-8a2a-5e5f5966011a',
   '2026-10-05 11:00:00+07', 'Asia/Bangkok', 'draft',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('4d0135b7-94b6-5f64-8864-f4647faf9c07', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '996963f5-7497-58d5-ac2c-83cd4f85d5d7',
   '2026-10-04 09:00:00+07', 'Asia/Bangkok', 'dispatched',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('c330f9f3-d17f-5e62-8188-2d5c06f0d68d', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '987ee83a-8c82-5472-a2b9-c7fb42f03c39',
   '2026-09-30 09:00:00+07', 'Asia/Bangkok', 'cancelled',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('045ba964-1b19-53e3-a3f4-6ed0ad19781c', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '987ee83a-8c82-5472-a2b9-c7fb42f03c39',
   '2026-09-29 09:00:00+07', 'Asia/Bangkok', 'completed',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('80fd1dd8-85cd-5937-80c2-3175abf218fd', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '987ee83a-8c82-5472-a2b9-c7fb42f03c39',
   '2026-09-28 09:00:00+07', 'Asia/Bangkok', 'failed',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f')
on conflict (id) do nothing;

commit;
