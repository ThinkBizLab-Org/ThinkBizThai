-- Batch 093 — updated_at is maintained by the database on the five tables that handed it to the client.
--
-- Owner: A0 Integration / DB-00. A forward fix for three findings the independent Reviewer made on
-- three batches that are integrated and may not be rewritten: C0-080 M4 (app.content_ideas,
-- app.content_items), C0-081 M3 (app.content_targets), C0-090 M5 (app.approval_policies,
-- app.approval_requests). Each of those tables carries `updated_at timestamptz not null default
-- now()`, includes `updated_at` in the UPDATE grant it makes to `authenticated`, and attaches no
-- trigger -- so on those five tables updated_at was whatever the last client wrote, including a date
-- in the past. Every other mutable table in this schema either attaches private.set_updated_at
-- (batches 010-070, 100, 110-140) or keeps the column out of the client grant (070's
-- research_suggestions); these five were the exceptions, and none of them said so.
--
-- WHAT THIS BATCH DOES: attaches the same trigger every other table has, in the same spelling
-- (drop if exists, then create, so a re-application on an instance that already has it is a
-- no-op rather than an error). The grant is left as it is: a client that writes updated_at now
-- writes a value the trigger overwrites before the row is stored, which is the shape batch 010
-- chose for every table it created -- the column stays grantable so a client UPDATE that lists it
-- is not refused, and the database decides what it holds.
--
-- WHAT IT ASSERTS, AND THE ASSERTION IS GENERAL: after this batch, EVERY table in `app` that has an
-- updated_at column AND grants UPDATE on that column to any role but the migration owner carries a
-- BEFORE UPDATE trigger that calls private.set_updated_at. The rule is asked of the live catalog
-- across the whole schema rather than of these five names, so the next batch that repeats the
-- shape fails here, by name, at apply time -- which is what the three reviews asked for when they
-- wrote "a batch that inherits a flagged defect should say it inherited it".

drop trigger if exists set_updated_at on app.content_ideas;
create trigger set_updated_at before update on app.content_ideas
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.content_items;
create trigger set_updated_at before update on app.content_items
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.content_targets;
create trigger set_updated_at before update on app.content_targets
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.approval_policies;
create trigger set_updated_at before update on app.approval_policies
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.approval_requests;
create trigger set_updated_at before update on app.approval_requests
  for each row execute function private.set_updated_at();

do $$
declare
  offending text;
begin
  -- Every app table with an updated_at column that some non-owner role may UPDATE carries the
  -- trigger. `has_any_column_privilege` on the column itself, for the roles the schema hands
  -- anything to; the owner is excluded because it holds every privilege by ownership and the rule
  -- is about a WRITER the table admits, not about the role migrations run as.
  select string_agg(format('app.%s (updatable by %s)', c.relname, r.rolname), ', ' order by c.relname)
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attname = 'updated_at' and not a.attisdropped
    join pg_catalog.pg_roles r on r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
   where n.nspname = 'app'
     and c.relkind = 'r'
     and pg_catalog.has_column_privilege(r.rolname, c.oid, a.attnum, 'UPDATE')
     and not exists (
       select 1
         from pg_catalog.pg_trigger t
         join pg_catalog.pg_proc p on p.oid = t.tgfoid
         join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
        where t.tgrelid = c.oid
          and not t.tgisinternal
          and pn.nspname = 'private' and p.proname = 'set_updated_at'
          -- BEFORE (bit 2 of tgtype) and UPDATE (bit 16): a trigger that fires after the write, or
          -- on insert only, would leave the column as the client wrote it.
          and (t.tgtype & 2) = 2 and (t.tgtype & 16) = 16
     );
  if offending is not null then
    raise exception 'updated_at is client-writable and no BEFORE UPDATE trigger maintains it: %', offending
      using hint = 'Attach private.set_updated_at in the batch that grants the column, as every batch '
                   'since 010 does, or keep updated_at out of the grant as batch 070 does for '
                   'research_suggestions. C0-080 M4, C0-081 M3 and C0-090 M5 are the three times '
                   'this was found by reading; this assertion is so it is found by applying.';
  end if;

  -- And the five this batch names are among the ones now covered -- asserted so that a rename of a
  -- table above, or a trigger dropped by a later batch, fails here rather than passing the general
  -- rule on a table that no longer exists.
  select string_agg(t, ', ') into offending
    from unnest(array['content_ideas', 'content_items', 'content_targets', 'approval_policies', 'approval_requests']) as t
   where not exists (
     select 1 from pg_catalog.pg_trigger tg
       join pg_catalog.pg_class c on c.oid = tg.tgrelid
       join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'app' and c.relname = t and tg.tgname = 'set_updated_at' and not tg.tgisinternal);
  if offending is not null then
    raise exception 'batch 093 did not attach set_updated_at to: %', offending;
  end if;
end $$;
