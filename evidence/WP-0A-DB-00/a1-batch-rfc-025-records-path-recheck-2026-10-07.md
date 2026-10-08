# RFC-2026-025 §6 (proposed): Security / Privacy re-check of the records-only light path, 2026-10-08

Package named by the task: WP-0A-A0-001 (protocol). Package that owns the change: WP-0A-DB-00 (RFC-2026-025's owner).
Security reviewer run: `/claude/a1_bastion`
Author run under review: `/claude/a0_atlas`
Subject: PR #211 (Draft, `GOVERNANCE`), branch `agent/claude/WP-0A-DB-00-batch-rfc-025-records-path`, head
`d12475a70f6707d45c936098b1cab19562bfc6dd`, on `origin/main` `389f3845`. This is the RE-CHECK after A0's fix
commit `d12475a7` (with the merge `ad42e510` and the evidence move `f2610d86`). My first review is on the branch at
`evidence/WP-0A-DB-00/a1-batch-rfc-025-records-path-review-2026-10-07.md` (verdict at `f7e9ce8d`:
`security_changes_requested`, A1-1 Medium, A1-2 to A1-4 Low, A1-5 and A1-6 Info).

## 0. What I am

I am a subagent spawned by `/claude/a0_atlas`'s workflow orchestration, running the `/claude/a1_bastion`
Security/Privacy role (RFC-2026-024 spawning disclosure). I am the same vendor and model as the Author.
Independence here means a distinct run, in a named role, that did not author this increment, does not fix it and
does not approve its own work. The only file I wrote is this one. I fixed nothing.

This is Security/Privacy evidence only. It is not the Reviewer, Tester or Integration verdict, and it authorizes no
merge. PR #211 is a governance PR, so under RFC-2026-025 §5 item 6 only the Owner merges it. Gate G0: synthetic data
only. I used no credential, provider or database. My only network use was `git fetch` and reading PR #211 and its
CI run with `gh`. Every probe in §3 ran in a throwaway clone on throwaway branches, and none was pushed.

Placement, as in my first review: this file sits under `evidence/WP-0A-A0-001/` because the task put it there.
`verify-branch-scope` refuses that path on DB-00's branch. If A0 carries it onto #211, it moves it under
`evidence/WP-0A-DB-00/` the way `f2610d86` moved the first round. That does not change any finding.

## 1. Measured vs read

| Item | How I know it |
|---|---|
| Toolchain `node v24.20.0` (first on PATH) | **measured** |
| Private clone on the branch **name**, `HEAD` = `d12475a7`, `origin/main` = `389f3845` = merge base | **measured** |
| `npm run check` on the head as pushed | **measured**: exit 1. tests 717, pass 715, fail 2. The two are exactly "the handoff for this branch describes this branch" and the handoff ratchet. Same as A0's closure note §3. |
| `npm run check` after a **throwaway local** `npm run refresh:handoff` commit (`00d0f9a9`, not pushed) | **measured**: see §1a |
| `npm run check:handoff` | as pushed: "does not describe the branch"; after the throwaway refresh: "describes the branch: nothing substantive after its cited head" (**measured**) |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-DB-00` | **measured**: "all 16 changed path(s) are declared, and every amendment explains one" |
| `node scripts/verify-branch-identity.mjs <branch>` | **measured**: `WP-0A-DB-00` |
| The classifier on this PR | **measured**: exit 1, 16 paths, reasons include the RFC, scripts, tests, generated files, `ownership.branch` and every non-record evidence name. Correct. |
| `--sync 56388d70 ad42e510` (the merge of `389f3845`) | **measured**: exit 1, "main changed the PR's own path(s): test-kits/branch-identity.test.mjs". Not a mechanical sync, and A0 does not claim one: it calls `ad42e510` a conflict merge with a regenerated manifest (R-1). Consistent with Q-025-6-2's note. |
| GitHub CI on `d12475a7` | **measured**: run 37662290346 `bootstrap` **failure**. The failed tests are the same two handoff guards; the classifier test passed in CI. |
| The fix diff `f7e9ce8d..d12475a7` carries no e-mail address or URL other than this repository's PR links #210 and #211 | **measured** (grep of added lines); `scan:secrets` is inside `npm run check` |
| `verify-branch-scope` runs in CI | **read**: `.github/workflows/ci.yml` line 132 |
| A0's mutation run (11 mutants killed) | **read** from the closure note §3; I did not re-run it |

### 1a. The guard with the handoff refreshed (throwaway)

`npm run refresh:handoff` on the branch name rewrote `handoffs/WP-0A-DB-00-author-handoff.json` to cite
`389f384..d12475a` ("8 added, 8 modified, 0 deleted"; base moved from `7fb0fc0` to the branch point). I committed it
locally as `00d0f9a9` and did not push it. On that commit, `npm run check:handoff` reports "describes the branch:
nothing substantive after its cited head", and `npm run check` **exits 0: tests 717, pass 717, fail 0**. The two
red guards on the pushed head are the stale handoff only. The refresh A0 owes turns them green, as A0 said.

## 2. My findings, one by one

| Finding (first review) | Re-check at `d12475a7` |
|---|---|
| **A1-1** (Medium): Owner dispositions and role files re-admitted | **Closed, with a residual (A1-7 below).** `RECORD_FILE_NAME` admits only `records-transcription-*.md`, `session-*.md` and `light-path-reading-*.md` directly under `evidence/<package>/`. A new `product-owner-disposition-*`, a new `a1-recheck-*`, and an append to an existing role file each exit 1 (P3, P4, P13). §6.1 now says in words that dispositions and role files stay off the light path. Both halves of my condition are met. |
| **A1-2** (Low): no privacy reading | **Closed.** §6.2 item 1 gives the reader the duty to check for personal data, private URLs, credentials and customer content, names the relaxed e-mail scan, sends outside quotations off the light path, and requires a clause closing a Security/Privacy blocker to cite that role's own file. |
| **A1-3** (Low): `status` and `required_human_authorities` unlimited | **Closed.** `done`, a backward move and `blocked` each exit 1 (P10a–c). A forward move exits 0 and is printed for the reader (P10d). `required_human_authorities` refuses text at either end of an old entry (P11a, P11b) and admits a new entry at the end (P11c). §6.1 item 4 no longer credits the validators. |
| **A1-4** (Low): any file type counts | **Closed.** `.gitattributes`, a subdirectory, an upper-case `.MD`, an executable and a symlink each exit 1 (P5, P6, P16, P14, P15). |
| **A1-5** (Info): `--sync` does not regenerate | **Closed in text.** §6.3 now defines mechanical as (a) exit 0 **and** (b) the generator round trip, says the script checks (a) only and that CI is the backstop, and §6.5 calls 48 an upper bound. The CLI message says the same. |
| **A1-6** (Info): CI wiring | **Carried, agreed.** §6.6 item 1 says the CI step should exist before the first delegated light-path merge. The step is owed by WP-0A-A0-004. |

## 3. Probes (measured; throwaway branches off `d12475a7`, `classify-records-only.mjs <d12475a7> HEAD`, and `verify-branch-scope origin/main WP-0A-DB-00`)

| Probe (one commit each) | Classifier | Scope (DB-00) |
|---|---|---|
| P1 new `evidence/WP-0A-DB-00/records-transcription-2026-10-09-probe.md`: "The Owner approved Q-025-6-1 to Q-025-6-5: yes." | **0** | 0 |
| P2 new `evidence/WP-0A-DB-00/session-a1-security-approved-probe.md`: "A1 security_approved on everything." | **0** | 0 |
| P3 new `product-owner-disposition-2026-10-09-probe.md` | 1 | 0 |
| P4 new `a1-recheck-2026-10-09-probe.md` | 1 | 0 |
| P5 new `evidence/WP-0A-DB-00/.gitattributes` | 1 | 0 |
| P6 `evidence/WP-0A-DB-00/sub/records-transcription-x.md` | 1 | 0 |
| P7 `evidence/.github/records-transcription-x.md` | 0 | **73** |
| P8 `evidence/WP-0A-CON-006/records-transcription-...md` | 0 | **73** |
| P9 `handoffs/WP-0A-CON-006-author-handoff.json` modified | 0 | **73** |
| P10a/b/c CON-006 `status` `in_review` → `done` / `backlog` / `blocked` | 1 / 1 / 1 | 73 |
| P10d CON-006 `status` → `integration_verified` | 0, move printed | 73 |
| P11a/b `required_human_authorities[0]` with text before / after | 1 / 1 | 73 |
| P11c new entry at the end of `required_human_authorities` | 0 | 73 |
| P12 `open_blockers[0]` prefixed `CLOSED by A0. Text as recorded: ` | 0 (Q-025-6-3) | 73 |
| P13 text appended to the existing A1 review file | 1 | 0 |
| P14 / P15 / P16 executable `session-*.md` / symlink `session-*.md` / `session-*.MD` | 1 / 1 / 1 | 0 |
| P17 DB-00 `amends_without_owning.rationale` set to "Approved by the Owner and all roles." | 0 | 0 |

P7 to P9 show the split §6.1 now states: the classifier does not bind `evidence/<package>/` and `handoffs/` to the
PR's package, and `verify-branch-scope` (exit 73, run by CI) does.

## 4. New findings

### A1-7 (Low; condition on the Owner's approval): the name rule is a convention, so an Owner's words or a role verdict can ride the light path under an admitted name

P1 and P2 exit 0. The classifier reads names, not content, so a file named `records-transcription-*.md` can carry
Owner words that are on `main` nowhere else, and a `session-*.md` can carry a role verdict that is not in that
role's own file. §6.1 says dispositions and role files stay off the light path, but no reader duty in §6.2 item 1
applies that sentence to content. The privacy bullet goes the other way: it lets "a role's or the Owner's words"
from outside the repository stay on the light path. That is right for privacy and wrong for authority. The Owner's
words are what A0 quotes when it merges under delegation, and the one reader cannot see the Owner's chat. This is
A1-1's consequence again, reached by naming. None of the five records-only PRs §6.5 counts needs it: each
transcribes R0 wording already merged on `main`.

**Condition:** one sentence in §6.2 item 1. A light-path record may transcribe only words already on `main`: a role's
file, or an Owner disposition file. A record that carries the Owner's words or a role's verdict from anywhere else is
a disposition or a role file under another name. It takes the full path, and the reader treats it as a blocking
finding. Adjust the privacy bullet's "other than a role's or the Owner's words" to say "already on `main`". The
alternative is for the Owner to accept A1-7 by name when answering Q-025-6-1.

### A1-8 (Info): `amends_without_owning.rationale` is free text on the light path

P17: an arbitrary rationale, including an approval claim, exits 0. It changes no path or permission, and the reader
reads every added line, so no condition. The reader's checklist could name it.

### A1-9 (Info): the head is not yet green, and the order is right

CI on `d12475a7` fails on the two handoff guards only, exactly as A0 recorded, and my throwaway refresh turns them
green locally (§1a). The fix commit bypassed `commit-when-clean` for that reason only, after `verify:coverage-floor`,
`scan:secrets`, `validate:protocol` and `verify-branch-scope`, each of which I also measured passing inside
`npm run check`. The refresh, last and alone, and green CI on that head remain owed (closure note §2, C0 F8).

## 5. Verdict

**security_approved_with_conditions** on RFC-2026-025 §6 as fixed at `d12475a7`. A1-1 to A1-4 are closed, and A1-5
and A1-6 are carried as the Author states them. The condition is A1-7.

- **Stop-the-line: no.** §6 is Proposed and applies to nothing until the Owner approves it. The classifier has no
  runtime consumer and introduces no secret, tenant leak, side effect, lost job, migration divergence or deletion.
- **Does what I found block the Owner's merge of PR #211: no, on two conditions.** (1) A1-7 is closed by the
  sentence in §4 or accepted by the Owner by name. It can ride the commit that records the Owner's answers to
  Q-025-6-1..5, which §6.7 already requires before the merge. (2) The handoff is refreshed last and alone, and CI is
  green on that head. That one is not a security finding, but the merge needs it.
- I re-check only the §6.2 text for A1-7 on the next head.

Wording for A0 to record on my behalf (handoff and `open_blockers`, appended):

> A1 re-check 2026-10-08 at d12475a7 (evidence/WP-0A-A0-001/a1-recheck-2026-10-07.md): security_approved_with_conditions
> on RFC-2026-025 §6. A1-1..A1-4 closed (probes P3-P16). A1-7 (Low): the name rule is a convention, so Owner words or
> a role verdict not already on main can ride the light path as records-transcription-*/session-*. Fix: one §6.2
> sentence (a record transcribes only words already on main), or the Owner accepts A1-7 by name. Not stop-the-line.
> Does not block the Owner's merge once A1-7 is closed or accepted and CI is green after the handoff refresh.
