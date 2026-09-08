-- Batch 110 — the Meta connector: the connection, the accounts it discovers, the credential
-- REFERENCE, and the raw webhook inbox.
--
-- Owner: A6 Meta Connector. The migration ownership registry (§6) reserves 110 to this package,
-- describes it as "connection/account/webhook inbox", and depends it on 020 and 050.
--
-- Depends on: 000 (schemas `app` and `private`, private.set_updated_at), 001 (app_worker),
-- 010 (app.workspaces). All three are merged; migration invariant 1 forbids rewriting any of them
-- and NOTHING BELOW DOES — every statement here creates a new object, and this file writes no
-- `drop policy`, because it writes no policy. A test asserts that pairing rather than trusting
-- this sentence.
--
-- 020 AND 050 ARE THE REGISTRY'S DEPENDENCIES AND NOT ONE STATEMENT BELOW CALLS EITHER. Batch 050
-- recorded the same shape about its own declared dependency on 011 and did not manufacture a
-- foreign key to justify it; this is that sentence about two batches instead of one. 020's page
-- scope and 021's `member_scope_covers_page` helper are what a policy on a CHANNEL BINDING would be
-- written against, and this batch creates no binding — see the refusal below. 050's queue is what
-- would process an inbox row, and this batch grants no writer — see the three verbs.
--
--
-- ============================================================================================
-- WHAT THIS BATCH CREATES, AND THE TABLE IT REFUSES
-- ============================================================================================
--
-- Three documents name this family and no two name the same set:
--
--   §5 inventory   `connector.meta` | connections/accounts/bindings | workspace/business/page |
--                  mutable + history | INTEGRATION-2/SECRET-4 | CONNECTION-HISTORY | A6 Meta
--                  `connector.meta` | raw webhook inbox | PRIVATE WORKSPACE |
--                  append/process/purge | PROVIDER-3/SECRET-4 | WEBHOOK-SHORT | A6 Meta
--   §6 registry    110 | "connection/account/webhook inbox", depends on 020, 050
--                  111 | A0 Integration | 110, 020, 081 | "business-channel/social FK"
--   §4 ERD         WORKSPACE ||--o{ META_CONNECTION : connects
--                  META_CONNECTION ||--o{ SOCIAL_ACCOUNT : discovers
--                  BUSINESS_PROFILE ||--o{ CHANNEL_BINDING : binds
--                  PAGE_CONTEXT_PROFILE ||--o{ CHANNEL_BINDING : contextualizes
--                  SOCIAL_ACCOUNT ||--o{ CHANNEL_BINDING : targets
--
-- This batch creates the THREE the registry gives it — a connection, the accounts under it, and
-- the raw webhook inbox — plus the credential REFERENCE the connection cannot exist without, and
-- refuses the binding. That is 050's arithmetic ("five names, three names, two entities") applied
-- to a different disagreement, and the reason here is sharper than a registry omission.
--
-- NO `app.channel_bindings`, AND THE REASON IS THAT ITS DEFINING FOREIGN KEY BELONGS TO 111.
-- A binding is the one entity in §4's second diagram with THREE parents, and two of them —
-- `BUSINESS_PROFILE` and `PAGE_CONTEXT_PROFILE` — belong to another module (`business.core`, batch
-- 020, A1 Business). §6's migration invariant 6 puts a cross-module foreign key in an integration
-- batch and nowhere else "เว้นแต่ registry ระบุเจ้าของชัดเจน" — unless the registry names the
-- owner clearly — and the registry does name one: 111, A0 Integration, "business-channel/social
-- FK". So the two ways to create the table here are a dangling uuid column pointing at nothing, or
-- the foreign key this batch is forbidden to write.
--
-- BATCH 020 REACHED THE SAME PLACE FROM THE OTHER SIDE and said so: "§5's inventory row reads
-- `page_context_profiles, versions, bindings` for this module. The binding carries
-- `social_account_id` (§3.3), whose table is batch `110` … Creating the table here would mean
-- either a dangling uuid column pointing at nothing or a foreign key this batch is forbidden to
-- write. … Owed by 110/111." Both batches that could own it decline for the same rule, from
-- opposite directions, which is what makes this a REGISTRY GAP rather than a preference: §5 gives
-- "bindings" to TWO module rows — `business.core` and `connector.meta` — and §6's file ownership
-- contract says one table has one owner. **Owed to A0 and to whoever reconciles §5's two rows with
-- §6's 111.** It is recorded in the work package's open blockers rather than resolved by a batch.
--
-- The consequence, stated rather than discovered: §4's relation invariant 2 — "Social Account ผูก
-- Active Business เดียวในช่วงเวลาเดียวกัน" — is a constraint ON THE BINDING (one active Business per
-- Social Account at a time), and this batch enforces nothing about it, because the column pair it
-- would be over does not exist here. That is not a weakening: an invariant enforced by a table
-- nobody owns is an invariant enforced by nothing, and the honest form is to say which batch owes
-- it. §3.3's own rule agrees about where the column lives: `social_account_id` is "required when
-- target/publish/metrics", and a binding is the first of those.
--
--
-- ============================================================================================
-- WHAT "private workspace" TURNS OUT TO MEAN, WHICH IS THE PHRASE NO OTHER INVENTORY ROW USES
-- ============================================================================================
--
-- §5's Scope column reads `workspace`, `global/workspace`, `workspace/business/page`, `user`,
-- `business/page` and — for `audit.core` — `workspace/private`. The raw webhook inbox is the one
-- row whose scope is spelled **"private workspace"**, and four documents agree on what it commits
-- this batch to:
--
--   * §3.1's trust-zone table names it in the `private` row BY NAME: "authorization helpers, secret
--     references, RAW WEBHOOK, worker payload, reconciliation | ไม่มี direct grant | Server/worker
--     ผ่าน typed service เท่านั้น". So the inbox is in `private`, and no role holds a direct grant.
--   * §14's G0 gate checklist has a box somebody has to tick: "Secret/RAW WEBHOOK/internal job
--     tables ไม่ exposed". `app` is the exposed schema (DATA-DEC-01, RFC-2026-015).
--   * §10's `WEBHOOK-SHORT` row says, in its own "after closure" column, **"no tenant access"**.
--   * §11.1/5 excludes raw webhook from the PDPA export a workspace owner may request, beside
--     secrets, internal job payloads and provider credentials.
--
-- And §8.3 says the same thing in the matrix: "Raw token/webhook SELECT | N | N | N | N | N | S".
-- Five `N`s and one `S`. **DOES A CLIENT EVER READ A RAW WEBHOOK BODY? No — not by a policy that
-- has not been written, and not by an allowlist entry either.** RFC-2026-012 §3 and RFC-2026-021
-- put every client read behind a `security_invoker` view on an allowlist that starts EMPTY and
-- grows only by RFC, and RFC-2026-012's own inventory row for this family is the shortest in the
-- document: "raw webhook inbox | **server-only** | `private`, no direct grant". A raw provider
-- payload is not the entry that opens that list.
--
-- SO "private workspace" IS A ZONE AND A SCOPE, AND THE SCOPE IS AN OUTPUT RATHER THAN AN INPUT.
-- The row lives in `private`; it carries `workspace_id`, which §3.3 makes the canonical scope
-- field; and that column is **NULLABLE**, which no other scope column in this schema is. A webhook
-- arrives from the provider before anything in this system knows whose it is: resolving it means
-- matching the provider's account identifier against `app.social_accounts`, and that match can
-- FAIL — an unknown account, a replayed delivery, a forged one. A `NOT NULL` scope column would
-- mean exactly those payloads could not be stored, which is the opposite of what a raw inbox is
-- for and would delete the evidence a security investigation wants most. The apply-time block
-- asserts the nullability, because a later batch tightening it would silently convert a scope the
-- statement DISCOVERS into one it CARRIES (RFC-2026-022 §3) and make the row unstorable on the day
-- resolution fails.
--
--
-- ============================================================================================
-- THE THREE VERBS: append / process / purge, AND HOW EACH ONE COMES OUT
-- ============================================================================================
--
-- §5 gives the inbox the mutability "append/process/purge". It is the only three-verb lifecycle in
-- the inventory, and each verb lands differently.
--
-- **APPEND — no writer, and the route into `private` is the one §3.1 names.** No role is granted
-- INSERT here, because no role is granted anything in `private` at all: §3.1's own column says
-- "ไม่มี direct grant … Server/worker ผ่าน typed service เท่านั้น", RFC-2026-012 §4 names what a
-- typed service is (a `SECURITY DEFINER` command function owned by `app_command`), and
-- RFC-2026-021 §10 records that none exists. Batch 060 made the identical call for the identical
-- reason on the one other table this repository has put in `private`. The receiver that would
-- write these rows is an edge path in a `src/` that does not exist.
--
-- **PROCESS — the middle verb has no actor, and 050 refused to build one for exactly this
-- reason.** Processing an inbox row means SELECTING the next unprocessed row, resolving which
-- workspace it belongs to, and stamping it. `RFC-2026-022` (approved 2026-09-08) classifies that
-- statement by name:
--
--   | Raw token/webhook SELECT | `110`, `131` | **DISCOVERED** | an inbox row arrives from the
--     provider; the workspace is what reading it resolves |
--
-- Under §3's operational test, adding `and workspace_id = (select nullif(current_setting(
-- 'app.workspace_id', true), '')::uuid)` to that statement's `WHERE` does not narrow the same
-- work — it changes "the unprocessed webhook" into "the unprocessed webhook of a tenant I already
-- knew", which is not the work. So the cell is DISCOVERED, and RFC-2026-022 §5/5 decides what a
-- DISCOVERED cell gets: **no policy, permanently, not pending**, with the statement performed
-- through a `SECURITY DEFINER` broker owned by a fifth not-a-path role that does not exist yet.
--
-- **AND THE DECISION IS NOT IN EFFECT, SO THIS BATCH WRITES NO SERVICE POLICY EITHER WAY.** §5/8
-- and the map's own header record why: measured 2026-09-08, the only member of `app_worker` is
-- `postgres`, which BYPASSES row level security, so a policy `TO app_worker` is unreachable except
-- from an identity for which it is moot. What this batch does instead is what RFC-2026-022 §7.2
-- asks for — it classifies the cell as DATA, in `db/foundation/lint/service-policy-map.json`,
-- where the next batch reads the answer rather than re-deriving it. 131 owns the same cell for the
-- payment inbox and will add its own row; the register keys on the statement, so two rows for one
-- cell on two tables is the shape §5/1 describes rather than a duplicate.
--
-- THE WORKSPACE GUC IS CONTAINMENT AND NEVER TENANT ISOLATION OF THE SERVICE PATH, and nothing in
-- this batch — no comment, no note, no case — cites it as the latter. RFC-2026-022 §5/4 measured
-- the reason: the role the policy names can set the setting the policy reads, twice in one
-- transaction, and `has_parameter_privilege` cannot even be asked who may.
--
-- **PURGE — a retention rule with a purge in it, and no scheduler exists.** §10's `WEBHOOK-SHORT`
-- row is precise and unimplementable today:
--
--   | `WEBHOOK-SHORT` | raw Meta/payment webhook inbox | 30 วันหลัง processed; 90 วัน failure/DLQ |
--     no tenant access | redact/purge payload, retain dedupe hash longer |
--
-- Batch 160 owns the retention job (§6's registry, "retention/export/anonymization"), §10's own
-- numbers need Product/Security/Legal approval before Paid Beta and §15 forbids an agent choosing
-- an open decision, and `app_maintenance` is granted nothing by this batch — so no window is
-- encoded in a constraint, where it would read as ratified. What this batch DOES provide is 010's
-- treatment of `expires_at` before the sweep that reads it existed: **the columns each sweep needs
-- and an index over them.** The row's shape is derived from that sentence rather than from a guess:
--
--   `processed_at`   the 30-day window's start, and the column the second verb stamps
--   `failed_at`      the 90-day window's, because §10 names "failure/DLQ" as a separate window
--   `delivery_hash`  the "dedupe hash" the same sentence says is RETAINED LONGER than the payload
--   `body_ref`       nullable, because "redact/purge payload" means the row OUTLIVES the payload
--   `redacted_at`    so a null `body_ref` after redaction is distinguishable from one that never
--                    had a body — which it could not otherwise be, and a retention job cannot
--                    report what it purged from a column that forgot
--
-- The two halves of "retain dedupe hash longer" are therefore SEPARATE COLUMNS, which is the whole
-- reason that sentence is in §10: a schema that stored the body and its hash in one place could not
-- obey it. Nothing here can set any of those columns, because nothing holds a grant; they are the
-- shape the sweep will need, declared where a reviewer can disagree with it.
--
--
-- ============================================================================================
-- SECRET-4 SITS ON BOTH INVENTORY ROWS, AND BATCH 060 ALREADY ANSWERED THE QUESTION
-- ============================================================================================
--
-- A connector holds provider tokens. §9.1's `SECRET-4` examples are "API key, OAuth token, signing
-- secret, push token" — an OAuth token is the class's own second example, and a Meta connection is
-- made of one. So the question this batch cannot avoid is where the token goes, and the answer is
-- that IT DOES NOT GO ANYWHERE IN THIS DATABASE.
--
-- FIVE SOURCES SAY SO, AND NONE OF THEM IS THIS FILE:
--
--   * §9.1, storage rule for `SECRET-4`: "vault/encrypted secret store; **never plaintext DB/log**".
--     Client projection: "never returned after write".
--   * §9.2, absolute prohibitions: "plaintext BYOK/API key/**OAuth access token/refresh token/
--     webhook secret**" may not be stored or exported in client/API/event/job/log/**fixture**.
--   * §9.2 again, positively: "Secret table เก็บได้เพียง `credential_reference`, provider,
--     fingerprint/last-four-like identifier, status, created/rotated/expired timestamps และ audit
--     reference" — an exhaustive permitted column list.
--   * §4's relation invariant 9: "Credential/API key/token เก็บเป็น secret reference เท่านั้น ไม่อยู่
--     exposed row".
--   * §8.3: "Plain credential SELECT | N | N | N | N | N | N" — every role, the service included.
--
-- **BATCH 060 FACED THE IDENTICAL QUESTION FOR AI PROVIDER CREDENTIALS AND THIS BATCH FOLLOWS ITS
-- ANSWER.** `private.ai_credential_references` is a table in `private`, holding a LOCATOR in the
-- vault §9.1 requires, with §9.2's column list enforced as an ALLOWLIST by its own apply-time
-- block, granted to no role at all. `private.meta_credential_references` below is that table for a
-- Meta connection, statement for statement, and the two differences are declared rather than left
-- for a reviewer to find:
--
--   1. NO `provider` COLUMN, THOUGH §9.2 PERMITS ONE. 060 needed one because DEC-014 fixes FIVE AI
--      providers and §3.2 makes a Phase 1 value set a named CHECK; this family has one provider,
--      named by the module key and by the table's own name, so the CHECK would be a vocabulary of
--      one. 060 itself declined two of §9.2's permissions on the same ground — "permitting is not
--      requiring" — and this is the third.
--   2. THE PARENT LINK IS A COMPOSITE FOREIGN KEY. 060's row hangs off `app.workspaces` alone,
--      because an AI credential belongs to a Workspace and to nothing below it. A Meta credential
--      belongs to a CONNECTION, so §3.3's relation rule applies — "Child ต้องยืนยันว่า parent อยู่
--      Workspace เดียวกันด้วย composite FK" — and the reference cannot claim a Workspace its
--      connection is not in. That is 020's discipline reaching `private` for the first time.
--
-- WHAT DOES NOT DIFFER, AND IS THE POINT: there is no plaintext column, no ciphertext column and
-- no wrapped-key column, the apply-time block refuses any column outside the permitted list so a
-- later batch adding `access_token text` fails the MIGRATION rather than the code review, and no
-- role — client or service — holds a privilege on the table. 060's sentence, unchanged: no CHECK
-- can tell a vault handle from an API key, so the control is that the key has no column to be in.
--
-- AND THE REFERENCE DOES NOT POINT THE OTHER WAY. `app.meta_connections` carries NO
-- `credential_reference` column and no foreign key into `private`. 060 refused the same pointer in
-- the same direction — "a foreign key from `app.ai_model_policies` into
-- `private.ai_credential_references` would put the identity of a secret reference on the EXPOSED
-- side of the boundary §3.1 draws". RFC-2026-012's inventory ASSUMES the opposite shape: its row
-- reads "meta connections/accounts/bindings | health projection view only | **base row carries a
-- credential reference (SECRET-4)**". That parenthesis is the RFC's stated REASON, not its
-- decision, and it is not true of this schema — so it is recorded here rather than quietly
-- contradicted. **The DECISION that row states — "health projection view only" — is unaffected and
-- is followed below**, and §9.1's own `INTEGRATION-2` client projection ("health projection only")
-- is an independent source for it.
--
-- THE RAW WEBHOOK BODY IS SUBJECT TO THE SAME RULE, WHICH IS WHY THE INBOX HOLDS A REFERENCE.
-- §5 puts `SECRET-4` on the inbox row too, and it is there for a reason a reader might otherwise
-- miss: a provider's webhook body can CONTAIN a secret — a signed request, an app secret proof, a
-- token echoed back by a re-auth event — and §9.1's storage rule for that class is "never
-- plaintext DB/log". §9.2 adds "raw Authorization/Cookie headers" outright. §5's own word ban then
-- closes the last door: "ห้ามใช้คำว่า metadata, config, payload หรือ JSON โดยไม่ระบุ JSON Schema
-- version, maximum size, prohibited fields และ owner", and no JSON Schema for a Meta webhook body
-- exists anywhere in this repository. So the inbox holds `body_ref`, a bounded locator with a
-- named grammar, and never a body. Batch 050 met the same rule from the other end and refused an
-- outbox payload column for the contract's reason; this is that refusal where the reason is the
-- classification.
--
--
-- ============================================================================================
-- §8.3's THREE ROWS, AND WHY NONE OF THEM BECOMES A POLICY HERE
-- ============================================================================================
--
--   | Meta connection health SELECT     | Y | Y | P | N | N | P |
--   | Connect/disconnect/re-auth Meta   | Y | P | N | N | N | P |
--   | Raw token/webhook SELECT          | N | N | N | N | N | S |
--
-- **THE FIRST ROW GRANTS A PROJECTION, NOT A ROW, AND THE OBJECT IT GRANTS DOES NOT EXIST.** The
-- cell is "Meta connection **health** SELECT", and §9.1's `INTEGRATION-2` row gives the same
-- family the client projection "**health projection only**" with the storage rule "redact external
-- identifiers". That is the shape batch 050 met in §8.4's "Job **redacted status** SELECT" beside
-- §9.1's "redacted status only", and it read it the only way it reads: the two rows are one table
-- and two objects, so a base-table grant would hand a client the row where the matrix granted a
-- projection. RFC-2026-012 §2 makes the projection a named `security_invoker` view and §3 puts
-- every such view on a read allowlist; RFC-2026-021 (approved 2026-09-06) defines what an entry IS
-- — five objects and a registry row — and the allowlist is empty.
--
-- SO `authenticated` IS GRANTED NOTHING ON ANY TABLE IN THIS BATCH, and the health projection is
-- written down as a CANDIDATE rather than built. RFC-2026-021 §4's criteria, read here so the RFC
-- that writes it starts from a reading rather than a blank page:
--
--   C1 (a named client caller exists, and it is a client) FAILS TODAY, for the reason it failed for
--      the industry catalog and for a job's redacted status: there is no `src/`, no client module
--      and no screen named in any source document that reads connection health. This is the only
--      criterion that fails.
--   C7 (a global table states its blast radius) DOES NOT APPLY: `app.meta_connections` is a TENANT
--      table, so the policy behind the view is a predicate row level security can express and a
--      mistake reaches one workspace.
--   C2/C3 (an explicit column list, column-scoped, exactly the columns the view touches) IS THE
--      WORK, and this batch deliberately does not pre-empt it — see the note on `health` below.
--   C6 asks whether §8.1's editor `P` is per-policy or own-row. It is the capability set §7 names
--      and no document defines (RFC-2026-020 §8), which is the same refusal 020 made about the
--      editor's `P` on a Business.
--
-- **THE SECOND ROW IS A COMMAND, AND ITS ESSENTIAL HALF IS OUTSIDE THE DATABASE.** "Connect/
-- disconnect/re-auth Meta" is `Y` for the owner, and this batch implements it for nobody. 060 said
-- the owner's `Y` on "BYOK credential manage" is owed to the typed service; this cell has that
-- reason and one more that is specific to a connector:
--
--   * CONNECTING means an OAuth exchange with Meta, and §3.4 forbids it in the same breath as it
--     forbids the workaround: "ห้ามเรียก external provider ขณะถือ DB transaction". A client INSERT
--     on `app.meta_connections` could therefore only ever write a connection row for a credential
--     that does not exist yet, in a transaction that may not go and get one.
--   * RE-AUTH is a rotation of a value in the vault. The database's whole share of it is
--     `rotated_at` on a row in `private` that no role may reach.
--   * DISCONNECT looks like the one implementable third — an UPDATE setting `revoked_at` — and it
--     is the most misleading of the three. §11.4 step 2 spells the operation "Revoke browser
--     sessions, push tokens, invitations, **API/connector credentials**"; the timestamp is the
--     RECORD of that revocation, not the revocation. A policy that let a client stamp it without
--     revoking anything would produce a row asserting a revocation that did not happen, which is
--     worse than no path at all.
--
--   So the whole row is owed to the command surface (RFC-2026-012 §4) and to `DATA-DEC-03`, and it
--   is recorded in the work package's open blockers rather than half-built here. Granting
--   `authenticated` an UPDATE on one column would also be a NEW entry on the list RFC-2026-021
--   §8.5 requires to be CLOSED — "any new one fails" — which 030, 040 and 130 each grew while
--   recording the debt. **This batch adds nothing to it**, which is a consequence of the refusals
--   above rather than a virtue of the batch.
--
-- **THE THIRD ROW IS THE `S` CELL, AND IT IS CLASSIFIED RATHER THAN IMPLEMENTED** — see the three
-- verbs above. `app_worker` gets grants on the two `app` tables and NO POLICY, which is the shape
-- batch 010 introduced and every batch since has kept: without a grant a service refusal is 42501
-- either way and proves only that somebody forgot a GRANT; with the grant and no policy, an empty
-- read can only have come from row level security, and a service role that had quietly acquired
-- BYPASSRLS would SUCCEED where the suite demands a refusal. On the two `private` tables it holds
-- nothing at all, which is 060's departure from that shape and is argued in the privilege section.
--
-- `anon` IS GRANTED NOTHING, which since 2026-09-06 is an approved decision rather than an
-- inherited convention: RFC-2026-021 §7/4 decides it in terms and gives the structural reason —
-- the first `anon` grant is not one grant, it is `grant usage on schema app`, and it changes the
-- DENIAL LAYER of every object in `app` at once.
--
--
-- ============================================================================================
-- WHAT §5 AND §9.3 ASK FOR THAT THIS BATCH CANNOT PAY, NAMED RATHER THAN LEFT
-- ============================================================================================
--
--   * **`CONNECTION-HISTORY` IS NOT A CLASS §10 DEFINES.** §5 assigns it to the first row of this
--     family. §10's table has twenty-seven rows and none of them is that one. This is the THIRD
--     time a batch has reported the same defect — 030 found `CATALOG` undefined for `industry.core`
--     and 050 found `LEDGER` undefined for `jobs.kernel` — and it is reported here rather than
--     resolved: §10's numbers need Product/Security/Legal approval (§15) and a window written into
--     a constraint would read as ratified. The second row's class, `WEBHOOK-SHORT`, IS defined, and
--     everything this batch does about retention is done from that row. **Owed to §10's own
--     approval, to DATA-DEC-06's neighbours and to batch 160.**
--
--     §5 also calls the first row "mutable + HISTORY", and no history table is created: `HISTORY`
--     is a defined retention class ("immutable business/page/knowledge/content versions"), §4's ERD
--     gives META_CONNECTION and SOCIAL_ACCOUNT no version entity, and 021 refused to create
--     `workspace_member_scope_versions` because "creating one would be reserving a table no
--     registry row gives this batch". The registry gives 110 "connection/account/webhook inbox".
--     §11.3's "เก็บ redacted history" for a Meta binding is about the binding, which is 111's.
--
--   * **NO `health` COLUMN, ON A TABLE WHOSE §8 CELL IS ABOUT HEALTH.** §8.3 names "Meta connection
--     health" and §9.1 names "account display/capability/health" as `INTEGRATION-2` content, and
--     NO DOCUMENT SAYS WHAT A HEALTH RECORD CONTAINS. 010 refused to invent a four-value status
--     vocabulary for an invitation, 021 a lifecycle field, 030 a status for an assignment and 060 a
--     `status` on a credential reference that §9.2 expressly permits; this is the same refusal with
--     an extra reason of its own — RFC-2026-021 §4's C2 makes the projection's COLUMN LIST the
--     substance of an allowlist entry, so inventing the health columns here would be writing the
--     entry's contents in the batch that is refusing to write the entry. The lifecycle this batch
--     does record is timestamps (`created_at`, `revoked_at`), which is 010's shape.
--
--   * **NO RAW EXTERNAL ACCOUNT IDENTIFIER, ONLY ITS HASH.** §9.3 asks for two things — "External
--     account ID: raw encrypted/private reference + stable hash for uniqueness" — and this batch
--     stores the second and refuses the first. The hash is what uniqueness needs and it is enough
--     for every assertion this schema can make. The raw identifier would need either an encryption
--     mechanism no decision in this repository names (§9.3's other encryption requirements are
--     platform-level: "Database backup/object storage: platform encryption at rest") or a private
--     reference reachable only through the typed service that does not exist. Storing it plainly in
--     `app` instead would be the one place this batch put a value §9.1 tells it to redact into the
--     exposed schema. **Owed to the batch that brings the typed service and to 120**, which is the
--     first batch with a caller that has to address a Page at the provider. This is 010's treatment
--     of an invitation token — "store cryptographic hash only", §9.3's own first line — applied to
--     the identifier one row over.
--
--   * **NO SIGNATURE, NO HEADERS AND NO VERIFICATION RECORD ON AN INBOX ROW.** §9.2 forbids raw
--     Authorization and Cookie headers outright; no document specifies how a Meta webhook signature
--     is verified or what is retained about the verification; and a `verified_at` column invented
--     here would be a control nobody wrote asserting itself in the catalog. What the row does carry
--     is the dedupe hash §10 names, and the apply-time allowlist refuses anything else.
--
--   * **NO `created_by` / `updated_by` ON `app.social_accounts` OR ON THE INBOX.** §3.2 attaches
--     the actor columns to a USER mutation. §4's ERD verb for a social account is "**discovers**" —
--     the connection discovers the accounts, which is the service's act, not a member's — and a
--     webhook arrives from a provider. `app.meta_connections` DOES carry them, because §8.3 makes
--     connecting an owner operation, so that row is user-originated even though no granted path
--     reaches it (060's reading of the same sentence).
--
--   * **NOTHING ABOUT WORKSPACE LIFECYCLE VISIBILITY.** Unchanged from 020's, 030's, 040's and
--     050's headers, and vacuous here for 050's reason: no policy reads anything, so there is no
--     predicate for a lifecycle gate to be missing from. §11.4 step 2 revokes connector credentials
--     and step 7 purges connector data; both are owed to the command surface and to batch 160.
--
--   * **NO COMMAND FUNCTION AND NO `app_command` GRANT ANYWHERE IN THIS BATCH.** 010's sentence,
--     unchanged through seven batches: a grant issued ahead of the thing that needs it is a grant
--     nobody reviews against a caller.


-- ---------------------------------------------------------------------------------------------
-- app.meta_connections — one Meta authorization grant, held by a Workspace.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` (§3.3); §4's ERD reads WORKSPACE ||--o{ META_CONNECTION.
-- Sensitivity INTEGRATION-2 (§9.1: "account display/capability/health"); retention is §5's
-- `CONNECTION-HISTORY`, which §10 does not define (header).
--
-- It carries LESS than a reader might expect, and 020 wrote the sentence first: the attribute
-- surface a connector will eventually need is health (undefined, see the header), the accounts it
-- discovered (the next table) and the credential (in `private`, where §3.1 puts it).
create table if not exists app.meta_connections (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid        not null references app.workspaces (id),
  -- §9.1's `INTEGRATION-2` example begins "account display". It is display text and nothing else:
  -- the connection's IDENTITY at the provider is not stored here at all (§9.3, header).
  display_name  text        not null,
  -- §11.4 step 2, "Revoke browser sessions, push tokens, invitations, API/connector credentials",
  -- as a timestamp rather than as an invented status vocabulary. 010 justified `revoked_at` on an
  -- invitation the same way and 060 on a credential reference.
  revoked_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid,
  constraint meta_connections_display_name_not_blank check (length(btrim(display_name)) > 0),
  -- The target of the composite foreign keys below. `id` alone is already unique; this pair is what
  -- lets a child — including one in `private` — assert that its own workspace_id is the one this
  -- connection actually has (§3.3, §4 invariant 10).
  constraint meta_connections_scope_key unique (workspace_id, id)
);

comment on table app.meta_connections is
  'Owner: A6 Meta Connector (connector.meta, batch 110). Canonical scope workspace_id (§3.3); §4''s '
  'ERD reads WORKSPACE ||--o{ META_CONNECTION. Sensitivity INTEGRATION-2; §5 assigns the retention '
  'class CONNECTION-HISTORY, WHICH §10 DOES NOT DEFINE — the third family where §5 names a class §10 '
  'omits, recorded in the header and owed to §10''s approval and batch 160. IT HOLDS NO CREDENTIAL '
  'AND NO POINTER TO ONE: §4 invariant 9 keeps a token out of an exposed row and §3.1 puts the '
  'reference in `private`, so the link runs private -> app and never the reverse (060''s refusal). '
  'NO client role holds any privilege and NO policy is written: §8.3''s "Meta connection health '
  'SELECT" grants a HEALTH PROJECTION, which is a security_invoker view on the read allowlist '
  'RFC-2026-012 §3 and RFC-2026-021 give to an RFC, and "Connect/disconnect/re-auth Meta" is a '
  'command whose essential half is an OAuth exchange §3.4 forbids inside a transaction.';
comment on column app.meta_connections.workspace_id is
  'INTEGRATION-2. The canonical tenant scope, excluded from the UPDATE grant so a connection cannot '
  'be moved between tenants by an update (§8.5), and the column §11.4''s closure steps address a '
  'workspace''s connectors by.';
comment on column app.meta_connections.display_name is
  'INTEGRATION-2. §9.1''s "account display". Display text only — §9.1''s storage rule for this class '
  'is "redact external identifiers", and the provider''s identifier for this grant is not a column '
  'of this table (§9.3, and the migration header on what is refused).';
comment on column app.meta_connections.revoked_at is
  'INTEGRATION-2. §11.4 step 2 revokes API/connector credentials during workspace closure. It is the '
  'RECORD of a revocation and not the revocation, which is why no client UPDATE grant sets it: the '
  'act itself is a vault write and a call to the provider, and a row asserting a revocation that did '
  'not happen is worse than no path at all.';
comment on column app.meta_connections.created_by is
  'AUTH-3. The acting user. §8.3 marks "Connect/disconnect/re-auth Meta" `Y` for the owner, so this '
  'row is user-originated even though this batch grants no write path to reach it. Not FK-'
  'constrained: §11.2 forbids cascade-deleting history when a member is removed and requires the '
  'actor field be anonymized instead.';
comment on column app.meta_connections.updated_by is 'AUTH-3. See created_by.';


-- ---------------------------------------------------------------------------------------------
-- app.social_accounts — a Facebook Page or Instagram account DISCOVERED under a connection.
-- ---------------------------------------------------------------------------------------------
--
-- §4: META_CONNECTION ||--o{ SOCIAL_ACCOUNT : discovers. `id` is §3.3's canonical
-- `social_account_id`, which batches 111, 120 and 121 refer to this row by; the name is spelled in
-- full there and the primary key is `id`, as every other table in this schema does it.
--
-- The composite foreign key is §3.3's relation rule and §4's invariant 10: a discovered account
-- cannot claim a Workspace its connection is not in, and the mismatch fails with 23503 at the
-- constraint for every caller, including one a policy would have admitted.
create table if not exists app.social_accounts (
  id                     uuid        primary key default gen_random_uuid(),
  workspace_id           uuid        not null,
  meta_connection_id     uuid        not null,
  -- §4's relation invariant 7 — "FB และ IG เป็น Publish Target แยกกัน" — names exactly two Meta
  -- surfaces, and §5's own prose names the same pair ("Workspace มีหลาย Page/IG ได้"). §3.2 makes a
  -- Phase 1 state `text` + a named CHECK whose values change by migration only, which requires
  -- knowing the values; these are the document's own tokens, lowercased, exactly as 060 lowercased
  -- DEC-014's provider names. A third Meta surface is a migration a reviewer reads. A reviewer who
  -- prefers longer spellings is disagreeing with the source rather than with this file.
  account_kind           text        not null,
  display_name           text        not null,
  -- §9.3: "External account ID: raw encrypted/private reference + stable hash for uniqueness". This
  -- is the second half; the first is refused in the header with its owner named. It is `bytea` and
  -- exactly 32 octets because that is one sha256, which is the digest 010 already uses for an
  -- invitation token — and an EQUALITY rather than 010's floor, because §9.3 asks for a stable hash
  -- rather than for a minimum size, and a different digest is a migration a reviewer reads.
  external_account_hash  bytea       not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint social_accounts_account_kind_known check (account_kind in ('fb', 'ig')),
  constraint social_accounts_display_name_not_blank check (length(btrim(display_name)) > 0),
  constraint social_accounts_external_hash_is_sha256 check (octet_length(external_account_hash) = 32),
  constraint social_accounts_scope_fk
    foreign key (workspace_id, meta_connection_id)
    references app.meta_connections (workspace_id, id),
  -- WORKSPACE-SCOPED, AND THE THIRD COLUMN IS NOT THE CONNECTION. Two connections in one Workspace
  -- that discover the same Page are the same destination twice, so the key is per WORKSPACE. It is
  -- not GLOBAL for batch 050's reason about its consumer ledger: a conflicting insert on a global
  -- key is an oracle telling one tenant that another tenant already holds that account, and §11.1/9
  -- forbids a retry reaching across scope. §4 invariant 2 says a Workspace may hold many Pages and
  -- says nothing about two Workspaces holding one, so the narrower key is also the one the document
  -- supports.
  constraint social_accounts_external_hash_unique unique (workspace_id, external_account_hash)
);

comment on table app.social_accounts is
  'Owner: A6 Meta Connector (connector.meta, batch 110). Canonical scope workspace_id (§3.3), tied '
  'to its connection by a composite foreign key so a discovered account cannot claim a Workspace its '
  'connection is not in (§4 invariant 10). Its `id` is §3.3''s canonical social_account_id. '
  'Sensitivity INTEGRATION-2. NO created_by/updated_by: §4''s ERD verb is "discovers", which is the '
  'service''s act rather than a user mutation, and §3.2 attaches the actor columns to a user '
  'mutation. THE PROVIDER''S IDENTIFIER IS STORED ONLY AS A HASH (§9.3, "stable hash for '
  'uniqueness"); the raw encrypted/private reference §9.3 also asks for is refused and owed to the '
  'typed service and to batch 120 (header). NO client role holds any privilege and NO policy is '
  'written, for the reasons the migration header gives about §8.3''s three rows.';
comment on column app.social_accounts.meta_connection_id is
  'INTEGRATION-2. The connection that discovered this account. Excluded from the UPDATE grant: §8.5 '
  'forbids moving a row across tenant OR scope with an update, and an account changing connection is '
  'exactly that.';
comment on column app.social_accounts.account_kind is
  'INTEGRATION-2. `fb` or `ig`, as text + a named CHECK (§3.2) whose values change by migration only. '
  '§4''s relation invariant 7 names exactly these two Meta surfaces and makes them SEPARATE publish '
  'targets, which is why the distinction is a column here rather than a fact a later batch derives.';
comment on column app.social_accounts.external_account_hash is
  'INTEGRATION-2, standing in for a value §9.1 tells this schema to redact. §9.3: "External account '
  'ID: raw encrypted/private reference + stable hash for uniqueness". This is the hash half, exactly '
  '32 octets of sha256, and it is what the uniqueness constraint is over. The raw identifier is NOT '
  'a column of this table: storing it plainly in the exposed schema is the one thing §9.1''s "redact '
  'external identifiers" forbids, and the encrypted or private form needs a mechanism no decision '
  'names. Owed to the typed service and to batch 120.';
comment on column app.social_accounts.display_name is
  'INTEGRATION-2. §9.1''s "account display" — the Page or account name a member would recognise, '
  'which is the only thing about this row a health projection could show without projecting an '
  'external identifier.';


-- ---------------------------------------------------------------------------------------------
-- private.meta_credential_references — a REFERENCE to the connection's token. Never the token.
-- ---------------------------------------------------------------------------------------------
--
-- THE SCHEMA IS THE DECISION AND THE HEADER ARGUES IT, following batch 060 statement for statement:
-- §3.1 puts "secret references" in `private` by name, with no direct grant, reachable by server or
-- worker through a typed service only; §14's gate checklist requires a secret table not be exposed;
-- `app` is the exposed schema. `scripts/db/run.mjs`'s schema lint already holds a table in `private`
-- to the same owner-comment, primary-key, ENABLE and FORCE rules as one in `app`, which batch 060
-- widened it to do.
--
-- THE COLUMN LIST IS §9.2's, EXHAUSTIVELY, AND THE APPLY-TIME BLOCK HOLDS IT THERE:
--
--   "Secret table เก็บได้เพียง `credential_reference`, provider, fingerprint/last-four-like
--    identifier, status, created/rotated/expired timestamps และ audit reference"
--
-- Every column below is one of those, one of §3.3's canonical scope fields, one of §3.2's
-- convention columns, or `revoked_at`, which §11.4 step 2 names in terms. Three of §9.2's
-- permissions are declined and the header says why: `provider` (one provider, so a CHECK of one),
-- `status` (its values are unwritten — 010's and 060's refusal), and `audit reference` (audit is
-- batch 140 and its consumers are 141; a uuid pointing at a table this batch may not reference is
-- the dangling column 020 refused).
create table if not exists private.meta_credential_references (
  id                    uuid        primary key default gen_random_uuid(),
  -- §3.3, "ทุก tenant-owned row", and the first half of the composite key below.
  workspace_id          uuid        not null,
  meta_connection_id    uuid        not null,
  -- §9.2's first permitted column, spelled the way §9.2 spells it. It is a LOCATOR in the vault or
  -- encrypted secret store §9.1 requires of a SECRET-4 value — never the value, never a ciphertext
  -- of the value, never a wrapped key.
  credential_reference  text        not null,
  fingerprint           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- §9.2's "created/rotated/expired timestamps". `rotated_at` is what "re-auth" writes and
  -- `expires_at` is what a Meta long-lived token has; both are set by nothing today, because no
  -- role holds UPDATE here — 060 recorded the same about its own.
  rotated_at            timestamptz,
  expires_at            timestamptz,
  revoked_at            timestamptz,
  created_by            uuid,
  updated_by            uuid,
  constraint meta_credential_references_reference_not_blank
    check (length(btrim(credential_reference)) > 0),
  -- The CEILING, and 060's reason unchanged: §9.2 calls this a "fingerprint/last-four-like
  -- identifier", and a whole access token does not fit in sixteen characters. It is the mirror of
  -- 010's 32-byte FLOOR on token_hash, which stopped a plaintext token fitting a digest column.
  constraint meta_credential_references_fingerprint_is_short
    check (fingerprint is null or (length(btrim(fingerprint)) between 1 and 16)),
  constraint meta_credential_references_expiry_after_creation
    check (expires_at is null or expires_at > created_at),
  -- A handle names one credential. Deliberately NOT unique per connection: no document says how
  -- many credentials a connection may hold, and a rotation window in which two exist is a state
  -- nothing here forbids (060's refusal, and 021's before it).
  constraint meta_credential_references_reference_unique unique (credential_reference),
  -- §3.3's composite FK, reaching from `private` into `app`. The direction is the safe one: the
  -- exposed row does not learn that a secret reference exists, which is the pointer 060 refused.
  constraint meta_credential_references_scope_fk
    foreign key (workspace_id, meta_connection_id)
    references app.meta_connections (workspace_id, id)
);

comment on table private.meta_credential_references is
  'Owner: A6 Meta Connector (connector.meta, batch 110). In `private` because §3.1 puts "secret '
  'references" there by name, with no direct grant, reachable by server or worker through a typed '
  'service only, and because §14''s gate checklist requires a secret table not be exposed. This is '
  'batch 060''s answer followed rather than re-derived; the two differences — no provider column and '
  'a composite foreign key to the connection — are declared in the migration header. Canonical scope '
  'workspace_id (§3.3). Sensitivity SECRET-4. IT HOLDS NO TOKEN: §9.2 fixes the permitted column '
  'list exhaustively and this migration''s apply-time block refuses any column outside it, so a '
  'later batch adding a plaintext or ciphertext column fails the MIGRATION rather than the code '
  'review. NO ROLE HOLDS ANY PRIVILEGE HERE — client or service — which is §8.3''s "Plain credential '
  'SELECT | N N N N N N" and RFC-2026-012''s "no direct grant". §8.3''s "Connect/disconnect/re-auth '
  'Meta" is NOT implemented: the owner''s Y is reached through the typed service §3.1 names and '
  'RFC-2026-012 §4 defines, and no command function exists.';
comment on column private.meta_credential_references.workspace_id is
  'SECRET-4 context. The Workspace whose credential this references, and the first column of the '
  'composite foreign key that stops the reference claiming a Workspace its connection is not in.';
comment on column private.meta_credential_references.credential_reference is
  'SECRET-4. A LOCATOR in the vault or encrypted secret store §9.1 requires — never the credential, '
  'never a ciphertext of it, never a wrapped key. §9.2 names this column and permits it; §9.2''s '
  'absolute prohibitions forbid the value it points at ever appearing in this database, a log, an '
  'event, a job payload or a fixture. No CHECK can tell a handle from a token — both are opaque '
  'strings and a rule recognising today''s formats is one a new provider defeats — so the control is '
  'that the token has no column to be in and no role can read this one.';
comment on column private.meta_credential_references.fingerprint is
  'SECRET-4, and the one column here with a shape control. §9.2 permits a "fingerprint/last-four-'
  'like identifier"; the CHECK caps it at sixteen characters so a whole access token does not fit.';
comment on column private.meta_credential_references.rotated_at is
  'SECRET-4. §9.2''s second timestamp, and what §8.3''s "re-auth" writes. Rotation is an UPDATE no '
  'role holds, so nothing can set it through a granted path today.';
comment on column private.meta_credential_references.expires_at is
  'SECRET-4. §9.2''s third timestamp. Spelled expires_at rather than expired_at for 010''s reason: '
  'it is a deadline, and the invitation table already spells the same idea that way.';
comment on column private.meta_credential_references.revoked_at is
  'SECRET-4. Not one of §9.2''s three, and named instead by §11.4 step 2 — "Revoke browser sessions, '
  'push tokens, invitations, API/connector credentials". There is no status column: §9.2 permits one '
  'and its values are unwritten, so the lifecycle is timestamps (010''s refusal, unchanged).';
comment on column private.meta_credential_references.created_by is
  'AUTH-3. The acting user, for a row §8.3 makes user-originated. Not FK-constrained: §11.2 requires '
  'the actor field be anonymized rather than cascade-deleted.';
comment on column private.meta_credential_references.updated_by is 'AUTH-3. See created_by.';


-- ---------------------------------------------------------------------------------------------
-- private.meta_webhook_inbox — the raw delivery, as a reference and a dedupe hash.
-- ---------------------------------------------------------------------------------------------
--
-- §3.1 puts "raw webhook" in `private` by name; §5 scopes it "private workspace"; §10's
-- WEBHOOK-SHORT says "no tenant access"; §11.1/5 keeps it out of a PDPA export; §14's gate
-- checklist requires it not be exposed. The migration header works all five through.
--
-- `bigint generated always as identity` for §3.2's "Append-only event/attempt/ledger ปริมาณสูง"
-- rule, which batch 050 applied to its outbox and its ledger. ALWAYS and not BY DEFAULT, and the
-- apply-time block asserts it from `pg_attribute.attidentity`: under BY DEFAULT a writer may choose
-- its own position in an ordered log, and this id is the processor's cursor.
create table if not exists private.meta_webhook_inbox (
  id                bigint generated always as identity primary key,
  -- NULLABLE, AND THE NULLABILITY IS THE POINT. §3.3 requires this column on a tenant-owned row and
  -- a raw delivery is not one when it arrives: RFC-2026-022 §3 classifies the statement that reads
  -- it as DISCOVERED — "the workspace is what reading it resolves" — and resolution can fail. NOT
  -- NULL here would mean an unknown, replayed or forged delivery could not be stored at all, which
  -- is the opposite of what a raw inbox is for. The apply-time block asserts it stays nullable.
  workspace_id      uuid        references app.workspaces (id),
  -- §10's "retain dedupe hash LONGER" than the payload, which is what makes it a separate column
  -- from the reference below rather than a property of it. One sha256, exactly, as on a social
  -- account.
  delivery_hash     bytea       not null,
  -- The raw body as a LOCATOR, never as content. §5's word ban forbids a `payload` column without a
  -- JSON Schema version, maximum size, prohibited fields and owner, and none exists for a Meta
  -- webhook; §9.1 puts a SECRET-4 value in a vault and never in a plaintext database column, and §5
  -- puts SECRET-4 on this very row because a provider body can carry a token; §9.2 forbids raw
  -- Authorization and Cookie headers outright. NULLABLE because §10 says "redact/purge payload"
  -- while the row survives — see redacted_at.
  --
  -- The grammar is batch 050's reference form restricted to one scheme. CTR-JOB-001's
  -- `x-reference-rule` records that the earlier deny-list form accepted `HTTPS://…`, `//host/x`,
  -- `file:///etc/passwd`, `javascript:` and `../../../etc/passwd`; a column holding a reference a
  -- worker will DEREFERENCE is that finding one layer down, on data a provider chose.
  body_ref          text,
  received_at       timestamptz not null default now(),
  -- §10's first window: "30 วันหลัง processed". Also the second verb's stamp, which nothing holds a
  -- grant to write — see the header.
  processed_at      timestamptz,
  -- §10's second window: "90 วัน failure/DLQ". A timestamp rather than a status value, which is
  -- 010's shape and the one CTR-JOB-001's freeze boundary made 050 use for a job. There is no
  -- `last_error_code` beside it: 050 carries one because CTR-JOB-001 names it, and no contract in
  -- this repository names an error vocabulary for a webhook.
  failed_at         timestamptz,
  -- §10's "redact/purge payload, retain dedupe hash longer". Without this column a null body_ref
  -- after redaction is indistinguishable from a delivery that never had a body, and a retention job
  -- cannot report what it purged from a column that forgot.
  redacted_at       timestamptz,
  updated_at        timestamptz not null default now(),
  constraint meta_webhook_inbox_delivery_hash_is_sha256 check (octet_length(delivery_hash) = 32),
  constraint meta_webhook_inbox_body_ref_form check (
    body_ref is null or (
      body_ref ~ '^webhook:[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$'
      and length(body_ref) <= 256)),
  -- A redacted row has no body, and a row with a body has not been redacted. The pair is a state
  -- §10 describes in words, written as the one CHECK that can hold it.
  constraint meta_webhook_inbox_redaction_is_consistent check (
    (redacted_at is null) or (body_ref is null)),
  -- THE DEDUPE KEY, AND IT IS GLOBAL RATHER THAN WORKSPACE-SCOPED. Batch 050 scoped its ledger's
  -- key by workspace and gave the reason: a conflicting insert on a global key is an oracle telling
  -- one tenant that another tenant's event exists. THAT REASONING DOES NOT REACH THIS ROW, and the
  -- difference is the whole of what "DISCOVERED" means here — at insert time this row HAS NO
  -- workspace, so a key including `workspace_id` would be a key over a null and would not be a key
  -- at all. What is being deduplicated is one delivery by one provider, which is the same delivery
  -- whichever tenant it turns out to belong to.
  constraint meta_webhook_inbox_delivery_hash_unique unique (delivery_hash)
);

comment on table private.meta_webhook_inbox is
  'Owner: A6 Meta Connector (connector.meta, batch 110). In `private` because §3.1 names "raw '
  'webhook" there, §14''s gate checklist requires it not be exposed, §10''s WEBHOOK-SHORT says "no '
  'tenant access" and §11.1/5 keeps it out of a PDPA export. §5 scopes it "private workspace" — the '
  'one row in the inventory spelled that way — and that is a zone plus a scope THE STATEMENT '
  'DISCOVERS: workspace_id is NULLABLE, because a delivery arrives before anything knows whose it '
  'is and resolution can fail. RFC-2026-022 §3 classifies "Raw token/webhook SELECT" as DISCOVERED '
  'and §5/5 gives a discovered cell NO POLICY, permanently, performed through a broker that does not '
  'exist; the classification is recorded as data in db/foundation/lint/service-policy-map.json. §5''s '
  'three verbs come out as: APPEND has no writer (no grant in `private`, §3.1''s typed service does '
  'not exist), PROCESS has no actor (the broker RFC-2026-022 §5/6 names is owed to the RFC that '
  'creates the worker), PURGE has no scheduler (batch 160 owns retention and §10''s numbers need '
  'approval, §15) — so the columns each sweep would read are here and no window is encoded. IT '
  'HOLDS NO BODY: body_ref is a locator, because §5''s word ban forbids an unschema''d payload '
  'column and §9.1 forbids a SECRET-4 value in a plaintext column, and §5 puts SECRET-4 on this row.';
comment on column private.meta_webhook_inbox.id is
  'The processor''s cursor, and §3.2''s "Append-only event/attempt/ledger ปริมาณสูง: bigint generated '
  'always as identity". ALWAYS rather than BY DEFAULT: under BY DEFAULT a writer could choose its '
  'own position in an ordered log (050''s reason for its outbox).';
comment on column private.meta_webhook_inbox.workspace_id is
  'PROVIDER-3. §3.3''s canonical tenant scope, AND NULLABLE, which is what §5''s "private workspace" '
  'commits this row to. It is an OUTPUT of processing rather than an input to it: a delivery is '
  'matched to app.social_accounts to learn whose it is, and an unknown, replayed or forged delivery '
  'resolves to nothing and must still be stored. A later batch making it NOT NULL would convert a '
  'DISCOVERED statement into a CARRIED one (RFC-2026-022 §3) and lose exactly the rows a security '
  'investigation wants; the apply-time block refuses that.';
comment on column private.meta_webhook_inbox.delivery_hash is
  'PROVIDER-3. §10''s "retain dedupe hash longer" — longer than the payload, which is why it is its '
  'own column and not a property of body_ref. Unique across the table rather than per workspace: at '
  'insert time this row has no workspace, so a key including it would be a key over a null. One '
  'sha256, exactly 32 octets, as on app.social_accounts.external_account_hash.';
comment on column private.meta_webhook_inbox.body_ref is
  'PROVIDER-3, standing in for a SECRET-4 hazard. A LOCATOR for the stored body and never the body: '
  '§5 forbids a payload column with no JSON Schema version, maximum size, prohibited fields or '
  'owner; §9.1 puts a SECRET-4 value in a vault and never in a plaintext database column, and a '
  'provider body can carry a signed request, an app secret proof or a token echoed back by a '
  're-auth event; §9.2 forbids raw Authorization and Cookie headers outright. Its grammar is batch '
  '050''s reference form restricted to the `webhook:` scheme, because a reference a worker '
  'dereferences is what CTR-JOB-001''s x-reference-rule found accepting file:// and javascript: '
  'under a deny-list. NULLABLE because §10 purges the payload and keeps the row.';
comment on column private.meta_webhook_inbox.processed_at is
  'PROVIDER-3. §10: "30 วันหลัง processed". The stamp the middle verb of "append/process/purge" '
  'would write, and nothing holds a grant to write it — RFC-2026-022 gives this statement to a '
  'broker that does not exist. The number is not encoded here: batch 160 owns the retention job and '
  '§10''s own Product/Security/Legal approval owns the numbers (§15).';
comment on column private.meta_webhook_inbox.failed_at is
  'PROVIDER-3. §10: "90 วัน failure/DLQ" — a second window, so a second column. A timestamp rather '
  'than a status value, which is 010''s refusal to invent a vocabulary and 050''s treatment of a '
  'job''s lifecycle.';
comment on column private.meta_webhook_inbox.redacted_at is
  'PROVIDER-3. §10: "redact/purge payload, retain dedupe hash longer". The row outlives its body, so '
  'it has to record that the body was taken — otherwise a null body_ref after redaction is '
  'indistinguishable from a delivery that never had one, and the retention job cannot report what it '
  'purged. Set by nothing today, for the reason processed_at is.';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- Already covered by a constraint's own index, and therefore NOT repeated below:
--
--   meta_connections (workspace_id, id)             — meta_connections_scope_key, which leads with
--                                                     workspace_id and so supports the foreign key
--                                                     into app.workspaces as well.
--   social_accounts (workspace_id, external_account_hash)
--                                                   — the natural key, which leads with
--                                                     workspace_id.
--   meta_webhook_inbox (delivery_hash)              — the dedupe key, and the lookup a receiver
--                                                     makes before it inserts.
--   every primary key.
--
-- NO RLS-PREDICATE INDEX IS OWED BY THIS BATCH, for batch 060's reason: not one table here carries
-- a policy, so no column is an RLS predicate. The day an allowlist entry or a broker adds one, the
-- index is part of that change (§6 invariant 8).

-- The composite foreign key from app.social_accounts, which leads with (workspace_id,
-- meta_connection_id) and is not covered by the natural key above.
create index if not exists social_accounts_scope_idx
  on app.social_accounts (workspace_id, meta_connection_id);

-- The composite foreign key from private.meta_credential_references, and the column §11.4 step 2's
-- revocation sweep will filter on when batch 160 writes it.
create index if not exists meta_credential_references_scope_idx
  on private.meta_credential_references (workspace_id, meta_connection_id);

-- The processor's cursor: everything not yet processed, oldest first. `processed_at is null` is the
-- column's own nullability rather than an invented state vocabulary, which is exactly what batch
-- 050 wrote for `outbox_events_undispatched_idx` and deliberately did NOT write for its claim
-- index, where the predicate would have been a definition of which jobs are still live.
create index if not exists meta_webhook_inbox_unprocessed_idx
  on private.meta_webhook_inbox (id)
  where processed_at is null;

-- §10's two retention windows, which are two columns and therefore two indexes: batch 160's sweep
-- reads "30 วันหลัง processed" off the first and "90 วัน failure/DLQ" off the second. This is 010's
-- treatment of expires_at for TOKEN-SHORT before the job that reads it existed.
create index if not exists meta_webhook_inbox_processed_window_idx
  on private.meta_webhook_inbox (processed_at);

create index if not exists meta_webhook_inbox_failed_window_idx
  on private.meta_webhook_inbox (failed_at);

-- The foreign key into app.workspaces, and the column §11.4 step 7's "purge tenant content … and
-- connector data" addresses a workspace's deliveries by. It is a partial index because the column is
-- nullable by design and an unresolved row is not a workspace's row.
create index if not exists meta_webhook_inbox_workspace_idx
  on private.meta_webhook_inbox (workspace_id)
  where workspace_id is not null;

-- §3.3 keyset pagination, "(created_at desc, id desc)", for the one list here that grows with the
-- tenant. A Workspace holds a small bounded number of connections, so that table gets none; the
-- inbox grows with provider traffic rather than with anything a member paginates, and its own
-- cursor index is above.
create index if not exists social_accounts_workspace_keyset_idx
  on app.social_accounts (workspace_id, created_at desc, id desc);


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every MUTABLE row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
--
-- All four, AND ALL FOUR ARE INERT TODAY — said rather than hidden, which is 021's, 050's and 060's
-- treatment of the same situation, and stated with the qualifier 060's first draft dropped: no role
-- holds UPDATE THROUGH A POLICY on any table in this batch, because this batch writes no policy at
-- all, so nothing can fire any of these triggers through a granted path. On the two `private` tables
-- it is stronger still — no role holds the grant either.
--
-- They are here because §3.2 requires updated_at of a MUTABLE row and all four rows are mutable by
-- design: §5 calls the first family "mutable + history" and the second "append/process/purge", and
-- a row whose middle verb is `process` is a row that changes. Omitting the column would be declaring
-- these rows IMMUTABLE, which §3.2 says of version, evidence, decision, usage, audit and publish
-- history and does not say of any of them.
drop trigger if exists set_updated_at on app.meta_connections;
create trigger set_updated_at before update on app.meta_connections
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.social_accounts;
create trigger set_updated_at before update on app.social_accounts
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on private.meta_credential_references;
create trigger set_updated_at before update on private.meta_credential_references
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on private.meta_webhook_inbox;
create trigger set_updated_at before update on private.meta_webhook_inbox
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on every table, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
--
-- On all four this is doing the whole job rather than part of it, because none of them carries a
-- policy: ENABLE plus FORCE is what makes every non-bypassing role — INCLUDING THE TABLE OWNER —
-- read zero rows and write nothing, and on the two `app` tables it is what the CI negative control
-- switches off to prove the suite notices.
--
-- On the two `private` tables it is defence in depth and is worth naming as such, in 060's words: no
-- role holds a privilege on either, so the privilege system refuses everything before RLS is
-- consulted, and these four statements are what still refuses on the day somebody grants USAGE on
-- `private` without reading this file.
alter table app.meta_connections enable row level security;
alter table app.meta_connections force row level security;

alter table app.social_accounts enable row level security;
alter table app.social_accounts force row level security;

alter table private.meta_credential_references enable row level security;
alter table private.meta_credential_references force row level security;

alter table private.meta_webhook_inbox enable row level security;
alter table private.meta_webhook_inbox force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges. Deny-by-default needs a grant before RLS is even reached.
-- ---------------------------------------------------------------------------------------------
--
-- §6 invariant 8 puts migration, constraints, indexes, RLS AND grants in one change set.
--
-- `authenticated` AND `anon` ARE GRANTED NOTHING, ANYWHERE IN THIS BATCH. The header argues it at
-- length: §8.3's client cells grant a HEALTH PROJECTION and a COMMAND, neither of which is a base
-- table, and RFC-2026-021 fixes what an allowlist entry is and who may add one. This batch therefore
-- adds no new row to RFC-2026-021 §8.5's closed list of inherited base-table grants.
--
-- `app_worker` HOLDS GRANTS ON THE TWO `app` TABLES AND NO POLICY, which is the shape batch 010
-- introduced and every batch since has kept, for the reason 010 gives: without a grant, a service
-- refusal is 42501 either way and proves only that somebody forgot a GRANT; with the grant and no
-- policy, an empty read can only have come from row level security, and a service role that had
-- quietly acquired BYPASSRLS would SUCCEED where the suite demands zero rows. On this batch that is
-- the ONLY thing row level security decides, and it is what the CI negative control for these two
-- tables rests on.
--
-- The verbs follow §8.3's service column — `P` on both connection rows — read conservatively, and
-- they are COLUMN-SCOPED where a column is withheld:
--
--   app.meta_connections  select, insert, update. `id` and `workspace_id` are absent from the
--                         UPDATE grant, so no connection can be re-identified or moved between
--                         tenants by an update (§8.5).
--   app.social_accounts   select, insert, and UPDATE ON `display_name` ALONE. Everything else about
--                         a discovered account is its identity: `meta_connection_id` would re-point
--                         it at another connection, `external_account_hash` would make it a
--                         different account, and `workspace_id` and `id` are §8.5's own two.
--
-- NO DELETE ANYWHERE, FOR ANY ROLE. §8.5 has no broad user delete, and hard deletion here is a
-- retention sweep: WEBHOOK-SHORT names a purge, §11.4 step 7 purges connector data, and batch 160
-- owns both through `app_maintenance`, which this batch grants nothing.
grant select (id, workspace_id, display_name, revoked_at, created_at, updated_at, created_by,
              updated_by)
  on app.meta_connections to app_worker;
grant insert (id, workspace_id, display_name, created_by, updated_by)
  on app.meta_connections to app_worker;
grant update (display_name, revoked_at, updated_by) on app.meta_connections to app_worker;

grant select (id, workspace_id, meta_connection_id, account_kind, display_name,
              external_account_hash, created_at, updated_at)
  on app.social_accounts to app_worker;
grant insert (id, workspace_id, meta_connection_id, account_kind, display_name,
              external_account_hash)
  on app.social_accounts to app_worker;
-- One column. The apply-time block asserts that every other column of this table is unwritable by
-- every role, against the live ACL rather than against this line.
grant update (display_name) on app.social_accounts to app_worker;

-- BOTH `private` TABLES ARE GRANTED TO NOBODY. Not `authenticated`, not `anon`, not `app_worker`,
-- not `app_command`, not `app_maintenance`, not `app_authz`. And no role is granted USAGE on schema
-- `private` either, which is the grant that would come first.
--
-- THAT IS A DELIBERATE DEPARTURE FROM THE app_worker SHAPE ABOVE, IT IS BATCH 060's, AND IT COSTS
-- SOMETHING THIS FILE PAYS RATHER THAN HIDES. Everywhere else in this schema the service holds a
-- grant precisely so a denial is attributable to RLS. Here it holds none, so every refusal on these
-- two tables is a privilege-layer refusal ON THE SCHEMA, for every identity alike — which is what
-- §3.1's "ไม่มี direct grant" asks for, what §8.3's "Plain credential SELECT | N N N N N N" asks for
-- in the service column, and what RFC-2026-012's inventory asks for in the words "server-only …
-- private, no direct grant".
--
-- The price is that the CI negative control cannot have an entry for either table: disabling row
-- level security on them restores no grant, so nothing would fail and the entry would report a pass
-- it did not earn — which the control step's own failure message calls out by name. That absence is
-- asserted in tests/db/identity/identity-isolation.test.mjs IN BOTH DIRECTIONS: no entry while no
-- role holds a grant, and an entry REQUIRED the moment any migration grants one.
--
-- AND IT IS WHY THE `S` CELL'S REFUSAL IS NOT OBSERVABLE HERE EITHER. `app_worker` cannot be
-- refused a read of the inbox by row level security, because it cannot reach the table to be
-- refused; the refusal is the schema's. That is stated rather than dressed up as an isolation
-- proof — a refusal that holds for everybody is not a tenant boundary, which is batch 030's finding
-- about a global row and batch 050's about a tenant one nobody can read.
--
-- app_command and app_maintenance are granted nothing by this batch, here or on the two `app`
-- tables. There is no specified command surface for connector.meta — which is the whole reason
-- §8.3's owner cells are unimplemented — and the retention path is batch 160.


-- ---------------------------------------------------------------------------------------------
-- Policies. There are none, and that is the decision rather than an omission.
-- ---------------------------------------------------------------------------------------------
--
-- §8.3 gives this family three rows and not one of them becomes a policy here:
--
--   * "Meta connection health SELECT" grants a PROJECTION whose object is a security_invoker view
--     on a read allowlist that is empty and grows only by RFC (RFC-2026-012 §3, RFC-2026-021 §7/3).
--   * "Connect/disconnect/re-auth Meta" is a COMMAND whose essential half is an OAuth exchange §3.4
--     forbids inside a transaction and a vault write no role can perform, owed to RFC-2026-012 §4's
--     command surface and to DATA-DEC-03.
--   * "Raw token/webhook SELECT" is the `S` cell, classified DISCOVERED by RFC-2026-022 §3 and
--     given NO POLICY PERMANENTLY by §5/5 — and the decision is NOT IN EFFECT besides, because the
--     only member of `app_worker` is `postgres`, which bypasses row level security.
--
-- All four tables are therefore FORCE ROW LEVEL SECURITY with an EMPTY POLICY SET, which denies
-- every non-bypassing role including the one role holding grants. Batch 030 established that a
-- forced table's empty policy set has to be a decision written in the file rather than an omission a
-- reader infers; this paragraph is that decision, and
-- tests/db/identity/identity-isolation.test.mjs holds it in both directions — no policy here today,
-- and a policy appearing without the §8 cell or the RFC that would justify it fails the build.


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
-- NOTHING BELOW ASSERTS A PROPERTY AN APPROVED DECISION IS EXPECTED TO CHANGE, which is 030's rule
-- and 021's scar: 011's apply-time policy count is an APPLIED migration's self-assertion that 021
-- had to route around rather than amend. So the absence of a client grant, the absence of a policy
-- and the absence of any grant on the two `private` tables are asserted in the STATIC suite, where
-- the batch that lands an allowlist entry, a command surface or RFC-2026-022 §7's broker edits a
-- line a reviewer reads.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only by
-- a superuser, and a migration that needs one to apply is a migration that cannot be applied on the
-- platform it targets, where `postgres` is not a superuser.
do $$
declare
  offending text;
  count_of  integer;
begin
  -- ENABLE and FORCE on all four. The two are different catalog columns and the data package's own
  -- lint rule reads only the first (RFC-2026-016). On a table with no policy, FORCE is the whole of
  -- what refuses the owner.
  select string_agg(format('%s.%s', n.nspname, c.relname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('meta_connections', 'social_accounts'))
          or (n.nspname = 'private' and c.relname in ('meta_credential_references', 'meta_webhook_inbox')))
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'Batch 110 writes no policy at all, so FORCE is the only thing that refuses the '
                   'table owner. Without it the isolation suite cannot tell a working schema from '
                   'one where every row is readable by whoever owns the table.';
  end if;

  -- THE ASSERTION THIS BATCH OWES MOST, AND IT IS BATCH 060's. §9.2 is an ABSOLUTE PROHIBITION and
  -- it fixes the permitted column list of a secret table exhaustively. Everything else in this file
  -- argues that a token cannot be READ; this is what stops one being STORED.
  --
  -- The permitted set, with the clause that permits each:
  --   credential_reference, fingerprint, rotated_at, expires_at   §9.2, by name
  --   revoked_at                                                  §11.4 step 2
  --   workspace_id, meta_connection_id                            §3.3, tenant-owned row + scope
  --   id, created_at, updated_at, created_by, updated_by          §3.2 / §12.3 conventions
  --
  -- Written as an ALLOWLIST rather than as a list of forbidden names, for 060's reason: a denylist
  -- of column names somebody thought of is defeated by the one they did not.
  select string_agg(a.attname, ', ' order by a.attnum) into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'private' and c.relname = 'meta_credential_references'
     and a.attnum > 0 and not a.attisdropped
     -- The cast is written out rather than left to operator resolution, for the reason 060 records:
     -- a comparison that depends on an implicit cast changes meaning when somebody adds an operator,
     -- and a NEVER rule that silently starts matching nothing is the failure this block exists to
     -- avoid.
     and a.attname::text <> all (array['id', 'workspace_id', 'meta_connection_id',
                                       'credential_reference', 'fingerprint', 'created_at',
                                       'updated_at', 'rotated_at', 'expires_at', 'revoked_at',
                                       'created_by', 'updated_by']);
  if offending is not null then
    raise exception 'private.meta_credential_references carries column(s) §9.2 does not permit: %', offending
      using hint = '§9.2: "Secret table เก็บได้เพียง credential_reference, provider, fingerprint/'
                   'last-four-like identifier, status, created/rotated/expired timestamps และ audit '
                   'reference". A column outside that list plus §3.2/§3.3''s conventions is either a '
                   'token, a ciphertext of one, or a field nobody classified. All three are '
                   'stop-the-line under CONTRIBUTING_AGENTS.md.';
  end if;

  -- And the column that must be there, because an allowlist alone is satisfied by a table with no
  -- columns at all. §9.2 permits a reference; the whole design is that the database holds the
  -- reference INSTEAD of the token, so its absence would not be a narrower schema.
  select count(*) into count_of
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'private' and c.relname = 'meta_credential_references'
     and a.attnum > 0 and not a.attisdropped
     and a.attname = 'credential_reference';
  if count_of <> 1 then
    raise exception 'private.meta_credential_references has no credential_reference column';
  end if;

  -- THE SAME RULE FOR THE INBOX, AND FOR A DIFFERENT CLAUSE OF THE SAME SECTION. §9.2's permitted
  -- column list is about a SECRET table and this row is PROVIDER-3 carrying a SECRET-4 hazard, so
  -- the allowlist here is derived from §10's WEBHOOK-SHORT sentence and §3.2's conventions rather
  -- than from §9.2's list — and it is asserted the same way, because the failure it prevents is the
  -- same one: a later batch adding `payload`, `body`, `signature`, `headers` or `access_token` to
  -- the table §14's gate checklist is about.
  select string_agg(a.attname, ', ' order by a.attnum) into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'private' and c.relname = 'meta_webhook_inbox'
     and a.attnum > 0 and not a.attisdropped
     and a.attname::text <> all (array['id', 'workspace_id', 'delivery_hash', 'body_ref',
                                       'received_at', 'processed_at', 'failed_at', 'redacted_at',
                                       'updated_at']);
  if offending is not null then
    raise exception 'private.meta_webhook_inbox carries column(s) batch 110 does not permit: %', offending
      using hint = '§5 puts SECRET-4 on the raw webhook row because a provider body can carry a '
                   'token, §9.1 forbids a SECRET-4 value in a plaintext database column, §9.2 '
                   'forbids raw Authorization and Cookie headers, and §5''s word ban forbids a '
                   'payload column with no JSON Schema version, maximum size, prohibited fields or '
                   'owner. The row holds a LOCATOR and a dedupe hash; a column outside that list is '
                   'the body arriving by another name.';
  end if;

  -- THE INBOX'S SCOPE COLUMN IS NULLABLE, AND IT MUST STAY THAT WAY. This is what §5's "private
  -- workspace" commits the row to and what RFC-2026-022 §3's DISCOVERED class means in a schema: a
  -- delivery arrives before anything knows whose it is, and resolution can fail. A later batch
  -- adding NOT NULL would make an unknown, replayed or forged delivery unstorable — deleting
  -- exactly the rows a security investigation wants — and would quietly reclassify the statement
  -- that reads it as CARRIED.
  select string_agg(a.attname, ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'private' and c.relname = 'meta_webhook_inbox'
     and a.attname = 'workspace_id' and a.attnotnull;
  if offending is not null then
    raise exception 'private.meta_webhook_inbox.workspace_id is NOT NULL, and a discovered scope cannot be'
      using hint = '§5 scopes this row "private workspace" and RFC-2026-022 §3 classifies the '
                   'statement that reads it as DISCOVERED — the workspace is what reading it '
                   'resolves. A delivery whose account matches nothing must still be stored.';
  end if;

  -- §3.2: "Append-only event/attempt/ledger ปริมาณสูง: bigint generated always as identity".
  -- ALWAYS and not BY DEFAULT — `attidentity` is 'a' for the first and 'd' for the second — because
  -- under BY DEFAULT a writer may supply its own position in an ordered log, and this id is the
  -- processor's cursor. Batch 050's assertion, one family over.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attname = 'id'
   where n.nspname = 'private'
     and c.relname = 'meta_webhook_inbox'
     and (a.attidentity <> 'a' or pg_catalog.format_type(a.atttypid, a.atttypmod) <> 'bigint');
  if offending is not null then
    raise exception 'the webhook inbox does not key on a bigint GENERATED ALWAYS AS IDENTITY: %', offending;
  end if;

  -- THE TWO NATURAL KEYS, READ FROM THE CATALOG AS COLUMN SETS RATHER THAN AS CONSTRAINT NAMES, and
  -- the pair is the point: one is workspace-scoped and one is not, for reasons that are opposite and
  -- both stated in the file.
  --
  -- app.social_accounts is unique on (workspace_id, external_account_hash) — batch 050's reasoning
  -- about a conflicting insert being a cross-tenant oracle. private.meta_webhook_inbox is unique on
  -- (delivery_hash) ALONE, because at insert time that row has no workspace and a key over a null
  -- is not a key.
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
       where con.contype = 'u'
         and ((n.nspname = 'app' and c.relname = 'social_accounts')
              or (n.nspname = 'private' and c.relname = 'meta_webhook_inbox'))
    ) as keys
   where not (
     (target = 'social_accounts' and cols = 'external_account_hash,workspace_id')
     or (target = 'meta_webhook_inbox' and cols = 'delivery_hash')
   );
  if offending is not null then
    raise exception 'a natural key in batch 110 is not the one the batch declares: %', offending
      using hint = 'app.social_accounts must be unique on (workspace_id, external_account_hash) so a '
                   'conflicting insert cannot report that another tenant holds the same account, and '
                   'private.meta_webhook_inbox on (delivery_hash) alone because that row has no '
                   'workspace when it arrives.';
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE FOUR. §8.5 has no broad user delete; every purge in this
  -- family is a retention sweep (WEBHOOK-SHORT, §11.4 step 7) and batch 160 owns it.
  select string_agg(format('%s.%s to %s', schema_name, target, grantee), ', ') into offending
    from (
      select n.nspname as schema_name, c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where ((n.nspname = 'app' and c.relname in ('meta_connections', 'social_accounts'))
              or (n.nspname = 'private' and c.relname in ('meta_credential_references', 'meta_webhook_inbox')))
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a row batch 110 creates can be deleted through a granted path: %', offending
      using hint = '§8.5 requires a soft delete through a typed lifecycle field where a delete is '
                   'wanted at all, and hard deletion here is a retention sweep with its own class '
                   'and its own batch.';
  end if;

  -- §8.5, PER COLUMN, AGAINST THE LIVE ACL: no row in this batch may be re-identified or moved
  -- between tenants or between scopes by an update. app_worker is IN the checked list — 050's
  -- sentence, and it is true here for the same reason — because every grant this batch makes to it
  -- is column-scoped.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id']) as col
       where n.nspname = 'app'
         and c.relname in ('meta_connections', 'social_accounts')
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity or tenant column of a batch 110 table is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant with an update.';
  end if;

  -- And the columns that ARE this batch's own scope and identity below the tenant. A discovered
  -- account that could be re-pointed at another connection, or whose external hash could be
  -- rewritten, is a different account wearing the same id — and `external_account_hash` is the one
  -- column in this batch standing in for a value §9.1 tells the schema to redact.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['meta_connection_id', 'external_account_hash']) as col
       where n.nspname = 'app'
         and c.relname = 'social_accounts'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a scope or identity column of app.social_accounts is updatable: %', offending
      using hint = '§8.5 forbids moving a row across SCOPE with an update, and an account changing '
                   'connection is exactly that. The external account hash is the account''s '
                   'identity; a role that could rewrite it could re-aim a publish target.';
  end if;

  -- `anon` holds nothing on anything this batch creates. RFC-2026-021 §7/4 decided that as a
  -- NEGATIVE — "a negative is the strongest thing a lint can hold" (RFC-2026-019 §5) — and it is the
  -- one client-role property no approved decision is expected to move: the RFC says reversing it
  -- needs an RFC that states what the anonymous surface is for.
  select string_agg(format('%s.%s', n.nspname, c.relname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('meta_connections', 'social_accounts'))
          or (n.nspname = 'private' and c.relname in ('meta_credential_references', 'meta_webhook_inbox')))
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on %, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- No policy on a table this batch owns may name an anonymous role. §8.5 gives anonymous no tenant
  -- policy and RFC-2026-021 §7/4 gives it nothing at all. `app_worker` is deliberately NOT in this
  -- list: RFC-2026-022 §5 keeps a CARRIED service policy possible elsewhere and an apply-time
  -- assertion against an approved decision's own direction is the trap 011 set for 021 — even though
  -- for THIS batch's cell the answer is no policy permanently, which is a static assertion because
  -- it is a claim about a decision rather than about a catalog.
  select string_agg(format('%s on %s.%s', pol.polname, n.nspname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('meta_connections', 'social_accounts'))
          or (n.nspname = 'private' and c.relname in ('meta_credential_references', 'meta_webhook_inbox')))
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles) and r.rolname = 'anon');
  if offending is not null then
    raise exception 'batch 110 left a policy for the anonymous role: %', offending;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 110 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  select string_agg(format('%s.%s', n.nspname, c.relname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('meta_connections', 'social_accounts'))
          or (n.nspname = 'private' and c.relname in ('meta_credential_references', 'meta_webhook_inbox')))
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on %, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020, 021, 030, 040,
  -- 050, 060, 130 and 140 ask them: scripts/db/run.mjs holds every tenant table to the ownership
  -- rule against the COMMITTED SNAPSHOT, and this batch is deliberately not applied to the instance
  -- that snapshot describes.
  select string_agg(format('%s.%s owned by %s', n.nspname, c.relname,
                           pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('meta_connections', 'social_accounts'))
          or (n.nspname = 'private' and c.relname in ('meta_credential_references', 'meta_webhook_inbox')))
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 110 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all. On a table with an '
                   'empty policy set that exemption is the difference between reading nothing and '
                   'reading everything.';
  end if;
end $$;
