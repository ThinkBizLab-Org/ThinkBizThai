-- Batch 020 — business: business profile, page context profile, and their immutable versions.
--
-- Owner: A1 Business. The migration ownership registry (§6) reserves 020 to this package and
-- describes it as "business/page + immutable versions", depending on 011.
--
-- Depends on: 000 (schemas, private.set_updated_at), 001 (app_worker, app_command,
-- app_maintenance), 010 (app.workspaces, and the workspace_members table the helpers read),
-- 011 (app.is_active_member, app.workspace_member_role). All four are merged; migration
-- invariant 1 forbids rewriting any of them and nothing below does.
--
-- Policies land HERE, in the same migration as the tables they protect, for the reason 010's
-- header gives: a table that exists for even one merged batch without its policies is a table
-- whose isolation nobody ever proved.
--
--
-- MEMBERSHIP IS READ THROUGH THE HELPERS AND NEVER BY JOINING THE MEMBERSHIP TABLE
--
-- RFC-2026-020 §5/5 makes that uniform, and it is the reason batch 011 exists. Every predicate
-- below calls `app.is_active_member(workspace_id)` or `app.workspace_member_role(workspace_id)`;
-- not one of them contains `app.workspace_members`.
--
-- The rule is not decoration and it is not only about the 42P17 cycle, which these tables do not
-- have. A policy on app.business_profiles that wrote `exists (select 1 from app.workspace_members
-- ...)` would evaluate that scan as the CALLER, so `authenticated`'s whole policy set on
-- app.workspace_members — 010's own-active-row policy ORed with 011's owner/admin roster policy —
-- would be expanded inside this table's evaluation, and the width of business visibility would
-- become a function of a policy set that belongs to another module and another batch. Through the
-- helper the scan runs as `app_authz`, whose single policy is pinned by name, by command and by
-- deparsed expression in scripts/db/run.mjs. That is the difference between a predicate whose
-- width is stated and one whose width is inherited.
--
-- It also means `status = 'active'` is asserted in exactly one place for these four tables — inside
-- the helper — rather than copied into ten predicates where the tenth can forget it.
--
--
-- WHICH §8.1 CELLS THIS IMPLEMENTS, AND WHICH IT LEAVES DENIED
--
-- §8.1 has three rows about these tables:
--
--   | Business/Page SELECT                          | Y | Y | Y | Y | Y | P |
--   | Business/Page INSERT/UPDATE/archive           | Y | Y | P | N | N | P |
--   | Immutable business/page version UPDATE/DELETE | N | N | N | N | N | N |
--
--   * SELECT is `Y` for every built-in role, so the predicate tests ACTIVE MEMBERSHIP and not
--     role: `app.is_active_member(workspace_id)`. Implemented, on all four tables — reading a
--     version is reading business/page data, and §11.3 says an archived Business/Page is still
--     readable ("ยังอ่าน history ตาม role").
--
--   * INSERT/UPDATE/archive is `Y` for owner and admin, `N` for approver and viewer, and `P` for
--     editor. The two `Y` cells are implemented. **Editor's `P` is NOT**, and that is a refusal
--     rather than an omission, for the reason RFC-2026-020 §8 gives about the two `P` cells it
--     also refused: `P` is "ผ่านตาม policy/explicit capability" (§8 legend) and no document in
--     this repository defines the capability set. §7 names the machinery — `capability + tenant
--     context + member scope` over the scope types `all_businesses` / `business` / `page` — and
--     puts the table that carries it, `workspace_member_scopes`, in batch `021`. Writing
--     `role in ('owner','admin','editor')` here would not resolve a capability; it would DELETE
--     the distinction between `Y` and `P` and ship the editor an unconditional grant nobody
--     reviewed. Denied by default, and 021 widens it — RLS policies are permissive and OR
--     together, so a capability-scoped policy added later grants more without rewriting this file.
--
--   * The version row is the only `N` in the SERVICE column anywhere in §8.1, and 010's header
--     said so while noting the cell belongs to this batch. It is implemented as ABSENT GRANTS and
--     ABSENT POLICIES: no client role and no service role holds UPDATE or DELETE on either version
--     table, so the refusal comes from the privilege system (42501) rather than from a policy that
--     a later edit could widen. The isolation suite asserts the layer, not merely the refusal.
--
-- §8.1 names no INSERT operation for a version, and that silence is read the way the rest of the
-- matrix reads: where the data package wants an append-only table's INSERT restricted differently
-- from the operation that produces the row, it says so in its own line — "Research run/source/
-- evidence INSERT | N N N N N S" (§8.2), "Usage ledger INSERT/UPDATE/DELETE | N N N N N S/N"
-- (§8.4). For approval it does the opposite and grants the producing operation while denying
-- mutation of its record: "Approve/reject/request changes | Y P P Y N P" beside "Approval event
-- UPDATE/DELETE | N N N N N N". Business/page versions have that second shape exactly — the
-- producing operation ("Business/Page INSERT/UPDATE/archive") is granted to owner and admin, and
-- only UPDATE/DELETE of the version is denied. So INSERT on a version table is written for owner
-- and admin, with `created_by = (select auth.uid())` as §8.5 requires of a user action, and
-- nothing else about a version is writable by anyone.
--
--
-- WHAT IS NOT IMPLEMENTED HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO NOTICE
--
--   * WORKSPACE LIFECYCLE VISIBILITY. §8.5 lists "lifecycle visibility" as part of a SELECT
--     predicate, and 010's own workspace policy stops at `access_blocked` because §11.4 defines
--     that transition as revoking sessions, connectors and jobs. The equivalent gate for these
--     tables would have to read `app.workspaces.lifecycle_state`, and there are exactly two ways
--     to reach it, both of which are decisions this batch does not own:
--
--       - join `app.workspaces` from these policies. That is the coupling the paragraph above
--         rejects, one relation over: the scan runs as the caller, so the width of business
--         visibility becomes a function of 010's workspace policy rather than of anything written
--         here. It is fail-closed today and would stop being so the day that policy widens.
--       - add a lifecycle-aware helper. Every authorization helper is owned by `app_authz`
--         (RFC-2026-020 §5/2), and §6.1/6 pins that role's grants to exactly USAGE on schema app
--         and a column-scoped SELECT on four columns of `app.workspace_members`. A helper that
--         reads `app.workspaces` needs a grant outside that set, which `authzLint` rejects by
--         design. Widening it is an amendment to an approved decision, not a batch's act.
--
--     So a member of a workspace in `access_blocked` can still read its business rows. That is
--     recorded here, in the handoff, and in the work package's open blockers, and it is owed to an
--     RFC plus batch 170 (grants/RLS/exposed surface hardening). Nothing here pretends otherwise.
--
--   * CHANNEL BINDINGS. §5's inventory row reads "page_context_profiles, versions, bindings" for
--     this module. The binding carries `social_account_id` (§3.3), whose table is batch `110`
--     (A6 Meta Connector), and §6's registry gives the business-channel/social foreign key to
--     batch `111` (A0 Integration, depends on 110, 020 and 081). Migration invariant 6 puts a
--     cross-module FK in an integration batch and nowhere else. Creating the table here would mean
--     either a dangling uuid column pointing at nothing or a foreign key this batch is forbidden
--     to write. The registry's own description of 020 — "business/page + immutable versions" —
--     omits bindings for that reason. Owed by 110/111.
--
--   * A `current_version_id` POINTER on the current row. It would be a circular foreign key
--     between a table and its version table, which needs a deferred constraint; §6's registry puts
--     "deferred FK" in batch `021`. The version tables carry `version_number`, unique per parent,
--     which answers "which version is latest" without one.
--
--   * ANY COMMAND FUNCTION. No `app_command` grant is issued. The data package specifies no
--     command surface for business.core, and a grant issued ahead of the thing that needs it is a
--     grant nobody reviews against a caller (010's sentence, unchanged here). The consequence is
--     stated: a client holding INSERT on a version table can write a version whose content never
--     was the current row's content. Binding the two into one transaction is what a command
--     function is for, and it is the command surface — not RLS — that owes it.
--
--
-- WHY THE PARENT LINK IS A COMPOSITE FOREIGN KEY AND NOT A SINGLE COLUMN
--
-- §3.3: "Child ต้องยืนยันว่า parent อยู่ Workspace/Business เดียวกันด้วย composite FK, stable
-- validation function หรือ command transaction ที่มี DB constraint รองรับ". §4's relation
-- invariant 1 says a Page Context is always in one Business and in the same Workspace as its
-- parent, and invariant 10 says unrelated Workspace/Business/Page UUIDs must fail AT THE DATABASE
-- or at the command boundary even when the actor holds rights over each entity separately.
--
-- A single-column FK cannot express that. `page_context_profiles.business_profile_id` referencing
-- `app.business_profiles(id)` says the business exists; it says nothing about the page's own
-- `workspace_id` agreeing with that business's. An owner of two workspaces could then write a page
-- row carrying workspace A and a business in workspace B, and every policy in this file would
-- evaluate the caller's rights against the workspace the ROW claims.
--
-- So every child references its parent by the whole scope path, and each parent carries the unique
-- constraint that makes such a reference possible:
--
--   business_profile_versions      (workspace_id, business_profile_id)
--                               -> business_profiles (workspace_id, id)
--   page_context_profiles          (workspace_id, business_profile_id)
--                               -> business_profiles (workspace_id, id)
--   page_context_profile_versions  (workspace_id, business_profile_id, page_context_profile_id)
--                               -> page_context_profiles (workspace_id, business_profile_id, id)
--
-- The mismatch then fails with 23503 at the constraint, for every caller, including one the policy
-- would have admitted. The isolation suite asserts exactly that case.
--
--
-- WHAT A BUSINESS PROFILE HOLDS, WHICH IS LESS THAN A READER MIGHT EXPECT
--
-- §5 classifies these tables (TENANT-1, TENANT-LIFE/HISTORY) and names no column of them. The
-- attribute surface a business profile will eventually carry lives in other modules by the
-- registry's own assignment: the industry pack and its assignment are batch `030`, knowledge —
-- voice, audience, offers, restrictions — is `040`, and the resolved knowledge contract is `041`.
-- §5 also forbids the words "metadata", "config", "payload" and "JSON" without a declared JSON
-- Schema version, maximum size, prohibited fields and owner, none of which exists.
--
-- So each table carries its identity, its scope path, one human-readable `name`, the soft
-- lifecycle field §3.2 names, and the audit columns §3.2 requires. Nothing else is invented. A
-- later batch adds typed columns to the current row and a matching column to the version row in
-- the same change, which is what "current + immutable versions" costs and is cheaper than a
-- document column nobody can validate.


-- ---------------------------------------------------------------------------------------------
-- app.business_profiles — the Business, current state.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` (§3.3). Soft lifecycle is `archived_at` — §3.2 offers
-- `archived_at` or `deleted_at`, §8.1's operation is spelled "INSERT/UPDATE/archive", and §11.3 is
-- titled Business/Page archive. No status vocabulary is invented for a lifecycle the document
-- describes with one word and one transition.
create table if not exists app.business_profiles (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid        not null references app.workspaces (id),
  name          text        not null,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid,
  constraint business_profiles_name_not_blank check (length(btrim(name)) > 0),
  -- The target of every child's composite foreign key. `id` alone is already unique; this pair is
  -- what lets a child assert that its own workspace_id is the one this business actually has.
  constraint business_profiles_scope_key unique (workspace_id, id)
);

comment on table app.business_profiles is
  'Owner: A1 Business (business.core, batch 020). Canonical scope workspace_id (§3.3). '
  'Sensitivity TENANT-1; retention TENANT-LIFE. Current state; history lives in '
  'app.business_profile_versions, which is immutable. Soft lifecycle via archived_at (§3.2, §11.3); '
  'hard delete only through the retention job (batch 160). The attribute surface is deliberately '
  'minimal — industry assignment is batch 030 and knowledge is 040 — and no untyped document '
  'column stands in for it (§5).';
comment on column app.business_profiles.workspace_id is
  'TENANT-1. The canonical tenant scope, and the column every policy on this table resolves '
  'membership against. Excluded from the UPDATE grant, so a row cannot be moved between tenants '
  'even by a caller both policies would admit (§8.5).';
comment on column app.business_profiles.archived_at is
  'TENANT-1. §11.3: archive closes new creation and publishing under this Business while history '
  'stays readable by role. Set and cleared by the owner/admin UPDATE policy; never a DELETE.';
comment on column app.business_profiles.created_by is
  'AUTH-3. The acting user. Not FK-constrained: §11.2 forbids cascade-deleting history when a '
  'member is removed and requires the actor field be anonymized instead.';
comment on column app.business_profiles.updated_by is 'AUTH-3. See created_by.';


-- ---------------------------------------------------------------------------------------------
-- app.business_profile_versions — immutable history of the Business.
-- ---------------------------------------------------------------------------------------------
--
-- §3.2: "Immutable version/evidence/decision/usage/audit/publish history: ห้าม update เนื้อหาเดิม".
-- §4's relation invariant 8 repeats it. Here that is expressed three ways at once, because a
-- comment is not a control: no UPDATE or DELETE policy, no UPDATE or DELETE grant to any role, and
-- no updated_at column or trigger — an immutable row has no update to stamp, and §3.2 requires
-- `updated_at` only of a MUTABLE row.
create table if not exists app.business_profile_versions (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid        not null,
  business_profile_id  uuid        not null,
  version_number       integer     not null,
  name                 text        not null,
  created_at           timestamptz not null default now(),
  created_by           uuid,
  constraint business_profile_versions_name_not_blank check (length(btrim(name)) > 0),
  constraint business_profile_versions_number_positive check (version_number >= 1),
  constraint business_profile_versions_number_unique unique (business_profile_id, version_number),
  -- §3.3's composite FK. A version cannot claim a workspace its business is not in.
  constraint business_profile_versions_scope_fk
    foreign key (workspace_id, business_profile_id)
    references app.business_profiles (workspace_id, id)
);

comment on table app.business_profile_versions is
  'Owner: A1 Business (business.core, batch 020). Canonical scope workspace_id and '
  'business_profile_id (§3.3), tied to the parent by a composite foreign key so an unrelated '
  'Workspace/Business pair fails at the database (§4 invariant 10). Sensitivity TENANT-1; '
  'retention HISTORY. IMMUTABLE (§3.2, §4 invariant 8, §8.1): no role — client or service — holds '
  'UPDATE or DELETE here, as an absent grant and an absent policy rather than as a convention.';
comment on column app.business_profile_versions.version_number is
  'The per-Business ordinal, unique with business_profile_id. It answers "which version is latest" '
  'without a current_version_id pointer on the parent, which would be a circular foreign key and '
  'therefore batch 021 (deferred FK).';
comment on column app.business_profile_versions.created_by is
  'AUTH-3. The acting user, asserted equal to the JWT subject by the INSERT policy (§8.5). There '
  'is no updated_by: nothing updates this row.';


-- ---------------------------------------------------------------------------------------------
-- app.page_context_profiles — the Page Context, current state.
-- ---------------------------------------------------------------------------------------------
--
-- §4's relation invariant 1: a Page Context is in exactly one Business and in the same Workspace
-- as that Business, always. The composite foreign key below is that invariant, enforced by the
-- database rather than by whichever command path remembers to check it.
--
-- The column is `business_profile_id` and the primary key is `id`; §3.3 forbids the synonym
-- `page_id` outright, and other modules refer to this row as `page_context_profile_id`.
create table if not exists app.page_context_profiles (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid        not null,
  business_profile_id  uuid        not null,
  name                 text        not null,
  archived_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid,
  updated_by           uuid,
  constraint page_context_profiles_name_not_blank check (length(btrim(name)) > 0),
  constraint page_context_profiles_scope_fk
    foreign key (workspace_id, business_profile_id)
    references app.business_profiles (workspace_id, id),
  -- The target of the version table's composite foreign key, and the supporting index for this
  -- table's own composite foreign key: it leads with (workspace_id, business_profile_id).
  constraint page_context_profiles_scope_key unique (workspace_id, business_profile_id, id)
);

comment on table app.page_context_profiles is
  'Owner: A1 Business (business.core, batch 020). Canonical scope workspace_id and '
  'business_profile_id (§3.3). Sensitivity TENANT-1; retention TENANT-LIFE. §4 invariant 1 — one '
  'Business, same Workspace as the parent — is enforced by the composite foreign key, not by a '
  'convention. Soft lifecycle via archived_at (§3.2, §11.3).';
comment on column app.page_context_profiles.business_profile_id is
  'TENANT-1. The canonical Business scope (§3.3). Excluded from the UPDATE grant: §8.5 forbids '
  'moving a row across tenant OR scope with an update, and a Page changing Business is exactly '
  'that.';
comment on column app.page_context_profiles.archived_at is
  'TENANT-1. §11.3. Archiving a Page closes new creation and publishing under it while its history '
  'stays readable by role.';


-- ---------------------------------------------------------------------------------------------
-- app.page_context_profile_versions — immutable history of the Page Context.
-- ---------------------------------------------------------------------------------------------
create table if not exists app.page_context_profile_versions (
  id                        uuid primary key default gen_random_uuid(),
  workspace_id              uuid        not null,
  business_profile_id       uuid        not null,
  page_context_profile_id   uuid        not null,
  version_number            integer     not null,
  name                      text        not null,
  created_at                timestamptz not null default now(),
  created_by                uuid,
  constraint page_context_profile_versions_name_not_blank check (length(btrim(name)) > 0),
  constraint page_context_profile_versions_number_positive check (version_number >= 1),
  constraint page_context_profile_versions_number_unique
    unique (page_context_profile_id, version_number),
  constraint page_context_profile_versions_scope_fk
    foreign key (workspace_id, business_profile_id, page_context_profile_id)
    references app.page_context_profiles (workspace_id, business_profile_id, id)
);

comment on table app.page_context_profile_versions is
  'Owner: A1 Business (business.core, batch 020). Canonical scope workspace_id, '
  'business_profile_id and page_context_profile_id (§3.3), tied to the parent by a composite '
  'foreign key over the whole scope path. Sensitivity TENANT-1; retention HISTORY. IMMUTABLE '
  '(§3.2, §4 invariant 8, §8.1): no role holds UPDATE or DELETE, and the table carries no '
  'updated_at because nothing updates it.';
comment on column app.page_context_profile_versions.page_context_profile_id is
  'TENANT-1. The canonical Page Context scope, spelled in full because §3.3 lists the abbreviated '
  'form among the synonyms it forbids outright. The test that enforces that reads this file with '
  'line comments stripped and string literals kept, so writing the forbidden token here — even to '
  'say it is forbidden — would fail the build. That is the rule behaving correctly.';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- Already covered by a constraint's own index, and therefore NOT repeated below:
--
--   business_profiles.workspace_id                  — FK to app.workspaces and the RLS predicate.
--                                                     business_profiles_scope_key leads with it.
--   page_context_profiles (workspace_id, business_profile_id)
--                                                   — the composite FK, and the RLS predicate
--                                                     column. page_context_profiles_scope_key
--                                                     leads with both.
--   business_profile_versions (business_profile_id, version_number)
--   page_context_profile_versions (page_context_profile_id, version_number)
--                                                   — the unique constraints, which also serve
--                                                     "the versions of this parent, latest first".
--   created_by / updated_by                         — not FK-constrained (see the column comments)
--                                                     and named in no policy predicate.

-- FK support for business_profile_versions' composite key, which leads with workspace_id, and the
-- RLS predicate column on that table.
create index if not exists business_profile_versions_scope_idx
  on app.business_profile_versions (workspace_id, business_profile_id);

-- FK support for page_context_profile_versions' composite key.
create index if not exists page_context_profile_versions_scope_idx
  on app.page_context_profile_versions (workspace_id, business_profile_id, page_context_profile_id);

-- §3.3 keyset pagination, "(created_at desc, id desc)", for the two lists that grow with the
-- tenant: the businesses of a workspace and the pages of a business.
create index if not exists business_profiles_workspace_keyset_idx
  on app.business_profiles (workspace_id, created_at desc, id desc);

create index if not exists page_context_profiles_business_keyset_idx
  on app.page_context_profiles (business_profile_id, created_at desc, id desc);


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every MUTABLE row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
--
-- Two triggers, not four. The version tables have no updated_at to stamp, and adding one would be
-- the first sentence of an immutable table contradicting itself.
drop trigger if exists set_updated_at on app.business_profiles;
create trigger set_updated_at before update on app.business_profiles
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.page_context_profiles;
create trigger set_updated_at before update on app.page_context_profiles
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on every table, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
alter table app.business_profiles enable row level security;
alter table app.business_profiles force row level security;

alter table app.business_profile_versions enable row level security;
alter table app.business_profile_versions force row level security;

alter table app.page_context_profiles enable row level security;
alter table app.page_context_profiles force row level security;

alter table app.page_context_profile_versions enable row level security;
alter table app.page_context_profile_versions force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges. Deny-by-default needs a grant before RLS is even reached.
-- ---------------------------------------------------------------------------------------------
--
-- §6 invariant 8 puts migration, constraints, indexes, RLS AND grants in one change set. `anon` is
-- granted nothing, anywhere, as in 010: §8.5 gives anonymous no tenant policy, so an anonymous
-- read is refused by the privilege system on the SCHEMA rather than filtered to zero rows by RLS.
--
-- Column-scoped, per operation. Two exclusions are load-bearing and are enforced here rather than
-- only in a WITH CHECK a later edit could weaken:
--
--   * `workspace_id` is absent from every UPDATE grant, so no row can be moved between tenants.
--   * `business_profile_id` is absent from page_context_profiles' UPDATE grant, so no Page can be
--     moved between Businesses. §8.5 forbids moving a row across tenant OR SCOPE with an update,
--     and 010 had no scope below the tenant for that half of the sentence to bite on.
--
-- `id` IS in the INSERT grants: §3.2 says the application may create an aggregate id before the
-- transaction. `archived_at` is not — a row is created live and archived by a later update.
grant select (id, workspace_id, name, archived_at, created_at, updated_at, created_by, updated_by)
  on app.business_profiles to authenticated;
grant insert (id, workspace_id, name, created_by, updated_by)
  on app.business_profiles to authenticated;
grant update (name, archived_at, updated_by) on app.business_profiles to authenticated;

grant select (id, workspace_id, business_profile_id, version_number, name, created_at, created_by)
  on app.business_profile_versions to authenticated;
grant insert (id, workspace_id, business_profile_id, version_number, name, created_by)
  on app.business_profile_versions to authenticated;
-- No UPDATE and no DELETE on a version table, for any role. §8.1's only version row is
-- `N N N N N N`, and this absence is what makes the refusal a privilege-layer 42501 the isolation
-- suite can attribute to an object by name.

grant select (id, workspace_id, business_profile_id, name, archived_at, created_at, updated_at,
              created_by, updated_by)
  on app.page_context_profiles to authenticated;
grant insert (id, workspace_id, business_profile_id, name, created_by, updated_by)
  on app.page_context_profiles to authenticated;
grant update (name, archived_at, updated_by) on app.page_context_profiles to authenticated;

grant select (id, workspace_id, business_profile_id, page_context_profile_id, version_number, name,
              created_at, created_by)
  on app.page_context_profile_versions to authenticated;
grant insert (id, workspace_id, business_profile_id, page_context_profile_id, version_number, name,
              created_by)
  on app.page_context_profile_versions to authenticated;

-- app_worker holds privileges and NO policy, for the reason 010 records: without a grant, a service
-- refusal is 42501 either way and proves only that somebody forgot a GRANT; with the grant and no
-- policy, an empty result can only have come from RLS, and a service role that had quietly acquired
-- BYPASSRLS would SUCCEED where the suite demands a refusal.
--
-- The version tables are the exception, and it is the matrix speaking rather than an oversight:
-- §8.1 marks the service `P` on Business/Page operations and `N` on immutable version
-- UPDATE/DELETE — the only `N` in that column in the whole section. So app_worker gets SELECT and
-- INSERT there and never UPDATE or DELETE.
grant select, insert, update on app.business_profiles to app_worker;
grant select, insert, update on app.page_context_profiles to app_worker;
grant select, insert on app.business_profile_versions to app_worker;
grant select, insert on app.page_context_profile_versions to app_worker;

-- app_command and app_maintenance are granted nothing by this batch. There is no specified command
-- surface for business.core, and the retention path is batch 160.


-- ---------------------------------------------------------------------------------------------
-- Policies. TO authenticated, for the user paths §8.1 grants.
-- ---------------------------------------------------------------------------------------------
--
-- Every membership question goes through batch 011's helpers. `app.is_active_member(uuid)` and
-- `app.workspace_member_role(uuid)` answer about the CALLER only — RFC-2026-020 §6.3/12, asserted
-- by the isolation suite and by scripts/db/authz-proofs.mjs — so a policy that calls one is asking
-- "may I", never "who else is here".

-- --- app.business_profiles --------------------------------------------------------------------

-- §8.1 "Business/Page SELECT" is `Y` for owner, admin, editor, approver and viewer alike, so the
-- predicate tests membership and not role. Archived rows stay visible: §11.3 says an archived
-- Business is still readable by role, and a policy that hid it would delete the history the
-- archive exists to preserve.
drop policy if exists business_profiles_select_active_member on app.business_profiles;
create policy business_profiles_select_active_member on app.business_profiles
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- §8.5: an INSERT policy checks the whole scope in WITH CHECK, and a user action asserts
-- `created_by = (select auth.uid())`. The second half is what makes §8.6 case 8 — a forged
-- created_by — fail at the database rather than at whatever code forgot to check it.
drop policy if exists business_profiles_insert_owner_or_admin on app.business_profiles;
create policy business_profiles_insert_owner_or_admin on app.business_profiles
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin')
  );

-- USING and WITH CHECK both present, as §8.5 requires of every UPDATE policy: without the second,
-- a row admitted by the first could be updated out of the scope that admitted it.
drop policy if exists business_profiles_update_owner_or_admin on app.business_profiles;
create policy business_profiles_update_owner_or_admin on app.business_profiles
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin'))
  with check (app.workspace_member_role(workspace_id) in ('owner', 'admin'));

-- --- app.business_profile_versions --------------------------------------------------------------

drop policy if exists business_profile_versions_select_active_member on app.business_profile_versions;
create policy business_profile_versions_select_active_member on app.business_profile_versions
  for select to authenticated
  using (app.is_active_member(workspace_id));

drop policy if exists business_profile_versions_insert_owner_or_admin on app.business_profile_versions;
create policy business_profile_versions_insert_owner_or_admin on app.business_profile_versions
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin')
  );

-- No UPDATE policy and no DELETE policy. See the grants above: the privilege is absent too, so the
-- refusal happens before RLS is consulted and the suite records which layer produced it.

-- --- app.page_context_profiles ------------------------------------------------------------------

drop policy if exists page_context_profiles_select_active_member on app.page_context_profiles;
create policy page_context_profiles_select_active_member on app.page_context_profiles
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- §11.3: "Archive ปิด creation/publish ใหม่ แต่ยังอ่าน history ตาม role". A Page Context created
-- under an archived Business is new creation under it, so the WITH CHECK refuses it. This is the
-- one predicate in this file that reads another table, and the direction is the safe one: the
-- subquery runs as the caller, so `app.business_profiles`'s own SELECT policy applies to it, and
-- any narrowing of that policy can only make this INSERT refuse more. It is a NARROWING of §8.1's
-- unconditional `Y`, and it is recorded as such rather than folded into the membership test.
drop policy if exists page_context_profiles_insert_owner_or_admin on app.page_context_profiles;
create policy page_context_profiles_insert_owner_or_admin on app.page_context_profiles
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin')
    and exists (
      select 1 from app.business_profiles b
      where b.workspace_id = page_context_profiles.workspace_id
        and b.id = page_context_profiles.business_profile_id
        and b.archived_at is null
    )
  );

drop policy if exists page_context_profiles_update_owner_or_admin on app.page_context_profiles;
create policy page_context_profiles_update_owner_or_admin on app.page_context_profiles
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin'))
  with check (app.workspace_member_role(workspace_id) in ('owner', 'admin'));

-- --- app.page_context_profile_versions ----------------------------------------------------------

drop policy if exists page_context_profile_versions_select_active_member on app.page_context_profile_versions;
create policy page_context_profile_versions_select_active_member on app.page_context_profile_versions
  for select to authenticated
  using (app.is_active_member(workspace_id));

drop policy if exists page_context_profile_versions_insert_owner_or_admin on app.page_context_profile_versions;
create policy page_context_profile_versions_insert_owner_or_admin on app.page_context_profile_versions
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin')
  );

-- No DELETE policy on any table in this batch. §8.5: there is no broad user delete; archiving is an
-- UPDATE of a typed lifecycle field, and hard deletion is a retention job (batch 160).


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004 and 011 use: a claim that is only a comment is a claim nobody checks.
-- These are the properties of THIS batch that can be answered from the catalog of the database
-- being migrated, without a committed snapshot and without a test harness. The text half is in
-- scripts/db/run.mjs and tests/db/identity/identity-isolation.test.mjs; the live half of the
-- isolation story is `make db-rls-smoke`.
do $$
declare
  offending text;
begin
  -- The immutability of the version tables, as the privilege system holds it. This is the whole of
  -- §8.1's `N N N N N N` row, and it is asserted against the live ACLs rather than against the text
  -- of the grants above, because a grant made by a LATER batch would not appear in this file at all.
  --
  -- `has_any_column_privilege` for UPDATE, deliberately, and the opposite choice from the one
  -- scripts/db/authz-proofs.mjs makes for RFC-2026-020 §6.1/6. That rule forbids a TABLE-wide grant
  -- while permitting a column-scoped one, so it must use `has_table_privilege`, which does not
  -- consider column privileges. This rule forbids BOTH forms — `grant update (name) on
  -- app.business_profile_versions` is exactly as much a violation of §8.1 as the whole-table grant —
  -- so it must use the form that sees a column grant. DELETE has no column-level form and is asked
  -- of the table.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname in ('business_profile_versions', 'page_context_profile_versions')
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'an immutable version table grants UPDATE or DELETE: %', offending
      using hint = '§8.1 marks "Immutable business/page version UPDATE/DELETE" N for every role '
                   'including the service. The absence of the grant is what makes the refusal a '
                   'privilege-layer denial rather than a policy a later edit can widen.';
  end if;

  -- And the same claim as the policy catalog holds it: no UPDATE or DELETE policy exists on either
  -- version table. Both halves are asserted because either alone can be satisfied while the other
  -- is wrong -- a policy with no grant is inert, and a grant with no policy is denied by RLS
  -- instead of by privilege, which is a weaker refusal than this row of the matrix asks for.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('business_profile_versions', 'page_context_profile_versions')
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'an immutable version table carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- Every table this batch creates is ENABLE and FORCE. The two are different catalog columns and
  -- the data package's own lint rule reads only the first (RFC-2026-016).
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('business_profiles', 'business_profile_versions',
                       'page_context_profiles', 'page_context_profile_versions')
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending;
  end if;

  -- No policy on a table this batch owns may name a service role. §8.1 gives the service `P` on
  -- Business/Page operations and `N` on version mutation; a `TO app_worker` policy here would add
  -- a permission the matrix does not grant, and would make the service denial the suite asserts
  -- unfalsifiable.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('business_profiles', 'business_profile_versions',
                       'page_context_profiles', 'page_context_profile_versions')
     -- pg_roles and not pg_authid. pg_authid is readable only by a superuser, and a migration that
     -- needs one to apply is a migration that cannot be applied on the platform it targets — where
     -- `postgres` is not a superuser. pg_roles is the public view over the same rows and carries
     -- both columns this needs.
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('app_worker', 'app_command', 'app_maintenance', 'anon'));
  if offending is not null then
    raise exception 'batch 020 wrote a policy for a service or anonymous role: %', offending;
  end if;

  -- RFC-2026-017 §3, asked here because it cannot be asked where it is usually asked.
  --
  -- scripts/db/run.mjs holds every tenant table to this rule, but it reads the COMMITTED SNAPSHOT of
  -- the provisioned instance, and this batch is deliberately not applied there (see the snapshot's
  -- not_applied_to_this_instance declaration). So for these four tables that rule runs against a
  -- catalog they are not in, and would go unasked until the day the instance receives the batch. It
  -- is asked here instead, against the live catalog of whatever database is being migrated — which
  -- on every pull request is the postgres:17 container `make db-migrate-clean` builds.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('business_profiles', 'business_profile_versions',
                       'page_context_profiles', 'page_context_profile_versions')
     and pg_catalog.pg_get_userbyid(c.relowner) = 'app_command';
  if offending is not null then
    raise exception 'a table this batch creates is owned by app_command: %', offending
      using hint = 'RFC-2026-017 §3 requires app_command not be the table owner: a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'which is the whole reason privileged writes are routed through one.';
  end if;
end $$;
