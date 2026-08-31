# WP-0A-CON-003 — Author self-check

Author run: `/claude/a0_atlas` (Anthropic, `claude-opus-5`)
Base revision: `28d3142` (branch `agent/claude/WP-0A-CON-002-envelope-contracts`)
Branch: `agent/claude/WP-0A-CON-003-module-and-policy`
Date: 2026-08-31

Author self-evidence only. Not review, security, test, integration, Product Owner,
or merge approval, and it does not move Gate G0.

## What this package does differently, and why

WP-0A-CON-002 was rejected by all three independent runs for one root cause: rules
were asserted in test predicates while the shipped `schema.json` said something
weaker, and nothing executed a schema, so the two could disagree indefinitely. The
worst instance was a fixture named `invalid-unstable-sort-without-tiebreaker.json`
that was **valid** against the contract it was supposed to violate.

This package was written the other way round from the start:

1. **Every rule goes in the schema first.** The deny-by-default and kill-switch
   rules are `if`/`then` constraints in `schema.json`, not predicates in a test.
2. **Every rule carries an `x-source`** naming the baseline task it comes from —
   11 on CTR-MOD-001, 9 on CTR-FLG-001. A rule with no source has nowhere to hide.
3. **Fixtures are validated against their own schema** by the WP-0A-CON-002 subset
   validator. Both contracts passed conformance on the first run, because the
   schema and the fixtures were never two separate descriptions of the same rule.
4. **What a single document cannot demonstrate is declared**, not implied.

## Baseline sourcing

Every rule traces to a named task. No rule is present without one.

### CTR-MOD-001 — Module Manifest and Lifecycle

| Rule | Source |
|---|---|
| unique `module_key`, semver `version`, required `permissions` / `cost_policy` / `data_policy` | MR-001: "Reject duplicate key, invalid semver, missing permission/cost/data policy" |
| `capabilities` keyed and versioned | MR-002: duplicate capability resolution must be deterministic |
| `dependencies` as `module_key` + `range` | MR-003: circular, missing or incompatible dependency blocked with a stable error |
| a module cannot be `ready` unless `readiness.activated` is true; a `blocked` module must list what was `missing` | MR-004: "deny-by-default; missing secret/scope/entitlement does not activate" |
| lifecycle states `registered`…`stopped`, `supports_drain` | MR-005: initialize / readiness / drain / shutdown |
| `secret_handles` are `secret:` references only | PT-010 and MR-004: a manifest sees a scoped reference; MR-006 support must see health without seeing a secret |
| `module_id` matches `MOD-nnn` | Decision Register §5.1 module registry |

### CTR-FLG-001 — Feature Policy Decision

| Rule | Source |
|---|---|
| decision carries `reason_key` **and** `decision_source` | FP-001: "decision includes reason/source" |
| `evaluated_scopes` drawn from platform → plan → workspace → business → capability | FP-002 scope hierarchy |
| a `kill_switch` is a **platform-scope deny** | FP-002: "a business override does not cross a platform kill switch"; FP-004 |
| `write_disabled` requires `historical_read_allowed` | FP-002: "historical read still works when write is closed" |
| a `percentage_bucket` decision must carry its `bucket` | FP-003: stable allocation |
| a `temporary` flag requires `expires_at` and `owner_role` | FP-005: "every change has actor/reason/time; a temporary flag has expiry/owner" |
| `default_deny` is a first-class rule value | FP-001: "default deny" |

`reason_key` is a stable key rather than prose because CTR-ERR-001 already
establishes Thai message keys for user-facing text. That is a **declared
inference** from CTR-ERR-001, not a rule stated verbatim in FP-001.

## Declared as NOT demonstrated

Both manifests carry `untestable_by_fixture`, because a fixture is a single
document and these are properties of a system over many:

- **MR-002** duplicate-capability resolution and **MR-003** circular-dependency
  blocking are properties of a registry across **multiple** manifests.
- **FP-003** stable allocation ("a workspace stays in the same bucket") and
  **FP-002** deterministic precedence are properties of an evaluator over
  **repeated** inputs.

Each needs a harness before freeze. Recorded rather than left to read as
materialized — the failure mode independent testing found in WP-0A-CON-002.

## Deliberately not inferred

The registry resolution algorithm, the dependency range grammar and resolver, the
drain/shutdown protocol timing, the bucket allocation algorithm, the circuit-state
machine, and both admin APIs (MR-006, FP-006). Each is named in `freeze_boundary`.

## Verification

| Command | Exit | Result |
|---|---|---|
| `npm run check` | `0` | `tests 70 / pass 70 / fail 0 / skipped 0 / todo 0` |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `0` | both new contracts validated against their own schemas |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| `node scripts/scan-repository-secrets.mjs` | `0` | no output (weak — see WP-0A-A0-002 Security C1) |

**Conformance coverage is real, not incidental.** Proven by mutation: editing
`invalid-kill-switch-allows.json` so the schema accepts it makes the conformance
suite fail with `invalid-kill-switch-allows.json is named invalid but its schema
accepts it`. The fixture was restored and the suite returned to 70/70.

46 fixtures across 9 contracts are now under schema conformance.

## Author-declared limitations

- This run authored the change and must not review, security-review, test-verify,
  or integrate it.
- `contract-catalog/shared-kernel/index.json` is owned by WP-0A-CON-001 and is
  **untouched**; both contracts remain `Draft` and the index still reports 4
  Candidate / 10 Draft.
- This package depends on WP-0A-CON-002 and WP-0A-A0-002, both unmerged, and
  inherits every open blocker recorded on them — including that the test-integrity
  guard is a tripwire with no self-anchor.
- `secret_handles` constrains a reference **shape**. Nothing here verifies that a
  handle resolves to a real scoped credential, or that a resolver refuses to
  return one to a module without entitlement. That is MR-004 runtime behaviour and
  is not claimed.
- The `x-source` annotations are prose. A reviewer must check that each one
  actually says what the cited task says; the validator only guarantees that
  `x-` keywords constrain nothing.
