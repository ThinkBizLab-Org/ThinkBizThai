# Product Owner disposition, 2026-10-05, in session: G0 step 2 confirmed

Transcribed by `/claude/a0_atlas` (A0 Integration). The Owner's words are verbatim, and so is the message
of A0's that he answered (§1.1). This file is not a role signature, it does not pass Gate G0, and it does
not move any package's status. It is filed under `WP-0A-A0-001` because that package owns
`evidence/g0-tracker-th.md` and the G0 records (`work-packages/WP-0A-A0-001.json` `writable_paths`); the
Decision Register itself is `docs/**`, which is read-only to every package, so §5 lists what the
register's owner still has to write.

## 1. What the Owner had in front of him

A0's chat message of 2026-10-05 (`14:57:18Z`, session `27edf3de`) put "step 2" of the G0 plan to the
Owner as **fourteen** bulleted items under five headings and asked him to confirm them in one reply. The
message named no OPEN-* or DEC-* id. Its source was §3 step 2 of A0's read-only G0 survey of
`main @ 600b48b`, but the message, not the survey, is what the Owner answered.

**Correction, caught by C0 F1.** A0's earlier draft of this file presented a fifteen-row table as "the
list, as A0 sent it". It was not. A0's own prompt to the author run that wrote the draft overstated the
list: the table was the survey's step 2, reordered, with OPEN-ids added. It carried an OPEN-001 "draft
pricing" item that was never sent, and words the message did not contain ("behind a feature flag (off)",
"with a minimum-retention draft", "Thai" business hours). C0's review
(`evidence/WP-0A-A0-001/c0-g0-records-review-2026-10-05.md` F1) caught it. This section now quotes the
message as sent, and §3 maps each item only as far as its words go.

### 1.1 The message as sent (verbatim, Thai)

> ## ขั้นที่ 2: ขอคุณยืนยันครั้งเดียว
> ข้อเหล่านี้เป็นการตัดสินใจทางธุรกิจ ผมจึงขอให้คุณยืนยันเองแม้จะมอบอำนาจไว้แล้ว ทุกข้อคือค่า default ที่ปลอดภัยซึ่ง register เขียนไว้อยู่แล้ว:
> - **ขั้นตอน:**
>   - ใช้ข้อยกเว้นเรื่อง cross-vendor ของ RFC-024 กับ work package ทั้ง 15 ตัว
>   - ตั้ง `/claude/r0_steward` เป็นผู้รับรองแทน run เดิมที่เป็นของ Codex ซึ่งไม่มีให้ใช้แล้ว
>   - work package ประเภท tooling และ contract ไม่ต้องมี Product reviewer
> - **การชำระเงินช่วง Beta:** ออก invoice เอง ไม่ตัดเงินอัตโนมัติ และไปใช้ Stripe หลังผ่าน G0
> - **AI:** ใช้ OpenAI text model ตัวเดียว พร้อมเพดานค่าใช้จ่ายต่อเดือน
> - **สื่อ:**
>   - รูปภาพรองรับ jpeg/png/webp และจำกัดขนาดแบบระมัดระวัง
>   - เลื่อนวิดีโอและ Reel ไปเป็น P1
>   - รองรับเฉพาะ Instagram บัญชี Professional
> - **การดำเนินงาน:**
>   - support แบบไม่ realtime ในเวลาทำการ
>   - มาตรฐาน accessibility WCAG 2.2 AA
>   - เก็บข้อมูลใน region สิงคโปร์
>   - RPO 24 ชม. และ RTO 8 ชม. เป็นเป้าหมายระหว่างวางแผน
>   - อนุมัติสูตร KPI ไปก่อนโดยยังไม่ตั้งเป้า
>   - ใช้ข้อมูลสังเคราะห์จนกว่าจะได้ consent จากผู้ใช้จริง
>
> ถ้าตอบ "ยืนยันขั้น 2" ได้ ผมจะจดลงบันทึกแล้วเดินต่อ

### 1.2 Translation (faithful, English)

The bullets were not numbered. The numbers 1-14 below are added by this record, in the message's order,
so that §3 and the tracker can cite an item.

> **Step 2: asking you to confirm once**
>
> These are business decisions, so I am asking you to confirm them yourself even though authority has
> been delegated. Every item is a safe default that the register already writes down:
>
> - **Process:**
>   1. Apply RFC-024's cross-vendor exception to all 15 work packages.
>   2. Make `/claude/r0_steward` the acknowledger in place of the earlier run, which was Codex's and is
>      no longer available.
>   3. Tooling and contract work packages do not need a Product reviewer.
> - **Payment during Beta:** 4. Issue invoices manually, no automatic charging, and move to Stripe after
>   passing G0.
> - **AI:** 5. Use a single OpenAI text model, with a monthly spending ceiling.
> - **Media:**
>   6. Images support jpeg/png/webp, with a conservative size limit.
>   7. Defer video and Reel to P1.
>   8. Support Instagram Professional accounts only.
> - **Operations:**
>   9. Support that is not realtime, during business hours.
>   10. Accessibility standard WCAG 2.2 AA.
>   11. Store data in the Singapore region.
>   12. RPO 24 hours and RTO 8 hours as targets during planning.
>   13. Approve the KPI formulas for now, without setting targets yet.
>   14. Use synthetic data until consent is obtained from real users.
>
> If you can reply "confirm step 2", I will record it and move on.

## 2. The Owner's words (verbatim)

> บืนยันขั้น 2

`บืนยัน` is a typo for `ยืนยัน` ("confirm"); the reply reads "confirm step 2". A0 reads it as confirming
all fourteen items **as the message words them**, because the message asked for exactly that in one reply
and the Owner named no exception. The message's sentence that every item is a register safe default does
not widen what was confirmed: where the register's safe default or due item says more than the bullet,
the extra words were not put to the Owner and are not recorded here as his decision. The record does not
show the Owner reading anything beyond A0's message.

## 3. What each item decides, and what it closes

Register citations are to `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md` at
`600b48b` (§2.1 Approved Decisions lines 61-85; §3 Unresolved Decision Register lines 110-129; §7.1 G0
table lines 335-358; §7.2 pass rule lines 360-373). **The "Closes" column is A0's mapping**: the Owner was
shown no OPEN-* or DEC-* id, and each item closes a register entry only as far as the item's words go.

| # | Item as sent (§1.2) | Closes (A0's mapping, only as far as the words go) | Not decided by the Owner's words / does not close |
|---|---|---|---|
| 1 | Apply RFC-024's cross-vendor exception to all 15 work packages. | The Owner act RFC-2026-024 §3/1 reserved ("in every other manifest the Owner names"). Which 15 packages is A0's mapping, from the survey: WP-0A-A0-002..009 and WP-0A-CON-002..008. There `prefer_cross_vendor_review` becomes `false`, and each `cross_vendor_exception` is replaced by a sentence recording the withdrawal (RFC-2026-024 §3/2). Independence stays as RFC-2026-024 §3/3 restates it: four distinct runs, no self-approval, the §0 spawning disclosure. The recorded blocker `prefer_cross_vendor_review is not satisfied; see independence.cross_vendor_exception` in those packages (for example `WP-0A-CON-002.json` open_blockers[8], `WP-0A-CON-003.json` [8], `WP-0A-CON-006.json` [8], `WP-0A-A0-002.json` [6]) loses its ground. | **Not applied in this PR.** The 15 manifests' `independence` fields and those blocker lines are each package's own manifest fields; RFC-2026-025 §5 item 1 makes them non-record-only. Owed: one change per package, or one authorised amendment, citing this file. The register clause (§9.3.1, line 527) is the register owner's to amend. G0's "external verification" is unchanged (RFC-2026-024 §3/5). |
| 2 | `/claude/r0_steward` acknowledges in place of the earlier Codex run. | Who may give the acknowledgements recorded `pending` against `/root/r0_steward` (the earlier Codex run, by A0's mapping): `WP-0A-A0-001.json` `ownership.amended_by[0..3]`; `contract-catalog/shared-kernel/ctr-job-001/schema.json:110,117` and the other CON-001 catalog schemas recording it; `WP-0A-A0-002.json` open_blockers[3] and [4]; `WP-0A-CON-002.json` open_blockers[1]. | **The acknowledgements themselves.** Naming a successor is not the successor acting: every `acknowledgement_status` stays `pending` until `/claude/r0_steward` reviews each amendment and records it. A0 cannot give them (it authored the amendments). |
| 3 | Tooling and contract work packages need no Product reviewer. | `product_reviewer_agent_run_id: null` on such a package is not a gap. This corrects the tracker's explanation that the null Product slot holds packages at `in_review` (`evidence/g0-tracker-th.md` row 28 and lines 82-85 before this change). That explanation was already wrong in mechanism: `scripts/validate-work-package-role-separation.mjs:16-21,40-44` checks only the four core role ids, the 15 packages' `review_and_test_gates` carry no product step (for example `WP-0A-A0-002.json:242-248`), and `WP-0A-A6-001` reached `integration_verified` with that slot null. | What does hold the 15 packages: missing or negative role verdicts at the current head (survey §2). A package with a UX surface (the G0-004/005 wireframe and usability work) still needs a Product/UX reviewer. `WP-0A-A0-001`'s own gates list `product_approved` and its slot is `/root/a5_loom`; this decision does not edit that record. |
| 4 | Beta payment: manual invoices, no automatic charging, Stripe after G0. | Register DEC-020 (line 80, "Manual invoice + reconciliation") is confirmed over the master plan's DEC-07 (`docs/plans/ai-content-os-execution-master-plan-th.md:366`, "Stripe Subscription เป็นช่องทางหลัก") and the readiness report (`docs/sprint-0a/sprint-0a-g0-readiness-report-th.md:37`). This is also the repository's conflict order (`CONTRIBUTING_AGENTS.md:10-17`: the register ranks above the master plan). The tracker's Stripe row becomes an Owner-decided deferral (§4 below). OPEN-001's interim safe default ("Manual invoice, no auto-charge", line 110) becomes the Owner's Beta approach. | **OPEN-001's pricing was never proposed.** The Beta price, its "pricing draft before G0" due item, VAT, refund and grace period are not decided by these words. OPEN-001 stays open, including its G0 due item. The master plan and readiness report still say Stripe-primary; their owners must update them (§5). **One rule now needs the Owner or the security owner:** `CONTRIBUTING_AGENTS.md:45` says payment entitlement derives only from a verified Stripe webhook projection. Under manual invoicing there is no webhook, so the Beta entitlement source (for example an operator-recorded reconciliation entry) is undefined. A0 does not decide it; it is recorded as an open question in the tracker. |
| 5 | One OpenAI text model, with a monthly spending ceiling. | OPEN-004 (due G0, line 113) as policy. Consistent with DEC-014. | The model id and the ceiling's amount are not chosen. A3's allowlist proposal (G0-015) must name them; the stop condition (no free-form model id) stands. |
| 6 | Images: jpeg/png/webp, with a conservative size limit. | OPEN-006 (due G0, line 115) as policy for images. | The limit's number. It comes from the G0-016/017 media matrix, which needs the Meta test assets. OPEN-006's duration limit is not stated; with item 7 it does not arise in P0. |
| 7 | Defer video and Reel to P1. | OPEN-007's question (P0 or P1, due G0, line 116): P1. Consistent with DEC-016 and NG-008. | **No feature flag was decided.** The register's safe default ("Feature flag off") is not part of the item; whether video sits behind a flag, and its state, is not the Owner's decision here. The stop condition stands: no UI may promise video before the capability matrix passes. |
| 8 | Instagram Professional accounts only. | OPEN-009's account-type half (due G0, line 118). Consistent with DEC-004. | The publishing-limitation half is still measured by G0-016. |
| 9 | Support that is not realtime, during business hours. | OPEN-014's support-hours element for its G0 draft (line 123). | "Thai" business hours, the response target and the emergency boundary are not stated. Its final form is due G6. No 24/7 claim (stop condition). |
| 10 | WCAG 2.2 AA. | OPEN-017 (due G0, line 126). | Conformance itself is G0-004/005 work. |
| 11 | Store data in the Singapore region. | OPEN-002's region element (line 111). | **OPEN-002's retention was not proposed.** Retention per data class (the register's "minimum retention" default), legal basis and DPA are not decided by these words, so OPEN-002's G0 policy draft is not closed; only its region is. Final policy is due before G6 with a Privacy reviewer. No production customer data until then (stop condition). |
| 12 | RPO 24h and RTO 8h as planning targets. | OPEN-003's G0 target (line 112). | The backup provider and the restore drill, due before G6. No SLA claim until it passes. |
| 13 | Approve the KPI formulas for now, without targets. | OPEN-016 (due G0, line 125) and the Product Owner review `WP-0A-A6-001.json:44,184` waits on, for formulas. Which formulas (A6's KPI catalog) is A0's mapping. | **Metric C-01 states two formulas** (`WP-0A-A6-001.json:191`, recorded by `/claude/r0_steward`). The Owner approved "the formulas" without choosing between them; A6 must state one and the Owner's approval applies to that one. Sources and owners were not named in the item. Targets remain unset by decision. |
| 14 | Synthetic data until real users' consent is obtained. | The interim rule for OPEN-011 and OPEN-012 (lines 120-121); it matches `CONTRIBUTING_AGENTS.md:43`. | **G0-002 is not closed.** The 5-workspace pilot with signed consent (OPEN-011) and the Golden Set licence and reviewer agreement (OPEN-012) are still owed. The item says synthetic, so OPEN-012's "anonymized" alternative is not approved by it. Synthetic-only is the fallback while they are owed. |

**Not decided by the Owner's words**, stated once so no later record reads them as his:

- **OPEN-001's pricing.** It was never proposed. Only "manual invoice, no automatic charging, Stripe
  after G0" was (item 4). The pricing draft due before G0, VAT, refund and grace stay open.
- **OPEN-002's retention.** Only "Singapore region" was proposed (item 11). Retention per data class,
  legal basis and DPA stay open.
- **OPEN-007's feature flag.** Only "video/Reel to P1" was proposed (item 7).

**Still open after this disposition:** OPEN-001 (pricing, VAT, refund, grace), OPEN-002 (retention, legal
basis, DPA), OPEN-008 (Meta permissions and App Review path; G0 "risk accepted" was not in the message),
OPEN-013 (due before Pack 2), OPEN-005/010/019/020 (G1-G4), OPEN-015 and OPEN-018 (dispositioned by their
RFCs, register text not updated).


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
| `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md` §3 | Disposition notes citing this file, each only as far as §3 maps it: OPEN-001 (Beta approach only; pricing not decided), 002 (region only; retention not decided), 003, 004, 006, 007 (P1 only; no flag decided), 009, 011, 012, 014, 016, 017; §9.3.1 cross-vendor clause (line 527) amended per item 1; §7.1 status column (dated 2026-08-30) refreshed | Register owner (A0/Product), by RFC or Owner-approved edit |
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

## 8. The role runs, and the merge (appended 2026-10-05)

Three role runs reviewed this PR on head `10a337e`, and their files are cherry-picked here:

| Run | Commit | Cherry-picked as | Verdict |
|---|---|---|---|
| C0 re-check | `eb00c98` | `75c56bc` | Approved for the Reviewer role. It measures F1–F4 fixed, and confirms the step-2 text in §1.1 matches the session transcript byte for byte. |
| Q0 | `a717a17` | `f56ac98` | Nothing blocks the merge. Every blocker closure was re-measured, and the secret scan passes. |
| R0 | `758b299` | `2eaa828` | R1–R3 were marked as blocking because R0 ran in parallel with C0 and Q0. Each is met at the merged head: C0's re-check exists and approves, Q0's evidence exists, and the required check `bootstrap` must be green on that head before A0 presses the merge. |

**R4 asks whether A1 security review is required.** RFC-2026-025 §5 forbids a delegated merge while a security finding is open "against the PR". CON-002 #13's open remainder (CTR-TEN-001's `actor.id` admits a JWT-shaped value) is a pre-existing contract item owned by WP-0A-CON-001. This PR records that item's state accurately; it neither introduced the finding nor touches the contract. A0 reads it as not a finding against this PR.

**R5 asks whether this is a governance PR.** RFC-2026-025 §5 item 6 defines governance as changing an RFC, `CONTRIBUTING_AGENTS.md`, CI or a gate. This PR changes none of those. It adds evidence files, updates the G0 tracker's status records, closes manifest blocker lines with citations, and refreshes the handoff. The gate's rules and pass criteria are unchanged. A0 therefore reads it as within the Owner's standing delegation (batch 127 disposition §6), reinforced by `ลุยยาวเลยนะครับ ผมนอนแล้ว` ("keep going for a long run; I'm going to sleep", 2026-10-05).

A0 executes the merge; A0 does not decide it. If the Owner reads either R4 or R5 differently, the correction is a revert PR.
