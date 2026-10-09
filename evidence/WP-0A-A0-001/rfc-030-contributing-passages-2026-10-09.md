# RFC-2026-030 §7: the three `CONTRIBUTING_AGENTS.md` passages, side by side with the guide as edited

Date: 2026-10-09. Author: `/claude/a0_atlas` (A0), through a subagent of A0's run, writing for WP-0A-A0-001, which owns
`CONTRIBUTING_AGENTS.md`. **This file is the Author's record. It is not a review, test or integration verdict.**
Base: `origin/main` `9d0b3d23764cfe60b6fefb6b9688ff485f44fe33`. Source text: `architecture/decisions/RFC-2026-030-risk-tiered-review.md`
§7, as merged by PR #213 (Approved 2026-10-08 by the Product Owner; last changed on `main` by `b93a1be2`).

## 1. What this increment does, and why

RFC-2026-030 §7 replaces three passages of the guide "word for word" and says "The rest of each paragraph is unchanged."
§10 item 1 owes them to WP-0A-A0-001, together with "a citation of RFC-2026-025 §6 in 'Temporary manual merge control'
(already owed there by RFC-2026-025 §6.6 item 3)". `work-packages/WP-0A-DB-00.json` `open_blockers[204]` item (3) lists the
same three passages as owed by WP-0A-A0-001, "a governance PR of its own after this one merges". This increment makes
exactly those four changes and nothing else in the guide.

RFC-2026-030 §9 item 1 makes these edits one of the conditions for the RFC to take effect; item 2 (the CI step running the
base's copy of the classifier, WP-0A-A0-004) is the other. Until both are on `main`, every PR is H (§9). Merging this PR
alone therefore makes no PR lighter.

## 2. Side by side

The RFC's replacement texts are blockquotes wrapped at the RFC's width. They were extracted mechanically
(by a scratch script of the run, not committed): the six blockquote groups of §7 in order (a today, a new, b today, b new,
c today, c new), each group's lines trimmed and joined with single spaces. Paragraphs (a) and (b) sit on one line each in
the guide, so the replacement is inserted as one line. The bullet of (c) sits in a section wrapped at 80 columns with a
two-space continuation indent, so it is re-wrapped the same way; for the comparison its lines are trimmed and joined with
single spaces, the same normalisation as the RFC's side.

### (a) "Separation of duties", `CONTRIBUTING_AGENTS.md:27`

Replaced (RFC "today", found verbatim on `origin/main`):

> Every implementation package has distinct Author, Independent Reviewer, Independent Tester, and Integration Owner.

RFC-2026-030 §7 (a), "Proposed replacement, word for word", joined:

> Every implementation package has distinct Author, Independent Reviewer, Independent Tester, and Integration Owner, and no role is ever held by the Author's run. How many of them read each pull request follows its risk tier under [`RFC-2026-030`](architecture/decisions/RFC-2026-030-risk-tiered-review.md), decided by the base's copy of `scripts/db/classify-review-tier.mjs` and never lowered by hand: tier H (migrations and RLS, auth, secrets and OAuth, publishing, billing, CI and gates, contracts, every module not on the reviewed module allowlist, and anything the classifier cannot place) is read by every role on every pull request; tier M by the Reviewer and the Tester, and tier L by one Reviewer with the Tester reading CI artifacts, each with the Integration Owner's verdict at the end of the work package and the merge pressed by a run that is not the Author's; records-only pull requests follow RFC-2026-025 §6. A stop-the-line or security finding raises any pull request to tier H.

Guide as edited: the same bytes, followed by the paragraph's unchanged remainder ("The Author may move work only through
`in_review`; ...").

### (b) "Verification and handoff", `CONTRIBUTING_AGENTS.md:59`

Replaced:

> The Integration Owner verifies the final state and CI before merging.

RFC-2026-030 §7 (b), joined:

> The Integration Owner verifies the final state and CI before merging; for a tier M or L pull request under RFC-2026-030, the Integration Owner's verdict is given at the end of the work package instead (RFC-2026-030 §3.2), and the merge is pressed by a run that is not the Author's.

Guide as edited: the same bytes, between the paragraph's unchanged first sentence and its unchanged last sentence.

### (c) "Temporary manual merge control", `CONTRIBUTING_AGENTS.md:69-74`

Replaced (the guide's bullet, lines joined; equal to the RFC's "today" quote joined):

> - Before the Product Owner merges, the head commit must have a green required CI run and linked Author, independent Reviewer, independent Tester, Security/Privacy (when required), and Integration Owner evidence.

RFC-2026-030 §7 (c), joined:

> - Before the Product Owner merges, the head commit must have a green required CI run and linked Author, independent Reviewer, independent Tester, Security/Privacy (when required), and Integration Owner evidence; for a tier M or L pull request under RFC-2026-030, the linked evidence is what RFC-2026-030 §3 names for its tier, and the Integration Owner's verdict follows at the end of the work package (RFC-2026-030 §3.2).

Guide as edited, as it sits in the file:

```markdown
- Before the Product Owner merges, the head commit must have a green required CI
  run and linked Author, independent Reviewer, independent Tester,
  Security/Privacy (when required), and Integration Owner evidence; for a tier M
  or L pull request under RFC-2026-030, the linked evidence is what RFC-2026-030
  §3 names for its tier, and the Integration Owner's verdict follows at the end
  of the work package (RFC-2026-030 §3.2).
```

### (d) The citation of RFC-2026-025 §6, `CONTRIBUTING_AGENTS.md:75-78`

Neither RFC prescribes wording. RFC-2026-025 §6.6 item 3 says only that the section "should cite §6 once it is approved"
(§6 was approved 2026-10-08). **The wording is A0's**, kept to a citation: it names the two things §6 governs (§6.1-§6.2,
records-only PRs; §6.3, merging `main` into a PR branch) and adds no rule. It is a bullet of its own, after (c), so that
(c) stays the RFC's words alone:

```markdown
- A records-only pull request, and a mechanical sync of `main` into a pull
  request branch, follow
  [`RFC-2026-025`](architecture/decisions/RFC-2026-025-owner-delegated-merge.md)
  §6.
```

## 3. Byte comparison

Measured by a scratch script of the run (not committed) in the worktree, after the edit, using the same extraction. Hashes are the
first 16 hex digits of SHA-256 over the UTF-8 bytes.

| Passage | Guide text compared | RFC bytes | Guide bytes | RFC sha256 | Guide sha256 | Result |
|---|---|---|---|---|---|---|
| (a) | the exact substring on line 27 | 994 | 994 | `6bdc206863404ebf` | `6bdc206863404ebf` | equal |
| (b) | the exact substring on line 59 | 282 | 282 | `6f8ea9680bc6db7c` | `6f8ea9680bc6db7c` | equal |
| (c) | lines 69-74, trimmed and joined | 424 | 424 | `10ec4ddb61171108` | `10ec4ddb61171108` | equal |
| (d) citation, against A0's own text | lines 75-78, trimmed and joined | 181 | 181 | `a8814e6957183fdb` | `a8814e6957183fdb` | equal |

Further checks, same run:

| Check | Result |
|---|---|
| (a) and (b) "today" sentences present verbatim in `origin/main`'s guide | yes |
| (c) "today" bullet equals `origin/main`'s bullet, both joined | yes |
| Undo (a) and (b), take out the (c) bullet and the citation bullet: the rest of the file is byte-identical to `origin/main` | yes |
| "Current gate constraint" section byte-identical to `origin/main` | yes |

## 4. Other files this increment changes

- `test-kits/integrity-manifest.json` (WP-0A-A0-002's file): the one digest line for `CONTRIBUTING_AGENTS.md`, rebuilt by
  `npm run regenerate:manifest` (108 digests; no other line changes). Declared in this package's
  `ownership.amends_without_owning`; WP-0A-A0-002's acknowledgement is owed on the merged head.
- `work-packages/WP-0A-A0-001.json`: `ownership.amends_without_owning` (paths now the integrity manifest only; the
  previous increment's `work-packages/WP-0A-A0-010.json` is dropped because this branch does not change it, rationale
  appended) and one appended `open_blockers` entry for this increment. `status` stays `integration_verified`.
- `handoffs/WP-0A-A0-001-author-handoff.json`: rewritten for this increment and refreshed last and alone.
- This file.

Searched and left alone: no test or script pins the guide's wording (`git grep` for the three old sentences outside
`evidence/`, `handoffs/`, `work-packages/`, `architecture/` and `docs/` finds only the guide itself);
`scripts/verify-test-coverage-floor.mjs` lists the guide by path only; `test-kits/branch-identity.test.mjs` already pins
this branch name.

## 5. What this increment does not do

- **"Current gate constraint" is not touched.** That edit is the Owner's (disposition
  `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-08-g0-exit-and-g1-decisions.md` §6, §10.3), after the
  First-Slice freeze, in a separate PR.
- It does not close DB-00 `open_blockers[204]` item (3). That entry is WP-0A-DB-00's (and its lines are pinned by
  `db/foundation/lint/audit-coverage-map.json`); closing it is a record for after this PR merges.
- It does not change RFC-2026-030, RFC-2026-025 or RFC-2026-002, and it adds no CI step (RFC-2026-030 §9 item 2 stays owed
  to WP-0A-A0-004).
- It records no role verdict and moves no status. It is a governance PR (RFC-2026-025 §5 item 6): who presses it is the
  Owner's to say.
