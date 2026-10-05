# Product Owner disposition, 2026-10-05, in session: G0 step 2 confirmed

Transcribed by `/claude/a0_atlas` (A0 Integration). The Owner's words are verbatim. This file is not a
role signature, it does not pass Gate G0, and it does not move any package's status. It is filed under
`WP-0A-A0-001` because that package owns `evidence/g0-tracker-th.md` and the G0 records
(`work-packages/WP-0A-A0-001.json` `writable_paths`); the Decision Register itself is `docs/**`, which is
read-only to every package, so §5 lists what the register's owner still has to write.

## 1. What the Owner had in front of him

A0's chat message of 2026-10-05 listed "step 2" of the G0 plan as fifteen decisions, each with A0's
recommendation, and asked the Owner to confirm them in one reply. The plan's source is A0's read-only G0
survey of `main @ 600b48b` (§3 step 2 of that survey). The list, as A0 sent it (translated from Thai):

| # | Decision put to the Owner | A0's recommendation |
|---|---|---|
| 1 | Extend RFC-2026-024's withdrawn cross-vendor condition to the 15 Sprint-0A packages (WP-0A-A0-002..009, WP-0A-CON-002..008) | yes |
| 2 | Name `/claude/r0_steward` as successor to `/root/r0_steward` for the pending acknowledgements | yes |
| 3 | A Product reviewer is not applicable to tooling and contract packages | yes |
| 4 | Beta payment | manual invoice (the register's DEC-020); Stripe after G0 |
| 5 | OPEN-004 | one OpenAI text model with a monthly cost ceiling |
| 6 | OPEN-006 | jpeg/png/webp with a conservative size cap |
| 7 | OPEN-007 | video/Reel to P1 behind a feature flag (off) |
| 8 | OPEN-009 | Instagram Professional accounts only |
| 9 | OPEN-014 | async support in Thai business hours |
| 10 | OPEN-017 | WCAG 2.2 AA |
| 11 | OPEN-002 | Singapore region with a minimum-retention draft |
| 12 | OPEN-003 | RPO 24h / RTO 8h as a planning target |
| 13 | OPEN-016 | approve the A6 KPI formulas, no targets yet |
| 14 | OPEN-001 | draft pricing, no automatic charging |
| 15 | OPEN-011 / OPEN-012 | synthetic data only until consent exists |

## 2. The Owner's words (verbatim)

> บืนยันขั้น 2

`บืนยัน` is a typo for `ยืนยัน` ("confirm"); the reply reads "confirm step 2". A0 reads it as confirming
all fifteen items **as A0 recommended them**, because the message asked for exactly that in one reply and
the Owner named no exception. The record does not show the Owner reading anything beyond A0's message;
A0 says so here rather than letting the confirmation read as a review of the register text.

## 3. What each item decides, and what it closes

Register citations are to `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md` at
`600b48b` (§2.1 Approved Decisions lines 61-85; §3 Unresolved Decision Register lines 110-129; §7.1 G0
table lines 335-358; §7.2 pass rule lines 360-373).

| # | Decided | Closes | Does not close |
|---|---|---|---|
| 1 | RFC-2026-024 §3/1 applies to the 15 named packages: `prefer_cross_vendor_review` becomes `false` there, and each `cross_vendor_exception` is replaced by a sentence recording the withdrawal (RFC-2026-024 §3/2). Independence stays as RFC-2026-024 §3/3 restates it: four distinct runs, no self-approval, the §0 spawning disclosure. | The Owner act RFC-2026-024 §3/1 reserved ("in every other manifest the Owner names"). The recorded blocker `prefer_cross_vendor_review is not satisfied; see independence.cross_vendor_exception` in those packages (for example `WP-0A-CON-002.json` open_blockers[8], `WP-0A-CON-003.json` [8], `WP-0A-CON-006.json` [8], `WP-0A-A0-002.json` [6]) loses its ground. | **Not applied in this PR.** The 15 manifests' `independence` fields and those blocker lines are each package's own manifest fields; RFC-2026-025 §5 item 1 makes them non-record-only. Owed: one change per package, or one authorised amendment, citing this file. The register clause (§9.3.1, line 527) is the register owner's to amend. G0's "external verification" is unchanged (RFC-2026-024 §3/5). |
| 2 | `/claude/r0_steward` acts for `/root/r0_steward` (an OpenAI Codex run no longer available) wherever an acknowledgement is recorded `pending` against `/root/r0_steward`: `WP-0A-A0-001.json` `ownership.amended_by[0..3]`; `contract-catalog/shared-kernel/ctr-job-001/schema.json:110,117` and the other CON-001 catalog schemas recording it; `WP-0A-A0-002.json` open_blockers[3] and [4]; `WP-0A-CON-002.json` open_blockers[1]. | Who may give those acknowledgements. | **The acknowledgements themselves.** Naming a successor is not the successor acting: every `acknowledgement_status` stays `pending` until `/claude/r0_steward` reviews each amendment and records it. A0 cannot give them (it authored the amendments). |
| 3 | A Product (UX) reviewer is not applicable to tooling and contract packages. `product_reviewer_agent_run_id: null` on such a package is not a gap. | The tracker's explanation that the null Product slot holds packages at `in_review` (`evidence/g0-tracker-th.md` rows 28 and lines 82-85 before this change). That explanation was already wrong in mechanism: `scripts/validate-work-package-role-separation.mjs:16-21,40-44` checks only the four core role ids, the 15 packages' `review_and_test_gates` carry no product step (for example `WP-0A-A0-002.json:242-248`), and `WP-0A-A6-001` reached `integration_verified` with that slot null. | What does hold the 15 packages: missing or negative role verdicts at the current head (survey §2). A package with a UX surface (the G0-004/005 wireframe and usability work) still needs a Product/UX reviewer. `WP-0A-A0-001`'s own gates list `product_approved` and its slot is `/root/a5_loom`; this decision does not edit that record. |
| 4 | **Beta payment is manual invoice and reconciliation, as register DEC-020 states (line 80). Stripe follows G0.** | The conflict between register DEC-020 and the master plan's DEC-07 (`docs/plans/ai-content-os-execution-master-plan-th.md:366`, "Stripe Subscription เป็นช่องทางหลัก") and the readiness report (`docs/sprint-0a/sprint-0a-g0-readiness-report-th.md:37`). **Resolved in the register's favour**, which is also the repository's conflict order (`CONTRIBUTING_AGENTS.md:10-17`: the register ranks above the master plan). The tracker's Stripe row becomes an Owner-decided deferral (§4 below). | The master plan and readiness report still say Stripe-primary; their owners must update them (§5). **One rule now needs the Owner or the security owner:** `CONTRIBUTING_AGENTS.md:45` says payment entitlement derives only from a verified Stripe webhook projection. Under manual invoicing there is no webhook, so the Beta entitlement source (for example an operator-recorded reconciliation entry) is undefined. A0 does not decide it; it is recorded as an open question in the tracker. |
| 5 | OPEN-004: BYOK allows one OpenAI text model, with a monthly cost ceiling. | OPEN-004 (due G0, line 113) as policy. Consistent with DEC-014. | The model id and the ceiling's amount are not chosen. A3's allowlist proposal (G0-015) must name them; the stop condition (no free-form model id) stands. |
| 6 | OPEN-006: P0 upload accepts image/jpeg, image/png and image/webp, with a conservative size cap. | OPEN-006 (due G0, line 115) as policy. | The cap's number. It comes from the G0-016/017 media matrix, which needs the Meta test assets. |
| 7 | OPEN-007: video/Reel moves to P1, behind a feature flag that is off. | OPEN-007 (due G0, line 116). Consistent with DEC-016 and NG-008. | Nothing about the flag's implementation; no UI may promise video before the capability matrix passes (stop condition). |
| 8 | OPEN-009: Instagram Professional accounts only. | OPEN-009 (due G0, line 118). Consistent with DEC-004. | The publishing-limitation half is still measured by G0-016. |
| 9 | OPEN-014: async support in Thai business hours. | OPEN-014's G0 draft (line 123). | Its final form is due G6. No 24/7 claim (stop condition). |
| 10 | OPEN-017: WCAG 2.2 AA is the P0 accessibility threshold. | OPEN-017 (due G0, line 126). | Conformance itself is G0-004/005 work. |
| 11 | OPEN-002: Singapore region, with a minimum-retention policy draft. | OPEN-002's G0 policy draft (line 111). | Legal basis, DPA and the final retention policy, due before G6 with a Privacy reviewer. No production customer data until then (stop condition). |
| 12 | OPEN-003: RPO 24h / RTO 8h as a planning target. | OPEN-003's G0 target (line 112). | The restore drill, due before G6. No SLA claim until it passes. |
| 13 | OPEN-016: the A6 KPI formulas are approved; no targets are set yet. | OPEN-016 (due G0, line 125) and the Product Owner review `WP-0A-A6-001.json:44,184` waits on, for formulas, sources and owners. | **Metric C-01 states two formulas** (`WP-0A-A6-001.json:191`, recorded by `/claude/r0_steward`). The Owner approved "the formulas" without choosing between them; A6 must state one and the Owner's approval applies to that one. Targets remain unset by decision. |
| 14 | OPEN-001: draft pricing, no automatic charging. | OPEN-001's "pricing draft before G0" half (line 110), as an approach. | The pricing draft itself is not in the repository yet. VAT, refund and grace stay with the accountant, before G6. No real money taken against unchecked price/tax text (stop condition). |
| 15 | OPEN-011 / OPEN-012: synthetic data only until consent exists. | The interim rule for both (lines 120-121); it matches the safe defaults and `CONTRIBUTING_AGENTS.md:43`. | **G0-002 is not closed.** The 5-workspace pilot with signed consent (OPEN-011) and the Golden Set licence and reviewer agreement (OPEN-012) are still owed. Synthetic-only is the fallback while they are. |

**Still open after this disposition:** OPEN-008 (Meta permissions and App Review path; G0 "risk accepted"
was not in the list), OPEN-013 (due before Pack 2), OPEN-005/010/019/020 (G1-G4), OPEN-015 and OPEN-018 (dispositioned
by their RFCs, register text not updated).

## 4. Tracker effect

`evidence/g0-tracker-th.md` is updated in the same PR: a dated section records these decisions, the
Product-reviewer explanation is replaced by "role verdicts missing", the protected-CI contradiction is
removed against a live read of branch protection, and a G0-001..024 status table is added.

## 5. What other owners still have to write

`docs/**` is read-only to `WP-0A-A0-001` (`read_only_paths`). `CONTRIBUTING_AGENTS.md` and
`architecture/decisions/RFC-2026-002-manual-merge-control.md` are in this package's `writable_paths`, but
they are governance: RFC-2026-025 §5 item 6 says a PR changing them is merged by the Owner personally, and
`CONTRIBUTING_AGENTS.md:34-36` sends a gate-rule change through an RFC. None of them is edited here.

| File | Needs | Owner |
|---|---|---|
| `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md` §3 | Disposition notes on OPEN-001, 002, 003, 004, 006, 007, 009, 011, 012, 014, 016, 017 citing this file; §9.3.1 cross-vendor clause (line 527) amended per item 1; §7.1 status column (dated 2026-08-30) refreshed | Register owner (A0/Product), by RFC or Owner-approved edit |
| `docs/plans/ai-content-os-execution-master-plan-th.md:366` (DEC-07) | Stripe-primary replaced by "manual invoice in Beta (register DEC-020); Stripe after G0" | Master plan owner |
| `docs/sprint-0a/sprint-0a-g0-readiness-report-th.md:37,180` | Billing row as above; "DEC-01..16" uses the master plan's numbering, the register's is DEC-001..025 | Readiness report owner |
| `CONTRIBUTING_AGENTS.md:45` | The Beta (manual invoice) entitlement source, beside the Stripe-webhook rule | Owner + security owner, by RFC |
| `CONTRIBUTING_AGENTS.md:61-79` | "While native GitHub branch protection is unavailable" is stale: protection on `main` is live (§6) | Owner, by RFC (governance; Owner merges) |
| `architecture/decisions/RFC-2026-002-manual-merge-control.md:3` | Status line "native protection/G0 not satisfied" is stale on protection | Owner (governance) |
| `OVERNIGHT-SUMMARY.md` | Marked stale since 2026-09-13; still describes protected CI as unavailable | No package owns it |

## 6. Live measurement taken for this record

Read-only, 2026-10-05: `gh api repos/ThinkBizLab-Org/ThinkBizThai/branches/main/protection` returned
`required_status_checks.strict: true`, `contexts: ["bootstrap"]`, `enforce_admins.enabled: true`,
`allow_force_pushes.enabled: false`, `allow_deletions.enabled: false`,
`required_conversation_resolution.enabled: true`, and no `required_pull_request_reviews` key.
`gh api repos/ThinkBizLab-Org/ThinkBizThai` returned `visibility: public`. Nothing was changed.

## 7. What this file is not

- Not a merge delegation. No PR is named.
- Not record-only under RFC-2026-025 §5: item 1 excludes Owner dispositions and blocker rewording, and
  item 5's mechanical record-only check does not exist in `scripts/` yet, so no PR is treated as
  record-only. The PR carrying this file needs the role runs its package gates require.
- Not G0. G0-024's signed checklist is a separate act by the Product Owner and A0.
