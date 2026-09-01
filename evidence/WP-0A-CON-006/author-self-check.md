# WP-0A-CON-006 — Author self-check

Author run: `/claude/a0_atlas` (Anthropic, `claude-opus-5`)
Branch: `agent/claude/WP-0A-CON-006-usage-and-notification`
Date: 2026-09-01

Author self-evidence only. Not review, security, test, integration, Product Owner,
or merge approval, and it does not move Gate G0.

## The shared-kernel catalog is now complete

**14 of 14** contracts materialized. **115 fixtures** across the catalog are
validated against their own `schema.json`. The index is untouched and still reports
**4 Candidate / 10 Draft** — materializing a Draft does not promote it.

Both contracts passed conformance **without a correction round**, as CTR-MOD-001 and
CTR-FLG-001 did. That is now three packages in a row, and it is the method rather
than luck: rules go into the schema first, so the schema and the fixtures were never
two descriptions of the same rule that could drift apart. WP-0A-CON-002 was rejected
twice for exactly that drift.

## Sourcing

### CTR-USG-001 — Usage and Cost Event (owner A0+A6)

| Rule | Source |
|---|---|
| six `dimension` values | **OB-004 Inputs** names exactly token / search / bytes / egress / processing / publish. The enum is that list and nothing else. |
| `attribution` requires workspace, job, provider | **OB-004 acceptance**: "workspace/business/job/provider attribution ครบ". `business_profile_id` is conditional because §3.1 makes it conditional. |
| money as a **decimal string** with explicit scale | **OB-004** requires correct money precision; **Decision Register §4.2 MOD-130** forbids floating-point money. |
| quantity also a decimal string | **Declared inference**: the same prohibition extended to the number a cost is derived from. §4.2 does not say this. |
| `dedupe_key` | **OB-008** detects missing and **duplicate** usage; **ID-002** requires a dedupe record. |
| `cost.basis` | **Declared inference from OB-008**, which reconciles against provider statements and therefore must know whether a figure was reported or estimated. OB-004 does not name it. |
| `metric_labels` held empty | **OB-006**: no user content, token or page name in a metric label, cardinality bounded. Held at `maxProperties: 0` for the same reason CTR-EVT-001 holds `payload` empty. |

### CTR-NTF-001 — Notification Command and Result (owner **A5**)

| Rule | Source |
|---|---|
| command / result split | **PT-007**: channel-neutral **command and result**. |
| `deep_link.requires_permission: const true` | The catalog row requires a **"permission-checked deep link"**. A link that does not demand the check is the defect the row names, so the prohibition is a const rather than prose. |
| `domain_result_rolled_back: const false` | **PT-007 acceptance**: "delivery failure does not roll back domain result". Same treatment. |
| `failure_class` required on a failure | **CT-007** requires transient and permanent failure to be distinguishable. A failure stating neither is unusable to a retry policy. |
| `dedupe_key` | **ID-005** notification dedupe; **PT-007** requires dedupe support. |
| `message_key` pattern | **Declared inference** from CTR-ERR-001's Thai message-key precedent. PT-007 requires locale support and names no shape. |
| `channel` includes email and line | **Declared inference**: PT-007 names them as *future* channels, so a contract omitting them would have to change to add them. |

## Declared as not demonstrable

- **OB-008 reconciliation** and **ID-005 suppression** are properties of a ledger or
  a dedupe store across many events. A fixture can carry a `dedupe_key`; it cannot
  demonstrate that a second delivery was suppressed.
- **PT-007's non-rollback guarantee** spans two subsystems. The `const false`
  *records the prohibition*; it does not prove the domain result survived.
- **That a cost is arithmetically correct for its quantity.** The schema can require
  a decimal string with a scale; only OB-008 can check the multiplication.

## Author-declared limitations

- **CTR-NTF-001 is owned by A5, and CTR-USG-001 by A0+A6.** Neither owner is in this
  session. This is the same class of ownership irregularity that CTR-MOD-001 created
  for CTR-SEC-001, and independent review was right to grade that High. It is
  recorded in `open_blockers` and in both `freeze_boundary` fields as requiring owner
  ratification — **not** resolved here.
- A6 has not supplied an independently reviewed `billing-cost-ops` capability
  benchmark (WP-0A-A6-001's own blocker), so the cost semantics are materialized from
  the baseline text alone.
- This run authored the change and must not review, security-review, test-verify or
  integrate it.
- Conformance passing on the first run says the schema and the fixtures agree. It
  says nothing about how much of each schema any fixture exercises — independent
  review measured that at 10–19% on the previous two packages, and no one has
  measured it here.

## Verification

| Command | Exit | Result |
|---|---|---|
| `npm run check` | `0` | `tests 116 / pass 116 / fail 0 / skipped 0 / todo 0` |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `0` | both new contracts validated against their own schemas |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| `node scripts/scan-repository-secrets.mjs` | `0` | no output |

Catalog coverage measured directly: **14/14 materialized, 115 fixtures under
conformance, index unchanged at 4 Candidate / 10 Draft.**

---

## Independent review and testing, and what they took apart

Reviewer `changes_requested`, Tester `test_verified_with_conditions`. The citation
result was the cleanest of the session — **no non-existent task id and no
miscitation**, after three packages that each carried some. The design, however,
did not survive.

### The vacuous rule — found independently by both runs

CTR-USG-001's only conditional rule was **a demonstrated no-op**. `if basis ==
estimated then cost requires [amount, currency, basis] and requires dedupe_key` —
but `cost.required` already held those three and root `required` already held
`dedupe_key`. Deleting the whole `allOf` changed **0 of 32** adversarial instances
while its `x-rule` prose claimed a double-counting guarantee the contract did not
contain. This is the `CTR-PAG-001` `minItems: 1` defect class in a new form.

Replaced with a rule that constrains something: a **provider-reported** cost must
name the estimate it supersedes, because a reported event and the estimate it
replaces are otherwise two events for one cost — which is exactly what OB-008
exists to detect.

### The category error — the sharpest finding of the session

`delivery.domain_result_rolled_back: const false` asserted **what a different
subsystem did**. If a rollback actually occurred, the truthful report became
schema-invalid: it **suppressed the evidence rather than preventing the
violation**.

And the Reviewer found the citation this package missed: **Decision Register §4.2,
MOD-100's ห้ามทำ column, reads `roll back domain result on delivery failure`** —
the prohibition is already placed on A5's own module, where it can be enforced.
Verified directly at line 159. Removed, with the reason recorded in
`untestable_by_schema` rather than deleted quietly.

Its companion ruling stands and is worth keeping: `requires_permission: const true`
**is** sound, because it makes a prohibited *configuration* unstatable. The two
consts looked alike and were not.

### The permission check failed open

`const true` never fires on an **absent** property, so a `deep_link` omitting
`requires_permission` passed — the guarantee the catalog row names, failing open
silently. `required` added at that level. A command could also carry no `deep_link`
at all.

### Four invented rules

`quantity.unit` and `delivery.state` shipped with **no `x-source` at all**;
`cost.basis: list_price` had no source **and contradicted this package's own
`scope.exclude`**; and `metric_labels` belongs to **CTR-OBS-001's** catalog row, not
this one — the exact inverse of the "right row, wrong column" error CTR-OBS-001
itself records. Removed or declared.

`notification_id` also shipped unsourced — **the same defect CTR-OBS-001 records as
already corrected for its `trace_id`**, three directories away in this catalog.

### Money

The three asymmetries were accidental, and one mattered: `cost.amount` accepted a
**negative sign** while `quantity.amount` did not. `NG-006` makes automated refund a
non-goal, `OPEN-001` leaves refund policy to Product and an accountant, and
`BILL-DEC-013` is Proposed — so the sign **materialized an explicitly open
decision**. Removed. Both patterns now bound the integer part at 16 digits, because
an unbounded value the contract calls valid defeats the very purpose of MOD-130 for
any consumer that parses it, and both exclude leading zeros so one amount has one
spelling. The Reviewer also found a better citation than the one used: §5.2's own
CTR-USG-001 row says **"decimal money"** directly.

### Coverage

The Tester measured **CTR-USG-001 at 7.0%** — the lowest of the session — and
CTR-NTF-001 at 24.5%, and found that **neither contract had a single entry in
`schema-mutation-coverage.test.mjs`**: the guard built for exactly this defect had
not been extended to the packages that followed it. That is an omission by this
Author, not a gap in the technique.

Ten protected sites added and sixteen counterexamples written, one per named
unkilled site. Re-measured:

| Contract | Before | After |
|---|---|---|
| CTR-USG-001 | 7.0 % | **40.0 %** |
| CTR-NTF-001 | 24.5 % | **57.1 %** |

Both are now well above every previous package in this catalog.

### The ownership ruling, accepted

The Reviewer refused to grade the two contracts alike, and was right to. For
**CTR-USG-001 (A0+A6)** A0 is a co-owner — legitimate, no finding. For
**CTR-NTF-001 (A5 sole)** it ruled **it should not have been done**, graded High:
§4.1 reserves *proposing* to the owner and §4.3 makes A0's role "producer submits
proposal and fixture; A0 assigns version". A0 wrote the proposal. Neither clause is
cited anywhere in this package, ratification-after-the-fact is a weaker and
different control, and real design was authored — four unsourced decisions.

The concrete harm it names is the one to carry: **the "14 of 14 complete" headline
counts an unratified non-owner draft as coverage at G0.** That headline is qualified
wherever it appears.

---

## Review at the real head — the coverage number was inflated by its own metric

Independent review of `5c6eef2..337dfe7` returned `changes_requested`, and the
finding that matters is not any single rule.

### The metric was gameable in both directions, and had already misfired

`constraintSites` counted **bare property names**, which were 55–91% of every
contract's "kills". The reviewer proved the consequences on real copies, CI green
each time: **deleting six untested constraints from `ctr-ten-001` raised its score
from 32.4% to 39.3%**, and **adding four zero-constraint properties raised it to
39.5%**. A schema was rewarded both for having fewer rules and for having more
names. It also counted `x-amended-by` internals, unobservable by construction — 5
and 10 permanently dead sites in `ctr-evt-001` and `ctr-job-001`.

And it had already misfired for real. The fixtures added to clear the floor were
**double-faulted**, so `dimension.enum` and `attribution.required` — the two rules
CTR-USG-001's own `freeze_boundary` says it "materializes exactly" — ended up killed
by **nothing**, while the reported headline moved 7.0% → 41.9%.

**The number went up while the coverage went down.** That is the worst failure mode
a metric can have, and this Author shipped it.

### Corrected

The metric now counts **assertion keywords only** — the seventeen JSON Schema
keywords that actually constrain an instance. A property name is not a constraint.

| | Reported before | True figure |
|---|---|---|
| Catalog | 42.4 % | **19.3 %** |

Then 397 **single-fault** counterexamples were generated from the schemas
themselves, one per unkilled assertion, and verified two ways each: rejected by the
shipped schema, and accepted once that one constraint is deleted. That is what makes
a fixture a witness rather than a decoration.

| | Before | After |
|---|---|---|
| Catalog | 19.3 % | **82.3 %** |
| Weakest contract | 4.3 % (`ctr-ten-001`, `ctr-err-001`) | **72.4 %** |

The floor is raised **30% → 70%**. The reviewer's judgement that 30% was "set to
pass, not to bite" was correct: it failed nothing, and the weakest contract cleared
it by one site.

### The ownership finding, accepted without qualification

`schema-mutation-coverage.test.mjs` is **WP-0A-CON-003's** output. This package
edited it while listing it in its own `read_only_paths` and omitting it from
`authorized_cross_package_amendments`, so `npm run check` stayed green **only
because `outputs.files` did not admit the change** — and that list was stale in 16
places. The reviewer's characterisation is exact: *the same ship-past-the-control
pattern an Integration Owner blocked earlier in this session, relocated into the
manifest.* Declared, and `outputs.files` resynchronised against the tree.

### `supersedes_usage_id`

Not a no-op — it rejects real documents — but wrong in three ways. It was
**required unconditionally**, so a first report with no prior estimate was
inexpressible and a producer would be pushed toward a fabricated reference the
schema accepts. A cost could supersede **itself**. Two events could supersede the
same estimate. It is now optional; the dangling-reference and duplicate-supersession
rules are ledger properties across events and are declared in
`untestable_by_fixture` rather than faked.

### The copied falsehood

`forbidden_paths_note` was **copy-pasted verbatim from WP-0A-CON-004** and asserted
that "this package materializes the secret-handle contract itself". CON-004 has 25
such outputs; this package has **none**. Two globs were dropped on a rationale that
was false here. Replaced with the real one.

Superseded prose also removed: `scope.include`, an acceptance criterion and a
required test still described the `domain_result_rolled_back` const that was deleted
a wave earlier, and `list_price` still shipped inside a fixture after leaving the
enum.

---

## The generated fixtures, judged

This Author raised the suspicion in the brief rather than waiting for it to be
found: 397 machine-generated counterexamples moved the figure from 19.3% to 82.3%,
which is the same shape as the thing this package had just been caught doing —
replacing a gameable metric with material that satisfies it.

Independent testing measured it exhaustively rather than by sample.

### What held

**Isolation is the strongest result.** Of all 537 invalid fixtures, **531 kill
exactly one site, 6 kill none, and zero kill two or more.** Cross-checked by error
count: 533 produce one schema error. The two genuinely double-faulted fixtures are
both **hand-written and pre-existing**. None of the 441 generated ones is
double-faulted — which matters because double-faulting is precisely what broke the
previous round.

The 82.4% figure **reproduces independently** — the reviewer reimplemented the
metric — so it is not inflated. And the generation displaced nothing: only 3 sites
are covered by both a generated and a hand-written fixture, and **81 remain covered
solely by hand-written witnesses**, because the generator skipped every site already
killed.

### What did not

**~71% of the generated fixtures are mechanical**, and the judgement is accepted
without argument. They violate a rule with a sentinel (`"zz not matching pattern"`)
rather than with a value a producer could plausibly emit. The 66 `enum`, `pattern`
and `format` ones are the weakest, because those keywords are exactly where a
contract encodes a **specific hazard** and a sentinel erases it. The reviewer's
comparison is the right one: hand-written
`handle: "plaintext:this-is-not-a-registry-reference"` against generated
`"zz not matching pattern"` for the same rule.

They are load-bearing — each is a real witness that kills exactly one site — but
**82% coverage must not be read as 82% of the catalog's hazards being illustrated.**
Recorded as an open blocker.

**Conditional sites sit at 57.6% against 88.8% for leaf assertions.** The generator's
naming drops `allOf`/`then`/index segments, so 52 names would have collided and it
**skipped** those sites rather than misnaming them. That is why all 441 names are
correct and also why the business rules — the `if`/`then` half — stay the least
covered. The naming scheme is the ceiling on this metric, not a cosmetic issue.

### The ratio still rewarded deleting rules

The reviewer deleted six real but untested rules from `ctr-mod-001` and the score
**rose** 72.4% → 77.8%, catalog 82.4% → 83.1%, CI green. *A rule nothing tests is
still a rule you are rewarded for deleting.*

A ceiling on unkilled sites does not fix that either — deleting an untested rule
lowers that count too. What deletion **cannot** do is preserve the total. So each
contract now declares a **floor on its constraint-site count** alongside the
unkilled ceiling. Verified: the same deletion now exits `1` with
`ctr-mod-001 — 83 constraint sites, below its declared floor of 87`. A rule can
still leave the catalog, but only by lowering a number someone edits deliberately,
in a diff a reviewer reads.

### Also closed

A contract directory carrying a `schema.json` and **no** `manifest.json` was
silently exempt from both the floor and conformance — the quietest way to remove a
contract from every check at once. It now fails.

`WP-0A-A0-004` was still `status: backlog` while its workflow step and RFC were
already in the tree. Corrected.
