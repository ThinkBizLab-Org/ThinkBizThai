-- Batch 050 — the async kernel: the job queue, the outbox, and the consumer ledger.
--
-- Owner: A0 Async Kernel. The migration ownership registry (§6) reserves 050 to this package,
-- describes it as "jobs/outbox/consumer ledger", depends it on 011, and — alone among the batches
-- written so far — puts `A0` rather than "A0 manifest only" in its Shared-file writer column.
--
-- Depends on: 000 (schemas, private.set_updated_at), 001 (app_worker), 010 (app.workspaces),
-- 011 (the authorization helpers, which is the dependency the registry names). All four are
-- merged; migration invariant 1 forbids rewriting any of them and NOTHING BELOW DOES — every
-- statement here creates a new object, and no `drop policy` names a policy another batch wrote,
-- because this batch writes no policy at all. A test asserts that pairing rather than trusting
-- this sentence.
--
-- EIGHT BATCHES DEPEND ON THIS ONE — 051, 061, 070, 080, 100, 110, 120 and 131 by §6's registry —
-- so what is refused here is refused for all of them, and every refusal below says whose it is to
-- close.
--
--
-- 011 IS THE DECLARED DEPENDENCY AND NOT ONE STATEMENT BELOW CALLS IT, WHICH IS WORTH SAYING
--
-- §6 makes 050 depend on 011 (authorization helpers v1) and nothing here calls
-- `app.is_active_member` or `app.workspace_member_role`. That is not the registry being wrong: the
-- helpers are what a membership-scoped policy on these tables WOULD be written against, and §8.4
-- gives this family no client cell that can be implemented (see below), so the batch consumes the
-- dependency by not needing to invent an alternative to it. 040 recorded the same shape about its
-- own declared dependency on 030 and did not manufacture a foreign key to justify it; this is that
-- sentence about a function instead of a constraint.
--
--
-- ============================================================================================
-- WHAT THIS BATCH CREATES, AND THE TWO TABLES IT REFUSES
-- ============================================================================================
--
-- Three documents name this family and no two name the same set:
--
--   §5 inventory      `jobs.kernel` | jobs/attempts/DLQ/outbox/consumed ledger | workspace |
--                     state + append-only | INTERNAL-3 | JOB-SHORT/LEDGER | A0 Kernel
--   §6 registry, 050  "jobs/outbox/consumer ledger"
--   §4 ERD            WORKSPACE ||--o{ JOB : queues   and   JOB ||--o{ JOB_ATTEMPT : attempts
--
-- Five names, three names, two entities. This batch creates the THREE the registry gives it —
-- `app.jobs`, `app.outbox_events`, `app.consumer_ledger` — and refuses the two that are named
-- everywhere except in the row that assigns the work.
--
-- NO `app.job_attempts`, AND THE REASON IS THE CONTRACT RATHER THAN THE REGISTRY. §4's ERD does
-- carry JOB_ATTEMPT, so "the registry does not name it" would be a thin reason on its own. The
-- deciding one is that `CTR-JOB-001` — the frozen-as-Candidate job envelope in
-- contract-catalog/shared-kernel/ctr-job-001/ — models attempts as SCALARS ON THE JOB:
-- `attempt` (integer, minimum 0), `max_attempts` (integer, minimum 1) and `last_error_code`, all
-- properties of the envelope. Those columns exist below because the contract requires them. An
-- attempt TABLE beside them would be a second source of truth for "how many attempts", and
-- NOTHING IN THIS SCHEMA COULD KEEP THE TWO EQUAL: no command function exists for jobs.kernel any
-- more than for business.core or knowledge.core, so nothing binds "insert an attempt row" and
-- "increment job.attempt" into one transaction. That is 021's reason for refusing
-- `current_version_id`, 030's for refusing `industry_pack_id` and 040's for refusing a `kind`
-- column on a version, in the same words and for the third time.
--
-- If a later decision wants attempt ROWS — §10's `JOB-SHORT` does say "job input/result/attempt
-- errors", so somebody may — the honest form is a batch that adds the table AND makes
-- `attempt` derived, which is a change to the contract's envelope and therefore A0's act on
-- CTR-JOB-001 rather than a migration's. Recorded in the work package's open blockers.
--
-- NO `app.job_dead_letter`, AND THAT REFUSAL IS SMALLER AND SHARPER. A DLQ is not a shape; it is a
-- STATE — "this job will not be retried again" — and CTR-JOB-001's own manifest closes the
-- question of who may name states:
--
--   "freeze_boundary": "Candidate only; lifecycle state names and transition policy remain
--                       subject to source-defined owner review."
--
-- The envelope has NO status field. Not one. A `status text check (status in ('queued','running',
-- 'failed','dead'))` column here would be inventing exactly the vocabulary that sentence reserves,
-- in the batch eight others inherit from, and §3.2's "Phase 1 state: `text` + named `CHECK`;
-- เปลี่ยนค่าได้ผ่าน migration เท่านั้น" is a rule about HOW a state is stored once someone with the
-- authority has decided what the states ARE. So this batch stores the lifecycle the way batch 010
-- stored an invitation's — as the TIMESTAMPS and counters the contract names by hand, and no status
-- vocabulary at all:
--
--   available_at          when it may first run
--   lease_owner /
--   lease_expires_at      who holds it now, and until when
--   attempt / max_attempts the retry budget
--   cancel_requested_at   §11.4 step 3's "cancel or drain jobs using typed policy", as a timestamp
--   result_ref            it produced a result
--   last_error_code       the last attempt did not
--
-- "Dead-lettered" is then `attempt >= max_attempts and result_ref is null` — a QUERY, and a query
-- is something a reader can disagree with, whereas a CHECK constraint listing four state names is
-- a decision that has already been made. 010's sentence, unchanged: "A four-value status enum
-- would have been four words this repository's source of truth never wrote."
--
--
-- ============================================================================================
-- IS A JOB ROW TENANT-SCOPED, GLOBAL, OR BOTH? TENANT-SCOPED, BY THREE DOCUMENTS THAT AGREE
-- ============================================================================================
--
-- 030 was the first batch with global rows and had to argue the case. This one does not, and the
-- agreement is worth recording because a queue is the family where a reader might most expect a
-- platform-wide table:
--
--   * §5 scopes `jobs.kernel` to `workspace`. One word, one scope, no "global/business" pair.
--   * §4's ERD reads `WORKSPACE ||--o{ JOB : queues`. A job hangs off a workspace and off nothing
--     else.
--   * `CTR-JOB-001` requires `tenant_context`, which is `CTR-TEN-001`, which makes `workspace_id`
--     a REQUIRED property. There is no job envelope without a workspace.
--
-- So all three tables carry `workspace_id uuid not null references app.workspaces (id)`, which is
-- §3.3's canonical scope field, spelled canonically, and every one of them is a tenant-owned row.
--
-- AND THEY CARRY NOTHING BELOW THE TENANT, WHICH IS ALSO A DECISION. `CTR-TEN-001` makes
-- `business_profile_id` and `page_context_profile_id` OPTIONAL properties of the tenant context,
-- so a job or an event MAY be about a Business. They are not columns here: §5 scopes this family
-- `workspace`, §4's ERD hangs JOB off WORKSPACE only, and §3.3 requires `business_profile_id` of
-- "knowledge, research, content, asset, approval, calendar, publish" — a queue is none of those.
-- 030's sentence, one family over: a scope level two source documents decline to give it.
--
-- The consequence is not a loss, because the contract already has the right place for it:
-- `CTR-EVT-001` requires `subject` — `{type, id, version}` — which is the envelope's own answer to
-- "what is this event about". An event about a Business records it there, in the columns
-- `subject_type` and `subject_id` below, and a consumer that needs the Business reads the subject
-- rather than a scope column this family was never given.
--
--
-- ============================================================================================
-- WHO MAY WRITE AN OUTBOX ROW — AND WHY §3.4's ONE RULE ABOUT IT CANNOT BE SATISFIED TODAY
-- ============================================================================================
--
-- §3.4, in full, first bullet: "Domain state และ outbox event เขียน transaction เดียวกัน" —
-- domain state and the outbox event are written in the SAME TRANSACTION. That is the entire
-- specification of the outbox in this repository, and it is a rule about a WRITE PATH rather than
-- about a row.
--
-- Follow it through this schema as it actually stands and it does not close:
--
--   1. Domain state is written by `authenticated`, directly. Batches 020, 030 and 040 each grant a
--      client INSERT/UPDATE on their tenant tables and each records, in its own header, that NO
--      COMMAND FUNCTION EXISTS for its module. RFC-2026-019 §2 measured the same thing globally:
--      zero functions owned by `app_command`, on the instance, on 2026-09-06.
--   2. So "the same transaction as the domain state" is, today, a CLIENT's transaction.
--   3. A client that could write an outbox row could choose `event_type`, `producer.module_key`,
--      `producer.implementation_version` and `subject` — which are the four fields every consumer
--      downstream routes and trusts on. A forged `content.version.approved` is not a leak of a
--      row; it is an instruction to the rest of the system.
--
-- So the honest resolution is the one 030 reached about a different rule: THIS BATCH SATISFIES THE
-- HALF IT OWNS AND SAYS PLAINLY THAT THE OTHER HALF IS NOT ITS TO PAY. `authenticated` is granted
-- NOTHING on `app.outbox_events` — §8 contains no cell for an outbox row anywhere in its four
-- matrices, and §9.1 classes this whole family `INTERNAL-3`: "private; short retention", client
-- projection "redacted status only". The atomicity §3.4 requires is owed to the command surface
-- (RFC-2026-012 §4 names `SECURITY DEFINER` command functions as the mechanism), and until one
-- exists the outbox is unwritable through the request path, deliberately.
--
-- WHY NOT A TRIGGER, which is the obvious workaround and is the reason this paragraph exists. A
-- trigger on `app.business_profiles` or `app.knowledge_items` that wrote an outbox row WOULD be in
-- the same transaction by construction. It is refused twice over: migration invariant 1 forbids
-- 050 touching a merged migration, and §3.4's own last bullet forbids a module writing another
-- module's table directly — a trigger this batch owns, firing on A1's and A2's tables, is that
-- sentence with extra steps. Batch 040 refused to invent a trigger for the adjacent gap (§15) and
-- this batch refuses for the same reason plus one more.
--
-- WHAT IS THEREFORE TRUE OF THE OUTBOX TODAY, stated so nobody reads the table as a working
-- mechanism: it holds the envelope `CTR-EVT-001` fixes, it is reachable by no client, and the only
-- role granted anything on it is `app_worker`, which holds no policy and is therefore refused by
-- row level security. It is a correctly shaped table with no writer, and the writer is a decision
-- with an owner rather than a column somebody forgot.
--
--
-- ============================================================================================
-- THE CONSUMER LEDGER'S NATURAL KEY, AND WHAT A RETRY MUST NOT DO
-- ============================================================================================
--
-- A consumer ledger exists so that REDELIVERY IS IDEMPOTENT: an at-least-once transport delivers
-- an event more than once, the consumer records that it handled it, and the second delivery finds
-- the record and does nothing. The record is worth exactly its uniqueness — a ledger whose key is
-- unique only by convention makes redelivery idempotent only while nobody races — so the key is a
-- UNIQUE CONSTRAINT and not a comment:
--
--   unique (workspace_id, consumer, event_id)
--
-- Three columns, and each one earns its place:
--
--   `event_id`     is what is being deduplicated. `CTR-EVT-001` makes it the envelope's required
--                  identity, so it is the only field a redelivery is guaranteed to repeat.
--   `consumer`     because two consumers must EACH process an event once. Without it the first
--                  consumer's row suppresses the second's, and the ledger silently becomes a
--                  once-per-event lock instead of a once-per-consumer receipt.
--   `workspace_id` because a retry may not reach across scope.
--
-- THE THIRD TERM IS THE ONE A REVIEWER SHOULD PRESS ON, so here is the whole argument. Two sources
-- give it, and neither is a preference:
--
--   * `CTR-IDM-001` — the command idempotency record, the nearest thing in the contract catalog to
--     an idempotency key — makes its `scope` an OBJECT with `workspace_id` and `operation` both
--     REQUIRED, and its manifest states the rule as "key scope includes workspace and operation".
--     An idempotency key in this system is scoped by workspace by contract, not by habit.
--   * The data package states the same principle about retries in the one place it discusses one:
--     "Retry idempotent ไม่สร้าง package ที่เข้าถึงข้าม scope" — a retry that is idempotent does not
--     produce something that reaches across scope. Drop `workspace_id` from this key and that is
--     precisely what happens in both directions: a redelivery in workspace B is suppressed because
--     workspace A's consumer already recorded that `event_id`, so B's event is silently never
--     processed; and an insert that conflicts becomes an oracle telling one tenant that another
--     tenant's event exists.
--
--   A CITATION CORRECTION, recorded rather than propagated. That sentence is dispatched to this
--   batch as "§12.6 assertion 9". §12.6 — the deterministic fixture contract — has EIGHT required
--   smoke assertions and no ninth; the sentence is item 9 of §11.1, the PDPA/data-export contract.
--   The principle it states is general and this batch applies it; the position is not, and a
--   positional citation into a numbered list is the defect this repository has now recorded three
--   times (WP-0A-DB-00 open_blockers D11). SMOKE_COVERAGE therefore gains no ninth key: batch 030
--   already refused to invent one for a shape §12.6 has no row for, and this batch keeps that rule.
--
-- WHY THE LEDGER HAS NO FOREIGN KEY TO `app.outbox_events`, WHICH LOOKS LIKE AN OMISSION AND IS
-- DECIDED BY §10. The two rows have DIFFERENT retention classes and the difference is five-fold:
--
--   `OUTBOX-SHORT`     published outbox row | จน consumers ack + 30 วัน | no recovery
--   `CONSUMER-LEDGER`  event dedupe keys    | 180 วันหรือ max replay window | retained for replay safety
--
-- A foreign key would make the ledger row die with the event it dedupes, so the outbox purge at
-- ack+30 days would either fail or cascade — and the 180-day window exists for exactly the replay
-- the cascade would destroy. The ledger records that an event id WAS consumed; it does not record
-- a row. §4's ERD contains neither entity and therefore no relation to contradict. Stated here
-- because "no FK" is the kind of absence a later reader adds without knowing what it buys.
--
--
-- ============================================================================================
-- §8.4's TWO ROWS, AND THE ONE CELL THIS BATCH CANNOT IMPLEMENT
-- ============================================================================================
--
-- §8.4 is the first matrix section any batch in this repository has owned a row of. It says:
--
--   | Job redacted status SELECT        | Y | Y | O/P | O/P | O/P | P |
--   | Internal job/attempt/DLQ payload  | N | N | N   | N   | N   | S |
--
-- and it says NOTHING about an outbox row or a consumer ledger row, in this section or in the
-- other three. Where a document is silent the cell is denied, which is what both of those tables
-- get.
--
-- THE SECOND ROW IS THE FIRST `S` CELL IN THE SCHEMA. Batch 010's header predicted this batch by
-- name: "The `S` operations the amendment exists for live in §8.2–§8.4 — research rows, publish
-- delivery, JOB PAYLOADS, usage ledger, audit inserts — and belong to batches 050, 061, 070, 120,
-- 140. Their owners inherit the shape." So the shape arrives here, and what happens to it is the
-- single most consequential thing in this file. See the next section.
--
-- THE FIRST ROW IS A REAL CLIENT CELL THAT THIS BATCH MAY NOT IMPLEMENT, and that is a stronger
-- statement than 030 could make. 030's global catalog had NO §8 row at all; a job's redacted
-- status has one, and it marks the owner and the admin `Y`. The cell is nevertheless unreachable
-- from here, for a mechanical reason:
--
--   * The object §8.4 grants is a REDACTED STATUS, not a job row. §9.1 spells the same thing for
--     `INTERNAL-3` in its own column: client projection "redacted status only". A base-table
--     SELECT grant on `app.jobs` would hand a client `input_ref`, `result_ref`, `lease_owner` and
--     `last_error_code` — which is the NEXT ROW of the same matrix, `N N N N N S`. The two rows
--     are one table and two objects.
--   * A projection object is a `security_invoker` view, and RFC-2026-012 §2/§3 puts every such
--     view on a read allowlist that starts EMPTY and grows only by RFC. RFC-2026-021 (approved
--     2026-09-06) defines what an entry is — five objects and a registry row — and what a
--     candidate must satisfy (C1–C7), and adds no entry.
--
-- SO `authenticated` IS GRANTED NOTHING ON ANY TABLE IN THIS BATCH, and the redacted-status view
-- is written down as a candidate rather than built. What it would have to satisfy, checked here so
-- the RFC that writes it starts from a read rather than from a blank page:
--
--   C1 (a named client caller exists) FAILS TODAY, for the same reason it failed for the industry
--      catalog: there is no `src/`, no client module, and no screen named in any source document
--      that reads a job's status. This is the only criterion that fails.
--   C7 (a global table states its blast radius) DOES NOT APPLY, and this is where a job differs
--      from the industry catalog in the candidate's favour. `app.jobs` is a TENANT table: the
--      policy behind the view is `app.is_active_member(workspace_id)`, a predicate row level
--      security can express, so a mistake reaches one workspace and the isolation suite proves the
--      boundary. RFC-2026-021 §4 C7 exists for the case where nothing bounds the audience but the
--      column list; that is not this case.
--   C2/C3 (an explicit column list, column-scoped, exactly the columns the view touches) is the
--      work: "redacted status" has to be enumerated, and §9.1's `INTERNAL-3` row plus §8.4's
--      second row put `input_ref`, `result_ref`, `lease_owner`, `lease_expires_at` and
--      `last_error_code` outside it. What is left — `id`, `workspace_id`, `job_type`,
--      `available_at`, `attempt`, `max_attempts`, `progress_percent`, `progress_stage`,
--      `cancel_requested_at`, `created_at`, `updated_at` — is a proposal and not a decision, and
--      it is written here so a reviewer can disagree with it before it is a grant.
--   C6 asks whether §8.4's `O/P` for editor, approver and viewer means own-row or per-policy. It
--      is BOTH SYMBOLS IN ONE CELL and no document resolves it; `O` on a job would mean "the job I
--      started", which needs an actor column this batch does not have (see the audit-column note
--      below). Owed to the same RFC.
--
-- AND THE DEBT THIS BATCH DOES NOT ADD TO. RFC-2026-021 §8.5 requires the known-exceptions list of
-- inherited `authenticated` base-table grants to be CLOSED, and records that batches 010, 020, 021
-- named it while 030 and 040 grew it to five. **Batch 050 adds no `authenticated` grant anywhere**,
-- so it is the first batch since that list was described that leaves it at five rather than six.
-- That is a consequence of the refusal above rather than a virtue of this batch, and it is worth
-- one sentence because the list still does not exist.
--
--
-- ============================================================================================
-- THE `S` CELL: WHY THIS BATCH WRITES app_worker GRANTS AND NO SERVICE POLICY
-- ============================================================================================
--
-- RFC-2026-016 §2 (approved 2026-09-05) amends §8.5 and is quoted rather than summarised:
--
--   "a policy is `TO authenticated` for user paths **and `TO <service role>` for each operation the
--    matrix already marks `S`**, with the service policy scoped by a server-set workspace GUC
--    derived from the server-resolved tenant context `CTR-TEN-001` already requires."
--
-- That is an approved decision at position 1 of CONTRIBUTING_AGENTS.md's conflict order, it names
-- this batch's own matrix section, and §6 of the same RFC says the shape should have landed in
-- batch `000` so that later batches inherit a correct one. It did not: WP-0A-DB-00's scope
-- explicitly excludes "any tenant table, and therefore any RLS policy" from batch 000. So the
-- shape arrives here, unwritten, in the first batch that owns an `S` cell.
--
-- **This batch does not write it.** `app_worker` gets grants and no policy, exactly as 010, 020,
-- 021, 030 and 040 do. Three reasons, and the third is not a repetition of anything:
--
--   1. NO DOCUMENT NAMES THE GUC. RFC-2026-016 §2 says "a server-set workspace GUC" and spells
--      none. Batch 011 could inline the platform's identity expression because it MEASURED
--      `request.jwt.claims` off the provisioned instance and pinned the literal in
--      scripts/db/run.mjs; there is no equivalent measurement for a workspace GUC, because there is
--      nothing on any instance that sets one. Writing `current_setting('app.workspace_id', true)`
--      here would fix that name for batches 051, 061, 070, 100, 110, 120, 131 and 140 — every
--      batch that inherits the shape — on a string nobody reviewed. 011 refused to invent the
--      capability set for the same reason and 021 refused to invent a lifecycle field; this is the
--      third refusal of that kind and it is the largest, because eight batches are downstream.
--
--   2. NOTHING CAN BE `app_worker` YET. RFC-2026-019 §4/3 (approved 2026-09-06, and NEWER than
--      RFC-2026-016) decides: "`app_worker`'s connection method is not decided here, and saying so
--      is the decision. No background worker exists." A policy scoped by a GUC that nothing sets,
--      for a role nothing can assume, is a control whose only observable behaviour is that it
--      denies — which is exactly the state the absent policy already produces, minus the invented
--      name.
--
--   3. THE SHAPE DOES NOT FIT THE FIRST TABLE IT WOULD LAND ON, and this reason is new. §3.4
--      specifies how a worker takes work: "Worker claim ใช้ lease + `FOR UPDATE SKIP LOCKED` หรือ
--      queue semantics ที่เทียบเท่า". A claim query asks for THE NEXT DUE JOB, and it cannot name a
--      workspace, because which workspace the next job belongs to is what reading the row tells
--      you. A policy scoped by a single workspace GUC therefore either refuses every claim, or
--      forces a worker to poll workspace by workspace — which is not a queue.
--
--      RFC-2026-016 §2 is not wrong; it was written about the OTHER `S` cells, where the worker
--      already holds the tenant context because it is acting on a known row — a research run, a
--      publish delivery, a notification, a usage ledger entry, an audit insert. A JOB QUEUE is the
--      one family in §8's four matrices where the service DISCOVERS the tenant context by reading
--      the row, so it is the one family the amendment's shape does not describe. That is a finding
--      about an approved decision, produced by trying to implement it, and it is A0's and A1's to
--      dispose of rather than this batch's to route around. It is recorded in the work package's
--      open blockers and in the handoff.
--
-- WHAT THE GRANTS ARE FOR, then, given that nothing can use them. 010's answer, unchanged through
-- five batches: without a grant a service refusal is `42501` either way and proves only that
-- somebody forgot a GRANT; with the grant and no policy, an empty read can only have come from row
-- level security, and a service role that had quietly acquired `BYPASSRLS` would SUCCEED where the
-- suite demands a refusal. On these three tables that is the WHOLE of the live evidence, because
-- no client role holds anything: `service-sees-zero-*` and `service-cannot-*` are the only cases
-- row level security decides here, and they are what the CI negative control rests on.
--
--
-- ============================================================================================
-- WHAT ELSE IS NOT HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO FIND
-- ============================================================================================
--
--   * NO `created_by` / `updated_by`, ON ANY OF THE THREE. §3.2: "ทุก mutable row: `created_at`,
--     `updated_at`; USER MUTATION เพิ่ม `created_by`, `updated_by`" — the actor columns follow a
--     user mutation. §8 gives no client any write on any table in this family, so there is no user
--     mutation to attribute and the columns would be two nullable uuids nothing writes. That is
--     030's reading on the global catalog, applied to a tenant table for the first time, and it has
--     a consequence for the test suite that is stated rather than absorbed: §8.6 case 8 (forged
--     `created_by`) IS NOT APPLICABLE to this family, because there is no such column and no
--     client INSERT to forge it on.
--
--     `CTR-TEN-001` does require an `actor` on the envelope. It is not stored, and the contract's
--     own trust boundary is why: "Server-resolved only after membership and Workspace→Business→Page
--     relation validation; client-supplied context is untrusted input." A context field frozen onto
--     a row and replayed at claim time is not server-resolved at claim time — it is an earlier
--     request's resolution being re-trusted. The worker re-resolves. §11.2's requirement that actor
--     fields be anonymizable rather than cascade-deleted points the same way for a table `JOB-SHORT`
--     purges in 30 days.
--
--   * NO RETENTION WINDOW ENCODED. §5 assigns this family `JOB-SHORT/LEDGER`. §10 defines
--     `JOB-SHORT` ("30 วัน success; 90 วัน failed/DLQ"), `OUTBOX-SHORT` and `CONSUMER-LEDGER` — and
--     defines NO CLASS CALLED `LEDGER`. Its table has twenty-six rows and none of them is that one,
--     which is the same defect batch 030 reported about `CATALOG` and is reported here rather than
--     resolved: §5 names a class §10 does not define, twice now, in two different families. The
--     three classes that ARE defined are the ones these tables belong to, and none of their numbers
--     is written into a constraint: batch 160 owns the retention job and §10's own Product/Security/
--     Legal approval owns the numbers (§15). What this batch does provide is the COLUMN each sweep
--     would read and an index over it, which is 010's treatment of `expires_at` for TOKEN-SHORT.
--
--   * NO PARTIAL INDEX EXPRESSING CLAIMABILITY, and this is the lifecycle refusal arriving in an
--     index. The obvious index for §3.4's claim query is
--     `(available_at) where result_ref is null and cancel_requested_at is null and attempt <
--     max_attempts` — and that predicate IS a definition of which jobs are still live, which is the
--     "lifecycle state names and transition policy" CTR-JOB-001's freeze boundary reserves to an
--     owner review. An index predicate is not a weaker place to put a decision than a CHECK
--     constraint; it is a quieter one. The index below is over `available_at` alone, which is the
--     ordering column the contract names, and the batch that decides the lifecycle adds the rest.
--
--   * NO `payload` COLUMN ON THE OUTBOX, AND NOT BECAUSE OF §5's WORD BAN. §5 does forbid
--     "metadata", "config", "payload" and "JSON" without a declared JSON Schema version, maximum
--     size, prohibited fields and owner — and `CTR-EVT-001` supplies all four, so that rule would
--     have been satisfiable here where it was not in 010, 020 and 040. The reason there is no
--     payload column is the contract itself: `"payload": { "type": "object", "maxProperties": 0 }`,
--     with a freeze boundary reading "until a domain payload contract is owner-approved, this
--     envelope permits no payload business fields". A column whose only legal value is `{}` is a
--     column with no content. The batch that lands the first domain payload contract adds it, as a
--     typed column or as a validated document, on the row and in the same change.
--
--   * NO SERVICE POLICY, NO CLIENT VIEW, AND THEREFORE NO POLICY AT ALL. All three tables are
--     `ENABLE` + `FORCE ROW LEVEL SECURITY` with an EMPTY POLICY SET, which denies every
--     non-bypassing role including the one role holding grants. Batch 030 shipped that state on two
--     GLOBAL tables; these are the first TENANT tables in the schema to carry it, and the
--     difference matters for what the suite can claim: a table no identity can read has no
--     observable tenant boundary, so §12.6/1 and §8.6/5 are NOT covered here and the coverage map
--     says so instead of counting a refusal that holds for everybody as an isolation proof.
--
--   * NOTHING ABOUT WORKSPACE LIFECYCLE VISIBILITY. Unchanged from 020's, 030's and 040's headers,
--     and vacuous here for a new reason: no policy reads anything, so there is no predicate for a
--     lifecycle gate to be missing from. §11.4 step 2 ("stop new jobs/publish") and step 3 ("cancel
--     or drain jobs using typed policy") are operations on this family, and both are owed to the
--     command surface and to batch 160, not to a policy.
--
--
-- ============================================================================================
-- HOW THE COLUMNS ARE DERIVED, WHICH IS FROM A CONTRACT AND NOT FROM A GUESS
-- ============================================================================================
--
-- Every batch before this one had to record that §5 names no column of its family. This one is the
-- opposite case and it changes the discipline rather than relaxing it: `CTR-JOB-001` and
-- `CTR-EVT-001` name every field, with types, bounds and patterns, and a migration that contradicts
-- a frozen contract is a defect while a migration that ignores one is worse. So:
--
--   * `app.jobs` carries EXACTLY CTR-JOB-001's own properties, minus `tenant_context`, which is
--     resolved to §3.3's canonical `workspace_id`.
--   * `app.outbox_events` carries EXACTLY CTR-EVT-001's own properties, minus `tenant_context`
--     (same resolution) and minus `payload` (see above), with the nested objects flattened to the
--     columns they contain: `producer` → `producer_module_key`, `producer_implementation_version`;
--     `subject` → `subject_type`, `subject_id`, `subject_version`; `metadata` → `schema_ref`.
--   * Every bound and every pattern the contract states is a CHECK constraint, because a rule
--     stated in a document and not in a constraint is a rule the database does not have (030).
--
-- A static test reads the two schema files and requires a column per contract property, so a field
-- added to an envelope fails the build here rather than being discovered by a consumer.
--
-- THE ONE PLACE THE CONTRACT AND §3.2 DISAGREE, AND HOW IT IS RESOLVED. `CTR-JOB-001` types
-- `job_id` as a string of 1..128 characters and `CTR-EVT-001` types `event_id` the same way; §3.2
-- says "Domain aggregate/entity: `uuid`". They do not actually conflict — a uuid's canonical text
-- form is 36 characters and satisfies the contract — so both columns are `uuid`, which is the
-- narrower of the two and the one §3.2 requires. A `text` column would have let a producer choose
-- a 128-character key for an aggregate root, which §3.2 forbids and which no consumer could
-- validate.
--
-- WHAT THE CONTRACT LEAVES UNBOUNDED, REPORTED AND NOT FIXED. `CTR-JOB-001` bounds `job_id` and
-- `dedupe_key` at 128 and `input_ref`/`result_ref` at 256, each with an `x-bound-note` recording
-- that independent security review found reference-shaped fields accepting 100000-character
-- values. Four fields beside them carry `minLength: 1` and NO maximum: `job_type`, `lease_owner`,
-- `progress_stage` and `last_error_code`. `CTR-EVT-001` bounded every one of its equivalents in
-- RFC-2026-009. This batch adds no invented maximum — a migration may not amend a contract, and a
-- CHECK enforcing a bound the contract does not state would make the database stricter than the
-- wire and reject envelopes the schema accepts. It is reported to CTR-JOB-001's owner (A0) in the
-- work package's open blockers, which is the same treatment 030 gave the undefined `CATALOG`
-- retention class.
--
--
-- ============================================================================================
-- SURROGATE KEYS: THE FIRST `bigint generated always as identity` IN THIS SCHEMA
-- ============================================================================================
--
-- §3.2 gives two identifier rules and this batch is the first to need the second:
--
--   "Domain aggregate/entity: `uuid`"
--   "Append-only event/attempt/ledger ปริมาณสูง: `bigint generated always as identity`"
--
-- `app.jobs` is an aggregate — §4's ERD gives JOB its own entity — so its key is a uuid, which is
-- also `CTR-JOB-001`'s `job_id`. `app.outbox_events` and `app.consumer_ledger` are the append-only,
-- high-volume rows the second rule names: one outbox row per domain state change, one ledger row
-- per consumer per event. Their keys are `bigint generated always as identity`.
--
-- `ALWAYS`, not `BY DEFAULT`, and the apply-time block asserts it from `pg_attribute.attidentity`.
-- The difference is whether a writer may supply the value: under `BY DEFAULT` a producer can choose
-- its own position in an ordered log, which is exactly what a relay's cursor must not permit.
--
-- The outbox therefore carries BOTH a `bigint id` and a `uuid event_id`, which is not two sources
-- of truth for one fact — they answer different questions. `id` is the RELAY's cursor: the order
-- rows became visible, which is what "read everything after position N" needs and what a uuid
-- cannot express. `event_id` is the ENVELOPE's identity: what a consumer deduplicates on and what
-- `app.consumer_ledger` records. Both are unique; neither can stand in for the other.


-- ---------------------------------------------------------------------------------------------
-- app.jobs — the queue. One row per unit of background work.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` (§3.3). Sensitivity INTERNAL-3, retention JOB-SHORT. Every column
-- below except `workspace_id`, `created_at` and `updated_at` is a property CTR-JOB-001 names, and
-- the CHECK beside it is that property's own constraint.
create table if not exists app.jobs (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid        not null references app.workspaces (id),
  job_type           text        not null,
  job_version        integer     not null,
  priority           integer     not null,
  available_at       timestamptz not null,
  attempt            integer     not null default 0,
  max_attempts       integer     not null,
  timeout_seconds    integer     not null,
  lease_owner        text,
  lease_expires_at   timestamptz,
  dedupe_key         text        not null,
  cancel_requested_at timestamptz,
  input_ref          text        not null,
  result_ref         text,
  progress_percent   integer     not null default 0,
  progress_stage     text        not null,
  last_error_code    text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- CTR-JOB-001's own bounds, as constraints. `job_type`, `lease_owner`, `progress_stage` and
  -- `last_error_code` get `minLength: 1` and nothing else, because that is all the contract states
  -- about them; see the header on what is reported rather than invented.
  constraint jobs_job_type_not_blank check (length(btrim(job_type)) > 0),
  constraint jobs_job_version_positive check (job_version >= 1),
  constraint jobs_attempt_not_negative check (attempt >= 0),
  constraint jobs_max_attempts_positive check (max_attempts >= 1),
  constraint jobs_timeout_seconds_positive check (timeout_seconds >= 1),
  constraint jobs_lease_owner_not_blank check (lease_owner is null or length(btrim(lease_owner)) > 0),
  constraint jobs_progress_stage_not_blank check (length(btrim(progress_stage)) > 0),
  constraint jobs_last_error_code_not_blank check (last_error_code is null or length(btrim(last_error_code)) > 0),
  constraint jobs_progress_percent_range check (progress_percent between 0 and 100),
  constraint jobs_dedupe_key_bounded check (length(dedupe_key) between 1 and 128),
  -- The reference rule CTR-JOB-001 states for input_ref and result_ref, character for character
  -- from the contract's `pattern`, with its `maxLength`. Its `x-reference-rule` records that the
  -- earlier deny-list form passed `HTTPS://…`, `//host/x`, `file:///etc/passwd`, `javascript:` and
  -- `../../../etc/passwd`; a column holding a reference nobody constrains is that finding one layer
  -- down, on data a worker will dereference.
  constraint jobs_input_ref_form check (
    input_ref ~ '^(job|status|result|app|asset|content):[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$'
    and length(input_ref) <= 256),
  constraint jobs_result_ref_form check (
    result_ref is null or (
      result_ref ~ '^(job|status|result|app|asset|content):[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$'
      and length(result_ref) <= 256)),
  -- A lease is a pair or it is nothing: an owner with no expiry is a job nobody can reclaim, and an
  -- expiry with no owner is a claim nobody made. CTR-JOB-001 marks both optional and says nothing
  -- about the pairing, so this is 050's own reading and it is stated so a reviewer can refuse it.
  constraint jobs_lease_is_a_pair check (
    (lease_owner is null and lease_expires_at is null)
    or (lease_owner is not null and lease_expires_at is not null)),
  -- THE DEDUPE KEY, WORKSPACE-SCOPED. See the header: CTR-IDM-001 scopes an idempotency key by
  -- workspace, and a retry may not reach across scope. `job_type` is deliberately NOT in this key —
  -- including it would let one dedupe_key enqueue one job per type, and "duplicate external side
  -- effects" is a stop-the-line incident in CONTRIBUTING_AGENTS.md while a suppressed duplicate is
  -- not. The broader key is the safer direction and the choice is recorded rather than implied.
  constraint jobs_dedupe_key_unique unique (workspace_id, dedupe_key)
);

comment on table app.jobs is
  'Owner: A0 Async Kernel (jobs.kernel, batch 050). Canonical scope workspace_id (§3.3) — §5 scopes '
  'this family `workspace`, §4''s ERD reads WORKSPACE ||--o{ JOB, and CTR-JOB-001 requires a '
  'tenant_context whose workspace_id is mandatory. Sensitivity INTERNAL-3; retention JOB-SHORT. '
  'Columns are CTR-JOB-001''s own properties with tenant_context resolved to workspace_id, and NO '
  'status column: that contract''s manifest reserves lifecycle state names to an owner review, so '
  'the lifecycle is the timestamps and counters it names. NO client role holds any privilege — '
  '§8.4''s "Job redacted status SELECT" grants a REDACTED STATUS, which is a security_invoker view '
  'on the empty read allowlist RFC-2026-012 §3 and RFC-2026-021 give to an RFC. NO policy at all, '
  'so every role including app_worker is refused by row level security.';
comment on column app.jobs.id is
  'INTERNAL-3. CTR-JOB-001''s `job_id`, as a uuid: the contract types it string(1..128) and §3.2 '
  'requires a uuid for a domain aggregate, and a uuid''s 36 characters satisfy both.';
comment on column app.jobs.workspace_id is
  'INTERNAL-3. The canonical tenant scope, and the column a service policy would resolve if one '
  'could be written (RFC-2026-016 §2; see the migration header for why it is not written here). It '
  'is also what batch 160''s retention sweep and §11.4''s closure steps address a workspace''s jobs '
  'by.';
comment on column app.jobs.dedupe_key is
  'INTERNAL-3. CTR-JOB-001 requires it and states no uniqueness; a dedupe key that is not unique '
  'deduplicates nothing, so it is unique per WORKSPACE — CTR-IDM-001 scopes an idempotency key by '
  'workspace, and a retry that reached across scope is the failure §11.1/9 names.';
comment on column app.jobs.attempt is
  'INTERNAL-3. CTR-JOB-001 models attempts as this counter plus max_attempts, which is why batch '
  '050 creates no app.job_attempts: a table beside these two would be a second source of truth for '
  'the same fact and no command function exists to keep them equal.';
comment on column app.jobs.cancel_requested_at is
  'INTERNAL-3. §11.4 step 3, "cancel or drain jobs using typed policy", as a timestamp rather than '
  'as a status value — the vocabulary is reserved by CTR-JOB-001''s freeze boundary.';
comment on column app.jobs.input_ref is
  'INTERNAL-3. A REFERENCE, never content. §3.4 forbids a secret, a binary, a long-lived signed URL '
  'or a raw provider response in a job payload, and §9.2 forbids the same in a job. The pattern is '
  'CTR-JOB-001''s own, whose x-reference-rule records the traversal and scheme bypasses the earlier '
  'deny-list form permitted.';
comment on column app.jobs.result_ref is 'INTERNAL-3. See input_ref. Null until the job produces one.';


-- ---------------------------------------------------------------------------------------------
-- app.outbox_events — the domain event, written in the transaction that changed the domain.
-- ---------------------------------------------------------------------------------------------
--
-- §3.4's rule is the whole specification and this schema has no write path that can honour it; the
-- header says so at length. The table is correct and has no writer.
--
-- Append-only in every column but `dispatched_at`: the envelope a consumer routes on cannot be
-- edited after the fact, and the one thing a relay must record is that it published the row.
create table if not exists app.outbox_events (
  id                              bigint generated always as identity primary key,
  event_id                        uuid        not null default gen_random_uuid(),
  event_type                      text        not null,
  event_version                   integer     not null,
  occurred_at                     timestamptz not null,
  producer_module_key             text        not null,
  producer_implementation_version text        not null,
  workspace_id                    uuid        not null references app.workspaces (id),
  subject_type                    text        not null,
  subject_id                      text        not null,
  subject_version                 integer     not null,
  correlation_id                  text        not null,
  causation_id                    text,
  idempotency_key                 text,
  schema_ref                      text        not null,
  dispatched_at                   timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  -- CTR-EVT-001's own pattern for event_type, and its bound. Every other bound below is that
  -- contract's `maxLength` on the same field.
  constraint outbox_events_event_type_form check (
    event_type ~ '^[a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+$' and length(event_type) <= 128),
  constraint outbox_events_event_version_positive check (event_version >= 1),
  constraint outbox_events_producer_module_key_bounded check (length(producer_module_key) between 1 and 64),
  constraint outbox_events_producer_version_bounded check (length(producer_implementation_version) between 1 and 64),
  constraint outbox_events_subject_type_bounded check (length(subject_type) between 1 and 64),
  constraint outbox_events_subject_id_bounded check (length(subject_id) between 1 and 128),
  constraint outbox_events_subject_version_positive check (subject_version >= 1),
  constraint outbox_events_correlation_id_bounded check (length(correlation_id) between 1 and 128),
  constraint outbox_events_causation_id_bounded check (causation_id is null or length(causation_id) between 1 and 128),
  constraint outbox_events_idempotency_key_bounded check (idempotency_key is null or length(idempotency_key) between 1 and 200),
  -- CTR-EVT-001's metadata.schema_ref, whose x-source explains why it is a contract NAME and not a
  -- reference: an unconstrained schema_ref accepted file:///, javascript:, data:, //host, traversal
  -- and a cloud metadata address across sixteen probed hostile forms.
  constraint outbox_events_schema_ref_form check (
    schema_ref ~ '^CTR-[A-Z]{3}-[0-9]{3}@(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
    and length(schema_ref) <= 32),
  -- The envelope's identity, and what app.consumer_ledger deduplicates on. Unique across the table
  -- rather than per workspace, because an event id is the identity of one event and two workspaces
  -- producing the same id would be a generator collision rather than a namespace.
  constraint outbox_events_event_id_unique unique (event_id)
);

comment on table app.outbox_events is
  'Owner: A0 Async Kernel (jobs.kernel, batch 050). Canonical scope workspace_id (§3.3), from '
  'CTR-EVT-001''s required tenant_context. Sensitivity INTERNAL-3; retention OUTBOX-SHORT. Columns '
  'are CTR-EVT-001''s own properties with the nested producer/subject/metadata objects flattened '
  'and NO payload column: that contract fixes payload at maxProperties 0 until a domain payload '
  'contract is owner-approved. §3.4 requires an outbox row to be written in the SAME TRANSACTION as '
  'the domain state it announces, and no write path in this schema can do that — no command '
  'function exists, so the only transaction that writes domain state is a client''s, and a client '
  'that could write here would choose the event_type, producer and subject every consumer routes '
  'on. So NO role but app_worker is granted anything, app_worker holds no policy, and the atomicity '
  '§3.4 requires is owed to the command surface (RFC-2026-012 §4). Append-only except '
  'dispatched_at.';
comment on column app.outbox_events.id is
  'The RELAY''s cursor, and §3.2''s "Append-only event/attempt/ledger ปริมาณสูง: bigint generated '
  'always as identity". ALWAYS rather than BY DEFAULT: under BY DEFAULT a producer could choose its '
  'own position in an ordered log.';
comment on column app.outbox_events.event_id is
  'INTERNAL-3. CTR-EVT-001''s required identity, as a uuid for the reason app.jobs.id is one. It is '
  'what a consumer deduplicates on and what app.consumer_ledger records; the bigint above orders '
  'and this identifies, and neither can stand in for the other.';
comment on column app.outbox_events.subject_type is
  'INTERNAL-3. CTR-EVT-001''s subject is the envelope''s own answer to "what is this event about", '
  'and it is where an event about a Business records that Business — this family carries no '
  'business_profile_id, because §5 scopes it `workspace` and §4''s ERD hangs nothing below that.';
comment on column app.outbox_events.subject_id is 'INTERNAL-3. See subject_type. A string by contract.';
comment on column app.outbox_events.dispatched_at is
  'INTERNAL-3. The ONE mutable column: §10''s OUTBOX-SHORT retains a row "จน consumers ack + 30 '
  'วัน", so the row has to record having been published. Every other column is append-only, and the '
  'apply-time block asserts that per column against the live ACL rather than trusting the grant '
  'text below.';
comment on column app.outbox_events.schema_ref is
  'INTERNAL-3. CTR-EVT-001''s metadata.schema_ref: the contract that defines this event''s body, as '
  'a contract id and a semantic version. It NAMES a contract and does not locate a resource, which '
  'is why its form is not the reference pattern app.jobs.input_ref carries.';


-- ---------------------------------------------------------------------------------------------
-- app.consumer_ledger — one row per consumer per event, so that redelivery is idempotent.
-- ---------------------------------------------------------------------------------------------
--
-- Append-only in every column. §3.2's immutability rule names "usage/audit history"; §5 calls this
-- family "state + append-only" and this is the append-only half of it; and §8.6 case 9 —
-- "Immutable/LEDGER row → update/delete fail" — is the first case in that list that names a ledger,
-- and this is the first ledger in the schema. Expressed three ways at once, as 020's, 030's and
-- 040's version tables are: no UPDATE or DELETE policy, no UPDATE or DELETE grant to any role, and
-- no `updated_at` column or trigger, because an immutable row has no update to stamp.
create table if not exists app.consumer_ledger (
  id            bigint generated always as identity primary key,
  workspace_id  uuid        not null references app.workspaces (id),
  consumer      text        not null,
  event_id      uuid        not null,
  consumed_at   timestamptz not null default now(),
  -- Bounded like CTR-EVT-001's producer.module_key, because a consumer is named the same way a
  -- producer is and the contract bounds that field at 64.
  constraint consumer_ledger_consumer_bounded check (length(consumer) between 1 and 64),
  -- THE NATURAL KEY, AND THE WHOLE POINT OF THE TABLE. See the migration header: `event_id` is what
  -- is deduplicated, `consumer` is why two consumers each get one turn, and `workspace_id` is
  -- because a retry may not reach across scope — CTR-IDM-001 makes workspace part of an
  -- idempotency key's scope by contract, and §11.1/9 states the principle.
  constraint consumer_ledger_one_per_consumer_per_event
    unique (workspace_id, consumer, event_id)
);

comment on table app.consumer_ledger is
  'Owner: A0 Async Kernel (jobs.kernel, batch 050). Canonical scope workspace_id (§3.3). '
  'Sensitivity INTERNAL-3; retention CONSUMER-LEDGER — 180 days or the max replay window, which is '
  'why there is NO foreign key to app.outbox_events: OUTBOX-SHORT purges an event at ack + 30 days '
  'and a foreign key would take the ledger row with it, destroying the replay safety the longer '
  'window exists for. APPEND-ONLY: no role, client or service, holds UPDATE or DELETE, as an absent '
  'grant and an absent policy rather than as a convention, and there is no updated_at. It exists so '
  'that redelivery is idempotent, and the unique constraint IS that property — a ledger whose key '
  'is unique only by convention is idempotent only while nobody races.';
comment on column app.consumer_ledger.consumer is
  'INTERNAL-3. WHICH consumer handled the event. Without it the first consumer''s row suppresses '
  'every other consumer''s delivery, and the ledger becomes a once-per-event lock instead of a '
  'once-per-consumer receipt.';
comment on column app.consumer_ledger.event_id is
  'INTERNAL-3. CTR-EVT-001''s event identity. Not FK-constrained to app.outbox_events — see the '
  'table comment; the retention classes differ by 150 days and the FK would resolve that '
  'difference in the wrong direction.';
comment on column app.consumer_ledger.consumed_at is
  'INTERNAL-3. §10: CONSUMER-LEDGER is purged "by partition/window", and this is the column that '
  'window is over. The number is not encoded here: batch 160 owns the retention job and §10''s own '
  'approval owns the numbers (§15).';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- Already covered by a constraint's own index, and therefore NOT repeated below:
--
--   jobs (workspace_id, dedupe_key)        — jobs_dedupe_key_unique, which leads with workspace_id
--                                            and so supports the foreign key to app.workspaces and
--                                            the column a service policy would resolve.
--   consumer_ledger (workspace_id, consumer, event_id)
--                                          — the natural key, which leads with workspace_id and so
--                                            supports that table's foreign key too.
--   outbox_events (event_id)               — the unique constraint, and the lookup a consumer makes.
--   outbox_events (id) / jobs (id)         — the primary keys.

-- §3.3 keyset pagination, "(created_at desc, id desc)", for the two lists that grow with the
-- tenant. The ledger gets none: nothing paginates a dedupe table, and its own window index is below.
create index if not exists jobs_workspace_keyset_idx
  on app.jobs (workspace_id, created_at desc, id desc);

create index if not exists outbox_events_workspace_keyset_idx
  on app.outbox_events (workspace_id, created_at desc, id desc);

-- §3.4's claim ordering. `available_at` ALONE, and the header says why the obvious partial
-- predicate is refused: a predicate naming result_ref, cancel_requested_at and the attempt budget
-- is a definition of which jobs are still live, which is the lifecycle CTR-JOB-001's freeze
-- boundary reserves to an owner review. An index predicate is a quieter place to put a decision
-- than a CHECK constraint, not a weaker one.
create index if not exists jobs_available_at_idx
  on app.jobs (available_at);

-- The relay's cursor: everything not yet published, oldest first. `dispatched_at is null` is the
-- column's own nullability rather than an invented state vocabulary — §10 retains an outbox row
-- "จน consumers ack + 30 วัน", so having been published is a fact the row already has to carry.
create index if not exists outbox_events_undispatched_idx
  on app.outbox_events (id)
  where dispatched_at is null;

-- §10: CONSUMER-LEDGER is purged "by partition/window". This is the column batch 160's sweep reads,
-- and it is the same shape 010 created for TOKEN-SHORT's expires_at before that job existed either.
create index if not exists consumer_ledger_window_idx
  on app.consumer_ledger (consumed_at);


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every MUTABLE row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
--
-- Two triggers, not three. app.consumer_ledger has no updated_at to stamp, and adding one would be
-- the first sentence of an append-only table contradicting itself (020's words, unchanged).
--
-- Both triggers are INERT TODAY and that is said rather than hidden: no role holds UPDATE through a
-- policy, so nothing can fire either of them. They are here because §3.2 requires updated_at of a
-- mutable row and both of these rows are mutable by design — a job progresses and is leased, an
-- outbox row is dispatched — and 021 recorded the same about its own inert trigger: the alternative,
-- omitting the column, would be declaring the row IMMUTABLE, which is a different claim.
drop trigger if exists set_updated_at on app.jobs;
create trigger set_updated_at before update on app.jobs
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.outbox_events;
create trigger set_updated_at before update on app.outbox_events
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on every table, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
--
-- On all three of these it is doing the whole job rather than part of it. They carry NO policy, so
-- ENABLE plus FORCE is what makes every non-bypassing role — including the table owner and
-- including the one role holding grants — read zero rows, and it is what the CI negative control
-- switches off to prove the suite notices.
alter table app.jobs enable row level security;
alter table app.jobs force row level security;

alter table app.outbox_events enable row level security;
alter table app.outbox_events force row level security;

alter table app.consumer_ledger enable row level security;
alter table app.consumer_ledger force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges.
-- ---------------------------------------------------------------------------------------------
--
-- §6 invariant 8 puts migration, constraints, indexes, RLS AND grants in one change set.
--
-- `authenticated` IS GRANTED NOTHING, ON ANY OF THE THREE, AND THAT IS THE BATCH'S CENTRAL
-- REFUSAL. §8.4's "Job redacted status SELECT" is `Y` for owner and admin, and the object it grants
-- is a REDACTED STATUS: §9.1 gives `INTERNAL-3` the client projection "redacted status only", and
-- the next row of the same matrix marks the internal job payload `N` for every client role. A
-- base-table grant here would hand a client both. The projection is a `security_invoker` view,
-- which RFC-2026-012 §2/§3 puts on a read allowlist that starts empty and grows only by RFC, and
-- RFC-2026-021 §7 defines the entry and adds none. See the migration header for the criteria this
-- candidate meets and the one (C1) it fails.
--
-- `anon` IS GRANTED NOTHING, which since 2026-09-06 is an approved decision rather than an
-- inherited convention: RFC-2026-021 §7/4 decides it in terms and gives the structural reason — the
-- first `anon` grant is not one grant, it is `grant usage on schema app`, and it changes the DENIAL
-- LAYER of every object in `app` at once. All three anonymous cases in the isolation suite declare
-- `deniedOn: { kind: 'schema', name: 'app' }` for exactly that reason.
--
-- `app_worker` HOLDS GRANTS AND NO POLICY, for the reason 010, 020, 021, 030 and 040 all record:
-- without a grant a service refusal is 42501 either way and proves only that somebody forgot a
-- GRANT; with the grant and no policy, an empty read can only have come from row level security,
-- and a service role that had quietly acquired BYPASSRLS would SUCCEED where the suite demands a
-- refusal. On these three tables those are the ONLY cases row level security decides, because no
-- client role holds anything at all.
--
-- The verbs follow §8.4's `S` and the family's own shape, column-scoped where a column is withheld:
--
--   app.jobs             select, insert, update — a job is enqueued, claimed, progressed and
--                        completed. `id` and `workspace_id` are absent from the UPDATE grant, so no
--                        job can be re-identified or moved between tenants by an update (§8.5), and
--                        `dedupe_key` is absent too: a dedupe key that can be changed after the row
--                        exists deduplicates nothing.
--   app.outbox_events    select, insert, and UPDATE ON `dispatched_at` ALONE. The envelope a
--                        consumer routes on is append-only; the one thing a relay records is that
--                        it published the row.
--   app.consumer_ledger  select, insert. No UPDATE and no DELETE, for any role: it is a ledger.
--
-- NO DELETE ANYWHERE, for any role. §8.5 has no broad user delete, and hard deletion of these three
-- families is a retention job — JOB-SHORT, OUTBOX-SHORT and CONSUMER-LEDGER all name a purge, and
-- batch 160 owns it through `app_maintenance`, which this batch grants nothing.
grant select (id, workspace_id, job_type, job_version, priority, available_at, attempt,
              max_attempts, timeout_seconds, lease_owner, lease_expires_at, dedupe_key,
              cancel_requested_at, input_ref, result_ref, progress_percent, progress_stage,
              last_error_code, created_at, updated_at)
  on app.jobs to app_worker;
grant insert (id, workspace_id, job_type, job_version, priority, available_at, attempt,
              max_attempts, timeout_seconds, dedupe_key, input_ref, progress_percent, progress_stage)
  on app.jobs to app_worker;
grant update (job_type, job_version, priority, available_at, attempt, max_attempts, timeout_seconds,
              lease_owner, lease_expires_at, cancel_requested_at, input_ref, result_ref,
              progress_percent, progress_stage, last_error_code)
  on app.jobs to app_worker;

grant select (id, event_id, event_type, event_version, occurred_at, producer_module_key,
              producer_implementation_version, workspace_id, subject_type, subject_id,
              subject_version, correlation_id, causation_id, idempotency_key, schema_ref,
              dispatched_at, created_at, updated_at)
  on app.outbox_events to app_worker;
grant insert (event_id, event_type, event_version, occurred_at, producer_module_key,
              producer_implementation_version, workspace_id, subject_type, subject_id,
              subject_version, correlation_id, causation_id, idempotency_key, schema_ref)
  on app.outbox_events to app_worker;
-- One column. The apply-time block asserts that every other column of this table is unwritable by
-- every role, against the live ACL rather than against this line.
grant update (dispatched_at) on app.outbox_events to app_worker;

grant select (id, workspace_id, consumer, event_id, consumed_at) on app.consumer_ledger to app_worker;
grant insert (workspace_id, consumer, event_id) on app.consumer_ledger to app_worker;
-- No UPDATE and no DELETE on the ledger, for any role. §8.6 case 9 names a LEDGER row and this is
-- the first one in the schema; the absence is what makes the refusal a privilege-layer 42501 the
-- isolation suite can attribute to an object by name.

-- `app_command` and `app_maintenance` are granted nothing by this batch. There is no specified
-- command surface for jobs.kernel — which is the gap §3.4's atomicity rule and §8.6 case 10 both
-- turn on — and the retention path is batch 160.


-- ---------------------------------------------------------------------------------------------
-- Policies. There are none, and that is the decision rather than an omission.
-- ---------------------------------------------------------------------------------------------
--
-- §8.4 gives this family two rows. The client one grants a REDACTED STATUS, whose object is a view
-- on an allowlist only an RFC may add to; the service one is `S`, whose shape RFC-2026-016 §2
-- describes with a GUC no document names, for a role RFC-2026-019 §4/3 says nothing can yet be, in
-- a form that cannot express a queue's own claim query. Both refusals are argued in the header at
-- the length they deserve.
--
-- The outbox and the consumer ledger have NO row in any of §8's four matrices, in either direction,
-- so there is no cell to implement and every operation on them is denied by default.
--
-- All three tables are therefore FORCE ROW LEVEL SECURITY with an empty policy set, which denies
-- every non-bypassing role including the one holding grants. Batch 030 shipped that state on two
-- GLOBAL tables and 010's static suite requires a forced table's policy set to be a decision in the
-- file rather than an omission; this paragraph is that decision, and
-- tests/db/identity/identity-isolation.test.mjs holds it to it in both directions.


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004, 011, 020, 021, 030 and 040 use: a claim that is only a comment is a claim
-- nobody checks. These are the properties of THIS batch answerable from the catalog of the database
-- being migrated, without a committed snapshot and without a test harness. The text half lives in
-- tests/db/identity/identity-isolation.test.mjs and the live behavioural half is `make db-rls-smoke`.
--
-- WHAT IS DELIBERATELY NOT ASSERTED HERE, following 030's rule and 021's scar. 011's apply-time
-- block raises when app_authz holds a number of policies other than one, and 021 had to route
-- around an APPLIED migration's self-assertion rather than make it false. So nothing below asserts
-- a property an approved decision is EXPECTED to change:
--
--   * NOT "no client role holds a privilege on these tables". That absence is RFC-2026-012 §3's
--     empty read allowlist, and an allowlist exists in order to grow — RFC-2026-021 §3 makes a
--     column-scoped SELECT grant to `authenticated` object 2 of any future entry.
--   * NOT "these tables carry no policy". Object 4 of that same entry is a SELECT policy on the
--     base table, and RFC-2026-016 §2 positively EXPECTS a `TO app_worker` policy here once the GUC
--     is decided. An apply-time assertion of zero policies would make the batch that implements an
--     approved decision fail on a merged migration's own words.
--   * NOT "no policy names app_worker", for the same reason one line up.
--
-- Both are asserted in the static suite instead, where the batch that lands either decision edits a
-- line a reviewer reads. What IS asserted at apply time is the set of properties no approved
-- decision is expected to move: anon (RFC-2026-021 §7/4 decided it as a negative), the ledger's
-- append-only shape, the outbox's per-column immutability, the two natural keys, the identity
-- columns, ENABLE/FORCE and the ownership rules.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only
-- by a superuser, and a migration that needs one to apply is a migration that cannot be applied on
-- the platform it targets, where `postgres` is not a superuser.
do $$
declare
  offending text;
  count_of  integer;
begin
  -- ENABLE and FORCE on all three. The two are different catalog columns and the data package's own
  -- lint rule reads only the first (RFC-2026-016). On a table with no policy this is the ONLY thing
  -- refusing the role that holds the grants.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('jobs', 'outbox_events', 'consumer_ledger')
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'These three carry no policy at all, so FORCE is the whole control: without it '
                   'the table owner reads every row and the isolation suite cannot tell that from a '
                   'working queue.';
  end if;

  -- THE LEDGER IS APPEND-ONLY, as the privilege system holds it. §8.6 case 9 is "Immutable/ledger
  -- row → update/delete fail" and app.consumer_ledger is the first LEDGER in this schema. Asserted
  -- against the live ACLs rather than against the text of the grants above, because a grant made by
  -- a LATER batch would not appear in this file at all.
  --
  -- `has_any_column_privilege` for UPDATE so a column-scoped grant is caught as well as a
  -- table-wide one; DELETE has no column-level form and is asked of the table.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'consumer_ledger'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'the consumer ledger can be updated or deleted: %', offending
      using hint = 'A ledger exists so that redelivery is idempotent. A row that can be edited or '
                   'removed makes a redelivery replayable, which is the one thing the table is for.';
  end if;

  -- THE OUTBOX ENVELOPE IS APPEND-ONLY EXCEPT FOR ONE COLUMN, per column, against the live ACL. The
  -- grant above names dispatched_at and this is what says so about the other sixteen: a role that
  -- could rewrite event_type, producer_module_key or subject_id could re-aim an event every
  -- consumer downstream routes on, after the transaction that produced it committed.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, a.attname as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        join pg_catalog.pg_attribute a on a.attrelid = c.oid
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'outbox_events'
         and a.attnum > 0 and not a.attisdropped
         and a.attname <> 'dispatched_at'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, a.attname, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a column of the outbox envelope other than dispatched_at is updatable: %', offending
      using hint = 'The envelope is what a consumer routes and trusts on. dispatched_at is the one '
                   'thing a relay records, and §10 requires it because OUTBOX-SHORT retains a row '
                   'until consumers ack.';
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE THREE. §8.5 has no broad user delete; every purge in this
  -- family is a retention job (JOB-SHORT, OUTBOX-SHORT, CONSUMER-LEDGER) and batch 160 owns it.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname in ('jobs', 'outbox_events', 'consumer_ledger')
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a row in the async kernel can be deleted through a granted path: %', offending
      using hint = '§8.5 requires a soft delete through a typed lifecycle field where a delete is '
                   'wanted at all, and hard deletion here is a retention sweep with its own class '
                   'and its own batch.';
  end if;

  -- §8.5, per column, against the live ACL: a job may not be re-identified or moved between tenants
  -- by an update, and its dedupe key may not be changed after the row exists. The UPDATE grant above
  -- names fifteen columns and this is what says so about the three it withholds.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'dedupe_key']) as col
       where n.nspname = 'app'
         and c.relname = 'jobs'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity or scope column of app.jobs is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant with an update. dedupe_key is in this '
                   'list because a deduplication key that can be edited after the fact deduplicates '
                   'nothing, and app_worker is IN the list here — unlike 030 and 040, where it was '
                   'excluded for holding a table-wide grant — because every grant this batch makes '
                   'to it is column-scoped.';
  end if;

  -- THE TWO NATURAL KEYS, READ FROM THE CATALOG AS COLUMN SETS RATHER THAN AS CONSTRAINT NAMES.
  --
  -- This is the assertion the batch owes most, and it is about `workspace_id` being IN each key. A
  -- ledger keyed on (consumer, event_id) alone would let workspace A's consumer suppress workspace
  -- B's redelivery of the same event id, and would make a conflicting insert an oracle for another
  -- tenant's event ids — which is "retry idempotent creating something that reaches across scope",
  -- the failure §11.1/9 names. It would pass every other check in this repository: the constraint
  -- would still exist, still be unique, and still make redelivery idempotent within one tenant.
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
       where n.nspname = 'app' and con.contype = 'u'
         and c.relname in ('consumer_ledger', 'jobs')
    ) as keys
   where not (
     (target = 'consumer_ledger' and cols = 'consumer,event_id,workspace_id')
     or (target = 'jobs' and cols = 'dedupe_key,workspace_id')
   );
  if offending is not null then
    raise exception 'a natural key in the async kernel is not the one batch 050 declares: %', offending
      using hint = 'app.consumer_ledger must be unique on (workspace_id, consumer, event_id) and '
                   'app.jobs on (workspace_id, dedupe_key). workspace_id is in BOTH because a retry '
                   'may not reach across scope: without it one tenant''s consumption suppresses '
                   'another''s redelivery, and a conflicting insert reports that another tenant''s '
                   'event exists.';
  end if;

  -- Exactly those two unique constraints on those two tables, and one on the outbox. A THIRD key on
  -- the ledger, or a second on app.jobs, would be a deduplication rule nobody recorded.
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and con.contype = 'u'
     and c.relname in ('jobs', 'outbox_events', 'consumer_ledger');
  if count_of <> 3 then
    raise exception 'batch 050 declares three unique constraints across its three tables and the catalog holds %', count_of;
  end if;

  -- §3.2: "Append-only event/attempt/ledger ปริมาณสูง: bigint generated always as identity".
  -- ALWAYS and not BY DEFAULT — `attidentity` is 'a' for the first and 'd' for the second — because
  -- under BY DEFAULT a writer may supply its own position in an ordered log, and the outbox's id IS
  -- the relay's cursor.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attname = 'id'
   where n.nspname = 'app'
     and c.relname in ('outbox_events', 'consumer_ledger')
     and (a.attidentity <> 'a' or format_type(a.atttypid, a.atttypmod) <> 'bigint');
  if offending is not null then
    raise exception 'an append-only table in the async kernel does not key on a bigint GENERATED ALWAYS AS IDENTITY: %', offending;
  end if;

  -- `anon` holds nothing on anything this batch creates. RFC-2026-021 §7/4 decided that as a
  -- NEGATIVE — "a negative is the strongest thing a lint can hold" (RFC-2026-019 §5) — and it is
  -- the one client-role property no approved decision is expected to move: the RFC says reversing
  -- it needs an RFC that states what the anonymous surface is for.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('jobs', 'outbox_events', 'consumer_ledger')
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on app.%, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- No policy this batch's tables carry may name an anonymous role. §8.5 gives anonymous no tenant
  -- policy and RFC-2026-021 §7/4 gives it nothing at all. app_worker is deliberately NOT in this
  -- list: RFC-2026-016 §2 positively expects a service policy here once the GUC is decided, and an
  -- apply-time assertion against an approved decision's own direction is the trap 011 set for 021.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('jobs', 'outbox_events', 'consumer_ledger')
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles) and r.rolname = 'anon');
  if offending is not null then
    raise exception 'batch 050 left a policy for the anonymous role: %', offending;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 050 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('jobs', 'outbox_events', 'consumer_ledger')
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020, 021, 030 and 040
  -- ask them: scripts/db/run.mjs holds every tenant table to the ownership rule against the
  -- COMMITTED SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot
  -- describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('jobs', 'outbox_events', 'consumer_ledger')
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 050 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
