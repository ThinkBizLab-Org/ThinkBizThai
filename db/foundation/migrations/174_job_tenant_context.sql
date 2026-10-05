-- Batch 174: a job names its actor and its request (RFC-2026-028 §3.4, Q-028-5), and 171 (6) follows role inheritance.
--
-- A0 author (app.jobs is A0's kernel table, batch 050). The decision is RFC-2026-028, APPROVED 2026-10-05 through the
-- Owner's delegation of A0's recommendation; Q-028-5 was answered as the RFC recommends: "Columns, `not null` with
-- `CTR-TEN-001`'s bounds, in a forward migration of A0's kernel range; `CTR-JOB-001`'s reading of `tenant_context`
-- restated to match." Plan evidence/WP-0A-DB-00/a0-batch-174-plan-2026-10-03.md; disposition
-- evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-174.md.
--
-- THE NUMBER. 173 is the highest merged migration; 174 is the next free number and sorts after it, so on an instance
-- that holds the later set this file never runs out of order. The RFC asks for "A0's kernel range" (050); a file
-- numbered there would sort before 051-173 and run out of order on any database that already holds them, so it takes
-- the next free number instead, the same one-time exception to the registry's ranges as 172's and 173's. The
-- Integration Owner's acceptance is owed (open_blockers[202] (1)).
--
-- WHAT IT ADDS TO app.jobs, AND WHY (RFC-2026-028 §2/6, §3.4). 050 stored CTR-JOB-001's properties "minus
-- `tenant_context`, which is resolved to §3.3's canonical `workspace_id`", so a job kept its workspace and dropped the
-- rest of CTR-TEN-001: no actor, no request_id, no correlation_id. RFC-2026-026 §3.5 sources the worker producer's
-- audit `actor` from "the job's `tenant_context.actor`" (Q-026-8) and its `request_id` and `correlation_id` from "the
-- job's `tenant_context`", and no column held them. Four columns, CTR-TEN-001's own fields flattened the way 140
-- flattened CTR-AUD-001's actor:
--   * actor_kind      CTR-TEN-001 `actor.kind`: 'user' or 'system_actor' (its enum, exactly).
--   * actor_id        CTR-TEN-001 `actor.id`: the user who started the job, or the system actor of a sweep no user
--                     started (RFC-2026-028 §3.4's table).
--   * request_id      the ENQUEUING request's id (§3.4: "distinct from the attempt's"; the worker mints its own per
--                     attempt and records it on the attempt, never here).
--   * correlation_id  carried from the enqueuing request, unchanged across attempts, so every row the job causes joins
--                     the user's request; for a sweep, the sweep run's id the scheduler minted.
-- NOT NULL, and NO DEFAULT on any of them: "the database mints none of them" (§3.4). A writer that omits one is
-- refused (23502), never filled in. causation_id is not a column: it is the job's own id (RFC-2026-026 §3.2). locale
-- and timezone are CTR-TEN-001 constants (th-TH, Asia/Bangkok), and business_profile_id and page_context_profile_id
-- are optional there and absent from CTR-JOB-001's §3.3 resolution; none of the four is stored.
--
-- THE BOUND. CTR-TEN-001 states `minLength: 1` for actor.id, request_id and correlation_id and no maximum and no
-- pattern. Each is bounded here by the shape 172 gave the closing command's two identifiers (batch 141's review round,
-- A1 F1; its disposition D9): 1 to 128 characters of [A-Za-z0-9._:-] -- which a uuid, a W3C trace id, a system
-- actor's dotted name and every id this repository mints fit, and an e-mail address, a phone number written with
-- spaces or a sentence do not. This is a NARROWING of CTR-TEN-001 as CTR-JOB-001 reads it (a value the schema accepts,
-- such as a 129-character id or one holding a space, is refused here), stated so the contract's owner can restate
-- CTR-JOB-001's reading of tenant_context to match, which RFC-2026-028 §3.4 asks for and contract-catalog/ is
-- read-only to this package; owed, open_blockers[202] (2). actor_kind is CTR-TEN-001's enum exactly, not a narrowing.
--
-- GRANTS, AND WHY THEY MOVE. 050 gives app_worker, the one role holding anything on app.jobs, SELECT on every column
-- and INSERT on every column an enqueuer supplies, and no policy, so that a service refusal comes from row level
-- security rather than from a missing GRANT (050's header; isolation case service-cannot-enqueue-a-job-row, "app_worker
-- HOLDS the INSERT grant and holds no policy"). A NOT NULL column with no default that app_worker could not INSERT
-- would turn that refusal into a privilege refusal and make the worker unable ever to enqueue; one it could not SELECT
-- would leave RFC-2026-026 §3.5's reading impossible. So the four columns get exactly what 050's rule gives an
-- enqueuer-supplied column: SELECT and INSERT for app_worker. NOT UPDATE, for any role: a job's tenant context is
-- fixed when it is enqueued (the correlation is "unchanged across attempts", §3.4), which the block below asserts per
-- column against the live ACL, as 050's block does for id, workspace_id and dedupe_key. No client role is granted
-- anything (RFC-2026-012 §3's empty allowlist; 050). No policy is written (RFC-2026-028 §3.5: each service cell's
-- policy is its own batch's).
--
-- THE TABLE IS EMPTY WHERE THIS RUNS. 050 is applied to no provisioned instance (catalog-snapshot.json declares it
-- pending) and every migrate-clean cluster has no job row when this file runs, so the NOT NULL columns need no default
-- and no backfill. On a table that held a row the ADD would fail closed ("column ... contains null values", measured;
-- plan §3), which is the right answer: a job with no actor is not one this file may invent one for.
--
-- AND 171 (6), BY INHERITANCE (C0 R3, A1 R1, Q0-171R-1 on batch 171's re-check; open_blockers[198]). 171's §6/6 block
-- reads a permissive policy TO authenticated, TO anon or TO PUBLIC; a policy TO a group role that authenticated (or
-- anon) is a member of applies to the client just the same and passed it. 171 is integrated and is never edited, and
-- its replacement (invariants/171_workspace_lifecycle_visibility.1.sql) restates its block word for word, so the rule
-- is completed here, as this file's own block, which the post-migrate pass re-runs after every later migration: the
-- roles a client role reaches through pg_auth_members, RECURSIVELY and whatever the grant's INHERIT, SET or ADMIN
-- option (a SET-only membership lets a client SET ROLE into the group and meet its policies as itself), each read for
-- the policy 171 (6) refuses. The three policies 171 exempts are TO authenticated and stay 171's.
--
-- ROLLBACK / FORWARD FIX. A later forward migration drops the four constraints and columns (after the worker half that
-- reads them is reverted), with the pins of scripts/db/run.mjs (PINNED_CHECKS, PINNED_NOT_NULL) and
-- db/foundation/lint/pinned-grants.json reverted in the same diff. Never an edit of this file once integrated.

alter table app.jobs
  add column actor_kind     text not null,
  add column actor_id       text not null,
  add column request_id     text not null,
  add column correlation_id text not null,
  add constraint jobs_actor_kind_known check (actor_kind in ('user', 'system_actor')),
  add constraint jobs_actor_id_bounded check (actor_id ~ '^[A-Za-z0-9._:-]{1,128}$'),
  add constraint jobs_request_id_bounded check (request_id ~ '^[A-Za-z0-9._:-]{1,128}$'),
  add constraint jobs_correlation_id_bounded check (correlation_id ~ '^[A-Za-z0-9._:-]{1,128}$');

comment on column app.jobs.actor_kind is
  'CTR-TEN-001 actor.kind (RFC-2026-028 §3.4, Q-028-5): user, or system_actor for a sweep no user started.';
comment on column app.jobs.actor_id is
  'CTR-TEN-001 actor.id: the user who started the job, or the sweep''s system actor. 1-128 of [A-Za-z0-9._:-] (172''s bound, a narrowing of CTR-TEN-001 owed to its owner).';
comment on column app.jobs.request_id is
  'The ENQUEUING request''s id, not an attempt''s (RFC-2026-028 §3.4). 1-128 of [A-Za-z0-9._:-]. No default: the database mints none.';
comment on column app.jobs.correlation_id is
  'Carried from the enqueuing request (or the sweep run''s id), unchanged across attempts; updatable by no role. 1-128 of [A-Za-z0-9._:-].';

grant select (actor_kind, actor_id, request_id, correlation_id) on app.jobs to app_worker;
grant insert (actor_kind, actor_id, request_id, correlation_id) on app.jobs to app_worker;

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED
-- ============================================================================================
-- Re-run by the post-migrate pass after the last migration. pg_attribute, pg_attrdef, pg_constraint, pg_policy,
-- pg_roles and pg_auth_members, every one readable without superuser.
do $$
declare
  offending text;
begin
  -- 1. The four columns: text, NOT NULL, and no default (the database mints none of them, RFC-2026-028 §3.4).
  select string_agg(x, ', ' order by x) into offending from (
    select c.c || ' ' || case when a.attnum is null then 'missing'
                       else concat_ws(' ',
                              case when a.atttypid <> 'pg_catalog.text'::pg_catalog.regtype then 'not text' end,
                              case when not a.attnotnull then 'nullable' end,
                              case when a.atthasdef then 'has a default' end) end as x
      from unnest(array['actor_kind', 'actor_id', 'request_id', 'correlation_id']) as c(c)
      left join pg_catalog.pg_attribute a
        on a.attrelid = 'app.jobs'::pg_catalog.regclass and a.attname = c.c and a.attnum > 0 and not a.attisdropped
     where a.attnum is null or a.atttypid <> 'pg_catalog.text'::pg_catalog.regtype or not a.attnotnull or a.atthasdef
  ) f;
  if offending is not null then
    raise exception 'batch 174: app.jobs'' tenant-context columns are not text, NOT NULL and default-free: %', offending
      using hint = 'RFC-2026-028 §3.4: CTR-TEN-001''s fields as columns, not null, and the database mints none of them.';
  end if;

  -- 2. Their four CHECKs, validated and in their exact text: CTR-TEN-001's actor.kind enum, and 172's identifier shape.
  select string_agg(pin.k, ', ' order by pin.k) into offending
    from (values ('jobs_actor_kind_known', 'CHECK ((actor_kind = ANY (ARRAY[''user''::text, ''system_actor''::text])))'),
                 ('jobs_actor_id_bounded', 'CHECK ((actor_id ~ ''^[A-Za-z0-9._:-]{1,128}$''::text))'),
                 ('jobs_request_id_bounded', 'CHECK ((request_id ~ ''^[A-Za-z0-9._:-]{1,128}$''::text))'),
                 ('jobs_correlation_id_bounded', 'CHECK ((correlation_id ~ ''^[A-Za-z0-9._:-]{1,128}$''::text))')) as pin(k, def)
   where not exists (
     select 1 from pg_catalog.pg_constraint con
      where con.conrelid = 'app.jobs'::pg_catalog.regclass and con.contype = 'c' and con.conname = pin.k
        and con.convalidated and pg_catalog.pg_get_constraintdef(con.oid) = pin.def);
  if offending is not null then
    raise exception 'batch 174: app.jobs'' tenant-context CHECK(s) missing, unvalidated or not in their text: %', offending
      using hint = 'RFC-2026-028 §3.4: CTR-TEN-001''s bounds as CHECK constraints; the identifiers bounded as 172 bounds them.';
  end if;

  -- 3. The ACL, per column, live: no role updates any of the four (a job's tenant context is fixed when it is
  --    enqueued); no client role holds anything on them; app_worker SELECTs and INSERTs each (050's rule for an
  --    enqueuer-supplied column, so its refusal stays row level security's).
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s UPDATE (%s)', r.rolname, c.c) as x
      from pg_catalog.pg_roles r, unnest(array['actor_kind', 'actor_id', 'request_id', 'correlation_id']) as c(c)
     where not r.rolsuper and r.rolname !~ '^pg_'
       and pg_catalog.has_column_privilege(r.rolname, 'app.jobs'::pg_catalog.regclass, c.c, 'UPDATE')
    union all
    select format('%s %s (%s)', r.r, p.p, c.c)
      from unnest(array['anon', 'authenticated', 'public']) as r(r), unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) as p(p),
           unnest(array['actor_kind', 'actor_id', 'request_id', 'correlation_id']) as c(c)
     where pg_catalog.has_column_privilege(r.r, 'app.jobs'::pg_catalog.regclass, c.c, p.p)
    union all
    select format('app_worker lacks %s (%s)', p.p, c.c)
      from unnest(array['SELECT', 'INSERT']) as p(p), unnest(array['actor_kind', 'actor_id', 'request_id', 'correlation_id']) as c(c)
     where not pg_catalog.has_column_privilege('app_worker', 'app.jobs'::pg_catalog.regclass, c.c, p.p)
  ) f;
  if offending is not null then
    raise exception 'batch 174: app.jobs'' tenant-context columns are not exactly app_worker''s to read and enqueue and nobody''s to update: %', offending
      using hint = 'RFC-2026-028 §3.4: the correlation is carried unchanged across attempts; 050''s rule for an enqueuer-supplied column.';
  end if;

  -- 4. 171 (6) by inheritance (C0 R3, A1 R1, Q0-171R-1). Every role anon or authenticated reaches through
  --    pg_auth_members, recursively and whatever the grant's options, is read as 171 (6) reads authenticated: a
  --    permissive policy TO it on a workspace-scoped table (a table in app with a workspace_id column, or
  --    app.workspaces) must call app.is_active_member or app.workspace_member_role in USING or WITH CHECK, or the
  --    lifecycle gate does not reach the clients who meet it. anon, authenticated and PUBLIC themselves stay 171's.
  with recursive reached(roleid) as (
    select m.roleid
      from pg_catalog.pg_auth_members m join pg_catalog.pg_roles c on c.oid = m.member
     where c.rolname in ('anon', 'authenticated')
    union
    select m.roleid from reached join pg_catalog.pg_auth_members m on m.member = reached.roleid
  )
  select string_agg(format('%s.%s (TO %s)', c.relname, p.polname, pg_catalog.pg_get_userbyid(g.roleid)), ', '
                    order by c.relname, p.polname, pg_catalog.pg_get_userbyid(g.roleid)) into offending
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join reached g on g.roleid = any (p.polroles)
   where n.nspname = 'app'
     and p.polpermissive
     and (c.relname = 'workspaces'
          or exists (select 1 from pg_catalog.pg_attribute a
                      where a.attrelid = c.oid and a.attname = 'workspace_id' and not a.attisdropped))
     and coalesce(pg_catalog.pg_get_expr(p.polqual, p.polrelid), '')
         || ' ' || coalesce(pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid), '')
         !~ 'app\.(is_active_member|workspace_member_role)\(';
  if offending is not null then
    raise exception 'batch 174: a policy TO a role a client role is a member of reads membership without the helper, so the lifecycle gate does not reach it: %', offending
      using hint = 'RFC-2026-027 §6/6 (171 (6)), by inheritance: a client meets a group role''s policies through the membership; call app.is_active_member or app.workspace_member_role.';
  end if;
end $$;
