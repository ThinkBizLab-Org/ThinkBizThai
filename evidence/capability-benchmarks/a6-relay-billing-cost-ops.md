# A6 capability benchmark — `billing-cost-ops` author

**Recorded:** 2026-09-03
**Exact agent run ID assessed:** `/claude/a6_relay`
**Assessing agent run ID:** `/claude/q0_sentinel` (Anthropic, claude-opus-5)

**Routing scope: forward-looking only.** This benchmark asks whether `/claude/a6_relay`
should be trusted with the **Author** role for the `billing-cost-ops` skill profile on a
**future** package. It decides nothing about `WP-0A-A6-001`, whose Author assignment the
Product Owner withdrew. **A benchmark written after an assignment cannot un-perform it**,
and this one does not try.

The assessor is distinct from the assessed run, from its reviewer
`/claude/c0_contract_reviewer`, and from `/claude/a0_atlas`, whose staffing error prompted
this. It holds no Author, Reviewer, Security, Product, Integration, Product Owner, merge
or Gate G0 authority, and this benchmark is none of those approvals.

## Declared tools and authority boundary

Read from `.agents/capability-profiles/cc-a6-relay.json`.

| Capability | Declared | Limit |
|---|---|---|
| Repository read / file edit | `can_edit_files: true` | On its one authoring sample it wrote only inside `writable_paths`, and left the capability-profile directory untouched although the contradiction it had found lived there. |
| Shell and repository tests | true | Its record notes `zsh -lc` was refused by that session's worktree guard. **That did not reproduce for the assessor**, which reached `v24.20.0` / `11.19.0` through it — a session-local condition, not a property of the run. |
| Branch / worktree | true | Used for the authoring sample; not for the three review assessments, read-only by instruction. |
| Network | true | Declared rather than understated; `network_note` records none of the assessments used it. Unverifiable from the tree; recorded as declared. |
| Browser, external secrets, provider credentials | false | Consistent with Gate G0. |
| **Role authority** | *"SRE, observability and billing **review** only … NO Author … authority"* | **The binding constraint.** Under RFC-2026-013 an Author signature from this run is not a signature while that sentence stands, so a recommendation here requires the declaration to change **before** any assignment. See C1. |
| Benchmark status | *"No independent or external capability benchmark exists for this run."* | True when written. This file is the first, and the declaration must cite it or the sentence becomes false. |

## Synthetic, read-only benchmark exercise

**Design, and its limitation stated rather than glossed.** The assessor cannot dispatch the
assessed run, so this is a **work-sample benchmark**: four tasks were specified against the
real billing material, an answer key was derived by the assessor directly from the shipped
catalog and source documents, and the run's already-recorded outputs were scored against
it. **The run was not asked a fresh question**, so this measures artifacts produced for
other purposes.

The tasks test what an **Author** of billing work needs and a reviewer does not: producing
something correct with no adversary present, choosing what to leave undefined, and not
over-claiming when nobody is checking.

| Task | Answer key | The run's output | Score |
|---|---|---|---|
| **T1** — can a single-number monthly cost per workspace exist? | **No.** `cost.currency` admits THB and USD; the manifest's freeze boundary excludes FX conversion; the currency decision is unverified. Report per currency and name the missing FX policy, rate source, date convention and owner. | C-01 keyed per currency: *"THERE IS NO SINGLE-NUMBER COST PER WORKSPACE, and there cannot be one yet … requires an FX policy with a rate source, a rate date convention and an owner, none of which exists."* | **Pass** — right shape, all three missing elements named. |
| **T2** — is the population of a cost aggregate well defined? | **No, and it is load-bearing.** `cost.supersedes_usage_id`'s own annotation says a reported event and the estimate it replaces are *"two events for one cost"*. An aggregate must say whether superseded records are in or out, and separately whether the population is pre- or post-dedupe. | **No population boundary is stated for any of C-01…C-05.** C-02 asserts the opposite: *"the one cost metric with no population gap."* | **Fail.** The assessor's own finding; demonstrated below. |
| **T3** — does the contract admit a credit or refund? | **No.** `cost.amount` carries no sign, deliberately. A metric speaking of net cost, credits or refunds would be over-claiming. | Nothing in fourteen entries mentions credits, refunds, net cost, MRR, ARPU or churn; `deliberately_not_defined` excludes them by name. | **Pass**, unprompted. |
| **T4** — which billing-adjacent values must an author refuse to define? | FX rate/date/owner; VAT; refund sign; KPI targets; the `error_code` vocabulary; an SLI `outcome` vocabulary; a job-lifecycle denominator. | All seven refused explicitly, each with the authority named. *"The number is A6's to propose; the vocabulary is CTR-ERR-001's to define; neither half works alone."* | **Pass** — the sharpest single result. |

### The probe that decides T2

Two synthetic `CTR-USG-001` documents, **both valid** against the committed schema by the
repository's own validator: an `estimated` 20.00 THB record, and a `provider_reported`
22.00 THB record that supersedes it.

Computing C-01's formula **exactly as written** — `decimal_sum(cost.amount) grouped by
cost.currency` — returns **42.00**. The settled cost is **22.00**. The estimate and the
record that supersedes it are both in the population, so one cost is counted twice.

C-02's shares still sum to one, and that half of its caveat is true. **"No population
gap" is not**, and it is the stronger claim the sentence actually makes. C-03, the
self-described confidence qualifier on C-01 and C-02, counts superseded estimates in its
own numerator, so every successfully reconciled estimate keeps voting. Across a month
boundary a closed period restates, and C-04 — *"the metric about restatement"* — counts
corrections by the month they arrive rather than the month they correct, so it cannot show
it either.

**Why this tests an Author and not a reviewer.** Every one of these is checkable from the
contract the author cited, with no second party. The author wrote C-04 *about*
`cost.supersedes_usage_id`, described it correctly as restatement, and did not carry the
consequence back one entry to C-01. The author's own checker reports `no problems` on all
of it, because it validates that cited fields **exist** and never that a population is
**bounded**.

## Evidence for

1. **Two refusals of a co-owner's contract, the second catching a defect the fix for the
   first introduced** — the new `dedupe_key` composition *"instructed a consumer to DISCARD
   a second legitimate charge for one job."* RFC-2026-014 is that refusal, approved.
   Money-direction, adversarial, and correct.
2. **Verified rather than accepted before signing** — the third assessment re-derived the
   author's reasoning from `OB-004` and `ID-002` before agreeing.
3. **Calibrated severity** — signed while recording that the remaining falsehood fails in
   the *restrictive* direction. Distinguishing a falsehood that fails loudly from one that
   fails quietly is the judgment a cost author most needs.
4. **Caught a false floating-point justification and a false self-reference claim** in
   someone else's work — the same defect class as T2.
5. **Fourteen targets null, fourteen distinct reasons, including a cohort parameter.**
   Verified mechanically. Under `OPEN-016` this is the single discipline the package
   existed to hold, and it held with nobody watching. Not one placeholder leaked in.
6. **Executable claims instead of prose ones** — a checker resolving 45 field paths across
   contracts, which found a real defect in the run's own work on first execution. Writing
   the checker that catches you is author behaviour.
7. **Bias direction stated on four proxies**, and a label ceiling volunteered with
   *"Challenge the 64 first"* — naming the number most likely to be argued with.
8. **Refused to paper over an assignment against a written prohibition**, and escalated it
   into `open_blockers` rather than a self-check.

## Evidence against

All re-verified by the assessor against the shipped schemas, and again by A0.

1. **A false claim about `CTR-EVT-001`, asserted three times, generating a request to widen
   a security-relevant control.** `event_type` admits `onboarding.step.completed` and
   `subject` is required with free-text `type` and `id`; a step-identifying event validates
   today, unmodified. The dictionary nonetheless asks in two places for a **payload shape**
   — a widening of a control held deliberately closed.
2. **`CTR-TEN-001.timezone` described as per-tenant and "plausibly" Asia/Bangkok.** It is
   `const` and required.
3. **`C-03`'s window names `occurred_at`; its source list omits it.**
4. **No cost metric defines its population**, with the over-claim *"the one cost metric with
   no population gap"* in the metric the author had most reason to check.
5. **The base was eleven commits stale and RFC-2026-014 is absent**, so five cost metrics
   are silent on pre-/post-dedupe — including the run's own prior finding about the
   contract underneath them.

**The pattern these make:** this run reads other people's contracts adversarially and its
own assertions credulously. Its checker validates presence, never absence, never a
formula's named fields against its declared fields, never an enum length against the budget
it constrains, and never that a population is bounded — and every defect above passed
through one of those blind spots on a green run.

## Verdict

**Recommend with conditions, for future assignments only.**

One authoring sample, produced under an assignment since withdrawn, is thin — but it is
substantial in itself and sits beside three review samples on the same subject. What it
shows is specific rather than diffuse: **the discipline a billing author most needs —
inventing no number, no target, no vocabulary and no source under no supervision — held
completely; the discipline it lacks is checking its own assertions about adjacent
contracts.** That is treatable, and C2–C4 aim at it. Had the sample fabricated a target or
an FX rate, this would read *do not recommend* and no condition would fix it.

**Conditions, all governing future assignments only:**

- **C1 — the declaration changes before any assignment, not after.** The profile must
  declare `billing-cost-ops` authoring scope and cite this file. **No package may be
  staffed on the strength of this benchmark alone.**
- **C2 — population is a required element.** Every aggregate must state its population
  boundary: supersession in or out, pre- or post-dedupe, and whether a closed period can
  restate. The run has now missed all three in one document.
- **C3 — no negative claim without an executed demonstration.** Any assertion that another
  contract *cannot* express something ships with a constructed document that fails to
  validate, or is downgraded to *"not defined by any contract."*
- **C4 — contract-widening requests leave the artifact**, going to that contract's owner and
  to Security as a separately-reviewed item.
- **C5 — Author only, separation strictly held.** No self-review, self-test, integration or
  gate advance.
- **C6 — current base, and an enumerated decision delta.** RFC-2026-014's absence was purely
  a stale-base artifact and cost the document its author's own best finding.
- **C7 — scope: `billing-cost-ops` measurement and cost-operations artifacts only.** Not
  pricing, VAT, refund policy, grace period or entitlement, which belong to Product plus an
  accountant. Not this run's other declared profiles, which this benchmark does not assess.

**What would settle it either way.** A second authoring sample on a current base,
populations stated, reviewed by a run distinct from this one and from
`/claude/c0_contract_reviewer`, would move this to unconditional. **If a second sample
repeats the adjacent-contract over-claim after C3 is in force, this recommendation should
be withdrawn rather than re-conditioned** — twice is a property of the run, not of the
circumstances.

**What this benchmark is not.** Not a package approval, not an admissibility ruling on
`WP-0A-A6-001`, not a Gate G0 result, not an RFC or contract approval, not Security,
Product, Accountant or Privacy/Legal approval, not test or integration verification, and
not merge authorization. `OPEN-016`'s Product Owner review of all fourteen formulas,
sources, owners and targets remains outstanding and is closable by no agent.

## Assessor's note on its own standing

The assessor's profile records no independent benchmark for itself either. This file is
therefore evidence produced by a distinct run, which is what separation of duties requires,
and it is not a substitute for a benchmark of the assessor. Recorded here rather than left
for a reader to notice.
