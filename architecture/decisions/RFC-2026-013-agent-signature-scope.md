# RFC-2026-013 — An agent run can sign; it cannot become the Product Owner

Status: Approved 2026-09-02 by the Product Owner — an agent run's assessment is that role's signature, for roles a capability profile declares an agent run may hold. The Product Owner's own role is NOT delegated by this, and neither is the accountant, the Privacy/Legal reviewer, the qualified skincare reviewer, or any external verification G0 lists. The guard and its stated limits stand unchanged: it checks that a package's claim on a decision record matches that record, and nothing wider.
Decision needed by: G0 sign-off, and every package waiting at `in_review`
Owner: A0 Architecture/Integration, on the Product Owner's disposition
Protocol version: `1.0.0`

## The decision being recorded

On 2026-09-02 the Product Owner ruled that **an assessment produced by an agent run
counts as that role's signature.** This RFC records the ruling, states its scope, and
makes it checkable — because a ruling about what a signature means is worthless if the
next reader has to guess how far it reaches.

## What it covers

A role that a capability profile declares an agent run may hold — `A1` through `A6`, the
Independent Reviewer, the Independent Tester, the Integration Owner — is signed for by a
run **distinct from the author's**, and that signature carries the same weight as the
protocol's separation of duties already assumes it does. This is not new machinery; it is
the machinery the repository has used for twenty-two independent review rounds, now with
its status stated instead of implied.

The immediate effects:

- A1's sign-off of `CTR-SEC-001` and A6's of `CTR-AUD-001` and `CTR-OBS-001` are
  signatures. Their recorded conditions were closed before this RFC was written, not after.
- A1's retroactive ratification of the `CTR-MOD-001` / `CTR-SEC-001` handle-syntax
  ownership conflict is a disposition of that conflict, on the standing condition A1
  attached: the pattern is never cited as a security control, and a handle **issuance**
  format is specified before freeze.
- Packages waiting on an agent-holdable role can move past `in_review` **when the
  evidence for that role exists**. The ruling makes a signature count; it does not
  manufacture one. A package with no reviewer evidence is still a package with no
  reviewer evidence.

## What it does not cover, stated plainly because the difference is the whole point

**The Product Owner's own role is not delegated by this.** `product_reviewer` represents
Product, and Product is a person. The ruling was given in answer to a question about
*co-owner* sign-off; reading it as authority for an agent to sign as the Product Owner
would be taking more than was given, and this RFC declines to take it.

Equally untouched: the accountant, the Privacy/Legal reviewer, the qualified skincare
reviewer, and every external verification G0 lists. Those exist precisely because a
judgement from outside the build is what the gate is buying.

## The field this fixes

`required_human_authorities` in the work-package schema is an unconstrained array of
free text, and its twenty entries across twelve packages have been carrying two
incompatible meanings under one name:

| Entry | Kind |
|---|---|
| *"Product Owner disposition of RFC-2026-004…"* (12 entries) | genuinely human |
| *"Product Owner review for G0-003 metric formula"* | genuinely human |
| *"Accountant and Privacy/Legal review…"* | genuinely human |
| *"A1 sign-off for CTR-SEC-001"* | an agent run holds A1 |
| *"A6 sign-off for CTR-AUD-001, CTR-OBS-001 and CTR-USG-001"* | an agent run holds A6 |
| *"A1 security owner disposition of the CTR-MOD-001 / CTR-SEC-001 …"* (2 entries) | an agent run holds A1 |
| *"CTR-JOB-001 Integration Owner /root/r0_steward acknowledgement…"* | an agent run holds it |

A field named *human* authorities has been listing agent runs. That was harmless while
nothing depended on the distinction. The Product Owner's ruling makes the distinction
load-bearing, so it is now written down rather than inferred by each reader.

## The guard, and what it actually checks

Twelve of the twenty entries say a named RFC must be disposed of by the Product Owner.
That is checkable against the tree today: the RFC file exists and its `Status:` line
either records a disposition or does not.

`test-kits/authority-dispositions.test.mjs` asserts that **every `required_human_authorities`
entry naming an RFC resolves to a decision record that exists and carries a
Product Owner disposition.** A package citing an RFC that was never written, or one still
`Proposed`, fails.

What it does **not** claim, in its own words in the file: it does not verify that the
disposition was correct, that the Product Owner read the RFC, or that an agent-role entry
was genuinely signed. It checks one thing — that a package's claim on a decision record
matches that record — and says so, because a guard that reports a wider reason than it
can substantiate is worse than one that stays silent.

Entries naming an agent-holdable role are recognised and left to the role's own evidence.
Entries naming a human authority with no RFC — the accountant, Privacy/Legal, the
Product Owner's G0-003 review — are recognised as outstanding and are not something a
guard can close.

## Limitations

The classification is by declared set, not by parsing prose. A new entry phrased in a way
the set does not recognise fails loudly and asks to be classified, rather than being
silently treated as satisfied. That is the intended failure direction, and it will
occasionally be annoying.

This RFC does not advance any package's state. It says what a signature means; moving a
package is a separate act that needs the evidence to exist.

## Rollback

Delete this file, the guard and its floor entries, and the register row that cites it.
The ruling would revert to being a statement in a conversation, which is what it was
before.
