-- Batch 021 — member business/page scope, and the two §8.1 cells that were waiting for it.
--
-- Owner: A1 Identity/Business. The migration ownership registry (§6) reserves 021 to this package
-- and describes it as "member business/page scope + deferred FK", depending on 020.
--
-- Depends on: 000 (schemas, private.set_updated_at), 001 (app_worker), 010 (app.workspaces,
-- app.workspace_members and the unique key its children reference), 011 (app.is_active_member,
-- app.workspace_member_role), 020 (app.business_profiles, app.page_context_profiles and their
-- version tables). All five are merged; migration invariant 1 forbids rewriting any of them and
-- NOTHING BELOW DOES — every statement in this file either creates a new object or adds a policy
-- to an existing one, and no `drop policy` here names a policy another batch created. A test
-- asserts that pairing rather than trusting this sentence.
--
--
-- WHAT 010 AND 020 LEFT HERE, AND WHICH HALF OF IT THIS BATCH CAN ACTUALLY PAY
--
-- Three batches recorded a cell they refused to implement, and all three refusals have the same
-- shape: `P` is "ผ่านตาม policy/explicit capability" (§8 legend), §7 names the machinery as
-- `capability + tenant context + member scope`, and until this file exists only two of those three
-- terms have a home in the schema. The refusals were not identical, though, and this batch can pay
-- exactly the ones whose missing term was MEMBER SCOPE:
--
--   * "Business/Page INSERT/UPDATE/archive: Editor P" (020_business.sql:50-59). PAID HERE. 020
--     says in terms that the table carrying the condition is `workspace_member_scopes` and that it
--     is 021's. The condition this file writes is the one §7 defines: an editor passes when their
--     MEMBER SCOPE covers the row being written. That preserves the distinction 020 was protecting
--     — owner and admin pass unconditionally through 020's own policies, the editor passes only
--     where a scope row says so — instead of collapsing `Y` and `P` into `role in (...)`.
--
--   * "Workspace UPDATE: Admin P" (010_identity.sql:78-80). NOT PAID, and this is a refusal with a
--     reason rather than an omission. The term 010 was missing is not member scope. §7's scope
--     types are `all_businesses`, `business` and `page` — every one of them names a Business or a
--     Page — and a WORKSPACE row is not inside any of them. So the table this batch creates cannot
--     condition that cell at all, and the term that is still missing there is `capability`, whose
--     set no document in this repository defines. RFC-2026-020 §8 refused it for that reason and
--     the reason is unchanged. Writing `role in ('owner','admin')` into 010's workspace UPDATE
--     would still be shipping an unreviewed grant, and it would still not be resolving a
--     capability.
--
--   * "Member list SELECT: Editor P" (011) and "Invite/change scope: Admin P" (010). NOT PAID, for
--     the same reason as the cell above: neither is a question about a Business or a Page.
--
-- So this batch closes ONE of the four open `P` cells and says plainly why the other three are not
-- its to close. §12.6 assertion 2's second half and §8.6 cases 3 and 4 are the debts it does pay.
--
--
-- THE DECISION THIS FILE MAKES THAT NO DOCUMENT MAKES FOR IT: WHAT AN ABSENT SCOPE ROW MEANS
--
-- §7 fixes the three scope types and says nothing about a member who has none. Two readings are
-- available and they are not close in consequence, so the choice is recorded here rather than left
-- to whoever reads the predicates.
--
--   ABSENT MEANS NOT NARROWED (chosen). A member with no scope row in a workspace is reached by
--   whatever their ROLE gives them. 010's own table comment already states this as the model —
--   "Role sets the ceiling, member scope narrows it and never widens it (§7)" — and the fixture
--   catalog asserts it as data: `user_owner_a` is "active owner of workspace_a" and
--   `user_viewer_a` is "viewer of workspace_a", with no scope named for either, while
--   `user_editor_a` is "editor scoped to business_a1 and page_a1". Under the other reading those
--   two identities would see nothing, and `owner-a-sees-business-a1` — a case that has passed since
--   batch 020 and that §8.1 and §12.6/1 both require — would become false.
--
--   ABSENT MEANS DENY (rejected). It would make a scope row the thing that GRANTS reach rather than
--   the thing that narrows it, which inverts §7's sentence; it would silently revoke Business and
--   Page access from every member who has not been scoped; and it would force either a special case
--   for `owner` — §7 gives the owner "ทุก capability ใน Workspace" unconditionally — or a fixture
--   asserting that an owner needs a scope row, which §7 does not say.
--
-- The asymmetry that follows is deliberate and is the whole of the design:
--
--   * A `Y` OPERATION IS NARROWED BY SCOPE WHERE SCOPE EXISTS. §8's legend reads `Y` as "ผ่านเมื่อ
--     active + capability + scope ตรง", so Business/Page SELECT is granted to every role AND is
--     subject to the member's scope. `app.member_scope_admits_*` answers that question, and it
--     answers TRUE for a member holding no scope row.
--   * A `P` OPERATION REQUIRES AN EXPLICIT SCOPE. `P` is "passes per policy/EXPLICIT capability",
--     and an absent row is not explicit. `app.member_scope_covers_*` answers that question, and it
--     answers FALSE for a member holding no scope row.
--
-- Two functions, opposite treatments of absence, both about the caller only. An unscoped editor
-- therefore gains NOTHING from this batch — which is what stops the editor's `P` from arriving as
-- an unconditional grant through the back door.
--
--
-- WHY THE SCOPE HELPERS ARE NOT OWNED BY app_authz, WHICH IS THE ONE THING HERE THAT LOOKS WRONG
--
-- Every membership question in 020 goes through a `SECURITY DEFINER` helper owned by `app_authz`,
-- and the obvious shape for this batch is a sixth such helper reading `app.workspace_member_scopes`.
-- **It is not available, and the thing that forbids it is the decision itself rather than taste.**
--
-- RFC-2026-020 §5/3, approved: "`app_authz` holds exactly one policy in the schema: `FOR SELECT` on
-- `app.workspace_members`". A helper owned by `app_authz` reading a NEW table needs two things that
-- sentence forbids — a policy on that table naming `app_authz` (a second policy) and a grant
-- outside the set §6.1/6 pins to "USAGE on schema app" plus four columns of one table. Three
-- separate controls would refuse it, and each of them is doing its job:
--
--   * `authzLint` in scripts/db/run.mjs asserts the policy count is exactly 1 and the grant set is
--     exactly that one; `scripts/db/authz-proofs.mjs` runs it against the CI container.
--   * `011_authorization_helpers.sql`'s OWN apply-time block raises when `app_authz` holds a number
--     of policies other than one. It is an APPLIED migration and invariant 1 forbids rewriting it,
--     so a second policy would make a merged batch's self-assertion false on any database the set
--     is re-applied to.
--   * An approved decision is not the implementing batch's to amend. 011 and 020 both refused a
--     cell rather than widen a rule that was in their way; widening §5/3 here to fit this batch is
--     the same move, one decision larger.
--
-- WHAT IS DONE INSTEAD, AND WHY IT IS NARROWER RATHER THAN MERELY DIFFERENT. The scope helpers are
-- `SECURITY INVOKER`. They read `app.workspace_member_scopes` AS THE CALLER, and the width of what
-- they can see is one policy — `workspace_member_scopes_select_own` below — which admits the
-- caller's own rows and nothing else. That policy is this file's, its predicate is pinned character
-- for character by a test, and it is the entire attack surface: no new role, no new grant to
-- `app_authz`, no second exemption, and `app_authz`'s structural exemption left exactly as
-- RFC-2026-020 approved it. The apply-time block at the foot of this file re-asserts that count
-- AFTER 021 has run, so "021 did not widen app_authz" is executed rather than promised.
--
-- The coupling 020's header warns about is the one thing to check here, and it does not hold. 020
-- rejects a policy that joins `app.workspace_members` because the scan would run as the caller and
-- the width of business visibility would become a function of a policy set belonging to ANOTHER
-- module and another batch — 010's own-row policy ORed with 011's roster policy, either of which
-- could move. `app.workspace_member_scopes` has no such policy set: this batch creates the table,
-- writes both of its policies, and pins the one the helpers read. The width is stated in this file
-- rather than inherited from somewhere else, which is the property 020 was protecting.
--
-- AND THE REASON NO FUNCTION BODY BELOW CALLS auth.uid(). A `SECURITY INVOKER` helper could have
-- filtered by identity itself instead of relying on the policy. It cannot: a `language sql` body is
-- re-parsed in the calling session, so `auth.uid()` there is resolved as the CALLER and needs USAGE
-- on schema `auth`, which the CI shim grants to nobody — while the same call inside a POLICY is
-- stored already resolved and needs only EXECUTE, which is why every policy in 010 and 020 uses it
-- and works. 011's own header records the platform half of this: schema `auth` is owned by
-- `supabase_admin` and `postgres` holds USAGE without grant option, so no migration of ours can
-- grant it. The identity therefore lives where it can live — in a policy — and the helpers read
-- what that policy leaves them.
--
--
-- THE DEFERRED FOREIGN KEY: NOT ADDED, AND THAT IS THE DECISION
--
-- §6's registry names "deferred FK" in this batch's description, and 020_business.sql:111-114 says
-- what it would be: a `current_version_id` pointer on `app.business_profiles` and
-- `app.page_context_profiles` referencing their version tables, which is a circular foreign key
-- between a table and its version table and therefore needs a `DEFERRABLE INITIALLY DEFERRED`
-- constraint. It is not created here, and 020's own sentence is the first reason:
--
--   "The version tables carry `version_number`, unique per parent, which answers 'which version is
--    latest' without one."
--
-- Three more, because a registry row mentioning a constraint is not a requirement for one:
--
--   1. IT WOULD BE A SECOND SOURCE OF TRUTH FOR "LATEST". `(business_profile_id, version_number)`
--      is unique and indexed; `max(version_number)` is the answer, and it cannot disagree with
--      itself. A pointer can point at a version that is not the newest, and no constraint
--      expressible in this schema says it must.
--   2. NOTHING COULD KEEP IT TRUE. 020 records that no command function exists for business.core,
--      so a client writes the current row and its version in two statements. A pointer written by
--      that same unbound path is a claim the database cannot check — and a DEFERRED constraint is
--      checked only at COMMIT, so it cannot be enforced by a policy or by RLS at all.
--   3. IT WOULD WIDEN THE CLIENT'S WRITE SURFACE ON A TENANT TABLE. `current_version_id` would need
--      an UPDATE grant on a column no client should choose the value of, on the two tables §8.1
--      guards most carefully.
--
-- §5 names no such column. Adding it because a registry row mentions it would be adding a
-- constraint nobody needs to a schema whose every other column had to be named by a document
-- first. If a later batch introduces a command function that writes the current row and its
-- version in one transaction, the pointer becomes checkable and that batch can propose it.
--
--
-- WHAT ELSE IS NOT HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO FIND
--
--   * NO WAY TO REMOVE A SCOPE. §8.1's "Invite/change scope" is `Y` for owner, and the CREATE half
--     is written below. There is no UPDATE and no DELETE — for any role — because §8.5 forbids a
--     broad user delete and requires a soft-delete "ที่ update typed lifecycle field", and NO
--     DOCUMENT NAMES A LIFECYCLE FIELD FOR THIS ROW. 010 refused to invent a status vocabulary for
--     invitations and used the timestamps §10 and §11.4 name by hand; there is no equivalent
--     sentence to lean on here, so the field is not invented. The consequence is stated rather than
--     absorbed: a member scope can be added and not removed through the request path, and removing
--     one is owed to whichever batch defines the lifecycle. It is refused at the PRIVILEGE layer —
--     no role holds UPDATE or DELETE on this table — so the refusal is attributable to an absent
--     grant rather than to a policy a later edit could widen, and two isolation cases assert it.
--
--   * NO SCOPE HISTORY. §5's row for this family reads "mutable + history". The history half would
--     be a `workspace_member_scope_versions` table, and §6's registry describes 021 as "member
--     business/page scope + deferred FK" and names no version table. Creating one would be
--     reserving a table no registry row gives this batch.
--
--   * NO ROSTER READ ON THIS TABLE. §8.1's "Member list SELECT" is `Y` for owner and admin, and 011
--     implemented it on `app.workspace_members` through a second permissive policy. The same shape
--     here would let an owner read another member's scope rows — which is what an owner
--     administering scopes needs — and it would also WIDEN WHAT THE SCOPE HELPERS SEE, because they
--     resolve the caller from this table's own policy rather than by calling `auth.uid()`, which no
--     function body of ours can do (see above). The two cannot both be had in this batch, and the
--     narrower one is taken: an owner may create a scope row and may not read back a row belonging
--     to somebody else. Owed, with the reason, to the batch that gives the helpers an identity
--     source that does not depend on this policy's width.
--
--   * NOTHING ABOUT WORKSPACE LIFECYCLE VISIBILITY. Unchanged from 020's header, which records why
--     a member of an `access_blocked` workspace can still read its business rows and whose it is to
--     fix. This batch narrows that surface; it does not touch the gap.


-- ---------------------------------------------------------------------------------------------
-- app.workspace_member_scopes — which Businesses and Pages a member's capability reaches.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` (§3.3), plus the Business and Page columns §3.3 names in full.
-- `scope_type` is `text` + a named CHECK (§3.2) over §7's three values and nothing invented.
--
-- The row carries no id of its own in any test, which is why the fixture catalog needs no symbol
-- for one: a scope is addressed by the member it belongs to and the target it names, and the
-- unique constraint below makes that pair name at most one row. `id` exists because every table
-- needs a primary key and because a natural key spanning two nullable columns cannot be one.
create table if not exists app.workspace_member_scopes (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  user_id                  uuid        not null,
  scope_type               text        not null,
  business_profile_id      uuid,
  page_context_profile_id  uuid,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  updated_by               uuid,
  constraint workspace_member_scopes_type_known
    check (scope_type in ('all_businesses', 'business', 'page')),
  -- The shape each scope type has, as a constraint rather than as a convention. Without it a row
  -- could claim `all_businesses` while naming a Business, and the helpers below would read the
  -- claim and the target from the same row and disagree about which one is the scope.
  constraint workspace_member_scopes_shape_matches_type check (
    (scope_type = 'all_businesses'
       and business_profile_id is null and page_context_profile_id is null)
    or (scope_type = 'business'
       and business_profile_id is not null and page_context_profile_id is null)
    or (scope_type = 'page'
       and business_profile_id is not null and page_context_profile_id is not null)
  ),
  -- §3.3's composite foreign keys. Every one of them references the WHOLE scope path, so a scope
  -- row cannot name a member, a Business or a Page belonging to a different Workspace — §4
  -- invariant 10, on the table whose entire job is to say which rows a member reaches.
  constraint workspace_member_scopes_member_fk
    foreign key (workspace_id, user_id)
    references app.workspace_members (workspace_id, user_id),
  constraint workspace_member_scopes_business_fk
    foreign key (workspace_id, business_profile_id)
    references app.business_profiles (workspace_id, id),
  constraint workspace_member_scopes_page_fk
    foreign key (workspace_id, business_profile_id, page_context_profile_id)
    references app.page_context_profiles (workspace_id, business_profile_id, id),
  -- NULLS NOT DISTINCT, because the default treats two `all_businesses` rows for the same member as
  -- different rows — both of their target columns are null, and null is not equal to null. The
  -- point of this constraint is that a member holds each scope at most once, and under the default
  -- spelling it would hold for `business` and `page` rows and silently not hold for the one scope
  -- type whose target columns are empty.
  constraint workspace_member_scopes_one_per_target
    unique nulls not distinct
      (workspace_id, user_id, scope_type, business_profile_id, page_context_profile_id)
);

comment on table app.workspace_member_scopes is
  'Owner: A1 Identity/Business (identity.core, batch 021). Canonical scope workspace_id (§3.3), '
  'narrowed to a Business or a Page by the columns §3.3 names in full. Sensitivity PII-2/AUTH-3; '
  'retention AUTH-HISTORY. §7: role sets the ceiling and member scope narrows it — A MEMBER WITH NO '
  'ROW HERE IS NOT NARROWED, which is why app.member_scope_admits_* answers true for one and '
  'app.member_scope_covers_* answers false. Written by the owner (§8.1 "Invite/change scope": Y); '
  'no role holds UPDATE or DELETE, because §8.5 forbids a broad delete and no document names a '
  'typed lifecycle field for this row.';
comment on column app.workspace_member_scopes.user_id is
  'PII-2/AUTH-3. The member the scope belongs to, tied to app.workspace_members by a composite '
  'foreign key over (workspace_id, user_id) so a scope cannot be written for a member of another '
  'Workspace. It is also the RLS predicate column: a caller reads its own rows and no other.';
comment on column app.workspace_member_scopes.scope_type is
  'AUTH-3. §7''s three scope types and nothing else, as text + a named CHECK (§3.2). The companion '
  'CHECK ties each value to the shape it implies, so a row cannot claim one scope and carry the '
  'target of another.';
comment on column app.workspace_member_scopes.business_profile_id is
  'TENANT-1/AUTH-3. Null for an all_businesses scope; the Business for the other two. A `page` row '
  'carries it as well as the Page, which is what lets a page-scoped member read the Business their '
  'Page hangs from — otherwise the Page would be unreachable.';
comment on column app.workspace_member_scopes.page_context_profile_id is
  'TENANT-1/AUTH-3. Set only for a `page` scope, spelled in full because §3.3 forbids the '
  'abbreviated synonym outright.';
comment on column app.workspace_member_scopes.created_by is
  'AUTH-3. The acting member — the owner who granted the scope — which is not the same person as '
  'user_id and is asserted equal to the JWT subject by the INSERT policy (§8.5). Not FK-'
  'constrained: §11.2 requires the actor field be anonymized rather than cascade-deleted.';
comment on column app.workspace_member_scopes.updated_by is 'AUTH-3. See created_by.';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- Already covered by a constraint's own index, and therefore NOT repeated below:
--
--   (workspace_id, user_id)        — the member foreign key, AND the pair every policy and every
--                                    helper below filters on. workspace_member_scopes_one_per_target
--                                    leads with exactly those two columns.
--   created_by / updated_by        — not FK-constrained and named in no predicate.

-- Both remaining foreign keys, in one index: the page key is (workspace_id, business_profile_id,
-- page_context_profile_id) and the business key is its own leading pair, so a second index over the
-- pair would duplicate a prefix rather than support anything new.
create index if not exists workspace_member_scopes_target_idx
  on app.workspace_member_scopes (workspace_id, business_profile_id, page_context_profile_id);

-- §3.3 keyset pagination, "(created_at desc, id desc)", for the list that grows with the tenant:
-- the scopes of one member.
create index if not exists workspace_member_scopes_member_keyset_idx
  on app.workspace_member_scopes (workspace_id, user_id, created_at desc, id desc);


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every MUTABLE row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
--
-- The trigger is INERT TODAY and that is said rather than hidden: no role holds UPDATE on this
-- table, so nothing can fire it. It is here because §5 classifies this family "mutable + history"
-- and because the alternative — omitting updated_at, as 020's version tables do — would be
-- declaring the row IMMUTABLE, which §3.2 says of versions, evidence, decisions, usage, audit and
-- publish history and does not say of a member scope. The batch that names the lifecycle field
-- adds a policy, not a column, to a table that may by then hold rows.
drop trigger if exists set_updated_at on app.workspace_member_scopes;
create trigger set_updated_at before update on app.workspace_member_scopes
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
alter table app.workspace_member_scopes enable row level security;
alter table app.workspace_member_scopes force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges.
-- ---------------------------------------------------------------------------------------------
--
-- `anon` is granted nothing, here as everywhere: §8.5 gives anonymous no tenant policy, so an
-- anonymous read is refused by the privilege system on the SCHEMA before RLS is reached.
--
-- Column-scoped, per operation. Two absences are load-bearing:
--
--   * NO UPDATE and NO DELETE, for any role. See the header: §8.5 forbids the broad delete and no
--     document names the typed lifecycle field that would replace it, so the refusal is a
--     privilege-layer denial the isolation suite can attribute to this table by name.
--   * `id` is absent from the INSERT grant. §3.2 lets the application choose an aggregate id before
--     the transaction; a member scope is not an aggregate root, nothing addresses one by id, and a
--     client-chosen id here would be a value with no reader.
grant select (id, workspace_id, user_id, scope_type, business_profile_id, page_context_profile_id,
              created_at, updated_at, created_by, updated_by)
  on app.workspace_member_scopes to authenticated;
grant insert (workspace_id, user_id, scope_type, business_profile_id, page_context_profile_id,
              created_by, updated_by)
  on app.workspace_member_scopes to authenticated;

-- app_worker holds privileges and NO policy, for the reason 010 and 020 both record: without a
-- grant, a service refusal is 42501 either way and proves only that somebody forgot a GRANT; with
-- the grant and no policy, an empty read can only have come from RLS, and a service role that had
-- quietly acquired BYPASSRLS would SUCCEED where the suite demands a refusal. It gets exactly the
-- two verbs a client role has, because a verb no client and no policy holds would be a privilege
-- nobody reviewed against a caller.
grant select, insert on app.workspace_member_scopes to app_worker;

-- app_command and app_maintenance are granted nothing. There is no specified command surface for
-- member scope, and the retention path is batch 160.


-- ---------------------------------------------------------------------------------------------
-- The scope helpers. SECURITY INVOKER, and the header says at length why.
-- ---------------------------------------------------------------------------------------------
--
-- Each reads `app.workspace_member_scopes` as the caller, so each sees exactly what
-- `workspace_member_scopes_select_own` admits: the caller's own rows under an active membership.
-- That is what makes every one of them an answer about the CALLER, and the isolation suite asserts
-- it by calling one as an identity that is scoped differently and as one that is not scoped at all.
--
-- `set search_path = ''` on all five, so every object is resolved by its full name and none of them
-- can be redirected by a caller's search path. §8.5 asks it of SECURITY DEFINER functions; it costs
-- nothing here and the reason it matters is the same.
--
-- None calls auth.uid(): a `language sql` body is re-parsed in the calling session and would need
-- USAGE on schema `auth`, which the CI shim grants to nobody and which no migration of ours can
-- grant on the platform (011's header, measured). The identity lives in the policy, where the call
-- is stored already resolved.

-- Is the caller narrowed at all in this workspace? This is the function that decides what an ABSENT
-- scope row means, and it is separate from the two below so that the decision has one home.
create or replace function app.member_scope_is_narrowed(workspace uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from app.workspace_member_scopes s
     where s.workspace_id = workspace
  )
$$;

comment on function app.member_scope_is_narrowed(uuid) is
  'True when the CALLER holds at least one member scope row in this workspace. It is the whole of '
  'batch 021''s reading of §7: a member with no row is not narrowed, so this is false for them and '
  'app.member_scope_admits_* is true. SECURITY INVOKER — what it can see is '
  'workspace_member_scopes_select_own and nothing wider.';

-- Does an EXPLICIT scope row cover this Business? False for a member with no scope rows, which is
-- what makes it the right question for a `P` cell — "passes per explicit capability", and an
-- absent row is not explicit.
--
-- A `page` row counts here, on its Business. A member scoped to one Page must be able to read the
-- Business that Page hangs from, or the Page is addressable and unreachable; what a page scope does
-- NOT do is admit the Business's other Pages, which is app.member_scope_covers_page's business.
create or replace function app.member_scope_covers_business(workspace uuid, business uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from app.workspace_member_scopes s
     where s.workspace_id = workspace
       and (s.scope_type = 'all_businesses' or s.business_profile_id = business)
  )
$$;

comment on function app.member_scope_covers_business(uuid, uuid) is
  'True when the CALLER holds a scope row that explicitly covers this Business — all_businesses, a '
  'business row naming it, or a page row beneath it. False when the caller holds no scope row at '
  'all, which is what distinguishes it from app.member_scope_admits_business and what makes it the '
  'predicate a §8.1 `P` cell is written against.';

-- The same question one level down. §7: a `business` scope is "จำกัด Business เดียว รวม Page ใต้
-- Business ตาม policy" — one Business, including the Pages under it — so a business row admits
-- every Page beneath it, and a page row admits exactly one.
create or replace function app.member_scope_covers_page(workspace uuid, business uuid, page_context uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from app.workspace_member_scopes s
     where s.workspace_id = workspace
       and (s.scope_type = 'all_businesses'
            or (s.scope_type = 'business' and s.business_profile_id = business)
            or (s.scope_type = 'page' and s.page_context_profile_id = page_context))
  )
$$;

comment on function app.member_scope_covers_page(uuid, uuid, uuid) is
  'True when the CALLER holds a scope row that explicitly covers this Page. §7 gives a `business` '
  'scope every Page beneath it and a `page` scope exactly one, and this is that sentence. False for '
  'a caller holding no scope row.';

-- The `Y` form. §8's legend reads Y as "ผ่านเมื่อ active + capability + scope ตรง", so an operation
-- the matrix grants to every role is still subject to the member's scope where one exists — and is
-- not narrowed where none does.
create or replace function app.member_scope_admits_business(workspace uuid, business uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not app.member_scope_is_narrowed(workspace)
      or app.member_scope_covers_business(workspace, business)
$$;

comment on function app.member_scope_admits_business(uuid, uuid) is
  'True when the CALLER''s member scope does not exclude this Business — either because they hold '
  'no scope row in this workspace (§7: scope narrows, it does not grant) or because a row covers '
  'it. It is NOT a membership test and must be ANDed with one; the restrictive policies below are '
  'that AND, evaluated beside batch 020''s permissive membership policies.';

create or replace function app.member_scope_admits_page(workspace uuid, business uuid, page_context uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not app.member_scope_is_narrowed(workspace)
      or app.member_scope_covers_page(workspace, business, page_context)
$$;

comment on function app.member_scope_admits_page(uuid, uuid, uuid) is
  'The Page form of app.member_scope_admits_business. Not a membership test; see that comment.';

-- §8.5: EXECUTE is revoked from PUBLIC and granted explicitly. A helper reachable by PUBLIC is
-- reachable by `anon`, which is granted nothing anywhere in this schema.
--
-- All five are granted to `authenticated` and to nobody else, because all five are called from
-- policies written `TO authenticated` and a policy's function call is evaluated as the caller. That
-- includes the three a policy does not name directly: `member_scope_admits_*` call them, and they
-- run as the caller too, so a grant to the caller is what makes them reachable at all.
--
-- Granting them is not a widening. Each answers only about the caller — the table's own policy is
-- what makes that true — so an RPC call teaches the caller nothing it could not read from
-- app.workspace_member_scopes itself, which it is already granted SELECT on. The isolation suite
-- asserts that rather than assuming it.
revoke all on function app.member_scope_is_narrowed(uuid) from public;
revoke all on function app.member_scope_covers_business(uuid, uuid) from public;
revoke all on function app.member_scope_covers_page(uuid, uuid, uuid) from public;
revoke all on function app.member_scope_admits_business(uuid, uuid) from public;
revoke all on function app.member_scope_admits_page(uuid, uuid, uuid) from public;

grant execute on function app.member_scope_is_narrowed(uuid) to authenticated;
grant execute on function app.member_scope_covers_business(uuid, uuid) to authenticated;
grant execute on function app.member_scope_covers_page(uuid, uuid, uuid) to authenticated;
grant execute on function app.member_scope_admits_business(uuid, uuid) to authenticated;
grant execute on function app.member_scope_admits_page(uuid, uuid, uuid) to authenticated;


-- ---------------------------------------------------------------------------------------------
-- Policies on the new table. TO authenticated, for the paths §8.1 grants.
-- ---------------------------------------------------------------------------------------------

-- THE POLICY THE WHOLE BATCH RESTS ON. It is the only thing standing between a scope helper and
-- another member's scope rows, and its width is pinned character for character by
-- tests/db/identity/identity-isolation.test.mjs — the same control RFC-2026-020 §4 chose for
-- app_authz's single policy, applied to the one predicate here that would silently break the
-- helpers if it widened.
--
-- Two conjuncts and both are load-bearing. `user_id = (select auth.uid())` is what makes every
-- helper an answer about the caller; `app.is_active_member(workspace_id)` is §7's "only status
-- active grants access" and is what makes a suspended member see zero rows in this table as well as
-- in every other. Membership is read through the batch 011 helper and never by joining
-- app.workspace_members, per RFC-2026-020 §5/5.
drop policy if exists workspace_member_scopes_select_own on app.workspace_member_scopes;
create policy workspace_member_scopes_select_own on app.workspace_member_scopes
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and app.is_active_member(workspace_id)
  );

-- §8.1 "Invite/change scope" = Y for owner, P for admin. Only the Y is written; admin's P needs the
-- capability set no document defines, exactly as 010 left the invitation half.
--
-- §8.5: an INSERT policy checks the whole scope in WITH CHECK, and a user action asserts
-- `created_by = (select auth.uid())`. Here the two are visibly different people — created_by is the
-- owner granting the scope, user_id is the member receiving it — which is precisely why the
-- assertion matters: without it an owner could write a scope row attributed to somebody else.
--
-- The row's Workspace, Business and Page are checked by the composite foreign keys rather than by a
-- clause here, so an unrelated triple fails with 23503 for every caller including one this policy
-- would admit (§4 invariant 10).
drop policy if exists workspace_member_scopes_insert_owner on app.workspace_member_scopes;
create policy workspace_member_scopes_insert_owner on app.workspace_member_scopes
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) = 'owner'
  );

-- No UPDATE and no DELETE policy, and no grant for either. See the header.


-- ---------------------------------------------------------------------------------------------
-- The narrowing. RESTRICTIVE policies on batch 020's four tables.
-- ---------------------------------------------------------------------------------------------
--
-- WHY RESTRICTIVE, WHICH IS THE ONE MECHANISM THIS FILE USES THAT NO EARLIER BATCH DOES.
--
-- 010, 011 and 020 all say their predicates were written to be WIDENED by a later batch, because
-- permissive policies OR together. That is true of everything those batches deferred EXCEPT this:
-- §12.6 assertion 2 requires `user_editor_a` to see Business A1 and Page A1 and NEVER A2 or Page
-- A2, and §8.6 cases 3 and 4 require the same as denials. Those are NARROWINGS of what
-- `business_profiles_select_active_member` admits today, and no permissive policy can narrow
-- anything. The alternatives were to rewrite 020 — forbidden by migration invariant 1, and 020 is
-- applied — or to add a policy that ANDs. Postgres spells that `AS RESTRICTIVE`, and it is the
-- honest shape: 020 implemented §8.1's `Y` as active membership because the scope table did not
-- exist and said so in its own header, and this is the second half of that cell arriving.
--
-- ONE POLICY PER TABLE, `FOR ALL`, rather than four per table. A restrictive policy applies its
-- USING to SELECT, UPDATE and DELETE and its WITH CHECK to INSERT and UPDATE, so the same predicate
-- covers every operation each table offers. Splitting it per command would be four places for the
-- scope rule to be forgotten in.
--
-- WHAT THEY DO TO AN UNSCOPED MEMBER: nothing. `member_scope_admits_*` is true for a caller holding
-- no scope row, so an owner, an admin or a viewer who has never been scoped sees and writes exactly
-- what batch 020 gave them. Every case batch 020 wrote for those identities still passes, which is
-- how this file's own claim about absence is checked.
--
-- WHAT THEY DO TO A SERVICE IDENTITY: nothing, and that is not an exemption. They are written TO
-- authenticated; `app_worker` holds no policy on these tables at all and is refused by RLS before
-- any of this is consulted, which is the assertion RFC-2026-017 §7 owes and which batch 020's cases
-- already make.

drop policy if exists business_profiles_scope_narrows_member on app.business_profiles;
create policy business_profiles_scope_narrows_member on app.business_profiles
  as restrictive
  for all to authenticated
  using (app.member_scope_admits_business(workspace_id, id))
  with check (app.member_scope_admits_business(workspace_id, id));

drop policy if exists business_profile_versions_scope_narrows_member on app.business_profile_versions;
create policy business_profile_versions_scope_narrows_member on app.business_profile_versions
  as restrictive
  for all to authenticated
  using (app.member_scope_admits_business(workspace_id, business_profile_id))
  with check (app.member_scope_admits_business(workspace_id, business_profile_id));

drop policy if exists page_context_profiles_scope_narrows_member on app.page_context_profiles;
create policy page_context_profiles_scope_narrows_member on app.page_context_profiles
  as restrictive
  for all to authenticated
  using (app.member_scope_admits_page(workspace_id, business_profile_id, id))
  with check (app.member_scope_admits_page(workspace_id, business_profile_id, id));

drop policy if exists page_context_profile_versions_scope_narrows_member on app.page_context_profile_versions;
create policy page_context_profile_versions_scope_narrows_member on app.page_context_profile_versions
  as restrictive
  for all to authenticated
  using (app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id))
  with check (app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id));


-- ---------------------------------------------------------------------------------------------
-- The editor's `P`. Permissive, so it ORs with batch 020's owner-and-admin policies.
-- ---------------------------------------------------------------------------------------------
--
-- §8.1: "Business/Page INSERT/UPDATE/archive | Y | Y | P | N | N | P". 020 implemented the two `Y`
-- cells and refused the editor's `P` because the table carrying its condition did not exist. This
-- is that condition: an active EDITOR whose member scope EXPLICITLY covers the row.
--
-- `covers`, not `admits`, and the difference is the whole reason this is `P` rather than `Y`. An
-- editor who has never been scoped holds no explicit capability, so `covers` is false and they gain
-- nothing from this batch — the editor cases batch 020 wrote as default-denials keep failing for
-- the identity they were written about, and only a scoped editor passes.
--
-- Each policy still asserts `created_by = (select auth.uid())` on INSERT (§8.5) and carries both
-- USING and WITH CHECK on UPDATE, because a permissive policy that ORed past either would let the
-- editor do something no owner may do.
--
-- The restrictive policies above ALSO apply to every statement below, which is deliberate
-- redundancy in the safe direction: even if one of these predicates were widened by a later edit,
-- a scoped editor still could not reach a row their scope excludes.

-- Creating a Business is the case that shows `covers` doing its job. The new row's `id` is not
-- named by any scope row, so only an `all_businesses` editor passes — an editor scoped to one
-- Business cannot create a second one, which is what "capability limited to that Business" means.
drop policy if exists business_profiles_insert_scoped_editor on app.business_profiles;
create policy business_profiles_insert_scoped_editor on app.business_profiles
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) = 'editor'
    and app.member_scope_covers_business(workspace_id, id)
  );

drop policy if exists business_profiles_update_scoped_editor on app.business_profiles;
create policy business_profiles_update_scoped_editor on app.business_profiles
  for update to authenticated
  using (
    app.workspace_member_role(workspace_id) = 'editor'
    and app.member_scope_covers_business(workspace_id, id)
  )
  with check (
    app.workspace_member_role(workspace_id) = 'editor'
    and app.member_scope_covers_business(workspace_id, id)
  );

-- §11.3, repeated here rather than inherited. 020's page INSERT policy refuses a Page under an
-- archived Business, and a PERMISSIVE policy ORs — so omitting the clause here would let a scoped
-- editor do the one thing 020 wrote that policy to prevent. It is the same subquery, in the same
-- fail-closed direction: it runs as the caller, so app.business_profiles' own policy set applies to
-- it and any narrowing there can only make this INSERT refuse more.
drop policy if exists page_context_profiles_insert_scoped_editor on app.page_context_profiles;
create policy page_context_profiles_insert_scoped_editor on app.page_context_profiles
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) = 'editor'
    and app.member_scope_covers_page(workspace_id, business_profile_id, id)
    and exists (
      select 1 from app.business_profiles b
      where b.workspace_id = page_context_profiles.workspace_id
        and b.id = page_context_profiles.business_profile_id
        and b.archived_at is null
    )
  );

drop policy if exists page_context_profiles_update_scoped_editor on app.page_context_profiles;
create policy page_context_profiles_update_scoped_editor on app.page_context_profiles
  for update to authenticated
  using (
    app.workspace_member_role(workspace_id) = 'editor'
    and app.member_scope_covers_page(workspace_id, business_profile_id, id)
  )
  with check (
    app.workspace_member_role(workspace_id) = 'editor'
    and app.member_scope_covers_page(workspace_id, business_profile_id, id)
  );

-- The immutable version tables take an INSERT and nothing else, which is 020's reading of §8.1 and
-- is unchanged here: the producing operation is granted and only mutation of its record is denied.
-- The editor's version INSERT follows the editor's Business/Page write, because a version is the
-- record of exactly that operation.
drop policy if exists business_profile_versions_insert_scoped_editor on app.business_profile_versions;
create policy business_profile_versions_insert_scoped_editor on app.business_profile_versions
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) = 'editor'
    and app.member_scope_covers_business(workspace_id, business_profile_id)
  );

drop policy if exists page_context_profile_versions_insert_scoped_editor on app.page_context_profile_versions;
create policy page_context_profile_versions_insert_scoped_editor on app.page_context_profile_versions
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) = 'editor'
    and app.member_scope_covers_page(workspace_id, business_profile_id, page_context_profile_id)
  );

-- No UPDATE and no DELETE policy on either version table, and no grant for either. §8.1's version
-- row is `N N N N N N` and batch 020 implemented it as absent grants; this batch does not touch
-- that, and its own apply-time block re-asserts it below rather than assuming it survived.


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004, 011 and 020 use: a claim that is only a comment is a claim nobody checks.
-- These are the properties of THIS batch answerable from the catalog of the database being
-- migrated, without a committed snapshot and without a test harness. The text half lives in
-- tests/db/identity/identity-isolation.test.mjs and the live behavioural half is
-- `make db-rls-smoke`.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only
-- by a superuser, and a migration that needs one to apply is a migration that cannot be applied on
-- the platform it targets, where `postgres` is not a superuser.
do $$
declare
  offending text;
  count_of  integer;
begin
  -- THE ASSERTION THIS FILE OWES MOST. RFC-2026-020 §5/3 gives app_authz exactly one policy, and
  -- the header's argument for SECURITY INVOKER scope helpers is worth nothing unless that is still
  -- true AFTER this batch has run. 011's own block asserts it at 011's apply time, which is before
  -- this file exists; this asks the same question on the other side.
  select count(*) into count_of
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (p.polroles) and r.rolname = 'app_authz');
  if count_of <> 1 then
    raise exception 'after batch 021, app_authz holds % policies in schema app; RFC-2026-020 §5/3 gives it exactly one', count_of
      using hint = 'Batch 021 reads member scope through SECURITY INVOKER helpers precisely so that '
                   'this number does not move. If it has moved, the decision was amended by a '
                   'migration rather than by an RFC.';
  end if;

  -- And the grant half of the same claim: app_authz reaches nothing this batch created.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'workspace_member_scopes'
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- ENABLE and FORCE on the table this batch creates. The two are different catalog columns and the
  -- data package's own lint rule reads only the first (RFC-2026-016).
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'workspace_member_scopes'
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table % does not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending;
  end if;

  -- No role holds UPDATE or DELETE on the scope table. This is the header's "a scope can be added
  -- and not removed" as the privilege system holds it, asserted against the live ACLs rather than
  -- against the text of the grants above — because a grant made by a LATER batch would not appear
  -- in this file at all. `has_any_column_privilege` for UPDATE, so a column-scoped grant is caught
  -- as well as a table-wide one; DELETE has no column form.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'workspace_member_scopes'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'a member scope row can be updated or deleted through the request path: %', offending
      using hint = '§8.5 has no broad user delete and requires a soft delete through a typed lifecycle '
                   'field. No document names one for this row, so batch 021 grants neither verb rather '
                   'than inventing the field. Adding one is a decision, not a grant.';
  end if;

  -- Batch 020's version-table immutability, re-asserted after this batch has added policies to
  -- those two tables. 021 adds an INSERT policy to each and a restrictive FOR ALL; neither is an
  -- UPDATE or a DELETE policy, and this is what says so against the catalog rather than the text.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('business_profile_versions', 'page_context_profile_versions')
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'batch 021 left an UPDATE or DELETE policy on an immutable version table: %', offending;
  end if;

  -- The four narrowing policies are RESTRICTIVE. A permissive policy with the same name and the
  -- same predicate would WIDEN each table instead of narrowing it — every member would see every
  -- Business their scope admits OR their membership admits, which is what batch 020 already does —
  -- and the whole of §12.6/2's second half would silently stop being implemented. polpermissive is
  -- the one catalog column that tells the two apart.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and pol.polname in ('business_profiles_scope_narrows_member',
                         'business_profile_versions_scope_narrows_member',
                         'page_context_profiles_scope_narrows_member',
                         'page_context_profile_versions_scope_narrows_member')
     and pol.polpermissive;
  if offending is not null then
    raise exception 'a scope-narrowing policy is PERMISSIVE and must be RESTRICTIVE: %', offending;
  end if;

  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and pol.polname in ('business_profiles_scope_narrows_member',
                         'business_profile_versions_scope_narrows_member',
                         'page_context_profiles_scope_narrows_member',
                         'page_context_profile_versions_scope_narrows_member');
  if count_of <> 4 then
    raise exception 'batch 021 wrote % scope-narrowing policies and batch 020 created four tables to narrow', count_of
      using hint = 'business_profiles, business_profile_versions, page_context_profiles and '
                   'page_context_profile_versions. A version row holds what a Business or Page used '
                   'to say, so a narrowing that skipped one would leave the history readable to a '
                   'member the current row is hidden from.';
  end if;

  -- No policy this batch writes may name a service or anonymous role. §8.1 gives the service `P` on
  -- identity operations and anonymous nothing anywhere; a `TO app_worker` policy here would add a
  -- permission the matrix does not grant and would make the service denial unfalsifiable.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'workspace_member_scopes'
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('app_worker', 'app_command', 'app_maintenance', 'anon'));
  if offending is not null then
    raise exception 'batch 021 wrote a policy for a service or anonymous role: %', offending;
  end if;

  -- RFC-2026-017 §3, asked here for the same reason batch 020 asks it: scripts/db/run.mjs holds
  -- every tenant table to this rule against the COMMITTED SNAPSHOT, and this batch is deliberately
  -- not applied to the instance that snapshot describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'workspace_member_scopes'
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'app.workspace_member_scopes is owned by a role that must not own a table: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
