# A1 Security/Privacy review — WP-0A-A0-004 at PR #189 head `acbcee1`

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer, the run `work-packages/WP-0A-A0-004.json`
`role_assignments.security_reviewer_agent_run_id` names. Same vendor as the Author; the Product
Owner withdrew the cross-vendor condition for this package on 2026-10-05 (RFC-2026-024 §3/1,
`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` §3 row 1).
Subject: https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/189 (Draft), branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, head
`acbcee1ca3cc7c894eb0c7b97cde23fd4189e25d`. Base: `main` = `8c089cc` (merge of PR #185).
Date: 2026-10-06 (file name keeps the date in the brief, 2026-10-05).

**This document records findings. It advances no package status, writes `security_approved`
nowhere, signs nothing on the Author's behalf and repairs nothing it found.**

---

## 0. What I am, before anything else

**I am a subagent spawned by a workflow run of `/claude/a0_atlas`, the Author of this package, in
the same vendor and model family (RFC-2026-024 §3/3-4).** A0's workflow wrote the brief I was handed,
including its summary of what the Author did and did not do. That brief is the Author's claim; I
treated every sentence in it as something to check against the tree, not as evidence.

What that does not weaken: every claim below carries the command, the `file:line`, or the API read it
rests on, and a reader can re-run it. What it does weaken: framing. A0 chose the subject and the
question; a defect neither of us thought of is one I probably did not find (§7 lists what I did not
check). A same-vendor signature does not pass Gate G0's external verification (RFC-2026-024 §3/5).

---

## 1. Verdict, in one sentence

> **No security or privacy objection to PR #189. It changes four record files and no executable path;
> the control the package exists for (the workflow, not `package.json`, invokes the test-integrity
> guard) is present on main and re-measured here, and the branch passes every declared test on its
> own name. Two LOW findings and three INFO notes, none blocking.**

Stop-the-line: **no**. Blocks the merge on security grounds: **no**. (The merge is still held by
gates this role does not own: C0, Q0 and R0 verdicts, the CI run still in progress at the time of
writing, and the Draft state.)

---

## 2. Earlier A1 conditions

**There are none.** `git log --all -- 'evidence/WP-0A-A0-004/*'` lists only Author commits
(`3737893` … `40bfc8d`), and `evidence/WP-0A-A0-004/` at `acbcee1` holds `author-self-check.md` and
`author-step2-and-retest-2026-10-06.md` only. The brief asked me to re-verify "my earlier verdict";
no earlier A1 verdict on this package exists at any head. This file is therefore the **first** A1
verdict on WP-0A-A0-004, and it reviews the package as a whole (§3, §4), not only the PR's delta.
The Author's own manifest says the same (`open_blockers[6]`).

---

## 3. Measured vs read

### 3.1 Measured (Node `v24.20.0`, npm `11.19.0`, `/Users/bank/.local/node-v24.20.0/bin/node`)

All in a private clone under my scratchpad (`…/scratchpad/a1-WP-0A-A0-004/clone`), checked out with
`git checkout -B agent/claude/WP-0A-A0-004-ci-independent-guard-step acbcee1…`, so
`git rev-parse --abbrev-ref HEAD` reads the branch **name** and the handoff guard has a claimant.
`origin/main` fetched at `8c089cc0bf30a234efa61752c6054d670f85a2a8`. No database was started; none
was needed for these commands.

| Command | Exit | Result |
|---|---|---|
| `npm ci --ignore-scripts` | 0 | |
| `node scripts/verify-test-coverage-floor.mjs` | 0 | silent |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | silent, no overlap |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-004.json` | 0 | |
| `npm run check` (on the branch name) | **0** | `tests 692 / pass 692 / fail 0 / cancelled 0 / skipped 0 / todo 0` (duration 735 s) |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-004-ci-independent-guard-step` | 0 | prints `WP-0A-A0-004` |
| `node scripts/verify-branch-scope.mjs 8c089cc… WP-0A-A0-004` | 0 | `all 4 changed path(s) are declared, and every amendment explains one` |

**The load-bearing measurement, repeated independently.** On two copies of the branch tree
(`rsync` of the clone without `.git`), each with `package.json` `scripts.check` neutered and the
integrity manifest regenerated (`node scripts/regenerate-integrity-manifest.mjs`, exit 0) so the
digest tripwire cannot be what fires:

| Injected `scripts.check` | `node scripts/verify-test-coverage-floor.mjs` (the workflow's own step) | `npm run check` |
|---|---|---|
| trailing ` &` | **81**: `check step "npm run test:bootstrap &" contains "&" …` | not run (it would background the suite) |
| every ` && ` → ` \|\| ` | **81**: `… contains "\|", … which is not part of a command name or path` | **0**, and no `tests` line in the output — no test ran |

So the property the package claims holds at this head: a `package.json` edit that turns
`npm run check` green while running nothing is refused by the separate workflow step
(`.github/workflows/ci.yml:74-75`), which runs before `npm run check` (`:76-77`).

**Branch protection on `main`, read-only** (`gh api repos/ThinkBizLab-Org/ThinkBizThai/branches/main/protection`, 2026-10-06):
`required_status_checks.strict: true`, `contexts: ["bootstrap"]`, `checks: [{context: "bootstrap",
app_id: 15368}]`, `enforce_admins: true`, `allow_force_pushes: false`, `allow_deletions: false`,
`required_conversation_resolution: true`, no `required_pull_request_reviews`, `required_signatures: false`.

**PR #189** (`gh pr view 189`): Draft, `headRefOid` = `acbcee1…`, `mergeStateStatus: BLOCKED`. CI run
`37358669435` on that head: at the time of writing `in_progress`, with `Verify test-integrity guard`,
`Validate repository bootstrap`, `Verify branch scope` and `Database foundation` all `success` and the
negative-control step still running. **I did not see a final conclusion.**

### 3.2 Read (not measured)

- `git diff origin/main acbcee1`: four paths only — `work-packages/WP-0A-A0-004.json`,
  `evidence/WP-0A-A0-004/author-self-check.md`, `evidence/WP-0A-A0-004/author-step2-and-retest-2026-10-06.md`,
  `handoffs/WP-0A-A0-004-author-handoff.json`. `git diff --quiet origin/main acbcee1 -- .github package.json package-lock.json scripts test-kits` exit 0.
- The authority correction: `82aae60` is dated 2026-09-02, subject "Product Owner approves RFC-2026-003
  through -009"; `RFC-2026-007…md:3` reads "Status: Approved 2026-09-02 by the Product Owner";
  `WP-0A-A0-001.json` `ownership.amended_by[2]` names `WP-0A-A0-004` and the RFC-2026-007 file. The
  Author's correction from RFC-2026-003 to RFC-2026-007 is right.
- The step-2 changes: the disposition file §3 rows 1-3 say what the manifest now says; the Owner's
  reply is quoted at its line 83 as `บืนยันขั้น 2` and glossed at line 85 as a typo for `ยืนยัน`. The
  manifest quotes it faithfully. The successor acknowledgement is correctly recorded as **pending**
  (`amended_by[2].acknowledgement_required_from` still `/root/r0_steward`, status `pending`).
- `ci.yml` (unchanged by this PR, owned by this package): `permissions: contents: read` (`:8-9`);
  both actions pinned by full SHA (`:36`, `:59`); `persist-credentials: false`; `npm ci --ignore-scripts`;
  no `pull_request_target`, no `secrets.` reference; the pull-request values reach the shell only through
  `env:` (`BASE_SHA`, `HEAD_REF`, `:88-90`) and are quoted at use, so a hostile branch name is not
  interpolated into a `run:` script. The only `${{ }}` in a non-`env` position is `ref: ${{ github.head_ref }}` (`:54`), an action input.
- Secrets and personal data: a pattern sweep of the PR's added lines (`gh*_`, `sk-`, `AKIA`, `password`,
  `secret`, `token`, e-mail and URL shapes) matched one line, prose about the secret scan. The
  `scan:secrets` step inside `npm run check` passed. No PII, no credential, no private URL.

---

## 4. Findings

### F1 — LOW. CI tests the branch tip at checkout time, not the commit its result is reported on

`ci.yml:54` checks out `ref: ${{ github.head_ref }}`, the branch **name**. The run's check result is
attached to the event's head commit (`github.event.pull_request.head.sha`). Nothing asserts the two
are the same commit: no step compares `git rev-parse HEAD` with the event's head SHA (`grep -n
'head\.sha\|rev-parse' .github/workflows/ci.yml` finds only the comment at `:50`). If the branch moves
between the event and the checkout, the run tests the newer tip and reports on the older commit.

Why LOW, not higher: the required check is evaluated on the PR's current head, and every push
triggers a run on that head which checks out the then-current tip; for the final, stable head the
latest run tests that head itself. Turning this into a green on a bad commit needs a writer to win an
ordering race and keep it through the last push. **Not reproduced**; I did not push anything. The
`ref:` comment (`:38-53`) argues branch-vs-merge-commit and is right about that; it does not discuss
this race. Repair (Author's, not mine; `ci.yml` is in this package's `writable_paths`): one step after
checkout that fails when `git rev-parse HEAD` differs from `$HEAD_SHA`, passed via `env:` from
`github.event.pull_request.head.sha`, guarded to `pull_request` events. Pre-existing on main; not
introduced by PR #189; does not block it.

### F2 — LOW. `amends_without_owning.recorded_on` names three manifests that hold no such record

PR #189 empties `ownership.amends_without_owning.paths` (correctly — the scope guard measured exit 74
before, 0 after) and rewrites the rationale to say the previous increment's five-path amendment
"record stays on WP-0A-A0-001.json, WP-0A-CON-008.json and WP-0A-A0-002.json and in git history",
keeping `recorded_on` with those three files. Measured against the tree:

- `WP-0A-A0-001.json` `ownership.amended_by` has one `WP-0A-A0-004` entry, `[2]`, the **ci.yml
  transfer**; nothing about `validate-work-package-ownership.mjs` or the other four paths.
- `WP-0A-CON-008.json` and `WP-0A-A0-002.json` contain **no** `WP-0A-A0-004` string at all.
- `grep -rl a5c33fd work-packages evidence` finds nothing.
- `git log -S'WP-0A-A0-004'` on the three manifests shows `amended_by` entries for this package added
  in `086921a` and removed in `ae5864d` (both 2026-09-02).

So the only record is git history (`a5c33fd`) and this manifest's own rationale. Two of the five
paths are guards owned by other packages (`scripts/validate-work-package-ownership.mjs`, WP-0A-A0-001;
`scripts/verify-disposition-branch.mjs`, WP-0A-CON-008), and their owners' manifests carry no record
that another package edited them. `recorded_on` is prose no validator reads
(`scripts/validate-work-package-ownership.mjs:151-192` reads `paths` and `rationale` only), so nothing
caught it. The false claim predates this PR (it was on main's version too); the PR restates it. Owed
by the Author: say "git history only (`a5c33fd`); no owner manifest records it", or have the owners
record it. Traceability of guard edits, not an open path; does not block.

### F3 — INFO. The protection read leaves out the two settings that matter most for this package

The manifest's blocker and the Author's §4 list `contexts`, `strict`, `enforce_admins`, force-push,
deletion. They omit `checks[0].app_id: 15368` (GitHub Actions) and `required_conversation_resolution:
true`. The first is the security-relevant one and it is **good news**: a writer who posts a commit
status named `bootstrap` through the API does not satisfy the required check; only a GitHub Actions
check run does. That narrows `open_blockers[0]` ("someone who can edit ci.yml can delete the step")
to exactly that: bypassing the guard step needs a `ci.yml` (or new workflow) edit that appears in the
PR diff. Worth stating in the record; no change required.

### F4 — INFO. "A commit in practice reaches main through a pull request" is correctly labelled an inference

`open_blockers[5]` adds that inference and says it was not tested by a direct push. I agree with the
inference and with not testing it: with `enforce_admins: true` and a strict required check, a direct
push is accepted only for a commit that already carries a green `bootstrap` from Actions and is up to
date with `main`, which in this workflow means it ran in a pull-request run (where the branch-scope
step runs). F1 is the one caveat to "where this step runs".

### F5 — INFO. The PR touches no executable path

Its security effect is on the record only: the authority line is corrected toward the RFC that
actually transferred `ci.yml`; stale blockers are removed only where the tree shows their ground gone;
the pending acknowledgement is kept pending. Nothing widens `writable_paths`, adds a role, changes a
gate, or weakens `independence` beyond what the Owner's recorded words (§3 row 1) decided.

---

## 5. Stop-the-line check (CONTRIBUTING_AGENTS.md "Non-negotiable security and data rules")

Secret exposure: none found (§3.2). Tenant leakage, duplicate external side effects, lost jobs,
migration divergence, irreversible deletion: not reachable from four record files. Contract mismatch:
none — the PR changes no contract. **Stop-the-line: NO.**

---

## 6. Verdict

**Security: no objection — approve on security/privacy grounds at head `acbcee1`**, with F1 and F2
carried as LOW, owed by the Author, neither a condition of this merge. This is the first A1 verdict on
WP-0A-A0-004; there were no earlier A1 conditions to close.

It is not `security_approved` written into the manifest, not the Reviewer's, Tester's or Integration
Owner's verdict, and not merge authority. Before a merge the head still needs: a completed green CI run
on `acbcee1` (or its successor head — this commit itself moves the head), the C0, Q0 and R0 verdicts,
and the PR out of Draft.

---

## 7. What I did NOT review

- The `ci.yml` steps after `Verify branch scope` (the database foundation and negative control), beyond
  reading that they take no secret; they belong to other packages' content.
- An attempted direct push to `main`, or any exploit of F1: both would be writes to the shared remote.
- `evidence/g0-tracker-th.md` (WP-0A-A0-001's file), which the Author lists as owed.
- The acknowledgement at `WP-0A-A0-001.json` `amended_by[2]` — owed by `/claude/r0_steward`, not me.
- The ampersand variant of `npm run check` end to end (it backgrounds the suite); the Author recorded
  exit 0 for it and I measured only the guard's exit 81.
