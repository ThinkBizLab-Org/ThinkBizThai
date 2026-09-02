# WP-0A-CON-002 — Independent Reviewer evidence

Reviewer run: `/claude/c0_contract_reviewer` (Anthropic, `claude-opus-5`)
Role: independent Reviewer (contract/architecture), skill profile `architecture-contracts`
Author run under review: `/claude/a0_atlas` — a different run. This run authored no part of
the change under review.
Branch: `agent/claude/WP-0A-CON-002-envelope-contracts`
Head reviewed: `106f91c4fb5663761e9f3a232e831aca74970456`
Parent (pre-change baseline): `4e1d6e5`
Date: 2026-08-31

**Scope of this document.** This is independent Reviewer evidence only. It is **not**
Security/Privacy review, **not** Tester verification, **not** Integration Owner
verification, **not** Product Owner disposition, **not** merge authorization, and it does
**not** approve or move Gate G0. Gate G0 remains Specification Baseline Complete /
External Verification Pending.

This run wrote only this file. It committed nothing and pushed nothing. Every adversarial
probe below ran against throwaway `git archive` copies of `106f91c` in a scratchpad
directory outside the repository, never against the working tree.

---

## 1. Toolchain and declared commands, replayed at `106f91c`

All commands run through a login shell (`zsh -lc`) from `/Users/bank/ThinkBizThai`.
`node --version` → `v24.20.0`, `npm --version` → `11.19.0`. Matches the RFC-2026-001 pin.

| Command | Exit | Observed |
|---|---:|---|
| `npm run check` | `0` | `tests 59 / pass 59 / fail 0` — the 46 → 59 claim reproduces |
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` | `0` | `tests 4 / pass 4 / fail 0` |
| `node --test test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | `0` | `tests 9 / pass 9 / fail 0` |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-002.json` | `0` | no output |

Every exit code and count the Author reported in `evidence/WP-0A-CON-002/author-self-check.md`
§"Commands and exit codes" reproduces exactly.

**Working-tree note.** `git status --short` at the start of this review already showed
` M work-packages/WP-0A-A0-002.json` (`"status": "backlog"` → `"in_review"`). That
modification pre-dates this review, belongs to a different package, and was **not** made by
this run. I left it untouched. It does not affect any exit code above.

---

## 2. Item 7 — reproducing the defect claim

Method: `git archive 106f91c` into a scratch directory outside the repository; reverted
**only** the two `$ref` string literals to `../../ctr-ten-001/schema.json`; ran the guard as
committed. I verified independently (not from the Author's word) that the reverted schema
is byte-identical to the `4e1d6e5` schema once `x-amended-by` is removed — so the tree I ran
against is genuinely the pre-fix content, not an approximation.

Observed, exit code `1`:

```
✖ every external $ref in the catalog resolves to a file that exists
✔ a $ref never escapes the contract catalog
✔ every manifest fixture and schema it declares exists on disk
✔ every fixture on disk is declared by its manifest
ℹ tests 4   ℹ pass 3   ℹ fail 1

AssertionError: unresolved catalog $ref(s):
  contract-catalog/shared-kernel/ctr-evt-001/schema.json $.properties.tenant_context.$ref
    -> ../../ctr-ten-001/schema.json -> contract-catalog/ctr-ten-001/schema.json
  contract-catalog/shared-kernel/ctr-job-001/schema.json $.properties.tenant_context.$ref
    -> ../../ctr-ten-001/schema.json -> contract-catalog/ctr-ten-001/schema.json
```

**CONFIRMED.** `tests 4 / pass 3 / fail 1`, both offending files named with the paths they
resolve to, matching the Author's transcript exactly. The guard is **not tautological**: it
resolves the reference against disk and fails on real broken content, and the remaining
three assertions stay green, so the failure is specific rather than a blanket red.

**One precision the Author's framing does not earn.** `106f91c` is a single commit
containing both the guard and the fix. Git history therefore cannot establish that the guard
was *written* before the fix. What is verifiable — and what actually matters — is the
counterfactual I executed: the guard detects the defect on defect-bearing content. I record
the claim as *substantively verified, chronologically unverifiable*. Not a finding; a
scoping of what the evidence supports.

**Weakness observed in passing.** Guard test 2 ("a `$ref` never escapes the contract
catalog") **passed on the pre-fix tree**, because `contract-catalog/ctr-ten-001/schema.json`
still starts with `contract-catalog/`. The escape check is strictly coarser than the
resolvability check and did no work on the only real defect the catalog has had.

---

## 3. Items 1–6 — per-rule sourcing table

Baseline lines cited: `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md`
(§5.2, lines 198–231) and `docs/plans/module-contracts-events-jobs-workstream-th.md`
(§3.1 line ~100, §3.4 line ~140, §D lines 227–232, §G lines 265–271).

| # | Rule | Ruling | Evidence |
|---:|---|---|---|
| 1 | `CTR-API-001.kind` includes `accepted`; `accepted.{job_id,status_ref,deep_link_ref}` | **Sourced in substance, MISPLACED — finding R6** | Workstream §D line 231 (API-005) Outputs cell reads literally "`accepted` response + job/status/deep-link refs". The field vocabulary is baseline text, and the manifest declares §D API-005 in `source_references` and in `freeze_boundary`. **But** Decision Register §5.2 names CTR-JOB-001 "Background Job Envelope **+ receipt**" — the baseline's own catalog assigns the receipt to CTR-JOB-001, not CTR-API-001 — and §5.2's `Artifact ขั้นต่ำก่อน Freeze` for CTR-API-001 is "success/error examples, correlation, auth rules", with no receipt. API-005 also depends on **JB-001**, not on API-001 alone. Declared scope expansion into the wrong catalog row. |
| 1b | `status_ref` / `deep_link_ref` must not be a public URL | **Soundly inferred, NOT declared** | No baseline line states it for API-005. It is consistent with CTR-JOB-001's committed `input_ref`/`result_ref` `{"not":{"pattern":"^https?://"}}` and with §H PT-004 "Domainไม่ประกอบ URL". The CTR-API-001 `freeze_boundary` does not list it among the inferences it declines to make. Minor; see also R7 on the regex form. |
| 2 | `CTR-PAG-001` requires ≥ 2 sort keys (tiebreaker) | **Soundly inferred, NOT declared — finding R5. And NOT ENFORCED BY THE SCHEMA — finding R1** | Workstream §D line 230 (API-003) says only "Stable ordering; no duplicate/missing ระหว่าง page; cursor opaque/tamper-safe". No sort-key count anywhere. The inference is technically sound (keyset pagination on a non-unique key is unstable) and is in fact supported by a baseline document the Author did **not** cite: `docs/plans/asset-library-database-ux-spec-th.md` §5.2 line 264, "Asset Library ใช้ keyset cursor `(created_at, id)` ไม่ใช้ deep `offset`", and the index at line 248. Not declared as an inference in `freeze_boundary`; the self-check instead asserts "none was inferred". Separately, the committed `schema.json` says `minItems: 1` — see §5. |
| 3a | `page_size` `maximum: 100` | **INVENTED** | No occurrence of a page-size bound anywhere in `docs/`. Not in §5.2, not in API-003, not in any other plan. Not declared in `freeze_boundary`. A hard numeric cap on every list API in the product, chosen by the Author. |
| 3b | `cursor` / `next_cursor` `pattern: ^[A-Za-z0-9_-]+$` | **INVENTED, and self-contradictory** | No baseline line constrains cursor charset; "base64" appears nowhere in `docs/`. Worse, the CTR-PAG-001 `freeze_boundary` states "The cursor's encoding, signing algorithm, and key management are deliberately NOT specified here; only opacity and the absence of a client-decodable offset are contractual." A base64url charset **is** an encoding constraint, and it forbids a dot-separated signed token (a JWT cursor) and standard base64 (`+`, `/`, `=`) — i.e. it constrains the signing algorithm the boundary declares open. The freeze boundary and the schema contradict each other. |
| 4 | `payload_hash` `^sha256:[0-9a-f]{64}$` | **INVENTED** | §5.2 line 202 requires "payload hash" as a pre-freeze artifact; §G ID-001 line 266 says "payload hash mismatch conflict". **No algorithm is named in either.** `sha256` appears in `docs/` only in the object-storage and asset-library specs, for file checksums — a different concern, and not cited by this manifest. The CTR-IDM-001 `freeze_boundary` enumerates what it declines to infer (store implementation, lock strategy, retention window, HTTP header name) and does **not** include the digest algorithm. Pinning the algorithm in a Draft contract forecloses a security decision that belongs to the Security reviewer. |
| 4b | `scope.operation` `^[a-z0-9]+(\.[a-z0-9]+)+$` | **INVENTED (minor)** | ID-001 says "key scope includes workspace+operation" and nothing about a dotted namespace. The pattern mirrors §3.2's `event_type` `<domain>.<entity>.<action>`, which is a different contract. Not declared. |
| 5 | error `details` must be empty | **SOURCED, consistent** | §3.4 line ~140: "details — safe/redacted only". CTR-ERR-001 (committed, WP-0A-CON-001) already declares `details: {type:"object", maxProperties: 0}` **and** lists `details` in `required`. The CTR-API-001 predicate's "present and zero keys" mirrors that exactly, and CTR-API-001's schema delegates via `$ref` rather than restating it. No contradiction. Whether `maxProperties: 0` is itself an over-strict reading of "safe/redacted only" is WP-0A-CON-001's decision, out of scope here; this package is faithful to it. |
| 6 | `required` fields vs §3.1 / §3.4 | **No contradiction found; one unsourced structural addition — finding R11** | §3.1's Conditional fields (`business_profile_id`, `page_context_profile_id`, `causation_id`) are correctly *not* required by anything this package added. §3.4's fields are reached only through the CTR-ERR-001 `$ref`; nothing is restated or narrowed. The `locale`/`timezone` `const` pinning that the test predicate mirrors is inherited from CTR-TEN-001's committed schema (WP-0A-CON-001), not introduced here — though I note §3.1 says "Phase 1 **default** `th-TH`" / "Workspace default", and a default is not a const. **New in this package:** CTR-API-001 requires `request_id` and `correlation_id` at the envelope top level *in addition to* the copies inside `tenant_context`, where §3.1 places them — and no rule anywhere requires the two copies to agree. CTR-EVT-001 has top-level `correlation_id` as precedent, but not top-level `request_id`. |

**Summary for the central question: yes, the Author invented contract semantics.** Three
rules (3a, 3b, 4) have no baseline source, are not declared as inferences, and one of them
contradicts its own contract's declared freeze boundary. The package's acceptance criterion
reads "…without inventing contract semantics", and the author self-check states "Every rule
below traces to a source line; **none was inferred**" while its own CTR-PAG-001 row lists
"opaque cursor charset, bounded page size" as if the API-003 line said so. It does not.

---

## 4. Item 8 — attacking the guard

Method: `git archive 106f91c` into a second scratch tree, added eleven probe contracts, ran
the committed guard unmodified. Exit `1`, but it named only three of the eleven — and one of
those three is a false positive.

| # | Probe | Result |
|---:|---|---|
| A1 | `$ref` nested inside an array (`allOf[0].anyOf[0]`) | **Caught** — reported as `$.allOf[0].anyOf[0].properties.x.$ref` |
| A2 | `$ref` nested six objects deep | **Caught** — `$.a.b.c.d.e.f.$ref` |
| A3 | Broken `$ref` in a `manifest.json`, not a `schema.json` | **MISSED** — the guard reads `manifest.schema`/`manifest.fixtures` only, never scans manifest bodies for refs |
| A4 | `$ref` to a **directory** that exists (`../ctr-ten-001`) | **MISSED** — `access()` succeeds on a directory; the guard never checks it is a file |
| A5 | Case-differing path (`../CTR-TEN-001/SCHEMA.JSON`) | **MISSED locally** — I confirmed this filesystem is case-insensitive, so `access()` succeeds. CI is `ubuntu-24.04` (case-sensitive), so the guard's local green is not authoritative for this class: an author can commit a case-wrong ref, see green, and be caught only in CI |
| A6 | Broken local `#`-fragment ref (`#/$defs/doesNotExist`) | **MISSED by design** — `!value.startsWith('#')` skips every internal pointer, so a dangling `$defs` reference is invisible |
| A7 | **Legitimate** cross-file JSON Pointer (`../ctr-ten-001/schema.json#/properties/workspace_id`) | **FALSE POSITIVE** — the fragment is concatenated into the filesystem path, so a valid JSON Schema construct is reported as unresolved. The guard forbids a legal reference form the catalog may well need |
| A8 | `schema.json` in a nested subdirectory (`ctr-x/v2/schema.json`) | **MISSED** — `readdir` is one level and only `<dir>/schema.json` is opened |
| A9 | Manifest declaring a schema **not named** `schema.json` (`"schema": "envelope.json"`) with a broken ref | **MISSED** — the guard hardcodes the filename instead of following `manifest.schema`, which it already reads two tests later |
| A10 | Broken ref in a sibling catalog root (`contract-catalog/domain/ctr-biz-001/`) | **MISSED** — `CATALOG` is hardcoded to `shared-kernel`. Decision Register §5.3 and §5.4 already define 15 domain contracts and 10 port contracts that will live outside `shared-kernel/`; the guard will silently not cover them |
| A11 | `$ref` whose value is an object, not a string | **MISSED** — falls through to the recursive branch and is silently discarded |

**Yes, I broke the guard: seven distinct misses and one false positive out of eleven
probes.** A9 and A10 are the two that matter most — A9 because the guard already has
`manifest.schema` in hand and ignores it, and A10 because the catalog is specified to grow
beyond `shared-kernel/` and the guard's coverage will not grow with it. A4 and A7 are
one-line fixes (`stat().isFile()`; split on `#` before resolving).

**Not attacked but absent:** the guard does not validate `manifest.composes`. See R9.

---

## 5. NEW FINDING — the delivered CTR-PAG-001 schema does not encode its headline rule (R1)

`contract-catalog/shared-kernel/ctr-pag-001/schema.json` declares:

```json
"sort":{"type":"array","minItems":1, ...}
```

The test predicate in `shared-kernel-envelope-contracts.test.mjs` declares:

```js
const sortStable = Array.isArray(f.sort) && f.sort.length >= 2 && ...
```

I traced `examples/invalid-unstable-sort-without-tiebreaker.json`
(`{"kind":"request","page_size":20,"sort":[{"field":"created_at","direction":"desc"}]}`)
against the committed schema keyword by keyword: `required` ✓, `additionalProperties` ✓,
`kind` enum ✓, `page_size` 1–100 ✓, `sort` `minItems: 1` ✓, `allOf[0]` `then` satisfied ✓,
`allOf[1]` `if` not triggered. **The fixture the package calls invalid is VALID against the
schema the package delivers.** Only the hand-written predicate rejects it.

The commit message, RFC-2026-004 and the manifest all headline "mandatory sort tiebreaker"
as a delivered rule of CTR-PAG-001. It is not in CTR-PAG-001. It is in a test file.

Two further predicate-only rules in CTR-PAG-001, likewise absent from the schema:
`next_cursor === null ⇒ has_more === false`, and `has_more === true ⇒ next_cursor` present.

**Why this matters more than a normal divergence.** The repository has **zero** npm
dependencies (`package.json` has no `dependencies` block; `node_modules` is absent) and I
found no `ajv`, `jsonschema`, or any other validator in `scripts/` or `test-kits/`. **No
code anywhere executes a `schema.json` against a fixture.** The schemas are inert
declarative artifacts validated by nothing — which is precisely the structural condition
that let D3 survive four independent roles, as this package's own RFC argues at length. The
package correctly diagnosed that root cause, added a guard for *reference integrity*, and
then shipped a new instance of the same class of defect: an unexecuted schema whose content
contradicts the rule it is advertised to carry. The Author's own limitations section
anticipates the general risk ("No validator resolves `$ref` at runtime… A future package
introducing real schema validation should re-check this") but did not check the three
schemas it was shipping against its own predicates.

I checked the other two contracts the same way. CTR-API-001 and CTR-IDM-001 fixtures agree
between schema and predicate on every case (`invalid-success-with-error`,
`invalid-public-status-ref`, `invalid-payload-hash-format`, `invalid-scope-missing-workspace`,
`invalid-completed-without-result-ref`, `invalid-public-result-ref`). The divergence is
isolated to CTR-PAG-001 — but it is on the rule the package leads with.

---

## 6. Item 9 — the cross-package correction, diffed

Verified by parsing both schemas at `4e1d6e5` and `106f91c` and comparing structurally, not
by reading the diff:

| Check | ctr-evt-001 | ctr-job-001 |
|---|---|---|
| Top-level keys added, other than `x-amended-by` | none | none |
| Top-level keys removed | none | none |
| `required` array unchanged | ✓ | ✓ |
| Identical to parent after undoing the `$ref` and dropping `x-amended-by` | **exact match** | **exact match** |
| `version` / freeze level / status touched | no | no |

`x-amended-by` carries exactly `work_package_id`, `decision_record`, `change`,
`acknowledgement_required_from` (`/root/r0_steward`), `acknowledgement_status` (`pending`).

`x-amended-by` sits at the schema **document** root. `additionalProperties: false` in these
schemas constrains *instances*, not the schema document, and JSON Schema 2020-12 ignores
unrecognised keywords — so the record is semantically inert. I confirmed empirically that
WP-0A-CON-001's own `shared-kernel-contract-catalog.test.mjs` still passes with it present.

**Item 9: CONFIRMED.** Exactly the two `$ref` string literals plus the `x-amended-by`
record. No field, semantics, version, or freeze-level change.

**Carried forward from my WP-0A-A0-002 review (N-C1), unchanged:** `x-amended-by` and
`acknowledgement_status: "pending"` are read by no script, no test, and no CI job. Nothing
prevents `pending` surviving to merge. The record is correct and correctly placed; it is
simply unenforced.

---

## 7. Item 10 — index.json untouched

`git log -- contract-catalog/shared-kernel/index.json` last touches it at `f28fb8e`
(WP-0A-CON-001). It does not appear in `git show 106f91c --stat`. Read directly: 14
contracts, 4 `Candidate` (CTR-TEN-001, CTR-ERR-001, CTR-EVT-001, CTR-JOB-001), 10 `Draft`,
with CTR-API-001 / CTR-PAG-001 / CTR-IDM-001 all still `Draft`. **CONFIRMED — no freeze-level
movement; materializing a Draft did not promote it.**

---

## 8. Item 12 — ruling on amending another package's delivered artifact

**Ruling: the RFC / Integration-Owner path is still the correct mechanism, and it does carry
here — but NOT by extension from my WP-0A-A0-002 ruling, and the licence is strictly
narrower. Two conditions apply beyond the three I attached there.**

My WP-0A-A0-002 ruling rested, at reasoning point 4, on the explicit premise that the
amendment "alters nothing that package delivered." That premise is false here. The ruling
does not extend by its own terms and I rule afresh.

1. **The mechanism is still the right one.** CONTRIBUTING_AGENTS.md, "Ownership and change
   control": "Root configuration, lockfiles, CI, **contract catalog**, migration registry,
   composition root, and source-of-truth documents are protected. Propose changes through
   the Integration Owner/RFC path." The contract catalog is named directly, and the remedy
   the guide prescribes for the protected class is an RFC — not a re-opening of the owning
   package.
2. **The "contract meaning/requiredness/state" trigger is engaged, and satisfied.** The
   guide requires an RFC "before changing … contract meaning/requiredness/state". A dangling
   `$ref` is an unresolvable reference: under JSON Schema it is an error, so the constraint
   was inert before the fix and enforceable after. That is a real change in enforced
   requiredness, not a no-op — the amendment therefore *needs* the RFC trigger, and
   RFC-2026-004 supplies it.
3. **No consumer expectation is invalidated.** `tenant_context` was already in `required` in
   both schemas; §3.2 and §3.3 of the Workstream unambiguously specify it as the Trusted
   Tenant Context; nothing in the repository resolves `$ref`s, so no code depended on the
   broken behaviour. The correction restores the meaning the artifact already declared.
4. **The hard prohibition does not reach here.** "Never rewrite an integrated migration"
   is specific to persisted, irreversible state. Reverting this commit restores both
   references byte-for-byte, which I verified structurally in §6.
5. **But content amendments demand a stronger proof than boundary amendments.** A boundary
   amendment changes *who may write*; a content amendment changes *what consumers validate
   against*. The Author's assertion of minimality cannot be the basis for accepting it —
   which is why I diffed both schemas structurally in §6 rather than reading the RFC's
   claim. That verification is a precondition of the authority, not a courtesy.

**Conditions attached (in addition to (a), (b), (c) from my WP-0A-A0-002 review):**

- **(d) Independent structural proof of content-neutrality is mandatory for any
  delivered-artifact amendment**, and must be recorded by a run other than the Author's.
  Satisfied here by §6 of this document. Without it the authority does not attach.
- **(e) The licence is bounded by pre-freeze status, and RFC-2026-004 does not say so.**
  CTR-EVT-001 and CTR-JOB-001 are `Candidate`, not `Frozen v1` or `Integrated v1`. Under
  Decision Register §5.1, a Frozen or Integrated contract requires the compatibility /
  upcaster path (§E EV-003) and a version bump, **not** an in-place amendment. RFC-2026-004
  presents its reasoning as a general precedent for amending delivered content without
  stating this limit. It must state it, or the precedent it sets is wider than the ruling
  that supports it.

RFC-2026-004 remains `Proposed`. Under the conflict-resolution order, a Proposed RFC does
not hold rank-1 authority: the amendment is correctly **staged, not authorized**. The
manifest's `open_blockers` and `required_human_authorities` already say so, and I agree with
that framing.

---

## 9. Findings

| ID | Severity | Finding |
|---|---|---|
| **R1** | **Blocking** | `ctr-pag-001/schema.json` declares `sort.minItems: 1` while the test predicate and every published description of the contract require ≥ 2. `examples/invalid-unstable-sort-without-tiebreaker.json` is **valid** against the committed schema. The delivered artifact does not encode the package's headline rule. Two further rules (`next_cursor: null ⇒ has_more: false`; `has_more: true ⇒ next_cursor` present) are likewise predicate-only. Because nothing in the repository executes a `schema.json`, this is a new instance of the exact defect class the package exists to close. **Fix:** set `minItems: 2` and express the cursor/has_more coupling in the schema, or state plainly in `freeze_boundary` that the schema is deliberately weaker than the acceptance predicate and why. |
| **R2** | **Blocking** | **Invented semantics:** `page_size` `maximum: 100`. No baseline source; not declared. Violates acceptance criterion "…without inventing contract semantics". **Fix:** remove the bound and record it as open before freeze, or cite a baseline line. |
| **R3** | **Blocking** | **Invented semantics, self-contradictory:** cursor `pattern: ^[A-Za-z0-9_-]+$`. No baseline source, and it directly contradicts the same manifest's `freeze_boundary` ("encoding, signing algorithm … deliberately NOT specified"): it forbids standard base64 and any dot-separated signed token. **Fix:** drop the charset constraint and express opacity as the absence of a decodable offset, which is what the boundary claims is contractual. |
| **R4** | **Blocking** | **Invented semantics:** `payload_hash` pinned to `sha256:`. §5.2 and §G ID-001 say "payload hash" with no algorithm. Pinning a digest algorithm in a Draft contract forecloses a decision that belongs to the Security reviewer, and the `freeze_boundary` does not list it as an inference. Same for `scope.operation`'s dotted-namespace pattern. **Fix:** relax to a declared-algorithm-prefix form, or declare the pin as an inference with its rationale. |
| **R5** | Major | The ≥ 2 sort-key tiebreaker is a **sound but undeclared inference**. It is in fact supported by `docs/plans/asset-library-database-ux-spec-th.md` §5.2 (`keyset cursor (created_at, id)` … `ไม่ใช้ deep offset`), which the manifest does not cite. **Fix:** cite that line in `source_references` and mark the rule as inferred. |
| **R6** | Major | Folding API-005's `accepted` receipt into CTR-API-001 contradicts Decision Register §5.2, which names CTR-JOB-001 "Background Job Envelope **+ receipt**" and lists CTR-API-001's pre-freeze artifacts as "success/error examples, correlation, auth rules". Declared, but placed in the wrong catalog row. **Fix:** justify against §5.2 explicitly in the RFC, or move the receipt shape to CTR-JOB-001. |
| **R7** | Major | The author self-check asserts "Every rule below traces to a source line; **none was inferred**", and its CTR-PAG-001 row presents "opaque cursor charset, bounded page size" as materializing the API-003 line. Given R2–R5 that statement is not accurate, and it is the statement a Tester or Integration Owner would rely on. **Fix:** correct the self-check. |
| **R8** | Medium | Regex portability: the three new contracts express "not a public URL" as `pattern: "^(?!https?://).+"`. CTR-JOB-001, in the same catalog, expresses the identical rule as `{"not": {"pattern": "^https?://"}}`. Negative lookahead is outside the regex subset JSON Schema recommends for interoperability and is unsupported by RE2-based validators. **Fix:** use the existing catalog form. |
| **R9** | Medium | Predicates are weaker than the contracts they compose. `validApiEnvelope` never checks `error.category`, and `validIdempotency` checks only `error.code` — both compose CTR-ERR-001, which **requires** `category`. An error with no `category` is accepted. `typeof null === 'object'`, so `{"kind":"success","data":null}` also passes. **Fix:** validate the composed contract, or add negative fixtures for these. |
| **R10** | Medium | `ctr-pag-001/manifest.json` declares `composes: ["CTR-API-001"]` but its schema contains no reference to CTR-API-001 of any kind. The new guard does not check that `composes` entries name real contracts or correspond to real references. **Fix:** add a guard assertion over `composes`. |
| **R11** | Low | Guard coverage (§4): seven misses and one false positive. A9 (`manifest.schema` ignored in favour of a hardcoded filename) and A10 (`shared-kernel` hardcoded while §5.3/§5.4 specify 25 contracts outside it) are the substantive ones. A4 (directory refs) and A7 (JSON Pointer false positive) are one-line fixes. |
| **R12** | Low | CTR-API-001 requires `request_id`/`correlation_id` at the envelope top level *in addition to* the copies §3.1 places inside `tenant_context`, with no rule tying the copies together. Unsourced structural duplication that permits an envelope whose two correlation IDs disagree. |
| **N-C1** | Carried forward | `x-amended-by` / `acknowledgement_status: "pending"` is read by no script, test, or CI job. Nothing prevents `pending` surviving to merge. |

**Things I checked and found correct**, so they are not findings: the guard is not
tautological and genuinely fails on the defect (§2); the cross-package correction is exactly
two literals plus the record (§6); `index.json` is untouched at 4 Candidate / 10 Draft (§7);
error `details` handling is faithful to CTR-ERR-001 and §3.4 (item 5); nothing contradicts
§3.1's Conditional fields or §3.4's error fields (item 6); every declared command reproduces
at the exit code claimed (§1); every fixture is synthetic; no valid fixture leaks a public
URL; all three contracts stay Draft; the freeze boundaries do genuinely decline several
inferences (API-004, API-006, auth rules, store/lock/retention) rather than making them.

---

## 10. Verdict

R2, R3 and R4 invent contract semantics with no baseline line behind them, which the
package's own acceptance criterion forbids in terms; R3 contradicts the freeze boundary
printed in the same file; R1 means the delivered CTR-PAG-001 schema does not contain the
rule the package is advertised as delivering; and R7 means the self-check a downstream role
would rely on states the opposite. These are corrections to the artifacts, not conditions
that a later role could discharge by attaching a note.

The D3 work itself is sound and the guard is real. That part I would approve on its own.

VERDICT: changes_requested
