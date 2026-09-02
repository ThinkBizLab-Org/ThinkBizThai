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

Verified: both payloads produce three flagged clauses each.

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
