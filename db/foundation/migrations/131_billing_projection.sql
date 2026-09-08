-- Batch 131 — billing projection: the webhook receipt, the invoice read model, and the payment
-- reference. The second half of §5's `billing.core` row, built onto batch 130 rather than beside it.
--
-- Owner: A6 Billing. The migration ownership registry (§6) reserves 131 to this package and
-- describes it as "webhook/invoice/payment read model", depending on 130 and 050.
--
-- Depends on: 000 (schemas, private.set_updated_at), 001 (app_worker), 010 (app.workspaces),
-- 130 (app.billing_subscriptions). All are merged. Migration invariant 1 forbids REWRITING any of
-- them and nothing below does; what this batch does do is one FORWARD `alter table` on a merged
-- table, which invariant 1 explicitly prescribes ("ใช้ forward-fix") and which is argued in its own
-- section below rather than slipped in. Every other statement here creates a new object, and no
-- `drop policy` appears at all, because this batch writes no policy at all.
--
-- 050 IS A DECLARED DEPENDENCY AND NOT ONE STATEMENT BELOW CALLS IT, and saying so is cheaper than
-- letting a reader look for the join. §6 makes 131 depend on 050 because a webhook projection is
-- work a queue runs: §8.1/6 of the Stripe billing contract requires the ingress to answer 2xx
-- "เร็วหลัง durable insert; ไม่รอ business processing", which is the enqueue-then-process shape
-- `app.jobs` exists for, and §8.2's "projection update ใช้ transaction/outbox" is `app.outbox_events`.
-- No column below references either. A foreign key from a receipt to a job would fix a QUEUEING
-- decision — one job per receipt, or many — that no document states and no writer exists to make;
-- 050 recorded the mirror image about its own declared dependency on 011 and did not manufacture a
-- constraint to justify it. The dependency is consumed as the SHAPE of the refusal below, not as a
-- column: the same reason 050 gives for why the outbox is a correctly shaped table with no writer.
--
--
-- ============================================================================================
-- WHAT "PAYMENT REFS" TURNS OUT TO MEAN, WHICH IS THE ONE THING THIS BATCH HAD TO DECIDE FIRST
-- ============================================================================================
--
-- §5's inventory row for `billing.core` reads "plans/prices/subscriptions/invoices/PAYMENT REFS".
-- Batch 130 paid the first three words. This batch pays the last two, and the last two words are
-- where a billing schema goes wrong, because "payment ref" reads two ways and only one of them is
-- what the sentence says:
--
--   * A REFERENCE TO A PAYMENT INSTRUMENT — a card token, a payment-method handle, a brand, an
--     expiry, a `last4`, a network fingerprint. THIS IS NOT WHAT IS BUILT HERE AND IT IS REFUSED
--     BY A CHECK THAT RUNS ON EVERY APPLY.
--   * A REFERENCE TO A PAYMENT EVENT — this much money, in this currency, moved (or failed to
--     move) against this invoice at this time. That is what this batch stores.
--
-- Batch 060 settled the identical argument one family over and its sentence is the one to reuse:
-- a `SECRET-4` value gets a `credential_reference`, which is "a LOCATOR in the vault or encrypted
-- secret store §9.1 requires — never the value, never a ciphertext of the value, never a wrapped
-- key", and the control is not a CHECK that recognises secrets but the fact that "the plaintext
-- column DOES NOT EXIST" plus an apply-time ALLOWLIST of columns. A payment instrument is the same
-- shape of problem with a worse blast radius, so it gets the same two controls: no column, and an
-- allowlist rather than a denylist, because "a denylist of column names somebody thought of is
-- defeated by the one they did not" (060, verbatim).
--
-- WHAT IS REFUSED, ENUMERATED, so a reviewer can check the list rather than the intention. No table
-- below carries: a PAN, a masked PAN, a CVV/CVC, a card brand, an expiry month or year, a
-- cardholder name, a card fingerprint, a network or issuer name, a bank account or routing number,
-- a PromptPay identifier, a payment-method id, a payment-method token, or a mandate reference.
-- §9.2 forbids "card PAN/CVV หรือ payment credential ที่ provider จัดการ"; BILL-DEC-003 marks the
-- same rule `MANDATORY`; §14.1 of the billing contract adds magnetic-stripe and chip data. §14.1
-- permits "brand/last4/expiry ที่ Stripe ส่งให้และมี UX need โดยต้องผ่าน privacy review" — batch 130
-- checked those three conditions and found none of them true, and none of them has become true
-- since: Gate G0 authorizes no provider integration, there is no `src/`, and no privacy review has
-- happened. The refusal is unchanged and is now enforced on this batch's own tables too.
--
-- RFC-2026-008 IS WHY THE COLUMN SHAPE IS REFUSED AND NOT ONLY THE VALUE. "A PAN that reaches
-- `main` is a disclosure that this repository has no mechanism to undo" — the scan walks the
-- working tree and git history is not scanned, and RFC-2026-002 forbids the force-push that would
-- be the usual remediation. The scanner has no exception mechanism and RFC-2026-008 says why a
-- published provider test card is reported rather than exempted. So the control is placed one step
-- earlier than the scanner: a column named for a card is the column somebody eventually writes a
-- card into, and there is none.
--
--
-- ============================================================================================
-- THE PROVIDER IDENTIFIER: 130 REFUSED IT AND OWED IT HERE, AND THIS IS WHAT ARRIVES
-- ============================================================================================
--
-- 130_billing.sql refuses "not a Stripe customer id, not a subscription id, not a price id, not a
-- product id, NOT AN INVOICE ID, not a payment intent id, and not `livemode`", and gives four
-- reasons, of which the second is the one this batch has to answer:
--
--   "§9.3 requires an external account ID to be stored as a 'raw encrypted/private reference +
--    stable hash for uniqueness'. NEITHER AN ENCRYPTED-REFERENCE MECHANISM NOR THE `private`
--    SECRET-REFERENCE SURFACE EXISTS IN THIS REPOSITORY."
--
-- HALF OF THAT SENTENCE STOPPED BEING TRUE IN THE SAME MERGE WAVE THAT WROTE IT, and the correction
-- belongs here rather than in a reviewer's head. Batch 060 — written in parallel with 130, merged
-- beside it — created `private.ai_credential_references`, the first table this repository has in
-- `private`, and widened `scripts/db/run.mjs`'s schema lint from `app\.` to `(app|private)\.` so a
-- table there is held to the owner-comment, primary-key, ENABLE and FORCE rules. So the `private`
-- surface EXISTS. The encrypted half does not: nothing in this repository encrypts a column, and
-- §9.3's phrase is "raw encrypted/private reference", which this batch reads as "the raw value goes
-- in an encrypted store OR in `private`" and a reviewer may read the other way.
--
-- SO §9.3 IS SPLIT AND ONLY THE HALF THE DOCUMENT CALLS SAFE IS STORED. §9.3 asks for two things
-- and this batch stores exactly one of them:
--
--   * "stable hash for uniqueness" — STORED, as a `bytea` sha256 digest, on all three tables.
--     §9.1 says the same thing about `PROVIDER-3` in its own column: "private, redact/LOG HASH",
--     with client projection "safe projection only". A digest is the form the classification names.
--   * "raw encrypted/private reference" — NOT STORED. There is no encryption mechanism; and a raw
--     `evt_…`/`in_…`/`pi_…` in `private` would be a column with no writer, no reader and no privacy
--     review, on a G0 gate that authorizes no provider integration. §14.1 permits Stripe object IDs
--     "เท่าที่จำเป็น … โดยต้องผ่าน privacy review", and no privacy review has happened. 010's
--     sentence decides it: "a grant issued ahead of the thing that needs it is a grant nobody
--     reviews against a caller", and a column is the same.
--
-- THE HASH IS ENOUGH FOR THE PROPERTY THE CONTRACT ACTUALLY REQUIRES OF THIS SCHEMA, AND NOT ENOUGH
-- FOR THE ONE IT REQUIRES OF A JOB. §8.2 fixes inbound idempotency as "unique constraint
-- `(provider, livemode, event_id)`", which is a UNIQUENESS property, and a digest is unique exactly
-- when its preimage is. That constraint is below, spelled over the digest, and it is what makes
-- §14.3's "Replay | unique event ID + idempotent projection/outbox | event ซ้ำ 10 ครั้ง" a
-- constraint rather than a convention.
--
-- WHAT IT COSTS, STATED RATHER THAN ABSORBED — and it is the same debt 130 recorded, moved rather
-- than paid. §13.1's reconciliation compares LOCAL rows against STRIPE objects, and a digest cannot
-- be sent to Stripe. `MISSING_LOCAL_CUSTOMER`, `SUBSCRIPTION_STATUS_DRIFT`, `UNKNOWN_PRICE` and
-- `LIVEMODE_MISMATCH` therefore stay undetectable by a reconciliation job reading this schema, with
-- one exception recorded below: `LIVEMODE_MISMATCH` BETWEEN AN INVOICE AND ITS PAYMENT is refused by
-- a composite foreign key instead of reported by a job. The rest is owed to the RFC that stores a
-- raw provider reference — which needs the privacy review §14.1 names, an encryption or `private`
-- decision under §9.3, and the provider integration Gate G0 does not authorize. It is in this
-- package's open blockers.
--
--
-- ============================================================================================
-- "LEDGER-LIKE" IS A CLAIM, AND THIS IS THE BATCH THAT HAS TO RESOLVE IT RATHER THAN REPEAT IT
-- ============================================================================================
--
-- §5 calls `billing.core` "versioned + ledger-like". Batch 130 paid the VERSIONED half:
-- app.billing_plan_versions and app.plan_entitlements are immutable published rows, and 130 says so
-- with absent grants and absent policies asserted in both directions.
--
-- The LEDGER-LIKE half arrives here, and it is not one answer. Three tables, three different
-- mutabilities, each with its own reason, because "ledger-like" applied uniformly would be wrong
-- twice:
--
--   * AN INVOICE READ MODEL THAT A PROVIDER WEBHOOK UPDATES IS NOT APPEND-ONLY. §8.4 of the billing
--     contract requires it in terms: "ก่อนลดสิทธิ์หรือกรณี event เก่ากว่า projection ให้ FETCH
--     Subscription/Invoice ล่าสุดจาก Stripe" and "เก็บ provider_created_at, processed_at, provider
--     object ID และ PROJECTION REVISION". A row that is re-fetched and re-projected is a row that is
--     UPDATED; a projection revision exists precisely because the row is overwritten and the
--     overwrite has to be ordered. Declaring app.billing_invoices immutable would make every later
--     projection an INSERT, which turns a read model into a log and gives "what does this workspace
--     owe" more than one answer. So it is MUTABLE, with `updated_at`, §3.2's trigger, and a
--     column-scoped UPDATE grant that names the projected columns and nothing else.
--
--   * A PAYMENT RECORD THAT CAN BE AMENDED AFTER THE FACT IS A FINANCE DEFECT. A payment is not a
--     projection of a current state; it is the record that an amount moved at a time. A correction
--     is another movement — §12.1's refund workflow is five steps ending "อัปเดต ledger projection",
--     and a refund is money going the other way, which is a ROW. §9.1 classes `FIN-3` "restricted,
--     IMMUTABLE HISTORY", §10's `FINANCE-HISTORY` ends "retain LEDGER INTEGRITY", and §4 invariant 8
--     makes usage history immutable. So app.billing_payments is APPEND-ONLY.
--
--   * A WEBHOOK RECEIPT IS BOTH, IN DIFFERENT COLUMNS, AND 050 ALREADY BUILT THAT SHAPE. §5.1 of the
--     billing contract says "unique event ID; IMMUTABLE RECEIPT METADATA" and §8.3 gives the same
--     row a five-state processing machine with an attempt count and a next-attempt time. Those are
--     not in conflict: what the provider said is immutable, and what WE did about it is not. That is
--     `app.outbox_events` exactly — "append-only in every column but `dispatched_at`" — so the
--     mechanism is 050's: a COLUMN-SCOPED UPDATE grant naming only the processing columns, and an
--     apply-time assertion, per column, against the live ACL, that no role can update any other one.
--
-- IMMUTABILITY HERE IS ABSENT GRANTS **AND** ABSENT POLICIES, ASSERTED BOTH WAYS, AND IT IS NOT A
-- TRIGGER. Batch 140 used a trigger and had a reason no table here has — its adversary can own the
-- table, because an audit log's whole subject is the operator. A payment row's adversary is a
-- support engineer with a database console "เพื่อแก้เร็ว", which §12.1 forbids in terms, and the
-- control that refuses that person is the absence of the verb: no role holds UPDATE or DELETE on
-- app.billing_payments, and no policy grants one. Both halves are asked of the catalog at apply
-- time, because either alone can be satisfied while the other is wrong — a policy with no grant is
-- inert, and a grant with no policy is refused by row level security, which is a weaker refusal than
-- immutability asks for (130's sentence, kept).
--
-- AND app.billing_payments HAS NO `updated_at` AND NO TRIGGER, because an immutable row has no
-- update to stamp — 020's words, kept by 030, 040, 050 and 130 and kept again here.
--
--
-- ============================================================================================
-- THE WEBHOOK INBOX AND THE WORKSPACE IT DOES NOT CARRY
-- ============================================================================================
--
-- A provider event arrives outside any session. Nothing about the HTTP request that delivers it
-- names a workspace: §8.1 requires the raw body, a signature check and a durable insert, and §8.3's
-- own minimum field list ends `correlation_workspace_id: null` — NULL, as the initial value of the
-- field, in the document. The workspace is what PROCESSING resolves, from the provider object the
-- event names, through a mapping this repository does not have.
--
-- SO `app.billing_webhook_receipts.correlation_workspace_id` IS NULLABLE, AND THAT IS A DEPARTURE
-- FROM §3.3 THAT IS ARGUED RATHER THAN TAKEN. §3.3 requires the canonical scope field on "ทุก
-- tenant-owned row". A receipt at `RECEIVED` is not a tenant-owned row: it is a signed statement by
-- a provider that this repository has not yet been able to attribute to a tenant, and a NOT NULL
-- column would force the ingress to either invent an attribution before verifying one or refuse the
-- durable insert §8.1/6 requires. The column is named `correlation_workspace_id` because §8.3 spells
-- it that way, which is 040's rule about §5's words — the document's name, unchanged, including
-- where a tidier hand would have written `workspace_id`. It is a real foreign key to
-- app.workspaces, so an attribution that IS made names a workspace that exists.
--
-- THE CONSEQUENCE FOR ROW LEVEL SECURITY IS STATED HERE BECAUSE IT IS THE REASON THE TABLE HAS NO
-- POLICY AND WILL NOT GET ONE. A predicate over a nullable scope column admits a NULL row to nobody
-- and denies it to everybody, which is the correct answer and is also what an empty policy set
-- already produces. See the next section.
--
--
-- ============================================================================================
-- THE §8.3 `S` CELL: "RAW TOKEN/WEBHOOK SELECT", AND WHY IT GETS NO POLICY, PERMANENTLY
-- ============================================================================================
--
-- §8.3 contains one row about this table and it is `N N N N N | S`:
--
--   | Raw token/webhook SELECT | N | N | N | N | N | S |
--
-- Every client role is `N` and the service is `S`. RFC-2026-022 (approved 2026-09-08) is the
-- decision that says what an `S` cell looks like, and it classifies THIS CELL BY NAME:
--
--   | Raw token/webhook SELECT | `110`, `131` | **DISCOVERED** | an inbox row arrives from the
--     provider; the workspace is what reading it resolves |
--
-- and §8 of the same RFC says so again to this batch directly: "`110` and `131` learn something
-- before they are written. Both hold a DISCOVERED cell (raw token/webhook `SELECT`), so neither
-- should expect a service policy… A webhook inbox is a queue with a different name."
--
-- APPLYING §3's OPERATIONAL TEST TO THIS BATCH'S OWN STATEMENT, so the classification in
-- `db/foundation/lint/service-policy-map.json` is a result rather than a citation. The statement a
-- processor issues against this table is "the next receipt nobody has processed":
--
--   select … from app.billing_webhook_receipts
--    where processed_at is null and dead_lettered_at is null and next_attempt_at <= now()
--    order by received_at for update skip locked;
--
-- Now add the confinement term RFC-2026-022 §5/2 fixes:
--
--   and correlation_workspace_id = (select nullif(current_setting('app.workspace_id', true), '')::uuid)
--
-- and the work CHANGES: "the next unprocessed receipt" becomes "the next unprocessed receipt of a
-- tenant I already knew", and on this table it is worse than on a queue, because the column the term
-- reads is NULL on exactly the rows that most need processing — a receipt whose workspace has not
-- been resolved yet is the one a processor exists to resolve, and the predicate excludes it. So the
-- cell is DISCOVERED, twice over, and the map records it.
--
-- **THIS BATCH THEREFORE WRITES NO SERVICE POLICY, AND THAT IS NOT A DEFERRAL.** RFC-2026-022 §5/5
-- decides that a DISCOVERED cell gets no policy "permanently, not pending", performed instead
-- through a `SECURITY DEFINER` broker owned by a role that is not a path — and §5/8 records that the
-- decision is **NOT IN EFFECT**, because M9 measured that the only member of `app_worker` is
-- `postgres`, which bypasses RLS. So a policy `TO app_worker` written today would be unreachable
-- except from an identity for which it is moot, and the broker has nobody to grant `EXECUTE` to.
-- This batch classifies its cell in the map and stops there, which is exactly what the map's own
-- `_not_in_effect` note says a batch does.
--
-- THE WORKSPACE GUC IS NOT A TENANT BOUNDARY AND NOTHING IN THIS BATCH MAY BE READ AS SAYING IT IS.
-- RFC-2026-022 §5/4: the role a policy names can set the setting the policy reads, twice in one
-- transaction, and `has_parameter_privilege` cannot even be asked who may. What it is worth is
-- CONFINEMENT of one transaction against a defect in the service's own code; what it is not worth is
-- anything against a worker that chooses to set it differently. No comment, note or isolation case
-- below cites it as tenant isolation of the service path, and the static suite asserts that this
-- file names no GUC at all.
--
-- WHAT app_worker DOES GET IS GRANTS AND NO POLICY, which is 010's shape and the reason every one of
-- this batch's negative-control entries can bite: without a grant a service refusal is 42501 either
-- way and proves only that somebody forgot a GRANT; with the grant and no policy, an empty read can
-- only have come from row level security, and a service role that had quietly acquired BYPASSRLS
-- would SUCCEED where the suite demands a refusal. On these three tables that is the WHOLE of the
-- live evidence, because no client role holds anything at all.
--
--
-- ============================================================================================
-- NO CLIENT GRANT ANYWHERE, AND THE ALLOWLIST ENTRY THIS BATCH NAMES AND DOES NOT ADD
-- ============================================================================================
--
-- `authenticated` and `anon` are granted NOTHING on any table in this batch.
--
-- FOR THE RECEIPT THAT IS §8.3 READ STRAIGHT: `N` in all five client columns. §9.1 classes a
-- provider webhook `PROVIDER-3` — "private, redact/log hash", client projection "safe projection
-- only" — and §11.1/5 excludes raw webhook from a PDPA export altogether. There is no cell.
--
-- FOR THE INVOICE THERE IS A REAL CANDIDATE AND IT IS NAMED RATHER THAN BUILT. §6 of the billing
-- contract gives "ขอใบเสร็จ/ข้อมูล billing" to the Workspace Owner with a ✓; §11.1's minimum export
-- domains include "Usage/billing invoices/read model ที่ส่งออกได้"; and §9.1's `FIN-3` client
-- projection is "owner/admin summary". An owner reading their own invoices is, on the face of it,
-- the strongest client read this family will ever produce.
--
-- IT IS STILL NOT ADDED, FOR TWO REASONS THAT DO NOT DEPEND ON EACH OTHER:
--
--   * RFC-2026-021 §3: an entry is five objects plus a registry row, added by RFC and not by a pull
--     request, and its C1 — "a named caller exists, and it is a client" — fails today for the reason
--     it failed for the industry catalog, the plan catalog and the job status: there is no `src/`.
--     A "summary" is a PROJECTION, which is a `security_invoker` view, which is an allowlist entry.
--   * RFC-2026-021 §8.5 requires the known-exceptions list of inherited `authenticated` base-table
--     grants to be CLOSED — "any new one fails". Batch 130 added one and recorded the debt. A
--     base-table SELECT here would be another, and §8.5's own sentence is what refuses it.
--
-- So this batch adds NOTHING to §8.5's list, and the invoice read is written down as a candidate
-- with the criterion it fails, so that the RFC which opens it starts from a reading rather than a
-- blank page. What that entry would have to enumerate under C2/C3: `id`, `workspace_id`,
-- `billing_subscription_id`, `currency`, `amount_due`, `issued_at`, `due_at`, `settled_at`,
-- `voided_at` — and NOT `provider_invoice_hash`, `provider_revision`, `livemode` or
-- `last_projection_error_code`, which are operational and are `PROVIDER-3`/`INTERNAL-3` rather than
-- the owner's summary. That is a proposal and not a decision, and it is written here so a reviewer
-- can disagree with it before it is a grant.
--
-- `anon` IS GRANTED NOTHING, and since 2026-09-06 that is an approved decision rather than an
-- inherited convention: RFC-2026-021 §7/4 gives the structural reason — the first `anon` grant is
-- `grant usage on schema app`, which changes the DENIAL LAYER of every object in `app` at once. All
-- three anonymous cases in the isolation suite declare the refusal on the SCHEMA for that reason.
--
--
-- ============================================================================================
-- WHY THESE TABLES ARE IN `app` AND NOT IN `private`, WHICH IS THE OTHER SIDE OF 060's ARGUMENT
-- ============================================================================================
--
-- §3.1 puts "authorization helpers, secret references, RAW WEBHOOK, worker payload, reconciliation"
-- in `private`, and §14's G0 checklist repeats it: "Secret/raw webhook/internal job tables ไม่
-- exposed". A reader who stops there would expect a webhook inbox in `private`. Two things decide
-- otherwise and both are worth stating:
--
--   1. **THERE IS NO RAW WEBHOOK HERE.** §3.1's row is about the raw payload — the body, the
--      headers, the signature. This table stores a RECEIPT: a digest of the event id, a digest of
--      the body, the provider's own event type and timestamp, and this repository's processing
--      state. §8.3's own minimum field list is exactly that and contains no payload field; §5.1 says
--      "raw hash/ENCRYPTED PAYLOAD POLICY", and no such policy exists, so the half that survives is
--      the hash. §10's `WEBHOOK-SHORT` points the same way from the retention end: "redact/purge
--      payload, RETAIN DEDUPE HASH LONGER". The payload is the short-lived half this batch does not
--      store; the hash is the long-lived half it does. A reference is not a payload — 060's finding,
--      arriving at a webhook instead of a credential.
--
--   2. **AN `S` CELL NEEDS A GRANT FOR ITS DENIAL TO BE ATTRIBUTABLE, AND A GRANT IN `private` IS
--      NOT ONE GRANT.** 060 refused to grant anything on `private.ai_credential_references`, could
--      do so because §8.3's "Plain credential SELECT" is `N` in EVERY column including the service,
--      and paid the price openly: "the CI negative control cannot have an entry for this table". My
--      cell is different — the service column is `S` — so app_worker must hold a grant, and the
--      first grant that reaches a table in `private` is `grant usage on schema private`, which opens
--      `private.as_user`, `private.as_suspended_user` and `private.as_service` to whoever holds it.
--      A service role that could call `private.as_user` could become any user. That is 060's
--      structural argument about `authenticated`, and it does not stop being structural because the
--      grantee is a worker.
--
-- 050 IS THE PRECEDENT AND IT IS EXACT. §14's checklist also names "internal job tables", §9.1
-- classes a job payload `INTERNAL-3` "private; short retention", and `app.jobs` is in `app` — forced,
-- policy-free, with no client grant at all. 050 read "exposed" as a question about GRANTS rather than
-- about a schema prefix, and this batch reads it the same way. The claim is checkable rather than
-- rhetorical: no client role holds a privilege on any table below, which the apply-time block asserts
-- against the live ACL.
--
--
-- ============================================================================================
-- THE ONE FORWARD `alter table` ON A MERGED TABLE, AND WHY IT IS NOT A REWRITE
-- ============================================================================================
--
-- `alter table app.billing_subscriptions add constraint billing_subscriptions_workspace_key
--  unique (workspace_id, id)`.
--
-- WHY IT IS NEEDED. §3.3 requires a child of a tenant parent to take a COMPOSITE foreign key over
-- the scope path, and §4 invariant 10 states the failure it prevents: "Workspace/Business/Page UUID
-- ที่ไม่สัมพันธ์กันต้อง FAIL ที่ DB หรือ command boundary แม้ actor มีสิทธิ์ในแต่ละ entity แยกกัน".
-- app.billing_invoices below names both a `workspace_id` and a `billing_subscription_id`. Without a
-- composite key, an invoice could name workspace A while its subscription belongs to workspace B,
-- and every batch since 020 has refused exactly that shape.
--
-- WHY THE CONSTRAINT DOES NOT ALREADY EXIST. Batch 130 created app.billing_subscriptions with `id`
-- as its primary key and a PARTIAL unique index on `(workspace_id)`. A partial index cannot be a
-- foreign key target — Postgres requires a non-partial unique constraint or index — and 130 had no
-- child table, so it had no occasion to add the pair. This is not a defect in 130; it is the shape a
-- parent acquires when its first child arrives.
--
-- WHY THIS IS A FORWARD FIX AND NOT A REWRITE. Migration invariant 1 is "Merge แล้วห้ามแก้ migration
-- ย้อนหลัง; ใช้ FORWARD-FIX". 130_billing.sql is not edited by one byte. The constraint is added by a
-- new statement in a new batch owned by the same module (`billing.core`), the same agent (A6
-- Billing) and the same work package, so §6 invariant 6's "cross-module FK สร้างใน integration batch
-- เท่านั้น" is not engaged. It makes no existing statement false: 130's apply-time block asserts
-- ENABLE/FORCE, the client write denial, the immutability of its two published tables, the money
-- types, the card-column rule, the anon rule, the named PARTIAL unique index and the ownership rules,
-- and adds no assertion about the constraint set. Adding a unique constraint cannot make any of
-- those false.
--
-- MIGRATION INVARIANT 3, PAID RATHER THAN CITED. "DDL ที่เสี่ยง lock ต้องมี `lock_timeout`,
-- `statement_timeout`, rollout และ recovery note." `ADD CONSTRAINT … UNIQUE` takes an ACCESS
-- EXCLUSIVE lock and builds an index, so it is exactly that DDL. Both timeouts are set immediately
-- before the statement and RESET immediately after, so the setting does not leak into the next
-- migration on the same session — the failure `SET LOCAL` avoids inside a transaction and a bare
-- `SET` does not.
--   ROLLOUT: app.billing_subscriptions is empty on every instance this batch can reach — the catalog
--   snapshot declares 130 not applied — so the index build is instantaneous and the lock window is a
--   statement rather than a scan. On a populated instance the non-blocking path is invariant 4's
--   (`create unique index concurrently` outside a transaction, then `add constraint … using index`),
--   which this runner does not support and which is recorded here rather than silently skipped.
--   RECOVERY: `alter table app.billing_subscriptions drop constraint billing_subscriptions_workspace_key;`
--   Nothing else depends on it except this batch's own foreign key, which is dropped with the table.
--
--
-- ============================================================================================
-- WHAT IS NOT HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO FIND
-- ============================================================================================
--
--   * `billing_customers`. §5.1 names it and §6's registry gives 131 four words — "webhook/invoice/
--     payment read model" — and a customer mapping is none of them. 130 recorded that its entire
--     content is the provider identity plus an `email_snapshot` which is "the ONLY PII-2 in this
--     family". That is still true, and it is why every table below is FIN-3 or PROVIDER-3 and none
--     of them is PII-2: §5 classifies `billing.core` `PII-2/FIN-3` and the PII half lives in a table
--     neither 130 nor 131 creates. Owed to the batch the registry is amended to name — naming one
--     here would create a batch number by citation, which this package's open blockers already
--     refuse for the industry catalog's `031`.
--
--   * `billing_operations`. §5.1: "checkout/portal/refund/manual grant, actor, idempotency key,
--     status", with the rule "audit ทุก write". It is the OUTBOUND half — what this system asked
--     Stripe to do — and §8.2 makes its idempotency key a key on an outbound API call
--     (`checkout:{workspace}:{operation_uuid}`), which is a property of a request rather than of a
--     row this schema holds. Every one of its four operations needs the command surface RFC-2026-012
--     §4 names and RFC-2026-021 §10 records does not exist. Owed to that batch and to 140/141 for the
--     audit half §14.3 requires.
--
--   * `billing_reconciliation_runs`. §5.1 calls it an "append-only summary" and §13.1 gives it
--     cursors, counts, mismatch classes and repairs. Its whole content is the output of a job that
--     compares this schema against Stripe — and the comparison is not possible, because the raw
--     provider references are refused above. A table whose rows record the result of an impossible
--     comparison is a table with no writer AND no meaning, which is one worse than 050's outbox.
--     Owed with the raw reference.
--
--   * `billing_notifications`. §5.1's "workspace, template, dedupe key, delivery state", and §10.2's
--     cadence. §6's registry gives the notification inbox to batch `051` (A5 Notification, depends
--     on 050). 021's sentence applies unchanged — "creating one would be reserving a table no
--     registry row gives this batch".
--
--   * THE MANUAL INVOICE / TRANSFER FALLBACK. §12.2 names `manual_billing_case_id`, a payer, a
--     service period, "payment evidence reference ที่ access-controlled", a finance verifier and a
--     product approver separate from the requester, and an entitlement expiry. BILL-DEC-006 is
--     `PROPOSED` and says "Product + Finance ต้องอนุมัติ", and §15 forbids an agent closing an open
--     decision. Every invoice below is a projection of a provider invoice, which is why
--     `provider_invoice_hash` is NOT NULL: a manual invoice has none, so the NOT NULL is what makes
--     the refusal structural instead of a convention. Owed to Product plus Finance.
--
--   * A REFUND TABLE. §12.1 is a five-step workflow with a maker-checker approval, and §14.3 makes
--     "requester approve own refund blocked" a threat control with a test. A refund that MOVED is a
--     payment row with a negative direction, and that is below. A refund REQUEST — with its
--     requester, its approver and its case — is `billing_operations`, which is not this batch's.
--     Storing the approval without the approver would be the half that cannot be audited.
--
--   * A `provider_status` COLUMN, ANYWHERE. 130 refused it and the reason is unchanged and now
--     applies to the invoice too: §9 requires the mapping from a provider's own vocabulary to be
--     "อยู่ใน versioned policy", no such policy exists, and a column carrying a provider's state
--     words with no pinned mapping is a column nobody reviewed. The invoice's lifecycle below is
--     TIMESTAMPS, which is 010's refusal about an invitation status, 021's about a member scope,
--     050's about a job and 060's about a credential reference, for the fifth time.
--
--   * A TAX, VAT OR PRORATION COLUMN. BILL-DEC-009 (VAT), BILL-OQ-04 (VAT display) and BILL-OQ-07
--     (proration) are OPEN, and §15 forbids an agent closing an open decision. `amount_due` is what
--     the provider says is due, and whether that figure includes VAT is the open question — so no row
--     in this schema should be read as answering it, which is what its column comment says.
--
--   * AN `amount_paid` COLUMN ON THE INVOICE. What an invoice has been paid is the SUM of its
--     payment rows. A column beside them would be a second source of truth for a fact the child rows
--     already carry — 021 refusing `current_version_id`, 030 refusing `industry_pack_id`, 040
--     refusing `kind`, 050 refusing an attempt table and 130 refusing `cancel_at_period_end`, in the
--     same words — and here it is worse than usual, because the two could disagree about MONEY and
--     nothing in this schema could say which was right.
--
--   * A RETENTION WINDOW. §5 assigns `billing.core` `FINANCE-HISTORY`, which §10 defines as "7 ปี
--     engineering default subject to Thai tax/legal review", and the receipt is `WEBHOOK-SHORT` — "30
--     วันหลัง processed; 90 วัน failure/DLQ". Both numbers exist and neither is encoded, which is 130's
--     position and 050's: §10's own header requires Product/Security/Legal approval before Paid Beta,
--     BILL-OQ-10 ("Billing data retention ไทย") is OPEN with a Legal/Accounting/DPO owner, and batch
--     160 owns the retention job. What this batch provides is the COLUMN each sweep reads and an
--     index over it, which is 010's treatment of `expires_at` for `TOKEN-SHORT`.
--
--   * NO `created_by` AND NO `updated_by`, ON ANY OF THE THREE. §3.2 asks for the actor columns on a
--     row a USER mutates. No user mutates any of these — no client role holds INSERT, UPDATE or
--     DELETE on any table below — so §8.5's "user action ตรวจ `created_by = (select auth.uid())`" has
--     nothing to attach to, which is 130's finding on app.billing_subscriptions arriving on three
--     more tables. The actor who caused a billing event belongs in the audit record §6 of the billing
--     contract describes ("actor user, workspace, IP/UA ตาม privacy policy, request ID และ
--     before/after summary"), which is batch 140's, and in `billing_operations`, which is not built.
--     §8.6 case 8 (forged `created_by`) is therefore NOT APPLICABLE to this family, and the coverage
--     map says so rather than counting a refusal that holds for everybody.
--
--   * NOTHING ABOUT WORKSPACE LIFECYCLE VISIBILITY, and here it costs nothing for 060's reason: no
--     client role can read any of these tables, so the gap 020, 030, 040 and 130 record — a member of
--     an `access_blocked` workspace still reading tenant rows — has no surface on this batch's tables.
--     It is unchanged elsewhere and still owed to an RFC plus batch 170. §11.3's requirement that a
--     workspace deletion resolve its subscription first is a command-path obligation, not a predicate.
--
--   * NO NEW GRANT ON app.billing_subscriptions, WHICH IS A PROMISE BATCH 130 MADE ABOUT THIS BATCH
--     AND THIS BATCH DECLINES. 130 wrote: "The verb this table's writer will need is INSERT and
--     UPDATE, its writer is the webhook projection, and its writer is batch 131 — so 131 grants them,
--     in the change that brings the thing that needs them." The thing that needs them has not
--     arrived. §8.3 marks the service `P` on both billing rows, and `P` is "passes per policy/explicit
--     capability" with no document defining the capability set — the refusal 010, 011, 020, 021, 030
--     and RFC-2026-020 §8 all make. RFC-2026-022 §9 says the `P` cells are outside its subject and
--     still true. And RFC-2026-012 §4's `SECURITY DEFINER` command function, which is what would hold
--     such a grant, does not exist (RFC-2026-021 §10). So the subscription projection still has no
--     writer, the six `*-cannot-*-a-billing-subscription` cases stay exactly as 130 left them, and
--     the assertion 130 pinned across the whole migration set stays true against this file. That is
--     recorded in the open blockers, with the batch that owes it named as the one that brings the
--     command surface rather than as a number invented here.
--
--
-- ============================================================================================
-- SURROGATE KEYS, AND WHY NONE OF THE THREE IS A bigint
-- ============================================================================================
--
-- §3.2 gives two identifier rules: "Domain aggregate/entity: `uuid`" and "Append-only
-- event/attempt/ledger ปริมาณสูง: `bigint generated always as identity`". Batch 050 needed the second
-- for the outbox and the consumer ledger, whose volume is one row per domain state change and one row
-- per consumer per event.
--
-- ALL THREE TABLES HERE KEY ON `uuid`, INCLUDING THE APPEND-ONLY ONE, and the qualifier is why:
-- `ปริมาณสูง` — high volume — modifies the whole of that second rule, and none of these is. A
-- workspace produces one invoice per billing period and a small number of payment rows against it;
-- a webhook receipt arrives per provider event, which is per subscription state change. These are
-- aggregate rows at tenant cadence, not a log at system cadence. And the outbox needed a bigint for a
-- reason none of these has: 050's `id` "is the RELAY's cursor: the order rows became visible, which
-- is what 'read everything after position N' needs and what a uuid cannot express". Nothing reads
-- these tables by position. The receipt is read by processing state and `received_at`, the invoice by
-- workspace, and the payment by invoice.
--
-- Written down because "append-only ledger keyed on a uuid" is the kind of thing a later reader
-- corrects without knowing which half of §3.2's sentence was being answered.


-- ---------------------------------------------------------------------------------------------
-- The forward fix on batch 130's table. See the header section that argues it.
-- ---------------------------------------------------------------------------------------------
--
-- Timeouts are set for this statement and reset immediately after, so nothing leaks into the next
-- migration applied on the same session. `if not exists` is not available for ADD CONSTRAINT, so the
-- re-runnability every other statement in this file gets from `if not exists` is provided by the
-- guard block instead.
set lock_timeout = '5s';
set statement_timeout = '60s';

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint con
      join pg_catalog.pg_class c on c.oid = con.conrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app' and c.relname = 'billing_subscriptions'
       and con.conname = 'billing_subscriptions_workspace_key'
  ) then
    alter table app.billing_subscriptions
      add constraint billing_subscriptions_workspace_key unique (workspace_id, id);
  end if;
end $$;

set lock_timeout = default;
set statement_timeout = default;

comment on constraint billing_subscriptions_workspace_key on app.billing_subscriptions is
  'Added by batch 131 as a FORWARD FIX (migration invariant 1), not by editing batch 130. It is the '
  'target of app.billing_invoices'' composite foreign key, which §3.3 requires of a child of a tenant '
  'parent and §4 invariant 10 states the reason for: an invoice must not be able to name workspace A '
  'while its subscription belongs to workspace B. 130 had no child table and therefore no occasion '
  'to add the pair; its PARTIAL unique index on (workspace_id) cannot serve, because Postgres will '
  'not accept a partial index as a foreign key target.';


-- ---------------------------------------------------------------------------------------------
-- app.billing_webhook_receipts — what the provider said, and what we did about it.
-- ---------------------------------------------------------------------------------------------
--
-- Sensitivity PROVIDER-3 by §9.1's own example ("provider payload, external post ID, WEBHOOK"),
-- retention WEBHOOK-SHORT. It is the one table in this batch whose tenant scope is NULLABLE, and the
-- header argues why at length: §8.3's own field list ends `correlation_workspace_id: null`, because
-- the workspace is what processing RESOLVES.
--
-- IT HOLDS NO PAYLOAD, NO SIGNATURE AND NO HEADER, and the apply-time block holds the table to an
-- exhaustive column ALLOWLIST — 060's mechanism, for 060's reason: a later batch adding `payload`,
-- `raw_body`, `signature` or `headers` fails the migration rather than the code review, and an
-- allowlist cannot be defeated by the forbidden name nobody thought of. §8.1/7 forbids logging "header
-- signature, full payload, customer PII หรือ secret"; a column is a stronger form of a log.
--
-- THE IMMUTABLE HALF AND THE MUTABLE HALF, which is §5.1's "immutable receipt metadata" meeting
-- §8.3's five-state processing machine. What the provider said — provider, livemode, the two digests,
-- the event type, `provider_created_at`, `received_at` — is fixed at insert. What we did —
-- `attempt_count`, `next_attempt_at`, `processed_at`, `dead_lettered_at`, `last_error_code`,
-- `correlation_workspace_id`, `updated_at` — moves. The boundary is a COLUMN-SCOPED UPDATE grant and
-- an apply-time assertion per column against the live ACL, which is app.outbox_events' shape exactly.
--
-- THERE IS NO `processing_status` COLUMN, THOUGH §8.3 DRAWS A FIVE-STATE MACHINE. This is the one
-- place this batch departs from a diagram the document actually contains, so the reasoning is
-- explicit rather than implied. §8.3's states are RECEIVED, PROCESSING, PROCESSED, RETRYABLE and
-- DEAD_LETTER; three of the five are already the presence or absence of a column beside them
-- (`processed_at`, `dead_lettered_at`, `next_attempt_at`), and the two that are not — RECEIVED versus
-- PROCESSING — are distinguishable only by a LEASE, which is `app.jobs`' `lease_owner`/
-- `lease_expires_at` pair and which 050 owns. A `status` column would therefore be a second source of
-- truth for three states and an invented vocabulary for the fourth, and CTR-JOB-001's freeze boundary
-- — "lifecycle state names and transition policy remain subject to source-defined owner review" — is
-- the sentence 050 refused twice on. The lifecycle here is timestamps and a counter. "Dead-lettered"
-- is `dead_lettered_at is not null`; "processed" is `processed_at is not null`; "due for a retry" is
-- `next_attempt_at <= now()` with neither set. Each is a QUERY, and a query is something a reader can
-- disagree with, whereas a CHECK listing five state names is a decision already made.
create table if not exists app.billing_webhook_receipts (
  id                        uuid primary key default gen_random_uuid(),
  provider                  text        not null,
  -- §5.2: "Production/test records ต้องแยกด้วย environment และ `livemode`; ห้าม map ข้าม mode", and
  -- §8.2 puts it in the inbound idempotency key. Batch 130 refused this column in terms and gave it
  -- to this batch by name.
  livemode                  boolean     not null,
  -- §9.3's "stable hash for uniqueness", over the provider's own `event.id`. The raw identifier is
  -- NOT stored — see the header. This is the column §8.2's unique constraint is spelled over, and it
  -- is what makes §14.3's replay control ("event ซ้ำ 10 ครั้ง") a constraint rather than a hope.
  provider_event_hash       bytea       not null,
  -- §8.1/5 and §8.3: "payload hash". The BODY is not stored; its digest is, so a redelivery carrying
  -- a different body under the same event id is detectable by comparison rather than by trust.
  payload_hash              bytea       not null,
  -- The provider's own event type, e.g. the ten families §8.5 requires a system to handle or
  -- explicitly ignore. It is NOT constrained to a value set: §8.5's list is a baseline that ends "ตาม
  -- implementation ที่เลือก", the names are pinned to a Stripe API version this repository has not
  -- chosen, and §15 forbids an agent closing that. The FORM is constrained, because an event type is
  -- what a router dispatches on.
  provider_event_type       text        not null,
  -- §8.4: "เก็บ `provider_created_at`, `processed_at`, provider object ID และ projection revision".
  -- Two of the four are here; the provider object id is refused (header) and the projection revision
  -- belongs to the row being projected, which is the invoice.
  provider_created_at       timestamptz not null,
  received_at               timestamptz not null default now(),
  -- The tenant, once it is known. NULLABLE by §8.3's own field list, and the header argues the
  -- departure from §3.3 rather than assuming it. Spelled the document's way (040's rule).
  correlation_workspace_id  uuid        references app.workspaces (id),
  attempt_count             integer     not null default 0,
  next_attempt_at           timestamptz,
  processed_at              timestamptz,
  dead_lettered_at          timestamptz,
  last_error_code           text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  -- BILL-DEC-001 is `APPROVED-PRODUCT`: "Stripe เป็น provider Production". One value, so a named
  -- CHECK with one value — §3.2 makes a Phase 1 state `text` + a named CHECK whose values change by
  -- migration only, and a second provider is a migration a reviewer reads. It is NOT an enum type and
  -- NOT a bare text column: the first would need a `create type` no batch here has used, and the
  -- second would let a projection invent a provider the rest of the system cannot route.
  constraint billing_webhook_receipts_provider_known check (provider in ('stripe')),
  -- sha256 is 32 bytes. A FLOOR rather than an equality, which is 010's treatment of
  -- `token_hash` — "so a plaintext token could not fit a digest column" — and here it stops a raw
  -- `evt_1234…` being written into a column the schema calls a digest.
  constraint billing_webhook_receipts_event_hash_is_a_digest
    check (octet_length(provider_event_hash) >= 32),
  constraint billing_webhook_receipts_payload_hash_is_a_digest
    check (octet_length(payload_hash) >= 32),
  -- The shape of a provider event type. Stripe's are dotted lowercase segments; the bound is this
  -- batch's own and is stated so a reviewer can refuse it, because no document bounds this field and
  -- CTR-EVT-001's equivalent (`event_type`, 128) is the nearest thing in the contract catalog.
  constraint billing_webhook_receipts_event_type_form check (
    provider_event_type ~ '^[a-z0-9]+(_[a-z0-9]+)*(\.[a-z0-9]+(_[a-z0-9]+)*)+$'
    and length(provider_event_type) <= 128),
  constraint billing_webhook_receipts_attempt_count_not_negative check (attempt_count >= 0),
  constraint billing_webhook_receipts_last_error_code_not_blank
    check (last_error_code is null or length(btrim(last_error_code)) between 1 and 128),
  -- A receipt is PROCESSED or DEAD-LETTERED or neither, never both. §8.3's machine has no transition
  -- from PROCESSED to DEAD_LETTER, and a row carrying both timestamps would make "did we act on this
  -- event" unanswerable — which is the single question the table exists to answer.
  constraint billing_webhook_receipts_outcome_is_exclusive check (
    processed_at is null or dead_lettered_at is null),
  -- §8.2's INBOUND idempotency key, verbatim in structure — "unique constraint `(provider, livemode,
  -- event_id)`" — with the digest standing in for the id. All three terms earn their place: the
  -- provider because a second provider's event ids are a different namespace, `livemode` because
  -- §5.2 forbids mapping across modes and a test event carrying a live event's id must not suppress
  -- it, and the digest because it is what a redelivery repeats.
  constraint billing_webhook_receipts_event_unique unique (provider, livemode, provider_event_hash)
);

comment on table app.billing_webhook_receipts is
  'Owner: A6 Billing (billing.core, batch 131). The provider webhook INBOX as a RECEIPT: it holds no '
  'payload, no signature and no header, and its apply-time block refuses any column outside §8.3''s '
  'own minimum field list, so a later batch adding one fails the migration rather than the review. '
  'Sensitivity PROVIDER-3 (§9.1: "provider payload, external post ID, webhook"); retention '
  'WEBHOOK-SHORT, whose 30/90-day numbers §10 states and this batch deliberately does not encode '
  '(BILL-OQ-10 is open and batch 160 owns the job). correlation_workspace_id is NULLABLE because a '
  'provider event arrives outside any session and §8.3''s own field list initialises it null: the '
  'workspace is DISCOVERED by processing, not carried by the request. §8.3''s "Raw token/webhook '
  'SELECT" is N for every client role and S for the service; RFC-2026-022 §3 classifies that cell '
  'DISCOVERED, so app_worker holds grants and NO POLICY — permanently, per §5/5 — and the '
  'classification is recorded in db/foundation/lint/service-policy-map.json. NO client role holds any '
  'privilege here.';
comment on column app.billing_webhook_receipts.provider is
  'PROVIDER-3. BILL-DEC-001 (APPROVED-PRODUCT) fixes Stripe as the production provider, so the CHECK '
  'holds one value and a second provider is a migration a reviewer reads (§3.2). It is in the '
  'idempotency key because two providers'' event ids are two namespaces.';
comment on column app.billing_webhook_receipts.livemode is
  'PROVIDER-3. §5.2: production and test records are separated by environment and livemode, and '
  'mapping across modes is forbidden. Batch 130 refused this column and named this batch; it is in '
  'the idempotency key (§8.2) so a test event cannot suppress a live one carrying the same id, and it '
  'is the term app.billing_invoices'' composite key uses to refuse §13.1''s LIVEMODE_MISMATCH.';
comment on column app.billing_webhook_receipts.provider_event_hash is
  'PROVIDER-3. §9.3 requires an external identifier to be a "raw encrypted/private reference + stable '
  'hash for uniqueness"; this is the stable hash and the raw reference is REFUSED — there is no '
  'encryption mechanism, §14.1 permits a Stripe object id only after a privacy review that has not '
  'happened, and Gate G0 authorizes no provider integration. §9.1 says the same of PROVIDER-3 in one '
  'phrase: "redact/log hash". The consequence is that §13.1''s reconciliation cannot address a '
  'provider object from this schema, which is recorded in the work package''s open blockers rather '
  'than discovered by whoever writes that job.';
comment on column app.billing_webhook_receipts.payload_hash is
  'PROVIDER-3. §8.1/5 requires the inbox to record a payload hash and §5.1 calls the row "immutable '
  'receipt metadata". The BODY is not stored: §5.1''s alternative is an "encrypted payload policy" '
  'that does not exist, §10''s WEBHOOK-SHORT says to "redact/purge payload, retain dedupe hash '
  'longer", and §9.2 forbids a provider payload reaching a client, an event, a job or a fixture. A '
  'redelivery whose body differs under the same event id is detectable by comparing this digest.';
comment on column app.billing_webhook_receipts.correlation_workspace_id is
  'PROVIDER-3 pointing at a tenant. NULL until processing resolves which workspace the event is '
  'about, which is §8.3''s own initial value for this field and the reason RFC-2026-022 §3 classes '
  'this cell DISCOVERED: the workspace is the statement''s OUTPUT. It is a real foreign key, so an '
  'attribution that is made names a workspace that exists. §3.3 requires the canonical scope field on '
  'a tenant-owned row and a receipt is not one until this column is set — the departure is argued in '
  'the migration header rather than assumed.';
comment on column app.billing_webhook_receipts.next_attempt_at is
  'PROVIDER-3. §8.3''s RETRYABLE state as a timestamp rather than as a status value, which is 010''s '
  'refusal about an invitation, 050''s about a job and 060''s about a credential reference. There is '
  'no backoff arithmetic anywhere in this file: the schedule is a policy and the deadline is a fact, '
  'which is the distinction BILL-DEC-012 draws about the grace period one table over.';
comment on column app.billing_webhook_receipts.dead_lettered_at is
  'PROVIDER-3. §8.3''s DEAD_LETTER, and §10''s WEBHOOK-SHORT keeps a failed row 90 days against 30 '
  'for a processed one, so having been dead-lettered is a fact the row has to carry. The CHECK beside '
  'it forbids a row that is both processed and dead-lettered, because "did we act on this event" is '
  'the one question this table exists to answer.';


-- ---------------------------------------------------------------------------------------------
-- app.billing_invoices — the read model. Mutable, because a projection is re-projected.
-- ---------------------------------------------------------------------------------------------
--
-- TENANT-1 scope by §3.3's canonical `workspace_id`; sensitivity FIN-3 (§9.1 names "price, INVOICE,
-- usage/cost ledger" as its examples); retention FINANCE-HISTORY.
--
-- IT IS MUTABLE AND THAT IS THE ANSWER TO §5's "ledger-like" RATHER THAN AN EXCEPTION TO IT. See the
-- header: §8.4 requires a projection to re-fetch from Stripe and requires a projection revision to be
-- stored, and both of those describe a row that is overwritten. What makes the overwrite safe is not
-- immutability but ORDERING, and `provider_revision` is where §8.4 puts it.
--
-- MONOTONICITY OF `provider_revision` IS A WRITE-PATH OBLIGATION AND IS NOT ENFORCED HERE, WHICH IS
-- STATED RATHER THAN LEFT AS AN ABSENCE. A CHECK cannot compare the new row to the old one, so the
-- only in-database forms are a trigger or a command function. Batch 140 wrote a trigger and had a
-- reason this table does not have — its adversary can own the table — and 050 refused to put a
-- lifecycle decision into a quieter place than a CHECK. The rule "an older event must not overwrite a
-- newer projection" is §8.4's, it belongs to the projection, and the projection does not exist. The
-- column is here so that the day it does, the comparison has somewhere to read from; it is owed to
-- the batch that brings the writer, and it is in the open blockers.
--
-- NO `amount_paid`, NO `status`, NO PROVIDER STATE WORDS. See the header for all three. The lifecycle
-- is `issued_at`, `due_at`, `settled_at` and `voided_at`, and what an invoice has been paid is the
-- sum of its payment rows.
create table if not exists app.billing_invoices (
  id                         uuid primary key default gen_random_uuid(),
  workspace_id               uuid          not null,
  -- The subscription this invoice bills, over the WHOLE scope path. §3.3's composite foreign key and
  -- §4 invariant 10's failure mode: without the pair, an invoice could name workspace A while its
  -- subscription belongs to workspace B, and an actor with rights in each separately would be inside
  -- both. Its target is the unique constraint this batch adds to batch 130's table as a forward fix.
  billing_subscription_id    uuid          not null,
  provider                   text          not null,
  livemode                   boolean       not null,
  -- §9.3's stable hash again, over the provider's invoice id. NOT NULL: every row here is a
  -- projection of a provider invoice, and a MANUAL invoice (§12.2, BILL-DEC-006 PROPOSED) is refused
  -- structurally rather than by a comment.
  provider_invoice_hash      bytea         not null,
  currency                   text          not null,
  -- §3.2: "เงิน: `numeric(18,6)` + ISO-4217 currency; ห้าม float", which the apply-time block asserts
  -- against the live catalog on both halves, as batch 130's does.
  amount_due                 numeric(18,6) not null,
  issued_at                  timestamptz   not null,
  due_at                     timestamptz,
  settled_at                 timestamptz,
  voided_at                  timestamptz,
  -- §8.4's "projection revision". The provider's own version of the object this row projects.
  provider_revision          bigint        not null,
  last_projection_error_code text,
  created_at                 timestamptz   not null default now(),
  updated_at                 timestamptz   not null default now(),
  constraint billing_invoices_provider_known check (provider in ('stripe')),
  constraint billing_invoices_invoice_hash_is_a_digest
    check (octet_length(provider_invoice_hash) >= 32),
  -- ISO-4217 is three uppercase letters. The SHAPE is §3.2's and the VALUE is BILL-DEC-014's, which
  -- is `UNVERIFIED` against a live account — so a `check (currency = 'THB')` would encode an
  -- unverified decision as a constraint. Batch 130's reasoning, on the table that has to agree with
  -- the price it bills.
  constraint billing_invoices_currency_is_iso_4217 check (currency ~ '^[A-Z]{3}$'),
  -- Zero is a real invoice — a free tier or a fully discounted period both produce one, and
  -- BILL-OQ-01 leaves the package set open. Negative is not an amount due; money going the other way
  -- is a refund, which is a payment row with `direction = 'refund'`.
  constraint billing_invoices_amount_not_negative check (amount_due >= 0),
  constraint billing_invoices_revision_not_negative check (provider_revision >= 0),
  constraint billing_invoices_error_code_not_blank
    check (last_projection_error_code is null or length(btrim(last_projection_error_code)) between 1 and 128),
  -- An invoice is settled or voided or neither. §12.1's refund does not void an invoice — the money
  -- moved and then moved back, and both movements are payment rows — so a row carrying both would be
  -- saying the period was billed and never billed at once.
  constraint billing_invoices_outcome_is_exclusive check (settled_at is null or voided_at is null),
  constraint billing_invoices_due_after_issue check (due_at is null or due_at >= issued_at),
  constraint billing_invoices_settled_after_issue check (settled_at is null or settled_at >= issued_at),
  -- §8.2's key shape applied to an invoice rather than to an event: one provider object, one row.
  constraint billing_invoices_provider_unique unique (provider, livemode, provider_invoice_hash),
  -- The target of app.billing_payments' TENANT-PATH foreign key, and the thing batch 130 did not have
  -- for this table's own parent — added here at the same time as the forward fix that supplies it, so
  -- the next child in this family does not repeat the finding. `id` alone is already unique; the pair
  -- is what §3.3 requires a child to compare.
  constraint billing_invoices_scope_key unique (workspace_id, id),
  -- The target of app.billing_payments' MODE foreign key. A second pair rather than a wider one,
  -- because a payment must agree with its invoice about two different things for two different
  -- reasons: the tenant (§3.3, §4 invariant 10) and the mode (§5.2). A single three-column key would
  -- collapse them into one constraint whose failure message could not say which rule was broken, and
  -- §13.1 grades the two differently — a cross-tenant link is a data defect and a LIVEMODE_MISMATCH is
  -- a "critical incident; no auto-repair". Batch 130's move on DUPLICATE_ACTIVE_SUBS, one table over.
  constraint billing_invoices_mode_key unique (id, livemode),
  constraint billing_invoices_subscription_scope_fk
    foreign key (workspace_id, billing_subscription_id)
    references app.billing_subscriptions (workspace_id, id)
);

comment on table app.billing_invoices is
  'Owner: A6 Billing (billing.core, batch 131). Canonical scope workspace_id (§3.3), reached through '
  'a COMPOSITE foreign key into app.billing_subscriptions so an invoice cannot name one workspace '
  'while its subscription belongs to another (§4 invariant 10). Sensitivity FIN-3 — §9.1 names the '
  'invoice as its own example — retention FINANCE-HISTORY. IT IS MUTABLE ON PURPOSE: §8.4 requires a '
  'projection to re-fetch the latest object from the provider and to store a projection revision, '
  'which describes a row that is overwritten; declaring it append-only would turn a read model into a '
  'log and give "what does this workspace owe" more than one answer. It carries NO amount_paid — what '
  'has been paid is the sum of its app.billing_payments rows — NO provider status vocabulary (§9 '
  'requires that mapping to be a versioned policy and none exists), NO tax column (BILL-DEC-009 and '
  'BILL-OQ-04 are OPEN) and NO raw provider identifier (§9.3, see the migration header). NO client '
  'role holds any privilege: an owner reading their own invoices is the strongest RFC-2026-021 '
  'allowlist candidate this family produces and it fails C1, because there is no client.';
comment on column app.billing_invoices.workspace_id is
  'FIN-3. The canonical tenant scope. It is in no UPDATE grant, so §8.5''s "ห้ามย้าย row ข้าม tenant '
  'ด้วย update" is held by a column list rather than by a policy, and the apply-time block asserts it '
  'per column against the live ACL rather than against the grant text.';
comment on column app.billing_invoices.billing_subscription_id is
  'FIN-3. What this invoice bills, pinned by a composite foreign key over (workspace_id, id) whose '
  'target batch 131 adds to batch 130''s table as a forward fix. Through it the invoice reaches the '
  'plan revision, the price, the interval and the entitlements without copying any of them — a copy '
  'is a second source of truth for a fact the foreign key already fixes (021, 030, 040 and 130, in '
  'the same words).';
comment on column app.billing_invoices.amount_due is
  'FIN-3. §3.2: money is numeric(18,6) and never a float, asserted against the live catalog by this '
  'file''s apply-time block. Zero is a real invoice; negative is not an amount due, and money moving '
  'back is a refund row in app.billing_payments. Whether this figure includes VAT is BILL-DEC-009 and '
  'BILL-OQ-04, which are OPEN — so no tax column is invented here and no row should be read as '
  'answering it.';
comment on column app.billing_invoices.provider_invoice_hash is
  'FIN-3 / PROVIDER-3. §9.3''s stable hash over the provider''s invoice id; the raw identifier is '
  'refused for the reason the migration header gives. NOT NULL, which is what refuses §12.2''s manual '
  'invoice structurally: BILL-DEC-006 is PROPOSED and requires Product plus Finance approval, and a '
  'manual case has no provider invoice to hash.';
comment on column app.billing_invoices.provider_revision is
  'FIN-3. §8.4: "เก็บ provider_created_at, processed_at, provider object ID และ PROJECTION REVISION". '
  'It exists so that an older event cannot overwrite a newer projection. That comparison is NOT '
  'enforced here: a CHECK cannot see the old row, and the only in-database alternatives are a trigger '
  '(batch 140''s, for an adversary this table does not have) or the command function RFC-2026-012 §4 '
  'names and RFC-2026-021 §10 records does not exist. The obligation belongs to the projection and is '
  'recorded in the work package''s open blockers.';
comment on column app.billing_invoices.settled_at is
  'FIN-3. The lifecycle here is TIMESTAMPS and not a status vocabulary: §9 requires the mapping from '
  'a provider''s own state words to be a versioned policy and none exists, so "settled" is a fact the '
  'projection records rather than a word it copies. Unpaid is `settled_at is null and voided_at is '
  'null`, which is a query a reader can disagree with — 050''s distinction between a query and a '
  'CHECK constraint listing state names.';
comment on column app.billing_invoices.livemode is
  'FIN-3. §5.2 forbids mapping across modes. It is unique with the provider and the invoice digest, '
  'and it is half of the (id, livemode) key app.billing_payments'' composite foreign key targets — so '
  '§13.1''s LIVEMODE_MISMATCH, which that section calls a critical incident with no auto-repair, is '
  'refused by a constraint on this pair rather than reported by a job.';


-- ---------------------------------------------------------------------------------------------
-- app.billing_payments — the payment REFERENCE. Append-only, because money moved.
-- ---------------------------------------------------------------------------------------------
--
-- This is the "payment refs" of §5's inventory row, and the header says at length what it is a
-- reference TO: a payment EVENT at the provider, never a payment INSTRUMENT. There is no card
-- column, no token, no brand, no expiry and no payment-method handle; the apply-time block refuses
-- the SHAPES those arrive in on every apply.
--
-- APPEND-ONLY, expressed the way 130's published tables and 050's consumer ledger express it and
-- asserted both ways: no UPDATE or DELETE grant to any role, no UPDATE or DELETE policy for any role,
-- and no `updated_at` column and no trigger, because an immutable row has no update to stamp. §8.6
-- case 9 — "Immutable/LEDGER row → update/delete fail" — is the case this table carries best.
--
-- A REFUND IS A ROW AND NOT AN EDIT, which is what makes the immutability affordable rather than
-- merely strict. §12.1's refund workflow ends "Webhook/reconciliation ยืนยันผล แล้วอัปเดต ledger
-- projection", and the ledger-correct form of that update is another entry: `direction = 'refund'`
-- against the same invoice. What an invoice has net been paid is therefore a SUM over these rows and
-- lives in no column — the second-source-of-truth refusal the header makes about `amount_paid`.
--
-- `direction` IS A TWO-VALUE VOCABULARY AND BOTH WORDS ARE THE DOCUMENT'S. §12.1 is titled "Refund,
-- Credit และ Manual Support" and §8.5 requires "refund/credit-note related events" to be handled;
-- `charge` is the other half of what a payment event can be. It is text + a named CHECK (§3.2) rather
-- than a signed amount, because a negative `amount` in a FIN-3 column is a value somebody eventually
-- sums without reading the sign, and because §13.1's own mismatch classes are about kinds of event
-- rather than about arithmetic.
--
-- `succeeded_at` AND `failed_at` RATHER THAN A STATUS, for the fifth time in this schema. §8.5
-- requires `invoice.paid` and `invoice.payment_failed` to be handled, which is exactly two outcomes,
-- and §10.1's grace policy turns on a failure having happened rather than on a provider's word for
-- it. A row carries one or the other and never both.
create table if not exists app.billing_payments (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid          not null,
  billing_invoice_id    uuid          not null,
  provider              text          not null,
  livemode              boolean       not null,
  -- §9.3's stable hash over the provider's payment object id. The raw identifier is refused for the
  -- reason the header gives, and this column is what makes a redelivered payment event idempotent.
  provider_payment_hash bytea         not null,
  direction             text          not null,
  currency              text          not null,
  amount                numeric(18,6) not null,
  occurred_at           timestamptz   not null,
  succeeded_at          timestamptz,
  failed_at             timestamptz,
  failure_code          text,
  created_at            timestamptz   not null default now(),
  constraint billing_payments_provider_known check (provider in ('stripe')),
  constraint billing_payments_payment_hash_is_a_digest
    check (octet_length(provider_payment_hash) >= 32),
  constraint billing_payments_direction_known check (direction in ('charge', 'refund')),
  constraint billing_payments_currency_is_iso_4217 check (currency ~ '^[A-Z]{3}$'),
  -- Never negative, in either direction. A refund is a DIRECTION and not a sign, so a reader who
  -- sums this column without reading `direction` gets a wrong answer loudly rather than quietly.
  constraint billing_payments_amount_not_negative check (amount >= 0),
  -- One outcome or the other or neither — neither being a payment the provider has reported as
  -- started and not yet resolved. Both at once would make "did this money move" unanswerable, which
  -- is the one question a finance record must answer.
  constraint billing_payments_outcome_is_exclusive check (succeeded_at is null or failed_at is null),
  -- A failure code belongs to a failure. §8.4 requires a dead-letter alert to carry a "sanitized
  -- error" and forbids PII or a secret in it; §9.2 forbids a provider stack trace or full SDK error
  -- anywhere, so this is a CODE and is bounded like one.
  constraint billing_payments_failure_code_belongs_to_a_failure check (
    (failure_code is null) or (failed_at is not null and length(btrim(failure_code)) between 1 and 128)),
  constraint billing_payments_provider_unique unique (provider, livemode, provider_payment_hash),
  -- THE COMPOSITE FOREIGN KEY, OVER THE TENANT PATH AND OVER THE MODE. §3.3's scope rule and §5.2's
  -- mode rule are two different rules with the same mechanism, and both are refused here rather than
  -- reported by §13.1's reconciliation job: a payment cannot pay an invoice belonging to another
  -- workspace, and a live payment cannot attach to a test invoice.
  constraint billing_payments_invoice_scope_fk
    foreign key (workspace_id, billing_invoice_id)
    references app.billing_invoices (workspace_id, id),
  constraint billing_payments_invoice_mode_fk
    foreign key (billing_invoice_id, livemode)
    references app.billing_invoices (id, livemode)
);

comment on table app.billing_payments is
  'Owner: A6 Billing (billing.core, batch 131). The "payment refs" of §5''s inventory row, and the '
  'reference is to a payment EVENT and never to a payment INSTRUMENT: no card number, no masked card '
  'number, no CVV, no brand, no expiry, no fingerprint, no payment-method id and no token — §9.2 and '
  'BILL-DEC-003 forbid the data, and this migration''s apply-time block refuses the column SHAPES it '
  'would arrive in. Canonical scope workspace_id (§3.3), reached by a composite foreign key into '
  'app.billing_invoices, plus a second composite key over (billing_invoice_id, livemode) so §13.1''s '
  'LIVEMODE_MISMATCH is refused by a constraint. Sensitivity FIN-3; retention FINANCE-HISTORY, whose '
  '"retain ledger integrity" is what the append-only shape pays. APPEND-ONLY: no role, client or '
  'service, holds UPDATE or DELETE, as an absent grant AND an absent policy asserted both ways, and '
  'there is no updated_at. A refund is a ROW with direction `refund`, never an edit — §12.1''s '
  '"ห้าม Support ปรับ subscription/entitlement โดยแก้ DB" applied to the money itself.';
comment on column app.billing_payments.direction is
  'FIN-3. §3.2''s text + named CHECK. `charge` and `refund` are the two things a payment event can '
  'be — §8.5 requires refund and credit-note events to be handled, and §12.1 is the workflow that '
  'produces them. A refund is a direction and not a negative amount, because a sign in a money column '
  'is a value somebody eventually sums without reading it.';
comment on column app.billing_payments.amount is
  'FIN-3. §3.2: numeric(18,6) plus an ISO-4217 currency, never a float and never Postgres''s money '
  'type, whose output depends on a session GUC. Never negative in either direction — see direction. '
  'What an invoice has NET been paid is a sum over these rows and is deliberately not a column on the '
  'invoice, because two places holding one money fact can disagree and nothing here could say which '
  'was right.';
comment on column app.billing_payments.provider_payment_hash is
  'FIN-3 / PROVIDER-3. §9.3''s "stable hash for uniqueness" over the provider''s payment object id; '
  'the raw identifier is refused (migration header). Unique with the provider and the mode, so a '
  'redelivered payment event produces one row rather than two — §14.3''s replay control expressed as '
  'a constraint.';
comment on column app.billing_payments.failure_code is
  'FIN-3. A CODE and never a message: §9.2 forbids a provider stack trace or a full SDK error '
  'anywhere in this system, and §8.4 requires a dead-letter alert to carry a sanitized error with no '
  'PII and no secret. Its CHECK ties it to failed_at, so a row cannot report a reason for something '
  'that did not fail.';
comment on column app.billing_payments.occurred_at is
  'FIN-3. When the provider says the money moved, which is the column §10''s FINANCE-HISTORY sweep '
  'and any tax-period report reads. The seven-year number §10 states is deliberately not encoded: '
  'BILL-OQ-10 is OPEN with a Legal/Accounting/DPO owner, §10''s own header requires approval before '
  'Paid Beta, and batch 160 owns the retention job.';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- Already covered by a constraint's own index, and therefore NOT repeated below:
--
--   billing_webhook_receipts (provider, livemode, provider_event_hash)
--                                       — the idempotency key, and the lookup a redelivery makes.
--   billing_invoices (provider, livemode, provider_invoice_hash)
--                                       — the same shape, and the lookup a projection makes.
--   billing_invoices (id, livemode)     — the mode key app.billing_payments targets.
--   billing_invoices (workspace_id, id) — the scope key app.billing_payments targets. It is NOT the
--                                         keyset index below and does not replace it: keyset
--                                         pagination is over (workspace_id, created_at desc, id desc)
--                                         and this pair cannot answer it. Both are kept and the
--                                         overlap is named rather than left for a reader to spot.
--   billing_payments (provider, livemode, provider_payment_hash)
--                                       — the same shape again.
--   billing_subscriptions (workspace_id, id)
--                                       — the constraint this batch adds, which is also the index
--                                         supporting app.billing_invoices' composite foreign key.
--
-- NO RLS-PREDICATE INDEX IS OWED BY THIS BATCH, and the reason is the batch rather than an oversight:
-- not one table here carries a policy, so no column is an RLS predicate. The day an allowlist entry
-- adds one, the index is part of that change (§6 invariant 8).

-- The receipt's foreign key into app.workspaces, and the column §11.4's closure sweep would filter
-- on. It is PARTIAL on the resolved rows, because the unresolved ones are exactly the rows that
-- carry no workspace and an index entry for each of them would be an entry for a NULL nobody looks
-- up by.
create index if not exists billing_webhook_receipts_workspace_idx
  on app.billing_webhook_receipts (correlation_workspace_id)
  where correlation_workspace_id is not null;

-- The claim ordering §8.1/6's durable-insert-then-process shape needs: the receipts nobody has
-- resolved, oldest first. PARTIAL on `processed_at is null and dead_lettered_at is null`, which is
-- the column's own nullability rather than an invented state vocabulary — 050's outbox index, and
-- 050's own warning about a partial predicate is why this one names only the two columns whose
-- nullability §8.3 already fixes and not `next_attempt_at`, `attempt_count` or a retry budget, which
-- together would be a definition of which receipts are still live.
create index if not exists billing_webhook_receipts_unprocessed_idx
  on app.billing_webhook_receipts (received_at)
  where processed_at is null and dead_lettered_at is null;

-- §3.3 keyset pagination, "(created_at desc, id desc)", for the list that grows with the tenant: a
-- workspace's invoice history. It leads with workspace_id, so it also supports the composite foreign
-- key's leading column and whatever predicate an allowlist entry eventually writes.
create index if not exists billing_invoices_workspace_keyset_idx
  on app.billing_invoices (workspace_id, created_at desc, id desc);

-- The invoice's own foreign key into the subscription. The keyset index above leads with
-- workspace_id and does not support a lookup by subscription, which is how §13.1's
-- SUBSCRIPTION_STATUS_DRIFT check would address this table if it could.
create index if not exists billing_invoices_subscription_idx
  on app.billing_invoices (billing_subscription_id);

-- The payments of one invoice, which is the only question anything asks of this table and is what
-- "what has this invoice been paid" sums over. It leads with billing_invoice_id, so it supports the
-- mode foreign key too; the tenant-path foreign key leads with workspace_id and gets its own.
create index if not exists billing_payments_invoice_idx
  on app.billing_payments (billing_invoice_id, occurred_at desc, id desc);

create index if not exists billing_payments_workspace_keyset_idx
  on app.billing_payments (workspace_id, created_at desc, id desc);


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every MUTABLE row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
--
-- Two triggers, not three. app.billing_payments has no updated_at to stamp, and adding one would be
-- the first sentence of an append-only table contradicting itself (020's words, kept by 030, 040,
-- 050 and 130 and kept again here).
--
-- BOTH ARE REACHABLE AND NEITHER CAN FIRE THROUGH A POLICY, and the distinction is written the way
-- batch 050 wrote it rather than the way batch 060 first did: app_worker holds a column-scoped UPDATE
-- on each of these two tables, so the triggers are reachable through a granted path — and row level
-- security then refuses that path, because neither table carries a policy. "Reachable but refused" is
-- not the same claim as "unreachable", and 060 shipped the second sentence about a table where the
-- first was true until independent review compared the comment with the grant.
drop trigger if exists set_updated_at on app.billing_webhook_receipts;
create trigger set_updated_at before update on app.billing_webhook_receipts
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.billing_invoices;
create trigger set_updated_at before update on app.billing_invoices
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on every table, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
--
-- On all three this is doing the whole job rather than part of it. They carry NO policy, so ENABLE
-- plus FORCE is what makes every non-bypassing role — including the table owner and including the one
-- role holding grants — read zero rows, and it is what the CI negative control switches off to prove
-- the suite notices.
alter table app.billing_webhook_receipts enable row level security;
alter table app.billing_webhook_receipts force row level security;

alter table app.billing_invoices enable row level security;
alter table app.billing_invoices force row level security;

alter table app.billing_payments enable row level security;
alter table app.billing_payments force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges. Most of this batch is what is absent.
-- ---------------------------------------------------------------------------------------------
--
-- §6 invariant 8 puts migration, constraints, indexes, RLS AND grants in one change set.
--
-- `authenticated` AND `anon` ARE GRANTED NOTHING, ON ANY OF THE THREE. The header argues it: §8.3's
-- "Raw token/webhook SELECT" is `N` in every client column; §8 has no row for an invoice or a payment
-- at all, and where a document is silent the cell is denied (030's reading, which 050 and 060 kept);
-- and the owner's invoice read is an RFC-2026-021 allowlist candidate that fails C1 and would be a
-- new entry on a list §8.5 requires to be closed. So this batch adds nothing to that list.
--
-- `app_worker` HOLDS GRANTS AND NO POLICY on all three, which is 010's shape and the reason every one
-- of this batch's negative-control entries can bite: with the grant and no policy, an empty read can
-- only have come from row level security, and a service role that had quietly acquired BYPASSRLS
-- would SUCCEED where the suite demands a refusal.
--
-- The verbs follow §8.3's `S` and §8's silence read conservatively rather than generously, and every
-- one of them is COLUMN-SCOPED where a column is withheld:
--
--   app.billing_webhook_receipts  select, insert, and UPDATE on the PROCESSING columns alone. §8.3's
--                                 `S` is a SELECT; the INSERT is §8.1/6's durable insert, which is the
--                                 statement the whole ingress contract is written about, and a table
--                                 whose only granted verb was SELECT would be one §8.1 could never
--                                 reach. What the provider said is immutable (§5.1's "immutable
--                                 receipt metadata"), so the update grant names seven columns and
--                                 withholds seven, and the apply-time block asserts the withheld ones
--                                 per column against the live ACL.
--   app.billing_invoices          select, insert, and UPDATE on the PROJECTED columns alone. `id`,
--                                 `workspace_id`, `billing_subscription_id`, `provider`, `livemode`,
--                                 `provider_invoice_hash`, `issued_at` and `created_at` are absent, so
--                                 no invoice can be re-identified, re-attributed, moved between
--                                 tenants or moved between modes by an update (§8.5, §5.2).
--   app.billing_payments          select, insert. NO UPDATE and NO DELETE, for any role: it is a
--                                 ledger, and a payment that can be amended after the fact is a
--                                 finance defect.
--
-- NO DELETE ANYWHERE, FOR ANY ROLE. §8.5 has no broad user delete, and hard deletion of these three
-- is a retention sweep — WEBHOOK-SHORT and FINANCE-HISTORY both name one — which batch 160 owns
-- through `app_maintenance`, and this batch grants `app_maintenance` nothing.
grant select (id, provider, livemode, provider_event_hash, payload_hash, provider_event_type,
              provider_created_at, received_at, correlation_workspace_id, attempt_count,
              next_attempt_at, processed_at, dead_lettered_at, last_error_code, created_at, updated_at)
  on app.billing_webhook_receipts to app_worker;
grant insert (provider, livemode, provider_event_hash, payload_hash, provider_event_type,
              provider_created_at, correlation_workspace_id, next_attempt_at)
  on app.billing_webhook_receipts to app_worker;
-- Seven columns. The apply-time block asserts that every other column of this table is unwritable by
-- every role, against the live ACL rather than against this line — 050's treatment of the outbox
-- envelope, where the point is that a role which could rewrite what the provider said could re-aim an
-- event after the fact.
grant update (correlation_workspace_id, attempt_count, next_attempt_at, processed_at,
              dead_lettered_at, last_error_code, updated_at)
  on app.billing_webhook_receipts to app_worker;

grant select (id, workspace_id, billing_subscription_id, provider, livemode, provider_invoice_hash,
              currency, amount_due, issued_at, due_at, settled_at, voided_at, provider_revision,
              last_projection_error_code, created_at, updated_at)
  on app.billing_invoices to app_worker;
grant insert (workspace_id, billing_subscription_id, provider, livemode, provider_invoice_hash,
              currency, amount_due, issued_at, due_at, provider_revision)
  on app.billing_invoices to app_worker;
grant update (currency, amount_due, due_at, settled_at, voided_at, provider_revision,
              last_projection_error_code, updated_at)
  on app.billing_invoices to app_worker;

grant select (id, workspace_id, billing_invoice_id, provider, livemode, provider_payment_hash,
              direction, currency, amount, occurred_at, succeeded_at, failed_at, failure_code,
              created_at)
  on app.billing_payments to app_worker;
grant insert (workspace_id, billing_invoice_id, provider, livemode, provider_payment_hash,
              direction, currency, amount, occurred_at, succeeded_at, failed_at, failure_code)
  on app.billing_payments to app_worker;
-- No UPDATE and no DELETE on the payment ledger, for any role. §8.6 case 9 names a LEDGER row, and
-- the absence is what makes the refusal a privilege-layer 42501 the isolation suite can attribute to
-- an object by name rather than a policy a later edit can widen.

-- `app_command` and `app_maintenance` are granted nothing by this batch. There is no specified
-- command surface for billing.core in any document this repository holds — §4 of the billing contract
-- names a `billing-api` module and RFC-2026-012 §4 names SECURITY DEFINER command functions as the
-- mechanism, and neither exists (RFC-2026-021 §10) — and the retention path is batch 160.
--
-- AND NOTHING NEW IS GRANTED ON app.billing_subscriptions, app.billing_plans,
-- app.billing_plan_versions OR app.plan_entitlements. See the header: batch 130 expected this batch
-- to grant the subscription writer, and §8.3 marks the service `P` there, which is the undefined
-- capability every batch since 010 has refused. 130's static assertion over the whole migration set
-- stays true against this file, deliberately.


-- ---------------------------------------------------------------------------------------------
-- Policies. There are none, and on one of the three that is PERMANENT rather than pending.
-- ---------------------------------------------------------------------------------------------
--
-- app.billing_webhook_receipts holds §8.3's "Raw token/webhook SELECT", which is the `S` cell
-- RFC-2026-022 §3's table classifies DISCOVERED by name. §5/5 of that decision is quoted rather than
-- summarised: such a cell gets "no policy for the service role, PERMANENTLY", and the operation is
-- performed through a `SECURITY DEFINER` broker owned by a role that is not a path, so "the service
-- role keeps its grants and no policy, and a service refusal remains attributable to row level
-- security". §5/8 records that the decision is NOT IN EFFECT until a service identity exists, which
-- is why this batch writes the map row and no policy. The classification is in
-- db/foundation/lint/service-policy-map.json, where the lint reads it in both directions.
--
-- THE CONSEQUENCE FOR THIS BATCH'S OWN CASES IS STATED SO THE NEXT READER DOES NOT "FIX" THEM.
-- RFC-2026-022 §8 says it about batch 050 and it is true here: `service-sees-zero-billing-webhook-
-- receipts` is a PERMANENT assertion and not a pending one. No policy will ever admit `app_worker` to
-- this table. What will flip instead is a NEW PAIR — a broker claim succeeds while the direct
-- statement still returns zero — and a reader who takes the present case as pending will eventually
-- "fix" it by writing the unscoped service policy RFC-2026-022 §4 option B rejects.
--
-- app.billing_invoices AND app.billing_payments HAVE NO §8 ROW AT ALL, in any of the four matrices,
-- so there is no cell to implement and every operation on them is denied by default — 030's reading
-- of the same silence, kept by 050 and 060. Their client read is an RFC-2026-021 allowlist candidate,
-- named in the header with the criterion it fails, and RFC-2026-012 §3 gives that act to an RFC and
-- takes it away from a pull request.
--
-- All three tables are therefore FORCE ROW LEVEL SECURITY with an EMPTY POLICY SET, which denies
-- every non-bypassing role including the one holding the grants. 010's static suite requires a forced
-- table's policy set to be a decision in the file rather than an omission a reader infers; this
-- paragraph is that decision, and tests/db/identity/identity-isolation.test.mjs holds it to it in both
-- directions.
--
-- NO WORKSPACE GUC IS NAMED ANYWHERE IN THIS FILE, and that is asserted statically rather than left
-- to inspection. RFC-2026-022 §5/2 fixes the one spelling a CARRIED policy may use; this batch has no
-- CARRIED cell, so writing the expression here would be putting a confinement term in a file that has
-- nothing to confine — and §5/4 forbids any artefact describing that term as a tenant boundary, which
-- a comment in a batch with no policy would inevitably be read as doing.


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004, 011, 020, 021, 030, 040, 050, 060, 130 and 140 use: a claim that is only a
-- comment is a claim nobody checks. These are the properties of THIS batch answerable from the
-- catalog of the database being migrated, without a committed snapshot and without a test harness.
-- The text half lives in tests/db/identity/identity-isolation.test.mjs and the live behavioural half
-- is `make db-rls-smoke`.
--
-- NOTHING BELOW ASSERTS A PROPERTY AN APPROVED DECISION OR AN ALREADY-NAMED BATCH IS EXPECTED TO
-- CHANGE, which is 030's rule and 021's scar: 011's apply-time policy count is an APPLIED migration's
-- self-assertion that 021 had to route around rather than amend. So these are asserted in the STATIC
-- suite instead, each with the thing that would change it named:
--
--   * THE ABSENCE OF A CLIENT GRANT ON app.billing_invoices. RFC-2026-021's allowlist exists in order
--     to grow, and an entry's object 2 is a column-scoped SELECT grant to `authenticated`.
--   * THE ABSENCE OF ANY POLICY ON THE THREE TABLES. Object 4 of that same entry is a SELECT policy
--     on the base table. Note that this is NOT true of app_worker on the receipt table, which §5/5 of
--     RFC-2026-022 forbids permanently — but a text rule cannot tell the two absences apart, so both
--     live in the static suite where the sentence can say which is which.
--
-- WHAT IS ASSERTED HERE IS WHAT NO APPROVED DECISION IS EXPECTED TO MOVE: ENABLE and FORCE; the
-- exhaustive column list of the webhook receipt; the per-column immutability of the receipt and of
-- the invoice's identity columns; the append-only shape of the payment ledger, both as grants and as
-- policies; the money types; the absence of a payment-instrument column shape; `anon`; the composite
-- keys; and the ownership rules.
--
-- THE CARD-COLUMN RULE IS SCOPED TO THIS BATCH'S OWN THREE TABLES AND NOT TO SCHEMA `app`, which is
-- batch 130's reasoning and its reason: §14.1 permits `brand/last4/expiry` after a privacy review, so
-- a rule over the whole schema would make this applied migration's self-assertion false the day such a
-- review approves a column somewhere else. Scoped here it says what it means — no table batch 131
-- creates carries a payment instrument, now or after any later batch alters one.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only by a
-- superuser, and a migration that needs one to apply is a migration that cannot be applied on the
-- platform it targets, where `postgres` is not a superuser.
do $$
declare
  offending text;
  count_of  integer;
begin
  -- ENABLE and FORCE on all three. The two are different catalog columns and the data package's own
  -- lint rule reads only the first (RFC-2026-016). On a table with no policy, FORCE is the whole
  -- control: without it the table owner reads every row.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('billing_webhook_receipts', 'billing_invoices', 'billing_payments')
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'Batch 131 writes no policy at all, so FORCE is the only thing that refuses the '
                   'table owner. Without it the isolation suite cannot tell a working schema from one '
                   'where every row is readable by whoever owns the table.';
  end if;

  -- THE ASSERTION THIS BATCH OWES MOST, AND IT IS 060's MECHANISM RATHER THAN A NEW ONE. §3.1 puts a
  -- RAW WEBHOOK in `private` and §14's gate checklist requires it not to be exposed. This table is in
  -- `app` on the argument that it holds a RECEIPT and not a payload, and that argument is worth
  -- exactly as much as the control that keeps it true. §8.3's own minimum field list is the
  -- allowlist; anything outside it plus §3.2/§3.3's conventions is either a payload, a signature, a
  -- header, or a field nobody classified.
  --
  -- Written as an ALLOWLIST rather than as a list of forbidden names, for 060's reason: a denylist of
  -- column names somebody thought of is defeated by the one they did not.
  select string_agg(a.attname, ', ' order by a.attnum) into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'billing_webhook_receipts'
     and a.attnum > 0 and not a.attisdropped
     -- The cast is written out rather than left to operator resolution, because a comparison that
     -- depends on an implicit cast is a comparison that changes meaning when somebody adds an
     -- operator (060's note, and the same NEVER rule).
     and a.attname::text <> all (array['id', 'provider', 'livemode', 'provider_event_hash',
                                       'payload_hash', 'provider_event_type', 'provider_created_at',
                                       'received_at', 'correlation_workspace_id', 'attempt_count',
                                       'next_attempt_at', 'processed_at', 'dead_lettered_at',
                                       'last_error_code', 'created_at', 'updated_at']);
  if offending is not null then
    raise exception 'app.billing_webhook_receipts carries column(s) a receipt may not hold: %', offending
      using hint = '§8.1/7 forbids logging the header signature, the full payload, customer PII or a '
                   'secret, and a column is a stronger form of a log. §5.1''s alternative to a hash is '
                   'an "encrypted payload policy" that does not exist, and §10''s WEBHOOK-SHORT says to '
                   'purge the payload and retain the dedupe hash longer. This table is in `app` rather '
                   'than in `private` BECAUSE it holds no payload; a column outside this list makes '
                   'that argument false and the schema wrong.';
  end if;

  -- And the two columns that must be there, because an allowlist alone is satisfied by a table with
  -- no columns at all. The whole design is that the digests are what the database holds INSTEAD of
  -- the event id and the body.
  select count(*) into count_of
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'billing_webhook_receipts'
     and a.attnum > 0 and not a.attisdropped
     and a.attname in ('provider_event_hash', 'payload_hash');
  if count_of <> 2 then
    raise exception 'app.billing_webhook_receipts is missing a digest column and holds % of the two', count_of;
  end if;

  -- NO PAYMENT INSTRUMENT BY ANOTHER NAME, on the three tables this batch creates. §9.2 and
  -- BILL-DEC-003 forbid the DATA; this refuses the column SHAPES it arrives in, because a column
  -- named for a card is the column somebody eventually writes a card into and RFC-2026-008 records
  -- that a PAN reaching `main` is a disclosure this repository cannot undo.
  --
  -- The list is batch 130's plus the names a PAYMENT table attracts that a subscription table does
  -- not: a payment-method handle, a token, a mandate, a bank account. "payment refs" is a reference
  -- to a payment EVENT, and every name below belongs to a payment INSTRUMENT.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('billing_webhook_receipts', 'billing_invoices', 'billing_payments')
     and a.attnum > 0 and not a.attisdropped
     and (a.attname ~ '(^|_)(pan|cvv|cvc|card|last4|iin|bin|brand|mandate)($|_)'
          or a.attname ~ '(card_number|cardholder|exp_month|exp_year|security_code)'
          or a.attname ~ '(payment_method|payment_token|bank_account|account_number|routing)');
  if offending is not null then
    raise exception 'a table batch 131 creates carries a payment-instrument column: %', offending
      using hint = '§5''s inventory says "payment REFS", and a reference to a payment event is not a '
                   'handle on a payment instrument. §9.2 forbids a card PAN, a CVV and a '
                   'provider-managed payment credential; BILL-DEC-003 marks the same rule MANDATORY; '
                   '§14.1 permits brand/last4/expiry only after a privacy review that has not '
                   'happened. Batch 060 settled the same argument for a credential: the control is '
                   'that the value has no column to be in.';
  end if;

  -- THE PAYMENT LEDGER IS APPEND-ONLY, as the privilege system holds it. Asserted against the live
  -- ACLs rather than against the text of the grants above, because a grant made by a LATER batch
  -- would not appear in this file at all. `has_any_column_privilege` for UPDATE so a column-scoped
  -- grant is caught as well as a table-wide one; DELETE has no column-level form.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'billing_payments'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance',
                           'app_authz')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'a billing payment can be updated or deleted: %', offending
      using hint = 'A payment record is the record that money moved. A correction is another movement '
                   '— §12.1 ends "อัปเดต ledger projection", and the ledger-correct form of that is a '
                   'row with direction `refund`. §12.1 also forbids Support editing the database to '
                   '"แก้เร็ว", and the absence of the verb is what refuses that person.';
  end if;

  -- And the same claim as the policy catalog holds it. Both halves, because either alone can be
  -- satisfied while the other is wrong: a policy with no grant is inert, and a grant with no policy
  -- is denied by RLS instead of by privilege, which is a weaker refusal than immutability asks for.
  -- INSERT is deliberately absent from the list: appending is how a ledger changes.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'billing_payments'
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'app.billing_payments carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- THE RECEIPT'S IMMUTABLE HALF, PER COLUMN, AGAINST THE LIVE ACL. The grant above names seven
  -- columns and this is what says so about the other nine: a role that could rewrite `provider`,
  -- `livemode`, `provider_event_hash`, `payload_hash`, `provider_event_type` or `provider_created_at`
  -- could re-aim a signed provider statement after the fact — which is §5.1's "immutable receipt
  -- metadata" and §14.3's "Event order corruption" row, and is 050's assertion about the outbox
  -- envelope on a table where the envelope came from outside.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, a.attname as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        join pg_catalog.pg_attribute a on a.attrelid = c.oid
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'billing_webhook_receipts'
         and a.attnum > 0 and not a.attisdropped
         and a.attname <> all (array['correlation_workspace_id', 'attempt_count', 'next_attempt_at',
                                     'processed_at', 'dead_lettered_at', 'last_error_code',
                                     'updated_at'])
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance',
                           'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, a.attname, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a column of the webhook receipt outside the processing set is updatable: %', offending
      using hint = '§5.1: "unique event ID; immutable receipt metadata". What the provider said is '
                   'fixed at insert; what we did about it is the seven-column processing set. A role '
                   'that could edit the first half could make a redelivery look like a new event.';
  end if;

  -- §8.5 AND §5.2, PER COLUMN, ON THE INVOICE: a row may not be re-identified, moved between tenants
  -- or moved between MODES by an update. The tenant half is §8.5's "ห้ามย้าย row ข้าม tenant ด้วย
  -- update"; the mode half is §5.2's "ห้าม map ข้าม mode", which §13.1 calls a critical incident.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'billing_subscription_id', 'provider',
                                'livemode', 'provider_invoice_hash']) as col
       where n.nspname = 'app'
         and c.relname = 'billing_invoices'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance',
                           'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity, scope or mode column of app.billing_invoices is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant with an update and §5.2 forbids mapping '
                   'across modes. app_worker is IN the checked list here — as it is in batch 050''s '
                   'equivalent and unlike 030''s and 040''s — because every grant this batch makes to '
                   'it is column-scoped.';
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE THREE. §8.5 has no broad user delete; every purge in this
  -- family is a retention sweep with its own class (WEBHOOK-SHORT, FINANCE-HISTORY) and batch 160
  -- owns it through app_maintenance, which this batch grants nothing.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname in ('billing_webhook_receipts', 'billing_invoices', 'billing_payments')
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance',
                           'app_authz')
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a billing projection row can be deleted through a granted path: %', offending
      using hint = '§8.5 requires a soft delete through a typed lifecycle field where a delete is '
                   'wanted at all, and hard deletion here is a retention sweep with its own class and '
                   'its own batch.';
  end if;

  -- MONEY IS numeric(18,6) AND NEVER A FLOAT (§3.2), asked of the live catalog rather than of the
  -- CREATE TABLE text above. Both halves: the two amount columns' declared types, and the absence of
  -- any inexact or locale-dependent numeric type on any column of any table this batch creates.
  -- `money` is in the list because Postgres has a type by that name whose output depends on a session
  -- GUC, which is the worst pair of properties for a figure somebody is charged.
  select string_agg(format('%s.%s is %s', c.relname, a.attname,
                           pg_catalog.format_type(a.atttypid, a.atttypmod)), ', ')
    into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and ((c.relname = 'billing_invoices' and a.attname = 'amount_due')
          or (c.relname = 'billing_payments' and a.attname = 'amount'))
     and pg_catalog.format_type(a.atttypid, a.atttypmod) <> 'numeric(18,6)';
  if offending is not null then
    raise exception 'a billing amount is not numeric(18,6) and §3.2 fixes money as that: %', offending;
  end if;

  select string_agg(format('%s.%s is %s', c.relname, a.attname,
                           pg_catalog.format_type(a.atttypid, a.atttypmod)), ', ')
    into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_type t on t.oid = a.atttypid
   where n.nspname = 'app'
     and c.relname in ('billing_webhook_receipts', 'billing_invoices', 'billing_payments')
     and a.attnum > 0 and not a.attisdropped
     and t.typname in ('float4', 'float8', 'money');
  if offending is not null then
    raise exception 'a billing column carries an inexact or locale-dependent numeric type: %', offending
      using hint = '§3.2: "เงิน: numeric(18,6) + ISO-4217 currency; ห้าม float".';
  end if;

  -- THE COMPOSITE KEYS, READ FROM THE CATALOG AS COLUMN SETS RATHER THAN AS CONSTRAINT NAMES.
  --
  -- This is the assertion the batch owes second most, and it is about `workspace_id` and `livemode`
  -- being IN a key rather than beside one. §4 invariant 10 requires unrelated UUIDs to FAIL AT THE DB,
  -- and §5.2 forbids mapping across modes. Both would pass every other check in this repository if
  -- the constraint were single-column: it would still exist, still be a foreign key, and still point
  -- at a real row — of the wrong tenant, or of the wrong mode.
  --
  -- Read as SETS so a reordering does not fail and a dropped column does. Dull on purpose: this block
  -- runs on every apply, and a clever query that fails to PARSE fails the migration rather than the
  -- rule it was checking (050's sentence).
  select string_agg(format('%s(%s)', target, cols), '; ') into offending
    from (
      select c.relname as target,
             (select string_agg(a.attname, ',' order by a.attname)
                from pg_catalog.pg_attribute a
               where a.attrelid = c.oid and a.attnum = any (con.conkey)) as cols
        from pg_catalog.pg_constraint con
        join pg_catalog.pg_class c on c.oid = con.conrelid
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'app' and con.contype = 'f'
         and c.relname in ('billing_invoices', 'billing_payments')
    ) as keys
   where not (
     (target = 'billing_invoices' and cols in ('billing_subscription_id,workspace_id'))
     or (target = 'billing_payments' and cols in ('billing_invoice_id,workspace_id',
                                                  'billing_invoice_id,livemode'))
   );
  if offending is not null then
    raise exception 'a foreign key in the billing projection is not one batch 131 declares: %', offending
      using hint = 'app.billing_invoices must reach app.billing_subscriptions over (workspace_id, id) '
                   'and app.billing_payments must reach app.billing_invoices over BOTH (workspace_id, '
                   'id) and (id, livemode). The first pair is §3.3 and §4 invariant 10; the second is '
                   '§5.2 and §13.1''s LIVEMODE_MISMATCH, refused by a constraint rather than reported '
                   'by a reconciliation job.';
  end if;

  -- The forward fix actually landed. The composite foreign key above cannot be created without it, so
  -- this is belt and braces — and it is here because the constraint lives on a table this file does
  -- not create, which is the one place a reader cannot check the pairing by eye.
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'billing_subscriptions'
     and con.conname = 'billing_subscriptions_workspace_key' and con.contype = 'u';
  if count_of <> 1 then
    raise exception 'batch 131''s forward fix on app.billing_subscriptions is not present'
      using hint = 'A partial unique index cannot be a foreign key target, so batch 130''s '
                   'one-live-per-workspace index cannot serve. Migration invariant 1 requires a '
                   'forward fix rather than an edit to 130.';
  end if;

  -- NO POLICY ON A TABLE THIS BATCH CREATES MAY NAME `anon`, EVER. RFC-2026-021 §7/4 decides that
  -- anon holds nothing anywhere our migrations reach and gives the structural reason: the first anon
  -- grant is `usage on schema app`, which moves the denial layer of every object in app at once.
  --
  -- THE SERVICE ROLES ARE DELIBERATELY NOT IN THIS LIST even though RFC-2026-022 §5/5 forbids a
  -- service policy on app.billing_webhook_receipts permanently. The reason is §7.1/5 of that RFC: the
  -- rule belongs to the lint that reads service-policy-map.json in both directions, where it holds for
  -- every DISCOVERED cell in the schema, and duplicating it here would put a second home under a
  -- number this file cannot see. The other two tables have no §8 row at all, so an apply-time rule
  -- refusing a service policy there would be the 011 trap one table over.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('billing_webhook_receipts', 'billing_invoices', 'billing_payments')
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles) and r.rolname = 'anon');
  if offending is not null then
    raise exception 'batch 131 wrote a policy naming anon: %', offending
      using hint = 'RFC-2026-021 §7/4: anon is granted nothing — no schema USAGE, no table or column '
                   'privilege, no function EXECUTE — anywhere our migrations reach.';
  end if;

  -- No client role holds ANY privilege on any table this batch creates, asked of the live ACL. This is
  -- the half of "these tables are not exposed" that a schema prefix cannot make true: §14's gate
  -- checklist is about reachability, and batch 050 read it the same way about app.jobs.
  select string_agg(format('%s on %s', grantee, target), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname in ('billing_webhook_receipts', 'billing_invoices', 'billing_payments')
         and r.rolname in ('authenticated', 'anon')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'SELECT')
              or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
              or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'a client role holds a privilege on a batch 131 table: %', offending
      using hint = 'RFC-2026-012 §2/3 puts a client read behind a named security_invoker view on an '
                   'allowlist RFC-2026-021 keeps empty, and RFC-2026-021 §8.5 requires the list of '
                   'inherited base-table grants to be CLOSED. §8.3 marks "Raw token/webhook SELECT" N '
                   'for every client role, and §8 has no row for an invoice or a payment at all.';
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 131 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised. The
  -- POLICY COUNT is deliberately not re-asserted: 021 owns that assertion on the far side of the batch
  -- that could have moved it, and repeating it would be a second home for a number.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('billing_webhook_receipts', 'billing_invoices', 'billing_payments')
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020, 021, 030, 040, 050,
  -- 060, 130 and 140 ask them: scripts/db/run.mjs holds every tenant table to the ownership rule
  -- against the COMMITTED SNAPSHOT, and this batch is deliberately not applied to the instance that
  -- snapshot describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('billing_webhook_receipts', 'billing_invoices', 'billing_payments')
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 131 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all. On a table with an '
                   'empty policy set that exemption is the difference between reading nothing and '
                   'reading everything.';
  end if;
end $$;
