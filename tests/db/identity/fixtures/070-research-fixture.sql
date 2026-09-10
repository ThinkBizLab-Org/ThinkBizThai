-- Tenant fixture for the batch 070 isolation cases.
--
-- Owner: A2 Research. It loads AFTER 010-identity-fixture.sql (the Workspaces and the memberships),
-- 020-business-fixture.sql (business_a1, business_a2, business_b1 and page_a1, which every run names
-- by composite foreign key) and 021-member-scope-fixture.sql (page_a1_sibling, and the member scope
-- that makes user_page_editor_a a single-Page identity). The runner applies the whole list in order.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
--
-- §9.2 NAMES `fixture` IN ITS OWN LIST OF SURFACES, AND THAT IS THE FIRST THING TO READ HERE.
--
-- "ห้ามเก็บหรือส่งออกใน client/API/event/job/log/FIXTURE: … full research snapshot ที่ client ไม่มี
-- สิทธิ์ทำซ้ำ". A fixture is where a prohibition is most often broken for convenience, so this file
-- carries NO captured material of any kind: no page body, no excerpt, no quoted sentence, and no
-- URL belonging to anybody. The two `source_uri` values point at `example.com`, which RFC 2606
-- reserves for exactly this, and the two content digests are taken over synthetic strings this
-- repository owns. There is nothing here a copyright holder could recognise, which is the only state
-- in which a fixture for a COPYRIGHT-3 table is honest.
--
-- THE SNAPSHOT ROWS CARRY NO SYMBOL, AND THAT IS THE FIXTURE DEMONSTRATING THE POINT OF THE HASH.
-- 070_research.sql makes (workspace_id, research_source_id, content_hash) unique because that triple
-- is what app.research_evidence.snapshot_content_hash has to name single-valued once §10's purge has
-- removed the locator. So the captures below are addressed by their digest — `sha256(convert_to(…,
-- 'utf8'))`, exactly as batch 010's invitation cases address a token — and every case that names one
-- composes the same digest from the same string. `sha256()` from `pg_catalog` rather than pgcrypto's
-- `digest()`, for batch 010's measured reason: `public.digest` does not exist on the provisioned
-- instance, where pgcrypto lives in `extensions`.
--
-- NO RETENTION VALUE HERE IS THIRTY DAYS, AND THE ABSENCE IS DELIBERATE. `DATA-DEC-07` ("Research
-- snapshot retention, 30 วัน max default, owner Research+Legal") is OPEN and §15 forbids an agent
-- choosing it; §10 itself says "30 วัน default หรือสั้นกว่าตาม source policy", so the number a real
-- capture carries is the SHORTER of a default nobody has approved and a source policy that does not
-- exist. A fixture whose captures were retained for exactly thirty days would read as the default
-- having been chosen. Both rows below are retained for SEVEN days after capture — a value no
-- document states, which is the point: it is a source policy's number standing in for one, and it
-- can be read as nothing else.
--
-- THE TWO CAPTURES ARE IN DIFFERENT STATES, WHICH IS WHAT MAKES THE PURGE COLUMN LEGIBLE AS DATA.
-- The A-side capture is live: it names an object and `purged_at` is null. The B-side capture is
-- PURGED: `object_ref` is null and `purged_at` is stamped, which is §10's "purge object + locator;
-- preserve permitted hash/citation metadata" as an existing row rather than as a sentence. Without
-- the second, `research_snapshots_purged_row_names_no_object` is a constraint no row satisfies in the
-- interesting direction, and `purged_at` is a column nothing exercises.
--
-- EVERY TIMESTAMP IS A FIXED `timestamptz` RATHER THAN `now()`, for the reason batch 030's fixture
-- gives and 061's repeats: every other value here is a pure function of its symbol, and a fixture
-- whose content depends on when it ran is one whose failures depend on when they ran. It matters
-- twice over on this table, because `retention_until > captured_at` is a constraint and
-- `retention_until < now()` is the query batch 160 will ask.
--
-- THE THREE SUGGESTION VERBS ARE NULL ON THE A SIDE AND ONE IS SET ON THE B SIDE. §8.2's "Suggestion
-- save/dismiss/use" is asserted from five identities against research_suggestion_a1, and every one
-- of those cases writes a value the row did not already hold — a case that set what was already
-- there would pass against a database where the write did nothing (030's fixture rule).
-- research_suggestion_b1 is DISMISSED, so the two sides are distinguishable rows rather than copies;
-- the cross-tenant write case against it therefore names `saved_at`, which
-- `research_suggestions_one_outcome` does not object to, so the refusal that case observes can only
-- be the policy.
--
-- THIS FILE LOADS ADMINISTRATIVELY, as the table owner, before any identity is assumed, and on every
-- one of these five tables that is the only way: batch 070 writes NO INSERT policy anywhere, because
-- §8.2 marks "Research run/source/evidence INSERT" `N` for every client role and §8 has no cell at
-- all for creating a snapshot or a suggestion. Earlier fixtures could have been loaded through the
-- policies under test and were not, because "a fixture that depends on the policies under test
-- cannot distinguish 'the policy works' from 'the fixture happened to load'". This one has no such
-- choice to make.
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- ---------------------------------------------------------------------------------------------
-- The runs. Five, because the run is the one table here with §4 invariant 3's two-column scope.
-- ---------------------------------------------------------------------------------------------
--
-- Each carries exactly one control, which is this fixture's rule and 020's before it: one row
-- carrying two unrelated controls is how a case starts failing for the other one's reason.
--
--   research_run_a1               business-level. The `then` branch of the narrowing, and the parent
--                                 of the A-side source, evidence and suggestion.
--   research_run_a1_page          page-level under page_a1. The `else` branch, and the POSITIVE half
--                                 of §8.6 case 4 — user_page_editor_a is scoped to page_a1.
--   research_run_a1_sibling_page  page-level under page_a1_sibling. The NEGATIVE half of case 4: a
--                                 refusal here is refusal by PAGE scope inside a Business the member
--                                 is otherwise admitted to, which research_run_a2 cannot show.
--   research_run_a2               under business_a2, outside user_editor_a's scope. §8.6 case 3.
--   research_run_b1               under workspace_b. §8.6 case 5.
--
-- `created_by` is the workspace OWNER on each side. There is no client INSERT on this table, so the
-- column is not a forgery surface at insert time; §8.6 case 8 lives on `updated_by` and on the UPDATE
-- policy, which the cases assert.
insert into app.research_runs
  (id, workspace_id, business_profile_id, page_context_profile_id, brief, created_by) values
  ('5b56b36f-7684-5908-8b03-31720bf94681', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', null,
   'fixture research brief a1 business', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('d34ee064-1af2-5dfa-8351-3de29ecd8acf', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'da6409df-9541-5346-9d2e-447be2a649af',
   'fixture research brief a1 page', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('f7dd1027-6e41-5b59-9845-9f9168ebd5e5', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'b45dc73c-00e3-5e14-91ef-026dcbc29a7f',
   'fixture research brief a1 sibling page', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('a7ae9f71-9996-52d1-bd57-82c958b741a9', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', null,
   'fixture research brief a2 business', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('13d66363-2f2c-50b2-8c54-88c676043dd3', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', null,
   'fixture research brief b1 business', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------------------------
-- The citations. Two on the A side, because a child's reach is its PARENT's reach.
-- ---------------------------------------------------------------------------------------------
--
-- research_source_a1_sibling_page is not a spare. A source carries no page column of its own, so
-- batch 070's whole child design is that its restrictive policy resolves through app.research_runs —
-- and asserted only against a BUSINESS-level parent, that claim would still hold if somebody replaced
-- the `exists()` with `member_scope_admits_business(workspace_id, business_profile_id)`. This row is
-- what makes the page half of it falsifiable: user_page_editor_a is admitted to business_a1 and must
-- still be refused a source whose run is restricted to a sibling Page.
--
-- The URIs are `example.com`, which RFC 2606 reserves. §9.2 names `fixture` among the surfaces a
-- research snapshot may not reach, and a real publisher's URL in a test fixture is the first step of
-- a worker fetching it.
insert into app.research_sources
  (id, workspace_id, business_profile_id, research_run_id, source_uri, cited_at) values
  ('9752a05d-dc17-5596-8394-1bacc1ff8e0c', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '5b56b36f-7684-5908-8b03-31720bf94681',
   'https://example.com/fixture/a1', timestamptz '2026-09-01 08:00:00+00'),
  ('8aaa6a63-e083-5a6b-aaaf-a8e4d638e026', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'f7dd1027-6e41-5b59-9845-9f9168ebd5e5',
   'https://example.com/fixture/a1-sibling-page', timestamptz '2026-09-01 08:05:00+00'),
  ('7ac7a843-4d2c-5195-854f-719fdc8b56a1', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '13d66363-2f2c-50b2-8c54-88c676043dd3',
   'https://example.com/fixture/b1', timestamptz '2026-09-01 08:10:00+00')
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------------------------
-- The captures. No symbol, two states, and seven days of retention rather than thirty.
-- ---------------------------------------------------------------------------------------------
--
-- Addressed by (workspace_id, research_source_id, content_hash), which 070_research.sql makes unique
-- — see the header. The digests are over strings this repository owns, and they are DIFFERENT on the
-- two sides so that a capture is distinguishable from a copy of itself.
--
-- `on conflict on constraint research_snapshots_one_per_capture` names the CONSTRAINT rather than
-- inferring an index from a column list, which is 021's rule: inference over a column list is exactly
-- where a re-run quietly inserts a second copy.
insert into app.research_snapshots
  (workspace_id, business_profile_id, research_source_id, object_ref, content_hash,
   captured_at, retention_until, purged_at) values
  -- The LIVE capture: it names an object and has not been purged.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   '9752a05d-dc17-5596-8394-1bacc1ff8e0c', 'snapshot:research/a1/capture-1',
   sha256(convert_to('fixture research capture a1', 'utf8')),
   timestamptz '2026-09-01 09:00:00+00', timestamptz '2026-09-08 09:00:00+00', null),
  -- The PURGED capture: §10's "purge object + locator; preserve permitted hash/citation metadata" as
  -- a row. The hash survives, the locator is gone, and the source one table up still says what was
  -- cited.
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3',
   '7ac7a843-4d2c-5195-854f-719fdc8b56a1', null,
   sha256(convert_to('fixture research capture b1', 'utf8')),
   timestamptz '2026-09-01 09:00:00+00', timestamptz '2026-09-08 09:00:00+00',
   timestamptz '2026-09-08 10:00:00+00')
on conflict on constraint research_snapshots_one_per_capture do nothing;


-- ---------------------------------------------------------------------------------------------
-- The evidence. The one object §5 names immutable, and the only row that names a capture.
-- ---------------------------------------------------------------------------------------------
--
-- The A side names the A-side capture BY ITS CONTENT HASH — recomposed here from the same string, so
-- the fixture demonstrates the addressing rather than asserting it — and the B side names none,
-- which is what makes `research_evidence_snapshot_hash_is_a_digest`'s nullable branch a branch a row
-- takes.
insert into app.research_evidence
  (id, workspace_id, business_profile_id, research_source_id, snapshot_content_hash) values
  ('4844943e-4267-5fd7-9d15-136675c9acce', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '9752a05d-dc17-5596-8394-1bacc1ff8e0c',
   sha256(convert_to('fixture research capture a1', 'utf8'))),
  ('27422cc6-2bee-5544-a411-76691ebad1c4', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '7ac7a843-4d2c-5195-854f-719fdc8b56a1',
   null)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------------------------
-- The suggestions. §8.2's three verbs, untouched on one side and spent on the other.
-- ---------------------------------------------------------------------------------------------
insert into app.research_suggestions
  (id, workspace_id, business_profile_id, research_run_id, title, saved_at, dismissed_at, used_at) values
  ('c6e9f603-3ad5-51f9-bba2-1e45f6d072b4', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', '5b56b36f-7684-5908-8b03-31720bf94681',
   'fixture research suggestion a1', null, null, null),
  ('57ef7696-aef6-5cd8-9b63-eeb7cc5eb67c', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', '13d66363-2f2c-50b2-8c54-88c676043dd3',
   'fixture research suggestion b1', null, timestamptz '2026-09-02 12:00:00+00', null)
on conflict (id) do nothing;

commit;
