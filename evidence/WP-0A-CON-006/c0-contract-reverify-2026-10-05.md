# WP-0A-CON-006: C0 re-verification at the PR #194 head

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/194, branch
`agent/claude/WP-0A-CON-006-stale-blockers`, head `87bd60fb80ad69a0bd91c1b8b3a0a4e4b618b75e`.
The head merges `main @ b5d21d5` (PR #187). Ten paths differ from that base: five under
`contract-catalog/shared-kernel/ctr-{usg,ntf}-001/`, the work package manifest, the handoff,
`author-conditions-closure-2026-10-06.md`, `test-kits/contracts/catalog-registry.test.mjs` and
`test-kits/integrity-manifest.json`.

Earlier verdict re-checked: `evidence/WP-0A-CON-006/review-contract-head.md`, my role's verdict at
`337dfe7`, **changes_requested** on seven blocking findings (H-1, H-2, H-3, H-4, H-5, H-7, N-2), with
H-6, H-8, H-9, H-10, §3, §4, §8, N-6 and N-8 recorded as required but non-blocking.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent
Reviewer run `/claude/c0_contract_reviewer`. RFC-2026-024 §3/3 requires this disclosure. I share a
vendor and a parent with the Author. I did not write any of this PR's content and I fix nothing in it.
This file is Reviewer evidence only. It approves no gate, authorises no merge, moves no package status
and countersigns no acknowledgement. In particular, it does not acknowledge the two
`amends_without_owning` entries, which belong to `/claude/r0_steward`. Gate G0 remains Specification
Baseline Complete / External Verification Pending. Everything here is synthetic. No provider or
credential was touched, and no database was started, so port 5591 was not used.

## 1. Measured versus read

**Measured.** I ran each of these, and the result or its exit code is given below.

- Toolchain: `node --version` `v24.20.0`, `npm --version` `11.19.0`.
- A private clone at
  `/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/c0-WP-0A-CON-006/clone`,
  checked out **by branch name** (`git checkout -B agent/claude/WP-0A-CON-006-stale-blockers 87bd60fb`,
  and `git branch --show-current` printed the name). The branch-reading guards therefore ran on the
  branch and not on a detached HEAD.
- `npm run check` at the head: exit 0, `tests 692, pass 692, fail 0, skipped 0, todo 0` (714 s). This
  includes `verify:coverage-floor`, `verify-toolchain`, `scan:secrets`, `validate:protocol` and the
  suite runner. It also includes "the handoff for this branch describes this branch" and the four
  ratchet re-runs.
- Package `deterministic_commands.package_evidence`:
  - `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs`: tests 6, pass 6, fail 0.
  - `node scripts/validate-work-package-ownership.mjs work-packages`: exit 0.
- `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-006.json`: exit 0.
- `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-006` (base `b5d21d5`): exit 0,
  "all 10 changed path(s) are declared, and every amendment explains one".
- `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-CON-006-stale-blockers`: printed
  `WP-0A-CON-006`, exit 0.
- A parsed, key-by-key diff of every changed JSON file between `b5d21d5` and `87bd60fb` (§2). This was
  my own script, and it reads `git show` output only.
- A per-fixture audit of both contracts against their shipped schemas with the repository's subset
  validator (`test-kits/contracts/json-schema-subset.mjs`). It counts errors per fixture, checks
  declared against on-disk fixtures, finds md5 duplicates, and checks `outputs.files` against the tree.
- A mutation run on CTR-USG-001: six deletions, each checked against the manifest's fixtures (§3).
- probe1 and probe2 from my earlier review, repeated on file copies of the head (§3).
- `gh pr view 194`: Draft, open, `mergeable: CONFLICTING`, and the `bootstrap` check `IN_PROGRESS` at
  the time I looked. `git fetch origin main` showed `main @ fa10229`, which merged PR #188 after this
  head was cut. `git merge-tree` names exactly one conflict, `test-kits/integrity-manifest.json`.
- A trial merge of `fa10229` into the head, in a second private clone (`.../merged`) on the branch name.
  I resolved the one conflict by taking the head's `catalog-registry.test.mjs` digest and `main`'s
  `ctr-evt-001-schema-ref-bounds.test.mjs` digest. `verify-test-coverage-floor.mjs` exit 0;
  `node --test test-kits/contracts/*.test.mjs` 79/79 pass; `npm run check` 690/692, with the two stale-handoff
  tests failing (§5). This trial
  merge was never pushed. It exists only to answer whether the PR still holds once it has caught up
  with `main`.
- `git show --name-status 79fbc33`: 442 A, 19 M, 1 D. The one deletion is
  `ctr-usg-001/examples/invalid-reported-without-supersedes.json`, the one schema modified is
  `ctr-usg-001/schema.json`, and no `valid-*` path appears. This bears on Q0's C5, which is Q0's to judge.

**Read, not measured.** I took these from the record without re-running them:

- That both commits went through `node scripts/commit-when-clean.mjs`.
- The Owner's words in `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md`
  (`บืนยันขั้น 2`, line 83, with the typo recorded at line 85). I read §3 rows 1 to 3 and compared them
  with the manifest. I did not ask the Owner.
- The Author's statement that before the edit `catalog-registry.test.mjs` reported exactly the six pins
  it then moved. I measured that the diff moves exactly six pins (§2). I did not reproduce the
  pre-edit failure.

## 2. My earlier conditions, one by one

| Id | Earlier grade | State at `87bd60fb` | How I know |
|---|---|---|---|
| H-1 `supersedes_usage_id` required on every `provider_reported` | Blocking | **Closed.** The schema has no root `allOf` and no `if`. `cost.required` is `[amount, currency, basis]`. A first report with no prior estimate can be expressed. | Measured, parsed schema |
| H-2 16-digit bound unsourced, rationale false | Blocking | **Closed.** The false IEEE-754 rationale was withdrawn earlier, by A6's correction. `cost.amount.x-source` now calls the bound a DECLARED INFERENCE, with the real reason (to cap what a consumer must parse). It also says the fixture `invalid-cost-magnitude-past-exact-range.json` witnesses the bound, not an IEEE property. I had offered "drop it, or 15 digits with the real reason". The 15 only mattered under the withdrawn rationale. Keeping 16 with an honest declaration meets the condition. | Measured, parsed diff |
| H-3 `constraintSites` counted property names and `x-` internals | Blocking | **Closed, by WP-0A-CON-003 on `main`.** `METADATA`/`STRUCTURAL` sets (`:179-180`); `x-` keys are skipped (`:262`). Not this PR's change. | Read file; probes below |
| H-4 floor gameable both ways | Blocking | **Closed for both of my routes, by CON-003 on `main`.** probe1 (delete `type` and `minLength` from three optional ids in `ctr-ten-001`) now fails: "17 constraint sites, below its declared floor of 23". probe2 (four empty properties, populated in the valid fixtures) now fails on the constraint-surface record ("constraint surface changed"). The **ratio** alone still does not catch probe2. The exact tables do. The Author records the remainder as CON-003's (`open_blockers[14]`). I agree. | Measured, both probes exit 1 |
| H-5 `dimension.enum` and `attribution.required` killed by nothing | Blocking | **Closed.** Deleting `dimension.enum` is killed by 2 fixtures, `attribution.required` by 2, `cost.basis.enum` by 1, `quantity.unit.enum` by 1, and `cost.amount.pattern` by 3. The only survivor is `dedupe_key.minLength` (dead by construction, already recorded). | Measured mutation run |
| H-6 EVT/JOB fixture amendment shipped without provenance | Required, non-blocking | **Open, and now unowned.** Neither `ctr-evt-001` nor `ctr-job-001` carries an `x-amended-by` entry for WP-0A-CON-006. The closure file disposes of H-6 as "History from pull request #9 … Not reopened here". The four prose entries that used to carry the amendment were removed from `authorized_cross_package_amendments` before this branch. So the amendment's provenance now lives only in commit history and in my earlier file. See F-1 below. | Measured, parsed schemas |
| H-7 undeclared write to CON-003's file; `outputs.files` stale; prose describes removed constructs | Blocking | **Closed as far as a record can close it.** `outputs.files` has 89 entries. None is missing on disk, and every file under the package's contract directories and evidence directory is declared. `acceptance_criteria[3]` withdraws the rollback half. `[6..8]` say the coverage work is CON-003's file, written here without a declaration, and the 30 % figure is updated to the 70 % floor now in force. `required_tests[1]` withdraws the metric-label case, and `scope.include[1]` no longer asserts the const. The write itself is history and cannot be undone. Since then, the file's owner has carried it forward on `main`. | Measured, audit script and parsed diff |
| H-8 two byte-identical NTF fixtures | Required | **Closed.** `invalid-failure-missing-class-only.json` is deleted. No two fixture bodies share an md5 in either contract. `invalid-failure-without-class.json` fails once: `$.delivery: missing required property 'failure_class'`. | Measured |
| H-9 `invalid-float-cost.json` carried `list_price` | Required | **Closed.** `basis` is `estimated`, which matches the fixture's own `dedupe_key` segment. It fails once, on `cost.amount` pattern. | Measured |
| H-10 duplicated clause in NTF `freeze_boundary` | Required | **Closed.** | Measured, parsed diff |
| §3 supersession reference unverifiable, non-unique, may be self-referential | Required | **Closed.** USG `untestable_by_schema` (2) states all three, and `untestable_by_fixture` repeats the ledger half. | Measured |
| §4 cost/quantity fraction asymmetry undeclared | Required | **Closed.** `quantity.amount.x-source` states the minor-unit reason and labels it a declared inference. | Measured |
| §8 conjunction in `shared-kernel-contract-catalog.test.mjs` | Non-blocking | **Open, owed by WP-0A-CON-001** (`open_blockers[15]`). Correctly placed. | Read |
| B-6 residue in NTF `untestable_by_fixture` | Required | **Closed.** The sentence now says the contract no longer models non-rollback, and it points at `untestable_by_schema` and `delivery.x-source`, both of which say so. | Measured |
| B-7 CTR-NTF-001 authored by a non-owner | Accepted, stays open | **Stands**, in `open_blockers[1]` and `[2]`. It needs A5. | Read |
| N-2 false `forbidden_paths_note` | Blocking (carried) | **Closed.** The note now says the earlier text was copied and false, and it gives the actual reason for the narrower globs. No output matches `*secret*` or `*credential*`. | Read manifest, measured outputs |
| N-6 `message_key` unbounded | Non-blocking | **Open, owed by this package** (`open_blockers[13]`), together with nine sibling fields. I measured every unbounded string in both schemas. Apart from `occurred_at` (format) and the two bounded money patterns, the set is exactly the ten fields listed. It also equals the ten CON-006 entries in `KNOWN_UNBOUNDED` on `main @ fa10229`. See F-2. | Measured |
| N-7 `dedupe_key` cites ID-002 rather than §5.5 | Non-blocking | **Partly answered.** The Author is right that ID-002's row (workstream `:270`, "consumer key/event id → inbox/processed record wrapper") supports what the `x-source` now cites it for. The Author is not right that §5.5 "states no carried-key obligation". Its last bullet reads "ทุก async contract มี idempotency/dedupe, trace, tenant, retry/error, retention และ cost attribution". That is the catalog-wide rule that an event contract carries dedupe. Neither contract lists `Decision Register 5.5` in `source_references`. Info only, see F-3. | Measured register lines 246-273 |
| N-8 `K MK-006` and the meta-security input dangling | Non-blocking | **Closed.** Both were removed, with an `inputs.files_note`. | Measured |
| N-9 unexercised values | Partly closed | **Closed** to the extent the mutation run shows (every enum is killed). | Measured |

**The amendments to files this package does not own.** I parsed the `catalog-registry.test.mjs` diff.
It moves exactly six pins: the NTF `freeze_boundary` and `untestable_by_fixture` caveat digests, the USG
`untestable_by_fixture` caveat digest, the USG annotation digest (count unchanged at 14), the NTF
`source_references` digest, and the NTF `FIXTURE_SET`, from which exactly one name is removed
(`invalid-failure-missing-class-only.json`) and none is added. `integrity-manifest.json` moves the one
digest of that file. Every contract-file change is to an `x-source` string, a manifest caveat,
`source_references`, a fixture list or a fixture body. **No assertion keyword moves in either schema.**
`schema-mutation-coverage.test.mjs` is untouched and passes, which agrees with that. Both
amendments are declared in `amends_without_owning` with their reason. Acknowledging them is
`/claude/r0_steward`'s job, not mine.

**The Owner's step 2.** It is applied as §3 rows 1 to 3 read. In row 1, `prefer_cross_vendor_review`
is `false`, `cross_vendor_exception` records the withdrawal, and blocker 8 is resolved in place. CON-006
is in A0's list of the fifteen (CON-002..008). As I noted for CON-007 (its N-3), the fifteen are A0's
mapping, and the manifest cites the row that says so. In row 2, I found no `/root/r0_steward` pending
acknowledgement in this package's writable paths. The only hits are the new note, the handoff sentence
and my own earlier H-6 text. In row 3, `product_reviewer_agent_run_id` stays `null`, with the note.

## 3. Mutation and probe runs at the head

```
ctr-usg-001 DELETE properties.dimension.enum: killed by invalid-dimension-enum, invalid-unknown-dimension
ctr-usg-001 DELETE properties.attribution.required: killed by invalid-attribution-required, invalid-missing-provider-attribution
ctr-usg-001 DELETE properties.cost.properties.basis.enum: killed by invalid-cost-basis-enum
ctr-usg-001 DELETE properties.quantity.properties.unit.enum: killed by invalid-quantity-unit-enum
ctr-usg-001 DELETE properties.dedupe_key.minLength: SURVIVES   (recorded dead site; owed with CON-003)
ctr-usg-001 DELETE properties.cost.properties.amount.pattern: killed by invalid-cost-magnitude-past-exact-range, invalid-float-cost, invalid-negative-cost

probe1 (ctr-ten-001 loses 6 rules)       schema-mutation-coverage exit 1: "17 constraint sites, below its declared floor of 23"
probe2 (ctr-ten-001 gains 4 empty props) schema-mutation-coverage exit 1: "constraint surface changed"
```

Fixture audit at the head: CTR-USG-001 has 47 fixtures declared, 47 on disk and 0 duplicates. Every
`valid-*` fixture passes. Every `invalid-*` fixture fails with exactly one error except
`invalid-dedupe-key-minlength.json`, which fails twice (minLength and pattern). That is A6's recorded
dead-site case, still open as the first half of its fifth condition. CTR-NTF-001 has 30 declared,
30 on disk, 0 duplicates, and every invalid fixture fails exactly once.

## 4. New findings at this head

| ID | Grade | Finding |
|---|---|---|
| F-1 | Low, recorded | **H-6 has no owner.** The closure file's C0 table marks H-6 "Not reopened here". The owed table in its §4 and `open_blockers[13..16]` do not list it. The `x-amended-by` entry and the decision record I asked for on `ctr-evt-001` and `ctr-job-001` do not exist. The fix lives in WP-0A-CON-001's paths, and it would move CON-008's annotation pins. The amendment's substance stays neutral, as I proved at `337dfe7`. What is missing is a record. Add one `open_blockers` line that names H-6 as owed by WP-0A-CON-001 (with `/claude/r0_steward`), so that it is not lost. |
| F-2 | Info | `open_blockers[13]` justifies deferring the ten bounds by saying that "bounding these before #188 merges breaks #188". PR #188 merged at `main @ fa10229` after this head was cut, so that reason has expired. The other two reasons still hold: the assertion-site pins and FIXTURE_SET, and the A5 and A6 sign-off on the value. The owed item can now be scheduled. The sentence should be updated when the branch next takes `main`. |
| F-3 | Info | §5.5's last bullet is a register source for the dedupe obligation on both contracts (N-7 above). Adding `Decision Register 5.5` to `source_references` would close the remaining citation gap. That moves a CON-008 pin, so it fits better with the F-2 change than as a change of its own. |
| F-4 | Process, merge-relevant | **PR #194 does not merge as it stands.** GitHub reports `CONFLICTING` against `main @ fa10229`. The only conflict is the digest pair in `test-kits/integrity-manifest.json`, and it is mechanical. In my trial merge, the head's `catalog-registry.test.mjs` digest and `main`'s `ctr-evt-001-schema-ref-bounds.test.mjs` digest resolve it. The result passes everything except the
two handoff tests that a handoff refresh fixes (§5). The Author must merge `main`, refresh the handoff as the last commit, and get a green `bootstrap` run on that new head. Role verdicts given at `87bd60fb` then carry over only if the merge brings in nothing but `main`'s content and that digest line. |

**Nothing new blocks on contract grounds.** No finding is stop-the-line. No secret, tenant leak,
duplicate side effect, contract mismatch or migration divergence was introduced. The PR moves no
assertion keyword, no enum, no requiredness and no freeze level. It touches no migration and no
runtime path.

## 5. Trial merge with `main @ fa10229`

`npm run check` on the trial merge (branch name `agent/claude/WP-0A-CON-006-stale-blockers`, merge
commit `04f17a76`, never pushed): exit 1, `tests 692, pass 690, fail 2, skipped 0, todo 0`.

Both failures belong to the pair the Author's closure file §6 recorded before its own refresh: "the
handoff for this branch describes this branch" and the ratchet that re-runs it on a copy ("the handoff
ratchet fails when an author handoff claims another role approved something"). Both report "WP-0A-CON-006's
handoff cites a revision on no path to this branch". That is expected. The committed handoff describes
`87bd60fb`, while my trial merge commit is new, unpublished, and has no refreshed handoff. In my clone,
the remote-tracking refs are also not GitHub's. Every contract, ownership, scope, coverage-floor,
mutation, registry and bounds test passed on the merged tree, including CON-007's
`KNOWN_UNBOUNDED` guard. That guard still lists the ten CON-006 fields and found none of them stale.
So the merge with `main` is clean apart from the digest line, and the Author's `npm run refresh:handoff`
after the merge is the step that turns these two tests green. I did not run that refresh. It is
Author work.

## 6. Open items that stay open, and whose they are

All of these are recorded, except F-1, which is not yet recorded. None of them is a contract defect
that blocks this PR:

- the ten unbounded reference fields (N-6 and nine siblings), owed by this package with A5 and A6 (F-2);
- the dead `dedupe_key.minLength` on USG, owed with WP-0A-CON-003;
- the remainder of H-3/H-4 (the ratio is still not the guard; the exact tables are), and Q0's C1 and
  C3, owed by WP-0A-CON-003;
- §8, the conjunction, owed by WP-0A-CON-001;
- H-6's provenance record, owed by WP-0A-CON-001, not yet written down (F-1);
- B-7, A5's ratification of CTR-NTF-001;
- the acknowledgement of the two `amends_without_owning` entries, by `/claude/r0_steward`;
- the first Security verdict ever on this package, by `/claude/a1_bastion`, Q0's re-verification and
  the Integration verdict.

## 7. Verdict

**review_approved_with_conditions.**

All seven of my blocking findings at `337dfe7` are closed. H-1, H-2, H-5, H-7 and N-2 are closed on
this branch or by earlier merged work in this package's paths. H-3 and H-4 are closed, as far as my two
probes reach, by WP-0A-CON-003's guard on `main`. My required findings H-8, H-9, H-10, §3, §4, B-6 and
N-8 are closed and measured. The conditions are F-1 (record H-6 as owed), F-4 (catch up with `main` and
re-run CI on the new head), and the owners' items in §6. F-2 and F-3 are information for the next
change to these contracts.

- **Stop-the-line:** no.
- **Does anything I found block the merge:** not on contract grounds. Mechanically, yes: the PR
  conflicts with `main` (F-4) and cannot merge until the Author resolves that and CI is green on the
  resulting head. What the merge also needs is not mine to give. It needs A1's first Security verdict,
  Q0's re-verification, `/claude/r0_steward`'s acknowledgement of the two amendments and its Integration
  verdict, and the merge itself. This PR edits no RFC or governance file. Whether A0's standing merge
  delegation covers it is for the Integration Owner to read. I did not measure that.
- This file is committed after the handoff commit `87bd60fb`. Whether the handoff needs a refresh so that
  its commit stays last is the Author's call under the repository's handoff rule. F-4 requires a new
  handoff commit anyway.

Attested by `/claude/c0_contract_reviewer` against `87bd60fb80ad69a0bd91c1b8b3a0a4e4b618b75e`.
