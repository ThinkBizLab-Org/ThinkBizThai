-- Batch 100 — asset: the logical item, the immutable object behind it, the rights that govern it,
-- and the pin a content version holds it by.
--
-- Owner: A4 Asset. The migration ownership registry (§6) reserves 100 to this package, describes it
-- as "Asset detailed schema", and depends it on 020, 050, 061 and 080. §5's inventory names the
-- family from the other side — `asset.core` | "assets/versions/rights/links/backup/usage" |
-- business/page | "logical mutable; versions immutable" | MEDIA-2/RIGHTS-3 | ASSET-* | A4 Asset.
--
-- Depends on: 000 (schemas, private.set_updated_at, pgcrypto), 001 (app_worker), 010
-- (app.workspaces), 011 (app.is_active_member, app.workspace_member_role), 020
-- (app.business_profiles, app.page_context_profiles and the unique keys their children reference),
-- 021 (app.member_scope_admits_business, app.member_scope_admits_page), 080 (app.content_versions,
-- app.content_variants). All are merged; migration invariant 1 forbids rewriting any of them and
-- NOTHING BELOW DOES — every statement here creates a new object or attaches a policy to one this
-- file created, and no `drop policy` names a policy another batch wrote.
--
-- 050 AND 061 ARE DECLARED DEPENDENCIES AND NOT ONE STATEMENT BELOW NAMES A TABLE OF EITHER, which
-- is worth saying because a reader will look for the joins. Each is consumed as a REFUSAL and each
-- refusal names what decides it:
--
--   * 050 is the queue every media job runs on. There is NO `media_processing_jobs` table here and
--     no `job_id` column anywhere. A second queue beside the one 050 built is the shape
--     RFC-2026-022 §4 E was refused for, and §10 gives `JOB-SHORT` thirty days against
--     `ASSET-ORIGINAL`'s lifetime-of-the-Asset, so a foreign key would make an asset's processing
--     history die with the job that produced it (070's reason about a research run, unchanged).
--   * 061 is the meter. There is NO `storage_usage_daily` and no byte-cost column: what storage
--     costs is `app.usage_events`, and a cost column here would be a second source of truth for a
--     `FIN-3` number inside a `MEDIA-2` table whose retention class is not `FINANCE-HISTORY`
--     (130's refusal, kept by 070).
--
--
-- ============================================================================================
-- §5 NAMES SIX AND THIS BATCH CREATES FOUR, ONE ARGUMENT PER NAME
-- ============================================================================================
--
-- §5's inventory row is "assets/versions/rights/links/backup/usage"; the asset detailed design
-- (`docs/plans/asset-library-database-ux-spec-th.md`) §4 blueprints TWELVE tables; §4's canonical
-- ERD draws three — `WORKSPACE ||--o{ ASSET`, `ASSET ||--o{ ASSET_VERSION`, and
-- `CONTENT_VERSION ||--o{ CONTENT_ASSET_LINK` with `ASSET_VERSION ||--o{ CONTENT_ASSET_LINK : pins`.
-- No two agree, which is the same disagreement batch 050 and batch 070 each met and each resolved
-- from the documents rather than from the shortest list. §2's conflict order puts the Sprint 0A ERD
-- and inventory ABOVE the plan document, so §5's six names are the inventory this batch answers to
-- and the plan's twelve are read as detail rather than as scope.
--
--   * `app.assets` IS CREATED. §5's mutability column — "LOGICAL mutable; versions immutable" —
--     names it by the word `logical`; §4's ERD draws `WORKSPACE ||--o{ ASSET : owns`; §4 invariant 3
--     names Asset in the same breath as Knowledge, Research and Content. Without it
--     `asset_versions.asset_id` has no referent.
--
--   * `app.asset_versions` IS CREATED. §5 ("versions immutable"), §4's ERD, and §4 invariant 5,
--     which is the one canonical sentence that names a value of this table's own vocabulary:
--     "Content/Publish ที่ใช้สื่อต้อง pin `asset_version_id` ที่ `ready` และ rights valid".
--
--   * `app.asset_rights` IS CREATED. §5 ("rights"), §9.1's `RIGHTS-3` class — "license/consent/
--     proof/expiry", storage rule "private media/evidence + audit", client projection "status/expiry,
--     proof by permission" — §10's `RIGHTS-PROOF` retention class, and §8.2's "Asset rights/share"
--     row. Four documents, one table.
--
--   * `app.content_asset_links` IS CREATED. §4's ERD gives it BOTH parents by name and §5 names it
--     ("links"). It is the expression of §4 invariant 5's "pin".
--
--   * `backup` IS NOT CREATED. §5 names it and §4's ERD does not. §10 gives `BACKUP` its own
--     retention class whose whole content is about propagation — "deletion propagates by backup
--     expiry, not in-place mutation" — which is a statement about a SWEEP, and §6's registry gives
--     the retention/export batch to 160. The object storage lifecycle contract §16 puts backup and
--     disaster recovery under the storage owner's boundary rather than under a schema batch, and the
--     asset design's own §12 puts it in Slice 6 beside retention and the cost ledger. Reported in
--     the work package's open blockers rather than absorbed: §5 names a table nobody has been given.
--
--   * `usage` IS NOT CREATED, for the reason 061 is a refusal above. Reported likewise.
--
-- AND THE SEVEN THE PLAN NAMES THAT §5 DOES NOT, each refused with its own reason rather than as a
-- group:
--
--   * `asset_upload_sessions` — a quota reservation. §5 gives reservations to `metering.core`
--     ("reservations/events/quota buckets", A0/A6 Metering) and batch 061 built them. A second
--     reservation table in `asset.core` would be a second source of truth for a quota, which is what
--     130 refused for an entitlement.
--   * `media_processing_jobs` — the second queue, refused above.
--   * `asset_tags`, `asset_tag_links`, `asset_collections`, `asset_collection_items` — organisation
--     tables. §5's inventory does not name them, §4's ERD does not draw them, and §8 has no cell
--     anywhere for a tag or a collection. Where a document is silent the cell is denied (030's
--     reading, kept by 050, 060, 061, 070, 110 and 131), and a table whose whole access story would
--     have to be invented is not this batch's to invent.
--   * `asset_business_shares` — the sharing path, and the one refusal a reviewer should press on.
--     See "WHAT IS NOT HERE" below: sharing an asset ACROSS Businesses widens a member's reach past
--     their member scope, and §7 says a scope narrows a role's ceiling and never extends it. That is
--     a decision with an owner, not a table.
--
--
-- ============================================================================================
-- `MEDIA-2`: THE DATABASE HOLDS A LOCATOR AND A DIGEST, AND NEVER THE BYTES
-- ============================================================================================
--
-- §9.1's row, in full:
--
--   | `MEDIA-2` | image/video/original/thumbnail | private bucket; short signed access |
--   | authorized signed URL only |
--
-- The storage rule is "PRIVATE BUCKET", which is a statement about where the object lives, and the
-- client projection is "authorized signed URL only", which is a statement about how it is reached.
-- Neither is a statement about a column, and together they say the bytes are not in this schema.
-- §1/2 of the asset design says it from the other side: "PostgreSQL เป็น source of truth ของ
-- metadata, permission, rights, relationship, state และ usage" — metadata, not media.
--
-- Batch 060 answered the structurally identical question for `SECRET-4`, batch 070 for `COPYRIGHT-3`
-- and batch 131 for a payment instrument, and all three answers are the same one: the control is not
-- a CHECK that recognises the forbidden thing, it is that THE COLUMN DOES NOT EXIST, plus an
-- apply-time ALLOWLIST of the columns the table may hold — "a denylist of column names somebody
-- thought of is defeated by the one they did not". Applied here:
--
--   1. THERE IS NO OBJECT BODY COLUMN ON `app.asset_versions`. No `bytes`, no `data`, no `blob`, no
--      `file`, no `thumbnail_data`, no `base64`, no `content`. The apply-time block holds the table
--      to an explicit column allowlist against the live catalog, so a later batch that adds one
--      fails the migration rather than the code review. A second assertion sweeps all four tables
--      for the same idea under another name.
--
--   2. WHAT THE ROW HOLDS INSTEAD IS A LOCATOR AND A DIGEST. `storage_provider`, `bucket` and
--      `object_key` are the locator — three columns rather than one, because §4.1 of the object
--      storage lifecycle contract makes the key relative to a bucket and §3.1 of the same contract
--      makes the provider a choice. `sha256` is the digest, and §9.3 gives it its job in terms:
--      "Asset checksum/content hash: hash เพื่อ integrity/dedup ไม่ใช่ secret".
--
--   3. THE LOCATOR IS NULLABLE AND THE DIGEST IS NOT, AND THAT ASYMMETRY IS §10's SENTENCE. The
--      `ASSET-ORIGINAL` final behavior is "purge object, versions, signed access; verify deletion",
--      and the safe purge algorithm's step 11 is "อัปเดต `deleted_at/purged_at` แบบ idempotent" —
--      an UPDATE of two stamps, not the removal of a row, which §11.5 confirms from the support side
--      ("Partial purge is retryable/idempotent and visible to support as REDACTED STATUS"). So a
--      purged version is a row whose locator is gone and whose digest, size and shape remain: the
--      redacted status. `object_key` is nullable because §10 removes it; `sha256` is NOT NULL
--      because a row that no longer says where the bytes were must still say which bytes they were,
--      or the reconciliation §15 of the storage contract requires has nothing to reconcile against.
--
--   4. `original_filename` IS STORED AND IS NOT A KEY, and the difference is the whole of §4.2 of
--      the storage contract: "ชื่อไฟล์ที่ผู้ใช้อัปโหลดเก็บในฐานข้อมูลแบบเข้ารหัส/จำกัดสิทธิ์ ไม่ใช้
--      เป็น object key". This schema supplies the ACCESS-RESTRICTED half through a column-scoped
--      grant and a policy; it does NOT supply the encrypted half, which is platform encryption at
--      rest and is not a column. Stated rather than absorbed, and in the blockers.
--
--
-- ============================================================================================
-- THE `S` CELL — "ASSET HARD PURGE" — IS THE HARDEST THING IN THIS BATCH AND IT IS CLASSIFIED,
-- NOT ENFORCED
-- ============================================================================================
--
-- §8.2's last row:
--
--   | Asset hard purge | N | N | N | N | N | S |
--
-- `RFC-2026-022` (approved 2026-09-08) is the decision that says what an `S` cell looks like, and
-- unlike batch 070's cell THIS ONE IS NAMED IN §3's OWN TABLE:
--
--   | Asset hard purge | `100`, `160` | **BOTH** — see below |
--
-- and the paragraph under the table:
--
--   "Asset hard purge is both. Driven by §11.4's workspace closure it is CARRIED — the workspace is
--    the subject of the whole operation. Driven by a retention sweep it is DISCOVERED — the sweep
--    selects by age across tenants and learns the workspace from the row. A cell may have both
--    shapes, because the class attaches to the statement. So a table may need a CARRIED policy and a
--    DISCOVERED broker, and the register keys on (cell, statement), never on the table alone."
--
-- THE VERDICT IS CHECKED AGAINST THE STATEMENTS RATHER THAN COPIED, which is the discipline 070 and
-- 131 each applied. §3's operational form: write the statement, add
-- `and workspace_id = (select nullif(current_setting('app.workspace_id', true), '')::uuid)` to its
-- `WHERE`, and ask whether it still addresses the same work.
--
--   * THE WORKSPACE-CLOSURE PURGE. §11.4 is a workspace deletion lifecycle and §11.4 step 7 purges
--     "tenant content, research, ASSETS". The statement is "redact every unpurged version of this
--     workspace": `update app.asset_versions set object_key = null, purged_at = now(),
--     status = 'purged' where workspace_id = $1 and purged_at is null and id = any ($2)`. The
--     workspace is already in the `WHERE` as a parameter — it is the SUBJECT of the operation, named
--     by the closure request that started it — so adding the confinement term is redundant rather
--     than restrictive and the statement writes the same rows. **CARRIED.**
--
--   * THE RETENTION SWEEP. §10's `ASSET-ORIGINAL` gives "Trash 30 วัน; block purge if referenced/
--     hold", and §7.4 of the asset design moves `Trash --> PurgeQueued: พ้น retention และไม่มี
--     reference`. The statement is "the next assets whose Trash window has expired", across tenants:
--     `select ... from app.assets where deleted_at is not null and purge_after <= now()`. Add the
--     confinement term and the work CHANGES — "the assets whose retention has expired" becomes "the
--     expired assets of a tenant I already knew", which is not a sweep; and the sweep exists
--     precisely because nobody named a tenant. The workspace is the statement's OUTPUT.
--     **DISCOVERED.**
--
-- TWO ROWS IN `db/foundation/lint/service-policy-map.json`, keyed on (cell, statement) as §7.2
-- requires, and NOT one row for the table. The register's `_shape` already carries `operation`, and
-- both of these are `update` rather than `delete`, because §9.3/11 of the storage contract makes the
-- purge an update of `deleted_at/purged_at` and §8.5 has no broad user delete: NO ROLE HOLDS DELETE
-- ON ANY TABLE THIS BATCH CREATES, and the apply-time block asserts it.
--
-- **NO SERVICE POLICY IS WRITTEN, AND THAT IS THE DECISION IN EFFECT RATHER THAN A DEFERRAL.** The
-- conditions are `RFC-2026-022`'s own, read here rather than cited from another batch:
--
--   * The Status line: "NOT IN EFFECT until §7 holds: the only member of `app_worker` today is
--     `postgres`, which bypasses RLS."
--   * §5/8: "A policy `TO app_worker` written today is unreachable except from an identity for which
--     it is moot", and M9 is the measurement — `pg_auth_members` gives `app_worker` exactly one
--     member, `postgres`, which holds `rolbypassrls`.
--   * §5/6 and §7.1/4: the DISCOVERED half is performed through a `SECURITY DEFINER` broker owned by
--     a fifth role (`app_queue`) that does not exist, and "a broker function has nobody to grant
--     `EXECUTE` to".
--   * §9: `app_worker`'s connection method and credential custody belong to `DATA-DEC-03`, which is
--     open and due before G1.
--
-- So a policy written here would be a claim this instance cannot honour: it would admit nobody,
-- while making `service-sees-zero-asset-*` pass for a reason that has nothing to do with the policy.
-- What this batch does instead is what the RFC leaves a batch to do — it records the classification
-- as DATA, which §7.2 makes the answer to "which shape does this cell take" and which
-- `scripts/db/run.mjs` reads in both directions. `app_worker` holds GRANTS AND NO POLICY, so a
-- service refusal here is attributable to row level security rather than to a forgotten GRANT, and a
-- service role that had quietly acquired `BYPASSRLS` would SUCCEED where the suite demands a refusal
-- (010's construction, kept by every batch since).
--
-- AND THE CONFINEMENT TERM IS NOT A TENANT BOUNDARY, which nothing in this file, in the map or in
-- the isolation suite may say it is (`RFC-2026-022` §5/4, measured twice: the role the policy names
-- can set the setting the policy reads, and `has_parameter_privilege` cannot even be asked who may).
-- The expression appears in this migration exactly once, in the paragraph above, and a static test
-- pins that count.
--
--
-- ============================================================================================
-- A PURGE ADDRESSES EXACT OBJECT KEYS. THIS SCHEMA CANNOT EXPRESS A PREFIX, AND CANNOT SUPPLY
-- THE APPROVED MANIFEST EITHER — WHICH IS A BLOCKER AND IS NAMED AS ONE
-- ============================================================================================
--
-- `CONTRIBUTING_AGENTS.md`, non-negotiable security and data rules, last line:
--
--   "Production object deletion uses an approved immutable manifest of exact object keys; never
--    recursively delete a user-supplied prefix."
--
-- The object storage lifecycle contract §9.3 says the same thing at length and adds the teeth:
--
--   "กฎบังคับ: ห้ามเรียก bulk delete ด้วย unvalidated prefix ไม่ว่ากรณีใด ให้ prefix ใช้ค้นหาเพื่อ
--    reconciliation ได้เฉพาะหลัง validate แต่การลบ production ต้องใช้รายการ exact keys จาก approved
--    snapshot"
--
-- and its step 7 requires the algorithm to "reject หาก prefix ว่าง, กว้างกว่าระดับ workspace, มี
-- wildcard, parse ไม่ผ่าน". §4.2 of the same contract forbids "`../`, URL-encoded separator,
-- wildcard หรือ user-controlled segment" in a key at all.
--
-- WHAT THIS SCHEMA DOES ABOUT IT, in three parts, none of which is a comment:
--
--   1. ONE ROW NAMES EXACTLY ONE OBJECT. `object_key` is a whole key, unique with its provider and
--      bucket, and there is no quantity anywhere in this batch that stands for a SET of objects. A
--      purge addresses rows, and a row's key is the exact key.
--
--   2. A STORED KEY CANNOT ITSELF BE A PREFIX OR A PATTERN.
--      `asset_versions_object_key_names_one_object` refuses a key containing `%`, `_%`-style glob
--      metacharacters `*` or `?`, a `..` traversal, or a trailing `/`. The trailing slash is the one
--      that matters most: a key ending in `/` IS a folder, and "delete everything under this key" is
--      precisely the recursive prefix delete the rule forbids — expressed as data rather than as a
--      statement, which is how it would arrive in a manifest nobody reads.
--
--   3. NO COLUMN IN THIS BATCH IS A PREFIX. The apply-time block sweeps all four tables for
--      `prefix`, `key_prefix`, `object_prefix`, `path_prefix`, `glob`, `pattern` and `wildcard` and
--      refuses the migration if one appears. A denylist is the wrong instrument for a column whose
--      name somebody chooses, which is why the version table ALSO carries a full allowlist; this
--      sweep exists for the other three tables, which do not.
--
-- WHAT THIS SCHEMA CANNOT DO, STATED PLAINLY BECAUSE IT IS THE STOP-THE-LINE HALF:
--
--   THE APPROVED IMMUTABLE MANIFEST HAS NO HOME IN THIS REPOSITORY AND NO OWNER IN §6's REGISTRY.
--   §9.3's step 4 requires the purge to "สร้าง snapshot รายการ exact object IDs/keys พร้อม checksum
--   และ expected bytes" and step 3 requires an ACTOR APPROVAL before it; §9.2 requires "approval
--   ตามระดับความเสี่ยงและ pre-delete dry run". Neither the snapshot nor the approval is a table §5's
--   inventory names, and the storage contract's own minimum tables — `storage_objects`,
--   `storage_blobs`, `asset_references`, `storage_jobs`, `storage_audit_events` — appear in no row
--   of §6's registry at all. So this batch can supply the EXACT KEYS and cannot supply the APPROVED
--   IMMUTABLE SNAPSHOT they are supposed to come from, and no `WHERE` clause lives in a schema: a
--   worker that composes `where object_key like $1 || '%'` is refused by nothing here.
--
--   That is a blocker and it is recorded as one. It is not closed by anything in this file, it is
--   not closed by the two classification rows, and a reviewer who reads parts 1–3 above as closing
--   it has read them as more than they are. The remaining defence is that NO ROLE HOLDS DELETE
--   ANYWHERE in this batch, so nothing a granted path can issue removes a row at all — which bounds
--   the damage to a redaction and does not bound which rows are redacted.
--
--
-- ============================================================================================
-- "LOGICAL MUTABLE; VERSIONS IMMUTABLE" IS FOUR DECISIONS AND §5 SETTLES TWO OF THEM
-- ============================================================================================
--
-- §5's mutability column for `asset.core` reads, in full: **"logical mutable; versions immutable"**.
-- It names two of this batch's four tables and is silent about the other two, exactly as it was
-- silent for batch 070 ("mixed; evidence immutable") and batch 131 ("versioned + ledger-like"). Each
-- table gets its own disposition and its own sentence, and the two that are readings rather than
-- quotations say so.
--
-- IMMUTABILITY HERE IS ABSENT GRANTS **AND** ABSENT POLICIES, ASSERTED BOTH WAYS FROM THE LIVE
-- CATALOG, AND IT IS NEVER A TRIGGER — 070's rule, and 140's counter-case does not apply to any
-- table here. Either half alone can be satisfied while the other is wrong: a policy with no grant is
-- inert, and a grant with no policy is refused by row level security, which is a weaker refusal than
-- immutability asks for.
--
-- 1. `app.assets` — MUTABLE. THE SENTENCE IS §5's OWN: "LOGICAL mutable". §8.2's "Asset upload/edit/
--    archive | Y | Y | Y | N | N | P" corroborates it with three verbs over an existing row, and
--    §7.4 of the asset design moves the same row `Ready --> Trash --> Ready` on a user's act. So the
--    asset carries `updated_at` and §3.2's trigger, and the columns that say WHICH asset it is — the
--    identity, all three scope columns, `kind`, `source`, `created_by` — are outside every UPDATE
--    grant. So are `purge_after` and `current_version_id`; see below.
--
-- 2. `app.asset_versions` — IMMUTABLE IN EVERY COLUMN EXCEPT THE FOUR THE PURGE AND THE READINESS
--    STATE MOVE. THE SENTENCE IS §5's OWN: "versions IMMUTABLE". The asset design says the same
--    thing twice more, and the second is a constraint rather than a label: §2.3 calls a version
--    "ไฟล์ immutable หนึ่งเวอร์ชัน", and §4.2's own constraint list ends "ห้าม UPDATE object
--    location/content หลัง `ready`; การแก้ไขสร้าง row ใหม่".
--
--    THE FOUR ARE `status`, `object_key`, `purged_at` AND `updated_at`, and that set is this batch's
--    hardest line to hold, so it is held by an allowlist asserted per column against the live ACL
--    rather than against the grant text below — 070's snapshot shape, which is the shape this batch
--    was told to repeat. Why each one moves:
--
--      `status`      — §7.1 of the asset design assigns media readiness to this column by name
--                      ("Media readiness | `asset_versions.status`"), and §4 invariant 5 requires a
--                      pinned version to be `ready`, which is a state a row arrives at rather than
--                      one it is born in.
--      `object_key`  — §10's "purge object" and §9.3/11's "อัปเดต `deleted_at/purged_at`". This is
--                      the locator the purge clears.
--      `purged_at`   — the same sentence's other half, and the column that makes "this repository is
--                      holding an object past its own stated limit" a QUERY rather than a guess
--                      (070's `purged_at`, same reason).
--      `updated_at`  — §3.2 requires it on every mutable row and 070 granted it beside the two
--                      columns its own snapshot moved.
--
--    EVERYTHING ELSE IS OUTSIDE EVERY UPDATE GRANT TO EVERY ROLE: the identity, both scope columns,
--    `asset_id`, `version_no`, `parent_version_id`, `purpose`, `platform`, `storage_provider`,
--    `bucket`, `original_filename`, `detected_mime`, `byte_size`, `width`, `height`, `duration_ms`,
--    `sha256`, `created_by`, `created_at`. `sha256` and `byte_size` are in that list for a reason
--    beyond immutability: they are what a reconciliation compares a provider's answer against, and a
--    digest a granted path can rewrite is not a digest.
--
-- 3. `app.asset_rights` — MUTABLE. THE SENTENCE IS §8.2's, because §5 is silent: **"Asset
--    rights/share | Y | Y | N | P | N | P"**. The owner and the admin hold the verb; the EDITOR IS
--    `N` here where they were `Y` two rows above for upload, which is the one place in this family
--    the two rows disagree about a role and is therefore the one place a policy must not be copied
--    from its neighbour. §6.2 of the asset design reads the same row from the product side — "Change
--    rights/share | Owner/Admin; Approver เมื่อ policy อนุญาต | Audit ทุกครั้ง" — and the approver's
--    `P` is REFUSED for the reason `RFC-2026-020` §8 states as approved: no document defines the
--    capability set, and §15 forbids an agent choosing it.
--
-- 4. `app.content_asset_links` — APPEND-ONLY, AND THIS IS 100's OWN READING RATHER THAN A
--    QUOTATION, so a reviewer is entitled to disagree with it. THE SENTENCE IT IS READ FROM is
--    §4.7's own rule list: **"การแก้ link หลังอนุมัติต้อง invalidate Approval"** — editing a link
--    after approval must invalidate the approval. That sentence makes mutation CONDITIONAL on a
--    mechanism, and the mechanism does not exist: batch 090 (approval policy/request/event) is
--    unwritten, `app.approval_requests` does not exist, and there is nothing to invalidate and
--    nothing to do the invalidating. §8.2's "Approved/published version UPDATE/DELETE | N | N | N |
--    N | N | N" is what decides the case where the condition cannot be met. So: no UPDATE or DELETE
--    grant to any role, no UPDATE or DELETE policy, no `updated_at` column and no trigger, because
--    an append-only row has no update to stamp (020's words, kept by 030, 040, 050, 070, 080, 130
--    and 131).
--
--    THE COST OF BEING WRONG ABOUT THIS IS SMALL AND IN THE SAFE DIRECTION, which is why the reading
--    is taken rather than deferred (070's sentence about a citation, unchanged): adding a grant is a
--    forward migration; taking one away after a writer exists is a behaviour change with a data
--    question attached. The day 090 lands an approval that can be invalidated, the batch that wires
--    the invalidation grants the UPDATE in a diff a reviewer reads.
--
--
-- ============================================================================================
-- §8.2's FOUR ASSET ROWS, AND WHICH HALF OF EACH THIS SCHEMA CAN REACH
-- ============================================================================================
--
--   | Asset SELECT/use            | Y | Y | Y | Y | Y | P |
--   | Asset upload/edit/archive   | Y | Y | Y | N | N | P |
--   | Asset rights/share          | Y | Y | N | P | N | P |
--   | Asset hard purge            | N | N | N | N | N | S |
--
-- ROW 1 IS IMPLEMENTED FOR ITS `SELECT` HALF ON ALL FOUR TABLES AND REFUSED FOR ITS `USE` HALF ON
-- ONE, AND THAT SPLIT IS THE DECISION IN THIS SECTION A REVIEWER SHOULD PRESS ON HARDEST. "Asset
-- SELECT/use" is `Y` for every built-in role INCLUDING THE VIEWER, so the read predicate tests ACTIVE
-- MEMBERSHIP and not role — `app.is_active_member(workspace_id)`, which is 040's, 070's and 080's
-- policy on the families §4 invariant 3 names in one sentence with this one.
--
-- The `use` half is the act of attaching an asset to content, which is an INSERT into
-- `app.content_asset_links`. NO CLIENT ROLE HOLDS IT, for two reasons that agree:
--
--   * Reading it as a client INSERT would give a VIEWER a write on content, and "Content create/
--     edit/version" two rows above is `Y | Y | Y | N | N` — `N` for the approver and the viewer. Two
--     readings of one matrix conflict and the narrower, more specific one holds (060's rule when
--     §5's classes did not cover its own tables, kept by 070).
--   * A link is part of what a content version SAYS, and batch 080 gave `app.content_versions` no
--     INSERT grant to any role including the service, recording that "nothing in this repository can
--     write a content version, variant or quality review". A link a client could insert would attach
--     media to a version nobody can create.
--
--   §6.2 of the asset design agrees with the narrower reading on the role list — "Attach to Content |
--   Owner/Admin/Editor" — and adds two conditions this schema cannot express at all: "version `ready`
--   และ rights valid". Both are in the blockers, because a policy cannot read another table's
--   lifecycle without the coupling 020 rejects, and `rights valid` is a state `app.asset_rights`
--   carries per-asset with no arithmetic binding it to an instant.
--
-- ROW 2 IS IMPLEMENTED IN FULL FOR ITS THREE `Y` COLUMNS. "Asset upload/edit/archive" is `Y` for
-- owner, admin and editor: `app.assets` carries a client INSERT policy (the upload), a column-scoped
-- client UPDATE on `title` (the edit) and on `deleted_at` (the archive, which §11.5 defines as "User
-- delete = move to Trash"). The editor is a `Y` here and was a `P` in §8.1, which is 040's
-- distinction and is kept: a `Y` cell is NARROWED by scope where one exists (`member_scope_admits_*`,
-- true for an unscoped member) and a `P` cell requires an EXPLICIT scope (`member_scope_covers_*`).
-- Every client cell this batch implements is a `Y`, so every narrowing below is `admits` and none is
-- `covers`.
--
--   WHAT ROW 2 DOES NOT REACH, and it is the same gap 070 and 080 each recorded: an upload creates an
--   asset AND its first version, and `app.asset_versions` has no client INSERT — §5 makes the version
--   immutable and an immutable row's creation is a service act. So a client can create an asset with
--   no version, and nothing in this repository can give it one. In the blockers.
--
-- ROW 3 IS IMPLEMENTED FOR ITS TWO `Y` COLUMNS AND REFUSED FOR ITS `P`, and the INSERT half is a
-- reading stated so it can be refused. §8.2's row names an operation and not an SQL verb — the same
-- way "Asset upload" names a creation without saying INSERT — so owner and admin hold both the INSERT
-- and the UPDATE on `app.asset_rights`. The alternative reading, that only a CHANGE to an existing
-- rights record is licensed, would leave the table unwritable by anything, and §4 invariant 5 makes a
-- valid rights record a PRECONDITION of using any media at all ("pin `asset_version_id` ที่ `ready`
-- และ rights valid"), so under that reading no asset in this system could ever be used. That
-- consequence is what decides it, and it is stated rather than assumed.
--
-- ROW 4 IS THE `S` CELL. Classified, not written; see above.
--
-- §9.1's `RIGHTS-3` PROJECTION IS IMPLEMENTED AS A COLUMN LIST AND THIS IS WHERE IT LIVES. The class
-- gives the client "status/expiry, PROOF BY PERMISSION". `owner_name`, `proof_asset_id`, `proof_url`
-- and `note` are outside the `authenticated` SELECT grant entirely, because "by permission" names a
-- permission this repository does not define — the same `P` refusal, arriving as a missing column in
-- a grant rather than as a role list in a policy. `rights_status`, `starts_at` and `expires_at` ARE
-- granted, because they are the two words the projection does license.
--
-- MEMBERSHIP AND SCOPE ARE READ THROUGH THE HELPERS AND NEVER BY JOINING THE TABLES
-- (`RFC-2026-020` §5/5, and 020's reason unchanged: a policy that scanned `app.workspace_members`
-- would evaluate that scan AS THE CALLER, so another module's whole policy set would expand inside
-- this table's evaluation). Not one predicate below names `app.workspace_members` or
-- `app.workspace_member_scopes`, and a static test asserts it.
--
--
-- ============================================================================================
-- THE SCOPE PATH, AND WHY THE THREE CHILDREN CARRY NO PAGE OF THEIR OWN
-- ============================================================================================
--
-- §4 invariant 3 names Asset by name: "Knowledge/Research/Content/Asset ทุก row มี Business scope;
-- Page scope เป็น nullable override ที่ต้องอยู่ Business เดียวกัน". So `app.assets` carries
-- `business_profile_id` NOT NULL and `page_context_profile_id` nullable, with a THREE-column
-- composite foreign key into `app.page_context_profiles` over (workspace_id, business_profile_id,
-- id) — MATCH SIMPLE, the default, which skips the key when the page is null and is the only
-- workable choice. That argument is 040's, at length, and is not repeated.
--
-- THE THREE CHILDREN CARRY `workspace_id` AND `business_profile_id` AND NO PAGE COLUMN, for the
-- mechanical reason 070 gave four times: A COPY OF THE PAGE COULD NOT BE HELD EQUAL TO THE ASSET'S.
-- A composite foreign key over a path including a nullable page is MATCH SIMPLE, so when the child's
-- page is null the check is SKIPPED — a version could then claim to be business-level while the
-- asset it belongs to is page-restricted, and the narrowing would ask `admits_business` of the
-- version where it asks `admits_page` of the asset. That is media reachable to a member the asset
-- itself is hidden from. MATCH FULL cannot rescue it and no CHECK can, because a CHECK cannot read
-- another row.
--
-- So each child's reach IS ITS PARENT'S REACH, asserted rather than copied: one `AS RESTRICTIVE FOR
-- ALL` policy per table whose predicate resolves through the parent. The subquery runs AS THE
-- CALLER, so the parent's own policy set applies to it, and the direction is fail-closed.
--
-- `app.content_asset_links` HAS TWO PARENTS AND ITS NARROWING NAMES BOTH, ANDed. §4.7's rules are
-- "same Workspace เสมอ" and "same Business เว้นแต่ Asset ถูก Admin share", and §4's ERD gives the
-- row two edges — `CONTENT_VERSION ||--o{ CONTENT_ASSET_LINK : uses` and `ASSET_VERSION ||--o{
-- CONTENT_ASSET_LINK : pins`. A narrowing that named only one parent would make a link reachable
-- through the half its reader happens to hold; ANDing them makes the link's reach the INTERSECTION
-- of the asset's and the content version's, which is the only reading under which neither parent's
-- boundary can be walked around through the other. The apply-time block asserts that both names
-- appear in both halves of that policy.
--
--
-- ============================================================================================
-- WHAT IS NOT HERE, NAMED RATHER THAN LEFT FOR A REVIEWER TO FIND
-- ============================================================================================
--
--   * NO `assets.scope` COLUMN, though §4.1 of the asset design names one with three values
--     (`business_private`, `page_only`, `workspace_shared`). Two of the three are a SECOND SOURCE OF
--     TRUTH for a fact `page_context_profile_id` already fixes — `page_only` is exactly
--     "`page_context_profile_id is not null`" and `business_private` is exactly its negation — which
--     is 021's refusal of a `current_version_id`, 030's of an `industry_pack_id` and 070's of a
--     narrowing that named a run directly. The third value, `workspace_shared`, is the one that adds
--     information, and it is the sharing decision below rather than a column.
--
--   * NO `asset_business_shares`, AND NO SHARING PATH OF ANY KIND. §6.2 of the asset design admits a
--     reader who has "สิทธิ์ Business/Page หรือ ASSET ถูกแชร์อย่างชัดเจน", and §4.7's rule allows a
--     link across Businesses "เว้นแต่ Asset ถูก Admin share". Honouring either would let a member
--     scoped to Business A reach a row of Business B, and §7 says a member scope "ตัดสิทธิ์ให้แคบลง
--     และไม่ขยาย role" — narrows a role's ceiling and never extends it. A share is therefore a
--     widening of a boundary this schema's whole isolation suite is built to assert, and §8's four
--     matrices contain no cell for it anywhere. It is a decision with an owner (A4 + A1 + an RFC),
--     not a table, and it is in the blockers. Until it exists, `same Business` is unconditional here
--     and the `เว้นแต่` clause has no implementation.
--
--   * NO `assets.status` COLUMN, though §4.1 enumerates five values for one. §7.1 of the same
--     document assigns media readiness to `asset_versions.status` BY NAME, and `trash` is exactly
--     `deleted_at is not null`, so an `assets.status` would be a second source of truth for two facts
--     other columns already carry. "Is this asset ready" is
--     `exists (select 1 from app.asset_versions v where v.asset_id = a.id and v.status = 'ready')` —
--     a query a reader can disagree with rather than a denormalisation nothing keeps honest.
--
--   * NO `assets.search_text` AND NO TRIGRAM INDEX, though §5.1 requires "GIN trigram บน
--     `assets.search_text`" from the first migration. `pg_trgm` IS NOT IN THE APPROVED EXTENSION SET:
--     batch 000 creates `pgcrypto` and nothing else, the approved set is batch 000's scope, and
--     migration invariant 1 forbids rewriting it. Adding an extension is a change to the foundation
--     and takes an RFC. The column is omitted rather than added without its index, because a
--     `search_text` nothing searches is a denormalised copy of `title` with no reader. In the
--     blockers, with the index the asset library's own pagination contract needs.
--
--   * NO `asset_versions.technical_metadata`, though §4.2 names a `jsonb` column of that name.
--     §5's own dictionary template forbids it in terms: "ห้ามใช้คำว่า 'metadata', 'config', 'payload'
--     หรือ 'JSON' โดยไม่ระบุ JSON Schema version, maximum size, prohibited fields และ owner". There
--     is no JSON Schema for it, no size, no prohibited-field list and no owner. 080 met the same
--     sentence and kept its `metadata` column with a `jsonb_typeof = 'object'` CHECK; this batch
--     refuses instead, and the difference is `MEDIA-2` — an untyped document on the one table whose
--     whole discipline is that the object is not in the database is the column the bytes would
--     eventually arrive in, and the allowlist exists to make that impossible rather than unlikely.
--
--   * NO `video_codec` AND NO `audio_codec`, though §4.2 names both. No document enumerates a codec
--     name, so each would be a `text` column with no CHECK — which is precisely the defect batch
--     080's own open blocker 1 records against three of its columns. Reported rather than repeated.
--
--   * NO RETENTION NUMBER ANYWHERE, FOR ANY OF THE FOUR CLASSES §5 ASSIGNS THIS FAMILY.
--     §10 gives `ASSET-ORIGINAL` "Trash 30 วัน", `ASSET-DERIVATIVE` "may purge immediately",
--     `RIGHTS-PROOF` "อายุ Asset use + 2 ปี default" and `UPLOAD-TEMP` "24 ชั่วโมง" — and §10's own
--     header says the numbers are "Engineering default สำหรับ Pilot ต้องได้รับ Product/Security/Legal
--     approval ก่อน Paid Beta". None is approved. So `purge_after` is NULLABLE with NO DEFAULT and NO
--     ARITHMETIC anywhere in this file, `asset_rights.expires_at` likewise, and the apply-time block
--     refuses any CHECK on any of the four tables that mentions an interval — 070's treatment of
--     `DATA-DEC-07`, applied to four classes instead of one. The only thing about retention this
--     batch asserts is that a purge window cannot open before the deletion that starts it
--     (`purge_after >= deleted_at`, §4.1's own constraint), which uses no number.
--
--     `DATA-DEC-07` ITSELF IS NOT TOUCHED. It is research snapshot retention, batch 070's, and
--     nothing here reads or writes a research row.
--
--   * NO `P` CAPABILITY ANYWHERE. The Service column of all four rows above is `P`, the approver's
--     cell in "Asset rights/share" is `P`, and `RFC-2026-020` §8 records as approved that no document
--     defines the capability set. Not one policy below names a `P`.
--
--   * NO COMMAND FUNCTION AND NO `app_command` GRANT. `RFC-2026-012` §4 names `SECURITY DEFINER`
--     command functions as the mechanism and `RFC-2026-021` §10 records that none exists. Three
--     consequences are stated rather than absorbed: the upload's version half has no path,
--     `current_version_id` can never be set by anything, and §6.2's "Audit ทุกครั้ง" on a rights
--     change is not implemented — binding an audit record to the act it describes is what a command
--     function is for.
--
--   * NO CLIENT VIEW AND NO READ-ALLOWLIST ENTRY. `RFC-2026-021` §3 makes a `security_invoker` view
--     an allowlist entry added by RFC, and §4's criterion C1 is "a named caller exists, and it is a
--     client". There is no `src/`. The signed-URL projection §9.1 licenses is not a view at all — it
--     is an application concern outside the database, and §6.3 of the asset design puts it there.
--
--   * NOTHING ABOUT WORKSPACE LIFECYCLE VISIBILITY. Unchanged from 020's, 030's, 040's, 061's, 070's
--     and 080's headers: a member of an `access_blocked` workspace can still read the rows the
--     policies below admit. §11.4 step 7 ("purge tenant content, research, ASSETS") is an operation
--     on this family from the other side and is owed to the command surface and to batch 160.


-- ---------------------------------------------------------------------------------------------
-- app.assets — the logical item a person knows. The aggregate the other three hang from.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` and `business_profile_id` (§3.3, §4 invariant 3), plus the nullable
-- Page override. Sensitivity MEDIA-2 for the media it points at; the row itself carries the tenant's
-- own words in `title`, which is CONTENT-2. Retention ASSET-ORIGINAL, whose numbers are not encoded.
create table if not exists app.assets (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  page_context_profile_id  uuid,
  -- §4.1 enumerates exactly two, and §9.1's MEDIA-2 example is "image/video/original/thumbnail".
  kind                     text        not null,
  -- §4.1: "ระบบตั้งจาก category/date ได้ ผู้ใช้ไม่ต้องพิมพ์" — the system may name it, so it is NOT
  -- NULL and the client is not required to have typed it. CONTENT-2: it is the tenant's own words.
  title                    text        not null,
  -- §4.1 enumerates exactly four.
  source                   text        not null,
  -- §4.1: "ชี้ version ที่หน้า Asset detail แสดง แต่ Content ห้ามใช้ pointer นี้". Nullable, with a
  -- scope-path foreign key that pins it to a version OF THIS ASSET. The cycle a reader expects is
  -- not one: `asset_versions` references `assets`, so a key in the other direction looks circular,
  -- but the column is NULLABLE, so the insert order is asset (null), then version, then set it. No
  -- deferral is needed and none is used (080's paragraph, same shape, same schema).
  --
  -- NOTHING CAN SET IT TODAY. It is outside every INSERT grant (a version does not exist when the
  -- asset is inserted) and outside every UPDATE grant (which version is CURRENT is the act of
  -- publishing one, not a field a client edits — 080's sentence about a content item). So it is
  -- permanently null until a command function exists, and that is in the blockers rather than hidden
  -- behind a grant that would make it writable by whoever asked last.
  current_version_id       uuid,
  -- §11.5: "User delete = move to Trash; hide from normal query". The archive half of §8.2's second
  -- row, as a timestamp rather than as a status value.
  deleted_at               timestamptz,
  -- §4.1: "เวลา earliest hard purge". NULLABLE, NO DEFAULT AND NO ARITHMETIC: §10's "Trash 30 วัน"
  -- is an unapproved engineering default (§10's own header), so every trashed asset states its own
  -- earliest purge and none inherits a number nobody approved. Outside every CLIENT update grant: a
  -- purge window a client can push forward is not a window (070's sentence about a retention limit).
  purge_after              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  updated_by               uuid,
  constraint assets_title_not_blank check (length(btrim(title)) > 0),
  constraint assets_kind_known check (kind in ('image', 'video')),
  constraint assets_source_known
    check (source in ('upload', 'ai_generated', 'imported', 'copied')),
  -- §4.1's own constraint, and it uses no number.
  constraint assets_purge_follows_deletion
    check (purge_after is null or (deleted_at is not null and purge_after >= deleted_at)),
  -- §3.3's composite foreign key into the Business, over the whole scope path. Both columns are NOT
  -- NULL, so this one is checked on every row.
  constraint assets_business_scope_fk
    foreign key (workspace_id, business_profile_id)
    references app.business_profiles (workspace_id, id),
  -- The nullable override, over the whole scope path INCLUDING the Business. MATCH SIMPLE (the
  -- default) skips it when the Page is null, which is what makes a business-level asset legal; when
  -- the Page is set, the key forces it to be a Page of THAT Business in THAT Workspace (§4
  -- invariant 3, second half; §4 invariant 10).
  constraint assets_page_scope_fk
    foreign key (workspace_id, business_profile_id, page_context_profile_id)
    references app.page_context_profiles (workspace_id, business_profile_id, id),
  -- §4.1: "unique `(id, workspace_id, business_profile_id)` สำหรับ composite FK". The target of
  -- every child's composite foreign key, and what lets a version or a rights record assert that its
  -- own Workspace and Business are the ones its asset actually has (§4 invariant 10).
  constraint assets_scope_key unique (workspace_id, business_profile_id, id)
);

comment on table app.assets is
  'Owner: A4 Asset (asset.core, batch 100). Canonical scope workspace_id and business_profile_id, '
  'with page_context_profile_id as the NULLABLE OVERRIDE §4 invariant 3 defines for Knowledge, '
  'Research, Content and ASSET in one sentence (§3.3). Sensitivity MEDIA-2 for what it points at; '
  'retention ASSET-ORIGINAL, whose "Trash 30 วัน" is NOT encoded here (§10''s own header makes every '
  'number in that table an unapproved engineering default, batch 160 owns the sweep, §15 forbids an '
  'agent ratifying one). MUTABLE — §5''s mutability column for asset.core reads "LOGICAL mutable; '
  'versions immutable" and this is the logical half by name — so the row carries updated_at and '
  '§3.2''s trigger, and §8.2''s "Asset upload/edit/archive | Y | Y | Y | N | N | P" is implemented '
  'for its three Y columns as an INSERT policy, a title UPDATE and a deleted_at UPDATE. NO scope '
  'column and NO status column: two of scope''s three values restate page_context_profile_id and '
  'the third is a sharing decision §8 has no cell for, and §7.1 of the asset design assigns media '
  'readiness to asset_versions.status by name. NO search_text: §5.1 requires a GIN trigram index on '
  'it and pg_trgm is not in batch 000''s approved extension set.';
comment on column app.assets.workspace_id is
  'MEDIA-2. The canonical tenant scope, and the column every policy on this table resolves '
  'membership against. Excluded from every UPDATE grant, so a row cannot be moved between tenants '
  'even by a caller both policy halves would admit (§8.5).';
comment on column app.assets.business_profile_id is
  'MEDIA-2. The canonical Business scope, required of every asset row by §3.3 and by §4 invariant 3, '
  'and the column every child copies and is held to by a composite foreign key. Excluded from every '
  'UPDATE grant: §8.5 forbids moving a row across tenant OR scope with an update.';
comment on column app.assets.page_context_profile_id is
  'MEDIA-2. NULL for an asset of the whole Business; set for one restricted to a Page (§3.3, §4 '
  'invariant 3). A nullable OVERRIDE and never a substitute for the Business scope. It is the ONLY '
  'page column in this batch: the three child tables carry none, because a nullable copy could not '
  'be held equal to this one under any foreign key this schema can write (040''s argument about a '
  'version''s page, 070''s about a source''s).';
comment on column app.assets.current_version_id is
  'MEDIA-2. §4.1: "ชี้ version ที่หน้า Asset detail แสดง แต่ Content ห้ามใช้ pointer นี้" — the '
  'detail view''s pointer, and never the pin a content version holds, which is '
  'content_asset_links.asset_version_id. Carries a scope-path foreign key into app.asset_versions '
  'over (workspace_id, business_profile_id, asset_id, id), so it cannot name a version of another '
  'asset or another tenant. NOTHING CAN SET IT TODAY: outside every INSERT grant because no version '
  'exists when the asset is inserted, and outside every UPDATE grant because which version is '
  'current is the act of publishing one rather than a field a client edits (080''s sentence). It is '
  'permanently null until a command function exists, and that is recorded as an open blocker.';
comment on column app.assets.deleted_at is
  'MEDIA-2. §11.5: "User delete = move to Trash; hide from normal query". The ARCHIVE half of '
  '§8.2''s "Asset upload/edit/archive", as a timestamp rather than as a status value — no document '
  'enumerates an asset''s states in a source of truth this batch answers to, and §8.5 requires a '
  'soft delete through a typed lifecycle field rather than a broad user DELETE. It is one of the two '
  'columns a client may write on this table.';
comment on column app.assets.purge_after is
  'MEDIA-2. §4.1: "เวลา earliest hard purge". NOT NULL is deliberately NOT used and NO DEFAULT is '
  'set: §10 gives ASSET-ORIGINAL "Trash 30 วัน" and §10''s own header makes every number in that '
  'table an engineering default requiring Product/Security/Legal approval before Paid Beta, so a '
  'default here would close an unapproved decision with a column. OUTSIDE EVERY CLIENT UPDATE GRANT: '
  'a purge window a client can push forward is not a window. app_worker holds it, because computing '
  'it from an approved policy is the service''s act.';
comment on column app.assets.created_by is
  'AUTH-3. The member who uploaded it, asserted equal to the JWT subject by the INSERT policy (§8.5, '
  '§8.6 case 8). Not FK-constrained: §11.2 forbids cascade-deleting history when a member is removed '
  'and requires the actor field be anonymized instead.';
comment on column app.assets.updated_by is
  'AUTH-3. The member who last edited or trashed it. See created_by; §8.6 case 8 is live on this '
  'column in the UPDATE policy as well.';


-- ---------------------------------------------------------------------------------------------
-- app.asset_versions — the immutable physical object. A locator and a digest, never the bytes.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` and `business_profile_id` (§3.3), tied to its asset by a composite
-- foreign key over the whole scope path. NO page column: see the header.
--
-- IMMUTABLE IN EVERY COLUMN EXCEPT `status`, `object_key`, `purged_at` AND `updated_at`, which is
-- 070's snapshot shape and is asserted PER COLUMN against the live ACL rather than against the grant
-- text below, because a grant made by a LATER batch would not appear in this file at all. The
-- table's full column list is ALSO held to an allowlist, which is the MEDIA-2 control: the bytes
-- live in a private bucket and a later batch that adds a column to hold them fails the migration.
create table if not exists app.asset_versions (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  asset_id                 uuid        not null,
  -- §4.2: "เริ่ม 1 และเพิ่มทีละหนึ่งต่อ Asset". The floor is a CHECK; the "increment by one" half is
  -- a property of a SEQUENCE OF ROWS that no CHECK can read, and it is not invented as a trigger.
  version_no               integer     not null,
  -- §4.2: "lineage ของ crop/edit/derivative". A version of the SAME asset, held there by the scope
  -- path in its own foreign key.
  parent_version_id        uuid,
  -- §4.2 enumerates exactly six.
  purpose                  text        not null,
  -- §4.2: "`facebook`, `instagram` เมื่อเป็น platform-ready". Enumerated, and bound to the purpose
  -- it belongs to by a constraint rather than by the comment.
  platform                 text,
  -- THE LOCATOR, THREE COLUMNS. §4.2 enumerates the providers; §3.1 of the object storage lifecycle
  -- contract makes Supabase private buckets the baseline and R2 a backup target.
  storage_provider         text        not null,
  bucket                   text        not null,
  -- THE KEY, AND IT IS NULLABLE BECAUSE §10 REMOVES IT. ASSET-ORIGINAL''s final behavior is "purge
  -- object, versions, signed access; verify deletion" and §9.3/11 of the storage contract makes that
  -- "อัปเดต `deleted_at/purged_at` แบบ idempotent" — an update, not a row removal, which §11.5
  -- confirms ("visible to support as redacted status"). A purged version is a row whose locator is
  -- gone and whose digest remains.
  object_key               text,
  -- §4.2: "แสดงเฉพาะผู้มีสิทธิ์ ไม่ใช้เป็น object key". Stored, access-restricted by a column-scoped
  -- grant and a policy; the ENCRYPTED half of §4.2 of the storage contract is platform encryption at
  -- rest and is not a column. In the blockers.
  original_filename        text,
  -- §4.2: "อ่านจาก file signature" — §4.2 of the storage contract: "MIME type และ extension ต้องมา
  -- จาก content sniffing ที่ฝั่ง server ไม่เชื่อ extension จาก client". The column name carries the
  -- rule: it is what was DETECTED and never what was declared.
  detected_mime            text        not null,
  byte_size                bigint      not null,
  width                    integer,
  height                   integer,
  duration_ms              integer,
  -- THE DIGEST, AND IT OUTLIVES THE OBJECT. §9.3: "Asset checksum/content hash: hash เพื่อ
  -- integrity/dedup ไม่ใช่ secret" — both jobs, and both need it to survive a purge. `bytea` with a
  -- length floor rather than `text`, which is 010''s treatment of an invitation''s token_hash, 070''s
  -- of a snapshot digest and 131''s of a provider digest: a text column admits the empty string and
  -- a three-character "hash".
  sha256                   bytea       not null,
  -- §4.2 enumerates exactly seven, and §4 invariant 5 — the canonical document, not the plan —
  -- names `ready` among them in terms: "Content/Publish ที่ใช้สื่อต้อง pin `asset_version_id` ที่
  -- `ready` และ rights valid".
  status                   text        not null,
  -- Null until the object is gone. With it, "this repository is holding an object past its own
  -- stated limit" is a query rather than a guess; without it, an overdue version and a purged one
  -- are the same row (070''s `purged_at`, same reason).
  purged_at                timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  constraint asset_versions_version_no_positive check (version_no >= 1),
  constraint asset_versions_purpose_known
    check (purpose in ('original', 'edited', 'crop', 'preview', 'poster', 'platform_ready')),
  constraint asset_versions_platform_known
    check (platform is null or platform in ('facebook', 'instagram')),
  -- §4.2 sets the platform "เมื่อเป็น platform-ready". This follows from the two columns rather than
  -- from a vocabulary somebody would have to choose, which is the only kind of lifecycle rule batch
  -- 070 held itself entitled to state.
  constraint asset_versions_platform_belongs_to_platform_ready
    check (platform is null or purpose = 'platform_ready'),
  constraint asset_versions_storage_provider_known
    check (storage_provider in ('supabase', 'r2')),
  constraint asset_versions_status_known
    check (status in ('pending_upload', 'verifying', 'processing', 'ready', 'rejected', 'failed',
                      'purged')),
  -- §4.2: "ต้อง `>= 0`".
  constraint asset_versions_byte_size_not_negative check (byte_size >= 0),
  -- §4.2: "pixel; ต้อง `> 0` เมื่อมีค่า".
  constraint asset_versions_pixel_dimensions_positive
    check ((width is null or width > 0) and (height is null or height > 0)),
  constraint asset_versions_duration_not_negative
    check (duration_ms is null or duration_ms >= 0),
  -- A FLOOR rather than an equality, 070''s and 131''s treatment: sha-256 is 32 bytes, a stronger
  -- digest is longer, and a floor stops a short string being stored in a column the schema calls a
  -- digest.
  constraint asset_versions_sha256_is_a_digest check (octet_length(sha256) >= 32),
  --
  -- THE CONSTRAINT THE PURGE RULE LIVES IN, and the one line in this file that implements
  -- CONTRIBUTING_AGENTS.md's "never recursively delete a user-supplied prefix" as DATA.
  --
  -- A stored key must name ONE object. §4.2 of the object storage lifecycle contract forbids "`../`,
  -- URL-encoded separator, WILDCARD หรือ user-controlled segment" in a key, and §9.3 requires the
  -- purge algorithm to "reject หาก prefix ว่าง, กว้างกว่าระดับ workspace, มี WILDCARD, parse ไม่ผ่าน".
  -- The trailing slash is the half that matters most and is refused separately below in this same
  -- expression: a key ending in `/` IS a folder, and a manifest entry that is a folder is the
  -- recursive prefix delete the rule forbids, arriving as data rather than as a statement.
  --
  -- Each clause is written so a reviewer can check it by eye rather than parse one pattern that
  -- tried to express all of them (070''s rule about its URI constraints).
  constraint asset_versions_object_key_names_one_object check (
    object_key is null or (
      length(btrim(object_key)) > 0
      and length(object_key) <= 1024
      and position('%' in object_key) = 0
      and position('*' in object_key) = 0
      and position('?' in object_key) = 0
      and position('..' in object_key) = 0
      and left(object_key, 1) <> '/'
      and right(object_key, 1) <> '/')),
  -- §7 of the object storage lifecycle contract gives `purged` the meaning "object ถูกลบแล้ว", so
  -- the vocabulary and the stamp are bound to each other rather than free to disagree.
  constraint asset_versions_purged_status_agrees
    check ((status = 'purged') = (purged_at is not null)),
  -- §10''s final behavior, as a constraint. A row that says it was purged while still naming an
  -- object is a row whose two halves disagree about whether the bytes exist (070''s
  -- research_snapshots_purged_row_names_no_object, same sentence).
  constraint asset_versions_purged_row_names_no_object
    check (purged_at is null or object_key is null),
  constraint asset_versions_asset_scope_fk
    foreign key (workspace_id, business_profile_id, asset_id)
    references app.assets (workspace_id, business_profile_id, id),
  -- A parent version is a version of the SAME asset in the same tenant. The scope path here carries
  -- the asset as well, which is what stops a crop claiming a parent from another asset (080''s
  -- content_versions_parent_scope_fk, same shape).
  constraint asset_versions_parent_scope_fk
    foreign key (workspace_id, business_profile_id, asset_id, parent_version_id)
    references app.asset_versions (workspace_id, business_profile_id, asset_id, id),
  -- §4.2: "unique `(asset_id, version_no)`", over the whole scope path.
  constraint asset_versions_asset_version_key
    unique (workspace_id, business_profile_id, asset_id, version_no),
  -- §4.2: "unique `(storage_provider, bucket, object_key)`". Two rows may not name the same object.
  -- Nulls are DISTINCT here, deliberately and unlike the link key below: every purged row has a null
  -- key and they must not collide with each other.
  constraint asset_versions_object_location_key
    unique (storage_provider, bucket, object_key),
  -- §4.2: "unique `(id, asset_id)` สำหรับตรวจ `assets.current_version_id`" — over the whole scope
  -- path, so it is also the target of the parent key above and of the link''s asset-side key.
  constraint asset_versions_asset_scope_id_key
    unique (workspace_id, business_profile_id, asset_id, id),
  constraint asset_versions_scope_key unique (workspace_id, business_profile_id, id)
);

comment on table app.asset_versions is
  'Owner: A4 Asset (asset.core, batch 100). Canonical scope workspace_id and business_profile_id '
  '(§3.3), tied to its asset by a composite foreign key over the whole scope path so an unrelated '
  'Workspace/Business/asset triple fails at the database (§4 invariant 10). NO page column: a '
  'nullable copy of the asset''s page could not be held equal to it by any foreign key (MATCH SIMPLE '
  'skips a null), so the restrictive policy makes a version reachable exactly when its asset is. '
  'Sensitivity MEDIA-2 — §9.1 storage rule "private bucket; short signed access", client projection '
  '"authorized signed URL only" — which is why THE BYTES ARE NOT HERE: the row holds a locator '
  '(storage_provider, bucket, object_key) and a digest (sha256) and an apply-time COLUMN ALLOWLIST '
  'keeps it that way (060''s mechanism for a plaintext credential, 070''s for a captured page). '
  'Retention ASSET-ORIGINAL, whose numbers are not encoded. IMMUTABLE in every column except '
  'status, object_key, purged_at and updated_at — §5''s mutability column says "versions IMMUTABLE" '
  'and §4.2 says "ห้าม UPDATE object location/content หลัง ready; การแก้ไขสร้าง row ใหม่"; the four '
  'that move are §7.1''s media-readiness column and §10''s purge, asserted per column against the '
  'live ACL. object_key is NULLABLE because §10 purges it and §9.3/11 makes that an UPDATE rather '
  'than a row removal; sha256 is NOT NULL because a redacted row must still say which bytes it '
  'described. asset_versions_object_key_names_one_object is where '
  'CONTRIBUTING_AGENTS.md''s "never recursively delete a user-supplied prefix" lives as data.';
comment on column app.asset_versions.object_key is
  'MEDIA-2. The exact key of exactly one object in exactly one bucket, and NEVER a prefix: '
  'asset_versions_object_key_names_one_object refuses a wildcard, a `..` traversal, a leading slash '
  'and a TRAILING SLASH, because a key ending in `/` is a folder and "delete everything under it" is '
  'the recursive prefix delete CONTRIBUTING_AGENTS.md forbids and §9.3 of the object storage '
  'lifecycle contract rejects by name. NULLABLE: §10''s ASSET-ORIGINAL purges the object and §9.3/11 '
  'records that as an update of purged_at, so a purged row no longer says where the bytes were. '
  'THIS COLUMN IS NOT THE APPROVED MANIFEST: §9.3 requires a snapshot of exact keys with checksums '
  'and an actor approval before any deletion, no table in §6''s registry owns one, and that gap is '
  'an open blocker rather than something this constraint closes.';
comment on column app.asset_versions.sha256 is
  'MEDIA-2. §9.3: "Asset checksum/content hash: hash เพื่อ integrity/dedup ไม่ใช่ secret" — both '
  'jobs. bytea with a 32-byte floor rather than text, so an empty string or a three-character '
  '"hash" cannot be stored in a column the schema calls a digest. NOT NULL and outside every UPDATE '
  'grant: it is what a reconciliation compares a provider''s answer against (§15 of the object '
  'storage lifecycle contract), and a digest a granted path can rewrite is not a digest. It '
  'OUTLIVES the object, which is what makes a purged row the "redacted status" §11.5 requires '
  'rather than an empty one.';
comment on column app.asset_versions.status is
  'MEDIA-2. §7.1 of the asset design assigns media readiness to this column by name, and §4 '
  'invariant 5 — the canonical document — names one of its values in terms: "Content/Publish ที่ใช้'
  'สื่อต้อง pin asset_version_id ที่ `ready` และ rights valid". One of the four columns this '
  'otherwise immutable row may move, and no client role holds it: readiness is what a processor '
  'observes, not what an editor declares.';
comment on column app.asset_versions.original_filename is
  'PII-2 within a MEDIA-2 row, which is why it is outside the grant most readers would expect it in. '
  '§4.2: "แสดงเฉพาะผู้มีสิทธิ์ ไม่ใช้เป็น object key", and §4.2 of the object storage lifecycle '
  'contract requires the uploaded filename be kept "แบบเข้ารหัส/จำกัดสิทธิ์". This schema supplies '
  'the ACCESS-RESTRICTED half through a column-scoped grant behind a policy; it does NOT supply the '
  'encrypted half, which is platform encryption at rest rather than a column, and that is recorded '
  'as an open blocker rather than implied by the word in the comment.';


-- ---------------------------------------------------------------------------------------------
-- app.asset_rights — ownership, licence and consent. RIGHTS-3, and the proof is not projected.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` and `business_profile_id` (§3.3), tied to its asset by a composite
-- foreign key over the whole scope path. NO page column, for the reason both other children carry
-- none.
--
-- MUTABLE, on §8.2's sentence: "Asset rights/share | Y | Y | N | P | N | P". Owner and admin hold
-- the verb, the EDITOR IS `N`, and the approver's `P` is refused.
create table if not exists app.asset_rights (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  asset_id                 uuid        not null,
  -- §4.5 enumerates exactly four for each of these two.
  rights_type              text        not null,
  rights_status            text        not null,
  -- RIGHTS-3, and PII-2 when the owner is a person. Outside the client SELECT grant: §9.1 projects
  -- "status/expiry, proof by permission" and a rights holder's name is neither.
  owner_name               text,
  -- §4.5: "`facebook`, `instagram`, `paid_ads` ตาม policy". An array rather than three booleans
  -- because the document gives it as one list; the CHECK is containment, so an unknown channel is
  -- refused by the database rather than stored and ignored.
  allowed_channels         text[]      not null default '{}'::text[],
  -- §4.5: "ค่าเริ่มต้น false เมื่อไม่ทราบ", for both. This is the one place in this batch a DEFAULT
  -- is written, and it is written because the document states the default in terms and states it in
  -- the SAFE direction — an unknown right is not a granted right.
  paid_ads_allowed         boolean     not null default false,
  ai_edit_allowed          boolean     not null default false,
  starts_at                timestamptz,
  -- §10''s RIGHTS-PROOF is "อายุ Asset use + 2 ปี default" and §10''s header makes that unapproved,
  -- so there is no default and no arithmetic: every rights record states its own expiry or none.
  expires_at               timestamptz,
  -- §4.5: "หลักฐาน consent/license". The proof may itself be an asset in this workspace, held there
  -- by a scope-path foreign key, or an external URL whose scheme is an allowlist of one for the
  -- reason 070 gave about a column a worker dereferences.
  proof_asset_id           uuid,
  proof_url                text,
  -- §4.5: "Admin/Approver ใช้ ไม่ส่งเข้า AI โดยอัตโนมัติ".
  note                     text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  updated_by               uuid,
  constraint asset_rights_type_known
    check (rights_type in ('owned', 'licensed', 'consent', 'unknown')),
  constraint asset_rights_status_known
    check (rights_status in ('valid', 'expiring', 'expired', 'blocked')),
  constraint asset_rights_channels_known
    check (allowed_channels <@ array['facebook', 'instagram', 'paid_ads']::text[]),
  -- A validity window cannot close before it opens. It uses no number, which is the whole point.
  constraint asset_rights_validity_window
    check (expires_at is null or starts_at is null or expires_at > starts_at),
  -- 070''s two constraints on the one column a worker dereferences, unchanged and for the same
  -- reason: independent security review found the deny-list form of a reference field accepting
  -- `HTTPS://…`, `//host/x`, `file:///etc/passwd`, `javascript:` and `../../../etc/passwd`. A
  -- consent proof is fetched by whatever renders it, so the scheme is an ALLOWLIST of one.
  constraint asset_rights_proof_url_scheme check (
    proof_url is null or
    proof_url ~ '^https://[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?(?::[0-9]{1,5})?(?:/[^[:space:]"''<>\\]*)?$'),
  constraint asset_rights_proof_url_no_traversal
    check (proof_url is null or position('..' in proof_url) = 0),
  constraint asset_rights_asset_scope_fk
    foreign key (workspace_id, business_profile_id, asset_id)
    references app.assets (workspace_id, business_profile_id, id),
  -- The proof asset is an asset of the SAME Business in the SAME Workspace. Without the scope path
  -- this would be a dangling cross-tenant citation, which is the defect batch 080''s own open
  -- blocker 2 records against a reference it could not constrain.
  constraint asset_rights_proof_asset_scope_fk
    foreign key (workspace_id, business_profile_id, proof_asset_id)
    references app.assets (workspace_id, business_profile_id, id),
  constraint asset_rights_scope_key unique (workspace_id, business_profile_id, id)
);

comment on table app.asset_rights is
  'Owner: A4 Asset (asset.core, batch 100). Canonical scope workspace_id and business_profile_id '
  '(§3.3), tied to its asset by a composite foreign key over the whole scope path; no page column, '
  'for the reason every child in this batch carries none. Sensitivity RIGHTS-3 — §9.1 '
  '"license/consent/proof/expiry", storage rule "private media/evidence + audit", client projection '
  '"status/expiry, PROOF BY PERMISSION" — and that projection is implemented as a COLUMN LIST: '
  'owner_name, proof_asset_id, proof_url and note are outside the authenticated SELECT grant, '
  'because "by permission" names a permission this repository does not define. Retention '
  'RIGHTS-PROOF, whose "2 ปี default" is not encoded. MUTABLE on §8.2''s sentence "Asset '
  'rights/share | Y | Y | N | P | N | P": owner and admin hold the verb, THE EDITOR IS N here where '
  'they were Y for upload two rows above, and the approver''s P is refused because no document '
  'defines the capability set (RFC-2026-020 §8). The INSERT half is batch 100''s READING of a row '
  'that names an operation rather than an SQL verb, stated so a reviewer can refuse it: under the '
  'narrower reading the table would be unwritable by anything, and §4 invariant 5 makes valid rights '
  'a precondition of using any media at all. §6.2''s "Audit ทุกครั้ง" is NOT implemented — binding '
  'an audit record to the act it describes is what a command function is for, and none exists.';
comment on column app.asset_rights.rights_status is
  'RIGHTS-3, and one of the two things §9.1 lets a client see. §4.5 enumerates four values. NOTHING '
  'MOVES IT: §5.1 of the asset design names an index for a "Rights expiry notification" sweep over '
  'expires_at where rights_status in (valid, expiring), and §8 has no `S` cell anywhere for a rights '
  'row, so app_worker holds SELECT and no INSERT or UPDATE here and the sweep has no writer. Where a '
  'document is silent the cell is denied; the gap is an open blocker rather than a grant invented to '
  'close it.';
comment on column app.asset_rights.proof_url is
  'RIGHTS-3. Outside the client SELECT grant (§9.1: "proof by permission"). Its scheme is an '
  'allowlist of one and `..` is refused, because CTR-JOB-001''s x-reference-rule records a deny-list '
  'form of a reference field accepting file:///etc/passwd, javascript:, //host and traversal — '
  'findings about data something dereferences, which is what a consent proof is. 070''s two '
  'constraints, unchanged.';
comment on column app.asset_rights.paid_ads_allowed is
  'RIGHTS-3. §4.5: "ค่าเริ่มต้น false เมื่อไม่ทราบ" — the document states this default in terms and '
  'states it in the safe direction, which is why it is the only DEFAULT this batch writes on a '
  'column carrying a decision. An unknown right is not a granted right.';


-- ---------------------------------------------------------------------------------------------
-- app.content_asset_links — the pin §4 invariant 5 requires. Append-only.
-- ---------------------------------------------------------------------------------------------
--
-- Canonical scope `workspace_id` and `business_profile_id` (§3.3). TWO PARENTS, both named by §4's
-- ERD — `CONTENT_VERSION ||--o{ CONTENT_ASSET_LINK : uses` and `ASSET_VERSION ||--o{
-- CONTENT_ASSET_LINK : pins` — and the restrictive narrowing below names both.
--
-- APPEND-ONLY on batch 100's own reading of §4.7's rule "การแก้ link หลังอนุมัติต้อง invalidate
-- Approval": the sentence conditions mutation on a mechanism batch 090 has not written. See the
-- header.
create table if not exists app.content_asset_links (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid        not null,
  business_profile_id      uuid        not null,
  content_version_id       uuid        not null,
  -- §4.7: "optional `content_variant_id`". It participates in the logical key below, which is the
  -- whole reason that key carries three words no other unique constraint in this batch carries.
  content_variant_id       uuid,
  asset_id                 uuid        not null,
  -- §4 invariant 5: "Content/Publish ที่ใช้สื่อต้อง pin `asset_version_id`". THE PIN — never
  -- app.assets.current_version_id, which §4.1 forbids content from using.
  asset_version_id         uuid        not null,
  -- §4.7 enumerates exactly six.
  role                     text        not null,
  sort_order               integer     not null,
  -- §4.7: "optional เมื่อ link เฉพาะ Facebook/Instagram".
  platform                 text,
  created_at               timestamptz not null default now(),
  created_by               uuid,
  constraint content_asset_links_role_known
    check (role in ('cover', 'feed', 'story', 'reel', 'carousel_item', 'thumbnail')),
  constraint content_asset_links_sort_order_not_negative check (sort_order >= 0),
  constraint content_asset_links_platform_known
    check (platform is null or platform in ('facebook', 'instagram')),
  constraint content_asset_links_version_scope_fk
    foreign key (workspace_id, business_profile_id, content_version_id)
    references app.content_versions (workspace_id, business_profile_id, id),
  -- §4.7: "version ต้องอยู่ใต้ Asset ที่ระบุ", as a constraint rather than as a rule. The scope path
  -- carries the asset, which is what makes the sentence checkable at the database.
  constraint content_asset_links_asset_version_scope_fk
    foreign key (workspace_id, business_profile_id, asset_id, asset_version_id)
    references app.asset_versions (workspace_id, business_profile_id, asset_id, id),
  -- THE VARIANT REFERENCE CARRIES THE TENANT AND NOT THE VERSION, and that shortfall is reported
  -- rather than hidden. app.content_variants' only composite unique keys are
  -- (workspace_id, business_profile_id, id) and its logical key; there is no
  -- (workspace_id, business_profile_id, content_version_id, id) for a four-column path to reference,
  -- and adding one is a change to a table batch 080 owns, which ownership forbids this batch from
  -- making. So this key guarantees the variant belongs to this TENANT and does not guarantee it
  -- belongs to the content version named beside it. That is batch 080''s own open blocker 2 in a new
  -- family, and it is in this batch''s blockers with the constraint owed to 080''s owner.
  constraint content_asset_links_variant_scope_fk
    foreign key (workspace_id, business_profile_id, content_variant_id)
    references app.content_variants (workspace_id, business_profile_id, id),
  -- §4.7: "unique `(content_version_id, content_variant_id, role, sort_order)`", over the whole
  -- scope path.
  --
  -- `NULLS NOT DISTINCT` IS THE DIFFERENCE BETWEEN THE RULE AND A COMMENT ABOUT IT, and batch 080
  -- found this exact defect in its own logical key during CI: Postgres defaults to NULLS DISTINCT,
  -- so under the default two rows whose `content_variant_id` is null would NOT collide and "one
  -- cover at position 1 per version" would hold for nobody — which is every link that is not
  -- variant-specific, i.e. the common case. Declared this way the null participates in the key. The
  -- apply-time block asserts the flag from `pg_index`, because the two spellings differ by three
  -- words and produce tables that behave differently.
  constraint content_asset_links_logical_key
    unique nulls not distinct
      (workspace_id, business_profile_id, content_version_id, content_variant_id, role, sort_order),
  constraint content_asset_links_scope_key unique (workspace_id, business_profile_id, id)
);

comment on table app.content_asset_links is
  'Owner: A4 Asset (asset.core, batch 100). Canonical scope workspace_id and business_profile_id '
  '(§3.3). TWO PARENTS, both drawn by §4''s ERD (CONTENT_VERSION uses, ASSET_VERSION pins), and the '
  'restrictive narrowing names BOTH, ANDed, so the row''s reach is the INTERSECTION of the asset''s '
  'and the content version''s — a narrowing that named one parent would make a link reachable '
  'through the half its reader happens to hold. It is the expression of §4 invariant 5''s pin, and '
  'it pins asset_version_id and never app.assets.current_version_id, which §4.1 forbids content from '
  'using. Sensitivity CONTENT-2/MEDIA-2; retention CONTENT-HISTORY on the content side. APPEND-ONLY '
  '— no role holds UPDATE or DELETE, as an absent grant AND an absent policy asserted both ways, and '
  'there is no updated_at. That disposition is batch 100''s READING and not a quotation: §5 names '
  'only versions immutable, and the sentence it is read from is §4.7''s own rule "การแก้ link หลัง'
  'อนุมัติต้อง invalidate Approval", which conditions mutation on a mechanism batch 090 has not '
  'written — §8.2''s "Approved/published version UPDATE/DELETE | N | N | N | N | N | N" is what '
  'decides the case where the condition cannot be met. NO CLIENT INSERT: reading §8.2''s "Asset '
  'SELECT/use" as one would give a VIEWER a write on content, which "Content create/edit/version" '
  'two rows above marks N for the approver and the viewer, and 080 gives app.content_versions no '
  'INSERT grant to any role at all. app_worker holds insert on §4.7''s own sentence "service ต้อง'
  'สร้าง business-safe link/clone ตาม policy", with no policy and therefore no reachable path.';
comment on column app.content_asset_links.asset_version_id is
  'MEDIA-2. §4 invariant 5''s pin: "Content/Publish ที่ใช้สื่อต้อง pin asset_version_id ที่ `ready` '
  'และ rights valid". THIS SCHEMA ENFORCES THE PIN AND NEITHER CONDITION. `ready` is a lifecycle '
  'state on another table, which a CHECK cannot read and a policy could only read through the '
  'coupling 020 rejects; `rights valid` is a state app.asset_rights carries per asset with nothing '
  'binding it to the instant the link is made. Both are open blockers, and a reader who takes the '
  'foreign key for the invariant has taken it for more than it is.';
comment on column app.content_asset_links.content_variant_id is
  'CONTENT-2. Nullable (§4.7: "optional"), and it PARTICIPATES IN THE LOGICAL KEY under NULLS NOT '
  'DISTINCT — under the default, two variant-less links could share a (version, role, sort_order) '
  'and §4.7''s uniqueness rule would hold for nobody. Its foreign key carries the tenant and NOT the '
  'content version, because app.content_variants has no composite unique over '
  '(workspace_id, business_profile_id, content_version_id, id) to reference and adding one is a '
  'change to a table batch 080 owns. An open blocker owed to 080''s owner.';


-- ---------------------------------------------------------------------------------------------
-- The asset's pointer at its own current version, added after both tables exist.
-- ---------------------------------------------------------------------------------------------
--
-- Declared here rather than inside `create table app.assets` because it references a table created
-- below it. The column is nullable, so the insert order is asset (null), then version, then set it;
-- no deferral is needed and this batch introduces none (080's paragraph, same schema).
alter table app.assets
  drop constraint if exists assets_current_version_scope_fk;
alter table app.assets
  add constraint assets_current_version_scope_fk
  foreign key (workspace_id, business_profile_id, id, current_version_id)
  references app.asset_versions (workspace_id, business_profile_id, asset_id, id);


-- ---------------------------------------------------------------------------------------------
-- Indexes. §3.3: every FK, every RLS-predicate column and every keyset cursor column is indexed.
-- ---------------------------------------------------------------------------------------------
--
-- Already covered by a constraint's own index, and therefore NOT repeated below:
--
--   assets (workspace_id, business_profile_id)          — assets_scope_key, which leads with exactly
--                                                         the pair that is the Business foreign key
--                                                         AND both RLS-predicate columns.
--   asset_versions (workspace_id, business_profile_id, asset_id)
--                                                       — asset_versions_asset_version_key and
--                                                         asset_versions_asset_scope_id_key.
--   asset_rights (workspace_id, business_profile_id)    — asset_rights_scope_key.
--   content_asset_links (workspace_id, business_profile_id, content_version_id, …)
--                                                       — content_asset_links_logical_key.
--   every id column                                     — the primary keys.

-- The Page override's foreign key, and the third predicate column of the asset's narrowing.
create index if not exists assets_page_scope_idx
  on app.assets (workspace_id, business_profile_id, page_context_profile_id);

-- §5.1's first index, and §5.2's keyset cursor "(created_at, id)": "Library grid + cursor
-- pagination". Partial on `deleted_at is null`, which is §5.1's own `where` clause and §11.5's "hide
-- from normal query".
create index if not exists assets_library_keyset_idx
  on app.assets (workspace_id, business_profile_id, created_at desc, id desc)
  where deleted_at is null;

-- §5.1's second index: "Filter รูป/วิดีโอ".
create index if not exists assets_kind_keyset_idx
  on app.assets (workspace_id, business_profile_id, kind, created_at desc)
  where deleted_at is null;

-- §5.1's third index: "Page-only assets".
create index if not exists assets_page_keyset_idx
  on app.assets (workspace_id, page_context_profile_id, created_at desc)
  where page_context_profile_id is not null and deleted_at is null;

-- THE TRASH SWEEP'S OWN INDEX, and the reason `purge_after` is worth having: this is the query that
-- answers "which assets are past their own stated earliest purge". Partial on the columns' own
-- nullability rather than on an invented state vocabulary (070's
-- research_snapshots_unpurged_retention_idx, 050's outbox shape).
create index if not exists assets_trash_purge_due_idx
  on app.assets (purge_after)
  where deleted_at is not null and purge_after is not null;

-- The current-version pointer's foreign key.
create index if not exists assets_current_version_idx
  on app.assets (workspace_id, business_profile_id, current_version_id)
  where current_version_id is not null;

-- §5.1: "`asset_versions(asset_id, version_no desc)` — Asset detail/version history".
create index if not exists asset_versions_asset_history_idx
  on app.asset_versions (workspace_id, business_profile_id, asset_id, version_no desc);

-- §5.1: "`asset_versions(workspace_id, business_profile_id, sha256) where status = 'ready'` — Exact
-- duplicate detection", which is §5.3's "Exact duplicate: SHA-256 เหมือนกันใน Business เดียว".
create index if not exists asset_versions_ready_digest_idx
  on app.asset_versions (workspace_id, business_profile_id, sha256)
  where status = 'ready';

-- The parent-version lineage key.
create index if not exists asset_versions_parent_idx
  on app.asset_versions (workspace_id, business_profile_id, asset_id, parent_version_id)
  where parent_version_id is not null;

-- The purge sweep's own index, from the object side: which objects this repository still holds.
create index if not exists asset_versions_unpurged_idx
  on app.asset_versions (workspace_id, business_profile_id, asset_id)
  where purged_at is null;

-- §5.1: "`asset_rights(workspace_id, business_profile_id, expires_at) where rights_status in
-- ('valid','expiring')` — Rights expiry notification". The index the sweep would read; the sweep has
-- no writer, which is in the blockers.
create index if not exists asset_rights_expiry_idx
  on app.asset_rights (workspace_id, business_profile_id, expires_at)
  where rights_status in ('valid', 'expiring');

-- The rights row's own asset, and the proof asset's.
create index if not exists asset_rights_asset_scope_idx
  on app.asset_rights (workspace_id, business_profile_id, asset_id);

create index if not exists asset_rights_proof_asset_idx
  on app.asset_rights (workspace_id, business_profile_id, proof_asset_id)
  where proof_asset_id is not null;

-- §5.1: "`content_asset_links(content_version_id, sort_order)` — Content preview".
create index if not exists content_asset_links_version_order_idx
  on app.content_asset_links (workspace_id, business_profile_id, content_version_id, sort_order);

-- §5.1: "`content_asset_links(asset_id, created_at desc)` — Used-in list ก่อนลบ", which is §11.5's
-- "block hard purge if referenced" from the reference side. Without it, asking whether an asset is
-- still used scans every link in the database.
create index if not exists content_asset_links_asset_usage_idx
  on app.content_asset_links (workspace_id, business_profile_id, asset_id, created_at desc);

-- The link's asset-version pin and its variant reference, each its own foreign key.
create index if not exists content_asset_links_asset_version_idx
  on app.content_asset_links (workspace_id, business_profile_id, asset_id, asset_version_id);

create index if not exists content_asset_links_variant_idx
  on app.content_asset_links (workspace_id, business_profile_id, content_variant_id)
  where content_variant_id is not null;


-- ---------------------------------------------------------------------------------------------
-- updated_at. §3.2 requires it on every MUTABLE row; batch 000 supplied the trigger helper.
-- ---------------------------------------------------------------------------------------------
--
-- Three triggers, not four. app.content_asset_links is append-only, and adding an updated_at to it
-- would be the first sentence of the table's own comment contradicting itself (020's words, kept by
-- every batch since).
--
-- ALL THREE ARE REACHABLE, and the distinction is 060's correction after independent review compared
-- a comment with a grant. On app.assets and app.asset_rights `authenticated` holds a column-scoped
-- UPDATE behind a policy, so those two fire on a normal client write. On app.asset_versions
-- app_worker holds a column-scoped UPDATE and NO POLICY, so that trigger CAN be fired through a
-- granted path — one that row level security then refuses, which is not the same thing as
-- unreachable and must not be written as if it were.
drop trigger if exists set_updated_at on app.assets;
create trigger set_updated_at before update on app.assets
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.asset_versions;
create trigger set_updated_at before update on app.asset_versions
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on app.asset_rights;
create trigger set_updated_at before update on app.asset_rights
  for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- Row level security. ENABLE and FORCE on every table, unconditionally (RFC-2026-016 §4).
-- ---------------------------------------------------------------------------------------------
alter table app.assets enable row level security;
alter table app.assets force row level security;

alter table app.asset_versions enable row level security;
alter table app.asset_versions force row level security;

alter table app.asset_rights enable row level security;
alter table app.asset_rights force row level security;

alter table app.content_asset_links enable row level security;
alter table app.content_asset_links force row level security;


-- ---------------------------------------------------------------------------------------------
-- Privileges. Deny-by-default needs a grant before RLS is even reached.
-- ---------------------------------------------------------------------------------------------
--
-- §6 invariant 8 puts migration, constraints, indexes, RLS AND grants in one change set.
--
-- `anon` IS GRANTED NOTHING, ANYWHERE IN THIS BATCH, and since 2026-09-06 that is an approved
-- decision rather than an inherited convention: RFC-2026-021 §7/4 decides it in terms and gives the
-- structural reason — the first `anon` grant is not one grant, it is `grant usage on schema app`,
-- and it changes the DENIAL LAYER of every object in `app` at once. Every anonymous case declares
-- `deniedOn: { kind: 'schema', name: 'app' }` for exactly that reason, and the apply-time block
-- asserts the negative.
--
-- `authenticated` HOLDS COLUMN-SCOPED SELECT ON ALL FOUR, AND §9.1's RIGHTS-3 PROJECTION IS A COLUMN
-- LIST. §8.2's "Asset SELECT/use" is `Y` for every built-in role, so every table is readable; but
-- `app.asset_rights` is `RIGHTS-3`, whose client projection is "status/expiry, PROOF BY PERMISSION",
-- so `owner_name`, `proof_asset_id`, `proof_url` and `note` are OUTSIDE the grant. "By permission"
-- names a permission this repository does not define, which is the same refusal the approver's `P`
-- gets, arriving as a missing column rather than as a missing role.
--
-- THE CLIENT WRITE GRANTS ARE EXACTLY THE VERBS §8.2 NAMES AND NOTHING BESIDE THEM:
--
--   app.assets        insert (the upload) and update (title, deleted_at, updated_at, updated_by) —
--                     §8.2's "Asset UPLOAD/EDIT/ARCHIVE". `kind`, `source` and every scope column
--                     are outside the update: changing what an asset IS is none of the three verbs.
--                     `purge_after` and `current_version_id` are outside it too, for their own
--                     reasons in the column comments.
--   app.asset_rights  insert and update on the rights fields — §8.2's "Asset RIGHTS/share", read as
--                     an operation rather than as an SQL verb (see the header).
--
-- app.asset_versions AND app.content_asset_links TAKE NO CLIENT WRITE OF ANY KIND: §5 makes a
-- version immutable, and a link is refused for the two reasons the header gives.
--
-- Everything that says WHICH row it is — the identity and every scope column — is outside every
-- write grant, so §8.5's "ห้ามย้าย row ข้าม tenant ด้วย update" holds here by a COLUMN LIST rather
-- than by the absence of a verb (060's correction, asserted per column at apply time).
grant select (id, workspace_id, business_profile_id, page_context_profile_id, kind, title, source,
              current_version_id, deleted_at, purge_after, created_at, updated_at, created_by,
              updated_by)
  on app.assets to authenticated;
grant insert (workspace_id, business_profile_id, page_context_profile_id, kind, title, source,
              created_by, updated_by)
  on app.assets to authenticated;
grant update (title, deleted_at, updated_at, updated_by) on app.assets to authenticated;

grant select (id, workspace_id, business_profile_id, asset_id, version_no, parent_version_id,
              purpose, platform, storage_provider, bucket, object_key, original_filename,
              detected_mime, byte_size, width, height, duration_ms, sha256, status, purged_at,
              created_at, updated_at, created_by)
  on app.asset_versions to authenticated;

-- §9.1's RIGHTS-3 projection, as a column list. owner_name, proof_asset_id, proof_url and note are
-- deliberately absent: "status/expiry, proof BY PERMISSION".
grant select (id, workspace_id, business_profile_id, asset_id, rights_type, rights_status,
              allowed_channels, paid_ads_allowed, ai_edit_allowed, starts_at, expires_at,
              created_at, updated_at, created_by, updated_by)
  on app.asset_rights to authenticated;
grant insert (workspace_id, business_profile_id, asset_id, rights_type, rights_status, owner_name,
              allowed_channels, paid_ads_allowed, ai_edit_allowed, starts_at, expires_at,
              proof_asset_id, proof_url, note, created_by, updated_by)
  on app.asset_rights to authenticated;
grant update (rights_type, rights_status, owner_name, allowed_channels, paid_ads_allowed,
              ai_edit_allowed, starts_at, expires_at, proof_asset_id, proof_url, note, updated_at,
              updated_by)
  on app.asset_rights to authenticated;

grant select (id, workspace_id, business_profile_id, content_version_id, content_variant_id,
              asset_id, asset_version_id, role, sort_order, platform, created_at, created_by)
  on app.content_asset_links to authenticated;

-- `app_worker` HOLDS GRANTS AND NO POLICY, on all four, which is the shape batch 010 introduced and
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
--   app.assets               select, insert, and UPDATE ON THE THREE COLUMNS THE PURGE AND THE
--                            POINTER MOVE. `title` and `deleted_at` are deliberately NOT among them:
--                            editing and trashing are a person's verbs in §8.2, and a service that
--                            could stamp `deleted_at` could trash a tenant's library.
--   app.asset_versions       select, insert, and UPDATE ON `status`, `object_key`, `purged_at` AND
--                            `updated_at` — §7.1's readiness column and §10's purge, which is the
--                            `S` cell's own statement in both of its shapes.
--   app.asset_rights         SELECT ONLY. §8 has no `S` cell anywhere for a rights row, and where a
--                            document is silent the cell is denied. §5.1's "Rights expiry
--                            notification" sweep therefore has no writer; in the blockers.
--   app.content_asset_links  select and insert, on §4.7's own sentence "service ต้องสร้าง
--                            business-safe link/clone ตาม policy". Append-only: no UPDATE and no
--                            DELETE, for any role.
--
-- NO DELETE ANYWHERE, FOR ANY ROLE. §8.5 has no broad user delete, §11.5 makes a user delete a move
-- to Trash, and the hard purge §8.2 marks `S` is an UPDATE of `purged_at` rather than the removal of
-- a row (§9.3/11 of the object storage lifecycle contract). Batch 160 owns the retention sweep
-- through `app_maintenance`, and this batch grants `app_maintenance` nothing.
grant select (id, workspace_id, business_profile_id, page_context_profile_id, kind, title, source,
              current_version_id, deleted_at, purge_after, created_at, updated_at, created_by,
              updated_by)
  on app.assets to app_worker;
grant insert (id, workspace_id, business_profile_id, page_context_profile_id, kind, title, source,
              created_by)
  on app.assets to app_worker;
grant update (current_version_id, purge_after, updated_at) on app.assets to app_worker;

grant select (id, workspace_id, business_profile_id, asset_id, version_no, parent_version_id,
              purpose, platform, storage_provider, bucket, object_key, original_filename,
              detected_mime, byte_size, width, height, duration_ms, sha256, status, purged_at,
              created_at, updated_at, created_by)
  on app.asset_versions to app_worker;
grant insert (id, workspace_id, business_profile_id, asset_id, version_no, parent_version_id,
              purpose, platform, storage_provider, bucket, object_key, original_filename,
              detected_mime, byte_size, width, height, duration_ms, sha256, status, created_by)
  on app.asset_versions to app_worker;
-- Four columns, and the apply-time block asserts that every other column of this table is unwritable
-- by every role, against the live ACL rather than against this line.
grant update (status, object_key, purged_at, updated_at) on app.asset_versions to app_worker;

grant select (id, workspace_id, business_profile_id, asset_id, rights_type, rights_status,
              owner_name, allowed_channels, paid_ads_allowed, ai_edit_allowed, starts_at, expires_at,
              proof_asset_id, proof_url, note, created_at, updated_at, created_by, updated_by)
  on app.asset_rights to app_worker;

grant select (id, workspace_id, business_profile_id, content_version_id, content_variant_id,
              asset_id, asset_version_id, role, sort_order, platform, created_at, created_by)
  on app.content_asset_links to app_worker;
grant insert (id, workspace_id, business_profile_id, content_version_id, content_variant_id,
              asset_id, asset_version_id, role, sort_order, platform, created_by)
  on app.content_asset_links to app_worker;

-- `app_command` and `app_maintenance` are granted nothing by this batch. There is no specified
-- command surface for asset.core — which is the gap the version half of §8.2's "upload" turns on —
-- and the retention path is batch 160.


-- ---------------------------------------------------------------------------------------------
-- Policies. TO authenticated, for the user paths §8.2 grants.
-- ---------------------------------------------------------------------------------------------
--
-- Every membership question goes through batch 011's helpers and every scope question through batch
-- 021's. Both answer about the CALLER only, so a policy that calls one is asking "may I", never "who
-- else is here". `app.workspace_member_role` returns a role only for an ACTIVE membership, which is
-- where §7's "only status active grants access" and §12.6/5's suspended member live for these
-- tables.

-- --- app.assets ---------------------------------------------------------------------------------

-- §8.2 "Asset SELECT/use" is `Y` for owner, admin, editor, approver and viewer alike, so the
-- predicate tests ACTIVE MEMBERSHIP and not role. A TRASHED asset stays visible to the policy: §11.5
-- makes Trash a thirty-day recovery state with a restore, and a policy that hid a trashed row would
-- make the restore unreachable. "Hide from normal query" is the partial index above and the
-- application's own `where deleted_at is null`, not a boundary.
drop policy if exists assets_select_active_member on app.assets;
create policy assets_select_active_member on app.assets
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- §8.2 "Asset upload/edit/archive" is `Y` for owner, admin AND EDITOR and `N` for approver and
-- viewer. All three `Y` roles are named; the editor is a `Y` here and was a `P` in §8.1, which is
-- 040's distinction and is argued in the header.
--
-- §8.5's INSERT rule in full: "`WITH CHECK` scope ทั้งหมด; user action ตรวจ
-- `created_by = (select auth.uid())`". Both halves are present — the scope half is the restrictive
-- narrowing below, which applies `FOR ALL` and therefore to this INSERT as well.
drop policy if exists assets_insert_writer on app.assets;
create policy assets_insert_writer on app.assets
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
  );

-- USING and WITH CHECK both present, as §8.5 requires of every UPDATE policy: without the second, a
-- row admitted by the first could be updated out of the scope that admitted it. They are asserted
-- separately, because `polqual` and `polwithcheck` are two catalog columns and a reversal that
-- gutted one while leaving the other intact is invisible to a test that reads only one.
drop policy if exists assets_update_writer on app.assets;
create policy assets_update_writer on app.assets
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor'))
  with check (
    updated_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin', 'editor')
  );

-- THE POLICY THE BUSINESS/PAGE DUALITY LIVES IN, and it is 040's, unchanged, on the one table in
-- this batch that carries both columns. A business-level asset is narrowed by the Business question
-- and a page-level asset by the Page question, decided per row by whether the override is set.
-- Neither branch can be dropped: asking the Business question about a page-level row would admit
-- every member scoped to a sibling Page, and asking the Page question about a business-level row
-- would pass NULL and deny everyone including the unscoped.
--
-- RESTRICTIVE, because permissive policies OR together and cannot subtract. `admits`, never `covers`
-- — every client cell this batch implements is a `Y`, and §7 reads a member scope as narrowing a
-- role's ceiling rather than granting anything.
drop policy if exists assets_scope_narrows_member on app.assets;
create policy assets_scope_narrows_member on app.assets
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

-- --- app.asset_versions -------------------------------------------------------------------------
--
-- SELECT only. §5 makes a version immutable and §8.2's write rows are about the ASSET, so there is
-- no client INSERT, UPDATE or DELETE policy — and no INSERT policy for the service either, because
-- §8.2's `S` cell is the PURGE and not the creation of a version.

drop policy if exists asset_versions_select_active_member on app.asset_versions;
create policy asset_versions_select_active_member on app.asset_versions
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- THE CHILD'S NARROWING IS ITS ASSET'S OWN REACHABILITY, not a copy of the asset's predicate. The
-- version carries no Page column — the header says why no foreign key could keep such a copy honest
-- — so the question it asks is "is the asset this belongs to reachable by me", which resolves the
-- Business question or the Page question through the asset's own policy set. It cannot drift from
-- that rule because it IS that rule, and the direction is fail-closed: any narrowing added to
-- app.assets later makes this refuse more, never less.
drop policy if exists asset_versions_scope_narrows_member on app.asset_versions;
create policy asset_versions_scope_narrows_member on app.asset_versions
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.assets a
      where a.workspace_id = asset_versions.workspace_id
        and a.business_profile_id = asset_versions.business_profile_id
        and a.id = asset_versions.asset_id
    )
  )
  with check (
    exists (
      select 1 from app.assets a
      where a.workspace_id = asset_versions.workspace_id
        and a.business_profile_id = asset_versions.business_profile_id
        and a.id = asset_versions.asset_id
    )
  );

-- --- app.asset_rights ---------------------------------------------------------------------------

-- §8.2's "Asset SELECT/use" is `Y` for every role and §9.1's projection is the COLUMN LIST in the
-- grant above, not a narrower predicate here: the proof is withheld by privilege and the status is
-- readable by any active member.
drop policy if exists asset_rights_select_active_member on app.asset_rights;
create policy asset_rights_select_active_member on app.asset_rights
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- §8.2 "Asset rights/share" is `Y` for owner and admin, `N` FOR THE EDITOR, `P` for the approver and
-- `N` for the viewer. The two `Y` roles are named and the `P` is refused; the editor's absence here
-- is the one place in this batch a role list differs from its neighbour's and is the reason these
-- two policies are written out rather than shared.
drop policy if exists asset_rights_insert_writer on app.asset_rights;
create policy asset_rights_insert_writer on app.asset_rights
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin')
  );

drop policy if exists asset_rights_update_writer on app.asset_rights;
create policy asset_rights_update_writer on app.asset_rights
  for update to authenticated
  using (app.workspace_member_role(workspace_id) in ('owner', 'admin'))
  with check (
    updated_by = (select auth.uid())
    and app.workspace_member_role(workspace_id) in ('owner', 'admin')
  );

drop policy if exists asset_rights_scope_narrows_member on app.asset_rights;
create policy asset_rights_scope_narrows_member on app.asset_rights
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.assets a
      where a.workspace_id = asset_rights.workspace_id
        and a.business_profile_id = asset_rights.business_profile_id
        and a.id = asset_rights.asset_id
    )
  )
  with check (
    exists (
      select 1 from app.assets a
      where a.workspace_id = asset_rights.workspace_id
        and a.business_profile_id = asset_rights.business_profile_id
        and a.id = asset_rights.asset_id
    )
  );

-- --- app.content_asset_links --------------------------------------------------------------------

drop policy if exists content_asset_links_select_active_member on app.content_asset_links;
create policy content_asset_links_select_active_member on app.content_asset_links
  for select to authenticated
  using (app.is_active_member(workspace_id));

-- TWO PARENTS, ANDed, AND THIS IS THE ONE NARROWING IN THIS BATCH THAT IS NOT 070's SHAPE. §4's ERD
-- gives the row an edge to a CONTENT_VERSION and an edge to an ASSET_VERSION, and §4.7's rules
-- require "same Workspace เสมอ" and "same Business". A narrowing that named only the asset would let
-- a member who can reach the media reach a link into content they cannot see; one that named only
-- the content version would do the reverse. ANDing them makes this row's reach the INTERSECTION of
-- its two parents', which is the only reading under which neither boundary can be walked around
-- through the other.
--
-- The apply-time block asserts BOTH names in BOTH halves, because dropping one from one half is a
-- leak with no symptom on the half a test is not looking at (040's probe, 070's sentence).
drop policy if exists content_asset_links_scope_narrows_member on app.content_asset_links;
create policy content_asset_links_scope_narrows_member on app.content_asset_links
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from app.assets a
      where a.workspace_id = content_asset_links.workspace_id
        and a.business_profile_id = content_asset_links.business_profile_id
        and a.id = content_asset_links.asset_id
    )
    and exists (
      select 1 from app.content_versions v
      where v.workspace_id = content_asset_links.workspace_id
        and v.business_profile_id = content_asset_links.business_profile_id
        and v.id = content_asset_links.content_version_id
    )
  )
  with check (
    exists (
      select 1 from app.assets a
      where a.workspace_id = content_asset_links.workspace_id
        and a.business_profile_id = content_asset_links.business_profile_id
        and a.id = content_asset_links.asset_id
    )
    and exists (
      select 1 from app.content_versions v
      where v.workspace_id = content_asset_links.workspace_id
        and v.business_profile_id = content_asset_links.business_profile_id
        and v.id = content_asset_links.content_version_id
    )
  );


-- ---------------------------------------------------------------------------------------------
-- What this batch asserts about itself, at apply time.
-- ---------------------------------------------------------------------------------------------
--
-- The shape batches 004, 011, 020, 021, 030, 040, 050, 051, 060, 061, 070, 080, 110, 130, 131 and
-- 140 use: a claim that is only a comment is a claim nobody checks. These are the properties of THIS
-- batch answerable from the catalog of the database being migrated, without a committed snapshot and
-- without a test harness. The text half lives in tests/db/identity/identity-isolation.test.mjs and
-- the live behavioural half is `make db-rls-smoke`.
--
-- WHAT IS DELIBERATELY NOT ASSERTED HERE, following 030's rule and 021's scar: 011's apply-time
-- policy count is an APPLIED migration's self-assertion that 021 had to route around rather than
-- amend. So nothing below asserts a property an approved decision or an already-named batch is
-- EXPECTED to change:
--
--   * NOT "no policy names app_worker". RFC-2026-022 §3 classifies this batch's `S` cell BOTH, and
--     positively EXPECTS a policy `TO app_worker` for the CARRIED half once §7 holds. An apply-time
--     assertion against an approved decision's own direction is exactly the trap 011 set for 021.
--   * NOT the role list in any policy, and NOT the number of policies on any table. §8.2's approver
--     `P` is refused on a reading RFC-2026-020 §8 could close, and the rights INSERT is a reading of
--     §8.2's row a reviewer may refuse.
--   * NOT "app.asset_rights holds no service grant". §5.1 names a sweep that needs one and §8 has no
--     cell for it; the day a cell or a command exists, the batch that brings it should not have to
--     amend an applied migration.
--
-- All of those are asserted in the static suite instead, where the batch that changes one edits a
-- line a reviewer reads. What IS asserted here is the set of properties no approved decision is
-- expected to move: the version's immutability and its MEDIA-2 column allowlist, the link's
-- append-only shape, §8.5's per-column rule, the absence of DELETE anywhere, the absence of a prefix
-- column and of an unapproved retention interval, `anon` as a negative, the restrictive narrowings
-- and both of their halves, the logical key's null handling, ENABLE/FORCE and the ownership rules.
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
  -- §9.1's MEDIA-2 storage rule is "private bucket", which is a statement about where the object
  -- lives. 060 wrote the mechanism for a plaintext credential, 070 reused it for a captured page and
  -- 131 for a payment instrument: an ALLOWLIST, because a denylist of column names somebody thought
  -- of is defeated by the one they did not.
  version_columns constant text[] :=
    array['id', 'workspace_id', 'business_profile_id', 'asset_id', 'version_no',
          'parent_version_id', 'purpose', 'platform', 'storage_provider', 'bucket', 'object_key',
          'original_filename', 'detected_mime', 'byte_size', 'width', 'height', 'duration_ms',
          'sha256', 'status', 'purged_at', 'created_at', 'updated_at', 'created_by'];
  -- The four columns an otherwise immutable version may move, and the whole of what any role may
  -- update on it.
  version_mutable constant text[] :=
    array['status', 'object_key', 'purged_at', 'updated_at'];
  asset_tables constant text[] :=
    array['assets', 'asset_versions', 'asset_rights', 'content_asset_links'];
begin
  -- ENABLE and FORCE on all four. The two are DIFFERENT CATALOG COLUMNS and the data package's own
  -- lint rule reads only the first (RFC-2026-016 §4).
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'FORCE is what keeps the table owner subject to the policies, and it is what the '
                   'CI negative control switches off to prove the isolation suite notices.';
  end if;

  -- THE MEDIA-2 COLUMN ALLOWLIST, against the live catalog. §9.1's storage rule for this class is
  -- "private bucket; short signed access" and its client projection is "authorized signed URL
  -- only" — both statements that the object is not in the database. This is what makes that a
  -- control rather than a comment: a later batch that adds `bytes bytea`, `data bytea` or
  -- `thumbnail_base64 text` fails the migration rather than the code review.
  select string_agg(a.attname, ', ' order by a.attname) into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'asset_versions'
     and a.attnum > 0 and not a.attisdropped
     and a.attname::text <> all (version_columns);
  if offending is not null then
    raise exception 'app.asset_versions carries column(s) a MEDIA-2 row may not hold: %', offending
      using hint = '§9.1 gives MEDIA-2 the storage rule "private bucket; short signed access" and '
                   'the client projection "authorized signed URL only", and §1/2 of the asset '
                   'design makes PostgreSQL the source of truth for "metadata, permission, rights, '
                   'relationship, state และ usage" — metadata, not media. The row holds a LOCATOR '
                   '(storage_provider, bucket, object_key) and a DIGEST (sha256) and nothing else. '
                   'An allowlist rather than a denylist, because a denylist of names somebody '
                   'thought of is defeated by the one they did not.';
  end if;

  -- AND NO TABLE IN THIS BATCH CARRIES THE OBJECT BY ANOTHER NAME. The allowlist above protects one
  -- table; the media would most plausibly arrive on the asset row as a thumbnail.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join unnest(array['bytes', 'data', 'blob', 'binary', 'file', 'file_data', 'content',
                            'body', 'image', 'image_data', 'thumbnail', 'thumbnail_data',
                            'thumbnail_base64', 'base64', 'payload', 'preview_data',
                            'poster_data']) as forbidden
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and a.attnum > 0 and not a.attisdropped
     -- `attname` is `name` and the array is `text`; the cast is written rather than left to an
     -- implicit one, which is 050's rule about a parameter whose type is inferred from whichever
     -- context the planner reaches first.
     and a.attname::text = forbidden;
  if offending is not null then
    raise exception 'a batch 100 table carries the media object itself: %', offending
      using hint = '§9.1 puts MEDIA-2 in a private bucket reached by a short signed URL. The '
                   'database holds the locator and the digest. If this is the batch that changes '
                   'that, it edits this assertion in a diff a reviewer reads.';
  end if;

  -- NO COLUMN IN THIS BATCH IS A PREFIX, A GLOB OR A PATTERN. This is CONTRIBUTING_AGENTS.md's
  -- "Production object deletion uses an approved immutable manifest of exact object keys; never
  -- recursively delete a user-supplied prefix" and §9.3's "ห้ามเรียก bulk delete ด้วย unvalidated
  -- prefix ไม่ว่ากรณีใด", as a catalog assertion. A column that held a prefix would make a prefix
  -- purge expressible AS DATA, which is how it would arrive in a manifest nobody reads.
  --
  -- This is a DENYLIST and it is the weaker instrument, which is why app.asset_versions also carries
  -- the full allowlist above; this sweep exists for the other three tables, which do not.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join unnest(array['prefix', 'key_prefix', 'object_prefix', 'path_prefix', 'bucket_prefix',
                            'object_key_prefix', 'glob', 'pattern', 'wildcard', 'key_pattern',
                            'purge_prefix']) as forbidden
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and a.attnum > 0 and not a.attisdropped
     and a.attname::text = forbidden;
  if offending is not null then
    raise exception 'a batch 100 column expresses an object-key PREFIX: %', offending
      using hint = 'CONTRIBUTING_AGENTS.md: "Production object deletion uses an approved immutable '
                   'manifest of exact object keys; never recursively delete a user-supplied '
                   'prefix." §9.3 of the object storage lifecycle contract says the same as a '
                   'กฎบังคับ and requires the algorithm to reject a prefix that is empty, wider '
                   'than a workspace, or contains a wildcard. One row names one object here.';
  end if;

  -- AND THE CONSTRAINT THAT KEEPS A STORED KEY FROM BEING A PREFIX MUST EXIST. A negative is the
  -- strongest thing a lint can hold (RFC-2026-019 §5), and this is its positive twin: the assertion
  -- above refuses a column that is a prefix, and this one refuses the removal of the constraint that
  -- refuses a VALUE that is one.
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'asset_versions'
     and con.contype = 'c'
     and con.conname = 'asset_versions_object_key_names_one_object';
  if count_of <> 1 then
    raise exception 'app.asset_versions has no constraint holding object_key to one exact object'
      using hint = 'A key ending in `/` is a folder and a key containing a wildcard is a pattern; '
                   'either one in a purge manifest is the recursive prefix delete '
                   'CONTRIBUTING_AGENTS.md forbids, arriving as data rather than as a statement.';
  end if;

  -- NO RETENTION NUMBER, FOR ANY OF THE FOUR CLASSES §5 ASSIGNS THIS FAMILY. §10's own header makes
  -- every number in its table an engineering default requiring Product/Security/Legal approval
  -- before Paid Beta, and §15's closing sentence is that an open decision is not an agent's to
  -- choose. This is 070's DATA-DEC-07 assertion applied to ASSET-ORIGINAL, ASSET-DERIVATIVE,
  -- RIGHTS-PROOF and UPLOAD-TEMP at once.
  select string_agg(format('%s on %s', con.conname, c.relname), ', ') into offending
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and con.contype = 'c'
     and pg_catalog.pg_get_constraintdef(con.oid) ~* '\minterval\M';
  if offending is not null then
    raise exception 'a batch 100 constraint encodes a retention interval: %', offending
      using hint = '§10 gives ASSET-ORIGINAL "Trash 30 วัน" and RIGHTS-PROOF "2 ปี default", and '
                   '§10''s header makes both unapproved engineering defaults. The only thing this '
                   'batch asserts about retention is that a purge window cannot open before the '
                   'deletion that starts it, which uses no number.';
  end if;

  -- AND NEITHER RETENTION COLUMN CARRIES A DEFAULT. `atthasdef` is a catalog column and is the only
  -- place the difference between "every writer states a limit" and "every row inherits thirty days"
  -- is recorded.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and ((c.relname = 'assets' and a.attname = 'purge_after')
       or (c.relname = 'asset_rights' and a.attname = 'expires_at'))
     and a.atthasdef;
  if offending is not null then
    raise exception 'a batch 100 retention column carries a default: %', offending
      using hint = 'A default would make every row silently assert an unapproved number, which is '
                   'the decision arriving as a column (010''s refusal for DATA-DEC-04, 130''s for '
                   'BILL-DEC-012, 061''s for a reservation''s expiry, 070''s for DATA-DEC-07).';
  end if;

  -- THE VERSION IS IMMUTABLE EXCEPT THE FOUR, PER COLUMN, AGAINST THE LIVE ACL. This is the
  -- assertion this batch was written around, and it is asked of every role rather than of the one
  -- the grant above names, because a grant made by a LATER batch would not appear in this file at
  -- all.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, a.attname as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        join pg_catalog.pg_attribute a on a.attrelid = c.oid
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'asset_versions'
         and a.attnum > 0 and not a.attisdropped
         and a.attname::text <> all (version_mutable)
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, a.attname, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a column of an asset version other than the four that move is updatable: %', offending
      using hint = '§5''s mutability column reads "logical mutable; versions IMMUTABLE" and §4.2 of '
                   'the asset design says "ห้าม UPDATE object location/content หลัง ready; การแก้ไข'
                   'สร้าง row ใหม่". The four that move are status (§7.1 assigns media readiness to '
                   'it by name), object_key and purged_at (§10''s purge, which §9.3/11 makes an '
                   'update rather than a row removal) and updated_at (§3.2). sha256 and byte_size '
                   'are in the refused list for a second reason: they are what a reconciliation '
                   'compares a provider''s answer against, and a digest a granted path can rewrite '
                   'is not a digest.';
  end if;

  -- AND THE SAME TABLE CARRIES NO UPDATE OR DELETE POLICY, because either half alone can be
  -- satisfied while the other is wrong: a policy with no grant is inert, and a grant with no policy
  -- is denied by row level security rather than by privilege, which is a weaker refusal than
  -- immutability asks for (130's sentence, kept by 131, 070 and 080). `w` is UPDATE and `d` is
  -- DELETE.
  --
  -- app.content_asset_links is in this list and app.asset_versions is too, but for different
  -- reasons: the link is APPEND-ONLY, so a `w` policy would contradict the table's own comment; the
  -- version has a granted UPDATE on four columns and no policy, so the refusal stays attributable to
  -- row level security rather than to a missing grant.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('asset_versions', 'content_asset_links')
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'an immutable or append-only batch 100 table carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- THE LINK IS APPEND-ONLY AS THE PRIVILEGE SYSTEM HOLDS IT. No role holds UPDATE on any of its
  -- columns. `has_any_column_privilege` for UPDATE so a column-scoped grant is caught as well as a
  -- table-wide one — the measured trap that a full set of column grants leaves `has_table_privilege`
  -- false.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'content_asset_links'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a content asset link can be updated: %', offending
      using hint = 'APPEND-ONLY on batch 100''s reading of §4.7''s rule "การแก้ link หลังอนุมัติ'
                   'ต้อง invalidate Approval": the sentence conditions mutation on a mechanism '
                   'batch 090 has not written, and §8.2''s "Approved/published version '
                   'UPDATE/DELETE" is N for every role including the service.';
  end if;

  -- §8.5, PER COLUMN, ON THE TWO TABLES A CLIENT MAY WRITE: no role may re-identify a row or move it
  -- between tenants or across scope. The two client UPDATE grants name fifteen columns between them
  -- and this is what says so about the rest. app_worker is IN the checked list for 050's reason:
  -- every grant this batch makes to it is column-scoped.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id',
                                'page_context_profile_id', 'kind', 'source', 'created_by',
                                'created_at']) as col
       where n.nspname = 'app'
         and c.relname = 'assets'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id', 'asset_id',
                                'created_by', 'created_at']) as col
       where n.nspname = 'app'
         and c.relname = 'asset_rights'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity or scope column of a batch 100 table is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant OR scope with an update, and '
                   'page_context_profile_id is in this list because it carries the second half of '
                   'the scope (040''s sentence). `kind` and `source` are in it because §8.2''s '
                   'client verbs are upload, edit and archive — changing what an asset IS is none '
                   'of the three.';
  end if;

  -- AND `purge_after` IS OUTSIDE EVERY CLIENT UPDATE GRANT. A trash window a client can push forward
  -- is not a window, which is 070's sentence about retention_until in a family with four retention
  -- classes instead of one. app_worker HOLDS it, because computing an earliest purge from an
  -- approved policy is the service's act — so this assertion names the client roles rather than
  -- every role.
  select string_agg(format('assets.%s to %s', col, r.rolname), ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
    cross join unnest(array['purge_after', 'current_version_id']) as col
   where n.nspname = 'app' and c.relname = 'assets'
     and r.rolname in ('authenticated', 'anon')
     and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE');
  if offending is not null then
    raise exception 'a client role can write an asset''s purge window or its current-version pointer: %', offending
      using hint = 'purge_after is §10''s unapproved Trash window and a client that could push it '
                   'forward would hold captured storage indefinitely; current_version_id is the act '
                   'of publishing a version rather than a field a client edits (080''s sentence '
                   'about a content item).';
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE FOUR. §8.5 has no broad user delete, §11.5 makes a user
  -- delete a move to Trash, and §8.2's hard purge is an UPDATE of purged_at rather than the removal
  -- of a row (§9.3/11 of the object storage lifecycle contract: "อัปเดต deleted_at/purged_at แบบ
  -- idempotent"). THIS IS ALSO THE LAST DEFENCE THE PREFIX RULE HAS INSIDE THE DATABASE: with no
  -- DELETE anywhere, nothing a granted path can issue removes a row at all, which bounds a bad purge
  -- to a redaction. It does not bound WHICH rows are redacted, and the header says so.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname::text = any (asset_tables)
         and r.rolname::text = any (every_role)
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'an asset row can be deleted through a granted path: %', offending
      using hint = '§8.5 requires a soft delete through a typed lifecycle field, §11.5 makes a user '
                   'delete a move to Trash, and batch 160 owns the retention sweep through '
                   'app_maintenance, which this batch grants nothing.';
  end if;

  -- `anon` holds nothing on anything this batch creates. RFC-2026-021 §7/4 decided that as a
  -- NEGATIVE and it is the one client-role property no approved decision is expected to move.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on app.%, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- No policy this batch's tables carry may name an anonymous role. §8.5 gives anonymous no tenant
  -- policy. app_worker is deliberately NOT in this list: RFC-2026-022 §3 classifies this batch's `S`
  -- cell BOTH and expects a policy for the CARRIED half once its decision is in effect.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles) and r.rolname = 'anon');
  if offending is not null then
    raise exception 'batch 100 left a policy for the anonymous role: %', offending;
  end if;

  -- THE LOGICAL KEY'S NULL HANDLING, FROM `pg_index`. `content_variant_id` is nullable and is part
  -- of the key; under Postgres's default (NULLS DISTINCT) two variant-less links would not collide
  -- and §4.7's "unique (content_version_id, content_variant_id, role, sort_order)" would hold for
  -- nobody — which is every link that is not variant-specific. Batch 080 found this exact defect in
  -- its own logical key in CI, and the two spellings differ by three words.
  select count(*) into count_of
    from pg_catalog.pg_index i
    join pg_catalog.pg_class ic on ic.oid = i.indexrelid
    join pg_catalog.pg_namespace n on n.oid = ic.relnamespace
   where n.nspname = 'app'
     and ic.relname = 'content_asset_links_logical_key'
     and i.indnullsnotdistinct;
  if count_of <> 1 then
    raise exception 'content_asset_links_logical_key does not treat nulls as equal'
      using hint = 'Declared NULLS DISTINCT (the default), a link with no content_variant_id could '
                   'be inserted any number of times for one (content_version_id, role, '
                   'sort_order) — so §4.7''s uniqueness rule would be a sentence in a header while '
                   'the table accepted a hundred rows. Batch 080 met this in CI on '
                   'content_variants_logical_key.';
  end if;

  -- FOUR RESTRICTIVE POLICIES, ONE PER TABLE. `polpermissive` is the one catalog column that tells a
  -- narrowing from a widening: a permissive policy with the same name and the same predicate would
  -- WIDEN each table instead of narrowing it.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
     and not pol.polpermissive;
  if count_of <> 4 then
    raise exception 'batch 100 wrote % restrictive policies and it creates four tables to narrow', count_of
      using hint = 'A child table with no narrowing is a table where every active member reaches '
                   'every row their membership admits, which would leave a page-restricted asset''s '
                   'versions and rights readable to a member the asset itself is hidden from.';
  end if;

  -- THE ASSERTION THIS BATCH OWES MOST, and it is about the four predicates rather than their count.
  --
  -- BOTH CATALOG COLUMNS, AND THAT IS 040's PROBE RATHER THAN CAUTION. `polqual` is USING and
  -- `polwithcheck` is WITH CHECK; they are two predicates, and a reversal that gutted one while
  -- leaving the other intact went UNNOTICED by the first version of 040's block. A restrictive
  -- policy whose USING lost the Page branch filters nothing on read for a page-scoped member while
  -- still refusing their writes — the leak, without the symptom.
  count_of := 0;
  for probe in
    select c.relname as target,
           pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)      as using_half,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname::text = any (asset_tables)
       and not pol.polpermissive
  loop
    count_of := count_of + 1;
    foreach narrowing in array array[probe.using_half, probe.check_half] loop
      if probe.target = 'assets' then
        if narrowing is null
           or position('member_scope_admits_business' in narrowing) = 0
           or position('member_scope_admits_page' in narrowing) = 0 then
          raise exception 'the asset narrowing does not ask both the Business and the Page question: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = '§4 invariant 3 makes the Page scope a nullable override on a row that '
                         'always carries a Business scope, so the narrowing decides per row which '
                         'question to ask. Dropping the Page branch admits every member scoped to '
                         'a sibling Page — and dropping it from ONE of USING and WITH CHECK hides '
                         'that on the half a test is not looking at.';
        end if;
      elsif probe.target = 'content_asset_links' then
        -- TWO PARENTS, AND BOTH NAMES IN BOTH HALVES. A link reachable through only one of its
        -- parents is a link through which the other parent's boundary can be walked around.
        if narrowing is null
           or position('assets' in narrowing) = 0
           or position('content_versions' in narrowing) = 0 then
          raise exception 'the content asset link narrowing does not resolve through BOTH parents: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = '§4''s ERD gives this row an edge to a CONTENT_VERSION and an edge to an '
                         'ASSET_VERSION, and §4.7 requires "same Workspace เสมอ" and "same '
                         'Business". Its reach must be the INTERSECTION of its two parents'' '
                         'reaches: naming only the asset lets a member who can see the media see a '
                         'link into content they cannot, and naming only the content version does '
                         'the reverse.';
        end if;
      else
        if narrowing is null or position('assets' in narrowing) = 0 then
          raise exception 'the % narrowing does not resolve through its asset: %', probe.target,
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'A version and a rights record carry no page column, so each one''s reach '
                         'is its asset''s reach — asserted rather than copied, because a nullable '
                         'copy of the asset''s page could not be held equal to it by any foreign '
                         'key (MATCH SIMPLE skips a null).';
        end if;
      end if;
    end loop;
  end loop;
  if count_of <> 4 then
    raise exception 'batch 100 found % restrictive policies to inspect and there must be four', count_of;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 100 creates no helper and needs no
  -- exemption. The POLICY COUNT is deliberately not re-asserted: 021 owns that assertion.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (asset_tables)
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
     and c.relname::text = any (asset_tables)
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 100 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced '
                   'table, and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
