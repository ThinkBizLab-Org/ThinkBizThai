# WP-0A-CON-007: closing the role-verdict conditions, and applying the Owner's step 2 (Author, 2026-10-06)

Run: `/claude/a0_atlas`, the Author of WP-0A-CON-007, working as a subagent of the A0 session, in its
own worktree, on branch `agent/claude/WP-0A-CON-007-reference-bounds` cut from `origin/main` `e1fa28e`.
This file is Author evidence only. It approves nothing, verifies nothing as Tester, integrates nothing,
and does not move the package past `in_review`. The status stays `in_review`.

Inputs: the three role verdicts on `main` `03c584b` (`review-contract-c0.md`, `review-security-a1.md`,
`test-verdict-q0.md`), the G0 survey's row for this package, and the Owner's step-2 disposition
(`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md`, on main since PR #186).

## 1. What changed

| File | Owner | Change |
|---|---|---|
| `test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs` | this package | Guard fixes (§2). Same eight test names, so the test count and the name digest in `scripts/test-suite-contract.mjs` do not move. |
| `architecture/decisions/RFC-2026-009-reference-bounds.md` | this package | Five sentences marked as corrected, plus an appended "Record corrections (2026-10-06)" section, R-1 to R-7. **The decision does not change.** |
| `work-packages/WP-0A-CON-007.json` | this package | Step-2 decisions (§4), blockers restated, the cross-package digest amendment declared. |
| `test-kits/integrity-manifest.json` | WP-0A-A0-002 | Two digests, for the two files above. Declared in `ownership.authorized_cross_package_amendments`. |
| `evidence/WP-0A-CON-007/author-self-check.md` | this package | A dated correction appended for C0 F8. |
| `handoffs/WP-0A-CON-007-author-handoff.json` | this package | Refreshed last, in its own commit. |

**This is a governance PR.** It changes an RFC, so under RFC-2026-025 §5 item 6 the Product Owner
merges it personally. A0 does not merge it, by delegation or otherwise.

## 2. Conditions, one by one

### Reviewer (C0, `changes_required`): the three blocking findings

| Finding | Closed by | Measured |
|---|---|---|
| F1: nothing guards the `^` anchor | `HOSTILE_AROUND_A_GOOD_NAME`: `file:///CTR-EVT-001@1.0.0`, `javascript:CTR-EVT-001@1.0.0` and `../../CTR-EVT-001@1.0.0`. Each is a well-formed name with a hostile prefix, and each is under 32 characters, so the bound cannot be what rejects it. | Mutant "pattern loses `^`" is killed |
| F2: `schema_ref`'s bound can drift between 18 and 79 | `AT_THE_BOUND` (32 characters) must be accepted. `ONE_PAST_THE_BOUND` (33 characters) must be rejected, and must satisfy the shape once the bound is removed. Both checks run against the validator. They do not read the keyword's text. | Mutants 79, 33, 24 and 18 are all killed |
| F4: the ratchet lists four contracts and misses ten | The ratchet now walks every directory in `contract-catalog/shared-kernel`. `BOUNDED_CONTRACTS` (four) must have no unbounded reference field. Every other unbounded field must appear in `KNOWN_UNBOUNDED` with its owning package. That list holds 49 entries. A listed field that has since been bounded also fails, so the list cannot go stale. | A fifteenth contract, a new `exfil_ref` in `ctr-aud-001`, a new `callback_ref` in `ctr-sec-001`, and a now-bounded `ctr-ten-001.workspace_id` are all killed |

### Reviewer: the recorded, non-blocking conditions

| Finding | Disposition |
|---|---|
| F3: the letter class can widen | Closed: `CTR-evt-001@1.0.0` was added. The `[A-Za-z]` mutant is killed. |
| F5: the residual list named 23 of 49 | Closed in RFC-2026-009 R-4, as the full table by owning package. |
| F6: "51 characters" | Closed in R-1. The figure is 85, or 48 if only `*_ref` fields count. |
| F7: four, five or thirteen contracts | Closed in R-4's last paragraph. |
| F8: the self-check's "no assertion reads a `pattern` string" | Corrected by a dated note appended to `author-self-check.md`. |
| F9: the nullable and array branches are untested | Closed: a synthetic fragment covers both branches, unbounded and bounded. The array-branch and nullable-branch mutants are killed. |
| Blocker 1 sequencing (the merge came before the approval) | Recorded in `required_human_authorities[0]` for the Integration Owner. It is not mine to dispose of. |
| Cross-vendor | Withdrawn by the Owner. See §4. |

### Security (A1, `security_approved_with_conditions`): conditions 1-8

| # | Condition | Disposition |
|---|---|---|
| 1 | Correct the `x-bound-note` on `ctr-evt-001/schema.json` (S-7) | **Owed.** `contract-catalog/**` is read-only to this package, and CTR-EVT-001 belongs to WP-0A-CON-001. A1 wrote "paths this package owns or already amends", but the `amends_without_owning` list that made the catalog amendable was removed in `746f80b`. Re-granting it to myself would be self-authorisation. The true figures are in RFC-2026-009 R-3, and the item is in `open_blockers[3]` with its owner. |
| 2 | Correct "51 characters" in the RFC and blocker 3 (S-8) | Closed: R-1, and blocker 3 is restated. |
| 3 | Disclose all seven CTR-TEN-001 fields and the `$ref` blind spot (S-4) | Closed: R-4. The guard now reaches the seven through `ctr-ten-001` itself, because every contract is walked. |
| 4 | Name the four bare strings on CTR-JOB-001 (S-5) | Closed: R-5, and `open_blockers[5]` escalates them to the owner. |
| 5 | State the residual as 49, including CTR-SEC-001 and CTR-OBS-001 (S-10) | Closed: R-4. |
| 6 | State what a conforming value may still carry (S-1, S-2) | Closed: R-5. The suggestion to lower `schema_ref` to 24 is recorded in R-2 and not taken. |
| 7 | Record that hostile forms 05, 06 and 08 test the bound, not the shape (S-3) | Closed, and made stronger: the comment records it, and the hostile test now also runs every form against the schema with the bound removed. A pattern widened to admit a public https URL is now killed by the package's own guard, not only by the catalog ratchet. |
| 8 | Update blocker 1 | Closed: `open_blockers[0]` reads RESOLVED, with `82aae60`. |

S-6 (`format`-only date-times) and S-9 (26, not 27) are recorded in R-5 and R-6. S-6's test is
deferred with the anchor-semantics test, as A1 proposed.

### Tester (Q0, `test_verified_with_conditions`): conditions 1-3

| # | Condition | Disposition |
|---|---|---|
| 1 | Pin `schema_ref`'s bound | Closed as F2 above. M04 and M05 are killed. |
| 2 | Assert non-emptiness in the two discovery tests | Closed: both tests assert a floor of at least 14 contracts walked. The ratchet also requires at least 76 reference-shaped fields, and the RE2 sweep requires at least one pattern. M15 and M16 are killed. |
| 3 | Test the array branch of `stringBearer` | Closed as F9 above. M17 is killed. |

Q0's items 4-6 (other owners' fields, the three scope numbers, M12) are closed or recorded in R-4.

## 3. The 256-character limit

The survey asked for it to be grounded in a source or stated as a decision under the Owner's
delegation. A search of `docs/**` for a stated maximum length found none. It is therefore stated as
a decision, in RFC-2026-009 R-2: A0, as owner of the four contracts, takes it under the Owner's
2026-09-28 instruction to carry out the work as A0 recommends. It is not presented as the Owner's own
decision. Two facts ground it:

- 256 is three times the longest real reference (85).
- 256 is load-bearing in the database. `length(...) <= 256` CHECK constraints exist in migrations
  050 (`app.jobs` `input_ref` and `result_ref`), 140 (`change_before_ref` and `change_after_ref`) and
  110 (`body_ref`). Moving the bound in either direction therefore needs a forward migration in the
  same change.

The Owner sees this when he merges the governance PR.

## 4. The Owner's step-2 decisions, applied to this manifest

- **Item 1, cross-vendor:** `independence.prefer_cross_vendor_review` is now `false`, and
  `cross_vendor_exception` now records the withdrawal, citing RFC-2026-024 and the step-2 file
  (worded as on WP-0A-CON-005). No cross-vendor blocker line existed in this manifest, so none had to
  be removed.
- **Item 2, r0 successor:** this package records no acknowledgement pending against
  `/root/r0_steward`. `_run_id_disambiguation` now says so, and says that any acknowledgement owed to
  WP-0A-A0-001 or WP-0A-CON-001 is given by `/claude/r0_steward` in those packages. The new
  cross-package digest amendment's acknowledgement runs to `/claude/r0_steward` (WP-0A-A0-002's
  Integration Owner).
- **Item 3, no Product reviewer:** a `product_reviewer_note` sits beside the null slot. The gates have
  no product step.

## 5. Mutation campaign on the new guard

Run by `scratchpad/con007/mutate.mjs` (not committed) against a fresh copy of `contract-catalog/` and
`test-kits/contracts/` for each mutant. The worktree was never mutated. Output, verbatim apart from
dropped message lines:

```
SURVIVED  control (no mutation)          <- the unmutated copy passes, as it must
killed    C0 M3 / Q0 M04: maxLength 32 -> 79
killed    Q0 M05: maxLength 32 -> 18
killed    C0 F2 sweep: maxLength 32 -> 24
killed    C0 F2 sweep: maxLength 32 -> 33
killed    C0 M6 / F1: pattern loses ^
killed    C0 M8 / F3: [A-Z]{3} -> [A-Za-z]{3}
killed    A1 S-3: pattern also admits a public https URL
killed    Q0 M12: new unbounded callback_ref in ctr-sec-001
killed    C0 F4 A: a fifteenth contract with an unbounded exfil_ref
killed    C0 F4 B: new unbounded exfil_ref in ctr-aud-001
killed    stale allow-list: ctr-ten-001.workspace_id gains a bound
killed    Q0 M15: empty properties on the four bounded contracts
killed    Q0 M17: array branch of stringBearer gutted
killed    nullable branch of isStringSchema gutted
killed    Q0 M16: catalog-wide sweeps pointed at an empty directory
killed    ratchets-bite: maxLength 4096
killed    ratchets-bite: pattern ^.*$
```

17 of 17 mutants were killed, and each was killed by the test named for its defect. The two
`ratchets-bite` mutants are the ones `test-kits/ratchets-bite.test.mjs` uses against this suite, and
they still bite. Q0's M15 now also fails the bound test itself, not only its sibling tests.

## 6. Commands, at the working tree on `agent/claude/WP-0A-CON-007-reference-bounds` (base `e1fa28e`)

```
$ node --version                                                         v24.20.0
$ node --test test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs tests 8, pass 8, fail 0, skipped 0, todo 0
$ node --test test-kits/contracts/schema-mutation-coverage.test.mjs      tests 10, pass 10, fail 0, skipped 0, todo 0
$ node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-007.json   exit 0
$ npm run validate:protocol                                              exit 0
$ npm run regenerate:manifest                                            rebuilt 91 digest(s); exactly 2 entries changed
$ npm run check                                                          see §7
```

## 7. `npm run check`

```
$ npm run check        exit 0
ℹ tests 691   ℹ pass 691   ℹ fail 0   ℹ skipped 0   ℹ todo 0
```

The first run, before the handoff was refreshed, failed 2 of 691 tests. Both were the handoff check
(`the handoff for this branch describes this branch`, run directly and again through
`ratchets-bite`). The handoff still cited `03c584b..c30c8c8`. After `npm run refresh:handoff`, the
run above is clean. `the schema-ref ratchet notices two unrelated reversals` passed in both runs.
`npm run verify` runs again inside `node scripts/commit-when-clean.mjs` before each commit.

## 8. What stays open, and whose it is

- The `x-bound-note` correction: owed by WP-0A-CON-001, acknowledged by `/claude/r0_steward`.
- 49 unbounded reference fields in nine contracts: owed by their packages (CON-001, 003, 004, 006).
- CTR-JOB-001's four bare strings: escalated to CTR-JOB-001's owner (WP-0A-CON-001), before freeze.
- `format`-only date-times and anchor semantics: owed by the first non-JS consumer's conformance test.
- The assertion floor in `scripts/test-suite-contract.mjs` (11) could be raised. That belongs to the
  owner of `scripts/`, and it is not required.
- Re-checks by C0, A1 and Q0 of this head, and an Integration verdict by `/claude/r0_steward`, before
  the package leaves `in_review`.
- The merge: the Product Owner's, personally, because this PR changes an RFC.
