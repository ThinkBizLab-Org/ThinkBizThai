# WP-0A-CON-004 — Independent Contract Review

**This document is independent Reviewer evidence only.** It is not author evidence, not
security-review evidence, not test evidence, and not integration evidence. It approves no
merge, advances no freeze level, and authorizes no gate. It is one role's opinion of one
commit.

- **Role:** Independent Reviewer
- **agent_run_id:** `/claude/c0_contract_reviewer`
- **Work package:** WP-0A-CON-004 — CTR-SEC-001, CTR-AUD-001, CTR-OBS-001
- **Author run under review:** `/claude/a0_atlas` (distinct run; no self-approval)
- **Commit reviewed:** `a690f11`
- **Review root:** frozen extraction at
  `/private/tmp/claude-501/-Users-bank-ThinkBizThai/cb23f394-422b-4ec3-b024-e2751f208eb9/scratchpad/rv-batch4`
- **Review date:** 2026-09-01

### Provenance caveat on the commit identifier

The frozen extraction carries **no `.git` directory**. `git log` in the review root exits
`128` (`fatal: not a git repository`). I therefore **cannot cryptographically confirm** that
this tree is commit `a690f11`; I take that identifier from my assignment and record the
inability to verify it. Everything below is a statement about the tree at the path above.

---

## 1. Commands run, with real exit codes

All commands executed through a login shell against pinned Node 24.20.0 / npm 11.19.0.
Nothing was downloaded. No file in `/Users/bank/ThinkBizThai` was read or written.

| # | Command | Exit | Result |
|---|---|---:|---|
| 1 | `git log --oneline -3` (in review root) | `128` | not a git repository — commit id unverifiable |
| 2 | `npm run check` | `0` | tests 95, pass 95, fail 0, **skipped 0, todo 0** |
| 3 | `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `0` | tests 6, pass 6, fail 0 |
| 4 | `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` | `0` | tests 6, pass 6, fail 0 |
| 5 | `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| 6 | `node --test test-kits/contracts/schema-mutation-coverage.test.mjs` | `0` | tests 2, pass 2, fail 0 |
| 7 | `node mutcov.mjs ctr-sec-001 ctr-aud-001 ctr-obs-001` (reviewer-authored probe) | `0` | see §5 |

The probe in row 7 was written by me, copied into the review root only for the duration of
the run, and **deleted afterwards**. The frozen tree is unmodified except for this evidence
file.

Counts confirmed by grep across the three schemas: **33 `x-source`** (11 SEC / 14 AUD /
8 OBS) and **10 `x-rule`** (4 SEC / 3 AUD / 3 OBS). The declared counts are accurate.

---

## 2. Item 1 — every `x-source`, verified one by one

### 2a. Task-id existence check (run first, as instructed)

Every task id the author cites was searched in all three baseline documents before any
content was compared. **No invented or non-existent task id was found.** All 28 ids resolve
to a real row:

| Task id | Found in | Line |
|---|---|---:|
| SEC-003, SEC-005, SEC-007, SEC-009, SEC-012, SEC-016 | meta-security-production-ops | 158, 160, 162, 164, 167, 171 |
| INF-006 | meta-security-production-ops | 264 |
| OBS-001, OBS-002, OBS-004, OBS-009 | meta-security-production-ops | 302, 303, 305, 310 |
| PDPA-006, PDPA-008 | meta-security-production-ops | 184, 186 |
| OB-001, OB-002, OB-003, OB-005, OB-006 | module-contracts-events-jobs | 333, 334, 335, 337, 338 |
| MR-004, MR-005, MR-006 | module-contracts-events-jobs | 209, 210, 211 |
| PT-010 | module-contracts-events-jobs (§ H) | 289 |
| EV-001, TC-001, CM-004 | module-contracts-events-jobs | 239, 217, 198 |
| DEC-010, DEC-014, DEC-023 | decision register | 70, 74, 83 |

Section-letter citations also check out: PT-010 is in **§ H** (Stable Ports/Adapter Router,
line 276), MR-004/005/006 in **§ B** (Module Manifest and Registry, line 202), OB-\* in
**§ L** (Observability, Audit, Usage and Operations, line 329), CM-004 in **§ A** (line 191).
Decision Register **§5.2** is at line 194 and **§4.2** at line 145.

**No artifact in this package cites §5.1 at all** (`grep "5\.1"` over all three contract
directories exits 1). The CON-003 §5.1/§4.2 miscitation class does **not** recur.

### 2b. Per-citation verdict table

Legend: **EXACT** = quoted content matches the source; **OK** = accurate paraphrase;
**INFER-OK** = inference, declared as such, correctly attributed; **IMPRECISE** = right row,
wrong column or loose paraphrase; **MISCITED** = the source does not say what is claimed.

| # | Contract / site | Cited | Verdict | Note |
|---|---|---|---|---|
| S1 | SEC `handle` | DR 5.2 "opaque ref"; PT-010 reference-only; CTR-MOD-001 precedent; DR 5.2 ownership A0 vs A0+A1 | **EXACT** | 5.2 artifact column literally reads "opaque ref, scope, rotation/revoke, redaction tests"; owners A0 (MOD) and A0+A1 (SEC) confirmed |
| S1b | SEC `handle` x-maxlength-note | 128, "baseline states no length" | **INFER-OK** | correct; baseline states no length |
| S1c | SEC `handle` x-opacity-limitation | pattern is not a control; scanner composes to zero | **OK** | corroborated empirically — see §4 |
| S2 | SEC `scope` | DR 5.2 "scope"; PT-010 "scoped credential resolver"; MR-004 "readiness result per capability/scope"; DEC-010 + WS 3.1 | **EXACT** | all four quoted strings verbatim in source |
| S3 | SEC `ownership` | PT-010 inputs "managed/BYOK credentials"; DEC-014; SEC-012 | **EXACT** | DEC-014 = "Platform AI + BYOK OpenAI"; SEC-012 title matches |
| S4 | SEC `classification` | SEC-003 Public/Internal/Confidential/Restricted, token & API key classified | **EXACT** | SEC-003 acceptance: "token/API key/PII/media/financial/audit ถูกจัดชั้นครบ" |
| S5 | SEC `state` | DR 5.2 "rotation/revoke"; SEC-005 "encrypted, masked, rotated"; PT-010 revoke immediately | **EXACT** | SEC-005: "secret encrypted, masked, rotated"; PT-010: "revoke ได้ทันที" |
| S6 | SEC `resolvable` | DECLARED INFERENCE from PT-010 + MR-004; "not a field named in either" | **INFER-OK** | honest; both parents verified |
| S7 | SEC `rotation.owner` | INF-006 "rotation owner/date complete"; WS 3.1 forbids free-string actor; PT-010 two ownerships | **EXACT** | INF-006: "rotation owner/date ครบ"; 3.1: "ห้ามเป็น string อิสระ" |
| S8 | SEC `rotation` | INF-006; SEC-005 rotated | **EXACT** | |
| S9 | SEC `redaction` | PT-010 no secret in logs/events/jobs; SEC-005 browser/job/event/log no plaintext; SEC-012 not analytics/error trace; DR 5.2 "redaction tests" | **EXACT** | all six surfaces trace to a real clause; SEC-012: "key ไม่เข้า analytics/error trace" |
| S10 | SEC `revocation` | PT-010 immediate revocation; SEC-009 credential action records actor and correlation; key-not-prose inferred from CTR-ERR-001 + CM-004 | **OK** | property-level citation is precise (see R2 for the x-rule that is not) |
| S11 | SEC `correlation_id` | SEC-009 actor AND correlation; OB-001 one trace | **EXACT** | |
| A1 | AUD `audit_id` | DECLARED INFERENCE from WS 3.2 `event_id`, via OB-005's EV-001 dependency | **INFER-OK** | OB-005 dependency column is literally "TC-001, EV-001"; 3.2 has `event_id` |
| A2 | AUD `occurred_at` | WS 3.2 `occurred_at` (UTC) via OB-005→EV-001 | **EXACT** | 3.2: "`occurred_at` \| UTC `timestamptz`" |
| A3 | AUD `actor` | OB-005 "actor"; SEC-009 six action classes; WS 3.1 typed kind/id | **EXACT** | |
| A4 | AUD `action` | OB-005 "action"; SEC-009's six categories; dotted grammar a DECLARED INFERENCE from 3.2 `event_type`; maxLength "inferred, not sourced" | **EXACT** | six categories match SEC-009 verbatim: role/credential/publish/delete/billing/support. Underscore widening declared |
| A5 | AUD `tenant_context` | OB-005 lists TC-001; DR 5.2 requires "scope" | **EXACT** | 5.2 CTR-AUD-001 artifact = "actor/scope/action/reason/ref/redaction" |
| A6 | AUD `correlation_id` | SEC-009 actor AND correlation; OB-001 | **EXACT** | |
| A7 | AUD `causation_id` | WS 3.1 `causation_id` = id of causing command/event/job | **EXACT** | 3.1: "ID ของ command/event/job ต้นเหตุ" |
| A8 | AUD `outcome` | DECLARED INFERENCE; "no source names an outcome field"; from SEC-007 deny-by-default + SEC-016 break-glass audit, failure case from OB-002 | **INFER-OK** | honest and correctly disclaimed. The OB-002 leg is thin (OB-002 is an error taxonomy task, not an outcome vocabulary) but it is declared, not asserted |
| A9 | AUD `reason_key` | OB-005 "reason"; key-not-prose a DECLARED INFERENCE from CM-004 + CTR-ERR-001; OBS-001 forbids full content | **EXACT** | maxLength 96 is unsourced and, unlike A4, not declared as inferred |
| A10 | AUD `change` | OB-005 "before-after ref"; grammar adopted from CTR-IDM-001 `result_ref`; "the two scheme names are a DECLARED INFERENCE; no source names them" | **INFER-OK** | model disclosure |
| A11 | AUD `error` | OB-002 stable operational error taxonomy; CM-004/CTR-ERR-001 materialize it | **EXACT** | |
| A12 | AUD `redaction` | OB-005 "secret/content redaction"; OB-002 PII redacted; OBS-001 linkable without secret/full content; DR 5.2 | **EXACT** | OBS-001: "trace/job/workspace/module/error links ได้ โดยไม่ใส่ secret/content เต็ม" |
| A13 | AUD `retention` | SEC-009 deliverable "Audit schema + retention"; PDPA-006 machine-readable retention per entity naming audit | **EXACT** on the tasks; **IMPRECISE** on the counsel claim — see **M5** |
| A14 | AUD `details` | OB-005 secret/content redaction; matches CTR-ERR-001 `details` and CTR-EVT-001 `payload` precedent | **OK** | CTR-ERR-001 `details` is indeed `{type:object, maxProperties:0}` — precedent confirmed |
| O1 | OBS `correlation` | DR 5.2 "propagation"; OB-001 one trace across retry/worker/adapter; OBS-004 span joining; field names from WS 3.1 and 3.3 | **EXACT** for the four named fields — but see **M6**: `trace_id` is in the schema and in **neither** 3.1 nor 3.3 |
| O2 | OBS `module` | OB-003 aggregates per module; OBS-002 module on every record; `module_key` from CTR-MOD-001; pair = WS 3.2 `producer` | **EXACT** | 3.2 `producer` = "module key + implementation version" |
| O3 | OBS `environment` | "exactly the four rows of the Environment Model in Track INF: Local, Preview, Staging, Production" | **EXACT** | verified at line 246; exactly four rows, exactly those names |
| O4 | OBS `liveness` | OB-003 states the rule directly: liveness must not be tied to an external provider | **EXACT** | OB-003: "liveness ไม่ผูก external provider" |
| O5 | OBS `readiness` | DR 5.2 CTR-OBS-001 "requires 'readiness'"; OB-003 real capability; MR-004 per capability/scope; key-not-prose inferred | **IMPRECISE** — see **M2** | 5.2's freeze-artifact column is "propagation, SLI tags, bounded cardinality". "readiness" appears only in the contract **name** column |
| O6 | OBS `dependencies` | OB-003 "module/provider status"; three status values a DECLARED INFERENCE "from the SEV-2 example ... which distinguishes a degraded provider from an unavailable one" | **MISCITED** — see **M1** | |
| O7 | OBS `sli_tags` | DR 5.2 "SLI tags" and "bounded cardinality"; OB-006 no user content/token/page name, cardinality bounded; OBS-002 module+environment | **EXACT** | both 5.2 strings verbatim; OB-006 acceptance verbatim |
| O8 | OBS `redaction` | OBS-001 linkable without secret/full content; OBS-002 PII redact tests; OB-002 PII redacted before alert | **EXACT** | |

### 2c. The ten `x-rule` annotations

| # | Rule | Verdict |
|---|---|---|
| R1 | SEC revoked ⇒ not resolvable + revocation record — "PT-010 revoke immediately plus SEC-009 credential auditing: ... when, by whom **and why**" | **M4** — SEC-009 requires *actor and correlation*. It does not require a reason. The "why" is unsourced here (the property-level x-source S10 is careful; this rule is not) |
| R2 | SEC active ⇒ resolvable, no revocation; `rotating` left unconstrained with reason given | **OK** |
| R3 | SEC managed ⇒ platform_role | **OK** |
| R4 | SEC byok ⇒ workspace_owner | **OK** |
| R5 | AUD delete ⇒ before_ref — OB-005 before/after ref + PDPA-008 tombstone and audit entry | **EXACT** — PDPA-008 acceptance: "tombstone/audit ครบ" |
| R6 | AUD failed/denied ⇒ error — OB-002 + SEC-007 deny-by-default | **OK** |
| R7 | AUD succeeded ⇒ no error — OB-002 | **OK** |
| R8 | OBS capability not ready ⇒ reason_key — "**MR-004 makes activation deny-by-default with a reason**" | **MISCITED** — see **M3** |
| R9 | OBS ready ⇒ all capabilities ready — OB-003 + MR-004 | **OK** |
| R10 | OBS down ⇒ not ready; converse deliberately not stated | **OK** |

### 2d. Miscitations found — the actionable list

**M1 (MISCITED, OBS `dependencies.status`).** The annotation says the status values are
inferred "from the SEV-2 example in the Meta/Security/Ops alert table, **which distinguishes
a degraded provider from an unavailable one**." The SEV-2 row (line 322) reads: *"degraded
provider, queue delay, one format unavailable."* The table pairs "degraded" with *provider*
and "unavailable" with *one format*. It does **not** distinguish a degraded provider from an
unavailable provider anywhere. The inference itself is declared and the values are defensible;
the **characterization of the source is false**, which is precisely the defect class I flagged
in CON-003. `healthy` has no source at all and is not separately declared.

**M2 (IMPRECISE, OBS `readiness`).** "Decision Register 5.2 CTR-OBS-001 requires 'readiness'."
The 5.2 row's *Artifact ขั้นต่ำก่อน Freeze* column is "propagation, SLI tags, bounded
cardinality". "readiness" is in the *Contract* name column ("Correlation/health/readiness").
The same author quotes the artifact column correctly twice elsewhere in the same file
("requires 'propagation'", "requires 'SLI tags' and 'bounded cardinality'"), so the parallel
construction implies a freeze-artifact obligation that the row does not carry. Right row,
wrong column.

**M3 (MISCITED, OBS `readiness` x-rule R8 *and* the OBS freeze_boundary).** Both state that
MR-004 requires a reason. MR-004 (line 209) reads: acceptance *"deny-by-default; missing
secret/scope/entitlement ไม่ activate"*, output *"readiness result per capability/scope"*.
**MR-004 contains no reason requirement.** This is not a close call, and it is decisive
because the sibling contract in this same catalog gets it right: CTR-MOD-001's `lifecycle`
x-source says, in terms, *"MR-004 does not mention a reason; requiring one is inferred from
MR-006."* CON-003 was corrected to that reading after review; CON-004 reintroduces the
overstatement. It appears in `freeze_boundary`, the sentence that states what the contract
claims to materialize.

**M4 (OVERSTATEMENT, SEC x-rule R1).** SEC-009 is cited for "why". SEC-009 requires actor and
correlation only.

**M5 (IMPRECISE PARAPHRASE, AUD manifest + WP open_blockers).** "the baseline states that Thai
legal counsel must confirm **retention periods** before production." The baseline note (line
191, immediately under the PDPA table) says legal and tax requirements and the **incident
notification period** must be confirmed by Thai legal experts before Production. It does not
name retention periods. The note governs the PDPA table by position, so the conclusion is
defensible; the quoted content is not what the source says.

**M6 (UNSOURCED RULE, OBS `correlation.trace_id`).** `trace_id` appears **nowhere** in either
workstream document (grep over both files returns nothing). The block x-source enumerates the
provenance of `correlation_id`, `request_id`, `causation_id` (3.1) and `job_id` (3.3) and
silently omits `trace_id`. The package's own acceptance criterion is *"Every rule in all three
schemas carries an x-source ... and every rule that was inferred rather than read says so."*
`trace_id` is a rule that was inferred and does not say so. This falsifies the headline claim
that no rule lacks a source.

**Secondary pattern:** `maxLength` values are declared as inferences in 2 places
(`handle` 128, `action.name` 96) and left unsourced and undeclared in 5 others
(`reason_key` 96 ×2, `policy_ref` 96, `before_ref`/`after_ref` 256). `liveness.status`
up/down carries no provenance note either. Individually trivial; collectively they undercut
"every rule carries an x-source."

---

## 3. Item 2 — invented semantics, interrogated

| Element | Ruling |
|---|---|
| `handle` pattern `^secret:[a-z0-9._-]+$` | **Declared adoption.** Not verbatim from any baseline. CTR-MOD-001 itself declares the `secret:` token an inference. Double-declared, correctly attributed, escalated. **Not invented-and-hidden.** |
| `handle` `maxLength: 128` | **Declared inference.** "The baseline states no length" — true. Explicitly disclaimed as a control. Clean. |
| `resolvable` | **Declared inference**, correctly attributed to PT-010 + MR-004, with "not a field named in either" stated outright. This is the honest form of what CON-002 did dishonestly. |
| Reference schemes `snapshot` / `record` | **Invented, and said so**: "The two scheme names are a DECLARED INFERENCE; no source names them." Acceptable at Draft; must be ratified before freeze. |
| `outcome` succeeded/failed/denied | **Invented, and said so**: "No source names an outcome field." Grounded in SEC-007 + SEC-016. The OB-002 leg is weak but declared. |
| `audit_id` | **Declared inference** from 3.2 `event_id` through a dependency edge I verified. Clean. |
| `occurred_at` | **Sourced verbatim** (3.2, UTC). |
| `dependencies.status` healthy/degraded/unavailable | **Declared inference with a false source characterization.** See M1. |
| `ownership` managed/byok | **Sourced** (PT-010 inputs). |
| `classification` 4 values | **Sourced verbatim** (SEC-003). |
| `state` active/rotating/revoked | **Sourced** for rotating/revoked (5.2 "rotation/revoke", SEC-005 "rotated"); `active` is implicit. Defensible, undeclared. |
| `rotation.owner.kind`, `actor.kind` | **Sourced** — `user`/`system_actor` is verbatim WS 3.1. |
| `action.category` 6 values | **Sourced verbatim** — exactly SEC-009's six. Strongest citation in the package. |
| `environment` 4 values | **Sourced verbatim** — exactly the four Track INF rows. |
| `liveness.status` up/down | **Invented labels, undeclared.** Trivial, but inconsistent with the package's own standard. |
| `dependencies.kind` module/external_provider | **Sourced** to OB-003's input column plus its liveness/readiness asymmetry. Sound reasoning. |

**Net:** I found **no undeclared invented semantics of substance.** Every load-bearing
invention names itself. That is a genuine improvement over CON-002 and I record it as such.
The defects here are citation *accuracy*, not fabrication.

---

## 4. Items 3 and 4 — the two judgement calls

### Item 3 — adopting CTR-MOD-001's pattern as "precedent, not authority"

**Ruling: the adoption is correct; the framing is wrong, and the framing is what entrenches.**

The engineering call is right and I would make it the same way. Two different handle syntaxes
across two contracts that must reference the same string is a composition failure — a harder,
less visible defect than an irregular provenance. Shipping a second pattern to make a point
about ownership would be process theatre paid for in a real integration break.

But the ownership framing is not accurate, and it matters. The manifest and the WP
`open_blockers` both describe an **"OPEN OWNERSHIP CONFLICT"** for A1 to dispose of. There is
no live conflict. CTR-MOD-001's own `secret_handles` annotation already reads: *"CTR-SEC-001
(owner A0+A1) is the chartered owner of handle syntax and this single-owner contract must not
fix it."* The single-owner contract **already conceded**. What exists is an unratified
placeholder sitting in the wrong file, waiting for its rightful owner to adopt or replace it.

CTR-SEC-001 is that rightful owner, and this package is authored under A0 — one of the two
joint owners, not a bystander. By re-describing a conceded placeholder as an unresolved
dispute and forwarding it to A1, the package converts a decision it is half-entitled to make
into an escalation, and the placeholder stays in CTR-MOD-001's file as the de facto source of
truth for one more cycle. That is the entrenchment mechanism. It is mild — the pattern is
identical either way — but it is real, and it survives precisely because the artifact records
the wrong question.

**Condition:** reword both the manifest `freeze_boundary` and WP `open_blockers` so the open
item is what actually remains open — (a) formal ratification of the syntax by the A1 co-owner
now that the chartered owner has adopted it, and (b) the handle **issuance format**, which
CTR-SEC-001 genuinely cannot specify alone. Drop the characterization of a "conflict" that the
other contract already yielded.

### Item 4 — `x-opacity-limitation` plus an `accepted-gap-` fixture instead of narrowing the shape

**Ruling: honest engineering, not an excuse — but the honesty is unevenly applied, and that
unevenness is the finding.**

The case for honesty is strong and I want to state it plainly. There is no shape rule in JSON
Schema that separates a reference from the credential it references; a narrower pattern would
have produced a *better-looking* control with the same zero coverage, and would then be cited
downstream as protection. The author instead put `THIS PATTERN IS NOT A SECURITY CONTROL, AND
MUST NOT BE CITED AS ONE` **inside the artifact**, where a consumer reading the schema cannot
miss it, named the specific residual shapes that satisfy it (lowercase hex, base32, dashed
token), named what would actually close it (an issuer-assigned identifier a producer cannot
mint from credential material), named the owner, and shipped an executable fixture
(`secret:0123456789abcdef…`, a 40-hex string) so the gap is a passing, visible test rather
than a silence. A declared weakness that a reader trips over beats an undeclared one they
inherit.

I also **independently corroborated** the composite claim. `npm run check` runs
`scripts/scan-repository-secrets.mjs` and exits `0` **with the 40-hex handle committed in the
tree**. The scanner does not flag it. So the assertion "schema and scanner compose to zero
coverage for a credential smuggled inside a conforming handle body" is not rhetoric — it is
demonstrated by this repository's own gate passing over the demonstration.

The problem is the asymmetry. This contract is scrupulous about the one control it *labels*
weak and silent about several it presents as strong. §5 shows that of the six `const: true`
redaction surfaces — the clauses `freeze_boundary` says the contract *"Materializes exactly"* —
**five are exercised by no fixture at all.** Deleting `browser_safe`, `log_safe`, `job_safe`,
`analytics_safe` or `error_trace_safe` leaves every declared verdict unchanged. Only
`event_safe` is defended. The same holds for SEC-009's six action categories in CTR-AUD-001
and for the entire `managed ⇒ platform_role` rule.

So: declaring the weak thing weak is good practice and I credit it. But "materializes exactly"
is a stronger claim than the evidence supports for the parts *not* declared weak, and the
contract does not say so. **The category does not launder — the omission does.**

---

## 5. Item 5 — mutation coverage, run independently

I did not rely on the author's evidence. I wrote a probe that enumerates every deletable
constraint site in each schema (assertive keywords plus each `allOf` element individually),
deletes each site in turn, revalidates **all** declared fixtures through the repository's own
`json-schema-subset.mjs`, and records whether any verdict flips.

| Contract | Fixtures | Constraint sites | Killed by some fixture | Unexercised | **Coverage** |
|---|---:|---:|---:|---:|---:|
| CTR-SEC-001 | 11 | 81 | 13 | 68 | **16.0 %** |
| CTR-AUD-001 | 10 | 67 | 13 | 54 | **19.4 %** |
| CTR-OBS-001 | 10 | 89 | 14 | 75 | **15.7 %** |

This is the **same 10–16 % band** that WP-0A-CON-003 sat in before fixtures were added for it.
Adding 31 fixtures did not move the ratio, because the fixtures are one-defect-per-file
negatives that each trip a single constraint and shadow everything else in the same document.

**Unexercised constraints that carry real weight:**

*CTR-SEC-001* — five of six `redaction.*.const true` surfaces (all but `event_safe`); the
**entire** `active ⇒ resolvable true ∧ no revocation` rule (`allOf.1`); the **entire**
`managed ⇒ platform_role` rule (`allOf.2`); `classification.enum`; `ownership.enum`;
`state.enum`; `revocation.reason_key.pattern`; `scope.capability_key.pattern`;
`handle.maxLength`; root `required`.

*CTR-AUD-001* — `action.category.enum` (**SEC-009's six categories — the package's headline
citation, defended by no fixture**); `outcome.enum`; all three `redaction.*.const`;
`retention.policy_ref.pattern`; `change.after_ref.pattern` (`before_ref.pattern` *is* killed);
both `$ref` composition edges (`tenant_context`, `error`); root `additionalProperties`; root
`required`.

*CTR-OBS-001* — `environment.enum`; `liveness.status.enum`; the whole `dependencies` subtree
including `kind.enum` and `status.enum` (**the very declared inference M1 concerns is tested by
nothing**); every `sli_tags.*.pattern` (only `sli_tags.additionalProperties` is killed);
`capabilities.minItems`; all three `redaction.*.const`; root `additionalProperties`; root
`required`.

**Root `required` survives in all three**, extending the catalog-wide finding recorded in the
mutation suite's own header comment from nine contracts to twelve.

**Mitigating facts I record in fairness.** (1) `test-kits/**` is in this package's
`read_only_paths`, so the author **could not** add these contracts to the `PROTECTED` list in
`schema-mutation-coverage.test.mjs`. That is a structural constraint, not a choice, and the
remedy available to them was more fixtures. (2) The catalog-wide suite
`shared-kernel-schema-conformance.test.mjs` synthesizes its own probes for "an extra property
carrying a secret is rejected at every declared object level" and "every catalog schema closes
its root against undeclared properties", so root closure is defended dynamically even where no
declared fixture kills it.

**Evidence over-claim.** `author-self-check.md` says *"Conformance coverage is real, not
incidental — proven by mutation on all three contracts"* and then lists three **fixture**
mutations. Mutating a fixture proves the suite is wired to the schema. Mutating a **constraint**
proves the constraint is exercised. Those are different claims, and the numbers above are what
the second one yields. The WP acceptance criterion as literally written ("mutating a negative
fixture so its schema accepts it makes the conformance suite fail naming that file") **is
met**; the prose generalizes it into a coverage claim it does not support.

---

## 6. Item 6 — the four `accepted-gap-` fixtures

All four are **genuinely accepted** by their own shipped schemas. Verified from the baseline
verdict vectors produced by the probe: SEC `…,true,true` (positions 10, 11), AUD `…,true`
(position 10), OBS `…,true` (position 10). None is a negative fixture mislabelled.

| Fixture | Accepted? | Reason substantive? | Names what is unresolved + who resolves it? |
|---|---|---|---|
| SEC `accepted-gap-classification-below-restricted` | Yes | Yes — SEC-003 genuinely names four classes and assigns none to a credential handle; the fixture is a managed provider credential declared merely `internal` | Yes — SEC-003, owner **A1**, "must assign the class and this schema must then pin it before freeze" |
| SEC `accepted-gap-structureless-handle-body` | Yes | Yes — 40-hex body, the exact shape of a real token; corroborated by the scanner passing over it | Yes — handle **issuance format**, owner **A1** |
| AUD `accepted-gap-break-glass-without-time-bound` | Yes | Yes, with a caveat below | Yes — SEC-016 expiry/approver/revocation fields, owner **A1** |
| OBS `accepted-gap-unbounded-error-code-label` | Yes | Yes — `error_code: "provider.http_502.attempt_7.corr_0004"` embeds an attempt number and a correlation id, so every failure mints a new time series. A textbook demonstration | Yes — per-label budget and value vocabulary, owner **A6**, via OB-006 and OBS-009 |

**Can the category launder a rule that should simply be enforced?** In principle yes, and it is
the right thing to test for. My finding: **none of these four launders an enforceable rule**,
but one is close to the line.

The break-glass gap is the weakest of the four. SEC-016's acceptance text *does* say
"time-bound" outright, so a reader could reasonably ask why the schema does not require an
expiry on a support-category record. The author's defence — that SEC-016 has not named the
field, and that inventing a security field on a security boundary is worse than declaring the
hole — holds, and it holds for a reason the manifest does not state: **the schema has no way to
identify a break-glass record at all.** `action.category` is `support`, which covers every
support action, and `action.name` is an open dotted grammar. Requiring an expiry would mean
pinning a literal `action.name` value, which *would* be invention. So the gap is real — but it
is **wider than the accepted_gaps text admits**. The text says the record cannot show the grant
was time-bounded; it should also say the contract cannot distinguish a break-glass grant from
any other support action, which is the reason no rule can attach.

The other three sit on genuine JSON Schema expressivity limits (opacity, population
cardinality) or genuine upstream undelivered decisions (SEC-003 classification). Each names an
owner and a "before freeze" obligation rather than trailing off. They are used as intended.

---

## 7. Item 7 — index, statuses, counts

- `contract-catalog/shared-kernel/index.json` verified **row-for-row against Decision Register
  §5.2**: all fourteen contract ids, versions, names, owners, consumers and W0 statuses match
  the baseline table exactly. CTR-SEC-001 = `A0+A1` / `Draft`; CTR-AUD-001 and CTR-OBS-001 =
  `A0+A6` / `Draft`, as §5.2 has them.
- Programmatic status count: **`{"Candidate": 4, "Draft": 10}`**. Correct.
- All three contracts under review are `status: "Draft"` in **both** the index and their own
  manifests. No freeze-level advancement anywhere.
- The repository's own assertions agree: *"the index still reports 4 Candidate and 10 Draft:
  materializing a Draft does not promote it"* and *"each new contract stays Draft and cites its
  baseline source"* both pass.
- **Caveat, stated plainly:** with no `.git` in the frozen extraction I cannot produce a diff
  proving the file is byte-identical to its parent commit. "Untouched" is established here by
  **content equivalence to the baseline §5.2 table**, which is the stronger property anyway,
  not by a diff.

---

## 8. Item 8 — what is NEW in this package

1. **Four new in-artifact limitation annotations**, unique in the catalog:
   `x-opacity-limitation`, `x-maxlength-note`, `x-cross-tenant-limitation`,
   `x-cardinality-limitation`. These state a weakness *inside the schema* rather than only in
   the manifest. New convention; on balance a good one (a consumer reads the schema, not always
   the manifest). It is undeclared as a convention and no test enforces the pairing between a
   limitation annotation and its accepted-gap fixture. Worth a catalog-level decision before it
   proliferates.
2. **`accepted-gap-` fixture count doubles**, from 2 (both CTR-PAG-001) to 6. The category is
   inherited, not invented here, but this package is where it becomes a catalog-wide idiom. It
   now needs an explicit rule about when it may be used, or it will become the default response
   to any hard constraint.
3. **First cross-contract `$ref` composition from an audit record** — CTR-AUD-001 refs both
   `ctr-ten-001` and `ctr-err-001`. Reference integrity passes (exit 0). **Neither `$ref` edge
   is exercised by any declared fixture** (§5).
4. **A deliberate `forbidden_paths` deviation**, the one item here with a security surface. This
   package drops `**/*secret*` and `**/*credential*` — present in WP-0A-CON-001..003 — and
   substitutes `*.pem`, `*.key`, `*.p12`, `*.pfx`. The stated rationale is sound: a package that
   materializes the secret-handle contract would have its own declared outputs forbidden by its
   own manifest. The reasoning is recorded in-manifest as `forbidden_paths_note` rather than
   left in the diff, which is the right way to do it, and the author correctly notes that
   CON-003 already ships `valid-blocked-missing-secret.json` against its own glob, so the
   contradiction pre-exists. **I flag it for the security reviewer, not because I think it is
   wrong, but because it is the one change here that weakens a repository-wide guard and no
   test detects the divergence between sibling packages.**
5. **`details: {maxProperties: 0}` on an audit record** — the "declare the bag and hold it
   empty" pattern extended from CTR-ERR-001/CTR-EVT-001 to the audit path. Sound, and it is one
   of the few AUD constraints a fixture actually kills.
6. **`required_human_authorities` naming a second authority** (A1 disposition of the handle
   syntax and issuance format) alongside the standing RFC item. Appropriate.

---

## 9. Verdict and required changes

This is the strongest package in the CON series so far, and I want that on the record before
the defects. There are **no invented task ids** — all 28 cited ids resolve to real rows. There
is **no §5.1/§4.2 confusion** — the defect that sank CON-003 does not recur. There are **no
undeclared invented semantics** — every load-bearing inference names itself, which is exactly
what CON-002 twice failed to do. Several citations are word-for-word exact against the Thai
source, and the SEC-009 six-category derivation is the cleanest sourcing in the catalog.

I am nonetheless requesting changes, for a narrow reason: **the package's central claim is
citation discipline, and it does not fully hold.**

- **M6** falsifies "every rule carries an `x-source`". `trace_id` is a shipped field that
  appears in neither baseline document and declares nothing.
- **M3** reintroduces, in `freeze_boundary`, the exact overstatement class that CON-003 was
  corrected for — and the correction is already sitting in CTR-MOD-001 in this same catalog,
  where the identical rule reads "MR-004 does not mention a reason".
- **M1** attributes to the SEV-2 alert row a distinction the row does not draw.
- The `freeze_boundary` claim that the contract "Materializes exactly" the six-surface
  redaction requirement is not supported: **five of the six surfaces are exercised by no
  fixture.**

These are text corrections and fixture additions, not a redesign. Nothing is frozen, nothing is
merged, everything is synthetic and reversible. But an `x-source` is the deliverable here, not a
comment about the deliverable, and a miscited one propagates to whoever cites this contract
next.

### Required before I will approve

1. **Fix M1** — restate the `dependencies.status` inference without claiming the SEV-2 row
   distinguishes a degraded provider from an unavailable one, and declare `healthy`.
2. **Fix M3** — remove "with a reason" / "requires that an unready capability states a reason"
   from the OBS `x-rule` and `freeze_boundary`. Attribute the reason obligation where
   CTR-MOD-001 already attributes it (MR-006), or declare it as an inference.
3. **Fix M6** — give `trace_id` an `x-source` declaring it as inferred and naming what from,
   or remove the field.
4. **Fix M2, M4, M5** — cite the 5.2 *name* column as a name; drop SEC-009 as the source of
   "why"; restate the legal-counsel note as what it says.
5. **Declare the remaining unsourced `maxLength` values and `liveness.status`**, to the same
   standard the package sets for `handle` and `action.name`.
6. **Soften `freeze_boundary` on redaction**, or add fixtures. Either add negative fixtures for
   the five undefended redaction surfaces (cheapest real fix, and it raises coverage on the one
   clause that matters most on this boundary), or change "Materializes exactly" to state that
   the surfaces are declared but that only `event_safe` is fixture-defended.
7. **Reframe the ownership escalation** per §4 item 3 — name ratification and the issuance
   format as the open items, not a conflict the other contract already conceded.
8. **Correct the coverage sentence in `author-self-check.md`** — say fixture mutation, which is
   what was done and what the acceptance criterion asks for. Optionally record the
   constraint-mutation numbers from §5 as an open blocker; they are a real property of this
   catalog and will otherwise be rediscovered every cycle.

Items 1–4 and 8 are the ones I consider non-negotiable. Items 5–7 I would accept as recorded
follow-ups if the author prefers, provided they land before any freeze-level advancement.

VERDICT: changes_requested
