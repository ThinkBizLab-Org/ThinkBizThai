-- Batch 111 — the social foreign key: a content target's destination is a social account of its own Workspace.
--
-- Owner: A0 Integration, and §6's registry says so by name: "111 | A0 Integration | 110,020,081 |
-- business-channel/social FK | A0 only". Migration invariant 6 — a cross-module foreign key is
-- created in an integration batch only — is why batch 081 WITHHELD this key rather than writing it
-- (081:14-32), asserted its own absence at apply time (081:395-420), and fixed three destination
-- symbols that named no row so the gap would be the first thing a reader met. This batch is that
-- deliverable. Depends on: 110 (app.social_accounts, whose `id` §3.3 makes the canonical
-- social_account_id), 020 (the scope shape), 081 (the column).
--
-- WHAT THE KEY IS. content_targets carries workspace_id; social_accounts is WORKSPACE-scoped (its
-- own comment: "Canonical scope workspace_id (§3.3), tied to its connection by a composite foreign
-- key"). So the reference is the composite (workspace_id, social_account_id) -> social_accounts
-- (workspace_id, id): a target may name only a destination its own Workspace discovered, which is
-- §4 invariant 10 at the destination end and the cross-tenant reference A1-081 S3 measured the
-- database accepting. That needs a unique key on social_accounts (workspace_id, id), which 110 did
-- not create because nothing referenced it; it is added here, in the shape every scope key in this
-- schema has (business_profiles, content_items, content_targets: `<table>_scope_key`).
--
-- WHAT IT IS NOT. Not business-scoped: a social account belongs to a Workspace and a content target
-- to a Business inside it; §4 says a Workspace holds many Pages and nothing ties a Page to one
-- Business, so a business-scoped key would encode a rule no document states. No ON DELETE action:
-- a social account that disappears while targets name it is a question §8's matrices do not answer
-- (110 gives the row no client DELETE at all), and the default NO ACTION is the refusal that makes
-- somebody decide. Not deferred: the reference is checked per statement, as every scope FK is.
--
-- MIGRATION INVARIANT 2, followed in shape and stated where it does not bite: the key is added NOT
-- VALID and validated in a second statement, which is the add -> validate -> enforce sequence for a
-- column that already exists and is NOT NULL. On every database this repository has, content_targets
-- is empty at this point (fixtures load after the set), so the validate step scans nothing; on a
-- database with rows whose destinations do not exist it fails HERE, naming the constraint, which is
-- the honest outcome -- invariant 2's chunked backfill is for a column being introduced, and this
-- column has held values since 081 with nothing to backfill them from.
--
-- WHAT THIS COSTS, so nobody is surprised: the three catalog symbols batch 081 fixed for its
-- destinations are RETIRED and three social-account symbols take their place, with 110's fixture now
-- fixing the ids it used to let default; 081's fixture and every case that named a destination are
-- repointed. Batch 081 said the fixture would refuse to load until 111 did this. It did.

-- The scope key 110 did not need and this batch does.
alter table app.social_accounts
  add constraint social_accounts_scope_key unique (workspace_id, id);

-- The supporting index, leading with the key's columns (the live lint asks every foreign key for one).
create index if not exists content_targets_social_scope_idx
  on app.content_targets (workspace_id, social_account_id);

alter table app.content_targets
  add constraint content_targets_social_scope_fk
    foreign key (workspace_id, social_account_id)
    references app.social_accounts (workspace_id, id)
    not valid;

alter table app.content_targets validate constraint content_targets_social_scope_fk;

comment on constraint content_targets_social_scope_fk on app.content_targets is
  'Batch 111 (A0 Integration, §6 registry): a target names a social account of its own Workspace. '
  'Composite over workspace_id so a destination in another tenant is refused at the database (§4 '
  'invariant 10). Withheld by batch 081 by design; A1-081 S3 measured the gap before this key.';

do $$
declare
  offending text;
  count_of  integer;
begin
  -- The key exists, over exactly these two columns, in this order, references social_accounts,
  -- and is VALIDATED -- a NOT VALID key that was never validated is a key on new rows only.
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_class r on r.oid = con.confrelid
   where n.nspname = 'app' and c.relname = 'content_targets'
     and con.conname = 'content_targets_social_scope_fk'
     and con.contype = 'f' and con.convalidated
     and r.relname = 'social_accounts'
     and con.conkey = (select array_agg(a.attnum order by array_position(array['workspace_id', 'social_account_id'], a.attname::text))
                         from pg_catalog.pg_attribute a where a.attrelid = c.oid and a.attname in ('workspace_id', 'social_account_id'))
     and con.confkey = (select array_agg(a.attnum order by array_position(array['workspace_id', 'id'], a.attname::text))
                          from pg_catalog.pg_attribute a where a.attrelid = r.oid and a.attname in ('workspace_id', 'id'));
  if count_of <> 1 then
    raise exception 'batch 111 did not leave content_targets_social_scope_fk as a validated (workspace_id, social_account_id) -> app.social_accounts (workspace_id, id) key';
  end if;

  -- 081's apply-time assertion said no key may involve social_account_id; that assertion ran when
  -- 081 applied and is now satisfied by exactly one key, which is this batch's. Any second key on
  -- the column would be a second owner.
  select string_agg(con.conname, ', ') into offending
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'content_targets' and con.contype = 'f'
     and con.conname <> 'content_targets_social_scope_fk'
     and exists (select 1 from pg_catalog.pg_attribute a
                  where a.attrelid = c.oid and a.attname = 'social_account_id' and a.attnum = any (con.conkey));
  if offending is not null then
    raise exception 'a second foreign key involves social_account_id: %', offending;
  end if;

  -- The supporting index leads with the key's first column.
  if not exists (
    select 1 from pg_catalog.pg_index ix
      join pg_catalog.pg_class ic on ic.oid = ix.indexrelid
      join pg_catalog.pg_class c on c.oid = ix.indrelid
     where c.relname = 'content_targets' and ic.relname = 'content_targets_social_scope_idx'
       and ix.indkey[0] = (select attnum from pg_catalog.pg_attribute where attrelid = c.oid and attname = 'workspace_id')
       and ix.indkey[1] = (select attnum from pg_catalog.pg_attribute where attrelid = c.oid and attname = 'social_account_id')) then
    raise exception 'content_targets_social_scope_idx does not lead with (workspace_id, social_account_id)';
  end if;
end $$;
