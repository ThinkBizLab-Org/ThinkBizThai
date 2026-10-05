# WP-0A-CON-005 — Independent Tester re-verification, 2026-10-05

Package: CTR-JOB-001 reference-field hardening
Tester run: `/claude/q0_sentinel` (declared `role_assignments.tester_agent_run_id`)
Author run under test: `/claude/a0_atlas`, a different run, so role separation holds.
Subject: PR #187, branch `agent/claude/WP-0A-CON-005-job-reference-hardening`, head
`e7d5e6ed2c6fb9fce8532bf507363e4ce98f466b` (work `efbaf70`, handoff `e7d5e6e`), cut from `main` `600b48b`.
Earlier verdict re-checked: `evidence/WP-0A-CON-005/test-verdict.md` (attested `b47aece`,
`test_verified_with_conditions`).
Protocol version: `1.0.0`.

## 0. What I am

I am a subagent spawned by `/claude/a0_atlas`, the Author run of this package, acting in the
Tester role `/claude/q0_sentinel` under RFC-2026-024 §3/3-4. A0 computed the task text. It
gave me no verdict to reach and I took none of its claims as given: every "done" item in its
report was checked against the tree or re-run. I share a vendor and a model with the Author.
RFC-2026-024 withdrew the cross-vendor condition and the Owner applied that to this package
on 2026-10-05 (step 2 item 1). I am not the Reviewer, the Security reviewer or the Integration
Owner. This file authorizes no merge and no gate movement. I fix nothing.

Toolchain: `node v24.20.0`, `npm 11.19.0` (from `.node-version`, on `PATH`). Nothing was
downloaded except the clone of this repository. No database was started; port 5503 was not
used, because the package declares no database test and its declared commands needed none.

## 1. Measured vs read

**Measured** (run by me, this session):

- A private clone checked out **on the branch name**
  (`git clone --branch agent/claude/WP-0A-CON-005-job-reference-hardening`) in
  `/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/q0-con005/repo`.
  `HEAD` = `e7d5e6e…`, `git branch --show-current` = the branch name. Not detached.
- Every declared command (§2), `check:handoff`, the branch-identity guard, the branch-scope
  guard against two bases, and role separation.
- A disposable copy of that clone with `origin/main` (`e1fa28e`) merged in, to see what the
  branch needs before it can be merged (§4).
- An independent probe script over the head tree: pattern byte-equality, catalog tally,
  integrity-manifest digests, and a 44-form × 2-field hostile matrix (§3).
- A mutation run of the new membership assertion, 13 mutants (§3.3).
- The GitHub check run on the PR head (`gh run view 37343765494`).

**Read, not re-measured:** the Author's closure record
(`author-conditions-closure-2026-10-05.md`) for its mutation run and for the `600b48b` "2 fail
before refresh" baseline. I reproduced the mutation result myself (§3.3). The baseline is
moot, because the run at the head is green. I also read the Owner's step-2 disposition on
`main`, to confirm that the three items the manifest cites say what the manifest says they say.

## 2. Declared tests at the head (clone on the branch name)

| Command | Exit | Result |
|---|---|---|
| `npm run check` | **`0`** | **691 tests, 691 pass, 0 fail, skipped 0, todo 0**; one summary in the stream; 0 `✖` lines |
| `node --test test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` | `0` | 6 / 6, skipped 0, todo 0 |
| `node --test test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | `0` | 6 / 6, skipped 0, todo 0 |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `0` | 6 / 6, skipped 0, todo 0 |
| `node scripts/verify-test-coverage-floor.mjs` | `0` | |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-005.json` | `0` | |
| `npm run check:handoff` | `0` | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-CON-005-job-reference-hardening` | `0` | resolves `WP-0A-CON-005` |
| `node scripts/verify-branch-scope.mjs 600b48b WP-0A-CON-005` (true merge base) | `0` | "all 7 changed path(s) are declared, and every amendment explains one" |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-005` (`e1fa28e`, the PR's current base) | **`73`** | 11 undeclared paths, **all of them `main`'s own changes since `600b48b`** (§4, N1) |

691 equals `evidence/VERIFICATION.md` (691/691) and the Author's count at `600b48b`. The branch
adds no test, it adds one assertion inside an existing test, so the count is not expected to move.

## 3. Earlier conditions, re-verified

### 3.1 The earlier §9 items

| Earlier item | Now | How I know |
|---|---|---|
| §9(1) 91 should be 93, baseline 85 should be 87 | **Closed** | `author-self-check.md` §6 now reads 87 → 93, with a dated correction note. RFC-2026-006 "Verification" keeps 93 and scopes it to `64d9c65`. Both figures match my earlier measurement. |
| §9(2) integrity-manifest arithmetic | **Closed** | §7 now reads 27 pre-existing, 26 unchanged, 28 after. That is what I measured at `b47aece`. |
| §9(3) no `maxLength` on any `_ref` | **Closed (by a later package, already in `main`)** | `input_ref` / `result_ref` carry `maxLength: 256`. Probe: 256-char reference ACCEPTED, 257 rejected, my old T7 (8198 chars) **now rejected** on both fields. CTR-NTF-001 `target_ref` is still unbounded. It is referred to its owner (`open_blockers[13](b)`), and I agree that it is outside this package. |
| §9(4) redundant lookaheads | **Closed** | All five reference patterns in the tree (job ×2, idm ×1, api ×2) are lookahead-free and **byte-equal** to the pattern RFC-2026-006 Decision 2 now prints. `authorized_cross_package_amendments[0]` prints the same bytes. The only `(?!` left in the RFC is in the dated history note, which is correct. `64d9c65` (2026-09-01) predates the approval `82aae60` (2026-09-02), as the RFC now says. |
| §9(5) `isPrivateRef` | **Closed as to behaviour; text divergence referred** | Recorded as owed to WP-0A-CON-001/002 (`open_blockers[13](c)`). It is not in this package's writable paths. |
| §9(6) `$` dialect dependency | **Open, carried, correctly** | It is a porting note. My T8 (trailing `\n`) and T9 (`\n` + URL) are still rejected under ECMAScript at this head. |
| §9(7) `acknowledgement_status` read only as an enum | **Open, carried, wording narrowed** | `open_blockers[1]`. Not this package's to close. |
| §9(8) reconstruction caveat | **Open, for R0** | It remains a cheap `git show b47aece^` for the Integration Owner. |

### 3.2 The fix still holds at the head (independent probe)

Repository validator `test-kits/contracts/json-schema-subset.mjs`, `ctr-ten-001` `$ref`
resolved, the shipped `valid.json` as control (0 errors). Each form was placed on `input_ref`
and `result_ref` in turn. **No rejection was attributable to any other field** (0 foreign
errors).

| Set | Forms | Probes | Accepted |
|---|---|---|---|
| Author set A1–A13 (my earlier ids) | 13 | 26 | **0** |
| My earlier extended set T1–T16 incl. T6b | 17 | 34 | **0** (T7 now rejected: `maxLength`) |
| WHATWG-special schemes **without** `//` (`http:`, `https:`, `HTTPS:`, `ws:`, `wss:`, `ftp:`, `file:`, `data:`, `blob:` + accepted body) | 9 | 18 | **0** |
| Length edge 256 / 257 | 2 | 4 | 2 (256 only, as specified) |
| Controls (`asset:…`, `result:…`, `job:input.payload`) | 3 | 6 | 6 |
| **Total** | **44** | **88** | **8**, all of them controls or the 256-char edge |

### 3.3 The new membership assertion (C0 C3) bites, and only where it claims to

Disposable copy of the tree. Each mutant widens the scheme alternation `^(job|…` to
`^(<scheme>|job|…`, then the guard file is run:

| Mutant | Guard |
|---|---|
| `+http`, `+https`, `+ws`, `+wss`, `+ftp`, `+file`, `+HTTPS` (both fields) | **exit 1**, 5 pass / 1 fail, failing test "neither reference field carries a deny-list, and both carry the recorded rule" |
| `+https` on `input_ref` only, and on `result_ref` only | exit 1 (also caught by the pre-existing pattern-equality assertion) |
| `+data`, `+javascript`, `+blob`, `+synthetic` (both fields) | **exit 0**, 6 / 6, **not caught** |
| restored | exit 0, 6 / 6 |

The assertion does what the Author and the RFC Limitations say it does, and nothing more. 7 of
7 listed mutants are killed. Schemes outside the WHATWG special list survive. The RFC states
this ("Schemes outside that list are not covered"), so it is a disclosed limit and not a defect
(N3).

### 3.4 Other Author claims checked

| Claim | Result |
|---|---|
| `index.json` at the head reports 9 Candidate / 5 Draft, and CTR-JOB-001 is `1.0.0` / `Candidate` | **True** (14 contracts). The time-stamped Decision 4 / acceptance criterion 7 text is accurate. |
| Integrity manifest: "91 digests rebuilt, exactly two entries changed" | **True.** 91 entries, 91 match over file bytes, 0 mismatch. The diff vs `600b48b` changes exactly the RFC-2026-006 and the guard-test lines. |
| Branch changes only declared paths | **True against `600b48b`** (7 paths, scope guard exit 0). No contract-catalog, script, CI or `docs/**` file is touched. |
| `prefer_cross_vendor_review=false`, rewritten exception, successor named, `product_reviewer_note` | Present. The text matches `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` §3 rows 1–3 on `main` (the Owner's literal reply `บืนยันขั้น 2`, a typo for "confirm step 2", line 83). The manifest correctly says naming a successor **is not** the acknowledgement. |
| Both `x-amended-by` records still `pending`, still naming `/root/r0_steward` | **True.** Nothing countersigned. |
| status | `in_review`, unchanged. Validators exit 0. |
| `open_blockers` count | 15, matching the closure record's triage. |

## 4. New findings at this head

**N1 — CI is red on the PR head, and the branch is behind `main`. Merge-blocking. Not stop-the-line.**
GitHub check run `37343765494` (event `pull_request`, head `e7d5e6e`, base SHA `e1fa28e`)
concluded **failure** at the step "Verify branch scope", exit **73**, listing 11 paths. I
reproduced it exactly in the branch-name clone. All 11 are files PR #186 merged into `main`
after this branch was cut at `600b48b` (`evidence/WP-0A-A0-001/*-2026-10-05.md`,
`evidence/g0-tracker-th.md`, `handoffs/WP-0A-A0-001-author-handoff.json`, `work-packages/WP-0A-A0-001.json`,
`WP-0A-CON-002.json`, `WP-0A-CON-003.json`, `WP-0A-CON-006.json`). The guard diffs
`${BASE_SHA}..HEAD` two-dot, and CI checks out the branch tip, not the merge commit. A branch
behind its base therefore reports the base's own progress as out-of-scope changes. GitHub
reports `mergeStateStatus: BEHIND`, and `ci.yml` itself says a head must already contain `main`
to merge. Nothing in the package is out of scope: against the true merge base the guard is
exit 0. **Remedy (the Author's):** bring `main` into the branch, re-cite the handoff last and
alone, and push. A green CI run on that new head is owed. My trial merge in a disposable copy
merged **without conflict**, after which the scope guard against `e1fa28e` reads **exit 0, all
7 paths declared** (§5).

**N2 — The branch cites a file it does not contain. Low; resolves with N1.**
`work-packages/WP-0A-CON-005.json` (`role_assignments.product_reviewer_note`,
`independence.cross_vendor_exception`, `required_human_authorities[1]`, `open_blockers[0]`) and
the closure record cite `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md`.
That file is **absent at `600b48b` and at `e7d5e6e`** and exists only on `main` (from #186).
The closure record discloses that it was read from #186's branch. No guard checks it, and the
citation becomes true when `main` is merged in (N1). Until then, a reader of this branch alone
cannot follow the Owner citation.

**N3 — The membership assertion covers 6 schemes, not the set. Informational; disclosed.**
§3.3. `data:`, `javascript:`, `blob:` or any invented scheme could be added to the allow-list
with the guard green. The RFC Limitations state it, and the scheme set is the contract owner's
(blocker 8). I record the measurement so R0 knows the exact boundary.

**N4 — `x-amended-by[1].change` text on `ctr-job-001/schema.json` no longer describes the field alone. Informational, not this package's file.**
The record says "Only those two reference constraints changed". At the head, the same two
properties also carry `maxLength: 256` and an `x-minlength-note` (with `minLength` removed),
added by later packages. Each later change belongs to its own package's record. The sentence
is true of what WP-0A-CON-005 did, so this is not a defect here. It is mentioned because
`/claude/r0_steward` will read that record when acknowledging it, and should not read it as a
description of the field's current state.

No other change. I found no regression, no secret, no out-of-scope edit against the true base,
and no behaviour change to any contract on this branch: the branch touches no
`contract-catalog/**` file.

## 5. Trial merge with `main` (disposable copy, not pushed)

`git merge origin/main` into a copy of the branch-name clone: **no conflict**. On the merged
tree, on the branch name:

| Command | Exit | Result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs e1fa28e WP-0A-CON-005` | `0` | all 7 changed paths declared |
| `npm run check` | **`0`** | 691 tests, 691 pass, 0 fail, skipped 0, todo 0 |

The merge commit was local to the disposable copy (author `q0`, never pushed). The handoff
guard inside `npm run check` stayed green with that merge commit after the handoff commit. The
remedy for N1 is therefore mechanical, and once it lands the measured content of this package
does not change. Whether the Author re-cites the handoff after the merge is the Author's call
under the repository's protocol, and `check:handoff` on the real new head is the test of it.

## 6. Stop-the-line?

**No.** Nothing at this head is a secret exposure, tenant leak, duplicate side effect, lost
job, migration divergence, irreversible deletion or contract mismatch. N1 is a red required
check caused by staleness against `main`, not by the package's content.

## 7. Does anything block the merge?

Yes. None of it is a Tester condition on the work itself:

1. **N1:** CI on the head is red. The branch must take `main` and get a green run on the new head.
2. The Reviewer (`/claude/c0_contract_reviewer`) and Security (`/claude/a1_bastion`) re-checks
   of the closure are owed. Only those runs can lift their conditions.
3. `/claude/r0_steward`: the CTR-JOB-001 acknowledgements (two `pending` `x-amended-by`
   records), the integrity-manifest acknowledgement, the blocker-4 disposition, and the
   Integration verdict.
4. The PR changes an RFC, so under RFC-2026-025 §5 item 6 the Product Owner merges it.
5. If N1's remedy moves the head, this attestation covers the **content** of `efbaf70`.
   That content is unchanged by a clean merge of `main`, which touches no file of this
   package (§5). R0 should confirm that the new head's diff against `main` is the same 7 paths.

## 8. Verdict

My earlier conditions §9(1) and §9(2) are **closed**. §9(3) and §9(4) are **closed** in the
tree. §9(5)–(8) are correctly carried as owed elsewhere or for R0. The declared tests pass at
the head on the branch name (691/691, skipped 0, todo 0), the fix holds against 44 forms on
both fields, and the new membership assertion is observed to kill the 7 mutants it claims and
no others. The new findings are N1 (red CI from staleness, merge-blocking, the Author's to
fix), N2 (a citation that resolves with N1), and the informational N3 and N4.

This is independent Tester evidence only. It does not review, security-approve, integrate,
approve Gate G0, or authorize a merge.

VERDICT: test_verified_with_conditions
