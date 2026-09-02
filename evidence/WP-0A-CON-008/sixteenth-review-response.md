# Independent review #16

Four HIGH, three MEDIUM/LOW, and two corrections to this package's own evidence. All closed.

## HIGH 1 — a newline in `scripts.check` skipped the entire suite at exit 0

The chain guard split on `&&`, rejected `||` `;` `|` `#` `&`, and pinned first, last and order. A
**newline is a POSIX command separator** and was in no forbidden set. The review wrote:

```
… && npm run validate:protocol && true
exit 0 && npm run test:bootstrap
```

Every required step present as its own step; order, first and last satisfied; no forbidden
character anywhere. `sh` ran `exit 0` on the second line. **exit 0, zero tests executed, no
`ℹ pass` line at all** — the suite, the verification record, the post-run integrity re-check and
the declaration reconciliation all skipped, and CI's `npm run check` step green with them.

Two fixes, because the first alone is not enough:

1. **A step is an allowed alphabet**, `[A-Za-z0-9 ./:_@-]`, not a list of forbidden operators.
   Enumerating separators was the wrong shape: `\n`, `\r`, `$(`, a backtick and `(` are all
   separators or substitutions, and the next one is whatever nobody listed. **And the chain must
   equal the five required steps exactly** — the newline rode in on an extra step, which the
   containment check permitted.
2. **The guard runs outside the chain.** Probing the fix showed the guard firing, printing its
   rejection — and `npm run check` **still exiting 0**, because the `exit 0` in the string got the
   last word. *A guard that lives inside the string it audits cannot report on that string.*
   `npm run verify` now runs `verify-test-coverage-floor.mjs` directly first, which is the remedy
   RFC-2026-007 already gives for CI. Verified: the carrier now exits **81** through `npm run verify`.

## HIGH 2 — nothing asserted what CI runs, so the workflow could be reduced to a no-op

`ci.yml` was digested and matched by three regexes. The review replaced it with
`on: workflow_dispatch` plus checkout and setup-node, satisfying all three, at **exit 0, 226/226** —
deleting the independent guard step, the branch-identity step and the branch-scope step.

This is worse than the acknowledged edit-file-and-digest class: **the integrity manifest's own note
names CI as the outside anchor** for a tripwire that has no self-anchor. A workflow that runs
nothing anchors nothing. The workflow is now asserted structurally — the `pull_request` trigger and
each of the four guard invocations — plus the `if: github.event_name == 'pull_request'` condition,
because that condition is a documented limitation and not something to widen silently. Verified:
the gutted workflow exits 1.

## HIGH 3 — an RFC outranks every document that was digested, and no RFC was

`CONTRIBUTING_AGENTS.md`'s conflict order puts an approved RFC **above** the Decision Register and
above itself. The review amended RFC-2026-010 with a binding "Amendment 1" exempting internal
callers from tenant isolation and recording A1/A6 sign-off as satisfied, echoed it in the Product
Owner briefing, the author self-check, a work package's acceptance criteria and the handoff — and
`npm run check` **exit 0**, `verify-branch-scope` **exit 0**.

All ~~eleven~~ **ten** decision records are digested and in `DIGESTED_FLOOR` (review seventeen counted them; the directory holds ten RFCs and a `.gitkeep`), along with
`contract-catalog/README.md` (MEDIUM 6, the one filename the whole-catalog walk allows). Verified:
appending an amendment to RFC-2026-010 exits **86**.

**What remains open, stated plainly:** a *new* RFC file is caught by branch-scope (exit 73) and not
by `npm run check`; and the handoff/evidence channel — a fabricated approval written into a handoff
or an evidence file — is caught by nothing, because those paths are `WRITTEN_AFTERWARDS` by
construction. **A digest cannot fix that. It needs the reviewer to read it.** It is on the
"not closed" list.

## HIGH 4 — one digested file was missing from the floor, and the floor was hand-maintained

Of 52 manifest keys, exactly one was absent from `DIGESTED_FLOOR`:
`protocol-schema-conformance.test.mjs` — the suite added two waves earlier to turn
`.agents/*.schema.json` into controls. Deleting it exited **0 at 222/222**, and review fifteen's own
MEDIUM 7 mutation then passed again.

Fixed structurally rather than by adding a line: the floor now **maintains itself** — every key in
the manifest must be in `DIGESTED_FLOOR`, so a newly digested file cannot exist without joining the
deletion ratchet, and a duplicated entry is rejected because the review also spotted two names
listed twice. Verified: deleting the suite exits **87**.

## MEDIUM 5 — three permitted keys carried normative claims nothing read

`MANIFEST_KEYS` is a permitted-key set, not a required-value set. `trust_boundary` was asserted for
one contract, `source_references` only for shape, `agreement_witnesses` by nothing.

The review gave `CTR-API-001` `agreement_witnesses: ["A1 (security) has signed off on the
internal-caller exemption", "A6 has signed off"]` — **fabricating precisely the sign-off
RFC-2026-010 lists as outstanding, in the file a freeze reviewer reads.** All three fields are now
pinned per contract by digest, in both directions. *A contract must not be able to write its own
sign-off.*

## MEDIUM 7 — the subset validator pretended to enforce `format`

Executed: `format: "uri"` accepted `"not a uri at all"`, `"email"` accepted `"@@@"`, `"uuid"`
accepted `"zzz"`. `format` is in `SUPPORTED` and only `date-time` was enforced — a keyword that
appears to constrain and does not, **the exact invariant that file's own header states it exists to
prevent.** And `uniqueItems` compared `JSON.stringify` output, so `[{a:1,b:2},{b:2,a:1}]` passed.

Both fail closed now: an unenforceable `format` is rejected outright rather than ignored, and
uniqueness is compared on canonically key-sorted form. Latent today — only `status.schema.json`
uses `format`, with `date-time` — and a trap for the next schema.

## Corrections to this package's evidence

- *"MEDIUM 5 … Verified: exit 1"* — the first exit is **86**, the integrity tripwire, because
  `index.json` is digested. Naming the wrong guard's code makes the record useless to anyone
  reproducing it.
- *"`npm run check` — 225/225 … exit 0"* — wrong in both directions: at the commit it documents the
  real result was **exit 88**, which the same file admits forty lines later. The number is deleted
  and `evidence/VERIFICATION.md` is cited instead.

## Verification

See `evidence/VERIFICATION.md`, written by `npm run record:verification`. `npm run verify` reports
the exit code directly.

---

## Closing the two things the review left open, as far as they can be closed

### A new decision record

Digesting the eleven existing RFCs stops an **edit**. A **new** file was still caught only by the
branch-scope guard — which runs in CI on a pull request and not in `npm run check` at all, so
`RFC-2026-011-internal-caller-exemption.md`, `Status: Approved`, could be written and tested green
locally.

The set is now named, and each must carry a digest. Verified: adding that exact file exits **1**,
*"a new decision record nobody declared. An approved RFC outranks every document in the conflict
order, so adding one is the highest-authority act available here."*

### A fabricated approval — the half that is mechanisable, and the half that is not

The review is right that a digest cannot fix this: `handoffs/` and `evidence/` are
`WRITTEN_AFTERWARDS` by construction, because a handoff cannot list the commit that contains it.

**The separation of duties fixes part of it.** An author writes an author handoff and moves work no
further than `in_review`; an approval is a different role's artifact, in a different file, written
by a different `agent_run_id`. A handoff that *speaks for a role it does not hold* is a protocol
violation a machine can see.

Two probes, both now failing:

| probe | exit |
| --- | --- |
| author handoff records *"`/claude/a1_bastion` executed the security review and approved this package"* | 1 |
| author handoff declares `final_status: "review_approved"` | 1 |

**What is still not caught, stated plainly:** a handoff that lies only about **its own** work —
claiming a test run that never happened, an exit code that was never observed. Nothing here can see
that, and the "not closed" list says so. That one needs a reader, which is exactly what the
separation of duties exists to provide and what the Product Owner's review is for.

## Self-probe: the npm layer, which no guard had looked at

Sixteen rounds of review and every probe of mine had stayed inside the repository's own files.
`package.json` is where npm gets to run code.

| probe | before | after |
| --- | --- | --- |
| `"dependencies": {"left-pad": "^1.3.0"}` | **exit 0** | exit 1 |
| `"preinstall": "node -e …"` | **exit 0** | exit 1 |
| a new script key nobody declared | exit 0 | exit 1 |
| `npm ci --ignore-scripts` → `npm ci` in the workflow | exit 0 | exit 1 |

**A `preinstall` script runs before every guard in this repository** — a stronger position than any
bypass found in sixteen rounds, because it does not need to defeat a guard at all. CI happens to
run `npm ci --ignore-scripts` today, which neutralises it there; that flag was one edit away from
being deleted, and a developer running `npm install` never had it.

Zero npm dependencies is a **stated property** of this repository, written in the briefing since
the first wave, and it was asserted by nothing. Now: no dependency field of any kind, no npm
lifecycle script, the script key set pinned exactly, `--ignore-scripts` required in the workflow,
and `package-lock.json` digested.

*The lesson generalises past npm: every probe so far asked whether a rule could get INTO the
repository. This one asked what runs BEFORE the rules are read.*

**And the self-maintaining floor caught me in the same minute.** Digesting `package-lock.json`
without adding it to `DIGESTED_FLOOR` failed at exit 87 — *"a file that is protected must also be
undeletable; add it to the floor in the same commit."* That guard was written two hours earlier for
exactly this, and its first real catch was its own author.
