# WP-0A-A0-007: the Author's refresh at main b61735f, before the first role verdicts

## 0. Who wrote this, and what it is not

Run: `/claude/a0_atlas` (Author), working as a subagent spawned by the A0 run's workflow for G0 step 4.
This is the Author's own record. It is not a role verdict, it approves nothing, and it does not move the
package past `in_review`. Every assigned run on this package is Anthropic; the cross-vendor condition is
withdrawn for it (§2), and that does not make this file anything more than an Author's record.

Base: `main @ b61735f` (the merge of PR #198). Branch: `agent/claude/WP-0A-A0-007-amend-section-2`, the
name the manifest declares, created again from `origin/main` (no branch of that name was on the remote;
its last PR, #108, merged on 2026-09-10).

## 1. Where the package stands

- **The work is on main and disposed.** `RFC-2026-016` was committed with status `Proposed` in `53d7d2e`
  (2026-09-04; line 3 read `Status: Proposed — awaiting Product Owner disposition and A0
  countersignature`), approved by the Product Owner in `93bbdb6` (2026-09-05), and its §2 amended on
  `RFC-2026-022` in `dd6c7ec` (2026-09-08). The manifest's last two increments (`cff15d1`, `f3e0bce`)
  corrected stale blockers and kept the status at `in_progress`.
- **No role verdict exists at any head.** Before this file there was no `evidence/WP-0A-A0-007/` folder.
  The G0 survey row ("No evidence folder; same as A0-006": move to `in_review` with a handoff, then
  C0/Q0/A1/R0 runs) is accurate.
- **Conditions set by role verdicts: none to close.** No verdict exists, so none has set a condition.
  The four role runs owed are FIRST verdicts at the current main, each reviewing the whole package:

| Gate | Run | Owed |
|---|---|---|
| `review_approved` | `/claude/c0_contract_reviewer` | first review |
| `security_approved` (conditional reviewer the manifest requires) | `/claude/a1_bastion` | first security verdict. The A1 analysis in `RFC-2026-016` §4-§5 was spawned from the A0 session and is not this verdict (`open_blockers[2]`) |
| `test_verified` | `/claude/q0_sentinel` | first test verdict, against the six acceptance criteria and two required tests |
| `integration_verified` | `/claude/r0_steward` | first integration verdict |

## 2. The Owner's step 2, applied to this manifest

Source: `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` (merged in PR #186).

| Item | Manifest field | Change |
|---|---|---|
| 1. cross-vendor condition withdrawn for the 15 packages | `independence.prefer_cross_vendor_review`, `independence.cross_vendor_exception` | `true` → `false`; the exception text is replaced by the withdrawal sentence, in the wording the sibling manifests use after C0's F1 on WP-0A-A0-004 (the quoted item is the record's translation of A0's message; which 15 is A0's mapping). One sentence is added for this package: the A1 analysis is still not a role signature. |
| 2. `/claude/r0_steward` succeeds `/root/r0_steward` for pending acknowledgements | `role_assignments._run_id_disambiguation` | Rewritten. No acknowledgement on this manifest was owed by the Codex run, so none moves (see §3). |
| 3. no Product reviewer for tooling and contract packages | `role_assignments.product_reviewer_note` (new) | Added. **This package is a decision-record package, not tooling or contract.** That item 3 reaches it is A0's mapping, on two facts: no UX surface, and no product step in `review_and_test_gates`. Flagged for C0 to accept or refuse. |

## 3. A field that was false since the package was created

`_run_id_disambiguation` said `/root/r0_steward` "is named in open_blockers solely because it must
countersign the amendments made to those two packages". Every commit that touched this manifest
(`53d7d2e`, `93bbdb6`, `dd6c7ec`, `cff15d1`, `f3e0bce`) mentions `/root/r0_steward` exactly once, in that
field (`git show <c>:work-packages/WP-0A-A0-007.json | grep -o "root/r0_steward" | wc -l` → 1 each).
No blocker ever named it. The sentence was carried from a template; the same defect was found on
WP-0A-A0-005 as C0 F4. It also said `/claude/r0_steward` "must record its own capability declaration
before this package leaves backlog"; that declaration exists at `.agents/capability-profiles/cc-r0-steward.json`
(added `f55b8ff`, 2026-08-31). Both are corrected.

**Correction, 2026-10-06 (C0 F3, A1-007-3, Q0-N1).** The list above is one commit too long: `93bbdb6`
did not touch this manifest (`git show --name-only 93bbdb6` lists only `RFC-2026-016` and
`test-kits/integrity-manifest.json`). The commits that touched `work-packages/WP-0A-A0-007.json` before
this branch are `53d7d2e`, `dd6c7ec`, `cff15d1` and `f3e0bce` (`git log b61735f --
work-packages/WP-0A-A0-007.json`). The conclusion is unchanged: each of those four versions names
`/root/r0_steward` once, in `_run_id_disambiguation`, as C0, A1 and Q0 each measured. The manifest's own
range ("53d7d2e..f3e0bce") was right. The original sentence is left as written above.

## 4. Open blockers, re-read clause by clause at b61735f

| # | Before | Reading at main | Action |
|---|---|---|---|
| 0 | §2 amended 2026-09-08 on RFC-2026-022; original kept below the amendment | `RFC-2026-016` still carries "What this section said before, and why it was wrong" with the original quoted | unchanged, true |
| 1 | the undecided part of the service path is app_worker's CONNECTION METHOD (RFC-2026-019 §4/3); the only member of app_worker is postgres (RFC-2026-022 §5/8) | **Stale.** `RFC-2026-028` (status line: Approved 2026-10-05 by the Owner's delegation of A0's recommendation) decides the worker's identity: `app_worker_login`, one membership `app_worker` with `INHERIT FALSE, SET TRUE, ADMIN FALSE`. `db/foundation/migrations/173_worker_login_identity.sql` is on main. Still open per that status line: not applied to the provisioned instance (Q-028-13, Q170-c), custody (Q-028-3), pooler (Q-028-12), runner checks (A1R-2), A1's acceptance as DATA-DEC-03 co-owner. | narrowed to what is still open; the tail ("no document may state that forced RLS constrains the service path") unchanged and still true: `RFC-2026-019` §7 says the JWT signing secret can still claim `service_role`, which bypasses RLS |
| 2 | A1 analysis spawned from A0; does not satisfy no_self_approval **or prefer_cross_vendor_review** | the second clause lost its ground with item 1 | clause removed, with the reason; the first clause unchanged and true |
| 3 | G0 remains Specification Baseline Complete / External Verification Pending | `evidence/g0-tracker-th.md:3` (2026-10-05, `main @ 600b48b`) still says so | unchanged, true |
| 4 | (new) | no role verdict at any head | added |

The same staleness class as `f3e0bce`: a blocker narrowed against the RFCs of its day went stale when a
later RFC (here `RFC-2026-028`) decided the thing it called open.

## 5. Acceptance criteria, re-read against RFC-2026-016 at b61735f

| # | Criterion | Where | Reading |
|---|---|---|---|
| 1 | contradiction stated; why forced RLS denies every service operation | §1 | met |
| 2 | the fix adds no permission the matrix does not grant, and says so | §2 as amended: "This introduces no new permission **in the CARRIED shape**"; a policy whose whole predicate is the confinement term "is refused"; the DISCOVERED shape adds no service policy at all | met, in the amended wording |
| 3 | platform decision recorded as the PO's, dated, with the reason | §3, 2026-09-04 | met |
| 4 | DATA-DEC-03 closes only as far as the undecided service path allows | §4 "Not closeable yet … this RFC does not claim the control" | met as written. **Note for C0:** §4's "the service path is undecided" and the status line's "the service path remains undecided" describe 2026-09-05; RFC-2026-017/019/028 decided most of it since. Editing RFC-2026-016 would make this a governance PR (RFC-2026-025 §5 item 6) and is not done; the manifest blocker carries the current reading. |
| 5 | provenance says the A1 analysis was spawned from A0 | §7 | met |
| 6 | the RFC is committed with status Proposed | `53d7d2e` line 3 | met at commit time; the status has since moved to Approved (`93bbdb6`), which is history, not a regression |

`required_human_authorities` is left as written. How each stands, for the role runs: (1) the PO disposed
RFC-2026-016 on 2026-09-05; (2) the service-path half of DATA-DEC-03 was proposed by A0 in RFC-2026-017,
-019 and -028 (all approved), and RFC-2026-028 records A1's acceptance as co-owner as owed, so DATA-DEC-03
is not closed; (3) the service path is decided as a direct connection under the three service roles
(RFC-2026-017), with the request path as `authenticated` and command work through SECURITY DEFINER
functions (RFC-2026-019) and the worker through `app_worker_login` (RFC-2026-028), not supabase-js with
the service-role key.

## 6. Tests at main b61735f, on the branch name

Run before any change, on `agent/claude/WP-0A-A0-007-amend-section-2` with HEAD at `origin/main`, Node
`24.20.0`:

| Command | Exit | Result |
|---|---|---|
| `npm run check` | 1 | tests 705, pass 703, fail 2. Both failures are the handoff guard on this branch name: "the handoff for this branch describes this branch" (`WP-0A-A0-007's handoff cites head f3e0bce, after which 203 substantive path(s) changed`) and the ratchet test that runs that suite on a copy. Expected for a stale handoff; cleared by refreshing it last. |
| `node scripts/validate-work-packages.mjs` | 0 | |
| `node scripts/validate-work-package-ownership.mjs` | 0 | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-007.json` | 0 | |

After the manifest change the three validators exit 0 again. The full `npm run check` result at the
branch head is recorded in the handoff, which `commit-when-clean` refuses to commit unless it is clean.

## 7. Scope

Changed: `work-packages/WP-0A-A0-007.json`, this file, `handoffs/WP-0A-A0-007-author-handoff.json`. All
three are in `writable_paths`. `RFC-2026-016` is not changed, so this PR changes no RFC,
`CONTRIBUTING_AGENTS.md`, CI or gate, and is not a governance PR under RFC-2026-025 §5 item 6. It is also
not record-only under that section's item 1, because it rewords blockers and applies an Owner
disposition: it needs the four role runs above.
