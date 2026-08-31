# WP-0A-CON-002 — Independent Reviewer evidence (rework round)

Reviewer run: `/claude/c0_contract_reviewer` (Anthropic, `claude-opus-5`)
Role: independent Reviewer (contract/architecture), skill profile `architecture-contracts`
Author run under review: `/claude/a0_atlas` — a different run. This run authored no part of
the change under review.
Commit reviewed: `28d3142`
Previous round reviewed by this run: `106f91c` → `VERDICT: changes_requested`
Date: 2026-08-31

**Scope of this document.** This is independent Reviewer evidence only. It is **not**
Security/Privacy review, **not** Tester verification, **not** Integration Owner
verification, **not** Product Owner disposition, **not** merge authorization, and it does
**not** approve or move Gate G0. Gate G0 remains Specification Baseline Complete / External
Verification Pending.

This run wrote only this file. It committed nothing and pushed nothing. Every command and
every adversarial probe below ran inside a frozen extraction of `28d3142` in a scratchpad
directory outside the repository, and every destructive probe ran against a further
throwaway copy restored from a pristine copy between probes. The live working tree was
never read and never touched.

---

## 1. Commands, replayed at `28d3142`

`zsh -lc 'node --version'` → `v24.20.0`; `npm --version` → `11.19.0`. Matches the
RFC-2026-001 pin.

| Command | Exit | Observed |
|---|---:|---|
| `npm run check` | `0` | `tests 70 / pass 70 / fail 0` |
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` | `0` | `tests 5 / pass 5 / fail 0` |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `0` | `tests 5 / pass 5 / fail 0` |
| `node --test test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | `0` | `tests 15 / pass 15 / fail 0` |
| `node --test test-kits/contracts/` (all four files) | `0` | green |

Counter-check that the new conformance suite is **not tautological** — the original
blocking defect (R1), reintroduced in a sandbox by setting `ctr-pag-001/schema.json`
`sort.minItems` back to `1`:

```
✖ every fixture agrees with its own shipped schema, not with a hand-written predicate
AssertionError: ctr-pag-001/examples/invalid-unstable-sort-without-tiebreaker.json
  is named invalid but its schema accepts it
```

Exit `1`. **The suite detects the exact defect it was written for, with a precise message.**
Reintroducing an unsupported keyword (`exclusiveMaximum`) also fails, with
`unsupported schema keyword 'exclusiveMaximum'`. And moving a rule sideways into an `x-`
annotation does **not** save it: `minItems: 1` + `x-minItems: 2` still fails the fixture
check. That part of the design works as advertised.

---

## 2. Item 1 — the validator as new load-bearing code

`test-kits/contracts/json-schema-subset.mjs`, 121 lines, no dependencies. I probed it
directly against real JSON Schema 2020-12 semantics (the dialect every catalog schema
declares in `$schema`). Results below are executed, not read.

### 2.1 The specific question asked: `additionalProperties` × `allOf` / `if`/`then`

**The validator gets this RIGHT, and right in the strict direction.** `additionalProperties`
computes its declared set from `Object.keys(schema.properties)` at the *same* schema object
only (line 100). Real 2020-12 behaves identically — `additionalProperties` does not see
sibling `properties` across an `allOf` branch or inside `then`. Probes:

| Probe | Validator | Real 2020-12 | |
|---|---|---|---|
| `additionalProperties:false` + property declared only in an `allOf` branch | rejects | rejects | match |
| `additionalProperties:false` + property declared only in `then` | rejects | rejects | match |
| `required` inside `then`, condition met, property absent | rejects | rejects | match |
| `if:{properties:…}` with the key absent (vacuous pass → `then` applies) | rejects | rejects | match |
| `not: {anyOf:[{required:[…]}]}` (the API-001/IDM-001 exclusivity form) | correct | correct | match |
| `oneOf` with two matching branches | rejects (matched 2) | rejects | match |
| `type:integer` with `5.0` / `5.5` | accepts / rejects | accepts / rejects | match |
| `type:number` with `5` | accepts | accepts | match |
| `type:object` with `null` / `[]` | rejects / rejects | rejects / rejects | match |
| `maxProperties: 0` with one key | rejects | rejects | match |
| `pattern` unanchored | unanchored | unanchored | match |

**No leak is hidden in the `additionalProperties` interaction.** I also confirmed
empirically that nested `additionalProperties: false` is now genuinely enforced at depth —
extra keys at `accepted`, `tenant_context.actor`, `scope`, and inside the `$ref`-resolved
`error` are all rejected. The Tester's headline finding is really closed at schema level.

### 2.2 Where the validator IS more permissive than it appears

Four defects, all in the "a schema looks stricter than it is" direction — which is the
direction that matters, because the module's own contract (lines 8–11) is that *an unknown
keyword is an ERROR, so a schema can never appear to constrain something this validator
ignores*. These four are **known** keywords with absent or partial implementations, so the
unknown-keyword guard does not protect against any of them.

| # | Keyword | Behaviour | Real 2020-12 | Live at `28d3142`? |
|---|---|---|---|---|
| **V1** | `$ref` **with siblings** | line 58–62 `return`s immediately; every sibling keyword is silently discarded. `{"$ref":"…","required":["x"],"additionalProperties":false}` accepts `{}` and accepts undeclared keys. | siblings **apply** in 2020-12 (draft-07 ignored them; these schemas declare 2020-12) | **Latent** — no catalog `$ref` currently has siblings |
| **V2** | `additionalProperties` as a **schema** | only `=== false` is handled (line 99). `additionalProperties: {"type":"string"}` is ignored entirely; a numeric extra key passes. | applies the subschema to every undeclared key | **Latent** — not currently used |
| **V3** | `format` ≠ `date-time` | `format` is in `SUPPORTED` but only `date-time` is implemented (line 74). `format:"uuid"` / `"uri"` / `"email"` passes `assertSchemaSupported` and then constrains nothing. | annotation-only by default in spec — but the module's own invariant is violated | **Latent** — only `date-time` currently used |
| **V4** | `format: "date-time"` | `Date.parse` is used. Accepts `2026-08-31` (a date, no time) and `December 17, 1995 03:24:00` and `Mon Jan 01 2020`. | RFC 3339 rejects all three | **LIVE** — `occurred_at`, `created_at`, `completed_at`, `available_at`, `lease_expires_at`, `cancel_requested_at` |

Two lesser divergences, both **stricter** than real (false-negative risk, not a leak):
`const`/`enum` compare by `JSON.stringify`, so an object `const` is key-order sensitive
(only scalars are used today); and a `type` mismatch short-circuits the rest of the
subschema, suppressing further errors on the same node.

`items` in array (tuple) form is correctly caught by `assertSchemaSupported` — though if it
ever slipped past, `validate` would silently drop every element constraint.

### 2.3 The `x-` escape hatch

`assertSchemaSupported` skips any key beginning with `x-` **without inspecting its value**.
`{"x-required":["secret"]}` and `{"x-rule":{"patternProperties":{…}}}` both pass the guard
untouched. The comment on line 35–36 ("they constrain nothing, so ignoring them cannot make
a schema appear stricter than it is") is exactly backwards as a safety argument: an `x-`
key that *reads* as a rule and enforces nothing is precisely a schema appearing stricter
than it is, to a human reader. It is mitigated here — see §3 — because every `x-` key in
this catalog documents *non*-enforcement rather than smuggling enforcement, and because
probe C4 shows the fixture check still fires when a real rule is moved into `x-`. It is not
mitigated by anything in the code.

### 2.4 Two flaws in how the suites *drive* the validator

- **`refResolver` (conformance test, lines 30–43)** walks only the top-level schema and
  resolves every `$ref` string against the *contract's own* `base`. A `$ref` appearing
  inside a resolved target would be resolved against the wrong directory, and a `$ref`
  nested inside a `$ref`ed schema is not pre-loaded at all — it would surface as
  `unresolvable $ref`, which fails loudly, so this is conservative today but wrong.
- **`contracts()` reads `join(base, 'schema.json')` and swallows failures** in a bare
  `catch`. See finding N4.

### 2.5 Ruling on item 1

**The validator is sound enough to carry the conformance claims *for the seven schemas as
they exist at `28d3142`*, and not sound enough to be relied on unattended.** Every keyword
those seven schemas actually use is implemented correctly, including the
`additionalProperties`/`allOf`/`if`/`then` interaction the review specifically targeted, and
the suite demonstrably fails on the real defect. But three of its four holes (V1, V2, V3)
are traps that open the moment a future author writes a perfectly ordinary schema, and the
fourth (V4) is live now and makes every timestamp in the catalog materially weaker than the
word `date-time` implies. The module advertises an invariant it does not hold. Fix V1–V4 —
each is a few lines — and the claim becomes unqualified.

---

## 3. Item 2 — per-rule sourcing table, re-run

Baseline re-read at `28d3142`:
`docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md` §5.2;
`docs/plans/module-contracts-events-jobs-workstream-th.md` §D lines 228–233, §G line 269;
`docs/plans/asset-library-database-ux-spec-th.md` lines 248 and 264;
`docs/sprint-0a/sprint-0a-stripe-billing-contract-th.md` line 284.

Corpus checks run directly: the string `base64` appears **nowhere** in `docs/`; no
page-size bound appears anywhere in `docs/`; `sha256` appears in `docs/` only in the
object-storage, stripe-billing, asset-library and research packs — none cited by CTR-IDM-001
as authority. Decision Register §5.2 gives CTR-PAG-001 the pre-freeze artifacts "opaque
cursor fixture, stable ordering tests" and CTR-IDM-001 "scope, payload hash, conflict/replay
examples". Confirmed: no algorithm, no charset, no bound.

| # | Rule (prior finding) | Status in the **schema** | Status in the **shipped test predicate** | Ruling |
|---:|---|---|---|---|
| R2 | `page_size` `maximum: 100` | **GONE.** `{"type":"integer","minimum":1}` plus `x-unbounded-note` stating no maximum exists in the baseline | **GONE.** `validPage` now checks only `page_size >= 1`, with a comment "The predicate must not enforce what the shipped schema does not" | **CLOSED, correctly** |
| R3 | cursor charset `^[A-Za-z0-9_-]+$` | **GONE.** `{"type":"string","minLength":1}` plus `x-opacity-rule` stating tamper-safety is NOT enforced | **STILL PRESENT.** `shared-kernel-envelope-contracts.test.mjs` line 39: `const OPAQUE = /^[A-Za-z0-9_-]+$/`, applied to `cursor` and `next_cursor` in `validPage` | **NOT CLOSED — moved, not removed** |
| R4 | `payload_hash` pinned to `sha256:` | **GONE from the schema.** `^[a-z0-9-]+:[0-9a-f]{32,128}$`, algorithm-agnostic, with `x-algorithm-note` naming stripe:284 as precedent for the *shape* only | **STILL PRESENT.** same file, `validIdempotency`: `/^sha256:[0-9a-f]{64}$/.test(f.payload_hash ?? '')` | **NOT CLOSED — moved, not removed** |
| R5 | ≥2 sort keys, undeclared inference | **CITED.** `minItems: 2` (matching the predicate — R1 closed) with `x-tiebreaker-rule` naming asset-library §5.2 and API-003 and labelling itself "a DECLARED inference … not a rule stated verbatim". `freeze_boundary` repeats it. | consistent | **CLOSED in substance**; see N7 for the residue |

Executed proof of the two non-closures (schema vs. the predicate that gates CI):

```
-- payload_hash                                schema     predicate
   blake3:aa…                                  ACCEPT     REJECT     <<< DISAGREE
   sha512:aa…                                  ACCEPT     REJECT     <<< DISAGREE
   sha3-256:aa…                                ACCEPT     REJECT     <<< DISAGREE
-- cursor
   a+b/c==            (standard base64)        ACCEPT     REJECT     <<< DISAGREE
   header.payload.sig (signed token)           ACCEPT     REJECT     <<< DISAGREE
```

**Ruling on item 2.** *Two* of the three invented rules are gone. The third (`page_size`) is
genuinely and completely gone. The other two were removed from the artifact and left
standing in the acceptance test — which is the repository's executable statement of what
CTR-PAG-001 and CTR-IDM-001 accept. A contract owner who later selects BLAKE3, or an
implementer whose cursor is standard base64 or a dot-separated signed token, is conformant
with the shipped contract and **red in CI**, against a rule with no baseline source. This is
finding **N1**, and it is the same defect class as the original R7 (the self-check asserting
something the artifacts contradict), appearing inside the section written to correct R7. The
"Baseline sourcing — CORRECTED" table's word "REMOVED" is not accurate for two of its three
rows.

Nothing genuinely **new** appears without a baseline source. The one rule that is new in
substance — that `payload_hash` must carry an explicit `algorithm:` prefix — is itself
author-chosen shape (stripe:284 is cited as precedent, not authority, and the note says so
plainly). Declared, narrow, and honest; I do not rule it invented.

---

## 4. Item 3 — ruling on the `accepted-gap-` category

### What the test actually requires

`shared-kernel-schema-conformance.test.mjs` lines 51–75:
`accepted-gap-*` fixtures **must pass** their own schema; every `accepted-gap-` fixture must
have a `manifest.accepted_gaps[<path>]` entry that is a string **longer than 80 characters**;
and every declared gap must correspond to a listed fixture. That is the entire gate.

### Are the two existing gaps honest?

Yes, both, verified directly:
- `accepted-gap-decodable-offset-cursor.json` — the cursor `b2Zmc2V0PTQwJmxpbWl0PTIw`
  base64-decodes to exactly `offset=40&limit=20`. The schema does accept it. The gap text
  names the missing MAC/signature, and a dedicated test asserts the text mentions
  tamper/integrity/MAC/signature.
- `accepted-gap-unbounded-page-size.json` — `page_size: 500`, and the schema's only bound is
  `minimum: 1`. The gap text says so and refers the bound to the contract owner.

Both describe rules that genuinely have no baseline source. Both make a previously
*mislabelled* fixture honest: the old `invalid-` names were passing for the wrong reason
(the old test rejected the cursor only because it happened to contain `=` and `&`).

### Can the category launder an inconvenient rule?

**Yes — for any rule that is not separately guarded by a hand-written assertion.** Executed
in a sandbox: I deleted the CTR-PAG-001 rule "a page result must not carry a request cursor"
(`allOf[1].then.not.required:["cursor"]`) from the schema, added a fixture named
`accepted-gap-page-echoes-request-cursor.json` demonstrating exactly the deleted rule, and
wrote two sentences of plausible prose into `accepted_gaps`.

```
npm run check → tests 70 / pass 70 / fail 0   exit 0
```

The test count did not move, so a reviewer watching counts sees nothing. Nothing routes the
new gap to a human — contrast `x-amended-by`, which at least carries
`acknowledgement_required_from`. There is no cap on the number of gaps and no requirement
that a gap be cross-referenced from `freeze_boundary`.

What *does* resist laundering: a rule with its own hardcoded test. I attempted to launder
the new `status_ref` allow-list the same way and it failed — `a reference field rejects
every scheme outside its allow-list` caught it (`ctr-api-001 accepts a hostile reference:
HTTPS://public.example.invalid/x`). The hand-written predicate in the envelope suite acts as
a second accidental gate for the rules it happens to cover.

### Ruling

**The category is honest engineering as used, and under-guarded as a mechanism.** I approve
the concept: forcing a knowingly-accepted case to *pass* means the schema must actually be
weakened in the schema, in the open, rather than the gap hiding behind a green negative test
— which is a genuine improvement on `invalid-` naming that lies. Both instances are truthful.
But an 81-character string is the whole gate, so the category will launder any future rule
that lacks a dedicated assertion, and it makes that laundering invisible in the test count.
Conditions in §9 (C2).

---

## 5. Item 4 — the 11 reference-guard probes, re-run

Method: pristine copy restored between every probe; mutation applied; the committed
`catalog-reference-integrity.test.mjs` run unmodified; exit code recorded. Baseline (clean
tree) exits `0` at `tests 5 / pass 5`.

| # | Probe | `106f91c` | `28d3142` | |
|---:|---|---|---|---|
| A1 | `$ref` nested inside an array (`allOf[0].anyOf[0]`) | caught | **caught** | — |
| A2 | `$ref` nested six objects deep | caught | **caught** | — |
| A3 | broken `$ref` in a `manifest.json`, not a `schema.json` | MISS | **caught** | **closed** |
| A4 | `$ref` to a **directory** that exists | MISS | **caught** (`— is not a file`) | **closed** |
| A5 | case-differing path | MISS | **partial** — filename case caught (`../ctr-ten-001/SCHEMA.json`); **directory** case still MISSED (`../CTR-TEN-001/schema.json`, exit 0) | **partial** |
| A6 | broken `#`-fragment ref (`#/$defs/doesNotExist`) | MISS | **MISS** — `!value.startsWith('#')` still skips every internal pointer | open |
| A7 | **legitimate** cross-file JSON Pointer (`…/schema.json#/properties/workspace_id`) | false positive | **still a false positive** — reported as `…schema.json#/properties/workspace_id — does not exist` | open |
| A8 | `schema.json` in a nested subdirectory | MISS | **caught** (`catalogJsonFiles` recurses) | **closed** |
| A9 | manifest declaring a schema **not named** `schema.json` | MISS | **MISS**, and now worse — see N4 | open |
| A10 | broken ref in a sibling catalog root (`contract-catalog/domain/…`) | MISS | **caught** (`CATALOG_ROOT` walk) | **closed** |
| A11 | `$ref` whose value is an **object**, not a string | MISS | **MISS** — `typeof value === 'string'` still falls through to the recursive branch | open |

**Tally: of the 8 misses and 1 false positive in my original table, 4 are fully closed
(A3, A4, A8, A10), 1 is partially closed (A5), 3 remain open (A6, A9, A11), and the false
positive (A7) is unchanged.** The four closed are the four that mattered most, and the two
substantive ones I called out by name — A9 and A10 — split: A10 closed, A9 did not.

### New misses found this round

| # | Probe | Result |
|---:|---|---|
| **B1** | `$ref` to a file that is valid JSON but **not a schema** (`../ctr-ten-001/manifest.json`), under a property name **not** in `EXPECTED_REF_TARGET` | **MISS**, exit 0. Only `tenant_context` and `error` are identity-checked; every other cross-contract reference is checked for existence only |
| **B2** | same, under `tenant_context` | caught (`resolves to $id undefined, expected CTR-TEN-001`) |
| **B8** | nested-directory contract whose `manifest.json` declares a fixture that does not exist | **MISS**, exit 0 — `contractDirectories()` is still one level deep under `shared-kernel`, so the manifest-fixture and undeclared-fixture tests never reach it. A8/A10 are closed only for `$ref` integrity |
| **B6/B7** | `$ref` escaping the catalog (`../../../package.json`); remote URL (`https://evil.example/tenant.json`) | both **caught** — the scheme test and the escape test are genuinely fixed |

---

## 6. Item 5 — the `$id`-identity check

`EXPECTED_REF_TARGET = { tenant_context: 'CTR-TEN-001', error: 'CTR-ERR-001' }`, matched by
`path.split('.').at(-1)`. The Security run's attack — repointing `tenant_context` at
`ctr-err-001/schema.json` — is genuinely closed; I reproduced the catch. **But the mapping
is defeated three ways, all executed:**

| # | Attack | Result |
|---:|---|---|
| **B3** | wrap the reference one level deeper: `"tenant_context": {"allOf":[{"$ref":"../ctr-err-001/schema.json"}]}` | **DEFEATS IT**, exit 0. `path` becomes `$.properties.tenant_context.allOf[0]`, whose last segment is `allOf[0]`, which is not a key in the map. The reference still functions; the identity check simply does not run |
| **B4** | rename the property: `"tenant": {"$ref":"../ctr-err-001/schema.json"}` | **DEFEATS IT**, exit 0 |
| **B5** | forge the target's `$id`: a file containing the CTR-ERR-001 body with `"$id":"CTR-TEN-001"`, referenced as `tenant_context` | **DEFEATS IT**, exit 0. Nothing binds `$id` to file location: `shared-kernel-contract-catalog.test.mjs:67` asserts `schema.$id === id` only for the four **Candidate** contracts, and no test asserts `$id` uniqueness across the catalog |

**Ruling on item 5: the property-name-based mapping is not sound as a guard, only as a
smoke alarm.** It closes the one demonstrated attack and nothing more. It is name-based, so
it is escaped by any position that is not a direct `properties.<name>` child; it is
allow-list-shaped over exactly two names, so 100% of future cross-contract references are
uncovered by default (B1); and it trusts the target's self-declared `$id` while nothing
binds `$id` to the directory for the ten Draft contracts (B5). On the converse risk the task
raises — a `tenant_context` property somewhere it is not a contract reference — I found no
live instance and no false positive; the check only fires on `$ref` nodes, so an inline
`tenant_context` is invisible either way. Fix direction: derive the expectation from the
*resolved path* (`…/ctr-ten-001/schema.json` must have `$id: CTR-TEN-001`) rather than from
the referring property name, and assert `$id` ↔ directory for **all** contracts. That is
strictly stronger and needs no name table.

---

## 7. Item 6 — `index.json` and freeze levels

`contract-catalog/shared-kernel/index.json` read directly: `catalog_version 1.0.0`,
`source` → Decision Register §5.2, **14 contracts, 4 `Candidate` (CTR-TEN-001, CTR-ERR-001,
CTR-EVT-001, CTR-JOB-001), 10 `Draft`**, every entry `version 1.0.0`. CTR-API-001,
CTR-PAG-001 and CTR-IDM-001 are all still `Draft`. All seven contract manifests agree with
the index on status. **CONFIRMED — untouched, 4/10 unchanged, no contract advanced a freeze
level.** (I could not diff against `f28fb8e` because the frozen root has no `.git`; the
content matches what I recorded reading it at `106f91c`.)

---

## 8. Item 7 — new findings introduced or left by the rework

| ID | Severity | Finding |
|---|---|---|
| **N1** | **Blocking** | The `sha256:` pin and the cursor charset were removed from the schemas and **left standing in the shipped acceptance predicate** (`shared-kernel-envelope-contracts.test.mjs`: `/^sha256:[0-9a-f]{64}$/` in `validIdempotency`; `const OPAQUE = /^[A-Za-z0-9_-]+$/` in `validPage`). Executed proof in §3. Both rules have no baseline source, both are declared removed in the self-check's corrected section, and both still gate CI. The same function applies the correct principle to `page_size` in a comment — "the predicate must not enforce what the shipped schema does not" — and not to these two. **Fix:** delete both from the predicate, or restore them to the schemas with a cited source. |
| **N2** | **Blocking** | The `additionalProperties` guard **self-disables**. `shared-kernel-schema-conformance.test.mjs:79` reads `if (schema.additionalProperties !== false) continue;` — so deleting the keyword makes the test *skip* the contract rather than fail it. Executed: removing `additionalProperties:false` from `ctr-ten-001/schema.json` leaves `npm run check` at `70/70`, exit `0`, while an extra `leaked_service_token` inside `tenant_context` becomes accepted. The guard against the Tester's headline finding can be turned off by deleting the thing it guards. **Fix:** assert `additionalProperties === false` for every catalog schema and every nested object subschema, then probe. |
| **N3** | Major | **E2 is a tautological test.** `duplicate sort fields do not count as a tiebreaker` asserts `new Set(['created_at','created_at']).size < 2` — it never calls `validPage` or the schema. Executed: a sort of `[{created_at,desc},{created_at,asc}]` is **accepted by the schema and accepted by the predicate**. `sort` has `minItems: 2` and no `uniqueItems` and no distinct-`field` constraint. The self-check's claim that "duplicate sort fields satisfying ≥2 keys … are each now covered" is not met, and the tiebreaker rule the package leads with is still satisfiable by repeating one key. **Fix:** constrain distinct `field` values in the schema (or state the gap), and make the test exercise the contract. |
| **N4** | Major | **A contract can opt out of schema conformance entirely.** `contracts()` reads `join(base,'schema.json')` and swallows the failure in a bare `catch` whose comment claims the case is "covered by the reference-integrity suite" — it is not: that suite checks `manifest.schema` exists, and `envelope.json` does exist. Executed: a contract directory whose manifest declares `"schema": "envelope.json"`, shipping a fixture named `invalid-*` that its own schema **accepts**, leaves `npm run check` at `70/70`, exit `0`. This is my A9 miss, now load-bearing. **Fix:** follow `manifest.schema`; make a directory with a manifest and no readable schema a failure, not a skip. |
| **N5** | Major | **CTR-JOB-001 was left on the deny-list.** `input_ref` and `result_ref` still use `{"not":{"pattern":"^https?://"}}` while the identically-named CTR-IDM-001 `result_ref` and CTR-API-001 `status_ref`/`deep_link_ref` moved to the allow-list. Executed against the shipped schema: `HTTPS://public.example.invalid/x`, `//public.example.invalid/x`, `file:///etc/passwd`, `data:text/plain;base64,AA==`, `javascript:alert(1)`, `../../../etc/passwd`, `ftp://h/x` — **7 of 8 accepted**. The new test `a reference field rejects every scheme outside its allow-list` enumerates exactly those 8 values and points them at `ctr-api-001` and `ctr-idm-001` only. I accept that CTR-JOB-001 is a WP-0A-CON-001 artifact and out of this package's write scope; the *test's* coverage boundary stopping precisely where the defect starts is in scope. **Fix:** extend the hostile-scheme test to CTR-JOB-001 as a declared expected failure, or record it as an open cross-package defect naming the owner. |
| **N6** | Medium | Validator holes V1–V4 (§2.2). V4 is live on every timestamp field; V1–V3 are traps for the next author and defeat the module's stated unknown-keyword invariant, because all three are *known* keywords with partial or absent implementations. |
| **N7** | Low | `ctr-pag-001/manifest.json` `source_references` still lists only Decision Register §5.2 and Workstream §D API-003. `asset-library-database-ux-spec-th.md` §5.2 — the source that actually carries the tiebreaker inference — appears only in `freeze_boundary` prose and in the schema's `x-tiebreaker-rule`. R5 is closed in substance but not in the structured field a tool would read. |
| **N8** | Low | The `x-` escape hatch is uninspected by `assertSchemaSupported` (§2.3). Not abused anywhere in this catalog — every `x-` key documents *non*-enforcement — but nothing prevents `x-required` from being written next round and reading as a rule. |
| **R6** | Carried, unaddressed | API-005's `accepted` receipt still lives in CTR-API-001 while Decision Register §5.2 names CTR-JOB-001 "Background Job Envelope **+ receipt**". Declared, still in the wrong catalog row. |
| **R10** | Carried, unaddressed | `manifest.composes` is validated by nothing (`grep -rn composes test-kits scripts` → no hits). `ctr-pag-001` still declares `composes: ["CTR-API-001"]` with no reference of any kind to it. |
| **R12** | Carried, unaddressed | CTR-API-001 requires `request_id`/`correlation_id` at the envelope top level in addition to the copies inside `tenant_context`, with no rule tying the copies together. |
| **N-C1** | Carried, unaddressed | `x-amended-by` / `acknowledgement_status: "pending"` is read by no script, test, or CI job (`grep` → no hits). Nothing prevents `pending` surviving to merge. |

**Things I checked and found genuinely correct**, so they are not findings: R1 is closed —
`sort.minItems` is now `2` and the conformance suite fails on its reintroduction with a
precise message (§1); R2 (`page_size` bound) is fully closed in both schema and predicate;
nested `additionalProperties: false` is really enforced at depth, including through `$ref`
(§2.1); `type: object` correctly rejects `null` and `[]`, closing the old R9 `data: null`
hole at schema level; the `data` leakage boundary is declared in the schema rather than left
implicit; both `accepted-gap-` instances are truthful; `untestable_by_fixture` is an honest
declaration and is asserted; the escape and remote-URL tests are genuinely fixed (B6, B7);
`index.json` is untouched at 4/10 (§7); every declared command reproduces at the exit code
claimed (§1); all three contracts stay `Draft`; every fixture is synthetic.

---

## 9. Conditions, if a later role wishes to proceed on conditions rather than rework

- **(C1)** N1 must be fixed in the artifacts, not annotated. It is a two-line deletion.
- **(C2)** `accepted_gaps` entries must carry an `acknowledgement_required_from` naming a
  human authority and an `acknowledgement_status`, on the `x-amended-by` pattern, and must be
  cross-referenced from `freeze_boundary`. An 81-character string must not be the whole gate.
- **(C3)** The `$id` identity expectation must be derived from the resolved path, and
  `$id` ↔ directory asserted for all 14 contracts, not the 4 Candidates.
- **(C4)** Conditions (a)–(e) from my `106f91c` review on amending a delivered artifact stand
  unchanged; RFC-2026-004 is still `Proposed` and the amendment remains **staged, not
  authorized**.

---

## 10. Verdict

The rework is substantially real and I want to say so plainly. The blocking defect I found
is fixed at its root rather than patched: a schema is now executed against its own fixtures,
the suite provably fails on the reintroduced defect, nested `additionalProperties` really
does reject a leaked key at depth, the reference guard closed four of my worst misses
including the two I said mattered most, and the `accepted-gap-` category is a better answer
than a negative test that passes for the wrong reason. The validator is honest work and, for
the seven schemas as shipped, sound enough to carry the conformance claims.

It does not pass, for one reason above all. The self-check's corrected section — written
specifically to repair a false "nothing was inferred" claim — states that the `sha256` pin
and the cursor charset were **REMOVED**. They were removed from the schemas and left running
in the acceptance predicate that gates CI, where they still reject BLAKE3 hashes and
standard-base64 cursors against no baseline line. That is the original R7 defect reproduced
inside its own correction, and a downstream role reading "REMOVED" would be misled a second
time. N2 compounds it: the guard protecting the Tester's headline finding switches itself off
if the property it guards is deleted, and N4 lets a whole contract opt out of conformance
while CI reports 70/70. N3 means the tiebreaker rule the package leads with is still
satisfiable by repeating one sort key, and the test that claims to cover it asserts a fact
about JavaScript Sets.

These are corrections to artifacts and tests, not conditions a later role could discharge
with a note.

VERDICT: changes_requested
