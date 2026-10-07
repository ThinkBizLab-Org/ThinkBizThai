# Q0 re-check of the RFC-2026-025 §6 governance PR (#211), after the first review round

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/211 (Draft, `GOVERNANCE:`), branch
`agent/claude/WP-0A-DB-00-batch-rfc-025-records-path`, head `d12475a70f6707d45c936098b1cab19562bfc6dd`,
base `origin/main` `389f3845` (#210). Measured on 2026-10-08; the file name keeps the date the task gave.
Commits since my first review (head `f7e9ce8d`): the four role reviews cherry-picked with `-x`
(`2f27e5c9`, `9f3a2da7`, `01e065d5`, `56388d70`), the merge of `main` `ad42e510`, the evidence move
`f2610d86`, and the fix `d12475a7`. The handoff is **not yet refreshed**, as A0's task directs. The guard is
judged here on a throwaway local refresh that was never committed to the branch or pushed (§2).

The task names this file WP-0A-A0-001's and files it under `evidence/WP-0A-A0-001/`. As in the first round, the
PR is WP-0A-DB-00's, and `verify-branch-scope` refuses `evidence/WP-0A-A0-001/**` on DB-00's branch. If this
file is carried onto #211, it needs the same `-x` cherry-pick and byte-identical `git mv` the first four got.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent Tester run
`/claude/q0_sentinel`. RFC-2026-024 requires this disclosure. I share a vendor and a parent with the Author. I wrote
none of the PR's content and I fix nothing. This is the **re-check** after A0's corrections to my first review
(`evidence/WP-0A-DB-00/q0-batch-rfc-025-records-path-review-2026-10-07.md`, originally `11b623ef`). This file is
not a merge authorisation and moves no package status. It does not approve §6: only the Owner can
(RFC-2026-025 §5 item 6).

I measured in a private clone under the scratchpad, checked out on the branch **name**
(`git branch --show-current` printed it), with `origin/HEAD` = `origin/main`, and Node `v24.20.0` / npm `11.19.0`
first on `PATH`. No database was used. All probe data is synthetic and lived in a throwaway git repository
under the scratchpad. Each throwaway commit in the private clone was reset to `d12475a7` afterwards, and
`git status` was clean. Nothing was pushed.

## 1. Measured and read

**Measured** means I ran it in this session and quote the result. **Read** means I compared the text with its source.

| # | Claim under test | How | Result |
|---|---|---|---|
| M1a | At the unrefreshed head, the suite fails on the two handoff guards and on nothing else (closure note §3). | `npm run check` on the branch name at `d12475a7`. | exit 1; `tests 717, pass 715, fail 2`. The two: "the handoff for this branch describes this branch" and "the handoff ratchet fails when an author handoff claims another role approved something". **Exactly as A0 disclosed.** CI run 37662290346 on this head fails on the same two tests (read with `gh run view --log-failed`). |
| M1b | A refresh, last and alone, turns the suite green. | `npm run refresh:handoff` (it reported "now cites 389f384..d12475a"), a local throwaway commit of only that file, then `npm run check` and `npm run check:handoff`. | `check` exit 0, `tests 717, pass 717, fail 0`; `check:handoff`: "describes the branch: nothing substantive after its cited head". The refreshed handoff's blob is `ea7d5bfc8107299d7f17af6ad20c1acc4aa0bb44`. It changes `base_revision` to `389f3845`, `head_revision_or_patch_checksum` to `d12475a7`, and the file lists. |
| M2 | The classifier still calls this PR not records-only. | `node scripts/db/classify-records-only.mjs origin/main HEAD`. | exit 1. Fifteen reasons over 16 paths: the RFC, the script, three test-side files, the two generated files, `ownership.branch`, and seven evidence files, now refused by the name rule. Those seven are the plan, the closure, the Owner disposition and the four role reviews. Correct. |
| M3 | It still fails closed. | A bad ref, and `--sync` with one argument. | exit 2 each ("not classified (fail closed)", and the usage line). |
| M4 | §6.5 re-measured with the narrowed classifier: 26 PRs and 5 records-only; 50 syncs and 48 mechanical; four printed moves `in_review -> integration_verified`. | My own loop over `7fb0fc05`, first-parent merges since `2026-10-05T12:00+07:00`: `classify <m>^1 <m>^2`, and `--sync <s>^1 <s> 7fb0fc05` for every merge on each PR's first-parent line. | `PRs=26 recordsonly=#206 #205 #201 #199 #198 syncs=50 mechanical=48 notmech=f6652ee0#197 31879073#196 exit2=0`. The moves printed are for #205 (CON-004), #201 (CON-003), #199 (A0-002) and #198 (CON-005). **Reproduced exactly.** |
| M4b | Q-025-6-3: #201 and #206 depend on the front form of the closing clause. | `now.endsWith(was)` removed from the classifier, then the five PRs re-classified, then the file restored. | #201 exit 1 and #206 exit 1; #198, #199 and #205 exit 0. **As stated.** |
| M5 | The refusals hold, including the new ones. | 39 CLI probes on a throwaway repo, one commit each (`probe.sh`). | **exit 1 (refused):** a rewritten record; an append to a role file (`r0-review.md`); a new `product-owner-disposition-*.md`; `run.mjs`, `m.sql`, `.github/workflows/ci.yml` and `.gitattributes` under `evidence/WP-X/`; `sub/session-x.md`; `session-x.json`; `Session-x.md`; `session-x.MD`; an executable `session-x.md`; a symlinked `session-x.md`; `evidence/session-top.md`; status to `done`, backward, `blocked`, `zzz`, or removed; text added at either end of `required_human_authorities[0]`; `amends_without_owning.paths` widened; a new manifest; `handoffs/sub/h.json`; an empty diff; a script edit. **exit 0 (admitted):** a new `records-transcription-*`, `session-*` or `light-path-reading-*` `.md`; an append to `session-a.md`; status `in_review -> test_verified`, printed as a move; a `required_human_authorities` entry appended; a blocker closed in front or after; an `acknowledg*` key given any value, or added; `paths` narrowed to `[]`; a handoff edit. Each of these is what §6.1 now says. |
| M6 | My Q1 is resolved: a script, SQL or CI-shaped file under `evidence/` is no longer a record. | M5, and the test pins them (`foundation-contract.test.mjs`, the `not a record file` loop). | Refused, each with "not a record file". **Q1 closed.** |
| M7 | The package check the classifier leaves out is enforced elsewhere, as §6.1 now says. | On the branch, a throwaway commit adding `evidence/WP-0A-CON-004/session-q0-probe.md` (synthetic), then `node scripts/verify-branch-scope.mjs origin/main WP-0A-DB-00`, then a reset. | The classifier admits the file, as it should under the rule (M5, "other package"). `verify-branch-scope` exits **73**, naming the path. CI runs that guard (`.github/workflows/ci.yml:132`). |
| M8 | The `--sync` rules, including "merged commit on main". | CLI on this PR's own merge: `--sync 56388d70 ad42e510 origin/main`. The test's CLI part covers the side-branch case. | exit 1: "main changed the PR's own path(s): test-kits/branch-identity.test.mjs". That is the branch-slot case Q-025-6-2 discloses. See Q7. |
| M9 | The test bites. | My own mutation set (`mutate.mjs`, 42 mutants): each replaces one rule with a pass, runs only the classifier test, and restores the file. `cmp` against `HEAD` afterwards was identical. | **41 killed, 1 survived.** Killed: every path, mode, name, depth, append, generated, handoff, new-manifest and empty-diff rule; every status rule (not a string, off-flow, `done`, backward, move recorded, CLI prints moves); `required_human_authorities` removal and strict entries; every `open_blockers` rule; every `amended_by` and `amends_without_owning` rule, including **`rationale` is a string**; other `ownership` and manifest keys; base parse; every sync rule, including **merged commit on `main`**; and the CLI naming generated files. Survived: the base-shape guard of `required_human_authorities` (`classify-records-only.mjs:64`). See Q6. **Q2 closed.** |
| M10 | Scope, identity. | `node scripts/verify-branch-scope.mjs origin/main WP-0A-DB-00`; `node scripts/verify-branch-identity.mjs <branch>`. | exit 0 each: "all 16 changed path(s) are declared, and every amendment explains one"; `WP-0A-DB-00`. |
| M11 | The four moved reviews are byte for byte the role's files. | Blob of each cherry-pick at its old path compared with the blob at its new path at `d12475a7`, and with the original commit in the main checkout. | All four are identical, and each cherry-pick carries `cherry picked from commit` with the original id: C0 `620a7138`, A1 `5c511875`, Q0 `579406dc` and R0 `00ce01c5`. `f2610d86` is four 100% renames. |
| R1 | §1–§5 are still untouched. | `git diff origin/main...HEAD` on the RFC, removed lines. | None removed. There are additions only: the header line, and §6. |
| R2 | My Q3 (status unbounded) is handled. | Read §6.1 item 4, §6.2 item 1 and Q-025-6-4 against the code (M5). | The text and the code agree. Forward moves only, short of `done`, with `blocked` and unknown values refused and every move printed. The reader checks each move against a role verdict on `main`. The claim that validators judge the move was removed. The move is put to the Owner as Q-025-6-4. **Closed for this role.** |
| R3 | My Q4 (the sync check does not verify generated files) is handled. | Read §6.3 and the CLI message. | §6.3 splits mechanical into (a) the script's exit 0 and (b) a regenerate-and-`cmp` round trip. It says the script checks (a) only. §6.5 calls 48 an upper bound. The CLI says "NOT checked here". **Closed.** |
| R4 | Floors and the manifest. | Read the diffs. M1b runs the guards. | The assertion floor goes from 1320 to 1329, with a comment. The test count stays at 87, and the name digest changed. `WP-0A-DB-00.json` changes `ownership` (the branch slot and the restated rationale) and appends `open_blockers[203]`, with old entries unchanged. Green under M1b. |

## 2. Repository commands (private clone, branch `agent/claude/WP-0A-DB-00-batch-rfc-025-records-path`)

| Command | Exit | Result |
|---|---|---|
| `git branch --show-current` | 0 | the branch name (not detached) |
| `npm ci` | 0 | lockfile install |
| `npm run check` at `d12475a7` | 1 | `tests 717, pass 715, fail 2` (the two handoff guards only) |
| `npm run refresh:handoff`, a local throwaway commit, then `npm run check` | 0 | `tests 717, pass 717, fail 0` |
| `npm run check:handoff` after the throwaway refresh | 0 | nothing substantive after its cited head |
| `node scripts/db/classify-records-only.mjs origin/main HEAD` | 1 | not records-only (M2) |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-DB-00` | 0 | all 16 paths declared |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-DB-00-batch-rfc-025-records-path` | 0 | `WP-0A-DB-00` |
| `node --test --test-name-pattern="records-only classifier" test-kits/db/foundation-contract.test.mjs` | 0 | `tests 1, pass 1` (the baseline for M9) |
| `gh pr view 211` | 0 | OPEN, Draft, head `d12475a7`, MERGEABLE. Required check `bootstrap` **FAILURE** (run 37662290346), on the two handoff guards only. |

## 3. Findings

My first-round findings: **Q1 closed** (M5, M6). **Q2 closed** (M9: both rules now kill their mutant).
**Q3 closed** for this role; the status move is the Owner's question Q-025-6-4 (R2). **Q4 closed** (R3).
**Q5** is carried as Q8 below.

### Q6 — Info: one surviving mutant, harmless

Removing the guard "the base value of `required_human_authorities` is not a list of strings" (`:64`) leaves the
test green. I read the code without the guard and did not measure it. A string or number base makes `flatMap`
throw, which the CLI turns into exit 2. A non-string element in the base is reported as `changed`, because the
new value must be a list of strings. Either way the classifier still fails closed, and the schema requires a list of strings. No
change requested.

### Q7 — Info: this PR's own merge of `main` is not a mechanical sync by the script

`--sync 56388d70 ad42e510 origin/main` exits 1, because #210 changed `test-kits/branch-identity.test.mjs`, a path
this PR also changes (its branch slot). This is the case Q-025-6-2 already discloses. §6 is not approved, so
the merge takes the existing rule anyway: the roles re-check the head, and R0 reads the merge (closure note §4).
A0's account of the merge, an auto-merge with both slots, the manifest rebuilt, and a second rebuild `cmp`-identical,
is consistent with M1b. I did not repeat the `cmp`.

### Q8 — Condition on the next commit: the refresh must be the handoff alone, and CI must be green

Required CI on `d12475a7` is red, on exactly the two handoff guards (M1a). A local refresh turns the suite green
(M1b). The refresh is deterministic from history, so A0's refresh commit on `d12475a7` should touch only
`handoffs/WP-0A-DB-00-author-handoff.json`. Its blob should equal `ea7d5bfc8107299d7f17af6ad20c1acc4aa0bb44`.
If it does, this verdict carries to that head without a re-run. If the commit touches anything else, or the
blob differs, this role re-measures M1, M2 and M9. In either case `bootstrap` must be green on the final head.

## 4. Verdict

VERDICT: **`test_verified`**, Tester role, PR #211 (WP-0A-DB-00), head `d12475a7`, with **condition Q8**: the
handoff refresh is last and alone, and CI `bootstrap` is green on the final head.

- **What passes.** Every correction to my first review is in the code, the test and the text, and measures as
  claimed: Q1 (M5, M6), Q2 (M9), Q3 (R2) and Q4 (R3). The narrowed classifier keeps the §6.5 history exactly
  (M4), and the Q-025-6-3 dependency claim holds (M4b). 41 of my 42 independent mutants are killed, and the
  survivor fails closed anyway (Q6). The package check §6.1 delegates to `verify-branch-scope` bites (M7).
  The four moved reviews are byte-identical to their originals, with provenance (M11). §1–§5 are untouched (R1).
  The suite is 717/717 once the handoff is refreshed (M1b). The plain `git commit` of `d12475a7` is explained
  exactly as disclosed: 715/717, with the two failures being the handoff guards (M1a).
- **Stop-the-line: none.** No secret, card number, tenant data, migration, policy, grant or external side effect
  is touched. The PR changes governance text and a read-only classifier with its test.
- **Blocks the merge: no**, as far as this role goes. The merge still waits on the refresh and a green
  `bootstrap` run (Q8), the C0, A1 and R0 re-checks, the Owner's answers to Q-025-6-1..5 recorded on the branch
  (RFC §6.7, "Order before the merge"), and the Owner merging personally (§5 item 6).
