# Freeze readiness of the twelve contracts G1 consumes — 2026-10-08

Author: `/claude/a0_atlas` (A0), increment of `WP-0A-CON-008`, read at `origin/main` `bd019c9c`.
Directed by the G1/G2 plan §2 row `WP-0A-CON-008` ("bring the contracts G1 uses to Frozen v1; bring
CTR-OBS/AUD/SEC/NTF from Draft to Candidate, then to Frozen"), which the A0 session reports the Owner
approved on 2026-10-08. That approval is **not recorded on `main`**, and this record does not rely on it:
every verdict below rests only on files on `main`.

**Result: no contract is moved.** Not one of the twelve has every precondition for its next step met
with evidence on `main`. This record names, per contract, what blocks the step and who owns it. It
changes no status, schema, fixture, version or owner; `contract-catalog/` is read-only for this package
and its `scope.exclude` still forbids a status change. Moving a status is a contract-state change, which
`CONTRIBUTING_AGENTS.md` (Ownership and change control) sends through an RFC — RFC-2026-010 is the
vehicle for Draft → Candidate; no RFC yet exists for Candidate → Frozen.

## 1. The rule each step is measured against

| Step | Source | What it requires |
|---|---|---|
| Draft → Candidate v1 | Decision Register §5.1; RFC-2026-010 | schema + examples ready; for a co-owned contract, the co-owner's sign-off (RFC-2026-010 "A0 cannot promote them alone"); the Product Owner's disposition, as on 2026-09-02 for the five A0-owned contracts |
| Candidate v1 → Frozen v1 | Decision Register §1.2 ("Contract ผ่าน G0"), §5.1 ("compatibility/security review + fixtures ผ่าน G0"), §4.1 Ownership Rules, line 138 ("A0 freeze/version shared contract"); §7.2 G0 Pass Rule item 2, line 365 (see below) | **G0 passed**, read with §7.2 (2) below; compatibility and security review; every `required_before_freeze` artifact; each contract's own "open before freeze" items closed or accepted by their owner |

### The blocker common to every Candidate → Frozen step: G0 has not passed, and the rule is circular as written

Frozen v1 is defined as *a contract that has passed G0* (Decision Register §1.2, line 43; §5.1, line 190).
On `main`, G0 is "Specification Baseline Complete / External Verification Pending"
(`CONTRIBUTING_AGENTS.md`, Current gate constraint); G0-024 (risk acceptance/sign-off) reads "Blocked by
prior items" (Decision Register §7.1, line 358); and the G0 exit record the plan names (`WP-0A-A0-010`)
does not exist yet. On that reading **no contract is Frozen today**, whatever its own readiness.

*Amended 2026-10-08 (C0 F-1, A1 N-1).* The same Register's §7.2 G0 Pass Rule, item 2 (line 365), reads:
"Shared contracts เป็นอย่างน้อย `Candidate v1`; Contract ที่ First Slice ใช้ต้อง `Frozen v1`". So G0
cannot pass until the First-Slice contracts are Frozen v1, and by §1.2/§5.1 a contract is Frozen v1 only
once it has passed G0. **Read as two events in sequence, the rule is a cycle**: neither can happen first.
Read as one event — the freeze review of the First-Slice contracts is part of the G0 exit, not something
after it — the cycle disappears; that is the reading §7.2 (2) points to, and it is the one A1 and C0
both name. Which reading governs, and whether a conditional G0 exit (`WP-0A-A0-010` as the plan describes
it) may waive §7.2 (2), is a gate-rule question that nothing on `main` decides. **This record does not
decide it**: a gate-rule change goes through an RFC (`CONTRIBUTING_AGENTS.md`, Ownership and change
control), and the reading is routed to the **Product Owner + A0** (owners of G0-024), recorded as this
package's `open_blockers[6]`. Neither reading moves any contract today: every one of the eight also has
its own open, owned items (§2).

This is why the per-contract lists below matter now even though nothing can move today: they are what
still stands between each contract and Frozen under either reading.

## 2. Candidate → Frozen (eight contracts)

| Contract | Owner | Verdict | Blocked by (owner) |
|---|---|---|---|
| CTR-TEN-001 | A0+A1 | **blocked** | G0 (§1). **The "scope matrix" `required_before_freeze` item is missing** — its own manifest: "the source-required scope matrix remains pending before Freeze" (A0+A1, WP-0A-CON-001). Seven reference fields unbounded (WP-0A-CON-007 `open_blockers[4]`; owner WP-0A-CON-001); migration 174 bounds the same ids in `app.jobs` at `^[A-Za-z0-9._:-]{1,128}$`, narrower than the contract (`WP-0A-DB-00` `open_blockers[202]` (2)). **A1 sign-off** as co-owner, not given for freeze. |
| CTR-ERR-001 | A0 | **blocked** | G0. Two reference fields unbounded (WP-0A-CON-007 `open_blockers[4]`; WP-0A-CON-001). `code` has no vocabulary, which also holds CTR-OBS-001's `error_code` label budget open (co-owner review, WP-0A-CON-004). |
| CTR-API-001 | A0 | **blocked** | G0. Its manifest `freeze_boundary` opens "Draft only." although the status is Candidate (WP-0A-CON-003 `open_blockers[14]` (3), C0 N-2: a catalog-wide text restatement owed by A0 before freeze); the same sentence goes on: "Auth rules, OpenAPI generation (API-006), optimistic-concurrency preconditions (API-004), and HTTP status mapping are NOT inferred here and remain open before freeze"; RFC-2026-010 records "auth rules" as presence of `tenant_context` only. `x-amended-by` record for the 64d9c65 lookahead removal owed (WP-0A-CON-005 `open_blockers[13]`(a); WP-0A-CON-001, acknowledged by `/claude/r0_steward`). Success `data` branch unconstrained (WP-0A-CON-002 `open_blockers[4]`). |
| CTR-IDM-001 | A0 | **blocked** | G0. Hash algorithm not pinned — a Security decision (WP-0A-CON-002 `open_blockers[5]`; A1). Manifest: store, lock strategy, retention window and header name "remain open before freeze"; its `freeze_boundary` also opens "Draft only." while Candidate (WP-0A-CON-003 `open_blockers[14]` (3); A0). Same `x-amended-by` record owed as CTR-API-001 (WP-0A-CON-001). |
| CTR-EVT-001 | A0 | **blocked** | G0. The `x-bound-note` on eight fields is wrong ("four of the sixteen"; true figure sixteen of sixteen) (WP-0A-CON-007 `open_blockers[3]`, `[9]`; owner WP-0A-CON-001). H-6 `x-amended-by` record for WP-0A-CON-006's fixture amendment owed (WP-0A-CON-006 `open_blockers[17]`; WP-0A-CON-001). Value pins for six envelope ids (C0 N-1, WP-0A-CON-007 `open_blockers[15]`). Payload business fields barred until a domain payload contract is owner-approved (manifest). |
| CTR-JOB-001 | A0 | **blocked** | G0. **Restatement of `tenant_context` owed** so the contract agrees with `app.jobs` after migration 174 (RFC-2026-028 Q-028-5; `WP-0A-DB-00` `open_blockers[202]` (2); owner WP-0A-CON-001). `job_type`, `lease_owner`, `progress_stage`, `last_error_code` have no upper bound or pattern; `max_attempts`, `timeout_seconds`, `attempt`, `job_version`, `priority` unbounded (WP-0A-CON-005 `open_blockers[11]`, WP-0A-CON-007 `open_blockers[5]`; WP-0A-CON-001). `dedupe_key` has no composition (A6, co-owner review). H-6 `x-amended-by` record for WP-0A-CON-006's fixture amendment owed here as on CTR-EVT-001 (WP-0A-CON-006 `open_blockers[17]` names ctr-evt-001 and ctr-job-001; WP-0A-CON-001). Scheme allow-list and tenant binding of references open before freeze (WP-0A-CON-005 `[6]`, `[7]`). CON-005's amendment acknowledgement still `pending` (`[0]`; `/claude/r0_steward`). Manifest: "lifecycle state names and transition policy remain subject to source-defined owner review". |
| CTR-MOD-001 | A0 | **blocked** | G0. **CS-1**: the handle syntax `^secret:[a-z0-9._-]+$` belongs to CTR-SEC-001 (A0+A1) and is still defined in CTR-MOD-001; A1 requires a narrow RFC (§4c) making CTR-SEC-001 normative, disclosing F5 to the Product Owner (WP-0A-CON-004 `open_blockers[0]`; A0 + A1). **CS-2**: `secret_handles.items` has no `maxLength` (a 407-character handle validates) while CTR-SEC-001 `handle` is `maxLength: 128`, so the two **do not compose on length** (WP-0A-CON-003 `open_blockers[1]`). Source keys `module_key`, `capability_key`, `dependencies.module_key` unbounded and must take ≤ 64 to compose with SEC/OBS (WP-0A-CON-004 `open_blockers[19]`). CS-3, CS-4, CS-5 (`tenant-data` retention), S-8, `permissions: []` (WP-0A-CON-003 `open_blockers[11]`). MR-002/003/005/006 not inferred and open before freeze (`[5]`, `[6]`). `freeze_boundary` opens "Draft only." while Candidate (WP-0A-CON-003 `open_blockers[14]` (3); A0). |
| CTR-FLG-001 | A0 | **blocked** | G0. FP-002's enforcement half (a narrower scope cannot override a kill switch) needs an evaluator that does not exist (WP-0A-CON-003 `open_blockers[4]`); FP-003 allocation, FP-004 circuit state and FP-006 admin API open before freeze (`[5]`, `[6]`). CS-4: the kill-switch `x-rule` overclaims and the fixture is misnamed (`[11]`). `freeze_boundary` opens "Draft only." while Candidate (WP-0A-CON-003 `open_blockers[14]` (3); A0; CTR-PAG-001, outside the twelve, carries the same sentence). |

## 3. Draft → Candidate (four contracts)

| Contract | Owner | Verdict | Blocked by (owner) |
|---|---|---|---|
| CTR-SEC-001 | A0+A1 | **blocked — co-owner promotion signature missing on the current text** | A1 has **not** signed the current CTR-SEC-001 for promotion. Its words on 2026-10-05: "This is **not** a co-owner signature promoting `CTR-SEC-001`; RFC-2026-010's 'CTR-SEC-001 awaits A1' is still not answered" (`evidence/WP-0A-CON-004/a1-security-reverify-2026-10-05.md` §4, line 215; repeated in the wording A1 supplied in `a1-recheck-2026-10-06.md`, line 172). A1's 2026-10-07 files do not repeat that sentence; they countersign the eight bound values expressly "at Draft only" (WP-0A-CON-004 `open_blockers[17]`). *Contrary evidence, weighed (amended 2026-10-08, C0 F-2, R0 R-2):* RFC-2026-013 (Approved 2026-09-02) lists among its immediate effects "A1's sign-off of `CTR-SEC-001` and A6's of `CTR-AUD-001` and `CTR-OBS-001` are signatures"; `evidence/WP-0A-CON-004/co-owner-review-sec-aud-obs-usg.md` ends "all now signed by their co-owners"; and `evidence/g0-tracker-th.md` lists SEC on 2026-09-02 as "เซ็นโดยมีเงื่อนไขบังคับ", conditions closed. That was a signature of the 2026-09-02 text. Why it does not carry SEC to Candidate today: (a) the contract changed since — A0 chose eight SEC bound values on 2026-10-07, the same reason AUD/OBS's 2026-09-02 signature no longer suffices below; (b) the co-owner itself, with RFC-2026-013 already approved, said on 2026-10-05 that the RFC-2026-010 question "is still not answered", and RFC-2026-013 makes a run's assessment a signature only as that run gives it; (c) RFC-2026-010's status line still reads "CTR-SEC-001 awaits A1" and SEC has no Product Owner disposition, so the step lacks that disposition whichever way the signature question falls. Whether the 2026-09-02 signature survives the 2026-10-07 change is the co-owner's to say and the Product Owner's to settle; this record does not settle it, and A1's 2026-10-07 review of this record (`a1-review-2026-10-07.md` §4: "I do not promote it") confirms the row. Also owed before it leaves Draft or freezes: the §4c handle RFC (CS-1/CS-2 above), C2 issuance format, SEC-003 class, runtime "redaction tests" (RFC-2026-010 reads 3/4), cross-tenant scope binding (`[0]`, `[2]`, `[6]`). |
| CTR-AUD-001 | A0+A6 | **blocked — co-owner countersignature of current values missing** | A6 signed on 2026-09-02 with recorded conditions (RFC-2026-013), but the contract changed since: the four AUD bounds (`audit_id`, `actor.id`, `correlation_id`, `causation_id` at 128) chosen by A0 on 2026-10-07 have **no A6 countersignature**, and the manifest states it is owed "before CTR-SEC-001, CTR-AUD-001 or CTR-OBS-001 leaves Draft" (WP-0A-CON-004 `open_blockers[17]`; `/claude/a6_relay`). Then the Product Owner's disposition under RFC-2026-010. Before freeze: immutability/tamper evidence (`[5]`), platform-scope actions (`[8]`), retention duration (`[9]`, legal), SEC-016 break-glass fields (`[3]`, A1). |
| CTR-OBS-001 | A0+A6 | **blocked — co-owner countersignature missing, one bound owed** | The ten OBS bound values have no A6 countersignature (WP-0A-CON-004 `open_blockers[17]`). `module.implementation_version` is unbounded; A1: "Bound it (64 ...) or record why not, before CTR-OBS-001 leaves Draft" (`[18]`; A0 + A6). Before freeze: the label-value cardinality budget (`[4]`, A6 as SRE owner), which is unreachable until CTR-ERR-001 `code` has a vocabulary. |
| CTR-NTF-001 | A5 | **listed, not assessed** (outside this package's scope; amended 2026-10-08, C0 F-3) | No verdict is given. What `main` records, for A5's own run: A5 has never ratified or assessed it; it was authored by A0 (WP-0A-CON-006 `open_blockers[1]`, `[2]`). Owed to A5: ratification of the four bounds (`[22]`) and A1 SC-2, the deep-link permission subject (`[19]`). This package's `scope.exclude` names CTR-NTF-001 and does not assess it; it is listed here because the plan names it, not judged. Eleven of the twelve are assessed. |

## 4. What would move each group, in order

1. **SEC/AUD/OBS to Candidate** — the only steps that do not wait for G0. Needed: A6 countersigns the
   14 AUD/OBS bound values and bounds-or-declines `implementation_version` (one `WP-0A-CON-004` increment
   with its own role round); A1 gives a promotion signature on CTR-SEC-001 (it has said what remains);
   then a Product Owner disposition under RFC-2026-010 recorded on `main`, and the status change made by
   the package that owns `contract-catalog/` paths, with the index census, baseline pin and registry pin
   moved in the same commit as on 2026-09-02.
2. **NTF to Candidate** — A5 run, its own package.
3. **Any Candidate to Frozen** — first, the Product Owner + A0 settle how §1.2/§5.1 ("Frozen v1 =
   passed G0") and §7.2 (2) ("G0 needs the First-Slice contracts Frozen v1") compose (§1; `open_blockers[6]`).
   This record does not order `WP-0A-A0-010` before or after the freeze: under the one-event reading the
   freeze review of the First-Slice contracts is part of the G0 exit. Either way, an RFC that defines the
   freeze review (compatibility + security) and, per contract, the owner closing or accepting the items
   in §2. The work that falls to `WP-0A-CON-001` (TEN scope matrix and bounds, ERR bounds, the
   API/IDM/EVT/JOB `x-amended-by` records, the EVT note, the JOB restatement and bounds) is the longest
   single queue; the "Draft only." `freeze_boundary` restatement on the five promoted contracts is A0's.
4. **MOD** needs the §4c handle RFC (A0 + A1) before it can freeze; that RFC also unblocks SEC.

## 5. What this record does not establish

- That any listed item is the **only** remaining one: it lists what `main` records as owed. A freeze
  review may find more, as each review round so far has.
- Anything about the Owner's 2026-10-08 approval: it is not on `main`, so it was not used. Even read at
  its widest, it approves a plan; it cannot supply an A1, A5 or A6 signature (RFC-2026-013 makes an agent
  run's assessment a co-owner's signature only when the run gives it), and it cannot pass G0.
- Sufficiency of any artifact counted "present" in RFC-2026-010; that section's limits stand.
