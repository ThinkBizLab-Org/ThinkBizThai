# WP-0A-A6-001 — integration verdict

**Run:** `/claude/r0_steward` — Integration Owner, declared in
`.agents/capability-profiles/cc-r0-steward.json`.
**Date:** 2026-09-03. **Branch:** `agent/claude/WP-0A-A6-001-metric-dictionary`, tip `0647a39`.
**Base:** `main` at `d5defb151d10826c08dc12dfbb7df80b1a9e41f9`.

**Verdict: `integration_verified`.** It integrates. Two residuals are recorded as new
`open_blockers` that must be closed before `done`, neither of them mine to close.

I did not author, review, security-review or test any part of this package. This verdict is a
statement about the final state of the branch and the completeness of its evidence. It is not an
approval that substitutes for a missing role, it does not authorise or perform a merge
(RFC-2026-002 reserves the merge for the Product Owner), and it does not move Gate G0.

---

## 1. What I actually ran

Everything below was run in a **throwaway clone under the session scratchpad**, never in the
working repository, on the pinned toolchain via `zsh -lc`. `zsh -lc` was **not** refused for this
run: `node --version` → `v24.20.0`, `npm --version` → `11.19.0`, matching `.node-version` and
`package.json` exactly. No substitution was needed and none was made. No network, no credentials,
no global tools.

### Trial merge onto current `main`

```
$ git merge --no-ff --no-edit wp-a6-branch
Merge made by the 'ort' strategy.
 evidence/WP-0A-A6-001/author-self-check.md         | 155 +++++
 .../WP-0A-A6-001/population-and-carrier-probes.mjs | 364 +++++++++++
 .../product-kpi-metric-dictionary.json             | 675 +++++++++++++++++++++
 .../WP-0A-A6-001/product-kpi-metric-dictionary.md  | 191 ++++++
 evidence/WP-0A-A6-001/verify-source-fields.mjs     | 304 ++++++++++
 handoffs/WP-0A-A6-001-author-handoff.json          | 180 ++++++
 work-packages/WP-0A-A6-001.json                    |  41 +-
 7 files changed, 1903 insertions(+), 7 deletions(-)
```

Exit 0, **no conflicts, and nothing to resolve**: `git merge-base HEAD wp-a6-branch` returns
`d5defb151d10826c08dc12dfbb7df80b1a9e41f9`, which is the current `main` tip. The branch has not
diverged; it is three commits directly on top of `main`. C6 — author on a base current with
`main` — holds as a fact about the graph and not only as a claim in the handoff.

### On the merge result

| Command | Exit | Output |
| --- | --- | --- |
| `npm run verify` | 0 | `clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0` |
| `npm run check` | 0 | `tests 260 · pass 260 · fail 0 · cancelled 0 · skipped 0 · todo 0 · duration_ms 30908.314875` |
| `npm run validate:protocol` | 0 | silent |
| `node scripts/validate-work-packages.mjs` | 0 | silent |
| `node scripts/validate-capability-profiles.mjs` | 0 | silent |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | silent |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A6-001.json` | 0 | silent |
| `npm run scan:secrets` | 0 | silent |

The exact `npm run verify` line, as required:

```
clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0
```

### On the branch tip

```
$ node scripts/verify-branch-scope.mjs d5defb151d10826c08dc12dfbb7df80b1a9e41f9 WP-0A-A6-001
WP-0A-A6-001: all 7 changed path(s) are declared, and every amendment explains one

$ npm run check:handoff
handoffs/WP-0A-A6-001-author-handoff.json describes the branch: nothing substantive after its cited head
```

The handoff check is worth naming: run against a clone whose local branch name did not match
`ownership.branch`, it exits 0 with *"no work package declares ownership.branch"* — a pass that
means "not judged". I re-ran it under the declared branch name to get the assertion that
actually matters. An exit code from that script is not by itself evidence.

### The package's own checkers, executed rather than trusted

```
$ node evidence/WP-0A-A6-001/verify-source-fields.mjs                       # exit 0
14 metric(s), 63 field path(s) resolved against a committed schema (pinned at 63),
2 recorded as having no source at all, 6 carrying a stated population, 14 of 14 targets null.
no problems: every cited field exists, every formula names only fields it declares, every stated
population covers all three axes, every absent metric cites nothing, every enforced budget line
matches the number the schema enforces, and every target is null.
NOT CHECKED: any absence claim. Run population-and-carrier-probes.mjs for those.

$ node evidence/WP-0A-A6-001/population-and-carrier-probes.mjs              # exit 0
no problems: every EXPECT-VALID document validated, every EXPECT-INVALID document was rejected
for its stated reason, and every absence assertion held against the committed schemas.
```

## 2. The four integration checks, done directly rather than inferred

**Every changed path is inside `ownership.writable_paths`.** Seven paths; `verify-branch-scope`
agrees, and I confirmed the list by hand against the three declared globs
(`work-packages/WP-0A-A6-001.json`, `evidence/WP-0A-A6-001/**`,
`handoffs/WP-0A-A6-001-*.json`). Nothing under `docs/`, `contract-catalog/`, `.agents/`,
`scripts/`, `.github/`, `package.json` or `package-lock.json` is touched.

**No `open_blocker` was deleted or edited.** Compared element-by-element between
`d5defb1:work-packages/WP-0A-A6-001.json` and the branch tip: **all 7 pre-existing blockers are
byte-identical, and exactly 1 was appended.** `role_assignments`, `acceptance_criteria`,
`review_and_test_gates`, `writable_paths`, `read_only_paths` and `forbidden_paths` are all
unchanged. The two disclosed-conflict blockers, which are the ones an eager package would be
tempted to prune, are intact.

**No target value leaked in.** All 14 metrics carry `target: null`, every one with its own
`target_null_reason`; `A-02`'s cohort parameter `N` is null as well. I checked this directly
against the JSON rather than relying on the checker line that asserts it.

**No secrets, no customer data.** `scan:secrets` clean; the corpus is two synthetic
`CTR-USG-001` documents at 20.00 and 22.00 THB.

## 3. The residuals, judged

### Residual 1 — `C-01` computes a fleet mean. **BLOCKS `done`. Does not block integration.**

I verified this myself and it is exactly as the Reviewer described.

```
C-01  key        cost.usage_cost_per_workspace_per_currency
      definition "Provider cost attributed to a workspace over a month, reported
                  separately for each currency."
      unit       "decimal money string, per currency"
      numerator  decimal_sum(CTR-USG-001 cost.amount over the population) grouped by cost.currency
      denominator count(distinct attribution.workspace_id in the same population, window
                  and currency group)
      grouping   ABSENT
```

With no `grouping`, that expression yields **one number per currency per month for the whole
fleet** — total cost divided by how many workspaces there were. Its definition, *"cost attributed
to a workspace"*, reads as a figure belonging to one workspace. Those are two different numbers,
and the entry does not say which it means.

`A-01` shows the shape that disambiguates: it declares `grouping: tenant_context.workspace_id`,
so it is evaluated once per workspace and its ratio is that workspace's ratio. `C-01` declares no
grouping and divides by an entity count, which is the shape of a mean.

Three things make this worse than a wording slip, and I record them because the Reviewer found
the defect and the approval did not carry them:

- **The unit sheds the dimension the formula introduces.** `"decimal money string, per currency"`
  never mentions workspaces at all, while the denominator divides by them. Compare `A-04`, which
  has the same fleet-mean shape but whose unit — `"operations per workspace"` — and definition —
  `"Metered publish operations per workspace per month"` — both read as a mean. `A-04` is
  internally consistent about being an average. `C-01` is not.
- **The caveat leans the other way.** *"THERE IS NO SINGLE-NUMBER COST PER WORKSPACE, and there
  cannot be one yet"* is about currency, and it reads as though there would otherwise **be** a
  per-workspace number — reinforcing the per-workspace reading of the definition against a
  formula that produces a fleet aggregate.
- **It is the money metric.** A fleet mean cost per workspace is precisely the figure a reader
  can mistake for what a workspace costs, and the two diverge by however skewed the distribution
  is. This is the entry whose owner line already requires Accountant review under OPEN-001.

**Why it does not block integration.** Nothing is instrumented, no number is computed, the target
is null, and OPEN-016 already requires Product Owner review of *every* formula before G0-003 can
close — so the ambiguity cannot reach a published figure without passing the review that owns it.
Integration verification attests that the branch merges, verifies green, stays in scope and
leaked no target. It does not attest that a formula means what its definition says; the
dictionary's own `.md` says no check reaches that, and it is right.

**Why it blocks `done`.** A metric dictionary exists to state formulas unambiguously. An entry
whose formula and definition specify different numbers is a defect in the artifact's core
purpose, it was found in review and shipped uncorrected, and it must not go to the Product Owner
as a formula to approve while it is two formulas. **This is a corrective authorship act** — the
Author decides whether the intent is a fleet mean (then fix the definition, the key and the unit)
or a per-workspace figure (then add `grouping: attribution.workspace_id` and drop the
denominator). **It is not mine to make.** My profile declares no Author authority and C5 binds
the Author to author-only; me editing the entry would collapse exactly the separation this
package has already been withdrawn once for breaching.

### Residual 2 — `M-10` and two prose sentences that lean opposite ways. **Recorded limitation, escalated.**

`M-10` is correctly open: nothing states whether a superseding `CTR-USG-001` record reuses the
superseded record's `occurred_at` or carries its own, the two readings give different monthly
totals, and the question is routed to CTR-USG-001's owner (A0 with A6). Routing an unanswerable
question rather than assuming an answer is right, and the routing is real.

But `M-10` claims the populations are *"stated in a form that is correct under both readings"*,
and the **restatement prose is not neutral**, which the Reviewer found and I reproduce:

- **`C-01`**: *"A CLOSED PERIOD CAN RESTATE, in the DOWNWARD direction when an estimate is
  replaced by a smaller provider figure and upward when it is replaced by a larger one."*
  Upward restatement of the original month only happens if the **replacement lands in that same
  month** — reading one.
- **`A-04`**: *"A correction arriving after a month is first reported removes the record it
  supersedes from that month's population, so the month's figure changes."* Removal alone changes
  a count only if the replacement is **not** added back to that month — reading two. Under reading
  one, `A-04`'s count would be unchanged: one record out, one in.

So the document declines to choose in `M-10` and quietly chooses, differently, in two entries.
The `population` blocks themselves are correct under both readings; the sentences describing
their consequences are not, and `M-10`'s "correct under both" claim is broader than what holds.

**Not blocking.** It is a documentation inconsistency inside an already-recorded open question,
on an artifact that computes nothing. But it should not be left for a reader to notice, so it is
recorded in the manifest alongside residual 1 and goes to the same corrective act. Whoever
answers `M-10` must fix both sentences; whoever fixes the sentences before `M-10` is answered
must make them neutral rather than pick a reading.

### Residual 3 — a cost aggregate with no `population` block passes green. **Recorded limitation. Guard gap, not a defect in the tree.**

I reproduced this. In a scratch copy I deleted `C-03`'s entire `population` block — `C-03` is a
`decimal_sum(cost.amount)` aggregate over `CTR-USG-001`, exactly the class condition C2 governs —
and re-ran both checkers:

```
node evidence/WP-0A-A6-001/verify-source-fields.mjs        exit 0   "no problems"
node evidence/WP-0A-A6-001/population-and-carrier-probes.mjs exit 0 "no problems"
```

The checker validates that a **stated** population covers all three axes. It has no rule that one
must exist. The only trace is a summary count sliding from `6 carrying a stated population` to
`5` — and unlike `63 field path(s) ... (pinned at 63)`, that count is **not pinned**, so nothing
fails. The defect C2 exists to prevent is the one shape the checker cannot see.

This joins the Tester's three recorded checker limitations and is the same species: the checker
is one-directional, catching what is written wrongly and not what is missing. It is a **fourth
entry on that list, not a fifth defect**. Every current entry in the tree does carry its
population, so nothing shipped wrong; the guard would not catch it if it had. The fix is cheap
and obvious — pin the population count the way the field count is pinned, or better, require a
population on every aggregate over `CTR-USG-001` — and belongs to the next authorship act on the
checker, together with the three the Tester already recorded.

### Residual 4 — `A-04`'s negative claim ships without a probe. **Not a defect. Now verified a third way.**

`A-04`'s caveat asserts *"CTR-USG-001 carries no outcome field of any kind"*. Condition C3
demands a constructed failing document for a claim that another contract *cannot express*
something; the Reviewer and Tester each verified this one by hand instead.

I verified it a third way, and by a different method than reading: I **enumerated the complete
property tree** of `contract-catalog/shared-kernel/ctr-usg-001/schema.json` rather than grepping
for likely names.

```
usage_id · occurred_at · dimension · quantity{amount,unit}
attribution{workspace_id, business_profile_id, job_id, provider_key}
cost{amount, currency, basis, supersedes_usage_id}
dedupe_key · tenant_context → $ref ../ctr-ten-001/schema.json
```

There is no outcome, status, result, success or state field anywhere in the set, and
`tenant_context` resolves to the tenant identity contract, which carries none either. **The claim
is true.** Three independent hand-verifications by three runs is adequate for a claim of this
size, and I am not manufacturing an objection out of the missing probe. It is worth one sentence
of caution and no more: hand-verification does not regress-test, so if `CTR-USG-001` ever gains
an outcome field, nothing in this package will notice that `A-04`'s caveat has gone stale. That
is a note for whoever owns `CTR-USG-001`, not a bar to integration.

## 4. Recorded against myself

`.agents/capability-profiles/cc-r0-steward.json` records `accepted_work_package:
"WP-0A-A0-002"` — **not this package.** The manifest names this run as
`integration_owner_agent_run_id`, so the assignment is real and the validators pass, but the
profile through which I hold the role was written for a different package and has never been
updated. `.agents/capability-profiles/**` is in this package's `read_only_paths`, so **I cannot
fix it here and did not try.** It goes to whoever owns `.agents/`.

No external or independent capability benchmark exists for this run either; that limitation is
already declared in the profile and applies to this verdict.

Cross-vendor independence is **not** satisfied on this package. Author, Reviewer, Tester and
Integration Owner are all Anthropic `claude-opus-5` runs. `prefer_cross_vendor_review` is a
preference in the manifest and it is unmet; recorded, not waived.

I observed **no GitHub pull request, no remote CI run and no branch-protection configuration**,
because none exists for this branch. This is local verification only. I did not push, did not
open a pull request and did not merge into `main`.

## 5. The handoff guard, my wrong first answer, and the reason it is not merely advisory

Advancing the status is a change to `work-packages/WP-0A-A6-001.json`, and that is substantive
drift to the handoff guard:

```
$ npm run check:handoff                                                     # exit 91
handoffs/WP-0A-A6-001-author-handoff.json cites a head 85d6f7a with 1 substantive change(s) after it:
  work-packages/WP-0A-A6-001.json
The cited range is true and does not describe the branch. Run `npm run refresh:handoff`.
```

**My first answer was to refuse the remedy, and it was wrong. I am recording the reversal rather
than the conclusion.** `refresh-author-handoff.mjs` rewrites the **Author's** handoff, and
running it here puts `evidence/WP-0A-A6-001/integration-verdict.md` and
`transcribed-role-verdicts.md` — files I wrote — into `/claude/a6_relay`'s `files_added`. That
looked like one run signing another's work, so I declined it and wrote this section saying a red
guard was better than a false attestation.

**Then I found out the guard is not advisory.** It is in the test suite as *"the handoff for this
branch describes this branch"*, so a stale handoff is a **red `npm run verify`** and
`npm run commit` refuses the tree. It had not fired on my first two commits for a reason worth
knowing: the check compares against `branchTipBefore()`, the branch as it stood **before the
current commit**. My status advance was therefore invisible to the guard at the moment it was
committed and surfaced one commit later, on the next thing I tried to commit.

```
$ npm run test:bootstrap
✖ the handoff for this branch describes this branch
  AssertionError: WP-0A-A6-001's handoff cites head 85d6f7a, after which 1 substantive path(s) changed
✖ the handoff ratchet fails when an author handoff claims another role approved something
  AssertionError: the suite must pass on an unmodified copy
ℹ fail 2
```

That leaves exactly two outcomes: refresh the handoff, or leave the branch tip red. **A red tip
cannot be `integration_verified`** — verifying the final state is the whole of my role — and
refusing the transition the protocol requires at this point would make that transition
unimplementable. So I refreshed:

```
$ npm run refresh:handoff
handoffs/WP-0A-A6-001-author-handoff.json now cites d5defb1..6ccee28 — 8 added, 1 modified, 0 deleted
```

**Exactly what changed, so nobody has to take my word for it:**
`head_revision_or_patch_checksum` `85d6f7a` → `6ccee28`, and two paths appended to `files_added`.
Nothing else. **`agent_run_id` is still `/claude/a6_relay` and `final_status` is still
`in_review`** — the tool touches no attestation field, and I touched none by hand. The Author's
own handoff instructs this: *"The revisions above are this branch's base and the tip it was cut
from. Re-derive them with `npm run refresh:handoff` after each commit."* The fields are
machine-derived facts about a commit range, enforced against git by the same test, and the
Author asked for them to be re-derived.

**The defect this exposes, which is neither mine nor the Author's.** The repository keeps **one
handoff per package** and names it `-author-handoff.json`, while **four roles commit to the
package branch.** The consequence is now visible in the file: `/claude/a6_relay`'s handoff lists
under `files_added` three files it did not write, beside a `final_status` of `in_review` that is
no longer the package's status. `handoffs/` and `evidence/` are already classified
written-afterwards; `work-packages/` is not, and it is the one file the protocol requires the
Integration Owner to change. **Every package that reaches integration will hit this.** It goes to
whoever owns `scripts/refresh-author-handoff.mjs` and `.agents/handoff.schema.json`, and the fix
is either to classify a status-only manifest change as incidental or to give each role its own
handoff the guard can see. My own attestation is in
`handoffs/WP-0A-A6-001-integration-handoff.json`, written separately rather than folded into
someone else's — which is the part of my first answer that was right.
