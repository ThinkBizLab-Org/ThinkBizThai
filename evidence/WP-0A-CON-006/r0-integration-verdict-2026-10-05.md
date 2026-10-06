# WP-0A-CON-006: R0 integration verdict on PR #194 at head `87bd60f`

Package: `WP-0A-CON-006`, Usage/cost and notification contracts (CTR-USG-001, CTR-NTF-001). PR:
https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/194, branch
`agent/claude/WP-0A-CON-006-stale-blockers`, head `87bd60fb80ad69a0bd91c1b8b3a0a4e4b618b75e`, merge-base
with `main` `b5d21d5`; current `main` is `fa10229` (PR #188 merged after this head was cut). The file
name carries 2026-10-05 because the brief assigned it; the work was done on 2026-10-06.

## 0. What I am

- A subagent of `/claude/a0_atlas`, spawned by A0's workflow script under RFC-2026-024 §3/3-4, acting in
  the role `/claude/r0_steward`. That run is this package's declared Integration Owner
  (`role_assignments.integration_owner_agent_run_id`), the Integration Owner of WP-0A-CON-008 (owner of
  `test-kits/contracts/catalog-registry.test.mjs`) and of WP-0A-A0-002 (owner of
  `test-kits/integrity-manifest.json`), and, by item 2 of the Owner's confirmed G0 step 2
  (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` §3 row 2), the successor to
  `/root/r0_steward` for the acknowledgements recorded pending against that run. `/root/r0_steward` is
  still the named Integration Owner of WP-0A-CON-001, which owns `ctr-evt-001/**` and `ctr-job-001/**`.
- The run that spawned me is this package's Author. I record that so the reader can weigh the verdict.
  I did not write any of the PR's content, and I did not write or edit C0's, A1's or Q0's files.
- I do not fix. My only change is this file. It gives an integration verdict and two acknowledgements
  (§5). It approves no review, test or security gate, authorises no merge, and does not move G0. Gate G0
  remains Specification Baseline Complete / External Verification Pending; everything here is synthetic.
  No database was started, no provider or credential was touched.

## 1. Measured versus read

### Measured (by me, in this run)

Private clone at `…/scratchpad/r0-con006/repo`, checked out **on the branch name**
`agent/claude/WP-0A-CON-006-stale-blockers` at `87bd60f`, upstream set to that branch's remote-tracking
ref (`87bd60f`), `origin/main` set to `fa10229`. On top of `87bd60f` I cherry-picked the three role
commits, each of which adds exactly one file under `evidence/WP-0A-CON-006/`: C0 `69a6456`
(`c0-contract-reverify-2026-10-05.md`), A1 `734c4ee` (`a1-security-reverify-2026-10-05.md`) and Q0
`78a272d` (`q0-test-reverify-2026-10-05.md`). That is the state the brief asks about.

| Command | Exit | Result |
|---|---|---|
| `node --version` / `npm --version` | 0 | `v24.20.0` / `11.19.0` |
| `git merge-base --is-ancestor fa10229 87bd60f` | **1** | the head does **not** contain current `main` |
| `git merge-base origin/main 87bd60f` | 0 | `b5d21d5` |
| `git merge-tree --write-tree --name-only fa10229 87bd60f` | **1** | exactly one conflict: `test-kits/integrity-manifest.json` |
| `git diff --stat b5d21d5 fa10229` | 0 | PR #188 touched no file this PR touches except `test-kits/integrity-manifest.json` (one digest each side, adjacent lines) |
| `gh pr view 194` | 0 | `OPEN`, Draft, `mergeable: CONFLICTING`, `headRefOid` `87bd60fb…` |
| required check on `87bd60f` | 0 | `bootstrap`, run `37378512942`, `COMPLETED` / `SUCCESS` |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-006` (base `fa10229`) | **73** | 11 undeclared paths, all of them PR #188's (CON-007 evidence, RFC-2026-009, the bounds test): an artefact of the head not containing `main`, not of this PR |
| `node scripts/verify-branch-scope.mjs b5d21d5 WP-0A-CON-006` (with the three role files) | 0 | `all 13 changed path(s) are declared, and every amendment explains one` |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-CON-006-stale-blockers` | 0 | `WP-0A-CON-006` |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-006.json` | 0 | passes |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | passes |
| `npm run check` (with the three role files) | 0 | `tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0`; includes "the handoff for this branch describes this branch" (pass) |
| `git diff b5d21d5 87bd60f -- test-kits/contracts/catalog-registry.test.mjs` | 0 | exactly six pins move (NTF `freeze_boundary` and `untestable_by_fixture` caveats; USG `untestable_by_fixture` caveat; USG annotation digest, count unchanged at 14; NTF `source_references` digest; NTF `FIXTURE_SET`, one name removed) |
| `git diff b5d21d5 87bd60f -- test-kits/integrity-manifest.json` | 0 | exactly one line: `catalog-registry.test.mjs` `e9589221…` → `441fb17b…` |
| `shasum -a 256` of `catalog-registry.test.mjs` at `87bd60f` | 0 | `441fb17b7fb620be424de509311f503d38276aa809676c5cf3499720ef974de7`, equal to the new entry |
| `grep -c "tenant_context\|Trusted Tenant"` on `ctr-usg-001/manifest.json` at `87bd60f` | 1 (0 hits) | A1's SC-1 declaration is not on the branch |
| parse of `ctr-job-001/schema.json` and `ctr-evt-001/schema.json` `x-amended-by` at `87bd60f` | 0 | JOB: CON-002 and CON-005 entries, both `pending` against `/root/r0_steward`; EVT: CON-002 only. No CON-006 entry in either |
| grep of `work-packages/WP-0A-A0-002.json`, `WP-0A-CON-008.json` for `CON-006` | 1 | neither owner manifest records this package's amendments (§4 R5) |

### 1a. `npm run check` on the branch name

`npm run check` on the clone (head `87bd60f` + the three role files): exit 0, `tests 692, pass 692,
fail 0, cancelled 0, skipped 0, todo 0`. It runs `verify:coverage-floor`, `scan:secrets` and the handoff
guard. This proves the branch as it stands, not the merge result. C0
measured `tests 692, pass 692, fail 0, skipped 0, todo 0` at `87bd60f` itself, and 690/692 on a trial
merge with `fa10229`, the two failures being the stale-handoff pair that `npm run refresh:handoff` turns
green (C0 §5). CI is green on `87bd60f` (run `37378512942`).

### Read, not measured

- The three role files in full. I did not re-run their mutants or probes.
- RFC-2026-025 §5 items 2 and 6 (re-verification of fix commits; delegated-merge conditions).
- C0's earlier `review-contract-head.md` §6 (H-6) and the Author's `author-conditions-closure-2026-10-06.md`.

## 2. Role verdicts at `87bd60f`

| Role | Run | Commit | Verdict | Stop-the-line | Blocks merge |
|---|---|---|---|---|---|
| Reviewer (C0) | `/claude/c0_contract_reviewer` | `69a6456` | `review_approved_with_conditions` | no | **yes, mechanically** (F-4: conflicts with `main`) |
| Security (A1) | `/claude/a1_bastion` | `734c4ee` | `security_approved_with_conditions` | no | no (PR); **SC-1 gates `integration_verified`** |
| Tester (Q0) | `/claude/q0_sentinel` | `78a272d` | `test_verified_with_conditions` | no | no |

Every earlier blocking finding of C0 (H-1 to H-5, H-7, N-2) is measured closed by C0. This is A1's first
Security verdict on the package, so `open_blockers[16]` ("NO Security verdict on file") is answered by
A1's file. The open items:

| Item | Grade | Owner | Effect on this verdict |
|---|---|---|---|
| C0 F-4: head conflicts with `main @ fa10229` | Process, merge-relevant | Author | **blocks** `integration_verified` and the merge until resolved (§3) |
| A1 SC-1 (A1-S1): `attribution.workspace_id` / `business_profile_id` not bound to `tenant_context`, undeclared | Medium | A0 + A6 (CTR-USG-001) | **blocks** `integration_verified`: A1 made it a precondition of that status (§4 R1) |
| A1 SC-2 (A1-S2): deep-link permission check has no subject | Medium | A5 (CTR-NTF-001) | gates A5 ratification / leaving Draft, not this status |
| A1 SC-3 (A1-S3): NTF `dedupe_key` composition or class | Low | this package with A5, A6 | rides with the owed bounding change (`open_blockers[13]`) |
| A1-S4: `required_human_authorities[1]` reads as owed here | Low, record | A0 | none; see §4 R4 |
| C0 F-1 / Q0 N1: H-6 provenance record unowned | Low | WP-0A-CON-001 (successor IO: me) | receipt given in §4 R2; must be written into `open_blockers` before this status is recorded |
| C0 F-2: `open_blockers[13]`'s "#188 not merged" reason has expired | Info | Author | update the sentence when `main` is merged in |
| C0 F-3: Decision Register 5.5 missing from `source_references` | Info | with F-2's change | none |
| Q0 N2: H-9 single-fault fix not pinned by any guard | Low | WP-0A-CON-003 / CON-008 | none |
| Q0 N3: USG `invalid-dedupe-key-minlength.json` still two errors | Observational | `open_blockers[3]` (b), CON-003 | none |
| Q0 C1/C3 (`9a82456`): metric gameable by deletion; conditional sites trail | Carried | WP-0A-CON-003 (`open_blockers[14]`) | none |
| B-7: CTR-NTF-001 authored by a non-owner, needs A5 | Accepted, stands | A5 | gates freeze, not this status |

## 3. The integration questions

| Question | Answer |
|---|---|
| Head contains current `main`? | **No**, measured (`fa10229` is not an ancestor of `87bd60f`; GitHub says `CONFLICTING`). |
| Every role verdict non-blocking? | **No.** C0 marks the merge blocked by F-4. A1 does not block the PR but makes SC-1 a precondition of `integration_verified`. Q0 does not block. |
| Gate `author_complete` | Satisfied at `87bd60f` (handoff on the branch, C0 measured `check:handoff` green). Must be re-satisfied after the `main` merge. |
| Gate `review_approved` | Satisfied with conditions (C0), subject to F-4. |
| Gate `security_approved` | Satisfied with conditions (A1). SC-1 is attached to this gate's successor and is **not met**. |
| Gate `test_verified` | Satisfied with conditions (Q0). |
| Gate `integration_verified` | **Not given** (§6). |
| Changed paths declared? | **Yes** against the merge-base (exit 0, 13 paths with role files). Against `fa10229` the scope check fails (exit 73) only because `main`'s own PR #188 files appear in the two-point diff; that clears when `main` is merged in. |
| Anything protected changed? | Two protected files, both declared in `amends_without_owning` with a reason: `catalog-registry.test.mjs` (six pins, measured) and `integrity-manifest.json` (one digest, measured equal to the bytes). Both acknowledged in §5. No file under `scripts/`, `.github/`, `db/`, `migrations/`, `architecture/decisions/`, nor `package.json`, `package-lock.json`, `CONTRIBUTING_AGENTS.md` or `contract-catalog/shared-kernel/index.json`, changed. No assertion keyword, enum, requiredness or freeze level moved (C0, A1 measured). |
| Required CI green on the head? | Green on `87bd60f` (run `37378512942`). That head is not mergeable, and the head that will carry `main`, the role files and this file is a new commit that needs its own green run. |
| Stop-the-line? | **None.** No secret, tenant leak in running code, migration, external side effect, job or contract mismatch. A1-S1 is a tenant-isolation gap in a Draft contract with no runtime consumer; it must be declared before this status and before freeze, and nothing has leaked. |

## 4. Integration Owner findings and dispositions

### R1: A1 SC-1 is a precondition of `integration_verified` and is not met

A1 wrote: "Before WP-0A-CON-006 reaches `integration_verified`, CTR-USG-001 must declare in
`untestable_by_schema` that `attribution.workspace_id` (and `business_profile_id` when present) must
equal the Trusted Tenant Context's value, in the same identifier space … Countersigned by A6." I measured
that `ctr-usg-001/manifest.json` at `87bd60f` mentions neither `tenant_context` nor the Trusted Tenant
Context. The condition is the Security role's, it is addressed to exactly the status I am asked to give,
and it concerns the tenant-isolation rule in `CONTRIBUTING_AGENTS.md`. I do not waive it.

The fix is inside this package's `writable_paths` (`ctr-usg-001/**`), but it moves a seventh
`catalog-registry.test.mjs` pin (USG `untestable_by_schema`) and therefore that file's digest. The
`amends_without_owning.rationale` says "exactly six pins and nothing else", so it must be rewritten in the
same commit or `verify-branch-scope` and the record will disagree. Under RFC-2026-025 §5 item 2 the commit
answers A1's finding but also edits a test file, so it is re-verified by A1 (its finding) and, because a
test file is touched, by C0 and Q0 as well. A6 countersigns, as A1 requires. My acknowledgements in §5
cover the six pins and the digest at `87bd60f` only; a seventh pin and a new digest need a fresh
acknowledgement from me.

### R2: H-6 (C0 F-1, Q0 N1): receipt given; no acknowledgement is pending

Q0 is right that H-6 is open, and C0 is right that it has no owner. I rule on the narrower question Q0
put to me: **no acknowledgement is pending against `/root/r0_steward` for H-6**, because the record that
would carry one (`x-amended-by` entries for WP-0A-CON-006 on `ctr-evt-001` and `ctr-job-001`, with a
decision record) was never written. I measured that neither schema has such an entry. There is nothing to
acknowledge until it exists, and I do not acknowledge an amendment that has no record. The
`integration_owner_note` is literally true ("records an acknowledgement pending") but incomplete; the
owed record is what is missing.

The substance is neutral (C0's structural proof at `337dfe7`: fourteen negative, single-fault fixtures,
schemas, statuses and versions unchanged). The fix lives in WP-0A-CON-001's paths and would move
CON-008's annotation pins. As successor to `/root/r0_steward` for WP-0A-CON-001's pending
acknowledgements, **I accept H-6 as owed by WP-0A-CON-001.** This file is the receipt. When the two
`x-amended-by` entries are written, the acknowledgement runs to `/claude/r0_steward`. Before this package
is recorded `integration_verified`, the Author must add one `open_blockers` line naming H-6 as owed by
WP-0A-CON-001, citing C0 F-1 and this section, so it does not live only in evidence.

### R3: merge path: the Product Owner personally, or after the conditions in §6

RFC-2026-025 §5 item 6 bars a delegated merge (a) while the head does not contain current `main`, which is
the case now, and (b) while any security finding of any grade is open against the PR. A1-S1 to A1-S4 were
raised in the Security verdict on this PR; A1 says none of them blocks the PR, but they are unresolved. I
read (b) as I read it for WP-0A-CON-007 (its R3): **A0 must not merge PR #194 under the standing
delegation while A1's findings stand open.** The PR edits no RFC, no `CONTRIBUTING_AGENTS.md`, no CI and no
gate, so it is not a governance PR, and the delegation is available once A1 records its findings resolved
or transferred for this PR's purposes. Until then the Product Owner merges personally, after §6's
conditions hold.

An alternative the Owner may choose: merge PR #194 as an `in_review` increment, as #9 and #62 were, with
the package staying `in_review` until SC-1 is met. The PR's own content is integration-sound (§3). That is
the Owner's choice, not A0's, and it still requires F-4's catch-up and a green run on the merged head.

### R4: A1-S4, `required_human_authorities[1]` is stale (record only)

A1's disposition of the CTR-MOD-001 / CTR-SEC-001 secret-handle question was given in
`evidence/WP-0A-CON-004/security-disposition-handle-ownership-a1.md` (2026-09-04), and no contract in
this package carries a secret handle. The entry should be marked disposed with that pointer when the
manifest is next edited. Not a condition.

### R5: owner manifests do not record this package's amendments (advisory)

Neither `work-packages/WP-0A-CON-008.json` nor `WP-0A-A0-002.json` mentions WP-0A-CON-006's amendments.
The amendments are declared on this package's side, which is what `verify-branch-scope` checks, and the
acknowledgement is given below. A0 should add matching `amended_by` entries (acknowledger
`/claude/r0_steward`, status given, pointer to §5) in a PR that owns those paths. Not blocking.

## 5. Acknowledgements

- **Job-reference change: none pending for this package.** The job-reference change is WP-0A-CON-005's
  amendment to CTR-JOB-001 (RFC-2026-006). Its acknowledgement is recorded `pending` against
  `/root/r0_steward` in `ctr-job-001/schema.json` `x-amended-by`, and it belongs to WP-0A-CON-005 and
  WP-0A-CON-001, not to this package. This PR does not touch `ctr-job-001/**`. I give nothing for it here;
  it is given, if sound, in those packages. H-6 is not a pending acknowledgement either (§4 R2).
- **Given: the `catalog-registry.test.mjs` amendment.** As WP-0A-CON-008's Integration Owner I
  acknowledge the change declared in `ownership.amends_without_owning`: exactly six pins moved, the six
  the rationale names, and nothing else. Measured by diff against `b5d21d5`. No assertion site, rule,
  enum, requiredness or freeze level moves (C0 and A1 measured; `schema-mutation-coverage.test.mjs`
  untouched). Q0's P2 and P3 show the moved pins still bite. It is sound.
- **Given: the `integrity-manifest.json` amendment.** As WP-0A-A0-002's Integration Owner I acknowledge
  exactly one digest change, for `test-kits/contracts/catalog-registry.test.mjs`, measured equal to that
  file's sha256 at `87bd60f`. It is sound.
- **Scope of both acknowledgements:** they cover the bytes at `87bd60f`. The conflict with `main` is
  resolved correctly only by keeping this head's `catalog-registry.test.mjs` digest (`441fb17b…`) **and**
  `main`'s `ctr-evt-001-schema-ref-bounds.test.mjs` digest; `verify:coverage-floor` inside `npm run check`
  is the test of that. Any further pin move (R1's seventh) needs a fresh acknowledgement. Ownership of
  both files stays with WP-0A-CON-008 and WP-0A-A0-002.

## 6. Verdict

**`integration_verified` is NOT given at `87bd60f`, with or without the role files on the branch.** Two
things stand between this package and that status: the head does not contain `main` (C0 F-4), and A1's
SC-1 is a stated precondition of this status and is not met (R1). Neither is a content defect in what
PR #194 changed, and neither is stop-the-line.

- **Stop-the-line:** none.
- **Blocks the merge:** yes, as it stands. Mechanically, the PR conflicts with `main`. Procedurally, A0
  may not merge it under the delegation (R3).

### What A0 must do before this package can be `integration_verified`

1. Merge current `main` into `agent/claude/WP-0A-CON-006-stale-blockers`. Resolve
   `test-kits/integrity-manifest.json` by keeping this branch's `catalog-registry.test.mjs` digest and
   `main`'s `ctr-evt-001-schema-ref-bounds.test.mjs` digest.
2. Cherry-pick the four evidence commits (C0 `69a6456`, A1 `734c4ee`, Q0 `78a272d`, and this one).
3. Close SC-1 (R1): declare in CTR-USG-001 `untestable_by_schema` that `attribution.workspace_id` and
   `business_profile_id` equal the Trusted Tenant Context's values in the same identifier space and a
   consumer rejects a mismatch (or, if the owners decide otherwise, say so and give the mapping). Move
   the seventh pin and the digest, and rewrite `amends_without_owning.rationale` to say seven. Get A6's
   countersignature, and re-verification by A1, C0 and Q0 of that commit (RFC-2026-025 §5 item 2).
4. In the manifest: add the H-6 line owed by WP-0A-CON-001 (R2); update `open_blockers[13]` for #188
   having merged (C0 F-2); mark `required_human_authorities[1]` disposed (R4); mark `open_blockers[16]`
   answered by the four role files. Run `npm run check:handoff`; refresh the handoff as the last commit,
   alone.
5. Push, wait for `bootstrap` green on the exact head, re-run `npm run check` on the branch name, and
   confirm the head still contains current `main`.
6. Ask `/claude/r0_steward` for an Integration verdict at that head, with the acknowledgement of the new
   pin and digest. This file then becomes history.

### If the Owner instead merges PR #194 as an `in_review` increment (R3 alternative)

Steps 1, 2 and 5 still apply, with step 4's handoff refresh. The package stays `in_review`; steps 3, 4
and 6 follow in a later PR. The merge is the Owner's personally, not A0's under the delegation.

### After either path, before `done`

7. Record H-6's owner-side entries on `ctr-evt-001` / `ctr-job-001` through WP-0A-CON-001 (R2).
8. Bring WP-0A-CON-008's and WP-0A-A0-002's `amended_by` records into line with §5 (R5).
9. The owed bounding change (`open_blockers[13]`), carrying A1 SC-3 and C0 F-3, with A5 and A6.
10. A5's ratification of CTR-NTF-001 (B-7), carrying A1 SC-2.

Attested by `/claude/r0_steward` against `87bd60fb80ad69a0bd91c1b8b3a0a4e4b618b75e`, with the role
commits `69a6456`, `734c4ee` and `78a272d` applied on top.
