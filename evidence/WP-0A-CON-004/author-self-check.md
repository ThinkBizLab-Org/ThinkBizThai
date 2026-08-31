# WP-0A-CON-004 — Author self-check

Author run: `/claude/a0_atlas` (Anthropic, `claude-opus-5`)
Base revision: `2649401` (frozen extraction; work performed in an isolated copy, not the live tree)
Date: 2026-09-01

Author self-evidence only. Not review, security, test, integration, Product Owner,
or merge approval, and it does not move Gate G0.

## Method

Written the WP-0A-CON-003 way, not the WP-0A-CON-002 way. Every rule went into
`schema.json` first, as an `if`/`then` constraint where it is relational. Nothing
is asserted in a test predicate that the shipped schema does not say, because that
is the single root cause both earlier rejections shared. Three schemas, **33
`x-source` annotations and 10 `x-rule` annotations**; no rule exists without one.

Where a rule was inferred rather than read, the annotation says `DECLARED
INFERENCE` and names what it was inferred from. Where a source requirement cannot
be expressed at all, it is in `untestable_by_schema`; where a single document
cannot demonstrate it, it is in `untestable_by_fixture`. Where the contract
knowingly accepts something its source would not want, it ships as an
`accepted-gap-` fixture with a reason naming the unresolved item and its owner.

**No rule was invented to make a weak control look strong.** Section "What this
contract does NOT guarantee" below is the point of the package, not an appendix.

## Baseline sourcing

### CTR-SEC-001 — Secret Reference / Handle (11 `x-source`, 4 `x-rule`)

| Rule | Source | Status |
|---|---|---|
| `handle` is an opaque `secret:` reference; no property can hold credential material | Decision Register 5.2 "opaque ref"; PT-010 "manifest sees a reference only" | sourced |
| the `^secret:[a-z0-9._-]+$` shape itself | CTR-MOD-001 `secret_handles` | **adopted as precedent, not authority** — see conflict below |
| `scope` keyed by workspace and capability, optional business/page | PT-010 "scoped credential resolver"; MR-004 "readiness per capability/scope"; DEC-010; §3.1 | sourced |
| `ownership` managed vs byok | PT-010 inputs "managed/BYOK credentials"; DEC-014; SEC-012 | sourced |
| `classification` enumerates four classes and pins none | SEC-003 Public/Internal/Confidential/Restricted matrix | sourced; class **not** assigned — accepted gap |
| `state` active / rotating / revoked | Decision Register 5.2 "rotation/revoke"; SEC-005; PT-010 | sourced |
| `resolvable` | PT-010 "revoke immediately" + MR-004 deny-by-default | **declared inference** — no source names the field |
| `rotation.owner` typed, `rotation.rotated_at` | INF-006 "rotation owner/date complete"; §3.1 forbids a free-string actor | sourced |
| six `redaction` surfaces, each `const true` | PT-010 (log/event/job); SEC-005 (browser/job/event/log); SEC-012 (analytics/error trace) | sourced |
| `revocation` records when, by whom, why | PT-010 revoke; SEC-009 credential action states actor and correlation | sourced |
| revocation reason is a stable KEY, not prose | CM-004 / CTR-ERR-001 | **declared inference** |
| revoked ⇒ not resolvable, and must carry a revocation record | PT-010 + SEC-009 | sourced (`x-rule`) |
| active ⇒ resolvable, and must not carry a revocation record | PT-010 + MR-004 | sourced (`x-rule`) |
| managed ⇒ rotated by a platform role; byok ⇒ rotated by its workspace | PT-010 managed/BYOK split + INF-006 + SEC-012 | sourced (`x-rule`) |
| `rotating` left unconstrained on `resolvable` | — | **deliberately not inferred**; no source states rotation overlap |
| `maxLength: 128` on the handle | — | **declared inference**, annotated as *not* a control |

### CTR-AUD-001 — Audit Event (14 `x-source`, 3 `x-rule`)

| Rule | Source | Status |
|---|---|---|
| six `action.category` values: role, credential, publish, delete, billing, support | SEC-009 enumerates exactly those six auditable action classes | sourced |
| `actor` typed kind/id | OB-005 "actor"; SEC-009; §3.1 (never a free string) | sourced |
| `tenant_context` is CTR-TEN-001 by `$ref` | OB-005 depends on TC-001; Decision Register 5.2 requires "scope" | sourced |
| `correlation_id` at the root as well as in tenant context | SEC-009 "actor/correlation"; OB-001; CTR-EVT-001 precedent | sourced |
| `change.before_ref` / `after_ref` are references, never values | OB-005 "before-after ref" — a reference is what makes "secret/content redaction" achievable | sourced |
| reference grammar: closed scheme, no leading slash, no `..`, no public URL | CTR-IDM-001 `result_ref` after its own security review | adopted as precedent |
| the two scheme names `snapshot:` / `record:` | — | **declared inference**; no source names them |
| `reason_key` is a stable key, not free text | CM-004 / CTR-ERR-001; OBS-001 forbids full content on this path | **declared inference** |
| three `redaction` flags, each `const true` | OB-005 "secret/content redaction"; OB-002 PII; OBS-001 | sourced |
| `details` declared and held at `maxProperties: 0` | OB-005 redaction; precedent CTR-ERR-001 `details`, CTR-EVT-001 `payload` | sourced |
| `retention.policy_ref` present; duration **not** pinned | SEC-009 "Audit schema + retention"; PDPA-006 | sourced; duration deliberately open |
| `outcome` succeeded / failed / denied | SEC-007 deny-by-default + SEC-016 audited break-glass + OB-002 | **declared inference** — no source names the field |
| `audit_id`, `occurred_at` | §3.2 via OB-005's dependency on EV-001 | declared inference from EV-001 |
| `action.name` dotted grammar, underscores permitted | §3.2 `event_type`, widened for DEC-010's `business_profile` | declared inference, widening declared |
| delete ⇒ must carry `change.before_ref` | OB-005 before/after ref + PDPA-008 tombstone/audit | sourced (`x-rule`) |
| failed or denied ⇒ must carry a CTR-ERR-001 `error` | OB-002 stable taxonomy + SEC-007 | sourced (`x-rule`) |
| succeeded ⇒ must **not** carry an error | OB-002 | sourced (`x-rule`) |

### CTR-OBS-001 — Correlation, Health and Readiness (8 `x-source`, 3 `x-rule`)

| Rule | Source | Status |
|---|---|---|
| `liveness.depends_on_external_provider` is `const false` | OB-003 states the rule verbatim: liveness must not be tied to an external provider | sourced — the one place the contract *enforces* rather than describes |
| readiness reported per capability, not as one flag | OB-003 "readiness reflects the real capability"; MR-004 "readiness result per capability/scope" | sourced |
| an unready capability must carry a `reason_key` | MR-004 deny-by-default with a reason; OB-002 alert routing needs it actionable | sourced (`x-rule`) |
| `reason_key` is a stable key, not free text | CM-004 / CTR-ERR-001; OBS-001 | **declared inference** |
| `correlation` block; only `correlation_id` required | OB-001 one trace across retry/worker/adapter; OBS-004; §3.1, §3.3 field names | sourced |
| `environment` local/preview/staging/production | Track INF Environment Model, exactly its four rows; OBS-002 requires environment | sourced |
| `module_key` + `implementation_version` | OB-003 per-module aggregation; OBS-002; §3.2 `producer`; shape from CTR-MOD-001 | sourced |
| `dependencies[].kind` splits module from external_provider | OB-003 forbids a provider affecting liveness while allowing it to affect readiness | sourced |
| the three dependency status values | SEV-2 row of the alert table (degraded provider) | **declared inference** |
| `sli_tags` label **name** set is closed; `workspace_id` deliberately absent | OB-006 "no user content/token/page name in a metric label"; OBS-001 keeps workspace linkable via correlation, not via a label | sourced |
| `module_key` and `environment` required in `sli_tags` | OBS-002 | sourced |
| ready ⇒ no capability may be unready | OB-003 + MR-004 | sourced (`x-rule`) |
| down ⇒ not ready; the converse deliberately **not** stated | OB-003 aggregation + MR-004; a live-but-unready module is the case OB-003 protects | sourced (`x-rule`) |

## The secret-handle finding, handled rather than papered over

Independent security review raised two things about the handle. Both are recorded
in `freeze_boundary`, in `open_blockers`, and in the schema itself.

**1. Ownership.** `CTR-MOD-001` already fixed `^secret:[a-z0-9._-]+$` for
`secret_handles`. Decision Register §5.2 owns CTR-MOD-001 to **A0** and
CTR-SEC-001 to **A0+A1**, so a single-owner contract fixed the syntax of a
jointly-owned one with no RFC.

I **adopted the pattern as precedent, not as authority**, and recorded the
irregularity. The judgement: shipping a second, different handle syntax would stop
the two contracts composing — a manifest reference and a registry handle would no
longer be the same string — which is a worse and more immediate defect than the
process irregularity. **A1 is a required authority and is not in this session;
this author must not resolve it.** It is in `required_human_authorities`.

**2. The pattern is not a control, and is no longer described as one.** It
excludes mixed-case base64 and nothing else: lowercase hex, lowercase base32 and
lowercase dashed token shapes all pass. Review further showed that
`scripts/scan-repository-secrets.mjs` detects only strings the pattern *already
rejects* — the two controls compose to **zero** coverage against a credential
smuggled inside a conforming handle body.

I could not make the shape genuinely narrower without inventing semantics, so I
did not. JSON Schema cannot distinguish a reference from the thing it refers to.
Instead:

- the schema carries `x-opacity-limitation` on `handle`, stating in the artifact
  itself that the pattern must not be cited as a control, and naming what would
  close it (a handle **issuance** format — an issuer-assigned identifier a
  producer cannot mint from credential material — which A1 must specify);
- `maxLength: 128` is annotated `x-maxlength-note` as an inference that is **not**
  a control, so it cannot be mistaken for one;
- the gap ships as `examples/accepted-gap-structureless-handle-body.json`, so it is
  executable and visible in CI rather than prose in a document.

**3. Cross-tenant scope.** Nothing binds the scope a document *claims* to the scope
the registry recorded at issuance; this validator cannot compare one property with
another. Recorded as `x-cross-tenant-limitation` on `scope` and in
`untestable_by_schema`. Enforcement belongs to the PT-010 resolver and is not
claimed.

**4. Free text on support-visible paths.** Every human-readable field in all three
contracts is a stable key with a pattern — `revocation.reason_key`,
`audit.reason_key`, `readiness.capabilities[].reason_key` — on the CM-004 and
CTR-ERR-001 precedent. Two negative fixtures (`invalid-free-text-reason.json`,
`invalid-free-text-readiness-reason.json`) exist so the rule is executed, not just
stated.

## Declared as NOT demonstrated

`untestable_by_fixture` (a single document cannot show it):

- **PT-010** immediate revocation and **SEC-005** encryption/masking — properties
  of a resolver over time and of storage.
- **SEC-012** "the key never reaches analytics or an error trace" — the `redaction`
  block records that a producer *asserts* each surface is safe; only a runtime
  redaction test shows it is true. Decision Register §5.2 names redaction tests as
  a required freeze artifact and **they do not exist**.
- **SEC-016** time-bounded break-glass and **SEC-009** audit *completeness* — a
  fixture shows a record that exists has the right shape, never that a record was
  written when it should have been.
- **OB-001 / OBS-004** correlation propagation and **OB-003** readiness matching
  reality — properties across a sequence of signals, not within one.

`untestable_by_schema` (JSON Schema cannot express it):

- handle **opacity**; audit **immutability** (no hash chain or signature field,
  because no source specifies one); before/after **reference resolution**; metric
  **cardinality** (a population property); and every **cross-field** equality
  (`correlation_id` vs `tenant_context.correlation_id`, `sli_tags.module_key` vs
  `module.module_key`, `action.name` vs `action.category`).

## Accepted gaps — four, each with a named owner

| Fixture | Requirement it does not meet | Who must resolve |
|---|---|---|
| `ctr-sec-001/.../accepted-gap-structureless-handle-body.json` | Decision Register 5.2 "opaque ref" + PT-010: cannot tell a reference from credential material encoded as one | A1 — handle issuance format |
| `ctr-sec-001/.../accepted-gap-classification-below-restricted.json` | SEC-003: accepts a provider credential declared merely `internal` | A1 — assign the class in the SEC-003 matrix |
| `ctr-aud-001/.../accepted-gap-break-glass-without-time-bound.json` | SEC-016: records that break-glass happened, not that it ended | A1 — expiry/approver/revocation fields |
| `ctr-obs-001/.../accepted-gap-unbounded-error-code-label.json` | OB-006 "cardinality bounded": label *names* are closed, label *values* are not | A6 — per-label budget and value vocabulary |

## Deliberately not inferred

Credential storage and encryption (SEC-005); the PT-010 resolver protocol and its
scope check; the handle issuance format; rotation **overlap** semantics; revocation
propagation; the audit store and its immutability mechanism; the retention
duration (PDPA-006 undelivered, and the baseline requires Thai legal confirmation);
OB-002 alert routing; OBS-009 SLO arithmetic; the OBS-004 trace wire format; the
numeric cardinality budget; MR-005 drain/shutdown states (they belong to
CTR-MOD-001 and are not duplicated); and platform-scope audit actions belonging to
no workspace. Each is named in a `freeze_boundary` and in `open_blockers`.

## Verification — every command run on pinned Node 24.20.0 / npm 11.19.0

| Command | Exit | Result |
|---|---:|---|
| `npm run check` | `0` | `tests 85 / pass 85 / fail 0 / skipped 0 / todo 0` |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `0` | all three new contracts validated against their own schemas |
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` | `0` | every `$ref` resolves to a canonical `schema.json` whose `$id` matches its directory |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| `node scripts/validate-work-packages.mjs work-packages` | `0` | no output |
| `node scripts/scan-repository-secrets.mjs` | `0` | no output (**weak** — see limitations) |
| `node scripts/verify-test-coverage-floor.mjs` | `0` | no output |

Baseline before this package was also `85 / 85`: these three contracts add
fixtures to suites that iterate the catalog, not new test declarations, so no
change to `test-kits/integrity-manifest.json` is required or made.

**Conformance coverage is real, not incidental — proven by mutation on all three
contracts.** Each mutation was applied, the suite run, and the fixture restored:

| Mutation | Suite result |
|---|---|
| `ctr-sec-001/examples/invalid-revoked-still-resolvable.json`, `resolvable` → `false` | fail 1: *"ctr-sec-001/examples/invalid-revoked-still-resolvable.json is named invalid but its schema accepts it"* |
| `ctr-aud-001/examples/invalid-denied-without-error.json`, add a valid `error` | fail 1: *"ctr-aud-001/examples/invalid-denied-without-error.json is named invalid but its schema accepts it"* |
| `ctr-obs-001/examples/invalid-liveness-depends-on-external-provider.json`, flag → `false` | fail 1: *"ctr-obs-001/examples/invalid-liveness-depends-on-external-provider.json is named invalid but its schema accepts it"* |

After restoring all three, the contract suites returned to `33 / 33` and
`npm run check` to `85 / 85`.

**78 fixtures across 12 contracts** are now under schema conformance (31 of them
added by this package: 11 CTR-SEC-001, 10 CTR-AUD-001, 10 CTR-OBS-001).

## A deliberate deviation from the sibling packages

`ownership.forbidden_paths` here does **not** contain `**/*secret*` or
`**/*credential*`, which WP-0A-CON-001..003 do. This package materializes the
secret-handle contract, so those globs would forbid its own declared outputs —
a contradiction, not a control. They are replaced by key and certificate material
extensions (`*.pem`, `*.key`, `*.p12`, `*.pfx`), and the intent is carried by
`data_classification: synthetic-only`, by `npm run scan:secrets`, and by
CTR-SEC-001's root `additionalProperties: false`, which gives the contract no
property capable of holding credential material. The reasoning is recorded
in-manifest as `ownership.forbidden_paths_note` so a reviewer sees it as a
deliberate line in the diff. Note that WP-0A-CON-003 already ships
`ctr-mod-001/examples/valid-blocked-missing-secret.json` against its own
`**/*secret*` glob, so the contradiction pre-exists this package; this is the
first package to state it rather than inherit it silently.

## Author-declared limitations

- This run authored the change and must **not** review, security-review,
  test-verify, or integrate it.
- **`contract-catalog/shared-kernel/index.json` is untouched.** All three contracts
  remain `Draft`; the index still reports 4 Candidate / 10 Draft, asserted by the
  existing envelope-contract suite.
- All fixtures are **synthetic**. No value in any fixture is, resembles, or was
  derived from a real credential; the two strings that name credential material
  (`invalid-inline-credential-material.json`,
  `invalid-unredacted-details-payload.json`) carry the literal placeholder
  `SYNTHETIC-PLACEHOLDER-NOT-A-CREDENTIAL` and exist only to be **rejected**.
- The secret scanner passing is **near-worthless evidence here** and must not be
  cited as assurance: independent review showed it detects only strings the
  handle pattern already rejects. Recorded under WP-0A-A0-002 Security C1 and in
  this package's `open_blockers`.
- These contracts constrain **document shape**. Nothing here verifies that a
  handle resolves to a real scoped credential, that a resolver refuses an
  unentitled caller, that an audit record was actually written, or that a health
  signal reflects a running module. All of that is runtime behaviour and none of
  it is claimed.
- The `x-source` annotations are **prose**. The validator only guarantees that
  `x-` keywords constrain nothing; a reviewer must check that each annotation says
  what the cited task says. The Thai-language baseline was read directly for every
  rule, but a reviewer fluent in Thai should confirm the readings, particularly
  OB-003 (liveness must not be tied to an external provider) and PT-010
  (manifest sees a reference; logs/events/jobs contain no secret; revoke
  immediately), because both are load-bearing.
- This package depends on WP-0A-CON-002, WP-0A-CON-003 and WP-0A-A0-002, all
  unmerged, and inherits every open blocker recorded on them — including that the
  test-integrity guard is a tripwire with no self-anchor.
- Work was performed in an isolated extraction of `2649401`, not in the live tree,
  so it has not been rebased onto whatever the live branch now contains. A stacked
  branch that has not been rebased does not see its own integration; that is the
  failure WP-0A-CON-002 hit at exit 87.
