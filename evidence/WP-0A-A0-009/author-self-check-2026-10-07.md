# WP-0A-A0-009: the Author's refresh at main 4dd767d, before the first role verdicts

## 0. Who wrote this, and what it is not

Run: `/claude/a0_atlas` (Author), working as a subagent spawned by the A0 run's workflow for G0 step 4.
This is the Author's own record. It is not a role verdict, it approves nothing, and it does not move the
package past `in_review`. Every assigned run on this package is Anthropic; the cross-vendor condition is
withdrawn for it (§2), and that does not make this file anything more than an Author's record.

Base: `main @ 4dd767d` (the merge of PR #200). Branch: `agent/claude/WP-0A-A0-009-service-path-corrected`,
the name the manifest declares, created again from `origin/main` (no branch of that name was on the
remote; its last PR, #110, merged on 2026-09-10).

## 1. Where the package stands

- **The work is on main and disposed.** `RFC-2026-018` and `RFC-2026-019` were both disposed by the
  Product Owner on 2026-09-06: RFC-2026-019 Approved, RFC-2026-018 Superseded by it and never in effect
  (status lines of both files). The manifest's last increments (`69ed807e`..`066a469a`, PR #110) removed
  spent blockers and deliberately kept the status at `in_progress`.
- **No role verdict exists at any head.** Before this file there was no `evidence/WP-0A-A0-009/` folder.
  The G0 survey row ("No evidence folder; same as A0-006 … A1 has taken measurements but has not
  reviewed") is accurate.
- **Conditions set by role verdicts: none to close.** No verdict exists, so none has set a condition.
  The four role runs owed are FIRST verdicts at the current main, each reviewing the whole package:

| Gate | Run | Owed |
|---|---|---|
| `review_approved` | `/claude/c0_contract_reviewer` | first review |
| `security_approved` (conditional reviewer the manifest requires) | `/claude/a1_bastion` | first security verdict, with RFC-2026-019 as its subject; this is what closes `open_blockers[0]` |
| `test_verified` | `/claude/q0_sentinel` | first test verdict, against the twelve acceptance criteria and `npm run check` |
| `integration_verified` | `/claude/r0_steward` | first integration verdict |

## 2. The Owner's step 2, applied to this manifest

Source: `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` (merged in PR #186).

| Item | Manifest field | Change |
|---|---|---|
| 1. cross-vendor condition withdrawn for the 15 packages | `independence.prefer_cross_vendor_review`, `independence.cross_vendor_exception` | `true` → `false`; the exception text is replaced by the withdrawal sentence, in the wording the sibling manifests use (WP-0A-A0-007 on main): the quoted item is the record's translation of A0's message, and which 15 is A0's mapping. One sentence is added for this package: A1's measurement of RFC-2026-019 §4/1 is not a role signature. |
| 2. `/claude/r0_steward` succeeds `/root/r0_steward` for pending acknowledgements | `role_assignments._run_id_disambiguation` | Rewritten. No acknowledgement on this manifest was owed by the Codex run, so none moves (§3). |
| 3. no Product reviewer for tooling and contract packages | `role_assignments.product_reviewer_note` (new) | Added. **This package is a decision-record package, not tooling or contract.** That item 3 reaches it is A0's mapping, on two facts: no UX surface, and no product step in `review_and_test_gates`. Flagged for C0 to accept or refuse. |

## 3. A field that was false since the package was created

`_run_id_disambiguation` said `/root/r0_steward` "is named in open_blockers solely because it must
countersign the amendments made to those two packages". Every commit that touched this manifest
(`8701555f`, `00a47722`, `433a4af7`, `69ed807e`, `d312e3d2`, `2bb247dc`, `066a469a`) mentions
`/root/r0_steward` exactly once, in that field (`git show <c>:work-packages/WP-0A-A0-009.json | grep -o
"root/r0_steward" | wc -l` → 1 each). No blocker ever named it. It is the template sentence found on
WP-0A-A0-005 (C0 F4) and WP-0A-A0-007. It also said `/claude/r0_steward` "must record its own capability
declaration before this package leaves backlog"; that declaration exists at
`.agents/capability-profiles/cc-r0-steward.json`. Both are corrected.

## 4. Open blockers, re-read clause by clause at 4dd767d

| # | Before | Reading at main | Action |
|---|---|---|---|
| 0 | A1 measured RFC-2026-019 §4/1 (`a1-rfc-022-measurements-2026-09-08.md:338`) and has not reviewed the RFC | `grep -rl RFC-2026-019 evidence` returns 13 files. The A1-authored ones are `WP-0A-DB-00/a1-rfc-022-measurements-2026-09-08.md`, `WP-0A-DB-00/a1-security-batch-080-2026-09-13.md`, `WP-0A-A0-007/a1-security-reverify-2026-10-05.md` and `WP-0A-A0-007/a1-recheck-2026-10-07.md`; each cites RFC-2026-019 as a reference for another subject. `a1-countersignature-role-topology.md` does not mention it. | still true; a sentence added naming what closes it (A1's first verdict on this package) |
| 1 | three of §5's four rules written, cited at `run.mjs` 976-986, 629-635, 1003-1013 (acf0571); the fourth unwritable because no command function exists | **Stale twice.** (a) The citations drifted by ~3000 lines. At 4dd767d: rule 1 at `scripts/db/run.mjs:4061-4071` (`SERVICE_ROLES_NOT_FOR_THE_REQUEST_PATH`, now also naming `app_worker_login`); rule 2 at `3632-3637` inside `tenantTableLint` (starts 3602); rule 3 at `4091-4102`, and the definer set is now exact: `SECURITY_DEFINER_FUNCTIONS` at `977-991` pins owner and body, and the drift probe's claim at `2349` is "exactly the pinned ones". (b) Command functions exist: migration `172_acting_user_and_closing_command.sql` (`76a26e00`, batch 141, 2026-10-05) creates `app.close_workspace` and `app.cancel_workspace_closing` and sets their owner to `app_command` at lines 427-428; `run.mjs:983-984` pins that owner; `tests/db/identity/isolation-cases.mjs` calls `app.close_workspace` as `authenticated` and asserts the refusals (`owner-a-cannot-close-workspace-a-without-step-up` :20072, `editor-a-cannot-close-workspace-a-even-after-step-up` :20084, `owner-b-cannot-close-workspace-a-and-leaves-no-row-in-it` :20095), and `app-command-cannot-execute-its-own-closing-command` shows the role cannot call it by SET ROLE. | rewritten: all four rules written, each cited by line and assertion; what stays owed is RFC text (§5) |
| 2 | G0 remains Specification Baseline Complete / External Verification Pending | `evidence/g0-tracker-th.md` still says so | unchanged, true |
| 3 | (new) | no role verdict at any head | added |

The isolation cases of rule 4 run under `make db-rls-smoke` (`.github/workflows/ci.yml:159`), not under
`npm run check`, and this machine has no database for them. The last main CI run that executed them,
run `37493702216` at `411dfa7` (PR #205), logs `db-rls-smoke: 1200 isolation case(s) passed.`; `4dd767d`
merges PR #200, which changed only `evidence/**`, a manifest and a handoff. Q0 should read the run at
this PR's head rather than this sentence.

## 5. What is owed outside this package's change, with its owner

| Owed | Why not here | Owner |
|---|---|---|
| `RFC-2026-019`'s status line and §4/5 say `RFC-2026-017` §3's present tense "stays wrong until the components exist"; they exist since `172`. §4/3 says `app_worker`'s connection method is undecided; `RFC-2026-028` (Approved 2026-10-05) decided it. A dated line recording both. | `RFC-2026-019` is in this package's `writable_paths`, but editing an RFC makes the PR a governance PR the Owner merges personally (RFC-2026-025 §5 item 6); this step-4 PR is kept non-governance. | A0 under WP-0A-A0-009, on a separate governance PR |
| `RFC-2026-017` §3's correction, which RFC-2026-019 §4/5 says is made "by its own owner, not here" | `RFC-2026-017` is WP-0A-A0-008's output, outside this package's paths | A0 under WP-0A-A0-008, on a governance PR |
| `required_human_authorities[1]` ("A1 to countersign the role topology before the roles are created") | already met: `evidence/WP-0A-DB-00/a1-countersignature-role-topology.md` countersigns RFC-2026-016/-017's topology. Left as written, as on WP-0A-A0-007; a role run may ask for it to be marked met. | — |

None of these is a condition a role verdict has set.

## 6. Acceptance criteria, re-read at 4dd767d

Criteria 1-7 are about `RFC-2026-018`, 8-12 about `RFC-2026-019`. Neither file changed since its
disposition commits; each criterion was met when written and is history now, not a regression.

| # | Reading |
|---|---|
| 1 | RFC-2026-018 §2 states the measurement, instance and date; met |
| 2 | records authenticator's lack of membership in any service role; met (and asserted by rule 1 today) |
| 3 | every candidate with its cost, including the refused one; met |
| 4 | option A's security question answered directly; met |
| 5 | closing conditions named as checkable artefacts; met. Note: RFC-2026-018 never closed; it was superseded |
| 6 | names what it does not decide; met |
| 7 | changed no migration, lint or role; met at its commit (`8701555f`) |
| 8 | RFC-2026-019 §1 says what 018 got wrong and which comparison decides; met |
| 9 | root error generalised: a missing component read as a missing grant; met |
| 10 | every clause assertable, with the rules named; met, and now all four rules are written (§4 row 1) |
| 11 | records how the error was caught (§8); met |
| 12 | changed no role, grant or migration; met at its commit (`433a4af7`) |

## 7. Tests at main 4dd767d, on the branch name

Recorded in the handoff (`handoffs/WP-0A-A0-009-author-handoff.json` `tests`), which is refreshed last.

## 8. Scope

Changed: `work-packages/WP-0A-A0-009.json`, this file, `handoffs/WP-0A-A0-009-author-handoff.json`. All
three are in `writable_paths`. Neither RFC is changed, so this PR changes no RFC,
`CONTRIBUTING_AGENTS.md`, CI or gate, and is not a governance PR under RFC-2026-025 §5 item 6. It is
not record-only either, because it rewords blockers and applies an Owner disposition: it needs the four
role runs above.
