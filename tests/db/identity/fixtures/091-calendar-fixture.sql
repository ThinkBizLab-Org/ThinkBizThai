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
-- WHAT IS DELIBERATELY LEFT FREE: content_item_a1_page has no placement, and content_target_a1_page has
-- no schedule. The positive insert cases land on those, and the uniqueness cases collide on the rows
-- above.
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
   'Asia/Bangkok', 'planned', '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
-- Idempotent, like every fixture: CI's negative control re-runs rls-smoke on the same database.
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

commit;
