# A1 round audit, 2026-10-18 (RFC-2026-034 §2.3): `main` `01b49187`..`27ff9970`, PRs #282–#294

| | |
|---|---|
| Role | A1, independent Security/Privacy reviewer, `/claude/a1_bastion` |
| Range | `01b49187` (merge of #281) exclusive to `27ff9970` (merge of #294) inclusive; first-parent merges #284, #282, #283, #285, #286, #287, #289, #288, #290, #291, #292, #293, #294 (13), fixed even if `main` moves |
| Reading | 2026-10-18T11:44:39Z to 11:56:45Z UTC (`date -u` at start and before writing), plus the writing of this file |
| Worktree | one, in my scratchpad, created **detached** at `27ff9970`; no `node_modules`, no `npm ci`; suite lock not touched (no full suite: Q0's); throwaway probe repositories in the scratchpad only; this file committed alone, branch `a1/audit-2026-10-18` set on that commit, worktree removed |
| Findings | **None of grade Low or above.** A1-AUD1018-1 to A1-AUD1018-4 (Info) |
| Stop-the-line | **No** |
| Blocks a risk-lane or fast-lane move? | **No.** No A1 finding of any grade is open against the risk-lane work in range (#282, #286, #290, #291); no fast-lane PR exists (`M_ELIGIBLE_MODULES` is still `[]`) |

## 0. Who I am

`/claude/a1_bastion`, A1, a subagent spawned by the Author's run (`/claude/a0_atlas`), same vendor and model
(Anthropic, `claude-opus-5-5`) as A0, C0, Q0 and R0: a same-lineage review, disclosed as the Owner's disposition of
2026-10-09 (Q4) requires. I hold no Author, Reviewer, Tester, Integration Owner, Product Owner, merge or gate
authority. I fixed nothing, pushed nothing, merged nothing and wrote no other role's verdict; every `gh` call was a
read. A1 runs wrote the per-PR A1 files in range; this audit re-measures rather than relies on them, and says where it
relies on them. Two of the Info findings are against A1's own earlier readings.

## 1. Per pull request: lane, press, readers

Measured: the base's two classifiers (`git show <merge>^1:scripts/db/classify-{review-tier,records-only}.mjs` into a
scratch directory under their own names), run as CI runs them, `node <copy> <merge>^1 <merge>^2 --lane
--head-ref=<branch> --repo=ThinkBizLab-Org/ThinkBizThai --head-repo=ThinkBizLab-Org/ThinkBizThai`, all exit 0; the
log of each PR's `pull_request` run on its final head (`gh run view <id> --log`, the step's own output lines); `git
merge-base --is-ancestor <merge>^1 <merge>^2` (13 of 13: the head contained `main`); the presser from the session
transcript `325454ab…jsonl` (every press is an A0 `Bash` call, not a sidechain, `gh pr merge <n> --merge
--match-head-commit <sha>`, the `<sha>` either literal or `H=$(gh pr view <n> --json headRefOid)` read in the same
command after `git merge-base --is-ancestor origin/main $H` and `gh pr checks`; each merged head equals the PR's final
head). My classifier output equals CI's printed `tier`/`lane` line and path count for all 13. The classifiers are
unchanged in range (`git diff 01b49187 27ff9970 -- scripts/db/` is empty).

| PR | Lane CI printed (final-head run, both jobs ✓) | Right? | Pressed (UTC), authority | A1's last reading → final head |
|---|---|---|---|---|
| #284 | audit (39029736692) | yes: four `evidence/audits/2026-10-17/` files on WP-0A-A0-001's `ownership.branch` | 10-17 12:04:53, Q-034-5 (a) | audit lane: no per-PR A1; the four files blob-equal to the auditors' commits (§2, A1-AUD1018-4) |
| #282 | H, risk (39031574099) | yes (records with the PR's own role files) | 12:25:25, Q-034-1 | `ff4c4178`; role files (one each), handoffs, merge `c15ef7fa` of #284 (disjoint, `--remerge-diff` empty): carried |
| #283 | H, governance (39033682171) | yes (`architecture/decisions/**`) | 13:06:06, Owner 11:53:17Z Q1 (transcript l.6137, about #283 by number) | r2 `cd7f26ad`; role files, merge `1e32d86b` of #282 (disjoint, empty), handoff: carried |
| #285 | H, governance (39038006512) | yes (RFC-2026-029) | 14:00:03, 11:53:17Z Q2 (`--omit=dev` wording) | `700362d0`; role files, merge `3267c096` of #283 overlapping at `test-kits/integrity-manifest.json` only: regeneration at `3267c096` leaves no diff and the three named paths are blob-equal to `700362d0`'s, as A1's clause (b′) requires: carried |
| #286 | H, risk (39042309658) | yes (manifest `acceptance_criteria`/`deterministic_commands`) | 15:11:39, Q-034-1 (and Q2) | r2 `0da70aae`; C0/A1 r2 files, handoff: carried |
| #287 | H, governance (39050751518) | yes (guard test `app-stack.test.mjs`) | 17:06:34, 11:53:17Z Q2 (A1-279-3, Q0-279r2-2) | r3 `2c50e9a8`; role files, handoff: carried |
| #289 | H, governance (39055610615) | yes (integrity manifest) | 18:05:29, Owner 16:31:14Z (l.7524) | `f62a7220`; role files, handoff: carried |
| #288 | H, governance (39057702206) | yes (`audit-coverage-map.json`) | 20:31:51, 16:31:14Z (names #288) | `7cdfb26b`; role files, merge `5f84c666` of #289 (disjoint, empty), handoff: carried |
| #290 | H, risk (39075278646) | yes (`ownership.amended_by`) | 22:51:34, Q-034-1 | `af7c2f49`; role files, handoff: carried |
| #291 | H, risk (39078268099) | yes (`ownership.amended_by`) | 23:37:23, Q-034-1 | `c935e0f2`; role files, merge `3b4bcbe3` of #290 (disjoint, empty), handoff: carried |
| #292 | H, governance (39088865958) | yes (`scripts/commit-when-clean.mjs`, `*-contract.mjs`, guard test) | 10-18 02:24:10, typed reply 10-17T20:36:01Z (l.7906) to A0's 20:32:39Z message naming this fix (l.7894) | r3 `2e7e1463`; role files, handoff: carried |
| #293 | H, governance (39103142589) | yes (guard test, `test-suite-contract.mjs`) | 06:32:34, typed reply 02:39:25Z (l.8565) to A0's 02:24:44Z message item 1 (l.8561) | `a368dff8`; role files, handoff: carried |
| #294 | H, governance (39118384041) | yes (guard tests, `test-suite-contract.mjs`) | 10:27:58, 02:39:25Z (l.8565) | `7429e741` (read after the non-mechanical merge `98b138a2`, R0-294-1); role files, handoff: carried |

CI on `main` (push runs) is green on every one of the 13 merge commits; at `27ff9970` run 39119363553: `bootstrap`
and `application` success, `ℹ tests 854 / pass 854 / fail 0`, `npm audit` "found 0 vulnerabilities" (three times),
8 application test files passed. Branch protection on `main` (read-only `gh api`): required `bootstrap`,
`application`, `strict: true`, `enforce_admins: true`, force pushes and deletions off: unchanged.

**Authority, checked by script.** Every Thai span quoted in `"…"`, `` `…` `` or `“…”`, and every line of every fenced
block, in the nine Owner dispositions added in range occurs byte-equal in the main-thread transcript (user messages,
AskUserQuestion inputs and answers, and A0's own messages a disposition quotes as the question asked): 100 of 100. The
answers are l.6137 (11:53:17Z, two questions: "A0 กดเมื่อ 4 role ผ่าน (Recommended)" for #283 and "A0 กดทีละ PR เมื่อ
4 role ผ่าน (Recommended)" for the CI-test and `--omit=dev` PRs), l.7524 (16:31:14Z, the two records PRs, one of them
#288 by number), l.7906 (`ลุลเลยไ่มต้องรอถาม`, answering l.7894, which ends by asking to start item 1, the two #278 Lows,
and recommends that A0 press when four roles pass) and l.8565 (`ลุยเลย ไม่ต้องรอถาม`, answering l.8561, item 1 = A1-292-2
in the three named files, same recommendation). Each governance PR was opened after the direction that names it
(#285 13:02Z, #287 14:06Z, #289 17:21Z, #292 21:39Z, #293 05:20Z, #294 08:41Z), or the direction names the existing PR by
number (#283 opened 10-16T20:11Z, #288 16:21Z). No package file, lockfile, `.github/**`, `src/**` or `apps/**` path
changed in range (`git diff --quiet` exit 0).

**Was any press made while a security finding was open?** Not against the pressed PR's own diff. A1's last verdict on
each final head reports no finding of grade Low or above open against that PR (#287 after rounds 1–2 with A1-287-1,
-2 and A1-287r2-1 Low closed; #292 after rounds 1–2 with A1-292-1 and -7 Low closed). A1-292-2 (Low) was open against
the suite at the presses of #292 and #293; A1 graded it against files those PRs did not change (#293 then closed it for
its own file), and it was recorded before each press (`open_blockers[16]` of WP-0A-CON-008 at `eac0dc45`,
`open_blockers[22]` of WP-0A-A0-004 at `8543341a`). #294 closed it for the last two named files. I hold that
acceptable; but see A1-AUD1018-2, the class is wider than the three files named.

## 2. Lane and records notes

- **Every lane CI printed is right**, none lowered. No lane error.
- **The prior round's findings.** A1-AUD1017-1 (#278 pressed with two A1 Lows): recorded by #289 and fixed by #292
  (index restored byte-exact; caller `GIT_*` refused or stripped). A1-AUD1017-2 (#268 carry lapse): recorded by #288
  (`records-transcription-2026-10-17.md` of WP-0A-DB-00 names `0a873c2f` and `649ef191`). A1-AUD1017-3 (labels): the
  records PRs in range are labelled risk/governance as CI printed. A1-AUD1017-4 (forward): unchanged, `M_ELIGIBLE_MODULES`
  is `[]`. A1-AUD1017-5 (ownership branch deleted at press): continued, see A1-AUD1018-4.
- **The second round's audit files** on `main` (#284). The auditors' kept branches `{c0,a1,q0,r0}/audit-2026-10-17` no
  longer exist and their commits (`eb3c639b`, `e3607cf1`, `70942e1d`, `3b95171d`, the `cherry picked from` trailers of
  `b4be8552`, `c753eb7f`, `790f96fb`, `11e3d5d6`) are no longer in the object store, so the Q-034-5 (a) re-check could
  not be made against them. I made it another way: from the four auditors' own subagent transcripts I rebuilt each file
  (the `Write`, then each later `Edit`, `sed` or `python` edit the auditor ran on it). Q0's rebuilt file equals `main`'s;
  C0's, R0's and A1's differ from their `Write` only by their own later in-place edits, each visible in their
  transcript; A1's transcript prints blob `ea1d7b87…` for its committed file, which is `main`'s blob; and each auditor
  printed the commit SHA that the corresponding trailer names. A0's own check at l.6089 printed "blob-equal" for all
  four before #284 was opened. So the carry held in substance; the deletion is A1-AUD1018-4.

## 3. Security posture of the cumulative diff

Non-evidence paths changed in range: two RFC notes (007 §F, 029 §4.6), `db/foundation/lint/audit-coverage-map.json`
(line re-pin), `scripts/commit-when-clean.mjs`, `scripts/test-suite-contract.mjs` (floors and digests), five test
files, the integrity manifest, seven manifests. No application, migration, CI-workflow, dependency or lockfile change.
`node scripts/scan-repository-secrets.mjs` at `27ff9970` exits 0; a token-pattern grep of the added lines finds none;
the only e-mail-shaped string added is `git@github.com`.

**CI test hardening (#287).** `app-stack.test.mjs` reads the application job of `ci.yml` and refuses, as classes:
a `shell`/`defaults` token, a `GITHUB_ENV`/`GITHUB_PATH`/runner-file-command token on any line it reads (block-scalar
bodies included, comments outside them excluded), quoted scalars that span lines, escape/tag/anchor/merge forms, and
any job, env, step, step-env or step-with key not on an allowlist pinned to `main`'s `ci.yml`. It only adds refusals
and changes no workflow. The residuals it states (run-time-assembled tokens, writes made by programs a step runs,
`set +e`, npm config written at run time) are held by review of every `ci.yml` and script change; they are honest and
acceptable.

**Commit gate (#292).** Re-read at `27ff9970`. Refusals put the index file back byte-exact (shared index included,
written back through `index.lock` and a rename, and checked readable); SIGINT/TERM/HUP/QUIT between staging and commit
restore first and kill the verifier's process group; `GIT_DIR`, `GIT_WORK_TREE`, `GIT_COMMON_DIR`,
`GIT_OBJECT_DIRECTORY`, `GIT_ALTERNATE_OBJECT_DIRECTORIES` and a foreign `GIT_INDEX_FILE` are refused with 95 before
anything runs; the verifier gets no `GIT_*`. No new path writes outside `.git/` (the kept copy is
`<index>.commit-when-clean-<ms>-<pid>`, beside the index). One gap in A1's own round-3 reasoning: A1-AUD1018-1.

**`GIT_*` stripping (#292, #293, #294).** `CHILD_ENV`/`withoutCallerGit`/`withoutGit` strip by the `GIT_` prefix in
`ratchets-bite`, `branch-scope`, `ci-guard-behaviour` and `handoff-conformance` (checked by `grep` at `27ff9970`). Two
other test files that start `git` in throwaway repositories were never in A1-292-2's survey: A1-AUD1018-2.

**Records and manifests.** Measured structurally (old vs new JSON, flattened): `amended_by`, `open_blockers` and
`required_human_authorities` only append; `amends_without_owning.rationale` keeps the old text whole (WP-0A-A0-004
prepends, the rest append); `WP-1A-A0-002` `acceptance_criteria[7]` and `package_evidence[4]` move from `--omit=dev` to
`--include=dev` (a tightening, matching CI since #279); `WP-0A-DB-00` and `WP-1A-A0-002` narrow `amends_without_owning.paths`.
No `status`, `writable_paths` or role assignment changed. The `amended_by[13..18]` entries of WP-0A-A0-002 grant no write
authority (acknowledgements of past regenerations). One standing widening is left after its merges: A1-AUD1018-3.

**The open residuals.**
- **A1-292-6** (racy-git mtime after a byte restore): acceptable. Theoretical, hides a same-tick same-size edit from
  `git status`, commits nothing.
- **A1-293-2 / A1-294-3** (`HOME`/`XDG_CONFIG_HOME` and the system gitconfig reach the scratch repositories): acceptable
  as Info. It is the operator's own configuration, not a redirection into another repository, and no case passes
  because of it. The fix is already in the repository as precedent: `foundation-contract.test.mjs` sets
  `GIT_CONFIG_NOSYSTEM=1` and `GIT_CONFIG_GLOBAL=/dev/null` after building its environment; a shared helper doing both
  (strip `GIT_*`, then set those two) would close A1-293-2, A1-294-3 and A1-AUD1018-2 together.
- **#294's 1/854 failure** (Q0-294-2): Q0's. Nothing security-relevant depends on it; the nested `GIT_*` cases assert
  exit 0 and the counts before comparing the victim, so a failed nested run cannot read as "victim untouched".

## 4. Findings

### A1-AUD1018-1 (Info; against A1-292r3's reasoning): caller or repository git configuration can make the gate commit bytes other than those the verifier tested

A1's round-3 reading of #292 says the `GIT_CONFIG_*` the gate still honours "cannot move the index, work tree or
object store". True, but configuration can change *content* at staging: a clean filter. Measured in a throwaway
repository with the gate copied from `27ff9970` and a verifier that reads only the working tree: with
`GIT_CONFIG_COUNT=2`, `core.attributesFile=<file with "a.txt filter=x">`, `filter.x.clean="sed s/good/evil/"`, the gate
exited 0 and committed `evil3` while the disk (what the verifier tested) held `good3`. The same happens with no
environment at all, from `.git/info/attributes` plus `git config filter.x.clean` (committed `evil4`, disk `good4`).
A verifier step that reads the index (`git show :a.txt`) refuses it (exit 1, "idx=evil2"), as A1-292-7's fix intended.

Why Info: it is git's own clean-filter semantics, reachable through the repository's local configuration, which the
gate cannot and need not police; the gate is the Author's discipline tool, not a security boundary (a caller can
`git commit` without it), and CI re-runs every guard and test on the pushed tree, so nothing unverified reaches
`main`. Owed: only precision. WP-0A-CON-008's handoff `known_limitations` should say the gate guarantees the verified
tree equals the committed tree up to the caller's and the repository's git content filters (`filter.*`, `core.autocrlf`
and the like), not unconditionally. Optional hardening: `git -c core.attributesFile=/dev/null` is not enough (the
repository's `.git/info/attributes` remains); comparing `git diff --stat` between index and work tree after staging
(empty for a clean `git add -A`) would detect it cheaply.

### A1-AUD1018-2 (Info; A1-292-2's class, outside its survey): two more test files pass the caller's `GIT_*` to `git`

`test-kits/db/foundation-contract.test.mjs` (four cases, l.6240, 6578, 6818, 7210, 7341) builds `{...process.env, …}`
and deletes only `GIT_DIR`, `GIT_WORK_TREE` and `GIT_INDEX_FILE`; `test-kits/app-boundaries.test.mjs` l.686 (the A1-257-9
case) passes `process.env` whole. Measured against a scratch victim repository: with `GIT_OBJECT_DIRECTORY` = the
victim's object store, the records-only case of `foundation-contract` **passes 1/1 and writes 28 objects into the victim**,
and the A1-257-9 case of `app-boundaries` **passes 1/1 and writes 3**; with `GIT_COMMON_DIR` = the victim's `.git`,
`foundation-contract` fails loudly (and writes 33 objects); with `GIT_INDEX_FILE`, `app-boundaries` fails loudly and the
victim's index is untouched. In every probe the victim's refs, index, config and `git fsck` stay clean: only
unreachable loose objects are added, which `git gc` removes. `GIT_CONFIG_*` would also reach these children (caller's
own hooks).

Why Info, not Low: unlike A1-292-2, nothing the caller relies on is replaced; the gate now strips `GIT_*` for its
verifier, so the trigger is a bare `npm run check` from a hook or a shell with such variables set. Owed: the owners of
those files (R0 to name them) record it, and the fix is A1-292-2's: strip by prefix (and, with A1-293-2, set
`GIT_CONFIG_NOSYSTEM`/`GIT_CONFIG_GLOBAL`). A guard that every `spawnSync('git'` in `test-kits/` passes a stripped
environment, which A1-292-2 suggested as "better still", would have found both.

### A1-AUD1018-3 (Info; records/ownership): `amends_without_owning.paths` left standing after the merges that needed them

After #293 and #294 merged, `WP-0A-A0-004` still lists `scripts/test-suite-contract.mjs` and `evidence/VERIFICATION.md`,
and `WP-0A-CON-008` still lists `test-kits/integrity-manifest.json` and `scripts/test-suite-contract.mjs` (also
`WP-0A-A0-003`, `WP-0A-CON-002`, `WP-1A-A0-001` from before the range). The range itself shows the practice is to
narrow after the merge (#286 for WP-1A-A0-002, #288 for WP-0A-DB-00, gov-a004d "PATHS EMPTIED" earlier), and no record
in range says these are owed. A standing entry lets a later PR of the package change WP-0A-A0-002's suite contract (test
floors and name digests, a ratchet) without the ownership validator asking again. Why Info: any edit of
`*-contract.mjs` is still governance by the classifier, so it still needs an Owner direction and all four roles. Owed:
the next records PR of each package narrows them, or records why they stay.

### A1-AUD1018-4 (Info; records, continues A1-AUD1017-5): ownership branches and the auditors' kept branches deleted

A0 deleted the remote ownership branch of WP-0A-A0-001 (`--delete-branch` on #284), WP-1A-A0-003 (#282), WP-0A-A0-004
(#283; `git push --delete` after #287 and #293), WP-1A-A0-001 (#285), WP-1A-A0-002 (after #286, recreated for #290)
and WP-0A-CON-008 (after #289 and #294); `git ls-remote` shows five manifests' `ownership.branch` absent today. A0's
l.8561 message says it kept #288's, #290's and #291's because R0 asked; the others were deleted after A1-AUD1017-5 was
on `main`. And A0 deleted the four auditors' kept branches `<role>/audit-2026-10-17` at l.6418, twenty minutes after #284
merged, although the brief said "keep the branch", which removed the objects the next audit's Q-034-5 (a) re-check
reads (§2; I could make it only from the auditors' transcripts). Not a security defect: every head is in `main`'s
history, anyone with push rights can create those branch names anyway, and CI's audit lane still checks the head ref
and repository. Owed: either keep ownership branches and auditor branches (the brief's words), or amend the briefs and
RFC-2026-034 §2.3 to say the trailers and A0's recorded blob check are the evidence.

### Carried, unchanged (not raised again)

A1 N1, N2 (Low, RFC-2026-029 text; before any worker is provisioned); A1-259-N1, -N3; A1-261-N1 to -N3; A1-265-N1 to
-N5; A1-279r4-1; A1-AUD1017-4 (forward, before §8 item 5's governance PR). Closed in range and verified here:
A1-AUD1017-1, A1-AUD1017-2, A1-278r2-1, A1-278r2-2, A1-292-1, -3, -4, -5, -7, A1-292-2 (for the three files it named),
A1-287-1, -2, A1-287r2-1, A1-286-1. Optional, open, Info: A1-292-6, -8, -9, -10, A1-293-1, -2, A1-294-1 to -4.

## 5. Verdict

**Findings:** none of grade Low or above; four Info (A1-AUD1018-1 to -4). **Stop-the-line: no.** No tenant leakage,
secret exposure, unreviewed dependency or licence change, lowered lane or self-lowering classifier edit was found in the
cumulative diff; the CI test, commit gate and `GIT_*` changes each tighten what they touch. Every press in range was made
by A0 with `--match-head-commit` on the exact final head, on a head containing `main`, with both required jobs green,
under the authority its lane names (Q-034-1 for risk, Q-034-5 (a) for audit, and for governance an Owner direction
quoted exactly that names the PR or its content), and after C0, A1, Q0 and R0 had read a head whose later commits their
carry clauses admit. No press was made with an A1 finding of grade Low or above open against the pressed PR's own diff.
The residuals A1-292-6, A1-293-2 and A1-294-3 are acceptable as Info. A1 blocks no package's move past `in_review`;
whether each moves is C0's, Q0's and R0's to say.

This file is A1's only output: no other role's verdict, no manifest status, no fix.
