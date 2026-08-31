# WP-0A-CON-005 — Independent Tester verdict

Package: CTR-JOB-001 reference-field hardening
Tester run: `/claude/q0_sentinel` (declared `role_assignments.tester_agent_run_id`)
Author run under test: `/claude/a0_atlas` — a different run; role separation holds.
Commit tested: `b47aece`, in the frozen extraction at
`/private/tmp/claude-501/-Users-bank-ThinkBizThai/cb23f394-422b-4ec3-b024-e2751f208eb9/scratchpad/rv-jobref`.
Protocol version: `1.0.0`.

**This is independent Tester evidence only.** It is not review, not security review,
not integration verification, and it authorizes no merge and no gate movement. Every
number below was re-derived by this run against the shipped tree; no figure was copied
from `evidence/WP-0A-CON-005/author-self-check.md` or from RFC-2026-006.

## Toolchain

| | |
|---|---|
| `node --version` | `v24.20.0` (exit `0`) |
| `npm --version` | `11.19.0` (exit `0`) |

Run through `zsh -lc` so the pinned `.node-version` toolchain is on `PATH`. Nothing was
downloaded. `/Users/bank/ThinkBizThai` was never read or written. Destructive probes were
run against two throwaway copies of the tree outside the frozen root; the frozen root
itself was only read, except for this one file.

---

## 0. How the pre-amendment schema was reconstructed

`git` is unavailable in the frozen root, so the "before" schema was rebuilt from three
sources, two of which are **not** Author artifacts:

1. RFC-2026-006 quotes the shipped pre-fix constraint verbatim:
   `{"type":"string","minLength":1,"not":{"pattern":"^https?://"}}` on both fields.
   (Author artifact — corroborated by 2 and 3.)
2. **Non-Author, pre-existing:** `evidence/WP-0A-A0-002/review-security.md` (lines 148–149),
   written by WP-0A-A0-002's security reviewer before this package existed, records
   *"`CTR-JOB-001` `input_ref.not.pattern === '^https?://'` and the same for `result_ref`"*.
   `evidence/WP-0A-CON-002/review-contract-rework.md` (N5) and `review-contract.md` (R7/R8)
   independently record the same shipped form.
3. **Non-Author, on disk:** `contract-catalog/shared-kernel/ctr-evt-001/schema.json` still
   carries the WP-0A-CON-002 amendment record in its **original single-object shape**. Its
   five leaves are byte-identical to `ctr-job-001` `x-amended-by[0]`
   (`JSON.stringify` equality asserted, result `true`), which fixes both the pre-amendment
   container shape and its exact contents without relying on the Author's account.

The reconstructed schema is therefore derived from independent artifacts, not from the
Author's diff table.

---

## 1. Leaf-path diff — my own measurement

Both documents were flattened to leaf paths (arrays indexed, empty containers terminal)
and compared path by path.

```
contract-catalog/shared-kernel/ctr-job-001/schema.json
leaf paths before: 60    after: 67
identical: 53    removed: 7    added: 14    modified in place: 0
```

| Metric | Author claim | **My measurement** | Agrees |
|---|---|---|---|
| leaf paths before | 60 | **60** | yes |
| leaf paths after | 67 | **67** | yes |
| identical | 53 | **53** | yes |
| removed | 7 | **7** | yes |
| added | 14 | **14** | yes |
| modified in place | 0 | **0** | yes |

### Removed (7) — complete, not a sample

| Leaf path | Before |
|---|---|
| `$.properties.input_ref.not.pattern` | `"^https?://"` |
| `$.properties.result_ref.not.pattern` | `"^https?://"` |
| `$.x-amended-by.work_package_id` | `"WP-0A-CON-002"` |
| `$.x-amended-by.decision_record` | `"architecture/decisions/RFC-2026-004-catalog-reference-integrity.md"` |
| `$.x-amended-by.change` | the RFC-2026-004 `$ref` correction text |
| `$.x-amended-by.acknowledgement_required_from` | `"/root/r0_steward"` |
| `$.x-amended-by.acknowledgement_status` | `"pending"` |

### Added (14) — complete, not a sample

| Leaf path | After |
|---|---|
| `$.properties.input_ref.pattern` | the CTR-IDM-001 allow-list pattern |
| `$.properties.input_ref.x-reference-rule` | rule text naming the demonstrated bypasses |
| `$.properties.result_ref.pattern` | the same pattern, character-identical (asserted equal) |
| `$.properties.result_ref.x-reference-rule` | the same rule text |
| `$.x-amended-by[0].work_package_id` | `"WP-0A-CON-002"` |
| `$.x-amended-by[0].decision_record` | `".../RFC-2026-004-catalog-reference-integrity.md"` |
| `$.x-amended-by[0].change` | the RFC-2026-004 `$ref` correction text |
| `$.x-amended-by[0].acknowledgement_required_from` | `"/root/r0_steward"` |
| `$.x-amended-by[0].acknowledgement_status` | `"pending"` |
| `$.x-amended-by[1].work_package_id` | `"WP-0A-CON-005"` |
| `$.x-amended-by[1].decision_record` | `".../RFC-2026-006-job-reference-hardening.md"` |
| `$.x-amended-by[1].change` | this amendment's text |
| `$.x-amended-by[1].acknowledgement_required_from` | `"/root/r0_steward"` |
| `$.x-amended-by[1].acknowledgement_status` | `"pending"` |

### Modified in place (0)

Empty. Confirmed independently.

### The neutrality invariants, re-derived

| Invariant | My result |
|---|---|
| `strip(before)` deep-equal `strip(after)` (strip = drop `x-amended-by`, reduce both ref properties to `{type,minLength}`; key-order-canonicalised) | **PASS** |
| property key set identical (18 keys) | true |
| `required` list identical (13 entries, same order) | true |
| `tenant_context.$ref` unchanged (`../ctr-ten-001/schema.json`) | true |
| root `additionalProperties: false` unchanged | true |
| top-level key set unchanged | true |
| `x-amended-by[0]` deep-equal to the pre-amendment `x-amended-by` object | true |
| `manifest.version` / `manifest.status` | `1.0.0` / `Candidate` |
| `index.json` CTR-JOB-001 entry | `1.0.0` / `Candidate`; 14 contracts, 4 Candidate / 10 Draft |

**The independent structural proof of content-neutrality is DISCHARGED.** Every figure the
Candidate-amendment authority was conditioned on has been re-derived by a non-Author run
and reproduces exactly. The only structural change outside the two reference constraints is
the relocation of the WP-0A-CON-002 annotation into `x-amended-by[0]` with its contents
unchanged, which this run verified mechanically rather than by eye.

Two honest qualifications on the strength of that discharge, neither of which I treat as
defeating it:

- The reconstruction is a reconstruction. It is not a `git show` of the parent commit,
  because `git` is absent from the frozen root. Its inputs are independent of the Author
  (items 2 and 3 of §0), but an Integration Owner with repository access should confirm the
  parent-commit bytes directly; that is a cheap confirmation, not a re-derivation.
- `x-` keywords are ignored by `assertSchemaSupported` by construction, so the
  `x-amended-by` reshape and the two `x-reference-rule` additions cannot change what any
  validator in this repository enforces. That is a property of this repository's validator,
  not of JSON Schema generally.

---

## 2. Was the defect real? My own before/after numbers

Method: the reconstructed pre-fix schema and the shipped post-fix schema, each validating
mutated copies of `examples/valid.json` with the repository's own
`test-kits/contracts/json-schema-subset.mjs` and the one external `$ref` resolved. Controls
first: the shipped `valid.json` validates clean against the post-fix schema (0 errors) and
the pre-amendment `valid.json` validates clean against the pre-fix schema (0 errors), so
each probe is measuring the reference field and nothing else. **No rejection in the whole
matrix was attributable to any field other than the one probed** (checked explicitly).

| id | hostile form | value | before `input_ref` | before `result_ref` | after `input_ref` | after `result_ref` |
|---|---|---|---|---|---|---|
| A1 | lowercase `https` | `https://public.example.invalid/x` | rejected | rejected | rejected | rejected |
| A2 | uppercase scheme | `HTTPS://public.example.invalid/x` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| A3 | protocol-relative authority | `//public.example.invalid/x` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| A4 | `ftp:` | `ftp://public.example.invalid/x` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| A5 | `data:` | `data:text/plain;base64,AA==` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| A6 | `file:` | `file:///etc/passwd` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| A7 | `javascript:` | `javascript:alert(1)` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| A8 | bare traversal | `../../../etc/passwd` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| A9 | allowed scheme + traversal | `result:../../../etc/passwd` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| A10 | allowed scheme + absolute | `status:/proc/self/environ` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| A11 | allowed scheme + dotfile | `content:/.env` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| A12 | allowed scheme + authority | `content://attacker.example.invalid/exfil` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| A13 | the shipped fixture's own value | `synthetic://input/…202` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| A14 | CONTROL well-formed | `asset:input/…202` | ACCEPTED | ACCEPTED | ACCEPTED | ACCEPTED |
| A15 | CONTROL well-formed | `result:job/…203` | ACCEPTED | ACCEPTED | ACCEPTED | ACCEPTED |

**Author set, 15 forms × 2 fields = 30 probes: before ACCEPTED 28 / rejected 2; after
ACCEPTED 4 (both controls, both fields) / rejected 26.**

This is exactly the Author's claim, re-measured. The defect was real: **28 of 30**, and
**7 of the 8** named escalation forms passed the shipped schema on both fields. Only the
single literal lowercase form the deny-list was written for was caught.

## 3. Is the fix complete? Forms the Author did not list

Sixteen further forms, seventeen rows including a third control, each on both fields.

| id | hostile form | value | before `input_ref` | before `result_ref` | after `input_ref` | after `result_ref` |
|---|---|---|---|---|---|---|
| T1 | mixed case `HtTpS:` | `HtTpS://public.example.invalid/x` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T2 | UNC share path | `\\host\share\secret` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T3 | `jar:file:` | `jar:file:///etc/passwd` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T4 | URL-encoded traversal, allowed scheme | `asset:%2e%2e%2fetc%2fpasswd` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T5 | URL-encoded traversal, bare | `%2e%2e%2f%2e%2e%2fetc%2fpasswd` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T6 | null byte inside a well-formed value | `asset:input/ok .png` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T6b | null byte then public URL | `asset:ok https://public.example.invalid/x` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T7 | very long value (8192-char body) | `asset:aaaa…` (8198 chars) | **ACCEPTED** | **ACCEPTED** | **ACCEPTED** | **ACCEPTED** |
| T8 | trailing newline on a well-formed value | `asset:input/…202\n` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T9 | newline-injected public URL | `asset:ok\nhttps://public.example.invalid/x` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T10 | Cyrillic homoglyph in scheme | `jоb:input/x` (U+043E) | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T11 | fullwidth homoglyph scheme | `ｊｏb:input/x` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T12 | `job:` with an empty body | `job:` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T13 | empty path segment | `job:a//b` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T14 | leading whitespace + `https` | `  https://public.example.invalid/x` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T15 | uppercase allow-listed scheme | `ASSET:input/x` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T16 | CRLF-injected public URL | `asset:input/x\r\nhttps://evil.invalid` | **ACCEPTED** | **ACCEPTED** | rejected | rejected |
| T17 | CONTROL dotted body | `job:input.payload` | ACCEPTED | ACCEPTED | ACCEPTED | ACCEPTED |

**Tester set, 17 forms × 2 fields = 34 probes: before ACCEPTED 34 / 34 — every single one.
After: ACCEPTED 4, of which 2 are the control (T17) and 2 are T7.**

**Combined, 32 forms × 2 fields = 64 probes: before ACCEPTED 64, after ACCEPTED 8 (6 control
probes + T7 on both fields).**

Notes on the negative results, since a rejection is only as good as its reason:

- The trailing-newline probe (T8) is rejected because JavaScript's `$` **without** the `m`
  flag anchors at end of input, unlike PCRE/Python where `$` also matches before a final
  newline. Verified directly: `/…$/u.test('asset:input/x\n')` → `false`. This is a
  correctness dependency on the ECMAScript dialect and is worth stating explicitly, because
  the same pattern transplanted into a PCRE-family engine would **accept** T8 and T9.
- Homoglyph and null-byte forms are rejected by the closed character class, not by any
  Unicode normalisation. The scheme allow-list is case-sensitive, so `ASSET:` is rejected
  too — strict, and correct for a closed set.
- **T7 is the one residual gap.** Neither reference field carries a `maxLength`, so a
  reference of unbounded length in an allow-listed shape is accepted. The catalog sweep
  below shows **no `_ref` field anywhere in the catalog carries a `maxLength`**. This is not
  a scheme bypass and it is not a regression introduced by this package, but the fix is not
  complete against "hostile forms" in the general sense while it stands.
- No catastrophic backtracking. A failing input of 20 000 dotted segments evaluates in
  0.20 ms (200 segments: 0.006 ms; 2 000: 0.022 ms) — linear, not exponential.

## 4. The guard was independently observed to fail before the fix

A throwaway copy of the tree was reverted to the reconstructed pre-fix schema and the
pre-amendment fixture values, and the standing guard was run against it.

| | reconstructed pre-fix tree | shipped post-fix tree |
|---|---|---|
| exit code | **`1`** | `0` |
| tests / pass / fail | 6 / 2 / **4** | 6 / **6** / 0 |
| skipped / todo | 0 / 0 | 0 / 0 |

The failure enumerated **exactly 30 accepted `field=value` pairs**, 15 per field. The two
tests that still passed were the well-formed-reference control and the content-neutrality
invariants — the correct behaviour for both, since neither depends on the constraint being
fixed. This reproduces the Author's `6 / 2 / 4` result from an independently rebuilt tree.

---

## 5. Item 3 — did a WP-0A-CON-001 test pin the vulnerable pattern? **CONFIRMED, by execution.**

This is the package's headline finding and it holds. Two independent lines of evidence.

**(a) Documentary, from a non-Author artifact.** `evidence/WP-0A-A0-002/review-security.md`
lines 148–149 — written for a different package, before WP-0A-CON-005 existed — records the
assertion verbatim as a *security property the suite guards*:
`CTR-JOB-001 input_ref.not.pattern === '^https?://'` and the same for `result_ref`, plus
*"the fixture validator independently enforces `!/^https?:\/\//.test(input_ref)`"*.
`evidence/WP-0A-CON-002/review-contract-rework.md` (N5) independently records the shipped
schema constraint and measures 7 of 8 forms accepted at `106f91c`.

**(b) Executable.** I rebuilt the pre-amendment form of
`test-kits/contracts/shared-kernel-contract-catalog.test.mjs` — restoring the two pinning
assertions and the deny-list acceptance predicate, and removing the `result_ref` clause —
and ran it **against the fixed schema**:

```
tests 6 / pass 4 / fail 2   exit 1
  TypeError: Cannot read properties of undefined (reading 'pattern')
  AssertionError: CTR-JOB-001 examples/invalid-public-input-ref.json
```

Both halves of the Author's claim are demonstrated, not asserted:

1. `jobSchema.properties.input_ref.not.pattern` **throws** once `.not` is removed. A correct
   fix could not have passed CI while that assertion stood. The test made the defect
   mandatory. The amendment to that file was **unavoidable**, not convenient.
2. The old deny-list predicate accepts `HTTPS://public.example.invalid/exfil`, so the new
   negative fixture would have satisfied a predicate for a file named `invalid-`, failing
   the suite's own `validatesCandidateFixture(...) === !path.includes('/invalid-')`. The
   predicate change was also forced.

Both edits strictly narrow what that test accepts. I confirm the finding.

**One thing the Author did not report.** The identical bypassable predicate
`const isPrivateRef = (value) => isText(value) && !/^https?:\/\//.test(value)` **survives**
at `test-kits/contracts/shared-kernel-envelope-contracts.test.mjs:14`, where it gates
CTR-API-001 `status_ref` / `deep_link_ref` and CTR-IDM-001 `result_ref` (lines 35, 36, 76,
197) — fields whose *schemas* carry the allow-list. The predicate/schema divergence class
the RFC says it closes is therefore closed in one of the two test files that carry it. No
current fixture exercises the divergence, so nothing fails today; it is a latent gap in a
WP-0A-CON-002-owned file, outside this package's authorized amendment set. It should have
been escalated the way `ctr-evt-001` was, and it was not.

---

## 6. Item 4 — were the two fixture changes necessary, or convenient? **NECESSARY.**

| Check | Result |
|---|---|
| `valid.json` with its **old** `synthetic://input/…202` value, against the tightened schema | **rejected**, 1 error, `$.input_ref: does not match pattern …` |
| `valid.json` as shipped | 0 errors |
| `invalid-max-attempts.json` as shipped | **exactly 1 error**: `$.max_attempts: below minimum 1` |
| `invalid-max-attempts.json` with the **old** value | **2 errors**: `max_attempts` **and** `input_ref` |
| `valid.json` leaf diff old → new | 21 → 21 leaves; **1 modified** (`$.input_ref`), 0 added, 0 removed |
| `invalid-max-attempts.json` leaf diff old → new | 19 → 19 leaves; **1 modified** (`$.input_ref`), 0 added, 0 removed |

The valid fixture genuinely did not satisfy the tightened schema — the conformance suite
would have failed on it — so that change was forced, not cosmetic. The negative fixture now
isolates the single violation it is named for; with the old value it would have carried an
incidental second failure. Both changes are the minimum possible: one leaf each, the scheme
token only, path bytes identical.

## 7. Item 5 — regression

| Check | Result |
|---|---|
| `npm run check` exit code | **`0`** |
| tests / pass / fail | **93 / 93 / 0** |
| **skipped / todo** | **0 / 0** |
| summaries in the output stream | exactly 1 (no partial summary being quoted) |
| `test-kits/integrity-manifest.json` — all entries recomputed over file **bytes** | **28 entries, 28 match, 0 mismatch** |
| `contract-catalog/shared-kernel/index.json` sha256 | `505f7a597970716d07a9a9a806908c7918d92293aac6d7b22e7acf77505a1262` |
| same digest recorded independently by WP-0A-CON-002's Tester at `4e1d6e5` and `106f91c` | **identical — `index.json` is byte-identical to its pre-package state** |
| `index.json` CTR-JOB-001 entry | `1.0.0` / `Candidate` |
| `index.json` totals | 14 contracts, **4 Candidate / 10 Draft** |
| `ctr-job-001/manifest.json` | `version 1.0.0`, `status Candidate` |
| files whose content names `WP-0A-CON-005` or `RFC-2026-006` | exactly 6, all declared |
| all 7 cross-package amendments declared in `ownership.authorized_cross_package_amendments` | yes |

**The real count is 93, not 91.** See §9(1).

The Author's whole-tree `find . -type f -newer AGENTS.md` check is **not reproducible in
this frozen copy**: all 264 files share a single mtime (`2026-09-01T01:31:19`, the
extraction timestamp), so `-newer` returns empty regardless of what changed. I substituted
digest-based checks. Note also that `test-kits/integrity-manifest.json` covers **no**
`contract-catalog/**` file — it protects scripts, CI, and the suites only — so for the
twelve untouched contract directories my assurance rests on the reference-integrity,
conformance, mutation-coverage and catalog suites all passing plus the content sweep above,
not on a digest tripwire. `index.json` itself is the one catalog file with an independently
recorded prior digest, and it matches.

## 8. Item 6 — `ctr-evt-001.metadata.schema_ref`. **Confirmed. Same family, worse degree, different remedy.**

Verified independently against the shipped schema:

```json
"metadata": { "type":"object", "additionalProperties": false, "required":["schema_ref"],
              "properties": { "schema_ref": { "type":"string", "minLength":1 } } }
```

There is **no scheme rule of any kind**. Probing it with 16 hostile forms (the full A-set
plus `jar:file:`, the UNC path and the URL-encoded traversal): **16 of 16 ACCEPTED**,
including `javascript:alert(1)`, `file:///etc/passwd`, `data:…` and `../../../etc/passwd`.

Is it the same class of defect? **Yes as to consequence, and strictly worse as to degree.**
CTR-JOB-001 shipped a partial control that caught one form; CTR-EVT-001 ships no control at
all, so it accepts every form including the single lowercase `https://` the old deny-list
did catch. The escalation is justified.

**One qualification the Author did not make, and it matters to whoever fixes it.** The
field's own fixture value is `"CTR-EVT-001@1.0.0"` — a schema *version identifier*, not an
object reference. It contains `@` and `.` and is **not matchable** by the catalog allow-list
pattern. Copying the CTR-JOB-001 pattern into CTR-EVT-001 would reject that contract's own
valid fixture. The remedy there is a different constraint (a contract-id/semver shape), not
a re-use of this one. The escalation should carry that or it will be mis-implemented.

### Catalog sweep, re-derived

| Contract | Field | Constraint kind | Length bound |
|---|---|---|---|
| ctr-api-001 | `accepted.status_ref` | allow-list `pattern` | **none** |
| ctr-api-001 | `accepted.deep_link_ref` | allow-list `pattern` | **none** |
| ctr-evt-001 | `metadata.schema_ref` | **UNCONSTRAINED** | none |
| ctr-idm-001 | `result_ref` | allow-list `pattern` | **none** |
| ctr-job-001 | `input_ref` | allow-list `pattern` | **none** |
| ctr-job-001 | `result_ref` | allow-list `pattern` | **none** |

The Author's positive sweep claim is **confirmed**: no `not:{pattern:…}` reference
constraint remains anywhere in the fourteen contracts, and the four allow-listed fields
carry the identical pattern. The Author's sweep did not report the missing length bound on
all six.

---

## 9. Discrepancies and conditions

Nothing below defeats the neutrality proof or the substance of the fix. All of it is either
a documentation-accuracy defect in Author evidence or a residual gap the Integration Owner
should see before disposition.

1. **`npm run check` is 93 tests, not 91.** Author self-check §6 and RFC-2026-006
   "Verification" both state `91 tests`, and the self-check states a `85` baseline. My run
   on the identical frozen tree gives **93 / 93 / 0, skipped 0 / todo 0, exit 0**, from a
   single summary in the stream. Per-file declaration counts sum to 93 (4+6+6+2+6+15+6+2+8+
   2+26+3+1+6). The implied baseline is therefore 87, not 85. The *qualitative* claims —
   exit `0`, zero failures, zero skipped, zero todo, six tests added by the new guard — all
   hold; the absolute figures in two Author documents do not. A verification section whose
   headline number cannot be reproduced should be corrected before merge.
2. **Integrity-manifest arithmetic is off.** The shipped manifest has **28** entries, all 28
   matching their files' bytes. The Author states "all **27** digests were recomputed …
   exactly two entries differ … the other **25** matched". With 1 added and 1 updated, 28
   post-state entries implies 26 unchanged out of 27 pre-existing. The substantive claim —
   two entries differ, nothing else drifted — is consistent with what I measured; the counts
   are not.
3. **No `maxLength` on any reference field, catalog-wide.** An 8192-character allow-listed
   reference is accepted on both CTR-JOB-001 fields after the fix (probe T7). Pre-existing
   and out of this package's stated scope, but it is a hostile form the tightened schema
   still accepts, so "the fix is complete" is true only against scheme and path-shape
   attacks. Recommend a bounded `maxLength` on all six `_ref` fields as follow-on work.
4. **The two negative lookaheads are redundant, and their portability cost is not.**
   WP-0A-CON-002's contract review R8 (Medium) objected that negative lookahead
   *"is unsupported by RE2-based validators"* and recommended the opposite form; that finding
   has **no recorded disposition anywhere in the tree**, and this amendment propagates the
   lookahead form to two further fields. I tested whether the cost is even necessary:

   ```
   shipped:        ^(job|status|result|app|asset|content):(?!/)(?!.*\.\.)[A-Za-z0-9_-]+…
   lookahead-free: ^(job|status|result|app|asset|content):[A-Za-z0-9_-]+…
   ```

   `(?!/)` is redundant because the first body character must already be
   `[A-Za-z0-9_-]`; `(?!.*\.\.)` is redundant because `\.` only ever appears as a separator
   followed by `[A-Za-z0-9_-]+`. **400 000 randomised strings over an alphabet containing
   `.`, `/`, `..`, `%2e`, newline, space and NUL: zero divergences**, and all six named
   traversal forms rejected identically by both. A lookahead-free pattern would be exactly
   equivalent here and portable to RE2, Go, and a Postgres `CHECK`. This is a free fix for a
   Medium finding that has been open since WP-0A-CON-002. It is a recommendation, not a
   defect in what shipped: the shipped pattern is correct under ECMAScript, which is what
   this repository executes.
5. **A bypassable predicate survives, unescalated** — `isPrivateRef` in
   `shared-kernel-envelope-contracts.test.mjs` (§5 above). Latent, no current failure,
   WP-0A-CON-002-owned. Should be escalated alongside `ctr-evt-001`.
6. **Dialect dependency.** The trailing-newline and CRLF-injection rejections (T8, T9) hold
   because ECMAScript `$` anchors at end of input. In a PCRE-family engine the same pattern
   would accept a trailing newline. Any port of this constraint outside Node must re-test
   those two forms specifically. The Author's Limitation 10 gestures at this; it is worth
   naming the two concrete forms at risk.
7. **`acknowledgement_status: pending` is read by nothing.** Confirmed: no script, test, or
   CI job in the tree reads that field, so `pending` can reach merge unchallenged. Carried
   forward from the WP-0A-CON-002 contract review (N-C1); the standing guard only asserts
   the value is one of `pending`/`acknowledged`. Not this package's defect and honestly
   disclosed, but it means the `/root/r0_steward` and `/claude/r0_steward` acknowledgements
   are a human control only.
8. **The reconstruction caveat of §1** stands: an Integration Owner with `git` should
   confirm the parent-commit bytes directly.

---

## 10. Conclusions

- **The independent structural proof of content-neutrality is DISCHARGED.** 60 → 67 leaf
  paths, 53 identical / 7 removed / 14 added / **0 modified in place**, re-derived by this
  non-Author run from independent sources; the strip-and-compare test passes; every stated
  invariant holds. The precondition the Candidate amendment authority rests on is met.
- **The defect was real**: 28 of 30 hostile probes accepted by the pre-fix schema — my own
  number, matching the Author's — and 34 of 34 on my extended set.
- **The fix is effective** against all 30 forms probed on both fields, including nine the
  Author did not list, with one residual gap: unbounded reference length.
- **The WP-0A-CON-001 test really did pin the vulnerable pattern.** Demonstrated by
  execution, not inference: the fixed schema throws against the restored assertion.
- **Both fixture changes were necessary and minimal**; `invalid-max-attempts.json` now fails
  for exactly one reason.
- **No regression**: `npm run check` exit `0`, **93 / 93**, skipped 0 / todo 0;
  `index.json` byte-identical against an independently recorded digest; CTR-JOB-001 still
  `Candidate` at `1.0.0`.
- **`ctr-evt-001.metadata.schema_ref` is confirmed unconstrained** — 16 of 16 hostile forms
  accepted — the same class of defect, worse in degree, needing a different remedy.

The conditions are §9(1) and §9(2), which are corrections the Author should make to its own
evidence and to RFC-2026-006 before this package is dispositioned, and §9(3)–(6), which are
residual gaps and follow-on recommendations for the Integration Owner and the contract
owner. None of them touches the neutrality proof or the correctness of what shipped.

This is independent Tester evidence only. It does not approve Gate G0, does not authorize a
merge, and does not substitute for the Reviewer, Security reviewer, or Integration Owner.

VERDICT: test_verified_with_conditions
