# WP-0A-CON-002 — Author self-check

Author run: `/claude/a0_atlas` (Anthropic, `claude-opus-5`)
Base revision: `4e1d6e5` (branch `agent/claude/WP-0A-A0-002-contract-test-coverage`)
Branch: `agent/claude/WP-0A-CON-002-envelope-contracts`
Date: 2026-08-31

Author self-evidence only. Not review, security, test, integration, Product Owner,
or merge approval, and it does not move Gate G0.

## D3 — the guard was written first and observed to fail

`test-kits/contracts/catalog-reference-integrity.test.mjs` was written and run
**before** the two `$ref`s were corrected. Observed on pinned Node `24.20.0`:

```
ℹ tests 4   ℹ pass 3   ℹ fail 1

AssertionError: unresolved catalog $ref(s):
  contract-catalog/shared-kernel/ctr-evt-001/schema.json $.properties.tenant_context.$ref
    -> ../../ctr-ten-001/schema.json -> contract-catalog/ctr-ten-001/schema.json
  contract-catalog/shared-kernel/ctr-job-001/schema.json $.properties.tenant_context.$ref
    -> ../../ctr-ten-001/schema.json -> contract-catalog/ctr-ten-001/schema.json
```

After correcting both to `../ctr-ten-001/schema.json`: `tests 4 / pass 4 / fail 0`.

This ordering matters. A guard written after a fix proves only that the fix is
present; a guard observed failing on the defect proves it detects the defect.

### Why this survived WP-0A-CON-001's four independent roles

Not a review failure. `shared-kernel-contract-catalog.test.mjs` validates fixtures
with hand-written predicates and never resolves a `$ref`, so a dangling reference
is structurally invisible to it — and until WP-0A-A0-002 that file was executed by
no CI run at all. A test that cannot see the defect, which was not running anyway.

The two affected contracts are CTR-EVT-001 and CTR-JOB-001: the envelopes that
carry every domain event and every background job. Their entire declared tenant
isolation constraint pointed at a file that does not exist.

## Baseline sourcing — CORRECTED

**The original version of this section said "no invented semantics ... none was inferred".
That statement was false, and independent review proved it false in both directions.**
It is corrected here rather than rewritten, because it is the sentence downstream roles
relied on.

Three rules had no baseline source at all and have been REMOVED:

| Removed | Why |
|---|---|
| `page_size` maximum 100 | No page-size bound appears anywhere in `docs/`. A bound is a real enumeration-risk control, but choosing the number is the contract owner's decision. Now an `accepted-gap-` fixture. |
| cursor charset `^[A-Za-z0-9_-]+$` | No source, and self-contradictory: the same manifest declared the encoding deliberately unspecified, while the charset forbade standard base64 and any dot-separated signed token. |
| `payload_hash` pinned to `sha256` | The baseline says "payload hash" and names no algorithm for CTR-IDM-001. Pinning one forecloses a Security decision. Relaxed to an algorithm-prefixed form, citing `sprint-0a-stripe-billing-contract-th.md:284` `payload_sha256` as precedent for the SHAPE only. |

One rule was inferred correctly but **not declared as an inference**, which is a different
fault and equally misrepresented by the original sentence:

| Under-cited | Actual source |
|---|---|
| `sort` requires ≥2 keys | `asset-library-database-ux-spec-th.md` §5.2 specifies the keyset cursor `(created_at, id)` and prohibits deep offset. Combined with API-003's "stable ordering; no duplicate/missing between pages", the tiebreaker requirement follows. Now cited in the schema as a **declared inference**. |

Every rule below traces to a source line, or is declared as an inference from named
sources, or is recorded as an accepted gap. None is presented as sourced when it is not.

| Contract | Source | Rule materialized |
|---|---|---|
| CTR-API-001 | Workstream §D API-001 | "success/error/correlation serialize ได้และไม่ leak internal detail" — exactly one of `data`/`error`/`accepted`; error `details` must be empty |
| CTR-API-001 | Workstream §D API-005 | "`accepted` response + job/status/deep-link refs" — the `accepted` receipt shape |
| CTR-PAG-001 | Workstream §D API-003 | "Stable ordering; no duplicate/missing ระหว่าง page; cursor opaque/tamper-safe" — ≥2 sort keys so a tiebreaker exists, opaque cursor charset, bounded page size |
| CTR-IDM-001 | Workstream §G ID-001 | "key scope includes workspace+operation; payload hash mismatch conflict" |
| CTR-IDM-001 | Workstream §D API-002 | "request key เดิม+payloadเดิมคืนผลเดิม; payloadต่างกันได้ conflict" — the replay fixture pair shares key, scope and payload hash |

What each manifest's `freeze_boundary` explicitly declines to infer: CTR-API-001
auth rules, OpenAPI generation (API-006) and optimistic-concurrency preconditions
(API-004); the CTR-PAG-001 cursor encoding, signing algorithm and key management;
the CTR-IDM-001 store implementation, lock strategy, retention window and HTTP
header name. Only opacity and the absence of a client-decodable offset are
contractual for the cursor.

## Freeze level not moved

`contract-catalog/shared-kernel/index.json` is owned by WP-0A-CON-001 and is
**untouched**. It still reports 4 Candidate and 10 Draft, asserted by test.
Materializing a Draft contract's schema and fixtures does not promote it.

## Commands and exit codes

| Command | Exit | Result |
|---|---|---|
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` (pre-fix) | `1` | `tests 4 / pass 3 / fail 1` — both offending files named |
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` (post-fix) | `0` | `tests 4 / pass 4 / fail 0` |
| `npm run check` | `0` | `tests 59 / pass 59 / fail 0` (46 → 59) |
| `node --test test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | `0` | 9 tests |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-002.json` | `0` | no output |
| `node scripts/scan-repository-secrets.mjs` | `0` | no output (weak — see WP-0A-A0-002 Security C1) |

## Author-declared limitations

- This run authored the change and must not review, security-review,
  test-verify, or integrate it.
- The correction touches two WP-0A-CON-001 **delivered artifacts**, not just an
  ownership declaration. RFC-2026-004 records the authority; both schemas carry
  `x-amended-by` with `acknowledgement_status: pending` from `/root/r0_steward`.
  An Integration Owner must rule on whether amending delivered content carries
  the same authority as amending a boundary.
- No validator resolves `$ref` at runtime — the schemas are declarative artifacts
  and the tests use hand-written predicates. The new guard checks reference
  *integrity*, not that any consumer honours the reference. A future package
  introducing real schema validation should re-check this.
- This package depends on unmerged WP-0A-A0-002. Without it the ownership
  validator rejects these paths and CI executes no contract test at all.
- The `sha256:` payload-hash fixture uses a repeated-character digest. It is
  format-valid and synthetic by construction; it is not a real hash of any
  payload and must not be treated as one.


---

## Correction round — what the three independent runs found

`/claude/c0_contract_reviewer` returned `changes_requested`, `/claude/a1_bastion`
`security_approved_with_conditions`, `/claude/q0_sentinel` 17 gaps. All accepted.

### The blocking structural defect, and its root cause

The Reviewer found `ctr-pag-001/schema.json` declaring `sort.minItems: 1` while the
predicate, the manifest and the commit message all claimed a mandatory tiebreaker — so the
fixture named `invalid-unstable-sort-without-tiebreaker.json` was **valid against the
shipped contract**. The Tester generalised it: every `additionalProperties`, `pattern` and
`type` in every schema was decorative, because **nothing in this repository executed a
schema**. Extra keys carrying secrets passed at envelope, `tenant_context`, `accepted`,
`error` and `scope` level.

The Reviewer's judgement on this was the sharpest of the review: the package diagnosed the
root cause of D3 correctly and then shipped a fresh instance of it.

Fixed by writing `test-kits/contracts/json-schema-subset.mjs` — a dependency-free validator
covering only the keywords this catalog uses, where an **unknown keyword is an error** so a
schema can never appear to constrain something nothing enforces — and validating every
fixture against its own `schema.json`. Running it immediately reproduced the Reviewer's
finding, and now every rule the package claims lives in the contract rather than in a test.

### The guard did not protect the property it was built for

Security repointed `CTR-EVT-001`'s `tenant_context` at `ctr-err-001/schema.json` and **CI
stayed green**: the guard checked only that a target existed. The envelope carrying every
domain event could declare its tenant context to be the error schema.

Closed: a `$ref` must resolve to the contract it claims (`tenant_context` → `CTR-TEN-001`).
Verified by repointing it in a sandbox — the suite now fails with
`resolves to $id "CTR-ERR-001", expected CTR-TEN-001`.

Also closed from the same review: the guard read only `<dir>/schema.json`, so a `$ref` in a
manifest or a nested file was invisible; `access(F_OK)` succeeded on directories; the test
named "never escapes the catalog" **passed** on `https://evil.example/tenant.json`;
`manifest.schema: "../../../package.json"` passed; `CATALOG` was hardcoded to
`shared-kernel` while the baseline declares 25 more contracts elsewhere; and a
case-differing path passed on this case-insensitive filesystem while failing on ubuntu CI.

### Leakage

The reference deny-list rejected only a literal lowercase `http(s)` prefix. Security showed
`HTTPS://`, `//host`, `ftp:`, `data:`, `file:///etc/passwd`, `javascript:` and
`../../../etc/passwd` all passed. Replaced with an allow-list of internal schemes, tested
against all eight.

`data` on a success envelope — the branch carrying generated content — had no constraint at
all, while `EVT.payload` and `ERR.details` both use `maxProperties: 0`. This envelope cannot
constrain it, so the gap is now **declared** in the schema rather than left implicit.

### Claims stated but tested by nothing

The payload-hash conflict rule had **no test at all**; two records with the same key and
scope but different hashes were each accepted and nothing compared them. It is relational,
so it now has a relational check. Duplicate sort fields satisfying "≥2 keys",
`has_more: true` with `next_cursor` absent (`OPAQUE.test(undefined)` matched the string
`"undefined"`), and `data: null` / `data: []` are each now covered — and the `has_more`
rule is expressed in the **contract**, not only in a predicate.

`"no duplicate or missing item between pages"` cannot be demonstrated by fixtures at all,
since every `items` array is empty. It is declared in `untestable_by_fixture` instead of
being left to read as if it were materialized.

### Accepted gaps, kept visible

Two fixtures were reclassified from `invalid-` to `accepted-gap-`: a base64 cursor decoding
to `offset=40&limit=20`, and an unbounded `page_size`. The contract **accepts** both. The
earlier `invalid-` naming was doubly wrong — the rules had no baseline source, and the old
test passed only because the fixture happened to contain `=` and `&`, never because an
offset was detected. Each carries a required `accepted_gaps` explanation.

---

## Second correction round — the R7 defect reproduced inside the fix for R7

All three runs rejected the first rework. The Reviewer's sentence is the finding:
**"That is the original R7 defect reproduced inside the section written to correct
R7."** It is correct.

`^sha256:[0-9a-f]{64}$` and the cursor charset `^[A-Za-z0-9_-]+$` were removed from
the **schemas** and this document said "REMOVED" — while both kept running in the
**acceptance predicate that gates CI**. Measured: the schema accepts `blake3:…` and
`sha512:…`; the predicate rejected them. Two descriptions of one contract,
disagreeing in silence. That is the defect this package exists to close, committed
inside the correction for it.

Fixed structurally rather than by deleting two more lines: the predicate now
**defers every shape rule to the schema** and keeps only the relational rules a
JSON Schema cannot express, and a test asserts per fixture that the predicate never
rejects what the schema accepts. That guard was **vacuous** at first — no fixture
used a non-sha256 algorithm, so reintroducing the pin changed no observable
outcome, which is precisely how the pin survived deletion the first time. A witness
fixture (`valid-alternate-hash-algorithm.json`, `blake3:`) now makes it bite:
reintroducing the pin gives exit `1` with *"the predicate rejects what the shipped
schema accepts — a rule is being enforced in a test that the contract does not
state"*.

### The other blocking findings, all reproduced then closed

| Finding | Was | Now |
|---|---|---|
| Security S1 — a decoy `ctr-ten-001/schema.v2.json` carrying a forged `$id`, with `tenant_context` repointed at it: CI green while tenant context on every domain event dropped to "is an object" | exit 0 | exit **1** — a `$ref` may only target a contract's canonical `schema.json`, and no undeclared schema-like file may exist in a contract directory |
| Reviewer — nest the `$ref` under `allOf`, or rename the property, to skip a check keyed by property name | exit 0 | exit **1** — identity is bound to **location**: `$id` must match its own directory |
| Reviewer N4 — a manifest naming a schema other than `schema.json` escaped conformance entirely, shipping an `invalid-` fixture its schema accepted | exit 0 | exit **1** |
| Tester/Reviewer N2 — deleting `additionalProperties: false` from `CTR-TEN-001` made the leak guard **skip** that contract | exit 0 | exit **1** — every schema must declare it and the guard is no longer opt-out |
| Reviewer — laundering a real schema-only rule by renaming its counterexample `accepted-gap-` and padding an 81-character reason | exit 0 | exit **1** — a reason must name what is unresolved and who resolves it, and contain ≥20 distinct words |
| Security S3 — `result:../../../etc/passwd`, `status:/proc/self/environ`, `content://attacker.example.invalid/exfil` | accepted | rejected: the body is constrained, not just the scheme |
| Tester — `additionalProperties` in object form passed the keyword gate and enforced nothing | exit 0 | enforced; any other form is rejected rather than ignored |
| Tester/Reviewer — `$ref` siblings silently dropped; `format: date-time` accepted `"2026"`; `required` satisfied via the prototype chain | live | all three closed |
| Tester N3 — the duplicate-sort test asserted `1 < 2` and never touched the contract | could not fail | exercises the predicate, and the schema declares that JSON Schema **cannot** express distinct-by-property rather than faking it |

### What the acceptance criteria said that was not true

Criterion 5 claimed reference fields "reject … traversal forms". They did not.
Corrected in the manifest rather than quietly re-scoped.

### Escalated, not fixed here

- `CTR-JOB-001.input_ref` / `.result_ref` still carry the bypassable deny-list.
  That contract is **Candidate** and outside this package's writable paths.
- A JWT in `tenant_context.actor.id` passes everything — a string in a declared
  slot, and the secret scanner has no pattern for it. `CTR-TEN-001` is owned by
  WP-0A-CON-001.
- The validator implements only `format: date-time`; any other `format` value
  passes the gate and constrains nothing. No schema uses one today.

`npm run check`: **73/73**, skipped 0, todo 0.
