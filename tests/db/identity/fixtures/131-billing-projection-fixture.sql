-- Tenant fixture for the batch 131 isolation cases.
--
-- Owner: A6 Billing. It loads AFTER 130-billing-fixture.sql and needs it: an invoice reaches
-- app.billing_subscriptions over §3.3's composite scope path, and that subscription is a row batch
-- 130's fixture writes. It is last in the list for the reason every other entry is where it is —
-- the list is an ORDER, not a set, and a new batch appends to its end.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
-- THIS FIXTURE LOADS ROWS NO IDENTITY CAN READ, which batch 050's fixture did first and which is
-- required rather than merely tolerated: `service-sees-zero-*` has to address a row that EXISTS, or
-- the empty result is a table with nothing in it rather than a policy refusing. Every row below
-- exists so that some negative is about a control instead of about an absence.
--
-- IT COULD NOT BE LOADED ANY OTHER WAY. Batch 131 writes no INSERT policy and grants no client role
-- anything, so there is no request-path caller that could write a single row of this file. Batch 130
-- reached the same state and said why it is worth naming: every earlier fixture COULD have been
-- loaded through the policies under test and deliberately was not, because "a fixture that depends on
-- the policies under test cannot distinguish 'the policy works' from 'the fixture happened to load'".
-- This one has no such choice, which is itself the shape the batch asserts.
--
-- WHAT THIS FIXTURE DOES NOT CONTAIN, WHICH IS THE POINT OF THE BATCH IT SERVES:
--
--   * NO CARD NUMBER, no masked card number, no brand, no expiry, no CVV, no payment-method token
--     and no bank account. There is no column for any of them — §9.2 and BILL-DEC-003 forbid the
--     data, and 131_billing_projection.sql refuses the column shapes on every apply — and a fixture
--     is exactly where one would have arrived. RFC-2026-008 is the reason that matters: the scan
--     walks the working tree, git history is not scanned, "a PAN that reaches `main` is a disclosure
--     that this repository has no mechanism to undo", and published provider test cards are reported
--     rather than exempted. There is no digit run in this file long enough to be one.
--   * NO RAW PROVIDER IDENTIFIER. Every `evt_`, `in_` and `pi_` this file would otherwise carry is a
--     SHA-256 digest of a synthetic label instead — §9.3's "stable hash for uniqueness", with the
--     "raw encrypted/private reference" half refused for the reason 131's header gives.
--   * NO RAW WEBHOOK BODY, NO SIGNATURE HEADER. §8.1/7 forbids logging them and there is no column;
--     `payload_hash` is a digest of a synthetic label, so the file demonstrates the receipt shape
--     without carrying a payload to demonstrate it with.
--
-- THE DIGESTS ARE COMPUTED, NOT PASTED. `sha256(convert_to('…','utf8'))` from pg_catalog, which is
-- how batch 010's fixture builds an invitation's token_hash and how the case file addresses these
-- rows — a pasted hex literal would be an unverifiable constant, which is the thing the fixture
-- catalog exists to avoid. `public.digest` is deliberately not used: pgcrypto lives in `extensions`
-- on the provisioned instance (see 010's fixture note).
--
-- EVERY TIMESTAMP IS FIXED. A fixture whose content depends on when it ran is one whose failures
-- depend on when they ran (030's sentence about released_at, kept by 130 and 140).
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- THE THREE WEBHOOK RECEIPTS, AND THE THIRD ONE IS THE POINT.
--
-- Two are RESOLVED — processing worked out which workspace the provider event was about, and
-- `correlation_workspace_id` names it. The third is UNRESOLVED: `correlation_workspace_id` is NULL,
-- nothing has processed it, and it is the row that makes §8.3's own initial value (`
-- correlation_workspace_id: null`) real rather than merely permitted by a nullable column.
--
-- That row is also what RFC-2026-022 §3's DISCOVERED classification is about, as data. A confinement
-- predicate `correlation_workspace_id = <the workspace setting>` excludes exactly this row — the one
-- a processor exists to resolve — which is why the cell cannot be CARRIED and why
-- db/foundation/lint/service-policy-map.json classifies it the way it does.
--
-- `provider_event_type` values are three of §8.5's own event-coverage baseline names, unchanged,
-- because the form constraint is about a shape a router dispatches on and a synthetic word would not
-- exercise it. They are NAMES of events, not events: nothing here is a provider payload.
insert into app.billing_webhook_receipts
  (provider, livemode, provider_event_hash, payload_hash, provider_event_type,
   provider_created_at, received_at, correlation_workspace_id, attempt_count,
   next_attempt_at, processed_at, dead_lettered_at, last_error_code) values
  ('stripe', false,
   sha256(convert_to('fixture-billing-event-a', 'utf8')),
   sha256(convert_to('fixture-billing-payload-a', 'utf8')),
   'invoice.paid',
   timestamptz '2026-09-01 00:00:10+00', timestamptz '2026-09-01 00:00:11+00',
   'c4840acc-0323-5e13-b1d3-c18d7eb615cb', 1, null,
   timestamptz '2026-09-01 00:00:12+00', null, null),
  ('stripe', false,
   sha256(convert_to('fixture-billing-event-b', 'utf8')),
   sha256(convert_to('fixture-billing-payload-b', 'utf8')),
   'invoice.payment_failed',
   timestamptz '2026-09-01 00:00:20+00', timestamptz '2026-09-01 00:00:21+00',
   '43fd5c24-ebea-528f-9ce9-eedf1f8f9765', 1, null,
   timestamptz '2026-09-01 00:00:22+00', null, null),
  -- The unresolved one. No workspace, never processed, due for a first attempt.
  ('stripe', false,
   sha256(convert_to('fixture-billing-event-unresolved', 'utf8')),
   sha256(convert_to('fixture-billing-payload-unresolved', 'utf8')),
   'customer.subscription.updated',
   timestamptz '2026-09-01 00:00:30+00', timestamptz '2026-09-01 00:00:31+00',
   null, 0, timestamptz '2026-09-01 00:01:00+00', null, null, null)
-- Keyed on §8.2's inbound idempotency key, which is what a redelivery collides with.
on conflict (provider, livemode, provider_event_hash) do nothing;

-- THE TWO INVOICES, ONE PER TENANT.
--
-- Each names its own workspace AND its own subscription, and the pair is checked by the composite
-- foreign key batch 131 adds — so a fixture that got the pairing wrong would fail to load rather than
-- loading a row that proves the wrong thing. The subscription is addressed by the natural key batch
-- 130 declares: at most one row per workspace that is not `canceled`.
--
-- They carry catalog SYMBOLS where the receipts and the payments do not, and the rule is the
-- catalog's own: a receipt is addressed by (provider, livemode, event digest) and a payment by
-- (provider, livemode, payment digest), both unique constraints spelled out of text this file and
-- the case file share. An invoice's id is a value ANOTHER ROW MUST NAME — app.billing_payments'
-- composite foreign key — which is exactly the case batch 050 recorded for an outbox event.
--
-- The amount is the plan revision's own price, so the read model and the catalog agree about what a
-- month costs; the sixth decimal is there for the reason batch 130's fixture gives — the column is
-- numeric(18,6) and a value written to the full scale is what a retype to numeric(18,2) or to a float
-- would change.
insert into app.billing_invoices
  (id, workspace_id, billing_subscription_id, provider, livemode, provider_invoice_hash,
   currency, amount_due, issued_at, due_at, settled_at, voided_at, provider_revision) values
  ('44774513-4410-5d72-9d37-1ceb2aec1925',
   'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   (select id from app.billing_subscriptions
     where workspace_id = 'c4840acc-0323-5e13-b1d3-c18d7eb615cb'
       and local_access_state <> 'canceled'),
   'stripe', false,
   sha256(convert_to('fixture-billing-invoice-a', 'utf8')),
   'THB', 990.123456,
   timestamptz '2026-09-01 00:00:00+00', timestamptz '2026-09-08 00:00:00+00',
   timestamptz '2026-09-01 00:00:12+00', null, 1),
  ('08997b86-7491-595f-aefc-c338b4e7d127',
   '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   (select id from app.billing_subscriptions
     where workspace_id = '43fd5c24-ebea-528f-9ce9-eedf1f8f9765'
       and local_access_state <> 'canceled'),
   'stripe', false,
   sha256(convert_to('fixture-billing-invoice-b', 'utf8')),
   'THB', 990.123456,
   timestamptz '2026-09-01 00:00:00+00', timestamptz '2026-09-08 00:00:00+00',
   -- UNSETTLED, and deliberately so: workspace B's only payment row FAILED. The two invoices
   -- therefore differ in the one column an owner would most want to read, so a case that could see
   -- across the tenant boundary would be seeing something that matters rather than two identical
   -- rows. The unpaid state is `settled_at is null and voided_at is null` — a query, not a status
   -- word (see the migration's column comment).
   null, null, 1)
on conflict (provider, livemode, provider_invoice_hash) do nothing;

-- THE THREE PAYMENT ROWS, AND WHY THERE ARE THREE.
--
-- Both `direction` values are loaded and both outcomes are, for the reason batch 040 loaded all four
-- of its `kind` values and batch 130 loaded both entitlement kinds: a vocabulary that only ever
-- appears in a CHECK is a vocabulary no row has had to satisfy.
--
--   charge  / succeeded  — workspace A paid its invoice.
--   refund  / succeeded  — and part of it came back. THIS IS THE ROW THAT MAKES THE APPEND-ONLY
--                          CLAIM AFFORDABLE RATHER THAN MERELY STRICT: §12.1 ends "อัปเดต ledger
--                          projection", and the ledger-correct form of that update is another entry
--                          rather than an edit to the first one. Two rows against one invoice is
--                          what a reader has to see before "no role holds UPDATE here" reads as a
--                          design instead of as a missing grant.
--   charge  / failed     — workspace B's charge did not go through, carrying a failure CODE and no
--                          message. §8.5 requires `invoice.payment_failed` to be handled and §9.2
--                          forbids a provider stack trace or full SDK error anywhere.
--
-- The invoice is named by its catalog id, so the composite keys are exercised in both of their
-- directions: the tenant path (workspace_id, billing_invoice_id) and the mode pair
-- (billing_invoice_id, livemode). Every row is `livemode false`, which is the only mode a fixture may
-- carry — §5.2 forbids mapping across modes and there is no live account (BILL-DEC-001 is APPROVED
-- and still awaiting account verification).
insert into app.billing_payments
  (workspace_id, billing_invoice_id, provider, livemode, provider_payment_hash,
   direction, currency, amount, occurred_at, succeeded_at, failed_at, failure_code) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '44774513-4410-5d72-9d37-1ceb2aec1925',
   'stripe', false,
   sha256(convert_to('fixture-billing-payment-a-charge', 'utf8')),
   'charge', 'THB', 990.123456,
   timestamptz '2026-09-01 00:00:12+00', timestamptz '2026-09-01 00:00:12+00', null, null),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '44774513-4410-5d72-9d37-1ceb2aec1925',
   'stripe', false,
   sha256(convert_to('fixture-billing-payment-a-refund', 'utf8')),
   'refund', 'THB', 90.000000,
   timestamptz '2026-09-02 00:00:00+00', timestamptz '2026-09-02 00:00:00+00', null, null),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '08997b86-7491-595f-aefc-c338b4e7d127',
   'stripe', false,
   sha256(convert_to('fixture-billing-payment-b-charge', 'utf8')),
   'charge', 'THB', 990.123456,
   timestamptz '2026-09-01 00:00:22+00', null, timestamptz '2026-09-01 00:00:22+00',
   'fixture_declined')
on conflict (provider, livemode, provider_payment_hash) do nothing;

commit;
