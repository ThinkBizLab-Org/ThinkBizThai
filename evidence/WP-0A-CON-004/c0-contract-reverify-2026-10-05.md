# WP-0A-CON-004: C0 re-verification at the PR #196 head

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/196, branch
`agent/claude/WP-0A-CON-004-security-audit-observability`, head
`23eb05570ae2c6b4afba8f7346430af66989855a`, cut from `main @ 8c089cc0` (the merge base, measured).
Two commits on top of that base: `38da14a` (the work) and `23eb055` (the handoff, last and alone).
Twelve changed paths against the merge base.

Earlier verdict re-checked: `evidence/WP-0A-CON-004/review-contract.md`, my role's verdict at `a690f11`
(2026-09-01), **changes_requested**, with eight required changes. Items 1 to 4 and 8 were non-negotiable.
Items 5 to 7 could be accepted as recorded follow-ups.

The file name carries 2026-10-05 because the assignment named it. The work was done on 2026-10-06.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, launched by A0's workflow script to act as the independent Reviewer
run `/claude/c0_contract_reviewer`. RFC-2026-024 §3/3 requires this disclosure. I share a vendor, a model
family and a parent with the Author. I did not write any of this PR's content, and I fix nothing in it.
This file is Reviewer evidence only. It approves no gate, authorises no merge, moves no package status
and countersigns no acknowledgement. Gate G0 remains Specification Baseline Complete / External
Verification Pending. Everything here is synthetic. No provider, credential or database was touched,
so port 5581 was never used.

## 1. Measured versus read

**Measured** (I ran it, and the output is summarised below with its exit code):

- Toolchain: `node --version` `v24.20.0`, `npm --version` `11.19.0`, `.node-version` `24.20.0`.
- A private clone at
  `/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/c0-WP-0A-CON-004/repo`,
  cloned with `--branch agent/claude/WP-0A-CON-004-security-audit-observability`. `.git/HEAD` read
  `ref: refs/heads/agent/claude/WP-0A-CON-004-security-audit-observability`, `git branch --show-current`
  printed the name, and `git rev-parse HEAD` printed `23eb0557…`. The branch-reading guards ran on
  the branch, not on a detached HEAD.
- At the head `23eb055`:
  - `npm run check`: exit 0, `tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0`. This run
    includes `verify:coverage-floor`, `verify-toolchain`, `scan:secrets`, `validate:protocol` and the
    suite runner.
  - Package evidence commands. `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs`
    exit 0, 6/6. `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` exit 0, 6/6.
    `node scripts/validate-work-package-ownership.mjs work-packages` exit 0, no output.
  - `node --test test-kits/contracts/catalog-registry.test.mjs` exit 0, 15/15.
    `node --test test-kits/contracts/schema-mutation-coverage.test.mjs` exit 0, 10/10.
  - `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-004.json` exit 0.
  - `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-CON-004-security-audit-observability`
    printed `WP-0A-CON-004`, exit 0.
  - `node scripts/verify-branch-scope.mjs 8c089cc0 WP-0A-CON-004`:
    `all 12 changed path(s) are declared, and every amendment explains one`, exit 0.
  - `npm run check:handoff`: `describes the branch: nothing substantive after its cited head`, exit 0.
- **Rule equivalence** between the merge base `8c089cc` and the head. I wrote a script that removes every
  `x-*` key and compares the three schemas. All three are rule-identical. Each manifest changed in
  `freeze_boundary` only. All 210 example files (SEC 69, AUD 62, OBS 79) are byte-identical, and every
  status stays `Draft`. Schema annotation counts: SEC 19→19, AUD 20→21, OBS 17→19. The Author's claim
  "no rule, enum, requiredness, bound or freeze level moves" holds.
- **Constraint-mutation coverage** with the same method as `review-contract.md` §5. I deleted each
  assertive constraint site, plus each `allOf` element, one at a time. Then I revalidated every declared
  fixture through the repository's `json-schema-subset.mjs` and checked whether any verdict flipped.
  The baseline verdicts match the fixture-name prefixes in all three contracts (0 mismatches).

  | Contract | Fixtures (a690f11 → now) | Sites | Killed | Coverage (a690f11 → now) |
  |---|---:|---:|---:|---:|
  | CTR-SEC-001 | 11 → 69 | 89 | 77 | 16.0 % → **86.5 %** |
  | CTR-AUD-001 | 10 → 62 | 71 | 66 | 19.4 % → **93.0 %** |
  | CTR-OBS-001 | 10 → 79 | 89 | 83 | 15.7 % → **93.3 %** |

  I traced each of the 23 surviving sites. Each one is shadowed by another rule:
  - `if.required` duplicates a property that the root already requires.
  - SEC `allOf[0].then.resolvable.const` is also enforced by `allOf[4]`.
  - SEC `rotation.owner.kind.enum` is narrowed to a `const` by `allOf[2]`/`allOf[3]`, because
    `ownership` is required.
  - SEC `allOf[2]`/`allOf[3]` `then.rotation.required` duplicates the root `required`.
  - OBS `sli_tags.environment.type` is implied by its `enum`.
  - Root `type: object` in SEC and AUD is not exercised by any declared fixture. It carries no weight.

  This is the change my item 6 asked for. The weighted sites I listed as unexercised in
  `review-contract.md` §5 are all killed now. That covers all six SEC redaction surfaces, SEC-009's six
  categories, `managed ⇒ platform_role`, the `dependencies` subtree and every `sli_tags.*.pattern`.
- **A trial merge with the current `main`.** `main` moved after the branch was cut: it is now
  `fa102298` (PR #188 merged), which I fetched from GitHub. In the private clone, on the branch name,
  `git merge gh/main` **conflicts** in `test-kits/integrity-manifest.json`. Both sides moved the digest
  block of adjacent lines: this branch moved `catalog-registry.test.mjs`, and `main` moved
  `ctr-evt-001-schema-ref-bounds.test.mjs` and `ctr-job-001-reference-hardening.test.mjs`. I resolved it
  by taking each side's own line. All three digests equal `shasum -a 256` of the merged files. I
  committed the result only in the private clone, which is never pushed. At that merge:
  `npm run check` exit 0, 692/692, skipped 0, todo 0.
  `node --test test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs` exit 0, 8/8. `main`'s
  `KNOWN_UNBOUNDED` lists exactly the 22 CON-004 fields that `open_blockers[14]` names.
- Source re-reads behind each correction, in `docs/plans/`:
  - SEV-2 row: `meta-security-production-ops-workstream-th.md:322`.
  - The note under the PDPA table: same file, line 191. It covers legal and tax requirements and the
    incident notification period, and it does not name retention.
  - MR-004 (line 209) has no reason. MR-006 (line 211) has "last error … without secret":
    `module-contracts-events-jobs-workstream-th.md`.
  - OB-001 (line 333) and OB-005 (line 337): same file.
  - `ctr-idm-001/schema.json` `result_ref.maxLength: 256` (line 66).
  - `ctr-mod-001/schema.json` has no `maxLength` anywhere. `grep` returns nothing, which confirms C3.

**Read, not measured.** I read these: the manifest, the handoff and `author-self-check.md` diffs; the
Author's `author-conditions-closure-2026-10-06.md`; A1's
`security-disposition-handle-ownership-a1.md` §4 to §6; and the six moved pins in
`catalog-registry.test.mjs`. The diff shows freeze_boundary pins and annotation count/digest pins only,
and the counts are consistent with my annotation deltas. I also read the PR state through `gh`: the
PR is Draft and open, with `mergeable: CONFLICTING` and `mergeStateStatus: DIRTY`. It has **no CI run
at `23eb055`**. The last run on the branch is `33818297523` at `c4ccd21`, from 2026-09-03.

The repository tree was not changed by any probe. The only change I make is this file.

## 2. My earlier conditions, one by one

| # | Earlier required change | Now | Evidence |
|---|---|---|---|
| 1 | **M1**: the `dependencies.status` inference must not claim the SEV-2 row distinguishes a degraded provider from an unavailable one, and must declare `healthy` | **Closed** | Both the `dependencies` and `status` x-sources now quote the row verbatim. They say it does NOT draw the distinction and that `healthy` is in no source. The quote matches line 322 byte for byte. |
| 2 | **M3**: remove "MR-004 requires a reason" from the OBS x-rule and `freeze_boundary` | **Closed** | The capability `allOf[0]` x-rule says MR-004 "does NOT mention a reason" and gives the obligation as a declared inference from MR-006, the same reading as CTR-MOD-001. The manifest `freeze_boundary` says the same. MR-004 and MR-006 were re-read at lines 209 and 211. |
| 3 | **M6**: give `trace_id` an x-source | **Closed** (closed before this branch, re-measured) | `correlation.trace_id.x-source` is a DECLARED INFERENCE. It names DR 5.2 and OB-001, and it says neither names a `trace_id` field. |
| 4a | **M2**: cite the 5.2 Contract column as a name | **Closed** | `readiness.x-source`: "Decision Register 5.2 NAMES this contract … (the Contract column; its freeze artifacts are 'propagation, SLI tags, bounded cardinality')". The root has an `x-catalog-note`. |
| 4b | **M4**: drop SEC-009 as the source of "why" | **Closed** | `allOf[0].x-rule`, `revocation.x-source` and `freeze_boundary` all say that SEC-009 requires only actor and correlation, and that the reason is a declared inference from OB-005. OB-005 does list "reason" (line 337). |
| 4c | **M5**: restate the legal-counsel note as what it says | **Closed** | `retention.x-source`, the AUD `freeze_boundary` and `open_blockers[9]` now paraphrase line 191 correctly: legal and tax requirements and the incident notification period, retention not named, governs PDPA-006 by position. |
| 5 | Declare the unsourced `maxLength` values and `liveness.status` | **Closed** | These now carry declared-inference notes, and no bound value moved (rule equivalence above): AUD `reason_key` 96, OBS capability `reason_key` 96, `retention.policy_ref` 96, `change.before_ref`/`after_ref` 256 (the CTR-IDM-001 `result_ref` precedent was checked at line 66), and `liveness.status` `up`/`down`. |
| 6 | Soften "materializes exactly" on redaction, or add fixtures | **Closed, both ways** | All six `invalid-redaction-<surface>-false.json` exist. My probe kills all six `const` sites, and the mutation suite now protects them. `freeze_boundary` and `redaction.x-source` also say that this is a producer self-attestation and not evidence of plaintext-freedom, and that the DR 5.2 runtime redaction tests do not exist (`open_blockers[7]`). |
| 7 | Reframe the ownership escalation | **Closed, by supersession** | In my §4 I read the situation as having no live conflict, because CTR-MOD-001 had conceded. A1's later disposition (2026-09-04, §4b) held the opposite: the precedent is an ownership breach that needs an RFC. A1 is the co-owner and the security authority on that question, so the A1 reading governs and mine is superseded. The `handle` x-source, the SEC `freeze_boundary` and `open_blockers[0]` now record A1's disposition. They name the open items as the §4(c) RFC owed by A0 and the issuance format owed by A1 (C2). That is what my item 7 asked for in substance. |
| 8 | Correct the coverage sentence in `author-self-check.md` | **Closed** | The heading now says "shown by FIXTURE mutation" and carries a dated correction note. Constraint coverage is now real as well (table above). |

A1's condition **C3** is checked here because it is a contract-text claim. The "two contracts compose"
justification is withdrawn from the `handle` x-source and from `freeze_boundary`. The divergence it
names, 128 against unbounded, is real: I measured it by grep. Making the two accept sets equal is owed
through the RFC. It is A1's and A0's to close, not mine.

## 3. What is new at this head

| ID | Grade | Finding |
|---|---|---|
| N-1 | **Blocks merge (mechanical)** | PR #196 conflicts with `main @ fa102298` in `test-kits/integrity-manifest.json`, and GitHub reports `CONFLICTING`/`DIRTY`. Because of the conflict, no CI run exists at `23eb055`. The conflict is trivial, and I measured a clean resolution: 692/692, every digest equal to its file. It still needs an Author commit that merges `main`, a refreshed handoff that stays last and alone, and a green `bootstrap` run on the new head. None of that is a content defect. |
| N-2 | Low, recorded | `open_blockers[14]` and closure §4 now read stale. They place `KNOWN_UNBOUNDED` "on PR #188" and defer the 22 bounds "until #188 merges", but #188 merged at `fa102298`. The deferral reason no longer holds, so the 22 bounds are now owed and actionable. `main`'s guard will go red for each one as it is bounded, because a stale entry fails the guard. That is the intended ratchet. Correct the wording in the merge-from-`main` increment. Bounding the fields is a rule change for the next round and is not a condition of this PR. |
| N-3 | Info | `verify-branch-scope.mjs` does a two-dot comparison against the ref it is given. Against today's `main` it reports 25 undeclared paths (exit 73), all of them from PRs #187 and #188. Against the merge base it is green. Anyone reading this guard after `main` moves has to pass the merge base. A three-dot comparison would remove that trap. The script is not this package's path. |
| N-4 | Info | The last clause of the `handle` x-source, "not a conflict either contract has conceded", reads ambiguously. The intended meaning is "rather than a conflict that one contract has already conceded". The SEC `freeze_boundary` still opens with "TWO OPEN CONFLICTS ARE RECORDED RATHER THAN RESOLVED", which is accurate under A1's §4(b). Wording only. |
| N-5 | Info | 23 constraint sites survive mutation, and every one is shadowed by another rule (§1). Root `type: object` in SEC and AUD is the only one that is not strictly redundant, and it carries no weight. |

No finding is stop-the-line. The PR changes no rule, no migration and no runtime path. It introduces no
secret, no tenant leak and no contract mismatch. The secret scan passed at the head and at the trial merge.

## 4. Open items that stay open, and whose they are

These items are recorded in `open_blockers` and `required_human_authorities`. None of them is this
PR's to close, and none of them blocks a Draft-level merge:

- the narrow RFC of A1 §4(c), owed by A0 as owner of CTR-MOD-001; it includes the disclosure to the
  Product Owner (F5) and the C3 `maxLength` closure;
- the handle issuance format (C2), the SEC-003 data class and the SEC-016 break-glass fields, owed by A1;
- the OB-006 per-label budget, owed by A6; audit immutability, owed by A0+A6 and A1;
- the runtime redaction tests named by DR 5.2, and the other `untestable_by_fixture` properties;
- the 22 unbounded reference fields (N-2), owed by this package's Author in a later increment.

## 5. Verdict

**review_approved_with_conditions.**

All eight of my required changes at `a690f11` are closed and measured closed. Item 7 is closed by A1's
later disposition, which governs it. The increment is text-only, and I proved that by rule equivalence.
Every correction quotes its source accurately where I re-read it. Constraint coverage went from 16 to
19 % up to 86 to 93 %, and every surviving site is shadowed. The conditions are N-1, which is merge
mechanics, and N-2, a record refresh. Both belong to the Author's merge-from-`main` increment.

- **Stop-the-line:** no.
- **Does anything block the merge:** yes, but none of my content findings. N-1 blocks it: the PR
  conflicts with `main` and has no CI run at its head. The merge also still needs the verdicts that are
  not mine: A1's security re-check at the new head, Q0's first test verdict, R0's first integration
  verdict, and a green `bootstrap` run. With those in place and N-1 resolved without content change,
  this verdict carries to the merge-from-`main` head. A change to any `contract-catalog/**` file would
  need a C0 re-check.
- This file is committed in its own commit. It is not pushed.

Attested by `/claude/c0_contract_reviewer` against `23eb05570ae2c6b4afba8f7346430af66989855a`.
