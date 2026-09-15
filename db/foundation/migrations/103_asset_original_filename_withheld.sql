-- Batch 103 — the uploaded filename leaves the client SELECT grant.
--
-- Owner: A0 Integration / DB-00. Closes A1-100 S2 (evidence/WP-0A-DB-00/a1-security-batch-100-2026-09-15.md
-- §2A, HIGH): batch 100's column comment on app.asset_versions.original_filename says the column
-- is "outside the grant most readers would expect it in", and it is the twelfth column of the only
-- client SELECT grant there is (100_asset.sql:1059-1063) -- so every active member of the workspace
-- who can reach the asset, the viewer included, reads a PII-2 value the storage contract says is
-- "จำกัดสิทธิ์" (sprint-0a-object-storage-lifecycle-contract-th.md §4.2) and the UX spec says is
-- "แสดงเฉพาะผู้มีสิทธิ์" (asset-library-database-ux-spec-th.md:130). Batch 100 met the identical
-- sentence on app.asset_rights ("by permission") and withheld four columns from the grant, with a
-- case; it did not apply its own rule to this column, and its comment says it did.
--
-- Product Owner disposition, 2026-09-15 (evidence/WP-0A-DB-00/product-owner-disposition-2026-09-15-rfcs-and-pii-filename.md
-- answer 3, "ตามแนะนำ"): withdraw the column from the client grant. So:
--
--   revoke select (original_filename) on app.asset_versions from authenticated;
--
-- and nothing else. WHO IS ENTITLED ("ผู้มีสิทธิ์") IS NOT DEFINED BY ANY DOCUMENT, which is the same
-- refusal batch 100 recorded for asset_rights: a permission this repository does not define arrives
-- as a missing column in a grant, not as a policy that guesses. When a document names the role, the
-- batch that reads it grants the column back to that role's projection (RFC-2026-021 §3) and not to
-- `authenticated`. app_worker keeps SELECT and INSERT on the column: the upload pipeline writes it
-- and the service tier reads it for the signed-URL response's Content-Disposition, both behind the
-- closure batch 101 put on this table.
--
-- The column comment batch 100 applied cannot be edited (migration invariant 1: a merged batch is
-- not rewritten); this file corrects the COMMENT in the catalog, which is what a reader of the
-- database sees, and leaves 100's text as reviewed.

revoke select (original_filename) on app.asset_versions from authenticated;

comment on column app.asset_versions.original_filename is
  'PII-2 within a MEDIA-2 row. WITHHELD from the client SELECT grant by batch 103 (it was in batch 100''s grant, '
  'contrary to 100''s own comment -- A1-100 S2): the storage contract §4.2 says "จำกัดสิทธิ์" and the UX spec '
  'says "แสดงเฉพาะผู้มีสิทธิ์", and no document names who has the right, so no client role reads it until one '
  'does. app_worker reads and writes it. Never an object key (§4.2).';

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED
-- ============================================================================================
do $$
declare
  offending text;
begin
  -- 1. authenticated holds no privilege of any kind on the column.
  if pg_catalog.has_column_privilege('authenticated', 'app.asset_versions', 'original_filename', 'SELECT')
     or pg_catalog.has_column_privilege('authenticated', 'app.asset_versions', 'original_filename', 'INSERT')
     or pg_catalog.has_column_privilege('authenticated', 'app.asset_versions', 'original_filename', 'UPDATE') then
    raise exception 'authenticated still holds a privilege on app.asset_versions.original_filename';
  end if;
  -- 2. The rest of the client SELECT projection is untouched: every other column batch 100 granted is still granted.
  select string_agg(a.attname, ', ') into offending
    from pg_catalog.pg_attribute a
   where a.attrelid = 'app.asset_versions'::regclass and a.attnum > 0 and not a.attisdropped
     and a.attname <> 'original_filename'
     and not pg_catalog.has_column_privilege('authenticated', 'app.asset_versions', a.attname, 'SELECT');
  if offending is not null then
    raise exception 'batch 103 withdrew more than the one column it names: % lost SELECT for authenticated', offending;
  end if;
  -- 3. The service tier still reads and writes it.
  if not pg_catalog.has_column_privilege('app_worker', 'app.asset_versions', 'original_filename', 'SELECT')
     or not pg_catalog.has_column_privilege('app_worker', 'app.asset_versions', 'original_filename', 'INSERT') then
    raise exception 'app_worker lost a privilege on original_filename that batch 103 did not withdraw';
  end if;
  -- 4. No other PII-2 column of this table is in the client grant, so the next one cannot hide behind this fix.
  --    The table's classification names ONE PII-2 column (100_asset.sql:709); a second would need its own line here.
end $$;
