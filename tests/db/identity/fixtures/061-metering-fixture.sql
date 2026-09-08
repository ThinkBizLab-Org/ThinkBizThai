-- Tenant fixture for the batch 061 isolation cases.
--
-- Owner: A0/A6 Metering. It loads AFTER 010-identity-fixture.sql (the Workspaces and the
-- memberships), 020-business-fixture.sql (business_a1 and business_a2, which the quota buckets name
-- by composite foreign key) and 050-async-kernel-fixture.sql (the two jobs the ledger rows are
-- attributed to). The runner applies the whole list in order.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
-- THE JOB ATTRIBUTION IS RESOLVED BY SUBQUERY AND NOT BY A UUID, and that is the one thing in this
-- file worth reading before the rows. `CTR-USG-001` makes `attribution.job_id` a REQUIRED property
-- of a usage event, and batch 050 added no catalog symbol for a job because a job is addressed by
-- its natural key `(workspace_id, dedupe_key)`. Writing a job id here would therefore have meant
-- either inventing a constant — which this catalog exists to refuse — or adding a symbol for a row
-- that already has a key. So the ledger rows below SELECT the job through that key, exactly as every
-- batch 050 case addresses one. Two things follow and both are wanted: the fixture writes no id it
-- did not read, and a ledger row is attributed to a job that actually exists, which is the state
-- `app.usage_events` carries no foreign key to enforce.
--
-- THE DEDUPE KEY IS COMPUTED FROM THE ROW'S OWN COLUMNS rather than written out, for a reason that
-- is the batch's argument in miniature. `CTR-USG-001` composes it as
-- `usg:<workspace_id>:<job_id>:<dimension>:<cost_basis>:<occurred_at as digits>`, and its own
-- `untestable_by_schema` says that whether a document's key AGREES with its fields "cannot be
-- expressed here" and is a resolver obligation. 061_metering.sql expresses five of the six segments
-- as a CHECK; this file composes the key the contract's own way, so a fixture that loads is a
-- demonstration of the composition rather than a string somebody typed to satisfy a constraint.
-- The sixth segment — the instant — is written literally, because it is the segment no constraint in
-- this dialect can check and a fixture is where a reader can see what the rule produces:
-- `2026-09-01 10:00:00+00` gives `20260901T100000Z` (a zero fraction is OMITTED, which is the
-- correction A6 forced onto that contract's composition note).
--
-- THE AGGREGATE AGREES WITH THE LEDGER, ON PURPOSE, AND IT IS NOT KEPT THAT WAY BY ANYTHING. Batch
-- 061 writes no reconciliation — no trigger, no view, no function — so the buckets below hold the
-- numbers a recompute WOULD produce and nothing in the database maintains them: 1450 consumed in
-- workspace A, which is the one ledger row's quantity, and 200 reserved, which is the one open
-- hold's. quota_bucket_a2 carries a NULL `computed_through` and zeroes instead, because "this bucket
-- claims nothing" and "this bucket claims zero" are different states and a fixture with only the
-- second could not tell them apart.
--
-- THE PRICE FIGURES ARE SYNTHETIC AND THIS FILE IS NOT A RATE CARD. `OPEN-004` ("BYOK OpenAI model
-- allowlist และ max budget") is OPEN and §15 forbids an agent closing it; the amounts exist so that
-- a column typed numeric(18,6) has a row that uses its scale, and the provider key is the literal
-- `openai` because `DEC-014` fixes that spelling and `CTR-USG-001` types the field as a pattern that
-- accepts it.
--
-- THIS FILE LOADS ADMINISTRATIVELY, as the table owner, before any identity is assumed, and on two
-- of its three tables that is the only way: batch 061 writes NO INSERT policy on
-- app.usage_events, app.usage_reservations or app.quota_buckets, so no request-path caller could
-- load a single row of it. Earlier fixtures could have been loaded through the policies under test
-- and were not, because "a fixture that depends on the policies under test cannot distinguish 'the
-- policy works' from 'the fixture happened to load'". This one has no such choice to make.
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- ---------------------------------------------------------------------------------------------
-- The ADMIN of workspace_a, and the member scope that narrows them.
-- ---------------------------------------------------------------------------------------------
--
-- §12.6's identity list names an owner, an editor, an approver, a viewer and a suspended member of
-- workspace_a and no admin. §8.4 marks "Usage/quota summary SELECT" `Y` for the owner AND `Y` for
-- the admin — two unconditional cells — so app.quota_buckets' SELECT policy resolves
-- `app.workspace_member_role(workspace_id) in ('owner', 'admin')` and the second half of that
-- predicate could be exercised by no identity the specification names. An untested branch of a
-- predicate is a branch that could be inverted without a case failing.
--
-- IT IS SCOPED AND THE OWNER IS NOT, which is the whole design of the pair. Batch 021 reads §7 as
-- "a member with no scope row is not narrowed", so proving that batch 061's RESTRICTIVE policy
-- subtracts anything at all needs a caller who passes the permissive policy AND holds a scope row;
-- user_owner_a holds none and is the control for the other half of 021's reading.
--
-- `business` rather than `page`: §7 gives a business scope every Page beneath it, and a quota bucket
-- has no Page column at all — §5 scopes this family workspace/business and stops there.
insert into app.user_profiles (user_id, display_name, locale, timezone) values
  ('8912a12d-4421-5373-a8d2-073344f69923', 'fixture admin a', 'th-TH', 'Asia/Bangkok')
on conflict (user_id) do nothing;

insert into app.workspace_members (workspace_id, user_id, role, status, created_by, updated_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '8912a12d-4421-5373-a8d2-073344f69923', 'admin', 'active',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f')
on conflict (workspace_id, user_id) do nothing;

-- `created_by` is the WORKSPACE OWNER and `user_id` is the member receiving the scope: two different
-- people, which is what batch 021's INSERT policy asserts about a request-path write and what a
-- fixture writing both as one id would make impossible to see.
insert into app.workspace_member_scopes
  (workspace_id, user_id, scope_type, business_profile_id, page_context_profile_id, created_by, updated_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '8912a12d-4421-5373-a8d2-073344f69923',
   'business', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', null,
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f')
-- ON CONFLICT names the CONSTRAINT rather than inferring an index from a column list, for batch
-- 021's reason: the unique index is NULLS NOT DISTINCT and inference over five columns two of which
-- are null here is exactly where a re-run would quietly insert a second copy.
on conflict on constraint workspace_member_scopes_one_per_target do nothing;


-- ---------------------------------------------------------------------------------------------
-- The ledger. One measurement per tenant, and no identity in this schema may read either.
-- ---------------------------------------------------------------------------------------------
--
-- Two rows rather than one, because no client role holds a privilege on app.usage_events at all, so
-- this suite's substitute for a cross-tenant claim is batch 030's and batch 140's — both owners are
-- refused identically, at the privilege layer — and that substitute is about two real rows or it is
-- about nothing. They are also what `service-sees-zero-usage-events` is about: against an empty
-- table that case would pass with row level security on or off, which is what the CI negative
-- control for this table rests on noticing.
--
-- `occurred_at` and every other timestamp in this file is a FIXED timestamptz rather than now(), for
-- the reason batch 030's fixture gives about released_at: every other value here is a pure function
-- of its symbol, and a fixture whose content depends on when it ran is one whose failures depend on
-- when they ran. It matters more here than anywhere else it has been said, because `occurred_at` is
-- INSIDE the dedupe key: a now() would make the key a different string on every run.
--
-- `cost_basis` is `estimated` on both. §11 of nothing says a fixture must carry a provider
-- statement, and `provider_reported` is the value a reconciliation writes — there is no
-- reconciliation, so a row claiming a provider reported it would be a claim about a mechanism that
-- does not exist. `supersedes_usage_id` is null on both for the same reason.
insert into app.usage_events
  (usage_id, occurred_at, dimension, quantity_amount, quantity_unit,
   workspace_id, business_profile_id, job_id, provider_key,
   cost_amount, cost_currency, cost_basis, dedupe_key)
select 'cbcbfce1-edbc-51bd-8e13-448812346a56'::uuid,
       timestamptz '2026-09-01 10:00:00+00', 'ai_tokens', 1450, 'token',
       j.workspace_id, 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a'::uuid, j.id, 'openai',
       0.043500, 'USD', 'estimated',
       'usg:' || j.workspace_id::text || ':' || j.id::text || ':ai_tokens:estimated:20260901T100000Z'
  from app.jobs j
 where j.workspace_id = 'c4840acc-0323-5e13-b1d3-c18d7eb615cb'
   and j.dedupe_key = 'fixture-job-a'
on conflict (usage_id) do nothing;

insert into app.usage_events
  (usage_id, occurred_at, dimension, quantity_amount, quantity_unit,
   workspace_id, business_profile_id, job_id, provider_key,
   cost_amount, cost_currency, cost_basis, dedupe_key)
select 'bee401d4-396f-5d2d-88f0-bbf71c23f0dc'::uuid,
       timestamptz '2026-09-01 10:00:00+00', 'ai_tokens', 990, 'token',
       j.workspace_id, '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3'::uuid, j.id, 'openai',
       0.029700, 'USD', 'estimated',
       'usg:' || j.workspace_id::text || ':' || j.id::text || ':ai_tokens:estimated:20260901T100000Z'
  from app.jobs j
 where j.workspace_id = '43fd5c24-ebea-528f-9ce9-eedf1f8f9765'
   and j.dedupe_key = 'fixture-job-b'
on conflict (usage_id) do nothing;


-- ---------------------------------------------------------------------------------------------
-- The hold. One, in workspace A, still open.
-- ---------------------------------------------------------------------------------------------
--
-- There is deliberately NO B-side reservation, and the asymmetry with the ledger above is the rule
-- this file applies rather than an omission: §8 has no row for a reservation in any of its four
-- matrices, so there is no cell for a both-owners-refused-identically substitute to be ABOUT. This
-- row exists so that `service-sees-zero-usage-reservations` — the case the CI negative control for
-- app.usage_reservations rests on — addresses a row rather than an empty table.
--
-- It is OPEN: `released_at` and `consumed_usage_id` are both null and `expires_at` is in the future
-- relative to `reserved_at`, which is the state batch 061 refuses to name with a status column and
-- expresses as a query instead. Its 200 tokens are the `reserved_amount` the two workspace-A buckets
-- below carry, and nothing in the database keeps those three numbers equal.
insert into app.usage_reservations
  (id, workspace_id, business_profile_id, dimension, quantity_amount, quantity_unit,
   job_id, reserved_at, expires_at)
select 'b25ea12f-1f46-5e99-88d8-1dbad22b39bb'::uuid,
       j.workspace_id, 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a'::uuid, 'ai_tokens', 200, 'token',
       j.id, timestamptz '2026-09-01 10:00:00+00', timestamptz '2026-09-01 10:15:00+00'
  from app.jobs j
 where j.workspace_id = 'c4840acc-0323-5e13-b1d3-c18d7eb615cb'
   and j.dedupe_key = 'fixture-job-a'
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------------------------
-- The aggregate. Four buckets, and each one carries exactly one control.
-- ---------------------------------------------------------------------------------------------
--
--   quota_bucket_a_all   workspace-level (business_profile_id NULL). The branch batch 061's
--                        RESTRICTIVE policy takes when a bucket is inside no member scope — 021's
--                        "a WORKSPACE row is not inside any of them" — so user_admin_a, who IS
--                        narrowed, must still read it. A branch no row exercises could be inverted
--                        without a case failing.
--   quota_bucket_a1      business_a1, INSIDE user_admin_a's scope. The positive half of the
--                        narrowing: without it, the negative below would be satisfied by a policy
--                        that denied the admin everything.
--   quota_bucket_a2      business_a2, OUTSIDE it. business_a2 exists precisely to be the Business a
--                        member scope excludes (batch 021), so this is §8.6 case 3 at Business
--                        granularity — and the caller has already passed the ROLE predicate, so the
--                        only thing that can refuse it is the restrictive policy.
--   quota_bucket_b       workspace_b, workspace-level. The row workspace A's owner holds the exact
--                        id of and cannot read, and the row user_owner_b CAN read. The pair is what
--                        stops the cross-tenant negative being satisfied by a policy that denies
--                        everyone.
--
-- `computed_through` is set on three and NULL on quota_bucket_a2. The two states are different
-- claims — "I summarise the ledger up to this instant" and "I claim nothing at all" — and a fixture
-- carrying only the first could not tell them apart. The zeroes on a2 are therefore not a bucket
-- that measured nothing; they are a bucket that has never been computed, which is what its NULL
-- watermark says and what its numbers alone could not.
--
-- The period is one calendar month, whole, matching the subscription periods batch 130's fixture
-- writes. Nothing joins the two — §6's registry gives that join to batch 132 — and the alignment is
-- there so that when 132 writes the join it is not the first to discover that the two families
-- disagreed about what a period is.
insert into app.quota_buckets
  (id, workspace_id, business_profile_id, dimension, quantity_unit,
   period_start, period_end, consumed_amount, reserved_amount, computed_through) values
  ('8f90d88b-d9b8-5221-ae37-39942a8fd083', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb', null,
   'ai_tokens', 'token',
   timestamptz '2026-09-01 00:00:00+00', timestamptz '2026-10-01 00:00:00+00',
   1450, 200, timestamptz '2026-09-01 12:00:00+00'),
  ('e0c96a63-9722-56c8-95f1-a28b24abf0d8', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 'ai_tokens', 'token',
   timestamptz '2026-09-01 00:00:00+00', timestamptz '2026-10-01 00:00:00+00',
   1450, 200, timestamptz '2026-09-01 12:00:00+00'),
  ('9d6c5152-2a18-5d68-a2eb-ac370d687de6', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   '0a5bed73-2981-5699-b2a1-e1c1663127f4', 'ai_tokens', 'token',
   timestamptz '2026-09-01 00:00:00+00', timestamptz '2026-10-01 00:00:00+00',
   0, 0, null),
  ('c4d33f90-e6f1-54ea-a554-5b3f73a5ad5d', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765', null,
   'ai_tokens', 'token',
   timestamptz '2026-09-01 00:00:00+00', timestamptz '2026-10-01 00:00:00+00',
   990, 0, timestamptz '2026-09-01 12:00:00+00')
-- Keyed on the natural key batch 061 declares rather than on the primary key, so a re-run cannot
-- produce a second aggregate of the same scope, dimension and period even if an id were regenerated.
-- The constraint is NULLS NOT DISTINCT and two of these rows carry a NULL business_profile_id, which
-- is exactly the inference a column list would get wrong.
on conflict on constraint quota_buckets_one_per_period do nothing;

commit;
