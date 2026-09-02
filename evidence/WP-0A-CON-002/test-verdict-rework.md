# WP-0A-CON-002 — Independent Tester verdict on the rework

**This document is independent Tester evidence only.** It is not a review sign-off, not an
approval, and it carries no Author or Reviewer authority. Every claim below was produced by
executing code in a frozen extraction; nothing was inferred from the Author's handoff text.

| field | value |
| --- | --- |
| agent_run_id | `/claude/q0_sentinel` |
| role | Independent Tester |
| work package | WP-0A-CON-002 |
| commit tested | `28d3142` |
| prior head attacked | `106f91c` (17 gaps returned) |
| working root | `<scratchpad>/con002-review` (frozen extraction; the live repository at `/Users/bank/ThinkBizThai` was never read or written) |
| probe method | every destructive probe ran in a fresh `cp -R` of a pristine copy; no `git checkout`, no in-place restore |

## Toolchain observed

| item | observed | pinned |
| --- | --- | --- |
| node | `v24.20.0` | `.node-version` = `24.20.0`, `engines.node` = `24.20.0` |
| npm | `11.19.0` | `engines.npm` / `packageManager` = `11.19.0` |
| command | `zsh -lc 'cd <root> && npm run check'` | `package.json` `check` |

Fingerprints of the artefacts under test:

```
MD5 (contract-catalog/shared-kernel/index.json)      = cb251c2b8e019d8bb145a4e70334f0e2
MD5 (test-kits/contracts/json-schema-subset.mjs)     = 0fcb60eb5d8f1406b0c348ca7b1aa525
MD5 (package.json)                                   = e0898b1582bad95017e4b1cb3ee6928b
```

## 6. `npm run check` at this head — exit code, summary, decomposition

```
EXIT = 0

> check
> node scripts/verify-toolchain.mjs && npm run scan:secrets && npm run validate:protocol
  && npm run verify:coverage-floor && npm run test:bootstrap

ℹ tests 70
ℹ suites 0
ℹ pass 70
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 248.028208
```

Per-file decomposition. The left column is the count `node --test <file>` reported when the
file was executed alone; the right column is `grep -cE '^test\('` on the source. They agree
for every file, so no test is defined-but-unreachable and none is being filtered out.

| file | executed | declared |
| --- | --- | --- |
| `test-kits/capability-profile.test.mjs` | 4 | 4 |
| `test-kits/contracts/catalog-reference-integrity.test.mjs` | 5 | 5 |
| `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | 6 | 6 |
| `test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | 14 | 14 |
| `test-kits/contracts/shared-kernel-schema-conformance.test.mjs` (new) | 5 | 5 |
| `test-kits/repository-json.test.mjs` | 2 | 2 |
| `test-kits/role-separation.test.mjs` | 8 | 8 |
| `test-kits/secret-scan.test.mjs` | 2 | 2 |
| `test-kits/test-coverage-floor.test.mjs` | 14 | 14 |
| `test-kits/toolchain-contract.test.mjs` | 3 | 3 |
| `test-kits/work-package-discovery.test.mjs` | 1 | 1 |
| `test-kits/work-package-ownership.test.mjs` | 6 | 6 |
| **total** | **70** | **70** |

59 → 70 = +11 executed tests (+5 in the new `shared-kernel-schema-conformance` suite,
+6 in `shared-kernel-envelope-contracts`).

## 7. Nothing weakened / index unchanged

- `contract-catalog/shared-kernel/index.json`: 14 contracts, **4 Candidate / 10 Draft**.
  `CTR-API-001`, `CTR-PAG-001`, `CTR-IDM-001` all still `Draft` — materializing them did not
  promote them. Confirmed by direct enumeration, not by reading the test that asserts it.
- `skipped 0`, `todo 0`, `cancelled 0`.
- `grep -rnE "\.skip|\.todo|\{ *(skip|todo|only) *:|test\.only"` over `test-kits/` and
  `scripts/` returns **nothing**. No test is disabled by marker.
- Executed count equals declared count in every file, so no test was orphaned.

Two deliberate *predicate* relaxations exist and are disclosed in source comments and in
`manifest.accepted_gaps`, not hidden:
1. `validPage` no longer enforces a maximum `page_size` (the previous bound of 100 was
   unsourced). Now carried as `accepted-gap-unbounded-page-size.json`.
2. The "decodable offset cursor is rejected" test had its polarity **inverted** — it now
   asserts the contract *accepts* a forgeable cursor. This is an honest restatement (the old
   assertion passed only by accident of charset), but it is a net reduction in what the suite
   forbids, and it is recorded here as such.

---

## Attack table — every probe, real exit code, fail-closed status

Each row is a full `npm run check` in a fresh copy unless marked *(unit)*.
"Failed closed" = the attack was rejected with a non-zero exit.

| # | attack | real exit | failed closed? | caught by |
| --- | --- | --- | --- | --- |
| A1 | **G1 rebuilt**: `valid-` fixture with `HTTPS://` in `status_ref`, `HtTpS://` in `deep_link_ref`, raw JWT in `tenant_context`, `internal_sql` + `debug_stack` at top level | **1** | yes | `every fixture agrees with its own shipped schema` |
| A2 | same fixture renamed `accepted-gap-` with an explanation | **1** | yes | same — `accepted-gap-` must also satisfy the schema |
| A3 | `status_ref: "job:../../../etc/passwd"`, `deep_link_ref: "content:../../secret"` | **0** | **NO — leak** | nothing |
| A4 | two `valid-` fixtures, same `idempotency_key` + same `scope`, **different `payload_hash`**, different `result_ref` | **0** | **NO — leak** | nothing |
| A5 | rule-violating fixture laundered as `accepted-gap-` with reason = 81 literal `x` characters | **0** | **NO — but see item 5** | nothing (reason is length-checked only) |
| b1 | duplicate sort fields (`created_at` desc + `created_at` asc) in a `valid-` request | **0** | **NO — leak** | nothing |
| b2 | `has_more: true`, `next_cursor` **absent** | **1** | yes | schema conformance + envelope predicate |
| b2b | `has_more: true`, `next_cursor: null` | **1** | yes | schema conformance + envelope predicate |
| b3 | `data: null` | **1** | yes | schema conformance + envelope predicate |
| b4 | `data: []` | **1** | yes | schema conformance + envelope predicate |
| b5 | `scope.operation: "DROP TABLE users"` | **1** | yes | schema conformance (`pattern`) |
| b6 | `created_at: "not-a-date"` | **1** | yes | schema conformance (`format: date-time`) |
| b6b | `created_at: "2026"` (Date.parse-lenient, not RFC3339) | **0** | **NO — leak** | nothing |
| c1 | extra secret keys at **envelope** level | **1** | yes | schema conformance |
| c2 | extra `bearer_token` (JWT) at **tenant_context** level | **1** | yes | schema conformance |
| c3 | extra `internal_queue_url` at **accepted** level | **1** | yes | schema conformance |
| c4 | extra `stack_trace` at **error** level | **1** | yes | schema conformance |
| c4b | `error.details` non-empty (`{sql: ...}`) | **1** | yes | schema (`maxProperties: 0`) + predicate |
| c5 | extra `db_password` at **scope** level | **1** | yes | schema conformance |
| d1 | raw JWT smuggled into the **declared** field `tenant_context.actor.id` | **0** | **NO — leak** | nothing |
| d2 | `internal_sql` / `debug_stack` / JWT / public URL inside `data` | **0** | **NO — declared gap** | nothing (documented `x-leakage-boundary`) |
| d3 | d2 laundered as `accepted-gap-` | **0** | **NO — declared gap** | nothing |
| M1 | mutate schema `sort.minItems` 2 → 1 (the original G defect) | **1** | yes | schema conformance |
| M2 | delete the allow-list `pattern` on `accepted.status_ref` | **1** | yes | hostile-scheme test + conformance |
| M3 | delete the allow-list `pattern` on `accepted.deep_link_ref` **only** | **0** | **NO — unpinned** | nothing |
| M4 | delete `additionalProperties: false` from `ctr-ten-001` | **0** | **NO — self-disabling guard** | nothing |
| M4b | M4 **plus** a `valid-` fixture with `tenant_context.bearer_token` (JWT) and `tenant_context.db_password` | **0** | **NO — G1 fully re-opened** | nothing |
| M5 | delete the `has_more`/`next_cursor` continuity `allOf` | **1** | yes | schema conformance |
| M6 | delete the entire new `shared-kernel-schema-conformance.test.mjs` suite | **0** (`tests 65`) | **NO — floor is 40** | nothing |
| M7 | delete `error.details` `maxProperties: 0` | **1** | yes | catalog suite + conformance |
| V1 | *(unit)* schema declares `additionalProperties: {type:string, maxLength:64}` — validator ignores it entirely | n/a | **NO** | `assertSchemaSupported` returns **ok** |
| V1e | **end-to-end**: V1 applied to `ctr-api-001.data` + a `valid-` fixture with nested objects and numbers in `data` | **0** | **NO — validator defeated through its own gate** | nothing |
| V2 | *(unit)* `$ref` with sibling `maxProperties` / `required` / `additionalProperties` — all siblings silently dropped | n/a | **NO** | `assertSchemaSupported` returns **ok** |
| V3 | *(unit)* `uniqueItems` with `[{a:1,b:2},{b:2,a:1}]` — identical in JSON Schema, distinct under `JSON.stringify` | n/a | **NO** | `assertSchemaSupported` returns **ok** |
| V4 | *(unit)* `minLength: 2` satisfied by a single astral character (UTF-16 units, not characters) | n/a | **NO** | `assertSchemaSupported` returns **ok** |
| V5 | *(unit)* tuple-form `items: [ ... ]` | n/a | **yes (fails loud)** | `assertSchemaSupported` **throws** |
| V6 | *(unit)* `format: "uri"` declared, enforces nothing | n/a | matches real JSON Schema (annotation-only) | — |
| V7 | *(unit)* `additionalProperties:false` + sibling `allOf` `properties`; `required` in `then`; `oneOf` exact-one; `not`; `enum`; `type: integer` for `1.0`; unicode `pattern` | n/a | **all consistent with a real implementation** | — |

**Totals: 22 attacks failed closed with exit 1; 15 passed green (exit 0) or were accepted by
the validator.** Of the 15, 2 are pre-declared gaps (d2/d3, `data`), leaving 13 undeclared.

---

## 1. G1 rebuilt — which scheme forms are now rejected

The three ref fields (`ctr-api-001.accepted.status_ref`, `.deep_link_ref`,
`ctr-idm-001.result_ref`) now carry an **allow-list** pattern
`^(job|status|result|app|asset|content):[A-Za-z0-9._/-]+$`. The deny-list was replaced. Result:

| value | verdict |
| --- | --- |
| `HTTPS://public.example.invalid/x` | **rejected** |
| `https://public.example.invalid/x` | **rejected** |
| `HtTpS://public.example.invalid/x` | **rejected** |
| `//public.example.invalid/x` | **rejected** |
| `ftp://h/x` | **rejected** |
| `data:text/plain;base64,AA==` | **rejected** |
| `file:///etc/passwd` | **rejected** |
| `javascript:alert(1)` | **rejected** |
| `../../../etc/passwd` | **rejected** |
| `HTTPS:%2F%2Fx` | **rejected** |
| `status:https://public.example.invalid/x` | **rejected** |
| `job:../../../etc/passwd` | **ACCEPTED** |
| `content:../../secret` | **ACCEPTED** |

**Every scheme form from the original G1 finding is now rejected, on both contracts, at
exit 1.** The G1 leak fixture (A1) fails closed.

**New residual (A3):** the allow-list constrains the *scheme* but the path segment permits
`.` and `/` in any arrangement, so `..` traversal inside an allowed scheme passes green. The
`x-reference-rule` annotation claims "a deny-list cannot enumerate what must not appear" —
correct, but the replacement allow-list only allow-lists the prefix.

**Also material:** A1 was caught by **one** test only — the new schema-conformance suite. The
two predicate-level tests in `shared-kernel-envelope-contracts.test.mjs` are still blind to
it: `isPrivateRef` uses `/^https?:\/\//` and the leak scan uses
`/"(status_ref|...)":"https?:\/\//` — both lowercase-only, both still matched by `HTTPS://`.
Enforcement of the entire reference rule now rests on a single point (see M3, M4, M6).

## 2. Attacking the new validator — defeated

`test-kits/contracts/json-schema-subset.mjs` states its own invariant:

> "An unknown keyword is an ERROR, not a silent pass: a schema must never appear to constrain
> something this validator ignores."

**That invariant is false, and I broke it end-to-end through the gate that is supposed to
enforce it.** `additionalProperties` is in `SUPPORTED`, and `assertSchemaSupported` recurses
into it when it is an object — but `validate()` only ever acts on
`schema.additionalProperties === false`. When `additionalProperties` is a *schema*, it is
enforced nowhere and flagged nowhere.

Demonstration (V1e), a full `npm run check`:

```js
// ctr-api-001/schema.json — reads as a real constraint, passes assertSchemaSupported
s.properties.data.additionalProperties = { type: "string", maxLength: 64 };
```
```json
// examples/valid-ap-schema-bypass.json
"data": { "internal_sql": "SELECT * FROM users WHERE 1=1",
          "debug_stack": { "frames": [ { "file": "db.js", "line": 1 } ] },
          "provider_raw": { "n": 12345 } }
```
```
EXIT = 0    ℹ tests 70   ℹ pass 70   ℹ fail 0
```

Any real JSON Schema implementation rejects that fixture three times over. The suite reports
it green, and the schema now carries a leakage control that exists only as text. This is the
same defect class the whole rework was commissioned to remove, relocated from the fixtures
into the validator.

Three further divergences, each blessed by `assertSchemaSupported`:

- **`$ref` siblings are silently dropped.** `validate` returns early on `$ref`. A schema
  written `{"$ref": "../ctr-err-001/schema.json", "maxProperties": 0, "required": ["x"]}`
  enforces only the target; in draft 2020-12 the siblings apply. The catalog's `$ref`s
  currently have no siblings, so this is latent, not live.
- **`uniqueItems` compares `JSON.stringify` output**, so `{"a":1,"b":2}` and `{"b":2,"a":1}`
  count as distinct. JSON Schema treats them as equal. (`enum`/`const` share the mechanism;
  there the error is over-strict, which fails closed.) No catalog schema uses `uniqueItems`
  today — but see item 4: `sort` is exactly where one is needed.
- **`minLength`/`maxLength` count UTF-16 code units**, not characters: `minLength: 2` is
  satisfied by one astral character.
- **`format: "date-time"` is `Date.parse`**, which accepts `"2026"` and `"Aug 31 2026"`.
  Probe b6b confirms `created_at: "2026"` passes the full check green.

Checked and **found consistent** with a real implementation, i.e. **not** exploitable:
`additionalProperties:false` alongside `allOf`/`if`/`then` (the subset correctly does *not*
see sibling `properties` across branches); `required` nested in `then`; `oneOf` exact-one
counting; `not`; `enum`; `type: integer` for `1.0`; unicode `pattern` including trailing
newline and Cyrillic homoglyphs. Tuple-form `items` **fails loud** (the gate throws).
`x-` keywords cannot smuggle a constraint any more than an unknown keyword can in real JSON
Schema — that one is fine.

## 3. The relational idempotency check — a closed loop

`idempotencyOutcome` is **defined and consumed only inside the file that defines it**:

```
shared-kernel-envelope-contracts.test.mjs:177   export function idempotencyOutcome(...)
shared-kernel-envelope-contracts.test.mjs:186,189,192,194   the only call sites
```

No production code, no script, no schema and no manifest references it.
`grep -c conflict ctr-idm-001/schema.json` = **0**. The contract's own `freeze_boundary` says
the package "materializes exactly the ID-001 acceptance rule (payload-hash mismatch is a
conflict)" — but nothing in `schema.json` is relational, and no JSON Schema document can be.
The rule is enforced by exactly one exported function that only its own test calls.

The test then hardcodes the two fixtures it compares
(`valid-completed-replay.json` vs `valid-in-progress.json`). Nothing sweeps the catalog for
key collisions. **A4:** I shipped a third `valid-` fixture with the *same* `idempotency_key`
and the *same* `scope` but `payload_hash: sha256:bbb…` and a different `result_ref` — two
records that ID-001 says must conflict, both declared valid, both accepted:

```
EXIT = 0    ℹ tests 70   ℹ pass 70   ℹ fail 0
```

So: the *function* is correct and now tested (that is a genuine improvement over `106f91c`,
where the rule had no test at all), but the *catalog* is not swept, and the notion of conflict
is enforced by nothing outside that one function.

Minor: `idempotencyOutcome` compares only `scope.workspace_id` and `scope.operation`
positionally. A future third scope field would be ignored, silently widening "replay".

## 4. Re-run of the other gaps — see rows b1–d3 above

Fixed and failing closed at exit 1: `has_more: true` with the cursor absent **and** null
(the `OPAQUE.test(undefined)` coercion bug is gone — the schema now constrains the pair
together); `data: null`; `data: []`; `data: "text"`; `scope.operation: "DROP TABLE users"`;
`created_at: "not-a-date"`; and extra keys carrying secrets at **envelope**,
**tenant_context**, **accepted**, **error** and **scope** level — all five levels, all
exit 1.

**Still open — duplicate sort fields (b1), and this one is worse than it was.** The schema
declares `sort.minItems: 2` with no `uniqueItems` and no distinct-field constraint, so
`[{created_at, desc}, {created_at, asc}]` satisfies "two sort keys" while providing no
tiebreaker at all. A `valid-` fixture carrying it passes green (exit 0). The suite now
contains a test *named* for this gap:

```js
test('duplicate sort fields do not count as a tiebreaker', async () => {
  const duplicated = { ...page, sort: [{field:'created_at',...},{field:'created_at',...}] };
  const distinct = new Set(duplicated.sort.map((s) => s.field));
  assert.equal(distinct.size < duplicated.sort.length, true, ...);   // asserts 1 < 2
});
```

`validPage(duplicated)` is never called and the schema is never run against it. The assertion
is `1 < 2` — true regardless of the contract. The test cannot fail for any change to the
catalog. This is a test that reads as coverage and is not; it is precisely the pattern the
rework exists to eliminate, reintroduced under the name of the gap it claims to close.

`created_at: "2026"` (b6b) also still passes, via the `Date.parse` leniency in item 2.

`d1` — a raw JWT placed in the *declared* field `tenant_context.actor.id` passes green.
The extra-key form is fixed; the declared-field form is not, and
`scripts/scan-repository-secrets.mjs` has no JWT/`eyJ` pattern among its five regexes.

## 5. The `accepted-gap-` category — real for schemas, cosmetic for reasons

**The control is real where it matters.** In `shared-kernel-schema-conformance.test.mjs`:

```js
const mustPass = /(^|\/)(valid[-.]|accepted-gap-)/.test(fixture);
if (mustPass) assert.deepEqual(errors, [], `${dir}/${fixture} must satisfy its schema`);
```

`accepted-gap-` fixtures are held to **exactly the same schema bar as `valid-`**, and the
envelope suite's predicate treats them identically. **A2 confirms it end-to-end:** the G1 leak
fixture renamed `accepted-gap-public-refs.json` with a plausible 300-character explanation
still exits **1**. An arbitrary broken fixture **cannot** be laundered by renaming.

Three real weaknesses remain in the surrounding controls:

1. **The reason is length-checked, not substance-checked**: `reason.length > 80`. A5 shipped
   `"x".repeat(81)` as the justification and the suite went green (exit 0). Nothing requires
   the text to name the rule, cite a source, or differ from another gap's text.
2. **`accepted-gap-` fixtures are silently exempt from the public-URL leak scan.** That test
   filters `manifest.fixtures.filter((f) => f.includes('/valid-'))`. Today the schema's
   allow-list pattern is what blocks public URLs on the three ref fields, so the exemption is
   not currently exploitable — but the moment a ref field ships without that pattern, the
   `accepted-gap-` prefix removes the only other check. (M3 shows exactly such a field.)
3. **The category cannot express the gaps it is being used for.** A5's laundered fixture
   violates the manifest's own stated tiebreaker rule, and passes — but so does the identical
   fixture named `valid-` (b1). The prefix is not what lets it through; the schema simply does
   not encode the rule. The `accepted-gap-` mechanism is therefore honest about what the
   *schema* accepts and says nothing about what the *manifest prose* claims.

## Additional findings — the new enforcement is a single unpinned point

These are not fixture attacks; they are one-line changes an Author could make and ship green.

- **M4 / M4b — the extra-property guard disables itself.** The guard reads
  `if (schema.additionalProperties !== false) continue;`. Deleting
  `additionalProperties: false` from `ctr-ten-001/schema.json` does not fail the guard — it
  makes the guard *skip that contract*. M4b then shipped a `valid-` fixture with
  `tenant_context.bearer_token` (a raw JWT) and `tenant_context.db_password: "hunter2"`:
  **exit 0, 70/70 pass.** The entire G1 tenant-context finding is one deleted JSON key away
  from returning silently, on the Trusted Tenant Context contract.
- **M3 — `deep_link_ref` is unpinned.** The hostile-scheme test covers `status_ref` and
  `result_ref` only, and no `invalid-` fixture exercises `deep_link_ref`. Deleting its
  `pattern` exits **0**. (The pattern is present today and does reject `HTTPS://`, confirmed
  separately at exit 1 — but nothing holds it there.)
- **M6 — the new suite is not pinned by the coverage floor.** `MIN_EXECUTED_TESTS = 40`,
  `MIN_TEST_FILES = 8`, `MIN_DECLARED_TESTS = 30`. Deleting
  `shared-kernel-schema-conformance.test.mjs` outright leaves 65 tests in 11 files: **exit 0**.
  The one suite that catches 13 of the 22 fail-closed attacks can be removed with a green run.
- **M1, M2, M5, M7 confirm the positive side**: the original `sort.minItems` defect, the
  `status_ref` allow-list, the `has_more`/`next_cursor` continuity rule and
  `error.details.maxProperties` are all genuinely load-bearing — mutating any of them exits 1.

## Assessment

What the Author claims is fixed, is largely fixed, and I could not re-open it from the fixture
side. The schemas now execute — that is the substantive change, and it is real: 22 attacks
that would previously have passed now exit 1, including every scheme form of the G1 URL leak,
every extra-key level, both `has_more` variants, both `data` variants, the SQL-shaped
operation, and the malformed date. The payload-hash conflict rule now has a test where it had
none. Nothing was silently weakened: `skipped 0 / todo 0`, no disabled markers, executed count
equals declared count, and the index is untouched at 4 Candidate / 10 Draft.

It is not clean, and two findings are of the same class the rework was commissioned to remove:

1. **The new validator can be defeated through its own gate** (`additionalProperties` as a
   schema), end-to-end green, in direct contradiction of the invariant written at the top of
   the file it lives in. `$ref` siblings, `uniqueItems` identity, `minLength` units and
   `format: date-time` leniency are further divergences the gate blesses.
2. **The duplicate-sort-field gap is not fixed, and the test named for it asserts `1 < 2`.**
   It cannot fail for any change to the contract.

Plus: path traversal inside an allowed reference scheme passes green; a JWT in a declared
`tenant_context` field passes green and the secret scanner has no JWT pattern; conflicting
idempotency records can both ship as `valid-`; and the whole new enforcement rests on one
suite that a one-key schema edit can bypass (M4b), a one-key deletion can unpin (M3), or a
file deletion can remove entirely (M6) — each at exit 0.

The claimed fixes hold. The mechanism carrying them does not yet hold itself up.

VERDICT: test_verified_with_conditions
