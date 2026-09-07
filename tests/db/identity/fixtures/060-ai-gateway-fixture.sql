-- Global, tenant AND PRIVATE fixture for the batch 060 isolation cases.
--
-- Owner: A3 AI Gateway. It loads AFTER 010-identity-fixture.sql and before nothing; the runner
-- applies the list in order, and a model policy cannot exist without the Workspace it belongs to or
-- the curated model it pins.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
-- THIS IS THE FIRST FIXTURE THAT LOADS A ROW INTO `private`, AND THE ROW IT LOADS IS THE POINT.
-- Batch 060's cases against private.ai_credential_references are all refusals, and a refusal at name
-- resolution passes whether or not the table has a row in it — which is exactly the shape this
-- repository refuses elsewhere ("a negative satisfied by an empty table"). So the row exists: every
-- identity in the suite is refused a table that HAS a credential reference in it, for the workspace
-- they are a member of, holding that workspace's exact id.
--
-- NOTHING HERE IS A CREDENTIAL, AND THE VALUES ARE WRITTEN SO A REVIEWER CAN SEE THAT AT A GLANCE.
-- §9.2's absolute prohibitions forbid a plaintext BYOK key in a fixture as firmly as in a table, and
-- 060_ai_gateway.sql's own apply-time block refuses any column that could hold one. The reference
-- below is a readable synthetic LOCATOR rather than a random-looking string: the 030 fixture derives
-- its checksums from their symbols because the column carries a contract's meaning and a pasted hex
-- constant would be unverifiable, and the opposite consideration governs here — a handle that looked
-- like a secret would be a fixture nobody could distinguish from the thing this whole batch exists
-- to keep out of the database.
--
-- WHAT EACH ROW IS FOR, so a later reader does not have to infer it from the cases:
--
--   ai_model_openai_text  the GLOBAL curated model. It carries no `_a` or `_b` suffix for batch
--                         030's reason: every other symbol names the workspace its row lives in, and
--                         a suffix here would assert a boundary the row does not have. `model_key`
--                         is deliberately SYNTHETIC — OPEN-004 owns the BYOK model allowlist, it is
--                         open, and a fixture naming a real model id would read as a decision.
--   workspace_a policy    pinned to that model. The row the A-side identities are all refused.
--   workspace_b policy    pinned to THE SAME model id, across the tenant boundary. Two tenants, one
--                         catalog row, and neither owner can see either policy — which is how batch
--                         030 asserted that a catalog is global rather than replicated per tenant,
--                         and it is the only way this batch can assert it, since no client identity
--                         may read the catalog directly.
--   workspace_a reference the BYOK credential reference §8.3's "BYOK credential manage" would create
--                         and no granted path can. It exists so the refusals are about a table with
--                         content rather than about an empty one.
--
-- This file loads ADMINISTRATIVELY, as the table owner, before any identity is assumed. On this
-- batch that is not a choice between two paths: all three tables are FORCE ROW LEVEL SECURITY with
-- an EMPTY POLICY SET, so there is no policy any of these rows could have been loaded through. Only
-- a BYPASSRLS role can write them, which is what the connection role is and what every identity in
-- the suite deliberately is not.
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- The global curated model. No workspace_id, no created_by, no updated_by: §3.2 asks for the actor
-- columns on a row a USER mutates, and no user mutates this one — it is platform-curated and
-- written by an administrative seed. `(provider, model_key)` is the stable key §6 invariant 5
-- requires of a global seed, and it is what makes this insert re-runnable.
insert into app.ai_models (id, provider, model_key, label) values
  ('27926682-2bbc-51fc-9add-10e2840c6326', 'openai', 'fixture-text-model',
   'Fixture text model')
on conflict (provider, model_key) do nothing;

-- One model policy per Workspace, both naming the SAME global model id. `created_by` and
-- `updated_by` are the WORKSPACE OWNER on each side of the boundary — §8.3 makes AI settings an
-- owner operation, so the owner is who a command function would record if one existed.
--
-- ON CONFLICT names workspace_id, which IS the primary key here: batch 060 takes 010's shape for a
-- per-workspace settings row rather than a surrogate id plus a unique constraint, because §4's ERD
-- names no AI entity and therefore states no cardinality to encode.
insert into app.ai_model_policies (workspace_id, ai_model_id, created_by, updated_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '27926682-2bbc-51fc-9add-10e2840c6326',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '27926682-2bbc-51fc-9add-10e2840c6326',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (workspace_id) do nothing;

-- The credential REFERENCE, in `private`, where §3.1 puts secret references by name.
--
-- `created_at` and `expires_at` are FIXED timestamptz values rather than now() and now() + interval,
-- for the reason batch 030's fixture fixes released_at: a fixture whose content depends on when it
-- ran is a fixture whose failures depend on when they ran. Fixing both also makes
-- `ai_credential_references_expiry_after_creation` hold for every run rather than until the day the
-- interval elapses.
--
-- `fingerprint` is eight characters and looks like a mask, which is what §9.2's "last-four-like
-- identifier" describes and what the sixteen-character ceiling in 060_ai_gateway.sql enforces.
-- `rotated_at` and `revoked_at` are null: this reference has neither been rotated nor revoked, and
-- there is no granted path that could do either, which is the state the header records as owed to
-- the command surface.
--
-- No row is loaded for workspace_b. Every case on this table is refused at the SCHEMA, identically,
-- for every identity — so a second row would add a constant and no assertion, which is the reason
-- the fixture catalog gives for every symbol it declines to add.
insert into private.ai_credential_references
  (workspace_id, provider, credential_reference, fingerprint,
   created_at, expires_at, created_by, updated_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'openai',
   'vault://fixture/workspace-a/openai', '****a1b2',
   timestamptz '2026-06-01 00:00:00+00', timestamptz '2027-06-01 00:00:00+00',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f')
on conflict (credential_reference) do nothing;

commit;
