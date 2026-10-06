# WP-0A-CON-004: Independent Tester verdict at the 2026-10-06 head

Package: Secret handle, audit event and observability contracts
Tester run: `/claude/q0_sentinel` (declared `role_assignments.tester_agent_run_id`)
Author run under test: `/claude/a0_atlas`, a different run.
Subject: PR #196, branch `agent/claude/WP-0A-CON-004-security-audit-observability`, head
`23eb05570ae2c6b4afba8f7346430af66989855a`. The branch was cut from `8c089cc`. Since then `origin/main` has
moved to `fa102298aa71ef5031c644501a42e50a7eb953b6` (PR #188 merged), so **the PR is behind `main`**. See F-1.
Earlier verdict re-checked: **none exists.** No Q0 file has ever been written for this package. The
manifest's open_blockers[15], the Author's closure record §0 and `evidence/g0-tracker-th.md` line 200
("ไม่มี Q0") all say so, and `git log --all -- evidence/WP-0A-CON-004/` confirms it. This is therefore the
**first** Tester verdict on WP-0A-CON-004. The file name follows the orchestrator's instruction. The
measurements were made on 2026-10-06.
Protocol version: `1.0.0`. Gate: G0. Synthetic only: no provider, no credentials, no database.

## 0. What I am

I am a subagent spawned by `/claude/a0_atlas`'s workflow orchestration, running as the Tester role
`/claude/q0_sentinel` under RFC-2026-024 §3/3-4. The run that spawned me is this package's Author. Every
assigned role run on this package uses the same vendor and model. Since the Product Owner's step-2 answer of
2026-10-05 (recorded in the manifest's `cross_vendor_exception`), that is no longer a recorded exception for
this package. The reader should still know that the Author's workflow launched the Tester. What keeps this
run independent is how it worked: I re-derived every figure below on a private clone, and I copied no
number from the Author's files. I do not fix anything. I wrote this one file and nothing else.

**This file is independent Tester evidence only.** It is not the contract re-review (C0), the security
verdict (A1) or the integration verdict (R0). It authorizes no merge and no gate movement.

## 1. Measured versus read

| Measured by this run | Read, not re-measured |
|---|---|
| every command in §2, with exit codes, at `23eb055` on the branch name | C0's and A1's own judgement of whether each text correction is *adequate* prose. I checked that each one says what the closure record claims and that its cited source line exists. |
| that the three schemas are rule-identical to `8c089cc` once `x-*` annotations are removed, and that each manifest changes `freeze_boundary` only (§3) | the Owner's step-2 words quoted in the manifest |
| 16 mutations plus a control at `23eb055`, and 6 rule mutations plus a control on the merged state (§4) | A1's 15-credential scanner measurement quoted in open_blockers[1] |
| a simulated merge of `23eb055` into `fa10229`, its one conflict, and `npm run check` on the result (§5) | GitHub's reason for not running CI. I read the PR state and the run list (F-2). |
| the 22 owed fields, in `KNOWN_UNBOUNDED` as merged on `main` | |
| C3: `ctr-mod-001` `secret_handles.items` has no `maxLength`, and `ctr-sec-001` `handle` has `maxLength: 128` | |
| the cited sources: `docs/plans/meta-security-production-ops-workstream-th.md:322` (the SEV-2 row), line 191 (the legal note), and `ctr-idm-001/schema.json` `result_ref` `maxLength: 256` | |

The private clone is at
`/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/q0-WP-0A-CON-004/clone`.
It was checked out **on the branch name** with its upstream set (`git status -sb`:
`## agent/claude/WP-0A-CON-004-security-audit-observability...origin/agent/claude/WP-0A-CON-004-security-audit-observability`).
The handoff guard skips on a detached HEAD, so a detached checkout would have read a false green. I used two
throwaway copies of that clone, `mut/` for mutations and `mclone/` for the merge simulation. No database was
started, and port 5583 was not used. Nothing this package declares needs a database.

## 2. Declared commands, at `23eb055`, on the branch name

| Command | Result |
|---|---|
| `node --version` / `npm --version` | `v24.20.0` / `11.19.0` (`.node-version` says `24.20.0`) |
| `npm ci` | exit `0` |
| `npm run check` (`deterministic_commands.verify`) | exit `0`: `tests 692, pass 692, fail 0, skipped 0, todo 0` |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | exit `0`: 6/6, 0 skipped, 0 todo |
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` | exit `0`: 6/6, 0 skipped, 0 todo |
| `node scripts/validate-work-package-ownership.mjs work-packages` | exit `0`, no output |
| `node --test test-kits/contracts/catalog-registry.test.mjs` (the amended kit) | exit `0`: 15/15 |
| `node --test test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs` | exit `0`: 8/8 (this is the **pre-#188** version of the kit, the one on the branch) |
| `node --test test-kits/contracts/schema-mutation-coverage.test.mjs` | exit `0`: 10/10 |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-004.json` | exit `0` |
| `npm run check:handoff` | exit `0`: `handoffs/WP-0A-CON-004-author-handoff.json describes the branch: nothing substantive after its cited head` |
| `node scripts/verify-branch-scope.mjs 8c089cc WP-0A-CON-004` (merge base, as CI passes `BASE_SHA`) | exit `0`: `all 12 changed path(s) are declared, and every amendment explains one` |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-004` | exit `73`: it lists 25 paths that came from #187/#188 on `main`. This is only an artifact of `main` having moved; it is not a scope violation by this branch. Recorded so that nobody reads the red as one. |
| `npm run scan:secrets` | exit `0` |
| Handoff commit `23eb055` | changes `handoffs/WP-0A-CON-004-author-handoff.json` only, and it is the last commit ("last and alone" holds) |
| GitHub CI on PR #196 | **no checks reported** (`gh pr checks 196`). PR state: Draft, `OPEN`, `mergeable: CONFLICTING`, `mergeStateStatus: DIRTY`. The newest CI run on this branch is `33818297523` (2026-09-03, an older head). See F-2. |

## 3. Was the increment really text-only?

I wrote my own comparator. It parses each schema at `8c089cc` and at `23eb055`, removes every `x-*` key at
every depth, and compares the rest.

```
ctr-sec-001 schema minus x-* identical=true  x-annotations 19 -> 19
ctr-aud-001 schema minus x-* identical=true  x-annotations 20 -> 21
ctr-obs-001 schema minus x-* identical=true  x-annotations 17 -> 19
manifests: only freeze_boundary changed, in all three
```

No rule, enum, requiredness, bound, `$ref` or freeze level moved. That matches the closure record §0 and the
`amends_without_owning` rationale. The annotation deltas (+0, +1, +2) match the moved count pins in
`catalog-registry.test.mjs`: SEC 21→21, AUD 22→23, OBS 19→21. The registry also counts annotations outside
`x-*` properties, which is why its absolute numbers differ from mine.

The cross-package amendment is what the manifest declares, and nothing more. `catalog-registry.test.mjs`
changes six pins: three `freeze_boundary` digests and three annotation count/digest pairs. Every other line
is unchanged. `integrity-manifest.json` changes exactly one digest, the one for `catalog-registry.test.mjs`.

**C0's and A1's conditions, spot-checked against the bytes.** I checked these for existence and accuracy
only. Adequacy is for C0 and A1 to judge.

| Condition | What I found at `23eb055` |
|---|---|
| M1 (OBS `dependencies` x-source) | quotes the SEV-2 row verbatim. The row exists at `meta-security-production-ops-workstream-th.md:322`, "degraded provider, queue delay, one format unavailable", and it draws no degraded/unavailable distinction. |
| M2 (readiness x-source) | now says the register NAMES the contract. |
| M3 (OBS `freeze_boundary`) | the reason is a declared inference from MR-006, and the text says MR-004 does not mention one |
| M4 (SEC-009 "why") | `allOf[0]` x-rule, `revocation` x-source and SEC `freeze_boundary` all say SEC-009 = actor and correlation, with the reason inferred from OB-005 |
| M5 (legal note) | `retention.x-source` describes line 191 accurately: legal, tax and incident-notification confirmation, no retention period named |
| change 5 (unsourced bounds) | `reason_key` x2, `policy_ref`, `before_ref`/`after_ref` and `liveness.status` each carry a declared-inference note. The 256 precedent exists: `ctr-idm-001` `result_ref` `maxLength: 256`. |
| change 6 (redaction) | the text says "producer self-attestation, NOT evidence…" in both `freeze_boundary` and `redaction.x-source` |
| change 7 (ownership) | "for the A1 owner to resolve" appears 0 times in `ctr-sec-001/` |
| change 8 (self-check heading) | corrected, with a dated note |
| A1 C3 (composition) | "the two contracts compose" survives only as an explicit withdrawal. The fact behind it is true: `ctr-mod-001.secret_handles.items` is `{type, pattern}` with no `maxLength`. |
| 22 owed fields | match `KNOWN_UNBOUNDED` on `main` `fa10229` name for name: SEC 8, AUD 4, OBS 10 |

## 4. Mutation campaign

`mutate.mjs` (in the scratchpad) applies each mutation to a fresh working tree, runs all
`test-kits/contracts/*.test.mjs` (79 tests), records the failing test names and the first assertion
message, and then restores the tree with `git checkout -- . && git clean`. The control passes 79/79 before
the campaign starts.

### Aimed at this increment (text and pins), at `23eb055`

| # | Mutation | Caught by |
|---|---|---|
| A1 | SEC `freeze_boundary` reverted to `8c089cc` | `a caveat cannot be replaced by its opposite`: `caveat text that changed without being written down` |
| A2 | OBS `freeze_boundary` reverted (re-asserts "MR-004 requires a reason") | same |
| A3 | AUD `freeze_boundary` reverted (old legal-note wording) | same |
| A4 | SEC `allOf[0]` x-rule reverted (SEC-009 cited for "why", i.e. M4 re-opened) | `an annotation cannot be rewritten, deleted or added without being written down` |
| A5 | SEC `handle` x-source reverted ("compose" justification re-asserted, i.e. C3 re-opened) | same |
| A6 | OBS `liveness.status` x-source deleted | same |
| A7 | AUD `policy_ref` `x-maxlength-note` deleted | same |
| A8 | OBS `dependencies` x-source reverted (M1 re-opened) | same |
| A9 | the six pins reverted, with the new text kept | both pin tests (2 failures) |

Every text closure is held by a pin. If someone silently undoes the correction, the suite goes red. That is
as much as a test can do for prose. A pin cannot tell whether the new prose is *true*; §3 checks that.

### Rules, at `23eb055` and on the merged state

| # | Mutation | At `23eb055` | Merged with `fa10229` |
|---|---|---|---|
| R1 | SEC `handle` `maxLength` 128 → 200 | caught: 5 tests, including `invalid-handle-too-long` conformance | caught, same 5 |
| R2 | AUD `reason_key` `maxLength` deleted | caught: constraint-value pin and fixture conformance | caught, **plus** the #188 ratchet: `… not recorded in KNOWN_UNBOUNDED: ctr-aud-001.reason_key` |
| R3 | OBS `depends_on_external_provider` `const false` → `boolean` | caught: 5 tests, including fixture conformance | caught, same |
| R4 | SEC `revocation.required` loses `reason_key` | **caught only by the generic pin** `no constraint value changes without the change being written down` | same. See O-2. |
| R5 | an owed field bounded (`ctr-sec-001.correlation_id` `maxLength 128`) | caught by the coverage floor and the pin | caught, **plus** `KNOWN_UNBOUNDED names field(s) that are now bounded or gone; remove them from the list: ctr-sec-001.correlation_id` |
| R6 | OBS `liveness.status` enum gains `degraded` | caught only by the generic pin | same |
| F1 | `invalid-revoked-still-resolvable.json` made valid | caught: `ctr-sec-001/examples/invalid-revoked-still-resolvable.json is named invalid but its schema accepts it` | not re-run (fixture unchanged by the merge) |

**Tally: 16 of 16 caught at `23eb055`, and 6 of 6 rule mutations caught on the merged state. The control
passes both times.** R4 and R6 are caught, but only by the repository-wide constraint pin and not by a
behavioural fixture. R5 shows that the #188 ratchet will hold this package to its 22 owed bounds once the
branch carries #188.

## 5. Merge with current `main`

`git merge-tree --write-tree origin/main 23eb055` gives **CONFLICT (content) in
`test-kits/integrity-manifest.json`**. This branch changes the `catalog-registry.test.mjs` digest on line 71.
#188 changes the two adjacent digests, `ctr-evt-001-schema-ref-bounds.test.mjs` and
`ctr-job-001-reference-hardening.test.mjs`. The hunks touch, so git cannot merge them.

In the throwaway copy only, I resolved the conflict by taking the union: this branch's `catalog-registry`
digest plus `main`'s two digests. The JSON parses. On that merged tree:

| Command | Result |
|---|---|
| `node --test test-kits/contracts/*.test.mjs` | 79/79, 0 skipped, 0 todo |
| `npm run verify:coverage-floor` | exit `0` |
| `npm run check` | exit `0`: `tests 692, pass 692, fail 0, skipped 0, todo 0` |

So the union resolution is correct and the merged tree is green. But it is **my** resolution, in a copy.
Nothing on the PR branch does this yet.

## 6. Findings

**F-1 (merge-blocking, not stop-the-line): PR #196 does not merge into current `main`.** `main` moved from
`8c089cc` to `fa10229` (#188) after the branch was cut. The integrity-manifest digests conflict (§5).
GitHub reports `CONFLICTING` / `DIRTY`. Only the Author can fix this, by refreshing the branch from `main`
inside its declared paths. §5 shows that the union is the correct resolution and that the result is
692/692 green.

**F-2 (merge-blocking): no CI run exists for head `23eb055`.** `gh pr checks 196` reports no checks, and the
newest run on this branch is from 2026-09-03. The cause is probably the conflict (F-1), because a
`pull_request` run needs a mergeable merge ref; I did not verify the cause. RFC-2026-002 requires a green
required CI run on the head commit before a merge.

**F-3 (record, non-blocking): open_blockers[14] is now out of date.** It says the 22 bounds are owed "after
#188 merges", and that bounding before that "would make its KNOWN_UNBOUNDED entry stale". #188 is now on
`main`, so that reason for waiting has lapsed. Bounding the 22 fields is still a rule change that needs its
own role round, and the Author scoped it out of this increment. That scoping is legitimate. The sentence
just needs to say the precondition is met. R5 shows that the ratchet on `main` will enforce the list once
the branch carries it.

**O-1 (observation): the handoff and the closure record cite `8c089cc` as the base.** They were accurate
when written. After the refresh in F-1 they will need the new base, and the handoff guard will have to be
re-run on the branch name.

**O-2 (observation, owed at the next rule round, not by this text increment):
`ctr-sec-001.revocation.required` contains `reason_key`, the rule this increment re-sourced to OB-005 (M4),
and no fixture defends it.** `invalid-revocation-required.json` omits `revoked_at`, not `reason_key`.
Dropping `reason_key` from `required` (R4) is caught only by the generic constraint-value pin. The same is
true for the `liveness.status` enum (R6). The pin is enough to stop a silent change, but it does not
demonstrate the behaviour. This is not a regression; both were already true at `8c089cc`.

**Nothing found that is stop-the-line.** No secret, no tenant data and no real credential appear anywhere.
The secret scan passes, and the increment adds no fixture.

## 7. Verdict

**`test_verified_with_conditions`** for head `23eb05570ae2c6b4afba8f7346430af66989855a`, which is the first
Tester verdict on this package.

What is verified:
- The increment is text-only (§3).
- Every C0 and A1 condition the Author claims to close is present in the bytes, and each cited source exists.
- Each closure is held by a pin that fails when the closure is undone (§4 A1–A9).
- The declared commands are green on the branch name (§2).
- The merged-with-`main` tree is green under the union resolution (§5).

Conditions before merge:
1. **(F-1)** The Author refreshes the branch from `main` `fa10229` or later and resolves the
   `integrity-manifest.json` conflict. The resolution must not drop either side's digest.
2. **(F-2)** A green required CI run exists on the resulting head commit.
3. **(F-3, O-1)** The base revision and the stale "#188 not merged" sentence are corrected in the record
   when the branch is refreshed.

If the refresh changes only the merge resolution and those record lines, it does not need a new Tester
campaign. A short re-run of §2 on the new head is enough. A change to any rule does need a new campaign.

Stop-the-line: **no.** Blocks the merge: **yes.** F-1 and F-2 block it. Separately, the package is still
`in_review`, and it still owes a C0 re-review, an A1 security verdict and an R0 integration verdict. This
Tester verdict substitutes for none of them.
