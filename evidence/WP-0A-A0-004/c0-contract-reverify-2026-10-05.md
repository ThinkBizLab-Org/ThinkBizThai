# C0 review of WP-0A-A0-004 at PR #189 head `acbcee1`

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/189 (Draft), branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, head `acbcee1ca3cc7c894eb0c7b97cde23fd4189e25d`,
base `main @ 8c089cc`, package `WP-0A-A0-004`. It changes four files:
`work-packages/WP-0A-A0-004.json`, `evidence/WP-0A-A0-004/author-step2-and-retest-2026-10-06.md`,
`evidence/WP-0A-A0-004/author-self-check.md`, and `handoffs/WP-0A-A0-004-author-handoff.json`.
Reviewed 2026-10-06. The file name keeps the date the brief gave it.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent
Reviewer run `/claude/c0_contract_reviewer`. RFC-2026-024 §3/3-4 requires this disclosure. I share a vendor
(Anthropic) and a parent with the Author, and the Author's run wrote my brief. I did not write any of the
PR's content, and I fix nothing. This file approves nothing beyond the Reviewer role. It is not a merge
authorisation, a test verification, a security review, an integration verdict or a G0 signature, and it
moves no package status.

## 1. My earlier verdict, and the premise of the brief

The brief asked me to re-verify "your role's earlier verdict in evidence/WP-0A-A0-004/". **There isn't
one.** At `acbcee1` and at `main @ 8c089cc`, `evidence/WP-0A-A0-004/` holds only Author files
(`author-self-check.md`, `author-step2-and-retest-2026-10-06.md`). `git log --all` on that directory
shows only Author commits. The manifest's last open blocker and the handoff's `reviewer_instructions[0]`
both say no role verdict exists at any head. So I had no earlier conditions to close. This is the
**first** C0 verdict on the package, and it covers the whole package, as the handoff asks, as well as this
increment.

## 2. Measured vs read

**Measured** (Node `v24.20.0`, npm `11.19.0`). I made a private clone in the scratchpad, checked out **by
branch name** (`git branch --show-current` = the package branch, HEAD = `acbcee1`), and ran `npm ci
--ignore-scripts`. No database was used.

| Command | Exit | Result |
|---|---|---|
| `npm run check` (on the branch name, so the handoff guard judges this branch) | 0 | `tests 692 / pass 692 / fail 0 / cancelled 0 / skipped 0 / todo 0` (11m42s) |
| `node scripts/verify-test-coverage-floor.mjs` standing alone | 0 | |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-004.json` | 0 | |
| `node scripts/validate-work-packages.mjs` | 0 | |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-004-ci-independent-guard-step` | 0 | prints `WP-0A-A0-004` |
| `node scripts/verify-branch-identity.mjs agent/claude/nothing-here` | 75 | "no work package declares ownership.branch ..." |
| `node scripts/verify-branch-scope.mjs 8c089cc WP-0A-A0-004` | 0 | "all 4 changed path(s) are declared, and every amendment explains one" |

**The load-bearing measurement, repeated independently.** I extracted `git archive acbcee1` into two
sandboxes outside the repository. In each I changed `scripts.check` in `package.json` and then ran
`node scripts/regenerate-integrity-manifest.mjs` (exit 0), so the digest tripwire cannot be what fires.

| Injected `scripts.check` | `npm run check` | Workflow guard step `node scripts/verify-test-coverage-floor.mjs` |
|---|---|---|
| trailing ` &` | exit **0**, no test-count line | exit **81**: `check step "npm run test:bootstrap &" contains "&"` |
| every ` && ` replaced with ` \|\| ` | exit **0**, no test-count line | exit **81**: `... contains "\|", ...` |

The result matches the Author's §5.1. Without the separate workflow step, both edits would leave CI green
while running no test. With the step, both fail.

**Live, read-only** (`gh api`, 2026-10-06): `main` protection has `strict: true`, `contexts:
["bootstrap"]`, `enforce_admins: true`, force-push off, deletion off, and no
`required_pull_request_reviews`. PR #189 is OPEN and Draft at head `acbcee1`. Its four files match the
diff. Its `bootstrap` check was `IN_PROGRESS` when I read it, so I record no CI result.

**Read, not measured.** I read:

- `CONTRIBUTING_AGENTS.md`;
- RFC-2026-003 and RFC-2026-007 (status lines, and RFC-007 lines 60-75);
- commit `82aae60` and the seven RFCs it changes;
- `WP-0A-A0-002.json:46` and `git show 3737893:work-packages/WP-0A-A0-004.json` (`:45-47`);
- `WP-0A-A0-001.json` `ownership.amended_by[2]`;
- RFC-2026-024 §3, and RFC-2026-025 §2-§5;
- the step-2 disposition (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md`, all of it);
- `evidence/g0-tracker-th.md`;
- `.github/workflows/ci.yml:1-121`;
- commit `8df0f4c`.

I also confirmed by parsing every manifest that only `WP-0A-A0-004.json` lists `ci.yml` in
`writable_paths` or `outputs.files`.

## 3. The Author's claims, checked

| Claim | Verdict |
|---|---|
| RFC-2026-007, not -003, is the authority, and it is Approved | **True.** RFC-007 `:3` reads "Approved 2026-09-02 by the Product Owner". `82aae60` touches RFC-003 to RFC-009. RFC-003 concerns the `package.json` transfer to A0-002. The RFC-003 line was already present in `3737893` and is byte-identical to `WP-0A-A0-002.json:46`. RFC-007 `:66-72`, `scope.include[0]`, `writable_paths[0]` and `amended_by[2].decision_record` all name RFC-007. Removing the "RFC-2026-007 is Proposed" blocker is correct. |
| Step-2 item 1 applied: `prefer_cross_vendor_review: false`, and the exception replaced (not deleted) by a withdrawal record | **True in substance.** The field changes as RFC-024 §3/1-2 prescribes, and the history is kept. See F1 on wording. |
| Step-2 item 2: `/claude/r0_steward` is successor, and the acknowledgement is still pending | **True.** `amended_by[2]` still reads `acknowledgement_status: pending`, `acknowledgement_required_from: /root/r0_steward`. The manifest says naming a successor is not the acknowledgement, which matches disposition §3 row 2. |
| Step-2 item 3: no Product reviewer, recorded in `product_reviewer_note` | **True.** `review_and_test_gates` has no product step, and the package has no UX surface. |
| Protected CI is live | **True.** My read matches the Author's. |
| Acceptance criterion 6 is stale in mechanism, not in effect | **True.** `ci.yml:86-115` resolves the package through `verify-branch-identity.mjs`, and I measured exit 75 on an unclaimed name. `8df0f4c`'s message records the change. See F4. |
| `amends_without_owning.paths` had to be emptied | **True as far as I measured.** The guard passes at `acbcee1` with `[]`. I did not reproduce the pre-edit exit 74. |
| Not a governance PR (RFC-025 §5 item 6) | **True.** No RFC, `CONTRIBUTING_AGENTS.md`, CI or gate file is touched. It is also **not record-only** (§5 item 1: it removes and rewords open blockers and changes other manifest fields). It therefore needs the gated role runs, which the Author says. |
| The whole package (criteria 1-5) at main | **Holds.** The guard step `ci.yml:74-75` precedes `npm run check` `:76-77`. `ci.yml` is owned only by A0-004. `amended_by[2]` records the transfer. `npm run check` passes with skipped and todo 0. The ownership validator exits 0. |

The Author's "not done" item 3 asks whether `evidence/g0-tracker-th.md` still says protected CI is
externally blocked. **By my read, it does not.** Row `:28` and row `:67` say it is live. `:93` is struck
through, and `:94` corrects it. The remaining stale statements, `CONTRIBUTING_AGENTS.md:61-79` and the
RFC-2026-002 status line, are listed as owed in disposition §5.

## 4. Findings

| ID | Grade | Finding |
|---|---|---|
| F1 | Minor | `cross_vendor_exception` states "WP-0A-A0-004 is one of those 15" as the Owner's. Disposition §3 row 1 says which 15 packages is **A0's mapping**. The Owner was shown no package ids. |
| F2 | Info | The last-but-one open blocker says the direct-push case is "inferred ..., not measured by an attempted direct push". `evidence/g0-tracker-th.md:28` records a measured rejection (`GH006 ... Required status check "bootstrap" is expected`, pushed as admin). |
| F3 | Info | Three blockers were removed outright and others rewritten. They were not closed in place with `Text as recorded:` as PR #186 did a day earlier. |
| F4 | Info | Acceptance criterion 6 is annotated by the Author and graded `pass` against behaviour its wording does not describe. |
| F5 | Info | This file is committed after the handoff commit, so the handoff is no longer the last commit. |

### F1: A0's mapping recorded as the Owner's (Minor)

The new `cross_vendor_exception` says the Owner answered `บืนยันขั้น 2` to item 1, then quotes it as
"Apply RFC-024's cross-vendor exception to all 15 work packages". That is the English translation in
disposition §1.2 of A0's Thai bullet, which is accurate as a translation. It then says "and WP-0A-A0-004 is
one of those 15". Disposition §3 row 1 says, in bold, that the "Closes" column is A0's mapping, and that
the 15 are "A0's mapping, from the survey: WP-0A-A0-002..009 and WP-0A-CON-002..008". The mapping is
reasonable, and A0-004 is in the survey's list. Still, this is the pattern C0 F1 on PR #186 caught: an
Owner record must not present A0's reading as the Owner's words.

**Fix (wording only):** make it "and, by A0's mapping in that disposition's §3 row 1, WP-0A-A0-004 is one of
those 15", and mark the quoted item as the record's translation of A0's Thai message. It is not
stop-the-line, and it does not change the field's value.

### F2: a measurement exists for the direct-push case (Info)

The blocker is honest about what the Author did not measure. A measurement is already in the repository,
though: the tracker records that a direct push to `main` was refused even for an admin. The blocker could
cite it. As written, the claim is not wrong.

### F3: removed rather than closed in place (Info)

The following blockers no longer appear in the manifest:

- "RFC-2026-007 is Proposed ..."
- "... countersigned by ... /root/r0_steward, an OpenAI Codex run unavailable in this session"
- "prefer_cross_vendor_review is not satisfied ..."

The protected-CI blocker was rewritten. No rule in `scripts/`, `test-kits/`, `.agents/` or the RFCs
requires `Text as recorded:`. Nothing cites `WP-0A-A0-004.json open_blockers[N]` by index (I grepped the
repository), so shifting the indices breaks nothing. The Author's evidence §2-§4 quotes or describes each
original, and git keeps them. I note the inconsistency with #186's practice, and I do not require a change.

### F4: the annotated acceptance criterion (Info)

The wording "deriving the work-package id from the branch name and skipping cleanly when a branch names
none" is not what `ci.yml` does. The Author annotated the criterion in place instead of rewriting it,
and graded it against the stricter behaviour. I measured that behaviour (§2): an identity resolved
through the manifest, exit 75 for an unclaimed branch, and only a disposition branch accepted after that.
I accept the criterion as met in effect. Rewriting the criterion would be a scope change for the
Integration Owner to accept, and the annotation does not pretend otherwise.

### F5: handoff ordering (Info)

RFC-2026-025 §2 item 1 requires the handoff to be the last commit and to touch only itself. After this
file is cherry-picked onto the PR branch, A0 must re-run the handoff refresh before merge.

## 5. Stop-the-line

**None.** No secret, tenant data, migration, provider effect or contract change is involved. The PR
changes records only. The guard the package delivers works as claimed. I reproduced the bypass and its
rejection independently.

## 6. Does anything block the merge?

Nothing from C0 blocks it beyond F1, which is a wording fix that is not stop-the-line. The package gates
still block the merge as of this head:

1. `security_approved`, `test_verified` and `integration_verified` need first verdicts from
   `/claude/a1_bastion`, `/claude/q0_sentinel` and `/claude/r0_steward`. None exists.
2. The required check `bootstrap` must be green on the final head. It was in progress at `acbcee1`.
3. The handoff must be refreshed so that it is the last commit (F5).
4. The `amended_by[2]` acknowledgement owed by `/claude/r0_steward` is a WP-0A-A0-001 record. It does not
   gate this PR's merge, but it does gate this package reaching `integration_verified` with an honest
   transfer record.

The PR is not governance. Once these are met and no security finding is open, the standing delegation can
apply.

## 7. Verdict

VERDICT: approved_with_conditions

This is the first verdict for the Reviewer role (`review_approved` gate) on WP-0A-A0-004, at head
`acbcee1`. The condition is F1's wording fix. That fix touches only that field's text, so I can re-check it
alone under RFC-2026-025 §5 item 2.
