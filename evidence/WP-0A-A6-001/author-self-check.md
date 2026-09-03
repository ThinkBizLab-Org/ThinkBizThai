# WP-0A-A6-001 — author self-check, second authorship act

Author: `/claude/a6_relay` (A6 — SRE / billing / production readiness), Anthropic claude-opus-5.
Branch: `agent/claude/WP-0A-A6-001-metric-dictionary`, cut from `main` at `d5defb1`, worktree-isolated.
Gate: G0 — Specification Baseline Complete / External Verification Pending.

This is the Author's own record. **It is not a review, a test verification or an integration record**, and it carries no authority beyond stating what this run did and what it refused to do. Per condition C5 this run is Author only: it does not review, test or integrate this work and does not advance the package past `in_review`.

## Standing, stated first because it is what made the last increment inadmissible

The first increment was authored under an assignment that this manifest's own `open_blockers[0]` prohibited. The Product Owner withdrew that assignment, ruled the defect A0's, and preserved the artifact as **read-only input credited to this run**. `/claude/q0_sentinel` then produced a forward-scoped `billing-cost-ops` capability benchmark, and `.agents/capability-profiles/cc-a6-relay.json` now declares Author scope for that profile, forward only, citing the benchmark — which is condition **C1**, satisfied **before** this assignment rather than after.

The benchmark recommends **with conditions** and states that it is **withdrawn rather than re-conditioned** if a second sample repeats the adjacent-contract over-claim. This is that second sample. It is written knowing that.

Two things are recorded rather than left for a reader to notice, because the manifest records them and an author who benefits from them should repeat them: **neither reviewer is a fresh pair of eyes** — `/claude/c0_contract_reviewer` reviewed the withdrawn draft, and `/claude/q0_sentinel` wrote this run's benchmark and has an interest in it performing well. And **cross-vendor independence is not satisfied** for any role here; every named run is Anthropic claude-opus-5.

## What was delivered

| File | What it is |
|---|---|
| `evidence/WP-0A-A6-001/product-kpi-metric-dictionary.json` | The canonical G0-003 dictionary. Fourteen metrics, **six with a stated population**, plus the CTR-OBS-001 cardinality budget, ten method notes, the non-goals, and the C6 decision delta. |
| `evidence/WP-0A-A6-001/product-kpi-metric-dictionary.md` | The reading view, for the Product Owner review `OPEN-016` requires. |
| `evidence/WP-0A-A6-001/verify-source-fields.mjs` | Presence checker, strengthened in five ways. Its header now states what it **cannot** do. |
| `evidence/WP-0A-A6-001/population-and-carrier-probes.mjs` | **New.** Executes the absence and population claims by constructing documents and validating them with the repository's own validator. |
| `evidence/WP-0A-A6-001/author-self-check.md` | This file. |
| `work-packages/WP-0A-A6-001.json` | `ready` → `in_review`; outputs, deterministic commands and a blocker added. **No `open_blocker` was deleted or edited.** |
| `handoffs/WP-0A-A6-001-author-handoff.json` | Author handoff. |

Nothing outside `ownership.writable_paths` was written. No contract artifact, test kit, script, schema or capability profile was touched. `test-kits/contracts/json-schema-subset.mjs` is **imported** by the probe script and is not modified — deliberately, so the probes assert against the repository's own validator rather than a second opinion of my own.

## The seven required changes

| # | Required change | Where | Status |
|---|---|---|---|
| 1 | `A-03`'s reason for `absent` is false; correct it and decide the status | `A-03.withdrawn_claim`, `.nearest_validating_carrier`, `.status_decision`; probes `EVT-CARRIER`, `EVT-PAYLOAD-CLOSED`, `EVT-NO-VOCABULARY` | **Closed** on the reasoning; the **status is a decision, not a fact**, and both readings go to the Product Owner |
| 2 | Withdraw the payload-widening ask | `A-03.recommended_request`; handoff `recommended_next_work_packages`; this file | **Closed** |
| 3 | `M-01` misdescribes `CTR-TEN-001.timezone` | `M-01`; probes `TEN-TIMEZONE-CONST`, `TEN-OTHER-TIMEZONE` | **Closed** |
| 4 | `C-03`'s formula names `occurred_at`; its `source.fields` omits it | `C-03.source.fields`, `.field_correction` | **Closed**, and the class is now machine-caught |
| 5 | Reconcile `M-06` with the four proxies | `M-06` | **Closed** |
| 6 | Strengthen the checker in four ways plus the header | `verify-source-fields.mjs` | **Closed**, and each new check was mutation-tested |
| 7 | No cost metric defines its population | `M-09`, `M-10`, `population_boundary_demonstration`, six `population` blocks; probes `POP-*` | **Closed on this artifact; partly open in the repository** — see below |

### Change 1, and the decision I was asked to make

**The reasoning is fully corrected and the correction is executed, not argued.** `event_type` is an open grammar admitting `onboarding.step.completed`; `subject` is required with free-text `type` and `id`; a step-identifying event validates unmodified. The one true fragment of the old claim — `payload` at `maxProperties: 0` — is also demonstrated, and it is not load-bearing.

**I choose `absent`.** Three reasons, in the JSON in full:

1. The status is a **routing** decision, and the two candidates route to different owners. `absent` routes to a contract owner to *define*; `derivable_with_caveat` routes to A6 to *compute*. A6 cannot define another contract's values.
2. `derivable_with_caveat` means the metric returns a **number**, of narrower meaning — A-01 is the model, where a closed enum carries the ratio and only the narrowing is unavailable. A-03 has no closed enum under any part of it: numerator, denominator and grouping key all select on undefined values, so it returns the **empty set**, not a coarser ratio. "Compute it with a caveat" would misdescribe what an implementer gets, and the only way to comply would be to invent the vocabulary — which is what this package's whole discipline forbids.
3. The reviewer's ground survives the correction to the reason. Old reason: "the contract forbids the shape". New reason: "no contract defines the values". Both yield `absent`; only the second is true.

**What this choice cost, recorded rather than hidden.** It required **amending this document's own definition of `absent`**, which spoke only of a missing *field*, and A-03's fields exist. The amendment is declared in `source_status_vocabulary.vocabulary_amendment_note`, and I say plainly there that a reader may reasonably suspect a definition bent to fit an answer. That is why the assessor's competing reading is recorded **in full, in the entry**, with what would settle it: a ruling on whether the status column describes the contract surface or describes whether the metric can be computed and by whom. I take the second reading. I do not claim the question is closed.

### Change 7, and why I am not calling it fully closed in the repository

On this artifact it is closed: six populations, three axes each, machine-checked, with the 42.00-for-22.00 result executed rather than quoted. **What is not closed is a question the correction surfaced and cannot answer** — see `M-10`. `CTR-USG-001.occurred_at` is annotated as *"stamped once and reused verbatim on every re-emission of that measurement"*, and RFC-2026-014 keeps `cost.basis` in the dedupe key so a correction is distinguishable from a duplicate. Read together those suggest a superseding record **reuses** the superseded record's instant and falls in the **same** window. But nothing states that a supersession **is** a re-emission, and a producer stamping the arrival instant would put it in a **later** window. Monthly totals differ between the two readings.

I did not choose. The population boundary is stated in a form correct under both — *a settled month is the post-dedupe, supersession-resolved corpus as at the instant of computation* — and the question is routed to `CTR-USG-001`'s owner. Resolving it by assumption is exactly the move that produced the last increment's defects.

### One defect I found that neither review named

While applying C3 to A-03 I checked **every** negative claim in the document and found the same over-claim in **A-02**: *"no workspace-created fact exists anywhere in the shared kernel … so no product event can name or carry a creation."* A `workspace.lifecycle.created` event validates today (probe `EVT-LIFECYCLE`). The proxy and its upward bias are unchanged — what is missing is a definition, not a carrier — but the reason was the same false one, in a second entry, and neither review named it. It is corrected in `A-02.caveat_correction`.

The other negative claims survived the audit and are now **executed** rather than asserted: `AUD-INTERVAL` (a second timestamp on one audit record fails, checked for that specific error), `NTF-NO-TIMESTAMP` (no property in CTR-NTF-001 carries `format: date-time`), `JOB-NO-TERMINAL-STATE` (no state-named property and no enum carrying a terminal value), `USG-NO-NEGATIVE-AMOUNT`.

## The checker, and evidence that its new checks bite

Five holes were named against the old one; all five are closed, plus a sixth for C2.

1. A non-`absent` metric declaring **zero fields** used to pass vacuously — now fails.
2. The resolved-path count is **pinned at 63**. A printed count cannot notice a metric quietly losing a field.
3. An `enforced` budget line's **number** is compared to the schema enum's length. The old check compared only the flag: `max_distinct_values: 99` against `enum(4)` printed both and reported no problems.
4. An **unresolvable `$ref`** is its own reason, not "this field does not exist".
5. A field **named in a formula and not declared** now fails. That is how defect 3 shipped.
6. A stated `population` must cover **all three** C2 axes.

**Mutation-tested rather than trusted**, from a scratch directory outside the tree, restoring the file after each:

| Mutation | Result |
|---|---|
| `environment` budget set to 99 | caught — *"enforced with max_distinct_values 99 while the schema closes it to 4"* |
| `C-04.source.fields` emptied | caught — *"declares NO fields"* |
| `occurred_at` removed from `C-03` (the original defect) | caught — *"names CTR-USG-001.occurred_at … and its source.fields does not declare it"* |
| `C-02.population.restatement` deleted | caught — *"states a population and omits its restatement boundary"* |
| a target set to `0.9` | caught |
| an `absent` metric given a contract | caught |
| a field quietly removed from `S-05` and its formula | caught **by the pin** — *"62 field path(s) resolved, and this script pins 63"* |

**One new branch is not mutation-covered and I am saying so rather than implying otherwise.** The `unresolvedRef` path (hole 4) fires only for a `$ref` this script cannot follow, and every `$ref` in the shared kernel is the followable sibling form. Exercising it would need a schema edit, which this package must not make. The branch is reachable by inspection and untested by execution.

**One repository guard fired on this package's own work and is recorded rather than quietly fixed.** `npm run scan:secrets` reported `credential: secret-named-assignment` against `verify-source-fields.mjs`: a constant named `DOTTED_TOKEN` assigned a regular expression matches the scanner's uppercase `…TOKEN = <8+ chars>` pattern. It is a true positive for the pattern and a false positive for the risk — there is no credential in this package and `security_privacy.secrets_required` is `false`. The constant is renamed `FIELD_PATH_RE`; the scanner was not touched, no allowlist was added, and nothing was suppressed. Noted because "the scanner fired and I decided it was fine" is a sentence that should never appear without the fix beside it.

**The probe script found two defects in its own fixtures on its first runs**, both caught by the deliberate `AUD-BASELINE` probe: `reason_key` must match `^audit\.[a-z0-9_.]+$` and `retention.policy_ref` must match `^retention\.[a-z0-9_.]+$`. Without that baseline probe, `AUD-INTERVAL` would have "passed" while failing for a malformed fixture rather than for the closed property set it claims to demonstrate — a probe reporting the wrong reason, which is worse than no probe. `AUD-INTERVAL` now asserts on the specific error too.

## C6 — the decision delta

`git diff 50c8865..main` over `architecture/`, `contract-catalog/` and `docs/`: **four files, four Status lines, nothing else.** No contract schema, fixture, manifest or source document changed.

- **RFC-2026-014**, Approved 2026-09-02 — touches **C-01…C-05 and A-04**, and is why each states post-dedupe on `dedupe_key`. **This run refused that key twice**; the second refusal caught that the fix for the first *"instructed a consumer to DISCARD a second legitimate charge for one job"*. Five cost metrics sat on the resulting rule and the withdrawn increment mentioned it nowhere. **It does not settle supersession**, and the executed 42.00 result is *post-dedupe* — recorded because assuming the RFC closed the population question is the trap a current base alone would not have avoided.
- **RFC-2026-013**, Approved — touches this document's admissibility, not any metric.
- **RFC-2026-012**, Approved — touches nothing today and constrains whoever implements one of these metrics.
- **RFC-2026-011**, Approved — touches the two checkers, now conforming to an approved decision rather than a convention.

**Worth stating against the benchmark's framing:** the stale base cost the last increment RFC-2026-014, and nothing else. The `CTR-EVT-001` and `CTR-TEN-001` defects were wrong at **both** bases. A current base was necessary and was never going to be sufficient.

## Conditions C2–C7, held explicitly

- **C2** — six populations, three axes each, machine-checked. Held.
- **C3** — every negative claim in the document was audited. Each either ships with a constructed failing document (`EVT-PAYLOAD-CLOSED`, `AUD-INTERVAL`, `TEN-OTHER-TIMEZONE`, `USG-NO-NEGATIVE-AMOUNT`) or is downgraded to "no contract defines this" (A-03, A-02, S-03's two-record route, the `action.name` / `reason_key` / `error_code` / SLI-outcome vocabularies). Held.
- **C4** — the payload ask is withdrawn; the correct ask is recorded as a **pointer** to CTR-EVT-001's owner and to Security, and this package does not make it. Held.
- **C5** — Author only. Status advanced to `in_review` and no further. Held.
- **C6** — base `d5defb1`, equal to `main`; delta enumerated above. Held.
- **C7** — measurement only. Pricing, VAT, refund policy, grace period and entitlement are named as out of scope in `deliberately_not_defined`, and the no-sign / no-netting position is recorded as a consequence of the contract rather than as a refund opinion. Held.

## Uncertainty recorded rather than resolved

- **M-10**, above. The load-bearing one.
- **A-03's status**, above. A decision with a recorded dissent, not a fact.
- **The multi-hop supersession rule** (A superseded by B superseded by C: only C survives) is this dictionary's **declared inference**. No source states it, and neither does the double-supersession case, which CTR-USG-001's own annotation records as a resolver obligation its validator cannot express — alongside a self-superseding document that **validates today** (probe `USG-SELF-SUPERSESSION-VALIDATES`).
- **C-03's supersession reading** — that a reconciled estimate should stop voting — is a reading of what the metric is *for*. The opposite reading is a defensible **different** metric, and if the Product Owner wants it, it is a separate entry.
- **How long corrections take to arrive**, which decides when C-04's monthly value stops being a floor. No source states it.
- **Reporting timezone**, **audit retention**, **cross-currency cost**, and **whether these are the right fourteen** — carried forward unchanged from the withdrawn increment, with M-01's mis-citation of OPEN-002 corrected.

## What this package did not do

No event emitted, no schema defined, no migration, no metric backend chosen, no provider call, no credential, no network access used, no customer data read. Synthetic only. **No KPI target set, and no number proposed for any budget line, FX rate, retention period or response time.** No contract artifact changed, so no consumer compatibility surface moved. No `open_blocker` deleted. No review, test, integration or gate advance performed by this run.

One thing that is **outside C7 and was not touched**: `docs/sprint-0a/sprint-0a-stripe-billing-contract-th.md` is not among this package's declared inputs, and the review recorded that it bears on `C-01`'s currency and VAT context and belongs in a future `billing-cost-ops` package's inputs. It is a dispatch observation for A0. This package did not read it into scope, and C-01's currency caveat does not depend on it.

## Commands run

| Command | Exit | Note |
|---|---|---|
| `npm run verify` at `main` (`d5defb1`, detached) | **0** | `clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0` |
| `npm run verify` on the new branch, before any edit | **1** | `tests 260, pass 258, fail 2`. **Expected and not a defect in the tree**: `handoff-conformance` requires an author handoff for a branch a package claims, and the branch existed before its handoff did. Both failures name `handoffs/WP-0A-A6-001-author-handoff.json` as `ENOENT`. Recorded rather than smoothed over, because "the baseline was red" is exactly the kind of thing an author should not discover a reviewer noticing. |
| `node evidence/WP-0A-A6-001/verify-source-fields.mjs` | **0** | 14 metrics, 63 field paths resolved (pinned at 63), 2 absent, 6 with a stated population, 14/14 targets null |
| `node evidence/WP-0A-A6-001/population-and-carrier-probes.mjs` | **0** | every EXPECT-VALID document validated, every EXPECT-INVALID document rejected **for its stated reason**, every absence assertion held |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A6-001.json` | **0** | |
| `node scripts/validate-work-package-ownership.mjs work-packages` | **0** | |
| `node scripts/validate-work-packages.mjs` | **0** | |
| `node scripts/verify-branch-scope.mjs main WP-0A-A6-001` | **0** | *"all changed path(s) are declared"*. Run after the commit; run before it, it reports **0 changed paths**, because it diffs committed history and an uncommitted tree has none. Recorded because a `0` from this script on a dirty tree means "nothing to check", not "checked and clean", and the first version of this table cited it **without arguments**, where it exits **2** with a usage message. A self-check that records exit 0 for a command that exited 2 is the exact failure this package was rebuked for. |
| `npm run verify` (final, after the handoff existed) | **0** | `clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0` |

**Toolchain and one environment note.** `node v24.20.0` / `npm 11.19.0`, matching `.node-version` and `package.json` engines, confirmed by `node --version` and `npm --version`. The dispatch specified `zsh -lc '<command>'`. **That form was refused in this worktree**, exactly as it was for the withdrawn increment — the worktree isolation guard rejects `zsh -lc` as a shell invocation it cannot verify stays inside the worktree. The benchmark records that the same form worked for `/claude/q0_sentinel`, so it is session-local and not a property of this run. `node` and `npm` were on `PATH` at the required versions and every command was run directly. **No command was skipped and none was substituted for a different one.**
