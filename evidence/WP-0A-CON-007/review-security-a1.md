# WP-0A-CON-007 — independent Security / Privacy review

Run: `/claude/a1_bastion` (Security/Privacy reviewer). Author is `/claude/a0_atlas`;
I did not author, review-approve, test-verify or integrate this work, and this
document is not the Reviewer or Tester verdict — those are two other runs.

Revision reviewed: `03c584b2652c74219dabca15e39a2b9c0bd487b6` (current `main`).
Package range as declared in `handoffs/WP-0A-CON-007-author-handoff.json`:
`dcb3ffc476bf8f48d249a7f5e93b7b2c37e56fc8..653f699d69f749912e9fdd6e389e5497766cf129`.
Package status at review time: `in_review`, work already merged into `main`.

Toolchain: `zsh -lc` is refused inside this agent worktree, with the message
*"a worktree-isolated agent's git operations must target its own worktree"*. I ran
`node` and `npm` directly. `node --version` reported `v24.20.0`, `npm --version`
reported `11.19.0`, matching `.node-version` and `package.json.engines`. I
substituted nothing else.

Gate G0: every specimen below is synthetic and was constructed at runtime inside a
scratch directory outside the repository. No provider was contacted, no credential
was used, and no literal credential is written into this tree. Control characters
that appeared in probe output are written here as `<LF>`, never verbatim.

Verdict: **security_approved_with_conditions**. Conditions are named exactly in
§9. Nothing this package changed made anything weaker; every rejection it claims,
it performs. The conditions are all about what the package *says* about what it
left behind.

---

## 1. Baseline

```
npm run check
EXIT=0
ℹ tests 260
ℹ pass 260
ℹ fail 0
ℹ skipped 0
```

```
node --test test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs
KIT_EXIT=0   ℹ tests 8   ℹ pass 8   ℹ fail 0   ℹ skipped 0

node --test test-kits/contracts/schema-mutation-coverage.test.mjs
KIT_EXIT=0   ℹ tests 10  ℹ pass 10  ℹ fail 0   ℹ skipped 0
```

---

## 2. The central claim, executed against the schema before and after

I reconstructed the pre-fix field exactly as RFC-2026-009 states it shipped —
`{"type":"string","minLength":1}` — from `git show dcb3ffc:contract-catalog/
shared-kernel/ctr-evt-001/schema.json`, and probed both forms through
`test-kits/contracts/json-schema-subset.mjs` with the shipped seed fixture
`contract-catalog/shared-kernel/ctr-evt-001/examples/valid.json`.

```
=== A. metadata.schema_ref, PRE-FIX reconstruction {type:string,minLength:1} ===
  01 file scheme           "file:///etc/passwd"                       ACCEPTED
  02 javascript scheme     "javascript:alert(1)"                      ACCEPTED
  03 data URI              "data:text/html;base64,PHN2Zz4="           ACCEPTED
  04 protocol-relative     "//evil.example"                           ACCEPTED
  05 https public egress   "https://public.example.invalid/exfil"     ACCEPTED
  06 HTTPS uppercased      "HTTPS://public.example.invalid/exfil"     ACCEPTED
  07 traversal             "../../../../etc/shadow"                   ACCEPTED
  08 cloud metadata        "http://169.254.169.254/latest/meta-data/" ACCEPTED
  09 gopher scheme         "gopher://x"                               ACCEPTED
  10 name + traversal      "CTR-EVT-001@1.0.0/../../secret"           ACCEPTED
  11 lowercased name       "ctr-evt-001@1.0.0"                        ACCEPTED
  12 name + trailing text  "CTR-EVT-001@1.0.0 .evil"                  ACCEPTED
  13 newline + script      "CTR-EVT-001@1.0.0<LF><script>"            ACCEPTED
  14 leading-zero version  "CTR-EVT-001@01.0.0"                       ACCEPTED
  15 template leak         "{{leak}}"                                 ACCEPTED
  16 env interpolation     "${env.SECRET}"                            ACCEPTED
  17 100000 chars          <100000 chars>                             ACCEPTED
  pre-fix accepted: 17/17

=== B. metadata.schema_ref, SHIPPED schema at this revision ===
  ... every one of the same seventeen ...          rejected
  shipped accepted: 0/17
```

The defect was real, the fix is real, and the guard's third test isolates the
bound from the shape as the acceptance criteria require. Acceptance criteria 1, 2
and 3 hold. **No finding.**

---

## 3. The bound is a length. What does the length let through?

The sibling finding — a conforming reference carrying 248 opaque, credential- and
PII-shaped characters — **does not hold for `schema_ref`**. Its `maxLength` is 32
against a pattern that fixes 12 characters and admits only digits and three
uppercase letters elsewhere:

```
=== C. what a CONFORMING schema_ref can carry at its bound ===
  maxLength = 32; longest conforming value length = 32
  conforming? true
  free characters inside a conforming value: 3 letters + 3 digits (contract id) + 16 version digits
```

It **does** hold, almost exactly, one key away. I set each string leaf on the
envelope in turn to thirteen synthetic specimens and validated the whole event.

```
field                             specimens accepted / tried
event_id                          11 / 13
event_type                         0 / 13
correlation_id                    11 / 13
causation_id                      11 / 13
idempotency_key                   12 / 13
producer.module_key                8 / 13
producer.implementation_version    8 / 13
subject.type                       8 / 13
subject.id                        11 / 13
metadata.schema_ref                0 / 13
tenant_context.workspace_id       13 / 13
tenant_context.request_id         13 / 13
tenant_context.correlation_id     13 / 13
tenant_context.actor.id           13 / 13
tenant_context.business_profile_id 13 / 13
```

The eleven accepted on `event_id`, `correlation_id`, `causation_id` and
`subject.id` are: a 20-character AWS-access-key-shaped specimen (an `AKIA` prefix
plus sixteen uppercase alphanumerics, built at runtime), a 71-character `Bearer`
authorization-header specimen, a 75-character three-segment JWT-shaped specimen, a
synthetic customer email address, a database URL carrying an inline password, a
public URL to an attacker-controlled host, the cloud instance-metadata address,
`file:///etc/passwd`, a path traversal, a protocol-relative host, and a
128-character opaque body. `idempotency_key` adds a 200-character opaque body.

### Finding S-1 — Low — the bound's residual is disclosed nowhere

The residual is genuine but modest: 128 characters (200 on `idempotency_key`) of
wholly unconstrained content on a field that reaches every event consumer, every
log line and every trace. That is not a defect in the bound — a correlation id
must be opaque — it is a defect in the record. The `x-bound-note` on all eight
bounded fields details the *rejections* at length and says nothing at all about
what a conforming value may still carry, which is the same asymmetry the sibling
review found on another contract.

### Finding S-2 — Low — a conforming `schema_ref` carries a 16-digit numeric run

Nobody has named this. The pattern's major-version position is
`(0|[1-9][0-9]*)`, and `maxLength: 32` leaves sixteen digits for it. Sixteen
digits, not starting with zero, is precisely the shape this repository's own
privacy rule classifies as customer PII.

```
=== schema_ref numeric channel ===
  16-digit run admitted in the version position? true
  a Luhn-valid, issuer-prefixed 16-digit specimen was constructed at runtime: true
  the repository's own PII rule classifies that specimen as a payment card: true
  CTR-EVT-001 accepts it inside a conforming schema_ref: true
  a Thai national id specimen fits the 13-digit version position: true
```

Verified with `isPaymentCardNumber` and `isThaiNationalId` imported directly from
`scripts/scan-repository-secrets.mjs`. The specimen was generated at runtime and
is not written here or anywhere in the tree. This is narrow and contrived — a
producer would have to put it there deliberately — but the field is named as a
*contract name* and a reader would not expect it to carry thirteen to sixteen free
digits. A `maxLength` of 24 on `schema_ref` would leave eight version digits,
close the channel, and still accept every value the catalog uses.

---

## 4. Scheme allow-lists — does `CTR-EVT-001` have that shape?

I widened `metadata.schema_ref`'s pattern to admit a public `https` URL alongside
the contract name, changing nothing else, and ran the guard.

```
pattern under test:
^(CTR-[A-Z]{3}-[0-9]{3}@(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)|https://[A-Za-z0-9./?=_-]+)$

  accepted now: "https://evil.invalid/x"   true
  accepted now: "https://a.io/?k=1"        true

node --test test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs
ℹ tests 8   ℹ pass 8   ℹ fail 0
```

**The package's own guard passes 8/8 while a public URL becomes acceptable** — the
sibling's shape, reproduced. The reason is specific to this field and worth
recording, because it is the bound masking the shape:

```
why no hostile fixture fires - length of each URL-shaped fixture against maxLength 32:
  "https://public.example.invalid/exfil"       len  36  over the bound - rejected by maxLength, not by the shape
  "HTTPS://public.example.invalid/exfil"       len  36  over the bound - rejected by maxLength, not by the shape
  "http://169.254.169.254/latest/meta-data/"   len  40  over the bound - rejected by maxLength, not by the shape
  "//evil.example"                             len  14  within the bound
  "file:///etc/passwd"                         len  18  within the bound
```

Three of the sixteen fixtures — every `http`/`https` one — are longer than the
32-character bound. They can never exercise the pattern at all; they are rejected
by `maxLength` whatever the shape says. The suite reads as sixteen shape tests and
is thirteen.

**But `CTR-EVT-001` does not have the shape at the level that matters.** The same
mutation makes the whole check red:

```
npm run check
EXIT=1
ℹ tests 260   ℹ pass 258   ℹ fail 2

✖ no constraint value changes without the change being written down
  AssertionError: constraint value(s) changed without being recorded:
    ctr-evt-001 — constraint surface changed (declared 8cd2878cb3b9c1d6, measured 5b9ebac6e7b06226)
        + .properties.metadata.properties.schema_ref.pattern = "^(CTR-[A-Z]{3}-[0-9]{3}@...|https://[A-Za-z0-9./?=_-]+)$"
        - .properties.metadata.properties.schema_ref.pattern = "^CTR-[A-Z]{3}-[0-9]{3}@...$"
✖ the mutation-coverage ratchet notices three unrelated reversals
```

`test-kits/contracts/schema-mutation-coverage.test.mjs:1855` catches it, at
`:1890`. I restored the schema afterwards; `git status --porcelain` is empty.

### Finding S-3 — Low — the guard's negative fixtures do not discriminate a scheme widening

The catalog-wide constraint-surface ratchet covers this, so it is Low rather than
Moderate. It is still worth fixing where it lives: the ratchet *detects and
reports*, it does not *prevent*, and it passes the moment the recorded digest is
updated. A reviewer reading only this package's guard would conclude the sixteen
forms defend the shape. Three of them defend the bound.

---

## 5. The whole-system surface

`CTR-EVT-001.payload` is `{"type":"object","maxProperties":0}` and
`CTR-AUD-001.details` is `{"type":"object","maxProperties":0}` at this revision.
Both are intact. **Nothing this package touched weakened an equivalent control**,
and I checked that structurally rather than by reading: I diffed the constraint
surface of all five schemas the package changed across its own range.

```
ctr-api-001: +6 added, 0 value-changed, 2 REMOVED
  REMOVED  .properties.accepted.properties.status_ref.minLength = 1
  REMOVED  .properties.accepted.properties.deep_link_ref.minLength = 1
ctr-aud-001: +1 added, 2 value-changed, 0 REMOVED
  CHANGED  change.before_ref.pattern: lookahead form -> lookahead-free form
  CHANGED  change.after_ref.pattern:  lookahead form -> lookahead-free form
ctr-evt-001: +11 added, 1 value-changed, 1 REMOVED
  REMOVED  .properties.metadata.properties.schema_ref.minLength = 1
ctr-idm-001: +4 added, 0 value-changed, 2 REMOVED
  REMOVED  .properties.scope.properties.operation.minLength = 1
  REMOVED  .properties.result_ref.minLength = 1
ctr-job-001: +4 added, 0 value-changed, 2 REMOVED
  REMOVED  .properties.input_ref.minLength = 1
  REMOVED  .properties.result_ref.minLength = 1
```

Two removals are security-relevant and both check out.

**The `CTR-AUD-001` anti-traversal lookaheads.** This package stripped `(?!/)` and
`(?!.*\.\.)` from `change.before_ref` and `change.after_ref` for RE2 portability —
on a contract it does not own, and RFC-2026-009 never mentions `CTR-AUD-001`. I
did not take the "the body grammar already forbids it" argument on trust:

```
=== CTR-AUD-001 change.before_ref: lookahead form vs the shipped lookahead-free form ===
  targeted traversal specimens: 15, divergences: 0
  differential fuzz: 400000 strings, 41451 accepted by the shipped pattern, 0 divergences
```

Targeted specimens included `snapshot:/etc/passwd`, `snapshot:../../etc/passwd`,
`snapshot:a/../../b`, `snapshot:a//b`, `record://x`, `snapshot:....//x` and
`snapshot:a/..%2f..`. Zero divergence. The removal is behaviour-preserving. **No
finding.**

**The seven removed `minLength: 1` constraints.** Each is claimed unreachable. I
searched every code point below U+2100 for a single character each shipped pattern
accepts:

```
  ctr-api-001.accepted.status_ref:     shortest accepted 1-char value=none   empty string accepted=false
  ctr-api-001.accepted.deep_link_ref:  shortest accepted 1-char value=none   empty string accepted=false
  ctr-evt-001.metadata.schema_ref:     shortest accepted 1-char value=none   empty string accepted=false
  ctr-idm-001.scope.operation:         shortest accepted 1-char value=none   empty string accepted=false
  ctr-idm-001.result_ref:              shortest accepted 1-char value=none   empty string accepted=false
  ctr-job-001.input_ref:               shortest accepted 1-char value=none   empty string accepted=false
  ctr-job-001.result_ref:              shortest accepted 1-char value=none   empty string accepted=false
```

All seven genuinely unreachable; no instance distinguishes the schemas. **No
finding.**

### Finding S-4 — Moderate — the envelope's own `tenant_context` is unbounded, and the guard cannot see it

`CTR-EVT-001.tenant_context` is `{"$ref":"../ctr-ten-001/schema.json"}`, and
`CTR-TEN-001` bounds nothing:

```
ctr-ten-001     workspace_id                UNBOUNDED   no pattern
ctr-ten-001     business_profile_id         UNBOUNDED   no pattern
ctr-ten-001     page_context_profile_id     UNBOUNDED   no pattern
ctr-ten-001     actor.id                    UNBOUNDED   no pattern
ctr-ten-001     request_id                  UNBOUNDED   no pattern
ctr-ten-001     correlation_id              UNBOUNDED   no pattern
ctr-ten-001     causation_id                UNBOUNDED   no pattern
```

All seven ride *inside this envelope*. Five of them I drove directly, and each
accepted 13/13 specimens including the 100 000-character body (§3 table).

The guard cannot see any of them, because `referenceFields` walks `properties` and
never follows `$ref`. Running the shipped predicate verbatim:

```
the shipped guard discovers, on CTR-EVT-001:
  causation_id, correlation_id, event_id, idempotency_key,
  metadata.schema_ref, producer.module_key, subject.id

tenant_context is declared as: {"$ref":"../ctr-ten-001/schema.json"}
reference-shaped fields the guard reaches under tenant_context: 0
```

So the test titled *"every reference-shaped field in the contracts this package
touches carries an upper bound"* is green while seven unbounded reference fields
sit inside a contract it touches. RFC-2026-009 discloses **one** of the seven
(`workspace_id`) and says nothing about the other six or about the traversal
limitation that hides them. Fixing `CTR-TEN-001` is correctly out of scope;
disclosing the other six, and the `$ref` blind spot in the guard's own title, is
not.

### Finding S-5 — Moderate — four wholly unconstrained strings on a contract this package did bound

`CTR-JOB-001` is one of the four contracts this package bounded. Four of its string
fields carry no pattern, no format and no bound — they are bare `{"type":"string"}`:

```
seed fixture: ctr-job-001/examples/valid.json, accepted by its own schema: true

field                     specimens accepted / tried
  job_type                 8 / 8   (declared: {"type":"string"})
  lease_owner              8 / 8   (declared: {"type":"string"})
  progress_stage           8 / 8   (declared: {"type":"string"})
  last_error_code          8 / 8   (declared: {"type":"string"})

is any of the four named anywhere in RFC-2026-009?
  job_type             NOT NAMED
  lease_owner          NOT NAMED
  progress_stage       NOT NAMED
  last_error_code      NOT NAMED
```

The eight are `file:///etc/passwd`, the cloud metadata address, a public URL, a
path traversal, `javascript:alert(1)`, a synthetic customer email, an
AWS-key-shaped specimen, and a 100 000-character opaque body. `lease_owner` is an
actor-identity field.

This is precisely the lesson RFC-2026-009 records learning — *"the fields next to
the one being hardened were strictly weaker, with no pattern and no bound"* — and
it was applied to `CTR-EVT-001` (where `event_type`, `subject.type` and
`producer.implementation_version` were bounded for exactly this reason) and not to
`CTR-JOB-001`. Whether to bound them is the owner's call; leaving them out of a
section headed *"What this does NOT do"* is not.

### Finding S-6 — Low — `occurred_at` is defended only by a keyword the specification does not require anyone to assert

`occurred_at` is the one string on `CTR-EVT-001` with neither a pattern nor a
bound. Its sole constraint is `format: "date-time"`, which JSON Schema 2020-12
makes an *annotation* by default; assertion is opt-in vocabulary. This repository's
validator does assert it, so this is not exploitable here today.

```
=== occurred_at under a spec-default validator (format as annotation) ===
  a 100000-character value   this repository's validator: rejected   format-as-annotation: ACCEPTED
  file scheme                this repository's validator: rejected   format-as-annotation: ACCEPTED
  cloud metadata address     this repository's validator: rejected   format-as-annotation: ACCEPTED

REFERENCE_FIELD.test('occurred_at') = false - so the bound guard never looks at it
```

Five more date-time fields on the touched contracts are in the same position:
`ctr-idm-001.created_at`, `ctr-idm-001.completed_at`, `ctr-job-001.available_at`,
`ctr-job-001.lease_expires_at`, `ctr-job-001.cancel_requested_at`. This is the same
class of hazard RFC-2026-009 already documents for anchor semantics — a defence
that holds only under a precondition about the consumer's validator — and it is
undocumented.

---

## 6. Claims versus artifacts

I checked every security-bearing assertion in `architecture/decisions/
RFC-2026-009-reference-bounds.md` and in the `x-source` / `x-bound-note`
annotations on `contract-catalog/shared-kernel/ctr-evt-001/schema.json`.

**Verified true**

- *"Twenty-four fields across four contracts — of which twenty-one are
  reference-shaped … and three (`event_type`, `subject.type`,
  `producer.implementation_version`)."* Computed from the shipped schemas with the
  guard's own name rule:
  ```
    bounded string fields in the four touched contracts: 24
    of which reference-shaped by the guard's own name rule: 21
    bounded but NOT reference-shaped: 3 -> ctr-evt-001.event_type,
      ctr-evt-001.producer.implementation_version, ctr-evt-001.subject.type
  ```
  Exact, including which three.
- *"the pattern already requires at least seventeen characters"* — shortest
  matching value is 17; no 16-character value matches.
- *"`CTR-TEN-001.workspace_id` is still unbounded and unconstrained"* — true.
- *"`CTR-NTF-001.deep_link.target_ref` is still unbounded"* — true; it carries an
  allow-listed scheme set `(app|content|asset|job)` and no `maxLength`.
- The anchor-semantics caveat. I reproduced the mechanism it describes: the
  shipped pattern rejects hostile form 13 under ECMA-262 anchors and accepts it
  the moment the same anchors are read as multiline. Correctly disclosed as
  inherited rather than introduced.
- **No regex drift.** The sibling defect — an Approved RFC printing a pattern that
  exists nowhere in the tree — does **not** occur here. `RFC-2026-009` prints no
  pattern literal at all; it states the shape in words and says why. The only
  regex-shaped text in the document is the sentence about `^`/`$` semantics.

**Verified false**

### Finding S-7 — Moderate — the `x-bound-note` on eight fields of the system-wide envelope is factually wrong, in both directions

The note, repeated verbatim on `event_id`, `event_type`, `producer.module_key`,
`producer.implementation_version`, `subject.type`, `subject.id`, `correlation_id`
and `idempotency_key`, reads:

> "…the fields NEXT to the one this package hardened were strictly weaker than it:
> no pattern AND no bound, so each accepted a 100000-character value and four of
> the sixteen hostile forms named in RFC-2026-009."

Probed against the actual pre-fix schema:

```
PRE-FIX schema (parent of 653f699)
field                             pattern?  hostile accepted  100000-char accepted
event_id                          no        16 / 16           true
event_type                        yes        0 / 16           false
correlation_id                    no        16 / 16           true
causation_id                      no        16 / 16           true
idempotency_key                   no        16 / 16           true
producer.module_key               no        16 / 16           true
producer.implementation_version   no        16 / 16           true
subject.type                      no        16 / 16           true
subject.id                        no        16 / 16           true
```

Two errors. It **understates** the exposure on seven fields by a factor of four —
sixteen of sixteen, not four of sixteen — and it is **wrong in every particular**
on `event_type`, which did have a pattern, accepted none of the sixteen, and
rejected the long specimen. RFC-2026-009 itself gets `event_type` right
("bounded because they were unbounded and adjacent, not because they are
references"); the annotation contradicts the RFC it cites. A consumer reading the
note concludes twelve of the sixteen were already blocked before the fix. They
were not.

### Finding S-8 — Moderate — "the longest reference in the catalog is 51 characters" is wrong, and open blocker 3 invites a reviewer to act on it

The figure appears in RFC-2026-009 ("The longest reference actually used anywhere
in the catalog is 51 characters") and verbatim in `work-packages/
WP-0A-CON-007.json` open blocker 3. It is the sole stated evidence that 256 is
"well above real use". Measured over every reference-named field in every `valid-`
fixture in the catalog:

```
longest values in reference-NAMED fields, valid fixtures only:
   85  dedupe_key            ctr-usg-001/valid-provider-reported.json
   81  dedupe_key            ctr-usg-001/valid-estimated-storage.json
   77  dedupe_key            ctr-usg-001/valid-estimated-ai-tokens.json
   48  input_ref             ctr-job-001/valid.json
   46  change.before_ref     ctr-aud-001/valid-business-profile-deleted.json
  distinct values examined: 262
  count strictly longer than the 51 the RFC and open blocker 3 both claim: 3
```

The true maximum is 85, not 51, and no value of exactly 51 characters exists. The
error is in the safe direction for the bound itself — 256 still clears 85 — but
open blocker 3 says *"a reviewer who knows the real ceiling should set it"*, and a
reviewer who sets it from the RFC's own figure would reject three
contract-conforming fixtures that ship in this repository today. A wrong number in
a blocker that instructs someone to act on it is the defect, not the slack in the
bound.

### Finding S-9 — Informational — an off-by-one in the anchor-semantics claim

RFC-2026-009 says hostile form 13 defeats the constraint "in 27 characters".
Measured: `form 13 length = 26`. Immaterial to the argument, which holds.

### Finding S-10 — Moderate — "What this does NOT do" enumerates about twenty of forty-nine

Reference-shaped fields still unbounded in the ten contracts this package did not
touch, counted from the shipped schemas: **49**. RFC-2026-009 names roughly twenty,
by field or by class. Absent from the disclosure, and security-bearing:

- `ctr-ten-001` — six of the seven (only `workspace_id` is named), all reachable
  through this envelope. See S-4.
- `ctr-sec-001.scope.workspace_id`, `scope.business_profile_id`,
  `scope.page_context_profile_id`, `rotation.owner.id`, `revocation.actor.id`,
  `revocation.reason_key`, `correlation_id` — only `scope.capability_key` is
  named. These are the tenant-scope keys on the *security* contract.
- `ctr-obs-001.correlation.{correlation_id,request_id,causation_id,trace_id,job_id}`
  — the document names "the `ctr-obs-001` key fields", which does not reach them.
- `ctr-ntf-001.notification_id`, `message_key`, `dedupe_key`; `ctr-mod-001.module_id`,
  `dependencies.module_key`; `ctr-flg-001.audit.actor.id`, `audit.reason_key`.

The document also asserts it *corrected* an earlier over-claim in this exact
section ("The earlier draft of this document claimed 'every reference field in the
catalog' was addressed. That was never true of what shipped, and the claim is
corrected rather than the scope quietly widened."). The correction is still
incomplete, and a section that advertises itself as the honest residual is the
worst place for that.

---

## 7. The three open blockers

1. **"RFC-2026-009 is Proposed and requires Product Owner disposition."**
   **Not open — stale.** `git log` shows `82aae60 docs(decisions): Product Owner
   approves RFC-2026-003 through -009`, dated 2026-09-02, and the RFC header reads
   `Status: Approved 2026-09-02 by the Product Owner`. The manifest was not
   updated. Not security-bearing; a manifest that reports a resolved blocker as
   open costs a reviewer the same time as one that hides an open blocker, in the
   opposite direction.

2. **"`CTR-NTF-001 deep_link.target_ref` remains unbounded. It belongs to A5 and is
   reported, not fixed."** **Genuinely open, security-bearing, correctly scoped.**
   Verified: pattern present with an allow-listed scheme set, no `maxLength`. The
   exposure is an unbounded opaque body, not public egress — the scheme set is
   closed. Reporting rather than fixing is the right call under §4.1. The
   *neighbouring* fields on the same contract (`notification_id`, `message_key`,
   `dedupe_key`) are also unbounded and are not reported at all; see S-10.

3. **"The 256-character bound is a DECLARED INFERENCE. The longest reference in the
   catalog is 51 characters."** **Genuinely open, security-bearing, and its stated
   evidence is wrong.** See S-8. This blocker must not be closed by anyone acting
   on the number it prints.

---

## 8. Findings, by severity

| # | Severity | Finding |
|---|---|---|
| S-4 | Moderate | The envelope's own `tenant_context` carries seven unbounded reference fields; the guard's `referenceFields` never follows `$ref`, so its "every reference-shaped field" test is green over them. Six of the seven undisclosed. |
| S-5 | Moderate | `CTR-JOB-001.job_type`, `lease_owner`, `progress_stage`, `last_error_code` are bare `{"type":"string"}` on a contract this package bounded; 8/8 hostile specimens accepted; named nowhere. |
| S-7 | Moderate | The `x-bound-note` replicated on eight envelope fields is false: "four of the sixteen" was sixteen of sixteen, and every clause of it is wrong on `event_type`. |
| S-8 | Moderate | "The longest reference in the catalog is 51 characters" is wrong (85), and open blocker 3 instructs a reviewer to set the bound from it. |
| S-10 | Moderate | "What this does NOT do" names about twenty of the forty-nine unbounded reference fields, omitting `ctr-sec-001`'s tenant-scope keys and six of `ctr-ten-001`'s. |
| S-1 | Low | The residual a conforming bounded value may carry — 128 or 200 opaque characters — is disclosed nowhere, while the rejections are documented at length. |
| S-2 | Low | A conforming `schema_ref` admits a 16-digit run in its version position, the shape this repository's own rule classifies as a payment card; a 13-digit Thai national id also fits. |
| S-3 | Low | Three of the sixteen hostile fixtures exceed `maxLength: 32` and are rejected by the bound, never the shape; the guard passes 8/8 under a scheme widening. The catalog ratchet catches it, the package's own guard does not. |
| S-6 | Low | `occurred_at` and five sibling date-time fields are unbounded strings defended only by `format`, which JSON Schema does not require a validator to assert. |
| S-9 | Informational | "27 characters" is 26. |

No stop-the-line finding. No secret exposure, no tenant leakage, no duplicate
external side effect, no migration or deletion risk. The package's data
classification (`synthetic-only`), `secrets_required: false` and
`network_policy: deny-unless-declared` are accurate; `scripts/scan-repository-secrets.mjs`
runs clean inside `npm run check` at this revision.

---

## 9. Verdict

**security_approved_with_conditions.**

The construction is sound and I can defend approving it. The pre-fix defect was
real and is closed against every form probed; the bound is tested independently of
the shape; two constraint removals that could have weakened controls are
provably behaviour-preserving; the `maxProperties: 0` bags on `CTR-EVT-001.payload`
and `CTR-AUD-001.details` are untouched; a silent scheme widening turns the check
red; and the RFC prints no pattern that does not exist. I did not find a way to get
a credential, a public URL or a traversal into `metadata.schema_ref`.

What I cannot approve unconditionally is the record. Five Moderate findings are all
the same defect: this package's documents describe a residual that is smaller,
and a history that is milder, than what the artifacts show. `CONTRIBUTING_AGENTS.md`
makes these documents source of truth for the next package, and a consumer building
on S-7's "four of the sixteen" or S-8's "51 characters" builds on something false.

Conditions, all inside paths this package owns or already amends. None requires a
schema change; none is a fix I have made:

1. Correct the `x-bound-note` in
   `contract-catalog/shared-kernel/ctr-evt-001/schema.json`. "Four of the sixteen"
   is sixteen of sixteen for the seven patternless fields, and the note as written
   is false on `event_type`, which had a pattern and accepted none. Give
   `event_type` its own note or drop it from the shared one. (S-7)
2. Correct "the longest reference actually used anywhere in the catalog is 51
   characters" in `architecture/decisions/RFC-2026-009-reference-bounds.md` and in
   open blocker 3 of `work-packages/WP-0A-CON-007.json`. The measured maximum in a
   `valid-` fixture is 85 (`ctr-usg-001.dedupe_key`). Blocker 3 must not be closed
   by setting the bound from the figure it currently prints. (S-8)
3. In RFC-2026-009 "What this does NOT do", record that
   `CTR-EVT-001.tenant_context` is a `$ref` to `CTR-TEN-001` and that **all seven**
   of its reference fields are unbounded and ride inside this envelope — not
   `workspace_id` alone — and that the guard's discovery does not traverse `$ref`,
   so its "every reference-shaped field" test cannot see them. (S-4)
4. In the same section, name `CTR-JOB-001.job_type`, `lease_owner`,
   `progress_stage` and `last_error_code` as unconstrained strings left in place on
   a contract this package bounded, or bound them. (S-5)
5. In the same section, state that the residual is 49 reference-shaped fields
   across the ten untouched contracts, and add `ctr-sec-001`'s tenant-scope keys
   (`scope.workspace_id`, `scope.business_profile_id`,
   `scope.page_context_profile_id`, `rotation.owner.id`, `revocation.actor.id`,
   `revocation.reason_key`, `correlation_id`) and the `ctr-obs-001.correlation.*`
   ids, which the current phrasing does not reach. (S-10)
6. Record, beside the existing bound rationale, what a conforming bounded value may
   still carry: 128 characters on `event_id`, `correlation_id`, `causation_id` and
   `subject.id`, 200 on `idempotency_key`, opaque and unconstrained; and that a
   conforming `schema_ref` admits a 13-to-16-digit numeric run. Lowering
   `schema_ref` to `maxLength: 24` would close the numeric channel and still accept
   every value the catalog uses; that is a suggestion, not a condition. (S-1, S-2)
7. Record in the guard, at
   `test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs`, that hostile forms
   05, 06 and 08 are longer than `maxLength: 32` and therefore test the bound and
   not the shape, so the suite is not sixteen shape tests. (S-3)
8. Update open blocker 1 in `work-packages/WP-0A-CON-007.json`: RFC-2026-009 was
   approved by the Product Owner on 2026-09-02 in `82aae60`. (§7)

Not conditions of this package, named rather than fixed, per the brief:

- `CTR-TEN-001`'s seven unbounded fields belong to another package. They are the
  largest single residual on this envelope and the tenant-isolation key is among
  them.
- `CTR-NTF-001` belongs to A5; `deep_link.target_ref` and its three unbounded
  neighbours are reported, not fixed.
- `occurred_at` and the five sibling date-time fields depend on `format` being
  asserted. A cross-validator conformance test belongs with the first non-JS
  consumer, alongside the anchor-semantics test RFC-2026-009 already defers.

---

## 10. Attestation

I am `/claude/a1_bastion`, the Security/Privacy reviewer named in
`work-packages/WP-0A-CON-007.json`. I am not the Author, the Reviewer, the Tester
or the Integration Owner of this package, and I have not performed their checks or
recorded their verdicts. Everything above I executed at revision `03c584b` on this
worktree; every quoted block is output I observed, not output I expected. The
schema mutation in §4 was reverted and `git status --porcelain` was empty before I
wrote this file. I made no change outside `evidence/WP-0A-CON-007/`.

This review does not approve Gate G0, does not authorize a merge, and does not
change the package status.
