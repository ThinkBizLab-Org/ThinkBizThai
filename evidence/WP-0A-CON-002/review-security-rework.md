# WP-0A-CON-002 — Independent Security/Privacy review of the rework

**This document is Security/Privacy evidence only.** It is not a contract review, not a test
verdict, and not an integration or merge authorization. It carries no schedule, scope or
freeze-level opinion beyond the security consequences named in it.

- **Reviewer role:** independent Security/Privacy reviewer
- **agent_run_id:** `/claude/a1_bastion`
- **Work package:** WP-0A-CON-002
- **Commit reviewed:** `28d3142`
- **Previous review:** `106f91c` — returned `security_approved_with_conditions`
- **Review method:** every read, probe and destructive experiment was performed in a frozen
  extraction of `28d3142` and in throwaway copies of it. The live repository working tree was
  never read from or written to during this review.
- **Frozen root:** `.../scratchpad/con002-review`
- **Probe copies:** `probe1`, `probe2a`, `probe2b`, `probe2c`, `probe2d`, `probe4`
- **Toolchain:** Node v24.20.0 / npm 11.19.0 (pinned; confirmed by `node --version` / `npm --version`, exit 0)

---

## 0. Baseline — the unmodified frozen root

| # | Command (run in the frozen root) | Exit |
|---|---|---|
| 0.1 | `npm run check` | **0** (tests 70, pass 70, fail 0, cancelled 0, skipped 0, todo 0) |
| 0.2 | `node scripts/scan-repository-secrets.mjs` | **0** |
| 0.3 | `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` | **0** |
| 0.4 | `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | **0** |
| 0.5 | `node --test test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | **0** |
| 0.6 | `node scripts/validate-work-package-ownership.mjs work-packages` | **0** |
| 0.7 | `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-002.json` | **0** |

The declared gate condition (`skipped` and `todo` both zero) holds.

---

## 1. The `$ref` repointing attack, re-run — and the new `$id` identity check attacked

### 1.1 The original attack now fails (the specific defect is closed)

**Probe 1** — in `probe1`, repointed `CTR-EVT-001.properties.tenant_context` at
`../ctr-err-001/schema.json`, exactly as at `106f91c`.

`npm run check` → **exit 1**, two tests red:

```
✖ a $ref resolves to the contract it claims, not merely to some file that exists
    contract-catalog/shared-kernel/ctr-evt-001/schema.json $.properties.tenant_context.$ref
    -> ../ctr-err-001/schema.json resolves to $id "CTR-ERR-001", expected CTR-TEN-001
✖ every fixture agrees with its own shipped schema, not with a hand-written predicate
```

The finding I filed at `106f91c` is genuinely remediated for the exact mutation I filed.

### 1.2 Relabelling the target's `$id` — **the check is name matching**

**Probe 2a** — set `ctr-err-001/schema.json`'s `$id` to `CTR-TEN-001`, left the file otherwise
the error schema, and repointed `tenant_context` at it. `npm run check` → **exit 1**, three red.

But read *which* tests went red. The identity test failed on a **different** reference —
`ctr-api-001`'s `error` `$ref`, which now resolves to a file claiming `CTR-TEN-001`. It did not
fail on `tenant_context`: for that property the relabelled error schema **satisfied** the
identity check. The mutation was caught only as collateral, by a pre-existing WP-0A-CON-001
assertion (`schema.$id === id` for the four Candidate contracts) and by fixture conformance.

### 1.3 A decoy file that claims the right `$id` — **CI stays green**

**Probe 2b** — the attack the identity check does not survive. Added one new file,
`contract-catalog/shared-kernel/ctr-ten-001/schema.v2.json`:

```json
{"$schema":"...","$id":"CTR-TEN-001","title":"Trusted Tenant Context","type":"object"}
```

and repointed `CTR-EVT-001.properties.tenant_context` at it.

`npm run check` → **exit 0. tests 70, pass 70, fail 0.**

Consequence, measured directly against the shipped schemas in each tree (hostile
`tenant_context` = `{leaked_api_key: <synthetic placeholder>, note: "no workspace_id at all"}`):

| Tree | `tenant_context.$ref` | target `$id` | validator errors on the hostile value |
|---|---|---|---|
| `28d3142` baseline | `../ctr-ten-001/schema.json` | `CTR-TEN-001` | 8 errors — every required field missing, both extra keys rejected |
| probe 2b | `../ctr-ten-001/schema.v2.json` | `CTR-TEN-001` | **`[]` — accepted** |

The tenant context on the envelope that carries **every domain event** is reduced to "is an
object": no `workspace_id`, no actor, and `additionalProperties: false` gone, so arbitrary
extra keys ride inside it. CI is green.

Nothing in the repository closes this. No test enumerates schema files that no manifest
declares — the "every fixture on disk is declared by its manifest" test walks only
`<contract>/examples/`, so a decoy at the contract-directory root is invisible. No test asserts
that a file claiming `$id: CTR-TEN-001` is *the* `ctr-ten-001/schema.json`. And
`assertSchemaSupported` is applied only to each contract directory's `schema.json`, so a decoy
target is never even checked for keywords nothing enforces.

### 1.4 Pointing at valid JSON that is not a schema

**Probe 2c** — repointed `tenant_context` at `../ctr-ten-001/manifest.json` (valid JSON, no
`$id`, no `type`, no `properties`). `npm run check` → **exit 1**, one red: the identity test.

Note precisely which test did **not** fail: `every fixture agrees with its own shipped schema`
passed. A manifest used as a schema constrains nothing, so every fixture validated clean. The
identity check was the *only* thing standing between the catalog and total loss of constraint
on that property — which matters for 1.5.

### 1.5 A `tenant_context`-equivalent the mapping does not cover — **CI stays green**

`EXPECTED_REF_TARGET` is a hardcoded two-entry map keyed by the **property name** at the
reference site: `{tenant_context: 'CTR-TEN-001', error: 'CTR-ERR-001'}`. Every other reference
site in the catalog is unchecked, and the key is derived as `path.split('.').at(-1)`, so a
reference nested under `items` or inside an `allOf` branch yields a last segment of `items` /
`allOf[0]` and is skipped.

**Probe 2d** — added to `ctr-pag-001/schema.json`:

- `properties.tenant` = `{"$ref": "../ctr-err-001/schema.json"}` (a tenant-context-shaped field under a name the map does not list)
- `properties.items` = `{"type":"array","items":{"$ref":"../ctr-err-001/schema.json"}}` (a reference hidden one level down, under `items`)

`npm run check` → **exit 0. tests 70, pass 70, fail 0.**

### 1.6 Ruling on item 1

**The `$id`-identity check is a name-matching formality, not real security.** It is a
string-equality assertion against a value the referenced file supplies about itself, applied to
two hardcoded property names. It stops exactly the mutation that was demonstrated to it and
generalises to nothing:

- an attacker writes the expected `$id` into whatever file they want the reference to reach (1.3), or
- names the property something else, or nests the reference one level down (1.5).

Both were carried through a full `npm run check` at exit 0.

What actually caught the mutations in 1.1 and 1.2 was **fixture validation against the resolved
`$ref`** — the negative fixtures. That is the real control, and it is a genuinely good one: it
is why relabelling and repointing at a *constraining* schema both fail. It does not fire when
the substituted target is *more permissive* than the real one, because a permissive schema
accepts the positive fixtures and the existing negative fixtures fail for unrelated reasons
(`invalid-missing-tenant.json` omits `tenant_context` entirely, so it still fails on `required`
at the root, whatever the reference resolves to).

Two properties would make this real security rather than a formality, and neither is expensive:

1. **Locate the `$id`, don't just read it.** A `$ref` must resolve to the canonical path for the
   contract it claims — assert that any catalog file declaring `$id: CTR-XXX-NNN` *is*
   `contract-catalog/<group>/ctr-xxx-nnn/schema.json`, and that a contract directory contains no
   schema file its manifest does not declare. This closes 1.3 and 1.4 together.
2. **Derive the expectation, don't enumerate it.** Every external `$ref` in the catalog should
   have to resolve to a contract declared in `index.json`, whatever the property is called and
   however deeply it is nested — with the two-entry map retained only as an additional
   per-property assertion. This closes 1.5.

---

## 2. The reference allow-list

Shipped on `CTR-API-001.accepted.status_ref`, `CTR-API-001.accepted.deep_link_ref` and
`CTR-IDM-001.result_ref`:

```
^(job|status|result|app|asset|content):[A-Za-z0-9._/-]+$
```

### 2.1 Traversal — **the allow-list is defeated**

Values set on `result_ref` / `status_ref` and validated against the shipped schemas
(baseline frozen root, no mutation):

| Value | Result |
|---|---|
| `result:../../../etc/passwd` | **ACCEPTED** |
| `result:/../../../../etc/shadow` | **ACCEPTED** |
| `result:....//....//etc/passwd` | **ACCEPTED** |
| `status:/proc/self/environ` | **ACCEPTED** |
| `content:/.env` | **ACCEPTED** |
| `content://attacker.example.invalid/exfil` | **ACCEPTED** |
| `app://attacker.example.invalid/x` | **ACCEPTED** |
| `asset://attacker.example.invalid/a.png` | **ACCEPTED** |
| a `result:` reference 4000 characters long | **ACCEPTED** |
| `job:..%2f..%2fetc` | rejected (`%` is outside the class) |

Confirmed on `CTR-API-001.accepted.status_ref` as well: `result:../../../etc/passwd` → accepted.

The character class contains both `.` and `/`, so every traversal form is expressible inside an
allow-listed scheme. It also permits a leading `//`, which reconstitutes an **authority
component** under a scheme name — `content://` and `app://` are real, dereferenceable schemes in
mobile and webview runtimes, so `content://attacker.example.invalid/exfil` is not a theoretical
string: it is the same class of "reference points somewhere the tenant does not control" that
this rule exists to prevent. There is no `maxLength`, so a reference field is an unbounded
string sink.

The package's own acceptance criterion reads: *"Reference fields use an allow-list of internal
schemes and reject uppercase, protocol-relative, file, data, javascript and traversal forms."*
The uppercase, protocol-relative, `file:`, `data:` and `javascript:` halves are true. **The
traversal half is false as shipped**, and the protocol-relative half is true only for a bare
leading `//` — `<allowed-scheme>://host` passes. The shipped test enumerates eight hostile
values and every one of them omits an allow-listed scheme prefix, so the test cannot see any of
this.

### 2.2 Anchoring — the pattern behaves as anchored

`validate()` compiles patterns as `new RegExp(schema.pattern, 'u')` — no `m`, no `g`, no `y`.
JavaScript's `$` without `m` matches only at end of input and, unlike some other regex flavours,
does **not** match before a trailing newline. Verified directly against the shipped pattern:

| Input | Match |
|---|---|
| `result:ok\nhttps://evil.example.invalid/x` | false |
| `https://evil.example.invalid/x\nresult:ok` | false |
| `result:ok x` | false |

No newline-injection or partial-match bypass. Anchoring is sound; the body is the whole problem.
There is no shared-object reuse of a `RegExp` with `g`/`y`, so no `lastIndex` state bug either.

### 2.3 `CTR-JOB-001` was never converted — the original defect is still shipped

`CTR-JOB-001.input_ref` and `CTR-JOB-001.result_ref` still carry
`{"not":{"pattern":"^https?://"}}` — the **exact deny-list** I demonstrated bypassable at
`106f91c` (uppercase scheme, protocol-relative, `file:`, `data:`, `javascript:`, traversal all
pass it). `shared-kernel-contract-catalog.test.mjs` pins that deny-list by asserting its literal
text, and the new hostile-scheme test targets only `ctr-api-001` and `ctr-idm-001`.

`CTR-JOB-001` is **Candidate** — a higher freeze level than the three Draft contracts that did
get the allow-list. The background-job envelope's input and result references are the ones that
point at object storage.

This is not an author defect: `contract-catalog/shared-kernel/ctr-job-001/**` is outside the
package's `writable_paths`, and `authorized_cross_package_amendments` limits the author to the
`tenant_context` `$ref` literal plus the `x-amended-by` record. The author could not have fixed
it. It must be **escalated to the CTR-JOB-001 contract owner** rather than requested here, and
the package must stop presenting "reference fields use an allow-list" as a catalog-wide
property when the highest-freeze reference fields in the catalog do not.

### 2.4 Ruling on item 2

**An allow-list of schemes with a permissive body is genuinely safer than the deny-list it
replaced — but it is not safe, and as shipped it makes a claim it does not honour.**

Safer: a deny-list must enumerate what must not appear, and I proved at `106f91c` that this one
could not. Closing the scheme by enumeration is the structurally correct move and it does close
the whole `file:` / `data:` / `javascript:` / uppercase / bare-`//` family in one rule.

Not safe: constraining the scheme and leaving the body free re-opens the identical failure mode
one layer down. The scheme is now an allow-list; the **body is still a deny-list, and its deny
set is empty** except for characters that happen not to be in the class. Every character needed
for traversal and for an authority is in the class.

The fix is small and belongs in this package. Forbid `..` and a leading `/` or `//` in the body,
e.g. a body of one or more `/`-separated segments each matching `[A-Za-z0-9._-]+` and none equal
to `.` or `..`, plus a `maxLength`. Until then, the acceptance criterion's traversal clause must
be corrected rather than left standing — a security control that overstates its own guarantee is
the precise defect class this package was chartered to remove, and it is the same shape as the
"tamper-safe" over-claim the author correctly withdrew from `CTR-PAG-001`.

---

## 3. The cursor gap is declared rather than fixed — judgement

### What is actually shipped

- `ctr-pag-001/schema.json` → `cursor.x-opacity-rule` states, in the schema itself, in capitals:
  *"TAMPER-SAFETY IS THEREFORE NOT ENFORCED BY THIS CONTRACT"*, names the missing mechanism (a
  MAC or signature), and cites the demonstration that base64 of an offset satisfies opacity by
  inspection.
- `ctr-pag-001/manifest.json` → the same statement in `freeze_boundary`, plus a required
  `accepted_gaps` entry against the fixture.
- `examples/accepted-gap-decodable-offset-cursor.json` → a fixture that decodes to an offset,
  which the contract is asserted to **accept**.
- `shared-kernel-schema-conformance.test.mjs` → an `accepted-gap-` fixture must satisfy its
  schema **and** carry an explanation longer than 80 characters; a gap declared for a fixture the
  manifest does not list is an error.
- `shared-kernel-envelope-contracts.test.mjs` → decodes the fixture, asserts it really contains
  an offset, asserts the contract accepts it, and asserts the manifest's reason mentions tamper,
  integrity, MAC or signature.
- `work-packages/WP-0A-CON-002.json` → carried in `open_blockers` as a pre-freeze requirement.

### Ruling

**Declaring it is acceptable for a Draft contract. Shipping it is not itself a security defect,
because the contract does not make the claim.** This is the distinction that decides it.

At `106f91c` the artifact asserted tamper-safety it did not provide. That was a security defect
independent of the annotation, because a downstream reader could rely on it. At `28d3142` the
artifact asserts the **opposite**: API-003 (the source requirement) calls the cursor
"opaque/tamper-safe", and the contract states in-file that it diverges from its source and does
not enforce it. Nobody reading `CTR-PAG-001` can come away believing the cursor is
tamper-resistant. The over-claim — the actual defect — is gone.

Three further things make this the right call rather than a generous one:

1. **Draft, and no implementation exists.** No code consumes this cursor, no data is paged, no
   endpoint is deployed. The window between "declared" and "must be fixed" is the freeze gate,
   and the blocker is recorded against that gate.
2. **Inventing the mechanism would have been worse.** Choosing a MAC construction, key scope and
   rotation policy is a Security decision with an owner. An author inventing one unsourced,
   under a Draft freeze level, would produce a *plausible-looking* integrity mechanism that has
   had no security review — strictly more dangerous than a documented absence, because it would
   read as solved.
3. **The declaration is load-bearing, not decorative.** Delete the `accepted_gaps` reason and CI
   goes red; rename the fixture out of the `accepted-gap-` convention and the conformance suite
   demands it be rejected instead. The gap cannot silently decay into an undeclared one, and if
   an owner later specifies a MAC the fixture becomes a tripwire that fires on the next run.

**Condition, not an approval:** the gap is currently prose in a manifest and a work-package
blocker. It is not represented in `contract-catalog/shared-kernel/index.json`, which is what a
consumer reads first, and there is no machine-checkable link from an `accepted_gaps` entry to
the gate it blocks. Freeze of `CTR-PAG-001` must be mechanically impossible while an
`accepted-gap-` fixture exists for it. The same applies to the unbounded `page_size` — an
enumeration control the manifest correctly declines to invent and correctly records.

I would rule the opposite way the moment either (a) any code is written against this cursor, or
(b) the contract is proposed for advancement past Draft. At that point a declared-forgeable
cursor stops being an honest gap and becomes a shipped weakness.

---

## 4. `json-schema-subset.mjs` assessed as a security control

`additionalProperties: false` is now the mechanism that stops undeclared keys carrying secrets
through the envelopes, and this file is the only thing that executes it. Assessed on that basis.

### 4.1 Is it more permissive than it appears?

**The implementation is not.** Extra keys were injected at every nesting level of a valid
`CTR-EVT-001` fixture and validated against the shipped schema:

| Injection point | Result |
|---|---|
| envelope root | rejected |
| `producer` | rejected |
| `subject` | rejected |
| `metadata` | rejected |
| `tenant_context` (**through a resolved `$ref`**) | rejected |
| `tenant_context.actor` (two levels below the `$ref`) | rejected |
| `payload` (`maxProperties: 0`) | rejected |
| `CTR-ERR-001.field_errors[]` (**inside array items**) | rejected |
| `CTR-API-001.accepted` | rejected |
| `CTR-IDM-001.scope` | rejected |

`additionalProperties: false` composes correctly through `properties`, through `items`, and
across a `$ref` boundary. This is the strongest part of the package.

**The test around it is.** `an extra property carrying a secret is rejected wherever
additionalProperties is false` mutates the **root object only** (`{...body, leaked_api_key}`)
and only for schemas whose *root* has `additionalProperties: false`. Every nested level in the
table above is enforced by the implementation and asserted by nothing. If a future edit dropped
`additionalProperties: false` from `tenant_context` or `metadata`, this suite would stay green.
The test should walk every object level the schema declares.

### 4.2 Can a fixture carry an extra key at a level nothing checks?

Yes — not through a validator gap, but because three fields are declared as unconstrained
containers:

| Field | Declaration | Extra keys | Declared as a gap? |
|---|---|---|---|
| `CTR-API-001.data` | `{"type":"object"}` | **accepted**, at any depth | **Yes** — `x-leakage-boundary`, and in `open_blockers` |
| `CTR-PAG-001.filter` | `{"type":"object"}` | **accepted** | **No** |
| `CTR-PAG-001.items` | `{"type":"array"}` | **accepted** (any content) | **No** |

Verified: `filter: {secret_token: <synthetic>}` and `items: [{secret_token: <synthetic>}]` both
validate clean against the shipped `CTR-PAG-001`.

The `data` branch is handled exactly right — named in the schema, named in the work package,
with the reason the envelope cannot constrain it. `CTR-PAG-001` did not get the same treatment,
and `items` is the field that actually carries tenant rows to a client. This is the same class
of hole, one contract over, undeclared. The manifest's `untestable_by_fixture` note covers
ordering, not content. Consistency requires an `x-leakage-boundary`-equivalent on both.

### 4.3 `$ref` recursion and cycles

`validate()` has **no cycle guard and no depth limit**. A two-file cycle (`A.$ref → B`,
`B.$ref → A`) and a self-reference both terminate in `RangeError: Maximum call stack size
exceeded`.

It is **not reachable in this harness**, for a reason worth recording. `refResolver` walks only
the root contract schema and resolves the references it finds there; it does not walk into a
resolved target. So a second-level reference is never in the map. Verified — **probe 4** gave
`ctr-ten-001/schema.json` its own `$ref` (making `evt → ten → err/actor.json`):

```
✖ every fixture agrees with its own shipped schema
    $.tenant_context.actor: unresolvable $ref '../ctr-err-001/actor.json'
```

`npm run check` → **exit 1**. A cycle cannot form, because a transitive reference resolves to
nothing first. Not a DoS today. It becomes one the moment anyone replaces `refResolver` with a
transitive resolver, which is the obvious next change; `validate()` should carry a visited-set or
depth cap before that happens.

### 4.4 Does an unresolvable `$ref` fail closed?

**Partly.**

- Positive direction — **fails closed, correctly.** An unresolvable reference returns
  `unresolvable $ref '<ref>'` and short-circuits, so a `valid-` or `accepted-gap-` fixture goes
  red (4.3). A broken reference cannot be mistaken for a satisfied constraint.
- Negative direction — **fails open, vacuously.** The conformance suite asserts only
  `errors.length > 0` for an `invalid-` fixture. An unresolvable reference guarantees that,
  whatever the fixture contains. Every negative fixture in a contract whose reference broke
  would pass for the wrong reason. The reference-integrity suite would normally catch the broken
  reference first, so this is a defence-in-depth gap, not a live hole — but a negative fixture
  should be required to fail for the *reason* it is named for.

### 4.5 Other observations

- **Unknown keyword is an error, and the check is deep.** `assertSchemaSupported` recurses
  through `properties`, `items`, `not`, `if`/`then`/`else`, `additionalProperties` and
  `allOf`/`anyOf`/`oneOf`. Confirmed it catches `patternProperties` three levels down, a
  `$dynamicRef` under `then.properties`, `propertyNames` under `additionalProperties`, and
  rejects tuple-form `items` outright. `$defs`, `definitions`, `unevaluatedProperties`,
  `dependentRequired`, `contains` and `prefixItems` are all unsupported and therefore errors.
  This is the right default and it is implemented properly. **Its blind spot is coverage,
  not logic:** it runs only over each contract directory's `schema.json` (see 1.3).
- **`required` uses the `in` operator**, which walks the prototype chain. A schema requiring a
  property named `constructor`, `toString` or `valueOf` is satisfied by an object that does not
  have it — verified: `validate({type:'object',required:['constructor']}, {})` returns `[]`. No
  catalog schema uses such a name, so this is latent. Use `Object.hasOwn`.
- **`format: date-time` is `Date.parse`**, which is lenient and implementation-defined; a
  date-only string or a loose date string passes. Cosmetic here, worth knowing before anything
  relies on it for an expiry or lease boundary.
- **Schema-supplied patterns are compiled unbounded** (`new RegExp(schema.pattern,'u')`). Schemas
  are reviewed artifacts, so this is not an injection path, but a catastrophically backtracking
  pattern in a future schema would hang CI.
- **`oneOf`/`anyOf` re-validate the whole subtree per branch**; nested combinators are
  exponential. Not a concern at current schema sizes.

### 4.6 Ruling on item 4

**As an executable engine it is sound, and safe to rely on for `additionalProperties: false`.**
It fails closed on unresolvable references, it treats an unknown keyword as an error rather than
a silent pass, it composes correctly through `$ref` and array items, and its anchoring semantics
are correct. It is markedly better than the hand-written predicates it replaces.

**As a deployed control it is under-tested and under-scoped.** The extra-key assertion is
root-only (4.1); two open containers carry no declaration (4.2); the negative direction can pass
vacuously (4.4); and the keyword check never runs over a file that is only reached by reference
(1.3). None of those are engine bugs — every one is a gap in what the suite asks the engine to
prove.

---

## 5. Fixtures, placeholders and the secret scan

### 5.1 Every fixture is synthetic

Enumerated every string value in every JSON file under `contract-catalog/shared-kernel` and read
all 26 fixtures in full. Findings:

- **Identifiers** are either the fixed nil-style UUID family `00000000-0000-4000-8000-0000000000NN`
  or the `<prefix>_synthetic_NNNN` convention (`ws_`, `usr_`, `req_`, `cor_`, `job_`, `idem_`,
  `content_`). Sequential, self-labelling, non-resolvable.
- **Hostnames** appear only as `*.example.invalid`. `.invalid` is reserved by RFC 2606 and cannot
  resolve; `example.*` is reserved by RFC 2606/6761. They appear only in fixtures whose whole
  purpose is to be rejected (`invalid-public-status-ref`, `invalid-public-result-ref`).
- **`input_ref`** uses `synthetic://input/<nil-uuid>` — a scheme that does not exist.
- **Locale/timezone** are the contract constants `th-TH` / `Asia/Bangkok`, not user data.
- **Timestamps** are round synthetic values on the package date.
- **No** key, token, password, bearer value, private URL, connection string, real provider
  identifier, email address, phone number, national ID, name, or any other PII. No real provider
  is named anywhere in the three new contracts; the one provider reference in the repository is a
  citation to an internal baseline document in `CTR-IDM-001.x-algorithm-note`, which names a
  document and a line number, not a credential.
- `error.details` and `event.payload` are pinned to `maxProperties: 0` — the two places a real
  provider response could otherwise be pasted in.
- The only hostile-looking strings in the package are the eight test inputs inside
  `shared-kernel-schema-conformance.test.mjs`. They are inert literals in an assertion list.

### 5.2 The `sha256:` placeholder is information-free

`payload_hash` is `sha256:` followed by the letter `a` repeated 64 times, identical in all five
`CTR-IDM-001` fixtures. Confirmed: it is a run of one repeated character, it is not the digest of
anything, it does not vary between fixtures, and it therefore encodes nothing about any input.
The prefix is required by the schema so the algorithm is explicit on the wire. **No information
leaks through it.** Two of the fixtures deliberately share the value to demonstrate the
replay-with-matching-hash case, which is the intended semantics.

### 5.3 Secret scanner

`node scripts/scan-repository-secrets.mjs` in the frozen root → **exit 0**, no output.

### 5.4 Standing finding C1 — the scanner's weakness (restated, unchanged)

**`scripts/scan-repository-secrets.mjs` is a five-entry deny-list of vendor-specific literal
prefixes and it should not be read as evidence that a tree is free of secrets.** It matches only:
a PEM private-key header line; two Stripe-style prefixed key/webhook forms; one AWS access-key-id
prefix form; and one GitHub token prefix family. It therefore does **not** detect, among others:

- credentials for any provider not on that list — model-provider keys, Google/GCP keys, Azure
  keys, Supabase service keys, Slack/Twilio/SendGrid tokens;
- generic bearer tokens, session cookies, JWTs, or anything base64/hex-encoded;
- database connection strings with an embedded password, or `.env`-style assignments of any kind;
- any secret in a file it cannot read as UTF-8, or inside an archive or image;
- **any PII whatsoever** — the scanner has no privacy dimension at all, despite `check` treating a
  clean run as a privacy gate.

It also honours only `.git` and `node_modules` as exclusions, ignoring `.gitignore`, so its false
positives and false negatives are both untethered from what is actually committed. C1 remains
open and is unrelated to WP-0A-CON-002: this package neither worsened nor was asked to fix it.
A zero exit here means "none of five literal prefixes appeared", nothing more. I relied on my own
enumeration in 5.1, not on this scanner, to clear the fixtures.

---

## 6. Network, credentials, migrations, RLS, production config, dependencies

| Check | Method | Result |
|---|---|---|
| Network calls | grep for `fetch(`, `node:http`/`node:https`, `net.`, `dns.` across `scripts`, `test-kits`, `contract-catalog`, `.github`, `package.json` | **None.** The only `http(s)` strings are `$schema` identifiers (`json-schema.org`, never dereferenced — the validator has no remote resolution path at all), `*.example.invalid` inside reject-me fixtures, and one comment in a test file. |
| Credentials / secrets | 5.1, 5.3, and `security_privacy.secrets_required` in the manifest | **None.** `secrets_required: false`, `data_classification: synthetic-only`, `network_policy: deny-unless-declared`. |
| `process.env` access | grep | **None** in any script or test. |
| Migrations | grep for `CREATE TABLE` / `ALTER TABLE` / `migration`; `migration_reservations` in the manifest | **None.** `migration_reservations: []`. `db/**` and `migrations/**` are in `forbidden_paths`. |
| RLS / policy changes | grep for `CREATE POLICY` / `ROW LEVEL SECURITY` | **None.** No SQL of any kind in the package. |
| Production config | file inventory; `.github/**` and `package.json` are `read_only_paths` | **None.** No deployment, runtime or environment configuration touched. |
| `package-lock.json` | read in full | **Untouched.** `lockfileVersion 3`, `packages` contains only the root entry `""`. |
| Declared dependencies | `package.json` | **Zero.** `dependencies`, `devDependencies` and `optionalDependencies` are all empty. The validator is hand-written precisely to keep it that way. |
| Reversibility | manifest `rollback_or_forward_fix` | Revert-only; no persisted data, provider state, credential or customer-data effect. Consistent with what I observed. |

**Item 6 is clean.** Nothing in this package can reach a network, a credential store, a database
or a production surface.

---

## Findings

| ID | Sev | Finding | Blocking |
|---|---|---|---|
| S1 | High | The `$id` identity check is defeated by a decoy schema file that claims the expected `$id`. `npm run check` exit 0 with `CTR-EVT-001.tenant_context` reduced to "is an object" (1.3). | **Yes** |
| S2 | High | The identity check is a two-entry map keyed by property name; any other name, or a reference nested under `items`/`allOf`, is unchecked — and pointing such a reference at a manifest removes all constraint silently. `npm run check` exit 0 (1.4, 1.5). | **Yes** |
| S3 | High | The allow-list body permits traversal and an authority component: `result:../../../etc/passwd` and `content://attacker.example.invalid/exfil` are accepted on `CTR-API-001` and `CTR-IDM-001`. The acceptance criterion's "reject … traversal forms" clause is false as shipped (2.1). | **Yes** |
| S4 | High | `CTR-JOB-001.input_ref` / `.result_ref` still carry the deny-list proven bypassable at `106f91c`, on a **Candidate** contract — outside this package's writable scope (2.3). | Escalate |
| S5 | Med | `CTR-PAG-001.filter` and `.items` are unconstrained containers with no declaration, unlike `CTR-API-001.data` which is declared correctly. `items` carries tenant rows (4.2). | Condition |
| S6 | Med | The extra-key assertion mutates the root object only; nested `additionalProperties: false` is enforced but asserted by nothing (4.1). | Condition |
| S7 | Low | A negative fixture passes vacuously when a `$ref` is unresolvable (4.4). | Condition |
| S8 | Low | No cycle guard or depth limit in `validate()`; unreachable only because `refResolver` does not follow transitive references (4.3). | Condition |
| S9 | Low | `required` uses `in`, satisfied through the prototype chain for names like `constructor` (4.5). | Condition |
| S10 | Low | Reference fields have no `maxLength`; a 4000-character reference is accepted (2.1). | Condition |
| S11 | Low | `CTR-PAG-001`'s declared gaps are prose only — not in `index.json`, no mechanical link to the freeze gate (3). | Condition |
| C1 | — | Standing: the repository secret scanner is a five-prefix deny-list with no privacy dimension. Not this package's defect (5.4). | Standing |

### Conditions attached to any future approval

1. **S3 first** — it is a one-line pattern change inside this package's own writable paths, and
   until it lands the package asserts a security property it does not have.
2. **S1 + S2** — a `$ref` must resolve to the canonical location of the contract it claims, and
   every external reference in the catalog must be checked, not two property names.
3. **S4** — raise with the `CTR-JOB-001` owner as a separate work package; do not silently carry
   a Candidate contract on a bypassed deny-list while claiming the catalog uses an allow-list.
4. **S5–S11** — carry into the pre-freeze security gate for `CTR-PAG-001` and the validator.
5. The `CTR-PAG-001` cursor and page-size gaps must be **mechanically** freeze-blocking, not
   prose-blocking.

### Withdrawn from the `106f91c` review

- `$ref` guard checked existence only — **closed for the filed mutation** (1.1), superseded by S1/S2.
- Cursor "tamper-safe" over-claim — **closed.** The contract now states the opposite (3).
- `result_ref` constrained only against a lowercase `http(s)` prefix — **closed on `CTR-IDM-001`
  and `CTR-API-001`**, superseded by S3; **still open on `CTR-JOB-001`** as S4.
- Success `data` branch entirely unconstrained — **not fixed, but correctly and completely
  declared.** Accepted as declared; the identical treatment is now required for `CTR-PAG-001` (S5).

---

## Assessment

The rework is a real improvement and the author's handling of the cursor is exemplary: an
over-claim was withdrawn, replaced with an in-schema statement of the opposite, pinned by a
fixture and a test that go red if the declaration is removed. That is how a gap should be
carried. Nothing in this package can reach a network, a credential, a database or production;
the fixtures are entirely synthetic; the dependency count is still zero and the lock file is
untouched.

But the two headline remediations do not hold up to attack. The `$id` check stops the exact
mutation it was shown and generalises to nothing — I carried two variants through a full green
`npm run check`. The allow-list closes the scheme and leaves the body wide enough for traversal
and an authority, so the criterion claiming it rejects traversal is false in the shipped
artifact. A security control that overstates its own guarantee is the specific defect class this
package exists to eliminate, and it has reappeared one field over from where it was fixed. S3 is
a one-line change inside the author's own writable paths; S1 and S2 are a modest strengthening of
a test file the author owns. I would rather these land now than be carried as conditions on an
approval.

VERDICT: security_changes_requested
