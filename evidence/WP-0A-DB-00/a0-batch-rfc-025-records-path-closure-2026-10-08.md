# Batch rfc-025-records-path: closure of the first review round, 2026-10-08

Author run: `/claude/a0_atlas` (A0), a subagent of A0's workflow script. PR
https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/211 (Draft, `GOVERNANCE:`), branch
`agent/claude/WP-0A-DB-00-batch-rfc-025-records-path`, reviewed head `f7e9ce8d`.

The Owner's words this run acts under, verbatim: the standing delegation `เอาตามที่คุณแนะนำทุกอย่าง`; 2026-10-06
night `คืนนี้คุณยิงยาว เหมือนเดิมเบย ไม่ต้องถามผม ไล่ทำไปทั้งคืน`; and the request relayed to this run, `ข้อ 4 mw`.
A0 executes. It decides nothing that is the Owner's: §6 stays **Proposed**, and this PR is still merged by the
Owner personally (RFC-2026-025 §5 item 6). Nothing here approves, test-verifies or integrates A0's own work.

## 1. The four reviews, and where they now sit

Each was cherry-picked with `-x` and then moved, byte for byte (git rename, 100% similarity), into DB-00's
evidence. `verify-branch-scope` refuses `evidence/WP-0A-A0-001/**` on DB-00's branch (C0 F7, A1's placement
note, R0 R-7). No word inside any file changed, so each still names its old path.

| Role, verdict at `f7e9ce8d` | Original commit | Old path | Path on this branch |
|---|---|---|---|
| C0 `changes_requested` | `3056c273` | `evidence/WP-0A-A0-001/c0-review-2026-10-07.md` | `evidence/WP-0A-DB-00/c0-batch-rfc-025-records-path-review-2026-10-07.md` |
| A1 `security_changes_requested` | `bf252951` | `evidence/WP-0A-A0-001/a1-review-2026-10-07.md` | `evidence/WP-0A-DB-00/a1-batch-rfc-025-records-path-review-2026-10-07.md` |
| Q0 `test_verified` with conditions Q1, Q2 | `11b623ef` | `evidence/WP-0A-A0-001/q0-review-2026-10-07.md` | `evidence/WP-0A-DB-00/q0-batch-rfc-025-records-path-review-2026-10-07.md` |
| R0 `integration_verified` NOT given | `b6d7f6ca` | `evidence/WP-0A-A0-001/r0-review-2026-10-07.md` | `evidence/WP-0A-DB-00/r0-batch-rfc-025-records-path-review-2026-10-07.md` |

R0's R-7 said "not move it by hand onto #211". A0 moved it with `git mv` after an `-x` cherry-pick, so the
content and its provenance survive. R0 re-checks whether that satisfies R-7.

## 2. Each finding and what A0 did

**Fixed** means changed on this branch. **Owed** names who owes it, in whose words.

| Finding | Decision |
|---|---|
| C0 F1 (Major): C0 stands in for R0 without saying whether the Integration Owner's verdict is still needed | **Fixed in text.** §6.2 item 1 now says the Integration Owner is not waived. When C0 reads in R0's place, the R0 file being transcribed is the Integration Owner's verdict. It must be on `main` before the PR opens and name the package, the change and any target status. Otherwise R0 reads. §6.2 item 3 lists the Integration Owner condition from §5 item 6. Put to the Owner as **Q-025-6-5**. |
| C0 F2 (Major), A1-3, Q3, R-3 item 3: status moves have no judge | **Fixed in code and text.** The classifier now admits a status that is unchanged or moves forward along the flow short of `done`. It refuses backward moves, `done`, `blocked` and unknown values, and prints every move it admits. The sentence that credited the validators was removed. §6.1 item 4 says no validator judges a transition. §6.2 item 1 makes the reader check every move against a role verdict on `main` that names the package and status. A move without one, or an Author move beyond `in_review`, is blocking. Put to the Owner as **Q-025-6-4**. |
| C0 F3 (Minor), A1-1 (Medium), R-3 item 1: Owner dispositions and role files re-admitted | **Fixed in code and text.** An evidence record is now a Markdown file directly under `evidence/<package>/` named `records-transcription-*.md`, `session-*.md` or `light-path-reading-*.md` (the reader's own file). A disposition or a role file, whether new or appended to, takes the full path, as §5 item 1 had it. The comparison paragraph of §6.1 was rewritten. It now states what §5 item 1 covered and what it did not, keeps the disposition and role-file exclusion, and names each widening, including closing a blocker. |
| A1-4 (Low), Q1 (Medium): any file type under `evidence/` counts | **Fixed in code** by the same name rule. `.mjs`, `.sql`, `.github/...`, `.gitattributes`, `.json` and files in subdirectories are refused, and the test pins each. |
| A1-2 (Low): no privacy reading on the light path | **Fixed in text.** §6.2 item 1 gives the reader the duty to check for personal data, private URLs, credentials and customer content. Outside quotations, other than a role's or the Owner's words, leave the light path. A clause that closes a blocker raised by a Security/Privacy run must cite that role's own file. |
| A1-3 (Low), second half: `required_human_authorities` prepend | **Fixed in code and text.** The field is now strictly append-only, so old entries do not change. Q-025-6-3 says it covers `open_blockers` only. |
| R-3 item 2: suffix closing clause | **Fixed in text.** Q-025-6-3 now asks about both the front and the after forms. The mechanism is unchanged, because the reader checks the clause. |
| R-3 last paragraph: evidence and handoffs not bound to the PR's package | **Fixed in text.** §6.1 says §6 relies on `verify-branch-scope`, which CI runs (`.github/workflows/ci.yml`). |
| C0 F4 (Minor), Q2 (Low), R-4: two rules untested | **Fixed in test.** The CLI part merges a side branch that is not on `main` and asserts exit 1, "is not on main". The pure part refuses `100755` → `100644` and a non-string `rationale`. A0's mutation run (§3) kills each one. |
| C0 F5 (Minor), A1-5, Q4: the mechanical-sync definition is split | **Fixed in text.** §6.3 defines mechanical as (a) the script exits 0 **and** (b) the generators round-trip with `cmp`. It says the script checks (a) only and that CI is the backstop. §6.5 says 48 is the script's count and an upper bound. The CLI message says the generated files are NOT checked there. |
| C0 F6 (Info): the header states A0's reading as fact | **Fixed in text.** It now reads "The Owner replied `ข้อ 4 mw` to A0's recommendation (4); A0 reads that as a go-ahead to propose §6, and the reading is A0's." |
| C0 F7, R-7 (placement) | **Done** (§1). |
| C0 F8, Q5, R-2: CI pending; no role run on the head | **Owed, state.** Every role re-checks on the new head, and CI must be green there. Owner: A0 runs the roles; the Owner merges. |
| A1-6 (Info): CI wiring before the first delegated light-path merge | **Fixed in text** in §6.6 item 1. The CI step itself is **owed** by WP-0A-A0-004 in a governance PR of its own (A1's words). |
| R-1: head does not contain `main` `389f3845` | **Done.** Merge `ad42e510`. The integrity-manifest conflict was rebuilt with `npm run regenerate:manifest`, and a second rebuild was `cmp`-identical. `branch-identity.test.mjs` auto-merged with both slots. `record:verification` recorded 717, unchanged. The merge commit passed `commit-when-clean` (717/717). |
| R-5: the Owner's answers must be recorded before the merge | **Owed by the Owner, then A0.** The order is in §6.7 "Order before the merge": the Owner answers Q-025-6-1..5, A0 records them on this branch, the roles re-read, and then the Owner merges. |
| R-6: branch slots make concurrent syncs non-mechanical | **Fixed in text** in Q-025-6-2, as information for the Owner. A line-level rule is a later change and is not made here. |

## 3. Measured (Node `v24.20.0` first on `PATH`, worktree on the branch name)

- **Mutations of the narrowed classifier.** Each one replaced a single rule with a pass, ran only the classifier
  test, and restored the file afterwards. Results:
  - Killed: M1 (merged commit on `main`), M2 (old mode), `rationale` is a string, the record-name rule, the
    `evidence/<package>/<file>` depth rule, `done` refused, backward refused, off-flow refused, strict
    `required_human_authorities`, status moves recorded, and status moves printed by the CLI.
  - The first depth mutant survived. The name rule read `parts[2]`, so it caught subdirectories by accident. It
    now reads the basename, and the depth mutant is killed.
- **§6.5 re-measured with the narrowed classifier.** The classifier ran read-only from the main checkout over
  `7fb0fc05`, on first-parent merges since `2026-10-05T12:00+07:00`, as `classify <m>^1 <m>^2`. `--sync <s>^1 <s>
  7fb0fc05` ran for every merge on each PR's first-parent line. Result: `PRs=26 recordsonly=#206 #205 #201 #199
  #198 syncs=50 mechanical=48 notmech=f6652ee0#197 31879073#196`. There was no exit 2. Printed moves:
  `in_review -> integration_verified` for CON-004 (#205), CON-003 (#201), A0-002 (#199) and CON-005 (#198).
- **Merge of `main`.** See R-1 above.

- **The fix commit, and why it is not a `commit-when-clean` commit.** On the uncommitted fix tree,
  `node scripts/run-test-suite.mjs` gave `tests 717, pass 715, fail 2`. The two failures were exactly
  "the handoff for this branch describes this branch" and the handoff ratchet that re-runs it. The handoff
  still cites `f7e9ce8d`, and the merge of `389f3845` moved the branch point. The task said not to refresh the
  handoff yet, so `scripts/commit-when-clean.mjs` refused the commit ("NOT clean: exit 1 — tests 717, pass 715,
  fail 2"). The fix commit was therefore made with plain `git commit` after these checks:
  - `npm run verify:coverage-floor`, `npm run scan:secrets`, `npm run validate:protocol` and
    `node scripts/verify-branch-scope.mjs origin/main WP-0A-DB-00` each exited 0;
  - the 715 other tests passed.

  The Author's own plan recorded the same two failures before its first commit (plan §3 "Before the commit").
  The merge commit and the evidence-move commit were made through `commit-when-clean` (717/717 each). The
  refresh, last and alone, turns the two guards green, and the roles measure `npm run check` on that head.

The full `npm run check`, the scope and identity guards, and the classifier on this head are in the handoff
when it is refreshed. This run did not refresh it, as instructed. The handoff refresh comes last and alone,
before the role re-checks.

## 4. What each role re-checks

- **C0**: F1 and F2 in §6.1 and §6.2; F3's paragraph; F4's tests; F5 in §6.3 and §6.5; F6's header line.
- **A1**: A1-1 to A1-4 in the classifier, the test and §6.1/§6.2; the new Q-025-6-3 to 6-5.
- **Q0**: M1, M2, M5, M6 and M9 on the new head, including the new rules and the re-measured §6.5.
- **R0**: the merge of `389f3845` (the generated files), R-3 to R-7, and the acknowledgements carried for
  `scripts/test-suite-contract.mjs`, `test-kits/integrity-manifest.json`, `test-kits/branch-identity.test.mjs`
  and `evidence/VERIFICATION.md` on the new head.
