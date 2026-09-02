# WP-0A-CON-006 — Independent Tester verdict: the 397 generated counterexamples

Run id: `/claude/q0_sentinel`
Head: `9a82456`
Date: 2026-09-01
Toolchain: pinned Node 24.20.0 / npm 11.19.0

**This is independent Tester evidence only.** It is not review, security review,
Author self-check, Integration, Product Owner, or merge approval, and it does not move
Gate G0. All work was done in a frozen copy at
`.../scratchpad/w14`; destructive probes were run in separate copies
(`probe1`–`probe6`, `ci-a`, `ci-b`). The source repository was not read or written.

The Author asked this run to attack a specific suspicion: that replacing a gameable
metric with 397 machine-generated fixtures that satisfy it is the same move as the one
independent review just caught. That suspicion is **partly justified and partly not**,
and the two halves are separable. This document separates them.

---

## 6. Baseline — `npm run check`

| Command | Exit | Result |
|---|---|---|
| `npm run check` (frozen head, clean) | **0** | `tests 119 / suites 0 / pass 119 / fail 0 / cancelled 0 / skipped 0 / todo 0` |

`contract-catalog/shared-kernel/index.json` read directly: **14 rows, 4 Candidate /
10 Draft**, every row at version `1.0.0`.

```
CTR-TEN-001 Candidate 1.0.0    CTR-USG-001 Draft 1.0.0
CTR-ERR-001 Candidate 1.0.0    CTR-SEC-001 Draft 1.0.0
CTR-EVT-001 Candidate 1.0.0    CTR-MOD-001 Draft 1.0.0
CTR-JOB-001 Candidate 1.0.0    CTR-FLG-001 Draft 1.0.0
CTR-API-001 Draft     1.0.0    CTR-AUD-001 Draft 1.0.0
CTR-PAG-001 Draft     1.0.0    CTR-OBS-001 Draft 1.0.0
CTR-IDM-001 Draft     1.0.0    CTR-NTF-001 Draft 1.0.0
```

No status change, no version change, index untouched. Confirmed.

---

## The headline number is real and reproducible

I did not take the suite's word for the ratio. I reimplemented the corrected metric
independently (same seventeen assertion keywords, same `x-` exclusion, driving the
shipped `json-schema-subset.mjs` validator) and measured every contract from the tree.

| | Author reported | This run measured |
|---|---|---|
| Catalog | 82.3 % / 82.1 % | **82.4 %** (576 / 699 sites) |
| Weakest contract | 72.4 % (`ctr-mod-001`) | **72.4 %** (63 / 87) |

| Contract | Killed / sites | Ratio |
|---|---|---|
| ctr-mod-001 | 63/87 | 72.4 % |
| ctr-flg-001 | 54/74 | 73.0 % |
| ctr-pag-001 | 28/38 | 73.7 % |
| ctr-ntf-001 | 30/39 | 76.9 % |
| ctr-api-001 | 30/38 | 78.9 % |
| ctr-aud-001 | 51/63 | 81.0 % |
| ctr-sec-001 | 62/76 | 81.6 % |
| ctr-idm-001 | 31/36 | 86.1 % |
| ctr-obs-001 | 73/83 | 88.0 % |
| ctr-job-001 | 36/40 | 90.0 % |
| ctr-err-001 | 21/23 | 91.3 % |
| ctr-usg-001 | 35/37 | 94.6 % |
| ctr-evt-001 | 40/42 | 95.2 % |
| ctr-ten-001 | 22/23 | 95.7 % |

The number is not inflated and not misreported. What it *means* is the rest of this
document.

Catalog totals: **581 fixtures — 44 valid, 537 invalid**, across 14 contracts.

---

## 2. Do they isolate one constraint each? — **Yes, and cleanly.** Answered first, because it is the strongest result

This was the defect that broke the previous round, so it was measured exhaustively
rather than sampled. For **every one of the 537 invalid fixtures**, I deleted each of
its contract's constraint sites one at a time and recorded which deletions flip that
fixture's verdict.

| Sites a single invalid fixture kills | Count |
|---|---|
| exactly 1 | **531** |
| 0 | 6 |
| **2 or more** | **0** |

**No fixture in the catalog is double-faulted in the mutation sense.** Not one.

Cross-checked a second way — how many independent errors the shipped schema reports
per fixture:

| Schema errors reported | Count |
|---|---|
| 1 | 533 |
| 2 | 4 |

All four two-error cases were opened by hand:

- `ctr-flg-001/invalid-temporary-without-expiry.json` and
  `ctr-mod-001/invalid-permissioned-without-declarations.json` — two errors, but both
  from the **same** `required` site naming two missing properties. One site, one kill.
  Correct.
- `ctr-evt-001/invalid-missing-tenant.json` — missing `tenant_context` **and**
  `metadata.schema_ref`. Genuinely double-faulted. Kills **nothing**.
- `ctr-usg-001/invalid-float-cost.json` — violates `cost.amount.pattern` **and**
  `cost.basis.enum`. Genuinely double-faulted. Kills **nothing**.

So the catalog contains exactly **two** genuinely double-faulted fixtures, both
hand-written and pre-existing, both demonstrating the failure mode precisely (a fixture
that fails twice witnesses nothing), and **zero of the 441 machine-named fixtures are
among them**. The generator's two-way verification claim — rejected by the shipped
schema, accepted once that one constraint is deleted — holds under independent
re-derivation for all 441.

Four other invalid fixtures kill nothing for a different reason
(`ctr-api-001/invalid-success-with-error.json`,
`ctr-aud-001/invalid-succeeded-with-error.json`,
`ctr-ntf-001/invalid-command-carrying-delivery.json`,
`ctr-ntf-001/invalid-delivered-with-failure-class.json`): they are killed by structural
`not`/`anyOf` composition the metric does not count as a single assertion site. These
are among the most semantically meaningful fixtures in the catalog and the metric
scores them zero. Noted below.

---

## 1. Substantive or mechanical? — **~29 % substantive, ~71 % mechanical**

441 fixtures carry the generator's naming shape. I read across all fourteen contracts
and every assertion keyword, sampling far more than the thirty asked for, and
reconstructed the generator's full mutation vocabulary from the fixture bodies:

| Keyword | Count | The mutation actually applied |
|---|---|---|
| `type` | 194 | value replaced with `12345` or `"zz_wrong_type"` |
| `minLength` | 66 | value replaced with `""` |
| `additionalProperties` | 52 | inject `"zz_undeclared": "x"` |
| `required` | 45 | delete the first required property |
| `enum` | 28 | value replaced with `"zz_not_in_enum"` |
| `pattern` | 25 | value replaced with `"zz not matching pattern"` |
| `format` | 13 | value replaced with `"zz"` |
| `const` | 9 | flip the const |
| `minimum` | 6 | boundary − 1 (`1 → 0`, `0 → -1`) |
| `minItems` | 3 | `[]` |

Applying the Author's own test — *does this represent a violation a real producer could
plausibly emit, or is it a nonsense value that exists only to flip a bit?*

**Substantive — 129 / 441 (29.3 %).** `required` (45), `minLength` (66), `minimum` (6),
`minItems` (3), `const` (9). These carry **no sentinel value at all**. The violation is
an absence, an empty string, an empty array, an off-by-one, or a flipped boolean —
which is exactly the shape of a real producer bug. `invalid-progress-percent-minimum`
sets `progress_percent: -1`; `invalid-capabilities-minitems` sets `capabilities: []`;
`invalid-redaction-secret-redacted-const` sets `secret_redacted: false`, which *is* the
hazard the const exists to forbid. These are genuine test cases and I would have written
several of them by hand the same way.

**Mechanical — 312 / 441 (70.7 %).** Split by how much is lost:

- *Real class, sentinel value* — `type` (194) and `additionalProperties` (52) = 246.
  A producer serializing an id as a JSON number instead of a string is one of the most
  common real integration bugs, and an undeclared extra key is the exact hazard this
  catalog's own history records ("extra keys carrying secrets passed at envelope,
  tenant_context, accepted, error and scope level"). The *class* is real. But `12345`
  and `zz_undeclared: "x"` are placeholders that document nothing about which hazard
  the rule guards.
- *Sentinel erases the hazard* — `enum` (28), `pattern` (25), `format` (13) = 66.
  These are the worst of the set, because these keywords are precisely where the
  contract encodes a *specific* hazard, and the sentinel throws that away. Compare, on
  the same keyword and in some cases the same contract:

  | Hand-written witness | Generated witness |
  |---|---|
  | `ctr-sec-001/invalid-handle-not-an-opaque-reference.json` → `handle: "plaintext:this-is-not-a-registry-reference"` | `.../invalid-*-pattern.json` → `"zz not matching pattern"` |
  | `ctr-mod-001/invalid-secret-handle-shape.json` → `["META_PAGE_TOKEN_UPPERCASE_NOT_A_HANDLE"]` (an env-var name pasted where a handle belongs) | as above |
  | `ctr-obs-001/invalid-user-content-metric-label.json` → injects `page_name` into `sli_tags` (the actual OB-006 cardinality/PII hazard) | `zz_undeclared: "x"` |
  | `ctr-sec-001/invalid-inline-credential-material.json` → injects `credential_material` | as above |
  | `ctr-usg-001/invalid-negative-cost.json` → `cost.amount: "-5.00"` | `"zz not matching pattern"` |
  | `ctr-aud-001` RFC-3339: real mistakes are a space for the `T`, a missing `Z`, a local offset | `occurred_at: "zz"` |

  A reader who opens `invalid-deep-link-ref-pattern.json` learns that the pattern
  rejects a string with spaces. They do not learn that the pattern exists to stop a
  **public URL** being shipped where an opaque reference belongs — which is what
  `ctr-api-001/invalid-public-status-ref.json`, written by hand, teaches in one line.

**So the honest answer to the question as posed: 29 % substantive, 71 % mechanical.**

But "mechanical" is not the same as "worthless", and the distinction matters for the
verdict. Each of the 312 is a *correct, verified, single-fault regression detector* —
Probe 1 below proves they are load-bearing. What they are not is *documentation*. They
occupy a constraint site and will fail if that rule is deleted; they teach a reader
nothing about why the rule is there.

### The sharper form of the Author's own suspicion

The suspicion should be restated more precisely than the Author put it. The problem is
not that the fixtures are fake — they are not. It is that **the generator was run over
exactly the set the metric scores, so the ratio now measures whether the generator ran.**
The evidence for that is a split the headline hides:

| Site class | Killed / total | Ratio |
|---|---|---|
| Plain leaf assertions | 493 / 555 | **88.8 %** |
| Inside a conditional (`allOf` / `if` / `then` / `not`) | 83 / 144 | **57.6 %** |

The conditional sites are the **business rules** — "a blocked module must not report
itself activated", "a temporary flag must carry an expiry and an owner", "a revoked
handle must not be resolvable". They lag the mechanical leaf assertions by **31
points**, and they are half of the 123 sites still unkilled (61 of 123). The generation
moved the easy half of the catalog a long way and the hard half comparatively little.

`82.4 %` is therefore a defensible number for *site occupancy*. It is not a measure of
how well the catalog's guarantees are understood, and it should not be quoted as one.

---

## 5. Naming and maintainability — clean today, and the collision risk is the *mechanism* of the coverage gap

**No fixture name lies.** For all **441 / 441** machine-named fixtures, the filename is
exactly the flattened schema path of the site it kills. Zero misnamed. Verified by
recomputing the name from the killed site and comparing.

**No collisions today.** Every `examples/` directory matches its `manifest.json`
fixture list exactly — **zero orphan files, zero missing files** across all 14
contracts. No case-insensitive collisions within any directory. Duplicate basenames
across different contract directories (e.g. eleven `invalid-additionalproperties.json`)
are harmless.

**But collisions are structurally possible and already binding.** The naming scheme
drops `properties`, `allOf`, `anyOf`, `items`, `if`, `then`, `not` and array indices.
I computed the would-be name for every constraint site in the catalog: **52 distinct
names each map to two or more different sites.** The worst cases:

- `ctr-flg-001/invalid-required.json` ← **14** distinct `required` sites
- `ctr-api-001/invalid-required.json` ← 10 · `ctr-pag-001/invalid-required.json` ← 10
- `ctr-idm-001/invalid-required.json` ← 8 · `ctr-ntf-001/invalid-required.json` ← 8
- `ctr-flg-001/invalid-decision-source-required.json` ← 6
- `ctr-flg-001/invalid-effect-const.json` ← 4 (four different `then` branches)
- `ctr-mod-001/invalid-capabilities-type.json` ← 2 (`capabilities.type` and
  `capabilities.items.type` — two genuinely different rules, one name)

The generator evidently handled this by **skipping** sites whose name was taken or
ambiguous, rather than by emitting a wrong file. That is the right failure mode, and it
is why nothing is misnamed. It is also **exactly why conditional coverage sits at
57.6 %**: the conditional-branch sites are the ones the naming scheme cannot address.
The collision risk is not cosmetic — it is the ceiling on the metric.

One pre-existing name is loosely wrong and will collide: **`ctr-idm-001/invalid-payload-hash-format.json`
kills `properties.payload_hash.pattern`** — there is no `format` keyword at that path.
It occupies the exact filename the generator would need if a `format` constraint were
ever added there.

Recommendation: give the generator a disambiguating suffix for conditional branches
(e.g. `-allof2-then`) before the next generation run, or the unkilled 61 stay unkillable.

---

## 3. Did generating them change what the catalog asserts?

**Stated limitation first, plainly:** the frozen root contains **no git history**, and I
am barred from reading the source repository. I could **not** perform a literal
before/after diff of the valid fixtures and schemas. Sibling scratch directories exist
under the shared scratchpad but their provenance is unverifiable and they are other
runs' working copies; using them would have produced a confident answer with no basis,
so I did not. **This sub-question is answered by invariant, not by diff, and that is
weaker.** It is carried into the verdict as a condition.

What I did verify independently:

1. **No positive case was broken.** All **44** valid fixtures validate clean against
   their own shipped schema. Zero fixtures named `valid*` are rejected; zero fixtures
   named `invalid-*` are accepted. (Both directions, my own validator run, and the
   shipped conformance suite.)
2. **No named rule went missing.** The 26-entry `PROTECTED` list in
   `schema-mutation-coverage.test.mjs` asserts each named schema path still *exists*
   (`assert.ok(mutated, '...the protected-site list is stale')`) and is still killed.
   All 26 pass across 8 contracts — including the `secret_handles` credential pattern,
   the six SEC-001 redaction consts, the AUD-001 action categories and the NTF-001
   deep-link obligations.
3. **Nothing moved with the fixtures.** Every `manifest.json` fixture list matches its
   `examples/` directory byte-for-byte in membership. `index.json` unchanged, 4/10, all
   `1.0.0`.
4. **The generation was complementary, not displacing** — this is the strongest
   evidence available without a diff. Of 522 killed sites, only **9** have more than one
   killing fixture, and only **3** of those pair a generated fixture with a hand-written
   one. **81 sites remain covered solely by a hand-written, semantically-named
   fixture.** The generator skipped every site an existing witness already covered:
   `ctr-sec-001` has no `invalid-additionalproperties.json` and no
   `invalid-handle-pattern.json`, because `invalid-inline-credential-material.json` and
   `invalid-handle-not-an-opaque-reference.json` were already killing those sites. The
   substantive hand-written witnesses were **not** overwritten by sentinel versions of
   themselves.

Note for completeness: `contract-catalog/` is **not** covered by
`test-kits/integrity-manifest.json` (28 protected files, none under `contract-catalog/`).
Schema and fixture edits are therefore not tripwired. That appears deliberate — the
catalog is actively authored — but it means points 1–4 above are the only anchor.

---

## 4. Is the 70 % floor honest? — **It bites in three directions and is still gameable in a fourth**

Every probe below is `npm run check` in a fresh copy of the frozen root.

| # | Probe | Exit | Result |
|---|---|---|---|
| **1** | Delete **one** constraint killed only by a *generated* fixture (`ctr-idm-001` `properties.created_at.type`) | **1** | `pass 117 / fail 2` — `ctr-idm-001/examples/invalid-created-at-type.json is named invalid but its schema accepts it` |
| **2** | Delete **six real but untested** constraints from the weakest contract | **0** | `pass 119 / fail 0` — **and the score went UP** |
| **3a** | Add **six zero-constraint properties** (`{}`) to `ctr-mod-001` | **0** | `pass 119 / fail 0`, score **unchanged** 72.4 % → 72.4 % |
| **3b** | Add **six typed properties** (`{"type":"string"}`) | **1** | `pass 118 / fail 1`, score **drops** 72.4 % → 67.7 %, floor fires |
| **5** | Delete generated fixtures from `ctr-mod-001`: **2** removed | **0** | still green |
| **5** | … **3** removed | **1** | `ctr-mod-001 — 60/87 (69.0 %), below the 70% floor` |
| **5** | … 5 removed → 66.7 %; 8 removed → 63.2 % | **1** | floor fires each time |
| **6a** | New contract dir with a real `schema.json` and **no `manifest.json`** | **0** | `pass 119 / fail 0` — **silently exempt** |
| **6b** | Same contract **with** a manifest and only a valid fixture | **1** | `ctr-zzz-001 — 0/10 (0.0 %), below the 70% floor` |

### Would a real regression fail it? Yes.

Probe 1 settles the central question. Deleting a single constraint whose *only* witness
is a machine-generated fixture fails the suite immediately. **The generated fixtures are
load-bearing, not decoration.** Probe 5 shows the floor itself catches what nothing else
does — quietly dropping three fixtures from the weakest contract's manifest passes
conformance and fails the floor. Probe 6b shows a contract added tomorrow with no
negative fixtures scores 0 % and fails, so the "list you must remember to extend"
defect the Author was correcting is genuinely closed.

**Headroom is tight, not generous.** The floor is not set where nothing can reach it:

| Contract | Kills it can lose before failing |
|---|---|
| ctr-pag-001 | **1** |
| ctr-mod-001, ctr-flg-001, ctr-ntf-001 | 2 |
| ctr-api-001 | 3 |

The Author's claim of "roughly two sites of headroom on the weakest" is accurate, and
`ctr-pag-001` is tighter than the Author noticed — one kill.

### Where it is still gameable — Probe 2, reproduced in full

I deleted six constraints from `ctr-mod-001`, chosen only because **no fixture tests
them**. Every one is a real guarantee:

- `capabilities.uniqueItems`, `dependencies.uniqueItems`, `permissions.uniqueItems`,
  `secret_handles.uniqueItems` — no duplicate capability, dependency, permission or
  secret handle
- `allOf.2.then.data_policy.tenant_scoped.const` — the tenant-scoping guarantee for a
  permissioned module
- `allOf.1.then.lifecycle.readiness.activated.const` — a blocked module must not report
  itself activated

Result:

```
ctr-mod-001   BEFORE  63/87  72.4%      AFTER  63/81  77.8%
catalog       BEFORE  82.4%             AFTER  83.1%
npm run check EXIT 0 — tests 119 / pass 119 / fail 0
```

**Six real rules deleted from the catalog's weakest contract, the score rises 5.4
points, the catalog rises, and CI is green.** This is the same class of defect
independent review found in the previous metric — *a rule nothing tests is a rule you
are rewarded for deleting* — surviving the correction. It is harder to reach than before
(you must now delete an assertion keyword, not a bare property name; the previous
version was gamed by deleting six sites for +6.9 points on `ctr-ten-001`) and Probe 3a
confirms the **opposite** direction is properly closed: adding zero-constraint
properties no longer moves the number at all, and adding real ones correctly *lowers*
it. But the denominator remains under the author's control.

To be fair to the correction: the metric is now gameable in **one** direction rather
than two, and the remaining direction requires deleting real rules from a shipped
schema, which a reviewer reading the diff would see. That is a materially better
position. It is not a closed one, and it should not be described as one.

### Exemption hole — Probe 6a

`fixturesOf` is called inside `try { … } catch { continue }`. A contract directory
shipping a real `schema.json` with **no `manifest.json`** is silently skipped by both
the mutation floor and (via the same swallow in the conformance suite) conformance —
`npm run check` exit 0, 119/119, with ten unmeasured constraint sites in the tree. This
is a pre-existing hole in WP-0A-CON-003's guard, not something the generation
introduced, but it is the cheapest way to put a schema entirely outside the floor and it
should be closed alongside it.

---

## Also: WP-0A-A0-004 — both sandbox claims verified

| Sandbox | `npm run check` | `node scripts/verify-test-coverage-floor.mjs` |
|---|---|---|
| `scripts.check` with a trailing `&` | **exit 0** | **exit 81** |
| every `&&` replaced by `\|\|` | **exit 0** (zero test summaries emitted — no test ran) | **exit 81** |

Guard message in both cases:
`check must be a plain && chain: '&' / '||' would let a step be skipped, backgrounded,
or commented out while this guard still saw the text.`

Both claims reproduce exactly. `npm run check` can be neutered by its own
`scripts.check` string while the guard, invoked directly, refuses.

**Would the step as written actually run and fail in a real GitHub Actions job? Yes.**

```yaml
- name: Verify test-integrity guard
  run: node scripts/verify-test-coverage-floor.mjs
- name: Validate repository bootstrap
  run: npm run check
```

- It is its **own** step, invoked by the workflow, so no `package.json` edit can skip it.
- It is placed **before** `npm run check`, so a short-circuited chain cannot bypass it
  and a failure is attributed to the guard.
- GitHub Actions runs `run:` on Linux under `bash -e {0}`; a non-zero exit fails the
  step and the job. Exit 81 in both sandboxes therefore fails the job.
- The guard resolves `package.json` and `test-kits/integrity-manifest.json` relative to
  the workspace root, which is the Actions default working directory. No path issue.
- `.github/workflows/ci.yml` is digested in the integrity manifest and its digest
  currently **matches**, so the step cannot be silently removed without a manifest edit.

Two caveats to carry, neither of which contradicts the claim: the manifest is
self-updating by anyone editing both files (declared by the Author as a tripwire, not a
boundary), and the workflow only constrains merges if branch protection makes it a
required status check — which remains an open Gate G0 item recorded elsewhere.

Note: `WP-0A-A0-004.json` is still `status: backlog`, while the ci.yml step and
`architecture/decisions/RFC-2026-007-ci-independent-guard-step.md` are already present
in the tree at this head. That is a package-state observation for the Integration Owner,
not a test failure.

---

## Summary of findings

**Sustained (the technique holds):**

1. 82.4 % independently reproduced; the reported figure is not inflated.
2. **Zero** of 537 invalid fixtures are double-faulted; 531 kill exactly one site each.
   The defect that broke the previous round is absent.
3. **441 / 441** generated filenames name exactly the constraint they kill. Nothing is
   misnamed; no orphan or missing fixtures anywhere in the catalog.
4. All 44 valid fixtures still pass; all 26 protected sites still exist and are still
   killed; `index.json` untouched at 4 Candidate / 10 Draft.
5. The generation was complementary — 81 sites remain covered solely by hand-written
   witnesses and only 3 overlap; no substantive fixture was displaced.
6. The floor bites: a deleted constraint fails (Probe 1), three deleted fixtures fail
   (Probe 5), added rules fail (Probe 3b), a new contract with no negatives fails
   (Probe 6b). Headroom is 1–3 kills on the weakest five contracts.

**Conditions (must be recorded, not resolved here):**

- **C1 — the metric is still gameable in the delete direction.** Probe 2: six real
  untested rules deleted from the weakest contract, 72.4 % → 77.8 %, catalog
  82.4 % → 83.1 %, `npm run check` exit 0 / 119 green. The floor must not be described
  as no longer gameable.
- **C2 — 71 % of the generated fixtures are mechanical.** They are correct and
  load-bearing but carry sentinel values (`zz_not_in_enum`, `"zz not matching pattern"`,
  `"zz"`, `12345`, `zz_undeclared: "x"`) that document no hazard. `82.4 %` measures site
  occupancy, not comprehension. The headline should be qualified wherever it appears,
  in the same way the "14 of 14 complete" headline already is.
- **C3 — the conditional rules lag by 31 points** (57.6 % vs 88.8 %), and the naming
  scheme's 52 name collisions are the reason. The business rules are the under-covered
  half. Fix the generator naming before the next run or the 61 unkilled conditional
  sites stay unkillable.
- **C4 — a contract with a `schema.json` and no `manifest.json` is silently exempt**
  from both the floor and conformance (Probe 6a). Pre-existing in CON-003's guard.
- **C5 — no before/after diff was possible.** The frozen root has no git history and the
  source repository is out of bounds. Sub-question 3 is answered by invariant only. An
  Integration Owner with the real history should confirm that no `valid-*` fixture and
  no schema rule changed in the generating commit.

---

## Commands run, with real exit codes

| Command | Exit |
|---|---|
| `npm run check` (frozen head) | 0 |
| independent metric recomputation over all 14 contracts | 0 |
| per-fixture single-fault analysis over all 581 fixtures | 0 |
| `npm run check` — probe1, one killed constraint deleted | **1** |
| `npm run check` — probe2, six untested constraints deleted | 0 |
| `npm run check` — probe3, six empty properties added | 0 |
| `npm run check` — probe4, six typed properties added | **1** |
| `npm run check` — probe5, 2 fixtures removed | 0 |
| `npm run check` — probe5, 3 / 5 / 8 fixtures removed | **1** / **1** / **1** |
| `npm run check` — probe6a, schema without manifest | 0 |
| `npm run check` — probe6b, contract with no negatives | **1** |
| `npm run check` — ci-a, trailing `&` | 0 |
| `node scripts/verify-test-coverage-floor.mjs` — ci-a | **81** |
| `npm run check` — ci-b, `&&` → `\|\|` | 0 |
| `node scripts/verify-test-coverage-floor.mjs` — ci-b | **81** |

---

The Author's suspicion was that generating 397 fixtures to satisfy a metric is the same
move as the one just caught. It is not the same move: the fixtures are real, verified,
single-fault, correctly named, and they fail when the rules they defend are removed.
But the suspicion is not baseless either. The generator was run over exactly the set the
metric scores, so the number now largely reports that the generator ran; the coverage it
bought is concentrated in the mechanical half of the catalog; and the underlying
denominator gaming that broke the previous metric survives the correction. The floor is
real and it bites. It is not yet ungameable, and it should not be reported as such.

VERDICT: test_verified_with_conditions
