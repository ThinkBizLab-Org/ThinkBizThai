-- Batch 130 — billing: the plan catalog, its published prices, what a plan grants, and the
-- workspace's subscription to one of them.
--
-- Owner: A6 Billing. The migration ownership registry (§6) reserves 130 to this package and
-- describes it as "plan/price/entitlement/subscription", depending on 010.
--
-- Depends on: 000 (schemas, private.set_updated_at), 001 (app_worker), 010 (app.workspaces),
-- 011 (app.workspace_member_role). All four are merged; migration invariant 1 forbids rewriting any
-- of them and NOTHING BELOW DOES — every statement here creates a new object or attaches a policy to
-- one this file created, and no `drop policy` names a policy another batch wrote. A test asserts
-- that pairing rather than trusting this sentence.
--
-- 011 IS A DEPENDENCY THE REGISTRY DOES NOT LIST, and saying so is cheaper than letting a reader
-- find it in a predicate. §6 gives 130 "010" and nothing else. The one policy below resolves the
-- caller's role through `app.workspace_member_role`, which is batch 011's, because RFC-2026-020 §5/5
-- makes reading membership through the helpers uniform and because 020, 021, 030 and 040 all obey
-- it. The alternative — `exists (select 1 from app.workspace_members ...)` — would evaluate that
-- scan AS THE CALLER and make the width of billing visibility a function of another module's policy
-- set. The registry row is not wrong; it predates 011 being split out of 010.
--
--
-- WHAT THIS BATCH IS ABOUT, WHICH IS MOSTLY WHAT IT REFUSES TO STORE AND WHAT IT REFUSES TO LET
-- ANYBODY WRITE
--
-- A PRICE IS MONEY AND A SUBSCRIPTION IS A COMMITMENT. Every other family in this schema so far has
-- held a name, a label, a scope row or a piece of tenant content; a wrong policy there leaks or
-- corrupts data. Here a wrong GRANT lets a caller give itself a paid entitlement, and a wrong COLUMN
-- puts regulated cardholder data into a database that has no mechanism to remove it — RFC-2026-008
-- records that the secret scan walks the working tree only, so "a PAN that reaches `main` is a
-- disclosure that this repository has no mechanism to undo".
--
-- So the two questions this batch had to answer before any column was written were the ones its
-- assignment names: WHAT MAY BE STORED AT ALL, and WHICH OF IT BELONGS TO AN EXTERNAL PROVIDER.
-- The answers are below as absences, and each absence is a decision with a reason and an owner.
--
--
-- 1. NO CARDHOLDER DATA, AND NO PAYMENT INSTRUMENT BY ANOTHER NAME
--
-- §9.2 forbids storing or exporting "card PAN/CVV หรือ payment credential ที่ provider จัดการ".
-- `sprint-0a-stripe-billing-contract-th.md` BILL-DEC-003 marks the same rule `MANDATORY` and its
-- §14.1 lists PAN, CVC/CVV and raw stripe/chip data as data the system must not store or log.
--
-- No table below carries a card column, a masked card column, a brand, an expiry, a fingerprint or a
-- token. THE ONE THAT WOULD HAVE BEEN ARGUABLE IS `last4`, and it is refused rather than debated in
-- a later pull request. §14.1 permits "brand/last4/expiry ที่ Stripe ส่งให้และมี UX need โดยต้องผ่าน
-- privacy review" — three conditions, and none of them holds: Stripe sends us nothing (Gate G0
-- authorizes no provider integration), there is no UX because there is no `src/`, and no privacy
-- review has happened. A `last4` column added now would be a column with no writer, no reader and no
-- review, on the one table where the wrong value is a Luhn-valid PAN. RFC-2026-008 says why the
-- scanner requires Luhn AND an issuer prefix: "someone will eventually try", and it will be tried
-- into whichever column is shaped like a card number.
--
-- §9.2's own carve-out — "Secret table เก็บได้เพียง `credential_reference`, provider,
-- fingerprint/last-four-like identifier, status, created/rotated/expired timestamps และ audit
-- reference" — describes a SECRET TABLE. §3.1 puts secret references in `private`, with no direct
-- grant, and this batch creates nothing in `private`. A payment-method surface is not one of the
-- four words §6 gives batch 130.
--
--
-- 2. NO PROVIDER IDENTIFIER OF ANY KIND, WHICH IS THE LARGEST THING THIS BATCH DOES NOT DO
--
-- Not a Stripe customer id, not a subscription id, not a price id, not a product id, not an invoice
-- id, not a payment intent id, and not `livemode`. The billing contract's own §5.1 puts
-- `stripe_customer_id` on `billing_customers` and "Stripe subscription" on `billing_subscriptions`,
-- so this is a departure from that table sketch and not an oversight. Four reasons, and the fourth
-- is the one that decides:
--
--   * §6's registry gives "webhook/invoice/payment read model" to batch `131`. A Stripe identifier
--     exists to be reconciled against Stripe, and the thing that reconciles is the webhook
--     projection, which is 131's. 010's rule — "a grant issued ahead of the thing that needs it is a
--     grant nobody reviews against a caller" — reads the same way about a column.
--   * §9.3 requires an external account ID to be stored as a "raw encrypted/private reference +
--     stable hash for uniqueness". Neither an encrypted-reference mechanism nor the `private`
--     secret-reference surface exists in this repository. Writing the raw id into an exposed row
--     because the safe form is unavailable is the inversion every batch here has refused.
--   * §9.1 classifies a provider identifier `PROVIDER-3` — "redact external identifiers",
--     "safe projection only". The one client grant this batch writes is a SELECT on
--     app.billing_subscriptions, so a provider id on that row would be inside a client projection by
--     construction.
--   * §14.1 of the billing contract permits Stripe object IDs "เท่าที่จำเป็น ... โดยต้องผ่าน privacy
--     review". No privacy review has happened, and Gate G0 authorizes no provider integration at
--     all.
--
-- WHAT THAT COSTS, STATED RATHER THAN ABSORBED. app.billing_subscriptions below cannot be reconciled
-- against Stripe by anything in this batch: §13.1's `MISSING_LOCAL_CUSTOMER`, `UNKNOWN_PRICE`,
-- `SUBSCRIPTION_STATUS_DRIFT` and `LIVEMODE_MISMATCH` mismatch classes are all undetectable here,
-- because the columns they compare do not exist. That is owed to 131 together with the projection
-- that writes the row, and it is recorded in this package's open blockers rather than left to be
-- discovered by whoever writes the reconciliation job.
--
-- `provider_status` IS REFUSED FOR THE SAME REASON, and it is worth naming separately because §9 of
-- the billing contract asks for it in terms: "แยก `provider_status` จาก `local_access_state`". The
-- separation is right and this batch implements the half that is OURS. `provider_status` holds
-- Stripe's own vocabulary (`incomplete`, `past_due`, `unpaid`, `paused`...), §9 requires the mapping
-- from it to be "อยู่ใน versioned policy" and no such policy exists, and nothing in this repository
-- can write it. A column carrying a provider's state words, with no writer and no pinned mapping,
-- is a column nobody reviewed. Owed to 131.
--
--
-- 3. NOBODY MAY CREATE, CHANGE OR END A SUBSCRIPTION THROUGH THIS SCHEMA
--
-- This is the batch's central decision and it is written as ABSENT GRANTS, so the refusal is at the
-- privilege layer and cannot be undone by editing a policy.
--
-- `CONTRIBUTING_AGENTS.md`: "Payment entitlement is derived only from a verified Stripe webhook
-- projection. Checkout redirects are never proof of payment." The billing contract says the same
-- three times — §3/2 ("ห้ามเปิดสิทธิ์จาก redirect หรือ query string"), §2.1 ("ห้ามสร้าง entitlement
-- ด้วยการแก้ฐานข้อมูลตรง ๆ") and §12.1 ("ห้าม Support ปรับ subscription/entitlement โดยแก้ DB").
-- RFC-2026-012 decision 1 says it once for every family: server-only mutation, zero exceptions at
-- G0.
--
-- §8.3's "Plan/payment action | Y | N | N | N | N | P" is not an objection to this. RFC-2026-012's
-- own "crux" section is the reading: `auth.uid()` reads a claim on the SESSION, so a policy
-- "constrains the content of the row and the identity of the session; it says nothing about the
-- tier, and RLS has no predicate that could". A plan/payment ACTION is a Checkout session created by
-- a server handler; the local row is the PROJECTION of what the provider then confirmed. Writing an
-- INSERT policy for the owner here would not implement that cell — it would implement "the client
-- may assert its own entitlement", which is the one sentence three source documents forbid.
--
-- So: `authenticated` holds a column-scoped SELECT on app.billing_subscriptions and NOTHING ELSE, on
-- any table in this batch. And `app_worker` holds SELECT and nothing else either, because the writer
-- is the webhook projection and the webhook projection is batch 131 — 010's sentence again, applied
-- to the service. The isolation suite asserts both, in both directions.
--
-- THAT CLAIM IS NOT IN THIS FILE'S APPLY-TIME BLOCK, AND THE REASON IS 021's SCAR RATHER THAN A
-- SHORTAGE OF NERVE. 011's block raises when app_authz holds a number of policies other than one,
-- and 021 had to route around an APPLIED migration's self-assertion rather than propose the
-- amendment that would have made it false. Batch 131 must write this projection, so a write grant —
-- and, under RFC-2026-012 §4's SECURITY DEFINER command function owned by a role that is not the
-- table owner, a policy to go with it — is a thing an already-named batch is EXPECTED to add. An
-- apply-time assertion forbidding it would be false on the day it is meant to be, on every re-apply
-- of the whole set. So the claim is pinned in tests/db/identity/identity-isolation.test.mjs, over
-- every migration's text, where the batch that changes it edits a line a reviewer reads — which is
-- 030's rule about the read allowlist, arriving at the write path.
--
-- What the apply-time block DOES assert about writes is the half no later batch may reverse: the two
-- published tables are immutable, and `anon` names no policy.
--
--
-- 4. THE GLOBAL CATALOG IS UNREACHABLE FROM THE REQUEST PATH, FOR 030's REASON AND NOT A NEW ONE
--
-- app.billing_plans, app.billing_plan_versions and app.plan_entitlements belong to no tenant. §5
-- scopes `billing.core` "global/workspace" and §3.3 requires the canonical scope field on
-- tenant-owned rows only, so none of the three carries a workspace_id.
--
-- Batch 030 worked out what a batch may do with a global table under an empty read allowlist and
-- this batch CONSUMES that reasoning rather than re-deriving it. 030_industry.sql, quoted:
--
--   "A GLOBAL catalog has no such predicate. The only thing between an authenticated caller and the
--    whole table would be the column grant — which is exactly the failure §2 names ... §2's reason
--    is prospective on a tenant table and load-bearing here."
--
-- RFC-2026-021 (approved 2026-09-06) then decided the mechanism: an allowlist entry is five objects
-- plus a registry row, a candidate must satisfy C1-C7, and NO entry is added. §9.1's FIN-3 row says
-- the client projection of a price is an "owner/admin summary" — which is a PROJECTION, which is an
-- allowlist entry, which §3 of RFC-2026-012 gives to an RFC and takes away from a pull request.
--
-- SO THE PLAN CATALOG IS THE STRONGEST ALLOWLIST CANDIDATE THIS REPOSITORY HAS PRODUCED, AND THIS
-- BATCH STILL MAY NOT ADD IT. It fails C1 for exactly the reason the industry catalog fails C1:
-- there is no client caller, because there is no `src/`. It differs from the industry catalog in
-- that a plan picker is a screen §7.1 of the billing contract already describes ("Owner เลือก
-- แพ็กเกจจากการ์ดภาษาไทย"), so C1 is a matter of time rather than of doubt — and C7 would then have
-- to state the blast radius in one sentence: every authenticated user of the product can enumerate
-- every plan and every price, including plans no workspace is on. That sentence is probably fine and
-- it is not this batch's to write. WHICH BATCH CREATES THE ENTRY IS NOT ASSIGNED: RFC-2026-021 §3
-- says a new batch in the family owner's range, and naming one here would create a batch number by
-- citation, which this package's open blockers already refuse for the industry catalog's `031`.
--
-- `anon` IS GRANTED NOTHING, and since 2026-09-06 that is an approved decision rather than an
-- inherited convention: RFC-2026-021 §7/4 gives the structural reason — the first `anon` grant is
-- `grant usage on schema app`, which changes the DENIAL LAYER of every object in `app` at once. All
-- three anonymous cases in the isolation suite declare the refusal on the SCHEMA for that reason.
--
-- THE ONE CLIENT GRANT THIS BATCH WRITES JOINS THE LIST RFC-2026-021 §8.5 EXPECTS TO BE CLOSED, and
-- that is recorded rather than absorbed. §8.5 names the inherited `authenticated` base-table grants
-- in 010, 020 and 021 and says the known-exceptions list must be CLOSED — "any new one fails" —
-- while §10 owes those grants to 170. 030 wrote new ones, 040 wrote new ones, and this batch writes
-- one more, so whoever writes that list will enumerate SIX batches rather than three. It is a debt
-- and not a contradiction for 030's reason and 040's: the grant below is COLUMN-SCOPED and bounded
-- by a predicate row level security can express — `app.workspace_member_role(workspace_id) =
-- 'owner'`, which is NARROWER than the `app.is_active_member(workspace_id)` every earlier batch
-- used, because §8.3 marks this cell `Y` for the owner alone.
--
--
-- WHICH §8.3 CELLS THIS IMPLEMENTS, AND THE ONE IT REFUSES FOR A REASON NO EARLIER BATCH HAD
--
-- §8.3 has two rows about this family:
--
--   | Billing/subscription SELECT | Y | P | N | N | N | P |
--   | Plan/payment action         | Y | N | N | N | N | P |
--
-- THE OWNER'S `Y` ON SELECT IS IMPLEMENTED, on app.billing_subscriptions, and it is the whole of
-- what a client may do in this batch.
--
-- THE `N` CELLS ARE IMPLEMENTED AS SILENCE AND ARE ASSERTED AS ZERO ROWS. This is the first family
-- in this schema where an ACTIVE MEMBER of a workspace sees none of its rows: every SELECT row in
-- §8.1 and §8.2 is `Y` for all five built-in roles, and this one is `Y` for the owner and `N` for
-- editor, approver and viewer. Three isolation cases assert it, each paired with the owner's
-- positive so the refusal is a policy and not an empty table.
--
-- THE ADMIN'S `P` IS REFUSED, and the reason is NOT the one 010, 011, 020, 021 and 030 all gave.
-- Those batches refused a `P` because "no document defines the capability set". Here a document
-- does: `sprint-0a-stripe-billing-contract-th.md` §6 gives "ดูแผน/สถานะ" to a **Billing Admin**, and
-- BILL-DEC-004 makes that role explicit — "Workspace Owner เป็นผู้เริ่ม Checkout/Portal; Billing
-- Admin เป็น role ที่เพิ่มได้", status `PROPOSED`. So the capability behind §8.3's `P` is plausibly a
-- SIXTH ROLE, and that is worse than an undefined capability rather than better:
--
--   * §7 of the data package fixes FIVE built-in roles and `billing_admin` is not among them.
--   * `app.workspace_members.role` is `text` + a named CHECK over exactly those five, written by
--     batch 010, which is APPLIED. Adding a sixth value means editing that CHECK, and migration
--     invariant 1 forbids rewriting a merged migration; it would have to be a forward `alter table
--     ... drop constraint / add constraint` in a batch that owns app.workspace_members, which 130
--     does not.
--   * BILL-DEC-004 is `PROPOSED`, and §15 forbids an agent closing an open decision.
--
-- Writing `role in ('owner', 'admin')` instead would delete the distinction between `Y` and `P` and
-- ship every workspace admin the billing surface — which BILL-DEC-004 explicitly declines to do,
-- since it proposes a separate role precisely so that "admin" and "billing admin" are not the same
-- person. The cell is denied by default. It is owed to Product plus A1 Identity through an RFC that
-- amends §7's role vocabulary, and to the batch that owns the membership table.
--
-- THE SERVICE `P` ON BOTH ROWS IS TREATED AS 010, 020, 021, 030 AND 040 TREAT IT: grants and no
-- policy, so a service denial is attributable to row level security rather than to a forgotten
-- GRANT. Here the grant is SELECT alone, so the service's own write refusals are at the GRANT layer
-- and its reads are refused by RLS — two different layers on one table, each asserted as itself.
--
--
-- NO MEMBER-SCOPE NARROWING, AND THAT IS 021's SENTENCE RATHER THAN AN OMISSION
--
-- Every batch since 021 has added a RESTRICTIVE policy, and this one does not. A subscription is a
-- WORKSPACE row: it carries `workspace_id` and neither `business_profile_id` nor
-- `page_context_profile_id`. 021 met exactly this question about "Workspace UPDATE: Admin P" and
-- answered it, quoted from 021_member_scope.sql:
--
--   "§7's scope types are `all_businesses`, `business` and `page` — every one of them names a
--    Business or a Page — and a WORKSPACE row is not inside any of them."
--
-- So there is no scope for a narrowing to express here, and adding `member_scope_admits_business`
-- with a NULL Business would deny every caller while looking like a control. The three global tables
-- have no tenant at all, so the same is true of them one step further out. This is recorded because
-- the ABSENCE of a restrictive policy in a batch that creates four tables is the kind of thing a
-- reviewer should see a reason for.
--
--
-- WHAT IS NOT HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO FIND
--
--   * `billing_customers`. §5.1 of the billing contract names it and §6's registry does not give it
--     to 130 — "plan/price/entitlement/subscription" is four words and a customer mapping is none of
--     them. Its entire content is the provider identity refused above, plus an `email_snapshot`
--     which is the ONLY PII-2 in this family. That has a consequence worth stating: §5 classifies
--     `billing.core` `PII-2/FIN-3`, and every table below is FIN-3 alone, because the PII half lives
--     entirely in the table this batch does not create. Owed to 131.
--
--   * `workspace_entitlements`. §5.1 names it — "workspace, feature, effective value, source, valid
--     period ... คำนวณซ้ำได้จาก source" — and it is the RESOLVED entitlement, which §6's registry
--     gives to batch `132` ("entitlement-metering resolver", depending on 061 and 130). 130 creates
--     what a PLAN grants; 132 computes what a WORKSPACE has. A recomputable projection created by
--     the batch that owns its inputs would be a second source of truth for a value 132 exists to
--     derive.
--
--   * `stripe_event_inbox`, `billing_operations`, `billing_reconciliation_runs`,
--     `billing_notifications`, invoices, payments and refunds. All named in §5.1 and all assigned
--     elsewhere: 131 (webhook/invoice/payment read model), 140 (audit/security event core), 051
--     (notification inbox). 021's sentence applies unchanged — "creating one would be reserving a
--     table no registry row gives this batch".
--
--   * A SUBSCRIPTION HISTORY TABLE. §5 calls this family "versioned + ledger-like", and the version
--     half is paid by app.billing_plan_versions below. The state TRANSITIONS of a subscription are
--     history, and §5.1 puts them in `billing_operations`, which §14.3 requires to carry "subscription
--     changed" and "entitlement changed" audit events. Owed to 131 and 140.
--
--   * TRIAL, COUPON, VAT/TAX AND PRORATION COLUMNS. BILL-DEC-007 (trial), BILL-DEC-008 (coupon),
--     BILL-DEC-009 (VAT) and BILL-OQ-07 (proration) are OPEN, and §15 forbids an agent closing an
--     open decision. A `trial_ends_at` column would read as ratifying BILL-DEC-007 the way 010 said
--     a `30` in a constraint would read as ratifying DATA-DEC-04. `trialing` IS in the state
--     vocabulary below, because §9 of the billing contract puts it in the state machine — a state a
--     row may reach is not a decision that trials exist, and no row reaches it in the fixture.
--
--   * A GRACE PERIOD LENGTH. BILL-DEC-012 says 7 days baseline and says in the same sentence "ปรับได้
--     ผ่าน policy ไม่ hard-code". `grace_expires_at` is a timestamptz with no default and no
--     arithmetic anywhere in this file: the DEADLINE is a projected fact, the NUMBER is a policy, and
--     writing the number into a default would hard-code the thing the decision says not to.
--
--   * A CANCELLATION REASON. §11.1 asks for one "แบบเลือกคลิกได้ พร้อมช่องข้อความ optional" — a
--     click-list vocabulary plus free text. No document enumerates the list. 010 refused to invent a
--     status vocabulary for invitations and 021 refused to invent a lifecycle field for a member
--     scope; the same refusal, the same reason. Owed to Product.
--
--   * A RETENTION WINDOW. §5 assigns this family `FINANCE-HISTORY`, which — unlike the `CATALOG`
--     class batch 030 had to report missing — §10 DOES define: "7 ปี engineering default subject to
--     Thai tax/legal review". Nothing is encoded here all the same, and the difference from 030's
--     finding is worth stating: 030 had no number to refuse, and this batch has one and refuses it.
--     §10's own header says the numbers need Product/Security/Legal approval before Paid Beta,
--     BILL-OQ-10 ("Billing data retention ไทย") is OPEN with a Legal/Accounting/DPO owner, and batch
--     160 owns the retention job. A `7 years` written into a constraint would read as ratified.
--
--   * NOTHING ABOUT WORKSPACE LIFECYCLE VISIBILITY. Unchanged from 020's, 030's and 040's headers: a
--     member of an `access_blocked` workspace can still read the rows these policies admit, because
--     reading `app.workspaces.lifecycle_state` from a policy here needs either the coupling 020
--     rejects or a helper grant RFC-2026-020 §6.1/6 pins shut. §11.3 of the billing contract makes
--     the same gap visible from the other side — a workspace deletion must resolve its subscription
--     first — and that is a command-path obligation, not a predicate. Owed to an RFC plus batch 170.


-- ---------------------------------------------------------------------------------------------
-- app.billing_plans — the global plan identity. One row per stable plan code.
-- ---------------------------------------------------------------------------------------------
--
-- GLOBAL: no workspace_id, because §3.3 requires the canonical scope field on tenant-owned rows and
-- a platform plan catalog is not one. Sensitivity FIN-3.
--
-- NO `created_by` AND NO `updated_by`, following 030's rule for app.industry_packs: §3.2 asks for the
-- audit actor columns on a row a USER mutates, and no user mutates this one. It is written by the
-- global seed, which §6 invariant 5 requires to use a stable key and to be re-runnable; `plan_code`
-- is that key.
--
-- THE TABLE IS THIN ON PURPOSE AND IT IS WORTH SAYING WHY IT EXISTS AT ALL. §5.1 of the billing
-- contract names no plans table: it carries "internal plan code" as a column of `billing_prices` and
-- "plan code" as a column of `plan_entitlements`. That is a bare identifier shared by two tables with
-- no parent — the second-source-of-truth shape 021 refused for `current_version_id`, 030 refused for
-- `industry_pack_id` and 040 refused for `kind`. §6's registry names "plan" as one of this batch's
-- four outputs, and a §5.1 list that calls itself "ตารางหลัก" is a minimum rather than a closed set.
-- So the code has one home, and every child reaches it by foreign key.
create table if not exists app.billing_plans (
  id          uuid primary key default gen_random_uuid(),
  plan_code   text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- The form §5.3's own example uses (`starter_th_monthly_v1`). Written as a constraint because a
  -- plan code is what §5.2 says the CLIENT is allowed to send — "Client ส่งได้เฉพาะ `plan_code`;
  -- server resolve Stripe `price_id` จาก allowlist" — so its shape is an input contract and not a
  -- convention.
  constraint billing_plans_plan_code_stable_form
    check (plan_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  -- The stable key §6 invariant 5 requires of a global seed, and the reason the seed can be re-run.
  constraint billing_plans_plan_code_unique unique (plan_code)
);

comment on table app.billing_plans is
  'Owner: A6 Billing (billing.core, batch 130). GLOBAL — it carries no workspace_id because §3.3 '
  'requires the canonical scope field on tenant-owned rows and a platform plan catalog is not one. '
  'Sensitivity FIN-3; retention FINANCE-HISTORY, whose 7-year default §10 states and this batch '
  'deliberately does not encode (BILL-OQ-10 is open and batch 160 owns the job). NO client role '
  'holds any privilege here: §9.1 permits an owner/admin SUMMARY of FIN-3 content and RFC-2026-012 '
  '§2/3 puts a summary behind a named security_invoker view on an allowlist that starts empty and '
  'grows only by RFC. Written by the global seed on the stable key plan_code (§6 invariant 5).';
comment on column app.billing_plans.plan_code is
  'FIN-3. The stable plan identity, lowercase ASCII with underscores, and the ONLY billing value §5.2 '
  'lets a client send — the server resolves everything else from it. It is the seed''s stable key and '
  'the column every child of this table reaches through a foreign key rather than by copying.';
comment on column app.billing_plans.updated_at is
  'The trigger below is inert today twice over: no client or service role holds UPDATE, and the row''s '
  'only content is its own stable key. It is here rather than omitted because omitting it would '
  'declare the row IMMUTABLE, and §3.2 says that of versions, evidence, decisions, usage, audit and '
  'publish history — not of an identity row (021''s reasoning about a member scope, unchanged).';


-- ---------------------------------------------------------------------------------------------
-- app.billing_plan_versions — global, published, immutable, and the table that holds MONEY.
-- ---------------------------------------------------------------------------------------------
--
-- This is §5.1's `billing_prices` row under the name its own rule requires. That row reads
-- "internal plan code, Stripe product/price IDs, currency, interval, active dates" with the rule
-- "immutable mapping หลังมีลูกค้า; สร้าง revision ใหม่", and §5.3's plan contract makes the revision
-- one document carrying the price AND the entitlements AND an `effective_from`. A table called
-- `billing_prices` that a plan's entitlements hang off would be a price that is also a contract; the
-- name says what the row is. The Stripe identifiers are refused — see the header.
--
-- §3.2 fixes the money representation and this obeys it exactly: "เงิน: `numeric(18,6)` + ISO-4217
-- currency; ห้าม float". The apply-time block asserts BOTH halves against the live catalog — the
-- declared type of the amount column, and that no column of any table in this batch is a float or
-- Postgres's `money` type — because a rule about money that lives only in a comment is a rule that
-- gets relaxed by whoever is in a hurry.
--
-- THE CURRENCY CHECK IS ON THE SHAPE AND NOT ON THE VALUE. BILL-DEC-014 makes THB the default and
-- marks it `UNVERIFIED` against a live account, and BILL-DEC-011 says the payment methods that
-- actually work in a Thai account are unverified too. `check (currency = 'THB')` would encode an
-- UNVERIFIED decision as a constraint; `^[A-Z]{3}$` encodes ISO-4217's shape, which §3.2 does state.
--
-- IMMUTABLE (§3.2, §4 invariant 8, §5's "versioned + ledger-like"), expressed three ways at once as
-- 020's, 030's and 040's version tables are: no UPDATE or DELETE policy, no UPDATE or DELETE grant to
-- any role, and no `updated_at` column or trigger — an immutable row has no update to stamp.
--
-- AND THERE IS NO `active` FLAG, which §5.3 might be read to ask for: "price เก่า inactive สำหรับ
-- ลูกค้าใหม่ได้ แต่ subscription เดิมต้องยัง map ได้". 030 met the same sentence about a deprecated
-- pack version and gave the answer this batch keeps: a mutable status column beside an immutable row
-- is the first sentence of an immutable table contradicting itself. `effective_from` records when a
-- publication starts; withdrawing one from new customers is an UPDATE this batch grants to nobody,
-- owed to the batch that brings a curation command path. The second half of §5.3's sentence holds by
-- construction, and that is the point of pinning the immutable row: a subscription references THIS
-- row, so an old price stays mapped whatever a later catalog decision does.
create table if not exists app.billing_plan_versions (
  id               uuid primary key default gen_random_uuid(),
  billing_plan_id  uuid        not null references app.billing_plans (id),
  revision         integer     not null,
  display_name_th  text        not null,
  currency         text        not null,
  unit_amount      numeric(18,6) not null,
  billing_interval text        not null,
  effective_from   timestamptz not null,
  created_at       timestamptz not null default now(),
  constraint billing_plan_versions_revision_positive check (revision >= 1),
  constraint billing_plan_versions_display_name_not_blank
    check (length(btrim(display_name_th)) > 0),
  -- ISO-4217 is three uppercase letters. The VALUE is BILL-DEC-014's and is unverified; the SHAPE is
  -- §3.2's and is not.
  constraint billing_plan_versions_currency_is_iso_4217 check (currency ~ '^[A-Z]{3}$'),
  -- A price may be zero — BILL-OQ-01 leaves the package set open and a free tier is one of the
  -- shapes it could take — and may not be negative, which is not a price.
  constraint billing_plan_versions_amount_not_negative check (unit_amount >= 0),
  -- §5.1's "interval", and §1's scope: monthly is Phase 1 and yearly is BILL-OQ-01, still open.
  -- Both words are in the vocabulary because §3.2 says a Phase 1 state's values change by migration
  -- only, and 010 enumerated all eight of §11.4's lifecycle states including ones nothing reaches.
  -- PERMITTING a value is not choosing it: whether a yearly price is OFFERED is a ROW, and the
  -- fixture deliberately loads none.
  constraint billing_plan_versions_interval_known check (billing_interval in ('month', 'year')),
  -- One publication of one revision of one plan. It is also the index supporting the foreign key
  -- above, which it leads with.
  constraint billing_plan_versions_revision_unique unique (billing_plan_id, revision),
  -- The target of app.plan_entitlements' composite foreign key. `id` alone is already unique; this
  -- pair is what lets an entitlement assert that the plan it names is the plan this version is of.
  constraint billing_plan_versions_plan_key unique (billing_plan_id, id)
);

comment on table app.billing_plan_versions is
  'Owner: A6 Billing (billing.core, batch 130). GLOBAL and IMMUTABLE — a row is a PUBLISHED revision '
  'of a plan contract, and §5.1''s "immutable mapping หลังมีลูกค้า; สร้าง revision ใหม่" is expressed '
  'as absent grants and absent policies rather than as a convention: no role, client or service, '
  'holds UPDATE or DELETE. Sensitivity FIN-3 — §9.1 names price as its example — retention '
  'FINANCE-HISTORY. Money is numeric(18,6) plus an ISO-4217 currency and never a float (§3.2), '
  'asserted against the live catalog by this file''s apply-time block. It carries NO Stripe product '
  'or price identifier: §9.3 requires an external id to be an encrypted private reference plus a '
  'stable hash, neither of which exists here, and §6''s registry gives the provider read model to '
  'batch 131.';
comment on column app.billing_plan_versions.revision is
  'The per-plan ordinal, unique with billing_plan_id. It answers "which revision is current" without '
  'a current_version_id pointer on the plan, which would be a circular foreign key that 020 refused, '
  '021 declined to add, 040 declined again, and no registry row gives this batch.';
comment on column app.billing_plan_versions.unit_amount is
  'FIN-3. §3.2: money is numeric(18,6) and never a float. Zero is permitted because BILL-OQ-01 leaves '
  'the package set open and a free tier is one shape it could take; negative is not a price. The '
  'amount is what one billing_interval costs in `currency`, and whether that figure includes VAT is '
  'BILL-DEC-009/BILL-OQ-04, which are OPEN — so no tax column is invented here and no row in this '
  'table should be read as answering it.';
comment on column app.billing_plan_versions.currency is
  'FIN-3. ISO-4217, constrained to the SHAPE §3.2 states rather than to the VALUE BILL-DEC-014 '
  'proposes: THB is the default and is `UNVERIFIED` against a live account, and a constraint naming '
  'it would encode an unverified decision.';
comment on column app.billing_plan_versions.billing_interval is
  'FIN-3. §5.1''s interval, as text + a named CHECK (§3.2). `month` is §1''s Phase 1 scope and `year` '
  'is BILL-OQ-01, still open — the vocabulary is the document''s and the offering is Product''s, so '
  'the CHECK permits both and the fixture loads only a monthly price.';
comment on column app.billing_plan_versions.effective_from is
  'FIN-3. When this revision was published. NOT NULL because a row exists in this catalog because it '
  'was published, and there is deliberately no `effective_to` and no `active` flag: withdrawing a '
  'price from new customers is a mutable status beside an immutable row (030''s finding about a '
  'deprecated pack version), owed to a curation command path.';
comment on column app.billing_plan_versions.display_name_th is
  'FIN-3. The Thai display text of this revision, which §7.1 requires — the owner picks a package '
  'from Thai-language cards. It lives on the revision and not on the plan for 030''s reason: display '
  'text may change without changing the stable identity, so it is a property of a publication.';


-- ---------------------------------------------------------------------------------------------
-- app.plan_entitlements — what one published plan revision grants. Global and immutable.
-- ---------------------------------------------------------------------------------------------
--
-- §5.1 names this table by exactly this name, with "plan code, feature key, limit/value" and the rule
-- "versioned contract". The name is kept unprefixed because it is the document's (040's rule: §5's
-- words unchanged, including the ones a tidier hand would rewrite).
--
-- IT HANGS OFF A PLAN REVISION AND NOT OFF A PLAN, which is where "versioned contract" lands. §5.1's
-- key columns are plan code plus feature key, and two rows for one feature at two versions would
-- collide under that key alone; §5.3's plan contract is one document carrying `plan_code`,
-- `effective_from` and the entitlements together. So a change to what a plan grants is a new
-- revision, which is also §5.3's own rule — "การเปลี่ยน entitlement ต้องมี version, migration impact
-- และ approval".
--
-- THE VALUE IS TWO TYPED COLUMNS AND A KIND, and this is the most arguable thing in the batch, so it
-- is stated rather than left in a schema. §5.1 says "limit/value" and §5.3's example carries both
-- shapes at once: four integer limits (`workspace_users: 3`, `asset_storage_bytes: 21474836480`) and
-- one policy word (`ai_generation_mode: included_or_byok_policy`). Three options were available:
--
--   ONE `text` COLUMN (rejected). A limit stored as text is a limit nothing can compare, and §3.2
--   fixes "Byte/token/operation: `bigint`" for exactly these quantities.
--   A DOCUMENT COLUMN (rejected outright). §5 forbids "metadata", "config", "payload" and "JSON"
--   without a declared JSON Schema version, maximum size, prohibited fields and owner, none of which
--   exists.
--   A KIND PLUS THE SHAPE IT IMPLIES (chosen). `entitlement_kind` is text + a named CHECK over
--   §5.1's own two words, and a companion CHECK ties each value to the column it fills — the pattern
--   021 wrote for `scope_type` and its two target columns, for the same reason: "a row could claim
--   one scope and carry the target of another, and the helpers would read the claim and the target
--   from the same row and disagree".
--
-- `feature_key` HAS A SHAPE AND NOT A VOCABULARY. §5.3's five keys are an "ตัวอย่าง" — an example —
-- and BILL-OQ-01 leaves the package set open, so enumerating them in a CHECK would ratify an example
-- as a decision. What IS constrained is the form, because a feature key is what a feature gate will
-- be written against and §5.3 forbids binding a gate to something editable ("ห้ามผูก feature gate
-- กับชื่อ Product ที่แก้ได้"). The set of keys is owed to Product and to batch 132, which resolves
-- them.
create table if not exists app.plan_entitlements (
  id                       uuid primary key default gen_random_uuid(),
  billing_plan_id          uuid        not null,
  billing_plan_version_id  uuid        not null,
  feature_key              text        not null,
  entitlement_kind         text        not null,
  limit_value              bigint,
  text_value               text,
  created_at               timestamptz not null default now(),
  constraint plan_entitlements_feature_key_form
    check (feature_key ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  constraint plan_entitlements_kind_known
    check (entitlement_kind in ('limit', 'value')),
  -- The shape each kind implies, as a constraint rather than as a convention. Without it a row could
  -- claim `limit` while carrying only a word, and whatever reads it would have to guess.
  constraint plan_entitlements_shape_matches_kind check (
    (entitlement_kind = 'limit' and limit_value is not null and text_value is null)
    or (entitlement_kind = 'value' and text_value is not null and limit_value is null)
  ),
  -- §3.2: byte/token/operation quantities are bigint. A negative allowance is not an allowance;
  -- zero is one, and it is how a plan says a feature is off.
  constraint plan_entitlements_limit_not_negative
    check (limit_value is null or limit_value >= 0),
  constraint plan_entitlements_text_value_not_blank
    check (text_value is null or length(btrim(text_value)) > 0),
  -- One value per feature per published revision. It is also the index answering "what does this
  -- revision grant", which is the only question anything asks of this table.
  constraint plan_entitlements_one_per_feature unique (billing_plan_version_id, feature_key),
  -- The composite foreign key, over the whole identity path. §3.3 writes this rule about a
  -- Workspace/Business scope and there is no tenant here; the mechanism is the same and so is the
  -- failure it prevents — without the pair, an entitlement could name plan A while its revision
  -- belongs to plan B, and whatever resolved `plan_code -> entitlements` would read two different
  -- plans from one row.
  constraint plan_entitlements_plan_scope_fk
    foreign key (billing_plan_id, billing_plan_version_id)
    references app.billing_plan_versions (billing_plan_id, id)
);

comment on table app.plan_entitlements is
  'Owner: A6 Billing (billing.core, batch 130). GLOBAL and IMMUTABLE — it is §5.1''s versioned '
  'contract, so what a plan grants changes by publishing a new revision and never by updating a row; '
  'no role, client or service, holds UPDATE or DELETE. Sensitivity FIN-3; retention '
  'FINANCE-HISTORY. It hangs off a PUBLISHED REVISION rather than off a plan, tied to it by a '
  'composite foreign key over (billing_plan_id, billing_plan_version_id) so an entitlement cannot '
  'name a revision of a different plan. It is what a PLAN grants; what a WORKSPACE effectively has '
  'is app.workspace_entitlements, which §5.1 describes as recomputable from its source and §6''s '
  'registry gives to batch 132.';
comment on column app.plan_entitlements.feature_key is
  'FIN-3. The gate this entitlement is about, constrained to a form and not to a vocabulary: §5.3''s '
  'five keys are labelled an example and BILL-OQ-01 leaves the package set open, so a CHECK '
  'enumerating them would ratify an example. The form is constrained because §5.3 forbids binding a '
  'feature gate to an editable name.';
comment on column app.plan_entitlements.entitlement_kind is
  'FIN-3. §5.1''s own two words — limit and value — as text + a named CHECK (§3.2). The companion '
  'CHECK ties each to the column it fills, which is the treatment 021 gave scope_type: a row cannot '
  'claim one kind and carry the other''s payload.';
comment on column app.plan_entitlements.limit_value is
  'FIN-3. Set only for kind `limit`. bigint because §3.2 fixes byte, token and operation counts as '
  'bigint, and §5.3''s own example includes a byte count that does not fit an integer. Zero is a '
  'valid allowance and is how a plan says a feature is off.';
comment on column app.plan_entitlements.text_value is
  'FIN-3. Set only for kind `value`, for an entitlement that is a policy word rather than a count — '
  '§5.3''s `ai_generation_mode: included_or_byok_policy` is the example that forced this column to '
  'exist. Its vocabulary belongs to whoever defines the feature, not to this table.';


-- ---------------------------------------------------------------------------------------------
-- app.billing_subscriptions — the workspace's commitment, as a projection nobody here may write.
-- ---------------------------------------------------------------------------------------------
--
-- TENANT-1 by §3.3's canonical scope, and the only table in this batch with a tenant boundary.
-- §4's ERD gives it one relation and no other: `WORKSPACE ||--o{ SUBSCRIPTION : subscribes`.
--
-- `||--o{` IS ZERO-OR-MANY AND §1 OF THE BILLING CONTRACT SAYS "หนึ่ง billable subscription ต่อหนึ่ง
-- workspace". Those reconcile rather than conflict, and the reconciliation is a partial unique index
-- rather than a comment: a workspace accumulates ended subscriptions and has at most one that is
-- still live. §13.1 makes `DUPLICATE_ACTIVE_SUBS` a "security/finance incident" for the
-- reconciliation job to REPORT; a constraint refuses it instead, which is strictly stronger.
--
-- WHICH STATES COUNT AS LIVE IS A JUDGEMENT AND IS STATED SO A REVIEWER CAN DISAGREE. The index
-- excludes `canceled` and nothing else. §9's table describes `CANCELED` as "read-only/retention
-- policy" with the only transition out being a NEW checkout, which is a new row; every other state —
-- including `restricted` and `manual_fallback` — still grants or holds access, so two of them at
-- once on one workspace is the incident §13.1 names.
--
-- IT CARRIES NO `created_by` AND NO `updated_by`, and that is the same rule 030 applied to a
-- platform-curated catalog, arriving somewhere less obvious. §3.2 asks for the actor columns on a row
-- a USER mutates. No user mutates this one — no client role holds INSERT, UPDATE or DELETE — and the
-- actor who caused it is recorded where §6 of the billing contract puts it: an audit event carrying
-- "actor user, workspace, IP/UA ตาม privacy policy, request ID และ before/after summary", which is
-- batch 140's, and `billing_operations`, which is 131's. The visible consequence is that §8.5's
-- "user action ตรวจ `created_by = (select auth.uid())`" has nothing to attach to here — because
-- there is no user action, which is the whole of what this table is.
create table if not exists app.billing_subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null references app.workspaces (id),
  -- The pinned plan revision. A SINGLE-column foreign key where every tenant parent in this schema
  -- takes a composite one, for 030's reason and not by inattention: the parent is GLOBAL, so there
  -- is no shared scope column for a composite key to compare. Pinning the immutable revision is what
  -- makes §5.3's "subscription เดิมต้องยัง map ได้" true by construction, and it reaches the plan
  -- code, the currency, the interval, the amount and the entitlements through one row rather than
  -- copying any of them.
  billing_plan_version_id  uuid        not null references app.billing_plan_versions (id),
  local_access_state       text        not null,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  grace_expires_at         timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  -- §9's local state machine, verbatim except for the spelling. The document writes the labels in a
  -- state diagram as SCREAMING_SNAKE; batch 010 met the same shape in §11.4 and wrote lowercase
  -- snake_case values ('access_blocked', 'purge_queued'), so this follows 010 rather than 040's rule
  -- about §5's words — 040 kept `offers` and `restrictions` unchanged because they were already
  -- written as identifiers, and a state diagram's labels are display text.
  --
  -- `NO_PLAN` IS NOT IN THE LIST, and that is a decision. §9's diagram makes it the initial state,
  -- before any checkout: a workspace with no subscription. Read as the ABSENCE OF A ROW it costs
  -- nothing and buys a NOT NULL foreign key — every row pins a plan revision, so "which contract is
  -- this a commitment to" always has an answer. Read as a ROW it would make that column nullable and
  -- put a commitment to nothing in a table whose whole subject is commitments.
  constraint billing_subscriptions_state_known check (local_access_state in (
    'pending', 'trialing', 'active', 'grace', 'restricted',
    'cancel_scheduled', 'canceled', 'manual_fallback')),
  -- A period either has both ends or neither, and it does not end before it starts. A `pending`
  -- subscription has no period yet, which is why the pair is nullable rather than the dates being
  -- invented at insert time.
  constraint billing_subscriptions_period_is_whole check (
    (current_period_start is null and current_period_end is null)
    or (current_period_start is not null and current_period_end is not null
        and current_period_end > current_period_start))
);

comment on table app.billing_subscriptions is
  'Owner: A6 Billing (billing.core, batch 130). Canonical scope workspace_id (§3.3). Sensitivity '
  'FIN-3 — the PII-2 half of §5''s classification is the billing customer''s email snapshot, which '
  'lives in a table this batch does not create — retention FINANCE-HISTORY. IT IS A PROJECTION AND '
  'NOBODY MAY WRITE IT: no role, client or service, holds INSERT, UPDATE or DELETE, because '
  'CONTRIBUTING_AGENTS.md derives payment entitlement only from a verified webhook projection and '
  'that projection is batch 131. The client surface is a column-scoped SELECT for the WORKSPACE '
  'OWNER alone (§8.3 "Billing/subscription SELECT": Y owner, N editor/approver/viewer; admin''s P '
  'refused — see the header). It carries no Stripe identifier and no card data of any kind.';
comment on column app.billing_subscriptions.workspace_id is
  'FIN-3. The canonical tenant scope, and the column the one policy on this table resolves the '
  'caller''s role against. It is in no UPDATE grant because there is no UPDATE grant at all, which is '
  'a stronger form of §8.5''s "ห้ามย้าย row ข้าม tenant ด้วย update" than any earlier batch could '
  'write.';
comment on column app.billing_subscriptions.billing_plan_version_id is
  'FIN-3 pointing at a global FIN-3 row. The pinned published revision, which reaches plan_code, '
  'currency, interval, amount and entitlements through the immutable row rather than copying them — '
  'a copy is a second source of truth for a fact the foreign key fixes (021, 030 and 040, in the same '
  'words). The owner may read this id and cannot resolve it: the plan catalog is behind an empty read '
  'allowlist, which is what that costs and is recorded rather than worked around.';
comment on column app.billing_subscriptions.local_access_state is
  'FIN-3. §9''s local state machine as text + a named CHECK (§3.2). It is the ACCESS decision and not '
  'the provider''s report: §9 requires provider_status to be kept separate, and this batch stores no '
  'provider projection at all, so that column is owed to batch 131 together with the mapping policy '
  '§9 says must be versioned. NO_PLAN is absent on purpose — it is the absence of a row.';
comment on column app.billing_subscriptions.grace_expires_at is
  'FIN-3. §10.1 requires the grace deadline to be recorded. The DEADLINE is a projected fact and the '
  'LENGTH is a policy: BILL-DEC-012 says 7 days baseline and in the same sentence says "ปรับได้ผ่าน '
  'policy ไม่ hard-code", so there is no default here and no arithmetic anywhere in this file.';
comment on column app.billing_subscriptions.current_period_end is
  'FIN-3. The date §11.1 requires a cancellation confirmation to show. There is no '
  'cancel_at_period_end flag beside it: `cancel_scheduled` in local_access_state IS that flag, and a '
  'boolean that could disagree with the state is the second source of truth 021, 030 and 040 each '
  'refused one column over.';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- Already covered by a constraint's own index, and therefore NOT repeated below:
--
--   billing_plans.plan_code                    — the unique constraint, and the seed's lookup key.
--   billing_plan_versions (billing_plan_id, revision)
--                                              — the unique constraint, which leads with the foreign
--                                                key column and answers "the revisions of this plan".
--   plan_entitlements (billing_plan_version_id, feature_key)
--                                              — the unique constraint, and the only lookup anything
--                                                makes of this table.
--   plan_entitlements (billing_plan_id, billing_plan_version_id)
--                                              — the composite foreign key. Its leading column is
--                                                billing_plan_id, which the unique constraint above
--                                                does not lead with, so it needs the index below.

-- The composite foreign key into the published revision, which the unique constraint above does not
-- support because that one leads with billing_plan_version_id.
create index if not exists plan_entitlements_plan_scope_idx
  on app.plan_entitlements (billing_plan_id, billing_plan_version_id);

-- The subscription's foreign key into the global catalog. This is the one join that crosses from a
-- tenant table to a global one, and without the index, examining a published revision scans every
-- subscription in the database.
create index if not exists billing_subscriptions_plan_version_idx
  on app.billing_subscriptions (billing_plan_version_id);

-- §3.3 keyset pagination, "(created_at desc, id desc)", for the list that grows with the tenant: a
-- workspace's subscription history. It leads with workspace_id, so it also supports the foreign key
-- into app.workspaces and the RLS predicate column.
create index if not exists billing_subscriptions_workspace_keyset_idx
  on app.billing_subscriptions (workspace_id, created_at desc, id desc);

-- §1's "หนึ่ง billable subscription ต่อหนึ่ง workspace", as a constraint rather than as a
-- reconciliation finding. It is a partial unique INDEX because Postgres has no partial unique
-- constraint, and the predicate is the judgement the header states: every state but `canceled` still
-- grants or holds access.
create unique index if not exists billing_subscriptions_one_live_per_workspace
  on app.billing_subscriptions (workspace_id)
  where local_access_state <> 'canceled';


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every MUTABLE row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
--
-- Two triggers, not four. app.billing_plan_versions and app.plan_entitlements have no updated_at to
-- stamp, and adding one would be the first sentence of an immutable table contradicting itself
-- (020's words, kept by 030 and 040 and kept again here).
--
-- BOTH ARE INERT TODAY and that is said rather than hidden, as 021 said it of its own: no role holds
-- UPDATE on either table, so nothing can fire them. They are here because §5 classifies this family
-- "versioned + ledger-like" rather than immutable, and because omitting updated_at would declare
-- these rows IMMUTABLE — which §3.2 says of versions, evidence, decisions, usage, audit and publish
-- history, and does not say of a plan identity or of a live subscription whose state machine has
-- nine transitions in §9's own diagram.
drop trigger if exists set_updated_at on app.billing_plans;
create trigger set_updated_at before update on app.billing_plans
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.billing_subscriptions;
create trigger set_updated_at before update on app.billing_subscriptions
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on every table, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
--
-- On the three global tables this is doing more work than usual, not less: they carry no policy at
-- all, so ENABLE plus FORCE is what makes every non-bypassing role — including the table owner —
-- read zero rows, and it is what the CI negative control switches off to prove the suite notices.
alter table app.billing_plans enable row level security;
alter table app.billing_plans force row level security;

alter table app.billing_plan_versions enable row level security;
alter table app.billing_plan_versions force row level security;

alter table app.plan_entitlements enable row level security;
alter table app.plan_entitlements force row level security;

alter table app.billing_subscriptions enable row level security;
alter table app.billing_subscriptions force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges. This is where the whole batch is, and most of it is what is absent.
-- ---------------------------------------------------------------------------------------------
--
-- §6 invariant 8 puts migration, constraints, indexes, RLS AND grants in one change set.
--
-- THE THREE GLOBAL TABLES. `authenticated` and `anon` are granted NOTHING — see the header, and
-- 030's reasoning about a global table under RFC-2026-012 §2/3, which this batch consumes rather
-- than re-derives. `app_worker` holds SELECT and no policy, which is 010's shape: the grant is what
-- turns "the service reads nothing" from an untestable absence into a denial attributable to row
-- level security, and it is what a role that had quietly acquired BYPASSRLS would defeat visibly. It
-- holds no INSERT: a published plan revision is written by the global seed, and a service that could
-- publish a price could change what the product charges.
grant select on app.billing_plans to app_worker;
grant select on app.billing_plan_versions to app_worker;
grant select on app.plan_entitlements to app_worker;

-- THE TENANT TABLE, AND THE ONE CLIENT GRANT IN THIS BATCH.
--
-- Column-scoped, per operation, exactly as 010, 020, 021, 030 and 040 write them — and the column
-- list is the whole row today, which is deliberate rather than lazy. RFC-2026-021's M3 measured that
-- a column-scoped grant covering every current column is NOT a table-wide grant: a column added
-- later is unreadable until somebody writes a new GRANT. That is the only column-drift control this
-- shape has, and it is the reason a table-wide `grant select on ... to authenticated` would be a
-- different and worse decision even though it would admit exactly the same columns today.
--
-- SELECT AND NOTHING ELSE. There is no INSERT grant, no UPDATE grant and no DELETE grant on this
-- table for any role, and the apply-time block at the foot of this file asserts it against the live
-- ACLs rather than against the text above, because a grant made by a LATER batch would not appear in
-- this file at all.
grant select (id, workspace_id, billing_plan_version_id, local_access_state,
              current_period_start, current_period_end, grace_expires_at, created_at, updated_at)
  on app.billing_subscriptions to authenticated;

-- app_worker holds SELECT and NO POLICY, for the reason 010, 020, 021, 030 and 040 all record:
-- without a grant, a service refusal is 42501 either way and proves only that somebody forgot a
-- GRANT; with the grant and no policy, an empty read can only have come from RLS, and a service role
-- that had quietly acquired BYPASSRLS would SUCCEED where the suite demands a refusal.
--
-- IT GETS ONE VERB WHERE 030 AND 040 GAVE THEIR SERVICE THREE, and the asymmetry is 021's rule
-- applied to a table whose client surface is a read: "a verb no client and no policy holds would be
-- a privilege nobody reviewed against a caller". The verb this table's writer will need is INSERT
-- and UPDATE, its writer is the webhook projection, and its writer is batch 131 — so 131 grants
-- them, in the change that brings the thing that needs them. Until then nothing in this repository
-- can create a subscription, which is exactly the claim this batch is making.
grant select on app.billing_subscriptions to app_worker;

-- app_command and app_maintenance are granted nothing by this batch. There is no specified command
-- surface for billing.core in any document this repository holds — §4 of the billing contract names
-- a `billing-api` module and RFC-2026-012 §4 names SECURITY DEFINER command functions as the
-- enforcement mechanism, and neither exists — and the retention path is batch 160.


-- ---------------------------------------------------------------------------------------------
-- Policies. One, for the one §8.3 cell a client role holds on a table this batch creates.
-- ---------------------------------------------------------------------------------------------
--
-- NOTHING IS WRITTEN FOR app.billing_plans, app.billing_plan_versions OR app.plan_entitlements, AND
-- THAT IS A DECISION RATHER THAN AN OMISSION. §8's four matrices contain no row for a plan catalog
-- anywhere — §8.3's two rows are about a SUBSCRIPTION and about a plan/payment ACTION, neither of
-- which is a read of the catalog — RFC-2026-012 §3 gives the client read to an RFC, and a policy
-- written for a caller that does not exist is a permission nobody reviewed. All three tables are
-- FORCE ROW LEVEL SECURITY with an empty policy set, which denies every non-bypassing role including
-- the one role holding a grant. 010's own static suite requires a forced table's policy set to be a
-- decision in the file rather than an omission; this paragraph is that decision, and
-- tests/db/identity/identity-isolation.test.mjs holds it to it in both directions.
--
-- AND NOTHING IS WRITTEN FOR INSERT, UPDATE OR DELETE ON app.billing_subscriptions. The privilege is
-- absent too, so the refusal happens before row level security is consulted and the isolation suite
-- records which layer produced it — which is the stronger claim, because a policy can be widened by
-- an edit and an absent grant has to be granted.

-- §8.3 "Billing/subscription SELECT" = Y for owner, P for admin, N for editor, approver and viewer.
-- Only the unconditional Y is written.
--
-- Membership and role are read through the batch 011 helper and never by joining
-- app.workspace_members (RFC-2026-020 §5/5). `app.workspace_member_role` returns a role only for an
-- ACTIVE membership, which is where §7's "only status active grants access" and §12.6/5's suspended
-- member live for this table — the predicate has no `status` of its own for the same reason 020's,
-- 030's and 040's do not.
drop policy if exists billing_subscriptions_select_owner on app.billing_subscriptions;
create policy billing_subscriptions_select_owner on app.billing_subscriptions
  for select to authenticated
  using (app.workspace_member_role(workspace_id) = 'owner');


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004, 011, 020, 021, 030 and 040 use: a claim that is only a comment is a claim
-- nobody checks. These are the properties of THIS batch answerable from the catalog of the database
-- being migrated, without a committed snapshot and without a test harness. The text half lives in
-- tests/db/identity/identity-isolation.test.mjs and the live behavioural half is `make db-rls-smoke`.
--
-- NOTHING BELOW ASSERTS A PROPERTY AN APPROVED DECISION OR AN ALREADY-NAMED BATCH IS EXPECTED TO
-- CHANGE, which is 030's rule and 021's scar: 011's apply-time policy count is an APPLIED
-- migration's self-assertion that 021 had to route around. THREE claims are therefore asserted in
-- the static suite instead, and each is a claim this batch cares about more than most:
--
--   * THE ABSENCE OF A WRITE GRANT AND A WRITE POLICY ON app.billing_subscriptions. Batch 131 must
--     write the projection, so a grant — and under RFC-2026-012 §4 a policy for the command role —
--     is expected. Forbidding it here would be false on the day it is meant to be, on every
--     re-apply.
--   * THE ABSENCE OF A CLIENT GRANT AND OF ANY POLICY ON THE THREE GLOBAL TABLES. That absence is
--     RFC-2026-012 §3's empty read allowlist, and an allowlist exists in order to grow.
--   * THE ROLE NAMED IN THE SELECT POLICY. §8.3's admin `P` is refused on a reading BILL-DEC-004
--     could overturn by adding a sixth role, so the reading is pinned where a batch that disagrees
--     edits a line a reviewer reads.
--
-- THE SERVICE-ROLE HALF OF THE "no policy for a service or anonymous role" RULE IS NARROWER HERE
-- THAN IN 020, 021, 030 AND 040, and that is deliberate rather than a copy that lost a word. Those
-- batches could assert it because §8.1 and §8.2 give the service no write on their tables at all.
-- Here §8.3 marks the service `P` and the write path is OWED to a named batch, so an apply-time rule
-- refusing an `app_worker` or `app_command` policy would be the same trap one table over. `anon` IS
-- asserted, because RFC-2026-021 §7/4 decided it — anon holds nothing anywhere our migrations reach —
-- and that is not a thing 131 may change.
--
-- THE CARD-COLUMN RULE BELOW IS SCOPED TO THIS BATCH'S OWN FOUR TABLES AND NOT TO SCHEMA `app`, for
-- the same reason. §14.1 of the billing contract permits `brand/last4/expiry` after a privacy review,
-- so a rule over the whole schema would make an APPLIED migration's self-assertion false the day that
-- review approves one in batch 131 — which is precisely the trap 011 set for 021. Scoped here it says
-- what it means: no table 130 creates carries a payment instrument, now or after any later batch
-- alters one.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only by
-- a superuser, and a migration that needs one to apply is a migration that cannot be applied on the
-- platform it targets, where `postgres` is not a superuser.
do $$
declare
  offending text;
  count_of  integer;
begin
  -- ENABLE and FORCE on all four. The two are different catalog columns and the data package's own
  -- lint rule reads only the first (RFC-2026-016). On the three global tables this is the ONLY thing
  -- refusing a role that holds a grant, because none of them has a policy.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('billing_plans', 'billing_plan_versions', 'plan_entitlements',
                       'billing_subscriptions')
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'On a global table with no policy, FORCE is the whole control: without it the '
                   'table owner reads every row and the isolation suite cannot tell that from a '
                   'working catalog.';
  end if;

  -- NO CLIENT ROLE MAY WRITE A SUBSCRIPTION, WHICH IS THE HALF OF THE HEADLINE CLAIM NO LATER BATCH
  -- MAY REVERSE. RFC-2026-012 decision 1 is "server-only mutation for every table family in §5, zero
  -- exceptions at G0", and CONTRIBUTING_AGENTS.md derives payment entitlement only from a verified
  -- webhook projection. A client INSERT here is the client asserting its own entitlement, and no
  -- later batch has an argument for it that is not a reversal of an approved decision.
  --
  -- THE SERVICE HALF IS NOT ASKED HERE and is pinned in the static suite instead: batch 131 must
  -- write this projection, so an app_worker or app_command grant is expected, and an applied
  -- migration that forbade it would be 011's trap one table over.
  --
  -- `has_any_column_privilege` for INSERT and UPDATE, so a column-scoped grant is caught as well as
  -- a table-wide one; DELETE has no column-level form and is asked of the table.
  select string_agg(format('%s on %s', verb, grantee), ', ') into offending
    from (
      select r.rolname as grantee, v as verb
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['INSERT', 'UPDATE']) as v
       where n.nspname = 'app'
         and c.relname = 'billing_subscriptions'
         and r.rolname in ('authenticated', 'anon')
         and pg_catalog.has_any_column_privilege(r.rolname, c.oid, v)
      union all
      select r.rolname, 'DELETE'
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'billing_subscriptions'
         and r.rolname in ('authenticated', 'anon')
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a client role can write a billing subscription: %', offending
      using hint = 'RFC-2026-012 decision 1 is server-only mutation with zero exceptions at G0, and '
                   'CONTRIBUTING_AGENTS.md derives payment entitlement only from a verified webhook '
                   'projection — the billing contract says the same three times (§2.1, §3/2, §12.1). '
                   'A client write here is the client asserting its own entitlement.';
  end if;

  -- The immutability of the two published tables, as the privilege system holds it. §5.1's
  -- "immutable mapping ... สร้าง revision ใหม่" and "versioned contract", §3.2 and §4 invariant 8, in
  -- one query.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname in ('billing_plan_versions', 'plan_entitlements')
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance',
                           'app_authz')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'a published plan revision or entitlement can be updated or deleted: %', offending
      using hint = 'A published price is changed by publishing a new revision, and what a plan grants '
                   'changes the same way. The absence of the grant is what makes the refusal a '
                   'privilege-layer denial rather than a policy a later edit can widen.';
  end if;

  -- And the same claim as the policy catalog holds it. Both halves, because either alone can be
  -- satisfied while the other is wrong: a policy with no grant is inert, and a grant with no policy
  -- is denied by RLS instead of by privilege, which is a weaker refusal than immutability asks for.
  --
  -- The two IMMUTABLE tables only, and `w`/`d` only. app.billing_subscriptions is absent because 131
  -- is expected to add a write policy there; INSERT is absent because publishing a new revision is
  -- how both of these tables change, and the curation path that will do it is owed to a later batch.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('billing_plan_versions', 'plan_entitlements')
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'a published plan revision or entitlement carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- MONEY IS numeric(18,6) AND NEVER A FLOAT (§3.2), asked of the live catalog rather than of the
  -- CREATE TABLE text above. Both halves: the amount column's declared type, and the absence of any
  -- inexact numeric type on any column of any table this batch creates. `money` is in the list
  -- because Postgres has a type by that name whose output depends on a session GUC, which is the
  -- worst of both properties for a figure somebody is charged.
  select format_type(a.atttypid, a.atttypmod) into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'billing_plan_versions' and a.attname = 'unit_amount';
  if offending is distinct from 'numeric(18,6)' then
    raise exception 'app.billing_plan_versions.unit_amount is % and §3.2 fixes money as numeric(18,6)',
      coalesce(offending, '<absent>');
  end if;

  select string_agg(format('%s.%s is %s', c.relname, a.attname, format_type(a.atttypid, a.atttypmod)), ', ')
    into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_type t on t.oid = a.atttypid
   where n.nspname = 'app'
     and c.relname in ('billing_plans', 'billing_plan_versions', 'plan_entitlements',
                       'billing_subscriptions')
     and a.attnum > 0 and not a.attisdropped
     and t.typname in ('float4', 'float8', 'money');
  if offending is not null then
    raise exception 'a billing column carries an inexact or locale-dependent numeric type: %', offending
      using hint = '§3.2: "เงิน: numeric(18,6) + ISO-4217 currency; ห้าม float". A float cannot '
                   'represent a price exactly and Postgres''s money type renders through a session '
                   'GUC, so both are refused here rather than in a code review.';
  end if;

  -- NO PAYMENT INSTRUMENT BY ANOTHER NAME, on the four tables this batch creates. §9.2 and
  -- BILL-DEC-003 forbid the data; this refuses the COLUMN SHAPES it arrives in, because a column
  -- named for a card is the column somebody eventually writes a card into and RFC-2026-008 records
  -- that a PAN reaching `main` is a disclosure this repository cannot undo.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('billing_plans', 'billing_plan_versions', 'plan_entitlements',
                       'billing_subscriptions')
     and a.attnum > 0 and not a.attisdropped
     and (a.attname ~ '(^|_)(pan|cvv|cvc|card|last4|iin|bin)($|_)'
          or a.attname ~ '(card_number|cardholder|exp_month|exp_year|security_code)');
  if offending is not null then
    raise exception 'a table batch 130 creates carries a cardholder-data column: %', offending
      using hint = '§9.2 forbids storing a card PAN, a CVV or a provider-managed payment credential, '
                   'and BILL-DEC-003 marks the same rule MANDATORY. §14.1 permits brand/last4/expiry '
                   'only after a privacy review that has not happened, on tables this batch does not '
                   'create. This rule is scoped to batch 130''s own tables on purpose: a rule over '
                   'schema app would make this applied migration''s self-assertion false the day that '
                   'review approves a column in batch 131.';
  end if;

  -- NO POLICY ON A TABLE THIS BATCH CREATES MAY NAME `anon`, EVER. RFC-2026-021 §7/4 decides that
  -- anon holds nothing anywhere our migrations reach and gives the structural reason: the first anon
  -- grant is `usage on schema app`, which moves the denial layer of every object in app at once. No
  -- later batch may change that without reversing an approved decision, so it is asked here.
  --
  -- THE SERVICE ROLES ARE DELIBERATELY NOT IN THIS LIST, and that is the one place this block is
  -- narrower than 020's, 021's, 030's and 040's equivalent. Those batches could name app_worker,
  -- app_command and app_maintenance because §8.1 and §8.2 give the service no write on their tables.
  -- §8.3 marks the service `P` here and 131 owes the projection that writes it, so an apply-time
  -- rule refusing a service policy would be a self-assertion an already-named batch is expected to
  -- falsify. The static suite carries it instead, with the batch that owes the change named.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('billing_plans', 'billing_plan_versions', 'plan_entitlements',
                       'billing_subscriptions')
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles) and r.rolname = 'anon');
  if offending is not null then
    raise exception 'batch 130 wrote a policy naming anon: %', offending
      using hint = 'RFC-2026-021 §7/4: anon is granted nothing — no schema USAGE, no table or column '
                   'privilege, no function EXECUTE — anywhere our migrations reach.';
  end if;

  -- One live subscription per workspace, as §1 of the billing contract requires and §13.1 otherwise
  -- leaves to a reconciliation job to notice. Asserted from the catalog rather than from the CREATE
  -- INDEX above, because the property that matters is that the index is UNIQUE and PARTIAL: a
  -- non-unique index would enforce nothing and a total unique index would forbid the subscription
  -- HISTORY §4's ERD gives this table with `||--o{`.
  select count(*) into count_of
    from pg_catalog.pg_index i
    join pg_catalog.pg_class c on c.oid = i.indrelid
    join pg_catalog.pg_class ix on ix.oid = i.indexrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'billing_subscriptions'
     and ix.relname = 'billing_subscriptions_one_live_per_workspace'
     and i.indisunique and i.indpred is not null;
  if count_of <> 1 then
    raise exception 'app.billing_subscriptions has no partial UNIQUE index limiting a workspace to one live subscription'
      using hint = '§1: "หนึ่ง billable subscription ต่อหนึ่ง workspace". §13.1 makes two of them a '
                   'security/finance incident for a reconciliation job to report; a constraint refuses '
                   'it instead, and the index must be partial so an ended subscription can stay.';
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 130 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  -- The POLICY COUNT is deliberately not re-asserted here: 021 owns that assertion on the far side of
  -- the batch that could have moved it, and repeating it would be a second home for a number.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('billing_plans', 'billing_plan_versions', 'plan_entitlements',
                       'billing_subscriptions')
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020, 021, 030 and 040
  -- ask them: scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('billing_plans', 'billing_plan_versions', 'plan_entitlements',
                       'billing_subscriptions')
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 130 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
