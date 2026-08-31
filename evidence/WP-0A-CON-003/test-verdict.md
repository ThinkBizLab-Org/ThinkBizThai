# WP-0A-CON-003 — Independent Tester verdict

**This document is independent Tester evidence only.** It is not a review sign-off, not an
Author self-check, and not an integration decision. Nothing here approves the work package;
it records what an adversarial re-execution of the shipped artifacts actually did.

| Field | Value |
| --- | --- |
| agent_run_id | `/claude/q0_sentinel` |
| Role | Independent Tester (WP-0A-CON-003) |
| Commit tested | `2649401` |
| Test root | frozen extraction at `scratchpad/con003-review` (read-only for the repository at `/Users/bank/ThinkBizThai`, which was never opened) |
| Under test | CTR-MOD-001 (Module Manifest and Lifecycle), CTR-FLG-001 (Feature Policy Decision) |
| Date | 2026-09-01 |

## Toolchain observed

```
node  v24.20.0     (matches .node-version and package.json engines)
npm   11.19.0      (matches packageManager and engines)
```

`node scripts/verify-toolchain.mjs` accepted both without a warning. Every destructive probe
below was run on a fresh `cp -R` of the frozen root; the frozen root itself was mutated by
nothing except this file.

## 1. Baseline: `npm run check` at this head

```
$ zsh -lc 'cd <frozen-root> && npm run check'
...
ℹ tests 85
ℹ suites 0
ℹ pass 85
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 259.815459
EXIT=0
```

**`skipped 0 / todo 0` confirmed. Exit code 0 confirmed.**

Chain executed in order, each step reached: `verify-toolchain` → `scan:secrets` →
`validate:protocol` (3 validators) → `verify:coverage-floor` → `test:bootstrap`.

### Per-file decomposition (85 declared, 85 executed)

| File | Tests |
| --- | ---: |
| `test-kits/capability-profile.test.mjs` | 4 |
| `test-kits/repository-json.test.mjs` | 2 |
| `test-kits/role-separation.test.mjs` | 8 |
| `test-kits/secret-scan.test.mjs` | 2 |
| `test-kits/test-coverage-floor.test.mjs` | 26 |
| `test-kits/toolchain-contract.test.mjs` | 3 |
| `test-kits/work-package-discovery.test.mjs` | 1 |
| `test-kits/work-package-ownership.test.mjs` | 6 |
| `test-kits/contracts/catalog-reference-integrity.test.mjs` | 6 |
| `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | 6 |
| `test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | 15 |
| `test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | 6 |
| **Total** | **85** |

### Catalog index

`contract-catalog/shared-kernel/index.json` — 14 entries, **4 Candidate / 10 Draft**, unchanged.
Both new contracts are present at `status: "Draft"`:

- `CTR-MOD-001` — `required_before_freeze: ["capabilities","dependencies","health","flags","owner"]`
- `CTR-FLG-001` — `required_before_freeze: ["platform→plan→workspace→business precedence"]`

The assertion `the index still reports 4 Candidate and 10 Draft: materializing a Draft does
not promote it` is a real assertion over the real file (line 57 of
`shared-kernel-contract-catalog.test.mjs`), not a comment.

**Note.** CON-003 added **zero** new test cases. `grep -rn 'ctr-mod-001|ctr-flg-001|CTR-MOD-001|CTR-FLG-001' test-kits/`
returns nothing. Both contracts are covered exclusively by the generic manifest-driven loops in
`shared-kernel-schema-conformance.test.mjs`. That is a legitimate design, but it means the
per-contract assurance is exactly equal to what the declared fixture list happens to hit — see §5.

## 2. Attack table

`ACCEPTED` = the schema validated the document. `rejected` = it did not.
"Failed closed?" answers: did the artifact behave the way the claim says it does?

### 2a. CTR-MOD-001 — deny-by-default rules (brief item 1)

| # | Attack | Result | Failed closed? |
| --- | --- | --- | --- |
| M1 | `state: "ready"`, `lifecycle.readiness` **omitted entirely** | rejected — `$.lifecycle: missing required property 'readiness'` | **YES** |
| M2 | `state: "ready"` + `activated: false` | rejected — `$.lifecycle.readiness.activated: expected const true` | **YES** |
| M3 | `state: "initializing"` + `activated: false` | ACCEPTED | YES (correct — no rule claimed) |
| M4 | `state: "blocked"` + **`missing: []`** | **ACCEPTED** | **NO — finding T-1** |
| M5 | `state: "blocked"` + `missing: ["quota"]` (unknown value) | rejected — value not in enum | **YES** |
| M6 | `state: "blocked"` + `activated: true` + `missing` populated | rejected — `expected const false` | **YES** |
| M7 | `state: "ready"` + `activated: true` + `missing: ["health","permission"]` | **ACCEPTED** | **NO — finding T-5** |
| M8 | `state: "blocked"`, `readiness` omitted entirely | rejected — missing required `readiness` | **YES** |
| M9 | `state: "stopped"` + `activated: true` | ACCEPTED | YES (no rule claimed) |
| M10 | literal credential string in `secret_handles` | rejected — pattern `^secret:[a-z0-9._-]+$` | **YES** (but untested — §5) |
| M11 | credential re-spelled to satisfy `secret:` pattern | ACCEPTED | inherent limit, not a defect |
| M12 | `lifecycle` omitted entirely | rejected — missing required property | **YES** |
| M13 | duplicate `capability_key` at different versions (MR-002) | ACCEPTED | disclosed in `untestable_by_fixture` |
| M14 | self-dependency (MR-003 circularity) | ACCEPTED | disclosed in `untestable_by_fixture` |
| M15 | empty `readiness.reason` | rejected — `minLength 1` | **YES** |

**The two headline claims hold.** A module cannot be `ready` unless `readiness.activated` is
`true`, *including* when `readiness` is omitted — the `then` uses
`properties.lifecycle.required: ["readiness"]`, so omission does not make the obligation
vacuous. A `blocked` module must carry a `missing` key. But see T-1 for what "must record
what was missing" actually enforces.

### 2b. CTR-FLG-001 — policy rules (brief item 2)

| # | Attack | Result | Failed closed? |
| --- | --- | --- | --- |
| F1 | kill switch at `capability` scope | rejected — `$.decision_source.scope: expected const "platform"` | **YES** |
| F2 | `effect: "allow"` with `rule: "kill_switch"` | rejected — `$.effect: expected const "deny"` | **YES — claim verified** |
| F3 | `write_disabled: true`, `historical_read_allowed` **absent** | rejected — `missing required property 'historical_read_allowed'` | **YES** |
| F3b | `write_disabled: true`, `historical_read_allowed: false` | rejected — `expected const true` | **YES** |
| F4 | `percentage_bucket` + `bucket` present + `percentage: 150` | rejected — `above maximum 100` | **YES** (but untested — §5) |
| F4b | `percentage_bucket`, `bucket` absent | rejected — missing required `bucket` | **YES** |
| F5 | `temporary: true`, `audit` present, no `expires_at` | rejected — `$.audit: missing required property 'expires_at'` | **YES** |
| F5c | `temporary: true`, `expires_at` present, no `owner_role` | rejected — missing `owner_role` | **YES** |
| F6 | `temporary: false`, **no `audit` at all** | ACCEPTED | partial — finding T-6 |
| F6b | `temporary` absent, no `audit` at all | ACCEPTED | partial — finding T-6 |
| F7 | `evaluated_scopes` in **reversed** precedence order | **ACCEPTED** | **NO — finding T-4** |
| F7b | decision at `capability` with `evaluated_scopes: ["capability"]` only | **ACCEPTED** | **NO — finding T-4** |
| F8 | decision scope `business` not present in `evaluated_scopes: ["platform"]` | **ACCEPTED** | **NO — finding T-4** |
| F9 | `rule: "default_deny"` with `effect: "allow"` | **ACCEPTED** | **NO — finding T-3** |
| F10 | `rule: "explicit_deny"` with `effect: "allow"` | **ACCEPTED** | **NO — finding T-3** |
| F11 | `rule: "explicit_allow"` with `effect: "deny"` | **ACCEPTED** | **NO — finding T-3** |
| F12 | `bucket` present without `rule: "percentage_bucket"` | ACCEPTED | low |
| F13 | `bucket: {percentage: 0, allocated: false}` with `effect: "allow"` | ACCEPTED | disclosed (evaluator property) |
| F14 | `kill_switch` with `write_disabled` absent | ACCEPTED | disclosed (FP-004 circuit state out of scope) |
| F15 | `expires_at` earlier than `changed_at` | ACCEPTED | inherent — no cross-field temporal keyword in the subset |

**Answers to the brief's explicit questions.** A kill switch at `capability` scope is rejected.
`effect: "allow"` with `rule: "kill_switch"` is rejected — the claim is verified.
`write_disabled: true` with `historical_read_allowed` *absent* is rejected (the `then` carries
`required`, so absence does not slip through). `percentage: 150` is rejected.
`temporary: true` with an `audit` lacking `expires_at` is rejected. `temporary: false` with no
audit at all is **accepted**. **`evaluated_scopes` order is not enforced at all — only
membership, uniqueness and `minItems: 1`.**

### 2c. Conformance-suite integrity (brief item 4)

| # | Mutation | `npm run check` | Failed closed? |
| --- | --- | --- | --- |
| A | `invalid-blocked-without-missing.json` given `missing: ["health"]` | **exit 1** — `ctr-mod-001/examples/invalid-blocked-without-missing.json is named invalid but its schema accepts it` | **YES** |
| A2 | same fixture given **`missing: []`** | **exit 1** — same assertion (this is the working fixture for T-1) | YES — *and it proves the hole* |
| B | `invalid-temporary-without-expiry.json` given `expires_at` + `owner_role` | **exit 1** — `ctr-flg-001/examples/invalid-temporary-without-expiry.json is named invalid but its schema accepts it` | **YES** |
| H | delete `ctr-mod-001` `allOf[1]` (blocked-must-record-missing rule) — *control* | **exit 1**, names the fixture | **YES** |
| C | delete `secret_handles.items.pattern` (PT-010 literal-credential guard) | **exit 0**, 85/85 green | **NO — finding T-2** |
| D | delete `evaluated_scopes` `items.enum` + `minItems` + `uniqueItems` | **exit 0**, 85/85 green | **NO — finding T-2** |
| E | delete `expires_at` from `allOf[3].then.properties.audit.required` | **exit 0**, 85/85 green | **NO — finding T-2 / T-7** |
| F | delete `bucket.percentage` `minimum` + `maximum` | **exit 0**, 85/85 green | **NO — finding T-2** |
| G | delete `readiness.missing.items.enum` + `reason.minLength` | **exit 0**, 85/85 green | **NO — finding T-2** |

The contract catalog is **not** covered by `test-kits/integrity-manifest.json` (which lists only
`.github/workflows/ci.yml`, `.node-version`, `package.json`, the 10 `scripts/*.mjs` and the 13
`test-kits/**` files). A schema can therefore be silently weakened; the *only* thing that catches
it is a fixture that happens to depend on the deleted constraint.

### 2d. WP-0A-A0-002 guard-suite regression attacks (brief item 7)

| # | Attack | Exit | Guard that fired | Failed closed? |
| --- | --- | ---: | --- | --- |
| G1 | protected suite replaced with 7 × `test(..., {skip:true}, ...)` placeholders | **86** | digest tripwire: `protected file(s) changed without updating test-kits/integrity-manifest.json … shared-kernel-schema-conformance.test.mjs — content does not match its recorded digest` | **YES** |
| G2 | symlink planted in the test root (`test-kits/contracts/smuggled.test.mjs → /etc/hosts`) | **85** | `symbolic link inside the test root … node --test follows and executes it while file-type discovery does not see it` | **YES** |
| G3 | `&&` → `\|\|` in the `check` script — **last** position | **1** | `assertPackageScripts`: `check must be a plain && chain: '\|\|' would let a step be skipped, backgrounded, or commented out while this guard still saw the text` | **YES** |
| G3b | `&&` → `\|\|` — **first** position | **81** | same guard, same message | **YES** |
| G3c | `&&` → `\|\|` — **every** position | **0** | none reached — the chain short-circuits at step 1, before `verify:coverage-floor` | **NO (unreachable-caller class, disclosed)** |
| G4 | trailing ` &` appended to the `check` script | **0** | guard **did** fire and printed its message, but the shell had already returned 0 | **NO (disclosed unclosable case)** |

G1 and G2 still fail closed at this head, and fail *early* — before the suite runs.

**Correction.** An earlier draft of this document recorded G3 as exit 0 and stated that
`&&` → `||` "does not fail closed". **That was wrong, and I am grateful to the coordinator for
challenging it.** I re-measured all four variants above on fresh copies, updating
`test-kits/integrity-manifest.json` after each edit so the digest tripwire was *not* what fired.
`||` **does** fail closed. `assertPackageScripts`
(`scripts/verify-test-coverage-floor.mjs:73–112`) does not substring-match: it splits `check` on
`&&`, rejects an empty step, rejects `||`, `;`, `|`, `#` or a surviving `&` inside any step,
requires `npm run verify:coverage-floor` and `npm run test:bootstrap` as their own steps in that
order, and requires the chain to END with the runner. The comment on line 85 records that
substring matching was replaced *precisely because* a one-character `&&`→`||` edit defeated it.

My original mutation replaced `&&` at **every** position, which is why I measured 0: with
`node scripts/verify-toolchain.mjs || …`, step 1 succeeds and the entire chain short-circuits
before `verify:coverage-floor` is ever invoked. That is a real exit-0 result (G3c), but it is
**not** evidence that the guard is weak — the guard is never reached. I generalised from one
unrepresentative injection point to a claim about `||` as such. The guard catches `||` at both
the first and last positions, at exit 81 and exit 1.

Two variants do still return 0, and they are the same class as each other:

- **G3c** — the guard never executes.
- **G4** — the guard executes and throws its message, but ` &` backgrounded the whole chain, so
  the shell's status was decided before any step's exit code mattered. The printed guard message
  and the exit 0 appear together, which is exactly why this one cannot be closed from inside.

Neither is a CON-003 regression, and neither is a new discovery: this is the limitation the
repository documents verbatim in `test-kits/integrity-manifest.json` — *"NO in-script control can
prevent that … The caller must invoke the guard as its own step"* — and which is tracked as an
open blocker on WP-0A-A0-002. I confirm the caller still does not:
`.github/workflows/ci.yml` runs a single `npm run check` and nothing else. Carried forward as
condition C-3, now correctly scoped to the backgrounding/short-circuit-before-the-guard class
rather than to `||` in general.

## 3. The `if`/`then` vacuity trap (brief item 3) — NOT PRESENT in either new schema

The trap is real: in JSON Schema, an `if` containing `properties` but no matching `required`
matches when the property is **absent**, so the `then` fires on documents it was never meant to
touch, or (more dangerously) an obligation written as `then: {properties: {x: {...}}}` without
`required` is satisfied by deleting `x`.

I audited **every** `if` subschema in the entire catalog, at every nesting level:

```
total if-property levels: 20; unguarded (properties without matching required): 8
```

| Contract | `if` levels | Unguarded |
| --- | ---: | ---: |
| **ctr-flg-001 (new)** | 6 | **0** |
| **ctr-mod-001 (new)** | 4 | **0** |
| ctr-api-001 | 3 | 3 |
| ctr-idm-001 | 3 | 3 |
| ctr-pag-001 | 4 | 2 |

**Both CON-003 schemas are fully guarded at both levels.** `ctr-mod-001` writes
`if: {properties: {lifecycle: {properties: {state: {const: …}}, required: ["state"]}}, required: ["lifecycle"]}`
— `required` at the outer *and* inner level. `ctr-flg-001` does the same for
`decision_source.rule`, and uses `required: ["write_disabled"]` / `required: ["temporary"]` for
its boolean discriminators. Probes M1, M8, F3 and F4b confirm this empirically: omitting the
field does **not** bypass the rule.

The 8 unguarded levels are all in pre-existing CON-002 contracts, and all 8 are currently
neutralised because the discriminator (`kind`, `state`) is in that schema's root `required`. I
verified this for all three. So **no rule anywhere in the catalog is bypassable by omitting a
field today.** It is nonetheless a latent fragility: removing `"kind"` from
`ctr-api-001`'s root `required` would silently disable three conditional rules at once, with no
test failing. CON-003's belt-and-braces style is the correct one and should be back-ported.
Informational finding T-8.

## 4. Findings on items 1–5

### T-1 (HIGH, CTR-MOD-001) — `missing: []` satisfies "must record what was missing"

`allOf[1].then` requires `readiness.missing` to be **present**. It does not require it to be
**non-empty**. `missing` declares `items` but no `minItems`.

Working fixture — this document validates clean against the shipped `ctr-mod-001/schema.json`:

```json
{"module_key":"meta-connection","module_id":"MOD-110","version":"1.0.0","owner_role":"A6",
 "capabilities":[{"capability_key":"meta.publish","version":1}],
 "dependencies":[{"module_key":"platform-kernel","range":"^1.0.0"}],
 "permissions":["meta.publish"],
 "cost_policy":{"metered":true,"usage_contract":"CTR-USG-001"},
 "data_policy":{"classification":"tenant-data","tenant_scoped":true,"retention_reference":"retention.meta.default"},
 "lifecycle":{"state":"blocked","supports_drain":true,
   "readiness":{"activated":false,"reason":"readiness.denied","missing":[]}},
 "secret_handles":["secret:meta.page_token"]}
```

The rule's own `x-rule` says *"a blocked module must record what was missing, so support can act
without seeing a secret (MR-006)."* An empty array records nothing; support is handed a blocked
module and an empty list. This defeats the stated purpose of the rule while satisfying it.

This is **not** disclosed in `freeze_boundary` or `untestable_by_fixture`. Single-line fix:
`"missing": {"type":"array","minItems":1,"items":{"enum":[…]}}`, plus a fixture named
`invalid-blocked-with-empty-missing.json`.

### T-2 (HIGH, both) — most of both schemas is exercised by no fixture at all

I mutation-tested every constraint site in both schemas: delete one keyword / one `required`
entry / one `allOf` rule, re-validate all declared fixtures, and see whether any verdict flips.
A site whose deletion flips nothing is a rule no fixture tests.

| Contract | Constraint sites | Not exercised by any declared fixture |
| --- | ---: | ---: |
| CTR-MOD-001 | 92 | **84 (91%)** |
| CTR-FLG-001 | 77 | **65 (84%)** |

Security- and policy-relevant examples, each confirmed green at **exit 0** when deleted
(attacks C–G above):

- `secret_handles.items.pattern` — the **PT-010 literal-credential guard**. It works (M10), but
  no fixture proves it, so deleting it is invisible to CI.
- `evaluated_scopes` `items.enum`, `minItems`, `uniqueItems` — all three deletable, silently.
- `bucket.percentage` `minimum`/`maximum` — the FP-003 range, deletable silently.
- `readiness.missing.items.enum` and `readiness.reason.minLength` — deletable silently.
- `decided_at.format`, `reason_key.pattern`, the entire `audit.actor` structure, every
  `additionalProperties: false` below the root, and every root `required` entry except
  `data_policy` — none exercised by a fixture.

The generic suite does cover three of these classes independently of fixtures (root and nested
`additionalProperties: false` via *an extra property carrying a secret is rejected at every
declared object level*; the keyword gate via *every catalog schema uses only keywords this
validator actually enforces*; root closure via *every catalog schema closes its root against
undeclared properties*). Everything else in the list above has nothing behind it.

**So: is "both passed conformance on the first run" meaningful?** Partly. It is a *true*
statement about a suite that genuinely executes these two contracts and genuinely names the
offending file (attacks A, A2, B, H — all exit 1). It is *not* evidence that the rules in these
schemas are correct or complete, because the suite only tests the ~10–16% of each schema that a
declared fixture happens to touch. Passing on the first run is consistent with a schema in which
five separate rules could be deleted without anything going red.

### T-3 (MEDIUM, CTR-FLG-001) — `rule` and `effect` are unlinked except for `kill_switch`

`decision_source.rule` and `effect` are constrained together only in `allOf[1]` (kill switch).
Every other combination is accepted, including the deny-by-default inversion:

```json
{"policy_key":"content.generation","effect":"allow",
 "decided_at":"2026-08-31T10:00:00Z",
 "decision_source":{"scope":"capability","rule":"default_deny"},
 "reason_key":"policy.default_deny",
 "evaluated_scopes":["platform","plan","workspace","business","capability"]}
```

A document whose rule is literally `default_deny` and whose effect is `allow` is valid. So are
`explicit_deny` + `allow` (F10) and `explicit_allow` + `deny` (F11). In a contract whose whole
purpose is a typed, auditable policy decision, the rule name and the outcome should not be free
to contradict each other. Three `if`/`then` pairs in the same style already used for
`kill_switch` would close all three.

### T-4 (MEDIUM, CTR-FLG-001) — precedence order is annotation-only, and the manifest overstates it

`evaluated_scopes` enforces membership, uniqueness and `minItems: 1`. It does not enforce order,
does not enforce that the list is a prefix of the precedence chain, and does not require the
deciding scope to appear in the list. Reversed order (F7), a single-element list at the narrowest
scope (F7b), and a decision at a scope not evaluated (F8) are all accepted.

The precedence rule exists in exactly one place — the `x-source` annotation on the property —
and `x-` annotations constrain nothing (§4, T-9). But the manifest claims otherwise:

> `freeze_boundary`: "Materializes exactly … **the FP-002 precedence platform -> plan ->
> workspace -> business -> capability** with a kill switch no narrower scope may override…"

while `index.json` lists the same thing as still outstanding:

> `CTR-FLG-001.required_before_freeze: ["platform→plan→workspace→business precedence"]`

These two shipped files disagree. The index is right and the manifest overstates. Note that
`untestable_by_fixture` correctly says precedence *determinism across repeated evaluations* is an
evaluator property — but the **ordering of a single `evaluated_scopes` array is a single-document
property** and is expressible in the CON-002 subset today, e.g. an `enum` of the five legal
prefixes. It is not out of reach; it is simply not written.

### T-5 (LOW, CTR-MOD-001) — `activated: true` may coexist with a populated `missing`

Accepted on any non-`blocked` state, including `ready` (M7): a module that is `ready`, activated,
and simultaneously reports `missing: ["health","permission"]`. Contradictory, and cheap to close
with a rule on `activated: true`.

### T-6 (LOW, CTR-FLG-001) — `audit` is only ever required for a temporary flag

FP-005's general obligation ("every change carries actor, reason and time") is unmodelled: a
policy decision with `temporary: false`, or with `temporary` absent, needs no `audit` at all
(F6, F6b). The `freeze_boundary` only claims the *temporary-flag* half of FP-005, so this is
scoped honestly — but the `x-source` on `audit` states the general rule, which nothing enforces.

### T-7 (LOW, CTR-FLG-001) — the expiry fixture is over-determined

`invalid-temporary-without-expiry.json` omits **both** `expires_at` and `owner_role`. It
therefore fails for two reasons at once, and neither obligation is independently exercised —
attack E deletes the `expires_at` obligation from the schema and the suite stays green at exit 0.
The fixture's name promises a test it does not perform. Split it into two fixtures.

### T-8 (INFO, catalog-wide) — one `then` relies on the root for its `required`

`ctr-flg-001 allOf[1].then` writes `decision_source: {properties: {scope: {const: "platform"}}}`
with no `required: ["scope"]` of its own. It is enforced only because the root schema requires
`scope`. Same class as the 8 unguarded CON-002 `if` levels in §3. Not currently exploitable;
add the local `required` for defence in depth.

### T-9 (VERIFIED AS CLAIMED) — `x-` annotations constrain nothing

Confirmed empirically. I injected `x-required: ["this_property_does_not_exist"]`,
`x-const: "impossible"` and `x-enum: ["never"]` into a copy of `ctr-flg-001/schema.json`:

- `assertSchemaSupported` — passes (x- keys are skipped by design).
- `validate` against `valid-explicit-allow.json` — **0 errors. They constrain nothing.**
- Control: a non-`x-` unknown keyword (`propertyNames`) is **rejected**:
  `unsupported schema keyword 'propertyNames'. A schema must not appear to constrain something
  this validator ignores.`

So the keyword gate is real and the `x-`/non-`x-` distinction is exactly as claimed.

**Which `x-` claims exist only in the annotation?** The following are asserted in `x-source`
text and enforced nowhere:

| Annotation | Claim | Enforced? |
| --- | --- | --- |
| `ctr-flg-001 evaluated_scopes` | "FP-002 fixes the precedence order platform → plan → workspace → business → capability" | **No** — annotation only (T-4), and the manifest repeats the claim |
| `ctr-flg-001 audit` | "FP-005 every change carries actor, reason and time" | Only when `temporary: true` (T-6) |
| `ctr-flg-001 bucket` | "FP-003 stable allocation: a workspace stays in the same bucket" | No — correctly disclosed as an evaluator property |
| `ctr-mod-001 module_key` | "MR-001 rejects a duplicate key" | No — cross-manifest; correctly disclosed |
| `ctr-mod-001 capabilities` | "MR-002 requires deterministic resolution of a duplicate capability" | No — M13 shows duplicate `capability_key` at different versions is accepted; correctly disclosed |
| `ctr-mod-001 dependencies` | "MR-003 blocks a circular, missing or incompatible dependency" | No — M14 shows a self-dependency is accepted; correctly disclosed |
| `ctr-mod-001 secret_handles` | "a literal credential must never appear here" | **Partly** — the `secret:` pattern rejects a raw token (M10), but nothing tests the pattern (T-2) and a credential re-spelled as `secret:<value>` passes (M11) |

Most of these are honestly carried in `untestable_by_fixture`, which is good practice. The
exception is the precedence claim, which is asserted as *materialized* in `freeze_boundary` while
living only in an annotation.

## 5. Conditions carried forward

- **C-1** — CTR-MOD-001 `readiness.missing` needs `minItems: 1` plus a negative fixture, or the
  MR-004/MR-006 "record what was missing" obligation is satisfiable by an empty list (T-1).
- **C-2** — Fixture coverage must reach the rules that matter before freeze. At minimum:
  `secret_handles` pattern (PT-010), `evaluated_scopes` membership/uniqueness,
  `bucket.percentage` bounds, `readiness.missing` enum, and a split of
  `invalid-temporary-without-expiry` into its two obligations (T-2, T-7). A schema-mutation
  check in CI would make this class of gap self-reporting.
- **C-3** — CI still invokes only `npm run check`, so the documented trailing-`&` backgrounding
  (G4) and a `||` placed early enough to short-circuit before `verify:coverage-floor` runs (G3c)
  both return 0 at this head. The chain guard itself is sound and rejects `||` wherever it is
  reached (G3, G3b). Pre-existing, disclosed, tracked as an open blocker on WP-0A-A0-002; not
  introduced by CON-003, but it is the reason "exit 0" alone is not evidence.
- **C-4** — Reconcile `ctr-flg-001/manifest.json` `freeze_boundary` (claims FP-002 precedence is
  materialized) with `index.json` `required_before_freeze` (lists it as outstanding). Either
  enforce the ordering — it is expressible in the subset — or withdraw the claim (T-4).
- **C-5** — Link `decision_source.rule` to `effect` for `default_deny`, `explicit_deny` and
  `explicit_allow` (T-3).

## 6. Assessment

What the work package claims, and what testing found:

- *"Written schema-first, every rule an `if`/`then` in `schema.json`"* — **true**, and written
  competently. Every `if` in both new schemas is `required`-guarded at every level; the vacuity
  trap the brief asked about is **not present**, and every "omit the field" bypass I attempted
  was rejected. This is stricter than the three pre-existing CON-002 contracts.
- *"Validated by the CON-002 subset validator"* — **true**. The validator executes; the keyword
  gate rejects unknown non-`x-` keywords; `x-` annotations are provably inert.
- *"Both passed conformance on the first run"* — **true but weak**. The suite really does cover
  both contracts and names the offending file (four independent mutations, all exit 1). But
  84/92 and 65/77 constraint sites are exercised by no fixture, and five schema-weakening
  mutations — including deleting the PT-010 literal-credential guard — pass at exit 0, 85/85
  green. A first-run pass here reflects a small fixture set, not a strong schema.
- One genuine, undisclosed enforcement hole: **`missing: []` satisfies the blocked-module rule.**
- Three moderate gaps between what the annotations and manifest say and what the schema does:
  precedence order, rule/effect coherence, general audit.
- `npm run check` at this head: **exit 0, 85 tests, 85 pass, 0 fail, skipped 0, todo 0**, index
  unchanged at 4 Candidate / 10 Draft. Guard attacks G1 (exit 86), G2 (exit 85), G3 (exit 1) and
  G3b (exit 81) all fail closed; only the two disclosed unreachable-caller variants return 0.

One correction against myself is recorded in §2d: I initially reported that `&&` → `||` does not
fail closed, on the strength of a single injection point that short-circuited before the guard
ever ran. Re-measured across all four variants with the digest updated, the chain guard rejects
`||` wherever it is reached. The error was mine — generalising from one unrepresentative mutation
— and it cuts in the artifact's favour, so it is worth stating plainly: the WP-0A-A0-002 wiring
guard is stronger than my first pass credited it.

Nothing found here is a fabrication or a green run that executed nothing. The defects are of the
ordinary kind — one under-specified array and a thin fixture set — and every one of them is
fixable inside the Draft status the contracts already carry. They are conditions, not a rejection.

VERDICT: test_verified_with_conditions
