# WP-0A-A0-008: the Author's refresh at main 4dd767d, before the first role verdicts

## 0. Who wrote this, and what it is not

Run: `/claude/a0_atlas` (Author), working as a subagent spawned by the A0 run's workflow for G0 step 4.
This is the Author's own record. It is not a role verdict, it approves nothing, and it does not move the
package past `in_review`. Every assigned run on this package is Anthropic; the cross-vendor condition is
withdrawn for it (§2), and that does not make this file anything more than an Author's record.

Base: `main @ 4dd767d` (the merge of PR #200). Branch: `agent/claude/WP-0A-A0-008-service-path`, the
name the manifest declares, created again from `origin/main` (no branch of that name was on the remote;
its last PR, #109, merged on 2026-09-10).

## 1. Where the package stands

- **The work is on main and disposed.** `RFC-2026-017` was committed with status `Proposed` in `e95957c`
  (2026-09-05; line 3 read `Status: Proposed — awaiting Product Owner disposition`) and approved by the
  Product Owner in `8c16c0d` the same day. Those are the only two commits that touch the RFC. The
  manifest's later increments (`d289ded`..`c1f2647`) corrected stale blockers and kept the status at
  `in_progress`.
- **No role verdict exists at any head.** Before this file there was no `evidence/WP-0A-A0-008/` folder.
  The G0 survey row ("No evidence folder; same as A0-006, plus A1's countersignature of the role
  topology") is accurate.
- **Conditions set by role verdicts: none to close.** No verdict exists, so none has set a condition.
  The role runs owed are FIRST verdicts at the current main, each reviewing the whole package:

| Gate | Run | Owed |
|---|---|---|
| `review_approved` | `/claude/c0_contract_reviewer` | first review |
| `security_approved` (conditional reviewer the manifest requires) | `/claude/a1_bastion` | first security verdict. The A1 countersignature in `evidence/WP-0A-DB-00/` is by a different run (`/claude/a1_identity`) against a different manifest, and is not this verdict (§5) |
| `test_verified` | `/claude/q0_sentinel` | first test verdict, against the six acceptance criteria and two required tests |
| `integration_verified` | `/claude/r0_steward` | first integration verdict |

## 2. The Owner's step 2, applied to this manifest

Source: `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` (merged in PR #186).

| Item | Manifest field | Change |
|---|---|---|
| 1. cross-vendor condition withdrawn for the 15 packages | `independence.prefer_cross_vendor_review`, `independence.cross_vendor_exception` | `true` → `false`; the exception text is replaced by the withdrawal sentence, in the wording the sibling manifests use (WP-0A-A0-007 as merged in PR #200): the quoted item is the record's translation of A0's message, and which 15 is A0's mapping. |
| 2. `/claude/r0_steward` succeeds `/root/r0_steward` for pending acknowledgements | `role_assignments._run_id_disambiguation` | Rewritten. No acknowledgement on this manifest was owed by the Codex run, so none moves (§3). |
| 3. no Product reviewer for tooling and contract packages | `role_assignments.product_reviewer_note` (new) | Added. **This package is a decision-record package, not tooling or contract.** That item 3 reaches it is A0's mapping, on two facts: no UX surface, and no product step in `review_and_test_gates`. Flagged for C0 to accept or refuse. |

## 3. A field that was false since the package was created

`_run_id_disambiguation` said `/root/r0_steward` "is named in open_blockers solely because it must
countersign the amendments made to those two packages". The commits that touched this manifest before
this branch are `e95957c`, `d289ded`, `2c6ccde`, `6f7233f`, `5ab581a` and `c1f2647`
(`git log 4dd767d -- work-packages/WP-0A-A0-008.json`). In each of those six versions, no element of
`open_blockers` contains `/root/r0_steward` (read with `git show <c>:work-packages/WP-0A-A0-008.json`
and a JSON parse counting blockers that contain the string: 0 for each). The sentence was carried from a
template; the same defect was found on WP-0A-A0-005 (C0 F4) and WP-0A-A0-007. It also said
`/claude/r0_steward` "must record its own capability declaration before this package leaves backlog";
that declaration exists at `.agents/capability-profiles/cc-r0-steward.json`. Both are corrected.

Two versions (`e95957c`, `d289ded`) declared `amends_without_owning.recorded_on:
work-packages/WP-0A-A0-002.json`; `c1f2647` removed it with the reason recorded in the rationale. No
`ownership.amended_by` entry in `WP-0A-A0-001.json`, `WP-0A-A0-002.json` or `WP-0A-CON-001.json` names
WP-0A-A0-008 at `4dd767d`, and no other manifest or catalog file mentions it (`grep -rl WP-0A-A0-008
work-packages contract-catalog` returns only this manifest). So no acknowledgement pending against the
Codex run concerns this package.

## 4. Open blockers, re-read clause by clause at 4dd767d

| # | Before | Reading at main | Action |
|---|---|---|---|
| 0 | §7's assertion exists and runs; 65 blocks declare `covers RFC-2026-017§7`, 28 expect `denied` (measured at `5abee8b`) | Re-measured by importing `buildCases` from `tests/db/identity/isolation-cases.mjs` (identity function for ids): 1200 cases; **61** carry `RFC-2026-017§7` in `covers`, of which **20** expect `denied`, 39 `no-rows`, 2 `no-effect`. A static count (`awk '/covers: \[.*RFC-2026-017§7/'`) also gives 61; a plain `grep -c` gives 70 because 9 comment lines say "NOT labelled RFC-2026-017§7". The 20 denials touch 20 distinct `app.` tables (first `into`/`update`/`from` target of each SQL); the migrations create 62 distinct `app.` tables. The file's own comments record why labels were removed: e.g. "NOT labelled `RFC-2026-017§7`, and the label was on it until the static suite refused it". The test "the service denial is attributable to row level security and not to a forgotten grant" is at `identity-isolation.test.mjs:301`; `private.as_service()` still does `set_config('role', 'app_worker', true)` and checks `current_setting('role')`. | counts corrected; still LEFT OPEN for an independent reviewer, with the question restated on the new counts. **Note for C0/Q0:** that the count fell from 28 to 20 is measured, not explained case by case; the comments name one cause. |
| 1 | the production service path is unproven: only postgres is a member of app_worker (RFC-2026-022 §5/8) and app_worker's connection method is undecided (RFC-2026-019 §4/3) | **Stale in its reason.** `RFC-2026-028` (Approved 2026-10-05) decides the worker's identity: `app_worker_login`, one membership `app_worker` with `INHERIT FALSE, SET TRUE, ADMIN FALSE`; `db/foundation/migrations/173_worker_login_identity.sql` is on main. Still open per RFC-2026-028's header: not applied to the provisioned instance (Q-028-13, Q170-c), custody (Q-028-3), pooler (Q-028-12), runner checks (A1R-2, A1-173-1), A1's acceptance as DATA-DEC-03 co-owner. 173's own header: it writes no policy, so app_worker reads and writes no forced-table row through any role until each batch's service policy lands. No test or helper under `tests/` or `db/foundation/test-helpers/` mentions `app_worker_login` (grep: none). | narrowed the same way WP-0A-A0-007's `open_blockers[1]` was in PR #200; the conclusion (production service path unproven, policy layer tested) is unchanged; the debt is re-addressed to RFC-2026-028's open items and RFC-2026-026's worker half |
| 2 | G0 remains Specification Baseline Complete / External Verification Pending | `CONTRIBUTING_AGENTS.md` § Current gate constraint still says so | unchanged, true |
| 3 | (new) | no role verdict at any head | added |

## 5. `required_human_authorities`, re-read

Both entries are kept as written, with a dated current state appended (the form WP-0A-A0-007 uses):

1. **Product Owner disposition of RFC-2026-017**: given, `8c16c0d`, 2026-09-05.
2. **A1 to countersign the role topology**: `evidence/WP-0A-DB-00/a1-countersignature-role-topology.md`
   exists, by `/claude/a1_identity` as DATA-DEC-03's co-owner, 2026-09-06, verdict **"COUNTERSIGNED WITH
   RESERVATIONS"**. Its §2 signs catalog state on the provisioned instance on that date: the three roles
   of RFC-2026-017 §3 exist, none holds `BYPASSRLS`, none is a member of any role, and the set of
   bypassing roles is the five the platform ships. Its §7 discharges **WP-0A-DB-00's** `open_blockers[1]`,
   not this manifest's item, and records five divergences and seven defects as open. Whether that
   discharges this item for WP-0A-A0-008 is not the Author's to judge; it is put to `/claude/a1_bastion`
   and `/claude/c0_contract_reviewer`. The countersigner is also a same-vendor subagent spawned by A0
   (its §0), which RFC-2026-024 now treats as the limit of a role's independence rather than a defect.

## 6. Acceptance criteria, re-read against RFC-2026-017 at 4dd767d

| # | Criterion | Where | Reading |
|---|---|---|---|
| 1 | the RFC states its measurement, names the instance, does not cite vendor documentation in its place | §2: "Against the provisioned instance (`ThinkBizThai`, ap-southeast-2, Postgres 17.6), not from vendor documentation" | met |
| 2 | postgres bypasses RLS as well as service_role | §2 table (`postgres`: `rolbypassrls` yes) and finding 2 ("`postgres` bypasses RLS too … So both of the obvious options bypass") | met |
| 3 | the topology names every role, its purpose, and that none holds BYPASSRLS | §3 table: `app_worker`, `app_command`, `app_maintenance`, each "no" | met as written. **Note for C0:** later approved RFCs added roles §3 does not name: `app_authz` (RFC-2026-020, migration `011`) and `app_worker_login` (RFC-2026-028, migration `173`). 173 pins `rolbypassrls` false for its role. This is history, not a defect of the RFC at the time; editing RFC-2026-017 would make this a governance PR (RFC-2026-025 §5 item 6) and is not done. |
| 4 | the costs are recorded in the RFC | §4 "What this costs, recorded so nobody is surprised later" | met |
| 5 | does not claim isolation proven; names the owed assertion | §7 "It does not yet prove the isolation … it does not exist yet"; status line "Isolation remains unproven until the negative assertion in §7 exists" | met as written. Whether the assertion now exists is `open_blockers[0]`, left to an independent reviewer. |
| 6 | the RFC is committed with status Proposed | `e95957c` line 3 | met at commit time; the status has since moved to Approved (`8c16c0d`), which is history, not a regression |

## 7. Tests at main 4dd767d, on the branch name

Run before any change, on `agent/claude/WP-0A-A0-008-service-path` with HEAD at `origin/main`, Node
`24.20.0` (`/Users/bank/.local/node-v24.20.0/bin` first on `PATH`). The machine was running many other
agents' suites at the same time, so durations are not meaningful.

| Command | Exit | Result |
|---|---|---|
| `npm run check` | 1 | tests 705, pass 703, fail 2. Both failures are the handoff guard on this branch name: "the handoff for this branch describes this branch" (`WP-0A-A0-008's handoff cites head c1f2647, after which 202 substantive path(s) changed`) and the ratchet test that runs that suite on a copy. Expected for a stale handoff; cleared by refreshing it last. Its `validate:protocol` step (work packages, capability profiles, ownership) and `scan:secrets` passed before the tests ran. |

After the manifest change, measured on the edited tree:

| Command | Exit |
|---|---|
| `node scripts/validate-work-packages.mjs` | 0 |
| `node scripts/validate-work-package-ownership.mjs` | 0 |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-008.json` | 0 |
| `node scripts/scan-repository-secrets.mjs` | 0 |

The full `npm run check` result at the branch
head is recorded in the handoff, which `commit-when-clean` refuses to commit unless the run is clean.

## 8. Scope

Changed: `work-packages/WP-0A-A0-008.json`, this file, `handoffs/WP-0A-A0-008-author-handoff.json`. All
three are in `writable_paths`. `RFC-2026-017` is not changed, so this PR changes no RFC,
`CONTRIBUTING_AGENTS.md`, CI or gate, and is not a governance PR under RFC-2026-025 §5 item 6. It is also
not record-only under that section's item 1, because it rewords blockers and applies an Owner
disposition: it needs the role runs in §1.
