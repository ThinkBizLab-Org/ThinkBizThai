# R0 integration verdict: WP-0A-CON-005 (PR #187) at head `e7d5e6e`

Date: 2026-10-05 (measured 2026-10-06 local). Package: `WP-0A-CON-005`, CTR-JOB-001 reference-field
hardening. PR: #187, branch `agent/claude/WP-0A-CON-005-job-reference-hardening`, head
`e7d5e6ed2c6fb9fce8532bf507363e4ce98f466b`, merge base `600b48b`, current `main` `e1fa28e` (#186).

## 0. What I am

- A subagent spawned by a workflow script of `/claude/a0_atlas`, run under RFC-2026-024, acting in the
  role `/claude/r0_steward` (Integration Owner). I am the named successor to `/root/r0_steward` by item 2
  of the Owner's confirmed G0 step 2 (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md`
  §3 row 2, on `main` since #186).
- The Author of this package, `/claude/a0_atlas`, is the run that spawned me. RFC-2026-024 allows this.
  I record it so the reader can weigh the verdict.
- I do not fix. I edited no file of the PR. This file is my only output. I give an integration verdict
  and the acknowledgements named in §5, nothing else: not the review, not the test, not security, not
  the merge, not Gate G0.
- This commit is cut at the PR head `e7d5e6e` on a local branch and is **not pushed**.

## 1. Measured vs read

### Measured (by me, in this run)

Node `v24.20.0`, npm `11.19.0`, `.node-version` `24.20.0`.

| Command | Exit | Result |
|---|---|---|
| `gh pr view 187` | 0 | Draft, `MERGEABLE`, `mergeStateStatus` **BEHIND**, head `e7d5e6e`, base `main` |
| `gh run view 37343765494` | 0 | head `e7d5e6e`: conclusion **failure**; the only failed step is `Verify branch scope` |
| `git merge-base --is-ancestor 64d9c65 600b48b` | 0 | the earlier CON-005 work is already on `main` |
| `git diff --stat 600b48b e7d5e6e` | 0 | 7 paths, all inside `writable_paths` or `authorized_cross_package_amendments[6]` |
| `git diff --name-only 600b48b e7d5e6e -- contract-catalog .github scripts package.json package-lock.json CONTRIBUTING_AGENTS.md AGENTS.md CLAUDE.md docs db` | 0 | **empty**: no protected, catalog, CI, script, lockfile or database path changed |
| `git diff 600b48b e7d5e6e -- test-kits/integrity-manifest.json` | 0 | exactly two digests move: RFC-2026-006 and `ctr-job-001-reference-hardening.test.mjs` |

**Disposable integration tree** (local branch, deleted afterwards): `e7d5e6e` + `git merge origin/main`
(`e1fa28e`) + cherry-pick of the three role commits `2d5a6da` (C0), `3f63ac0` (A1), `b82019d` (Q0).

| Command on the disposable tree | Exit | Result |
|---|---|---|
| `git merge origin/main` | 0 | no conflict |
| `git cherry-pick 2d5a6da 3f63ac0 b82019d` | 0 | clean; each adds one file under `evidence/WP-0A-CON-005/` |
| `git diff --name-status origin/main HEAD` | 0 | 10 paths: the 7 above plus the 3 role files |
| `npm ci --ignore-scripts` | 0 | |
| `npm run check` | 0 | `tests 691, pass 691, fail 0, cancelled 0, skipped 0, todo 0` |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-CON-005-job-reference-hardening` | 0 | `WP-0A-CON-005` |
| `node scripts/verify-branch-scope.mjs e1fa28e WP-0A-CON-005` | 0 | "all 10 changed path(s) are declared, and every amendment explains one" |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-005.json` | 0 | |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | |
| `node scripts/verify-test-coverage-floor.mjs` | 0 | |
| `node --test test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` | 0 | 6 / 6 pass |
| `node --test test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | 0 | 6 / 6 pass |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | 0 | 6 / 6 pass |

`npm run check:handoff` was **not** measured on the branch name: the disposable tree was not on it, and the
name is checked out elsewhere, so I did not borrow it. That check is part of A0's step 5 in §7.

**Structural delta of CTR-JOB-001** (leaf-path diff of `ctr-job-001/schema.json`, script in my scratchpad):

- `b47aece^ → b47aece`: `input_ref`/`result_ref` lose `not.pattern`, gain `pattern` and
  `x-reference-rule`; `x-amended-by` becomes an array. Property key set, `required` and the
  `tenant_context` `$ref` unchanged. The WP-0A-CON-002 record is carried **deep-equal** as `[0]`.
- `b47aece → 64d9c65`: only the two `pattern` leaves and the two `x-reference-rule` leaves change
  (lookahead removal).
- `64d9c65 → main`: `minLength` removed and `maxLength` 256 + `x-minlength-note` added on both reference
  fields; `maxLength` + `x-bound-note` added on `job_id` and `dedupe_key`. **None of this is CON-005's**
  (later packages), and no `x-amended-by` record covers it (see R10).
- `ctr-job-001/manifest.json`: `1.0.0` / `Candidate`. `index.json` CTR-JOB-001 entry: `1.0.0` / `Candidate`.

**The `64d9c65` change on the other two contracts** (leaf diff `64d9c65^ → 64d9c65`):
`ctr-api-001` `accepted.status_ref` and `accepted.deep_link_ref`, and `ctr-idm-001` `result_ref`, each
change **two** leaves: `pattern` (lookaheads removed) **and** `x-reference-rule` (one sentence appended,
"The two negative lookaheads were removed: ..."). `x-amended-by` on both schemas is `null` today. This
confirms C0's N2: "NOTHING ELSE" in `authorized_cross_package_amendments[7]`/`[8]` and in the RFC's
amendment paragraph is false.

**A consumer now exists.** `db/foundation/migrations/050_async_kernel.sql:529-535` puts the same
lookahead-free pattern, character for character, and `length <= 256` into `app.jobs` CHECK constraints
`jobs_input_ref_form` and `jobs_result_ref_form`. The manifest's "CTR-JOB-001 has no implementation"
(`open_blockers[2]`) was true when written and is not true at `main`.

### Read, not re-measured

The three role files at `e7d5e6e` (C0 `2d5a6da`, A1 `3f63ac0`, Q0 `b82019d`), the fuzz counts they cite
(400,000 / 455,555 / 400,000 strings), and Q0's mutant kills. I did not re-run any of them.

## 2. Role verdicts at `e7d5e6e`, and what each still requires

| Role | Verdict | Blocks? | What remains |
|---|---|---|---|
| C0 `/claude/c0_contract_reviewer` | `review_approved_with_conditions` | yes | **C5** (a package condition, inside `writable_paths`) and N1 (CI) |
| A1 `/claude/a1_bastion` | `security_approved_with_conditions` | no for the merge | **R-C1** before `integration_verified` (closed by my decision R4, once C5 lands) |
| Q0 `/claude/q0_sentinel` | `test_verified_with_conditions` | yes | N1 only (sync `main`, green CI); N2 resolves with it |

None is stop-the-line. Q0 asked R0 to confirm that the synced head's diff against `main` is the same
package paths: measured on the disposable tree, it is (the 7 paths + the 3 role files).

## 3. Gates

| Gate (`review_and_test_gates`) | State at `e7d5e6e` |
|---|---|
| `author_complete` | satisfied |
| `review_approved` | **not yet**: C0's C5 is open |
| `security_approved` | satisfied with conditions; R-C1 closes by R4 once C5 lands |
| `test_verified` | satisfied with conditions; N1 is the only open item |
| `integration_verified` | **not yet** (this file) |

## 4. Findings (R0)

- **R1 — High, merge-blocking, not content.** The head does not contain `main` (`e1fa28e`), and the
  required check is red at `e7d5e6e` (run `37343765494`, `Verify branch scope`, exit 73 against
  `#186`'s files). Measured: the merge is clean and the merged tree passes every gate in §1.
  RFC-2026-025 §5 item 6 requires the head to contain current `main`.
- **R2 — Medium, package condition (C0 C5).** `authorized_cross_package_amendments[7]` and `[8]`, and the
  RFC-2026-006 "Amended 2026-10-05 (A1 S1 ...)" paragraph, say the `64d9c65` change on
  `ctr-api-001`/`ctr-idm-001` was the lookahead removal "and nothing else". It also appended one
  `x-reference-rule` sentence on each of the three fields (§1). The record must say what the tree
  contains. This is the Author's, inside `writable_paths`; it moves the RFC digest once more under
  `[6]`.
- **R3 — Merge mode.** PR #187 changes an RFC (RFC-2026-006). Under RFC-2026-025 §5 item 6 it is merged
  **by the Owner personally**, never by delegation. Independently, A1's open Low findings (C1/S1
  residual, N1, N2) would also bar a delegated merge under the same item ("no unresolved security
  finding of any grade"). The Owner may merge with them carried as recorded; A0 may not press the
  button on the standing delegation.
- **R4 — Decision on A1 R-C1 (closes it, conditional on R2).** A1 left me a choice: the `x-amended-by`
  records on `ctr-api-001` and `ctr-idm-001` are written by WP-0A-CON-001's owner, or R0 decides
  explicitly that those two contracts carry no such record. **I decide the latter.** Reasons: the
  change is behaviour-preserving by three independent measurements; each changed field already states
  the change in place, in its own `x-reference-rule` (§1); the cross-package record exists, in this
  package's manifest `[7]`/`[8]` and in RFC-2026-006, which is where I acknowledge it (§5.3); and
  writing two new records now would be a further edit to two Candidate contracts with no behavioural
  content, by a package that does not own them. This decision takes effect when R2 lands, because the
  record it relies on must first be accurate. It is not a precedent: an amendment that changes
  behaviour still needs `x-amended-by` on the amended contract.
- **R5 — Low.** `rollback_or_forward_fix` is stale. "Reverting restores the deny-list" was safe when
  nothing implemented CTR-JOB-001. At `main`, `app.jobs` enforces the narrowed pattern (§1). A revert of
  this package alone would make the contract **wider than the database**, a contract/database
  mismatch, which is a stop-the-line class. The rollback is now a forward fix, or a revert paired with
  a migration. Recommendation for the closing increment, not a merge condition.
- **R6 — Low, carried (A1 N2).** Prose entries `[7]` and `[8]` become machine permission:
  `verify-branch-scope.mjs` will accept any future change to `ctr-api-001`/`ctr-idm-001` from this
  branch. The package has no further work after integration, so the exposure is small. It belongs to
  the owner of `scripts/`, with blocker `[1]`'s gap (nothing reads `acknowledgement_status`).
- **R7 — Info.** `open_blockers[2]`'s "CTR-JOB-001 has no implementation" and `open_blockers[14]`'s "no
  Tester attestation covers the current head" are stale (§1; Q0's re-verify now exists). Updating them
  in the closing increment is a record correction.
- **R8 — Info, carried (C0 N3, N5; A1 N1; Q0 N3).** Mixed-case special schemes and non-special
  dereferenceable schemes (`data`, `javascript`, `blob`) survive the membership assertion, as RFC
  Limitations discloses. The body bound is 252 for a three-letter scheme, not 248. Neither is a merge
  condition.
- **R9 — Info (A1 N4).** Both `x-amended-by` records on `ctr-job-001` still name `/root/r0_steward` in
  `acknowledgement_required_from`. Corrected when the acknowledgement in §5.1 is transcribed.
- **R10 — Info (Q0 N4), not this package's.** `x-amended-by[1].change` ("Only those two reference
  constraints changed") is accurate for CON-005's own delta, measured `b47aece^ → 64d9c65`. The later
  edits to the same fields (`minLength` removed, `maxLength`, `x-minlength-note`) and to `job_id` /
  `dedupe_key` carry no `x-amended-by` record of their own. That is owed by the packages that made them,
  to CTR-JOB-001's owner. I read `[1].change` as a statement about CON-005's change, which it is.

## 5. Acknowledgements given

### 5.1 CTR-JOB-001 `x-amended-by[1]` (WP-0A-CON-005) — **ACKNOWLEDGED**

The change recorded at `contract-catalog/shared-kernel/ctr-job-001/schema.json` `x-amended-by[1]`
(owed per `WP-0A-CON-005.json` `required_human_authorities[1]` and `open_blockers[0]`) is sound:

- It is the change the record describes, measured: `input_ref`/`result_ref` deny-list replaced by the
  CTR-IDM-001 allow-list pattern plus `x-reference-rule`; no property added or removed; `required`
  unchanged; `tenant_context` `$ref` unchanged; `1.0.0` / `Candidate` unchanged; the WP-0A-CON-002 record
  carried deep-equal.
- It narrows accepted input on a Candidate contract to close a defect demonstrated by independent
  security review and re-measured before the change; the Owner approved RFC-2026-006 on 2026-09-02
  (`82aae60`).
- The only producer that exists, `app.jobs` (migration 050), already enforces exactly this narrowed
  form. Acknowledging aligns the contract with the database; withholding would not widen anything.

**Not acknowledged here:** `x-amended-by[0]` (WP-0A-CON-002's `$ref` correction). It was not asked of
this run and belongs to WP-0A-CON-002's integration.

**Transcription.** The file is a WP-0A-CON-001 output outside this package's writable paths, so the
flip cannot go on PR #187 without turning the scope check red. It is transcribed in a separate change
on the contract owner's path: `x-amended-by[1].acknowledgement_status` → `acknowledged`,
`acknowledgement_required_from` → `/claude/r0_steward`, citing this file. Because nothing mechanical
reads `acknowledgement_status` (`open_blockers[1]`), the citation of this file is the only control:
an `acknowledged` value without it is not this acknowledgement.

### 5.2 `test-kits/integrity-manifest.json` (`authorized_cross_package_amendments[6]`) — **ACKNOWLEDGED**

As WP-0A-A0-002's Integration Owner: at `e7d5e6e` exactly the two declared digests move, and the
coverage-floor guard passes on the merged tree. The acknowledgement extends to the one further RFC
digest move that R2 causes, and to nothing else.

### 5.3 `ctr-api-001` / `ctr-idm-001` (`authorized_cross_package_amendments[7]`, `[8]`) — **ACKNOWLEDGED, effective on R2**

The `64d9c65` change on those three fields (lookahead removal plus the appended `x-reference-rule`
sentence) is behaviour-preserving and acknowledged, with no `x-amended-by` record required on those
schemas (R4). Effective when `[7]`/`[8]` state the whole change.

### 5.4 Class-of-change disposition (`open_blockers[2]`) — **ACCEPTED**

A narrowing of accepted input on a Candidate contract is accepted for this package. The basis written
then was "no implementation"; the basis now is stronger: the implementation that exists enforces the
narrowed form.

## 6. Verdict

**integration_conditional** — WP-0A-CON-005 is **not** `integration_verified` at `e7d5e6e`.

It **can** move to `integration_verified` once all of §7 steps 1–6 hold. That is more than "role files on
the branch and CI green": C0's C5 is a package condition still open, and it needs a C0 re-check under
RFC-2026-025 §5 item 2. Everything else is measured clean: the merge with `main` is conflict-free, the
merged tree passes every gate in the manifest (691/691, scope exit 0 over 10 declared paths), no
protected path changes, no role run raised stop-the-line, and A1's R-C1 is closed by my decision R4.

**Stop-the-line: no.**

## 7. What A0 must do before merge

1. **C5 / R2.** In `work-packages/WP-0A-CON-005.json` `[7]` and `[8]`, and in RFC-2026-006's
   "Amended 2026-10-05" paragraph, state the whole `64d9c65` change on each field (lookahead removal
   **and** the appended `x-reference-rule` sentence), or drop "NOTHING ELSE". Run
   `npm run regenerate:manifest`; only the RFC-2026-006 digest may move, and say so in `[6]`. Optional in
   the same commit: R5 (rollback text), R7 (stale blocker text), C0 N5 (252).
2. **C0 re-check** of that commit, per RFC-2026-025 §5 item 2, lifting C5 (`review_approved`).
3. **Merge current `main`** into the branch with a merge commit (no rebase, no force). Measured clean
   against `e1fa28e`; if `main` moves again, take it again.
4. **Put the role files on the branch:** C0 `2d5a6da`, A1 `3f63ac0`, Q0 `b82019d`, this file, and the
   C0 re-check from step 2.
5. **Refresh the handoff last and alone**, measured on the branch **name** (not detached):
   `npm run check:handoff` exit 0.
6. **Green required CI on that head**, including `Verify branch scope`, and
   `git diff --name-only origin/main...HEAD` equal to the 10 paths in §1 plus this file and the C0
   re-check file. Any other path makes this verdict lapse and needs an R0 re-run.
7. **Do not write `integration_verified` into the manifest yourself** (the Author moves work only
   through `in_review`). Ask `/claude/r0_steward` for a confirmation at the final head; it checks
   steps 1–6 and records the status.
8. **The Owner merges personally** (R3): merge commit pinned with `--match-head-commit` to the head of
   step 6. The PR stays Draft until then.
9. **After merge**, on the contract owner's path: transcribe §5.1 onto `ctr-job-001/schema.json`
   `x-amended-by[1]`, citing this file.

VERDICT: integration_conditional

— `/claude/r0_steward`, Integration Owner, WP-0A-CON-005
