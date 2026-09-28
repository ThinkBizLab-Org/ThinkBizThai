do $$
declare
  offending        text;
  count_of         integer;
  narrowing        text;
  probe            record;
  probe_sqlstate   text;
  probe_seen       text[] := array[]::text[];
  every_role constant text[] :=
    array['authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz'];
  client_roles constant text[] := array['authenticated', 'anon'];
  publisher_tables constant text[] :=
    array['publish_intents', 'publish_targets', 'publish_target_assets', 'publish_jobs', 'published_posts'];
  service_written constant text[] :=
    array['publish_targets', 'publish_target_assets', 'publish_jobs', 'published_posts'];
  -- Columns no role may ever UPDATE, per table: identity, scope, the aim, the account, the pins,
  -- the requester, the key (§8.5, §4 invariant 4, §4.8).
  intent_fixed constant text[] :=
    array['id', 'workspace_id', 'business_profile_id', 'content_item_id', 'content_version_id',
          'requested_by', 'request_kind', 'idempotency_key', 'created_by', 'created_at'];
  target_fixed constant text[] :=
    array['id', 'workspace_id', 'business_profile_id', 'publish_intent_id', 'content_target_id',
          'social_account_id', 'content_variant_id', 'created_at'];
  job_fixed constant text[] :=
    array['id', 'workspace_id', 'business_profile_id', 'publish_target_id', 'kernel_job_id',
          'provider_request_key', 'created_at'];
begin
  -- SUPERSEDED BY 123 as well: batch 123 added `<table>_updated_by_on_update_is_caller`, restrictive, to publish_intents.
  -- SUPERSEDED BY 122. Batch 120 wrote one restrictive narrowing per table, plus two INSERT
  -- closures on publish_intents (094's and 102's shapes). The later files
  -- added restrictive policies to the same tables: publish_intents_service_path_closed (122), publish_target_assets_service_path_closed (122).
  -- Each of those is asserted by its own batch's block, which this pass also re-runs. The final-state
  -- form below pins every table's restrictive set by name, then excludes the later names from the 1
  -- restrictive predicates of 120's original assertions, which are otherwise kept word for word.
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.publish_intents'::regclass and not pol.polpermissive)
     is distinct from array['publish_intents_requester_is_caller', 'publish_intents_scope_narrowing', 'publish_intents_service_path_closed', 'publish_intents_updated_by_is_caller', 'publish_intents_updated_by_on_update_is_caller'] then  -- SUPERSEDED BY 123: its UPDATE closure
    raise exception 'app.publish_intents restrictive policies are not exactly batch 120''s narrowing and the ones 122 added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.publish_jobs'::regclass and not pol.polpermissive)
     is distinct from array['publish_jobs_scope_narrowing'] then
    raise exception 'app.publish_jobs restrictive policies are not exactly batch 120''s narrowing and the ones no later file added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.publish_target_assets'::regclass and not pol.polpermissive)
     is distinct from array['publish_target_assets_scope_narrowing', 'publish_target_assets_service_path_closed'] then
    raise exception 'app.publish_target_assets restrictive policies are not exactly batch 120''s narrowing and the ones 122 added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.publish_targets'::regclass and not pol.polpermissive)
     is distinct from array['publish_targets_scope_narrowing'] then
    raise exception 'app.publish_targets restrictive policies are not exactly batch 120''s narrowing and the ones no later file added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.published_posts'::regclass and not pol.polpermissive)
     is distinct from array['published_posts_scope_narrowing'] then
    raise exception 'app.published_posts restrictive policies are not exactly batch 120''s narrowing and the ones no later file added';
  end if;
  -- 1. ENABLE and FORCE on all five. Different catalog columns; the data package's lint reads one.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (publisher_tables)
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'batch 120 table(s) without ENABLE and FORCE ROW LEVEL SECURITY: %', offending;
  end if;

  -- 2. THE FORWARD KEY ON 081's TABLE EXISTS OVER EXACTLY THESE FOUR COLUMNS, and the publish target
  --    references it and 111's key both, validated.
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'content_targets'
     and con.conname = 'content_targets_destination_key' and con.contype = 'u'
     and con.conkey = (select array_agg(a.attnum order by array_position(
                          array['workspace_id', 'business_profile_id', 'id', 'social_account_id'], a.attname::text))
                         from pg_catalog.pg_attribute a
                        where a.attrelid = c.oid
                          and a.attname in ('workspace_id', 'business_profile_id', 'id', 'social_account_id'));
  if count_of <> 1 then
    raise exception 'batch 120 did not leave content_targets_destination_key as a unique key over (workspace_id, business_profile_id, id, social_account_id)';
  end if;
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_class r on r.oid = con.confrelid
   where c.relname = 'publish_targets' and con.contype = 'f' and con.convalidated
     and ((con.conname = 'publish_targets_content_target_fk' and r.relname = 'content_targets')
          or (con.conname = 'publish_targets_social_scope_fk' and r.relname = 'social_accounts'));
  if count_of <> 2 then
    raise exception 'batch 120 finds % of the two keys a publish target must carry to the aim and to the account', count_of;
  end if;
  -- And the social key is 111's, column for column: (workspace_id, social_account_id) -> (workspace_id, id).
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_class r on r.oid = con.confrelid
   where c.relname = 'publish_targets' and con.conname = 'publish_targets_social_scope_fk'
     and con.conkey = (select array_agg(a.attnum order by array_position(array['workspace_id', 'social_account_id'], a.attname::text))
                         from pg_catalog.pg_attribute a where a.attrelid = c.oid and a.attname in ('workspace_id', 'social_account_id'))
     and con.confkey = (select array_agg(a.attnum order by array_position(array['workspace_id', 'id'], a.attname::text))
                          from pg_catalog.pg_attribute a where a.attrelid = r.oid and a.attname in ('workspace_id', 'id'));
  if count_of <> 1 then
    raise exception 'publish_targets_social_scope_fk is not (workspace_id, social_account_id) -> app.social_accounts (workspace_id, id), which is batch 111''s shape';
  end if;

  -- 3. NO FOREIGN KEY IN THIS BATCH CARRIES AN ON DELETE ACTION (header: NO ACTION by this batch's
  --    own reason), and kernel_job_id carries no key at all.
  select string_agg(format('%s.%s', c.relname, con.conname), ', ') into offending
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname::text = any (publisher_tables)
     and con.contype = 'f' and con.confdeltype <> 'a';
  if offending is not null then
    raise exception 'a batch 120 foreign key carries an ON DELETE action: %', offending
      using hint = 'Publish history outlives its parents (PUBLISH-HISTORY is the life of the Workspace; 160 purges at closure). A purge that reaches a parent while a target names it fails against the history rather than cascading through it.';
  end if;
  if exists (select 1 from pg_catalog.pg_constraint con
              join pg_catalog.pg_class c on c.oid = con.conrelid
             where c.relname = 'publish_jobs' and con.contype = 'f'
               and exists (select 1 from pg_catalog.pg_attribute a
                            where a.attrelid = c.oid and a.attname = 'kernel_job_id' and a.attnum = any (con.conkey))) then
    raise exception 'publish_jobs.kernel_job_id carries a foreign key, which 061''s retention reason refuses';
  end if;

  -- 4. THE VOCABULARIES ARE THE OWNER'S, AS CHECKS. A vocabulary that quietly gained `cancelled` on
  --    the target would hand the worker a person's verb.
  if not exists (select 1 from pg_catalog.pg_constraint con join pg_catalog.pg_class c on c.oid = con.conrelid
                  where c.relname = 'publish_targets' and con.conname = 'publish_targets_status_known'
                    and pg_catalog.pg_get_constraintdef(con.oid) ~ 'pending' and pg_catalog.pg_get_constraintdef(con.oid) ~ 'published'
                    and pg_catalog.pg_get_constraintdef(con.oid) ~ 'skipped' and pg_catalog.pg_get_constraintdef(con.oid) !~ 'cancelled') then
    raise exception 'publish_targets_status_known does not carry the Owner''s vocabulary, or carries cancelled';
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint con join pg_catalog.pg_class c on c.oid = con.conrelid
                  where c.relname = 'publish_jobs' and con.conname = 'publish_jobs_status_known'
                    and pg_catalog.pg_get_constraintdef(con.oid) ~ 'queued' and pg_catalog.pg_get_constraintdef(con.oid) ~ 'succeeded') then
    raise exception 'publish_jobs_status_known does not carry the Owner''s vocabulary';
  end if;
  if exists (select 1 from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid = a.attrelid
              where c.relname = 'publish_intents' and a.attname = 'status' and not a.attisdropped) then
    raise exception 'app.publish_intents carries a status column; the Owner chose none (question 5b) and a later batch that adds one owes a mover and a vocabulary';
  end if;

  -- 5. NO CLIENT ROLE HOLDS INSERT OR UPDATE ON THE FOUR SERVICE-WRITTEN TABLES (§8.3 row 2, N for
  --    every client role), and NO ROLE HOLDS DELETE ON ANY OF THE FIVE (§8.5).
  select string_agg(format('%s to %s', c.relname, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname::text = any (service_written)
     and r.rolname::text = any (client_roles)
     and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE'));
  if offending is not null then
    raise exception 'a client role can write a delivery, a pin, a job or a post: %', offending
      using hint = '§8.3: "Publish delivery/post/metric INSERT | N | N | N | N | N | S".';
  end if;
  select string_agg(format('%s to %s', c.relname, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname::text = any (publisher_tables)
     and r.rolname::text = any (every_role)
     and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE');
  if offending is not null then
    raise exception 'a batch 120 row can be deleted through a granted path: %', offending
      using hint = '§8.5 has no broad delete; hard removal is batch 160''s at workspace closure through app_maintenance, which this batch grants nothing.';
  end if;

  -- 6. THE POST AND THE PIN ARE IMMUTABLE AS THE PRIVILEGE SYSTEM HOLDS THEM: no role holds UPDATE on
  --    any column of either, and neither carries an UPDATE or DELETE policy.
  select string_agg(format('%s to %s', c.relname, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname in ('published_posts', 'publish_target_assets')
     and r.rolname::text = any (every_role)
     and pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE');
  if offending is not null then
    raise exception 'an immutable batch 120 table can be updated: %', offending
      using hint = '§3.2: "Immutable ... publish history: ห้าม update เนื้อหาเดิม"; the pin is append-only for ADR-012''s reason (a pin that can move is not a pin).';
  end if;
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('published_posts', 'publish_target_assets')
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'an immutable batch 120 table carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- 7. §8.5 AND §4 INVARIANT 4, PER COLUMN, AGAINST THE LIVE ACL: no role may re-identify, re-home,
  --    re-aim, re-pin or re-key a row.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(intent_fixed) as col
       where n.nspname = 'app' and c.relname = 'publish_intents'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(target_fixed) as col
       where n.nspname = 'app' and c.relname = 'publish_targets'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(job_fixed) as col
       where n.nspname = 'app' and c.relname = 'publish_jobs'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity, scope, aim, account, pin or key column of a batch 120 table is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant or scope with an update; §4 invariant 4 pins the version; re-aiming a send is a different send.';
  end if;

  -- 8. CANCELLATION IS THE PERSON'S. The worker holds no INSERT and no UPDATE on the intent at all,
  --    and in particular not cancelled_at (070's cancel_requested_at, kept).
  if exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'app' and c.relname = 'publish_intents'
                and (pg_catalog.has_any_column_privilege('app_worker', c.oid, 'INSERT')
                     or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'UPDATE'))) then
    raise exception 'app_worker can write app.publish_intents; the intent is the user''s act and its cancellation is a person''s verb';
  end if;

  -- 9. THE WORKER HOLDS GRANTS AND NO POLICY, on all five (010's shape, RFC-2026-022 §5/8), and no
  --    policy names anon, app_command, app_maintenance or app_authz. Every policy this batch writes is
  --    TO authenticated; batch 122's closures are TO PUBLIC and are asserted by 122.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (publisher_tables)
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('app_worker', 'anon', 'app_command', 'app_maintenance', 'app_authz'));
  if offending is not null then
    raise exception 'a batch 120 policy names a role that must hold none here: %', offending
      using hint = 'RFC-2026-022 is approved and NOT IN EFFECT (§5/8): a service policy is not written until §7 holds. anon holds nothing (RFC-2026-021 §7/4); app_authz is pinned (RFC-2026-020 §6.1/6).';
  end if;
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (publisher_tables)
     and pol.polroles <> array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]::oid[]
     -- SUPERSEDED BY 122. The comment above already says 122's closures are TO PUBLIC and asserted by
     -- 122; the query did not exclude them, because when 120 was applied they did not exist yet.
     -- Excluded as (table, name) PAIRS, each on the one table 122 wrote it on: C0 measured that a name
     -- excluded on all five tables let a permissive TO PUBLIC `using (true)` policy carrying that name
     -- onto publish_jobs pass this block, 122's block and every other.
     and (c.relname::text, pol.polname::text) not in (('publish_intents', 'publish_intents_service_path_closed'),
                                                      ('publish_target_assets', 'publish_target_assets_service_path_closed'));
  if offending is not null then
    raise exception 'a batch 120 policy is not TO authenticated alone: %', offending
      using hint = '§8.5: "Policy ระบุ TO authenticated". A closure TO PUBLIC belongs to batch 122, which applies after this block has run.';
  end if;
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (service_written)
     and not (pg_catalog.has_any_column_privilege('app_worker', c.oid, 'SELECT')
              and pg_catalog.has_any_column_privilege('app_worker', c.oid, 'INSERT'));
  if offending is not null then
    raise exception 'app_worker lacks the SELECT or INSERT grant on %, so its refusal there would be a missing GRANT rather than row level security (010''s reason)', offending;
  end if;

  -- 10. anon, app_command, app_maintenance and app_authz hold nothing on any of the five.
  select string_agg(format('%s to %s', c.relname, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app'
     and c.relname::text = any (publisher_tables)
     and r.rolname in ('anon', 'app_command', 'app_maintenance', 'app_authz')
     and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'a role batch 120 grants nothing holds a privilege: %', offending;
  end if;

  -- 11. THE CLIENT DOES NOT READ WHAT §9.1 WITHHOLDS: the post's hash, the job's provider key, error
  --     code and kernel job id.
  select string_agg(format('%s.%s to %s', c.relname, col, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
    cross join unnest(array['external_post_hash', 'provider_request_key', 'last_error_code', 'kernel_job_id']) as col
   where n.nspname = 'app'
     and ((c.relname = 'published_posts' and col = 'external_post_hash')
          or (c.relname = 'publish_jobs' and col in ('provider_request_key', 'last_error_code', 'kernel_job_id')))
     and r.rolname::text = any (client_roles)
     and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'SELECT');
  if offending is not null then
    raise exception 'a client role can read a PROVIDER-3 column §9.1 keeps to a safe projection: %', offending;
  end if;

  -- 12. FIVE RESTRICTIVE NARROWINGS, one per table, each half resolving through app.content_items --
  --     and, on the four children, through app.publish_intents -- so a child's reach is its intent's
  --     item's reach (070's, 080's and 081's child rule).
  count_of := 0;
  for probe in
    select c.relname as target,
           pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)      as using_half,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname::text = any (publisher_tables)
       and not pol.polpermissive
       and (c.relname::text, pol.polname::text) not in (('publish_intents', 'publish_intents_service_path_closed'), ('publish_target_assets', 'publish_target_assets_service_path_closed'), ('publish_intents', 'publish_intents_updated_by_on_update_is_caller'))  -- SUPERSEDED BY 122, 123: names another file wrote, see the header
       -- FOR ALL ONLY, and the qualifier is a measurement rather than a precaution: this batch writes
       -- THREE restrictive policies on app.publish_intents, and two of them are batch 094's and 102's
       -- shape -- RESTRICTIVE FOR INSERT, which has no USING half at all, so pg_get_expr(polqual) is
       -- NULL for them. Without this term the first live apply reported "the publish_intents
       -- narrowing does not resolve through the intent's item" against a policy that is not the
       -- narrowing, which is a guard failing for the wrong reason.
       and pol.polcmd = '*'
  loop
    count_of := count_of + 1;
    foreach narrowing in array array[probe.using_half, probe.check_half] loop
      if narrowing is null
         or position('content_items' in narrowing) = 0
         or position('member_scope_admits_business' in narrowing) = 0
         or position('member_scope_admits_page' in narrowing) = 0
         or (probe.target <> 'publish_intents' and position('publish_intents' in narrowing) = 0) then
        raise exception 'the % narrowing does not resolve through the intent''s item and ask both scope questions: %',
          probe.target, coalesce(narrowing, '<an empty half of the restrictive policy>');
      end if;
    end loop;
  end loop;
  if count_of <> 5 then
    raise exception 'batch 120 finds % restrictive policies and writes five, one narrowing per table', count_of;
  end if;

  -- 13. THE TRIGGER, on the three tables that grant updated_at (093's general rule).
  select count(*) into count_of
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_proc p on p.oid = t.tgfoid
    join pg_catalog.pg_namespace fn on fn.oid = p.pronamespace
   where n.nspname = 'app'
     and c.relname in ('publish_intents', 'publish_targets', 'publish_jobs')
     and not t.tgisinternal and t.tgname = 'set_updated_at'
     and fn.nspname = 'private' and p.proname = 'set_updated_at';
  if count_of <> 3 then
    raise exception 'batch 120 finds % set_updated_at trigger(s) on its three mutable tables and attaches three', count_of;
  end if;

  -- 14. OWNERSHIP. RFC-2026-017 §3 keeps app_command off the owner seat so a policy can name it and
  --     bind it; RFC-2026-020 §5/2 says app_authz owns no table.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (publisher_tables)
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 120 creates is owned by a role that must not own one: %', offending;
  end if;

  -- 15. THE CHECK PROBES. Four inserts a CHECK refuses before any key is consulted, in a
  --     subtransaction that always aborts (140's shape). Each demands its own SQLSTATE and its own
  --     constraint name; a probe that was refused for another reason is a failure, never a skip.
  begin
    begin
      insert into app.publish_intents (workspace_id, business_profile_id, content_item_id, content_version_id,
                                       requested_by, request_kind, idempotency_key)
      values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
              gen_random_uuid(), 'later', 'batch-120-probe');
      probe_seen := probe_seen || 'intent kind: accepted';
    exception when others then
      get stacked diagnostics probe_sqlstate = returned_sqlstate, offending = constraint_name;
      probe_seen := probe_seen || format('intent kind: %s %s', probe_sqlstate, offending);
    end;
    begin
      insert into app.publish_intents (workspace_id, business_profile_id, content_item_id, content_version_id,
                                       requested_by, request_kind, idempotency_key)
      values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
              gen_random_uuid(), 'now', '   ');
      probe_seen := probe_seen || 'intent key: accepted';
    exception when others then
      get stacked diagnostics probe_sqlstate = returned_sqlstate, offending = constraint_name;
      probe_seen := probe_seen || format('intent key: %s %s', probe_sqlstate, offending);
    end;
    begin
      insert into app.publish_targets (workspace_id, business_profile_id, publish_intent_id, content_target_id,
                                       social_account_id, content_variant_id, status)
      values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
              gen_random_uuid(), gen_random_uuid(), 'cancelled');
      probe_seen := probe_seen || 'target status: accepted';
    exception when others then
      get stacked diagnostics probe_sqlstate = returned_sqlstate, offending = constraint_name;
      probe_seen := probe_seen || format('target status: %s %s', probe_sqlstate, offending);
    end;
    begin
      insert into app.published_posts (workspace_id, business_profile_id, publish_target_id, social_account_id,
                                       platform, external_post_hash, published_at)
      values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
              'facebook', '\x00'::bytea, now());
      probe_seen := probe_seen || 'post hash: accepted';
    exception when others then
      get stacked diagnostics probe_sqlstate = returned_sqlstate, offending = constraint_name;
      probe_seen := probe_seen || format('post hash: %s %s', probe_sqlstate, offending);
    end;
    -- A1-120 F1: the one PROVIDER-3 column a client reads. The value probed is what a careless
    -- worker would actually write -- a provider's sentence with an external id inside it -- and the
    -- point of the probe is that the CONSTRAINT refuses it rather than a comment asking nobody to.
    begin
      insert into app.publish_targets (workspace_id, business_profile_id, publish_intent_id, content_target_id,
                                       social_account_id, content_variant_id, status, failed_at, failure_class)
      values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
              gen_random_uuid(), gen_random_uuid(), 'failed', now(),
              'Graph API error: (#100) the post 17841400000000000 could not be created');
      probe_seen := probe_seen || 'failure class: accepted';
    exception when others then
      get stacked diagnostics probe_sqlstate = returned_sqlstate, offending = constraint_name;
      probe_seen := probe_seen || format('failure class: %s %s', probe_sqlstate, offending);
    end;
    raise exception 'batch 120 check probes complete' using errcode = 'ZZ121';
  exception when sqlstate 'ZZ121' then
    -- The subtransaction is rolled back with everything the probes did. PL/pgSQL variables are not
    -- rolled back with it, which is what carries the findings out.
    null;
  end;
  if not ('intent kind: 23514 publish_intents_request_kind_known' = any (probe_seen)) then
    raise exception 'the request_kind probe was not refused by publish_intents_request_kind_known with 23514: %', array_to_string(probe_seen, '; ');
  end if;
  if not ('intent key: 23514 publish_intents_idempotency_key_bounded' = any (probe_seen)) then
    raise exception 'the blank idempotency key probe was not refused by publish_intents_idempotency_key_bounded with 23514: %', array_to_string(probe_seen, '; ');
  end if;
  if not ('target status: 23514 publish_targets_status_known' = any (probe_seen)) then
    raise exception 'the target status probe was not refused by publish_targets_status_known with 23514 -- `cancelled` must not be a target state: %', array_to_string(probe_seen, '; ');
  end if;
  if not ('post hash: 23514 published_posts_external_hash_is_sha256' = any (probe_seen)) then
    raise exception 'the post hash probe was not refused by published_posts_external_hash_is_sha256 with 23514: %', array_to_string(probe_seen, '; ');
  end if;
  -- AND THE PROBES ARE COUNTED, not merely each asserted by itself (Q0-120 F2). Item 12 counts the
  -- narrowings for the same reason: an assertion that only ever asks "is what I expected present"
  -- cannot notice one being deleted, and five separate `if not (... = any (probe_seen))` checks are
  -- five things a later editor can remove one at a time without any of the others objecting.
  if array_length(probe_seen, 1) <> 5 then
    raise exception 'batch 120 ran % check probe(s) and writes five', coalesce(array_length(probe_seen, 1), 0);
  end if;

  if not ('failure class: 23514 publish_targets_failure_class_is_a_code' = any (probe_seen)) then
    raise exception 'a provider message carrying an external post id was not refused by publish_targets_failure_class_is_a_code with 23514: %', array_to_string(probe_seen, '; ')
      using hint = 'This column is PROVIDER-3 and is the only one of its class a client may read. A not-blank check admits the sentence this probe writes, and §9.2 forbids a provider message reaching a client surface at all.';
  end if;
end $$;
