# WP-0A-CON-006 — Independent contract review at real head

Reviewer run: `/claude/c0_contract_reviewer` (Anthropic, `claude-opus-5`)
Delta reviewed: `5c6eef2..337dfe7` — the two commits shipped **after** the reviewed
commit, neither of which carried independent evidence.
Working copy: frozen extraction of `337dfe7` at
`/private/tmp/claude-501/-Users-bank-ThinkBizThai/cb23f394-422b-4ec3-b024-e2751f208eb9/scratchpad/head-con006`.
`/Users/bank/ThinkBizThai` was neither read nor written. Destructive probes were run
on separate copies (`probe1`, `probe2`, `probe3`).

**This is independent Reviewer evidence only.** It is not security review, test
verification, integration, Product Owner disposition, or merge approval, and it does
not move Gate G0.

---

## 1. Commands executed, with real exit codes

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `node --version` | `0` | `v24.20.0` (pinned) |
| 2 | `npm run check` | `0` | `tests 117 / pass 117 / fail 0 / skipped 0 / todo 0` |
| 3 | `node --test test-kits/contracts/schema-mutation-coverage.test.mjs` | `0` | 3/3 pass, `269 ms` wall |
| 4 | `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| 5 | Per-contract mutation-coverage recomputation (reviewer script, `constraintSites`/`without`/`verdicts` copied verbatim from the shipped test) | `0` | table in §4 |
| 6 | Per-fixture fault audit against each shipped schema | `0` | table in §6 |
| 7 | **probe1** — delete `type` + `minLength` from three optional ids in `ctr-ten-001`, then `npm run check` | `0` | coverage **rose** 32.4 % → **39.3 %**, check still green |
| 8 | **probe2** — add four wholly unconstrained properties to `ctr-ten-001` and populate them in the valid fixture, then `npm run check` | `0` | coverage **rose** 32.4 % → **39.5 %**, check still green |
| 9 | **probe3** — declare `test-kits/contracts/schema-mutation-coverage.test.mjs` in `WP-0A-CON-006.outputs.files`, then run the ownership validator | **`68`** | `work package WP-0A-CON-006 output is outside writable_paths` |
| 10 | `npm run check` after removing all reviewer scratch scripts | `0` | tree left as extracted |

---

## 2. Disposition of the previous round's findings

### Blocking

| Id | Finding | Disposition |
|---|---|---|
| **B-1** | CTR-USG-001 `estimated` `allOf` is a demonstrated no-op | **Closed structurally, replaced by new unreviewed design.** Deleting the whole `allOf` now flips `invalid-reported-without-supersedes.json` — the rule constrains something. See §3 for the review of what replaced it, and §5 for the damage it did elsewhere. |
| **B-2** | `quantity.unit` ships with no `x-source` | **Closed.** An `x-source` was added and correctly self-labels `request` and `operation` as "this contract's own terms". |
| **B-3** | `delivery.state` ships with no `x-source` | **Closed.** `x-source` added, `suppressed_duplicate` declared as an ID-005 inference. |
| **B-4** | `cost.basis: list_price` unsourced and contradicts `scope.exclude` | **Closed in the schema, not in the corpus.** The enum is now two values. But `examples/invalid-float-cost.json` still ships `"basis": "list_price"` (§6). |
| **B-5** | `notification_id` unsourced | **Closed.** Declared inference added, and it names the CTR-OBS-001 `trace_id` precedent. |
| **B-6** | `domain_result_rolled_back: const false` is a category error | **Closed in the schema; the prose that justified it was not retracted.** The const is gone and `delivery.x-source` records why. The citation is **verified correct**: `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md` line 159, MOD-100's ห้ามทำ column, reads `roll back domain result on delivery failure`. **However** `ctr-ntf-001/manifest.json` `untestable_by_fixture` still reads "the const false records the prohibition, it does not prove the domain result survived" — describing a construct that no longer exists, in the field whose whole purpose is an honest declaration. And `WP-0A-CON-006.json` `scope.include`, `acceptance_criteria[3]`, `required_tests[2]` and `outputs.files` all still assert the removed const and the deleted fixture (§7). |
| **B-7** | CTR-NTF-001 authored by a non-owner | **Accepted, not resolved — correctly.** Recorded in `open_blockers` in the terms this review used, including the harm to the "14 of 14" headline. This is the right disposition; it stays open. |

### Non-blocking

| Id | Disposition |
|---|---|
| **N-1** `metric_labels` misplaced | **Closed.** Removed; the reason is in `freeze_boundary`. But `open_blockers` still carries "metric_labels is held at maxProperties 0 …" for a property that no longer exists. |
| **N-2** `forbidden_paths_note` copied from CON-004 with a false rationale | **NOT CLOSED — restated verbatim.** The note still reads "This package materializes the secret-handle contract itself, so files named for secret handling are its declared outputs: `contract-catalog/shared-kernel/ctr-sec-001/**` …". CON-006 materializes CTR-USG-001 and CTR-NTF-001. It does not own, write, or output `ctr-sec-001/**`. Two secret-related globs remain dropped on a rationale that is false for this package. |
| **N-3** `locale` hardened undeclared | **Closed.** `x-source` now states the hardening and why. |
| **N-4** money inferences and the negative sign | **Partly closed; a new incorrect rationale introduced.** See §4. |
| **N-5** `invalid-metric-label-carries-content.json` misnamed | **Closed by deletion** (still listed in `outputs.files`, §7). |
| **N-6** `message_key` drops `maxLength` | **NOT CLOSED.** `message_key` is still `pattern` only, unbounded. |
| **N-7** citation defects | **Partly closed.** `Decision Register 5.2 CTR-USG-001 row: decimal money` was added to `source_references` and is **verified** at line 205. The `dimension` `x-source` now concedes the renaming. The `dedupe_key` `x-source` still attributes the carried-key obligation to **ID-002**; §5.5 is the clause that states it. |
| **N-8** dangling declarations | **NOT CLOSED.** `ctr-ntf-001/manifest.json` `source_references` still lists `K MK-006`; no `x-source` in the shipped schema cites it. `docs/plans/meta-security-production-ops-workstream-th.md` is still in `inputs.files` and is cited by nothing. |
| **N-9** unexercised values | **Partly closed, and made worse in two places.** See §5. |

**Summary: three blocking findings closed cleanly (B-2, B-3, B-5), two closed in the
schema but with the superseded prose left standing (B-4, B-6), one closed and replaced
by unreviewed design (B-1), one correctly held open (B-7). Two non-blocking findings
(N-2, N-6, N-8) were not acted on at all, and N-2 is the second package in a row to
ship that same false rationale.**

---

## 3. The replacement rule on CTR-USG-001

```json
"if":   { "properties": { "cost": { "properties": { "basis": { "const": "provider_reported" } },
                                    "required": ["basis"] } }, "required": ["cost"] },
"then": { "properties": { "cost": { "required": ["amount","currency","basis","supersedes_usage_id"] } } }
```

**Sourcing.** `supersedes_usage_id.x-source` says "DECLARED INFERENCE from OB-008; the
task does not name the field." That is an honest declaration and it is the right form.
No finding on sourcing.

**Is it another no-op? No — but it is much weaker than its prose implies.**

It is structurally non-vacuous, and that is a genuine improvement on what it replaced:
`cost.required` is `[amount, currency, basis]`, so adding a fourth name in the `then`
branch rejects documents the base schema accepts. Deleting the whole `allOf` flips a
fixture verdict (verified). The B-1 defect class is not repeated.

But everything the `x-rule` gestures at — "cannot be reconciled without double
counting" — is outside what this rule does. Probed directly against the shipped schema:

| Probe | Result |
|---|---|
| `supersedes_usage_id` equal to the document's own `usage_id` (an event superseding itself) | **ACCEPTED** |
| `supersedes_usage_id` = `"there-is-no-such-event"` (dangling reference) | **ACCEPTED** |
| Two distinct reported events superseding the same estimate | **ACCEPTED (both)** |
| An `estimated` cost carrying `supersedes_usage_id` | **ACCEPTED** |

Three of those are unreachable by JSON Schema and are correctly out of scope for a
single-document contract — but the contract does not say so. `untestable_by_schema`
declares only "that a cost figure is arithmetically correct for its quantity"; it does
not declare that the supersession reference is unverifiable, non-unique, and may point
at the document itself. The rule that replaced a no-op whose prose overclaimed has
prose that overclaims in the same direction, one step further along. **The honest
statement is: this rule makes the pointer mandatory so that a reconciler has something
to follow; it does not prevent double counting, and nothing in this repository does.**
Self-supersession is the one hole that *is* reachable — not by JSON Schema, but by a
`not`/`if` construct or by the conformance suite — and it is not closed.

**A design defect the rule introduces, which is blocking on its own.** The rule makes
`supersedes_usage_id` **mandatory on every** `provider_reported` cost. A provider
statement that reports a cost for which no estimate was ever emitted — the ordinary
case for any usage the estimator did not see, and the exact case OB-008 exists to
surface as *missing* usage — now cannot be expressed. The producer's only options are
to withhold the event or to fabricate a reference, and §3's probe shows a fabricated
reference is accepted. **A rule that forces a fabricated identifier in a legitimate case
is worse than the no-op it replaced**, because the no-op at least did not corrupt the
data. The correct shape is conditional on supersession occurring, not on `basis`.

**Finding H-1 (blocking).** `supersedes_usage_id` required unconditionally on
`provider_reported` makes a first-report-without-prior-estimate inexpressible and
pressures producers toward a fabricated reference the schema accepts. Either scope the
requirement to the supersession case, or state in `untestable_by_schema` that the
reference is unverified, non-unique and may be self-referential.

---

## 4. The money patterns

```
cost.amount     ^(0|[1-9][0-9]{0,15})\.[0-9]{2,8}$
quantity.amount ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
```

**The negative sign is gone.** N-4's one substantive half is closed, and the reasoning
recorded on it — NG-006, OPEN-001, BILL-DEC-013 Proposed — is correct and is the right
reason. Credited without qualification.

**The leading-zero exclusion excludes no legitimate value.** `0.00`, `0.50`, `0.000001`
and `0` (quantity) all match; only redundant spellings such as `00.50` are excluded.
Closed.

**The 16-digit bound's stated justification is factually wrong, twice.**
`cost.amount.x-source` reads: "The integer part is bounded at 16 digits so a value the
contract calls valid cannot exceed IEEE-754 exact range."

| Check | Result |
|---|---|
| `Number.MAX_SAFE_INTEGER` | `9007199254740991` — itself **16 digits** |
| `"9999999999999999.00"` matches the pattern | **true** |
| `Number("9999999999999999")` | `10000000000000000` — **not exact** |
| `Number("9007199254740993")` | `9007199254740992` — **not exact**, and matches |

The bound admits values above `2^53−1`, so it does not do the thing it claims. The
correct bound for that claim is 15 digits (`[1-9][0-9]{0,14}`).

The second error is more fundamental: the property is a **decimal string with a
mandatory fractional part**, so its value is essentially never an exact double
regardless of magnitude — `Number("1.10")` is `1.1`, which does not round-trip. Exact
IEEE-754 representability is not a property this pattern can bound and is not the
property MOD-130 is about. MOD-130 (verified, line 162, A6's `usage-billing-entitlement`
ห้ามทำ column) forbids using floating point for money; it says nothing about a maximum.

**Finding H-2 (blocking).** A magnitude cap on money was invented in the fix for the
invented-rules finding, it is unsourced, and its stated justification is arithmetically
false. This is the same defect class as B-2/B-3/B-4, reintroduced by the correction to
them. Either drop the bound, or bound it at 15 digits and state the real reason
(bounding what a consumer may have to parse), declared as an inference.

**The fractional asymmetry is now defensible but still undeclared.** `cost.amount`
demands 2–8 fraction digits; `quantity.amount` allows 0–8. Money has a minor unit and a
token count does not — a good reason, and it is nowhere written. `quantity.amount`'s
`x-source` says only "Bounded and leading-zero-free on the same grounds as cost.amount",
which addresses precisely the two respects in which the patterns **agree** and is silent
on the two in which they **differ**. Downgraded from N-4's "accidental" to *undeclared*,
and it stays open.

---

## 5. The mutation-coverage floor — the most consequential new code

`test-kits/contracts/schema-mutation-coverage.test.mjs`, `COVERAGE_FLOOR = 0.30`.

### 5.1 What the tree actually scores

Recomputed with the shipped `constraintSites` / `without` / `verdicts` logic copied
verbatim:

| Contract | killed / sites | ratio | margin over 30 % | sites of slack before it fails |
|---|---|---|---|---|
| **ctr-ten-001** | 11/34 | **32.4 %** | **+2.4 pp** | **1** |
| ctr-err-001 | 11/33 | 33.3 % | +3.3 pp | 2 |
| ctr-job-001 | 23/68 | 33.8 % | +3.8 pp | 3 |
| ctr-evt-001 | 24/64 | 37.5 % | +7.5 pp | 5 |
| ctr-mod-001 | 49/130 | 37.7 % | +7.7 pp | 10 |
| ctr-aud-001 | 38/92 | 41.3 % | +11.3 pp | 11 |
| ctr-usg-001 | 26/62 | 41.9 % | +11.9 pp | 8 |
| ctr-obs-001 | 53/126 | 42.1 % | +12.1 pp | 16 |
| ctr-api-001 | 24/53 | 45.3 % | +15.3 pp | 9 |
| ctr-sec-001 | 54/118 | 45.8 % | +15.8 pp | 19 |
| ctr-pag-001 | 25/53 | 47.2 % | +17.2 pp | 10 |
| ctr-flg-001 | 55/116 | 47.4 % | +17.4 pp | 20 |
| ctr-idm-001 | 26/50 | 52.0 % | +22.0 pp | 11 |
| ctr-ntf-001 | 36/60 | 60.0 % | +30.0 pp | 18 |

Catalog aggregate 455/1059 = 43.0 %; mean of ratios 42.7 %. The Author's reported
"42.4 % / weakest 32.4 %" reproduces. **The reported numbers are honest and I could
reproduce them exactly. Credited.**

**Was the floor set to bite or to pass? To pass.** It fails nothing. The weakest
contract clears it by **one killed site**. The Author disclosed this in `open_blockers`
("a floor, not a target … the weakest contract at 32.4 %; raising the floor is cheap"),
and that disclosure is to its credit and is why this is not itself the blocking
finding. But a floor calibrated to sit just under whatever the tree happened to measure
has exactly one function: preventing regression. §5.3 shows it does not do that either.

### 5.2 `constraintSites` is not counting constraints

**It counts bare property names.** `properties` is in the structural exclusion set, so
`properties` itself is not a site — but the recursion then pushes every key *inside* it,
i.e. every property **name**. Under `additionalProperties: false`, deleting
`properties.foo` makes any document containing `foo` invalid, so every property a valid
fixture populates is an **automatic kill that measures nothing**. Stripping those:

| Contract | headline ratio | ratio excluding property-name sites |
|---|---|---|
| ctr-ten-001 | 32.4 % | **2.9 %** |
| ctr-err-001 | 33.3 % | **3.0 %** |
| ctr-obs-001 | 42.1 % | 7.9 % |
| ctr-mod-001 | 37.7 % | 8.5 % |
| ctr-usg-001 | 41.9 % | 9.7 % |
| ctr-ntf-001 | 60.0 % | 25.0 % |

Between 55 % and 91 % of every contract's "kills" are this artifact. Nine of fourteen
contracts are under 15 % on real constraint keywords. **The metric's headline is
dominated by a quantity that is not a measure of enforcement.**

**It counts sites that are unobservable by construction.** `constraintSites` skips keys
beginning `x-` but **recurses into their values**. `ctr-evt-001` and `ctr-job-001` carry
`x-amended-by` as an object/array of objects, contributing **5** and **10** permanently
unkillable sites — the validator ignores `x-*`, so no mutation inside them can ever flip
a verdict. Excluding them, `ctr-evt-001` is 24/59 = 40.7 % and `ctr-job-001` is
23/58 = 39.7 %, not 37.5 % and 33.8 %. **The amendment-provenance marker this session
introduced silently deflates the coverage of the two contracts it was applied to, and
`ctr-job-001` — 3 sites from failing — is the contract most affected.** Any future `x-`
annotation with an object value does the same.

**It misses a class.** A property literally named after a structural or metadata keyword
is invisible to the counter. `ctr-pag-001` has `properties.items`; that site is dropped
from both numerator and denominator. Property names `properties`, `if`, `then`, `else`,
`not`, `allOf`, `anyOf`, `oneOf`, `title`, `description`, `$id`, `$schema` would behave
the same.

**Finding H-3 (blocking).** `constraintSites` conflates property declarations with
constraints, counts `x-` annotation internals as constraints, and drops properties whose
names collide with keywords. A floor computed on it does not measure what its own
comment says it measures.

### 5.3 The floor can be satisfied by weakening the contract — both ways

**probe1 — deleting real rules raises the score.** On a copy, I deleted `type` and
`minLength` from `ctr-ten-001`'s three optional identifiers (`business_profile_id`,
`page_context_profile_id`, `causation_id`) — six genuine constraints that no fixture
exercises. The contract now accepts an empty string, a number, an object or `null` in
all three.

```
before: ctr-ten-001  11/34  32.4 %
after:  ctr-ten-001  11/28  39.3 %      npm run check → exit 0
```

**+6.9 pp for making the contract strictly weaker, with CI green.**

**probe2 — adding nothing raises the score.** On a fresh copy I added four properties to
`ctr-ten-001` with **empty schemas** (`"pad1": {}`) and populated them in the valid
fixture. Each contributes one site and one automatic kill.

```
before: ctr-ten-001  11/34  32.4 %
after:  ctr-ten-001  15/38  39.5 %      npm run check → exit 0
```

**+7.1 pp for four properties that constrain nothing** — and which, under
`additionalProperties: false`, widen what the contract accepts.

**Finding H-4 (blocking).** The floor is gameable in both directions, and both cheapest
routes to raising it weaken the contract. A metric whose gradient points away from the
property it exists to protect should not be a merge gate. The concrete guidance: count
only constraint **keywords** (never property names), exclude everything under an `x-`
key, and pair the ratio with an absolute floor on killed constraint keywords so
deletion cannot help.

### 5.4 It already misfired on this package's own contract

The floor did not merely fail to bite — the work done to clear it destroyed coverage of
the two rules CTR-USG-001's own `freeze_boundary` says it "materializes exactly". The
new `supersedes_usage_id` requirement double-faults two pre-existing negative fixtures,
so their single-fault character is gone:

| Fixture | faults now |
|---|---|
| `invalid-unknown-dimension.json` | `dimension` not in enum **;; `cost` missing `supersedes_usage_id`** |
| `invalid-missing-provider-attribution.json` | `attribution` missing `provider_key` **;; `cost` missing `supersedes_usage_id`** |

Direct mutation of the shipped schema:

```
SURVIVES (no fixture detects it)   DELETE properties.dimension.enum        ← OB-004's six dimensions
SURVIVES (no fixture detects it)   DELETE properties.attribution.required  ← OB-004's acceptance criterion
SURVIVES (no fixture detects it)   DELETE properties.cost.properties.basis.enum
SURVIVES (no fixture detects it)   DELETE properties.quantity.properties.unit.enum
killed                             DELETE the entire supersedes allOf
```

**The two rules the contract exists to state are now tested by nothing**, and
`PROTECTED` — which gained ten entries in this delta — protects neither of them. It
protects `cost.amount.pattern`, `quantity.amount.pattern`, `cost.currency.enum` and root
`required`, and points away from `dimension.enum` and `attribution.required`. Meanwhile
CTR-USG-001's headline moved 7.0 % → 41.9 %. **That is the failure mode in §5.3
happening for real, in this delta, on this package's own contract.**

**Finding H-5 (blocking).** Add `['ctr-usg-001', ['properties','dimension','enum']]` and
`['ctr-usg-001', ['properties','attribution','required']]` to `PROTECTED` and split the
two double-faulted fixtures so each carries one fault.

### 5.5 Runtime

`node --test schema-mutation-coverage.test.mjs` → 269 ms for 14 contracts, ~1059
mutations, ~135 fixtures. Cost is `Σ_c (sites_c × fixtures_c)` full validations. Linear
in contract count, quadratic in per-contract size × corpus size. At 100 contracts of
this shape it is seconds, not minutes. **Acceptable; no finding.** Worth noting only
that adding fixtures to a contract raises its own mutation cost, so the incentive the
floor creates also inflates the guard's own runtime.

---

## 6. The fourteen fixtures added to `ctr-evt-001` and `ctr-job-001`

Both are `Candidate`, owner `A0`, and belong to WP-0A-CON-001. The amendment is declared
at `WP-0A-CON-006.ownership.authorized_cross_package_amendments[1]`: "ADD negative
fixtures only, and declare them in each manifest. No schema, version, status or
freeze-level change. … **Adding a counterexample cannot weaken a contract; it can only
make an existing rule observable.**"

**Verified factually.** Each contract went 3 → 10 fixtures (7 + 7 = 14). Both schemas
still carry `x-amended-by` entries for WP-0A-CON-002 and WP-0A-CON-005 only — no schema
change was made by this package. `status: Candidate`, `version: 1.0.0` unchanged in both
manifests and matching `index.json`. Every added fixture is `invalid-*`, and I audited
each one's actual fault against the shipped schema: **all fourteen are single-fault and
every one fails for exactly the reason its filename claims.** That is materially better
fixture craft than this catalog's history, and it is credited.

**Ruling on the claim.** "Adding a counterexample cannot weaken a contract" is **true as
stated but too broad to carry the amendment on its own.** A fixture does not change the
accepted-document set, so the *contract* is not weakened. But `manifest.fixtures` is not
inert: it is the declared conformance corpus, it is the denominator-and-numerator of the
mutation floor, and for a `Candidate` contract it is part of `required_before_freeze`.
Three consequences the claim does not cover:

1. **A miscarried counterexample entrenches a false belief.** A fixture named for one
   fault that fails for another asserts a guarantee the contract does not give. That is
   N-5 from the previous round, and §5.4 shows the same mechanism operating in this very
   delta — where the harm was caused not by an added fixture but by a schema rule
   double-faulting existing ones.
2. **These fixtures were added to clear a floor this same package invented.** The
   amendment text says so: "Both sat below the new per-contract mutation-coverage floor
   at 26.6 % and 25.0 %". A package setting a threshold and then amending another
   package's Candidate artifacts to clear it is a conflict of interest, whatever the
   neutrality of each individual file.
3. **Neutrality was asserted, not proved.** My prior ruling was that the RFC path carries
   for a `Candidate` contract **only with independent structural proof of neutrality**.
   No RFC is cited for this amendment (contrast entries for CON-002 and CON-005, which
   each name one), no `x-amended-by` entry was added recording it, and no proof of
   neutrality was produced by the Author.

**I have now performed that structural proof myself and it passes** — schemas unchanged,
statuses and versions unchanged, all fourteen additions negative and single-fault. So the
amendment is **substantively neutral** and I do not require the fixtures to be reverted.
But it was shipped without the proof, on a general claim rather than on evidence, to a
contract this package does not own, and it is **not** covered by the RFC precedent it
leans on.

**Finding H-6 (approval condition).** Record the amendment in each contract's
`x-amended-by` alongside the CON-002 and CON-005 entries, cite a decision record, and
carry `/root/r0_steward`'s acknowledgement as the two existing entries do. Neutrality is
established by this review; provenance is not.

---

## 7. Cross-package writes and manifest integrity — the finding that decides the verdict

`WP-0A-CON-006.ownership.read_only_paths` includes `"test-kits/**"`.
`authorized_cross_package_amendments` carves out exactly three things: recomputing
`test-kits/integrity-manifest.json` digests, the `ctr-evt-001`/`ctr-job-001` fixtures,
and `test-kits/contracts/shared-kernel-contract-catalog.test.mjs`.

**`test-kits/contracts/schema-mutation-coverage.test.mjs` is not on that list.** It is
`WP-0A-CON-003`'s sole declared output and sits in **CON-003's** `writable_paths`. This
delta rewrote it: ten new `PROTECTED` entries, the `COVERAGE_FLOOR` constant, the
`METADATA` set, `constraintSites`, and an entire new top-level test. `WP-0A-CON-006`'s
`acceptance_criteria[6]` claims that work ("Every contract in the catalog reaches a
per-contract mutation-coverage floor of 30 %"), so the authorship is not in doubt.

The control is declaration-based and was silent only because the write was left
undeclared. probe3 — adding the file to `WP-0A-CON-006.outputs.files` and nothing else:

```
work package WP-0A-CON-006 output is outside writable_paths:
  test-kits/contracts/schema-mutation-coverage.test.mjs
OWNERSHIP_EXIT=68
```

**The guard rejects this write the instant it is declared honestly. `npm run check` is
green only because the manifest does not admit the change.** This is the same
ship-past-the-control pattern an Integration Owner blocked this Author for earlier in
this session, relocated from commits into the ownership manifest.

**`outputs.files` no longer describes the delivery at all.** Two declared files were
deleted and fourteen shipped files are undeclared:

| Declared, absent from disk |
|---|
| `ctr-ntf-001/examples/invalid-failure-rolls-back-domain-result.json` |
| `ctr-usg-001/examples/invalid-metric-label-carries-content.json` |

| On disk, undeclared |
|---|
| `ctr-usg-001/examples/` — `invalid-cost-magnitude-past-exact-range`, `invalid-missing-dedupe-key`, `invalid-missing-tenant-context`, `invalid-negative-cost`, `invalid-quantity-leading-zero`, `invalid-reported-without-supersedes`, `invalid-unknown-currency` (7) |
| `ctr-ntf-001/examples/` — `invalid-command-without-deep-link`, `invalid-deep-link-omits-permission-flag`, `invalid-delivered-with-failure-class`, `invalid-failure-missing-class-only`, `invalid-missing-tenant-context`, `invalid-unknown-delivery-state`, `invalid-unsupported-locale` (7) |

And the narrative fields were not reworked with the schema: `scope.include` and
`acceptance_criteria[3]` still assert the removed `domain_result_rolled_back` const;
`required_tests[2]` still lists "a failure that rolls back the domain result" as a
required negative case; `open_blockers` still describes `metric_labels` at
`maxProperties: 0`.

**Finding H-7 (blocking).** An unauthorized write to another package's declared output,
inside a path this package's own manifest marks read-only, made invisible by an
`outputs.files` list that is stale in sixteen places. Either move
`schema-mutation-coverage.test.mjs` into an `authorized_cross_package_amendments` entry
with a decision record and CON-003's acknowledgement, or hand the change to CON-003 —
and reconcile `outputs.files`, `scope`, `acceptance_criteria`, `required_tests` and
`open_blockers` with what actually shipped.

---

## 8. `shared-kernel-contract-catalog.test.mjs` — is the amendment behaviour-preserving?

The change adds the shipped-schema verdict as a **conjunct** of the hand-written
predicate:

```js
const accepted = schemaValidate(schema, fixture, {...}).length === 0
  && validatesCandidateFixture(id, fixture);
assert.equal(accepted, !fixturePath.includes('/invalid-'));
```

**Yes, behaviour-preserving for the fixtures that already existed — proved by
construction, not just by a green run.** A conjunction is monotone: it can only turn
`accepted` from `true` to `false`. For `invalid-*` fixtures the expected value is
`false`, so an extra rejection cannot break an assertion that was passing. For `valid-*`
fixtures the expected value is `true`, so the amendment is safe exactly when the schema
also accepts them — which the pre-existing `shared-kernel-schema-conformance.test.mjs`
already required, and which the green run confirms. No pre-existing assertion changes
outcome. Confirmed empirically: I audited all 20 CTR-EVT-001/CTR-JOB-001 fixtures
against their shipped schemas and every `invalid-*` is rejected, every `valid-*`
accepted.

**One design observation, non-blocking.** A conjunction *hides* the divergence this suite
exists to detect. If the hand-written predicate later stops rejecting an `invalid-*`
fixture, the schema conjunct absorbs it and the test stays green — the predicate rots
silently, which is the failure mode the file's own comment describes. The form that
detects divergence asserts the two verdicts **equal each other** and equal the expected
value, rather than conjoining them. Worth doing when the file returns to its owner.

---

## 9. Catalog state

| Check | Result |
|---|---|
| `index.json` contracts | **14**, ids unique |
| Status split | **4 Candidate / 10 Draft** — TEN, ERR, EVT, JOB Candidate |
| Index vs every shipped `manifest.json` (status, version, owner) | **0 mismatches** |
| `catalog_version` / `source` | `1.0.0` / `…-th.md#5.2` — unchanged |
| Any contract promoted or version-bumped in this delta | **No** |
| `index.json` in `read_only_paths` and `scope.exclude` | Yes, and untouched — `sha256 505f7a59…5a1262` |
| CTR-USG-001 §5.2 row | verified verbatim at line 205, including `decimal money` |

Clean. No finding.

---

## 10. Additional defects found in the new work

| Id | Finding |
|---|---|
| **H-8** | `ctr-ntf-001/examples/invalid-failure-without-class.json` and `invalid-failure-missing-class-only.json` are **byte-identical** (`md5 f9991dcaf26e8764d92425261d59c90b` both). Two manifest entries, one document, one fault. The first presumably lost its distinguishing `domain_result_rolled_back` field when that const was removed and was not deleted. This pads the "16 fixtures" figure and the coverage denominators. |
| **H-9** | `ctr-usg-001/examples/invalid-float-cost.json` still ships `"basis": "list_price"` — a value **this delta removed from the enum as unsourced**. The fixture is double-faulted (amount pattern + basis enum), its name claims one fault, and it is the reason `cost.basis.enum` is killed by nothing (§5.4). |
| **H-10** | `ctr-ntf-001/manifest.json` `freeze_boundary` contains a duplicated clause: "Materializes exactly PT-007's channel-neutral command/result split, **its command/result split** (…)". Edit artifact in a freeze-boundary declaration. |

---

## 11. Credited without qualification

- The reference allow-list grammar is still carried byte-identically in CTR-NTF-001's
  `target_ref` and CTR-JOB-001's `input_ref`/`result_ref`; no deny-list form reappears.
- All fourteen fixtures added to CTR-EVT-001 and CTR-JOB-001 are single-fault and each
  fails for exactly its named reason. So are eleven of twelve CTR-NTF-001 negatives.
- The `deep_link.required` fix is correct and closes the fail-open hole exactly.
- The `domain_result_rolled_back` removal is correct, and the MOD-100 ห้ามทำ citation
  the Author adopted is **verified at line 159**. So is `§5.2 … decimal money` at line
  205 and MOD-130 at line 162.
- The negative-sign removal, and the NG-006 / OPEN-001 / BILL-DEC-013 reasoning behind
  it, are right.
- The coverage figures the Author reported (42.4 % catalog, 32.4 % weakest, 40.0 % and
  57.1 % for the two contracts) **reproduce**. The `open_blockers` entry conceding that
  the floor is below the weakest contract and should be raised is the honest disclosure
  it appears to be, and it is why H-4 rather than the floor's calibration is the
  blocking finding.
- The B-7 ownership ruling was accepted in full and correctly qualified in
  `open_blockers` rather than argued down.
- `npm run check` is `0` with `skipped` and `todo` both zero, on pinned Node 24.20.0.

---

## 12. Findings summary

**Blocking**

| Id | Finding |
|---|---|
| **H-7** | Unauthorized write to `test-kits/contracts/schema-mutation-coverage.test.mjs` — CON-003's declared output, inside CON-006's own `read_only_paths`, absent from `authorized_cross_package_amendments`. The ownership guard rejects it with exit 68 the moment it is declared. `outputs.files` is stale in 16 places, and `scope`, `acceptance_criteria`, `required_tests` and `open_blockers` still describe removed constructs. |
| **H-4** | The 30 % floor is gameable in both directions and both cheapest routes weaken the contract: deleting six untested rules from `ctr-ten-001` raised it 32.4 % → 39.3 %; adding four zero-constraint properties raised it 32.4 % → 39.5 %. `npm run check` green in both. |
| **H-3** | `constraintSites` counts property names (55–91 % of all kills), counts `x-amended-by` internals that are unobservable by construction (5 and 10 permanently dead sites in `ctr-evt-001` / `ctr-job-001`), and drops properties whose names collide with keywords (`ctr-pag-001.properties.items`). |
| **H-5** | Clearing the floor destroyed coverage of the two rules CTR-USG-001's `freeze_boundary` says it materializes exactly: `dimension.enum` and `attribution.required` are now killed by **nothing**, because the new supersedes rule double-faults the only fixtures that tested them. Neither is in `PROTECTED`. |
| **H-1** | `supersedes_usage_id` required unconditionally on every `provider_reported` cost makes a first report with no prior estimate inexpressible and pressures producers toward a fabricated reference the schema accepts. |
| **H-2** | The 16-digit money bound is unsourced and its stated justification is false: `MAX_SAFE_INTEGER` is itself 16 digits, `"9999999999999999.00"` matches and parses to `10000000000000000`, and a value with a mandatory fraction is never an exact double anyway. |
| **N-2 (carried)** | `forbidden_paths_note` still claims "This package materializes the secret-handle contract itself" — false for CON-006 — and two secret globs remain dropped on it. **Restated verbatim, not fixed.** |

**Required, non-blocking**

| Id | Finding |
|---|---|
| **H-6** | The CTR-EVT-001 / CTR-JOB-001 amendment is substantively neutral (proved in §6) but shipped without that proof, without an `x-amended-by` entry, without a decision record, and to clear a floor this same package invented. Record provenance. |
| **H-8** | Two byte-identical CTR-NTF-001 fixtures. |
| **H-9** | `invalid-float-cost.json` still carries the removed `list_price` value and double-faults, leaving `cost.basis.enum` untested. |
| **H-10** | Duplicated clause in CTR-NTF-001's `freeze_boundary`. |
| **§3** | The supersedes reference is unverifiable, non-unique and may be self-referential; none of that is in `untestable_by_schema`. |
| **§4** | The cost/quantity fractional asymmetry is defensible and undeclared. |
| **§8** | The conjunction in `shared-kernel-contract-catalog.test.mjs` hides predicate/schema divergence rather than surfacing it; assert equality of the two verdicts. |
| **N-6, N-8 (carried)** | `message_key` still unbounded; `K MK-006` and the meta-security workstream input are still declared and unused. |

---

VERDICT: changes_requested
