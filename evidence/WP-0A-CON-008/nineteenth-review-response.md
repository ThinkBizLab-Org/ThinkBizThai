# Independent review #19

Two HIGH, two MEDIUM. All closed. The review and my own probe found HIGH 1 **independently and
within the same hour**, and reached the same conclusion about the fix.

## HIGH 1 — every static property of a file can be reproduced by a file that does nothing

Three floors now pinned each suite: test count, `assert.` count, and a digest of the sorted test
names. The review copied all three — the ten original names, bodies replaced by fifteen
`assert.ok(true)` calls — and shipped `ctr-api-001 properties.data.maxProperties = 3`.
**exit 0, 234/234.** It also shipped `correlation_id`/`causation_id`/`request_id`
`maxLength: 128 → 24` the same way.

I ran the identical experiment from the other side while the review was running, with the same
result. **Counting anything can be satisfied by repeating anything, and naming anything can be
satisfied by copying the names.** A fourth static property — statement counts, an AST digest —
falls to the same move.

Fix: `test-kits/ratchets-bite.test.mjs` stops pinning the suite and pins its **behaviour**. It
copies the repository, reverses a real rule in a real contract — the envelope's closure against
undeclared properties, and the secret-handle pattern — runs the suite that is supposed to notice,
and asserts it **fails**. A hollow suite passes every floor and fails here, because a placeholder
notices nothing.

Verified: the name-preserving hollow now exits **1** with *"opening CTR-API-001 to undeclared
properties must fail the mutation-coverage suite; a suite that passes this has stopped observing
the catalog"*. Each case also asserts the suite passes on an **unmodified** copy first — otherwise
the test proves only that something is broken.

**And the first version of this meta-test reported the opposite of the truth.** It saw exit 0 for a
suite that was failing four tests, because `NODE_TEST_CONTEXT` is inherited by a child process and
makes a nested `node --test` report as a subtest of its parent. The child environment is stripped
now. *A probe that silently fails to observe looks exactly like a guard that does not fire* — the
second time that exact sentence has been written into this package's evidence, and the second time
I caused it.

## HIGH 2 — the decision-record ratchet only knew one spelling

Two evasions, each **exit 0**:

- **`# Decision Record DR-2026-011`** — not an RFC by filename or heading, and it outranks the
  Decision Register just the same.
- **A genuine `# RFC-2026-011` heading pushed past the 600-character window** with an HTML-comment
  preamble.

The heading was decoration. **The status line is the load-bearing signal**, and it is read over the
whole file now, with the heading vocabulary widened to `RFC`/`ADR`/`DR`/`Decision Record`/
`Amendment`. `evidence/` is exempt because an evidence record quotes decisions constantly and
flagging those would train a reader to ignore the check. Verified: both evasions exit 1.

## MEDIUM 3 — an approval attributed to a role, and the `not` bypass

**Role nouns.** The check only counted a clause if it contained a literal `agent_run_id`. *"The
independent Security/Privacy reviewer … cleared the freeze; the independent Tester signed off …
and the Integration Owner approved the merge"* — three fabricated approvals, no ids at all,
**exit 0**.

**`not`.** The comment predicted this and the review executed it: *"…approved the security review
and … signed off on the freeze, and nothing is not resolved"* — one clause, both ids, one `not`,
**exit 0**.

Fixed: role nouns are recognised, and the exempting vocabulary is a **closed set** with
`not`/`never`/`no` removed. The three real handoff sentences that needed them still match through
`required` and `countersign`. **If a real sentence ever needs a word that is not in the set, the
honest fix is to rewrite the sentence — a wider exemption is a wider bypass, one for one.**

Verified: both payloads are caught. ~~three flagged clauses each~~ — **one `wrong` entry per payload**; review twenty counted and I had not.

**Still open and still stated:** `evidence/**` is not scanned. A fabricated approval in an evidence
file is caught by nothing, which is item 9 on the "not closed" list and needs a reader.

## MEDIUM 4 — `.github/workflows/` was never enumerated

Every CI assertion names `ci.yml` and nothing else, so `release.yml` — `on: pull_request`, a job
named `bootstrap` — was **exit 0**, undigested and unratcheted. Locally inert; on GitHub a second
workflow contributes a check run under a colliding job name, and a `pull_request_target` workflow
with elevated `permissions` is the one file here that can act with write credentials.

Ratcheted like `architecture/decisions`: a declared set, and every file digested. Verified: exit 1.

## Verification

See `evidence/VERIFICATION.md`. `npm run verify` reports the exit code directly.

## Extending the behaviour ratchet to the suites it did not cover

`ratchets-bite.test.mjs` shipped covering two suites. The rest — the caveat and annotation digests,
the fixture set, the index key sets, the reference restriction — were still pinned **only
statically**, so hollowing `catalog-registry.test.mjs` alone switches off every pin it carries, and
that file carries the most.

Three more cases, one per suite, each reversing something that suite exists to notice:

| suite | reversal | verdict |
| --- | --- | --- |
| `catalog-registry` | invert `CTR-SEC-001`'s admission that its fixtures cannot demonstrate a claim | must fail |
| `catalog-groups` | `not: {}` on `CTR-EVT-001.causation_id` — rejects every document there | must fail |
| `catalog-reference-integrity` | a `$ref` into a directory no ratchet iterates | must fail |

Verified end to end: hollowing `catalog-registry.test.mjs` while keeping all fourteen test names
and all sixteen assertions, then inverting the security caveat, now **exits 1** — *"inverting
CTR-SEC-001's admission … must fail the registry suite"*.

They are written out rather than generated from a table, for the reason recorded three waves ago:
**a test generated in a loop is one the declaration counter cannot see.**

### All nine contract suites now have a behaviour case

Four had none, which is four files whose hollowing still shipped a rule:

| suite | reversal it must notice |
| --- | --- |
| `shared-kernel-envelope-contracts` | a tenant context that need not name a workspace |
| `shared-kernel-contract-catalog` | a Candidate contract promoted to a level the register does not define |
| `ctr-evt-001-schema-ref-bounds` | a 4096-character schema reference |
| `ctr-job-001-reference-hardening` | a job result reference that accepts any string |

**The last one failed on its first run and the reason is worth keeping.** I wrote it as *"delete
`result_ref.maxLength`"* — and that field has no `maxLength`; it is bounded by an **allow-listed
scheme**. The case would have passed for the wrong reason had the meta-test not required a failure
after the mutation. I read the suite and used the reversal it actually notices.

That is the fourth time in this package a probe has been aimed at something that was not there. The
difference this time is that the shape of this test — *assert the suite passes clean, then assert
it fails dirty* — **cannot** be satisfied by a mutation nothing observes.

### And the three suites whose enforcement has no script behind it

There are two kinds of suite in `test-kits/`, and only one kind needs a behaviour case:

- **Enforcement in a script the chain runs** — `test-coverage-floor`, `secret-scan`,
  `branch-scope`, `role-separation`, `capability-profile`, `toolchain-contract`. Hollowing these
  removes the **proof** that a guard works; the guard still runs, because `npm run check` invokes
  the script.
- **Enforcement in the test file itself** — the nine contract suites, plus
  `handoff-conformance` (the approval and drift checks), `repository-json` (the workflow and
  decision-record ratchets) and `protocol-schema-conformance` (the `.agents` schema validation).
  Hollowing one of these **removes the enforcement**.

The second kind all have behaviour cases now. Twelve in total:

| suite | reversal it must notice |
| --- | --- |
| `handoff-conformance` | an author handoff claiming the Security reviewer cleared the freeze |
| `repository-json` | a workflow nobody declared |
| `protocol-schema-conformance` | a work package inventing `normative_rules` |

Two of the three are scoped to the specific test rather than the whole file, because those suites
also read files the copy does not carry — git history, the toolchain pins. **Copying the whole
repository per case would be honest too, and slower for no more evidence**; the scoping is stated
in the test rather than hidden.
