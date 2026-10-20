-- Batch 175: an outbox event names its actor and its request (A1-302-I2), as 174 made a job name them.
--
-- A0 author, WP-1A-A0-006 (the provider/database increment). app.outbox_events is A0's kernel table (batch 050).
-- Authority: the Product Owner's answers of 2026-10-20 (session 5ea77291, transcript records 913/914, header
-- `Migration`, `A0-006 เขียนเอง (Recommended)`; records 1341/1342, header `Mig 175 กด`, `A0 กดเมื่อ 4 role ผ่าน
-- (Recommended)`); disposition evidence/WP-1A-A0-006/product-owner-disposition-2026-10-20-mig175.md.
--
-- THE NUMBER. 174 is the highest merged migration; 175 is the next free number and sorts after it, so on an instance
-- that holds the later set this file never runs out of order. A0's kernel range is 050, and a file numbered there would
-- sort before 051-174; so it takes the next free number, the same one-time exception to the registry's ranges as
-- 172's, 173's and 174's. The Integration Owner's acceptance is owed (WP-1A-A0-006 open_blockers).
--
-- WHAT IT ADDS TO app.outbox_events, AND WHY (A1-302-I2, WP-1A-A0-004 open_blockers; WP-1A-A0-006
-- acceptance_criteria[3]). CTR-EVT-001 requires `tenant_context`, which is CTR-TEN-001: workspace_id, actor
-- {kind, id}, request_id, correlation_id, locale and timezone. 050 stored the envelope "minus `tenant_context` (same
-- resolution)" as app.jobs: the workspace only. The relay reads a row and hands a consumer a CTR-EVT-001 envelope, and
-- with no actor and no request on the row it cannot rebuild the tenant context the envelope requires. 174 closed the
-- same gap on app.jobs (RFC-2026-028 §3.4, Q-028-5); this closes it on the outbox, with the same columns, the same
-- bounds and the same grants, so a job and the event it causes carry one shape:
--   * actor_kind      CTR-TEN-001 `actor.kind`: 'user' or 'system_actor' (its enum, exactly).
--   * actor_id        CTR-TEN-001 `actor.id`: the user whose request produced the event, or the system actor of a sweep
--                     (RFC-2026-028 §3.4's table: an outbox consumer's actor is "the event's producer context").
--   * request_id      the PRODUCING request's id (a job's attempt, when the producer is the worker: RFC-2026-028 §3.4
--                     mints a request id per attempt).
-- correlation_id is NOT added: 050 already stores CTR-EVT-001's top-level `correlation_id` (NOT NULL, 1-128), and
-- RFC-2026-028 §3.4 makes it the correlation an outbox consumer carries ("`app.outbox_events.correlation_id`
-- (`050:608`)"), so the tenant context's correlation is that column; a second column for the same value would be two
-- sources of truth. Its bound is 050's and CTR-EVT-001's (1-128 characters) and is not narrowed here to 172's shape:
-- narrowing an existing column of a Candidate contract's envelope is the contract owner's change (contract-catalog/ is
-- read-only to this package), recorded rather than made. causation_id is likewise 050's column. locale and timezone are
-- CTR-TEN-001 constants (th-TH, Asia/Bangkok) and business_profile_id and page_context_profile_id are optional there
-- and absent from 050's resolution (an event about a Business names it in `subject`); none is stored, as 174 stores
-- none of them for a job.
-- NOT NULL, and NO DEFAULT on any of the three: the database mints none of them (RFC-2026-028 §3.4). A writer that
-- omits one is refused (23502), never filled in.
--
-- THE BOUND. 174's, character for character: actor_id and request_id are 1 to 128 characters of [A-Za-z0-9._:-],
-- which a uuid, a W3C trace id, a system actor's dotted name and every id this repository mints fit, and an e-mail
-- address, a phone number written with spaces or a sentence do not. It is a shape, NOT a PII control (A1-174-2). This
-- is the same NARROWING of CTR-TEN-001 174 states (`minLength: 1` there, no maximum and no pattern), owed to the
-- contract owner with 174's (WP-0A-DB-00 open_blockers[202] (2)); actor_kind is CTR-TEN-001's enum exactly.
--
-- GRANTS. 050's rule for an enqueuer-supplied column, as 174 applied it: app_worker, the one role holding anything on
-- app.outbox_events, gets SELECT and INSERT on the three, so that its refusal stays row level security's rather than a
-- missing GRANT's (a NOT NULL column it could not INSERT would turn every service refusal on the outbox into a
-- privilege refusal). NOT UPDATE, for any role: 050 makes every outbox column but dispatched_at append-only, and its
-- block, re-run by the post-migrate pass after this file, asserts it per column against the live ACL, these three
-- included; this file's block asserts it again for them by name. No client role is granted anything (RFC-2026-012 §3's
-- empty allowlist; 050).
--
-- WHAT THIS FILE DOES NOT DO, AND WHY (named so nobody reads the outbox as working after it):
--   * NO POLICY FOR app_worker ON app.jobs, app.outbox_events OR app.consumer_ledger. RFC-2026-022 (approved
--     2026-09-08) §5/5 decides "`app_worker` holds no policy on `app.jobs`, `app.outbox_events` or
--     `app.consumer_ledger` — permanently, not pending", and §7.1/5 makes it a lint negative; RFC-2026-028 (approved
--     2026-10-05) §3.2 and §5/10 hold the same ("zero rows, the state RFC-2026-022 §5/5 makes permanent for the queue";
--     a permissive policy on app.jobs is §5/10's drift). A CARRIED policy TO app_worker on any of the three is
--     therefore a change to an approved decision, which an RFC amendment makes and a migration does not
--     (CONTRIBUTING_AGENTS.md's conflict order, position 1; "Open an RFC before changing ... tenant hierarchy/RLS"). So app_worker
--     still reads and writes no row of the three after this file; the adapters' database tests wait on that decision.
--   * NO BROKER AND NO app_queue ROLE (RFC-2026-022 §5/6). The broker's body is the claimability predicate — which jobs
--     may be claimed: a definition over available_at, lease_owner/lease_expires_at, attempt/max_attempts,
--     cancel_requested_at and result_ref — and CTR-JOB-001's freeze boundary still reads "lifecycle state names and
--     transition policy remain subject to source-defined owner review" (contract-catalog/shared-kernel/ctr-job-001/
--     manifest.json, status Candidate). RFC-2026-022 §9 refuses to write the broker before that vocabulary exists, and
--     050 refused it twice (a status column, a partial index). Owed with the missing term named, in the work package.
--   * NO BACKFILL. 050 is applied to no provisioned instance (catalog-snapshot.json declares it pending) and the table
--     has no writer (no policy, no command function), so every migrate-clean cluster has no outbox row when this runs;
--     on a table that held one the ADD fails closed ("column ... contains null values"), which is the right answer: an
--     event with no actor is not one this file may invent one for.
--
-- ROLLBACK / FORWARD FIX. A later forward migration drops the three constraints and columns (after any writer that
-- names them is reverted), with the pins of scripts/db/run.mjs (PINNED_CHECKS, PINNED_NOT_NULL),
-- db/foundation/lint/pinned-grants.json and the writers of app.outbox_events (the 050 fixture, the isolation suite's
-- builder) reverted in the same diff. Never an edit of this file once integrated.

alter table app.outbox_events
  add column actor_kind text not null,
  add column actor_id   text not null,
  add column request_id text not null,
  add constraint outbox_events_actor_kind_known check (actor_kind in ('user', 'system_actor')),
  add constraint outbox_events_actor_id_bounded check (actor_id ~ '^[A-Za-z0-9._:-]{1,128}$'),
  add constraint outbox_events_request_id_bounded check (request_id ~ '^[A-Za-z0-9._:-]{1,128}$');

comment on column app.outbox_events.actor_kind is
  'CTR-TEN-001 actor.kind (A1-302-I2; 174''s shape): user, or system_actor for an event no user''s request produced.';
comment on column app.outbox_events.actor_id is
  'CTR-TEN-001 actor.id: the producing context''s actor. 1-128 of [A-Za-z0-9._:-] (172''s bound, a narrowing of CTR-TEN-001 owed to its owner, as 174''s).';
comment on column app.outbox_events.request_id is
  'CTR-TEN-001 request_id: the PRODUCING request''s id. 1-128 of [A-Za-z0-9._:-]. No default: the database mints none. The correlation is 050''s correlation_id.';

grant select (actor_kind, actor_id, request_id) on app.outbox_events to app_worker;
grant insert (actor_kind, actor_id, request_id) on app.outbox_events to app_worker;

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED
-- ============================================================================================
-- Re-run by the post-migrate pass after the last migration. pg_attribute, pg_constraint and pg_roles, every one
-- readable without superuser.
do $$
declare
  offending text;
begin
  -- 1. The three columns: text, NOT NULL, and no default (the database mints none of them, RFC-2026-028 §3.4).
  select string_agg(x, ', ' order by x) into offending from (
    select c.c || ' ' || case when a.attnum is null then 'missing'
                       else concat_ws(' ',
                              case when a.atttypid <> 'pg_catalog.text'::pg_catalog.regtype then 'not text' end,
                              case when not a.attnotnull then 'nullable' end,
                              case when a.atthasdef then 'has a default' end) end as x
      from unnest(array['actor_kind', 'actor_id', 'request_id']) as c(c)
      left join pg_catalog.pg_attribute a
        on a.attrelid = 'app.outbox_events'::pg_catalog.regclass and a.attname = c.c and a.attnum > 0 and not a.attisdropped
     where a.attnum is null or a.atttypid <> 'pg_catalog.text'::pg_catalog.regtype or not a.attnotnull or a.atthasdef
  ) f;
  if offending is not null then
    raise exception 'batch 175: app.outbox_events'' tenant-context columns are not text, NOT NULL and default-free: %', offending
      using hint = 'A1-302-I2: CTR-TEN-001''s fields as columns, not null, and the database mints none of them (174''s shape).';
  end if;

  -- 2. Their three CHECKs, validated and in their exact text: CTR-TEN-001's actor.kind enum, and 172's identifier shape.
  select string_agg(pin.k, ', ' order by pin.k) into offending
    from (values ('outbox_events_actor_kind_known', 'CHECK ((actor_kind = ANY (ARRAY[''user''::text, ''system_actor''::text])))'),
                 ('outbox_events_actor_id_bounded', 'CHECK ((actor_id ~ ''^[A-Za-z0-9._:-]{1,128}$''::text))'),
                 ('outbox_events_request_id_bounded', 'CHECK ((request_id ~ ''^[A-Za-z0-9._:-]{1,128}$''::text))')) as pin(k, def)
   where not exists (
     select 1 from pg_catalog.pg_constraint con
      where con.conrelid = 'app.outbox_events'::pg_catalog.regclass and con.contype = 'c' and con.conname = pin.k
        and con.convalidated and pg_catalog.pg_get_constraintdef(con.oid) = pin.def);
  if offending is not null then
    raise exception 'batch 175: app.outbox_events'' tenant-context CHECK(s) missing, unvalidated or not in their text: %', offending
      using hint = 'A1-302-I2: CTR-TEN-001''s bounds as CHECK constraints; the identifiers bounded as 172 and 174 bound them.';
  end if;

  -- 3. The ACL, per column, live: no role updates any of the three (an outbox envelope is append-only but for
  --    dispatched_at, 050); no client role holds anything on them; app_worker SELECTs and INSERTs each (050's rule for
  --    a producer-supplied column, so its refusal stays row level security's).
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s UPDATE (%s)', r.rolname, c.c) as x
      from pg_catalog.pg_roles r, unnest(array['actor_kind', 'actor_id', 'request_id']) as c(c)
     where not r.rolsuper and r.rolname !~ '^pg_'
       and pg_catalog.has_column_privilege(r.rolname, 'app.outbox_events'::pg_catalog.regclass, c.c, 'UPDATE')
    union all
    select format('%s %s (%s)', r.r, p.p, c.c)
      from unnest(array['anon', 'authenticated', 'public']) as r(r), unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) as p(p),
           unnest(array['actor_kind', 'actor_id', 'request_id']) as c(c)
     where pg_catalog.has_column_privilege(r.r, 'app.outbox_events'::pg_catalog.regclass, c.c, p.p)
    union all
    select format('app_worker lacks %s (%s)', p.p, c.c)
      from unnest(array['SELECT', 'INSERT']) as p(p), unnest(array['actor_kind', 'actor_id', 'request_id']) as c(c)
     where not pg_catalog.has_column_privilege('app_worker', 'app.outbox_events'::pg_catalog.regclass, c.c, p.p)
  ) f;
  if offending is not null then
    raise exception 'batch 175: app.outbox_events'' tenant-context columns are not exactly app_worker''s to read and append and nobody''s to update: %', offending
      using hint = '050: the envelope is append-only but for dispatched_at; 050''s rule for a producer-supplied column.';
  end if;
end $$;
