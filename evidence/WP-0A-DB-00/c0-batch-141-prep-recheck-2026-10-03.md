# C0 contract review re-check: batch 141 prep's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-141-prep`, head
  `9be87ca27e31b8a769e25088768be331eb9a9d89` over code `cc00ccc`, base `c5a648e` (main). Author
  `/claude/a0_atlas`. Draft PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/169>. Previously
  reviewed head: `047a0e2` (my review: `c0-batch-141-prep-contract-review-2026-10-03.md`, on this branch
  as `549e76d`).
- **Re-check branch:** `recheck/c0-batch-141-prep`, which I created at the subject head `9be87ca`. This file
  is its only commit.
- **Scope:** narrow. I re-checked my own findings G1-G4 and N1-N2, what the round changed to answer them and
  the other reviewers' findings, and the claims the round makes. I did not redo the first review.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; plan `a0-batch-141-prep-plan-2026-10-03.md`, §2, §4, §5 and
  the new §7; disposition `product-owner-disposition-2026-10-03-batch-141-prep.md`, which this round did
  not change; `git diff c5a648e..9be87ca` and `git diff 047a0e2..9be87ca` (12 files); the six commit
  messages after `047a0e2`; RFC-2026-022 §3 (lines 170-180) and §7.2 (504-515); `scripts/db/run.mjs`
  2600-2665; `140_audit.sql` 410-500 and 738-741; ERD §8-§11; SEC-009, PDPA-007/008, BIL-013, OPS-002,
  OPS-006 (`meta-security-production-ops-workstream-th.md`); OB-005 and FP-005
  (`module-contracts-events-jobs-workstream-th.md`); `open_blockers[32, 33, 191]`; the handoff.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024 that makes this an independent-role run by configuration, not by provenance: I share the
Author's training and blind spots. Acceptance of this file as the C0 role's signature is the Integration
Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** The round adds no migration, no policy, no grant and no role change. No file under
  `db/foundation/migrations/` and no file under `contract-catalog/` changes against `c5a648e`.
- **Blocks the merge: no.** All four of my findings are answered: G1 by remedy (a) and (b) together, G2 as
  asked, and G3 and G4 as asked. N2 is answered, and N1 is answered except for one line (N1 below). The
  round leaves two LOW findings and four notes (§4). None is a false statement that would mislead a
  decision, but H1 should be fixed before anyone answers Q141-b from the disposition.
- **Answers to the four questions, re-asked on the head:**
  1. *The §8.4 classification* is still **correct**. The rows are unchanged apart from their `why` text
     (A1 R1/R5) and still CARRIED, which is RFC-2026-022 §3's verdict (RFC-022:175, "the row being written
     names its workspace"). They are still inside `CELL_FIELDS` (`run.mjs:2606`). The amended
     `_shape.batch` now describes what the two rows say, so G4 is closed. The mismatch with §7.2 is
     recorded as `open_blockers[191]` (8).
  2. *The coverage map* is **complete against the sources it now names**, and its `_what` names only
     those: SEC-009, OB-005, PDPA-007/008, BIL-013, OPS-002, OPS-006, and ERD §8, §10 and §11. Walking any
     further source is owed to A0 on `open_blockers[191]` (5). **Every blocker citation is true**: all 33
     `{index, line, quote}` triples hold (the test checks this, and I checked meaning; see §3.2). Two
     LOW/INFO points remain: H2 and N2.
  3. *The CTR-AUD-001 conformance* is still **read-only and faithful**. The divergence I found under G2
     is now listed (`ids_not_blank_narrows_min_length`, F15), and the test holds it in both directions.
     The undeclared list is F1-F4 plus F15, and I found nothing else hidden. My probe C9 now bites.
  4. *The phase plan's correction table* is **correct**. The file did not change in the round, and I
     re-printed all nine corrections at `75c9274` (§2).

## 2. Measured, and how

Node `v24.20.0`: `node -v` before every measured run, with `/Users/bank/.local/node-v24.20.0/bin` first on
PATH. I measured on the branch NAME. `agent/claude/WP-0A-DB-00-batch-141-prep` is held by worktrees
`wf_a6bb823c-490-1`, `-5` and `-8`. Its ref and its `origin/` ref were both `9be87ca` (`git rev-parse`).
I checked it out here with `git checkout --ignore-other-worktrees`, ran the commands, and returned to
`recheck/c0-batch-141-prep`. `git status` was empty before and after, and I never moved the ref.

| command | exit | result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs c5a648e WP-0A-DB-00` | 0 | `all 28 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` | 0 | `describes the branch: nothing substantive after its cited head` (cited head `f8f1320`; only the handoff changes after it) |
| `npm run verify` | 0 | `clean: exit 0 — tests 681, pass 681, fail 0, skipped 0, todo 0` |
| `make db-schema-lint` / `make db-contract-check` | 0 / 0 | `db-schema-lint: ok` / `db-contract-check: ok` |
| assertion count, `foundation-contract.test.mjs`, `\bassert\.\w+\(` | n/a | 635 on the head (615 at `047a0e2`). The guard's figure is 2 lower on every tree, as measured in my first review, so 633 is right: the floor in `test-suite-contract.mjs` equals the count and has no slack, as the earlier floors did |
| integrity manifest `files` | n/a | 88 digests, as claimed |
| `git diff --name-status c5a648e f8f1320` | n/a | 20 A, 8 M, 0 D; the handoff lists 20/8/0, which matches `9be87ca`'s message |
| cherry-pick provenance | n/a | `git diff a231fe7 549e76d`, `a7b8c48 db699ee` and `1062fc2 251db95` on each review file are empty, and each commit carries `(cherry picked from commit …)` |
| `open_blockers` against `047a0e2` | n/a | 192 entries. Only `[33]` and `[191]` differ. `[33]` is no longer append-only: the F3 sentence is reworded in place, which is what G3 asked for, and F15 and the widened F6 are appended. `[191]` keeps (1)-(4) and appends (5)-(9) |
| PR #169 (`gh`, read-only) | n/a | OPEN, Draft, head `9be87ca`, base `main`, check `bootstrap` SUCCESS |
| phase plan corrections, printed at `75c9274` | n/a | WP:79-83 RFC-021..025; WP:96 `"docs/**"`; WP:56 `"exclude": [`; WP:382 generation_runs; WP:282 140's guarantee; RFC-022:504 the §7.2 heading, 508-515 the example; WS:909 heading, 911 fixture, 913-917 budgets, 914 SLO, 905-907 migration tests; ERD:850 RLS-matrix item, 852 retention disposition; ERD:440 the §9.1 header. All nine hold |
| my reversal probes (`scratchpad/c0-141-prepr2/probes.mjs`), 32 on the four `batch 141 prep` tests | n/a | **29 bite; 3 survive (R11, R12, R18, see N3/N4)**. Every file was restored (`Buffer.equals`), or removed if the probe created it. `git status` was empty afterwards, and no `999_probe.sql` was left behind |

**Probes.** I re-ran 14 of my first-round probes (C1-C12, C15, C16) on the head, and all 14 bite.
**C9**, the `actor_id` not-blank CHECK changed to `length(actor_id) > 5`, survived the full suite in the
first round and now bites, with the message `actor_id: audit_logs_actor_id_not_blank is
length(btrim(actor_id)) > 0`. The new probes:

| probe | outcome |
|---|---|
| R1 the review-round row `delete.account` removed | bites (`the coverage map lost delete.account`) |
| R2 a `producer` key added to a row | bites (closed key set) |
| R3 a §8 cell set to `Zone` (§3, outside §8) | bites (§8 slice) |
| R4 a later migration: `create policy p on "app"."audit_logs"` | bites |
| R5 a later migration: `alter table app.security_events add column x jsonb` | bites (`AUDIT_TABLE_ALTER`) |
| R6 a `jsonb` column added to 140's body | bites (`columnsOf` reads every type) |
| R7 `error_code` not-blank loses `btrim` | bites |
| R8 `check_narrowings` drops `error_code` | bites (both directions) |
| R9 the F6 rights fixture's category changed to `sharing` | bites (Q0-F5's assertion) |
| R10 blocker 191 loses "WHETHER ANOTHER DOMAIN DOCUMENT … IS OWED TO A0" (made lowercase) | bites |
| R11 a later migration: `grant insert on app.audit_logs to authenticated` | survives the four tests (N3) |
| R12 `_shape.batch` reverted to the old text | survives everything (N4) |
| R13 the security row moved to `app.audit_logs` | bites |
| R14 the "(F15) 140's not-blank CHECKs" sentence altered in blocker 33 | bites |
| R15 `support.manual_replay` loses its 191 citation | bites |
| R16 a sixth not-blank CHECK (on `reason_key`) not named in `check_narrowings` | bites |
| R17 a later migration: unqualified `create policy p on security_events` | bites |
| R18 a later migration: `create trigger … before insert on app.audit_logs` | survives the four tests (N3) |

I ran R11, R12 and R18 again under the full `scripts/run-test-suite.mjs`. R11 and R18 fail there, but any
new, unregistered migration file fails the suite, so I cannot attribute those failures to the grant or the
trigger. R12 survives.

**Live layers: not run.** Nothing a live DB layer reads changed between `047a0e2` and `9be87ca`. The round
changed no migration, invariant, fixture SQL, isolation case, Makefile or CI file. The two lint files are
read only by `schema-lint` (`run.mjs:2579`) and the static suites. I measured F15's premise live in the
first round (a one-space actor id refused by `audit_logs_actor_id_not_blank`), and the CHECK text it rests
on is unchanged, which R7 and C9 pin. I started no cluster. Nothing listens on 5505 (`lsof`), and my
private dir `c0-141-prepr2/` holds only scripts and logs.

## 3. Read and checked, not executed

### 3.1 My findings, one by one

- **G1 (MEDIUM): answered.** Eleven rows were added, and `_what` (`audit-coverage-map.json:2`) was narrowed
  to "complete against those sources ONLY", with the rest owed on `open_blockers[191]` (5). The test pins
  both the narrowed claim and 191's sentence (R10). Every row I asked for is present:
  - `delete.business_or_page`, on `app.business_profiles` and `app.page_context_profiles`, with §8
    "Business/Page INSERT/UPDATE/archive";
  - `security.security_event` on `app.security_events`;
  - OB-005's admin actions, as category-null rows with notes, folded into F6.

  The added sources are quoted at the lines they cite: `meta-security…:185`, `:186`, `:230`, `:377`,
  `:381`, `:388`, ERD:526, ERD:542, §9.1's "raw security event, replay anomaly" (ERD:455), §11.2 and
  §11.3. Seven new rows are category-null, as the plan says (security, approval policy, workspace
  update, export, replay, banner, hold). That makes nine with the two original ones, and the widened F6
  on `[33]` names exactly the seven. Two residues remain: H2 and N2.
- **G2 (LOW): answered.** `check_narrowings` names five columns. The test reads `audit_logs_*_not_blank`
  from the body and asserts set equality (R16). It pins each CHECK's exact text, including the
  `x is null or` form for the two nullable columns, `causation_id` and `error_code` (C9, R7). It also
  asserts that every mapped contract path is `type: string`, `minLength: 1`. F15 is on `[33]`, owed to
  Q141-b, and pinned (R14). `security_events_actor_id_not_blank` (140:603) is outside this reading, which
  is right, because no contract governs that table (F5).
- **G3 (LOW): answered**, in `store-conformance.json`, `[33]`, plan §5 F3 and handoff
  `known_limitations[0]`. Each now says that note (3) names the `correlation_id` copy and that the same
  holds, unstated, for `actor` and `causation_id`.
- **G4 (LOW): answered.** `_shape.batch` (`service-policy-map.json:13`) now gives the owning-batch reading
  for a cell no migration classified, and `[191]` (8) records the mismatch for A1. The lint's own error
  text still says "the batch that classified it" (`run.mjs:2619`); see N4.
- **N1 (note): mostly answered.** Plan §4's schema-lint row (line 73) and handoff `tests[3]` are corrected.
  Plan line 76 still has the old sentence (N1 below).
- **N2 (note): answered.** Handoff `acceptance_results[5]` reads "23 paths at b99218e; 28 at f8f1320", and
  `tests[2]` is labelled "(at b99218e)". I measured 28 on the head.

### 3.2 The coverage map's citations, by meaning

The test checks that each quote is in the blocker and that the blocker opens on that line (254+i). I also
checked that each citation is the right one for its row. Ten new rows cite 191 for "AUDITED ACTIONS THE
COVERAGE MAP DID NOT NAME", and (5) names each of those actions. `security.security_event` cites 191 (7),
which is the platform-scope gap, and 21; (5) also names it. `billing.admin_adjustment` cites 80, which
holds the billing write path, and 191. The rows with no table (export, adjustment, banner, hold) cite no
`[21]`, which is consistent: `[21]` is about writing audit rows for tables that exist. Every table named
is created by a migration (the test checks this), and every §8 cell is in the §8 slice (R3).

### 3.3 The service-policy rows after A1 R1/R5

The `why` texts now say three things. First, for a denial, the workspace is the one the actor asked to act
in. Second, each row is re-confirmed when Q141-a is answered. Third, any service INSERT policy owes the
scope-path check of `open_blockers[32]`, which I read: neither audit table has a foreign key. None of these
changes the classification. The statement still names its workspace as an input, so §3's test still lands
on CARRIED. `140_audit.sql:740-741` still grants only SELECT and INSERT to `app_worker`.

### 3.4 Claims in commits, plan §7, blockers and handoff

- **True:** `cc00ccc`'s list of changes, finding by finding; "no migration, no policy, no grant"; 613 to
  633 with no test added or renamed (681 tests, unchanged); the 88 digests; the plan §7.1 cherry-pick
  map; §7's new test line numbers (3321, 3359, 3486, 3601); "rows sit six lines lower" (the original
  rows 122 and 136 at `b99218e` are now 128 and 142); `9be87ca`'s refresh counts.
- **Read, not measured:** A0's "1 control survives; 20 of 20 mutations bite" (`a0-141-prepr2/`). My own
  probes cover the same ground (§2).
- **Untrue by omission:** the disposition and three places that summarise it still describe Q141-b with
  the pre-round input (H1).

## 4. Findings

### H1 (LOW): the decision surface for Q141-b still describes the pre-round input. F15 and the widened F6 are on the blocker, but not in the disposition, the handoff or plan §5.

- **Where:**
  - `product-owner-disposition-2026-10-03-batch-141-prep.md:86`, the Q141-b row: "countersigning now also
    countersigns F1-F4 by name, and F6 (no category for a rights change or a schedule transition)";
  - the same file, `:76-77`: "F1-F4 … four further items on the new `open_blockers[191]`";
  - plan `:106`: "countersigning now countersigns F1-F4 by name";
  - handoff `open_risks_or_blockers[0]` (`handoffs/WP-0A-DB-00-author-handoff.json:166`): "F1-F4 included by
    name";
  - handoff `reviewer_instructions` (`:179`): "Check F1-F4".
- **What:** after the round, `open_blockers[33]` says that countersigning 140's reading "countersigns F15 by
  name too". It also says F6 covers nine category-null rows, not two, and `[191]` now holds nine items, not
  four. The disposition is where Q141-b is put to A0+A6 (and its row is still UNANSWERED). Read alone, it
  understates what a countersignature commits to. The blocker it cites is right, so this is an omission,
  not a false record. But G2's whole point was that a countersignature should not be given without
  naming the narrowing.
- **Remedy:** append a dated "after the review round" line to the disposition's Q141-b row, or below the
  table: "F1-F4 and F15 by name; F6 now covers nine category-null actions; `[191]` holds (1)-(9)". Make
  the same edit to plan `:106` and to the handoff's `open_risks_or_blockers[0]` and `reviewer_instructions`
  at the next refresh.

### H2 (LOW): two category-null rows carry the id prefix `support.`, which reads as the category the row says is not chosen. `_shape.source` no longer describes the rows' sources.

- **Where:** `audit-coverage-map.json:277` (`support.manual_replay`), `:292` (`support.service_health_banner`),
  `:18` (`_shape.source`: "SEC-009, OB-005, or an open blocker").
- **What:** every row with a category has an id prefix equal to its category: `role.`, `credential.`,
  `publish.`, `delete.`, `billing.` and `support.break_glass_access`. Every other category-null row uses a
  prefix that is not a category: `owed.`, `security.`, `admin.`, `export.` and `hold.`. These two rows
  break that pattern. Their `category_note` says "Not chosen here" and calls the replay "support" by who
  does it and "publish", "billing" or "delete" by what it repeats, yet the id has already said "support".
  `_shape.id` makes ids stable ("a renamed row is a new row"), so if Q141-b picks another category, the
  row's id is either misleading forever or the row becomes a new row. Separately, eleven rows now cite
  PDPA-007/008, BIL-013, OPS-002, OPS-006, ERD §10, §11 or the CTR-AUD-001 examples as `source`, and
  `_shape.source` lists none of them.
- **Remedy:** rename the two rows now, before anything cites them, for example to `ops.manual_replay` and
  `ops.service_health_banner`, and update the test's `reviewRound` keys. Widen `_shape.source` to "the
  document row or ERD section that obliges the audit (see `_sources`), or an open blocker".

### N1 (note): one sentence of the old N1 remains.

Plan line 76 (the `db-migrate-clean`/`db-rls-smoke` row) still says the service-policy map is a file
"which only the static `schema-lint` target reads". Line 73 and §7.3 (line 174) say it correctly. The
conclusion (no live run needed) is unaffected. Remedy: reuse line 174's wording.

### N2 (note): the first specimens for the walk owed on `open_blockers[191]` (5).

These are not failures of the narrowed claim. They are what the owed walk will find first:

- **FP-005** (`module-contracts-events-jobs-workstream-th.md:313`, "Flag audit/expiry/owner … every change
  has actor/reason/time"). This is an admin change, audited, in the same document as OB-005.
- **§8.4's "Tenant audit SELECT … approval trail"** (ERD:399). This gives the Approver an audit read whose
  content is the approval trail. That implies approve, reject and request-changes decisions (ERD:375) are
  either audit records or that "approval trail" means `app.approval_events`. Which of the two it is should
  be decided, not left to be read.

Remedy: cite both in `[191]` (5) as known inputs, or leave them to the walk. Either is fine.

### N3 (note): the tripwires cover policies and ALTER only, and `[191]` (9) names only policies.

R11 (a later `grant insert on app.audit_logs to authenticated`) and R18 (a later `create trigger` on the
table) survive the four tests. Each is a way a later migration changes who can write an audit row. The
full suite fails on the probe migration, but only because it is unregistered (§2), so I cannot credit
that failure to the grant or the trigger. Remedy: word `[191]` (9)'s owed catalog assertion as "every
role's privileges, policies and triggers on either audit table", not policies alone.

### N4 (note): `_shape.batch`'s new reading is pinned by nothing, and the lint's message still has the old one.

R12 (restoring the old text) survives the whole suite, and `run.mjs:2619` still says "the batch that
classified it". Both belong with `[191]` (8), which A1 and A0 resolve together. No change is needed now.
If (8) is settled in the register's favour, the lint message moves with it.

## 5. Limits

- One model family. I share the Author's blind spots (RFC-2026-024).
- Narrow re-check. I re-read the round's diff and my own findings, and I did not repeat the first
  review's full read of 140, the contract leaves, or the 70-odd phase-plan citations. The phase plan's
  file is unchanged since that read, and I re-printed its nine corrections.
- I did not run A0's 21 round probes (`a0-141-prepr2/`); their count is read. My own 32 probes are
  measured.
- No live round this time (§2). F15's live premise is from my first round on 5505. The CHECK text it
  depends on is unchanged and statically pinned.
- I did not walk domain documents beyond the ones the map now names, plus FP-005 and ERD:399 (N2). That
  walk is the debt `[191]` (5) records.
- The full-suite results for R11 and R18 cannot be attributed to the grant or the trigger, because any
  new migration file fails registration (N3).
