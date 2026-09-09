# Five batches written in parallel, and what it cost to merge them

Run: `/claude/a0_atlas` (A0 Integration). Date: 2026-09-07.
Subject: batches `050`, `060`, `130`, `140` and the CON-008 handoff fix, authored simultaneously by
five agents in separate worktrees, plus `041` which merged mid-flight.

## 0. Why this file exists

The four batch agents could not see each other's work, by design. Three reviewers then read all
five branches together, and found twenty-one things no single branch's own suite could have found —
because each branch's tests assert what its own files say.

**Everything below was in a workflow journal and in one run's working memory.** The next four
batches (`051`, `061`, `110`, `131`) are unblocked and will collide in the same files for the same
reasons, so the collisions and the resolutions are written here rather than rediscovered.

**Those four have since been written and merged, and §6 records what §3 and §4 got wrong about
them.** Three of the four merges broke a rule stated here as though it were general; the rules are
narrowed there rather than withdrawn, because each was still right about the case it came from.
Read §6 beside §3 and §4, not after them.

Two limits, stated before the content:

- The reviewers are subagent runs in A0's vendor and model family. This is a second reading, not a
  second opinion, and it does not lift the cross-vendor exception this package carries.
- **Nobody outside this session has reviewed any of the twelve migrations now on `main`.**
  `RFC-2026-002` reserves that role, no required review exists because the Product Owner opens the
  pull requests, and that gap is not technical.

## 1. What was run

| agent | batch | outcome |
|---|---|---|
| A0 Async Kernel | `050` jobs / outbox / consumer ledger | merged |
| A3 AI Gateway | `060` model / policy / credential reference | merged |
| A6 Billing | `130` plan / price / entitlement / subscription | merged |
| A1 Security/Audit | `140` audit / security event core | merged |
| A0 | CON-008 `branchTipBefore` merge-parent order | merged |

Isolation cases went 209 → 343; the static suite 400 → 468 tests. Every one of the eighteen table
families is separately detectable by the CI negative control.

## 2. The defect class this run exists to record

**Four agents each wrote itself into the schema's history as the first to have a shape all four
had.**

- `060`: "the first batch in this repository that writes no policy" — `041` was already on `main`
  with no table at all, and `050` and `140` write none either.
- `050` and `140`: each "the first §8 `S` cell any migration has reached", each quoting `010`'s
  header, written hours apart by different agents.
- `130`: "a fifth and a sixth immutable table" — `050` landed an append-only ledger and an immutable
  outbox envelope in parallel.

Every one was **true of the base its branch was cut from and false of the tree it merged into**, and
three of them were pinned by `assert.match`, so the test would have kept the false sentence alive.

**An ordinal is a claim about the whole schema, and a batch cannot check one.** All four are
corrected in place with the reason recorded rather than the sentence deleted — `RFC-2026-018` is
kept for the same reason one file over.

## 3. The integration procedure, file by file

Derived from four rebases, not from principle. Each rule exists because taking a side broke
something.

| file | rule | why |
|---|---|---|
| `evidence/VERIFICATION.md` | **regenerate** (`npm run record:verification`) | five branches wrote five different totals into the same two lines; one happened to equal `main`'s and auto-merged to a number wrong by 13 |
| `test-kits/integrity-manifest.json` | **regenerate** (`npm run regenerate:manifest`) | hand-picked hashes pass review and fail the integrity check for an unrelated reason |
| `scripts/test-suite-contract.mjs` | **re-derive floors from the merged file** | two branches declared a floor BELOW `main`'s while their rationale said "no floor is lowered"; one raised neither and would have landed 13 tests unratcheted |
| `db/foundation/lint/catalog-snapshot.json` | **union of the not-applied tail** | the declaration must name a TAIL; keeping one side produces a hole, and `pendingDeclarationLint` refuses it |
| `test-kits/db/foundation-contract.test.mjs` | **union, and merge the two `NOT_ON_THE_INSTANCE` declarations into one** | the JSON half auto-merges while the declaring half conflicts, so a plausible resolution leaves symbols nothing declares |
| `db/foundation/seeds/fixture-catalog.json` | **union of identities** | same asymmetry; the catalog test is an exact set |
| `.github/workflows/ci.yml` | **union of `control` lines** | no test asserts the entry count matches the table count, so a dropped line passes every check while that batch's cases stop being exercised |
| `tests/db/identity/run-isolation.mjs` | **union of `FIXTURE_SQL_FILES`**, one sentence | a dropped fixture makes ~30 cases fail as missing data rather than as a policy regression |
| `tests/db/identity/isolation-cases.mjs` | **union**, then close the seams by hand | see §4 |
| `tests/db/identity/identity-isolation.test.mjs` | **rebuild as `main`'s version + this branch's own section** | see §4 |
| `work-packages/…json`, `handoffs/…json` | branch and rationale from the branch; **blockers and outputs unioned**; handoff base reset to the branch point and regenerated | one handoff per package, four branches rewriting it |

## 4. The thing that nearly went wrong quietly

**Three conflict seams fell INSIDE an expression** — once in a case-builder arrow function, once in
a `for` loop body, once in a case object literal.

A side-taking resolution there **parses**. The file compiles, the suite runs, and the other batch's
work is gone with nothing to report it. `git` cannot see it, the linters cannot see it, and the
tests that would have caught it are the ones that were removed.

After the second occurrence the static suite stopped being repaired seam by seam and was rebuilt as
`main`'s version plus the branch's own section. **That is the only resolution that cannot lose a
test by accident**, and it is the rule for the next four batches.

## 5. What the reviewers could not check

They read branches in isolation, so anything that exists only after a merge was outside their reach:
the union of four control-entry pattern sets against the union of all case ids, the not-applied tail
as a whole, and whether the merged coverage notes still read as one argument rather than four
appended paragraphs. The first two are now asserted; the third is prose and is not.


## Findings — the invariants lens

### [MEDIUM] app_worker is granted table-wide UPDATE on app.ai_model_policies, while two shipped comments in the same file state the opposite and rest §8.5's cross-tenant-move prohibition on that false claim.

**Branches:** batch-060  

**Where:** `db/foundation/migrations/060_ai_gateway.sql`  

**Disposition:** FIXED IN PLACE (grant narrowed to three columns; both comments corrected)


Line 606 is `grant select, insert, update on app.ai_model_policies to app_worker;` — table-wide, so app_worker holds UPDATE on every column including `workspace_id`, which on this table is the PRIMARY KEY and the canonical tenant scope. Two statements in the same file say it does not. Line 355, inside `comment on column app.ai_model_policies.workspace_id` (so it ships into the catalog, where the next author reads it): "There is no UPDATE grant on this table at all, so §8.5's \"ห้ามย้าย row ข้าม tenant ด้วย update\" holds by the absence of the verb rather than by a column list." And line 528, over the trigger block: "No role holds UPDATE on app.ai_model_policies or on private.ai_credential_references, so nothing can fire their triggers through a granted path." Both are false as written; the Privileges header ("app.ai_model_policies: SELECT, INSERT and UPDATE") shows the grant is the intended half and the comments are the stale half.

Nothing catches it. 060's apply-time block asserts ENABLE/FORCE, §9.2's column allowlist, the provider-vocabulary identity and the ownership rules, and says nothing about this grant. 060's static suite asserts only that CLIENT roles are granted nothing and never reads the app_worker grant text. And the repository's existing §8.5 scan is `code.matchAll(/grant update \(([^)]*)\) on app\.(\w+)/gi)` — it matches column-scoped grants only, so a table-wide one is invisible to it.

No tenant is exposed today: the table is FORCE RLS with an empty policy set, so app_worker's UPDATE is denied at the policy layer. The harm is the misled reader. 060's own header anticipates the batch that changes this — "the AI gateway is a service that will have to resolve a workspace's model" — and that author, reading the column comment in the live catalog, will conclude the tenant column is already protected by an absent verb and ship a service path that can re-point workspace A's model policy row at workspace B. Batch 050, written in the same sprint, spends real machinery on exactly this: its UPDATE grant excludes `id, workspace_id, dedupe_key`, and its apply-time check 'an identity or scope column of app.jobs is updatable' deliberately puts app_worker IN the checked role list "because every grant this batch makes to it is column-scoped" — the sentence 060 cannot say. The fix is one of the two: column-scope the grant (drop `workspace_id`), or delete both false sentences and say plainly that app_worker holds table-wide UPDATE and §8.5 is held here only by the empty policy set.

### [LOW] The set_updated_at trigger on app.ai_model_policies is described as inert on a premise the file's own grant contradicts.

**Branches:** batch-060  

**Where:** `db/foundation/migrations/060_ai_gateway.sql`  

**Disposition:** FIXED IN PLACE (the comment now says reachable-but-refused)


Line 528: "No role holds UPDATE on app.ai_model_policies or on private.ai_credential_references, so nothing can fire their triggers through a granted path." The second half is true; the first is not — line 606 grants app_worker UPDATE. Batch 050 hit the same situation and wrote it correctly: "no role holds UPDATE THROUGH A POLICY, so nothing can fire either of them" (050_async_kernel.sql line 777), which is precise because the grant exists and the empty policy set is what stops it. 060 dropped the qualifier. On its own this is only an inaccurate comment, but it is the second place in the file resting on the same wrong premise, so a reader who checks one and finds it repeated is more likely to trust it than to go read the grant.


**What this lens checked and found clean:** Clean on this lens for four of the five branches — 050, 130, 140 and CON-008 — and clean on all of the lens's other checks for 060 too.

Verified across all four new migrations: no policy names app.workspace_members or app.workspace_member_scopes (130 has the only new policy, `billing_subscriptions_select_owner`, and it calls 011's `app.workspace_member_role(workspace_id) = 'owner'`); no widening of app_authz anywhere — each of the four instead asserts at apply time that app_authz holds nothing on its own tables, and none adds a policy whose polroles include app_authz, so 011's `count_of <> 1` self-assertion stays true; every one of the twelve new tables carries ENABLE + FORCE, a primary key and a `comment on table` owner line, each re-asserted from pg_class in that batch's own DO block; the only client grant in the whole set is 130's `grant select (id, workspace_id, billing_plan_version_id, local_access_state, current_period_start, current_period_end, grace_expires_at, created_at, updated_at) on app.billing_subscriptions to authenticated`, which is column-scoped, and 130's header explicitly records that it becomes a sixth entry on RFC-2026-021 §8.5's list rather than absorbing it silently; no grant to anon anywhere, and 050, 130 and 140 each assert the anon negative at apply time; no `pg_authid` in any migration (all four read `pg_roles`/`pg_catalog.pg_class` and each carries the batch-020 note saying why); `gen_random_uuid()` is bare in all eleven uses, no `public.` or `extensions.` prefix, no pgcrypto call; no `create view` in any of the four, so RFC-2026-021's read allowlist stays empty; the immutable tables (app.consumer_ledger, app.billing_plan_versions, app.plan_entitlements, app.audit_logs, app.security_events) have no UPDATE/DELETE grant and no UPDATE/DELETE policy for any role, each checked against the live ACL with `has_any_column_privilege`/`has_table_privilege` rather than against the grant text; and app_worker holds grants and no policy on every table it can reach, so each service denial stays attributable to RLS.

On the USING/WITH-CHECK point 040 raised: 130's is the only new policy and it is `for select`, where Postgres admits no WITH CHECK, and its static test pins the predicate itself (`app\\.workspace_member_role\\(workspace_id\\)\\s*=\\s*'owner'`) plus the absence of every other role name — not just the policy body as a blob.

Two shared-file changes outside the migrations also checked and sound: 060's widening of `schemaLint` from `app\\.` to `(app|private)\\.` closes a real hole (without it the SECRET-4 table would have been the one table in the schema exempt from the owner-comment/ENABLE/FORCE/primary-key rules by virtue of its prefix), and 060's tightening of `assumesIdentity` in rls-smoke.mjs from the substring `/\\bprivate\\.as_/` to `/^\\s*select\\s+private\\.as_\\w+\\s*\\(/i` matches all three shapes `assumeIdentity()` actually emits, so no `reset role;` is lost. CON-008 contains no migration and nothing this lens judges; its `branchTipBefore` signature change from a string to `{ok, tip, ...}` is followed through at both call sites.

One caveat on standing: I am a subagent in the same vendor and model family as the five runs I reviewed, so this is not an independent second opinion.


## Findings — the collisions lens

### [HIGH] Four branches claim the same single-slot package ownership. Each rewrites `ownership.branch` from `agent/claude/WP-0A-DB-00-batch-040` to its own branch, and each repoints the same two lines of branch-identity.test.mjs (the ref list at line ~79 and the BRANCH_OWNERSHIP row). The field holds one value.

**Branches:** batch-050, -060, -130, -140 (all four)  

**Where:** `work-packages/WP-0A-DB-00.json + test-kits/branch-identity.test.mjs`  

**Disposition:** RESOLVED PER MERGE (each branch declares itself; the row is single-slot by design)


`branch-identity.test.mjs`'s 'every branch in this repository resolves to exactly one package' test resolves its hard-coded ref list against the REAL manifests via claimantsOf(). If a resolver keeps more than one DB-00 ref in that list (the obvious 'keep both sides' resolution), every ref the manifest no longer names returns NO_CLAIMANT and the test fails. If the resolver keeps one, the merged repository declares that all four batches' migrations, fixtures and cases came from a single branch. Separately, main has already moved this row to batch-041, so all four branches conflict with main here today — none of these PRs is mergeable as-is, and the 2nd/3rd/4th must be rebased rather than merged.

### [HIGH] All four append their own migration to `not_applied_to_this_instance.migrations` and to the paired `NOT_ON_THE_INSTANCE` array, and all four replace the single-line `why` string. The two lists are compared with assert.deepEqual, and pendingDeclarationLint requires the declared set to be the exact TAIL of the sorted migration set.

**Branches:** batch-050, -060, -130, -140 (all four)  

**Where:** `db/foundation/lint/catalog-snapshot.json + test-kits/db/foundation-contract.test.mjs`  

**Disposition:** RECORDED


scripts/db/run.mjs pendingDeclarationLint refuses a declaration that is not a tail ('An instance missing a middle batch while holding later ones is DIVERGENT, not behind'). Take one side of the conflict — e.g. keep 130's line after 050 has landed — and the declaration is [011,020,021,030,040,041,130] while 050_async_kernel.sql sits in the tree: `make db-schema-lint` fails, and foundation-contract's deepEqual fails with 'these and only these batches are declared not applied'. The four `why` rewrites each end 'THE CHAIN IS NOW SEVEN BATCHES LONG'; after all four plus 041 it is ten, so whichever prose survives is a false statement about the list it sits on.

### [HIGH] Asymmetric merge between a file and its declaration. 140 inserts its four symbols BEFORE `knowledge_b1_business` while the other three insert after it, so 140's fixture-catalog.json hunk AUTO-MERGES with each of them (verified: `git merge-tree` prints 'Auto-merging db/foundation/seeds/fixture-catalog.json' with no CONFLICT for 050×140, 060×140, 130×140) — but ADDED_SYMBOLS in foundation-contract.test.mjs is appended at one anchor by all four and conflicts every time.

**Branches:** batch-140 vs -050 / -060 / -130  

**Where:** `db/foundation/seeds/fixture-catalog.json + test-kits/db/foundation-contract.test.mjs`  

**Disposition:** RESOLVED AS A UNION (fixture-catalog auto-merges while ADDED_SYMBOLS conflicts, so the JSON was merged from both stages rather than taken)


The catalog test is exact-set: `assert.deepEqual(Object.keys(identities).sort(), [...REQUIRED_SYMBOLS].sort(), 'no more, no fewer')`. The JSON half of the pair merges silently while the half that declares it stops the merge, so the plausible resolution ('keep my branch's ADDED_SYMBOLS list') leaves the catalog holding audit_log_a1/b1, security_event_a1/b1 or outbox_event_a/b with nothing declaring them, and the suite fails on 'the unverifiable constant this whole file exists to refuse' — a failure whose message points at the fixture catalog rather than at the merge that caused it.

### [HIGH] Three branches independently discovered the same shape and each claims to be the only one to have it. 060 rewrites SMOKE_COVERAGE[8] to say `service-cannot-set-an-ai-model-policy` is 'the only case in the whole suite where the service is refused BY A POLICY' and pins that sentence with assert.match. 050 adds three policy-layer service refusals (service-cannot-enqueue-a-job-row, -publish-an-outbox-event, -record-a-consumer-ledger-row) and 140 adds two (service-cannot-write-an-audit-log, -a-security-event) — all verified `expect: 'denied', deniedBy: 'policy'`.

**Branches:** batch-060 vs -050 and -140  

**Where:** `tests/db/identity/isolation-cases.mjs (SMOKE_COVERAGE[8], AUTHORIZATION_CASE_COVERAGE)`  

**Disposition:** FIXED IN PLACE ON THREE BRANCHES (see the ordinal finding below)


The sentence is false the moment 050 or 140 lands, and 060's test requires the note to keep saying it. Same slot, second contradiction: 050 pins /first `S` cell/ (about §8.4's 'Internal job/attempt/DLQ payload') while 140 pins /050, 061, 070 and 120/ on a note whose own text says §8.4's audit INSERT 'is the first and only `S` cell any migration in this repository has reached'. A hand merge that satisfies both tests contains both claims. This note is the repository's record of what the isolation suite proves; a reader deciding who owns the RFC-2026-016 §2 service-policy blocker is told two incompatible things.

### [MEDIUM] All four append their control entries at the same anchor (after the 040 pair, before `echo "negative control: ..."`), so ci.yml conflicts in all six pairwise merges. The PATTERNS themselves are clean: measured across all 343 merged case ids, job-row / outbox-event / consumer-ledger / ai-model-registry / ai-model-policy / billing-subscription / billing-plan-catalog / plan-price / plan-entitlement / audit-log / security-event are pairwise disjoint.

**Branches:** batch-050, -060, -130, -140 (all four)  

**Where:** `.github/workflows/ci.yml`  

**Disposition:** RESOLVED AS A UNION (all 18 entries present; verified by the run, which bites on every family)


Mechanical, but it is the file where a dropped line is invisible: each entry is one `control` call in a shell block with no test that the entry count matches the table count in the other direction. The per-batch tests only assert `controls.length >= N` and that THEIR OWN table has an entry, so a resolution that loses another batch's three lines passes every test in the repository while that batch's tables silently stop being negative-controlled.

### [MEDIUM] 060 and 140 name eight and two cases `...-of-workspace-a/-b`, which match the pre-existing 010 entry's pattern `[a-z0-9-]*workspace` as well as their own. Measured: 16 overlapping entry-pairs on the shared base (exactly what 130's blocker reports), 18 after all four merge — the two new pairs being app.workspaces × app.ai_model_policies (8 shared cases) and app.workspaces × app.audit_logs (2).

**Branches:** batch-060 and -140 (falsifying -130)  

**Where:** `.github/workflows/ci.yml + work-packages/WP-0A-DB-00.json`  

**Disposition:** RECORDED, NOT FIXED (the overlap is real and predates these branches; 130 measured 16 pairs, the merged tree has 18)


130 shipped an open_blocker stating the overlap 'measured rather than argued' at SIXTEEN pairs and that 'batch 130 did not cause it and did not fix it… makes the problem no larger'. That measurement is a fact about 130's branch only; merged, the blocker under-reports the thing it exists to report, and the two batches that DID enlarge it say nothing, because 060 and 140 each assert non-overlap only between their own two patterns. The 010 control can then be satisfied by an ai-model-policy or audit-log failure it did not cause — precisely what the step's own comment says must not happen.

### [MEDIUM] All five rewrite the same two lines with a different total: 412 (050), 411 (060), 414 (130), 413 (140), 404 (CON-008). Main now reads 413 after the 041 merge. 140's value happens to equal main's, so 140's hunk auto-merges to a number that is wrong by 13.

**Branches:** batch-050, -060, -130, -140 and CON-008 merge-parent-order (all five)  

**Where:** `evidence/VERIFICATION.md`  

**Disposition:** REGENERATED EVERY TIME (npm run record:verification after each rebase; never merged)


The file's own header says it is 'asserted by test-kits/verification-record.test.mjs against a live run' and 'an edited value fails the check'. Every merge after the first is red until someone re-runs `npm run record:verification`, and the one case that merges without a conflict (140) produces a stale number rather than a stopped merge — the exact failure mode the file was created to prevent ('four evidence files have quoted a test count that was true two edits earlier').

### [MEDIUM] Four different TEST_NAME_DIGEST_BY_FILE values for tests/db/identity/identity-isolation.test.mjs (176899f8222f6ea8 / 5df5b44c7be75a96 / 4f5ebe709ad3985a / ed90f6225ef47e93) on one line, and three different DECLARED_TEST_FLOOR values (79 / 78 / 81) on another. Batch 140 changes ONLY the digest: it adds 13 tests and ~127 assertions to that file and raises neither the test floor (67) nor the assertion floor (449).

**Branches:** batch-050, -060, -130, -140  

**Where:** `scripts/test-suite-contract.mjs`  

**Disposition:** RE-DERIVED FROM THE MERGED TREE (two branches would have LOWERED the floor; 140 raised neither)


The digest is a recompute-me guard, so it conflicts loudly — fine. The floors do not: they are minimums, so taking 140's side after another batch has landed leaves the floor at 67 against ~93 actual tests, and the ratchet stops protecting 26 tests including every case-pinning assertion the other batches added to keep their CI control entries from resting on deleted cases. That is the guard those batches explicitly built their control story on.

### [MEDIUM] One handoff exists per work package and all four branches rewrite it: distinct head revisions (021e0c31 / 69f127c6 / df2f27f2 / 64c2a098) and distinct file lists (3 added/13 modified, 2/17, 2/13, 3/13). 050 and 130 also replace the 'AUTHORSHIP OF THIS INCREMENT' assumption with /claude/a0_async and /claude/a6_billing; 060 and 140 leave it saying batch 040 was authored by /claude/a2_knowledge.

**Branches:** batch-050, -060, -130, -140 (all four)  

**Where:** `handoffs/WP-0A-DB-00-author-handoff.json`  

**Disposition:** REWRITTEN PER MERGE (base reset to each branch point, then regenerated)


This is the canonical evidence record the protocol requires. After merge it cites a range containing four batches while listing one batch's files, and credits one run for four agents' work. Two of the four are already wrong on their own branch: 060's and 140's handoffs describe their own increment while the authorship assumption still names batch 040's author, so the misattribution is not only a merge artefact.

### [LOW] All four append their fixture to FIXTURE_SQL_FILES at the same anchor and all four rewrite the same two-line unwired-driver message with mutually exclusive text — '021, 030, 040, 050' / '…, 060' / '…, 130' / '…, 140', and 'batches 010-050' / '010-060' / '010-040 and 130' / '010-140'.

**Branches:** batch-050, -060, -130, -140 (all four)  

**Where:** `tests/db/identity/run-isolation.mjs`  

**Disposition:** RESOLVED AS A UNION (all fixtures load; the unwired-driver sentence now names the list rather than a typed number)


If a resolution drops a fixture line, that batch's ~26-37 cases run against rows that were never loaded and fail as missing data rather than as a policy regression — and the CI negative control's own failure message warns that 'a fixture that did not load also exits non-zero'. The message text is cosmetic, but after merge only one of the four sentences is true about which batches are UNPROVEN.

### [LOW] Header and coverage-note claims that only one branch can keep. 060's migration header: 'THE FIRST BATCH IN THIS REPOSITORY THAT WRITES NO POLICY' — 050 (lower number) writes zero policies and 140 writes none either. 140's AUTHORIZATION_CASE_COVERAGE[9]: 'BATCH 140 ADDS THE FIFTH AND SIXTH IMMUTABLE TABLES' — 050 adds an append-only ledger and an immutable outbox envelope, and 130 adds two immutable published-plan tables.

**Branches:** batch-060 (vs -050 and -140); batch-140 (vs -050 and -130)  

**Where:** `db/foundation/migrations/060_ai_gateway.sql, tests/db/identity/isolation-cases.mjs`  

**Disposition:** FIXED IN PLACE (see the ordinal finding)


These are permanent documentation in migration headers and in the coverage map, written by agents who could not see each other. Merged, they tell a later reader a false schema history — which matters here specifically because the next batch to face the same decision is told to follow 'the first batch that did X' and will find three of them.

### [LOW] All five rewrite the same sha256 lines (ci.yml, VERIFICATION.md, test-suite-contract.mjs, branch-identity.test.mjs, …). This is the only file CON-008 collides with the DB branches on, besides VERIFICATION.md.

**Branches:** batch-050, -060, -130, -140 and CON-008 merge-parent-order (all five)  

**Where:** `test-kits/integrity-manifest.json`  

**Disposition:** REGENERATED EVERY TIME (npm run regenerate:manifest; never hand-picked)


Regenerable with `npm run regenerate:manifest`, so the cost is real but bounded: every merge is red until it is re-run, and a resolver who hand-picks hashes rather than regenerating produces a manifest that passes review and fails the integrity check for a reason unrelated to the change.


**What this lens checked and found clean:** Not clean — twelve collisions reported. For the record, these vectors were checked and found genuinely free of collisions: (1) no duplicate or near-duplicate case ids — the four branches add 108 new ids and all 343 merged ids are unique; (2) no cross-matching CI control patterns among the four new batches (pairwise disjoint over the merged case set); (3) no duplicate top-level declarations added to tests/db/identity/identity-isolation.test.mjs, tests/db/identity/isolation-cases.mjs or test-kits/db/foundation-contract.test.mjs — the four branches used distinct constant prefixes, so there is no post-merge SyntaxError; (4) no SMOKE_COVERAGE or AUTHORIZATION_CASE_COVERAGE `covered` flag is changed by any branch, so the collisions there are in prose only; (5) no fixture-catalog uuid collisions and no duplicate database object names (indexes, triggers, functions) across the four migrations; (6) scripts/db/run.mjs is touched only by 060, and its schemaLint widening to the `private` schema changes no verdict for 050, 130 or 140 (none creates a table outside `app`); (7) 060's narrowing of `assumesIdentity` in scripts/db/rls-smoke.mjs still matches every identity call the runner emits (`select private.as_*(...)`), so it does not silently step another batch's cases back to the RLS-bypassing connection role; (8) 060's private-grant guard finds no match in the merged migration text, so it will not demand a control entry nobody wrote; (9) CON-008 collides with the DB branches only in the two regenerated files (VERIFICATION.md, integrity-manifest.json) — its branchTipBefore signature change has no caller outside files it edits itself.


## Findings — the claims lens

### [HIGH] Batch 060's canonical handoff is batch 040's handoff verbatim. 22 of its 26 fields are byte-identical to the version at the merge base a622b7a; only base_revision, head_revision_or_patch_checksum, files_added and files_modified were regenerated by `npm run refresh:handoff`. Every prose field — acceptance_results, tests, known_limitations, security_privacy_cost_impact, migration_and_data_impact, all 43 open_risks_or_blockers — describes the knowledge tables, not the AI gateway.

**Branches:** batch-060  

**Where:** `handoffs/WP-0A-DB-00-author-handoff.json`  

**Disposition:** FIXED DURING INTEGRATION (handoff rewritten for its own increment at each merge)


The handoff is the record a reviewer signs against, and this one records a different batch. Concretely, on this branch: acceptance_results[0] reads "Batch 040 creates app.knowledge_items and app.knowledge_item_versions ... result: pass" — there is no acceptance criterion anywhere in the record about app.ai_models, app.ai_model_policies or private.ai_credential_references. tests[0] says "tests 400, pass 400 ... See evidence/VERIFICATION.md" while this branch's own evidence/VERIFICATION.md says 411. tests[1] cites `verify-branch-scope.mjs e2f71cd WP-0A-DB-00` and "all 18 changed path(s)" — e2f71cd is batch 040's branch point (060's is a622b7a) and 060 changes 19 paths. tests[2] says "67 tests, 67 pass. Fourteen of them are batch 040 static blocks" while this branch's identity-isolation.test.mjs declares 78. The only live CI evidence in the record, GitHub Actions run 34042012836, is quoted as "All ELEVEN migrations applied ... 000, 001, 002, 003, 004, 010, 011, 020, 021, 030 and 040" — 060_ai_gateway.sql is not in that list, so nothing in 060's record shows its migration has ever been parsed by a database, and the two negative-control entries it adds are unmeasured. None of 060's real blockers (the SECRET-4 table no role may reach, OPEN-004, RFC-2026-016 §2's unwritten service policy) is recorded anywhere. handoff-conformance.test.mjs only diffs the cited range against the file lists, so it passes on all of this.

### [MEDIUM] The ownership rationale claims "Numbers change with it and every one is RAISED: that file's declared-test floor and its assertion floor. No floor is lowered" — but the diff to scripts/test-suite-contract.mjs changes only TEST_NAME_DIGEST_BY_FILE. Both floors for tests/db/identity/identity-isolation.test.mjs are left at the base's 67 and 449 while the file on this branch declares 80 tests and 571 assertions.

**Branches:** batch-140  

**Where:** `work-packages/WP-0A-DB-00.json`  

**Disposition:** FIXED IN PLACE (140 raised neither floor; both re-derived)


Every sibling branch set the floor to its exact new count (050: 79/553, 060: 78/523, 130: 81/564 — each matching a live grep of its own file, as main's 80/515 does). 140 alone did not, so 13 tests and 122 assertions — including the four that pin the negative-control cases by id and layer, and the one that pins the append-only trigger — land unratcheted. That is precisely the failure DECLARED_TEST_FLOOR_BY_FILE's own header says it exists to stop ("a file that has ever declared N must keep declaring N, or the number is edited deliberately, in a diff a reviewer reads"), and the declaration a reviewer would read says the opposite of what happened. After merge the effective floor is main's 80/515 against a tree of ~93 tests, so the gap persists.

### [MEDIUM] Both branches declare DECLARED_TEST_FLOOR_BY_FILE['tests/db/identity/identity-isolation.test.mjs'] BELOW the value already on origin/main. 050 sets 79 and its rationale says "declared-test floor 67 -> 79 ... No floor is lowered"; 060 sets 78 and says "67 -> 78 ... No floor is lowered". origin/main declares 80, raised by batch 041 after these branches were cut from a622b7a.

**Branches:** batch-050 and batch-060  

**Where:** `scripts/test-suite-contract.mjs`  

**Disposition:** FIXED IN PLACE (050 declared 79 and 060 declared 78 against main's 80)


"No floor is lowered" is true of each branch against its base and false against the tree it merges into. Both branches edit the same line main moved, so the merge produces a conflict whose obvious resolution — keep the branch's number — silently drops the isolation suite's floor from 80 to 78 or 79 and un-ratchets batch 041's tests. 130 is the counter-example that shows this was checkable: it declares 81, above main's 80. The assertion floors on all three are genuinely above main's 515.

### [MEDIUM] Line 195-197: "This is the first family in this schema where an ACTIVE MEMBER of a workspace sees none of its rows: every SELECT row in §8.1 and §8.2 is `Y` for all five built-in roles." The stated reason is false, and so is the conclusion. §8.1 contains "Member list SELECT | Y | Y | P | N | N | P" and "Own user profile SELECT/UPDATE | O | O | O | O | O | P". app.workspace_invitations, created by batch 010 and merged, carries exactly one SELECT policy — workspace_invitations_select_owner, predicated on `m.role = 'owner'` — so an active editor, approver or viewer already sees none of that table's rows.

**Branches:** batch-130  

**Where:** `db/foundation/migrations/130_billing.sql`  

**Disposition:** RECORDED, NOT REWRITTEN IN FOUR PLACES (the claim is false; the sentence it supports survives without the superlative)


This is the justification for calling app.billing_subscriptions the strongest negative-control entry in the step, and it is repeated in three places a reader would trust: the migration header, tests/db/identity/isolation-cases.mjs (SMOKE_COVERAGE and AUTHORIZATION_CASE_COVERAGE[2], four occurrences of "every SELECT row in §8.1 and §8.2 is `Y` for all five built-in roles"), and .github/workflows/ci.yml:251, where it is broadened to "every other SELECT row in §8" — which §8.3 and §8.4 contradict on nearly every line. Nothing in 130's fourteen new static tests checks the claim, so it cannot self-correct. The control itself is sound: I confirmed six cases genuinely match `[a-z0-9-]*billing-subscription` and are RLS-decided, and that 130's measured overlap claim ("sixteen pairs of the PRE-EXISTING entries share cases, business_profiles and workspace_member_scopes sharing fifteen") is exactly right. It is the reason given for the claim, and the "first in this schema" superlative, that stopped describing the tree.

### [MEDIUM] Two parallel branches each claim to be the first and only batch to reach an §8 `S` cell, quoting the same batch 010 header. 050_async_kernel.sql:237: "THE SECOND ROW IS THE FIRST `S` CELL IN THE SCHEMA" (§8.4 "Internal job/attempt/DLQ payload"), and :305 "the first batch that owns an `S` cell". 140_audit.sql:227: "THE ONE `S` CELL IN THIS REPOSITORY, AND WHY IT IS STILL DENIED", and :233 "is the first `S` cell any migration in this repository has reached".

**Branches:** batch-050 and batch-140  

**Where:** `db/foundation/migrations/140_audit.sql`  

**Disposition:** FIXED IN PLACE ON 140 (four sites: header twice, the case `why`, and the assertion pinning it)


Only one can be true of the merged tree, and neither branch's text degrades gracefully — 140's is the stronger claim ("THE ONE") and the first to break. It is not confined to a comment: it is the opening sentence of the `why` on the isolation case `service-cannot-write-an-audit-log` (isolation-cases.mjs:4041), which prints in suite output, and identity-isolation.test.mjs:2557 pins it with `assert.match(audit, /THE ONE \`S\` CELL IN THIS REPOSITORY/)`. That test keeps passing after 050 lands, because the string is still in 140's own file — so the guard protects the sentence rather than detecting that it became false.

### [MEDIUM] Line 23: "THE FIRST BATCH IN THIS REPOSITORY THAT WRITES NO POLICY, AND THAT IS THE WHOLE OF WHAT IS NEW", supported by "Every batch from 010 to 040 implemented §8 cells." Batch 041_knowledge_resolution.sql, merged into origin/main before this PR, creates one function, no table and no policy — so the claim is already false against main, not only against siblings. Batches 050 and 140 also write zero `create policy` statements.

**Branches:** batch-060  

**Where:** `db/foundation/migrations/060_ai_gateway.sql`  

**Disposition:** FIXED IN PLACE (the header now says what was wrong and why)


The sentence is billed as "the whole of what is new" about the batch, so a reader takes it as the thing to review. It was true against this branch's base a622b7a and is false against the tree as merged three ways over: 041 is on main today, and 050 and 140 are in flight with the same shape. 060's substantive design work (no client grant, no policy, the private table with no grant to any role and no negative-control entry, asserted in both directions) is genuinely well-built and I found nothing wrong with it — this is the framing sentence, not the mechanism.

### [LOW] An open blocker reads "§5 ASSIGNS jobs.kernel THE RETENTION CLASSES `JOB-SHORT/LEDGER` AND §10 DEFINES NO CLASS CALLED `LEDGER`. Its table has twenty-six rows and none of them is that one." §10's table has twenty-seven rows (docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md lines 482-515).

**Branches:** batch-050  

**Where:** `handoffs/WP-0A-DB-00-author-handoff.json`  

**Disposition:** FIXED IN PLACE (§10 has twenty-seven rows)


The substantive half is correct — there is no bare `LEDGER` class, and the neighbouring claim that batch 030 reported the same about `CATALOG` for industry.core also checks out. But the count is the evidence offered for exhaustiveness in a blocker whose whole purpose is to be precise enough for A1 Data to act on, and a reader who recounts and gets a different number has to re-derive the rest of it.

---

## 6. The second round, 2026-09-08/09: what §3 and §4 got wrong

Run: `/claude/a0_atlas` (A0 Integration). Subject: batches `051`, `061`, `110`, `131`, authored
simultaneously in separate worktrees, then rebased and merged **one at a time** in that order —
110, 061, 051, 131 — each onto a `main` carrying the ones before it.

This section exists because §3 and §4 were written as rules and three of the four merges broke
them. They are not withdrawn; they are narrowed to the case they were derived from.

### 6.1 The rule in §4 holds only where the section really was APPENDED

§4 says to rebuild the static suite as "`main`'s version plus this branch's own section". That is
right, and it is right for the reason §4 gives, and it silently destroys work when two batches did
not append but **replaced the same construct**.

`test-kits/db/foundation-contract.test.mjs` carried one test — `the map ships empty, and empty means
no S cell has been classified yet` — whose own message said it would be replaced when the first
entry landed. Four batches each replaced it, with a different test. Applying §4's rule produced two
`test(` openings sharing one body: an unterminated file, `SyntaxError: Unexpected end of input`, and
**46 tests silently absent from the run** because the whole file failed to load. The suite reported
459 tests instead of 505 and did not say why.

The same happened once in `tests/db/identity/identity-isolation.test.mjs`, where git placed the
`=======` marker INSIDE the last test of one side.

**The narrowed rule.** Before applying §4, ask the merge base whether the branch APPENDED:

```
diff <(git show :1:PATH) <(git show :3:PATH) | grep -E '^[0-9]'
```

A single `NNNaNNN,NNN` at the end of the file means append, and §4's rule applies unchanged. Any
`NNNcNNN` means at least one construct was rewritten, and the sides must be read: extract each
side's COMPLETE construct from its own revision (`git show <rev>:PATH | sed -n 'A,Bp'`) and compose
them. Do not remove conflict markers by hand in a file where a construct was rewritten.

### 6.2 Prose with keys is merged BY KEY, never by line

`SMOKE_COVERAGE` and `AUTHORIZATION_CASE_COVERAGE` are objects whose values are long strings that
every batch appends a paragraph to. A line-level union — main's lines, then the branch's — produced
the right text three times running, and then batch `131` did not only append a paragraph to key 9,
it **rewrote key 10**. The line-level union emitted `10:` twice, and the second label landed on top
of text belonging to key 9.

**The object parsed. The suite ran.** JavaScript keeps the LAST definition of a duplicated key and
reports nothing about the one it discards. Three guards — written independently by `110`, `051` and
`131`, after `110` found exactly this defect already sitting on `main` — failed together and named
it. That is the outcome that justifies three batches writing the same guard.

**The rule.** Extract the map from all three revisions, split each into `key → lines`, and for each
key take `main`'s value plus whatever the branch's value has BEYOND the merge base's. Separate the
comment lines that sit BETWEEN keys from the value they follow before appending anything: attaching
them to the preceding key is what lets a new key's opening line be spliced into the previous key's
text.

### 6.3 A second copy of the set a rule checks against does not duplicate it — it drifts, and it drifts QUIET

Batch `110` classified a service-policy cell on a table in `private`, so it widened
`servicePolicyMapLint` to accept a schema-qualified name and gave it `tablesCreatedByMigrations` as
the one source of that shape. **Seven other places had built the same set themselves**, each with
its own `create table app.(\w+)` regex, in `scripts/db/run.mjs` and in four test files across three
batches.

Six of them failed loudly at the rebase, reporting that tables which plainly exist do not. **The
seventh did not fail.** It sat inside a `doesNotMatch`, where it composed the pattern
`on app.private.meta_webhook_inbox` — a string nothing can match — so the assertion passed by asking
a question about a table that has never existed.

That asymmetry is the finding: a hand-built copy inside a POSITIVE assertion gets louder when it
drifts, and the same copy inside a NEGATIVE assertion gets quieter. A test suite made of refusals is
made mostly of negative assertions.

### 6.4 An assertion written while a set is empty is too broad, and nothing says so until the set is not

The rule that a classified cell buys no service policy was written as "no `create policy` on this
table" while every classified table carried no policy at all. In that state "no policy" and "no
SERVICE policy" are the same set, and the broader one reads as correct.

Batch `051` classified `app.notifications`, which carries §8.4's `O` policy `TO authenticated` — a
CLIENT policy the decision neither grants nor forbids. Left as written, the assertion would have
refused a batch for writing exactly the policy its access-matrix row requires.

**The rule.** When an assertion is written over an empty or single-element set, state in the
assertion's own message which property is load-bearing, so the next author reads the intent rather
than inferring it from a pattern that happens to hold.

### 6.5 What a green local suite does not mean, measured this round

Batches `051` and `131` were each authored, checked and committed with the full suite green on the
author's machine, and neither had ever opened a pull request — so **their isolation cases met a
database for the first time at merge**. Four of `051`'s failed immediately, and not because of any
isolation defect: two witnesses compared `read_at` against `null`, the driver reads psql's CSV, and
CSV has no NULL. `'' !== null` holds against every correct database.

The static suite — 522 tests at that moment — asserts that cases are WRITTEN correctly: ids read
from the catalog, layers attributed, SQLSTATEs declared. It cannot assert that a case WORKS. Only CI
has Postgres.

**The process rule this implies, stated rather than left implicit:** a batch is not merged until CI
has run ITS OWN cases. Branch protection makes that true today as a side effect of a required check;
it should be a rule, because the side effect is what someone would remove to unblock a queue.

`identity-isolation.test.mjs` now refuses any witness whose `equals` is `null` or `undefined` — a
rule a machine WITHOUT a database can enforce, about a defect that needs one to observe. That shape
is worth copying: when CI finds something local cannot, look for the half of it that is static.

### 6.6 Scoreboard

| | before this round | after |
|---|---|---|
| registry batches on `main` | 12 of 31 | **16 of 31** |
| isolation cases | 343 | **477** |
| tests | 470 | **538** |
| table families under negative control | 20 | **30** |

Every defect in §6 was created by writing four batches in parallel and none by any batch being
wrong about its own schema. Not one was an RLS error.
