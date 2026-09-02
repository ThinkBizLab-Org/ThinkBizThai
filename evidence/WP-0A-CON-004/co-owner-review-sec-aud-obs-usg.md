# Co-owner review of the four jointly-owned shared-kernel contracts

Author run: `/claude/a0_atlas`. Reviewers: `/claude/a1_bastion` (A1, Security) and
`/root/a6_relay` (A6, SRE/Billing), each a distinct `agent_run_id` from the author and
from each other. Both worked from the shipped schema, manifest and fixture set and ran
probes against the repository's own validator.

`CTR-SEC-001`, `CTR-AUD-001`, `CTR-OBS-001` and `CTR-USG-001` are **Draft**. This review
is the co-owner step that must happen before A0 can propose promoting any of them, and
it was asked for on the terms RFC-2026-010 sets out itself: *"The check is presence of
the artifact the phrase names ... It is not proof that the artifact satisfies the intent
behind the phrase."*

## Verdicts as returned

| Contract | Co-owner | Verdict |
|---|---|---|
| `CTR-SEC-001` | A1 | Sign off **with blocking conditions** |
| `CTR-AUD-001` | A6 | Sign off with recorded conditions |
| `CTR-OBS-001` | A6 | Sign off with recorded conditions |
| `CTR-USG-001` | A6 | **Refuse** — three named items |

## What the review found, and what the author verified

Every claim below was re-executed by the author against the shipped files before acting
on it. One reviewer claim did not reproduce on the first attempt and is recorded as such.

| Finding | Reviewer | Author's check |
|---|---|---|
| A `rotating` handle carrying a complete revocation record validates with `resolvable: true` | A1 | **Confirmed.** Changing one word in `valid-revoked-no-longer-resolvable.json` from `revoked` to `rotating` produced an accepted document. |
| The schema `description` claims no property could hold credential material | A1 | **Confirmed false.** `correlation_id` has `minLength: 1` and no `maxLength`; it accepts a credential-shaped string verbatim. |
| *"redaction tests"* names an artifact that does not exist | A1 | **Confirmed.** `redaction` is six `const: true` flags — a self-attestation no valid document can contradict. |
| `cost.supersedes_usage_id` `x-source` says self-reference is rejected | A6 | **Confirmed false.** A document whose `supersedes_usage_id` equals its own `usage_id` validates. |
| The 16-digit bound is justified as keeping values inside IEEE-754 exact range | A6 | **Confirmed false.** `9999999999999999.99999999` validates and parses to `10000000000000000`, past 2^53−1. |
| `sli_tags.environment` accepts a workspace id | A6 | **Confirmed.** The four-value enum it should use sits 30 lines above in the same file. |
| `dedupe_key` has no composition, so a correction is indistinguishable from a double-count | A6 | **Confirmed.** The rule existed nowhere in the repository. |
| A non-delete audit record with `change: {}` is accepted | A6 | **Not reproduced at first** — the author's probe happened to pick a `delete` fixture, where `allOf[0]` rejects it. Re-run against a `credential` record: **confirmed**. |
| The catalog's only worked supersession is incoherent | A6 | **Confirmed.** An `ai_tokens` event superseded a `storage_bytes` estimate. |
| RFC-2026-010 cites OPEN-016 for the money question | A6 | **Confirmed.** OPEN-016 is Product KPI; the accountant is named in OPEN-001. |

## Dispositions

**Fixed in this change.** `CTR-SEC-001` gains `allOf[4]` — a handle carrying a revocation
record must not resolve, whatever its `state` — with `invalid-rotating-with-revocation-record.json`
proving it. The `description` over-claim is corrected and names the four free-text
properties a producer must not paste a credential into. `CTR-AUD-001.change` gains
`minProperties: 1`. `CTR-OBS-001.sli_tags.environment` is closed to the four Track INF
environments. `CTR-USG-001.dedupe_key` states its composition
(`usg:<workspace_id>:<job_id>:<dimension>:<cost.basis>`) and its uniqueness scope, with
`cost.basis` in the key precisely so a correction and a duplicate are distinguishable;
the incoherent supersession is repointed at a new `valid-estimated-ai-tokens.json`. Both
false `x-source` sentences are corrected in place rather than deleted.

**Reviewer overruled, with the reason recorded.** A6 proposed closing
`CTR-OBS-001.sli_tags.outcome` to `CTR-AUD-001`'s `succeeded`/`failed`/`denied`. The
author tried it and reverted it: AUD's `outcome` is the result of an actor's action,
this label is the result of a health probe, and the contract's own fixtures use
`success`, `down` and `provider_unavailable`. The borrowed vocabulary rejected this
contract's own valid documents. Closing this label needs an SLI outcome vocabulary and
no source states one, so it stays open and the reason is written into the schema — the
same position `error_code` is in. **No vocabulary was invented to make a guard look
closed.**

**Recorded, not fixed.** Self-reference, supersession uniqueness and agreement between a
`dedupe_key`'s parts and the document's own fields are all resolver obligations outside
this validator's subset; they are now in `untestable_by_schema` instead of being claimed
as enforced. The per-label cardinality budget A6 would sign as SRE owner (environment 4,
outcome 4, error_code 64, capability_key 16 per module, module_key 32) is recorded for
the metric dictionary and is **not** enforced here; it is unreachable until
`CTR-ERR-001.code` has a vocabulary. A1's handle **issuance** format, the SEC-003 class
assignment, real runtime redaction tests and the DEC-010 nesting remain before freeze.
VAT treatment is absent from `CTR-USG-001` by design and belongs to OPEN-001 with an
accountant.

**A ratchet was loosened, deliberately.** `allOf[4]` is strictly more general than two
clauses already in `CTR-SEC-001`, so neither of those can now be killed by any document.
Both are kept anyway — without `allOf[1]`'s `not`, an active handle carrying a revocation
record is reported as a `resolvable` mismatch, which sends a reader to the wrong field,
and a guard that reports a wrong reason is worse than one that stays silent. The cost is
two entries in `UNPROVEN_CONDITIONAL_GAPS` and a rise in three `UNKILLED_CEILING` values,
each carrying the verification that shows why nothing can distinguish the sites.

## What this review does not establish

It does not establish that an agent assessment is a co-owner signature. Whether A1 and
A6 are held by agent runs or by people is the Product Owner's call, and Gate G0's
sign-off item stays open until they make it. What is established is narrower and still
useful: four contracts were read by runs that did not write them, five defects were
found that every guard in this repository had passed, and one reviewer recommendation
was wrong and was not followed.

`npm run verify` after the change: `clean: exit 0 — tests 256, pass 256, fail 0`.

---

## Second A6 assessment of `CTR-USG-001` — 2026-09-02

The Product Owner ruled that an agent run's assessment is that role's signature
(RFC-2026-013). A6 was therefore asked again, from a fresh run, whether the refusal was
lifted now that its three named items were closed.

**A6 confirmed all three closed** — the composition and uniqueness scope stated and
pattern-enforced, the supersession now pointing at an estimate of the same dimension, the
false self-reference claim corrected and declared — **and refused again on a fourth
ground, which the author's own fix had introduced.**

The composition `usg:<workspace>:<job>:<dimension>:<basis>` together with the rule *"a
second event carrying a key already seen is a duplicate and must be dropped, not summed"*
instructs a consumer to discard a second legitimate charge for one job. Verified by the
author before acting: two `ai_tokens` estimates for one job five minutes apart, 1450 then
2900 tokens, both validate carrying an identical key.

That is worse than the gap it replaced. The first key could not detect double-counting;
the replacement **manufactures** the missing-usage condition OB-008 exists to detect, and
does it in the direction that loses money.

RFC-2026-014 records the fix: the key carries the measurement instant, so two measurements
are summed and a redelivery still collapses, while `ID-002` redelivery idempotency stays
keyed on `usage_id` where it belongs. A6 offered a second acceptable resolution — declaring
a usage event to be the single terminal measurement per job, dimension and basis — which
was **not** taken, because no source states that cardinality and the chosen reading loses
no data if the other one turns out to be intended.

**The point worth keeping:** the second refusal caught a defect the fix for the first
refusal introduced. That is the failure an author is least able to see, having just
convinced himself, and it is the strongest argument yet for what the Product Owner's
ruling makes these signatures worth. `CTR-USG-001` remains **unsigned** pending a third
assessment.
