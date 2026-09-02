# WP-0A-CON-002 — Independent Security/Privacy Review

- Work package: `WP-0A-CON-002` — Shared-kernel envelope contracts and catalog reference integrity
- Reviewer run id: `/claude/a1_bastion` (Security/Privacy, conditional reviewer)
- Author run id: `/claude/a0_atlas` — **not this run.** This run authored no part of the change under review.
- Branch: `agent/claude/WP-0A-CON-002-envelope-contracts`
- Head reviewed: `106f91c4fb5663761e9f3a232e831aca74970456`
- Pre-fix parent used for the test-first reproduction: `4e1d6e5`
- Toolchain: Node `v24.20.0` / npm `11.19.0` (login shell), matching `package.json` `engines`
- Date: 2026-08-31

**This is Security/Privacy evidence only.** It is not Reviewer approval, not Tester
verification, not Integration Owner verification, not Product Owner disposition, not a
merge authorization, and not Gate G0 approval. It does not dispose of RFC-2026-004 and
does not countersign the `x-amended-by` acknowledgement pending from `/root/r0_steward`.

---

## 1. Commands executed and real exit codes

| # | Command | Exit |
|---|---|---|
| C1 | `git show --stat 106f91c` | 0 |
| C2 | `git status --short` (before any write by this run) | 0 |
| C3 | `zsh -lc 'cd /Users/bank/ThinkBizThai && npm run check'` — **59 tests, 59 pass, 0 fail** | **0** |
| C4 | `zsh -lc 'node scripts/scan-repository-secrets.mjs'` | **0** |
| C5 | `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` on a scratch export of `4e1d6e5` + this commit's guard file | **1** (tests 4 / pass 3 / fail 1) |
| C6 | `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` on a scratch copy with four deliberate bypasses injected | **0** (tests 4 / pass 4 / fail 0) — see §6 |
| C7 | `git log --oneline -3 -- .github/` → last touch `3c8e025`, not this commit | 0 |
| C8 | Regex probes of the `^(?!https?://)` and `^[A-Za-z0-9_-]+$` patterns under `node -e` | 0 |
| C9 | `printf '' \| shasum -a 256` and `printf 'a' \| shasum -a 256` | 0 |
| C10 | `grep -rniE 'openai\|anthropic\|claude\|gpt\|...\|api[_-]?key'` over the three new contract directories → **no match** | 1 (no match) |

C5 is the material one. I independently reproduced the Author's test-first claim: exported
the pre-fix tree `4e1d6e5`, dropped in only the new guard file, and observed it fail,
naming both offending files and their resolved paths verbatim:

```
contract-catalog/shared-kernel/ctr-evt-001/schema.json $.properties.tenant_context.$ref -> ../../ctr-ten-001/schema.json -> contract-catalog/ctr-ten-001/schema.json
contract-catalog/shared-kernel/ctr-job-001/schema.json $.properties.tenant_context.$ref -> ../../ctr-ten-001/schema.json -> contract-catalog/ctr-ten-001/schema.json
```

The guard genuinely predates the fix and genuinely detects the defect class it claims. That
part of the package is honest.

---

## 2. Item 1 — What the broken `$ref` actually put at risk

### The defect

Both `CTR-EVT-001` (Domain Event Envelope) and `CTR-JOB-001` (Background Job Envelope)
declared `"tenant_context": {"$ref": "../../ctr-ten-001/schema.json"}`. From
`contract-catalog/shared-kernel/<contract>/`, `../../` is `contract-catalog/`, so both
resolved to `contract-catalog/ctr-ten-001/schema.json`. `CTR-TEN-001` lives at
`contract-catalog/shared-kernel/ctr-ten-001/`. The target did not exist. Corrected to
`../ctr-ten-001/schema.json`.

### Does any code path resolve these `$ref`s at runtime today?

**No.** I searched the whole tree and confirmed all of the following:

- `package.json` declares **zero dependencies** and there is no `node_modules`. No `ajv`,
  no `@apidevtools/json-schema-ref-parser`, no validator of any kind is installed or
  declared.
- `grep -rn 'ajv|Ajv|compileSchema|addSchema|resolveRef|\$RefParser'` over the repository
  (excluding `.git`) returns **nothing**.
- Only five files in the repository contain the string `"$ref"`: the four catalog schemas
  and RFC-2026-004. Nothing reads them as schemas.
- The repository has **no application source tree at all** — the top-level directories are
  `architecture/ contract-catalog/ docs/ evidence/ handoffs/ ownership/ runbooks/ scripts/
  test-kits/ work-packages/`. There is no service, no API layer, no job runner.
- The only consumers of `contract-catalog/**` are `test-kits/contracts/*.test.mjs`, and
  every one of them reads the schemas with `JSON.parse` and validates fixtures with
  **hand-written JavaScript predicates**. Not one line resolves a `$ref`.

### Ruling — stated precisely, neither inflated nor minimised

**The broken `$ref` was a latent tenant-isolation hole, not an active one.**

- **What it did NOT put at risk.** No tenant data was exposed. No event or job was
  processed without a tenant context. No production system, no database, no RLS policy, no
  provider, no customer record was affected — because no such system exists on this branch
  and nothing resolves the reference. Any characterisation of this as a live tenant leak,
  a breach, or an exploitable condition would be false. There is nothing to exploit.
- **What it DID put at risk.** The catalog is a *specification artifact whose entire
  purpose is to be consumed later*. `CTR-EVT-001` and `CTR-JOB-001` are the envelopes that
  the baseline requires to carry `tenant_context` on **every domain event and every
  background job**. As committed, that requirement pointed at nothing. The first moment
  real JSON Schema validation was introduced — the first `ajv.compile()` in a BFF, a job
  runner, or a contract test kit — one of two things happens: the validator throws on an
  unresolvable `$ref` (fail-closed, noisy, cheap), or a permissive/lenient resolver
  silently treats the subschema as absent and **every event and job envelope validates
  with an arbitrary or missing `tenant_context`** (fail-open, silent, and precisely a
  cross-tenant admission hole). Which of the two you get depends on a resolver
  configuration nobody has chosen yet. A latent defect whose failure mode is decided by an
  unmade configuration decision is not a trivial defect.
- **The compounding factor is the real finding.** The defect survived four independent
  roles not because they were careless but because the only test that touched these files
  *structurally could not see it* (hand-written predicates, no `$ref` resolution), and
  until WP-0A-A0-002 that test file was executed by no CI run at all. Every role got a
  truthful green from a test that was blind and not running. The Author's commit message
  and RFC state this accurately.

**Correct severity: latent, high-consequence, low-current-exposure. Fixing it before any
consumer exists is the right time to fix it. Fixing it does not entitle the package to be
described as closing a live tenant-isolation hole, and to the Author's credit, neither the
RFC nor the commit message makes that claim.**

---

## 3. Item 2 — Does the corrected reference point at a schema that encodes §3.1?

I read `docs/plans/module-contracts-events-jobs-workstream-th.md` §3.1 (Tenant Context v1)
and compared it field-by-field against
`contract-catalog/shared-kernel/ctr-ten-001/schema.json`, the file the corrected `$ref`
now resolves to.

| §3.1 requirement | CTR-TEN-001 | Verdict |
|---|---|---|
| `workspace_id` — Required, tenant root | `required`, `string`, `minLength: 1` | Encoded |
| `actor` — Required, `user_id` or typed `system_actor`; **ห้ามเป็น string อิสระ** (must not be a free string) | `required`, `object`, `additionalProperties: false`, `required: [kind, id]`, `kind: {enum: [user, system_actor]}` | **Encoded, and correctly.** The prohibition on a free string is enforced structurally: `actor` cannot be a string, and `kind` is a closed enum. |
| `request_id` — Required | `required`, `string`, `minLength: 1` | Encoded |
| `correlation_id` — Required | `required`, `string`, `minLength: 1` | Encoded |
| `locale` — Required, Phase 1 default `th-TH` | `{"const": "th-TH"}` | Encoded (as a hard const, stricter than "default") |
| `timezone` — Required, Phase 1 default `Asia/Bangkok` | `{"const": "Asia/Bangkok"}` | Encoded (same) |
| `causation_id` — Conditional | optional `string` | Present, unconditioned |
| `business_profile_id` — Conditional (required for business-specific data) | optional `string` | **Present but the condition is not encoded** |
| `page_context_profile_id` — Conditional (required when scoping to a Facebook Page / Instagram account) | optional `string` | **Present but the condition is not encoded** |

Additionally `additionalProperties: false` at the object root, which is the right default
for a trust-boundary object.

**Ruling on item 2: confirmed.** The corrected `$ref` resolves to a schema that does encode
every field §3.1 marks Required, including the typed-`actor` prohibition on a free string,
and the locale/timezone constants. The correction is real and it points somewhere useful.

**Two honest qualifications, neither of which is this package's defect:**

1. **The trust boundary itself is not encoded, and cannot be.** §3.1 closes with
   `Context ที่รับจาก Client เชื่อถือไม่ได้ ต้อง resolve และ authorize ฝั่ง Server ก่อนสร้าง Trusted Context`
   — context received from the client is untrusted and must be server-resolved and
   authorized before a Trusted Context is constructed. A JSON Schema can describe the
   *shape* of a trusted context; it cannot attest that the instance in hand was
   server-resolved rather than client-supplied. `CTR-TEN-001` is titled "Trusted Tenant
   Context" but a client-forged object of identical shape validates identically. **The
   trust boundary is a runtime control that does not yet exist anywhere in this
   repository.** Nothing in this package claims otherwise, and I am not treating it as a
   finding against WP-0A-CON-002 — but it must not be lost, because the schema's title
   invites exactly the wrong assumption.
2. `business_profile_id` and `page_context_profile_id` are marked **Conditional** in §3.1
   with concrete conditions ("required when restricting to a Facebook Page / Instagram
   account"), and `CTR-TEN-001` expresses them as plain optionals with no `if`/`then`.
   Sub-tenant scoping to a specific Page/IG account is therefore not enforceable from the
   contract. `CTR-TEN-001` is a pre-existing Candidate owned by WP-0A-CON-001 and is
   **not modified by this package**; I record this for its freeze review, not against
   WP-0A-CON-002.

---

## 4. Item 3 — Leakage surface of the three new contracts

### 4.1 CTR-API-001 — the unconstrained success `data` is a real leakage hole in the contract

The two constraints the package points to are genuine and I verified both:

- `error` composes `CTR-ERR-001`, whose `details` is `{"type":"object","maxProperties":0}`
  — structurally empty, cannot carry a provider payload.
- `accepted.status_ref` and `accepted.deep_link_ref` carry
  `"pattern": "^(?!https?://).+"`.

**They are not sufficient.** Three findings, in descending severity.

**S-API-1 (the one asked about): `data` on a success envelope is `{"type": "object"}` and
nothing else.** No `additionalProperties: false`, no `maxProperties`, no property
declarations, no redaction obligation. The following is a fully schema-valid `CTR-API-001`
success envelope:

```json
{"kind":"success","api_version":1,"request_id":"...","correlation_id":"...",
 "tenant_context":{...},
 "data":{"provider_error":"openai.RateLimitError: ...","model":"gpt-4o-2024-08-06",
         "stack":"at generate (/app/src/provider.js:42)","upstream_key":"sk-..."}}
```

The test predicate is no stricter: `validApiEnvelope` checks only
`typeof f.data === 'object'`. **So the baseline rule
`ห้ามส่ง Provider error, stack trace, token, model ID` is enforced on the error branch and
enforced not at all on the success branch** — and the success branch is the branch that
carries generated AI content, i.e. exactly the payload most likely to have a provider
response object attached to it during implementation.

This is not an oversight of idiom. The Author demonstrably knows the placeholder pattern:
`CTR-EVT-001.payload` is `{"type":"object","maxProperties":0}` and `CTR-ERR-001.details`
is `{"type":"object","maxProperties":0}`. The same discipline was available for `data` and
was not applied, and neither the schema nor the `freeze_boundary` says why. The
`freeze_boundary` enumerates what is deliberately not inferred (auth rules, API-006,
API-004, HTTP status mapping) and **does not mention that `data` is unconstrained**.
That silence is the defect: a reader of the manifest would reasonably conclude the
no-internal-detail-leak rule is fully materialized, and it is not.

**S-API-2: the `^(?!https?://)` constraint is a deny-list, and it leaks.** I probed it
(C8). Every one of these passes `status_ref` / `deep_link_ref`:

| Value | Passes | Why it matters |
|---|---|---|
| `HTTPS://evil.example/exfil` | yes | JS regex is case-sensitive; URI schemes are case-**in**sensitive per RFC 3986. Browsers and HTTP clients treat this as an ordinary HTTPS URL. |
| `//evil.example/leak` | yes | Protocol-relative; resolves to `https://evil.example/leak` in any browser. |
| `javascript:alert(1)` | yes | `deep_link_ref` is by name a link a UI renders and a user clicks. This is a stored-XSS sink at contract level. |
| `data:text/html;base64,PHNjcmlwdD4=` | yes | Same sink. |
| `file:///etc/passwd` | yes | |
| `ftp://evil.example` | yes | |
| `\\evil.example\share` | yes | UNC / SMB credential-capture path. |
| `../../../etc/passwd` | yes | Traversal, if the ref is ever used to locate a stored object. |
| ` https://evil.example` (leading space) | yes | `^` anchors before the space; most consumers trim. |

Only exact-lowercase `https://…` / `http://…` at position 0 is rejected. The negative
fixture `invalid-public-status-ref.json` uses lowercase `https://`, so **the test suite
never exercises a single one of the bypasses above.** The same weak predicate is
duplicated in the test at `isPrivateRef = (v) => !/^https?:\/\//.test(v)`, so schema and
test are wrong in the same direction and cannot catch each other.

**S-API-3 (inherited, recorded for CTR-ERR-001's freeze, not charged to this package):**
`CTR-ERR-001.code` and `.message_key` are `{"type":"string","minLength":1}` with no
pattern. A stack trace fits in `code`. `field_errors[].field` and `.code` are likewise
unconstrained free strings. Emptying `details` closes one door and leaves three open.
`CTR-IDM-001` in this very package constrains `scope.operation` with
`^[a-z0-9]+(\.[a-z0-9]+)+$`, proving the idiom was at hand. Because `CTR-API-001` newly
`composes` `CTR-ERR-001`, the composed envelope inherits this surface and it should be
closed before either contract freezes.

**Ruling on CTR-API-001: the stated constraints are necessary and materially insufficient.
`data` is a genuine leakage hole in the contract itself, and `status_ref`/`deep_link_ref`
are protected by a deny-list that is trivially and accidentally bypassable.**

### 4.2 CTR-PAG-001 — the "tamper-safe" claim is not enforced; only a charset is

The manifest `freeze_boundary` states: *"Materializes exactly the API-003 acceptance rule:
… an opaque tamper-safe cursor. The cursor's encoding, signing algorithm, and key
management are deliberately NOT specified here; **only opacity and the absence of a
client-decodable offset are contractual.**"*

The whole of what schema and test enforce is:

```
"cursor":      {"type":"string","minLength":1,"pattern":"^[A-Za-z0-9_-]+$"}
"next_cursor": {"type":["string","null"],"minLength":1,"pattern":"^[A-Za-z0-9_-]+$"}
const OPAQUE = /^[A-Za-z0-9_-]+$/;
```

That is the base64url character set. **There is no integrity check, no MAC, no signature,
no length constraint, no structural constraint whatsoever.** I verified this concretely
(C8):

- The **valid** fixture cursor `Y3Vyc29yX3N5bnRoZXRpY18wMDAx` base64-decodes to
  `cursor_synthetic_0001`. It is fully client-decodable.
- `Buffer.from("offset=40&limit=20").toString("base64url")` →
  `b2Zmc2V0PTQwJmxpbWl0PTIw` → **passes `OPAQUE`.**
- `Buffer.from("ws_OTHER_TENANT|created_at=2020-01-01|id=0").toString("base64url")` →
  `d3NfT1RIRVJfVEVOQU5UfGNyZWF0ZWRfYXQ9MjAyMC0wMS0wMXxpZD0w` → **passes `OPAQUE`.**

The negative fixture `invalid-decodable-offset-cursor.json` (`"offset=40&limit=20"`) is
rejected **only because `=` and `&` are outside the charset** — not because it is
decodable. Base64 the identical string and the contract accepts it. So the manifest's
claim that "the absence of a client-decodable offset [is] contractual" is **false as
written**: the contract detects an offset spelled in plaintext and accepts the same offset
spelled in base64. The test named
`'a cursor that reveals a decodable offset is rejected as not opaque'` asserts something
weaker than its own name.

**Can a client forge a cursor and page across a tenant boundary?** From the contract alone:
**yes, nothing prevents it.** Whether it actually happens depends entirely on an
unspecified server implementation. Two outcomes are possible and the contract does not
choose between them:

- The server re-derives `workspace_id` from the Trusted Tenant Context and uses the cursor
  only for the intra-tenant keyset position. Then a forged cursor yields wrong-page /
  skipped-item behaviour within the caller's own tenant — an integrity bug, not a
  cross-tenant read.
- The server trusts any field carried inside the cursor — the ordinary reason to put a
  tenant or shard key in a cursor at all. Then a forged cursor is a **direct cross-tenant
  enumeration primitive**, and `page_size: 100` makes it an efficient one.

**Ruling on CTR-PAG-001: as written it is NOT safe to build on, and the specific reason is
the manifest wording, not the schema.** A schema that enforces only a charset is a defensible
Draft. A manifest that tells every downstream implementer the cursor is "tamper-safe" and
that offset-opacity "is contractual", while enforcing neither, is worse than silence — an
implementer who reads the freeze boundary in good faith and skips signing because "the
contract handles opacity" has been actively misled by the artifact. Either the integrity
property becomes contractual, or the claim must be withdrawn from the manifest **now**,
while the contract is still Draft and cheap to correct.

### 4.3 CTR-IDM-001 — `result_ref` is protected by a deny-list and is inadequate

`"result_ref": {"type":"string","minLength":1,"pattern":"^(?!https?://).+"}`

Verified by probe (C8) — every one of these is a valid `result_ref`:

`file:///etc/passwd` · `data:text/html;base64,PHNjcmlwdD4=` · `//evil.example/leak` ·
`../../../etc/passwd` · `javascript:alert(1)` · `HTTPS://evil.example/exfil` ·
`HtTp://evil.example` · `ftp://evil.example` · `\\evil.example\share` ·
` https://evil.example`

**Ruling: the constraint is inadequate.** It expresses "not one specific spelling of one
specific pair of schemes" when the intent is "an internal, dereferenceable-by-us storage
reference". The correct form for a security control is an **allow-list**, not a deny-list —
e.g. `^(result|blob|s3|job):[A-Za-z0-9._\-\/]+$`, matching the shape the valid fixtures
already use (`result:content_synthetic_0001`, `job:job_synthetic_0001/status`,
`app:/content/job_synthetic_0001`). The fixtures already demonstrate the right vocabulary;
the pattern simply does not require it. Path traversal in particular (`../../../…`) is
fully unconstrained, which matters the moment `result_ref` is used to locate a stored
object — and `CONTRIBUTING_AGENTS.md` explicitly treats user-supplied-prefix object
operations as a stop-the-line class.

**The identical weakness is in `CTR-JOB-001.input_ref` and `.result_ref`**, expressed as
`"not": {"pattern": "^https?://"}` — same case-sensitivity, same scheme gaps. Those two
are pre-existing WP-0A-CON-001 fields that this package touched (for the `$ref`) but did
not change; I record them so the fix is made once, across all five fields, rather than
three times.

### 4.4 Cross-cutting: schema and test enforce different contracts

The shipped artifact a downstream module will consume is `schema.json`. The thing actually
enforced in CI is a hand-written JS predicate. **Nothing checks that the two agree**, and
they already disagree:

| Case | `schema.json` says | Test predicate says |
|---|---|---|
| `invalid-unstable-sort-without-tiebreaker.json` (single-key `sort`) | **valid** — `sort` is `{"minItems": 1}` | **invalid** — `validPage` requires `f.sort.length >= 2` |
| A base64 cursor encoding an offset | valid | valid (charset only) — but the test's *name* claims otherwise |

A fixture the package labels `invalid-` is accepted by the published schema. This is the
same structural blindness that produced the original `$ref` defect — the schema is not the
thing under test — and it is not closed by this package. It is the reason every finding
above must be fixed in **both** `schema.json` and the predicate, or the divergence will
just reappear.

---

## 5. Item 4 — Secret scan and independent fixture inspection

**`node scripts/scan-repository-secrets.mjs` → exit code `0`.**

**I do not treat that exit code as evidence, and neither should the Integration Owner.** I
demonstrated in my WP-0A-A0-002 review that this scanner is materially weak, and I
re-confirmed its implementation here: it is **five regexes** — PEM private-key header,
`sk_live/sk_test_`, `whsec_`, `AKIA…`, `gh[pousr]_…`. It would not detect an OpenAI
`sk-…` key, an Anthropic `sk-ant-…` key, a Google `AIza…` key, a JWT, a bearer token, a
password, a database connection string, an OAuth refresh token, a private hostname, or any
PII in any form. Its exit code is roughly uninformative for these fixtures. **The actual
control here is the manual inspection below.**

**Independent inspection — I read all 19 new fixtures in full, byte for byte.**

- **Identifiers.** Every value is synthetic and self-labelling: `ws_synthetic_0001`,
  `usr_synthetic_0001`, `req_synthetic_0001`, `cor_synthetic_0001`, `job_synthetic_0001/2`,
  `idem_synthetic_0001`–`0006`, `content_synthetic_0001`, `cursor_synthetic_0001/2`. No
  UUID, no ULID, no value with the shape of a real identifier.
- **Keys / tokens / passwords / credentials.** None. `grep -rniE
  'openai|anthropic|claude|gpt|gemini|azure|aws|stripe|facebook|instagram|meta|sk-|bearer|token|password|passwd|secret|api[_-]?key'`
  over all three new contract directories → **no match**.
- **Real provider identifiers or model IDs.** None. The one provider-flavoured value is
  `"code": "ai.provider.unavailable"` / `"message_key": "error.ai.provider.unavailable"` —
  a generic taxonomy code naming no vendor and no model, which is exactly what the baseline
  rule `ห้ามส่ง … model ID` requires. Correct.
- **Private URLs / hostnames.** The only hostnames present are `api.example.invalid` and
  `cdn.example.invalid`, both in *negative* fixtures whose purpose is to be rejected.
  `.invalid` is the RFC 2606 reserved TLD guaranteed never to resolve — the right choice,
  and better than `example.com`. `json-schema.org` appears only as the `$schema` meta-URI
  and is never fetched (nothing in this repository resolves schemas — §2).
- **PII.** None. No name, email, phone, address, Thai national ID, business registration
  number, or free-text content. Every content-bearing field is either `{}` or `[]`:
  `data: {}`, `details: {}`, `filter: {}`, `items: []`. The fixtures carry **zero** payload
  bytes.
- **Timestamps.** `2026-08-31T10:00:00Z` and near neighbours — round synthetic values.

**The `sha256:` value — confirmed not a real hash of anything meaningful.** Every fixture
uses `payload_hash: "sha256:" + "a"×64`. This is a well-formed 64-char lowercase hex string
that satisfies the schema pattern `^sha256:[0-9a-f]{64}$` and is manifestly a placeholder.
For reference (C9): `sha256("")` = `e3b0c442…b855`, `sha256("a")` = `ca978112…48bb` —
neither is a run of `a`. The probability that a genuine SHA-256 digest equals 64 repeated
`a` characters is 2⁻²⁵⁶. It is not the digest of any input, it discloses nothing about any
payload, and it cannot be reversed into one. **This is the correct way to fixture a hash
field.** Two notes: it is *deliberately* constant across `valid-in-progress` and
`valid-completed-replay`, which is the point — the replay test asserts same key + same
payload hash returns the stored result — but it is also identical in
`invalid-scope-missing-workspace` and `invalid-completed-without-result-ref`, so **no
fixture in the set exercises a payload-hash *mismatch***, which is the actual ID-001
conflict rule the manifest claims to materialize. That is a test-coverage gap for the
Tester (`/claude/q0_sentinel`), not a leakage finding.

**Ruling on item 4: no secret, credential, token, private URL, real provider identifier, or
PII in any added fixture. The `sha256:` placeholder is confirmed synthetic and
information-free. `data_classification: synthetic-only` in the manifest is accurate.**

---

## 6. Item 5 — Prohibited-change surface

| Check | Result |
|---|---|
| Network call introduced | **None.** No dependency, no `fetch`/`http`/`https`/`net` import anywhere in the change. Both new test files import only `node:assert/strict`, `node:fs/promises`, `node:path`, `node:test`. |
| Credential or secret introduced | **None.** `security_privacy.secrets_required: false`; verified by inspection (§5). |
| Migration | **None.** No `db/` or `migrations/` directory exists; both are in `forbidden_paths`; `migration_reservations: []`. |
| RLS change | **None.** No SQL, no policy, no database artifact in the diff. |
| Production config | **None.** No `.env*`, no deployment manifest, no runtime configuration. |
| `package.json` / `package-lock.json` | **Untouched.** Neither appears in the 33-file diff; both are in `read_only_paths`. |
| `.github/**` | **Untouched.** Not in the diff; `git log -- .github/` shows last modification at `3c8e025`, three commits before the branch point. `read_only_paths` lists `.github/**`. Confirmed. |
| `contract-catalog/shared-kernel/index.json` | **Untouched**, and a test asserts the counts stay 4 Candidate / 10 Draft. Materializing a Draft did not promote it. Confirmed. |
| Freeze-level movement | **None.** All three new contracts are `status: "Draft"`, asserted by test. |
| Diff scope | 33 files. All within `writable_paths` or the two declared `authorized_cross_package_amendments`, **with one exception below.** |

**Observation O-1 (scope hygiene, not a security violation).**
`.agents/capability-profiles/cc-r0-steward.json` is committed in `106f91c` but is **not** in
WP-0A-CON-002's `writable_paths` or `outputs.files`. It is a declared output of
**WP-0A-A0-002** (its `writable_paths` and `outputs.files` both list it), authored by a
different run (`/claude/r0_steward`). So it is not an undeclared or unowned file — it is a
*different package's* artifact riding in this package's commit. The ownership validator
cannot see this: it validates only declared `outputs.files` against declared path lists and
never inspects the actual diff (confirmed by reading
`scripts/validate-work-package-ownership.mjs`). I read the file: it contains no secret,
declares `can_access_external_secrets: false`, and its content is a conservative,
accurately-scoped role self-declaration. **No security impact. Flagged for the Integration
Owner as commit hygiene** — a cross-package artifact in a package commit weakens the
revert story that RFC-2026-004 relies on ("reverting restores the two broken references
exactly and removes the three Draft contract directories" — it would also remove an
unrelated package's capability profile).

**Observation O-2.** `handoffs/WP-0A-CON-002-author-handoff.json` is declared in
`outputs.files` but does not exist on disk. Consistent with the accepted forward-declaration
precedent recorded in `evidence/WP-0A-A0-002/review-contract-remediation.md` (R7). Not a
security finding; noted so it is not lost before `done`.

**Observation O-3 (working-tree state, disclosed for integrity).** When this run began,
`git status --short` already showed ` M work-packages/WP-0A-A0-002.json` — a single
pre-existing uncommitted line changing that package's `status` from `backlog` to
`in_review`. **This modification is not mine, predates this run, and belongs to
WP-0A-A0-002.** I did not create, revert, stage, or touch it. It is disclosed here so the
Integration Owner is not misled by §8.

**Ruling on item 5: confirmed. No network call, credential, migration, RLS change,
production config, or lockfile change. `.github/` untouched.**

---

## 7. Item 6 — Is the reference-integrity guard a security control, and can it be bypassed?

**Is it a security control?** **Yes, in intent and in part.** It converts a
tenant-isolation-relevant defect class from a review judgement into a CI failure, and it
demonstrably detects the real defect (C5). Turning "someone must notice" into "the build
goes red" is a genuine control, and it is the most valuable thing in this package.

**Can it be bypassed to reintroduce a broken tenant-context reference?** **Yes — four
ways, all verified empirically.** I copied the tree to a scratch directory, injected four
changes, and ran the guard (C6): **4 tests, 4 pass, 0 fail.** Every one of these slips past:

1. **The guard checks that a `$ref` target *exists*, not that it is the *correct* target.**
   I rewrote `CTR-EVT-001.properties.tenant_context` to
   `{"$ref": "../ctr-err-001/schema.json"}` — pointing the tenant-context slot of every
   domain event at the *error* schema. The file exists, so **the guard passes.** This is
   the most serious limitation: **nothing anywhere asserts that
   `CTR-EVT-001.tenant_context` and `CTR-JOB-001.tenant_context` resolve to `CTR-TEN-001`
   specifically.** The guard protects against a dangling path; it does not protect the
   tenant-isolation property it was created to protect. A subsequent refactor, a
   copy-paste, or a bad merge that repoints `tenant_context` at any other existing file is
   invisible to it — and *that* variant is a silently wrong schema rather than a loudly
   broken one, i.e. strictly worse than the defect the guard was built for.
2. **`CATALOG` is hard-coded to `contract-catalog/shared-kernel`.** I added
   `contract-catalog/modules/ctr-mod-001/schema.json` with a dangling
   `tenant_context` `$ref`. **Guard passes.** The first bounded-context or module catalog
   root added outside `shared-kernel/` is entirely unguarded, and the module contracts are
   precisely the packages that will consume the shared kernel next.
3. **Only files named exactly `schema.json`, exactly one level deep, are scanned.** I added
   `contract-catalog/shared-kernel/ctr-evt-001/parts/extra.json` containing
   `{"$ref": "../../../../../etc/passwd"}`. **Guard passes.** Any split or nested schema
   file is unscanned.
4. **`manifest.json` is scanned for declared *file paths* but never for `$ref`s.** I
   injected a `$ref` into a manifest. **Guard passes.**

Two further limitations, neither a bypass:

- The guard cannot handle the standard JSON Pointer form `path/schema.json#/properties/x` —
  it would `join()` the fragment into the filename and report a false failure. That is
  **fail-closed** and therefore acceptable, but it means the catalog cannot adopt pointer
  refs without amending the guard.
- A remote `$ref` (`"$ref": "https://evil.example/schema.json"`) *is* caught, by the
  existence test rather than the escape test. Fail-closed. Good.

**Ruling on item 6: the guard is a real and worthwhile security control that is narrower
than its framing implies.** RFC-2026-004 states "the guard in Decision 1 makes any
recurrence a CI failure rather than a review judgement." Read strictly — recurrence of *a
dangling path in a top-level `shared-kernel` `schema.json`* — that is true. Read as a
reader naturally will — *any recurrence of a broken tenant-context reference* — it is
**not** true, and bypass (1) is the counterexample: the tenant-context reference can be
repointed at the wrong schema and CI stays green. The claim in the RFC should be narrowed
to what the guard actually enforces, and the target-identity assertion should be added.

---

## 8. Change confirmation

At the **start** of this run:

```
$ git status --short
 M work-packages/WP-0A-A0-002.json      <- pre-existing, NOT mine (see O-3)
```

At the **end** of this run:

```
$ git status --short
?? evidence/WP-0A-CON-002/review-contract.md    <- NOT mine; appeared during this run
?? evidence/WP-0A-CON-002/review-security.md    <- this file, my only change
```

**This run wrote exactly one file: `evidence/WP-0A-CON-002/review-security.md`.** It
committed, pushed, staged, and reverted nothing. Scratch working copies used for C5 and C6
were created under the session scratchpad, outside the repository.

**Concurrency disclosure.** The working tree changed underneath this run in two ways I did
not cause and cannot account for: the pre-existing ` M work-packages/WP-0A-A0-002.json`
modification noted in O-3 disappeared, and `evidence/WP-0A-CON-002/review-contract.md` — the
independent Contract Reviewer's deliverable, not mine — appeared. Another run is evidently
operating on this working tree concurrently. All findings in this review were derived from
commit `106f91c` and from scratch exports of `106f91c` / `4e1d6e5`, not from the mutable
working tree, so none of them is affected. I record it because concurrent unattributed
writes to a shared working tree are themselves a change-control weakness the Integration
Owner should be aware of when assembling evidence, and because a reader comparing
`git status` at different moments would otherwise be misled.

---

## 9. Rulings summary

| # | Item | Ruling |
|---|---|---|
| 1 | What the broken `$ref` risked | **Latent, not active.** Nothing resolves `$ref`s at runtime — zero dependencies, no validator, no application source. No tenant data was exposed. It would have become live at the first real schema validation, where a lenient resolver yields silent fail-open admission of tenant-less events and jobs. High-consequence, low-current-exposure, correctly fixed now. |
| 2 | Corrected reference points at a schema encoding §3.1 | **Confirmed.** All §3.1 Required fields encoded, including typed `actor` (not a free string) and the `th-TH`/`Asia/Bangkok` consts. Qualified: the server-resolved **trust boundary** is not and cannot be encoded in a schema, and the two Conditional profile IDs are unconditioned (pre-existing CTR-TEN-001, not this package). |
| 3a | CTR-API-001 leakage | **Insufficient.** `data` is `{"type":"object"}` — unconstrained, and a genuine contract-level leakage hole for provider errors / stack traces / model IDs on the success branch, undisclosed in the freeze boundary. `status_ref`/`deep_link_ref` use a deny-list bypassed by `HTTPS://`, `//host`, `javascript:`, `data:`, `file://`, leading whitespace. |
| 3b | CTR-PAG-001 cursor tamper-safety | **Not enforced — charset only.** No MAC, no signature, no integrity of any kind. The *valid* fixture cursor base64-decodes to plaintext; a base64-encoded offset passes. The manifest's "tamper-safe" and "absence of a client-decodable offset are contractual" claims are false as written. Cross-tenant paging is not prevented by the contract; whether it occurs depends on an unspecified server. **Not safe to build on as written.** |
| 3c | CTR-IDM-001 `result_ref` | **Inadequate.** Deny-list, not allow-list. `file://`, `data:`, `//evil.example`, `javascript:`, `HTTPS://`, `\\host\share`, and `../../../etc/passwd` all pass. Same defect in `CTR-JOB-001.input_ref`/`result_ref`. |
| 4 | Secret scan + fixture inspection | **Clean.** Scanner exit `0` but it is five regexes and near-uninformative. Manual inspection of all 19 fixtures: no secret, credential, token, private URL, real provider identifier, or PII; zero payload bytes; `.invalid` hostnames only. `sha256:` + 64×`a` confirmed a synthetic, information-free placeholder. |
| 5 | Prohibited-change surface | **Clean.** No network call, credential, migration, RLS change, or production config. `package-lock.json` and `.github/` untouched (last `.github/` change `3c8e025`). Two hygiene observations (O-1, O-2) and one disclosed pre-existing working-tree change (O-3). |
| 6 | Guard as a security control | **Real but narrower than framed, and bypassable four ways** (verified: 4 pass / 0 fail with bypasses injected). Most seriously, it verifies a `$ref` target *exists*, never that `tenant_context` resolves to `CTR-TEN-001` — the tenant-isolation property itself is unguarded. |

---

## 10. Conditions

Not blocking the package's Draft status; **each must be discharged before the affected
contract advances past Draft**, and C-1 and C-4 should be discharged now while correction
is cheap.

- **C-1 (withdraw or enforce the tamper-safety claim — do this now).** `CTR-PAG-001`'s
  `freeze_boundary` must either (a) make cursor integrity contractual — a MAC over the
  cursor including `workspace_id`, verified server-side before use, with tampered-cursor
  negative fixtures — or (b) drop the words "tamper-safe" and the claim that "the absence
  of a client-decodable offset [is] contractual", and state plainly that this contract
  enforces a charset only and that integrity is the implementer's responsibility. The
  current wording will cause a downstream implementer to skip signing. Option (b) is a
  one-line edit; leaving it as-is is not acceptable.
- **C-2 (constrain the success payload).** `CTR-API-001.data` must carry an explicit
  redaction obligation before freeze, and the freeze boundary must state today that `data`
  is currently unconstrained, so no reader concludes the no-internal-detail-leak rule is
  fully materialized. Mirror the constraint into `validApiEnvelope`.
- **C-3 (allow-list every internal reference).** Replace `^(?!https?://).+` and
  `not:{pattern:"^https?://"}` with a positive scheme allow-list across all five fields —
  `CTR-API-001.accepted.status_ref` / `.deep_link_ref`, `CTR-IDM-001.result_ref`,
  `CTR-JOB-001.input_ref` / `.result_ref` — matching the vocabulary the valid fixtures
  already use. Add negative fixtures for `HTTPS://`, `//host`, `javascript:`, `data:`, and
  `../` traversal, and fix `isPrivateRef` in the test to match. `CTR-JOB-001` is a
  WP-0A-CON-001 output; route via the Integration Owner / RFC path.
- **C-4 (make the guard guard the property — do this now).** Add an assertion that
  `CTR-EVT-001.properties.tenant_context.$ref` and
  `CTR-JOB-001.properties.tenant_context.$ref` resolve to `ctr-ten-001/schema.json`
  specifically. Widen `CATALOG` from `contract-catalog/shared-kernel` to a recursive walk
  of `contract-catalog/`, covering nested files and `manifest.json`. Narrow the RFC-2026-004
  sentence "makes any recurrence a CI failure" to the class the guard actually covers.
- **C-5 (record the scanner's limits).** The handoff must not present
  `scan:secrets` exit `0` as meaningful assurance for these fixtures. The assurance in this
  package comes from the manual inspection in §5.
- **C-6 (for the Tester, `/claude/q0_sentinel`).** No fixture exercises a payload-hash
  *mismatch*, which is the ID-001 conflict rule `CTR-IDM-001` claims to materialize; and a
  fixture the package labels `invalid-` (`invalid-unstable-sort-without-tiebreaker.json`)
  is **accepted** by the published `schema.json` while rejected by the test predicate.
  Schema and enforced predicate are two different contracts and nothing checks they agree —
  the same structural blindness that produced the original `$ref` defect.
- **C-7 (for the Integration Owner).** `.agents/capability-profiles/cc-r0-steward.json`, a
  WP-0A-A0-002 artifact, rides in this package's commit and would be removed by the revert
  path RFC-2026-004 describes (O-1).
- **C-8 (carry forward, not this package's defect).** `CTR-TEN-001` is titled "Trusted
  Tenant Context" but cannot attest that an instance was server-resolved rather than
  client-supplied; §3.1's server-side trust boundary has no implementation anywhere in this
  repository. `CTR-ERR-001.code` / `.message_key` / `field_errors[]` are unconstrained free
  strings into which a stack trace fits, and `CTR-API-001` now composes that surface.

**Not required by me:** freeze-level movement, Gate G0, merge, or the `/root/r0_steward`
acknowledgement. Those belong to other roles.

---

VERDICT: security_approved_with_conditions
