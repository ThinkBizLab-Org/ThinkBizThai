do $$
declare
  offending text;
  count_of  integer;
begin
  -- The thirteen this batch names, each a RESTRICTIVE INSERT policy whose WITH CHECK names
  -- updated_by beside auth.uid().
  --
  -- SUPERSEDED BY 120. Batch 120 wrote a fourteenth in the same shape, `publish_intents_updated_by_is_caller`
  -- (120_publisher.sql, "the fourteenth, in 102's shape"). The final-state form counts 102's thirteen
  -- apart from it, and asserts the fourteenth has the same shape rather than merely excluding it.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and pol.polname like '%\_updated\_by\_is\_caller' escape '\'
     and pol.polname <> 'publish_intents_updated_by_is_caller'
     and not pol.polpermissive and pol.polcmd = 'a'
     and position('updated_by' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) > 0
     and position('auth.uid' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) > 0;
  if count_of <> 13 then
    raise exception 'batch 102 finds % updated_by closures with the required shape and there must be thirteen', count_of;
  end if;
  select count(*) into count_of
    from pg_catalog.pg_policy pol
   where pol.polname like '%\_updated\_by\_is\_caller' escape '\';
  if count_of <> 14 then
    raise exception 'there are % updated_by closures by name; 102 wrote thirteen and 120 one more', count_of;
  end if;
  if not exists (
       select 1 from pg_catalog.pg_policy pol
        where pol.polrelid = 'app.publish_intents'::regclass
          and pol.polname = 'publish_intents_updated_by_is_caller'
          and not pol.polpermissive and pol.polcmd = 'a'
          and position('updated_by' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) > 0
          and position('auth.uid' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) > 0) then
    raise exception '120''s publish_intents_updated_by_is_caller is missing or not in 102''s shape';
  end if;

  -- THE GENERAL RULE, over the whole schema: no app table lets authenticated INSERT updated_by
  -- without an INSERT policy for authenticated that names the column beside auth.uid().
  select string_agg(format('app.%s', c.relname), ', ' order by c.relname) into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attname = 'updated_by' and not a.attisdropped
   where n.nspname = 'app' and c.relkind = 'r'
     and pg_catalog.has_column_privilege('authenticated', c.oid, a.attnum, 'INSERT')
     and not exists (
       select 1 from pg_catalog.pg_policy pol
        where pol.polrelid = c.oid and pol.polcmd = 'a'
          and (select oid from pg_catalog.pg_roles where rolname = 'authenticated') = any (pol.polroles)
          and position('updated_by' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) > 0
          and position('auth.uid' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) > 0);
  if offending is not null then
    raise exception 'updated_by is client-insertable and no INSERT policy binds it to the caller: %', offending
      using hint = 'Add the restrictive INSERT policy in the batch that grants the column, in batch 095''s '
                   'shape, or keep updated_by out of the INSERT grant. A1-090 S13 found requested_by this way; '
                   'its LOW siblings were this column on thirteen tables.';
  end if;
end $$;
