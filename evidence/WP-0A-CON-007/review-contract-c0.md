# WP-0A-CON-007 — Independent Reviewer verdict (contract and architecture)

Package: Reference fields are named and bounded.
Reviewer run: `/claude/c0_contract_reviewer`, named in
`work-packages/WP-0A-CON-007.json` `role_assignments.reviewer_agent_run_id`.
Author run under review: `/claude/a0_atlas` — a different run. I did not author, test,
integrate or gate this work, and I carry no earlier Reviewer verdict forward: before this
file the package had an author self-check and **no Reviewer, Tester or Security verdict at
all**.
Protocol version: `1.0.0`. Gate: G0 — synthetic only. No provider was contacted, no
credential was read or written, nothing was downloaded.

**Revision reviewed:** `03c584b2652c74219dabca15e39a2b9c0bd487b6` — `main` as it stands
today, not the package's own reviewed head. The package's work is already merged: its head
`653f699d69f749912e9fdd6e389e5497766cf129` reached `main` through
`959ebcc` (PR #12) and `6346271`. Everything below was measured against `03c584b`.

**This is independent Reviewer evidence only.** It approves no gate, authorizes no merge,
advances no package status and countersigns no acknowledgement. Advancing state is the
Integration Owner's act. Two other runs supply the Tester and Security halves; I did not
coordinate with them and this file speaks for neither.

---

## 0. Toolchain, and one procedural fact

`zsh -lc` was **refused in this worktree**, as the briefing anticipated:

```
$ zsh -lc 'node --version && npm --version'
This agent is isolated in the worktree /Users/bank/ThinkBizThai/.claude/worktrees/
agent-a2b227c887f865084, but this command runs zsh in a plain command; what it reads or is
handed as shell text cannot be shown not to run git. Refusing to run it — a worktree-isolated
agent's git operations must target its own worktree. Run the plain command from
/Users/bank/ThinkBizThai/.claude/worktrees/agent-a2b227c887f865084.
```

I therefore ran `node` and `npm` directly and confirmed the pinned toolchain. I substituted
nothing else — no other Node, no other package manager, no network, no global tool.

```
$ node --version        v24.20.0
$ npm --version         11.19.0
$ which node            /Users/bank/.local/node-v24.20.0/bin/node
$ which npm             /Users/bank/.local/node-v24.20.0/bin/npm
```

`npm run verify`, before any work of mine and again after:

```
$ npm run verify        (before)
clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0

$ npm run verify        (after)
clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0
```

Both declared `package_evidence` commands, on the tree as it stands:

```
$ node --test test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs
ℹ tests 8   ℹ pass 8   ℹ fail 0   ℹ skipped 0   ℹ todo 0

$ node --test test-kits/contracts/schema-mutation-coverage.test.mjs
ℹ tests 10  ℹ pass 10  ℹ fail 0   ℹ skipped 0   ℹ todo 0
```

Every probe and every mutation below was run in a **disposable copy** of
`contract-catalog/shared-kernel` and `test-kits/contracts` outside the repository. The
repository tree was never mutated: `git status --short` was empty before and after, at
`03c584b`.

**Control characters.** Two probe values contain a NUL and a U+2028. They are written in
this file as `<NUL>` and `<U+2028>`, never verbatim, so this file stays a text file git can
diff.

---

## 1. Does the bounding the RFC claims actually hold? Yes.

`contract-catalog/shared-kernel/ctr-evt-001/schema.json` declares:

```
"schema_ref": {
  "type": "string",
  "maxLength": 32,
  "pattern": "^CTR-[A-Z]{3}-[0-9]{3}@(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$"
}
```

Probed through `test-kits/contracts/json-schema-subset.mjs`, seeded from
`ctr-evt-001/examples/valid.json`, from a scratch directory.

### 1.1 The sixteen hostile forms — all rejected, each naming the field

```
rejected (schema_ref)    "file:///etc/passwd"
rejected (schema_ref)    "javascript:alert(1)"
rejected (schema_ref)    "data:text/html;base64,PHN2Zz4="
rejected (schema_ref)    "//evil.example"
rejected (schema_ref)    "https://public.example.invalid/exfil"
rejected (schema_ref)    "HTTPS://public.example.invalid/exfil"
rejected (schema_ref)    "../../../../etc/shadow"
rejected (schema_ref)    "http://169.254.169.254/latest/meta-data/"
rejected (schema_ref)    "gopher://x"
rejected (schema_ref)    "CTR-EVT-001@1.0.0/../../secret"
rejected (schema_ref)    "ctr-evt-001@1.0.0"
rejected (schema_ref)    "CTR-EVT-001@1.0.0 .evil"
rejected (schema_ref)    "CTR-EVT-001@1.0.0\n<script>"
rejected (schema_ref)    "CTR-EVT-001@01.0.0"
rejected (schema_ref)    "{{leak}}"
rejected (schema_ref)    "${env.SECRET}"

rejected (schema_ref)    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...(len 100000)
rejected (schema_ref)    "CTR-EVT-001@1.00000000000000000000000000000...(len 100006)
```

Not one was rejected for an incidental reason: every rejection names `schema_ref`.

### 1.2 The "before" claim, verified independently

The RFC, the `x-source` and the author self-check all assert the shipped schema accepted
all sixteen. I did not take that on trust. `git show 653f699^:contract-catalog/shared-kernel/
ctr-evt-001/schema.json` gives `"schema_ref": {"type":"string","minLength":1}`, and probed:

```
schema_ref as shipped BEFORE the fix: {"type":"string","minLength":1}
... 17 lines, all ACCEPTED ...
accepted 17 of 17
```

The claim is true, including the 100 000-character value. The defect was real and it is
closed.

### 1.3 Thirteen forms I constructed that are *not* in the sixteen — all rejected

```
rejected (schema_ref)    "CTR-EVT-001@1.0.0\n"            trailing newline
rejected (schema_ref)    "CTR-EVT-001@1.0.0<U+2028>"      line separator
rejected (schema_ref)    "\nCTR-EVT-001@1.0.0"            leading newline
rejected (schema_ref)    "CTR-EVT-001@1.0.0<NUL>"         NUL suffix
rejected (schema_ref)    "evil://CTR-EVT-001@1.0.0"       hostile prefix on a good name
rejected (schema_ref)    "CTR-<Cyrillic Ie>VT-001@1.0.0"  homoglyph
rejected (schema_ref)    "CTR-EVT-0001@1.0.0"             four digits
rejected (schema_ref)    "CTR-EVTX-001@1.0.0"             four letters
rejected (schema_ref)    "CTR-EVT-001@1.0"                two-part version
rejected (schema_ref)    "CTR-EVT-001@1.0.0-rc.1"         semver prerelease
rejected (schema_ref)    "CTR-EVT-001@1.0.0+build"        semver build metadata
rejected (schema_ref)    "CTR-EVT-001@"
rejected (schema_ref)    ""
```

The trailing-newline case matters: it is the ECMA-262 anchor behaviour the RFC's
"Anchor semantics are a precondition" section says the constraint depends on, and this
repository's validator honours it.

### 1.4 Values that should be accepted are accepted, and the bound is exact

```
ACCEPTED   "CTR-EVT-001@1.0.0"
ACCEPTED   "CTR-JOB-001@2.11.0"
ACCEPTED   "CTR-TEN-001@10.0.3"
ACCEPTED   "CTR-EVT-001@0.0.0"
ACCEPTED   "CTR-EVT-001@111111.111111.11111"     31 characters
ACCEPTED   "CTR-EVT-001@111111.111111.111111"    32 — the declared bound
rejected   "CTR-EVT-001@1111111.111111.111111"   33
```

The guard is not one that rejects everything. The `minLength` removal is correct: the
shortest string the pattern can match, `CTR-AAA-000@0.0.0`, is exactly 17 characters, so no
instance could ever have distinguished the schema with `minLength: 1` from the schema
without it. The RFC's "seventeen characters" is exact.

### 1.5 Claims in the RFC I checked and found true

- "Twenty-four fields across four contracts — of which twenty-one are reference-shaped by
  the discovery rule's own naming test." Running the suite's own predicate over
  `ctr-api-001`, `ctr-evt-001`, `ctr-idm-001` and `ctr-job-001` yields 6 + 7 + 4 + 4 = **21**.
  Plus the three named non-references, 24. Both numbers check out.
- **RFC-2026-009 has not drifted the way RFC-2026-006 did.** The sibling finding was an
  Approved decision printing a regex that exists nowhere in the tree. RFC-2026-009 prints
  **no regex literal at all** — I extracted every backticked token in the document and none
  is a pattern. It says so deliberately: "The shape is written out in words rather than as a
  literal", because a literal would trip the repository's own secret scanner. I checked the
  words against the shipped pattern and against the validator, and they agree.

---

## 2. Does the test kit test behaviour, or pin text? Mostly behaviour. Sixteen mutations.

I mutated a disposable copy of `ctr-evt-001/schema.json` and re-ran the package's own guard,
`test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs`.

```
M1  delete schema_ref.maxLength                                     killed
M2  schema_ref.maxLength 32 -> 17                                   killed
M3  schema_ref.maxLength 32 -> 79                                   PASSES — survives
M4  schema_ref.maxLength 32 -> 100000                               killed
M5  delete schema_ref.pattern                                       killed
M6  schema_ref.pattern loses its ^ anchor                           PASSES — survives
M7  schema_ref.pattern loses its $ anchor                           killed
M8  schema_ref.pattern [A-Z]{3} -> [A-Za-z]{3}                      PASSES — survives
M9  schema_ref.pattern semver -> [0-9]+ (leading zeros allowed)     killed
M10 schema_ref.pattern -> ^[\s\S]*$ (keyword present, gutted)       killed
M11 delete event_id.maxLength                                       killed
M12 event_id.maxLength 128 -> 1                                     killed
M13 delete correlation_id.maxLength                                 killed
M14 delete producer.module_key.maxLength                            killed
M15 delete subject.id.maxLength                                     killed
M16 delete idempotency_key.maxLength                                killed
```

**Thirteen of sixteen killed.** This is a real behaviour suite, not a text pin. Gutting the
pattern while keeping the keyword (M10), deleting the bound (M1), and stripping the bound
from every one of the six neighbouring reference fields (M11, M13–M16) are all caught. The
defect class the briefing named — "a suite that passes against a gutted schema" — is not
present in its blunt form.

Three survived, and two of them matter.

### 2.1 FINDING F1 (Medium) — the guard cannot see the `^` anchor come off

The sixteen hostile forms are hostile *instead of* being a well-formed name, or are a
well-formed name with hostile text *appended*. None is a well-formed name with hostile text
**prepended**. So the `$` anchor is covered — hostile form 12, `CTR-EVT-001@1.0.0 .evil`,
kills M7 — and the `^` anchor is covered by nothing.

With `^` removed, the schema then accepts:

```
ACCEPTED  "evil://CTR-EVT-001@1.0.0"
ACCEPTED  "file:///CTR-EVT-001@1.0.0"
ACCEPTED  "../../CTR-EVT-001@1.0.0"
ACCEPTED  "javascript:CTR-EVT-001@1.0.0"
ACCEPTED  "169.254.169.254CTR-EVT-001@1.0.0"
guard suite against this mutated schema: GREEN
```

`file:///` and `javascript:` are hostile forms 1 and 2 — the two the RFC leads with — walking
straight back in through a single deleted character, with the package's own guard green.

**The net that does exist, and its limit.** `schema-mutation-coverage.test.mjs` pins every
assertion keyword's *value* in `CONSTRAINT_SURFACE`, so it does go red on this mutation. But
it goes red saying *"changed without being recorded"*, not *"weaker"*. It cannot tell
narrowing from widening — the file says so itself. I completed the mutant the way an author
would have to: I dropped the `^` **and** made the two edits the record demands, one site line
and one digest.

```
mutant: schema_ref pattern loses its ^ anchor, plus 2 edits to the surface record
  schema-mutation-coverage.test.mjs : GREEN
  ctr-evt-001-schema-ref-bounds     : GREEN
  ACCEPTED  "file:///CTR-EVT-001@1.0.0"
  ACCEPTED  "javascript:CTR-EVT-001@1.0.0"
```

Both suites green, envelope accepting `file:///` and `javascript:`. Two mechanical edits, no
behavioural alarm anywhere. The whole point of this guard is to be the thing that says
"weaker"; on the `^` anchor it does not.

**What lifts it:** one entry in `HOSTILE`, in
`test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs`, of the form
`'file:///CTR-EVT-001@1.0.0'` — a hostile scheme prefixed to a well-formed name. I verified
that such a value is rejected by the shipped schema (§1.3), so the addition is green today
and red the moment `^` moves.

### 2.2 FINDING F2 (Medium) — `schema_ref` is the one reference field with no "accepted at
its own bound" pin, and its range can drift from 18 to 79

The suite already contains the correct remedy for this class. Its last test,
`a value at exactly the declared bound is accepted, so the bound cannot be quietly tightened`,
pins seven fields through `REFERENCE_FIELDS` — two in `ctr-api-001`, one in `ctr-idm-001`,
two in `ctr-job-001`, two in `ctr-aud-001` — each with its declared `maxLength` written out
as a literal the reviewer must read.

`ctr-evt-001.metadata.schema_ref`, the field this package exists for, is not in that list.
Sweeping its bound with the guard running:

```
maxLength = 17     guard red   (killed)
maxLength = 18     guard GREEN (unnoticed)
maxLength = 19     guard GREEN (unnoticed)
maxLength = 20     guard GREEN (unnoticed)
maxLength = 24     guard GREEN (unnoticed)
maxLength = 32     guard GREEN (unnoticed)     <- the declared value
maxLength = 48     guard GREEN (unnoticed)
maxLength = 64     guard GREEN (unnoticed)
maxLength = 78     guard GREEN (unnoticed)
maxLength = 79     guard GREEN (unnoticed)
maxLength = 80     guard red   (killed)
```

The floor at 17 is accidental — it comes from `CTR-JOB-001@2.11.0` and `CTR-TEN-001@10.0.3`
in the acceptance test happening to be 18 characters. The ceiling at 80 is accidental too —
it is the length of the one overlong probe value, `CTR-EVT-001@` + 64 ones + `.0.0`. Between
those two accidents the declared bound of 32 can move anywhere, and as in F1 the surface
record only asks for the move to be written down, not justified.

**What lifts it:** assert, against the validator, that a 32-character well-formed name is
accepted and a 33-character one is rejected — the two values are already printed in §1.4 —
or add `metadata.schema_ref` to `REFERENCE_FIELDS` in the shape that test already uses.

### 2.3 FINDING F3 (Low) — the pattern's letter class can be widened unseen

M8 replaces `[A-Z]{3}` with `[A-Za-z]{3}`. Hostile form 11, `ctr-evt-001@1.0.0`, is lowercase
*throughout*, so the literal `CTR-` prefix still rejects it and the guard stays green while
the schema starts accepting:

```
ACCEPTED  "CTR-eVT-001@1.0.0"
ACCEPTED  "CTR-evt-001@1.0.0"
```

Low, because case-folding a contract id is a correctness nuisance rather than an exposure
path. Recorded because it is the same shape as F1: the hostile list constrains one half of
the token and not the other. A hostile form `'CTR-evt-001@1.0.0'` would close it.

---

## 3. Is the bound reached by discovery or by enumeration? Both, and the seam leaks.

Inside the four contracts it covers, the ratchet genuinely **discovers**: the predicate walks
`properties`, tests names against `/(^|_)(refs?|keys?|ids?)$/`, and handles the nullable and
array-of-string shapes that independent testing found escaping an earlier version. Adding a
new unbounded `exfil_ref` to `ctr-evt-001` is caught (case D below).

The list of *contracts* is an enumeration:

```
test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs:
const BOUNDED_CONTRACTS = ['ctr-api-001', 'ctr-evt-001', 'ctr-idm-001', 'ctr-job-001'];
```

### FINDING F4 (Medium) — the bound ratchet enumerates four contracts and does not see ten

Contracts in `contract-catalog/shared-kernel/` that the bounds test never opens:

```
ctr-aud-001  ctr-err-001  ctr-flg-001  ctr-mod-001  ctr-ntf-001
ctr-obs-001  ctr-pag-001  ctr-sec-001  ctr-ten-001  ctr-usg-001
```

— plus any contract added after this file was written.

Running the suite's own predicate across the whole catalog: **49 reference-shaped fields are
unbounded in those ten contracts**, and the bounds test sees none of them. Demonstrated:

```
A  a fifteenth contract whose exfil_ref has no maxLength   -> guard GREEN (unnoticed)
B  a new unbounded exfil_ref added to ctr-aud-001          -> guard GREEN (unnoticed)
C  ctr-aud-001 before_ref/after_ref lose their maxLength   -> guard red (caught)
D  a new unbounded exfil_ref added to ctr-evt-001          -> guard red (caught)
```

C is caught only because `REFERENCE_FIELDS` names those two fields with a literal `256`; it
is the pinned list doing the work, not the discovery.

**`ctr-aud-001` is the sharp case, and it is not hypothetical.** The test's own title is
"every reference-shaped field **in the contracts this package touches**". This package's
branch edited `contract-catalog/shared-kernel/ctr-aud-001/schema.json` — `git show 653f699
--stat` lists five contract schemas changed, `ctr-api-001`, `ctr-aud-001`, `ctr-evt-001`,
`ctr-idm-001`, `ctr-job-001` — and the suite pins two of `ctr-aud-001`'s reference bounds in
`REFERENCE_FIELDS`. So the package touches it, the suite already knows about it, and the
discovery skips it. Its four unbounded reference fields today:

```
ctr-aud-001.audit_id        maxLength NONE
ctr-aud-001.actor.id        maxLength NONE
ctr-aud-001.correlation_id  maxLength NONE
ctr-aud-001.causation_id    maxLength NONE
```

**The partial net, stated honestly.** `schema-mutation-coverage.test.mjs` does object to
cases A and B, because a newly added rule that no fixture kills raises the unkilled count:

```
ctr-aud-001 — 7 constraint sites killed by no fixture, but 5 declared. A rule was added
that nothing tests.
ctr-aud-001 — UNKILLED_CEILING says 5, measured 7
```

That is a real cost and I am not going to pretend it is nothing. But it objects to the
*added rule being untested*, not to the *reference being unbounded*: an author who adds
`exfil_ref` together with a fixture that kills its `type` and `minLength` pays no ceiling and
ships an unbounded reference with both suites green. And it says nothing at all about the 49
that are already there.

**What lifts it:** replace `BOUNDED_CONTRACTS` with a `readdir` of
`contract-catalog/shared-kernel`, as the sibling test in the same file
(`no pattern in the catalog uses a construct RE2 cannot compile`) already does — it is
catalog-wide and structural for exactly this reason — and carry an explicit, named
allow-list of the fields that are knowingly unbounded because they belong to another owner.
That inverts the default: a new unbounded reference then has to be written down to pass,
instead of being invisible.

---

## 4. Claims versus artifacts

### FINDING F5 (Medium) — RFC-2026-009's residual-exposure list names 23 of 49

`architecture/decisions/RFC-2026-009-reference-bounds.md`, "What this does NOT do", lists the
reference-shaped fields left unbounded. Measured against the RFC's own discovery rule, it
names 23 of the 49 that exist. The 26 it omits:

```
ctr-err-001.message_key
ctr-flg-001.audit.actor.id, ctr-flg-001.audit.reason_key
ctr-mod-001.module_id, ctr-mod-001.dependencies.module_key
ctr-ntf-001.notification_id, .message_key, .dedupe_key
ctr-obs-001.correlation.correlation_id, .request_id, .causation_id, .trace_id, .job_id
ctr-sec-001.scope.workspace_id, .scope.business_profile_id, .scope.page_context_profile_id,
            .rotation.owner.id, .revocation.actor.id, .revocation.reason_key, .correlation_id
ctr-ten-001.business_profile_id, .page_context_profile_id, .actor.id, .request_id,
            .correlation_id, .causation_id
```

The consequential one is `ctr-ten-001`. The RFC calls out `CTR-TEN-001.workspace_id` in bold
as "still unbounded and unconstrained, and it is the tenant-isolation key" — and its six
siblings on the same contract are equally unconstrained and unmentioned. Nine contracts
`$ref` `ctr-ten-001`, including the envelope this package hardened. Through
`CTR-EVT-001.tenant_context`, on `main` today:

```
ctr-ten-001 reference fields, as declared:
  workspace_id             {"type":"string","minLength":1}
  business_profile_id      {"type":"string","minLength":1}
  page_context_profile_id  {"type":"string","minLength":1}
  request_id               {"type":"string","minLength":1}
  correlation_id           {"type":"string","minLength":1}
  causation_id             {"type":"string","minLength":1}

ACCEPTED  tenant_context.workspace_id = "AAAA...(len 100000)
ACCEPTED  tenant_context.workspace_id = "file:///etc/passwd"
ACCEPTED  tenant_context.workspace_id = "http://169.254.169.254/latest/meta-data/"
ACCEPTED  tenant_context.business_profile_id = "file:///etc/passwd"
ACCEPTED  tenant_context.page_context_profile_id = "../../../../etc/shadow"
ACCEPTED  tenant_context.request_id = "javascript:alert(1)"
ACCEPTED  tenant_context.correlation_id = "BBBB...(len 100000)
ACCEPTED  tenant_context.causation_id = "${env.SECRET}"
```

**None of this is this package's to fix** — `ctr-ten-001` belongs to another package and the
RFC correctly reports rather than changes it. The finding is the *disclosure*: an Approved
decision whose section headed "What this does NOT do" understates what it does not do by
roughly half, on the tenant-isolation contract. Correcting it amends an Approved document and
so needs Product Owner re-disposition; I record it rather than making it.

### FINDING F6 (Low) — "the longest reference is 51 characters" is not reproducible

RFC-2026-009 states it twice, and open blocker 3 repeats it as the sole justification for
calling 256 "well above real use". Measured over every non-`invalid-*` example fixture on
`main` at `03c584b`:

- under the strictest reading, `*_ref` only: the longest is **48** —
  `ctr-job-001/examples/valid.json` `.input_ref` = `"asset:input/00000000-0000-4000-8000-000000000202"`.
- under the RFC's own naming rule (`refs?|keys?|ids?`): the longest is **85** —
  `ctr-usg-001/examples/valid-provider-reported.json` `.dedupe_key`.

Neither reading gives 51. The 85 is drift, not an authoring error: at this package's own head
`653f699` that `dedupe_key` was 32 characters, and it grew afterwards. It changes no
conclusion — 85 is still far below 256 — but the number a reviewer is asked to sanity-check a
declared inference against should be the number that is true.

### FINDING F7 (Low) — the RFC's "four touched / ten untouched" contradicts the manifest

RFC-2026-009 says "the four contracts this package touches" and "the ten contracts this
package does not touch", and counts `ctr-aud-001` among the ten. `git show 653f699 --stat`
shows the branch changed **five** contract schemas, `ctr-aud-001` among them, and
`work-packages/WP-0A-CON-007.json` `amends_without_owning.paths` declares **thirteen**
contract directories. The three documents disagree about the same fact. F4 is the operational
consequence of the RFC's version being the one the test kit encoded.

### FINDING F8 (Low) — the author self-check makes one claim its own suite contradicts

`evidence/WP-0A-CON-007/author-self-check.md` records, against the criterion
"Behaviour, never pattern text": *"No assertion in the suite reads a `pattern` string."*
Two tests in the merged suite do:

```
assert.ok(field?.pattern, `${dir}.${path.join('.')} does not exist or declares no pattern …`);
if (!new RegExp(field.pattern).test(value)) { … }
```

I do **not** think the acceptance criterion is breached: those tests *execute* the pattern
against values rather than comparing its text, which is behaviour, and they are the tests
that close the acceptance direction the same file argues for. The finding is narrow — the
self-check's sentence is false as written, and it is the only role verdict this package has
had until now.

### FINDING F9 (Low, informational) — the nullable and array branches have nothing to bite on

The RFC and the suite both record, at length, that an earlier discovery predicate missed a
nullable reference `parent_event_id` and an array of references `related_event_ids`. Those two
fields exist nowhere in any schema in the tree — only in the prose of the RFC, the suite's
comment and the self-check. They were review-time probes. And no reference-shaped field in
the shipped catalog is nullable or an array of strings, so `stringBearer`'s array branch and
the `Array.isArray(type)` branch are exercised by nothing. The code is correct; a regression
of the exact escape the repository records as hard-won would be silent. A unit test of the
predicate against two synthetic schema fragments would close it for a few lines.

---

## 5. The three open blockers

**Blocker 1 — "RFC-2026-009 is Proposed and requires Product Owner disposition before the
RFC-2026-002 manual merge."** **Stale as written, and the requirement it names was inverted.**

The RFC is Approved: `architecture/decisions/RFC-2026-009-reference-bounds.md` line 3 reads
"Status: Approved 2026-09-02 by the Product Owner". The blocker text was never updated; it
still says Proposed in `work-packages/WP-0A-CON-007.json:189` and in
`handoffs/WP-0A-CON-007-author-handoff.json:178` and `:183`.

But the manifest's `required_human_authorities` says disposition **before** the merge, and the
order was the other way round:

```
959ebcc 2026-09-02 13:35:38 +0700  Merge pull request #12 … WP-0A-CON-007-reference-bounds
6346271 2026-09-02 13:37:58 +0700  Merge remote-tracking branch … WP-0A-CON-007-reference-bounds
82aae60 2026-09-02 16:21:30 +0700  docs(decisions): Product Owner approves RFC-2026-003 through -009
```

The approval commit says so itself: *"All seven were already enforced by code on main before
this commit."* The disposition exists and is genuine; the sequencing the manifest required did
not happen. That is the Integration Owner's to dispose of, not mine to fix or to waive — I
record it. It does not block my verdict, because the substantive condition (a Product Owner
disposition of RFC-2026-009) is satisfied on `main` today.

**Blocker 2 — "CTR-NTF-001 deep_link.target_ref remains unbounded. It belongs to A5 and is
reported, not fixed."** **Genuinely open, correctly scoped, does not block.** Confirmed:
`ctr-ntf-001.deep_link.target_ref` carries no `maxLength`. `CTR-NTF-001` is excluded by the
manifest's own `scope.exclude` and belongs to A5. Reporting rather than fixing it is the right
call. I note that three further `ctr-ntf-001` reference fields — `notification_id`,
`message_key`, `dedupe_key` — are equally unbounded and named nowhere; that is F5, not this
blocker.

**Blocker 3 — "The 256-character bound is a DECLARED INFERENCE. The longest reference in the
catalog is 51 characters; no baseline task states a limit. A reviewer who knows the real
ceiling should set it."** **Genuinely open, does not block, and its supporting number is
wrong (F6).** I am not a reviewer who knows the real ceiling: no baseline document in this
repository states one, and inventing a number would be exactly the manufactured rigour I was
told not to produce. The inference is sound in kind — bounds well above observed use and far
below unbounded — and I would keep it. The correction I do ask for is the measurement, 48 or
85 depending on the reading, not 51.

None of the three blocks the verdict. F1, F2 and F4 do.

---

## 6. What I tried that did not break it

Recorded so this verdict is not read as a list of everything that could be wrong:

- The constraint itself is sound. Twenty-nine hostile forms — the sixteen named plus thirteen
  I built, including a NUL, a U+2028, a leading newline, a Cyrillic homoglyph and a hostile
  scheme prefix — are all rejected, all naming the field. Nothing legitimate is rejected for
  an incidental reason. The bound is exact at 32/33.
- The **shape** decision is right, and the RFC's argument for it is the strongest part of this
  package. `schema_ref` names a contract; it does not locate a resource; the catalog's
  `scheme:path` reference pattern would have admitted every URL form the probe demonstrated.
  Choosing a different constraint rather than a tightened one is correct and the reasoning is
  written down properly.
- Removing `minLength: 1` is right, and the stated reason is exactly right.
- Thirteen of my sixteen mutations were killed by the guard alone, including every blunt form
  of the defect class this repository keeps recording: deleting the bound, deleting the
  pattern, keeping the pattern keyword while gutting it to `^[\s\S]*$`, dropping `$`, widening
  the semver to admit leading zeros, and stripping the bound from all six neighbouring
  reference fields on the envelope.
- The "observed failing before it was fixed" claim is true, verified against the pre-fix blob
  rather than taken from the handoff.
- RFC-2026-009 does **not** repeat RFC-2026-006's regex drift. It prints no pattern literal at
  all, deliberately, and its prose matches what ships.
- The RFC's field counts (24 / 21 / 3) are exact.
- `npm run verify` is clean at 260/260 before and after, no test skipped, and the
  mutation-coverage ceilings are unchanged.

---

## 7. Verdict

**changes_required.**

The contract is right. The bounding holds, the shape decision is well argued and well
recorded, and I could not break the shipped schema. What is not right is the guard standing
over it, in the one place the package is named for, and the reach of the ratchet.

Three findings lift this verdict. All three are edits to
`test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs`, which is inside this package's
declared `writable_paths`. I have not made them.

1. **F1** — add a hostile form that prefixes a hostile scheme to a well-formed name, e.g.
   `'file:///CTR-EVT-001@1.0.0'`, so the `^` anchor is guarded as the `$` anchor already is.
2. **F2** — pin `metadata.schema_ref`'s accepted range: assert a 32-character well-formed name
   is accepted and a 33-character one is rejected, or add the field to `REFERENCE_FIELDS`.
3. **F4** — make the bounds ratchet discover its contracts by reading
   `contract-catalog/shared-kernel`, the way the RE2 test in the same file already does, with
   a named allow-list for the fields knowingly left to their owners. At an absolute minimum,
   add `ctr-aud-001` to `BOUNDED_CONTRACTS`: this package edited that schema, and the suite
   already pins two of its fields.

Carried forward as **recorded conditions**, not blocking, and none of them this package's to
fix alone:

- **F3, F9** — the letter-class widening, and the untested nullable/array branches.
- **F5** — RFC-2026-009's residual list names 23 of 49; amending an Approved decision needs
  Product Owner re-disposition. The `ctr-ten-001` exposure it under-describes is real and
  belongs to another package.
- **F6, F7, F8** — the 51-character figure, the four/five/thirteen contract-count
  disagreement, and the self-check's "no assertion reads a pattern string".
- **Blocker 1's sequencing** — the merge preceded the Product Owner disposition it was
  required to follow. Integration Owner's to dispose.
- **The cross-vendor exception** in `independence.cross_vendor_exception` is not waived by
  this review. Every role on this package is an Anthropic `claude-opus-5` run, mine included.
  I am an independent run and I did not author, test or integrate this work, but I am not
  cross-vendor review and this verdict must not be recorded as though I were.

Attested by `/claude/c0_contract_reviewer` against `03c584b2652c74219dabca15e39a2b9c0bd487b6`.
No file outside `evidence/WP-0A-CON-007/**` was changed by this review.
