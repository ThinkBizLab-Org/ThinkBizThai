# WP-0A-CON-006 — Independent Tester verdict

Tester run: `/claude/q0_sentinel`
Commit tested: `5c6eef2` (extracted to a frozen copy; the working tree at
`/Users/bank/ThinkBizThai` was never read or written)
Date: 2026-09-01
Contracts under test: **CTR-USG-001** (Usage and Cost Event), **CTR-NTF-001**
(Notification Command and Result)

**This is independent Tester evidence only.** It is not author self-evidence, not
review, not security review, not integration, not Product Owner sign-off, and it
does not move Gate G0. Nothing in this file approves a merge.

## Toolchain observed

| Item | Observed |
|---|---|
| `node --version` (login shell) | `v24.20.0` — matches `.node-version` and `engines.node` |
| `npm --version` | `11.19.0` — matches `engines.npm` |
| Invocation | `zsh -lc 'cd <frozen-root> && npm run check'` |
| Downloads | none; nothing was fetched, installed or upgraded |

Note: the non-login shell on this machine resolves `node` to `v26.7.0`. Every result
below was produced through `zsh -lc` against the pinned `v24.20.0`. A probe run
outside the login shell is not evidence about this repository.

## 1. `npm run check` — baseline

| Field | Value |
|---|---|
| Exit code | `0` |
| Totals | `tests 116 / suites 0 / pass 116 / fail 0 / cancelled 0 / skipped 0 / todo 0` |
| Duration | ~297 ms |
| Decomposition | 116 passing assertions, 0 skipped, 0 todo. Contract suites are five files under `test-kits/contracts/`; the remaining assertions are the protocol, secret-scan, toolchain, coverage-floor and ownership guards. |

Catalog state, verified directly against `contract-catalog/shared-kernel/index.json`
and against the directories on disk:

| Claim | Verified |
|---|---|
| index unchanged at 4 Candidate / 10 Draft | **CONFIRMED** — `{"Candidate":4,"Draft":10}` |
| all 14 contracts materialized | **CONFIRMED** — 14 index rows, 14 directories, every row has both `schema.json` and `manifest.json` |
| 115 fixtures declared across the catalog | **CONFIRMED** — 115 |
| CTR-USG-001 / CTR-NTF-001 present and Draft | **CONFIRMED** |

The Author's headline numbers are accurate. The rest of this file is about what
those numbers do not say.

## 2. Mutation coverage — the central measurement

Method, identical in spirit to the technique already embedded in
`test-kits/contracts/schema-mutation-coverage.test.mjs`: enumerate every deletable
constraint site in the contract's own `schema.json` (each element of a `required`
array counts as its own site; `$ref` targets belong to the referenced contract and
are excluded), delete one site, re-validate **every fixture the manifest declares**
with the repository's own `json-schema-subset.mjs`, and ask whether any verdict
flipped. A site whose deletion flips nothing is defended by no fixture.

| Contract | Fixtures | Constraint sites | Killed | **Coverage** |
|---|---|---|---|---|
| **CTR-USG-001** | 6 | 57 | 4 | **7.0 %** |
| **CTR-NTF-001** | 10 | 49 | 12 | **24.5 %** |
| Package combined | 16 | 106 | 16 | **15.1 %** |

**CTR-USG-001 at 7.0 % is the lowest figure measured anywhere in this session** —
below CTR-MOD-001 and CTR-FLG-001 (10–16 %) and below CTR-SEC-001 / AUD / OBS
(15.7–19.4 %). CTR-NTF-001 at 24.5 % is the best of the six contracts measured, and
is still three quarters undefended.

The four sites CTR-USG-001 does defend: `dimension.enum`,
`attribution.required[provider_key]`, `cost.amount.pattern`,
`metric_labels.maxProperties`. That is one fixture per site and no site with two.

Neither contract has a single entry in the `PROTECTED` list of
`schema-mutation-coverage.test.mjs`, and neither appears in that suite's `OWNED`
root-`required` guard. `grep -rn "usg-001\|ntf-001"` over `test-kits/` returns
**zero** matches. The guard that exists to catch exactly this was not extended to
the two contracts this package adds.

### 2a. Unkilled sites that carry a guarantee — CTR-NTF-001

Each row was confirmed twice: by the harness, and by deleting the constraint in a
fresh copy of the repository and running the real `npm run check`.

| # | Unkilled site | What its silent removal permits | `npm run check` after deletion |
|---|---|---|---|
| N1 | `deep_link.required[requires_permission]` | A command may ship a deep link with **no `requires_permission` field at all**. The `const true` never fires on an absent property, so the permission-checked-deep-link guarantee — the one thing CTR-NTF-001's catalog row names — evaporates. No fixture omits the field; `invalid-deep-link-without-permission.json` sets it to `false`, which the `const` catches, and stops there. | `exit 0`, 116/116 |
| N2 | `allOf[0].then.required[deep_link]` | A `kind: "command"` may carry **no deep link at all**. Together with N1 this is the guarantee failing open in two independent places, with zero test signal from either. | `exit 0`, 116/116 |
| N3 | `allOf[2].then…required[domain_result_rolled_back]` | A `state: "failed"` delivery need never state whether it rolled the domain result back. `invalid-failure-without-class.json` omits `failure_class` **and** `domain_result_rolled_back`, so it stays invalid when either obligation alone is deleted. A double-fault fixture isolates neither. | `exit 0`, 116/116 |
| N4 | `allOf[2].then…required[failure_class]` | Same double-fault. CT-007's transient/permanent distinguishability is undefended. | `exit 0`, 116/116 |
| N5 | `allOf[0].then.required[channel]`, `…[message_key]` | A command need not name its channel or its localized message key. | `exit 0`, 116/116 |
| N6 | `allOf[1]` in full (`kind: "result"` ⇒ `delivery` required) | A result may report no delivery at all — the command/result split collapses on the result side. | `exit 0`, 116/116 |
| N7 | `delivery.properties.state.enum` | Any string becomes a delivery state, so the `if state == "failed"` guard can be routed around by naming the state anything else. | `exit 0`, 116/116 |
| N8 | root `required` (whole list) | `kind`, `notification_id`, `dedupe_key`, `locale`, `tenant_context` all become optional — including the Trusted Tenant Context of §3.1 and the ID-005 dedupe key. | `exit 0`, 116/116 |
| N9 | `locale.enum`, `channel.enum` | The single-supported-locale discipline and the channel allow-list are documentation. | `exit 0`, 116/116 |
| N10 | `deep_link.additionalProperties`, `delivery.additionalProperties`, `deep_link.required[target_ref]` | Undeclared keys inside `deep_link`/`delivery`, and a deep link with no target. (The catalog-wide extra-property suite covers the root and one nested level, so these are partially defended by a *different* suite, not by a declared fixture.) | not separately probed |

### 2b. Unkilled sites that carry a guarantee — CTR-USG-001

| # | Unkilled site | What its silent removal permits | `npm run check` after deletion |
|---|---|---|---|
| U1 | the **entire `allOf`** | Nothing, because it already enforces nothing — see §3. | `exit 0`, 116/116 |
| U2 | root `required` (whole list) | `usage_id`, `occurred_at`, `dimension`, `quantity`, `attribution`, `cost`, `dedupe_key`, `tenant_context` all optional. That includes the §3.1 Trusted Tenant Context and the OB-008/ID-002 `dedupe_key` — a usage ledger with no dedupe key is a double-billing ledger. | `exit 0`, 116/116 |
| U3 | `quantity.properties.amount.pattern` | The quantity a cost is derived from may be **any string** — `"1e5"`, `"-5"`, `""`. This is the MOD-130 no-floating-point-money rule extended to quantity, and it is the package's own declared inference. Nothing tests it. | `exit 0`, 116/116 |
| U4 | `cost.properties.currency.enum` | Any string becomes a currency. THB/USD is documentation. | `exit 0`, 116/116 |
| U5 | `cost.properties.basis.enum` | `provider_reported` / `list_price` / `estimated` unbounded — OB-008 cannot tell a reported figure from an estimate, which is the reason `basis` exists. | not separately probed |
| U6 | `cost.required[amount]`, `[currency]`, `[basis]`; `quantity.required[amount]`, `[unit]` | A cost with no amount, no currency or no basis; a quantity with no amount or no unit. | not separately probed |
| U7 | `attribution.required[workspace_id]`, `[job_id]` | OB-004 acceptance requires workspace/business/job/provider attribution. Only `provider_key` is defended (by `invalid-missing-provider-attribution.json`); workspace and job are not. | not separately probed |
| U8 | `occurred_at.format` (`date-time`) | A usage event may carry any string as its timestamp. A usage ledger with unparseable instants cannot be reconciled against a provider statement at all. | not separately probed |
| U9 | `dedupe_key.minLength`, `usage_id.minLength`, all `attribution.*.minLength` | Empty-string identifiers. An empty `dedupe_key` collides with every other empty `dedupe_key`. | not separately probed |
| U10 | `attribution.provider_key.pattern` | Provider keys unconstrained despite the schema declaring a shape. | not separately probed |
| U11 | `metric_labels.type` | `maxProperties: 0` applies only to objects. `type: object` is what actually rejects an **array** of labels — and its removal kills nothing. See §6. | not separately probed |

**Control.** Deleting `metric_labels.maxProperties` (CTR-USG-001) turns the suite
red — `exit 1`, `pass 115 / fail 1`. Deleting
`delivery.domain_result_rolled_back.const` (CTR-NTF-001) likewise — `exit 1`,
`pass 115 / fail 1`. The probe method is sound: green after a deletion means the
deletion is genuinely invisible, not that the harness is broken.

## 3. CTR-USG-001's `allOf` is not merely untested — it is vacuous

The contract's only conditional rule reads: *if* `cost.basis == "estimated"`, *then*
`cost` requires `["amount","currency","basis"]` and the document requires
`dedupe_key`.

Both obligations are already unconditional:

- `properties.cost.required` is **already** `["amount","currency","basis"]`, applied
  whenever `cost` is present — and the `if` only fires when `cost` is present.
- root `required` **already** contains `dedupe_key`.

So the `then` branch is entailed by the schema outside it, for every possible
instance. This was checked empirically as well as by inspection: across 32
adversarial instances spanning every `basis` value, `basis` absent, `cost` absent,
`cost.amount` absent and `dedupe_key` absent, deleting the whole `allOf` changed
**0 of 32** verdicts, and deleting it in the repository leaves `npm run check` at
`exit 0`, 116/116.

`x-rule` states the intent — *"an estimated cost must still be dedupable, or a later
provider statement cannot replace it without double-counting"* — and the
`freeze_boundary` says the contract *"materializes exactly"* OB-004's requirements.
The rule as written adds nothing to the contract. This is the CTR-PAG-001
`minItems: 1` defect class in a new form: a rule that reads as a constraint and is
not one. It is the single most substantive finding in this package.

## 4. The two `const` prohibitions — evasion attempts

Every row is a real run of the repository's own validator against the shipped
schema. `ACCEPT` means the document passed.

### `deep_link.requires_permission: const true`

| ID | Attack | Result |
|---|---|---|
| A1 | `requires_permission: false`, `kind: command` | REJECT — `expected const true` |
| A2 | omit `requires_permission` from `deep_link` | REJECT — `missing required property` |
| A3 | omit `deep_link` entirely, `kind: command` | REJECT — `missing required property 'deep_link'` |
| A4 | `kind: result` carrying `deep_link` with `requires_permission: false` | REJECT — the `const` applies outside the `if`, so a result cannot evade it |
| A5 | `kind: result` carrying **no** `deep_link` | **ACCEPT** — by design; a result is not required to have a link |
| A6 | `deep_link` as a string, to bypass the object keywords | REJECT — `expected type "object"` |
| A7 | nested `deep_link.deep_link` with `requires_permission: false` | REJECT — `additional property not permitted` |
| A8 | omit `kind` entirely, to skip both `if`s | REJECT — `kind` is in root `required` |
| A9 | `kind: "Command"` (case variant) to skip the `if` | REJECT — not in enum |
| A10 | `requires_permission: 1` | REJECT |
| A11 | `requires_permission: "true"` | REJECT |

**Not evadable as shipped.** The `const` sits on a property that is `required`
inside `deep_link`, and `deep_link` itself sits outside the `if`, so it is reached on
every `kind`. The prohibition is correctly placed.

**But it is undefended.** The `required` that makes the `const` reachable
(`deep_link.required[requires_permission]`) is killed by no fixture — finding N1.
The prohibition holds today and would fail open silently tomorrow.

### `delivery.domain_result_rolled_back: const false`

| ID | Attack | Result |
|---|---|---|
| B1 | `state: failed`, `rolled_back: true` | REJECT — `expected const false` |
| B2 | `state: delivered`, `rolled_back: true` | REJECT — `const` applies on every state |
| B3 | `state: queued`, `rolled_back` omitted | **ACCEPT** |
| B4 | `state: suppressed_duplicate`, `rolled_back` omitted | **ACCEPT** |
| B5 | `state: failed`, `rolled_back` omitted | REJECT — `missing required property` |
| B6 | `state: failed`, `failure_class` omitted | REJECT — `missing required property` |
| B7 | omit `delivery`, `kind: result` | REJECT — `allOf[1]` requires it |
| B8 | `kind: command` carrying `delivery` with `rolled_back: true` | REJECT — the `const` fires before the command/result rule |
| B9 | `rolled_back: "false"` (string) | REJECT |
| B10 | `state: delivered` **with** `failure_class: permanent` | **ACCEPT** — see below |

**The prohibition is not evadable**: no document can assert
`domain_result_rolled_back: true` under any `kind` or any `state`. The `const` is
outside the `if`, which is the right construction and is worth saying plainly.

**The obligation to state it is narrow**: only `state: "failed"` compels the field
(B3, B4). That is defensible — PT-007's acceptance is about *delivery failure* — but
it means the contract records the prohibition only where it thought to ask. And per
N3, the `required` that compels it under `failed` is killed by no fixture.

**B10 is a modelling gap**, not an evasion: a `delivered` notification may carry
`failure_class: "permanent"`. Nothing ties `failure_class` to a failed state. Low
severity; a retry policy reading `failure_class` without first checking `state`
would be misled.

## 5. The `if`/`then` vacuity trap — full audit

An `if` with `properties` but no sibling `required` matches when the property is
**absent**, firing the `then` on documents it was never meant to describe.

**Both schemas in this package are clean.** All five `if` clauses across
CTR-USG-001 (1) and CTR-NTF-001 (3), and every nested `properties` level inside
them, carry a matching `required`. CTR-NTF-001's third rule is guarded at both
levels — `required: ["delivery"]` outer and `required: ["state"]` inner. The
discipline CON-003 established held here. **0/5 unguarded.**

Catalog-wide, 34 `if` clauses were examined. Eight property levels lack a sibling
`required` — three in `ctr-api-001`, three in `ctr-idm-001`, two in `ctr-pag-001`.
**None of the eight is exploitable**, because in each case the discriminator is in
that schema's root `required` list (`ctr-api-001.required` contains `kind`,
`ctr-idm-001.required` contains `state`, `ctr-pag-001.required` is `["kind"]`), so
the property can never actually be absent. They are latent, not live: if any of
those root `required` entries were ever removed — and per §2 no fixture in this
catalog kills a root `required` list — the `if` would begin matching on absence.
Recorded as an observation about three contracts outside this package, not as a
defect of WP-0A-CON-006.

## 6. `metric_labels: maxProperties 0`

| ID | Probe | Result |
|---|---|---|
| E1 | `{}` | ACCEPT |
| E2 | `{"page_name": "ร้านของฉัน"} ` | REJECT — `has 1 properties, more than maxProperties 0` |
| E3 | `{"": ""}` (empty key and value) | REJECT |
| E4 | property omitted | ACCEPT — `metric_labels` is optional |
| E5 | `[]` | REJECT — `expected type "object", got array` |
| E6 | `["secret"]` | REJECT — **caught by `type`, not by `maxProperties`** |
| E7 | `"secret"` | REJECT — by `type` |
| E8 | `null` | REJECT — by `type` |

`maxProperties: 0` does reject a populated object, and it **is** exercised by a
declared fixture: `invalid-metric-label-carries-content.json`, which is one of only
four killing fixtures in the whole contract. Deleting the keyword turns the suite
red. Confirmed working and confirmed tested.

The caveat is E5/E6: `maxProperties` is an object-only keyword, so what actually
stops a user-content payload arriving as a JSON **array** is `type: "object"` — and
`metric_labels.type` is killed by no fixture (U11). The guarantee is carried by two
keywords and only one of them is defended.

## 7. Notification reference grammar — hostile set

`deep_link.target_ref` against
`^(app|content|asset|job):[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$`.

Rejected — all 21: `https://…`, `HTTPS://…` (the case-variant that defeated the old
deny-list), `//host/x`, `ftp://h/x`, `data:text/plain;base64,AA==`,
`file:///etc/passwd`, `javascript:alert(1)`, `../../../etc/passwd`,
`content://authority/x`, `content:` (empty body), `app:` (empty body),
`content:../../etc/passwd`, `app:a/../../b`, `APP:x` (uppercase scheme),
`content:x?y=z`, `content:x#frag`, `content:x y`, `content:ร้าน` (non-ASCII),
`mailto:a@b.c`, `content:x\nhttps://evil` (newline injection — JavaScript `$` does
not match before a trailing newline, so the anchor holds), `x` (no scheme).

Accepted — the four intended forms only: `content:content_synthetic_0001`,
`job:a.b/c.d`, `asset:a-b_c`, `content:a/b/c`.

**The allow-list grammar holds against the full hostile set with no exceptions.**
This is the strongest part of the package. Note that its defence rests on one
fixture (`invalid-deep-link-public-url.json`, which carries `https://`); the pattern
site is killed, so the grammar itself is protected, but the exotic vectors above are
exercised by no declared fixture and by no entry in the catalog-wide
`a reference field rejects every scheme outside its allow-list` test, whose `targets`
list names only `ctr-api-001` and `ctr-idm-001`.

## 8. Money

### `cost.amount` — `^-?[0-9]+\.[0-9]{2,8}$`

| ID | Value | Result |
|---|---|---|
| C2 | `"0.0425e-1"` (exponent) | REJECT — this is the declared fixture |
| C3 | `"1e5"` | REJECT |
| C4 | `"+0.04"` (leading `+`) | REJECT |
| C5 | `"000000.04"` (leading zeros) | **ACCEPT** |
| C6 | `"-0.00"` (negative zero) | **ACCEPT** |
| C7 | `"-5.00"` (negative cost) | **ACCEPT** |
| C8 | 30-digit integer part `"1234…7890.00"` | **ACCEPT** |
| C9 | `"٠.٠٠"` (Arabic-Indic digits) | REJECT — `[0-9]` under the `u` flag is ASCII-only |
| C10 | `"0.123456789"` (9 fraction digits) | REJECT — cap is 8 |
| C11 | `"0.4"` (1 fraction digit) | REJECT — floor is 2 |
| C12 | `"5"` (no fractional part) | REJECT |
| C13–16 | leading space, trailing space, trailing newline, `".04"` | REJECT (all four) |
| C17 | `"-000.00000000"` | **ACCEPT** |

### `quantity.amount` — `^[0-9]+(\.[0-9]+)?$`

| ID | Value | Result |
|---|---|---|
| D2 | `"-1450"` | REJECT — no sign permitted |
| D3 | `"+1450"` | REJECT |
| D4 | `"0007"` (leading zeros) | **ACCEPT** |
| D5 | `"1.0"` | ACCEPT |
| D6 | `"1."` | REJECT |
| D7 | `"1e5"` | REJECT |
| D8 | 60 fraction digits | **ACCEPT** — no cap |
| D9 | `"١٤٥٠"` (Arabic-Indic) | REJECT |
| D10 | `"1450\n"` | REJECT |
| D11 | 33-digit integer | **ACCEPT** |

### Ruling on the asymmetry: **accidental and undeclared, not deliberate**

The two patterns differ on three independent axes, and the contract declares a
reason for none of them:

1. **Sign.** `cost.amount` permits a leading `-`; `quantity.amount` does not. A
   negative cost is accepted (C7, C17), including negative zero (C6). Nothing in
   the schema's `x-source`, the manifest's `freeze_boundary`, the
   `untestable_by_*` fields or the Author self-check mentions a credit, a refund or
   a reversal. The baseline puts refunds firmly out of reach: `NG-006` lists
   "full automated tax invoice/refund/payment gateway" as **not goal**, `OPEN-001`
   lists refund policy as an **open decision** pending Product + Accountant, and
   `BILL-DEC-013` is `PROPOSED`. If negative cost were intended as a credit line,
   it would be a materialization of an explicitly open decision — which the
   package's own discipline forbids. If it were not intended, the `-?` is a typo
   that silently admits a negative-value usage event into a billing ledger.
   Either way it is undeclared, and it must be resolved by the contract owners
   (A0+A6) rather than inferred here.
2. **Explicit scale.** `cost.amount` mandates 2–8 fraction digits — a real explicit
   scale, exactly as MOD-130 demands. `quantity.amount` makes the fractional part
   **optional and unbounded** (D5, D8), so a quantity has no scale at all and no
   digit ceiling. Yet the schema's own `x-source` says a quantity "is carried as a
   DECIMAL STRING **for the same reason** a money amount is". The stated reason and
   the written pattern do not agree.
3. **Magnitude.** Neither field bounds the integer part (C8, D11). A 30-digit cost
   and a 33-digit quantity are both accepted, and both exceed IEEE-754 exact
   integer range — so any consumer that parses these strings to a float, which is
   precisely what MOD-130 exists to prevent, loses precision on a value the
   contract called valid.

Additionally, both patterns accept leading zeros (C5, D4), so a single amount has
many valid spellings and `dedupe_key`-independent equality comparison over the
literal string is unsafe. That is a note for OB-008, not a defect here.

Recommendation, for the contract owners and not adopted by this run: state whether a
negative cost is in scope; if it is not, drop `-?`; if it is, add a fixture that
exercises it and say in `freeze_boundary` what it means. Give `quantity.amount` the
same explicit scale its own `x-source` claims, or amend the `x-source`.

## 9. Full attack table — exit codes

`npm run check` was run against a **fresh copy of the frozen root for each
destructive probe**; no probe ran on top of another.

| # | Probe | Expected if defended | Observed |
|---|---|---|---|
| 0 | baseline, unmodified | `exit 0` | `exit 0` — 116/116 |
| P1 | delete CTR-USG-001 `allOf` entirely | red | **`exit 0`** — 116/116 |
| P2 | delete `quantity.amount.pattern` | red | **`exit 0`** — 116/116 |
| P3 | delete CTR-USG-001 root `required` | red | **`exit 0`** — 116/116 |
| P4 | delete `cost.currency.enum` | red | **`exit 0`** — 116/116 |
| P5 | delete `metric_labels.maxProperties` (control) | red | `exit 1` — 115/116, 1 fail |
| P6 | delete CTR-NTF-001 root `required` | red | **`exit 0`** — 116/116 |
| P7 | delete `delivery.state.enum` | red | **`exit 0`** — 116/116 |
| P8 | delete `locale.enum` | red | **`exit 0`** — 116/116 |
| P9 | delete `channel.enum` | red | **`exit 0`** — 116/116 |
| P10 | delete `deep_link.required` | red | **`exit 0`** — 116/116 |
| P11 | drop `failure_class` from the failure obligation | red | **`exit 0`** — 116/116 |
| P12 | drop `domain_result_rolled_back` from the failure obligation | red | **`exit 0`** — 116/116 |
| P13 | delete `allOf[0].then.required` (command obligations) | red | **`exit 0`** — 116/116 |
| P14 | delete `allOf[1]` (result must report delivery) | red | **`exit 0`** — 116/116 |
| P15 | delete `domain_result_rolled_back.const` (control) | red | `exit 1` — 115/116, 1 fail |

Thirteen of fifteen deletions are invisible to the repository's full verification
command. Two controls confirm the command can go red.

## 10. What this package got right

Stated plainly, because a verdict that lists only defects is not a measurement:

- Both `const` prohibitions are placed **outside** their `if` clauses, so neither is
  reachable-only-through-a-branch. Eleven evasion attempts against
  `requires_permission` and ten against `domain_result_rolled_back` all failed.
- All five `if` clauses are guarded with `required`. The vacuity trap does not
  appear in this package.
- The `target_ref` allow-list grammar rejected the entire 21-value hostile set,
  including every vector that defeated the earlier deny-list.
- `maxProperties: 0` works and is one of the few sites a fixture actually defends.
- Conformance is genuinely green: no fixture disagrees with its own schema, the
  index was not promoted, and every catalog claim in the self-check checks out.
- The Author named this exact gap in its own limitations section rather than
  leaving it to be found. That is the reason it could be measured cleanly.

## 11. Findings, ranked

| # | Finding | Severity |
|---|---|---|
| 1 | **CTR-USG-001's only conditional rule is vacuous.** Its `then` is entailed by the schema outside it for every instance; deleting it changes nothing. A rule that reads as a constraint and is not one — the CTR-PAG-001 defect class. | **High** |
| 2 | **CTR-USG-001 mutation coverage 7.0 % (4/57)** — the lowest measured in this session. `dedupe_key`, `occurred_at.format`, `cost.currency`, `cost.basis`, `quantity.amount.pattern`, workspace/job attribution and the whole root `required` list are defended by nothing. | **High** |
| 3 | **`deep_link.required[requires_permission]` is undefended.** The one guarantee CTR-NTF-001's catalog row names fails open on its removal, at `exit 0`. Compounded by `allOf[0].then.required[deep_link]`, also undefended. | **High** |
| 4 | **Neither contract has a single entry in `schema-mutation-coverage.test.mjs`.** The guard built for exactly this defect was not extended to the contracts this package adds; `grep` over `test-kits/` returns zero matches for either. | **High** |
| 5 | **`invalid-failure-without-class.json` is a double-fault fixture** omitting both `failure_class` and `domain_result_rolled_back`, so it isolates neither obligation and kills neither site. | **Medium** |
| 6 | **The money-pattern asymmetry is undeclared** on all three axes (sign, scale, magnitude). Negative cost is accepted with no source; refunds are `NG-006`/`OPEN-001`/`PROPOSED` in the baseline. `quantity.amount` has no explicit scale despite its `x-source` claiming the opposite reason. | **Medium** |
| 7 | **CTR-NTF-001 mutation coverage 24.5 % (12/49)** — best of the six contracts measured, still three quarters undefended. Root `required` (including `tenant_context` and `dedupe_key`), `locale.enum`, `channel.enum`, `delivery.state.enum` all unkilled. | **Medium** |
| 8 | **`metric_labels` array vector rests on `type`, not `maxProperties`**, and `metric_labels.type` is undefended. | **Low** |
| 9 | **`failure_class` is not tied to a failed state** — `state: delivered` with `failure_class: permanent` is accepted. | **Low** |
| 10 | **Eight latent unguarded `if` property levels** in `ctr-api-001`, `ctr-idm-001`, `ctr-pag-001`. Not exploitable today because each discriminator is in its root `required`; no fixture in the catalog kills a root `required` list. Outside this package; recorded for the owners. | **Low / observational** |

## 12. Conditions

The contracts are internally sound: conformance is real, the prohibitions are
correctly placed, and the reference grammar is genuinely hard. What is missing is
evidence that any of it is *held in place*. Findings 1 and 3 are the two that must
be answered before freeze; the rest are measurement to be acted on.

1. **Resolve CTR-USG-001's vacuous `allOf`** (finding 1). Either express a rule the
   schema does not already entail — e.g. an estimated cost obliging something a
   reported one does not — or remove it and stop the `x-rule` prose from claiming a
   guarantee that is not in the contract.
2. **Add entries to `PROTECTED` in `schema-mutation-coverage.test.mjs`** for at
   minimum `deep_link.required[requires_permission]`, `allOf[0].then.required
   [deep_link]`, `quantity.amount.pattern`, `cost.basis.enum`, `occurred_at.format`
   and `metric_labels.type`, and add the fixtures that kill them. Add both
   contracts to the `OWNED` root-`required` guard.
3. **Split `invalid-failure-without-class.json`** into two single-fault fixtures so
   the `failure_class` and `domain_result_rolled_back` obligations are separately
   killable.
4. **Owners (A0+A6) must rule on negative cost** and on whether `quantity.amount`
   should carry the explicit scale its `x-source` claims. Do not resolve it by
   inference in a materialization run — refund policy is an open Product decision.
5. The ownership irregularity already recorded in `open_blockers` (A5 for
   CTR-NTF-001, A6 for CTR-USG-001) stands unresolved and is not affected by this
   testing.

None of these are correctness failures of what shipped. Every one is a gap between
what the contracts claim to guarantee and what the repository can prove they
guarantee.

VERDICT: test_verified_with_conditions
