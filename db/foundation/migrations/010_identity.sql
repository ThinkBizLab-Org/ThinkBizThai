-- A0 CORRECTION, applied during integration review, not by A1.
--
-- This file originally qualified the default as `public.gen_random_uuid()`, because batch 000's
-- comment says pgcrypto was installed `with schema public`. Both halves of that were wrong, and
-- the database said so on the first apply attempt:
--
--   ERROR 42883: function public.gen_random_uuid() does not exist
--
--   * pgcrypto was ALREADY installed on this platform, in the `extensions` schema, so batch 000's
--     `create extension if not exists ... with schema public` silently did nothing.
--   * gen_random_uuid() has been in `pg_catalog` since PostgreSQL 13 and needs no extension at all.
--     Batch 000's claim that pgcrypto is required for it is simply out of date.
--
-- A1 wrote correct-looking SQL against an incorrect record. Batch 004 corrects the record; this
-- line is unqualified so it resolves from pg_catalog, which is always on the search path.

-- Batch 010 — identity: user profile, workspace, settings, membership, invitation.
--
-- Owner: A1 Identity. The migration ownership registry (§6) reserves 010 to this package and
-- describes it as "profiles/workspace/member/invite/settings".
--
-- Depends on: 000 (schemas, pgcrypto, private.set_updated_at), 001 (app_worker, app_command,
-- app_maintenance). Both are merged and applied; migration invariant 1 forbids rewriting either,
-- and nothing below does.
--
-- Policies land HERE, in the same migration as the tables they protect, because RFC-2026-017 §3
-- requires it and because a table that exists for even one merged batch without its policies is a
-- table whose isolation nobody ever proved.
--
--
-- WHAT THE §8.1 MATRIX ACTUALLY SAYS ABOUT THE SERVICE PATH, AND WHAT FOLLOWS
--
-- RFC-2026-017 §6 instructs batch 010 to name "app_worker / app_command for the operations the
-- matrix marks S". Read against §8.1, that instruction is vacuous: **§8.1 contains no `S` cell.**
-- Every service cell in the identity/workspace block is `P` — "passes per policy/explicit
-- capability" — and the one `N` in the service column belongs to immutable business/page versions,
-- which are batch 020's tables, not these.
--
-- So this migration writes NO service policy, and that is the matrix being obeyed rather than
-- ignored. RFC-2026-016 §2 is explicit that the amendment "introduces no new permission"; a
-- `TO app_worker` policy on a table where the matrix grants the service nothing specific would
-- introduce one. The `S` operations the amendment exists for live in §8.2–§8.4 — research rows,
-- publish delivery, job payloads, usage ledger, audit inserts — and belong to batches 050, 061,
-- 070, 120, 140. Their owners inherit the shape; batch 010 has no occasion to use it.
--
-- app_worker is nonetheless GRANTED table privileges below while holding no policy. That is
-- deliberate and it is what makes the assertion RFC-2026-017 §7 says is owed non-vacuous. Without
-- a grant, the service identity is refused by the privilege system and the test proves only that
-- somebody forgot a GRANT — 42501 either way, indistinguishable. With the grant and no policy, the
-- refusal can only have come from RLS, and a service role that had quietly acquired BYPASSRLS
-- would SUCCEED where the test demands a refusal. A grant without a policy on a forced table
-- confers no access; it converts an untestable absence into a testable denial.
--
--
-- THE AUTHORIZATION HELPER THIS BATCH DOES NOT HAVE, AND WHY THAT NARROWS TWO POLICIES
--
-- §7 says role checks should not be hard-coded per table — an authorization helper should resolve
-- `capability + tenant context + member scope`. The registry puts that helper in batch `011`
-- ("authorization helpers v1", A1 Identity + Security review), which depends on this batch. So
-- every predicate below is written inline, and it is written to be WIDENED by 011 rather than
-- corrected: RLS policies are permissive and OR together, so adding a capability-scoped policy
-- later grants more without rewriting a merged file.
--
-- Two matrix cells are therefore NOT implemented here, and they are denied by default until 011:
--
--   * "Member list SELECT: Owner Y, Admin Y, Editor P". A policy on app.workspace_members that
--     lets a member read ANOTHER member's row must ask whether the reader is a member — which
--     queries app.workspace_members from a policy on app.workspace_members. Postgres raises
--     42P17, infinite recursion detected in policy. Breaking the cycle requires a helper that is
--     exempt from workspace_members' own policies, and under FORCE ROW LEVEL SECURITY a
--     SECURITY DEFINER function owned by the table owner is NOT exempt (RFC-2026-017 §3 makes
--     exactly this point). The exemption has to be a policy naming the helper's owner role —
--     and **RFC-2026-017 names no role for an authorization helper.** app_worker is background
--     work, app_command owns user-initiated command functions, app_maintenance is the recorded
--     cross-tenant path. Choosing one here would be inventing the security boundary of every
--     later policy in the schema. It is declared open and left to 011 + Security review.
--
--   * "Workspace UPDATE: Admin P". `P` is conditional on a capability this batch cannot resolve.
--     UPDATE is written for `owner` only. Deny-by-default means the narrower policy is the safe
--     one and 011 widens it; the reverse would have shipped an unreviewed grant.
--
-- Nothing here implements workspace CREATION either. §8.1 has no INSERT row for workspaces, for
-- user profiles, or for membership rows — it names "Invite/change scope", which creates an
-- invitation, not a member. Who may create a workspace, and by what path a first owner row
-- appears, is unspecified by the data package. No INSERT policy is invented for it; the fixtures
-- under tests/db/identity/fixtures load administratively, as fixtures do.
--
--
-- ONE LINT INTERACTION, RECORDED RATHER THAN WORKED AROUND
--
-- §8.5 mandates `created_by = (select auth.uid())` and policies written `TO authenticated`, so
-- every policy below calls auth.uid(). scripts/db/run.mjs's managed-schema rule matches
-- /\b(create|alter|drop)\b[^;]{0,200}?\b(auth|storage|realtime)\./ and therefore reads
-- `create policy ... using ((select auth.uid()) = ...)` as this file creating an object in the
-- `auth` schema. It is a CALL to a platform function, which §3.1 does not forbid and §8.5
-- requires. The lint has a false positive on the exact shape the specification mandates; the SQL
-- was not contorted to dodge it. scripts/ belongs to DB-00 and the fix is A0's to make.


-- ---------------------------------------------------------------------------------------------
-- app.user_profiles — the person, not the tenant.
-- ---------------------------------------------------------------------------------------------
--
-- Scope is `user`, per §5. It carries no workspace_id and it is not a tenant-owned row: §3.3
-- requires the canonical scope field on "ทุก tenant-owned row", and a profile belongs to a person
-- who may be a member of several workspaces or none. This matters to a test: §12.6 assertion 5
-- says a suspended member sees zero TENANT rows, and their own profile is not one of them.
--
-- No foreign key to auth.users. §3.1 forbids creating or altering an object in the `auth` schema,
-- and the deterministic fixture identities are synthetic uuid5 values that exist in no auth table.
-- Whether the exposed profile is FK-bound to the platform identity table is an A0 platform
-- decision; it is recorded as open rather than guessed at here.
create table if not exists app.user_profiles (
  user_id       uuid primary key,
  display_name  text,
  locale        text        not null default 'th-TH',
  timezone      text        not null default 'Asia/Bangkok',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint user_profiles_locale_not_blank check (length(btrim(locale)) > 0),
  constraint user_profiles_timezone_not_blank check (length(btrim(timezone)) > 0)
);

comment on table app.user_profiles is
  'Owner: A1 Identity (identity.core, batch 010). Scope: user — NOT tenant-owned, so it carries no '
  'workspace_id (§3.3). Sensitivity PII-2; retention ID-USER. Soft lifecycle via deleted_at; hard '
  'delete only through the retention job (§3.2). user_id is the platform auth subject and is '
  'deliberately not FK-bound to auth.users (§3.1 forbids touching that schema).';
comment on column app.user_profiles.user_id is
  'PII-2. The auth subject the JWT sub claim carries. Also the RLS predicate column, and indexed '
  'as the primary key.';
comment on column app.user_profiles.display_name is
  'PII-2. Nullable: §11.2 requires actor fields be anonymizable rather than cascade-deleted.';
comment on column app.user_profiles.locale is 'Default th-TH (§3.2).';
comment on column app.user_profiles.timezone is 'IANA name. Default Asia/Bangkok (§3.2).';


-- ---------------------------------------------------------------------------------------------
-- app.workspaces — the tenant root.
-- ---------------------------------------------------------------------------------------------
--
-- lifecycle_state is `text` + a named CHECK, per §3.2, and its value set is the §11.4 state
-- machine rather than a set invented here. The recovery WINDOW is not encoded: DATA-DEC-04 is
-- open, §15 forbids an agent choosing an open decision, and a `30` written into a constraint would
-- read as ratified.
create table if not exists app.workspaces (
  id               uuid primary key default gen_random_uuid(),
  name             text        not null,
  lifecycle_state  text        not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid,
  updated_by       uuid,
  constraint workspaces_name_not_blank check (length(btrim(name)) > 0),
  constraint workspaces_lifecycle_state_known check (lifecycle_state in (
    'active', 'closing', 'access_blocked', 'purge_queued', 'held', 'purging', 'verify', 'deleted'))
);

comment on table app.workspaces is
  'Owner: A1 Identity (identity.core, batch 010). Tenant root — its id IS the canonical '
  'workspace_id every tenant-owned row carries (§3.3). Sensitivity TENANT-1; retention '
  'TENANT-LIFE. lifecycle_state enumerates the §11.4 deletion state machine; the recovery window '
  'itself is DATA-DEC-04 and is deliberately not encoded here.';
comment on column app.workspaces.lifecycle_state is
  'TENANT-1. §11.4. Read access stops at access_blocked: the transition out of closing is defined '
  'as revoking sessions, connectors and jobs, so a workspace past it is not readable by members.';
comment on column app.workspaces.created_by is
  'AUTH-3. The acting user. Not FK-constrained: §11.2 forbids cascade-deleting history when a '
  'member is removed and requires the actor field be anonymized instead.';
comment on column app.workspaces.updated_by is 'AUTH-3. See created_by.';


-- ---------------------------------------------------------------------------------------------
-- app.workspace_settings — one current row per workspace.
-- ---------------------------------------------------------------------------------------------
--
-- The settings SURFACE is unspecified. §5 names the table and classifies it TENANT-1/TENANT-LIFE;
-- it does not enumerate a single setting. The two below are the ones §3.2 fixes by name — default
-- locale th-TH and default timezone Asia/Bangkok — and nothing else is guessed.
--
-- There is deliberately no jsonb blob. §5 forbids the words "metadata", "config", "payload" and
-- "JSON" without a declared JSON Schema version, maximum size, prohibited fields and owner; none
-- of those exists, so the column does not either. A later batch adds typed columns, or 011/020
-- brings the schema declaration that would justify a document column.
create table if not exists app.workspace_settings (
  workspace_id      uuid primary key references app.workspaces (id),
  default_locale    text        not null default 'th-TH',
  default_timezone  text        not null default 'Asia/Bangkok',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid,
  updated_by        uuid,
  constraint workspace_settings_locale_not_blank check (length(btrim(default_locale)) > 0),
  constraint workspace_settings_timezone_not_blank check (length(btrim(default_timezone)) > 0)
);

comment on table app.workspace_settings is
  'Owner: A1 Identity (identity.core, batch 010). Canonical scope workspace_id, which is also the '
  'primary key and therefore the supporting index for its own foreign key. Sensitivity TENANT-1; '
  'retention TENANT-LIFE. Holds only the settings §3.2 names; the rest of the surface is '
  'unspecified and is not invented as an untyped document column (§5).';
comment on column app.workspace_settings.default_locale is 'TENANT-1. Default th-TH (§3.2).';
comment on column app.workspace_settings.default_timezone is 'TENANT-1. IANA. Default Asia/Bangkok (§3.2).';


-- ---------------------------------------------------------------------------------------------
-- app.workspace_members — who is in a workspace, at what role, in what status.
-- ---------------------------------------------------------------------------------------------
--
-- The role vocabulary is §7's five built-ins and the status vocabulary is §7's four, both as
-- named CHECKs (§3.2). §7 is explicit that `active` is the only status granting access, and the
-- SELECT policy below encodes exactly that rather than trusting callers to filter.
--
-- Business and page scope rows are NOT here. The registry puts `workspace_member_scopes` in batch
-- `021`, after 020 creates the business and page tables its foreign keys need.
create table if not exists app.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid        not null references app.workspaces (id),
  user_id       uuid        not null,
  role          text        not null,
  status        text        not null default 'invited',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid,
  constraint workspace_members_role_known check (role in ('owner', 'admin', 'editor', 'approver', 'viewer')),
  constraint workspace_members_status_known check (status in ('invited', 'active', 'suspended', 'left')),
  constraint workspace_members_one_per_workspace unique (workspace_id, user_id)
);

comment on table app.workspace_members is
  'Owner: A1 Identity (identity.core, batch 010). Canonical scope workspace_id (§3.3). '
  'Sensitivity PII-2/AUTH-3; retention AUTH-HISTORY. Role sets the ceiling, member scope narrows '
  'it and never widens it (§7); the scope rows themselves are batch 021. Only status=active '
  'grants access, and the SELECT policy enforces that rather than assuming a caller filters.';
comment on column app.workspace_members.role is
  'AUTH-3. §7 built-ins. Phase 1 state as text + named CHECK; values change by migration only (§3.2).';
comment on column app.workspace_members.status is
  'AUTH-3. §7: invited, suspended and left are denied immediately. Suspension is a property of '
  'this row and not of the token, which is why a policy that forgets to check it passes a '
  'suspended identity that looks identical to an active one.';


-- ---------------------------------------------------------------------------------------------
-- app.workspace_invitations — a short-lived offer of membership.
-- ---------------------------------------------------------------------------------------------
--
-- §9.3: the invitation token is stored as a cryptographic hash and never in plaintext. The column
-- is `bytea` with a minimum length rather than text, so a plaintext token does not fit the shape,
-- and the client role below holds INSERT but not SELECT on it — §9.2's "never returned after
-- write", expressed as a column privilege rather than as a convention someone has to remember.
-- The hash ALGORITHM is not fixed here; the data package does not name one and it is A1
-- Security's to fix in 011 or 140.
--
-- Lifecycle is timestamps, not an invented status vocabulary. accepted_at, revoked_at and
-- expires_at are each named by §10 (TOKEN-SHORT: "ถึง expiry + 30 วัน", "immediate revoke") or
-- §11.4 step 2 ("revoke ... invitations"). A four-value status enum would have been four words
-- this repository's source of truth never wrote.
create table if not exists app.workspace_invitations (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid        not null references app.workspaces (id),
  role           text        not null,
  token_hash     bytea       not null,
  invited_email  text,
  expires_at     timestamptz not null,
  accepted_at    timestamptz,
  revoked_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid,
  updated_by     uuid,
  constraint workspace_invitations_role_known check (role in ('owner', 'admin', 'editor', 'approver', 'viewer')),
  constraint workspace_invitations_token_hash_is_a_digest check (octet_length(token_hash) >= 32),
  constraint workspace_invitations_token_hash_unique unique (token_hash),
  constraint workspace_invitations_not_both_accepted_and_revoked
    check (accepted_at is null or revoked_at is null)
);

comment on table app.workspace_invitations is
  'Owner: A1 Identity (identity.core, batch 010). Canonical scope workspace_id (§3.3). '
  'Sensitivity PII-2/AUTH-3; retention TOKEN-SHORT. Holds a token DIGEST only (§9.3) and the '
  'client role can write that column but not read it (§9.2). Lifecycle is expires_at/accepted_at/'
  'revoked_at, each named by §10 or §11.4; no status vocabulary is invented.';
comment on column app.workspace_invitations.token_hash is
  'AUTH-3, write-only to clients. §9.3 permits the hash and forbids the token. bytea with a 32-'
  'byte floor so a plaintext token does not fit the shape. The digest algorithm is unspecified by '
  'the data package and is A1 Security to fix.';
comment on column app.workspace_invitations.invited_email is
  'PII-2, and the only contact PII in this table. Nullable because §11.2 requires actor and '
  'contact fields be anonymizable in place rather than cascade-deleted, and because an isolation '
  'fixture has no reason to carry a real address.';
comment on column app.workspace_invitations.expires_at is
  'TOKEN-SHORT (§10): retained to expiry + 30 days, revoked immediately on workspace closure '
  '(§11.4 step 2). The retention job that acts on it is batch 160.';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- app.user_profiles.user_id       — FK: none. RLS predicate: yes. Index: the primary key.
-- app.workspace_settings.workspace_id — FK and RLS predicate. Index: the primary key.
-- app.workspaces.id               — RLS predicate through the membership subquery. Index: the PK.
-- created_by / updated_by         — not FK-constrained (see the column comments) and named in no
--                                   policy predicate, so they need no index.

-- FK support for workspace_members.workspace_id: the unique constraint's index leads with it.
-- RLS predicate support: every policy in this file filters workspace_members on user_id first.
create index if not exists workspace_members_user_id_status_idx
  on app.workspace_members (user_id, status);

-- §3.3 keyset pagination for the member list "(created_at desc, id desc)".
create index if not exists workspace_members_workspace_keyset_idx
  on app.workspace_members (workspace_id, created_at desc, id desc);

-- FK support for workspace_invitations.workspace_id, and the RLS predicate's join column.
create index if not exists workspace_invitations_workspace_id_idx
  on app.workspace_invitations (workspace_id);

create index if not exists workspace_invitations_workspace_keyset_idx
  on app.workspace_invitations (workspace_id, created_at desc, id desc);

-- The retention sweep TOKEN-SHORT will run (batch 160) reads unexpired, unresolved invitations.
create index if not exists workspace_invitations_expires_at_idx
  on app.workspace_invitations (expires_at)
  where accepted_at is null and revoked_at is null;


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every mutable row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
drop trigger if exists set_updated_at on app.user_profiles;
create trigger set_updated_at before update on app.user_profiles
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.workspaces;
create trigger set_updated_at before update on app.workspaces
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.workspace_settings;
create trigger set_updated_at before update on app.workspace_settings
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.workspace_members;
create trigger set_updated_at before update on app.workspace_members
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.workspace_invitations;
create trigger set_updated_at before update on app.workspace_invitations
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on every table, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
--
-- ENABLE and FORCE are different catalog columns — relrowsecurity and relforcerowsecurity — and
-- the data package's own lint rule tests only the first, so ENABLE without FORCE passes it clean
-- while the table owner stays exempt from every policy below. DB-00's lint tests both, in the
-- migration text and against the live catalog.
alter table app.user_profiles enable row level security;
alter table app.user_profiles force row level security;

alter table app.workspaces enable row level security;
alter table app.workspaces force row level security;

alter table app.workspace_settings enable row level security;
alter table app.workspace_settings force row level security;

alter table app.workspace_members enable row level security;
alter table app.workspace_members force row level security;

alter table app.workspace_invitations enable row level security;
alter table app.workspace_invitations force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges. Deny-by-default needs a grant before RLS is even reached.
-- ---------------------------------------------------------------------------------------------
--
-- §6 invariant 8 puts migration, constraints, indexes, RLS AND grants in one change set. Batch
-- 170 hardens the exposed surface later; it cannot be the first place a grant appears, because
-- until one does, every policy below is unreachable and untestable.
--
-- `anon` is granted NOTHING, anywhere. §8.5: anonymous has no tenant policy. The consequence is
-- worth stating because it changes what a test may assert: an anonymous read is refused by the
-- privilege system (42501) rather than filtered to zero rows by RLS. That is strictly stronger
-- than §12.6 assertion 6 asks for, and the isolation suite records which layer refused.
grant usage on schema app to authenticated;
grant usage on schema app to app_worker;

-- The person's own profile. §8.1: "Own user profile SELECT/UPDATE" is `O` for every role.
grant select (user_id, display_name, locale, timezone, created_at, updated_at, deleted_at)
  on app.user_profiles to authenticated;
grant update (display_name, locale, timezone) on app.user_profiles to authenticated;

-- Workspace. SELECT for every member role; UPDATE for owner. `id` is excluded from the UPDATE
-- grant, so §8.5's "ห้ามย้าย row ข้าม tenant ด้วย update" is enforced by the privilege system and
-- not only by a WITH CHECK a later edit could weaken.
grant select (id, name, lifecycle_state, created_at, updated_at, created_by, updated_by)
  on app.workspaces to authenticated;
grant update (name, lifecycle_state, updated_by) on app.workspaces to authenticated;

grant select (workspace_id, default_locale, default_timezone, created_at, updated_at, created_by, updated_by)
  on app.workspace_settings to authenticated;
grant update (default_locale, default_timezone, updated_by) on app.workspace_settings to authenticated;

grant select (id, workspace_id, user_id, role, status, created_at, updated_at, created_by, updated_by)
  on app.workspace_members to authenticated;

-- Invitations. token_hash is in the INSERT grant and NOT in the SELECT grant: writable once,
-- never returned (§9.2, §9.3). workspace_id is likewise absent from the UPDATE grant.
grant select (id, workspace_id, role, invited_email, expires_at, accepted_at, revoked_at,
              created_at, updated_at, created_by, updated_by)
  on app.workspace_invitations to authenticated;
grant insert (workspace_id, role, token_hash, invited_email, expires_at, created_by, updated_by)
  on app.workspace_invitations to authenticated;
grant update (role, invited_email, expires_at, accepted_at, revoked_at, updated_by)
  on app.workspace_invitations to authenticated;

-- app_worker holds privileges and NO policy. Read the header: this is what makes "the service
-- identity is denied by RLS" an assertion that can fail, instead of one that passes because a
-- GRANT was forgotten. token_hash is withheld from it too — §8.1 gives the service no operation
-- on these tables at all, so there is no path that needs to read a digest.
grant select on app.user_profiles to app_worker;
grant select, insert, update on app.workspaces to app_worker;
grant select, insert, update on app.workspace_settings to app_worker;
grant select, insert, update on app.workspace_members to app_worker;
grant select (id, workspace_id, role, invited_email, expires_at, accepted_at, revoked_at,
              created_at, updated_at, created_by, updated_by)
  on app.workspace_invitations to app_worker;
grant insert (workspace_id, role, token_hash, invited_email, expires_at, created_by, updated_by)
  on app.workspace_invitations to app_worker;

-- app_command and app_maintenance are granted nothing by this batch. app_command owns SECURITY
-- DEFINER command functions and batch 010 defines none — the data package specifies no command
-- surface for identity. app_maintenance is the retention path, which is batch 160. A grant issued
-- ahead of the thing that needs it is a grant nobody reviews against a caller.


-- ---------------------------------------------------------------------------------------------
-- Policies. TO authenticated, for the user paths §8.1 grants (RFC-2026-016 §2).
-- ---------------------------------------------------------------------------------------------
--
-- Every predicate is `status = 'active'` on a membership row belonging to `(select auth.uid())`.
-- The subquery form is deliberate: `(select auth.uid())` is evaluated once per statement rather
-- than once per row.
--
-- None of these recurses. app.workspaces, app.workspace_settings and app.workspace_invitations
-- read app.workspace_members; app.workspace_members reads nothing. The inner scan is itself
-- subject to the members policy, which restricts it to the caller's own active row — so the
-- membership test cannot see, and cannot be fooled by, another user's membership.

-- --- app.user_profiles ---------------------------------------------------------------------

-- §8.1 "Own user profile SELECT/UPDATE" = O for every role. `O` is own-row, and a user profile is
-- not a tenant row, so this is not conditioned on membership: a member suspended from every
-- workspace still owns their own profile.
drop policy if exists user_profiles_select_own on app.user_profiles;
create policy user_profiles_select_own on app.user_profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_profiles_update_own on app.user_profiles;
create policy user_profiles_update_own on app.user_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No INSERT policy: §8.1 names no profile-creation operation, and provisioning at first login is
-- an onboarding path the data package does not specify.
-- No DELETE policy: §8.5 forbids a broad user delete; removal is a retention job (ID-USER).

-- --- app.workspaces ------------------------------------------------------------------------

-- §8.1 "Workspace SELECT" = Y for owner, admin, editor, approver and viewer alike — so the
-- predicate tests membership and not role. Visibility stops at access_blocked because §11.4
-- defines that transition as revoking sessions, connectors and jobs.
drop policy if exists workspaces_select_active_member on app.workspaces;
create policy workspaces_select_active_member on app.workspaces
  for select to authenticated
  using (
    lifecycle_state in ('active', 'closing')
    and exists (
      select 1 from app.workspace_members m
      where m.workspace_id = app.workspaces.id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  );

-- §8.1 "Workspace UPDATE" = Y for owner, P for admin, N for everyone else. Only the unconditional
-- Y is written; admin's P needs the capability resolver batch 011 owns.
-- USING and WITH CHECK are both present, as §8.5 requires of every update policy.
drop policy if exists workspaces_update_owner on app.workspaces;
create policy workspaces_update_owner on app.workspaces
  for update to authenticated
  using (
    lifecycle_state in ('active', 'closing')
    and exists (
      select 1 from app.workspace_members m
      where m.workspace_id = app.workspaces.id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from app.workspace_members m
      where m.workspace_id = app.workspaces.id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role = 'owner'
    )
  );

-- --- app.workspace_settings ----------------------------------------------------------------

drop policy if exists workspace_settings_select_active_member on app.workspace_settings;
create policy workspace_settings_select_active_member on app.workspace_settings
  for select to authenticated
  using (
    exists (
      select 1 from app.workspace_members m
      where m.workspace_id = app.workspace_settings.workspace_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  );

drop policy if exists workspace_settings_update_owner on app.workspace_settings;
create policy workspace_settings_update_owner on app.workspace_settings
  for update to authenticated
  using (
    exists (
      select 1 from app.workspace_members m
      where m.workspace_id = app.workspace_settings.workspace_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from app.workspace_members m
      where m.workspace_id = app.workspace_settings.workspace_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role = 'owner'
    )
  );

-- --- app.workspace_members -----------------------------------------------------------------

-- Own active membership only. This is the non-recursive anchor every other policy in this file
-- stands on, and it is why §8.1's "Member list SELECT" is not implemented here — see the header.
--
-- `status = 'active'` is part of the predicate rather than a filter callers apply, which is what
-- makes §12.6 assertion 5 bite: a suspended member sees zero rows in this table, including the
-- row recording their own suspension, and every policy that joins through this one therefore
-- sees nothing for them either.
drop policy if exists workspace_members_select_own_active on app.workspace_members;
create policy workspace_members_select_own_active on app.workspace_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'active'
  );

-- No INSERT, UPDATE or DELETE policy for any client role. §8.1's "Invite/change scope" creates an
-- invitation, which is the next table; changing a member's role or status is an owner operation
-- whose predicate would have to read this table from a policy on this table (42P17). Batch 011.

-- --- app.workspace_invitations --------------------------------------------------------------

-- §8.1 "Invite/change scope" = Y for owner, P for admin. Only the Y is written. The predicate
-- reads workspace_members, which is a different relation, so nothing recurses.
drop policy if exists workspace_invitations_select_owner on app.workspace_invitations;
create policy workspace_invitations_select_owner on app.workspace_invitations
  for select to authenticated
  using (
    exists (
      select 1 from app.workspace_members m
      where m.workspace_id = app.workspace_invitations.workspace_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role = 'owner'
    )
  );

-- §8.5: an INSERT policy checks the whole scope in WITH CHECK, and a user action asserts
-- `created_by = (select auth.uid())`. The second half is what makes §8.6 case 8 — a forged
-- created_by — fail at the database rather than at whatever code forgot to check it.
drop policy if exists workspace_invitations_insert_owner on app.workspace_invitations;
create policy workspace_invitations_insert_owner on app.workspace_invitations
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from app.workspace_members m
      where m.workspace_id = app.workspace_invitations.workspace_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role = 'owner'
    )
  );

-- Revoke and re-issue. workspace_id is absent from the UPDATE grant above, so a row cannot be
-- moved between tenants even if both WITH CHECK halves would admit it.
drop policy if exists workspace_invitations_update_owner on app.workspace_invitations;
create policy workspace_invitations_update_owner on app.workspace_invitations
  for update to authenticated
  using (
    exists (
      select 1 from app.workspace_members m
      where m.workspace_id = app.workspace_invitations.workspace_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from app.workspace_members m
      where m.workspace_id = app.workspace_invitations.workspace_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role = 'owner'
    )
  );

-- No DELETE policy on any table in this batch. §8.5: there is no broad user delete; revocation is
-- an UPDATE of a typed lifecycle field, and hard deletion is a retention job (batch 160).
