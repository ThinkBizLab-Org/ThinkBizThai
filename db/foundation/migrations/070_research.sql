-- Batch 070 — research: the run, what it cited, what it captured, what it proved, what it proposes.
--
-- Owner: A2 Research. The migration ownership registry (§6) reserves 070 to this package, describes
-- it as "research/evidence/suggestion", and depends it on 030, 040, 050 and 061. §5's inventory
-- names the same family from the other side — "runs/sources/snapshots/evidence/suggestions", scoped
-- `business/page`, mutability "mixed; evidence immutable", sensitivity CONTENT-2/COPYRIGHT-3,
-- retention RESEARCH-*.
--
-- Depends on: 000 (schemas, private.set_updated_at), 001 (app_worker), 010 (app.workspaces),
-- 011 (app.is_active_member, app.workspace_member_role), 020 (app.business_profiles,
-- app.page_context_profiles and the unique keys their children reference), 021
-- (app.member_scope_admits_business, app.member_scope_admits_page). All are merged; migration
-- invariant 1 forbids rewriting any of them and NOTHING BELOW DOES — every statement here creates a
-- new object or attaches a policy to one this file created, and no `drop policy` names a policy
-- another batch wrote. A test asserts that pairing rather than trusting this sentence.
--
-- 030, 050 AND 061 ARE THE REGISTRY'S DECLARED DEPENDENCIES AND NOT ONE STATEMENT BELOW NAMES A
-- TABLE OF ANY OF THEM, which is worth saying because a reader will look for the joins. 040 IS
-- REFERENCED BY NEITHER A STATEMENT NOR A COLUMN EITHER, and its influence is larger than the three
-- that are. Each is consumed as a reading:
--
--   * 040 settled the shape of a `business/page` family in this schema: `business_profile_id` NOT
--     NULL, `page_context_profile_id` a nullable override with a THREE-column composite foreign key,
--     one restrictive narrowing per table asking the Business question or the Page question per row,
--     and a child whose reach is its parent's reach asserted rather than copied. §4 invariant 3
--     names Knowledge and Research in one breath, so the shape below is 040's, deliberately, and the
--     places it differs are named where they differ.
--   * 030 is the batch a resolved research recipe would read (`research_recipes` lives on an
--     industry pack version, which batch 030 did not create), and nothing here reads an industry
--     pack: 041 recorded at length why the pack's rule content is not in the database and is not
--     A2 Knowledge's or A2 Research's to put there. A dependency the SQL does not have is not
--     invented as a foreign key (040's rule about 030, 050's about 011, 131's about 050).
--   * 050 is the queue a research run executes on, and 061 is the meter that records what it cost.
--     Both are consumed as REFUSALS below — no `job_id` column on a run, no cost column anywhere —
--     and each refusal names the retention arithmetic that decides it.
--
--
-- ============================================================================================
-- FIVE OBJECTS, FIVE TABLES, AND THE ONE THE REGISTRY DOES NOT NAME
-- ============================================================================================
--
-- Three documents describe this family and no two describe the same set:
--
--   §5 inventory   `research.core` | runs/sources/snapshots/evidence/suggestions | business/page |
--                  mixed; evidence immutable | CONTENT-2/COPYRIGHT-3 | RESEARCH-* | A2 Research
--   §6 registry    "research/evidence/suggestion"
--   §4 ERD         BUSINESS_PROFILE ||--o{ RESEARCH_RUN : researches
--                  RESEARCH_RUN     ||--o{ RESEARCH_SOURCE : cites
--                  RESEARCH_SOURCE  ||--o{ EVIDENCE_ITEM : supports
--                  RESEARCH_RUN     ||--o{ RESEARCH_SUGGESTION : proposes
--                  RESEARCH_SUGGESTION o|--o{ CONTENT_IDEA : inspires
--
-- Five names, three words, four entities. Batch 050 met the same disagreement and resolved it by
-- taking the registry's list and refusing what only the other two named; that resolution does not
-- transfer unexamined, and the reason it does not is worth stating because it looks like an
-- inconsistency.
--
-- 050's deciding argument was never "the registry is short". It was that `CTR-JOB-001` models
-- attempts as SCALARS ON THE JOB, so an attempt table would have been a second source of truth for
-- a fact the contract already fixes; and that a dead-letter queue is a STATE whose vocabulary the
-- same contract's freeze boundary reserves to an owner review. The registry row was corroboration.
-- There is no contract for research at all — `contract-catalog/` contains no `CTR-RES-*` and no
-- research envelope — so nothing here can play the part `CTR-JOB-001` played there, and the
-- question has to be answered from the documents that do exist.
--
--   * RESEARCH_SOURCE IS CREATED although the registry's three words do not spell it. §4 gives it
--     its own entity AND a relation on BOTH sides — a run cites many sources, a source supports many
--     evidence items — so folding it into the run would leave "which source supports this evidence"
--     unanswerable, and folding it into evidence would give one citation per piece of evidence,
--     which §11.1's export domain ("Research citation/evidence metadata", two things) reads as two.
--     §5 names it. The registry's "research" is a family word, the way "model/policy/credential
--     reference" is three words for three tables and "knowledge + typed profiles" is two words for
--     two tables and six named profiles.
--
--   * RESEARCH_SNAPSHOT IS CREATED although NEITHER the registry NOR the ERD names it, and this is
--     the decision in this batch most worth arguing with. Four documents name it, and three of them
--     give it a property no other row in this family has:
--
--       §5   lists "snapshots" between sources and evidence.
--       §9.1 gives it a SENSITIVITY CLASS OF ITS OWN — `COPYRIGHT-3` "research snapshot/excerpt",
--            where every other row here is `CONTENT-2`.
--       §10  gives it a RETENTION CLASS OF ITS OWN — `RESEARCH-SNAPSHOT`, 30 days, against
--            `RESEARCH-RUN`'s twelve months, with a different final behavior.
--       §15  `DATA-DEC-07` is an open decision about it BY NAME.
--
--     A class is a property of STORAGE (§9's own column is "Storage/log rule") and a retention class
--     is a property of a SWEEP, and a sweep purges a table and a column. §10's final behavior for
--     `RESEARCH-SNAPSHOT` is the sentence that settles it:
--
--       "purge object + locator; preserve permitted hash/citation metadata"
--
--     That is one instruction about TWO ROWS WITH DIFFERENT FATES. The captured thing dies and the
--     citation survives it. A snapshot folded into `app.research_sources` would put a `COPYRIGHT-3`
--     locator with a thirty-day life in the same row as `CONTENT-2` citation metadata with a
--     twelve-month life, and one row cannot half-survive a purge. So the snapshot is its own table,
--     the gap is in the REGISTRY and in §4's ERD rather than in this file, and it is recorded in the
--     work package's open blockers — which is how 060 reported the generation-run table no registry
--     row gives anybody, and how 061 reported it a second time.
--
-- SO THIS BATCH CREATES FIVE TABLES, one per name in §5, and every one of them is argued above or
-- below rather than inherited from a list.
--
--
-- ============================================================================================
-- `COPYRIGHT-3`: WHAT THIS SCHEMA MAY HOLD AT ALL, WHICH IS A LOCATOR AND A HASH AND NOT A PAGE
-- ============================================================================================
--
-- §9.1's row, in full:
--
--   | `COPYRIGHT-3` | research snapshot/excerpt | restricted, retention/policy bound |
--   | approved excerpt only |
--
-- and §9.2's absolute prohibitions end with the one that names this family:
--
--   ห้ามเก็บหรือส่งออกใน client/API/event/job/log/fixture: … full research snapshot ที่ client ไม่มี
--   สิทธิ์ทำซ้ำ
--
-- — a full research snapshot the client has no right to reproduce may not be STORED OR EXPORTED in
-- a client surface, an API, an event, a job, a log OR A FIXTURE. §11.1/5 says it again from the
-- export side: a PDPA export excludes "copyrighted raw snapshot", while §11.1's minimum export
-- domains include "Research citation/evidence metadata และ permitted excerpts".
--
-- Batch 060 answered the structurally identical question for `SECRET-4` and its answer is the one
-- this batch reuses, in terms: the control is not a CHECK that recognises a secret, it is that THE
-- PLAINTEXT COLUMN DOES NOT EXIST, plus an apply-time ALLOWLIST of the columns the table may hold —
-- "a denylist of column names somebody thought of is defeated by the one they did not". 131 reused
-- it for a payment instrument. Applied here:
--
--   1. THERE IS NO SNAPSHOT BODY COLUMN. No `content`, no `body`, no `html`, no `text`, no `raw`, no
--      `document`, no `bytes`. The apply-time block holds `app.research_snapshots` to an explicit
--      column allowlist against the live catalog, so a later batch that adds one fails the migration
--      rather than the code review.
--
--   2. WHAT THE ROW HOLDS INSTEAD IS EXACTLY WHAT §10 SAYS SURVIVES AND WHAT IT SAYS DIES.
--      "purge object + locator" — so `object_ref` is a LOCATOR, in the reference shape batch 050
--      established, and it is NULLABLE, because a purged snapshot is a row whose locator is gone.
--      "preserve permitted hash/citation metadata" — so `content_hash` is NOT NULL and outlives the
--      object, and the citation lives one table up in `app.research_sources`. The nullability of one
--      column and the not-nullability of the other ARE §10's sentence, expressed where a sweep can
--      act on it.
--
--   3. THERE IS NO EXCERPT COLUMN, ANYWHERE IN THIS BATCH, AND THAT IS THE PART A REVIEWER SHOULD
--      PRESS ON. §9.1 permits "approved excerpt only" as a CLIENT PROJECTION, and §11.1 exports
--      "permitted excerpts", so an excerpt is a thing this system will eventually hold. Two words in
--      those sentences have no referent in this repository: APPROVED and PERMITTED. Nothing defines
--      what approves an excerpt, who may approve one, how long an approved excerpt may be, or what a
--      source's own policy has to say first — and `DATA-DEC-07`'s scope is "ก่อน real research
--      source", which is to say the source-policy machinery does not exist either.
--
--      An `excerpt text` column with no bound is a snapshot column wearing a shorter name: it holds
--      a whole page, and the day somebody writes one into it §9.2's prohibition has been violated by
--      a column rather than by a decision. An `excerpt text check (length(excerpt) <= N)` fixes N,
--      and N is precisely the number "approved excerpt only" leaves to whoever decides what an
--      approval is. RFC-2026-008's reasoning about a card number applies unchanged to a copyrighted
--      page: the scan walks the working tree, git history is not scanned, and RFC-2026-002 forbids
--      the force-push that would be the usual remediation — so the control is placed one step
--      earlier than the scanner, and there is no column.
--
--      WHAT IS LOST BY THAT, STATED RATHER THAN ABSORBED: `app.research_evidence` records that a
--      claim is supported by a source at a captured state and does not record WHAT THE SOURCE SAID.
--      A consumer that wants the quoted words dereferences the locator under whatever approval the
--      decision defines. The excerpt is owed to the batch that brings that decision, exactly as
--      §8.3's "BYOK credential manage" is owed to the batch that brings the command surface (060).
--
--   4. AND THE FIXTURE IS INSIDE §9.2's LIST. "client/API/event/job/log/FIXTURE" — so
--      tests/db/identity/fixtures/070-research-fixture.sql carries no captured text either, and its
--      `content_hash` values are digests of a synthetic string this repository owns. A fixture is
--      the place a prohibition is most often broken for convenience, and §9.2 names it.
--
-- THE SOURCE URI IS NOT COPYRIGHTED AND IS STORED, WITH ITS FORM CONSTRAINED. A citation without the
-- thing cited is not a citation, and §11.1 exports "Research citation … metadata". `source_uri` is
-- therefore a real column — and it is the one column in this batch A WORKER WILL DEREFERENCE, which
-- is the shape `CTR-JOB-001`'s `x-reference-rule` was written about: independent security review
-- found the earlier deny-list form of a reference field accepting `HTTPS://…`, `//host/x`,
-- `file:///etc/passwd`, `javascript:` and `../../../etc/passwd`. So the scheme is an ALLOWLIST of
-- one, `https`, and `..` is refused by a second constraint rather than by a clever pattern. That
-- allowlist is 070's own reading and is stated so a reviewer can refuse it: no document says a
-- research source must be `https`, and the alternative — accepting `http` — is a decision about what
-- a fetcher may be pointed at, which is a security decision rather than a schema one.
--
--
-- ============================================================================================
-- `DATA-DEC-07` IS OPEN, AND THIS SCHEMA MAKES ITS ABSENCE VISIBLE RATHER THAN ASSUMING IT
-- ============================================================================================
--
-- §15's row:
--
--   | `DATA-DEC-07` | Research snapshot retention | 30 วัน max default | Research+Legal |
--   | ก่อน real research source |
--
-- and §15's own closing sentence: "การที่ decision ยังเปิดอยู่ไม่อนุญาตให้ Agent เลือกเอง" — an open
-- decision is not an agent's to choose. §10's `RESEARCH-SNAPSHOT` says the same number twice over
-- and adds the half that matters: "30 วัน default หรือสั้นกว่าตาม SOURCE POLICY" — thirty days, or
-- SHORTER according to the source's own policy.
--
-- There are three things a migration could do and two of them are wrong:
--
--   * WRITE THE NUMBER. `retention_until timestamptz not null default now() + interval '30 days'`.
--     This is the failure batch 010 refused for `DATA-DEC-04`, 130 for `BILL-DEC-012` and 061 for a
--     reservation's expiry: a default is ratification. It is worse here than in any of those,
--     because the number is a MAXIMUM whose real value is per-source and smaller, so a default would
--     be wrong in the unsafe direction on every row a stricter source policy covers.
--   * IGNORE IT. Leave the row with no retention column at all and let batch 160 work it out. Then
--     every snapshot in the database is retained until somebody writes a sweep, the open decision is
--     invisible in the schema, and the state of the system is indistinguishable from one where the
--     decision was made and the answer was "forever".
--   * MAKE THE ABSENCE STRUCTURAL. Which is what is done, in four parts.
--
-- 1. `retention_until` IS `not null` WITH NO DEFAULT AND NO ARITHMETIC ANYWHERE IN THIS FILE. Every
--    snapshot states the instant beyond which it may not be retained, and no row can acquire one by
--    inheriting a number nobody approved. A writer that cannot name a limit cannot store a capture.
--    That is 010's treatment of an invitation's `expires_at` and 061's of a reservation's, and it is
--    load-bearing here in a way it was not there: with a default, every row would silently assert
--    the same thirty days and `DATA-DEC-07` would be closed by a column.
--
-- 2. `retention_until` IS OUTSIDE EVERY UPDATE GRANT, TO EVERY ROLE. A retention window that can be
--    extended by an update is not a retention window; it is a suggestion. The apply-time block
--    asserts that per column against the live ACL, which is where §8.5's rule is enforced rather
--    than in a WITH CHECK a later edit could weaken.
--
-- 3. NO NUMBER OF DAYS APPEARS IN THIS MIGRATION, AND THE MIGRATION ASSERTS SO ABOUT ITSELF. The
--    apply-time block reads `pg_get_constraintdef` for every CHECK on the five tables and refuses
--    one that mentions an interval, and it reads `pg_attribute.atthasdef` and refuses a default on
--    `retention_until`. A negative is the strongest thing a lint can hold (RFC-2026-019 §5), and the
--    day `DATA-DEC-07` closes, the batch that encodes its number edits an assertion a reviewer
--    reads instead of adding a default nobody sees.
--
-- 4. THE ROW RECORDS WHETHER THE PURGE HAS HAPPENED, SO "OVERDUE" IS A QUERY RATHER THAN A GUESS.
--    `purged_at` is null until the object and its locator are gone, and
--    `research_snapshots_purged_row_names_no_object` requires a purged row to hold no `object_ref`.
--    With those two columns, "this repository is holding captured material past its own stated
--    limit" is `where purged_at is null and retention_until < now()` — a question anyone can ask of
--    the database, on a schedule nobody has written yet. Without them a snapshot that is overdue and
--    a snapshot that was purged are the same row.
--
--    That is 061's `computed_through` in a different family and for a different reason: the
--    watermark made a disagreement between a ledger and its aggregate DETECTABLE rather than
--    resolvable, because resolving it was batch 132's. These two columns make a retention breach
--    detectable rather than preventable, because preventing it is batch 160's and the NUMBER is
--    Research+Legal's. Neither column computes anything, repairs anything, or decides what happens
--    when it is wrong.
--
-- WHAT THIS DOES NOT DO, NAMED SO NOBODY READS MORE INTO IT. It does not enforce thirty days, it
-- does not enforce a source policy, it does not purge anything, and it does not stop a writer
-- putting a retention limit ten years out. §10's own header requires Product/Security/Legal approval
-- before Paid Beta and §6's registry gives the sweep to batch 160; a schema can make a policy
-- CHECKABLE and cannot make it TRUE.
--
--
-- ============================================================================================
-- "MIXED; EVIDENCE IMMUTABLE" IS FIVE DECISIONS, AND THEY COME OUT THREE DIFFERENT WAYS
-- ============================================================================================
--
-- §5's mutability column reads "mixed; evidence immutable". One of the five objects is named. The
-- other four are "mixed", which is not a disposition — it is a statement that the family has more
-- than one, and it leaves four decisions to this batch. Batch 131 met the three-object version of
-- the same sentence ("versioned + ledger-like") and recorded that applying one answer uniformly
-- would have been wrong twice; the same is true here, and this is the answer for each object
-- separately with its own reason.
--
-- IMMUTABILITY HERE IS ABSENT GRANTS **AND** ABSENT POLICIES, ASSERTED BOTH WAYS FROM THE LIVE
-- CATALOG, AND IT IS NEVER A TRIGGER. Batch 140 used a trigger and had a reason no table here has —
-- an audit log's adversary can own the table, because the operator is its whole subject. A research
-- row's adversary is a caller reaching it through a granted path, and the control that refuses that
-- caller is the absence of the verb. Both halves are asked, because either alone can be satisfied
-- while the other is wrong: a policy with no grant is inert, and a grant with no policy is refused
-- by row level security, which is a weaker refusal than immutability asks for (130's sentence, kept
-- by 131 and kept again here).
--
-- 1. `app.research_runs` — MUTABLE. §8.2 marks "Start/cancel Research" `Y` for the owner, the admin
--    AND the editor, and a cancel is an operation on a row that already exists. §10's `RESEARCH-RUN`
--    retains "brief/STATUS/suggestion/evidence metadata", and a status is by definition a thing that
--    moves. So the run carries `updated_at` and §3.2's trigger, and the columns that say WHICH run
--    it is — the identity, all three scope columns and the brief — are outside every UPDATE grant.
--
-- 2. `app.research_sources` — APPEND-ONLY, and this is 070's own reading rather than a quotation.
--    §5 names only evidence immutable, so a reviewer is entitled to disagree with this one; here is
--    the argument. §10's `RESEARCH-SNAPSHOT` final behavior preserves "permitted hash/CITATION
--    metadata" AFTER purging the captured object — the citation is the half that must outlive the
--    thing it describes. A citation that can be edited after its snapshot is gone is a claim about a
--    document nobody can check any more, and §11.1 exports it as a record ("Research citation/
--    evidence metadata") rather than as a current statement. So: no UPDATE or DELETE grant to any
--    role, no UPDATE or DELETE policy, no `updated_at` column and no trigger, because an append-only
--    row has no update to stamp (020's words, kept by 030, 040, 050, 130, 131 and kept again).
--
--    THE COST OF BEING WRONG ABOUT THIS IS SMALL AND IN THE SAFE DIRECTION, which is why the reading
--    is taken rather than deferred: nothing can write a source today at all — §8.2 gives no client
--    INSERT and app_worker holds grants and no policy — so the disposition decides only what a LATER
--    batch has to do. Adding a grant is a forward migration; taking one away after a writer exists
--    is a behaviour change with a data question attached.
--
-- 3. `app.research_snapshots` — MUTABLE IN EXACTLY TWO COLUMNS, which is batch 050's outbox shape
--    and batch 131's receipt shape. §10 requires the row to lose its locator and to record that it
--    did, so `object_ref` and `purged_at` move; everything that says WHAT WAS CAPTURED — the source,
--    the content hash, the instant, and the retention limit — is append-only. The apply-time block
--    asserts that PER COLUMN against the live ACL rather than against the grant text below, because
--    a grant made by a later batch would not appear in this file at all.
--
-- 4. `app.research_evidence` — IMMUTABLE. The one disposition §5 states, and this batch adds
--    nothing to it except the three forms this repository expresses it in: no UPDATE or DELETE grant
--    to any role INCLUDING the service, no UPDATE or DELETE policy for any role, and no `updated_at`
--    column and no trigger. §8.2's "Research run/source/evidence INSERT" is `N N N N N S`, so
--    appending is the service's and mutation is nobody's.
--
-- 5. `app.research_suggestions` — MUTABLE. §8.2's "Suggestion save/dismiss/use" gives the owner, the
--    admin and the editor three verbs, and every one of the three is an operation on an existing
--    row: a suggestion is proposed by a run and then saved, dismissed or used by a person. The three
--    verbs are stored as the three timestamps the matrix names, and no status vocabulary is invented
--    — 010's refusal for an invitation, 021's for a member scope, 050's for a job, 060's for a
--    model, 061's for a reservation, 131's for a receipt.
--
--
-- ============================================================================================
-- §8.2's FOUR ROWS, AND WHICH HALF OF EACH THIS SCHEMA CAN REACH
-- ============================================================================================
--
--   | Knowledge/Research SELECT               | Y | Y | Y | Y | Y | P |
--   | Start/cancel Research                   | Y | Y | Y | N | N | P |
--   | Research run/source/evidence INSERT     | N | N | N | N | N | S |
--   | Suggestion save/dismiss/use             | Y | Y | Y | P | N | P |
--
-- THE FIRST ROW IS IMPLEMENTED IN FULL, ON FOUR OF THE FIVE TABLES. "Knowledge/Research SELECT" is
-- `Y` for every built-in role, so the predicate tests ACTIVE MEMBERSHIP and not role —
-- `app.is_active_member(workspace_id)`, which is 040's policy on the family §4 invariant 3 names in
-- the same sentence as this one.
--
-- THE FIFTH TABLE IS EXCLUDED FROM IT AND THAT IS §9.1 READ RATHER THAN §8.2 IGNORED.
-- `app.research_snapshots` is the only row in this family §9.1 classes `COPYRIGHT-3`, whose client
-- projection is "approved excerpt only" rather than `CONTENT-2`'s "through RLS". The narrower, more
-- specific statement wins — 060's rule when §5's classes did not cover its own tables — so no client
-- role is granted anything on the snapshot, and the client projection §9.1 does license is owed to
-- whoever defines an approval. §9.2 says the same thing as a prohibition rather than as a
-- classification, which is why the refusal is a missing GRANT and a missing COLUMN rather than a
-- policy predicate somebody could widen.
--
-- THE SECOND ROW IS IMPLEMENTED IN HALF, AND THE HALF IT IS NOT IS THE HALF THE THIRD ROW REFUSES.
-- "Start/cancel Research" is `Y` for owner, admin and editor. A CANCEL is an update of an existing
-- run, and it is implemented: `authenticated` holds `update (cancel_requested_at, updated_by)` on
-- `app.research_runs` and a policy naming those three roles. A START is the creation of the run row,
-- and the very next line of the same matrix marks "Research run/source/EVIDENCE INSERT" `N` for
-- every client column. The two rows are not in conflict: one is a COMMAND a person issues and the
-- other is the ROW a service writes, exactly as §8.4's "Job redacted status SELECT" and "Internal
-- job/attempt/DLQ payload" are one table and two objects. RFC-2026-012 §4 names the mechanism for
-- the first — a `SECURITY DEFINER` command function owned by `app_command` — and RFC-2026-021 §10
-- records that none exists, so `app_command` is granted nothing here and the start half is owed to
-- the batch that brings that surface.
--
-- THE THIRD ROW IS THE `S` CELL AND IT IS CLASSIFIED RATHER THAN WRITTEN. See the next section.
--
-- THE FOURTH ROW IS IMPLEMENTED FOR ITS THREE `Y` COLUMNS AND REFUSED FOR ITS `P`. The approver's
-- `P` is refused for the reason 010, 011, 020, 021, 030, 061 and 130 all gave and `RFC-2026-020` §8
-- states as an approved decision: "`P` is 'passes per policy/explicit capability' and no document
-- defines the capability set… Still open, still not an agent's to choose (§15)." Writing
-- `in ('owner', 'admin', 'editor', 'approver')` would delete the distinction between `Y` and `P`.
-- The viewer's `N` is implemented as silence and asserted as a refused write.
--
-- AND THE ROW §8.2 DOES NOT CONTAIN. There is no cell anywhere in §8's four matrices for CREATING a
-- suggestion or a snapshot. Where a document is silent the cell is denied — 030's reading of the
-- same silence, kept by 050, 060, 061, 110 and 131 — so no client role holds INSERT on either, and
-- the service's INSERT on the suggestion and the snapshot is not an `S` cell either (see below).
--
-- THE EDITOR IS `Y` HERE AND WAS `P` IN §8.1, WHICH IS 040's DISTINCTION AND IS KEPT UNCHANGED. A
-- `P` cell requires an EXPLICIT scope — `member_scope_covers_*`, false for an unscoped member, which
-- is how 021 and 030 write the editor's cell. A `Y` cell is NARROWED by scope where one exists —
-- `member_scope_admits_*`, true for an unscoped member — because §8's legend reads `Y` as "ผ่านเมื่อ
-- active + capability + scope ตรง" and §7 reads a scope as narrowing a role's ceiling rather than
-- granting anything. Every client cell this batch implements is a `Y`, so every narrowing below is
-- `admits` and none is `covers`.
--
-- MEMBERSHIP AND SCOPE ARE READ THROUGH THE HELPERS AND NEVER BY JOINING THE TABLES
-- (`RFC-2026-020` §5/5, and 020's reason unchanged: a policy that scanned `app.workspace_members`
-- would evaluate that scan AS THE CALLER, so another module's whole policy set would expand inside
-- this table's evaluation). Not one predicate below names `app.workspace_members` or
-- `app.workspace_member_scopes`, and a static test asserts it.
--
--
-- ============================================================================================
-- THE `S` CELL: THREE STATEMENTS, ALL CARRIED, AND NO SERVICE POLICY
-- ============================================================================================
--
-- §8.2's "Research run/source/evidence INSERT | N N N N N | S" is an `S` cell and `RFC-2026-022`
-- (approved 2026-09-08) is the decision that says what one looks like. Its §3 does NOT classify this
-- cell — the RFC's own table names 050, 051, 061, 110, 120, 131 and the asset purge, and stops — so
-- unlike 051, 061, 110 and 131 this batch applies §3's operational test rather than checking a
-- verdict against a statement. The test: add the confinement term to the statement's own predicate
-- and ask whether it still addresses the same work.
--
--   * `app.research_runs` INSERT. The statement is "record a run for this workspace, this Business
--     and (optionally) this Page, with this brief". Add
--     `and workspace_id = (select nullif(current_setting('app.workspace_id', true), '')::uuid)` to
--     its `WITH CHECK` and it writes the same row: the run's workspace is what the REQUESTER asked
--     about, resolved by the server before the work was enqueued — `CTR-TEN-001`'s trust boundary is
--     "Server-resolved only after membership and Workspace→Business→Page relation validation" — and
--     it is in the statement's own VALUES list beside a `business_profile_id` that must agree with
--     it through a composite foreign key. Nothing here discovers a workspace by reading. **CARRIED.**
--
--   * `app.research_sources` INSERT. The statement is "record that run R cited this URL". R was
--     resolved when the work was claimed, and the source's `workspace_id` and `business_profile_id`
--     are copied from R and checked against it by a composite foreign key. Adding the term changes
--     nothing about which row it writes. **CARRIED.** The contrast is batch 050's claim on
--     `app.jobs`, which is DISCOVERED because `for update skip locked` over the next due row has no
--     workspace term to add without changing what the work IS: a worker that has already claimed a
--     job holds its tenant context, and everything this batch writes is written by such a worker.
--
--   * `app.research_evidence` INSERT. The same statement one level down, against a source the same
--     worker just wrote. **CARRIED.**
--
-- **NO SERVICE POLICY IS WRITTEN, AND THAT IS THE DECISION IN EFFECT RATHER THAN A DEFERRAL.**
-- `RFC-2026-022`'s Status line: "NOT IN EFFECT until §7 holds: the only member of `app_worker` today
-- is `postgres`, which bypasses RLS", and §5/8 says a policy `TO app_worker` written today "is
-- unreachable except from an identity for which it is moot". So this batch does what the RFC leaves
-- a batch to do — it records the classification as DATA, in
-- `db/foundation/lint/service-policy-map.json`, which §7.2 makes the answer to "which shape does
-- this cell take" and which `scripts/db/run.mjs` reads in both directions.
--
-- THE MAP CARRIES THREE ENTRIES AND NOT FIVE. §8.2's `S` names the run, the source and the evidence
-- and stops; there is no §8 row for inserting a SNAPSHOT or a SUGGESTION in any of the four
-- matrices, so there is no cell to classify and inventing a `cell` value would be a claim about the
-- access matrix made in a lint file (061's sentence, unchanged). Those two tables get grants and no
-- policy for the same reason every other silent cell in this repository does: denied by default.
--
-- AND THE CONFINEMENT TERM IS NOT A TENANT BOUNDARY, WHICH NOTHING IN THIS FILE, IN THE MAP OR IN
-- THE ISOLATION SUITE MAY SAY IT IS. `RFC-2026-022` §5/4, measured twice: the role the policy names
-- can set the setting the policy reads, and `has_parameter_privilege` cannot even be asked who may.
-- What the term is worth is that it confines ONE TRANSACTION to ONE TENANT — a containment control
-- against defects in the service's own code. It is worth having and it is not isolation, and the RFC
-- forbids any document, test or assertion from citing it as the latter. The expression appears in
-- this migration exactly once, in the paragraph above, and a static test pins that count.
--
--
-- ============================================================================================
-- THE SCOPE PATH: 040's TWO COLUMNS, AND WHY THE FOUR CHILDREN CARRY NO PAGE OF THEIR OWN
-- ============================================================================================
--
-- §4 invariant 3 names Research in the same sentence as Knowledge: "Knowledge/Research/Content/Asset
-- ทุก row มี Business scope; Page scope เป็น nullable override ที่ต้องอยู่ Business เดียวกัน". So
-- `app.research_runs` carries `business_profile_id` NOT NULL and `page_context_profile_id` nullable,
-- with a THREE-column composite foreign key into `app.page_context_profiles` over (workspace_id,
-- business_profile_id, id) — `MATCH SIMPLE`, the default, which skips the key when the page is null
-- and is the only workable choice: `MATCH FULL` would refuse every business-level run, because
-- `workspace_id` and `business_profile_id` are never null here. That whole argument is 040's, at
-- length, and it is not repeated.
--
-- THE FOUR CHILDREN CARRY `workspace_id` AND `business_profile_id` AND NO PAGE COLUMN, and the
-- reason is mechanical rather than a matter of taste: A COPY OF THE PAGE COULD NOT BE HELD EQUAL TO
-- THE RUN'S. A composite foreign key over the whole path including a nullable page is MATCH SIMPLE,
-- so when the child's page is null the check is SKIPPED — a source could then claim to be
-- business-level while the run it belongs to is page-restricted, and the narrowing would ask
-- `admits_business` of the source where it asks `admits_page` of the run. That is history readable
-- to a member the current row is hidden from. MATCH FULL cannot rescue it and no CHECK can, because
-- a CHECK cannot read another row. 040 wrote that argument about a version table; it is the same
-- argument four times here.
--
-- So each child's reach IS ITS PARENT'S REACH, asserted rather than copied: one `AS RESTRICTIVE FOR
-- ALL` policy per table whose predicate is `exists (select 1 from <parent> p where p.workspace_id =
-- … and p.business_profile_id = … and p.id = …)`. The subquery runs AS THE CALLER, so the parent's
-- own policy set applies to it, and the direction is fail-closed: any narrowing a later batch adds
-- to the run makes every child refuse more, never less. It cannot drift from the parent's rule
-- because it IS the parent's rule.
--
-- THE COUPLING 020's HEADER WARNS ABOUT DOES NOT HOLD HERE, for 040's reason: 020 rejects a policy
-- that joins `app.workspace_members` because the width of visibility would become a function of
-- another module's policy set. Every table in this chain is created by THIS file and every one of
-- its policies is written here, so the width is stated in one place.
--
-- THE CHAIN IS TWO LEVELS DEEP IN ONE PLACE AND THAT IS DELIBERATE. `app.research_snapshots` and
-- `app.research_evidence` resolve through `app.research_sources`, which resolves through
-- `app.research_runs`. A snapshot's narrowing could have named the run directly and would then have
-- been a SECOND definition of "which run this snapshot belongs to" beside the one the foreign key
-- already fixes — 021 refusing `current_version_id`, 030 refusing `industry_pack_id`, 040 refusing
-- `kind` on a version, 050 refusing an attempt table, 131 refusing a paid-amount column.
--
--
-- ============================================================================================
-- WHAT IS NOT HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO FIND
-- ============================================================================================
--
--   * NO `status` COLUMN ON A RUN, THOUGH §10 USES THE WORD. `RESEARCH-RUN` retains "brief/status/
--     suggestion/evidence metadata". §3.2 makes a Phase 1 state `text` + a named CHECK whose values
--     change only by migration, which is a rule about HOW a state is stored once somebody with the
--     authority has decided WHAT the states are. No document enumerates a research run's states. So
--     the lifecycle is the timestamps §8.2 and §11.4 name by hand — `started_at`, `completed_at`,
--     `cancel_requested_at` — and "running" is `started_at is not null and completed_at is null`,
--     which is a QUERY a reader can disagree with rather than four words this repository's source of
--     truth never wrote. That is 010's refusal about an invitation, and this file states it about a
--     research run rather than counting how many families have made it: a count of the batches that
--     share a shape is a claim about the whole schema, and no batch can check one.
--
--   * NO `job_id` ON A RUN AND NO FOREIGN KEY INTO `app.jobs`, although §6 makes 050 a dependency
--     and a research run is obviously work a queue performs. §10 gives `JOB-SHORT` thirty days for a
--     success and ninety for a failure while `RESEARCH-RUN` has twelve months, so a foreign key
--     would make the run die with the job that produced it — 050's own reason for keeping its
--     consumer ledger free of one, and 061's for keeping `job_id` unconstrained. A column with no
--     constraint would be an unenforceable pointer whose only guarantee is that somebody wrote a
--     uuid, and nothing in this schema binds "enqueue a job" and "insert a run" into one
--     transaction, because no command function exists.
--
--   * NO COST COLUMN ANYWHERE, although §6 makes 061 a dependency and a research run spends
--     `research_search` — which is one of `CTR-USG-001`'s six dimensions by name. What a run cost is
--     `app.usage_events`, whose `attribution.job_id` is the required column that ties a measurement
--     to the work; a cost column here would be a second source of truth for a `FIN-3` number, on the
--     other side of a join, and 130 refused exactly that for a workspace's entitlements. It would
--     also put a `FIN-3` value in a `CONTENT-2` table with `RESEARCH-RUN`'s twelve-month retention,
--     where §10 gives finance seven years.
--
--   * NO `content_idea_id` ON A SUGGESTION, though §4's ERD draws `RESEARCH_SUGGESTION o|--o{
--     CONTENT_IDEA : inspires`. Content is batch 080 and the table does not exist; §6 invariant 6
--     puts a cross-module foreign key in an integration batch, and 020 refused a `social_account_id`
--     column for a table belonging to 110 on the same ground. The edge is owed to 080 or to the
--     integration batch that follows it, and it belongs on the CONTENT_IDEA side in any case,
--     because the ERD's `o|--o{` makes the idea the many end.
--
--   * NO EXCERPT, NO SNAPSHOT BODY, AND NO APPROVAL FLAG. Argued at length above. The approval
--     `COPYRIGHT-3` names has no definition, no owner named for it in §15, and no mechanism; a
--     boolean called `excerpt_approved` would be that decision arriving as a column, which is what
--     RFC-2026-018 is the record of.
--
--   * NO LEGAL-HOLD COLUMN OR TABLE, though §10's retention precedence puts "Legal/security/rights
--     hold" above everything else and `RESEARCH-SNAPSHOT` says "no recovery unless needed by active
--     evidence/LEGAL HOLD". §10 also says what a hold is: "`hold_type`, scope, reason code,
--     created_by, approved_by, start/end/review date และ audit trail" — a table with an approver, a
--     review cycle and an audit trail, which is a retention subsystem and is batch 160's. A nullable
--     `legal_hold boolean` here would be that subsystem's decision compressed into one bit with
--     nobody to approve it. The "active evidence" half of the same sentence IS expressible and IS
--     expressed: `app.research_evidence.snapshot_content_hash` is the column a sweep reads to ask
--     whether a capture is still needed.
--
--   * NO RETENTION WINDOW ENCODED, FOR EITHER CLASS. §5 assigns `RESEARCH-*`; §10 defines both
--     classes whose names begin `RESEARCH-`, so this batch is in 130's and 061's position rather
--     than 030's and 050's — it has numbers and refuses them — and it has no undefined class to
--     report. §10's own header requires Product/Security/Legal approval before Paid Beta, batch 160
--     owns the sweep, and `DATA-DEC-07` is open. What this batch provides is the COLUMN each sweep
--     would read and an index over it, which is 010's treatment of `expires_at`, 050's of
--     `consumed_at` and 061's of `expires_at`.
--
--   * NO COMMAND FUNCTION AND NO `app_command` GRANT. `RFC-2026-012` §4 names `SECURITY DEFINER`
--     command functions as the mechanism and `RFC-2026-021` §10 records that none exists. Two
--     consequences are stated rather than absorbed: §8.2's "Start" has no path, and a client holding
--     UPDATE on a suggestion can set `used_at` on a suggestion nothing has used, because binding a
--     lifecycle stamp to the act it records is what a command function is for.
--
--   * NO CLIENT VIEW AND NO READ-ALLOWLIST ENTRY. `RFC-2026-021` §3 makes a `security_invoker` view
--     an allowlist entry — five objects and a registry row, added by RFC — and §4's criterion C1 is
--     "a named caller exists, and it is a client". There is no `src/`, and the consumers any document
--     names for research output are batch 080's content pipeline and a UI that does not exist. The
--     snapshot's "approved excerpt" projection is the strongest candidate this family produces and it
--     fails C1 today.
--
--   * THE CLIENT GRANTS BELOW JOIN THE LIST `RFC-2026-021` §8.5 EXPECTS TO BE CLOSED, recorded
--     rather than absorbed. §8.5 names the inherited `authenticated` base-table grants in 010, 020
--     and 021 and says the known-exceptions list must be CLOSED — "any new one fails" — while §10
--     owes those grants to 170. 030, 040, 051, 061 and 130 each added more; whoever writes that list
--     will enumerate more batches than §8.5 names. It is a DEBT and not a contradiction for the
--     reason each of them gave: every grant here is COLUMN-SCOPED and bounded by a predicate row
--     level security can express — `app.is_active_member(workspace_id)` — so a drift reaches one
--     workspace and the isolation suite proves the boundary. The list still does not exist.
--
--   * NOTHING ABOUT WORKSPACE LIFECYCLE VISIBILITY. Unchanged from 020's, 030's, 040's, 061's and
--     130's headers: a member of an `access_blocked` workspace can still read the rows the policies
--     below admit, because reading `app.workspaces.lifecycle_state` from a policy needs either the
--     coupling 020 rejects or a helper grant `RFC-2026-020` §6.1/6 pins shut. §11.4 step 2 ("stop
--     new jobs/publish") and step 7 ("purge tenant content, RESEARCH, assets…") are operations on
--     this family from the other side and are owed to the command surface and to batch 160.


-- ---------------------------------------------------------------------------------------------
-- app.research_runs — one row per research request. The aggregate the other four hang from.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` and `business_profile_id` (§3.3, §4 invariant 3), plus the nullable
-- Page override. Sensitivity CONTENT-2 — §9.1's own example for that class is "knowledge, caption,
-- RESEARCH BRIEF, generated copy". Retention RESEARCH-RUN, whose twelve months are not encoded here.
create table if not exists app.research_runs (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  page_context_profile_id  uuid,
  -- The one field §10 names for this row by name: `RESEARCH-RUN` retains "BRIEF/status/suggestion/
  -- evidence metadata" and §9.1 gives "research brief" as an example of CONTENT-2. It is the
  -- tenant's own words about what it wants researched, so it is stored; it is not a captured
  -- document, so §9.2's snapshot prohibition does not reach it.
  brief                    text        not null,
  started_at               timestamptz,
  completed_at             timestamptz,
  -- §11.4 step 3's "cancel or drain jobs using typed policy" and §8.2's "Start/CANCEL Research", as
  -- a timestamp rather than as a status value — the vocabulary is nobody's here to invent.
  cancel_requested_at      timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  updated_by               uuid,
  constraint research_runs_brief_not_blank check (length(btrim(brief)) > 0),
  -- The one lifecycle rule this batch is entitled to state, because it follows from the two columns
  -- rather than from a vocabulary somebody would have to choose: a run cannot have finished before
  -- it began, and cannot have finished without having begun.
  constraint research_runs_completion_follows_start
    check (completed_at is null or (started_at is not null and completed_at >= started_at)),
  -- §3.3's composite foreign key into the Business, over the whole scope path. Both columns are NOT
  -- NULL, so this one is checked on every row.
  constraint research_runs_business_scope_fk
    foreign key (workspace_id, business_profile_id)
    references app.business_profiles (workspace_id, id),
  -- The nullable override, over the whole scope path INCLUDING the Business. MATCH SIMPLE (the
  -- default) skips it when the Page is null, which is what makes a business-level run legal; when
  -- the Page is set, the key forces it to be a Page of THAT Business in THAT Workspace, which is the
  -- second half of §4 invariant 3 expressed as a constraint rather than as a convention.
  constraint research_runs_page_scope_fk
    foreign key (workspace_id, business_profile_id, page_context_profile_id)
    references app.page_context_profiles (workspace_id, business_profile_id, id),
  -- The target of every child's composite foreign key. `id` alone is already unique; this triple is
  -- what lets a source or a suggestion assert that its own Workspace and Business are the ones its
  -- run actually has (§4 invariant 10).
  constraint research_runs_scope_key unique (workspace_id, business_profile_id, id)
);

comment on table app.research_runs is
  'Owner: A2 Research (research.core, batch 070). Canonical scope workspace_id and '
  'business_profile_id, with page_context_profile_id as the NULLABLE OVERRIDE §4 invariant 3 defines '
  'for Knowledge and RESEARCH in one sentence (§3.3). Sensitivity CONTENT-2; retention RESEARCH-RUN, '
  'whose twelve months are NOT encoded here (§10 owns the number, batch 160 owns the sweep, §15 '
  'forbids an agent ratifying one). MUTABLE: §8.2''s "Start/cancel Research" is a client operation on '
  'an existing row and §10 retains a status, so the row carries updated_at and §3.2''s trigger — but '
  'the CANCEL half alone is reachable, because §8.2''s next line marks "Research run/source/evidence '
  'INSERT" N for every client role and the START is a command RFC-2026-012 §4 names and '
  'RFC-2026-021 §10 records does not exist. NO status column: no document enumerates a run''s states, '
  'so the lifecycle is the timestamps §8.2 and §11.4 name. NO job_id and NO cost column — JOB-SHORT '
  'is thirty days and FINANCE-HISTORY is seven years against this row''s twelve months.';
comment on column app.research_runs.workspace_id is
  'CONTENT-2. The canonical tenant scope, and the column every policy on this table resolves '
  'membership against. Excluded from every UPDATE grant, so a row cannot be moved between tenants '
  'even by a caller both policy halves would admit (§8.5).';
comment on column app.research_runs.business_profile_id is
  'CONTENT-2. The canonical Business scope, required of every research row by §3.3 and by §4 '
  'invariant 3, and the column every child copies and is held to by a composite foreign key. '
  'Excluded from every UPDATE grant: §8.5 forbids moving a row across tenant OR scope with an '
  'update.';
comment on column app.research_runs.page_context_profile_id is
  'CONTENT-2. NULL for research about the whole Business; set for research restricted to one Page '
  '(§3.3, §4 invariant 3). It is a nullable OVERRIDE and never a substitute for the Business scope, '
  'and the composite foreign key that carries it names the Business too, so a Page from another '
  'Business fails at the database (§4 invariant 10). It is the ONLY page column in this batch: the '
  'four child tables carry none, because a nullable copy could not be held equal to this one under '
  'any foreign key this schema can write (040''s argument about a version''s page).';
comment on column app.research_runs.brief is
  'CONTENT-2. What the tenant asked to have researched. §10 names it — RESEARCH-RUN retains '
  '"brief/status/suggestion/evidence metadata" — and §9.1 gives "research brief" as an example of '
  'CONTENT-2. It is the tenant''s own words and not a captured document, so §9.2''s prohibition on a '
  'full research snapshot does not reach it. Excluded from every UPDATE grant: a run whose brief '
  'changed after it ran is a record of work nobody requested.';
comment on column app.research_runs.cancel_requested_at is
  'CONTENT-2. §8.2''s "Start/cancel Research" and §11.4 step 3''s "cancel or drain jobs using typed '
  'policy", as a timestamp rather than as a status value. It is the one column a CLIENT may write on '
  'this table, and the whole of §8.2''s second row this schema can reach.';
comment on column app.research_runs.created_by is
  'AUTH-3. The member who requested the run. There is no client INSERT — §8.2 marks the run''s INSERT '
  'N for every client role — so §8.6 case 8 is asserted here on the UPDATE instead: the update policy '
  'requires updated_by = (select auth.uid()). Not FK-constrained: §11.2 forbids cascade-deleting '
  'history when a member is removed and requires the actor field be anonymized instead, which is '
  'also RESEARCH-RUN''s own final behavior ("purge/anonymize").';
comment on column app.research_runs.updated_by is
  'AUTH-3. The member who cancelled. See created_by; this is the column §8.6 case 8 is live on.';


-- ---------------------------------------------------------------------------------------------
-- app.research_sources — what a run cited. Append-only, and it outlives what it describes.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` and `business_profile_id` (§3.3), tied to the run by a composite
-- foreign key over the whole scope path. NO page column: see the header.
--
-- APPEND-ONLY, which is 070's own reading and not a quotation from §5. The argument is §10's: the
-- citation is what "preserve permitted hash/citation metadata" keeps after the captured object is
-- purged, so a citation that could be edited after its snapshot is gone is a claim about a document
-- nobody can check any more. No UPDATE or DELETE grant to any role, no UPDATE or DELETE policy, no
-- `updated_at` column and no trigger.
create table if not exists app.research_sources (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid        not null,
  business_profile_id  uuid        not null,
  research_run_id      uuid        not null,
  -- THE CITATION. A URL is not a snapshot and not an excerpt, so §9.2's prohibition does not reach
  -- it and §11.1 exports it as "Research citation … metadata".
  --
  -- It is also THE ONE COLUMN IN THIS BATCH A WORKER WILL DEREFERENCE, which is the shape
  -- CTR-JOB-001's x-reference-rule was written about: an earlier deny-list form of a reference field
  -- accepted `HTTPS://…`, `//host/x`, `file:///etc/passwd`, `javascript:` and `../../../etc/passwd`
  -- under independent security review. So the scheme is an ALLOWLIST of one and traversal is refused
  -- by its own constraint rather than by a cleverer pattern. Both are 070's own reading and are
  -- stated so a reviewer can refuse them.
  source_uri           text        not null,
  -- When the citation was made, which is not when the capture happened: a source can be cited from a
  -- search result and captured later, or never.
  cited_at             timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  constraint research_sources_uri_scheme check (
    source_uri ~ '^https://[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?(?::[0-9]{1,5})?(?:/[^[:space:]"''<>\\]*)?$'),
  -- Traversal refused separately. A pattern that tried to express both would be a pattern nobody can
  -- read, and this half is the one a reviewer most needs to be able to check by eye.
  constraint research_sources_uri_no_traversal check (position('..' in source_uri) = 0),
  -- NO MAXIMUM LENGTH, and that is 050's rule rather than an oversight: "a CHECK enforcing a bound
  -- the contract does not state would make the database stricter than the wire". There is no
  -- research contract at all, and no document in this repository bounds a source URI. It is reported
  -- to A2 Research and to whoever owns a research envelope in the work package's open blockers,
  -- alongside the reason it is not merely cosmetic: an unbounded text column cannot safely be put in
  -- a btree unique index, which is half of why there is no natural key below.
  --
  -- NO NATURAL KEY, EITHER, and the obvious one is refused rather than forgotten. `unique
  -- (research_run_id, source_uri)` would say that a run cites a URL once, and nothing says so — a
  -- run may reach the same page twice under different queries, and 061 refused the same invention
  -- for a reservation ("a natural key would be the wrong cardinality"). So a source is addressed by
  -- its id, and db/foundation/seeds/fixture-catalog.json carries a symbol for one, which is the rule
  -- that catalog states: a symbol where a row has no natural key.
  constraint research_sources_run_scope_fk
    foreign key (workspace_id, business_profile_id, research_run_id)
    references app.research_runs (workspace_id, business_profile_id, id),
  -- The target of the snapshot's and the evidence's composite foreign keys.
  constraint research_sources_scope_key unique (workspace_id, business_profile_id, id)
);

comment on table app.research_sources is
  'Owner: A2 Research (research.core, batch 070). Canonical scope workspace_id and '
  'business_profile_id (§3.3), tied to its run by a composite foreign key over the whole scope path '
  'so an unrelated Workspace/Business/run triple fails at the database (§4 invariant 10). It carries '
  'NO page column: a nullable copy of the run''s page could not be held equal to it by any foreign '
  'key (MATCH SIMPLE skips a null), so the restrictive policy makes a source reachable exactly when '
  'its run is. Sensitivity CONTENT-2; retention RESEARCH-RUN. APPEND-ONLY — no role holds UPDATE or '
  'DELETE, as an absent grant AND an absent policy asserted both ways, and there is no updated_at. '
  'That disposition is batch 070''s READING and not a quotation: §5 names only evidence immutable, '
  'and the argument is §10''s, that "preserve permitted hash/citation metadata" makes the citation '
  'the half that outlives the captured object it describes. The URI''s scheme is an allowlist of one '
  'because this is the column a worker dereferences.';
comment on column app.research_sources.source_uri is
  'CONTENT-2. The citation itself. A URL is neither a snapshot nor an excerpt, so §9.2''s prohibition '
  'does not reach it. Its scheme is constrained to https and `..` is refused, because CTR-JOB-001''s '
  'x-reference-rule records a deny-list form of a reference field accepting file:///etc/passwd, '
  'javascript:, //host and traversal — findings about data a worker dereferences, which is exactly '
  'what this column holds. NO MAXIMUM LENGTH: no document or contract states one and 050''s rule '
  'forbids inventing a bound, which is reported rather than resolved.';
comment on column app.research_sources.cited_at is
  'CONTENT-2. When the run cited this source, which is NOT when anything was captured — '
  'app.research_snapshots.captured_at is that, on a row with a different retention class and a '
  'different fate.';


-- ---------------------------------------------------------------------------------------------
-- app.research_snapshots — the COPYRIGHT-3 row. A locator and a hash; never the page itself.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` and `business_profile_id` (§3.3), tied to its source by a composite
-- foreign key over the whole scope path. NO page column, for the reason the other three children
-- carry none.
--
-- THIS IS THE ONE TABLE IN THIS BATCH §9.1 CLASSES `COPYRIGHT-3`, and every difference between it
-- and its four neighbours follows from that: no client grant, no policy, no body column, an
-- apply-time column allowlist, its own retention class and its own purge state. The header argues
-- each at length. §10's final behavior — "purge object + locator; preserve permitted hash/citation
-- metadata" — is the sentence the column list below implements.
--
-- MUTABLE IN EXACTLY TWO COLUMNS (050's outbox shape, 131's receipt shape): the purge clears
-- `object_ref` and stamps `purged_at`, and everything that says WHAT WAS CAPTURED is append-only.
create table if not exists app.research_snapshots (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid        not null,
  business_profile_id  uuid        not null,
  research_source_id   uuid        not null,
  -- THE LOCATOR, AND NOT THE OBJECT. Nullable, because §10's final behavior removes it: a purged
  -- snapshot is a row that no longer says where the captured bytes are. The form is batch 050's
  -- reference shape with this family's own scheme, and its 256-character bound is CTR-JOB-001's,
  -- borrowed with attribution rather than invented: it is the one bound this repository has measured
  -- for a column of exactly this shape.
  object_ref           text,
  -- WHAT SURVIVES THE PURGE. §10: "preserve permitted HASH/citation metadata"; §9.3: "Asset
  -- checksum/content hash: hash เพื่อ integrity/dedup ไม่ใช่ secret". It is also the column
  -- app.research_evidence names this row by, because a foreign key between rows whose retention
  -- classes differ by eleven months would resolve that difference in the wrong direction.
  content_hash         bytea       not null,
  captured_at          timestamptz not null,
  -- DATA-DEC-07 IS OPEN AND THIS COLUMN IS HOW ITS ABSENCE STAYS VISIBLE. NOT NULL, no default, no
  -- arithmetic anywhere in this file: every capture states its own limit and none inherits a number
  -- nobody approved. §10 gives "30 วัน default หรือสั้นกว่าตาม source policy" and §15 gives the
  -- decision to Research+Legal.
  retention_until      timestamptz not null,
  -- Null until the object and the locator are gone. With it, "this repository is holding captured
  -- material past its own stated limit" is a query rather than a guess; without it, an overdue
  -- snapshot and a purged one are the same row.
  purged_at            timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint research_snapshots_object_ref_form check (
    object_ref is null or (
      object_ref ~ '^snapshot:[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$'
      and length(object_ref) <= 256)),
  -- A FLOOR rather than an equality, which is 010's treatment of an invitation's token_hash and
  -- 131's of a provider digest: sha256 is 32 bytes, a stronger digest is longer, and a floor stops a
  -- short string being stored in a column the schema calls a digest.
  constraint research_snapshots_content_hash_is_a_digest check (octet_length(content_hash) >= 32),
  -- §10's final behavior, as a constraint. A row that says it was purged while still naming an
  -- object is a row whose two halves disagree about whether the captured bytes exist.
  constraint research_snapshots_purged_row_names_no_object
    check (purged_at is null or object_ref is null),
  -- A capture cannot be retained until an instant before it was taken. It uses no number, which is
  -- the whole point: it is the only thing about retention this batch is entitled to assert.
  constraint research_snapshots_retention_follows_capture check (retention_until > captured_at),
  -- ONE SNAPSHOT PER SOURCE PER CONTENT STATE, and this key is what makes
  -- app.research_evidence.snapshot_content_hash a reference rather than a hint: evidence carries the
  -- source id and the hash, and this constraint is what makes that pair name at most one row. §9.3
  -- gives a content hash the job of "integrity/dedup" and this is the dedup half.
  constraint research_snapshots_one_per_capture unique (workspace_id, research_source_id, content_hash),
  constraint research_snapshots_source_scope_fk
    foreign key (workspace_id, business_profile_id, research_source_id)
    references app.research_sources (workspace_id, business_profile_id, id)
);

comment on table app.research_snapshots is
  'Owner: A2 Research (research.core, batch 070). Canonical scope workspace_id and '
  'business_profile_id (§3.3), tied to its source by a composite foreign key; no page column, for the '
  'reason every child in this batch carries none. THE ONE TABLE IN THIS FAMILY §9.1 CLASSES '
  'COPYRIGHT-3 ("research snapshot/excerpt", storage rule "restricted, retention/policy bound", '
  'client projection "approved excerpt only") — every other row here is CONTENT-2, and that '
  'difference is why this table exists separately rather than as columns on app.research_sources: '
  '§10 gives it RESEARCH-SNAPSHOT (30 days) against RESEARCH-RUN (12 months) and a final behavior — '
  '"purge object + locator; preserve permitted hash/citation metadata" — that is one instruction '
  'about two rows with different fates, and one row cannot half-survive a purge. IT HOLDS NO '
  'CAPTURED CONTENT: no body, no text, no excerpt, and an apply-time ALLOWLIST of columns keeps it '
  'that way (060''s mechanism), because §9.2 forbids storing or exporting a full research snapshot '
  'the client may not reproduce and nothing in this repository defines what APPROVES an excerpt. NO '
  'client role holds any privilege and NO POLICY IS WRITTEN, so every role including app_worker is '
  'refused by FORCE ROW LEVEL SECURITY. retention_until is NOT NULL with no default and is outside '
  'every UPDATE grant: DATA-DEC-07 is OPEN (Research+Legal), and a default would ratify it while an '
  'extendable window would not be one.';
comment on column app.research_snapshots.object_ref is
  'COPYRIGHT-3. A LOCATOR for the captured object and never the object. NULLABLE because §10''s final '
  'behavior removes it — "purge object + locator" — so a purged snapshot is a row that no longer says '
  'where the bytes were. The form is batch 050''s reference shape with this family''s scheme, bounded '
  'at CTR-JOB-001''s 256 characters, borrowed with attribution because it is the one bound this '
  'repository has measured for a column of this shape. It is one of exactly two columns any role may '
  'update.';
comment on column app.research_snapshots.content_hash is
  'COPYRIGHT-3 metadata, and the half §10 says to PRESERVE: "preserve permitted hash/citation '
  'metadata". §9.3 gives a content hash the job of integrity and dedup and says it is not a secret. '
  'It is what app.research_evidence names this row by — a foreign key would make the evidence row '
  'die with a capture whose retention class is eleven months shorter, which is 050''s reason for '
  'keeping its consumer ledger free of one. Outside every UPDATE grant: a capture whose hash changed '
  'is a different capture.';
comment on column app.research_snapshots.retention_until is
  'COPYRIGHT-3. The instant beyond which this capture may not be retained. NOT NULL, NO DEFAULT and '
  'no arithmetic anywhere in batch 070: §10 gives "30 วัน default หรือสั้นกว่าตาม source policy" and '
  'DATA-DEC-07 (owner Research+Legal, gate "ก่อน real research source") is OPEN, so a default would '
  'be an agent closing it — the refusal 010 made for DATA-DEC-04, 130 for BILL-DEC-012 and 061 for a '
  'reservation''s expiry. It is OUTSIDE EVERY UPDATE GRANT as well, because a window that can be '
  'extended is not one, and the apply-time block asserts both the absent default and the absent '
  'privilege against the live catalog.';
comment on column app.research_snapshots.purged_at is
  'COPYRIGHT-3. Null until the object and the locator are gone. It is here so that "this repository '
  'is holding captured material past its own stated limit" is the query `purged_at is null and '
  'retention_until < now()` rather than a guess — the shape 061''s computed_through has, one family '
  'over: it makes a breach DETECTABLE and does not prevent one, because the sweep is batch 160''s and '
  'the number is Research+Legal''s. The second of the two columns any role may update.';


-- ---------------------------------------------------------------------------------------------
-- app.research_evidence — the one object §5 names immutable.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` and `business_profile_id` (§3.3), tied to its source by a composite
-- foreign key over the whole scope path. NO page column, for the reason the other children carry
-- none.
--
-- IMMUTABLE (§5: "mixed; evidence immutable"), expressed the three ways this repository expresses it
-- since 020: no UPDATE or DELETE policy, no UPDATE or DELETE grant to any role including the
-- service, and no `updated_at` column or trigger — an immutable row has no update to stamp.
--
-- WHAT IT DOES NOT HOLD IS THE POINT OF IT. There is no excerpt and no quoted text: §9.1 licenses
-- "approved excerpt only" and nothing defines an approval, so the column that would carry one is
-- absent rather than unbounded. What an evidence row records is that a claim in this run is
-- supported by THIS source in THE STATE THAT SOURCE WAS IN when it was captured — which is
-- `research_source_id` plus `snapshot_content_hash`, and is precisely §11.1's "Research citation/
-- evidence METADATA".
create table if not exists app.research_evidence (
  id                     uuid primary key default gen_random_uuid(),
  workspace_id           uuid        not null,
  business_profile_id    uuid        not null,
  research_source_id     uuid        not null,
  -- THE REFERENCE THAT OUTLIVES WHAT IT REFERS TO. Nullable — evidence may cite a source no capture
  -- was taken of — and deliberately NOT a foreign key into app.research_snapshots: §10 gives
  -- RESEARCH-SNAPSHOT thirty days and RESEARCH-RUN twelve months, so a foreign key would make the
  -- evidence row die with the capture at the moment §10 orders the capture purged, and "preserve
  -- permitted hash/citation metadata" is the instruction that survives it. With
  -- research_snapshots_one_per_capture, (workspace_id, research_source_id, snapshot_content_hash)
  -- names at most one snapshot for as long as one exists.
  --
  -- It is also the column §10's "no recovery unless needed by ACTIVE EVIDENCE" is answered from: a
  -- sweep asks whether any evidence row still names this capture.
  snapshot_content_hash  bytea,
  created_at             timestamptz not null default now(),
  constraint research_evidence_snapshot_hash_is_a_digest
    check (snapshot_content_hash is null or octet_length(snapshot_content_hash) >= 32),
  constraint research_evidence_source_scope_fk
    foreign key (workspace_id, business_profile_id, research_source_id)
    references app.research_sources (workspace_id, business_profile_id, id)
);

comment on table app.research_evidence is
  'Owner: A2 Research (research.core, batch 070). Canonical scope workspace_id and '
  'business_profile_id (§3.3), tied to its source by a composite foreign key over the whole scope '
  'path; no page column, for the reason every child in this batch carries none, so the restrictive '
  'policy makes an evidence row reachable exactly when its source is. Sensitivity CONTENT-2; '
  'retention RESEARCH-RUN, which covers "evidence METADATA" — and metadata is all this row holds. '
  'IMMUTABLE: §5''s mutability column names exactly one object of this family, "evidence immutable", '
  'and it is expressed as no UPDATE or DELETE grant to any role INCLUDING the service, no UPDATE or '
  'DELETE policy for any role, and no updated_at. IT CARRIES NO EXCERPT AND NO QUOTED TEXT: §9.1 '
  'licenses "approved excerpt only" for COPYRIGHT-3 and nothing in this repository defines what '
  'approves one, so the column is absent rather than unbounded (§9.2 forbids storing a full research '
  'snapshot in a client surface, an API, an event, a job, a log or a FIXTURE). It names its capture '
  'by CONTENT HASH and never by foreign key, because RESEARCH-SNAPSHOT is thirty days and this row '
  'is twelve months.';
comment on column app.research_evidence.snapshot_content_hash is
  'CONTENT-2. The content hash of the capture this evidence was taken from, or NULL where none was '
  'taken. NOT a foreign key: §10 purges a snapshot at thirty days and retains this row for twelve '
  'months, and "preserve permitted hash/citation metadata" is what is left after that purge. It is '
  'also the column §10''s "no recovery unless needed by active evidence" is answered from.';


-- ---------------------------------------------------------------------------------------------
-- app.research_suggestions — what a run proposes, and the three verbs §8.2 gives a person over it.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` and `business_profile_id` (§3.3), tied to its run by a composite
-- foreign key over the whole scope path. NO page column, for the reason the other children carry
-- none.
--
-- MUTABLE. §8.2's "Suggestion save/dismiss/use" gives the owner, the admin and the editor three
-- verbs, and each of the three is an operation on a row a run already proposed. The verbs are the
-- matrix's own words as three timestamps; no status vocabulary is invented, because no document
-- enumerates a suggestion's states and §3.2's rule is about HOW a state is stored once somebody has
-- decided WHAT the states are.
create table if not exists app.research_suggestions (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid        not null,
  business_profile_id  uuid        not null,
  research_run_id      uuid        not null,
  -- The one human-readable field this batch writes on this row, which is 040's treatment of a
  -- knowledge item's `name`: §5 names no column of this family and forbids an untyped document
  -- column standing in for the rest, so the resolved shape of a suggestion is owed to whoever
  -- specifies one.
  title                text        not null,
  -- §8.2's three verbs, as three timestamps.
  saved_at             timestamptz,
  dismissed_at         timestamptz,
  used_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  updated_by           uuid,
  constraint research_suggestions_title_not_blank check (length(btrim(title)) > 0),
  -- A suggestion ends ONE way. Dismissed and used at once is a state whose meaning nothing could
  -- resolve, and it is the only lifecycle rule this batch is entitled to state, because it follows
  -- from the two columns rather than from a vocabulary somebody would have to choose (061's
  -- usage_reservations_one_outcome, in a different family).
  constraint research_suggestions_one_outcome
    check (dismissed_at is null or used_at is null),
  constraint research_suggestions_run_scope_fk
    foreign key (workspace_id, business_profile_id, research_run_id)
    references app.research_runs (workspace_id, business_profile_id, id)
);

comment on table app.research_suggestions is
  'Owner: A2 Research (research.core, batch 070). Canonical scope workspace_id and '
  'business_profile_id (§3.3), tied to its run by a composite foreign key over the whole scope path; '
  'no page column, for the reason every child in this batch carries none. Sensitivity CONTENT-2; '
  'retention RESEARCH-RUN, which names "suggestion" in its own data column. MUTABLE: §8.2''s '
  '"Suggestion save/dismiss/use | Y | Y | Y | P | N | P" gives the owner, the admin and the editor '
  'three verbs over an existing row, and they are stored as the three timestamps the matrix names — '
  'no status vocabulary, because no document enumerates a suggestion''s states. The approver''s P is '
  'REFUSED for the reason every batch since 010 gives and RFC-2026-020 §8 states as approved: no '
  'document defines the capability set, and §15 forbids an agent choosing it. NO CLIENT INSERT: §8 '
  'has no cell anywhere for CREATING a suggestion — a run proposes it (§4''s ERD) — and where a '
  'document is silent the cell is denied. NO content_idea_id, though §4 draws '
  'RESEARCH_SUGGESTION o|--o{ CONTENT_IDEA: content is batch 080 and §6 invariant 6 puts a '
  'cross-module foreign key in an integration batch.';
comment on column app.research_suggestions.title is
  'CONTENT-2. The one human-readable field, which is 040''s treatment of a knowledge item''s name: §5 '
  'names no column of this family and forbids an untyped document column standing in for the rest. '
  'Excluded from the client UPDATE grant — §8.2''s three verbs are save, dismiss and use, and '
  'rewriting what a run proposed is none of them.';
comment on column app.research_suggestions.saved_at is
  'CONTENT-2. §8.2''s "save", as a timestamp. One of the three columns a client may update, and the '
  'one that is not part of the one-outcome rule: a suggestion may be saved and later used, or saved '
  'and later dismissed.';
comment on column app.research_suggestions.used_at is
  'CONTENT-2. §8.2''s "use". NOTHING BINDS IT TO THE ACT IT RECORDS: a client holding this column can '
  'stamp it on a suggestion nothing used, because binding a lifecycle stamp to the operation it '
  'describes is what a command function is for and RFC-2026-021 §10 records that none exists. Stated '
  'rather than left, because the day 080 creates a content idea from a suggestion, this column and '
  'that edge are two sources of truth for one fact unless a command writes both.';
comment on column app.research_suggestions.updated_by is
  'AUTH-3. The member who saved, dismissed or used it, asserted equal to the JWT subject by the '
  'UPDATE policy (§8.5, §8.6 case 8). Not FK-constrained: §11.2 requires actor fields to be '
  'anonymized rather than cascade-deleted.';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- Already covered by a constraint's own index, and therefore NOT repeated below:
--
--   research_runs (workspace_id, business_profile_id)
--                          — research_runs_scope_key, which leads with exactly the pair that is the
--                            Business foreign key AND both RLS-predicate columns.
--   research_sources (workspace_id, business_profile_id)
--                          — research_sources_scope_key, same shape.
--   research_snapshots (workspace_id, research_source_id, content_hash)
--                          — research_snapshots_one_per_capture, which is also the lookup evidence
--                            makes and the uniqueness that makes that lookup single-valued.
--   every id column        — the primary keys.

-- The Page override's foreign key, and the third predicate column of the run's narrowing.
create index if not exists research_runs_page_scope_idx
  on app.research_runs (workspace_id, business_profile_id, page_context_profile_id);

-- §3.3 keyset pagination, "(created_at desc, id desc)", for the list that grows with the tenant: the
-- research of one Business. The four children get none — a source, a snapshot, an evidence item and
-- a suggestion are all read BY THEIR RUN, which the composite foreign key's index below answers.
create index if not exists research_runs_business_keyset_idx
  on app.research_runs (business_profile_id, created_at desc, id desc);

-- Each child's composite foreign key into its parent, which leads with workspace_id and so supports
-- the RLS-predicate column too.
create index if not exists research_sources_run_scope_idx
  on app.research_sources (workspace_id, business_profile_id, research_run_id);

create index if not exists research_snapshots_source_scope_idx
  on app.research_snapshots (workspace_id, business_profile_id, research_source_id);

create index if not exists research_evidence_source_scope_idx
  on app.research_evidence (workspace_id, business_profile_id, research_source_id);

create index if not exists research_suggestions_run_scope_idx
  on app.research_suggestions (workspace_id, business_profile_id, research_run_id);

-- THE RETENTION SWEEP'S OWN INDEX, and the reason `purged_at` is worth having: this is the query
-- that answers "what is this repository holding past its own stated limit". Partial on the column's
-- own nullability rather than on an invented state vocabulary — 050's outbox_events_undispatched_idx
-- shape — because having been purged is a fact the row already has to carry (§10).
create index if not exists research_snapshots_unpurged_retention_idx
  on app.research_snapshots (retention_until)
  where purged_at is null;

-- §10's "no recovery unless needed by ACTIVE EVIDENCE", from the evidence side. Without it, asking
-- whether a capture is still cited scans every evidence row in the database.
create index if not exists research_evidence_snapshot_hash_idx
  on app.research_evidence (workspace_id, snapshot_content_hash)
  where snapshot_content_hash is not null;


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every MUTABLE row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
--
-- Three triggers, not five. app.research_sources is append-only and app.research_evidence is
-- immutable, and adding an updated_at to either would be the first sentence of the table's own
-- comment contradicting itself (020's words, kept by 030, 040, 050, 061, 130 and 131).
--
-- ALL THREE ARE REACHABLE AND REFUSED OR REACHABLE AND USED, and the distinction is 060's correction
-- after independent review compared a comment with a grant. On app.research_runs and
-- app.research_suggestions `authenticated` holds a column-scoped UPDATE behind a policy, so those
-- two triggers fire on a normal client write. On app.research_snapshots app_worker holds a
-- column-scoped UPDATE and NO POLICY, so that trigger CAN be fired through a granted path — one that
-- row level security then refuses, which is not the same thing as unreachable and must not be
-- written as if it were.
drop trigger if exists set_updated_at on app.research_runs;
create trigger set_updated_at before update on app.research_runs
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.research_snapshots;
create trigger set_updated_at before update on app.research_snapshots
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.research_suggestions;
create trigger set_updated_at before update on app.research_suggestions
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on every table, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
--
-- On app.research_snapshots this is the whole control rather than part of one: that table carries no
-- policy, so ENABLE plus FORCE is what makes every non-bypassing role — including the table owner
-- and including the one role holding grants — read zero rows, and it is what the CI negative control
-- switches off to prove the suite notices. On the other four, FORCE is doing the ordinary work of
-- keeping the table owner subject to the policies below.
alter table app.research_runs enable row level security;
alter table app.research_runs force row level security;

alter table app.research_sources enable row level security;
alter table app.research_sources force row level security;

alter table app.research_snapshots enable row level security;
alter table app.research_snapshots force row level security;

alter table app.research_evidence enable row level security;
alter table app.research_evidence force row level security;

alter table app.research_suggestions enable row level security;
alter table app.research_suggestions force row level security;


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
-- `authenticated` HOLDS COLUMN-SCOPED SELECT ON FOUR TABLES AND NOTHING AT ALL ON THE FIFTH. §8.2's
-- "Knowledge/Research SELECT" is `Y` for every built-in role, and app.research_snapshots is excluded
-- because §9.1 classes it COPYRIGHT-3 with the client projection "approved excerpt only" — a
-- narrower and more specific statement than §8.2's row, and one nothing in this repository can
-- satisfy. See the header.
--
-- THE TWO CLIENT WRITE GRANTS ARE EACH EXACTLY THE VERBS §8.2 NAMES AND NOTHING BESIDE THEM:
--
--   app.research_runs         update (cancel_requested_at, updated_by) — §8.2's "Start/CANCEL
--                             Research". The START half is the row's own INSERT, which the next line
--                             of the matrix marks `N` for every client role.
--   app.research_suggestions  update (saved_at, dismissed_at, used_at, updated_by) — §8.2's
--                             "Suggestion SAVE/DISMISS/USE", one column per verb. `title` is absent:
--                             rewriting what a run proposed is none of the three.
--
-- Everything that says WHICH row it is — the identity, every scope column, the brief, the title and
-- `created_by` — is outside both grants, so §8.5's "ห้ามย้าย row ข้าม tenant ด้วย update" holds here
-- by a COLUMN LIST rather than by the absence of a verb. That distinction is 060's correction after
-- independent review found a comment claiming the second beside a table-wide grant, and the
-- apply-time block asserts it per column against the live ACL.
grant select (id, workspace_id, business_profile_id, page_context_profile_id, brief, started_at,
              completed_at, cancel_requested_at, created_at, updated_at, created_by, updated_by)
  on app.research_runs to authenticated;
grant update (cancel_requested_at, updated_by) on app.research_runs to authenticated;

grant select (id, workspace_id, business_profile_id, research_run_id, source_uri, cited_at,
              created_at)
  on app.research_sources to authenticated;

grant select (id, workspace_id, business_profile_id, research_source_id, snapshot_content_hash,
              created_at)
  on app.research_evidence to authenticated;

grant select (id, workspace_id, business_profile_id, research_run_id, title, saved_at, dismissed_at,
              used_at, created_at, updated_at, updated_by)
  on app.research_suggestions to authenticated;
grant update (saved_at, dismissed_at, used_at, updated_by) on app.research_suggestions to authenticated;

-- NO GRANT OF ANY KIND TO ANY CLIENT ROLE ON app.research_snapshots. This is the COPYRIGHT-3
-- refusal, and it is a missing grant rather than a policy predicate because §9.2's prohibition is
-- about STORING AND EXPORTING rather than about who may read: "full research snapshot ที่ client
-- ไม่มีสิทธิ์ทำซ้ำ". A policy can be widened by a later edit; a grant that was never made has to be
-- written, and writing one is a line a reviewer reads.

-- `app_worker` HOLDS GRANTS AND NO POLICY, on all five, which is the shape batch 010 introduced and
-- every batch since has kept, for the reason 010 gives: without a grant a service refusal is 42501
-- either way and proves only that somebody forgot a GRANT; with the grant and no policy, an empty
-- read can only have come from row level security, and a service role that had quietly acquired
-- BYPASSRLS would SUCCEED where the suite demands a refusal.
--
-- THE MEASURED TRAP THIS BATCH IS WRITTEN AROUND, which 061 recorded from 060's defect: a full set
-- of column grants does NOT make `has_table_privilege` true. So every assertion in the apply-time
-- block uses `has_any_column_privilege` for the column-scoped verbs and `has_table_privilege` only
-- for DELETE, which has no column-level form.
--
-- The verbs follow §8.2's `S` and each table's own disposition:
--
--   app.research_runs         select, insert, and UPDATE ON THE TWO COLUMNS A RUN'S PROGRESS MOVES.
--                             `cancel_requested_at` is deliberately NOT among them: the cancel is a
--                             person's verb in §8.2 and a service that could stamp it could cancel a
--                             tenant's research.
--   app.research_sources      select, insert. Append-only: no UPDATE and no DELETE, for any role.
--   app.research_snapshots    select, insert, and UPDATE ON THE PURGE'S TWO COLUMNS. `retention_until`
--                             is outside it, so no granted path can extend a capture's life.
--   app.research_evidence     select, insert. Immutable: no UPDATE and no DELETE, for any role.
--   app.research_suggestions  select, insert. The three verbs are §8.2's client cell and the service
--                             holds none of them.
--
-- NO DELETE ANYWHERE, FOR ANY ROLE. §8.5 has no broad user delete, and hard deletion in this family
-- is a retention job — RESEARCH-RUN and RESEARCH-SNAPSHOT both name a purge, batch 160 owns it
-- through `app_maintenance`, and this batch grants `app_maintenance` nothing.
grant select (id, workspace_id, business_profile_id, page_context_profile_id, brief, started_at,
              completed_at, cancel_requested_at, created_at, updated_at, created_by, updated_by)
  on app.research_runs to app_worker;
grant insert (id, workspace_id, business_profile_id, page_context_profile_id, brief, created_by)
  on app.research_runs to app_worker;
grant update (started_at, completed_at, updated_at) on app.research_runs to app_worker;

grant select (id, workspace_id, business_profile_id, research_run_id, source_uri, cited_at,
              created_at)
  on app.research_sources to app_worker;
grant insert (id, workspace_id, business_profile_id, research_run_id, source_uri, cited_at)
  on app.research_sources to app_worker;

grant select (id, workspace_id, business_profile_id, research_source_id, object_ref, content_hash,
              captured_at, retention_until, purged_at, created_at, updated_at)
  on app.research_snapshots to app_worker;
grant insert (id, workspace_id, business_profile_id, research_source_id, object_ref, content_hash,
              captured_at, retention_until)
  on app.research_snapshots to app_worker;
-- Two columns, and the apply-time block asserts that every other column of this table is unwritable
-- by every role, against the live ACL rather than against this line.
grant update (object_ref, purged_at, updated_at) on app.research_snapshots to app_worker;

grant select (id, workspace_id, business_profile_id, research_source_id, snapshot_content_hash,
              created_at)
  on app.research_evidence to app_worker;
grant insert (id, workspace_id, business_profile_id, research_source_id, snapshot_content_hash)
  on app.research_evidence to app_worker;

grant select (id, workspace_id, business_profile_id, research_run_id, title, saved_at, dismissed_at,
              used_at, created_at, updated_at, updated_by)
  on app.research_suggestions to app_worker;
grant insert (id, workspace_id, business_profile_id, research_run_id, title)
  on app.research_suggestions to app_worker;

-- `app_command` and `app_maintenance` are granted nothing by this batch. There is no specified
-- command surface for research.core — which is the gap §8.2's "Start" turns on — and the retention
-- path is batch 160.


-- ---------------------------------------------------------------------------------------------
-- Policies. TO authenticated, for the user paths §8.2 grants.
-- ---------------------------------------------------------------------------------------------
--
-- Every membership question goes through batch 011's helpers and every scope question through batch
-- 021's. Both answer about the CALLER only, so a policy that calls one is asking "may I", never "who
-- else is here". `app.workspace_member_role` returns a role only for an ACTIVE membership, which is
-- where §7's "only status active grants access" and §12.6/5's suspended member live for these
-- tables.

-- --- app.research_runs ---------------------------------------------------------------------------

-- §8.2 "Knowledge/Research SELECT" is `Y` for owner, admin, editor, approver and viewer alike, so
-- the predicate tests ACTIVE MEMBERSHIP and not role. A cancelled or completed run stays visible:
-- §10 retains the run's status for twelve months and a policy that hid a finished run would delete
-- the history the retention class exists to keep.
drop policy if exists research_runs_select_active_member on app.research_runs;
create policy research_runs_select_active_member on app.research_runs
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- §8.2 "Start/cancel Research" is `Y` for owner, admin AND EDITOR and `N` for approver and viewer.
-- All three `Y` roles are named; the editor is a `Y` here and was a `P` in §8.1, which is 040's
-- distinction and is argued in the header.
--
-- USING and WITH CHECK both present, as §8.5 requires of every UPDATE policy: without the second, a
-- row admitted by the first could be updated out of the scope that admitted it. They are asserted
-- separately, because `polqual` and `polwithcheck` are two catalog columns and a reversal that
-- gutted one while leaving the other intact is invisible to a test that reads only one.
--
-- `updated_by = (select auth.uid())` is §8.5's user-action rule arriving on an UPDATE rather than on
-- an INSERT, which is where this family can carry it: §8.2 gives clients no INSERT anywhere, so
-- §8.6 case 8 — a forged actor column — is asserted here or nowhere.
drop policy if exists research_runs_update_writer on app.research_runs;
create policy research_runs_update_writer on app.research_runs
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor'))
  with check (
    updated_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
  );

-- THE POLICY THE BUSINESS/PAGE DUALITY LIVES IN, and it is 040's, unchanged, on the one table in
-- this batch that carries both columns. A business-level run is narrowed by the Business question
-- and a page-level run by the Page question, decided per row by whether the override is set. Neither
-- branch can be dropped: asking the Business question about a page-level row would admit every
-- member scoped to a sibling Page, and asking the Page question about a business-level row would
-- pass NULL and deny everyone including the unscoped.
--
-- RESTRICTIVE, because permissive policies OR together and cannot subtract. `admits`, never `covers`
-- — §8's legend reads `Y` as "ผ่านเมื่อ active + capability + scope ตรง" and §7 as "Role ให้เพดาน
-- สิทธิ์ ส่วน member scope ตัดสิทธิ์ให้แคบลงและไม่ขยาย role", so a member holding no scope row is at
-- their ceiling because nothing narrows them.
drop policy if exists research_runs_scope_narrows_member on app.research_runs;
create policy research_runs_scope_narrows_member on app.research_runs
  as restrictive
  for all to authenticated
  using (
    case when page_context_profile_id is null
      then app.member_scope_admits_business(workspace_id, business_profile_id)
      else app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)
    end
  )
  with check (
    case when page_context_profile_id is null
      then app.member_scope_admits_business(workspace_id, business_profile_id)
      else app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)
    end
  );

-- --- app.research_sources -------------------------------------------------------------------------

drop policy if exists research_sources_select_active_member on app.research_sources;
create policy research_sources_select_active_member on app.research_sources
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- THE CHILD'S NARROWING IS ITS RUN'S OWN REACHABILITY, not a copy of the run's predicate. The source
-- carries no Page column — the header says why no foreign key could keep such a copy honest — so the
-- question it asks is "is the run this belongs to reachable by me", which resolves the Business
-- question or the Page question through the run's own policy set. It cannot drift from that rule
-- because it IS that rule, and the direction is fail-closed: any narrowing added to
-- app.research_runs later makes this refuse more, never less.
drop policy if exists research_sources_scope_narrows_member on app.research_sources;
create policy research_sources_scope_narrows_member on app.research_sources
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.research_runs r
      where r.workspace_id = research_sources.workspace_id
        and r.business_profile_id = research_sources.business_profile_id
        and r.id = research_sources.research_run_id
    )
  )
  with check (
    exists (
      select 1 from app.research_runs r
      where r.workspace_id = research_sources.workspace_id
        and r.business_profile_id = research_sources.business_profile_id
        and r.id = research_sources.research_run_id
    )
  );

-- --- app.research_snapshots -----------------------------------------------------------------------
--
-- NO POLICY AT ALL, AND THAT IS THE DECISION RATHER THAN AN OMISSION. §9.1 classes this row
-- COPYRIGHT-3 with the client projection "approved excerpt only", nothing in this repository defines
-- an approval, and §9.2 forbids storing or exporting a full research snapshot in a client surface —
-- so there is no client cell to implement and no client grant for a policy to bound. §8.2's `S`
-- names the run, the source and the evidence and not the snapshot, so there is no service cell
-- either. Batch 030 established that a forced table's empty policy set has to be a decision written
-- in the file rather than an omission a reader infers; this paragraph is that decision, and
-- tests/db/identity/identity-isolation.test.mjs holds it in both directions — no policy here today,
-- and a policy appearing without the §8 row or the approval decision that would justify it fails the
-- build.

-- --- app.research_evidence ------------------------------------------------------------------------

drop policy if exists research_evidence_select_active_member on app.research_evidence;
create policy research_evidence_select_active_member on app.research_evidence
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- Two levels down: the evidence resolves through its source, which resolves through its run. Naming
-- the run here instead would be a second definition of "which run this evidence belongs to" beside
-- the one the foreign keys already fix.
drop policy if exists research_evidence_scope_narrows_member on app.research_evidence;
create policy research_evidence_scope_narrows_member on app.research_evidence
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.research_sources s
      where s.workspace_id = research_evidence.workspace_id
        and s.business_profile_id = research_evidence.business_profile_id
        and s.id = research_evidence.research_source_id
    )
  )
  with check (
    exists (
      select 1 from app.research_sources s
      where s.workspace_id = research_evidence.workspace_id
        and s.business_profile_id = research_evidence.business_profile_id
        and s.id = research_evidence.research_source_id
    )
  );

-- --- app.research_suggestions ---------------------------------------------------------------------

drop policy if exists research_suggestions_select_active_member on app.research_suggestions;
create policy research_suggestions_select_active_member on app.research_suggestions
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- §8.2 "Suggestion save/dismiss/use" is `Y` for owner, admin and editor, `P` for the approver and
-- `N` for the viewer. The three `Y` roles are named and the `P` is refused; see the header.
drop policy if exists research_suggestions_update_writer on app.research_suggestions;
create policy research_suggestions_update_writer on app.research_suggestions
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor'))
  with check (
    updated_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
  );

drop policy if exists research_suggestions_scope_narrows_member on app.research_suggestions;
create policy research_suggestions_scope_narrows_member on app.research_suggestions
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.research_runs r
      where r.workspace_id = research_suggestions.workspace_id
        and r.business_profile_id = research_suggestions.business_profile_id
        and r.id = research_suggestions.research_run_id
    )
  )
  with check (
    exists (
      select 1 from app.research_runs r
      where r.workspace_id = research_suggestions.workspace_id
        and r.business_profile_id = research_suggestions.business_profile_id
        and r.id = research_suggestions.research_run_id
    )
  );


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004, 011, 020, 021, 030, 040, 050, 051, 060, 061, 110, 130, 131 and 140 use: a
-- claim that is only a comment is a claim nobody checks. These are the properties of THIS batch
-- answerable from the catalog of the database being migrated, without a committed snapshot and
-- without a test harness. The text half lives in tests/db/identity/identity-isolation.test.mjs and
-- the live behavioural half is `make db-rls-smoke`.
--
-- WHAT IS DELIBERATELY NOT ASSERTED HERE, following 030's rule and 021's scar: 011's apply-time
-- policy count is an APPLIED migration's self-assertion that 021 had to route around rather than
-- amend. So nothing below asserts a property an approved decision or an already-named batch is
-- EXPECTED to change:
--
--   * NOT "no policy names app_worker". RFC-2026-022 §3's test classifies three of this batch's
--     statements CARRIED, and the RFC positively EXPECTS a policy `TO app_worker` on those tables
--     once §7 holds. An apply-time assertion against an approved decision's own direction is exactly
--     the trap 011 set for 021.
--   * NOT "app.research_snapshots carries no policy" and NOT "no client role holds a privilege on
--     it". The first is RFC-2026-012 §3's empty read allowlist, which exists in order to grow, and
--     the second is the COPYRIGHT-3 approval nobody has defined — a decision with an owner rather
--     than a permanent property.
--   * NOT the role list in either UPDATE policy, and NOT the number of policies on any table. §8.2's
--     approver `P` is refused on a reading RFC-2026-020 §8 could close.
--
-- All of those are asserted in the static suite instead, where the batch that changes one edits a
-- line a reviewer reads. What IS asserted here is the set of properties no approved decision is
-- expected to move: evidence's immutability and the source's append-only shape, the snapshot's
-- per-column mutability and its column allowlist, the absence of DELETE anywhere, §8.5's per-column
-- rule on the three mutable tables, DATA-DEC-07's absence as an absent default and an absent
-- interval, `anon` as a negative, the restrictive narrowings and both of their halves, ENABLE/FORCE
-- and the ownership rules.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only by
-- a superuser, and a migration that needs one to apply is a migration that cannot be applied on the
-- platform it targets, where `postgres` is not a superuser.
do $$
declare
  offending text;
  count_of  integer;
  narrowing text;
  probe     record;
  every_role constant text[] :=
    array['authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz'];
  -- §9.2's exhaustive list for a table of captured material, resolved to the columns §10's own final
  -- behavior names plus §3.2's and §3.3's required ones. 060 wrote the mechanism and 131 reused it:
  -- an ALLOWLIST, because a denylist of column names somebody thought of is defeated by the one they
  -- did not.
  snapshot_columns constant text[] :=
    array['id', 'workspace_id', 'business_profile_id', 'research_source_id', 'object_ref',
          'content_hash', 'captured_at', 'retention_until', 'purged_at', 'created_at', 'updated_at'];
  research_tables constant text[] :=
    array['research_runs', 'research_sources', 'research_snapshots', 'research_evidence',
          'research_suggestions'];
begin
  -- ENABLE and FORCE on all five. The two are DIFFERENT CATALOG COLUMNS and the data package's own
  -- lint rule reads only the first (RFC-2026-016 §4). On app.research_snapshots, which carries no
  -- policy, FORCE is the whole of what refuses the role holding the grants.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'app.research_snapshots carries no policy at all, so FORCE is the whole control '
                   'there: without it the table owner reads every captured locator and the isolation '
                   'suite cannot tell that from a working boundary.';
  end if;

  -- THE COPYRIGHT-3 COLUMN ALLOWLIST, against the live catalog. §9.2 forbids storing a full research
  -- snapshot anywhere a client, an API, an event, a job, a log or a FIXTURE can reach, and §9.1
  -- licenses only an "approved excerpt" that nothing in this repository defines. The control is that
  -- the column does not exist — 060's mechanism for a plaintext credential, 131's for a payment
  -- instrument — and this is what makes it a control rather than a comment: a later batch that adds
  -- `body text`, `content bytea` or `excerpt text` fails the migration rather than the code review.
  select string_agg(a.attname, ', ' order by a.attname) into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'research_snapshots'
     and a.attnum > 0 and not a.attisdropped
     and a.attname::text <> all (snapshot_columns);
  if offending is not null then
    raise exception 'app.research_snapshots carries column(s) a COPYRIGHT-3 row may not hold: %', offending
      using hint = '§9.1 gives this class the client projection "approved excerpt only" and §9.2 '
                   'forbids storing or exporting a full research snapshot the client may not '
                   'reproduce. Nothing here defines what APPROVES an excerpt or how long one may be, '
                   'so the row holds a LOCATOR (§10: "purge object + locator") and a HASH (§10: '
                   '"preserve permitted hash/citation metadata") and nothing else. An allowlist '
                   'rather than a denylist, because a denylist of names somebody thought of is '
                   'defeated by the one they did not.';
  end if;

  -- AND NO TABLE IN THIS BATCH CARRIES AN EXCERPT BY ANOTHER NAME. The allowlist above protects one
  -- table; §9.1's class is "research snapshot/EXCERPT" and an excerpt would most plausibly arrive on
  -- the evidence row, which is the one that cites a passage.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join unnest(array['excerpt', 'quote', 'quoted_text', 'snippet', 'passage', 'body',
                            'body_text', 'content', 'content_text', 'raw', 'raw_html', 'html',
                            'markdown', 'full_text', 'page_text', 'snapshot_body']) as forbidden
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and a.attnum > 0 and not a.attisdropped
     -- `attname` is `name` and the array is `text`; the cast is written rather than left to an
     -- implicit one, which is 050's rule about a parameter whose type is inferred from whichever
     -- context the planner reaches first.
     and a.attname::text = forbidden;
  if offending is not null then
    raise exception 'a batch 070 table carries captured or quoted source text: %', offending
      using hint = '§9.2''s absolute prohibitions end with "full research snapshot ที่ client ไม่มี'
                   'สิทธิ์ทำซ้ำ", and §9.1 licenses an APPROVED excerpt only. No document in this '
                   'repository says what approves one, who may, or how long it may be, so the column '
                   'is absent rather than unbounded. If this is the batch that brings the approval '
                   'decision, it edits this assertion in a diff a reviewer reads.';
  end if;

  -- DATA-DEC-07 IS OPEN, AND THESE TWO ASSERTIONS ARE HOW ITS ABSENCE STAYS VISIBLE.
  --
  -- FIRST: `retention_until` has NO DEFAULT. `atthasdef` is a catalog column and is the only place
  -- the difference between "every writer states a limit" and "every row inherits thirty days" is
  -- recorded. §15: an open decision is not an agent's to choose.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'research_snapshots'
     and a.attname = 'retention_until'
     and (a.atthasdef or not a.attnotnull);
  if offending is not null then
    raise exception 'app.research_snapshots.retention_until is not the column DATA-DEC-07 leaves open: %', offending
      using hint = 'It must be NOT NULL with NO DEFAULT. §10 gives "30 วัน default หรือสั้นกว่าตาม '
                   'source policy" and §15 gives DATA-DEC-07 to Research+Legal; a default would make '
                   'every row silently assert the same thirty days, which is the decision arriving as '
                   'a column, and a nullable column would let a capture be stored with no stated '
                   'limit at all.';
  end if;

  -- SECOND: no CHECK constraint on any table this batch creates mentions an interval or a day count.
  -- A negative is the strongest thing a lint can hold (RFC-2026-019 §5), and this is the one that
  -- keeps thirty days out of the schema until somebody with the authority puts it there.
  select string_agg(format('%s on %s', con.conname, c.relname), ', ') into offending
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and con.contype = 'c'
     and pg_catalog.pg_get_constraintdef(con.oid) ~* '\minterval\M';
  if offending is not null then
    raise exception 'a batch 070 constraint encodes a retention interval: %', offending
      using hint = 'DATA-DEC-07 ("Research snapshot retention, 30 วัน max default, owner '
                   'Research+Legal") is OPEN and §15 forbids an agent closing it. The only thing this '
                   'batch asserts about retention is that a capture cannot be retained until an '
                   'instant before it was taken, which uses no number.';
  end if;

  -- THE EVIDENCE ROW IS IMMUTABLE, as the privilege system holds it. §5's mutability column names
  -- exactly one object of this family — "evidence immutable" — and §8.2's "Research run/source/
  -- evidence INSERT" is `N N N N N S`, so appending is the service's and mutation is nobody's.
  -- Asserted against the live ACLs rather than against the text of the grants above, because a grant
  -- made by a LATER batch would not appear in this file at all.
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
         and c.relname in ('research_evidence', 'research_sources')
         and r.rolname::text = any (every_role)
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'an evidence or citation row can be updated or deleted: %', offending
      using hint = '§5 names evidence immutable in terms. app.research_sources is APPEND-ONLY on '
                   'batch 070''s own reading rather than on a quotation: §10 preserves "permitted '
                   'hash/citation metadata" after the captured object is purged, so the citation is '
                   'the half that outlives what it describes, and a citation editable after its '
                   'snapshot is gone is a claim about a document nobody can check.';
  end if;

  -- And the same claim as the POLICY catalog holds it, because either half alone can be satisfied
  -- while the other is wrong: a policy with no grant is inert, and a grant with no policy is denied
  -- by row level security rather than by privilege, which is a weaker refusal than immutability asks
  -- for. `w` is UPDATE and `d` is DELETE; INSERT is deliberately absent, because RFC-2026-022 §3
  -- classifies both of these tables' INSERT statements CARRIED and expects a policy once §7 holds.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('research_evidence', 'research_sources')
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'an evidence or citation table carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- THE SNAPSHOT IS APPEND-ONLY EXCEPT FOR THE PURGE'S TWO COLUMNS, per column, against the live
  -- ACL. The grant above names `object_ref`, `purged_at` and `updated_at`, and this is what says so
  -- about the other eight — including `retention_until`, which is the one that makes DATA-DEC-07's
  -- absence safe rather than merely visible: a window that can be extended by an update is not a
  -- window.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, a.attname as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        join pg_catalog.pg_attribute a on a.attrelid = c.oid
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'research_snapshots'
         and a.attnum > 0 and not a.attisdropped
         and a.attname not in ('object_ref', 'purged_at', 'updated_at')
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, a.attname, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a column of a research snapshot other than the purge''s own is updatable: %', offending
      using hint = '§10''s final behavior for RESEARCH-SNAPSHOT is "purge object + locator; preserve '
                   'permitted hash/citation metadata", so the locator and the purge stamp move and '
                   'everything that says WHAT WAS CAPTURED does not. retention_until is in this list '
                   'for a second reason: DATA-DEC-07 is open, and a retention limit a granted path '
                   'can push forward is not a limit.';
  end if;

  -- §8.5, PER COLUMN, ON THE TWO TABLES A CLIENT MAY WRITE: no role may re-identify a row, move it
  -- between tenants or across scope, or rewrite what a run was asked to do or what it proposed. The
  -- two client UPDATE grants name six columns between them and this is what says so about the rest.
  -- app_worker is IN the checked list for 050's reason: every grant this batch makes to it is
  -- column-scoped.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id',
                                'page_context_profile_id', 'brief', 'created_by']) as col
       where n.nspname = 'app'
         and c.relname = 'research_runs'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id', 'research_run_id',
                                'title']) as col
       where n.nspname = 'app'
         and c.relname = 'research_suggestions'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity, scope or content column of a batch 070 table is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant OR scope with an update, and '
                   'page_context_profile_id is in this list because it carries the second half of the '
                   'scope (040''s sentence). `brief` and `title` are in it because §8.2''s client '
                   'verbs are cancel, save, dismiss and use — rewriting what was asked or what was '
                   'proposed is none of them.';
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE FIVE. §8.5 has no broad user delete; every purge in this
  -- family is a retention job — RESEARCH-RUN and RESEARCH-SNAPSHOT both name one — and batch 160
  -- owns it through app_maintenance, which this batch grants nothing.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname::text = any (research_tables)
         and r.rolname::text = any (every_role)
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a research row can be deleted through a granted path: %', offending
      using hint = '§8.5 requires a soft delete through a typed lifecycle field where a delete is '
                   'wanted at all, and hard deletion here is a retention sweep with its own classes '
                   'and its own batch. A snapshot in particular is PURGED rather than deleted: §10 '
                   'says "purge object + locator; preserve permitted hash/citation metadata", which '
                   'is an UPDATE of two columns and not the removal of a row.';
  end if;

  -- NO CLIENT ROLE HOLDS ANYTHING ON app.research_snapshots. This is the COPYRIGHT-3 refusal as the
  -- privilege system holds it, and it is asserted for `authenticated` as well as `anon` — unlike
  -- every other batch, where only the anonymous negative is asserted at apply time — because §9.2's
  -- prohibition is about a CLIENT SURFACE rather than about anonymity, and RFC-2026-021 §7/4 decides
  -- only the second. The static suite asserts the same thing about the grant TEXT, where the batch
  -- that lands an approval decision edits a line a reviewer reads.
  select string_agg(r.rolname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app' and c.relname = 'research_snapshots'
     and r.rolname in ('authenticated', 'anon')
     and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'a client role holds a privilege on the COPYRIGHT-3 snapshot table: %', offending
      using hint = '§9.1 gives COPYRIGHT-3 the client projection "approved excerpt only" and nothing '
                   'in this repository defines an approval; §9.2 forbids a full research snapshot in '
                   'a client surface at all. The refusal is an absent GRANT rather than a policy '
                   'predicate, because a policy can be widened by an edit while a grant that was '
                   'never made has to be written.';
  end if;

  -- `anon` holds nothing on anything this batch creates. RFC-2026-021 §7/4 decided that as a
  -- NEGATIVE and it is the one client-role property no approved decision is expected to move: the
  -- RFC says reversing it needs an RFC that states what the anonymous surface is for.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on app.%, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- No policy this batch's tables carry may name an anonymous role. §8.5 gives anonymous no tenant
  -- policy. app_worker is deliberately NOT in this list: RFC-2026-022 §3's test classifies three of
  -- this batch's INSERT statements CARRIED and the RFC expects a policy once its decision is in
  -- effect.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles) and r.rolname = 'anon');
  if offending is not null then
    raise exception 'batch 070 left a policy for the anonymous role: %', offending;
  end if;

  -- FOUR RESTRICTIVE POLICIES, ONE PER TABLE THAT HAS ONE, AND THE FIFTH TABLE HAS NONE OF ANY KIND.
  -- `polpermissive` is the one catalog column that tells a narrowing from a widening: a permissive
  -- policy with the same name and the same predicate would WIDEN each table instead of narrowing it,
  -- and §12.6/2 would silently stop being implemented here.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and not pol.polpermissive;
  if count_of <> 4 then
    raise exception 'batch 070 wrote % restrictive policies and it creates four tables to narrow', count_of
      using hint = 'One per table a client may read. app.research_snapshots has none because it has '
                   'no policy at all — §9.1 classes it COPYRIGHT-3 and no client role is granted '
                   'anything on it. A child table with no narrowing is a table where every active '
                   'member reaches every row their membership admits, which would leave a '
                   'page-restricted run''s sources readable to a member the run itself is hidden '
                   'from.';
  end if;

  -- THE ASSERTION THIS BATCH OWES MOST, and it is about the four predicates rather than their count.
  --
  -- BOTH CATALOG COLUMNS, AND THAT IS 040's PROBE RATHER THAN CAUTION. `polqual` is USING and
  -- `polwithcheck` is WITH CHECK; they are two predicates, and a reversal that gutted one while
  -- leaving the other intact went UNNOTICED by the first version of 040's block and by the static
  -- test beside it. A restrictive policy whose USING lost the Page branch filters nothing on read
  -- for a page-scoped member while still refusing their writes — the leak, without the symptom.
  --
  -- The run's narrowing must ask BOTH the Business question and the Page question, because §4
  -- invariant 3 makes the Page a nullable override on a row that always carries a Business. Each
  -- child's must resolve through its own parent, because a child that asked about its own columns
  -- would ask the Business question about the history of a page-restricted run.
  count_of := 0;
  for probe in
    select c.relname as target,
           pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)      as using_half,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname::text = any (research_tables)
       and not pol.polpermissive
  loop
    count_of := count_of + 1;
    foreach narrowing in array array[probe.using_half, probe.check_half] loop
      if probe.target = 'research_runs' then
        if narrowing is null
           or position('member_scope_admits_business' in narrowing) = 0
           or position('member_scope_admits_page' in narrowing) = 0 then
          raise exception 'the research run narrowing does not ask both the Business and the Page question: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = '§4 invariant 3 makes the Page scope a nullable override on a row that '
                         'always carries a Business scope, so the narrowing decides per row which '
                         'question to ask. Dropping the Page branch admits every member scoped to a '
                         'sibling Page — and dropping it from ONE of USING and WITH CHECK hides that '
                         'on the half a test is not looking at.';
        end if;
      elsif probe.target = 'research_evidence' then
        if narrowing is null or position('research_sources' in narrowing) = 0 then
          raise exception 'the evidence narrowing does not resolve through its source: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'The evidence row carries no page column, so its reach is its source''s '
                         'reach, which is its run''s reach. A narrowing that asked about the '
                         'evidence''s own columns would ask the Business question about a '
                         'page-restricted run.';
        end if;
      else
        if narrowing is null or position('research_runs' in narrowing) = 0 then
          raise exception 'the % narrowing does not resolve through its run: %', probe.target,
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'A source and a suggestion carry no page column, so each one''s reach is its '
                         'run''s reach — asserted rather than copied, because a nullable copy of the '
                         'run''s page could not be held equal to it by any foreign key (MATCH SIMPLE '
                         'skips a null).';
        end if;
      end if;
    end loop;
  end loop;
  if count_of <> 4 then
    raise exception 'batch 070 found % restrictive policies to inspect and there must be four', count_of;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 070 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  -- The POLICY COUNT is deliberately not re-asserted: 021 owns that assertion on the far side of the
  -- batch that could have moved it, and repeating it would be a second home for a number.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason every batch since 020 asks
  -- them: scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 070 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
