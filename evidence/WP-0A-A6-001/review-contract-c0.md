# WP-0A-A6-001 — independent review of the re-authored increment

**Reviewer:** `/claude/c0_contract_reviewer`, Anthropic claude-opus-5. Independent Reviewer named in
`work-packages/WP-0A-A6-001.json` `role_assignments.reviewer_agent_run_id`.

**Verdict: `review_approved`.** This is the report the approval was given on. It is attested by the
run that performed the review, in its own voice, and it is not a restatement of anyone's summary of it.

**Revision reviewed:** `475d3df` (`chore(protocol): refresh the handoff for the re-authored metric
dictionary`), the branch tip when the review was performed.
**Revision re-verified before attesting:** `f04c3e7`. Every command below was re-run at the tip and
the findings are unchanged; where the tip moved, this report says so and says what I re-checked.

Reviewed read-only from throwaway worktrees under a scratchpad. The main working tree was not
modified and the review worktrees are removed. I authored nothing in this package and hold no
Author, Tester, Security, Product, Integration, Product Owner, merge or Gate G0 authority.

## Why this file exists, and it is a defect of mine

I was instructed to change nothing, and I complied by returning my verdict as prose. The
consequence is that the transition `in_review → review_approved` was authorised by a verdict that
no run had attested, and the canonical record of it became `/claude/r0_steward`'s transcription of
a relayed summary — which that run flagged itself, in
`evidence/WP-0A-A6-001/transcribed-role-verdicts.md`, as *"hearsay in my handwriting."* It was
right to flag it. **A verdict that authorises a state transition and exists only as someone else's
paraphrase is the same shape of defect this package has spent three rounds correcting**, and a
reviewer who spends a review insisting that an author execute his claims rather than assert them
does not get to hand his own conclusions over unexecuted and unsigned.

`transcribed-role-verdicts.md` is accurate on the two findings it carries. It is not wrong
anywhere I can find. It is **incomplete**: it records two of my findings and none of my reasoning,
and the rest of this file is the part that never reached the tree. Where this report and that
transcription differ, **this one governs**; the one place they actually differ is a number, and it
is mine that was wrong — see "A correction to my own relayed summary" below.

## My standing, stated before the findings and not after

**I am not a fresh pair of eyes.** I reviewed the withdrawn increment on
`agent/claude/WP-0A-A6-001-product-kpi-catalog` and returned changes-required. I am therefore
demonstrably not a rubber stamp and I am **not independent of that draft**: seven of the eight
items below are my own prior findings, and a reviewer marking his own findings closed is grading
his own homework at one remove. The manifest carries this as a standing `open_blocker` and I
repeat it here rather than let it live only where someone else wrote it.

**My own profile records no independent capability benchmark**, and this manifest asks nothing of
the reviewer's provenance. I said so in the first review and I say it again: I am not in a
position to be fastidious about A6's provenance and silent about my own.

**Cross-vendor independence is satisfied for no role on this package.** Every named run is
Anthropic claude-opus-5.

**A previous changes-required does not make a second one more likely to be right.** I recorded that
instruction to myself before starting and I record here what it cost: the artifact is signable and
I am signing it.

## Environment, recorded because the Author's differs

`zsh -lc` **was not refused for me.** `zsh -lc 'node --version && npm --version'` returned
`v24.20.0` / `11.19.0`, matching `.node-version` and `package.json` engines, and every command in
this report ran through that form. The Author records the form being refused inside its own
worktree, and the capability benchmark records it working for `/claude/q0_sentinel`. Three runs,
two outcomes, same repository: this is session-local, as both prior records concluded. I substituted
nothing and skipped nothing.

One artifact worth naming so it is not mistaken for a defect: `npm run check:handoff` exits **75**
in a **detached-HEAD** worktree — *"no work package declares ownership.branch \"HEAD\""* — because
the guard resolves the branch name from the checkout. In a worktree with the branch actually
checked out it exits 0. If a later run sees 75 from a scratch worktree, that is what it is.

## Commands run, and their exit codes

At `475d3df`, and every one re-run at `f04c3e7` with identical results:

| Command | Exit |
|---|---|
| `node evidence/WP-0A-A6-001/verify-source-fields.mjs` | **0** — 14 metrics, 63 field paths resolved (pinned at 63), 2 absent, 6 with a stated population, 14/14 targets null |
| `node evidence/WP-0A-A6-001/population-and-carrier-probes.mjs` | **0** — every EXPECT-VALID document validated, every EXPECT-INVALID rejected for its stated reason |
| `npm run verify` | **0** — `clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0` |
| `npm run check` | **0** (run at the tip) |
| `node scripts/validate-work-packages.mjs` | **0** |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A6-001.json` | **0** |
| `node scripts/validate-work-package-ownership.mjs work-packages` | **0** |
| `node scripts/verify-branch-scope.mjs main WP-0A-A6-001` | **0** — *"all changed path(s) are declared"* |
| `npm run scan:secrets` | **0** |
| `npm run check:handoff` | **0** on the branch worktree; 75 detached, see above |

Independent of the checkers, I read `contract-catalog/shared-kernel/*/schema.json` directly for
every claim below rather than trusting the dictionary's quotation of them, and I enumerated
`CTR-USG-001`'s full property tree, `CTR-AUD-001`'s `required` list and `reason_key`, `CTR-NTF-001`'s
`required` list, `CTR-JOB-001`'s properties, and `RFC-2026-014`'s decided `dedupe_key` composition.

## What moved between `475d3df` and `f04c3e7`, and what I re-checked

Five commits landed after my review. I diffed the canonical artifact **semantically**, not by line:
parsing both revisions of `product-kpi-metric-dictionary.json` and walking the two trees key by key
yields exactly one difference —

```
ADDED .verification.checker_limitations_found_by_independent_testing
```

— everything else in that diff is re-indentation of inline arrays. **No metric, formula, source
list, population, caveat, status, target or method note changed.** Every finding below therefore
stands verbatim at the tip. `verify-source-fields.mjs` gained 27 lines that are **all comment**; its
executable behaviour is byte-for-byte the behaviour I mutation-tested, which I confirmed by re-running
the full battery at the tip and getting identical results. The other changes are the Author's
correction of a handoff over-claim (`0647a39`), the two transcription and integration evidence files,
the integration handoff, and the manifest's status and blockers.

**Nothing in what moved weakens the approval, and one thing strengthens it**: `0647a39` reconciled
two of the Author's own attestations *downward* — the handoff claimed five checker holes were "each
mutation-tested" while the same file's `known_limitations` correctly said the `unresolvedRef` branch
was not. The claim came down; the limitation stayed; and the Author declined to cite the Tester's
forcing of that branch as its own coverage. That is the correct direction, and it is the direction
the withdrawn increment failed in.

---

## Per-item disposition of the eight

My first review named its findings in prose rather than as a numbered list, so I map them here
against the numbering the Author and the manifest use, and dispose of each.

### 1 — `A-03`'s reason for `absent` is false. **Fully closed.**

The withdrawn increment asserted three times that `CTR-EVT-001` could carry no step identifier
because `payload` is `maxProperties: 0` and `event_type` enumerates nothing. Both halves are
withdrawn as reasoning, and the correction is **executed rather than argued**: probe `EVT-CARRIER`
constructs `event_type: 'onboarding.step.completed'` with `subject: {type:'onboarding_step',
id:'connect_meta_page'}` and it validates against the committed schema. `EVT-PAYLOAD-CLOSED` shows
the one true fragment — the step identifier in `payload` fails with `$.payload: has 1 properties,
more than maxProperties 0` — and `EVT-NO-VOCABULARY` asserts the true ground, that neither
`event_type` nor `subject.type` carries an enum.

I did not take the probes on trust. I broke `EVT-CARRIER`'s fixture (`event_type` →
`OnboardingStepCompleted`) and the script reported `FAIL EVT-CARRIER expected VALID, got INVALID`
with `does not match pattern ^[a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+$`. **The probe is not vacuous.**

The **status** that follows from the corrected reason is a decision, not a fact, and is treated
separately below.

### 2 — The derived request to widen a security-relevant control. **Fully closed.**

I grepped every file on the branch for `payload`. The ask appears nowhere except as an explicit
withdrawal — in `A-03.recommended_request.what_it_is_not`, in the reading view, in the self-check's
C4 line, in the probe's own comment, and in `recommended_next_work_packages`, which now reads
*"IT DOES NOT WIDEN payload."* The correct ask — an `event_type` vocabulary and a `subject.type`
convention — is recorded as a **pointer** to `CTR-EVT-001`'s owner and to Security separately, per
C4, and the artifact does not make it. This was the most consequential of my findings, because it
was the one that would have propagated out of this package into someone else's contract, and it is
the one most completely closed.

### 3 — `M-01` gives `CTR-TEN-001` less than it says. **Fully closed.**

`timezone` is `{"const":"Asia/Bangkok"}` and in `required`, beside `locale` at `const "th-TH"` —
asserted by `TEN-TIMEZONE-CONST` and demonstrated by `TEN-OTHER-TIMEZONE`, which fails a context
carrying `UTC` with `$.timezone: expected const "Asia/Bangkok"`. I confirmed both against the
schema myself. The correction goes further than I asked and correctly narrows the real gap: whether
a reporting month is cut on Asia/Bangkok or UTC is a **formula decision for the Product Owner**, not
a contract gap, and — this matters — because the timezone is `const`, adopting tenant-local
reporting later needs no contract change at all. The withdrawn increment's citation of `OPEN-002`
for this is withdrawn, correctly: `OPEN-002` is region, per-data-class retention, legal basis and DPA.

### 4 — `C-03`'s formula names `occurred_at` and its source list omits it. **Fully closed, and the class is machine-caught.**

`occurred_at` is declared. More to the point, I re-introduced the original defect by mutation —
deleting `occurred_at` from `C-03.source.fields` while leaving the window naming it — and the run
fails with *"C-03's formula or population names CTR-USG-001.occurred_at, which resolves in that
schema, and its source.fields does not declare it."* The one such case in fourteen cannot ship
silently again.

### 5 — `M-06` said two proxies where the same package's own self-check said four. **Fully closed.**

All four are named in the canonical file with their bias directions: A-02 (cohort start biases the
ratio **upward**), A-04 (counts metered attempts, overstating activation by exactly the failure
rate), S-01 (auditability proxy deflates the denominator and inflates the metric), C-04 (a record
never emitted produces no superseding record, so a systematic under-count reads as zero). The note
also distinguishes their **kinds** rather than flattening them, which is more than the finding asked
for. Recorded for the file: **this item was not in my review document.** The Author found it itself
and folded it into "the seven". I am not going to take credit for it by leaving the mapping
ambiguous.

### 6 — The stale base: five metrics silent on pre-/post-dedupe. **Fully closed.**

Base is `d5defb1`, equal to `main` — I confirmed `git merge-base main <branch>` = `d5defb1` and that
`main` is at `d5defb1`. All six `CTR-USG-001` aggregates state post-dedupe on `dedupe_key`, `C-04`
included, which was my sharpest instance: the metric *about* restatement that never mentioned the key
deciding what a restatement is.

I verified the C6 delta by hand rather than reading the claim. `git diff 50c8865..main --
architecture/ contract-catalog/ docs/` changes exactly **four files, four Status lines**,
`RFC-2026-011` through `-014`, Proposed → Approved 2026-09-02. **No schema, fixture, manifest or
source document moved.** The Author's enumeration is exact.

### 7 — Three checker holes, plus the deepest limitation: the checker validates presence and never absence. **Fully closed.**

The three named holes bite; the evidence is the mutation battery below. Absence-blindness is closed
the only way it could be — by a **second script** that constructs documents and runs them through
the repository's own validator, `test-kits/contracts/json-schema-subset.mjs`, **imported and not
modified**, which is the right choice: a probe asserting against a validator the package wrote
itself would be a second opinion, not a check. `verify-source-fields.mjs`'s header now states its own
limit in the first paragraph a reader meets, which is where it belongs.

### 8 — (the benchmark's) No cost metric defines its population; `C-01` returns 42.00 for a settled 22.00. **Fully closed in the artifact. Partly closed in the guard.**

Six populations, three axes each — dedupe, supersession, restatement — machine-checked for presence
of all three. `C-02`'s *"the one cost metric with no population gap"*, the most confident sentence
in the withdrawn increment, is **withdrawn**, and its status downgraded `derivable` →
`derivable_with_caveat`. The 42.00 result is executed rather than quoted: two documents that both
validate, `42.00` naive, `42.00` post-dedupe, `22.00` post-dedupe-and-superseded-excluded. The
decimal helper is bespoke and fragile but correct for these inputs; I checked its arithmetic by hand.

The guard half is my finding below and it is why this item reads "partly".

---

## The Author's own claims, judged rather than accepted

The Author asked to be checked on five things rather than believed. This is what I found.

### RFC-2026-014 does not fix the 42.00 — **the Author is right**, and I checked the RFC, not the probe

`contract-catalog/shared-kernel/ctr-usg-001/schema.json` composes `dedupe_key` as

```
^usg:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:(ai_tokens|…):(provider_reported|estimated):[0-9]{8}T[0-9]{6}…Z$
```

`cost.basis` is a key segment, and `RFC-2026-014` puts it there **deliberately**: *"`cost.basis`
stays in the key, which is what makes a `provider_reported` correction distinguishable from a
duplicated estimate — the thing A6's first refusal asked for."* So an estimate and the record
superseding it carry different keys, both survive dedupe, and both are summed. `POP-DEDUPE-DOES-NOT-FIX-IT`
demonstrates it and reports `keys differ = true`. **Dedupe and supersession are orthogonal, and
assuming the approved RFC closed the population question is exactly the trap a current base alone
would not have avoided.** That observation is the single most useful new thing in this increment.

### `A-03`: the status choice is sound, and the amendment is declared honestly rather than moved

The suspicion is real and I put it plainly: the old definition of `absent` — *"at least one field the
formula requires exists in no shared-kernel contract"* — became false of A-03 the moment the reason
was corrected, and widening it to cover a missing **value vocabulary** is precisely the move that
keeps the previously-chosen answer alive. The Author says so himself in
`source_status_vocabulary.vocabulary_amendment_note`, which is the right thing to have done and is
not by itself an answer.

**The test that settles it is uniformity**, and I ran it: I walked the amended rule — *a closed enum
under some part of the formula → `derivable_with_caveat`; no closed enum anywhere, so the result is
the empty set → `absent`* — across **all fourteen entries**.

- `A-01` — `action.category` is a closed six-value enum, so the ratio computes exactly at category
  level and only the narrowing by `action.name` is unavailable. `derivable_with_caveat`. Correct, and
  it is the model the Author cites.
- `A-02` — numerator and denominator select on `action.category` and `outcome`, both closed; only
  `first_observed_at` is a proxy. Returns a number. Correct.
- `A-04`, `C-01`, `C-02`, `C-03`, `C-05` — every selector is a closed enum or a present/absent test.
  Correct.
- `C-04` — a present/absent test on `cost.supersedes_usage_id`. Correct.
- `S-01`, `S-02` — closed enums. `S-02` is the only `derivable` in fourteen and it earns it: both
  `action.category` and `outcome` are closed and the formula selects on nothing else.
- `S-04` — `kind`, `delivery.state`, `delivery.failure_class`, `channel` all closed enums.
- `S-05` — the **hardest case for the rule**, and it passes: it groups by `last_error_code`, which
  has no vocabulary, but the numerator is a comparison of two integers plus a presence test, so it
  returns a **count**, not an empty set. Unbounded grouping cardinality is a different complaint and
  is recorded where it belongs, in the cardinality budget.
- `S-03` — `absent` on a genuinely **missing field**, and the entry says so explicitly, distinguishing
  itself from A-03.
- `A-03` — the only entry where numerator, denominator **and** grouping key all select on undefined
  values. Empty set.

**Nothing was re-labelled to fit the amendment.** One entry moved status in this increment and it
moved the *unfavourable* way — C-02 down from `derivable`. That is what distinguishes a principled
amendment from a goalpost move, and it is why I do not accept the suspicion I raised.

The reasoning has one soft spot and I record it rather than let it pass. Reason (1), the routing
argument — *`absent` routes to a contract owner to define, `derivable_with_caveat` routes to A6 to
compute* — is weakened by the Author's own `unaffected_either_way` note: the instrumentation request
goes to `CTR-EVT-001`'s owner and to Security under **both** readings. So reason (1) does not
discriminate as cleanly as it is stated to. The weight rests on reason (2), the empty set, and reason
(2) is sound. The competing reading is reproduced in full inside the entry with what would settle
it, and the choice goes to the Product Owner. That is the correct disposal of a question an agent
cannot close.

### The C3 audit was general, the A-02 catch was not luck — and the audit is **not exhaustive**

The Author reports auditing every negative claim in the document and finding the same
`CTR-EVT-001` over-claim in `A-02`. That is real: `EVT-LIFECYCLE` constructs
`workspace.lifecycle.created` and it validates, so *"no product event can name or carry a creation"*
was false in a second entry, and **neither my review nor the benchmark named it.** Finding it
required going back over claims nobody had challenged, which is the behaviour C3 was written to
produce.

I then applied the Author's own proposed test — the handoff says *"look for a sentence that asserts a
limitation **without a probe id** next to it"* — to the whole document, and it finds a remainder:

- **`A-04`: *"CTR-USG-001 carries no outcome field of any kind."*** A strong "this contract cannot
  express X" claim, shipping with neither a probe nor a downgrade. This is the clearest C3 miss.
- `S-02`: *"`reason_key` is a required stable key with no vocabulary"* — unprobed, while its exact
  sibling claim about `action.name` in the same schema **is** probed (`AUD-NO-ACTION-VOCABULARY`).
- `S-04`: *"`channel` is OPTIONAL in the schema"* — unprobed.
- `C-05`: *"`attribution.business_profile_id` is OPTIONAL while `workspace_id`, `job_id` and
  `provider_key` are required"* — unprobed.

**I checked all four against the shipped schemas and all four are true.** `CTR-USG-001`'s complete
property tree is `usage_id, occurred_at, dimension, quantity{amount,unit}, attribution{workspace_id,
business_profile_id, job_id, provider_key}, cost{amount,currency,basis,supersedes_usage_id},
dedupe_key, tenant_context` with `additionalProperties: false` — there is no outcome field anywhere.
`CTR-AUD-001.reason_key` is `{type:string, pattern:^audit\.[a-z0-9_.]+$, maxLength:96}` with no enum
and is in `required`. `channel` is absent from `CTR-NTF-001.required`. `attribution.required` is
`[workspace_id, job_id, provider_key]`.

**So: a C3 process gap, and not an over-claim.** This is the finding the review was most obliged to
get right, because the benchmark's own term is that it is **withdrawn rather than re-conditioned** if
a second sample repeats the adjacent-contract over-claim. **I went looking for a repeat and did not
find one.** Every negative claim I could check against a schema is true. The trigger is not fired.

One adjacent observation on the same axis, recorded because it is the same reasoning the Author
applied to A-03 and did not apply here: `JOB-NO-TERMINAL-STATE` is a **name-list** probe, and
`CTR-JOB-001.progress_stage` — free text, `minLength: 1`, no enum, no `x-source` — is a stage-named
property its regex does not include. The conclusion survives, because a free-text field defines no
vocabulary and S-05 stays a count; but by A-03's own logic the honest phrasing is *"no contract
defines a terminal-state vocabulary"*, not *"declares no terminal-state field"*. The carrier exists;
the definition does not. That is the A-03 distinction, one contract over.

### `M-10`: the claim holds for what C2 requires and **fails for two prose elaborations**

The Author invited this check specifically, so I did it specifically.

The **membership rule** is genuinely reading-independent. *"A record R leaves the population when
another record carries `cost.supersedes_usage_id == R.usage_id`"* selects the same records whether a
superseding record reuses the superseded record's `occurred_at` or carries its own, and it
double-counts under neither. That is the load-bearing half and it holds.

Two attached **restatement** sentences are not neutral, and — this is the part worth noticing — they
lean in **opposite** directions:

- **`C-01.population.restatement`**: *"in the DOWNWARD direction when an estimate is replaced by a
  smaller provider figure and upward when it is replaced by a larger one … the corpus for a month
  **grows** whenever a provider statement lands."* Under the second reading the correction lands in a
  **later** month, so month M loses the 20.00 and gains nothing: it restates to **zero regardless of
  the correction's size**, and its corpus **shrinks**. Both halves are reading-1 statements.
- **`A-04.population.restatement`**: *"removes the record it supersedes from that month's population,
  **so the month's figure changes**."* Under the **first** reading the removed record is replaced in
  the same month, so a **count** is unchanged — 1 before, 1 after. The sentence holds only under
  reading 2.

I worked the other four and they survive both readings: `C-02` (a correction to one dimension moves
every share, because the denominator moved — true either way); `C-03` (removing x from numerator and
denominator where x ≤ numerator lowers the ratio under both, so "monotonically downward" holds);
`C-05` ("either direction"); and `C-04`, whose *"the month it **lands in**"* is deliberately
reading-neutral and which carries an explicit `unresolved` note pointing at M-10.

So the claim as written — *"stated in a form that is correct under both readings"* — is **broader
than what holds**. What C2 actually requires (membership, and whether a closed period can restate) is
satisfied under both; the elaboration of *how* it restates is not, in two of six. The consequence is
bounded by a blocker the Author raised itself — `open_risks[2]`, that no monthly figure from
C-01/C-02/C-03/C-05 is publishable until M-10 is settled — which is why I record it as a carried
finding rather than a blocking change. Whoever answers M-10 must fix both sentences; whoever touches
them first should make them **neutral**, not pick a reading.

### The two disputes with the capability benchmark

**Dispute (a), `A-03`'s status.** The Author declines the assessor's `derivable_with_caveat` and keeps
`absent`. **It holds**, on the fourteen-entry consistency walk above. I did not defer to the
benchmark because it is a benchmark, and I did not side with the Author because he is being
reviewed: the walk is the evidence, and either party could have run it.

**Dispute (b), the stale-base framing.** The Author argues the stale base cost the withdrawn
increment `RFC-2026-014` **and nothing else** — the `CTR-EVT-001` and `CTR-TEN-001` defects were
wrong at **both** bases, so a current base was necessary and never sufficient. **Factually correct
and I verified it**: no file under `contract-catalog/` changed between `50c8865` and `main`, so
neither schema defect could have been a stale-base artifact. But it is a **clarification more than a
dispute**. The benchmark's evidence-against item 5 attributes only the dedupe silence to the stale
base, and its own C6 already calls that absence *"purely a stale-base artifact."* Nothing in the
benchmark is contradicted. I judge dispute (b) **true but not landing on a claim anyone made** — and
worth keeping anyway, because it guards against the misreading that C6 alone would have produced a
correct document.

---

## The checkers, re-checked by mutation

I did not accept the Author's mutation table. I built my own from a disposable copy outside the tree
and ran **27 mutations of the dictionary** against `verify-source-fields.mjs` at `475d3df`, then
**re-ran the identical battery at `f04c3e7`** and got identical results — which is the evidence that
the tip's 27 added lines really are comment-only.

**20 of the 27 exited non-zero. 7 exited 0.**

Two of the twenty — inverting `C-01`'s supersession axis to say superseded records are *in*, and
reducing all three of `C-05`'s axes to the word `x` — failed for a reason **unrelated to what the
mutation targeted**: they tripped the `fields_mentioned_not_read` cross-check, because both entries
declare a field that is mentioned in the population and not read. **So 18 were caught for the reason
the mutation aimed at**, and I count them that way rather than the flattering way.

Every one of the Author's seven reported mutations reproduces, for the stated reason and not
vacuously — the budget line at 99 against `enum(4)`, `C-04`'s fields emptied, the original C-03
defect, `C-02`'s deleted restatement axis, a target set to `0.9`, an `absent` metric given a
contract, and a quietly removed field caught by the pin (`62 field path(s) resolved, and this script
pins 63`).

The seven that exited 0 collapse into **three distinct gaps**:

**(i) A cost aggregate that omits its `population` block entirely passes green.** Deleting the whole
`population` from `C-03`, `C-02`, `C-04` or `A-04` **individually** → exit 0, *"no problems"*. Hole 6
checks the three axes **when a population exists** and has no rule that one must exist. `C-03` is the
sharpest instance: a `decimal_sum(cost.amount)` aggregate over `CTR-USG-001`, exactly the class C2
governs. Deleting all six at once is caught, but only incidentally, by the same
`fields_mentioned_not_read` cross-check. **This is the guard for the eighth required change, and it
cannot see the defect that change exists to prevent.** The Author's wording does not over-claim — the
script header says *"where it has one"* and the self-check says *"a stated `population`"* — but the
benchmark's fourth hole, *"it never checks that a formula's population is bounded,"* is therefore only
**partly** closed. The only trace is the summary line sliding from *"6 carrying a stated population"*
to 5, and unlike the field count that number is **not pinned**. Pinning it, or requiring a population
on every `CTR-USG-001` aggregate, closes it.

**(ii) The population field-citation check is backtick-dependent.** `` `quantity.amount` ``
undeclared in a population → caught. `quantity.amount` unbackticked → **not caught**. In a
`formula`, either form is caught. The script documents this and gives a good reason — `cost`,
`attribution` and `dimension` are also ordinary English words, and a guard that cries wolf is a guard
people stop reading — but the consequence is that coverage of populations rests on an authoring
convention the guard cannot itself enforce, and populations are where the eighth change lives.

**(iii) Judgement content is not checkable**, and I do not count these as holes: a status downgraded
`derivable` → `derivable_with_caveat`, and a dedupe axis rewritten to say *"PRE-DEDUPE: duplicates
are summed"*, both pass. No presence checker can catch a sentence that is well-formed and wrong.

The probe script is separately non-vacuous, shown above by breaking a fixture. Its `AUD-BASELINE`
guard is real engineering rather than decoration: it caught two of the Author's own fixture bugs
during authoring (`reason_key` and `retention.policy_ref` patterns), and without it `AUD-INTERVAL`
would have "passed" while failing for a malformed fixture instead of for the closed property set it
claims to demonstrate. `AUD-INTERVAL` now asserts on the **specific** error. That is the difference
between a probe and a prop.

Two small scope notes on the probes, neither live today: `propertiesWhere` does not descend into
`items`, and neither `CTR-NTF-001` nor `CTR-JOB-001` has an array property, so nothing is missed —
but it would be if one gained a timestamp inside an array.

### The Tester's three checker limitations, verified independently

`/claude/q0_sentinel` found three more holes after my review and they are now recorded in the
checker header. I re-derived them by mutation rather than accepting the record:

| Hole | Mutation | Result |
|---|---|---|
| **A** — `source.status` never validated against `source_status_vocabulary` | `S-02.source.status` → `obviously_derivable` | **exit 0.** Confirmed, and I agree it is the sharpest of the three: the three defined statuses **route work**, and the whole A-03 argument turns on what a status word means. |
| **B** — the field/formula check runs one way only | `C-03`'s window misspelled `occured_at`, declaration kept | **exit 0.** Confirmed. |
| **B**, second half | formula gutted to `{numerator:'sum',denominator:'count',window:'month'}` with seven fields still declared | **exit 0.** Confirmed. |
| **C** — the pin is a count, not a checksum | drop `C-04.usage_id`, add `S-02.tenant_context.workspace_id` | **exit 0**, still 63. Confirmed. |

One **refinement** to hole B, offered as detail and not as contradiction: the Tester writes that had
C-03's defect been a *misspelling* rather than an omission, hole 5 would have missed it. True of hole
5 — but the **composite** (misspelled in the formula **and** dropped from `source.fields`) is caught,
by the pin, at 62 against 63. The misspelling is invisible only while the correct field stays
declared. Hole B is real either way; T-B1 and T-B3 both exit 0.

Note for whoever closes these: **hole (i) above is not on the Tester's list.** `/claude/r0_steward`
reproduced it independently at integration and recorded it in the manifest as a fourth entry on that
list. It is the same finding; two runs reached it separately, which is worth more than one run
asserting it.

---

## What nobody had named: `C-01` states two different formulas

`C-01`'s formula is `decimal_sum(cost.amount)` over the population **grouped by `cost.currency`**,
divided by `count(distinct attribution.workspace_id)`, with **no `grouping` key**. That is one fleet
number per currency per month: total cost over how many workspaces existed. Its **definition** —
*"Provider cost attributed to a workspace over a month"* — reads as a figure belonging to **one**
workspace.

`A-01` shows the shape that disambiguates: it declares `grouping: tenant_context.workspace_id` and is
evaluated once per workspace. `C-01` declares no such thing.

It is more than a wording slip for three reasons. The **unit**, *"decimal money string, per
currency"*, sheds the workspace dimension the denominator introduces — contrast `A-04`, which has the
same fleet-mean shape and whose unit *and* definition both read as a mean, so A-04 is internally
consistent and C-01 is not. The **caveat**, *"THERE IS NO SINGLE-NUMBER COST PER WORKSPACE"*, is about
currency and reads as though there would otherwise **be** a per-workspace number, leaning against its
own formula. And it is the **money** metric, whose owner line already routes through an Accountant
under `OPEN-001`: a fleet mean is exactly the figure a reader mistakes for what a workspace costs.

This is the class both checkers explicitly disclaim — *"whether a formula means what its
plain-language definition says"* — and no probe could have found it. It is why I read all fourteen
entries rather than only running the scripts.

**It does not block the approval**: nothing is instrumented, the target is null, and `OPEN-016`
already routes every formula through Product Owner review before G0-003 can close. **It should block
`done`**, because a metric dictionary that states a formula two ways has failed at the one thing it
exists to do, and it must not reach the Product Owner as one formula to approve while it is two.
Closing it is a **corrective authorship act**, not a review or integration act: the Author decides
whether the intent is a fleet mean — then the definition, the key and the unit move — or a
per-workspace figure — then `grouping: attribution.workspace_id` is added and the denominator drops.
I hold no Author authority and edited nothing.

`/claude/r0_steward` reproduced this independently and recorded it as a blocker on `done`. I agree
with that disposition and with its reasoning, which reached the unit and caveat arguments above by
its own route.

---

## A correction to my own relayed summary

My verdict reached the coordinator with the sentence *"27 mutations, 24 caught, three did not fire."*
**That arithmetic was wrong and it was mine.** The correct count, re-derived at the tip: **27
mutations, 20 non-zero exits, 7 green** — and of the 20, two fired for an unrelated reason, so **18
were caught for the reason targeted**. The seven green collapse to the three gaps described above.

The direction of the error matters: I under-reported the checker's blind spots by four and made the
guard sound stronger than it is. Nothing else in my verdict depended on the number, and no finding
changes — but a reviewer who over-counts a checker's coverage in a summary is doing the smaller
version of what this package was rebuked for, and correcting it in the attested version rather than
letting the prose number stand is the point of attesting at all.

`transcribed-role-verdicts.md` does not repeat the wrong number — it carries no mutation count. It is
accurate on both findings it does carry (`C-01`, and M-10's two opposed sentences). **It is
incomplete rather than wrong**, and where completeness matters this file governs.

---

## Verdict, and its exact boundaries

**`review_approved`.** Every required change is closed in the deliverable. I verified them by
re-reading the shipped schemas and re-executing the claims, not by reading the prose that describes
them. The three residuals — the missing-population guard gap, the two non-neutral restatement
sentences, and `C-01`'s two formulas — are a gap in evidence tooling and two prose defects. **None is
a false claim about another contract. None is money-direction. None can produce a number anyone can
act on before blockers the Author raised itself are cleared.** The withdrawn increment was rejected
for false assertions about contracts and a harmful derived request; this increment contains, so far
as I could check, no false assertion about any contract.

The benchmark's withdrawal trigger — a repeated adjacent-contract over-claim — **is not fired**, and
I looked for it deliberately.

**What this approval is not.** It is not test verification, integration verification, Security or
Privacy approval, Product approval, merge authorisation or a Gate G0 result. It does not close
`OPEN-016`, which reserves all fourteen targets, `A-02`'s parameter `N`, `A-03`'s status and the
reporting-calendar question to the Product Owner and is closable by no agent. It does not settle
`M-10`, which belongs to `CTR-USG-001`'s owner. And it is given by a run that is **not independent of
the draft these findings originally came from**, with that conflict on the record rather than
unnoticed.

**I have not changed the package status and it is not mine to revisit.** The transitions to
`review_approved`, `test_verified` and `integration_verified` were made by the runs that hold that
authority; this file supplies the attested evidence for the first of them, after the fact, which is
later than it should have existed and is the defect this file opens by admitting.
