-- Tenant AND PRIVATE fixture for the batch 110 isolation cases.
--
-- Owner: A6 Meta Connector. It loads AFTER 010-identity-fixture.sql; a connection cannot exist
-- without the Workspace it belongs to, and everything else here hangs off the connection.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
-- THREE OF THE FOUR TABLES HOLD ROWS THAT ONLY REFUSALS ARE ABOUT, WHICH IS WHY THE ROWS EXIST.
-- Batch 110 writes no policy, so every case against it is a refusal, and a refusal at name
-- resolution passes whether or not the table has a row in it — the shape this repository refuses
-- elsewhere as "a negative satisfied by an empty table". So each side of the tenant boundary
-- carries a real connection, a real discovered account, a real credential reference and a real
-- delivery, and every identity in the suite is refused a table that HAS content in it, for a
-- workspace they are a member of, holding that workspace's exact id.
--
-- NOTHING HERE IS A TOKEN, AND THE VALUES ARE WRITTEN SO A REVIEWER CAN SEE THAT AT A GLANCE.
-- §9.2's absolute prohibitions forbid a plaintext OAuth access or refresh token in a FIXTURE as
-- firmly as in a table, and 110_meta_connector.sql's own apply-time block refuses any column that
-- could hold one. Both references below are readable synthetic LOCATORS rather than random-looking
-- strings, which is batch 060's rule and its reason: a handle that looked like a secret would be a
-- fixture nobody could distinguish from the thing this batch exists to keep out of the database.
--
-- THE TWO HASHES ARE DERIVED FROM THEIR OWN SYMBOLS rather than pasted as hex, which is batch 030's
-- rule for a checksum column: a constant nobody can recompute is a constant nobody can verify.
-- `sha256(convert_to(...))` comes from pg_catalog rather than pgcrypto's digest(), for the reason
-- the 010 fixture records — `public.digest` does not exist on the provisioned instance, where
-- pgcrypto lives in `extensions` — and the two produce the same bytes.
--
-- THE SAME EXTERNAL ACCOUNT HASH IS LOADED ON BOTH SIDES, ON PURPOSE. app.social_accounts is unique
-- on (workspace_id, external_account_hash) rather than on the hash alone, and a fixture that used
-- two different hashes could not tell that constraint from the global one: both would accept both
-- rows. With one hash and two workspaces, a key that lost `workspace_id` would fail to LOAD, which
-- is the loudest place for it to fail.
--
-- WHAT EACH ROW IS FOR, so a later reader does not have to infer it from the cases:
--
--   meta_connection_a / _b   one connection per Workspace. Both owners are refused their own, at
--                            the same layer, with the same message, which is this batch's
--                            substitute for a cross-tenant claim it cannot make — no client
--                            identity may read the table at all.
--   two social accounts      one `fb` under each connection, sharing an external account hash.
--   two credential refs      in `private`, one per connection, so the refusals on the SECRET-4
--                            table are about a table with content.
--   two inbox deliveries     one RESOLVED to workspace_a and one UNRESOLVED, and the pair is the
--                            point: §5 scopes this row "private workspace" and RFC-2026-022 §3
--                            classifies the statement that reads it as DISCOVERED, so
--                            `workspace_id` is nullable and BOTH STATES ARE REAL. A fixture with
--                            only resolved rows would let a later NOT NULL land green.
--
-- This file loads ADMINISTRATIVELY, as the table owner, before any identity is assumed. On this
-- batch that is not a choice between two paths: all four tables are FORCE ROW LEVEL SECURITY with
-- an EMPTY POLICY SET, so there is no policy any of these rows could have been loaded through. Only
-- a BYPASSRLS role can write them, which is what the connection role is and what every identity in
-- the suite deliberately is not.
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- One Meta connection per Workspace. `created_by`/`updated_by` are the WORKSPACE OWNER on each
-- side: §8.3 marks "Connect/disconnect/re-auth Meta" `Y` for the owner, so the owner is who a
-- command function would record if one existed. Neither row is revoked — §11.4 step 2's revocation
-- has no granted path, and a fixture that pre-revoked one would be asserting a lifecycle nothing
-- can reach.
insert into app.meta_connections (id, workspace_id, display_name, created_by, updated_by) values
  ('d01a6cd3-0bf0-5d97-a627-7bfcf620687d', 'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'fixture meta connection a',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('d83a993a-1cec-598f-9a8d-c1b2566c5bdb', '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   'fixture meta connection b',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (id) do nothing;

-- One discovered account under each connection, both `fb`. No id is supplied and no symbol exists
-- for either: a social account is addressed by (workspace_id, external_account_hash), which
-- 110_meta_connector.sql makes unique and which is spelled out of ids this catalog already fixes
-- plus text this file and the case file share — exactly as a version row, a member scope, an
-- industry assignment and a billing subscription are addressed.
--
-- No created_by/updated_by: §4's ERD verb is "discovers", which is the service's act rather than a
-- member's, and §3.2 attaches the actor columns to a user mutation. The columns do not exist.
insert into app.social_accounts
  (workspace_id, meta_connection_id, account_kind, display_name, external_account_hash) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'd01a6cd3-0bf0-5d97-a627-7bfcf620687d',
   'fb', 'fixture social account a', sha256(convert_to('social_account_a1', 'utf8'))),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', 'd83a993a-1cec-598f-9a8d-c1b2566c5bdb',
   'fb', 'fixture social account b', sha256(convert_to('social_account_a1', 'utf8')))
on conflict (workspace_id, external_account_hash) do nothing;

-- The credential REFERENCES, in `private`, where §3.1 puts secret references by name.
--
-- `created_at` and `expires_at` are FIXED timestamptz values rather than now() and now() + interval,
-- for the reason batch 030's fixture fixes released_at and 060's fixes the same two columns: a
-- fixture whose content depends on when it ran is a fixture whose failures depend on when they ran,
-- and fixing both makes meta_credential_references_expiry_after_creation hold for every run rather
-- than until the day the interval elapses.
--
-- `fingerprint` is eight characters and looks like a mask, which is what §9.2's "last-four-like
-- identifier" describes and what the sixteen-character ceiling enforces. `rotated_at` and
-- `revoked_at` are null: neither reference has been rotated or revoked, and there is no granted path
-- that could do either, which is the state the migration header records as owed to the command
-- surface.
insert into private.meta_credential_references
  (workspace_id, meta_connection_id, credential_reference, fingerprint,
   created_at, expires_at, created_by, updated_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'd01a6cd3-0bf0-5d97-a627-7bfcf620687d',
   'vault://fixture/workspace-a/meta', '****a1b2',
   timestamptz '2026-06-01 00:00:00+00', timestamptz '2027-06-01 00:00:00+00',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', 'd83a993a-1cec-598f-9a8d-c1b2566c5bdb',
   'vault://fixture/workspace-b/meta', '****c3d4',
   timestamptz '2026-06-01 00:00:00+00', timestamptz '2027-06-01 00:00:00+00',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (credential_reference) do nothing;

-- Two raw deliveries, and the pair is the fixture's one substantive claim about §5's phrase.
--
-- The first RESOLVED to workspace_a and is stamped processed. The second is UNRESOLVED — its
-- workspace_id is NULL — which is the state a delivery is in when it arrives and the state it stays
-- in when its account matches nothing. §5 scopes this row "private workspace" and RFC-2026-022 §3
-- classifies "Raw token/webhook SELECT" as DISCOVERED, so the scope column is nullable by design;
-- a fixture carrying only resolved rows would let a later batch add NOT NULL and see a green suite.
--
-- `body_ref` is a LOCATOR under the `webhook:` scheme the migration's CHECK fixes. There is no body
-- here and there is no column for one: §5's word ban forbids a payload column with no JSON Schema,
-- and §5 puts SECRET-4 on this row because a provider body can carry a token.
--
-- No id is supplied — the column is `generated always as identity`, so supplying one is not merely
-- unnecessary, it is refused — and no symbol exists for either row: a delivery is addressed by its
-- delivery_hash, which the migration makes unique.
insert into private.meta_webhook_inbox
  (workspace_id, delivery_hash, body_ref, received_at, processed_at) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   sha256(convert_to('meta_webhook_delivery_a1', 'utf8')),
   'webhook:fixture/delivery-a1',
   timestamptz '2026-06-01 00:00:00+00', timestamptz '2026-06-01 00:00:05+00'),
  (null,
   sha256(convert_to('meta_webhook_delivery_unresolved', 'utf8')),
   'webhook:fixture/delivery-unresolved',
   timestamptz '2026-06-01 00:00:00+00', null)
on conflict (delivery_hash) do nothing;

commit;
