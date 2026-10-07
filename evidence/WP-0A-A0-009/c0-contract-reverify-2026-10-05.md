# C0 verdict on WP-0A-A0-009 (PR #207), first at any head

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/207, branch
`agent/claude/WP-0A-A0-009-service-path-corrected`, head `0cbdc3f4`, branch point `main @ 0955b32`
(PR #203). Three files changed against the branch point: `evidence/WP-0A-A0-009/author-self-check-2026-10-07.md`
(new), `handoffs/WP-0A-A0-009-author-handoff.json`, `work-packages/WP-0A-A0-009.json`. While this run
worked, `main` moved to `9b4a0ce` (PR #206); see F1.

The file name follows the workflow's instruction (`c0-contract-reverify-2026-10-05.md`); the run took
place on 2026-10-07. It is not a re-verification in substance: **there was no earlier C0 verdict for this
package.** Before this PR there was no `evidence/WP-0A-A0-009/` folder, and at `0cbdc3f` the folder holds
only the Author's self-check. So there are no earlier C0 conditions to close; this is the first C0
verdict, and it reviews the whole increment.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent Reviewer
run `/claude/c0_contract_reviewer`. RFC-2026-024 §3/3 requires this disclosure. I share a vendor and a
parent with the Author. I wrote none of the PR's content and I fix nothing. This file is not a merge
authorisation, not a security, test or integration verdict, and it moves no package status.

## 1. Method, and what was measured versus read

Private clone under the scratchpad (`.../scratchpad/c0-WP-0A-A0-009/repo`), checked out on the branch
NAME, never detached: `HEAD = 0cbdc3f4`, `merge-base HEAD origin/main = 0955b32`; `origin/main` fetched
twice, `0955b32` then `9b4a0ce`. Node `v24.20.0`, npm `11.19.0` (`zsh -lc`). No database was started or
used by me. The worktree the harness gave me was used only for reading and for this file's commit.

**Measured** (commands and exit codes in §5):

- `npm run check` on the branch name: exit 0, tests 716, pass 716, fail/cancelled/skipped/todo 0.
- The three declared package validators, `verify-branch-identity`, `check:handoff`, and
  `verify-branch-scope` against **both** the branch point and the current `main`.
- The required CI check `bootstrap` on head `0cbdc3f` (run `37507939960`), its test count and its
  `db-rls-smoke` line; PR merge state; live branch protection on `main` (all `gh`, read-only).
- The `_run_id_disambiguation` correction: `root/r0_steward` in every committed version of the manifest,
  in total and inside `open_blockers`.
- The `independence` and `product_reviewer_note` fields of all fifteen step-2 packages at this head.
- Every line citation in `open_blockers[1]`, read at the cited lines; the role the isolation runner sets
  for the helpers the rule-4 cases use (`tests/db/identity/run-isolation.mjs:275-282`).

**Read, not measured:** `RFC-2026-019` §§1, 4, 5, 8 and status line; `RFC-2026-018` status line and
headings; `RFC-2026-017` §3; `RFC-2026-028` lines 3 and 6; migrations `002`, `003`, `172` (lines 420-430),
`173` (the `grant app_worker to app_worker_login` line); the Owner's step-2 disposition
(`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md`, items 1-3); the Author's
self-check and handoff. I did not run `make db-rls-smoke`; I read its CI result. I did not judge
DATA-DEC-03's security substance; that is A1's.

## 2. Earlier conditions

None exist. This is the first C0 verdict for WP-0A-A0-009 (manifest `open_blockers[3]`, which I confirm:
`git diff --stat 0955b32..0cbdc3f` adds only the Author's file under `evidence/WP-0A-A0-009/`).

## 3. What the increment claims, checked

| Claim (Author's `done` list) | Reading | Basis |
|---|---|---|
| Branch re-created from `origin/main 4dd767d`, synced with `0955b32` without conflict | **Holds** | `merge-base = 0955b32`; `fc87543` is the merge, `0cbdc3f` the handoff after it |
| Status `in_progress` → `in_review`, no further | **Holds** | manifest diff; the Author may move work only through `in_review` (`CONTRIBUTING_AGENTS.md` § Separation of duties) |
| Step 2 item 1: `prefer_cross_vendor_review: false`, exception replaced by the withdrawal sentence in A0-007's wording | **Holds** | Measured: twelve of the fifteen step-2 packages now read `false` with the same `WITHDRAWN 2026-10-05 BY THE PR...` opening; A0-006, A0-008 and CON-008 still read `true` (their packages' business). A0-009's text matches A0-007's sentence for sentence, with the package name and one added sentence: A1's measurement of RFC-2026-019 §4/1 is not a role signature. That sentence is right; it is the same distinction `open_blockers[0]` draws. |
| Step 2 item 2: `_run_id_disambiguation` rewritten; no version of `open_blockers` ever named `/root/r0_steward` | **Holds** | Measured: in each of `8701555f`, `00a47722`, `433a4af7`, `69ed807e`, `d312e3d2`, `2bb247dc`, `066a469a` (all seven commits on `main` that touched the file) the string occurs once and **zero** times inside `open_blockers`. At `0cbdc3f` it occurs twice, both in the field itself. `.agents/capability-profiles/cc-r0-steward.json` exists. `amends_without_owning.paths` is `[]`, so "none moves here" is right. |
| Step 2 item 3: `product_reviewer_note` added, flagged for C0 | **Accepted** (below) | |
| `open_blockers[0]` re-read at main, still true; sentence naming what closes it | **Holds** | The four A1-authored files it lists cite RFC-2026-019 as a reference; none has it as its subject. The closing condition (A1's `security_approved` verdict on this package) is the right one. |
| `open_blockers[1]` rewritten: all four §5 rules written, citations re-anchored | **Holds**, with F2 on one clause | Every citation read at the cited lines: `172:427-428` (`alter function ... owner to app_command` for both functions); `run.mjs:977-991` (`SECURITY_DEFINER_FUNCTIONS`, owner and body hash), `983-984` (the two `app_command` rows), `2349` (claim "exactly the pinned ones"), `3632-3637` (inside `tenantTableLint`, which starts at 3602: the `app_command`-owner refusal), `4061-4071` (`SERVICE_ROLES_NOT_FOR_THE_REQUEST_PATH`, now four names incl. `WORKER_LOGIN_ROLE = 'app_worker_login'` at 3070; unmeasured field is a finding), `4091-4102` (owner recorded, empty `search_path`). `isolation-cases.mjs:20072/20084/20095` are the three named cases; they use `as`, `stepped(...)`, which `run-isolation.mjs:275,279` maps to `authenticated`; `20282` uses `as_command` → `app_command` and expects `deniedBy: 'grant'`. RFC-2026-019 §5's fourth rule ("owned by `app_command`, and an isolation case calls it as `authenticated` and is refused where the policies say it should be") is carried. |
| `open_blockers[3]` added: no role verdict at any head | **Holds** | §2 |
| Self-check added | **Holds**, F3 adds one item to its §5 | |
| Handoff refreshed last and alone (`2a90a30`, then `0cbdc3f` after the sync) | **Holds at `0cbdc3f`** | `npm run check:handoff` exit 0; `0cbdc3f` touches only the handoff |
| Draft PR, not merged; not a governance PR | **Holds** | `gh pr view 207`: OPEN, Draft. Neither RFC, `CONTRIBUTING_AGENTS.md`, CI nor any gate file is in the diff (`RFC-2026-025` §5 item 6). |
| No private clone left | Not mine to verify; my own clone is under the scratchpad | |

**Not-done items.** I agree with all four. The RFC-2026-019 status line and the RFC-2026-017 §3
correction belong on governance PRs, by the owners the Author names; the rule-4 cases are a CI fact, and
the PR's own CI run now supplies it (§5: run `37507939960` at `0cbdc3f` logs
`db-rls-smoke: 1200 isolation case(s) passed.`).

**On item 3 (the question put to C0).** The Owner's words are "tooling and contract work packages do not
need a Product reviewer". WP-0A-A0-009 is a decision-record package. I accept A0's mapping, as I did for
WP-0A-A0-007, for the same three reasons: (a) the disposition's §3 row 3 grounds the item on the fact that
"the 15 packages' `review_and_test_gates` carry no product step", and this manifest's gates carry none;
(b) the one exception that row names is "a package with a UX surface", and this package has none; (c) the
decision it records (how the service path connects) is a data-contract decision in everything but the
package's label. The note states that the reading is A0's and invites refusal; that is the right form.

**Acceptance criteria, re-read against the RFCs at the branch head** (neither RFC changed on this branch).
1-7 (`RFC-2026-018`): met as written at `8701555f`; the file is now `SUPERSEDED`, never in effect, which
is history, not a regression. 8 (`RFC-2026-019` §1) met. 9 (§1 line 40, "read a *missing component*")
met. 10 (§5) met, and with `172` all four rules are now carried, which I measured above. 11 (§8) met.
12 met at `433a4af7`; this branch changes no role, grant or migration either.

## 4. Findings

### F1 (blocks the merge) — `main` moved to `9b4a0ce`; the branch must contain it

PR #207's `bootstrap` run `37507939960` at `0cbdc3f` is **green** (716 tests; 1200 isolation cases).
But `main` is now `9b4a0ce` (PR #206, WP-0A-A0-005), the PR reports `mergeStateStatus: BEHIND`, and live
protection on `main` reads `strict: true`, `contexts: ["bootstrap"]`, `enforce_admins: true`. Reproduced
in my clone: `node scripts/verify-branch-scope.mjs 9b4a0ce… WP-0A-A0-009` → exit **73**, naming PR #206's
three paths (`evidence/WP-0A-A0-005/records-transcription-2026-10-06.md`,
`handoffs/WP-0A-A0-005-author-handoff.json`, `work-packages/WP-0A-A0-005.json`); against `0955b32` → exit
0. This is the same mechanism C0 F1 recorded on WP-0A-A0-007, and `RFC-2026-025` §5 item 6 requires the
head of a delegated merge to contain the current `main`.

Required (Author): merge `origin/main` into the branch, then `npm run refresh:handoff` so the handoff is
again last and alone (and after this file and the other role files land), and get `bootstrap` green on
that head. **No C0 re-check is needed for that** as long as `git diff <new main>...HEAD` still lists only
this package's files with the manifest and self-check blobs reviewed here. R0 can confirm that. Not
stop-the-line: nothing reaches `main` while the PR is behind.

### F2 (non-blocking, wording) — "and they exist" is wider than what `open_blockers[1]` shows

`open_blockers[1]`, the self-check §5 row 1 and the handoff's `known_limitations[0]` say RFC-2026-019's
"stays wrong until the components exist" is out of date because "they exist". What the evidence shows is
narrower:

- **`app_command`'s component exists** — `172`'s two command functions, owned by it, reached only through
  `authenticated` (measured above).
- **`app_worker`'s path exists as a migration, not as a worker.** `173` grants `app_worker` to
  `app_worker_login`, but `RFC-2026-028` line 6 says it is "declared not applied to the provisioned
  instance until Q-028-13's measurement there (and Q170-c)", and custody (Q-028-3) and the pooler
  (Q-028-12) are still open on its status line.
- **`app_maintenance` has no non-superuser path.** `002:36` and `003:28` grant it to `postgres` only.

RFC-2026-017 §3's present tense ("The service path runs under roles created for it") is therefore true
of the command path, and not yet of the worker or maintenance paths. This changes nothing on this PR,
which edits no RFC. It matters for the owed governance PRs: the dated line on RFC-2026-019, and the
RFC-2026-017 §3 correction under WP-0A-A0-008, should say which component exists and which is still
declared, not that "they exist". If the Author touches the manifest again for F1, narrowing "and they
exist" to "the command path's component exists (`172`); the worker's is declared (`173`, RFC-2026-028)"
would remove the overstatement; not required.

### F3 (Info) — the owed RFC-2026-019 line should also cover §8's "A1 has not seen this RFC"

`RFC-2026-019` §8 closes with "A1 has not seen this RFC." That was true when written (2026-09-06); A1
measured §4/1 on 2026-09-08 (`a1-rfc-022-measurements-2026-09-08.md:338`), which is exactly the
correction `open_blockers[0]` makes for the manifest's own old wording. The self-check §5 and the
handoff list the status line, §4/3 and §4/5 as owed; §8's sentence belongs on the same dated line.

### F4 (Info) — the handoff records no `npm run check` after the `0955b32` sync

The handoff's `tests` record `npm run verify` at `4138f63` and `2a90a30` (705 tests), and for the sync only
`verify-branch-scope`. After the sync the suite is 716 tests. My run (716/716) and CI run `37507939960`
cover it; the refresh owed under F1 is the natural place to record a post-sync run.

### What I checked and found sound

The three changed paths are in `writable_paths`; `forbidden_paths` (`db/**`, `migrations/**`, key files)
are untouched; no contract, migration, script, case or fixture changed; the rewritten blockers say what
they used to say and why they changed; nothing claims a role verdict, an acknowledgement or a status past
`in_review`; DATA-DEC-03 is not claimed closed; `required_human_authorities[1]` is left as written and the
self-check says why, which is acceptable.

## 5. Commands

| Command (clone on the branch name unless stated) | Exit | Result |
|---|---|---|
| `git rev-parse --abbrev-ref HEAD` / `HEAD` / `merge-base HEAD origin/main` / `origin/main` | 0 | branch name / `0cbdc3f4` / `0955b32e` / `0955b32e`, later `9b4a0ce6` |
| `npm ci --ignore-scripts` | 0 | — |
| `npm run check` | 0 | tests 716, pass 716, fail 0, cancelled 0, skipped 0, todo 0 |
| `npm run check:handoff` | 0 | "nothing substantive after its cited head" (first attempt exit 91 because my clone's `origin/HEAD` pointed at the source worktree's branch; after `git remote set-head origin main`, exit 0. A clone artefact, not a finding.) |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-009-service-path-corrected` | 0 | `WP-0A-A0-009` |
| `node scripts/verify-branch-scope.mjs 0955b32… WP-0A-A0-009` | 0 | all 3 changed paths declared |
| `node scripts/verify-branch-scope.mjs 9b4a0ce… WP-0A-A0-009` | **73** | PR #206's three paths reported (F1) |
| `node scripts/validate-work-packages.mjs` / `validate-work-package-ownership.mjs` / `validate-work-package-role-separation.mjs work-packages/WP-0A-A0-009.json` | 0 / 0 / 0 | — |
| `node count.mjs` (read-only, scratchpad; `git show <c>:work-packages/…` for the seven commits and `0cbdc3f`, and the fifteen step-2 manifests) | 0 | `root/r0_steward`: 1 each, 0 in `open_blockers`; 2 at `0cbdc3f`, 0 in `open_blockers`. 12 of 15 withdrawn incl. A0-009; A0-006, A0-008, CON-008 `true` |
| `sed -n` on the cited lines of `172`, `run.mjs`, `isolation-cases.mjs`, `run-isolation.mjs` (worktree at `0cbdc3f`) | 0 | §3 row `open_blockers[1]` |
| `gh pr view 207` (read) | 0 | OPEN, Draft, head `0cbdc3f`, MERGEABLE, `mergeStateStatus: BEHIND`, `bootstrap` SUCCESS |
| `gh run view 37507939960 --log` (read) | 0 | head `0cbdc3f`; `tests 716`; `db-rls-smoke: 1200 isolation case(s) passed.` |
| `gh api …/branches/main` and `…/branches/main/protection` (read) | 0 | `9b4a0ce` (PR #206); `strict: true`, `contexts: ["bootstrap"]`, `enforce_admins: true` |

## 6. Verdict

**`approved` for the Reviewer role (C0), on the content at head `0cbdc3f`.**

- **Earlier conditions:** none; this is the first C0 verdict for WP-0A-A0-009.
- **The increment's content is sound.** Step 2 items 1-3 are applied as the disposition allows and no
  further; the `_run_id_disambiguation` correction is measured true; `open_blockers[1]`'s line
  citations each carry the rule they are paired with, and RFC-2026-019 §5's fourth rule is carried by
  `172` and the isolation cases; the twelve acceptance criteria hold. I accept the item-3 mapping for
  this decision-record package.
- **Stop-the-line: none.** No secret, tenant data, migration, side effect, CI change or contract meaning
  is touched.
- **Not a governance PR** (RFC-2026-025 §5 item 6), and not record-only (§5 item 1): it rewords blockers
  and applies an Owner disposition.
- **The merge is blocked** by F1: `main` moved to `9b4a0ce`, the PR is behind under strict protection,
  and scope against the current `main` exits 73. The Author syncs and refreshes the handoff; no C0
  re-check is needed if the PR's own diff is unchanged. F2 is a wording narrowing that mainly guides the
  owed governance PRs, not blocking; F3 and F4 are Info.
- **Still owed, outside this role:** the first verdicts of `/claude/a1_bastion` (security_approved, with
  RFC-2026-019 as its subject, closing `open_blockers[0]`), `/claude/q0_sentinel` (test_verified) and
  `/claude/r0_steward` (integration_verified); and, because this file is committed after the handoff, a
  handoff refresh as the last commit once role files land on the branch.
