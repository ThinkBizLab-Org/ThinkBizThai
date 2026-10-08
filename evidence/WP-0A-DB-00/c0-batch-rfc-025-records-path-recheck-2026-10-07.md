# C0 re-check of the RFC-2026-025 §6 governance PR (#211), after the first review round

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/211 (Draft, `GOVERNANCE:`), branch
`agent/claude/WP-0A-DB-00-batch-rfc-025-records-path`, head `d12475a70f6707d45c936098b1cab19562bfc6dd`,
`origin/main` `389f3845`. My first review was at `f7e9ce8d` (`changes_requested`). It now sits on the branch as
`evidence/WP-0A-DB-00/c0-batch-rfc-025-records-path-review-2026-10-07.md`. Since then:

- the merge `ad42e510` of `main` `389f3845` (#210);
- the four review files moved under DB-00 (`f2610d86`);
- A0's fix commit `d12475a7`.

The handoff is **intentionally not refreshed** on this head. I judged the guard by a throwaway local refresh (§2).

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script under RFC-2026-024 to act as the
independent Reviewer run `/claude/c0_contract_reviewer`. I share a vendor, a model family and a parent with the
Author. I wrote none of this PR's content, and I fix nothing in it. My only change is this file, in one commit on
the separate branch `c0/WP-0A-A0-001-recheck-2026-10-07`. I do not push it.

This file:

- approves nothing in §6, which only the Owner can do;
- authorises no merge, and this PR is the Owner's to merge personally (§5 item 6);
- moves no package status;
- leaves G0 at Specification Baseline Complete / External Verification Pending.

I used no database and no provider, and I wrote no secret literal to disk.

The task told me to file this under `evidence/WP-0A-A0-001/`. `verify-branch-scope` refuses that path on DB-00's
branch, so A0 will need to move this file the same way it moved the first four (`git mv`, 100%).

## 1. Verdict

**review_approved** at `d12475a7`, on two conditions:

- the next commit is the handoff refresh, last and alone;
- the required CI check is green on that refreshed head.

Details:

- **Stop-the-line: no.** The PR still changes no secret, tenant path, migration, job, side effect or contract.
- **Blocks the merge (from C0): no.** F1 and F2, my two blocking findings, are closed in text and code. F3–F7 are
  closed or done. One new Minor (N1) is owed, preferably in the commit that records the Owner's answers, which
  §6.7's order needs anyway. N1 does not block the merge by itself.
- **This verdict does not answer Q-025-6-1 to Q-025-6-5.** Those are the Owner's. Under §6.7 the roles re-read the
  commit that records the answers. I will re-read only that diff, plus N1 if it is touched.

## 2. Measured

I worked in a private clone at `scratchpad/c0-WP-0A-A0-001-recheck/repo`. Its `origin` was set to the GitHub remote
and fetched, with `origin/HEAD` set to `origin/main` (`389f3845`). It was checked out on the branch **name**, and
`HEAD` was `d12475a7`. Node was `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin` first on `PATH`).

| Command | Exit | Result |
|---|---:|---|
| `npm run check` at `d12475a7` (unrefreshed) | 1 | tests 717, pass 715, fail 2. The two failures are exactly "the handoff for this branch describes this branch" and the handoff ratchet. CI run `37662290346` on this head fails on the same two tests. |
| `npm run refresh:handoff` (throwaway) | 0 | cites `389f384..d12475a`, with 8 added and 8 modified |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run check` on the throwaway refresh commit | 0 | tests 717, pass 717, fail 0 |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-DB-00` | 0 | "all 16 changed path(s) are declared, and every amendment explains one" |
| `git merge-base --is-ancestor origin/main HEAD` | 0 | the head contains `main` `389f3845` (R-1) |
| `node scripts/db/classify-records-only.mjs origin/main HEAD` | 1 | correct: this PR is not records-only |
| The §6.5 measurement re-run with the narrowed classifier over `7fb0fc05`, first-parent merges since `2026-10-05T12:00+07:00`, run as `<m>^1 <m>^2` | — | 26 PRs. Exit 0 for exactly #198, #199, #201, #205 and #206, with no exit 2. Four status moves are printed, each `in_review -> integration_verified`, for #198, #199, #201 and #205. This matches §6.5 and the closure note. |
| `--sync <s>^1 <s> 7fb0fc05` for every merge of `main` inside those PRs | — | 48 of 50. Rejected: `f6652ee0` (#197) and `31879073` (#196). This matches. |

The throwaway refresh commit was reset afterwards, and the clone is clean.

I also ran mutants against the classifier test only (`--test-name-pattern='records-only classifier'`). Each
mutant replaces one rule, and the file is restored after each run.

| Mutant | Result |
|---|---|
| M1 (my F4): `if (!reach)` → `if (false)` in `checkSync` | killed |
| M2 (my F4): drop the `oldMode !== REGULAR` clause | killed |
| record-name rule dropped (only the depth check kept) | killed |
| depth rule dropped (only the name check kept) | killed |
| `-> done` admitted | killed |
| backward moves admitted (`if (false)`) | killed |
| backward test `to <= from` → `to < from` | survives. This is an **equivalent** mutant: an unchanged status is deep-equal and never reaches `statusMove`. |
| off-flow values (`blocked`, unknown) admitted | killed |
| `required_human_authorities` judged by the looser `appendOnlyStrings` | killed |
| the `required_human_authorities` removal check dropped | killed |
| status moves not collected | killed |
| status moves not printed by the CLI | killed |
| the `rationale`-is-a-string check dropped | killed |
| the `.md` suffix dropped from `RECORD_FILE_NAME` | killed |
| `product-owner-disposition` added to `RECORD_FILE_NAME` | killed |

I also probed the pure functions directly:

| Probe | Result |
|---|---|
| `product-owner-disposition-*.md`, role file `c0-recheck-*.md`, `sub/session-1.md`, `.gitattributes`, `session-x.mjs` | refused |
| `light-path-reading-*.md` | admitted |
| `records-transcription-owner-approval-*.md` | admitted (see N1) |
| Status to `done`, `in_progress` (backward) or `blocked` | refused |
| Status to `test_verified` (forward) | admitted, and the move is reported |
| `required_human_authorities` with a suffix ("-- waived") or a prefix ("Waived: ") | refused |
| `required_human_authorities` with a new entry appended | admitted |
| `open_blockers` with a front closing clause | admitted |
| `open_blockers` with an entry deleted | refused |

I compared the manifest diff `f2610d86..d12475a7` with a parser. Only `open_blockers[203]` changed, and the old text
is its verbatim prefix. In `ownership`, only `amends_without_owning.rationale` changed. The suite-contract change is
one floor (1320 → 1329) with its reason. The integrity manifest was regenerated.

## 3. My findings from the first review

| ID | Was | Now |
|---|---|---|
| F1 | Major | **Closed.** §6.2 item 1 says the Integration Owner is not waived. When C0 reads in R0's place, the Integration Owner's verdict is the R0 file the records transcribe. That file must be on `main` before the PR opens and must name the package, the change and any target status, or C0 cannot stand in. §6.2 item 3 now lists the fourth §5 item 6 condition, and Q-025-6-5 puts the substitution to the Owner. This is the reading I offered, and the text no longer gives two answers. |
| F2 | Major | **Closed.** The sentence crediting the validators is gone. §6.1 item 4 says that no validator judges a transition. The classifier refuses backward moves, `done`, `blocked` and off-flow values, and prints every move it admits. §6.2 item 1 makes the reader check each move against a role verdict on `main`, and treats an Author move beyond `in_review` as blocking. Q-025-6-4 asks the Owner. |
| F3 | Minor | **Closed for file names, with one gap (N1).** The comparison paragraph now quotes what §5 item 1 did and did not cover. It names four widenings, including closing a blocker. Dispositions and role files are refused by name, as I probed. |
| F4 | Minor | **Closed.** Both rules are pinned, and M1 and M2 are killed. The script is still not digested, and §6.6 item 2 still discloses that. |
| F5 | Minor | **Closed.** §6.3 now says mechanical means (a) exit 0 **and** (b) the generator `cmp`. It says the script checks (a) only, and §6.5 calls 48 the script's count and an upper bound. The CLI line now says "NOT checked here". |
| F6 | Info | **Closed.** The header line now attributes the reading to A0. |
| F7 | Info | **Done** for the first four files (`git mv`, content unchanged). It recurs for this file (§0). |
| F8 | Info | **Superseded.** CI on `d12475a7` fails on the two handoff tests, as expected. Green is owed on the refreshed head. |

## 4. New finding

| ID | Grade | Finding |
|---|---|---|
| N1 | Minor | The Owner's words from chat can still ride the light path, under the name `records-transcription-*.md`. |

The fix for F3 refuses `product-owner-disposition-*` **by file name**. Two parts of the RFC text still admit the
**content** of a disposition:

- §6.1 item 2 describes `records-transcription-*.md` as "words already written elsewhere". It does not require the
  "elsewhere" to be in the repository.
- §6.2 item 1's privacy bullet says that a record quoting anything from outside the repository "other than a
  role's or the Owner's words leaves the light path". So the Owner's words quoted from outside the repository
  explicitly stay on the light path.

A file `evidence/<pkg>/records-transcription-owner-approval-<date>.md` is admitted (exit 0). It could carry Owner
words from chat that close a blocker, satisfy a human authority, or back a status move. The one reader checks "a
transcription … against the role file it cites". The reader cannot see chat. This is the second half of my F3, and
it is not addressed: say how a reader verifies Owner words, or keep them off.

The closure note's line "A disposition … takes the full path, as §5 item 1 had it" holds for the file, not for
the Owner's words.

**Needed:** one sentence in §6.2 item 1. A transcription's source must be a file already on `main` (a role file,
or an Owner disposition merged through the full path). Owner words that exist only outside the repository leave
the light path. Alternatively, A0 can put that choice to the Owner beside Q-025-6-3 to Q-025-6-5. The commit that
records the Owner's answers is the natural place. Either way, the "Kept as §5 had it" bullet should then hold for
the words as well as the file name.

## 5. Also read, no finding

- The RFC diff `f7e9ce8d..d12475a7`:
  - §1–§5 are byte-unchanged.
  - §6 stays Proposed throughout.
  - Q-025-6-2's note on branch-slot syncs is accurate. #210 and this PR are the case, and my sync run agrees.
  - §6.7's "Order before the merge" puts the Owner's answers on the branch before the merge, which answers R-5.
- The closure note (`evidence/WP-0A-DB-00/a0-batch-rfc-025-records-path-closure-2026-10-08.md`):
  - its figures match mine;
  - its disclosure of the plain `git commit` for `d12475a7` (715/717, the two handoff tests) is accurate;
  - the throwaway refresh shows the two guards turn green with nothing else changed.
- The light-path reader file (`light-path-reading-*.md`) is admitted by name. Who wrote it is the reader's identity
  disclosure under RFC-2026-024, not something the classifier can see. §6.2 item 4 keeps the Author's
  self-approval bar, so I raise no finding here.

## 6. What follows

1. A0 refreshes the handoff, last and alone. CI must be green on that head.
2. The other roles re-check: A1, Q0 and R0. R0 also re-checks R-7 on the moved files.
3. The Owner answers Q-025-6-1 to Q-025-6-5. A0 records the answers (and N1) on the branch. I re-read that diff.
4. The Owner merges personally.

Any commit after the refresh needs the handoff refreshed again, last and alone.
