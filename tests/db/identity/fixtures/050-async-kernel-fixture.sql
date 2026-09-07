-- Tenant fixture for the batch 050 isolation cases.
--
-- Owner: A0 Async Kernel. It loads AFTER 010-identity-fixture.sql, 020-business-fixture.sql,
-- 021-member-scope-fixture.sql, 030-industry-fixture.sql and 040-knowledge-fixture.sql; the runner
-- applies all six in order. This one needs only the first — every row below hangs off a Workspace —
-- and it is last because the list is an ORDER and a new batch appends to it.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
-- THIS FIXTURE LOADS ROWS NO IDENTITY CAN READ, WHICH IS NEW AND IS THE POINT. Batch 050's three
-- tables carry NO policy and no client grant, so every case against them is a refusal — except the
-- two per table that the service identity makes, and those are the only cases row level security
-- decides here. A fixture is still required, and required more than usual: `service-sees-zero-*`
-- has to address a row that EXISTS, or the empty result is a table with nothing in it rather than a
-- policy refusing. Every one of the six rows below exists so that some negative is about a control
-- instead of about an absence.
--
-- WHY THERE ARE TWO OF EVERYTHING. Workspace A and workspace B each get a job, an outbox event and
-- a consumer ledger row. No case reads across the boundary — no identity can read either side — so
-- the pair is not a cross-tenant assertion and the coverage map says so rather than counting it as
-- one. What the B-side rows buy is narrower and worth having: every `service-sees-zero-*` case
-- addresses ONE workspace's row while the other tenant's row sits beside it, so a policy that
-- somebody widened to "any row in any workspace" would return the wrong tenant's row rather than
-- returning nothing, and the assertion distinguishes the two.
--
-- HOW THE ROWS ARE ADDRESSED, AND WHY THE CATALOG GAINS EXACTLY TWO SYMBOLS. A job is addressed by
-- its natural key `(workspace_id, dedupe_key)` and a ledger row by `(workspace_id, consumer,
-- event_id)` — both fixed by unique constraints in 050_async_kernel.sql, both spelled out of ids and
-- text this file and the case file share, so neither needs a symbol. An OUTBOX EVENT does: its
-- identity is `event_id`, CTR-EVT-001 makes that the envelope's required identity, and the consumer
-- ledger row addresses the event BY that id — which is the whole mechanism of deduplication. A row
-- whose id another row must name is exactly the case the catalog's own rule admits a symbol for.
--
-- This file loads ADMINISTRATIVELY, as the table owner, before any identity is assumed. It could
-- not load any other way: batch 050 writes no INSERT policy for any role, so there is no policy
-- these rows could arrive through — which is also why a reader should not read the loaded state as
-- evidence that anything can write here.
--
-- Idempotent, so a suite can be re-run without a reset.

begin;

-- The two jobs. `dedupe_key` is the natural key's second term and is what every case addresses a
-- job by; the two values differ per workspace so that a case naming one cannot accidentally match
-- the other even if the workspace predicate were dropped.
--
-- No `status`, because there is no such column: CTR-JOB-001's manifest reserves lifecycle state
-- names to an owner review, so a job's state is the timestamps and counters below. These two are
-- due (available_at in the past), unleased, unattempted and uncancelled — the plainest state a job
-- can be in, so that a case failing here is failing about a policy rather than about a fixture that
-- put a row into a corner.
insert into app.jobs
  (workspace_id, job_type, job_version, priority, available_at, attempt, max_attempts,
   timeout_seconds, dedupe_key, input_ref, progress_percent, progress_stage) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'fixture.job', 1, 0,
   timestamptz '2026-09-01 00:00:00+00', 0, 5, 30,
   'fixture-job-a', 'job:fixture.input.a', 0, 'fixture-stage'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', 'fixture.job', 1, 0,
   timestamptz '2026-09-01 00:00:00+00', 0, 5, 30,
   'fixture-job-b', 'job:fixture.input.b', 0, 'fixture-stage')
-- Keyed on the natural key batch 050 declares, which is also the pair every case addresses a job
-- through.
on conflict (workspace_id, dedupe_key) do nothing;

-- The two outbox events. `event_id` is fixed from the catalog because the consumer ledger rows
-- below name it: a ledger row records that a consumer handled THAT event, and a generated id would
-- make the pair unreproducible.
--
-- `subject_type`/`subject_id` name a BUSINESS on each side, which is the header's point about scope
-- made as data: this family carries no `business_profile_id` column, and CTR-EVT-001's `subject` is
-- the envelope's own place for what an event is about. The ids are business_a1 and business_b1,
-- read from the catalog like every other id here.
--
-- `dispatched_at` is null on both. It is the one mutable column on the table, so a fixture that
-- pre-set it would remove the only state an outbox row can be in two of.
insert into app.outbox_events
  (event_id, event_type, event_version, occurred_at, producer_module_key,
   producer_implementation_version, workspace_id, subject_type, subject_id, subject_version,
   correlation_id, schema_ref) values
  ('e664c1cc-011c-5e39-8c4c-9ed7f3643d4b', 'fixture.outbox.event', 1,
   timestamptz '2026-09-01 00:00:00+00', 'jobs.kernel', '0.0.0',
   'c4840acc-0323-5e13-b1d3-c18d7eb615cb',
   'business_profile', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a', 1,
   'fixture-correlation-a', 'CTR-EVT-001@1.0.0'),
  ('cc957e57-507e-5eba-aba3-cb76860f1489', 'fixture.outbox.event', 1,
   timestamptz '2026-09-01 00:00:00+00', 'jobs.kernel', '0.0.0',
   '43fd5c24-ebea-528f-9ce9-eedf1f8f9765',
   'business_profile', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3', 1,
   'fixture-correlation-b', 'CTR-EVT-001@1.0.0')
on conflict (event_id) do nothing;

-- The two ledger rows. Each records that ONE consumer handled ONE event in ONE workspace, which is
-- the natural key batch 050 declares and the shape a redelivery conflicts with.
--
-- Both name the SAME consumer, on purpose: `fixture.consumer` handled event A in workspace A and
-- event B in workspace B. That is the pair that makes `workspace_id`'s place in the key legible —
-- one consumer, two tenants, two rows — and it is the state a key without workspace_id would have
-- collapsed had the two events shared an id.
insert into app.consumer_ledger (workspace_id, consumer, event_id) values
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'fixture.consumer',
   'e664c1cc-011c-5e39-8c4c-9ed7f3643d4b'),
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', 'fixture.consumer',
   'cc957e57-507e-5eba-aba3-cb76860f1489')
on conflict (workspace_id, consumer, event_id) do nothing;

commit;
