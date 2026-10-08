# Batch rfc-030-risk-tiered-review: closure of the first review round, 2026-10-08

Author run: `/claude/a0_atlas` (A0), a subagent of A0's workflow script. PR
https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/213 (Draft, `GOVERNANCE:`), branch
`agent/claude/WP-0A-DB-00-batch-rfc-030-risk-tiered-review`, reviewed head `95f2d115`.

The Owner's words this run acts under, verbatim: the standing delegation `เอาตามที่คุณแนะนำทุกอย่าง`; 2026-10-06
night `คืนนี้คุณยิงยาว เหมือนเดิมเบย ไม่ต้องถามผม ไล่ทำไปทั้งคืน`; and the request relayed to this run,
`รับตามแนะนำทั้งหมด รวม RFC-030 ด้วย ลุยเลย`. A0 executes. It decides nothing that is the Owner's: RFC-2026-030's final
text, Q-030-1 to Q-030-6 and the merge stay the Owner's (RFC-2026-025 §5 item 6). Nothing here approves,
test-verifies or integrates A0's own work.

## 1. The four reviews

Each was cherry-picked with `-x` onto this branch. They were already under `evidence/WP-0A-DB-00/`, so nothing moved.

| Role, verdict at `95f2d115` | Original commit | Commit on this branch | Path |
|---|---|---|---|
| C0 `changes_requested` (blocks: F1) | `0c53e1be` | `48f06411` | `evidence/WP-0A-DB-00/c0-review-2026-10-07.md` |
| A1 `security_approved_with_conditions` (blocks: A1-4, A1-1, A1-5) | `5b339099` | `f828ee83` | `evidence/WP-0A-DB-00/a1-review-2026-10-07.md` |
| Q0 `test_verified` with conditions Q1-Q4 (does not block) | `47d59629` | `148ba3d0` | `evidence/WP-0A-DB-00/q0-review-2026-10-07.md` |
| R0 `integration_verified` NOT given (blocks: R-1) | `d4045309` | `c092b50c` | `evidence/WP-0A-DB-00/r0-review-2026-10-07.md` |

Each file's name carries 2026-10-07, the date the task gave it; each reading was made on 2026-10-08, as each file says.

## 2. Each finding and what A0 did

**Fixed** means changed on this branch: in `scripts/db/classify-review-tier.mjs`, in its test
(`test-kits/db/foundation-contract.test.mjs`, the one review-tier test, which now pins every probe the round measured), or
in the RFC text. **Owed** names who owes it. Several findings from different roles are the same defect; each row lists all
of them.

| Finding | Decision |
|---|---|
| C0 F1 (Major), A1-3, Q0 Q2, R0 R-3: L's "no data path" is not decided by the classifier; imports, server actions, third-party URLs pass | **Fixed in code and text.** An L file now (a) imports only `react` and files that exist at the head and are L paths, resolved against the head's tree (a package, an alias, `ui/useX.ts`, or a path that resolves to nothing is a data path); (b) carries none of the widened data-path signals: absolute URLs other than XML namespaces, `action=`/`formAction`, `navigator.`, `postMessage`, `window.location`, `location.href`, `window[`/`globalThis[`, `new Image(`, `<iframe`, dynamic `import(`/`require(`, and any `.from(` but `Array.from(`. Both of C0's options are taken: the classifier fails closed on imports, **and** §4.3 says "no data path" is not fully mechanical and the L Reviewer confirms it in writing with the flag. The CLI's L line says so. Q-030-3 now asks about both. |
| C0 F2, Q0 Q3, R0 R-1 (blocks R0), A1-1 first half: H path words exact-match only; auth, tenancy, billing words missed; acronym runs merged | **Fixed in code and text.** Paths are split on acronym runs too (`APIClient` = `api client`), adjacent words are also tried joined (`SignIn` = `signin`), and a word that starts with one of 60+ stems is H (`auth`, `tenan`, `ident`, `crypt`, `encrypt`, `subscri`, `invoic`, `refund`, `member`, `invit`, `account`, ...), plus exact words `signin`, `logout`, `jwt`, `csrf`, `cookie`, `mfa`, `otp`, `sso`. Every path the four reviews named is pinned as H. §4.2 item 4 lists the words and stems and says the list is a denylist. |
| A1-1 (Medium, blocks A1): M/L rests on a denylist; a module allowlist is the fail-closed form | **Fixed in code and text.** `M_ELIGIBLE_MODULES` is a frozen, **empty** allowlist in the classifier: a module path whose key is not on it is H, so every module path is H today. §4.2 item 6 says how a module is added (a governance PR after RFC-2026-029's layout, never one owning identity, tenancy, billing, publishing, uploads, jobs or providers); §9 item 3 makes it a condition of M; §10 item 7 owes it to WP-0A-DB-00. Q-030-4 now asks allowlist-plus-wide-denylist. |
| A1-4 (Medium, blocks A1): the head's copy decides its own tier | **Fixed in text and code.** §2 and §4 say the tier is the one printed by the base's copy of both classifier files, give the command (`git archive <base>` of the two files), and say any other copy's tier is void. The CLI prints `classifier copy: the base's` or `NOT the base's` (it compares both files' blobs with the base's). A change to either classifier is H by its own rule (§4.2 item 1), whatever any copy prints. §3.1 has readers check the copy line; §10 item 2 has CI run the base's copy. |
| A1-5 (Low, blocks A1), R0 R-6: the Author can press its own M/L merge | **Fixed in text, and put to the Owner.** §3.1 and §2 now say the merge of an M or L PR is pressed by a run that is not the PR's Author (A1's option (a), which A0 recommends). **Q-030-5** asks the Owner, with option (b) written out. |
| A1-2 (Medium, precondition): `\b` signals miss camelCase and snake_case identifiers, `process["env"]`, `Deno.env` | **Fixed in code.** Identifiers in an added line are split into sub-words like paths and matched against a secret/payment/webhook/OAuth/environment list; any `process.`/`process[`, `Deno.env`, `Bun.env` and `env` as an identifier are the environment. All twelve of A1's lines are pinned. §9 records the precondition as met. |
| C0 F3, A1-3 (sinks), Q0 Q2 (P4, P5), R0 R-3: SVG `onload=`, `innerHTML`, `javascript:` and more pass at L | **Fixed in code.** H sinks now include `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `javascript:`, `<foreignObject`, `srcdoc`, string timers and lower-case HTML event-handler attributes (`onload=`, `onerror=`, also in copy JSON), while JSX `onClick={...}` stays clean (pinned both ways). A public SVG is no longer an L path. |
| C0 F4, Q0 Q4, R0 R-2 (part), A1-7 (part): a module's `package.json`/`tsconfig.json` is M | **Fixed in code.** `package`, `lock` are H words and `config`, `tsconfig`, `jsconfig`, `eslint`, `babel`, `npmrc`, `yarn`, `pnpm` H stems, so these files are H wherever they sit (pinned). |
| C0 F5, R0 R-2: cross-module imports and job/side-effect code are M | **Fixed in code.** A module file that imports another module (relative into `src/modules/<other>/` or an alias naming `modules/<other>`) is H. Stems `job`, `queue`, `cron`, `schedul`, `worker`, `retry`, `storage`, `bucket`, `upload`, `purge`, `delet`, `erase`, `provider`, `adapter`, `integrat`, `mail`, `email`, `notif`, `sms` make that code H. |
| C0 F6, A1-6: removed lines are never read | **Fixed in code and text; a consequence put to the Owner.** Removed lines are now read. An L file whose diff removes any line is not L (M in a module, H outside one), as A1 recommended; a module file that removes a guard-shaped line (flag, permission, role, tenant, auth, allow/deny, sanitize/escape, `throw`, `if (!`) or a line with an H signal is H. **Q-030-6** asks the Owner to accept that only additions are L. |
| Q0 Q5, R0 R-3 (last): an added line starting with `++` is dropped | **Fixed in code.** `patchLines` reads only lines inside a hunk, so the `+++ b/` header is skipped and `++i; eval(...)` is read (pinned with a real `git diff -U0` shape). |
| Q0 Q1, A1-8: any file under `evidence/**` is neutral; a role verdict can be rewritten; another package's evidence rides along | **Fixed in code and text.** Neutral evidence is a Markdown file directly under `evidence/<package>/`, added or appended to (a removed line is a rewrite and H); other types and subdirectories are not neutral; records of more than one package make the PR H. Q0's probes (`.mjs`, `.sql`, CI-shaped path, subdirectory, BLOCK→APPROVED rewrite, foreign package) are pinned as H. |
| R0 R-4: a status move is silent outside the records path | **Fixed in code and text.** Every manifest status move is printed; a move past `in_review` in a non-records PR is H (§4.2 item 3, §3.2 item 1). |
| R0 R-5: two more `CONTRIBUTING_AGENTS.md` sentences require the Integration Owner per merge | **Fixed in text.** §7 now quotes all three passages (lines 27, 59, 69-71) with word-for-word replacements; the header, §9 item 1 and §10 item 1 owe all three to WP-0A-A0-001. |
| Q0 Q6, R0 R-8 d, A1-7: M's test rule is met by a comment-only or emptied test; a `__tests__` JSON fixture counts | **Fixed in code and text.** A test file is now a `.test`/`.spec` code file or a code file under `__tests__/` (a JSON fixture no longer counts, pinned). §4.1 says the rule only checks that a test file is touched, and the M Tester confirms in writing that the test exercises the change; §3's M row says the same. |
| Q0 Q7, R0 R-8 a: `isL && !test` → `isL` survives | **Fixed in test.** A module test file under `ui/` is asserted to be the module's test (M with a test). The mutant is killed (§3). |
| R0 R-8 b: RFC-2026-029 is not in the repository | **Fixed in text.** §1 says it is proposed and not yet in this repository. |
| R0 R-8 c: the `DECISION_RECORDS` acknowledgement is WP-0A-A0-001's, not A0-002's | **Fixed in text and manifest.** §10 item 6 and `open_blockers[204]` item (6) now name A0-001's Integration Owner for that line. **Owed** by that owner on the merged head. |
| A1-9 (Info): digests and floor; A0-002's acknowledgement owed | **Owed**, as recorded: WP-0A-A0-002 on the merged head. The integrity manifest was regenerated on this fix (§3); R0 acknowledged it only for `95f2d115`. |
| C0 F7, Q0 Q8, R0 R-7: CI pending at first read; no role run on the head | **Owed, state.** Every role re-checks on the new head, and CI must be green there. A0 runs the roles; the Owner merges. |
| R0 verdict item 4: the Owner's answers recorded on the branch before the merge | **Owed by the Owner, then A0.** `open_blockers[204]` item (1) now says A0 records the answers to Q-030-1..6 on this branch before the merge. |
| A1's and R0's requested manifest wording | **Done.** Both quotations are appended, verbatim, to `open_blockers[204]`, with C0's and Q0's verdicts. |
| C0's disclosure: its commit was made with `-c core.hooksPath=/dev/null` | **Recorded, no change.** The commit adds one Markdown file under this package's evidence. It was cherry-picked here, and the fix commit that follows it runs the full verifier through `commit-when-clean` over a tree that contains it (secret scan included). A0 did not re-make C0's commit: that would rewrite another role's record. |
| A1's disclosure: a throwaway probe commit in its clone while `npm run check` ran | **Recorded, no change.** A1 reports the digest and `git status` restored; the result on this branch does not depend on that clone. |

## 3. Measured (Node `v24.20.0` first on `PATH`, worktree on the branch name)

- **The review-tier test** (`node --test --test-name-pattern='review-tier classifier' test-kits/db/foundation-contract.test.mjs`):
  1/1 pass.
- **Mutations of the amended classifier**, each a single rule replaced by a pass, the review-tier test run alone, the file
  restored and `cmp`-checked afterwards. Killed, 20 of 20: the module allowlist; L's import allowlist; L's removed-line
  rule; the removed-guard rule; the hunk-only line reading; the one-package rule; the cross-module import rule; the status
  move past `in_review`; the record-rewrite rule; the identifier sub-words; the classifier-change rule; the stems; the
  joined adjacent words; the acronym split; the event-handler attribute signal; the `__tests__` code-file rule; `isL &&
  !test` → `isL` (Q0 Q7, R0 R-8 a); a public SVG put back on L; evidence widened back to any file; and the copy line
  saying "the base's" when it is not (killed after the CLI case gained a base that carries the classifier).
- **§4.4 re-measured with the amended classifier**, from this worktree, over the same 29 first-parent merges on
  `origin/main` since `2026-10-05T12:00+07:00`, each as `classify-review-tier.mjs <m>^1 <m>^2`: `H 24, records 5` (#198,
  #199, #201, #205, #206), 0 M, 0 L, no exit 2. Unchanged.
- **This PR** at the fix tree: `tier: H (18 path(s))`, with the classifier-change rule among its reasons, the status move
  `in_progress -> in_review` printed, and `classifier copy: NOT the base's` (the base, `main`, has no classifier yet).
- **`origin/main`** had not moved (`bd019c9c` is still the merge base), so no merge was needed.
- The integrity manifest was regenerated for the changed RFC and classifier; the fix commit went through
  `scripts/commit-when-clean.mjs` (the verifier's result is in the commit's own record of the run, and in the next
  handoff). The handoff was **not** refreshed in this run, as the task directed; it still cites `95f2d115`, so the handoff
  guard reports the branch as moved past its cited head until the refresh, last and alone.

## 4. What every role re-checks on the fix head

- **C0**: F1 (the RFC text of §4.2 item 10 and §4.3 against the code), F2-F6.
- **A1**: A1-4 and A1-1 (its blocking conditions), A1-5's text and Q-030-5, A1-2, A1-3, A1-6 in code, A1-7, A1-8.
- **Q0**: M1, M2, M5 (its mutations against the new rules), M6, M7, M8, M9, and the new test's probes.
- **R0**: R-1 (its blocking condition), R-2 to R-5, R-6's text and Q-030-5, and the amendments: the integrity manifest is
  regenerated on this head and needs R0's acknowledgement again.

## 5. The second review round, on `0eadb203`

All four roles re-read `0eadb203`. Their commits are not yet on this branch: C0 `5ed8a345`
(`changes_requested`, blocks: N1), A1 `d09b6bf8` (`security_approved_with_conditions`, blocks: A1-R1, A1-R2), Q0
`4264f814` (`test_verified` with condition QR1, QR3 to go with it; does not block), R0 `69646f59` (`integration_verified`
not given; blocks: R-9). None is stop-the-line. Each is cherry-picked with `-x` when the roles re-check the head that
follows.

One defect held the merge in all four: **C0 N1, A1-R1, Q0 QR1, R0 R-9** -- L's import allowlist and the cross-module rule
read imports one line at a time, so an import a formatter splits over lines escaped both (L instead of M or H; M instead
of H), while §4.5 called that part fail-closed. A0 took the code fix every role offered first:

| Finding | What changed |
|---|---|
| C0 N1, A1-R1, Q0 QR1, R0 R-9 | **Fixed in code, test and text.** `importSpecs` now joins the lines and reads every string after a `from` or `import` keyword (comments allowed between), so a multi-line import, one with a comment holding a quote between its braces, and `export { x } from` are read. The L import allowlist and the cross-module rule now read the added lines **and the whole file at the head** (`headOf`, which the CLI fills from the head blob), so a binding added inside an existing multi-line import is caught too. Pinned: six multi-line shapes (M in a module, H in `apps/web`), multi-line cross-module imports (H), the head-file cases, and one CLI case end to end (a multi-line import of `apps/web/lib/data.ts` from an `apps/web` component: H). RFC §4.2 items 8 and 10 (b), §4.5 and §9 say so. |
| A1-R2 | **Fixed in text.** §3.1 decides "not the PR's Author" by `agent_run_id`: the presser's differs from the package's `author_agent_run_id` and from the PR handoff's `agent_run_id`, so `/claude/a0_atlas` never presses an M or L PR of WP-0A-DB-00. |
| Q0 QR3 | **Fixed in test.** One case each for the five fail-open mutants: a specifier resolving to an L and a non-L file; `react-dom/server`, `react-query`, `react/../x`; a removed `if (process.env.X)` in module logic; a handoff of another package; `process['e' + 'nv']`. |
| C0 N3, A1-R3, Q0 QR2, QR5, R0 R-12 | **Disclosed, not changed.** Denylist misses; §4.5 now names them as the first allowlist-opening PR's to pin. |
| Q0 QR4, A1-R4, R0 R-13 | **Owed, not changed.** Appending to a role verdict or one other package's record, and a `VERIFICATION.md` rewrite, stay neutral; with every module path H and no L path in the repository they decide no PR today. For the PR that opens the allowlist. |
| C0 N2 | **Owed by A0, at the refresh.** The handoff's narrative fields are rewritten in the refresh, last and alone, after the roles' re-check. |
| C0 N4, R0 R-11, Q0 QR6 (part) | **Corrected here.** §3 above says `18 path(s)`; the head `0eadb203` had 19 (this note is the 19th). This fix adds no path: still 19. |
| A1-R5, Q0 QR6, R0 R-10 | **Recorded.** The handoff guard compares path sets against `HEAD^`, so it reads green before a refresh; "last and alone" is measured with `git show --stat` as well. |
| C0 F7, Q0 QR7, R0 R-7 | **State.** CI and every role re-check on the new head. |

Measured on the fix tree (Node `v24.20.0`, worktree on the branch name): the review-tier test passes 1/1; with the
`0eadb203` classifier and the new test, the test is red (the new cases bite). §4.4 re-measured with the amended
classifier over the same 29 first-parent merges (`<m>^1 <m>^2`, base `bd019c9c`): `H 24, records 5`, unchanged. The
integrity manifest was regenerated for the RFC and the classifier; `npm run check` is run by `commit-when-clean` on the
fix commit.
