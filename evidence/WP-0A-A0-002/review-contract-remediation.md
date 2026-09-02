# WP-0A-A0-002 — Independent Reviewer re-review of the remediation delta

Reviewer run: `/claude/c0_contract_reviewer` (Anthropic, `claude-opus-5`)
Role: independent Reviewer (contract/architecture), skill profile `architecture-contracts`
Author run under review: `/claude/a0_atlas` — a different run. This run authored no
part of the change under review, at either commit.
Branch: `agent/claude/WP-0A-A0-002-contract-test-coverage`
Delta reviewed: `1873ade..9403484` (head `9403484e5db0eed15df51efcca3ba9953042ef7f`)
Prior review: `evidence/WP-0A-A0-002/review-contract.md` (`approved_with_conditions`, findings R1–R7)
Date: 2026-08-31

**Scope of this document.** This is independent Reviewer evidence only. It is
**not** Security/Privacy review, **not** Tester verification, **not** Integration
Owner verification, **not** Product Owner disposition, **not** merge
authorization, and it does **not** approve or move Gate G0. Gate G0 remains
Specification Baseline Complete / External Verification Pending.

This run wrote only this file. It committed nothing and pushed nothing.
Every adversarial probe below was executed against a throwaway `git archive`
copy of `9403484` in a scratchpad directory, never against the working tree.
`git status --short` is empty apart from this file.

---

## 1. Toolchain

| Command | Exit | Observed |
|---|---|---|
| `zsh -lc 'node --version'` | `0` | `v24.20.0` |
| `zsh -lc 'npm --version'` | `0` | `11.19.0` |

`node` resolves to `/Users/bank/.local/node-v24.20.0/bin/node`. Matches the
RFC-2026-001 pin. All commands run through a login shell from
`/Users/bank/ThinkBizThai` unless a sandbox path is stated.

## 2. Declared commands, replayed at `9403484`

| Command | Exit | Observed |
|---|---|---|
| `npm run check` | `0` | `tests 40 / pass 40 / fail 0` |
| `node scripts/verify-test-coverage-floor.mjs` | `0` | no output |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-002.json` | `0` | no output |
| `node scripts/validate-work-packages.mjs` | `0` | no output |
| `node scripts/validate-capability-profiles.mjs` | `0` | no output |
| `node scripts/scan-repository-secrets.mjs` | `0` | no output |

Every exit code and count the Author reported in
`evidence/WP-0A-A0-002/author-remediation.md` §"Verification after remediation"
reproduces exactly. 32 → 40 confirmed. CI reaches the new guard:
`.github/workflows/ci.yml` runs `npm run check` on `ubuntu-24.04`, and
`verify:coverage-floor` is inside that chain.

## 3. Independent re-run of the necessity probe at the new head

Loaded the committed manifests, restored each removal one at a time, re-ran the
exported `validateManifestOwnership`, and re-ran the synthetic follow-on probe:

```
  PASS  baseline as committed at 9403484
  FAIL(70) restore package.json to A0-001 writable_paths -> WP-0A-A0-001 writable path overlaps WP-0A-A0-002 output: package.json
  FAIL(70) restore package.json to A0-001 outputs.files  -> WP-0A-A0-001 writable path overlaps WP-0A-A0-002 output: package.json
  PASS  restore contract-catalog/shared-kernel/** to CON-001 writable_paths
  PASS  restore test-kits/contracts/**            to CON-001 writable_paths
  PASS  restore fixtures/contracts/**             to CON-001 writable_paths
  WP-0A-A0-001: outputs=83 uncovered=0
  WP-0A-A0-002: outputs=18 uncovered=0
  WP-0A-A6-001: outputs=1  uncovered=0
  WP-0A-CON-001: outputs=32 uncovered=0
  PASS  synthetic CON-002 vs NARROWED CON-001 (post-change)
  FAIL(70) synthetic CON-002 vs OLD CON-001 globs (pre-change) -> WP-0A-CON-001 writable path overlaps WP-0A-CON-002-HYPOTHETICAL output: contract-catalog/shared-kernel/ctr-api-001/manifest.json
```

Every claim in the RFC's new necessity table reproduces. Output coverage remains
complete for all four packages after the remediation (`WP-0A-A0-002` grew from 7
to 18 declared outputs, all covered).

---

## 4. Disposition of findings R1–R7

| Finding | Disposition | Basis |
|---|---|---|
| **R1** — RFC D3 did not authorize the `fixtures/contracts/**` removal | **CLOSED** | Decision 3 now reads "Remove **three** writable globs — `contract-catalog/shared-kernel/**`, `test-kits/contracts/**`, and the unused `fixtures/contracts/**` (no `fixtures/` directory exists in the repository and no WP-0A-CON-001 output lives under it)". All three named; the third is explained rather than buried. The authority record now matches the change. |
| **R2** — forced vs anticipatory not distinguished | **CLOSED** | A necessity table was added under "Which amendments are forced and which are anticipatory". I checked its claims against reality myself (§3), not against the Author's summary: WP-0A-A0-001 `package.json` = forced (code `70`); all three CON-001 globs = anticipatory (repository validates with each restored); the synthetic follow-on probe reproduces. Both rows are accurate. One imprecision, non-blocking: the table's rationale ("bite only once a follow-on package declares outputs under those paths") is exactly true for two globs and vacuously true for `fixtures/contracts/**`, which can never bite because no `fixtures/` tree exists. Decision 3 states this separately, so the RFC as a whole is not misleading. |
| **R3** — amended manifests carried no trace | **CLOSED, with an unenforced-record caveat** | Both `work-packages/WP-0A-A0-001.json` and `work-packages/WP-0A-CON-001.json` now carry `ownership.amended_by`. **Right place** — inside `ownership`, immediately above the arrays that were changed, so a reader of the boundary sees the amendment before the boundary. **Accurate** — A0-001's text ("This package did author package.json; the removal is forced by ... which exits 70 while two packages hold the same path") and CON-001's text ("anticipatory, not corrective: the repository validates with the globs restored") both match my own probe results, and both correctly state that no status, role, gate, freeze level, or delivered output changed. **Pending acknowledgement correctly recorded** — `acknowledgement_required_from: "/root/r0_steward"` with `acknowledgement_status: "pending"` on both. Caveat carried forward as N-C1 below: `amended_by` is read by no script, test, or CI job, so nothing prevents `pending` surviving to merge. |
| **R4** — no coverage floor | **PARTIALLY CLOSED** | Real, not theatre — but overclaimed. Full analysis in §5. |
| **R5** — head SHA not recorded | **CLOSED** | `handoffs/WP-0A-A0-002-author-handoff.json` now records `"head_revision_or_patch_checksum": "1873ade"`, which is the commit that handoff actually describes, plus a `superseded_by` pointer to `author-remediation.md`. This is the correct treatment — backdating the handoff to `9403484` would have been worse. New minor gap N9: no handoff records head `9403484`. |
| **R6** — role assignments incomplete / package `backlog` | **CLOSED as to assignments; status correct in outcome, reasoning inverted** | All five roles now named. See §6. |
| **R7** — independent-role artifacts absent from `outputs.files` | **CLOSED** | `outputs.files` grew 7 → 18 and now declares the review, security, test, remediation, and integration artifacts. Three declared outputs do not yet exist — `.agents/capability-profiles/cc-r0-steward.json`, `evidence/WP-0A-A0-002/integration-verdict.md`, `handoffs/WP-0A-A0-002-integration-handoff.json`. The ownership validator does **not** check existence (verified: it reads only `writable_paths`, `read_only_paths`, and `outputs.files` shape/coverage, and exits `0`). Forward declaration of not-yet-produced role artifacts is the right call for a package that cannot reach `done` without them; they must exist before `done`. No finding. |

Mapping to my prior conditions C1–C8: **C1 (R1) closed**, **C2 (R5) closed**,
**C3 (R6) closed with the nuance in §6**, **C4 (R3) recorded, acknowledgement
still pending**, **C5 recorded, still pending**, **C6 (R2) closed**,
**C7 (R4) partially closed**, **C8 (R7) closed**.

---

## 5. R4 in detail — is the coverage floor a real closure or theatre?

**Ruling: a real and useful control, but narrower than the artifacts claim. It
closes the declared-pattern regression class. It does not close the runtime
silent-green class, which is the class R4 actually named.**

### What it genuinely closes (verified by injected regression, sandbox copy of `9403484`)

| Injected regression | Guard exit | Observed message |
|---|---|---|
| `test:bootstrap` reverted to `'test-kits/*.test.mjs'` | `76` | names `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` as the file that would never run |
| pattern left unquoted | `74` | `must invoke node --test with a single-quoted pattern` |
| pattern double-quoted instead of single-quoted | `74` | same |
| pattern matching nothing (`'no-such-dir/**/*.test.mjs'`) | `76` | lists all 9 discovered files as unmatched |
| `test-kits/` emptied (directory present, no test files) | `75` | `expected at least 8 test files under test-kits/, found 0` |
| suite confined to one directory | `77` | `expected test files in at least two directories` |
| corrected state restored | `0` | no output |

These are real. Row 1 in particular is the exact regression this package exists
to prevent, and it now fails the run instead of passing green.

### Does it run before `test:bootstrap`?

Yes. `"check": "... && npm run validate:protocol && npm run verify:coverage-floor && npm run test:bootstrap"`.
The `&&` chain short-circuits, so a guard failure prevents the test stage from
running at all, and CI executes the same chain.

### Is `globToRegExp` correct, and is the divergence from the ownership validator a problem?

**Correct, and the divergence is justified.** Measured side by side on
`test-kits/**/*.test.mjs`:

```
coverage-floor regex: ^test-kits\/(?:[^/]+\/)*[^/]*\.test\.mjs$
ownership      regex: ^test-kits\/.*\/[^/]*\.test\.mjs$

  test-kits/a.test.mjs                   coverage-floor=true   ownership=FALSE
  test-kits/contracts/b.test.mjs         coverage-floor=true   ownership=true
  test-kits/contracts/deep/c.test.mjs    coverage-floor=true   ownership=true
  other-kits/a.test.mjs                  coverage-floor=false  ownership=false
  test-kits/a.mjs                        coverage-floor=false  ownership=false
```

The ownership validator compiles `**` to `.*` unconditionally, so `dir/**/x`
requires **at least one** intervening directory. `node --test` demonstrably does
match root-level files — 26 of the 40 tests come from `test-kits/*.test.mjs`.
Reusing the ownership implementation here would therefore have produced eight
spurious code-`76` failures against a correct repository. The new
`**/` → `(?:[^/]+/)*` form (zero or more segments) is the faithful one. The
divergence is a deliberate correctness fix, not carelessness, and the boundary
cases are covered by the new test at `test-kits/test-coverage-floor.test.mjs:59`.
Non-blocking maintenance note: the repository now carries two glob engines with
different `**` semantics and no cross-reference between them. A shared module,
or at minimum a comment in each pointing at the other, would prevent a future
author "harmonising" them in the wrong direction.

### Does it parse the same string npm executes?

Yes for the pattern itself: it reads `scripts["test:bootstrap"]` from
`package.json`, which is verbatim what `npm run test:bootstrap` executes. But see
N2 — it never checks that `check` still *invokes* `test:bootstrap`.

### Can the floor of 8 be gamed, and can the guard pass while fewer tests run?

Yes, on both counts. Three demonstrated paths:

**N1 — the quote-stripping path is NOT closed, and is claimed to be.** The
script's own header comment states: *"a rename, relocation, or a shell that does
not strip the quotes would report success having run no test at all. This guard
fails the run instead."* The RFC repeats it, naming Windows `cmd.exe` as "the
obvious case", and concludes "Decision 4 closes it." Measured:

```
guard reading package.json (quoted pattern intact)      -> EXIT=0, no output
node --test "'test-kits/**/*.test.mjs'"  (quotes survive) -> EXIT=0, tests 0 / pass 0 / fail 0
```

The guard inspects the *declared* string, which is well-formed in exactly that
scenario; it never observes what the runner did. So in the one failure mode R4
specifically named, the guard passes and the runner executes nothing. This is
the residual risk, unchanged, now covered by an artifact asserting it is closed.
The control is still worth having — but a decision record going to Product Owner
disposition must not overstate it.

**N2 — the guard validates `test:bootstrap` but never that `check` invokes it.**
Deleting six characters' worth of chain from the `check` script:

```
"check": "... && npm run validate:protocol && npm run verify:coverage-floor"   # test:bootstrap dropped
npm run check -> EXIT=0, no test summary printed at all (ZERO tests executed)
```

The `test:bootstrap` string is untouched and well-formed, so the guard exits `0`
and `npm run check` is green having run no test. This is the same silent-green
class, reachable by editing the *same line of the same file* this package
already edits, and the remediation did not consider it. A one-line assertion
that `scripts.check` contains `test:bootstrap` would close it.

**N4 — the floor counts files, not tests.** `discoverTestFiles` counts anything
ending `.test.mjs`; nothing inspects contents or the executed-test count.
Replacing all nine test bodies with `// stub`:

```
guard          -> EXIT=0, no output
npm run check  -> EXIT=0, tests 9 / pass 9 / fail 0
```

The 40-test count is protected only by a hardcoded sentence in
`acceptance_criteria` and in the RFC — documents, not gates. A future change that
hollows out the suite passes.

**N5 —** `DEFAULT_FLOOR = 8` against 9 files on disk, so one real test file can
be deleted with the guard silent. The new test itself asserts
`discovered.length >= 9` (line 28), one higher than the guard it is testing.

**Overall R4 ruling: PARTIALLY CLOSED.** Materially better than `1873ade` and I
am not asking for it to be redone. But the claim in the script comment, in RFC
"Why the glob fix alone is not sufficient", and in `author-remediation.md` that
the silent-green class is *closed* is not supported. The accurate statement is
that the **declared-pattern** regression class is closed and the **runtime**
silent-green class remains open.

---

## 6. R6 in detail — role assignments and the `backlog` status

All five runs are now named: author `/claude/a0_atlas`, reviewer
`/claude/c0_contract_reviewer`, tester `/claude/q0_sentinel`, security
`/claude/a1_bastion`, integration owner `/claude/r0_steward`
(`product_reviewer_agent_run_id` remains `null`). Four are distinct and each has
a capability declaration. I confirm `.agents/capability-profiles/cc-c0-contract-reviewer.json`
is my own declaration, unaltered, correctly scoped to review-only authority. The
Author writing the Reviewer's run id into `role_assignments` is what my prior
condition C3 asked for and is correct — a Reviewer must not write its own name
into that field.

**But `/claude/r0_steward` has no capability declaration at all.**
`.agents/capability-profiles/` contains `r0-steward.json` (the OpenAI Codex run)
but no `cc-r0-steward.json`. So the manifest names an integration owner that has
never declared itself and has produced nothing.

**Is `backlog` appropriate? Yes in outcome. The Author's stated reasoning is
inverted.** The Author writes: *"Status deliberately remains `backlog`:
`/claude/r0_steward` has not yet recorded its own capability declaration, and the
capability validator must not be satisfied by a declaration the Author wrote on
an independent run's behalf."* Read
`scripts/validate-capability-profiles.mjs:88`:

```js
export function validateManifestCapabilityReferences(manifest, profiles) {
  if (!readyOrLater.has(manifest.status)) return;
```

At `backlog` the cross-check is **skipped entirely**. It is not being protected
from a false pass; it is not running. Measured by mutating only `status` in a
sandbox copy:

| status | `validate-capability-profiles.mjs` | Output |
|---|---|---|
| `backlog` | exit `0` | none |
| `ready` | exit **`68`** | `WP-0A-A0-002 references role runs without capability declarations: /claude/r0_steward` |
| `in_review` | exit **`68`** | same |

So the correct statement — and the reassuring one — is that the package is
**hard-blocked by the validator** from leaving `backlog` until
`/claude/r0_steward` declares. The conclusion is right and now machine-enforced;
the justification given in the evidence is not what the code does, and an
Integration Owner relying on that sentence would draw the wrong inference about
what `backlog` is protecting. Recorded as N6 (documentation accuracy), not a
defect in the manifest.

---

## 7. Ruling on item 1 — my ruling conditions (a), (b), (c)

| Condition | Disposition | Basis |
|---|---|---|
| **(a)** RFC-2026-003 must reach an approved Product Owner disposition before merge | **STILL OPEN — correctly recorded, not dropped** | RFC header still reads `Status: Proposed — awaiting independent review, test, integration, and Product Owner disposition`. `open_blockers[0]` was *strengthened*, not weakened: it now adds "Until approved it does not hold rank-1 authority, so the cross-package amendments are staged, not authorized" — my §8 reasoning, restated in the manifest. `required_human_authorities` unchanged. Nothing quietly dropped. |
| **(b)** RFC Decision 3 corrected to name every removed glob (R1) and to distinguish forced from anticipatory (R2) | **SATISFIED** | Both halves. Decision 3 names all three globs; the necessity table draws the distinction and every one of its claims reproduces against my own probe (§3). |
| **(c)** Amendment acknowledgement recorded against each amended package, countersigned by `/root/r0_steward` | **STILL OPEN — correctly recorded, not dropped** | The *record* is now in place in both manifests (`ownership.amended_by`), the *countersignature* is not. `acknowledgement_status: "pending"` on both, and `open_blockers[1]` states the reason (an OpenAI Codex run, unavailable this session) and names the dependency. Correctly surfaced as a blocker rather than being closed by the Author on the Steward's behalf — which would have been the failure mode to watch for, and did not happen. |

Both open conditions are recorded as blockers with accurate reasons. Neither was
softened or silently satisfied. This is the right handling.

## 8. Ruling on item 2 — has the D1 correction over-corrected?

**Ruling: no. The new D1 is accurate and does not understate the defect.**

The forward-looking risk statement survives intact and unhedged: *"A regression
in the shared-kernel contract catalog would therefore pass CI and pass every
`npm run check` citation in the WP-0A-CON-001 review, test, and integration
evidence."* The measured table (26 / 6 / 32) is unchanged. What was added is the
retrospective bound — that all four independent roles separately ran
`node --test test-kits/contracts/*.test.mjs` at `f28fb8e` and recorded 6/6, so
the gap was in the CI gate rather than in role coverage. That is precisely the
finding of my §8 item-6 ruling, derived from the WP-0A-CON-001 evidence files,
and it is stated without inflating it into "there was no defect". The section is
immediately followed by "Why the glob fix alone is not sufficient", which
*sharpens* the residual risk rather than softening it. The defect is not
understated.

One minor over-reach, non-blocking: D1 now concludes flatly *"No re-review,
re-test, or re-integration of WP-0A-CON-001 is required."* My ruling §9(5)
recorded that as the Reviewer's recommendation and explicitly preserved the
Integration Owner's freedom to require more. Presenting it as a settled RFC
decision removes a discretion I deliberately left open. Since the RFC is
`Proposed` and goes to the Product Owner with the Integration Owner in the loop,
this is a wording matter, not a control failure. Recorded as N7.

The change from a hardcoded "32" to "the current count" in the addendum
instruction is an improvement over my own C5 wording and I adopt it.

## 9. Ruling on item 3 — the unrequested `independence.cross_vendor_exception`

I read `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md`
§9.3.1 and the §9.3.3 routing matrix directly.

**What the register actually says.** Cross-vendor review is directed *for
critical code* — the enumerated classes are Tenant/RLS, secrets, billing ledger,
publish idempotency, migrations that touch data, and restore/delete flows — "when
an agent whose skill meets the bar exists", with the stated purpose being
implementation diversity rather than vendor ranking. The fallback clause is:
if there is no cross-vendor capacity, use an independent agent per separate run
and record the exception. The §9.3.3 matrix row for "Shared contract/API/event/job"
marks cross-vendor "Required when breaking/critical". §9.3.1 also permits
documentation/spike work that does not touch production code to combine Reviewer
and Tester when A0 records the reason — a *looser* bar than what was applied here.

**Ruling: the exception is correctly characterised as unsatisfied and not
waived, recording it is sufficient, and single-vendor staffing must NOT block
this package.**

1. **Correctly characterised, in the safe direction.** The manifest text states
   plainly that `prefer_cross_vendor_review` is **not** satisfied, names the
   fallback clause it is relying on, states the mitigation (five separate runs,
   each with its own declaration, none reviewing its own work — which I verify
   holds), and says explicitly that it "is not waived and it is not equivalent to
   cross-vendor review". That is honest and it does not dress a fallback up as
   compliance.
2. **It slightly over-declares, which is the right way to err.** The manifest
   says the register "permits this only as an explicit exception", implying
   cross-vendor was *required* here. On the register's own scoping it was not:
   WP-0A-A0-002 changes one `package.json` script line, adds a guard script and
   its tests, amends two ownership declarations, and writes an RFC and evidence.
   It touches no tenant data, no secret, no ledger, no migration, no
   delete/restore flow, and — verified — no contract (`contract-catalog/` is
   byte-identical since `f28fb8e`). It is neither breaking nor critical under the
   matrix. So the exception is recorded against a requirement that does not bind
   this package. Harmless, arguably good hygiene, but the Integration Owner
   should not carry it forward as if a binding rule were being excepted.
3. **Recording is sufficient; blocking would be wrong.** The register's own
   fallback is satisfied in full — independent agent, separate run, exception
   recorded. Blocking a reversible, synthetic-only tooling package on
   single-vendor staffing would be stricter than the baseline requires for
   *critical* code, and would apply to work the baseline does not even class as
   critical.
4. **One caveat to carry forward, unchanged by the recording.** Five runs of the
   same vendor *and the same model* (`claude-opus-5`) share a correlated blind
   spot: a systematic error in that model is invisible to all five, and the
   register's stated purpose for cross-vendor review — implementation diversity —
   is exactly what is missing. The exception documents that; it does not reduce
   it. This is the right thing for the Integration Owner and Product Owner to
   weigh, and it is a real argument for cross-vendor staffing on the first
   package that *does* reach the critical classes.

---

## 10. New findings introduced by, or surfaced in, the remediation

| ID | Severity | Finding |
|---|---|---|
| **N1** | **Blocking (record)** | The coverage floor does **not** close the quote-stripping / runtime-expansion path, yet `scripts/verify-test-coverage-floor.mjs:5-8`, RFC "Why the glob fix alone is not sufficient" ("Decision 4 closes it"), and `author-remediation.md` all assert it does. Demonstrated in §5: guard exit `0` while `node --test` runs `tests 0`. The RFC is the artifact going to Product Owner disposition and must not overstate the control. |
| **N2** | **Blocking (record)** | The guard validates the `test:bootstrap` string but never that `scripts.check` still invokes it. Removing `&& npm run test:bootstrap` yields `npm run check` exit `0` with zero tests executed and the guard silent (§5). Same silent-green class, same file, same line. A one-line assertion that `scripts.check` references `test:bootstrap` closes it. |
| **N3** | Condition | Unhandled-error path in the guard's CLI wrapper. `process.exit(error.code ?? 65)` assumes a numeric code, but Node errno errors carry a **string** `.code`. With `test-kits/` renamed or moved: `ENOENT: no such file or directory, scandir 'test-kits'` then `TypeError [ERR_INVALID_ARG_TYPE]: The "code" argument must be of type number. Received type string ('ENOENT')`, exit **`1`**. It fails closed, so this is not a security hole — but the RFC's verification table and `author-remediation.md` both claim exit **`75`** for "`test-kits/` emptied or **moved**". *Emptied* does give `75` (verified). *Moved* gives `1` and a Node internal stack trace. A reviewer replaying the RFC's own evidence table gets a different answer than the RFC states. Fix the handler (`Number.isInteger(error.code) ? error.code : 65`) and correct both tables. |
| **N4** | Condition | The floor counts **files**, not tests. Nine stub files pass the guard and produce a green `npm run check` reporting `tests 9`. The 40-test count is asserted only in prose. |
| **N5** | Minor | `DEFAULT_FLOOR = 8` against 9 files on disk: one real test file can be deleted with the guard silent. The new test asserts `>= 9`, one above the guard it tests. |
| **N6** | Minor | `author-remediation.md`'s justification for keeping `backlog` describes a protection the validator does not provide at `backlog` (it early-returns). The conclusion is right and is enforced at `ready` by exit `68`; the reasoning as written is inverted. See §6. |
| **N7** | Minor | RFC D1 now states "No re-review, re-test, or re-integration of WP-0A-CON-001 is required" as a settled decision, removing the Integration Owner discretion my §9(5) ruling explicitly preserved. See §8. |
| **N8** | Minor | `WP-0A-A0-002.ownership.read_only_paths` lost `"scripts/**"` and `"test-kits/**"` entirely. Dropping the *exact* new output paths was forced (rule 69 rejects an output matching `read_only_paths`), but wholesale removal of both globs was not the only expressible option — narrower enumerated entries would have preserved the tripwire for a future undeclared output under `scripts/` or `test-kits/`. Enforcement loss is small (`read_only_paths` is only consulted to reject `outputs.files` entries, never to block writes), so this is a weakened declaration rather than a weakened gate. |
| **N9** | Minor | No handoff records head `9403484`. The author handoff correctly stays pinned to `1873ade` with a `superseded_by` pointer, and `author-remediation.md` is prose — so there is no machine-readable artifact carrying the current head. RFC-2026-002 requires the head SHA before merge. |
| **N10** | Minor | `work-packages/WP-0A-A0-002.json` and `handoffs/WP-0A-A0-002-author-handoff.json` were machine-reformatted (compact arrays expanded to one-element-per-line; em-dashes rewritten as `—` escapes). JSON-equivalent, but it inflates the diff on a security-relevant manifest and makes the substantive changes harder to isolate — the opposite of the minimal-diff discipline I credited at `1873ade`. Good discipline that the two **cross-package** manifests were *not* reformatted: those diffs are exactly one added block each. |
| **N11** | Trivial | `.agents/capability-profiles/cc-q0-sentinel.json` carries no `limitations.role_scope`, while `cc-a1-bastion.json` and `cc-c0-contract-reviewer.json` both do. Not that run's Reviewer's business to fix; noted for consistency. |
| **N12** | Trivial | `acceptance_criteria[0]` and the RFC Verification section hardcode "40 passing tests". Any legitimately added test now falsifies a stated acceptance criterion. A floor ("at least 40") would be more durable. |

### Process observation, not a defect finding

Commit `9403484` is authored by `/claude/a0_atlas` and introduces the
independent runs' own artifacts into history — `review-contract.md`,
`review-security.md`, `test-verdict.md`, and three `cc-*.json` declarations.
I confirm my own two artifacts are intact and unaltered: my capability
declaration is correctly scoped to review-only authority, and `review-contract.md`
is my text, including its `VERDICT: approved_with_conditions`. So no
misrepresentation occurred here. But independent-role evidence entering git
history through the Author's commit is a structural weakness in the separation
of duties: nothing in the repository would have detected an edit. Worth the
Integration Owner establishing that each role commits its own evidence, or that
the Integration Owner does.

### Confirmed unchanged by the remediation

- `git diff 1873ade 9403484 -- contract-catalog/ .github/ package-lock.json`
  is empty. No contract, freeze level, CI workflow, or lockfile movement.
- No package status changed (`WP-0A-A0-001` and `WP-0A-CON-001` remain
  `integration_verified`; `WP-0A-A0-002` remains `backlog`).
- The cross-package amendments remain confined to `ownership` — the only
  addition to each is the `amended_by` block. No `outputs.files`,
  `acceptance_criteria`, `role_assignments`, `deterministic_commands`, or
  status change in either amended manifest.
- Security condition C2 is closed: `.agents/capability-profiles/cc-*.json`
  wildcard write is gone from `WP-0A-A0-002.ownership.writable_paths`, replaced
  with five exact paths (verified: zero occurrences of `cc-*.json`).
- No dependency, network call, provider SDK, credential, schema, or migration
  is introduced. The change remains reversible and synthetic-only.
- Gate G0 is not moved by this commit and is not moved by this document.

---

## 11. Conditions

Blocking before Product Owner disposition / merge:

- **RC1 (N1)** — Correct the overclaim. `scripts/verify-test-coverage-floor.mjs`
  header comment, RFC "Why the glob fix alone is not sufficient", and
  `author-remediation.md` must state that the guard closes the **declared-pattern**
  regression class and that the **runtime** silent-green path (a shell that does
  not strip the quotes) remains open and mitigated only by `/bin/sh` being the
  npm script shell on the supported platforms.
- **RC2 (N2)** — Either assert in the guard that `scripts.check` invokes
  `test:bootstrap`, or record the bypass as a known limitation. As it stands the
  guard can be defeated by an edit to the line beside it.
- **RC3 (N3)** — Fix `process.exit(error.code ?? 65)` for non-numeric error
  codes, and correct the "moved" row in the RFC and remediation tables: the
  observed result is exit `1` with an uncaught `TypeError`, not exit `75`.
- **RC4 (a, carried)** — Product Owner disposition of RFC-2026-003. Still open,
  correctly recorded.
- **RC5 (c, carried)** — `/root/r0_steward` countersignature on both
  `ownership.amended_by` blocks. Still open, correctly recorded.
- **RC6 (carried)** — WP-0A-CON-001 `npm run check` re-execution addendum by
  `/root/r0_steward`. Still open, correctly recorded.

Non-blocking for this commit, required before WP-0A-A0-002 reaches `done`:

- **RC7 (N4, N5)** — Give the floor something that tracks executed tests rather
  than file count, or record explicitly that it does not.
- **RC8 (N6, N7)** — Correct the `backlog` justification in
  `author-remediation.md`; restore the Integration Owner's discretion in RFC D1.
- **RC9 (N8)** — Reconsider whether `scripts/**` and `test-kits/**` can be
  partially restored to `read_only_paths`.
- **RC10 (N9)** — Record head `9403484` in a machine-readable handoff before merge.
- **RC11 (N10, N12)** — Avoid wholesale reformatting of manifests; prefer a
  floor to a hardcoded test count.
- **RC12 (maintenance)** — Cross-reference the two divergent `globToRegExp`
  implementations, or factor them into one module with the corrected `**/`
  semantics.

---

## 11a. Working-tree state — a concurrent modification outside the reviewed delta

Disclosure. On completing this review, `git status --short` showed:

```
 M scripts/verify-test-coverage-floor.mjs                    <- not mine
 M test-kits/test-coverage-floor.test.mjs                    <- not mine
?? evidence/WP-0A-A0-002/review-contract-remediation.md      <- this file, mine
?? evidence/WP-0A-A0-002/test-verdict-remediation.md         <- not mine
```

The tree was moving while I wrote this: `scripts/verify-test-coverage-floor.mjs`
appeared modified first, and `test-kits/test-coverage-floor.test.mjs` followed
before I finished. Both were modified by a concurrent run while this review was in
progress. **Neither is my change** — every
probe in this document ran against throwaway `git archive` copies of `9403484` in
a scratchpad directory, never against the working tree — and I have not reverted
it, since my instruction is to write one file and touch nothing else.
`evidence/WP-0A-A0-002/test-verdict-remediation.md` is the concurrent Tester run
`/claude/q0_sentinel`. `HEAD` is still `9403484`; nothing was committed.

**Everything above this section reviews the committed delta `1873ade..9403484`,
which is what I was asked to review, and my verdict is on that delta.** The
uncommitted edit is outside it. Two observations for the Integration Owner:

1. **It independently corroborates three of my findings and sharpens a fourth.**
   Measured against the working-tree version: **N3 is fixed** — a relocated test
   root now returns `cannot read the test root 'test-kits' ... A relocated or
   deleted test root must fail the run` at exit `79`, and the handler is now
   `Number.isInteger(error.code) ? error.code : 65`. **N4/N5 are addressed** by a
   new `countDeclaredTests` / `assertDeclaredTests` pair (code `78`) that rejects
   a file declaring no test and enforces a 30-declared-test floor. The pattern
   extractor is pinned to `/^node --test '([^']+)'$/`, closing prefix/suffix
   bypasses (`: node --test '...'`, `... || true`) that are a sharper variant of
   my N2. It also fixes a `globToRegExp` bug I did not catch: `**` inside a
   segment (`test-kits/**.test.mjs`) was expanding to `.*` instead of `[^/]*`.
   My §5 assessment that the committed guard is narrower than claimed is
   corroborated, not contradicted, by that work.
2. **My N2 survives it.** Re-measured against the working-tree script: removing
   `&& npm run test:bootstrap` from `scripts.check` still yields `npm run check`
   exit `0` with zero tests executed and the guard silent. Condition RC2 stands.
   The working-tree script also still exits `0` against the real repository.

I make no ruling on the uncommitted change. It has not been committed, is not in
the delta I was assigned, and reviewing it is a separate pass. If it is committed,
it needs its own Reviewer disposition — and, given that it modifies an
implementation script rather than test evidence, the Integration Owner should
establish which run authored it and whether that run holds Author authority over
`scripts/`, which `WP-0A-A0-002.ownership.writable_paths` grants only for
`scripts/verify-test-coverage-floor.mjs`.

---

## 12. Verdict

The remediation is substantive and honest. R1, R2, R3, R5, R6, and R7 are
closed; R4 is materially advanced from "nothing exists" to a guard that is wired
into `npm run check` and CI, fails closed, and demonstrably catches the exact
regression that motivated the package. The two open conditions from my ruling —
(a) Product Owner disposition and (c) the `/root/r0_steward` countersignature —
were **not** quietly dropped or self-closed by the Author; both are recorded as
blockers with accurate reasons, which is the behaviour I was watching for and did
not find violated. The cross-package amendments remain minimal and the necessity
claims reproduce against my own independent probe.

My objections are that the new control is asserted to be broader than it is, in
a decision record going to Product Owner disposition (N1); that it has a
demonstrated bypass the remediation did not consider (N2); and that one exit
code tabulated as evidence does not reproduce (N3). None of these regresses the
repository — every one of them describes a state that was strictly worse before
`9403484` — so I am not asking for the change to be redone. I am asking for the
claims to be brought into line with the measurements.

This is independent Reviewer evidence only. It is **not** Security review, **not**
Tester verification, **not** Integration Owner verification, **not** Product
Owner disposition, **not** merge authorization, and **not** Gate G0 approval.
Gate G0 remains Specification Baseline Complete / External Verification Pending.

VERDICT: approved_with_conditions
