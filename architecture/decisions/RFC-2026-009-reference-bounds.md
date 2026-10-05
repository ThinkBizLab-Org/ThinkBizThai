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
anywhere in the catalog is 51 characters. *(Wrong; see correction R-1 below.)*

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
— on the same envelope, one key away. *(Understated: each accepted all sixteen; see R-3.)*

The bounds are **declared inferences**: no baseline task states a limit, and the
longest real value in the catalog is 51 characters. They are set well above real use
and far below unbounded, and a reviewer who knows the true ceiling should lower them.
*(Superseded by R-1 and R-2: the figure is 85, and the bounds now stand as the contract
owner's decision.)*

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
  and the claim is corrected rather than the scope quietly widened. *(This list is
  itself incomplete; the full residual is in R-4.)*

## Anchor semantics are a precondition, not a guarantee

JSON Schema mandates ECMA-262 `pattern` semantics, and this repository's validator
honours them. Independent security review showed that the two most likely non-JS
consumers do not: Python's `re` accepts a trailing newline after `$`, and Ruby's
`^`/`$` are unconditionally multiline, so **any** string containing one well-formed
line passes — which defeats this constraint entirely, including hostile form 13
above, in 26 characters (corrected from 27; R-6), well inside `maxLength`.

This affects every anchored pattern in the catalog, so it is inherited rather than
introduced here. It is recorded because the claim "rejects all sixteen forms" is only
true under ECMA-262 anchors, and that precondition was previously unstated. A
conformance test belongs with the first non-JS validator; it does not exist yet.
- A bound and a shape do not make a reference *resolvable* or *authorized*. Nothing
  here checks that the named contract exists or that the caller may read it.

## Record corrections (2026-10-06)

Added by `/claude/a0_atlas` (WP-0A-CON-007's Author) after the package's three role verdicts on
`main` `03c584b`: `evidence/WP-0A-CON-007/review-contract-c0.md` (C0, `changes_required`),
`review-security-a1.md` (A1, `security_approved_with_conditions`) and `test-verdict-q0.md` (Q0,
`test_verified_with_conditions`). **The decision does not change.** `schema_ref` is still a contract
id and a semantic version with a bound of 32, and every bound in the four contracts stays as it is.
What changes is what this document says about the facts around the decision. Each figure below was
re-measured at `main` `e1fa28e` with the guard's own discovery rule. The marked sentences above
point here. Because this edits an Approved RFC, the PR that carries it is a governance PR, and the
Product Owner merges it personally (RFC-2026-025 §5 item 6).

**R-1. The longest reference is 85 characters, not 51 (A1 S-8, C0 F6).** Measured over every
reference-named field in every non-`invalid-` example fixture in the catalog: the longest is 85,
`ctr-usg-001/examples/valid-provider-reported.json` `dedupe_key`. The next two are 81 and 77,
also `ctr-usg-001` `dedupe_key`. If only `*_ref` fields count, the longest is 48,
`ctr-job-001/examples/valid.json` `input_ref`. No reading gives 51. The 85 arrived after this
package's head; at `653f699` that `dedupe_key` was 32 characters.

**R-2. The bounds are the contract owner's decision, not an inference waiting for someone else.**
No baseline document states a length limit for a reference: a search of `docs/**` for a stated
maximum length found none. The bounds in the four contracts (32 on `schema_ref`; 64 on
`producer.module_key`; 128 on the ids and `dedupe_key`; 200 on `CTR-EVT-001.idempotency_key`; 256
on the `scheme:path` references) are therefore recorded as **a decision of A0**. A0 is the owner of
CTR-API-001, CTR-EVT-001, CTR-IDM-001 and CTR-JOB-001 (each `manifest.json` `owner`) and the
accountable owner of this package. A0 takes the decision under the Owner's instruction of
2026-09-28 to carry out the work as A0 recommends (`คุณลุยงานทั้งหมด ตามที่คุณแนะนำ เลยได้ไหม`,
quoted in RFC-2026-025's status line). It is not the Product Owner's own decision. The Owner sees it
when he merges this governance PR. The grounds:

- 256 is three times the longest reference any fixture uses (R-1), and 128 is still above it.
- **256 is now load-bearing in the database.** These migrations enforce `length(...) <= 256` as
  CHECK constraints: `db/foundation/migrations/050_async_kernel.sql` on `app.jobs` `input_ref` and
  `result_ref`; `140_audit.sql` on `change_before_ref` and `change_after_ref`;
  `110_meta_connector.sql` on `body_ref`. Lowering the contract bound now makes the contract
  narrower than the database. Raising it makes the contract wider than the database, which is a
  contract/database mismatch and a stop-the-line class. Either change needs a forward migration in
  the same change.
- A1 suggested lowering `schema_ref` from 32 to 24. That would close the 13-to-16-digit numeric
  run its version position admits (R-5) and still accept every value the catalog uses. It is
  recorded as a suggestion, not taken. The decision stays at 32 until CTR-EVT-001's owner decides
  otherwise before freeze. The guard now pins 32 as behaviour (a 32-character name accepted, a
  33-character name rejected), so any change is an edit a reviewer reads.

**R-3. Before the fix, the fields next to `schema_ref` accepted all sixteen hostile forms, not four
(A1 S-7).** Against the pre-fix schema (the parent of `653f699`), `event_id`, `correlation_id`,
`causation_id`, `idempotency_key`, `producer.module_key`, `producer.implementation_version`,
`subject.type` and `subject.id` each accepted 16 of 16 and the 100 000-character value. `event_type`
already had a pattern and accepted none. The same "four of the sixteen" error sits in the
`x-bound-note` that is repeated on eight fields of
`contract-catalog/shared-kernel/ctr-evt-001/schema.json`, and that note is also wrong about
`event_type`. The file is outside this package's writable paths (CTR-EVT-001 belongs to
WP-0A-CON-001). Correcting the note is **owed by WP-0A-CON-001**, and the acknowledgement goes to
`/claude/r0_steward`.

**R-4. The full residual: 49 unbounded reference-shaped fields in nine contracts this package did
not bound (A1 S-10, S-4; C0 F5; Q0 §4).** The list under "What this does NOT do" named about twenty.
The full set, by owning work package:

| Contract | Unbounded reference-shaped fields | Owning package |
|---|---|---|
| CTR-TEN-001 | `workspace_id`, `business_profile_id`, `page_context_profile_id`, `actor.id`, `request_id`, `correlation_id`, `causation_id` | WP-0A-CON-001 |
| CTR-ERR-001 | `message_key`, `correlation_id` | WP-0A-CON-001 |
| CTR-SEC-001 | `scope.workspace_id`, `scope.business_profile_id`, `scope.page_context_profile_id`, `scope.capability_key`, `rotation.owner.id`, `revocation.actor.id`, `revocation.reason_key`, `correlation_id` | WP-0A-CON-004 |
| CTR-AUD-001 | `audit_id`, `actor.id`, `correlation_id`, `causation_id` | WP-0A-CON-004 |
| CTR-OBS-001 | `correlation.correlation_id`, `.request_id`, `.causation_id`, `.trace_id`, `.job_id`, `module.module_key`, `readiness.capabilities.capability_key`, `dependencies.dependency_key`, `sli_tags.module_key`, `sli_tags.capability_key` | WP-0A-CON-004 |
| CTR-FLG-001 | `policy_key`, `reason_key`, `audit.actor.id`, `audit.reason_key` | WP-0A-CON-003 |
| CTR-MOD-001 | `module_key`, `module_id`, `capabilities.capability_key`, `dependencies.module_key` | WP-0A-CON-003 |
| CTR-NTF-001 | `notification_id`, `message_key`, `deep_link.target_ref`, `dedupe_key` | WP-0A-CON-006 (contract owner A5) |
| CTR-USG-001 | `usage_id`, `attribution.workspace_id`, `attribution.business_profile_id`, `attribution.job_id`, `attribution.provider_key`, `cost.supersedes_usage_id` | WP-0A-CON-006 |

All seven CTR-TEN-001 fields ride inside every CTR-EVT-001 event through `tenant_context`, which is
a `$ref` to CTR-TEN-001. That includes the tenant-isolation key and its six siblings. The guard's
discovery does not follow `$ref`. Until 2026-10-06 it also read only four contracts, so its test
titled "every reference-shaped field" could not see any of the 49. It now walks every contract in
the catalog. The 49 are written into the guard as a named list, each with its owning package. A new
unbounded reference anywhere in the catalog fails CI unless it is added to that list, and so does a
listed field that its owner has bounded.

The touched-contract count also disagreed between documents (C0 F7). This RFC said four. The
package's merged range changed five contract schemas, including CTR-AUD-001 (`git show 653f699
--stat`). The manifest's former `amends_without_owning` list named thirteen contract directories
(removed in `746f80b`). Four is the number of contracts whose every reference field this package
bounded. CTR-AUD-001 was edited for its RE2 lookaheads and its two `*_ref` bounds; its other four
reference fields are in the table above.

**R-5. What a conforming bounded value may still carry (A1 S-1, S-2, S-5, S-6).**

- A conforming `event_id`, `correlation_id`, `causation_id` or `subject.id` may carry 128 opaque,
  unconstrained characters, and `idempotency_key` may carry 200. That is by design: an id must be
  opaque. These fields constrain length, not content.
- A conforming `schema_ref` admits a run of up to sixteen digits in its major-version position.
  That is the shape the repository's own PII rule classifies as a payment card, and a 13-digit Thai
  national id also fits. A producer would have to put it there deliberately. See R-2 for the
  suggestion of 24.
- CTR-JOB-001 is one of the four bounded contracts, and four of its strings are bare
  `{"type":"string"}` with no pattern and no bound: `job_type`, `lease_owner`, `progress_stage` and
  `last_error_code`. They are not reference-shaped by name, so the bound rule does not cover them.
  They were left in place. Bounding them is escalated to CTR-JOB-001's owner as a
  `required_before_freeze` item (it is also recorded on WP-0A-CON-005).
- `CTR-EVT-001.occurred_at` and five date-time siblings on the bounded contracts
  (`ctr-idm-001.created_at` and `completed_at`; `ctr-job-001.available_at`, `lease_expires_at` and
  `cancel_requested_at`) are defended only by `format: "date-time"`. JSON Schema 2020-12 makes
  `format` an annotation unless a validator opts in. This repository's validator asserts it. A
  validator that does not would accept any string. This is the same kind of precondition as the
  anchor semantics above, and the same deferred cross-validator conformance test covers it.

**R-6. Hostile form 13 is 26 characters, not 27 (A1 S-9).**

**R-7. The guard, as of 2026-10-06.** It closes C0 F1, F2, F3, F4 and F9, Q0 conditions 1-3, and A1
S-3. It still has eight tests with the same names. The changes:

- Four hostile forms are added that keep a well-formed name and change one thing, each shorter than
  the bound: a `file:///` prefix, a `javascript:` prefix, a `../../` prefix, and a lowercase letter
  class (`CTR-evt-001@1.0.0`).
- Every hostile form is also run against the schema with `schema_ref`'s `maxLength` removed, so each
  must be rejected by the shape alone. Before this, forms 05, 06 and 08 (36, 36 and 40 characters)
  were also rejected by the bound, which hid a pattern widened to admit a URL.
- The bound is pinned as behaviour: a 32-character name is accepted and a 33-character name is
  rejected.
- The bound ratchet walks the whole catalog and keeps the named list from R-4.
- The ratchet and the RE2 sweep both assert floors on what they examined (14 contracts and 76
  reference-shaped fields), so neither can pass over an empty set.
- A synthetic fragment exercises the nullable and array branches of the discovery.

Seventeen mutations were run on a disposable copy. All were killed, and the unmutated control
passed. The list is in `evidence/WP-0A-CON-007/author-conditions-closure-2026-10-06.md`.
