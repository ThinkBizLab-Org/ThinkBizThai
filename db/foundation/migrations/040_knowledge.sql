-- Batch 040 — knowledge: typed profile items, and their immutable versions.
--
-- Owner: A2 Knowledge. The migration ownership registry (§6) reserves 040 to this package and
-- describes it as "knowledge + typed profiles", depending on 020 and 030.
--
-- Depends on: 000 (schemas, private.set_updated_at), 001 (app_worker), 010 (app.workspaces),
-- 011 (app.is_active_member, app.workspace_member_role), 020 (app.business_profiles,
-- app.page_context_profiles and the unique keys their children reference), 021
-- (app.member_scope_admits_business, app.member_scope_admits_page). All six are merged; migration
-- invariant 1 forbids rewriting any of them and NOTHING BELOW DOES — every statement here creates
-- a new object or attaches a policy to one this file created, and no `drop policy` names a policy
-- another batch wrote. A test asserts that pairing rather than trusting this sentence.
--
-- 030 IS A DEPENDENCY IN THE REGISTRY AND NOT A DEPENDENCY IN THIS FILE, which is worth saying
-- because a reader will look for it. §6 lists 040 as depending on "020,030" and nothing below
-- references app.industry_packs, app.industry_pack_versions or app.industry_assignments. The
-- ordering is real — 030's header records that "the attribute surface a business profile will
-- eventually carry" is split between the industry pack (030) and knowledge (040), and a resolved
-- knowledge contract (041) reads both — but a dependency the SQL does not have is not invented
-- here as a foreign key, because migration invariant 6 puts a cross-module FK in an integration
-- batch and because 021 and 030 both refused to add a constraint a registry row merely mentions.
--
--
-- THE SCOPE COLUMN IS TWO COLUMNS, AND THAT IS THE WHOLE SHAPE OF THIS BATCH
--
-- §5's inventory row reads:
--
--   | `knowledge.core` | items/versions/voice/audience/offers/restrictions | business/page |
--   | current + immutable versions | CONTENT-2 | CONTENT-HISTORY | A2 Knowledge |
--
-- "business/page" is not a choice between two scopes and it is not one nullable column standing in
-- for either. §3.3's own table says both, in two rows:
--
--   | Business     | `business_profile_id`      | knowledge, research, content, asset, ... |
--   | Page context | `page_context_profile_id`  | policy/knowledge/asset ที่จำกัดเฉพาะเพจ   |
--
-- The Business row lists knowledge unconditionally. The Page row lists knowledge CONDITIONALLY —
-- "restricted to one page". §4's relation invariant 3 settles what that means: "Knowledge/Research/
-- Content/Asset ทุก row มี Business scope; Page scope เป็น nullable override ที่ต้องอยู่ Business
-- เดียวกัน" — every row has Business scope, and Page scope is a NULLABLE OVERRIDE that must be in
-- the same Business.
--
-- So `business_profile_id` is NOT NULL and `page_context_profile_id` is nullable, and the second
-- half of invariant 3 — "must be in the same Business" — is a THREE-COLUMN composite foreign key
-- into app.page_context_profiles over (workspace_id, business_profile_id, id).
--
-- WHY THAT FOREIGN KEY IS `MATCH SIMPLE` AND WHY THE DEFAULT IS THE LOAD-BEARING CHOICE HERE.
-- Under MATCH SIMPLE — the default, and the only workable one — a composite foreign key with ANY
-- null referencing column is satisfied trivially. That is exactly the behaviour a nullable override
-- needs: a business-level knowledge item carries a null page and the page key is not checked, while
-- a page-level item carries all three and the key forces the Page to be under THAT Business in THAT
-- Workspace. `MATCH FULL` would do the opposite of what is wanted and would be a silent disaster:
-- it demands all referencing columns be null or none be, and `workspace_id` and
-- `business_profile_id` are never null here, so MATCH FULL would REFUSE EVERY BUSINESS-LEVEL
-- KNOWLEDGE ITEM — the majority case — while looking like a stricter constraint.
--
-- The duality then runs through three more places, each of which is a decision and not a
-- consequence:
--
--   1. THE NARROWING ASKS A DIFFERENT QUESTION PER ROW. A business-level item is narrowed by
--      `app.member_scope_admits_business`; a page-level item by `app.member_scope_admits_page`.
--      Asking the Business question about a page-level row would leak page-restricted knowledge to
--      every member scoped to a sibling Page; asking the Page question about a business-level row
--      would pass NULL as the page and deny everyone. It is one `case` expression, in one
--      restrictive policy, so the rule has one home.
--   2. THE INSERT'S ARCHIVE CLAUSE CHECKS BOTH PARENTS. §11.3 closes new creation under an archived
--      Business; a Page is archived by the same field and the same sentence. So the WITH CHECK
--      requires the Business to be live AND, when the row names one, the Page to be live too.
--   3. `page_context_profile_id` IS ABSENT FROM THE UPDATE GRANT. §8.5 forbids moving a row across
--      tenant OR SCOPE with an update, and a knowledge item changing Page is exactly that — the
--      same sentence 020 applied to a Page changing Business, one level further down.
--
--
-- WHAT "TYPED PROFILES" IS, AND THE FOUR-TABLE SHAPE THAT WAS REJECTED
--
-- §6's registry calls this batch "knowledge + typed profiles" and §5 lists the family as
-- "items/versions/voice/audience/offers/restrictions". Two readings are available.
--
--   FOUR PROFILE TABLES (rejected). `knowledge_voice_profiles`, `knowledge_audience_profiles`,
--   `knowledge_offers`, `knowledge_restrictions`, each with a version table — eight tables. §4's
--   ERD contains exactly two knowledge entities and one relation between them:
--
--     BUSINESS_PROFILE ||--o{ KNOWLEDGE_ITEM : knows
--     KNOWLEDGE_ITEM   ||--o{ KNOWLEDGE_VERSION : versions
--
--   Eight tables would be six entities the ERD does not have, and — this is the part that decides
--   it — NO DOCUMENT IN THIS REPOSITORY NAMES A SINGLE COLUMN OF ANY OF THEM. §5 classifies the
--   family and names no field, exactly as it named none for business.core. So the four tables would
--   be four identical shells distinguished only by their names, which is the opposite of "typed":
--   it is four tables reserved against a future somebody else will design. 021 refused to create
--   `workspace_member_scope_versions` because "creating one would be reserving a table no registry
--   row gives this batch"; this is the same refusal, four times over.
--
--   ONE ITEM TABLE, TYPED BY ITS KIND (chosen). §4's two entities, with `kind` as `text` + a named
--   CHECK over §5's four words — which is precisely §3.2's rule for a Phase 1 state ("`text` + named
--   `CHECK`; เปลี่ยนค่าได้ผ่าน migration เท่านั้น") and the treatment 010 gave role and status and 021
--   gave scope_type. The profile is typed because the ROW declares its type and the database
--   enforces the vocabulary, not because four tables carry four names.
--
-- THE FOUR VALUES ARE §5's FOUR WORDS, UNCHANGED, INCLUDING THE TWO THAT READ AS PLURALS. `voice`,
-- `audience`, `offers`, `restrictions`. Normalising `offers` to `offer` and `restrictions` to
-- `restriction` would be tidier and would be two edits to a vocabulary a document fixed; §3.2 says
-- the values change by migration, which is the mechanism for changing them once somebody with the
-- authority to decide has. Until then the CHECK contains what §5 wrote and nothing else, and the
-- fixture loads all four so the vocabulary is live rather than merely permitted.
--
-- WHAT A KNOWLEDGE ITEM DOES NOT HOLD. No body, no content column, no document column. §5 names no
-- field of this family and forbids "metadata", "config", "payload" and "JSON" without a declared
-- JSON Schema version, maximum size, prohibited fields and owner, none of which exists — and a
-- CONTENT-2 blob is the single worst column to invent on that basis. Each row carries its identity,
-- its scope path, its kind, one human-readable `name`, the soft lifecycle field §3.2 names and the
-- audit columns §3.2 requires. 041 ("resolved knowledge contract") is the batch the registry gives
-- the shape of resolved knowledge to, and a typed column added there lands on the current row and
-- on the version row in one change, which is what "current + immutable versions" costs.
--
--
-- THE VERSION TABLE CARRIES NO PAGE OF ITS OWN, WHICH IS THE ONE THING HERE A REVIEWER SHOULD
-- ARGUE WITH
--
-- §3.3 asks for `page_context_profile_id` on a row "restricted to one page", and a version of a
-- page-restricted item is such a row. It is nevertheless absent, for a reason that is mechanical
-- rather than a matter of taste: A COPY OF IT COULD NOT BE HELD EQUAL TO THE ITEM'S.
--
-- A composite foreign key from the version to the item over the whole path — (workspace_id,
-- business_profile_id, page_context_profile_id, knowledge_item_id) — is MATCH SIMPLE like every
-- other nullable composite key in this schema, so WHEN THE VERSION'S PAGE IS NULL THE CHECK IS
-- SKIPPED. A version could then claim to be business-level while the item it versions is
-- page-restricted, and the narrowing would ask `admits_business` of the version where it asks
-- `admits_page` of the item. That is history readable to a member the current row is hidden from —
-- the exact failure 021's own apply-time hint names ("a version row holds what a Business or Page
-- used to say, so a narrowing that skipped one would leave the history readable to a member the
-- current row is hidden from"). MATCH FULL cannot rescue it, for the reason above. No CHECK can:
-- a CHECK cannot read another row. Only a trigger could, and a trigger enforcing a column that need
-- not exist is a strange thing to add to a schema whose every other column had to be named by a
-- document first.
--
-- So the version records what the item SAID and the item records what the item IS, and a version's
-- reach is the item's reach — asserted rather than copied:
--
--   `knowledge_item_versions_scope_narrows_member` is RESTRICTIVE and its predicate is
--   `exists (select 1 from app.knowledge_items i where i.workspace_id = ... and i.id = ...)`.
--
-- A version is reachable exactly when its item is, which CANNOT DRIFT FROM THE ITEM'S RULE BECAUSE
-- IT IS THE ITEM'S RULE — including the page-level half of it, and including any narrowing a later
-- batch adds to the item.
--
-- AND THE COUPLING 020's HEADER WARNS ABOUT DOES NOT HOLD HERE, for 021's reason and not by
-- assertion. 020 rejects a policy that joins `app.workspace_members` because the scan runs as the
-- caller, so the width of business visibility would become a function of a policy set belonging to
-- ANOTHER module and another batch. `app.knowledge_items` has no such policy set: this batch creates
-- the table and writes every one of its policies, so the width is stated in this file rather than
-- inherited. The direction is fail-closed besides — narrowing the item can only make the version
-- refuse more, never less.
--
-- The version still carries `workspace_id` and `business_profile_id`, because §3.3 requires the
-- canonical tenant scope on every tenant-owned row and the Business scope on every knowledge row
-- unconditionally, and because the composite key into the item is spelled over both. Neither is
-- nullable, so that key is checked on every insert and an unrelated Workspace/Business/item triple
-- fails with 23503 for every caller including one the policy would have admitted (§4 invariant 10).
--
-- `kind` is likewise NOT copied onto the version. A version determines its item and an item
-- determines its kind, so a `kind` column here would be a second source of truth for a fact the
-- foreign key already fixes — 021's refusal of `current_version_id` and 030's refusal of
-- `industry_pack_id`, in the same words.
--
--
-- WHICH §8.2 CELLS THIS IMPLEMENTS, AND WHY THERE IS NO REFUSED `P` AMONG THEM
--
-- §8.2 has three rows about these tables:
--
--   | Knowledge/Research SELECT               | Y | Y | Y | Y | Y | P |
--   | Knowledge current INSERT/UPDATE/archive | Y | Y | Y | N | N | P |
--   | Knowledge version UPDATE/DELETE         | N | N | N | N | N | N |
--
-- Every batch from 010 to 030 had to record a cell it refused because `P` is "ผ่านตาม policy/
-- explicit capability" and no document defines the capability set. THIS BATCH HAS NO SUCH CELL FOR
-- A CLIENT ROLE, and that is a fact about §8.2 rather than an achievement: the knowledge rows carry
-- `Y`, `N` and one `P` in the SERVICE column, and the service `P` is treated exactly as 010, 020,
-- 021 and 030 treat it — grants and no policy, so a service denial is attributable to RLS.
--
-- THE EDITOR IS `Y` HERE AND WAS `P` IN §8.1, AND THAT DIFFERENCE IS THE POINT RATHER THAN A
-- TYPO TO SMOOTH OVER. §8.1's "Business/Page INSERT/UPDATE/archive" marks the editor `P`, which 020
-- refused and 021 paid with an EXPLICIT member scope (`member_scope_covers_*`, false for a member
-- holding no scope row). §8.2's "Knowledge current INSERT/UPDATE/archive" marks the editor `Y`,
-- alongside owner and admin. §7 says the same thing in prose — "`editor`: สร้าง/แก้ knowledge,
-- research, content, asset และ schedule เมื่อ policy อนุญาต" — and creating and editing knowledge is
-- the first thing on that list. Writing knowledge is the editor's job; creating a Business is not.
--
-- So the permissive write policies name `('owner', 'admin', 'editor')` and NOTHING is conditioned on
-- an explicit scope row. That is not a widening smuggled in past 021's distinction; it is the other
-- side of it, and the two must not be confused:
--
--   * A `P` CELL REQUIRES AN EXPLICIT SCOPE — `member_scope_covers_*`, false for an unscoped
--     member. 021's editor cell and 030's are written that way.
--   * A `Y` CELL IS NARROWED BY SCOPE WHERE SCOPE EXISTS — `member_scope_admits_*`, true for an
--     unscoped member. §8's legend reads `Y` as "ผ่านเมื่อ active + capability + scope ตรง", and §7
--     as "Role ให้เพดานสิทธิ์ ส่วน member scope ตัดสิทธิ์ให้แคบลงและไม่ขยาย role" — role sets the
--     ceiling, scope narrows it. An unscoped editor is at their ceiling because nothing narrows
--     them.
--
-- §7's "เมื่อ policy อนุญาต" IS DISCHARGED BY THAT NARROWING and by nothing invented. It is the same
-- conditional §8's legend spells out for every `Y`, and member scope is the term of §7's
-- `capability + tenant context + member scope` that this schema HAS. The term it still does not
-- have is `capability`, whose set no document defines — and no policy below asks for one, so
-- nothing here depends on that open decision (RFC-2026-020 §8, §15).
--
-- MEMBERSHIP AND SCOPE ARE READ THROUGH THE HELPERS AND NEVER BY JOINING THE TABLES. RFC-2026-020
-- §5/5, and 020's reason unchanged: a policy that wrote `exists (select 1 from
-- app.workspace_members ...)` would evaluate that scan AS THE CALLER, so another module's whole
-- policy set would expand inside this table's evaluation and the width of knowledge visibility would
-- stop being a property of this file. Not one predicate below names `app.workspace_members` or
-- `app.workspace_member_scopes`, and a static test asserts it.
--
-- THE NARROWINGS ARE RESTRICTIVE, for 021's reason and not by imitation. Permissive policies OR
-- together and cannot subtract, so the scope rule is one `AS RESTRICTIVE ... FOR ALL` policy per
-- table that every permissive policy on that table — the ones written below and any a later batch
-- adds — is ANDed with.
--
--
-- WHAT IS NOT HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO FIND
--
--   * NO WAY TO DELETE A KNOWLEDGE ITEM OR A VERSION. §8.5 forbids a broad user delete and requires
--     a soft delete "ที่ update typed lifecycle field". The item HAS such a field — `archived_at`,
--     which §8.2 names in the operation itself ("INSERT/UPDATE/archive") — so archiving is the
--     supported path and no role holds DELETE. A version has no lifecycle at all, by construction.
--     Both refusals are privilege-layer: the verb is granted to nobody, so the denial is attributable
--     to an absent grant rather than to a policy a later edit could widen, and the apply-time block
--     asserts it against the live ACLs.
--
--   * NO `current_version_id` POINTER, and no deferred foreign key. 020 refused it, 021 refused to
--     add it, and both reasons hold here unchanged: `(knowledge_item_id, version_number)` is unique
--     and answers "which version is latest" without a second source of truth; no command function
--     exists for knowledge.core, so a client writes the item and its version in two statements and a
--     pointer written by that unbound path is a claim the database cannot check; and a DEFERRED
--     constraint is checked only at COMMIT, so RLS cannot enforce it at all. §6's registry gives
--     "deferred FK" to 021, which declined it; nothing gives one to 040.
--
--   * NO COMMAND FUNCTION, and no `app_command` grant. The data package specifies no command surface
--     for knowledge.core. The consequence is 020's, unchanged and worth repeating because it is
--     larger here: a client holding INSERT on the version table can write a version whose `name`
--     never was the item's `name`. Binding the two into one transaction is what a command function
--     is for, and it is the command surface — not RLS — that owes it.
--
--   * NOTHING ABOUT WORKSPACE LIFECYCLE VISIBILITY. Unchanged from 020's and 030's headers: a member
--     of an `access_blocked` workspace can still read its business rows, and now its knowledge,
--     because reading `app.workspaces.lifecycle_state` from these policies needs either the coupling
--     020 rejects or a helper grant RFC-2026-020 §6.1/6 pins shut. Owed to an RFC plus batch 170.
--
--   * NO RETENTION WINDOW. §5 assigns this family `CONTENT-HISTORY`, which §10 DOES define — "content
--     versions/quality/lineage | อายุ Workspace | 30-day recovery" — unlike the `CATALOG` class 030
--     had to report missing. Nothing is encoded here all the same: batch 160 owns the retention job
--     and §10's own approval owns the numbers, and a window written into a constraint would read as
--     ratified (§15).
--
--   * ONE CONSEQUENCE OF 021's DEFINITION, CONSUMED RATHER THAN RE-DECIDED. `member_scope_covers_
--     business` counts a `page` scope row on its parent Business — 021 chose that so "a member scoped
--     to one Page must be able to read the Business that Page hangs from" — so a PAGE-SCOPED EDITOR
--     MAY WRITE BUSINESS-LEVEL KNOWLEDGE under that Business, which reaches every Page beneath it.
--     030 met the same consequence one table over and recorded it as 021's definition and not 030's
--     to change; the same answer here, with the same reservation: if that is wrong it is wrong in
--     021, and correcting it is a decision about the helper rather than an edit to a policy. An
--     isolation case asserts the behaviour positively, so the day somebody changes it a test moves
--     in a diff instead of a claim quietly becoming false.


-- ---------------------------------------------------------------------------------------------
-- app.knowledge_items — the typed knowledge profile, current state.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` and `business_profile_id` (§3.3), plus the nullable Page override
-- §4 invariant 3 defines. Soft lifecycle is `archived_at`: §3.2 offers `archived_at` or
-- `deleted_at`, and §8.2's operation is spelled "INSERT/UPDATE/archive", which chooses between them.
create table if not exists app.knowledge_items (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  page_context_profile_id  uuid,
  kind                     text        not null,
  name                     text        not null,
  archived_at              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  updated_by               uuid,
  constraint knowledge_items_kind_known
    check (kind in ('voice', 'audience', 'offers', 'restrictions')),
  constraint knowledge_items_name_not_blank check (length(btrim(name)) > 0),
  -- §3.3's composite foreign key into the Business, over the whole scope path. Both columns are
  -- NOT NULL, so this one is checked on every row.
  constraint knowledge_items_business_scope_fk
    foreign key (workspace_id, business_profile_id)
    references app.business_profiles (workspace_id, id),
  -- The nullable override, over the whole scope path INCLUDING the Business. MATCH SIMPLE (the
  -- default) skips it when the Page is null, which is what makes a business-level item legal; when
  -- the Page is set, the key forces it to be a Page of THAT Business in THAT Workspace, which is
  -- the second half of §4 invariant 3 expressed as a constraint rather than as a convention.
  constraint knowledge_items_page_scope_fk
    foreign key (workspace_id, business_profile_id, page_context_profile_id)
    references app.page_context_profiles (workspace_id, business_profile_id, id),
  -- The target of the version table's composite foreign key. `id` alone is already unique; this
  -- triple is what lets a version assert that its own Workspace and Business are the ones its item
  -- actually has.
  constraint knowledge_items_scope_key unique (workspace_id, business_profile_id, id)
);

comment on table app.knowledge_items is
  'Owner: A2 Knowledge (knowledge.core, batch 040). Canonical scope workspace_id and '
  'business_profile_id, with page_context_profile_id as the NULLABLE OVERRIDE §4 invariant 3 '
  'defines — every knowledge row has Business scope, and Page scope narrows it to one Page of that '
  'same Business (§3.3). Sensitivity CONTENT-2; retention CONTENT-HISTORY. Current state; history '
  'lives in app.knowledge_item_versions, which is immutable. Soft lifecycle via archived_at (§3.2, '
  '§8.2 "INSERT/UPDATE/archive", §11.3); no role holds DELETE. The typed profile is the row: `kind` '
  'is §5''s four words as text + a named CHECK (§3.2), not four tables the ERD does not have.';
comment on column app.knowledge_items.workspace_id is
  'CONTENT-2. The canonical tenant scope, and the column every policy on this table resolves '
  'membership against. Excluded from the UPDATE grant, so a row cannot be moved between tenants '
  'even by a caller both policy halves would admit (§8.5).';
comment on column app.knowledge_items.business_profile_id is
  'CONTENT-2. The canonical Business scope, required of every knowledge row by §3.3 and by §4 '
  'invariant 3. Excluded from the UPDATE grant: §8.5 forbids moving a row across tenant OR scope '
  'with an update.';
comment on column app.knowledge_items.page_context_profile_id is
  'CONTENT-2. NULL for knowledge that belongs to the whole Business; set for knowledge "ที่จำกัด'
  'เฉพาะเพจ" (§3.3). It is a nullable OVERRIDE and never a substitute for the Business scope, and '
  'the composite foreign key that carries it names the Business too, so a Page from another '
  'Business fails at the database (§4 invariant 10). Excluded from the UPDATE grant: an item '
  'changing Page is a row moving across scope.';
comment on column app.knowledge_items.kind is
  'CONTENT-2. §5''s four knowledge profiles — voice, audience, offers, restrictions — as text + a '
  'named CHECK (§3.2); values change by migration only. Excluded from the UPDATE grant, because a '
  'typed profile that can change type is not typed, and because §8.2 names no operation for it.';
comment on column app.knowledge_items.name is
  'CONTENT-2. The one human-readable field this batch writes. §5 names no column of this family and '
  'forbids an untyped document column standing in for the rest, so the resolved knowledge shape is '
  'owed to batch 041 as typed columns on this row and on its version.';
comment on column app.knowledge_items.archived_at is
  'CONTENT-2. §11.3: archive closes new creation under a Business or Page while history stays '
  'readable by role. Set and cleared by the owner/admin/editor UPDATE policy; never a DELETE.';
comment on column app.knowledge_items.created_by is
  'AUTH-3. The acting user, asserted equal to the JWT subject by the INSERT policy (§8.5). Not '
  'FK-constrained: §11.2 forbids cascade-deleting history when a member is removed and requires the '
  'actor field be anonymized instead.';
comment on column app.knowledge_items.updated_by is 'AUTH-3. See created_by.';


-- ---------------------------------------------------------------------------------------------
-- app.knowledge_item_versions — immutable history of a knowledge item.
-- ---------------------------------------------------------------------------------------------
--
-- §3.2: "Immutable version/evidence/decision/usage/audit/publish history: ห้าม update เนื้อหาเดิม".
-- §4 invariant 8 repeats it and §5 calls this family "current + immutable versions". Expressed three
-- ways at once, as 020's and 030's version tables are, because a comment is not a control: no UPDATE
-- or DELETE policy, no UPDATE or DELETE grant to any role, and no `updated_at` column or trigger —
-- an immutable row has no update to stamp, and §3.2 requires `updated_at` only of a MUTABLE row.
--
-- It carries no `page_context_profile_id` and no `kind`. The header says why at length: a nullable
-- copy of the page could not be held equal to the item's under any foreign key this schema can
-- write, and an unenforceable copy of the column the narrowing turns on is worse than no copy. The
-- version's reach is the item's reach, asserted by the restrictive policy below.
create table if not exists app.knowledge_item_versions (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid        not null,
  business_profile_id  uuid        not null,
  knowledge_item_id    uuid        not null,
  version_number       integer     not null,
  name                 text        not null,
  created_at           timestamptz not null default now(),
  created_by           uuid,
  constraint knowledge_item_versions_name_not_blank check (length(btrim(name)) > 0),
  constraint knowledge_item_versions_number_positive check (version_number >= 1),
  constraint knowledge_item_versions_number_unique unique (knowledge_item_id, version_number),
  -- §3.3's composite FK. Every column of it is NOT NULL, so it is checked on every row: a version
  -- cannot claim a Workspace or a Business its item is not in.
  constraint knowledge_item_versions_scope_fk
    foreign key (workspace_id, business_profile_id, knowledge_item_id)
    references app.knowledge_items (workspace_id, business_profile_id, id)
);

comment on table app.knowledge_item_versions is
  'Owner: A2 Knowledge (knowledge.core, batch 040). Canonical scope workspace_id and '
  'business_profile_id (§3.3), tied to the item by a composite foreign key over the whole scope '
  'path so an unrelated Workspace/Business/item triple fails at the database (§4 invariant 10). '
  'Sensitivity CONTENT-2; retention CONTENT-HISTORY. IMMUTABLE (§3.2, §4 invariant 8, §8.2): no '
  'role — client or service — holds UPDATE or DELETE here, as an absent grant and an absent policy '
  'rather than as a convention. It carries NO page_context_profile_id: a nullable copy could not be '
  'held equal to the item''s by any foreign key (MATCH SIMPLE skips a null), so the restrictive '
  'policy makes a version reachable exactly when its item is, which cannot drift from the item''s '
  'rule because it IS the item''s rule.';
comment on column app.knowledge_item_versions.knowledge_item_id is
  'CONTENT-2. The item this row is a version of, and the column the restrictive narrowing resolves '
  'the version''s whole scope through — including the Page restriction, which lives on the item.';
comment on column app.knowledge_item_versions.version_number is
  'The per-item ordinal, unique with knowledge_item_id. It answers "which version is latest" '
  'without a current_version_id pointer on the item, which would be a circular foreign key that '
  '020 refused, 021 declined to add, and no registry row gives this batch.';
comment on column app.knowledge_item_versions.created_by is
  'AUTH-3. The acting user, asserted equal to the JWT subject by the INSERT policy (§8.5). There is '
  'no updated_by: nothing updates this row.';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- Already covered by a constraint's own index, and therefore NOT repeated below:
--
--   knowledge_items (workspace_id, business_profile_id)
--                                  — the Business foreign key AND both RLS-predicate columns.
--                                    knowledge_items_scope_key leads with exactly that pair.
--   knowledge_item_versions (knowledge_item_id, version_number)
--                                  — the unique constraint, which also answers "the versions of
--                                    this item, latest first".
--   created_by / updated_by        — not FK-constrained (see the column comments) and named in no
--                                    policy predicate.

-- The Page override's foreign key, and the third predicate column of the narrowing. Without it,
-- archiving or examining a Page scans every knowledge item in the database.
create index if not exists knowledge_items_page_scope_idx
  on app.knowledge_items (workspace_id, business_profile_id, page_context_profile_id);

-- The version's composite foreign key, which leads with workspace_id, and the RLS-predicate column
-- on that table.
create index if not exists knowledge_item_versions_scope_idx
  on app.knowledge_item_versions (workspace_id, business_profile_id, knowledge_item_id);

-- §3.3 keyset pagination, "(created_at desc, id desc)", for the list that grows with the tenant:
-- the knowledge of one Business.
create index if not exists knowledge_items_business_keyset_idx
  on app.knowledge_items (business_profile_id, created_at desc, id desc);


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every MUTABLE row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
--
-- One trigger, not two. The version table has no updated_at to stamp, and adding one would be the
-- first sentence of an immutable table contradicting itself (020's words, unchanged).
drop trigger if exists set_updated_at on app.knowledge_items;
create trigger set_updated_at before update on app.knowledge_items
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on every table, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
alter table app.knowledge_items enable row level security;
alter table app.knowledge_items force row level security;

alter table app.knowledge_item_versions enable row level security;
alter table app.knowledge_item_versions force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges. Deny-by-default needs a grant before RLS is even reached.
-- ---------------------------------------------------------------------------------------------
--
-- §6 invariant 8 puts migration, constraints, indexes, RLS AND grants in one change set. `anon` is
-- granted nothing, here as everywhere: §8.5 gives anonymous no tenant policy, so an anonymous read
-- is refused by the privilege system on the SCHEMA before RLS is reached.
--
-- Column-scoped, per operation. Four absences in the UPDATE grant are load-bearing and are enforced
-- here rather than only in a WITH CHECK a later edit could weaken:
--
--   * `workspace_id` — no row moves between tenants.
--   * `business_profile_id` — no knowledge item moves between Businesses.
--   * `page_context_profile_id` — no item moves between Pages, or from a Page to the Business, or
--     from the Business down onto a Page. §8.5 forbids moving a row across tenant OR SCOPE with an
--     update, and this is the column that carries the second half of the scope.
--   * `kind` — §8.2 names no operation that changes a knowledge item's type, and a typed profile
--     that can change type is not typed. This one is 040's own reading rather than a sentence
--     copied from a document, and it is stated so a reader can disagree with it.
--
-- `id` IS in the INSERT grants: §3.2 says the application may create an aggregate id before the
-- transaction, and a knowledge item is an aggregate root — §4's ERD gives it its own entity and
-- hangs versions off it. `archived_at` is not: a row is created live and archived by a later update.
grant select (id, workspace_id, business_profile_id, page_context_profile_id, kind, name,
              archived_at, created_at, updated_at, created_by, updated_by)
  on app.knowledge_items to authenticated;
grant insert (id, workspace_id, business_profile_id, page_context_profile_id, kind, name,
              created_by, updated_by)
  on app.knowledge_items to authenticated;
grant update (name, archived_at, updated_by) on app.knowledge_items to authenticated;

grant select (id, workspace_id, business_profile_id, knowledge_item_id, version_number, name,
              created_at, created_by)
  on app.knowledge_item_versions to authenticated;
grant insert (id, workspace_id, business_profile_id, knowledge_item_id, version_number, name,
              created_by)
  on app.knowledge_item_versions to authenticated;
-- No UPDATE and no DELETE on the version table, for any role. §8.2's "Knowledge version
-- UPDATE/DELETE" is `N N N N N N`, and this absence is what makes the refusal a privilege-layer
-- 42501 the isolation suite can attribute to an object by name.
--
-- And no DELETE on the ITEM either, for any role. §8.5 has no broad user delete; archiving is the
-- typed lifecycle field §8.2 names in the operation itself.

-- app_worker holds privileges and NO policy, for the reason 010, 020, 021 and 030 all record:
-- without a grant, a service refusal is 42501 either way and proves only that somebody forgot a
-- GRANT; with the grant and no policy, an empty read can only have come from RLS, and a service
-- role that had quietly acquired BYPASSRLS would SUCCEED where the suite demands a refusal.
--
-- The verbs follow §8.2: the service is `P` on knowledge SELECT and on knowledge current
-- INSERT/UPDATE, and `N` on version UPDATE/DELETE — so SELECT, INSERT and UPDATE on the item, and
-- SELECT and INSERT on the version, and never UPDATE or DELETE there.
grant select, insert, update on app.knowledge_items to app_worker;
grant select, insert on app.knowledge_item_versions to app_worker;

-- app_command and app_maintenance are granted nothing by this batch. There is no specified command
-- surface for knowledge.core, and the retention path is batch 160.


-- ---------------------------------------------------------------------------------------------
-- Policies. TO authenticated, for the user paths §8.2 grants.
-- ---------------------------------------------------------------------------------------------
--
-- Every membership question goes through batch 011's helpers and every scope question through
-- batch 021's. Both answer about the CALLER only, so a policy that calls one is asking "may I",
-- never "who else is here".

-- --- app.knowledge_items ------------------------------------------------------------------------

-- §8.2 "Knowledge/Research SELECT" is `Y` for owner, admin, editor, approver and viewer alike, so
-- the predicate tests ACTIVE MEMBERSHIP and not role. Archived rows stay visible: §11.3 says
-- archived history stays readable by role, and a policy that hid it would delete the history the
-- archive exists to preserve.
drop policy if exists knowledge_items_select_active_member on app.knowledge_items;
create policy knowledge_items_select_active_member on app.knowledge_items
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- §8.2 "Knowledge current INSERT/UPDATE/archive" is `Y` for owner, admin AND EDITOR, and `N` for
-- approver and viewer. All three `Y` roles are named; see the header for why the editor is not
-- conditioned on an explicit scope row here while it is in 021 and 030.
--
-- §8.5: an INSERT policy checks the whole scope in WITH CHECK, and a user action asserts
-- `created_by = (select auth.uid())`. The second half is what makes §8.6 case 8 — a forged
-- created_by — fail at the database rather than at whatever code forgot to check it.
--
-- THE ARCHIVE CLAUSE IS TWO CLAUSES, which is the Business/Page duality arriving in the policy.
-- §11.3 closes new creation under an archived Business, and a Page carries the same field and the
-- same sentence — so knowledge under a live Business but an ARCHIVED Page is new creation under
-- that Page and is refused. Both subqueries run as the caller, so the parents' own SELECT policies
-- apply to them and any narrowing there can only make this INSERT refuse more.
drop policy if exists knowledge_items_insert_writer on app.knowledge_items;
create policy knowledge_items_insert_writer on app.knowledge_items
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
    and exists (
      select 1 from app.business_profiles b
      where b.workspace_id = knowledge_items.workspace_id
        and b.id = knowledge_items.business_profile_id
        and b.archived_at is null
    )
    and (
      page_context_profile_id is null
      or exists (
        select 1 from app.page_context_profiles p
        where p.workspace_id = knowledge_items.workspace_id
          and p.business_profile_id = knowledge_items.business_profile_id
          and p.id = knowledge_items.page_context_profile_id
          and p.archived_at is null
      )
    )
  );

-- USING and WITH CHECK both present, as §8.5 requires of every UPDATE policy: without the second, a
-- row admitted by the first could be updated out of the scope that admitted it.
--
-- No archived clause here, and that is §11.3 read rather than copied: archive closes NEW creation
-- and publishing while history stays readable, and ARCHIVING IS ITSELF AN UPDATE of archived_at.
-- A clause refusing an update under an archived parent would make un-archiving impossible, which is
-- the same reading 020 gave its own business UPDATE policy.
drop policy if exists knowledge_items_update_writer on app.knowledge_items;
create policy knowledge_items_update_writer on app.knowledge_items
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor'))
  with check (app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor'));

-- --- app.knowledge_item_versions ----------------------------------------------------------------

drop policy if exists knowledge_item_versions_select_active_member on app.knowledge_item_versions;
create policy knowledge_item_versions_select_active_member on app.knowledge_item_versions
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- §8.2 names no INSERT operation for a knowledge version, and that silence is read the way 020 read
-- the same silence about a business version: where the matrix wants an append-only table's INSERT
-- restricted differently from the operation that produces the row, it says so in its own line
-- ("Research run/source/evidence INSERT | N N N N N S"). For knowledge it does the opposite — it
-- grants the producing operation ("Knowledge current INSERT/UPDATE/archive") and denies only
-- mutation of the record ("Knowledge version UPDATE/DELETE"). So INSERT follows the producing
-- operation exactly, including the editor, and nothing else about a version is writable by anyone.
--
-- No archive clause: a version is the record of an edit to an existing item, not new creation under
-- a parent, and the restrictive policy below already requires that item to be reachable.
drop policy if exists knowledge_item_versions_insert_writer on app.knowledge_item_versions;
create policy knowledge_item_versions_insert_writer on app.knowledge_item_versions
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
  );

-- No UPDATE policy and no DELETE policy on either table. See the grants above: on the version table
-- the privilege is absent too, so the refusal happens before RLS is consulted and the suite records
-- which layer produced it.


-- ---------------------------------------------------------------------------------------------
-- The narrowing. One RESTRICTIVE policy per table, and the two ask different questions.
-- ---------------------------------------------------------------------------------------------
--
-- WHY RESTRICTIVE: permissive policies OR together and cannot subtract, so a scope rule written as
-- a permissive policy would WIDEN each table instead of narrowing it. 021 established the form on
-- four tables it did not create and 030 kept it on a table it did; this batch keeps it for 030's
-- reason — one policy per table means the scope rule has ONE home, and a permissive policy added by
-- a later batch is ANDed with it automatically instead of being another place to forget it.
--
-- `admits`, never `covers`. §8's legend reads `Y` as "ผ่านเมื่อ active + capability + scope ตรง", so
-- an operation the matrix grants to every role is narrowed by the member's scope WHERE ONE EXISTS
-- and is not narrowed where none does. `covers` would deny every member holding no scope row —
-- every unscoped owner, admin and editor — which is the reading 021 rejected in its own header, and
-- §8.2 marks no client cell on these tables `P`.

-- THE POLICY THE BUSINESS/PAGE DUALITY LIVES IN. A business-level item is narrowed by the Business
-- question and a page-level item by the Page question, decided per row by whether the override is
-- set. Neither branch can be dropped: asking the Business question about a page-level row would
-- admit every member scoped to a sibling Page under the same Business, and asking the Page question
-- about a business-level row would pass NULL and deny everyone including the unscoped.
drop policy if exists knowledge_items_scope_narrows_member on app.knowledge_items;
create policy knowledge_items_scope_narrows_member on app.knowledge_items
  as restrictive
  for all to authenticated
  using (
    case when page_context_profile_id is null
      then app.member_scope_admits_business(workspace_id, business_profile_id)
      else app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)
    end
  )
  with check (
    case when page_context_profile_id is null
      then app.member_scope_admits_business(workspace_id, business_profile_id)
      else app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)
    end
  );

-- AND THE VERSION'S NARROWING IS THE ITEM'S OWN REACHABILITY, not a copy of the predicate above.
-- The version carries no Page column — the header says why no foreign key could keep such a copy
-- honest — so the question it asks is "is the item this versions reachable by me", which resolves
-- the Business question or the Page question through the item's own policy set. It cannot drift
-- from that rule because it IS that rule, and the direction is fail-closed: any narrowing added to
-- app.knowledge_items later makes this refuse more, never less.
--
-- The subquery runs as the CALLER, which is what makes the sentence above true, and the coupling
-- 020's header warns about does not apply: app.knowledge_items' policy set is written in THIS file
-- rather than inherited from another module and another batch (021's argument for reading its own
-- scope table as the caller).
drop policy if exists knowledge_item_versions_scope_narrows_member on app.knowledge_item_versions;
create policy knowledge_item_versions_scope_narrows_member on app.knowledge_item_versions
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.knowledge_items i
      where i.workspace_id = knowledge_item_versions.workspace_id
        and i.business_profile_id = knowledge_item_versions.business_profile_id
        and i.id = knowledge_item_versions.knowledge_item_id
    )
  )
  with check (
    exists (
      select 1 from app.knowledge_items i
      where i.workspace_id = knowledge_item_versions.workspace_id
        and i.business_profile_id = knowledge_item_versions.business_profile_id
        and i.id = knowledge_item_versions.knowledge_item_id
    )
  );


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004, 011, 020, 021 and 030 use: a claim that is only a comment is a claim
-- nobody checks. These are the properties of THIS batch answerable from the catalog of the database
-- being migrated, without a committed snapshot and without a test harness. The text half lives in
-- tests/db/identity/identity-isolation.test.mjs and the live behavioural half is `make
-- db-rls-smoke`.
--
-- NOTHING BELOW ASSERTS A PROPERTY AN APPROVED DECISION IS EXPECTED TO CHANGE, which is 030's rule
-- and 021's scar: 011's apply-time policy count is an APPLIED migration's self-assertion that 021
-- had to route around. So the absence of a client grant, the width of the read allowlist and the
-- editor's role list are asserted in the static suite, where the batch that changes them edits a
-- line a reviewer reads.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only by
-- a superuser, and a migration that needs one to apply is a migration that cannot be applied on the
-- platform it targets, where `postgres` is not a superuser.
do $$
declare
  offending text;
  count_of  integer;
  narrowing text;
begin
  -- ENABLE and FORCE on both tables. The two are different catalog columns and the data package's
  -- own lint rule reads only the first (RFC-2026-016).
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('knowledge_items', 'knowledge_item_versions')
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending;
  end if;

  -- The immutability of the version table, as the privilege system holds it. §8.2's "Knowledge
  -- version UPDATE/DELETE" is `N N N N N N`, asserted against the live ACLs rather than against the
  -- text of the grants above, because a grant made by a LATER batch would not appear in this file.
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
         and c.relname = 'knowledge_item_versions'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'an immutable knowledge version can be updated or deleted: %', offending
      using hint = '§8.2 marks "Knowledge version UPDATE/DELETE" N for every role including the '
                   'service. The absence of the grant is what makes the refusal a privilege-layer '
                   'denial rather than a policy a later edit can widen.';
  end if;

  -- And the same claim as the policy catalog holds it. Both halves, because either alone can be
  -- satisfied while the other is wrong: a policy with no grant is inert, and a grant with no policy
  -- is denied by RLS instead of by privilege, which is a weaker refusal than immutability asks for.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'knowledge_item_versions'
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'the knowledge version table carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- §8.5, per column, against the live ACL: a knowledge item may not be moved across tenant or
  -- scope by an update, and its type may not be changed at all. The grant above names three columns
  -- and this is what says so about the four it withholds.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['workspace_id', 'business_profile_id',
                                'page_context_profile_id', 'kind']) as col
       where n.nspname = 'app'
         and c.relname = 'knowledge_items'
         and r.rolname in ('authenticated', 'anon', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a scope or type column of app.knowledge_items is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant OR scope with an update, and the '
                   'privilege system is where that is enforced rather than a WITH CHECK a later '
                   'edit could weaken. page_context_profile_id is in that list because it carries '
                   'the second half of the scope. app_worker is excluded on purpose: it holds a '
                   'table-wide grant and no policy, so row level security refuses it entirely.';
  end if;

  -- No role holds DELETE on either table. §8.5 has no broad user delete; the item has archived_at
  -- and a version has no lifecycle at all.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname in ('knowledge_items', 'knowledge_item_versions')
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a knowledge row can be deleted through a granted path: %', offending
      using hint = '§8.5 requires a soft delete through a typed lifecycle field. The item has one — '
                   'archived_at, which §8.2 names in the operation itself — and a version has none, '
                   'because nothing about an immutable row has a lifecycle.';
  end if;

  -- Exactly one RESTRICTIVE policy per table. A permissive policy with the same name and the same
  -- predicate would WIDEN each table instead of narrowing it — every member would see every item
  -- their scope admits OR their membership admits, which is what the SELECT policy already does —
  -- and §12.6/2 would silently stop being implemented here. polpermissive is the one catalog column
  -- that tells the two apart.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('knowledge_items', 'knowledge_item_versions')
     and not pol.polpermissive;
  if count_of <> 2 then
    raise exception 'batch 040 wrote % restrictive policies and it creates two tables to narrow', count_of
      using hint = 'One per table. A version row holds what a knowledge item used to say, so a '
                   'narrowing that skipped it would leave the history readable to a member the '
                   'current row is hidden from.';
  end if;

  -- THE ASSERTION THIS BATCH OWES MOST, and it is about the two predicates rather than their count.
  --
  -- The whole design of the scope column is that it is TWO columns, so the item's narrowing must
  -- ask BOTH questions and the version's must resolve them through the item. A narrowing that asked
  -- only `member_scope_admits_business` would leak page-restricted knowledge to every member scoped
  -- to a sibling Page, and it would look exactly like a working policy from the outside.
  select pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) into narrowing
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'knowledge_items' and not pol.polpermissive;
  if narrowing is null
     or position('member_scope_admits_business' in narrowing) = 0
     or position('member_scope_admits_page' in narrowing) = 0 then
    raise exception 'the knowledge item narrowing does not ask both the Business and the Page question: %',
      coalesce(narrowing, '<no restrictive policy>')
      using hint = '§4 invariant 3 makes the Page scope a nullable override on a row that always '
                   'carries a Business scope, so the narrowing decides per row which question to '
                   'ask. Dropping the Page branch admits every member scoped to a sibling Page.';
  end if;

  select pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) into narrowing
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'knowledge_item_versions' and not pol.polpermissive;
  if narrowing is null or position('knowledge_items' in narrowing) = 0 then
    raise exception 'the knowledge version narrowing does not resolve through the item: %',
      coalesce(narrowing, '<no restrictive policy>')
      using hint = 'The version carries no page column, so its reach is the item''s reach. A '
                   'narrowing that asked about the version''s own columns would ask the Business '
                   'question about the history of a page-restricted item.';
  end if;

  -- No policy this batch writes may name a service or anonymous role. §8.2 gives the service `P` on
  -- knowledge operations and anonymous nothing anywhere; a `TO app_worker` policy here would add a
  -- permission the matrix does not grant and would make the service denial unfalsifiable.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('knowledge_items', 'knowledge_item_versions')
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('app_worker', 'app_command', 'app_maintenance', 'anon'));
  if offending is not null then
    raise exception 'batch 040 wrote a policy for a service or anonymous role: %', offending;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 040 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  -- The POLICY COUNT is deliberately not re-asserted here: 021 owns that assertion on the far side
  -- of the batch that could have moved it, and repeating it would be a second home for a number.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('knowledge_items', 'knowledge_item_versions')
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020, 021 and 030 ask
  -- them: scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('knowledge_items', 'knowledge_item_versions')
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 040 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
