-- Tenant fixture for the batch 140 isolation cases.
--
-- Owner: A1 Security/Audit. It loads LAST, after 010, 020, 021, 030 and 040. The ordering is not a
-- dependency here and that is worth saying rather than implying: batch 140's two tables carry NO
-- FOREIGN KEY — 140_audit.sql's header explains why at length, and §11.4's required order is the
-- reason — so these rows would load against an empty database. They are last because the list is an
-- ORDER and a new batch joins its end, and because the ids they carry are the ids the earlier
-- fixtures made real.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
-- WHAT THESE FOUR ROWS ARE FOR, WHICH IS NOT WHAT AN EARLIER FIXTURE'S ROWS ARE FOR
--
-- Every fixture before this one loads rows so that a POSITIVE case can read them and a NEGATIVE case
-- can fail to. There is no positive case on these two tables: batch 140 grants no client role
-- anything and writes no policy, so every request-path identity is refused and the only identity
-- that holds a grant — app_worker — is refused by row level security.
--
-- So these rows exist for two narrower reasons, and both matter:
--
--   1. `service-sees-zero-audit-logs` and `service-sees-zero-security-events` must be about a
--      POPULATED table, or "the service sees nothing" is satisfied by there being nothing to see.
--      Those two cases are what the CI negative control for each table rests on: they are the only
--      cases on these tables that row level security decides, so they are the ones that FAIL when it
--      is switched off, and against an empty table they would pass either way.
--   2. Two tenants, so the refusals can be asserted from BOTH sides. A row that belongs to no
--      workspace could not carry that; these do, and neither owner reaches either.
--
-- THE FOUR ROWS ALSO EXERCISE THE CONSTRAINTS THAT CARRY CTR-AUD-001's CROSS-FIELD RULES, which is
-- the second half of what a fixture is for. A fixture whose rows all take the same branch of every
-- CHECK leaves the other branch permitted and never satisfied:
--
--   audit_log_a1        outcome `succeeded`, NO error_code, category `role`.
--   audit_log_b1        outcome `denied`, WITH an error_code, category `delete` AND a
--                       change_before_ref — so it satisfies allOf[0] (a delete names what it
--                       deleted) and the other side of allOf[1]/allOf[2] (a non-succeeded outcome
--                       carries an error) in one row.
--   security_event_a1   NO actor at all. §9.1's own example of this family is a "replay anomaly",
--                       which is a pattern rather than somebody's act.
--   security_event_b1   an actor, so the both-or-neither constraint is exercised in both directions.
--
-- THE HASHES ARE COMPUTED, NEVER PASTED. §9.3 permits "keyed hash or truncated/redacted
-- representation" of an IP or a user agent and forbids the value; the columns are bytea of exactly
-- 32 bytes so a plaintext address does not fit the shape. `sha256()` from pg_catalog rather than
-- pgcrypto's `digest()`, for the reason the 010 fixture records: `public.digest` does not exist on
-- the provisioned instance, where pgcrypto lives in `extensions`. A pasted hex literal would also be
-- a constant nobody can recompute, which is the thing the fixture catalog exists to avoid.
--
-- EVERY TIMESTAMP IS FIXED, never now(). Batch 030's fixture established the rule about
-- `released_at` and 040's repeated it: a fixture whose content depends on when it ran is one whose
-- failures depend on when they ran.
--
-- This file loads ADMINISTRATIVELY, as the table owner, before any identity is assumed — and here
-- that is not a convention, it is the ONLY way. Batch 140 writes no INSERT policy for any role, so
-- there is no identity these rows could be loaded through. The migration's own apply-time probe
-- makes the same point from the other side: the migration role can write this table because it
-- bypasses row level security, and that is exactly why the batch also carries a trigger.
--
-- Idempotent, so a suite can be re-run without a reset. `on conflict (id)` on the PRIMARY key rather
-- than on a natural one, because an audit record has none: §4's ERD hangs AUDIT_LOG off WORKSPACE
-- with no ordinal, and inventing a unique constraint so the fixture could address a row without a
-- symbol would be writing a product decision into a schema to save four constants (040's sentence
-- about a knowledge item, unchanged).

begin;

-- The audit rows. Neither carries a foreign key to anything, so the workspace and business ids below
-- are values rather than references — which is the point of 140's design and is why an audit record
-- can outlive everything it names (§11.4 step 7 before step 8).
--
-- audit_log_a1's ACTOR IS user_editor_a, deliberately. §8.4 marks "Tenant audit SELECT" `O` for the
-- editor — own rows — so `editor-a-cannot-read-their-own-audit-log` is a case about the one cell in
-- the matrix where the reader IS the subject of the record. If the actor were anybody else, that
-- case would be indistinguishable from the viewer's `N`.
insert into app.audit_logs
  (id, workspace_id, business_profile_id, page_context_profile_id, occurred_at,
   actor_kind, actor_id, action_category, action_name, outcome, reason_key,
   request_id, correlation_id, causation_id, change_before_ref, change_after_ref, error_code,
   secret_redacted, content_redacted, pii_redacted, retention_policy_ref) values
  ('3a2d01be-c1c5-595c-a4c1-7bc7c44441ee',
   'c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', null,
   timestamptz '2026-07-01 09:00:00+00',
   'user', 'a324d4a6-15a3-5e15-9193-eed9d50b5d91',
   'role', 'identity.workspace_member.role_changed', 'succeeded', 'audit.fixture.role_changed',
   'fixture-request-a1', 'fixture-correlation-a1', null,
   -- A record REFERENCE and never a value: CTR-AUD-001's whole redaction argument is that "the audit
   -- record cannot leak state it does not hold". The reference resolves to nothing in this database
   -- and the contract's own note says so — "nothing checks that they resolve" — which is a producer
   -- obligation and batch 141's.
   null, 'record:workspace_member/a324d4a6-15a3-5e15-9193-eed9d50b5d91', null,
   true, true, true, 'retention.audit'),
  -- The other branch of every cross-field rule, on the far side of the tenant boundary: a DENIED
  -- DELETE, which must carry both an error code and a before-reference or two CHECK constraints
  -- refuse it.
  ('1895aa25-6b24-5d2a-b5a7-04c651141c18',
   '43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', null,
   timestamptz '2026-07-01 10:00:00+00',
   'user', '297ad853-58a6-5e83-87e1-f936f9c3ddff',
   'delete', 'business.business_profile.deleted', 'denied', 'audit.fixture.delete_refused',
   'fixture-request-b1', 'fixture-correlation-b1', 'fixture-causation-b1',
   'record:business_profile/3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', null, 'permission_denied',
   true, true, true, 'retention.audit')
on conflict (id) do nothing;

-- The security events. §4's ERD names no SECURITY_EVENT entity, so these two rows carry only what
-- §9.1's class description and §9.3's storage rule name: a type, an optional actor, and a hash of
-- the IP and of the user agent.
--
-- security_event_a1 has NO ACTOR, which is the state §9.1's own example describes; security_event_b1
-- has one. The both-or-neither constraint is therefore satisfied in both directions by real rows
-- rather than only permitted by a CHECK — 040's reason for loading all four knowledge kinds.
insert into app.security_events
  (id, workspace_id, occurred_at, event_type, actor_kind, actor_id,
   source_ip_hash, user_agent_hash) values
  ('f0625576-359f-5d05-90de-8fa165f090bb',
   'c4840acc-0323-5e13-b1d3-c18d7eb615cb', timestamptz '2026-07-01 11:00:00+00',
   'auth.session.replay_detected', null, null,
   sha256(convert_to('fixture source ip a1', 'utf8')),
   sha256(convert_to('fixture user agent a1', 'utf8'))),
  ('c327f7e6-1cd9-5a1c-a9b0-5dfb2e487587',
   '43fd5c24-ebea-528f-9ce9-eedf1f8f9765', timestamptz '2026-07-01 12:00:00+00',
   'auth.credential.rotation_failed', 'user', '297ad853-58a6-5e83-87e1-f936f9c3ddff',
   sha256(convert_to('fixture source ip b1', 'utf8')),
   sha256(convert_to('fixture user agent b1', 'utf8')))
on conflict (id) do nothing;

commit;
