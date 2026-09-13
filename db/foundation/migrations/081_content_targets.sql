-- ============================================================================================
-- Batch 081 — content.core: the target, and the one reference this batch is forbidden to enforce
-- ============================================================================================
--
-- Owner: A3 Content. Depends on 080. §6's migration ownership registry gives this batch three
-- words — "target placeholder contract" — and the workstream document's own registry row spells
-- the same batch "content target placeholder/reference contract … deferred Social FK prepared".
--
-- ONE TABLE. §4.6 names `content_targets` last in the content.core inventory and batch 080
-- deliberately did not create it, saying so in its own header rather than leaving a reader to
-- wonder whether it was forgotten. This is that table and nothing else.
--
-- ============================================================================================
-- THE SOCIAL FOREIGN KEY IS DEFERRED. BATCH 111 FINALISES IT. THIS BATCH MUST NOT WRITE IT.
-- ============================================================================================
--
-- `social_account_id` carries NO FOREIGN KEY. §6's registry gives batch 111 — A0 Integration,
-- depending on 110, 020 and 081 — the deliverable "business-channel/social FK", and the workstream
-- registry spells the same row "Business-channel bindings + target Social FK". app.social_accounts
-- already exists on disk in 110_meta_connector.sql, so the absence here is NOT a missing table: it
-- is the registry followed. A foreign key written here would be this batch performing batch 111's
-- deliverable, which is the same act batch 021 refused when it declined to create a table no
-- registry row gave it and batch 060 refused for app.generation_runs.
--
-- WHAT THE DEFERRAL COSTS, STATED HERE RATHER THAN DISCOVERED LATER. Nothing checks that
-- `social_account_id` names a row that exists, and nothing checks that the row it names belongs to
-- the Workspace the target is in. Row level security cannot help: the column is not resolved
-- against anything, so there is no parent for a policy to ask about. A caller holding another
-- tenant's social account id can write it into its own target and the database will accept it.
-- That is in the work package's open blockers, owed to A0 Integration, and the absence of the key
-- is ASSERTED at apply time below — because a deferral that nobody can check is indistinguishable
-- from an omission, and because the day somebody adds the key here instead of in 111 this
-- migration should fail rather than quietly take another batch's work.
--
-- NOTHING ABOUT THE SOCIAL SIDE IS INVENTED HERE: no account kind, no channel vocabulary, no
-- binding table, no view. The column is a uuid and a comment.
--
-- ============================================================================================
-- WHICH ROW OF §8 GOVERNS A TARGET — A READING, LABELLED AS ONE
-- ============================================================================================
--
-- §4.6 places `content_targets` in `content.core`, so this batch applies §8.2's content rows:
--
--   | Content SELECT                | Y | Y | Y | Y | Y | P |
--   | Content create/edit/version   | Y | Y | Y | N | N | P |
--
-- The competing reading is §8.3's "Schedule/unschedule | Y | Y | P | N | N | P", which would make
-- an EDITOR a `P` — policy or explicit capability — rather than a `Y`, and no document in this
-- repository defines that capability, so under that reading the editor would hold nothing.
-- THIS BATCH READS SCHEDULING AS A DIFFERENT TABLE, and the ground is §4.7's own inventory:
-- `content_schedules` carries `content_target_id`, `scheduled_for` and a timezone snapshot, and
-- belongs to batch 091. Choosing a destination is not scheduling a post to it; the schedule row is
-- where §8.3's verb lands.
--
-- THAT IS A DERIVATION AND NOT A CITATION, and it decides what an editor may do, so it is in the
-- open blockers and owed to the matrix's owner and to A5, who owns 091. Batch 070 recorded the
-- same shape when it derived an RFC-2026-022 §3 classification the RFC's own table did not carry.
--
-- §8.2 row 3 — "Approved/published version UPDATE/DELETE", `N` in every column including Service —
-- does NOT govern this table. A target is not a version. What §4.6 asks of a target is that it
-- PIN one, and the pin is handled below as a column outside the UPDATE grant rather than by making
-- the whole row immutable, because §4.6 also gives a target a `status` that moves.
--
-- ============================================================================================
-- WHAT §4.6 ASKS FOR THAT THIS BATCH CANNOT WRITE
-- ============================================================================================
--
-- §4.6, in full, for this table:
--
--   * `id`, scope, `content_item_id`, `social_account_id`, `content_variant_id`, `status`
--   * "unique active target ต่อ content item/social account"
--   * "target pin immutable version ก่อน approve/schedule"
--
-- 1. `status` HAS NO VOCABULARY ANYWHERE. §4.6 names the column and enumerates nothing for it, as
--    it does for `content_ideas.status`, `content_items.approval_state` and
--    `content_variants.variant_type` — the three columns batch 080 left without a CHECK for the
--    same reason. There is no CHECK here. A vocabulary written in a migration would be this batch
--    choosing one for Product. §4.7 gives `approval_requests.status` five values and that is a
--    DIFFERENT COLUMN on a table batch 090 owns, so the obvious borrowing is the one thing a
--    reader must not do.
--
-- 2. "UNIQUE ACTIVE TARGET" THEREFORE CANNOT BE WRITTEN AS §4.6 STATES IT, because which `status`
--    values are ACTIVE is exactly the vocabulary nobody has decided. The rule is written over the
--    lifecycle column §8.5 requires instead — `where deleted_at is null` — and the substitution is
--    NOT a paraphrase:
--
--      * It is STRICTER than §4.6 in one direction. A target whose status a future vocabulary
--        would call `cancelled`, and which has not been soft-deleted, still occupies the slot, so a
--        second target for the same destination is refused until the first is soft-deleted.
--      * It is not looser in any direction this batch can find: every row §4.6 would call active
--        is a row with `deleted_at is null`.
--
--    STRICT IS THE DIRECTION THIS BATCH CHOSE ON PURPOSE. A duplicate live target for one content
--    item and one destination is the shape of a double post, and CONTRIBUTING_AGENTS' security
--    rules make publishing idempotency non-negotiable. Refusing a legitimate second target is a
--    product cost somebody will notice and complain about; accepting a duplicate one is a defect
--    nobody notices until it has posted twice. The forward fix, once the vocabulary exists, is a
--    partial index over the active values. In the open blockers, owed to Product.
--
-- 3. "TARGET PIN IMMUTABLE VERSION ก่อน APPROVE/SCHEDULE" IS HALF WRITABLE, AND THE HALF IS NAMED.
--    `content_variant_id` is nullable, because §4.6's own sentence says the pin happens BEFORE
--    approve/schedule and therefore that an unpinned target is a state a target passes through.
--    The conditional — pinned by the time the status is approved or scheduled — is a CHECK this
--    batch cannot write, for the reason in 1: it names status values nobody has decided. So
--    nothing stops an unpinned target reaching any state. In the open blockers, beside 1.
--
--    What IS written: the pin, once set, is outside every UPDATE grant. A pin the pinner can move
--    afterwards is not a pin, and re-pinning is a domain command's act, which is the same shape
--    batch 080 gave `content_items.status` and `content_items.current_version_id`. The cost is the
--    one batch 080 recorded for its own three tables: no command function exists anywhere in this
--    repository (RFC-2026-021 §10), so a target's pin can be set once at INSERT and changed by
--    nothing. In the open blockers.
--
-- 4. THE PIN IS HELD TO THE TENANT AND THE BUSINESS AND NOT TO THE ITEM. `content_variant_id`
--    carries a scope-path foreign key into app.content_variants over (workspace_id,
--    business_profile_id, content_variant_id), so a variant from another tenant or another
--    Business is refused by the database. NOTHING HOLDS IT TO THIS TARGET'S OWN CONTENT ITEM: a
--    variant hangs off a version and the version carries the item, so the key that would do it
--    needs a unique constraint on app.content_variants spanning the item — and app.content_variants
--    does not carry a `content_item_id` column at all. Batch 080 is merged and a merged migration
--    is never rewritten (§6 invariant 1), so the fix is a forward migration and it is in the open
--    blockers, owed to A3 Content. The fixture deliberately pins only variants that DO belong to
--    the target's own item, so nothing here makes the gap look closed.
--
-- ============================================================================================
-- SCOPE — TWO COLUMNS, NOT THREE, AND THE THIRD IS RESOLVED THROUGH THE PARENT
-- ============================================================================================
--
-- A target carries `workspace_id` and `business_profile_id` and NO `page_context_profile_id`. It
-- is a child of `app.content_items`, which is where §4 invariant 3's nullable Page override lives,
-- and batch 080's whole child design is that a child's reach IS its parent's reach: a nullable
-- copy of the parent's page could not be held equal to it by any foreign key, because MATCH SIMPLE
-- skips a null, and an unenforceable copy of the column a narrowing turns on is worse than no
-- copy. That reasoning is batch 070's, inherited by 080's versions, variants and quality reviews,
-- and this table is the fourth to take it.
--
-- So the restrictive narrowing below resolves through app.content_items, exactly as
-- content_versions_scope_narrowing does, and the apply-time block asserts BOTH HALVES of it name
-- that table.
--
-- ============================================================================================
-- RETENTION AND SENSITIVITY
-- ============================================================================================
--
-- §5 gives content.core CONTENT-2 and CONTENT-HISTORY. No number appears in this file: §10 owns
-- the window, batch 160 owns the sweep, §15 requires Product, Security and Legal approval before
-- Paid Beta. What this batch provides is what a sweep would read — `created_at`, and `deleted_at`
-- indexed where it is not null — so "this repository is holding soft-deleted targets past its own
-- stated limit" is a query anyone can run. That is batch 061's watermark pattern, kept.

-- ============================================================================================
-- app.content_targets — MUTABLE in its status and its lifecycle, fixed in its identity and its pin
-- ============================================================================================
create table if not exists app.content_targets (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  -- The parent that carries §4 invariant 3's Page override. This table does not copy it; see the
  -- header's scope section.
  content_item_id          uuid        not null,
  -- THE DEFERRED REFERENCE. No foreign key, by §6's registry: batch 111 owns "business-channel/
  -- social FK". NOT NULL all the same -- a target with no destination is not a target -- so a
  -- caller must name one even though nothing checks that it exists. The apply-time block below
  -- asserts that this column carries no foreign key, so the deferral is a fact about the catalog
  -- rather than a sentence in this comment.
  social_account_id        uuid        not null,
  -- §4.6's pin. Nullable because §4.6 pins BEFORE approve/schedule, so unpinned is a state a target
  -- passes through; outside every UPDATE grant because a pin the pinner can move is not a pin.
  content_variant_id       uuid,
  -- No CHECK. §4.6 names the column and enumerates nothing, which is the shape batch 080 left on
  -- three columns of its own. The "unique active target" rule below is written over `deleted_at`
  -- rather than over this column for exactly that reason.
  status                   text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  updated_by               uuid,
  -- §8.5: "DELETE: ไม่มี broad user delete; ใช้ soft-delete command ที่ update typed lifecycle
  -- field". This is that field, and it is also what the uniqueness rule turns on.
  deleted_at               timestamptz,
  -- A blank status is not a status. This refuses whitespace and says nothing about WHICH values
  -- are legal, which is the line between a shape constraint and a vocabulary.
  constraint content_targets_status_not_blank
    check (status is null or length(btrim(status)) > 0),
  constraint content_targets_item_scope_fk
    foreign key (workspace_id, business_profile_id, content_item_id)
    references app.content_items (workspace_id, business_profile_id, id),
  -- The pin, over the whole scope path. MATCH SIMPLE skips the key entirely when
  -- content_variant_id is null, which is what makes an unpinned target legal without a second
  -- constraint saying so.
  constraint content_targets_variant_scope_fk
    foreign key (workspace_id, business_profile_id, content_variant_id)
    references app.content_variants (workspace_id, business_profile_id, id),
  -- The key batch 091's content_schedules will need to reach a target over its scope path, which
  -- is how every child in this schema reaches its parent (§4 invariant 10). Written here rather
  -- than left to 091, because adding a unique constraint to a table later is a lock a live system
  -- has to be scheduled around and this table has no rows yet.
  constraint content_targets_scope_key unique (workspace_id, business_profile_id, id)
);

-- §4.6's "unique active target ต่อ content item/social account", written over the lifecycle column
-- because the status vocabulary it would otherwise turn on does not exist. See the header, point 2:
-- this is STRICTER than §4.6 states the rule, deliberately, and the direction is recorded rather
-- than smoothed over. A unique CONSTRAINT cannot be partial, which is why this is an index.
--
-- The column list is EXACTLY §4.6's two. Adding workspace_id and business_profile_id would change
-- nothing (content_item_id determines both through content_targets_item_scope_fk) and would make
-- the index read as a scope rule rather than as the product rule it is.
create unique index if not exists content_targets_active_destination
  on app.content_targets (content_item_id, social_account_id)
  where deleted_at is null;

create index if not exists content_targets_created_at_idx on app.content_targets (created_at);

-- The column batch 160's retention sweep reads.
create index if not exists content_targets_deleted_at_idx on app.content_targets (deleted_at)
  where deleted_at is not null;

comment on table app.content_targets is
  'Owner: A3 Content (content.core, batch 081). Scope workspace_id and business_profile_id; the '
  'Page override is NOT copied here and the restrictive narrowing resolves it through '
  'app.content_items, which is batch 080''s child rule. social_account_id carries NO FOREIGN KEY: '
  '§6''s registry gives the social FK to batch 111 (A0 Integration), so nothing checks that the '
  'destination exists or belongs to this tenant, and the apply-time block asserts the key''s '
  'ABSENCE so that writing it here fails rather than quietly doing 111''s work. content_variant_id '
  'is §4.6''s pin: nullable, scope-path foreign key into app.content_variants, outside every UPDATE '
  'grant, and NOT held to this target''s own content item because app.content_variants carries no '
  'item column to key against. status carries no CHECK because §4.6 enumerates no vocabulary, and '
  '§4.6''s "unique active target" is therefore written over deleted_at -- stricter than the rule as '
  'stated, in the direction that refuses a duplicate live destination. Sensitivity CONTENT-2; '
  'retention CONTENT-HISTORY, whose window is NOT encoded here (§10 owns the number, 160 the sweep).';

-- ============================================================================================
-- ROW LEVEL SECURITY — ENABLE and FORCE, per RFC-2026-016 §2 as amended
-- ============================================================================================
--
-- FORCE as well as ENABLE, because ENABLE alone exempts the table OWNER and the owner is the role
-- migrations run as. The schema lint refuses ENABLE without FORCE and reads only the first column.
alter table app.content_targets enable row level security;
alter table app.content_targets force  row level security;

-- ============================================================================================
-- GRANTS — column-scoped, and the columns that are ABSENT are the control
-- ============================================================================================
--
-- RFC-2026-021 M3's measurement is why these are column-scoped: a column-scoped grant makes column
-- drift loud, because a new column is not granted until somebody writes it into a diff. `anon` is
-- granted nothing anywhere in `app` (RFC-2026-021 §7/4, decided rather than deferred) and so
-- appears nowhere below; `app_worker` is granted nothing for the reason batch 080 recorded and this
-- batch keeps, restated under the apply-time block.
grant select (id, workspace_id, business_profile_id, content_item_id, social_account_id,
              content_variant_id, status, created_at, updated_at, created_by, updated_by,
              deleted_at)
  on app.content_targets to authenticated;

-- The pin IS in the INSERT list and NOT in the UPDATE list. A target is created pointing at a
-- destination and may be created already pinned; what a client may not do is move the pin
-- afterwards.
grant insert (workspace_id, business_profile_id, content_item_id, social_account_id,
              content_variant_id, status, created_by, updated_by)
  on app.content_targets to authenticated;

-- Four columns. `status` is here and `content_item_id`, `social_account_id` and
-- `content_variant_id` are not: re-aiming a target at another item or another destination is
-- creating a different target, and §8.5 forbids moving a row across tenant or scope with an update.
grant update (status, updated_at, updated_by, deleted_at)
  on app.content_targets to authenticated;

-- ============================================================================================
-- POLICIES — §8.2 row 1 as one SELECT, row 2 as two write paths, and one narrowing
-- ============================================================================================
--
-- Every policy is `TO authenticated`. RFC-2026-016 §2 as amended on RFC-2026-022 carries service
-- policies only for cells the §8 matrix marks `S`, and content has no `S` cell anywhere: its
-- Service column is `P`, no document defines that capability, and a `P` with no capability defined
-- is not an `S`. So db/foundation/lint/service-policy-map.json gets NO ENTRY from this batch, which
-- is batch 080's conclusion for the same family and not a new one.

create policy content_targets_select_active_member on app.content_targets
  for select to authenticated
  using (app.is_active_member(workspace_id));

create policy content_targets_insert_writer on app.content_targets
  for insert to authenticated
  with check (
    -- §8.5: "INSERT: WITH CHECK scope ทั้งหมด; user action ตรวจ created_by = (select auth.uid())".
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
  );

create policy content_targets_update_writer on app.content_targets
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor'))
  with check (
    -- The writer names itself and the policy checks the claim rather than trusting it.
    updated_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
  );

-- ============================================================================================
-- THE RESTRICTIVE NARROWING — the member scope, asked of the PARENT
-- ============================================================================================
--
-- A PERMISSIVE policy above says the caller is a member of the workspace. This says the caller's
-- scope admits the row, and both must hold. A target carries no page column, so its reach is its
-- item's reach — the same predicate content_versions_scope_narrowing carries, against the same
-- table.
--
-- BOTH HALVES, and on this table both are live rather than one being a guard for later: the USING
-- half filters reads and bounds which rows an UPDATE can see, and the WITH CHECK half bounds the
-- INSERT and the result of the UPDATE. 040's probe is why this is stated rather than assumed — a
-- reversal that gutted one half while leaving the other intact went unnoticed by a test that
-- looked at one of them, and a narrowing whose USING lost its exists() would leak every
-- page-restricted item's targets to every active member of the workspace while still refusing
-- their writes: the leak without the symptom.
create policy content_targets_scope_narrowing on app.content_targets
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.content_items i
      where i.workspace_id = content_targets.workspace_id
        and i.business_profile_id = content_targets.business_profile_id
        and i.id = content_targets.content_item_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  )
  with check (
    exists (
      select 1 from app.content_items i
      where i.workspace_id = content_targets.workspace_id
        and i.business_profile_id = content_targets.business_profile_id
        and i.id = content_targets.content_item_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  );

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED
-- ============================================================================================
--
-- Four claims made above are claims about a LIVE CATALOG and cannot be checked by reading this
-- file: that the social reference is deferred rather than written; that the pin, the identity and
-- the destination are unwritable as the PRIVILEGE SYSTEM holds them and not merely as this file's
-- grant list reads; that the uniqueness rule is the PARTIAL UNIQUE index §4.6's rule needs rather
-- than one of the three other indexes those words could describe; and that the write paths §8.2
-- row 2 grants exist as a grant AND as a policy rather than as either alone. All four are asserted
-- here, because a header that says "asserted" and asserts nothing is the overclaim this repository
-- keeps removing from its own evidence.
--
-- BOTH WAYS, EVERYWHERE. Batch 080 established the rule and the reason: a policy with no grant is
-- inert, and a grant with no policy is refused by row level security rather than by privilege —
-- which is a weaker refusal than an absent grant, and a different one. So every claim below that
-- can be made about the ACL is also made about the policy catalog, and every claim about an
-- absence is paired with the presence that makes the absence mean something.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only
-- by a superuser, and a migration needing one is a migration that cannot apply on the platform it
-- targets, where `postgres` is not a superuser.
do $$
declare
  offending text;
  count_of  integer;
  narrowing text;
  probe     record;
  every_role constant text[] :=
    array['authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz'];
  -- The columns that fix what a target IS. Identity and scope (§8.5: a row may not be moved across
  -- tenant or scope by an update), the destination, the pin, and the provenance.
  fixed_columns constant text[] :=
    array['id', 'workspace_id', 'business_profile_id', 'content_item_id', 'social_account_id',
          'content_variant_id', 'created_by', 'created_at'];
begin
  -- ENABLE AND FORCE. They are DIFFERENT CATALOG COLUMNS and the data package's own lint rule reads
  -- only the first (RFC-2026-016 §4). Without FORCE the table owner is exempt from every policy,
  -- and the owner is the role migrations run as.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'app.% does not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending;
  end if;

  -- THE DEFERRAL, AS A FACT ABOUT THE CATALOG. No foreign key on this table may involve
  -- `social_account_id`, in any position of any key. §6's registry gives the social FK to batch
  -- 111, and the day somebody writes it here instead this migration must fail rather than quietly
  -- perform another batch's deliverable. Asked of pg_constraint rather than of this file's own
  -- text, because a key added by a LATER statement -- or by a later batch that edits this one --
  -- would not appear in the text above at all.
  select string_agg(con.conname, ', ') into offending
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and con.contype = 'f'
     and exists (
       select 1 from pg_catalog.pg_attribute a
        where a.attrelid = c.oid
          and a.attname = 'social_account_id'
          and a.attnum = any (con.conkey)
     );
  if offending is not null then
    raise exception 'batch 081 wrote a foreign key on social_account_id: %', offending
      using hint = '§6''s migration ownership registry gives "business-channel/social FK" to batch '
                   '111 (A0 Integration, depending on 110, 020 and 081). app.social_accounts exists '
                   'on disk, so this key is WITHHELD rather than impossible, and withholding it is '
                   'the whole content of "target placeholder contract". The cost -- nothing checks '
                   'that a destination exists or belongs to this tenant -- is in the work package''s '
                   'open blockers, owed to A0 Integration.';
  end if;

  -- AND THE OTHER SIDE OF THE SAME CLAIM: the two references this batch IS entitled to enforce are
  -- present. Asserting only the absence would be satisfied by a table with no foreign keys at all,
  -- which is the failure mode a deferral is most likely to slide into.
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and con.contype = 'f'
     and con.conname in ('content_targets_item_scope_fk', 'content_targets_variant_scope_fk')
     and pg_catalog.array_length(con.conkey, 1) = 3;
  if count_of <> 2 then
    raise exception 'the item and the pin must each reach their parent over the WHOLE scope path, and % of the two do',
      count_of
      using hint = '§4 invariant 10: an unrelated Workspace/Business/row triple must fail at the '
                   'database. A two-column key on (workspace_id, content_item_id) or a bare key on '
                   'the id alone would let a target name a parent in another Business, which is the '
                   'weakness batch 080 had to record about content_ideas.research_suggestion_id and '
                   'which this table has no excuse for.';
  end if;

  -- §4.6's "unique active target", AS THE INDEX IT ACTUALLY IS. Four different objects could be
  -- described by the words above and only one of them enforces the rule: a NON-UNIQUE index bounds
  -- nothing; a unique index that is NOT PARTIAL forbids ever re-targeting a destination after the
  -- first target is soft-deleted; a unique index over the wrong columns is a different rule. So
  -- uniqueness, partiality and the exact column set are all asserted, and `indpred` is the column
  -- that tells a partial index from a whole one.
  select count(*) into count_of
    from pg_catalog.pg_index ix
    join pg_catalog.pg_class ic on ic.oid = ix.indexrelid
    join pg_catalog.pg_class c  on c.oid = ix.indrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and ic.relname = 'content_targets_active_destination'
     and ix.indisunique
     and ix.indpred is not null
     and ix.indnatts = 2
     and (select array_agg(a.attname::text order by k.ord)
            from unnest(ix.indkey::smallint[]) with ordinality as k(attnum, ord)
            join pg_catalog.pg_attribute a
              on a.attrelid = c.oid and a.attnum = k.attnum)
         = array['content_item_id', 'social_account_id']::text[];
  if count_of <> 1 then
    raise exception 'the active-target rule is not a partial unique index over (content_item_id, social_account_id)'
      using hint = '§4.6: "unique active target ต่อ content item/social account". Which `status` '
                   'values are ACTIVE is a vocabulary nobody has decided, so the rule is written '
                   'over `deleted_at is null` -- STRICTER than §4.6 states it, in the direction that '
                   'refuses a duplicate LIVE destination, because a duplicate live target for one '
                   'item and one destination is the shape of a double post. Recorded in the open '
                   'blockers and owed to Product.';
  end if;

  -- THE IDENTITY, THE DESTINATION AND THE PIN ARE UNWRITABLE AFTER INSERT, PER COLUMN, AGAINST THE
  -- LIVE ACL. The UPDATE grant above names four columns and this is what says so about the rest.
  -- Asserted against the catalog rather than against the grant list, because a grant made by a
  -- LATER batch would not appear in this file -- and because the control here is an ABSENCE, which
  -- is exactly the kind of thing a file cannot show about itself.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(fixed_columns) as col
       where n.nspname = 'app'
         and c.relname = 'content_targets'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity, destination or pin column of app.content_targets is updatable: %', offending
      using hint = 'A pin the pinner can move afterwards is not a pin (§4.6: "target pin immutable '
                   'version ก่อน approve/schedule"), and §8.5 forbids moving a row across tenant or '
                   'scope with an update. Re-aiming a target at another item or another destination '
                   'is CREATING a different target. Re-pinning is a domain command''s act, and no '
                   'command function exists anywhere in this repository (RFC-2026-021 §10), which is '
                   'a cost recorded in the open blockers rather than paid with a grant.';
  end if;

  -- AND THE PRESENCE THAT MAKES THAT ABSENCE MEAN SOMETHING: the four columns the client MAY write
  -- are actually granted. Without this, the assertion above is satisfied by a table `authenticated`
  -- holds no UPDATE on at all, and §8.2 row 2's `Y` would be implemented by nothing.
  select string_agg(col, ', ') into offending
    from unnest(array['status', 'updated_at', 'updated_by', 'deleted_at']) as col
   where not exists (
     select 1
       from pg_catalog.pg_class c
       join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'app'
        and c.relname = 'content_targets'
        and pg_catalog.has_column_privilege('authenticated', c.oid, col, 'UPDATE')
   );
  if offending is not null then
    raise exception 'authenticated holds no UPDATE on column(s) §8.2 row 2 gives it: %', offending;
  end if;

  -- NO ROLE HOLDS DELETE. §8.5 has no broad user delete; `deleted_at` is the soft delete this table
  -- does have, and hard removal is batch 160's retention sweep through app_maintenance, which this
  -- batch grants nothing.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'content_targets'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a content target can be deleted through a granted path: %', offending;
  end if;

  -- app_worker HOLDS NOTHING, which is batch 080's departure from 070's shape, kept here for the
  -- same reason. The writer this family needs is a SECURITY DEFINER function owned by app_command,
  -- exempt by OWNERSHIP rather than by privilege (RFC-2026-017 §3); granting a worker the verbs
  -- would build the second path to the same act -- the shape RFC-2026-018 was superseded for
  -- proposing. The consequence, stated rather than discovered: every service case in the isolation
  -- suite for this table is a PRIVILEGE refusal, none of them carries RFC-2026-017 §7, and none is
  -- part of the CI negative control's basis.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and (pg_catalog.has_any_column_privilege('app_worker', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('app_worker', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'app_worker holds a privilege on app.%, and batch 081 grants it none', offending;
  end if;

  -- `anon` holds nothing. RFC-2026-021 §7/4 decided that as a NEGATIVE, and it is the one
  -- client-role property no approved decision is expected to move.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on app.%, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- app_authz reaches nothing. RFC-2026-020 §6.1/6 pins its grants to USAGE on schema app plus four
  -- columns of app.workspace_members; 081 creates no helper and needs no exemption.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- NO POLICY NAMES ANY ROLE BUT `authenticated`, and the service half of that is a DECISION rather
  -- than an omission. RFC-2026-022 §3 carries a service policy for a cell the §8 matrix marks `S`.
  -- Content has no `S` cell anywhere -- its Service column is `P`, and a `P` with no capability
  -- defined is not an `S` -- so db/foundation/lint/service-policy-map.json gets no entry from this
  -- batch and no policy here may name a service role. That is batch 080's conclusion for this
  -- family, restated because an assertion inherited silently is an assertion nobody rechecked.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('anon', 'app_worker', 'app_command', 'app_maintenance',
                                      'app_authz'));
  if offending is not null then
    raise exception 'batch 081 left a policy for a role that is not authenticated: %', offending;
  end if;

  -- NO INSERT, UPDATE OR DELETE POLICY EXISTS THAT THE GRANTS ABOVE DO NOT BACK, AND NONE IS
  -- MISSING EITHER. `a` is INSERT, `w` is UPDATE, `d` is DELETE; `*` is the restrictive FOR ALL
  -- narrowing and is deliberately not counted here. There must be exactly one INSERT policy and
  -- exactly one UPDATE policy -- §8.2 row 2's two write paths -- and NO DELETE policy at all,
  -- because a DELETE policy beside the absent DELETE grant would be a table that only looks closed.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and pol.polcmd = 'd';
  if count_of <> 0 then
    raise exception 'app.content_targets carries % DELETE policy/policies and §8.5 has no broad user delete',
      count_of;
  end if;

  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and pol.polpermissive
     and pol.polcmd in ('r', 'a', 'w');
  if count_of <> 3 then
    raise exception 'app.content_targets carries % permissive read/insert/update policies and §8.2 gives it three',
      count_of
      using hint = 'One SELECT (row 1, `Y` for all five client roles), one INSERT and one UPDATE '
                   '(row 2, `Y` for owner, admin and editor). A missing one is a `Y` implemented by '
                   'nothing; a fourth is a path this batch did not write.';
  end if;

  -- ONE RESTRICTIVE NARROWING. `polpermissive` is the one catalog column that tells a narrowing
  -- from a widening: a PERMISSIVE policy with the same name and the same predicate would WIDEN the
  -- table instead of narrowing it, and §12.6/2 would silently stop being implemented here.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and not pol.polpermissive;
  if count_of <> 1 then
    raise exception 'batch 081 wrote % restrictive policies and it creates one table to narrow', count_of;
  end if;

  -- AND THE ASSERTION THIS BATCH OWES MOST, which is about the PREDICATE rather than its count and
  -- about BOTH CATALOG COLUMNS rather than one. `polqual` is USING and `polwithcheck` is WITH
  -- CHECK; 040's probe found that a reversal gutting one while leaving the other intact goes
  -- unnoticed by a test that looks at one of them.
  count_of := 0;
  for probe in
    select pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)      as using_half,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname = 'content_targets'
       and not pol.polpermissive
  loop
    count_of := count_of + 1;
    foreach narrowing in array array[probe.using_half, probe.check_half] loop
      if narrowing is null or position('content_items' in narrowing) = 0 then
        raise exception 'the content target narrowing does not resolve through its item: %',
          coalesce(narrowing, '<an empty half of the restrictive policy>')
          using hint = 'A target carries no page column, so its reach is its item''s reach. A '
                       'narrowing that asked about the target''s own columns would ask the Business '
                       'question about a page-restricted item''s destinations, and every member of '
                       'the workspace would see them.';
      end if;
      -- AND BOTH BRANCHES OF THE PARENT'S QUESTION. §4 invariant 3 makes the Page scope a nullable
      -- override on a row that always carries a Business scope, so the predicate decides per row
      -- which question to ask. A narrowing that resolved through content_items and then asked only
      -- the Business question admits every member scoped to a sibling Page -- which is the exact
      -- defect the fixture's sibling-page row exists to catch, and asserting it here as well means
      -- the defect fails at APPLY TIME rather than only in a suite somebody could delete a case
      -- from.
      if position('member_scope_admits_business' in narrowing) = 0
         or position('member_scope_admits_page' in narrowing) = 0 then
        raise exception 'the content target narrowing does not ask both the Business and the Page question: %',
          narrowing;
      end if;
    end loop;
  end loop;
  if count_of <> 1 then
    raise exception 'batch 081 found % restrictive policies to inspect and there must be one', count_of;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason every batch since 020 asks
  -- them: scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  -- If app_command owned the table, the command function this family is waiting for would be exempt
  -- from the policies above BY OWNERSHIP and the narrowing would bound nothing it does.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 081 creates is owned by a role that must not own one: %', offending;
  end if;
end $$;
