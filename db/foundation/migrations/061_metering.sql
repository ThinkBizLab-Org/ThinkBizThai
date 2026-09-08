-- Batch 061 — metering: the usage ledger, the reservation, and the quota bucket.
--
-- Owner: A0/A6 Metering. The migration ownership registry (§6) reserves 061 to this package,
-- describes it as "quota/reservation/usage ledger", and depends it on 050 and 060. §5's inventory
-- names the same family from the other side — "reservations/events/quota buckets", scoped
-- `workspace/business`, mutability "append-only ledger + aggregate", sensitivity FIN-3, retention
-- FINANCE-HISTORY.
--
-- Depends on: 000 (schemas `app` and `private`, private.set_updated_at), 001 (app_worker),
-- 010 (app.workspaces), 011 (app.workspace_member_role), 020 (app.business_profiles and its
-- (workspace_id, id) scope key), 021 (app.member_scope_admits_business). All are merged; migration
-- invariant 1 forbids rewriting any of them and NOTHING BELOW DOES — every statement here creates a
-- new object or attaches a policy to one this file created, and no `drop policy` names a policy
-- another batch wrote. A test asserts that pairing rather than trusting this sentence.
--
-- 050 AND 060 ARE THE REGISTRY'S DECLARED DEPENDENCIES AND NEITHER IS REFERENCED BY A STATEMENT
-- BELOW, which is worth saying because both are consumed as READINGS rather than as objects:
--
--   * 050 settled the shape of an append-only high-volume row in this schema (a `bigint generated
--     always as identity` cursor beside the envelope's own uuid identity), settled that a ledger's
--     natural key carries `workspace_id`, and settled that a ledger does NOT take a foreign key to
--     the thing it records when the two carry different retention classes. All three are used here
--     and none of them is a statement that names 050's tables.
--   * 060 is consumed as a REFUSAL, and this is the dependency a reader is most likely to expect to
--     see and will not find. See the next section.
--
-- 011 AND 021 ARE DEPENDENCIES THE REGISTRY DOES NOT LIST, and saying so is cheaper than letting a
-- reader find them in a predicate. §6 gives 061 "050, 060". The two policies below resolve the
-- caller's role through `app.workspace_member_role` and the caller's Business narrowing through
-- `app.member_scope_admits_business`, which are 011's and 021's. 130 recorded the same about 011:
-- the registry row is not wrong, it predates 011 and 021 being split out.
--
--
-- ============================================================================================
-- WHAT 060 DID NOT CREATE, AND WHY THIS BATCH THEREFORE METERS NOTHING IT CAN JOIN TO
-- ============================================================================================
--
-- This batch was dispatched with the premise that 060 created an AI REQUEST LOG and that a usage
-- event meters a row in it. IT DID NOT. 060_ai_gateway.sql creates `app.ai_models`,
-- `app.ai_model_policies` and `private.ai_credential_references` and says, in terms:
--
--   "GENERATION RUNS ARE NOT CREATED HERE. §6's registry gives batch 060 'model/policy/credential
--    reference' and stops there; no batch in the whole 000-180 registry is given a generation-run
--    table, and 061 (A0/A6 Metering, depends on 050 and 060) is 'quota/reservation/usage ledger',
--    which is metering rather than run history."
--
-- So there is no request log, this batch does not create one either — the registry gives it four
-- words and a run table is none of them (021's refusal, and 060's about the same table) — and the
-- gap is in the REGISTRY. It is recorded in 060's open blockers already and is recorded again here
-- because the second batch to hit it is evidence that the first was not an isolated reading.
--
-- WHAT FOLLOWS FROM THAT, AND IT IS THE THING TWO BATCHES COULD OTHERWISE DISAGREE ABOUT. There is
-- no row for `app.usage_events` to reference and no second definition of a unit of consumption to
-- reconcile against. A unit of consumption is defined in exactly one place — `CTR-USG-001`'s
-- `dimension` (six values) crossed with `quantity.unit` (five values), both from OB-004 — and
-- nothing in 060 defines one at all.
--
-- THE ONE VOCABULARY THE TWO BATCHES BOTH CARRY IS `provider`, AND THEY ARE DELIBERATELY DIFFERENT
-- SETS. 060 constrains `provider` to DEC-014's five AI providers ('openai', 'claude', 'gemini',
-- 'grok', 'openrouter') in two homes and asserts the two CHECKs byte-identical at apply time.
-- `app.usage_events.provider_key` below is a PATTERN and not an enum, for two reasons that are the
-- contract's and the matrix's rather than this batch's taste:
--
--   * `CTR-USG-001` types `attribution.provider_key` as `^[a-z][a-z0-9._-]*$` — a pattern, with no
--     enumeration anywhere in the contract or its manifest.
--   * Four of the contract's six dimensions — `storage_bytes`, `egress_bytes`, `media_processing`
--     and `publish_operation` — are not served by an AI provider at all. Constraining this column to
--     DEC-014's five would make four of six dimensions unrecordable, which is a migration deleting
--     two thirds of a contract's enum by writing a narrower one beside it.
--
-- AND THEREFORE NO FOREIGN KEY FROM `app.usage_events` INTO `app.ai_models`. 060's catalog is a
-- curated MODEL list keyed on (provider, model_key); a usage event names a BILLABLE PROVIDER. A
-- foreign key would require an object-storage egress charge to have a row in the AI model registry.
-- Recorded so that a later reader does not "fix" the difference by narrowing this column into 060's
-- CHECK: the two columns are different sets by their own sources' own definitions, and making them
-- one would be a decision about what may be metered, taken in a constraint.
--
--
-- ============================================================================================
-- THE DESIGN PROBLEM OF THIS BATCH: "APPEND-ONLY LEDGER + AGGREGATE" IS TWO SHAPES
-- ============================================================================================
--
-- §5's mutability column for `metering.core` reads "append-only ledger + aggregate". A ledger that
-- may only be inserted and an aggregate that must move as the ledger grows cannot both be
-- immutable, so four questions have to be answered before a column is written. They are answered
-- here, each from a document, and each is asserted somewhere a build reads.
--
-- 1. WHICH OF THE TWO CARRIES THE TRUTH. THE LEDGER, on three documents that agree:
--
--      §3.2   "Immutable version/evidence/decision/USAGE/audit history: ห้าม update เนื้อหาเดิม"
--      §4/8   "Published Pack/Knowledge/Content version และ Approval/USAGE/Audit history เป็น
--              immutable"
--      §8.4   "Usage ledger INSERT/UPDATE/DELETE | N | N | N | N | N | S/N"
--
--    The matrix row is the sharpest of the three: INSERT is `S` — service only — and UPDATE/DELETE
--    is `N` for every column of the row INCLUDING the service. So `app.usage_events` is append-only
--    in the form this repository has used since 020: no UPDATE or DELETE grant to any role, no
--    UPDATE or DELETE policy for any role, and NO `updated_at` COLUMN AND NO TRIGGER, because an
--    immutable row has no update to stamp. The apply-time block asserts the first two against the
--    live ACL and the live policy catalog rather than against the text of the grants below, which
--    is the "both ways" form — a grant made by a LATER batch would not appear in this file at all.
--
-- 2. WHICH IS DERIVED. THE QUOTA BUCKET. §5's own sentence separates them, and §3.2 and §4/8 name
--    USAGE HISTORY and not an aggregate: an aggregate is not history, it is a statement ABOUT
--    history. So `app.quota_buckets` is mutable, carries `updated_at` and the §3.2 trigger, and is
--    the one table in this batch a client may read (§8.4's "Usage/quota summary SELECT"; see the
--    next section). `app.usage_reservations` is the third shape §5 names and is neither: a
--    reservation is a short-lived operational row whose lifecycle is release-or-consume.
--
-- 3. WHO IS PERMITTED TO MOVE THE DERIVED ONE. NOBODY, TODAY, AND THAT IS A REFUSAL WITH A REASON
--    RATHER THAN AN OMISSION. §8's four matrices contain exactly two metering rows — the summary
--    SELECT and the ledger INSERT/UPDATE/DELETE — and NEITHER is about writing a quota bucket. Where
--    a document is silent the cell is denied, which is 030's reading of the same silence and the one
--    050 and 060 both kept. `app_worker` holds a COLUMN-SCOPED UPDATE on the three derived columns
--    and `updated_at`, and NO POLICY, so `FORCE ROW LEVEL SECURITY` with an empty service policy set
--    refuses it — which is what makes the refusal attributable to row level security rather than to
--    a forgotten GRANT (010's rule, kept by every batch since). The columns that say WHICH bucket a
--    row is — `id`, `workspace_id`, `business_profile_id`, `dimension`, `quantity_unit`,
--    `period_start`, `period_end` — are OUTSIDE that grant, so §8.5's "ห้ามย้าย row ข้าม tenant ด้วย
--    update" holds here by a column list and not by the absence of a verb. That distinction is 060's
--    correction, made after independent review found a comment claiming an absent verb beside a
--    table-wide grant, and it is written this way here because of that finding.
--
--    THE WRITER IS BATCH `132`. §6's registry gives it to A0 Integration + A6, names it
--    "entitlement-metering resolver", and depends it on 061 and 130 — this batch's ledger and 130's
--    published plan. The service identity that would run it does not exist either: `RFC-2026-022`
--    §5/8 records that the only member of `app_worker` is `postgres`, which bypasses row level
--    security, and `RFC-2026-019` §4/3 leaves the connection method open.
--
-- 4. WHAT HAPPENS WHEN THEY DISAGREE. THE LEDGER WINS, BY CONSTRUCTION, AND THIS BATCH WRITES NO
--    RECONCILIATION. There is no trigger on the ledger that maintains the bucket, no materialized
--    view, and no recompute function. That is not caution; it is that a mechanism keeping the two
--    equal would have to decide four things nobody has decided:
--
--      * which events fall in which bucket when an event arrives after its period closed;
--      * whether a `provider_reported` event that supersedes an `estimated` one subtracts the
--        estimate or is added beside it;
--      * whether an expired reservation is released by the sweep or by the next recompute;
--      * whether the bucket is authoritative between recomputes, which is what a caller asking
--        "may I start this work" actually depends on.
--
--    `CTR-USG-001`'s own freeze boundary puts the first two outside itself: "the provider price
--    list, the conversion between currencies, THE RECONCILIATION ALGORITHM (OB-008) and the safe
--    metric-label set (OB-006) are NOT inferred here". §6's registry gives the resolver to `132`.
--    §15 forbids an agent closing an open decision. A trigger here would be this batch writing
--    `132`, in the quietest place available.
--
--    WHAT IS DONE INSTEAD IS TO MAKE THE DISAGREEMENT DETECTABLE RATHER THAN RESOLVABLE.
--    `app.quota_buckets.computed_through` is a WATERMARK: the bucket claims to summarise ledger rows
--    created at or before that instant, and nothing else. With it, "this bucket disagrees with the
--    ledger" is a query anyone can run — sum the ledger over the bucket's own key up to the
--    watermark and compare — and a bucket whose watermark is NULL claims nothing at all rather than
--    claiming zero. Without it a stale bucket and a wrong bucket are indistinguishable, which is the
--    unfalsifiable shape this repository keeps removing. The watermark RECORDS what the derived row
--    covers; it does not compute it, repair it, or decide what happens when it is wrong.
--
--
-- ============================================================================================
-- §8.4's TWO METERING ROWS: ONE IMPLEMENTED, ONE CLASSIFIED AND NOT WRITTEN
-- ============================================================================================
--
--   | Usage/quota summary SELECT       | Y | Y | P | N | N | P |
--   | Usage ledger INSERT/UPDATE/DELETE| N | N | N | N | N | S/N |
--
-- THE SUMMARY SELECT IS IMPLEMENTED ON `app.quota_buckets`, FOR THE OWNER AND THE ADMIN. The
-- aggregate IS the summary: §5 calls the third table of this family "quota buckets" and §8.4 calls
-- the object "usage/quota summary", and a bucket is a consumed total for one tenant, one dimension
-- and one period. Both `Y` cells are unconditional and both are expressible as a predicate row level
-- security can evaluate — `app.workspace_member_role(workspace_id) in ('owner', 'admin')` — which is
-- 130's shape for §8.3's "Billing/subscription SELECT | Y", one matrix section over and on the same
-- sensitivity class.
--
-- WHY THAT IS NOT 050's REFUSAL WEARING A DIFFERENT NAME, since the two rows look alike. §8.4's
-- "Job redacted status SELECT" grants a REDACTED STATUS and the very next row marks the job's own
-- payload `N` for every client role: there, one table carries two objects and a base-table grant
-- hands a client both, which is why 050 refused. Here the two rows are TWO TABLES. The ledger's
-- columns — the cost, the provider, the dedupe key, the superseded estimate — are on
-- `app.usage_events`, which no client role is granted anything on; the summary's columns are on
-- `app.quota_buckets`. There is no column of the bucket that the ledger row would have leaked, and
-- the grant below is column-scoped in any case.
--
-- THE ONE COLUMN OF THE BUCKET A CLIENT DOES NOT GET IS `computed_through`, and it is worth a
-- sentence because it is the only judgement in the grant. It is a statement about the RESOLVER's own
-- progress rather than about what the workspace consumed — the shape §9.1 gives `INTERNAL-3`
-- ("redacted status only") rather than the shape it gives `FIN-3` — and it belongs to `132`. A
-- client reading it would be reading how far behind a job is.
--
-- THIS GRANT JOINS THE LIST `RFC-2026-021` §8.5 EXPECTS TO BE CLOSED, and that is recorded rather
-- than absorbed. §8.5 names the inherited `authenticated` base-table grants in 010, 020 and 021 and
-- says the known-exceptions list must be CLOSED — "any new one fails" — while §10 owes those grants
-- to 170. 030 wrote new ones, 040 wrote new ones, 130 wrote one more, and this batch writes one
-- more; whoever writes that list will enumerate more batches than §8.5 names. It is a DEBT and not a
-- contradiction for the reason 030, 040 and 130 each gave: the grant is COLUMN-SCOPED and bounded by
-- a predicate row level security can express, so a drift reaches one workspace and the isolation
-- suite proves the boundary. The list still does not exist.
--
-- THE EDITOR'S `P` IS REFUSED, for the reason 010, 011, 020, 021 and 030 all gave and `RFC-2026-020`
-- §8 states as an approved decision: "`P` is 'passes per policy/explicit capability' and no document
-- defines the capability set. A helper can resolve a capability only once someone has decided what
-- capabilities exist. Still open, still not an agent's to choose (§15)." Writing `in ('owner',
-- 'admin', 'editor')` would delete the distinction between `Y` and `P` and hand every editor the
-- workspace's spend. The approver's and viewer's `N` are implemented as silence and asserted as zero
-- rows, each paired with a positive so the refusal is a policy and not an empty table.
--
-- THE MEMBER-SCOPE NARROWING IS 021's AND IS RESTRICTIVE, WHICH IS THE ONLY SHAPE THAT CAN SUBTRACT.
-- §8's legend reads `Y` as "ผ่านเมื่อ active + capability + SCOPE ตรง", so an owner or admin who
-- holds a member scope row sees only the Businesses that scope covers. Permissive policies OR
-- together and cannot narrow, so the narrowing is a second policy `AS RESTRICTIVE`, exactly as 021
-- and 040 write theirs, and it calls `app.member_scope_admits_business` — the `Y` form, which is
-- true for a member holding NO scope row (§7: a scope narrows, it does not grant) — rather than
-- `app.member_scope_covers_business`, which would deny every unscoped owner. A NEW SCOPE TEST IS NOT
-- WRITTEN: 021 owns that question and reading `app.workspace_member_scopes` from a policy here would
-- be the coupling `RFC-2026-020` §5/5 forbids.
--
-- THE `business_profile_id is null` BRANCH IS NOT A HOLE, and it is 021's own sentence: "§7's scope
-- types are `all_businesses`, `business` and `page` — every one of them names a Business or a Page —
-- and a WORKSPACE row is not inside any of them". A workspace-level bucket is not inside any scope,
-- so asking the Business question about it would pass NULL and deny everyone including the unscoped,
-- which 040 records as the failure mode of the wrong branch. 130 met the same question and had no
-- branch to write because a subscription has no Business column; this family has one, because §5
-- scopes it `workspace/business` where it scopes `billing.core` `global/workspace`.
--
-- THE LEDGER'S `S` CELL IS CLASSIFIED AND NOT WRITTEN, WHICH IS `RFC-2026-022`'s DECISION AND NOT
-- THIS BATCH'S CHOICE. That RFC is approved (2026-09-08) and its §3 already classifies this cell:
--
--   | Usage ledger INSERT (`S/N`) | `061` | CARRIED | a reservation is made against a known quota |
--
-- CARRIED means the statement's workspace is an INPUT, so a policy `TO app_worker` may compare it
-- against the confinement setting. Applying §3's own operational form to the statement rather than
-- to the family confirms it and gives a stronger reason than the RFC's own: add `and workspace_id =
-- (select nullif(current_setting('app.workspace_id', true), '')::uuid)` to the INSERT's `WITH CHECK`
-- and the statement still writes the same row, because `CTR-USG-001` makes `attribution.workspace_id`
-- a REQUIRED property of the envelope and `dedupe_key` carries it as the key's second segment. The
-- workspace is not something inserting the row discovers; it is something the row already says twice.
--
-- **THE POLICY IS NOT WRITTEN, AND THAT IS THE DECISION IN EFFECT RATHER THAN A DEFERRAL.**
-- `RFC-2026-022`'s own Status line: "NOT IN EFFECT until §7 holds: the only member of `app_worker`
-- today is `postgres`, which bypasses RLS", and §5/8 says a policy `TO app_worker` written today "is
-- unreachable except from an identity for which it is moot". So this batch does what the RFC leaves
-- a batch to do — it records the classification as DATA, in
-- `db/foundation/lint/service-policy-map.json`, which §7.2 makes the answer to "which shape does
-- this cell take" and which `scripts/db/run.mjs` reads in both directions.
--
-- AND THE CONFINEMENT TERM IS NOT A TENANT BOUNDARY, WHICH NOTHING IN THIS FILE, IN THE MAP OR IN
-- THE ISOLATION SUITE MAY SAY IT IS. `RFC-2026-022` §5/4, measured twice: the role the policy names
-- can set the setting the policy reads, and `has_parameter_privilege` cannot even be asked who may.
-- What the term is worth is that it confines ONE TRANSACTION to ONE TENANT, catching a worker
-- processing tenant A's job that computes tenant B's `workspace_id` for a row. That is a containment
-- control against defects in the service's own code. It is worth having and it is not isolation, and
-- the RFC forbids any document, test or assertion from citing it as the latter.
--
-- §8.4's UPDATE/DELETE HALF IS `N` FOR THE SERVICE TOO, so the map carries ONE entry and not three:
-- the `S` is on the INSERT alone. There is no entry for `app.usage_reservations` or for
-- `app.quota_buckets` either, and the absence is the same finding as everywhere else in this file —
-- §8 has no row for either table, so there is no cell to classify, and inventing a `cell` value for
-- the map would be a claim about the access matrix made in a lint file.
--
--
-- ============================================================================================
-- HOW THE LEDGER'S COLUMNS ARE DERIVED, WHICH IS FROM A CONTRACT AND NOT FROM A GUESS
-- ============================================================================================
--
-- `CTR-USG-001` — "Usage and Cost Event", `contract-catalog/shared-kernel/ctr-usg-001/`, version
-- 1.0.0, status **Draft**, owner **A0+A6** — names every field of a usage event with types, bounds,
-- patterns and an `x-source` on each. `CONTRIBUTING_AGENTS.md`'s conflict order puts the Contract
-- Catalog at position 2 and this repository's data package at 4, so where the two differ the
-- contract decides and the divergence is DECLARED rather than quiet. That is 140's treatment of
-- `CTR-AUD-001`, whose owner is the same pair, and its sentence applies here unchanged: **A0 and A6
-- own `CTR-USG-001` and should countersign this reading before its freeze; if the contract moves,
-- the forward fix is a new batch in this family's range, never an edit to 061.**
--
-- `app.usage_events` carries EXACTLY `CTR-USG-001`'s own properties, with `tenant_context` resolved
-- to §3.3's canonical `workspace_id` and `business_profile_id` (050's resolution) and the nested
-- `quantity`, `attribution` and `cost` objects flattened to the columns they contain. FOUR
-- DIVERGENCES, each named here rather than left for a reviewer to find:
--
--   1. `usage_id` IS A `uuid` AND IS NOT THE PRIMARY KEY. The contract types it `string, minLength
--      1`; §3.2 requires a uuid for an identity of this kind and 050 resolved the identical
--      disagreement on `CTR-JOB-001`'s `job_id` the same way — a uuid's 36 characters satisfy the
--      contract, and a `text` column would let a producer choose a 128-character key. The PRIMARY KEY
--      is a `bigint generated always as identity`, because §3.2's second identifier rule is
--      "Append-only event/attempt/ledger ปริมาณสูง: `bigint generated always as identity`" and a
--      usage ledger is that row. This is 050's outbox shape and it is two answers to two questions,
--      not two sources of truth for one fact: `id` is the ORDER rows became visible, which is what a
--      recompute reading "everything after position N" needs and what a uuid cannot express, and
--      `usage_id` is the envelope's identity, which is `ID-002`'s redelivery key and what
--      `cost.supersedes_usage_id` points at. `ALWAYS` and not `BY DEFAULT`, asserted from
--      `pg_attribute.attidentity`, because under `BY DEFAULT` a producer may choose its own position
--      in an ordered log.
--
--   2. `cost_amount` IS `numeric(18,6)` AND THE CONTRACT PERMITS MORE. `cost.amount`'s pattern
--      admits sixteen integer digits and two to eight fraction digits; §3.2 fixes money as
--      "`numeric(18,6)` + ISO-4217 currency; ห้าม float" and 130 stores money that way with an
--      apply-time assertion of the declared type. A second money scale in one schema is worse than a
--      store that refuses the contract's widest values: two `FIN-3` families whose amounts round
--      differently cannot be added together, and the addition is what `132` and `131` both do.
--      DECLARED TO `CTR-USG-001`'s OWNERS: an amount with seven or eight fraction digits, or with
--      more than twelve integer digits, validates on the wire and is refused by this store.
--
--   3. `quantity_amount` IS `numeric(24,8)` AND §3.2 SAYS `bigint`. §3.2's own list reads
--      "Byte/token/operation: `bigint`" and the contract's `quantity.amount` admits eight fraction
--      digits — irreconcilably, for `media_processing` measured in seconds and for any fractional
--      token count. The conflict order decides it: the contract is at position 2 and the data package
--      at 4, so the column is the contract's `numeric(24,8)` (sixteen integer digits, eight
--      fraction). NO CHECK FORBIDS A FRACTION ON A `token`, `byte` OR `operation` UNIT, and that
--      restraint is 050's rule rather than an oversight: "a CHECK enforcing a bound the contract does
--      not state would make the database stricter than the wire and reject envelopes the schema
--      accepts". Reported to A0+A6 with the other three.
--
--   4. THERE IS NO `metric_labels` COLUMN AND THE CONTRACT HAS NO SUCH FIELD, which is recorded
--      because a reader coming from the Decision Register will look for one. `CTR-USG-001`'s freeze
--      boundary records that it was REMOVED — "Decision Register 5.2 assigns bounded cardinality to
--      the `CTR-OBS-001` row, not to this one" — and §5's own rule forbids a column called
--      "metadata", "config", "payload" or "JSON" without a JSON Schema version, a maximum size,
--      prohibited fields and an owner. There is nothing to store and nothing to name.
--
-- TWO RULES THE CONTRACT STATES AND ITS OWN VALIDATOR CANNOT ENFORCE ARE ENFORCED HERE, WHICH IS
-- WHAT A STORE IS FOR. `CTR-USG-001`'s `untestable_by_schema` names both, and 140 established the
-- precedent by turning two of `CTR-AUD-001`'s `allOf` rules into named CHECK constraints:
--
--   * "a document whose `cost.supersedes_usage_id` equals its own `usage_id` VALIDATES" —
--     `usage_events_supersedes_is_not_self` refuses it.
--   * "nothing here stops two events superseding one estimate" —
--     `usage_events_supersedes_at_most_once` is a partial unique index that does.
--
-- AND ONE MORE THE CONTRACT CALLS A RESOLVER OBLIGATION: "DEDUPE KEY AGREEMENT: the key's shape is
-- pattern-checked, but that its workspace, job, dimension, basis and instant parts MATCH this
-- document's own fields cannot be expressed here." Five of those six parts CAN be expressed in a
-- store, and `usage_events_dedupe_key_names_its_row` expresses them with `starts_with`, which does no
-- pattern interpretation — `like` would have been wrong, because `_` is a LIKE wildcard and four of
-- the six dimension values contain one. THE SIXTH PART, THE INSTANT, IS THE ONE THIS STORE CANNOT
-- CHECK, and the reason is worth writing down rather than leaving as an absence: rendering
-- `occurred_at` into the key's `YYYYMMDDTHHMMSS[fraction]Z` form needs `to_char`, which is STABLE
-- because it reads `TimeZone`, and the contract's fraction rule ("carried as its digits with no
-- trailing zeros, and omitted entirely when zero") has no total function in this dialect. So the
-- instant segment stays a producer obligation, and this file says which segment rather than implying
-- all six are checked.
--
--
-- ============================================================================================
-- WHAT IS NOT HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO FIND
-- ============================================================================================
--
--   * NO FOREIGN KEY ON `app.usage_events`, ON EITHER SCOPE COLUMN OR ON `job_id`. Every other
--     tenant table in this schema references its parent over the whole scope path and §3.3 asks for
--     it, so this is a departure and it is 140's, one family over. §11.4's REQUIRED ORDER purges
--     tenant content in step 7 and "anonymize/RETAIN finance, audit, security minimum required
--     records" in step 8, and §10's `FINANCE-HISTORY` row says "7 ปี engineering default ... not
--     erased if legal basis requires". A ledger row that must outlive the Workspace and the Business
--     it names cannot be constrained by them in either direction: either the usage row blocks a
--     closure the same document orders, or the closure deletes a record §11.4 says to retain.
--     `job_id` is refused for a second reason as well as that one, and it is 050's own: §10 gives
--     `JOB-SHORT` thirty days for a success and ninety for a failure while this family has seven
--     years, and "a foreign key would make the ledger row die with the event it dedupes".
--
--     THE COST, STATED RATHER THAN ABSORBED: a usage event naming a Business that belongs to a
--     different Workspace is refused by nothing in this schema and cannot be. §4 invariant 10 admits
--     exactly that outcome in its own words — "ต้อง fail ที่ DB หรือ command boundary" — and the
--     command boundary is where it is refused: `CTR-USG-001` composes `CTR-TEN-001`, whose trust
--     boundary reads "Server-resolved only after membership and Workspace→Business→Page relation
--     validation; client-supplied context is untrusted input". It is also why this batch writes no
--     `rejected` isolation case for the ledger — there is no constraint for one to be about, and a
--     case demanding an outcome a correct database cannot produce would be the suite claiming a
--     control nobody built (140's sentence, unchanged).
--
--   * AND THEREFORE THE OTHER TWO TABLES DO CARRY §3.3's COMPOSITE FOREIGN KEY, which is the half of
--     that decision a reader should press on. A reservation expires and a quota bucket is
--     recomputable; neither is a "minimum required record" §11.4 step 8 retains, so neither has the
--     ledger's reason and both take the constraint. That is the split: THE ROW THAT OUTLIVES THE
--     TENANT CANNOT BE CONSTRAINED BY IT, AND THE ROWS THAT DO NOT, ARE.
--
--   * NO `limit`, `allowance` OR `entitlement` COLUMN ON `app.quota_buckets`. A bucket records
--     CONSUMPTION and not ALLOWANCE. What a plan grants is `app.plan_entitlements`, which 130
--     created and calls a "versioned contract"; what a WORKSPACE is entitled to is
--     `app.workspace_entitlements`, which §5.1 of the billing contract describes and §6's registry
--     gives to `132` — and 130 declined to create it for exactly this reason, that "a recomputable
--     projection created by the batch that owns its inputs would be a second source of truth for a
--     value 132 exists to derive". A limit column here would be that same second source, on the
--     other side of the join. `OPEN-004`'s "max budget", which 060 handed forward to this batch, is
--     an allowance and is therefore not a column here either; it is also OPEN, and §15 forbids an
--     agent closing it.
--
--   * NO `status` ON A RESERVATION, AND NO LIFECYCLE VOCABULARY ANYWHERE IN THIS BATCH. §3.2 makes a
--     Phase 1 state `text` + a named CHECK whose values change only by migration, which is a rule
--     about HOW a state is stored once somebody with the authority has decided what the states ARE.
--     No document enumerates a reservation's states. So the lifecycle is the timestamps and the one
--     nullable reference the row already has to carry — 010's refusal for an invitation, 021's for a
--     member scope, 050's for a job — and "open" is `released_at is null and consumed_usage_id is
--     null and expires_at > now()`, which is a QUERY a reader can disagree with rather than four
--     words this repository's source of truth never wrote.
--
--   * NO IDEMPOTENCY KEY ON A RESERVATION, which is a real gap and is named. `CTR-USG-001` composes a
--     `dedupe_key` for a usage EVENT with six segments and four rounds of co-owner review behind it,
--     and names nothing at all for a reservation. The obvious invention — `unique (workspace_id,
--     job_id, dimension)` — is refused by the contract's own text: "a job that makes two AI calls
--     emits two real measurements", and "nothing in the baseline says a job emits one usage event per
--     dimension, and this contract does not assert one". A reservation per measurement is therefore
--     the right cardinality and a natural key would be the wrong one. Owed to `CTR-USG-001`'s owners
--     and to the command surface.
--
--   * NO RESERVATION EXPIRY LENGTH. `expires_at` is `not null` with no default and no arithmetic
--     anywhere in this file: a reservation that never expires is a permanent hold on quota taken by
--     work that may have crashed, so the COLUMN is required; the NUMBER is a policy. 010 required
--     `expires_at` on an invitation the same way and refused to write `30` into a default because it
--     would read as ratifying `DATA-DEC-04`, and 130 refused to write `BILL-DEC-012`'s seven days
--     into a `grace_expires_at` default for the same reason.
--
--   * NO FOREIGN KEY FROM `app.usage_reservations.consumed_usage_id` INTO `app.usage_events`, AND
--     NONE FROM `app.usage_events.supersedes_usage_id` INTO ITSELF. The second is the interesting
--     one. A self-referencing foreign key would enforce the property `CTR-USG-001`'s
--     `untestable_by_fixture` says it wants — that a superseding event points at an event that
--     EXISTS — and it would do it by refusing a `provider_reported` correction that arrives before
--     the `estimated` row it corrects. Nothing in OB-008 or in the contract states a delivery order,
--     and the ledger is APPEND-ONLY, so a refused row is a lost measurement rather than a retryable
--     one. The uniqueness half needs no ordering assumption and IS enforced, above. The existence
--     half is owed to OB-008's reconciliation harness, which the contract itself says is where it
--     belongs.
--
--   * NO RETENTION WINDOW ENCODED. §5 assigns `FINANCE-HISTORY`, which §10 DOES define — "7 ปี
--     engineering default subject to Thai tax/legal review" — so this batch is in 130's position
--     rather than 030's: it has a number and refuses it. §10's own header requires
--     Product/Security/Legal approval before Paid Beta, `BILL-OQ-10` ("Billing data retention ไทย")
--     is OPEN with a Legal/Accounting/DPO owner, and batch 160 owns the retention job. A "7 years"
--     written into a constraint would read as ratified (§15). What this batch provides instead is the
--     COLUMN each sweep would read and an index over it, which is 010's treatment of `expires_at`
--     and 050's of `consumed_at`.
--
--     AND ONE CONTRADICTION THIS FAMILY INHERITS FROM 140's, recorded rather than resolved: §10's
--     `FINANCE-HISTORY` row prescribes "anonymize nonrequired PII; retain ledger integrity", and
--     every anonymization is an UPDATE that §8.4 grants nobody — `N` in all six columns. Batch 160
--     cannot fix that with a grant on `app.usage_events`, because the absence of the verb is what
--     makes the ledger a ledger. It is a smaller version of the contradiction 140 recorded, and it is
--     smaller for a good reason: this family stores NO PII. Its actor is a `job_id`, its subject is a
--     workspace and a provider key, and there is no `created_by` — so "anonymize nonrequired PII"
--     has nothing on these three tables to act on. Owed to §10's own approval and to `DATA-DEC-06`.
--
--   * NO `created_by` / `updated_by`, ON ANY OF THE THREE. §3.2: "ทุก mutable row: `created_at`,
--     `updated_at`; USER MUTATION เพิ่ม `created_by`, `updated_by`" — the actor columns follow a user
--     mutation. §8.4 gives no client any write on any table in this family, so there is no user
--     mutation to attribute and the columns would be nullable uuids nothing writes. That is 030's and
--     050's reading, and it has a consequence stated rather than absorbed: §8.6 case 8 (forged
--     `created_by`) IS NOT APPLICABLE to this family, because there is no such column and no client
--     INSERT to forge it on. `CTR-USG-001`'s attribution names a job and a provider, not a person.
--
--   * NO COMMAND FUNCTION AND NO `app_command` GRANT ANYWHERE IN THIS BATCH. `RFC-2026-012` §4 names
--     `SECURITY DEFINER` command functions as the mechanism and `RFC-2026-021` §10 records that none
--     exists. The consequence is the one 050 stated about its outbox and it is true of all three
--     tables here: they are correctly shaped and have no writer, and the writer is a decision with an
--     owner rather than a column somebody forgot.
--
--   * NOTHING ABOUT WORKSPACE LIFECYCLE VISIBILITY. Unchanged from 020's, 030's, 040's and 130's
--     headers: a member of an `access_blocked` workspace can still read the rows the policy below
--     admits, because reading `app.workspaces.lifecycle_state` from a policy needs either the
--     coupling 020 rejects or a helper grant `RFC-2026-020` §6.1/6 pins shut. §11.4 step 2 ("stop new
--     jobs/publish") is an operation on this family from the other side and is a command-path
--     obligation rather than a predicate. Owed to an RFC plus batch 170.


-- ---------------------------------------------------------------------------------------------
-- app.usage_events — the ledger. One row per measurement. Append-only, and the truth.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` and `business_profile_id` (§3.3), the second nullable because
-- `CTR-USG-001` makes `attribution.business_profile_id` conditional and §5 scopes this family
-- `workspace/business` rather than requiring a Business of every row. Sensitivity FIN-3; retention
-- FINANCE-HISTORY. Every column except the two scope columns and `created_at` is a property
-- `CTR-USG-001` names, and the CHECK beside it is that property's own constraint.
--
-- IMMUTABLE, expressed the way 020, 030, 040, 050, 130 and 140 express it and one way more: no
-- UPDATE or DELETE grant to any role, no UPDATE or DELETE policy for any role, no `updated_at`
-- column, and no trigger. The apply-time block asserts the first two against the live catalog rather
-- than against the grants below.
create table if not exists app.usage_events (
  -- §3.2's second identifier rule, and 050's outbox shape: the ORDER rows became visible, which is
  -- the cursor a recompute reads and what a uuid cannot express.
  id                   bigint generated always as identity primary key,
  -- CTR-USG-001's `usage_id`: the envelope's identity, ID-002's redelivery key, and what
  -- `supersedes_usage_id` points at. A uuid for the reason app.jobs.id is one (§3.2).
  usage_id             uuid        not null default gen_random_uuid(),
  -- CTR-USG-001: "the instant the measurement was TAKEN, stamped once and reused verbatim on every
  -- re-emission of that measurement". Distinct from `created_at`, which is when this row landed; a
  -- producer that re-stamps on re-emission produces a different dedupe_key for one measurement and
  -- the contract's own rule then sums it twice.
  occurred_at          timestamptz not null,
  dimension            text        not null,
  quantity_amount      numeric(24,8) not null,
  quantity_unit        text        not null,
  workspace_id         uuid        not null,
  business_profile_id  uuid,
  -- CTR-USG-001's `attribution.job_id`, REQUIRED. Not FK-constrained: see the header — JOB-SHORT is
  -- thirty days and FINANCE-HISTORY is seven years.
  job_id               uuid        not null,
  provider_key         text        not null,
  cost_amount          numeric(18,6) not null,
  cost_currency        text        not null,
  cost_basis           text        not null,
  supersedes_usage_id  uuid,
  dedupe_key           text        not null,
  created_at           timestamptz not null default now(),
  -- The contract's six dimensions, verbatim, as text + a named CHECK (§3.2). The same list appears
  -- twice more in this file, on the reservation and on the bucket, and the apply-time block requires
  -- all three deparsed definitions to be IDENTICAL — 060's shape for a vocabulary with more than one
  -- home, extended from two homes to three.
  constraint usage_events_dimension_known
    check (dimension in ('ai_tokens', 'research_search', 'storage_bytes', 'egress_bytes',
                         'media_processing', 'publish_operation')),
  -- The contract's five units, same treatment, same three homes.
  constraint usage_events_quantity_unit_known
    check (quantity_unit in ('token', 'request', 'byte', 'second', 'operation')),
  -- CTR-USG-001's quantity pattern admits no sign, so a negative quantity is a value the wire
  -- cannot carry and the store must not hold.
  constraint usage_events_quantity_not_negative check (quantity_amount >= 0),
  -- CTR-USG-001's cost pattern admits NO SIGN either, and its own note says why in terms: "an
  -- earlier draft allowed `-`, which would have materialized an explicitly OPEN decision -- NG-006
  -- marks automated refund a non-goal, OPEN-001 leaves refund policy to Product and an accountant,
  -- and BILL-DEC-013 is Proposed. A credit must not enter this contract before that decision." A
  -- store that accepted a negative amount would be that decision arriving through a column.
  constraint usage_events_cost_not_negative check (cost_amount >= 0),
  constraint usage_events_cost_currency_known check (cost_currency in ('THB', 'USD')),
  constraint usage_events_cost_basis_known check (cost_basis in ('provider_reported', 'estimated')),
  -- CTR-USG-001's `attribution.provider_key` pattern, character for character. NOT DEC-014's five
  -- providers: the header says why at length, and the short form is that four of the six dimensions
  -- above are not served by an AI provider.
  constraint usage_events_provider_key_form check (provider_key ~ '^[a-z][a-z0-9._-]*$'),
  constraint usage_events_dedupe_key_bounded check (length(dedupe_key) between 1 and 512),
  -- CTR-USG-001's `dedupe_key` pattern, character for character including its non-capturing groups.
  constraint usage_events_dedupe_key_form check (
    dedupe_key ~ '^usg:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:(ai_tokens|research_search|storage_bytes|egress_bytes|media_processing|publish_operation):(provider_reported|estimated):[0-9]{8}T[0-9]{6}(?:[0-9]{1,6})?Z$'),
  -- THE RESOLVER OBLIGATION THE CONTRACT SAYS ITS VALIDATOR CANNOT EXPRESS, expressed. Five of the
  -- key's six segments are the row's own columns and this is that sentence as a constraint.
  -- `starts_with` rather than `like`: LIKE would read the `_` in `ai_tokens`, `research_search`,
  -- `storage_bytes`, `egress_bytes`, `media_processing`, `publish_operation` and
  -- `provider_reported` as a single-character wildcard, so `like` would accept a key whose dimension
  -- segment is not the row's dimension. The sixth segment is the instant, and the header says why no
  -- constraint in this dialect can check it.
  constraint usage_events_dedupe_key_names_its_row check (
    starts_with(dedupe_key,
      'usg:' || workspace_id::text || ':' || job_id::text || ':' || dimension || ':' || cost_basis || ':')),
  -- CTR-USG-001 untestable_by_schema (2): "a document whose `cost.supersedes_usage_id` equals its
  -- own `usage_id` VALIDATES". An event that supersedes itself is a correction of nothing that a
  -- reconciliation would then count as a correction of something.
  constraint usage_events_supersedes_is_not_self
    check (supersedes_usage_id is null or supersedes_usage_id <> usage_id),
  -- The envelope's identity is unique across the table rather than per workspace, for 050's reason
  -- about an event id: two workspaces producing the same id would be a generator collision rather
  -- than a namespace. It is also ID-002's redelivery key, and a redelivery key unique only within a
  -- tenant is not one.
  constraint usage_events_usage_id_unique unique (usage_id),
  -- THE NATURAL KEY, WORKSPACE-SCOPED, AND THE THIRD TERM IS THE ONE TO PRESS ON. The key already
  -- CONTAINS the workspace as its second segment, so a global unique constraint looks sufficient —
  -- and the contract itself says why it is not: "that the key's parts MATCH this document's own
  -- fields cannot be expressed here", so a producer can compose a key naming the wrong workspace.
  -- Keyed globally, one tenant's malformed key would suppress another tenant's real measurement and
  -- a conflicting insert would report that another tenant's key exists. CTR-IDM-001 makes workspace
  -- part of an idempotency key's scope by contract and §11.1/9 states the principle: a retry that is
  -- idempotent does not produce something that reaches across scope. The constraint above closes the
  -- same hole from the other side; both are here because either alone leaves half of it open.
  constraint usage_events_dedupe_key_unique unique (workspace_id, dedupe_key)
);

comment on table app.usage_events is
  'Owner: A0/A6 Metering (metering.core, batch 061). Canonical scope workspace_id and the nullable '
  'business_profile_id (§3.3) — §5 scopes this family workspace/business and CTR-USG-001 makes '
  'attribution.business_profile_id conditional. Sensitivity FIN-3; retention FINANCE-HISTORY, whose '
  'seven years are NOT encoded here (§10 owns the number, batch 160 owns the sweep). Columns are '
  'CTR-USG-001''s own properties with tenant_context resolved to §3.3''s canonical names and the '
  'nested quantity/attribution/cost objects flattened; four divergences from that Draft contract are '
  'declared in the migration header and are owed to its owners, A0+A6. APPEND-ONLY and the TRUTH of '
  'this family: §3.2, §4 invariant 8 and §8.4 all make usage history immutable, so no role holds '
  'UPDATE or DELETE — as an absent grant AND an absent policy, asserted both ways — and there is no '
  'updated_at. NO client role holds any privilege: §8.4''s client cells are about the SUMMARY, which '
  'is app.quota_buckets. NO POLICY AT ALL: §8.4''s "Usage ledger INSERT" is the `S` cell, '
  'RFC-2026-022 §3 classes it CARRIED, and that decision is APPROVED AND NOT IN EFFECT — so the cell '
  'is recorded in db/foundation/lint/service-policy-map.json and no service policy is written. It '
  'carries NO foreign key on any column, because §11.4 purges tenant content in step 7 and retains '
  'finance records in step 8, and a ledger row that must outlive what it names cannot be constrained '
  'by it.';
comment on column app.usage_events.id is
  'FIN-3. §3.2''s "Append-only event/attempt/ledger ปริมาณสูง: bigint generated always as identity", '
  'and 050''s outbox shape: this is the ORDER rows became visible, which is the cursor a recompute '
  'reads. ALWAYS rather than BY DEFAULT — under BY DEFAULT a producer could choose its own position '
  'in an ordered log — and the apply-time block asserts it from pg_attribute.attidentity.';
comment on column app.usage_events.usage_id is
  'FIN-3. CTR-USG-001''s required identity, as a uuid for the reason app.jobs.id is one (§3.2 vs a '
  'string(1..128) the contract types it as; 36 characters satisfy both). It is ID-002''s redelivery '
  'key and what supersedes_usage_id points at. The bigint above ORDERS and this IDENTIFIES; neither '
  'can stand in for the other.';
comment on column app.usage_events.occurred_at is
  'FIN-3. CTR-USG-001: the instant the measurement was TAKEN, stamped once and reused verbatim on '
  'every re-emission. Distinct from created_at, which is when the row landed. The contract records '
  'the hazard in both directions: two measurements stamped with one instant collide and one is '
  'under-counted, and one measurement re-stamped on re-emission carries a different dedupe_key and '
  'is summed twice. Both are producer obligations and neither is checkable here.';
comment on column app.usage_events.workspace_id is
  'FIN-3. The canonical tenant scope, and the column a CARRIED service policy would compare against '
  'the confinement setting if one could be written (RFC-2026-022 §3 and §5/2; the decision is NOT IN '
  'EFFECT and the classification is in db/foundation/lint/service-policy-map.json). NOT '
  'FK-constrained: §11.4 step 8 retains finance records after step 7 has purged the tenant''s '
  'content, and a foreign key makes those two steps contradict.';
comment on column app.usage_events.business_profile_id is
  'FIN-3. The optional Business attribution CTR-USG-001 makes conditional and §5 scopes this family '
  'for. NOT FK-constrained, for the same reason as workspace_id — which means a Business of another '
  'Workspace is refused by the command boundary and by nothing in this schema (§4 invariant 10 '
  'admits that outcome in its own words). app.quota_buckets and app.usage_reservations DO carry the '
  'composite key, because neither outlives the tenant.';
comment on column app.usage_events.job_id is
  'FIN-3. CTR-USG-001''s attribution.job_id, required, and the column OB-004''s acceptance '
  '("workspace/business/job/provider attribution ครบ") is answered from. Not a foreign key into '
  'app.jobs: §10 gives JOB-SHORT thirty days and this family seven years, which is 050''s own reason '
  'for keeping its consumer ledger free of one.';
comment on column app.usage_events.provider_key is
  'FIN-3. CTR-USG-001''s pattern, not DEC-014''s five AI providers: four of the six dimensions above '
  'are not served by an AI provider, so 060''s enum would make them unrecordable. The two vocabularies '
  'are different sets by their own sources'' definitions and must not be merged.';
comment on column app.usage_events.cost_amount is
  'FIN-3. Money: numeric(18,6) by §3.2, which is NARROWER than CTR-USG-001''s pattern (sixteen '
  'integer digits, two to eight fraction digits). Declared in the header and owed to A0+A6: a second '
  'money scale beside 130''s numeric(18,6) would make two FIN-3 families whose amounts round '
  'differently, and adding them is what 131 and 132 do. NO SIGN is permitted, because the contract '
  'permits none and a credit is BILL-DEC-013, which is Proposed.';
comment on column app.usage_events.dedupe_key is
  'FIN-3. CTR-USG-001''s key, which identifies ONE MEASUREMENT — two events carrying it are one '
  'measurement seen twice, and two measurements of the same job and dimension at different instants '
  'carry different keys and are SUMMED. Unique per WORKSPACE rather than globally, and separately '
  'CONSTRAINED to start with this row''s own workspace, job, dimension and basis: the contract says '
  'that agreement "cannot be expressed here" and is a resolver obligation, and five of the six '
  'segments can be expressed in a store.';
comment on column app.usage_events.supersedes_usage_id is
  'FIN-3. CTR-USG-001''s OB-008 reconciliation field: a provider statement replacing an estimate. '
  'Not a foreign key into this table''s own usage_id, because that would refuse a correction that '
  'arrives before the estimate it corrects and an append-only ledger has no retry for a refused row. '
  'What IS enforced is the pair the contract says its validator cannot express: it may not name this '
  'row, and no two rows may name the same estimate.';


-- ---------------------------------------------------------------------------------------------
-- app.usage_reservations — a hold taken against a quota before the work that will consume it.
-- ---------------------------------------------------------------------------------------------
--
-- §5 names "reservations" first in this family's list and §6's registry names "reservation" among
-- the batch's four words, so the table is created for the reason 021 gives for not creating one it
-- was not given: a registry row is what reserves a table. NO DOCUMENT NAMES A COLUMN OF IT, and
-- `CTR-USG-001` describes the EVENT rather than the hold, so every column below is either §3.3's,
-- §3.2's, or one of the four the contract already fixes for the measurement this hold will become.
--
-- Canonical scope `workspace_id` and the nullable `business_profile_id` (§3.3), tied to the Business
-- by §3.3's composite foreign key over the whole scope path. MATCH SIMPLE — the default — skips the
-- key when the Business is null, which is what makes a workspace-level hold legal; when it is set,
-- the key forces it to be a Business of THAT Workspace, which is §4 invariant 10 as a constraint
-- rather than as a convention (040's sentence about its own nullable override).
--
-- Sensitivity FIN-3; retention FINANCE-HISTORY, whose number is not encoded (header).
create table if not exists app.usage_reservations (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid        not null references app.workspaces (id),
  business_profile_id  uuid,
  dimension            text        not null,
  quantity_amount      numeric(24,8) not null,
  quantity_unit        text        not null,
  -- The same attribution the measurement will carry, so a hold and the event that consumes it are
  -- about the same unit of work. CTR-USG-001 makes attribution.job_id required of the event.
  job_id               uuid        not null,
  reserved_at          timestamptz not null default now(),
  -- REQUIRED, with no default and no arithmetic: a hold that never expires is quota taken by work
  -- that may have crashed, so the column is owed; the LENGTH is a policy nobody has written.
  expires_at           timestamptz not null,
  released_at          timestamptz,
  -- The usage event that consumed this hold, by CTR-USG-001's own identity. Not FK-constrained, for
  -- the reason app.usage_events carries no foreign keys at all.
  consumed_usage_id    uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- Second of the vocabulary's three homes; the apply-time block requires all three definitions to
  -- be identical.
  constraint usage_reservations_dimension_known
    check (dimension in ('ai_tokens', 'research_search', 'storage_bytes', 'egress_bytes',
                         'media_processing', 'publish_operation')),
  constraint usage_reservations_quantity_unit_known
    check (quantity_unit in ('token', 'request', 'byte', 'second', 'operation')),
  -- STRICTLY positive, unlike the ledger's. A measurement of zero is a fact; a hold of zero is a row
  -- that reserves nothing and would still occupy the aggregate's arithmetic.
  constraint usage_reservations_quantity_positive check (quantity_amount > 0),
  constraint usage_reservations_expiry_after_reservation check (expires_at > reserved_at),
  -- A hold ends ONE way. Released and consumed at once is a state whose meaning nothing could
  -- resolve, and it is the only lifecycle rule this batch is entitled to state, because it follows
  -- from the two columns rather than from a vocabulary somebody would have to choose.
  constraint usage_reservations_one_outcome
    check (released_at is null or consumed_usage_id is null),
  -- §3.3's composite foreign key into the Business, over the whole scope path.
  constraint usage_reservations_business_scope_fk
    foreign key (workspace_id, business_profile_id)
    references app.business_profiles (workspace_id, id)
);

comment on table app.usage_reservations is
  'Owner: A0/A6 Metering (metering.core, batch 061). Canonical scope workspace_id and the nullable '
  'business_profile_id (§3.3), tied to the Business by a composite foreign key over the whole scope '
  'path. Sensitivity FIN-3; retention FINANCE-HISTORY. A hold taken against a quota before the work '
  'that will consume it: §5 names "reservations" and §6''s registry names "reservation", and no '
  'document names a column of one, so every column here is §3.2''s, §3.3''s or one CTR-USG-001 fixes '
  'for the measurement the hold becomes. NO status column — the lifecycle is timestamps plus one '
  'nullable reference, which is 010''s refusal to invent a vocabulary, and "open" is a query. §8 has '
  'NO ROW for a reservation in any of its four matrices, so there is no cell to implement and every '
  'operation is denied by default (030''s reading of the same silence); no client role holds any '
  'privilege and no policy is written. app_worker holds column-scoped grants and no policy, so its '
  'denial is attributable to row level security.';
comment on column app.usage_reservations.workspace_id is
  'FIN-3. The canonical tenant scope. Unlike app.usage_events this table DOES carry the foreign key: '
  'a hold expires and is not a "minimum required record" §11.4 step 8 retains, so it has none of the '
  'ledger''s reason to outlive the tenant it belongs to.';
comment on column app.usage_reservations.expires_at is
  'FIN-3. Required, with no default: a hold that never expires is quota taken by work that may have '
  'crashed. The LENGTH is a policy — 010 refused to write DATA-DEC-04''s number into a default and '
  '130 refused BILL-DEC-012''s, and this is the same refusal.';
comment on column app.usage_reservations.consumed_usage_id is
  'FIN-3. CTR-USG-001''s usage_id of the event that consumed this hold. Not FK-constrained, for the '
  'reason app.usage_events carries no foreign keys at all (§11.4 steps 7 and 8).';


-- ---------------------------------------------------------------------------------------------
-- app.quota_buckets — the aggregate. Derived from the ledger, and never the truth.
-- ---------------------------------------------------------------------------------------------
--
-- §5's "append-only ledger + AGGREGATE" is this row, and §8.4's "Usage/quota summary" is the object
-- a client reads. Canonical scope `workspace_id` and the nullable `business_profile_id` (§3.3), tied
-- to the Business by §3.3's composite foreign key.
--
-- MUTABLE, which is where this table parts company with the ledger beside it and is the whole
-- resolution of §5's two-shape sentence: a bucket must move as the ledger grows, so it carries
-- `updated_at` and the §3.2 trigger, and §3.2's and §4/8's immutability rules name USAGE HISTORY
-- rather than a statement about it. Nothing here is a second source of truth: every value below is
-- recomputable from `app.usage_events` and `app.usage_reservations` over this row's own key, and
-- `computed_through` is what makes that recomputation a comparison rather than a replacement.
--
-- Sensitivity FIN-3, whose client projection §9.1 gives as "owner/admin summary" — which is §8.4's
-- two `Y` cells, implemented below.
create table if not exists app.quota_buckets (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid        not null references app.workspaces (id),
  business_profile_id  uuid,
  dimension            text        not null,
  -- What the two amounts below are counted in. The dimension does not imply it: CTR-USG-001
  -- enumerates six dimensions and five units and states no mapping between them, so a bucket that
  -- did not say would be an aggregate whose numbers have no unit.
  quantity_unit        text        not null,
  period_start         timestamptz not null,
  period_end           timestamptz not null,
  -- DERIVED. The sum of app.usage_events.quantity_amount over this bucket's own key, up to
  -- computed_through.
  consumed_amount      numeric(24,8) not null default 0,
  -- DERIVED. The sum of app.usage_reservations.quantity_amount for the holds that are neither
  -- released nor consumed. Kept beside the consumed total because "may I start this work" cannot be
  -- answered from the ledger alone: a hold exists precisely so that concurrent work cannot overspend
  -- a quota the ledger has not yet recorded.
  reserved_amount      numeric(24,8) not null default 0,
  -- THE WATERMARK, AND THE ONE COLUMN THAT MAKES A DISAGREEMENT DETECTABLE. This row claims to
  -- summarise ledger rows created at or before this instant and claims nothing about later ones.
  -- NULL means it claims nothing at all, which is different from claiming zero. It records what the
  -- derived row covers; it does not compute it, repair it, or decide what happens when it is wrong —
  -- §6's registry gives the resolver to batch 132 and CTR-USG-001's freeze boundary puts OB-008's
  -- reconciliation algorithm outside itself.
  computed_through     timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- Third of the vocabulary's three homes; the apply-time block requires all three identical.
  constraint quota_buckets_dimension_known
    check (dimension in ('ai_tokens', 'research_search', 'storage_bytes', 'egress_bytes',
                         'media_processing', 'publish_operation')),
  constraint quota_buckets_quantity_unit_known
    check (quantity_unit in ('token', 'request', 'byte', 'second', 'operation')),
  constraint quota_buckets_period_is_an_interval check (period_end > period_start),
  constraint quota_buckets_consumed_not_negative check (consumed_amount >= 0),
  constraint quota_buckets_reserved_not_negative check (reserved_amount >= 0),
  constraint quota_buckets_business_scope_fk
    foreign key (workspace_id, business_profile_id)
    references app.business_profiles (workspace_id, id),
  -- ONE BUCKET PER SCOPE PER DIMENSION PER PERIOD. NULLS NOT DISTINCT is load-bearing and is 021's
  -- constraint shape: without it two workspace-level buckets for the same dimension and period would
  -- both be legal, because a NULL business_profile_id is distinct from every other NULL in a default
  -- unique constraint — and two aggregates of the same thing, differing in nothing, is a state
  -- nothing could resolve and the exact defect a derived row must not be allowed to reach.
  constraint quota_buckets_one_per_period
    unique nulls not distinct
    (workspace_id, business_profile_id, dimension, period_start, period_end)
);

comment on table app.quota_buckets is
  'Owner: A0/A6 Metering (metering.core, batch 061). Canonical scope workspace_id and the nullable '
  'business_profile_id (§3.3), tied to the Business by a composite foreign key. Sensitivity FIN-3; '
  'retention FINANCE-HISTORY. THE AGGREGATE HALF of §5''s "append-only ledger + aggregate", and '
  'therefore DERIVED AND NEVER THE TRUTH: consumed_amount, reserved_amount and computed_through are '
  'recomputable from app.usage_events and app.usage_reservations over this row''s own key, and when '
  'the two disagree the LEDGER wins because §3.2, §4 invariant 8 and §8.4 make usage history '
  'immutable and an aggregate is a statement about history rather than history. NO RECONCILIATION IS '
  'WRITTEN — no trigger, no view, no function: which events fall in which bucket, what a superseding '
  'event does to the estimate it replaces, and whether the bucket is authoritative between '
  'recomputes are all undecided, CTR-USG-001''s freeze boundary puts OB-008 outside itself, and §6''s '
  'registry gives the resolver to batch 132. computed_through makes the disagreement DETECTABLE '
  'instead. It is the one table in this batch a client may read: §8.4''s "Usage/quota summary SELECT" '
  'is Y for the owner and Y for the admin, implemented through app.workspace_member_role and '
  'narrowed by 021''s member scope in a RESTRICTIVE policy; the editor''s P is refused because no '
  'document defines the capability set (RFC-2026-020 §8). NO ROLE MAY WRITE ONE: §8 has no row for a '
  'quota bucket at all, so the cell is denied by default, and app_worker holds a column-scoped '
  'UPDATE on the three derived columns with no policy, so the refusal is row level security''s.';
comment on column app.quota_buckets.workspace_id is
  'FIN-3. The canonical tenant scope and the predicate both policies below resolve. It is OUTSIDE '
  'app_worker''s UPDATE grant, so §8.5''s "ห้ามย้าย row ข้าม tenant ด้วย update" holds here by a '
  'column list rather than by the absence of a verb — the distinction 060 had to correct after '
  'independent review found a comment claiming the second beside a table-wide grant.';
comment on column app.quota_buckets.business_profile_id is
  'FIN-3. The optional Business scope, tied to the Workspace by the composite foreign key. NULL '
  'means a workspace-level bucket, which 021''s member scope does not narrow at all — "§7''s scope '
  'types are all_businesses, business and page, every one of them names a Business or a Page, and a '
  'WORKSPACE row is not inside any of them" — so the restrictive policy below has an explicit NULL '
  'branch rather than passing NULL to a helper that would then deny everyone.';
comment on column app.quota_buckets.consumed_amount is
  'FIN-3, DERIVED. The sum of app.usage_events.quantity_amount over this bucket''s key up to '
  'computed_through. It is a cache of the ledger and the ledger is the truth; nothing in this batch '
  'keeps them equal, and computed_through is what lets anyone check.';
comment on column app.quota_buckets.reserved_amount is
  'FIN-3, DERIVED. The sum of the holds in app.usage_reservations that are neither released nor '
  'consumed. It is here rather than only in the ledger because "may I start this work" cannot be '
  'answered from measurements that have not been taken yet.';
comment on column app.quota_buckets.computed_through is
  'FIN-3. THE WATERMARK: this row summarises ledger rows created at or before this instant and says '
  'nothing about later ones; NULL claims nothing rather than claiming zero. It is the one column of '
  'this table `authenticated` is NOT granted — it describes the resolver''s own progress, which is '
  'the shape §9.1 gives INTERNAL-3 ("redacted status only") rather than the summary §9.1 gives '
  'FIN-3, and batch 132 owns it.';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- Already covered by a constraint's own index, and therefore NOT repeated below:
--
--   usage_events (usage_id)                 — the unique constraint, and the lookup a redelivery
--                                             and a supersession both make.
--   usage_events (workspace_id, dedupe_key) — the natural key, which leads with workspace_id.
--   usage_events (id) / usage_reservations (id) / quota_buckets (id)
--                                           — the primary keys.
--   quota_buckets (workspace_id, business_profile_id, dimension, period_start, period_end)
--                                           — quota_buckets_one_per_period, which leads with
--                                             (workspace_id, business_profile_id) and therefore
--                                             supports BOTH the composite foreign key into
--                                             app.business_profiles and the single-column one into
--                                             app.workspaces, and is also the index the SELECT
--                                             policy's workspace_id predicate reads. This table
--                                             needs no index of its own and gets none (020's
--                                             discipline, stated so the absence is legible).

-- §3.3's keyset pagination, "(created_at desc, id desc)", for the one list here that grows
-- continuously with the tenant. Neither of the other two does: a bucket count is bounded by scopes
-- times dimensions times periods, and a reservation is short-lived by construction.
create index if not exists usage_events_workspace_keyset_idx
  on app.usage_events (workspace_id, created_at desc, id desc);

-- THE RECOMPUTE'S OWN INDEX, and the reason the watermark is worth having: this is the query that
-- answers "does this bucket agree with the ledger", over exactly the columns quota_buckets_one_per_
-- period is keyed on.
create index if not exists usage_events_bucket_recompute_idx
  on app.usage_events (workspace_id, business_profile_id, dimension, occurred_at);

-- OB-004's acceptance is "workspace/business/job/provider attribution ครบ" — attribution complete
-- across a whole workflow — and a workflow is a job. Without this, asking what one job cost scans
-- the tenant's whole ledger.
create index if not exists usage_events_job_idx
  on app.usage_events (job_id);

-- CTR-USG-001 untestable_by_schema: "nothing here stops two events superseding one estimate", and
-- "both are ledger properties across events; one document cannot express either". A ledger can. It
-- is a partial index because the column is null on every event that corrects nothing, which is most
-- of them.
create unique index if not exists usage_events_supersedes_at_most_once
  on app.usage_events (supersedes_usage_id)
  where supersedes_usage_id is not null;

-- The composite foreign key into app.business_profiles, which leads with workspace_id and so
-- supports the single-column key into app.workspaces too — and is the scope a recompute of
-- reserved_amount reads.
create index if not exists usage_reservations_scope_idx
  on app.usage_reservations (workspace_id, business_profile_id, dimension);

-- The column a sweep of expired holds reads, which is 010's treatment of TOKEN-SHORT's expires_at
-- and 050's of CONSUMER-LEDGER's consumed_at: the column before the job that reads it.
--
-- NO PARTIAL PREDICATE NAMING released_at AND consumed_usage_id, and that is 050's refusal rather
-- than an oversight: `where released_at is null and consumed_usage_id is null` IS a definition of
-- which holds are still open, and an index predicate is a quieter place to put a lifecycle decision
-- than a CHECK constraint, not a weaker one.
create index if not exists usage_reservations_expiry_idx
  on app.usage_reservations (expires_at);


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every MUTABLE row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
--
-- Two triggers, not three. app.usage_events has no updated_at to stamp, and adding one would be the
-- first sentence of an append-only table contradicting itself (020's words, kept by 050).
--
-- BOTH ARE REACHABLE AND REFUSED RATHER THAN INERT, and the distinction is 060's correction after
-- review compared a comment with a grant: app_worker holds a column-scoped UPDATE on each of these
-- two tables, so the triggers CAN be fired through a granted path — one that row level security then
-- refuses, which is not the same thing as unreachable and must not be written as if it were.
drop trigger if exists set_updated_at on app.usage_reservations;
create trigger set_updated_at before update on app.usage_reservations
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.quota_buckets;
create trigger set_updated_at before update on app.quota_buckets
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on every table, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
--
-- On app.usage_events and app.usage_reservations this is the whole control rather than part of one:
-- they carry no policy, so ENABLE plus FORCE is what makes every non-bypassing role — including the
-- table owner and including the one role holding grants — read zero rows and write nothing, and it
-- is what the CI negative control switches off to prove the suite notices.
--
-- On app.quota_buckets FORCE is doing the ordinary work: two policies decide what `authenticated`
-- reads, and FORCE is what keeps the table owner subject to them.
alter table app.usage_events enable row level security;
alter table app.usage_events force row level security;

alter table app.usage_reservations enable row level security;
alter table app.usage_reservations force row level security;

alter table app.quota_buckets enable row level security;
alter table app.quota_buckets force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges. Deny-by-default needs a grant before RLS is even reached.
-- ---------------------------------------------------------------------------------------------
--
-- §6 invariant 8 puts migration, constraints, indexes, RLS AND grants in one change set.
--
-- `anon` IS GRANTED NOTHING, ANYWHERE IN THIS BATCH, and since 2026-09-06 that is an approved
-- decision rather than an inherited convention: RFC-2026-021 §7/4 decides it in terms and gives the
-- structural reason — the first `anon` grant is not one grant, it is `grant usage on schema app`,
-- and it changes the DENIAL LAYER of every object in `app` at once. Every anonymous case below
-- declares `deniedOn: { kind: 'schema', name: 'app' }` for exactly that reason, and the apply-time
-- block asserts the negative.
--
-- `authenticated` HOLDS ONE COLUMN-SCOPED SELECT, ON app.quota_buckets, AND NOTHING ELSE ON
-- ANYTHING. §8.4's "Usage/quota summary SELECT" is `Y` for the owner and `Y` for the admin and the
-- aggregate is the summary; the header argues at length why that is not 050's "redacted status"
-- situation and why `computed_through` is outside the list.
grant select (id, workspace_id, business_profile_id, dimension, quantity_unit,
              period_start, period_end, consumed_amount, reserved_amount, created_at, updated_at)
  on app.quota_buckets to authenticated;

-- `app_worker` HOLDS GRANTS AND NO POLICY, on all three, which is the shape batch 010 introduced and
-- every batch since has kept, for the reason 010 gives: without a grant a service refusal is 42501
-- either way and proves only that somebody forgot a GRANT; with the grant and no policy, an empty
-- read can only have come from row level security, and a service role that had quietly acquired
-- BYPASSRLS would SUCCEED where the suite demands a refusal.
--
-- THE MEASURED TRAP THIS BATCH IS WRITTEN AROUND: a full set of column grants does NOT make
-- `has_table_privilege` true. That is what let 060 grant more than its comments claimed, and it is
-- why every assertion in the apply-time block below uses `has_any_column_privilege` for the
-- column-scoped verbs and `has_table_privilege` only for DELETE, which has no column-level form.
--
-- app.usage_events: SELECT and INSERT. NO UPDATE AND NO DELETE, FOR ANY ROLE — §8.4's "Usage ledger
-- INSERT/UPDATE/DELETE" is `N` in every column of the row for the last two verbs, the service
-- included, and the absence of the verb is what makes the refusal a privilege-layer 42501 the
-- isolation suite can attribute to an object by name.
grant select (id, usage_id, occurred_at, dimension, quantity_amount, quantity_unit, workspace_id,
              business_profile_id, job_id, provider_key, cost_amount, cost_currency, cost_basis,
              supersedes_usage_id, dedupe_key, created_at)
  on app.usage_events to app_worker;
grant insert (usage_id, occurred_at, dimension, quantity_amount, quantity_unit, workspace_id,
              business_profile_id, job_id, provider_key, cost_amount, cost_currency, cost_basis,
              supersedes_usage_id, dedupe_key)
  on app.usage_events to app_worker;

-- app.usage_reservations: SELECT, INSERT, and UPDATE ON THE TWO COLUMNS A HOLD ENDS WITH. Everything
-- that says WHICH hold it is — the id, both scope columns, the dimension, the quantity, the job and
-- the two timestamps taken at the moment it was made — is outside the UPDATE grant, so a hold cannot
-- be re-identified, moved between tenants, enlarged or extended by an update (§8.5). No DELETE: a
-- hold is released, and hard deletion is a retention sweep with its own class and its own batch.
grant select (id, workspace_id, business_profile_id, dimension, quantity_amount, quantity_unit,
              job_id, reserved_at, expires_at, released_at, consumed_usage_id, created_at, updated_at)
  on app.usage_reservations to app_worker;
grant insert (workspace_id, business_profile_id, dimension, quantity_amount, quantity_unit,
              job_id, expires_at)
  on app.usage_reservations to app_worker;
grant update (released_at, consumed_usage_id, updated_at) on app.usage_reservations to app_worker;

-- app.quota_buckets: SELECT, INSERT, and UPDATE ON THE THREE DERIVED COLUMNS PLUS `updated_at`. This
-- grant IS the answer to "who is permitted to move the derived one", and the columns it withholds
-- are the answer to "and how far": the identity, the scope, the dimension, the unit and the period
-- are what say which ledger rows this bucket is about, so a role that could update them could point
-- an aggregate at a different tenant's measurements without changing a number.
grant select (id, workspace_id, business_profile_id, dimension, quantity_unit, period_start,
              period_end, consumed_amount, reserved_amount, computed_through, created_at, updated_at)
  on app.quota_buckets to app_worker;
grant insert (workspace_id, business_profile_id, dimension, quantity_unit, period_start, period_end,
              consumed_amount, reserved_amount, computed_through)
  on app.quota_buckets to app_worker;
grant update (consumed_amount, reserved_amount, computed_through, updated_at)
  on app.quota_buckets to app_worker;

-- `app_command` and `app_maintenance` are granted nothing by this batch. There is no specified
-- command surface for metering.core — RFC-2026-012 §4 names the mechanism and RFC-2026-021 §10
-- records that none exists — and the retention path is batch 160.


-- ---------------------------------------------------------------------------------------------
-- Policies. Two, both on the aggregate, and none anywhere else.
-- ---------------------------------------------------------------------------------------------
--
-- §8.4's "Usage/quota summary SELECT" = Y for owner, Y for admin, P for editor, N for approver and
-- viewer, P for service. The two unconditional `Y` cells are written; everything else in this batch
-- is denied by default and the header says why for each.
--
-- Membership and role are read through the batch 011 helper and never by joining
-- app.workspace_members (RFC-2026-020 §5/5). `app.workspace_member_role` returns a role only for an
-- ACTIVE membership, which is where §7's "only status active grants access" and §12.6/5's suspended
-- member live for this table — the predicate has no `status` of its own, for the same reason 020's,
-- 030's, 040's and 130's do not.
drop policy if exists quota_buckets_select_owner_or_admin on app.quota_buckets;
create policy quota_buckets_select_owner_or_admin on app.quota_buckets
  for select to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin'));

-- THE NARROWING, WHICH MUST BE RESTRICTIVE BECAUSE PERMISSIVE POLICIES OR TOGETHER AND CANNOT
-- SUBTRACT. §8's legend reads `Y` as "ผ่านเมื่อ active + capability + SCOPE ตรง", so an owner or
-- admin holding a member scope row sees only the Businesses that scope covers — and a member holding
-- NO scope row is not narrowed at all, which is why this calls `admits` (021's `Y` form) rather than
-- `covers` (its `P` form, which would deny every unscoped owner).
--
-- `for all` rather than `for select`, and both USING and WITH CHECK, although no client role holds a
-- write on this table today. The direction is fail-closed: the day a batch grants one, the narrowing
-- already applies to it rather than having to be remembered. 040 writes its own the same way.
--
-- THE NULL BRANCH IS EXPLICIT AND IS NOT A HOLE. A workspace-level bucket is inside no member scope
-- — 021: "every one of them names a Business or a Page, and a WORKSPACE row is not inside any of
-- them" — and passing NULL to the helper would deny everyone including the unscoped, which is the
-- failure mode 040 records for the wrong branch of its own duality.
drop policy if exists quota_buckets_scope_narrows_member on app.quota_buckets;
create policy quota_buckets_scope_narrows_member on app.quota_buckets
  as restrictive
  for all to authenticated
  using (
    business_profile_id is null
    or app.member_scope_admits_business(workspace_id, business_profile_id)
  )
  with check (
    business_profile_id is null
    or app.member_scope_admits_business(workspace_id, business_profile_id)
  );

-- app.usage_events AND app.usage_reservations CARRY NO POLICY AT ALL, AND THAT IS A DECISION RATHER
-- THAN AN OMISSION. The ledger's client cells do not exist — §8.4 says nothing about who may SELECT
-- a usage event, and where a document is silent the cell is denied — and its one `S` cell is
-- classified CARRIED in db/foundation/lint/service-policy-map.json under a decision RFC-2026-022
-- itself declares NOT IN EFFECT. The reservation has no row in any of §8's four matrices in either
-- direction. Both are FORCE ROW LEVEL SECURITY with an empty policy set, which denies every
-- non-bypassing role including the one holding grants. 030 established that a forced table's empty
-- policy set has to be a decision written in the file rather than an omission a reader infers; this
-- paragraph is that decision, and tests/db/identity/identity-isolation.test.mjs holds it in both
-- directions — no policy here today, and a policy appearing without the §8 row or the RFC that would
-- justify it fails the build.


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004, 011, 020, 021, 030, 040, 050, 060, 130 and 140 use: a claim that is only a
-- comment is a claim nobody checks. These are the properties of THIS batch answerable from the
-- catalog of the database being migrated, without a committed snapshot and without a test harness.
-- The text half lives in tests/db/identity/identity-isolation.test.mjs and the live behavioural half
-- is `make db-rls-smoke`.
--
-- WHAT IS DELIBERATELY NOT ASSERTED HERE, following 030's rule and 021's scar: 011's apply-time
-- policy count is an APPLIED migration's self-assertion that 021 had to route around rather than
-- amend. So nothing below asserts a property an approved decision or an already-named batch is
-- EXPECTED to change:
--
--   * NOT "no policy names app_worker". RFC-2026-022 §3 classifies this batch's `S` cell CARRIED and
--     positively EXPECTS a policy `TO app_worker` on app.usage_events once §7 holds. An apply-time
--     assertion against an approved decision's own direction is exactly the trap 011 set for 021.
--   * NOT "app.usage_events and app.usage_reservations carry no policy" and NOT "no client role
--     holds a privilege on them". Both are RFC-2026-012 §3's empty read allowlist, and an allowlist
--     exists in order to grow.
--   * NOT the role named in the SELECT policy, or the number of policies on app.quota_buckets. §8.4's
--     editor `P` is refused on a reading RFC-2026-020 §8 could close, and 130 pinned the same kind of
--     reading in the static suite for the same reason.
--
-- All of those are asserted in the static suite instead, where the batch that changes one edits a
-- line a reviewer reads. What IS asserted here is the set of properties no approved decision is
-- expected to move: the ledger's immutability, the absence of DELETE anywhere, §8.5's per-column
-- rule on the two mutable tables, the vocabulary's three homes agreeing, money's declared type,
-- `anon` as a negative, the identity column's ALWAYS, the natural keys, ENABLE/FORCE and ownership.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only by
-- a superuser, and a migration that needs one to apply is a migration that cannot be applied on the
-- platform it targets, where `postgres` is not a superuser.
do $$
declare
  offending text;
  count_of  integer;
begin
  -- ENABLE and FORCE on all three. The two are DIFFERENT CATALOG COLUMNS and the data package's own
  -- lint rule reads only the first (RFC-2026-016 §4). On the two tables with no policy, FORCE is the
  -- whole of what refuses the role holding the grants.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('usage_events', 'usage_reservations', 'quota_buckets')
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'Two of these three carry no policy at all, so FORCE is the whole control: '
                   'without it the table owner reads every row and the isolation suite cannot tell '
                   'that from a working meter.';
  end if;

  -- THE LEDGER IS APPEND-ONLY, AS THE PRIVILEGE SYSTEM HOLDS IT. §8.4's "Usage ledger
  -- INSERT/UPDATE/DELETE" is `N` for every role on the last two verbs, the SERVICE INCLUDED, and
  -- §3.2 and §4 invariant 8 both name usage history immutable. Asserted against the live ACLs rather
  -- than against the text of the grants above, because a grant made by a LATER batch would not
  -- appear in this file at all.
  --
  -- `has_any_column_privilege` for UPDATE so a column-scoped grant is caught as well as a table-wide
  -- one — the measured trap that a full set of column grants leaves `has_table_privilege` false;
  -- DELETE has no column-level form and is asked of the table.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'usage_events'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'the usage ledger can be updated or deleted: %', offending
      using hint = 'This is the half of this family that carries the truth. §8.4 marks the ledger''s '
                   'UPDATE and DELETE `N` for every role including the service, and the aggregate '
                   'beside it is derived precisely so that nothing has to edit a measurement.';
  end if;

  -- And the same claim as the POLICY catalog holds it, because either half alone can be satisfied
  -- while the other is wrong: a policy with no grant is inert, and a grant with no policy is denied
  -- by row level security rather than by privilege, which is a weaker refusal than immutability asks
  -- for. `w` is UPDATE and `d` is DELETE; INSERT is deliberately absent, because RFC-2026-022 §3
  -- expects an INSERT policy on this table once its decision is in effect.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'usage_events' and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'the usage ledger carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE THREE. §8.5 has no broad user delete; hard deletion of a
  -- FINANCE-HISTORY row is a retention sweep, §10 owns the number and batch 160 owns the job.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname in ('usage_events', 'usage_reservations', 'quota_buckets')
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a metering row can be deleted through a granted path: %', offending
      using hint = '§8.5 requires a soft delete through a typed lifecycle field where a delete is '
                   'wanted at all, and §10''s FINANCE-HISTORY says a ledger is "not erased if legal '
                   'basis requires".';
  end if;

  -- §8.5, PER COLUMN, AGAINST THE LIVE ACL: on the two MUTABLE tables, no role may re-identify a
  -- row, move it between tenants or across Businesses, change what it is counting, or change the
  -- period or the work it is about. The UPDATE grants above name five columns between them and this
  -- is what says so about the twelve they withhold — which is 050's shape, and app_worker is IN the
  -- checked list for 050's reason: every grant this batch makes to it is column-scoped.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id', 'dimension',
                                'quantity_unit']) as col
       where n.nspname = 'app'
         and c.relname in ('usage_reservations', 'quota_buckets')
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['period_start', 'period_end']) as col
       where n.nspname = 'app'
         and c.relname = 'quota_buckets'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['quantity_amount', 'job_id', 'reserved_at', 'expires_at']) as col
       where n.nspname = 'app'
         and c.relname = 'usage_reservations'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity, scope or period column of a metering table is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant with an update. The period and the '
                   'dimension are in this list because they are what say WHICH ledger rows a bucket '
                   'is about: a role that could change them could point an aggregate at another '
                   'tenant''s measurements without changing a number.';
  end if;

  -- THE VOCABULARY HAS THREE HOMES AND THEY MAY NOT DRIFT. 060's assertion, extended from two
  -- constraints to three: none of the deparsed definitions mentions its table, so a correct set is
  -- BYTE-IDENTICAL. Dull on purpose — this block runs on every apply, and a clever query that fails
  -- to PARSE fails the migration rather than the rule it was checking.
  select string_agg(distinct pg_catalog.pg_get_constraintdef(t.oid), ' <> ') into offending
    from pg_catalog.pg_constraint t
   where t.conname in ('usage_events_dimension_known', 'usage_reservations_dimension_known',
                       'quota_buckets_dimension_known');
  if offending is null or position(' <> ' in offending) > 0 then
    raise exception 'the dimension vocabulary differs between its three homes: %',
      coalesce(offending, '<one of the three constraints is missing>')
      using hint = 'CTR-USG-001 enumerates six dimensions and §3.2 says the values change by '
                   'migration only. Three CHECKs holding different lists is a bucket that cannot be '
                   'keyed on a dimension a ledger row is allowed to carry.';
  end if;

  select string_agg(distinct pg_catalog.pg_get_constraintdef(t.oid), ' <> ') into offending
    from pg_catalog.pg_constraint t
   where t.conname in ('usage_events_quantity_unit_known', 'usage_reservations_quantity_unit_known',
                       'quota_buckets_quantity_unit_known');
  if offending is null or position(' <> ' in offending) > 0 then
    raise exception 'the quantity-unit vocabulary differs between its three homes: %',
      coalesce(offending, '<one of the three constraints is missing>')
      using hint = 'CTR-USG-001 enumerates five units. A bucket counting in one unit while its '
                   'ledger rows are measured in another is an aggregate of two different things.';
  end if;

  -- Three of each, because `string_agg(distinct ...)` over a single row is also what a database
  -- holding one of the three looks like.
  select count(*) into count_of
    from pg_catalog.pg_constraint t
   where t.conname in ('usage_events_dimension_known', 'usage_reservations_dimension_known',
                       'quota_buckets_dimension_known', 'usage_events_quantity_unit_known',
                       'usage_reservations_quantity_unit_known', 'quota_buckets_quantity_unit_known');
  if count_of <> 6 then
    raise exception 'batch 061 declares six vocabulary CHECK constraints and the catalog holds %', count_of;
  end if;

  -- MONEY IS numeric(18,6) AND NEVER A FLOAT (§3.2), asked of the live catalog rather than of the
  -- CREATE TABLE text above, which is 130's assertion in the second FIN-3 family. Both halves: the
  -- declared type of the cost column, and the absence of any inexact numeric type on any column of
  -- any table this batch creates. `money` is in the list because Postgres has a type by that name
  -- whose output depends on a session GUC, which is the worst of both properties for a figure
  -- somebody is charged.
  select pg_catalog.format_type(a.atttypid, a.atttypmod) into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'usage_events' and a.attname = 'cost_amount';
  if offending is distinct from 'numeric(18,6)' then
    raise exception 'app.usage_events.cost_amount is % and §3.2 fixes money as numeric(18,6)',
      coalesce(offending, '<absent>');
  end if;

  select string_agg(format('%s.%s is %s', c.relname, a.attname,
                           pg_catalog.format_type(a.atttypid, a.atttypmod)), ', ')
    into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_type t on t.oid = a.atttypid
   where n.nspname = 'app'
     and c.relname in ('usage_events', 'usage_reservations', 'quota_buckets')
     and a.attnum > 0 and not a.attisdropped
     and t.typname in ('float4', 'float8', 'money');
  if offending is not null then
    raise exception 'an inexact or locale-dependent numeric type appears in batch 061: %', offending
      using hint = '§3.2: "เงิน: numeric(18,6) + ISO-4217 currency; ห้าม float", and CTR-USG-001 '
                   'carries both money and quantity as decimal strings for the same reason. A '
                   'quantity a cost is derived from is as float-sensitive as the cost.';
  end if;

  -- §3.2: "Append-only event/attempt/ledger ปริมาณสูง: bigint generated always as identity".
  -- ALWAYS and not BY DEFAULT — `attidentity` is 'a' for the first and 'd' for the second — because
  -- under BY DEFAULT a writer may supply its own position in an ordered log, and this id IS the
  -- recompute's cursor.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attname = 'id'
   where n.nspname = 'app'
     and c.relname = 'usage_events'
     and (a.attidentity <> 'a' or pg_catalog.format_type(a.atttypid, a.atttypmod) <> 'bigint');
  if offending is not null then
    raise exception 'the usage ledger does not key on a bigint GENERATED ALWAYS AS IDENTITY: %', offending;
  end if;

  -- THE NATURAL KEYS, READ FROM THE CATALOG AS COLUMN SETS RATHER THAN AS CONSTRAINT NAMES (050's
  -- shape). Two claims live here and both are about a column being IN a key.
  --
  --   usage_events (workspace_id, dedupe_key): without workspace_id, one tenant's malformed key
  --   suppresses another tenant's real measurement and a conflicting insert reports that another
  --   tenant's key exists — "retry idempotent creating something that reaches across scope", the
  --   failure §11.1/9 names.
  --
  --   quota_buckets (workspace_id, business_profile_id, dimension, period_start, period_end):
  --   dropping any one of the five makes two different aggregates one row, and the row would still
  --   be unique, still be derived, and still pass every other check in this repository.
  --
  -- Read as a SET so a reordering does not fail and a dropped column does.
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
         and c.relname in ('usage_events', 'quota_buckets')
    ) as keys
   where not (
     (target = 'usage_events' and cols in ('dedupe_key,workspace_id', 'usage_id'))
     or (target = 'quota_buckets'
         and cols = 'business_profile_id,dimension,period_end,period_start,workspace_id')
   );
  if offending is not null then
    raise exception 'a natural key in batch 061 is not the one it declares: %', offending
      using hint = 'app.usage_events must be unique on (usage_id) and on (workspace_id, '
                   'dedupe_key), and app.quota_buckets on (workspace_id, business_profile_id, '
                   'dimension, period_start, period_end). Every one of those columns is load-bearing '
                   'and the migration says which failure dropping it produces.';
  end if;

  -- And exactly those three, so a fourth key is not a deduplication rule nobody recorded.
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and con.contype = 'u'
     and c.relname in ('usage_events', 'usage_reservations', 'quota_buckets');
  if count_of <> 3 then
    raise exception 'batch 061 declares three unique constraints across its three tables and the catalog holds %', count_of;
  end if;

  -- THE BUCKET'S KEY TREATS NULLS AS EQUAL, which is the property that stops two workspace-level
  -- aggregates of the same thing existing side by side. It is a different catalog column from the
  -- key itself (`indnullsnotdistinct`), so a key with the right columns and the wrong null semantics
  -- passes the assertion above and fails here.
  select count(*) into count_of
    from pg_catalog.pg_index i
    join pg_catalog.pg_class c on c.oid = i.indrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_constraint con on con.conindid = i.indexrelid
   where n.nspname = 'app' and c.relname = 'quota_buckets'
     and con.conname = 'quota_buckets_one_per_period'
     and i.indnullsnotdistinct;
  if count_of <> 1 then
    raise exception 'quota_buckets_one_per_period does not treat NULLs as equal'
      using hint = 'business_profile_id is nullable and a NULL is distinct from every other NULL in '
                   'a default unique constraint, so without NULLS NOT DISTINCT two workspace-level '
                   'buckets for one dimension and one period are both legal — two aggregates of the '
                   'same thing, differing in nothing.';
  end if;

  -- `anon` holds nothing on anything this batch creates. RFC-2026-021 §7/4 decided that as a
  -- NEGATIVE — "a negative is the strongest thing a lint can hold" (RFC-2026-019 §5) — and it is the
  -- one client-role property no approved decision is expected to move: the RFC says reversing it
  -- needs an RFC that states what the anonymous surface is for.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('usage_events', 'usage_reservations', 'quota_buckets')
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on app.%, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- No policy this batch's tables carry may name an anonymous role. §8.5 gives anonymous no tenant
  -- policy. app_worker is deliberately NOT in this list: RFC-2026-022 §3 expects a CARRIED service
  -- policy on app.usage_events once its decision is in effect.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('usage_events', 'usage_reservations', 'quota_buckets')
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles) and r.rolname = 'anon');
  if offending is not null then
    raise exception 'batch 061 left a policy for the anonymous role: %', offending;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 061 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  -- The POLICY COUNT is deliberately not re-asserted: 021 owns that assertion on the far side of the
  -- batch that could have moved it, and repeating it would be a second home for a number.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('usage_events', 'usage_reservations', 'quota_buckets')
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020, 021, 030, 040,
  -- 050, 060, 130 and 140 ask them: scripts/db/run.mjs holds every tenant table to the ownership
  -- rule against the COMMITTED SNAPSHOT, and this batch is deliberately not applied to the instance
  -- that snapshot describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('usage_events', 'usage_reservations', 'quota_buckets')
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 061 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
