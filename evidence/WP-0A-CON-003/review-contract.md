# WP-0A-CON-003 — Independent contract review

Reviewer run: `/claude/c0_contract_reviewer` (Anthropic, `claude-opus-5`)
Commit reviewed: `2649401`
Review root: frozen extraction at
`/private/tmp/claude-501/-Users-bank-ThinkBizThai/cb23f394-422b-4ec3-b024-e2751f208eb9/scratchpad/con003-review`
Date: 2026-09-01

**This is independent Reviewer evidence only.** It is not author self-evidence, security
review, test verification, integration verification, Product Owner disposition, Gate G0
movement, or merge authorization. This run did not author any file in the package under
review and did not read or write the live working tree at `/Users/bank/ThinkBizThai`.

---

## 1. Commands executed

Toolchain confirmed before every run: `node --version` → `v24.20.0`, `npm --version` →
`11.19.0`, matching the `engines` pin in `package.json`.

| # | Command | Exit | Result |
|---|---|---:|---|
| 1 | `zsh -lc 'node --version'` | 0 | `v24.20.0` |
| 2 | `zsh -lc 'npm --version'` | 0 | `11.19.0` |
| 3 | `zsh -lc 'cd <root> && npm run check'` | 0 | `tests 85 / suites 0 / pass 85 / fail 0 / cancelled 0 / skipped 0 / todo 0` |
| 4 | `zsh -lc 'cd <root> && node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs'` | 0 | `tests 6 / pass 6 / fail 0 / skipped 0 / todo 0` |
| 5 | `zsh -lc 'cd <root> && node scripts/validate-work-package-ownership.mjs work-packages'` | 0 | no output |
| 6 | `node <scratchpad>/ce.mjs` (31 reviewer-authored counterexamples, run on pinned Node 24.20.0 against the shipped `schema.json` files through `test-kits/contracts/json-schema-subset.mjs`) | 0 | results in §4 |

Note on evidence hygiene: the author self-check records `npm run check` as
`tests 70 / pass 70`. At `2649401` it is `85 / 85`. The delta is accumulated suites from
other packages present at this commit, not a regression; skipped and todo are both zero as
the acceptance criterion requires. The self-check figure should be restated against the
commit actually under review.

The counterexample script was written outside the frozen root and imports the repository's
own validator by absolute path. No file inside `contract-catalog/` was modified.

Redaction note: counterexample M9 originally used a literal AWS-shaped access-key id as the
hostile `secret_handles` value. Writing it verbatim into this file made
`node scripts/scan-repository-secrets.mjs` fail at exit 70 —
`potential secret pattern found in: evidence/WP-0A-CON-003/review-contract.md` — which is the
scanner behaving correctly on reviewer evidence. The literal is redacted below and
`npm run check` was re-run to exit 0 with the same 85/85. The probe itself was executed with
the unredacted value.

---

## 2. Item 1 + 2 — per-rule sourcing table

Legend: **Sourced** = the cited task says what the annotation says. **Overstated** = the
task exists and is related, but the annotation asserts more than the task does.
**Mis-cited** = the annotation names a location that does not contain the cited content.
**Declared inference** = the schema or self-check marks it as inferred. **Invented** = no
baseline support and no declaration.

Baseline read: `docs/plans/module-contracts-events-jobs-workstream-th.md` §B (MR-001…MR-006,
lines 200–208), §J (FP-001…FP-006, lines 305–313), §H PT-010 (line 289);
`docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md` §4.1 (line 135),
§4.2 Registry (line 145), §5.1 Contract Freeze Levels (line 184), §5.2 Shared Kernel
Contracts (line 194), §5.5 Contract Artifact Standard (line 246).

### 2.1 CTR-MOD-001 — 11 `x-source`, 2 `x-rule` (count confirmed by grep)

| # | Rule / field | `x-source` as written | Baseline says | Ruling |
|---:|---|---|---|---|
| 1 | `module_key` pattern `^[a-z][a-z0-9-]*$` | "MR-001 rejects a duplicate key; the registry resolves modules by this key." | MR-001 acceptance: "Reject duplicate key, invalid semver, missing permission/cost/data policy". MR-002 output: "register/list/resolve API"; its acceptance is *duplicate capability* resolution. | **Overstated / mis-attached.** A single-document schema cannot reject a duplicate key, so the cited clause does not source the constraint actually shipped (a lowercase-kebab pattern). The pattern *is* in fact supported — DR §4.2 lists `platform-kernel`, `identity-workspace`, `meta-connection` — but that section is not cited. The second clause imports MR-002 language into an MR-001 citation. |
| 2 | `module_id` pattern `^MOD-[0-9]{3}$` | "Decision Register section 5.1 module registry (MOD-000..MOD-140)." | DR **§5.1 is "Contract Freeze Levels"** (Draft/Candidate/Frozen/Integrated/Deprecated). The module registry is **§4.2**, under §4 "Module Ownership Registry v1". | **Mis-cited.** Wrong section. The content exists at §4.2, so this is a citation defect, not a fabrication. Separately the pattern does not encode the registry: `MOD-999` is accepted (§4, M5) although the registry enumerates exactly MOD-000…MOD-140 in steps of ten. The parenthetical "(MOD-000..MOD-140)" therefore claims more than the regex delivers. |
| 3 | `version` semver pattern | "MR-001 rejects an invalid semver." | MR-001 as quoted; DR §5.5: "Version ใช้ Semantic Versioning". | **Sourced but over-narrowed.** The pattern excludes pre-release and build metadata, so `1.0.0-rc.1` — a *valid* semver — is rejected (§4, M3). Neither MR-001 nor §5.5 authorises excluding pre-releases. |
| 4 | `owner_role` enum `A0…A6` | "Decision Register section 5.1 assigns one owner role per module." | §5.1 is Freeze Levels. §4.2 assigns owners; §4.1 states "หนึ่ง Module … มี owner เดียว". §4.2 row MOD-140 reads "A6 with A0 contract". | **Mis-cited**, same wrong section. The substance holds via §4.1/§4.2, except that MOD-140's compound owner cannot be expressed by this single-valued enum. |
| 5 | `capabilities` keyed + versioned | "MR-002 requires deterministic resolution of a duplicate capability, so a capability is keyed and versioned." | MR-002 acceptance: "Duplicate capability resolution deterministic; invalid module ไม่ activate". | **Declared inference** — the "so" marks it. Accurate as an inference. But `capability_key` pattern `^[a-z][a-z0-9.]*$` and `version` as `integer ≥ 1` carry no source; CM-001 (naming/versioning policy) is not cited and DR §5.5 mandates *semantic* versioning, which an integer is not. **Sub-rules invented.** |
| 6 | `dependencies` = `module_key` + `range` | "MR-003 blocks a circular, missing or incompatible dependency with a stable error." | MR-003 acceptance: "Circular/missing/incompatible dependency ถูก block พร้อม stable error". | **Sourced.** Accurate paraphrase. The grammar of `range` is correctly left unconstrained (`minLength: 1`) and named in `freeze_boundary`. |
| 7 | `permissions` | "MR-001 rejects a manifest missing its permission policy." | MR-001 as quoted. | **Sourced but not delivered.** `"permissions": []` is accepted (§4, M2). `minItems: 1` is used on `capabilities` in this same schema, so the omission is not a validator limitation. |
| 8 | `cost_policy` | "MR-001 rejects a manifest missing its cost policy." | MR-001 as quoted. | **Sourced.** Sub-rule `usage_contract` pattern `^CTR-[A-Z]{3}-[0-9]{3}$` is unsourced but consistent with DR §5.2 catalog IDs — a harmless undeclared inference. |
| 9 | `data_policy` | "MR-001 rejects a manifest missing its data policy." | MR-001 as quoted. | **Sourced at field level; enum invented.** `classification` enum is `["synthetic-only","tenant-data","permissioned-data"]`. `synthetic-only` and `permissioned-data` appear in the Decision Register; **`tenant-data` appears nowhere in `docs/` or `scripts/`** (grep, 0 hits). MR-001 says nothing about a classification vocabulary. |
| 10 | `lifecycle` | "MR-005 defines initialize/readiness/drain/shutdown; MR-004 makes activation deny-by-default with a reason." | MR-005 output: "initialize/readiness/drain/shutdown contract". MR-004 acceptance: "deny-by-default; missing secret/scope/entitlement ไม่ activate"; output: "readiness result per capability/scope". | **Overstated on two counts.** (a) MR-005 names four *hooks*; the schema ships six *state labels* (`registered`, `initializing`, `ready`, `draining`, `stopped`, `blocked`). `registered`, `initializing`, `draining`, `stopped`, `blocked` are not words in MR-005; grep finds no `registered`/`draining`/`initializing` state vocabulary in the workstream doc. (b) MR-004 does not mention a *reason*; "with a reason" is an inference (the nearest support is FP-001 "decision includes reason/source" and MR-006 "last error"), and it is not declared as one. |
| 10b | `lifecycle.readiness.missing` enum | (inherits #10) | MR-004 inputs: "secret handles, entitlement, health, permission"; acceptance: "missing secret/**scope**/entitlement ไม่ activate". | **Misaligned with the cited task.** The enum is `["secret_handle","entitlement","permission","health","dependency"]`: it **omits `scope`**, which MR-004's acceptance test names explicitly, and **adds `dependency`**, which MR-004 does not. Neither the addition nor the omission is declared. |
| 11 | `secret_handles` pattern `^secret:[a-z0-9._-]+$` | "PT-010 and MR-004: a manifest sees a scoped REFERENCE only. A literal credential must never appear here." | PT-010 acceptance: "manifest เห็น reference เท่านั้น; logs/events/jobs ไม่พบ secret; revoke ได้ทันที". | **Sourced in substance; `secret:` literal prefix invented.** "Reference only" is verbatim PT-010. The specific token `secret:` and the charset are not in PT-010, MR-004, or CTR-SEC-001 (which is Draft with no artifact in the catalog). The self-check honestly scopes this to a *shape* check only. |
| R1 | `x-rule` — ready ⇒ `readiness.activated: true` | "MR-004 deny-by-default…" | MR-004 as quoted. | **Sourced and enforced.** |
| R2 | `x-rule` — blocked ⇒ `readiness.activated: false` + `missing` present | "MR-004: a blocked module must record what was missing, so support can act without seeing a secret (MR-006)." | MR-004; MR-006 acceptance: "Support เห็น version/health/last error โดยไม่เห็น secret/customer content". | **Sourced but under-enforced.** See §4, M1: `"missing": []` satisfies it. A blocked module that records nothing passes a rule whose text is "must record what was missing". |

### 2.2 CTR-FLG-001 — 9 `x-source`, 4 `x-rule` (count confirmed by grep)

| # | Rule / field | `x-source` as written | Baseline says | Ruling |
|---:|---|---|---|---|
| 1 | `policy_key` pattern `^[a-z][a-z0-9.]*$` | **none** | — | **No `x-source` at all.** Violates the package's own acceptance criterion: "Every rule in both schemas carries an x-source naming the baseline task it comes from; no rule is present without one." A pattern is a rule. |
| 2 | `effect` enum `allow`/`deny` | "FP-001 typed policy decision." | FP-001 output: "typed policy decision contract". | **Sourced.** |
| 3 | `decided_at` `format: date-time` | **none** | — | **No `x-source` at all.** Same acceptance-criterion violation. (FP-005 "ทุก change มี actor/reason/time" would have sourced it.) |
| 4 | `decision_source` (`scope` + `rule`) | "FP-001 requires the decision to include its reason AND its source." | FP-001 acceptance: "default deny; precedence deterministic; decision includes reason/source". | **Sourced.** The `scope` enum matches FP-002's hierarchy exactly. The `rule` enum values each trace: `kill_switch` (FP-002/FP-004), `default_deny` (FP-001), `explicit_allow`/`explicit_deny` (FP-003 "explicit allow/deny ชนะ percentage"), `percentage_bucket` (FP-003). Enum itself carries no separate annotation but is well founded. |
| 5 | `reason_key` pattern `^policy\.[a-z_.]+$` | "FP-001 requires a reason; CTR-ERR-001 uses a stable Thai message key, so the reason is a key, not prose." | FP-001 as quoted; CM-004 "Thai message key policy". **`contract-catalog/shared-kernel/ctr-err-001/schema.json` defines `message_key` as `{"type":"string","minLength":1}` — no pattern, no prefix, no charset.** | **Declared inference, but the inference over-reaches.** Declaring it is the right discipline and the self-check repeats it. However CTR-ERR-001 supports only "the reason is a key", not the `policy.` prefix or the `[a-z_.]` charset — CTR-ERR-001 imposes no shape whatsoever. The pattern portion is **invented on top of a declared inference**, and the annotation reads as though CTR-ERR-001 supplied the shape. It is also loose enough to accept `policy.....` (§4, F11). |
| 6 | `evaluated_scopes` | "FP-002 fixes the precedence order platform -> plan -> workspace -> business -> capability." | FP-002 title is that hierarchy; acceptance: "business override ไม่ข้าม platform kill switch; historical read ยังได้เมื่อปิด write". | **Overstated.** The schema fixes the *membership* of the set, not the *order*. Reverse-ordered and arbitrary-subset arrays are accepted (§4, F3/F4). The annotation says the field "fixes the precedence order"; nothing in the schema does. |
| 7 | `bucket` | "FP-003 stable allocation: a workspace stays in the same bucket." | FP-003 acceptance: "Workspace อยู่ bucket เดิม; explicit allow/deny ชนะ percentage". | **Sourced** for the first clause. The second clause of FP-003 ("explicit allow/deny beats percentage") is neither materialized nor declared anywhere. |
| 8 | `write_disabled` | "FP-002 and FP-004: closing writes must still permit historical read." | FP-002 "historical read ยังได้เมื่อปิด write"; FP-004 "read history ได้". | **Sourced.** |
| 9 | `historical_read_allowed` | "FP-002 'historical read still works when write is closed'." | Same. | **Sourced.** Presented in quotation marks as a translation of the Thai; accurate. |
| 10 | `audit` | "FP-005 every change carries actor, reason and time; a temporary flag carries an expiry and an owner." | FP-005 acceptance: "ทุก change มี actor/reason/time; temporary flag มี expiry/owner". | **Sourced.** Faithful. `actor.kind` enum `user`/`system_actor` traces to TC-005 "typed actors", uncited but harmless. |
| 11 | `temporary` | "FP-005 distinguishes a temporary flag, which must expire and have an owner." | Same. | **Sourced.** |
| R1–R4 | the four `x-rule` if/then constraints | FP-003 / FP-002+FP-004 / FP-002 / FP-005 | as above | **All four sourced.** Enforcement results in §4. |

### 2.3 Summary of §1–2 findings

Mis-citations (wrong location): **2** — `module_id` and `owner_role` both cite "Decision
Register section 5.1 module registry"; §5.1 is Contract Freeze Levels, the registry is §4.2.
The same error is carried into `ctr-mod-001/manifest.json` `source_references`
(`"Decision Register 5.1 module registry"`).

Overstatements: **4** — `module_key` (imports MR-002 into an MR-001 citation), `lifecycle`
(six state labels attributed to four MR-005 hooks; "with a reason" not in MR-004),
`readiness.missing` (drops `scope`, adds `dependency`), `evaluated_scopes` (claims to fix an
order the schema does not constrain).

Invented semantics, by the requested checklist:

| Item | Ruling |
|---|---|
| `module_id` pattern `^MOD-[0-9]{3}$` | **Sourced in substance (DR §4.2), mis-cited to §5.1, and looser than the claim** — accepts MOD-999. |
| `module_key` pattern `^[a-z][a-z0-9-]*$` | **Sourced in fact by DR §4.2 naming, but the cited task (MR-001 duplicate rejection) does not support it.** Undeclared. |
| `capability_key` pattern `^[a-z][a-z0-9.]*$` | **Invented.** No baseline naming rule for capability keys is cited; CM-001 is not referenced. |
| capability `version` as `integer ≥ 1` | **Invented**, and in tension with DR §5.5 "Version ใช้ Semantic Versioning". |
| `secret:` prefix on `secret_handles` | **Invented token on a sourced idea.** PT-010 gives "reference only"; the literal prefix is the Author's. Undeclared. |
| `reason_key` pattern `^policy\.[a-z_.]+$` | **Declared inference — but the declaration is sound only for "it is a key".** CTR-ERR-001's `message_key` carries no pattern, so the `policy.` prefix and charset have no support in the contract cited. The inference is *declared*; its specific content is not. |
| lifecycle state enum | **Partly invented.** `ready`/`draining` map to MR-005 hooks; `registered`, `initializing`, `stopped`, `blocked` are new labels. Undeclared. |
| `decision_source.rule` enum | **Sourced.** All five values trace to FP-001/FP-002/FP-003/FP-004. |
| `data_policy.classification` enum | **Partly invented.** `tenant-data` appears nowhere in `docs/` or `scripts/`. |
| `bucket.percentage` 0–100 | Definitional; acceptable. |
| `cost_policy.usage_contract` pattern | Undeclared inference from DR §5.2 ID format; harmless. |

---

## 3. Item 5 — is the schema-first claim real?

**Yes, and this is the package's strongest result.**

- `grep -rn "CTR-MOD\|ctr-mod\|CTR-FLG\|ctr-flg" test-kits/ scripts/` returns **zero hits**.
  No rule about either contract is asserted in a test predicate. The exact CON-002 defect —
  a rule living in a test while the shipped schema said something weaker — does not recur.
- The conformance suite is generic: it discovers contracts from the catalog directory,
  requires `manifest.schema === "schema.json"`, and validates each fixture against its own
  shipped schema. It contains no per-contract knowledge of MOD or FLG.
- `if`/`then` is genuinely executed. `test-kits/contracts/json-schema-subset.mjs` implements
  `if`/`then`/`else` (line ~"if (schema.if)"), `allOf`, `const`, `enum`, `pattern`,
  `additionalProperties`, `uniqueItems`, `minItems`, and RFC 3339 `format: date-time`, and
  **throws on any unsupported keyword**, so neither schema can appear to constrain something
  the validator ignores. My 31 counterexamples confirm the constraints fire.
- `x-` keywords are explicitly skipped by `assertSchemaSupported`, so every `x-source` and
  `x-rule` is unverified prose. The Author states this. It is correct and it is the reason
  §2 was necessary.

Caveat: schema-first is real, but "every rule is in the schema" is not the same as "the
schema says what the manifest claims". §4 and §5 are where this package falls short.

---

## 4. Item 3 — counterexample results

31 documents constructed by mutating the package's own valid fixtures, validated against the
shipped `schema.json` through the repository's own validator on pinned Node 24.20.0.
"Expected" is the behaviour the manifest/`x-rule` text asserts.

### CTR-MOD-001

| ID | Counterexample | Expected | Actual | |
|---|---|---|---|---|
| M1 | `state: blocked`, `readiness.activated: false`, **`missing: []`** | REJECTED | **ACCEPTED** | ✗ **defect** |
| M2 | `permissions: []` | REJECTED | **ACCEPTED** | ✗ **defect** |
| M3 | `version: "1.0.0-rc.1"` (valid semver) | ACCEPTED | **REJECTED** | ✗ over-strict |
| M4 | `state: ready`, `activated: true`, **`missing: ["health"]`** | REJECTED | **ACCEPTED** | ✗ contradictory doc admitted |
| M5 | `module_id: "MOD-999"` (not in DR §4.2) | REJECTED | **ACCEPTED** | ✗ claim > constraint |
| M6 | two capabilities, same `capability_key`, versions 1 and 2 | REJECTED | ACCEPTED | ok — MR-002, correctly declared untestable |
| M7 | exact duplicate capability object | REJECTED | REJECTED | ok (`uniqueItems`) |
| M8 | module depends on itself (degenerate cycle) | REJECTED | ACCEPTED | ok — MR-003, declared untestable |
| M9 | `secret_handles: ["secret:AKIA<20-char AWS-shaped literal, redacted>"]` | REJECTED | REJECTED | ok (uppercase fails charset) |
| M10 | `secret_handles: ["sk-live-0123456789abcdef"]` | REJECTED | REJECTED | ok |
| M11 | `state: stopped` with `activated: true` | ACCEPTED | ACCEPTED | ok — unconstrained by design |
| M12 | `state: initializing`, no `readiness` | ACCEPTED | ACCEPTED | ok |
| M13 | `metered: false` yet `usage_contract` declared | ACCEPTED | ACCEPTED | ok |
| M14 | `classification: tenant-data`, `tenant_scoped: false`, no retention | ACCEPTED | ACCEPTED | ok — but see §7 |
| M15 | `module_id: MOD-000` with `owner_role: A6` (registry says A0) | ACCEPTED | ACCEPTED | ok — cross-field registry check not claimed |
| M16 | `module_key: meta-connection` with `module_id: MOD-000` | ACCEPTED | ACCEPTED | ok — not claimed |

The two deny-by-default rules named in the acceptance criteria hold **for the case the
shipped fixtures cover** — `invalid-ready-without-activation.json` and
`invalid-blocked-without-missing.json` are both correctly rejected. M1 and M4 are the cases
the fixtures do not cover, and both slip through.

### CTR-FLG-001

| ID | Counterexample | Expected | Actual | |
|---|---|---|---|---|
| F1 | `rule: default_deny` with **`effect: allow`** | REJECTED | **ACCEPTED** | ✗ **defect** |
| F2 | `rule: explicit_deny` with **`effect: allow`** | REJECTED | **ACCEPTED** | ✗ **defect** |
| F3 | `rule: kill_switch`, `scope: platform`, `evaluated_scopes: ["capability"]` | REJECTED | **ACCEPTED** | ✗ platform kill switch that never evaluated platform |
| F4 | `evaluated_scopes: ["capability","business","platform"]` (reverse precedence) | REJECTED | **ACCEPTED** | ✗ **defect vs. `freeze_boundary`** |
| F5 | `write_disabled: true`, `historical_read_allowed` absent | REJECTED | REJECTED | ok |
| F6 | `temporary: true`, audit has `expires_at` but no `owner_role` | REJECTED | REJECTED | ok |
| F7 | `temporary: true`, no `audit` | REJECTED | REJECTED | ok |
| F8 | `rule: percentage_bucket`, no `bucket` | REJECTED | REJECTED | ok |
| F9 | `bucket: {percentage: 0, allocated: true}` with `effect: allow` | ACCEPTED | ACCEPTED | ok — allocation algorithm not claimed |
| F10 | `bucket: {percentage: 25, allocated: false}` with `effect: allow` | ACCEPTED | ACCEPTED | ok — not claimed |
| F11 | `reason_key: "policy....."` | REJECTED | **ACCEPTED** | minor — pattern looser than a "key" |
| F12 | temporary flag whose `expires_at` precedes `changed_at` | ACCEPTED | ACCEPTED | ok — not expressible in this subset |
| F13 | `rule: kill_switch`, `write_disabled: false`, `historical_read_allowed: false` | ACCEPTED | ACCEPTED | ok — FP-004 circuit state not claimed |
| F14 | `reason_key: "policy.leaked_token_sk_live_abc"` | ACCEPTED | ACCEPTED | ok — key is not a secret channel by contract |
| F15 | non-temporary flag carrying an expiry | ACCEPTED | ACCEPTED | ok |

The kill-switch, write-disabled, percentage and temporary-flag rules named in the acceptance
criteria are **correctly enforced** — 4 of 4 fire on the cases their fixtures cover, and
F5–F8 confirm they fire on cases the fixtures do not cover.

### 4.1 Rules that look enforced but are not

1. **`missing` on a blocked module (M1).** `x-rule` says "a blocked module must record what
   was missing". The `then` requires the *key* but places no `minItems` on the array.
   `"missing": []` records nothing and is accepted. `minItems: 1` is used on `capabilities`
   in this very schema and on `evaluated_scopes` in the sibling schema, so this is an
   omission, not a limitation of the validator subset. A reader who sees a fixture named
   `invalid-blocked-without-missing.json` go red reasonably concludes the rule is closed. It
   is not.

2. **`default_deny` / `explicit_deny` may allow (F1, F2).** The schema pairs `rule` with
   `effect` for exactly one of five rule values. `kill_switch ⇒ effect: deny` proves the
   pairing is expressible and cheap. FP-001's acceptance test opens with "default deny", and
   a decision recording `rule: default_deny` with `effect: allow` is self-contradictory on
   its face. Nothing rejects it, and nothing declares the gap.

3. **`evaluated_scopes` precedence (F3, F4).** `ctr-flg-001/manifest.json` `freeze_boundary`
   states the contract "Materializes exactly … the FP-002 precedence platform -> plan ->
   workspace -> business -> capability". It does not. Any order and any non-empty subset of
   the five scopes is accepted, including a platform-scope kill switch that claims platform
   was never evaluated. The `x-source` compounds this by saying the field "fixes the
   precedence order".

4. **Lesser:** `permissions: []` (M2), a `ready` module that also lists what is `missing`
   (M4), `module_id` outside the registry (M5).

---

## 5. Item 4 — is `untestable_by_fixture` honest?

Four claims, ruled individually.

| Claim | Ruling |
|---|---|
| **MR-002** duplicate-capability resolution must be deterministic | **Honest.** M6 confirms the exact shape: two capabilities sharing a key with different versions pass, and no single document could decide which wins. This is a registry property across multiple manifests. The Author correctly did *not* smuggle in a fake single-document proxy. |
| **MR-003** circular / missing / incompatible dependency blocked | **Honest.** M8 (self-dependency, the degenerate cycle) is accepted, and a cross-field comparison of `dependencies[].module_key` against `module_key` is not expressible in this validator subset (no `$data`, no dynamic references). Cycles of length ≥ 2 are inherently multi-manifest. |
| **FP-003** stable allocation — a workspace stays in the same bucket | **Honest.** Stability is a property of repeated evaluation of an allocator, not of one decision document. F9/F10 confirm the schema makes no allocation claim. |
| **FP-002** deterministic precedence across the scope hierarchy | **Partly an excuse.** Evaluator determinism is genuinely untestable by fixture — that half is honest. But the same manifest's `freeze_boundary` simultaneously asserts the FP-002 precedence *is* materialized, and the `evaluated_scopes` `x-source` asserts the field "fixes the precedence order". The document-level half — that `evaluated_scopes` is an in-order prefix of `platform → plan → workspace → business → capability` — **is** expressible in the shipped validator subset, because `enum` compares by `JSON.stringify` and therefore accepts array constants: `"enum": [["platform"], ["platform","plan"], …]`. F4 shows it is not enforced. So `untestable_by_fixture` is being used to cover a property that a fixture *can* demonstrate, while `freeze_boundary` claims that property as delivered. |

Overall: three of four claims are honest and correctly reasoned, and the discipline of
declaring them is a real improvement over CON-002. The FP-002 line is the exception, and it
is worse than a bare omission because it contradicts the `freeze_boundary` sentence sitting
two keys above it in the same file.

---

## 6. Item 6 — catalog invariants

| Check | Method | Result |
|---|---|---|
| `contract-catalog/shared-kernel/index.json` untouched | Not listed in `WP-0A-CON-003.json` `outputs.files`; listed under `ownership.read_only_paths`; `node scripts/validate-work-package-ownership.mjs work-packages` exit 0; file content matches DR §5.2 row-for-row (14 rows, same ids, versions, owners, consumers, statuses, freeze artifacts) | **Confirmed.** Recorded as verified by declaration + content equivalence, not by diff: the frozen extraction carries no `.git`, so no commit-to-commit diff was available to this run. |
| Both contracts still `Draft` | `ctr-mod-001/manifest.json` `"status":"Draft"`; `ctr-flg-001/manifest.json` `"status":"Draft"`; index rows for CTR-MOD-001 and CTR-FLG-001 both `"status":"Draft"` | **Confirmed.** No freeze-level advancement. |
| Index reports 4 Candidate / 10 Draft | Counted programmatically: `{ Candidate: 4, Draft: 10 }`, 14 contracts total. Candidate = TEN, ERR, EVT, JOB. Draft = API, PAG, IDM, USG, SEC, MOD, FLG, AUD, OBS, NTF | **Confirmed.** |
| `npm run check` with skipped and todo both zero | Command 3 | **Confirmed** — 85/85, skipped 0, todo 0, exit 0. |
| No literal credential in any fixture | Read all 15 new fixtures; the only handle is `"secret:meta.page_token"`, an opaque reference; `node scripts/scan-repository-secrets.mjs` runs inside `npm run check` at exit 0 | **Confirmed**, subject to the known weakness of the scanner recorded on WP-0A-A0-002 Security C1. |
| Fixtures validated by the subset validator, not a hand-written predicate | §3 | **Confirmed.** |
| "Every rule carries an `x-source`; no rule is present without one" | grep: 11 `x-source` on MOD, 9 on FLG — counts match the Author's claim exactly | **NOT met.** `policy_key` (with its pattern) and `decided_at` (with its `format`) carry no `x-source`. The *count* is honest; the *criterion* is not satisfied. |

---

## 7. Item 7 — what this package introduces that is new

1. **The `x-source` / `x-rule` annotation convention.** Grep confirms these keywords appear
   on exactly these two of nine catalog schemas. Nothing registers the convention in
   `contract-catalog/README.md`, DR §5.5 Contract Artifact Standard, or any test. The
   validator deliberately ignores `x-` keywords, so the package's central claim — that every
   rule is traceable — rests entirely on prose that no command checks. The Author says so
   plainly, which is the right disclosure; but if the convention is to spread to the other
   seven contracts it needs at minimum a test asserting that every `properties` entry carries
   an `x-source`, which would have caught the two omissions in §6 mechanically.
2. **First contract in the catalog to model a lifecycle state machine** (`lifecycle.state`)
   and the first to model an authorization/policy *decision* rather than an envelope. Both
   introduce vocabulary (§2.3) that other contracts and the composition root will inherit.
3. **First use of `x-rule` on `allOf` branches** as a way to name the baseline task behind a
   conditional. Useful; unverified.
4. **`untestable_by_fixture` is not new** — `ctr-pag-001` already carries it (alongside
   `untestable_by_schema` and `accepted_gaps`). This package reuses it correctly but does not
   use `accepted_gaps`, which would have been the honest home for the M1/F1/F4 gaps.
5. **A `data_policy.classification` vocabulary** partially disjoint from the repository's
   existing `security_privacy.data_classification` vocabulary (`tenant-data` is new and
   unsourced). Two vocabularies for the same concept in one repository is a divergence to
   settle before either freezes.
6. **`module_id` / `owner_role` couple the shared kernel to DR §4.2.** DR §4.2 is currently
   prose in a Thai document with no machine-readable form; the schema encodes only its
   *shape*. If the registry is to be authoritative, it needs a fixture or an enum, not a
   three-digit pattern.

---

## 8. Required changes

Blocking:

1. Correct both `x-source` citations from "Decision Register section 5.1 module registry" to
   §4.2 (Module Ownership Registry v1 → Registry), and the matching entry in
   `ctr-mod-001/manifest.json` `source_references`.
2. Add `"minItems": 1` to `lifecycle.readiness.missing` under the blocked `then`, or amend
   the `x-rule` to state only what is enforced. Add a fixture for the empty-array case.
3. Either enforce the `rule ⇄ effect` pairing for `default_deny` and `explicit_deny` as is
   already done for `kill_switch`, or record the gap in `accepted_gaps` with the reason and
   the owner who resolves it.
4. Resolve the `evaluated_scopes` contradiction: either constrain it to an in-order prefix of
   the FP-002 hierarchy (expressible via `enum` of array constants in this subset) and keep
   the `freeze_boundary` sentence, or strike "Materializes exactly … the FP-002 precedence"
   from `freeze_boundary` and soften the `x-source`. It cannot stay as written in both files.
5. Add `x-source` to `policy_key` and `decided_at`, or drop the acceptance criterion that
   claims universal coverage.

Should fix before freeze:

6. `lifecycle` `x-source`: attribute the six state labels and the required `reason` honestly,
   or mark them a declared inference the way `reason_key` is marked.
7. `readiness.missing` enum: restore `scope` (MR-004 names it) and declare `dependency` as an
   MR-003 inference.
8. Relax the semver pattern to accept pre-release/build, or declare the narrowing.
9. Declare or source: `capability_key` pattern, integer capability `version`, the `secret:`
   prefix, and `tenant-data`.
10. `permissions`: `minItems: 1`, or state that an empty permission list is a deliberate
    "declares no permissions" signal.
11. Restate the self-check's `npm run check` figure against `2649401` (85/85, not 70/70).

---

## 9. Assessment

This is a materially better package than WP-0A-CON-002. The schema-first claim is real and
verifiable: no rule about either contract lives in a test, the validator genuinely executes
`if`/`then`, and the eight conditional behaviours the acceptance criteria name are all
present in the schema — six of them enforced correctly under adversarial probing. The
`untestable_by_fixture` discipline is largely honest. Fifteen of the twenty `x-source`
annotations survive a line-by-line reading against the Thai baseline.

It does not pass. Two annotations cite a Decision Register section that contains different
content; the FLG `freeze_boundary` claims a property the schema does not have and its own
`untestable_by_fixture` disclaims two keys later; a rule whose text is "must record what was
missing" accepts a document that records nothing; and the package's own acceptance criterion
on universal `x-source` coverage is unmet by two fields. These are the same family of defect
as CON-002 — the artifact claiming more than the executable constraint delivers — at much
lower severity and much lower count, and every one of them is a text or one-keyword fix.

VERDICT: changes_requested
