# RFC-2026-009 — A reference must be named and bounded

Status: Approved 2026-09-02 by the Product Owner — schema_ref is bounded and shaped as a contract id and semantic version, not as a resource reference. Limitations and Rollback in this document stand unchanged.
Decision needed by: before CTR-EVT-001 leaves Candidate
Owner: A0 Architecture/Integration
Protocol version: `1.0.0`

## Problem

Two separate gaps, both recorded as open blockers and neither closed until now.

### `CTR-EVT-001.metadata.schema_ref` had no shape at all

It shipped as `{ "type": "string", "minLength": 1 }` on the envelope that carries
**every event in the system**. Probed against the shipped schema, it accepted all
sixteen hostile forms tried:

`file:///etc/passwd` · `javascript:alert(1)` · a `data:` URI · `//evil.example` ·
`https://` and `HTTPS://` · `../../../../etc/shadow` ·
`http://169.254.169.254/latest/meta-data/` · `gopher://x` · a traversal appended to a
valid name · a lowercased name · a name with trailing text · a name with an embedded
newline and `<script>` · a 100 000-character string · `{{leak}}` · `${env.SECRET}`.

### No reference field anywhere carried an upper bound

`CTR-JOB-001` had already been hardened with an allow-list pattern after a
demonstrated bypass. But **a pattern says what a value may look like, not how much
of it there may be.** Every reference field in the catalog accepted an arbitrarily
long value that matched its own pattern. The longest reference actually used
anywhere in the catalog is 51 characters.

## Decision

### `schema_ref` gets a different constraint, not a tightened one

This is the part worth stating carefully, because the obvious fix is wrong.

The obvious fix is the catalog's `scheme:path` reference pattern, which is what
hardened `CTR-JOB-001`. Applying it here fails, and the earlier escalation said so
without saying why: **`schema_ref` does not locate a resource.** It *names* the
contract that defines the event body. Its only real value in the catalog is
`CTR-EVT-001@1.0.0`, which is not a reference and never matches a reference pattern.

So the constraint is a **contract id and a semantic version** —
a contract id, then `@`, then a semantic version — with an upper bound of 32. A reference pattern
would have admitted every URL form the probe demonstrated. A name pattern admits
none of them, because none of them is a name.

### Every reference-shaped field in the four contracts this package touches gets a bound

Twenty-four fields across four contracts — of which twenty-one are reference-shaped
by the discovery rule's own naming test, and three (`event_type`, `subject.type`,
`producer.implementation_version`) are bounded because they were unbounded and
adjacent, not because they are references. An earlier draft said "twenty-three",
which is neither number. The first version bounded five — the ones
carrying an allow-list pattern — and independent security review found that missed
the point: the fields **next to** the one being hardened were *strictly weaker*, with
no pattern **and** no bound. On `CTR-EVT-001` alone, `event_id`, `correlation_id`,
`causation_id`, `idempotency_key`, `producer.module_key` and `subject.id` each
accepted a 100 000-character value and four of the sixteen hostile forms named above
— on the same envelope, one key away.

The bounds are **declared inferences**: no baseline task states a limit, and the
longest real value in the catalog is 51 characters. They are set well above real use
and far below unbounded, and a reviewer who knows the true ceiling should lower them.

The guard **discovers** these fields by walking the schemas rather than listing them,
because a test titled "every reference field" that iterates a literal list will keep
asserting that title after the next field is added.

Independent testing then walked through the first discovery predicate twice, which is
the reason the rule is stated the way it is now. It compared `type` to the string
`"string"` by strict equality, so a **nullable reference** — `{"type": ["string",
"null"]}`, which this repository's own validator fully supports — was never
discovered: an unbounded `parent_event_id` accepting a 100 000-character value,
`file:///etc/passwd` and a cloud metadata address shipped with the whole check green.
The second escape was an **array of references**, whose own type is `array` and whose
name is plural.

A field is reference-shaped by **name**. What it holds may be the string, an array of
them, or a nullable one — and the bound belongs on the item where the string is. An
array also needs `maxItems`, because bounding each item and not the count leaves the
field unbounded in aggregate.

> The shape is written out in words rather than as a literal. Written as a literal
> it is email-shaped, and the repository's own secret scanner reports it — which it
> did, in CI, after this document was added without re-running the check.

## What was removed rather than kept

`schema_ref` carried `minLength: 1`. Under the new pattern, which cannot match a
string shorter than seventeen characters, no instance can distinguish the schema
with that constraint from the schema without it — and the existing empty-string
fixture that used to isolate it stopped isolating anything the moment the pattern
landed. It was removed.

This is the second constraint removed in this line of work for the same reason. The
rule being applied: a constraint that no instance can exercise is not a weak defence,
it is a **statement that reads as a defence and is not one**, and leaving it in place
inflates every coverage number that counts it.

## The guard asserts behaviour, never pattern text

Modelled on `test-kits/contracts/ctr-job-001-reference-hardening.test.mjs`, for a
reason recorded in RFC-2026-006: this repository shipped a test that pinned a
**vulnerable pattern as its expected value**, which made the correct fix unmergeable.
The guard here asserts what the schema *does* — the sixteen forms are rejected, a
well-formed name is still accepted, and a shape-valid overlong value is rejected —
so it survives any correct re-expression of the pattern.

The bound is tested with a value that **satisfies** the shape and exceeds the length.
A value failing both would prove nothing about the bound, because the shape alone
would already have rejected it.

## What this does NOT do

- `CTR-NTF-001.deep_link.target_ref` is still unbounded. That contract belongs to
  **A5**; proposing a change to it is reserved to A5 under §4.1, so it is reported.
- **`CTR-TEN-001.workspace_id` is still unbounded and unconstrained**, and it is the
  tenant-isolation key. Independent security review demonstrated it accepting a
  100 000-character value and `file:///etc/passwd` through the event envelope's
  `tenant_context`. It belongs to a different package and is reported, not fixed.
- Reference-shaped fields in the ten contracts this package does **not** touch remain
  unbounded: `ctr-flg-001.policy_key` and `reason_key`, `ctr-mod-001.module_key` and
  `capability_key`, the `ctr-obs-001` key fields, `ctr-sec-001.scope.capability_key`,
  `ctr-usg-001.attribution.provider_key`, and the `*_id` fields in `ctr-aud-001`,
  `ctr-err-001` and `ctr-usg-001`. The earlier draft of this document claimed "every
  reference field in the catalog" was addressed. That was never true of what shipped,
  and the claim is corrected rather than the scope quietly widened.

## Anchor semantics are a precondition, not a guarantee

JSON Schema mandates ECMA-262 `pattern` semantics, and this repository's validator
honours them. Independent security review showed that the two most likely non-JS
consumers do not: Python's `re` accepts a trailing newline after `$`, and Ruby's
`^`/`$` are unconditionally multiline, so **any** string containing one well-formed
line passes — which defeats this constraint entirely, including hostile form 13
above, in 27 characters, well inside `maxLength`.

This affects every anchored pattern in the catalog, so it is inherited rather than
introduced here. It is recorded because the claim "rejects all sixteen forms" is only
true under ECMA-262 anchors, and that precondition was previously unstated. A
conformance test belongs with the first non-JS validator; it does not exist yet.
- A bound and a shape do not make a reference *resolvable* or *authorized*. Nothing
  here checks that the named contract exists or that the caller may read it.
