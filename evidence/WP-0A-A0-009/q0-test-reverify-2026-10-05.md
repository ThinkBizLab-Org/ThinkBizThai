# WP-0A-A0-009 — Independent Test Verification at PR #207

- **agent_run_id:** `/claude/q0_sentinel`
- **Role:** Independent Tester (`test_verified` gate)
- **Subject:** https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/207, branch
  `agent/claude/WP-0A-A0-009-service-path-corrected`, head `0cbdc3f4782cbd64da810f78bb99fb4b21f7fb52`
  (merge-base with `origin/main` = `0955b32`, the merge of PR #203; the PR's base is the same commit)
- **Earlier verdict of this role:** none. Before this PR there was no `evidence/WP-0A-A0-009/` folder
  (measured: `git ls-tree 0955b32 evidence/WP-0A-A0-009` is empty; manifest `open_blockers[3]`, author
  self-check §1). This is the FIRST `test_verified` reading, dispatched as a re-verification; there are no
  earlier Q0 conditions to close.
- **Date:** 2026-10-07 (the file name keeps the dispatch name `…-2026-10-05`, as the sibling Q0 files do)

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

- Toolchain (measured): Node `v24.20.0`, npm `11.19.0`, from `/Users/bank/.local/node-v24.20.0/bin`;
  `npm ci --ignore-scripts` exit 0.
- **Branch-reading guards ran in a private clone on the branch NAME**, never detached:
  `…/scratchpad/q0-WP-0A-A0-009/clone`, `git checkout -B agent/claude/WP-0A-A0-009-service-path-corrected
  0cbdc3f`, `origin` pointed at GitHub and fetched, `origin/HEAD` set to `origin/main` (`0955b32`). The
  clone's tree was clean after every run (`git status --short` empty).
- No database was started and no port was used: the package changes no schema, and the rule-4 isolation
  cases are read from CI at this head (§2). No tracked file was modified apart from this evidence file.

## §2 Declared tests at the head (measured, private clone on the branch name)

| Command (manifest `required_tests` / `deterministic_commands`, plus the branch guards) | Exit |
|---|---:|
| `npm run check` | **0** — `tests 716, pass 716, fail 0, cancelled 0, skipped 0, todo 0` |
| `node scripts/validate-work-packages.mjs` | 0 |
| `node scripts/validate-work-package-ownership.mjs` | 0 |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-009.json` | 0 |
| `npm run check:handoff` (`refresh-author-handoff.mjs --check`) | 0 — "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-009-service-path-corrected` | 0 — `WP-0A-A0-009` |
| `node scripts/scan-repository-secrets.mjs` | 0 (not cited as secret-coverage assurance) |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-009` (main `0955b32`, the base CI uses) | **0** — "all 3 changed path(s) are declared, and every amendment explains one" |

Control, not a finding: the same scope guard against the old branch point `4dd767d` exits 73, listing
PR #203's paths (`test-kits/…`, `work-packages/WP-0A-A0-003.json`, …). That is expected after the sync:
those paths entered the branch through the merge `fc87543` and are on `main`. The base that decides is
current `main`, and against it the guard is green.

Diff `origin/main...0cbdc3f` (measured): three files, all inside `writable_paths` —
`work-packages/WP-0A-A0-009.json`, `evidence/WP-0A-A0-009/author-self-check-2026-10-07.md`,
`handoffs/WP-0A-A0-009-author-handoff.json`. No RFC, script, test, CI file, migration or contract
changed. Manifest fields changed against `4dd767d` (measured by parsing both): `status`,
`role_assignments`, `independence`, `open_blockers`; nothing else.

CI (read, `gh pr view 207`, `gh run view 37507939960`): the required check `bootstrap` on `0cbdc3f`
(event `pull_request`, head branch the manifest's) is **`COMPLETED / SUCCESS`**. Its log shows
`tests 716 / pass 716 / fail 0`, "Verify branch scope" → `WP-0A-A0-009: all 3 changed path(s) are
declared`, and "Database foundation" → `db-rls-smoke: 1200 isolation case(s) passed.` The Author's
not-done item 4 asked Q0 to read this run instead of their citation of main run 37493702216; at this
head the rule-4 cases ran and passed.

## §3 The Author's claims, checked

| Claim | How | Result |
|---|---|---|
| status `in_progress` → `in_review`, no further | read diff; validators 0 | holds |
| step 2 item 1: `prefer_cross_vendor_review: false`, withdrawal sentence in A0-007's wording | measured: the exception text shares its first 621 characters with `WP-0A-A0-007.json` at `4dd767d`; the first difference is the package id (`…A0-007` vs `…A0-009 is one of them`); A0-009 adds one sentence that A1's §4/1 measurement is not a role signature | holds |
| step 2 item 2: `_run_id_disambiguation` rewritten; "all 7 commits" mention `/root/r0_steward` once and never in `open_blockers` | measured: `git log 4dd767d -- work-packages/WP-0A-A0-009.json` returns exactly `8701555f 00a47722 433a4af7 69ed807e d312e3d2 2bb247dc 066a469a`; parsing each version, `/root/r0_steward` occurs once in the whole file and **0** times in `open_blockers` | holds |
| `.agents/capability-profiles/cc-r0-steward.json` exists | read | holds |
| step 2 item 3: `product_reviewer_note` added, flagged as A0's mapping | read; role-separation validator 0 | present; whether item 3 reaches a decision-record package is C0's call, not Q0's |
| `open_blockers[0]` still true: no A1 file has RFC-2026-019 as subject | measured: `git grep -l RFC-2026-019` over `evidence` gives 13 files at `4dd767d` and 14 at the head, the only addition being this package's author self-check; the A1-authored hits are the four the blocker names; `a1-countersignature-role-topology.md` mentions RFC-2026-019 0 times; `a1-rfc-022-measurements-2026-09-08.md:338` reads "`RFC-2026-019` §4/1 holds today, measured" | holds |
| `open_blockers[1]` line citations | measured at the head: migration `172:427-428` alter `app.close_workspace` / `app.cancel_workspace_closing` owner to `app_command`; `run.mjs:977` opens `SECURITY_DEFINER_FUNCTIONS`, `:983-984` pin both to `app_command`; `:2349` claims "exactly the pinned ones"; `:3632-3637` refuse an `app_command`-owned table; `:4061-4071` `SERVICE_ROLES_NOT_FOR_THE_REQUEST_PATH` incl. `WORKER_LOGIN_ROLE`, with the unmeasured-field finding; `:4091-4102` owner and empty `search_path`; `isolation-cases.mjs:20072/20084/20095` are the three named case ids, and `app-command-cannot-execute-its-own-closing-command` is at `:20282` (cited by name only) | holds; the citations were taken at `4dd767d` and still hold at `0cbdc3f` (measured at the head; `4dd767d..0955b32` changed only `scripts/scan-repository-secrets.mjs` and `scripts/test-suite-contract.mjs` under `scripts/`, `tests/` and `db/`) |
| RFC-2026-028 decided `app_worker`'s connection | read: line 3 `Status: **Approved 2026-10-05**` | holds |
| `open_blockers[3]` added | read | holds |
| no RFC edited → not a governance PR | measured: diff touches no `architecture/` path | holds |
| handoff last and alone, refreshed after the sync in `0cbdc3f` | measured: `git show --stat 0cbdc3f` touches only the handoff; `check:handoff` 0; `final_status in_review` | holds |
| no private clone left behind | not measurable from here; the Author's own statement | recorded as read |

## §4 Acceptance criteria at the head (read)

Neither RFC changed in this PR. RFC-2026-018 (status SUPERSEDED by RFC-2026-019, never in effect) and
RFC-2026-019 (Approved 2026-09-06) were read at `0cbdc3f`.

| # | Reading |
|---|---|
| 1 | RFC-2026-018 §2 "What was measured" — met |
| 2 | 018 records `authenticator` holds no service-role membership; asserted today by `run.mjs:4061-4071` — met |
| 3 | 018 §3 candidates A, B, C with what each makes true and costs — met |
| 4 | 018 option A's security question answered in §3/A — met |
| 5 | 018 §5 "What must be true before this closes" — met (018 was superseded, never closed) |
| 6 | 018 §7 "What this does not decide" — met |
| 7 | 018 changed no migration, lint or role at its commit — met (history; Author's reading at `8701555f`) |
| 8 | RFC-2026-019 §1 "what RFC-2026-018 got wrong" — met |
| 9 | 019's title and §1: "needs components, not a grant" — met |
| 10 | 019 §5 makes each clause checkable; all four rules now carried (§3 above) — met |
| 11 | 019 §8 "how the error was caught" — met |
| 12 | 019 changed no role, grant or migration — met (history) |

## §5 Findings

No blocking finding.

### Q0-N1 (non-blocking, record freshness) — `open_blockers[3]` will go stale as the role verdicts land

`open_blockers[3]` says "NO ROLE VERDICT EXISTS FOR THIS PACKAGE AT ANY HEAD". Once this file (and the
C0, A1, R0 verdicts) are on the branch, that sentence is false. That is the normal order — the Author
cannot record verdicts that do not yet exist — but the blocker, and `open_blockers[0]` if A1's verdict
is `security_approved`, must be updated (with the handoff refreshed last and alone) before the merge,
or the merged manifest will carry false blockers. Not a Tester condition on the content; an R0 item.

### Q0-N2 (non-blocking, already disclosed) — RFC-2026-019's status line and §4/3, §4/5 are stale

Read: §4/5 says RFC-2026-017 §3's present tense stays wrong "until the components exist" (they do since
migration 172), and §4/3 leaves `app_worker`'s connection open (RFC-2026-028 decided it). The Author
records this as owed on a separate governance PR (not-done items 2 and 3). Correctly kept out of a
non-governance PR; recorded so it is not lost.

### Q0-N3 (non-blocking, already disclosed) — `required_human_authorities[1]` reads as owed but is met

The countersignature `evidence/WP-0A-DB-00/a1-countersignature-role-topology.md` exists; the field is
left as written (author self-check §5). C0/R0 may ask for it to be marked met.

## §6 Stop-the-line

None. No secret exposure, tenant leakage, duplicate side effect, lost job, migration divergence,
irreversible deletion or contract mismatch. The PR changes a manifest, an evidence file and a handoff.

## §7 Verdict

Every declared test passes on the branch name at `0cbdc3f` (`npm run check` 716/716; every package
command and branch guard 0, scope against current `main` 0). The required CI check `bootstrap` is green
on this head, including `db-rls-smoke` with 1200 isolation cases. Every Author claim I could measure
holds, including the line citations for all four §5 rules at this head and the per-commit
`/root/r0_steward` count. The three notes are non-blocking. Q0 sets no condition. Nothing on the Tester
side blocks the merge. The merge still waits on the first `review_approved` (C0), `security_approved`
(A1, which also closes `open_blockers[0]`) and `integration_verified` (R0) verdicts, and on refreshing
`open_blockers[3]` and the handoff after them (Q0-N1). Those verdicts are not mine to give.

VERDICT: test_verified
