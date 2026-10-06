# WP-0A-A0-007 — Independent Test Verification at PR #200

- **agent_run_id:** `/claude/q0_sentinel`
- **Role:** Independent Tester
- **Subject:** https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/200, branch
  `agent/claude/WP-0A-A0-007-amend-section-2`, head `1509aef6c8ab0c66f25601e714925daa2200ca9a`
  (branch point `b61735f`; `origin/main` at the time of this run `d863f40`, the merge of PR #199)
- **Earlier verdict of this role:** none. Before this PR there was no `evidence/WP-0A-A0-007/` folder
  (read; manifest `open_blockers[4]`, author self-check §1). This is the FIRST `test_verified` reading,
  dispatched as a re-verification; there are no earlier Q0 conditions to close.
- **Date:** 2026-10-06 (file name keeps the dispatch date 2026-10-05)

This is independent Tester evidence only. It is not a review, security, integration or Product Owner
verdict, it does not advance the package's status, and it does not move Gate G0. Nothing was fixed.

## §0 What I am

I am a subagent of `/claude/a0_atlas`, the run that authored this package and this PR, so I share its
vendor and model family. RFC-2026-024 puts that shared origin on record, and the Owner's step 2
(`prefer_cross_vendor_review: false`, applied to this manifest by this PR) applies it here. This
verification is **not** the independent human sign-off a gate requires; whether a role run counts as the
role's signature is for the Integration Owner and the Product Owner to decide. Each item says whether I
**measured** it (I ran it) or **read** it (I read it in the tree or on GitHub).

## §1 Method and containment

- Toolchain (measured): Node `v24.20.0`, npm `11.19.0`, from `/Users/bank/.local/node-v24.20.0/bin`.
- **Branch-reading guards ran in a private clone on the branch NAME**, never detached:
  `…/scratchpad/q0-WP-0A-A0-007/clone`, `git checkout -B agent/claude/WP-0A-A0-007-amend-section-2 1509aef`,
  `origin` pointed at GitHub and fetched, `origin/HEAD` set to `origin/main` (`d863f40`). The clone's tree
  was clean after every run.
- No database was started and no port was used (the package touches no schema). No tracked file in any
  checkout was modified apart from this evidence file.

## §2 Declared tests at the head (measured, private clone on the branch name)

| Command (manifest `required_tests` / `deterministic_commands`) | Exit |
|---|---:|
| `npm run check` | **0** — `tests 705, pass 705, fail 0, cancelled 0, skipped 0, todo 0` |
| `node scripts/validate-work-packages.mjs` | 0 |
| `node scripts/validate-work-package-ownership.mjs` | 0 |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-007.json` | 0 |
| `npm run check:handoff` | 0 — "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-007-amend-section-2` | 0 — `WP-0A-A0-007` |
| `node scripts/scan-repository-secrets.mjs` | 0 (not cited as secret-coverage assurance) |
| `node scripts/verify-branch-scope.mjs b61735f WP-0A-A0-007` (the branch point) | 0 — "all 3 changed path(s) are declared" |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-007` (main `d863f40`, what CI uses) | **73** — see Q0-F1 |

Diff `b61735f..1509aef` (measured): three files, all inside `writable_paths` —
`work-packages/WP-0A-A0-007.json`, `evidence/WP-0A-A0-007/author-self-check-2026-10-06.md`,
`handoffs/WP-0A-A0-007-author-handoff.json`. No RFC, script, test, CI file, digest, migration or contract
changed; `git diff b61735f 1509aef -- architecture/` is empty.

CI (read, `gh pr view 200`): the required check `bootstrap` on `1509aef` is **`COMPLETED / FAILURE`**
(actions run 37475987264), failing in step "Verify branch scope" with exit 73.

## §3 Findings

### Q0-F1 (blocking the merge, not stop-the-line) — the required CI check is red at the head

Read from the CI log, then measured locally: with `BASE_SHA` = `d863f40` (current `main`, after PR #199),
`verify-branch-scope` reports

```
WP-0A-A0-007 changed 3 path(s) it neither owns nor records as an amendment:
  evidence/WP-0A-A0-002/records-transcription-2026-10-06.md
  handoffs/WP-0A-A0-002-author-handoff.json
  work-packages/WP-0A-A0-002.json
```

and exits 73. The three paths are #199's, which this branch does not contain: the guard compares the
branch tree with the base tree, so a branch that is behind `main` "changes" whatever `main` gained since
the branch point. Against `b61735f` the same command exits 0.

This contradicts the Author's not-done item "Syncing the branch with main d863f40 (PR #199) … Branch scope
against the branch point b61735f exits 0, so a sync is not needed." That measurement was taken against the
wrong base: CI measures against current `main`, and the head has no green required check, which
RFC-2026-002 requires before any merge. The content of the package is not at fault. What closes it is a
sync with `main` (a merge of `origin/main` into the branch), followed by the handoff refreshed last and
alone, and a green `bootstrap` run on the new head. I did not perform it (Tester does not fix).

### Q0-N1 (non-blocking, record accuracy) — the self-check lists a commit that did not touch the manifest

Measured: of the commits the author self-check §3 names as touching `work-packages/WP-0A-A0-007.json`
(`53d7d2e`, `93bbdb6`, `dd6c7ec`, `cff15d1`, `f3e0bce`), `93bbdb6` did not touch it
(`git show --name-only 93bbdb6` does not list the file; `git log b61735f -- work-packages/WP-0A-A0-007.json`
returns the other four). The substantive claim holds: at every one of those commits, and at `b61735f`, the
manifest mentions `/root/r0_steward` exactly once, in `_run_id_disambiguation`, and **zero** times in
`open_blockers` (measured by parsing each version). The manifest's own wording ("53d7d2e..f3e0bce") is a
range and remains correct. Recorded; the self-check can be corrected in a later record or left as history.

### Q0-N2 (non-blocking, outside this increment's diff) — `rollback_or_forward_fix` still says "One Proposed decision record"

Read: `RFC-2026-016` line 3 is `Status: Approved 2026-09-05 by the Product Owner …`. The rollback field's
"One Proposed decision record" is the same staleness `open_blockers[3]` corrected for itself. The rollback
plan (a reviewed revert PR, nothing persisted) is unaffected. Recorded for C0/R0; not a Tester blocker.

## §4 The Author's claims, checked

| Claim | How | Result |
|---|---|---|
| status `in_progress` → `in_review`, no further | read diff; validators 0 | holds |
| step 2 item 1: `prefer_cross_vendor_review: false`, withdrawal sentence in the sibling wording | measured: compared with `WP-0A-A0-004` / `-005` / `CON-002` on main; substantively the same post-C0-F1 sentence (`A0-004` shares the first 593 characters), plus the A1-analysis sentence. The Owner's verbatim `บืนยันขั้น 2` and the §1.2 translation are at `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md:83,60` (read) | holds |
| step 2 item 2: `_run_id_disambiguation` rewritten; no blocker ever named `/root/r0_steward` | measured per commit (Q0-N1) | holds |
| step 2 item 3: `product_reviewer_note` added, flagged as A0's mapping | read; role-separation validator 0 | present; whether item 3 reaches a decision-record package is C0's call |
| `open_blockers[1]` narrowed on RFC-2026-028 and migration 173 | read: RFC-2026-028 line 3 `Status: **Approved 2026-10-05**` and names Q-028-3, Q-028-12, Q-028-13/Q170-c and A1's owed acceptance; `db/foundation/migrations/173_worker_login_identity.sql:69,71` creates `app_worker_login` and grants `app_worker` `with inherit false, set true, admin false`; present at `b61735f` | holds; the tail is unchanged |
| `open_blockers[2]` clause removed with reason; `[4]` added | read diff | holds; RFC-2026-016 §7 line 168 still mentions `prefer_cross_vendor_review`, as the blocker says |
| RFC-2026-016 untouched → not a governance PR | measured: empty `architecture/` diff | holds |
| handoff last and alone: `final_status in_review`, base `b61735f`, head `6878564` | read handoff; `check:handoff` 0 | holds — but its base must move when Q0-F1 is closed |

## §5 Acceptance criteria against RFC-2026-016 at the head (read)

| # | Criterion | Reading |
|---|---|---|
| 1 | contradiction stated; why forced RLS denies every service operation | §1 "The defect" — met |
| 2 | fix adds no permission, and says so | §2 lines 53-54, "no new permission **in the CARRIED shape**" and the confinement-only policy "is refused" — met, in the amended wording |
| 3 | platform decision recorded as the PO's, dated, with reason | §3 — met |
| 4 | DATA-DEC-03 closes only as far as the service path allows | §4 line 126-129, "this RFC does not claim the control" — met as written; its "undecided" is 2026-09-05 text, which the manifest blocker now carries forward (Author's not-done item 2, the Owner's or A0's to amend) |
| 5 | provenance: A1 analysis spawned from A0 | §7 line 165 — met |
| 6 | committed with status Proposed | met at `53d7d2e` (history); now Approved |

## §6 Stop-the-line

None. No secret exposure, tenant leakage, duplicate side effect, lost job, migration divergence,
irreversible deletion or contract mismatch. The package changes records only.

## §7 Verdict

Every declared test passes on the branch name at `1509aef` (705/705; every package command 0), and the
Author's claims hold except one wrong citation (Q0-N1). But the required CI check on the head is red: the
branch is behind `main` `d863f40`, and branch scope measured against that base exits 73 (Q0-F1). The
Author's reason for not syncing was measured against the branch point, not against the base CI uses.
Until the branch is synced with `main`, the handoff refreshed last and alone, and `bootstrap` is green
on the new head, this PR cannot merge. Nothing is stop-the-line. Re-verification on the synced head
needs only the scope guard, `check:handoff` and `npm run check` on the branch name, plus the CI result.
C0, A1 and R0 verdicts are their own.

VERDICT: test_failed
