# C0 contract review: batch 160's preparation

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-160-prep`, head
  `1706111f822cfa87d61943fdb3ed0f29e586878f` over code `159d43bb1b780ef7677ab953cbb7d229b35ba405`, base
  `c7fe264` (main). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/170>.
- **Review branch:** `review/c0-batch-160-prep`, checked out at the subject head `1706111`. This file is its
  only commit.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-160-prep-plan-2026-10-03.md`; the disposition
  `product-owner-disposition-2026-10-03-batch-160-prep.md`; the phase plan
  `a0-phase-plan-141-170-2026-10-03.md` (lines 145-180); `git diff c7fe264..1706111` (12 files) and the five
  commit messages; ERD (`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md`) §5 (192-219), §9.3 (473),
  §10 (482-526), §11 (530-600), the checklist (850-852) and DATA-DEC rows (866-873); the three new data
  files in full; the three new tests (`foundation-contract.test.mjs:3664-4011`, the block headed at 3665); the migration lines the
  findings cite (`010_identity.sql:156-157`, `050_async_kernel.sql:373-379`, `060_ai_gateway.sql:162-170`,
  `070_research.sql:478`, `091_calendar.sql:59`, `100_asset.sql:421-423`); `scripts/db/run.mjs` (its lint
  inputs and the closure-family constants); `scripts/verify-test-coverage-floor.mjs:540-570`;
  `open_blockers[4, 77, 91, 105, 120, 148, 150, 190, 192]` against their base text at `c7fe264`; the
  handoff.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024 that makes this an independent-role run by configuration, not by provenance: I share the
Author's training and blind spots. Acceptance of this file as the C0 role's signature is the Integration
Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** No path under `db/foundation/migrations/`, `docs/`, `contract-catalog/` or `.github/`
  changes against `c7fe264` (measured). Nothing reachable by any role changes. I ran the live layers anyway
  on a fresh cluster and both are green (§2). No finding below reaches a tenant boundary, a secret, a
  migration, an irreversible deletion or a contract file.
- **Blocks the merge: no**, on my reading. There are four MEDIUM and five LOW findings, plus four notes.
  Several statements the batch makes are not true as written: G1 (the number guard), G2 (a mismatch that
  is not recorded), G3 (the export fixture's domain labels) and G5 (the balance of the design note). Each
  is a text or test fix, or can be recorded as owed by name. They should be dealt with in one of those
  two ways before the merge, because this batch's whole claim is that what it does not decide is
  recorded faithfully. Whether they block is the Integration Owner's call, not mine.
- **Answers to the questions:**
  1. *Retention map completeness:* **complete.** It has exactly one row for each of the 66 tables in
     `app` and `private`, measured live at `1706111` (§2), with no duplicates and no unknown tables.
     *Class and §10 citations:* every `defined` row's class is one §10 defines, and §5's cell reaches it.
     Every `section10_row` (row number and ERD line) matches §10, and every §5 cell is verbatim (the test
     holds this, and I read the rows against ERD 198-219 and 488-514). One §5/§10 mismatch is **not
     recorded** (G2). The "covered by an index" column counts partial indexes whose predicate excludes the
     sweep's rows (G6).
  2. *Undefined classes and mismatches are findings, never numbered:* **yes for every one recorded.** No
     row carries a §10 row number, class or behaviour for a finding, and no row carries a window in any
     form I could find (my regex, which is broader than the test's, finds none in `rows`). **However, the
     guard that is claimed to keep it that way refuses only English windows** (G1).
  3. *Export manifest and §11.1:* the manifest fields are present: schema version, generated_at,
     workspace_id, the requested scope, requester and policy version, a row count for each file,
     omitted classes with reasons, and checksums. The checksums recompute (I recomputed them myself), and
     the five §11.1/5 exclusions hold. **Four tables are labelled "not in §11.1's minimum export domains"
     although they are in them,** and one omission reason is false for its table (G3, G4).
  4. *Purge order:* **a valid topological order of the real FK graph.** I checked it against
     `pg_constraint` on a live migrate: the 90 keys are identical by name, child and parent; there are no
     violations; the only cycle (strongly connected component) is `assets`/`asset_versions`, broken by the
     declared key whose reverse exists; the two self-references are exact; and the 12 conflicts
     recompute. The **phase labels** do not follow §11.4's step order, and the order includes tables that
     a workspace deletion does not own (G7).
  5. *Design note:* the facts in it are measured and true (175 `auth.uid()` mentions; closure families of
     14, 19, 19, 2 and 1; the triggers and grants). It is **not fair to both routes**: a dependency the two
     routes share is booked to Route A only, Route A gets no list of benefits, and the disposition's
     one-line cost for Route B leaves out three of the costs the note itself states (G5).
  6. *Claims in the commit messages, plan, disposition, blocker edits and handoff:* true where I measured
     them (§3), with the exceptions in G1, G3, G5 and G9.

## 2. Measured, and how

Node `v24.20.0` (`node -v` before every measured run; `/Users/bank/.local/node-v24.20.0/bin/node` first on
PATH, the Homebrew Node not used). Measured **on the branch NAME**. The agent branch is checked out in
another worktree, so I checked it out here with `git checkout --ignore-other-worktrees` at the unchanged ref
`1706111`, measured, and returned to `review/c0-batch-160-prep`. The branch ref and
`origin/agent/claude/WP-0A-DB-00-batch-160-prep` were both still `1706111` afterwards, and `git status`
was empty throughout.

| command | exit | result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs c7fe264 WP-0A-DB-00` | 0 | `all 12 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` | 0 | `describes the branch: nothing substantive after its cited head` |
| `npm run verify` | 0 | `clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0` |
| `make db-schema-lint` | 0 | `db-schema-lint: ok` |
| `make db-contract-check` | 0 | `db-contract-check: ok` |
| the guard's own `stripNonCode` / `countDeclaredTests` / name digest, on `foundation-contract.test.mjs` | n/a | `c7fe264`: 77 tests, 633 assertions, `a91ced9f62276ebe`; `1706111`: 80, 720, `8c35e631c28c0574`. As the Author states. |
| `test-kits/integrity-manifest.json` | n/a | 88 entries |
| `git diff --stat 75c9274 c7fe264 -- db docs contract-catalog` | n/a | only `db/foundation/README.md`, `audit-coverage-map.json`, `service-policy-map.json`, as the plan's §0.1 says |
| `git diff --stat c7fe264 1706111 -- db/foundation/migrations .github docs contract-catalog` | n/a | empty |
| PR #169 / run 37141584373 (`gh`, read-only) | n/a | merged `2026-10-03T17:51:16Z` at head `4d1f10c`, merge commit `c7fe264`; the run is "Bootstrap validation", `success`, on `4d1f10c`. As the disposition says. |
| PR #170 (`gh`, read-only) | n/a | Draft, open, head `1706111`, base `main`; `bootstrap` check SUCCESS (run 37143863333); the body ends with the Generated-with line |
| live round, port 5505 (below) | 0, 0, 0 | `db-migrate-clean: ok`; `db-rls-smoke: 1079 isolation case(s) passed` twice; `db-authz-proofs: ok — 6 claim(s)` |
| catalog read on that database (below) | n/a | the map, the purge order and the fixture checked against it |
| a sample of the draft's mutations, 7 (below) | n/a | 7 of 7 red; baseline green after restore |
| my reversal probes, 10 (below) | n/a | 9 survive, and 1 control bites; G1, G7, G8 and N2 |

**Live layers.** Nothing a live database layer reads has changed. `scripts/db/run.mjs` reads its lint inputs
by name and lists only `migrations/*.sql` (`run.mjs:45`), and no script, Makefile target or CI file names
any of the three new files (measured by grep). The Author's reason for not running the layers is
therefore sound. I ran one round anyway, so that the map and the purge order would be compared with a
real catalog rather than with the test's text parser. The cluster:

- a private cluster under `scratchpad/c0-160-prep/`;
- `initdb --locale=C -A trust -U postgres`, with `LC_ALL=C`;
- TCP only on `127.0.0.1:5505` (`-c unix_socket_directories=''`);
- `db/foundation/ci/supabase-shim.sql` applied first;
- `DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres make db-migrate-clean`, then
  `make db-rls-smoke` twice, on this worktree at `1706111`.

What I read from the catalog afterwards, compared with my own script (`check.mjs`), not with the test:

- **Tables.** 66 relations in `app` and `private`, equal to the map's 66 rows. None is only in the map,
  none is only in the catalog, and there are no duplicates.
- **Foreign keys.** 90, all NO ACTION and none deferrable, over 87 distinct edges. They equal the purge
  order's 90 edges by `fk|child|parent`, and the comparison found no missing and no extra key.
  - The order has 66 entries, covers every table, and ends with `app.workspaces`.
  - **Topological violations: none**, once the two self-references and the declared break are excluded.
  - The only non-trivial strongly connected component is `{assets, asset_versions}`. The break
    `assets_current_version_scope_fk` (child at position 28, parent at 27) has the reverse key
    `asset_versions_asset_scope_fk`.
- **Retention conflicts.** Recomputed from the map's behaviours over the live FKs: 12, identical to the
  declared 12.
- **Sweep columns.** Every sweep column exists. Every `covered_by` equals the live indexes whose leading
  columns are the key. 13 keys have no covering index, the same 13 as F160-13.
- **Anonymise columns.** All exist.
- **Grants.**
  - No role other than `postgres` holds DELETE or TRUNCATE.
  - There are 216 UPDATE column privileges: `app_worker` holds 130 and `authenticated` 86.
  - `app.assets.current_version_id` is nullable, and `app_worker` (with `postgres`) holds its UPDATE.
  - `app_maintenance` holds no table or column grant.
  - `app_worker`'s only member is `postgres`.
- **Policies.** None of the 209 names `app_worker`, `app_maintenance`, `app_command` or `service_role`.
  No service role has USAGE on `private`.
- **Triggers.** 51 non-internal. `refuse_mutation` and `refuse_truncate` (both executing
  `private.refuse_mutation`) are on `audit_logs` and `security_events`; `set_decided_at` is on
  `approval_requests`.
- **Identity anchors.** Nothing has an FK to `app.user_profiles`, as §6 of the plan says.
- **Partial indexes.** 33, which matters for G6.

The cluster was stopped and its data directory removed. Nothing listens on 5505 (`lsof` exit 1). Ports
5432 and 5499 were not touched.

**The draft's mutations, a sample, reproduced (`probe2.mjs`).** Each was applied, the three batch-160
tests were run, and the file was restored from a saved buffer:

- M1, PUSH-SECRET given to push refs as `defined`: red.
- M2, a row removed: red.
- M3, appended to `140_audit.sql`, `grant delete on app.jobs to app_worker`: red.
- M4, appended, a policy `to app_worker`: red.
- M5, appended, a new FK: red.
- M6, appended, an index on `audit_logs(occurred_at)`: red.
- M7, the export including `app.security_events`: red.

Baseline after the restores: green. `140_audit.sql` was restored byte for byte (`shasum -a 256 -c`: OK).

**My reversal probes (`probe.mjs`).** Each was a one-file edit, the three tests were run, and the file was
restored from a saved buffer; `git status` was empty afterwards.

- **Survived:**
  - P1, a finding row given `"keep 30 วัน"` (G1).
  - P2, a defined row's sweep basis given `"audit window 1 ปี"` (G1).
  - P3, a row given `"30-day recovery"` (G1).
  - P5, `audit_logs` and `workspace_members` relabelled to phase 6 (G7).
  - P6, an edge's `fk` renamed to `no_such_fk` (G8).
  - P7, a retention conflict's `child` changed to `app.jobs` (G8).
  - P8, `app.user_profiles` moved from omitted to exported, with its checksums recomputed (G4).
  - P9, `social_accounts.section9_classes` re-picked as `SECRET-4` (N2).
  - P10, a finding's `source` pointing at `WP:999 (open_blockers[999])` (G9).
- **Bit (control):** P4, the same row as P1 given `"keep 30 days"`, failed. This confirms that the probe
  reached the assertion.

## 3. Claims checked

| claim (where) | verdict |
|---|---|
| 77 -> 80 tests, 633 -> 720 assertions, digest `a91ced9f62276ebe` -> `8c35e631c28c0574`, the guard's own count (commits, plan §0.1, handoff) | **true**, measured |
| VERIFICATION.md 681 -> 684; integrity manifest regenerated, 88 digests | **true** |
| the three tests at `foundation-contract.test.mjs` 3791, 3918, 3970, after 141 prep's four; no helper collides | **true** (the 160 helpers are suffixed `160`) |
| `open_blockers[i]` on line 254+i; the six `WP:` citations moved +1 (`WP:258 [4]`, `331 [77]`, `345 [91]`, `359 [105]`, `374 [120]`, `404 [150]`) | **true**, each line parsed and compared with the array element; also `[29]` 283, `[148]` 402, `[190]` 444, `[192]` 446 |
| blockers 4, 77, 91, 105, 148, 150, 190 extended by appending only; 192 new at the end; nothing else in the manifest except `ownership` changed | **true**, each new string `startsWith` its base string; 192 -> 193 entries |
| the finding citations (ERD 204, 211, 215, 216, 218, 490, 493, 497, 502, 504, 505-510; the migration lines in "Inputs read") | **true**, read |
| P1: "ERD:850 checklist" is ERD:852 | **true** |
| P1 / `[91]`: the phase plan "listed" PUSH-SECRET as an "undefined class (wrong)" | **overstated**: the phase plan (`a0-phase-plan-141-170-2026-10-03.md:149`) heads its list "Undefined **or mismatched**", which is true of PUSH-SECRET's assignment (G9) |
| "No row may contain a retention number ... in English or Thai" (plan §1 line 79), "the test refuses one" (disposition §4), "a retention number written into the map" refused (handoff) | **false for Thai and hyphenated forms** (G1) |
| the export fixture's "outside-minimum-domains" reason, "Not in §11.1's minimum export domains (ERD:546-555)" | **false for four of its nine tables** (G3) |
| Route B's costs, as the disposition's Q160-b row states them | **incomplete** (G5) |
| `[150]`: "every row of the retention map names `no-deletion-manifest`" | loosely worded: it is in `controls_on_every_row`, not in any row's `blocking_controls` (N4) |
| `[190]`: "neither app.calendar_items nor app.schedules records WHEN" | **`app.schedules` does not exist**; the table is `app.content_schedules` (G9) |
| `[105]`: "and this batch used WEBHOOK-SHORT" | ambiguous: in a paragraph headed BATCH 160 PREP it reads as this batch, which recorded the receipt as a finding row; the plan says batch 131 (G9) |
| #169's merge facts and the re-check commits `50950e6`, `2d94009`, `0ce283d`, `68855a6` | **true** (`gh`, `git log`) |
| the plan's measured catalog figures (66, 90/87, 216, 269, 51, the self-references and the cycle) | **true**, re-measured live at `1706111` |
| `make db-migrate-clean` / `db-rls-smoke` not needed | **true**, and green when run anyway |
| `commit-when-clean` refused `159d43b` and `f9d9a79` only on the two handoff tests | read, not reproduced (it would require moving the branch ref back); consistent with the handoff and with `1706111` being green |

## 4. Findings

### G1 (MEDIUM): the "no retention number" guard refuses English windows only

- **Where:** `test-kits/db/foundation-contract.test.mjs:3856`, the regex
  `/\d+\s*(day|days|month|months|year|years|วัน|เดือน|ปี)\b/i`.
- **Defect:** in JavaScript, `\b` is an ASCII word boundary, and Thai letters are not word characters. So
  `วัน\b`, `เดือน\b` and `ปี\b` match only when an ASCII letter, digit or underscore follows immediately.
  Measured:
  - `"30 วัน"`, `"30 วัน default"`, `"12 เดือน"` and `"1 ปี"` all test **false**;
  - `"30-day recovery"` and `"24 hours"` test false too;
  - `"30 days"` and `"1 year"` test true.
- **Probes:** P1, P2 and P3 left the three tests green; P4 failed them.
- **Why it matters:** every number in §10 and DATA-DEC is written in Thai or with a hyphen ("30 วัน",
  "12 เดือน", "1 ปี", "30-day recovery"). So the most likely way for a number to reach the map is a
  transcription of the ERD's own wording, and that is the form the guard does not see. The plan (§1, line
  79: "in English or Thai"), the disposition (§4: "the test refuses one") and the handoff
  (`security_privacy_cost_impact`) all claim the guard does.
- **Remedy:**
  - Drop the trailing `\b`, or replace it with `(?![A-Za-z])` for the English words.
  - Allow `[-\s]*` between the digit and the unit.
  - Add hour, `ชั่วโมง` and week.
  - Pin it with two reversal cases, one Thai and one hyphenated.
  - Today's rows are clean under the broader pattern (measured), so the fix should not turn the suite
    red.

### G2 (MEDIUM): a §5/§10 mismatch that changes behaviour is not recorded, invitations

- **Where:** `db/foundation/lint/retention-map.json:2936` (the `app.workspace_invitations` row). ERD:201
  (§5 gives it `TOKEN-SHORT`), ERD:491 (§10 `AUTH-HISTORY`'s data column is "memberships/scopes/**invitations
  history**") and ERD:492 (`TOKEN-SHORT`, "invitation/reset-like records").
- **Defect:** this is the same shape as F160-16, a §10 data column naming a table that §5 files under
  another class, and the batch records F160-16 as a finding. But here the two classes **disagree on
  behaviour**:
  - `TOKEN-SHORT` ends in purge;
  - `AUTH-HISTORY` ends in "anonymize actor fields; retain security minimum 1 year".

  The map gives the row `TOKEN-SHORT` and `["purge"]` with no finding. The purge order puts it in phase 6,
  and no blocker holds the disagreement. The question was whether mismatches are recorded as findings.
  This one is not.
- **Remedy:** record it as **F160-17** in `findings`, with a `also_claimed_by: "AUTH-HISTORY"` /
  `also_claimed_finding` pair on the row (the shape the test already supports for F160-16). Owe it to A1
  Data under Q160-c, widened, in `open_blockers[192]`. Decide nothing: in particular, it is not this
  batch's to say whether "invitations history" means accepted invitations kept as AUTH-HISTORY.

### G3 (MEDIUM): the export fixture labels four tables "not in the minimum domains" that are in them

- **Where:** `test-kits/db/export-manifest.fixture.json:313` (`outside-minimum-domains`, whose reason is
  "Not in §11.1's minimum export domains (ERD:546-555)"). Plan §4 P4 and the handoff's
  `known_limitations` repeat it ("nine tables outside §11.1's minimum domains").
- **Defect:** four of the nine tables are inside the domains:
  - `app.publish_jobs` and `app.performance_snapshots`: ERD:552 lists "Content/version/variant/quality/approval/calendar/**publish
    history**", and the map itself gives both tables `PUBLISH-HISTORY`, whose §10 data column is
    "intent/target/post/**metric**" (ERD:503).
  - `app.quota_buckets` and `app.usage_reservations`: ERD:554 lists "**Usage**/billing invoices/read
    model ที่ส่งออกได้", and the fixture exports `app.usage_events` under that same domain.

  The fixture is right not to decide inclusion. But the stated reason is false for these four, and a
  batch-160 implementer copying the fixture would drop domains §11.1 requires.
- **Remedy:**
  - Move the four into a separately labelled bucket, for example `in-minimum-domain-projection-undecided`
    ("in §11.1's minimum domains (ERD:552 / :554); which rows and fields are exportable is NOT decided
    here").
  - Correct P4 and the handoff line.
  - Optionally, hold the label in the test by checking it against the map's class for PUBLISH-HISTORY
    tables.

### G4 (LOW): one omission reason is false for its table

- **Where:** `export-manifest.fixture.json:293` (`not-workspace-data`, "a global catalog row belongs to no
  workspace"), covering `app.user_profiles`.
- **Defect:** `user_profiles` is not a global catalog row. It is user-scoped PII (ERD:198: scope `user`,
  PII-2, ID-USER). §11.1's minimum domains include "Members/roles/scopes ที่เหมาะสม" (ERD:549), and
  whether a member's profile fields are part of that is an open question. P8 shows the test does not
  hold this omission either way.
- **Remedy:** give `user_profiles` its own bucket and reason ("user-scoped, not workspace-scoped; whether
  member profile fields are exported with ERD:549 is NOT decided here"), labelled as a judgement, the way
  `workspace_invitations` is.

### G5 (MEDIUM): the anonymisation design note is not balanced between the routes

- **Where:**
  - the plan §6, `a0-batch-160-prep-plan-2026-10-03.md:361-412`;
  - the disposition's Q160-b row (`product-owner-disposition-2026-10-03-batch-160-prep.md:93`);
  - `open_blockers[148]`'s extension (WP:402).
- **Defects:**
  1. **A shared dependency is booked to Route A only.** Route A's costs include "It needs
     `app_maintenance` to exist as a working path, which waits on DATA-DEC-03" (line 376). Route B's
     anonymisation, "one UPDATE that nulls `user_id` in the mapping" (line 380), needs exactly the same:
     some role with UPDATE on the mapping table and a policy that admits it, which no service role has
     today (measured: no policy names any service role). Route B's cost list does not say so.
  2. **Route A gets no list of benefits.** Route B does. Route A's advantages are stated nowhere as
     advantages, although each is the mirror of a Route B cost the note records:
     - the 175 closures are untouched;
     - no new SECURITY DEFINER helper or pinned-definer probe;
     - no alias writer waiting on RFC-2026-023;
     - no comment side table;
     - a single-family migration.

     The one Route A strength the note names ("anonymises free text ... the one part that does work",
     line 377) sits under "Cost".
  3. **A Route B cost is missing.** Per-workspace aliases remove the cross-workspace link in **security**
     and audit rows as well. But §10 SECURITY keeps records for "active investigation/legal hold"
     (ERD:513), and an investigator may need exactly that link while the person is still identifiable.
     The note presents unlinkability across workspaces only as a benefit.
  4. **The disposition's one-line cost for B is narrower than the note.** It gives "one indirection table
     ... one cross-family migration ... and one definer resolver". It leaves out the comment side table,
     the alias writer that waits on RFC-2026-023, and (from item 1) the executor. The Owner is asked to
     answer Q160-b from that row.
- **Remedy:** add the executor dependency to Route B's costs and a Benefit list to Route A. Add the
  investigation trade-off. Make the disposition's Q160-b cost line and `[148]` list B's costs as §6 does.
  The recommendation itself may stand. This is about the record the Owner decides from, not about which
  route is right.

### G6 (LOW): `covered_by` counts partial indexes whose predicate excludes the sweep's rows

- **Where:** `indexes160` and `covering160` (`foundation-contract.test.mjs:3738`, `:3758`) read no `WHERE`.
  The map's `covered_by` follows them.
- **Defect:** the live catalog has 33 partial indexes. In two places the only covering index cannot serve
  the sweep the row describes:
  - `app.workspace_invitations` `expires_at`, "after expiry". It is covered only by
    `workspace_invitations_expires_at_idx WHERE accepted_at IS NULL AND revoked_at IS NULL`, so accepted
    and revoked invitations, which TOKEN-SHORT also purges, are outside it.
  - `app.billing_webhook_receipts` `received_at`. It is covered only by
    `billing_webhook_receipts_unprocessed_idx WHERE processed_at IS NULL AND dead_lettered_at IS NULL`,
    and a retention sweep reads processed rows.
  - The other partial cases are either matched to their sweep (`assets_trash_purge_due_idx`,
    `research_snapshots_unpurged_retention_idx`) or have a non-partial alternative.

  So F160-13's "13 sweep keys have no covering index" understates the sweep keys that have no usable index.
- **Remedy:** record the predicate in `covered_by` (or a `partial_predicate` field), and have the test
  re-derive it. Add the two to F160-13 as "covered only for the active subset". This is owed to A1 with
  F160-13.

### G7 (LOW): the purge order's phase labels do not follow §11.4, and the order includes rows a workspace does not own

- **Where:** `db/foundation/lint/purge-order.json` (`_phases` line 4, `order`). The test only checks
  `phase ∈ {6,7,8,9}` (`foundation-contract.test.mjs:3988`).
- **Defects:**
  1. **The phases are not monotone:** `content_versions` and `content_items` (phase 7) come after
     `approval_events`, `approval_requests` and `ai_models` (phase 8); `page_context_profiles` and
     `business_profiles` (phase 7) come after phase-8 rows. This follows from F160-14 and is not wrong as
     an order, but nothing says that the §11.4 step sequence cannot be kept.
  2. **`app.audit_logs` is labelled phase 7**, "tenant content, research, assets ... connector data",
     although ERD:598 (step 8) names audit explicitly: "Anonymize/retain finance, audit, security".
  3. **The order includes six global tables** with no `workspace_id` column (measured): `ai_models`,
     `industry_packs`, `industry_pack_versions`, `billing_plans`, `billing_plan_versions` and
     `plan_entitlements`. It also includes the user-scoped `user_profiles`. All of them are in a
     sequence titled §11.4, "Workspace deletion lifecycle". A workspace deletion does not purge a global
     catalog, and it does not purge a profile shared by other workspaces.
  4. **P5 survived:** relabelling `audit_logs` and `workspace_members` to phase 6 is not caught.
- **Remedy:**
  - Mark global and user-scoped tables as `outside_workspace_purge` (they remain in the graph for
    topological completeness).
  - Move `audit_logs` to phase 8.
  - Add a `_phases` note that the order cannot be phase-monotone while F160-14 stands, and name the rows
    out of step.
  - Have the test check each phase against the row's class.

### G8 (LOW): two declared fields of the purge order are not held by the test

- **Where:** `foundation-contract.test.mjs:3979`, which compares edges as `child>parent` only, and `:4009`,
  which compares conflicts by `fk` only.
- **Defect:** an edge's `fk` name can be anything (P6 survived). A conflict's `child`, `parent` and
  behaviour fields can be wrong (P7 survived). Today all 90 names are true, which I measured live, and the
  12 conflicts' fields are true. Nothing keeps them true.
- **Remedy:** have `fkEdges160` return the constraint name (both forms in the text carry it), and compare
  `fk|child|parent`. Compare conflicts as `fk|child|parent` and check the behaviour arrays against the map.

### G9 (LOW): blocker extensions and finding sources with small untruths

- **Where and what:**
  - `[190]` (WP:444) names `app.schedules`, which does not exist. The table is `app.content_schedules`
    (measured; the text is new in this batch).
  - `[105]` (WP:359): "and this batch used WEBHOOK-SHORT". Under a BATCH 160 PREP heading this reads as
    batch 160 prep, which did the opposite. The plan's F160-08 says batch 131.
  - `[91]` (WP:345) and the plan's P1 call the phase plan "wrong" for listing PUSH-SECRET. The phase plan's
    list is headed "Undefined or mismatched" (`a0-phase-plan-141-170-2026-10-03.md:149`), and PUSH-SECRET's
    §5 assignment is mismatched.
  - The map's `findings[].source` citations (`WP:<line> (open_blockers[i])`) are not checked by any test
    (P10 survived). All 16 are true today, which I checked by line and index.
- **Remedy:** text fixes in the three blockers and in P1. Optionally, add an assertion that each `WP:<n>
  (open_blockers[i])` in the map satisfies `n = 254 + i`; 141 prep's pinned-line test already fixes the
  base.

### Notes (no grade)

- **N1. "12 retention conflicts" is a lower bound.** The rule needs a behaviour on both ends of a key, and
  finding rows have none. 21 FK edges touch a finding row (measured), for example
  `content_targets -> social_accounts`, `social_accounts -> meta_connections` and
  `industry_assignments -> business_profiles`. When Q160-c is answered, the count can grow. F160-14 and
  `_retention_conflicts` should say so.
- **N2. The exclusion test depends on the Author's `section9_classes` picks.** The `SECRET-4` and
  `SECURITY-4` exclusions are found by `section9_classes`, which the test only requires to be *picked
  from* §5's cell. So a different pick moves a table in or out of the rule (P9). The list of ten tables
  named outright and the "nothing in `private`" check cover today's secret-bearing tables. That makes this
  a note, not a finding.
- **N3. The `security_events` omission is a judgement, but it is not labelled as one.** The fixture
  omits all of `security_events` as "security investigative detail". §11.1/5 excludes the *detail*, and
  §11.1's minimum domains include a "Tenant-visible audit trail" (ERD:555). The omission is conservative
  and defensible. It should be labelled a judgement, as `workspace_invitations`' omission is.
- **N4. `[150]` is loosely worded.** It says that "every row ... names `no-deletion-manifest`". The map
  holds it once, in `controls_on_every_row`. The meaning is the same, but the wording is not.

## 5. Stop-the-line

**None.** I measured that:

- no migration, policy, grant, role, CI file or contract changes;
- the live layers are green at the subject head;
- no fixture carries real identity: the two ids are `fixture-catalog.json`'s `workspace_a` and
  `user_owner_a`, and the bodies are synthetic by the stated recipe;
- no secret appears in the diff.

None of G1-G9 is a tenant leak, a secret exposure, a lost job, a migration divergence, an irreversible
deletion or a contract mismatch under `CONTRIBUTING_AGENTS.md`'s list.

## 6. Limits

- I share the Author's vendor and model family (§0). An error we both make, I am unlikely to see.
- I did not re-run the draft's own 27 mutations or its round at `75c9274`. I reproduced a sample of 7 and
  ran my own 10 at `1706111`.
- I did not reproduce the `commit-when-clean` refusals of `159d43b` and `f9d9a79`. Doing so would mean
  moving a branch ref that another worktree has checked out.
- I did not judge whether the Author's class picks for rows §5 reaches by an explicit token (for example
  `approval_policies` under APPROVAL-HISTORY, whose §10 data column is "request/decision trail") are
  what A1 Data intends. I checked only that they follow the rule the map states. I also did not read
  the RFC-2026-022 or RFC-2026-023 texts beyond what the plan quotes.
- Graded findings are my reading. Their disposition (fix, owe or reject) belongs to the Author and the
  Integration Owner, and acceptance of this file as C0's signature belongs to the Integration Owner and the
  Product Owner.
- Scratch, not committed: `scratchpad/c0-160-prep/` holds `round.sh`, `catalog.sql` and its dumps,
  `check.mjs`, `probe.mjs`, `probe2.mjs`, and the logs.
