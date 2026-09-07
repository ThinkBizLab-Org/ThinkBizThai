-- GLOBAL and tenant fixture for the batch 130 isolation cases.
--
-- Owner: A6 Billing. It loads AFTER 010-identity-fixture.sql and before nothing; the runner applies
-- the whole list in order, and a subscription cannot exist without the Workspace it names or the
-- published plan revision it pins. It needs no row from 020, 021, 030 or 040 — a subscription is a
-- WORKSPACE row and carries no Business and no Page — and it is last in the list for the same reason
-- every other entry is where it is: the list is an ORDER, not a set.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
-- THE THREE PLAN ROWS BELONG TO NO TENANT, as batch 030's pack rows do. They carry no workspace_id
-- because the tables have none: §5 scopes `billing.core` "global/workspace" and §3.3 requires the
-- canonical scope field on tenant-owned rows only. Their catalog symbols carry no `_a` or `_b`
-- suffix for the same reason.
--
-- WHAT THIS FIXTURE DOES NOT CONTAIN, WHICH IS THE POINT OF THE BATCH IT SERVES:
--
--   * NO CARD NUMBER, no masked card number, no brand, no expiry, no CVV and no payment token. There
--     is no column for one — §9.2 and BILL-DEC-003 forbid the data and 130_billing.sql refuses the
--     column shapes it arrives in — and RFC-2026-008 is the reason a fixture is where this would
--     have shown up: the scanner reports a Luhn-valid PAN wherever it appears, "published provider
--     test cards are reported, not exempted", and the exemption that would be needed for one has to
--     be designed before a payment package starts rather than under its deadline.
--   * NO STRIPE IDENTIFIER of any kind, for the reason 130_billing.sql's header gives at length: the
--     provider read model is batch 131's and §9.3's safe form for an external id does not exist here.
--   * NO SECOND PLAN AND NO YEARLY PRICE. `year` is in the interval vocabulary because §5.1 names an
--     interval and §1 names both; whether a yearly price is OFFERED is BILL-OQ-01, which is OPEN, so
--     the vocabulary is the document's and the offering stays Product's. A fixture row would be this
--     batch answering it.
--
-- THE PRICE IS A SYNTHETIC FIGURE AND THIS FILE IS NOT A PRICE LIST. BILL-OQ-01 ("ราคา/แพ็กเกจ")
-- is OPEN with a Product owner, BILL-DEC-009 and BILL-OQ-04 leave VAT undecided, and BILL-DEC-014
-- marks THB `UNVERIFIED` against a live account. The number below exists so that a column typed
-- numeric(18,6) has a row that uses its scale.
--
-- THIS FILE LOADS ADMINISTRATIVELY, as the table owner, before any identity is assumed — and here
-- that is not a preference, it is the only way. Batch 130 writes NO INSERT policy and NO INSERT
-- grant on any of its four tables, for any role, so there is no request-path caller that could load
-- a single row of this fixture. Every earlier fixture could have been loaded through the policies
-- under test and was not, because "a fixture that depends on the policies under test cannot
-- distinguish 'the policy works' from 'the fixture happened to load'". This one has no such choice
-- to make, which is itself the shape the batch is asserting.
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- The global plan identity. No workspace_id, no created_by, no updated_by: §3.2 asks for the actor
-- columns on a row a USER mutates, and no user mutates this one. `plan_code` is the stable key §6
-- invariant 5 requires of a global seed, and it is what makes this insert re-runnable.
--
-- The code is §5.3's own example, `starter_th_monthly_v1`, rather than one invented here — and it is
-- the only billing value §5.2 lets a client send, so its exact form is an input contract.
insert into app.billing_plans (id, plan_code) values
  ('398fe3dc-62c6-5e95-9a5d-93457692e904', 'starter_th_monthly_v1')
on conflict (plan_code) do nothing;

-- Its published revision 1 — the plan contract, carrying the price.
--
-- `effective_from` is a FIXED timestamptz rather than now(), for the reason batch 030's fixture gives
-- about released_at: every other value here is a pure function of its symbol, and a fixture whose
-- content depends on when it ran is one whose failures depend on when they ran.
--
-- The amount carries a non-zero sixth decimal on purpose. No case can read it today — the plan
-- catalog is behind an empty read allowlist and every client read of this table is refused at the
-- privilege layer — so the column's declared type is asserted by 130_billing.sql's apply-time block
-- instead. The value is written to the full scale so that the day an RFC opens that read, the case
-- that reads it back is an assertion about a figure the column had to hold EXACTLY, and a column
-- quietly retyped to numeric(18,2) or to a float would change it.
--
-- ON CONFLICT names the natural key (billing_plan_id, revision) rather than the primary key, so a
-- re-run cannot produce a second publication of the same revision even if the id were regenerated.
insert into app.billing_plan_versions
  (id, billing_plan_id, revision, display_name_th, currency, unit_amount, billing_interval, effective_from) values
  ('eac2ef2e-c61c-5400-a208-d8be90d87b10', '398fe3dc-62c6-5e95-9a5d-93457692e904',
   1, 'แพ็กเกจเริ่มต้น รายเดือน', 'THB', 990.123456, 'month',
   timestamptz '2026-09-01 00:00:00+00')
on conflict (billing_plan_id, revision) do nothing;

-- What that revision grants. BOTH `entitlement_kind` values are loaded, for the reason batch 040
-- loaded all four of its `kind` values: a vocabulary that only ever appears in a CHECK is a
-- vocabulary no row has ever had to satisfy, and the whole argument for two typed columns is that
-- §5.3's own example carries both shapes.
--
-- All three feature keys and both limits are §5.3's, unchanged. `asset_storage_bytes` is the one
-- that decides the column type: 21474836480 does not fit an `integer`, and §3.2 fixes byte, token
-- and operation quantities as `bigint`.
insert into app.plan_entitlements
  (billing_plan_id, billing_plan_version_id, feature_key, entitlement_kind, limit_value, text_value) values
  ('398fe3dc-62c6-5e95-9a5d-93457692e904', 'eac2ef2e-c61c-5400-a208-d8be90d87b10',
   'workspace_users', 'limit', 3, null),
  ('398fe3dc-62c6-5e95-9a5d-93457692e904', 'eac2ef2e-c61c-5400-a208-d8be90d87b10',
   'asset_storage_bytes', 'limit', 21474836480, null),
  ('398fe3dc-62c6-5e95-9a5d-93457692e904', 'eac2ef2e-c61c-5400-a208-d8be90d87b10',
   'ai_generation_mode', 'value', null, 'included_or_byok_policy')
on conflict (billing_plan_version_id, feature_key) do nothing;

-- The subscriptions. One per tenant, both `active`, and both naming THE SAME GLOBAL revision id
-- across the tenant boundary, on purpose.
--
-- No case asserts that by reading both rows — no identity can, and no identity can read the plan
-- revision either — so it is asserted by two positives, one per owner, each naming that id in its
-- own WHERE clause. The foreign key is what makes the catalog row's existence a fact rather than an
-- assumption: `billing_plan_version_id` is NOT NULL and references app.billing_plan_versions, so a
-- subscription that loaded at all is a subscription whose plan revision is there.
--
-- There is no `created_by` and no `updated_by` on this table. §3.2 asks for the actor columns on a
-- row a USER mutates, and no role holds INSERT, UPDATE or DELETE here; the acting user belongs in an
-- audit event (batch 140) and in `billing_operations` (batch 131).
--
-- The periods are fixed timestamptz values, for the reason above, and they are a whole period —
-- 130_billing.sql refuses a half-open one, so a fixture with a start and no end would not load.
--
-- ON CONFLICT names the PARTIAL unique index, predicate included, because that is the constraint
-- §1's "หนึ่ง billable subscription ต่อหนึ่ง workspace" becomes: a workspace holds at most one
-- subscription that is not `canceled`, and inference against a partial index has to repeat its
-- predicate.
insert into app.billing_subscriptions
  (workspace_id, billing_plan_version_id, local_access_state,
   current_period_start, current_period_end, grace_expires_at) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'eac2ef2e-c61c-5400-a208-d8be90d87b10', 'active',
   timestamptz '2026-09-01 00:00:00+00', timestamptz '2026-10-01 00:00:00+00', null),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', 'eac2ef2e-c61c-5400-a208-d8be90d87b10', 'active',
   timestamptz '2026-09-01 00:00:00+00', timestamptz '2026-10-01 00:00:00+00', null)
on conflict (workspace_id) where local_access_state <> 'canceled' do nothing;

commit;
