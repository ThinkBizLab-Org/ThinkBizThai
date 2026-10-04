-- Batch 150: app.performance_snapshots keyed by (id, metric_time), and NOT partitioned.
--
-- A0, number 150, under the Owner's answer to Q150-c (2026-10-04, `เิาตามแนะนำ`, "as recommended":
-- A0 authors, A1 reviews, number 150, a RECORDED ONE-TIME EXCEPTION to MOD-120's range 115-129 for the
-- rebuild of a MOD-120 table; evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-150.md).
-- The change is Q150-a's, answered yes as A0 recommended: make the key `(id, metric_time)` now, while the
-- table is empty and applied to no instance, WITHOUT declaring `partition by` (Q150-b, answered yes:
-- partitioning and every production index wait for a production-like fixture and an SLO).
--
-- WHY. A PostgreSQL partitioned table requires every unique constraint, the primary key included, to
-- contain the partition key. 121 made `performance_snapshots_one_per_post_instant unique
-- (published_post_id, metric_time)`, which does, and `primary key (id)`, which does not, because the
-- Owner's earlier answer to question C read §4.8's "high-volume identity PK" as `id` alone
-- (open_blockers[179]). Q150-a reverses that answer for the key only: `id` stays a `bigint generated
-- always as identity` (still §4.8's high-volume identity, and 121's block 10 still holds it to ALWAYS),
-- and the key it anchors now carries `metric_time` as well. Later partitioning becomes "create a
-- partitioned parent and ATTACH this table", with no rewrite of a table that may by then hold rows.
--
-- WHAT REFERENCES THE KEY, CHECKED BEFORE IT IS CHANGED (a foreign key referencing
-- performance_snapshots(id) alone would need a different shape, and stops the batch). Measured on a clean migrate-clean of 1930f41:
--   * no foreign key in any schema has app.performance_snapshots as its referenced table
--     (pg_constraint.confrelid), so nothing references `id` alone and no key elsewhere moves;
--   * the table's own foreign key, performance_snapshots_post_scope_fk, references app.published_posts
--     and is untouched;
--   * no unique key, index, policy, trigger or grant names the primary key or its index: the two
--     indexes are (workspace_id, business_profile_id, metric_time) and (..., published_post_id,
--     metric_time desc), the policies read workspace_id and the post's scope, and every grant is
--     column-scoped and unchanged;
--   * 121's apply-time block, re-run by the post-migrate pass after this file, names the unique
--     performance_snapshots_one_per_post_instant, the NOT NULL columns, the CHECKs, the grants, the
--     policies, the month index and `attidentity = 'a'` on `id`, and never the primary key's columns,
--     so it holds unchanged and needs no superseded.json entry;
--   * the one pin of the key is db/foundation/lint/pinned-shapes.json (batch 150's prerequisites,
--     README rule 18), which this batch rewrites in the same diff: `PRIMARY KEY (id, metric_time)` and
--     the index `performance_snapshots_pkey ... btree (id, metric_time)`.
--
-- MIGRATION INVARIANT 1. 121 is integrated and is not edited; this is a forward migration. 121's table
-- comment, which says the key is `id` alone, is replaced below by the same text with that sentence
-- corrected, because a comment that describes a key the table no longer has is a false record.
--
-- MIGRATION INVARIANT 3 (ERD:289-290: risky DDL carries `lock_timeout` and `statement_timeout`).
-- Dropping and adding a primary key takes ACCESS EXCLUSIVE and builds a unique index, so both timeouts
-- are set immediately before the statement and reset immediately after, as 131 does. On this table, which
-- is empty and applied to no instance, the build is immediate; on a table with rows it is a full scan
-- under the lock, which is why it is done now.
--
-- ROLLBACK / FORWARD FIX. Nothing outside this table depends on the key, so a forward migration that
-- restores `primary key (id)` (the same two statements reversed) is a complete recovery. The table holds
-- no row on any instance today.

set lock_timeout = '5s';
set statement_timeout = '60s';

-- Two statements in the one transaction migrate-clean applies a file in: the key is absent only between them.
alter table app.performance_snapshots drop constraint performance_snapshots_pkey;
alter table app.performance_snapshots add constraint performance_snapshots_pkey primary key (id, metric_time);

set lock_timeout = default;
set statement_timeout = default;

comment on constraint performance_snapshots_pkey on app.performance_snapshots is
  'Batch 150 (A0, Q150-a, answered 2026-10-04): the key is (id, metric_time). id is still the bigint '
  'identity (generated always), and metric_time is in the key because a table partitioned by range '
  '(metric_time) requires every unique to contain it. NOT PARTITIONED (Q150-b): declaring partitions and every '
  'production index wait for a production-like fixture and an SLO.';

comment on table app.performance_snapshots is
  'Owner: A6 Publisher (publisher.meta, batch 121; key changed by batch 150). What a published post '
  'measured at an instant: §8.3''s "metric" in the same S cell as the delivery and the post, written by '
  'the service and by nobody else, classified CARRIED and NOT ENFORCED (RFC-2026-022 §5/8). IMMUTABLE AND '
  'APPEND-ONLY: no updated_at, no trigger, and no role -- the service included -- holds UPDATE or DELETE, '
  'which is §4.8''s "no destructive overwrite" made a privilege rather than a convention. A re-collection '
  'at a metric_time already recorded is refused 23505 by performance_snapshots_one_per_post_instant. '
  'metric_time is the provider''s measurement instant, truncated to the collection cadence by the '
  'service; NOTHING HERE ENFORCES THE CADENCE and nothing holds a snapshot to be no older than its post '
  '(both in the work package''s open blockers). PARTITION-READY AND NOT PARTITIONED: since batch 150 the '
  'primary key is (id, metric_time) and the unique is (published_post_id, metric_time), so every unique '
  'carries metric_time and the month index prunes on it; a later monthly partition is a parent created '
  'and this table attached, not a rebuild. Declaring it waits on Q150-b (a production-like fixture and an '
  'SLO). Sensitivity PROVIDER-3 by the migrations'' reading; retention PUBLISH-HISTORY, whose §10 row '
  'gives metrics a detail window of its own: 24 months by default. Enforced nowhere here; 160 owns '
  'retention.';

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED
-- ============================================================================================
-- Re-run by the post-migrate pass after the last migration, so a later file that undoes any of it fails
-- migrate-clean here as well as in the pinned shape probe.
do $$
declare
  offending text;
begin
  -- 1. The key, by text.
  select pg_catalog.pg_get_constraintdef(con.oid) into offending
    from pg_catalog.pg_constraint con
   where con.conrelid = 'app.performance_snapshots'::regclass and con.contype = 'p';
  if offending is distinct from 'PRIMARY KEY (id, metric_time)' then
    raise exception 'batch 150''s primary key on app.performance_snapshots is not (id, metric_time): %',
      coalesce(offending, '(no primary key)')
      using hint = 'Q150-a: the key carries the partition column so a later monthly partition is an ATTACH, not a rebuild.';
  end if;

  -- 2. Partition-READY: every unique and primary key on the table contains metric_time.
  select string_agg(con.conname, ', ' order by con.conname) into offending
    from pg_catalog.pg_constraint con
   where con.conrelid = 'app.performance_snapshots'::regclass and con.contype in ('p', 'u')
     and not exists (
       select 1 from pg_catalog.pg_attribute a
        where a.attrelid = con.conrelid and a.attnum = any (con.conkey) and a.attname = 'metric_time');
  if offending is not null then
    raise exception 'a unique key on app.performance_snapshots does not carry metric_time: %', offending
      using hint = 'A table partitioned by range (metric_time) requires every unique to contain it.';
  end if;

  -- 3. And NOT partitioned (Q150-b), a plain table nothing inherits from.
  if (select c.relkind from pg_catalog.pg_class c where c.oid = 'app.performance_snapshots'::regclass) <> 'r'
     or exists (select 1 from pg_catalog.pg_inherits i
                 where i.inhrelid = 'app.performance_snapshots'::regclass or i.inhparent = 'app.performance_snapshots'::regclass) then
    raise exception 'app.performance_snapshots is partitioned or in an inheritance tree, which Q150-b deferred';
  end if;

  -- 4. id is still the identity, ALWAYS, and NOT NULL, and metric_time NOT NULL (the two key columns).
  select string_agg(a.attname, ', ' order by a.attname) into offending
    from pg_catalog.pg_attribute a
   where a.attrelid = 'app.performance_snapshots'::regclass and a.attname in ('id', 'metric_time')
     and not (a.attnotnull and (a.attname <> 'id' or a.attidentity = 'a'));
  if offending is not null then
    raise exception 'a key column of app.performance_snapshots lost NOT NULL or its identity: %', offending;
  end if;

  -- 5. Nothing references the table, so no key elsewhere depends on its primary key.
  select string_agg(format('%s.%s', con.conrelid::regclass, con.conname), ', ' order by format('%s.%s', con.conrelid::regclass, con.conname)) into offending
    from pg_catalog.pg_constraint con
   where con.contype = 'f' and con.confrelid = 'app.performance_snapshots'::regclass;
  if offending is not null then
    raise exception 'a foreign key references app.performance_snapshots: %', offending
      using hint = 'Batch 150 changed the key on the measured fact that nothing references it; a reference needs the key it names.';
  end if;
end $$;
