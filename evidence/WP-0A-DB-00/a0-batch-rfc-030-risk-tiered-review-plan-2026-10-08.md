# A0 batch rfc-030-risk-tiered-review (2026-10-08): plan, measurement and what is owed

Author: `/claude/a0_atlas` (A0, WP-0A-DB-00), through a subagent of A0's workflow run. Base: `origin/main` `bd019c9c` (PR #211).
Branch: `agent/claude/WP-0A-DB-00-batch-rfc-030-risk-tiered-review`. A GOVERNANCE increment: it writes an RFC. It approves
nothing; the Owner approved RFC-2026-030 in principle (`product-owner-disposition-2026-10-08-rfc-030.md`) and approves the
text at merge.

## 1. Which package owns this

- RFC-2026-025, which this RFC builds on (its §6 records-only path and §5 item 6), is owned by WP-0A-DB-00, and so is
  `scripts/db/**`, where its classifier lives. RFC-2026-030 is the same kind of change -- the review path of a PR -- and
  its classifier reuses `scripts/db/classify-records-only.mjs`. So it is written here, in WP-0A-DB-00, and the RFC file is
  added to this package's `writable_paths` (the RFC-2026-028 precedent, `1da0b1c3`).
- `CONTRIBUTING_AGENTS.md` is owned by WP-0A-A0-001. This PR does **not** edit it. RFC-2026-030 §7 carries the exact
  replacement text, and the edit is owed there (`open_blockers`, the new last entry).
- The branch name: the manifest's previous `ownership.branch`, `agent/claude/WP-0A-DB-00-batch-rfc-025-records-path`, is
  merged (#211). Each WP-0A-DB-00 increment has had its own branch name, so this one is new, from `origin/main` after a fetch:
  no remote branch of that name existed, nothing was force-pushed.

## 2. What changes

| Path | Change | Owned? |
|---|---|---|
| `architecture/decisions/RFC-2026-030-risk-tiered-review.md` | new: the RFC, status "Approved in principle 2026-10-08; final text approved at merge" | added to `writable_paths` here |
| `scripts/db/classify-review-tier.mjs` | new: the tier classifier, fail closed, Node built-ins only | yes (`scripts/db/**`) |
| `test-kits/db/foundation-contract.test.mjs` | one test: every rule biting in pure form and through the CLI on a throwaway repository | yes |
| `evidence/WP-0A-DB-00/` | this plan, the Owner's words transcribed | yes |
| `work-packages/WP-0A-DB-00.json` | branch slot, one writable path, the amendment list, rationale, status `in_review`, one new blocker at the end | yes |
| `db/foundation/lint/audit-coverage-map.json` | its line pins into the manifest move with the lines added above `open_blockers` | yes |
| `scripts/test-suite-contract.mjs` | foundation-contract floor +1 test, its name digest, its assertion floor | amended without owning |
| `scripts/verify-test-coverage-floor.mjs` | `DIGESTED_FLOOR`: the RFC and the classifier | amended without owning |
| `test-kits/repository-json.test.mjs` | `DECISION_RECORDS`: the RFC | amended without owning |
| `test-kits/branch-identity.test.mjs` | the branch slot | amended without owning |
| `test-kits/integrity-manifest.json`, `evidence/VERIFICATION.md` | regenerated | amended without owning |
| `handoffs/WP-0A-DB-00-author-handoff.json` | refreshed last and alone | yes |

## 3. Measured

The classifier over every first-parent merge on `origin/main` since 2026-10-05T12:00 (+07:00), each PR classified as the CLI
would classify it, `classifyTierRange(<first parent>, <second parent>)`:

```
git log --first-parent --merges --since=2026-10-05T12:00+07:00 --format='%H %P %s' origin/main   # 29 merges
```

| PR | merge | tier | paths |
|---|---|---|---|
| #211 | bd019c9c | H | 27 |
| #204 | ae163ed8 | H | 34 |
| #210 | 389f3845 | H | 52 |
| #202 | 7fb0fc05 | H | 15 |
| #209 | dc7b9684 | H | 33 |
| #207 | 85ad66da | H | 7 |
| #208 | 5cb5cb83 | H | 7 |
| #206 | 9b4a0ce6 | records | 3 |
| #203 | 0955b32e | H | 18 |
| #200 | 4dd767df | H | 12 |
| #205 | 411dfa7e | records | 3 |
| #201 | dd11c601 | records | 3 |
| #199 | d863f405 | records | 3 |
| #198 | b61735f7 | records | 3 |
| #197 | 3072e85c | H | 24 |
| #190 | 5debf570 | H | 19 |
| #196 | 8689e3c7 | H | 23 |
| #194 | 9e15881b | H | 65 |
| #195 | 25663e31 | H | 13 |
| #191 | 9b34be7d | H | 8 |
| #193 | a5f64668 | H | 13 |
| #192 | 574c8a8c | H | 10 |
| #189 | c75418b1 | H | 14 |
| #188 | fa102298 | H | 12 |
| #187 | b5d21d55 | H | 15 |
| #185 | 8c089cc0 | H | 26 |
| #186 | e1fa28ec | H | 11 |
| #184 | 600b48b6 | H | 23 |
| #183 | aa0e89fc | H | 40 |

**24 H, 5 records, 0 M, 0 L.** The five records are the five RFC-2026-025 §6.5 named. No PR that exists is lighter under
RFC-2026-030 than it was; the repository has no `apps/` or `src/` path for M or L to apply to.

**Mutation check of the test.** Thirteen rules of the classifier were each disabled in turn (the test-file rule, the
multi-module rule, the no-bearing-path rule, the manifest rule, the path words, the unplaced-path rule, the H line signals,
the data line signals, the rename rule, the mode rule, records-first, a deleted test counting as a test, and an empty diff).
The new test went red for each of the thirteen.

## 4. Owed (also the manifest's last `open_blockers` entry)

1. The Owner: approve the text at merge, and answer Q-030-1 to Q-030-4 (RFC-2026-030 §11). The Owner merges this PR
   personally (RFC-2026-025 §5 item 6); no words name it for A0.
2. The C0, A1, Q0 and R0 role runs on this PR's head. None has run.
3. If merged: the `CONTRIBUTING_AGENTS.md` edit of RFC-2026-030 §7 (WP-0A-A0-001); a CI step printing the tier
   (WP-0A-A0-004); Playwright artifacts in CI; a flag registry and its check; WP-0A-A0-002's acknowledgement of the two
   amended floor files on the merged head. Until the first two exist, every PR is H (RFC-2026-030 §9).
