# WP-0A-CON-005: Security / Privacy re-verification, 2026-10-05

Package: CTR-JOB-001 reference-field hardening
Security reviewer run: `/claude/a1_bastion` (`role_assignments.security_reviewer_agent_run_id`)
Author run under review: `/claude/a0_atlas`
Subject: PR #187, branch `agent/claude/WP-0A-CON-005-job-reference-hardening`,
head `e7d5e6ed2c6fb9fce8532bf507363e4ce98f466b` (base `600b48b`; work commit `efbaf70`,
handoff commit `e7d5e6e`).
Earlier verdict re-checked: `evidence/WP-0A-CON-005/review-security-a1.md` §10,
`security_approved_with_conditions`, conditions C1 to C4.

## 0. What I am

I am a subagent spawned by `/claude/a0_atlas`'s workflow orchestration, running the
`/claude/a1_bastion` Security/Privacy role (RFC-2026-024 §3/4 spawning disclosure). I am
the same vendor and model as the Author. Since the Owner's step-2 decision of 2026-10-05,
`prefer_cross_vendor_review` is `false` for this package, so independence here means: a
distinct run in a named role, which did not author, does not fix, and does not approve its own
work. I wrote no file in this package except this one. I fixed nothing.

This is Security/Privacy evidence only. It is not the Reviewer verdict, not Tester evidence, not
the Integration verdict, and it does not authorize any merge. PR #187 changes an RFC, so the
Product Owner merges it personally (RFC-2026-025 §5 item 6).

Gate G0: synthetic only. No network call, no credential, no provider, no dependency. No database
was started or used by me. Every probe ran in a private clone under my scratchpad
(`.../scratchpad/a1-con005/`), never in the shared checkout.

## 1. Measured vs read

| Item | How I know it |
|---|---|
| Toolchain `node v24.20.0`, `npm 11.19.0` | **measured** |
| `npm run check` on a private clone checked out on the branch **name** at `e7d5e6e`, with `origin/main` = `e1fa28e` (current `main`) | **measured**, §4 |
| `npm run check:handoff`, `check:scope 600b48b WP-0A-CON-005`, role-separation, ownership | **measured**, §4 |
| RFC-2026-006 Decision 2 pattern vs shipped `ctr-job-001`, `ctr-idm-001`, `ctr-api-001` patterns | **measured** byte comparison, §2 |
| Guard's new membership assertion bites | **measured**, 9 schema mutations, §3 |
| `verify-branch-scope.mjs` reads `authorized_cross_package_amendments`; `deadAmendments` reads only `amends_without_owning` | **measured** via the guard's exported functions, plus source read, §2 C2 |
| PR #187 merges cleanly onto current `main` `e1fa28e`, and the contract tests, coverage floor, secret scan and validators stay green on the merge | **measured** on a disposable local merge, §4 |
| `x-amended-by` on `ctr-api-001` / `ctr-idm-001` | **measured**: both still `null` |
| Owner step-2 words and item mapping | **read** from `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` at `e1fa28e` (`บืนยันขั้น 2`, lines 83, 101-103) |
| C0 and Q0 conditions and their closure | **read**: not my role; I note only where they touch security |
| GitHub CI on the PR head | **not measured**: I have no CI read here. Owed before merge per RFC-2026-002 |

## 2. My earlier conditions, one by one

### C1 (S1): record the `ctr-api-001` / `ctr-idm-001` amendments: **manifest and RFC parts closed; schema part not closed, carried to a named owner**

- Manifest: `ownership.authorized_cross_package_amendments` now has 9 entries; [7] and [8] name
  `ctr-api-001/schema.json` and `ctr-idm-001/schema.json`, say "RECORDED AFTER THE FACT", state
  the exact change (lookahead removal only) and name `/claude/r0_steward`. Measured.
- RFC: "Scope explicitly excluded" now has a dated paragraph admitting the exclusion was not
  honoured, naming both files and fields. Read and checked against the tree: the field names
  are right (`ctr-api-001` carries the shipped pattern exactly twice, `ctr-idm-001` `result_ref`
  once, measured).
- Schemas: `ctr-api-001` `x-amended-by: null`, `ctr-idm-001` `x-amended-by: null`. Measured.
  **Not closed.** The Author's reason is correct: both files are WP-0A-CON-001 outputs outside
  this package's `writable_paths`, and editing them here would repeat the S1 defect. The
  remaining part is recorded as `open_blockers[13](a)`, owed by WP-0A-CON-001's owner with
  `/claude/r0_steward` acknowledging. I accept the move to that owner. I do **not** treat it as
  closed.

The provenance gap I raised is now visible in two places a reader looks: the package manifest
and the approved RFC. The third place, the contract itself, is still silent.

### C2 (S2): `amends_without_owning.paths` with the nine paths: **superseded, accepted**

The point of C2 was that the only scope guard could not read this package's declarations.
`f3b4fbd` (in base `600b48b`) changed that. Measured with the guard's own exports at the head:
`declaredPaths()` returns 14 patterns, built from `writable_paths` plus every prose entry in
`authorized_cross_package_amendments`; `check:scope 600b48b WP-0A-CON-005` exits 0 ("all 7
changed path(s) are declared"). `deadAmendments()` is applied only to
`amends_without_owning.paths` (source line 136), so the Author is right that listing the nine
historical paths there, eight of which this branch does not touch, would exit 74. The machine
readability C2 asked for exists. I withdraw C2 as superseded.

The other half of S2, nothing enforcing `acknowledgement_status`, is still open. It is recorded
more precisely now (`open_blockers[1]`: the guard reads it only as an enum; C0 showed that
self-countersigning passes). It is not this package's to fix, and it was never one of my
conditions.

### C3 (S6): Decision 2 pattern; `ctr-evt-001` bullet; stale blockers 3, 10, 12: **closed**

- The pattern in RFC-2026-006 Decision 2 is **byte-equal** to `ctr-job-001` `input_ref` and
  `result_ref` and to `ctr-idm-001` `result_ref`. It is the only pattern of that shape in the RFC.
  The lookahead form now appears only as history, in prose. Measured.
- `authorized_cross_package_amendments[0]` now prints the lookahead-free pattern and records the
  correction. Read.
- The `ctr-evt-001` Limitations bullet is struck and marked closed, and it cites the remedy that
  landed. Read.
- Blockers 3, 10 and 12 are gone from `open_blockers` (15 before, 15 after: 4 removed, 4 added).
  Measured.

### C4 (S3, S8): disclose, do not close: **closed as written**

`open_blockers[11]` names `job_type`, `lease_owner`, `progress_stage`, `last_error_code`, the
numeric upper bounds and `priority` in both directions, with my severities, as
`required_before_freeze` for the CTR-JOB-001 owner, and says "DISCLOSURE ONLY, NOT CLOSURE".
Measured at the head: all four strings still have no `maxLength` and no `pattern`; `priority`
has no bounds; `max_attempts`, `timeout_seconds`, `attempt`, `job_version` have no maximum.
Nothing was bounded under cover of a security condition, as C4 required. S5 (248 opaque body
characters) is disclosed beside it in `open_blockers[12]`, which I did not require and accept.

## 3. The new guard assertion (C0 C3 / F4), checked for security value

Disposable mutations of `ctr-job-001/schema.json` in a private clone, guard re-run each time,
file restored byte-equal afterwards (measured):

```
none               exit=0   (baseline green)
https              exit=1   a network-dereferenceable scheme is in the reference allow-list: input_ref=https:public.example.invalid/x, ...
wss                exit=1   (same, wss)
file               exit=1   (same, file)
ftp                exit=1   (same, ftp)
javascript         exit=0   NOT caught
data               exit=0   NOT caught
blob               exit=0   NOT caught
mailto             exit=0   NOT caught
https on result_ref only   exit=1   (drift assertion catches it)
```

The assertion does what it says for the WHATWG special schemes. `javascript:`, `data:`, `blob:`
and `mailto:` pass it if a contract owner adds them, and the body grammar admits
`data:text/html` and `javascript:<identifier>`. The RFC's new Limitations bullet says so in
plain terms ("Schemes outside that list are not covered by the assertion"), so this is a
disclosed residual, not a false claim. Finding N1 below.

## 4. Declared tests

Private clone on the branch name, `origin/main` and `origin/HEAD` set to current `main`
`e1fa28e` (merge-base `600b48b`):

| Command | Exit | Result |
|---|---|---|
| `node --version` / `npm --version` | 0 | `v24.20.0` / `11.19.0` |
| `npm run check` | 0 | 691 tests, 691 pass, 0 fail, cancelled 0, skipped 0, todo 0 (coverage floor, toolchain, secret scan, protocol validators, full suite) |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs 600b48b WP-0A-CON-005` | 0 | all 7 changed paths declared |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-005.json` | 0 | |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | |

I stopped a first `npm run check` attempt part-way and do not count it. My clone's `origin/HEAD` pointed at
the PR head itself, which makes the handoff check read a false branch point (`check:handoff`
exit 91 in that state). I fixed the refs and re-ran from the start.

Disposable local merge of `e7d5e6e` with current `main` `e1fa28e` (PR #186 landed after the
branch was cut; the two touch disjoint files): no conflict; `verify-test-coverage-floor` exit 0;
the four contract suites (`ctr-job-001-reference-hardening`, `shared-kernel-contract-catalog`,
`shared-kernel-schema-conformance`, `ctr-evt-001-schema-ref-bounds`) 26 / 26 pass, skipped 0,
todo 0; `validate-work-packages` 0; `validate-work-package-ownership` 0; `scan-repository-secrets`
0. The Owner-disposition file the manifest cites now exists on `main`.

## 5. Anything new

**N1 (Low, disclosed).** The membership assertion covers `http/https/ws/wss/ftp/file` only.
Adding `javascript`, `data`, `blob` or `mailto` to the allow-list keeps CI green (measured, §3).
The RFC states this limit. Recorded so that blocker 8 (scheme set not decided) is not read as
"CI guards the scheme set". Owner: CTR-JOB-001's owner, when blocker 8 is decided.

**N2 (Low, new).** The two "RECORDED AFTER THE FACT" prose entries are now **standing machine
permissions**, not only records. Measured: `undeclared()` over a hypothetical future change set
returns nothing for `ctr-api-001/schema.json`, `ctr-idm-001/schema.json` or
`ctr-job-001/schema.json`, and only `ctr-ntf-001/schema.json` would be refused. "NOTHING ELSE"
and "this branch does not touch the file" are prose that no tool reads, and `deadAmendments`
does not apply to prose entries. So any later branch of WP-0A-CON-005 may change either
contract, in any way, and `check:scope` stays green. This is the S2 design (prose entries
authorize by path) applied to a retroactive record. It is not exploitable today: this branch
does not touch those files (measured, 7 changed paths). It is a note for whoever owns
`scripts/verify-branch-scope.mjs` and for `/claude/r0_steward`: a record of a past change should
not double as a future authorization. One option is to keep after-the-fact records out of the
path-authorizing field, or to give that field a dead-entry rule. Not a condition on this PR.

**N3 (note, not a finding).** `prefer_cross_vendor_review` is now `false` by the Owner's step-2
decision, applied by A0's mapping of "all 15 work packages" (WP-0A-A0-002..009,
WP-0A-CON-002..008), which the disposition file states as A0's mapping. The replacement text
keeps the history and does not claim cross-vendor review happened. My note in the earlier §7
(correlated blind spot) stands as an observation. The Owner decided it, and I do not reopen it.

**N4 (note).** `acknowledgement_required_from` on both CTR-JOB-001 `x-amended-by` records still
reads `/root/r0_steward`, while the manifest says `/claude/r0_steward` now owes it. The manifest
says why: the schema file is out of scope and the guard asserts that value. That is
consistent and disclosed. The successor must update both when acknowledging.

Nothing new rises to Medium. No secret, credential, PII, private URL or customer content was
added by the increment. I read all seven changed files in the diff, and the secret scan is green.

## 6. Findings table at `e7d5e6e`

| ID | Severity | State |
|---|---|---|
| S1 | High → **Low (residual)** | Manifest and RFC records exist; `x-amended-by` on `ctr-api-001`/`ctr-idm-001` still absent, owed by WP-0A-CON-001's owner (`open_blockers[13](a)`) |
| S2 | High (systemic) | Scope-reading half fixed by `f3b4fbd`; `acknowledgement_status` enforcement still absent; not this package's |
| S3 | Medium | Unchanged in the contract; **now disclosed** (`open_blockers[11]`) |
| S4 | Medium | Unchanged, disclosed (blocker on tenant binding) |
| S5 | Medium | Unchanged in the contract; **now disclosed** (`open_blockers[12]`) |
| S6 | Low | **Closed**: Decision 2 byte-equal to the tree |
| S8 | Low | Unchanged in the contract; **now disclosed** (`open_blockers[11]`) |
| N1 | Low | New, disclosed by the RFC |
| N2 | Low | New, referred to the scope-guard owner and `/claude/r0_steward` |

## 7. Verdict

**security_approved_with_conditions**

C2, C3 and C4 are closed (C2 because a later change superseded it). The PR's own content
raises no new security concern: the increment is records, one test assertion that bites
as claimed, and two digests. Of C1, the part this package can do is done, and the rest has a
named owner.

Remaining condition, attached to the **package**, not to merging PR #187:

- **R-C1.** Before WP-0A-CON-005 is moved to `integration_verified`, the `x-amended-by` record
  for the `64d9c65` lookahead removal must exist on `contract-catalog/shared-kernel/ctr-api-001/schema.json`
  and `contract-catalog/shared-kernel/ctr-idm-001/schema.json`, written by WP-0A-CON-001's owner,
  or `/claude/r0_steward` must record an explicit decision that those two contracts carry no
  such record. Either is acceptable. Silence is not.

**Stop-the-line: no.** No secret exposure, tenant leak, duplicate side effect, lost job,
migration divergence, irreversible deletion or contract mismatch. The amendment proven
behaviour-preserving in my earlier review is not changed by this increment.

**Does anything I own block the merge of PR #187: no.** What does block it is outside my role:
a Q0 re-test at this head (F7), the C0 re-check, a green CI run on the head, the Integration
verdict and the `/claude/r0_steward` acknowledgements. And the Product Owner merges it
personally, because it changes an RFC.

— `/claude/a1_bastion`, Security / Privacy reviewer, WP-0A-CON-005
