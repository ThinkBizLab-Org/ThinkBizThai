# WP-0A-CON-005 — Independent Reviewer verdict (contract and architecture)

Package: CTR-JOB-001 reference-field hardening
Reviewer run: `/claude/c0_contract_reviewer`, declared in
`.agents/capability-profiles/cc-c0-contract-reviewer.json` and in
`work-packages/WP-0A-CON-005.json` `role_assignments.reviewer_agent_run_id`.
Author run under review: `/claude/a0_atlas` — a different run. I did not author, test,
integrate or gate this work, and I am not carrying any earlier Reviewer verdict forward:
before this file the package had a Tester verdict and **no Reviewer verdict at all**.
Protocol version: `1.0.0`.

**Revision reviewed:** `1478f34edc8c61a5a004610e5cb9f298b5562e98` — `main` as it stands
today, not the package's reviewed head. The package's declared branch
`agent/claude/WP-0A-CON-005-job-reference-hardening` no longer exists; the Author handoff
records head `64d9c65c7ef00f072d742d83646fba571b2466fa`, which is an ancestor of `main`.
Everything below was measured against the tree at `1478f34`.

**This is independent Reviewer evidence only.** It approves no gate, authorizes no merge,
advances no package status and countersigns no acknowledgement. Advancing state is the
Integration Owner's act.

---

## 0. Toolchain, and one procedural fact

`zsh -lc` was **refused in this worktree**, as the briefing anticipated:

```
$ zsh -lc 'node --version; npm --version'
This agent is isolated in the worktree /Users/bank/ThinkBizThai/.claude/worktrees/
agent-ab30f77a419290337, but this command runs zsh in a plain command; what it reads or is
handed as shell text cannot be shown not to run git. Refusing to run it — a worktree-isolated
agent's git operations must target its own worktree.
```

I therefore ran `node` and `npm` directly and confirmed the pinned toolchain. I substituted
nothing else — no other package manager, no other Node, no network, no global tool.

```
$ node --version        v24.20.0
$ npm --version         11.19.0
$ which node            /Users/bank/.local/node-v24.20.0/bin/node
$ which npm             /Users/bank/.local/node-v24.20.0/bin/npm
```

**Baseline, before any work:**

```
$ npm run verify
clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0
```

Green. Nothing to explain away.

**Gate G0:** everything below is synthetic-only. No provider, no credential, no network, no
migration, no production schema. Every destructive probe ran against a disposable copy of the
tree in a scratch directory outside the repository; the repository working tree was read-only
for the whole review and `git status --porcelain` was empty at the start.

---

## 1. What changed between the reviewed head and today

The integration audit reported that only one *owned* source path had moved since the reviewed
head. That is true, and it is also less reassuring than it sounds, so here is the measured
picture.

```
$ git diff --name-status 64d9c65 HEAD -- \
    architecture/decisions/RFC-2026-006-job-reference-hardening.md \
    test-kits/contracts/ctr-job-001-reference-hardening.test.mjs \
    contract-catalog/shared-kernel/ctr-job-001 \
    work-packages/WP-0A-CON-005.json \
    test-kits/contracts/json-schema-subset.mjs \
    test-kits/contracts/shared-kernel-contract-catalog.test.mjs
```

| Path | Owned by this package? | Moved since `64d9c65`? |
|---|---|---|
| `test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` | yes | **no — byte-identical** |
| `architecture/decisions/RFC-2026-006-job-reference-hardening.md` | yes | yes (status line only) |
| `work-packages/WP-0A-CON-005.json` | yes | yes (status + reformat) |
| `contract-catalog/shared-kernel/ctr-job-001/schema.json` | no (cross-package amendment) | **yes, materially** |
| `contract-catalog/shared-kernel/ctr-job-001/manifest.json` | no | yes |
| `test-kits/contracts/json-schema-subset.mjs` | no | yes |
| `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | no | yes |
| 40 new `examples/invalid-*.json` fixtures | no | added |

So the **artifact this package owns** is unchanged, but the **contract it amends has moved**:
`653f699` added `maxLength: 128` and an `x-bound-note` to `job_id` and `dedupe_key`, added
`maxLength: 256` and an `x-minlength-note` to both reference fields, and removed `minLength`
from both. Those are later packages' changes, not this package's, and I do not review them
here. I record the drift because the RFC's numeric proof (60 → 67 leaf paths) is no longer
re-derivable against today's tree, and because a reviewer who assumed "essentially unchanged"
would have missed it.

**Discharge of open blocker 3.** That blocker requires the structural content-neutrality proof
to be *re-derived by a non-Author run*. The Tester `/claude/q0_sentinel` discharged the
numeric leaf-path proof at `b47aece`
(`evidence/WP-0A-CON-005/test-verdict.md` §10: "60 → 67 leaf paths, 53 identical / 7 removed /
14 added / **0 modified in place**"). I did **not** re-derive those figures, and I say so
plainly rather than restating them: the schema has moved since, so that count cannot be
reproduced today. What I did independently re-derive, by execution against `1478f34`, is the
*invariant* half — property key set, `required` list, `tenant_context.$ref`,
`additionalProperties`, manifest version and status, and the `index.json` entry — all of which
hold (§3, mutations M11–M18).

---

## 2. Does the hardening hold in the shipped schema? — executed

The constraint under review, at
`contract-catalog/shared-kernel/ctr-job-001/schema.json`, identical on both fields:

```json
"input_ref": {
  "type": "string",
  "pattern": "^(job|status|result|app|asset|content):[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*)*$",
  "maxLength": 256,
  ...
}
```

I built my own harness against `test-kits/contracts/json-schema-subset.mjs` from a scratch
directory — I did not run the package's own suite and call that a check — and probed 38 values
on each of the two fields: the 16 the package's guard names, plus 17 forms **it does not name**
that I chose to try to break it, plus 5 well-formed controls.

```
$ node <scratch>/p1.mjs <repo>
assertSchemaSupported: OK (no unsupported keyword)
baseline valid.json errors: []

total probes: 76 | ACCEPTED: 8

ACCEPTED by the shipped schema:
  input_ref  "job:aaaa…" (240 chars)                      [rev: under maxLength]
  input_ref  "asset:input/00000000-0000-4000-8000-000000000202"
  input_ref  "job:input.payload"
  input_ref  "result:a/b/c-d_e.f"
  result_ref  … the same four

rejected but NOT attributable to the field: 0
```

Eight accepted, and all eight are the intended well-formed controls. **Every hostile form was
rejected on both fields, and every rejection was attributable to the reference field itself**
rather than being an incidental failure elsewhere in the envelope.

The forms I added that the package does not name, all rejected:

| Form | Value | Result |
|---|---|---|
| newline then traversal | `asset:x\n../../../etc/passwd` | rejected |
| CRLF then traversal | `asset:x\r\n../../etc/passwd` | rejected |
| U+2028 line separator | `asset:x<U+2028>y` | rejected |
| NUL byte | `asset:x<NUL>y` | rejected |
| uppercase allow-listed scheme | `ASSET:input/a` | rejected |
| mixed-case allow-listed scheme | `Asset:input/a` | rejected |
| percent-encoded traversal | `asset:input/%2e%2e/etc/passwd` | rejected |
| half-encoded traversal | `asset:input/..%2fetc` | rejected |
| double dot inside a segment | `asset:a..b` | rejected |
| dot-dot path segment | `asset:a/../b` | rejected |
| leading slash | `asset:/a` | rejected |
| trailing slash | `asset:a/` | rejected |
| empty segment | `asset:a//b` | rejected |
| leading dot | `asset:.hidden` | rejected |
| trailing dot | `asset:a.` | rejected |
| fullwidth Latin homoglyph | `asset:ａ` | rejected |
| Cyrillic homoglyph | `asset:аdmin` | rejected |
| over the bound | `job:` + 300 × `a` | rejected |

The newline and CRLF results are the ones worth stating explicitly, because they are the ones
that could plausibly have gone the other way: ECMAScript `$` anchors at end of input, so a
trailing-newline smuggle does not survive. This confirms the Tester's condition 6 as a
*portability* caveat rather than a live defect — under Node, which is what this repository
executes, the two forms are rejected.

I also independently reproduced the claim in the field's own `x-reference-rule` that the two
removed negative lookaheads were redundant:

```
$ node <scratch>/p3.mjs
--- lookahead-equivalence claim (400,000-string fuzz) ---
  strings compared: 400000  divergences: 0
  the lookahead-free form is equivalent on this corpus: CLAIM REPRODUCED
```

**Finding: none. The hardening the RFC claims does hold in the shipped schema.** I tried
seventeen things the package did not think of and broke none of them.

---

## 3. Does the guard test behaviour, or pin text? — mutation-tested

`test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` states its own intent:

> The guard is deliberately NOT written against the pattern string. Asserting the literal
> would only prove the schema still says what it says; these cases prove what it DOES.

That is a claim, so I tested it. I copied the schema, manifest, fixtures, `index.json` and the
subset validator into a **disposable scratch directory**, applied one mutation at a time, and
ran the suite from there. Nothing in the repository was written.

```
$ node <scratch>/mutate.mjs <repo> <scratch>
mutation                                                          exit  guard
M1  revert input_ref to the deny-list not:{pattern:"^https?://"}    1   CAUGHT
M2  revert BOTH fields to the deny-list                             1   CAUGHT
M3  keep the scheme allow-list but free the body (.*)               1   CAUGHT
M4  add `https` to the allow-list, body unchanged                   0   *** MISSED ***
M5  loosen result_ref only (field drift)                            1   CAUGHT
M6  drop the pattern on result_ref entirely                         1   CAUGHT
M7  replace with a permissive any-scheme pattern                    1   CAUGHT
M8  remove x-reference-rule from input_ref                          1   CAUGHT
M9  remove maxLength from both reference fields                     0   *** MISSED ***
M10 remove maxLength from dedupe_key                                0   *** MISSED ***
M11 drop the last_error_code property                               1   CAUGHT
M12 drop dedupe_key from the required list                          1   CAUGHT
M13 flip additionalProperties to true                               1   CAUGHT
M14 break tenant_context $ref back to the RFC-2026-004 defect       1   CAUGHT
M15 erase the WP-0A-CON-002 x-amended-by record                     1   CAUGHT
M16 mark the pending acknowledgement as "approved"                  1   CAUGHT
M17 bump the manifest version to 1.0.1                              1   CAUGHT
M18 advance the manifest freeze level to Frozen                     1   CAUGHT
M19 undeclare the negative fixture from the manifest                1   CAUGHT
CONTROL  no mutation at all                                         0   OK (green)
```

**16 of 19 caught, control green.** The guard is genuinely behavioural: M1 and M2 restore the
exact original defect and it fails; M3 and M7 keep a `pattern` present but weaken what it
*does* and it fails. A file that did nothing could not reproduce this. The suite's construction
deserves specific credit on two points a weaker guard gets wrong:

- it asserts `errors.some((message) => message.includes(field))`, so a hostile value that is
  rejected for some *other* reason does not count as a pass;
- it does **not** pin the volatile `index.json` "4 Candidate / 10 Draft" tally, only
  CTR-JOB-001's own entry — which is why it still passes today (§4, F2).

I then took the three misses seriously enough to ask whether the *repository* catches them,
rather than reporting a guard gap as if it were a hole in the tree. Full contract test-kit,
nine suites, against a disposable `git archive` copy:

```
$ node <scratch>/p4.mjs <tree>
CONTROL  unmutated copy                 -> green (as expected)
M4   add `https` to the allow-list      -> CAUGHT by 2 failing assertion(s)
        - no constraint value changes without the change being written down
M9   remove maxLength on both refs      -> CAUGHT by 12 failing assertion(s)
        - every reference-shaped field … carries an upper bound
        - a value at exactly the declared bound is accepted …
        - every contract reaches the mutation-coverage floor
M10  remove maxLength on dedupe_key     -> CAUGHT by 10 failing assertion(s)
```

**M9 and M10 are covered elsewhere** (`ctr-evt-001-schema-ref-bounds.test.mjs` and
`schema-mutation-coverage.test.mjs`) and are not findings against this package — the bound they
protect was added by a later package anyway. M4 is a different matter, and it is F4 below.

---

## 4. Findings

### F1 — Medium. RFC-2026-006 Decision 2 prints a pattern that exists nowhere in the tree.

`architecture/decisions/RFC-2026-006-job-reference-hardening.md`, Decision 2, says the fields
use the CTR-IDM-001 pattern **"verbatim"** and prints it:

```
^(job|status|result|app|asset|content):(?!/)(?!.*\.\.)[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$
```

The shipped `input_ref`/`result_ref` pattern carries **no negative lookaheads**. The two
`(?!…)` groups were removed by this package's own second commit, `64d9c65` ("drop redundant
lookaheads"), and Decision 2 was not updated with them. The same stale text sits in
`work-packages/WP-0A-CON-005.json` `authorized_cross_package_amendments`, which still describes
the permitted change as the lookahead form and then says "**NOTHING ELSE**".

The *substantive* claim survives — CTR-IDM-001's `result_ref` is today byte-identical to
CTR-JOB-001's, so "verbatim to CTR-IDM-001" is true; and the lookahead-free form is provably
equivalent (§2, 400,000 strings, zero divergences). What is false is the literal regex printed
in an **Approved** RFC as the decision's content, and the authorization record that governs a
cross-package amendment to a Candidate contract.

This is the defect class the briefing named — a document asserting something the artifact does
not contain — and it is worth being precise about why it slipped: it was introduced *by* the
correction, in the commit whose own message argued that asserting pattern characters is the
wrong thing to do. The RFC then went to Product Owner approval (`82aae60`) carrying the stale
text.

### F2 — Low. RFC-2026-006 Decision 4's catalog tally is now false.

Decision 4 and the package's acceptance criteria both state `index.json` "still reports 4
Candidate and 10 Draft". Measured at `1478f34`:

```
total 14 {"Candidate":9,"Draft":5}
CTR-JOB-001 entry: {"id":"CTR-JOB-001","version":"1.0.0",…,"status":"Candidate",…}
```

Nine Candidate, five Draft. The part that matters — `index.json` untouched by this package,
CTR-JOB-001 still `1.0.0` / `Candidate` — holds. The tally drifted because later packages
advanced other contracts. Low severity, and the standing guard correctly never pinned it; but
an acceptance criterion that reads false against the tree should be time-stamped or corrected.

### F3 — Low. The RFC's `ctr-evt-001` escalation is stale, and open blocker 10 with it.

RFC Limitations and `open_blockers[10]` both state that `ctr-evt-001` `metadata.schema_ref` is
an unconstrained `{ type: "string", minLength: 1 }` accepting every hostile form. Measured
today:

```json
{"type":"string","maxLength":32,
 "pattern":"^CTR-[A-Z]{3}-[0-9]{3}@(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$",
 "x-source":"… deliberately not the catalog's `scheme:path` reference pattern: schema_ref does
 not locate a resource, it NAMES the contract that defines this event's body …"}
```

The escalation was taken up and closed by a later package, with a *different* remedy — a
contract-id-and-semver name rather than a reference pattern — which is exactly what commit
`64d9c65`'s message warned would be needed. Good outcome; the record should now say so rather
than continuing to assert an open hole that is closed.

### F4 — Medium. The standing guard cannot detect public egress being readmitted through the scheme allow-list — the one dimension the RFC explicitly leaves open.

This is the finding I think nobody has named. The RFC is careful to say the allow-list itself
is not decided here:

> The scheme allow-list itself is **not** decided by this RFC. … whether
> `job|status|result|app|asset|content` is the right closed set for a job envelope is a
> contract-owner decision recorded as an open blocker, not settled here.

So the set *will* be edited. I edited it: added `https`, left the body grammar untouched, and
wrote the change down in the constraint ledger exactly as `schema-mutation-coverage.test.mjs`
instructs ("Regenerate the record"). Disposable copy, whole contract test-kit:

```
$ node <scratch>/p5.mjs <tree>
ctr-job-001 ledger sites rewritten: yes
digest label regenerated: 62391eb76e72d55e -> 58907e9da937c8b2

*** WHOLE CONTRACT TEST-KIT IS GREEN with `https` in the allow-list ***
  input_ref=https:public.example.invalid/exfil  ->  ACCEPTED   (new URL() resolves to https://public.example.invalid/exfil)
  input_ref=https:evil.example.invalid/a/b      ->  ACCEPTED   (new URL() resolves to https://evil.example.invalid/a/b)
```

The reason the guard misses it is structural, not an oversight in the list of sixteen: every
hostile value it carries contains `//` or another body form the grammar rejects, so **none of
them fires when only the scheme set widens**. And `https:` without the double slash is not a
curiosity — WHATWG URL parsing treats `https` as a special scheme and resolves
`https:public.example.invalid/exfil` to `https://public.example.invalid/exfil`. That is full
public egress: the precise class RFC-2026-006 exists to close, reachable through the precise
door it leaves open.

The constraint ratchet catches the *unrecorded* version of this change, which is real value,
but it enforces disclosure, not correctness: record the new site and it goes green.

The guard is one assertion short. It proves what the current six schemes do; it does not
express the property that makes them safe — that no scheme in the set is
network-dereferenceable. Severity Medium: no live defect, correct code today, but the standing
guard's whole purpose is to make a recurrence a CI failure, and against the most likely future
edit it would not be.

### F5 — Low, out of scope, escalation. `ctr-ntf-001` `deep_link.target_ref` is an unbounded reference.

The bound ratchet is scoped to four contracts:

```
test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs:149
const BOUNDED_CONTRACTS = ['ctr-api-001', 'ctr-evt-001', 'ctr-idm-001', 'ctr-job-001'];
```

`ctr-ntf-001` is not among them, and its reference field carries no bound:

```
$.properties.deep_link.target_ref =
  {"type":"string","pattern":"^(app|content|asset|job):[A-Za-z0-9_-]+…$"}
  pattern matches 100004-char value: true | maxLength declared: NONE
```

A 100,004-character allow-listed reference is accepted. This is the residual the Tester named
as condition 3 ("no `maxLength` on any reference field, catalog-wide"), closed for four
contracts since and left open here because the ratchet that closed it enumerates contracts
rather than discovering them. Outside WP-0A-CON-005's scope entirely — escalate to
CTR-NTF-001's owner, do not fix it here.

### F6 — Informational. Two hand-written predicates still carry the lookahead form.

```
test-kits/contracts/shared-kernel-envelope-contracts.test.mjs:18   isPrivateRef       — lookahead form
test-kits/contracts/shared-kernel-contract-catalog.test.mjs:20     REFERENCE_PATTERN  — lookahead form
```

Every shipped schema is lookahead-free. Because the two forms are provably equivalent (§2),
**this is not a live bypass** and I am not calling it one. It is a text divergence between a
hand-written predicate and the shipped constraint, in files owned by WP-0A-CON-001 and
WP-0A-CON-002 — the thing RFC-2026-004 and the conformance suite exist to eliminate. Worth a
line in those packages' records, nothing more.

### F7 — Medium, process. No Tester attestation exists for the reviewed head.

`evidence/WP-0A-CON-005/test-verdict.md` attests **`b47aece`**. The Author handoff records head
**`64d9c65`**. `64d9c65` is the commit that acted on the Tester's own findings — it removed the
lookaheads, rewrote the CON-001 assertions to test behaviour, and corrected two counts — so the
schema, the amended CON-001 test and two Author documents all changed *after* the tested
revision. The Tester verdict is sound for what it covers and its qualitative conclusions
survive (I re-derived the behavioural half at `1478f34` in §2 and §3), but the Integration
Owner should know that no Tester attestation covers the final head, and should not read
`test_verified_with_conditions` as covering `64d9c65`.

---

## 5. The `dedupe_key` item carried forward from the A6 assessment

**Confirmed, still true.** `contract-catalog/shared-kernel/ctr-job-001/schema.json`:

```json
"dedupe_key": {
  "type": "string",
  "minLength": 1,
  "maxLength": 128,
  "x-bound-note": "Bounded because independent security review found reference-shaped fields
   on these envelopes with no pattern AND no bound … The bound is a DECLARED INFERENCE; no
   baseline task states a limit."
}
```

No composition, and no `x-source`. The `x-bound-note` documents the *length bound*; it says
nothing about what the key is made of or where the requirement comes from. Compare
`ctr-usg-001`, which closed the same gap under the same field name:

```
ctr-usg-001.dedupe_key  pattern = ^usg:<workspace>:<job>:<dimension>:<basis>:<timestamp>$
                        x-source = "OB-008 detects missing and DUPLICATE usage, and ID-002
                                    requires a dedupe record. COMPOSITION: `usg:<attribution.
                                    workspace_id>:<attribution.job_id>:<d…"
```

So `ctr-job-001.dedupe_key` accepts any 1–128 character string. Two producers can write
colliding keys, or fail to collide when they should, and the contract expresses no opinion.
Given `CONTRIBUTING_AGENTS.md` treats "duplicate external side effects" and "lost jobs" as
stop-the-line incidents, an uncomposed dedupe key on the *job* envelope is not a cosmetic gap.

One correction to how this is usually framed, because accuracy matters more than a tidy story:
**CTR-JOB-001 carries no `x-source` on any field at all** — not just on `dedupe_key`.

```
x-source count per contract:
  ctr-api-001: 0   ctr-aud-001: 14  ctr-err-001: 0   ctr-evt-001: 1
  ctr-flg-001: 11  ctr-idm-001: 0   ctr-job-001: 0   ctr-mod-001: 16
  ctr-ntf-001: 10  ctr-obs-001: 12  ctr-pag-001: 0   ctr-sec-001: 11
  ctr-ten-001: 0   ctr-usg-001: 13
```

Six of fourteen contracts have none. So the missing `x-source` on `dedupe_key` is not a
targeted omission by this package; it is CTR-JOB-001's uniform state, inherited from
WP-0A-CON-001. Sourcing one field in isolation would be worse than leaving it.

**Whose scope?** The contract owner's, not this package's, on both halves:

- **Not WP-0A-CON-005.** Its `writable_paths` do not include the contract, and its
  `authorized_cross_package_amendments` permit exactly two constraint replacements plus an
  `x-amended-by` record — "NOTHING ELSE: no property added or removed". Composing `dedupe_key`
  is a change of *meaning*, not a content-neutral tightening of a reference shape, so it cannot
  ride the same authority even if the Author wanted it to.
- **The contract owner's (A0, via WP-0A-CON-001 and CTR-JOB-001's Integration Owner
  `/root/r0_steward`).** Deciding what makes a job unique is a semantic decision that binds
  idempotency behaviour across every consumer listed in `index.json` (Research, AI, Media,
  Publish, Metrics).

**It must not block this verdict.** It is a pre-existing gap in a contract this package was
authorized only to harden in one specific dimension, and closing it here would be the
scope violation the package's own manifest is written to prevent. It should be recorded as a
`required_before_freeze` item on CTR-JOB-001 — the index entry already lists
`["lifecycle","retry","lease","progress","cancel fixtures"]` and `dedupe_key` composition
belongs beside them.

---

## 6. The fifteen open blockers

Read in full. Triage against `1478f34`:

| # | Substance | Status |
|---|---|---|
| 1 | `/root/r0_steward` acknowledgement is `pending` | **Genuinely open.** Verified in both `x-amended-by` records. |
| 2 | Nothing reads `acknowledgement_status` | **Genuinely open, wording now narrow.** This package's own guard *does* read it, but only asserts the value is `pending` or `acknowledged`. I flipped both records to `acknowledged` on a disposable copy: **the guard passes.** Self-countersigning is undetected; the control is human review only. |
| 3 | Content-neutrality proof must be re-derived by a non-Author run | **Discharged, in two halves.** Numeric leaf-path proof by `/claude/q0_sentinel` at `b47aece`; invariant half re-derived by me at `1478f34` (§3, M11–M18). The numeric table is no longer re-derivable today — see §1. |
| 4 | Heavier class of change than RFC-2026-004 | **Genuinely open — Integration Owner disposition.** Correctly characterised; not mine to close. |
| 5 | Two CON-001 fixtures had to change | **Done, disclosure only.** `valid.json` now `asset:input/…`; verified valid against the shipped schema (§2, baseline `[]`). |
| 6 | A CON-001 *test* had to change | **Done, disclosure only.** |
| 7 | `test-kits/integrity-manifest.json` belongs to WP-0A-A0-002, still `in_review` | **Genuinely open.** `WP-0A-A0-002` status is still `in_review` at `1478f34`. |
| 8 | Scheme allow-list membership not decided here | **Genuinely open — and see F4.** This is the blocker my headline finding attaches to: the dimension left open is the one the guard does not defend. |
| 9 | A shape rule is not an authorization decision | **Genuinely open, and demonstrated.** With `tenant_context.workspace_id = …0001`, both `asset:workspace/…00ff/input/secret` and `content:another-tenant/private.doc` are **ACCEPTED**. Honestly disclosed; correctly left to RLS and the application port. |
| 10 | `ctr-evt-001.metadata.schema_ref` unconstrained | **STALE — closed by a later package.** See F3. |
| 11 | One hostile form on disk, fifteen only in the guard | **Genuinely open, low.** Accurate as written. |
| 12 | RFC-2026-006 is `Proposed`, awaiting Product Owner | **STALE — closed.** Approved 2026-09-02 (`82aae60`). |
| 13 | Depends on WP-0A-A0-002 and WP-0A-CON-002, both unmerged | **Partly stale.** Both are still `in_review`, so the dependency stands; but the work of both is present in `main` at `1478f34`, so "unmerged" no longer describes the tree. The status fields and the tree disagree — worth the Integration Owner's attention in its own right. |
| 14 | `prefer_cross_vendor_review` not satisfied | **Genuinely open, recorded exception.** It applies to me too: I am another `claude-opus-5` run. Five distinct runs with no self-approval is a single-vendor fallback, not cross-vendor review, and my agreement with the Author and Tester carries a correlated blind spot that this file cannot measure. |
| 15 | Gate G0 pending external verification | **Genuinely open, standing constraint.** Respected: synthetic-only throughout. |

**Blockers that should block this verdict: none.** Every genuinely open item is either an
authority the Integration Owner or Product Owner holds (1, 4, 7, 13), a disclosed
out-of-scope gap (8, 9, 11), a standing constraint (14, 15), or a repository-wide control
weakness carried forward with an honest label (2). Two are stale and should be closed in the
record (10, 12), and one is half-stale (13). Blocker 2 deserves one more line: it is the only
one where the *stated* mitigation is weaker than it reads, and I verified the weakness rather
than assuming it.

---

## 7. What I tried that did not break it

Stated explicitly, because "I found nothing here" is only useful if you know what was
attempted:

- 76 validator probes across both reference fields, including 17 hostile forms the package
  never names — control characters, homoglyphs, encoded traversal, case variation on an
  allow-listed scheme. All rejected, all attributable to the field.
- 19 schema and manifest mutations against a disposable copy; 16 caught by the guard alone,
  the other 3 caught by the wider test-kit.
- Reverting the exact original defect, in one field and in both. Caught.
- Keeping a `pattern` present while gutting what it does. Caught.
- Erasing the earlier package's `x-amended-by` record. Caught.
- Breaking `tenant_context.$ref` back to the RFC-2026-004 defect. Caught.
- A 400,000-string differential fuzz of the removed lookaheads. Zero divergences — the claim in
  the field's own annotation reproduces.
- `assertSchemaSupported` over the shipped schema: no keyword the validator would silently
  ignore.

The one thing that did get through — F4 — took widening the allow-list *and* updating the
ledger, which is to say it took doing the thing the RFC says a contract owner will one day do.

---

## 8. Verdict

**review_approved with recorded conditions.**

The substance is sound and I will say so plainly: the deny-list is genuinely gone, the
replacement genuinely rejects everything the escalation demonstrated plus everything I could
invent, the guard genuinely tests behaviour rather than text, the amendment genuinely changed
no field, no version and no freeze level, and the package's disclosure of its own limits is
unusually honest — several open blockers describe real weaknesses that no test would have
surfaced. I found no defect in what the schema *does*.

What I cannot approve without conditions is the accuracy of two governing documents and one
gap in the guard's coverage. F1 in particular is not a nit: an **Approved** RFC prints, as the
content of its decision, a regular expression that appears nowhere in the repository, and the
authorization record for a cross-package amendment to a Candidate contract says the same thing
and then says "NOTHING ELSE".

**Conditions. All four are inside `WP-0A-CON-005`'s own `writable_paths` — no further
cross-package amendment and no new acknowledgement is needed to lift any of them.**

- **C1 (lifts F1).** `RFC-2026-006` Decision 2 must print the pattern the tree carries — the
  lookahead-free form — or state that `64d9c65` superseded the printed text and why. The same
  correction to `work-packages/WP-0A-CON-005.json`
  `authorized_cross_package_amendments`, whose permitted-change description is currently a
  pattern the shipped schema does not contain.
- **C2 (lifts F2 and F3).** Decision 4's "4 Candidate and 10 Draft" corrected or time-stamped;
  the `ctr-evt-001` paragraph in Limitations and `open_blockers[10]` marked closed with the
  remedy that actually landed; `open_blockers[12]` marked closed against `82aae60`.
- **C3 (lifts F4).** Either add one assertion to
  `test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` expressing the property rather
  than the instances — that the scheme set contains no scheme a client will dereference over
  the network (`http`, `https`, `ws`, `wss`, `ftp`, `file` are the WHATWG special schemes) — or
  state in the RFC that the standing guard does not defend the allow-list's membership, so the
  contract owner editing that set under blocker 8 knows CI will not catch them. I prefer the
  assertion; the disclosure is acceptable.
- **C4 (record only).** Record the blocker triage in §6 — 10 and 12 stale, 13 half-stale, 2
  narrowed — so the next reader is not re-litigating closed items.

**Referred, not conditions on this package:**

- F5 — `ctr-ntf-001.deep_link.target_ref` unbounded → CTR-NTF-001's owner. The bound ratchet
  enumerates contracts instead of discovering them; that is the more durable fix.
- F6 — two hand-written predicates carrying the lookahead form → WP-0A-CON-001 and
  WP-0A-CON-002.
- §5 — `dedupe_key` composition and CTR-JOB-001's absent `x-source` → CTR-JOB-001's owner, as a
  `required_before_freeze` item. **Explicitly not this package's scope and explicitly not a
  blocker on this verdict.**
- F7 — no Tester attestation covers head `64d9c65` → Integration Owner, before disposition.

**Closing verification:**

```
$ npm run verify
clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0
```

Identical to the opening baseline. This review changed nothing outside
`evidence/WP-0A-CON-005/`.

This is independent Reviewer evidence only. It does not approve Gate G0, does not authorize a
merge, does not advance the package status, does not countersign the `/root/r0_steward` or
`/claude/r0_steward` acknowledgements, and does not substitute for the Security reviewer — who
is assigned (`/claude/a1_bastion`) and has still recorded no verdict on this package.

VERDICT: review_approved_with_conditions
