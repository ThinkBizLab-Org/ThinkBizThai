# Weak-assertion survey of the post-migrate pass

- **Who wrote this:** a read-only subagent of the Author `/claude/a0_atlas`, from the same vendor, working under the Author's brief. This is a survey, not a review signature.
- **Subject head:** `3ade42f` (branch `agent/claude/WP-0A-DB-00-post-migrate-pass`, Draft PR #155), surveyed on a local branch `survey/weak-assertions`.
- **Status:** all 42 blocks classified. For the 10 superseded blocks, the replacement was classified, because that is what runs. (a), (b) and (c) are answered, and there are three new measured drifts.
- **How it was done:** the per-block classification was split across four read-only helpers, one per batch range. I integrated their tables, and I checked by grep or live measurement the claims this file leans on (§1).
- **Markers:** *measured* means observed on the live private cluster; *read* means from source; *inferred* is flagged where it appears.
## 1. Method

- **Read.** Every assertion in all 42 blocks was classified by four read-only helpers, one per range (004–042, 050–071, 080–104, 110–140), each quoting file:line. For the 10 superseded blocks they read the replacements in `db/foundation/invariants/`. I cross-checked the claims this file leans on myself (§7). Two helpers independently agree on §5b.
- **Read.** For (a), (b) and (c) I read `102_updated_by_is_caller.sql`, its replacement, `111_social_fk.sql`, `022_business_service_path_closed.sql`, `isolation-cases.mjs` and `foundation-contract.test.mjs:2399-2414`.
- **Measured.** Each round used a private cluster at `127.0.0.1:5507`, TCP only, set up with `initdb --locale=C -A trust -U postgres` and `LC_ALL=C`, re-initdb'd every round, with the shim applied first. The steps were:
  1. append the drift to `140_audit.sql`;
  2. run `make db-migrate-clean`, then `make db-rls-smoke`, then `node --test test-kits/db/foundation-contract.test.mjs`;
  3. restore `140_audit.sql` byte for byte (checked with `cmp`);
  4. stop and remove the cluster.

  Port 5432 was never touched.

## 2. Measured rounds

| Round | Drift appended to 140 | migrate-clean | rls-smoke | static (67 tests) | Verdict |
|---|---|---|---|---|---|
| r0 | none | ok (42 blocks, 32 as written, 10 replaced) | ok | 67/67 | baseline |
| r1 | none, plus a catalog read | ok | not run | not run | deparse captured (§5) |
| **m1** | `content_targets_social_scope_fk` dropped and re-added `ON UPDATE CASCADE` | ok | ok | 67/67 | **SURVIVOR on every layer.** Catalog: confupdtype=`c` |
| **m2** | the same key added as `content_targets_social_tmp ... ON DELETE CASCADE`, the original dropped, tmp renamed to the original name | ok | ok | 67/67 | **SURVIVOR on every layer, including the static rule A1 relied on for M14.** Catalog: confdeltype=`c` |
| **m3** | `knowledge_items_updated_by_is_caller` rewritten to `... or true` | ok | ok | 67/67 | **SURVIVOR on every layer** (catalog shows `... OR true`). This is a fourth table after A1's three and Q0's D38 |

## 3. Per-block table: 004–042 (read; the helper's classification, spot-checked)

Two facts apply to every block in this group:

- **Fixtures are data loaders only** (no `do` blocks, no SQLSTATE expectations). So "fixtures: nothing found" holds throughout.
- **Static tests read one file each.** Each batch's tests in `tests/db/identity/identity-isolation.test.mjs` read only that batch's own migration (e.g. `:824` reads 021, `:1227` 030, `:1724` 040). The only guard on a later file, 140's (`:4784-4786`), matches `/drop policy/i` and nothing else. An appended `alter policy` is statically invisible.

| Block | Assertion (lines) | Class | What a later file could change unnoticed | Caught elsewhere? |
|---|---|---|---|---|
| 004#1 | `gen_random_uuid` resolvable (31-35) | NAME | practically nothing: a built-in cannot be dropped | — |
| 004#1 | pgcrypto not in `public` (37-48) | ATTR | — | static `foundation-contract.test.mjs:1205-1240` |
| 011#1 | `create role app_authz` if missing (154-159) | none (a DDL guard) | a re-run re-creates the role inside the rolled-back transaction, so it always passes (A1 F4) | authzLint role rules, live in `authz-proofs.mjs:423-427` |
| 011#2 | app_authz role attributes (359-371) | ATTR | — | `run.mjs` authzLint rule 1; `authz-proofs.mjs:423-427` |
| 011#2 | app_authz owns no table (375-383) | ATTR | — | authzLint rule 3 (`run.mjs:506-510`) |
| 011#2 | app_authz functions have prosecdef and `search_path=""` (393-400) | ATTR | a body rewritten to `select true` keeps both attributes | behavioural, in `authz-proofs.mjs:496-503`; cases `isolation-cases.mjs:4716-4752` |
| 011#2 | exactly 1 policy names app_authz (404-413) | COUNT | swap it for another policy, or gut it with `using (true)`, and the count stays 1 | **TEXT live**: authzLint rule 5 (`run.mjs:529-545`, `AUTHZ_POLICY_QUAL` at `:442`), run by rls-smoke. It does not read polpermissive or the full role list (inferred) |
| 020#1 | no UPDATE/DELETE on the version tables for 5 roles (600-615) | PRIV | — | cases 3935, 3959 |
| 020#1 | no `w`/`d` policy on the version tables (621-630) | ATTR | misses a FOR ALL policy | the PRIV row above |
| 020#1 | ENABLE and FORCE on 4 tables (634-643) | ATTR | — | — |
| 020#1 | no service/anon policy (649-664) | ATTR | misses a PUBLIC permissive policy | 022#1 |
| 020#1 | no table owned by app_command (674-684) | ATTR | — | — |
| 021#1 | 1 app_authz policy (748-761) | COUNT | as for 011#2 | authzLint rule 5, TEXT |
| 021#1 | app_authz has no SELECT on scopes (764-772) | PRIV | — | authzLint rule 6 |
| 021#1 | ENABLE and FORCE on scopes (776-784) | ATTR | — | — |
| 021#1 | no UPDATE/DELETE on scopes, 6 roles (791-808) | PRIV | — | cases 4409, 4425 |
| 021#1 | no `w`/`d` policy on the version tables (813-822) | ATTR | FOR ALL | 020 PRIV |
| 021#1 | the four `*_scope_narrows_member` policies are restrictive (829-841) | NAME+ATTR | **the predicate is unread**: `alter policy ... using (true) with check (true)`, or `to anon`, keeps the name and the restrictiveness; the table is not checked either | behavioural only: cases 4075, 4519, 4529, 4541, 4586, 4619, 4644, 4667, 4689 |
| 021#1 | the count of those names = 4 (843-858) | COUNT | the same gutting | the same cases |
| 021#1 | no service/anon policy on scopes (863-874) | ATTR | — | cases 4439, 4450 |
| 021#1 | owner rule (879-891) | ATTR | — | — |
| 022#1 (031#1 and 042#1 are identical templates) | each closure: restrictive, `*`, `{0}`, halves equal, `position('current_user')` and `position('authenticated')` (82-111) | ATTR+TOKEN | both halves rewritten to `... or true` keep the tokens | **TEXT live**: `SERVICE_PATH_CLOSURE_ON` (`isolation-cases.mjs:16937-16941`), one case per table for all 24 closures (measured by grep: 24 distinct tables). Its query string is pinned statically at `identity-isolation.test.mjs:9714-9719` |
| 022#1 | closure count = 4 (112-114; 1 in 031, 2 in 042) | COUNT | counted per family, so two closures on one table and none on another still totals 4 | the per-table TEXT cases |
| 022#1 | every permissive role is bound by some restrictive policy (117-143) | ATTR | existence only; a restrictive `using (true)` satisfies it | the TEXT cases, for closures |
| 022#1 | no permissive policy for PUBLIC or other roles (150-165) | ATTR | a permissive `to authenticated using (true)` is not covered | cross-workspace cases |
| 022#1 | ENABLE and FORCE, owner, app_command not BYPASSRLS (168-188) | ATTR ×3 | — | — |
| 030 (replacement 030_industry.1.sql) | ENABLE and FORCE, 3 tables (9-20) | ATTR | — | — |
| 030 | PRIV rows: no UPD/DEL on versions (29-46); no UPD on keys (64-82); no DEL on assignments (86-99); app_authz has no SELECT (155-163) | PRIV ×4 | — | cases 4916, 4930, 5114, 5128; authzLint rule 6 |
| 030 | no `w`/`d` policy on versions (51-60) | ATTR | FOR ALL | PRIV |
| 030 | the restrictive name set on assignments is exactly {scope_narrows_member, service_path_closed, updated_by_is_caller} (111-120) | name set (strong on names, blind on predicates) | `alter policy industry_assignments_scope_narrows_member ... using (true)` keeps the set, and so does the updated_by closure gutted (A1 M07) | narrowing: behavioural cases 5154, 5190, 5202. **updated_by closure: nothing** |
| 030 | restrictive count excluding the later names = 1 (121-134) | COUNT | redundant with the name set | — |
| 030 | no service/anon policy (139-150); owner (168-180) | ATTR ×2 | — | case 5258 |
| 031#1 | as 022#1, 1 table | ATTR+TOKEN, COUNT, ATTR ×5 | as 022 | TEXT case for `industry_assignments` |
| 040 (replacement 040_knowledge.1.sql) | exact restrictive name sets on items and versions (13-22) | name set | predicates unread (except the next TOKEN row); `knowledge_items_updated_by_is_caller` gutted passes (**measured, m3**) | updated_by: **nothing** (m3) |
| 040 | ENABLE and FORCE (25-33) | ATTR | — | — |
| 040 | PRIV ×4 (41-58, 77-97, 101-117, 222-230) | PRIV | — | cases 5963, 5983; authzLint rule 6 |
| 040 | no `w`/`d` policy on versions (63-72) | ATTR | FOR ALL | PRIV |
| 040 | restrictive count = 2 (124-137); narrowings inspected = 2 (194-199) | COUNT ×2 | redundant | — |
| 040 | the narrowing halves contain `member_scope_admits_business` and `member_scope_admits_page`; the versions narrowing contains `knowledge_items` (156-193) | TOKEN | `admits_business(..) or admits_page(..)`, `... or true`, or an uncorrelated `exists (select 1 from app.knowledge_items)` would each keep the tokens | behavioural: cases 5495, 5507, 5519, 5567, 5580, 5590, 5827, 5849, 6194. No `pg_get_expr` pin |
| 040 | no service/anon policy (204-215); owner (235-247) | ATTR ×2 | — | cases 5736, 5748, 5773, 6021 |
| 041#1 | `knowledge_scope_applies`: not SECURITY DEFINER, immutable, no proconfig (404-422) | ATTR | — | — |
| 041#1 | 9-call truth table (428-491) | PROBE | — | cases 6075–6236 |
| 041#1 | no EXECUTE for 5 roles (503-517) | PRIV | — | — |
| 041#1 | business_profile_id NOT NULL; page nullable (512-528) | ATTR | — | — |
| 042#1 | as 022#1, 2 tables | ATTR+TOKEN, COUNT, ATTR ×5 | as 022 | TEXT cases for both tables |

## 3b. Per-block table: 050–071 (read; a helper's classification, not re-verified line by line)

Static rules for these batches read only their own migration file: `identity-isolation.test.mjs` 2817 (050), 3383 (060), 5655 (061), 6260 (051), 8107 (070). The exceptions are the `migrationText` rules (all files), e.g. the private-grant rule at 3534-3547. For brevity, ATTR and PRIV rows that have no evasion are grouped.

| Block | Assertion (lines) | Class | Evades it | Caught elsewhere? |
|---|---|---|---|---|
| 050#1 | ENABLE and FORCE; 6 privilege negatives; identity always; anon/app_authz/owner rules (949-1182) | ATTR ×5, PRIV ×6 | — | — |
| 050#1 | every `u` constraint on ledger and jobs has the exact column set (1070-1091) | ATTR (set) | **presence is not required** (the query is vacuous when there are no rows); unique INDEXES are invisible | fixture `on conflict` targets raise 42P10 if the key is gone: `050-async-kernel-fixture.sql:64,105` (PG semantics, inferred) |
| 050#1 | unique count on 3 tables = 3 (1095-1103) | COUNT | outbox `event_id` key replaced by `(event_id, producer_module_key)`; a unique index added | fixture `:91` for exactly (event_id); nothing for an added index |
| 050#1 | (absent) CHECKs, e.g. `jobs_lease_is_a_pair`; NOT NULL on `job_type` | — | Q0 D06, D40b survive | nothing |
| 051#1 | ENABLE and FORCE; 7 PRIV rows; anon policy; owner (1240-1511) | ATTR ×3, PRIV ×7 | — | — |
| 051#1 | push-reference columns ⊆ 12-name allowlist (1273-1296) | ATTR (names) | a permitted column retyped to carry the secret | nothing |
| 051#1 | `credential_reference` exists, count 1 (1302-1311) | NAME/COUNT | type or nullability changed | fixture `051:206` (unique only) |
| 051#1 | the two channel CHECKs deparse identical **to each other** (1323-1334) | TEXT-relative | **both rewritten identically (widened, or `check (true)`) passes** | static `identity-isolation.test.mjs:6782-6790` pins the values, 051 text only; no 23514 probe |
| 051#1 | exactly 2 such names (1338-1344) | NAME/COUNT | as above | as above |
| 060#1 | ENABLE and FORCE; owner; app_authz (699-823) | ATTR ×2, PRIV ×1 | — | — |
| 060#1 | credential-reference columns allowlist (727-744); `credential_reference` exists (749-758) | ATTR (names), NAME/COUNT | retype | fixture `060:100` (unique only) |
| 060#1 | two provider CHECKs identical to each other (765-786) | TEXT-relative + NAME/COUNT | both widened together | static 3562-3572, 060 text only |
| 060#1 | (absent) no role/grant negatives on `private.ai_credential_references` | — | grants via roles or default privileges (inferred) | static `migrationText` rule 3534-3547 (all files, regex); cases `isolation-cases.mjs:7253-7304` |
| 061#1 | ENABLE and FORCE; 6 PRIV; numeric(18,6); no float; identity; anon; owner (1114-1454) | ATTR ×6, PRIV ×6 | — | — |
| 061#1 | 3 dimension and 3 quantity_unit CHECKs identical within each group (1242-1263) | TEXT-relative | all homes rewritten together | static 5981-5996 (`includes`, 061 only). **Q0 D02 measured that the keep-name-and-widen case on one home is caught**, because the homes then differ |
| 061#1 | exactly 6 such names (1267-1275) | NAME/COUNT | as above | — |
| 061#1 | `u` constraints have allowed column sets (1336-1358) | ATTR (set membership) | presence not required: `usage_events_dedupe_key_unique` replaced by a second `unique(usage_id)` passes; unique indexes invisible | **nothing** (the fixture conflicts only on usage_id, `061:132,146`) |
| 061#1 | `u` count = 3 (1362-1370) | COUNT | drop the dedupe key and add a unique on usage_reservations | nothing |
| 061#1 | `quota_buckets_one_per_period` nulls not distinct (1376-1391) | NAME+ATTR | — | fixture `061:229` (by name) |
| 062#1 and 071#1 | closure restrictive/`*`/`{0}`/halves equal, plus `current_user` and `authenticated` tokens; count 1 | ATTR+TOKEN, COUNT | `or true`; even `current_user <> 'authenticated'` keeps the tokens | **TEXT live**: `SERVICE_PATH_CLOSURE_ON` cases `isolation-cases.mjs:12883-12904` |
| 062#1 and 071#1 | permissive roles bound; permissive only authenticated; ENABLE/FORCE/owner/BYPASSRLS | ATTR ×3 | — | — |
| 070 (replacement 070_research.1.sql) | exact restrictive name sets, 4 tables (25-44) | name set | predicates free | see the narrowing row below |
| 070 | ENABLE and FORCE; retention NOT NULL, no default; 6 PRIV rows; anon; owner | ATTR ×4, PRIV ×8 | — | — |
| 070 | snapshot columns allowlist (67-83) | ATTR (names) | retype | nothing |
| 070 | 16 forbidden column names absent (88-109) | NAME (denylist) | `excerpt_body`, `cited_passage` | static 8219, 070 only |
| 070 | no CHECK matches `\minterval\M` (135-149) | TOKEN (negative) | `make_interval(...)`, integer arithmetic (inferred) | static 8256-8300, 070 only |
| 070 | restrictive count = 4 (347-363) | COUNT | redundant | — |
| 070 | narrowing halves contain the scope-helper or parent-table tokens; loop count 4 (377-427) | TOKEN+COUNT | `or true`; `to app_worker` (roles unchecked); polcmd unchecked | runs: cases 10384, 10419, 10532; sources: 10628; **evidence and suggestions: no narrowing probe** |
| 070 | (absent) CHECK `research_sources_uri_no_traversal` | — | Q0 D10 survives | nothing |

## 3c. Per-block table: 080–104 (read; a helper's classification, not re-verified line by line)

- **Fixtures** name no closure. The only incidental name dependencies are `080-content-fixture.sql:220` (`content_variants_logical_key`) and `100-asset-fixture.sql:307` (`content_asset_links_logical_key`).
- **The static closure-shape rule** (`identity-isolation.test.mjs:9689-9760`) reads only the `*_service_path_closed.sql` files. No static test reads 102's policy text.

| Block | Assertion (lines) | Class | Evades it | Caught elsewhere? |
|---|---|---|---|---|
| 080 (replacement) | exact restrictive name sets, 5 tables (22-46) | name set | bodies under the same names | closures TEXT 12673-12714; narrowings see below; **updated_by: nothing** |
| 080 | ENABLE and FORCE; 7 PRIV rows; no a/w/d on 3 immutable tables; owner | ATTR ×3, PRIV ×7 | — | — |
| 080 | no policy names a non-authenticated role (218-230) | ATTR | a TO PUBLIC permissive policy is invisible | nothing |
| 080 | `content_variants_logical_key` unique, nulls not distinct (237-252) | NAME+ATTR | recreated over other columns | fixture 080:220 (name only) |
| 080 | restrictive count 5; narrowing loop count 5 | COUNT ×2 | redundant with the name set | — |
| 080 | narrowing tokens (290-320) | TOKEN | `or true` | items 11240, 11251, 11285, 11464; versions 11740, 11753; variants 11901; quality_reviews 12037; **content_ideas: no scope case** |
| 080 | (absent) CHECK `content_versions_body_not_blank`; NOT NULL on `business_profile_id`; column set | — | Q0 D07, D40, D47 survive | nothing |
| 081 (replacement) | exact restrictive name set (20-24) | name set | bodies | closure TEXT 12724; **updated_by: nothing** |
| 081 | ENABLE and FORCE; 6 PRIV; owner; service roles | ATTR ×3, PRIV ×6 | — | — |
| 081 | no other FK on `social_account_id` (44-75) | ATTR+NAME | — | — |
| 081 | `content_targets_social_scope_fk` exists, contype f (62-66) | NAME | the actions (**measured m1, m2**) | 111#1 pins the columns; §5c |
| 081 | `item_scope_fk` and `variant_scope_fk` exist, 3 columns (80-97) | NAME+COUNT+ATTR | columns, target, action | case 12464 (23503, inferred) |
| 081 | `content_targets_active_destination` unique, partial, exact columns (105-129) | NAME+ATTR+TEXT(columns) | predicate unread (`WHERE false`) | case 12422 (23505) |
| 081 | DELETE policies = 0; permissive r/a/w = 3; restrictive = 1 | COUNT ×3 | swap UPDATE for a second SELECT | cases 12284, 12511, 12535 |
| 081 | narrowing tokens, count 1 (316-353) | TOKEN+COUNT | `or true` | 12148, 12160, 12182, 12355, 12369 |
| 082#1 | closures restrictive/`*`/`{0}`; halves equal; `current_user`/`authenticated` tokens; count 5 (161-201) | ATTR + TEXT-relative + TOKEN + COUNT | `or true`; even `current_user <> 'authenticated'` | **TEXT live** 12673-12714 |
| 082#1 | S8 rule; no service privilege; FORCE/owner/BYPASSRLS | ATTR ×2, PRIV ×1 | S8 is satisfied by a restrictive `using (true)` | TEXT cases |
| 083#1 | as 082, 1 table (39-152) | as 082 | as 082 | TEXT 12724 |
| 090 (replacement) | exact restrictive name sets, 3 tables (20-34) | name set | bodies (requester, updated_by) | closures 12735-12753; requester case 13486; **updated_by: nothing** |
| 090 | ENABLE and FORCE; 7 PRIV; no a/w/d on events; service roles; owner | ATTR ×3, PRIV ×7 | — | — |
| 090 | no WITH CHECK on requests contains `expired` (261-275) | TOKEN (negative) | `status <> 'approved'` admits it without the token | a builder exists at 17512 (case not located) |
| 090 | 2 permissive UPDATE policies need `workspace_member_role` and `status` tokens, count 2 (282-315) | TOKEN+COUNT+ATTR | `or true` | approval cases around 13231-13500 (inferred) |
| 090 | restrictive count 3 (321-331) | COUNT | redundant | — |
| 090 | narrowing tokens (344-392) | TOKEN | `or true` | 12992, 13003, 13026, 13328, 13339, 13360, 13779, 13803 |
| 090 | `approval_requests_pinned_version_fk` exists, 4 columns (400-415) | NAME+ATTR | columns, target, action | nothing |
| 092#1 | as 082, 3 tables (57-170) | as 082 | as 082 | TEXT 12735-12753 |
| 093#1 | every table with a client-updatable `updated_at` has a BEFORE UPDATE trigger calling `private.set_updated_at` (55-82) | PRIV+ATTR+NAME | **DISABLE TRIGGER** (tgenabled unread); function body replaced | content_items only: case 12660 (Q0 D18, D21 caught by rls-smoke only) |
| 093#1 | `set_updated_at` trigger exists on 5 tables (87-96) | NAME | as above | as above |
| 094#1 | requester closure: name, restrictive, `a` (39-46) | NAME+ATTR | polroles unchecked | static contract:2140 (094 only) |
| 094#1 | WITH CHECK contains `requested_by` and `auth.uid` (47-49) | TOKEN | `or true` | case 13486 (A1 N19) |
| 094#1 | `requested_by` not updatable (52-54) | PRIV | — | — |
| 100 (replacement) | exact restrictive name sets, 4 tables (30-49) | name set | bodies | closures 12762-12789; **updated_by: nothing** (A1 N21) |
| 100 | ENABLE and FORCE; 7 PRIV; retention no default; w/d; anon; owner | ATTR ×4, PRIV ×7 | — | — |
| 100 | asset_versions columns ⊆ allowlist (68-78) | TEXT (one direction) | a dropped column | — |
| 100 | forbidden blob/prefix names absent (82-123) | NAME ×2 (denylist) | unlisted names | nothing |
| 100 | `asset_versions_object_key_names_one_object` exists (129-139) | NAME+ATTR | `CHECK (true)` under the name | **Q0 D10b measured a drop is caught by this replacement**; a rewrite is not (read) |
| 100 | no CHECK matches `\minterval\M` (146-157) | TOKEN (negative) | integer days | — |
| 100 | `content_asset_links_logical_key` nulls not distinct (344-354) | NAME+ATTR | uniqueness and columns unread | fixture 100:307 (name only) |
| 100 | restrictive count 4 (359-370) | COUNT | redundant | — |
| 100 | narrowing tokens (379-423) | TOKEN | `or true` | 14031, 14041, 14335, 14346, 14562, 14781 |
| 100 | (absent) CHECK `assets_purge_follows_deletion`; no app_worker check | — | Q0 D09 survives | nothing |
| 101#1 | as 082, 4 tables, plus permissive-only-authenticated (73-189) | as 082 | as 082 | TEXT 12762-12789 |
| 102 (replacement) | 13 closures by name LIKE: restrictive, `a`, tokens (12-23) | COUNT+ATTR+TOKEN | `or true` (**measured m3**); polroles and table list unchecked | forging cases for 3 of 14 (§5b) |
| 102 | 14 by name (24-29) | COUNT | swap | — |
| 102 | publish_intents closure (30-38) | NAME+ATTR+TOKEN | `or true` | case 15232 (A1 M12) |
| 102 | general rule (42-59) | PRIV+ATTR+TOKEN | any policy with the tokens qualifies, permissive included | — |
| 103#1 | 3 column-privilege checks (46-64) | PRIV ×3 | — | — |
| 104#1 | every FK has a supporting index, 4 exempt by name (80-98) | ATTR+TEXT(indpred)+NAME | an exempt key redefined over other columns | `run.mjs:99-118` repeats it live |
## 3d. Per-block table: 110–140 (read; a helper's classification, not re-verified line by line)

| Block | Assertion (lines) | Class | Evades it | Caught elsewhere? |
|---|---|---|---|---|
| 110 (replacement) | ENABLE and FORCE; nullable, identity; 6 PRIV; anon; owner | ATTR ×5, PRIV ×6 | — | — |
| 110 | credential-reference and inbox column allowlists (34-55, 77-94) | TEXT (exact allowlist of names) | a permitted column retyped | — |
| 110 | `credential_reference` exists (60-69) | NAME/COUNT | retype | nothing |
| 110 | unique keys ⊆ allowed column sets on social_accounts and inbox (142-172) | ATTR (allowlist form) | **dropping** `(workspace_id, external_account_hash)` or `(delivery_hash)` passes; a partial unique index bypasses it | not grepped (inferred) |
| 110 | `social_accounts_scope_key` over {id, workspace_id} (173-180) | NAME+ATTR | — | the FK depends on it |
| 111#1 | FK by name, validated, conkey/confkey, target by relname (78-93) | NAME+ATTR+COUNT | **ON UPDATE CASCADE (measured m1), ON DELETE under a rename (measured m2)**, DEFERRABLE (read); target schema not checked | §5c |
| 111#1 | no second FK on the column (98-108) | ATTR | — | — |
| 111#1 | index leads with the two columns (111-119) | NAME+ATTR | partial or invalid index (inferred) | the FK-support probe rejects a non-`IS NOT NULL` predicate (inferred) |
| 120 (replacement) | exact restrictive name sets (34-58) | name set + ATTR | the content of the requester, updated_by and closure policies | requester case 15216; updated_by case 15232; closures TEXT 16085-16110 |
| 120 | ENABLE and FORCE; owner; `set_updated_at` owner | ATTR ×2 | — | — |
| 120 | destination key columns (72-85); social FK columns (97-108) | NAME+ATTR | — | — |
| 120 | two FKs by name, validated (86-95) | NAME+COUNT+ATTR | the content-target FK's columns | static, 120 text only |
| 120 | no FK on 5 tables has `confdeltype <> 'a'` (112-128) | ATTR | **confupdtype not read** | nothing |
| 120 | `publish_targets_status_known` `~ 'pending'`… `!~ 'cancelled'`; `publish_jobs_status_known` `~ 'queued'`, `~ 'succeeded'` (132-142) | TOKEN | a value added (e.g. `retrying`), or `OR true` (Q0 D05 measured that a widening *is* caught when it removes a token; an addition is not) | probe 15 covers `cancelled` only |
| 120 | about 10 PRIV rows; polcmd; polroles; TO authenticated alone except 2 pairs (150-321) | PRIV ×11, ATTR ×3 | — | — |
| 120 | narrowings: restrictive FOR ALL, tokens in both halves, count 5 (326-360) | ATTR+TOKEN+COUNT | `OR true`; **the permissive select/insert/update policies are not asserted** | isolation read/write cases (inferred) |
| 120 | 3 `set_updated_at` triggers by name and function (363-375) | NAME+COUNT | **DISABLE TRIGGER** (tgenabled unread) | nothing |
| 120 | 5 CHECK probes, SQLSTATE and constraint name (393-477) | PROBE | one value each | — |
| 120#2 | 11 unique/PK constraints by name (1452-1466) | NAME | columns rewritten under the name | nothing found |
| 120#2 | 33 NOT NULL (1468-1482) | ATTR | — | — |
| 121#1 | 2 unique keys by name (442-452); 7 CHECKs by name (475-486); index by name (590-596) | NAME ×3 | rewritten under the name | fixture probes `121-publisher-metrics-fixture.sql:150-186, 241-335` (one value each) |
| 121#1 | 7 NOT NULL; policy roles = authenticated; identity (457-679) | ATTR ×3 | — | — |
| 121#1 | privileges; SELECT 8 and INSERT 6 column counts (491-550) | PRIV+COUNT | a worker INSERT column swapped, same count | nothing |
| 121#1 | quoted-key set of 3 CHECKs = the 10 keys (615-636) | TOKEN (exact token set; **not** full text) | logic gutted with the same ten keys (`OR true`) | fixture probes; key set repeated at fixture `:367` |
| 121#1 | select policy qual `LIKE '%is_active_member%'` (652-662) | TOKEN | `... OR true` | nothing (Q0-121 F2) |
| 121#1 | (absent) FORCE | — | **Q0 D30 survives** | nothing |
| 122#1 | closures restrictive/`*`/`{0}`/halves equal/tokens, count 2 (86-118) | ATTR+TOKEN+COUNT | `OR true` | **TEXT live** 16085-16110 |
| 122#1 | permissive roles bound; exact privileges; ENABLE/FORCE/owner/BYPASSRLS | ATTR ×2, PRIV ×1 | — | — |
| 130#1 | ENABLE and FORCE; PRIV ×3; w/d; numeric(18,6); no float; anon; owner | ATTR ×6, PRIV ×3 | — | — |
| 130#1 | card-shaped column-name regex (1025-1043) | TOKEN | names outside the regex | nothing (stated limit) |
| 130#1 | `billing_subscriptions_one_live_per_workspace` by name, unique, has a predicate, count 1 (1076-1089) | NAME+ATTR+COUNT | **columns and predicate unread**: rebuilt over `(id)` or `WHERE false` passes | not grepped |
| 131#1 | guard creating `billing_subscriptions_workspace_key` | none (a DDL guard, A1 F4) | always passes | 131#2 |
| 131#2 | receipts allowlist (1274-1296) | TEXT (allowlist) | — | — |
| 131#2 | both digest columns present (1301-1310) | NAME/COUNT | types | nothing |
| 131#2 | payment-instrument name regex (1320-1338) | TOKEN | unlisted names | nothing |
| 131#2 | ENABLE/FORCE; PRIV ×6; numeric; anon; owner | ATTR ×5, PRIV ×6 | — | — |
| 131#2 | FK column sets ⊆ allowlist (1502-1526) | ATTR (allowlist) | **a dropped FK passes**; confrelid, confkey and confdeltype unread | the FK-support exemption list, `run.mjs:76-81, 106-109`, catches a drop of 3 exempted names, by accident |
| 131#2 | `billing_subscriptions_workspace_key` by name, count 1 (1531-1542) | NAME+COUNT | columns | dependent FKs block a drop (inferred) |
| 132#1 | two name-denylist regexes (423-460) | TOKEN ×2 | unlisted names (stated) | — |
| 132#1 | two tables exist (465-471) | NAME | — | — |
| 140#1 | ENABLE and FORCE; PRIV ×2; w/d; service/anon; owner | ATTR ×4, PRIV ×2 | — | — |
| 140#1 | 4 triggers calling `private.refuse_mutation` (858-873) | COUNT | **DISABLE TRIGGER** (tgenabled unread; Q0 D20b measured); a trigger moved between the two tables; timing or event changed | audit_logs by the probe (by accident, Q0 F6); **security_events: nothing** |
| 140#1 | probe on audit_logs: UPDATE, DELETE and TRUNCATE raise ZZ140 (887-968) | PROBE | security_events is never probed | — |

## 4. Count by class, all 42 blocks (read; approximate)

Rows are counted in the helpers' granularity: a loop over N tables counts once, and a mixed row counts under its weakest content check. The totals are ±10%.

| Class | ≈ Rows | What it means for later drift |
|---|---|---|
| ATTR | 146 | robust for the attribute read. The recurring blind spots are **tgenabled** (093, 120, 140), **confupdtype** (120, 111), **condeferrable** (111), **atttypid** (the allowlisted secret columns in 051, 060, 070 and 110), and **presence** in allowlist-shaped key checks (050, 061, 110, 131) |
| PRIV | 110 | robust |
| NAME (incl. NAME+ATTR, NAME+COUNT) | 37 | a constraint, index or FK rewritten under the same name passes. Main sites: 120#2 (11 keys), 121 (CHECKs, keys, index), 130 (partial unique index), 131 (workspace key), 081/090 FKs, 093 triggers, 100 CHECK |
| TOKEN | 34 | `… or true` keeps the tokens. Sites: every narrowing (040, 070, 080, 081, 090, 100, 120); 120's status vocabularies; 121's `is_active_member` LIKE and its quoted-key set; all closures (service-path ones backed by a live TEXT pin, the updated_by and requester ones not); the name-denylist regexes (070, 100, 130, 131, 132) |
| COUNT | 32 | most are redundant with a name set. The unbacked ones: 050/061 unique counts, 121 column counts, 140 triggers, 102's 13/14 |
| TEXT-relative (a constraint equal to another, no fixed value) | 12 | the 051/060/061 vocabulary CHECKs and the closure halves: **all homes rewritten identically pass** |
| Exact NAME sets / column-name allowlists | 13 | exact on names, blind on content |
| PROBE | 3 | 041 truth table, 120's five CHECK probes, 140's audit_logs probe |
| DDL guard (asserts nothing) | 2 | 011#1, 131#1 (A1 F4) |
| **TEXT: full deparse equal to a fixed value** | **0** | **no block does this.** The only full-text pins in the repository run in rls-smoke, not in migrate-clean: `SERVICE_PATH_CLOSURE_ON` (`isolation-cases.mjs:16937-16941`) and `AUTHZ_POLICY_QUAL` (`run.mjs:442`, checked by `authz-proofs.mjs`). 121's "text" pin is an exact set of quoted tokens, not the constraint's text |
## 5. Answers to (a), (b) and (c)

### (a) The closure policies' expressions

There are 40 closures in the live catalog (**measured**, r1): 24 `*_service_path_closed`, 14 `*_updated_by_is_caller`, 2 `*_requester_is_caller`. Their deparsed text on PG 17 (**measured**):

- **service path**: `(CURRENT_USER = 'authenticated'::name)` in both halves; restrictive, FOR ALL, TO PUBLIC.
- **updated_by**: WITH CHECK `((updated_by IS NULL) OR (updated_by = ( SELECT auth.uid() AS uid)))`; restrictive, INSERT, TO authenticated.
- **requester** (approval_requests, publish_intents): `(requested_by = ( SELECT auth.uid() AS uid))`.

Which blocks check them, and how strongly:

- **Service-path closures.** The in-block checks are ATTR+TOKEN: 022, 031, 042 (read), and by the same template 062, 071, 082, 083, 092, 101 and 122 (read; §3–§3d). **They are already TEXT-pinned live**, per table, for all 24, by `SERVICE_PATH_CLOSURE_ON` (`isolation-cases.mjs:16937-16941`; measured by grep that 24 distinct tables are covered). The pin runs in rls-smoke, not in migrate-clean. This corrects my earlier interim handback, which said tokens only. It is consistent with A1's "caught only by rls-smoke" (M05, M13, N23) and with Q0 D35–D37b.
- **updated_by closures.** The 102 replacement (`invariants/102_updated_by_is_caller.1.sql`) checks restrictive + polcmd `a` + `position('updated_by')` + `position('auth.uid')`, and counts 13 + 1 by name (read):
  - the first count does not check polroles;
  - the general rule accepts ANY INSERT policy for authenticated that contains both tokens;
  - the 030, 040, 080, 081, 090 and 100 replacements only exclude these closures by (table, name).

  **No TEXT pin anywhere**, live or static (read; grep finds `pg_get_expr` equality only in `SERVICE_PATH_CLOSURE_ON` and `AUTHZ_POLICY_QUAL`). `or true` survives every layer (**measured**: m3 on knowledge_items; A1 M07/N21/N22 on industry_assignments, assets, content_ideas; Q0 D38 on business_profiles).
- **Requester closures.** 094's block (and 120's replacement for the publish_intents one) checks tokens (A1 cites 094 block line 13; read). No TEXT pin. They are caught behaviourally by forging cases (A1 N19; `owner-a-cannot-request-a-publish-intent-as-somebody-else`).

What an exact-text pin would look like (read, from the measured deparse). Put it either in the 102 replacement (a replacement edit, additive, allowed) or as a `run.mjs` probe:

```sql
select string_agg(format('%s on %s', pol.polname, pol.polrelid::regclass), ', ') into offending
  from pg_catalog.pg_policy pol
 where pol.polname like '%\_updated\_by\_is\_caller' escape '\'
   and not (not pol.polpermissive and pol.polcmd = 'a'
            and pol.polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]
            and pol.polqual is null
            and pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)
                = '((updated_by IS NULL) OR (updated_by = ( SELECT auth.uid() AS uid)))');
```

The requester pin is the same with `(requested_by = ( SELECT auth.uid() AS uid))`. For the service-path closures the live pin exists already. Moving it into migrate-clean would only add apply-time coverage; it is not a gap closure.

### (b) updated_by forging cases in rls-smoke (read)

A case counts only if created_by is the caller and updated_by is another member. A forged created_by is refused by the permissive policy first and never exercises 102's closure.

| Table (closure) | Forging INSERT case? |
|---|---|
| page_context_profiles | **yes**: `owner-a-cannot-create-a-page-in-the-editors-name`, `isolation-cases.mjs:4185-4196` |
| content_items | **yes**: `owner-a-cannot-create-a-content-item-in-the-editors-name`, `:11358-11371` |
| publish_intents (120's fourteenth) | **yes**: `owner-a-cannot-request-a-publish-intent-naming-another-updater`, `:15232` |
| workspace_invitations | no. The builder at `:2371` omits updated_by entirely |
| business_profiles | no. The builder at `:2383` repeats created_by (Q0 D38 measured the survival) |
| workspace_member_scopes | no (`:2469-2479`, `$3,$3` / `$4,$4`) |
| industry_assignments | no (`:2519`; A1 M07 measured) |
| knowledge_items | no (`:2567`, `:2578`; **measured m3**) |
| content_ideas | no (`:17035`; A1 N22 measured) |
| content_targets | no (`:17199-17262`, all `$5,$5`) |
| approval_policies | no (`:17432`) |
| approval_requests | no (`:17456-17488`; the `approvalRaiseRequestFor` builder forges requested_by, not updated_by) |
| assets | no (`:17646`; A1 N21 measured) |
| asset_rights | no (`:17764`) |

**11 of 102's 13 tables have no forging case.** 2 of the 13, plus 120's publish_intents, do.

### (c) content_targets_social_scope_fk ON DELETE / ON UPDATE

Nothing asserts `confdeltype`/`confupdtype` in the catalog:

- 111's block (`111_social_fk.sql:71-120`) checks contype, convalidated, the target, conkey/confkey order, that no second FK sits on the column, and the index (read).
- The 081 replacement excludes the key by (table, name), and asserts only that it exists as contype f (081.1.sql:62-66; read).
- No fixture or case reads it (grep; read).

The static rule `foundation-contract.test.mjs:2403-2414`:
- forbids `on (delete|update)` in 111's own text;
- in later files it matches only `content_targets_social_scope_fk[\s\S]{0,300}on\s+delete`.

So:
- **m1 (ON UPDATE CASCADE) survives every layer: measured.**
- **m2 (ON DELETE CASCADE written under a temporary name, then renamed) survives every layer, the static rule included: measured.** A1's statement that the static rule covers M14 is true only for the direct spelling.

Measured in r1: **all 87 FKs in `app` and `private` carry NO ACTION on delete and update**. So a schema-wide rule needs zero exemptions today.

## 6. Prioritised strengthening, cheapest and highest value first

These are my recommendations, not decisions.

A structural fact decides where each item can live. A replacement exists only for a block that a later file made FALSE (the register's rule, Q0 F6). A strengthened check of a block that still PASSES therefore has only three homes:

- a `run.mjs` live probe (the FK-support probe's pattern);
- a new batch's own block;
- a new "additional final-state assertion" class, which would be a design change for the Owner and the Integration Owner.

1. **FK-action probe in `scripts/db/run.mjs`.** Every FK in app and private must have `confdeltype = 'a'` and `confupdtype = 'a'`, with named exemptions. There are zero today (**measured**, 87 of 87). It closes m1 and m2 (**measured survivors**), A1 M14, the 081/090 FK actions, and every future key. *run.mjs plus its test; no migration.*
2. **updated_by and requester closures pinned by text, per named table**, as a `run.mjs` probe (§5a SQL). This is preferred over an edit to the 102 replacement, because Q0 F9 found that pins added in a replacement can be deleted unnoticed. It closes A1 F3, Q0 F5/D38 and m3 in migrate-clean. *No migration.*
3. **Eleven forging INSERT cases** (§5b tables) in `tests/db/identity/isolation-cases.mjs`: created_by = self, updated_by = another member, expecting a policy denial. This is a behavioural backstop for item 2. *Case edit only (static floors move).*
4. **A live SECURITY DEFINER `search_path=""` probe and a trigger `tgenabled = 'O'` probe** in `run.mjs`. The trigger probe covers 140's four refuse triggers and every `set_updated_at` trigger, and could share one query. It closes Q0 D14, D15, D44, D20b and the 093/120 disable gap (read). *No migration.*
5. **Name-only objects batch 150 will rebuild.** Batch 150 rebuilds `app.performance_snapshots` (blocker 185). 121's block holds its unique keys, index and 4 CHECKs by NAME (121 lines 442-596), its three metric CHECKs by quoted-token set, its policy by `LIKE '%is_active_member%'`, and FORCE not at all (Q0 D30). *Batch 150's own block* should pin these by `pg_get_constraintdef`/`pg_get_indexdef`/`pg_get_expr` equality, with `relforcerowsecurity`. That is a migration, and the most time-critical item.
6. **Fixed-value text pins of the TEXT-relative vocabulary CHECKs** (051 channel, 060 provider, 061 dimension and quantity_unit). Today an identical rewrite of every home passes (read). *A run.mjs probe or a later block.* Add **unique-key presence** for 061's `usage_events_dedupe_key_unique`, which has no probe at all (read).
7. **Narrowing predicates pinned by text.** The narrowings of 021, 040, 070, 080, 081, 090, 100 and 120 are held by TOKEN or name only. Behavioural cases catch most of them, but not the content_ideas, research_evidence or research_suggestions narrowings (read). *A case in the `SERVICE_PATH_CLOSURE_ON` pattern, or a run.mjs probe*, plus a rule binding the permissive policy set per table.
8. **Tighten the static social-key rule** (`foundation-contract.test.mjs:2412`): match `on\s+(delete|update)` keyed on the table. It is cheap but textual, and item 1 supersedes it.
9. **Structural:** a live catalog snapshot covering 011–140 (Q0 F7). It subsumes most of the above.

## 7. Limits

- **The classification is from reading.** Four helpers classified the 42 blocks, one batch range each, and I did not re-verify their rows line by line. I did verify these central claims: the live `SERVICE_PATH_CLOSURE_ON` pin covers 24 tables (grep); the forging-case inventory (read, and it agrees across two helpers and my own read); the social-FK static rule (read and measured); and 102's replacement (read in full).
- **The class counts are approximate** (§4) and depend on row granularity.
- **Only three new drifts were measured** (m1–m3). Other survivor claims cite A1 and Q0 measurements or are read. "Caught elsewhere" cites come from grep and may miss a behavioural case that catches something indirectly. Where a helper said inferred, the row says so.
- **Deparse text was measured on PG 17** (`/opt/homebrew/bin`). CI uses `postgres:17`; that it renders identically is inferred.
- **The static rounds ran `foundation-contract.test.mjs` only** (67/67), not the full `npm run verify` or `identity-isolation.test.mjs`. The m1–m3 survivals are therefore claims against migrate-clean, rls-smoke and foundation-contract. Per the helpers' reading, `identity-isolation.test.mjs`'s rules read single files and would not see an appended `alter`; that is read, not measured.
- **Out of scope:** fixtures for 110, 130 and 140 were not examined in depth.
- **The grading disagreement (A1 F3 MEDIUM vs A1-090 LOW) is not resolved here.** This file approves nothing.
