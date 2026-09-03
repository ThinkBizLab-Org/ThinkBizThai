# G0-003 — Product KPI metric dictionary

Work package: `WP-0A-A6-001` · Gate: G0 · Decision consumed: `OPEN-016` · Author: `/claude/a6_relay` (A6, SRE / billing / production readiness)

**The canonical artifact is [`product-kpi-metric-dictionary.json`](product-kpi-metric-dictionary.json).** This file is the reading view. Where the two differ, the JSON is right and this file is stale — the checkers read the JSON and cannot see this one.

> **This is the second authorship act on this package.** The first, on branch `agent/claude/WP-0A-A6-001-product-kpi-catalog`, was withdrawn as an author-attested deliverable by the Product Owner and preserved as read-only input credited to this run. Seven required changes came out of an independent review and a capability benchmark. Every one is addressed below, and the corrections are recorded **beside** the entries they correct rather than silently applied, because a reader who saw the first version is entitled to see what moved and why.

---

## What this is, and what it deliberately is not

`OPEN-016` says two things at once. It says a Product KPI must have a formula, a source and an owner — *"ห้ามใช้ metric ที่ไม่มีสูตร/source/owner"* — and it says the targets belong to the Product Owner, with events collected before any number is set. This dictionary is the first half and only the first half.

**Fourteen metrics. Fourteen targets set to `null`, each with its own recorded reason.** Not one placeholder, not one "TBD ~40%", not one number carried in from a comparable product. A number written here would be exactly the vanity target `OPEN-016` exists to prevent, and it would arrive wearing the authority of a committed engineering artifact.

**And now: six populations stated.** A formula without a population is not a specification. That is the seventh required change and the most serious of them; the section below shows why, with two documents that both validate.

## The correction that matters most: a formula with no population

Two synthetic `CTR-USG-001` documents, **both valid** against the committed schema by the repository's own validator: an `estimated` **20.00 THB** record, and a `provider_reported` **22.00 THB** record whose `cost.supersedes_usage_id` names the first.

| How C-01 is computed | Result |
|---|---|
| The withdrawn increment's formula, no population stated | **42.00 THB** |
| Post-dedupe only, i.e. RFC-2026-014 applied and nothing else | **42.00 THB** |
| Post-dedupe **and** superseded records excluded — this version | **22.00 THB** |
| The settled cost of the one measurement | **22.00 THB** |

Nearly double, in the money direction, from a formula that passed the author's own checker on a green run.

**RFC-2026-014 does not fix this, and assuming it does is the trap.** `cost.basis` is part of `dedupe_key`, so the estimate and the record that supersedes it carry **different keys**, both survive dedupe, and both get summed. Dedupe and supersession are two separate axes and settling one settles nothing about the other. Restatement is a third.

Every aggregate over `CTR-USG-001` in this dictionary — C-01 through C-05 and A-04 — now states all three:

- **dedupe** — post-dedupe on `dedupe_key`, per RFC-2026-014 (Approved 2026-09-02).
- **supersession** — a record `R` leaves the population when another record carries `cost.supersedes_usage_id == R.usage_id`. **C-04 is the one exception and says so explicitly**, because C-04 is the metric *about* supersession.
- **restatement** — whether a closed period can change afterwards, and in which direction.

**The withdrawn sentence.** C-02 said the exhaustive `dimension` partition made it *"the one cost metric with no population gap."* **That sentence is withdrawn.** An exhaustive partition of the dimension axis says nothing about which *records* are being partitioned: the same superseded estimate that inflates C-01 inflates whichever dimension carries it, and the shares still sum to one while every one of them is wrong. C-02's status is downgraded from `derivable` to `derivable_with_caveat` accordingly. It sits one entry from C-04, which the same author wrote *about* `cost.supersedes_usage_id`.

`node evidence/WP-0A-A6-001/population-and-carrier-probes.mjs` executes all of the above.

## The dictionary

`derivable` — every field exists, every value the formula selects on is contract-defined, and both mean what the formula assumes.
`derivable_with_caveat` — the metric returns a number, but something it claims is weaker than the fields can support. The caveat says which.
`absent` — the formula needs something no contract supplies, so it returns nothing at all rather than something coarser. That missing thing is a **field** in S-03 and a **defined value vocabulary** in A-03.

> The `absent` definition is **amended** from the withdrawn increment, which spoke only of a missing field. The amendment is declared in the JSON rather than made quietly, because the author amended a definition in the same document in which its old form embarrassed him. See A-03.

### Activation

| ID | Key | Formula (numerator / denominator / window) | Source | Status | Target |
|---|---|---|---|---|---|
| A-01 | `activation.credential_connection_success_rate` | `category == credential and outcome == succeeded` / all `category == credential` / rolling 7d UTC | CTR-AUD-001 | derivable_with_caveat | `null` |
| A-02 | `activation.workspace_first_publish_success` | workspaces with a succeeded publish within N days of first observation / workspaces in cohort / cohort | CTR-AUD-001 | derivable_with_caveat | `null` (and `N` is `null`) |
| A-03 | `activation.onboarding_step_completion_rate` | step-completed / step-started, per step / cohort | — | **absent** | `null` |
| A-04 | `activation.publish_operation_volume_per_workspace` | `dimension == publish_operation` / distinct workspaces / calendar month UTC | CTR-USG-001, **population stated** | derivable_with_caveat | `null` |

- **A-01** is exact at *category* level and cannot be narrower. `action.name` has a dotted grammar and no vocabulary, so connect, rotate and revoke all land in the denominator.
- **A-02** is a proxy **and the bias has a direction**: "first observed" is the earliest audit record, so a workspace that sits quiet for a week enters its cohort a week late, biasing the ratio **upward**.
  > **Corrected.** The withdrawn increment justified this with the same false claim A-03 carried — that `CTR-EVT-001.payload` at `maxProperties: 0` and an unenumerated `event_type` mean *"no product event can name or carry a creation"*. A `workspace.lifecycle.created` event **validates today**, unmodified (probe `EVT-LIFECYCLE`). This defect was found while applying the benchmark's C3 to A-03 and was named in **neither** review. The proxy and its bias are unchanged: what is missing is not a carrier but a **definition**.
- **A-03** — see below; it is the entry the Product Owner is asked to rule on.
- **A-04** counts what was **metered**, not what succeeded. CTR-USG-001 has no outcome field of any kind. It is not a substitute for A-02, and reading it as one overstates activation by exactly the failure rate.

#### A-03: the status decision, and the reasoning that was wrong

**What the withdrawn increment said, three times:** that `CTR-EVT-001` can carry no step identifier at all, because `payload` is `maxProperties: 0` and `event_type` enumerates nothing.

**Both halves are withdrawn as reasoning.** `event_type` is `^[a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+$` — an **open grammar** that admits `onboarding.step.completed` today — and `subject` is a **required** block whose `type` and `id` are free text. A step-identifying event **validates unmodified** (probe `EVT-CARRIER`). The one true fragment is that `payload` really is closed (probe `EVT-PAYLOAD-CLOSED`), and it is not load-bearing, because a step identifier never needed `payload`.

**The status the Author chose: `absent`.** The reasoning, in full in the JSON, in short here:

1. The status is a **routing** decision. `absent` routes to a contract owner to *define* something; `derivable_with_caveat` routes to A6 to *compute* something. A6 cannot define another contract's values, so the second routing sends the work to a run that cannot do it.
2. `derivable_with_caveat` means a metric still returns a number, of narrower meaning. **A-01 is the model**: `action.category` is a closed enum, so the ratio computes exactly at category level and only the *narrowing* is unavailable. A-03 has no closed enum under any part of it — numerator, denominator and grouping key all select on undefined values, so the result is the **empty set**, not a coarser ratio.
3. The reviewer's ground — that no contract *reserves* a step vocabulary — survives the correction to the reason. The old reason was "the contract forbids the shape"; the new reason is "no contract defines the values". Both give `absent`; only the second is true.

**The competing reading, recorded because the Product Owner should see both.** The benchmark assessor holds `derivable_with_caveat` is arguable: a validating carrier exists, so the obstacle is an unwritten convention rather than a missing capability, and `absent` may overstate the gap to a reader who does not read the caveat. That reading has real force. **What would settle it** is a ruling on what the status column is *for*: if it describes the contract surface, the assessor is right; if it describes whether the metric can be computed and by whom, the reviewer is right. This document takes the second reading and does not claim the question is closed.

**The instrumentation request is the same under both readings, and it is not a payload widening.** The correct ask is an `event_type` vocabulary and a `subject.type` convention. **The payload half is withdrawn entirely** — `payload` at `maxProperties: 0` is a control held deliberately closed, of the same family as `CTR-AUD-001.details`, whose own annotation calls a free-form bag *"how a secret or a page of user content reaches an audit log"*. Per condition C4 the request **leaves this artifact**: it belongs to `CTR-EVT-001`'s contract owner and to Security as a separately-reviewed item. This package does not make it, and recording where it goes is not the request having been made.

### Cost

| ID | Key | Formula | Status | Population | Target |
|---|---|---|---|---|---|
| C-01 | `cost.usage_cost_per_workspace_per_currency` | `decimal_sum(cost.amount)` by `cost.currency` / distinct workspaces / calendar month UTC | derivable_with_caveat | post-dedupe, superseded **out**, restates both ways | `null` |
| C-02 | `cost.cost_share_by_usage_dimension` | sum per `dimension` / sum over all six, same currency | derivable_with_caveat *(was `derivable`)* | post-dedupe, superseded **out**, one correction moves every share | `null` |
| C-03 | `cost.estimated_cost_basis_ratio` | sum where `cost.basis == estimated` / total | derivable_with_caveat | post-dedupe, superseded **out**, restates monotonically **downward** | `null` |
| C-04 | `cost.superseded_usage_record_ratio` | records with `cost.supersedes_usage_id` / all records | derivable_with_caveat | post-dedupe, superseded **IN** — the one exception, restates **upward only** | `null` |
| C-05 | `cost.sub_workspace_attribution_coverage` | records with `attribution.business_profile_id` / all records | derivable_with_caveat | post-dedupe, superseded **out**, restates either way | `null` |

- **C-01: there is no single-number cost per workspace, and there cannot be one yet.** `cost.currency` admits THB and USD and CTR-USG-001's freeze boundary puts conversion outside the contract. A cross-currency total needs an FX policy with a rate source, a rate-date convention and an owner. None exists.
- **C-02** — see the withdrawn sentence above.
- **C-03** — excluding a superseded estimate changes this metric's *meaning*, not only its value: a superseded estimate is one reconciliation has already resolved, and counting it keeps every reconciled estimate voting for ever. Excluded, the metric says what its definition says — the share of the total **as it now stands** that is still an estimate.
  > **Corrected.** Its window named `occurred_at` and its `source.fields` did not declare it — the only such case in fourteen, and precisely the class its own checker was blind to. Declared now, and the checker now fails on it.
- **C-04** measures **restatement, not correctness**, and is blind in the direction that matters: a usage record never emitted produces no superseding record, so a systematic under-count sits at zero here.
- **C-05** exists because `attribution.business_profile_id` is optional while `workspace_id`, `job_id` and `provider_key` are required.

All cost sums are **decimal** sums (M-04). And every cost figure here is **gross**: `cost.amount` carries no sign, deliberately, so a superseded record is **excluded** rather than netted against its replacement — netting is not available at all.

### Support

| ID | Key | Formula | Source | Status | Target |
|---|---|---|---|---|---|
| S-01 | `support.support_action_volume_per_workspace` | `category == support` / distinct workspaces with any audit record / rolling 28d UTC | CTR-AUD-001 | derivable_with_caveat | `null` |
| S-02 | `support.support_action_denied_ratio` | `category == support and outcome == denied` / all `category == support` | CTR-AUD-001 | derivable | `null` |
| S-03 | `support.first_response_time` (p50, p90) | `first_response_at - request_received_at` over requests / distribution / rolling 28d | — | **absent** | `null` |
| S-04 | `support.notification_delivery_failure_rate` | `delivery.state == failed` / terminal states, split by `failure_class` | CTR-NTF-001 | derivable_with_caveat | `null` |
| S-05 | `support.job_attempt_exhaustion_count` | `attempt >= max_attempts and last_error_code` present | CTR-JOB-001 | derivable_with_caveat | `null` |

- **S-01**'s denominator says *active* workspace and no source defines that term. What is implemented is "workspace with any audit record in the window" — an auditability proxy that deflates the denominator and inflates the metric.
- **S-02** is exact as a ratio and cannot be broken down by cause: `reason_key` is a required stable key with no vocabulary. Its correct direction is not obviously "down" — denials are the control working — which is why Security/Privacy belongs alongside Product on this one.
- **S-03** is absent for a different reason than A-03, and the difference is now executed rather than asserted. A **single** audit record cannot carry the pair: it declares one `occurred_at` and closes its property set, so a document carrying a second timestamp **fails validation** (probe `AUD-INTERVAL`, checked for that specific error and not merely for failure). CTR-NTF-001 carries **no timestamp at all** on its envelope (probe `NTF-NO-TIMESTAMP`). The remaining route — two audit records as endpoints — is a **definition** gap of A-03's kind: it needs an `action.name` vocabulary and no contract defines one.
- **S-04** excludes `queued` because it is not terminal, which makes the value sensitive to where the window is cut; `channel` is optional, so the per-channel split does not sum to the total; and the window has to be cut on whatever the storing module records, which is not a contract field.
- **S-05 is a count and not a rate, deliberately.** CTR-JOB-001 declares no terminal-state field and no enum carrying one (probe `JOB-NO-TERMINAL-STATE`), and its manifest records that lifecycle state names remain subject to owner review. Inventing a denominator would be inventing the lifecycle.

## Standing conventions and their expiry

| | |
|---|---|
| **Timezone** *(corrected)* | `CTR-TEN-001.timezone` is **`{"const": "Asia/Bangkok"}` and required**, beside `locale` at `const "th-TH"`. It is not a per-tenant value and Asia/Bangkok is not "plausible" — it is the only value the kernel admits, and a context carrying any other one fails (probe `TEN-OTHER-TIMEZONE`). What is genuinely open is narrower and is **not a contract gap**: no source states whether a reporting calendar month is cut on Asia/Bangkok or on UTC. Both clocks exist. Windows here are UTC on `occurred_at`; cutting them on Asia/Bangkok moves every month boundary by seven hours, changing A-04 and all five cost metrics. The withdrawn increment attributed this to `OPEN-002`; **that citation is withdrawn** — OPEN-002 is region, per-data-class retention, legal basis and DPA. A KPI's window is part of its formula, so this is the Product Owner's under `OPEN-016`. |
| **Retention** | Four metrics read CTR-AUD-001, whose `retention.policy_ref` names a policy and deliberately pins no duration (PDPA-006 undelivered; Thai legal counsel required). A window longer than retention truncates silently and reports a smaller denominator as an improvement. |
| **Scope** | This package instruments nothing: no event emitted, no schema defined, no metric backend chosen, no provider called, no customer data read. Synthetic only, per Gate G0. |

## The `sli_tags` per-label cardinality budget

Unchanged in substance from the withdrawn increment — CTR-OBS-001's manifest recorded it as *"recorded for the metric dictionary and is NOT enforced here"*, and this is the home that record was pointing at. Recording it here does not enforce it; enforcement is a schema change to CTR-OBS-001, which this package does not own and did not make.

| Label | Budget | Enforced today? | What is blocking it |
|---|---|---|---|
| `environment` | ≤ 4 | **yes** | — closed at the value level to the four Track INF environments |
| `outcome` | ≤ 4 | no | an SLI outcome vocabulary; no source states one |
| `error_code` | ≤ 64 enumerated codes | no | **`CTR-ERR-001.code` has no vocabulary** |
| `capability_key` | ≤ 16 per module | no | not expressible in JSON Schema; needs an emitting-library or backend control point |
| `module_key` | ≤ 32 | no | a check against the module ownership registry |

**What changed here is the check, not the budget.** The old checker compared the `enforced` *flag* to whether the schema closed the values, and never compared the *number*: set `environment` to 99 and it printed `budget 99 … enum(4)` and then reported no problems. The number is now compared to the enum's length for any line claiming enforcement.

`4 × 4 × 64 × (32 × 16) = 524,288` label combinations per metric name at full cross product — an **upper bound, not a forecast**. **Challenge the 64 first**: it is the largest factor and the one line blocked on another contract. CTR-OBS-001's standing constraint, that no consumer may emit `sli_tags` to a real metric backend before the budget lands, is restated and not relaxed.

## What is deliberately not in this dictionary

- **Revenue, MRR, ARPU, churn** — `OPEN-001` has not fixed the Beta price, VAT treatment, refund policy or grace period, and requires Product plus an Accountant. Also outside condition C7's authoring scope.
- **Net cost, credits, refunds** — `cost.amount` carries **no sign**, deliberately: an earlier draft allowed a leading `-`, and permitting it would have materialised NG-006, `OPEN-001` and the still-Proposed BILL-DEC-013 (probe `USG-NO-NEGATIVE-AMOUNT`).
- **Publish success against an SLA, availability against an SLO, error budget** — an SLO target is a number and `OPEN-016` reserves numbers; OBS-009 is undelivered; claiming an SLA is forbidden until the restore drill passes (`OPEN-003`).
- **Any per-workspace or per-page metric-backend dimension** — OB-006 forbids it and CTR-OBS-001 omits `workspace_id` from `sli_tags`. Per-workspace figures here are computed from stored **records** (M-03).
- **Content quality, model output scoring** — needs the Golden Set (`OPEN-012`) and a platform model choice (`OPEN-005`).

## The decision delta since the withdrawn base

Condition C6 requires a base current with `main` and an enumerated delta. `git diff 50c8865..main` over `architecture/`, `contract-catalog/` and `docs/` changes **four files, each of them one Status line**. No contract schema, fixture, manifest or source document moved at all.

| Decision | Change | What it touches here |
|---|---|---|
| **RFC-2026-014** — a usage key identifies a measurement, not a job | Proposed → **Approved 2026-09-02** | **C-01…C-05 and A-04.** It is why each states post-dedupe on `dedupe_key`, and it settles what a duplicate is. Its absence from the withdrawn increment cost that document its own author's best prior finding: **this run refused that key twice**, and the second refusal caught that the first fix *"instructed a consumer to DISCARD a second legitimate charge for one job"*. Five cost metrics sat on the rule and none mentioned it. **It does not touch supersession** — the 42.00 result above is *post-dedupe*. |
| **RFC-2026-013** — an agent run can sign; it cannot become the Product Owner | Proposed → **Approved 2026-09-02** | This document's **admissibility**, not any metric. It is why the first Author assignment was invalid and why this one is not. It also decides that no agent run closes `OPEN-016`. |
| **RFC-2026-012** — the client/server database boundary | Proposed → **Approved 2026-09-02** | Nothing today, and the silence is worth stating: it constrains whoever **implements** one of these metrics. M-03 already forbids the metric-backend-label route; RFC-2026-012 now constrains the remaining one. |
| **RFC-2026-011** — the repository's language | Proposed → **Approved 2026-09-02** | The two checkers, which are JavaScript ESM and now conform to an approved decision rather than a convention. |

**No contract changed between the two bases.** Every schema quotation was nevertheless re-read at this base, and two turned out to be wrong at **both**: `CTR-EVT-001` and `CTR-TEN-001`. Those were never stale-base defects, and a current base would not have caught either.

## Verifying this document

```
node evidence/WP-0A-A6-001/verify-source-fields.mjs          # presence
node evidence/WP-0A-A6-001/population-and-carrier-probes.mjs # absence and population
```

**Both must pass, and neither alone is coverage.** The first resolves every cited field path against a committed schema, fails when a formula names a field it does not declare, pins the resolved-path count, checks every stated population covers all three axes, and compares an enforced budget line's *number* to the schema's enum. **It validates presence and cannot validate an absence claim** — which is exactly how a false `absent` reason shipped on a green run, and its header now says so.

The second constructs documents and runs them through the repository's own JSON Schema subset validator: `EXPECT-VALID` documents that prove a "the contract cannot carry this" claim false, and `EXPECT-INVALID` documents that condition C3 requires before any such claim may stand.

**What neither reaches**, stated so exit 0 is not mistaken for approval: whether these are the right fourteen metrics; whether a formula means what its plain-language definition says; every target; and the open question in M-10 about which window a superseding record falls into, where both readings validate and the contract does not choose.

## What still needs a human authority

| Who | What |
|---|---|
| **Product Owner** | Every one of the fourteen targets, and `N` in A-02. `OPEN-016` reserves them and this package sets none. |
| **Product Owner** | **A-03's status.** Two defensible readings are recorded; the Author chose `absent` and states why. |
| **Product Owner** | Whether a reporting calendar month is cut on Asia/Bangkok or on UTC. Not a contract gap; a formula decision. |
| **Product Owner** | Whether these fourteen are the right fourteen. A6 chose them from what the contracts can support. |
| **CTR-USG-001 owner** (A0 with A6) | **M-10**: whether a superseding record reuses the superseded record's `occurred_at` or carries its own. The two readings give different monthly totals. |
| **CTR-EVT-001 owner, and Security separately** | An `event_type` vocabulary and a `subject.type` convention. **Not** a payload widening. Routed out of this artifact per C4. |
| **Accountant** | Any money figure from C-01 that leaves engineering, under `OPEN-001`. |
| **Privacy / Legal** | The retention period governing the CTR-AUD-001 windows, under `OPEN-002` and PDPA-006. |
| **A6 with the CTR-ERR-001 owner** | The `error_code` vocabulary, without which that budget line stays unenforceable. |
| **Security / Privacy** | The direction of S-02, which bears on the read-only-first admin support posture. |
