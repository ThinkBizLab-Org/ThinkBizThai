-- Tenant fixture for the batch 010 isolation suite.
--
-- Owner: A1 Identity. §6's file ownership contract puts a module's db tests under
-- tests/db/<module-key>/; db/foundation/seeds/ is DB-00's and holds the GLOBAL seed, which
-- migration invariant 5 forbids a tenant pilot fixture from entering.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is generated. The cross-tenant
-- assertion depends on it: proving A cannot reach B by failing to guess B's id proves nothing,
-- and proving it while HOLDING B's exact id is the control that matters.
--
-- This file loads ADMINISTRATIVELY, as the table owner, before any identity is assumed. That is
-- not a hole in the policy set: batch 010 deliberately writes no INSERT policy for workspaces,
-- profiles or membership rows, because §8.1 names no such operation and inventing one would have
-- been inventing the signup boundary. A fixture loader is not an application path.
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

insert into app.user_profiles (user_id, display_name, locale, timezone) values
  ('5c460eb8-0710-557a-b423-f9b12c76834f', 'fixture owner a',     'th-TH', 'Asia/Bangkok'),
  ('a324d4a6-15a3-5e15-9193-eed9d50b5d91', 'fixture editor a',    'th-TH', 'Asia/Bangkok'),
  ('fecceb8f-d60b-54bc-97cd-fccee216e34b', 'fixture approver a',  'th-TH', 'Asia/Bangkok'),
  ('d884d3c1-89a0-5600-ae81-c368f6574821', 'fixture viewer a',    'th-TH', 'Asia/Bangkok'),
  ('9b10ac91-406b-5322-9755-bfb16b0b4aa3', 'fixture suspended a', 'th-TH', 'Asia/Bangkok'),
  ('297ad853-58a6-5e83-87e1-f936f9c3ddff', 'fixture owner b',     'th-TH', 'Asia/Bangkok')
on conflict (user_id) do nothing;

insert into app.workspaces (id, name, lifecycle_state, created_by, updated_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'fixture workspace a', 'active',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', 'fixture workspace b', 'active',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (id) do nothing;

insert into app.workspace_settings (workspace_id, created_by, updated_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '5c460eb8-0710-557a-b423-f9b12c76834f',
                                           '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '297ad853-58a6-5e83-87e1-f936f9c3ddff',
                                           '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (workspace_id) do nothing;

-- §7: `active` is the only status that grants access. user_suspended_a is `suspended` on purpose
-- and carries a claim shape identical to an active user's, so a policy that forgets to check the
-- membership row admits it.
insert into app.workspace_members (workspace_id, user_id, role, status, created_by, updated_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '5c460eb8-0710-557a-b423-f9b12c76834f', 'owner',     'active',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'a324d4a6-15a3-5e15-9193-eed9d50b5d91', 'editor',    'active',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'fecceb8f-d60b-54bc-97cd-fccee216e34b', 'approver',  'active',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'd884d3c1-89a0-5600-ae81-c368f6574821', 'viewer',    'active',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '9b10ac91-406b-5322-9755-bfb16b0b4aa3', 'viewer',    'suspended',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '297ad853-58a6-5e83-87e1-f936f9c3ddff', 'owner',     'active',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (workspace_id, user_id) do nothing;

-- One live invitation per tenant. The digest is DERIVED from the fixture symbol by the same
-- reasoning the catalog gives for its uuids: a random constant pasted into a fixture is an
-- unverifiable value, and a token that never existed cannot leak. §9.3 stores the hash only, and
-- there is no plaintext token anywhere in this repository to hash.
--
-- invited_email is left NULL. It is nullable precisely so it can be absent or anonymized (§11.2),
-- an isolation fixture has no use for a contact address, and the repository's own secret scan
-- fails on any address literal — which is the correct outcome for a fixture file.
insert into app.workspace_invitations (workspace_id, role, token_hash, expires_at, created_by, updated_by) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'editor',
   public.digest('thinkbizthai.fixture.invitation_a1', 'sha256'),
   now() + interval '7 days',
   '5c460eb8-0710-557a-b423-f9b12c76834f', '5c460eb8-0710-557a-b423-f9b12c76834f'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', 'editor',
   public.digest('thinkbizthai.fixture.invitation_b1', 'sha256'),
   now() + interval '7 days',
   '297ad853-58a6-5e83-87e1-f936f9c3ddff', '297ad853-58a6-5e83-87e1-f936f9c3ddff')
on conflict (token_hash) do nothing;

commit;
