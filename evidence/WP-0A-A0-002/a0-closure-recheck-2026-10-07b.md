# A0 closure of the 8206b0cb re-check findings on WP-0A-A0-002

Run: `/claude/a0_atlas` (Author), through a subagent of its workflow. PR
https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/204, branch
`agent/claude/WP-0A-A0-002-contract-test-coverage-2026-10-07`. All four re-checks were taken at head
`8206b0cb74f0fe142b73504cc11c2d96311381b9`.

A0 executes here under the Product Owner's standing delegation `เอาตามที่คุณแนะนำทุกอย่าง`. A0 decides nothing below.
Each change applies the remedy the roles themselves measured, and the roles re-check it. This file approves nothing,
moves no status and is not a re-verification. The PR stays GOVERNANCE (test-integrity guard).

## 1. Role files carried onto the branch

Cherry-picked with `-x`, in this order: `98e83e7b` (C0, `changes_requested`, N1 blocking), `c7279ccb` (A1,
`security_approved_with_conditions`, N3), `0fc19129` (Q0, `test_verified_with_conditions`, Q0-E8 / Q0-C12),
`a1b8def8` (R0, `integration_changes_requested`, R11-R13). They add only
`evidence/WP-0A-A0-002/{c0,a1,q0,r0}-recheck-2026-10-07b.md`.

The scratch worktree had been wiped by a restart. It was re-created on the branch NAME from the pushed head
`8206b0cb`. The branch was still registered to the abandoned worktree `.claude/worktrees/wf_47f64ed4-27f-1`
(no process in it, index last written 2026-10-06 22:55, its files behind the branch), so `git worktree add -f`
was used. That worktree was not touched.

## 2. Disposition

| Finding | Grade (as the role gave it) | Disposition |
|---|---|---|
| C0 N1 / A1 N3 / Q0-E8 (Q0-C12) / R0 R11: `of` used as an identifier, and a private name spelled like a keyword (`this.#return`, `this.#typeof`, `Q0P.#in`), before `/` opened a regex that hid an import | blocking / Medium / non-blocking with condition / blocking | **Fixed in code**, the remedy all four measured. `of` is removed from `KEYWORDS_BEFORE_REGEX`, and a word whose preceding significant character is `#` is a member, like one after `.`. A regex after `for (x of` is read as division again, which the roles record as failing closed [CORRECTED 2026-10-07 by A0 on R0 R14, `a0-closure-recheck-2026-10-07c.md`: it does not fail closed. A quote in that regex body opens a string that can run over an import (guard 0, payload ran), so it is an OPEN misread like a regex after `)`, recorded in `[11]`]. |
| C0 N2: `lastWord` reset after a string unpinned (M6 survived) | non-blocking | **Pinned** with one case: `return 'a' / 2 + import(...) / 1` reads as division. |
| Records: guard comment, `open_blockers[11]`, closure note §4 said "never after a member name" | (part of N1 / N3 / Q0-C12) | **Corrected.** The sentence is now true for `.` and `#` members, so it stays, with `of` dropped from the keyword list. `[11]` carries a dated CORRECTED entry. `a0-closure-recheck-2026-10-07.md` §4 has inline CORRECTED markers. A nested template and a regex after `)` stay recorded as OPEN residuals. |
| R0 R12: the path count at the final head | advisory | Measured on the branch name after the merge of `origin/main`; see §4. |
| R0 R13 / A1 (2) / C0: handoff stale, CI red on it | process | **Owed as before.** The handoff is not refreshed here. It is refreshed last and alone after the re-checks. |

## 3. Cases and mutants

Cases added to the existing test `a comment, a string and a whitespace run do not change where a regex may begin`.
No test name was added, so the per-file declared count and the test-name digest do not move. The test now also
requires that a case containing `import(` keeps `import(` in the stripped code.

- `const of = 4; const q = of / 2 + import('./x.mjs') / g;` (division)
- `this.#return / 2 + import('./x.mjs') / 1` inside a class (division)
- `this.#typeof / 2 + import('./x.mjs') / 1` inside a class (division)
- `C.#in / 2 + import('./x.mjs') / 1` on a static private field (division)
- `return 'a' / 2 + import('./x.mjs') / 1` (C0 N2, division)

`node --test --test-reporter=tap test-kits/test-coverage-floor.test.mjs`. A no-op comment edit fails five tests,
1, 14, 20, 22 and 23, which are the digest checks, so a mutant is killed when it fails anything beyond those five.

| Mutant | Failures | Beyond the digest five |
|---|---:|---|
| M0 no-op comment | 5 | none (baseline) |
| `of` restored to the set | 6 | test 34, `a comment, a string and a whitespace run ...` (killed) |
| `#` no longer marks a member | 6 | test 34 (killed) |
| C0 M6: `lastWord` kept after a string or template | 6 | test 34 (killed) |

Real guard, one line prepended to `test-kits/db/ws905-fixture.mjs`, `regenerate:manifest`, then
`node scripts/verify-test-coverage-floor.mjs`; the fixture and manifest were restored afterwards. The suite was not
run on these, so no payload ran.

| Probe | Guard |
|---|---:|
| `let of = 1, __g = 1; const __q = of / 2 + import('<outside>') / __g;` (C0 N1) | 92 |
| `class __C { #return = 1; f() { return this.#return / 2 + import('<outside>') / 1; } } ...` (C0 N2 probe) | 92 |
| `class E4 { #typeof = 4; m() { return this.#typeof / 1; } }; import '<outside>'; ...` (A1 N3) | 92 |
| `class Q0P { static #in = 4; static run() { return Q0P.#in / 2 + import('<outside>') && 1 / 1; } }` (Q0-E8) | 92 |
| `const __f = () => { return 'a' / 2 + import('<outside>') / 1; };` (C0 N2) | 92 |
| Clean tree | 0 |

## 4. Commands and the merge of main

Node v24.20.0 (`/Users/bank/.local/node-v24.20.0/bin`, first on PATH), on the branch name.

- `npm run regenerate:manifest`: 104 digests rebuilt.
- `node --test test-kits/test-coverage-floor.test.mjs`: 43/43.
- `node scripts/verify-test-coverage-floor.mjs`: 0.
- `npm run check`: exit 1, 722/724. The two failures are `the handoff for this branch describes this branch` and
  `the handoff ratchet fails when an author handoff claims another role approved something`. Both fail only because
  the handoff is deliberately stale.
- With a throwaway `npm run refresh:handoff` on the branch name, `npm run verify`: exit 0,
  `clean: exit 0 — tests 724, pass 724, fail 0, skipped 0, todo 0`. The handoff was then restored with
  `git checkout`.
- `node scripts/commit-when-clean.mjs` refuses this commit for the same two stale-handoff tests, so, as in
  `a0-closure-recheck-2026-10-07.md` §3, the commit is made with plain `git commit` and does not carry the handoff.
  `check:handoff` is owed to the step that refreshes the handoff last and alone.

`origin/main` had moved from `9b4a0ce6` to `dc7b9684` (PRs #207 and #209 among others). It is merged after this
commit with a normal merge. Generated tables are regenerated (`regenerate:manifest`, `record:verification`).
The path count at the resulting head is measured with `node scripts/verify-branch-scope.mjs origin/main
WP-0A-A0-002` and reported by A0 with the push.

Measured after the merge (merge commit `c1a6b351`, no conflict), on the branch name:

- `npm run regenerate:manifest`: 104 digests, no change. `node scripts/verify-test-coverage-floor.mjs`: 0.
- `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-002`: exit 0, "all 25 changed path(s) are declared"
  (R0 R12: 25 at this head; 20 at `8206b0cb`). The five added are this round's four role files and this note.
- With a throwaway `npm run refresh:handoff` (it would cite `7fb0fc0..c1a6b35`, 16 added, 9 modified, 0 deleted):
  `npm run record:verification` recorded 724 passing, `evidence/VERIFICATION.md` unchanged; `npm run verify` exit 0,
  `clean: exit 0 — tests 724, pass 724, fail 0, skipped 0, todo 0`. The handoff was restored afterwards.
- This paragraph is committed after the merge, with plain `git commit` for the same stale-handoff reason.

## 5. What this run did not do

It moved no status, refreshed no handoff, closed no blocker and merged no PR. It edited no file outside the paths
this package already changes. It changed nothing in `db/**`, `migrations/**` or `.github/**`.
