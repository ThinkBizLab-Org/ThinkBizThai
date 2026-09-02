# WP-0A-CON-006 — Independent contract review

Reviewer run: `/claude/c0_contract_reviewer` (Anthropic, `claude-opus-5`)
Commit reviewed: `5c6eef2`
Review root: `/private/tmp/claude-501/-Users-bank-ThinkBizThai/cb23f394-422b-4ec3-b024-e2751f208eb9/scratchpad/rv-con006`
Date: 2026-09-01

**This is independent Reviewer evidence only.** It is not author self-check, security
review, test verification, integration verification, Product Owner disposition, or merge
approval, and it does not move Gate G0. This run did not author any part of WP-0A-CON-006
and holds no writable path in the catalog. It did not read or write
`/Users/bank/ThinkBizThai`, and it did not touch `evidence/WP-0A-CON-006/test-verdict.md`.

---

## 1. Commands executed, with real exit codes

All run through a login shell on the pinned toolchain. Nothing was downloaded.

| Command | Exit | Observed |
|---|---:|---|
| `node --version` | `0` | `v24.20.0` |
| `npm --version` | `0` | `11.19.0` |
| `npm run check` | `0` | `tests 116 / suites 0 / pass 116 / fail 0 / cancelled 0 / skipped 0 / todo 0` |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `0` | `tests 6 / pass 6 / fail 0 / skipped 0 / todo 0` |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| `node scripts/validate-work-packages.mjs work-packages` | `0` | no output |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-006.json` | `0` | no output |
| `node scripts/scan-repository-secrets.mjs` | `0` | no output |
| `node scripts/verify-toolchain.mjs` | `0` | no output |

Reviewer note on one command: this run first invoked the role-separation validator with a
*directory* argument and got `EXIT=65 / invalid JSON manifest: EISDIR`. That is a reviewer
error, not a package defect — the script takes a single manifest path (line 71–75). Recorded
because a review that hides its own misfires is not evidence. Re-run against
`work-packages/WP-0A-CON-006.json` it exits `0`.

The Author's reported `npm run check` result (`116/116`, zero skipped, zero todo) is
**reproduced exactly**.

---

## 2. Per-citation verification

Every `x-source` and every `source_references` entry was checked against the named baseline,
and **each task id was confirmed to exist before its content was read**.

### 2.1 Task ids — existence and section letter

| Cited id | Cited section | Exists? | Actual location | Verdict |
|---|---|---|---|---|
| OB-004 | L | yes | §5 L "Observability, Audit, Usage และ Operations", line 336 | **correct** |
| OB-006 | L | yes | L, line 338 | **correct** |
| OB-008 | L | yes | L, line 340 (note: **P1**, not P0) | **correct** |
| EV-001 | E | yes | §5 E "Event Contracts และ Transactional Outbox", line 239 | **correct** |
| ID-002 | G | yes | §5 G "Idempotency และ External Side Effects", line 270 | **correct** |
| ID-005 | G | yes | G, line 273 | **correct** |
| PT-007 | H | yes | §5 H "Stable Ports, Adapter Router และ Normalization", line 286 | **correct** |
| CT-007 | I | yes | §5 I "Shared Contract Test Kits", line 301 | **correct** |
| MK-006 | K | yes | §5 K "Integration Mocks และ Developer Harness", line 325 | **correct id, unused — see C-8** |
| MOD-130 | Register §4.2 | yes | §4.2 Registry, owner **A6** | **correct** |
| §3.1 | Tenant Context v1 | yes | line 97 | **correct** |
| §3.2 | Event Envelope v1 | yes | line 115 | **correct** |
| §5.2 | Shared Kernel Contracts | yes | line 194 | **correct** |

**No non-existent task id was found. No section letter is miscited.** This is a clean result
and a marked improvement on CON-003 (two section-number miscitations) and CON-004 (six
miscitations). The Author checked the section letters this time.

### 2.2 Quoted content

| # | Rule | Citation as written | Baseline says | Verdict |
|---|---|---|---|---|
| 1 | `dimension` six values | "OB-004 Inputs names exactly token / search / bytes / egress / processing / publish. **These six values are that list and nothing else.**" | OB-004 Inputs: `token/search/bytes/egress/processing/publish` | **overstated.** The list is quoted correctly, but the *values* are not it: every one is renamed (`ai_tokens`, `research_search`, `storage_bytes`, `egress_bytes`, `media_processing`, `publish_operation`). "bytes" → "storage_bytes" adds a storage referent the baseline does not state. Cardinality and referents are right; the claim of verbatim identity is not. |
| 2 | `attribution` required set | "OB-004 acceptance: 'workspace/business/job/provider attribution ครบ'" | `workspace/business/job/provider attributionครบ` | **accurate** (space before ครบ is a transcription artefact only). |
| 3 | money precision | "OB-004 requires correct money precision" | `money precisionถูก` | **accurate** |
| 4 | `occurred_at` | "§3.2 Event Envelope: occurred_at is a UTC timestamptz" | `occurred_at \| UTC timestamptz` | **verbatim accurate** |
| 5 | `tenant_context` (USG) | "§3.1: every command, query, job and event touching customer data carries the Trusted Tenant Context" | "ทุก command, query, job และ event ที่แตะข้อมูลลูกค้าต้องมี" | **verbatim accurate** |
| 6 | OB-006 | "no user content, token or page name in a metric label, and bounded cardinality" | `ไม่มี user content/token/page nameใน metric label; cardinality bounded` | **accurate** |
| 7 | OB-008 | "detects missing and DUPLICATE usage" | `detected missing/duplicate usage; variance threshold alert` | **accurate** |
| 8 | ID-002 | "**ID-002 requires a dedupe record**" | ID-002 inputs `consumer key/event id`, output `inbox/processed record wrapper` | **imprecise.** ID-002 requires the *consumer* to keep an inbox/processed record keyed by consumer key and event id. It does not require the produced **event** to carry a `dedupe_key` field. The step from consumer-side record to producer-side field is an inference and is **not labelled as one** — see C-2. |
| 9 | PT-007 command/result | "PT-007 requires a channel-neutral COMMAND and RESULT pair" | outputs: `channel-neutral command/result` | **verbatim accurate** |
| 10 | `channel` | "PT-007 Inputs: 'in-app first; email/LINE future'" | `in-app first; email/LINE future` | **verbatim accurate** |
| 11 | non-rollback | "PT-007 acceptance: 'delivery failure does not roll back domain result'" | `delivery failure does not roll back domain result` | **verbatim accurate** |
| 12 | `failure_class` | "CT-007 requires transient and permanent failure to be distinguishable" | `locale, deep-link, dedupe, transient/permanent failure tested` | **acceptable paraphrase.** CT-007 is a *test-kit* task, not a contract task; "tested" → "distinguishable" is a fair reading but is one step of inference, undeclared. |
| 13 | ID-005 | "a completed or retried event must not notify a user twice beyond policy" | `completed/retried event ไม่แจ้งผู้ใช้ซ้ำเกิน policy` | **accurate** |
| 14 | permission-checked deep link | "CTR-NTF-001's own catalog row requires a 'permission-checked deep link'" | §5.2 CTR-NTF-001 freeze artifacts: `locale, dedupe, permission-checked deep link` | **verbatim accurate** |
| 15 | `locale` | "§3.1: Phase 1 locale default is th-TH" | `locale \| Yes \| Phase 1 default th-TH` | **quote accurate, rule stronger than source.** §3.1 says th-TH is the **default**; the schema makes it an `enum` of exactly one value, i.e. the **only** permitted value. "Default" ≠ "only". The x-source offers a design rationale ("adding one is a visible contract change") in place of a source, and does **not** mark this as a declared inference. See C-3. |
| 16 | MOD-130 | see §3 below | see §3 below | **supported; extension undeclared** |

### 2.3 Sources that exist and were missed

Not errors, but they bear directly on the rulings below.

- **§5.2, CTR-USG-001 row, artifact column: `dimensions, attribution, decimal money, dedupe`.**
  The phrase **"decimal money"** is verbatim in the register, on this contract's own row. It is
  a *better* source for the decimal-money rule than MOD-130 and the Author never cited it.
- **§4.2 MOD-100 (notification-view, owner A5), ห้ามทำ column: `roll back domain result on
  delivery failure`.** A second, independent baseline source for the non-rollback rule, sitting
  in the same table as MOD-130, and the one that decides item 6. Not cited.
- **§5.5 ข้อบังคับ: "ทุก async contract มี idempotency/dedupe, trace, tenant, retry/error,
  retention และ cost attribution."** A direct, verbatim source for `dedupe_key` on both
  contracts. The Author instead reached for ID-002, which does not say it (finding 8 above).
- **§4.1 and §4.3** — the ownership rules that decide item 4. Not cited. See §5.

---

## 3. Item 2 — the MOD-130 money claim, and its extension to `quantity`

### What §4.2 actually says

The §4.2 Registry table's columns are:
`Module ID | Module key | Owner | ข้อมูล/ความสามารถที่เป็นเจ้าของ | Public contracts | Migration range | ห้ามทำ`

The MOD-130 row, verbatim:

> `| MOD-130 | usage-billing-entitlement | A6 | usage ledger, reservation, quota, plan, subscription/reconciliation | CTR-USG, EVT-USG | 130–139 | use floating point money |`

So the final column — **ห้ามทำ, "must not do"** — reads exactly **"use floating point money"**.

**Ruling on the money claim: supported, and the linkage is legitimate.** The Author's sentence
"Decision Register 4.2 MOD-130 forbids floating-point money" is accurate. The scoping also
holds: MOD-130's Public contracts column names `CTR-USG`, so a module-scoped prohibition on
A6's module does reach this contract. And §5.2's own CTR-USG-001 row independently requires
**"decimal money"**. The prohibition is real and doubly sourced.

**But the annotation implies more than the register supports, in one specific step.** The
acceptance criterion reads: *"Money and quantity are decimal **STRINGS**, never numbers:
Decision Register 4.2 MOD-130 forbids floating-point money."* The colon asserts entailment.
It does not entail. "Not floating point" and "decimal" are satisfied by a fixed-scale decimal
type, by an integer count of minor units, or by a `number` with a declared scale. **JSON
string is one implementation of the rule, not the rule.** For `cost.amount` this step is
presented with no inference marker at all, while the *weaker* claim on `quantity` is properly
marked. That asymmetry is backwards: the undeclared inference is the one carrying the
headline acceptance criterion.

### The extension to `quantity`

**Ruling: defensible, correctly declared, but weaker than the schema's own shape admits.**

In its favour: it is explicitly marked `DECLARED INFERENCE`, it names its source, and the
engineering argument is real — a float quantity poisons the precision of any cost derived
from it, so the prohibition's purpose does carry across.

Against it, and this undercuts the stated reasoning:

1. MOD-130's ห้ามทำ names **money**. A token count is not money. The extension is an analogy,
   not a reading.
2. The Author's justification is *"a quantity is carried as a DECIMAL STRING **for the same
   reason** a money amount is."* The schema does not treat them the same way.
   `cost.amount` is `^-?[0-9]+\.[0-9]{2,8}$` — sign permitted, fractional part **mandatory**,
   scale bounded 2–8. `quantity.amount` is `^[0-9]+(\.[0-9]+)?$` — no sign, fractional part
   **optional**, scale **unbounded**. Two different rules cannot both be "the same reason".
3. `cost.amount` permits a **negative** amount (verified: `-1.50` matches). A credit, refund or
   reconciliation adjustment may well be intended, but **nothing in OB-004, OB-008, §5.2 or
   MOD-130 sources a negative cost**, and no fixture exercises one. `quantity.amount` forbids
   a negative. The asymmetry is unexplained and unsourced.

The extension may stand. The claim that it rests on the same reasoning as the money rule
should be corrected to match what the schema actually does, and the sign asymmetry sourced or
removed.

---

## 4. Item 3 — invented semantics

Each item graded **quoted** / **declared inference (sound)** / **inference not declared** /
**invented**.

| # | Rule | Grade | Basis |
|---|---|---|---|
| **C-1** | `cost.basis` = `provider_reported` / `list_price` / **`estimated`** | **two declared, one INVENTED** | The x-source reads: OB-008 "reconciles usage against provider statements and therefore needs to know whether a figure was **reported or estimated**." That inference yields **two** values. The enum has **three**. **`list_price` has no source anywhere** — not OB-004, not OB-008, not §5.2. Worse, it contradicts this package's own `scope.exclude`, which excludes **"the provider price list"**. A `list_price` basis is a price-list-derived figure. No valid fixture exercises it (it appears only incidentally inside `invalid-float-cost.json`). |
| **C-2** | `quantity.unit` = `token` / `request` / `byte` / `second` / `operation` | **INVENTED — no x-source covers it at all** | The `quantity` object carries one x-source and it discusses **only** decimal strings. It says nothing about units. OB-004's Inputs list enumerates *dimensions*, not units. **`request`, `second` and `operation` appear nowhere in any cited baseline**; `second` in particular introduces time-based metering that no source mentions. Three of five values are never exercised by a valid fixture. This is a five-value enum shipped with zero sourcing, under an acceptance criterion that says every rule carries one. |
| **C-3** | `locale` = `["th-TH"]` (enum of one) | **inference not declared** | §3.1 says th-TH is the Phase 1 **default**. The schema makes it the **only** legal value. Hardening a default into an exclusive constraint is a design decision; the x-source substitutes a rationale for a source and carries no inference marker. |
| **C-4** | `channel` = `in_app` / `email` / `line` | **declared inference — SOUND** | PT-007 Inputs quoted verbatim, the extension to future channels is explicitly marked `DECLARED INFERENCE`, the reasoning is stated, and it is corroborated by §5.4 PRT-NTF-001 ("In-app, Email, future LINE") and §5.2's consumer list ("Job/UI/Email adapter"). **Accept.** Neither `email` nor `line` is exercised by a fixture. |
| **C-5** | `message_key` pattern `^notification\.[a-z_.]+$` | **declared inference, sound in principle; form diverges from the catalog's own** | The key-not-prose precedent is real and correctly attributed — but note CTR-ERR-001's `message_key` is `{"type":"string","minLength":1}` with **no pattern**, so CTR-ERR-001 supplies the *principle*, not the *shape*. The catalog's developed shape is CTR-OBS-001's `reason_key`: `^readiness\.[a-z0-9_.]+$` **with `maxLength: 96`**. CTR-NTF-001 drops the length bound (an unbounded key) and drops **digits** from the class, so `notification.job.v2.completed` is rejected. Divergence from the sibling, not a demonstrated un-making — no record shows the `maxLength` was itself a correction. |
| **C-6** | `delivery.state` = `queued` / `delivered` / `failed` / **`suppressed_duplicate`** | **INVENTED — no x-source covers the enum** | The `delivery` object's x-source addresses **only** the non-rollback rule and the failure classes. It says nothing about the state enum. `suppressed_duplicate` in particular encodes a dedupe *outcome* as a delivery state — a real inference from ID-005 that is nowhere declared. It also sits awkwardly against the manifest's own `untestable_by_fixture`: *"a fixture can carry a `dedupe_key` but cannot demonstrate suppression"* — while `examples/valid-result-suppressed-duplicate.json` ships a document that reports exactly that. |
| **C-7** | `failure_class` = `transient` / `permanent` | **quoted** | CT-007: `transient/permanent failure tested`. Accept. `permanent` is unexercised by a valid fixture. |
| **C-8** | `metric_labels` at `maxProperties: 0` | **wrong contract, and the stated parity is false** | Two separate problems, both material. **(a) Charter.** §5.2 assigns "bounded cardinality" to the **CTR-OBS-001** row. The **CTR-USG-001** row's artifact column reads `dimensions, attribution, decimal money, dedupe` — labels and cardinality are not in it. CTR-OBS-001 already implements OB-006 in `sli_tags`, with a closed name set and an explicit `x-cardinality-limitation`. Adding a second metric-label field to CTR-USG-001 imports another contract's chartered concern. **(b) The CTR-EVT-001 parity claim is inaccurate.** CTR-EVT-001's `payload` is in the root `required` list, so `maxProperties: 0` is a **live** constraint forcing every event to ship a visibly empty payload. CTR-USG-001's `metric_labels` is **optional** — an event may simply omit it, and the property can never hold anything, so the constraint is inert. It is not held empty "for the same reason"; the mechanism differs. |
| **C-9** | fixture `invalid-metric-label-carries-content.json` | **name overstates the rule** | It sets `metric_labels: {"page_name": "ร้านของฉัน"}` and is rejected. But `{"module_key": "x"}` — a perfectly safe label — is rejected identically, by `maxProperties: 0`. The fixture demonstrates rejecting *any* label, not a label *carrying content*. Its name asserts an OB-006 semantic the schema does not implement — which `open_blockers` itself concedes is "a deliberate placeholder, not a modelled rule". |
| **C-10** | `notification_id` | **NO x-source at all** | See §5, finding U-1. The only property in either contract without one. |
| **C-11** | `attribution.business_profile_id` optional | **declared conflict resolution — acceptable** | OB-004 requires attribution `ครบ` (complete) over workspace/business/job/provider; §3.1 makes `business_profile_id` Conditional. Two sources pull apart and the Author resolves toward §3.1 **and says so**. That is the right handling. Worth the owners' attention at ratification. |

### C-12 — a rule that enforces nothing, presented as enforcing something

The `allOf` in `ctr-usg-001/schema.json`:

```json
{"if":{"properties":{"cost":{"properties":{"basis":{"const":"estimated"}},"required":["basis"]}},"required":["cost"]},
 "then":{"properties":{"cost":{"required":["amount","currency","basis"]}},"required":["dedupe_key"]},
 "x-rule":"OB-008 reconciliation: an estimated cost must still be dedupable, or a later provider statement cannot replace it without double-counting."}
```

The `then` branch requires `cost` to have `["amount","currency","basis"]` — which the base
schema **already** requires — and requires root `dedupe_key`, which the base schema
**already** requires. The `then` is a subset of the unconditional constraints. **No document
exists that this rule rejects and the base schema accepts.**

Verified empirically against the shipped subset validator, comparing the schema with and
without its `allOf`:

```
estimated, no dedupe_key        : with allOf=invalid | allOf removed=invalid -> allOf changes outcome: false
estimated, cost missing currency: with allOf=invalid | allOf removed=invalid -> allOf changes outcome: false
```

The `x-rule` states a substantive reconciliation requirement. The rule below it is inert
decoration. This is precisely the failure mode the package's own purpose statement claims its
method prevents — *"schema and test predicates drift apart"* — arriving in a new form: here the
schema and its own annotation have drifted, and no fixture can catch it because **no document
can violate the rule**. Contrast CTR-NTF-001, whose three `allOf` branches were each checked
and are each load-bearing.

---

## 5. Item 5 — is a correction being un-made?

**Two are. Two are not.**

### PASS — the reference allow-list grammar is carried forward intact

`ctr-ntf-001` `deep_link.target_ref`:
`^(app|content|asset|job):[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$`

Normalising the scheme alternation away, the body grammar is **byte-identical** to
CTR-IDM-001 `result_ref` and CTR-JOB-001 `input_ref` (verified by string comparison, both
`true`). The scheme list is a closed, appropriately narrower subset. Executed against the full
bypass corpus recorded in the CTR-IDM-001 / CTR-JOB-001 `x-reference-rule` annotations:

```
ACCEPT  content:content_1 | app:home | asset:a.b/c.d
reject  https://…  HTTPS://…  //public.example.invalid/x  ftp://x/y
reject  data:text/plain;base64,AA==  file:///etc/passwd  javascript:alert(1)
reject  ../../../etc/passwd  content:../../../etc/passwd  content:/.env
reject  content://attacker.example.invalid/exfil  app:/proc/self/environ
reject  content:a//b  content:a/../b  content:  (empty body)
reject  status:job_1  result:job_1  (schemes correctly not in this contract's list)
```

Every demonstrated bypass is rejected. **The correction is fully carried forward.** The
deny-list form retired by RFC-2026-006 appears nowhere in either new contract. This is the
package's strongest work and it should be said plainly.

### PASS (with a caveat) — `maxProperties: 0` as a placeholder

The mechanism matches CTR-EVT-001 `payload` and CTR-ERR-001 `details`; no superseded form is
reintroduced. The caveat is C-8(b): the *claimed parity* is false, because EVT's field is
required and USG's is optional.

### FAIL — U-1: the unsourced-field defect, corrected in writing in CTR-OBS-001, is back

CTR-OBS-001 `correlation.trace_id` carries this, in the catalog, today:

> `"x-source":"DECLARED INFERENCE, previously UNSOURCED. … Independent review found this rule shipped with no source while its four siblings were sourced, which falsified this package's claim that no rule lacks one."`

CTR-NTF-001 ships:

```json
"notification_id":{"type":"string","minLength":1}
```

No `x-source`. Verified by enumeration: it is the **only** top-level property across both new
contracts without one (`ctr-usg-001` → none missing; `ctr-ntf-001` → `["notification_id"]`).
Its ten siblings all carry one. The package's acceptance criterion states *"Every rule carries
an x-source naming the baseline task."*

This is the same defect, in the same catalog, three directories from where it was corrected in
writing, falsifying the same claim. **This is the class of finding this review was told to look
for hardest, and it is present.**

### FAIL — U-2: the "right row, wrong column" discipline is un-made

CTR-OBS-001 closes with an `x-catalog-note` recording exactly that correction:

> *"Decision Register 5.2 lists this contract's freeze artifacts as 'propagation, SLI tags,
> bounded cardinality'. The word 'readiness' appears in the row's NAME column, not among its
> required artifacts; an earlier annotation cited it as though it were an artifact
> requirement. **Right row, wrong column.**"*

The lesson is: read the §5.2 artifact column of *this contract's* row before adding a field.
CTR-USG-001 then adds `metric_labels`, sourced to OB-006 / bounded cardinality — a requirement
that §5.2 lists on the **CTR-OBS-001 row**, not the CTR-USG-001 row, whose artifact column
reads `dimensions, attribution, decimal money, dedupe`. Same column-discipline failure, in the
opposite direction: not wrong column of the right row, but right column of the **wrong row**.
See C-8(a).

### Additional — U-3: a work-package control relaxed on a rationale copied from another package

`WP-0A-CON-006.json` `ownership.forbidden_paths_note` is **byte-identical** to
`WP-0A-CON-004.json`'s (verified: `CON-004 note === CON-006 note : true`). It reads:

> *"**This package materializes the secret-handle contract itself**, so files named for secret
> handling are its declared outputs: `contract-catalog/shared-kernel/ctr-sec-001/**` and
> `ctr-aud-001/examples/valid-credential-revoked.json` would be forbidden by their own
> manifest…"*

**That statement is false of WP-0A-CON-006.** Its outputs are `ctr-usg-001/**` and
`ctr-ntf-001/**` only — zero paths matching `ctr-sec-001` or `ctr-aud-001` (verified: CON-006
`0`, CON-004 `25`). CON-004 is the package that materialized those contracts.

On that false rationale, this package drops `**/*secret*` and `**/*credential*` from
`forbidden_paths` — the four sibling packages CON-001/002/003/005 all retain them. The
substitution may be harmless in effect here, since the package writes no such file. The defect
is that a security control was narrowed and the recorded justification for narrowing it does
not apply to this package. A control relaxed on copied reasoning is a control that stopped
being reasoned about.

---

## 6. Item 4 — materializing another role's contract

The governing text, none of which the package cites:

- **§4.1 Ownership Rules:** *"Owner มีสิทธิ์เสนอ Contract แต่ A0 freeze/version shared
  contract"* — **the owner has the right to propose the contract; A0 freezes and versions it.**
- **§4.3 Shared File Ownership,** `contract-catalog/` → Owner **A0**, contributor workflow:
  *"Producer ส่ง proposal+fixture; A0 assign version"* — **the producer submits the proposal and
  fixtures; A0 assigns the version.**
- **§5.2:** CTR-NTF-001 owner **A5** (sole); CTR-USG-001 owner **A0+A6**.
- **§4.2:** MOD-100 notification-view → **A5**; MOD-130 usage-billing-entitlement → **A6**.

### Ruling: the two contracts are not alike, and grading them alike is itself the error

**CTR-USG-001 (A0+A6) — legitimate. No finding.** A0 is a named co-owner. Authoring is squarely
within charter. Recording that A6 has supplied no reviewed `billing-cost-ops` benchmark and
that the cost semantics require A6 ratification is the correct and sufficient handling.

**CTR-NTF-001 (A5, sole) — it should not have been done. Grade: High.**

Recording an irregularity is not a substitute for a control when the control being bypassed is
*who originates the artifact*. §4.1 reserves proposing to the owner. §4.3 makes A0's role in
`contract-catalog/` receiving a proposal and assigning a version — **not writing the proposal**.
A0 wrote the proposal. Ratification-after-the-fact is a different and weaker control than the
one the register specifies, because it changes A5's act from authorship to review of someone
else's design.

And there is a real design surface here, not a mechanical transcription. Every one of the
following is a decision A5 did not make: closing `channel` over two future channels; the
`message_key` grammar and its divergence from CTR-OBS-001's `reason_key`; a four-value
`delivery.state` enum that is unsourced (C-6); `locale` hardened from a default to an
exclusive enum (C-3); and the const-as-prohibition design ruled on below. "Materialized from
the baseline" understates what was authored.

**Grading against the precedent.** Independent security graded CTR-MOD-001 fixing syntax
chartered to CTR-SEC-001 as **High**. That was a *fix to one existing field*. This is an
*entire contract, owned solely by another role, authored from scratch, containing unsourced
design decisions*, by the role whose charter in this directory is to freeze and version rather
than to propose. Consistency requires **at least High**; the scope is strictly larger.

**Where the actual harm shows up:** the Author's own headline — *"The shared-kernel catalog is
now complete. **14 of 14** contracts materialized"* — and the acceptance criterion *"All 14
shared-kernel contracts are now materialized."* A non-owner draft that its owner has never seen
is being counted toward a completion metric that will be read at Gate G0 as coverage. That is
the concrete consequence of doing it rather than not doing it.

**Recommended disposition** (not a merge instruction; the Integration Owner decides): retain the
artifact — the work is not wasted — but stop it counting as CTR-NTF-001. Either move it out of
`contract-catalog/shared-kernel/` into a proposal path, or add an explicit `x-authorship` block
naming A0 as author, A5 as owner-of-record and ratification as **not obtained**, and restate
the completion claim as **13 of 14 materialized by their owners, 1 proposed by a non-owner
pending A5**.

---

## 7. Item 6 — the two `const` prohibitions

These two are treated identically by the package. **They are not the same kind of thing, and
that is the finding.**

### `deep_link.requires_permission: const true` — sound, if weak. Accept.

A `const` on a producer-chosen configuration flag makes the prohibited configuration
*unstatable in the wire format*. A producer that wants to emit "this deep link needs no
permission check" cannot produce a conforming document. That is a legitimate thing for a schema
to do, and the catalog already accepts it twice: CTR-EVT-001's empty `payload`, and
CTR-OBS-001's `liveness.depends_on_external_provider: const false`, whose annotation makes the
case well — *"a liveness probe that admits a provider dependency is not a liveness probe."*
The same reasoning holds: a deep link that does not demand a permission check is the defect
§5.2's row names.

The honest caveat: since `deep_link` is required on every command, `requires_permission` can
only ever be `true`, so it carries zero bits and is informationally identical to having no
field and stating the rule in the description. It is a declaration, not an enforcement. But it
is a *correctly typed* declaration — about the message's own configuration — and it costs
nothing.

### `delivery.domain_result_rolled_back: const false` — **category error. Change it.**

This field is not a configuration the producer chooses. It is an **assertion about what
happened in a different subsystem** — whether the domain transaction was rolled back. A schema
can constrain what a document may *declare*. It cannot constrain what another subsystem *did*.

The consequence is not neutral, it is inverted:

- If the domain result was **not** rolled back, the field is redundant — every conforming
  document says so, so the claim carries no information.
- If the domain result **was** rolled back — the exact violation PT-007 prohibits — then the
  **truthful report is unrepresentable**. The producer must emit a false value or an invalid
  document.

A contract that makes the honest report of a violation schema-invalid does not prevent the
violation. It **suppresses the evidence of it**, at the one boundary where an OB-002 alert or an
OB-008-style reconciliation would ever have seen it. That is strictly worse than prose: prose
leaves a testable obligation on the implementation and leaves the failure reportable.

The Author concedes half of this — *"the const false records the prohibition, it does not prove
the domain result survived"* — but does not draw the conclusion that recording it this way is
therefore harmful rather than merely insufficient.

**The baseline itself decides this, and the package missed the citation.** §4.2 MOD-100's
**ห้ามทำ** column already reads `roll back domain result on delivery failure`. The register
places this prohibition where prohibitions belong: as a **module-ownership obligation on A5's
module**, not as a field on the wire. And PT-007's own realisation path is CT-007 ("suite") and
MK-006 ("captured outbox") — both cited in the manifest's `source_references`, neither used by
the contract. The obligation has a correct home and the contract is not it.

**Ruling:** `requires_permission: const true` — **sound**. `domain_result_rolled_back:
const false` — **category error; change required.** Either drop the field and carry the
prohibition as an `x-rule` citing PT-007 and MOD-100's ห้ามทำ, or relax it to
`{"type":"boolean"}` with that `x-rule`, so a rollback is **reportable and therefore
detectable** rather than unrepresentable. As it stands, the fixture
`invalid-failure-rolls-back-domain-result.json` does not demonstrate the contract catching a
violation; it demonstrates the contract refusing to let one be described.

---

## 8. Item 7 — index integrity and catalog state

| Check | Result |
|---|---|
| `index.json` untouched | **Confirmed.** All 14 rows compared field-by-field against Decision Register §5.2: `id`, `version`, `name`, `owner`, `status` match on every row. No `x-amended-by`, no CON-006 marker. Its `freeze_boundary` string is intact. |
| Both contracts `Draft` | **Confirmed.** `ctr-usg-001/manifest.json` → `Draft`; `ctr-ntf-001/manifest.json` → `Draft`. |
| Manifest owners match the index | **Confirmed.** CTR-USG-001 → `A0+A6`; CTR-NTF-001 → `A5`. Cross-checked across all 14 manifests: zero status or owner mismatches. |
| All 14 materialized | **Confirmed.** 14 `ctr-*` directories, each with `manifest.json` + `schema.json` + `examples/`. |
| Index still 4 Candidate / 10 Draft | **Confirmed.** `{"Candidate":4,"Draft":10}`, total 14. Materializing a Draft did not promote it. |
| Fixture count | **115** across the catalog, matching the Author's figure. |
| `npm run check` | `0`, 116/116, **skipped 0, todo 0**. |

Item 7 passes in full.

### Fixture coverage, measured

The Author correctly noted that first-pass conformance says nothing about coverage and that
no one had measured it here. Measured, over valid fixtures only:

| Enum | Exercised | Unexercised |
|---|---|---|
| `usg.dimension` | 2/6 | `research_search`, `egress_bytes`, `media_processing`, `publish_operation` |
| `usg.quantity.unit` | 2/5 | `request`, `second`, `operation` |
| `usg.cost.currency` | 1/2 | `USD` |
| `usg.cost.basis` | 2/3 | **`list_price`** |
| `ntf.kind` | 2/2 | — |
| `ntf.channel` | 1/3 | **`email`, `line`** |
| `ntf.locale` | 1/1 | — |
| `ntf.delivery.state` | 3/4 | `queued` |
| `ntf.delivery.failure_class` | 1/2 | `permanent` |

The unexercised values correlate with the sourcing findings: `list_price` (C-1, invented),
three of five `unit` values (C-2, invented), and both declared-inference channels (C-4).
Every value this review found unsourced is also a value no fixture demonstrates.

Two further coverage gaps:

- `invalid-float-cost.json` uses `"0.0425e-1"` — a **string** in exponent notation, caught by
  `pattern`. The genuinely dangerous case, `"amount": 0.0425` as a bare **JSON number**, is
  caught by `type` but no fixture exercises it. Given that "money is never a number" is the
  package's headline acceptance criterion, that is the negative case it most needed.
- `invalid-deep-link-public-url.json` covers one bypass (`https://…`). The other fourteen
  strings in the CTR-IDM-001/CTR-JOB-001 bypass corpus are unexercised by fixture. The pattern
  rejects all of them (this review verified it directly), so the rule is correct — but the
  package's fixtures do not demonstrate the property its `x-source` claims to inherit.

### Two dangling declarations

- `ctr-ntf-001/manifest.json` lists **`K MK-006`** in `source_references`. `MK-006` appears
  nowhere in `ctr-ntf-001/schema.json` and in no rule. The id is real and the section letter is
  right; nothing derives from it.
- `WP-0A-CON-006.json` `inputs.files` lists
  `docs/plans/meta-security-production-ops-workstream-th.md`. No rule in either contract cites
  it.

### Contract Artifact Standard (§5.5) — catalog-wide, not this package's to fix

§5.5 requires `manifest.yaml`, `compatibility.md`, `security-privacy.md`, `changelog.md` and
`tests/` per contract; the catalog ships `manifest.json` and none of the rest. Pre-existing and
uniform across all 14 — noted for the record, **not charged to this package**. §5.5's
ข้อบังคับ also requires every async contract to carry **retry/error and retention**; neither new
contract carries a retention field or a `$ref` to CTR-ERR-001. Arguably out of Draft scope, but
it belongs in the owners' ratification checklist.

---

## 9. Findings summary

**Blocking**

| Id | Finding |
|---|---|
| **B-1** | **C-12** — the CTR-USG-001 `estimated` `allOf` is a demonstrated no-op: its `then` is a subset of the base schema's unconditional requirements, so no document exists that it rejects. Its `x-rule` states a substantive OB-008 requirement. Verified empirically. |
| **B-2** | **C-2** — `quantity.unit`, a five-value enum, ships with **no x-source at all**. `request`, `second`, `operation` appear in no cited baseline. |
| **B-3** | **C-6** — `delivery.state`, a four-value enum, ships with no x-source covering it; `suppressed_duplicate` is an undeclared inference from ID-005. |
| **B-4** | **C-1** — `cost.basis: list_price` is unsourced and contradicts the package's own `scope.exclude` ("the provider price list"). The Author's own inference yields two values; the enum has three. |
| **B-5** | **U-1** — `notification_id` ships with no `x-source`, the only such property, reintroducing the exact defect CTR-OBS-001's `trace_id` records as corrected, and falsifying the same acceptance criterion. |
| **B-6** | **Item 6** — `domain_result_rolled_back: const false` is a category error: it makes the truthful report of a PT-007 violation schema-invalid, suppressing the only signal of it. §4.2 MOD-100's ห้ามทำ already places this prohibition on A5's module. |
| **B-7** | **Item 4** — CTR-NTF-001, owned solely by A5, was authored by A0 contrary to §4.1 ("owner has the right to propose") and §4.3 ("producer submits proposal+fixture; A0 assigns version"). Graded **High**, consistent with the CTR-MOD-001/CTR-SEC-001 precedent and larger in scope. The "14 of 14 complete" claim must not stand on it. |

**Required changes, non-blocking on their own**

| Id | Finding |
|---|---|
| **N-1** | **C-8** — `metric_labels` belongs to CTR-OBS-001's charter per §5.2, not CTR-USG-001's; and the "same reason CTR-EVT-001 holds payload empty" parity is false (EVT's field is required, this one optional and therefore inert). U-2. |
| **N-2** | **U-3** — `forbidden_paths_note` is copied byte-identically from CON-004 and its stated rationale ("this package materializes the secret-handle contract itself") is false here; two secret-related globs were dropped on it. |
| **N-3** | **C-3** — `locale` hardened from §3.1's "default" to an exclusive enum, undeclared. |
| **N-4** | **§3** — the "MOD-130 forbids float ∴ decimal STRING" step is an undeclared inference; and the claim that `quantity` follows "the same reason" as money is contradicted by the two patterns' different shapes. The negative sign permitted on `cost.amount` is unsourced. |
| **N-5** | **C-9** — `invalid-metric-label-carries-content.json` is misnamed: it demonstrates rejecting any label, not a label carrying content. |
| **N-6** | **C-5** — `message_key` drops CTR-OBS-001 `reason_key`'s `maxLength` bound and excludes digits. |
| **N-7** | **Citation 1** — "these six values are that list and nothing else" is not true of the renamed enum; **citation 8** — ID-002 does not require the produced event to carry a `dedupe_key` (§5.5 does, verbatim, and is the citation that should have been used). |
| **N-8** | Dangling declarations: `MK-006` in `ctr-ntf-001` `source_references` and the meta-security workstream in `inputs.files`, neither used. |
| **N-9** | Coverage: no fixture exercises a bare JSON **number** cost — the package's headline rule; and `list_price`, `email`, `line`, `USD`, `permanent`, `queued` and 4/6 dimensions are unexercised. |

**Credited without qualification**

- The reference allow-list grammar is carried forward **byte-identically** from the corrected
  CTR-IDM-001 / CTR-JOB-001 form and rejects the entire demonstrated bypass corpus. No
  deny-list form is reintroduced anywhere.
- **No non-existent task id, and no miscited section letter** — a clean result after three
  packages that each carried some.
- `index.json` is untouched and faithful to §5.2 on all 14 rows; both contracts are `Draft`;
  4 Candidate / 10 Draft holds; `npm run check` is `0` with skipped and todo both zero.
- All three CTR-NTF-001 `allOf` branches were checked and are each load-bearing.
- The `untestable_by_fixture` / `untestable_by_schema` declarations are honest and accurate,
  and the self-check's refusal to claim coverage it did not measure is the right instinct.

---

VERDICT: changes_requested
