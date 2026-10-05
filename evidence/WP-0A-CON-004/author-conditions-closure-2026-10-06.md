# WP-0A-CON-004: Author closure of the role-verdict conditions, 2026-10-06

Author: `/claude/a0_atlas`. This record was written by a subagent of that run, in the same vendor and
model family as every role run on this package. It acts as the Author and approves nothing.
Branch: `agent/claude/WP-0A-CON-004-security-audit-observability`, cut from `origin/main` `8c089cc`.

## 0. What this is and is not

- Author evidence only. It does not review, test-verify, integrate or gate-approve anything, it
  countersigns no acknowledgement, and it does not move the package past `in_review`. The status
  was already `in_review` and stays there.
- The verdicts it answers are the latest role files on this package:
  - `review-contract.md` §2d and §9: Reviewer `/claude/c0_contract_reviewer`, `changes_requested`,
    at `a690f11` (2026-09-01), eight required changes.
  - `security-disposition-handle-ownership-a1.md` §4-§7: A1 `/claude/a1_bastion`, 2026-09-04,
    "refused in part, ratified in part", conditions C1-C5. By its own C5 it covers the ownership
    blocker only.
  - `co-owner-review-sec-aud-obs-usg.md`: A1 and A6 (`/claude/a6_relay`) co-owner assessments of
    2026-09-02. A1 signed off on CTR-SEC-001 with blocking conditions; A6 signed off on CTR-AUD-001
    and CTR-OBS-001 with recorded conditions. These are co-owner assessments, not a
    `security_approved` gate.
  - **No Tester verdict and no Integration verdict exist.** Those are first verdicts, owed.
  All three are a month and many merged packages older than `main`, so every condition below was
  re-measured at `main` `8c089cc`, not carried forward from the verdict text.
- The Owner's step-2 decisions are applied from
  `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` (merged in PR #186). The
  Owner's reply was `บืนยันขั้น 2`.
- This branch changes no RFC, no `CONTRIBUTING_AGENTS.md`, no CI file and no gate rule, so it is not a
  governance PR. It changes annotation and caveat TEXT in this package's three Draft contracts; no
  rule, enum, requiredness, bound or freeze level moves.

## 1. C0's eight required changes, re-measured at `main` `8c089cc`

| # | C0 required change | State at `8c089cc` | This branch |
|---|---|---|---|
| 1 | M1: `dependencies.status` inference must not claim the SEV-2 row distinguishes degraded from unavailable; declare `healthy` | **Half fixed.** The `status` x-source was corrected on 2026-09-02 and declares `healthy`. The block-level `dependencies` x-source still said the row "distinguishes a degraded provider from an unavailable one". | **Closed.** `ctr-obs-001/schema.json` `dependencies.x-source` now quotes the row and says it draws no such distinction. |
| 2 | M3: remove "MR-004 requires a reason" from the OBS x-rule and `freeze_boundary` | **Half fixed.** The capability x-rule was corrected (declared inference from MR-006). `ctr-obs-001/manifest.json` `freeze_boundary` still read "the MR-004 deny-by-default requirement that an unready capability states a reason". | **Closed.** `freeze_boundary` now records the reason as a declared inference from MR-006, MR-004 not mentioning one. |
| 3 | M6: give `trace_id` an x-source | **Closed before this branch** (declared inference, 2026-09-02). | Nothing to do. |
| 4a | M2: cite the 5.2 *name* column as a name | **Half fixed.** `x-catalog-note` was added, but `readiness.x-source` still opened "Decision Register 5.2 CTR-OBS-001 requires 'readiness'". | **Closed.** It now says the register NAMES the contract "Correlation/health/readiness" and points at the artifact column. |
| 4b | M4: drop SEC-009 as the source of "why" | **Open.** `ctr-sec-001` `allOf[0]` x-rule said a revoked handle "must record when, by whom and why" on PT-010 plus SEC-009; the manifest `freeze_boundary` said SEC-009 requires "actor, reason and correlation". | **Closed.** Both now say SEC-009 requires actor and correlation only, and requiring a reason is a declared inference from OB-005. `revocation.x-source` says the same. |
| 4c | M5: restate the legal-counsel note as what it says | **Open** in `ctr-aud-001` `retention.x-source`, `ctr-aud-001/manifest.json` `freeze_boundary`, and this manifest's retention blocker. | **Closed in all three.** The note (`meta-security-production-ops-workstream-th.md:191`) requires legal and tax requirements and the incident notification period to be confirmed before Production; it does not name retention periods and governs PDPA-006 by position only. |
| 5 | Declare the unsourced `maxLength` values and `liveness.status` | **Open** for `reason_key` (AUD and OBS), `retention.policy_ref`, `change.before_ref`/`after_ref` and `liveness.status`. `action.name` was already declared. | **Closed.** Each now carries a declared-inference note: 96 matches the existing stable-key length, 256 is adopted from the CTR-IDM-001 `result_ref` precedent (re-checked: `ctr-idm-001/schema.json:66`), and `up`/`down` are this contract's own terms. No bound value changed. |
| 6 | Soften "materializes exactly" on redaction, or add fixtures | **Fixtures added before this branch.** Six `invalid-redaction-<surface>-false.json` exist for CTR-SEC-001. `freeze_boundary` still listed the surface requirement under "Materializes exactly" without saying the six flags are a self-attestation, which A1's co-owner finding records. | **Closed.** `freeze_boundary` and `redaction.x-source` now say each surface is declared and fixture-defended, and that this is NOT evidence that any surface is free of plaintext. The runtime redaction tests that Decision Register 5.2 names still do not exist (open blocker). |
| 7 | Reframe the ownership escalation | **Open.** The `handle` x-source and `freeze_boundary` still called it an open conflict "for the A1 owner to resolve", although A1 disposed of it on 2026-09-04. | **Closed.** Both now record A1's disposition and name the open items: the RFC A1 required, and the issuance format. |
| 8 | Correct the coverage sentence in `author-self-check.md` | **Half fixed.** The later "Mutation coverage" section was corrected, but the original heading still said "proven by mutation". | **Closed.** The heading now says fixture mutation shows the suite reads the schema, with a dated correction note. |

## 2. A1's conditions (disposition C1-C5 and co-owner review)

| Condition | State | This branch |
|---|---|---|
| C1: never cite the pattern as a control | Holds: `x-opacity-limitation`, `freeze_boundary` and open_blockers[1] all say it is not one. | Kept. A duplicated half-sentence left in open_blockers[1] by the 2026-09-04 correction was removed; no claim changed. |
| C2: handle issuance format before freeze | Open. A1 must specify it through the RFC in §4(c). | **Owed by A1**, through an RFC in `architecture/decisions/**` (outside this package's paths). |
| C3: make the composition claim true, or withdraw it | Open. Re-measured: `ctr-sec-001` `handle` has `maxLength: 128`, and `ctr-mod-001` `secret_handles.items` has no `maxLength`, so the accept sets still differ. | **Withdrawn here.** The `handle` x-source and `freeze_boundary` no longer give "the two contracts compose" as the justification. Making them equal is owed through the RFC (CTR-MOD-001 belongs to WP-0A-CON-003 and A0). |
| C4: correct "zero coverage" in three places | Closed 2026-09-04 (`e7b8c4b`, `ec20e8b`). | Nothing to do. |
| C5: the other A1 blockers are untouched | True. The SEC-003 class, SEC-016 break-glass fields, runtime redaction tests, the cross-tenant scope binding and audit immutability are all still open. | Recorded in `required_human_authorities` and open_blockers. |
| §4(c): a narrow RFC, opened by A0 as CTR-MOD-001 owner | Not opened. `architecture/decisions/` holds RFC-2026-001..028 and none concerns handle syntax. | **Owed by A0, as owner of CTR-MOD-001 and the Decision Register.** It is a governance act this package cannot do. open_blockers[0] now carries A1's §7 wording. |
| A6 co-owner: per-label metric budget; `outcome` vocabulary | Open (accepted gap). | **Owed by A6** (OB-006, OBS-009). |
| A0+A6 and A1: audit immutability | Open. | **Owed**, before CTR-AUD-001 freezes. |

## 3. Owner step 2, applied to this manifest

| Item | Applied |
|---|---|
| 1. RFC-2026-024's cross-vendor withdrawal extends to the 15 packages | `independence.prefer_cross_vendor_review` is `false`, and `cross_vendor_exception` records the withdrawal and what independence still means. The "not satisfied" blocker is closed in place. |
| 2. `/claude/r0_steward` succeeds `/root/r0_steward` | Nothing to act on in this package. `grep` for `root/r0` and `acknowledgement` across `ctr-sec-001`, `ctr-aud-001`, `ctr-obs-001`, the manifest and the handoff at `8c089cc` returns nothing. The Integration Owner was already `/claude/r0_steward`. Recorded as a blocker entry so the absence is measured. |
| 3. No Product reviewer for contract packages | `role_assignments.product_reviewer_note` records that the null slot is by decision. |

Also corrected in the record: RFC-2026-004 has been Approved since 2026-09-02 (the "Proposed" blocker
is closed in place), and the dependency blocker no longer says CON-002, CON-003 and A0-002 are
unmerged. Their work is on `main`, and their open blockers are still inherited.

## 4. Owed by this package's Author, not done here

- **22 reference-shaped fields with no upper bound**, listed in `KNOWN_UNBOUNDED` in
  `test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs` on PR #188 as owed by WP-0A-CON-004:
  CTR-SEC-001 x8, CTR-AUD-001 x4, CTR-OBS-001 x10 (named in the manifest's open_blockers). They are not
  bounded in this increment for two reasons. A bound is a rule change that the next role round
  must review. And bounding a field before #188 merges would make its `KNOWN_UNBOUNDED` entry stale
  on that branch.

## 5. Commands at this branch (base `main` `8c089cc` plus this increment)

| Command | Exit | Result |
|---|---|---|
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | 0 | 6 tests, 6 pass, 0 fail, 0 skipped, 0 todo |
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` | 0 | 6 tests, 6 pass, 0 fail, 0 skipped, 0 todo |
| `node --test test-kits/contracts/catalog-registry.test.mjs` | 0 | 15 tests, 15 pass. Before the six pins moved, it failed and named exactly the three `freeze_boundary` and three annotation digests this branch rewrote. |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | no output |
| `npm run check` (Node v24.20.0 / npm 11.19.0) | see handoff | Recorded in `handoffs/WP-0A-CON-004-author-handoff.json` `tests`, from the run `scripts/commit-when-clean.mjs` makes before it commits. A run made before the handoff was refreshed failed only the two handoff-describes-this-branch checks: 690/692. |

The six moved pins in `test-kits/contracts/catalog-registry.test.mjs` (owner WP-0A-CON-008), and the
digest of that file in `test-kits/integrity-manifest.json` (owner WP-0A-A0-002), are declared in
`ownership.amends_without_owning`.
