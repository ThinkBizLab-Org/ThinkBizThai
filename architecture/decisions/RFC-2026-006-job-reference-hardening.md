# RFC-2026-006 — CTR-JOB-001 reference-field hardening

Status: Approved 2026-09-02 by the Product Owner — the allow-listed scheme replaced the deny-list and a well-formed reference is still accepted. Limitations and Rollback in this document stand unchanged.
Decision needed by: before CTR-JOB-001 advances past Candidate, and before any module consumes the job envelope
Owner: A0 Architecture/Contracts
Protocol version: `1.0.0`

## Problem

### The measured defect

`contract-catalog/shared-kernel/ctr-job-001/schema.json` constrains both reference
fields with a **deny-list**:

```json
"input_ref":  { "type": "string", "minLength": 1, "not": { "pattern": "^https?://" } },
"result_ref": { "type": "string", "minLength": 1, "not": { "pattern": "^https?://" } }
```

`^https?://` matches a literal lowercase `http://` or `https://` prefix and nothing
else. Everything else is permitted, including every other way of writing the same
egress.

WP-0A-CON-002 recorded this as an escalated open blocker rather than changing a
Candidate contract outside its writable paths:

> CTR-JOB-001.input_ref and .result_ref still use the deny-list that independent
> security review proved bypassable at 106f91c: uppercase scheme,
> protocol-relative, file, data, javascript and traversal forms all pass. That
> contract is Candidate and outside this package writable paths, so it is
> escalated to its owner rather than changed here.

That escalation is what this RFC closes.

### Reproduced, not taken on trust

The escalation was re-measured against the schema **as shipped in this tree**, by
validating mutated copies of `examples/valid.json` with the repository's own
`test-kits/contracts/json-schema-subset.mjs`. Every form below was **accepted** on
both `input_ref` and `result_ref` — 28 of 30 probes accepted, the only two
rejections being the single literal lowercase form the deny-list was written for:

| Hostile form | Value | Shipped schema |
|---|---|---|
| lowercase `https` scheme | `https://public.example.invalid/x` | rejected |
| uppercase scheme | `HTTPS://public.example.invalid/x` | **ACCEPTED** |
| mixed-case scheme | `HtTpS://public.example.invalid/x` | **ACCEPTED** |
| protocol-relative authority | `//public.example.invalid/x` | **ACCEPTED** |
| `ftp:` | `ftp://public.example.invalid/x` | **ACCEPTED** |
| `data:` | `data:text/plain;base64,AA==` | **ACCEPTED** |
| `file:` | `file:///etc/passwd` | **ACCEPTED** |
| `javascript:` | `javascript:alert(1)` | **ACCEPTED** |
| path traversal | `../../../etc/passwd` | **ACCEPTED** |

The full before/after table for both fields is recorded in
`evidence/WP-0A-CON-005/author-self-check.md`.

### Why a scheme allow-list alone would not be enough

RFC-2026-004 already established this for CTR-IDM-001, and the reasoning carries
unchanged. An allow-listed scheme with a free body still passes
`result:../../../etc/passwd`, `status:/proc/self/environ`, `content:/.env` and
`content://attacker.example.invalid/exfil`. The body must be constrained too.

### Why the existing tests did not catch it

Not a review failure — the same coverage-shape failure RFC-2026-004 documents,
in a new place. Two suites touch these fields and neither could see the defect:

1. `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` asserted
   `jobSchema.properties.input_ref.not.pattern === '^https?://'`. It pinned the
   defective constraint **in place**: the contract was required by test to keep
   the deny-list, so a correct fix could not pass CI without amending that
   assertion.
2. The same file's hand-written acceptance predicate used
   `!/^https?:\/\//.test(fixture.input_ref)` — the identical deny-list, with the
   identical bypasses, and it did not examine `result_ref` at all.
3. The hostile-reference test in
   `test-kits/contracts/shared-kernel-schema-conformance.test.mjs` covers
   CTR-API-001 and CTR-IDM-001 only. CTR-JOB-001 is not one of its targets.

## Decision

1. **Add the standing guard.**
   `test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` validates every
   demonstrated hostile form against the shipped schema on **both** reference
   fields, asserts a well-formed reference is still accepted so the guard is not
   vacuously strict, and asserts the content-neutrality invariants this RFC's
   authority rests on. It was written before the fix and **observed to fail**,
   naming all 30 accepted `field=value` pairs.
2. **Replace the deny-list with an allow-listed scheme and a constrained body**,
   using the CTR-IDM-001 `result_ref` pattern **verbatim**:

   ```
   ^(job|status|result|app|asset|content):(?!/)(?!.*\.\.)[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$
   ```

   Both fields carry an `x-reference-rule` naming the demonstrated bypasses, so
   the next reader learns why the deny-list was insufficient rather than
   rediscovering it.
3. **Record the amendment** in `x-amended-by` with
   `acknowledgement_required_from: /root/r0_steward` and
   `acknowledgement_status: pending`.
4. **No freeze-level, version, or status movement.** CTR-JOB-001 stays
   `Candidate` at `1.0.0`; `contract-catalog/shared-kernel/index.json` is not
   touched and still reports 4 Candidate and 10 Draft.

## Authority for amending a Candidate contract's delivered content

`contract-catalog/shared-kernel/ctr-job-001/**` is a WP-0A-CON-001 output, and
that package is `integration_verified`. Amending it from WP-0A-CON-005 uses the
same `CONTRIBUTING_AGENTS.md` Integration Owner/RFC path that RFC-2026-003 and
RFC-2026-004 used. Independent review previously ruled that path sufficient for a
cross-package amendment without re-opening the owning package, and **bounded that
ruling to pre-freeze status, requiring independent structural proof of
content-neutrality by a non-Author run.** Both bounds are respected: CTR-JOB-001
is pre-freeze, and the structural proof below is offered as the Author's own
measurement to be **re-derived independently**, not as a substitute for it.

### This is heavier than RFC-2026-004, and it is stated as such

RFC-2026-004 changed two `$ref` string literals that were **broken** — they
resolved to a path that did not exist, so no consumer could have depended on
them. This amendment changes a constraint that **works**: it accepts values
today. Anything that has already produced a `synthetic://…` reference against
this envelope becomes invalid. Nothing in the repository has, because CTR-JOB-001
has no implementation and its only instances are the two synthetic fixtures in
its own directory — but the class of change is a tightening of accepted input,
not a correction of a dangling pointer, and the Integration Owner should dispose
of it with that difference in view.

It is nonetheless **corrective, not anticipatory**: the bypasses are real in the
tree today, demonstrated twice by two independent runs.

### What makes it content-neutral

Content-neutrality is claimed as a **measured structural property**, not an
assertion. The parsed schema before and after was compared leaf path by leaf
path:

| | count |
|---|---|
| leaf paths before | 60 |
| leaf paths after | 67 |
| identical | 53 |
| removed | 7 |
| added | 14 |
| modified in place | 0 |

Every one of the 21 differing leaf paths falls into exactly three groups:

- **The two reference constraints** — `$.properties.input_ref.not.pattern` and
  `$.properties.result_ref.not.pattern` removed; `.pattern` and
  `.x-reference-rule` added on each. Four added, two removed.
- **The `x-amended-by` container shape.** A second record cannot share an object
  key with the first, so the annotation becomes an array. The five
  WP-0A-CON-002 leaves move from `$.x-amended-by.*` to `$.x-amended-by[0].*` with
  their values **deep-equal and unchanged** — asserted mechanically, not by eye —
  and five new leaves appear at `$.x-amended-by[1].*`. This is a relocation of an
  annotation that constrains nothing; `x-` keywords are ignored by the subset
  validator by design. It is called out rather than buried because the leaf paths
  do change.
- **Nothing else.** Strip `x-amended-by` and reduce both reference properties to
  `{type, minLength}`, and the before and after schemas are structurally
  identical.

Positively stated, and asserted by the standing guard so it cannot silently
regress:

- No property added or removed. The property key set is byte-identical.
- The `required` list is byte-identical.
- `tenant_context.$ref` is unchanged, so RFC-2026-004's correction is preserved.
- `additionalProperties: false` at the root is unchanged.
- `manifest.version` stays `1.0.0`; `manifest.status` stays `Candidate`;
  `index.json` is untouched and its CTR-JOB-001 entry still reads
  `1.0.0` / `Candidate`.
- The top-level key set of the schema document is unchanged: `x-amended-by`
  already existed.

### Two fixture changes are forced, and they are part of this amendment

The shipped `examples/valid.json` and `examples/invalid-max-attempts.json` both
carry `input_ref: "synthetic://input/00000000-0000-4000-8000-000000000202"`.
`synthetic` is not an allow-listed scheme and `//` is the protocol-relative
authority form the new rule rejects, so **the shipped valid fixture does not
satisfy the tightened schema**. Both were changed to
`asset:input/00000000-0000-4000-8000-000000000202` — the scheme token only; the
path is identical, and every other leaf in both fixtures is unchanged. Without
this the conformance suite fails on `valid.json`.

That this fixture had to change is itself evidence of the defect's reach: the
contract's own reference example was written in a form the envelope's stated
intent excludes.

### A third WP-0A-CON-001 file must change, and this is the least comfortable part

`test-kits/contracts/shared-kernel-contract-catalog.test.mjs` is also a
WP-0A-CON-001 output, and it cannot be left alone:

- Its two assertions pinning `.not.pattern === '^https?://'` make the **defect
  mandatory**. Any correct fix fails them. They are amended to assert the
  allow-list pattern and to assert the deny-list is *absent*.
- Its acceptance predicate used the same bypassable deny-list. Left unchanged, the
  new negative fixture `invalid-public-input-ref.json` — which uses the uppercase
  form — would **pass** that hand-written predicate while the shipped schema
  rejects it, and the suite's own
  `assert.equal(validatesCandidateFixture(...), !path.includes('/invalid-'))`
  would fail. That is precisely the predicate/schema divergence RFC-2026-004 and
  the conformance suite exist to eliminate. The predicate is aligned to the
  shipped constraint and extended to cover `result_ref`, which it never checked.

This is an amendment to another package's **test**, not to its contract, and it
strictly narrows what that test accepts. It is listed explicitly in
WP-0A-CON-005's `authorized_cross_package_amendments` and is covered by the same
`/root/r0_steward` acknowledgement.

### And one file belonging to WP-0A-A0-002

`test-kits/integrity-manifest.json` is a WP-0A-A0-002 output. Adding the standing
guard forces an entry there — `verify-test-coverage-floor.mjs` exits `87` on a
discovered-but-undigested test file and `86` when a digested file's bytes change
— and the manifest's own `cross_package_note` pre-declares that coupling: *"Any
package that adds a test file must add it here."* All 27 digests were recomputed
over file **bytes**; exactly two entries differ, which is itself the evidence that
no other protected file drifted. Acknowledgement for this one runs to
WP-0A-A0-002's Integration Owner `/claude/r0_steward`, not `/root/r0_steward`.

### Acknowledgement required

`/root/r0_steward` is CTR-JOB-001's Integration Owner as WP-0A-CON-001's
Integration Owner. The `x-amended-by` record carries
`acknowledgement_status: pending`. **No script, test, or CI job in this
repository reads that field** — a limitation carried forward unresolved from the
WP-0A-CON-002 contract review (N-C1). Nothing here prevents `pending` surviving to
merge; the only control is human review of the diff under RFC-2026-002.

## Scope explicitly excluded

`contract-catalog/shared-kernel/index.json` (owned by WP-0A-CON-001 and
unchanged), contract freeze-level advancement, contract version advancement,
package status advancement, the other twelve catalog contracts, production
schema, migrations, RLS implementation, provider SDKs, credentials, customer
data, network calls, Gate G0 approval, and any merge authorization.

The scheme allow-list itself is **not** decided by this RFC. It is adopted from
CTR-IDM-001 for consistency across the catalog; whether
`job|status|result|app|asset|content` is the right closed set for a job envelope
is a contract-owner decision recorded as an open blocker, not settled here.

## Verification

- `npm run check` on pinned Node `24.20.0` / npm `11.19.0` — exit `0`, 93 tests,
  `skipped 0` / `todo 0`.
- The standing guard must **fail** on the pre-fix schema naming the accepted
  forms, and pass after. Both runs recorded in
  `evidence/WP-0A-CON-005/author-self-check.md`.
- Every hostile form rejected on **both** reference fields, and a well-formed
  reference still accepted on both.
- The leaf-path diff above, re-derivable from the recorded commands.
- CTR-JOB-001 still `Candidate` at `1.0.0` in both its manifest and `index.json`.

## Rollback

Revert through a reviewed revert PR. Reverting restores the deny-list exactly,
restores the two fixtures' `synthetic://` values, removes the negative fixture
and the standing guard, and restores the two WP-0A-CON-001 test assertions. The
change creates no persisted data, provider state, credential, migration, or
customer-data effect. Reverting also restores the bypasses, so a revert should be
paired with re-opening the WP-0A-CON-002 escalation rather than closing it.

## Limitations

- Does not approve Gate G0, does not authorize a merge, does not advance any
  contract freeze level or version, and does not substitute for the independent
  Reviewer, Tester, Security, or Integration Owner evidence RFC-2026-002 requires.
- The `/root/r0_steward` acknowledgement is `pending` and is read by nothing
  automated.
- A constrained reference **string** is not an authorization decision. This
  schema still cannot express that a workspace may read a given object; that is
  an RLS and application-port concern and remains entirely outside the contract.
- The allow-list is a shape rule. A reference of the correct shape naming another
  tenant's object passes, because the envelope carries no binding between
  `tenant_context.workspace_id` and the reference body. That binding is not
  invented here.
- The negative fixture demonstrates one hostile form. The other fifteen are
  covered by the standing guard, not by a fixture on disk.
- The catalog was swept for the same defect shape and CTR-JOB-001 was the last
  deny-list in it: after this amendment no `not: { pattern: … }` reference
  constraint remains in any of the fourteen contracts, and `status_ref`,
  `deep_link_ref`, `result_ref`, `input_ref` all carry the identical allow-list.
- That sweep did find one adjacent gap this package does **not** close:
  `ctr-evt-001` `metadata.schema_ref` is an unconstrained
  `{ type: "string", minLength: 1 }` — no scheme rule of any kind, so every form
  tabulated above is accepted there. CTR-EVT-001 is Candidate and a
  WP-0A-CON-001 output outside this package's authorized amendment set, so it is
  escalated to its owner rather than changed here, exactly as WP-0A-CON-002
  escalated CTR-JOB-001 to this package.
