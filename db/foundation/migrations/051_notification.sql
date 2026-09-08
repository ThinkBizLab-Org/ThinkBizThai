-- Batch 051 — notification: the inbox, the channel preference, and the push subscription REFERENCE.
--
-- Owner: A5 Notification. The migration ownership registry (§6) reserves 051 to this package,
-- describes it as "notification inbox/preferences/push", and depends it on 050.
--
-- Depends on: 000 (schemas `app` and `private`, private.set_updated_at), 001 (app_worker),
-- 010 (app.workspaces, and the user-scoped row shape), 011 (app.is_active_member, which the two
-- policies below actually call), 050 (the registry's declared dependency). Every one of them is
-- merged; migration invariant 1 forbids rewriting any of them and NOTHING BELOW DOES — every
-- statement here creates a new object, and the only `drop trigger` statements name triggers this
-- file creates. A test asserts that pairing rather than trusting this sentence.
--
--
-- 050 IS THE DECLARED DEPENDENCY AND THIS FILE NAMES NONE OF ITS OBJECTS, WHICH IS WORTH SAYING
--
-- §6 makes 051 depend on 050 and no column, constraint or predicate below references `app.jobs`,
-- `app.outbox_events` or `app.consumer_ledger`. That is the registry being right about the ORDER
-- rather than about a reference, and 040 recorded the same shape about 030 while 140 recorded it
-- about 011. What 050 actually supplies is the thing this batch reads and does not import: the
-- OUTBOX IS WHAT A NOTIFICATION ROW IS FED BY, and 050's header says in terms that it built no
-- writer for it —
--
--   "it is a correctly shaped table with no writer, and the writer is a decision with an owner
--    rather than a column somebody forgot"
--
-- — because §3.4 requires an outbox row to be written in the same transaction as the domain state
-- and no command surface exists to hold that transaction. Asked directly, as this batch was: WHO
-- MAY WRITE A NOTIFICATION ROW? The answer is the same one and it is inherited rather than
-- rediscovered. §8.4 marks "Notification insert/delivery state" `S` — service only — and `S` is the
-- cell RFC-2026-016 §2 conditioned on a workspace GUC, which RFC-2026-022 has now disposed of and
-- which is NOT IN EFFECT (see the `S` section below). So `app_worker` holds the INSERT grant, holds
-- no policy, and is refused by row level security; the inbox has a correctly shaped writer's grant
-- and no writer, exactly as the outbox that would feed it has a correctly shaped envelope and none.
--
-- The difference from 050, and it is the whole reason this batch has positive cases at all: §8.4
-- gives the notification family a CLIENT cell as well, and this batch implements it.
--
--
-- ============================================================================================
-- WHAT §8.4 SAYS ABOUT THIS FAMILY, AND WHY ONE OF ITS TWO ROWS IS IMPLEMENTABLE HERE AND THE
-- EQUIVALENT ROW ON app.jobs WAS NOT
-- ============================================================================================
--
-- §8.4's first two rows are this family's, and they are the only cells §8 gives it anywhere:
--
--   | Own notification SELECT/mark read  | O | O | O | O | O | P |
--   | Notification insert/delivery state | N | N | N | N | N | S |
--
-- The first is IMPLEMENTED IN FULL below — a SELECT policy and an UPDATE policy, both
-- `TO authenticated`, and a column-scoped grant beside each. The second is classified in
-- `db/foundation/lint/service-policy-map.json` and gets no policy.
--
-- BATCH 050 MET THE SAME TWO-ROW SHAPE AND COULD IMPLEMENT NEITHER, and the difference is not that
-- this batch is bolder. §8.4's job rows read
--
--   | Job redacted status SELECT       | Y | Y | O/P | O/P | O/P | P |
--   | Internal job/attempt/DLQ payload | N | N | N   | N   | N   | S |
--
-- and 050's header gives the reason it refused: "The object §8.4 grants is a REDACTED STATUS, not a
-- job row... The two rows are one table and two objects." A redacted status is a PROJECTION, a
-- projection is a `security_invoker` view, and RFC-2026-012 §3 with RFC-2026-021 puts every such
-- view on an allowlist that is empty and grows only by RFC. There was no column list that could
-- separate the two rows, because "redacted" is a transformation and not a subset.
--
-- **HERE THE TWO ROWS SEPARATE BY COLUMN.** "Own notification" is the notification — its channel,
-- its message key, its deep link, whether it has been read. "Delivery state" is `delivery_state` and
-- `delivery_failure_class`, which are two columns of the same row and are marked `N` for every
-- client role. A column-scoped grant expresses that exactly, which is the form §8.5 asks for
-- ("Column-scoped grants") and the form RFC-2026-021 §8.4 makes a rule ("a table-wide grant is a
-- finding even when it covers exactly the same columns today"). So this batch needs no view, needs
-- no allowlist entry, and hands a client no column §8.4 marks `N`.
--
-- The grid, spelled out, because a reader should be able to check the claim against the grant:
--
--   authenticated SELECT   id, workspace_id, user_id, channel, message_key,
--                          deep_link_target_ref, deep_link_requires_permission,
--                          read_at, created_at, updated_at
--   authenticated UPDATE   read_at, and nothing else
--   withheld from both     delivery_state, delivery_failure_class  (§8.4 row 2, `N`)
--                          dedupe_key                              (see below)
--
-- WHY `dedupe_key` IS WITHHELD FROM THE CLIENT AND IS NOT PART OF ROW 2. It is not a delivery state;
-- it is ID-005's idempotency key, the identity of the EVENT that produced the notification. §9.1
-- classes the internal side of this kind of value `INTERNAL-3` ("job payload, DLQ, trace") with a
-- client projection of "redacted status only", and a client that could read it could enumerate
-- which events the system decided not to notify about twice. §8.4 does not name it in either
-- direction, and where a document is silent the cell is denied — so it is withheld, and the reason
-- is written here rather than left as an unexplained gap in a column list.
--
-- THE COST OF THE CLIENT SELECT GRANT, RECORDED RATHER THAN ABSORBED. RFC-2026-021 §8.5 names the
-- inherited `authenticated` base-table grants of 010, 020 and 021 as a known-exceptions list and
-- says that list "is CLOSED: it enumerates exactly the grants that exist today, and any new one
-- fails" — and that closing it "is a forward fix owed to `170`", so the list does not yet exist.
-- 030 refused to grow it; 040 grew it and called the growth a debt; 130 grew it once more and
-- recorded itself as a sixth entry rather than absorbing it silently. **This batch adds a seventh
-- and an eighth: a column-scoped SELECT and a one-column UPDATE on app.notifications.** They are
-- owed to that list when 170 writes it, they are recorded in the work package's open blockers, and
-- the argument for spending the debt here is this: §8.4 marks this cell `O` FOR ALL FIVE BUILT-IN
-- ROLES, with no `P`, no capability set to resolve and no projection language attached — WHICH IS
-- THE SAME SHAPE §8.1 GIVES "Own user profile SELECT/UPDATE", the cell batch 010 implemented as a
-- column-scoped SELECT, a column-scoped UPDATE and an own-row policy. So the grant below is 010's
-- shape applied to 010's kind of cell, and the one thing that differs is the thing this file spends
-- its longest section on: a user profile is NOT a tenant row (010's header says so in terms) and a
-- notification is, so the predicate here carries a membership term the profile's does not.
--
--
-- ============================================================================================
-- THE SCOPE IS `workspace/user`, AND WHAT THAT MEANS FOR A POLICY
-- ============================================================================================
--
-- §5's inventory row scopes `notification.core` **workspace/user**. The one user-scoped row 010
-- creates — `app.user_profiles` — is explicitly NOT a tenant row: 010's own header says it "carries
-- no workspace_id and it is not a tenant-owned row", and draws the consequence for §12.6/5, that a
-- suspended member's own profile is not one of the zero TENANT rows they see.
--
-- A NOTIFICATION IS BOTH, AND THE POLICY IS THEREFORE A CONJUNCTION OF TWO TERMS THAT ARE
-- SEPARATELY FALSIFIABLE:
--
--   user_id = (select auth.uid())          §8.4's `O`. Own row.
--   and app.is_active_member(workspace_id) §8.5's mandatory SELECT pattern, "active membership +
--                                          capability + Workspace/Business/Page scope + lifecycle
--                                          visibility", and §3.3's canonical scope field on a
--                                          tenant-owned row.
--
-- NEITHER TERM IMPLIES THE OTHER AND DROPPING EITHER ONE IS A DIFFERENT LEAK, which is why the
-- suite carries a case per term rather than one cross-tenant case for both:
--
--   * Drop the USER term and every active member of a workspace reads every other member's inbox.
--     `owner-a-cannot-see-the-notification-of-editor-a` and its mirror
--     `editor-a-cannot-see-the-notification-of-owner-a` are those cases.
--
--     A ROW-LEVEL SEPARATION BETWEEN TWO MEMBERS OF ONE WORKSPACE IS NOT NEW — 010 and 011 already
--     have it on `app.workspace_members` (`viewer-a-cannot-see-another-members-row`) and 021 on
--     `app.workspace_member_scopes`. WHAT IS DIFFERENT IS WHICH IDENTITY IT REFUSES, and that is
--     the whole reason the case here is written with the OWNER as the attacker. §8.1's "Member list
--     SELECT" is `Y` for owner and admin, and 011's `workspace_members_select_roster` implements
--     exactly that, so on those tables an owner DOES read another member's row. §8.4 marks this
--     cell `O` FOR ALL FIVE BUILT-IN ROLES — the owner included — so the identity that succeeds
--     there is refused here. A predicate that had been copied from the roster shape would pass
--     every case in this suite except that one.
--   * Drop the MEMBERSHIP term and a suspended, left or removed member keeps reading the
--     workspace's notifications addressed to them — §12.6/5 asks for zero TENANT rows and this is
--     a tenant row. `suspended-a-sees-zero-notifications` is that case, and the fixture loads a
--     notification ADDRESSED TO user_suspended_a on purpose, because against a table with nothing
--     addressed to them the assertion is satisfied by an empty result that means nothing.
--
-- §3.3 FIXES NO CANONICAL FIELD NAME FOR THE USER SCOPE, and that is stated rather than quietly
-- resolved. Its table names `workspace_id`, `business_profile_id`, `page_context_profile_id` and
-- `social_account_id`, and it forbids the synonyms `tenant_id`, `organization_id`, `brand_id` and
-- `page_id`. `user_id` is not in either list. It is the spelling batch 010 fixed for the same
-- concept in `app.user_profiles.user_id` and `app.workspace_members.user_id`, both merged, so this
-- batch adopts the established name rather than inventing a second one — which is §3.3's actual
-- rule ("Canonical field names เท่านั้น") applied to a scope its own table does not enumerate. The
-- gap is reported to §3.3's owner in the work package's open blockers.
--
-- MEMBERSHIP IS READ THROUGH THE HELPER AND NEVER BY JOINING THE MEMBERSHIP TABLE. `app.
-- is_active_member(uuid)` is batch 011's, `SECURITY DEFINER` and owned by `app_authz`, and
-- RFC-2026-020 §5/5 makes reading membership through it uniform. Not one predicate below contains
-- `from app.workspace_members`, and a static test asserts the absence rather than trusting this
-- sentence.
--
-- MEMBER SCOPE DOES NOT REACH THESE ROWS, and 140's sentence applies unchanged: §7's three scope
-- types are `all_businesses`, `business` and `page`, every one of them names a Business or a Page,
-- and a notification is addressed by its Workspace and its recipient. So no call to 021's
-- `member_scope_covers_*` or `member_scope_admits_*` appears below, and there is no narrowing for a
-- RESTRICTIVE policy to express — see the policy section.
--
-- WORKSPACE LIFECYCLE VISIBILITY IS STILL MISSING, unchanged from 020's, 030's and 040's headers and
-- for the same reason. `app.is_active_member` does not read `app.workspaces.lifecycle_state`, so a
-- member of an `access_blocked` workspace still reads its notifications, where 010's own
-- `workspaces_select_active_member` gates on `lifecycle_state in ('active', 'closing')`. Adding the
-- gate here would be one family being stricter than the helper every other family shares, which is
-- how two answers to one question get written; widening the helper is 011's file and migration
-- invariant 1 forbids this batch touching it. It stays owed to an RFC plus batch 170 and is
-- recorded in the work package's open blockers rather than half-fixed on one table.
--
--
-- ============================================================================================
-- SECRET-4 IS THE HAZARD OF THIS BATCH, AND §9.1 NAMES THE HAZARD BY NAME
-- ============================================================================================
--
-- §9.1's `SECRET-4` row, quoted in full because every decision about the third table is in it:
--
--   | `SECRET-4` | API key, OAuth token, signing secret, PUSH TOKEN | vault/encrypted secret store;
--                  never plaintext DB/log | never returned after write |
--
-- A push token is not classified SECRET-4 by analogy or by this batch's reading. It is ONE OF THE
-- FOUR EXAMPLES THE CLASSIFICATION TABLE ITSELF GIVES, named in the same list as "API key" — which
-- is what batch 060's `private.ai_credential_references` holds a reference to. §5's inventory row
-- for `notification.core` carries `PII-2/SECRET-4` and the SECRET-4 half is this and nothing else.
--
-- WHAT A PUSH SUBSCRIPTION ACTUALLY IS, stated so the storage decision is checkable. A Web Push
-- subscription is an ENDPOINT — a URL at the browser vendor's push service, which is a bearer
-- capability: anyone holding it can send that device a message — plus two keys, `p256dh` and
-- `auth`, which encrypt the payload to the device. All three are credentials in §9.1's sense: the
-- endpoint is a long-lived capability URL and the keys are keys.
--
-- §9.2 then decides where they may live, and it is an ABSOLUTE PROHIBITION rather than a
-- preference. Its forbidden list includes "long-lived signed media URL" and every flavour of token,
-- and its one permissive sentence fixes the column list of a secret table exhaustively:
--
--   "Secret table เก็บได้เพียง `credential_reference`, provider, fingerprint/last-four-like
--    identifier, status, created/rotated/expired timestamps และ audit reference"
--
-- BATCH 060 FACED THIS EXACT QUESTION FOR A PROVIDER CREDENTIAL AND ITS ANSWER IS ADOPTED HERE
-- WITHOUT AMENDMENT, because the alternative — a second answer to one question, one family over —
-- is how a schema acquires two secret-handling conventions. 060's answer, in three parts:
--
--   1. THE TABLE LIVES IN `private`. §3.1's own table puts "secret references" there by name, with
--      "ไม่มี direct grant", reachable "Server/worker ผ่าน typed service เท่านั้น"; §14's G0 gate
--      checklist requires that "Secret/raw webhook/internal job tables ไม่ exposed"; and `app` is the
--      exposed schema (DATA-DEC-01, RFC-2026-015). A SECRET-4 table in `app` fails that box on the
--      day somebody reads it.
--   2. IT HOLDS A REFERENCE AND NEVER THE VALUE. There is no `endpoint` column, no `p256dh` column,
--      no `auth` column and no ciphertext column. `credential_reference` is a LOCATOR in the vault
--      or encrypted secret store §9.1 requires; the endpoint and the two keys live there and the
--      database holds a handle to them.
--   3. THE COLUMN LIST IS AN ALLOWLIST ASSERTED AT APPLY TIME, so a later batch adding
--      `endpoint text` or `auth_key bytea` FAILS THE MIGRATION rather than the code review. 060's
--      sentence, unchanged: "that is the difference between a prohibition and a control, and it is
--      why the check is written as an ALLOWLIST rather than as a list of forbidden names: a
--      denylist of column names somebody thought of is defeated by the one they did not."
--
-- THIS REPOSITORY'S SECRET-SCANNING RULES ARE THE OTHER HALF AND THEY ARE NOT A SUBSTITUTE.
-- `scripts/scan-repository-secrets.mjs` runs over every file on every `npm run check`, this
-- migration and its fixture included, and CONTRIBUTING_AGENTS.md makes secret exposure
-- stop-the-line. What a scanner CANNOT do is recognise a push endpoint: it is an ordinary https URL
-- at a vendor host, indistinguishable in shape from a link. So the control cannot be "we will notice
-- a secret if one appears" — it has to be that THE SECRET HAS NO COLUMN TO APPEAR IN, which is what
-- the allowlist below enforces. The fixture carries a synthetic `vault://` locator for the same
-- reason 060's does.
--
-- WHERE THIS BATCH DIFFERS FROM 060, AND IT IS ONE COLUMN. §10 gives this family a retention class
-- 060's had none of: `PUSH-SECRET` — "device push subscription | active + 30 วัน inactive | revoke
-- immediately | purge token/reference". "30 days INACTIVE" is a window measured from a column, and
-- 010 created `expires_at` for `TOKEN-SHORT` and 050 created `consumed_at` for `CONSUMER-LEDGER`
-- before either retention job existed. `last_active_at` is that column and it is added to the
-- allowlist with §10 as its clause, not smuggled in. The NUMBER is not encoded: batch 160 owns the
-- retention job and §10's own Product/Security/Legal approval owns the numbers (§15).
--
-- AND ONE MORE, WHICH IS THE SCOPE. `user_id` is on the allowlist too, with §5's "workspace/user"
-- and §11.2's "Push token/session/active invitation revoke ทันที" as its clause: a push subscription
-- belongs to a DEVICE OF A PERSON, and §11.2's revocation is triggered by a MEMBER being removed
-- rather than by a workspace closing. Without the column that revocation has nothing to filter on.
--
-- §8 HAS NO ROW FOR A PUSH SUBSCRIPTION ANYWHERE IN ITS FOUR MATRICES. Not in §8.1, not in §8.2, not
-- in §8.3 — whose "Raw token/webhook SELECT | N N N N N S" is the connector inbox, batch 110's, and
-- not this — and not in §8.4, whose two notification rows are about the notification. So there is no
-- cell to implement and every operation on it is denied by default (030's reading of the same
-- silence), which lands in the same place §8.3's "Plain credential SELECT | N N N N N N" put 060:
-- NO ROLE HOLDS ANY PRIVILEGE ON IT. Not `authenticated`, not `anon`, not `app_worker`, not
-- `app_command`, not `app_maintenance`, not `app_authz`; and no role is granted USAGE on schema
-- `private`, which is the grant that would come first.
--
-- THE PRICE, PAID RATHER THAN HIDDEN, is 060's price: the CI negative control can have NO ENTRY for
-- this table, because disabling row level security on it restores no grant and nothing would fail —
-- an entry would report a pass it did not earn, which the control step's own first failure message
-- calls out by name. That absence is asserted in `tests/db/identity/identity-isolation.test.mjs` IN
-- BOTH DIRECTIONS: no entry while no migration grants a privilege on a `private` table, and an entry
-- REQUIRED the moment one does. The isolation cases carry the refusal instead, declaring the layer
-- and the object, so the day somebody grants USAGE on `private` the refusal moves from the schema to
-- the table and the cases fail.
--
-- WHAT NO CHECK CONSTRAINT CAN DO, said plainly rather than implied by its absence, and it is 060's
-- sentence with one addition. There is no constraint that distinguishes a vault handle from a push
-- endpoint, because both are opaque strings — and a push endpoint is WORSE than an API key for this
-- purpose, because an API key has recognisable vendor prefixes and an endpoint is just a URL. The
-- controls are the ones that do not depend on recognising a secret: the value columns DO NOT EXIST,
-- the apply-time block refuses any column outside the list, no role holds any privilege, and the
-- repository's secret scan runs over this batch's fixture. `fingerprint` is the one place a shape
-- helps and it is used the way 060 used it — a CEILING of sixteen characters, so a whole endpoint or
-- key cannot fit a column §9.2 describes as "last-four-like", which is the mirror of 010's 32-byte
-- FLOOR on `token_hash`.
--
--
-- ============================================================================================
-- THE `S` CELL, RFC-2026-022, AND WHY THERE IS STILL NO SERVICE POLICY
-- ============================================================================================
--
-- §8.4's "Notification insert/delivery state | N N N N N S" is this batch's `S` cell. Two statements
-- fall under it — the INSERT that creates an inbox row, and the UPDATE that records delivery — and
-- both are classified in `db/foundation/lint/service-policy-map.json` as **CARRIED**, which is
-- `RFC-2026-022` §3's own classification of this cell, in its own table, naming batch `051`:
--
--   | Notification insert/delivery state | `051` | CARRIED | recipient and workspace are inputs |
--
-- Applying §3's operational form rather than accepting the row: write the statement, then add
-- `and workspace_id = (select nullif(current_setting('app.workspace_id', true), '')::uuid)` to its
-- `WHERE` or `WITH CHECK`. "Insert a notification for THIS recipient in THIS workspace" is unchanged
-- by the addition — the server resolved both before forming the statement, because §8.4's `O` cell
-- means the row cannot be addressed at all without knowing whose it is. "Set the delivery state of
-- THIS notification" is likewise unchanged: the row is named by its id, and its workspace came back
-- with it from the claim that produced the send. Neither statement discovers a workspace by reading;
-- both carry one. CARRIED, twice, and the two rows in the map say so with their reasons.
--
-- **NO SERVICE POLICY IS WRITTEN, AND THAT IS THE DECISION BEING OBEYED RATHER THAN DEFERRED.**
-- `RFC-2026-022` is Approved 2026-09-08 and its own status line says NOT IN EFFECT until §7 holds:
-- measured on that date, the only member of `app_worker` is `postgres`, which bypasses RLS. A policy
-- `TO app_worker` on a table whose only reachable member bypasses row level security is a control
-- with no observable behaviour at all — not a denial, not a grant — and the map's own
-- `_not_in_effect` field says a batch classifies its cells there and writes no policy until §7
-- holds. So `app_worker` holds grants and no policy, which is 010's shape and 010's reason.
--
-- AND ONE SENTENCE THAT NO COMMENT, NOTE OR TEST IN THIS BATCH MAY CONTRADICT, because
-- `RFC-2026-022` makes it a condition of the decision: **the workspace GUC is CONTAINMENT against
-- defects in the service's own code, and NEVER tenant isolation of the service path.** The RFC
-- measured twice that the role a service policy names can set the setting that policy reads, and
-- that the catalog cannot be asked who may. Nothing below cites it as tenant isolation, no isolation
-- case does, and the static suite asserts the absence of that claim rather than trusting it.
--
-- WHAT THE GRANTS ARE FOR, given that nothing can use them: 010's answer through seven batches.
-- Without a grant a service refusal is `42501` either way and proves only that somebody forgot a
-- GRANT; with the grant and no policy, an empty read can only have come from row level security, and
-- a service role that had quietly acquired `BYPASSRLS` would SUCCEED where the suite demands a
-- refusal.
--
--
-- ============================================================================================
-- WHERE THE COLUMNS COME FROM, WHICH IS A CONTRACT — AND THE TWO PLACES IT IS SHORT OF AN INBOX
-- ============================================================================================
--
-- `contract-catalog/shared-kernel/ctr-ntf-001/` is **CTR-NTF-001 — Notification Command and
-- Result**, owner A5, status Draft, composing `CTR-TEN-001`. CONTRIBUTING_AGENTS.md's conflict order
-- puts the Contract Catalog at position 2 and this repository's data package at position 4, so where
-- §5's silence about columns and CTR-NTF-001's field list disagree about whether this batch may name
-- a column, the contract wins — which is exactly the reading batch 140 applied to CTR-AUD-001 and
-- 050 to CTR-JOB-001.
--
-- The contract's fields, and what each becomes:
--
--   kind              command | result. NOT A COLUMN — see the divergences below.
--   notification_id   string(1..). Becomes `id uuid`, for the reason 050 gives about `job_id`: §3.2
--                     requires a uuid of a domain aggregate, §4's ERD gives NOTIFICATION its own
--                     entity (`WORKSPACE ||--o{ NOTIFICATION : receives`), and a uuid's 36
--                     characters satisfy the contract's minimum of 1.
--   channel           in_app | email | line. text + a named CHECK (§3.2).
--   message_key       `^notification\.[a-z_.]+$`. The contract's own pattern.
--   locale            const th-TH. NOT A COLUMN — see below.
--   deep_link         { target_ref, requires_permission }. Flattened to two columns.
--   dedupe_key        string(1..). ID-005's key.
--   delivery          { state, failure_class }. Flattened to two columns.
--   tenant_context    CTR-TEN-001. Resolved to §3.3's canonical `workspace_id`.
--
-- FOUR DIVERGENCES, EACH DELIBERATE:
--
--   * NO `kind` COLUMN. `kind` distinguishes the two DOCUMENT SHAPES on the wire — a command that
--     asks for a notification and a result that reports its delivery. A stored inbox row is neither:
--     it is the notification, and it carries the delivery state a result reports. A column recording
--     which document shape a row arrived as would be storing the transport in the row.
--   * NO `locale` COLUMN. The contract makes it `enum: ["th-TH"]` — one value — and §3.2 fixes
--     `th-TH` globally as the default locale. 140's sentence, unchanged: "A constant is not a field."
--     The day a second locale is supported it is a contract change and a migration, together.
--   * `deep_link` IS TWO COLUMNS, `delivery` IS TWO COLUMNS. Same flattening 050 applied to
--     CTR-EVT-001's `producer`, `subject` and `metadata`, for the same reason: a nested object in a
--     document is a set of columns in a row, and §5 forbids a document column without a declared
--     JSON Schema version, maximum size, prohibited fields and owner.
--   * NO `retry` OR DEDUPE-WINDOW FIELD. The contract's freeze boundary says in terms that "The
--     retry policy, the dedupe WINDOW, the email and LINE adapter shapes, and the notification
--     preference model (MOD-100) are NOT inferred here", and §15 forbids an agent choosing what a
--     source of truth leaves open.
--
-- **AND TWO PLACES THE CONTRACT IS SHORT OF AN INBOX ROW, WHICH IS A FINDING RATHER THAN A LICENCE
-- TO INVENT.** CTR-NTF-001 models a channel-neutral COMMAND/RESULT PAIR — a message about a
-- notification — and not the row that sits in somebody's inbox. Two columns an inbox needs are
-- therefore absent from it, and each is taken from a document that DOES name it rather than from
-- this batch's judgement:
--
--   1. THE RECIPIENT. The contract has no recipient field at all. `CTR-TEN-001` carries an `actor`,
--      which is who ACTED and not who is being told. The recipient is named by three other
--      documents: §5 scopes this family "workspace/USER", §8.4 marks "OWN notification SELECT/mark
--      read" `O` — which is unsatisfiable by a row that does not know whose it is — and §10's
--      `NOTIFICATION-INBOX` says "USER notifications ... delete with USER/workspace". So `user_id` is
--      required by the schema and missing from the contract.
--   2. WHETHER IT HAS BEEN READ. §8.4 grants "mark read" to every client role and the contract has
--      no read field, because being read is a property of an INBOX and the contract models a
--      message. `read_at` is §8.4's column, spelled as a timestamp for 010's reason about an
--      invitation: a lifecycle nobody has enumerated is stored as the timestamps a document names
--      rather than as an invented status vocabulary.
--
-- Both are reported to CTR-NTF-001's owner in the work package's open blockers. A migration may not
-- amend a contract (050's rule, about CTR-JOB-001's unbounded fields), and this batch does not: it
-- records that the contract describes the message and not the store, and names the two fields the
-- store needs.
--
-- WHAT THE CONTRACT LEAVES UNBOUNDED, REPORTED AND NOT FIXED. `notification_id`, `message_key`,
-- `dedupe_key` and `deep_link.target_ref` all carry a `minLength` or a `pattern` and NO `maxLength`.
-- `CTR-EVT-001` bounded every one of its equivalents in RFC-2026-009 and `CTR-JOB-001` bounds
-- `input_ref`/`result_ref` at 256 with an `x-reference-rule` recording that reference-shaped fields
-- were found accepting 100000-character values. `deep_link.target_ref` is the sharpest of the four:
-- its `x-source` says the grammar was "adopted from CTR-IDM-001", and CTR-IDM-001's sibling in
-- CTR-JOB-001 is bounded while this one is not. **This batch adds no invented maximum** — a CHECK
-- enforcing a bound the contract does not state would make the database stricter than the wire and
-- reject notifications the schema accepts (050's rule) — and it is reported to A5 as CTR-NTF-001's
-- owner in the work package's open blockers.
--
-- THE ONE PLACE THIS BATCH IS STRICTER THAN THE CONTRACT'S CONDITIONALS, AND WHY IT IS NOT AN
-- INVENTION. `allOf[0]` requires `channel`, `message_key` and `deep_link` OF A COMMAND, and the
-- inbox row IS what a command produced, so all three are `not null` here. `requires_permission` is
-- `const: true` AND in `required`, and the contract's own `x-source` says why both: "a const never
-- fires on an ABSENT property: without the requirement the permission check failed open silently.
-- Independent testing found it." `not null` plus `check (deep_link_requires_permission)` is that
-- pair, expressed in SQL — the requirement and the const, neither alone.
--
-- AND THE PLACE THIS BATCH IS DELIBERATELY NOT TIDIER THAN THE CONTRACT. `allOf[2]` requires a
-- `failure_class` when the state is `failed`; `allOf[3]` forbids one when the state is `delivered`.
-- They are NOT a biconditional: `queued` and `suppressed_duplicate` are unconstrained by both, so a
-- queued row MAY carry a failure class as far as the contract is concerned. Batch 140 wrote
-- `(outcome = 'succeeded') = (error_code is null)` as ONE constraint because CTR-AUD-001's two rules
-- there really were one biconditional over two states. Here they are two rules over four states, and
-- writing the tidier form would forbid a document the contract admits. Two constraints, and the
-- shape of the pair is the assertion.
--
--
-- ============================================================================================
-- WHAT ELSE IS NOT HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO FIND
-- ============================================================================================
--
--   * NO `created_by` AND NO `updated_by`, ON ANY OF THE THREE TABLES. §3.2: "ทุก mutable row:
--     `created_at`, `updated_at`; USER MUTATION เพิ่ม `created_by`, `updated_by`". §8.4 marks the
--     notification INSERT `N` for every client role, so no user creates one — that is 050's reading
--     and it holds. The UPDATE half is the interesting one and it is where this batch parts company
--     with a mechanical application of the rule: a user DOES mutate a notification, by marking it
--     read, so §3.2 would appear to ask for `updated_by`. It is not added, because the only identity
--     any policy below admits to that UPDATE is the row's own recipient — `user_id` already fixes
--     who it was, and `updated_by` would be a SECOND SOURCE OF TRUTH FOR ONE FACT, which is 021's
--     reason for refusing `current_version_id`, 030's for refusing `industry_pack_id` and 040's for
--     refusing `kind`, in the same words for the fourth time. The consequence is stated rather than
--     absorbed: §8.6 case 8 (forged `created_by`) IS NOT APPLICABLE to this family, because there is
--     no such column and no client INSERT to forge it on.
--
--   * NO STATUS VOCABULARY ANYWHERE EXCEPT WHERE A CONTRACT WROTE ONE. `delivery_state` carries
--     CTR-NTF-001's four values because the contract enumerates them and its `x-source` declares
--     them; that is §3.2's "Phase 1 state: `text` + named `CHECK`" applied to a set a source of truth
--     fixed. `read_at` is a TIMESTAMP and not a `read`/`unread` enum, and the push subscription
--     carries no `status` column at all though §9.2 permits one — 060 refused the same permission
--     for the same reason ("permitting is not requiring", and no document enumerates the values), and
--     010 refused it first for an invitation.
--
--   * NO `audit reference` COLUMN ON THE PUSH SUBSCRIPTION, THOUGH §9.2 PERMITS ONE. 060's refusal,
--     and now it is weaker than 060's was: batch 140 has landed and `app.audit_logs` EXISTS. It is
--     still declined, for a different and better reason — 140's own header records that NOTHING CAN
--     WRITE AN AUDIT ROW TODAY, because §8.4's audit INSERT is the `S` cell RFC-2026-022 has just
--     classified and not yet put in effect. A foreign key or a uuid pointing at a table nothing can
--     write is a column that will be null for every row, and 020 refused a `social_account_id` whose
--     table did not exist for the same shape of reason. Owed to 141, which the registry gives the
--     audit consumers and hooks.
--
--   * NO LINK FROM A NOTIFICATION TO THE OUTBOX EVENT THAT PRODUCED IT. `dedupe_key` is ID-005's
--     key and `app.outbox_events.event_id` is CTR-EVT-001's identity, and they are not the same
--     thing: a dedupe key is a policy about what counts as the same notification and an event id is
--     an envelope's identity. A foreign key between them would fix an equality no document states,
--     and it would tie a row §10 keeps for 180 days (`NOTIFICATION-INBOX`) to one §10 purges at
--     "consumers ack + 30 วัน" (`OUTBOX-SHORT`) — the same 150-day mismatch 050 gave as its reason
--     for the consumer ledger carrying no foreign key to the outbox either. Stated because "no FK"
--     is the kind of absence a later reader adds without knowing what it buys.
--
--   * NO RETENTION WINDOW ENCODED, AND A CLASS-NAME GAP REPORTED FOR THE THIRD TIME. §5 assigns this
--     family `NOTIFICATION-*`. §10 defines `NOTIFICATION-INBOX` ("user notifications", 180 วัน,
--     "delete with user/workspace", purge) and `PUSH-SECRET` ("device push subscription", "active +
--     30 วัน inactive", "revoke immediately", "purge token/reference"). The first matches the glob;
--     **`PUSH-SECRET` DOES NOT** — it is the retention class of one of this batch's own tables and it
--     is not named by the inventory row that assigns this batch its retention. Batch 030 reported
--     that §5 names a `CATALOG` class §10 does not define, and 050 reported the same about `LEDGER`;
--     this is the mirror image — §10 defines a class §5's glob does not reach — and it is the third
--     time §5's retention column and §10's table have failed to line up. Reported to §10's owner in
--     the work package's open blockers and not resolved here: batch 160 owns the retention job and
--     §10's own Product/Security/Legal approval owns the numbers (§15). What this batch provides is
--     the COLUMN each sweep would read and an index over it, which is 010's treatment of `expires_at`
--     for `TOKEN-SHORT` and 050's of `consumed_at` for `CONSUMER-LEDGER`.
--
--   * NO PREFERENCE SURFACE BEYOND THE ONE AXIS A DOCUMENT NAMES. See the preference table's own
--     comment: CTR-NTF-001's freeze boundary reserves the preference MODEL to MOD-100, and the one
--     thing any source of truth fixes about a preference is that a notification has a CHANNEL and
--     that the contract enumerates three. Everything else — quiet hours, per-category opt-outs,
--     digest frequency — would be product decisions written into a schema.
--
--   * NO DELETE FOR ANY ROLE ON ANY OF THE THREE TABLES. §8.5 has no broad user delete; a
--     notification is purged by `NOTIFICATION-INBOX`, a push subscription by `PUSH-SECRET`, and both
--     sweeps are batch 160's through `app_maintenance`, which this batch grants nothing.


-- ---------------------------------------------------------------------------------------------
-- app.notifications — the inbox. One row per notification per recipient.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` (§3.3) AND the recipient `user_id`, which together are §5's
-- "workspace/user" — see the header for why the policy needs both terms and what each one, dropped,
-- would leak.
--
-- Sensitivity PII-2: §9.1 gives that class "email, display name, contact, ACTOR IDENTITY", and a
-- notification row names a person and tells them something. Retention `NOTIFICATION-INBOX`, whose
-- 180 days are not encoded (§15).
--
-- MUTABLE, in exactly two directions and by two different parties: the recipient sets `read_at`
-- (§8.4's `O`) and the service sets the delivery columns (§8.4's `S`). Both are column-scoped, so
-- neither party can perform the other's operation even though both hold an UPDATE grant on the
-- table.
create table if not exists app.notifications (
  id                             uuid primary key default gen_random_uuid(),
  workspace_id                   uuid        not null references app.workspaces (id),
  -- THE RECIPIENT. Absent from CTR-NTF-001 and required by §5, §8.4 and §10 — see the header. Not
  -- FK-constrained to app.user_profiles: §11.2 forbids cascade-deleting history when a member is
  -- removed and requires the actor and contact fields be anonymized in place, and 010 refuses to
  -- FK-bind a subject to auth.users for the same family of reason.
  user_id                        uuid        not null,
  channel                        text        not null,
  message_key                    text        not null,
  dedupe_key                     text        not null,
  deep_link_target_ref           text        not null,
  deep_link_requires_permission  boolean     not null,
  delivery_state                 text        not null default 'queued',
  delivery_failure_class         text,
  read_at                        timestamptz,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),

  -- CTR-NTF-001's three channels, as text + a named CHECK (§3.2); values change by migration only.
  -- The contract's own x-source records that `email` and `line` are a DECLARED INFERENCE from
  -- PT-007's "in-app first; email/LINE future" — listed so that adding one is a visible contract
  -- change rather than a silent widening. The same three constrain app.notification_preferences.
  constraint notifications_channel_known check (channel in ('in_app', 'email', 'line')),

  -- The contract's own pattern. A KEY and never prose: CTR-ERR-001 establishes a message key rather
  -- than free text for anything a person reads, and CTR-NTF-001 carries an
  -- `invalid-message-free-text` fixture for exactly this. No maximum, because the contract states
  -- none — see the header on what is reported rather than invented.
  constraint notifications_message_key_form check (message_key ~ '^notification\.[a-z_.]+$'),

  constraint notifications_dedupe_key_not_blank check (length(btrim(dedupe_key)) > 0),

  -- CTR-NTF-001's deep-link grammar, character for character from its `pattern`, whose x-source
  -- records it as "the catalog reference form adopted from CTR-IDM-001". A closed scheme list, no
  -- leading slash, no `..` segment, no public URL — which is what stops a notification carrying a
  -- link out of the product.
  constraint notifications_deep_link_target_ref_form check (
    deep_link_target_ref ~ '^(app|content|asset|job):[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$'),

  -- `const: true` AND `required`, as one NOT NULL column and one CHECK. The contract's x-source says
  -- why it is both: "a const never fires on an ABSENT property: without the requirement the
  -- permission check failed open silently. Independent testing found it."
  constraint notifications_deep_link_demands_a_permission_check check (deep_link_requires_permission),

  constraint notifications_delivery_state_known
    check (delivery_state in ('queued', 'delivered', 'failed', 'suppressed_duplicate')),
  constraint notifications_delivery_failure_class_known
    check (delivery_failure_class is null or delivery_failure_class in ('transient', 'permanent')),

  -- CTR-NTF-001 allOf[2]: CT-007 requires transient and permanent failure to be distinguishable, and
  -- "a failure stating neither is unusable to a retry policy".
  constraint notifications_failure_names_its_class
    check (delivery_state <> 'failed' or delivery_failure_class is not null),
  -- allOf[3], which independent testing of the contract added after finding `state: delivered` with
  -- `failure_class: permanent` accepted. TWO constraints and not one biconditional — see the header:
  -- `queued` and `suppressed_duplicate` are unconstrained by both rules, and the tidier form would
  -- make this database refuse a document the contract admits.
  constraint notifications_delivered_carries_no_failure_class
    check (delivery_state <> 'delivered' or delivery_failure_class is null),

  -- ID-005, AS A CONSTRAINT RATHER THAN AS A CONVENTION: "a completed or retried event must not
  -- notify a USER twice beyond policy". A dedupe key that is not unique deduplicates nothing.
  --
  -- THREE COLUMNS, AND THE CHOICE OF THE THIRD IS THIS BATCH'S AND IS STATED SO A REVIEWER CAN
  -- REFUSE IT. `workspace_id` is in the key because CTR-IDM-001 makes an idempotency key's scope
  -- include the workspace by contract and §11.1/9 states the principle — a retry that reached across
  -- scope would let one tenant's delivery suppress another's, and make a conflicting insert an
  -- oracle for another tenant's events (050's argument about the consumer ledger, unchanged).
  -- `user_id` is in it because ID-005's sentence names the USER.
  --
  -- `channel` IS DELIBERATELY NOT IN IT, and that is the half worth pressing on. Including it would
  -- let one dedupe_key notify a person once per channel — an in-app card AND an email AND a LINE
  -- message for one event — and email and LINE are EXTERNAL SIDE EFFECTS, which
  -- CONTRIBUTING_AGENTS.md makes stop-the-line when duplicated while a suppressed duplicate is not.
  -- The broader key is the safer direction, which is 050's reason for excluding `job_type` from
  -- app.jobs' dedupe key, and it matches ID-005's own wording. If a later decision wants per-channel
  -- fan-out, it is a change to this constraint in a migration a reviewer reads.
  constraint notifications_one_per_recipient_per_dedupe_key
    unique (workspace_id, user_id, dedupe_key)
);

comment on table app.notifications is
  'Owner: A5 Notification (notification.core, batch 051). Canonical scope workspace_id (§3.3) AND '
  'recipient user_id, which together are §5''s "workspace/user" — so its SELECT policy is a '
  'CONJUNCTION whose two terms leak differently if either is dropped, and the suite carries a case '
  'per term rather than one cross-tenant case for both (see the migration header). §8.4 marks the '
  'cell `O` for ALL FIVE built-in roles INCLUDING THE OWNER, which is what distinguishes this row '
  'from a membership row: §8.1 gives the owner and admin the member list and 011''s roster policy '
  'implements it, so the identity that succeeds there is refused here. Sensitivity PII-2; '
  'retention NOTIFICATION-INBOX, whose 180 '
  'days are not encoded (§15). Columns are CTR-NTF-001''s own properties with tenant_context resolved '
  'to workspace_id and the nested deep_link and delivery objects flattened, PLUS the two an inbox '
  'needs and a command/result contract does not carry: user_id (§5, §8.4''s `O`, §10) and read_at '
  '(§8.4''s "mark read"). §8.4''s two rows separate BY COLUMN here, where on app.jobs they were one '
  'table and two objects: the client holds a column-scoped SELECT excluding delivery_state, '
  'delivery_failure_class and dedupe_key, and a one-column UPDATE of read_at. The service holds '
  'grants and NO POLICY — §8.4''s `S` cell is classified CARRIED in '
  'db/foundation/lint/service-policy-map.json and RFC-2026-022 is approved and NOT IN EFFECT, so '
  'nothing can write a notification row today.';
comment on column app.notifications.id is
  'PII-2. CTR-NTF-001''s `notification_id`, as a uuid: the contract types it string(1..) and §3.2 '
  'requires a uuid for a domain aggregate, which §4''s ERD makes this by giving NOTIFICATION its own '
  'entity. A uuid''s 36 characters satisfy both.';
comment on column app.notifications.workspace_id is
  'PII-2 context. The canonical tenant scope (§3.3), and one of the two terms every policy on this '
  'table requires. It is read through app.is_active_member (011) and never by joining '
  'app.workspace_members from a policy (RFC-2026-020 §5/5). It is also what §11.4''s closure steps '
  'and batch 160''s NOTIFICATION-INBOX sweep address a workspace''s notifications by.';
comment on column app.notifications.user_id is
  'PII-2, and the column CTR-NTF-001 does not have. A command/result contract names who ACTED '
  '(CTR-TEN-001''s actor) and not who is being told; §5 scopes this family "workspace/user", §8.4 '
  'marks "Own notification SELECT/mark read" `O`, and §10''s NOTIFICATION-INBOX says "user '
  'notifications ... delete with user/workspace". Three documents require it and the contract is '
  'short of it, which is reported to A5 rather than treated as a licence to invent. §3.3 fixes no '
  'canonical field name for the user scope; `user_id` is the spelling batch 010 established in '
  'app.user_profiles and app.workspace_members. NOT FK-constrained: §11.2 forbids cascade-deleting '
  'history when a member is removed.';
comment on column app.notifications.channel is
  'PII-2. CTR-NTF-001''s three channels as text + a named CHECK (§3.2). The contract records email '
  'and line as a DECLARED INFERENCE from PT-007''s "in-app first; email/LINE future", listed so that '
  'adding one is a visible contract change; the same three constrain app.notification_preferences '
  'and the apply-time block requires the two constraint definitions to be identical.';
comment on column app.notifications.message_key is
  'PII-2. CTR-NTF-001''s pattern. A stable KEY and never prose, which is CTR-ERR-001''s precedent for '
  'anything a person reads and what stops a notification body being stored in this column. The '
  'contract states no maximum length, and this migration invents none (see the header).';
comment on column app.notifications.dedupe_key is
  'ID-005''s idempotency key, WITHHELD FROM THE CLIENT. §8.4 names it in neither of its two rows, and '
  'where a document is silent the cell is denied; a client that could read it could enumerate which '
  'events the system decided not to notify about twice. It is unique per (workspace_id, user_id) and '
  'deliberately NOT per channel — see the constraint''s own comment.';
comment on column app.notifications.deep_link_target_ref is
  'PII-2. CTR-NTF-001''s deep-link target, in the catalog reference grammar its x-source records as '
  'adopted from CTR-IDM-001: a closed scheme list, no leading slash, no `..` segment and no public '
  'URL. A REFERENCE and never a link out of the product.';
comment on column app.notifications.deep_link_requires_permission is
  'PII-2. CTR-NTF-001 makes it `const: true` AND `required`, and its x-source says why both: "a const '
  'never fires on an ABSENT property: without the requirement the permission check failed open '
  'silently. Independent testing found it." NOT NULL is the requirement and the CHECK is the const; '
  'either alone is the failure the contract records.';
comment on column app.notifications.delivery_state is
  'PII-2, and §8.4''s SECOND row — "Notification insert/delivery state | N N N N N S" — which is why '
  'this column and delivery_failure_class are absent from every client grant. CTR-NTF-001''s four '
  'values as text + a named CHECK (§3.2); the contract enumerates them and its x-source declares '
  'them, so this is a vocabulary a source of truth fixed rather than one a migration invented — '
  'unlike app.jobs, where CTR-JOB-001''s freeze boundary reserved the lifecycle names and batch 050 '
  'wrote no status column at all.';
comment on column app.notifications.delivery_failure_class is
  'PII-2. CTR-NTF-001''s transient/permanent, which CT-007 requires be distinguishable. Its two '
  'cross-field rules are TWO constraints and not one biconditional: `queued` and '
  '`suppressed_duplicate` are unconstrained by both, so the tidier form would refuse a document the '
  'contract admits.';
comment on column app.notifications.read_at is
  '§8.4''s "mark read", the one operation this table gives a client on the write side, and the second '
  'column CTR-NTF-001 does not carry — being read is a property of an INBOX and the contract models '
  'a message. A TIMESTAMP rather than a read/unread enum, which is 010''s refusal about an invitation '
  'lifecycle. It is the ONLY column in the client UPDATE grant, so a recipient can mark their own '
  'notification read and can change nothing else about it.';


-- ---------------------------------------------------------------------------------------------
-- app.notification_preferences — which channels a person accepts, in one workspace.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` (§3.3) and `user_id`, both in the PRIMARY KEY together with
-- `channel`. That composite is 010's shape for app.workspace_settings — "the canonical scope, which
-- is also the primary key and therefore the supporting index for its own foreign key" — extended by
-- the two columns a preference is actually addressed by. There is no surrogate id: §4's ERD names no
-- preference entity at all, so it states no cardinality, and a person holding two contradictory
-- preferences for one channel distinguished by no column is a state nothing could resolve.
--
-- THE SURFACE IS ONE AXIS, AND THAT IS THE WHOLE OF WHAT A DOCUMENT NAMES. CTR-NTF-001's freeze
-- boundary says in terms that "the notification preference MODEL (MOD-100) [is] NOT inferred here",
-- and §5 names the table without enumerating a single preference — the situation 010 met for
-- app.workspace_settings and answered the same way: "The two below are the ones §3.2 fixes by name
-- ... and nothing else is guessed."
--
-- What IS named is that a notification has a CHANNEL and that CTR-NTF-001 enumerates three of them,
-- with PT-007's "in-app first; email/LINE future" behind the enumeration. A preference over a channel
-- vocabulary a contract fixed is the one preference this batch can express without choosing anything:
-- one row per channel, one boolean. Quiet hours, per-category opt-outs and digest frequency are
-- product decisions and are MOD-100's; there is deliberately no jsonb blob, because §5 forbids a
-- document column without a declared JSON Schema version, maximum size, prohibited fields and owner,
-- and none of those exists for a preference.
--
-- `enabled boolean not null` IS THIS BATCH'S OWN READING and is stated so a reviewer can refuse it: no
-- document says a preference is a boolean. What every document does say is that a channel is a thing
-- a notification has and that email and LINE are future channels a product will let people decline.
-- The narrower alternative — a table with a key and no value — is not a preference.
--
-- §8 HAS NO ROW FOR A NOTIFICATION PREFERENCE, in any of its four matrices, in either direction. So
-- there is no cell to implement, every operation is denied by default (030's reading of the same
-- silence), and NO CLIENT ROLE HOLDS ANY PRIVILEGE HERE — which is a genuinely uncomfortable result,
-- because it means a person cannot read or set their own preference, and it is recorded as a finding
-- in the work package's open blockers rather than repaired by inventing a cell. §8.4 has a row for
-- "Own notification SELECT/mark read" and none for "own notification preference", and the fix is a
-- row in §8.4 written by that document's owner, not a grant written here. 010's sentence decides it:
-- "a grant issued ahead of the thing that needs it is a grant nobody reviews against a caller."
create table if not exists app.notification_preferences (
  workspace_id  uuid        not null references app.workspaces (id),
  user_id       uuid        not null,
  channel       text        not null,
  enabled       boolean     not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- The SAME three names as app.notifications.channel, and the apply-time block requires the two
  -- deparsed constraint definitions to be IDENTICAL — 060's device for a vocabulary with two homes,
  -- adopted because the failure it prevents is the same one: a preference for a channel the
  -- notification table cannot hold, or a notification on a channel nobody can decline.
  constraint notification_preferences_channel_known check (channel in ('in_app', 'email', 'line')),
  constraint notification_preferences_pk primary key (workspace_id, user_id, channel)
);

comment on table app.notification_preferences is
  'Owner: A5 Notification (notification.core, batch 051). Canonical scope workspace_id (§3.3) and '
  'user_id, both in the composite primary key with channel — 010''s app.workspace_settings shape '
  'extended by the columns a preference is addressed by, because §4''s ERD names no preference entity '
  'and states no cardinality. Sensitivity TENANT-1/PII-2 by §9.1''s "settings" and "actor identity" '
  'examples; §5 classes the family PII-2/SECRET-4, neither of which describes a channel switch, which '
  'is recorded in the header. Retention: §5 says NOTIFICATION-*, and §10 gives NOTIFICATION-INBOX to '
  'notifications and PUSH-SECRET to subscriptions — neither is about a preference, which is the third '
  'time §5''s retention column and §10''s table have failed to line up (030 reported CATALOG, 050 '
  'reported LEDGER). THE SURFACE IS ONE AXIS: CTR-NTF-001''s freeze boundary reserves the preference '
  'MODEL to MOD-100, and the only thing any source of truth fixes is the three-channel vocabulary. '
  'NO client role holds any privilege and NO policy is written: §8 has no row for a preference in any '
  'of its four matrices, so there is no cell to implement and every operation is denied by default.';
comment on column app.notification_preferences.user_id is
  'PII-2. WHOSE preference. §5 scopes this family "workspace/user" and the spelling is batch 010''s, '
  'because §3.3 fixes no canonical field name for the user scope (see 051''s header). Not '
  'FK-constrained, for the reason app.notifications.user_id is not.';
comment on column app.notification_preferences.channel is
  'CTR-NTF-001''s three channels, identical to app.notifications.channel by an assertion rather than '
  'by care: the apply-time block requires the two deparsed CHECK definitions to be byte-identical, so '
  'a preference cannot exist for a channel no notification can be sent on.';
comment on column app.notification_preferences.enabled is
  'Whether this person accepts this channel in this workspace. THIS COLUMN IS BATCH 051''s OWN '
  'READING and is stated so a reviewer can refuse it: no document says a preference is a boolean, and '
  'CTR-NTF-001''s freeze boundary reserves the preference model to MOD-100. What the documents do fix '
  'is the channel vocabulary and PT-007''s "in-app first; email/LINE future"; a per-channel switch is '
  'the only preference expressible over that without choosing anything else. Everything richer — '
  'quiet hours, categories, digests — is a product decision and is not written into this schema.';


-- ---------------------------------------------------------------------------------------------
-- private.ai_credential_references' sibling: a REFERENCE to a device push subscription.
-- private.push_subscription_references — never the endpoint, never the keys.
-- ---------------------------------------------------------------------------------------------
--
-- THE SCHEMA IS THE DECISION AND THE HEADER ARGUES IT AT LENGTH. §3.1 puts "secret references" in
-- `private` by name, with no direct grant, reachable by server or worker through a typed service
-- only; §14's G0 gate checklist requires that a secret table not be exposed; `app` is the exposed
-- schema. §9.1 lists "push token" as an example of `SECRET-4` — this is not a classification by
-- analogy — and gives that class "vault/encrypted secret store; never plaintext DB/log" with a client
-- projection of "never returned after write".
--
-- `scripts/db/run.mjs`'s schema lint matched `app.` alone until batch 060 created
-- `private.ai_credential_references` and widened it in the same change, so that a table in `private`
-- is held to the same owner-comment, primary-key, ENABLE and FORCE rules as one in `app` — otherwise
-- a `SECRET-4` table would have been exempt from all four by virtue of its prefix. This batch
-- INHERITS that widening rather than needing another, and a static test asserts that the rule still
-- reaches every table in `private` rather than a list of names a later batch falsifies.
--
-- THE COLUMN LIST IS §9.2's PLUS THREE, EACH WITH THE CLAUSE THAT PERMITS IT, AND THE APPLY-TIME
-- BLOCK HOLDS IT THERE COLUMN BY COLUMN:
--
--   credential_reference, provider, fingerprint, rotated_at, expires_at   §9.2, by name
--   revoked_at                                       §11.4 step 2 and §11.2, both by name
--   workspace_id                                     §3.3, tenant-owned row
--   user_id                                          §5's "workspace/user" and §11.2's per-MEMBER
--                                                    revocation, which has nothing to filter on
--                                                    without it
--   last_active_at                                   §10's PUSH-SECRET, "active + 30 วัน inactive" —
--                                                    the column that window is measured over
--   id, created_at, updated_at                       §3.2 / §12.3 conventions
--
-- Two of §9.2's permissions are declined, as 060 declined them: `status`, because §3.2 makes a Phase
-- 1 state `text` + a named CHECK whose values change only by migration and no document enumerates
-- them; and `audit reference`, because although batch 140 has now landed `app.audit_logs`, 140's own
-- header records that NOTHING CAN WRITE AN AUDIT ROW TODAY — a column pointing at a table nothing can
-- write is null for every row.
--
-- WHAT IS NOT A COLUMN, LISTED BY NAME BECAUSE THE LIST IS THE CONTROL: `endpoint`, `p256dh`,
-- `auth`, `auth_secret`, `keys`, `subscription`, `token`, `push_token`, and any ciphertext or wrapped
-- form of any of them. A Web Push endpoint is a bearer capability URL and the two keys are keys;
-- §9.2's prohibition covers all three, and the apply-time block is written as an ALLOWLIST so that
-- the one nobody thought of is refused too.
--
-- NO ROLE HOLDS ANY PRIVILEGE ON THIS TABLE, and no role is granted USAGE on schema `private`. §8 has
-- no row for a push subscription anywhere, so there is no cell; §9.1's client projection for
-- SECRET-4 is "never returned after write"; and the shape is 060's for its credential reference,
-- which RFC-2026-012's inventory describes as "no read by anyone, including service".
create table if not exists private.push_subscription_references (
  id                    uuid        primary key default gen_random_uuid(),
  -- §3.3, "ทุก tenant-owned row". A subscription is registered inside one Workspace and §11.4 step 2
  -- revokes push tokens as part of that Workspace's closure.
  workspace_id          uuid        not null references app.workspaces (id),
  -- §5's "workspace/user", and the column §11.2's revocation reads: "Remove/suspend membership:
  -- access ปิดใน transaction เดียว ... Push token/session/active invitation revoke ทันที". That
  -- revocation is triggered by a PERSON leaving, not by a workspace closing, so a table scoped only
  -- by workspace could not perform it.
  user_id               uuid        not null,
  provider              text        not null,
  -- §9.2's first permitted column, spelled the way §9.2 spells it. It is a LOCATOR in the vault or
  -- encrypted secret store §9.1 requires of a SECRET-4 value. The Web Push ENDPOINT and the p256dh
  -- and auth KEYS live there; this column points at them and holds none of them.
  credential_reference  text        not null,
  fingerprint           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  rotated_at            timestamptz,
  expires_at            timestamptz,
  revoked_at            timestamptz,
  -- §10's PUSH-SECRET: "active + 30 วัน inactive". The window is measured over this column and the
  -- NUMBER is not encoded — batch 160 owns the retention job and §10's own approval owns the numbers
  -- (§15). Same shape as 010's expires_at for TOKEN-SHORT and 050's consumed_at for CONSUMER-LEDGER:
  -- the column the sweep will read, and an index over it, created before the sweep exists.
  last_active_at        timestamptz,

  -- CONSTRAINED IN FORM AND NEVER IN VALUE, which is the opposite of what batch 060 could do and the
  -- reason is a decision that exists there and not here. DEC-014 fixes the AI provider set, so 060
  -- writes a five-name CHECK; NO DECISION IN THIS REPOSITORY NAMES A PUSH PROVIDER — not the decision
  -- register, not §5, not §10, not CTR-NTF-001, whose freeze boundary reserves "the email and LINE
  -- adapter shapes" and says nothing about a push transport. §15 forbids an agent choosing an open
  -- decision, so the vocabulary is not invented; what is constrained is the SHAPE, which is 060's own
  -- device for `model_key` under OPEN-004 and 030's for `pack_id`: a rule stated in a document and
  -- not in a constraint is a rule the database does not have.
  constraint push_subscription_references_provider_form
    check (provider ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),

  constraint push_subscription_references_reference_not_blank
    check (length(btrim(credential_reference)) > 0),

  -- The CEILING, and it matters more here than it did on 060's table. §9.2 calls this a
  -- "fingerprint/last-four-like identifier"; sixteen characters cannot hold a push endpoint, which is
  -- a URL, nor a p256dh key, which is 65 bytes base64url-encoded. It is the mirror of 010's 32-byte
  -- FLOOR on token_hash, which stopped a plaintext token fitting a digest column.
  constraint push_subscription_references_fingerprint_is_short
    check (fingerprint is null or (length(btrim(fingerprint)) between 1 and 16)),

  constraint push_subscription_references_expiry_after_creation
    check (expires_at is null or expires_at > created_at),

  -- A handle names one subscription. Deliberately NOT `unique (workspace_id, user_id)`: a person has
  -- as many push subscriptions as they have devices, and no document says how many. Inventing the
  -- cardinality would be the decision 021 declined to make about member scopes and 060 declined about
  -- credentials per provider.
  constraint push_subscription_references_reference_unique unique (credential_reference)
);

comment on table private.push_subscription_references is
  'Owner: A5 Notification (notification.core, batch 051). In `private` because §3.1 puts "secret '
  'references" there by name, with no direct grant, reachable by server or worker through a typed '
  'service only, and because §14''s gate checklist requires a secret table not be exposed. Canonical '
  'scope workspace_id (§3.3) and user_id (§5''s "workspace/user"). Sensitivity SECRET-4 — §9.1 lists '
  '"push token" as one of its four examples, so this is the class the document assigns and not one '
  'read by analogy — and retention PUSH-SECRET ("active + 30 วัน inactive; revoke immediately; purge '
  'token/reference"), whose numbers are not encoded (§15). IT HOLDS NO CREDENTIAL: a Web Push '
  'subscription is an ENDPOINT, which is a bearer capability URL, plus the p256dh and auth KEYS, and '
  'none of the three has a column here — §9.2 fixes the permitted column list exhaustively and this '
  'migration''s apply-time block refuses any column outside it, so a later batch adding `endpoint`, a '
  'key or a ciphertext fails the migration rather than the code review. NO ROLE HOLDS ANY PRIVILEGE '
  'HERE — client or service — and no role holds USAGE on `private`, which is the grant that would come '
  'first. §8 has no row for a push subscription in any of its four matrices, so there is no cell to '
  'implement; the shape is batch 060''s for private.ai_credential_references, adopted unamended so '
  'this schema has one secret-handling convention rather than two.';
comment on column private.push_subscription_references.workspace_id is
  'SECRET-4 context. The Workspace this subscription was registered in. §11.4 step 2 revokes push '
  'tokens during closure, which is one of the two revocations any document gives this row.';
comment on column private.push_subscription_references.user_id is
  'PII-2 in a SECRET-4 table, and the column §11.2''s revocation reads: "Remove/suspend membership: '
  'access ปิดใน transaction เดียว ... Push token/session/active invitation revoke ทันที". That '
  'revocation is triggered by a PERSON, so a row scoped only by workspace could not be found by it. '
  'It is on the §9.2 allowlist with §5''s "workspace/user" and §11.2 as its clause, not smuggled in.';
comment on column private.push_subscription_references.provider is
  'SECRET-4 context. The push transport. Constrained in FORM and never in VALUE, which is the reverse '
  'of private.ai_credential_references.provider: DEC-014 fixes the AI provider set and NO DECISION IN '
  'THIS REPOSITORY NAMES A PUSH PROVIDER, so §15 forbids this batch enumerating one.';
comment on column private.push_subscription_references.credential_reference is
  'SECRET-4. A LOCATOR in the vault or encrypted secret store §9.1 requires — never the endpoint, '
  'never the keys, never a ciphertext of either. §9.2 names this column and permits it; §9.2''s '
  'absolute prohibitions forbid the values it points at ever appearing in this database, a log, an '
  'event, a job payload or a fixture. No CHECK can tell a handle from a push endpoint — both are '
  'opaque strings, and an endpoint is an ordinary https URL that no secret scanner can recognise — so '
  'the control is that the endpoint has no column to be in and no role can read this one.';
comment on column private.push_subscription_references.fingerprint is
  'SECRET-4, and the one column here with a shape control. §9.2 permits a "fingerprint/last-four-like '
  'identifier"; the CHECK caps it at sixteen characters, which cannot hold a push endpoint (a URL) or '
  'a p256dh key (65 bytes, base64url). It is 060''s ceiling and the mirror of 010''s 32-byte floor on '
  'token_hash.';
comment on column private.push_subscription_references.rotated_at is
  'SECRET-4. §9.2 names "created/rotated/expired timestamps"; this is the second. A browser reissues '
  'a subscription when its endpoint changes, which is the rotation this records. No role holds UPDATE '
  'on this table, so nothing can set it through a granted path today.';
comment on column private.push_subscription_references.expires_at is
  'SECRET-4. §9.2''s third timestamp. Spelled expires_at rather than expired_at for 010''s reason: it '
  'is a deadline, and app.workspace_invitations already spells the same idea that way.';
comment on column private.push_subscription_references.revoked_at is
  'SECRET-4. Named by §11.4 step 2 ("Revoke browser sessions, PUSH TOKENS, invitations, API/connector '
  'credentials") and again by §11.2 ("Push token/session/active invitation revoke ทันที") — the only '
  'column in this batch two separate clauses name in terms. There is no status column: §9.2 permits '
  'one and its values are unwritten, so the lifecycle is timestamps (010''s refusal, unchanged).';
comment on column private.push_subscription_references.last_active_at is
  'SECRET-4. §10''s PUSH-SECRET retains a subscription for "active + 30 วัน inactive", and inactivity '
  'is measured from a column. This is that column and the index below is what batch 160''s sweep '
  'would read; the NUMBER is not encoded, because §10''s own Product/Security/Legal approval owns it '
  '(§15). Same shape as 010''s expires_at for TOKEN-SHORT and 050''s consumed_at for CONSUMER-LEDGER: '
  'the column exists before the sweep does.';


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- Already covered by a constraint's own index, and therefore NOT repeated below:
--
--   app.notifications (workspace_id, user_id, dedupe_key)
--                                      — notifications_one_per_recipient_per_dedupe_key, which leads
--                                        with workspace_id and so supports the foreign key to
--                                        app.workspaces.
--   app.notification_preferences (workspace_id, user_id, channel)
--                                      — the composite primary key, which leads with workspace_id and
--                                        so supports its own foreign key too.
--   private.push_subscription_references (credential_reference)
--                                      — the unique constraint, and the lookup a rotation makes.
--   the two `id` primary keys.

-- ONE INDEX DOING THREE JOBS, and each is named so a later reader does not drop it for one of them.
-- It is the FK support for app.notifications.workspace_id; it is the RLS-predicate index for the
-- CONJUNCTION both policies below evaluate — `user_id = auth.uid() and app.is_active_member(
-- workspace_id)`, which reads two columns of the row rather than one; and it is §3.3's
-- keyset cursor for the one list in this batch that grows continuously, an inbox, ordered
-- "(created_at desc, id desc)" as §3.3's own example spells it.
create index if not exists notifications_recipient_keyset_idx
  on app.notifications (workspace_id, user_id, created_at desc, id desc);

-- §10's NOTIFICATION-INBOX is 180 days, purged. The index above leads with workspace_id and so cannot
-- serve an age sweep across tenants; this one can. 050 created consumer_ledger_window_idx for exactly
-- this and 010 created workspace_invitations_expires_at_idx before the job that reads it existed.
create index if not exists notifications_inbox_window_idx
  on app.notifications (created_at);

-- The foreign key from private.push_subscription_references into app.workspaces, and the pair §11.2's
-- per-MEMBER revocation filters on: "Remove/suspend membership ... Push token ... revoke ทันที" is a
-- query about one person in one workspace.
create index if not exists push_subscription_references_workspace_user_idx
  on private.push_subscription_references (workspace_id, user_id);

-- §10's PUSH-SECRET window, "active + 30 วัน inactive". The column batch 160's sweep reads.
create index if not exists push_subscription_references_inactive_idx
  on private.push_subscription_references (last_active_at);

-- NO KEYSET INDEX ON app.notification_preferences OR ON private.push_subscription_references. §3.3
-- asks for "(created_at desc, id desc)" on "List ที่โตต่อเนื่อง" — a list that grows continuously. A
-- person holds AT MOST THREE preference rows in a workspace, because the primary key's third column
-- is constrained to CTR-NTF-001's three channels, and a bounded set is not a list that grows; and a
-- subscription list grows with a person's devices rather than with tenant activity. An index nobody
-- paginates is an index nobody maintains (060's sentence).


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every MUTABLE row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
--
-- All three rows are mutable and each is mutable by a different party, which is worth stating because
-- WHICH TRIGGERS ARE INERT differs per table and the wrong sentence about that has already shipped
-- once in this repository — batch 060 wrote "no role holds UPDATE" where 050 had correctly written
-- "no role holds UPDATE THROUGH A POLICY", and independent review across four parallel branches found
-- the comment contradicting the grant. So, precisely:
--
--   app.notifications              REACHABLE AND REFUSED for the service (app_worker holds a
--                                  column-scoped UPDATE of the delivery columns and no policy, so RLS
--                                  refuses it), and REACHABLE AND ADMITTED for the recipient
--                                  (`notifications_update_own_read_state` admits the row). It is the
--                                  ONE trigger in this batch that fires today.
--   app.notification_preferences   REACHABLE AND REFUSED. No client role holds anything; app_worker
--                                  holds SELECT and no UPDATE, so nothing can fire it through a
--                                  granted path.
--   private.push_subscription_...  UNREACHABLE. No role holds any privilege on the table at all.
--
-- All three are here because §3.2 requires updated_at of a MUTABLE row and all three rows are mutable
-- by design; omitting the column would be declaring the row IMMUTABLE, which §3.2 says of versions,
-- evidence, decisions, usage, audit and publish history and does not say of any of these (021's and
-- 060's sentence, unchanged).
drop trigger if exists set_updated_at on app.notifications;
create trigger set_updated_at before update on app.notifications
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.notification_preferences;
create trigger set_updated_at before update on app.notification_preferences
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on private.push_subscription_references;
create trigger set_updated_at before update on private.push_subscription_references
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on every table, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
--
-- ENABLE and FORCE are different catalog columns — `relrowsecurity` and `relforcerowsecurity` — and
-- the data package's own lint rule tests only the first, so ENABLE without FORCE passes it clean
-- while the table owner stays exempt from every policy below (010's finding, RFC-2026-016 §4's rule).
--
-- On app.notifications the two policies do the work and FORCE closes the owner's exemption. On
-- app.notification_preferences there is no policy, so ENABLE plus FORCE is the WHOLE control: it is
-- what makes every non-bypassing role — including the one role holding a grant — read zero rows.
--
-- On private.push_subscription_references it is defence in depth and is worth naming as such, in
-- 060's words about its sibling: no role holds a privilege, so the privilege system refuses
-- everything before RLS is consulted, and these two statements are what still refuses on the day
-- somebody grants USAGE on `private` without reading this file.
--
-- AND WHAT FORCE DOES NOT BUY, because batch 140 established that saying only the first half is the
-- overclaim: `postgres` owns every table in `app` and holds BYPASSRLS (RFC-2026-021 §2/M2, pinned in
-- scripts/db/run.mjs's KNOWN_BYPASS), and BYPASSRLS beats FORCE. None of these three tables is
-- append-only, so this batch writes no refusal trigger and makes no claim against that role.
alter table app.notifications enable row level security;
alter table app.notifications force row level security;

alter table app.notification_preferences enable row level security;
alter table app.notification_preferences force row level security;

alter table private.push_subscription_references enable row level security;
alter table private.push_subscription_references force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges. Deny-by-default needs a grant before RLS is even reached.
-- ---------------------------------------------------------------------------------------------
--
-- §6 invariant 8 puts migration, constraints, indexes, RLS AND grants in one change set.
--
-- `anon` IS GRANTED NOTHING, which since 2026-09-06 is an approved decision rather than an inherited
-- convention: RFC-2026-021 §7/4 decides it in terms and gives the structural reason — the first
-- `anon` grant is not one grant, it is `grant usage on schema app`, and it changes the DENIAL LAYER
-- of every object in `app` at once. Every anonymous case in this batch declares
-- `deniedOn: { kind: 'schema', name: 'app' }` or `{ kind: 'schema', name: 'private' }` for that
-- reason.
grant usage on schema app to authenticated;
grant usage on schema app to app_worker;

-- §8.4's FIRST ROW, IMPLEMENTED AS A COLUMN LIST. "Own notification SELECT/mark read | O O O O O | P".
-- The three columns NOT in this grant are the SECOND row — `delivery_state` and
-- `delivery_failure_class`, marked `N` for every client role — and `dedupe_key`, which §8.4 names in
-- neither row and which the header explains at length. RFC-2026-021 §8.4 makes a table-wide grant a
-- finding "even when it covers exactly the same columns today", so this is written as columns rather
-- than as `grant select on`.
--
-- IT IS A NEW ENTRY ON RFC-2026-021 §8.5's CLOSED LIST, recorded here rather than absorbed. That list
-- names 010's, 020's and 021's inherited base-table grants, says "any new one fails", and does not
-- yet exist — closing it is a forward fix owed to batch 170. 040 grew it and called the growth a
-- debt; 130 grew it and recorded itself as the sixth entry. This is the seventh, and the argument for
-- spending the debt is in the header: §8.4 marks this cell `O` for all five built-in roles, with no
-- `P`, no capability set to resolve and no projection language attached.
grant select (id, workspace_id, user_id, channel, message_key, deep_link_target_ref,
              deep_link_requires_permission, read_at, created_at, updated_at)
  on app.notifications to authenticated;

-- "mark read", as ONE COLUMN. The eighth entry on the same list. A recipient can record that they
-- have read their own notification and can change nothing else about it — not its channel, not its
-- message key, not its deep link, not its delivery state, and not `workspace_id` or `user_id`, whose
-- absence is what makes §8.5's "ห้ามย้าย row ข้าม tenant/scope ด้วย update" hold by the privilege
-- system rather than only by a WITH CHECK a later edit could weaken.
grant update (read_at) on app.notifications to authenticated;

-- No client INSERT and no client DELETE on any table in this batch. §8.4's second row marks the
-- notification INSERT `N` for every client role; §8.5 has no broad user delete, and hard deletion is
-- a retention job (NOTIFICATION-INBOX, PUSH-SECRET), which batch 160 owns through app_maintenance.

-- `app_worker` HOLDS GRANTS AND NO POLICY, for the reason 010, 020, 021, 030, 040, 050, 060 and 140
-- all record: without a grant a service refusal is 42501 either way and proves only that somebody
-- forgot a GRANT; with the grant and no policy, an empty read can only have come from row level
-- security, and a service role that had quietly acquired BYPASSRLS would SUCCEED where the suite
-- demands a refusal.
--
-- The verbs follow §8.4's `S` and the family's own shape, column-scoped where a column is withheld:
--
--   app.notifications              select, insert, and UPDATE ON THE TWO DELIVERY COLUMNS. `read_at`
--                                  is NOT in the service UPDATE grant: marking a notification read is
--                                  the recipient's act (§8.4's `O`), and §8.4's service cell on that
--                                  row is `P` — a capability no document defines, which is the
--                                  refusal 011, 020, 021 and 030 each recorded and RFC-2026-020 §8
--                                  ratified. `id`, `workspace_id`, `user_id` and `dedupe_key` are
--                                  absent too, so no notification can be re-identified, moved between
--                                  tenants, re-addressed to a different person, or have its dedupe
--                                  key edited after the row exists.
--   app.notification_preferences   select ONLY. §8 has no row for a preference, so a verb issued here
--                                  is a verb nobody reviews against a caller (060's sentence about
--                                  app.ai_models). What the service plausibly does with a preference
--                                  is READ it before sending; nothing in any document says it writes
--                                  one. The consequence for the CI negative control — that this
--                                  table's entry rests on ONE case — is stated in the workflow beside
--                                  the entry rather than left to be counted.
grant select (id, workspace_id, user_id, channel, message_key, dedupe_key, deep_link_target_ref,
              deep_link_requires_permission, delivery_state, delivery_failure_class, read_at,
              created_at, updated_at)
  on app.notifications to app_worker;
grant insert (workspace_id, user_id, channel, message_key, dedupe_key, deep_link_target_ref,
              deep_link_requires_permission, delivery_state)
  on app.notifications to app_worker;
grant update (delivery_state, delivery_failure_class) on app.notifications to app_worker;

grant select (workspace_id, user_id, channel, enabled, created_at, updated_at)
  on app.notification_preferences to app_worker;

-- private.push_subscription_references IS GRANTED TO NOBODY. Not `authenticated`, not `anon`, not
-- `app_worker`, not `app_command`, not `app_maintenance`, not `app_authz`. And no role is granted
-- USAGE on schema `private` either, which is the grant that would come first.
--
-- THAT IS A DELIBERATE DEPARTURE FROM THE app_worker SHAPE ABOVE, AND IT COSTS SOMETHING THIS FILE
-- PAYS RATHER THAN HIDES — 060's sentence about its sibling, and the same price. Everywhere else in
-- this schema the service holds a grant precisely so a denial is attributable to RLS. Here it holds
-- none, so every refusal on this table is a privilege-layer refusal ON THE SCHEMA, for every identity
-- alike, which is what §9.1's "never returned after write" asks for in the client column and what
-- §3.1's "ไม่มี direct grant" asks for in the access column. The CI negative control can therefore
-- have NO ENTRY for this table: disabling row level security on it restores no grant, so nothing
-- would fail and the entry would report a pass it did not earn. That absence is asserted in
-- tests/db/identity/identity-isolation.test.mjs IN BOTH DIRECTIONS — no entry while no migration
-- grants a privilege on a `private` table, and an entry REQUIRED the moment one does.

-- `app_command` and `app_maintenance` are granted nothing by this batch. There is no specified
-- command surface for notification.core — RFC-2026-021 §10 records that no command function exists
-- anywhere — and the retention path is batch 160.


-- ---------------------------------------------------------------------------------------------
-- Policies. TWO, both TO authenticated, both on app.notifications, and none anywhere else.
-- ---------------------------------------------------------------------------------------------
--
-- §8.5's mandatory patterns are followed literally: `TO authenticated`; SELECT predicated on active
-- membership and the row's own scope; UPDATE carrying BOTH `USING` and `WITH CHECK`; no DELETE
-- policy anywhere; membership read through 011's helper and never by joining app.workspace_members.
--
-- `USING` AND `WITH CHECK` ARE TWO CATALOG COLUMNS and the static suite asserts them separately, for
-- the reason 040 raised: a gutted `USING` filters nothing on read while still refusing writes, so a
-- test that reads the policy as one blob passes on a database where half of it is missing.
--
-- NO SERVICE POLICY. §8.4's `S` cell is classified CARRIED in
-- db/foundation/lint/service-policy-map.json, RFC-2026-022 is approved and NOT IN EFFECT — measured
-- 2026-09-08, the only member of app_worker is `postgres`, which bypasses RLS — and the map's own
-- `_not_in_effect` field says a batch classifies its cells there and writes no policy until §7 holds.
--
-- NO POLICY ON app.notification_preferences AND NONE ON private.push_subscription_references. §8 has
-- no row for either object in any of its four matrices, so there is no cell to implement and every
-- operation is denied by default. Both are ENABLE + FORCE with an EMPTY POLICY SET, which denies
-- every non-bypassing role including the one holding a grant; batch 030 established that a forced
-- table's empty policy set must be a decision written in the file rather than an omission a reader
-- infers, and this paragraph is that decision.
--
-- NO RESTRICTIVE NARROWING, and 140's reason applies with one addition. A RESTRICTIVE policy is how a
-- permissive set is SUBTRACTED FROM, because permissive policies OR together and cannot narrow each
-- other. On app.notification_preferences and private.push_subscription_references the permissive set
-- is empty and a restrictive policy ANDed with nothing can only refuse what is already refused. On
-- app.notifications there are two permissive policies and they are for DIFFERENT COMMANDS — one
-- `for select`, one `for update` — so they never OR together at all: a SELECT is evaluated against
-- the SELECT policy alone. The narrowing this family would need a restrictive policy for is member
-- scope, and 021's three scope types (`all_businesses`, `business`, `page`) each name a Business or a
-- Page while a notification is addressed by its Workspace and its recipient — so there is nothing to
-- narrow, and none of 021's helpers is called below.

-- §8.4 "Own notification SELECT/mark read" = `O` for owner, admin, editor, approver and viewer alike,
-- so the predicate tests the RECIPIENT and not the role. The membership term is not decoration and it
-- is not implied by the first: §8.5 requires "active membership + capability + Workspace/Business/Page
-- scope" of a SELECT, §3.3 makes a notification a tenant-owned row, and §12.6/5 requires a suspended
-- member to see zero TENANT rows — which is a claim about THIS table and not about 010's user profile,
-- whose own header records that a profile is deliberately outside that sentence.
--
-- `(select auth.uid())` in the subquery form, evaluated once per statement rather than once per row,
-- which is 010's device and the shape §8.5 spells.
drop policy if exists notifications_select_own on app.notifications;
create policy notifications_select_own on app.notifications
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and app.is_active_member(workspace_id)
  );

-- "mark read", the second half of the same cell. USING and WITH CHECK are both present, as §8.5
-- requires of every update policy, and both carry the SAME conjunction — so a recipient cannot use
-- an UPDATE to move a row out of their own reach any more than into it. The column grant above is
-- what confines the statement to `read_at`; this policy is what confines it to the recipient's own
-- row in a workspace they are still an active member of.
drop policy if exists notifications_update_own_read_state on app.notifications;
create policy notifications_update_own_read_state on app.notifications
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and app.is_active_member(workspace_id)
  )
  with check (
    user_id = (select auth.uid())
    and app.is_active_member(workspace_id)
  );

-- No INSERT policy for any client role: §8.4's second row marks the notification insert `N` for every
-- one of them, and a client that could write its own inbox row could manufacture a deep link and a
-- message key the product will render.
-- No DELETE policy on any table in this batch: §8.5 has no broad user delete, and hard deletion is a
-- retention job with its own class and its own batch.


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004, 011, 020, 021, 030, 040, 050, 060 and 140 use: a claim that is only a
-- comment is a claim nobody checks. These are the properties of THIS batch answerable from the
-- catalog of the database being migrated, without a committed snapshot and without a test harness.
-- The text half lives in tests/db/identity/identity-isolation.test.mjs and the live behavioural half
-- is `make db-rls-smoke`.
--
-- WHAT IS DELIBERATELY NOT ASSERTED HERE, following 030's rule and 021's scar. 011's apply-time block
-- raises when app_authz holds a number of policies other than one, and 021 had to route around an
-- APPLIED migration's self-assertion rather than make it false. So nothing below asserts a property
-- an approved decision is EXPECTED to change:
--
--   * NOT "no client role holds a privilege on app.notification_preferences". That absence is §8's
--     silence, and §8 is a document with an owner who can add a row to it.
--   * NOT "these tables carry no service policy", and NOT "no policy names app_worker".
--     RFC-2026-022 positively EXPECTS a `TO app_worker` policy on app.notifications once §7 holds —
--     the cell is classified CARRIED — and an apply-time assertion against an approved decision's own
--     direction is exactly the trap 011 set for 021.
--
-- Both are asserted in the static suite instead, where the batch that lands either decision edits a
-- line a reviewer reads. What IS asserted here is the set of properties no approved decision is
-- expected to move: the §9.2 column allowlist on the SECRET-4 table, the channel vocabulary's two
-- homes, the client column grants against the live ACL, the absence of DELETE, ENABLE/FORCE, anon,
-- app_authz and the ownership rules.
--
-- `pg_roles` and never `pg_authid`, for the reason batch 020 recorded: pg_authid is readable only by
-- a superuser, and a migration that needs one to apply is a migration that cannot be applied on the
-- platform it targets, where `postgres` is not a superuser.
do $$
declare
  offending text;
  count_of  integer;
begin
  -- ENABLE and FORCE on all three. The two are different catalog columns and the data package's own
  -- lint rule reads only the first (RFC-2026-016 §4). On the two tables with no policy this is the
  -- whole of what refuses the owner and the one role holding a grant.
  select string_agg(format('%s.%s', n.nspname, c.relname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('notifications', 'notification_preferences'))
          or (n.nspname = 'private' and c.relname = 'push_subscription_references'))
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'app.notification_preferences and private.push_subscription_references carry no '
                   'policy at all, so FORCE is the only thing that refuses the table owner. Without '
                   'it the isolation suite cannot tell a working schema from one where every row is '
                   'readable by whoever owns the table.';
  end if;

  -- THE ASSERTION THIS BATCH OWES MOST, and it is the SECRET-4 one. §9.2 is an ABSOLUTE PROHIBITION
  -- and it fixes the permitted column list of a secret table exhaustively. Everything else in this
  -- file argues that a push subscription cannot be READ; this is what stops one being STORED.
  --
  -- The permitted set, with the clause that permits each:
  --   credential_reference, provider, fingerprint, rotated_at, expires_at   §9.2, by name
  --   revoked_at                                        §11.4 step 2 and §11.2, both by name
  --   workspace_id                                      §3.3, tenant-owned row
  --   user_id                                           §5's "workspace/user", §11.2's per-member
  --                                                     revocation
  --   last_active_at                                    §10's PUSH-SECRET, "active + 30 วัน inactive"
  --   id, created_at, updated_at                        §3.2 / §12.3 conventions
  --
  -- A later batch adding `endpoint`, `p256dh`, `auth`, `auth_secret`, `keys`, `subscription`,
  -- `token`, `push_token` or a ciphertext of any of them fails the migration rather than the code
  -- review. That is the difference between a prohibition and a control, and it is why the check is
  -- written as an ALLOWLIST rather than as a list of forbidden names: a denylist of column names
  -- somebody thought of is defeated by the one they did not — and on this table the one they did not
  -- think of is `endpoint`, which is a bearer capability that looks exactly like an ordinary URL.
  select string_agg(a.attname, ', ' order by a.attnum) into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'private' and c.relname = 'push_subscription_references'
     and a.attnum > 0 and not a.attisdropped
     -- `attname` is `name` and the list is `text[]`. The cast is written out rather than left to
     -- operator resolution, because a comparison that depends on an implicit cast is a comparison
     -- that changes meaning when somebody adds an operator, and a NEVER rule that silently starts
     -- matching nothing is the failure mode this whole block exists to avoid (060's note).
     and a.attname::text <> all (array['id', 'workspace_id', 'user_id', 'provider',
                                       'credential_reference', 'fingerprint', 'created_at',
                                       'updated_at', 'rotated_at', 'expires_at', 'revoked_at',
                                       'last_active_at']);
  if offending is not null then
    raise exception 'private.push_subscription_references carries column(s) §9.2 does not permit: %', offending
      using hint = '§9.2: "Secret table เก็บได้เพียง credential_reference, provider, fingerprint/'
                   'last-four-like identifier, status, created/rotated/expired timestamps และ audit '
                   'reference". §9.1 lists "push token" as an example of SECRET-4 and gives that class '
                   '"vault/encrypted secret store; never plaintext DB/log". A Web Push endpoint is a '
                   'bearer capability URL and p256dh/auth are keys; a column outside the permitted '
                   'list plus §3.2/§3.3/§5/§10''s conventions is either one of those three, a '
                   'ciphertext of one, or a field nobody classified. All three are stop-the-line '
                   'under CONTRIBUTING_AGENTS.md.';
  end if;

  -- And the column that must be there, because an allowlist alone is satisfied by a table with no
  -- columns at all (060's note). §9.2 permits a reference; the whole design is that the reference is
  -- what the database holds INSTEAD of the endpoint and the keys, so its absence would not be a
  -- narrower schema — it would be a table that has stopped being the thing that keeps them out.
  select count(*) into count_of
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'private' and c.relname = 'push_subscription_references'
     and a.attnum > 0 and not a.attisdropped
     and a.attname = 'credential_reference';
  if count_of <> 1 then
    raise exception 'private.push_subscription_references has no credential_reference column';
  end if;

  -- The channel vocabulary has two homes and they may not drift. Both constraints name a column
  -- called `channel` and neither deparsed definition mentions its table, so a correct pair is
  -- BYTE-IDENTICAL — which makes this the dullest form of the assertion, and dull is the property
  -- batch 040 learned to want here: this block runs on every apply, and a clever query that fails to
  -- PARSE fails the migration rather than the rule it was checking.
  --
  -- What drift would produce: a preference row for a channel no notification can be sent on, or a
  -- notification on a channel nobody can decline. The second is the one that matters — a channel
  -- absent from the preference vocabulary is a channel with no opt-out, and email and LINE are
  -- external side effects.
  select string_agg(distinct pg_catalog.pg_get_constraintdef(t.oid), ' <> ') into offending
    from pg_catalog.pg_constraint t
   where t.conname in ('notifications_channel_known', 'notification_preferences_channel_known');
  if offending is null or position(' <> ' in offending) > 0 then
    raise exception 'the channel vocabulary differs between its two homes: %',
      coalesce(offending, '<one of the two constraints is missing>')
      using hint = 'CTR-NTF-001 fixes the three channels and §3.2 says the values change by migration '
                   'only. Two CHECKs holding different lists is one of them having been changed '
                   'without the other, which is how a notification gets sent on a channel the '
                   'preference table cannot decline.';
  end if;

  -- The two constraints exist AND there are exactly two of them, because `string_agg(distinct ...)`
  -- over a single row is also what a database with one of them looks like (060's note).
  select count(*) into count_of
    from pg_catalog.pg_constraint t
   where t.conname in ('notifications_channel_known', 'notification_preferences_channel_known');
  if count_of <> 2 then
    raise exception 'batch 051 expects two channel CHECK constraints and the catalog holds %', count_of;
  end if;

  -- §8.4's TWO ROWS AS A COLUMN LIST, AGAINST THE LIVE ACL RATHER THAN AGAINST THE GRANT TEXT ABOVE.
  -- This is the assertion the client half of this batch owes: "Notification insert/delivery state" is
  -- `N` for every client role, and the way this batch implements that is by leaving three columns out
  -- of a grant. A grant made by a LATER batch would not appear in this file at all, so the check
  -- reads the catalog.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['delivery_state', 'delivery_failure_class', 'dedupe_key']) as col
       where n.nspname = 'app'
         and c.relname = 'notifications'
         and r.rolname in ('authenticated', 'anon')
         and (pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'SELECT')
              or pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'INSERT')
              or pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE'))
    ) as held;
  if offending is not null then
    raise exception 'a client role reaches a column §8.4 marks N: %', offending
      using hint = '§8.4 row 2 — "Notification insert/delivery state | N N N N N S" — is implemented '
                   'here as the absence of delivery_state and delivery_failure_class from every client '
                   'grant, and dedupe_key is withheld because §8.4 names it in neither row and a '
                   'client holding it could enumerate which events were deduplicated. A table-wide '
                   'grant would hand a client all three, which RFC-2026-021 §8.4 makes a finding even '
                   'when it covers the same columns today.';
  end if;

  -- §8.5, per column, against the live ACL: a notification may not be re-identified, moved between
  -- tenants, re-addressed to a different person, or have its dedupe key changed after the row exists.
  -- The service UPDATE grant names two columns and the client UPDATE grant names one; this is what
  -- says so about the four they withhold.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'user_id', 'dedupe_key']) as col
       where n.nspname = 'app'
         and c.relname = 'notifications'
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity, scope or dedupe column of app.notifications is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant OR SCOPE with an update, and on this table '
                   'the scope is two columns rather than one: user_id is as much a scope as '
                   'workspace_id, because §8.4''s cell is `O`. dedupe_key is in this list because a '
                   'deduplication key that can be edited after the fact deduplicates nothing (050''s '
                   'reason for app.jobs). app_worker is IN the checked role list because every grant '
                   'this batch makes to it is column-scoped.';
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE THREE. §8.5 has no broad user delete; every purge in this
  -- family is a retention job (NOTIFICATION-INBOX, PUSH-SECRET) and batch 160 owns it.
  select string_agg(format('%s.%s to %s', schema_name, target, grantee), ', ') into offending
    from (
      select n.nspname as schema_name, c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where ((n.nspname = 'app' and c.relname in ('notifications', 'notification_preferences'))
              or (n.nspname = 'private' and c.relname = 'push_subscription_references'))
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a row in the notification family can be deleted through a granted path: %', offending
      using hint = '§8.5 requires a soft delete through a typed lifecycle field where a delete is '
                   'wanted at all, and hard deletion here is a retention sweep with its own class and '
                   'its own batch.';
  end if;

  -- NO ROLE HOLDS ANYTHING ON THE SECRET-4 TABLE, in any verb, against the live ACL. §9.1 gives the
  -- class a client projection of "never returned after write" and §3.1 gives `private` no direct
  -- grant; this is that pair asserted rather than promised, and it is what the four schema-layer
  -- isolation cases on this table rest on.
  select string_agg(r.rolname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'private' and c.relname = 'push_subscription_references'
     and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
     and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'a role holds a privilege on private.push_subscription_references: %', offending
      using hint = 'The table holds a REFERENCE to a push subscription and the isolation cases assert '
                   'that every identity is refused ON THE SCHEMA. A grant here moves that refusal to '
                   'the table, so the cases fail — which is the intended behaviour and is why they '
                   'declare the object. It also means the CI negative control now owes this table an '
                   'entry, which identity-isolation.test.mjs requires in both directions.';
  end if;

  -- `anon` holds nothing on anything this batch creates. RFC-2026-021 §7/4 decided that as a NEGATIVE
  -- — "a negative is the strongest thing a lint can hold" (RFC-2026-019 §5) — and it is the one
  -- client-role property no approved decision is expected to move: the RFC says reversing it needs an
  -- RFC that states what the anonymous surface is for.
  select string_agg(format('%s.%s', n.nspname, c.relname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('notifications', 'notification_preferences'))
          or (n.nspname = 'private' and c.relname = 'push_subscription_references'))
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on %, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- No policy this batch's tables carry may name an anonymous role. §8.5 gives anonymous no tenant
  -- policy and RFC-2026-021 §7/4 gives it nothing at all. `app_worker` is deliberately NOT in this
  -- list: RFC-2026-022 classifies §8.4's `S` cell CARRIED and positively expects a service policy on
  -- app.notifications once §7 holds, and an apply-time assertion against an approved decision's own
  -- direction is the trap 011 set for 021.
  select string_agg(format('%s on %s.%s', pol.polname, n.nspname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('notifications', 'notification_preferences'))
          or (n.nspname = 'private' and c.relname = 'push_subscription_references'))
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles) and r.rolname = 'anon');
  if offending is not null then
    raise exception 'batch 051 left a policy for the anonymous role: %', offending;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 051 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised. The
  -- POLICY COUNT is deliberately not re-asserted: 021 owns that assertion and repeating it would be a
  -- second home for a number (060's note).
  select string_agg(format('%s.%s', n.nspname, c.relname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('notifications', 'notification_preferences'))
          or (n.nspname = 'private' and c.relname = 'push_subscription_references'))
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on %, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020, 021, 030, 040, 050,
  -- 060 and 140 ask them: scripts/db/run.mjs holds every tenant table to the ownership rule against
  -- the COMMITTED SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot
  -- describes.
  select string_agg(format('%s.%s owned by %s', n.nspname, c.relname,
                           pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where ((n.nspname = 'app' and c.relname in ('notifications', 'notification_preferences'))
          or (n.nspname = 'private' and c.relname = 'push_subscription_references'))
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 051 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all. On a SECRET-4 table '
                   'with an empty policy set that exemption is the difference between reading nothing '
                   'and reading everything.';
  end if;
end $$;
