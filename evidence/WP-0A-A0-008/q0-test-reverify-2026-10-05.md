# WP-0A-A0-008 — Independent Test Verification at PR #208

- **agent_run_id:** `/claude/q0_sentinel`
- **Role:** Independent Tester
- **Subject:** https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/208, branch
  `agent/claude/WP-0A-A0-008-service-path`, head `25d449ca38b299d584fcfcb21af40c2be630af3b`
  (branch point `4dd767d`; synced with `origin/main` `0955b32`, the merge of PR #203, in `3b685f8`)
- **Earlier verdict of this role:** none. Before this PR there was no `evidence/WP-0A-A0-008/` folder
  (read: `git ls-tree origin/main evidence/WP-0A-A0-008/` is empty; manifest `open_blockers[3]`; author
  self-check §1). This is the FIRST `test_verified` reading, dispatched as a re-verification; there are
  no earlier Q0 conditions to close.
- **Date:** 2026-10-07 (file name keeps the dispatch date 2026-10-05)

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
  `…/scratchpad/q0-WP-0A-A0-008/clone`, `git checkout -B agent/claude/WP-0A-A0-008-service-path 25d449c`,
  `origin` pointed at GitHub and fetched, `origin/HEAD` set to `origin/main` (`0955b32`). The head
  contains `origin/main` (`git merge-base --is-ancestor` 0). The clone's tree was clean after every run.
- No database was started and no port was used: the package is a decision record and its declared
  tests touch no schema. Port 5652 was not needed. No tracked file in any checkout was modified apart
  from this evidence file.
- Other agents' suites were running on the same machine; durations are not meaningful.

## §2 Declared tests at the head (measured, private clone on the branch name)

| Command (manifest `required_tests` / `deterministic_commands`, plus guards) | Exit |
|---|---:|
| `npm run check` | **0** — `tests 716, pass 716, fail 0, cancelled 0, skipped 0, todo 0` |
| `node scripts/validate-work-packages.mjs` | 0 |
| `node scripts/validate-work-package-ownership.mjs` | 0 |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-008.json` | 0 |
| `node scripts/validate-capability-profiles.mjs` | 0 |
| `npm run check:handoff` | 0 — "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-008-service-path` | 0 — `WP-0A-A0-008` |
| `node scripts/scan-repository-secrets.mjs` | 0 (not cited as secret-coverage assurance) |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-008` (main `0955b32`, what CI uses) | **0** — "all 3 changed path(s) are declared, and every amendment explains one" |
| `node scripts/verify-branch-scope.mjs 4dd767d WP-0A-A0-008` (the old branch point) | 73 — expected: lists the 18 paths PR #203 brought in through the sync; not the base CI uses |

Diff `0955b32..25d449c` (measured): three files, all inside `writable_paths` —
`work-packages/WP-0A-A0-008.json`, `evidence/WP-0A-A0-008/author-self-check-2026-10-07.md`,
`handoffs/WP-0A-A0-008-author-handoff.json`. No RFC, script, test, CI file, migration or contract changed;
`git diff 0955b32 25d449c -- architecture/` is empty. `25d449c` touches only the handoff (last and alone).

CI (read, `gh pr view 208`): the required check `bootstrap` on `25d449c` is **`COMPLETED / SUCCESS`**
(actions run 37508038445, completed 2026-10-06T18:07:02Z). The Author's not-done item "no check had
reported yet" is now overtaken: CI is green on the head.

## §3 The Author's claims, checked

| Claim | How | Result |
|---|---|---|
| status `in_progress` → `in_review`, no further | read diff; validators 0 | holds |
| step 2 item 1: `prefer_cross_vendor_review: false`, withdrawal sentence in WP-0A-A0-007's wording | measured: compared with `WP-0A-A0-007` on `origin/main`; the first 621 characters are identical and the divergence is the package id; A0-007 carries one further sentence (its A1-analysis note) that does not apply here. `บืนยันขั้น 2` is at `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md:83` (read) | holds |
| step 2 item 2: `_run_id_disambiguation` rewritten; no `open_blockers` version ever named `/root/r0_steward` | measured by parsing the manifest at each of `e95957c`, `d289ded`, `2c6ccde`, `6f7233f`, `5ab581a`, `c1f2647` (the six commits `git log 4dd767d -- work-packages/WP-0A-A0-008.json` returns): 0 blockers name it, 1 mention each (the disambiguation field). `.agents/capability-profiles/cc-r0-steward.json` exists | holds |
| step 2 item 3: `product_reviewer_note` added, flagged as A0's mapping | read; role-separation validator 0 | present; whether item 3 reaches a decision-record package is C0's call |
| `open_blockers[0]`: 1200 cases, 61 cover `RFC-2026-017§7`, 20 `denied` / 39 `no-rows` / 2 `no-effect`, 20 distinct tables of 62 | **measured independently at the head** by importing `buildCases` with an identity resolver: 1200 / 61 / 20-39-2; the 20 denials hit 20 distinct `app.` tables; the migrations create 62 distinct `app.` tables. All 20 denials run as `{ helper: 'as_service' }`. `git diff 4dd767d 0955b32 -- tests/db db architecture` is empty, so the Author's 4dd767d count stands at this head | holds |
| `open_blockers[1]`: narrowed on RFC-2026-028 and migration 173; no test connects as `app_worker_login` | read: RFC-2026-028 line 3 `Status: **Approved 2026-10-05**`; `173_worker_login_identity.sql:69` creates `app_worker_login ... nobypassrls noinherit`, `:71` grants `app_worker ... with inherit false, set true, admin false`. Measured: 0 of 1200 cases mention `app_worker_login`; `grep -rln app_worker_login tests db/foundation/test-helpers` finds nothing | holds |
| `open_blockers[3]` added; no role verdict at any head | read | holds; this file is the first Q0 verdict |
| `required_human_authorities`: PO disposition given at `8c16c0d`; A1 countersignature exists for DB-00 | read: RFC-2026-017 line 3 `Status: Approved 2026-09-05 by the Product Owner`; `evidence/WP-0A-DB-00/a1-countersignature-role-topology.md:43` `COUNTERSIGNED WITH RESERVATIONS.` | holds as stated; whether it discharges item 2 for this package is A1's and C0's, not the Tester's |
| handoff last and alone: base `0955b32`, head `3b685f8`, `final_status in_review` | read handoff; `check:handoff` 0; `git show --stat 25d449c` lists only the handoff | holds |
| not a governance PR | measured: empty `architecture/`, CI, `CONTRIBUTING_AGENTS.md` diff | holds |

## §4 Acceptance criteria against RFC-2026-017 at the head (read)

| # | Criterion | Reading |
|---|---|---|
| 1 | measurement, named instance, no vendor documentation in its place | §2 lines 17-19 ("Against the provisioned instance (`ThinkBizThai`, ap-southeast-2, Postgres 17.6), not from vendor documentation") — met |
| 2 | postgres bypasses as well as service_role | §2 line 36 ("both of the obvious options bypass") — met |
| 3 | topology names every role, purpose, none BYPASSRLS | §3 table (`app_worker`, `app_command`, `app_maintenance`, each **no**) — met as written; later roles (`app_authz`, `app_worker_login`) are not in §3, as the self-check §6 notes for C0 |
| 4 | costs recorded | §4 — met |
| 5 | isolation not claimed proven; owed assertion named | §7 line 105 and the status line — met as written; whether the 20 denials now discharge §7 is `open_blockers[0]`, for C0/A1 |
| 6 | committed with status Proposed | met at `e95957c` (history); Approved since `8c16c0d` |

## §5 Findings

### Q0-N1 (non-blocking, record accuracy) — `rollback_or_forward_fix` still says "RFC-2026-017 is a Proposed decision record"

Read: RFC-2026-017 line 3 is `Status: Approved 2026-09-05 by the Product Owner`. The manifest's
`rollback_or_forward_fix` still reads "RFC-2026-017 is a Proposed decision record: no role is created…".
It is the same staleness `open_blockers[2]` corrected in its own text, and the same one Q0 recorded on
WP-0A-A0-007 as its Q0-N2. The rollback plan itself (a reviewed revert PR, nothing persisted by this
package) is unaffected, and the handoff's own `rollback_or_forward_fix` is accurate. Recorded for C0/R0;
not a Tester blocker.

### Q0-N2 (non-blocking, observation for the §7 judgement) — every §7 denial is reached by SET ROLE from a superuser

Measured: all 20 `denied` cases run through `as_service`, i.e. `set_config('role','app_worker',true)` from
the test's superuser connection; none connects as `app_worker_login`. This is exactly what
`open_blockers[1]` says and is not a defect of this PR; it is recorded so the reviewer deciding
`open_blockers[0]` has the measurement: the policy layer's denials are tested, the login path is not.

Nothing else new. No test, validator or guard regressed.

## §6 Stop-the-line

None. No secret exposure, tenant leakage, duplicate side effect, lost job, migration divergence,
irreversible deletion or contract mismatch. The branch changes records only.

## §7 Verdict, and what R0 may rely on

Every declared test passes on the branch name at `25d449c` (`npm run check` 0, 716/716; every package
command 0; branch scope against `main` `0955b32` 0; `check:handoff` 0), the head contains current `main`,
and the required `bootstrap` check on the head is green. The Author's claims hold, including the
independently re-measured `open_blockers[0]` counts. Two non-blocking notes (Q0-N1, Q0-N2). Nothing of
mine blocks the merge.

Conditions, for R0 (process, not defects): (1) this file is carried onto the branch; (2) after all role
files land, the handoff is refreshed **last and alone**; (3) `bootstrap` is green on that final head and
the head still contains current `main`; (4) `git diff 25d449c..<final head>` is limited to role evidence
under `evidence/WP-0A-A0-008/`, the handoff, and paths `main` brought in. If `main` moves again, an
ordinary merge followed by the refresh is enough. C0's, A1's and R0's verdicts are their own; whether
§7 is discharged and whether the DB-00 countersignature serves this package are not the Tester's to say.

Wording A0 records on this role's behalf:

> test_verified by /claude/q0_sentinel at 25d449c (2026-10-07, evidence/WP-0A-A0-008/q0-test-reverify-2026-10-05.md): first Q0 verdict, no earlier conditions; npm run check 0 (716/716), package validators 0, check:handoff 0, branch scope vs main 0955b32 0, on the branch name; bootstrap green on 25d449c; open_blockers[0] counts re-measured (1200/61/20 denied over 20 of 62 tables). Q0-N1 (rollback field says Proposed) and Q0-N2 (denials via SET ROLE only) non-blocking. Conditional on the handoff refreshed last and alone and bootstrap green on the final head. Shared-origin run per RFC-2026-024; not a human gate sign-off.

VERDICT: test_verified (conditional on the handoff refresh, last and alone, and a green `bootstrap` on
the final head). Stop-the-line: none.
