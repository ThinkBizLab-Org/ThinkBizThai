-- Batch 030 — industry: the pack catalog, its published versions, and the Business assignment.
--
-- Owner: A2 Industry. The migration ownership registry (§6) reserves 030 to this package and
-- describes it as "pack/version/assignment", depending on 020.
--
-- Depends on: 000 (schemas, private.set_updated_at), 001 (app_worker), 010 (app.workspaces),
-- 011 (app.is_active_member, app.workspace_member_role), 020 (app.business_profiles and the unique
-- key its children reference), 021 (app.member_scope_covers_business,
-- app.member_scope_admits_business). All six are merged; migration invariant 1 forbids rewriting
-- any of them and NOTHING BELOW DOES — every statement here creates a new object or attaches a
-- policy to one this file created, and no `drop policy` names a policy another batch wrote. A test
-- asserts that pairing rather than trusting this sentence.
--
--
-- THIS IS THE FIRST BATCH WITH GLOBAL ROWS, AND THAT IS THE WHOLE OF WHAT IS NEW
--
-- §5's inventory row reads:
--
--   | `industry.core` | pack catalog/versions/assignments | global/business | published immutable
--   | PUBLIC-0/TENANT-1 | CATALOG/HISTORY | A2 Industry |
--
-- Two scopes, two sensitivities, in one row. Every table written so far is tenant-owned: one
-- workspace, one boundary, a policy that resolves membership. `app.industry_packs` and
-- `app.industry_pack_versions` are neither. They carry NO `workspace_id`, they belong to no tenant,
-- and §3.3 requires the canonical scope field on "ทุก tenant-owned row" — which these are not. A
-- workspace_id on a global row would be a scope column with nothing to scope, and the first policy
-- that read it would be narrowing a catalog by a tenant that does not own it.
--
-- The consequence runs through every decision below: THE TENANT BOUNDARY IS NOT THE CONTROL HERE.
-- What refuses a caller on a global table is the privilege system and row level security with no
-- policy at all, and the isolation cases assert exactly that rather than a cross-tenant read that
-- would be meaningless.
--
--
-- THE DECISION THIS BATCH HAD TO MAKE: §9.1 SAYS `PUBLIC-0` MAY BE PROJECTED TO A CLIENT, AND
-- `RFC-2026-012` SAYS THE ALLOWLIST THAT WOULD CARRY THAT PROJECTION IS EMPTY
--
-- §9.1 classifies `PUBLIC-0` — "published industry catalog, public model label" — with "Client
-- projection: allowed". `RFC-2026-012` (approved 2026-09-02) decides:
--
--   2. "Direct client reads only through named `security_invoker` views, never a base table —
--      including where a base table would be safe today. Column drift is silent, and RLS filters
--      rows, not columns."
--   3. "The read allowlist starts empty. Each entry is added by RFC, not by a pull request. The
--      inventory below is the CLASSIFICATION, not the allowlist."
--
-- Its inventory then records `industry pack catalog + assignments | permitted | PUBLIC-0`, and says
-- in terms that this row is an INFERENCE from §9 rather than a statement of the baseline, because
-- §8 has no row for it at all.
--
-- THE TWO DO NOT CONTRADICT, AND THE RFC'S OWN "CRUX" SECTION IS WHY. That section is about which
-- TIER issues a statement: `auth.uid()` reads a claim on the SESSION, so a policy "constrains the
-- content of the row and the identity of the session; it says nothing about the tier, and RLS has
-- no predicate that could." §9.1 is a statement of the same kind one level up — it classifies
-- CONTENT, and says a projection of PUBLIC-0 content may be shown to a client. It names no object,
-- no tier and no mechanism. `RFC-2026-012` names all three, and it sits at position 1 of
-- `CONTRIBUTING_AGENTS.md`'s conflict order where the data package sits at 4.
--
-- So §9.1 licenses the CONTENT and `RFC-2026-012` licenses the OBJECT, and batch 030 can satisfy
-- only the first. **No client role is granted anything on `app.industry_packs` or
-- `app.industry_pack_versions` by this batch, and no `security_invoker` view over them is created.**
-- The published catalog exists, is immutable, and is unreachable from the request path.
--
-- WHY NOT JUST WRITE THE VIEW. Because creating a named `security_invoker` view over these tables
-- and granting `authenticated` SELECT on it IS the allowlist entry — the allowlist is the set of
-- such views — and §3 gives that act to an RFC and takes it away from a pull request. The measured
-- state agrees: `db/foundation/lint/catalog-snapshot.json` records `exposed_views: []`.
--
-- AND WHY THE VIEW ALONE WOULD NOT BE ENOUGH, WHICH IS WORTH RECORDING BECAUSE IT MAKES THE RFC
-- LARGER THAN IT LOOKS. §8.5 requires an exposed view to be `security_invoker = true`, and such a
-- view is evaluated with the CALLER's privileges on the underlying table. So the RFC that adds the
-- entry must add the view AND a column-scoped SELECT grant to `authenticated` on the base table
-- AND a SELECT policy admitting it, because these tables are FORCE ROW LEVEL SECURITY with no
-- policy. Three objects, one decision, one review. Leaving all three absent is what keeps it one
-- decision instead of three-quarters of one already made here.
--
-- WHY THE PRECEDENT OF 010, 020 AND 021 DOES NOT REACH THIS TABLE. Those batches do grant
-- `authenticated` SELECT on base tables, which `RFC-2026-012` §2 also names — and that gap is real,
-- is inherited, and is recorded in the work package's open blockers rather than quietly extended
-- here. What makes it inherited rather than repeated is that every one of those grants is bounded
-- by a predicate RLS can express: `app.is_active_member(workspace_id)`. A leak reaches one
-- workspace, and the isolation suite proves the boundary. A GLOBAL catalog has no such predicate.
-- The only thing between an authenticated caller and the whole table would be the column grant —
-- which is exactly the failure §2 names, "column drift is silent, and RLS filters rows, not
-- columns". §2's reason is prospective on a tenant table and load-bearing here, so this is the
-- batch where it is obeyed rather than the batch where the debt grows.
--
-- `anon` IS GRANTED NOTHING, HERE AS EVERYWHERE, AND THAT IS NOT AN OVERSIGHT ABOUT A PUBLIC
-- CATALOG. A published catalog is the one thing in this schema an anonymous reader could plausibly
-- be given, and §8.5 says anonymous holds no tenant policy while saying nothing about a global one.
-- Granting it would be deciding that the product has an unauthenticated surface — a security
-- decision with an owner (A1 Security, through an RFC), not a grant a batch makes because the row
-- is classified PUBLIC-0. It is refused here and recorded as owed.
--
--
-- WHO CAN READ THE CATALOG THEN, AND THE HONEST ANSWER
--
-- Nobody, through any policy this batch writes. §8's four matrices contain NO ROW for an industry
-- pack — not under identity/business (§8.1), not under knowledge/research/content (§8.2), nowhere —
-- so there is no cell to implement and every operation is denied by default. `app_worker` is
-- granted SELECT and holds NO POLICY, which is 010's shape and 010's reason: without the grant a
-- service refusal is 42501 either way and proves only that somebody forgot a GRANT; with the grant
-- and no policy an empty read can only have come from row level security, and a service role that
-- had quietly acquired BYPASSRLS would SUCCEED where the suite demands zero rows.
--
-- The Core Runtime does have to read packs — the industry pack contract says "Core Runtime เป็นผู้
-- load, validate, resolve และ pin version" — and that caller does not exist yet. 010's sentence
-- holds: "a grant issued ahead of the thing that needs it is a grant nobody reviews against a
-- caller". The policy that lets the resolver read the catalog is owed to the batch that brings the
-- resolver, which by §6's registry is 070 (research) at the earliest, and to the RFC that decides
-- whether the request path reads it directly.
--
--
-- WHAT `app.industry_assignments` IS, AND WHY IT HAS A FULL POLICY SET WHEN THE CATALOG HAS NONE
--
-- §4's ERD names three entities and their relations exactly:
--
--   INDUSTRY_PACK ||--o{ INDUSTRY_PACK_VERSION : versions
--   BUSINESS_PROFILE ||--o| INDUSTRY_ASSIGNMENT : uses
--   INDUSTRY_PACK_VERSION ||--o{ INDUSTRY_ASSIGNMENT : pinned
--
-- `||--o|` is zero-or-one: a Business holds at most one industry assignment, which is the unique
-- constraint below rather than a convention. The assignment is TENANT-1, carries `workspace_id` and
-- `business_profile_id`, and is a Business's own configuration — which is what gives it a §8.1 row
-- when the catalog has none. 020's header said so first, while deferring it:
--
--   "The attribute surface a business profile will eventually carry lives in other modules by the
--    registry's own assignment: THE INDUSTRY PACK AND ITS ASSIGNMENT ARE BATCH 030, knowledge ... is
--    040".
--
-- So §8.1's Business rows govern it, and this batch implements them with 020's and 021's own
-- policies rather than inventing a shape:
--
--   | Business/Page SELECT                | Y | Y | Y | Y | Y | P |
--   | Business/Page INSERT/UPDATE/archive | Y | Y | P | N | N | P |
--
-- SELECT is `Y` for every built-in role, so the predicate tests ACTIVE MEMBERSHIP and not role.
-- INSERT/UPDATE is `Y` for owner and admin and `P` for editor, and 021 supplies what `P` needs: an
-- editor whose MEMBER SCOPE EXPLICITLY COVERS the Business. `covers`, never `admits` — an editor
-- who has never been scoped holds no explicit capability and gains nothing here, which is 021's
-- distinction and this batch consumes it rather than re-deciding it.
--
-- MEMBERSHIP AND SCOPE ARE READ THROUGH THE HELPERS AND NEVER BY JOINING THE TABLES. RFC-2026-020
-- §5/5, and 020's reason unchanged: a policy that wrote `exists (select 1 from
-- app.workspace_members ...)` would evaluate that scan AS THE CALLER, so another module's whole
-- policy set would expand inside this table's evaluation and the width of an industry assignment's
-- visibility would stop being a property of this file. Not one predicate below names
-- `app.workspace_members` or `app.workspace_member_scopes`.
--
-- THE NARROWING IS RESTRICTIVE, for 021's reason and not by imitation. Permissive policies OR
-- together and cannot subtract, so the scope rule is one `AS RESTRICTIVE ... FOR ALL` policy that
-- every permissive policy on this table — the three written below and any a later batch adds — is
-- ANDed with. Writing the conjunct into each permissive policy instead would put the scope rule in
-- three places, and a fourth policy added later would be a fourth place to forget it.
--
--
-- WHY A GLOBAL PARENT TAKES A SINGLE-COLUMN FOREIGN KEY WHERE EVERY TENANT PARENT TAKES A COMPOSITE
--
-- §3.3 requires a child to confirm its parent is in the same Workspace/Business, and 020 spells
-- every such reference over the whole scope path for that reason. `industry_pack_version_id`
-- references a GLOBAL row: there is no shared scope column for a composite key to compare, because
-- the parent has no tenant to agree with. The two references on this table are therefore different
-- shapes on purpose —
--
--   (workspace_id, business_profile_id) -> app.business_profiles (workspace_id, id)   composite
--   (industry_pack_version_id)          -> app.industry_pack_versions (id)            global
--
-- — and the first is what makes §4 invariant 10 hold here: an unrelated Workspace/Business pair
-- fails at the database with 23503 for every caller, including one the policy would have admitted.
--
-- AND THE PACK IS NOT DENORMALISED ONTO THE ASSIGNMENT. A version determines its pack, so an
-- `industry_pack_id` column here would be a second source of truth for a fact the foreign key
-- already fixes — the shape 021 refused when it declined `current_version_id`. The industry pack
-- contract requires every consumer to pin `pack_id + version + checksum`; pinning the immutable
-- VERSION row reaches all three and cannot drift, which is stronger than copying them.
--
--
-- WHAT IS NOT HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO FIND
--
--   * NO WAY TO UNASSIGN. §8.5 forbids a broad user delete and requires a soft delete "ที่ update
--     typed lifecycle field", and no document names a lifecycle field for this row. 010 refused to
--     invent a status vocabulary for invitations and 021 refused to invent one for a member scope;
--     the same refusal, the same reason. A Business can be RE-pinned — that is the UPDATE grant
--     below, and it is what §4.5's "explicit admin approval" activation needs — and it cannot be
--     un-pinned through the request path. No role holds DELETE, so the refusal is a privilege-layer
--     denial the isolation suite attributes to this table by name rather than a policy a later edit
--     could widen. Owed to whichever batch names the lifecycle field.
--
--   * NO DEPRECATION OF A PUBLISHED VERSION. The industry pack contract's manifest carries
--     `released_at`, `deprecated_at` and a six-value status vocabulary, and §4.5 gives the lifecycle
--     `draft → candidate → approved → active → deprecated → retired`. A row in
--     `app.industry_pack_versions` is IMMUTABLE — §3.2's "Immutable version ... history: ห้าม update
--     เนื้อหาเดิม", §4 invariant 8, and §5's own "published immutable" — so it carries `released_at`
--     and no mutable status. A mutable status column beside an immutable row is the first sentence
--     of an immutable table contradicting itself, which is 020's sentence about `updated_at` one
--     column over. What the catalog holds is PUBLISHED versions; draft and candidate packs are file
--     bundles the runtime validates and no registry row gives this batch their table. Deprecation is
--     an UPDATE this batch grants to nobody, owed to the batch that brings a curation command path.
--     Nothing pinned is harmed by that: an assignment references the immutable row, so
--     "pinned old content ... old result reproducible" holds by construction.
--
--   * NO PAGE-LEVEL ASSIGNMENT. §5 scopes this family "global/business" and §4's ERD hangs
--     INDUSTRY_ASSIGNMENT off BUSINESS_PROFILE and off nothing else. A
--     `page_context_profile_id` here would be a scope level two source documents decline to give it.
--
--   * NO RETENTION CLASS TO IMPLEMENT, AND THAT IS A GAP IN THE BASELINE RATHER THAN IN THIS FILE.
--     §5 assigns this family `CATALOG/HISTORY`, and **§10 defines no `CATALOG` class** — the
--     retention table has twenty-six rows and none of them is that one. `HISTORY` is defined as
--     "อายุ Workspace + lineage", which cannot describe a global catalog row that outlives every
--     workspace. Nothing here encodes a retention window: batch 160 owns the retention job and
--     DATA-DEC/§10's own approval owns the number. Recorded, not guessed at (§15).
--
--   * NOTHING ABOUT WORKSPACE LIFECYCLE VISIBILITY. Unchanged from 020's header: a member of an
--     `access_blocked` workspace can still read its business rows, and now its industry assignment,
--     because reading `app.workspaces.lifecycle_state` from these policies needs either the coupling
--     020 rejects or a helper grant RFC-2026-020 §6.1/6 pins shut. Owed to an RFC plus batch 170.


-- ---------------------------------------------------------------------------------------------
-- app.industry_packs — the global catalog row. One per stable pack identity.
-- ---------------------------------------------------------------------------------------------
--
-- GLOBAL: no workspace_id, because §3.3 requires the canonical scope field on tenant-owned rows and
-- this is not one. Sensitivity PUBLIC-0.
--
-- NO `created_by` AND NO `updated_by`, and that follows a rule rather than an omission. §3.2 says
-- "ทุก mutable row: created_at, updated_at; USER MUTATION เพิ่ม created_by, updated_by" — the audit
-- actor columns are for rows a user mutates. No user mutates this one: it is platform-curated
-- (`publisher` records that as data) and written by the global seed, which §6 invariant 5 requires
-- to use a stable key and be re-runnable. `pack_id` is that stable key.
--
-- The three columns are the ones the industry pack contract fixes by name in its manifest —
-- `pack_id`, `industry_key`, `publisher` — and each carries the CHECK its own stable-ID rule
-- implies, because a rule stated in a document and not in a constraint is a rule the database does
-- not have. Display text is NOT here: the contract says Thai display text may change without
-- changing the stable ID, so it belongs to the version row, which records what one publication
-- said.
create table if not exists app.industry_packs (
  id            uuid primary key default gen_random_uuid(),
  pack_id       text        not null,
  industry_key  text        not null,
  publisher     text        not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- "ID ใช้ lowercase ASCII + dot/hyphen": `th.sme.interior-built-in`. Written as a constraint so a
  -- pack whose id would break every consumer's cache key cannot be seeded at all.
  constraint industry_packs_pack_id_stable_form
    check (pack_id ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'),
  constraint industry_packs_industry_key_form
    check (industry_key ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  constraint industry_packs_publisher_not_blank check (length(btrim(publisher)) > 0),
  -- The stable key §6 invariant 5 requires of a global seed, and the reason the seed can be re-run.
  constraint industry_packs_pack_id_unique unique (pack_id)
);

comment on table app.industry_packs is
  'Owner: A2 Industry (industry.core, batch 030). GLOBAL — it carries no workspace_id because §3.3 '
  'requires the canonical scope field on tenant-owned rows and a platform catalog is not one. '
  'Sensitivity PUBLIC-0; retention CATALOG, which §5 names and §10 does not define (recorded in the '
  'header, owed to §10 and batch 160). NO client role holds any privilege here: §9.1 permits a '
  'client PROJECTION of PUBLIC-0 content and RFC-2026-012 §2/3 puts that projection behind a named '
  'security_invoker view on an allowlist that starts empty and grows only by RFC. Written by the '
  'global seed on the stable key pack_id (§6 invariant 5).';
comment on column app.industry_packs.pack_id is
  'PUBLIC-0. The stable identity, lowercase ASCII with dots and hyphens, whose meaning may never be '
  'reused once retired. It is the seed''s stable key and the value every consumer pins beside a '
  'version and a checksum.';
comment on column app.industry_packs.industry_key is
  'PUBLIC-0. The industry this pack serves, as the manifest spells it. Separate from pack_id so a '
  'second publisher''s pack for the same industry is a different catalog row rather than a '
  'collision.';
comment on column app.industry_packs.publisher is
  'PUBLIC-0. Who curated this pack — `platform-curated` for the built-in packs. It is the column '
  'that makes "no user mutates this row" a property of the data rather than of the grants alone.';


-- ---------------------------------------------------------------------------------------------
-- app.industry_pack_versions — global, published, immutable.
-- ---------------------------------------------------------------------------------------------
--
-- §3.2: "Immutable version/evidence/decision/usage/audit/publish history: ห้าม update เนื้อหาเดิม".
-- §4 invariant 8 repeats it and §5 calls this family "published immutable". Expressed three ways at
-- once, exactly as 020's version tables are, because a comment is not a control: no UPDATE or DELETE
-- policy, no UPDATE or DELETE grant to any role, and no `updated_at` column or trigger — an
-- immutable row has no update to stamp, and §3.2 requires `updated_at` only of a MUTABLE row. The
-- apply-time block at the foot of this file asserts all three against the live catalog.
--
-- `checksum` is the third term of the industry pack contract's pinning rule — every Research Run,
-- Suggestion, Content Version and Quality Result pins `pack_id + version + checksum` — and it is
-- constrained to the manifest's own spelling so a row cannot carry a digest nothing can verify.
create table if not exists app.industry_pack_versions (
  id                uuid primary key default gen_random_uuid(),
  industry_pack_id  uuid        not null references app.industry_packs (id),
  version           text        not null,
  display_name_th   text        not null,
  checksum          text        not null,
  released_at       timestamptz not null,
  created_at        timestamptz not null default now(),
  constraint industry_pack_versions_version_is_semantic
    check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  constraint industry_pack_versions_checksum_form
    check (checksum ~ '^sha256:[0-9a-f]{64}$'),
  constraint industry_pack_versions_display_name_not_blank
    check (length(btrim(display_name_th)) > 0),
  -- One publication of one version of one pack. It is also the index supporting the foreign key
  -- above, which it leads with.
  constraint industry_pack_versions_number_unique unique (industry_pack_id, version)
);

comment on table app.industry_pack_versions is
  'Owner: A2 Industry (industry.core, batch 030). GLOBAL and IMMUTABLE — a row here is a PUBLISHED '
  'version, and the contract''s "published version immutable; แก้ด้วย version ใหม่เท่านั้น" is '
  'expressed as absent grants and absent policies rather than as a convention: no role, client or '
  'service, holds UPDATE or DELETE. Sensitivity PUBLIC-0; retention CATALOG/HISTORY (see the table '
  'above about §10). Deprecation and retirement are UPDATEs this batch grants to nobody; they are '
  'owed to the batch that brings a curation command path.';
comment on column app.industry_pack_versions.version is
  'PUBLIC-0. Semantic version, constrained to three numeric parts. §4.5 reads patch, minor and '
  'major differently at activation time, which is only decidable from a version that has the shape.';
comment on column app.industry_pack_versions.checksum is
  'PUBLIC-0. `sha256:<64 hex>`, the third term of the contract''s pinning rule. Not a secret: §9.3 '
  'classes a content hash as an integrity value rather than a credential.';
comment on column app.industry_pack_versions.released_at is
  'PUBLIC-0. When this version was published. NOT NULL because a row exists in this catalog because '
  'it was published — a draft is a thing that changes, and nothing in this table can change.';
comment on column app.industry_pack_versions.display_name_th is
  'PUBLIC-0. The Thai display text of this publication. It lives here and not on the pack row '
  'because the contract lets display text change without changing the stable ID, so it is a '
  'property of a version rather than of the identity.';


-- ---------------------------------------------------------------------------------------------
-- app.industry_assignments — which published pack version a Business is pinned to.
-- ---------------------------------------------------------------------------------------------
--
-- TENANT-1, canonical scope `workspace_id` plus the Business column §3.3 names in full. This is the
-- one table in this batch with a tenant boundary, and therefore the only one with policies.
create table if not exists app.industry_assignments (
  id                        uuid primary key default gen_random_uuid(),
  workspace_id              uuid        not null,
  business_profile_id       uuid        not null,
  industry_pack_version_id  uuid        not null references app.industry_pack_versions (id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid,
  updated_by                uuid,
  -- §3.3's composite foreign key, over the whole scope path: an assignment cannot name a Business
  -- in another Workspace, and the refusal is the constraint rather than a policy (§4 invariant 10).
  constraint industry_assignments_scope_fk
    foreign key (workspace_id, business_profile_id)
    references app.business_profiles (workspace_id, id),
  -- §4's ERD: BUSINESS_PROFILE ||--o| INDUSTRY_ASSIGNMENT. Zero or one, as a constraint.
  constraint industry_assignments_one_per_business unique (workspace_id, business_profile_id)
);

comment on table app.industry_assignments is
  'Owner: A2 Industry (industry.core, batch 030). Canonical scope workspace_id and '
  'business_profile_id (§3.3), tied to the Business by a composite foreign key so an unrelated '
  'Workspace/Business pair fails at the database (§4 invariant 10). Sensitivity TENANT-1; retention '
  'HISTORY per §5''s row. §4''s ERD makes it zero-or-one per Business, which is the unique '
  'constraint. It pins a GLOBAL published version by single-column foreign key, because a global '
  'parent has no tenant column for a composite key to compare. No role holds DELETE: §8.5 has no '
  'broad user delete and no document names a typed lifecycle field for this row.';
comment on column app.industry_assignments.workspace_id is
  'TENANT-1. The canonical tenant scope and the column every policy on this table resolves '
  'membership against. Excluded from the UPDATE grant, so a row cannot be moved between tenants '
  'even by a caller both policies would admit (§8.5).';
comment on column app.industry_assignments.business_profile_id is
  'TENANT-1. The canonical Business scope (§3.3), and the column the member-scope narrowing asks '
  'about. Excluded from the UPDATE grant: §8.5 forbids moving a row across tenant OR scope with an '
  'update, and an assignment changing Business is exactly that.';
comment on column app.industry_assignments.industry_pack_version_id is
  'TENANT-1 pointing at a PUBLIC-0 row. The pinned publication, which reaches pack_id, version and '
  'checksum through the immutable version row rather than copying them — the contract requires all '
  'three to be pinned and a copy is a second source of truth for a fact the foreign key fixes. It '
  'is the ONLY updatable column here: re-pinning is §4.5''s activation, and un-pinning is not '
  'offered at all.';
comment on column app.industry_assignments.created_by is
  'AUTH-3. The acting user, asserted equal to the JWT subject by the INSERT policies (§8.5). Not '
  'FK-constrained: §11.2 forbids cascade-deleting history when a member is removed and requires the '
  'actor field be anonymized instead.';
comment on column app.industry_assignments.updated_by is 'AUTH-3. See created_by.';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- Already covered by a constraint's own index, and therefore NOT repeated below:
--
--   industry_packs.pack_id                       — the unique constraint, and the seed's lookup key.
--   industry_pack_versions (industry_pack_id, version)
--                                                — the unique constraint, which leads with the
--                                                  foreign key column and also answers "the
--                                                  versions of this pack".
--   industry_assignments (workspace_id, business_profile_id)
--                                                — the composite foreign key, the zero-or-one
--                                                  constraint, and both RLS-predicate columns.
--   created_by / updated_by                      — not FK-constrained and named in no predicate.

-- The remaining foreign key: the pinned version. Without this index, dropping or examining a
-- published version scans every assignment in the database, and this is the one join that crosses
-- from a tenant table to a global one.
create index if not exists industry_assignments_pack_version_idx
  on app.industry_assignments (industry_pack_version_id);

-- §3.3 keyset pagination, "(created_at desc, id desc)", for the list that grows with the tenant:
-- the industry assignments of a workspace, which grows with its Businesses.
create index if not exists industry_assignments_workspace_keyset_idx
  on app.industry_assignments (workspace_id, created_at desc, id desc);


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every MUTABLE row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
--
-- Two triggers, not three. `app.industry_pack_versions` has no updated_at to stamp, and adding one
-- would be the first sentence of an immutable table contradicting itself (020's words, unchanged).
--
-- The trigger on `app.industry_packs` is not inert even though no client role can reach the table:
-- the global seed runs administratively, and a re-run that corrects a curated field is exactly the
-- update this stamps.
drop trigger if exists set_updated_at on app.industry_packs;
create trigger set_updated_at before update on app.industry_packs
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.industry_assignments;
create trigger set_updated_at before update on app.industry_assignments
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on every table, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
--
-- On the two global tables this is doing more work than usual, not less. They carry no policy at
-- all, so ENABLE plus FORCE is what makes every non-bypassing role — including the table owner —
-- read zero rows, and it is what the CI negative control switches off to prove the suite notices.
alter table app.industry_packs enable row level security;
alter table app.industry_packs force row level security;

alter table app.industry_pack_versions enable row level security;
alter table app.industry_pack_versions force row level security;

alter table app.industry_assignments enable row level security;
alter table app.industry_assignments force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges.
-- ---------------------------------------------------------------------------------------------
--
-- THE GLOBAL TABLES. `authenticated` and `anon` are granted NOTHING — see the header. `app_worker`
-- holds SELECT and no policy, which is 010's shape: the grant is what turns "the service reads
-- nothing" from an untestable absence into a denial attributable to row level security, and it is
-- what a role that had quietly acquired BYPASSRLS would defeat visibly. It holds no INSERT: a
-- published version is written by the global seed, and §8.1's only `N` in the service column is the
-- immutable version row, which this family is.
grant select on app.industry_packs to app_worker;
grant select on app.industry_pack_versions to app_worker;

-- THE TENANT TABLE. Column-scoped, per operation, exactly as 020 and 021 write them.
--
-- Three absences are load-bearing:
--
--   * `workspace_id` and `business_profile_id` are absent from the UPDATE grant, so no assignment
--     can be moved between tenants or between Businesses even by a caller both policy halves would
--     admit (§8.5). The apply-time block asserts that against the live ACL, per column.
--   * NO DELETE, for any role. See the header: §8.5 forbids the broad delete and no document names
--     the typed lifecycle field that would replace it.
--   * `id` is absent from the INSERT grant. §3.2 lets the application choose an aggregate id before
--     the transaction; an industry assignment is not an aggregate root — it is addressed by the
--     Business it belongs to, which the unique constraint makes exact — so a client-chosen id here
--     would be a value with no reader (021's reasoning, unchanged).
grant select (id, workspace_id, business_profile_id, industry_pack_version_id,
              created_at, updated_at, created_by, updated_by)
  on app.industry_assignments to authenticated;
grant insert (workspace_id, business_profile_id, industry_pack_version_id, created_by, updated_by)
  on app.industry_assignments to authenticated;
grant update (industry_pack_version_id, updated_by) on app.industry_assignments to authenticated;

-- app_worker holds the three verbs a client holds and no policy, for the reason 010, 020 and 021
-- all record. A verb no client and no policy holds would be a privilege nobody reviewed against a
-- caller.
grant select, insert, update on app.industry_assignments to app_worker;

-- app_command and app_maintenance are granted nothing by this batch. There is no specified command
-- surface for industry.core, and the retention path is batch 160.


-- ---------------------------------------------------------------------------------------------
-- Policies. TO authenticated, for the §8.1 Business cells the assignment inherits.
-- ---------------------------------------------------------------------------------------------
--
-- NOTHING IS WRITTEN FOR app.industry_packs OR app.industry_pack_versions, AND THAT IS A DECISION
-- RATHER THAN AN OMISSION. §8 has no row for an industry pack anywhere in its four matrices, so
-- there is no cell to implement; RFC-2026-012 §3 gives the client read to an RFC; and a policy
-- written for a caller that does not exist is a permission nobody reviewed. Both tables are FORCE
-- ROW LEVEL SECURITY with an empty policy set, which denies every non-bypassing role including the
-- one role holding a grant. 010's own static suite requires a forced table's policy set to be a
-- decision in the file rather than an omission; this paragraph is that decision, and
-- tests/db/identity/identity-isolation.test.mjs holds it to it in both directions.

-- §8.1 "Business/Page SELECT" is `Y` for owner, admin, editor, approver and viewer alike, so the
-- predicate tests active membership and not role, through the batch 011 helper.
drop policy if exists industry_assignments_select_active_member on app.industry_assignments;
create policy industry_assignments_select_active_member on app.industry_assignments
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- §8.1 "Business/Page INSERT/UPDATE/archive": `Y` for owner and admin.
--
-- §8.5: an INSERT policy checks the whole scope in WITH CHECK, and a user action asserts
-- `created_by = (select auth.uid())`. The archived clause is §11.3 — "Archive ปิด creation/publish
-- ใหม่ แต่ยังอ่าน history ตาม role" — and it is the same subquery 020 writes on its page INSERT, in
-- the same fail-closed direction: it runs as the caller, so app.business_profiles' own policy set
-- applies to it and any narrowing there can only make this INSERT refuse more.
drop policy if exists industry_assignments_insert_owner_or_admin on app.industry_assignments;
create policy industry_assignments_insert_owner_or_admin on app.industry_assignments
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin')
    and exists (
      select 1 from app.business_profiles b
      where b.workspace_id = industry_assignments.workspace_id
        and b.id = industry_assignments.business_profile_id
        and b.archived_at is null
    )
  );

-- Re-pinning a Business to a different published version. USING and WITH CHECK both present, as
-- §8.5 requires of every UPDATE policy: without the second, a row admitted by the first could be
-- updated out of the scope that admitted it.
--
-- No archived clause here, and that is §11.3 read rather than copied: archive closes NEW creation
-- and publishing while history stays readable by role. Re-pinning an existing assignment is neither.
drop policy if exists industry_assignments_update_owner_or_admin on app.industry_assignments;
create policy industry_assignments_update_owner_or_admin on app.industry_assignments
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin'))
  with check (app.workspace_member_role(workspace_id) in ('owner', 'admin'));

-- The editor's `P`, through 021's scope helpers. Permissive, so it ORs with the two policies above
-- rather than replacing them.
--
-- `covers`, never `admits`. `P` is "ผ่านตาม policy/EXPLICIT capability" and an absent scope row is
-- not explicit, so an editor who has never been scoped gains nothing from this policy — which is
-- what stops the editor's `P` from arriving as an unconditional grant through the back door. 021
-- established the distinction and this batch consumes it.
--
-- The archived clause is repeated for the reason 021 repeats it on its own editor page INSERT: a
-- permissive policy ORs, so omitting it here would let a scoped editor do the one thing the policy
-- above refuses.
drop policy if exists industry_assignments_insert_scoped_editor on app.industry_assignments;
create policy industry_assignments_insert_scoped_editor on app.industry_assignments
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) = 'editor'
    and app.member_scope_covers_business(workspace_id, business_profile_id)
    and exists (
      select 1 from app.business_profiles b
      where b.workspace_id = industry_assignments.workspace_id
        and b.id = industry_assignments.business_profile_id
        and b.archived_at is null
    )
  );

drop policy if exists industry_assignments_update_scoped_editor on app.industry_assignments;
create policy industry_assignments_update_scoped_editor on app.industry_assignments
  for update to authenticated
  using (
    app.workspace_member_role(workspace_id) = 'editor'
    and app.member_scope_covers_business(workspace_id, business_profile_id)
  )
  with check (
    app.workspace_member_role(workspace_id) = 'editor'
    and app.member_scope_covers_business(workspace_id, business_profile_id)
  );

-- The narrowing. One RESTRICTIVE policy, FOR ALL, ANDed with every permissive policy above.
--
-- 021 had to add this to four tables it did not create, because permissive policies OR together and
-- cannot subtract. This table is created here, so the conjunct COULD have been written into each
-- permissive policy instead — and is not, for the reason 021 gives: one policy per table means the
-- scope rule has one home, and a fifth permissive policy added by a later batch is ANDed with it
-- automatically instead of being a fifth place to forget it.
--
-- `admits`, never `covers`. §8's legend reads `Y` as "ผ่านเมื่อ active + capability + scope ตรง", so
-- an operation the matrix grants to every role is still subject to the member's scope WHERE ONE
-- EXISTS and is not narrowed where none does. `covers` here would deny every member holding no
-- scope row — every owner, admin and unscoped viewer in the fixture — which is the reading 021
-- rejected in its own header.
drop policy if exists industry_assignments_scope_narrows_member on app.industry_assignments;
create policy industry_assignments_scope_narrows_member on app.industry_assignments
  as restrictive
  for all to authenticated
  using (app.member_scope_admits_business(workspace_id, business_profile_id))
  with check (app.member_scope_admits_business(workspace_id, business_profile_id));

-- No DELETE policy on any table in this batch, and no DELETE grant either. See the header.


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004, 011, 020 and 021 use: a claim that is only a comment is a claim nobody
-- checks. These are the properties of THIS batch answerable from the catalog of the database being
-- migrated, without a committed snapshot and without a test harness. The text half lives in
-- tests/db/identity/identity-isolation.test.mjs and the live behavioural half is
-- `make db-rls-smoke`.
--
-- WHAT IS DELIBERATELY NOT ASSERTED HERE, because 011 and 021 between them showed the cost. 011's
-- own block raises when app_authz holds a number of policies other than one, and 021 had to route
-- around it rather than propose the amendment that would have made an APPLIED migration's
-- self-assertion false. So nothing below asserts a property an approved RFC is EXPECTED to change:
-- "no client role holds a privilege on the catalog" and "the catalog carries no policy" are the
-- empty read allowlist, and the allowlist is designed to grow. They are asserted in the static
-- suite instead, where the batch that lands that RFC changes a line a reviewer reads — which is the
-- right home for a rule whose whole purpose is to be amended by decision rather than by drift.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only by
-- a superuser, and a migration that needs one to apply is a migration that cannot be applied on the
-- platform it targets, where `postgres` is not a superuser.
do $$
declare
  offending text;
  count_of  integer;
begin
  -- ENABLE and FORCE on all three. The two are different catalog columns and the data package's own
  -- lint rule reads only the first (RFC-2026-016). On the two global tables this is the ONLY thing
  -- refusing a role that holds a grant, because neither has a policy.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('industry_packs', 'industry_pack_versions', 'industry_assignments')
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'On a global table with no policy, FORCE is the whole control: without it the '
                   'table owner reads every row and the isolation suite cannot tell that from a '
                   'working catalog.';
  end if;

  -- The immutability of the published version table, as the privilege system holds it. This is
  -- §3.2, §4 invariant 8 and §5's "published immutable" in one query, asserted against the live
  -- ACLs rather than against the text of the grants above, because a grant made by a LATER batch
  -- would not appear in this file at all.
  --
  -- `has_any_column_privilege` for UPDATE so a column-scoped grant is caught as well as a
  -- table-wide one; DELETE has no column-level form and is asked of the table.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'industry_pack_versions'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'a published pack version can be updated or deleted: %', offending
      using hint = 'The industry pack contract says a published version is immutable and is changed '
                   'only by publishing a new one. The absence of the grant is what makes the refusal '
                   'a privilege-layer denial rather than a policy a later edit can widen.';
  end if;

  -- And the same claim as the policy catalog holds it. Both halves, because either alone can be
  -- satisfied while the other is wrong: a policy with no grant is inert, and a grant with no policy
  -- is denied by RLS instead of by privilege, which is a weaker refusal than immutability asks for.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'industry_pack_versions'
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'the published version table carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- §8.5, per column, against the live ACL: an assignment may not be moved across tenant or scope
  -- by an update. The grant above names two columns and this is what says so about the other two.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['workspace_id', 'business_profile_id']) as col
       where n.nspname = 'app'
         and c.relname = 'industry_assignments'
         and r.rolname in ('authenticated', 'anon', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a scope column of app.industry_assignments is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant OR scope with an update, and the '
                   'privilege system is where that is enforced rather than a WITH CHECK a later '
                   'edit could weaken. app_worker is excluded from this list on purpose: it holds a '
                   'table-wide grant and no policy, so row level security refuses it entirely.';
  end if;

  -- No role holds DELETE on the assignment, which is the header's "a Business can be re-pinned and
  -- not un-pinned" as the privilege system holds it.
  select string_agg(r.rolname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname = 'industry_assignments'
     and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
     and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE');
  if offending is not null then
    raise exception 'an industry assignment can be deleted through a granted path: %', offending
      using hint = '§8.5 has no broad user delete and requires a soft delete through a typed '
                   'lifecycle field. No document names one for this row, so batch 030 grants the '
                   'verb to nobody rather than inventing the field.';
  end if;

  -- The narrowing is RESTRICTIVE. A permissive policy with the same name and the same predicate
  -- would WIDEN this table instead of narrowing it — a member would see every assignment their
  -- scope admits OR their membership admits, which is what the SELECT policy already does — and
  -- §12.6/2 would silently stop being implemented on this table. polpermissive is the one catalog
  -- column that tells the two apart.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'industry_assignments'
     and not pol.polpermissive;
  if count_of <> 1 then
    raise exception 'app.industry_assignments carries % restrictive policies and batch 030 writes exactly one', count_of
      using hint = 'The member-scope narrowing is the only thing on this table that must AND rather '
                   'than OR. If it is gone, a scoped editor reaches every Business in their '
                   'workspace; if there are two, one of them is a decision nobody recorded.';
  end if;

  -- No policy this batch writes may name a service or anonymous role. §8.1 gives the service `P` on
  -- Business operations and anonymous nothing anywhere; a `TO app_worker` policy here would add a
  -- permission the matrix does not grant and would make the service denial unfalsifiable.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'industry_assignments'
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('app_worker', 'app_command', 'app_maintenance', 'anon'));
  if offending is not null then
    raise exception 'batch 030 wrote a policy for a service or anonymous role: %', offending;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members, and 030 creates no helper and needs no
  -- exemption — so this is the whole of what 030 owes that decision, asserted rather than promised.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('industry_packs', 'industry_pack_versions', 'industry_assignments')
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020 and 021 ask them:
  -- scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('industry_packs', 'industry_pack_versions', 'industry_assignments')
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 030 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
