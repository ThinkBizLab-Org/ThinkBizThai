# WP-0A-A0-002 — Independent contract/architecture review

Reviewer run: `/claude/c0_contract_reviewer` (Anthropic, `claude-opus-5`)
Role: independent Reviewer (contract/architecture), skill profile `architecture-contracts`
Author run under review: `/claude/a0_atlas` — a different run; this run authored no part of the change.
Branch: `agent/claude/WP-0A-A0-002-contract-test-coverage`
Head commit reviewed: `1873ade0252608be870b6b617515b00d0ae405a2`
Base revision: `dcafcf8`
Date: 2026-08-31

**Scope of this document.** This is independent Reviewer evidence only. It is
**not** Security/Privacy review, **not** Tester verification, **not** Integration
Owner verification, **not** Product Owner disposition, **not** merge
authorization, and it does **not** approve or move Gate G0. Gate G0 remains
Specification Baseline Complete / External Verification Pending.

This run wrote only `.agents/capability-profiles/cc-c0-contract-reviewer.json`
and this file. It committed nothing and pushed nothing.

---

## 1. Toolchain

| Command | Exit | Observed output |
|---|---|---|
| `zsh -lc 'node --version'` | `0` | `v24.20.0` |
| `zsh -lc 'npm --version'` | `0` | `11.19.0` |

Matches the RFC-2026-001 pin. `node` resolves to
`/Users/bank/.local/node-v24.20.0/bin/node`. Every command below was run through
a login shell from `/Users/bank/ThinkBizThai`.

## 2. Defect reproduction (item 1) — CONFIRMED

| Command | Exit | Observed | Author claimed |
|---|---|---|---|
| `npm run check` (at `1873ade`) | `0` | `tests 32 / pass 32 / fail 0` | 32 |
| `node --test test-kits/*.test.mjs` (the OLD glob) | `0` | `tests 26 / pass 26 / fail 0` | 26 |
| `node --test 'test-kits/**/*.test.mjs'` (the NEW glob) | `0` | `tests 32 / pass 32 / fail 0` | 32 |
| `node --test test-kits/contracts/*.test.mjs` | `0` | `tests 6 / pass 6 / fail 0` | 6 |

26 + 6 = 32. The old glob genuinely missed `test-kits/contracts/`. The defect
claim in RFC-2026-003 D1 and in the author self-check reproduces exactly, with
the numbers the Author reported. `test:bootstrap` is the only stage of
`npm run check` that runs `node --test`, so the pre-change `npm run check`
count was 26.

I did **not** revert `package.json` in the working tree to produce the 26 count
(the task forbids editing other files); I executed the previous command form
directly, which is equivalent, and diffed it against the committed change:

```
-    "test:bootstrap": "node --test test-kits/*.test.mjs",
+    "test:bootstrap": "node --test 'test-kits/**/*.test.mjs'",
```

The six contract tests are substantive, not placeholders. Read from
`test-kits/contracts/shared-kernel-contract-catalog.test.mjs` (124 lines): they
assert baseline contract IDs / versions / freeze levels (14 contracts, 4
Candidate at `1.0.0`, 10 Draft), fixture traceability, acceptance of valid and
rejection of every declared negative fixture, required tenant/job isolation
metadata, and rejection of unsafe `details`/`payload` and public
(`https?://`) job `input_ref`. The Author's claim that the security effect is
positive is substantiated: these are tenant-isolation and unsafe-payload
negative cases that CI was not running.

## 3. Quoted-glob claim (item 2) — CONFIRMED, and the quoting is load-bearing

The Author's assumption was: "The quoted glob is expanded by the Node test
runner rather than the invoking shell, so the command behaves identically under
sh, zsh, and the GitHub Actions runner." I tested it rather than accepting it.

| Shell / form | Observed |
|---|---|
| `/bin/sh -c "node --test 'test-kits/**/*.test.mjs'"` | `tests 32 / pass 32 / fail 0` |
| `/bin/bash -c "node --test 'test-kits/**/*.test.mjs'"` | `tests 32 / pass 32 / fail 0` |
| `zsh -lc "node --test 'test-kits/**/*.test.mjs'"` | `tests 32 / pass 32 / fail 0` |
| `/bin/sh -c "node --test test-kits/**/*.test.mjs"` (UNQUOTED) | `tests 6 / pass 6 / fail 0` |
| `zsh -lc "node --test test-kits/**/*.test.mjs"` (UNQUOTED) | `tests 32 / pass 32 / fail 0` |

The claim is true: quoted, the pattern reaches the Node test runner intact and
yields 32 under `sh`, `bash`, and `zsh` alike.

The test also shows the quoting is not cosmetic. Unquoted under `sh` (which has
no `globstar`), `test-kits/**/*.test.mjs` collapses to `test-kits/contracts/*.test.mjs`
and yields **6** tests — it would have silently *dropped the 26 root tests*.
`npm config get script-shell` returns `null`, so `npm run` uses `/bin/sh` on
this platform, and `.github/workflows/ci.yml` runs `npm run check` on
`ubuntu-24.04`. The chosen quoted form is the correct one, and choosing the
unquoted form would have introduced a worse defect than the one being fixed.
No finding against the Author here.

## 4. Cross-package diff (item 3) — within the declared authorization

`git show 1873ade --stat` touches exactly 8 files:
`.agents/capability-profiles/cc-a0-atlas.json` (new),
`architecture/decisions/RFC-2026-003-...md` (new),
`evidence/WP-0A-A0-002/author-self-check.md` (new),
`handoffs/WP-0A-A0-002-author-handoff.json` (new),
`work-packages/WP-0A-A0-002.json` (new), `package.json` (1 line),
`work-packages/WP-0A-A0-001.json` (2 deletions),
`work-packages/WP-0A-CON-001.json` (1 line replaced).

`git show 1873ade -- work-packages/WP-0A-A0-001.json work-packages/WP-0A-CON-001.json`
contains exactly three hunks, and nothing else:

1. `WP-0A-A0-001.json` — `"package.json"` removed from `ownership.writable_paths`.
2. `WP-0A-A0-001.json` — `"package.json"` removed from `outputs.files`.
3. `WP-0A-CON-001.json` — `ownership.writable_paths` replaced:
   - removed: `contract-catalog/shared-kernel/**`, `fixtures/contracts/**`, `test-kits/contracts/**`
   - added: `contract-catalog/shared-kernel/index.json`,
     `contract-catalog/shared-kernel/ctr-ten-001/**`,
     `contract-catalog/shared-kernel/ctr-err-001/**`,
     `contract-catalog/shared-kernel/ctr-evt-001/**`,
     `contract-catalog/shared-kernel/ctr-job-001/**`,
     `test-kits/contracts/shared-kernel-contract-catalog.test.mjs`
   - unchanged in the same array: `.agents/capability-profiles/c0-contract-reviewer.json`,
     `work-packages/WP-0A-CON-001.json`, `evidence/WP-0A-CON-001/**`,
     `evidence/capability-benchmarks/c0-contract-reviewer.md`,
     `handoffs/WP-0A-CON-001-*.json`.

**No** `status` change (both remain `integration_verified`), **no**
`role_assignments` change, **no** `acceptance_criteria`, `required_tests`,
`deterministic_commands`, `read_only_paths`, `forbidden_paths`,
`migration_reservations`, `scope`, `purpose`, or `open_blockers` change, and
**no** reformatting of untouched lines. `WP-0A-CON-001.outputs.files` is
byte-identical (32 entries). `WP-0A-A0-001.outputs.files` changed only by the
one authorized removal.

Every change is inside `WP-0A-A0-002.ownership.authorized_cross_package_amendments`.
**However, see Finding R1** — the RFC's own Decision 3 is narrower than what was
done.

## 5. Output coverage after the amendment (item 4) — CONFIRMED, by reasoning and by execution

Glob semantics read from `scripts/validate-work-package-ownership.mjs`:
`**` compiles to `.*` (crosses `/`), a single `*` compiles to `[^/]*` (one
segment), all other characters are regex-escaped, and the pattern is anchored
`^...$`. Rule 68 rejects any `outputs.files` entry not matched by that package's
`writable_paths`; rule 69 rejects an output matching `read_only_paths`; rule 70
rejects one package's `writable_paths` matching *another* package's declared
output.

Independent re-implementation of that matcher, run over the committed manifests:

```
WP-0A-A0-001: outputs=83 uncovered=0
WP-0A-CON-001: outputs=32 uncovered=0
```

Spot-checked by hand: `contract-catalog/shared-kernel/ctr-ten-001/examples/valid.json`
is matched by `contract-catalog/shared-kernel/ctr-ten-001/**` because `**` → `.*`
crosses the `examples/` segment; `handoffs/WP-0A-A0-001-integration-verdict.md`
is matched by `handoffs/WP-0A-A0-001-*.md`; `evidence/g0-tracker-th.md` is an
exact entry. Both amended packages' declared outputs remain fully covered.

Validators, all through a login shell on the pinned toolchain:

| Command | Exit | Output |
|---|---|---|
| `npm run check` | `0` | `tests 32 / pass 32 / fail 0` |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | (no output) |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-002.json` | `0` | (no output) |
| `node scripts/validate-work-packages.mjs` | `0` | (no output) |
| `node scripts/validate-capability-profiles.mjs` | `0` | (no output) |
| `node scripts/scan-repository-secrets.mjs` | `0` | (no output) |

`node scripts/validate-capability-profiles.mjs` was re-run after this run wrote
`.agents/capability-profiles/cc-c0-contract-reviewer.json` and still exits `0`;
`npm run check` after that write still reports `tests 32 / pass 32 / fail 0`.

### Necessity probe (not requested; run adversarially)

I loaded the committed manifests in memory, restored each removal one at a time,
and re-ran the exported `validateManifestOwnership`:

```
baseline (as committed):                                  PASS
restore package.json to A0-001 writable_paths:            FAIL code 70 -> WP-0A-A0-001 writable path overlaps WP-0A-A0-002 output: package.json
restore package.json to A0-001 outputs.files:             FAIL code 68 -> WP-0A-A0-001 output is outside writable_paths: package.json
restore fixtures/contracts/** to CON-001 writable_paths:  PASS
restore contract-catalog/shared-kernel/** to CON-001:     PASS
restore test-kits/contracts/** to CON-001:                PASS
```

Result: the two **WP-0A-A0-001 removals are forced today** — the validator
cannot accept the repository otherwise. The three **WP-0A-CON-001 removals are
not forced today**; the repository validates with the old globs restored. They
become necessary only once a follow-on package declares outputs under them, which
I confirmed with a synthetic `WP-0A-CON-002` declaring
`contract-catalog/shared-kernel/ctr-api-001/manifest.json`:

```
future contract pkg against NARROWED CON-001 (post-change): PASS
future contract pkg against OLD CON-001 globs (pre-change): FAIL code 70 -> WP-0A-CON-001 writable path overlaps WP-0A-CON-002-HYPOTHETICAL output: contract-catalog/shared-kernel/ctr-api-001/manifest.json
```

So RFC-2026-003 D2's forward-looking rationale is empirically correct. But the
change mixes a *forced* amendment with an *anticipatory* one and neither the RFC
nor the author evidence draws that distinction. See Finding R2.

## 6. No status, contract, schema, provider, credential, network, or gate movement (item 7) — CONFIRMED

- `git diff --stat f28fb8e 1873ade -- contract-catalog test-kits` produces **no
  output**: the shared-kernel catalog, all four Candidate contract directories,
  all synthetic fixtures, and the contract test file are byte-identical to the
  commit at which WP-0A-CON-001 was verified. No freeze level, version, or
  status moved (`index.json` still: 14 contracts, 4 Candidate `1.0.0`, 10 Draft
  — asserted by the now-executing contract test).
- Package statuses: `WP-0A-A0-001 integration_verified`, `WP-0A-CON-001
  integration_verified`, `WP-0A-A6-001 backlog`, `WP-0A-A0-002 backlog`. Only
  `WP-0A-A0-002.json` is new; no other package's status changed.
- `.github/workflows/ci.yml` untouched. `package-lock.json` untouched (it is in
  this package's `forbidden_paths`). No `db/`, `migrations/`, or schema file
  exists or was touched. No `.env`, secret, or credential file appears in the
  diff. `node scripts/scan-repository-secrets.mjs` exits `0`.
- No dependency was added; `package.json` changed on exactly one line inside
  `scripts`. No network call, provider SDK, or external service is introduced;
  every verification command is Node-only and offline.
- Gate G0 is not moved by this commit and is not moved by this document.

---

## 7. Findings

### R1 — BLOCKING (record): RFC-2026-003 Decision 3 does not authorize the `fixtures/contracts/**` removal

The commit removes three globs from `WP-0A-CON-001.ownership.writable_paths`:
`contract-catalog/shared-kernel/**`, `test-kits/contracts/**`, **and**
`fixtures/contracts/**`. RFC-2026-003 Decision 3 names only the first two:

> "Narrow WP-0A-CON-001 ownership from `contract-catalog/shared-kernel/**` and
> `test-kits/contracts/**` to the exact paths that package delivered..."

`WP-0A-A0-002.ownership.authorized_cross_package_amendments` *does* mention
"and unused `fixtures/contracts/**`", so the diff stays inside the manifest
declaration. But the manifest declaration and the RFC were written by the same
Author in the same commit, and the artifact that goes to Product Owner
disposition is the RFC. As written, the decision record does not describe one of
the changes it is being used to authorize.

Effect is harmless — no `fixtures/` directory exists in the repository, no
WP-0A-CON-001 output lives under `fixtures/`, and the necessity probe shows the
removal changes no validator outcome — but the authority record must match the
change. **Fix: amend RFC-2026-003 Decision 3 to name all three globs.**

### R2 — Condition: forced vs anticipatory amendments are not distinguished

Per the necessity probe in §5, the WP-0A-A0-001 `package.json` removals are
required for the repository to validate at all; the three WP-0A-CON-001 removals
are pre-emptive. Both are defensible, but amending an `integration_verified`
package's ownership declaration when nothing currently requires it is a
discretionary act, and the RFC presents both as equally compelled ("Two
committed globs make every planned follow-on package unrepresentable"). The RFC
should state which amendment the validator forces now and which is anticipatory,
so the Product Owner disposes of them with that distinction in view.

### R3 — Condition: the amended manifests carry no trace of the amendment

`grep -rl "RFC-2026-003" . --exclude-dir=.git` returns only
`architecture/decisions/RFC-2026-003-...md`,
`evidence/WP-0A-A0-002/author-self-check.md`,
`handoffs/WP-0A-A0-002-author-handoff.json`, and
`work-packages/WP-0A-A0-002.json`. Neither `work-packages/WP-0A-A0-001.json` nor
`work-packages/WP-0A-CON-001.json` references RFC-2026-003, WP-0A-A0-002, or the
fact that it was amended by another package. Anyone reading those two manifests
sees a silently different ownership boundary from the one their integration
evidence certified.

This matters most for WP-0A-A0-001, which really did author `package.json`:
dropping it from `outputs.files` is validator-forced, but it leaves that
package's historical delivery record incomplete with no in-file explanation.

### R4 — Finding the Author missed: the corrected command has no coverage floor

`node --test` exits `0` with `tests 0` when its pattern matches nothing. Observed:

```
$ node --test 'no-such-dir/**/*.test.mjs'
ℹ tests 0 ... ℹ fail 0        EXIT=0

$ node --test "'test-kits/**/*.test.mjs'"   # quotes retained, as a shell that does not strip them would pass it
ℹ tests 0 ... ℹ fail 0        EXIT=0
```

So the corrected command reproduces *exactly the failure class this package
exists to fix* — a green `npm run check` that executed nothing — under any future
condition that stops the pattern from expanding: a `script-shell` or platform
that does not strip the single quotes (Windows `cmd.exe` is the obvious case), a
rename or relocation of `test-kits/`, or an accidental re-edit of the line. The
change is a strict improvement and I am not asking for it to be redone, but the
defect class is mitigated, not closed. Nothing in the repository asserts a
minimum executed-test count or that `test-kits/contracts/` was discovered, and
neither the RFC, the manifest's `required_tests`, nor the handoff's
`known_limitations` acknowledges this.

### R5 — Condition (record-keeping): head SHA not recorded

`handoffs/WP-0A-A0-002-author-handoff.json` carries
`"head_revision_or_patch_checksum": "pending-commit"` while the head under
review is `1873ade`. The handoff is committed inside the commit it describes, so
the placeholder is understandable, but RFC-2026-002 requires the head SHA be
recorded before the Product Owner merges.

### R6 — Condition (process): the package is `backlog` and does not name a Reviewer

`work-packages/WP-0A-A0-002.json` has `status: "backlog"` and
`role_assignments.reviewer_agent_run_id: null`. My run `/claude/c0_contract_reviewer`
is not named in the manifest. The declared flow is
`backlog → ready → in_progress → in_review → review_approved`, and
CONTRIBUTING_AGENTS.md requires real, distinct `agent_run_id` values before the
package moves out of `backlog`. This document therefore cannot by itself carry
the package to `review_approved`. The Author correctly recorded this as an open
blocker; I confirm it and restate it as a condition. I did not edit the manifest
— that is Author/Integration Owner work, and a Reviewer writing their own name
into the role assignment would defeat the control.

### R7 — Minor: reviewer/independent-role artifacts are not in `outputs.files`

`WP-0A-A0-002.outputs.files` lists only the six Author artifacts. The
independent-role artifacts this package requires —
`.agents/capability-profiles/cc-c0-contract-reviewer.json`,
`evidence/WP-0A-A0-002/review-contract.md`, and the pending security, test, and
integration evidence — are inside `ownership.writable_paths`
(`.agents/capability-profiles/cc-*.json`, `evidence/WP-0A-A0-002/**`) so no
validator fails, but the manifest's declared outputs are incomplete for a
package that cannot reach `done` without them.

### Claims checked and found accurate (no finding)

- The Author's wording about WP-0A-CON-001 evidence is careful and **not**
  overstated. The RFC says a regression "would pass every `npm run check`
  citation"; the self-check says the contract tests "were executed by no command
  in `npm run check` and therefore by no CI run". Both are literally true. The
  Author did not claim the contract tests were never run by anyone — and as §8
  shows, they were. I looked specifically for an overstatement here and did not
  find one.
- Numbers 26 / 6 / 32 are exactly as reported.
- The rejected candidate (`node --test test-kits/`) and the reason for quoting
  are correctly described.
- Security/privacy/cost, migration, and compatibility impact statements in the
  handoff match what I observed.

---

## 8. Ruling on item 5 — is an RFC sufficient authority to amend another package's manifest?

**Ruling: yes, the Integration Owner/RFC path is the correct and sufficient
mechanism for these ownership-declaration amendments. The owning packages do
NOT have to re-open to accept them — but the authority is contingent, and three
conditions must be met before it is complete.**

Reasoning:

1. **The guide names this path.** CONTRIBUTING_AGENTS.md, "Ownership and change
   control": "Root configuration, lockfiles, CI, contract catalog, migration
   registry, composition root, and source-of-truth documents are protected.
   Propose changes through the Integration Owner/RFC path." A work-package
   manifest is the source of truth for ownership, so it is in the protected
   class — and the remedy the guide prescribes for the protected class is
   precisely an RFC, not a re-opening of the owning package. Nothing in the guide
   requires the owner's package to re-enter the workflow.
2. **The one hard prohibition does not reach here.** The guide's absolute rule is
   "Never rewrite an integrated migration. Use a forward fix with a tested
   recovery path." That is specific to migrations, which create persisted,
   irreversible state. An ownership declaration creates none: reverting this
   commit restores the previous boundaries byte-for-byte, which I confirmed the
   diff supports.
3. **The conflict-resolution order supports it — conditionally.** The guide ranks
   "Approved RFC/Decision that is newer than the affected baseline" first.
   RFC-2026-003 is `Status: Proposed`. A Proposed RFC does not yet hold rank-1
   authority. The change is therefore correctly staged but not yet authorized;
   `WP-0A-A0-002.required_human_authorities` already says so ("Product Owner
   disposition of RFC-2026-003 before the manual merge described in
   RFC-2026-002"). I agree with that framing.
4. **Requiring a re-open would be circular and more costly for WP-0A-A0-001.**
   The ownership validator makes the intermediate state unrepresentable: it
   rejects (code 70/68) any arrangement where WP-0A-A0-001 still holds
   `package.json` while WP-0A-A0-002 declares it as an output. There is no
   sequence in which WP-0A-A0-001 "accepts" the transfer from inside its own
   package without the repository failing `npm run check` in between. Re-opening
   an `integration_verified` package would also reopen a gate that independent
   roles already closed, for a change that alters nothing that package delivered.
   That is a larger protocol cost than a recorded, validator-enforced amendment.
5. **But an amendment must not be silent, and it must not be self-authorized.**
   The weakness is not the mechanism, it is the record: the amended manifests
   carry no trace of the amendment (R3), the RFC does not describe one of the
   removals (R1), and the RFC, the manifest's
   `authorized_cross_package_amendments`, and the evidence were all written by
   the same Author. The declaration that a cross-package write was authorized
   cannot rest solely on the writing party's own artifacts.

**Conditions attached to this ruling (all three, before merge):**

- (a) RFC-2026-003 must reach an approved disposition by the Product Owner
  before merge (per RFC-2026-002 and `required_human_authorities`); until then
  the amendments are staged, not authorized.
- (b) RFC-2026-003 Decision 3 must be corrected to name every removed glob (R1)
  and to distinguish the forced from the anticipatory amendment (R2).
- (c) An amendment acknowledgement must be recorded against each amended package
  (R3), countersigned by their Integration Owner `/root/r0_steward`, who
  certified the boundary being changed. This is an acknowledgement, not a
  re-open: no status moves, no gate re-runs.

## 9. Ruling on item 6 — must WP-0A-CON-001 evidence be re-executed against the corrected 32-test command?

**Ruling: no full re-execution. A bounded re-execution of the `npm run check`
citation only, recorded as an addendum by the WP-0A-CON-001 Integration Owner
(`/root/r0_steward`), is required before WP-0A-A0-002 is integrated. The
WP-0A-CON-001 review, security, test, and integration conclusions stand and the
package's `integration_verified` status is not invalidated.**

Reasoning, from evidence I read rather than from the Author's summary:

1. **The contract tests were in fact independently executed at `f28fb8e` — by
   all four independent roles, separately from `npm run check`.** Grepping
   `evidence/WP-0A-CON-001/`:
   - `review-contract-f28fb8e.md:24` — "`node --test test-kits/contracts/*.test.mjs`
     exited `0`: 6/6 ... passed."
   - `review-security-f28fb8e.md:12` — "`node --test test-kits/contracts/*.test.mjs`
     — passed: 6/6 ..."
   - `test-f28fb8e.md:11` — recorded as the "Contract command".
   - `integration-f28fb8e.md:19` — "exit 0; 6 tests passed."
   - `status-integration-f28fb8e.json:40` — same command recorded.

   That command is `WP-0A-CON-001.deterministic_commands.package_evidence`, and
   every role ran it. The gap was in the **CI gate and the `npm run check`
   citation**, not in independent-role coverage. This is the decisive fact and
   it substantially reduces the remedy required.
2. **The artifacts under review did not change.**
   `git diff --stat f28fb8e 1873ade -- contract-catalog test-kits` produces no
   output. Every contract manifest, schema, fixture, and the contract test itself
   are byte-identical to what those roles reviewed. Re-running independent
   *judgement* over unchanged artifacts would produce the same conclusions and
   is not required by any rule in CONTRIBUTING_AGENTS.md.
3. **What is stale is a number, not a judgement.** Five WP-0A-CON-001 artifacts
   cite "26 tests" for `npm run check` (`review-contract-f28fb8e.md:23`,
   `review-security-f28fb8e.md:11`, `test-f28fb8e.md:10`,
   `integration-f28fb8e.md:18`, `status-integration-f28fb8e.json:37`). The same
   command at `1873ade` reports 32, and the 32 is a strict superset of the 26.
   Leaving the citations uncorrected would make the audit trail read as if two
   different commands with the same name gave different results.
4. **Therefore the proportionate remedy is an addendum**, not a re-run of the
   cycle: re-execute `npm run check` at the corrected head, record
   `tests 32 / pass 32 / fail 0 at 1873ade`, and state that it supersedes the
   `26/26 at f28fb8e` citation while the substantive contract coverage was
   already independently executed via the package-evidence command.
5. **Who must do it.** Not the Author (separation of duties), and not this run —
   I hold no Tester or Integration authority over WP-0A-CON-001 and this
   document does not re-verify that package. `WP-0A-A0-002.open_blockers[3]`
   already assigns the decision to the Integration Owner; my ruling is the
   Reviewer's recommendation on how that decision should be recorded, and the
   Integration Owner remains free to require more.

---

## 10. Conditions

Blocking before Product Owner disposition / merge:

- **C1 (R1)** — Amend RFC-2026-003 Decision 3 to name all three removed
  WP-0A-CON-001 globs, including `fixtures/contracts/**`.
- **C2 (R5)** — Record head `1873ade` in a follow-up handoff, replacing
  `"head_revision_or_patch_checksum": "pending-commit"`.
- **C3 (R6)** — Before this package may carry `review_approved`: set
  `role_assignments.reviewer_agent_run_id` to `/claude/c0_contract_reviewer` in
  `work-packages/WP-0A-A0-002.json` and move the package
  `backlog → ready → in_progress → in_review`. Author / Integration Owner
  action; I deliberately did not do this myself.
- **C4 (R3, ruling 8c)** — Record an amendment acknowledgement against
  `WP-0A-A0-001` and `WP-0A-CON-001` referencing RFC-2026-003 and WP-0A-A0-002,
  countersigned by `/root/r0_steward`. For WP-0A-A0-001 it must state that the
  package did deliver `package.json` and that ownership was transferred forward.
- **C5 (ruling 9)** — WP-0A-CON-001 Integration Owner records the bounded
  `npm run check` re-execution addendum (32/32 at `1873ade` supersedes 26/26 at
  `f28fb8e`).

Non-blocking for this commit, required before WP-0A-A0-002 reaches `done`:

- **C6 (R2)** — State in RFC-2026-003 which amendment the validator forces today
  and which is anticipatory, citing the necessity probe in §5.
- **C7 (R4)** — Open a tracked follow-on to give `test:bootstrap` a coverage
  floor, so a pattern that expands to nothing fails instead of passing green.
  A minimum executed-test count, or an assertion that
  `test-kits/contracts/` was discovered, would close the defect class rather
  than the instance.
- **C8 (R7)** — Add the independent-role artifacts to
  `WP-0A-A0-002.outputs.files`.

## 11. Verdict

The change is correct, minimal, reversible, synthetic-only, and materially
improves the repository: six real tenant-isolation and unsafe-payload contract
tests now execute in `npm run check` and in CI where previously none did, and
the ownership boundary is now expressible for the planned follow-on contract
packages. Every number the Author reported reproduces exactly, the quoted-glob
assumption is true and was the right choice, the cross-package diff is confined
to ownership declarations, and no contract, status, schema, provider,
credential, network, or gate state moved. My objections are to the completeness
of the authority record and to one residual risk the Author did not identify —
not to the change itself.

This is independent Reviewer evidence only. It is **not** Security review, **not**
Tester verification, **not** Integration Owner verification, **not** Product
Owner disposition, **not** merge authorization, and **not** Gate G0 approval.
Gate G0 remains Specification Baseline Complete / External Verification Pending.

VERDICT: approved_with_conditions
