# A1 security review: batch 160 preparation

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-160-prep` (PR #170, Draft, open, not merged),
  head `1706111` (`1706111f822cfa87d61943fdb3ed0f29e586878f`) over code `159d43b`
  (`159d43bb1b780ef7677ab953cbb7d229b35ba405`), base `c7fe264` (main). Author `/claude/a0_atlas`.
- **Checked out as:** local branch `review/a1-batch-160-prep` at `1706111`, in this run's own worktree.
  The branch name is checked out in the Author's worktree. So for `verify`, `check:handoff` and branch
  scope I made a local clone in my private directory (`a1-160-prep/repo`). In that clone I created
  `agent/claude/WP-0A-DB-00-batch-160-prep` at `1706111` (HEAD confirmed by `git rev-parse`, the
  `origin/main` there is `c7fe264`, tree clean) and measured on that name, not detached. I committed
  nothing there. The mutation probes (§3) ran in that clone, and every file was restored byte for byte
  (`git status --short` empty afterwards).
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch. I am the same
vendor and model family as the Author. Under RFC-2026-024 that is the stated independence limit of this
role run. Accepting this review as the A1 role's signature is the Integration Owner's and the Product
Owner's act, not mine.

## 1. Read and measured

**Read:**

- `CONTRIBUTING_AGENTS.md`.
- The plan, `a0-batch-160-prep-plan-2026-10-03.md`, in full.
- The disposition, `product-owner-disposition-2026-10-03-batch-160-prep.md`, in full.
- All five commit messages, `c7fe264..1706111`.
- `git diff c7fe264..1706111`, read as follows:
  - `export-manifest.fixture.json`, the three new tests (`foundation-contract.test.mjs:3664-4011`), the
    `test-suite-contract.mjs`, `VERIFICATION.md` and `branch-identity.test.mjs` hunks: in full.
  - Every changed `open_blockers` entry, by the text each one appended (computed against `c7fe264`;
    each of `[4]`, `[77]`, `[91]`, `[105]`, `[148]`, `[150]` and `[190]` keeps the old text as a
    prefix), and `[192]`: in full.
  - `ownership.amends_without_owning`: in full.
  - The handoff: every field.
  - `retention-map.json`: `_what`, `_shape`, `controls_on_every_row`, `section10_classes_without_a_row`,
    all 16 findings, and the rows for `audit_logs`, `security_events`, `approval_requests`,
    `user_profiles`, `workspaces` and `meta_webhook_inbox`. Every row was read by script for its §5
    cell, its picked §9 classes, its class and its export disposition.
  - `purge-order.json`: `_what`, `_phases`, the cycle break, the self-references and the conflicts; the
    whole order was read by script, with phase and class.
- From the governing documents:
  - ERD (`sprint-0a-core-erd-rls-retention-th.md`): §5 (196-219), §9.1-9.3 (440-480), §10 (484-526) and
    §11.1-11.4 (528-600).
  - The phase plan's "Batch 160" section (`a0-phase-plan-141-170-2026-10-03.md:133-172`).
  - `140_audit.sql`: `audit_logs` and the refusal triggers (685-697).
  - `010_identity.sql`: `user_profiles` (113-134) and the lifecycle check (156-157).
  - `001_service_roles.sql:30`.
  - The source lines the findings cite: 050:373-379, 060:162-170, 070:478, 091:59 and 100:421-423.
  - `scripts/verify-test-coverage-floor.mjs:538-566`, how the guard counts.
  - `product-owner-disposition-2026-10-03-batch-127.md` and `-129.md`, for the quoted Owner words.

**Measured** (Node `v24.20.0`, checked with `node -v` before each measured run; scratch under
`a1-160-prep/`):

| command | where | exit | result |
|---|---|---|---|
| `npm run verify` | branch name (clone) | **0** | `clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0` |
| `npm run check:handoff` | branch name (clone) | **0** | `describes the branch: nothing substantive after its cited head` |
| `node scripts/verify-branch-scope.mjs c7fe264 WP-0A-DB-00` | branch name (clone) | **0** | `all 12 changed path(s) are declared, and every amendment explains one` |
| `node scripts/scan-repository-secrets.mjs` | review branch | **0** | clean |
| guard count (`stripNonCode`, `countDeclaredTests`, the guard's `\bassert\.\w+\(` and its name-digest recipe, imported from the guard) | `c7fe264` / `1706111` | 0 | **77 / 633 / `a91ced9f62276ebe`** -> **80 / 720 / `8c35e631c28c0574`**. Matches the floors and the digest exactly. |
| PII/secret pattern grep (email, Thai phone, `sk_live`/`sk_test`, JWT, `password`, `bearer`, URL) over the three new data files | review branch | 0 | One hit: the word "bearer" in a reason string (fixture:307). No value. |
| fixture ids against `db/foundation/seeds/fixture-catalog.json` | node | 0 | `workspace_id` = `workspace_a`, `requester` = `user_owner_a` (uuid5 fixture identities) |
| `git diff --name-only c7fe264..1706111`, filtered to migrations, invariants, `ci/`, seeds, prerequisites, `scripts/db/`, `Makefile`, `.github/`, isolation cases and `tests/db` | | 1 (no match) | No input to a live layer changed. `scripts/db/run.mjs` reads `catalog-snapshot.json`, `rls-exemption-register.json` and `service-policy-map.json` by name, and no script, Makefile target or workflow names the three new files. |
| `git diff --stat 75c9274 c7fe264 -- db docs contract-catalog` | | 0 | Only `db/foundation/README.md`, `audit-coverage-map.json` and `service-policy-map.json` changed. This confirms plan §0.1. |
| `open_blockers[i]` on `WP-0A-DB-00.json` line `254+i`, for i in 4, 77, 91, 105, 120, 148, 150, 190, 191, 192 | node | 0 | All 10 match. So the map's `WP:258/331/345/359/374/404/444/446` citations are true. |
| the manifest outside `open_blockers` and `ownership` | node, against `c7fe264` | 0 | Unchanged |
| probes, §3 | clone, branch name | 0 | 17 one-file edits, each restored. Baseline and after-restore runs: green. |
| `gh pr view 170` / `gh pr checks 170` | | 0 | Draft, open, head `1706111`, MERGEABLE. CI `bootstrap` **pending** (run 37143863333). |
| `gh pr view 169`, `gh run view 37141584373` | | 0 | Merged at `2026-10-03T17:51:16Z` as `c7fe264` (parents `c5a648e`, `4d1f10c`). The run is "Bootstrap validation", success, on `4d1f10c`. This confirms disposition §3. |
| `lsof -nP -iTCP:5501 -sTCP:LISTEN` | | 1 | Nothing listening on 5501 |

**Not run: the live DB.** Nothing a live layer reads changed (see the diff row above). The question set
names no drift that needs re-running. I started no cluster on 5501, so none was left to stop or remove.
Nothing was appended to `140_audit.sql`. Ports 5432 and 5499 were not touched.

## 2. The questions

### 2.1 Does the retention map or the export fixture leak anything?

**No. Measured.**

- The secret scan is clean.
- The pattern grep finds no value.
- The fixture's two identities are the fixture catalog's uuid5 ids.
- Every checksum comes from a stated synthetic recipe over `{fixture_row, table}`. No row content
  exists.
- The map holds table names, column names, ERD quotations and ids. It holds no data.
- `section10_classes` quotes §10's final-behaviour cells verbatim, and some of those contain §10's own
  numbers (for example "retain security minimum 1 year"). That is a quotation of the repository's own
  document, not an encoded window, and no row carries one today (measured: no row's JSON matches a digit
  followed by an English or Thai unit). But see S1: the guard that is meant to keep it that way does not
  hold the Thai half.

### 2.2 Does any of it imply a deletion or anonymisation path that bypasses `refuse_mutation` or `set_decided_at` without a decision?

**No path is created or implied as available.**

- No migration, grant, policy or trigger changes (verified by diff).
- The map names `refuse_mutation` and `refuse_truncate` on `audit_logs` and `security_events`, and
  `set_decided_at` on `approval_requests`, as what blocks the behaviour today. Each row carries `Q160-b`
  (and `DATA-DEC-06` for audit and security).
- Plan §6's Route A describes narrowing `refuse_mutation` and `set_decided_at`. It is a costed design
  option, recommended against (Route B), and recorded as UNANSWERED on `[148]` and in disposition §5.
- The purge order's cycle break needs an `app_worker` UPDATE, and its own text records that update as
  "Blocked today".
- The self-reference note ("delete every version … in a single statement") describes a DELETE no role
  holds.

Two weaknesses sit around this question:

- The test holds `refuse_mutation` both ways but not `set_decided_at` (S2).
- The purge order places `audit_logs` among the tenant-content purges without saying that
  `refuse_mutation` refuses that DELETE for every role (S3).

Neither one opens a path today.

### 2.3 Are the excluded export classes truly excluded and tested?

**In the fixture as it stands, yes.**

- No table whose §5 family cell carries SECRET-4 or INTERNAL-3 is in `files`. The one with SECURITY-4
  is `audit_logs`, which §11.1 names as a minimum domain ("Tenant-visible audit trail", ERD:555). It
  carries no IP or user-agent column (`140_audit.sql`, `audit_logs` body). Those columns are on
  `security_events`, which is excluded.
- The ten tables named outright are omitted, and nothing in `private` is exported.
- Probes confirm the test turns red when `security_events` or `meta_webhook_inbox` is moved into
  `files`.

**As a guard against a later edit, it is weaker than the plan and the handoff say** (S4).

- The exclusions are found by the map's `section9_classes`. That field is a per-table pick, and the
  test only checks that it is a **subset** of §5's family cell (`foundation-contract.test.mjs:3835`).
- Six tables whose §5 cell is `…/SECRET-4` did not pick SECRET-4. Measured: moving any of
  `notifications`, `meta_connections` or `ai_model_policies` into `files` stays green. So does moving
  `workspace_invitations` (token hash) or `user_profiles`.

### 2.4 Is any retention-relevant control misdescribed?

**Yes, three.**

- **The no-retention-number guard** (S1). The plan says "in English or Thai". The Thai half never
  matches.
- **The purge order's phase for `audit_logs`** (S3). It is placed in §11.4 step 7, but step 8 names
  audit.
- **The `user_profiles` omission reason** (S5). It calls the table "a global catalog row".

There is also one small naming error in `[190]` (S6).

## 3. Probes (measured, clone on the branch name, each edit restored byte for byte)

`probe.mjs`: one-file edits, each followed by the three batch-160 tests:

| edit | result |
|---|---|
| include `app.notifications` in `files` (checksums recomputed) | **green, not caught** |
| include `app.meta_connections` | **green, not caught** |
| include `app.ai_model_policies` | **green, not caught** |
| include `app.workspace_invitations` | **green, not caught** |
| include `app.user_profiles` | **green, not caught** |
| include `app.security_events` | red, caught |
| include `private.meta_webhook_inbox` | red, caught |
| `audit_logs` phase 7 -> 6 | **green, not caught** |
| `security_events` phase 8 -> 6 | **green, not caught** |
| `audit_logs` row: drop the `refuse_mutation` control | red, caught |
| `approval_requests` row: drop the `set_decided_at` control | **green, not caught** |
| `audit_logs` row: `refuse_mutation` `blocks` -> "nothing" | **green, not caught** |
| `controls_on_every_row[0].what` -> "app_maintenance may purge any row." | **green, not caught** |

`probe2.mjs`: a window written into a row's sweep `basis`:

| edit | result |
|---|---|
| `user_profiles`: "30 วัน" | **green, not caught** |
| `audit_logs`: "1 ปี" | **green, not caught** |
| `approval_requests`: "12 เดือนหลัง final state" | **green, not caught** |
| `user_profiles`: "30 days" (control) | red, caught |

Direct regex check:

- `/\d+\s*(day|…|วัน|เดือน|ปี)\b/i` returns false on `"30 วัน"`, `"1 ปี"` and `"30วัน after"`.
- It returns true only when an ASCII word character follows the Thai unit (`"30 วันx"`).

Without the `u` flag, `\b` is an ASCII word boundary. Thai letters are non-word characters to it, so
there is no boundary between a Thai unit and the quote, space or Thai letter after it.

## 4. Findings

| id | grade | finding | where | remedy |
|---|---|---|---|---|
| **S1** | **MEDIUM** | **The Thai half of the "no row carries a retention number" guard cannot fire.** The `\b` after `วัน`, `เดือน` or `ปี` needs an ASCII word character next, and §10 writes every window in Thai ("30 วัน", "12 เดือน", "1 ปี", "7 ปี"). Three Thai windows written into rows stay green; the English control turns red (§3). Plan §1(a) (plan:79-80) says the test refuses a number "in English or Thai". The handoff's `security_privacy_cost_impact` lists "a retention number written into the map" among what the tests refuse. Both are true for English only. No row carries a number today (measured), so nothing is encoded. But the one guard standing between this map and an agent-chosen window from an open decision (§15, ERD:484) does not hold in the language the windows are written in. | `test-kits/db/foundation-contract.test.mjs:3856` | Drop `\b` from the Thai alternatives. For example, `/\d+\s*(?:(?:days?\|months?\|years?)\b\|วัน\|เดือน\|ปี\|ชั่วโมง)/i` (§10 also uses ชั่วโมง, "24 ชั่วโมง", UPLOAD-TEMP). Add the three Thai probes above, and one with no space ("30วัน"), to the mutation set. Correct plan §1(a) to say what is held. |
| **S2** | **LOW** | **`set_decided_at` is not held both ways.** Every `refuse_mutation` trigger in the migration text must be named on its row (`:3900-3902`), and removing it is caught. Removing `set_decided_at` from `approval_requests` stays green (§3). The phase plan lists `set_decided_at` among the controls the map must record (phase plan:161), and it is the control Route A would narrow. A later edit could make the map silent about the one trigger that refuses anonymising `decided_by`. | `test-kits/db/foundation-contract.test.mjs:3900-3902` | Extend the two-way check to `private.set_decided_at`, and to any trigger whose function refuses a write to an `anonymise_columns` column. Add the probe. |
| **S3** | **MEDIUM** | **The purge order misdescribes where audit goes.** `app.audit_logs` is phase 7, "§11.4 step 7: tenant content, research, assets and connector data" (`purge-order.json:6`, `:536-537`). Step 8 (ERD:598, quoted at `purge-order.json:7`) names audit with finance and security as records to be "anonymised or kept". §11.2 says audit history is never cascade-deleted. The file also says nothing, per table, that `refuse_mutation` refuses DELETE on `audit_logs` and `security_events` for every role. The phase is read from AUDIT's "anonymise + purge" behaviour, not from §11.4's step. Phases are tested only for membership in {6,7,8,9} (`foundation-contract.test.mjs:3988`): moving `audit_logs` or `security_events` to phase 6 stays green (§3). The order also interleaves phases (positions 44-47 read 8, 8, 7, 7 and 61-63 read 8, 7, 7), so phase and position disagree. A batch-160 worker scheduling by phase would purge the tenant audit trail with tenant content. The phase plan says 160 must replace `refuse_mutation` (phase plan:146), so that trigger will not stay as the backstop. No executor exists today, so nothing can act on it. | `db/foundation/lint/purge-order.json:536-537`; `foundation-contract.test.mjs:3988` | Put `audit_logs` in phase 8, or record why not as a finding owed on `[192]` under DATA-DEC-06/Q160-b. Name, per table, the refusal trigger that blocks the purge (or cross-reference the map row). Hold phase in the test: a table whose final behaviour includes retain or anonymise, or whose class is AUDIT, SECURITY or FINANCE-HISTORY, is not in phase 6 or 7. Phases are non-decreasing along the order, or each inversion is declared with its conflict. |
| **S4** | **LOW** | **The export exclusions rest on a per-table pick that the test does not justify.** `section9_classes` only has to be a subset of §5's family cell (`:3835`), and the five exclusions read that pick (`:3952-3958`). Six tables under a `…/SECRET-4` cell did not pick it: `ai_models`, `ai_model_policies`, `meta_connections`, `notification_preferences`, `notifications` and `social_accounts`. Those six, and `workspace_invitations` (whose PII-2/AUTH-3 pick is not an exclusion) and `user_profiles`, are kept out of the export only by the fixture's own `omitted` list. Five of them, moved into `files`, stay green (§3). Each pick is defensible per table: the family's SECRET-4 member is the `private.*` reference table, which is excluded. Still, the plan's "found by a property of the map, not by the fixture's own lists" and the handoff's "met" for "a static test that SECRET-4 … never appear" are stronger than what is held. | `foundation-contract.test.mjs:3835`, `:3952-3966`; `retention-map.json` rows | Record, per row, why a class in §5's cell was not picked (`section9_not_picked: [{class, why}]`), and have the test require that reason. Or hold the exclusion against §5's full cell with an explicit, reasoned allow list: `audit_logs` as "Tenant-visible audit trail" (ERD:555), and the family tables whose secret sits in `private.*`. |
| **S5** | **INFO** | **`user_profiles`' omission reason is wrong for that table.** It sits in `not-workspace-data`, whose reason is "a global catalog row belongs to no workspace". `user_profiles` is per-user PII-2 (ID-USER), not a catalog row. Omitting it is the conservative choice, and nothing leaks. Whether §11.1's "Members/roles/scopes" domain needs a member display projection is not decided, and is not said to be. | `test-kits/db/export-manifest.fixture.json:293-294` | Give `user_profiles` its own omitted class and reason (user-scoped PII, no workspace column; member projection undecided), and label it a judgement as P4 does. |
| **S6** | **INFO** | **`open_blockers[190]`'s 160 extension names `app.schedules`.** No migration creates that table. It is `app.content_schedules`, and the map's F160-11 has it right. | `work-packages/WP-0A-DB-00.json:444` | Correct the name in the next manifest edit. |
| **S7** | **INFO** | **The workspace purge order lists six global tables** (`ai_models`, `billing_plans`, `billing_plan_versions`, `plan_entitlements`, `industry_packs`, `industry_pack_versions`) in phase 8. The test requires the order to cover every table (`:3986`), but a workspace deletion must never touch a global row. The export fixture already calls these "not-workspace-data". | `purge-order.json` `order`; `foundation-contract.test.mjs:3986` | Mark global tables `scope: global, not purged by a workspace deletion`, or exclude them from the order with a reason the test holds. |

## 5. Claims checked

**True, measured or read:**

- Commits and cherry-picks:
  - the five commits and their order, with the handoff commit last and alone;
  - `60105df` and `8f935a5` are cherry-picks of the draft (their messages keep the draft's 73->76 and
    500->587, labelled as the draft's in the plan);
  - `159d43b` and `f9d9a79` were plain commits, with commit-when-clean exiting 1 on the two
    not-yet-refreshed handoff tests only (stated in the plan, the handoff and the commit messages; I did
    not re-run the refused commit).
- Floors and records:
  - 77->80 tests, 633->720 assertions and the digest `a91ced9f62276ebe`->`8c35e631c28c0574`, by the
    guard's own count;
  - `VERIFICATION.md` at 684 (verify: 684/684).
- Branch scope:
  - `verify-branch-scope` exits 0 with 12 paths. The plan's "10" was measured at `159d43b`, before the
    plan and disposition commit.
  - Four amended paths are declared, each with a rationale for this branch.
  - The branch slot moved in both the manifest and `branch-identity.test.mjs`.
- Blockers:
  - the seven blocker extensions are appends; old text is kept as prefix;
  - `[191]`'s change is the trailing comma only;
  - `[192]` is new and at the end, and it cross-references rather than repeats;
  - nothing else in the manifest moved;
  - the `254+i` line rule holds;
  - the map's `WP:` citations match.
- Source citations: ERD:204/210/211/214/215/216/218/219 and §10's rows 488-514, and the migration
  lines 010:156-157, 050:373-379, 060:162-170, 070:478, 091:59 and 100:421-423.
- Phase plan: "Batch 160 — 3. Can do now" sits at phase plan:156-167, as the plan says.
- Disposition:
  - the Owner's three quoted strings appear verbatim in the 127 and 129 dispositions;
  - #169's merge facts (`c7fe264`, `2026-10-03T17:51:16Z`, run 37141584373 green on `4d1f10c`);
  - Q160-a..d are recorded UNANSWERED;
  - no migration, policy, grant or retention number is added.
- Handoff: `check:handoff` exits 0. `head_revision` cites `f9d9a79`, the head before the handoff
  commit.
- Live DB: no live-layer input changed, so not re-running it is justified.

**Not true as written:**

- Plan §1(a) and the handoff's impact line, on Thai numbers (S1).
- The plan's and handoff's "found by a property of the map", as a guarantee (S4). Its letter is true;
  the property is author-picked.
- `[190]`'s `app.schedules` (S6).

## 6. Stop-the-line verdict

**No stop-the-line.**

- Nothing here can leak a secret or tenant data. The fixture and the map hold no values, and the
  secret scan is clean.
- Nothing changes isolation: no migration, grant, policy or trigger.
- Nothing can delete, irreversibly or otherwise. No executor exists, and no DELETE is granted to any
  role.
- Nothing diverges a migration.

S1 and S3 are guards that claim more than they hold, in data that batch 160 will consume. They are not
incidents today.

**Does anything block the merge?** Nothing I found is stop-the-line, so nothing here blocks it by that
rule. I recommend a review round for S1 and S3 before the merge, because each corrects a claim that the
plan or the handoff makes about a retention control. S2, S4 and S5-S7 may be recorded and owed instead.
Independently of A1:

- the required check on `1706111` was **pending** when measured (run 37143863333);
- the C0 and Q0 role runs have not reported here;
- Integration Owner evidence (RFC-2026-025 §5) is still owed, as the disposition itself says.

## 7. Limits

- Same vendor and model family as the Author (§0).
- I did not run the live database; no live-layer input changed. The plan's live counts (66 tables, 90
  keys, 216 UPDATE pairs, 269 indexes) are taken from the draft's measurement at `75c9274` and from the
  static tests, which passed. I did not re-derive them against a catalog.
- I did not re-run the draft's 27 mutations. I ran my own 17 probes (§3).
- I read the map rows by script and six of them in full. I did not hand-check every row's `covered_by`
  list or each anonymise column against the migrations; the test does that, and it passed.
- I did not judge the ERD's own retention numbers or the Owner-level decisions (Q160-a..d,
  DATA-DEC-03..10). They are not mine to take.
- CI on the head was pending; I did not wait for it.
