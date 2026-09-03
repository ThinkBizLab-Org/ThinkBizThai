# WP-0A-CON-005 — Security / Privacy review

Package: CTR-JOB-001 reference-field hardening
Security reviewer run: `/claude/a1_bastion` (declared `role_assignments.security_reviewer_agent_run_id`)
Author run under review: `/claude/a0_atlas` — a different run. I did not author any part of
this package and this is the first artifact I have written in this repository.
Protocol version: `1.0.0`
Gate: G0 — synthetic only. No provider integration, no credential, no network call was made,
and no real credential was written into this tree.

Revision reviewed: `1478f34edc8c61a5a004610e5cb9f298b5562e98` (`main`), the state in which
this package's work is **already merged**. Where a finding concerns what this package itself
changed rather than the state of the tree, I measured the package's own delta:
`b47aece~1 → 64d9c65`, the two commits carrying `Work-package: WP-0A-CON-005`.

**This is Security/Privacy evidence only.** It is not the Reviewer verdict, not Tester
evidence, and not integration verification. It approves no merge, no gate, and no contract
freeze-level or version movement. A separate run supplies the Reviewer half; I did not read
its work and did not coordinate with it.

---

## Toolchain and the refused shell

`zsh -lc 'node --version && npm --version'` was **refused** in this worktree:

```
This agent is isolated in the worktree /Users/bank/ThinkBizThai/.claude/worktrees/agent-afe41d00dd61565d4,
but this command runs zsh in a plain command; what it reads or is handed as shell text cannot be
shown not to run git. Refusing to run it — a worktree-isolated agent's git operations must target
its own worktree.
```

Stating this plainly, as the assignment requires: I could not use `zsh -lc`. I ran `node` and
`npm` directly and confirmed the pinned toolchain before doing anything else. I substituted
nothing else — no alternate Node, no package manager, no dependency, no network.

```
$ node --version
v24.20.0
$ npm --version
11.19.0
```

## `npm run verify`, before and after

```
before:  clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0
after:   clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0
```

`git status --short` is empty at both points apart from this file. I changed no file outside
`evidence/WP-0A-CON-005/**`.

---

## What I executed

Four probe scripts, run from a scratch directory outside the repository, driving the
repository's own `test-kits/contracts/json-schema-subset.mjs` against the **shipped**
`contract-catalog/shared-kernel/ctr-job-001/schema.json` with `../ctr-ten-001/schema.json`
resolved, so `tenant_context` is really validated and not skipped. Every credential-shaped
specimen was **constructed at runtime by concatenation**; no literal credential exists in any
file I wrote, and every credential body below is printed masked as `first6…last4 (len N)`.
Specimens are shape-only synthetic strings from a seeded generator — they are not keys, and
they authenticate to nothing.

I did not reason about the schema and then report the reasoning. Everything marked ACCEPTED
or rejected below is a validator result.

---

## 1. What can a reference field carry that it should not?

### 1.1 The forms the hardening was written to close — all rejected

36 probes, 18 forms × 2 fields. Every one rejected, and every rejection names the field it is
about (asserted, not eyeballed).

```
rejected | input_ref  | lowercase https                | https://public.example.invalid/x
rejected | input_ref  | uppercase scheme               | HTTPS://public.example.invalid/x
rejected | input_ref  | protocol-relative authority    | //public.example.invalid/x
rejected | input_ref  | data:                          | data:text/plain;base64,AA==
rejected | input_ref  | file:                          | file:///etc/passwd
rejected | input_ref  | javascript:                    | javascript:alert(1)
rejected | input_ref  | bare traversal                 | ../../../etc/passwd
rejected | input_ref  | scheme + traversal body        | result:../../../etc/passwd
rejected | input_ref  | scheme + absolute path body    | status:/proc/self/environ
rejected | input_ref  | scheme + dotfile               | content:/.env
rejected | input_ref  | scheme + authority             | content://attacker.example.invalid/exfil
rejected | input_ref  | over maxLength 256             | asset:aaaa… (len 306)
rejected | input_ref  | unicode-escaped traversal      | asset:%2e%2e%2fetc%2fpasswd
… identical results for result_ref …
```

Five forms I added that the package did not list, all rejected on both fields:

```
rejected | input_ref  | newline smuggling (LF)         | asset:ok\nHTTPS://public.example.invalid/x
rejected | input_ref  | newline smuggling (CR)         | asset:ok\rHTTPS://public.example.invalid/x
rejected | input_ref  | U+2028 LINE SEPARATOR          | asset:ok HTTPS://…       len 41
rejected | input_ref  | U+2029 PARAGRAPH SEPARATOR     | asset:ok HTTPS://…       len 41
rejected | input_ref  | NUL U+0000                     | asset:ok\0/../../etc/passwd  (literal NUL, shown escaped)
rejected | input_ref  | trailing LF only               | asset:ok\n                    len 9
rejected | input_ref  | trailing CR only               | asset:ok\r                    len 9
rejected | input_ref  | Cyrillic homoglyph scheme      | аsset:input/x   (U+0430 CYRILLIC A)
```

The LF and trailing-newline rejections hold because ECMAScript `$` anchors at end of input.
The Tester recorded the same dialect dependency; I confirm it and repeat the consequence: in a
PCRE-family engine `$` matches before a trailing newline, so **any port of this constraint
outside Node must re-test the trailing-LF and CRLF forms specifically.** That is a real
portability hazard, not a defect in what shipped.

**The hardening does what it says on these forms.** That part of the package is sound and I
say so without qualification.

### 1.2 What a *conforming* reference still carries — FINDING S5

The allow-list constrains **shape**, not **content**. Executed, both fields:

```
ACCEPTED | input_ref  | credential body, OpenAI-legacy shape    | conten…MWY6 (len 59)
ACCEPTED | input_ref  | credential body, Stripe-live shape      | asset:…UOEg (len 38)
ACCEPTED | input_ref  | credential body, GitHub-PAT shape       | result…ykG2 (len 47)
ACCEPTED | input_ref  | opaque bearer-shaped 64-char body       | job:gg…uk4c (len 68)
ACCEPTED | input_ref  | Thai mobile number as the body          | conten…(masked) (len 18)
ACCEPTED | input_ref  | customer email, dot-encoded             | conten…alid (len 41)
ACCEPTED | input_ref  | public host reachable after normalising | conten…xfil (len 36)
ACCEPTED | input_ref  | 256-char body at maxLength              | content:Ab3xQ_z-…  (len 256)
… identical results for result_ref …
```

`maxLength: 256` with the scheme `content:` leaves **248 body characters** — more than any
credential format in `scripts/scan-repository-secrets.mjs` needs. The body charset
`[A-Za-z0-9_-]` is exactly base64url minus padding.

This is the same limitation CTR-SEC-001 states about itself, in `x-opacity-limitation`:
*"JSON Schema cannot distinguish a reference from the thing it refers to, and no shape rule
available here can, so none is invented."* That is the honest position and I do not ask this
package to invent one.

What I do record is the asymmetry: **CTR-SEC-001 writes that limitation into the contract;
CTR-JOB-001 writes nothing.** `contract-catalog/shared-kernel/ctr-job-001/schema.json`
`properties.input_ref.x-reference-rule` runs to eleven lines about what the pattern rejects
and says nothing about what a conforming body may still be. It is not a *false* claim — I
checked, and nothing in CTR-JOB-001 asserts credential or content exclusion — but a reader who
takes `x-reference-rule` as the field's security statement will not learn from it that
`content:<248 opaque characters>` is a valid `input_ref`.

**Severity: Medium.** No false annotation; an undisclosed residual on the field this package
exists to harden.

---

## 2. Tenant isolation — FINDING S4, and blocker 9 confirmed genuinely open

Executed:

```
ACCEPTED | cross-tenant   | workspace_id=workspace-AAAA, input_ref and result_ref
                          | both name workspace.BBBB/private/customer-export
ACCEPTED | tenant         | workspace_id = single character 'x'
```

Nothing binds a reference to the tenant that owns it. A job document may name another
workspace's object and the envelope accepts it. `contract-catalog/shared-kernel/ctr-ten-001/schema.json`
declares `workspace_id` as `{"type":"string","minLength":1}` — no pattern, no bound — so the
claimed scope is itself unconstrained.

This is **correctly and fully disclosed**. RFC-2026-006 Limitations: *"A reference of the
correct shape naming another tenant's object passes, because the envelope carries no binding
between `tenant_context.workspace_id` and the reference body. That binding is not invented
here."* `work-packages/WP-0A-CON-005.json` open blocker 9 says the same. And it is bounded by
`contract-catalog/shared-kernel/ctr-sec-001/schema.json`
`properties.scope.x-cross-tenant-limitation`, which records that *"JSON Schema cannot compare
one property's value against another's"* and declares the gap in `untestable_by_schema` —
*"NOT claimed as materialized."*

So the claim and the artifact agree, and the limit is a real property of the validator rather
than an excuse. **I confirm blocker 9 is genuinely open, correctly stated, and not closeable
in this contract.** Enforcement belongs to RLS and the application port. It must not be
allowed to become a claimed control by omission when CTR-JOB-001 advances past Candidate.

**Severity: Medium** — accurately disclosed, unresolved, and load-bearing before freeze.

---

## 3. The redaction surfaces

`contract-catalog/shared-kernel/ctr-aud-001/schema.json` holds `details` at
`maxProperties: 0` with the annotation *"A free-form bag is how a secret or a page of user
content reaches an audit log."* I looked for CTR-JOB-001's equivalent.

### 3.1 In that exact shape — clean

```
rejected | root           | undeclared top-level property 'details'
rejected | tenant_context | undeclared nested property 'leaked'
```

Root and `tenant_context` are both `additionalProperties: false`, enforced. **CTR-JOB-001 has
no free-form object bag.** Good.

### 3.2 In a different shape — FINDING S3

The same hole exists as unbounded free text. Four properties are
`{"type":"string","minLength":1}` with **no `maxLength` and no `pattern`**:

```
  job_type          minLength=1  maxLength=ABSENT  pattern=no
  lease_owner       minLength=1  maxLength=ABSENT  pattern=no
  progress_stage    minLength=1  maxLength=ABSENT  pattern=no
  last_error_code   minLength=1  maxLength=ABSENT  pattern=no
```

Executed against each of the four:

```
ACCEPTED | job_type        | 100,000-character value              | AAAAAA…AAAA (len 100000)
ACCEPTED | job_type        | public URL                           | https:…xfil (len 36)
ACCEPTED | job_type        | credential body, OpenAI-legacy shape | sk-wOQ…MWY6 (len 51)
ACCEPTED | job_type        | customer email address               | somebo…alid (len 33)
ACCEPTED | job_type        | Thai mobile number                   | (masked, 10 digits)
ACCEPTED | job_type        | a page of user content (2,000 chars) | ข้อควา…ค้า (len 1960)
… identical results for lease_owner, progress_stage, last_error_code …
```

For contrast, the two fields that *were* bounded:

```
rejected | job_id     | 100,000-character value | (maxLength 128)
rejected | dedupe_key | 100,000-character value | (maxLength 128)
```

Those two carry an `x-bound-note` in the same file reciting precisely this reasoning:
*"Bounded because independent security review found reference-shaped fields on these envelopes
with no pattern AND no bound, so each accepted a 100000-character value."* The reasoning was
applied to two fields and not to the other four in the same schema. `progress_stage` and
`last_error_code` are the two most likely to be written from a caught exception or a provider
response — the classic path by which a token or a page of user content reaches a queue row and
then a log.

This is **not introduced by this package** and closing it is outside its scope. It is also not
recorded in its fifteen open blockers, and it is the CTR-AUD-001 `details` hole in another
shape on the very envelope this package was hardening. Catalog-wide the same sweep finds 75
unbounded free-text strings across all fourteen contracts.

**Severity: Medium**, undisclosed. Named here, not fixed — the file is outside my writable paths.

### 3.3 Numeric bounds — FINDING S8, previously unnamed

Nobody has named this. Executed:

```
ACCEPTED | max_attempts    | retry storm: one billion attempts       | 1000000000
ACCEPTED | max_attempts    | max safe integer attempts               | 9007199254740991
ACCEPTED | timeout_seconds | timeout of 1e12 seconds (~31,700 years) | 1000000000000
ACCEPTED | priority        | priority far above any queue band       | 9007199254740991
ACCEPTED | priority        | negative priority                       | -9007199254740991
ACCEPTED | attempt         | attempt beyond max_attempts             | 999999999

  priority          minimum=ABSENT  maximum=ABSENT
  max_attempts      minimum=1       maximum=ABSENT
  timeout_seconds   minimum=1       maximum=ABSENT
  attempt           minimum=0       maximum=ABSENT
  progress_percent  minimum=0       maximum=100
```

`progress_percent` is bounded at both ends; nothing else is bounded above. A valid job envelope
may declare a billion attempts, a timeout longer than recorded history, or a priority that
outranks every band a scheduler defines — and `attempt` may exceed `max_attempts`, which the
validator cannot catch for the `untestable_by_schema` reason CTR-SEC-001 already records.

The security character is availability and fairness, not confidentiality: a retry-storm and
queue-starvation shape expressible in a conforming document. It is not this package's defect
and not in its scope. **Severity: Low** at G0, where nothing consumes the envelope, and it
should be dispositioned by the contract owner before anything does.

---

## 4. Claims versus artifacts

I checked every security property the RFC or an `x-` annotation asserts. Each line below is a
program result, not a reading.

### 4.1 Claims that hold

```
x-reference-rule "identical to the CTR-IDM-001 result_ref rule"      : true
input_ref.pattern === result_ref.pattern (the fields cannot drift)   : true
x-minlength-note "no single character matches, checked below U+2100" : true
    shortest matching string observed: job:a (len 5)
RFC Limitations "no not:{pattern} reference constraint remains in
    any of the fourteen contracts"                                   : true (0 found)
x-reference-rule "A leading slash, any `..` segment, an empty segment
    and an authority are all rejected"                               : true (§1.1)
x-reference-rule "The scheme list is closed"                         : true (§1.1)
```

The `x-reference-rule` also claims the two negative lookaheads were removed at zero cost after
*"a 400,000-string fuzz by independent testing found zero divergence."* I checked the
attribution — that fuzz is in `evidence/WP-0A-CON-005/test-verdict.md` §9(4), written by
`/claude/q0_sentinel`, so "independent testing" is accurate — and then I re-derived the
equivalence myself rather than take it:

```
exhaustive: 55555 strings over alphabet ":/.aZ9_-%@", lengths 0..4 after 5 scheme prefixes
divergences: 0
randomised: 400000 strings, divergences: 0
  "job:/x"         with-lookahead=false  lookahead-free=false
  "job:../x"       with-lookahead=false  lookahead-free=false
  "job:a..b"       with-lookahead=false  lookahead-free=false
  "job:a/../b"     with-lookahead=false  lookahead-free=false
  "asset:.."       with-lookahead=false  lookahead-free=false
  "asset:./x"      with-lookahead=false  lookahead-free=false
  "content:a.b..c" with-lookahead=false  lookahead-free=false
```

455,555 strings, zero divergence, including an exhaustive sweep of the character classes the
two forms could disagree on. **The lookahead removal is behaviour-preserving.** I state that as
my own measurement, because the finding in §5 depends on it.

### 4.2 Content-neutrality, re-derived at the package's *final* state — holds

Blocker 3 requires independent structural proof by a non-Author run. The Tester supplied one at
`b47aece`. The Author then changed the pattern again at `64d9c65`, **after** that verdict was
written, so the discharged proof describes a superseded revision. I re-derived it for the
package's final state, `b47aece~1 → 64d9c65`:

```
leaf paths before: 60   after: 67
identical: 53  removed: 7  added: 14  MODIFIED IN PLACE: 0

removed:  $.properties.input_ref.not.pattern
          $.properties.result_ref.not.pattern
          $.x-amended-by.{work_package_id,decision_record,change,
                          acknowledgement_required_from,acknowledgement_status}
added:    $.properties.{input_ref,result_ref}.{pattern,x-reference-rule}
          $.x-amended-by[0].* (5)   $.x-amended-by[1].* (5)

property key set identical: true
required list identical:     true
tenant_context.$ref:         ../ctr-ten-001/schema.json -> ../ctr-ten-001/schema.json
root additionalProperties:   false -> false
WP-0A-CON-002 record carried forward deep-equal: true
```

Same figures as the Tester's, now covering the final revision. **The content-neutrality
precondition the Candidate-amendment authority rests on is met, and blocker 3 is discharged
twice over.**

### 4.3 A claim that does not hold — FINDING S6

`architecture/decisions/RFC-2026-006-job-reference-hardening.md`, Decision 2, states the
constraint as:

```
^(job|status|result|app|asset|content):(?!/)(?!.*\.\.)[A-Za-z0-9_-]+…
```

The shipped `contract-catalog/shared-kernel/ctr-job-001/schema.json` carries:

```
^(job|status|result|app|asset|content):[A-Za-z0-9_-]+…
```

```
RFC-2026-006 Decision 2 pattern === shipped pattern : false
```

The RFC is the **approved authority document** — "Approved 2026-09-02 by the Product Owner" —
and it does not state the constraint that shipped. The change is behaviour-preserving (§4.1),
so there is no behavioural risk today. The risk is downstream: the lookahead form is exactly
what the RFC recommends porting to *"RE2, Go, and a Postgres `CHECK`"*, and an implementer
taking the pattern from the approved RFC would implement a regex that is not the one under
test. `x-reference-rule` on both fields records the removal; the RFC's own Decision does not.

**Severity: Low.** Documentation drift in an approved authority document, on the exact text a
consumer is invited to copy.

---

## 5. FINDING S1 — two Candidate contracts amended with no authorization and no record

This is the finding that governs my verdict.

Commit `64d9c65`, footer `Work-package: WP-0A-CON-005`, changed:

```
contract-catalog/shared-kernel/ctr-api-001/schema.json  | 2 +-
contract-catalog/shared-kernel/ctr-idm-001/schema.json  | 2 +-
```

Both are **Candidate 1.0.0**, owner `A0`, WP-0A-CON-001 outputs — the same package and the same
Integration Owner as CTR-JOB-001. The change is the same lookahead removal, applied to
`ctr-api-001` `accepted.status_ref` and `accepted.deep_link_ref` and to `ctr-idm-001`
`result_ref`.

Three separate records should exist for that and none does:

1. **Not in the manifest.** `work-packages/WP-0A-CON-005.json`
   `ownership.authorized_cross_package_amendments` has seven entries and neither contract is
   among them. Measured: `grep -c "ctr-api-001\|ctr-idm-001"` over the manifest returns `1` —
   the single `contract-catalog/shared-kernel/ctr-idm-001/schema.json` entry under
   `inputs.files`, where it is declared as a **read-only input**. Per `CONTRIBUTING_AGENTS.md`,
   *"Unlisted paths are read-only."*

2. **Contradicted by the approved RFC.** RFC-2026-006 "Scope explicitly excluded" names
   *"the other twelve catalog contracts"* — which is precisely these two. The Product Owner
   approved a document that excludes the change the package then made.

3. **No amendment trail on either contract.** Measured:

   ```
   ctr-api-001 x-amended-by: null   (status Candidate, version 1.0.0, owner A0)
   ctr-idm-001 x-amended-by: null   (status Candidate, version 1.0.0, owner A0)
   ```

   CTR-JOB-001 carries an `x-amended-by` array with `acknowledgement_required_from:
   /root/r0_steward` for each of its two amendments. That record **is** the change-control
   control for amending a Candidate contract from outside its owning package. These two
   contracts received a change to a security constraint and carry no record of it: no work
   package, no decision record, no acknowledgement, no reader-visible provenance.

I want to be exact about the security impact, because overstating it would be as wrong as
missing it. **The content of the change is safe.** I proved the lookahead removal
behaviour-preserving over 455,555 strings (§4.1), and it closes WP-0A-CON-002 finding R8 on
RE2 portability. Nothing became more permissive. If someone asks "did this make the system less
secure," the answer measured here is no.

The defect is that a security constraint on two Candidate contracts moved **outside the
authorization the package declares, against the exclusion the approved RFC states, and with no
amendment record on either contract.** The next reviewer diffing `ctr-idm-001` finds a changed
regex and no answer to who changed it or under what authority — which is the exact condition
CTR-JOB-001's own `x-amended-by` array exists to prevent, and which this package's headline
finding is otherwise about.

**Severity: High** (change control and provenance; not a vulnerability).

---

## 6. FINDING S2 — the control that should have caught S1 cannot read this package's manifest

Previously unnamed, and it is why S1 was possible.

`scripts/verify-branch-scope.mjs` is the repository's guard against exactly this — its own
header says it exists because *"work done on the top branch while fixing review findings quietly
accumulated changes to paths that belong to packages further down the stack."* Its
`declaredPaths()` reads:

```js
return [
  ...(ownership.writable_paths ?? []),
  ...(ownership.amends_without_owning?.paths ?? []),
];
```

It does **not** read `ownership.authorized_cross_package_amendments`, which is where
WP-0A-CON-005 records all seven of its cross-package amendments — and the package declares no
`amends_without_owning` at all. I ran the guard's own exported functions over the package's real
change set:

```
declaredPaths() reads: ownership.writable_paths + ownership.amends_without_owning.paths
  writable_paths: 5
  amends_without_owning: ABSENT
  authorized_cross_package_amendments: 7 entries — NOT read by declaredPaths()

WP-0A-CON-005 changed 14 path(s) across b47aece + 64d9c65.

undeclared() reports 9 path(s) the guard would reject (exit 73):
  contract-catalog/shared-kernel/ctr-api-001/schema.json
  contract-catalog/shared-kernel/ctr-idm-001/schema.json
  contract-catalog/shared-kernel/ctr-job-001/examples/invalid-max-attempts.json
  contract-catalog/shared-kernel/ctr-job-001/examples/invalid-public-input-ref.json
  contract-catalog/shared-kernel/ctr-job-001/examples/valid.json
  contract-catalog/shared-kernel/ctr-job-001/manifest.json
  contract-catalog/shared-kernel/ctr-job-001/schema.json
  test-kits/contracts/shared-kernel-contract-catalog.test.mjs
  test-kits/integrity-manifest.json
```

**Nine of the fourteen paths this package changed are invisible to the guard, including the two
in S1.** Seven of the nine are genuinely authorized in prose that no tool reads; two are not
authorized anywhere. The guard cannot tell those two cases apart, because it cannot see the
prose either way.

This is a split-brain in the protocol, not only in one manifest. Across the fourteen packages,
five use `amends_without_owning` (the machine-checked field) and seven use
`authorized_cross_package_amendments` (the prose field); WP-0A-CON-005 and WP-0A-A0-002 use only
the prose one. A package that records its amendments in the prose field gets no scope checking
at all, and CI stays green — 260/260 at this revision, with S1 sitting in the tree.

The same shape appears once more in this package and the Author disclosed it: blocker 2 records
that **no script, test, or CI job reads `acknowledgement_status`**, so `pending` can reach merge
unchallenged. I confirmed it — `grep -rl "acknowledgement_status"` over `scripts/` and
`.github/` returns **0** files; the only matches anywhere are prose, contracts, manifests and
one test that asserts the value is one of `pending`/`acknowledged`. Both `/root/r0_steward`
acknowledgements on CTR-JOB-001 are still `pending` at this revision, and the work is already
in `main`.

**Severity: High** (systemic control gap). Not this package's defect to fix, and it is the
reason its own defect went unseen.

---

## 7. The fifteen open blockers — which bear on security, and which are genuinely open

| # | Blocker (abridged) | Security-bearing | State at `1478f34` |
|---|---|---|---|
| 1 | `/root/r0_steward` acknowledgement pending | yes | **open** — both records still `pending`, work already merged |
| 2 | Nothing reads `acknowledgement_status` | yes | **open** — confirmed, 0 files in `scripts/` or `.github/` |
| 3 | Content-neutrality proof must be re-derived by a non-Author run | yes | **closed** — Tester at `b47aece`, and me at `64d9c65` (§4.2) |
| 4 | Heavier than RFC-2026-004; narrowing, not repair | no (disposition) | open — PO approved the RFC; Integration Owner disposition still required |
| 5 | Two CON-001 fixtures forced to change | no | closed as recorded |
| 6 | A CON-001 test had to change | no | closed as recorded |
| 7 | `test-kits/integrity-manifest.json` belongs to WP-0A-A0-002 | partly | **open** — WP-0A-A0-002 is still `in_review` |
| 8 | Scheme allow-list adopted, not decided | yes | **open** — contract-owner decision before freeze |
| 9 | No binding between `tenant_context.workspace_id` and the reference | yes | **open** — confirmed by execution (§2) |
| 10 | `ctr-evt-001` `metadata.schema_ref` unconstrained, all 16 forms accepted | yes | **closed** — now `pattern "^CTR-[A-Z]{3}-[0-9]{3}@…$"`, `maxLength 32` |
| 11 | One hostile form has a fixture; fifteen only in the guard | yes | **open** — 6 reference fixtures on disk; the guard is real and runs |
| 12 | RFC-2026-006 is Proposed, needs PO disposition | no | **closed** — approved 2026-09-02, commit `82aae60` |
| 13 | Depends on WP-0A-A0-002 and WP-0A-CON-002, both unmerged | yes | **open, and worse than stated** — both still `in_review` while this package's work is merged into `main` |
| 14 | `prefer_cross_vendor_review` not satisfied | yes | **open** — recorded exception, not waived |
| 15 | Gate G0 not passed | yes | **open** — standing |

Nine security-bearing blockers are genuinely open (1, 2, 8, 9, 11, 13, 14, 15, and 7 in part).
Three are stale and should be closed rather than carried: **3, 10 and 12.** RFC-2026-006's
Limitations section still asserts the blocker-10 gap as live and should be corrected with it.

On blocker 14 I add a note in my own voice, since it names me. Every role on this package —
Author, Reviewer, Tester, Integration Owner, Security — is an Anthropic `claude-opus-5` run.
The manifest's `cross_vendor_exception` states it plainly: *"runs sharing a vendor and a model
share a correlated blind spot."* S1 is a small piece of evidence for that. Two reviews and a
Tester verdict went over this package and none named an unrecorded amendment to two Candidate
contracts. I found it by diffing commits rather than by reading the RFC, which is a method
difference, not an insight — and the next correlated blind spot will not be one a fifth run of
the same model reliably catches either.

---

## 8. Gate G0 and data handling

- No credential, token, key, real customer identifier, private URL or provider artifact was
  written into this tree by me or, as far as I can measure, by this package. Every specimen was
  generated at runtime and printed masked.
- `npm run verify` includes `npm run scan:secrets`; it is green at this revision, before and
  after my file.
- No network call, no provider integration, no global tool, no dependency.
- Package `security_privacy` declares `synthetic-only`, `secrets_required: false`,
  `network_policy: deny-unless-declared`. All three hold in what shipped.

---

## 9. Findings

| ID | Severity | Finding | Introduced by this package |
|---|---|---|---|
| S1 | **High** | `ctr-api-001` and `ctr-idm-001` amended at `64d9c65` with no manifest authorization, no `x-amended-by` on either contract, and against RFC-2026-006's own exclusion clause. Content proven behaviour-preserving; the defect is authorization and provenance | **yes** |
| S2 | **High** | `verify-branch-scope.mjs` cannot read `authorized_cross_package_amendments`; 9 of 14 changed paths are undeclared to the only scope guard. `acknowledgement_status` is read by nothing | no — systemic |
| S3 | Medium | `job_type`, `lease_owner`, `progress_stage`, `last_error_code` unbounded and unpatterned; each accepts 100,000 characters, a credential-shaped body, an email address, a phone number, a page of user content. The CTR-AUD-001 `details` hole in a different shape, on the same envelope, undisclosed | no |
| S4 | Medium | No binding between `tenant_context.workspace_id` and a reference body; cross-tenant reference ACCEPTED. Accurately disclosed and correctly bounded by `untestable_by_schema` | no |
| S5 | Medium | A conforming reference carries up to 248 opaque body characters — credential-shaped, PII-shaped. Not a false claim, but `x-reference-rule` states the rejections at length and this residual not at all | no |
| S6 | Low | RFC-2026-006 Decision 2 states a pattern the tree does not carry, on the text it invites porting to RE2/Postgres | **yes** |
| S8 | Low | No upper bound on `max_attempts`, `timeout_seconds`, `attempt`, `job_version`; `priority` unbounded both ways. Retry-storm and queue-starvation shapes are conforming. Previously unnamed | no |

I looked for a false security annotation and did not find one. Every `x-` claim I tested is
true, and the two annotations that could most easily have overclaimed — `x-bound-note` and
`x-opacity-limitation` — go out of their way to state what they are not. That standard is met
here, and S5 and S3 are omissions against it rather than falsehoods.

---

## 10. Verdict

**security_approved_with_conditions**

The hardening itself is correct and I approve it on the merits: 36 hostile forms rejected on
both fields including 8 the package did not list, a well-formed reference still accepted, the
two patterns provably identical, content-neutrality re-derived at the final revision, and the
lookahead removal proven behaviour-preserving over 455,555 strings. The package is materially
more secure than what it replaced, and the tenant-isolation and shape-versus-content limits are
disclosed honestly rather than papered over. I did not manufacture a finding to balance that.

I cannot give it an unconditional security approval, because S1 means signing off on a change to
two Candidate contracts that no manifest authorizes, that the approved RFC excludes, and that
neither contract records. That is not a judgment about the regex; it is that the amendment
record is the control, and for those two contracts it does not exist.

### Conditions

Each is closeable by editing a file, without redoing any measurement in this package. All four
are outside my writable paths; I name them rather than make them.

- **C1.** Record the S1 amendments. Add
  `contract-catalog/shared-kernel/ctr-api-001/schema.json` and
  `contract-catalog/shared-kernel/ctr-idm-001/schema.json` to
  `work-packages/WP-0A-CON-005.json` `ownership.authorized_cross_package_amendments` with the
  exact permitted change; add an `x-amended-by` record to each of those two schemas naming
  `WP-0A-CON-005` / `RFC-2026-006-job-reference-hardening.md` with
  `acknowledgement_required_from: /root/r0_steward`; and amend RFC-2026-006's "Scope explicitly
  excluded" clause, which as approved excludes the change that was made.

- **C2.** Populate `ownership.amends_without_owning.paths` on `work-packages/WP-0A-CON-005.json`
  with all nine cross-package paths listed in §6, so `scripts/verify-branch-scope.mjs` can check
  them. `authorized_cross_package_amendments` may stay for the prose reasons; it is read by no
  tool and must not be the only record.

- **C3.** Correct RFC-2026-006 Decision 2 to the lookahead-free pattern that shipped, and
  withdraw its Limitations bullet asserting `ctr-evt-001` `metadata.schema_ref` is unconstrained
  — it now carries a pattern and `maxLength: 32`. Close stale blockers 3, 10 and 12 in
  `work-packages/WP-0A-CON-005.json` rather than carrying them.

- **C4.** Disclose S3 and S8 — add `job_type`, `lease_owner`, `progress_stage`,
  `last_error_code` (no `maxLength`, no `pattern`) and the absent numeric upper bounds to
  `work-packages/WP-0A-CON-005.json` `open_blockers`, escalated to the CTR-JOB-001 owner exactly
  as WP-0A-CON-002 escalated the reference defect to this package. **Disclosure only, not
  closure**: bounding those fields is a contract decision outside this package's scope and must
  not be smuggled in under a security condition.

S2 is **not** made a condition on this package. It is a repository-wide control gap that
WP-0A-CON-005 did not create and cannot fix from its own writable paths. It is escalated to the
owner of `scripts/verify-branch-scope.mjs` and to the Integration Owner, and I record that until
it is closed, no package declaring its amendments in `authorized_cross_package_amendments`
receives any automated scope checking at all.

### What this verdict does not do

It does not approve Gate G0, does not authorize a merge or a revert, does not advance any
contract freeze level, version or package status, and does not substitute for the Reviewer,
Tester or Integration Owner. The `/root/r0_steward` and `/claude/r0_steward` acknowledgements
remain `pending` and are read by nothing automated; under RFC-2026-002 the only control on them
is human review of the diff, and the work is already in `main`.

— `/claude/a1_bastion`, Security / Privacy reviewer, WP-0A-CON-005
