-- Tenant fixture for the batch 051 isolation cases.
--
-- Owner: A5 Notification. It loads LAST, after 010, 020, 021, 030, 040, 050, 060, 130 and 140.
--
-- THE POSITION IS A DEPENDENCY HERE, unlike batch 140's, and saying which is which keeps the list
-- honest about what it is. app.notifications and app.notification_preferences both carry
-- `workspace_id uuid not null references app.workspaces (id)`, and so does
-- private.push_subscription_references, so all three rows need 010's workspaces to exist. Nothing
-- below names a Business, a Page, a knowledge item, a job, a model or an audit record, so the
-- position only has to be after the first entry; it is last because the list is an ORDER and a new
-- batch joins its end.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
--
-- WHAT THESE ROWS ARE FOR, WHICH IS TWO DIFFERENT THINGS ON TWO DIFFERENT TABLES
--
-- On app.notifications they are what a POSITIVE reads. §8.4's client cell IS implementable here, so
-- unlike the 050, 060 and 140 fixtures — every row of which exists so that a refusal is about
-- something rather than about an empty table — half of these rows exist so that
-- `owner-a-sees-their-own-notification` returns a row and the negatives beside it mean something.
--
-- THE FOUR NOTIFICATION ROWS ARE NOT INTERCHANGEABLE AND EACH CARRIES EXACTLY ONE CONTROL:
--
--   notification_owner_a      workspace_a, addressed to user_owner_a. THE POSITIVE. read_at is null
--                             so `owner-a-can-mark-their-own-notification-read` has an unread row to
--                             change and its witness has a value to observe.
--   notification_editor_a     workspace_a, addressed to user_editor_a. THE USER HALF of batch 051's
--                             two-term policy. user_owner_a is an ACTIVE OWNER of the same workspace
--                             and holds this row's exact id; every earlier table in this schema
--                             would have shown it to them, because every earlier table is scoped by
--                             workspace alone. If `user_id = (select auth.uid())` is ever dropped
--                             from the predicate, `owner-a-cannot-see-the-notification-of-editor-a`
--                             fails and nothing else in the suite would.
--   notification_suspended_a  workspace_a, addressed to user_suspended_a. THE MEMBERSHIP HALF.
--                             §12.6/5 requires a suspended member to see zero TENANT rows, and this
--                             row is what makes that assertion bite: against a table with nothing
--                             addressed to them, `suspended-a-sees-zero-notifications` passes
--                             whether or not `app.is_active_member(workspace_id)` is in the
--                             predicate.
--   notification_owner_b      workspace_b, addressed to user_owner_b. THE TENANT BOUNDARY, in both
--                             directions: every A-side identity attacks it while holding its exact
--                             id, and `owner-b-sees-their-own-notification` is what stops that
--                             negative being satisfied by a row that never loaded.
--
-- AND ALL FOUR OF CTR-NTF-001's DELIVERY STATES ARE LOADED ACROSS THOSE FOUR ROWS, which is the
-- second job a fixture does: a fixture whose rows all take the same branch of every CHECK leaves the
-- other branch permitted and never satisfied (040's rule, 140's words).
--
--   notification_owner_a      `delivered`, NO failure_class    — allOf[3], the rule independent
--                                                                testing of the contract added after
--                                                                finding `delivered` + `permanent`
--                                                                accepted.
--   notification_editor_a     `failed`, WITH a failure_class   — allOf[2], which CT-007 requires so
--                                                                transient and permanent failure are
--                                                                distinguishable.
--   notification_suspended_a  `queued`                         — the initial state, unconstrained by
--                                                                either rule.
--   notification_owner_b      `suppressed_duplicate`           — ID-005's state, which the contract's
--                                                                own x-source says exists because "a
--                                                                suppression that is invisible in the
--                                                                result cannot be audited". Also
--                                                                unconstrained by both rules, which
--                                                                is why loading it matters: the two
--                                                                constraints are NOT a biconditional
--                                                                and a fixture that only ever loaded
--                                                                `delivered` and `failed` could not
--                                                                tell the two shapes apart.
--
-- On app.notification_preferences and private.push_subscription_references the rows are the OTHER
-- kind, and they exist for the reason 140's four rows do: `service-sees-zero-notification-preferences`
-- must be about a POPULATED table, or "the service sees nothing" is satisfied by there being nothing
-- to see — and that case is the ONE case the CI negative control for app.notification_preferences
-- rests on, so against an empty table the control would report a pass it did not earn.
--
--
-- THE PUSH SUBSCRIPTION ROW CARRIES NO CREDENTIAL, AND THAT IS THE POINT OF THE TABLE
--
-- §9.1 lists "push token" as an example of SECRET-4 and gives that class "vault/encrypted secret
-- store; never plaintext DB/log". A Web Push subscription is an ENDPOINT — a bearer capability URL —
-- plus the p256dh and auth KEYS, and none of the three has a column in
-- private.push_subscription_references: 051_notification.sql's apply-time block holds that table to
-- §9.2's permitted column list and refuses any column outside it. What is written below is a
-- synthetic `vault://` LOCATOR, which is 060's shape for its credential reference, and a `****`
-- fingerprint that fits the sixteen-character ceiling §9.2's "last-four-like identifier" implies.
--
-- The repository's secret scan runs over this file on every `npm run check`, and it could not save
-- us here: a push endpoint is an ordinary https URL at a vendor host and no scanner can tell one from
-- a link. The control is that the endpoint has no column to be in.
--
-- ONE ROW, IN WORKSPACE A ONLY. Every case on that table is refused at the SCHEMA, identically, for
-- every identity — so a second row would add a constant and no assertion, which is 060's fixture's
-- own reason for loading one.
--
-- EVERY TIMESTAMP IS FIXED, never now(). Batch 030's fixture established the rule about `released_at`
-- and 040's, 060's and 140's repeated it: a fixture whose content depends on when it ran is one whose
-- failures depend on when they ran. Fixing `created_at` and `expires_at` also makes
-- `push_subscription_references_expiry_after_creation` hold on every run rather than until the day an
-- interval elapses.
--
-- This file loads ADMINISTRATIVELY, as the table owner, before any identity is assumed. On
-- app.notifications that is a convention — the table has client policies, but §8.4 marks the INSERT
-- `N` for every client role, so there is no identity these rows could be loaded through. On the other
-- two it is the only way: neither carries an INSERT policy for anybody.
--
-- Idempotent, so a suite can be re-run without a reset: `on conflict (id)` on the notifications,
-- which have a symbol; `on conflict (workspace_id, user_id, channel)` on the preferences and
-- `on conflict (credential_reference)` on the subscription, which are those tables' natural keys and
-- the reason neither needs one.

begin;

-- The inbox. Four rows, four recipients across two tenants, four delivery states.
--
-- `deep_link_requires_permission` is true on every row because CTR-NTF-001 makes it `const: true`
-- and 051_notification.sql makes the column NOT NULL with a CHECK — the contract's own x-source
-- records that the const alone failed open silently on an absent property, and independent testing
-- of that contract found it.
--
-- `dedupe_key` differs per row. It is unique on (workspace_id, user_id, dedupe_key) and NOT per
-- channel, which is ID-005's reading — "a completed or retried event must not notify a USER twice"
-- — and 051's own recorded choice; the four keys here are distinct in all three columns, so nothing
-- below can be satisfied by a unique constraint firing before a policy does.
insert into app.notifications
  (id, workspace_id, user_id, channel, message_key, dedupe_key,
   deep_link_target_ref, deep_link_requires_permission,
   delivery_state, delivery_failure_class, read_at, created_at) values
  -- THE POSITIVE. Delivered, unread, addressed to the owner of workspace A.
  ('79147567-98e6-566d-87d5-63af8db53e0b',
   'c4840acc-0323-5e13-b1d3-c18d7eb615cb', '5c460eb8-0710-557a-b423-f9b12c76834f',
   'in_app', 'notification.content.approval_requested', 'fixture-dedupe-owner-a',
   'content:fixture/approval_requested', true,
   'delivered', null, null, timestamptz '2026-07-01 09:00:00+00'),
  -- THE USER HALF. Same workspace, same active-membership status, DIFFERENT RECIPIENT. `failed`
  -- with a `transient` class, which is CTR-NTF-001 allOf[2]'s branch.
  ('73c61e4c-2ca2-5905-bc8f-fc6822a0666a',
   'c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'a324d4a6-15a3-5e15-9193-eed9d50b5d91',
   'email', 'notification.content.changes_requested', 'fixture-dedupe-editor-a',
   'content:fixture/changes_requested', true,
   'failed', 'transient', null, timestamptz '2026-07-01 10:00:00+00'),
  -- THE MEMBERSHIP HALF. Addressed to the SUSPENDED member of workspace A, on purpose: §12.6/5 asks
  -- for zero TENANT rows and a notification is one, so the assertion needs a row that would be
  -- visible if suspension were not checked.
  ('1a9ac233-2106-5d64-9ddf-c8b4d7f5b7ef',
   'c4840acc-0323-5e13-b1d3-c18d7eb615cb', '9b10ac91-406b-5322-9755-bfb16b0b4aa3',
   'in_app', 'notification.workspace.member_suspended', 'fixture-dedupe-suspended-a',
   'app:fixture/workspace_members', true,
   'queued', null, null, timestamptz '2026-07-01 11:00:00+00'),
  -- THE FAR SIDE. `suppressed_duplicate`, the fourth state, which ID-005 requires be visible in a
  -- result rather than silent.
  ('321c1060-9a2b-5236-92ba-5010a4b1d9fa',
   '43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '297ad853-58a6-5e83-87e1-f936f9c3ddff',
   'line', 'notification.publish.target_failed', 'fixture-dedupe-owner-b',
   'job:fixture/publish_target', true,
   'suppressed_duplicate', null, null, timestamptz '2026-07-01 12:00:00+00')
on conflict (id) do nothing;

-- EVERY ONE OF THE FOUR CARRIES `read_at` NULL, AND THAT IS A DECISION RATHER THAN AN OVERSIGHT.
-- Two of the `no-effect` cases in this batch witness `read_at` back after a refused write, and a
-- witness asserts a VALUE — so the value it expects has to be one this file fixes. Null is the
-- value the write would have changed, which is what makes the witness bite: if a policy ever
-- admitted the row, the witness reads a timestamp and the case fails.
--
-- The non-null state of that column is exercised by `owner-a-can-mark-their-own-notification-read`,
-- which is the POSITIVE half of §8.4's "mark read" cell — and that is stronger evidence than a
-- fixture row would have been. A row loaded with a timestamp shows only that the column accepts
-- one; a case that sets it shows that the policy admits the write and that the column grant reaches
-- exactly one column.

-- The preferences. Two rows, one per tenant's owner, and BOTH BRANCHES of the one boolean this
-- table holds: `enabled` true on the A side and false on the B side, so a case cannot be satisfied
-- by a column that is the same value everywhere.
--
-- No symbol and no id column: (workspace_id, user_id, channel) IS the primary key, and every id in
-- that tuple is already fixed in the catalog. The channel values are two of CTR-NTF-001's three, so
-- the vocabulary is live rather than merely permitted by a CHECK.
insert into app.notification_preferences (workspace_id, user_id, channel, enabled) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '5c460eb8-0710-557a-b423-f9b12c76834f', 'in_app', true),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '297ad853-58a6-5e83-87e1-f936f9c3ddff', 'email', false)
on conflict (workspace_id, user_id, channel) do nothing;

-- The push subscription REFERENCE, in `private`, where §3.1 puts secret references by name.
--
-- `credential_reference` is a synthetic vault LOCATOR. The endpoint and the p256dh and auth keys the
-- locator resolves to are NOT in this database and have no column to be in — 051_notification.sql's
-- apply-time block holds this table to §9.2's permitted column list, so a batch that added
-- `endpoint text` would fail the migration rather than the code review.
--
-- `fingerprint` is eight characters and looks like a mask, which is what §9.2's "last-four-like
-- identifier" describes and what the sixteen-character ceiling enforces: a push endpoint is a URL
-- and a p256dh key is 65 bytes base64url-encoded, and neither fits.
--
-- `last_active_at` is set because §10's PUSH-SECRET retains a subscription for "active + 30 วัน
-- inactive" and a null would leave the column that window is measured over untested by any row.
-- `rotated_at` and `revoked_at` are null: this subscription has been neither rotated nor revoked,
-- and there is no granted path that could do either — which is the state 051's header records as
-- owed to §11.2's revocation, to §11.4 step 2 and to batch 160.
insert into private.push_subscription_references
  (workspace_id, user_id, provider, credential_reference, fingerprint,
   created_at, expires_at, last_active_at) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '5c460eb8-0710-557a-b423-f9b12c76834f',
   'fixture-push', 'vault://fixture/workspace-a/push-subscription', '****c3d4',
   timestamptz '2026-06-01 00:00:00+00', timestamptz '2027-06-01 00:00:00+00',
   timestamptz '2026-07-01 08:00:00+00')
on conflict (credential_reference) do nothing;

commit;
