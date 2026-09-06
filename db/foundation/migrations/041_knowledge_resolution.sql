-- Batch 041 — the resolved knowledge contract: the half of it that is decided.
--
-- Owner: A2 Knowledge. The migration ownership registry (§6 of the data package) reserves 041 to
-- this package and describes it as "resolved knowledge contract", depending on 040. The core
-- database workstream's own sequence (docs/plans/core-database-and-rls-workstream-th.md:555) says
-- the same thing at greater length: "| 041 | resolved knowledge views/functions | Knowledge | 040 |
-- stable query contract + tests |".
--
-- Depends on: 000 (schemas), 001 (app_worker), 040 (app.knowledge_items and its two scope columns —
-- referenced by this file only in its apply-time assertions, never altered). Migration invariant 1
-- forbids rewriting a merged migration and NOTHING BELOW DOES: this file creates one function and
-- issues three grant statements about that function, and contains no `alter table`, no `create
-- table`, no `create policy` and no `drop policy` at all. A static test asserts that rather than
-- trusting this sentence.
--
--
-- ============================================================================================
-- WHAT "RESOLVED KNOWLEDGE CONTRACT" TURNED OUT TO MEAN, AND WHY MOST OF IT CANNOT BE BUILT HERE
-- ============================================================================================
--
-- The phrase is not a gap in the documents. It is defined, in five places, and the definition is
-- quoted here rather than summarised because the whole of this batch's reasoning is that the
-- definition is complete and its INPUTS are not.
--
--   1. THE RESOLUTION RULE ITSELF. docs/plans/core-database-and-rls-workstream-th.md:217, the last
--      line of §4.3's "Typed knowledge tables":
--
--        กฎ resolution: Industry base → Business override → Page override → Content brief;
--        hard restriction override ไม่ได้
--
--      "Resolution rule: Industry base → Business override → Page override → Content brief; a hard
--      restriction cannot be overridden."
--
--   2. THE PRECEDENCE LADDER THE RULE IS A SPECIALISATION OF.
--      docs/sprint-0a/sprint-0a-industry-research-pack-th.md:188 §4.4 "Rule precedence", highest
--      first: 1 Platform hard safety/privacy/source policy, 2 Industry Pack hard rule, 3 Workspace
--      governance, 4 Business policy/brand knowledge, 5 Page-specific facts/footer/contact,
--      6 User selection for the job. And, crucially, the rule about how they combine:
--
--        กฎชั้นล่างเพิ่มความเข้มได้ แต่ลด hard rule, evidence requirement, privacy หรือ consent ไม่ได้
--        เมื่อขัดแย้งต้องคืน `policy_conflict` ห้ามเลือกค่าหนึ่งเงียบ ๆ
--
--      A lower layer may ADD strictness and may not reduce a hard rule, an evidence requirement,
--      privacy or consent; on conflict the resolver must return `policy_conflict` and MUST NOT
--      SILENTLY PICK ONE. So "override" in the ladder is not last-writer-wins, and a batch that
--      implemented it as last-writer-wins would be implementing the one behaviour §4.4 forbids by
--      name.
--
--   3. THE CROSS-MODULE READ CONTRACT'S NAME.
--      docs/plans/core-database-and-rls-workstream-th.md:93 gives `knowledge.core` the read contract
--      `resolved_business_knowledge_v1`. That string appears EXACTLY ONCE in this repository — in
--      that table cell. No schema, no field, no example, no consumer.
--
--   4. WHAT A RESOLVED CONTEXT MUST RETURN. The DB-03 acceptance list, same document, line 657:
--      "resolved context คืนเฉพาะ Workspace/Business/Page ที่ร้องขอและมีสิทธิ์" — a resolved context
--      returns only the Workspace/Business/Page that was REQUESTED and that the caller is entitled
--      to. Line 656 is the other half: "hard restriction ถูก Page override ไม่ได้".
--
--   5. WHICH ROWS BELONG TO WHICH LAYER. §3.3's Page row — "policy/knowledge/asset ที่จำกัดเฉพาะเพจ"
--      — §4 invariant 3 — "Knowledge/Research/Content/Asset ทุก row มี Business scope; Page scope
--      เป็น nullable override ที่ต้องอยู่ Business เดียวกัน" — and
--      sprint-0a-industry-research-pack-th.md:653, "Page override/contact/footer ใช้ได้เฉพาะ target
--      Page": a Page-level row applies to ITS page and to no other.
--
-- So the ORDER IS DEFINED AND THIS BATCH IS NOT REFUSING TO READ IT. What is missing is everything
-- the order operates on. Four of the rule's five terms have no representation in the merged schema,
-- and each absence is a decision somebody has to make rather than a column somebody forgot.
--
--
-- (a) "INDUSTRY BASE" IS NOT IN THE DATABASE, AND IS NOT 041's TO PUT THERE.
--
-- The workstream blueprint's own §4.4 puts `quality_rules`, `research_recipes`, `source_policy`,
-- `content_templates` and `restricted_claims` on `industry_pack_versions` as validated JSON
-- documents. Batch 030 created NONE of them: app.industry_pack_versions carries `version`,
-- `display_name_th`, `checksum` and `released_at` and no rule content at all. The industry pack
-- contract says why that is right rather than an oversight
-- (sprint-0a-industry-research-pack-th.md:115): the pack is a "versioned data/rules bundle ไม่มี
-- executable code และไม่เข้าถึง network/database โดยตรง Core Runtime เป็นผู้ load, validate, resolve
-- และ pin version". Loading, validating, resolving and pinning are SERVER acts on a bundle that
-- lives outside the database. RFC-2026-021 §5 reads the same sentence and puts the resolver at
-- batch 070 at the earliest.
--
-- Even the pack's IDENTITY is out of reach from here, and that is a second, independent refusal.
-- §3 of the workstream document routes every cross-module read through a named contract, and the
-- one it names for `industry.core` is `resolved_industry_pack_v1` — which does not exist and
-- belongs to A2 Industry, not to A2 Knowledge. Batch 030 granted no client role any privilege on
-- app.industry_packs or app.industry_pack_versions, so a function here that joined them would
-- return nothing under `security invoker` and would need an allowlist entry under RFC-2026-021 to
-- return anything. NOTHING BELOW READS app.industry_assignments, app.industry_packs OR
-- app.industry_pack_versions. A dependency the SQL does not have is not invented here, which is
-- 040's own rule about 030 applied one batch further along.
--
--
-- (b) "HARD RESTRICTION OVERRIDE ไม่ได้" NEEDS A COLUMN THAT DOES NOT EXIST.
--
-- The blueprint that states the rule also states where hardness lives: `content_restrictions:
-- level(hard|soft), category, rule, replacement guidance, jurisdiction`. Batch 040 built ONE item
-- table typed by `kind in ('voice', 'audience', 'offers', 'restrictions')` — §5's four words — and
-- gave it `name` and nothing else, for a reason it wrote out at length: §5 names no field of this
-- family and forbids an untyped document column standing in for the rest. So a knowledge item can
-- say that it IS a restriction and cannot say whether it is a HARD one. The rule's exception
-- clause therefore has no subject, and the clause is the half of the rule that matters: a
-- resolution that got the ordering right and let a Page soften a hard restriction would be worse
-- than no resolution at all.
--
--
-- (c) "BUSINESS OVERRIDE → PAGE OVERRIDE" HAS NO KEY TO BIND ON.
--
-- An override needs to say WHICH row it overrides. A knowledge item carries `kind` and `name`;
-- `name` is a display field with no uniqueness of any sort, and there is deliberately no
-- `unique (business_profile_id, kind)`. db/foundation/seeds/fixture-catalog.json records the
-- reason in terms — "Nothing in §4, §5 or §8 says a Business holds one voice profile, and inventing
-- a `unique (business_profile_id, kind)` so that the fixture could address a row without a symbol
-- would be encoding a product decision into a constraint" — so a Business may hold many `voice`
-- items and a Page may hold many more, and "the Page one overrides the Business one" does not
-- name a pair.
--
-- The three candidate answers, so that the decision arrives as a choice rather than as a default:
--
--     A. THE PAGE LAYER REPLACES THE BUSINESS LAYER PER `kind`. Requires
--        `unique (workspace_id, business_profile_id, page_context_profile_id, kind)` — a product
--        decision that one Business has one voice — and contradicts nothing in §4.4 only if a
--        replacement can never soften a hard rule, which (b) says cannot be checked.
--     B. THE LAYERS UNION AND CARRY THEIR RANK. Nothing is replaced; a consumer receives both rows
--        with the layer each came from and applies §4.4 itself. Needs no new key and needs a stable
--        vocabulary for the layer, which §4.4 numbers but does not name for this schema.
--        This is the reading closest to §4.4's own "ห้ามเลือกค่าหนึ่งเงียบ ๆ".
--     C. THE OVERRIDE IS AN EXPLICIT EDGE. A page-level item names the business-level item it
--        overrides, as a nullable self-referencing column, and the resolver follows it. Makes the
--        pair explicit and makes it a writer's decision rather than a resolver's inference; costs
--        a column and a constraint on a merged table, which is a forward migration and an RFC.
--
-- 041 CHOOSES NONE OF THEM. RFC-2026-018 is the record of what happens when a batch settles a
-- question like this quietly, and RFC-2026-020 is the record of what to do instead: the missing
-- thing is written up and the batch builds around it.
--
--
-- (d) "CONTENT BRIEF" IS BATCH 080.
--
-- §6's registry gives ideas/content/versions to A3 Content at 080. There is nothing here to read.
--
--
-- ============================================================================================
-- AND THE OBJECT THE REGISTRY NAMES IS ONE THIS BATCH MAY NOT CREATE
-- ============================================================================================
--
-- "resolved knowledge VIEWS/functions" is the workstream sequence's own word. A `create view` in
-- schema `app` that a client reads is, under RFC-2026-021 §3 (approved 2026-09-06), an ALLOWLIST
-- ENTRY: five objects — the `security_invoker` view, a column-scoped base grant, a grant on the
-- view, a SELECT policy on the base table, and schema USAGE — plus a row in
-- `db/foundation/lint/read-allowlist.json`, authored by the family owner, countersigned by A1
-- Security and approved by RFC. §4's criterion C1 is "a named caller exists, and it is a client",
-- and it fails here for the same reason it failed for the industry catalog: there is no `src/`,
-- there is no client, and the consumers any document names for resolved knowledge — research at
-- 070 and content at 080 — are server-side batches that do not exist. §7/3 says the allowlist stays
-- empty and that the batch which would create a first entry is NOT YET ASSIGNED.
--
-- So 041 creates NO VIEW. It also adds NO BASE-TABLE GRANT to any client role: RFC-2026-021 §8.5
-- says the known-exceptions list enumerating the inherited `authenticated` base-table grants must
-- be CLOSED, batch 040 recorded that the list will have to enumerate FIVE batches rather than
-- three, and this batch does not make it six. Every grant below is `EXECUTE ON FUNCTION`, and the
-- function reaches no row.
--
--
-- ============================================================================================
-- WHAT IS DECIDED, AND IS THEREFORE WHAT THIS BATCH BUILDS
-- ============================================================================================
--
-- Strip the merge and one question remains, and it is answered four times over with no
-- contradiction anywhere: WHICH ROWS ARE IN SCOPE for a request naming a Business and, optionally,
-- a Page. Not which of them wins — which of them is even in the conversation.
--
--   * §4 invariant 3: every knowledge row has a Business scope, so a row of another Business is
--     never in scope.
--   * §3.3 and industry-research-pack:653: a Page-scoped row is knowledge "ที่จำกัดเฉพาะเพจ" and a
--     Page override "ใช้ได้เฉพาะ target Page" — it applies to ITS page and to no sibling.
--   * §4.4 puts "Business policy/brand knowledge" at layer 4 and "Page-specific facts" at layer 5,
--     both in play for one page, which is only meaningful if the Business layer reaches the Page.
--   * 040's own header says it in the language of consequences: business-level knowledge "reaches
--     every Page beneath it".
--
-- So:
--
--     a knowledge row applies in (Business B, Page P)
--        iff  row.business_profile_id = B
--        and  (row.page_context_profile_id is null  or  row.page_context_profile_id = P)
--
--     and in a request that names NO Page, only the business-level rows apply — because a
--     page-restricted row applied outside its Page would be the one thing §3.3 says it is not.
--
-- That predicate is the whole of this migration. It is a CONTRACT rather than a convenience: the
-- alternative is that batch 070 and batch 080 each write the same two-branch condition inline, and
-- the day somebody gets one of them wrong nothing fails, because a query that silently drops the
-- `is null` branch returns a strict subset and looks like a working query.
--
--
-- WHY A FUNCTION AND NOT A VIEW, BEYOND RFC-2026-021.
--
-- A view would have to choose a projection, and the projection is the part (a)-(c) say is
-- undecided. A predicate over the two columns that DO exist commits to nothing about what a
-- resolved row contains, so the batch that decides (c) adds to this rather than replacing it.
--
--
-- WHY IT IS TOTAL, AND WHY THAT COST ONE EXTRA CONJUNCT.
--
-- Written the obvious way — `item_page is null or item_page = in_page` — the predicate returns
-- SQL NULL when a page-level row meets a request that names no Page. In a `WHERE` clause NULL
-- filters like false, which is the right answer; in a `CHECK` constraint NULL passes like true,
-- which is the opposite answer. A contract that means two different things in two places is not a
-- contract, so the body below never returns NULL for any input, and the apply-time block asserts
-- that on the exact input where the obvious version would have failed.
--
--
-- WHY IT PINS NO `search_path`, WHICH IS THE ONE DEVIATION FROM 021's HELPER SHAPE.
--
-- §8.5 requires `set search_path = ''` of a SECURITY DEFINER function, and batch 011's three are
-- definers. Batch 021's five are INVOKERS and pin it anyway, for uniformity. This one does not,
-- for two reasons that are stated so a reviewer can reject them rather than discover them:
--
--   1. THERE IS NOTHING FOR A search_path TO CAPTURE. The body names no table, no function, no
--      type, no cast and no schema — only its own four parameters and the built-in operators `=`
--      and `is null`, which resolve from `pg_catalog`, implicitly first on every search path and
--      not displaceable by a `SET`. `set search_path = ''` protects the resolution of an object,
--      and this function resolves none.
--   2. A `SET` CLAUSE MAKES A SQL FUNCTION OPAQUE TO THE PLANNER'S INLINER. This predicate exists
--      to be written into a `WHERE` over app.knowledge_items, whose Page-scope columns §3.3
--      requires to be indexed and batch 040 indexed (`knowledge_items_page_scope_idx`). Pinning a
--      search_path this function does not need, on the object whose whole purpose is to be
--      substituted into a filter, would be 041 quietly undoing 040's index. This is a design
--      reason and NOT A MEASUREMENT: nothing here measures a query plan and nothing here claims to.
--
-- Both halves of (1) are load-bearing and neither is self-enforcing, so the static suite asserts
-- the BODY TEXT EXACTLY and asserts that it names no object. The day somebody adds a table
-- reference, the test fails and the pin becomes required — which is the shape a deviation should
-- have.
--
--
-- WHAT IS NOT HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO FIND
--
--   * NO `resolved_business_knowledge_v1`. The name exists; the shape does not. Owed to the
--     decision (c) describes.
--   * NO MERGE, NO PRECEDENCE RANK AND NO LAYER LABEL. §4.4 numbers Business 4 and Page 5, but its
--     layer 5 is "Page-specific facts/footer/contact" and a page-level `restrictions` item is not
--     a fact, a footer or a contact. Mapping 040's rows onto §4.4's numbering is an interpretation,
--     and an interpretation encoded as an integer is the hardest kind to argue with later.
--   * NO ARCHIVE FILTER. `archived_at` is 040's typed lifecycle field and §11.3 says archive closes
--     new creation while history stays readable by role. Whether archived knowledge is still IN
--     SCOPE for generation is a product question nobody has answered, and folding `archived_at is
--     null` into a predicate named "scope" would answer it silently and in the wrong place. A
--     caller adds the clause it wants and can see that it did.
--   * NO CHANGE TO ANY POLICY. This function is a FILTER, never a permission. Every case below
--     runs it under the caller's own identity and the row set it can reach is exactly the row set
--     040's policies already admit — narrower, never wider. `owner-a-cannot-resolve-the-
--     knowledge-item-of-business-b1` is the case that says so: the predicate answers TRUE for that
--     row and the caller still sees nothing.
--   * NO COMMAND FUNCTION AND NO `app_command` GRANT. 040 recorded that a client holding INSERT on
--     the version table can write a version whose `name` never was the item's, and that the command
--     surface owes it. It still does; 041 is a read-side contract and binds no write path.
--   * NOTHING ABOUT WORKSPACE LIFECYCLE VISIBILITY, unchanged from 020, 030 and 040. Owed to an RFC
--     plus batch 170.
--
--
-- WHO OWES THE DECISION
--
-- The undecided thing is the SHAPE OF RESOLVED KNOWLEDGE: the typed columns a knowledge item and
-- its version carry, whether a restriction has a `level(hard|soft)`, and which of (c)'s three
-- readings binds a Page row to a Business row. It is a contract-meaning change, so
-- CONTRIBUTING_AGENTS.md puts it behind an RFC: authored by A2 Knowledge (the family owner named
-- by §5 and §6), reviewed by A1 Security where the classification of a new column moves, and
-- approved by the Product Owner. The industry half is A2 Industry's and arrives as
-- `resolved_industry_pack_v1`; the client-facing object is a later batch in A2 Knowledge's range
-- under RFC-2026-021's criteria, once a caller exists.


-- ---------------------------------------------------------------------------------------------
-- app.knowledge_scope_applies — the scope half of the resolution rule, once.
-- ---------------------------------------------------------------------------------------------
--
-- `security invoker` is written out although it is the default, which is 021's habit and 011's
-- rule: a function that states every attribute of itself cannot acquire one by omission. It reads
-- no relation, so invoker mode changes nothing about what it can see; it is declared because a
-- later edit that made it a definer would then be a visible change to a line rather than the
-- absence of one.
--
-- `immutable`, because the answer is a property of the four arguments and of nothing else — no
-- table, no setting, no clock. `parallel safe` follows from the same fact.
create or replace function app.knowledge_scope_applies(
  item_business_profile_id      uuid,
  item_page_context_profile_id  uuid,
  in_business_profile_id        uuid,
  in_page_context_profile_id    uuid
)
returns boolean
language sql
immutable
parallel safe
security invoker
as $$
  select item_business_profile_id is not null
     and in_business_profile_id is not null
     and item_business_profile_id = in_business_profile_id
     and (
       item_page_context_profile_id is null
       or (in_page_context_profile_id is not null
           and item_page_context_profile_id = in_page_context_profile_id)
     )
$$;

comment on function app.knowledge_scope_applies(uuid, uuid, uuid, uuid) is
  'Owner: A2 Knowledge (knowledge.core, batch 041). The SCOPE half of the resolution rule at '
  'docs/plans/core-database-and-rls-workstream-th.md:217 — "Industry base → Business override → '
  'Page override → Content brief" — and only that half. Answers "is this knowledge row in scope '
  'for a request naming this Business and this Page", per §4 invariant 3 (Business scope '
  'mandatory, Page scope a nullable override), §3.3 and the industry pack contract''s "Page '
  'override ใช้ได้เฉพาะ target Page": a business-level row applies to every Page of its Business '
  'and to a request naming none; a page-level row applies to its own Page only. It does NOT '
  'resolve precedence, does not merge layers, does not read the industry pack and does not filter '
  'by archived_at — each of those needs a decision the source documents do not make (see the '
  'header). It is a FILTER and never a permission: it reads no relation, so a caller sees exactly '
  'the rows batch 040''s policies already admit, narrowed by this predicate and never widened. '
  'TOTAL: it never returns SQL NULL, because a predicate that is NULL filters like false in a '
  'WHERE and passes like true in a CHECK.';


-- ---------------------------------------------------------------------------------------------
-- Privileges.
-- ---------------------------------------------------------------------------------------------
--
-- §8.5: EXECUTE is revoked from PUBLIC and granted explicitly, exactly as 011 and 021 do. A helper
-- reachable by PUBLIC is reachable by every present and future role including ones no batch here
-- created.
--
-- `authenticated` AND `app_worker`, and NOTHING ELSE. The pair is chosen rather than inherited:
--
--   * `authenticated` is the request path (RFC-2026-019 §4) and the role batch 040 granted
--     column-scoped SELECT on app.knowledge_items. A predicate that filters rows the caller can
--     already read conveys no data — it returns a property of its own arguments — so this grant is
--     not the kind RFC-2026-021 §4's C1 is about, and 010's rule that "a grant issued ahead of the
--     thing that needs it is a grant nobody reviews against a caller" is a rule about privileges
--     over ROWS. There are no rows behind this one.
--   * `app_worker` for a reason that is 040's property and not symmetry. 040 grants the service
--     SELECT on both knowledge tables and NO POLICY, precisely so that an empty service read is
--     attributable to row level security rather than to a forgotten GRANT. If the service could
--     not execute this predicate, every service query written against the contract would come back
--     42501 on the FUNCTION instead of zero rows from RLS, and 040's attribution property would
--     hold for hand-written queries and quietly fail for the contract ones.
--     `service-resolves-zero-knowledge-items` is the case that keeps that true.
--
-- `anon` is granted nothing, which since 2026-09-06 is an approved decision rather than a habit:
-- RFC-2026-021 §7/4 — "`anon` is granted nothing: no schema USAGE, no table or column privilege,
-- NO FUNCTION EXECUTE, anywhere our migrations reach". `app_command`, `app_maintenance` and
-- `app_authz` are granted nothing either: there is no command surface for knowledge.core, the
-- retention path is 160, and RFC-2026-020 §6.1/6 pins app_authz's grants to USAGE on schema app
-- plus four columns of app.workspace_members. All five absences are asserted below against the
-- live ACLs, because an absence is not a control until something fails when it ends.
revoke all on function app.knowledge_scope_applies(uuid, uuid, uuid, uuid) from public;
grant execute on function app.knowledge_scope_applies(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function app.knowledge_scope_applies(uuid, uuid, uuid, uuid) to app_worker;


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004, 011, 020, 021, 030 and 040 use. Two things are different here and both
-- are because this batch's whole content is one pure function.
--
-- FIRST, THE BEHAVIOUR IS ASSERTED AND NOT ONLY THE CATALOG. Every earlier block could only read
-- pg_catalog, because what those batches created was tables and policies and a migration cannot
-- exercise a policy without an identity. A pure predicate CAN be exercised: the nine calls below
-- are the resolution rule's truth table, run on every apply, in the same transaction that created
-- the function. 040's scar is the reason it is worth doing — its static test and its apply-time
-- block both matched a whole policy body, so a reversal that gutted one half of it went unnoticed.
-- A truth table cannot be half-satisfied.
--
-- SECOND, THE IDS ARE GENERATED RATHER THAN WRITTEN. Fixture ids are recomputable uuid5 values
-- derived from db/foundation/seeds/fixture-catalog.json and are never invented, and a uuid literal
-- typed into a migration would be an invented one. The claims below are about the ALGEBRA and not
-- about any particular row, so three fresh uuids say it exactly and say it without inventing an
-- identity. `gen_random_uuid()` unqualified, as batch 000 established.
--
-- NOTHING BELOW ASSERTS A PROPERTY AN APPROVED DECISION IS EXPECTED TO CHANGE, which is 030's rule
-- and 021's scar: an applied migration's self-assertion that a later approved decision falsifies is
-- a migration that has to be routed around. The grant set is asserted as the NEGATIVE half only —
-- the four roles that must hold nothing — because that is the half RFC-2026-021 §7/4 and
-- RFC-2026-020 §6.1/6 decide. That `authenticated` and `app_worker` DO hold EXECUTE is asserted in
-- the static suite, where the batch that changes it edits a line a reviewer reads.
--
-- `pg_roles` and never `pg_authid`, for batch 020's reason: pg_authid is readable only by a
-- superuser, and on the target platform `postgres` is not one.
do $$
declare
  fn        regprocedure := 'app.knowledge_scope_applies(uuid, uuid, uuid, uuid)'::regprocedure;
  offending text;
  business  uuid := gen_random_uuid();
  page      uuid := gen_random_uuid();
  sibling   uuid := gen_random_uuid();
  elsewhere uuid := gen_random_uuid();
begin
  -- The function is what it says it is. `prosecdef` false is invoker mode; `provolatile` 'i' is
  -- IMMUTABLE; an empty `proconfig` is the deliberate absence of a `SET` clause the header argues
  -- for, asserted here so that adding one is a failure rather than a silent change of plan.
  select string_agg(problem, '; ') into offending
    from (
      select 'it is SECURITY DEFINER'::text as problem from pg_catalog.pg_proc p
        where p.oid = fn::oid and p.prosecdef
      union all
      select 'it is not IMMUTABLE'::text from pg_catalog.pg_proc p
        where p.oid = fn::oid and p.provolatile <> 'i'
      union all
      select 'it pins a configuration setting'::text from pg_catalog.pg_proc p
        where p.oid = fn::oid and p.proconfig is not null
    ) as findings;
  if offending is not null then
    raise exception 'app.knowledge_scope_applies is not the function batch 041 declares: %', offending
      using hint = 'The header states every attribute of this function and gives a reason for each. '
                   'A SECURITY DEFINER predicate would read relations as its owner; a non-IMMUTABLE '
                   'one would be a filter whose answer could depend on something other than its '
                   'arguments; and a SET clause would be a search_path pin the body has no object to '
                   'need, on the one object whose purpose is to be substituted into a filter.';
  end if;

  -- THE RESOLUTION RULE'S TRUTH TABLE, RUN. Nine calls, and every one of them is a sentence from
  -- the source documents rather than a case somebody thought of.
  --
  -- 1-2. A BUSINESS-LEVEL ROW REACHES EVERY PAGE OF ITS BUSINESS, AND A REQUEST NAMING NO PAGE.
  --      §4.4 layer 4 sits above layer 5 for the same page, and 040's header says business-level
  --      knowledge "reaches every Page beneath it".
  if not app.knowledge_scope_applies(business, null::uuid, business, page) then
    raise exception 'a business-level knowledge row does not apply to a Page of its own Business'
      using hint = '§4 invariant 3 makes the Business scope the one every knowledge row carries, and '
                   '§4.4 puts Business policy at layer 4 with Page-specific facts at layer 5 — both '
                   'in play for one Page. A Business layer that did not reach the Page would leave '
                   'layer 5 resolving against nothing.';
  end if;
  if not app.knowledge_scope_applies(business, null::uuid, business, null::uuid) then
    raise exception 'a business-level knowledge row does not apply to a request naming no Page';
  end if;

  -- 3-4. A PAGE-LEVEL ROW APPLIES TO ITS OWN PAGE AND TO NO SIBLING.
  --      §3.3: knowledge "ที่จำกัดเฉพาะเพจ". industry-research-pack:653: "Page override/contact/
  --      footer ใช้ได้เฉพาะ target Page".
  if not app.knowledge_scope_applies(business, page, business, page) then
    raise exception 'a page-level knowledge row does not apply to its own Page';
  end if;
  if app.knowledge_scope_applies(business, page, business, sibling) then
    raise exception 'a page-level knowledge row applies to a SIBLING Page of the same Business'
      using hint = 'This is the leak the whole nullable-override design exists to prevent, and it is '
                   'the one a hand-written query gets wrong by dropping a branch: a filter that kept '
                   'only `business = $1` returns every Page''s knowledge to every Page.';
  end if;

  -- 5. THE CELL THAT WOULD BE NULL IF THE PREDICATE WERE WRITTEN THE OBVIOUS WAY. A page-level row
  --    against a request naming no Page: `item_page is null or item_page = null` is NULL, which
  --    filters like false in a WHERE and passes like true in a CHECK.
  if app.knowledge_scope_applies(business, page, business, null::uuid) is distinct from false then
    raise exception 'a page-level knowledge row is not definitively excluded from a request naming no Page'
      using hint = 'It must be FALSE and not NULL. §3.3 restricts a page-level row to its Page, so a '
                   'request naming no Page excludes it — and a predicate that answers NULL means one '
                   'thing in a WHERE clause and the opposite in a CHECK constraint.';
  end if;

  -- 6-7. ANOTHER BUSINESS IS NEVER IN SCOPE, INCLUDING WHEN THE PAGE MATCHES. §4 invariant 3 makes
  --      the Business scope mandatory and requires a Page override to be under the SAME Business,
  --      which batch 040 spells as a three-column composite foreign key.
  if app.knowledge_scope_applies(business, null::uuid, elsewhere, page) then
    raise exception 'a business-level knowledge row applies outside its own Business';
  end if;
  if app.knowledge_scope_applies(business, page, elsewhere, page) then
    raise exception 'a page-level knowledge row applies under a Business that is not its own';
  end if;

  -- 8-9. TOTALITY. The function returns a boolean for every input, including the two a caller can
  --      only reach by passing a null where the schema has none.
  if app.knowledge_scope_applies(null::uuid, page, business, page) is distinct from false
     or app.knowledge_scope_applies(business, page, null::uuid, page) is distinct from false then
    raise exception 'app.knowledge_scope_applies returns NULL rather than false for a null scope'
      using hint = 'A three-valued contract means one thing in a WHERE clause and the opposite in a '
                   'CHECK constraint. Every conjunct that can be null is guarded by an `is not null` '
                   'beside it, so the whole expression is false rather than unknown.';
  end if;

  -- The four roles that must hold no EXECUTE, and PUBLIC with them. RFC-2026-021 §7/4 decides
  -- `anon`; RFC-2026-020 §6.1/6 pins app_authz; there is no command surface for knowledge.core and
  -- the retention path is batch 160. `has_function_privilege` answers for PUBLIC through the
  -- 'public' pseudo-role, which is what the `revoke` above is about.
  --
  -- The four named roles are reached through `pg_roles` rather than an array of literals, which is
  -- batch 020's rule about `pg_authid` doing a second job here: `has_function_privilege` RAISES on
  -- a role that does not exist, so an array of names would turn "this role is absent" into a
  -- migration failure that reads like a privilege finding. The join skips an absent role, which is
  -- the same shape 040's grant sweeps have and is honest about what it can see.
  select string_agg(grantee, ', ') into offending
    from (
      select r.rolname::text as grantee
        from pg_catalog.pg_roles r
       where r.rolname in ('anon', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_function_privilege(r.rolname, fn::oid, 'EXECUTE')
      union all
      select 'public'::text
       where pg_catalog.has_function_privilege('public', fn::oid, 'EXECUTE')
    ) as held;
  if offending is not null then
    raise exception 'a role batch 041 grants nothing holds EXECUTE on the resolution predicate: %', offending
      using hint = 'RFC-2026-021 §7/4 decides that anon holds no function EXECUTE anywhere our '
                   'migrations reach, RFC-2026-020 §6.1/6 pins app_authz to four columns of '
                   'app.workspace_members, and PUBLIC is revoked by §8.5 so that a role no batch here '
                   'created cannot inherit the contract.';
  end if;

  -- The premise the two branches rest on, read from the catalog rather than assumed: batch 040's
  -- Business scope is NOT NULL and its Page scope is nullable. If a later batch made the Page
  -- mandatory, the `is null` branch would be about no row and this contract would be a two-branch
  -- predicate with one reachable branch — passing, and meaningless.
  select string_agg(format('%s is %s', a.attname,
                           case when a.attnotnull then 'NOT NULL' else 'nullable' end), ', ')
    into offending
    from pg_catalog.pg_attribute a
   where a.attrelid = 'app.knowledge_items'::regclass
     and ((a.attname = 'business_profile_id' and not a.attnotnull)
          or (a.attname = 'page_context_profile_id' and a.attnotnull));
  if offending is not null then
    raise exception 'the two-column scope batch 041 resolves is no longer the shape §4 invariant 3 gives it: %', offending
      using hint = '"Knowledge/Research/Content/Asset ทุก row มี Business scope; Page scope เป็น '
                   'nullable override" — a mandatory Business and an optional Page. A predicate '
                   'branching on `page is null` against a NOT NULL page is a branch nothing takes.';
  end if;
end $$;
