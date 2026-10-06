# WP-0A-A0-003 — Author re-verification at main, and the Owner's step 2 applied (2026-10-06)

**Author evidence only.** Written by `/claude/a0_atlas`, the Author of this package, acting through a
subagent of the A0 run that wrote its brief. It is not a Reviewer, Tester, Security/Privacy or
Integration Owner verdict, it does not move the package past `in_review`, it does not approve Gate G0
and it does not authorize a merge.

| Field | Value |
|---|---|
| Package | WP-0A-A0-003 — Repository secret-scan strengthening and privacy dimension |
| Branch | `agent/claude/WP-0A-A0-003-secret-scan`, cut from `origin/main` at `8c089cc` |
| Toolchain | Node `v24.20.0`, npm `11.19.0` (`/Users/bank/.local/node-v24.20.0/bin/node`) |
| Status | `in_review` (unchanged) |

## 1. Where the role verdicts stand

| Role | Run | File | Revision | Verdict |
|---|---|---|---|---|
| Reviewer | `/claude/c0_contract_reviewer` | `review-contract-c0.md` | `1478f34` | `changes_required` (R1 blocking) |
| Tester | `/claude/q0_sentinel` | `test-verdict-q0.md` | `1478f34` | `test_failed` (L1, L2 and the §744 comment) |
| Security/Privacy | `/claude/a1_bastion` | `review-security-head.md` | `4bcb5f1` | `security_approved_with_conditions` (C2, C3, C4) |
| Integration Owner | `/claude/r0_steward` | none | — | none yet |

These are the first and only role verdicts. They are not re-signed here. What the Author can do is
check that they still describe main, and they do:

- No commit between `1478f34` and `8c089cc` touches `scripts/scan-repository-secrets.mjs`,
  `test-kits/secret-scan.test.mjs`, `architecture/decisions/RFC-2026-005-secret-scan-strengthening.md`
  or `work-packages/WP-0A-A0-003.json` (`git log 1478f34..HEAD -- <those paths>` printed nothing;
  973 commits separate the two revisions).
- sha256 at `8c089cc`: scanner `fef5cd72…dfea5`, suite `8752c009…873e`. These are the digests Q0
  recorded for `1478f34`.

### Both blocking findings reproduce at main

Each mutation was applied to a disposable `rsync` copy of the tree in the session scratchpad, which
was deleted afterwards. The repository was not touched.

| Finding | Mutation | `node --test test-kits/secret-scan.test.mjs` |
|---|---|---|
| Q0 L1 (non-regular entry untested) | `scripts/scan-repository-secrets.mjs:550`, the `unscannable-entry` push, replaced by a comment so the entry is silently skipped | tests 46, pass 46, fail 0 |
| C0 R1 / Q0 L2 (path-shape test enumerates five prefixes) | one line at the top of `scanText` that returns no findings when `relativePath` is under `architecture/` | tests 46, pass 46, fail 0 |

C0 R2 also still holds: `scanOneFile` calls `readFile` (line 492) before comparing against
`MAX_FILE_BYTES` (line 498).

A1 C2 is met at main: each of the ten rules A1 named has a decoy row pinned to its rule id (for
example `gcp-service-account-key` and `kubernetes-service-account-token` each appear in the suite),
and C0 confirmed all 34 rules fire. A1 C3 is two-thirds met: `netrc-password` is anchored to a
`machine` block and `vault-token` dropped its single-letter alternative (lines 351-359);
`npmrc-auth-token` (line 350) still has no placeholder filter. A1 C4(a) is met by
`payment-card-number` (RFC-2026-008).

## 2. Why the blocking fixes are not in this PR

R1, L1, L2, R2, R3, the npmrc part of C3 and the L3 widenings all land in
`scripts/scan-repository-secrets.mjs` or `test-kits/secret-scan.test.mjs`. PR #190 (WP-0A-A0-005,
branch `agent/claude/WP-0A-A0-005-cardholder-data-scan`) is changing both files now to fix A1-005-1.
A concurrent edit would conflict with it, so this PR leaves both files alone. Each item is recorded in
`open_blockers` as owed by this package, with the dependency: the next increment lands after PR #190
merges, from a main that contains it, and then needs C0, Q0 and A1 re-checks and a first R0 verdict.

## 3. What this PR changes, all in `work-packages/WP-0A-A0-003.json` and this folder

Owner step 2 (`บืนยันขั้น 2`, 2026-10-05, transcribed in
`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` on PR #186):

- **Item 1.** `independence.prefer_cross_vendor_review` is now `false`, and `cross_vendor_exception`
  records the withdrawal (RFC-2026-024 §3/2). Blocker 14 is closed in place.
- **Item 2.** `_run_id_disambiguation` and blocker 13 name `/claude/r0_steward` as successor to
  `/root/r0_steward`. No acknowledgement is given: the WP-0A-A0-003 entry in
  `WP-0A-A0-001.json` `ownership.amended_by` is WP-0A-A0-001's record and stays `pending`.
- **Item 3.** `product_reviewer_note` records that the null Product slot is by decision.

Also:

- `ownership.amended_by[0]` (the WP-0A-A0-005 amendment): `acknowledgement_required_from` changed from
  `/claude/a0_atlas`, the Author of the amending package, to `/claude/r0_steward`, this package's
  Integration Owner. It stays `pending`. WP-0A-A0-005's own blocker asks for exactly this correction.
- C0 R4: `scope.include` now gives the delivered rule counts, 30 credential and 4 privacy.
- C0 R5: blockers 2, 5 and 16 are closed in place, each keeping its original text. Blockers 1 and 3 are
  reconciled: they are two rounds against two corpora (round 1, 19/56 at `73d0770`; round 2, 8/56 at
  `4bcb5f1`, a fresh and harder corpus), not one number restated.
- Q0 L4 (UTF-16 passes silently) and Q0 L5 (no LINE, Omise, 2C2P or SCB rule) are disclosed as open
  blockers, which Q0 accepts as an alternative to a fix.
- `required_human_authorities`: RFC-2026-005 disposition is given (`82aae60`).
- Owed outside this package's paths: C0 R7 (`.agents/**`), R8 (WP-0A-CON-004), R9 (WP-0A-A0-001).

RFC-2026-005 is not changed. The A1 C4(b) and L3 refusal-path corrections to it are owed as a
governance PR the Owner merges personally.

## 4. Declared commands at main `8c089cc`, on this branch

| Command | Exit | Result |
|---|---|---|
| `node scripts/scan-repository-secrets.mjs .` | 0 | no findings |
| `node --test test-kits/secret-scan.test.mjs` | 0 | tests 46, pass 46, fail 0, skipped 0, todo 0 |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-003.json` | 0 | |
| `node scripts/validate-capability-profiles.mjs` | 0 | |
| `node scripts/verify-test-coverage-floor.mjs` | 0 | |
| `npm run check` (before this PR's handoff) | 1 | tests 692, pass 690, fail 2, skipped 0, todo 0 |

The two failures in that `npm run check` are `the handoff for this branch describes this branch` and
the handoff ratchet that runs that suite on a copy. Both fail for one reason: the branch is named for
WP-0A-A0-003 and its handoff still cites the old range. The last commit of this PR refreshes the
handoff. The handoff records the final `npm run check`, which `scripts/commit-when-clean.mjs` requires
to be clean before it commits.

## 5. What this does not do

It does not close R1 or L1, so the Reviewer and Tester verdicts stay negative. No status moves. No
role verdict is given or implied. Gate G0 remains Specification Baseline Complete / External
Verification Pending.
