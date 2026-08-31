# WP-0A-CON-003 — Independent Security/Privacy review

Reviewer run: `/claude/a1_bastion` (A1 Bastion, Security/Privacy)
Commit reviewed: `2649401`
Review root: frozen extraction at
`/private/tmp/claude-501/-Users-bank-ThinkBizThai/cb23f394-422b-4ec3-b024-e2751f208eb9/scratchpad/con003-review`
Date: 2026-09-01
Toolchain observed: Node `v24.20.0`, npm `11.19.0`

**This is Security/Privacy evidence only.** It is not contract review, not test
verification, not integration, not Product Owner disposition, and not merge
authorization. It does not move Gate G0. I am not the Author of this package and
have authored none of the files under review.

## 0. Scope caveat on the reviewed revision

The frozen root is a file extraction, not a clone: it contains no `.git`, so
`git log`/`git show` are unavailable and I **cannot independently verify** that
these bytes are commit `2649401`. I record the commit id as supplied to me and
attest only to the content I read at this path. An Integration Owner must confirm
the SHA against the real repository before relying on this review.

## 1. Commands executed, with real exit codes

| Command | Exit | Result |
|---|---|---|
| `zsh -lc 'node --version && npm --version'` | `0` | `v24.20.0`, `11.19.0` — matches RFC-2026-001 pin |
| `zsh -lc 'npm run check'` | `0` | `tests 85 / pass 85 / fail 0 / cancelled 0 / skipped 0 / todo 0` |
| `node scripts/scan-repository-secrets.mjs` | `0` | no output, no findings |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| `node scripts/validate-work-package-role-separation.mjs work-packages` | `65` | **operator error on my part** — the validator takes one manifest, not a directory; it reported `invalid JSON manifest: EISDIR`. Recorded because it was run. |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-003.json` | `0` | correct invocation; role separation holds for this package |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `0` | conformance passes |
| `node scripts/scan-repository-secrets.mjs <isolated probe dir>` | `70` | scanner-coverage probe, section 6 |
| `node scripts/validate-work-packages.mjs work-packages` (throwaway copy, baseline) | `0` | role-separation correction, section 7 |
| `node scripts/validate-work-packages.mjs work-packages` (throwaway copy, CON-003 mutated to `in_review` with reviewer = author) | `67` | names `WP-0A-CON-003.json` — the gate **does** cover this package |
| `npm run check` (same mutation, throwaway copy) | `67` | same |
| `node probe-con003.mjs` (adversarial probes, written **outside** the frozen root) | `0` | 24 probes; results in sections 2–5 |

Adversarial probes were run by importing the repository's own
`test-kits/contracts/json-schema-subset.mjs` and the two shipped `schema.json`
files, read-only. **No file inside the frozen root was created or modified by this
review except this evidence file.** I did not read or write
`/Users/bank/ThinkBizThai`, and I did not touch `review-contract.md` or
`test-verdict.md`.

Evidence-hygiene note, not a defect: the Author self-check records `70/70` at base
`28d3142`; the frozen revision reports `85/85`. The delta is consistent with the
package's own additions plus its unmerged dependencies, but the Tester and
Integration Owner should reconcile the counts rather than carry the `70` forward.

## 2. `secret_handles` as a credential boundary — ruling

Pattern under review: the item constraint requires a literal `secret:` prefix
followed by one or more characters drawn from lowercase letters, digits, dot,
underscore and hyphen. There is no `maxLength` and no `minItems`.

Probe results (`ACCEPT` = the shipped schema admits the document):

| Probe | Handle content | Result |
|---|---|---|
| M7 | a 40-character lowercase hexadecimal string | **ACCEPT** |
| M8 | a lowercase, dash-separated bot-token shape of the kind several chat and webhook providers issue | **ACCEPT** |
| M9 | a mixed-case base64 token with `+`, `/` and `=` | REJECT — fails the pattern |
| M10 | a 4096-character handle name | **ACCEPT** |
| M11 | handles naming another tenant's and an unrelated provider's credential | **ACCEPT** |

**Ruling: the case-sensitivity question resolves in the contract's favour only by
accident, and the boundary is shape theatre.**

The pattern is lowercase-only, so it does exclude the *classic* mixed-case base64
bearer token (M9). That is the entire strength of the control. It does **not**
exclude the large class of real credentials that are already lowercase: hex API
keys and signing secrets, lowercase base32, UUID-shaped keys, and the
lowercase dash-delimited bot tokens issued by common providers all satisfy
`[a-z0-9._-]` unmodified (M7, M8). An attacker or a careless module author does
not need to defeat the pattern; they need only pick a credential that is already
lowercase, or lowercase one on the way in. With no `maxLength` (M10), there is no
length signal either.

Nothing in the contract prevents a manifest from listing a handle it has no
entitlement to (M11). The Author concedes this and I confirm it: `secret_handles`
is an unverified *self-declaration*. A module manifest asserts which secrets it
wants; no resolver, scope check, or entitlement check exists in this package or
anywhere in the repository. The `x-source` annotation asserts "a manifest sees a
scoped REFERENCE only" — the schema enforces the word `secret:` and a lowercase
alphabet, and enforces nothing whatsoever about scoping.

Is the shape constraint worth anything on its own? **Marginally, and less than it
appears.** It gives a future resolver a syntactic anchor and it will catch the
copy-paste of a mixed-case token. It will not catch the lowercase ones, and
because it *looks* like a credential boundary it invites exactly the reliance it
cannot support. A shape constraint that blocks one credential family while
silently admitting several others, in a field explicitly documented as the place a
literal credential "must never appear", is worse than an unconstrained field
honestly labelled, because the honest field would not be mistaken for a control.

**Would the repository secret scanner catch a real token placed there?** No — see
section 6. The two defenses are blind in the same direction.

**Ownership finding (S-2).** `contract-catalog/shared-kernel/index.json` charters
`CTR-SEC-001` "Secret Reference/Handle", owner **A0+A1**, with
`required_before_freeze` of exactly `opaque ref`, `scope`, `rotation/revoke`,
`redaction tests`. CTR-MOD-001, owner **A0 alone**, defines the secret-handle
syntax unilaterally inside its own schema, ahead of the contract chartered to
define it and jointly owned by this security role. CONTRIBUTING_AGENTS requires an
RFC before changing "data/secret classification" and states that one namespace has
one owner. This is a boundary crossing, not a drafting nit: the syntax that
CTR-SEC-001 must later define is now pre-committed by a contract A1 does not
co-own.

## 3. Deny-by-default (MR-004) — ruling

| Probe | Document | Result |
|---|---|---|
| M1 | `state: ready`, `readiness` omitted entirely | REJECT — correctly caught |
| M2 | `state: ready`, `activated: true`, `missing: ["secret_handle","entitlement"]` | **ACCEPT** |
| M3 | `state: initializing`, no `readiness` at all | **ACCEPT** |
| M4 | `state: draining`, `activated: false` | **ACCEPT** |
| M5 | `state: registered`, no `readiness` | **ACCEPT** |
| M6 | `state: blocked`, `activated: false`, `missing: []` | **ACCEPT** |

**Ruling: the contract constrains a document, not availability.** It is not, as a
security control, deny-by-default.

The one attack the Author anticipated is genuinely closed: `ready` without
`readiness` is rejected (M1), and that is a real improvement over a prose
assertion. Everything around it is open.

- **M2 is the material failure.** A manifest may declare itself `ready` and
  `activated: true` while simultaneously listing `secret_handle` and `entitlement`
  as *missing*. The schema's two `if`/`then` branches constrain `ready` and
  `blocked` independently and never cross-check `activated` against `missing`.
  MR-004's stated rule is that a missing secret, scope or entitlement **does not
  activate**; this document says a module activated anyway and names the
  prerequisites it activated without. That is the precise condition MR-004 exists
  to forbid, and the contract accepts it.
- **M3/M4/M5 are the de-facto-active states.** `readiness` is optional on the
  `lifecycle` object; only `ready` and `blocked` require it. `initializing`,
  `registered` and `draining` may each carry no readiness evidence at all, and
  `draining` — a state in which a module is by definition still serving traffic —
  may carry `activated: false`. Nothing in the contract says which states mean
  "available". A consumer that treats anything other than `blocked` as usable
  inherits no protection from this schema whatsoever, and the schema gives it no
  guidance not to.
- **M6** lets a `blocked` module satisfy "records what was missing" with an empty
  array, defeating the stated MR-006 purpose that support can act without seeing a
  secret.

Deny-by-default is a property of the **composition root's admission decision** —
what it refuses to load, and what it treats as available. This document can at
best record that decision. It currently cannot even do that faithfully, because it
admits a record that is internally contradictory (M2). The guarantee lives in an
unwritten registry; the contract does not carry it and, in its `x-rule` text
("a module cannot be `ready` unless activation readiness explicitly succeeded"),
claims slightly more than it enforces — `activated: true` is asserted by the
document's author, not established by anything.

## 4. The kill switch (FP-002/FP-004) — ruling

| Probe | Document | Result |
|---|---|---|
| F1 | `capability`-scope `kill_switch` | REJECT — correctly caught |
| F2 | `business`-scope `explicit_allow`, `effect: allow`, `evaluated_scopes` includes `platform` | **ACCEPT** |
| F3 | `capability`-scope `explicit_allow` having evaluated `platform` | **ACCEPT** |
| F4 | platform `kill_switch` deny, `write_disabled` **absent**, `historical_read_allowed: false` | **ACCEPT** |
| F5 | platform `kill_switch` deny with neither write nor history field | **ACCEPT** |
| F6 | deciding scope absent from `evaluated_scopes` | **ACCEPT** |
| F7 | `evaluated_scopes` in reverse precedence order | **ACCEPT** |

**Ruling: the contract cannot express the security property it claims. It
describes one decision in isolation, and the actual guarantee lives in an
evaluator nobody has written.**

What *is* enforced is narrow and real: a decision labelled `kill_switch` must be a
platform-scope deny (F1 correctly rejects a capability-scope kill switch, and the
shipped `invalid-kill-switch-allows.json` correctly rejects an allowing one). That
is a well-formedness rule about how a kill switch is *labelled*.

What is claimed is broader. The schema's own `x-rule` reads "a kill switch is a
platform-scope deny **that no narrower scope may override**". The second clause is
not enforced and is not enforceable here. **F2 is the demonstration**: a
business-scope `explicit_allow` that returns `allow`, with `platform` listed among
the scopes it evaluated, is fully valid. A single decision document has no field
in which the existence of a platform kill switch can be represented, so the
conflict the rule forbids **cannot be written down**, and therefore cannot be
rejected. The shipped fixture `invalid-business-overrides-kill-switch.json` does
not test this: it is a business-scope document with `rule: kill_switch`, caught by
the labelling rule in F1. It tests a mislabelled kill switch, not an override. The
fixture name asserts a property the fixture does not exercise — the same class of
defect that sank WP-0A-CON-002, in a milder form.

`evaluated_scopes` does not repair this. It is an unordered `uniqueItems` set with
no relationship to `decision_source.scope`: F6 shows the deciding scope need not
appear in it, F7 shows reverse precedence order is accepted. It is a free-form
annotation, not a precedence record.

**F4 is a separate and independently serious finding.** `historical_read_allowed`
is required to be `true` **only when `write_disabled` is present and true**. An
operator tripping a platform kill switch who simply omits `write_disabled` — the
natural thing to do, since the kill switch already denies — may set
`historical_read_allowed: false` and the document is valid (F4), or omit both and
say nothing about history at all (F5). FP-002's guarantee that historical read
survives a write closure is therefore **opt-in on the one field most likely to be
left out**. A guarantee that binds only when the author volunteers the trigger
field is not a guarantee.

Credit where it is due: the manifest's `untestable_by_fixture` explicitly declares
that FP-002 deterministic precedence is an evaluator property fixtures cannot
demonstrate, and that it needs a harness before freeze. That declaration is
accurate and is the right disclosure. My objection is that the schema's `x-rule`
annotation and the acceptance criterion do not carry the same restraint — the
in-schema text states the override prohibition flatly, where the manifest states
its limits. A reader of the schema alone is misled.

## 5. `data_policy.classification` including `permissioned-data` — ruling

| Probe | Document | Result |
|---|---|---|
| M12 | `classification: "permissioned-data"`, `tenant_scoped: true`, nothing else | **ACCEPT** |
| M13 | `classification: "permissioned-data"`, `tenant_scoped: false` | **ACCEPT** |

**Ruling: no. A Draft contract should not let a module self-declare
`permissioned-data` with nothing attached, and this one does.**

CONTRIBUTING_AGENTS, under non-negotiable security and data rules, states that a
package using permissioned data **must declare classification, consent, retention,
and redaction**. The schema requires only `classification` and `tenant_scoped`.
`retention_reference` is optional; there is no consent field, no redaction field,
and no approval or authority reference anywhere in the object. M12 shows the
highest-sensitivity classification in the enum can be asserted while satisfying
exactly one of the four required declarations.

M13 is worse in kind: a module may declare itself as handling permissioned data
and simultaneously declare it is **not tenant-scoped**, with no rule connecting
the two. Tenant isolation is the first non-negotiable rule in the guide.

I accept that this is Draft and that a runtime approval workflow is out of scope.
That is not what I am asking for. The objection is that an enum value carrying
regulatory weight is being introduced *with no obligations attached to choosing
it*, which establishes the precedent that selecting it is free. The three
sibling declarations the guide names are structural fields, cheap to require now
and expensive to retrofit once manifests exist. The contract already demonstrates
it knows how to make one field's presence force another's — it does so four times
in CTR-FLG-001's `allOf` and twice in CTR-MOD-001's. Not doing it here is a
choice, not a limitation.

**Related, S-3.** `lifecycle.readiness.reason` is `type: string, minLength: 1`
with **no pattern and no maxLength** — unconstrained free text, in precisely the
support-visible path MR-006 describes ("support can act without seeing a secret").
The catalog already has a settled precedent against this: CTR-ERR-001 pins
`details` to `{"type":"object","maxProperties":0}` — a hard structural ban on
free-form leakage into an operator-visible field — and ships
`invalid-unsafe-detail.json` to prove it. CTR-FLG-001 likewise constrains its own
`reason_key` to a key pattern. CTR-MOD-001's `reason` is the one string in the
deny-by-default path a human will read, and it is the one left open, so a
provider error string, a connection URL, or a credential fragment can be carried
into it and rendered to support. The fix is fixture-compatible and I verified it:
all six shipped `reason` values (`readiness.activated`, `readiness.denied`) match a
key pattern of the same form CTR-FLG-001 already uses, so constraining it breaks
nothing.

## 6. Fixtures, and the secret scanner

**Every fixture is synthetic. I read all fifteen in full.** No key, token,
password, private URL, real provider identifier, customer content, or PII appears
in any of them. Identifiers used are `platform-kernel`, `meta-connection`,
`MOD-000`, `MOD-110`, `content.generation`, `usr_synthetic_0001`, and fixed
timestamps. `usr_synthetic_0001` is self-evidently a placeholder.

**`valid-blocked-missing-secret.json` — confirmed a reference, not a credential.**
The `secret_handles` entry is the seven-character string `meta.page_token` behind
the `secret:` prefix: a *name* for a Meta page token, containing no token
material, no page identifier, no app id, and no account number. This is exactly
the correct use of the field, and it is the fixture doing the right thing. My
finding in section 2 is that the field's *pattern* would equally have admitted the
token itself had someone pasted a lowercase one; it is not a finding against this
fixture.

`scan-repository-secrets.mjs` over the frozen root: **exit `0`**, no findings.

### Standing finding C1, restated and now demonstrated at this boundary

I raised C1 (S-1) on WP-0A-A0-002: the scanner's coverage is too narrow to be
relied on, and must be strengthened before any package handles permissioned data,
customer content, or a real provider credential. **I restate C1 unchanged, and
this package supplies the sharpest demonstration of it so far.**

The scanner matches five families: a PEM private-key header, two Stripe-style
prefixes, an AWS-style access-key-id prefix, and GitHub's prefixed tokens. I
placed four handle-shaped payloads in an isolated directory outside the frozen
root and scanned it (exit `70`):

| Payload placed in a `secret_handles` entry | Schema verdict | Scanner verdict |
|---|---|---|
| 40-char lowercase hex | **accepts** | **misses** |
| lowercase dashed bot-token shape | **accepts** | **misses** |
| lowercase JWT-ish prefix + payload | **accepts** | **misses** |
| AWS-style access key id (uppercase) | rejects | catches |

**The intersection is empty in the worst possible direction: the only payload the
scanner catches is the one the schema pattern already rejects, and every payload
the schema pattern admits is invisible to the scanner.** The two controls do not
compose into defense in depth; they overlap on nothing. A lowercase credential
pasted into a `secret_handles` entry would pass the contract, pass the scanner,
pass `npm run check`, and land in the catalog.

C1's minimum scope stands as filed: fail closed on unreadable files (the scanner
currently swallows a read error via `.catch(() => null)` and treats the file as
clean), and add generic-prefix, JWT, DSN and inline assignment patterns. Scanner
work is owned elsewhere; `scripts/**` is read-only for this package and I am not
asking CON-003 to fix it. I am recording that CTR-MOD-001 introduces the
repository's first field explicitly designated to sit next to credential material,
while the compensating control for that field does not exist.

## 7. Blast radius: network, credentials, migrations, RLS, production config

Confirmed by reading every file the package declares as output, plus the root
configuration:

- **No network call.** The only URLs anywhere in the package are the JSON Schema
  meta-schema `$schema` identifiers, which are identifiers and are never
  dereferenced — the repository validates with its own offline subset validator
  and the toolchain is declared network-free.
- **No credential.** Confirmed by full read and by the scanner (exit `0`).
- **No migration, no RLS change.** No `db/` or `migrations/` directory exists in
  the repository at this revision; `migration_reservations` is empty; the package's
  `forbidden_paths` cover `db/**` and `migrations/**`.
- **No production configuration.** No CI, workflow, environment, or deployment
  file is touched.
- **`package-lock.json` untouched**, and it declares **zero dependencies** — the
  root entry has no `dependencies` block, only the engine pin. `package.json` is
  in the package's `read_only_paths` and is unchanged.
- **Catalog index untouched.** `contract-catalog/shared-kernel/index.json` still
  reports 4 Candidate and 10 Draft; CTR-MOD-001 and CTR-FLG-001 remain `Draft`. I
  verified the count programmatically. `CTR-USG-001`, referenced by
  `cost_policy.usage_contract` in one fixture, is a real catalog entry and not a
  dangling reference.
- **Role separation holds** for this package (exit `0`, correct invocation).

### Correction to an earlier claim in this review

An earlier revision of this file asserted that `npm run check` role-separation-checks
only `work-packages/WP-0A-A0-001.json` and never this package. **That claim was
wrong, and I withdraw it.** It was raised with me by the coordinator, and I
re-tested it myself rather than accept either their measurement or my own original
one.

I reached the false claim by grepping the test kit — `test-kits/role-separation.test.mjs`
does reference only `WP-0A-A0-001.json` — and concluding that was the gate's whole
coverage. I never traced the second path. `scripts/validate-work-packages.mjs`,
which `npm run check` runs via `validate:protocol`, imports `validateManifestPath`
from the role-separation validator, walks `work-packages/` **recursively** through
`findJsonManifests`, and applies it to **every** manifest it finds.

Verified by mutation in a throwaway copy of the frozen root (`cp -R`; the frozen
root itself was not mutated):

| Step | Command | Exit |
|---|---|---|
| Baseline | `npm run check` | `0` |
| Baseline | `node scripts/validate-work-packages.mjs work-packages` | `0` |
| `WP-0A-CON-003.json` set to `status: "in_review"` with `reviewer_agent_run_id` = `author_agent_run_id` | `node scripts/validate-work-packages.mjs work-packages` | **`67`** |
| same mutation | `npm run check` | **`67`** |

Both failures name the file directly: `work-packages/WP-0A-CON-003.json: Ready-or-later
work packages require four distinct non-empty role agent_run_ids.` **CON-003 is
role-separation-checked by the gate command, as is every other manifest.** There is
no coverage gap here and the separation-of-duties trust anchor is gated as intended.

What survives, much smaller: the **per-package evidence** command is narrower than
the gate. `WP-0A-A6-001`, `WP-0A-CON-002` and `WP-0A-A0-002` each list a
single-file invocation (`... role-separation.mjs work-packages/<that-one-file>.json`)
in `deterministic_commands.package_evidence`, which by construction covers one
manifest. `WP-0A-CON-003.json` lists **no** role-separation command in its own
`package_evidence` at all, relying on `npm run check`. That reliance is correct.
A role reading only a package's own evidence commands should simply not mistake
them for the gate's coverage. This is an evidence-presentation nit, not a control
gap, and I am not raising it as a condition.

Process observation for the Integration Owner: `WP-0A-CON-003.json` still carries
`"status": "backlog"` while five named role runs are executing against it. The
role ids are real and distinct, so no separation rule is violated, but the status
field does not describe the package's actual state.

## 8. Findings and conditions

| Id | Severity | Finding |
|---|---|---|
| S-1 | High | `secret_handles` excludes only mixed-case tokens; lowercase hex, lowercase base32 and lowercase dashed bot-token shapes all pass, with no `maxLength`. Combined with the scanner's blind spot (C1), the two controls overlap on nothing. |
| S-2 | High | CTR-MOD-001 (owner A0) unilaterally defines the secret-handle syntax chartered to CTR-SEC-001 (owner A0+A1), whose `required_before_freeze` names opaque ref, scope, rotation/revoke and redaction tests. No RFC. |
| S-3 | Medium | `lifecycle.readiness.reason` is unconstrained free text in the support-visible MR-006 path, against CTR-ERR-001's own `maxProperties: 0` precedent. Fixture-compatible fix verified. |
| S-4 | Medium | Deny-by-default constrains only the `ready` label. `activated: true` with a non-empty `missing` list is accepted (M2); `initializing`, `registered` and `draining` require no readiness at all (M3–M5); `blocked` accepts an empty `missing` (M6). |
| S-5 | Medium | The schema's `x-rule` claims a kill switch is a deny "that no narrower scope may override". That clause is unenforceable in a single document (F2/F3) and the fixture named for it tests a mislabelled kill switch instead. |
| S-6 | Medium | `historical_read_allowed` binds only when `write_disabled` is explicitly `true`; omitting `write_disabled` permits `historical_read_allowed: false` under a live kill switch (F4/F5). |
| S-7 | Medium | `permissioned-data` is self-declarable with no consent, retention, redaction or approval reference, and may be combined with `tenant_scoped: false` (M12/M13), against CONTRIBUTING_AGENTS. |
| S-8 | Low | Percentage `0` with `allocated: true` (F8) and a `temporary` flag whose `expires_at` precedes `changed_at` by years (F9) are both accepted. |
| C1 | Standing (S-1) | Secret-scanner coverage, restated from WP-0A-A0-002 and now demonstrated to be disjoint from the `secret_handles` pattern. |

### Conditions

Conditions **CS-1** through **CS-5** are on this package. **C1** is owned elsewhere
and is recorded, not charged to CON-003. A sixth condition on role-separation
coverage appeared in an earlier revision of this file; it rested on a factual error
and is **withdrawn** — see the correction in section 7.

- **CS-1 (S-2, blocking on freeze, not on Draft).** Either move the secret-handle
  syntax into CTR-SEC-001 and have CTR-MOD-001 reference it, or record an RFC in
  which A1 co-signs CTR-MOD-001 defining it. CTR-MOD-001 must not reach Candidate
  carrying a syntax owned by a contract it does not co-own.
- **CS-2 (S-1).** Soften the claim or harden the field. Minimum: add a `maxLength`
  (a handle name has no legitimate reason to exceed roughly 128 characters), and
  rewrite the `x-source` so it states what is enforced — a naming convention — and
  stops describing an unverified self-declaration as a scoped reference. Entitled
  resolution stays out of scope and remains MR-004 runtime behaviour.
- **CS-3 (S-4).** Add the cross-check the schema is one `if`/`then` short of: when
  `readiness.activated` is `true`, `missing` must be absent or empty. Additionally,
  state in `freeze_boundary` which lifecycle states a consumer may treat as
  available, so a reader cannot conclude that `initializing` or `draining` is
  safe by default.
- **CS-4 (S-5, S-6).** Correct the `x-rule` text on the kill-switch branch to state
  only what a single document can enforce — that a kill switch is a platform-scope
  deny — and move the non-override property into `untestable_by_fixture`, where
  precedence determinism is already correctly declared. Rename or repurpose
  `invalid-business-overrides-kill-switch.json`, which does not test an override.
  For S-6, require `historical_read_allowed: true` whenever
  `decision_source.rule` is `kill_switch`, not only when `write_disabled` is
  present.
- **CS-5 (S-7, S-3).** Require `retention_reference` when `classification` is
  `permissioned-data` or `tenant-data`, add consent and redaction references for
  `permissioned-data`, and forbid `permissioned-data` with `tenant_scoped: false`.
  Constrain `readiness.reason` to a key pattern of the form CTR-FLG-001 already
  uses for `reason_key`; I verified all six shipped values already conform.
- **CS-6 — WITHDRAWN.** This condition asked that `npm run check` be extended to
  role-separation-check every manifest rather than only `WP-0A-A0-001.json`. It
  already does. The premise was my error; I verified the correction by mutation
  (exit `67`) and recorded it in section 7. No action is required of anyone.
- **C1 (standing, scanner owned).** Unchanged and now demonstrated at the
  `secret_handles` boundary. Must be closed before any package handles
  permissioned data, customer content, or a real provider credential.

## 9. Disposition

No credential, no PII, no customer content, no network call, no migration, no RLS
change, no production configuration, no dependency, and no lockfile change. The
work is Draft, synthetic-only, and reversible by deleting two directories. There is
**no live exposure in this package**, and its `untestable_by_fixture` declarations
are honest, specific, and a genuine improvement on WP-0A-CON-002.

But this package makes three security claims — a credential boundary, deny-by-
default, and a kill switch no narrower scope may override — and the artifact
carries none of them in full. `secret_handles` is a lowercase naming convention
that the repository's own scanner cannot backstop. Deny-by-default constrains one
label and accepts a self-contradictory readiness record. The kill switch's
override prohibition is unrepresentable in a single decision document, and the
fixture named for it tests something else. Each of these is fixable inside this
contract's own idiom, and the schema already demonstrates the technique in six
other places.

I am not requesting changes, because the findings are overclaim and omission in a
Draft with declared boundaries and no exposure, and because CS-1's ownership
question needs an RFC rather than an edit. I am not approving clean, because doing
so would ratify in-schema text that promises more than it enforces, in the two
contracts the composition root and the policy router will be built against.

VERDICT: security_approved_with_conditions
