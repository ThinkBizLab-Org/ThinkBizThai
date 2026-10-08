# R0 review: the RFC-2026-025 §6 governance PR (#211) at head `f7e9ce8`

Date: 2026-10-07 (measured into 2026-10-08, +07:00). PR:
https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/211 (Draft, title begins `GOVERNANCE:`), branch
`agent/claude/WP-0A-DB-00-batch-rfc-025-records-path`, head `f7e9ce8dc51d246d693a4ea3f2da923436261f5b`,
built on `origin/main` `7fb0fc05`. This is the increment's FIRST review by any role.

The task named this review "for WP-0A-A0-001". The PR belongs to **WP-0A-DB-00**: RFC-2026-025 is in
DB-00's `writable_paths` (`work-packages/WP-0A-DB-00.json`, measured), and the branch is DB-00's slot. A0
put it there and said why. I agree with that placement. This file sits under `evidence/WP-0A-A0-001/`
because the task told me to put it here. See R-7 for what that means when the PR cites it.

## 0. What I am

- A subagent of `/claude/a0_atlas`, spawned by A0's workflow script under RFC-2026-024, acting in the
  role `/claude/r0_steward`. That run is WP-0A-DB-00's declared Integration Owner (measured in
  `role_assignments`). It is also the Integration Owner of the two packages whose files this PR amends:
  WP-0A-A0-002 (`scripts/test-suite-contract.mjs`, `test-kits/integrity-manifest.json`) and
  WP-0A-CON-008 (`test-kits/branch-identity.test.mjs`, `evidence/VERIFICATION.md`). For WP-0A-A0-001,
  whose manifest still names `/root/r0_steward`, I act as its named successor, as in
  `r0-g0-records-2026-10-05.md` §0. `/root/r0_steward` is a different run, and this file is not that
  run's verdict.
- The run that spawned me is this PR's Author. I record that so the reader can weigh the verdict. I
  wrote none of the PR's content and none of any other role's files.
- I do not fix. My only change is this file. It gives an integration reading, a governance
  classification and acknowledgements (§5). It approves no review, test or security gate. It does not
  approve RFC-2026-025 §6, which only the Owner can do. It authorises no merge and does not move G0. All
  data I used is synthetic: throwaway git repositories and in-memory manifests. I started no database
  and touched no provider or credential.

## 1. Measured versus read

### Measured (by me, in this run)

A private clone at `…/scratchpad/r0-WP-0A-A0-001-review/`, checked out **on the branch name** at
`f7e9ce8`. `origin/main` was `7fb0fc05` when the measurements began. Node `v24.20.0` from
`/Users/bank/.local/node-v24.20.0/bin`, first on `PATH`.

| Command | Exit | Result |
|---|---|---|
| `git branch --show-current` | 0 | `agent/claude/WP-0A-DB-00-batch-rfc-025-records-path` |
| `npm run check` | 0 | `tests 717, pass 717, fail 0` (9m35s) |
| `npm run check:handoff` | 0 | `describes the branch: nothing substantive after its cited head` |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-DB-00` | 0 | `all 11 changed path(s) are declared, and every amendment explains one` |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-DB-00-batch-rfc-025-records-path` | 0 | `WP-0A-DB-00` |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-DB-00.json` | 0 | distinct role ids |
| `node scripts/db/classify-records-only.mjs origin/main HEAD` | 1 | NOT records-only, 8 reasons (RFC, scripts, tests, generated files, `ownership.branch`). That is correct for this PR. |
| `git show --stat f7e9ce8` | 0 | the last commit touches only `handoffs/WP-0A-DB-00-author-handoff.json` |
| `git diff origin/main...HEAD -- architecture/` | 0 | 164 lines added, **0 removed**. §1–§5 are untouched. The one header line `Amendment §6: …` is added. |
| manifest, parsed at base and at head | — | only `ownership.branch`, `ownership.amends_without_owning.rationale` and `open_blockers` differ. `open_blockers` grows 203 → 204 and entries 0–202 are byte-equal. `amends_without_owning.paths` is the same four paths. `status` stays `in_progress`. |
| `gh pr view 211` | 0 | `OPEN`, Draft, `MERGEABLE`, `headRefOid` `f7e9ce8d…` |
| required check `bootstrap`, run `37655716905` | — | **`IN_PROGRESS`/pending**, the last time I read it. No result on this head. |
| `gh api …/branches/main` (after the measurements) | 0 | **`389f3845`** (#210, WP-0A-CON-004 merged). `main` moved after the PR's base. See R-1. |
| `git merge-tree --write-tree HEAD origin/main` | — | **CONFLICT in `test-kits/integrity-manifest.json`**. `test-kits/branch-identity.test.mjs` changed on both sides and auto-merges (different hunks: #210 moved CON-004's slot). |

**§6.5 reproduced exactly.** Each command was run read-only over `7fb0fc05`:
- For every first-parent merge since `2026-10-05T12:00+07:00`,
  `classify-records-only.mjs <m>^1 <m>^2`: **26 PRs, 5 records-only** (#198, #199, #201, #205, #206).
- For every first-parent merge on each of those PR branches, `--sync <s>^1 <s> origin/main`: **50 syncs,
  48 mechanical**. The two that are not mechanical are `f6652ee0` (#197,
  `scripts/test-suite-contract.mjs`) and `31879073` (#196,
  `test-kits/contracts/catalog-registry.test.mjs`).

**Mutation spot-check (mine, independent of A0's eight).** I disabled ten rules one at a time, ran only the
new test (`--test-name-pattern 'the records-only classifier'`), and restored the file each time. I
confirmed the restore with `cmp` and a clean `git status`.

| Rule disabled | New test |
|---|---|
| closing clause in front (`endsWith`) | fail |
| merge's first parent is the tip | fail |
| `status` must be a string | fail |
| a new manifest is not a record | fail |
| merge equals the tip at PR paths | fail |
| merge equals `main` at `main`'s paths | fail |
| no stray path against the tip | fail |
| `handoffs/` depth 1 only | fail |
| an empty diff is refused | fail |
| **the merged commit must be on `origin/main`** | **pass: the mutation survives** (R-4) |

On a throwaway repository I checked through the CLI that this last rule **does** work. A PR branch that
merges a side branch not on `origin/main` gets exit 1, `the commit merged in, … is not on origin/main`.
When `origin/main` is moved to that side branch, the same merge gets exit 0. The code is right. No test
pins it.

**Adversarial probes of the pure functions** (in-memory, no repository change):

| Probe | Classifier |
|---|---|
| `status` `in_review` → `done` | records (`[]`) |
| `open_blockers[0]` + ` -- CLOSED, no longer applies` (suffix) | records |
| `RESOLVED, ignore: ` + `open_blockers[0]` (prefix) | records |
| `required_human_authorities[0]` + ` — waived by A0` | records |
| append `## Addendum / verdict superseded: APPROVED` to an existing `evidence/<pkg>/r0-review.md` | records |
| new `evidence/WP-OTHER/r0-review-fake.md`, new `handoffs/WP-OTHER-author-handoff.json` | records. The CI scope guard catches these, because DB-00 may write only `evidence/WP-0A-DB-00/**` and `handoffs/WP-0A-DB-00-*.json`. The classifier does not. |
| `evidence/x.md` (depth 2), a new `work-packages/*.json`, a symlink, `status: 5`, `amends_without_owning` added where absent | not records (each refused) |

### Read, not measured

- That the eight other R0 sync readings of 2026-10-06 each read a sync the check calls mechanical, and
  each ended with "verdict stands". I took this from the plan's §3 and did not re-read the eight files.
- That the five transcriptions transcribed wording R0 had written in advance (§6.5).
- **The Owner's words.** The user request relayed to *this* run by the workflow harness reads, verbatim,
  `ข้อ 4 mw`. That matches the transcription in
  `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-07-rfc-025-s6.md` §1. The reading "item 4: do
  it" is A0's. The transcription labels it A0's, and so does RFC §6 "Origin". I can attest the string. I
  cannot attest the reading.

## 2. Governance classification

- **A governance PR.** It changes an RFC (`architecture/decisions/RFC-2026-025-…`). Under RFC-2026-025 §5
  item 6, **the Owner merges it personally, never by delegation**. The PR, the disposition, the manifest
  rationale and `open_blockers[203]` all say so. It does not touch `.github/`, `CONTRIBUTING_AGENTS.md`,
  `package.json`, the lockfile or the contract catalog (measured on the name list).
- **Amending in-file, not a new RFC, is consistent with the repository.** §5 set the precedent, and
  `CONTRIBUTING_AGENTS.md` sets no numbering rule for amendments. The diff adds lines and removes none.
  The new header line is part of the status block whose own text says "any change … needs the Owner".
  That is satisfied, because the Owner is the one who merges.
- **Protected paths.** An RFC is a source-of-truth document, and its change goes through the RFC path.
  This PR is that path. `scripts/db/**` and the RFC are DB-00's own. The four amended files are declared
  in `amends_without_owning`, with a reason each, and the scope guard accepts them (§5).
- **Not records-only**, under §5 or under the proposed §6. Its own classifier agrees (exit 1). Every
  required role run applies: C0, A1, Q0 and R0.

## 3. Integration reading

The increment is **integration-sound at its own head**. The full suite passes 717/717. The guards pass.
The handoff is last and alone. The manifest change is the branch slot, a restated rationale and one
appended blocker. The classifier is Node built-ins only, fails closed, and reproduces A0's measurement.
Its test is digested and bites.

It is **not mergeable as it stands**, because `main` has moved (R-1). §6's text also tells the Owner less
than the classifier admits (R-3).

## 4. Findings

**R-1 (blocks the merge at this head; not stop-the-line). The head does not contain current `main`.**
`main` is `389f3845` (#210). Under §5 item 6 a merge needs the head to contain `main`. A trial merge
conflicts on `test-kits/integrity-manifest.json`. `test-kits/branch-identity.test.mjs` changed on both
sides. What has to happen: merge `main` in, regenerate the manifest (`npm run regenerate:manifest`), run
`record:verification` and `cmp`, refresh the handoff last and alone on the branch name, and get CI green
on that head. **Do this before the role runs**, so that no verdict needs carrying. By §6.3's own rule this
sync is **not** mechanical: `main` changed a PR path, the branch-slot test. That makes no difference
here, because no role has run yet.

**R-2 (state, not a defect). No role run and no CI result on this head.** C0, A1 and Q0 have not run, and
`bootstrap` was pending. All three, and a green `bootstrap` on the final head, must exist before the
Owner merges.

**R-3 (fix before the Owner decides; not blocking for integration). §6.1 admits more than its
"wider in two places" paragraph tells the Owner.** The classifier does what §6.1 item 4 says. The
paragraph that compares §6 with §5 omits three reversals, and the probes in §1 show each one:
1. **Role-review files and Owner dispositions.** §5 item 1 explicitly excludes "Owner dispositions or
   role-review files". §6 admits new ones, and lets an existing one be appended to. §6.1 item 2's
   rationale says the append rule "stops the light path from rewriting a role's verdict". It stops an
   edit. It does not stop an appended addendum that supersedes the verdict (probe: `verdict superseded:
   APPROVED` → records).
2. **Closing a blocker.** §5 item 1 excludes "removing or rewording an open blocker". §6 admits a closing
   clause after the old text (suffix) as well as in front of it (prefix). Q-025-6-3 asks the Owner only
   about the prefix form, but the suffix form closes a blocker just as well (` -- CLOSED`).
3. **`status` may become any string.** A package can move to `integration_verified` or `done` on one
   reading. The schema and the role-separation validator judge the shape and the role ids, not whether
   the gate evidence exists. §6.4 keeps four-role review "for … a gate". A status move is the record of
   a gate, so the two sections pull against each other.

   Also, the classifier does not bind `evidence/<package>/` or `handoffs/*.json` to the PR's own
   package. The CI scope guard does that, and §6.1 should say it relies on it.

**Recommended:** A0 names all three in §6.1's comparison paragraph. A0 also either restricts `status`
(unchanged, or moved only to a value whose role evidence is in the diff) or adds a question to the Owner
about it. This is the Owner's call, not mine. My verdict is unchanged either way, but the Owner should
not approve §6 without seeing these three.

**R-4 (should fix; non-blocking). The rule "the merged commit is on `origin/main`" is untested.** It is
named in §6.3, and the CLI shows it works, but disabling it leaves the test green. Without this rule, a
merge of some other branch into a PR could pass as a "mechanical sync" and carry unreviewed content.
One CLI assertion in the existing test closes the gap. A0's "8 of 8 mutations red" is true for the eight
rules A0 chose. It is not a claim that every rule bites.

**R-5 (process; before the merge). What lands on `main` must state the Owner's decision.** If the Owner
merges the head as it is, `main` says §6 is "Proposed, not approved" in three places: the header line,
the §6 `Status:` line, and §6.4 "This PR is one". Changing that afterwards is another RFC change: a
governance PR that takes the full path, with the Owner merging again. `scripts/verify-disposition-branch.mjs`
admits only `Status:` lines, and the header line `Amendment §6: …` is not one. **Recommended order:**
1. The Owner answers Q-025-6-1..3.
2. A0 records the answers on this branch: the disposition and the status lines.
3. The roles re-read that commit, under §5 item 2.
4. The Owner merges.

**R-6 (advisory, for Q-025-6-2). Branch-slot lines make concurrent syncs non-mechanical.** §6.3 compares
whole paths. Any two open PRs that each move a branch slot both change
`test-kits/branch-identity.test.mjs`, so a sync between them is never mechanical, even when the hunks are
disjoint. #210 and this PR show it. It did not happen among tonight's 50 syncs. The Owner may want to
know this when answering Q-025-6-2. A line-level rule for the two pinned lines would be a later change,
not this one.

**R-7 (record placement).** This file is under `evidence/WP-0A-A0-001/`, as the task instructed.
`verify-branch-scope` on the DB-00 branch admits only `evidence/WP-0A-DB-00/**`. So this file cannot be
committed onto PR #211's branch as it is. A0 should cite it from the DB-00 records, or carry it on a
WP-0A-A0-001 branch, and not move it by hand onto #211.

## 5. Acknowledgements (as Integration Owner of WP-0A-A0-002 and WP-0A-CON-008), at `f7e9ce8`

- `scripts/test-suite-contract.mjs` (A0-002): the foundation-contract test floor goes 86 → 87, the
  assertion floor 1121 → 1320 (the guard's own count at this head, and the coverage floor passes), and
  the name digest `63dd7456…` becomes `d01d2282…`. There are three value changes and their comments, and
  nothing else. **Acknowledged.**
- `test-kits/integrity-manifest.json` (A0-002): regenerated. **Acknowledged for `f7e9ce8`.** After the
  R-1 sync it must be the regenerator's output (`cmp`), and only then does this acknowledgement carry.
- `test-kits/branch-identity.test.mjs` (CON-008): the two pinned lines,
  `…DB-00-batch-174` → `…DB-00-batch-rfc-025-records-path`. **Acknowledged.** After the sync, both #210's
  CON-004 line and this PR's DB-00 line must be present.
- `evidence/VERIFICATION.md` (CON-008): 716 → 717, which `npm run check` confirms live.
  **Acknowledged.** It is regenerated after the sync.

## 6. Verdict

**`integration_verified` is NOT given at `f7e9ce8`.** The increment is integration-sound at its own head,
and its four amendments are acknowledged (§5). But `main` has moved past it, and nothing else that a
merge needs exists yet.

- **Stop-the-line:** none. No secret, tenant, migration, data or contract risk. The PR changes no
  runtime path, and the classifier changes nothing until the Owner approves §6.
- **Blocks the merge:** yes, at this head. Before the Owner merges personally (never by delegation,
  §5 item 6), all of the following must hold:
  1. R-1: `main` `389f3845` (or later) merged in, the generated files regenerated and `cmp`-clean, the
     handoff refreshed last and alone on the branch name, and `bootstrap` green on that exact head.
  2. R-2: C0, A1 and Q0 run on that head, with no blocking finding and no open security finding of any
     grade, followed by my re-check.
  3. R-5: the Owner's answers to Q-025-6-1..3 recorded on the branch before the merge, so that `main`
     never holds a §6 whose status line contradicts the Owner's decision.
  4. R-3 and R-4: fixed by A0 or put to the Owner as written. I hold neither one as a condition of my
     verdict, but R-3 belongs in front of the Owner before Q-025-6-1 is answered.

### Exact manifest wording A0 records on my behalf (appended to `open_blockers[203]`)

> R0 review 2026-10-07 at f7e9ce8 (evidence/WP-0A-A0-001/r0-review-2026-10-07.md): integration_verified
> NOT given. Governance PR (RFC-2026-025 §6), Owner merges personally; not records-only (classifier exit
> 1, correct). 717/717, scope, identity, handoff guards exit 0; §6.5 reproduced (26/5, 50/48).
> Amendments acknowledged by /claude/r0_steward at f7e9ce8: test-suite-contract.mjs (floors 87/1320,
> digest), integrity-manifest.json (regenerated), branch-identity.test.mjs (slot), VERIFICATION.md (717).
> Before merge: main 389f3845 merged in (manifest conflict), C0/A1/Q0 on the head, CI green, Owner's
> answers recorded before the merge (R-5); R-3 (role files, blocker closing, status moves admitted
> beyond what §6.1 tells the Owner) and R-4 (on-main sync rule untested) for A0. Stop-the-line: none.

Attested by `/claude/r0_steward` against `f7e9ce8dc51d246d693a4ea3f2da923436261f5b`.
