# WP-0A-A6-001 — independent test verdict

Tester: `/claude/q0_sentinel` (independent QA), Anthropic claude-opus-5.
Revision tested: **`f0ecb397be0074176c4ed5b23e01cc47cadebfcd`**, branch `agent/claude/WP-0A-A6-001-metric-dictionary`.
First pass tested `475d3df`; everything below was re-run against `f0ecb39` and the differences are stated.
Base: `merge-base main HEAD` = `d5defb1` = `main`. Gate G0. Synthetic only; no provider, no credential, no network.

This is my own attested report. It replaces the transcription of my verdict in
`transcribed-role-verdicts.md`, which was written in good faith by a run that did not witness my
test run and said so. **Where this file and that transcription disagree, this file governs.** The
disagreements are listed in §11.

## 0. A number of mine was wrong, and I found it the way the Reviewer found its own

My first-pass summary said **"35 mutations, 28 caught, 7 missed."** That was wrong, in my own
favour, and for the same reason the Reviewer's relayed count was wrong: **I counted non-zero exit
codes instead of checking that each mutation fired for the reason it was aimed at.**

Re-run with every mutation declaring the specific problem string it is supposed to provoke:

```
=== 35 mutations: 27 CAUGHT for the targeted reason, 1 UNRELATED, 7 MISSED ===
non-zero exits (the number a careless count would report): 28
```

The one I over-credited is `T12`, and chasing it down produced the most serious finding in this
report (§5). A second row moved the other way: `T9` really is caught, and my first pass had read
the first line of a two-problem list and mis-filed it. Net 28 → 27. I am recording both directions
because a recount that only ever moves in the direction that flatters the checker is not a recount.

## 1. Declared commands, on `f0ecb39`

Run through `zsh -lc` from the branch worktree. Exact output:

```
$ npm run verify
> node scripts/verify-clean-run.mjs
clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0
exit 0

$ node scripts/validate-work-packages.mjs                                          exit 0
$ node scripts/validate-capability-profiles.mjs                                    exit 0
$ node scripts/validate-work-package-ownership.mjs work-packages                   exit 0
$ node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A6-001.json   exit 0
$ node scripts/verify-branch-scope.mjs main WP-0A-A6-001                           exit 0
WP-0A-A6-001: all 11 changed path(s) are declared, and every amendment explains one

$ node evidence/WP-0A-A6-001/verify-source-fields.mjs                              exit 0
14 metric(s), 63 field path(s) resolved against a committed schema (pinned at 63), 2 recorded as
having no source at all, 6 carrying a stated population, 14 of 14 targets null.
no problems: every cited field exists, every formula names only fields it declares, every stated
population covers all three axes, every absent metric cites nothing, every enforced budget line
matches the number the schema enforces, and every target is null.
NOT CHECKED: any absence claim. Run population-and-carrier-probes.mjs for those.

$ node evidence/WP-0A-A6-001/population-and-carrier-probes.mjs                     exit 0
no problems: every EXPECT-VALID document validated, every EXPECT-INVALID document was rejected
for its stated reason, and every absence assertion held against the committed schemas.
```

### `zsh -lc` was not refused, including in the Author's own worktree

The Author recorded that `zsh -lc` was refused in its worktree and that it used `node`/`npm`
directly. I ran every command above through `zsh -lc` **in that same worktree**
(`.claude/worktrees/agent-ae6ca8e015c1b2faf`), and:

```
$ zsh -lc 'echo ZSH_OK; node --version; npm --version'
ZSH_OK
v24.20.0
11.19.0
exit=0
```

So the refusal is **session-local to the Author's run, not a property of the worktree**. That is a
stronger statement than my first pass could make, because my first pass only established that it
worked somewhere else. The Author's toolchain claim is otherwise confirmed: `v24.20.0` / `11.19.0`,
matching `.node-version` and `package.json` engines.

## 2. The red pre-work baseline — reproduced, and it is structural

The Author reported that `npm run verify` on the new branch before any edit was red at 258/260.
A red baseline an author explains away is the thing a tester exists to check, so I reproduced it:
fresh clone, `git checkout -b agent/claude/WP-0A-A6-001-metric-dictionary d5defb1`, no edits.

```
NOT clean: exit 1 — tests 260, pass 258, fail 2, skipped 0, todo 0
```

`npm run check` names both failures:

```
✖ the handoff for this branch describes this branch
  Error: ENOENT: no such file or directory, open 'handoffs/WP-0A-A6-001-author-handoff.json'
✖ the handoff ratchet fails when an author handoff claims another role approved something
```

The second is the meta-test that re-runs the suite in a sandbox, so it cascades from the same root
cause: two failures, one defect.

**The explanation is not merely plausible, it is forced.** `git show
d5defb1:work-packages/WP-0A-A6-001.json` already declares `"branch":
"agent/claude/WP-0A-A6-001-metric-dictionary"` at `"status": "ready"`, and
`test-kits/handoff-conformance.test.mjs:222` resolves the package from `git rev-parse
--abbrev-ref HEAD`. **Checking that branch name out before its handoff exists is red for anyone**,
including a tester, including CI. Nothing the Author did caused it and nothing was smoothed over.
Recording it was correct and I would have flagged its absence.

## 3. `verify-source-fields.mjs` — 35 mutations

Method: a harness on a disposable clone applies one mutation to the dictionary, runs the checker
with cwd at the repository root, and restores the pristine file. Each mutation declares the problem
string it should provoke; a non-zero exit whose problem list lacks that string is recorded as
**UNRELATED**, not as caught.

### 3.1 The Author's seven reproduce, with the messages its self-check quotes

| Mutation | Verdict | Message |
|---|---|---|
| `environment` budget → 99 | CAUGHT | *"enforced with max_distinct_values 99 while the schema closes it to 4 value(s)"* |
| `C-04.source.fields` emptied | CAUGHT | *"C-04 has status derivable_with_caveat and declares NO fields"* |
| `occurred_at` removed from `C-03` | CAUGHT | *"C-03's formula or population names CTR-USG-001.occurred_at … and its source.fields does not declare it"* |
| `C-02.population.restatement` deleted | CAUGHT | *"C-02 states a population and omits its restatement boundary"* |
| a target set to `0.9` | CAUGHT | *"1 metric(s) carry a target value: A-01"* |
| an `absent` metric given a contract | CAUGHT | *"A-03 is declared absent but cites CTR-EVT-001 []"* |
| a field removed from `S-05` and its formula | CAUGHT | *"62 field path(s) resolved, and this script pins 63"* |

Seven, all genuine. The dispatch brief I was given said "8 mutations, 8 caught"; the artifact
tabulates seven and claims seven. **The artifact's number is the accurate one** and the brief's was
not.

### 3.2 The four inputs the dispatch told me to force through

All four are caught, plus an evasion attempt on the third:

| Input | Verdict | Message |
|---|---|---|
| `S-02.source.fields = []` — cites CTR-AUD-001, declares zero fields | CAUGHT | *"S-02 has status derivable and declares NO fields. A metric that cites a contract and names no field in it makes a claim nothing can check."* |
| `environment` budget → 3 against `enum(4)` | CAUGHT | *"enforced with max_distinct_values 3 while the schema closes it to 4 value(s)"* |
| …budget → 99 **and** `enforced: false`, to dodge the number check | CAUGHT | *"enforced=false while the schema closes its values"* |
| `S-01.formula.numerator` gains `outcome` — real field, undeclared | CAUGHT | *"S-01's formula or population names CTR-AUD-001.outcome, which resolves in that schema, and its source.fields does not declare it"* |
| `A-03.source.fields = ["occurred_at"]`, contract still `null` | CAUGHT | *"A-03 is declared absent but cites null [\"occurred_at\"]"* |

Sixteen further mutations of mine are caught for their targeted reason: `target: 0`,
`target: "TBD"`, `target_null_reason` whitespaced or deleted, each population axis individually
deleted / emptied / made non-string, an extra field (pin reports 64), a whole metric deleted (pin
reports 60), a cited field renamed to a non-existent one, a budget label CTR-OBS-001 does not
carry, `status: absent` retained alongside contract and fields, a backticked undeclared real field
in population prose, and a non-resolving entry in `fields_mentioned_not_read`.

## 4. The seven misses, split honestly

**Documented design choices — not defects.** The script header states these:

- A population-prose token naming a real field **without backticks** (`quantity`) exits 0. The
  header argues the case at length and says a backtick is load-bearing. I agree; offering every
  prose token to the resolver would report *"a record's cost"* as a field citation.
- A **non-`enforced`** budget number set to `999999` exits 0. There is no enum for it to
  contradict; there is nothing to check against.
- A formula token that **does not resolve** is treated as prose. This is a stated extraction rule,
  though see gap B below for its cost.

**Undocumented gaps at the revision I first tested.** The Author has since written all three into
the script header, the self-check, the handoff and the dictionary's `verification` block at
`0647a39`, which is the right disposal:

- **(A) `source.status` is never validated against the document's own `source_status_vocabulary`.**
  `S-02.source.status = "obviously_derivable"` exits 0. Sharpest of the three: the three defined
  statuses *route work* — `absent` to a contract owner, `derivable_with_caveat` to A6 — so a status
  outside the vocabulary routes nothing and nothing says so, and the whole A-03 argument turns on
  what a status word means.
- **(B) The field/formula check runs one direction only.** Gutting `C-02.formula` to the single
  word `something`, so it names none of its seven declared fields, exits 0. And because an
  unresolvable token is prose, **a misspelling of `occurred_at` would have passed the very check
  built for C-03's omission of it** — a misspelling and an English word are indistinguishable to
  this check.
- **(C) The pin is a count, not a checksum.** Removing `usage_id` from `C-05` while adding
  `action.name` to `A-01` holds the total at 63 and exits 0.

## 5. A fourth gap, found on recount, and not yet in the tree

Chasing the one UNRELATED row produced a finding neither my first pass nor any file on this branch
contains.

`T12` deleted the **entire** `population` block from `C-01`. It exits 1 — but not for the
population check, which cannot fire, because it is guarded by `if (metric.population !== undefined)`.
It fires by accident:

```
C-01 lists CTR-USG-001.cost.basis in fields_mentioned_not_read and mentions it nowhere
```

`C-01`'s population prose was the only place it backticked `cost.basis`, so deleting the block
tripped an unrelated arm. That is luck, not coverage. So I asked whether the luck generalises, and
deleted the whole population block from each of the six metrics that carry one:

```
A-04  whole population block deleted -> exit 0   (5 carrying a stated population)
C-01  whole population block deleted -> exit 1   (5 carrying a stated population)
C-02  whole population block deleted -> exit 0   (5 carrying a stated population)
C-03  whole population block deleted -> exit 0   (5 carrying a stated population)
C-04  whole population block deleted -> exit 0   (5 carrying a stated population)
C-05  whole population block deleted -> exit 1   (5 carrying a stated population)
```

**Four of the six cost metrics can drop their entire C2 population boundary and the checker exits
0.** Only `C-01` and `C-05` fire, and only because they happen to be the two entries carrying a
`fields_mentioned_not_read` list. The printed line drops from `6 carrying a stated population` to
`5`, and nothing compares it to anything — which is exactly the failure the pin was introduced to
fix for field paths and was never extended to populations.

**This is a hole in the checker, not a defect in the dictionary.** All six populations are present
and complete at `f0ecb39`, each with all three axes, and the six-axis check does fire correctly on
any *partial* population (`T9`, `T10`, `T11`, and the Author's own restatement mutation). But C2 is
the condition this whole increment was re-staffed to satisfy, and the check that holds it can be
defeated by deleting more rather than less. **I rule it non-blocking** — the shipped artifact is
correct, and the fix is one pin or one required-key list — but it should be recorded alongside gaps
A, B and C rather than discovered by the next author. The dictionary's
`checker_limitations_found_by_independent_testing` block currently names three; as of `f0ecb39` it
is **incomplete, not wrong**. Recording that is mine; fixing the block is the Author's, and I have
not touched it.

## 6. The `unresolvedRef` branch — the Author's disclosure is exact

The Author states this branch is closed by inspection and not by execution. I confirmed both halves.

Every `$ref` in the shared kernel is the followable sibling form — `../ctr-err-001/schema.json`,
`../ctr-ten-001/schema.json` — so **no mutation of the dictionary can reach it**. I forced it in a
disposable clone by rewriting one `$ref` to an absolute URL:

```
A-01 cites CTR-AUD-001.tenant_context.workspace_id, whose path crosses a $ref this script cannot
follow: 'https://example.invalid/ctr-ten-001.json'. The field may exist; the REFERENCE is what
failed.
```

It fires, and with its own distinct reason rather than collapsing into "this field does not exist",
which is the whole point of hole 4. Reachable only by a schema edit the package must not make;
correct when reached; honestly declared as untested. **This is my execution and is my evidence, not
the Author's coverage** — and the Author correctly declined to claim it as its own.

## 7. `population-and-carrier-probes.mjs`

- **It imports the repository's validator**, line 25:
  `import { validate } from '../../test-kits/contracts/json-schema-subset.mjs';`
  It does not reimplement it. `git diff main...HEAD -- test-kits/ contract-catalog/ scripts/` is
  empty: no validator, schema, fixture or script was touched by this branch.
- **The 42.00-vs-22.00 result reproduces**, and it is computed rather than asserted:
  ```
  C-01 with NO population stated (the withdrawn increment): 42.00 THB
  C-01 post-dedupe only (RFC-2026-014 alone):               42.00 THB
  C-01 post-dedupe AND superseded excluded (this version):  22.00 THB
  ```
  I changed the estimate fixture from `'20.00'` to `'30.00'`; the naive total moved to `52.00` and
  `POP-NAIVE-DOUBLE-COUNTS` failed. `decimalSum` is BigInt arithmetic over the decimal string form,
  never a binary float, consistent with M-04.
- **The post-dedupe result reproduces**: `post-dedupe total = 42.00; keys differ = true`. RFC-2026-014
  genuinely does not close the population question, because `cost.basis` is in the dedupe key.

**The probes are schema-sensitive, not constants dressed as probes.** Five perturbations of a
disposable clone each flipped the right probe and nothing else:

| Perturbation | Result |
|---|---|
| an `enum` added to `CTR-EVT-001.event_type` | `FAIL EVT-NO-VOCABULARY` |
| `CTR-TEN-001.timezone` const → plain string | `FAIL TEN-TIMEZONE-CONST`, `FAIL TEN-OTHER-TIMEZONE (expected INVALID, got VALID)` |
| `CTR-AUD-001.additionalProperties` → `true` | `FAIL AUD-INTERVAL`, `FAIL AUD-INTERVAL-REASON` |
| a `date-time` property added to CTR-NTF-001 | `FAIL NTF-NO-TIMESTAMP` |
| a sign allowed on `cost.amount` | `FAIL USG-NO-NEGATIVE-AMOUNT (expected INVALID, got VALID)` |

## 8. The discipline the package exists to hold — checked mechanically

Every numeric leaf in the entire dictionary JSON, enumerated by walk rather than by reading:

```
$.metric_label_cardinality_budget.budget[0..4].max_distinct_values = 4, 4, 64, 16, 32
$.metric_label_cardinality_budget.implied_series_ceiling.value      = 524288
```

Six numbers, and **none of them is a KPI target or a new proposal.** The five budget numbers are a
verbatim restatement of a record already on `main`, in
`contract-catalog/shared-kernel/ctr-obs-001/manifest.json`:

> "(environment 4, outcome 4, error_code 64, capability_key 16 per module, module_key 32) is
> recorded for the metric dictionary and is NOT enforced here."

`4 × 4 × 64 × (32 × 16) = 524288` — arithmetic checked. So the dictionary's `provenance` line is
accurate and the self-check's "no number proposed for any budget line" survives scrutiny: this
document is the home that manifest was pointing at.

- **14 of 14 targets `null`**, each with a non-empty `target_null_reason`. Verified in the JSON by
  walk, and independently in the reading view: all fourteen Target cells read `` `null` ``, with
  A-02's reading `` `null` (and `N` is `null`) ``.
- **A-02's cohort parameter `N` is null**, and the entry names it *"a target in disguise"* — the
  right call, since choosing N chooses how fast activation is expected to be.
- **No comparator, range, threshold or placeholder anywhere.** I swept every digit-bearing fragment
  inside every string in the dictionary — 103 distinct after removing reference identifiers — and
  every one is an identifier, a formula window (`7d`, `28d`), a percentile *name* (`p50`, `p90`), a
  schema pattern, the `24/7` inside a warning against advertising 24/7 support, or the synthetic
  20/22/42 population demonstration. A regex sweep for `>=`, `<=`, percentages, "at least", "no more
  than", "within N", "target of", "SLO of" over both deliverables returns nothing.

## 9. Scope, status and blockers

- **11 changed paths, all inside `ownership.writable_paths`.** `verify-branch-scope.mjs main
  WP-0A-A6-001` → exit 0, *"all 11 changed path(s) are declared, and every amendment explains one"*.
  Nothing under `contract-catalog/`, `test-kits/`, `scripts/`, `.agents/`, `db/`, `migrations/` or
  `.github/` was touched.
- **All seven `open_blockers` that stood on `main` are byte-identical.** None deleted, none edited.
  Three were added by the roles that ran after me.
- **`role_assignments` unchanged.**
- Status is `integration_verified` at `f0ecb39`. The transitions were made by other runs and are
  not mine to revisit; I record that the state is consistent with the verdicts filed.

## 10. My conflict of interest, in my own words

**I wrote the capability benchmark this Author was staffed on**
(`evidence/capability-benchmarks/a6-relay-billing-cost-ops.md`). If this increment performs well, my
benchmark looks well-judged. That is a real interest and it points one way: toward passing this.

The only counterweight is a term I wrote into the benchmark myself — that the recommendation is
**withdrawn rather than re-conditioned** if a second sample repeats the adjacent-contract
over-claim. This increment is that second sample. I tested it expecting to have to withdraw, and I
should be judged on what I actually did rather than on my saying so: I built 28 mutations the Author
never ran, forced a branch the Author declared untested, perturbed five committed schemas to check
the probes were not constants, swept every number in the document by walk instead of by eye, and —
when told to attest this — recounted and found my own headline figure was wrong in my own favour and
corrected it downward. I also note, as the transcription rightly does, that **"I hunted for grounds
to withdraw and found none" is a self-report about my own diligence and nobody has audited it.**

### Did the withdrawal trigger fire? No — and here is the check, not the assertion

The trigger is specific: asserting that an **adjacent contract cannot express something**, without a
constructed document that fails to validate. I extracted every negative-capability claim about a
named contract in the dictionary — ten distinct ones — and checked each.

Seven ship with an executed probe or a per-run checker assertion (`EVT-PAYLOAD-CLOSED`,
`AUD-INTERVAL`, `NTF-NO-TIMESTAMP`, `JOB-NO-TERMINAL-STATE`, `USG-NO-NEGATIVE-AMOUNT`,
`USG-SELF-SUPERSESSION-VALIDATES`, and the `CTR-ERR-001.code` vocabulary check the checker runs
every time). The three that ship with neither, I verified by hand against the committed schemas:

| Claim | Check | Holds? |
|---|---|---|
| CTR-OBS-001 leaves `workspace_id` out of `sli_tags` | `sli_tags` has exactly `capability_key, environment, error_code, module_key, outcome`, `additionalProperties: false`; the schema's own annotation says `workspace_id` is deliberately absent | **yes** |
| CTR-USG-001 carries no outcome field of any kind | 18 property paths enumerated; none outcome-shaped; the word `outcome` appears nowhere in the schema text | **yes** |
| `CTR-ERR-001.code` has no enum and no registry | `vocabulary present: false`, asserted on every run | **yes** |

**No repeat.** The Author additionally self-reported the A-02 instance it found and corrected, which
neither prior review had named, and executed the correction as probe `EVT-LIFECYCLE`. Finding your
own over-claim and shipping the executable disproof is the opposite of the behaviour the trigger
watches for.

**So the recommendation stands, and stays conditional.** It does not become unconditional: the
benchmark's own bar for that is a second sample reviewed by a run distinct from both the Author and
me, and this staffing does not meet it and never claimed to. The §5 gap is a checker limitation, and
the §0 miscount is mine, not the Author's; neither is an adjacent-contract over-claim, and I am not
stretching a term to reach a verdict in either direction.

## 11. Where this report governs over the transcription

The transcription in `transcribed-role-verdicts.md` is fair and I do not dispute its substance. Two
corrections and one addition:

1. **My mutation count.** Any record of "28 caught" is superseded by **27 caught for the targeted
   reason, 1 unrelated, 7 missed, out of 35** (§0). No file on this branch transcribed my counts, so
   there is nothing else to correct — but the number is now on the record in the run that produced it.
2. **"Three checker limitations found."** There are **four** (§5). The dictionary's
   `checker_limitations_found_by_independent_testing` block and the checker header are incomplete as
   of `f0ecb39`, not wrong.
3. The transcription's caution that my no-withdrawal conclusion is an unaudited self-report is
   correct and I have repeated it in §10 rather than deleted it.

## 12. Verdict

**`test_verified`** at `f0ecb397be0074176c4ed5b23e01cc47cadebfcd`.

The one required correction from my first pass — the handoff's `tests[]` entry claiming the
`unresolvedRef` hole was mutation-tested while `known_limitations` in the same file correctly said
it was not — **was made at `0647a39`, and made in the right direction: the claim came down and the
limitation was not weakened to meet it.** I verified the corrected text.

**What I tried that did not break it**, stated plainly because a pass is only worth what the attempts
behind it were worth: 35 dictionary mutations including every input the dispatch specified and four
deliberate evasions; five schema perturbations against the probes; forcing an unreachable branch;
recomputing the population arithmetic from altered fixtures; and a mechanical sweep for a leaked
number over every numeric leaf and every digit-bearing string in the document. The dictionary is
correct at this revision, the probes assert against the repository's own validator, the population
arithmetic is real, and the target discipline holds without exception.

**Residuals, all non-blocking and none of them a defect in the shipped artifact:** the four checker
gaps (§4 A–C and §5), of which three are already recorded in the tree and the fourth is recorded
here. My conflict of interest stands as declared and the benchmark's recommendation remains
conditional.

**Not mine and not fixed here**, carried so they do not travel only in prose: `npm run check:handoff`
exits 75 in a detached-HEAD worktree, a checkout artifact rather than a defect — it exits 0 on this
branch, which I confirmed; and the handoff conformance guard surfaces drift one commit late, so a
green `check:handoff` is not proof. Both belong to whoever owns
`scripts/refresh-author-handoff.mjs`.

**No repository state was changed by this test.** Every mutation, perturbation and forced branch ran
in disposable clones under a scratch directory; `/Users/bank/ThinkBizThai` and both worktrees were
verified unmodified after each. The only file this run writes is this one.
