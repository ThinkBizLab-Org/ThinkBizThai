do $$
declare
  offending text;
  count_of  integer;
  narrowing text;
  probe     record;
  every_role constant text[] :=
    array['authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz'];
  -- §9.1's MEDIA-2 storage rule is "private bucket", which is a statement about where the object
  -- lives. 060 wrote the mechanism for a plaintext credential, 070 reused it for a captured page and
  -- 131 for a payment instrument: an ALLOWLIST, because a denylist of column names somebody thought
  -- of is defeated by the one they did not.
  version_columns constant text[] :=
    array['id', 'workspace_id', 'business_profile_id', 'asset_id', 'version_no',
          'parent_version_id', 'purpose', 'platform', 'storage_provider', 'bucket', 'object_key',
          'original_filename', 'detected_mime', 'byte_size', 'width', 'height', 'duration_ms',
          'sha256', 'status', 'purged_at', 'created_at', 'updated_at', 'created_by'];
  -- The four columns an otherwise immutable version may move, and the whole of what any role may
  -- update on it.
  version_mutable constant text[] :=
    array['status', 'object_key', 'purged_at', 'updated_at'];
  asset_tables constant text[] :=
    array['assets', 'asset_versions', 'asset_rights', 'content_asset_links'];
begin
  -- SUPERSEDED BY 101, 102. Batch 100 wrote one restrictive narrowing per table. The later files
  -- added restrictive policies to the same tables: asset_rights_service_path_closed (101), asset_rights_updated_by_is_caller (102), asset_versions_service_path_closed (101), assets_service_path_closed (101), assets_updated_by_is_caller (102), content_asset_links_service_path_closed (101).
  -- Each of those is asserted by its own batch's block, which this pass also re-runs. The final-state
  -- form below pins every table's restrictive set by name, then excludes the later names from the 2
  -- restrictive predicates of 100's original assertions, which are otherwise kept word for word.
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.asset_rights'::regclass and not pol.polpermissive)
     is distinct from array['asset_rights_scope_narrows_member', 'asset_rights_service_path_closed', 'asset_rights_updated_by_is_caller'] then
    raise exception 'app.asset_rights restrictive policies are not exactly batch 100''s narrowing and the ones 101, 102 added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.asset_versions'::regclass and not pol.polpermissive)
     is distinct from array['asset_versions_scope_narrows_member', 'asset_versions_service_path_closed'] then
    raise exception 'app.asset_versions restrictive policies are not exactly batch 100''s narrowing and the ones 101 added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.assets'::regclass and not pol.polpermissive)
     is distinct from array['assets_scope_narrows_member', 'assets_service_path_closed', 'assets_updated_by_is_caller'] then
    raise exception 'app.assets restrictive policies are not exactly batch 100''s narrowing and the ones 101, 102 added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.content_asset_links'::regclass and not pol.polpermissive)
     is distinct from array['content_asset_links_scope_narrows_member', 'content_asset_links_service_path_closed'] then
    raise exception 'app.content_asset_links restrictive policies are not exactly batch 100''s narrowing and the ones 101 added';
  end if;
  -- ENABLE and FORCE on all four. The two are DIFFERENT CATALOG COLUMNS and the data package's own
  -- lint rule reads only the first (RFC-2026-016 §4).
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'FORCE is what keeps the table owner subject to the policies, and it is what the CI negative control switches off to prove the isolation suite notices.';
  end if;

  -- THE MEDIA-2 COLUMN ALLOWLIST, against the live catalog. §9.1's storage rule for this class is
  -- "private bucket; short signed access" and its client projection is "authorized signed URL
  -- only" — both statements that the object is not in the database. This is what makes that a
  -- control rather than a comment: a later batch that adds `bytes bytea`, `data bytea` or
  -- `thumbnail_base64 text` fails the migration rather than the code review.
  select string_agg(a.attname, ', ' order by a.attname) into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'asset_versions'
     and a.attnum > 0 and not a.attisdropped
     and a.attname::text <> all (version_columns);
  if offending is not null then
    raise exception 'app.asset_versions carries column(s) a MEDIA-2 row may not hold: %', offending
      using hint = '§9.1 gives MEDIA-2 the storage rule "private bucket; short signed access" and the client projection "authorized signed URL only", and §1/2 of the asset design makes PostgreSQL the source of truth for.';
  end if;

  -- AND NO TABLE IN THIS BATCH CARRIES THE OBJECT BY ANOTHER NAME. The allowlist above protects one
  -- table; the media would most plausibly arrive on the asset row as a thumbnail.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join unnest(array['bytes', 'data', 'blob', 'binary', 'file', 'file_data', 'content',
                            'body', 'image', 'image_data', 'thumbnail', 'thumbnail_data',
                            'thumbnail_base64', 'base64', 'payload', 'preview_data',
                            'poster_data']) as forbidden
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and a.attnum > 0 and not a.attisdropped
     -- `attname` is `name` and the array is `text`; the cast is written rather than left to an
     -- implicit one, which is 050's rule about a parameter whose type is inferred from whichever
     -- context the planner reaches first.
     and a.attname::text = forbidden;
  if offending is not null then
    raise exception 'a batch 100 table carries the media object itself: %', offending
      using hint = '§9.1 puts MEDIA-2 in a private bucket reached by a short signed URL. The database holds the locator and the digest. If this is the batch that changes that, it edits this assertion in a diff a reviewer reads.';
  end if;

  -- NO COLUMN IN THIS BATCH IS A PREFIX, A GLOB OR A PATTERN. This is CONTRIBUTING_AGENTS.md's
  -- "Production object deletion uses an approved immutable manifest of exact object keys; never
  -- recursively delete a user-supplied prefix" and §9.3's "ห้ามเรียก bulk delete ด้วย unvalidated
  -- prefix ไม่ว่ากรณีใด", as a catalog assertion. A column that held a prefix would make a prefix
  -- purge expressible AS DATA, which is how it would arrive in a manifest nobody reads.  This is
  -- a DENYLIST and it is the weaker instrument, which is why app.asset_versions also carries the
  -- full allowlist above;
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join unnest(array['prefix', 'key_prefix', 'object_prefix', 'path_prefix', 'bucket_prefix',
                            'object_key_prefix', 'glob', 'pattern', 'wildcard', 'key_pattern',
                            'purge_prefix']) as forbidden
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and a.attnum > 0 and not a.attisdropped
     and a.attname::text = forbidden;
  if offending is not null then
    raise exception 'a batch 100 column expresses an object-key PREFIX: %', offending
      using hint = 'CONTRIBUTING_AGENTS.md: "Production object deletion uses an approved immutable manifest of exact object keys;';
  end if;

  -- AND THE CONSTRAINT THAT KEEPS A STORED KEY FROM BEING A PREFIX MUST EXIST. A negative is the
  -- strongest thing a lint can hold (RFC-2026-019 §5), and this is its positive twin: the assertion
  -- above refuses a column that is a prefix, and this one refuses the removal of the constraint that
  -- refuses a VALUE that is one.
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'asset_versions'
     and con.contype = 'c'
     and con.conname = 'asset_versions_object_key_names_one_object';
  if count_of <> 1 then
    raise exception 'app.asset_versions has no constraint holding object_key to one exact object'
      using hint = 'A key ending in `/` is a folder and a key containing a wildcard is a pattern; either one in a purge manifest is the recursive prefix delete CONTRIBUTING_AGENTS.md forbids, arriving as data rather than as a.';
  end if;

  -- NO RETENTION NUMBER, FOR ANY OF THE FOUR CLASSES §5 ASSIGNS THIS FAMILY. §10's own header makes
  -- every number in its table an engineering default requiring Product/Security/Legal approval
  -- before Paid Beta, and §15's closing sentence is that an open decision is not an agent's to
  -- choose. This is 070's DATA-DEC-07 assertion applied to ASSET-ORIGINAL, ASSET-DERIVATIVE,
  -- RIGHTS-PROOF and UPLOAD-TEMP at once.
  select string_agg(format('%s on %s', con.conname, c.relname), ', ') into offending
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and con.contype = 'c'
     and pg_catalog.pg_get_constraintdef(con.oid) ~* '\minterval\M';
  if offending is not null then
    raise exception 'a batch 100 constraint encodes a retention interval: %', offending
      using hint = '§10 gives ASSET-ORIGINAL "Trash 30 วัน" and RIGHTS-PROOF "2 ปี default", and §10''s header makes both unapproved engineering defaults.';
  end if;

  -- AND NEITHER RETENTION COLUMN CARRIES A DEFAULT. `atthasdef` is a catalog column and is the only
  -- place the difference between "every writer states a limit" and "every row inherits thirty days"
  -- is recorded.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and ((c.relname = 'assets' and a.attname = 'purge_after')
       or (c.relname = 'asset_rights' and a.attname = 'expires_at'))
     and a.atthasdef;
  if offending is not null then
    raise exception 'a batch 100 retention column carries a default: %', offending
      using hint = 'A default would make every row silently assert an unapproved number, which is the decision arriving as a column (010''s refusal for DATA-DEC-04, 130''s for BILL-DEC-012, 061''s for a reservation''s expiry, 070''s.';
  end if;

  -- THE VERSION IS IMMUTABLE EXCEPT THE FOUR, PER COLUMN, AGAINST THE LIVE ACL. This is the
  -- assertion this batch was written around, and it is asked of every role rather than of the one
  -- the grant above names, because a grant made by a LATER batch would not appear in this file at
  -- all.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, a.attname as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        join pg_catalog.pg_attribute a on a.attrelid = c.oid
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'asset_versions'
         and a.attnum > 0 and not a.attisdropped
         and a.attname::text <> all (version_mutable)
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, a.attname, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a column of an asset version other than the four that move is updatable: %', offending
      using hint = '§5''s mutability column reads "logical mutable; versions IMMUTABLE" and §4.2 of the asset design says "ห้าม UPDATE object location/content หลัง ready; การแก้ไขสร้าง row ใหม่".';
  end if;

  -- AND THE SAME TABLE CARRIES NO UPDATE OR DELETE POLICY. Either half alone can be satisfied
  -- while the other is wrong: a policy with no grant is inert, and a grant with no policy is
  -- denied by row level security rather than by privilege, which is a weaker refusal than
  -- immutability asks for (130's sentence, kept by 131, 070 and 080). `w` is UPDATE and `d` is
  -- DELETE. Both tables are in this list for different reasons: the link is APPEND-ONLY, so a `w`
  -- policy would contradict its own comment;
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('asset_versions', 'content_asset_links')
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'an immutable or append-only batch 100 table carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- THE LINK IS APPEND-ONLY AS THE PRIVILEGE SYSTEM HOLDS IT. No role holds UPDATE on any of its
  -- columns. `has_any_column_privilege` for UPDATE so a column-scoped grant is caught as well as a
  -- table-wide one — the measured trap that a full set of column grants leaves `has_table_privilege`
  -- false.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'content_asset_links'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a content asset link can be updated: %', offending
      using hint = 'APPEND-ONLY on batch 100''s reading of §4.7''s rule "การแก้ link หลังอนุมัติต้อง invalidate Approval": the sentence conditions mutation on a mechanism batch 090 has not written, and §8.2''s "Approved/published.';
  end if;

  -- §8.5, PER COLUMN, ON THE TWO TABLES A CLIENT MAY WRITE: no role may re-identify a row or move it
  -- between tenants or across scope. The two client UPDATE grants name fifteen columns between them
  -- and this is what says so about the rest. app_worker is IN the checked list for 050's reason:
  -- every grant this batch makes to it is column-scoped.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id',
                                'page_context_profile_id', 'kind', 'source', 'created_by',
                                'created_at']) as col
       where n.nspname = 'app'
         and c.relname = 'assets'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id', 'asset_id',
                                'created_by', 'created_at']) as col
       where n.nspname = 'app'
         and c.relname = 'asset_rights'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity or scope column of a batch 100 table is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant OR scope with an update, and page_context_profile_id is in this list because it carries the second half of the scope (040''s sentence).';
  end if;

  -- AND `purge_after` IS OUTSIDE EVERY CLIENT UPDATE GRANT. A trash window a client can push forward
  -- is not a window, which is 070's sentence about retention_until in a family with four retention
  -- classes instead of one. app_worker HOLDS it, because computing an earliest purge from an
  -- approved policy is the service's act — so this assertion names the client roles rather than
  -- every role.
  select string_agg(format('assets.%s to %s', col, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
    cross join unnest(array['purge_after', 'current_version_id']) as col
   where n.nspname = 'app' and c.relname = 'assets'
     and r.rolname in ('authenticated', 'anon')
     and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE');
  if offending is not null then
    raise exception 'a client role can write an asset''s purge window or its current-version pointer: %', offending
      using hint = 'purge_after is §10''s unapproved Trash window and a client that could push it forward would hold captured storage indefinitely;';
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE FOUR. §8.5 has no broad user delete, §11.5 makes a user
  -- delete a move to Trash, and §8.2's hard purge is an UPDATE of purged_at rather than the removal
  -- of a row (§9.3/11 of the object storage lifecycle contract: "อัปเดต deleted_at/purged_at แบบ
  -- idempotent"). THIS IS ALSO THE LAST DEFENCE THE PREFIX RULE HAS INSIDE THE DATABASE: with no
  -- DELETE anywhere, nothing a granted path can issue removes a row at all, which bounds a bad purge
  -- to a redaction. It does not bound WHICH rows are redacted, and the header says so.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname::text = any (asset_tables)
         and r.rolname::text = any (every_role)
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'an asset row can be deleted through a granted path: %', offending
      using hint = '§8.5 requires a soft delete through a typed lifecycle field, §11.5 makes a user delete a move to Trash, and batch 160 owns the retention sweep through app_maintenance, which this batch grants nothing.';
  end if;

  -- `anon` holds nothing on anything this batch creates. RFC-2026-021 §7/4 decided that as a
  -- NEGATIVE and it is the one client-role property no approved decision is expected to move.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on app.%, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- No policy this batch's tables carry may name an anonymous role. §8.5 gives anonymous no tenant
  -- policy. app_worker is deliberately NOT in this list: RFC-2026-022 §3 classifies this batch's `S`
  -- cell BOTH and expects a policy for the CARRIED half once its decision is in effect.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles) and r.rolname = 'anon');
  if offending is not null then
    raise exception 'batch 100 left a policy for the anonymous role: %', offending;
  end if;

  -- THE LOGICAL KEY'S NULL HANDLING, FROM `pg_index`. `content_variant_id` is nullable and is part
  -- of the key; under Postgres's default (NULLS DISTINCT) two variant-less links would not collide
  -- and §4.7's "unique (content_version_id, content_variant_id, role, sort_order)" would hold for
  -- nobody — which is every link that is not variant-specific. Batch 080 found this exact defect in
  -- its own logical key in CI, and the two spellings differ by three words.
  select count(*) into count_of
    from pg_catalog.pg_index i
    join pg_catalog.pg_class ic on ic.oid = i.indexrelid
    join pg_catalog.pg_namespace n on n.oid = ic.relnamespace
   where n.nspname = 'app'
     and ic.relname = 'content_asset_links_logical_key'
     and i.indnullsnotdistinct;
  if count_of <> 1 then
    raise exception 'content_asset_links_logical_key does not treat nulls as equal'
      using hint = 'Declared NULLS DISTINCT (the default), a link with no content_variant_id could be inserted any number of times for one (content_version_id, role, sort_order) — so §4.7''s uniqueness rule would be a sentence in.';
  end if;

  -- FOUR RESTRICTIVE POLICIES, ONE PER TABLE. `polpermissive` is the one catalog column that tells a
  -- narrowing from a widening: a permissive policy with the same name and the same predicate would
  -- WIDEN each table instead of narrowing it.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and not pol.polpermissive
     and (c.relname::text, pol.polname::text) not in (('asset_rights', 'asset_rights_service_path_closed'), ('asset_rights', 'asset_rights_updated_by_is_caller'), ('asset_versions', 'asset_versions_service_path_closed'), ('assets', 'assets_service_path_closed'), ('assets', 'assets_updated_by_is_caller'), ('content_asset_links', 'content_asset_links_service_path_closed'));  -- SUPERSEDED BY 101, 102: names another file wrote, see the header
  if count_of <> 4 then
    raise exception 'batch 100 wrote % restrictive policies and it creates four tables to narrow', count_of
      using hint = 'A child table with no narrowing is a table where every active member reaches every row their membership admits, which would leave a page-restricted asset''s versions and rights readable to a member the asset.';
  end if;

  -- THE ASSERTION THIS BATCH OWES MOST, and it is about the four predicates rather than their count.
  --
  -- BOTH CATALOG COLUMNS, AND THAT IS 040's PROBE RATHER THAN CAUTION. `polqual` is USING and
  -- `polwithcheck` is WITH CHECK; they are two predicates, and a reversal that gutted one while
  -- leaving the other intact went UNNOTICED by the first version of 040's block. A restrictive
  -- policy whose USING lost the Page branch filters nothing on read for a page-scoped member while
  -- still refusing their writes — the leak, without the symptom.
  count_of := 0;
  for probe in
    select c.relname as target,
           pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)      as using_half,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname::text = any (asset_tables)
       and not pol.polpermissive
       and (c.relname::text, pol.polname::text) not in (('asset_rights', 'asset_rights_service_path_closed'), ('asset_rights', 'asset_rights_updated_by_is_caller'), ('asset_versions', 'asset_versions_service_path_closed'), ('assets', 'assets_service_path_closed'), ('assets', 'assets_updated_by_is_caller'), ('content_asset_links', 'content_asset_links_service_path_closed'))  -- SUPERSEDED BY 101, 102: names another file wrote, see the header
  loop
    count_of := count_of + 1;
    foreach narrowing in array array[probe.using_half, probe.check_half] loop
      if probe.target = 'assets' then
        if narrowing is null
           or position('member_scope_admits_business' in narrowing) = 0
           or position('member_scope_admits_page' in narrowing) = 0 then
          raise exception 'the asset narrowing does not ask both the Business and the Page question: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = '§4 invariant 3 makes the Page scope a nullable override on a row that always carries a Business scope, so the narrowing decides per row which question to ask.';
        end if;
      elsif probe.target = 'content_asset_links' then
        -- TWO PARENTS, AND BOTH NAMES IN BOTH HALVES. A link reachable through only one of its
        -- parents is a link through which the other parent's boundary can be walked around.
        if narrowing is null
           or position('assets' in narrowing) = 0
           or position('content_versions' in narrowing) = 0 then
          raise exception 'the content asset link narrowing does not resolve through BOTH parents: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = '§4''s ERD gives this row an edge to a CONTENT_VERSION and an edge to an ASSET_VERSION, and §4.7 requires "same Workspace เสมอ" and "same Business".';
        end if;
      else
        if narrowing is null or position('assets' in narrowing) = 0 then
          raise exception 'the % narrowing does not resolve through its asset: %', probe.target,
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'A version and a rights record carry no page column, so each one''s reach is its asset''s reach — asserted rather than copied, because a nullable copy of the asset''s page could not be held equal to it by any.';
        end if;
      end if;
    end loop;
  end loop;
  if count_of <> 4 then
    raise exception 'batch 100 found % restrictive policies to inspect and there must be four', count_of;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 100 creates no helper and needs no
  -- exemption. The POLICY COUNT is deliberately not re-asserted: 021 owns that assertion.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason every batch since 020 asks
  -- them: scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 100 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat so that the policies here can NAME it and apply to it -- a SECURITY DEFINER function runs as its owner, and §3 wants that owner bound by RLS, not exempt from it. (Until integration on 2026-09-15 this hint read "is exempt from the policies on a forced table"; FORCE makes an owner subject to its own policies, so that was false -- C0 H2, the sentence batch 082 exists to correct.) RFC-2026-020 §5/2 says app_authz owns no table.';
  end if;
end $$;
