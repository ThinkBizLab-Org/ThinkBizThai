# WP-0A-CON-005: Independent Reviewer re-verification (contract and architecture), 2026-10-05

Package: CTR-JOB-001 reference-field hardening
Subject: PR #187, branch `agent/claude/WP-0A-CON-005-job-reference-hardening`,
head **`e7d5e6ed2c6fb9fce8532bf507363e4ce98f466b`** (`efbaf70` work + `e7d5e6e` handoff, last
and alone), cut from `main` `600b48b`.
Earlier verdict re-verified: `evidence/WP-0A-CON-005/review-contract-c0.md` §8,
`review_approved_with_conditions`, conditions C1-C4.

## 0. What I am

I am a subagent spawned by the workflow of `/claude/a0_atlas`, acting in the declared Reviewer
role `/claude/c0_contract_reviewer` (`work-packages/WP-0A-CON-005.json`
`role_assignments.reviewer_agent_run_id`), as RFC-2026-024 §3/3-4 requires every role file to
disclose. The Author run is `/claude/a0_atlas`; the work under review was written by a different
subagent of that run. I authored, tested and integrated none of it, and I do not fix: this file
is the only thing I write. Same vendor and model as the Author (`claude-opus-5.5`); the Owner
withdrew the cross-vendor condition for this package on 2026-10-05 (step 2 item 1), so this is a
distinct same-vendor run in a named role, which carries the correlated-blind-spot caveat my
earlier file stated.

This is independent Reviewer evidence only. It approves no gate, authorizes no merge, moves no
status and countersigns no acknowledgement.

## 1. Measured vs read

**Measured** (executed by me, outputs below): the full declared suite on the branch name in a
private clone; the handoff guard; the scope guard against both bases; the role-separation
validator; the standing guard; byte equality of every printed pattern against the tree; a
13-case mutation run against the new assertion on a disposable copy; the merge result of the
head with current `origin/main`; the catalog tally; commit ancestry; the PR's CI result.

**Read, not measured**: the Owner's step-2 disposition (cited by path, not re-litigated); A1's
and Q0's verdict files (only to check that the closure record quotes them correctly);
RFC-2026-025 §5 (read to confirm the governance-PR merge rule).

**Environment.** Node `v24.20.0` / npm `11.19.0` at `/Users/bank/.local/node-v24.20.0/bin`.
The branch name is held by another worktree, so I made a private clone in my scratchpad, checked
out the branch **by name** at `e7d5e6e`, re-pointed `origin` at GitHub and fetched (so
`origin/main` = `e1fa28e`, the current `main`). One clone artifact had to be corrected before the
handoff guard could be read honestly: the clone's `origin/HEAD` pointed at the PR head, which
makes the guard compute the branch point as the head itself and print a false "not on this
branch's side" message. After `git remote set-head origin main` the guard reads the true branch
point. No database was used; the package has none.

## 2. Declared tests, re-run at `e7d5e6e`

| Command | Exit | Result |
|---|---|---|
| `npm run check` (on the branch name) | `0` | tests 691, pass 691, fail 0, cancelled 0, skipped 0, todo 0 |
| `npm run check:handoff` | `0` | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs 600b48b WP-0A-CON-005` | `0` | "all 7 changed path(s) are declared, and every amendment explains one" |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-005` (`e1fa28e`) | **`73`** | 11 paths "neither owns nor records": exactly the files PR #186 brought to `main` after this branch was cut (§4 N1) |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-005.json` | `0` | |
| `node --test test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` | `0` | 6 / 6, skipped 0, todo 0 |

`evidence/VERIFICATION.md` on the branch records the same 691 / 691. The Author's handoff cites
`efbaf70` with base `600b48b`; `git diff --name-status 600b48b efbaf70` lists exactly the seven
files the handoff names (one added, six modified, none deleted).

**Merge result with current `main`.** `git merge-tree --write-tree origin/main HEAD` is clean
(tree `5e3e7bd`). On an archive of that tree: `verify-test-coverage-floor` exit `0`,
`validate:protocol` exit `0`, `scan:secrets` exit `0`, all contract suites
`node --test test-kits/contracts/*.test.mjs` 79 / 79. The PR and #186 touch disjoint files.

**CI at the head.** Run `37343765494`, job `bootstrap`: **FAILURE**, step "Verify branch scope",
exit 73, `BASE_SHA` = `e1fa28e`. Its eleven paths are the eleven I reproduced above.
`mergeStateStatus` is `BEHIND`.

## 3. My earlier conditions

| Condition | State | Evidence |
|---|---|---|
| **C1** (F1): Decision 2 and `authorized_cross_package_amendments[0]` print a pattern the tree does not carry | **Lifted** | The pattern printed in Decision 2 is **byte-equal** to `ctr-job-001` `input_ref` and `result_ref`, `ctr-idm-001` `result_ref`, and `ctr-api-001` `accepted.status_ref` and `accepted.deep_link_ref` (5 of 5), and to the pattern in amendment entries [0] and [7]. The "removed ... before approval" history is true: `64d9c65` (2026-09-01) is an ancestor of `82aae60` (2026-09-02). |
| **C2** (F2, F3): Decision 4 tally; `ctr-evt-001` paragraph; blockers 10 and 12 | **Lifted** | Decision 4 and acceptance criterion 7 are time-stamped. Measured: 14 contracts, 9 Candidate / 5 Draft, CTR-JOB-001 `1.0.0` / `Candidate`, at the head and on the merge result. The `ctr-evt-001` Limitations bullet is struck through and the remedy that landed is cited. Old blockers 10 and 12 are gone and the closure record §2 says why. |
| **C3** (F4): the guard does not defend allow-list membership | **Lifted, by the assertion I preferred** | One assertion inside the existing test; no test added or renamed; 6 / 6. My mutations (§4, table): adding `https` to both fields, `https` to `input_ref` only, `wss` to `result_ref` only, `file`, upper-case `HTTP`, and a character-class spelling `[hH][tT]{2}[pP][sS]` are all **caught**, with the failure naming the readmitted values. Making `valid.json` invalid also fails the file, so the new assertion cannot go silently vacuous on a broken fixture. Limits in §4 N3. |
| **C4**: record the blocker triage | **Lifted** | `author-conditions-closure-2026-10-05.md` §2. I counted 15 blockers in the manifest now; the indices the closure cites (`[11]` S3/S8, `[12]` S5, `[13]` owed-elsewhere, `[14]` no Tester attestation) are the ones the manifest holds. Blocker 2 is narrowed to my measurement; blocker 13 (old) is reworded as the status/tree disagreement. |

The referred items (F5, F6, §5 `dedupe_key`, F7) are recorded in `open_blockers[13]` and `[14]`
with owners named. That is what I asked for; they were never conditions on this package.

The Author's not-done list is accurate as far as I can measure: both `ctr-api-001` and
`ctr-idm-001` still carry no `x-amended-by`; both `ctr-job-001` records still read
`acknowledgement_required_from: /root/r0_steward`, `acknowledgement_status: pending`; status is
`in_review`. Declining A1's S2 (nine paths in `amends_without_owning`) is consistent with what I
measured: the scope guard already reads `authorized_cross_package_amendments` and passes at
`600b48b`. Whether that lifts S2 is A1's call, not mine.

## 4. New findings at this head

Mutation run on a disposable copy of `contract-catalog/` and `test-kits/contracts/` (nothing in
the repository written):

```
CONTROL no mutation                                exit 0  OK (green)
N1  add `https` to both fields                     exit 1  CAUGHT
N2  add `https` to input_ref only                  exit 1  CAUGHT
N3  add `wss` to result_ref only                   exit 1  CAUGHT
N4  add `file` to both                             exit 1  CAUGHT
N5  add `HTTP` (upper) to both                     exit 1  CAUGHT
N6  add `Https` (mixed case) to both               exit 0  *** MISSED ***
N7  add `[hH][tT]{2}[pP][sS]` to both              exit 1  CAUGHT
N8  add `javascript` to both                       exit 0  *** MISSED ***
N9  add `data` to both                             exit 0  *** MISSED ***
N10 add `blob` to both                             exit 0  *** MISSED ***
N11 add `gopher` to both                           exit 0  *** MISSED ***
N12 valid.json made invalid (drop job_id)          exit 1  CAUGHT
```

### N1 — High for the merge, not for the content. CI is red at the head because the branch is behind `main`.

`main` moved from `600b48b` to `e1fa28e` (PR #186) after the branch was cut. CI's scope step
diffs `BASE_SHA..HEAD`, so the eleven files #186 added to `main` read as this branch's changes,
and it exits 73. I reproduced the same 73 locally and the same 0 against `600b48b`. The content is
not at fault: the merge is clean and the merged tree is green on every suite I ran. The cure is
the Author's: bring current `main` into the branch, refresh the handoff, and get a green run.
Until then the head fails RFC-2026-002's "green required CI run" and RFC-2026-025 §5 item 6's
"the PR's head must contain the current `main`". The Author's done-list says `check:handoff`
passed (true) and does not mention CI.

### N2 — Low, record accuracy (same class as F1). The new after-the-fact amendment records say "NOTHING ELSE", but `64d9c65` changed more.

`authorized_cross_package_amendments[7]` (`ctr-api-001`) and `[8]` (`ctr-idm-001`) say the
change was the lookahead removal and "NOTHING ELSE". The RFC's new "Scope explicitly excluded"
paragraph says the same ("the lookahead removal ... and nothing else"). `git show 64d9c65 --
contract-catalog` shows that on all three fields (`status_ref`, `deep_link_ref`, `result_ref`)
the commit **also appended a sentence to `x-reference-rule`** ("The two negative lookaheads were
removed: a 400,000-string fuzz ... closes WP-0A-CON-002 review finding R8 ..."). That is an
annotation, not behaviour, and nothing became more permissive. But the point of these entries is
to state the exact change to another package's Candidate contract, and they state less than
happened. That is the defect F1 was about. Cheap to lift, inside this package's writable paths.

### N3 — Low. The membership assertion covers lower and upper case only.

`Https:` (N6) gets through, and WHATWG URL parsing lowercases the scheme, so `Https:host/x`
resolves to `https://host/x`. Realistic edits are a literal lower-case name (caught) or a
case-insensitive spelling (N7, caught). A mixed-case literal is contrived. The RFC says "in both
cases" accurately, but a reader could take "both cases" to mean "case-insensitive". The RFC's
own hostile list already includes `HtTpS://`, so adding one mixed-case spelling to the loop
would cost one array element. **Recommendation, not a condition.**

### N4 — Informational. Non-special dangerous schemes are not covered, and this is disclosed.

`javascript`, `data`, `blob`, `gopher` (N8-N11) pass the guard if added to the set. That is
exactly the limit the RFC states ("Schemes outside that list are not covered by the assertion"),
and C3 asked for the WHATWG special schemes, which is what was delivered. I record it because
`javascript:` and `data:` are the classic deep-link hazards, and the contract owner deciding
blocker 8 should see that CI will not stop them. No action required of this package.

### N5 — Informational. "Up to 248 opaque body characters" understates the residual.

`open_blockers[12]` says a conforming reference "can carry up to 248 opaque body characters
(maxLength 256 less the scheme)". 248 is the figure for `content:`, which A1 measured. With
`job:` or `app:` the body can be 252 characters. The disclosure is in the right direction and
the referral is right, but the maximum is 252.

### Nothing else new

No change to any schema, fixture or contract-catalog file is in this PR (scope guard and
diff). The integrity manifest's two changed digests match the bytes (`verify-test-coverage-floor`
exit 0 at the head and on the merge result). The manifest's `prefer_cross_vendor_review: false`,
the new `cross_vendor_exception` text, `product_reviewer_note`, and the two rewritten
`required_human_authorities` entries cite the Owner's step-2 disposition by path. They do not
claim any acknowledgement as given. `role-separation` passes.

## 5. Stop-the-line and merge

**Stop-the-line: no.** No secret, tenant leak, duplicate side effect, lost job, migration
divergence, irreversible deletion or contract mismatch. The contract artifacts are untouched by
this PR, and what they do I re-measured in my earlier file.

**Blocks the Owner's merge: yes, today.** Items in order:

1. **N1**: CI red at the head (branch behind `main`). The Author must sync `main` and get a green
   run on the new head.
2. **Owed role evidence the Author correctly lists as not done**: a `/claude/q0_sentinel`
   re-test at the new head (F7; `test-verdict.md` still attests `b47aece`), A1's re-check of its
   own conditions, and `/claude/r0_steward`'s Integration verdict, the two CTR-JOB-001
   acknowledgements and the blocker-4 disposition. RFC-2026-002 requires them before the merge.
3. **N2**: my one new condition.
4. The merge itself is the Owner's personal act. The PR changes an RFC, so under RFC-2026-025 §5
   item 6 it is a governance PR and cannot be merged by delegation. Confirmed by reading.

A merge of `main` into the branch is not a fix commit answering a finding. I measured its result
(§2), so on its own it would not need this role to re-verify. Any other change would.

## 6. Verdict

**review_approved_with_conditions.**

My four earlier conditions C1-C4 are **lifted**, each by measurement rather than by reading the
closure record. The C3 assertion is behavioural and bites on every network-dereferenceable
spelling a contract owner is likely to write. The record now says what the tree contains.

One new condition:

- **C5 (lifts N2).** Make `authorized_cross_package_amendments[7]` and `[8]`, and the RFC's
  "Scope explicitly excluded" amendment paragraph, state the whole of what `64d9c65` changed on
  `ctr-api-001` and `ctr-idm-001`: the lookahead removal **and** the appended `x-reference-rule`
  sentence on each affected field. Or drop "nothing else". This is inside `writable_paths`. It
  moves the RFC digest once more under `authorized_cross_package_amendments[6]`.

Recommendations, not conditions: N3 (add one mixed-case spelling), N5 (252, not 248). Referred
for information: N4, to the CTR-JOB-001 owner with blocker 8.

Merge prerequisite (not a review condition): N1. Bring current `main` into the branch, refresh
the handoff and get a green CI run on the resulting head.

VERDICT: review_approved_with_conditions
