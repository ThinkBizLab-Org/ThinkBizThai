# WP-0A-CON-005 — Author self-check

Package: CTR-JOB-001 reference-field hardening
Decision record: `architecture/decisions/RFC-2026-006-job-reference-hardening.md`
Author run: `/claude/a0_atlas`
Protocol version: `1.0.0`

**This is the Author's own evidence. It is not review, not test verification, and
not integration verification.** Every number below must be re-derived by the
independent Reviewer, Tester, Security reviewer, and Integration Owner before
this package moves past `backlog`.

## Toolchain

| | |
|---|---|
| `node --version` | `v24.20.0` (exit `0`) |
| `npm --version` | `11.19.0` (exit `0`) |

The default `node` on this machine is `v26.7.0`. Every command below was run
through `zsh -lc` so the pinned `24.20.0` from `.node-version` is on `PATH`.
`node scripts/verify-toolchain.mjs` exits `0`, which is the machine check that
this actually happened.

## 1. The defect, measured before anything was changed

The escalation recorded on WP-0A-CON-002 was **not taken on trust**. A probe
loaded `contract-catalog/shared-kernel/ctr-job-001/schema.json` **as shipped**,
resolved its one external `$ref` the same way the conformance suite does, and
validated mutated copies of `examples/valid.json` with the repository's own
`test-kits/contracts/json-schema-subset.mjs` — the same validator the conformance
suite uses, not a re-implementation.

The unmodified `examples/valid.json` was accepted by the shipped schema, so the
probe was measuring the reference field and nothing else.

### Before / after, every hostile form, both fields

`before` = the deny-list `not: { pattern: "^https?://" }` as shipped.
`after` = the allow-listed scheme with a constrained body.

| # | Hostile form | Value | `input_ref` before | `input_ref` after | `result_ref` before | `result_ref` after |
|---|---|---|---|---|---|---|
| 1 | lowercase `https` scheme | `https://public.example.invalid/x` | rejected | rejected | rejected | rejected |
| 2 | uppercase scheme | `HTTPS://public.example.invalid/x` | **ACCEPTED** | rejected | **ACCEPTED** | rejected |
| 3 | protocol-relative authority | `//public.example.invalid/x` | **ACCEPTED** | rejected | **ACCEPTED** | rejected |
| 4 | `ftp:` | `ftp://public.example.invalid/x` | **ACCEPTED** | rejected | **ACCEPTED** | rejected |
| 5 | `data:` | `data:text/plain;base64,AA==` | **ACCEPTED** | rejected | **ACCEPTED** | rejected |
| 6 | `file:` | `file:///etc/passwd` | **ACCEPTED** | rejected | **ACCEPTED** | rejected |
| 7 | `javascript:` | `javascript:alert(1)` | **ACCEPTED** | rejected | **ACCEPTED** | rejected |
| 8 | bare traversal | `../../../etc/passwd` | **ACCEPTED** | rejected | **ACCEPTED** | rejected |
| 9 | allow-listed scheme + traversal body | `result:../../../etc/passwd` | **ACCEPTED** | rejected | **ACCEPTED** | rejected |
| 10 | allow-listed scheme + absolute body | `status:/proc/self/environ` | **ACCEPTED** | rejected | **ACCEPTED** | rejected |
| 11 | allow-listed scheme + dotfile body | `content:/.env` | **ACCEPTED** | rejected | **ACCEPTED** | rejected |
| 12 | allow-listed scheme + authority body | `content://attacker.example.invalid/exfil` | **ACCEPTED** | rejected | **ACCEPTED** | rejected |
| 13 | the value the shipped fixture used | `synthetic://input/…202` | **ACCEPTED** | rejected | **ACCEPTED** | rejected |
| 14 | well-formed private reference | `asset:input/…202` | ACCEPTED | ACCEPTED | ACCEPTED | ACCEPTED |
| 15 | well-formed private reference | `result:job/…203` | ACCEPTED | ACCEPTED | ACCEPTED | ACCEPTED |

Totals across the 30 probes (15 forms × 2 fields):

| | before | after |
|---|---|---|
| accepted | **28** | 4 |
| rejected | 2 | 26 |

Rows 1–8 are the eight forms the task and the WP-0A-CON-002 escalation name.
**Seven of the eight passed the shipped schema on both fields.** Only the single
literal lowercase form the deny-list was written for was caught. Rows 9–12 are
the four forms the CTR-IDM-001 `x-reference-rule` records as defeating a scheme
allow-list with a free body; they are included so the fix is measured against the
stronger bar, not only the deny-list's.

Rows 14–15 are the negative control. A guard that rejected everything would be
useless, and the `after` column shows the tightened constraint still accepts a
well-formed reference on both fields.

The standing guard additionally covers a mixed-case scheme
(`HtTpS://…`), an empty body (`job:`) and an empty path segment (`job:a//b`),
all rejected after; the mixed-case form was accepted before.

## 2. The guard was observed to fail before the fix

`test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` was written before
the schema was changed. It was then run a second time against the pre-fix schema,
temporarily restored in place and reverted immediately afterwards. The schema's
digest is
`3746f08e35229b731667f1eaba19eb37fa69108ac293125cbf4532acdef25a39` both before
and after that temporary restore, so the regression left no residue:

| | pre-fix schema | post-fix schema |
|---|---|---|
| exit code | `1` | `0` |
| tests / pass / fail | 6 / 2 / **4** | 6 / **6** / 0 |

The failure named all 30 accepted `field=value` pairs, e.g.
`CTR-JOB-001 accepts hostile reference(s): input_ref=HTTPS://public.example.invalid/x, …, result_ref=synthetic://input/…`.
The two tests that still passed on the pre-fix tree were the negative control
(a well-formed reference was always accepted) and the content-neutrality
invariants (the property set was never what changed) — which is the correct
behaviour for both.

## 3. Structural proof of content-neutrality

Both schemas were parsed and flattened to leaf paths, then compared path by path.

```
contract-catalog/shared-kernel/ctr-job-001/schema.json
leaf paths before: 60    after: 67
identical: 53    removed: 7    added: 14    modified in place: 0
```

**Zero leaf paths were modified in place.** Every one of the 21 differing paths
is listed below in full — this is the complete set, not a sample.

### Removed (7)

| Leaf path | Before |
|---|---|
| `$.properties.input_ref.not.pattern` | `"^https?://"` |
| `$.properties.result_ref.not.pattern` | `"^https?://"` |
| `$.x-amended-by.work_package_id` | `"WP-0A-CON-002"` |
| `$.x-amended-by.decision_record` | `"…/RFC-2026-004-catalog-reference-integrity.md"` |
| `$.x-amended-by.change` | the RFC-2026-004 `$ref` correction text |
| `$.x-amended-by.acknowledgement_required_from` | `"/root/r0_steward"` |
| `$.x-amended-by.acknowledgement_status` | `"pending"` |

### Added (14)

| Leaf path | After |
|---|---|
| `$.properties.input_ref.pattern` | the CTR-IDM-001 allow-list pattern |
| `$.properties.input_ref.x-reference-rule` | the rule text naming the demonstrated bypasses |
| `$.properties.result_ref.pattern` | the same pattern, character-identical |
| `$.properties.result_ref.x-reference-rule` | the same rule text |
| `$.x-amended-by[0].work_package_id` | `"WP-0A-CON-002"` |
| `$.x-amended-by[0].decision_record` | `"…/RFC-2026-004-catalog-reference-integrity.md"` |
| `$.x-amended-by[0].change` | the RFC-2026-004 `$ref` correction text |
| `$.x-amended-by[0].acknowledgement_required_from` | `"/root/r0_steward"` |
| `$.x-amended-by[0].acknowledgement_status` | `"pending"` |
| `$.x-amended-by[1].work_package_id` | `"WP-0A-CON-005"` |
| `$.x-amended-by[1].decision_record` | `"…/RFC-2026-006-job-reference-hardening.md"` |
| `$.x-amended-by[1].change` | this amendment's text |
| `$.x-amended-by[1].acknowledgement_required_from` | `"/root/r0_steward"` |
| `$.x-amended-by[1].acknowledgement_status` | `"pending"` |

### Reading the diff honestly

The 7 removed and 14 added paths are **not** 21 independent changes. They are:

1. **The two reference constraints** — 2 removed, 4 added. This is the intended
   change and the whole package.
2. **A container-shape change to an annotation** — 5 removed, 5 added, at the
   same five field names. Two records cannot share one object key, so
   `x-amended-by` becomes an array. This is a **relocation, not an edit**:

   ```
   assert.deepStrictEqual(after['x-amended-by'][0], before['x-amended-by'])  →  PASS
   ```

   The WP-0A-CON-002 record is carried forward deep-equal, asserted
   mechanically. `x-` keywords are ignored by the subset validator by
   construction (`assertSchemaSupported` skips any key starting with `x-`), so
   this changes nothing any validator enforces. I am calling it out rather than
   folding it into "annotation only" because the leaf paths genuinely do move,
   and a reviewer diffing paths will see it.
3. **Nothing else.** 53 of 60 pre-existing leaf paths are byte-identical.

### The neutrality claim, stated positively and machine-checked

```
strip = schema minus x-amended-by, with input_ref and result_ref
        reduced to {type, minLength}
assert.deepStrictEqual(strip(after), strip(before))   →  PASS
```

| Invariant | Result |
|---|---|
| property key set identical | true |
| `required` list identical | true |
| `tenant_context.$ref` unchanged (`../ctr-ten-001/schema.json`) | true |
| `additionalProperties: false` at root unchanged | true |
| top-level key set unchanged (`x-amended-by` already existed) | true |
| `manifest.version` | `1.0.0` → `1.0.0` |
| `manifest.status` | `Candidate` → `Candidate` |
| `index.json` CTR-JOB-001 entry | `1.0.0` / `Candidate`, unchanged |
| `index.json` totals | 4 Candidate / 10 Draft, unchanged |
| `index.json` file | **not touched** — mtime is still the extraction timestamp |

Each of these is also asserted by the standing guard, so a later edit cannot
quietly widen the amendment without failing CI.

### The other four amended files

| File | leaves before → after | identical | removed | added | modified |
|---|---|---|---|---|---|
| `ctr-job-001/manifest.json` | 10 → 11 | 10 | 0 | 1 | 0 |
| `ctr-job-001/examples/valid.json` | 21 → 21 | 20 | 0 | 0 | 1 |
| `ctr-job-001/examples/invalid-max-attempts.json` | 19 → 19 | 18 | 0 | 0 | 1 |

- manifest: the single added leaf is
  `$.fixtures[2] = "examples/invalid-public-input-ref.json"`. `contract_id`,
  `version`, `status`, `owner`, `schema`, `source_references` and
  `freeze_boundary` are all byte-identical.
- both fixtures: the single modified leaf is `$.input_ref`,
  `synthetic://input/…202` → `asset:input/…202`. The scheme token only; the path
  is identical.

## 4. Fixtures that had to change, and why

**`examples/valid.json` did not satisfy the tightened schema.** This is not
incidental — it is the defect's reach. `synthetic` is not an allow-listed scheme
and `//` is the protocol-relative authority form the new rule rejects, so the
contract's own reference *example* was written in a form the envelope's stated
intent excludes. Row 13 of the table above is that value, measured: accepted
before, rejected after. Without changing it,
`shared-kernel-schema-conformance.test.mjs` fails on
`ctr-job-001/examples/valid.json must satisfy its schema`.

`examples/invalid-max-attempts.json` carried the same `input_ref`. It would still
have been rejected — it is a negative fixture and `max_attempts: 0` fails
regardless — but it would then have failed for **two** reasons, one of them
incidental. A negative fixture that does not isolate the violation it is named
for is not evidence. The same substitution was applied so it fails only on
`max_attempts`.

## 5. The new negative fixture

`examples/invalid-public-input-ref.json` is byte-identical to `valid.json` except
`input_ref: "HTTPS://public.example.invalid/exfil"` — deliberately a form the
**old deny-list ACCEPTED** (row 2). A fixture using `https://` would have been
rejected by the old schema too and would demonstrate nothing this package did.
The standing guard asserts both properties: that it fails **only** on
`input_ref`, and that it does not match `^https?://`, so it cannot be silently
weakened into the already-covered case.

## 6. Every command, with its real exit code

Run from the package root on `v24.20.0` / `11.19.0`.

| Command | Exit | Result |
|---|---|---|
| `npm run check` (baseline, before any change) | `0` | 85 tests, 85 pass, 0 fail, **skipped 0 / todo 0** |
| `node --test test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` (pre-fix schema) | **`1`** | 6 tests, 2 pass, **4 fail** — the guard naming 30 accepted forms |
| `node --test test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` (post-fix) | `0` | 6 tests, 6 pass, 0 fail, skipped 0 / todo 0 |
| `node --test test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | `0` | 6 / 6 pass |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `0` | 6 / 6 pass |
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` | `0` | 6 / 6 pass |
| `node --test test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | `0` | 15 / 15 pass |
| `node scripts/verify-toolchain.mjs` | `0` | |
| `node scripts/scan-repository-secrets.mjs` | `0` | |
| `node scripts/validate-work-packages.mjs` | `0` | |
| `node scripts/validate-capability-profiles.mjs` | `0` | |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-005.json` | `0` | |
| `node scripts/verify-test-coverage-floor.mjs` | `0` | |
| **`npm run check` (final)** | **`0`** | **91 tests, 91 pass, 0 fail, skipped 0 / todo 0** |

85 → 91 is the six tests the new guard adds. No existing test was removed,
renamed, or skipped.

### One failure was hit and fixed along the way, recorded rather than hidden

`node scripts/validate-work-package-ownership.mjs` exited **`70`** on the first
draft of `work-packages/WP-0A-CON-005.json`:

```
work package WP-0A-A0-002 writable path overlaps WP-0A-CON-005 output: test-kits/integrity-manifest.json
```

That file is a WP-0A-A0-002 output, so this package may amend it but may not
**claim** it. It was moved out of `outputs.files` and `writable_paths` and into
`authorized_cross_package_amendments`. The validator behaved exactly as designed;
the first draft was wrong.

## 7. Integrity manifest

All **27** digests were recomputed with `sha256` over file **bytes**
(`createHash('sha256').update(fs.readFileSync(path))`, no `'utf8'` decode).
Exactly two entries differ from the recorded values:

| Entry | Change |
|---|---|
| `test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` | **ADDED** |
| `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | **UPDATED** |

The other 25 recomputed digests matched byte-for-byte, which is itself the
evidence that no other protected file drifted.

## 8. Every file changed, and nothing else

`find . -type f -newer AGENTS.md` on the extracted copy — mtime is a whole-tree
check that does not depend on my own bookkeeping:

| File | Owner | Kind |
|---|---|---|
| `architecture/decisions/RFC-2026-006-job-reference-hardening.md` | WP-0A-CON-005 | new |
| `test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` | WP-0A-CON-005 | new |
| `work-packages/WP-0A-CON-005.json` | WP-0A-CON-005 | new |
| `evidence/WP-0A-CON-005/author-self-check.md` | WP-0A-CON-005 | new (this file) |
| `contract-catalog/shared-kernel/ctr-job-001/schema.json` | **WP-0A-CON-001** | amended |
| `contract-catalog/shared-kernel/ctr-job-001/manifest.json` | **WP-0A-CON-001** | amended |
| `contract-catalog/shared-kernel/ctr-job-001/examples/valid.json` | **WP-0A-CON-001** | amended |
| `contract-catalog/shared-kernel/ctr-job-001/examples/invalid-max-attempts.json` | **WP-0A-CON-001** | amended |
| `contract-catalog/shared-kernel/ctr-job-001/examples/invalid-public-input-ref.json` | **WP-0A-CON-001** dir | new |
| `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | **WP-0A-CON-001** | amended |
| `test-kits/integrity-manifest.json` | **WP-0A-A0-002** | amended |

Six of the eleven belong to other packages. All six are named in
`ownership.authorized_cross_package_amendments` with the exact permitted change.
`contract-catalog/shared-kernel/index.json` still carries the extraction
timestamp and digest
`505f7a597970716d07a9a9a806908c7918d92293aac6d7b22e7acf77505a1262`.

Nothing outside this copy was read or written. `/Users/bank/ThinkBizThai` was
never touched.

## 9. The uncomfortable part: a WP-0A-CON-001 test had to be amended

`test-kits/contracts/shared-kernel-contract-catalog.test.mjs` contained:

```js
assert.equal(jobSchema.properties.input_ref.not.pattern, '^https?://');
assert.equal(jobSchema.properties.result_ref.not.pattern, '^https?://');
```

**These two lines made the defect mandatory.** The contract was required by test
to keep the bypassable deny-list; no correct fix could pass CI while they stood.
They now assert the allow-list pattern is present and that `.not` is `undefined`.

The same file's acceptance predicate used
`!/^https?:\/\//.test(fixture.input_ref)` — the identical deny-list with the
identical bypasses, and it never examined `result_ref` at all. Left as it was,
the new negative fixture (uppercase scheme) would have **passed** that
hand-written predicate while the shipped schema rejected it, and the file's own
`assert.equal(validatesCandidateFixture(...), !path.includes('/invalid-'))` would
have failed. That is precisely the predicate/schema divergence RFC-2026-004 and
the conformance suite exist to eliminate. The predicate now mirrors the shipped
constraint and covers `result_ref`.

Both edits **strictly narrow** what that test accepts, and no other line of the
file changed. It is still an amendment to another package's test, and it is a
wider surface than RFC-2026-004 needed. It is flagged here for the Reviewer
rather than presented as routine.

## 10. Limitations

1. **This is Author evidence.** The independent-structural-proof requirement that
   the Candidate amendment ruling was conditioned on is **not discharged** by
   this document. A non-Author run must re-derive Section 3.
2. **The `/root/r0_steward` acknowledgement is `pending`** and is not
   countersigned here. `test-kits/integrity-manifest.json` additionally needs
   `/claude/r0_steward` (WP-0A-A0-002's Integration Owner), also pending.
3. **No script, test, or CI job reads `acknowledgement_status`.** Nothing prevents
   `pending` reaching merge. Carried forward unresolved from the WP-0A-CON-002
   contract review (N-C1). The only control is human diff review under
   RFC-2026-002.
4. **This amendment is heavier than RFC-2026-004's.** That one corrected `$ref`s
   that were broken and could not have been depended on. This one narrows a
   constraint that accepts values *today*. Nothing in the repository depends on
   the old breadth — CTR-JOB-001 has no implementation and its only instances are
   its own fixtures — but the class of change differs.
5. **A constrained reference string is not an authorization decision.** The schema
   still cannot express that a workspace may read a given object. A reference of
   the correct shape naming **another tenant's** object passes: the envelope
   carries no binding between `tenant_context.workspace_id` and the reference
   body. Open before freeze.
6. **The scheme allow-list is adopted, not decided.**
   `job|status|result|app|asset|content` comes from CTR-IDM-001 for catalog
   consistency. Whether that closed set is right for a job envelope is a
   contract-owner decision.
7. **`ctr-evt-001` `metadata.schema_ref` is still unconstrained** — a bare
   `{type: "string", minLength: 1}` with no scheme rule at all, so every hostile
   form in Section 1 is accepted there. Found by sweeping all fourteen catalog
   schemas. CTR-EVT-001 is Candidate and outside this package's authorized
   amendment set; escalated, not fixed.
8. **The catalog sweep's positive result:** after this amendment no
   `not: {pattern: …}` reference constraint remains anywhere in the catalog, and
   `status_ref`, `deep_link_ref`, `result_ref` and `input_ref` all carry the
   identical allow-list. CTR-JOB-001 was the last deny-list.
9. **One hostile form is on disk; fifteen are in the guard.** A fixture-only
   reader sees one case.
10. **The subset validator, not a conforming JSON Schema implementation,** is what
    measured everything here. It implements only the keywords the catalog uses.
    The regex is evaluated with the `u` flag; lookahead behaviour under a
    different engine (a database `CHECK`, a Go or Rust validator) was not tested
    and must be before this pattern is relied on outside Node.
11. **`npm run check` was green before the fix too** (85/85). It could not see
    this defect, which is why the standing guard exists. Its greenness is not
    evidence about reference safety in either direction.
12. **No commit, no push, no merge authorization.** Gate G0 remains Specification
    Baseline Complete / External Verification Pending.
