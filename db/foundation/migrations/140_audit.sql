-- Batch 140 — audit: the tenant audit log and the security event, and what "immutable" costs.
--
-- Owner: A1 Security/Audit. The migration ownership registry (§6) reserves 140 to this package and
-- describes it as "audit/security event core", depending on 011.
--
-- Depends on: 000 (schemas, private helpers), 001 (app_worker), 011 (transitively — the registry
-- names it, and nothing below calls a helper it created, which is stated in full further down).
-- Every batch this one names is merged; migration invariant 1 forbids rewriting any of them and
-- NOTHING BELOW DOES — every statement here creates a new object, and no `drop policy`, `drop
-- trigger` or `alter table` in this file names an object another batch created. A test asserts that
-- pairing rather than trusting this sentence.
--
--
-- THIS BATCH IS DIFFERENT FROM EVERY BATCH BEFORE IT, AND THE DIFFERENCE IS THE WHOLE JOB
--
-- An audit record's value is that IT CANNOT BE ALTERED OR DELETED BY THE PARTY IT IS ABOUT. Batch
-- 020 met immutability first and expressed it as absent grants and absent policies; 030 and 040
-- copied that shape. It is the right shape and it is NOT the whole of what is needed here, because
-- on this table the actor whose action is recorded is frequently the same identity that would want
-- the record gone — and because the strongest adversary of an audit log is not a member of any
-- workspace at all.
--
-- So this batch says plainly, in one place, WHAT IT GUARANTEES AND AGAINST WHOM. Everything below
-- is an elaboration of these four paragraphs.
--
--   1. AGAINST THE SUBJECT OF THE RECORD, ACTING AS `authenticated`: GUARANTEED, at the privilege
--      layer. No client role holds INSERT, UPDATE, DELETE or TRUNCATE on either table, and none
--      holds SELECT either (see the read section below). A member cannot write a record about
--      themselves, cannot edit one somebody else wrote about them, and cannot remove one. The
--      refusal is 42501 from the privilege system BEFORE row level security is consulted, which is
--      a stronger refusal than a policy: a policy can be widened by an edit, an absent grant has to
--      be granted. Thirteen isolation cases assert it, each naming the layer AND the object.
--
--   2. AGAINST THE SERVICE ROLE `app_worker`: GUARANTEED for UPDATE, DELETE and TRUNCATE (no
--      grant, no policy), and the INSERT it is supposed to have is DENIED TODAY — see "the one `S`
--      cell in this repository" below. It holds SELECT and INSERT and no policy, so every service
--      operation is refused by row level security and the refusal is attributable to RLS rather
--      than to a forgotten GRANT.
--
--   3. AGAINST A ROLE THAT BYPASSES ROW LEVEL SECURITY — `postgres`, `service_role`,
--      `supabase_admin`, `supabase_etl_admin`, `supabase_read_only_user`, measured and pinned in
--      `scripts/db/run.mjs`'s KNOWN_BYPASS — **NOT GUARANTEED BY ROW LEVEL SECURITY, AT ALL, AND
--      FORCE ROW LEVEL SECURITY BUYS NOTHING HERE.** `postgres` OWNS every table in `app`
--      (RFC-2026-021 §2/M2: `app_table_owners = postgres`, `rolbypassrls(postgres) = true`) and
--      `BYPASSRLS` beats `FORCE`: forcing makes the OWNER subject to policies, and a bypassing role
--      is outside the row-security system entirely whether or not it is the owner. The owner can
--      also `alter table ... disable row level security`, `drop policy`, `grant`, `delete`,
--      `truncate` and `drop table`. **No statement a migration can write makes a row immutable
--      against the role that owns it.**
--
--      WHAT FORCE IS STILL FOR, since it is written below and a reader is owed the reason: it is
--      the only thing refusing every NON-bypassing role on a table that carries no policy at all,
--      it is what will apply to a future owner the role topology gives us that does not bypass, and
--      RFC-2026-016 §4 makes it unconditional rather than conditional precisely so that "where
--      compatible" cannot be argued table by table. It is necessary and it is not sufficient, and
--      saying only the first half would be the claim this file exists to avoid.
--
--   4. AGAINST THE OWNER, PARTIALLY, BY A TRIGGER — which is new, is §8.5's own suggestion, and is
--      the only mechanism in this schema that constrains `postgres`. §8.5's rule for an
--      immutable/append-only table is "ไม่มี user update/delete policy และมี command/trigger/
--      privilege defense ตามความเหมาะสม" — no user update/delete policy AND a command, trigger or
--      privilege defense as appropriate. Batches 020, 030 and 040 took the privilege half; this is
--      the first table in the schema where the trigger half is appropriate, because it is the first
--      table whose adversary can hold the privilege.
--
--      `private.refuse_mutation()` raises on UPDATE, on DELETE and on TRUNCATE, for every role
--      including the table owner, because a trigger is not part of the row-security system and
--      `BYPASSRLS` does not touch it. The apply-time block at the foot of this file PROVES that by
--      execution rather than citing it: it inserts a probe row as the migration role — which is
--      `postgres`, which bypasses RLS and owns the table — attempts all three, requires all three
--      to raise, and rolls the whole probe back.
--
--      AND ITS LIMIT, STATED RATHER THAN LEFT TO BE FOUND: the owner can `alter table
--      app.audit_logs disable trigger all` and then delete whatever it likes. This is tamper
--      RESISTANCE and not tamper EVIDENCE. It raises the cost of destroying an audit record from
--      one statement to two, and it makes the first of those two an act nobody performs by
--      accident — a careless `delete from app.audit_logs where ...` in a maintenance session is
--      refused, which is the realistic failure this defends against. A DETERMINED owner is not
--      stopped, and nothing in a database can stop one. Tamper evidence against that adversary is a
--      hash chain, an append-only store outside this database, or WORM storage; `CTR-AUD-001`'s
--      freeze boundary lists "the audit STORE, its append-only or immutability mechanism, and any
--      tamper evidence" as OPEN, and its `untestable_by_schema` note says in terms that "there is no
--      hash chain or signature field because no source specifies one". This batch does not invent
--      one. It records exactly where its claim stops.
--
--
-- WHICH DOCUMENT NAMES THE COLUMNS, WHICH IS THE ONE THING HERE NO EARLIER BATCH COULD DO
--
-- Every batch from 020 to 040 recorded that §5 classifies its family and NAMES NO COLUMN OF IT, and
-- each therefore invented nothing: a name, a scope path, a lifecycle field and the audit columns
-- §3.2 requires. This batch does not have to, and the reason is the conflict order rather than a
-- change of taste.
--
-- `contract-catalog/shared-kernel/ctr-aud-001/` is **CTR-AUD-001 — Audit Event**, and it fixes the
-- record's fields by name, with a source citation on each: `audit_id`, `occurred_at`, `actor`
-- (kind + id), `action` (a six-value category and a dotted name), `tenant_context` (which is
-- `CTR-TEN-001`), `correlation_id`, `causation_id`, `outcome`, `reason_key`, `change`
-- (before/after REFERENCES, never values), `error` (which is `CTR-ERR-001`), `redaction` (three
-- flags, each `const: true`), `retention.policy_ref`, and `details` — a bag it DECLARES AND HOLDS
-- EMPTY at `maxProperties: 0`.
--
-- `CONTRIBUTING_AGENTS.md`'s conflict order puts the **Contract Catalog at position 2** and the
-- Core Database/RLS document at position 4. So where §5's silence and CTR-AUD-001's field list
-- disagree about whether this batch may name a column, the contract wins, and the columns below are
-- read from it rather than invented. Its status is `Draft`; that is recorded in the work package's
-- open blockers and in the handoff, and it is why the table carries the contract's STABLE fields and
-- none of its open ones.
--
-- FOUR DIVERGENCES FROM THE CONTRACT, EACH DELIBERATE:
--
--   * NO `details` COLUMN AT ALL. The contract declares the bag and holds it empty; §5 forbids a
--     column called "metadata", "config", "payload" or "JSON" without a declared JSON Schema
--     version, maximum size, prohibited fields and owner. A column that may hold nothing is not a
--     column, and a free-form bag is precisely how a secret or a page of user content reaches an
--     audit log (OB-005, quoted by the contract). Widening it needs the owner-approved payload
--     contract the contract itself demands.
--   * NO `locale` AND NO `timezone`, though `CTR-TEN-001` requires both. Both are `const` in that
--     schema — `th-TH` and `Asia/Bangkok` — so a column for either would store one value forever,
--     and §3.2 fixes both globally. A constant is not a field.
--   * `error` IS ONE COLUMN AND NOT SIX. `CTR-ERR-001` carries `code`, `message_key`, `category`,
--     `retryable`, `correlation_id` and `details`. `error_code` is what makes the record say WHY in
--     the stable vocabulary OB-002 requires; the rest describe the RESPONSE THE CALLER RECEIVED
--     rather than the audit record, `correlation_id` is already a column here, and `details` is a
--     bag that contract also holds empty. Copying all six would be a second home for a value
--     `CTR-ERR-001` owns — the shape 021 refused for `current_version_id`, 030 for
--     `industry_pack_id` and 040 for `kind`. Widening it belongs to 141, with the producer that
--     would fill it.
--   * `tenant_context` IS FLATTENED INTO COLUMNS rather than stored as a document, because §3.3
--     fixes the canonical scope field NAMES and a document column would put `workspace_id` inside a
--     blob no constraint can reach.
--
-- WHAT THE CONTRACT CANNOT EXPRESS AND A CHECK CONSTRAINT CAN. Its own `untestable_by_schema` note
-- lists CROSS-FIELD CONSISTENCY as a rule "this validator cannot compare one property's value with
-- another's". Two of its `allOf` rules are exactly that shape and are written below as named CHECK
-- constraints, so the STORE refuses a record the schema would only have failed at the edge:
-- `audit_logs_delete_names_what_it_deleted` (allOf[0]: a delete must carry a before-reference) and
-- `audit_logs_outcome_matches_error` (allOf[1] and allOf[2] together: failed or denied carries an
-- error, succeeded carries none). The third — that `action.name` belongs to `action.category` — is
-- NOT written, because no source states the mapping and inventing one would be inventing the audit
-- taxonomy.
--
--
-- WHY NEITHER TABLE CARRIES A FOREIGN KEY, WHICH IS THE DECISION A REVIEWER SHOULD ARGUE WITH FIRST
--
-- Every tenant table in this schema references its parent, and §3.3 asks for it in terms. These two
-- reference nothing — not `app.workspaces`, not `app.business_profiles`, not
-- `app.page_context_profiles` — and the reason is §11.4's REQUIRED ORDER, read as a whole:
--
--   step 7:  "Purge tenant content, research, assets/object versions and connector data"
--   step 8:  "Anonymize/RETAIN finance, AUDIT, SECURITY minimum required records"
--
-- An audit record is required to OUTLIVE the rows it is about. A foreign key makes that impossible
-- in both directions at once: either the audit row blocks the purge in step 7, or step 7 deletes
-- the audit row — and this table refuses deletion, so the second is not available and the first
-- would stop a PDPA deletion request on a record the same document orders retained. §11.2 says the
-- same thing one column over — "Content/approval/audit history ห้าม cascade delete" — and every
-- batch since 010 has applied that sentence to `created_by`. This batch applies it to the SCOPE
-- columns, which is new, and which is the only way step 8 can happen after step 7.
--
-- THE COST, stated rather than absorbed: **§4 invariant 10 is not enforced for these two tables.**
-- An audit row naming a Business that belongs to a different Workspace is not refused by this
-- schema and cannot be, for the reason above. What refuses it is the producer: `CTR-AUD-001`
-- embeds `CTR-TEN-001`, whose trust boundary reads "Server-resolved only after membership and
-- Workspace→Business→Page relation validation; client-supplied context is untrusted input". So the
-- invariant moves from the database to the contract, the contract says so in its own words, and
-- batch 141 — "audit consumers/hooks", A0, depending on all domain batches — is where a producer
-- that could violate it will exist. Recorded here, in the handoff, and in the work package's open
-- blockers. It is also why this batch writes no `rejected` isolation case: there is no constraint
-- for one to be about.
--
--
-- WHO MAY READ, AND THE ANSWER IS NOBODY — THE SAME REFUSAL BATCH 030 MADE, ON A STRONGER ROW
--
-- §8.4's audit block, quoted rather than summarised:
--
--   | Tenant audit SELECT       | Y | P | O | approval trail | N | P |
--   | Security event details    | P | N | N | N              | N | S |
--   | Audit/security INSERT     | N | N | N | N              | N | S |
--   | Audit/security UPDATE/DELETE | N | N | N | N           | N | N |
--
-- **NO CLIENT ROLE IS GRANTED ANYTHING ON EITHER TABLE BY THIS BATCH, AND NO POLICY IS WRITTEN FOR
-- ONE.** That is a refusal with five reasons, in order of weight:
--
--   1. `RFC-2026-012` (approved 2026-09-02) decision 2: "Direct client reads only through named
--      `security_invoker` views, never a base table — including where a base table would be safe
--      today." Its inventory classifies these two families more restrictively than any other row in
--      it: "audit logs | SAFE VIEW ONLY | service-only; no UPDATE or DELETE by anyone" and
--      "security events | SERVER-ONLY, owner `P` only | service-only". Business, knowledge and the
--      industry catalog are all merely "permitted"; these two carry a redaction qualifier and a
--      tier.
--   2. `RFC-2026-021` (approved 2026-09-06) §7/3 keeps the read allowlist EMPTY, and §4's C1 — "a
--      named caller exists, and it is a client" — fails here exactly as it failed for the industry
--      catalog: there is no `src/`, no client module, and no document naming a screen that reads an
--      audit trail. §3 of that RFC prices the entry a client read would need: five objects and a
--      registry row, authored by the family owner in a NEW batch, countersigned by A1 Security,
--      approved by RFC. This batch is not that RFC and may not be it.
--   3. `RFC-2026-021` §8.5: the known-exceptions list naming 010, 020 and 021's inherited
--      base-table grants "is CLOSED: it enumerates exactly the grants that exist today, and any new
--      one fails". 030 refused to grow it; 040 grew it and called the growth a debt. A security and
--      audit batch adding the sixth entry, ON THE AUDIT LOG ITSELF, would be the worst place in the
--      schema to spend that debt.
--   4. §9.1's projection rules for these two classes are `AUTH-3` "minimum role projection" and
--      `SECURITY-4` "security/admin SAFE VIEW only". Both name a PROJECTION. A base-table grant
--      does not project: it hands every granted column of every admitted row to every admitted
--      role, so the owner's `Y` and the editor's `O` would see identical columns, and the "safe"
--      in "safe view only" would be carried by nothing.
--   5. Two of the five client cells cannot be implemented at all, whatever the object. The admin's
--      `P` needs the capability set no document in this repository defines — the refusal 011, 020,
--      021 and 030 each recorded and RFC-2026-020 §8 ratified. The approver's cell is literally
--      "approval trail", a subset scoped by the approval tables, which are batch `090` and do not
--      exist; there is no trail to scope to.
--
-- THE TWO CELLS THAT WOULD HAVE BEEN IMPLEMENTABLE ARE NAMED, so this is a refusal and not an
-- oversight. The owner's `Y` on Tenant audit SELECT is `app.workspace_member_role(workspace_id) =
-- 'owner'` and nothing more. The editor's `O` is "the rows this person is the actor of" —
-- `actor_kind = 'user' and actor_id = (select auth.uid())::text` — and it is the one cell in the
-- whole matrix where the reader IS the subject of the record. Both are owed to the RFC that opens
-- the allowlist, in the batch that lands it, with the safe view §9.1 asks for. Five isolation cases
-- assert the present refusal, one per client cell, so the day somebody implements them a test fails
-- rather than a claim quietly becoming true.
--
-- AND §11.1's "Tenant-visible audit trail" IS NOT BROKEN BY THIS. Export is a background job (§11.1
-- opens "Export เป็น background job"), run by the retention/export path batch `160` owns, not by a
-- client read. A member never needed a SELECT grant here to receive their export.
--
--
-- THE ONE `S` CELL IN THIS REPOSITORY, AND WHY IT IS STILL DENIED
--
-- Batch 010's header, written before any of this existed, said it: "The `S` operations the
-- amendment exists for live in §8.2–§8.4 — research rows, publish delivery, job payloads, usage
-- ledger, AUDIT INSERTS — and belong to batches 050, 061, 070, 120, **140**. Their owners inherit
-- the shape; batch 010 has no occasion to use it." This is that batch, and "Audit/security INSERT |
-- N N N N N S" is the first `S` cell any migration in this repository has reached.
--
-- **The service INSERT policy is NOT written, and the reason is a condition inside the approved
-- decision rather than a reluctance to obey it.** `RFC-2026-016` §2 amends §8.5 to
--
--   "a policy is `TO authenticated` for user paths **and `TO <service role>` for each operation the
--    matrix already marks `S`, with the service policy SCOPED BY A SERVER-SET WORKSPACE GUC derived
--    from the server-resolved tenant context `CTR-TEN-001` already requires**."
--
-- That GUC does not exist. It has no name, no setter and no contract: `CTR-TEN-001` defines the
-- CONTEXT as a JSON object and says nothing about its transport into a Postgres session;
-- `db/foundation/test-helpers/auth-context.sql`'s `private.as_service()` sets a role and a claim set
-- with no workspace in it; and `RFC-2026-016` §4 says in terms that "the service path is undecided"
-- and leaves `DATA-DEC-03` open until G1. There are exactly two ways to write the policy today and
-- both are refused:
--
--   * NAME THE GUC HERE. That is inventing the service tenant-context transport — the decision
--     `DATA-DEC-03` is open on — in the batch that happens to want it, and it would require editing
--     `private.as_service()`, which would change what every existing service isolation case means.
--   * WRITE `with check (true)`. That is a service policy with no scope at all, which is not the
--     policy §2 sanctions; the amendment's own sentence is that it "introduces no new permission",
--     and an unscoped one would.
--
-- So `app_worker` holds SELECT and INSERT on both tables and NO POLICY, which is 010's shape and
-- 010's reason, and the consequence is stated rather than hidden: **NOTHING CAN WRITE AN AUDIT ROW
-- TODAY.** §11.4 step 1 — "Mark Workspace `closing`; write audit event" — has a store and no writer.
-- The store is this batch; the writer is batch `141` ("audit consumers/hooks", A0, depending on all
-- domain batches); and the policy that would let it write is owed to `DATA-DEC-03` and to whoever
-- names that GUC. **The finding generalises beyond this batch and is recorded as such: until that
-- GUC exists, NO `S` cell anywhere in §8.2–§8.4 can be implemented by any batch — 050, 061, 070 and
-- 120 all inherit it.** That is the most useful thing this batch found and it belongs in the
-- program's open blockers rather than in a comment nobody reads.
--
--
-- WHAT IS NOT HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO FIND
--
--   * NO SECURITY EVENT TABLE IN `private`, THOUGH §5 SCOPES THE FAMILY "workspace/private".
--     030 read a two-valued scope cell ("global/business") as two groups and this file reads
--     "workspace/private" the same way: audit logs are workspace-scoped, security events are the
--     `private` half. It cannot be honoured, and the obstacle is measurable rather than aesthetic.
--     §3.1 gives `private` "ไม่มี direct grant" and reaches it "Server/worker ผ่าน typed service
--     เท่านั้น" — through a typed SECURITY DEFINER service, of which this repository has none
--     (`RFC-2026-019` §2; 020, 030 and 040 each record that no command surface exists). And
--     `scripts/db/run.mjs`'s catalog lint FAILS the build when any service role holds USAGE on
--     `private`, correctly. So a table in `private` today is a table NO ROLE CAN REACH — not the
--     client, not the service, not through any function — which means no isolation case could
--     distinguish "row level security refused it" from "no grant" from "no schema usage", and its
--     isolation would be unprovable. That is the unfalsifiable shape `RFC-2026-016` §4 retired
--     "force where compatible" for being. The table lands in `app` with no client grant and no
--     policy, which is 030's global-table shape and delivers the same refusal with a TESTABLE
--     denial. Moving it is owed to the batch that brings the typed service.
--
--   * NO PLATFORM-SCOPE RECORD. Both tables make `workspace_id` NOT NULL, so an audit or security
--     event belonging to no workspace has no home. That is `CTR-AUD-001`'s own boundary, quoted:
--     "a platform-scope action belonging to no workspace, which this contract does not model
--     because it requires a full CTR-TEN-001 tenant context on every record". A nullable
--     `workspace_id` would be modelling it, and would put a row with no tenant into the one family
--     whose every rule is written per tenant.
--
--   * NO RETENTION WINDOW, AND NO PATH FOR THE RETENTION JOB. §10 gives `AUDIT` "1 ปี default" and
--     `SECURITY` "2 ปี default", and `DATA-DEC-06` — "Audit/security retention, 1/2 ปี,
--     Security/Legal, ก่อน Paid Beta" — is OPEN, so the numbers are not encoded (§15). More
--     sharply: §10 also says "anonymize actor where allowed; purge after policy", and the trigger
--     below refuses UPDATE and DELETE FOR EVERY ROLE INCLUDING `app_maintenance`. Batch `160` owns
--     the retention path and cannot simply be granted the verbs — it must replace
--     `private.refuse_mutation()` in a forward migration a reviewer reads, or narrow it to a named
--     path. That is deliberate: a trigger with a hole for a role that has no grant and no policy
--     yet would be a permission nobody reviewed against a caller (010's sentence). The conflict
--     between §8.4's `N N N N N N` and §10's "purge after policy" is real, it is the baseline's,
--     and it is recorded rather than resolved by this batch.
--
--   * NO VOCABULARY FOR `security_events.event_type`. No document enumerates the kinds of security
--     event. §3.2's "text + named CHECK" governs a Phase 1 STATE whose value set a document fixes;
--     this is a classifier whose set none does. The column therefore carries the dotted GRAMMAR
--     `CTR-AUD-001` fixes for `action.name` — a shape — and no enum. Inventing the six or eight
--     words would be inventing the security taxonomy, which is exactly what 010 refused for
--     invitation status and 021 for a scope lifecycle.
--
--   * NO DIGEST ALGORITHM, WHICH IS AN INHERITED DEBT THIS BATCH WAS NAMED FOR AND DOES NOT PAY.
--     `010_identity.sql` says of `workspace_invitations.token_hash`: "The digest algorithm is
--     unspecified by the data package and is A1 Security to fix" — "in 011 or 140". 011 did not,
--     and 140 does not either. The choice is between at least three shapes (a bare digest, a keyed
--     HMAC, and a peppered digest whose pepper lives in a secret store), §9.2 requires a vault for
--     any key and no secret store exists, and pinning one in a CHECK constraint would ratify it.
--     What this batch DOES do is adopt one shape for its own hashed columns and state the rule in
--     one place: §9.3 asks for "keyed hash or truncated/redacted representation" of an IP or a user
--     agent, so the columns are `bytea` of EXACTLY 32 bytes and the key, if there is one, lives
--     outside this database. A plaintext address does not fit the shape, which is 010's own device.
--
--   * NO RESTRICTIVE NARROWING. 021, 030 and 040 each added one because a permissive policy cannot
--     subtract. There is nothing here to subtract from: the permissive policy set on both tables is
--     EMPTY, and a restrictive policy ANDed with an empty permissive set can only refuse what is
--     already refused. Member scope does not reach these rows either — §7's scope types are
--     `all_businesses`, `business` and `page`, and an audit record is addressed by its Workspace.
--
--   * NO HELPER, AND NO CALL TO ONE. Not one predicate below calls `app.is_active_member` or
--     `app.workspace_member_role`, for the plain reason that there is no predicate below: neither
--     table carries a policy. The registry's "depends on 011" is therefore an ORDERING and not a
--     reference, exactly as 040 recorded of its own dependency on 030. Membership is still never
--     read by joining `app.workspace_members` — there is nothing here that reads membership at all
--     — and a static test asserts the absence rather than trusting this sentence.


-- ---------------------------------------------------------------------------------------------
-- The refusal trigger. §8.5's "trigger defense", and the only thing in this schema the table owner
-- is subject to.
-- ---------------------------------------------------------------------------------------------
--
-- It lives in `private` because §3.1 puts helpers there and because no client role may reach it;
-- batch 000's `private.set_updated_at()` is the precedent for a trigger function in that schema.
--
-- SECURITY DEFINER with an empty search_path, copying batch 000's helper exactly. It reads nothing
-- and writes nothing — it only raises — so the definer context confers no privilege whatsoever; the
-- mode is copied because that is the shape known to fire correctly when the acting role holds
-- nothing in `private` (batch 040's editor updates fire `set_updated_at` in CI today), and because
-- §8.5 asks an empty search_path of every SECURITY DEFINER function.
--
-- IT RAISES A DISTINCT SQLSTATE, `ZZ140`, AND THAT IS LOAD-BEARING TWICE. The apply-time probe below
-- needs to tell "the trigger refused" from "something else went wrong", and asserting on a message
-- string would be asserting on `lc_messages`. And in the isolation suite, `ZZ140` is deliberately
-- NOT 42501: `db/foundation/test-helpers/rls-assertions.mjs` accepts only 42501 as a denial, so if a
-- request-path identity ever reached this trigger — which it cannot today, because every client role
-- is refused by the privilege system first — the case would fail loudly with "the database raised
-- ZZ140, which is not an RLS refusal" instead of passing under the wrong control's name.
create or replace function private.refuse_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'app.% is append-only and refuses %', tg_table_name, tg_op
    using errcode = 'ZZ140',
          -- The DETAIL names the object and the operation and NOT THE ACTING ROLE, which is a
          -- correction rather than an omission. This function is SECURITY DEFINER, so inside it
          -- `current_user` is its OWNER and `session_user` is the login role -- neither is the role
          -- that issued the statement, which after a `set local role` is a third value the function
          -- cannot see. A message naming the definer would be wrong on every line it ever printed,
          -- and a security control whose error text is always wrong is worse than one that says
          -- less. Who attempted the write is the audit trail's own question, and this trigger is
          -- what stops the answer being edited.
          detail = format('table %I.%I, operation %s',
                          tg_table_schema, tg_table_name, tg_op),
          hint = 'An audit record must not be alterable by the party it is about, and row level '
                 'security cannot say so to a role that bypasses it or owns the table. This trigger '
                 'is the half that can (§8.5: no user update/delete policy AND a command/trigger/'
                 'privilege defense). It is tamper RESISTANCE, not tamper evidence: the table owner '
                 'can disable it in one statement. The retention job §10 requires is owed a forward '
                 'migration that narrows this function, not a grant.';
end;
$$;

comment on function private.refuse_mutation() is
  'Trigger helper (batch 140): refuses UPDATE, DELETE and TRUNCATE on an append-only table with '
  'SQLSTATE ZZ140, for every role INCLUDING the table owner and including roles that hold '
  'BYPASSRLS. It is §8.5''s "trigger defense" for an immutable table, and it is the only mechanism '
  'in this schema that constrains postgres, which owns every table in app and bypasses row level '
  'security. SECURITY DEFINER with an empty search_path, copying batch 000''s helper; it reads and '
  'writes nothing, so the definer context confers nothing.';

revoke all on function private.refuse_mutation() from public;


-- ---------------------------------------------------------------------------------------------
-- app.audit_logs — the tenant audit trail. `CTR-AUD-001`, as a table.
-- ---------------------------------------------------------------------------------------------
--
-- §4's ERD names one entity for this family and one relation: `WORKSPACE ||--o{ AUDIT_LOG : audits`.
-- The table is that entity, pluralised the way `BUSINESS_PROFILE` became `business_profiles` and
-- `KNOWLEDGE_ITEM` became `knowledge_items`.
--
-- Canonical scope `workspace_id` (§3.3), plus the two optional scope columns `CTR-TEN-001` carries,
-- spelled in the canonical form §3.3 fixes. None of the three is a foreign key — see the header.
--
-- No `updated_at` and no trigger for one: §3.2 requires it of a MUTABLE row and this row is not one.
-- No `created_by` and no `updated_by` either, and that is §3.2 read rather than skipped: those two
-- are for "user mutation", and an audit record is not a user's mutation of anything. The acting
-- party is `actor_kind` + `actor_id`, which is the contract's own field and carries more than
-- `created_by` could.
create table if not exists app.audit_logs (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid,
  page_context_profile_id  uuid,
  occurred_at              timestamptz not null,
  actor_kind               text        not null,
  actor_id                 text        not null,
  action_category          text        not null,
  action_name              text        not null,
  outcome                  text        not null,
  reason_key               text        not null,
  request_id               text        not null,
  correlation_id           text        not null,
  causation_id             text,
  change_before_ref        text,
  change_after_ref         text,
  error_code               text,
  secret_redacted          boolean     not null,
  content_redacted         boolean     not null,
  pii_redacted             boolean     not null,
  retention_policy_ref     text        not null,
  created_at               timestamptz not null default now(),

  -- `CTR-AUD-001` actor: a typed kind and id, "never a free string", matching `CTR-TEN-001`.
  constraint audit_logs_actor_kind_known check (actor_kind in ('user', 'system_actor')),
  constraint audit_logs_actor_id_not_blank check (length(btrim(actor_id)) > 0),

  -- The six action categories are "exactly the six auditable action classes SEC-009 enumerates",
  -- per the contract's own x-source. They are the contract's list and not a list chosen here.
  constraint audit_logs_action_category_known
    check (action_category in ('role', 'credential', 'publish', 'delete', 'billing', 'support')),
  -- The dotted `<domain>.<entity>.<action>` grammar, with the underscore the contract deliberately
  -- permits inside a segment because DEC-010's entities are `business_profile` and
  -- `page_context_profile`. Length 96 is the contract's maximum.
  constraint audit_logs_action_name_form
    check (action_name ~ '^[a-z0-9_]+(\.[a-z0-9_]+)+$' and length(action_name) <= 96),

  constraint audit_logs_outcome_known check (outcome in ('succeeded', 'failed', 'denied')),

  -- A stable KEY and never free text: CM-004 and CTR-ERR-001 establish stable machine codes for
  -- anything a person reads, and OBS-001 forbids full content on this path.
  constraint audit_logs_reason_key_form
    check (reason_key ~ '^audit\.[a-z0-9_.]+$' and length(reason_key) <= 96),

  constraint audit_logs_request_id_not_blank check (length(btrim(request_id)) > 0),
  constraint audit_logs_correlation_id_not_blank check (length(btrim(correlation_id)) > 0),
  constraint audit_logs_causation_id_not_blank
    check (causation_id is null or length(btrim(causation_id)) > 0),

  -- A REFERENCE, not a value. The contract's own sentence: "the audit record cannot leak state it
  -- does not hold". The grammar is its `before_ref`/`after_ref` pattern, adopted there from
  -- CTR-IDM-001 after that contract's security review — a closed scheme list, no leading slash, no
  -- `..` segment, no public URL.
  constraint audit_logs_change_before_ref_form check (
    change_before_ref is null
    or (change_before_ref ~ '^(snapshot|record):[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*(/[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*)*$'
        and length(change_before_ref) <= 256)),
  constraint audit_logs_change_after_ref_form check (
    change_after_ref is null
    or (change_after_ref ~ '^(snapshot|record):[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*(/[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*)*$'
        and length(change_after_ref) <= 256)),

  -- `CTR-AUD-001` allOf[0], and the first of the two CROSS-FIELD rules its own
  -- `untestable_by_schema` note says JSON Schema in this subset cannot express. PDPA-008 requires a
  -- deletion to leave a tombstone and an audit entry; a delete that names nothing it deleted
  -- satisfies neither.
  constraint audit_logs_delete_names_what_it_deleted
    check (action_category <> 'delete' or change_before_ref is not null),

  -- allOf[1] and allOf[2], as ONE constraint because they are one biconditional: a failed or denied
  -- action must say why in CTR-ERR-001's vocabulary, and a successful one carrying an error is "two
  -- contradictory statements about one event, and a reader cannot tell which the alert route should
  -- trust".
  constraint audit_logs_outcome_matches_error
    check ((outcome = 'succeeded') = (error_code is null)),
  constraint audit_logs_error_code_not_blank
    check (error_code is null or length(btrim(error_code)) > 0),

  -- The contract makes all three `const: true`. A record that does not ASSERT redaction is refused
  -- by the store rather than accepted and hoped about — which, with `details` absent entirely, is
  -- the whole of how a secret is kept out of an audit log at the database.
  constraint audit_logs_redaction_asserted
    check (secret_redacted and content_redacted and pii_redacted),

  -- SEC-009's deliverable is "Audit schema + retention" and PDPA-006 requires a machine-readable
  -- retention schedule naming audit explicitly, so the record names the policy governing it. The
  -- DURATION is deliberately not pinned here, exactly as the contract does not pin it: DATA-DEC-06
  -- is open (§15).
  constraint audit_logs_retention_policy_ref_form
    check (retention_policy_ref ~ '^retention\.[a-z0-9_.]+$' and length(retention_policy_ref) <= 96)
);

comment on table app.audit_logs is
  'Owner: A1 Security/Audit (audit.core, batch 140). Canonical scope workspace_id (§3.3), with the '
  'optional Business and Page scope CTR-TEN-001 carries. Sensitivity AUTH-3; retention AUDIT, whose '
  'window is DATA-DEC-06 and is deliberately not encoded. APPEND-ONLY (§5, §3.2, §4 invariant 8, '
  '§8.4''s "Audit/security UPDATE/DELETE | N N N N N N"): no role holds UPDATE, DELETE or TRUNCATE, '
  'no policy grants any, AND private.refuse_mutation() raises for every role including the table '
  'owner — which is the only defence that reaches a role holding BYPASSRLS, and which the owner can '
  'still disable in one statement. Its columns are CTR-AUD-001''s, which sits at position 2 of '
  'CONTRIBUTING_AGENTS.md''s conflict order where §5 — silent on every column of every family — sits '
  'at 4. It carries NO foreign key: §11.4 purges tenant content in step 7 and retains audit in step '
  '8, so an audit row must outlive the rows it names.';
comment on column app.audit_logs.workspace_id is
  'AUTH-3. The canonical tenant scope. NOT a foreign key, and that is §11.4''s required order rather '
  'than an omission — see the table comment. Nothing in this schema refuses an audit row naming a '
  'workspace that does not exist; CTR-TEN-001''s trust boundary ("Server-resolved only after '
  'membership and Workspace→Business→Page relation validation") is what does, in the producer.';
comment on column app.audit_logs.business_profile_id is
  'AUTH-3. CTR-TEN-001''s optional Business scope, spelled in the canonical form §3.3 fixes. '
  'Nullable, unconstrained, and indexed by nothing: no policy reads it and no foreign key holds it.';
comment on column app.audit_logs.page_context_profile_id is
  'AUTH-3. CTR-TEN-001''s optional Page scope, spelled in full because §3.3 forbids the abbreviated '
  'synonym outright.';
comment on column app.audit_logs.occurred_at is
  'When the ACTION happened, which is not when the record was written. created_at carries the '
  'second, and the keyset index below orders by this one: an audit trail read by insertion time '
  'interleaves wrongly the moment a producer records late.';
comment on column app.audit_logs.actor_id is
  'PII-2/AUTH-3. The acting party, as CTR-AUD-001''s typed actor rather than as created_by — an '
  'audit record is not a user mutation (§3.2), and a system_actor has an id that is not a uuid. '
  'text, not uuid, for that reason. Not FK-constrained and anonymizable in place: §11.2 forbids '
  'cascade-deleting audit history when a member is removed, and §10''s AUDIT class says "anonymize '
  'actor where allowed".';
comment on column app.audit_logs.action_category is
  'AUTH-3. CTR-AUD-001''s six categories, which its x-source calls "exactly the six auditable action '
  'classes SEC-009 enumerates". text + a named CHECK (§3.2); values change by migration only.';
comment on column app.audit_logs.outcome is
  'AUTH-3. succeeded, failed or denied. The contract calls this a DECLARED INFERENCE from SEC-007''s '
  'deny-by-default and SEC-016: "a denial is the single most important thing an audit of an '
  'authorization boundary can record".';
comment on column app.audit_logs.change_before_ref is
  'AUTH-3. A REFERENCE and never a value, which is what makes redaction achievable at all: the '
  'record cannot leak state it does not hold. Required when action_category is `delete` '
  '(CTR-AUD-001 allOf[0], PDPA-008).';
comment on column app.audit_logs.error_code is
  'AUTH-3. CTR-ERR-001''s `code` alone. Present exactly when the outcome is failed or denied, which '
  'is a cross-field rule the contract''s own note says JSON Schema in this subset cannot express and '
  'a CHECK can. The other five fields of CTR-ERR-001 describe the response the caller received '
  'rather than this record.';
comment on column app.audit_logs.secret_redacted is
  'AUTH-3. `const: true` in the contract, so the store refuses a record that does not assert it. '
  'With no `details` column anywhere in this table, the pair is the whole of how a secret is kept '
  'out of an audit log by the database rather than by the producer''s good intentions.';
comment on column app.audit_logs.retention_policy_ref is
  'AUTH-3. The policy governing this record (SEC-009, PDPA-006). A reference, not a duration: §10 '
  'gives AUDIT "1 ปี default" and DATA-DEC-06 leaves the number open, so a window written here would '
  'read as ratified (§15).';


-- ---------------------------------------------------------------------------------------------
-- app.security_events — SECURITY-4, and the family §8 gives the least to.
-- ---------------------------------------------------------------------------------------------
--
-- §5 names it; §4's ERD does NOT — there is no SECURITY_EVENT entity, and the entity list is where
-- every other table in this schema came from. So this table is created from §5's inventory row and
-- §9.1's class description alone, which is thinner ground than any other table stands on, and the
-- columns are correspondingly few: §9.1's own examples ("raw security event, replay anomaly,
-- IP/user agent") and §9.3's storage rule for the last of them, and nothing else.
--
-- The actor is NULLABLE here and NOT NULL on the audit log, which is the difference between the two
-- families rather than an inconsistency: an audit record is a record of somebody's ACTION and always
-- has an actor, while §9.1's own example of a security event — a "replay anomaly" — is a pattern
-- nobody performed. Both columns move together, so a row cannot name a kind of actor without naming
-- one.
create table if not exists app.security_events (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid        not null,
  occurred_at      timestamptz not null,
  event_type       text        not null,
  actor_kind       text,
  actor_id         text,
  source_ip_hash   bytea,
  user_agent_hash  bytea,
  created_at       timestamptz not null default now(),

  -- A GRAMMAR and not a vocabulary. See the header: no document enumerates the kinds of security
  -- event, and §3.2's "text + named CHECK" governs a state whose value set a document fixes. The
  -- shape is CTR-AUD-001's dotted `action.name` form, reused because it is the convention this
  -- repository already has rather than a second one invented here.
  constraint security_events_event_type_form
    check (event_type ~ '^[a-z0-9_]+(\.[a-z0-9_]+)+$' and length(event_type) <= 96),

  constraint security_events_actor_kind_known
    check (actor_kind is null or actor_kind in ('user', 'system_actor')),
  constraint security_events_actor_id_not_blank
    check (actor_id is null or length(btrim(actor_id)) > 0),
  constraint security_events_actor_is_whole_or_absent
    check ((actor_kind is null) = (actor_id is null)),

  -- §9.3: "IP/user-agent: store keyed hash or truncated/redacted representation". `bytea` of
  -- exactly 32 bytes, so a plaintext address does not fit the shape — 010's device for
  -- token_hash, tightened from a floor to an equality because these columns hold a digest and
  -- nothing else. The KEY of a keyed hash is a secret and §9.2 forbids one in this database, so it
  -- lives outside; which construction produces the digest is the inherited decision the header
  -- records and this batch does not make.
  constraint security_events_source_ip_hash_is_a_digest
    check (source_ip_hash is null or octet_length(source_ip_hash) = 32),
  constraint security_events_user_agent_hash_is_a_digest
    check (user_agent_hash is null or octet_length(user_agent_hash) = 32)
);

comment on table app.security_events is
  'Owner: A1 Security/Audit (audit.core, batch 140). Canonical scope workspace_id (§3.3), NOT a '
  'foreign key for the reason app.audit_logs carries none. Sensitivity SECURITY-4 — the class §9.1 '
  'describes as "hash/minimize; restricted" with a client projection of "security/admin safe view '
  'only" — and retention SECURITY, whose 2-year default is DATA-DEC-06 and is not encoded. '
  'APPEND-ONLY, by the same three mechanisms as app.audit_logs. §5 scopes this family '
  '"workspace/private" and the private half is NOT honoured: a table in `private` is reachable by '
  'no role at all today, so its isolation would be unprovable — see the migration header. §4''s ERD '
  'contains no SECURITY_EVENT entity, so the column list comes from §9.1''s own examples and §9.3''s '
  'storage rule and from nothing else.';
comment on column app.security_events.event_type is
  'SECURITY-4. A dotted classifier constrained by GRAMMAR and not by vocabulary: no document '
  'enumerates the kinds of security event, and inventing the words would be inventing the security '
  'taxonomy.';
comment on column app.security_events.actor_kind is
  'AUTH-3. NULL together with actor_id when no actor is identified — §9.1''s own example of this '
  'family is a "replay anomaly", which is a pattern rather than somebody''s act.';
comment on column app.security_events.source_ip_hash is
  'SECURITY-4. §9.3 permits a keyed hash or a truncated representation of an IP and forbids the '
  'address; bytea of exactly 32 bytes, so a plaintext address does not fit the column. The key, if '
  'the deployment uses one, lives outside this database (§9.2).';
comment on column app.security_events.user_agent_hash is
  'SECURITY-4. See source_ip_hash. §9.1 lists the user agent beside the IP in the same class and '
  '§9.3 gives them the same rule.';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- There are no foreign keys to support (the header says why) and no RLS-predicate columns at all
-- (neither table carries a policy). So the ONLY index rule that bites here is the keyset one, and
-- exactly one index per table answers it.
--
-- §3.3's example cursor is "(created_at desc, id desc)"; these are "(occurred_at desc, id desc)".
-- The example is an example — the document writes "เช่น" — and an audit trail is read by WHEN THE
-- ACTION HAPPENED. Ordering by insertion time would interleave wrongly the moment a producer
-- records late, which is the normal case for a queued or replayed event. `id` breaks the tie and
-- makes the cursor total.
--
-- DELIBERATELY NOT INDEXED, so the absences are decisions rather than oversights:
--   business_profile_id / page_context_profile_id  — no foreign key, no policy predicate, no
--                                                    cursor. An index for a query nobody makes.
--   actor_id, correlation_id                       — the two columns a support query would filter
--                                                    on, and there is no support query: no client
--                                                    role can read this table at all. Batch 150 owns
--                                                    index readiness against a production fixture,
--                                                    and an index chosen here would be chosen
--                                                    against no workload.
create index if not exists audit_logs_workspace_keyset_idx
  on app.audit_logs (workspace_id, occurred_at desc, id desc);

create index if not exists security_events_workspace_keyset_idx
  on app.security_events (workspace_id, occurred_at desc, id desc);


-- ---------------------------------------------------------------------------------------------
-- The append-only triggers. Six of them, and each pair is two triggers rather than one.
-- ---------------------------------------------------------------------------------------------
--
-- A row-level trigger covers UPDATE and DELETE; TRUNCATE has no rows and needs a STATEMENT-level
-- one. Both are written, and TRUNCATE is the reason the second exists at all: it is the verb that
-- empties a table without a DELETE grant and without touching a single row-level control, and no
-- earlier batch's immutable table is protected from it by anything but the absence of the privilege.
drop trigger if exists refuse_mutation on app.audit_logs;
create trigger refuse_mutation before update or delete on app.audit_logs
  for each row execute function private.refuse_mutation();

drop trigger if exists refuse_truncate on app.audit_logs;
create trigger refuse_truncate before truncate on app.audit_logs
  for each statement execute function private.refuse_mutation();

drop trigger if exists refuse_mutation on app.security_events;
create trigger refuse_mutation before update or delete on app.security_events
  for each row execute function private.refuse_mutation();

drop trigger if exists refuse_truncate on app.security_events;
create trigger refuse_truncate before truncate on app.security_events
  for each statement execute function private.refuse_mutation();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on both tables, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
--
-- Neither table carries a policy, so FORCE is doing what it does on batch 030's two global tables:
-- it is the whole of what refuses every non-bypassing role, including a future owner that does not
-- bypass. Against `postgres`, which owns these tables and holds BYPASSRLS today, it buys nothing,
-- and the migration header says so at length rather than letting the two lines below imply
-- otherwise.
alter table app.audit_logs enable row level security;
alter table app.audit_logs force row level security;

alter table app.security_events enable row level security;
alter table app.security_events force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges.
-- ---------------------------------------------------------------------------------------------
--
-- `authenticated` and `anon` are granted NOTHING — not a table, not a column, not a verb. See the
-- header: RFC-2026-012 decision 2 and its inventory, RFC-2026-021 §7/3's empty allowlist and §8.5's
-- closed exception list, §9.1's projection rules, and two §8.4 cells nobody can implement. This is
-- 030's shape on a stronger row, and it is asserted in the STATIC suite rather than at apply time,
-- for 030's reason: an allowlist exists in order to grow, and an applied migration whose
-- self-assertion an approving RFC makes false is the trap 011 set for 021.
--
-- `app_worker` holds SELECT and INSERT and NO POLICY. The verbs are §8.4's — the service is `P` on
-- Tenant audit SELECT, `S` on Security event details, and `S` on Audit/security INSERT — and the
-- missing policy is the §8.4 `S` cell this batch cannot implement, for the RFC-2026-016 §2 reason
-- the header gives at length. The grant is what makes the refusal ATTRIBUTABLE: without it a service
-- denial is 42501 either way and proves only that somebody forgot a GRANT; with it and no policy, an
-- empty read can only have come from row level security, and a service role that had quietly
-- acquired BYPASSRLS would SUCCEED where the suite demands a refusal.
--
-- Never UPDATE, never DELETE, never TRUNCATE, for any role: §8.4's version row is `N` in every
-- column including the service, and TRUNCATE is not in that matrix at all because no matrix has a
-- row for a verb that empties a table. It is refused here anyway, by an absent privilege and by a
-- trigger.
grant select, insert on app.audit_logs to app_worker;
grant select, insert on app.security_events to app_worker;

-- `app_command` and `app_maintenance` are granted nothing by this batch. There is no specified
-- command surface for audit.core — 141 is the batch the registry gives the consumers and hooks to —
-- and the retention path is batch 160, which needs more than a grant here (see the header on §10).


-- ---------------------------------------------------------------------------------------------
-- Policies. There are none, on either table, and that is a decision this file makes rather than a
-- section it forgot.
-- ---------------------------------------------------------------------------------------------
--
-- §8.4 gives the client roles Y, P, O, "approval trail", N and P across two rows, and this batch
-- implements none of them, for the five reasons the header enumerates. §8.4 gives the service `S`
-- on the INSERT, and this batch does not implement that one either — for a sixth reason, which is that
-- RFC-2026-016 §2 conditions the service policy on a workspace GUC that does not exist.
--
-- A policy written for a caller that does not exist is a permission nobody reviewed (030's
-- sentence, unchanged). Both tables are ENABLE + FORCE with an empty policy set, which denies every
-- non-bypassing role including the one role holding a grant, and
-- `tests/db/identity/identity-isolation.test.mjs` holds this file to the emptiness in BOTH
-- directions — a policy appearing here fails a test that a reviewer reads, which is the right home
-- for a rule whose whole purpose is to be amended by decision rather than by drift.


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004, 011, 020, 021, 030 and 040 use: a claim that is only a comment is a claim
-- nobody checks. These are the properties answerable from the catalog of the database being
-- migrated, without a committed snapshot and without a test harness — plus one that is answerable
-- only by DOING IT, which is new here and is the point of the batch.
--
-- WHAT IS DELIBERATELY NOT ASSERTED BELOW, following 030's rule and 021's scar: nothing about the
-- ABSENCE of a client grant and nothing about the absence of a policy. Those two are the empty read
-- allowlist, and the allowlist is designed to grow (RFC-2026-021 §8.2). They are asserted in the
-- static suite instead, where the batch that lands an allowlist entry edits a line a reviewer reads.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only by
-- a superuser, and a migration that needs one to apply is a migration that cannot be applied on the
-- platform it targets, where `postgres` is not a superuser.
do $$
declare
  offending        text;
  count_of         integer;
  probe_workspace  constant uuid := gen_random_uuid();
  probe_id         constant uuid := gen_random_uuid();
  probe_written    boolean := false;
  probe_sqlstate   text;
  update_refused   boolean := false;
  delete_refused   boolean := false;
  truncate_refused boolean := false;
begin
  -- ENABLE and FORCE on both. The two are different catalog columns and the data package's own lint
  -- rule reads only the first (RFC-2026-016).
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('audit_logs', 'security_events')
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'On a table with no policy, FORCE is what refuses every non-bypassing role. It '
                   'refuses nothing to a role holding BYPASSRLS, which is why these tables also '
                   'carry a trigger.';
  end if;

  -- §8.4's "Audit/security UPDATE/DELETE | N N N N N N", as the privilege system holds it, plus
  -- TRUNCATE — the verb that empties a table with no DELETE grant and that no matrix has a row for.
  -- Asserted against the live ACLs rather than against the text of the grants above, because a grant
  -- made by a LATER batch would not appear in this file at all.
  --
  -- `has_any_column_privilege` for UPDATE so a column-scoped grant is caught as well as a table-wide
  -- one; DELETE and TRUNCATE have no column-level form and are asked of the table.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname in ('audit_logs', 'security_events')
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'TRUNCATE'))
    ) as held;
  if offending is not null then
    raise exception 'an append-only audit table grants UPDATE, DELETE or TRUNCATE: %', offending
      using hint = '§8.4 marks "Audit/security UPDATE/DELETE" N for every role INCLUDING the '
                   'service, and TRUNCATE is refused here because no access matrix has a row for a '
                   'verb that empties a table. The absence of the grant is what makes the refusal a '
                   'privilege-layer denial rather than a policy a later edit can widen.';
  end if;

  -- And the same claim as the policy catalog holds it. Both halves, because either alone can be
  -- satisfied while the other is wrong: a policy with no grant is inert, and a grant with no policy
  -- is denied by RLS instead of by privilege, which is a weaker refusal than append-only asks for.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('audit_logs', 'security_events')
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'an append-only audit table carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- Both triggers on both tables, by name, by timing and by the function they call. The behavioural
  -- proof below is run once, on one table, against one mechanism; this is what says the mechanism is
  -- attached to the other table too. tgtype bit 0 is ROW, bit 1 is BEFORE, and the action bits are
  -- UPDATE (4), DELETE (3) and TRUNCATE (5) — read here through the pg_trigger booleans rather than
  -- through the bitmask, because a bitmask in an apply-time block is a clever query, and a clever
  -- query that fails to parse fails the migration rather than the rule it was checking.
  select count(*) into count_of
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_proc p on p.oid = t.tgfoid
    join pg_catalog.pg_namespace fn on fn.oid = p.pronamespace
   where n.nspname = 'app'
     and c.relname in ('audit_logs', 'security_events')
     and not t.tgisinternal
     and fn.nspname = 'private' and p.proname = 'refuse_mutation';
  if count_of <> 4 then
    raise exception 'batch 140 finds % append-only trigger(s) calling private.refuse_mutation() and writes four', count_of
      using hint = 'Two tables, and two triggers each: a ROW trigger for UPDATE and DELETE, and a '
                   'STATEMENT trigger for TRUNCATE, which has no rows to fire a row trigger on and '
                   'is the verb that empties a table without a DELETE grant.';
  end if;

  -- THE PROOF THIS BATCH OWES MOST, AND IT IS DISCHARGED BY EXECUTION RATHER THAN BY CITATION.
  --
  -- RFC-2026-020 §6.2 established the rule that a claim a decision rests on must be EXECUTED. The
  -- claim here is the batch's central one: an append-only table refuses UPDATE, DELETE and TRUNCATE
  -- **to the role running this migration**, which is `postgres` — the role that OWNS every table in
  -- `app` and holds BYPASSRLS, so it is exempt from every policy and from FORCE alike. If the
  -- trigger did not fire for it, this batch's entire immutability claim would be a comment.
  --
  -- The probe is deliberately dull. Its row is self-contained (no foreign keys to satisfy — see the
  -- header), the whole of it happens inside a subtransaction that ALWAYS aborts, and the abort is
  -- forced by raising a SQLSTATE this file owns so that a real failure inside the probe cannot be
  -- swallowed as the intended one.
  begin
    -- The write is itself wrapped, so that a database on which the migration role CANNOT write the
    -- table produces a message saying that rather than three misleading ones saying the trigger did
    -- not fire. It is a real possibility and not a defensive flourish: this whole probe depends on
    -- the migration role reaching the row, which on both databases this repository targets it does
    -- because it bypasses row level security -- and that is exactly the property being probed
    -- against.
    begin
      insert into app.audit_logs
        (id, workspace_id, occurred_at, actor_kind, actor_id, action_category, action_name,
         outcome, reason_key, request_id, correlation_id,
         secret_redacted, content_redacted, pii_redacted, retention_policy_ref)
      values
        (probe_id, probe_workspace, now(), 'system_actor', 'migration.140.probe',
         'support', 'audit.probe.immutability', 'succeeded', 'audit.probe.append_only_holds',
         'migration-140-probe', 'migration-140-probe', true, true, true, 'retention.audit');
      probe_written := true;
    exception when others then
      probe_sqlstate := sqlstate;
    end;

    if probe_written then
      begin
        update app.audit_logs set outcome = 'denied' where id = probe_id;
      exception when sqlstate 'ZZ140' then
        update_refused := true;
      end;

      begin
        delete from app.audit_logs where id = probe_id;
      exception when sqlstate 'ZZ140' then
        delete_refused := true;
      end;

      begin
        truncate app.audit_logs;
      exception when sqlstate 'ZZ140' then
        truncate_refused := true;
      end;
    end if;

    raise exception 'batch 140 append-only probe complete' using errcode = 'ZZ141';
  exception when sqlstate 'ZZ141' then
    -- The subtransaction is rolled back with everything the probe did, including its INSERT.
    -- PL/pgSQL variables are not rolled back with it, which is what carries the findings out.
    null;
  end;

  if not probe_written then
    raise exception 'the batch 140 append-only probe could not write its own row (SQLSTATE %)', probe_sqlstate
      using hint = 'A proof that could not execute has not been discharged (RFC-2026-020 §6.2), so '
                   'this is a failure and never a skip. The probe writes as the MIGRATION role, '
                   'which on both databases this repository targets owns the table and bypasses row '
                   'level security. If it was refused, either that is no longer true -- in which '
                   'case the paragraph in this file about FORCE buying nothing is out of date and '
                   'must be rewritten -- or the column constraints above refuse a record this file '
                   'itself composed.';
  end if;

  if not update_refused then
    raise exception 'app.audit_logs accepted an UPDATE from the migration role'
      using hint = 'The migration runs as the table OWNER, which also holds BYPASSRLS, so neither '
                   'FORCE ROW LEVEL SECURITY nor an absent grant refuses it. The trigger is the only '
                   'thing that can, and it did not. This batch''s immutability claim is false.';
  end if;
  if not delete_refused then
    raise exception 'app.audit_logs accepted a DELETE from the migration role'
      using hint = 'See the UPDATE hint. An audit record that the table owner can delete in one '
                   'statement is an audit record with no immutability at all.';
  end if;
  if not truncate_refused then
    raise exception 'app.audit_logs accepted a TRUNCATE from the migration role'
      using hint = 'TRUNCATE fires no row trigger and is refused by no DELETE grant. It is the verb '
                   'that empties an append-only table while every row-level control stays green, and '
                   'the STATEMENT trigger is the only thing that refuses it.';
  end if;
  if exists (select 1 from app.audit_logs where id = probe_id) then
    raise exception 'the batch 140 append-only probe left its row behind'
      using hint = 'The probe runs inside a subtransaction that always aborts. A surviving row means '
                   'the abort did not happen, and a migration that seeds its own test data into an '
                   'audit log is worse than one that proves nothing.';
  end if;

  -- No policy this batch writes may name a service or anonymous role. It writes none at all today,
  -- so this is vacuous today and is the rule that bites the day one appears: §8.4 marks the service
  -- `S` on the INSERT and `N` on mutation, and a `TO app_worker` policy written without the workspace
  -- GUC RFC-2026-016 §2 requires would be an UNSCOPED service permission, which the amendment's own
  -- "introduces no new permission" forbids.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('audit_logs', 'security_events')
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('app_worker', 'app_command', 'app_maintenance', 'anon'));
  if offending is not null then
    raise exception 'batch 140 wrote a policy for a service or anonymous role: %', offending;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 140 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('audit_logs', 'security_events')
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020, 021, 030 and 040
  -- ask them: scripts/db/run.mjs holds every tenant table to the ownership rule against the
  -- COMMITTED SNAPSHOT, and this batch is deliberately not applied to the instance it describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('audit_logs', 'security_events')
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 140 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
