do $$
declare
  offending text;
  count_of  integer;
begin
  -- ENABLE and FORCE on all four. The two are different catalog columns and the data package's own
  -- lint rule reads only the first (RFC-2026-016). On a table with no policy, FORCE is the whole of
  -- what refuses the owner.
  select string_agg(format('%s.%s', n.nspname, c.relname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('meta_connections', 'social_accounts'))
          or (n.nspname = 'private' and c.relname in ('meta_credential_references', 'meta_webhook_inbox')))
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'Batch 110 writes no policy at all, so FORCE is the only thing that refuses the '
                   'table owner. Without it the isolation suite cannot tell a working schema from '
                   'one where every row is readable by whoever owns the table.';
  end if;

  -- THE ASSERTION THIS BATCH OWES MOST, AND IT IS BATCH 060's. §9.2 is an ABSOLUTE PROHIBITION and
  -- it fixes the permitted column list of a secret table exhaustively. Everything else in this file
  -- argues that a token cannot be READ; this is what stops one being STORED.
  --
  -- The permitted set, with the clause that permits each:
  --   credential_reference, fingerprint, rotated_at, expires_at   §9.2, by name
  --   revoked_at                                                  §11.4 step 2
  --   workspace_id, meta_connection_id                            §3.3, tenant-owned row + scope
  --   id, created_at, updated_at, created_by, updated_by          §3.2 / §12.3 conventions
  --
  -- Written as an ALLOWLIST rather than as a list of forbidden names, for 060's reason: a denylist
  -- of column names somebody thought of is defeated by the one they did not.
  select string_agg(a.attname, ', ' order by a.attnum) into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'private' and c.relname = 'meta_credential_references'
     and a.attnum > 0 and not a.attisdropped
     -- The cast is written out rather than left to operator resolution, for the reason 060 records:
     -- a comparison that depends on an implicit cast changes meaning when somebody adds an operator,
     -- and a NEVER rule that silently starts matching nothing is the failure this block exists to
     -- avoid.
     and a.attname::text <> all (array['id', 'workspace_id', 'meta_connection_id',
                                       'credential_reference', 'fingerprint', 'created_at',
                                       'updated_at', 'rotated_at', 'expires_at', 'revoked_at',
                                       'created_by', 'updated_by']);
  if offending is not null then
    raise exception 'private.meta_credential_references carries column(s) §9.2 does not permit: %', offending
      using hint = '§9.2: "Secret table เก็บได้เพียง credential_reference, provider, fingerprint/'
                   'last-four-like identifier, status, created/rotated/expired timestamps และ audit '
                   'reference". A column outside that list plus §3.2/§3.3''s conventions is either a '
                   'token, a ciphertext of one, or a field nobody classified. All three are '
                   'stop-the-line under CONTRIBUTING_AGENTS.md.';
  end if;

  -- And the column that must be there, because an allowlist alone is satisfied by a table with no
  -- columns at all. §9.2 permits a reference; the whole design is that the database holds the
  -- reference INSTEAD of the token, so its absence would not be a narrower schema.
  select count(*) into count_of
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'private' and c.relname = 'meta_credential_references'
     and a.attnum > 0 and not a.attisdropped
     and a.attname = 'credential_reference';
  if count_of <> 1 then
    raise exception 'private.meta_credential_references has no credential_reference column';
  end if;

  -- THE SAME RULE FOR THE INBOX, AND FOR A DIFFERENT CLAUSE OF THE SAME SECTION. §9.2's permitted
  -- column list is about a SECRET table and this row is PROVIDER-3 carrying a SECRET-4 hazard, so
  -- the allowlist here is derived from §10's WEBHOOK-SHORT sentence and §3.2's conventions rather
  -- than from §9.2's list — and it is asserted the same way, because the failure it prevents is the
  -- same one: a later batch adding `payload`, `body`, `signature`, `headers` or `access_token` to
  -- the table §14's gate checklist is about.
  select string_agg(a.attname, ', ' order by a.attnum) into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'private' and c.relname = 'meta_webhook_inbox'
     and a.attnum > 0 and not a.attisdropped
     and a.attname::text <> all (array['id', 'workspace_id', 'delivery_hash', 'body_ref',
                                       'received_at', 'processed_at', 'failed_at', 'redacted_at',
                                       'updated_at']);
  if offending is not null then
    raise exception 'private.meta_webhook_inbox carries column(s) batch 110 does not permit: %', offending
      using hint = '§5 puts SECRET-4 on the raw webhook row because a provider body can carry a '
                   'token, §9.1 forbids a SECRET-4 value in a plaintext database column, §9.2 '
                   'forbids raw Authorization and Cookie headers, and §5''s word ban forbids a '
                   'payload column with no JSON Schema version, maximum size, prohibited fields or '
                   'owner. The row holds a LOCATOR and a dedupe hash; a column outside that list is '
                   'the body arriving by another name.';
  end if;

  -- THE INBOX'S SCOPE COLUMN IS NULLABLE, AND IT MUST STAY THAT WAY. This is what §5's "private
  -- workspace" commits the row to and what RFC-2026-022 §3's DISCOVERED class means in a schema: a
  -- delivery arrives before anything knows whose it is, and resolution can fail. A later batch
  -- adding NOT NULL would make an unknown, replayed or forged delivery unstorable — deleting
  -- exactly the rows a security investigation wants — and would quietly reclassify the statement
  -- that reads it as CARRIED.
  select string_agg(a.attname, ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'private' and c.relname = 'meta_webhook_inbox'
     and a.attname = 'workspace_id' and a.attnotnull;
  if offending is not null then
    raise exception 'private.meta_webhook_inbox.workspace_id is NOT NULL, and a discovered scope cannot be'
      using hint = '§5 scopes this row "private workspace" and RFC-2026-022 §3 classifies the '
                   'statement that reads it as DISCOVERED — the workspace is what reading it '
                   'resolves. A delivery whose account matches nothing must still be stored.';
  end if;

  -- §3.2: "Append-only event/attempt/ledger ปริมาณสูง: bigint generated always as identity".
  -- ALWAYS and not BY DEFAULT — `attidentity` is 'a' for the first and 'd' for the second — because
  -- under BY DEFAULT a writer may supply its own position in an ordered log, and this id is the
  -- processor's cursor. Batch 050's assertion, one family over.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attname = 'id'
   where n.nspname = 'private'
     and c.relname = 'meta_webhook_inbox'
     and (a.attidentity <> 'a' or pg_catalog.format_type(a.atttypid, a.atttypmod) <> 'bigint');
  if offending is not null then
    raise exception 'the webhook inbox does not key on a bigint GENERATED ALWAYS AS IDENTITY: %', offending;
  end if;

  -- THE TWO NATURAL KEYS, READ FROM THE CATALOG AS COLUMN SETS RATHER THAN AS CONSTRAINT NAMES, and
  -- the pair is the point: one is workspace-scoped and one is not, for reasons that are opposite and
  -- both stated in the file.
  --
  -- app.social_accounts is unique on (workspace_id, external_account_hash) — batch 050's reasoning
  -- about a conflicting insert being a cross-tenant oracle. private.meta_webhook_inbox is unique on
  -- (delivery_hash) ALONE, because at insert time that row has no workspace and a key over a null
  -- is not a key.
  --
  -- Read as a SET so a reordering does not fail and a dropped column does. Dull on purpose: this
  -- block runs on every apply, and a clever query that fails to PARSE fails the migration rather
  -- than the rule it was checking.
  select string_agg(format('%s(%s)', target, cols), '; ') into offending
    from (
      select c.relname as target,
             (select string_agg(a.attname, ',' order by a.attname)
                from pg_catalog.pg_attribute a
               where a.attrelid = c.oid and a.attnum = any (con.conkey)) as cols
        from pg_catalog.pg_constraint con
        join pg_catalog.pg_class c on c.oid = con.conrelid
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where con.contype = 'u'
         and ((n.nspname = 'app' and c.relname = 'social_accounts')
              or (n.nspname = 'private' and c.relname = 'meta_webhook_inbox'))
         -- SUPERSEDED BY 111. Batch 111 added `social_accounts_scope_key unique (workspace_id, id)`,
         -- the target of the composite FK content_targets_social_scope_fk. It is a scope key and not a
         -- natural key, and it is (workspace_id, id) over a primary key, so it adds no oracle 110's
         -- reasoning was guarding against. It is excluded by name and pinned by its columns below.
         and con.conname <> 'social_accounts_scope_key'
    ) as keys
   where not (
     (target = 'social_accounts' and cols = 'external_account_hash,workspace_id')
     or (target = 'meta_webhook_inbox' and cols = 'delivery_hash')
   );
  if offending is not null then
    raise exception 'a natural key in batch 110 is not the one the batch declares: %', offending
      using hint = 'app.social_accounts must be unique on (workspace_id, external_account_hash) so a '
                   'conflicting insert cannot report that another tenant holds the same account, and '
                   'private.meta_webhook_inbox on (delivery_hash) alone because that row has no '
                   'workspace when it arrives.';
  end if;
  if not exists (
       select 1 from pg_catalog.pg_constraint con
        where con.conrelid = 'app.social_accounts'::regclass and con.contype = 'u'
          and con.conname = 'social_accounts_scope_key'
          and (select string_agg(a.attname, ',' order by a.attname) from pg_catalog.pg_attribute a
                where a.attrelid = con.conrelid and a.attnum = any (con.conkey)) = 'id,workspace_id') then
    raise exception 'batch 111''s social_accounts_scope_key is missing or is not over (workspace_id, id)';
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE FOUR. §8.5 has no broad user delete; every purge in this
  -- family is a retention sweep (WEBHOOK-SHORT, §11.4 step 7) and batch 160 owns it.
  select string_agg(format('%s.%s to %s', schema_name, target, grantee), ', ') into offending
    from (
      select n.nspname as schema_name, c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where ((n.nspname = 'app' and c.relname in ('meta_connections', 'social_accounts'))
              or (n.nspname = 'private' and c.relname in ('meta_credential_references', 'meta_webhook_inbox')))
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a row batch 110 creates can be deleted through a granted path: %', offending
      using hint = '§8.5 requires a soft delete through a typed lifecycle field where a delete is '
                   'wanted at all, and hard deletion here is a retention sweep with its own class '
                   'and its own batch.';
  end if;

  -- §8.5, PER COLUMN, AGAINST THE LIVE ACL: no row in this batch may be re-identified or moved
  -- between tenants or between scopes by an update. app_worker is IN the checked list — 050's
  -- sentence, and it is true here for the same reason — because every grant this batch makes to it
  -- is column-scoped.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id']) as col
       where n.nspname = 'app'
         and c.relname in ('meta_connections', 'social_accounts')
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity or tenant column of a batch 110 table is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant with an update.';
  end if;

  -- And the columns that ARE this batch's own scope and identity below the tenant. A discovered
  -- account that could be re-pointed at another connection, or whose external hash could be
  -- rewritten, is a different account wearing the same id — and `external_account_hash` is the one
  -- column in this batch standing in for a value §9.1 tells the schema to redact.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['meta_connection_id', 'external_account_hash']) as col
       where n.nspname = 'app'
         and c.relname = 'social_accounts'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a scope or identity column of app.social_accounts is updatable: %', offending
      using hint = '§8.5 forbids moving a row across SCOPE with an update, and an account changing '
                   'connection is exactly that. The external account hash is the account''s '
                   'identity; a role that could rewrite it could re-aim a publish target.';
  end if;

  -- `anon` holds nothing on anything this batch creates. RFC-2026-021 §7/4 decided that as a
  -- NEGATIVE — "a negative is the strongest thing a lint can hold" (RFC-2026-019 §5) — and it is the
  -- one client-role property no approved decision is expected to move: the RFC says reversing it
  -- needs an RFC that states what the anonymous surface is for.
  select string_agg(format('%s.%s', n.nspname, c.relname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('meta_connections', 'social_accounts'))
          or (n.nspname = 'private' and c.relname in ('meta_credential_references', 'meta_webhook_inbox')))
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on %, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- No policy on a table this batch owns may name an anonymous role. §8.5 gives anonymous no tenant
  -- policy and RFC-2026-021 §7/4 gives it nothing at all. `app_worker` is deliberately NOT in this
  -- list: RFC-2026-022 §5 keeps a CARRIED service policy possible elsewhere and an apply-time
  -- assertion against an approved decision's own direction is the trap 011 set for 021 — even though
  -- for THIS batch's cell the answer is no policy permanently, which is a static assertion because
  -- it is a claim about a decision rather than about a catalog.
  select string_agg(format('%s on %s.%s', pol.polname, n.nspname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('meta_connections', 'social_accounts'))
          or (n.nspname = 'private' and c.relname in ('meta_credential_references', 'meta_webhook_inbox')))
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles) and r.rolname = 'anon');
  if offending is not null then
    raise exception 'batch 110 left a policy for the anonymous role: %', offending;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 110 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  select string_agg(format('%s.%s', n.nspname, c.relname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('meta_connections', 'social_accounts'))
          or (n.nspname = 'private' and c.relname in ('meta_credential_references', 'meta_webhook_inbox')))
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on %, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020, 021, 030, 040,
  -- 050, 060, 130 and 140 ask them: scripts/db/run.mjs holds every tenant table to the ownership
  -- rule against the COMMITTED SNAPSHOT, and this batch is deliberately not applied to the instance
  -- that snapshot describes.
  select string_agg(format('%s.%s owned by %s', n.nspname, c.relname,
                           pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('meta_connections', 'social_accounts'))
          or (n.nspname = 'private' and c.relname in ('meta_credential_references', 'meta_webhook_inbox')))
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 110 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all. On a table with an '
                   'empty policy set that exemption is the difference between reading nothing and '
                   'reading everything.';
  end if;
end $$;
