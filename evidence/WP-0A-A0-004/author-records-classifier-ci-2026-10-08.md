# WP-0A-A0-004 — Author record: the RFC-2026-025 §6 records-only classifier in CI (2026-10-08)

Author: `/claude/a0_atlas` (A0), through a subagent of A0's workflow run. **A0 executes; it decides nothing.**
This file records the Author's increment and self-check. It is not a review, a test verdict or an
integration verdict, and no role has read this increment yet.

Branch: `agent/claude/WP-0A-A0-004-ci-independent-guard-step`, recreated from `origin/main` `bd019c9c`
(the earlier branch of that name, tip `167f4838`, is an ancestor of `main`: PR #197 was merged).

## 1. The Owner's words, verbatim

**Question (A0, chat):** may A0 press this governance PR (the CI wiring of RFC-2026-025 §6.6 item 1)?

**The Owner replied, 2026-10-08:** `ให้ A0 กดเอง ลุยตามแนะนำเลย`

A0's translation: "let A0 press it itself; go ahead as recommended". A0 records this as an Owner-directed
exception to RFC-2026-025 §5 item 6 for this pull request only, in the form PR #211 received one
(`evidence/WP-0A-DB-00/product-owner-disposition-2026-10-08-rfc-025-s6-answers.md` §2). Nothing else is read
into it: it waives no role verdict, no green `bootstrap` on the final head and no open security finding.
Standing words also in force: `เอาตามที่คุณแนะนำทุกอย่าง` (standing delegation) and, 2026-10-06 night,
`คืนนี้คุณยิงยาว เหมือนเดิมเบย ไม่ต้องถามผม ไล่ทำไปทั้งคืน`.

## 2. What is owed and what this increment does

RFC-2026-025 §6.6 item 1 (approved 2026-10-08) and A1-6 on PR #211: "A step that prints the classifier's
verdict on every PR, without gating on it, is owed" in `.github/workflows/ci.yml`, owned by this package,
before the first delegated light-path merge.

- `.github/workflows/ci.yml`: one step, `Classify the pull request for the records-only light path
  (informational, gates nothing)`, inside the existing `bootstrap` job (the required context is unchanged),
  `if: github.event_name == 'pull_request'`, after `Verify pinned toolchain` and before `Clean install`.
  It reads `scripts/db/classify-records-only.mjs` out of the **base** commit (`git show <base.sha>:...`),
  runs it on `<base.sha>..HEAD`, and prints `RECORDS-ONLY` or `NOT RECORDS-ONLY` with the reason and the
  classifier's own output to the log and to the job summary. Fail closed: `RECORDS-ONLY` only on exit 0 with
  a first line `records-only: `; a base branch not exactly `main`, an empty/missing base, a base with no
  classifier, exit 1, or any other exit (2: a diff or blob git could not read) is `NOT RECORDS-ONLY`.
  It writes no step output, environment or path, has no `id`, and its only `exit` is `exit 0`, so it cannot
  make a PR pass anything it would otherwise fail, nor fail one.
- The negative-control skip rule is unchanged; the decision step stays the only `GITHUB_OUTPUT` writer, and
  the existing test that pins that still passes.
- `architecture/decisions/RFC-2026-007-ci-independent-guard-step.md`: Amendment 2026-10-08 (§A step,
  §B tests, §C what it does not do, §D rollback). RFC-2026-025 is not edited: its §6.6 item 1 already names
  this step as owed, and its closure is recorded here and, after the merge, in WP-0A-DB-00 `open_blockers[203]`
  by that package's owner.
- `test-kits/branch-scope.test.mjs`: six tests (21 to 27), run against scratch repositories whose base
  commit holds the real classifier: shape and placement; records-only diff; code diff, rewritten record and
  Owner disposition; a head that forges the classifier; every unclassifiable diff (empty, missing, non-commit
  base, no repository, no classifier at base, no merge base, missing blob); base not exactly `main`.
- Amended without owning (declared in the manifest): `scripts/test-suite-contract.mjs` three lines (floors
  21→27 tests, 112→146 assertions; name digest `c89691d0316299fb`→`6ffa7b5c06c5877c`) and
  `evidence/VERIFICATION.md` (regenerated). `test-kits/integrity-manifest.json` regenerated under
  `authorized_cross_package_amendments[1]`.

## 3. Self-check

Commands run on the branch name, Node 24.20.0 / npm 11.19.0. Exit codes are in the PR body and handoff.

- `node --test test-kits/branch-scope.test.mjs` — 27/27 pass.
- `npm run regenerate:manifest`, `npm run record:verification`, `npm run check`, `npm run verify`.
- `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-004`.
- `npm run refresh:handoff` last and alone, then `npm run check:handoff`.

## 4. Still owed (none by the Author)

C0, A1, Q0 and R0 on this head; WP-0A-A0-002's acknowledgement of the three `scripts/test-suite-contract.mjs`
lines on the merged head; `bootstrap` green on the final head; the first platform run of the step read once
(log line and job summary); after the merge, WP-0A-DB-00 records the closure of A1-6 in its next PR. The
merge is pressed by the orchestrator on the Owner's words of §1, not by this run.
