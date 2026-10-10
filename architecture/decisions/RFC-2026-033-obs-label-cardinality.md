# RFC-2026-033: CTR-OBS-001 label cardinality — closed lists and a budget per label

Status: **Accepted on 2026-10-10.** The Product Owner answered Q-033-1 to Q-033-4 himself on 2026-10-10, each
with the option A0 recommended
(`evidence/WP-0A-CON-004/product-owner-disposition-2026-10-10-rfc033-answers.md`). That meets the condition of item 3
of `evidence/WP-0A-CON-008/product-owner-disposition-2026-10-09-three-governance-prs.md` (C0-239-2, A1-239-1). A6, as
observability co-owner, signed §2, the §4.1 numbers, §4.2 and §5 to §7 in
`evidence/WP-0A-CON-004/a6-rfc033-reading-2026-10-09.md` (head `c3039031`), and §2 to §4 as amended in
`evidence/WP-0A-CON-004/a6-rfc033-reread-2026-10-09.md` (head `a77b8a66`); A6's amendments A-1 to A-7 are applied.
The role files, in `evidence/WP-0A-CON-004/`: C0 `c0-review-2026-10-09-pr239.md` (`c3039031`) and
`c0-reread-2026-10-09-pr239.md` (`a77b8a66`); A1 `a1-review-2026-10-09-pr239.md` (`c3039031`) and
`a1-reread-2026-10-09-pr239.md` (`a77b8a66`); R0 `r0-review-2026-10-09-pr239.md` (`c3039031`) and
`r0-reread-2026-10-09-pr239.md` (`a77b8a66`). Q0 has not yet read PR #239. Before the press: the roles' re-reads of the
commit carrying the Owner's answers and of this commit (Q0's as a full run), A6's re-read of this commit, and CI green
on the exact head (`r0-reread-2026-10-09-pr239.md` §4, §5).
Date: 2026-10-09
Author: `/claude/a0_atlas` (A0, owner of CTR-OBS-001 and of CTR-ERR-001), as an increment of `WP-0A-CON-004`
Owner: A0 with A6 (`/claude/a6_relay`) as observability co-owner of CTR-OBS-001 (index `owner` "A0+A6"), on the Product
Owner's disposition
Protocol version: `1.0.0`
Answers: `WP-0A-CON-004` `open_blockers[4]` (OB-006 bounded cardinality, accepted gap
`examples/accepted-gap-unbounded-error-code-label.json`); the CTR-OBS-001 index `required_before_freeze` item "bounded
cardinality"; A6's freeze position in `evidence/WP-0A-CON-004/a6-candidate-signature-2026-10-09.md` §6 (CTR-OBS-001 row
`[4]`: "Must be closed, cannot be declared"); the A6 entry of `required_human_authorities` ("the OB-006 per-label value
budget and vocabulary").
Decides, once accepted: the closed value list of `sli_tags.error_code` and of `sli_tags.outcome`; a numeric budget for
every label CTR-OBS-001 lets a module put on a metric or index in a log; who may add an entry to a list or raise a
budget; how the budget is enforced; and the breaking-change classification under RFC-2026-031 §3.3.
Who merges: this is a governance PR (RFC-2026-025 §5 item 6). The Owner named it, by content, as item 3 of
`evidence/WP-0A-CON-008/product-owner-disposition-2026-10-09-three-governance-prs.md` ("RFC จำกัด cardinality ของ OBS
(error_code/outcome เป็นรายการปิด + budget ต่อ label)") and chose `ให้ A0 กดทั้ง 3 (Recommended)`. A0 presses it only when
C0, A1, Q0 and R0 have passed on its final head, CI is green, and the Product Owner has answered the questions of §9
himself.

---

## 1. Background

CTR-OBS-001 (Candidate since PR #233) closes the set of label NAMES on `sli_tags` (`additionalProperties: false`), so
`page_name`, a workspace id or user content cannot become a metric dimension. It does not bound the set of label VALUES.
The contract says so three times: its manifest in `untestable_by_schema` and `accepted_gaps`, and its `schema.json` in
`sli_tags.x-cardinality-limitation`.
Today the five labels stand like this at `5e444c53`:

| Label | Rule today | Values bounded? |
|---|---|---|
| `module_key` | pattern `^[a-z0-9_.:-]+$`, `maxLength` 64, required | length only |
| `environment` | enum of the four Track INF environments, required | **yes, 4** (A6, co-owner review) |
| `capability_key` | pattern `^[a-z0-9_.:-]+$`, `maxLength` 64 | length only |
| `outcome` | pattern `^[a-z0-9_.:-]{1,64}$` | length only; "LEFT OPEN DELIBERATELY" until an SLI outcome vocabulary exists |
| `error_code` | pattern `^[a-z0-9_.:-]{1,64}$` | length only; the accepted-gap fixture carries `provider.http_502.attempt_7.corr_0004` |

A length is not a cardinality bound (A6, `a6-countersign-2026-10-09.md` N-3). The accepted-gap fixture puts an attempt
number and a correlation id inside `error_code`, so every failure would create a new time series.

**Why this must be closed, not declared.** "bounded cardinality" is one of the three `required_before_freeze` items of
CTR-OBS-001 in `contract-catalog/shared-kernel/index.json`. RFC-2026-031 §5.5 (1), approved as Q-031-3, forbids carrying
a missing `required_before_freeze` item as a declared gap. A6 drew that conclusion in its Candidate signature (§6) and
withdrew its earlier view that `[4]` could be declared. So CTR-OBS-001 cannot enter its freeze review (RFC-2026-031
§4.1) until the value space of every label is bounded by a rule the contract states.

**What the sources give.** OB-006 requires bounded cardinality and forbids user content, tokens and page names in a
label. It states no number. No baseline task enumerates SLI outcomes. CTR-ERR-001 `code` is `minLength: 1` with no
vocabulary, so `error_code` cannot be closed by reference to it. CTR-ERR-001 `category` IS a closed enum, of eight
values. The per-label numbers below are A6's, recorded as SRE co-owner on 2026-09-02 and restated on 2026-10-09:
environment 4, outcome 4, error_code 64, capability_key 16 per module, module_key 32
(`co-owner-review-sec-aud-obs-usg.md`; `a6-countersign-2026-10-09.md` §5; `a6-candidate-signature-2026-10-09.md` §6). The
same five numbers are the `metric_label_cardinality_budget` of A6's metric dictionary
(`evidence/WP-0A-A6-001/product-kpi-metric-dictionary.json` and `.md`, "The `sli_tags` per-label cardinality budget"),
whose checker `evidence/WP-0A-A6-001/verify-source-fields.mjs` compares each line's `enforced` flag and number with the
CTR-OBS-001 schema. This RFC invents no domain code: every list entry below is already declared by a contract or used by CTR-OBS-001's own valid
fixtures.

## 2. Decision: `error_code` is CTR-ERR-001's `category`

`sli_tags.error_code` becomes an enum equal to CTR-ERR-001 `properties.category.enum`, in the same order:

`validation`, `auth`, `permission`, `conflict`, `rate_limit`, `provider`, `temporary`, `internal` (8 values).

- **Meaning changes.** The label carries the error's category, not its fine-grained code. The fine-grained CTR-ERR-001
  `code` stays in the structured log and the error body, which OBS-001 already makes linkable through `correlation`.
  This is A6's preferred closure ("the cheapest closure with a source", `a6-countersign-2026-10-09.md` §5).
- **Source.** The list is declared by CTR-ERR-001, which A0 owns. CTR-OBS-001 holds a copy, not a `$ref`, for the same
  reason RFC-2026-032 §4 gives: the catalog admits a `$ref` only to a whole canonical `schema.json`, and the ratchets do
  not follow one. The §6 test pins the copy equal to the source, so a change to ERR's categories fails the test until
  OBS moves with it.
- **Who adds an entry.** Only a change to CTR-ERR-001 `category` can add one. That is an ERR change, owned by A0, and
  breaking for ERR under RFC-2026-031 §3.3 once ERR is Frozen. The OBS copy moves in the same PR, with A6's signature on
  the changed OBS text.
- **The alternative not taken.** A registry of ERR codes with a published count under 64, owned by the CTR-ERR-001
  owner (A6's second option). No such registry exists; building one first would hold the OBS freeze on new ERR work.
  It stays open as a later amendment if a category proves too coarse for alerting (§9, Q-033-1).
- **Budget in force.** The enforced budget of `error_code` is 8, the length of the enum. 64 is a cap, not an
  allowance: any change that raises the number of `error_code` values above 8, by an added ERR category or by a later
  code registry, is an increase under §5 and an Owner question, because it raises §4.1's series ceiling.

## 3. Decision: `outcome` is a closed list, seeded from the contract's own fixtures

`sli_tags.outcome` becomes an enum. The list has four values: the three that CTR-OBS-001's own valid fixtures use, and
`error`, which A6 added as observability co-owner (`evidence/WP-0A-CON-004/a6-rfc033-reading-2026-10-09.md` §3).

| Value | Used by | Reading |
|---|---|---|
| `success` | `examples/valid-ready.json` | the SLI event succeeded |
| `provider_unavailable` | `examples/valid-provider-unavailable-but-still-live.json` | the event failed because an external provider was unavailable while the module was live (OB-003: it may affect readiness, never liveness); `error_code`, when present, is `provider` |
| `down` | `examples/valid-down-and-not-ready.json` | the event was not served because the module or capability was not serving (not live, or not ready for a reason other than an unavailable provider) |
| `error` | the §8 increment's valid fixture | the event failed while the module was serving, for a reason other than an unavailable external provider; `error_code` carries its CTR-ERR-001 category |

- **Why these and not CTR-AUD-001's.** AUD's `succeeded`/`failed`/`denied` is the result of an actor's action; this
  label is the result of a health probe or SLI event. Borrowing AUD's set was tried and reverted because it rejects this
  contract's own valid documents (`co-owner-review-sec-aud-obs-usg.md`, "Reviewer overruled"; the `outcome` x-source).
- **A6's list.** A6 signed the three fixture values and added `error`, which fills the budget of 4. Without `error`, a
  live module that fails an event for a reason other than a provider has no correct value
  (`a6-rfc033-reading-2026-10-09.md` §3). `down` stays in the label. `liveness.status` is a field of the health
  document, not a label, so an availability SLI counts its not-served events under `outcome: down`. The label
  classifies an SLI event; it does not report liveness, and no consumer reads liveness from it.
- **Who adds an entry.** A6, as observability co-owner, by an amendment to this RFC with its signature and a four-role
  round. Before CTR-OBS-001 is Frozen, that is enough while the list stays within its budget. After the freeze, an added
  value widens the accepted set and is breaking under RFC-2026-031 §3.3, so it needs an RFC and version 2.0.0. Raising
  the budget itself is §5's route.

## 4. The per-label budget

The budget of a label is the maximum number of distinct values it may take on one metric in one environment. An absent
optional label counts as one more value, because a backend stores the unlabelled series too.

### 4.1 Metric labels (`sli_tags`)

| Label | Required | Budget | Enforced by | Justification |
|---|---|---|---|---|
| `environment` | yes | **4** | schema enum (exists) | the four Track INF environments; A6 |
| `module_key` | yes | **32** modules | runtime population check (§6.2) | A6's number. The schema bounds length (64) but cannot bound a population. The First-Slice module map is far below 32; 32 leaves room for the G1 and G2 waves |
| `capability_key` | no | **16 per module** (17 with absent) | runtime population check (§6.2) | A6's number. Capabilities are declared in each module's CTR-MOD-001 manifest, so the population is known at build time |
| `outcome` | no | **4** (all four in use; 5 with absent) | schema enum (§3) | A6's number and A6's list (§3) |
| `error_code` | no | **8** enforced (the enum; 9 with absent); cap 64 (§2) | schema enum (§2) | A6's ceiling of 64 holds for any later code registry; the category list fills 8 |

**Derived series ceiling.** This ceiling counts `outcome` at its full budget of 4. One metric name in one environment
can have at most 32 × 17 × 5 × 9 = **24,480** series with §2's list and §3's budget (with A6's four values, §3's list
and its budget coincide), and 97,920 across the four environments. That is an upper bound, not a forecast: an
`error_code` is meaningful only on a failing outcome, and most modules declare a few capabilities. If `error_code` ever
used its cap of 64, the bound would be 32 × 17 × 5 × 65 = 176,800 per metric name per environment, which is why raising
it is a §5 decision and not automatic. **The bound is per metric name.** Total series, which a metric backend charges
for, is this figure times the number of metric names, and this RFC does not bound that number (A1-239-3); bounding the
metric-name set, or giving it a budget, is a follow-up listed in §8. A6's dictionary states the same budget as a
full cross product without absent values and across environments, 4 × 4 × 64 × (32 × 16) = 524,288; with `error_code`
at 8 that figure becomes 4 × 4 × 8 × (32 × 16) = 65,536. The two counts measure the same budget two ways. The number is an Owner question (§9, Q-033-3)
because series count drives the metric backend's cost.

### 4.2 Fields that are NOT labels (budget 0 as a label)

These fields are needed for linking and must stay out of every metric label and every log index label. Their length is
already bounded in the schema; their population is unbounded by design:

- `correlation.correlation_id`, `request_id`, `causation_id`, `trace_id`, `job_id` (one value per request, job or trace);
- `module.implementation_version` (one value per deployment; A6 ruled it is not a label, `a6-countersign-2026-10-09.md`
  §4 item 4);
- `readiness.capabilities[].reason_key` and `dependencies[].dependency_key`, `kind`, `status` (health detail, not SLI
  dimensions);
- any workspace, tenant, user or page identifier (OBS-001 requires the workspace to be linkable through the log, not a
  label; OB-006 names page names).

The `sli_tags` name set is already closed, so none of these can be a metric label today. §6 adds a test that keeps it so.

### 4.3 Structured logs

OBS-002 requires `module_key` and `environment` on every structured record, along with severity, `error_code` and
correlation. A log backend that indexes labels (streams) uses only `module_key` and `environment` as index labels: at
most 32 streams per environment, and **128** across the four. Severity, the record's `error_code`, the correlation
ids and every other field go in the record body, where they are searchable without creating streams. In the log body,
`error_code` carries the fine-grained CTR-ERR-001 `code`. Adding any index label, severity included, is an amendment
under §5. A6 signed this limit on 2026-10-09 (`a6-rfc033-reading-2026-10-09.md` §4.3).

## 5. Ownership and changes to a list or a budget

| Item | Owner | How it changes |
|---|---|---|
| `error_code` list | A0, as owner of CTR-ERR-001 `category` | an ERR change; the OBS copy moves in the same PR with A6's signature |
| `outcome` list | A6, observability co-owner | amendment to this RFC with A6's words and a four-role round; within the budget of 4 |
| every budget number in §4 | A6 sets it; the Product Owner approves any increase | amendment to this RFC; an increase raises §4.1's ceiling and is an Owner question, because it is cost |
| §4.2 exclusions and §4.3 log index | A6 with A0 | amendment to this RFC |
| the §6 test | `WP-0A-CON-004` (A0) | ordinary increment of that package |

After CTR-OBS-001 is Frozen, any change to the `outcome` or `error_code` enum changes the accepted set and is breaking
under RFC-2026-031 §3.3 (RFC and version 2.0.0). A budget number that is not a schema rule (§4.1, `module_key` and
`capability_key`) does not change the accepted set; it is still changed only by amendment here.

## 6. Enforcement

### 6.1 Schema and fixtures (in the §8 increment)

- `sli_tags.error_code`: replace the pattern with the §2 enum. `sli_tags.outcome`: replace the pattern with the §3 enum.
  Each carries an `x-source` citing this RFC.
- The manifest states the budget table of §4.1 (a `label_budget` object, or an `x-label-budget` annotation on
  `sli_tags` if the manifest shape is closed to new keys; the §8 increment checks which).
- `examples/accepted-gap-unbounded-error-code-label.json` is renamed to `examples/invalid-sli-tags-error-code-enum.json`
  and now fails for exactly one reason; its `accepted_gaps` entry is removed, closed by this evidence.
- The 54 other fixtures that carry `error_code: "provider.http_502.attempt_7.corr_0004"` (measured at `5e444c53`: 55
  files carry it, one of them the accepted gap) take `error_code: "provider"`, so each still fails for its one named
  reason.
- `untestable_by_schema`, `freeze_boundary`, `sli_tags.x-cardinality-limitation` and `accepted_gaps` are restated: the
  value space of `environment`, `outcome` and `error_code` is closed; the populations of `module_key` and
  `capability_key` are budgeted and checked at runtime (§6.2).

### 6.2 Tests

- **New `test-kits/contracts/obs-label-budget.test.mjs`** (owned by `WP-0A-CON-004`). It asserts:
  1. every property of `sli_tags` has a budget entry, and every budget entry names a property;
  2. every label with an enum has an enum no longer than its budget;
  3. `sli_tags.error_code.enum` deep-equals `ctr-err-001/schema.json` `properties.category.enum`;
  4. `sli_tags.outcome.enum` equals the list this RFC records, so an added value without an amendment fails;
  5. no label outside `module_key` and `capability_key` is left without an enum;
  6. no field of §4.2 appears under `sli_tags` (names checked, as a guard on `additionalProperties`).
  The test is registered in `scripts/test-suite-contract.mjs` (owned by `WP-0A-A0-002`) with a ratchet: each of 1-6 has
  one measured reversal that it catches.
- **Moved with the schema:** `test-kits/contracts/catalog-registry.test.mjs` (WP-0A-CON-008: OBS annotation count and
  digest, fixture names and digests), `test-kits/contracts/schema-mutation-coverage.test.mjs` (WP-0A-CON-003: two
  `pattern` sites become `enum` sites, and the floor), and `test-kits/integrity-manifest.json` (regenerated).
- **Population (runtime, G1).** That no more than 32 modules and 16 capabilities per module emit `sli_tags` is a
  property of a running fleet. The §4.3 log index rule (only `module_key` and `environment` as stream labels) is a
  property of the deployed log shipper, not of a document, and is carried in the same declared gap. It is carried as a
  declared gap of kind `runtime`, owner A6, `closes_before` G1, as A6
  placed it (`a6-candidate-signature-2026-10-09.md` §6). A build-time check over the registered CTR-MOD-001 manifests
  can close it earlier once module manifests exist. That gap is declarable: it is a population, not the missing
  "bounded cardinality" item, which §6.1 closes.

**The standing restriction stays until the §8 increment is merged.** No consumer, fake or harness built under
CTR-OBS-001 emits `sli_tags` to a real metric backend before the budget lands (`untestable_by_schema`, last sentence;
A6's Candidate restriction).

## 7. Breaking-change classification (RFC-2026-031 §3.3)

CTR-OBS-001 is **Candidate**. RFC-2026-031 §3.3's RFC rule and version rule bind `Frozen` contracts, so they do not bind
the §8 edits. The classification is given by §3.3's definition so C0 can confirm it in writing:

| Edit (§8) | Accepted set | Class by §3.3 | Version |
|---|---|---|---|
| `sli_tags.error_code`: pattern → enum of 8 categories | narrows | **breaking** (and a change of the label's meaning) | stays `1.0.0` (Candidate) |
| `sli_tags.outcome`: pattern → enum of 4 | narrows | **breaking** | stays `1.0.0` |
| accepted-gap fixture → `invalid-sli-tags-error-code-enum.json`; `accepted_gaps` entry removed | narrows (part of the rows above); the gap is closed by evidence, not removed without it | breaking only through the rows above | `1.0.0` |
| 54 invalid fixtures: `error_code` value rewritten | unchanged (each fixture still fails for its one reason) | not breaking | `1.0.0` |
| manifest budget table; restated annotations and `freeze_boundary` | unchanged | not breaking | `1.0.0` |

**Measured impact.** Of CTR-OBS-001's three valid fixtures, none carries `error_code`, and their `outcome` values are in
the §3 list, so none becomes invalid (A6 measured the four-value list: `a6-rfc033-reading-2026-10-09.md` §1). The one document that becomes invalid is the accepted-gap fixture, which is the point.
A consumer fake or test written against Candidate CTR-OBS-001 that emits a fine-grained code in `error_code`, or another
outcome word, would break. None is in the repository (`grep -rn sli_tags` outside `contract-catalog/` and the catalog
tests finds no consumer at `5e444c53`).

**Freeze gating.** CTR-OBS-001 does not enter its freeze review (RFC-2026-031 §4) until this RFC is Accepted, the §8
increment is merged, and §6.2's test is green on `main`. Landing the narrowing before the freeze is also what keeps it out
of §3.3's RFC-and-version-2 route (RFC-2026-031 §3.3, "Consequence").

## 8. What changes, in which files (not in this PR)

**This PR changes no contract, fixture or test.** The edits come in one later increment of `WP-0A-CON-004`, with its own
four-role round and A6's co-owner signature on the changed CTR-OBS-001 text.

| File | Owner | Edit |
|---|---|---|
| `contract-catalog/shared-kernel/ctr-obs-001/schema.json` | WP-0A-CON-004 | §6.1: two enums, their `x-source`, restated `x-cardinality-limitation` |
| `contract-catalog/shared-kernel/ctr-obs-001/manifest.json` | WP-0A-CON-004 | budget table, `fixtures`, `accepted_gaps`, `untestable_by_schema`, `freeze_boundary`, `source_references` gains this RFC |
| `contract-catalog/shared-kernel/ctr-obs-001/examples/*` | WP-0A-CON-004 | one rename (accepted gap → invalid), 54 `error_code` rewrites |
| `test-kits/contracts/obs-label-budget.test.mjs` | WP-0A-CON-004 (new) | §6.2 |
| `test-kits/contracts/catalog-registry.test.mjs` | WP-0A-CON-008 | OBS pins |
| `test-kits/contracts/schema-mutation-coverage.test.mjs` | WP-0A-CON-003 | OBS constraint surface and floor |
| `scripts/test-suite-contract.mjs`, `test-kits/integrity-manifest.json` | WP-0A-A0-002 | the new test's registration; the manifest regenerated, not edited by hand |
| `evidence/WP-0A-A6-001/product-kpi-metric-dictionary.json` and `.md` | WP-0A-A6-001 (A6) | the `outcome` and `error_code` budget lines become `enforced: true` with `max_distinct_values` equal to the enum length (4 and 8), or the checker reports them; the "blocked on `CTR-ERR-001.code`" text and the 524,288 figure are restated. A6 makes this edit, or it is amended without owning with A6's acknowledgement; the checker is not in the suite, so nothing in CI fails if it is missed, which is why it is listed here |

**Follow-ups the §8 increment carries** (raised in the roles' reading of this RFC; advisory, each settled in that
increment's own round):

- **A6 N-1.** Add one valid fixture that exercises `error`, for example `valid-error-while-live.json` (live, ready,
  `outcome: "error"`, `error_code: "internal"`), so every value of both enums is used by a valid document.
- **A6 N-2 and C0 A-1.** `invalid-sli-tags-error-code-pattern.json` and `invalid-sli-tags-outcome-pattern.json` will fail
  on `enum`, not `pattern`, and the renamed `invalid-sli-tags-error-code-enum.json` duplicates the first; they are
  renamed or merged in the same increment, so the fixture-name and digest pins move once. With string enums, deleting
  `type` on `outcome` and `error_code` changes no verdict, so both `type` sites become SUBSUMED in
  `schema-mutation-coverage.test.mjs`, as `sli_tags.environment.type` already is; the CON-003 row names the two
  subsumption entries.
- **A6 N-3.** Nothing stops `outcome: "success"` with an `error_code`. An `allOf` rule "no `error_code` when `outcome`
  is `success`" would narrow the accepted set; it is optional, A0's choice as Author.
- **C0 A-2.** The dictionary and the manifest must not state different numbers for one label. With A-1 and A-3 the
  enforced numbers are 4 and 8 in both; the increment says which record holds the cap of 64.
- **C0 A-5.** A `label_budget` manifest key needs `MANIFEST_KEYS` in `catalog-registry.test.mjs` to change (CON-008
  row); the increment also states whether OBS `composes` gains `CTR-ERR-001` (the RFC-2026-032 precedent suggests not).
- **R0 R-239-4.** `test-kits/contracts/obs-label-budget.test.mjs` enters `WP-0A-CON-004`'s `writable_paths`; the
  amendments to CON-003, CON-008, A0-002 and A6-001 are declared in `amends_without_owning` with `recorded_on`; the
  A6-001 dictionary edit needs A6's own words or acknowledgement.
- **A1 A1-239-3.** The number of metric names is not bounded by this RFC (§4.1). The metric-name set, or its budget, is
  owed by A6 before any real metric backend is connected.
- **A1 A1-239-2 (A1's condition C-3 on that increment).** The §6.2 runtime gap is restated as a membership check:
  `module_key` in the registered CTR-MOD-001 module keys, `capability_key` in that module's declared capabilities.

**Records closed by that increment, not by this PR:** `WP-0A-CON-004` `open_blockers[4]`; the CTR-OBS-001 accepted gap;
the index item "bounded cardinality" becomes present for C0 to match at the freeze review (RFC-2026-031 §4.1 (2)).

**Not changed by this RFC:** any contract status, owner or version; CTR-ERR-001 (its `category` enum is cited, not
changed); CTR-AUD-001's `outcome`; the Decision Register (`docs/**` is read-only to every package); RFC-2026-010 and
RFC-2026-031, which are cited and not amended.

## 9. Owner questions

Each question carries A0's recommendation. None is answered yet. Item 3 of
`evidence/WP-0A-CON-008/product-owner-disposition-2026-10-09-three-governance-prs.md`, on whose option A0 would press
this PR, requires that the Product Owner himself has answered the RFC's questions (C0-239-2, A1-239-1). The night
delegation (`evidence/WP-0A-CON-004/product-owner-disposition-2026-10-09-night-delegation.md`) does not stand in for
that answer. Each answer below is marked **A0's recommendation — awaiting the Product Owner's own answer, which item 3
of the 2026-10-09 three-governance-PRs disposition requires before the press.** The Owner's answers will be transcribed
verbatim in a `product-owner-disposition-*` file under `evidence/WP-0A-CON-004/`. No answer replaces A6's signature
(§3, §4) or any role's verdict, and none makes this RFC Accepted.

- **Q-033-1. What does `error_code` carry?** (a) CTR-ERR-001 `category`, 8 values, fine-grained code in the log (§2);
  (b) a new ERR code registry with a published count under 64; (c) drop the `error_code` label. **A0 recommends (a).** It
  has a source today, sits well inside A6's ceiling, and is A6's own preferred closure; (b) holds the freeze on ERR work
  that does not exist; (c) loses the one failure dimension SLO alerting needs.
  **Answered by the Product Owner on 2026-10-10: (a).** Transcribed verbatim in
  `evidence/WP-0A-CON-004/product-owner-disposition-2026-10-10-rfc033-answers.md`, item 1.
- **Q-033-2. How is `outcome` closed?** (a) seed it with the three values the contract's valid fixtures use (`success`,
  `provider_unavailable`, `down`), budget 4, A6 to confirm or replace within the budget before acceptance (§3); (b) leave
  it open until A6 proposes a full vocabulary, which keeps the freeze blocked. **A0 recommends (a).** It invents nothing,
  rejects no valid fixture, and leaves the vocabulary A6's. A6 has since signed the three and added `error` within the
  budget (§3); A6 records that this reopens no answer (`a6-rfc033-reading-2026-10-09.md` §5).
  **Answered by the Product Owner on 2026-10-10: (a), closing `outcome` at the four values of §3.** Transcribed
  verbatim in `evidence/WP-0A-CON-004/product-owner-disposition-2026-10-10-rfc033-answers.md`, item 2.
- **Q-033-3. Accept the budget and its cost ceiling?** A6's per-label numbers (§4.1: environment 4, module_key 32,
  capability_key 16 per module, outcome 4, error_code 8 enforced with a cap of 64), giving at most 24,480 series per
  metric name per environment, and any increase coming back to the Owner. The number of metric names is not bounded by
  this RFC (§4.1, §8 follow-ups). **A0 recommends accepting them.** They are the observability co-owner's
  numbers, unchanged since 2026-09-02; the ceiling is an upper bound far above the First Slice's expected series; and an
  increase stays an Owner decision.
  **Answered by the Product Owner on 2026-10-10: accept.** Transcribed verbatim in
  `evidence/WP-0A-CON-004/product-owner-disposition-2026-10-10-rfc033-answers.md`, item 3.
- **Q-033-4. Land it before the freeze?** The §8 increment lands while CTR-OBS-001 is Candidate, and CTR-OBS-001 does not
  enter its freeze review until §7's freeze gate holds; until then no consumer emits `sli_tags` to a real metric backend.
  **A0 recommends yes.** "bounded cardinality" cannot be declared (RFC-2026-031 §5.5 (1)), and landing the narrowing at
  Candidate avoids a version 2.0.0.
  **Answered by the Product Owner on 2026-10-10: yes.** Transcribed verbatim in
  `evidence/WP-0A-CON-004/product-owner-disposition-2026-10-10-rfc033-answers.md`, item 4.

**Order before acceptance and the merge.**
1. The four roles read this head; A1 as the security reviewer; A6 reads §3 and §4 as observability co-owner and signs,
   changes or refuses the `outcome` seed and the numbers in its own words.
2. If A6 changes a value, this RFC is amended to A6's words and the roles re-read the changed head. (Done for A6's
   A-1 to A-7: A6 added `error` to §3; the roles re-read the amended head, and A6 re-reads that its words landed.)
3. The Product Owner answers Q-033-1 to Q-033-4 himself, and A0 transcribes the answers verbatim. (Done on 2026-10-10:
   `evidence/WP-0A-CON-004/product-owner-disposition-2026-10-10-rfc033-answers.md`.)
4. A0 sets the status to Accepted in a later step, after the roles pass, citing their files and the Owner's answers.
5. A0 presses the PR on a green head containing current `main` (Owner disposition item 3).

Until the status reads Accepted, nothing in §2 to §8 binds.
