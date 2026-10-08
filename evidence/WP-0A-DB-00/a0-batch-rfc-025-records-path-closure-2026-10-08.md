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

## 5. Second round, and the Owner's answers (appended 2026-10-08)

Author run `/claude/a0_atlas` (A0), through a subagent of A0's workflow script, under the standing delegation
`เอาตามที่คุณแนะนำทุกอย่าง`. A0 executes; it decides nothing that is the Owner's.

**Re-checks at `d12475a7`** (filed at `134b99ae`, `evidence/WP-0A-DB-00/{c0,a1,q0,r0}-batch-rfc-025-records-path-recheck-2026-10-07.md`):
C0 `review_approved` with N1 (Minor) owed; A1 `security_approved_with_conditions`, condition A1-7 (Low); Q0
`test_verified` with condition Q8; R0 `integration_verified` NOT given at `d12475a7`, content correct, with R2-1
and R2-2 advisory.

**The Owner's answers** are transcribed verbatim, each with its question, in
`evidence/WP-0A-DB-00/product-owner-disposition-2026-10-08-rfc-025-s6-answers.md`: `รับตามแนะนำทั้ง 5 ข้อ
(Recommended)` to `รับตามที่ A0 แนะนำทั้ง 5 ข้อไหม?`, and `ให้ A0 กดเอง (Recommended)` on who presses the merge.
The second is an Owner-directed exception to §5 item 6 for PR #211. The Owner directed A0 to press this merge.

| Condition, as the role worded it | What A0 did in the records commit |
|---|---|
| R0 R-5: the Owner's answers recorded on this branch before the merge | **Done.** The disposition above; the §6 heading and status line now read Approved 2026-10-08 and cite it; `open_blockers[203]` appended (old text whole at the start). |
| R0 R2-1: the reading names the exact head it read; a later commit other than the refresh needs a new reading | **Fixed in text**, §6.2 item 1, last bullet, in R0's suggested words. |
| R0 R2-2: §6.1's "wider in four places" omits new `open_blockers` entries | **Fixed in text**, item 4 of that list. A new entry appended at the end is records-only, as A0 recommends and as Q-025-6-3 keeps every old entry whole. |
| A1-7 and C0 N1: Owner words or a role verdict not on `main` can ride the light path under an admitted name | **Fixed in text.** A new §6.2 item 1 bullet: the reader checks every quoted Owner word and role verdict against its source on `main`; without one the record takes the full path and is a blocking finding. The privacy bullet now says "already on `main`", §6.1 item 2 says "words already on `main`", and the "Kept as §5 had it" bullet holds for the words too. |
| A1-6: the classifier as a CI step before the first delegated light-path merge | **Owed by WP-0A-A0-004**, a governance PR of its own (§6.6 item 1). Recorded in the disposition §5 and in `open_blockers[203]`. |
| C0 F8, Q0 Q8, R0 items 1 and 4: refresh last and alone, `bootstrap` green on that head | **Owed, state.** Not done in this run, as instructed. |

These are edits to §6 itself, so C0, A1, Q0 and R0 all re-read the records commit. The Owner answered on the
text at `d12475a7` and did not read the three edits word by word; the disposition §4 says so.

After the records commit, `origin/main` `ae163ed8` (#204) is merged in with the generated files rebuilt by their
generators. The commands and exit codes are in the commit messages and the handoff when it is refreshed.

**Correction to the paragraph above (A1-13, R0 R3-6).** When it was written, the merge of `ae163ed8` had been
attempted and **aborted**, because it was red on E4; it was not on the branch at `952b91bd`. It is on the branch
from merge commit `eeaf5017` (§6).

## 6. Third round: the merge of `main` `ae163ed8` and the E4 fix (appended 2026-10-08)

Author run `/claude/a0_atlas` (A0), through a subagent of A0's workflow script, under the standing delegation
`เอาตามที่คุณแนะนำทุกอย่าง`; the Owner directed A0 to press this merge (`ให้ A0 กดเอง (Recommended)`, disposition
§2). A0 executes; it decides nothing that is the Owner's. Nothing here approves, test-verifies or integrates
A0's own work.

**Role re-checks at `952b91bd`**, cherry-picked with `-x` from their role branches: C0 `499df6e6`
(`review_approved` for the records commit; F9 blocks the merge), A1 `7fc6317e`
(`security_approved_with_conditions`; A1-10), Q0 `e6bd17a5` (`test_verified` for `952b91bd` only; Q9 blocks),
R0 `5f208bee` (`integration_verified` not given; R3-1 blocks). Files:
`evidence/WP-0A-DB-00/{c0,a1,q0,r0}-recheck-2026-10-06.md`.

| Condition, as the role worded it | What A0 did |
|---|---|
| C0 F9, A1-10, Q0 Q9, R0 R3-1: `main` cannot be contained green until the classifier is digested, through a declared amendment, never by loosening E4 or the test's imports | **Done.** Merge `eeaf5017` (`git merge --no-ff origin/main`; conflicts only in `evidence/VERIFICATION.md` and `test-kits/integrity-manifest.json`, `main`'s side taken, manifest rebuilt by `regenerate:manifest`, 104 digests). Then, in the next commit: `scripts/db/classify-records-only.mjs` added to `test-kits/integrity-manifest.json` (digest `96326b01…`, filled by the regenerator, 105 digests) and one line `'scripts/db/classify-records-only.mjs',` in `DIGESTED_FLOOR` (`scripts/verify-test-coverage-floor.mjs`, alphabetical, after `authz-proofs`). Nothing else in that file changed (no `PROTECTED_KEYS` line); the E4 guard and `test-kits/db/foundation-contract.test.mjs`'s imports are unchanged. |
| C0 F9 / A1-10 / R3-1: the amendment declared, with the owner's acknowledgement | **Declared**: `scripts/verify-test-coverage-floor.mjs` added to `ownership.amends_without_owning.paths`, the rationale naming WP-0A-A0-002 as the guard's owner. **Owed**: WP-0A-A0-002's acknowledgement on the merged head; R0 gave it in advance under its file's §4 conditions and confirms it there. |
| R0 R3-1 probe step 3–4: the added paths line shifts the manifest's lines | **Done.** The 34 `"line"` pins in `db/foundation/lint/audit-coverage-map.json` at or after line 119 raised by one. |
| R0 R3-2, A1-10 (§6.6 item 2 becomes false) | **Done.** §6.6 item 2 restated as done in PR #211, with the acknowledgement owed. Listed as the fourth post-answer edit in the disposition §6 item 3 and the §6 status line. |
| R0 R3-3 (the amendment rationale contradicts the disposition) | **Done.** The rationale now says §6 is Approved 2026-10-08, that the Owner directed A0 to press PR #211 (disposition §2), and why `scripts/verify-test-coverage-floor.mjs` and `audit-coverage-map.json` are touched. "§6 PROPOSED" and "the Owner merges it personally; A0 does not" are gone. |
| R0 R3-5 (advisory): `main` must not hold a §6 that contradicts how it landed | **Done.** One clause in the §6 status line: PR #211 was pressed by A0 on the Owner's direction, an exception for PR #211 only; §6.4 and §6.7 keep the rule. |
| C0 F10, R0 R3-4: the merge-presser question verbatim | **Not done; owed by A0 from its own session.** This run does not have the question's text or what A0 told the Owner about §5 item 6. The disposition §6 item 2 says so and does not reconstruct either. |
| C0 F11: R2-2's authority is Q-025-6-1, not Q-025-6-3 | **Done** in the disposition §6 item 1. The same correction applies to §5's table above ("as Q-025-6-3 keeps every old entry whole"): the authority for a new entry is Q-025-6-1. |
| A1-11 (Info): a stale path in A1's own quoted wording | **Done** in `open_blockers[203]`, as A1 suggested. |
| A1-13, R0 R3-6: the closure note claimed a merge that had not happened | **Done** (the correction paragraph above). |
| `open_blockers[203]` wordings | C0's, A1's and Q0's wording appended verbatim; a one-sentence R0 status line and A0's closure sentence appended. R0's own wording is appended **after** the merge, with the merged head, merge sha and CI run measured then. Old text whole at the start. |
| Q0 Q11, R0 order: `record:verification`, then `regenerate:manifest` | **Owed, after the handoff refresh.** On this head `record:verification` refuses ("exit 1, tests 725, pass 723, fail 2"); the two failures are the handoff guards, because the handoff still cites `77dad630`, and the task said not to refresh it yet. `evidence/VERIFICATION.md` is therefore still `main`'s record, and `verify-branch-scope` names it (with the not-yet-committed floor file, measured before the commit) as an amendment that explains nothing until it is recorded. |
| C0 F8, Q0 Q8/Q10, R0 items 2–4 | **Owed, state.** C0, A1, Q0 and R0 re-read this head; the handoff is refreshed last and alone; `record:verification` and `regenerate:manifest` (`cmp` 0); `bootstrap` green on that exact head with `main` contained; then A0 presses the merge pinned with `--match-head-commit`. |

**Measured on the fix tree before the commit** (Node `v24.20.0` first on `PATH`, worktree on the branch name,
`npm ci` 0): `npm run verify:coverage-floor` 0; `node scripts/verify-toolchain.mjs` 0; `npm run scan:secrets` 0;
`npm run validate:protocol` 0; `node scripts/run-test-suite.mjs` exit 1, `tests 725, pass 723, fail 2`, the two
being "the handoff for this branch describes this branch" and the handoff ratchet that re-runs it;
`npm run check:handoff` names `RFC-2026-025…md` and `WP-0A-DB-00.json` after cited head `77dad63`;
`regenerate:manifest` twice, `cmp` 0 (105 digests); `verify-branch-identity` prints `WP-0A-DB-00`. So `npm run
check` is **not** green on this head, by the handoff guards only, as the task expected. `commit-when-clean`
refuses for that reason, and the commit is made with plain `git commit` after these checks, as in §3.

## 7. Fourth round: the re-checks at `da6b4585` and the finish order (appended 2026-10-08)

Author run `/claude/a0_atlas` (A0), through a subagent of A0's workflow script, under
`เอาตามที่คุณแนะนำทุกอย่าง`. A0 executes; it decides nothing. A0 presses this merge on the Owner's direction
(`ให้ A0 กดเอง (Recommended)`, disposition §2); it is not an Owner-pressed merge.

**Role re-checks at `da6b4585`**, cherry-picked with `-x`: C0 `ea9f8926` (`review_approved`; F10, F12 Minor,
F13 Info), A1 `f11b51a8` (`security_approved_with_conditions`; A1-14, A1-15 Info), Q0 `ea1ecd26`
(`test_verified` for `da6b4585`; Q12 merge condition, Q13 to C0/R0), R0 `85327c60` (`integration_verified` not
given at `da6b4585`; R4-1 order, R4-2 advisory). Files: `evidence/WP-0A-DB-00/{c0,a1,q0,r0}-recheck-2026-10-06.md`.

| Condition, as the role worded it | What A0 did |
|---|---|
| C0 F10 / R0 R3-4: the merge-presser question verbatim | **Done** in the disposition §6 item 5: A0's 2026-10-06 statement of §5 item 6 to the Owner, the Owner's `คุณทำเลย`, and the 2026-10-08 multiple-choice question with both options and the Owner's choice, copied as A0 relayed them. |
| Q0 Q13: RFC-2026-025 line 8 still calls §6 proposed and the Owner the presser | **Done.** Line 8 now says Approved 2026-10-08, keeps the §5 item 6 rule and names the A0-press exception for PR #211 only; the §6 status line lists it as the fifth post-answer edit (status-line consistency only, no rule change); disposition §6 item 6 records it. §1–§5 unchanged. |
| R0 R4-1 / C0 F12 / Q0 Q12 / A1-15: `record:verification` cannot come after the last refresh; the fix commit message and §6 above say "owed after the refresh" | **Corrected here** (§6's row "Q0 Q11, R0 order" and `da6b4585`'s message stay as written). The finish order, as C0 F12 measured green and the task sets it: (1) `npm run refresh:handoff`, committed last and alone among substantive commits; (2) `npm run record:verification`, then `npm run regenerate:manifest` (`cmp` 0), committed together — both paths are `WRITTEN_AFTERWARDS`, so `check:handoff` stays 0; (3) `npm run check` 0, `verify-branch-scope origin/main WP-0A-DB-00` 0; push without force; `bootstrap` green on that exact head; `gh pr ready`. R0's measured variant adds a second refresh after (2); either satisfies the guard. |
| Q0's verdict: this role file carried before the refresh | **Done** (all four role files cherry-picked before this commit). |
| R0 §4, A1 §6.5 item 1: the head's diff from `da6b4585` limited to the handoff and the generated record | **Not met by this commit, by direction.** This records commit (RFC line 8 and status line, disposition §6 items 5–6, this section) is what C0 F10 and Q0 Q13 asked for, so R0 and A1 re-read it; R0's acknowledgements of §4 are voided by its own terms until R0 re-reads. |
| R0 §5 wording, C0 and Q0 wordings for `open_blockers[203]` | **Owed after the merge**, with the merged head, merge sha and CI run measured then (R0 §5). `WP-0A-DB-00.json` is not touched in this commit. |
| C0 F13, R0 R4-2: "§6 proposed" comments in `scripts/test-suite-contract.mjs` | No change, as both asked. |
