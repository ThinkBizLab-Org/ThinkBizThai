-- ============================================================================================
-- Batch 121 — publisher.meta: the metric snapshot. The other half of the §8.3 `S` cell batch
-- 120 opened, and the last table of the publishing family.
-- ============================================================================================
--
-- Owner: A6 Publisher, written by the A0 run under the Product Owner's disposition of 2026-09-16
-- (evidence/WP-0A-DB-00/product-owner-disposition-2026-09-16-batch-121.md: thirteen questions,
-- every one answered with the recommended option; the plan those questions came from is
-- evidence/WP-0A-DB-00/a0-batch-121-plan-2026-09-16.md). Depends on: 120 (app.published_posts,
-- app.publish_targets, app.publish_intents), 080 (app.content_items, which the narrowing
-- terminates on), 011 and 021 (the helpers every policy calls). §6's registry gives 121
-- "metric snapshots" and depends it on 120 alone, which is merged.
--
-- ONE TABLE. §4.8's bullet, in full: "high-volume identity PK, scope, published_post_id,
-- metric_time, metric values/JSON with schema version; unique `(published_post_id,metric_time)`;
-- partition-ready by month; no destructive overwrite".
--
-- ============================================================================================
-- THE ROW OF §8.3 THIS TABLE LIVES ON — THE SAME ROW, THE SAME CLASSIFICATION
-- ============================================================================================
--
--   | Publish delivery/post/metric INSERT       | N | N | N | N | N | S |
--
-- This is batch 120's second row, unchanged, and the word this table answers to is the third one:
-- METRIC. RFC-2026-022 §3 names `120` and `121` in ONE ROW of its own table -- "Publish
-- delivery/post/metric INSERT | `120`, `121` | CARRIED | the delivery is against a known target" --
-- so the classification here is the continuation of the three statements 120 registered and not a
-- fresh argument. db/foundation/lint/service-policy-map.json takes a fourth row for the insert,
-- shape CARRIED, and NO SERVICE POLICY IS WRITTEN: RFC-2026-022 is approved and NOT IN EFFECT
-- (§5/8 -- measured 2026-09-08, the only member of app_worker is postgres, which bypasses RLS).
-- app_worker holds the grants and no policy, exactly as it does on the target, the job and the post,
-- so the service INSERT case here is refused at the POLICY layer and flips when the negative control
-- disables row level security, while its UPDATE and DELETE cases are grant-layer and permanent.
--
-- WHY THE STATEMENT IS CARRIED AND NOT DISCOVERED, applied to THIS statement rather than inherited.
-- A collector's insert is `insert into app.performance_snapshots (workspace_id, business_profile_id,
-- published_post_id, metric_time, metrics, metrics_schema_version) values (...)` and it is written
-- ABOUT A POST THE SERVICE ALREADY HOLDS: to ask a provider for a post's numbers the service must
-- first have resolved which post, and resolving a post resolves its workspace, because
-- app.published_posts.workspace_id is NOT NULL and came back with it. Add
-- `and workspace_id = (select nullif(current_setting('app.workspace_id', true), '')::uuid)` to this
-- INSERT's WITH CHECK and it still writes the same row. Contrast batch 050's claim on app.jobs and
-- 110's on the webhook inbox, which are DISCOVERED because "the next unprocessed row" has no
-- workspace term to add without changing what the work IS. Nothing here is a claim that the
-- confinement term is a tenant boundary for the service path: RFC-2026-022 §5/4 measured that
-- app_worker can set the setting such a policy would read, so the term is containment against
-- defects in the service's own code and never isolation. No comment, case or assertion in this batch
-- cites it as the latter.
--
-- NEITHER DOES THIS ROW HAVE A SELECT, AND THE GAP IS ONE STEP WORSE HERE. §8.3 gives publishing no
-- read row at all -- batch 120 recorded that for the intent, the target, the job and the post, and
-- the Owner's answer to 120's question 4 was a column-scoped SELECT to active members with the
-- reading recorded as a blocker in 090's shape. The metric is the same: the Owner's answer to this
-- batch's question E takes the same option, for the same two reasons (§11.1 puts publish history in
-- the PDPA export minimum, and DB-10's acceptance requires partial success to be SHOWN), and the
-- reading is a blocker of its own rather than an inheritance of 120's. It is WORSE here because a
-- metric that no client may read is the one table in this family with no purpose at all if the read
-- is refused: the intent, the target and the post are records of what the system did, and a metric
-- exists only to be looked at.
--
-- ============================================================================================
-- THE FORWARD KEY ON BATCH 120's TABLE — reported to the Owner before the work, not after
-- ============================================================================================
--
-- app.published_posts carries THREE keys and none of them is the one this batch needs: the primary
-- key on `id`, `published_posts_one_per_target unique (publish_target_id)`, and
-- `published_posts_external_hash_unique unique (social_account_id, external_post_hash)`. Every other
-- child in this schema is held to its parent by a COMPOSITE SCOPE FK -- (workspace_id,
-- business_profile_id, parent_id) referencing the parent's own (workspace_id, business_profile_id,
-- id) -- and on app.published_posts those three columns are not a key, so the FK cannot be written.
--
-- Migration invariant 1 forbids rewriting 120_publisher.sql, which is merged. The sanctioned path is
-- a forward fix in THIS file, in the shape batch 111 used on 110's table and batch 120 used on 081's:
-- add the key, do not touch the file that should have had it. What it costs is that a reader of
-- 120_publisher.sql sees a table whose scope key is not there; the comment on the constraint says
-- which batch added it and why, which is the only place such a reader will meet it.
--
-- WITHOUT IT (the option the Owner declined, question H) a plain FK on published_post_id alone would
-- permit a snapshot whose workspace_id and business_profile_id disagree with its post's -- a row that
-- no policy would return to the tenant it names and every policy would return to the tenant it
-- points at. The apply-time probe below writes exactly that row and demands `23503` by name.
--
-- ============================================================================================
-- PARTITION-READY, AND THE HALF OF IT THIS BATCH CANNOT DELIVER
-- ============================================================================================
--
-- §4.8 asks for two things in one bullet and they are in tension, which is stated here rather than
-- left for batch 150 to discover: "high-volume identity PK" AND "partition-ready by month".
--
-- §6's registry gives batch `150` "indexes/partition readiness", so the Owner's answer to question B
-- is that this batch is partition-READY and does not partition: a plain table, an index a month slice
-- can use, a unique that already carries the partition key, and no constraint that would have to be
-- dropped before `partition by range (metric_time)` could be declared.
--
-- WHAT IT CANNOT DELIVER, NAMED: a PostgreSQL partitioned table requires every unique constraint --
-- the primary key included -- to CONTAIN the partition key. `unique (published_post_id, metric_time)`
-- already does. `primary key (id)` does NOT, and question C takes §4.8's "high-volume identity PK"
-- literally, so the primary key is `id` alone. The day batch 150 declares the partition it will have
-- to make the key `(id, metric_time)`, and on a partitioned table that is a rebuild rather than an
-- `alter`. That is a real cost of reading §4.8's two clauses in the order the Owner chose, it is
-- recorded in the work package's open blockers as such, and nothing in this file claims the table can
-- be partitioned by an `alter` alone. The assertion block asserts what IS true -- the unique carries
-- metric_time, and the month index exists -- and asserts nothing about a readiness it has not got.
--
-- ============================================================================================
-- WHAT THIS BATCH DOES NOT ENFORCE, EACH WITH ITS REASON
-- ============================================================================================
--
-- 1. THE COLLECTION CADENCE. Question F: `metric_time` is the provider's measurement instant and the
--    service truncates it to the cadence before the insert. The database enforces the UNIQUENESS of
--    (post, instant) and NOT the cadence, because a cadence is a service decision with no column here
--    to hold it -- an hourly collector and a daily one would both satisfy any CHECK this table could
--    write. A re-collection at the same `metric_time` is `23505` and NEVER an overwrite, which is
--    §4.8's "no destructive overwrite" made a key rather than a convention. Blocker.
--
-- 2. THAT A SNAPSHOT IS NOT OLDER THAN ITS POST. `metric_time >= published_posts.published_at` is a
--    cross-table rule and a CHECK cannot read another row. The same sentence batch 120 wrote about a
--    pinned asset version being `ready`, for the same reason. Blocker.
--
-- 3. WHICH METRICS A PLATFORM ACTUALLY HAS. The key set below is the union across facebook and
--    instagram; nothing here refuses `saves` on a facebook post, because which metrics a platform
--    serves is a provider fact that changes without a migration. The SHAPE is the control (§9.2's
--    "never a provider's message"); the vocabulary is not a claim about either platform's API.
--
-- 4. RETENTION. §10 puts this table in `PUBLISH-HISTORY` and gives it a sub-rule of its own --
--    "metrics detail 24 เดือน default", the only row in §10 whose detail expires before its family --
--    and batch 160 owns retention. Commented, enforced nowhere (question L).

-- ============================================================================================
-- THE FORWARD KEY (see header)
-- ============================================================================================
alter table app.published_posts
  add constraint published_posts_scope_unique unique (workspace_id, business_profile_id, id);

comment on constraint published_posts_scope_unique on app.published_posts is
  'Batch 121 (metrics): the target of performance_snapshots_post_scope_fk, so a metric snapshot names '
  'the post AND the tenant the post belongs to in one key. A forward change to batch 120''s table in '
  '111''s and 120''s own shape -- 111 added social_accounts_scope_key to 110''s table and 120 added '
  'content_targets_destination_key to 081''s; 120_publisher.sql is not rewritten (migration invariant '
  '1). Every other child in this schema is held to its parent by exactly this composite, and '
  'app.published_posts was the one parent that had no key to be held to.';

-- ============================================================================================
-- app.performance_snapshots — what a published post measured, at an instant, once
-- ============================================================================================
create table if not exists app.performance_snapshots (
  -- §4.8: "high-volume identity PK". A bigint identity and not a uuid: this is the only table in the
  -- family whose row count grows with TIME rather than with acts of a user, and 050 set the
  -- precedent for an identity PK on an append-only high-volume table. See the header for what this
  -- costs batch 150.
  id                     bigint generated always as identity primary key,
  workspace_id           uuid        not null,
  business_profile_id    uuid        not null,
  published_post_id      uuid        not null,
  -- The instant the provider says it measured, not the instant we asked (that is collected_at).
  -- Truncated to the collection cadence by the service; this schema enforces uniqueness, not cadence.
  metric_time            timestamptz not null,
  -- PROVIDER-3 payload, and the one column in this batch a provider's own words could reach. Four
  -- named constraints below are the SHAPE that keeps them out -- A1's finding on batch 120's
  -- publish_targets.failure_class, applied before the reviewer has to find it again.
  metrics                jsonb       not null,
  metrics_schema_version integer     not null,
  collected_at           timestamptz not null default now(),

  constraint performance_snapshots_metrics_is_an_object
    check (jsonb_typeof(metrics) = 'object'),
  -- Every key must be one this schema knows. `metrics - array[...]` deletes the known keys; what
  -- remains must be the empty object, so an unknown key -- `error`, `message`, `id` -- fails here.
  constraint performance_snapshots_metrics_keys_are_known
    check (metrics - array[
      'impressions', 'reach', 'engagements', 'likes', 'comments', 'shares',
      'saves', 'video_views', 'clicks', 'profile_visits'
    ] = '{}'::jsonb),
  -- And every value present must be a NUMBER. An absent key gives NULL, and coalesce admits it; a
  -- string, object, array or boolean does not pass. This is the half that refuses a provider's
  -- sentence smuggled in under a key this schema does allow.
  constraint performance_snapshots_metrics_values_are_numbers
    check (
      coalesce(jsonb_typeof(metrics -> 'impressions'),    'number') = 'number'
      and coalesce(jsonb_typeof(metrics -> 'reach'),          'number') = 'number'
      and coalesce(jsonb_typeof(metrics -> 'engagements'),    'number') = 'number'
      and coalesce(jsonb_typeof(metrics -> 'likes'),          'number') = 'number'
      and coalesce(jsonb_typeof(metrics -> 'comments'),       'number') = 'number'
      and coalesce(jsonb_typeof(metrics -> 'shares'),         'number') = 'number'
      and coalesce(jsonb_typeof(metrics -> 'saves'),          'number') = 'number'
      and coalesce(jsonb_typeof(metrics -> 'video_views'),    'number') = 'number'
      and coalesce(jsonb_typeof(metrics -> 'clicks'),         'number') = 'number'
      and coalesce(jsonb_typeof(metrics -> 'profile_visits'), 'number') = 'number'
    ),
  -- A bound, because a shape with no size is not a bound. Ten numbers do not reach 2 KiB.
  constraint performance_snapshots_metrics_is_bounded
    check (octet_length(metrics::text) <= 2048),
  constraint performance_snapshots_schema_version_is_positive
    check (metrics_schema_version >= 1),

  -- §4.8: "unique (published_post_id, metric_time)". It is also what makes a re-collection a
  -- 23505 rather than an overwrite, and it carries metric_time, which a future RANGE partition
  -- on that column requires of every unique on the table.
  constraint performance_snapshots_one_per_post_instant
    unique (published_post_id, metric_time),
  constraint performance_snapshots_post_scope_fk
    foreign key (workspace_id, business_profile_id, published_post_id)
    references app.published_posts (workspace_id, business_profile_id, id)
);

-- The read index and the month slice in one: a tenant's metrics over a window is the only query
-- shape the client read has, and `partition by range (metric_time)` would prune on the same column.
create index if not exists performance_snapshots_scope_time_idx
  on app.performance_snapshots (workspace_id, business_profile_id, metric_time);
-- The FK's supporting index (104's general rule): a post's own series, newest first.
create index if not exists performance_snapshots_post_time_idx
  on app.performance_snapshots (workspace_id, business_profile_id, published_post_id, metric_time desc);

comment on table app.performance_snapshots is
  'Owner: A6 Publisher (publisher.meta, batch 121). What a published post measured at an instant: '
  '§8.3''s "metric" in the same S cell as the delivery and the post, written by the service and by '
  'nobody else, classified CARRIED and NOT ENFORCED (RFC-2026-022 §5/8). IMMUTABLE AND APPEND-ONLY: '
  'no updated_at, no trigger, and no role -- the service included -- holds UPDATE or DELETE, which is '
  '§4.8''s "no destructive overwrite" made a privilege rather than a convention. A re-collection at a '
  'metric_time already recorded is refused 23505 by '
  'performance_snapshots_one_per_post_instant. metric_time is the provider''s measurement instant, '
  'truncated to the collection cadence by the service; NOTHING HERE ENFORCES THE CADENCE and nothing '
  'holds a snapshot to be no older than its post (both in the work package''s open blockers). '
  'PARTITION-READY AND NOT PARTITIONED: the unique carries metric_time and the index prunes on it, '
  'but the primary key is `id` alone per §4.8''s "high-volume identity PK", and a partitioned table '
  'requires the key to contain the partition column -- so batch 150, which §6 gives partition '
  'readiness, will have to rebuild rather than alter. Sensitivity PROVIDER-3; retention '
  'PUBLISH-HISTORY, whose §10 row gives metrics a detail window of its own: 24 months by default, '
  'shorter than the family it belongs to. Enforced nowhere here; 160 owns retention.';

comment on column app.performance_snapshots.metrics is
  'PROVIDER-3. A jsonb OBJECT whose keys are a closed set of ten and whose every value is a NUMBER, '
  'held by four named constraints rather than by this sentence -- which is the correction A1 made to '
  'batch 120 (publish_targets.failure_class was the one PROVIDER-3 column inside the client SELECT '
  'with neither a bound nor a shape, so §9.2''s "never a provider''s message" was a comment ON the '
  'column rather than a control OVER it). It is INSIDE the client SELECT deliberately (question D): a '
  'metric nobody may read is the one table in this family with no purpose if the read is refused. '
  'What keeps a provider''s sentence out is the shape, not the projection. The key set is the union '
  'across facebook and instagram and is not a claim about either platform''s API.';
comment on column app.performance_snapshots.metric_time is
  'The instant the PROVIDER says it measured, not the instant we asked -- that is collected_at. The '
  'service truncates it to the collection cadence before the insert; no constraint here enforces a '
  'cadence, because a cadence is a service decision with no column on this table to hold it.';
comment on column app.performance_snapshots.metrics_schema_version is
  'Which shape of the `metrics` object this row holds. The constraints above are version 1''s shape. '
  'A later version that adds a key changes them in a forward migration, and this column is how a '
  'reader of an old row knows which set of rules it was written under.';

-- ============================================================================================
-- NO updated_at TRIGGER, AND THE ABSENCE IS THE POINT
-- ============================================================================================
-- Batch 093 made set_updated_at the general rule for every table that GRANTS an update. This table
-- grants none to anybody, so it has no updated_at column and no trigger -- app.published_posts'
-- shape, for §3.2's "publish history ห้าม update" and §4.8's "no destructive overwrite". The
-- assertion block below checks that no role acquires UPDATE or DELETE here later.

alter table app.performance_snapshots enable row level security;
alter table app.performance_snapshots force  row level security;

-- ============================================================================================
-- GRANTS
-- ============================================================================================
-- THE METRIC. The client reads every column -- there is no PROVIDER-3 column withheld here, because
-- the one PROVIDER-3 column is the payload and question D keeps it in the projection behind a shape.
-- The worker reads and records. NO UPDATE AND NO DELETE FOR ANY ROLE: the row is immutable.
grant select (id, workspace_id, business_profile_id, published_post_id, metric_time,
              metrics, metrics_schema_version, collected_at)
  on app.performance_snapshots to authenticated;
grant select (id, workspace_id, business_profile_id, published_post_id, metric_time,
              metrics, metrics_schema_version, collected_at)
  on app.performance_snapshots to app_worker;
grant insert (workspace_id, business_profile_id, published_post_id, metric_time,
              metrics, metrics_schema_version)
  on app.performance_snapshots to app_worker;

-- ============================================================================================
-- POLICIES — every one `TO authenticated`; the service has none (header)
-- ============================================================================================
--
-- The narrowing is batch 120's, one family deeper: post → target → intent → item, four joins, and
-- it terminates on app.content_items exactly as every publisher narrowing does. The subqueries run
-- as the CALLER, so the policies of app.published_posts, app.publish_targets, app.publish_intents
-- and app.content_items all apply inside them -- which is what A1 measured against batch 120 (F4)
-- and what batch 081 measured before it: THE PARENT'S POLICY ANSWERS FIRST, so the scope term in
-- this restrictive policy cannot decide a read on its own. It is written in full anyway, for the
-- reason 120 gave: a narrowing that relies on a parent's policy is a narrowing that a later change
-- to the parent can silently remove.

create policy performance_snapshots_select_active_member on app.performance_snapshots
  for select to authenticated
  using (app.is_active_member(workspace_id));

create policy performance_snapshots_scope_narrowing on app.performance_snapshots
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.published_posts p
      join app.publish_targets t
        on t.workspace_id = p.workspace_id
       and t.business_profile_id = p.business_profile_id
       and t.id = p.publish_target_id
      join app.publish_intents pi
        on pi.workspace_id = t.workspace_id
       and pi.business_profile_id = t.business_profile_id
       and pi.id = t.publish_intent_id
      join app.content_items i
        on i.workspace_id = pi.workspace_id
       and i.business_profile_id = pi.business_profile_id
       and i.id = pi.content_item_id
      where p.workspace_id = performance_snapshots.workspace_id
        and p.business_profile_id = performance_snapshots.business_profile_id
        and p.id = performance_snapshots.published_post_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  )
  with check (
    exists (
      select 1 from app.published_posts p
      join app.publish_targets t
        on t.workspace_id = p.workspace_id
       and t.business_profile_id = p.business_profile_id
       and t.id = p.publish_target_id
      join app.publish_intents pi
        on pi.workspace_id = t.workspace_id
       and pi.business_profile_id = t.business_profile_id
       and pi.id = t.publish_intent_id
      join app.content_items i
        on i.workspace_id = pi.workspace_id
       and i.business_profile_id = pi.business_profile_id
       and i.id = pi.content_item_id
      where p.workspace_id = performance_snapshots.workspace_id
        and p.business_profile_id = performance_snapshots.business_profile_id
        and p.id = performance_snapshots.published_post_id
        and case when i.page_context_profile_id is null
              then app.member_scope_admits_business(i.workspace_id, i.business_profile_id)
              else app.member_scope_admits_page(i.workspace_id, i.business_profile_id,
                                                i.page_context_profile_id)
            end
    )
  );

comment on policy performance_snapshots_select_active_member on app.performance_snapshots is
  'Batch 121: §8.3 has no SELECT row for publishing at all, and this read is the Product Owner''s '
  'answer to question E of 2026-09-16 -- the same answer 120''s question 4 got for the post. The '
  'reading is recorded in the work package''s open blockers rather than presented as a citation.';
comment on policy performance_snapshots_scope_narrowing on app.performance_snapshots is
  'Batch 121: the member''s business or page scope, resolved through the post, the send, the intent '
  'and the item. A1''s finding F4 against batch 120 holds one family deeper -- the parent''s own '
  'policy answers first inside these subqueries, so this term cannot decide a read by itself; it is '
  'written in full because a narrowing that relies on a parent''s policy is one a later change to '
  'that parent can silently remove.';

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED
-- ============================================================================================
--
-- Against the LIVE catalog and the LIVE ACL, asked of every role rather than of the roles named
-- above, because a grant made by a later batch would not appear in this file at all (100's rule).
--
-- NO ISOLATION CASE CAN REACH A CONSTRAINT ON THIS TABLE. No client role holds INSERT and the
-- service's insert is refused at the policy layer, so every CHECK and every key below is
-- unreachable from tests/db/identity and is proved HERE instead, by probes that run in a
-- subtransaction which always aborts (140's shape). Q0's finding F2 against batch 120 -- the probes
-- were asserted only by themselves, so one could be deleted without the others objecting -- is
-- closed the same way it was there: the probe set is counted.
do $$
declare
  offending      text;
  count_of       integer;
  probes_passed  integer := 0;
  required_keys constant text[] := array[
    'performance_snapshots_one_per_post_instant',
    'published_posts_scope_unique'];
  required_not_null constant text[] := array[
    'performance_snapshots.workspace_id', 'performance_snapshots.business_profile_id',
    'performance_snapshots.published_post_id', 'performance_snapshots.metric_time',
    'performance_snapshots.metrics', 'performance_snapshots.metrics_schema_version',
    'performance_snapshots.collected_at'];
  required_checks constant text[] := array[
    'performance_snapshots_metrics_is_an_object',
    'performance_snapshots_metrics_keys_are_known',
    'performance_snapshots_metrics_values_are_numbers',
    'performance_snapshots_metrics_is_bounded',
    'performance_snapshots_schema_version_is_positive'];
begin
  -- ------------------------------------------------------------------------------------------
  -- 1. EVERY UNIQUENESS RULE THIS BATCH RESTS ON, BY NAME (Q0-120 F3's lesson).
  -- ------------------------------------------------------------------------------------------
  select string_agg(name, ', ' order by name) into offending
    from unnest(required_keys) as name
   where not exists (
     select 1 from pg_catalog.pg_constraint con
      join pg_catalog.pg_class c on c.oid = con.conrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app' and con.conname = name and con.contype in ('u', 'p'));
  if offending is not null then
    raise exception 'a uniqueness rule batch 121 depends on is gone: %', offending
      using hint = 'performance_snapshots_one_per_post_instant is what makes a re-collection a 23505 rather than an overwrite (§4.8 "no destructive overwrite"), and no isolation case can attempt a collision because no role holds INSERT. published_posts_scope_unique is the forward key this batch added to batch 120''s table; without it the composite scope FK below has nothing to reference.';
  end if;

  -- ------------------------------------------------------------------------------------------
  -- 2. EVERY COLUMN THAT MAY NOT BE NULL, per column (Q0-120 F1's lesson).
  -- ------------------------------------------------------------------------------------------
  select string_agg(name, ', ' order by name) into offending
    from unnest(required_not_null) as name
   where not exists (
     select 1 from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname = split_part(name, '.', 1)
       and a.attname = split_part(name, '.', 2)
       and a.attnum > 0 and not a.attisdropped and a.attnotnull);
  if offending is not null then
    raise exception 'a batch 121 column that may not be null has lost NOT NULL: %', offending
      using hint = 'A NULL workspace satisfies no policy comparison, so the row is invisible rather than misfiled -- and invisible is still wrong. Q0 measured exactly this against batch 120.';
  end if;

  -- ------------------------------------------------------------------------------------------
  -- 3. EVERY CHECK THAT SHAPES THE PROVIDER-3 PAYLOAD, BY NAME (A1-120 F1's lesson).
  -- ------------------------------------------------------------------------------------------
  select string_agg(name, ', ' order by name) into offending
    from unnest(required_checks) as name
   where not exists (
     select 1 from pg_catalog.pg_constraint con
      join pg_catalog.pg_class c on c.oid = con.conrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app' and c.relname = 'performance_snapshots'
       and con.conname = name and con.contype = 'c');
  if offending is not null then
    raise exception 'a batch 121 shape constraint on the PROVIDER-3 payload is gone: %', offending
      using hint = 'metrics is inside the client SELECT (question D), so the shape IS the control that keeps a provider''s message out of app -- §9.2. Losing one of these turns the column comment into the only thing saying so, which is precisely what A1 graded a finding against batch 120.';
  end if;

  -- ------------------------------------------------------------------------------------------
  -- 4. NO ROLE HOLDS UPDATE OR DELETE HERE — asked of EVERY role, both verbs.
  -- ------------------------------------------------------------------------------------------
  select string_agg(format('%s:%s', grantee, privilege_type), ', ' order by grantee, privilege_type)
    into offending
    from information_schema.table_privileges
   where table_schema = 'app' and table_name = 'performance_snapshots'
     and privilege_type in ('UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES')
     and grantee <> 'postgres';
  if offending is not null then
    raise exception 'batch 121''s table is append-only and a role holds a mutating privilege: %', offending
      using hint = '§4.8 "no destructive overwrite" and §3.2 "publish history ห้าม update". app.published_posts has the same shape. If a service correction is ever needed it is a decision with an owner, not a grant somebody adds.';
  end if;

  -- And the column-level ACL cannot smuggle one in either.
  select string_agg(format('%s:%s:%s', grantee, column_name, privilege_type), ', ')
    into offending
    from information_schema.column_privileges
   where table_schema = 'app' and table_name = 'performance_snapshots'
     and privilege_type in ('UPDATE', 'REFERENCES')
     and grantee <> 'postgres';
  if offending is not null then
    raise exception 'batch 121''s table is append-only and a role holds a mutating column privilege: %', offending;
  end if;

  -- ------------------------------------------------------------------------------------------
  -- 5. EXACTLY WHAT EACH ROLE DOES HOLD — both directions (C0-120 M4's correction: an assertion
  --    that a role holds nothing is false the moment the batch grants it something, and SELECT
  --    must be tested rather than omitted).
  -- ------------------------------------------------------------------------------------------
  select count(*) into count_of
    from information_schema.column_privileges
   where table_schema = 'app' and table_name = 'performance_snapshots'
     and grantee = 'authenticated' and privilege_type = 'SELECT';
  if count_of <> 8 then
    raise exception 'authenticated should read all 8 columns of batch 121''s table and reads %', count_of
      using hint = 'Question D put the PROVIDER-3 payload INSIDE the client projection behind a shape; there is no withheld column on this table, unlike app.published_posts where the hash is withheld.';
  end if;

  select count(*) into count_of
    from information_schema.column_privileges
   where table_schema = 'app' and table_name = 'performance_snapshots'
     and grantee = 'authenticated' and privilege_type = 'INSERT';
  if count_of <> 0 then
    raise exception 'authenticated holds INSERT on % column(s) of batch 121''s table, and §8.3 marks every client column N', count_of;
  end if;

  select count(*) into count_of
    from information_schema.column_privileges
   where table_schema = 'app' and table_name = 'performance_snapshots'
     and grantee = 'app_worker' and privilege_type = 'INSERT';
  if count_of <> 6 then
    raise exception 'app_worker should insert exactly 6 columns of batch 121''s table and holds %', count_of
      using hint = 'id is an identity column and collected_at is the database''s default; the service supplies neither.';
  end if;

  select count(*) into count_of
    from information_schema.column_privileges
   where table_schema = 'app' and table_name = 'performance_snapshots'
     and grantee = 'anon';
  if count_of <> 0 then
    raise exception 'anon holds % column privilege(s) on batch 121''s table', count_of;
  end if;

  -- ------------------------------------------------------------------------------------------
  -- 6. EVERY POLICY ON THIS TABLE IS `TO authenticated` — the service has none, because
  --    RFC-2026-022 is approved and NOT IN EFFECT (§5/8).
  -- ------------------------------------------------------------------------------------------
  select string_agg(format('%s -> %s', polname, roles), ', ') into offending
    from (
      select pol.polname,
             (select string_agg(pg_catalog.pg_get_userbyid(r), '+') from unnest(pol.polroles) as r) as roles
        from pg_catalog.pg_policy pol
        join pg_catalog.pg_class c on c.oid = pol.polrelid
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'app' and c.relname = 'performance_snapshots'
    ) s
   where roles is distinct from 'authenticated';
  if offending is not null then
    raise exception 'a batch 121 policy names a role other than authenticated: %', offending
      using hint = 'The S cell is CLASSIFIED in db/foundation/lint/service-policy-map.json and NOT ENFORCED. A service policy here would pre-empt RFC-2026-022 §7 and would make the service INSERT case pass for a reason the case does not claim.';
  end if;

  -- ------------------------------------------------------------------------------------------
  -- 7. PARTITION-READINESS — asserted as what it IS, not as what §4.8 asks for (header).
  -- ------------------------------------------------------------------------------------------
  -- The unique carries the partition column. A future `partition by range (metric_time)` requires
  -- this of every unique on the table; this one already satisfies it and the primary key does not,
  -- which is the blocker rather than something this assertion can fix.
  if not exists (
    select 1 from pg_catalog.pg_constraint con
     join pg_catalog.pg_class c on c.oid = con.conrelid
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     join pg_catalog.pg_attribute a
       on a.attrelid = c.oid and a.attnum = any(con.conkey) and a.attname = 'metric_time'
    where n.nspname = 'app' and c.relname = 'performance_snapshots'
      and con.conname = 'performance_snapshots_one_per_post_instant')
  then
    raise exception 'performance_snapshots_one_per_post_instant no longer carries metric_time'
      using hint = 'Without the partition column in it, this unique would have to be dropped before batch 150 could declare a monthly partition -- and it is the key that makes a re-collection a 23505.';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_indexes
     where schemaname = 'app' and tablename = 'performance_snapshots'
       and indexname = 'performance_snapshots_scope_time_idx')
  then
    raise exception 'the month-sliceable index on batch 121''s table is gone';
  end if;

  -- ------------------------------------------------------------------------------------------
  -- 8. THE PAYLOAD PROBES. Each one writes a row a careless collector would write and demands the
  --    SQLSTATE of the constraint that must refuse it, BY NAME. They run in a subtransaction that
  --    always aborts (140's shape) and they need NO PARENT ROW: a CHECK is evaluated before any
  --    foreign key trigger fires, so the SQLSTATE each one demands is the constraint's own.
  --
  --    THE TWO PROBES THAT DO NEED A PARENT ROW -- a snapshot whose tenant disagrees with its
  --    post's, and a second collection at an instant already recorded -- run in the batch 121
  --    FIXTURE's own block, after the rows they need exist. That is batch 120's rule and its
  --    reason: a migration runs against an empty database, so a probe written here that needs a
  --    post would silently never run.
  -- ------------------------------------------------------------------------------------------
  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(),
            '{"error": "Graph API (#100) unsupported get request for post 17841400000000000"}'::jsonb, 1);
    raise exception 'a metrics payload with a provider sentence under an unknown key was accepted';
  exception
    when check_violation then
      if sqlerrm not like '%performance_snapshots_metrics_keys_are_known%' then
        raise exception 'the wrong constraint refused the unknown-key probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
  end;

  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(),
            '{"impressions": "see the Graph API response for post 17841400000000000"}'::jsonb, 1);
    raise exception 'a provider sentence under a KNOWN key was accepted as a metric value';
  exception
    when check_violation then
      if sqlerrm not like '%performance_snapshots_metrics_values_are_numbers%' then
        raise exception 'the wrong constraint refused the string-value probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
  end;

  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(), '[]'::jsonb, 1);
    raise exception 'a metrics payload that is not an object was accepted';
  exception
    when check_violation then
      if sqlerrm not like '%performance_snapshots_metrics_is_an_object%' then
        raise exception 'the wrong constraint refused the not-an-object probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
  end;

  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(), '{"reach": 1}'::jsonb, 0);
    raise exception 'a metrics_schema_version of 0 was accepted';
  exception
    when check_violation then
      if sqlerrm not like '%performance_snapshots_schema_version_is_positive%' then
        raise exception 'the wrong constraint refused the schema-version probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
  end;

  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(),
            jsonb_build_object('reach', 1, 'clicks', repeat('9', 4096)::numeric), 1);
    raise exception 'a metrics payload over the size bound was accepted';
  exception
    when check_violation then
      if sqlerrm not like '%performance_snapshots_metrics_is_bounded%' then
        raise exception 'the wrong constraint refused the size probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
  end;

  -- Q0-120 F2: COUNT THE PROBES, so one cannot be deleted without the others objecting.
  if probes_passed <> 5 then
    raise exception 'batch 121 ran % payload probe(s) in the migration and there are 5', probes_passed;
  end if;
  raise notice 'batch 121: 5 payload probe(s) passed; the 2 that need a published post are in the fixture';
end $$;
