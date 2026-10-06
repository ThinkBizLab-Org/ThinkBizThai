# WP-0A-CON-002: Author closure of the role-verdict conditions, 2026-10-06

Author: `/claude/a0_atlas`. This record was written by a subagent of that run, in the same vendor and
model family as every role run on this package. It acts as the Author and approves nothing.
Branch: `agent/claude/WP-0A-CON-002-restore-rfc-002`, cut from `origin/main` `8c089cc`.

## 0. What this is and is not

- Author evidence only. It does not review, test-verify, integrate or gate-approve anything, it
  countersigns no acknowledgement, and it does not move the package past `in_review`. The status
  was already `in_review` and stays there.
- The verdicts it answers are the latest role files on this package, all three at head `28d3142`
  (2026-08-31): `review-contract-rework.md` §8-§10 (Reviewer `/claude/c0_contract_reviewer`,
  `changes_requested`), `review-security-rework.md` Findings and Conditions (Security
  `/claude/a1_bastion`, `security_changes_requested`) and `test-verdict-rework.md` attack table and
  Additional findings (Tester `/claude/q0_sentinel`, `test_verified_with_conditions`). No Integration
  verdict exists. These are therefore **first** verdicts to be re-verified, not earlier passes: every
  one is five weeks and many merged packages older than `main`.
- The Owner's step-2 decisions are applied from
  `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` (merged in PR #186). The
  Owner's reply was `บืนยันขั้น 2`.
- This branch changes no RFC, no `CONTRIBUTING_AGENTS.md`, no CI file and no gate rule, so it is not a
  governance PR under RFC-2026-025 §5 item 6. It changes no contract file either.

## 1. How each finding was re-measured

Every finding below that a mutation can express was re-run against a fresh `git archive` extraction
of `main` `8c089cc` in the scratchpad, one extraction per probe, with the mutation applied and then
`node --test test-kits/contracts/*.test.mjs` plus `node scripts/verify-test-coverage-floor.mjs`. The
unmutated extraction: contract suites 79/79, exit 0; floor exit 0. "Fails closed" means at least one
of the two exits non-zero.

| Probe (finding) | Mutation | Contract suites | Floor | Caught by (first test names) |
|---|---|---|---|---|
| S3 / A3 traversal | `status_ref: "result:../../../etc/passwd"` in a `valid-` fixture | 1 (2 fail) | 0 | `every valid fixture is accepted…`, `every fixture agrees with its own shipped schema…` |
| S3 authority | `result_ref: "content://attacker.example.invalid/exfil"` | 1 (3 fail) | 0 | same, plus `a replayed key…` |
| A3 deep link | `deep_link_ref: "content:../../secret"` | 1 (2 fail) | 0 | same |
| S10 length | a 4007-character `status_ref` | 1 (2 fail) | 0 | same (`maxLength: 256`, present since `653f699`) |
| M3 | delete `deep_link_ref.pattern` | 1 (5 fail) | 0 | `every allow-listed reference scheme…`, `every contract reaches the mutation-coverage floor`, `no constraint value changes…` |
| N2 / M4 / M4b | delete root `additionalProperties` of `ctr-ten-001` | 1 (6 fail) | 0 | mutation coverage, constraint record, `Candidate fixture validator…`, conformance |
| S6 | delete `actor.additionalProperties` (nested) of `ctr-ten-001` | 1 (4 fail) | 0 | same family |
| M6 | delete `shared-kernel-schema-conformance.test.mjs` | 0 (73/73) | **91** | coverage floor: the digested file `cannot be inspected: ENOENT` |
| N3 / b1 | duplicate `created_at` sort keys in a `valid-` fixture | 1 (3 fail) | 0 | `duplicate sort fields do not count as a tiebreaker`, predicate/schema agreement |
| A4 | two `valid-` idempotency records, same key and scope, different `payload_hash` | 1 (2 fail) | 0 | `a replayed key…`, `the same key with a different payload is a conflict…` |
| V4 (date) / b6b | `created_at: "2026"` | 1 (2 fail) | 0 | conformance (RFC 3339 check) |
| A5 | `../CTR-TEN-001/schema.json` (directory case) | 1 (2 fail) | 0 | `every $ref points at a canonical contract schema whose $id matches its directory` |
| A6 | `filter: {$ref: "#/$defs/doesNotExist"}` | 1 (10 fail) | 0 | annotation and mutation-coverage ratchets |
| A11 | `filter: {$ref: {…object…}}` | 1 (10 fail) | 0 | same |
| B8 | nested `ctr-api-001/nested/manifest.json` | 1 (2 fail) | 0 | `no file under the catalog is undeclared…`, `a contract directory contains no undeclared schema-like file` |
| N8 | add `x-required: ["secret_field"]` at the root of `ctr-pag-001` | 1 (1 fail) | 0 | `an annotation cannot be rewritten, deleted or added without being written down` |
| C2 / A5 (laundering) | delete a `ctr-pag-001` rule and add an `accepted-gap-` fixture with a 40-word reason | 1 (6 fail) | 0 | `an accepted gap cannot be rewritten into a reassurance`, `the fixture set is what it was…` |
| S7 | `tenant_context: {$ref: "#/$defs/missing"}` | 1 (9 fail) | 0 | mutation-coverage and root-required ratchets |
| S8 | `filter: {$ref: "../ctr-pag-001/schema.json"}` (self-reference) | 1 (9 fail) | 0 | ratchets; a pure `$ref` cycle reached by `validate()` throws `RangeError`, which fails the test loudly |

Unit measurements against `test-kits/contracts/json-schema-subset.mjs` at `8c089cc`:
`validate({type:'string',minLength:2}, '\u{1F600}')` returned `[]` (accepted), and
`validate({type:'string',maxLength:1}, '\u{1F600}')` rejected. That is Q0's V4, still open at `main`.

## 2. Conditions, one by one

"Closed at main" means a later merged package closed it and §1 measures it closed. "Closed here" means
an edit on this branch inside `writable_paths`. "Owed" means it cannot be closed from this package's
writable paths, or it is a decision this package may not make; the owner is named.

### Reviewer (`/claude/c0_contract_reviewer`, `review-contract-rework.md`)

| Finding / condition | State | Evidence |
|---|---|---|
| N1 / C1: `sha256:` pin and cursor charset left in the predicate | **Closed at main** | `7b1e228`; the predicate keeps only relational rules, and `the predicate and the shipped schema agree on every fixture` fails if the predicate rejects what the schema accepts. |
| N2: the `additionalProperties` guard self-disables | **Closed at main** | `every catalog schema closes its root against undeclared properties`; §1 M4 fails closed. |
| N3: E2 tautological; duplicate sort fields accepted | **Closed at main** | The test exercises `validPage`; `invalid-sort-duplicated.json` exists; the schema declares `x-distinct-fields-rule` and `untestable_by_schema`. §1 b1. |
| N4: a contract can opt out of conformance by naming another schema file | **Closed at main** | `contracts()` throws unless `manifest.schema` is exactly `schema.json`. |
| N5: CTR-JOB-001 on the deny-list | **Closed at main** by WP-0A-CON-005 (RFC-2026-006, approved 2026-09-02); `input_ref`/`result_ref` carry the allow-list. |
| N6: validator holes V1-V4 | **V1, V2, V3 and the date-time half of V4 closed at main**; Q0's length-unit V4 **closed here** | `$ref` siblings evaluated; `additionalProperties` schema form enforced; unknown `format` fails closed; RFC 3339 enforced. Length now counts code points (§3). |
| N7: `ctr-pag-001` `source_references` omits the asset-library spec | **Owed**: the contract owner (A0), through the Candidate change path | CTR-PAG-001 is Candidate since 2026-09-02 (RFC-2026-010). A manifest edit to a Candidate contract is not taken here; the inference is still stated in `x-tiebreaker-rule` and `freeze_boundary`. |
| N8: `x-` keys uninspected | **Closed at main** (in substance) | §1 N8: an added `x-required` fails the annotation ratchet. `assertSchemaSupported` still skips `x-` keys; the catalog ratchet is the control. |
| C2: `accepted_gaps` need an acknowledgement field and a `freeze_boundary` cross-reference | **Laundering closed at main; the structural field owed** | §1 C2 fails closed. Adding `acknowledgement_required_from` per gap changes the manifest shape of Candidate contracts and the registry that pins it: contract owner (A0) with the registry owner, before freeze. |
| C3: identity from the resolved path; `$id` = directory for all contracts | **Closed at main** | `every $ref points at a canonical contract schema whose $id matches its directory`. §1 A5. |
| C4: amendment staged, RFC-2026-004 Proposed | **RFC closed; acknowledgement owed** | RFC-2026-004 line 3: Approved 2026-09-02. Both `x-amended-by` records naming WP-0A-CON-002 (`ctr-evt-001/schema.json:130-136`, `ctr-job-001/schema.json:106-112`) are still `pending`; now owed by `/claude/r0_steward` (Owner step 2 item 2). Those files are WP-0A-CON-001's, outside this package. |
| A5 directory case, A6, A9, A11, B1, B3-B5, B8 | **Closed at main** | §1 rows A5, A6, A11, B8; B1/B3-B5 by the location binding; A9 by N4. |
| A7: a legitimate cross-file JSON Pointer is a false positive | **Superseded by design** | A `$ref` may now target only a contract's canonical `schema.json`, so a fragment target is refused deliberately, not mis-resolved. |
| R6: the `accepted` receipt lives in CTR-API-001 | **Owed**: contract owner, before freeze | Unchanged; a catalog-row decision. |
| R10: `composes` validated by nothing | **Pinned at main; meaning owed** | `catalog-registry.test.mjs:702-716` pins every `composes` list. Whether CTR-PAG-001 composes CTR-API-001 with no reference is the contract owner's question. |
| R12: duplicated `request_id`/`correlation_id` | **Owed**: contract owner, before freeze | Unchanged. |
| N-C1: `acknowledgement_status` read by nothing | **Open; owed** to the owner of `scripts/` and CI (Integration Owner path) | `ctr-job-001-reference-hardening.test.mjs:145` reads it only as an enum; self-countersigning is still undetected (WP-0A-CON-005 blocker 1). |

### Security (`/claude/a1_bastion`, `review-security-rework.md`)

| Finding / condition | State | Evidence |
|---|---|---|
| Condition 1 / S3: traversal and authority in an allowed scheme | **Closed at main; assertion widened here** | The pattern refuses `..`, a leading `/` and `//`. §1 S3 rows. The hostile-scheme test now names both S3 forms (§3). |
| Condition 2 / S1, S2: decoy file, name-keyed identity | **Closed at main** | Location binding and the undeclared-file test. |
| Condition 3 / S4: CTR-JOB-001 deny-list | **Closed at main** by WP-0A-CON-005. |
| S5: `filter` and `items` undeclared containers | **Closed at main** | Both carry `x-leakage-boundary`. |
| S6: nested `additionalProperties` asserted by nothing | **Closed at main** | The extra-key test mutates every direct object property; the mutation-coverage ratchet holds the rest (§1 S6). |
| S7: a negative fixture passes vacuously on an unresolvable `$ref` | **Closed at main** | §1 S7 fails closed. |
| S8: no cycle guard | **Fails closed, no guard added** | A cycle throws `RangeError` and the test fails. A depth limit would give a clearer message, not a different verdict. |
| S9: `required` satisfied through the prototype chain | **Closed at main** | `Object.hasOwn`. |
| S10: references unbounded | **Closed at main**: `maxLength: 256` on every reference field, present since `653f699`. §1 S10. |
| Condition 5 / S11: cursor and page-size gaps mechanically freeze-blocking | **Pinned at main; freeze-blocking owed** | Registry ratchet `the fixture set is what it was, and each accepted gap still demonstrates itself` keeps both gaps present. No freeze gate reads them: owed to the owner of `contract-catalog/shared-kernel/index.json` and the register (both read-only here). |
| C1: the secret scanner has no privacy dimension; JWT in `actor.id` | **Scanner half closed at main; contract half owed** | `open_blockers[12]`: owed to CTR-TEN-001's owner WP-0A-CON-001. PR #186 R4 reads it as pre-existing. |

### Tester (`/claude/q0_sentinel`, `test-verdict-rework.md`)

| Finding | State | Evidence |
|---|---|---|
| A3 traversal, A4 conflicting records, A5 81 `x`, b1, b6b | **Closed at main** | §1 rows. The gap reason now needs 20 distinct words and an owner phrase. |
| d1 JWT in `actor.id` | **Owed** to WP-0A-CON-001 | As Security C1. |
| d2, d3 `data` | **Declared gap**, accepted as declared by Security | `x-leakage-boundary`. |
| M3 `deep_link_ref` unpinned | **Closed at main; held directly here** | §1 M3 fails closed through the mutation ratchet. The hostile-scheme test now also targets `deep_link_ref` (§3). |
| M4, M4b | **Closed at main** | §1 M4. |
| M6 the suite can be deleted | **Closed at main** | §1 M6: floor exit 91. |
| V1e, V2, V3 | **Closed at main** | As N6. |
| V4 `minLength` counted in UTF-16 units | **Closed here** | §3. |

### Referred to this package by WP-0A-CON-005

| Item | State |
|---|---|
| C0 F6: the hand-written `isPrivateRef` predicate prints the lookahead form the schemas lost at `64d9c65` | **Closed here for WP-0A-CON-002's predicate** (§3). The `REFERENCE_PATTERN` copy in `shared-kernel-contract-catalog.test.mjs` is WP-0A-CON-001's and is not touched. |
| A1 C1: `x-amended-by` on `ctr-api-001`/`ctr-idm-001` for the `64d9c65` lookahead removal | **Owed, and the owner is misattributed.** WP-0A-CON-005 records it as owed by WP-0A-CON-001's owner, but `contract-catalog/shared-kernel/ctr-api-001/**` and `ctr-idm-001/**` are in **this** package's `writable_paths`. Not done here: both are Candidate contracts, and adding an annotation is a change the annotation ratchet requires to be written down in `catalog-registry.test.mjs`, which this package does not own. Owed by this package's Author with the registry owner, acknowledged by `/claude/r0_steward`. |

## 3. What this branch changes

| File | Change | Observed to bite |
|---|---|---|
| `test-kits/contracts/json-schema-subset.mjs` | `minLength`/`maxLength` count code points (`[...value].length`), as JSON Schema does. | With the fix reverted, `every catalog schema uses only keywords this validator actually enforces` fails (5/6). |
| `test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | Two assertions for the unit; the hostile-scheme test also targets `accepted.deep_link_ref` and carries the two S3 forms. No test added or renamed. | With `deep_link_ref.pattern` deleted, `a reference field rejects every scheme outside its allow-list` fails (4/6). |
| `test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | `isPrivateRef` uses `PRIVATE_REF`, the schemas' lookahead-free pattern; the agreement test asserts its `source` equals the `pattern` of `status_ref`, `deep_link_ref` and `result_ref`. No test added or renamed. | With `(?!\/)` reinserted, `the predicate and the shipped schema agree on every fixture` fails (14/15). The old and new patterns agreed on 500,000 random strings. |
| `test-kits/integrity-manifest.json` | Three digests, regenerated by `npm run regenerate:manifest`. | (WP-0A-A0-002's file, declared in `amends_without_owning`.) |
| `work-packages/WP-0A-CON-002.json` | Owner step 2 applied (§4); blockers 1 and 8 updated in place; two blockers appended; `amends_without_owning` rewritten for this increment. | |

No contract, schema, fixture, index entry or freeze level changes. The assertion counts rise and no
test is added or renamed, so `scripts/test-suite-contract.mjs` (read-only here) does not move.

## 4. The Owner's step 2, applied to this manifest

| Item | Applied |
|---|---|
| 1. Cross-vendor exception for all 15 packages | `independence.prefer_cross_vendor_review: false`; `cross_vendor_exception` replaced by a sentence recording the withdrawal (RFC-2026-024 §3/1-2). Independence remains §3/3-4. `open_blockers[8]` closed in place, text kept. |
| 2. `/claude/r0_steward` succeeds `/root/r0_steward` | `open_blockers[1]` and `required_human_authorities` name the successor. Both `x-amended-by` records stay `pending`: naming a successor is not the acknowledgement. |
| 3. No Product reviewer for contract packages | `role_assignments.product_reviewer_note` records the null as a decision. |

## 5. Owed before this package can leave `in_review`

1. C0, A1 and Q0 re-verification at this branch's head (the verdicts in §0 are against `28d3142`),
   then a `/claude/r0_steward` Integration verdict.
2. `/claude/r0_steward` acknowledgement of the two RFC-2026-004 `x-amended-by` records.
3. Contract-owner decisions recorded in `open_blockers[2]`, `[3]` and `[5]` (cursor integrity,
   page-size bound, hash algorithm; the last is a Security decision), plus N7, C2's structural
   field, R6, R10 and R12 above: before freeze, through the Candidate change path.
4. `open_blockers[0]` remainder: no required pull-request review exists. Read-only on 2026-10-06:
   `gh api …/branches/main/protection` returned `strict: true`, `contexts: ["bootstrap"]`,
   `enforce_admins: true`, and no `required_pull_request_reviews`. Retiring RFC-2026-002 needs an RFC
   by the Owner.
