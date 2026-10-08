# C0 review of the RFC-2026-025 §6 governance PR (#211), 2026-10-07

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/211 (Draft, title starts `GOVERNANCE:`), branch
`agent/claude/WP-0A-DB-00-batch-rfc-025-records-path`, head `f7e9ce8dc51d246d693a4ea3f2da923436261f5b`, base
`origin/main` `7fb0fc05`. Two commits: `794946d8` (the content) and `f7e9ce8d` (the handoff refresh, last and alone).
Eleven files. The task named this run as the Reviewer for WP-0A-A0-001; the increment itself belongs to
WP-0A-DB-00, which owns RFC-2026-025 and `scripts/db/` (see F7). This is the increment's **first** review.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent Reviewer run
`/claude/c0_contract_reviewer`. RFC-2026-024 §3/3 requires this disclosure. I share a vendor and a parent with the
Author. I did not write any of the PR's content. I review it and I approve nothing: this file is not a merge
authorisation, it moves no package status, and it does not approve §6, which only the Owner can do. I do not fix.

## 1. Verdict

**changes_requested.**

- **Stop-the-line: no.** No secret, tenant path, migration, job, side effect or contract changes. The PR proposes
  text and adds a script nothing runs in CI. §6 states that it applies only after Owner approval.
- **Blocks the Owner's merge: yes, until F1 and F2 are fixed in the RFC text and re-read by me.** Both concern
  what the Owner would be approving, not the code: one waives a §5 condition without saying so (F1), and one
  describes a safety net that does not exist (F2). F3 is a disclosure gap the Owner should see before deciding.
  F4 and F5 are Minor and may be closed or recorded as owed.
- The classifier is sound for what it claims. I reproduced every measured figure (§3) and found no case where it
  answers "records-only" for a diff that §6.1's own text excludes.
- This PR is governance (§5 item 6). The Owner merges it personally. It is not on the light path it proposes
  (the classifier exits 1 on it), so it needs the full role set (C0, A1, Q0, R0). None of the other three has run.

## 2. Findings

| ID | Grade | Finding |
|---|---|---|
| F1 | **Major (blocks merge)** | §6.2 lets C0 stand in for R0 and omits §5 item 6's Integration Owner condition. The text does not say whether R0's verdict is still required. |
| F2 | **Major (blocks merge)** | §6.1 item 4 says "the schema and the role-separation validators still judge" a status change. They do not judge the transition. The classifier admits any jump, including to `done`, and 4 of the 5 measured PRs are status moves to `integration_verified`. |
| F3 | Minor | The "wider than §5" disclosure misstates §5 and omits two explicit §5 exclusions that §6 reverses: Owner dispositions and role-review files, and rewording an open blocker. |
| F4 | Minor | Two classifier rules have no test. Removing either leaves the suite green: the "merged commit is on `main`" check and the non-regular old-mode check. The script is not digested either. |
| F5 | Minor | §6.3 defines a mechanical sync as "exit 0" and then adds regenerate-and-`cmp` as a further condition. The script does not check generated files, and the 48/50 figure measures the script alone. |
| F6 | Info | The new header line says "The Owner asked for it in the words `ข้อ 4 mw`". That states A0's reading as fact. |
| F7 | Info | This file sits in `evidence/WP-0A-A0-001/` because the task told me to put it there. The package under review is WP-0A-DB-00. It is committed on its own branch, not on #211. |
| F8 | Info | CI on `f7e9ce8d` was `pending` when I read it. The local suite is green (§3). |

### F1: the C0 substitute and the Integration Owner (Major)

§6.2 item 1 makes the one reader R0, "or C0 … when R0 is the subject of the records". §6.2 item 3 then re-imposes
§5 item 6's conditions, naming three of them: head contains `main`, no security finding, and delegation timing. It
leaves out the fourth: "The Integration Owner's verdict is required where the package's gates require it". §5
item 3 says the same thing: "The Integration Owner (`/claude/r0_steward`) remains required for any merge the package
gates require it for". §6.4 then says §1–§5 are unchanged.

So when C0 reads in R0's place, the text gives two answers:

- If §5 item 6 still holds, R0's verdict is still required, and the substitution saves nothing.
- If §6.2 overrides it, §6 waives an Integration Owner condition the Owner approved on 2026-09-28. §6 never says
  that it does.

This is the common case, not an edge case. Four of the five measured records-only PRs (#198, #199, #201, #205)
transcribe R0's own verdict, so R0 is their subject.

**Needed:** §6.2 says which answer holds. If R0's verdict is waived, §6.4 lists that as a change to §5 item 6, and a
Q-025-6-n puts it to the Owner. A possible reading is that R0's pre-written verdict, already on `main`, is the
Integration Owner's verdict and C0 only checks the transcription. If that is the intent, §6.2 says so and requires
the cited R0 file to be on `main` before the PR opens.

### F2: status transitions have no mechanical judge (Major)

§6.1 item 4: "`status`, which must still be a string. The schema and the role-separation validators still judge the
value." `scripts/validate-work-package-role-separation.mjs` (`validateManifest`, lines 35–59) checks two things: that
the status is a known one, and that a ready-or-later package has distinct role IDs. It does not check the
transition. It does not stop a backward move, a skipped step, or a move the Author makes beyond `in_review`.
`CONTRIBUTING_AGENTS.md` forbids that last one ("The Author may move work only through `in_review`").

On the classifier side, `manifestDelta` admits any string, and the PR's own test pins this. Both the pure case and
the CLI case accept `status: 'integration_verified'` as records-only (`foundation-contract.test.mjs`, the new test's
first assertion and its CLI fixture).

This matters because status moves are what the light path carries. I measured the five records-only PRs:

| PR | Package | Status move |
|---|---|---|
| #198 | CON-005 | `in_review` → `integration_verified` |
| #199 | A0-002 | `in_review` → `integration_verified` |
| #201 | CON-003 | `in_review` → `integration_verified` |
| #205 | CON-004 | `in_review` → `integration_verified` |
| #206 | A0-005 | stays `in_review` |

Under §6, the only safeguard on these gate-state claims is the one reader. The text credits a validator with a
check it does not perform.

**Needed:** delete the sentence or make it true. Separately, §6.2 item 1 says the reader verifies each status
change against the role verdict file that authorises the target status. That file must be on `main` and name the
package and the status. A status move with no such verdict is a blocking finding, and so is a move by the Author
beyond `in_review`. Optionally, the classifier could refuse `done` and backward moves on the light path. A0 should
offer that to the Owner as a choice.

### F3: the comparison with §5 is inaccurate (Minor)

§6.1's closing paragraph says §6 is wider than §5 in two places. In the second it says "where §5 admitted only
open-blocker text". §5 item 1 did not admit open-blocker text. It names "removing or rewording an open blocker" and
"any other manifest field" among the things it does **not** cover. Its only manifest line is `ownership.branch`.

§5 item 1 also explicitly excludes "Owner dispositions or role-review files". That exclusion came from C0's F1 on
batch 123. §6.1 item 2 admits any new file under `evidence/<package>/`. I probed it. A new
`evidence/WP-X/product-owner-disposition-….md` with the body "Approved: everything" classifies as records-only (exit
0). The §6.2 reader checks a transcription against "the role file it cites". An Owner disposition's source is chat,
and the reader cannot see chat.

**Needed:** the paragraph names both reversals of §5 item 1's exclusions as reversals:

- dispositions and role files are admitted;
- a blocker may be closed by a prepended clause. Q-025-6-3 covers the mechanism but not the reversal.

It should also say how a reader verifies an Owner disposition, or exclude `product-owner-disposition-*` from the
light path. A0 should put that choice to the Owner as a further question.

### F4: two rules are untested (Minor)

I ran mutants against the new test only (`node --test --test-name-pattern='records-only classifier'`):

| Mutant | Result |
|---|---|
| M1: delete the `if (!reach)` line in `checkSync` (the merged commit must be on `main`) | **survives** |
| M2: delete `\|\| (status === 'M' && oldMode !== REGULAR)` in `classifyChange` | **survives** |
| M3: delete the `samePrPaths` reason | killed |
| M4: delete the `sameMainPaths` reason | killed |
| M5: delete `\|\| now.endsWith(was)` | killed |
| M6: delete the `acknowledg*` removal reason | killed |

Both rules behave correctly when the script is intact. I checked that in a throwaway repository. A merge of a side
branch not on `main` gets exit 1, "is not on main". A `100755` → `100644` evidence edit gets exit 1. But neither rule
is pinned by a test. Because the script is not in the integrity manifest (§6.6 item 2, disclosed), either rule could
be removed without the suite noticing. M1 is the one that matters: without it, `--sync` would call a merge of another
PR's branch "mechanical".

**Needed:** two assertions, one per rule. The test already builds a CLI repository, so a side-branch merge is a few
lines.

### F5: the mechanical-sync definition is split (Minor)

§6.3 opens by saying a merge "is **mechanical** when … exits **0**". Item 1 then adds that generated files must be
regenerated and compared, and "a difference makes the sync not mechanical". `syncDelta` excludes both generated paths
from every check and still exits 0. The CLI only prints a reminder. The two sentences disagree about what defines a
mechanical sync.

§6.5's "48 mechanical" counts exit codes. Nobody ran a regenerate-and-`cmp` on those 48 merges, so 48 is an upper
bound for the full §6.3 rule. The risk is small: a hand-made digest that does not match the file is caught by the
integrity test in CI, because the file contents themselves are checked by `samePrPaths`/`sameMainPaths`. But the
definition should be one sentence: exit 0 **and** the generator round-trip clean. §6.5 should say the 48 is the
script's count.

### F6: the header line (Info)

"The Owner asked for it in the words `ข้อ 4 mw`" turns A0's reading into a fact. The disposition (§1) and §6's
Origin paragraph are careful: "A0 reads this as … That reading is A0's." The header line should match them, for
example "The Owner replied `ข้อ 4 mw` to A0's recommendation (4); A0 reads it as a go-ahead." The status line of
this RFC already drew one C0 finding (batch 123) for a sentence added outside the approved text.

## 3. What I measured

All runs were in a private clone with the branch checked out **by name**, at
`scratchpad/c0-WP-0A-A0-001-review/`, on Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin` first on PATH).
`origin/HEAD` was set to `origin/main`. No database was used.

| Command | Result |
|---|---|
| `npm run check` | exit 0; tests 717, pass 717, fail 0, skipped 0 |
| `node scripts/db/classify-records-only.mjs origin/main HEAD` | exit 1, 11 paths, 8 reasons (RFC file, two generated files, three scripts or tests, the branch slot). This is correct: this PR is not records-only. |
| Classifier over each first-parent merge on `origin/main` since `2026-10-05T12:00+07:00` (`<p1> <p2>`) | 26 merges; exit 0 for exactly #198, #199, #201, #205, #206. No exit 2. This matches §6.5. |
| `--sync <s^1> <s> origin/main` for every merge commit in each of those 26 PRs' branches | 50 syncs, 48 exit 0. Exit 1 for `f6652ee0` (#197, `scripts/test-suite-contract.mjs`) and `31879073` (#196, `test-kits/contracts/catalog-registry.test.mjs`). This matches §6.5. |
| Status moves in the five records-only PRs | See F2. |
| Mutants M1–M6 on the new test | See F4. The script was restored afterwards and `git status` was clean. |
| Probes in a throwaway repository (side-branch merge; mode `100755` → `100644`; new Owner-disposition file) | exit 1; exit 1; exit 0 (see F3). |
| `gh pr view 211` / `gh pr checks 211` | Open, Draft, head `f7e9ce8d`; check `bootstrap` **pending** |

Also read:

- `CONTRIBUTING_AGENTS.md`, RFC-2026-025 §1–§6 and the disposition.
- The manifest diff, compared with a parser: `ownership.branch`, `amends_without_owning.rationale`, and one
  `open_blockers` entry appended. The 203 old entries are byte-identical.
- The test-suite-contract diff: floor 86 → 87, assertion floor 1121 → 1320, name digest.
- The branch-identity slot lines and the integrity-manifest digests.

The increment also changes `scripts/test-suite-contract.mjs` and `test-kits/branch-identity.test.mjs`, both outside
`scripts/db/`. `verify-branch-scope` passed for the Author because both paths are in DB-00's
`amends_without_owning`. I did not re-run that check.

## 4. Correct as written

- The Owner's words are recorded verbatim (`ข้อ 4 mw`), marked as A0's transcription, with A0's reading kept
  separate. The disposition does not claim the words approve §6.
- §6 is marked Proposed throughout. §1–§5 are byte-unchanged; the diff to the RFC is additions only.
- The classifier fails closed. Usage errors, unknown refs and unreadable blobs exit 2. Renames, deletions, type
  changes, symlinks and executables are refused. Evidence files are append-only, so a role verdict cannot be
  rewritten on the light path. `amends_without_owning` can only narrow.
- §6.4 keeps four-role review for every code, contract, test, schema, CI and gate change, along with stop-the-line,
  the security-finding block, and Owner-personal merge for governance PRs.
- The "several times faster" figure is labelled as an estimate everywhere, and no token or time figure is claimed.

## 5. Re-check

When F1 and F2 (and preferably F3–F5) are answered on a new head, I re-read only the changed RFC text and test. If
the classifier changes, I re-run the §3 measurement. Any commit after this review needs the handoff refreshed last
and alone again.
